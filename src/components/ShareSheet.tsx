"use client";

import { useState } from "react";
import { api } from "@/lib/client";

/** Button that fetches a recap, previews it, and offers WhatsApp / Copy / system share. */
export function ShareRecap({ path, label, primary = false }: { path: string; label: string; primary?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      setText((await api<{ text: string }>(path)).text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`${primary ? "btn-primary" : "btn-ghost"} w-full`} disabled={busy} onClick={open}>
        {busy ? "Preparing…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-muted">{error}</p>}
      {text !== null && <ShareSheet text={text} onClose={() => setText(null)} />}
    </>
  );
}

function ShareSheet({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-4 rounded-t-3xl border-t border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold">Share to your chat</p>
          <button className="px-2 text-2xl text-muted" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-sans text-sm leading-relaxed">
          {text}
        </pre>
        <a
          className="btn w-full bg-[#25d366] text-black"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send on WhatsApp
        </a>
        <div className={`grid gap-3 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
          <button
            className="btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {canShare && (
            <button className="btn-ghost" onClick={() => navigator.share({ text }).catch(() => {})}>
              More…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
