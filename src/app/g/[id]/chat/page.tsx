"use client";

import { useParams } from "next/navigation";
import { Chat } from "@/components/Chat";
import { Spinner } from "@/components/Spinner";
import { todayPuzzle, useHydrated } from "@/lib/client";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  if (!hydrated) return <Spinner />;
  return <Chat groupId={id} today={todayPuzzle()} />;
}
