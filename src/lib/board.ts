import { sql } from "./db";
import { FAIL_SCORE, points } from "./wordle";

export type Period = "week" | "month" | "all";

export type MemberStats = {
  id: string;
  name: string;
  played: number;
  wins: number;
  points: number;
  avg: number | null; // average guesses, fail counts as 7
  currentStreak: number;
  maxStreak: number;
  distribution: number[]; // index 0..5 = solved in 1..6, index 6 = fails
};

export type TodayEntry = {
  id: string;
  name: string;
  score: number | null;
  hard: boolean;
  grid: string | null; // null when hidden or not played
  at: string | null;
};

type ResultRow = { player_id: string; puzzle: number; score: number; hard: boolean; grid: string; created_at: string };

export async function groupBoard(groupId: string, viewerId: string, today: number) {
  const [members, results] = await Promise.all([
    sql<{ id: string; name: string }>`
      select p.id, p.name from memberships m join players p on p.id = m.player_id
      where m.group_id = ${groupId} order by m.joined_at`,
    sql<ResultRow>`
      select r.player_id, r.puzzle, r.score, r.hard, r.grid, r.created_at
      from results r join memberships m on m.player_id = r.player_id
      where m.group_id = ${groupId} and r.puzzle <= ${today}
      order by r.puzzle`,
  ]);

  const byPlayer = new Map<string, ResultRow[]>();
  for (const r of results) {
    const list = byPlayer.get(r.player_id) ?? [];
    list.push(r);
    byPlayer.set(r.player_id, list);
  }

  const viewerPlayedToday = (byPlayer.get(viewerId) ?? []).some((r) => r.puzzle === today);

  const todayEntries: TodayEntry[] = members
    .map((m) => {
      const r = byPlayer.get(m.id)?.find((x) => x.puzzle === today);
      const reveal = r && (viewerPlayedToday || m.id === viewerId);
      return {
        id: m.id,
        name: m.name,
        score: r?.score ?? null,
        hard: r?.hard ?? false,
        grid: reveal ? r.grid : null,
        at: r?.created_at ?? null,
      };
    })
    .sort((a, b) => (a.score ?? 99) - (b.score ?? 99) || (a.at ?? "").localeCompare(b.at ?? ""));

  const stats = (period: Period): MemberStats[] => {
    const from = period === "week" ? today - 6 : period === "month" ? today - 29 : -Infinity;
    return members
      .map((m) => {
        const all = byPlayer.get(m.id) ?? [];
        const rows = all.filter((r) => r.puzzle >= from);
        const distribution = Array(7).fill(0);
        for (const r of rows) distribution[r.score - 1]++;
        const wins = rows.filter((r) => r.score !== FAIL_SCORE).length;
        return {
          id: m.id,
          name: m.name,
          played: rows.length,
          wins,
          points: rows.reduce((s, r) => s + points(r.score), 0),
          avg: rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : null,
          ...streaks(all, today),
          distribution,
        };
      })
      .sort((a, b) => b.points - a.points || (a.avg ?? 99) - (b.avg ?? 99));
  };

  return {
    today,
    viewerPlayedToday,
    todayEntries,
    stats: { week: stats("week"), month: stats("month"), all: stats("all") },
  };
}

/** Streaks count consecutive solved puzzles; today not being played yet doesn't break it. */
export function streaks(rows: { puzzle: number; score: number }[], today: number) {
  const won = new Set(rows.filter((r) => r.score !== FAIL_SCORE).map((r) => r.puzzle));
  let maxStreak = 0;
  let run = 0;
  let prev = -2;
  for (const p of [...won].sort((a, b) => a - b)) {
    run = p === prev + 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prev = p;
  }
  let currentStreak = 0;
  for (let p = won.has(today) ? today : today - 1; won.has(p); p--) currentStreak++;
  return { currentStreak, maxStreak };
}
