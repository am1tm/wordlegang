import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { sendChatDigest } from "@/lib/chat";

// QStash calls this at the end of a 10-minute window after someone posts in Trash talk.
export const POST = verifySignatureAppRouter(async (req: Request) => {
  const { groupId } = (await req.json().catch(() => ({}))) as { groupId?: string };
  if (!groupId) return Response.json({ error: "groupId required" }, { status: 400 });
  return Response.json({ sent: await sendChatDigest(groupId) });
});
