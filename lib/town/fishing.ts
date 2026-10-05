import { PLAIN, ROD_IDS, gearOf, type Gear } from "./gear";
import { BAITS, BUFFS, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, KEPT_BAITS, TIER_WEIGHT, type BaitId, type CatchId, type FishId, type FightStyle, type FlotsamId, type Sign } from "./items";
import { STAMINA, hasBuff, isSpent } from "./stamina";
import { handOf, held, no, put, roomFor, take, type Done, type Purse } from "./trade";

/**
 * Fishing, as rules (the owner, 2026-10-03, asked how each part should go): a
 * line is dropped and left; what takes it depends on the bait, the hour, the
 * rain and how deep the water is, after a short wait ("สั้น: 20 วินาที ถึง 3 นาที",
 * the rare ones longer); the float has to be watched, because the strike must
 * come within moments of the bite ("ต้องตวัดภายในไม่กี่วินาที") and not at a nibble;
 * then the fish is fought with one button, held to reel and let go to give
 * line, keeping the line's tension in its safe stretch ("ตวัด + คุมความตึงสาย"),
 * which moves as the fish does ("อยากให้แถบสีเขียว ขยับไปมา ตามความยากของปลา").
 * Every kind of fish fights its own way, and none of it is easy on purpose
 * ("มินิเกมทุกอย่างอยากให้ทำให้ยากระดับหนึ่ง จะได้ learning curve สูง"); with no stamina
 * left all of it is much harder ("ถ้า stamina หมด mini game ทุกอย่างจะยากขึ้นมากด้วย").
 *
 * Pure: a cast and a fight are worked out from a seed, so the same seed plays
 * the same way, here, in a test, and one day in the database.
 */

/** A small generator of numbers in [0, 1) from a seed. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inHours = (hours: Array<[number, number]>, h: number) => hours.some(([a, b]) => h >= a && h < b);

/* ── the signs ──────────────────────────────────────────────────────────── */

/**
 * What some fish wait for (the owner, 2026-10-05, of the twenty fish he asked for: "แต่ละปลามีเงื่อนไขในการเจอ … ที่แตกต่าง
 * กันด้วย"). Most of a fish's conditions are the bait, the hour, the rain and the water; a few fish bite only while
 * something else holds, a sign. Nothing on the screen says which, or that there are any ("ส่วนใหญ่ผมอยากให้ ผู้เล่น
 * หาข้อมูลกันเอาเอง"): a fish's own line may hint at its sign, and whoever has caught one is the one to ask.
 *
 * - `tired`: whoever fishes has no stamina left.
 * - `crowd`: so many others have dropped a line within the last few minutes (three fishing together, with the
 *   number below: of the game's first 266 lines, 41 were dropped so).
 * - `weekend`: it is Saturday or Sunday, in Bangkok.
 * - `after`: it does not rain, and did within the last half hour.
 * - `full`: the moon is full, give or take a day and a half (the real one: the town's clock is the world's).
 */
export const SIGNS = {
  /** How many others' lines make a crowd, and how many seconds ago a line may have been dropped to count. */
  crowd: 2, lately: 300,
  /** How many minutes after the rain a fish that waits for its end still bites. */
  after: 30,
  /** How many days either side of the full moon count as full. */
  moon: 1.5,
  /** The days of the week that are the weekend (0 is Sunday). */
  weekend: [0, 6],
};
const DAY_MS = 86_400_000;
/** The moon's month, in days, and a moment it was new (2000-01-06 18:14 UTC). */
const MOON = { month: 29.530588853, new: 947182440000 };
/** How many days old the moon is at a moment: 0 when new, half its month when full. (By its mean month: within a day of the sky's.) */
export function moonAge(now: number): number {
  const days = (now - MOON.new) / DAY_MS;
  return days - Math.floor(days / MOON.month) * MOON.month;
}
/** The day of the week in Bangkok at a moment: 0 is Sunday. */
export const bangkokDay = (now: number): number => (((Math.floor((now + 7 * 3_600_000) / DAY_MS) + 4) % 7) + 7) % 7;
/** What is known of the moment a line is dropped, besides its bait, its hour, its rain and its water: the moment, whether whoever drops it has any stamina left, how many others' lines are out, and how many milliseconds of rain fell in the last half hour. */
export interface Scene { now: number; spent: boolean; others: number; wet: number }
/** The signs that hold as a line is dropped, in the order they are listed. */
export function signsOf(scene: Scene, rain: boolean): Sign[] {
  const signs: Sign[] = [];
  if (scene.spent) signs.push("tired");
  if (scene.others >= SIGNS.crowd) signs.push("crowd");
  if (SIGNS.weekend.includes(bangkokDay(scene.now))) signs.push("weekend");
  if (!rain && scene.wet > 0) signs.push("after");
  if (Math.abs(moonAge(scene.now) - MOON.month / 2) <= SIGNS.moon) signs.push("full");
  return signs;
}
/** Every sign there is: for reckoning what can ever be caught (lib/town/uses). */
export const ALL_SIGNS: Sign[] = ["tired", "crowd", "weekend", "after", "full"];

/**
 * What takes a bait at an hour, and how likely each is. Rain brings some out
 * and keeps some away, as its end does (`rain`, `dry`); a lucky meal brings
 * half again as many of the rare ones. From the bank the water is shallow,
 * and only the common fish come that near (the owner, asked how the places
 * to fish should grow: the deck wherever a line reaches water and the town's
 * bank all along the river, "ริมตลิ่งเป็นน้ำตื้น ได้แต่ปลาทั่วไป ปลาหายากต้องขึ้นลาน"), unless a
 * fish says where it lives (`water`: the bank has a few of its own, and one
 * common fish keeps to the deck). A fish that waits for a sign bites only
 * while it holds (`needs`: every one of them among `signs`).
 */
export function oddsOf(bait: BaitId, hour: number, rain = false, lucky = false, shallow = false, signs: readonly Sign[] = []): Array<{ what: CatchId; p: number }> {
  const weights: Array<[CatchId, number]> = [];
  for (const id of FISH_IDS) {
    const f = FISH[id], likes = f.baits[bait] ?? 0;
    if (!likes || !inHours(f.hours, ((Math.floor(hour) % 24) + 24) % 24)) continue;
    if (f.water ? f.water !== (shallow ? "bank" : "deck") : shallow && f.tier !== "common") continue;
    if (f.needs && !f.needs.every((s) => signs.includes(s))) continue;
    // (one the sky keeps away is not in the water at all: it is given no share, not a share of nothing)
    const sky = rain ? f.rain : f.dry ?? 1;
    if (!(sky > 0)) continue;
    const luck = lucky && (f.tier === "rare" || f.tier === "legend") ? 1 + BUFFS.lucky.by : 1;
    weights.push([id, TIER_WEIGHT[f.tier] * likes * sky * luck]);
  }
  // what is no fish: the first two on any bait, a later tier's only on that tier's baits
  for (const id of FLOTSAM_IDS) if (!FLOTSAM[id].on || FLOTSAM[id].on!.includes(bait)) weights.push([id, FLOTSAM[id].weight]);
  const total = weights.reduce((t, [, w]) => t + w, 0);
  return weights.map(([what, w]) => ({ what, p: w / total }));
}

/**
 * Who is shown what a bait may bring before the line is dropped: nobody, for
 * now (the owner, 2026-10-03: "ตอนนี้เหยื่อนี้อาจได้ -> hide feature นี้ไปก่อน เราจะเปิดที
 * หลังเฉพาะบางคน"). The list is still in the fishing panel, behind this; what
 * opens it for somebody (a skill, most likely) will be decided here.
 */
const SHOWN_ODDS: ReadonlySet<string> = new Set();
export const seesOdds = (who: string) => SHOWN_ODDS.has(who);

/** A line in the water: what will take it, after how many seconds, the nibbles before that (seconds from the cast), and how long the fish is. */
export interface Cast { what: CatchId; wait: number; nibbles: number[]; size: number }
/** The least time between one twitch of the float and the next, in seconds: a nibble is never mistaken for the bite by its timing alone. */
const APART = 3;

/** Drop a line: everything about what happens to it is decided now. */
export function castLine(bait: BaitId, hour: number, rain: boolean, lucky: boolean, rnd: () => number, shallow = false, signs: readonly Sign[] = []): Cast {
  const odds = oddsOf(bait, hour, rain, lucky, shallow, signs);
  let roll = rnd(), what = odds[odds.length - 1].what;
  for (const o of odds) { if (roll < o.p) { what = o.what; break; } roll -= o.p; }
  const fish = what in FISH ? FISH[what as FishId] : null;
  const [w0, w1] = fish ? fish.wait : FLOTSAM[what as FlotsamId].wait;
  const wait = Math.round(w0 + (w1 - w0) * rnd());
  // a fish may nibble once or twice first; what is no fish only drifts onto the hook
  const many = !fish ? 0 : ((r) => (r < 0.3 ? 0 : r < 0.75 ? 1 : 2))(rnd());
  const nibbles: number[] = [];
  for (let i = 0; i < many; i++) {
    const at = Math.round((0.25 + 0.6 * rnd()) * wait);
    if (at >= APART && wait - at >= APART && nibbles.every((n) => Math.abs(n - at) >= APART)) nibbles.push(at);
  }
  nibbles.sort((a, b) => a - b);
  // most are small: the roll is squared (multiplied by itself, which every machine does alike: the database works
  // a cast out with the same arithmetic)
  const big = fish ? rnd() : 0;
  const size = fish ? Math.round((fish.size[0] + (fish.size[1] - fish.size[0]) * (big * big)) * 10) / 10 : 0;
  return { what, wait, nibbles, size };
}
/** The least seconds between one twitch of the float and the next (for the database's copy of a cast). */
export const NIBBLES_APART = APART;

/* ── the purse, around a cast ───────────────────────────────────────────── */

/** Put a bait on the hook: one of it leaves the bag (a bait that is not eaten stays, and is lost only with a snapped line). A rod has to be in the bag too. */
export function hookBait(purse: Purse, bait: BaitId): Done<{ purse: Purse }> {
  if (!ROD_IDS.some((r) => held(purse.bag, r))) return no("tool");
  if (!BAITS.includes(bait) || !held(purse.bag, bait)) return no("none");
  return { ok: true, purse: KEPT_BAITS.includes(bait) ? purse : { ...purse, bag: take(purse.bag, bait, 1) } };
}
/** The line snapped: a bait that was not eaten goes with it. */
export function loseBait(purse: Purse, bait: BaitId): Purse {
  return KEPT_BAITS.includes(bait) && held(purse.bag, bait) ? { ...purse, bag: take(purse.bag, bait, 1) } : purse;
}
/** Land what was caught: into the bag when there is room for it, and, a fish, onto the record when it is the longest of its kind yet. */
export function landCatch(purse: Purse, what: CatchId, size: number): { purse: Purse; kept: boolean; record: boolean } {
  const kept = roomFor(purse.bag, what) > 0, fish = what in FISH ? (what as FishId) : null;
  const record = !!fish && size > (purse.best[fish] ?? 0);
  return { kept, record, purse: { ...purse, bag: kept ? put(purse.bag, what, 1) : purse.bag, best: record && fish ? { ...purse.best, [fish]: size } : purse.best } };
}
/** How long after the bite somebody's strike still hooks the fish, by the meal in them, the stamina left and the float they carry. */
export const strikeWindowOf = (purse: Purse, now: number) =>
  strikeWindow({ keen: hasBuff(purse, now, "keen"), spent: isSpent(purse, now), gear: gearOf(purse.bag, handOf(purse)) });

/* ── the strike ─────────────────────────────────────────────────────────── */

/** How long after the float goes under a strike still hooks the fish, and how soon it must come to be a good or a perfect one, in seconds. */
export const STRIKE = { window: 1.6, good: 1.0, perfect: 0.45 };
export type Strike = "perfect" | "good" | "late";
/** What stretches or shrinks the strike's moment: a keen eye (a meal's buff) has half as long again, a better float longer too, and somebody with no stamina left far less. */
export interface StrikeMods { keen?: boolean; spent?: boolean; gear?: Pick<Gear, "strike"> }
const strikeScale = (m: StrikeMods) => (m.keen ? 1 + BUFFS.keen.by : 1) * (m.spent ? STAMINA.spent.strike : 1) * (m.gear?.strike ?? 1);
/** How long after the bite a strike still hooks the fish, for somebody. */
export const strikeWindow = (mods: StrikeMods = {}) => STRIKE.window * strikeScale(mods);
/** What a strike so long after the bite is worth: nothing when it came before the bite or too late. */
export function strikeOf(reaction: number, mods: StrikeMods = {}): Strike | null {
  const k = strikeScale(mods);
  if (!(reaction >= 0) || reaction > STRIKE.window * k) return null;
  return reaction <= STRIKE.perfect * k ? "perfect" : reaction <= STRIKE.good * k ? "good" : "late";
}

/* ── the fight ──────────────────────────────────────────────────────────── */

/**
 * The line's tension runs from 0 (slack) to 1 (breaking). Held, the reel
 * raises it; let go, it falls; the fish adds its pull to both, and far more
 * while it surges. Only while it is in the safe stretch does reeling win line.
 * Above the stretch the line strains, and snaps when it has strained too long
 * (or at once at the very top); below it the hook works loose, the fish takes
 * line back, and it slips off when it has been slack too long. All per second.
 *
 * The safe stretch does not stay put: it goes off from where it is to
 * somewhere else, rests, and goes again, as far at a time and as fast as the
 * fish is hard (its `sway` and `pace`), each kind in its own rhythm. It is
 * not held to the middle: move by move it may end anywhere on the gauge (the
 * owner: "เหมือนหลอดสีเขียววิ่งอยู่แค่ตรงกลาง ช่วยทำให้มันมีโอกาศวิ่งไปได้ทั้งหลอดเลย"). Where it goes next, how
 * fast, and whether it rests first are all chance: it may slide a long way or a
 * little, either way, and now and then it flicks, a short dart quicker than a
 * hand follows (the owner: "ช่วยทำให้ การสะบัดของหลอดเขียว random กว่านี้").
 *
 * The gauge is twice as long as it was at first ("เพิ่มหลอด ตกปลาให้กว้างกว่านี้ 2
 * เท่า"): the stretch is as big as it was, half the share of the gauge, with
 * twice the room to move in; so every speed here is half what it was, of a
 * gauge twice the length.
 */
export const FIGHT = {
  rise: 0.23, fall: 0.22,
  /** How much of the fish's pull reaches the tension while reeling, and while giving line. */
  held: 0.4, loose: 0.175,
  /** Line won while reeling in the safe stretch, and lost while slack. */
  reel: 0.14, run: 0.05,
  /** The middle of the gauge, where the safe stretch begins; and how near the gauge's ends it may come. */
  centre: 0.5, edge: 0.04,
  /** Seconds of strain before the line snaps, of slack before the hook slips, and for either to mend. */
  snap: 1.2, slip: 1.9, mend: 2.5,
  /** How long before a surge a fish that gives itself away does so. */
  warn: 0.45,
  /** What a perfect strike takes off the line to win, and a late one adds. */
  perfect: 0.8, late: 1.15,
  /** Seconds before the safe stretch first moves, least and most; and how much faster it goes while a fish that carries it leaps or bolts. */
  settle: [0.8, 1.6] as [number, number], leap: 1.8,
  /**
   * How a move of the stretch is drawn: the least it goes (as a share of the fish's sway), the slowest and the
   * fastest it goes (as shares of the fish's pace), how often it sets off again with no rest at all, and a flick:
   * how much faster than the pace, and how far (least and most, as shares of the sway).
   */
  least: 0.3, slow: 0.7, fast: 1.3, restless: 0.3, flick: 2.2, dart: [0.25, 0.6] as [number, number],
  /** How often a slide goes down, for a fish that carries the stretch up when it surges, while the stretch is above the middle. */
  falls: 0.75,
  /**
   * How much faster than the tension can fall the stretch may drop. With the reel let go the tension falls only so
   * fast (slower the harder the fish pulls, slowest while it surges), so a stretch that dropped at any speed could
   * leave the best hand behind it; this much faster, a hand that lets go at once is still inside when it stops.
   */
  outrun: 1.25,
};
/**
 * How each way of fighting goes: how long a surge lasts, in seconds; whether
 * the fish gives a surge away first; how long the safe stretch rests between
 * one move and the next (least and most); whether a surge carries the
 * stretch up the gauge with it; and how often a move of it is a flick.
 *
 * - steady: long slow slides, with a rest between; it seldom flicks.
 * - darter: quick moves, hardly resting, and flicks half the time.
 * - leaper: slides and rests, and every leap throws the stretch up the gauge.
 * - slippery: never still.
 * - sleeper: lies still a long while, and takes the stretch with it when it bolts.
 */
const STYLE: Record<FightStyle, { surge: number; tells: boolean; rest: [number, number]; carries: boolean; flicks: number }> = {
  steady: { surge: 1.0, tells: true, rest: [0.5, 1.5], carries: false, flicks: 0.12 },
  darter: { surge: 0.5, tells: false, rest: [0, 0.4], carries: false, flicks: 0.5 },
  leaper: { surge: 0.9, tells: true, rest: [0.6, 1.6], carries: true, flicks: 0.25 },
  slippery: { surge: 0.8, tells: false, rest: [0, 0], carries: false, flicks: 0.3 },
  sleeper: { surge: 1.6, tells: false, rest: [2.5, 4.5], carries: true, flicks: 0.1 },
};

export interface Fight {
  fish: FishId;
  /** Seconds since the hook was set. */
  t: number;
  tension: number;
  /** Line still to win, and how much there was. */
  line: number;
  length: number;
  /** How near the line is to snapping, and the hook to slipping: each from 0 to 1. And how many seconds of strain this line bears, and of slack this hook holds. */
  strain: number;
  slack: number;
  snapIn: number;
  slipIn: number;
  /** The safe stretch: its width, its two ends now, where its middle is and is heading, how fast it is going there, and when it next sets off once it is there. */
  band: number;
  lo: number;
  hi: number;
  at: number;
  to: number;
  speed: number;
  rest: number;
  /** How far from the gauge's middle the stretch goes in this fight, and how fast. */
  sway: number;
  pace: number;
  /** The fish's pull at rest and in a surge, and the surge that is on or coming: from when to when. */
  pull: number;
  power: number;
  surge: { from: number; to: number };
  /** Where the fight's own run of numbers has got to. */
  seed: number;
  over: null | "landed" | "snapped" | "slipped";
}

/** One more number from a fight's run, and where the run is afterwards. */
function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
/** Where the stretch's middle may be, so wide a stretch never leaving the gauge. */
const room = (band: number, middle: number) => Math.min(Math.max(FIGHT.edge + band / 2, 1 - FIGHT.edge - band / 2), Math.max(FIGHT.edge + band / 2, middle));

/** What changes a fight for somebody: no stamina left (much harder), steady hands (a meal's buff: a wider stretch), and their gear (lib/town/gear: a better rod, hook, line and net each make it easier). */
export interface FightMods { spent?: boolean; calm?: boolean; gear?: Pick<Gear, "band" | "pace" | "slip" | "snap" | "line"> }

/**
 * Set the hook: the fight as it begins. A perfect strike leaves less line to
 * win and a late one more, with the fish surging at once. With no stamina left
 * the safe stretch is narrower, moves further and faster, and the surges are
 * harder; steady hands widen it.
 */
export function startFight(fish: FishId, strike: Strike, mods: FightMods, seed: number): Fight {
  const f = FISH[fish].fight, kind = STYLE[f.style], spent = STAMINA.spent, gear = mods.gear ?? PLAIN;
  const band = f.band * (mods.spent ? spent.band : 1) * (mods.calm ? 1 + BUFFS.calm.by : 1) * gear.band;
  const length = f.line * (strike === "perfect" ? FIGHT.perfect : strike === "late" ? FIGHT.late : 1) * gear.line;
  const sway = f.sway * (mods.spent ? spent.sway : 1), pace = f.pace * (mods.spent ? spent.pace : 1) * gear.pace;
  let [r, next] = draw(seed | 0);
  const from = strike === "late" ? 0 : f.every[0] + (f.every[1] - f.every[0]) * r;
  [r, next] = draw(next);
  const rest = FIGHT.settle[0] + (FIGHT.settle[1] - FIGHT.settle[0]) * r;
  const at = room(band, FIGHT.centre);
  // (a late strike's surge is on already: a fish that carries the stretch has thrown it up the gauge)
  let to = at;
  if (strike === "late" && kind.carries) { [r, next] = draw(next); to = room(band, at + sway * (0.7 + 0.3 * r)); }
  return {
    fish, t: 0, tension: 0.5, line: length, length, strain: 0, slack: 0, snapIn: FIGHT.snap * gear.snap, slipIn: FIGHT.slip * gear.slip,
    band, lo: at - band / 2, hi: at + band / 2, at, to, speed: pace, rest, sway, pace,
    pull: f.pull, power: f.surge * (mods.spent ? spent.surge : 1),
    surge: { from, to: from + kind.surge },
    seed: next, over: null,
  };
}

/** Whether the fish is surging now. */
export const surging = (f: Fight) => f.t >= f.surge.from && f.t < f.surge.to;
/** Whether the fish is giving away that it is about to surge (those that do). */
export const warning = (f: Fight) => STYLE[FISH[f.fish].fight.style].tells && f.t < f.surge.from && f.surge.from - f.t <= FIGHT.warn;

/** The fight a moment later, the reel held or not. */
export function stepFight(f: Fight, holding: boolean, dt: number): Fight {
  if (f.over || !(dt > 0)) return f;
  const fight = FISH[f.fish].fight, kind = STYLE[fight.style], t = f.t + dt;
  let { surge, seed, at, to, rest, speed } = f, r: number;
  if (t >= surge.to) {
    [r, seed] = draw(seed);
    const from = surge.to + fight.every[0] + (fight.every[1] - fight.every[0]) * r;
    surge = { from, to: from + kind.surge };
  }
  const on = t >= surge.from && t < surge.to, pull = on ? f.power : f.pull;

  // The safe stretch: thrown up the gauge as a fish that carries it leaps or bolts; otherwise, once it has rested
  // where it is, off again. Where to, how fast, and whether it is a slide or a flick are drawn by chance.
  const carried = kind.carries && on;
  if (carried && f.t < surge.from) {
    [r, seed] = draw(seed);
    // (up from where it is, as far as the gauge goes)
    to = room(f.band, at + f.sway * (0.7 + 0.3 * r));
    speed = f.pace * FIGHT.leap;
  } else if (at === to && t >= rest && !carried) {
    [r, seed] = draw(seed);
    if (r < kind.flicks) {
      // a flick: a short dart either way, quicker than the pace
      [r, seed] = draw(seed);
      const way = r < 0.5 ? -1 : 1;
      [r, seed] = draw(seed);
      const far = f.sway * (FIGHT.dart[0] + (FIGHT.dart[1] - FIGHT.dart[0]) * r);
      // (at the gauge's end it darts back the other way)
      to = room(f.band, room(f.band, at + way * far) !== at + way * far ? at - way * far : at + way * far);
      speed = f.pace * FIGHT.flick;
    } else {
      // a slide: either way from where it is, anything from a little to its full sway; at the gauge's end, back the other way
      [r, seed] = draw(seed);
      // (a fish that carries it up comes down again oftener than not, while it is high)
      const way = r < (kind.carries && at > FIGHT.centre ? FIGHT.falls : 0.5) ? -1 : 1;
      [r, seed] = draw(seed);
      const far = f.sway * (FIGHT.least + (1 - FIGHT.least) * r), there = at + way * far;
      to = room(f.band, room(f.band, there) !== there ? at - way * far : there);
      [r, seed] = draw(seed);
      speed = f.pace * (FIGHT.slow + (FIGHT.fast - FIGHT.slow) * r);
    }
    // (so wide a stretch that there is nowhere to go: it rests again)
    if (to === at) rest = t + 1;
  }
  if (at !== to) {
    const gap = to - at, go = Math.min(speed, gap < 0 ? (FIGHT.fall - pull * FIGHT.loose) * FIGHT.outrun : Infinity) * dt;
    if (Math.abs(gap) > go) at += Math.sign(gap) * go;
    else {
      at = to;
      // it rests, as its kind does; or, now and then, not at all
      [r, seed] = draw(seed);
      const none = r < FIGHT.restless;
      [r, seed] = draw(seed);
      rest = none ? t : t + kind.rest[0] + (kind.rest[1] - kind.rest[0]) * r;
    }
  }
  const lo = at - f.band / 2, hi = at + f.band / 2;

  const tension = Math.min(1.05, Math.max(0, f.tension + (holding ? FIGHT.rise + pull * FIGHT.held : pull * FIGHT.loose - FIGHT.fall) * dt));
  const line = f.line - (holding && tension >= lo && tension <= hi ? FIGHT.reel * dt : 0) + (tension < lo ? FIGHT.run * dt * (on ? 2 : 1) : 0);
  const strain = tension > hi ? f.strain + dt / f.snapIn : Math.max(0, f.strain - dt / FIGHT.mend);
  const slack = tension < lo ? f.slack + dt / f.slipIn : Math.max(0, f.slack - dt / FIGHT.mend);
  const over = line <= 0 ? "landed" : strain >= 1 || tension >= 1.04 ? "snapped" : slack >= 1 || line > f.length * 1.6 ? "slipped" : null;
  return { ...f, t, tension, line: Math.max(0, line), strain: Math.min(1, strain), slack: Math.min(1, slack), lo, hi, at, to, speed, rest, surge, seed, over };
}

/** Play a fight through with a way of deciding whether to hold: for trying the numbers, and for tests. Gives how it ended and how long it took. */
export function playFight(f: Fight, hold: (f: Fight) => boolean, dt = 1 / 60, limit = 180): { over: Fight["over"]; t: number } {
  let now = f;
  while (!now.over && now.t < limit) now = stepFight(now, hold(now), dt);
  return { over: now.over, t: now.t };
}

/**
 * The steps a fight is played in, a second, wherever it is played. With the
 * same steps a fight that was written down (how it began, and the steps at
 * which the reel was taken up or let go) plays again exactly: so a record of
 * it can be checked by playing it again, by whoever keeps the records.
 */
export const STEPS = 120;
/** A fight played again from what was written down of it. `holds` are the steps at which the hand went onto the reel, then off, then on …; `steps` is how many it ran. */
export function replayFight(start: Fight, holds: number[], steps: number): Fight {
  let f = start, holding = false, k = 0;
  for (let n = 0; n < steps && !f.over; n++) {
    while (k < holds.length && holds[k] <= n) { holding = !holding; k++; }
    f = stepFight(f, holding, 1 / STEPS);
  }
  return f;
}
