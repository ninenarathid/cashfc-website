import { eyes } from "./forest-eye";
/**
 * Digging something up, as a game of its own: how what is buried in the forest is got out (lib/town/forest; the
 * owner, 2026-10-05: "การหาของป่าต้องเล่น minigame ด้วย").
 *
 * A mound seen close, a few places across and down, each under some earth: a little, more, or a lot, which shows
 * in how dark it is. Something lies under a run of them, and only its top shows: which way the rest of it runs is
 * for the hoe to find. Each stroke takes a layer of earth off one place. A place of the thing laid bare is a part
 * of it got out; a stroke on a part already bare bruises it; a stroke on a place where nothing lies is a stroke
 * gone, and there are only so many. It ends when the whole thing is bare, or the strokes are spent: whatever is
 * still under earth then stays there.
 *
 * So it is a game of care, not of speed: look how deep, count the strokes, and stop. With no stamina left the earth
 * is all one colour (how deep is felt, not seen) and there is not a stroke to spare.
 *
 * What it gives back is what every game gives (hits, misses, how long): the parts got out, and those bruised or
 * left behind.
 *
 * Pure: the mound is worked out from a seed.
 */
export const DIGGING = {
  /** The mound: places across and down. */
  cols: 4, rows: 3,
  /** How many layers of earth a place may have, least and most. */
  deep: [1, 3] as [number, number],
  /** How many strokes there are beyond what the thing itself takes, with stamina and with none left. */
  spare: 4, tiredSpare: 1,
};

/** A place of the mound: the layers of earth left on it, whether the thing lies under it, and whether it is its top (the one part that shows from the start). */
export interface Clod { earth: number; over: boolean; top: boolean }
/**
 * A mound as it stands: how many parts the thing is in, those laid bare and those bruised so far, the strokes left,
 * every place (row by row), and whether how deep each is can be seen. `gentle`: it is a truffle piglet that digs
 * (lib/town/gifts' famPiglet): a snout bruises nothing, so a stroke on a part already bare is only a stroke gone.
 */
export interface Dig { need: number; hits: number; misses: number; strokes: number; cells: Clod[]; seen: boolean; gentle?: boolean }
/** How a mound is dug, where it is not as for anybody: by a piglet's snout (`gentle`). */
export interface DigHow { gentle?: boolean }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Begin a mound with something in so many parts under it (two at the least: one would have nothing to find). */
export function startDig(parts: number, spent: boolean, seed: number, eye: boolean | number = false, how: DigHow = {}): Dig {
  const { cols, rows } = DIGGING, need = Math.max(2, Math.min(cols, Math.floor(parts) + 1));
  let s = seed | 0;
  const next = () => { const [r, s1] = draw(s); s = s1; return r; };
  // the thing lies in a run, across or down, somewhere it fits
  const across = need > rows || next() < 0.6;
  const x0 = Math.floor(next() * (across ? cols - need + 1 : cols)), y0 = Math.floor(next() * (across ? rows : rows - need + 1));
  const run = Array.from({ length: need }, (_, i) => (across ? y0 * cols + x0 + i : (y0 + i) * cols + x0));
  // (its top is an end of the run, so that the rest lies one way or the other of it)
  const top = run[next() < 0.5 ? 0 : need - 1];
  const [least, most] = DIGGING.deep;
  const cells = Array.from({ length: cols * rows }, (_, i): Clod => ({ earth: least + Math.floor(next() * (most - least + 1)), over: run.includes(i), top: i === top }));
  const needed = run.reduce((t, i) => t + cells[i].earth, 0);
  // (under the fountain's forest eye, a stroke more to spare)
  return { need, hits: 0, misses: 0, strokes: needed + (spent ? DIGGING.tiredSpare : DIGGING.spare) + eyes(eye), cells, seen: !spent, ...(how.gentle ? { gentle: true } : {}) };
}

/** Whether the digging is over: the whole thing bare, or no stroke left. */
export const dug = (d: Dig) => d.hits >= d.need || d.strokes <= 0;
/** How it came out, once it is over: the parts got out whole, and those bruised or left under the earth. */
export const dugUp = (d: Dig) => ({ hits: Math.max(0, d.hits - d.misses), misses: d.misses + (d.need - d.hits) });

/** A stroke of the hoe on a place: a layer of its earth off; a part of the thing laid bare; or, on a part already bare, a bruise. */
export function strike(d: Dig, place: number): Dig {
  const c = d.cells[place];
  if (dug(d) || !c) return d;
  if (c.earth <= 0) return c.over && !d.gentle ? { ...d, strokes: d.strokes - 1, misses: d.misses + 1 } : { ...d, strokes: d.strokes - 1 };
  const cells = d.cells.map((x, i) => (i === place ? { ...x, earth: x.earth - 1 } : x));
  return { ...d, strokes: d.strokes - 1, cells, hits: d.hits + (c.over && c.earth === 1 ? 1 : 0) };
}
