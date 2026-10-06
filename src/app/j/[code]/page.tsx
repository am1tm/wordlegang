"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Onboarding } from "@/components/Onboarding";
import { Spinner } from "@/components/Spinner";
import { api, isIOS, isStandalone, setPendingInvite, useBrowser, useMe } from "@/lib/client";
import { normaliseInviteCode } from "@/lib/ids";

type Invite = { id: string; name: string; member_count: number };

export default function JoinPage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = normaliseInviteCode(rawCode);
  const router = useRouter();
  const { me } = useMe();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const iosBrowser = useBrowser(() => isIOS() && !isStandalone(), false);
  const [skipInstall, setSkipInstall] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPendingInvite(code);
    api<{ group: Invite }>(`/api/invite/${code}`)
      .then((r) => setInvite(r.group))
      .catch(() => setInvite(null));
  }, [code]);

  if (invite === undefined || me === undefined) return <Spinner />;

  if (invite === null) {
    return (
      <>
        <Header back="/" title="Invite" />
        <p className="text-muted">This invite link is invalid or has been replaced. Ask your friend for a fresh one.</p>
      </>
    );
  }

  const intro = (
    <div className="card mb-6 space-y-1 text-center">
      <p className="text-sm text-muted">You&apos;re invited to</p>
      <p className="text-2xl font-bold">{invite.name}</p>
      <p className="text-sm text-muted">
        {invite.member_count} member{invite.member_count === 1 ? "" : "s"}
      </p>
    </div>
  );

  // Already set up: one tap to join.
  if (me) {
    return (
      <div className="pt-8">
        {intro}
        <button
          className="btn-primary w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await api<{ group: { id: string } }>("/api/join", { method: "POST", json: { code } });
            setPendingInvite(null);
            router.replace(`/g/${r.group.id}`);
          }}
        >
          Join as {me.player.name}
        </button>
      </div>
    );
  }

  // iOS keeps the home-screen app's storage separate from the browser's, so install first.
  if (iosBrowser && !skipInstall) {
    return (
      <div className="space-y-5 pt-8">
        {intro}
        <div className="card space-y-3">
          <p className="font-semibold">First, add WordleGang to your home screen</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>
              Tap the <b className="text-fg">Share</b> icon (Chrome: top-right of the address bar · Safari: bottom bar)
            </li>
            <li>
              Tap <b className="text-fg">Add to Home Screen</b>
            </li>
            <li>Open WordleGang from your home screen, enter your name, then join with this code:</li>
          </ol>
          <p className="rounded-xl bg-surface-2 py-3 text-center font-mono text-2xl tracking-[0.3em]">{code}</p>
        </div>
        <button className="w-full py-2 text-sm text-muted" onClick={() => setSkipInstall(true)}>
          Skip and continue in the browser
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="pt-4">{intro}</div>
      <Onboarding inviteCode={code} onDone={(groupId) => router.replace(groupId ? `/g/${groupId}` : "/")} />
    </>
  );
}
