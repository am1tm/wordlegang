"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "wg.errorReloadAt";

/**
 * Most errors here come from a new deploy replacing the code an open app was
 * running. A single automatic reload picks up the new version; the flag stops
 * a reload loop when the error is real.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG));
      if (!last || Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        location.reload();
      }
    } catch {}
  }, [error]);

  return (
    <div className="space-y-4 pt-24 text-center">
      <p className="text-3xl">🫠</p>
      <p className="text-lg font-semibold">Something went sideways</p>
      <p className="text-sm text-muted">The app may have just updated.</p>
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
        {/* Full page loads (not client navigation) so a stale app picks up the new version. */}
        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard load */}
        <button className="btn-ghost" onClick={() => location.assign("/")}>
          Home
        </button>
        <button className="btn-primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}
