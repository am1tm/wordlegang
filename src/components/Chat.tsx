"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useApi, useRefresh } from "@/lib/client";

type Message = { id: string; body: string; at: string; name: string; mine: boolean };
type ChatData = { puzzle: number; group: { id: string; name: string }; messages: Message[] };

const POLL_MS = 4000;

/** Full-screen Trash talk room: header on top, messages scroll, composer pinned to the bottom. */
export function Chat({ groupId, today }: { groupId: string; today: number }) {
  const path = `/api/groups/${groupId}/chat?today=${today}`;
  const { data, mutate } = useApi<ChatData>(path, { refreshInterval: POLL_MS, dedupingInterval: 2000 });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = data?.messages.at(-1)?.id;
  const refresh = useRefresh();

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
    // Loading the room marked it read on the server; refresh the unread badges.
    if (lastId) refresh((p) => p.startsWith("/api/me") || p.startsWith(`/api/groups/${groupId}?`));
  }, [lastId, refresh, groupId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError("");
    try {
      const { message } = await api<{ message: Message }>(`/api/groups/${groupId}/chat`, {
        method: "POST",
        json: { body, today },
      });
      mutate((d) => d && { ...d, messages: [...d.messages, message] }, { revalidate: false });
    } catch (err) {
      setText(body);
      setError((err as Error).message);
    }
  }

  return (
    // Fixed to the viewport (dvh tracks the on-screen keyboard), escaping the page padding.
    <div className="fixed inset-x-0 top-0 z-40 mx-auto flex h-[100dvh] max-w-md flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <Link href={`/g/${groupId}`} className="-ml-2 rounded-lg px-2 py-1 text-2xl text-muted" aria-label="Back">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">💬 Trash talk</p>
          <p className="truncate text-xs text-muted">{data?.group?.name ?? " "}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3">
        <p className="pb-1 text-center text-xs text-muted">Today&apos;s trash talk disappears when the next Wordle drops 💨</p>
        {!data && <p className="py-8 text-center text-sm text-muted">Loading…</p>}
        {data?.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Nothing yet. Start the trash talk.</p>
        )}
        {data?.messages.map((m, i) => {
          const showName = !m.mine && data.messages[i - 1]?.name !== m.name;
          return (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              {showName && <span className="mb-0.5 px-2 text-xs font-semibold text-near">{m.name}</span>}
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 ${
                  m.mine ? "rounded-br-md bg-hit text-white" : "rounded-bl-md bg-surface-2"
                }`}
              >
                {m.body}
                <span className={`ml-2 whitespace-nowrap text-[10px] ${m.mine ? "text-white/70" : "text-muted"}`}>
                  {new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={send}
        className="shrink-0 border-t border-line bg-bg px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
      >
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Talk trash…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            enterKeyHint="send"
          />
          <button className="btn-primary px-5" disabled={!text.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
