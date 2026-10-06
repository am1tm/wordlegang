import { cleanName, handler, readJson, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { newId, newInviteCode } from "@/lib/ids";

export const POST = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const name = cleanName((await readJson(req)).name, 40);
  const id = newId();
  const code = newInviteCode();
  await sql`insert into groups (id, name, invite_code, created_by) values (${id}, ${name}, ${code}, ${player.id})`;
  await sql`insert into memberships (group_id, player_id) values (${id}, ${player.id})`;
  return Response.json({ group: { id, name, invite_code: code } });
});
