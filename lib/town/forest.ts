import { HOES, roll } from "./farm";
import { signsOf } from "./fishing";
import { harderFor, numberOf, useGift, usesLeft, wearing, works, type GiftRefusal } from "./gifts";
import { ITEMS, type ItemId } from "./items";
import { dayOf, spend } from "./stamina";
import { BANGKOK, DAY, HOUR, no, put, roomFor, type Done, type Purse } from "./trade";
import { DRY, wetMs, type Rain } from "./weather";
import { FOREST, FOREST_PROPS, GATES, groundAt, walkable, zoneAt, type Ground, type Zone } from "./world";

/**
 * Foraging in the forest, as rules (the owner, 2026-10-05: "หาของป่า จะมี map ใหม่
 * เป็นป่าใหญ่ๆ สามารถเดินเข้าไปเก็บของป่าที่จะ spawn ออกมาเป็นช่วงเวลา เช่นของบางอย่างเกิดทุก 10
 * นาที ไปจนถึง ขอหายาก ที่จะเกิดเฉพาะบางวัน แบบ Random … การหาของป่าต้องเล่น minigame ด้วย").
 * The map is lib/town/world's; the things themselves are lib/town/items'.
 *
 * - **Things are found at places** (`SPOTS`), laid out over the forest by a
 *   fixed seed: a heap of sticks, a patch of flowers, a log that mushrooms
 *   grow on, a mound of loose earth, a tree that bears. A place is of one kind
 *   and stays where it is; what it has changes.
 * - **Time at a place goes in turns**, each kind's as long as its own (ten
 *   minutes for what lies on the ground, half an hour for what grows, a night
 *   for what falls from the sky), and each place's beginning at its own minute,
 *   so that the whole forest never changes at once. In a turn a place has one
 *   thing, or nothing: which is rolled from the place, the turn and a word
 *   only whoever keeps the game knows (`salt`: the code is public, and nobody
 *   is to work out tomorrow's truffles from it). The same for everybody.
 * - **What it may have depends on where and when**: the part of the forest
 *   (lib/town/world's zones), the hour, whether it has rained lately, whether
 *   the moon is full, and for the rare things whether today is one of their
 *   days at all (rolled by the day, a kind at a time).
 * - **A heap is for several, and each takes from it once** (mine, with the
 *   owner's "มาถูกทางแล้ว" on the plan it was in): what a place has in a turn can
 *   be gathered by so many people (`shares`), each of them once. So whoever
 *   finds something loses nothing by calling a friend over, and nobody who is
 *   in the forest all day empties it for everybody else.
 * - **Gathering is by hand, and each way of it is a game of its own**: what
 *   lies on the ground is picked up; what grows is chosen from among what
 *   looks like it; what is buried is dug for, with a hoe in the hand; what
 *   hangs in a tree is shaken down and caught. It costs stamina, and how well
 *   the game went is how many come of it (never none). Among mushrooms a
 *   wrong one taken is a toadstool in the bag.
 *
 * Pure, like the rest: every function is given the moment and what it needs,
 * and gives back new things. Every number is a knob for the database.
 */

/** How a thing is gathered: picked up, chosen from among what looks like it, dug for, or shaken down. */
export type Gather = "pick" | "choose" | "dig" | "shake";
/** What a place in the forest is. */
export type SpotKind = "sticks" | "leaves" | "flowers" | "bamboo" | "clay" | "mushrooms" | "greens" | "berries" | "nook" | "mound" | "fruit" | "glint";

/** One thing a kind of place may have: how often beside the others, how many of it at a time (least and most), and what has to hold for it to be there at all. */
export interface Find {
  item: ItemId;
  weight: number;
  n: [number, number];
  /** Only in these parts of the forest. */
  zones?: Zone[];
  /** Only in these hours, in Bangkok, as [from, to) pairs. */
  hours?: Array<[number, number]>;
  /** Only when it has rained within so many hours. */
  rain?: number;
  /** Only on a day of its own: the chance that a day is one. */
  day?: number;
  /** Only when the moon is full. */
  moon?: boolean;
}
/** A kind of place: how its things are gathered, how many minutes its turn lasts, the chance a turn has anything, how many people may take from it in a turn, the stamina it costs, and what it may have. */
export interface Kind { how: Gather; every: number; chance: number; shares: number; cost: number; finds: Find[] }

const NIGHT: Array<[number, number]> = [[19, 24], [0, 5]];
/**
 * The kinds of place. What lies about is there every ten minutes, what grows every half hour or hour, what is
 * tucked away every two; the rare things have a day of their own (about one in four), an hour, a sky, or the moon.
 */
export const KINDS: Record<SpotKind, Kind> = {
  sticks: { how: "pick", every: 10, chance: 0.6, shares: 3, cost: 1, finds: [
    { item: "twig", weight: 60, n: [1, 2] },
    { item: "pineCone", weight: 25, n: [1, 2] },
    { item: "feather", weight: 8, n: [1, 1] },
    { item: "resin", weight: 7, n: [1, 1], zones: ["woods", "deep"] },
  ] },
  leaves: { how: "pick", every: 10, chance: 0.6, shares: 3, cost: 1, finds: [
    { item: "leafMould", weight: 75, n: [1, 2] },
    { item: "vine", weight: 25, n: [1, 2], zones: ["woods", "deep", "bamboo"] },
  ] },
  flowers: { how: "pick", every: 10, chance: 0.6, shares: 3, cost: 1, finds: [
    { item: "wildflower", weight: 100, n: [1, 2] },
    { item: "fourLeafClover", weight: 2, n: [1, 1], zones: ["edge"] },
    { item: "wildOrchid", weight: 40, n: [1, 1], zones: ["deep", "bamboo"], day: 0.25 },
    { item: "moonflower", weight: 400, n: [1, 1], zones: ["deep"], hours: NIGHT, moon: true },
  ] },
  bamboo: { how: "pick", every: 30, chance: 0.7, shares: 3, cost: 1, finds: [{ item: "bambooCane", weight: 1, n: [1, 2] }] },
  clay: { how: "pick", every: 30, chance: 0.7, shares: 3, cost: 1, finds: [{ item: "clay", weight: 1, n: [1, 3] }] },
  mushrooms: { how: "choose", every: 30, chance: 0.65, shares: 3, cost: 2, finds: [
    { item: "shiitake", weight: 60, n: [1, 2] },
    { item: "chanterelle", weight: 50, n: [1, 2], rain: 6 },
    { item: "porcini", weight: 35, n: [1, 2], rain: 6, zones: ["deep"] },
    { item: "glowMushroom", weight: 80, n: [1, 2], zones: ["deep"], hours: NIGHT },
  ] },
  greens: { how: "choose", every: 30, chance: 0.65, shares: 3, cost: 2, finds: [
    { item: "fiddlehead", weight: 100, n: [1, 2], zones: ["stream"] },
    { item: "mint", weight: 60, n: [1, 2], zones: ["edge", "stream"] },
    { item: "rosemary", weight: 100, n: [1, 2], zones: ["rise"] },
    { item: "chamomile", weight: 60, n: [1, 2], zones: ["edge"], hours: [[5, 12]] },
    { item: "lavender", weight: 50, n: [1, 2], zones: ["edge"] },
  ] },
  berries: { how: "choose", every: 30, chance: 0.65, shares: 3, cost: 2, finds: [
    { item: "blueberry", weight: 100, n: [2, 3], zones: ["edge", "woods"] },
    { item: "raspberry", weight: 100, n: [2, 3], zones: ["woods", "rise"] },
    { item: "wildStrawberry", weight: 40, n: [1, 2], zones: ["edge"] },
  ] },
  nook: { how: "pick", every: 120, chance: 0.5, shares: 2, cost: 1, finds: [
    { item: "egg", weight: 60, n: [1, 2], zones: ["edge", "woods"] },
    { item: "silkCocoon", weight: 40, n: [1, 1], zones: ["bamboo", "woods"] },
    { item: "feather", weight: 20, n: [1, 2] },
  ] },
  mound: { how: "dig", every: 30, chance: 0.6, shares: 2, cost: 3, finds: [
    { item: "bambooShoot", weight: 100, n: [1, 2], zones: ["bamboo"], hours: [[4, 12]] },
    { item: "wildYam", weight: 60, n: [1, 2], zones: ["woods", "rise", "edge", "deep"] },
    { item: "worm", weight: 50, n: [1, 3] },
    { item: "truffle", weight: 40, n: [1, 1], zones: ["deep"], day: 0.25 },
    { item: "ginseng", weight: 3, n: [1, 1], zones: ["deep"] },
    { item: "amber", weight: 3, n: [1, 1], zones: ["rise"] },
    { item: "mandrake", weight: 2, n: [1, 1], zones: ["deep"], hours: NIGHT, rain: 2 },
  ] },
  fruit: { how: "shake", every: 60, chance: 0.7, shares: 3, cost: 2, finds: [
    { item: "wildApple", weight: 100, n: [2, 3], zones: ["edge"] },
    { item: "chestnut", weight: 100, n: [1, 3], zones: ["woods", "deep", "rise", "stream", "bamboo"] },
  ] },
  glint: { how: "pick", every: 720, chance: 1, shares: 5, cost: 1, finds: [{ item: "starShard", weight: 1, n: [1, 1], hours: NIGHT, day: 0.2 }] },
};
export const SPOT_KINDS = Object.keys(KINDS) as SpotKind[];

export const FORAGING = {
  /** How near a place somebody has to stand to gather from it: on its tile, or one beside it. */
  reach: 1,
  /** What a wrong one taken among mushrooms is, and how many of them one gathering can come to. */
  decoy: "toadstool" as ItemId,
  decoys: 2,
  /** How far apart places are kept, in tiles. */
  apart: 2.5,
  /**
   * How near its member's way a squirrel fetches what lies on the ground, in tiles (lib/town/gifts' famSquirrel: it
   * runs for it, so its member need not stand at the place, and its member's stamina is not what is spent).
   */
  squirrel: 2,
  /** How far whoever rides a moss stag gathers from, in tiles (lib/town/gifts' famStag): from its back, not having to stand at the place. */
  stag: 2,
};
/** Everything the forest may give, whatever the day. */
export const FINDS: ItemId[] = [...new Set([...SPOT_KINDS.flatMap((k) => KINDS[k].finds.map((f) => f.item)), FORAGING.decoy])];

/* ── the places ─────────────────────────────────────────────────────────── */

/** A place in the forest where something may be found: its number, its kind, its tile, and the part of the forest it is in. */
export interface Spot { id: number; kind: SpotKind; x: number; y: number; zone: Zone }

/**
 * The secret places of the deep woods (the forest's fourth rank: lib/town/gifts' charmFirefly). A few places on the
 * far side of the stream that are there only for whoever wears the firefly lantern: nobody else is told of them,
 * shown them, or given anything at them. They hold the forest's rare things, in turns as long as an afternoon.
 *
 * **A secret place takes two games running** (the owner's ladder, 2026-10-07: good things grow wiser): its own way
 * of gathering, and then another (`then`), each to be done with not one miss. Win the first and the second begins;
 * fail either, or leave it once it is begun, and the turn at that place is spent with nothing got. They are played
 * with the hands alone (no hoe, no squirrel, no piglet): what counts there is the two games.
 *
 * - a **ring** of pale mushrooms on the forest floor: the true caps are chosen from among their look-alikes, and
 *   then what the ring guards is dug out from under its middle;
 * - a **bough** of an old tree where a sprite keeps its hoard: it is shaken down and caught, and then the true ones
 *   are chosen from among what fell with them.
 *
 * Every number is mine.
 */
export type SecretKind = "ring" | "bough";
/** A kind of secret place: as a kind of place is, with the way of its second game. */
export interface SecretRule extends Kind { then: Gather }
export const SECRET_KINDS: Record<SecretKind, SecretRule> = {
  ring: { how: "choose", then: "dig", every: 240, chance: 0.5, shares: 3, cost: 4, finds: [
    { item: "porcini", weight: 40, n: [2, 3] },
    { item: "truffle", weight: 30, n: [1, 2] },
    { item: "ginseng", weight: 14, n: [1, 1] },
    { item: "glowMushroom", weight: 50, n: [2, 3], hours: [[19, 24], [0, 5]] },
    { item: "mandrake", weight: 6, n: [1, 1], hours: [[19, 24], [0, 5]] },
  ] },
  bough: { how: "shake", then: "choose", every: 240, chance: 0.5, shares: 3, cost: 4, finds: [
    { item: "silkCocoon", weight: 40, n: [1, 2] },
    { item: "wildOrchid", weight: 30, n: [1, 2] },
    { item: "amber", weight: 10, n: [1, 1] },
    { item: "starShard", weight: 8, n: [1, 1], hours: [[19, 24], [0, 5]] },
    { item: "moonflower", weight: 60, n: [1, 1], hours: [[19, 24], [0, 5]], moon: true },
  ] },
};
export const SECRET_KIND_IDS = Object.keys(SECRET_KINDS) as SecretKind[];
/** A secret place: as a place is. Its number goes on from the last of the places everybody has (so one book of who took what does for both). */
export interface Secret { id: number; kind: SecretKind; x: number; y: number; zone: Zone }
/** Any place of the forest: one everybody has, or a secret one. */
export type Place = Spot | Secret;
/** How many secret places of each kind (a ring on ground somebody stands on, a bough on one of the deep woods' own trees), and how far apart they are kept. */
const HIDDEN = { ring: 3, bough: 3, apart: 9 };
/** How many places there are where a sprite may have buried a chest (lib/town/hunt), and how far apart they are kept. */
const BURIED = { sites: 180, apart: 3 };

/**
 * How many places of each kind, in which parts of the forest, on what ground. A tree that bears is one of the
 * forest's own trees (lib/town/world's FOREST_PROPS) with open ground beside it; everything else is a tile somebody
 * can stand on.
 */
const LAYOUT: Array<[kind: SpotKind, n: number, zones: Zone[], on: Ground[]]> = [
  ["sticks", 30, ["woods", "deep", "bamboo", "rise", "stream"], ["wood"]],
  ["leaves", 24, ["woods", "deep", "bamboo"], ["wood"]],
  ["flowers", 12, ["edge"], ["grass"]],
  ["flowers", 7, ["deep", "bamboo", "rise", "camp"], ["grass"]],
  ["bamboo", 10, ["bamboo"], ["wood"]],
  ["clay", 8, ["stream"], ["sand"]],
  ["mushrooms", 9, ["woods"], ["wood"]],
  ["mushrooms", 17, ["deep"], ["wood"]],
  ["greens", 8, ["edge"], ["grass"]],
  ["greens", 8, ["stream"], ["wood", "grass"]],
  ["greens", 6, ["rise"], ["wood"]],
  ["berries", 7, ["edge"], ["grass"]],
  ["berries", 6, ["woods"], ["wood"]],
  ["berries", 5, ["rise"], ["wood"]],
  ["nook", 10, ["edge", "woods", "bamboo"], ["wood", "grass"]],
  ["mound", 8, ["bamboo"], ["wood"]],
  ["mound", 8, ["woods", "rise", "edge"], ["wood", "grass"]],
  ["mound", 8, ["deep"], ["wood"]],
  ["glint", 5, ["deep"], ["grass"]],
];
/** The trees that bear: so many in the meadow at the wood's edge, so many further in. */
const ORCHARD: Array<[n: number, zones: Zone[], trees: string[]]> = [[7, ["edge"], ["tree"]], [7, ["woods", "deep", "rise"], ["oak"]]];

const LAID: { spots: Spot[]; secrets: Secret[]; sites: Array<[number, number]> } = (() => {
  // what can be walked to from where the town's gate puts somebody
  const start = GATES.find((g) => g.leads === "forest")!.to, first: [number, number] = [Math.floor(start.x), Math.floor(start.y)];
  const open = new Set([first.join(",")]), queue = [first];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!open.has(k) && walkable(x + dx, y + dy)) { open.add(k); queue.push([x + dx, y + dy]); }
    }
  }
  let a = 20261006;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out: Spot[] = [];
  const clear = (x: number, y: number) => out.every((s) => Math.hypot(s.x - x, s.y - y) >= FORAGING.apart);
  // (nothing right by the gate, on a ford's stones, or where the camp's fire and logs are)
  const kept = (x: number, y: number) => y >= FOREST.y + FOREST.h - 5 || Math.hypot(x - (FOREST.x + 49), y - (FOREST.y + 47)) < 3.2;
  for (const [n, zones, trees] of ORCHARD) {
    const stand = FOREST_PROPS.filter((p) => trees.includes(p.kind) && zones.includes(zoneAt(p.x, p.y)!) && p.x > FOREST.x + 2 && p.y > FOREST.y + 2 && p.x < FOREST.x + FOREST.w - 3 && p.y < FOREST.y + FOREST.h - 3);
    for (let tries = 0, placed = 0; placed < n && tries < 4000 && stand.length; tries++) {
      const p = stand[Math.floor(rnd() * stand.length)];
      const beside = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => open.has(`${p.x + dx},${p.y + dy}`));
      if (!beside || kept(p.x, p.y) || !clear(p.x, p.y)) continue;
      out.push({ id: out.length, kind: "fruit", x: p.x, y: p.y, zone: zoneAt(p.x, p.y)! });
      placed++;
    }
  }
  for (const [kind, n, zones, on] of LAYOUT) {
    for (let tries = 0, placed = 0; placed < n && tries < n * 400; tries++) {
      const x = FOREST.x + 2 + Math.floor(rnd() * (FOREST.w - 4)), y = FOREST.y + 2 + Math.floor(rnd() * (FOREST.h - 4));
      if (!open.has(`${x},${y}`) || kept(x, y) || !zones.includes(zoneAt(x, y)!) || !on.includes(groundAt(x, y)) || !clear(x, y)) continue;
      out.push({ id: out.length, kind, x, y, zone: zoneAt(x, y)! });
      placed++;
    }
  }
  // The secret places, after everything else and by a chance of their own (so that the places everybody has are
  // where they always were): in the deep woods, away from every other place and far from each other.
  let b = 20261007;
  const rnd2 = () => { b = (b + 0x6d2b79f5) | 0; let t = Math.imul(b ^ (b >>> 15), 1 | b); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const secrets: Secret[] = [];
  const lone = (x: number, y: number) => clear(x, y) && secrets.every((s) => Math.hypot(s.x - x, s.y - y) >= HIDDEN.apart);
  const inside = (x: number, y: number) => x > FOREST.x + 2 && y > FOREST.y + 2 && x < FOREST.x + FOREST.w - 3 && y < FOREST.y + FOREST.h - 3;
  const boughs = FOREST_PROPS.filter((p) => (p.kind === "oak" || p.kind === "pine") && zoneAt(p.x, p.y) === "deep" && inside(p.x, p.y));
  for (let tries = 0, placed = 0; placed < HIDDEN.bough && tries < 4000 && boughs.length; tries++) {
    const p = boughs[Math.floor(rnd2() * boughs.length)];
    const beside = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => open.has(`${p.x + dx},${p.y + dy}`));
    if (!beside || !lone(p.x, p.y)) continue;
    secrets.push({ id: out.length + secrets.length, kind: "bough", x: p.x, y: p.y, zone: "deep" });
    placed++;
  }
  for (let tries = 0, placed = 0; placed < HIDDEN.ring && tries < 4000; tries++) {
    const x = FOREST.x + 2 + Math.floor(rnd2() * (FOREST.w - 4)), y = FOREST.y + 2 + Math.floor(rnd2() * (FOREST.h - 4));
    if (!open.has(`${x},${y}`) || zoneAt(x, y) !== "deep" || groundAt(x, y) !== "wood" || !lone(x, y)) continue;
    secrets.push({ id: out.length + secrets.length, kind: "ring", x, y, zone: "deep" });
    placed++;
  }
  // Where a sprite may have buried a chest (lib/town/hunt), by a chance of its own again: open ground all over the
  // forest that somebody can stand on, off the trails, away from every place and from each other.
  let d = 20261008;
  const rnd3 = () => { d = (d + 0x6d2b79f5) | 0; let t = Math.imul(d ^ (d >>> 15), 1 | d); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const sites: Array<[number, number]> = [];
  for (let tries = 0; sites.length < BURIED.sites && tries < 80000; tries++) {
    const x = FOREST.x + 2 + Math.floor(rnd3() * (FOREST.w - 4)), y = FOREST.y + 2 + Math.floor(rnd3() * (FOREST.h - 4)), ground = groundAt(x, y);
    if (!open.has(`${x},${y}`) || kept(x, y) || (ground !== "wood" && ground !== "grass") || !clear(x, y)) continue;
    if (secrets.some((s) => Math.hypot(s.x - x, s.y - y) < FORAGING.apart) || sites.some(([a, b]) => Math.hypot(a - x, b - y) < BURIED.apart)) continue;
    sites.push([x, y]);
  }
  return { spots: out, secrets, sites };
})();
export const SPOTS: Spot[] = LAID.spots;
export const SECRETS: Secret[] = LAID.secrets;
/** The tiles where a sprite may have buried a chest (lib/town/hunt): which of them a map leads to is rolled by whoever keeps the game. */
export const DIG_SITES: ReadonlyArray<readonly [number, number]> = LAID.sites;
/** Whether a place's number is a secret place's. */
export const isSecret = (id: number): boolean => id >= SPOTS.length && id < SPOTS.length + SECRETS.length;
/** The place of a number, one everybody has or a secret one; none, for a number that is no place's. */
export const placeAt = (id: number): Place | null => SPOTS[id] ?? SECRETS[id - SPOTS.length] ?? null;
/** What a place is, as rules: its kind's. */
export const ruleOf = (place: Pick<Place, "kind">): Kind => (KINDS as Record<string, Kind>)[place.kind] ?? (SECRET_KINDS as Record<string, Kind>)[place.kind];
/** The two games a secret place takes, in their order; none, of a place everybody has. */
export const gamesOf = (place: Pick<Place, "kind">): [Gather, Gather] | null => { const r = (SECRET_KINDS as Record<string, SecretRule | undefined>)[place.kind]; return r ? [r.how, r.then] : null; };

/* ── what a place has ───────────────────────────────────────────────────── */

const MINUTE = 60_000;
/** The minute of its turn a place begins at: its own, so that the forest never changes all at once. */
const phaseOf = (spot: Place) => Math.floor(roll("phase", spot.id) * ruleOf(spot).every) * MINUTE;
/** The turn a place is in at a moment, and the moment a turn of its begins. */
export const turnOf = (spot: Place, now: number) => Math.floor((now + phaseOf(spot)) / (ruleOf(spot).every * MINUTE));
export const turnStart = (spot: Place, turn: number) => turn * ruleOf(spot).every * MINUTE - phaseOf(spot);
/** Whether the moon is full at a moment: as the river's fish have it (lib/town/fishing). */
export const fullMoon = (now: number) => signsOf({ now, spent: false, others: 0, wet: 0 }, false).includes("full");
/** Whether a day is one of a rare thing's own. */
export const isDayOf = (salt: string, item: ItemId, chance: number, now: number) => roll(`${salt}:day:${item}`, dayOf(now)) < chance;

/** Whether a find may be at a place in the turn that begins at a moment. */
function fits(f: Find, spot: Place, at: number, salt: string, rains: readonly Rain[]): boolean {
  if (f.zones && !f.zones.includes(spot.zone)) return false;
  if (f.hours) { const h = ((((at + BANGKOK) % DAY) + DAY) % DAY) / HOUR; if (!f.hours.some(([a, b]) => h >= a && h < b)) return false; }
  if (f.rain && wetMs(rains, at - f.rain * HOUR, at) <= 0) return false;
  if (f.day && !isDayOf(salt, f.item, f.day, at)) return false;
  if (f.moon && !fullMoon(at)) return false;
  return true;
}

/** What a place has in a turn: the turn, the thing, and how many of it a gathering gives at the most. */
export interface Held { turn: number; item: ItemId; n: number }

/**
 * What a place has now, or null for nothing: decided as its turn begins, by where it is, the hour, the sky and the
 * day then, and rolled from the keeper's word, the place and the turn. The same for everybody who looks.
 */
export function holds(salt: string, spot: Place, now: number, rains: readonly Rain[] = DRY): Held | null {
  const kind = ruleOf(spot), turn = turnOf(spot, now), at = turnStart(spot, turn);
  if (roll(`${salt}:has`, spot.id, turn) >= kind.chance) return null;
  const may = kind.finds.filter((f) => fits(f, spot, at, salt, rains));
  let left = roll(`${salt}:what`, spot.id, turn) * may.reduce((t, f) => t + f.weight, 0);
  const f = may.find((m) => (left -= m.weight) < 0) ?? may[may.length - 1];
  if (!f) return null;
  return { turn, item: f.item, n: f.n[0] + Math.floor(roll(`${salt}:n`, spot.id, turn) * (f.n[1] - f.n[0] + 1)) };
}

/**
 * A place as somebody sees it now: which, how many of its thing a gathering gives at the most, and the thing itself;
 * but for what is buried, which is seen only when it has been dug out (`item` is null).
 */
export interface Sight { id: number; item: ItemId | null; n: number }
/**
 * Every place that has something for me now: something there this turn, with a share of it left, that I have not
 * taken from. `took` says, of a place's turn, how many have taken from it and whether I am one.
 *
 * `lit`: I wear the firefly lantern (lib/town/gifts' charmFirefly). Then what is buried is seen too, and the secret
 * places of the deep woods are among the places: nobody else is told either.
 */
export function sights(salt: string, now: number, rains: readonly Rain[], took: (spot: Place, turn: number) => { n: number; mine: boolean }, lit = false): Sight[] {
  const out: Sight[] = [];
  for (const spot of lit ? [...SPOTS, ...SECRETS] : SPOTS) {
    const has = holds(salt, spot, now, rains);
    if (!has) continue;
    const t = took(spot, has.turn), kind = ruleOf(spot);
    if (t.mine || t.n >= kind.shares) continue;
    out.push({ id: spot.id, item: kind.how === "dig" && !lit ? null : has.item, n: has.n });
  }
  return out;
}
/** Whether somebody's firefly lantern is lit: it is worn. */
export const lanternLit = (purse: Pick<Purse, "gifts">): boolean => wearing(purse, "charmFirefly");

/**
 * How good a thing of the forest's is, by what the relatives pay for it: common, uncommon, or rare. What grows
 * everywhere and lies about is common; what wants rain, the night, the deep woods or a hoe's luck is not.
 */
export type WildTier = "common" | "uncommon" | "rare";
export const WILD_TIERS = { uncommon: 5, rare: 40 } as const;
export const wildTier = (item: ItemId): WildTier => { const pays = ITEMS[item]?.pays ?? 0; return pays >= WILD_TIERS.rare ? "rare" : pays >= WILD_TIERS.uncommon ? "uncommon" : "common"; };
/**
 * How much harder a thing's game is for somebody with so many points on the forest's line (lib/town/gifts'
 * harderFor: from the fourth rank, so much a rank): for what is uncommon or better, and 1 for what is common, and
 * for a thing that is not known (what lies buried and unseen is dug as by anybody: how hard it is would tell what
 * it is). What "harder" is, is each game's own: a patch that goes dim sooner (lib/town/choosing), fewer strokes to
 * spare (lib/town/digging), fruit that falls quicker and closer together (lib/town/catching).
 */
export const harderOf = (item: ItemId | null, points: number): number => (item && wildTier(item) !== "common" ? harderFor("forest", points) : 1);

/* ── gathering ──────────────────────────────────────────────────────────── */

/** Why something of the forest's was not gathered, besides what a bag or a hand may lack: taken from already this turn, the last of it gone to others, or stood too far from. */
export type ForestRefusal = "had" | "bare" | "far";
/**
 * How a gathering's game went: what was missed (each is one fewer), and among mushrooms how many wrong ones were
 * taken. `with`: the gift it was asked to be done with, where the plain way was there to choose too (the piglet's
 * digging, "famPiglet"). `lost`: at a secret place, the two games were not both won (one was failed, or left).
 */
export interface Outcome { misses: number; wrong: number; with?: string | null; lost?: boolean }

/** Whether somebody on a tile is near enough a place to gather from it (`reach`: how far they reach, where it is not a tile). */
export const reaches = (spot: Pick<Place, "x" | "y">, at: readonly [number, number], reach: number = FORAGING.reach) => Math.max(Math.abs(at[0] - spot.x), Math.abs(at[1] - spot.y)) <= reach;
/**
 * Whether a squirrel fetches a kind of place's thing for somebody (lib/town/gifts' famSquirrel, the forest's second
 * rank): what lies on the ground, picked up with no game, while it follows them. It runs for it: from as far as it
 * fetches, and for none of its member's stamina. Everything else of a gathering is as by hand: each place once a
 * turn, a heap's shares, and room in the bag.
 */
export const fetches = (purse: Pick<Purse, "gifts">, how: Gather): boolean => how === "pick" && works(purse, "famSquirrel");
/** How far somebody reaches a kind of place from, in tiles: a tile; as far as their squirrel fetches; or, whatever the place, as far as is reached from a moss stag's back. */
export const reachOf = (purse: Pick<Purse, "gifts">, how: Gather): number => (fetches(purse, how) ? FORAGING.squirrel : works(purse, "famStag") ? FORAGING.stag : FORAGING.reach);
/** The stamina a gathering of a kind of place costs somebody: its own; none of theirs when the squirrel fetches it. */
export const costFor = (purse: Pick<Purse, "gifts">, kind: Kind): number => (fetches(purse, kind.how) ? 0 : kind.cost);
/**
 * Whether a truffle piglet may dig for somebody now (lib/town/gifts' famPiglet, the forest's third rank): it follows
 * them, and has a hole left of its count to these hours. Its digging takes no hoe, bruises nothing (the game's own:
 * lib/town/digging's `gentle`), and one more comes out of the hole. Past its count, digging is as for anybody.
 */
export const pigletDigs = (purse: Pick<Purse, "gifts">, now: number): boolean => works(purse, "famPiglet") && usesLeft(purse, "famPiglet", now) > 0;
/** Whether a gathering of a kind is offered with a thing in the hand: digging takes a hoe, the rest only hands. */
export const mayGather = (kind: SpotKind, hand: ItemId | null) => KINDS[kind].how !== "dig" || (!!hand && HOES.includes(hand));

/**
 * Gather what a place has. `taken` is how many have taken from it this turn, `mine` whether I am one of them; `at`
 * is the tile I stand on. What comes of it is what the place has, less one for every miss (never none); among
 * mushrooms every wrong one taken is a toadstool besides, up to so many. All of it has to fit in the bag.
 *
 * Asked of the piglet (`play.with`), what is buried is dug with no hoe held and one more comes out of the hole; it is
 * one of the piglet's holes of these hours, and refused when it has none left or does not follow (nothing is lost:
 * the hoe's way is still there).
 *
 * A secret place is there only for whoever wears the firefly lantern. Its two games won with not one miss, it gives
 * all it has, and the place is in the record of those I have gathered from (`purse.forest.secrets`); anything else
 * (`lost`) and my turn at it is spent for its stamina, with nothing got. It takes no hoe.
 */
export function gather(purse: Purse, spot: Place, has: Held | null, taken: number, mine: boolean, hand: ItemId | null, at: readonly [number, number], play: Outcome, now: number):
  Done<{ purse: Purse; got: Array<[ItemId, number]>; lost?: boolean }> | { ok: false; why: ForestRefusal | GiftRefusal } {
  const kind = ruleOf(spot), secret = isSecret(spot.id);
  if (!has || (secret && !lanternLit(purse))) return no("none");
  if (mine) return { ok: false, why: "had" };
  if (taken >= kind.shares) return { ok: false, why: "bare" };
  if (!reaches(spot, at, reachOf(purse, kind.how))) return { ok: false, why: "far" };
  if (secret) {
    const spent = spend(purse, kind.cost, now);
    if (play.lost || Math.floor(play.misses) > 0 || Math.floor(play.wrong) > 0) return { ok: true, purse: spent, got: [], lost: true };
    if (roomFor(purse.bag, has.item) < has.n) return no("full");
    const found = Array.isArray(purse.forest?.secrets) ? purse.forest.secrets : [];
    return { ok: true, purse: { ...spent, bag: put(purse.bag, has.item, has.n), forest: { ...purse.forest, secrets: found.includes(spot.id) ? found : [...found, spot.id].sort((x, y) => x - y) } }, got: [[has.item, has.n]] };
  }
  const piglet = kind.how === "dig" && play.with === "famPiglet";
  let mine_ = purse;
  if (piglet) {
    const used = useGift(purse, "famPiglet", now);
    if (!used.ok) return { ok: false, why: used.why };
    mine_ = used.purse;
  } else if (!mayGather(spot.kind as SpotKind, hand)) return no("tool");
  const n = Math.max(1, has.n - Math.max(0, Math.floor(play.misses))) + (piglet ? numberOf("famPiglet") : 0);
  const wrong = spot.kind === "mushrooms" ? Math.min(FORAGING.decoys, Math.max(0, Math.floor(play.wrong))) : 0;
  if (roomFor(purse.bag, has.item) < n) return no("full");
  let bag = put(purse.bag, has.item, n);
  if (wrong) {
    if (roomFor(bag, FORAGING.decoy) < wrong) return no("full");
    bag = put(bag, FORAGING.decoy, wrong);
  }
  return { ok: true, purse: { ...spend(mine_, costFor(purse, kind), now), bag }, got: wrong ? [[has.item, n], [FORAGING.decoy, wrong]] : [[has.item, n]] };
}

/** The game a gathering is: one of its own for what is chosen, dug and shaken down; none for what is picked up, but with no stamina left, when it is steadied like the farm's light work. */
export type ForestGame = "choosing" | "digging" | "catching" | "steady";
export const gameFor = (how: Gather, spent: boolean): ForestGame | null =>
  (how === "choose" ? "choosing" : how === "dig" ? "digging" : how === "shake" ? "catching" : spent ? "steady" : null);
