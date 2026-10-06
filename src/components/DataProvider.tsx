"use client";

import { SWRConfig, type Cache } from "swr";
import { ApiError, getKey } from "@/lib/client";

const STORAGE = "wg.cache.v1";

let cache: Map<string, unknown> | null = null;

/**
 * SWR cache that survives app restarts: loaded from localStorage on first use and
 * written back whenever the app is backgrounded. Only the current player's API
 * responses are kept (cache keys contain the player key).
 */
function persistentCache(): Cache {
  if (typeof window === "undefined") return new Map() as Cache;
  if (cache) return cache as Cache;

  let saved: [string, unknown][] = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
  } catch {}
  cache = new Map(saved);

  const save = () => {
    const key = getKey();
    const entries = key
      ? [...cache!.entries()]
          .filter(([k, v]) => k.includes(`"${key}"`) && (v as { data?: unknown })?.data !== undefined)
          .map(([k, v]) => [k, { data: (v as { data: unknown }).data }])
      : [];
    try {
      localStorage.setItem(STORAGE, JSON.stringify(entries));
    } catch {}
  };
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && save());
  return cache as Cache;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: persistentCache,
        dedupingInterval: 60_000, // a screen refetches at most once a minute…
        focusThrottleInterval: 30_000, // …plus when you come back to the app
        revalidateOnFocus: true,
        keepPreviousData: true,
        shouldRetryOnError: (err) => !(err instanceof ApiError && err.status < 500),
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
