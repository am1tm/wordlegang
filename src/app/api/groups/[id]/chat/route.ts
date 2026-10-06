import { handler, HttpError, readJson, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { requireMembership } from "@/lib/groups";
import { puzzleForDate, validPuzzleRange } from "@/lib/wordle";

// Trash talk: each Wordle day gets a fresh room; old days are purged on the next post.

type Ctx = { params: Promise<{ id: string }> };

function dayFrom(value: unknown, tz: string) {
  const asked = Number(value);
  const { min, max } = validPuzzleRange();
  return asked >= min && asked <= max ? asked : puzzleForDate(new Date(), tz);
}

export const GET = handler(async (req: Request, { params }: Ctx) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  const puzzle = dayFrom(new URL(req.url).searchParams.get("today"), player.tz);

  const messages = await sql`
    select m.id::text, m.body, m.created_at as at, p.name, (m.player_id = ${player.id}) as mine
    from messages m join players p on p.id = m.player_id
    where m.group_id = ${group.id} and m.puzzle = ${puzzle}
    order by m.id desc limit 200`;
  return Response.json({ puzzle, messages: messages.reverse() });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  const body = await readJson(req);
  const puzzle = dayFrom(body.today, player.tz);
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";
  if (!text) throw new HttpError(400, "Say something!");

  const [message] = await sql`
    insert into messages (group_id, player_id, puzzle, body) values (${group.id}, ${player.id}, ${puzzle}, ${text})
    returning id::text, body, created_at as at, ${player.name}::text as name, true as mine`;
  // Keep a day of slack for timezones, then let old chatter go.
  await sql`delete from messages where group_id = ${group.id} and puzzle < ${puzzle - 1}`;
  return Response.json({ message });
});
