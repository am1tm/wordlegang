"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone, useBrowser } from "@/lib/client";

type InstallPrompt = Event & { prompt: () => Promise<void> };

/** Nudges people to install: native prompt on Android, step-by-step on iOS. */
export function InstallBanner() {
  const iosBrowser = useBrowser(() => isIOS() && !isStandalone(), false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const state = installed ? "hidden" : iosBrowser ? "ios" : prompt ? "android" : "hidden";

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (state === "hidden") return null;

  return (
    <div className="card mb-4 space-y-2 border-near/50">
      <p className="font-semibold">📲 Install WordleGang</p>
      {state === "ios" ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            Tap the <b className="text-fg">Share</b> icon (Safari: bottom bar · Chrome: top-right of the address bar)
          </li>
          <li>
            Choose <b className="text-fg">Add to Home Screen</b>
          </li>
          <li>Open WordleGang from your home screen. That&apos;s where notifications work.</li>
        </ol>
      ) : (
        <>
          <p className="text-sm text-muted">Install it so WordleGang shows up when you tap Share in Wordle.</p>
          <button className="btn-primary w-full" onClick={() => prompt?.prompt().then(() => setInstalled(true))}>
            Install app
          </button>
        </>
      )}
    </div>
  );
}
