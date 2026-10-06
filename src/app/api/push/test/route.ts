import { handler, requirePlayer } from "@/lib/auth";
import { pushToPlayer } from "@/lib/push";

export const POST = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const delivered = await pushToPlayer(player.id, {
    title: "WordleGang 🟩",
    body: `Notifications are working, ${player.name}!`,
    url: "/",
    tag: "test",
  });
  return Response.json({ delivered });
});
