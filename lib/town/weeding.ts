import { TIMING, type TimingMods } from "./timing";

/**
 * Pulling weeds, as a game of its own (the owner, 2026-10-04: "ช่วยทำให้แต่ละ mini game แตกต่างกันด้วย การกดตามจังหว่ะ ดูจะ
 * มีเยอะไปหน่อย มีไอเดียทำ minigame อื่นให้สอดคล้องกับ action ที่ทำไหม"). Clearing a plot was the game of timing, like
 * tilling it, stirring a pot and everything tired hands did: now it is what the hands do.
 *
 * A patch of ground seen close, a few places across and down. In some stand weeds, in some stones, the rest are
 * bare. A weed that is touched is pulled; a stone or bare ground touched is a miss (the hoe rings on it). So many
 * weeds pulled and the plot is cleared. Every little while the wind goes through the patch and what stands in it
 * changes places: with stamina, slowly enough to be no trouble to somebody who looks before touching; with none,
 * quickly, with more stones among the weeds, and the work is dropped at the third miss like the hoe's
 * (lib/town/timing). A better hoe gives longer between the gusts.
 *
 * How hard: with stamina a plot is always cleared, and a hand that looks before it touches hardly misses (an unsure
 * one, a miss every other plot). With none, of made-up hands that take a while to find and touch a weed: an unsure
 * one clears a plot one go in five, a practised one five in six, a very good one always. (The hoe's own tired
 * round, which this takes the place of, was one in ten, two in five, six in seven: these numbers are a first guess,
 * to be set by how it plays.)
 *
 * What it gives back is what the game of timing gave (hits, misses, how long), so the plot, the stamina a miss
 * costs and what the database is told are as they were.
 *
 * Pure: the patch is worked out from a seed and the time.
 */
export const WEEDING = {
  /** The patch: places across and down. */
  cols: 4, rows: 2,
  /** Stones among the weeds, with stamina and with none left. */
  stones: 2, tiredStones: 4,
  /** Seconds between gusts, with stamina and with none left; and how long before a gust the patch stirs, to be seen coming (with none, hardly). */
  gust: 2.4, tiredGust: 0.6, stir: 0.3, tiredStir: 0.15,
};

/** What stands in a place of the patch: a weed or a stone, which of its looks it has, and which of the patch's things it is (the same one wherever the wind puts it). */
export interface Tuft { kind: "weed" | "stone"; look: number; id: number }
/**
 * A patch as it stands: how many weeds are still wanted, the weeds pulled and the misses so far, how many misses end
 * it (none, when it cannot be lost), what stands in each place (row by row), when the wind last went through it
 * (seconds since it began), how long between gusts, how long before one the patch stirs, and the seed of what comes next.
 */
export interface Patch { need: number; hits: number; misses: number; most: number; cells: Array<Tuft | null>; since: number; every: number; warn: number; seed: number }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
/** The same things in other places: never all where they were, when there is anywhere else for them to be. */
function scatter(cells: Array<Tuft | null>, seed: number): [Array<Tuft | null>, number] {
  let s = seed, out = cells;
  for (let tries = 0; tries < 4; tries++) {
    const next = [...cells];
    for (let i = next.length - 1; i > 0; i--) {
      const [r, s1] = draw(s);
      s = s1;
      const j = Math.floor(r * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    out = next;
    if (next.some((c, i) => (c?.kind ?? null) !== (cells[i]?.kind ?? null))) break;
  }
  return [out, s];
}

/** Begin a patch with so many weeds to pull. */
export function startPatch(need: number, mods: TimingMods, seed: number): Patch {
  const places = WEEDING.cols * WEEDING.rows, weeds = Math.max(1, Math.min(places - 1, Math.floor(need)));
  const stones = Math.min(places - weeds - 1, mods.spent ? WEEDING.tiredStones : WEEDING.stones);
  let s = seed | 0;
  const things: Array<Tuft | null> = [];
  for (let i = 0; i < weeds; i++) { const [r, s1] = draw(s); s = s1; things.push({ kind: "weed", look: Math.floor(r * 1000), id: i }); }
  for (let i = 0; i < stones; i++) { const [r, s1] = draw(s); s = s1; things.push({ kind: "stone", look: Math.floor(r * 1000), id: weeds + i }); }
  while (things.length < places) things.push(null);
  const [cells, next] = scatter(things, s);
  return {
    need: weeds, hits: 0, misses: 0, most: mods.spent && mods.drops ? TIMING.spent.misses : 0, cells, since: 0,
    every: (mods.spent ? WEEDING.tiredGust : WEEDING.gust) * Math.sqrt(mods.tool ?? 1) * (mods.buff ?? 1), warn: mods.spent ? WEEDING.tiredStir : WEEDING.stir, seed: next,
  };
}

/** Whether the patch's work is done. */
export const cleared = (p: Patch) => p.hits >= p.need;
/** Whether the work was dropped: as many misses as tired hands have in them, before it was done. */
export const dropped = (p: Patch) => p.most > 0 && p.misses >= p.most && !cleared(p);
/** Whether the patch is stirring at a moment: a gust is about to go through it. */
export const stirring = (p: Patch, t: number) => !cleared(p) && !dropped(p) && t - p.since >= p.every - p.warn;

/** The patch at a moment (seconds since it began): the wind has gone through it as often as it was due. */
export function patchAt(p: Patch, t: number): Patch {
  if (cleared(p) || dropped(p)) return p;
  let out = p;
  while (t - out.since >= out.every) {
    const [cells, seed] = scatter(out.cells, out.seed);
    out = { ...out, cells, seed, since: out.since + out.every };
  }
  return out;
}

/** A place touched at a moment: a weed there is pulled; a stone, or bare ground, is a miss. */
export function touch(p: Patch, t: number, place: number): Patch {
  const now = patchAt(p, t);
  if (cleared(now) || dropped(now) || place < 0 || place >= now.cells.length) return now;
  if (now.cells[place]?.kind !== "weed") return { ...now, misses: now.misses + 1 };
  return { ...now, hits: now.hits + 1, cells: now.cells.map((c, i) => (i === place ? null : c)) };
}
