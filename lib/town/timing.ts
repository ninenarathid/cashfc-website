/**
 * A small game of timing, for work done by hand (the owner, 2026-10-03:
 * "มินิเกมทุกอย่างอยากให้ทำให้ยากระดับหนึ่ง", and for washing a pot "มินิเกมล้างให้เล่น
 * ด้วย เล็กๆน้อยๆ"): a marker runs to and fro along a bar, and the button is
 * pressed while it is over the lit stretch. So many hits finish the work; a
 * miss costs a little and the work goes on. After each hit the stretch moves
 * somewhere else and the marker runs a little faster.
 *
 * Tilling a plot is this game: the hoe's swing, which is a thing of timing.
 * A better tool widens the stretch, and with no stamina left it is narrower
 * and the marker quicker ("ถ้า stamina หมด mini game ทุกอย่างจะยากขึ้นมากด้วย"), and
 * the work is dropped at the third miss. (It was every game there was but
 * the line's: clearing weeds, stirring a pot and everything tired hands did.
 * The owner, 2026-10-04: "การกดตามจังหว่ะ ดูจะมีเยอะไปหน่อย". Each of those is its
 * own game now: lib/town/weeding, stirring, pouring and steady, which take
 * this one's numbers for how much harder tired hands have it.)
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
   * With no stamina left: how much of the stretch is left and how much faster the marker runs, and how many misses
   * tired hands have in them before the work is dropped (for work that asks it: `drops`). The first two were the
   * fishing fight's own numbers (STAMINA.spent); fishing was eased since and this game was not, so they are its own.
   *
   * About three times as hard as it first was (the owner, 2026-10-04: "เมื่อ stamina หมด minigame จะยากขึ้นกว่านี้อีก
   * สามเท่า แต่ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก"). At first the marker was over the stretch for 87
   * thousandths of a second, and a miss with no stamina cost nothing, so that no plot was ever left unhoed: on the
   * game's first day the members hoed 279 plots with none and 129 with some. Now it is over it for 47, and the hoe
   * is dropped at the third miss. Of made-up players, one whose presses are as unsure as the members' were (0.07 s
   * either way) hoes a plot one go in ten, a practised one (0.035) two in five, a very good one (0.02) six in seven.
   */
  spent: { zone: 0.35, speed: 1.4, misses: 3 },
};

/**
 * What makes a round easier or harder: a better tool (how many times as wide the stretch), no stamina left, and
 * whether, with none left, the work is dropped after a few misses (the farm's: a miss of it costs nothing else then;
 * a pot goes on being stirred, and loses a helping for each). And, for work that is kinder than the rest (the pot's
 * stirring): how many times as wide its stretch is at any time (`wide`), and what having no stamina does to it, in
 * place of what it does to the rest (`tired`: how much of the stretch is left, how much faster the marker runs).
 */
/**
 * `buff` is a meal's buff on the hands (since 2026-10-06, when buffs came to reach more than fishing: "บัฟอาหารที่ดีขึ้น
 * ส่งผลให้เล่นเกมง่ายขึ้นจริง"): so many times as kind (1 and what the buff does at its level, items' byOf). A keen eye
 * for what is timed (the hoe, the weeding), steady hands for what is held steady (the pouring, the stirring, the
 * roast). Each game is as kind as it can be and no kinder: its own most still holds.
 */
export interface TimingMods { tool?: number; spent?: boolean; drops?: boolean; wide?: number; tired?: { zone: number; speed: number }; buff?: number }
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
  const width = Math.min(0.5, TIMING.zone * (mods.wide ?? 1) * Math.sqrt(mods.tool ?? 1) * (tired ? tired.zone : 1) * (mods.buff ?? 1));
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

/**
 * A row's round (the enchanted hoe, lib/town/gifts; the owner, 2026-10-07: a power that does many at once has a
 * longer game of its own, and a miss costs a part, never the whole): so many beats, one swing to each. A swing over
 * the stretch is that beat's plot done; one off it leaves the plot undone; either way the stretch moves on and the
 * marker quickens, so the row's last plots are its hardest. It ends when every beat has had its swing, and cannot be
 * dropped. `marks`: each beat as it went.
 */
export interface RowRound extends Round { marks: boolean[] }
export function startRow(beats: number, mods: TimingMods, seed: number): RowRound {
  return { ...startRound(beats, { ...mods, drops: false }, seed), most: 0, marks: [] };
}
/** Whether every beat of a row has had its swing. */
export const rowDone = (r: RowRound) => r.marks.length >= r.need;
/** A swing at a row's next beat. */
export function pressRow(r: RowRound, t: number): RowRound {
  if (rowDone(r)) return r;
  const hit = over(r, t), { at, way } = running(r, t);
  const [a, s1] = draw(r.seed), room = 1 - 2 * TIMING.edge - r.width;
  let lo = TIMING.edge + a * room;
  if (Math.abs(lo - r.lo) < r.width) lo = TIMING.edge + ((a + 0.5) % 1) * room;
  return { ...r, hits: r.hits + (hit ? 1 : 0), misses: r.misses + (hit ? 0 : 1), marks: [...r.marks, hit], speed: Math.min(TIMING.fastest, r.speed * TIMING.quicken), from: at, way, since: t, lo, seed: s1 };
}

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
