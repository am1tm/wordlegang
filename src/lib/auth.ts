import { createHash } from "node:crypto";
import { sql } from "./db";
import { normaliseKey } from "./ids";

export type Player = {
  id: string;
  name: string;
  tz: string;
  notify_midnight: boolean;
  notify_morning: boolean;
  notify_afternoon: boolean;
};

export function hashKey(key: string) {
  return createHash("sha256").update(normaliseKey(key)).digest("hex");
}

export async function playerForKey(key: string | null | undefined): Promise<Player | null> {
  if (!key) return null;
  const rows = await sql<Player>`
    select id, name, tz, notify_midnight, notify_morning, notify_afternoon
    from players where key_hash = ${hashKey(key)}`;
  return rows[0] ?? null;
}

export function keyFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

export async function requirePlayer(req: Request) {
  const player = await playerForKey(keyFromRequest(req));
  if (!player) throw new HttpError(401, "Unknown player key");
  return player;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        // `message` is what the iOS Shortcut shows in its notification.
        return Response.json({ error: err.message, message: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function cleanName(raw: unknown, max = 24) {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").slice(0, max) : "";
  if (!name) throw new HttpError(400, "Name is required");
  return name;
}
