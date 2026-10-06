"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, useApi, useRefresh } from "@/lib/client";

type Message = { id: string; body: string; at: string; name: string; mine: boolean };
type ChatData = { puzzle: number; group: { id: string; name: string }; messages: Message[] };

const POLL_MS = 4000;

// While the on-screen keyboard is up, iOS slides the page instead of resizing it,
// so the chat sizes itself to the visible viewport to keep the composer on the keyboard.
const KEYBOARD_MIN_PX = 150;

function subscribeViewport(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", cb);
  vv?.addEventListener("scroll", cb);
  return () => {
    vv?.removeEventListener("resize", cb);
    vv?.removeEventListener("scroll", cb);
  };
}

const viewportSnapshot = () => {
  const vv = window.visualViewport;
  if (!vv || window.innerHeight - vv.height < KEYBOARD_MIN_PX) return "";
  return `${Math.round(vv.height)}:${Math.round(vv.offsetTop)}`;
};

function useChatViewport() {
  const snap = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "");
  if (!snap) return { keyboard: false, style: undefined };
  const [height, top] = snap.split(":").map(Number);
  return { keyboard: true, style: { height, bottom: "auto", transform: `translateY(${top}px)` } };
}

/** Full-screen Trash talk room: header on top, messages scroll, composer pinned to the bottom. */
export function Chat({ groupId, today }: { groupId: string; today: number }) {
  const path = `/api/groups/${groupId}/chat?today=${today}`;
  const { data, mutate } = useApi<ChatData>(path, { refreshInterval: POLL_MS, dedupingInterval: 2000 });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const lastId = data?.messages.at(-1)?.id;
  const refresh = useRefresh();
  const viewport = useChatViewport();
  const root = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [debug, setDebug] = useState("");

  // Temporary: tap the hint line to see what iOS reports on this screen.
  function measure() {
    const r = (el: Element | null) => {
      const b = el?.getBoundingClientRect();
      return b ? `${Math.round(b.top)}–${Math.round(b.bottom)}` : "n/a";
    };
    const vv = window.visualViewport;
    setDebug(
      [
        `window ${innerWidth}×${innerHeight} · screen ${screen.height}`,
        `visible ${vv ? `${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : "n/a"} · scrollY ${Math.round(scrollY)}`,
        `docEl ${document.documentElement.clientHeight} · body ${document.body.scrollHeight}`,
        `chat ${r(root.current)} · box ${r(form.current)}`,
        `mode ${viewport.keyboard ? "keyboard" : "normal"}`,
      ].join("\n"),
    );
  }

  useEffect(() => {
    // Scroll only the message list. scrollIntoView would also scroll the page on iOS
    // and shove the whole fixed chat up.
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
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
    // Fixed over the page and sized to the visible viewport, escaping the page padding.
    <div
      ref={root}
      className="fixed inset-x-0 top-0 bottom-0 z-40 mx-auto flex max-w-md flex-col bg-bg pt-[env(safe-area-inset-top)]"
      style={viewport.style}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <Link href={`/g/${groupId}`} className="-ml-2 rounded-lg px-2 py-1 text-2xl text-muted" aria-label="Back">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">💬 Trash talk</p>
          <p className="truncate text-xs text-muted">{data?.group?.name ?? " "}</p>
        </div>
      </header>

      <div ref={list} className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3">
        <p className="whitespace-pre-line pb-1 text-center text-xs text-muted" onClick={measure}>
          {debug || "Today\u2019s trash talk disappears when the next Wordle drops 💨"}
        </p>
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
      </div>

      <form
        ref={form}
        onSubmit={send}
        // The keyboard covers the home indicator, so its inset only applies when it's closed.
        className={`shrink-0 border-t border-line bg-bg px-4 pt-3 ${viewport.keyboard ? "pb-3" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
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
