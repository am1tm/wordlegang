import { handler, HttpError, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/groups";

type Ctx = { params: Promise<{ id: string; playerId: string }> };

// Admin removes a member; they can't rejoin with the invite link until let back in.
export const DELETE = handler(async (req: Request, { params }: Ctx) => {
  const admin = await requirePlayer(req);
  const { id, playerId } = await params;
  const group = await requireAdmin(id, admin.id);
  if (playerId === admin.id) throw new HttpError(400, "Use Leave group to remove yourself");
  await sql`delete from memberships where group_id = ${group.id} and player_id = ${playerId}`;
  await sql`insert into group_bans (group_id, player_id) values (${group.id}, ${playerId}) on conflict do nothing`;
  return Response.json({ ok: true });
});

// Admin lifts a removal so the player can rejoin via the invite link.
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const admin = await requirePlayer(req);
  const { id, playerId } = await params;
  const group = await requireAdmin(id, admin.id);
  await sql`delete from group_bans where group_id = ${group.id} and player_id = ${playerId}`;
  return Response.json({ ok: true });
});
