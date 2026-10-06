"use client";

import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/client";

type Message = { id: string; body: string; at: string; name: string; mine: boolean };
type ChatData = { puzzle: number; messages: Message[] };

const POLL_MS = 4000;

export function Chat({ groupId, today }: { groupId: string; today: number }) {
  const path = `/api/groups/${groupId}/chat?today=${today}`;
  const { data, mutate } = useApi<ChatData>(path, { refreshInterval: POLL_MS, dedupingInterval: 2000 });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = data?.messages.at(-1)?.id;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  if (!data) return <p className="text-sm text-muted">Loading chat…</p>;

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
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs text-muted">Today&apos;s trash talk disappears when the next Wordle drops 💨</p>
      <div className="space-y-2">
        {data.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Nothing yet. Start the trash talk.</p>
        )}
        {data.messages.map((m, i) => {
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
                <span className={`ml-2 text-[10px] ${m.mine ? "text-white/70" : "text-muted"}`}>
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
        className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-bg px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
      >
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
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
