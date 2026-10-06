// Creates/updates the QStash schedules that drive reminder notifications.
// Usage: node --env-file=.env.local scripts/schedule.mjs [https://your-domain]
import { Client } from "@upstash/qstash";

const base = process.argv[2] ?? "https://wordlegang.vercel.app";
const client = new Client({ token: process.env.QSTASH_TOKEN, baseUrl: process.env.QSTASH_URL });

const SCHEDULES = [
  { slot: "midnight", cron: "15 0 * * *" }, // 12:15 AM: new Wordle is out
  { slot: "morning", cron: "30 8 * * *" }, // 8:30 AM: nudge if not played
  { slot: "afternoon", cron: "30 13 * * *" }, // 1:30 PM: last reminder
];

// Retire the old 15-minute poller if it's still around.
await client.schedules.delete("wordlegang-notify").catch(() => {});

for (const { slot, cron } of SCHEDULES) {
  // Fixed ids make re-running this script an update, not a duplicate.
  await client.schedules.create({
    scheduleId: `wordlegang-${slot}`,
    destination: `${base}/api/cron/notify`,
    cron: `CRON_TZ=Asia/Kolkata ${cron}`,
    body: JSON.stringify({ slot }),
    headers: { "Content-Type": "application/json" },
    retries: 2,
  });
  console.log(`${slot.padEnd(9)} ${cron} IST → ${base}/api/cron/notify`);
}
