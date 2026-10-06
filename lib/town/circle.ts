import { cleanChat } from "./chat";
import { SIGN } from "./sign";

/**
 * A chat room under a sign (the owner, 2026-10-06: "เอาแบบ RO แต่แยกเสียงในห้อง
 * ได้ด้วย"). Somebody holds up a sign that is a chat room; whoever stands near
 * taps it and is in. What is typed in the room is read only by those in it,
 * and so is what is said: **whoever is in a room hears the room and nobody
 * else, and nobody outside hears them.** Its holder lets people in (as many as
 * the room takes), and may let somebody go, who is then not let back in.
 *
 * How it is kept, with no server of its own:
 *
 * - **The holder's page keeps the list.** Somebody asks (`ask`); the holder's
 *   page answers with the list (`in`) or a refusal (`no`), and sends the list
 *   again to everybody on it whenever it changes. Leaving is a word to the
 *   holder (`bye`); the holder taking the sign down ends the room (`end`).
 * - **Every word goes into one person's letterbox** (lib/town/room: a private
 *   channel only its owner reads), never to the room at large: a line typed is
 *   sent to each of the others by name. Nobody outside is sent any of it.
 * - **The town is told only who is in whose room** (`Doing.circle`: the
 *   holder's id), which every page needs to know whom to open a voice line
 *   with, and how many a sign should say.
 *
 * As with the rest of the town, who somebody is, is what their page says
 * (lib/town/room): this keeps a conversation among those meant to have it, not
 * out of reach of somebody who rewrites their page to pose as one of them.
 *
 * Pure: the sending is lib/town/session's.
 */

/** A chat room as one page keeps it: whose it is, who is in it (its holder first), and, on the holder's page, whom it let go. */
export interface Circle { host: string; members: string[]; out: string[] }
export const newCircle = (host: string): Circle => ({ host, members: [host], out: [] });

/** What is said between the pages of a room, each into one letterbox. */
export type CircleWord =
  | { k: "ask" }                       // to the holder: let me in
  | { k: "in"; m: string[] }           // from the holder: who is in the room now (to somebody let in, and to everybody on a change)
  | { k: "no"; why: "full" | "out" }   // from the holder: not let in
  | { k: "ln"; t: string }             // from anybody in it, to each of the others: a line
  | { k: "bye" }                       // to the holder: I am leaving
  | { k: "out" }                       // from the holder: you are let go
  | { k: "end" };                      // from the holder: the room is over

const ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A word as another browser sent it: only what is known, of the shape expected; null otherwise. */
export function readWord(raw: unknown): CircleWord | null {
  const p = raw as { k?: unknown; m?: unknown; why?: unknown; t?: unknown } | null;
  if (!p || typeof p !== "object") return null;
  switch (p.k) {
    case "ask": case "bye": case "out": case "end": return { k: p.k };
    case "no": return p.why === "full" || p.why === "out" ? { k: "no", why: p.why } : null;
    case "ln": { const t = cleanChat(p.t); return t ? { k: "ln", t } : null; }
    case "in": {
      if (!Array.isArray(p.m) || p.m.length < 1 || p.m.length > SIGN.cap) return null;
      const m = p.m.filter((id): id is string => typeof id === "string" && ID.test(id));
      return m.length === p.m.length && new Set(m).size === m.length ? { k: "in", m } : null;
    }
    default: return null;
  }
}

/** The holder lets somebody in: refused when the room is full, or when they were let go from it. Somebody in it already is in it. */
export function admit(c: Circle, who: string, cap: number = SIGN.cap): { ok: true; circle: Circle } | { ok: false; why: "full" | "out" } {
  if (c.out.includes(who)) return { ok: false, why: "out" };
  if (c.members.includes(who)) return { ok: true, circle: c };
  if (c.members.length >= cap) return { ok: false, why: "full" };
  return { ok: true, circle: { ...c, members: [...c.members, who] } };
}
/** Somebody is no longer in the room (they left, or are gone from the town); `forGood`: the holder let them go. The holder is never taken out of their own room. */
export function without(c: Circle, who: string, forGood = false): Circle {
  if (who === c.host) return c;
  const members = c.members.filter((id) => id !== who), out = forGood && !c.out.includes(who) ? [...c.out, who] : c.out;
  return members.length === c.members.length && out === c.out ? c : { ...c, members, out };
}
/** The room as its holder says it is now, kept by somebody in it: null when the list is not the holder's, or I am not on it. */
export function listed(host: string, me: string, members: readonly string[]): Circle | null {
  return members[0] === host && members.includes(me) ? { host, members: [...members], out: [] } : null;
}

/**
 * Whom I hear, and who hears me (the voice is a line between two, opened only when both sides say yes to this).
 * In a room: those the holder lists, and nobody else. In none: everybody who is in none themselves (`theirs` is the
 * room they told the town they are in; nothing, from a page built before there were rooms).
 */
export function hears(mine: Circle | null, who: string, theirs: string | undefined): boolean {
  return mine ? mine.members.includes(who) : !theirs;
}

/** Whether a line is one of the room's: from somebody the holder lists, while I am in it. */
export const fromRoom = (mine: Circle | null, from: string) => !!mine && mine.members.includes(from);
