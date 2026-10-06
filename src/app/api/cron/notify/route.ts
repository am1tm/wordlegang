import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { streaks } from "@/lib/board";
import { sql } from "@/lib/db";
import { pushToPlayer, type PushPayload } from "@/lib/push";
import { puzzleForDate, scoreLabel } from "@/lib/wordle";

// QStash calls this three times a day (see scripts/schedule.mjs) with the slot
// to send in the body. Reminder times are fixed in India time (IST).
const SLOTS = {
  midnight: "notify_midnight",
  morning: "notify_morning",
  afternoon: "notify_afternoon",
} as const;
type Slot = keyof typeof SLOTS;

type PlayerRow = { id: string; tz: string };

async function notify(req: Request) {
  const { slot } = (await req.json().catch(() => ({}))) as { slot?: string };
  if (!slot || !(slot in SLOTS)) return Response.json({ error: "Unknown slot" }, { status: 400 });
  const column = SLOTS[slot as Slot];

  if (slot === "midnight") {
    // New Wordle day: clear every group's Trash talk older than yesterday's puzzle.
    await sql`delete from messages where puzzle < ${puzzleForDate(new Date(), "Asia/Kolkata") - 1}`;
  }

  const now = new Date();
  const players = await sql<PlayerRow & Record<string, boolean>>`
    select p.id, p.tz, p.notify_midnight, p.notify_morning, p.notify_afternoon
    from players p where exists (select 1 from push_subscriptions s where s.player_id = p.id)`;

  let sent = 0;
  for (const player of players.filter((p) => p[column])) {
    // "Today" follows the player's own calendar so the already-played check is right.
    const puzzle = puzzleForDate(now, player.tz);
    const payload = await buildMessage(player.id, puzzle, slot);
    if (!payload) continue;

    // Claim the slot first so QStash retries never double-notify.
    const claimed = await sql`
      insert into notification_log (player_id, puzzle, slot) values (${player.id}, ${puzzle}, ${slot})
      on conflict do nothing returning slot`;
    if (claimed.length) sent += await pushToPlayer(player.id, payload);
  }
  return Response.json({ slot, checked: players.length, sent });
}

async function buildMessage(playerId: string, puzzle: number, slot: string): Promise<PushPayload | null> {
  const n = puzzle.toLocaleString("en-US");
  const tag = `wordle-${puzzle}`;

  const [mine, groups, mates] = await Promise.all([
    sql<{ puzzle: number; score: number }>`select puzzle, score from results where player_id = ${playerId}`,
    sql<{ name: string; members: number }>`
      select g.name, (select count(*)::int from memberships x where x.group_id = g.id) as members
      from memberships m join groups g on g.id = m.group_id where m.player_id = ${playerId}
      order by m.joined_at`,
    sql<{ name: string; score: number }>`
      select distinct on (p.id) p.name, r.score
      from memberships me
      join memberships m on m.group_id = me.group_id and m.player_id <> me.player_id
      join players p on p.id = m.player_id
      join results r on r.player_id = p.id and r.puzzle = ${puzzle}
      where me.player_id = ${playerId}`,
  ]);

  if (mine.some((r) => r.puzzle === puzzle)) return null; // already played today
  const mainGroup = groups[0]?.name;

  if (slot === "midnight") {
    return {
      title: `Wordle ${n} is live 🟩`,
      body: mainGroup ? `Be the first in ${mainGroup} to post today.` : "Play it and post your score.",
      url: "/",
      tag,
    };
  }

  const best = [...mates].sort((a, b) => a.score - b.score)[0];
  const { currentStreak } = streaks(mine, puzzle);

  if (slot === "morning") {
    return {
      title: "☀️ Morning Wordle",
      body: mates.length
        ? `${mates.length} of your gang already played. Best so far: ${best.name} ${scoreLabel(best.score)}/6.`
        : "Nobody's played yet. Get in first!",
      url: "/",
      tag,
    };
  }

  // Mates are de-duplicated across groups, so "last one" is only exact with a single group.
  const everyoneElseDone = groups.length === 1 && groups[0].members > 1 && mates.length >= groups[0].members - 1;
  return {
    title: currentStreak >= 2 ? `🔥 Keep your ${currentStreak}-day streak` : "⏰ Wordle reminder",
    body: everyoneElseDone
      ? `You're the last one in ${mainGroup} who hasn't played.`
      : mates.length
        ? `${mates.length} friend${mates.length === 1 ? " has" : "s have"} played today. Your turn!`
        : `Wordle ${n} is waiting for you.`,
    url: "/",
    tag,
  };
}

export const POST = verifySignatureAppRouter(notify);
