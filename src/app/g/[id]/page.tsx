"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Grid, HiddenGrid } from "@/components/Grid";
import { Header } from "@/components/Header";
import { ShareRecap } from "@/components/ShareSheet";
import { Spinner } from "@/components/Spinner";
import { UnreadBadge } from "@/components/UnreadBadge";
import { api, ApiError, inviteUrl, todayPuzzle, useApi, useRefreshAll } from "@/lib/client";
import { FAIL_SCORE, scoreLabel } from "@/lib/wordle";

type Stats = {
  id: string;
  name: string;
  played: number;
  wins: number;
  points: number;
  avg: number | null;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
};

type Board = {
  group: { id: string; name: string; invite_code: string; isOwner: boolean };
  unread: number;
  today: number;
  viewerPlayedToday: boolean;
  everyonePlayedToday: boolean;
  weekStart: number;
  todayEntries: { id: string; name: string; score: number | null; hard: boolean; grid: string | null }[];
  stats: { week: Stats[]; month: Stats[]; all: Stats[] };
};

const TABS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "30 days" },
  { id: "all", label: "All time" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: board, error: loadError, mutate } = useApi<Board>(`/api/groups/${id}?today=${todayPuzzle()}`);
  const refreshAll = useRefreshAll();
  const unauthorized = loadError instanceof ApiError && loadError.status === 401;
  const error = board || unauthorized ? "" : (loadError?.message ?? "");
  const [tab, setTab] = useState<Tab>("today");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (unauthorized) router.replace("/");
  }, [unauthorized, router]);

  if (error) {
    return (
      <>
        <Header back="/" />
        <p className="text-muted">{error}</p>
      </>
    );
  }
  if (!board) return <Spinner />;

  return (
    <>
      <Header
        back="/"
        title={board.group.name}
        right={
          <>
            <Link
              href={`/g/${board.group.id}/chat`}
              className="relative rounded-full bg-surface-2 p-2 text-xl leading-none"
              aria-label={board.unread ? `Trash talk, ${board.unread} unread` : "Trash talk"}
            >
              💬
              {board.unread > 0 && (
                <span className="absolute -right-1 -top-1">
                  <UnreadBadge count={board.unread} compact />
                </span>
              )}
            </Link>
            <InviteButton code={board.group.invite_code} name={board.group.name} />
            <button className="rounded-lg p-2 text-xl text-muted" onClick={() => setMenu(!menu)} aria-label="Group menu">
              ⋯
            </button>
          </>
        }
      />

      {menu && (
        <GroupMenu
          board={board}
          onChange={() => mutate()}
          onLeft={() => {
            refreshAll();
            router.replace("/");
          }}
        />
      )}

      <nav className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg py-2 text-sm font-semibold ${tab === t.id ? "bg-surface-2 text-fg" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "today" ? (
        <Today board={board} />
      ) : (
        <>
          <RecapButton board={board} tab={tab} />
          <Leaderboard rows={board.stats[tab]} />
        </>
      )}
    </>
  );
}

function Today({ board }: { board: Board }) {
  const played = board.todayEntries.filter((e) => e.score !== null);
  const waiting = board.todayEntries.filter((e) => e.score === null);
  return (
    <div className="space-y-3">
      <p className="label">Wordle {board.today.toLocaleString("en-US")}</p>
      {board.everyonePlayedToday ? (
        <div className="card space-y-3 border-hit/60">
          <p className="font-semibold">🎉 Everyone&apos;s played! Share today&apos;s highlights with the gang.</p>
          <ShareRecap path={summaryPath(board, "day")} label="Share highlights" primary />
        </div>
      ) : (
        played.length > 0 && <p className="text-xs text-muted">Highlights to share unlock once everyone has played.</p>
      )}
      {!board.viewerPlayedToday && played.length > 0 && (
        <p className="text-sm text-muted">Grids are hidden until you post your own result.</p>
      )}
      {played.length === 0 && <p className="text-sm text-muted">Nobody has posted today yet.</p>}
      {played.map((e, i) => (
        <div key={e.id} className="card flex items-center gap-4">
          <span className="w-6 text-center text-lg font-bold text-muted">{medal(i, e.score!, played)}</span>
          <div className="flex-1">
            <p className="font-semibold">{e.name}</p>
            <p className={`text-2xl font-bold ${e.score === FAIL_SCORE ? "text-danger" : ""}`}>
              {scoreLabel(e.score!)}/6{e.hard && <span className="text-near">*</span>}
            </p>
          </div>
          {e.grid ? <Grid grid={e.grid} /> : <HiddenGrid rows={e.score === FAIL_SCORE ? 6 : e.score!} />}
        </div>
      ))}
      {waiting.length > 0 && (
        <div className="pt-2">
          <p className="label mb-2">Still to play</p>
          <div className="flex flex-wrap gap-2">
            {waiting.map((e) => (
              <span key={e.id} className="rounded-full border border-line px-3 py-1 text-sm text-muted">
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function summaryPath(board: Board, kind: "day" | "week" | "lastweek" | "all") {
  return `/api/groups/${board.group.id}/summary?kind=${kind}&today=${board.today}`;
}

function RecapButton({ board, tab }: { board: Board; tab: Exclude<Tab, "today"> }) {
  if (tab === "month") return null;
  if (tab === "all") {
    return (
      <div className="mb-4">
        <ShareRecap path={summaryPath(board, "all")} label="📤 Share all-time standings" />
      </div>
    );
  }
  // Weeks run Mon–Sun; this week's recap is ready on Sunday once everyone has played.
  const weekDone = board.today === board.weekStart + 6 && board.everyonePlayedToday;
  return (
    <div className="mb-4">
      <ShareRecap
        path={summaryPath(board, weekDone ? "week" : "lastweek")}
        label={weekDone ? "🎉 Share this week's recap" : "📤 Share last week's recap"}
        primary={weekDone}
      />
    </div>
  );
}

function medal(index: number, score: number, played: { score: number | null }[]) {
  if (score === FAIL_SCORE) return "💀";
  const rank = played.findIndex((p) => p.score === score); // ties share a medal
  return ["🥇", "🥈", "🥉"][rank] ?? String(index + 1);
}

function Leaderboard({ rows }: { rows: Stats[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.every((r) => r.played === 0)) return <p className="text-sm text-muted">No games in this period yet.</p>;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3rem_3rem] px-4 text-xs font-semibold uppercase tracking-wider text-muted">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Avg</span>
        <span className="text-right">🔥</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.id}
          onClick={() => setOpen(open === r.id ? null : r.id)}
          className="card block w-full py-3 text-left active:bg-surface-2"
        >
          <div className="grid grid-cols-[2rem_1fr_3.5rem_3rem_3rem] items-center">
            <span className="font-bold text-muted">{standing(rows, r)}</span>
            <span className="truncate font-semibold">{r.name}</span>
            <span className="text-right text-lg font-bold">{r.points}</span>
            <span className="text-right text-muted">{r.avg ? r.avg.toFixed(2) : "–"}</span>
            <span className="text-right text-muted">{r.currentStreak}</span>
          </div>
          {open === r.id && <Distribution stats={r} />}
        </button>
      ))}
      <p className="px-1 pt-2 text-xs text-muted">
        Points: 1 guess = 6 pts down to 6 guesses = 1 pt. Fails and missed days score 0. Avg counts a fail as 7. Tap a
        player for details.
      </p>
    </div>
  );
}

// Players level on points and average share a medal.
function standing(rows: Stats[], r: Stats) {
  const rank = rows.findIndex((o) => o.points === r.points && o.avg === r.avg);
  return ["🥇", "🥈", "🥉"][rank] ?? rank + 1;
}

function Distribution({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.distribution);
  return (
    <div className="mt-3 space-y-1 border-t border-line pt-3">
      <p className="mb-2 text-xs text-muted">
        {stats.played} played · {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}% won · best streak{" "}
        {stats.maxStreak}
      </p>
      {stats.distribution.map((n, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-3 text-muted">{i === 6 ? "X" : i + 1}</span>
          <div
            className={`flex h-5 items-center justify-end rounded px-1.5 font-semibold ${i === 6 ? "bg-danger/70" : "bg-hit"}`}
            style={{ width: `${Math.max(8, (n / max) * 100)}%`, opacity: n ? 1 : 0.35 }}
          >
            {n}
          </div>
        </div>
      ))}
    </div>
  );
}

function InviteButton({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = inviteUrl(code);
    const text = `Join "${name}" on WordleGang and post your daily Wordle 🟩 (code ${code})`;
    if (navigator.share) {
      try {
        return await navigator.share({ title: "WordleGang", text, url });
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button className="rounded-full bg-hit px-3.5 py-1.5 text-sm font-semibold text-white" onClick={share}>
      {copied ? "Copied ✓" : "＋ Invite"}
    </button>
  );
}

function GroupMenu({ board, onChange, onLeft }: { board: Board; onChange: () => void; onLeft: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  return (
    <div className="card mb-4 space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
        <span className="label">Invite code</span>
        <span className="font-mono text-lg tracking-widest">{board.group.invite_code}</span>
      </div>
      {board.group.isOwner && (
        <button
          className="btn-ghost w-full"
          onClick={async () => {
            await api(`/api/groups/${board.group.id}`, { method: "PATCH", json: { rotateInvite: true } });
            onChange();
          }}
        >
          🔄 New invite code (old link stops working)
        </button>
      )}
      {confirmLeave ? (
        <button
          className="btn w-full bg-danger text-white"
          onClick={async () => {
            await api(`/api/groups/${board.group.id}`, { method: "DELETE" });
            onLeft();
          }}
        >
          Tap again to leave {board.group.name}
        </button>
      ) : (
        <button className="btn-ghost w-full text-danger" onClick={() => setConfirmLeave(true)}>
          Leave group
        </button>
      )}
    </div>
  );
}
