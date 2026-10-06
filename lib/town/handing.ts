/**
 * Handing water on, as a game for two at once (the owner, 2026-10-06: "ช่วยทำให้มี minigame ตอนส่งน้ำ เป็นแบบเล่นพร้อมกัน
 * ทำให้เล่นยากขึ้นถ้า stamina หมด (เฉพาะฝั่งที่ stamina หมด หรือถ้าหมดสองฝั่งก็ยากทั้งคู่)"). Until then water handed on
 * along a bucket line (lib/town/line) was in the other's bucket at once.
 *
 * **It is one throw, and quick hands.** The first game built was a pouring of a few seconds, followed with a
 * bucket; the owner, the same day: "ต้องทำให้ minigame จบเร็วที่สุด เพราะถ้าช้า ผู้เล่นจะคิดว่า วิ่งส่งเอาเองเร็วกว่า", then "อาจจะ
 * ต้องเร็วกว่านี้ มันจะได้สนุก และลุ้น … เป็นการเน้น reaction เร็วๆ", and "ถ้ายากไป คนจะไม่เล่น และจะเดินส่งคนเดียว". So the
 * water is thrown from the one bucket into the other, in three beats:
 *
 * 1. **The aim** (`aim`): the other's bucket stands somewhere new each time; whoever throws tips their bucket so
 *    far that the water is aimed at it (the further tipped, the further thrown).
 * 2. **The swing** (`swing`): the aim is fixed and the bucket swings. Nothing can be done about the throw now.
 * 3. **The flight** (`flight`): the water is in the air. **Thrown water never comes down just where it was aimed**
 *    (`lurch`: so far off, one way or the other, and which is known to nobody until it flies), so whoever takes it
 *    has to get their bucket under it before it lands. In the bucket's mouth: handed on, all of it (water is
 *    counted in bucketfuls: lib/town/line's `pass`). Beside it: nothing is handed on and nothing is lost; the hands
 *    try again.
 *
 * A second and a third from the first moment to the last, about two from the button. Both have their moment: a
 * throw aimed well leaves the other's bucket a short way to go, one aimed badly a long one, and a bucket is not
 * moved fast. **With stamina it is meant to be easy** (a wide mouth, a short way to go): what it asks is a quick
 * hand, not a sure one.
 *
 * **Tired hands** (no stamina: each side by its own) are heavy and shake: what they hold follows the hand slowly
 * and wanders from it, a sway that can be countered and a quick tremble that cannot (as lib/town/steady's do). The
 * other side's hands are as they were.
 *
 * Pure. Each page works out its own hand and is told the other's (lib/town/room's `pair`). What one page hears of
 * the other a little late is hidden in the swing: the aim is fixed before the water flies, so the page of whoever
 * takes it has where it comes down as it leaves the bucket. That page says whether it was caught: it has its own
 * bucket to the moment.
 */
export const HANDING = {
  /** How long after the other's yes nothing counts yet, in seconds: only until both boards are up. */
  count: 0.3,
  /** From the start, in seconds: how long whoever throws has to aim, how long the swing then takes (the aim fixed through it), and how long the water is in the air. */
  aim: 0.5, swing: 0.2, flight: 0.6,
  /** The tilt (0 to 1) at which water is thrown no way at all, and how much more tilt throws it as far as the other's bucket may stand. */
  lip: 0.15, head: 0.45,
  /** How near the thrower the other's bucket may stand (the ground goes from 0, at the thrower's feet, to 1, where it may stand furthest), half the width of its mouth, and how far water can be thrown at the most. */
  near: 0.15, mouth: 0.17, far: 1.25,
  /** Thrown water never comes down just where it was aimed: how far off, at the least and at the most. */
  lurch: [0.2, 0.3],
  /** Where the other's bucket stands at first: about the middle of the ground, so that water aimed at it comes down on the ground whichever way it goes. */
  stand: [0.45, 0.75],
  /** How fast what is held follows the hand, a second: the bucket tipped, and the bucket held under (a bucket is not moved fast: a throw aimed badly is not caught). */
  follow: { tilt: 3, bucket: 1.8 },
  /** How far past either end a hand may go: against the wandering of tired hands, which carries what they hold back in. */
  spare: 0.4,
  /** Tired hands: how fast theirs follows, how far the sway and the quick tremble carry it, and the two paces of each (turns a second). */
  tired: { follow: { tilt: 1, bucket: 1 }, sway: { tilt: 0.17, bucket: 0.2 }, tremble: { tilt: 0.03, bucket: 0.05 }, slow: [0.45, 0.8], quick: [2.9, 4.3] },
};
/** The moment the water leaves the bucket, and the moment it comes down, in seconds from the start. */
export const thrownAt = () => HANDING.aim + HANDING.swing;
export const landsAt = () => HANDING.aim + HANDING.swing + HANDING.flight;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** What one hand did, as it is told to the other page: moments (seconds from the start) and where its thing was then. Between two it goes straight; after the last it stays. */
export type Track = Array<[number, number]>;
/**
 * One more moment of a track, put where it belongs: what one page tells another comes a few at a time and not always
 * in turn.
 */
export function mark(track: Track, t: number, v: number): void {
  let i = track.length;
  while (i > 0 && track[i - 1][0] > t) i--;
  if (i > 0 && track[i - 1][0] === t) track[i - 1][1] = v; else track.splice(i, 0, [t, v]);
}
/** Where a track's thing was at a moment. */
export function at(track: Track, t: number): number {
  const n = track.length;
  if (!n) return 0;
  if (t >= track[n - 1][0]) return track[n - 1][1];
  // (what is asked for is nearly always near the end)
  for (let i = n - 1; i > 0; i--) {
    const [t0, v0] = track[i - 1];
    if (t >= t0) { const [t1, v1] = track[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  }
  return track[0][1];
}

/** Numbers in [0, 1) from a seed. */
function draws(seed: number, n: number): number[] {
  const out: number[] = [];
  let a = seed | 0;
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}
/**
 * How far tired hands have wandered at a moment, each part from −1 to 1: the sway and the quick tremble. At its own
 * nothing (the moment that counts for that hand: `tip`, `slide`) the sway is near the middle and going fastest, one
 * way or the other: a hand that only goes where the thing should be is carried past, and one that leans against the
 * sway is not.
 */
export function wander(seed: number, t: number): { sway: number; tremble: number } {
  const r = draws(seed, 5), w = (f: number, from: number) => Math.sin(2 * Math.PI * (f * t + from));
  const way = r[0] < 0.5 ? 0 : 0.5, [s1, s2] = HANDING.tired.slow, [q1, q2] = HANDING.tired.quick;
  return { sway: 0.7 * w(s1, way + (r[1] - 0.5) / 12) + 0.3 * w(s2, way + (r[2] - 0.5) / 12), tremble: (w(q1, r[3]) + w(q2, r[4])) / 2 };
}
/** The seed of the taker's wandering, from the one the two were given: so that two tired pairs of hands do not shake alike. */
export const otherSeed = (seed: number) => (seed ^ 0x5bd1e995) | 0;

/** Where water thrown from a bucket tipped so far is aimed (0: it only slops out at the thrower's feet; 1: as far as the other's bucket may stand). */
export const aimOf = (tilt: number) => clamp((tilt - HANDING.lip) / HANDING.head, 0, HANDING.far);
/** The tilt that aims water so far. */
export const tiltFor = (aim: number) => HANDING.lip + HANDING.head * aim;
/** How far from its aim this throw comes down, and which way: by the seed, and known to nobody until it flies. */
export function lurchOf(seed: number): number {
  const [far, way] = draws(seed ^ 0x2545f491, 2), [lo, hi] = HANDING.lurch;
  return (way < 0.5 ? -1 : 1) * (lo + far * (hi - lo));
}
/** Where water aimed so far comes down. (Water that was not thrown at all comes down nowhere a bucket can be.) */
export const landOf = (aim: number, seed: number) => (aim > 0 ? clamp(aim + lurchOf(seed), 0.02, HANDING.far) : 0);
/** Where the other's bucket stands at first, this time. */
export function standOf(seed: number): number {
  const [lo, hi] = HANDING.stand;
  return lo + draws(seed ^ 0x1b873593, 1)[0] * (hi - lo);
}

/**
 * The bucket that is thrown from: the time (seconds from the start, below nothing until both boards are up), where
 * the hand has it (the tilt it would have with no shaking), its tilt, where water thrown now would be aimed, the aim
 * it was thrown with once that is fixed (null until then), whether its hands are tired, and the seed of their
 * wandering.
 */
export interface Tipping { t: number; hand: number; tilt: number; aim: number; thrown: number | null; tired: boolean; seed: number }
export function startTipping(tired: boolean, seed: number): Tipping {
  return { t: -HANDING.count, hand: 0, tilt: 0, aim: 0, thrown: null, tired, seed: seed | 0 };
}
/** So many seconds gone by, the hand wanting the bucket tipped so far (0 to 1). Once the aim is fixed the hand does nothing more. */
export function tip(p: Tipping, want: number, dt: number): Tipping {
  const d = Math.max(0, dt), t = p.t + d;
  if (p.thrown !== null) return { ...p, t };
  const most = (p.tired ? HANDING.tired.follow.tilt : HANDING.follow.tilt) * d;
  const hand = p.hand + clamp(clamp(want, -HANDING.spare, 1 + HANDING.spare) - p.hand, -most, most);
  // (tired hands sway fastest just as the aim is fixed: what counts is to be against it at that moment)
  const w = p.tired ? wander(p.seed, t - HANDING.aim) : null;
  const tilt = clamp(hand + (w ? HANDING.tired.sway.tilt * w.sway + HANDING.tired.tremble.tilt * w.tremble : 0), 0, 1), aim = aimOf(tilt);
  return { ...p, t, hand, tilt, aim, thrown: t >= HANDING.aim ? aim : null };
}

/** The bucket held under: the time, where the hand has it, where it is (along the ground), whether its hands are tired, and the seed of their wandering. */
export interface Holding { t: number; hand: number; x: number; tired: boolean; seed: number }
/** It stands where this handing-over has it stand at first (`standOf`, by the seed the two share). */
export function startHolding(tired: boolean, seed: number, place: number): Holding {
  const x = clamp(place, HANDING.near, 1);
  return { t: -HANDING.count, hand: x, x, tired, seed: seed | 0 };
}
/** So many seconds gone by, the hand wanting the bucket so far along the ground. */
export function slide(h: Holding, want: number, dt: number): Holding {
  const d = Math.max(0, dt), t = h.t + d, most = (h.tired ? HANDING.tired.follow.bucket : HANDING.follow.bucket) * d;
  const hand = h.hand + clamp(clamp(want, HANDING.near - HANDING.spare, 1 + HANDING.spare) - h.hand, -most, most);
  // (and theirs just as the water comes down)
  const w = h.tired ? wander(h.seed, t - landsAt()) : null;
  return { ...h, t, hand, x: clamp(hand + (w ? HANDING.tired.sway.bucket * w.sway + HANDING.tired.tremble.bucket * w.tremble : 0), HANDING.near, 1) };
}

/** Whether water that comes down so far along the ground comes down into a bucket that stands there. */
export const inMouth = (landing: number, bucket: number) => landing > 0 && Math.abs(landing - bucket) <= HANDING.mouth;

/**
 * What the two pages tell each other (lib/town/room's `pair`: into the other's letterbox, never the room). `m` is
 * the one handing-over it is about, made up by whoever asks.
 *
 * - `ask`: will you take my water? With whether my hands are tired, and the seed (of where the bucket stands, how
 *   the throw lurches, and how tired hands wander).
 * - `ok`: yes, with whether my hands are tired. **It begins a count from that word** (`HANDING.count`): whoever
 *   answers counts from sending it, whoever asked from hearing it, less half of how long the answer took to come
 *   (the way there and the way back are taken to be as long). No clock of anybody's is compared with another's.
 * - `no`: no, and why: something else is open here (`busy`), the map is not being looked at (`away`), no bucket in
 *   the hand (`bare`), or water in it (`full`).
 * - `g`, a few times a second from whoever throws: the moment, where the water is aimed, the tilt; with `e`, that
 *   is the aim it is thrown with, fixed.
 * - `t`, the same from whoever takes: the moment, and where the bucket stands.
 * - `end`: whether it came down into the bucket, from the page that has the bucket.
 * - `bye`: given up.
 */
export type Told =
  | { k: "ask"; m: string; s: boolean; z: number }
  | { k: "ok"; m: string; s: boolean }
  | { k: "no"; m: string; w: "busy" | "away" | "bare" | "full" }
  | { k: "g"; m: string; t: number; q: number; a: number; e?: boolean }
  | { k: "t"; m: string; t: number; b: number }
  | { k: "end"; m: string; c: boolean }
  | { k: "bye"; m: string };

/** What another browser said, if it is one of those and every part of it is what it should be; null otherwise. */
export function readTold(data: unknown): Told | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>, m = d.m;
  if (typeof m !== "string" || !/^[a-z0-9]{4,16}$/.test(m)) return null;
  const num = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  const moment = (v: unknown): v is number => num(v, -HANDING.count - 1, landsAt() + 5);
  switch (d.k) {
    case "ask": return typeof d.s === "boolean" && num(d.z, -(2 ** 31), 2 ** 31) && Number.isInteger(d.z) ? { k: "ask", m, s: d.s, z: d.z } : null;
    case "ok": return typeof d.s === "boolean" ? { k: "ok", m, s: d.s } : null;
    case "no": return d.w === "busy" || d.w === "away" || d.w === "bare" || d.w === "full" ? { k: "no", m, w: d.w } : null;
    case "g": return moment(d.t) && num(d.q, 0, HANDING.far) && num(d.a, 0, 1) ? { k: "g", m, t: d.t, q: d.q, a: d.a, ...(d.e === true ? { e: true } : {}) } : null;
    case "t": return moment(d.t) && num(d.b, HANDING.near, 1) ? { k: "t", m, t: d.t, b: d.b } : null;
    case "end": return typeof d.c === "boolean" ? { k: "end", m, c: d.c } : null;
    case "bye": return { k: "bye", m };
    default: return null;
  }
}
