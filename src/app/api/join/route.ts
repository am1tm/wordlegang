import { handler, HttpError, readJson, requirePlayer } from "@/lib/auth";
import { joinGroupByCode } from "@/lib/groups";

export const POST = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const { code } = await readJson(req);
  if (typeof code !== "string" || !code) throw new HttpError(400, "Invite code is required");
  return Response.json({ group: await joinGroupByCode(player.id, code) });
});
