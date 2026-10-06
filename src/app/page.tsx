"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Grid } from "@/components/Grid";
import { Header } from "@/components/Header";
import { InstallBanner } from "@/components/InstallBanner";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { Onboarding } from "@/components/Onboarding";
import { PasteResult } from "@/components/PasteResult";
import { Spinner } from "@/components/Spinner";
import { api, isIOS, useBrowser, useMe } from "@/lib/client";
import { scoreLabel } from "@/lib/wordle";

export default function Home() {
  const { me, reload } = useMe();
  const router = useRouter();
  // Set by /share after posting. Safe as initial state: the first render is always the spinner.
  const [toast, setToast] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(location.search).get("posted") ?? ""),
  );

  useEffect(() => {
    if (location.search.includes("posted=")) history.replaceState(null, "", "/");
  }, []);

  if (me === undefined) return <Spinner />;
  if (me === null) {
    return <Onboarding onDone={(groupId) => (groupId ? router.push(`/g/${groupId}`) : reload())} />;
  }

  return (
    <>
      <Header
        right={
          <Link href="/settings" className="rounded-lg p-2 text-xl text-muted" aria-label="Settings">
            ⚙︎
          </Link>
        }
      />
      <InstallBanner />

      {toast && (
        <button className="card mb-4 w-full border-hit text-left font-semibold" onClick={() => setToast("")}>
          {toast}
        </button>
      )}

      <section className="card mb-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <p className="label">Today · Wordle {me.today.toLocaleString("en-US")}</p>
          {me.todayResult && (
            <p className="text-2xl font-bold">
              {scoreLabel(me.todayResult.score)}/6{me.todayResult.hard && "*"}
            </p>
          )}
        </div>
        {me.todayResult ? (
          <div className="flex items-center gap-4">
            <Grid grid={me.todayResult.grid} size="md" />
            <p className="text-sm text-muted">Posted. Check your groups to see how you stack up.</p>
          </div>
        ) : (
          <>
            <PasteResult
              onPosted={(msg) => {
                setToast(msg);
                reload();
              }}
            />
            <HowToShare />
          </>
        )}
      </section>

      <NotificationPrompt hasDevices={me.pushDevices > 0} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="label">Your groups</h2>
        </div>
        {me.groups.length === 0 && (
          <p className="text-sm text-muted">No groups yet. Create one and send the invite link to your friends.</p>
        )}
        {me.groups.map((g) => (
          <Link key={g.id} href={`/g/${g.id}`} className="card flex items-center justify-between active:bg-surface-2">
            <div>
              <p className="font-semibold">{g.name}</p>
              <p className="text-sm text-muted">
                {g.played_today}/{g.member_count} played today
              </p>
            </div>
            <span className="text-2xl text-muted">›</span>
          </Link>
        ))}
        <GroupActions onJoined={(id) => router.push(`/g/${id}`)} />
      </section>
    </>
  );
}

function HowToShare() {
  const ios = useBrowser(isIOS, false);
  return ios ? (
    <p className="text-sm text-muted">
      Tip: in Wordle tap <b className="text-fg">Share → Copy</b>, then paste here. Or{" "}
      <Link href="/settings#shortcut" className="text-near underline">
        set up 1-tap sharing
      </Link>
      .
    </p>
  ) : (
    <p className="text-sm text-muted">
      Tip: in Wordle tap <b className="text-fg">Share</b> and pick <b className="text-fg">WordleGang</b> (once the app is
      installed).
    </p>
  );
}

function GroupActions({ onJoined }: { onJoined: (id: string) => void }) {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res =
        mode === "create"
          ? await api<{ group: { id: string } }>("/api/groups", { method: "POST", json: { name: value } })
          : await api<{ group: { id: string } }>("/api/join", { method: "POST", json: { code: value } });
      onJoined(res.group.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={() => setMode("create")}>
          ＋ New group
        </button>
        <button className="btn-ghost" onClick={() => setMode("join")}>
          Join with code
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <input
        className={`input ${mode === "join" ? "font-mono uppercase" : ""}`}
        placeholder={mode === "create" ? "Group name, e.g. Office Gang" : "Invite code"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        autoFocus
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-ghost" onClick={() => setMode("idle")}>
          Cancel
        </button>
        <button className="btn-primary" disabled={busy || !value.trim()}>
          {mode === "create" ? "Create" : "Join"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
