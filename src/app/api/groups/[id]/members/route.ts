import { handler, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { requireMembership } from "@/lib/groups";

// Member list for the group menu; the admin also sees who they've removed.
export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const player = await requirePlayer(req);
  const group = await requireMembership((await params).id, player.id);
  const isAdmin = group.created_by === player.id;
  const [members, removed] = await Promise.all([
    sql`
      select p.id, p.name, (p.id = ${group.created_by}) as admin, (p.id = ${player.id}) as me
      from memberships m join players p on p.id = m.player_id
      where m.group_id = ${group.id} order by m.joined_at`,
    isAdmin
      ? sql`select p.id, p.name from group_bans b join players p on p.id = b.player_id
            where b.group_id = ${group.id} order by b.banned_at desc`
      : Promise.resolve([]),
  ]);
  return Response.json({ isAdmin, members, removed });
});
