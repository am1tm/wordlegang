import { Client } from "@upstash/qstash";
import { sql } from "./db";
import { pushToPlayer } from "./push";
import { localParts, puzzleForDate } from "./wordle";

const DIGEST_WINDOW_MS = 10 * 60 * 1000;
const QUIET_FROM = 23; // no chat pings 11 PM…
const QUIET_UNTIL = 8; // …to 8 AM IST

let qstash: Client | undefined;

/**
 * Queue a "N new messages" push for the group at the end of the current
 * 10-minute window. QStash deduplicates, so a burst of messages sends one digest.
 */
export async function scheduleChatDigest(groupId: string, origin: string) {
  qstash ??= new Client({ token: process.env.QSTASH_TOKEN!, baseUrl: process.env.QSTASH_URL });
  const windowEnd = Math.ceil((Date.now() + 1) / DIGEST_WINDOW_MS) * DIGEST_WINDOW_MS;
  await qstash.publishJSON({
    url: `${origin}/api/cron/chat-digest`,
    body: { groupId },
    notBefore: Math.floor(windowEnd / 1000),
    deduplicationId: `chat-${groupId}-${windowEnd}`,
    retries: 1,
  });
}

/** Unread messages from others in a group's current room for one member. */
export function unreadCount(groupId: string, playerId: string, puzzle: number) {
  return sql<{ n: number }>`
    select count(*)::int as n from messages msg
    join memberships m on m.group_id = msg.group_id and m.player_id = ${playerId}
    where msg.group_id = ${groupId} and msg.puzzle = ${puzzle}
      and msg.player_id <> ${playerId} and msg.id > m.chat_read_id`.then((r) => r[0].n);
}

export async function sendChatDigest(groupId: string) {
  const { hour } = localParts(new Date(), "Asia/Kolkata");
  if (hour >= QUIET_FROM || hour < QUIET_UNTIL) return 0;

  const members = await sql<{ id: string; tz: string; group_name: string; seen: string }>`
    select p.id, p.tz, g.name as group_name, greatest(m.chat_read_id, m.chat_notified_id)::text as seen
    from memberships m join players p on p.id = m.player_id join groups g on g.id = m.group_id
    where m.group_id = ${groupId} and p.notify_chat
      and exists (select 1 from push_subscriptions s where s.player_id = p.id)`;

  let sent = 0;
  for (const member of members) {
    const puzzle = puzzleForDate(new Date(), member.tz);
    const fresh = await sql<{ id: string; body: string; name: string }>`
      select msg.id::text, msg.body, p.name from messages msg join players p on p.id = msg.player_id
      where msg.group_id = ${groupId} and msg.puzzle = ${puzzle}
        and msg.player_id <> ${member.id} and msg.id > ${member.seen}::bigint
      order by msg.id desc`;
    if (!fresh.length) continue;

    await sql`
      update memberships set chat_notified_id = ${fresh[0].id}::bigint
      where group_id = ${groupId} and player_id = ${member.id}`;
    const total = await sql<{ n: number }>`
      select count(*)::int as n from messages msg
      join memberships m on m.group_id = msg.group_id and m.player_id = ${member.id}
      where msg.puzzle = ${puzzle} and msg.player_id <> ${member.id} and msg.id > m.chat_read_id`;

    const latest = fresh[0];
    sent += await pushToPlayer(member.id, {
      title: `💬 ${fresh.length} new message${fresh.length === 1 ? "" : "s"} in ${member.group_name}`,
      body: `${latest.name}: ${latest.body.length > 80 ? latest.body.slice(0, 79) + "…" : latest.body}`,
      url: `/g/${groupId}/chat`,
      tag: `chat-${groupId}`,
      badge: total[0].n,
    });
  }
  return sent;
}
