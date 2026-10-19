import type { Play } from "./animals";

/**
 * The pasture's three games, as rules the page plays by (components/town/TownAnimalGames draws them), each its own
 * play: milking to the cow's chewing beat, catching the coop's eggs, tracing the fleece's swirl. Each reports
 * `Play { hits, misses, secs }` (the coop's eggs `cracked` too) to the keeper's `collect`, which decides what it gives
 * (lib/town/animals' unitsOf): failing gives less, never none.
 *
 * Sized for the members' measured hands (docs/plans/animals/README.md; the town's own play logs): a surprise is
 * answered in about 450 ms, a press at a mark seen coming lands about 54 ms off, and 87-91 taps in 100 go where they
 * were meant. So a regular member, fed, does well most of the time; tired (no stamina) the windows narrow, and it is
 * harder but never refused. The pasture's harp (rank 8) doubles the windows for those it was played for (no more is
 * given for it: only the play is easier).
 */
export interface Ease { tired: boolean; harp: boolean }
const widen = (w: number, e: Ease) => w * (e.tired ? 0.62 : 1) * (e.harp ? 2 : 1);

/* ── milking: the hand-pump milker's two handles, alternated to the cow's chewing beat ── */
export const MILK = {
  /** The cow chews once every so often (ms); so many chews a go. */
  beat: 720, beats: 16,
  /** A press counts within so many ms either side of a chew (fed, before the harp). */
  window: 170,
  /** The pressure needle: what a press out of time adds (0..1), what each beat lets out, and where the cow shifts. */
  push: 0.34, ease: 0.12, shift: 1,
  /** How long the cow stands shifted, its chews not to be pumped. */
  shiftMs: 1300,
} as const;
export const milkWindow = (e: Ease) => widen(MILK.window, e);
export interface MilkState { next: number; side: "L" | "R"; hits: number; misses: number; pressure: number; shiftedUntil: number; pressed: Set<number>; started: number }
export const milkStart = (now: number): MilkState => ({ next: 0, side: "L", hits: 0, misses: 0, pressure: 0, shiftedUntil: 0, pressed: new Set(), started: now });
/** When chew `n` of a go comes (the first after a short count in). */
export const chewAt = (s: Pick<MilkState, "started">, n: number) => s.started + 1500 + n * MILK.beat;
/**
 * A press of one handle at a moment: in time with a chew not yet pumped and the right handle (they alternate), a hit;
 * the wrong handle at a chew, a miss; out of every chew's window, the needle rises (too fast), and the cow shifts at
 * the top of it (a miss, and a pause). Returns what the press came to, for the board to show.
 */
export function milkPress(s: MilkState, side: "L" | "R", now: number, e: Ease): "hit" | "wrong" | "fast" | "shift" | "still" {
  if (now < s.shiftedUntil) return "still";
  const w = milkWindow(e), n = Math.round((now - chewAt(s, 0)) / MILK.beat);
  const near = n >= 0 && n < MILK.beats && Math.abs(now - chewAt(s, n)) <= w && !s.pressed.has(n);
  if (near) {
    s.pressed.add(n);
    // (the handles go by the chews, left on the first and every other: a wrong one is that chew lost, and the next is as it was)
    s.side = n % 2 ? "L" : "R";
    if (side !== (n % 2 ? "R" : "L")) { s.misses++; return "wrong"; }
    s.hits++; s.pressure = Math.max(0, s.pressure - MILK.ease); return "hit";
  }
  s.pressure += MILK.push;
  if (s.pressure >= MILK.shift) { s.pressure = 0.25; s.misses++; s.shiftedUntil = now + MILK.shiftMs; return "shift"; }
  return "fast";
}
/** The handle the chew to come takes. */
export const handleOf = (n: number): "L" | "R" => (n % 2 ? "R" : "L");
/** Chews gone by unpumped are misses; returns whether the go is over (every chew has come and gone). */
export function milkTick(s: MilkState, now: number, e: Ease): boolean {
  const w = milkWindow(e);
  for (let n = 0; n < MILK.beats; n++) if (!s.pressed.has(n) && now > chewAt(s, n) + w) { s.pressed.add(n); s.misses++; s.side = handleOf(n + 1); }
  s.pressure = Math.max(0, s.pressure - (MILK.ease / 40));
  return now > chewAt(s, MILK.beats - 1) + w;
}
export const milkPlay = (s: MilkState, now: number): Play => ({ hits: s.hits, misses: s.misses, secs: Math.round((now - s.started) / 100) / 10 });

/* ── the coop's eggs: a padded basket slid under eggs rolling out of the nest boxes ── */
export const EGGS = {
  /** The nest boxes along the top, in lanes across the board (0..1 of its width). */
  boxes: 5,
  /** How long an egg takes to fall from its box's lip to the basket (fed), and how long one waits in its box before it rolls out by itself. */
  fall: 950, wait: [1600, 3400] as const,
  /** The basket's width, a share of the board's (fed, before the harp): an egg landing in it is caught. */
  basket: 0.2,
} as const;
export const basketWidth = (e: Ease) => Math.min(0.5, widen(EGGS.basket, e));
export const fallMs = (e: Ease) => EGGS.fall * (e.tired ? 0.78 : 1) * (e.harp ? 1.25 : 1);
/** Where box `i` is across the board (its middle, 0..1). */
export const boxAt = (i: number) => (i + 0.5) / EGGS.boxes;
export interface Egg { box: number; out: number | null; landed: boolean; caught: boolean }
/** A go's eggs: one for each round banked, each in a box of its own (by a seed), rolling out by itself after a wait unless tapped out first. */
export function eggsStart(n: number, seed: number, now: number): { eggs: Egg[]; due: number[]; started: number } {
  const order = Array.from({ length: EGGS.boxes }, (_, i) => i).sort((a, b) => ((a * 7 + seed) % 11) - ((b * 7 + seed) % 11));
  const eggs = Array.from({ length: Math.max(1, Math.min(EGGS.boxes, n)) }, (_, i) => ({ box: order[i], out: null, landed: false, caught: false }));
  return { eggs, due: eggs.map((_, i) => now + 900 + EGGS.wait[0] + ((seed >> i) % 7) * ((EGGS.wait[1] - EGGS.wait[0]) / 6) + i * 700), started: now };
}
/** Whether an egg landing now is in the basket (its middle at `at`, 0..1). */
export const caughtBy = (box: number, at: number, e: Ease) => Math.abs(boxAt(box) - at) <= basketWidth(e) / 2;
export const eggsPlay = (eggs: Egg[], started: number, now: number): Play & { cracked: number } => {
  const hits = eggs.filter((x) => x.caught).length, cracked = eggs.filter((x) => x.landed && !x.caught).length;
  return { hits, misses: cracked, secs: Math.round((now - started) / 100) / 10, cracked };
};

/* ── shearing: the fleece's swirl traced with the shears ── */
export const SHEAR = {
  /** The swirl, in the board's own units (a 320 by 240 board): its middle, how far out it starts and ends, and how many turns. */
  cx: 160, cy: 128, from: 96, to: 16, turns: 2.25, marks: 44,
  /** How near the line the shears must keep (fed, before the harp), in the board's units. */
  near: 21,
  /** How fast the shears go at the most (units a second): a fleece is sheared, not swiped. */
  speed: 110,
} as const;
export const shearNear = (e: Ease) => widen(SHEAR.near, e);
/** The swirl's marks, from the outside in. */
export const SWIRL: ReadonlyArray<{ x: number; y: number }> = Array.from({ length: SHEAR.marks }, (_, i) => {
  const t = i / (SHEAR.marks - 1), a = t * SHEAR.turns * Math.PI * 2 - Math.PI / 2, r = SHEAR.from + (SHEAR.to - SHEAR.from) * t;
  return { x: SHEAR.cx + Math.cos(a) * r * 1.15, y: SHEAR.cy + Math.sin(a) * r * 0.8 };
});
export interface ShearState { at: number; off: boolean; hits: number; misses: number; started: number | null }
export const shearStart = (): ShearState => ({ at: 0, off: false, hits: 0, misses: 0, started: null });
/** The shears at a point: the next mark reached within reach is a hit; going off the line is a nick (once a time it is left). Returns whether the swirl is done. */
export function shearMove(s: ShearState, p: { x: number; y: number }, now: number, e: Ease): boolean {
  if (s.at >= SWIRL.length) return true;
  s.started ??= now;
  const near = shearNear(e), d = (q: { x: number; y: number }) => Math.hypot(q.x - p.x, q.y - p.y);
  // the nearest part of the line from the last mark reached to the next three
  let best = Infinity;
  for (let i = Math.max(0, s.at - 1); i < Math.min(SWIRL.length - 1, s.at + 3); i++) best = Math.min(best, segDist(p, SWIRL[i], SWIRL[i + 1]));
  if (best > near * 1.25) { if (!s.off) { s.off = true; s.misses++; } } else s.off = false;
  while (s.at < SWIRL.length && d(SWIRL[s.at]) <= near) { s.at++; s.hits++; }
  return s.at >= SWIRL.length;
}
function segDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l));
  return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
}
/** Marks never reached count against the fleece too (a go stopped halfway is half a fleece). */
export const shearPlay = (s: ShearState, now: number): Play => ({ hits: s.hits, misses: s.misses + (SWIRL.length - s.at), secs: Math.round((now - (s.started ?? now)) / 100) / 10 });
