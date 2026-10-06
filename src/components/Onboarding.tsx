"use client";

import { useState } from "react";
import { api, ApiError, getPendingInvite, localTz, setKey, setPendingInvite } from "@/lib/client";
import { normaliseKey } from "@/lib/ids";
import { Logo } from "./Header";
import { CopyButton } from "./CopyButton";

type Created = { key: string; group: { id: string; name: string } | null };

export function Onboarding({ inviteCode, onDone }: { inviteCode?: string; onDone: (groupId?: string) => void }) {
  const [mode, setMode] = useState<"new" | "restore">("new");
  const [name, setName] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<Created>("/api/players", {
        method: "POST",
        json: { name, tz: localTz(), inviteCode: inviteCode ?? getPendingInvite() },
      });
      setPendingInvite(null);
      setCreated(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function restore(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const key = normaliseKey(keyInput);
    try {
      await api("/api/me", { key });
      const code = inviteCode ?? getPendingInvite();
      let groupId: string | undefined;
      if (code) {
        groupId = (
          await api<{ group: { id: string } }>("/api/join", { method: "POST", json: { code }, key }).catch(() => null)
        )?.group.id;
        setPendingInvite(null);
      }
      setKey(key);
      onDone(groupId);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "That key doesn't match any player." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-5 pt-6">
        <h1 className="text-2xl font-bold">You&apos;re in, {name.trim()} 🎉</h1>
        {created.group && (
          <p className="text-muted">
            You joined <span className="font-semibold text-fg">{created.group.name}</span>.
          </p>
        )}
        <div className="card space-y-3">
          <p className="label">Your player key</p>
          <p className="break-all font-mono text-xl tracking-wide">{created.key}</p>
          <p className="text-sm text-muted">
            There&apos;s no login, so this key is how WordleGang knows it&apos;s you. Save it somewhere safe to restore on
            a new phone. You can find it again in Settings.
          </p>
          <CopyButton text={created.key} label="Copy key" className="btn-ghost w-full" />
        </div>
        <button
          className="btn-primary w-full"
          onClick={() => {
            setKey(created.key);
            onDone(created.group?.id);
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-10">
      <div className="space-y-3">
        <Logo large />
        <h1 className="text-3xl font-bold leading-tight">
          Wordle is better
          <br />
          with your gang.
        </h1>
        <p className="text-muted">Post your daily Wordle, see how your friends did, and fight for the top spot. No sign-up.</p>
      </div>

      {mode === "new" ? (
        <form onSubmit={create} className="space-y-3">
          <input
            className="input text-lg"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
            required
          />
          <button className="btn-primary w-full" disabled={busy || !name.trim()}>
            {busy ? "Setting up…" : "Let's play"}
          </button>
          <button type="button" className="w-full py-2 text-sm text-muted" onClick={() => setMode("restore")}>
            I already have a player key
          </button>
        </form>
      ) : (
        <form onSubmit={restore} className="space-y-3">
          <input
            className="input font-mono uppercase"
            placeholder="WG-XXXX-XXXX-XXXX-XXXX-XXXX"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
          />
          <button className="btn-primary w-full" disabled={busy || !keyInput.trim()}>
            {busy ? "Checking…" : "Restore"}
          </button>
          <button type="button" className="w-full py-2 text-sm text-muted" onClick={() => setMode("new")}>
            I&apos;m new here
          </button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
