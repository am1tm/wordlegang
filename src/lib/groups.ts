import { HttpError } from "./auth";
import { sql } from "./db";
import { normaliseInviteCode } from "./ids";

export async function joinGroupByCode(playerId: string, rawCode: string) {
  const code = normaliseInviteCode(rawCode);
  const rows = await sql<{ id: string; name: string }>`select id, name from groups where invite_code = ${code}`;
  const group = rows[0];
  if (!group) throw new HttpError(404, "That invite code doesn't match any group");
  await sql`insert into memberships (group_id, player_id) values (${group.id}, ${playerId}) on conflict do nothing`;
  return group;
}

export async function requireMembership(groupId: string, playerId: string) {
  const rows = await sql<{ id: string; name: string; invite_code: string; created_by: string }>`
    select g.id, g.name, g.invite_code, g.created_by
    from groups g join memberships m on m.group_id = g.id
    where g.id = ${groupId} and m.player_id = ${playerId}`;
  if (!rows[0]) throw new HttpError(404, "Group not found");
  return rows[0];
}
