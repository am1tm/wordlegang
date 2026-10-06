import { handler, readJson, requirePlayer } from "@/lib/auth";
import { groupBoard } from "@/lib/board";
import { unreadCount } from "@/lib/chat";
import { sql } from "@/lib/db";
import { requireMembership } from "@/lib/groups";
import { newInviteCode } from "@/lib/ids";
import { puzzleForDate, validPuzzleRange } from "@/lib/wordle";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, { params }: Ctx) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);

  // The client tells us which puzzle is "today" on its clock; fall back to the player's timezone.
  const asked = Number(new URL(req.url).searchParams.get("today"));
  const { min, max } = validPuzzleRange();
  const today = asked >= min && asked <= max ? asked : puzzleForDate(new Date(), player.tz);

  return Response.json({
    group: { id: group.id, name: group.name, invite_code: group.invite_code, isOwner: group.created_by === player.id },
    unread: await unreadCount(group.id, player.id, today),
    ...(await groupBoard(group.id, player.id, today)),
  });
});

// Owner actions: rename or rotate the invite link.
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  const body = await readJson(req);
  if (body.rotateInvite) {
    if (group.created_by !== player.id) return Response.json({ error: "Only the creator can do that" }, { status: 403 });
    const code = newInviteCode();
    await sql`update groups set invite_code = ${code} where id = ${group.id}`;
    return Response.json({ invite_code: code });
  }
  return Response.json({ ok: true });
});

// Leave the group.
export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  await sql`delete from memberships where group_id = ${group.id} and player_id = ${player.id}`;
  return Response.json({ ok: true });
});
