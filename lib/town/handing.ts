/**
 * Handing water on with no stamina, as a game for two at once (the owner, 2026-10-06: "ช่วยทำให้มี minigame ตอนส่งน้ำ
 * เป็นแบบเล่นพร้อมกัน ทำให้เล่นยากขึ้นถ้า stamina หมด (เฉพาะฝั่งที่ stamina หมด หรือถ้าหมดสองฝั่งก็ยากทั้งคู่)").
 *
 * **Where it stands after a day of his words.** It was first a pouring followed with a bucket for some seconds
 * ("ต้องทำให้ minigame จบเร็วที่สุด เพราะถ้าช้า ผู้เล่นจะคิดว่า วิ่งส่งเอาเองเร็วกว่า"), then one throw aimed by dragging and caught
 * by dragging ("เป็นการเน้น reaction เร็วๆ", "ถ้ายากไป คนจะไม่เล่น และจะเดินส่งคนเดียว"). That went live, and for hours nobody
 * handed water on: "เกมยากไป … ที่ยากคือ คนไม่เข้าใจวิธีเล่น ฝั่งรับน้ำ พอเข้าใจได้ แต่ฝั่งเทนี้เล่นยังไง", and "เอาให้ง่ายๆไปเลย แต่ยัง
 * เร็วอยู่ได้ไหม เขียนวิธีเล่น ให้เข้าใจง่ายๆด้วย". So:
 *
 * - **With stamina on both sides there is no game**: the water is in the other's bucket at once, as it always was
 *   (lib/town/line; components/town/TownLine). Like every other work of the farm, the game is what tired hands have.
 * - **With none on either side it is three presses**, and each board says in plain words what to press:
 *   1. whoever takes the water presses **ready** (nothing is thrown at somebody who is not looking);
 *   2. whoever has it presses **throw**;
 *   3. the water flies to the left or to the right, an arrow shows which, and whoever takes it presses **that
 *      side** before it lands. Caught: handed on, all of it. Not: nothing is, and nothing is lost.
 * - **Tired hands are the ones that find it harder, each side by its own stamina.** Tired hands that throw can do
 *   it only on the bucket's forward swing (the button is lit then; pressed in the dark the hands fumble for a
 *   moment, and nothing worse). Tired hands that take it are shown which way it comes only late in its flight.
 *
 * Pure. No clock is shared: each page counts from what it sees (the throw, from when it is told of it), so what one
 * page hears of the other late only makes it later, never harder.
 */
export const HANDING = {
  /** How long the water is in the air, in seconds. */
  flight: 0.9,
  /** How long before it lands tired hands are shown which way it comes (with stamina: from the moment it flies). */
  late: 0.45,
  /** A press this long after it has landed still counts: for what a screen shows a moment late. */
  grace: 0.05,
  /** Tired hands at the throw: how long the heavy bucket takes to swing back and forth, how long of that it is forward (and can be thrown), and how long a throw tried at the wrong moment leaves the hands of no use. */
  swing: 1.2, forward: 0.5, fumble: 0.6,
  /** How long a board stays up at the most, in seconds: nobody is kept waiting by somebody who went away. */
  limit: 20,
};

/** The side the water flies to: left (−1) or right (1). */
export type Side = -1 | 1;

/** A number in [0, 1) from a seed, and which one of several. */
function draw(seed: number, n: number): number {
  let a = (seed | 0) ^ Math.imul(n + 1, 0x9e3779b1);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Which way this throw flies: by the seed the two pages share, so that neither has to be told. */
export const sideOf = (seed: number): Side => (draw(seed, 0) < 0.5 ? -1 : 1);

/**
 * Whether hands can throw at a moment (seconds since the other was ready). With stamina: always. Tired: only on the
 * bucket's forward swing, which is never at the very first moment (the hands have to wait for it once).
 */
export function canThrow(tired: boolean, seed: number, t: number): boolean {
  if (!tired) return true;
  const from = HANDING.forward + draw(seed, 1) * 0.3, at = (((t + from) % HANDING.swing) + HANDING.swing) % HANDING.swing;
  return t >= 0 && at < HANDING.forward;
}
/** When, after it flies, whoever takes the water is shown which way it comes: at once with stamina, late without. */
export const shownAt = (tired: boolean) => (tired ? HANDING.flight - HANDING.late : 0);
/** Whether a press at a moment (seconds since it flew) is still in time. */
export const inTime = (t: number) => t <= HANDING.flight + HANDING.grace;
/** Whether it is caught: the bucket was put to the side the water came down on (the last side pressed in time; 0: none was). */
export const caught = (side: Side, put: Side | 0) => put === side;

/**
 * What the two pages tell each other (lib/town/room's `pair`: into the other's letterbox, never the room). `m` is
 * the one handing-over it is about, made up by whoever asks. Half a dozen words a go.
 *
 * - `ask`: will you take my water? With whether my hands are tired, and the seed (which way it will fly, and when
 *   tired hands can throw).
 * - `ok`: yes, with whether my hands are tired. A board is up on both pages from then.
 * - `no`: no, and why: something else is open here (`busy`), the map is not being looked at (`away`), no bucket in
 *   the hand (`bare`), or water in it (`full`).
 * - `r`: I am ready to take it.
 * - `th`: it is thrown.
 * - `p`: my bucket is put to that side (only so that the other sees it go there).
 * - `end`: whether it was caught, from the page of whoever takes it.
 * - `bye`: given up.
 */
export type Told =
  | { k: "ask"; m: string; s: boolean; z: number }
  | { k: "ok"; m: string; s: boolean }
  | { k: "no"; m: string; w: "busy" | "away" | "bare" | "full" }
  | { k: "r"; m: string }
  | { k: "th"; m: string }
  | { k: "p"; m: string; d: Side }
  | { k: "end"; m: string; c: boolean }
  | { k: "bye"; m: string };

/** What another browser said, if it is one of those and every part of it is what it should be; null otherwise. */
export function readTold(data: unknown): Told | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>, m = d.m;
  if (typeof m !== "string" || !/^[a-z0-9]{4,16}$/.test(m)) return null;
  switch (d.k) {
    case "ask": return typeof d.s === "boolean" && typeof d.z === "number" && Number.isInteger(d.z) && Math.abs(d.z) <= 2 ** 31 ? { k: "ask", m, s: d.s, z: d.z } : null;
    case "ok": return typeof d.s === "boolean" ? { k: "ok", m, s: d.s } : null;
    case "no": return d.w === "busy" || d.w === "away" || d.w === "bare" || d.w === "full" ? { k: "no", m, w: d.w } : null;
    case "r": return { k: "r", m };
    case "th": return { k: "th", m };
    case "p": return d.d === -1 || d.d === 1 ? { k: "p", m, d: d.d } : null;
    case "end": return typeof d.c === "boolean" ? { k: "end", m, c: d.c } : null;
    case "bye": return { k: "bye", m };
    default: return null;
  }
}
