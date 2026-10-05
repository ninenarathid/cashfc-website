import { FOREST_EYE } from "./forest-eye";
/**
 * Shaking a tree and catching what falls, as a game of its own: how what hangs in the forest's trees is gathered
 * (lib/town/forest; the owner, 2026-10-05: "การหาของป่าต้องเล่น minigame ด้วย").
 *
 * The tree seen from below its crown, a few lanes across. It is shaken, and its fruit comes down one after another,
 * each in a lane of its own, each seen falling the whole way. The basket is held under one lane at a time and is
 * moved by the hand: what lands in it is caught, what lands beside it is lost. A few more fall than are wanted, so
 * one let go is no harm.
 *
 * With no stamina left the fruit falls faster and closer together, and nothing falls that is not wanted: every one
 * missed is one fewer.
 *
 * What it gives back is what every game gives (hits, misses, how long): the fruit caught, up to what the tree had,
 * and what of that was let fall.
 *
 * Pure: what falls where and when is worked out from a seed.
 */
export const CATCHING = {
  /** The lanes fruit falls in. */
  lanes: 5,
  /** How many more fall than are wanted, with stamina and with none left. */
  spare: 2, tiredSpare: 0,
  /** The seconds a fruit takes to fall, and between one landing and the next, with stamina and with none left; and before the first is let go. */
  fall: 1.5, tiredFall: 0.95, gap: 1.1, tiredGap: 0.7, lead: 0.6,
};

/** One fruit: the lane it falls in, the moment it lands (seconds since the shaking began), and whether it was caught (null while it has not landed). */
export interface Drop { lane: number; lands: number; caught: boolean | null }
/** A shaking as it stands: how many are wanted, every fruit that falls, in the order it lands, and how long each takes to fall. */
export interface Shower { need: number; drops: Drop[]; fall: number }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Begin a shaking with so many wanted. */
export function startShower(need: number, spent: boolean, seed: number, eye = false): Shower {
  // (under the fountain's forest eye, one more falls than is wanted)
  const want = Math.max(1, Math.floor(need)), n = want + (spent ? CATCHING.tiredSpare : CATCHING.spare) + (eye ? FOREST_EYE : 0);
  const fall = spent ? CATCHING.tiredFall : CATCHING.fall, gap = spent ? CATCHING.tiredGap : CATCHING.gap;
  let s = seed | 0, last = -1;
  const drops: Drop[] = [];
  for (let i = 0; i < n; i++) {
    // never twice running in the same lane: the basket has to be moved for each
    let lane = last;
    while (lane === last) { const [r, s1] = draw(s); s = s1; lane = Math.floor(r * CATCHING.lanes); }
    last = lane;
    drops.push({ lane, lands: CATCHING.lead + fall + i * gap, caught: null });
  }
  return { need: want, drops, fall };
}

/** How far down a fruit is at a moment, from 0 (in the crown, not let go yet) to 1 (landed). */
export const fallen = (sh: Shower, d: Drop, t: number) => Math.max(0, Math.min(1, 1 - (d.lands - t) / sh.fall));
/** The shaking at a moment, with the basket under a lane: whatever has landed by now and was not settled is caught if the basket was under it, lost if not. */
export function showerAt(sh: Shower, t: number, basket: number): Shower {
  if (!sh.drops.some((d) => d.caught === null && t >= d.lands)) return sh;
  return { ...sh, drops: sh.drops.map((d) => (d.caught === null && t >= d.lands ? { ...d, caught: d.lane === basket } : d)) };
}
/** Whether everything has landed. */
export const fell = (sh: Shower) => sh.drops.every((d) => d.caught !== null);
/** How it came out: the fruit caught, never more than were wanted, and what of the wanted was let fall. */
export function caught(sh: Shower): { hits: number; misses: number } {
  const hits = Math.min(sh.need, sh.drops.filter((d) => d.caught).length);
  return { hits, misses: sh.need - hits };
}
