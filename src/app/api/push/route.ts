import { handler, HttpError, readJson, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";

export const POST = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const sub = (await readJson(req)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new HttpError(400, "Invalid subscription");
  await sql`
    insert into push_subscriptions (endpoint, player_id, p256dh, auth)
    values (${sub.endpoint}, ${player.id}, ${sub.keys.p256dh}, ${sub.keys.auth})
    on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth`;
  return Response.json({ ok: true });
});

export const DELETE = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const { endpoint } = await readJson(req);
  if (typeof endpoint === "string") {
    await sql`delete from push_subscriptions where endpoint = ${endpoint} and player_id = ${player.id}`;
  }
  return Response.json({ ok: true });
});
