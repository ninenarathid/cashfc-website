import { STAMINA } from "./stamina";

/**
 * A small game of timing, for work done by hand (the owner, 2026-10-03:
 * "มินิเกมทุกอย่างอยากให้ทำให้ยากระดับหนึ่ง", and for washing a pot "มินิเกมล้างให้เล่น
 * ด้วย เล็กๆน้อยๆ"): a marker runs to and fro along a bar, and the button is
 * pressed while it is over the lit stretch. So many hits finish the work; a
 * miss costs a little and the work goes on. After each hit the stretch moves
 * somewhere else and the marker runs a little faster.
 *
 * Hoeing a plot, stirring a pot and scrubbing one are all this game, each with
 * its own numbers; a better tool widens the stretch, and with no stamina left
 * it is narrower and the marker quicker ("ถ้า stamina หมด mini game ทุกอย่างจะยาก
 * ขึ้นมากด้วย"), and the farm's work is dropped at the third miss. The farm's
 * lighter work (sowing, watering, picking) is this game too then, a short
 * round of it (lib/town/farm); the pot's stirring is kinder than the rest at
 * any time (lib/town/cooking).
 *
 * Pure: where the marker is and where the stretch lies are worked out from the
 * time and a seed.
 */
export const TIMING = {
  /** The stretch's width as a share of the bar, and the marker's runs along the bar a second, to begin with. */
  zone: 0.17, speed: 0.9,
  /** How much faster the marker runs after each hit, and the fastest it gets. */
  quicken: 1.1, fastest: 2.2,
  /** How near the bar's ends the stretch may lie. */
  edge: 0.04,
  /**
   * With no stamina left: how much of the stretch is left and how much faster the marker runs (the fight's own
   * numbers), and how many misses tired hands have in them before the work is dropped (for work that asks it:
   * `drops`).
   *
   * About three times as hard as it first was (the owner, 2026-10-04: "เมื่อ stamina หมด minigame จะยากขึ้นกว่านี้อีก
   * สามเท่า แต่ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก"). At first the marker was over the stretch for 87
   * thousandths of a second, and a miss with no stamina cost nothing, so that no plot was ever left unhoed: on the
   * game's first day the members hoed 279 plots with none and 129 with some. Now it is over it for 47, and the hoe
   * is dropped at the third miss. Of made-up players, one whose presses are as unsure as the members' were (0.07 s
   * either way) hoes a plot one go in ten, a practised one (0.035) two in five, a very good one (0.02) six in seven.
   */
  spent: { zone: STAMINA.spent.band, speed: STAMINA.spent.pace, misses: 3 },
};

/**
 * What makes a round easier or harder: a better tool (how many times as wide the stretch), no stamina left, and
 * whether, with none left, the work is dropped after a few misses (the farm's: a miss of it costs nothing else then;
 * a pot goes on being stirred, and loses a helping for each). And, for work that is kinder than the rest (the pot's
 * stirring): how many times as wide its stretch is at any time (`wide`), and what having no stamina does to it, in
 * place of what it does to the rest (`tired`: how much of the stretch is left, how much faster the marker runs).
 */
export interface TimingMods { tool?: number; spent?: boolean; drops?: boolean; wide?: number; tired?: { zone: number; speed: number } }
/** A round as it stands: how many hits are still wanted, the hits and misses so far, how many misses end it (none, when it cannot be lost), how fast the marker runs, where it was and which way it ran when it last changed pace, and where the stretch lies. */
export interface Round { need: number; hits: number; misses: number; most: number; speed: number; from: number; way: 1 | -1; since: number; lo: number; width: number; seed: number }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Begin a round wanting so many hits. */
export function startRound(need: number, mods: TimingMods, seed: number): Round {
  const tired = mods.spent ? mods.tired ?? TIMING.spent : null;
  const width = Math.min(0.5, TIMING.zone * (mods.wide ?? 1) * Math.sqrt(mods.tool ?? 1) * (tired ? tired.zone : 1));
  const [r, next] = draw(seed | 0);
  return {
    need: Math.max(1, Math.floor(need)), hits: 0, misses: 0, most: mods.spent && mods.drops ? TIMING.spent.misses : 0,
    speed: TIMING.speed * (tired ? tired.speed : 1),
    from: 0, way: 1, since: 0, lo: TIMING.edge + r * (1 - 2 * TIMING.edge - width), width, seed: next,
  };
}

/** Where the marker is along the bar (0 to 1) at a moment (seconds since the round began), and which way it is running: to one end, back to the other, and so on. */
function running(r: Round, t: number): { at: number; way: 1 | -1 } {
  // the bar unfolded: up it from 0 to 1, then down it from 1 to 2, and round again
  const u = (r.way === 1 ? r.from : 2 - r.from) + Math.max(0, t - r.since) * r.speed, m = ((u % 2) + 2) % 2;
  return m <= 1 ? { at: m, way: 1 } : { at: 2 - m, way: -1 };
}
export const markerAt = (r: Round, t: number) => running(r, t).at;
/** Whether the marker is over the stretch at a moment. */
export const over = (r: Round, t: number) => { const m = markerAt(r, t); return m >= r.lo && m <= r.lo + r.width; };
/** Whether the round's work is done. */
export const finished = (r: Round) => r.hits >= r.need;
/** Whether the work was dropped: as many misses as tired hands have in them, before it was done. */
export const dropped = (r: Round) => r.most > 0 && r.misses >= r.most && !finished(r);

/** The button pressed at a moment: a hit (the stretch moves, the marker quickens) or a miss. */
export function press(r: Round, t: number): Round {
  if (finished(r) || dropped(r)) return r;
  if (!over(r, t)) return { ...r, misses: r.misses + 1 };
  // (it carries on from where it is, the way it was running)
  const { at, way } = running(r, t);
  const [a, s1] = draw(r.seed), room = 1 - 2 * TIMING.edge - r.width;
  // the stretch goes somewhere else: not where it was
  let lo = TIMING.edge + a * room;
  if (Math.abs(lo - r.lo) < r.width) lo = TIMING.edge + ((a + 0.5) % 1) * room;
  return { ...r, hits: r.hits + 1, speed: Math.min(TIMING.fastest, r.speed * TIMING.quicken), from: at, way, since: t, lo, seed: s1 };
}
