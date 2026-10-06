"use client";

import { useState } from "react";
import { isIOS, isStandalone, useBrowser } from "@/lib/client";
import { enablePush, pushSupported } from "@/lib/push-client";

/** Asks once for notification permission; hidden when already enabled or unavailable. */
export function NotificationPrompt({ hasDevices }: { hasDevices: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const eligible = useBrowser(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("wg.pushPromptDismissed") === "1";
    } catch {}
    // iOS only allows push from the home-screen app.
    if (dismissed || !pushSupported() || (isIOS() && !isStandalone())) return false;
    return Notification.permission === "default" || (Notification.permission === "granted" && !hasDevices);
  }, false);

  if (!eligible || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem("wg.pushPromptDismissed", "1");
    } catch {}
    setHidden(true);
  };

  return (
    <div className="card mb-6 space-y-3">
      <p className="font-semibold">🔔 Daily reminders</p>
      <p className="text-sm text-muted">
        A ping when the new Wordle drops (12:15 AM), plus nudges at 8:30 AM and 1:30 PM if you haven&apos;t played yet.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={dismiss}>
          Not now
        </button>
        <button
          className="btn-primary"
          onClick={() =>
            enablePush()
              .then(() => setHidden(true))
              .catch((e) => setError(e.message))
          }
        >
          Turn on
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
