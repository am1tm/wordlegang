import { customAlphabet } from "nanoid";

// No 0/O/1/I/L so codes survive being read aloud or typed from a screenshot.
const READABLE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const newId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
export const newInviteCode = customAlphabet(READABLE, 8);
const keyBody = customAlphabet(READABLE, 20);

/** Player key, e.g. WG-7KQ2-M9XH-… — the only credential a player has. */
export function newPlayerKey() {
  return "WG-" + keyBody().match(/.{4}/g)!.join("-");
}

export function normaliseKey(raw: string) {
  const body = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^WG/, "");
  return "WG-" + (body.match(/.{1,4}/g) ?? []).join("-");
}

export function normaliseInviteCode(raw: string) {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}
