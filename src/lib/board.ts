import { sql } from "./db";
import { FAIL_SCORE, points, weekStart } from "./wordle";

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

// The Neon driver returns timestamptz columns as Date objects.
export type ResultRow = { player_id: string; puzzle: number; score: number; hard: boolean; grid: string; created_at: Date };
export type Member = { id: string; name: string };
export type GroupData = { members: Member[]; byPlayer: Map<string, ResultRow[]> };

export async function loadGroup(groupId: string, upTo: number): Promise<GroupData> {
  const [members, results] = await Promise.all([
    sql<Member>`
      select p.id, p.name from memberships m join players p on p.id = m.player_id
      where m.group_id = ${groupId} order by m.joined_at`,
    sql<ResultRow>`
      select r.player_id, r.puzzle, r.score, r.hard, r.grid, r.created_at
      from results r join memberships m on m.player_id = r.player_id
      where m.group_id = ${groupId} and r.puzzle <= ${upTo}
      order by r.puzzle`,
  ]);
  const byPlayer = new Map<string, ResultRow[]>();
  for (const r of results) {
    const list = byPlayer.get(r.player_id) ?? [];
    list.push(r);
    byPlayer.set(r.player_id, list);
  }
  return { members, byPlayer };
}

export function resultFor(data: GroupData, playerId: string, puzzle: number) {
  return data.byPlayer.get(playerId)?.find((r) => r.puzzle === puzzle);
}

export function everyonePlayed(data: GroupData, puzzle: number) {
  return data.members.length > 0 && data.members.every((m) => resultFor(data, m.id, puzzle));
}

/** Per-member stats over puzzles [from, to], ranked by points then average. Streaks are as of `to`. */
export function rangeStats(data: GroupData, from: number, to: number): MemberStats[] {
  return data.members
    .map((m) => {
      const all = (data.byPlayer.get(m.id) ?? []).filter((r) => r.puzzle <= to);
      const rows = all.filter((r) => r.puzzle >= from);
      const distribution = Array(7).fill(0);
      for (const r of rows) distribution[r.score - 1]++;
      return {
        id: m.id,
        name: m.name,
        played: rows.length,
        wins: rows.filter((r) => r.score !== FAIL_SCORE).length,
        points: rows.reduce((s, r) => s + points(r.score), 0),
        avg: rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : null,
        ...streaks(all, to),
        distribution,
      };
    })
    .sort((a, b) => b.points - a.points || (a.avg ?? 99) - (b.avg ?? 99));
}

export async function groupBoard(groupId: string, viewerId: string, today: number) {
  const data = await loadGroup(groupId, today);
  const viewerPlayedToday = !!resultFor(data, viewerId, today);

  const todayEntries: TodayEntry[] = data.members
    .map((m) => {
      const r = resultFor(data, m.id, today);
      const reveal = r && (viewerPlayedToday || m.id === viewerId);
      return {
        id: m.id,
        name: m.name,
        score: r?.score ?? null,
        hard: r?.hard ?? false,
        grid: reveal ? r.grid : null,
        at: r ? r.created_at.toISOString() : null,
      };
    })
    .sort((a, b) => (a.score ?? 99) - (b.score ?? 99) || (a.at ?? "").localeCompare(b.at ?? ""));

  const thisWeek = weekStart(today);
  return {
    today,
    viewerPlayedToday,
    everyonePlayedToday: everyonePlayed(data, today),
    weekStart: thisWeek,
    todayEntries,
    stats: {
      week: rangeStats(data, thisWeek, today),
      month: rangeStats(data, today - 29, today),
      all: rangeStats(data, -Infinity, today),
    },
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
