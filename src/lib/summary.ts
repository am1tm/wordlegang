import { type GroupData, type MemberStats, rangeStats, resultFor } from "./board";
import { FAIL_SCORE, formatPuzzleDay, scoreLabel } from "./wordle";

// Plain-text recaps meant for WhatsApp: *bold* works there, emoji grids render natively.

const MEDALS = ["🥇", "🥈", "🥉"];
const TILE: Record<string, string> = { G: "🟩", Y: "🟨", B: "⬛" };
const DIGITS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "❌"];

type Ctx = { groupName: string; joinUrl: string };

const num = (n: number) => n.toLocaleString("en-US");
const avg = (n: number | null) => (n === null ? "–" : n.toFixed(2));
const names = (list: string[]) =>
  list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function emojiGrid(grid: string) {
  return grid
    .split("\n")
    .map((row) => Array.from(row, (c) => TILE[c] ?? "⬛").join(""))
    .join("\n");
}

function finish(lines: (string | false | null | undefined)[], ctx: Ctx) {
  const body = lines.filter((l) => l !== false && l !== null && l !== undefined).join("\n");
  // Collapse runs of blank lines left by skipped sections.
  return `${body.replace(/\n{3,}/g, "\n\n").trim()}\n\n📲 ${ctx.joinUrl}`;
}

/** Players with the lowest solved score on a puzzle (needs 2+ players that day). */
function dayWinners(data: GroupData, puzzle: number) {
  const rows = data.members.flatMap((m) => {
    const r = resultFor(data, m.id, puzzle);
    return r ? [{ name: m.name, score: r.score }] : [];
  });
  const solved = rows.filter((r) => r.score !== FAIL_SCORE);
  if (rows.length < 2 || !solved.length) return [];
  const best = Math.min(...solved.map((r) => r.score));
  return solved.filter((r) => r.score === best).map((r) => r.name);
}

function winTally(data: GroupData, from: number, to: number) {
  const tally = new Map<string, number>();
  for (let p = from; p <= to; p++) {
    for (const name of dayWinners(data, p)) tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]);
}

/** Medal by standing; players level on points and average share it. */
function rankLabel(ranked: MemberStats[], s: MemberStats) {
  const rank = ranked.findIndex((o) => o.points === s.points && o.avg === s.avg);
  return MEDALS[rank] ?? `${rank + 1}.`;
}

function topBy(stats: MemberStats[], pick: (s: MemberStats) => number) {
  const best = Math.max(0, ...stats.map(pick));
  return { value: best, who: best > 0 ? stats.filter((s) => pick(s) === best).map((s) => s.name) : [] };
}

export function dailyHighlights(data: GroupData, puzzle: number, ctx: Ctx) {
  const entries = data.members
    .map((m) => ({ member: m, r: resultFor(data, m.id, puzzle) }))
    .filter((e): e is { member: typeof e.member; r: NonNullable<typeof e.r> } => !!e.r)
    .sort((a, b) => a.r.score - b.r.score || a.r.created_at.getTime() - b.r.created_at.getTime());

  const scores = [...new Set(entries.filter((e) => e.r.score !== FAIL_SCORE).map((e) => e.r.score))];
  const medal = (score: number) => (score === FAIL_SCORE ? "💀" : (MEDALS[scores.indexOf(score)] ?? "▫️"));

  const winners = entries.filter((e) => e.r.score === scores[0]);
  const early = [...entries].sort((a, b) => a.r.created_at.getTime() - b.r.created_at.getTime())[0];
  const phew = entries.filter((e) => e.r.score === 6).map((e) => e.member.name);
  const fails = entries.filter((e) => e.r.score === FAIL_SCORE).map((e) => e.member.name);
  const hard = entries.filter((e) => e.r.hard).map((e) => e.member.name);
  const streak = topBy(rangeStats(data, puzzle, puzzle), (s) => s.currentStreak);
  const groupAvg = entries.reduce((s, e) => s + e.r.score, 0) / entries.length;

  return finish(
    [
      `🟩 *${ctx.groupName}* · Wordle ${num(puzzle)}`,
      formatPuzzleDay(puzzle, { weekday: "long" }),
      "",
      ...entries.map((e) => `${medal(e.r.score)} ${e.member.name} ${scoreLabel(e.r.score)}/6${e.r.hard ? "*" : ""}`),
      "",
      winners.length === 0
        ? "😬 Nobody cracked it today!"
        : winners.length === 1
          ? `👑 *${winners[0].member.name}* wins the day with ${winners[0].r.score}/6`
          : `👑 Shared win: *${names(winners.map((w) => w.member.name))}* with ${winners[0].r.score}/6`,
      winners.length === 1 && emojiGrid(winners[0].r.grid),
      "",
      entries.length > 1 &&
        `⏰ Early bird: ${early.member.name} (${early.r.created_at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })})`,
      phew.length > 0 && `😅 Phew, last guess: ${names(phew)}`,
      fails.length > 0 && `💀 Better luck tomorrow: ${names(fails)}`,
      hard.length > 0 && `💪 Hard mode: ${names(hard)}`,
      streak.value >= 3 && `🔥 On fire: ${names(streak.who)} (${streak.value}-day streak)`,
      `📊 Group average: ${groupAvg.toFixed(2)}`,
    ],
    ctx,
  );
}

export function weeklyRecap(data: GroupData, start: number, ctx: Ctx) {
  const end = start + 6;
  const stats = rangeStats(data, start, end);
  const active = stats.filter((s) => s.played > 0);
  const missing = stats.filter((s) => s.played === 0).map((s) => s.name);

  let bestRound: { name: string; score: number; puzzle: number } | null = null;
  for (const m of data.members) {
    for (const r of data.byPlayer.get(m.id) ?? []) {
      if (r.puzzle < start || r.puzzle > end || r.score === FAIL_SCORE) continue;
      if (!bestRound || r.score < bestRound.score) bestRound = { name: m.name, score: r.score, puzzle: r.puzzle };
    }
  }

  const perfect = active.filter((s) => s.played === 7).map((s) => s.name);
  const fails = active.filter((s) => s.distribution[6] > 0);
  const tally = winTally(data, start, end);
  const streak = topBy(active, (s) => s.currentStreak);

  return finish(
    [
      `📅 *${ctx.groupName}* · Weekly recap`,
      `${formatPuzzleDay(start)} – ${formatPuzzleDay(end)} (#${num(start)}–${num(end)})`,
      "",
      ...active.map(
        (s) => `${rankLabel(active, s)} ${s.name} · ${s.points} pts · avg ${avg(s.avg)} (${s.played}/7)`,
      ),
      "",
      active[0] && `🏆 Champion of the week: *${active[0].name}*`,
      tally.length > 0 && `👑 Daily wins: ${tally.map(([n, c]) => `${n} ${c}`).join(" · ")}`,
      bestRound &&
        `⭐ Best round: ${bestRound.name} ${bestRound.score}/6 on ${formatPuzzleDay(bestRound.puzzle, { weekday: "only" })}`,
      perfect.length > 0 && `✅ Played all 7: ${names(perfect)}`,
      fails.length > 0 && `💀 Fails: ${fails.map((s) => `${s.name} ×${s.distribution[6]}`).join(", ")}`,
      streak.value >= 3 && `🔥 Hottest streak: ${names(streak.who)} (${streak.value} days)`,
      missing.length > 0 && `😴 Missing in action: ${names(missing)}`,
    ],
    ctx,
  );
}

export function allTimeSummary(data: GroupData, today: number, ctx: Ctx) {
  const stats = rangeStats(data, -Infinity, today);
  const active = stats.filter((s) => s.played > 0);
  const first = Math.min(...[...data.byPlayer.values()].flat().map((r) => r.puzzle));
  const days = today - first + 1;

  const tally = winTally(data, first, today);
  const bestStreak = topBy(active, (s) => s.maxStreak);
  const holeInOne = active.filter((s) => s.distribution[0] > 0);
  const twos = topBy(active, (s) => s.distribution[1]);
  const spread = active.reduce((acc, s) => acc.map((v, i) => v + s.distribution[i]), Array(7).fill(0));

  return finish(
    [
      `🏛️ *${ctx.groupName}* · All-time standings`,
      `${plural(days, "Wordle")} since ${formatPuzzleDay(first, { weekday: "none", year: true })}`,
      "",
      ...active.map(
        (s) =>
          `${rankLabel(active, s)} ${s.name} · ${s.points} pts · avg ${avg(s.avg)} · ${s.played} played · ${Math.round((s.wins / s.played) * 100)}% won`,
      ),
      "",
      tally.length > 0 &&
        `👑 Most daily wins: ${names(tally.filter(([, c]) => c === tally[0][1]).map(([n]) => n))} (${tally[0][1]})`,
      bestStreak.value >= 2 && `🔥 Best streak ever: ${names(bestStreak.who)} (${bestStreak.value} days)`,
      holeInOne.length > 0 &&
        `🎯 Hole-in-one club: ${holeInOne.map((s) => (s.distribution[0] > 1 ? `${s.name} ×${s.distribution[0]}` : s.name)).join(", ")}`,
      twos.value > 0 && `⭐ Most 2/6 solves: ${names(twos.who)} (${twos.value})`,
      `📊 Group spread: ${spread.map((n, i) => `${DIGITS[i]} ${n}`).join("  ")}`,
    ],
    ctx,
  );
}
