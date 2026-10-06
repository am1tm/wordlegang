import { cleanName, handler, hashKey, readJson } from "@/lib/auth";
import { sql } from "@/lib/db";
import { joinGroupByCode } from "@/lib/groups";
import { newId, newPlayerKey } from "@/lib/ids";
import { isValidTimeZone } from "@/lib/wordle";

// Create a player. The returned key is shown to the user and never stored in plain text.
export const POST = handler(async (req: Request) => {
  const body = await readJson(req);
  const name = cleanName(body.name);
  const tz = isValidTimeZone(body.tz) ? body.tz : "UTC";
  const id = newId();
  const key = newPlayerKey();
  await sql`insert into players (id, name, key_hash, tz) values (${id}, ${name}, ${hashKey(key)}, ${tz})`;

  let group = null;
  if (typeof body.inviteCode === "string" && body.inviteCode) {
    group = await joinGroupByCode(id, body.inviteCode).catch(() => null);
  }
  return Response.json({ key, player: { id, name, tz }, group });
});
