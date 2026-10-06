import { handler, HttpError, keyFromRequest, playerForKey } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parseWordle, scoreLabel, validPuzzleRange } from "@/lib/wordle";

/**
 * Post a Wordle share text. Used by the app (Bearer key) and by the iOS Shortcut,
 * which sends JSON { key, text }. Responds with a human-readable `message` the
 * Shortcut shows as a notification.
 */
export const POST = handler(async (req: Request) => {
  const { text, key } = await readBody(req);
  const player = await playerForKey(keyFromRequest(req) ?? key);
  if (!player) throw new HttpError(401, "❌ Unknown key. Open WordleGang → Settings and copy your key again.");

  const parsed = parseWordle(text);
  if (!parsed) throw new HttpError(400, "❌ That doesn't look like a Wordle result.");

  const { min, max } = validPuzzleRange();
  if (parsed.puzzle < min || parsed.puzzle > max) {
    throw new HttpError(400, `❌ Wordle ${parsed.puzzle.toLocaleString("en-US")} isn't today's puzzle.`);
  }

  const inserted = await sql`
    insert into results (player_id, puzzle, score, hard, grid)
    values (${player.id}, ${parsed.puzzle}, ${parsed.score}, ${parsed.hard}, ${parsed.grid})
    on conflict (player_id, puzzle) do nothing
    returning puzzle`;

  const groups = await sql<{ name: string }>`
    select g.name from memberships m join groups g on g.id = m.group_id
    where m.player_id = ${player.id} order by m.joined_at`;

  const label = `${scoreLabel(parsed.score)}/6${parsed.hard ? "*" : ""}`;
  const where = groups.length ? ` to ${listNames(groups.map((g) => g.name))}` : "";
  const message = inserted.length
    ? `✅ ${label} posted${where}`
    : `👍 Already posted Wordle ${parsed.puzzle.toLocaleString("en-US")}`;

  return Response.json({ ok: true, duplicate: !inserted.length, message, result: parsed });
});

async function readBody(req: Request): Promise<{ text: string; key?: string }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return { text: String(body.text ?? ""), key: body.key ? String(body.key) : undefined };
  }
  if (type.includes("form")) {
    const form = await req.formData();
    return { text: String(form.get("text") ?? ""), key: form.get("key")?.toString() };
  }
  return { text: await req.text() };
}

function listNames(names: string[]) {
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}
