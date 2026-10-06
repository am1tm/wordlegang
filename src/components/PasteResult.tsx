"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type SubmitResponse = { message: string };

export async function submitResult(text: string) {
  return api<SubmitResponse>("/api/submit", { method: "POST", json: { text } });
}

/** Big paste button with a textarea fallback when clipboard access is blocked. */
export function PasteResult({ onPosted }: { onPosted: (message: string) => void }) {
  const [manual, setManual] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(value: string) {
    setBusy(true);
    setError("");
    try {
      const res = await submitResult(value);
      setText("");
      setManual(false);
      onPosted(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) return post(clip);
    } catch {}
    setManual(true);
  }

  return (
    <div className="space-y-3">
      {manual ? (
        <>
          <textarea
            className="input h-40 font-mono text-sm"
            placeholder={"Paste your result here\n\nWordle 1,234 4/6\n⬛🟨⬛⬛⬛\n…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <button className="btn-primary w-full" disabled={busy || !text.trim()} onClick={() => post(text)}>
            {busy ? "Posting…" : "Post result"}
          </button>
        </>
      ) : (
        <button className="btn-primary w-full py-4 text-lg" disabled={busy} onClick={paste}>
          {busy ? "Posting…" : "📋 Paste today's result"}
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
