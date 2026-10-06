"use client";

import { useCallback, useSyncExternalStore } from "react";
import useSWR, { useSWRConfig, type SWRConfiguration } from "swr";
import { puzzleForDate } from "./wordle";

const KEY_STORAGE = "wg.key";
const INVITE_STORAGE = "wg.pendingInvite";

function storageGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
}

// The player key is a tiny external store so screens react when it's set or switched.
const keyListeners = new Set<() => void>();
export const getKey = () => storageGet(KEY_STORAGE);
export function setKey(key: string | null) {
  storageSet(KEY_STORAGE, key);
  keyListeners.forEach((l) => l());
}
function subscribeKey(listener: () => void) {
  keyListeners.add(listener);
  return () => keyListeners.delete(listener);
}
export const usePlayerKey = () => useSyncExternalStore(subscribeKey, getKey, () => null);
export const getPendingInvite = () => storageGet(INVITE_STORAGE);
export const setPendingInvite = (code: string | null) => storageSet(INVITE_STORAGE, code);

export const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const todayPuzzle = () => puzzleForDate(new Date(), localTz());

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Fetch JSON from our API as the current player (or as `init.key`, e.g. to verify a key before saving it). */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown; key?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const key = init.key ?? getKey();
  if (key) headers.set("authorization", `Bearer ${key}`);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  const res = await fetch(path, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export type Me = {
  player: {
    id: string;
    name: string;
    tz: string;
    notify_midnight: boolean;
    notify_morning: boolean;
    notify_afternoon: boolean;
  };
  today: number;
  todayResult: { puzzle: number; score: number; hard: boolean; grid: string } | null;
  groups: { id: string; name: string; invite_code: string; member_count: number; played_today: number }[];
  pushDevices: number;
};

const hydratedSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards, so cached data never causes a hydration mismatch. */
export const useHydrated = () => useSyncExternalStore(hydratedSubscribe, () => true, () => false);

/**
 * Cached GET for the current player (stale-while-revalidate, see DataProvider).
 * The player key is part of the cache key, so switching players never shows stale data.
 */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T, Error>) {
  const hydrated = useHydrated();
  const key = usePlayerKey();
  return useSWR<T, Error, [string, string] | null>(hydrated && key && path ? [path, key] : null, ([p, k]) =>
    api<T>(p, { key: k }),
    config,
  );
}

/** Revalidate every cached screen, e.g. after posting a result or joining a group. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig();
  return useCallback(() => mutate(() => true), [mutate]);
}

/** Current player. `me` is undefined while loading, null when there's no (valid) key. */
export function useMe() {
  const hydrated = useHydrated();
  const key = usePlayerKey();
  const { data, error, mutate } = useApi<Me>(`/api/me?tz=${encodeURIComponent(localTz())}`);
  const unauthorized = error instanceof ApiError && error.status === 401;
  const me = !hydrated ? undefined : !key || unauthorized ? null : data;
  return { me, reload: useCallback(() => mutate(), [mutate]) };
}

const noSubscribe = () => () => {};

/** Read a browser-only value without a hydration mismatch (server renders `serverValue`). */
export function useBrowser<T extends string | number | boolean | null>(get: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, get, () => serverValue);
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function inviteUrl(code: string) {
  return `${location.origin}/j/${code}`;
}
