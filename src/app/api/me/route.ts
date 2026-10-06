import { cleanName, handler, readJson, requirePlayer } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isValidTimeZone, puzzleForDate } from "@/lib/wordle";

export const GET = handler(async (req: Request) => {
  const player = await requirePlayer(req);

  // Keep the timezone fresh so reminders follow people when they travel.
  const tz = new URL(req.url).searchParams.get("tz");
  if (isValidTimeZone(tz) && tz !== player.tz) {
    await sql`update players set tz = ${tz} where id = ${player.id}`;
    player.tz = tz;
  }

  const today = puzzleForDate(new Date(), player.tz);
  const [groups, todayResult, subs] = await Promise.all([
    sql`
      select g.id, g.name, g.invite_code,
        (select count(*)::int from memberships x where x.group_id = g.id) as member_count,
        (select count(*)::int from memberships x join results r on r.player_id = x.player_id
          where x.group_id = g.id and r.puzzle = ${today}) as played_today
      from memberships m join groups g on g.id = m.group_id
      where m.player_id = ${player.id}
      order by m.joined_at`,
    sql`select puzzle, score, hard, grid from results where player_id = ${player.id} and puzzle = ${today}`,
    sql<{ n: number }>`select count(*)::int as n from push_subscriptions where player_id = ${player.id}`,
  ]);

  return Response.json({
    player,
    today,
    todayResult: todayResult[0] ?? null,
    groups,
    pushDevices: subs[0].n,
  });
});

export const PATCH = handler(async (req: Request) => {
  const player = await requirePlayer(req);
  const body = await readJson(req);
  const name = body.name !== undefined ? cleanName(body.name) : player.name;
  const tz = isValidTimeZone(body.tz) ? body.tz : player.tz;
  const flag = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const rows = await sql`
    update players set
      name = ${name},
      tz = ${tz},
      notify_midnight = ${flag(body.notify_midnight, player.notify_midnight)},
      notify_morning = ${flag(body.notify_morning, player.notify_morning)},
      notify_afternoon = ${flag(body.notify_afternoon, player.notify_afternoon)}
    where id = ${player.id}
    returning id, name, tz, notify_midnight, notify_morning, notify_afternoon`;
  return Response.json({ player: rows[0] });
});
