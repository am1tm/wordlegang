// Wordle #0 was published on 2021-06-19.
const EPOCH_UTC = Date.UTC(2021, 5, 19);
const DAY_MS = 86_400_000;

export const FAIL_SCORE = 7;

export type ParsedResult = {
  puzzle: number;
  score: number; // 1-6, or FAIL_SCORE for X/6
  hard: boolean;
  grid: string; // rows joined by "\n", normalised to G/Y/B letters
};

/** Local calendar date (y, m, d) in a timezone. */
export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function puzzleForDate(date: Date, timeZone: string): number {
  const { year, month, day } = localParts(date, timeZone);
  return Math.round((Date.UTC(year, month - 1, day) - EPOCH_UTC) / DAY_MS);
}

/** Puzzle numbers that are "today" somewhere on Earth right now. */
export function validPuzzleRange(now = new Date()) {
  return {
    min: puzzleForDate(now, "Etc/GMT+12"),
    max: puzzleForDate(now, "Etc/GMT-14"),
  };
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const TILE: Record<string, "G" | "Y" | "B"> = {
  "🟩": "G",
  "🟧": "G", // high-contrast correct
  "🟨": "Y",
  "🟦": "Y", // high-contrast present
  "⬛": "B",
  "⬜": "B",
};

export function parseWordle(text: string): ParsedResult | null {
  const header = text.match(/Wordle\s+([\d][\d,.\s  ]*)\s+([1-6Xx])\s*\/\s*6(\*?)/);
  if (!header) return null;

  const puzzle = Number(header[1].replace(/\D/g, ""));
  const score = /x/i.test(header[2]) ? FAIL_SCORE : Number(header[2]);
  const hard = header[3] === "*";
  if (!Number.isFinite(puzzle) || puzzle <= 0) return null;

  const rows: string[] = [];
  for (const line of text.slice(header.index! + header[0].length).split(/\r?\n/)) {
    const tiles = Array.from(line.trim())
      .map((ch) => TILE[ch])
      .filter(Boolean);
    if (tiles.length === 5) rows.push(tiles.join(""));
    else if (rows.length > 0 && line.trim() !== "") break;
  }

  // Grid must agree with the score: N rows, last one solved (or 6 unsolved rows for X).
  const expectedRows = score === FAIL_SCORE ? 6 : score;
  if (rows.length !== expectedRows) return null;
  const solvedAt = rows.findIndex((r) => r === "GGGGG");
  if (score === FAIL_SCORE ? solvedAt !== -1 : solvedAt !== score - 1) return null;

  return { puzzle, score, hard, grid: rows.join("\n") };
}

export function scoreLabel(score: number) {
  return score === FAIL_SCORE ? "X" : String(score);
}

/** Leaderboard points: 1 guess = 6 pts … 6 guesses = 1 pt, fail = 0. */
export function points(score: number) {
  return score === FAIL_SCORE ? 0 : 7 - score;
}
