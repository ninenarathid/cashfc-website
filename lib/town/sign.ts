import { cleanChat, letters } from "./chat";
import { gateAt, placeOf, walkable, type Vec } from "./world";

/**
 * A sign held up over one's head (the owner, 2026-10-06: "ช่วยทำระบบตั้งห้องแชท
 * บนหัวผู้เล่น โดยผู้เล่นที่ตั้งห้องแชท จะต้องนั่ง หรือ ยืนเฉยๆ / สามารถตั้งรับซื้อของ หรือ
 * ขายของโดยไม่ผ่าน ลุงขายของ (ไม่โดนภาษี) แต่ผู้เล่นต้อง online ค้างไว้เท่านั้น", and of how
 * it should look: "อยากให้เหมือนกำลังชูป้ายอยู่").
 *
 * Somebody who sits or stands still may hold a sign up. It is one of two
 * kinds: a **chat room** others come into (lib/town/circle), or a **stall**
 * that sells, buys, or both at once (lib/town/shop; "ร้านเดียวทั้งขายและรับซื้อ
 * พร้อมกัน"). Walking anywhere takes it down. It is there for as long as its
 * holder is in town, on whatever page of the site they are looking at, and no
 * longer.
 *
 * What a sign says rides with the rest of what somebody is doing (the room's
 * `Doing.sign`): a few characters for its kind, then its title. Like a line of
 * chat it is cleaned on the way out and on the way in, and is stored nowhere.
 *
 * Pure: nothing here keeps anything.
 */
export const SIGN = {
  /** The most letters of a title (as a person counts them). */
  title: 24,
  /** The most people in a chat room, its holder among them. */
  cap: 8,
  /** How near its holder somebody stands to come into a chat room, and to stay in it, in tiles. */
  reach: 6,
};

export type SignKind = "chat" | "shop";
/** A sign as it is held up. `n`: of a chat room, how many are in it (its holder too). `sells`, `buys`: of a stall, what it does. */
export interface Sign { kind: SignKind; title: string; n: number; sells: boolean; buys: boolean }

/** A title as it may be held up: one clean line, no longer than a sign is wide. */
export function tidyTitle(raw: unknown): string {
  const flat = cleanChat(raw), l = letters(flat);
  return l.length <= SIGN.title ? flat : l.slice(0, SIGN.title).join("").trimEnd();
}

/** A sign as the room is told it: `c<how many>|<title>` for a chat room, `s<1 sells, 2 buys, 3 both>|<title>` for a stall. */
export function encodeSign(s: Sign): string {
  const head = s.kind === "chat" ? `c${Math.max(1, Math.min(SIGN.cap, Math.floor(s.n) || 1))}` : `s${(s.sells ? 1 : 0) + (s.buys ? 2 : 0)}`;
  return `${head}|${tidyTitle(s.title)}`;
}
/** A sign as another browser told it, or null when it is none (nothing held up, or not a sign at all). */
export function decodeSign(raw: unknown): Sign | null {
  if (typeof raw !== "string" || raw.length > 400) return null;
  const m = /^(?:c([1-9])|s([0-3]))\|/.exec(raw);
  if (!m) return null;
  const title = tidyTitle(raw.slice(m[0].length));
  if (m[1]) { const n = Number(m[1]); return n <= SIGN.cap ? { kind: "chat", title, n, sells: false, buys: false } : null; }
  const flags = Number(m[2]);
  return { kind: "shop", title, n: 0, sells: (flags & 1) > 0, buys: (flags & 2) > 0 };
}

/** Whether a sign may be held up by somebody standing here: on ground one may stand on, and not in a gateway (where the next step is another map). */
export function mayRaise(at: Vec): boolean {
  const x = Math.floor(at.x), y = Math.floor(at.y);
  return placeOf(at.x, at.y) !== null && walkable(x, y) && !gateAt(at.x, at.y);
}

/** Whether somebody stands near enough a chat room's holder to be in it: on the same map, within its reach. */
export function inReach(me: Vec, holder: Vec, reach: number = SIGN.reach): boolean {
  return placeOf(me.x, me.y) !== null && placeOf(me.x, me.y) === placeOf(holder.x, holder.y) && Math.hypot(me.x - holder.x, me.y - holder.y) <= reach + 0.5;
}
