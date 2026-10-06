"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/Spinner";
import { api, ApiError, getKey, isIOS, isStandalone, setKey, useBrowser, useMe, type Me } from "@/lib/client";
import { normaliseKey } from "@/lib/ids";
import { currentSubscription, disablePush, enablePush, pushSupported } from "@/lib/push-client";

const SHORTCUT_URL = process.env.NEXT_PUBLIC_IOS_SHORTCUT_URL;

export default function SettingsPage() {
  const { me, reload } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me === null) router.replace("/");
  }, [me, router]);

  if (!me) return <Spinner />;

  return (
    <>
      <Header back="/" title="Settings" />
      <div className="space-y-6">
        <NameSection me={me} onSaved={reload} />
        <NotificationsSection me={me} onSaved={reload} />
        <ShortcutSection />
        <KeySection />
      </div>
    </>
  );
}

function NameSection({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const [name, setName] = useState(me.player.name);
  const dirty = name.trim() && name.trim() !== me.player.name;
  return (
    <section className="space-y-2">
      <h2 className="label">Display name</h2>
      <div className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        {dirty && (
          <button
            className="btn-primary"
            onClick={async () => {
              await api("/api/me", { method: "PATCH", json: { name } });
              onSaved();
            }}
          >
            Save
          </button>
        )}
      </div>
    </section>
  );
}

const SLOTS = [
  { key: "notify_midnight", label: "New Wordle is out", time: "12:15 AM" },
  { key: "notify_morning", label: "Morning nudge if you haven't played", time: "8:30 AM" },
  { key: "notify_afternoon", label: "Afternoon reminder if you haven't played", time: "1:30 PM" },
] as const;

function NotificationsSection({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const env = useBrowser(
    () => (isIOS() && !isStandalone() ? "needs-install" : pushSupported() ? "ok" : "unsupported"),
    "loading",
  );
  const [subscribed, setDevice] = useState<"on" | "off" | null>(null);
  const device = env === "ok" ? (subscribed ?? "loading") : env;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (env !== "ok") return;
    currentSubscription().then((s) => setDevice(s && Notification.permission === "granted" ? "on" : "off"));
  }, [env]);

  async function toggleDevice() {
    setBusy(true);
    setNote("");
    try {
      if (device === "on") {
        await disablePush();
        setDevice("off");
      } else {
        await enablePush();
        setDevice("on");
      }
      onSaved();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="label">Notifications</h2>
      <div className="card space-y-4">
        {device === "needs-install" && (
          <p className="text-sm text-muted">
            On iPhone, notifications only work from the home-screen app. Tap Share → Add to Home Screen, then open it
            from there.
          </p>
        )}
        {device === "unsupported" && <p className="text-sm text-muted">This browser doesn&apos;t support notifications.</p>}
        {(device === "on" || device === "off") && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">This device</p>
              <p className="text-sm text-muted">{device === "on" ? "Notifications on" : "Notifications off"}</p>
            </div>
            <button className={device === "on" ? "btn-ghost" : "btn-primary"} disabled={busy} onClick={toggleDevice}>
              {device === "on" ? "Turn off" : "Turn on"}
            </button>
          </div>
        )}

        <div className="space-y-3 border-t border-line pt-4">
          {SLOTS.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-medium">{s.time}</span>
                <span className="block text-sm text-muted">{s.label}</span>
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-[var(--hit)]"
                checked={me.player[s.key]}
                onChange={async (e) => {
                  await api("/api/me", { method: "PATCH", json: { [s.key]: e.target.checked } });
                  onSaved();
                }}
              />
            </label>
          ))}
          <p className="text-xs text-muted">Times are India time (IST). Reminders skip days you&apos;ve already played.</p>
        </div>

        {device === "on" && (
          <button
            className="btn-ghost w-full"
            onClick={async () => {
              const r = await api<{ delivered: number }>("/api/push/test", { method: "POST" });
              setNote(r.delivered ? "Test sent. It should arrive in a few seconds." : "No devices reachable.");
            }}
          >
            Send a test notification
          </button>
        )}
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
    </section>
  );
}

function ShortcutSection() {
  const key = getKey() ?? "";
  return (
    <section id="shortcut" className="space-y-2">
      <h2 className="label">1-tap sharing on iPhone</h2>
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Add a Shortcut so <b className="text-fg">Post to WordleGang</b> shows up when you tap Share in Wordle. One-time
          setup:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Copy your key</li>
          <li>Tap Get Shortcut, then Add Shortcut, and paste your key when it asks</li>
          <li>
            In Wordle, tap <b className="text-fg">Share</b> → <b className="text-fg">Post to WordleGang</b>
          </li>
        </ol>
        <div className="grid grid-cols-2 gap-3">
          <CopyButton text={key} label="1. Copy key" />
          {SHORTCUT_URL ? (
            <a className="btn-primary" href={SHORTCUT_URL}>
              2. Get Shortcut
            </a>
          ) : (
            <button className="btn-primary" disabled>
              Coming soon
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function KeySection() {
  const router = useRouter();
  const [reveal, setReveal] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const key = getKey() ?? "";

  async function switchKey(e: React.FormEvent) {
    e.preventDefault();
    const next = normaliseKey(input);
    try {
      await api("/api/me", { key: next });
      setKey(next);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "That key doesn't match any player." : (err as Error).message);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="label">Player key</h2>
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Your key is your login. Use it to restore your player on a new phone. Keep it private: anyone with it can post
          as you.
        </p>
        <button className="w-full rounded-xl bg-surface-2 px-4 py-3 text-left font-mono" onClick={() => setReveal(!reveal)}>
          {reveal ? key : key.slice(0, 7) + key.slice(7).replace(/[0-9A-Z]/g, "•")}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <CopyButton text={key} label="Copy key" />
          <button className="btn-ghost" onClick={() => setSwitching(!switching)}>
            Use another key
          </button>
        </div>
        {switching && (
          <form onSubmit={switchKey} className="space-y-2">
            <input
              className="input font-mono uppercase"
              placeholder="WG-XXXX-XXXX-XXXX-XXXX-XXXX"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button className="btn-primary w-full" disabled={!input.trim()}>
              Switch player
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
