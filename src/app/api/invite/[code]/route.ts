import { handler } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normaliseInviteCode } from "@/lib/ids";

// Public preview for the join page: just the group name and size.
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const code = normaliseInviteCode((await params).code);
  const rows = await sql`
    select g.id, g.name, (select count(*)::int from memberships m where m.group_id = g.id) as member_count
    from groups g where g.invite_code = ${code}`;
  if (!rows[0]) return Response.json({ error: "Invite not found" }, { status: 404 });
  return Response.json({ group: rows[0] });
});
