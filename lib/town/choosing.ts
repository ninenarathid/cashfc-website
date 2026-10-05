import { FOREST_EYE } from "./forest-eye";
/**
 * Choosing what to take, as a game of its own: how mushrooms, herbs and berries are gathered in the forest
 * (lib/town/forest; the owner, 2026-10-05: "การหาของป่าต้องเล่น minigame ด้วย", and the day before, of the games there
 * were: "ช่วยทำให้แต่ละ mini game แตกต่างกันด้วย").
 *
 * A patch seen close, a few places across and down. In some stands the thing that is wanted, in others something
 * that only looks like it: the same shape, a little off in its colour. Nothing says which is which, and nothing
 * hurries: it is a game for the eyes, and for whoever has been told what to look for. A good one touched is taken;
 * a look-alike touched is taken too, and is what it is (among mushrooms, a toadstool in the bag; among anything
 * else, one fewer of the thing). It is done when every good one is taken.
 *
 * With stamina the patch can be looked at for as long as one likes. With none, it is seen clearly only for a moment
 * and then goes dim, all of it alike: what was where has to be kept in mind.
 *
 * What it gives back is what every game gives (hits, misses, how long), with the look-alikes taken as its misses.
 *
 * Pure: the patch is worked out from a seed.
 */
export const CHOOSING = {
  /** The patch: places across and down. */
  cols: 3, rows: 2,
  /** How many look-alikes stand among the good ones, with stamina and with none left. */
  fakes: 2, tiredFakes: 3,
  /** With no stamina left: the seconds the patch is seen clearly before it goes dim. */
  peek: 1.4,
};

/** What stands in a place of the patch: a good one or a look-alike, which way it is turned, and whether it has been taken. */
export interface Plant { good: boolean; look: number; taken: boolean }
/** A patch as it stands: how many good ones there are to take, those taken and the look-alikes taken so far, what stands in each place (row by row), and after how many seconds it goes dim (never, when null). */
export interface Bunch { need: number; hits: number; wrong: number; cells: Array<Plant | null>; dim: number | null }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Begin a patch with so many good ones in it. */
export function startBunch(need: number, spent: boolean, seed: number, eye = false): Bunch {
  const places = CHOOSING.cols * CHOOSING.rows, good = Math.max(1, Math.min(places - 1, Math.floor(need)));
  // (under the fountain's forest eye, one look-alike fewer: never none)
  const fakes = Math.max(1, Math.min(places - good, spent ? CHOOSING.tiredFakes : CHOOSING.fakes) - (eye ? FOREST_EYE : 0));
  let s = seed | 0;
  const things: Array<Plant | null> = [];
  for (let i = 0; i < good + fakes; i++) { const [r, s1] = draw(s); s = s1; things.push({ good: i < good, look: Math.floor(r * 1000), taken: false }); }
  while (things.length < places) things.push(null);
  for (let i = things.length - 1; i > 0; i--) {
    const [r, s1] = draw(s);
    s = s1;
    const j = Math.floor(r * (i + 1));
    [things[i], things[j]] = [things[j], things[i]];
  }
  return { need: good, hits: 0, wrong: 0, cells: things, dim: spent ? CHOOSING.peek : null };
}

/** Whether every good one has been taken. */
export const chosen = (b: Bunch) => b.hits >= b.need;
/** Whether the patch has gone dim by a moment (seconds since it began). */
export const dimmed = (b: Bunch, t: number) => b.dim !== null && t >= b.dim;

/** A place touched: what stands there is taken, a good one or a look-alike; bare ground, or what is gone already, is nothing. */
export function takeAt(b: Bunch, place: number): Bunch {
  const c = b.cells[place];
  if (chosen(b) || !c || c.taken) return b;
  const cells = b.cells.map((x, i) => (i === place && x ? { ...x, taken: true } : x));
  return c.good ? { ...b, hits: b.hits + 1, cells } : { ...b, wrong: b.wrong + 1, cells };
}
