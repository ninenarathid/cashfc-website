import { partOf, rodFx, slowPartOf } from "./forged";
import { toolPaid } from "./forged-keep";
import { powerLeft, usePower } from "./powers";
import { PLAIN, ROD_IDS, gearOf, rodStack, type Gear } from "./gear";
import { BAITS, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, ITEMS, KEPT_BAITS, TIER_WEIGHT, byOf, type BaitId, type CatchId, type FishId, type FightStyle, type FlotsamId, type Sign, type Tier } from "./items";
import { charmBy, numberOf, useGift, works, type GiftRefusal } from "./gifts";
import { STAMINA, isSpent, levelOf, spend } from "./stamina";
import { handOf, handSlot, held, no, put, roomFor, take, type Done, type Purse, type Stack } from "./trade";
import type { Current, FishingHabitat } from "./river-items";

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

/** A meal's buff as a rule is told of it: its level (lib/town/stamina's levelOf), or only that there is one (the first level). */
export type Level = number | boolean;
const lvl = (l: Level | undefined): number => (l === true ? 1 : l || 0);
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
export function oddsOf(bait: BaitId, hour: number, rain = false, lucky: Level = false, shallow = false, signs: readonly Sign[] = [], habitat: FishingHabitat = "town", current: Current = "eddy"): Array<{ what: CatchId; p: number }> {
  const weights: Array<[CatchId, number]> = [];
  for (const id of FISH_IDS) {
    const f = FISH[id], likes = f.baits[bait] ?? 0;
    if (!(f.habitat ?? ["town"]).includes(habitat) || (f.current && !f.current.includes(current))) continue;
    if (!likes || !inHours(f.hours, ((Math.floor(hour) % 24) + 24) % 24)) continue;
    if (f.water ? f.water !== (shallow ? "bank" : "deck") : shallow && f.tier !== "common") continue;
    if (f.needs && !f.needs.every((s) => signs.includes(s))) continue;
    // (one the sky keeps away is not in the water at all: it is given no share, not a share of nothing)
    const sky = rain ? f.rain : f.dry ?? 1;
    if (!(sky > 0)) continue;
    const luck = f.tier === "rare" || f.tier === "legend" ? 1 + byOf("lucky", lvl(lucky)) : 1;
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
export function castLine(bait: BaitId, hour: number, rain: boolean, lucky: Level, rnd: () => number, shallow = false, signs: readonly Sign[] = []): Cast {
  return castFrom(oddsOf(bait, hour, rain, lucky, shallow, signs), rnd);
}
/** …from what may take it, however that was reckoned (a bait's own odds, or those a gift of the deck's has sifted: below). */
export function castFrom(odds: ReadonlyArray<{ what: CatchId; p: number }>, rnd: () => number): Cast {
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
/**
 * A fish that was hooked got away in the fight: the bait it took comes back, where the bag has room for it (the owner,
 * 2026-10-07, of fishing that is over too soon). A bait that is not eaten never left the bag. A strike mistimed and
 * a line taken up give nothing back: or whoever is told what is coming would let it pass and drop the line again for
 * nothing.
 */
export function backBait(purse: Purse, bait: BaitId): Purse {
  return KEPT_BAITS.includes(bait) || roomFor(purse.bag, bait) < 1 ? purse : { ...purse, bag: put(purse.bag, bait, 1) };
}
/** Land what was caught: into the bag when there is room for it, and, a fish, onto the record when it is the longest of its kind yet. */
export function landCatch(purse: Purse, what: CatchId, size: number): { purse: Purse; kept: boolean; record: boolean } {
  const kept = roomFor(purse.bag, what) > 0, fish = what in FISH ? (what as FishId) : null;
  const record = !!fish && size > (purse.best[fish] ?? 0);
  return { kept, record, purse: { ...purse, bag: kept ? put(purse.bag, what, 1) : purse.bag, best: record && fish ? { ...purse.best, [fish]: size } : purse.best } };
}
/** How long after the bite somebody's strike still hooks the fish, by the meal in them, the stamina left and the float they carry. */
export const strikeWindowOf = (purse: Purse, now: number) =>
  // ── forging: old tools ── (the rod in the hand is the one in the slot it was taken up from, where the purse says which)
  strikeWindow({ keen: levelOf(purse, now, "keen"), spent: isSpent(purse, now), gear: gearOf(purse.bag, handOf(purse), handSlot(purse, purse.handAt ?? null)), charm: charmBy(purse, "charmFloat") });

// ── forging: old tools ── (what whoever keeps the game does for a forged rod: lib/town/forged has what one carries)
/** The rod somebody fishes with now, as the stack it is: the one in the hand, by the slot it was taken up from (`slot`, where the keeper knows it; else as the purse says), or the best in the bag. */
export const rodOf = (purse: Purse, slot: number | null = null): Stack | null =>
  rodStack(purse.bag, gearOf(purse.bag, handOf(purse)).rod, slot !== null && slot >= 0 ? slot : handSlot(purse, purse.handAt ?? null));
/** A purse after a fight's stamina is paid, with what the rod takes off it (lib/town/forged-keep: a share, owed forward; or nothing at all, of the first fights of a meal's hours). */
export function fightPaid<P extends Purse>(purse: P, effort: number, now: number, slot: number | null = null): P {
  const rod = rodOf(purse, slot);
  return toolPaid(purse, spend(purse, effort, now) as P, now, rod, rodFx(rod), "rdFresh");
}
/** What may take a bait, with the fish of some tiers so many times as often: each share of the whole again. */
export function rarer(odds: ReadonlyArray<{ what: CatchId; p: number }>, k: number, tiers: readonly Tier[] = ["rare", "legend"]): Array<{ what: CatchId; p: number }> {
  if (!(k > 1)) return odds.map((o) => ({ ...o }));
  const raised = odds.map((o) => ({ what: o.what, p: o.what in FISH && tiers.includes(FISH[o.what as FishId].tier) ? o.p * k : o.p }));
  let total = 0;
  for (const o of raised) total += o.p;
  return raised.map((o) => ({ what: o.what, p: o.p / total }));
}
/**
 * How much sooner a bite comes with a rod that hurries it: the share of the wait to take off (lib/town/fountain's
 * `hastened` takes it). `rest` is what everything else has left of the wait already (1: nothing has shortened it);
 * together they never leave under one part in the cap of the plain wait.
 */
export const rodHaste = (rest: number, quick: number): number => (quick > 0 ? 1 - slowPartOf(Math.min(1, Math.max(0.01, rest)), 1 - quick) : 0);
/**
 * A line dropped with a rod that calls the fish: it is bitten at once, so many times a day (the counted option). The
 * purse with one more counted; or null, where the line waits as ever (no such rod, or the day's are spent).
 */
export function called<P extends Purse>(purse: P, now: number, slot: number | null = null): P | null {
  const used = usePower(purse, rodOf(purse, slot), "rdCall", now);
  return used.ok ? used.purse : null;
}
/** The line of a rod that called: bitten at once (a second: whoever keeps the game gives the float its moment to be watched), with no nibble first. */
export const calledCast = <T extends { wait: number; nibbles: number[] }>(cast: T): T => ({ ...cast, wait: 1, nibbles: [] });
/** Whether a bait comes back from a fish that was landed, with a rod that spares it so often (`luck`: a number of chance, of whoever keeps the game). */
export const baitKept = (purse: Purse, luck: number, slot: number | null = null): boolean => luck < rodFx(rodOf(purse, slot)).keeps;
/**
 * For how many seconds after the bite the float stays under for somebody with a rod of the golden moment: its
 * seconds while the day still has one, or nothing. (The page keeps the bite open so long; whether a strike in that
 * time takes is `goldStrike`'s, whoever keeps the game.)
 */
export const goldWindowOf = (purse: Purse, now: number, slot: number | null = null): number => {
  const secs = rodFx(rodOf(purse, slot)).gold;
  return secs > 0 && powerLeft(purse, "rdGold", now) > 0 ? secs : 0;
};
/**
 * A strike that came after the moment had passed, taken all the same by a rod of the golden moment: within its
 * seconds of the bite, so many a day, counted by the option (a strike in the moment itself is never counted). The
 * purse with one more counted; or null, where the fish is gone as ever. It hooks as a late strike does.
 */
export function goldStrike<P extends Purse>(purse: P, reaction: number, now: number, slot: number | null = null): P | null {
  const rod = rodOf(purse, slot), secs = rodFx(rod).gold;
  if (!(secs > 0) || !(reaction >= 0) || reaction > secs) return null;
  const used = usePower(purse, rod, "rdGold", now);
  return used.ok ? used.purse : null;
}
/** The fish that put the water to sleep for a rod that lulls it: every fish that is better than a common one. */
export const LULL: { tiers: readonly Tier[] } = { tiers: ["uncommon", "rare", "legend"] };
/** Whether the water sleeps for somebody now: a rod's lull has begun and is not over. */
export const lullNow = (purse: Pick<Purse, "rodStill">, now: number): boolean => typeof purse.rodStill === "number" && purse.rodStill > now;
/**
 * A fish hooked with a rod that lulls the water: where the water does not sleep already and the fish is one that
 * puts it to sleep, it sleeps from now for the rod's minutes, so often a day (counted by the option). The purse as
 * it is afterwards: the same one, where nothing begins. It begins by itself and is never spent on a common fish.
 */
export function lulled<P extends Purse>(purse: P, what: CatchId, now: number, slot: number | null = null): P {
  const rod = rodOf(purse, slot), fx = rodFx(rod);
  if (!(fx.lull < 1) || !(fx.lullMins > 0) || lullNow(purse, now) || !(what in FISH) || !LULL.tiers.includes(FISH[what as FishId].tier)) return purse;
  const used = usePower(purse, rod, "rdStill", now);
  return used.ok ? { ...used.purse, rodStill: now + fx.lullMins * 60_000 } : purse;
}
/** How lively a fish is for somebody now, as so many times its own: less while the water sleeps for the rod they fish with; 1 otherwise. */
export const livelyOf = (purse: Purse, now: number, slot: number | null = null): number => (lullNow(purse, now) ? rodFx(rodOf(purse, slot)).lull : 1);

/* ── the strike ─────────────────────────────────────────────────────────── */

/** How long after the float goes under a strike still hooks the fish, and how soon it must come to be a good or a perfect one, in seconds. */
export const STRIKE = { window: 1.6, good: 1.0, perfect: 0.45 };
export type Strike = "perfect" | "good" | "late";
/** What stretches or shrinks the strike's moment: a keen eye (a meal's buff) has half as long again, a better float longer too, and a charm's number where one has one (the whispering float's is 1 since 2026-10-07: it tells what is coming and lengthens nothing; lib/town/gifts), and somebody with no stamina left far less. */
export interface StrikeMods { keen?: Level; spent?: boolean; gear?: Pick<Gear, "strike" | "fx">; charm?: number }
const strikeScale = (m: StrikeMods) => (1 + byOf("keen", lvl(m.keen))) * (m.spent ? STAMINA.spent.strike : 1) * (m.gear?.strike ?? 1) * Math.max(1, m.charm ?? 1)
  // ── forging: old tools ── (a forged rod's own part, taken with the rest of what lengthens the moment and never past the cap: lib/town/forged)
  * partOf((1 + byOf("keen", lvl(m.keen))) * (m.gear?.strike ?? 1) * Math.max(1, m.charm ?? 1), m.gear?.fx?.strike ?? 1);
/** How long after the bite a strike still hooks the fish, for somebody. */
export const strikeWindow = (mods: StrikeMods = {}) => STRIKE.window * strikeScale(mods);
/** What a strike so long after the bite is worth: nothing when it came before the bite or too late. */
export function strikeOf(reaction: number, mods: StrikeMods = {}): Strike | null {
  const k = strikeScale(mods);
  if (!(reaction >= 0) || reaction > STRIKE.window * k) return null;
  return reaction <= STRIKE.perfect * k ? "perfect" : reaction <= STRIKE.good * k ? "good" : "late";
}

/**
 * The hand's rest (the members, by way of the owner, 2026-10-06: "ซื้อเหยื่อมา 12 อัน จับได้ 3 ตัว"). A fish is fought by
 * hammering one button, and the same button then went on from what was caught, dropped the next line and struck it
 * at once, each of those a bait gone for nothing. So, in seconds:
 * - `settle`: a line that has only just gone out takes no strike ("ขอ time zone ช่วงที่โยนผิดไม่นับเสียเหยื่อซัก 2 วิ");
 *   only until the bite when that comes sooner, so that no strike that would have hooked anything is ever let by;
 * - `pause`: what a go came to is shown this long before anything goes on from it ("เพิ่มดีเลบางจุดให้หยุดมือทัน").
 *
 * Both are the page's own, and nothing that keeps the game is asked: the line stays in the water with its bait on,
 * so nothing is given back and nothing can be had by it. (A line taken up again with its bait given back would be a
 * line dropped again for nothing until what is on its way is worth waiting for.)
 */
export const REST = { settle: 2, pause: 1 };
/** Whether a line that has been out so many seconds, with its bite so many seconds after the cast, is still settling: a strike then is not taken. */
export const settling = (since: number, wait: number) => since < Math.min(REST.settle, wait);

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
  /** A line of dragon silk (below): the seconds it gives; and, while what would have lost the fish is being mended, what that was and the seconds left. */
  silk?: number;
  mend?: Mend;
}
/** What is being mended on a line of dragon silk: the line that would have snapped or the hook that would have slipped, and the seconds left to. */
export type Mend = { how: "snapped" | "slipped"; left: number } | null;

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
export interface FightMods {
  spent?: boolean; calm?: Level; gear?: Pick<Gear, "band" | "pace" | "slip" | "snap" | "line" | "fx">;
  /** (the gifts of the deck's ranks, below) `narrow`: what is left of the safe stretch's width when two fish are fought at once on a rod of two lines. */
  narrow?: number;
  /** `silk`: the seconds a line of dragon silk gives to mend what would have lost the fish (none: it is lost at once, as ever). */
  silk?: number;
  /** `harder`: how many times as hard the deck's good fish are for whoever fights (lib/town/gifts' harderFor; a common fish is as it is). `bout`: which of a legend's fights running this is (from the second, the fish breaks away at once). */
  harder?: number;
  bout?: number;
  // ── forging: old tools ── (`lively`: how lively the fish is, as so many times its own: how far its safe stretch goes and how fast. Nothing said, or 1: as it is.)
  lively?: number;
}

/**
 * Set the hook: the fight as it begins. A perfect strike leaves less line to
 * win and a late one more, with the fish surging at once. With no stamina left
 * the safe stretch is narrower, moves further and faster, and the surges are
 * harder; steady hands widen it.
 */
export function startFight(fish: FishId, strike: Strike, mods: FightMods, seed: number): Fight {
  const f = FISH[fish].fight, kind = STYLE[f.style], spent = STAMINA.spent, gear = mods.gear ?? PLAIN;
  // ── forging: old tools ── (`fx`: the rod's own forging; each part of it is taken with the rest of what eases the same thing, never past the cap)
  const fx = gear.fx;
  const band = f.band * (mods.spent ? spent.band : 1) * (1 + byOf("calm", lvl(mods.calm))) * gear.band * (mods.narrow ?? 1) * partOf((1 + byOf("calm", lvl(mods.calm))) * gear.band, fx?.band ?? 1);
  // (harder for the skilled: so many times the pull, the surge and the line to win; and a bout after the first begins as a late strike's fight does, the fish away at once)
  const k = harderOf(fish, mods.harder ?? 1), away = strike === "late" || (mods.bout ?? 1) > 1;
  const length = f.line * (strike === "perfect" ? FIGHT.perfect : strike === "late" ? FIGHT.late : 1) * gear.line * k * slowPartOf(gear.line, fx?.line ?? 1);
  // (while the water sleeps the fish is less lively: its stretch goes so much less far, and so much slower, with the rest of what slows it and never past the cap)
  const lively = mods.lively !== undefined && mods.lively > 0 && mods.lively < 1 ? mods.lively : 1;
  const sway = f.sway * (mods.spent ? spent.sway : 1) * slowPartOf(1, lively), pace = f.pace * (mods.spent ? spent.pace : 1) * gear.pace * slowPartOf(gear.pace, (fx?.pace ?? 1) * lively);
  let [r, next] = draw(seed | 0);
  const from = away ? 0 : f.every[0] + (f.every[1] - f.every[0]) * r;
  [r, next] = draw(next);
  const rest = FIGHT.settle[0] + (FIGHT.settle[1] - FIGHT.settle[0]) * r + (fx?.still ?? 0);
  const at = room(band, FIGHT.centre);
  // (a late strike's surge is on already: a fish that carries the stretch has thrown it up the gauge)
  let to = at;
  if (away && kind.carries) { [r, next] = draw(next); to = room(band, at + sway * (0.7 + 0.3 * r)); }
  return {
    fish, t: 0, tension: 0.5, line: length, length, strain: 0, slack: 0, snapIn: FIGHT.snap * gear.snap, slipIn: FIGHT.slip * gear.slip,
    band, lo: at - band / 2, hi: at + band / 2, at, to, speed: pace, rest, sway, pace,
    pull: f.pull * k * (fx?.fierce ?? 1), power: f.surge * (mods.spent ? spent.surge : 1) * k * (fx?.fierce ?? 1),
    surge: { from, to: from + kind.surge },
    seed: next, over: null,
    ...(mods.silk && mods.silk > 0 ? { silk: mods.silk, mend: null } : {}),
  };
}

/** Whether the fish is surging now. */
export const surging = (f: Fight) => f.t >= f.surge.from && f.t < f.surge.to;
/** Whether the fish is giving away that it is about to surge (those that do). */
export const warning = (f: Fight, readCurrent = false) => (readCurrent || STYLE[FISH[f.fish].fight.style].tells) && f.t < f.surge.from && f.surge.from - f.t <= FIGHT.warn;

/** The fight a moment later, the reel held or not. */
export function stepFight(f: Fight, holding: boolean, dt: number): Fight {
  if (f.over || !(dt > 0)) return f;
  const { t, surge, seed, at, to, rest, speed, lo, hi, on, pull } = swayed(f, dt);

  const tension = Math.min(1.05, Math.max(0, f.tension + (holding ? FIGHT.rise + pull * FIGHT.held : pull * FIGHT.loose - FIGHT.fall) * dt));
  const line = f.line - (holding && tension >= lo && tension <= hi ? FIGHT.reel * dt : 0) + (tension < lo ? FIGHT.run * dt * (on ? 2 : 1) : 0);
  const strain = tension > hi ? f.strain + dt / f.snapIn : Math.max(0, f.strain - dt / FIGHT.mend);
  const slack = tension < lo ? f.slack + dt / f.slipIn : Math.max(0, f.slack - dt / FIGHT.mend);
  const over = line <= 0 ? "landed" : strain >= 1 || tension >= 1.04 ? "snapped" : slack >= 1 || line > f.length * 1.6 ? "slipped" : null;
  const next: Fight = { ...f, t, tension, line: Math.max(0, line), strain: Math.min(1, strain), slack: Math.min(1, slack), lo, hi, at, to, speed, rest, surge, seed, over };
  if (!f.silk || over === "landed") return next;
  // A line of dragon silk: what would have lost the fish begins a few seconds to mend it in. (A fish that has run
  // off with too much line is gone all the same: that is no line too taut or too slack, it is a fish never reeled.)
  const m = mending(f.mend ?? null, f.silk, strain >= 1 || tension >= 1.04 ? "snapped" : slack >= 1 ? "slipped" : null, tension >= lo && tension <= hi, dt);
  return { ...next, mend: m.mend, over: line > f.length * 1.6 ? "slipped" : m.lost, strain: m.saved === "snapped" ? SILK.left : next.strain, slack: m.saved === "slipped" ? SILK.left : next.slack,
    // (mended: the silk has done what it does for this fight)
    silk: m.saved ? 0 : f.silk };
}
/**
 * A line of dragon silk (the deck's fourth rank, a charm): a line too taut or too slack does not lose the fish at
 * once. From the moment it would have, there are so many seconds (the charm's number, lib/town/gifts) to bring the
 * tension back into the safe stretch: brought back, the fish is on still, with so much of that strain or slack left
 * on it (`left`: it has not begun anew); not brought back, the fish is lost as ever.
 *
 * **Once to a fight** (a fight's `silk` is none once it has mended). The owner's rule is that no power takes failing
 * away, and the made-up hands say what "as often as it comes to that" would do: every one of them, the newcomer too,
 * lands every fish there is, the legend with the rest (the scratch folder's sim-silk.mjs: 100 in 100 where a
 * practised hand had landed 36 koi and an average one none). Mending once, a practised hand lands 65 koi in a hundred
 * for 36, an average one 59 snakeheads for 24 and 12 eels for 4, and a newcomer still next to none of the big ones:
 * a second chance for whoever nearly had it, and no fish for nothing. (Each time shorter was tried too, three seconds
 * then two then one: a practised hand then loses only the legend, one in ten.)
 */
export const SILK = { left: 0.5 };
/** A moment of the mending: what is being mended now, and what came of it this moment (the fish lost, or saved). */
function mending(mend: Mend, silk: number, breaks: "snapped" | "slipped" | null, safe: boolean, dt: number): { mend: Mend; lost: "snapped" | "slipped" | null; saved: "snapped" | "slipped" | null } {
  if (mend) {
    if (safe) return { mend: null, lost: null, saved: mend.how };
    const left = mend.left - dt;
    return left <= 0 ? { mend: null, lost: mend.how, saved: null } : { mend: { how: mend.how, left }, lost: null, saved: null };
  }
  return { mend: breaks ? { how: breaks, left: silk } : null, lost: null, saved: null };
}
/**
 * The fish and its safe stretch a moment later, whatever the hand does: when it surges next, where the stretch is and
 * is heading, and how hard the fish pulls now (`on`: it is surging). What a fight's step begins from; and what two
 * fish on a rod of two lines each do by themselves (below).
 */
function swayed(f: Fight, dt: number): Pick<Fight, "t" | "surge" | "seed" | "at" | "to" | "rest" | "speed" | "lo" | "hi"> & { on: boolean; pull: number } {
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
  return { t, surge, seed, at, to, rest, speed, lo, hi, on, pull };
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

/* ── the gifts of the deck's ranks (lib/town/gifts) ─────────────────────── */

/**
 * The otter (the deck's second rank, a familiar): a fish that gets away in the fight, the line snapped or the hook
 * slipped, is driven back for one more fight at once, and nothing is lost by it: no bait, and no more stamina (a
 * fish's fight is paid for once, as the hook is set). Once to a line (`again`: this line's fish was driven back
 * already; lost again, it is lost), and so many times to a meal's hours (lib/town/gifts' `USES`): the purse with one
 * more counted, or why not.
 *
 * Of two fish on a rod of two lines it is the last one still on that it drives back: while another is still to be
 * won the fight has not ended, and the otter is no second hand.
 */
export function driveBack<P extends Pick<Purse, "gifts">>(purse: P, how: string, again: boolean, now: number): { ok: true; purse: P; left: number } | { ok: false; why: GiftRefusal } {
  if (again || (how !== "snapped" && how !== "slipped")) return { ok: false, why: "none" };
  return useGift(purse, "famOtter", now);
}

/**
 * A rod of two lines (the deck's third rank, a thing): two lines dropped at once, for two baits. A second fish takes
 * the second line, both are hooked by the one strike, and the two are fought at once in one fight; they are lost one
 * at a time, and a legend never comes as one of a pair (`never`). The safe stretch of each is narrower by the gift's
 * number (lib/town/gifts: three quarters of itself). `stray` and `alone` are the fight's own (`Pair`, below).
 */
export const PAIR = { lines: 2, never: ["legend"] as Tier[], stray: 0.4, alone: 2 };
/** Later rods carry two lines. The deck's gift adds one to the rod actually used. */
export function linesOf(purse: Purse, slot: number | null = null): number {
  const rod = rodOf(purse, slot);
  if (!rod) return 0;
  return (rod.item === "rod" ? 1 : 2) + (works(purse, "thingRod") ? 1 : 0);
}
/**
 * What may take a bait, without the fish of some tiers: each share of what is left, of what is left. (What is no fish
 * is of no tier, and stays: so something is always left of a bait's own odds.)
 */
export function sift(odds: ReadonlyArray<{ what: CatchId; p: number }>, tiers: readonly Tier[]): Array<{ what: CatchId; p: number }> {
  const kept = odds.filter((o) => !(o.what in FISH && tiers.includes(FISH[o.what as FishId].tier)));
  let total = 0;
  for (const o of kept) total += o.p;
  return kept.map((o) => ({ what: o.what, p: o.p / total }));
}
/** So many of a bait put on hooks at once: as `hookBait` is for one (a bait that is not eaten stays; there have to be as many in the bag all the same). */
export function hookBaits(purse: Purse, bait: BaitId, n: number): Done<{ purse: Purse }> {
  const many = Math.max(1, Math.floor(n) || 1);
  if (!ROD_IDS.some((r) => held(purse.bag, r))) return no("tool");
  if (!BAITS.includes(bait) || held(purse.bag, bait) < many) return no("none");
  return { ok: true, purse: KEPT_BAITS.includes(bait) ? purse : { ...purse, bag: take(purse.bag, bait, many) } };
}

/**
 * Two fish fought at once on one reel. Each has a fight of its own for what is its own: its surges, its line to win,
 * and a safe stretch of its own on the one gauge. The two swim together: the second's stretch keeps about the
 * first's, straying from it as that fish itself moves (`PAIR.stray`: so much of its own way), so the two stretches
 * lie over each other, part, and meet again. The line's tension is one, and so is the hand:
 * - held, the reel wins line for each fish whose stretch the tension is in: for both, where the two lie over each
 *   other;
 * - the line strains only above both stretches, and is slack only below both: there the hook works loose and both
 *   fish take line back, as a fish does from a slack line; between the two nothing is lost;
 * - they are lost one at a time: strained through, it is the fish of the upper stretch that breaks off; slack too
 *   long, the fish of the lower one slips; and a fish left until it has run off with too much line is gone. The
 *   other is still to be won, with its strain and its slack begun anew; left alone, the second fish's stretch goes
 *   back to moving all its own way (within `PAIR.alone` seconds or so).
 */
export interface Pair {
  fights: Fight[];
  /** How each ended, once it has. */
  ended: Fight["over"][];
  t: number;
  tension: number;
  strain: number;
  slack: number;
  snapIn: number;
  slipIn: number;
  /** Each fish's safe stretch on the gauge now: its two ends. */
  lo: number[];
  hi: number[];
  /** What the second fish's stretch keeps about, and how much of its own way it goes from there. */
  about: number;
  own: number;
  /** A line of dragon silk: the seconds it gives (none: 0), and what is being mended. */
  silk: number;
  mend: Mend;
}
/** Where the second fish's stretch is: about a place, so much of its own way from it, never off the gauge. */
const strayed = (f: Fight, about: number, own: number) => room(f.band, about + (f.at - FIGHT.centre) * own);
/** Set two hooks at once: both fights as they begin, each stretch narrower (`mods.narrow`), on one line's tension. */
export function startPair(fish: FishId[], strike: Strike, mods: FightMods, seed: number): Pair {
  if (fish.length < 2 || fish.length > 3) throw new RangeError("Two or three lines are required");
  const fights = fish.map((id, i) => startFight(id, strike, mods, (seed ^ Math.imul(i, 0x5bd1e995)) | 0));
  const a = fights[0], centres = fights.map((f, i) => i ? strayed(f, a.at, PAIR.stray) : a.at);
  return {
    fights, ended: fish.map(() => null), t: 0, tension: 0.5, strain: 0, slack: 0, snapIn: a.snapIn, slipIn: a.slipIn,
    lo: fights.map((f, i) => centres[i] - f.band / 2), hi: fights.map((f, i) => centres[i] + f.band / 2), about: a.at, own: PAIR.stray, silk: mods.silk && mods.silk > 0 ? mods.silk : 0, mend: null,
  };
}
/** The two a moment later, the reel held or not. */
export function stepPair(p: Pair, holding: boolean, dt: number): Pair {
  if (!(dt > 0) || p.ended.every(Boolean)) return p;
  const live = p.fights.map((_, i) => i).filter((i) => !p.ended[i]), s = p.fights.map((f, i) => (p.ended[i] ? null : swayed(f, dt)));
  const pull = Math.max(...live.map((i) => s[i]!.pull));
  const tension = Math.min(1.05, Math.max(0, p.tension + (holding ? FIGHT.rise + pull * FIGHT.held : pull * FIGHT.loose - FIGHT.fall) * dt));
  // Where each stretch is: the first's own; the second's about the first's while that fish is on, and, once it is
  // alone, about the gauge's middle and all its own way again, a little more of each with every moment.
  const near = 1 - Math.exp(-dt * 3 / PAIR.alone);
  const about = s[0] ? s[0].at : p.about + (FIGHT.centre - p.about) * near, own = s[0] ? PAIR.stray : p.own + (1 - p.own) * near;
  const lo = [...p.lo], hi = [...p.hi];
  if (s[0]) { lo[0] = s[0].lo; hi[0] = s[0].hi; }
  for (const i of live) if (i > 0) { const at = strayed({ ...p.fights[i], at: s[i]!.at }, about, own); lo[i] = at - p.fights[i].band / 2; hi[i] = at + p.fights[i].band / 2; }
  const top = Math.max(...live.map((i) => hi[i])), bottom = Math.min(...live.map((i) => lo[i]));
  const fights = p.fights.map((f, i) => {
    const m = s[i];
    if (!m) return f;
    const { on: _on, pull: _pull, ...moved } = m;
    const line = f.line - (holding && tension >= lo[i] && tension <= hi[i] ? FIGHT.reel * dt : 0) + (tension < bottom ? FIGHT.run * dt * (m.on ? 2 : 1) : 0);
    return { ...f, ...moved, tension, line: Math.max(0, line) };
  });
  let strain = tension > top ? p.strain + dt / p.snapIn : Math.max(0, p.strain - dt / FIGHT.mend);
  let slack = tension < bottom ? p.slack + dt / p.slipIn : Math.max(0, p.slack - dt / FIGHT.mend);
  const ended = [...p.ended];
  let mend = p.mend, silk = p.silk;
  const lose = (i: number, how: "snapped" | "slipped") => { ended[i] = how; fights[i] = { ...fights[i], over: how }; strain = 0; slack = 0; mend = null; };
  for (const i of live) if (fights[i].line <= 0) { ended[i] = "landed"; fights[i] = { ...fights[i], over: "landed" }; }
  const still = live.filter((i) => !ended[i]);
  // (one at a time: whichever comes first of the line strained through, the hook slack too long, a fish run off with the line)
  let lost: "snapped" | "slipped" | null = !still.length ? null : strain >= 1 || tension >= 1.04 ? "snapped" : slack >= 1 ? "slipped" : null;
  // (a line of dragon silk: so many seconds to bring the tension back into either stretch before one is lost)
  if (silk && still.length) {
    const m = mending(mend, silk, lost, still.some((i) => tension >= lo[i] && tension <= hi[i]), dt);
    mend = m.mend;
    lost = m.lost;
    if (m.saved === "snapped") strain = SILK.left;
    if (m.saved === "slipped") slack = SILK.left;
    if (m.saved) silk = 0;
  }
  if (lost === "snapped") lose(still.reduce((u, i) => (hi[i] > hi[u] ? i : u)), "snapped");
  else if (lost === "slipped") lose(still.reduce((u, i) => (lo[i] < lo[u] ? i : u)), "slipped");
  else { const ran = still.find((i) => fights[i].line > fights[i].length * 1.6); if (ran !== undefined) lose(ran, "slipped"); }
  return { fights, ended, t: p.t + dt, tension, strain: Math.min(1, strain), slack: Math.min(1, slack), snapIn: p.snapIn, slipIn: p.slipIn, lo, hi, about, own, silk, mend };
}

/**
 * A sky orb (the deck's fifth rank, a thing): its owner chooses a sky, and for so many minutes the water answers
 * THEM as if under it, and bites come sooner (the gift's number, lib/town/gifts: twice as soon). Once a day (its
 * count). Nobody else's fishing changes and the town's own weather is not touched: the sky is kept in the purse.
 *
 * The three skies, and what each is to a line (`underOrb`): `night`, an hour of the night; `rain`, rain (and so no
 * sky that has just cleared); `moon`, a night of a full moon. What bites by day does not bite under an orb's night,
 * as it does not at night.
 */
export const ORB = { minutes: 30, night: 23, skies: ["night", "rain", "moon"] as const };
export type OrbSky = (typeof ORB.skies)[number];
/** The sky an orb has lit for somebody now: one of those there are, while it lasts. */
export function orbOf(purse: Pick<Purse, "orb">, now: number): OrbSky | null {
  const o = purse.orb as { sky?: unknown; until?: unknown } | null | undefined;
  return !!o && typeof o === "object" && !Array.isArray(o) && typeof o.until === "number" && o.until > now && (ORB.skies as readonly unknown[]).includes(o.sky) ? (o.sky as OrbSky) : null;
}
/** Light the orb under a sky: one of those there are, by somebody who has it, once a day. (Lit again on a new day while it still shines, the new sky is the one that holds.) */
export function lightOrb<P extends Pick<Purse, "gifts" | "orb">>(purse: P, sky: string, now: number): { ok: true; purse: P; until: number } | { ok: false; why: GiftRefusal } {
  if (!(ORB.skies as readonly string[]).includes(sky)) return { ok: false, why: "none" };
  const used = useGift(purse, "thingOrb", now);
  if (!used.ok) return used;
  const until = now + ORB.minutes * 60_000;
  return { ok: true, until, purse: { ...used.purse, orb: { sky, until } } };
}
/** What the water answers under an orb's sky: the hour, the rain and the signs a line is dropped by. With no orb lit, they are as they are. */
export function underOrb(sky: OrbSky | null, hour: number, rain: boolean, signs: readonly Sign[]): { hour: number; rain: boolean; signs: Sign[] } {
  return {
    hour: sky === "night" || sky === "moon" ? ORB.night : hour,
    rain: sky === "rain" ? true : rain,
    signs: sky === "rain" ? signs.filter((s) => s !== "after") : sky === "moon" && !signs.includes("full") ? [...signs, "full"] : [...signs],
  };
}
/** How much sooner a bite comes under an orb: the share of the wait that is taken off (lib/town/fountain's `hastened` takes it). */
export const orbHaste = (): number => 1 - 1 / numberOf("thingOrb");

/**
 * Stardust bait (the deck's sixth rank, a thing): a bait of its own, so many a day (its count), that takes no bait
 * from the bag. Whatever takes it is rare or better (`tiers`), whichever bait that fish likes and whatever the hour:
 * what it cuts out of the game is the bait and the clock. The rest holds: the water (nothing rare lives in the
 * shallows), the sky (a fish the rain keeps away is kept away), the signs (the moon's fish under a full moon), and
 * how far the village's shelf has come (`top`: a fish of a later tier than anything the uncle sells yet is not in
 * the water yet, for this bait as for any). It has to be struck and fought as any fish, and can be lost: lost, the
 * bait is spent.
 *
 * Where nothing rare is in the water at all (the shallows; a member the rare fish have grown wary of, below) the
 * line is not dropped and the bait is not spent (`calm`): the page says the water lies still, and no more.
 */
export const STAR = { tiers: ["rare", "legend"] as Tier[] };
/** Why a line was not dropped that the bag and the gifts do not refuse for: nothing is there to take it. */
export type FishRefusal = "calm";
/** What takes a stardust bait, and how likely each is: every fish of its tiers that is in this water under this sky, by its tier and the sky alone. None, where there is none. */
export function starOdds(rain: boolean, shallow: boolean, signs: readonly Sign[], top: number, habitat: FishingHabitat = "town", current: Current = "eddy"): Array<{ what: CatchId; p: number }> {
  const weights: Array<[CatchId, number]> = [];
  for (const id of FISH_IDS) {
    const f = FISH[id];
    if (!(f.habitat ?? ["town"]).includes(habitat) || (f.current && !f.current.includes(current))) continue;
    if (!STAR.tiers.includes(f.tier) || ITEMS[id].tier > top) continue;
    if (f.water ? f.water !== (shallow ? "bank" : "deck") : shallow) continue;
    if (f.needs && !f.needs.every((s) => signs.includes(s))) continue;
    const sky = rain ? f.rain : f.dry ?? 1;
    if (!(sky > 0)) continue;
    weights.push([id, TIER_WEIGHT[f.tier] * sky]);
  }
  let total = 0;
  for (const [, w] of weights) total += w;
  return weights.map(([what, w]) => ({ what, p: w / total }));
}
/** Put a stardust bait on the hook: a rod has to be in the bag, as for any line; one of the day's is counted, and nothing leaves the bag. */
export function hookStar<P extends Purse>(purse: P, now: number): { ok: true; purse: P; left: number } | { ok: false; why: "tool" | GiftRefusal } {
  if (!ROD_IDS.some((r) => held(purse.bag, r))) return { ok: false, why: "tool" };
  return useGift(purse, "thingBait", now);
}

/* ── the game made harder to match its gifts (the owner, 2026-10-07: "nearly OP", so the game grows with whoever has them) ── */

/**
 * Wary fish. The whispering float tells what is on its way, so a line whose fish is not wanted can be taken up and
 * dropped again until one is. So: whoever takes a line up more than `ups` times within `within` seconds finds the
 * fish of `tiers` gone from their water for `gone` seconds (the rare and better: what such a hand is after). Nothing
 * on the screen says so: the water only has no such fish in it for a while.
 *
 * What counts as a line taken up (whoever keeps the game counts it, at each): a line pulled up before anything was
 * hooked; a line dropped over one still out; and, **of a line that told what was on its way**, a strike too soon and
 * a bite let go by, which are the same thing done with the float's own count (a hand with no float strikes too soon
 * by mistake, and is not counted for it). Kept in the purse (`wary`): the moments of the lines taken up lately, and
 * until when the fish are gone.
 */
export const WARY = { ups: 3, within: 300, gone: 600, tiers: ["rare", "legend"] as Tier[] };
/** Whether the rare fish have gone from somebody's water for now. */
export function isWary(purse: Pick<Purse, "wary">, now: number): boolean {
  const w = purse.wary as { until?: unknown } | null | undefined;
  return !!w && typeof w === "object" && !Array.isArray(w) && typeof w.until === "number" && w.until > now;
}
/** A line taken up: one more of them counted; with more than there may be lately, the rare fish are gone from now, and the count begins anew. */
export function tookUp<P extends Pick<Purse, "wary">>(purse: P, now: number): P {
  const kept = purse.wary as { ups?: unknown; until?: unknown } | null | undefined, sound = !!kept && typeof kept === "object" && !Array.isArray(kept);
  const lately = (sound && Array.isArray(kept.ups) ? kept.ups : []).filter((t): t is number => typeof t === "number" && t > now - WARY.within * 1000 && t <= now);
  const until = sound && typeof kept.until === "number" ? kept.until : 0;
  return lately.length + 1 > WARY.ups ? { ...purse, wary: { ups: [], until: now + WARY.gone * 1000 } } : { ...purse, wary: { ups: [...lately, now], until } };
}

/**
 * A legend has a second bout: it is landed only after so many fights running (`BOUTS`), the next beginning as the
 * one before is won, with the fish breaking away at once. Lost in any of them, it is lost. One fish all the same:
 * its fight is paid for once, and it is one go on the line of work.
 */
export const BOUTS: Partial<Record<Tier, number>> = { legend: 2 };
export const boutsOf = (fish: FishId): number => BOUTS[FISH[fish].tier] ?? 1;

/**
 * Good things are harder for the skilled (lib/town/gifts' `harderFor`: from the fourth rank of the deck, 8% a rank).
 * For a fish that is uncommon or better "harder" is: it pulls and surges so many times as hard, and there is so many
 * times the line to win (the part whoever keeps the game can hold a landing to: `leastMs`); and it is so many times
 * as long, to the tenth of a centimetre. A common fish is as it is for everybody.
 */
export const harderOf = (fish: CatchId, k: number): number => (fish in FISH && FISH[fish as FishId].tier !== "common" && k > 1 ? k : 1);
export const biggerBy = (size: number, k: number): number => Math.round(size * k * 10) / 10;
/**
 * The least a landing can have taken, in milliseconds: so much (`least`) of the quickest fight there could be with
 * that fish, by how much harder it is for whoever fought it, for each of its bouts. (Sooner, it was not landed.)
 */
export const leastMs = (fish: FishId, harder: number, bouts: number, least: number): number =>
  Math.floor((FISH[fish].fight.line / FIGHT.reel) * least * harderOf(fish, harder) * bouts * 1000);
