"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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

export const getKey = () => storageGet(KEY_STORAGE);
export const setKey = (key: string | null) => storageSet(KEY_STORAGE, key);
export const getPendingInvite = () => storageGet(INVITE_STORAGE);
export const setPendingInvite = (code: string | null) => storageSet(INVITE_STORAGE, code);

export const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const todayPuzzle = () => puzzleForDate(new Date(), localTz());

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const key = getKey();
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

/** Loads the current player. `me` is undefined while loading, null when there's no (valid) key. */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const reload = useCallback(() => loadMe().then(setMe), []);
  useEffect(() => {
    let cancelled = false;
    loadMe().then((value) => !cancelled && setMe(value));
    return () => {
      cancelled = true;
    };
  }, []);
  return { me, reload };
}

async function loadMe(): Promise<Me | null> {
  if (!getKey()) return null;
  try {
    return await api<Me>(`/api/me?tz=${encodeURIComponent(localTz())}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
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
