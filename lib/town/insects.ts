import { FARMING, roll, see, type FarmSky, type Plot } from "./farm";
import { SPOTS, fullMoon, isDayOf } from "./forest";
import { luckOf, netFx, partOf, slowPartOf } from "./forged";
import { toolPaid } from "./forged-keep";
import { softStep } from "./forest-eye";
import { famBy, numberOf, useGift, wearing, type GiftRefusal } from "./gifts";
import { ITEMS, type ItemId } from "./items";
import { buffBy, isSpent, spend } from "./stamina";
import { BANGKOK, DAY, HOUR, heldStack, no, put, roomFor, type Done, type Purse } from "./trade";
import { DRY, wetMs, type Rain } from "./weather";
import { CAMP, COLS, FARM, FOREST, FOREST_PROPS, GATES, PROPS, ROWS, WATERFALL, WELL, asBuilt, groundAt, placeOf, plotAt, walkable, zoneAt, type Place, type Vec, type Zone } from "./world";

/**
 * Catching insects, as rules (the owner, 2026-10-05: "จับแมลง ในทุกแมพในเกม แมพกลางเมือง
 * ฟาร์ม ป่า จะมีแมลงออกมา เช่น ผีเสื้อ ตั๊กแตน สามารถใช้ที่จับแมลงจับมาได้ แต่ต้องวิ่งไปจับให้ทัน
 * (แมลงจะพยายามหนีถ้ามีคนเข้าไปไกล้) เนื่องจากความเร็วเคลื่อนที่เท่ากันหมด อาจต้องออกแบบ game
 * play ให้ อาศัยความแม่นยำ ในการเดินเข้าไปจับ"). The insects themselves are lib/town/items'.
 *
 * - **Insects keep to haunts** (`HAUNTS`), laid out over the three maps by a
 *   fixed seed: flowers, a lamp, the water's edge, a field, a tree, the litter
 *   of the forest's floor, a glade, the foot of the waterfall. A haunt has a
 *   few perches about it, which are where its insect sits, hovers, hides or
 *   flies between.
 * - **Time at a haunt goes in turns**, as at a place of the forest's
 *   (lib/town/forest): in a turn a haunt has one insect or none, rolled from
 *   the haunt, the turn and the keeper's word, by where it is, the hour, the
 *   sky, the moon and (for the rare ones) whether today is a day of theirs.
 *   The same for everybody, and caught once: whoever's net takes it has it,
 *   and it is gone from everybody's map (`shares`, one). A little later
 *   another comes out at some other haunt of that map (`comeback`), once.
 * - **Each insect has a habit**, and a habit is the whole of how it is caught.
 *   Nobody is told them: a butterfly never stops, and is met where it will be;
 *   a dragonfly hovers and darts on, and is waited for; a grasshopper sees far
 *   before it and hardly at all behind; a cricket is heard and not seen, and
 *   falls quiet while anybody near it walks; a stick insect lies among sticks;
 *   a moth goes round a lamp; a beetle comes down its tree only to somebody
 *   who stands under it with something sweet in the hand, and that hand
 *   cannot hold a net; a ladybird only walks.
 * - **The net is slow**: a swing lands a moment after it is begun (`NET.lands`)
 *   where it was aimed, and takes what is under its ring then. Everybody walks
 *   as fast as everybody else, so nothing is run down: it is the aim that
 *   catches. With no stamina the ring is much smaller and the net slower, and
 *   an insect missed twice is off (`NET.tired`).
 * - **What a screen shows is the screen's own**: where an insect is at a
 *   moment follows from its seed and the clock where it can (a butterfly's
 *   round, a moth's, a ladybird's walk), and from who is near on that screen
 *   where it cannot. The database is asked only at a catch, and believes the
 *   hand for it as it does for any game: that the insect was there this turn,
 *   that the member had not had it, the net, the bag and the stamina are its own
 *   to check.
 *
 * Pure, like the rest. Every number is a knob for the database.
 */

/** How an insect is caught: by what it does. */
export type Habit = "path" | "spot" | "behind" | "sound" | "look" | "lamp" | "lure" | "crawl";
/** What a haunt is. */
export type HauntKind = "blooms" | "water" | "field" | "lamp" | "tree" | "litter" | "glade" | "falls";
export type BugId =
  | "butterflyWhite" | "monarch" | "morpho" | "dragonfly" | "damselfly" | "glassDragonfly" | "grasshopper" | "mantis" | "cricket" | "cicada"
  | "stickInsect" | "leafInsect" | "firefly" | "orchidMantis" | "moth" | "lunaMoth" | "hawkMoth"
  | "rhinoBeetle" | "stagBeetle" | "jewelBeetle" | "herculesBeetle" | "ladybird" | "scarab" | "caterpillar";

/** An insect: its habit, where it keeps, how often beside the others there, and what has to hold for it to be out at all. */
export interface Bug {
  habit: Habit;
  at: HauntKind[];
  weight: number;
  /** How many a catch puts in the bag, least and most. */
  n: [number, number];
  /** The stamina a catch costs. */
  cost: number;
  /** How much of the net's ring takes it: less for the small ones. */
  size: number;
  /** How much quicker than its habit's own pace it is. */
  quick?: number;
  places?: Place[];
  zones?: Zone[];
  /** Only in these hours, in Bangkok, as [from, to) pairs. */
  hours?: Array<[number, number]>;
  /** Not when it has rained within the half hour. */
  dry?: boolean;
  /** Only on a day of its own: the chance that a day is one. */
  day?: number;
  /** Only when the moon is full. */
  moon?: boolean;
  /** (what sees) It turns to whoever is nearest each time it looks about. */
  tracks?: boolean;
  /** (what sings) What somebody walking near it does: it falls quiet until they stand still, or, walked up to while it is quiet, it is off. */
  shy?: "hush" | "flight";
  /** (what hides) The picture it is taken for, which lies at its haunt's other perches; none for what is only seen when it glows. */
  like?: string;
  /** The chance that catching one takes a pest off some plant of the farm with it (`pestToRid`). */
  rids?: number;
}

const DAYTIME: Array<[number, number]> = [[6, 18]], NIGHT: Array<[number, number]> = [[19, 24], [0, 5]];
/**
 * The twenty-four of them (the owner asked for twice the twelve first listed, and of no one country). The rare ones
 * are rare by their weight beside the others of their haunt, by a day of their own, or by the moon: a few of each on
 * a day of theirs over the whole map, never a haunt that has one every turn.
 */
export const BUGS: Record<BugId, Bug> = {
  // never still: met where it will be
  butterflyWhite: { habit: "path", at: ["blooms", "field"], weight: 100, n: [1, 1], cost: 1, size: 0.85, hours: DAYTIME, dry: true },
  monarch: { habit: "path", at: ["blooms"], weight: 160, n: [1, 1], cost: 1, size: 0.85, places: ["town"], hours: DAYTIME, dry: true, day: 0.25 },
  morpho: { habit: "path", at: ["glade"], weight: 100, n: [1, 1], cost: 3, size: 0.75, quick: 1.3, hours: DAYTIME, dry: true, day: 0.3 },
  // hovers, and darts on: waited for
  dragonfly: { habit: "spot", at: ["water"], weight: 100, n: [1, 1], cost: 1, size: 0.85, hours: [[6, 19]] },
  damselfly: { habit: "spot", at: ["water"], weight: 55, n: [1, 1], cost: 2, size: 0.6, quick: 1.7, places: ["forest"], hours: [[6, 19]] },
  glassDragonfly: { habit: "spot", at: ["falls"], weight: 100, n: [1, 1], cost: 3, size: 0.6, quick: 1.5, hours: [[5, 10]], day: 0.25 },
  // sees before it, not behind
  grasshopper: { habit: "behind", at: ["field"], weight: 100, n: [1, 1], cost: 1, size: 0.9, hours: DAYTIME },
  // (twice as many of it since 2026-10-06, with the ladybird: below)
  mantis: { habit: "behind", at: ["field"], weight: 50, n: [1, 1], cost: 3, size: 0.9, places: ["farm"], hours: DAYTIME, tracks: true },
  // heard, not seen
  cricket: { habit: "sound", at: ["field"], weight: 100, n: [1, 2], cost: 1, size: 0.75, hours: NIGHT, shy: "hush" },
  cicada: { habit: "sound", at: ["tree"], weight: 100, n: [1, 1], cost: 2, size: 0.85, hours: [[8, 18]], dry: true, shy: "flight" },
  // there to be seen, by whoever looks
  stickInsect: { habit: "look", at: ["litter"], weight: 100, n: [1, 1], cost: 2, size: 0.6, zones: ["woods", "bamboo", "rise"], like: "twig" },
  leafInsect: { habit: "look", at: ["litter"], weight: 100, n: [1, 1], cost: 2, size: 0.6, zones: ["deep"], like: "decoyLeaf" },
  firefly: { habit: "look", at: ["water"], weight: 100, n: [1, 1], cost: 2, size: 0.75, hours: NIGHT, dry: true },
  orchidMantis: { habit: "look", at: ["blooms"], weight: 2, n: [1, 1], cost: 3, size: 0.6, places: ["forest"], hours: DAYTIME, like: "wildflower" },
  // round a light
  moth: { habit: "lamp", at: ["lamp"], weight: 100, n: [1, 1], cost: 1, size: 0.9, hours: NIGHT, dry: true },
  lunaMoth: { habit: "lamp", at: ["lamp"], weight: 15, n: [1, 1], cost: 3, size: 0.9, places: ["forest"], hours: NIGHT, dry: true, moon: true },
  hawkMoth: { habit: "lamp", at: ["lamp"], weight: 4, n: [1, 1], cost: 3, size: 0.8, quick: 1.3, hours: NIGHT, dry: true, day: 0.25 },
  // comes down only to something sweet, held by a hand that then cannot hold a net
  rhinoBeetle: { habit: "lure", at: ["tree"], weight: 100, n: [1, 1], cost: 2, size: 1, hours: NIGHT },
  stagBeetle: { habit: "lure", at: ["tree"], weight: 12, n: [1, 1], cost: 3, size: 1, zones: ["deep"], hours: NIGHT },
  jewelBeetle: { habit: "lure", at: ["tree"], weight: 6, n: [1, 1], cost: 3, size: 0.8, hours: [[10, 16]], day: 0.25 },
  herculesBeetle: { habit: "lure", at: ["tree"], weight: 3, n: [1, 1], cost: 3, size: 1, zones: ["deep"], hours: NIGHT, day: 0.1 },
  // only walks
  // (out the whole of the day, as the pests are; and now and then one caught takes a pest off some plant with it: the
  // owner, 2026-10-05, "จะสุ่มโอกาศเล็กน้อย ประมาณ 10% ที่จะลดแมลงที่กินพืชอยู่ในแปลงได้แบบสุ่ม")
  // (few of them, and on every map: the same afternoon the village was running after them, and he had them come
  // seldom and anywhere, "ลดการ spawn ของเต่าทอง … สุ่มเกิดทุกแมพ ในปริมาณที่ลดลง". It weighed 60 on the farm and in the
  // town: one haunt in five there by day, and every one that had anything at dawn and in the rain, when nothing
  // else of those haunts is out. So it keeps the others' hours and sky, and is never the only one at a haunt.)
  // (twice as many of it and of the mantis from 2026-10-06, when he had the two eat pests again, lib/town/farm's
  // FARMING.rids: "เพิ่มจำนวนแมลงสองตัวนี้ไปอีกเท่า แต่ยังคงทำให้การยิ่งจับยิ่งน้อยยังมีอยู่". A weight is a share, so twice the
  // weight is a little short of twice as many: 13 for 6 and 50 for 22 are what a dry day's haunts roll twice as
  // often, about eight ladybirds an hour over the three maps for four, and eight mantises on the farm for four.
  // Hunted, each grows scarce as every insect does: SCARCE is not touched.)
  ladybird: { habit: "crawl", at: ["field", "blooms"], weight: 13, n: [1, 1], cost: 1, size: 1, hours: DAYTIME, dry: true, rids: 0.1 },
  scarab: { habit: "crawl", at: ["field"], weight: 30, n: [1, 1], cost: 1, size: 1, places: ["farm"], hours: DAYTIME },
  caterpillar: { habit: "crawl", at: ["litter", "blooms"], weight: 45, n: [1, 1], cost: 1, size: 1, places: ["forest"], hours: DAYTIME },
};
export const BUG_IDS = Object.keys(BUGS) as BugId[];
export const isBug = (id: string | null | undefined): id is BugId => !!id && id in BUGS;

/**
 * What an insect is among the others: common, uncommon or rare, by what the relatives pay for one (so many coins and
 * more; the rare ones' mark is the one a catch counts eight points from, lib/town/line-points). Nine are common
 * (the white butterfly, the monarch, the dragonfly, the grasshopper, the cricket, the moth, the ladybird, the scarab,
 * the caterpillar), seven uncommon, eight rare. **The marks are mine.**
 */
export type BugTier = "common" | "uncommon" | "rare";
export const TIERS = { uncommon: 4, rare: 20 } as const;
export const tierOf = (id: BugId): BugTier => { const pays = ITEMS[id].pays; return pays >= TIERS.rare ? "rare" : pays >= TIERS.uncommon ? "uncommon" : "common"; };
/**
 * How much harder an insect is for somebody who is good at the line (lib/town/gifts' `harderFor("insects", points)`:
 * from the line's fourth rank, 8% a rank): nothing for a common one, whoever catches it. What harder is, for an
 * insect: **it knows of them from that much further off** (`sensed`), and **the net's ring on it is that much
 * narrower** (`ringOf`). Both are judged where a catch is: on the page, as the ring and the fright always were.
 */
export const harderOn = (id: BugId, harder = 1): number => (tierOf(id) === "common" ? 1 : Math.max(1, harder || 1));

/**
 * A kind of haunt: how many minutes its turn lasts, the chance a turn has an insect, and how many people may catch it
 * in a turn. One, since 2026-10-05 (three before): an insect caught is gone for everybody (the owner: "เมื่อจับแมลงแล้ว
 * ช่วยทำให้หายไปจากแมพ ในหน้าจอคนอื่นด้วย").
 */
// **Twice as many insects since 2026-10-07** (the owner, trying the gifts: "เพิ่มปริมาณแมลง … เป็นสองเท่า", and of the forest's
// things, "เท่าเดิม"). Every kind of haunt rolls an insect twice as often as it did, to the number, by both of its
// numbers: a turn is shorter (7 minutes where it was 10, 14 where it was 20; a glade's 30 where it was 60, the falls'
// 15 where it was 30) and, at the common haunts, likelier to have one (about seven or eight turns in ten where it was
// five or six). Both, because each alone falls short: a haunt holds one insect a turn, its own or one that came back
// after a catch elsewhere (COMEBACK), so the turns bound what a map hunted hard can give, and the chance what is seen
// at a glance. So about 1.4 times as many are out at any moment, a map hunted hard can give 1.4 times (2 at the glades
// and the falls) what it could, and twice as many are rolled in a day. (Before: blooms 10 / 0.55, water 10 / 0.5,
// field 10 / 0.55, lamp 10 / 0.6, tree 20 / 0.5, litter 20 / 0.5, glade 60 / 0.25, falls 30 / 0.3. The database reads
// these from the catalog's row: nothing of its rules changes.)
export const HAUNT_KINDS: Record<HauntKind, { every: number; chance: number; shares: number }> = {
  blooms: { every: 7, chance: 0.77, shares: 1 },
  water: { every: 7, chance: 0.7, shares: 1 },
  field: { every: 7, chance: 0.77, shares: 1 },
  lamp: { every: 7, chance: 0.84, shares: 1 },
  tree: { every: 14, chance: 0.7, shares: 1 },
  litter: { every: 14, chance: 0.7, shares: 1 },
  glade: { every: 30, chance: 0.25, shares: 1 },
  falls: { every: 15, chance: 0.3, shares: 1 },
};
/**
 * An insect caught comes back somewhere else (the owner, the same day: "หลังจากนั้น จะมี delay เล็กน้อยก่อนสุ่มเกิดที่ใหม่"):
 * so many seconds after the catch, at another haunt of the same map that has nothing in its turn, which must have at
 * least so many seconds of that turn left. Once: what came back and is caught does not come back again, so that a
 * map gives at most twice what its haunts roll, however many hunt it.
 */
export const COMEBACK = { after: 30, least: 120 };
/**
 * Hunted, an insect grows scarce, and left alone it comes back (the owner, 2026-10-05, with the village running after
 * ladybirds: "adapt ไปกับทุกแมลงเลย ยิ่งโดนจับเยอะ ยิ่งหายาก พอเวลาผ่านไปนานพอ (1วัน) ค่อยกลับมาปกติ"). Every insect caught in the
 * village counts against its kind: wholly at first, less with every hour, and not at all once `day` hours have gone
 * by. With `half` of them counting, the kind is out half as often as its haunts roll it; with twice that, a third as
 * often; with three times, a quarter (`plentyOf`). A haunt whose insect is not out for that has none that turn:
 * nothing else takes its place, so that a kind hunted alone at its haunts grows scarce too. `half` is mine, his to
 * change: twenty is a morning's catch of the commonest insect by the whole village on the insects' first day.
 */
export const SCARCE = { day: 24, half: 20 };

export const NET = {
  /** How far from where one stands a swing can be aimed, in tiles. */
  reach: 2.4,
  /** How long after it is begun a swing lands, in milliseconds; and how soon after that another can begin. */
  lands: 300, again: 350,
  /** The ring a net takes what is under, in tiles across its half. */
  radius: 0.6,
  /**
   * With no stamina: the ring as a share of that, how long the swing takes, and how many swings that miss an insect
   * it stays for: at that many it is off, and whoever missed it does not see it again for the rest of its turn.
   *
   * The owner, 2026-10-05: "การจับแมลงควรต้องทำให้ยากกว่านี้ตอน stamina หมด" (it was a ring of 0.65, 450 ms and any number of
   * misses: the members took one swing in two with none, against two in three with some, and one of them had caught
   * 17 of 22 insects with none, which cost nothing). Set by hands fitted to the members' own swings (read from the
   * deeds): of the insects tried with none, a member's hand now takes about 42 in 100, a practised one 64, a very good
   * one 99; a butterfly and a moth, hardly any but for the very good. As tired fishing is (42, 77, 97).
   */
  tired: { radius: 0.4, lands: 600, misses: 2 },
  /** How many misses before a catch are counted against it, a point of stamina each. */
  misses: 2,
  /** How near a miss has to land for an insect to mind it. */
  near: 1.3,
  /** How far from a haunt's nearest perch somebody may stand and still have caught what is there. */
  far: 4,
};
/** What catches an insect, held in the hand. */
export const NETS: ItemId[] = ["bugNet"];
/** What brings a beetle down its tree, held in the hand of somebody standing still under it. */
export const LURES: ItemId[] = ["resin", "wildApple"];
export const mayNet = (hand: ItemId | null) => !!hand && NETS.includes(hand);

/* ── the haunts ─────────────────────────────────────────────────────────── */

/** A haunt: its number, its kind, the map it is on and the part of the forest, its middle, and the perches about it. */
export interface Haunt { id: number; kind: HauntKind; place: Place; zone: Zone | null; x: number; y: number; perches: Vec[] }

const far = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

// (laid out with the deck and the yard finished, as the database's row of them was: lib/town/world's asBuilt)
export const HAUNTS: Haunt[] = asBuilt(() => {
  let a = 20261007;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // what can be walked to on each map, from where its gate puts somebody
  const open = new Set<string>();
  const flood = (start: Vec, place: Place) => {
    const first: [number, number] = [Math.floor(start.x), Math.floor(start.y)], queue = [first];
    open.add(first.join(","));
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (!open.has(k) && placeOf(x + dx, y + dy) === place && walkable(x + dx, y + dy)) { open.add(k); queue.push([x + dx, y + dy]); }
      }
    }
  };
  for (const place of ["town", "farm", "forest"] as Place[]) flood(GATES.find((g) => g.leads === place)!.to, place);
  const stands = (x: number, y: number) => open.has(`${x},${y}`);
  /** Whether somebody can stand within a step of a point. */
  const by = (p: Vec) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (stands(Math.floor(p.x) + dx, Math.floor(p.y) + dy)) return true; return false; };
  const wet = (x: number, y: number) => groundAt(x, y) === "water";
  const shore = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => wet(x + dx, y + dy));
  const out: Haunt[] = [];
  const clear = (x: number, y: number, apart: number) => out.every((h) => Math.hypot(h.x - x - 0.5, h.y - y - 0.5) >= apart);

  /** A few perches about a tile: within a step of somewhere to stand, on the same map, dry (but at the water's edge, where they may be over it), a little apart, and in order round the middle. */
  const about = (x: number, y: number, kind: HauntKind, place: Place, n = 5, reach = 2.4): Vec[] => {
    const c = { x: x + 0.5, y: y + 0.5 }, ps: Vec[] = [];
    for (let tries = 0; ps.length < n && tries < 90; tries++) {
      const ang = rnd() * Math.PI * 2, r = 0.8 + rnd() * (reach - 0.8), p = { x: Math.round((c.x + Math.cos(ang) * r) * 100) / 100, y: Math.round((c.y + Math.sin(ang) * r) * 100) / 100 };
      const tx = Math.floor(p.x), ty = Math.floor(p.y);
      if (placeOf(tx, ty) !== place || !by(p) || (kind !== "water" && kind !== "falls" && wet(tx, ty)) || ps.some((q) => far(p, q) < 1)) continue;
      ps.push(p);
    }
    return ps.sort((p, q) => Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(q.y - c.y, q.x - c.x));
  };
  const add = (kind: HauntKind, place: Place, x: number, y: number, perches: Vec[]) =>
    out.push({ id: out.length, kind, place, zone: place === "forest" ? zoneAt(x, y) : null, x: x + 0.5, y: y + 0.5, perches });
  /** So many haunts of a kind on tiles picked at random from some, kept apart. */
  const scatter = (kind: HauntKind, place: Place, n: number, apart: number, tiles: Array<[number, number]>) => {
    for (let tries = 0, placed = 0; placed < n && tries < n * 300 && tiles.length; tries++) {
      const [x, y] = tiles[Math.floor(rnd() * tiles.length)];
      if (!clear(x, y, apart)) continue;
      const ps = about(x, y, kind, place);
      if (ps.length < 4) continue;
      add(kind, place, x, y, ps);
      placed++;
    }
  };
  const tilesOf = (r: { x: number; y: number; w: number; h: number }, fits: (x: number, y: number) => boolean) => {
    const all: Array<[number, number]> = [];
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (fits(x, y)) all.push([x, y]);
    return all;
  };

  // the town: its flowers, its lamps, and its bank of the river
  const TOWN_ALL = { x: 0, y: 0, w: 64, h: 64 };
  scatter("blooms", "town", 8, 6, PROPS.filter((p) => (p.kind === "flowers" || p.kind === "flowerbed" || p.kind === "planter") && placeOf(p.x, p.y) === "town").map((p) => [p.x, p.y]));
  for (const p of PROPS.filter((q) => q.kind === "lamp" && placeOf(q.x, q.y) === "town")) {
    if (out.filter((h) => h.kind === "lamp").length >= 7 || !clear(p.x, p.y, 7) || !by({ x: p.x + 0.5, y: p.y + 0.5 })) continue;
    add("lamp", "town", p.x, p.y, [{ x: p.x + 0.5, y: p.y + 0.5 }]);
  }
  scatter("water", "town", 5, 8, tilesOf(TOWN_ALL, (x, y) => stands(x, y) && shore(x, y)));
  // the farm: its lanes and verges, and its well
  scatter("field", "farm", 14, 6, tilesOf(FARM, (x, y) => stands(x, y) && !plotAt(x, y) && Math.hypot(x - WELL.x, y - WELL.y) > 4));
  { const ps = about(WELL.x, WELL.y, "field", "farm", 5, 2.2); if (ps.length >= 4) add("water", "farm", WELL.x, WELL.y, ps); }
  // the forest: the meadow's flowers and grass, the stream, the fall, trees, the litter under them, the glades, the camp's fire
  const taken = (x: number, y: number) => SPOTS.some((s) => Math.hypot(s.x - x, s.y - y) < 2.5);
  const z = (x: number, y: number) => zoneAt(x, y)!;
  scatter("blooms", "forest", 9, 7, tilesOf(FOREST, (x, y) => stands(x, y) && z(x, y) === "edge" && groundAt(x, y) === "grass"));
  scatter("field", "forest", 5, 7, tilesOf(FOREST, (x, y) => stands(x, y) && z(x, y) === "edge" && groundAt(x, y) === "grass"));
  scatter("water", "forest", 9, 8, tilesOf(FOREST, (x, y) => stands(x, y) && z(x, y) === "stream" && shore(x, y) && Math.hypot(x + 0.5 - WATERFALL.x, y + 0.5 - WATERFALL.y) > 9));
  scatter("falls", "forest", 2, 4, tilesOf(FOREST, (x, y) => stands(x, y) && shore(x, y) && Math.hypot(x + 0.5 - WATERFALL.x, y + 0.5 - WATERFALL.y) < 7));
  scatter("litter", "forest", 14, 6, tilesOf(FOREST, (x, y) => stands(x, y) && groundAt(x, y) === "wood" && !taken(x, y) && ["woods", "bamboo", "rise", "deep"].includes(z(x, y))));
  scatter("glade", "forest", 4, 6, tilesOf(FOREST, (x, y) => stands(x, y) && z(x, y) === "deep" && groundAt(x, y) === "grass"));
  // (a tree's perches are trunks: its own, and the few nearest that somebody can stand beside)
  const trunks = FOREST_PROPS.filter((p) => (p.kind === "oak" || p.kind === "birch") && [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => stands(p.x + dx, p.y + dy)) && ["woods", "bamboo", "rise", "deep"].includes(z(p.x, p.y)));
  for (let tries = 0, placed = 0; placed < 16 && tries < 5000 && trunks.length; tries++) {
    const p = trunks[Math.floor(rnd() * trunks.length)];
    if (!clear(p.x, p.y, 6) || taken(p.x, p.y)) continue;
    const others = trunks.filter((q) => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 8).sort((q, r) => Math.hypot(q.x - p.x, q.y - p.y) - Math.hypot(r.x - p.x, r.y - p.y)).slice(0, 3);
    if (others.length < 2) continue;
    add("tree", "forest", p.x, p.y, [p, ...others].map((q) => ({ x: q.x + 0.5, y: q.y + 0.78 })));
    placed++;
  }
  add("lamp", "forest", CAMP.fire.x, CAMP.fire.y, [{ x: CAMP.fire.x + 0.5, y: CAMP.fire.y + 0.5 }]);
  return out;
});

/* ── what a haunt has ───────────────────────────────────────────────────── */

const MINUTE = 60_000;
const phaseOf = (h: Haunt) => Math.floor(roll("bugphase", h.id) * HAUNT_KINDS[h.kind].every) * MINUTE;
/** The turn a haunt is in at a moment, and the moment a turn of its begins. */
export const bugTurn = (h: Haunt, now: number) => Math.floor((now + phaseOf(h)) / (HAUNT_KINDS[h.kind].every * MINUTE));
export const bugTurnStart = (h: Haunt, turn: number) => turn * HAUNT_KINDS[h.kind].every * MINUTE - phaseOf(h);

/** Whether an insect may be at a haunt in the turn that begins at a moment (`always`: whatever day it is, for one that has days of its own). */
function fits(b: Bug, id: BugId, h: Haunt, at: number, salt: string, rains: readonly Rain[], always = false): boolean {
  if (!b.at.includes(h.kind)) return false;
  if (b.places && !b.places.includes(h.place)) return false;
  if (b.zones && (!h.zone || !b.zones.includes(h.zone))) return false;
  if (b.hours) { const hr = ((((at + BANGKOK) % DAY) + DAY) % DAY) / HOUR; if (!b.hours.some(([a, z]) => hr >= a && hr < z)) return false; }
  if (b.dry && wetMs(rains, at - HOUR / 2, at) > 0) return false;
  if (b.day && !always && !isDayOf(salt, id, b.day, at)) return false;
  if (b.moon && !fullMoon(at)) return false;
  return true;
}

/** What a haunt has in a turn: the turn, the insect, how many a catch gives, and the seed its ways follow from (no secret: it only says how it moves); whether it is one that came back there after a catch elsewhere; and whether it is there only for whoever wears the butterfly-wing cloak (`cloakAt`). */
export interface Swarm { turn: number; bug: BugId; n: number; seed: number; back?: boolean; cloak?: boolean }
/** An insect that comes back: at which haunt, in which turn of its, which insect and how many a catch gives, and from what moment it is there. */
export interface Comeback { haunt: number; turn: number; bug: BugId; n: number; from: number }

/** The insects that may be at a haunt in a turn of its, in the order they are weighed. */
const mayBe = (salt: string, h: Haunt, turn: number, rains: readonly Rain[]) => { const at = bugTurnStart(h, turn); return BUG_IDS.filter((id) => fits(BUGS[id], id, h, at, salt, rains)); };
/**
 * One of them, by their weights and a number from 0 up to 1; and where in that insect's own share of the weights the
 * number fell, from 0 up to 1 (which says nothing of which insect it is: it is as good a number of chance as another).
 */
function whichOf(may: BugId[], r: number): { bug: BugId; within: number } | undefined {
  let left = r * may.reduce((t, id) => t + BUGS[id].weight, 0);
  for (const id of may) { left -= BUGS[id].weight; if (left < 0) return { bug: id, within: (left + BUGS[id].weight) / BUGS[id].weight }; }
  const last = may[may.length - 1];
  return last ? { bug: last, within: 0 } : undefined;
}

/** A catch as the scarcity counts it: which insect, when, and how many it gave. */
export interface Hunt { bug: BugId; at: number; n: number }
/** Nobody has caught anything. */
export const UNHUNTED: readonly Hunt[] = [];
/**
 * How much of its usual self an insect is at a moment, from 1 (nobody has caught one in the day before) down towards
 * nothing: `half` over `half` and what counts against it, each catch before that moment counting for as much of
 * itself as is left of its day. (Whole numbers until the one division, so that the database's answer is this one to
 * the last digit.)
 */
export function plentyOf(hunts: readonly Hunt[], bug: BugId, at: number): number {
  const day = SCARCE.day * HOUR;
  let against = 0;
  for (const h of hunts) if (h.bug === bug && h.at < at && h.at > at - day) against += h.n * (day - (at - h.at));
  return (SCARCE.half * day) / (SCARCE.half * day + against);
}

/**
 * What a haunt has now, or null: decided as its turn begins, and rolled from the keeper's word, the haunt and the turn.
 * The same for everybody. `hunts` is what has been caught in the village of late: the insect the turn rolled is out
 * only as often as it is plentiful as the turn begins (so nothing caught during a turn changes what that turn has).
 */
export function swarmAt(salt: string, h: Haunt, now: number, rains: readonly Rain[] = DRY, hunts: readonly Hunt[] = UNHUNTED): Swarm | null {
  const kind = HAUNT_KINDS[h.kind], turn = bugTurn(h, now);
  if (roll(`${salt}:bug`, h.id, turn) >= kind.chance) return null;
  const one = whichOf(mayBe(salt, h, turn, rains), roll(`${salt}:which`, h.id, turn));
  if (!one || one.within >= plentyOf(hunts, one.bug, bugTurnStart(h, turn))) return null;
  const bug = one.bug, [lo, hi] = BUGS[bug].n;
  return { turn, bug, n: lo + Math.floor(roll(`${salt}:bugs`, h.id, turn) * (hi - lo + 1)), seed: h.id * 100003 + turn };
}

/** What a haunt has now, of its own or come back to it after a catch elsewhere (`backs`: those the keeper knows of). */
export function hereAt(salt: string, h: Haunt, now: number, rains: readonly Rain[], backs: readonly Comeback[], hunts: readonly Hunt[] = UNHUNTED): Swarm | null {
  const own = swarmAt(salt, h, now, rains, hunts);
  if (own) return own;
  const turn = bugTurn(h, now), back = backs.find((b) => b.haunt === h.id && b.turn === turn && b.from <= now);
  return back ? { turn, bug: back.bug, n: back.n, seed: h.id * 100003 + turn, back: true } : null;
}

/**
 * The butterfly-wing cloak (lib/town/gifts' charmCloak, the insects' sixth rank), its second half: "the rare insects
 * that are out only on some days are out for its wearer every day". What a haunt has in a turn **for whoever wears
 * the cloak and for nobody else**: the turn rolled as it is for everybody (the same numbers: whether anything is out,
 * which insect by the weights, how many), but with every insect that has days of its own counted in whatever day it
 * is. Where that roll lands on such an insect on a day that is not its own (and it is plentiful enough), the wearer
 * has it there, in the place of whatever everybody has; where it lands on anything else, there is no such insect,
 * and the wearer has what everybody has (`hereFor`). So a wearer sees a monarch, a morpho, a glass dragonfly, a hawk
 * moth, a jewel beetle or a Hercules beetle as often on any day as everybody does on a day of its own; what waits
 * for a full moon still waits for it. **It adds no insect to the world**: a haunt has one insect a turn for the whole
 * village, and whoever nets it first has had that turn's, whichever of the two they saw there.
 */
export function cloakAt(salt: string, h: Haunt, now: number, rains: readonly Rain[] = DRY, hunts: readonly Hunt[] = UNHUNTED): Swarm | null {
  const kind = HAUNT_KINDS[h.kind], turn = bugTurn(h, now), at = bugTurnStart(h, turn);
  if (roll(`${salt}:bug`, h.id, turn) >= kind.chance) return null;
  const one = whichOf(BUG_IDS.filter((id) => fits(BUGS[id], id, h, at, salt, rains, true)), roll(`${salt}:which`, h.id, turn));
  const day = one ? BUGS[one.bug].day : undefined;
  if (!one || !day || isDayOf(salt, one.bug, day, at)) return null;
  if (one.within >= plentyOf(hunts, one.bug, at)) return null;
  const [lo, hi] = BUGS[one.bug].n;
  return { turn, bug: one.bug, n: lo + Math.floor(roll(`${salt}:bugs`, h.id, turn) * (hi - lo + 1)), seed: h.id * 100003 + turn, cloak: true };
}
/** What a haunt has now for somebody: with the cloak, the insect that is there for its wearers alone, where there is one; else what it has for everybody. */
export const hereFor = (salt: string, h: Haunt, now: number, rains: readonly Rain[], backs: readonly Comeback[], hunts: readonly Hunt[] = UNHUNTED, cloak = false): Swarm | null =>
  (cloak ? cloakAt(salt, h, now, rains, hunts) : null) ?? hereAt(salt, h, now, rains, backs, hunts);

/**
 * Where the insect caught at a haunt comes back, and as what: at another haunt of the same map that has nothing in the
 * turn it will be in then (none of its own, none come back to it already), with enough of that turn left, picked by a
 * number from 0 up to 1 among them in the order of their numbers; the insect by that haunt's own weights at that hour
 * (a second number), and how many (a third). Null when the map has no such haunt. Whether a catch brings one back at
 * all is the keeper's to say: only one that was the haunt's own does. And the insect that would come back comes only
 * as often as it is plentiful at the catch (`hunts`, as for a haunt's own): hunted, a kind comes back seldom too.
 */
export function comeback(salt: string, from: Haunt, now: number, rains: readonly Rain[], backs: readonly Comeback[], r: readonly [number, number, number], hunts: readonly Hunt[] = UNHUNTED): Comeback | null {
  const at = now + COMEBACK.after * 1000;
  const free = HAUNTS.filter((h) => {
    if (h.id === from.id || h.place !== from.place) return false;
    const turn = bugTurn(h, at);
    if (bugTurnStart(h, turn + 1) - at < COMEBACK.least * 1000) return false;
    if (swarmAt(salt, h, at, rains, hunts) || backs.some((b) => b.haunt === h.id && b.turn === turn)) return false;
    return mayBe(salt, h, turn, rains).length > 0;
  });
  if (!free.length) return null;
  const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(x * n)));
  const h = free[pick(r[0], free.length)], turn = bugTurn(h, at), one = whichOf(mayBe(salt, h, turn, rains), Math.min(0.999999, Math.max(0, r[1])))!;
  if (one.within >= plentyOf(hunts, one.bug, now)) return null;
  const bug = one.bug, [lo, hi] = BUGS[bug].n;
  return { haunt: h.id, turn, bug, n: lo + pick(r[2], hi - lo + 1), from: at };
}

/** A haunt as somebody sees it now: which, its insect, and what its ways follow from. */
export interface BugSight { id: number; bug: BugId; turn: number; seed: number }
/** Every haunt that has an insect for me now: one out this turn (its own, or come back to it; with the cloak, the one that is there for its wearers), that nobody has caught. */
export function swarms(salt: string, now: number, rains: readonly Rain[], took: (h: Haunt, turn: number) => { n: number; mine: boolean }, backs: readonly Comeback[] = [], hunts: readonly Hunt[] = UNHUNTED, cloak = false): BugSight[] {
  const out: BugSight[] = [];
  for (const h of HAUNTS) {
    const has = hereFor(salt, h, now, rains, backs, hunts, cloak);
    if (!has) continue;
    const t = took(h, has.turn);
    if (t.mine || t.n >= HAUNT_KINDS[h.kind].shares) continue;
    out.push({ id: h.id, bug: has.bug, turn: has.turn, seed: has.seed });
  }
  return out;
}

/**
 * How many insects that eat plants are on the farm at a moment: the ones out at the farm's haunts (their own, or come
 * back there) that nobody has caught, less the kinds that eat pests (lib/town/farm's `FARMING.rids`: a ladybird or a
 * mantis on the farm harms nothing). What an hour of the pests' is counted as (lib/town/farm's `Swarms`; the owner,
 * 2026-10-06: "ทำให้ % การโจมตีสูงขึ้นถ้ามี แมลงอยู่ในแมพ ฟาร์ม แต่ถ้าไม่มีเลยก็เท่าเดิม"). `took` says how many have caught a
 * haunt's insect in a turn; `has`, when given, says what a haunt has (the trial's, whose scripts put insects there).
 */
export function farmBugs(salt: string, now: number, rains: readonly Rain[], took: (h: Haunt, turn: number) => number, backs: readonly Comeback[] = [], hunts: readonly Hunt[] = UNHUNTED,
  has: (h: Haunt) => Swarm | null = (h) => hereAt(salt, h, now, rains, backs, hunts)): number {
  let n = 0;
  for (const h of HAUNTS) {
    if (h.place !== "farm") continue;
    const out = has(h);
    if (!out || FARMING.rids[out.bug] !== undefined || took(h, out.turn) >= HAUNT_KINDS[h.kind].shares) continue;
    n++;
  }
  return n;
}

/* ── a catch ────────────────────────────────────────────────────────────── */

/** Why an insect was not caught, besides what a bag or a hand may lack: had already this turn, the last of them gone to others, stood too far from, or (a beetle) nobody under its tree with something sweet. */
export type BugRefusal = "had" | "bare" | "far" | "lure"
  | "out"    // a drop of nectar of mine is out already
  | "quiet"; // no insect is about this place at this hour for a drop to call

/** Whether somebody on a tile is near enough a haunt to have caught what is there. */
export const nearHaunt = (h: Haunt, at: readonly [number, number]) => h.perches.some((p) => Math.hypot(p.x - at[0] - 0.5, p.y - at[1] - 0.5) <= NET.reach + NET.far);

/**
 * Catch what a haunt has. `taken` is how many have caught it this turn, `mine` whether I am one of them; `at` is the
 * tile I stand on; `misses` the swings that came to nothing first, each a point of stamina, up to so many; `lure` what
 * somebody under the tree holds (a beetle comes down to nothing else).
 */
export function net(purse: Purse, h: Haunt, has: Swarm | null, taken: number, mine: boolean, hand: ItemId | null, at: readonly [number, number], misses: number, now: number, lure: ItemId | null = null):
  Done<{ purse: Purse; got: Array<[ItemId, number]> }> | { ok: false; why: BugRefusal } {
  if (!has) return no("none");
  if (mine) return { ok: false, why: "had" };
  if (taken >= HAUNT_KINDS[h.kind].shares) return { ok: false, why: "bare" };
  if (!mayNet(hand)) return no("tool");
  if (!nearHaunt(h, at)) return { ok: false, why: "far" };
  const bug = BUGS[has.bug];
  if (bug.habit === "lure" && !(lure && LURES.includes(lure))) return { ok: false, why: "lure" };
  if (roomFor(purse.bag, has.bug) < has.n) return no("full");
  const cost = bug.cost + Math.min(NET.misses, Math.max(0, Math.floor(misses)));
  // ── forging: old tools ── (a catch with a forged net in the hand: what its forging takes off the stamina, lib/town/forged-keep)
  const tool = heldStack(purse), paid = toolPaid(purse, spend(purse, cost, now), now, tool, netFx(tool), "ntFresh");
  // (and with a net that carries as much, another of its kind comes with the one caught so often, where the bag has room for it)
  const n = has.n + (luckOf("twin", h.id, has.turn, now) < netFx(tool).twin && roomFor(purse.bag, has.bug) > has.n ? 1 : 0);
  return { ok: true, purse: followed(purse, { ...paid, bag: put(purse.bag, has.bug, n) }, has.bug, has.n, at, now), got: [[has.bug, n]] };
}

/* ── the butterfly-wing cloak's pair (lib/town/gifts' charmCloak, the insects' sixth rank) ── */

/**
 * "A pair at a time: an insect caught has another following, to be netted within three seconds" (the owner's ladder
 * of 2026-10-07; and of what makes the game harder to match: "the cloak's pair (the second within 3 s)"). With the
 * cloak worn, every insect caught (a haunt's, or the one of a drop of nectar) leaves another of its kind in the air
 * where it was, its wearer's alone: kept in the purse (`follower`) with the moment it is off, so many seconds on
 * (the cloak's number). It wheels about the place of the catch (`followerPose`) and is netted there as any insect is:
 * the ring is its kind's, a good one's is narrower for a good hunter, and aimed badly the net misses. Not netted in
 * time there is only the one. The second of a pair has none following it.
 *
 * It is a catch like any (a `net` deed: its stamina, its kind's scarcity, the line's points), and the keeper judges
 * its time: so long past the three seconds it still takes the catch for the journey there and back (`slack`).
 * How it flies is mine: a figure of eight through the place of the catch, so far out at the most, so many turns of
 * its measure a second, quicker for the kinds that are quick.
 */
export const PAIR = { slack: 2500, radius: 0.9, turn: 1.7, lift: 0.5 };
/** The insect that follows one just caught: its kind, how many a catch gives, the tile its catcher stood on, and the moment it is off. */
export type Follower = NonNullable<Purse["follower"]>;
/** A purse after a catch, with what follows the insect caught when the cloak is worn (as the purse was before the catch); without it, the purse as it is. */
export function followed<P extends Purse>(before: Purse, after: P, bug: BugId, n: number, at: readonly [number, number], now: number): P {
  return wearing(before, "charmCloak") ? { ...after, follower: { bug, n, at: [at[0], at[1]], until: now + numberOf("charmCloak") * 1000 } } : after;
}
/** The insect that follows one I caught, while the keeper still takes it. */
export const followerNow = (purse: Purse, now: number): Follower | null => {
  const f = purse.follower;
  return f && isBug(f.bug) && typeof f.until === "number" && Array.isArray(f.at) && now <= f.until + PAIR.slack ? f : null;
};
/**
 * How the one that follows is at a moment: on the wing in a figure of eight through the place of the catch (`at`: the
 * point of the ground the first was taken over), begun when it was seen (`began`), turned and handed by its seed.
 */
export function followerPose(bug: BugId, at: Vec, seed: number, began: number, now: number): Pose {
  const u = (Math.max(0, now - began) / 1000) * PAIR.turn * (BUGS[bug].quick ?? 1), tilt = roll("pairtilt", seed) * Math.PI * 2, way = roll("pairway", seed) < 0.5 ? 1 : -1;
  const a = PAIR.radius * Math.sin(u), b = PAIR.radius * 0.6 * Math.sin(2 * u) * way, da = Math.cos(u), db = 1.2 * Math.cos(2 * u) * way;
  const gx = at.x + a * Math.cos(tilt) - b * Math.sin(tilt), gy = at.y + a * Math.sin(tilt) + b * Math.cos(tilt);
  const vx = da * Math.cos(tilt) - db * Math.sin(tilt), vy = da * Math.sin(tilt) + db * Math.cos(tilt);
  return { ...POSE, x: gx + PAIR.lift, y: gy + PAIR.lift, lift: PAIR.lift, right: vx - vy >= 0, flying: true };
}

/* ── a drop of nectar (lib/town/gifts' thingNectar, the insects' third rank) ─ */

/**
 * A drop of nectar put on the ground where its owner stands (the owner's ladder of 2026-10-07: "หยดลงพื้น ภายใน 10
 * วินาทีมีแมลงบินมาหา ชนิดตามที่และเวลานั้น วันละ 10 หยด"). Within `within` seconds (and no sooner than `soon`) an insect
 * flies to it, and stays `stays` seconds; then it is to be come up to and netted as any other. Ten drops a day
 * (lib/town/gifts' USES). Every number here is mine.
 *
 * - **Which insect, the keeper says**: one of the kinds the nearest haunt of that map would have at that moment (its
 *   place, its part of the forest, the hour, the sky, the moon, a day of its own), by their weights there, each
 *   weighed down by how scarce its kind has been hunted (`plentyOf`): a scarce kind comes seldom, and something
 *   always comes while anything may. When nothing may (flowers at night, a dry kind in the rain), the drop is not
 *   put down and none is used up (`quiet`).
 * - **The haunts a drop calls from are the ones insects pass by often** (`at`): flowers, the water's edge, a field,
 *   a light, the litter under trees. Not a tree (what is in one comes down only to something sweet held by a hand
 *   that then cannot hold a net: two people still), nor a glade or the fall, whose one insect is rare by how seldom
 *   its haunt has anything at all: a drop that brought one every time would be ten of the rarest a day. The rare
 *   ones a drop can bring are as rare as their weights beside the others make them (an orchid mantis two in a
 *   hundred and sixty at the forest's flowers; a hawk moth four in a hundred on a day of its own).
 * - **It is its owner's alone**, kept in their purse (`lured`), one at a time: nobody else sees it or can net it.
 *   Caught, it is a catch like any (a `net` deed: it counts towards its kind's scarcity, the line's points, the
 *   village's book).
 */
export const NECTAR = { within: 10, soon: 3, stays: 120, at: ["blooms", "water", "field", "lamp", "litter"] as HauntKind[] };
/** The maps, each as its name and the box of its tiles: what the database is told, which knows no tile's map (lib/town/world's placeOf is the code's). */
export const NECTAR_MAPS: Array<[Place, number, number, number, number]> = [["town", 0, 0, COLS, ROWS], ["farm", FARM.x, FARM.y, FARM.w, FARM.h], ["forest", FOREST.x, FOREST.y, FOREST.w, FOREST.h]];
/** A drop that is out and what it brings: the tile it lies on, the haunt it called from, the insect and how many a catch gives, from when it is there and until when, and the seed its ways follow from. */
export type Lured = NonNullable<Purse["lured"]>;
/** The haunt a drop on a tile calls from: of the map the tile is on, among the kinds a drop calls from, the one a perch of which is nearest (the lower number, of two as near). None off the maps. */
export function nectarHaunt(at: readonly [number, number]): Haunt | null {
  const place = placeOf(at[0], at[1]);
  let best: Haunt | null = null, least = Infinity;
  if (!place) return null;
  for (const h of HAUNTS) {
    if (h.place !== place || !NECTAR.at.includes(h.kind)) continue;
    for (const p of h.perches) {
      const dx = p.x - at[0] - 0.5, dy = p.y - at[1] - 0.5, d = dx * dx + dy * dy;
      if (d < least) { least = d; best = h; }
    }
  }
  return best;
}
/**
 * The insects a drop may bring at a haunt at a moment, in the order they are weighed, each with its weight there less
 * what its kind is hunted. `always`: for whoever wears the butterfly-wing cloak, for whom the insects that have days
 * of their own are out every day (`cloakAt`): at a drop too.
 */
export function nectarMay(salt: string, h: Haunt, now: number, rains: readonly Rain[] = DRY, hunts: readonly Hunt[] = UNHUNTED, always = false): Array<[BugId, number]> {
  return BUG_IDS.filter((id) => fits(BUGS[id], id, h, now, salt, rains, always)).map((id): [BugId, number] => [id, BUGS[id].weight * plentyOf(hunts, id, now)]);
}
const share = (x: number) => Math.min(0.999999, Math.max(0, x || 0));
/**
 * Put a drop down where I stand: the purse with a drop used and what it brings kept, or why not (no nectar to my
 * name, none left today, one out already, nothing about to call). `r` is three numbers of chance from 0 up to 1:
 * which insect, how many a catch gives, and how soon it comes.
 */
export function nectar(purse: Purse, at: readonly [number, number], now: number, salt: string, rains: readonly Rain[], hunts: readonly Hunt[], r: readonly [number, number, number]):
  { ok: true; purse: Purse; lured: Lured; left: number } | { ok: false; why: BugRefusal | GiftRefusal } {
  const used = useGift(purse, "thingNectar", now);
  if (!used.ok) return used;
  if (purse.lured && typeof purse.lured.until === "number" && purse.lured.until > now) return { ok: false, why: "out" };
  const h = nectarHaunt(at), may = h ? nectarMay(salt, h, now, rains, hunts, wearing(purse, "charmCloak")) : [];
  let total = 0;
  for (const [, w] of may) total += w;
  if (!h || !(total > 0)) return { ok: false, why: "quiet" };
  let left = share(r[0]) * total, bug = may[may.length - 1][0];
  for (const [id, w] of may) { left -= w; if (left < 0) { bug = id; break; } }
  const [lo, hi] = BUGS[bug].n, n = lo + Math.min(hi - lo, Math.max(0, Math.floor(share(r[1]) * (hi - lo + 1))));
  const from = now + Math.floor((NECTAR.soon + share(r[2]) * (NECTAR.within - NECTAR.soon)) * 1000);
  const lured: Lured = { x: at[0], y: at[1], haunt: h.id, bug, n, from, until: from + NECTAR.stays * 1000, seed: (h.id * 100003 + Math.floor(now / 1000)) % 2147483647 };
  return { ok: true, purse: { ...used.purse, lured }, lured, left: used.left };
}
/** The insect that has come to my drop, at a moment: there from when it came until it is off again. */
export const luredNow = (purse: Purse, now: number): Lured | null => {
  const l = purse.lured;
  return l && isBug(l.bug) && typeof l.from === "number" && typeof l.until === "number" && l.from <= now && now < l.until ? l : null;
};
/** The number the page knows a drop's insect by, where a haunt's is known by its haunt's: no haunt has it. */
export const LURED = -1;
/**
 * The place a drop's insect keeps to, as a haunt of its own for the page to move it about (`think`, `poseOf`): a few
 * perches round the drop, a step or two out, in an order and at distances that follow from its seed (what goes round
 * a light goes round the drop itself). Of the kind and the part of the forest of the haunt it was called from.
 */
export function luredHaunt(l: Lured): Haunt {
  const from = HAUNTS[l.haunt], c = { x: l.x + 0.5, y: l.y + 0.5 };
  const round = isBug(l.bug) && BUGS[l.bug].habit === "lamp";
  const perches = round ? [c] : Array.from({ length: 5 }, (_, i) => {
    const ang = ((i + roll("luredturn", l.seed)) / 5) * Math.PI * 2, r = 1.2 + 0.6 * roll("luredout", l.seed, i);
    return { x: Math.round((c.x + Math.cos(ang) * r) * 100) / 100, y: Math.round((c.y + Math.sin(ang) * r) * 100) / 100 };
  });
  return { id: LURED, kind: from?.kind ?? "blooms", place: from?.place ?? "town", zone: from?.zone ?? null, x: c.x, y: c.y, perches };
}

/** An insect that is mine alone and no haunt's: the one come to my drop of nectar, or the one following an insect I caught under the butterfly-wing cloak. */
export type Mine = "lured" | "pair";
/**
 * Catch an insect that is mine alone, from the tile I stand on, after so many swings that missed: the one come to my
 * drop (there from when it came until it is off), or the one following an insect I caught (until its seconds are up,
 * and the keeper's slack). As a haunt's is caught (`net`): with a net in the hand, from near enough the drop or the
 * place of the first catch, with room in the bag, for its stamina and a point a miss up to so many. The drop is done
 * with, and under the cloak its insect has another following; the one that followed is gone, and has none.
 */
export function netMine(purse: Purse, which: Mine, hand: ItemId | null, at: readonly [number, number], misses: number, now: number):
  Done<{ purse: Purse; got: Array<[ItemId, number]> }> | { ok: false; why: BugRefusal } {
  const l = which === "lured" ? luredNow(purse, now) : null, f = which === "pair" ? followerNow(purse, now) : null;
  const one = l ? { bug: l.bug as BugId, n: l.n, x: l.x, y: l.y } : f ? { bug: f.bug as BugId, n: f.n, x: f.at[0], y: f.at[1] } : null;
  if (!one) return no("none");
  const id = one.bug, reach = NET.reach + NET.far, dx = one.x - at[0], dy = one.y - at[1];
  if (!mayNet(hand)) return no("tool");
  if (dx * dx + dy * dy > reach * reach) return { ok: false, why: "far" };
  if (roomFor(purse.bag, id) < one.n) return no("full");
  const cost = BUGS[id].cost + Math.min(NET.misses, Math.max(0, Math.floor(misses)));
  // ── forging: old tools ── (as a haunt's catch is paid for)
  const tool = heldStack(purse), more = one.n + (luckOf("twin", one.x, one.y, now) < netFx(tool).twin && roomFor(purse.bag, id) > one.n ? 1 : 0);
  const after = { ...toolPaid(purse, spend(purse, cost, now), now, tool, netFx(tool), "ntFresh"), bag: put(purse.bag, id, more) };
  return { ok: true, purse: l ? followed(purse, { ...after, lured: null }, id, one.n, at, now) : { ...after, follower: null }, got: [[id, more]] };
}

/* ── a ladybird's doing ─────────────────────────────────────────────────── */

/**
 * Which plant a ladybird rids of its pest: one of the plots that have a pest on them at this moment (a plant already
 * dead of one has none), whoever sowed it, picked by a number from 0 up to 1 among them in the order of their tiles
 * (across, then down); null when no plot has one. Whether a catch does this at all is the keeper's roll, against the
 * insect's `rids`; the plot is then cured as a cure in the hand cures it (lib/town/farm: `cured` is that moment).
 */
export function pestToRid(plots: Readonly<Record<string, Plot>>, now: number, rains: FarmSky, pick: number): string | null {
  const at = (key: string) => key.split(",").map(Number);
  const keys = Object.keys(plots).filter((key) => see(key, plots[key], now, rains).pest)
    .sort((a, b) => at(a)[0] - at(b)[0] || at(a)[1] - at(b)[1]);
  if (!keys.length) return null;
  return keys[Math.min(keys.length - 1, Math.max(0, Math.floor(pick * keys.length)))];
}

/* ── how each one moves ─────────────────────────────────────────────────── */

/** The numbers of each habit: tiles a second, milliseconds, tiles. */
export const HABITS = {
  /** A round through its perches without end, weaving as it goes. */
  path: { speed: 2.7, weave: 0.2, lift: 0.5 },
  /** Round a light: radians a second, and how near and far it swings. */
  lamp: { turn: 2.1, near: 0.8, far: 1.4, lift: 0.9 },
  /** A walk from perch to perch, with a rest at each. */
  crawl: { speed: 0.45, rest: 1500 },
  /** Hovers so long, then darts; darts at once from anybody who moves within so far. */
  spot: { hover: [1700, 3300] as const, dart: 9, notice: 2.7, lift: 0.45 },
  /** Sees so far before it and so far behind; looks about every so often; hops so fast. */
  behind: { ahead: 3.3, back: 0.8, look: [3400, 6200] as const, tracks: [1900, 2600] as const, eyes: 7, hop: 7 },
  /** Hears anybody who moves within so far, and keeps quiet so long after; sings and rests in turn; off, it flies so fast. */
  sound: { notice: 3.2, still: 1200, hush: 4000, song: [3000, 4600] as const, rest: [2300, 3300] as const, grace: 400, fly: 6, lift: 0.75 },
  /** Gives itself away by a twitch every so often; what glows shows only so long each time, drifting meanwhile. */
  look: { tell: [2600, 4600] as const, twitch: 320, blink: [2100, 3400] as const, glow: 600, drift: 0.45, still: 2500, lift: 0.5 },
  /** Comes down to something sweet held still within so far, after so long; down in so long; back up so soon after it is gone. */
  lure: { reach: 1.9, patience: 3000, down: 1300, lost: 600, top: 2.3, low: 1 },
};

/**
 * Somebody on the map: where, whether they are walking, and what they hold; and, for somebody under the fountain's
 * soft step (lib/town/forest-eye) or with the lucky butterfly following (`stealthOf`), the share of an insect's
 * senses that reaches them; and, for somebody good at the line, how much further off the good insects know of them
 * (`wary`: lib/town/gifts' harderFor, which a common insect does not mind: `harderOn`).
 */
export interface Person { x: number; y: number; moving: boolean; hold: ItemId | null; soft?: number; wary?: number }
/** How far something an insect sees or hears by reaches a person. */
const sensed = (reach: number, p: Person, id: BugId) => reach * (p.soft ?? 1) * harderOn(id, p.wary);
/**
 * The share of an insect's senses that reaches somebody: all of them (1), less under a soft step (the fountain's, or
 * a meal's at its level: lib/town/forest-eye's softStep), and **half of that again with the lucky butterfly
 * following** (lib/town/gifts' famButterfly, its number: the distance at which an insect startles is halved). The
 * butterfly was a step more of softness added to the meal's before 2026-10-07 (`softStep(by + 1)`: a half by
 * itself, but two fifths where a meal's first level alone gives two thirds); it is a share of its own now, which
 * multiplies whatever else there is (a third with that meal). Whoever comes at an insect the wrong way for its kind,
 * within what is left, sets it off all the same.
 */
export const stealthOf = (purse: Purse, now: number): number => softStep(buffBy(purse, now, "net")) * Math.min(1, Math.max(0, famBy(purse, "famButterfly", 1)));
/**
 * A rare insect does not stay (the owner's ladder of 2026-10-07: "a rare insect moves perch every 20 s"): one that
 * would sit at its perch for good (among what it looks like, up its tree, where it sings or looks about) is at
 * another perch of its haunt every so many milliseconds, for everybody: which perch follows from its seed and the
 * clock alone (`perchAt`), so every screen has it at the same one, and the silver-web net's glint shows it moving
 * about. The rare ones that never stop by themselves (round a flower bed, round a lamp, darting from hover to hover)
 * are as they are.
 */
export const ROAM = { every: 20_000 } as const;
const STAYS: readonly Habit[] = ["look", "lure", "sound", "behind"];
export const roams = (id: BugId, h: Haunt): boolean =>
  tierOf(id) === "rare" && h.perches.length >= 2 && STAYS.includes(BUGS[id].habit) && (BUGS[id].habit !== "look" || !!BUGS[id].like);
/**
 * The perch a roaming insect is at in a stretch of its clock (`epoch`: the moment over `ROAM.every`, rounded down):
 * one of the even perches in an even stretch and of the odd ones in an odd, so that it is never the one before.
 */
export function perchAt(seed: number, n: number, epoch: number): number {
  if (n < 2) return 0;
  const odd = ((epoch % 2) + 2) % 2, some = odd ? Math.floor(n / 2) : Math.ceil(n / 2);
  return 2 * Math.min(some - 1, Math.floor(roll("roam", seed, epoch) * some)) + odd;
}
/**
 * What an insect has in mind, on one screen: the perch it is at or bound for, the one it left and when, when it
 * comes (or came) there, how many it has been to, until when it keeps quiet, which way it faces across the screen,
 * the last time it looked about, and (a beetle) since when something sweet has been held under it and when last;
 * and (one that does not stay: `ROAM`) the stretch of its clock it was last moved in.
 */
export interface Mind { at: number; from: number; left: number; land: number; visit: number; hush: number; face: 1 | -1; looked: number; lured: number; last: number; roam?: number }
/** How an insect is at a moment: where on the ground, how high above it, which way it faces, and what of it shows. */
export interface Pose {
  x: number; y: number; lift: number; right: boolean;
  /** Whether it is drawn at all. */
  seen: boolean;
  /** Whether a net can take it now. */
  open: boolean;
  /** On the wing, or in a hop. */
  flying: boolean;
  /** Singing: heard, and shown as rings. */
  sings: boolean;
  /** How brightly it glows, 0 to 1. */
  glow: number;
  /** Giving itself away just now. */
  twitch: boolean;
  /** Something moves up in the tree. */
  stirs: boolean;
}

const mix = ([a, b]: readonly [number, number], t: number) => a + (b - a) * t;
const faceOf = (seed: number, visit: number, look: number): 1 | -1 => (roll("face", seed, visit, look) < 0.5 ? 1 : -1);
/** Which way across the screen something is from something else: to its right, or its left. */
const side = (from: Vec, to: Vec): 1 | -1 => (to.x - from.x - (to.y - from.y) >= 0 ? 1 : -1);

/** An insect's mind as its turn begins. */
export function newMind(id: BugId, h: Haunt, seed: number, born: number): Mind {
  const fixed = BUGS[id].habit === "lure" || h.perches.length < 2;
  return { at: fixed ? 0 : Math.floor(roll("perch", seed) * h.perches.length), from: -1, left: 0, land: born, visit: 0, hush: 0, face: faceOf(seed, 0, 0), looked: 0, lured: 0, last: 0 };
}
/** Off to another perch, at a speed. */
function off(h: Haunt, seed: number, m: Mind, to: number, now: number, speed: number): Mind {
  const d = far(h.perches[m.at], h.perches[to]);
  return { ...m, from: m.at, at: to, left: now, land: now + (d / speed) * 1000, visit: m.visit + 1, face: faceOf(seed, m.visit + 1, 0), looked: 0 };
}
/** The perch furthest from somebody, of those it is not at. */
function away(h: Haunt, at: number, from: Vec): number {
  let best = at, most = -1;
  h.perches.forEach((p, i) => { const d = far(p, from); if (i !== at && d > most) { most = d; best = i; } });
  return best;
}
/** The perch it goes to next by itself. */
const next = (h: Haunt, seed: number, m: Mind) => (h.perches.length < 2 ? m.at : (m.at + 1 + Math.floor(roll("next", seed, m.visit) * (h.perches.length - 1))) % h.perches.length);
/** How long a singer's song and its rest are, at a perch. */
const songOf = (seed: number, visit: number) => ({ song: mix(HABITS.sound.song, roll("song", seed, visit)), rest: mix(HABITS.sound.rest, roll("rest", seed, visit)) });

/**
 * Whether an insect at its perch knows of somebody as they are now: what hovers or sings, of whoever walks within
 * its hearing; what sees, of whoever is within its sight on that side of it. The others mind nobody. How far its
 * senses reach somebody is theirs to shorten and to lengthen (`sensed`).
 */
export function knows(id: BugId, h: Haunt, m: Mind, p: Person): boolean {
  const here = h.perches[m.at];
  switch (BUGS[id].habit) {
    case "spot": return p.moving && far(p, here) < sensed(HABITS.spot.notice, p, id);
    case "behind": return far(p, here) < sensed(side(here, p) === m.face ? HABITS.behind.ahead : HABITS.behind.back, p, id);
    case "sound": return p.moving && far(p, here) < sensed(HABITS.sound.notice, p, id);
    default: return false;
  }
}
/**
 * Whether it is only somebody's soft step or their butterfly that keeps an insect from knowing of them: with all its
 * senses it would, and it does not. A state the page may show (a little dust over the insect), never a rule.
 */
export const lulled = (id: BugId, h: Haunt, m: Mind, p: Person): boolean => (p.soft ?? 1) < 1 && !knows(id, h, m, p) && knows(id, h, m, { ...p, soft: 1 });

/**
 * What an insect makes of the moment: whoever is about, and the clock. Gives back the same mind when nothing
 * changes. (A butterfly, a moth and whatever only walks mind nobody: where they are follows from the clock alone.)
 */
export function think(id: BugId, h: Haunt, seed: number, was: Mind, now: number, people: readonly Person[]): Mind {
  const bug = BUGS[id], quick = bug.quick ?? 1;
  let m = was;
  // one that does not stay is at another perch in each stretch of its clock: among what it looks like, up another
  // trunk (where nothing has brought it down yet), or off to it in a hop
  if (roams(id, h)) {
    const epoch = Math.floor(now / ROAM.every);
    if (m.roam !== epoch) {
      const to = perchAt(seed, h.perches.length, epoch);
      if (to === m.at || now < m.land) m = { ...m, roam: epoch };
      else if (bug.habit === "behind" || bug.habit === "sound") return { ...off(h, seed, m, to, now, bug.shy === "flight" ? HABITS.sound.fly : HABITS.behind.hop), roam: epoch };
      else m = { ...m, at: to, from: -1, land: now, visit: m.visit + 1, lured: 0, last: 0, roam: epoch };
    }
  }
  const here = h.perches[m.at];
  if (now < m.land && bug.habit !== "lure") return m;
  switch (bug.habit) {
    case "spot": {
      const H = HABITS.spot, scare = people.find((p) => knows(id, h, m, p));
      if (scare) return off(h, seed, m, away(h, m.at, scare), now, H.dart);
      if (now < m.land + mix(H.hover, roll("hover", seed, m.visit)) / quick) return m;
      return off(h, seed, m, next(h, seed, m), now, H.dart);
    }
    case "behind": {
      const H = HABITS.behind;
      let mind = m;
      const every = mix(bug.tracks ? H.tracks : H.look, roll("look", seed, m.visit)), look = Math.floor((now - m.land) / every);
      if (look !== m.looked) {
        let face = faceOf(seed, m.visit, look);
        if (bug.tracks) {
          const nearest = [...people].sort((p, q) => far(p, here) - far(q, here))[0];
          face = nearest && far(nearest, here) < H.eyes ? side(here, nearest) : m.face;
        }
        mind = { ...m, looked: look, face };
      }
      const seenBy = people.find((p) => knows(id, h, mind, p));
      return seenBy ? off(h, seed, mind, away(h, mind.at, seenBy), now, H.hop) : mind;
    }
    case "sound": {
      const H = HABITS.sound, mover = people.find((p) => knows(id, h, m, p));
      if (!mover) return m;
      if (bug.shy === "flight") {
        const { song, rest } = songOf(seed, m.visit), t = (now - m.land) % (song + rest);
        return t > song + H.grace ? off(h, seed, m, away(h, m.at, mover), now, H.fly) : m;
      }
      return now + H.still > m.hush ? { ...m, hush: now + H.still } : m;
    }
    case "lure": {
      const H = HABITS.lure, held = people.some((p) => !p.moving && !!p.hold && LURES.includes(p.hold) && far(p, here) < H.reach);
      if (held) return { ...m, lured: m.lured || now, last: now };
      return m.lured && now - m.last > H.lost ? { ...m, lured: 0 } : m;
    }
    default: return m;
  }
}

/** What an insect makes of a swing that landed near it and did not take it. */
export function missed(id: BugId, h: Haunt, seed: number, m: Mind, now: number, by: Vec): Mind {
  const bug = BUGS[id];
  if (now < m.land) return m;
  switch (bug.habit) {
    case "spot": return off(h, seed, m, away(h, m.at, by), now, HABITS.spot.dart);
    case "behind": return off(h, seed, m, away(h, m.at, by), now, HABITS.behind.hop);
    case "sound": return { ...off(h, seed, m, away(h, m.at, by), now, bug.shy === "flight" ? HABITS.sound.fly : HABITS.behind.hop), hush: now + HABITS.sound.hush };
    // (it is somewhere else among what it looks like, and keeps still a while)
    case "look": return bug.like ? { ...m, at: next(h, seed, m), visit: m.visit + 1, land: now, hush: now + HABITS.look.still } : { ...m, hush: now + HABITS.look.still };
    case "lure": return { ...m, lured: 0 };
    default: return m;
  }
}

/** A point of a smooth round through some points, `u` of the way from one to the next counted from the first. */
function roundAt(p: Vec[], u: number): Vec {
  const n = p.length, i = Math.floor(u), t = u - i;
  const a = p[(((i - 1) % n) + n) % n], b = p[((i % n) + n) % n], c = p[(((i + 1) % n) + n) % n], d = p[(((i + 2) % n) + n) % n];
  const f = (w: number, x: number, y: number, z: number) => 0.5 * (2 * x + (y - w) * t + (2 * w - 5 * x + 4 * y - z) * t * t + (3 * x - w - 3 * y + z) * t * t * t);
  return { x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) };
}
const roundLength = (p: Vec[]) => p.reduce((t, q, i) => t + far(q, p[(i + 1) % p.length]), 0);
/** Where something that goes its round is at a moment, and where it is heading. */
function onRound(h: Haunt, seed: number, speed: number, now: number): { at: Vec; to: Vec } {
  const n = h.perches.length;
  if (n < 2) return { at: h.perches[0], to: h.perches[0] };
  const u = ((now / 1000) * speed) / (roundLength(h.perches) / n) + roll("start", seed) * n;
  return { at: roundAt(h.perches, u), to: roundAt(h.perches, u + 0.02) };
}

const POSE: Pose = { x: 0, y: 0, lift: 0, right: true, seen: true, open: true, flying: false, sings: false, glow: 0, twitch: false, stirs: false };

/** How an insect is at a moment, with what it has in mind. */
export function poseOf(id: BugId, h: Haunt, seed: number, m: Mind, now: number): Pose {
  const bug = BUGS[id], quick = bug.quick ?? 1, here = h.perches[m.at], s = now / 1000;
  /** On the way from the perch it left: where, and how far along. */
  const between = () => {
    const from = h.perches[m.from] ?? here, t = Math.min(1, Math.max(0, (now - m.left) / Math.max(1, m.land - m.left)));
    return { x: from.x + (here.x - from.x) * t, y: from.y + (here.y - from.y) * t, t, right: side(from, here) > 0 };
  };
  const moving = now < m.land && m.from >= 0;
  switch (bug.habit) {
    case "path": {
      const H = HABITS.path, { at, to } = onRound(h, seed, H.speed * quick, now);
      const dx = to.x - at.x, dy = to.y - at.y, len = Math.hypot(dx, dy) || 1, w = Math.sin(s * 6 + seed) * H.weave;
      return { ...POSE, x: at.x - (dy / len) * w, y: at.y + (dx / len) * w, lift: H.lift + 0.12 * Math.sin(s * 4 + seed), right: side(at, to) > 0, flying: true };
    }
    case "lamp": {
      const H = HABITS.lamp, dir = roll("dir", seed) < 0.5 ? 1 : -1, ang = dir * s * H.turn * quick + roll("ang", seed) * Math.PI * 2;
      const r = (H.near + H.far) / 2 + ((H.far - H.near) / 2) * Math.sin(s * 0.8 + seed);
      return { ...POSE, x: here.x + Math.cos(ang) * r, y: here.y + Math.sin(ang) * r, lift: H.lift + 0.15 * Math.sin(s * 3 + seed), right: (-Math.sin(ang) - Math.cos(ang)) * dir > 0, flying: true };
    }
    case "crawl": {
      const H = HABITS.crawl, n = h.perches.length;
      const legs = h.perches.map((p, i) => far(p, h.perches[(i + 1) % n]) / H.speed + H.rest / 1000), all = legs.reduce((t, l) => t + l, 0);
      let t = (s + roll("start", seed) * all) % all, i = 0;
      while (t >= legs[i]) { t -= legs[i]; i = (i + 1) % n; }
      const a = h.perches[i], b = h.perches[(i + 1) % n], walk = legs[i] - H.rest / 1000, k = Math.min(1, t / Math.max(0.001, walk));
      return { ...POSE, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, right: side(a, b) > 0, flying: false };
    }
    case "spot": {
      const H = HABITS.spot;
      if (moving) { const b = between(); return { ...POSE, x: b.x, y: b.y, lift: H.lift, right: b.right, flying: true }; }
      return { ...POSE, x: here.x + 0.05 * Math.sin(s * 11 + seed), y: here.y + 0.05 * Math.cos(s * 9 + seed), lift: H.lift + 0.05 * Math.sin(s * 3.3 + seed), right: m.face > 0, flying: true };
    }
    case "behind": {
      if (moving) { const b = between(); return { ...POSE, x: b.x, y: b.y, lift: Math.sin(Math.PI * b.t) * 0.7, right: b.right, flying: true, open: false }; }
      return { ...POSE, x: here.x, y: here.y, right: m.face > 0 };
    }
    case "sound": {
      const H = HABITS.sound, onTrunk = bug.shy === "flight";
      if (moving) { const b = between(); return { ...POSE, x: b.x, y: b.y, lift: onTrunk ? H.lift + 0.3 : Math.sin(Math.PI * b.t) * 0.6, right: b.right, flying: true, open: false }; }
      const { song, rest } = songOf(seed, m.visit);
      const sings = onTrunk ? (now - m.land) % (song + rest) < song : now > m.hush;
      return { ...POSE, x: here.x, y: here.y, lift: onTrunk ? H.lift : 0, seen: onTrunk, sings, right: m.face > 0 };
    }
    case "look": {
      const H = HABITS.look;
      if (!bug.like) {
        // what only glows: it drifts its round in the dark, and shows a moment at a time
        const { at, to } = onRound(h, seed, H.drift, now), every = mix(H.blink, roll("blink", seed)), lit = now > m.hush && (now + roll("lit", seed) * every) % every < H.glow;
        return { ...POSE, x: at.x, y: at.y, lift: H.lift + 0.1 * Math.sin(s * 1.7 + seed), right: side(at, to) > 0, seen: lit, glow: lit ? 1 : 0, flying: true };
      }
      const every = mix(H.tell, roll("tell", seed, m.visit));
      return { ...POSE, x: here.x, y: here.y, right: m.face > 0, twitch: now > m.hush && (now - m.land) % every > every - H.twitch };
    }
    case "lure": {
      const H = HABITS.lure, t = m.lured ? now - m.lured : -1, stirs = Math.floor(s / 0.5 + seed) % (m.lured ? 3 : 11) === 0;
      if (t < H.patience) return { ...POSE, x: here.x, y: here.y, lift: H.top, seen: false, open: false, stirs };
      const k = Math.min(1, (t - H.patience) / H.down);
      return { ...POSE, x: here.x, y: here.y, lift: H.top + (H.low - H.top) * k, open: k >= 1, stirs: false };
    }
  }
}

/**
 * The lulling flute (lib/town/gifts' thingFlute, the insects' fifth rank; the owner's ladder of 2026-10-07: "แมลงทุกตัว
 * บนจอหลับ 15 วินาที ใช้ได้ 5 นาทีครั้ง"). Played, every insect its owner can see on the screen sleeps so many seconds:
 * asleep it is still where it was, shows itself (what hides, what only glows now and then), minds nobody (it does
 * not startle, nor at a net that comes down beside it), and is still to be netted: the ring is as ever, and a net
 * aimed badly misses. Once in five minutes (lib/town/gifts' USES, a span). **On its owner's screen only**: where an
 * insect is has always been each screen's own, so nobody else has it asleep, and nobody else catches for it.
 */
export const FLUTE = { secs: numberOf("thingFlute") };
/**
 * An insect as it sleeps from a moment on: where it was then (one in a hop or a dart, where it lands), come down to
 * the ground under its picture, still and in plain sight. Null for one a net could not take there (a beetle still up
 * its tree): it is out of the flute's hearing.
 */
export function asleep(id: BugId, h: Haunt, seed: number, m: Mind, at: number): Pose | null {
  const habit = BUGS[id].habit, p = poseOf(id, h, seed, m, habit === "spot" || habit === "behind" || habit === "sound" ? Math.max(at, m.land) : at);
  if (!p.open) return null;
  return { ...POSE, x: p.x - p.lift, y: p.y - p.lift, lift: 0, right: p.right, glow: habit === "look" && !BUGS[id].like ? 1 : 0 };
}

/** Where a net has to land to take something: the point of the ground its picture is drawn over (a tile of lift is a tile up the screen, which is one back along each of the map's ways). */
export const aimOf = (p: Pose): Vec => ({ x: p.x - p.lift, y: p.y - p.lift });
/** The ring a net takes an insect within, in tiles: smaller for the small ones, and for tired hands; and narrower on a good insect for whoever is good at the line (`harderOn`). */
// ── forging: old tools ── (`forged`: the net's own forging, so many times the ring: taken with the rest of what widens it, never past the cap; nothing said, a plain net)
export const ringOf = (id: BugId, spent: boolean, wide = 1, harder = 1, forged = 1) => ((NET.radius * BUGS[id].size * (spent ? NET.tired.radius : 1) * Math.max(1, wide)) / harderOn(id, harder)) * partOf(Math.max(1, wide), forged);
/** Whether an insect missed so many times is off for good, for whoever missed it: only tired hands lose one so. (`bears`: so many misses more, with a net that carries as much.) */
export const fledBy = (misses: number, spent: boolean, bears = 0) => spent && misses >= NET.tired.misses + Math.max(0, bears);
/**
 * The wind net (lib/town/gifts' charmWind, the insects' fourth rank; the owner's ladder of 2026-10-07: "สวิงลงทันทีไม่ต้อง
 * รอจังหวะ เล็งตรงไหนลงตรงนั้น ยังพลาดได้ถ้าเล็งไม่โดน"). Worn, the net does not take its moment to come down: it is aimed
 * for as long as the map is pressed and falls where it is aimed the moment it is let go, so nothing has to be met
 * where it will be. Its ring is anybody's, and aimed badly it misses as any net does; a miss is minded and counted as
 * ever. Another gust can be loosed only `again` milliseconds on: as long as a plain swing and its rest take together,
 * so that it is no quicker to swing over and over. **With no stamina there is no gust**: tired hands have the plain
 * net as they have it (slower, a small ring, an insect off at the second miss), which no gift of this line changes.
 * Mine: `again`, and that tired hands have none.
 */
export const WIND = { again: NET.lands + NET.again };
/** Whether somebody's net is the wind's now: the charm worn, and stamina to swing with. */
export const windy = (purse: Purse, now: number): boolean => wearing(purse, "charmWind") && !isSpent(purse, now);
/** How long a swing takes to land: no time at all for the wind's. */
// ── forging: old tools ── (`quick`: a forged net's swing takes so many times as long, never under one part in the cap; `rest`: its rest before the next, so many times)
export const swingMs = (spent: boolean, wind = false, quick = 1) => Math.round((spent ? NET.tired.lands : wind ? 0 : NET.lands) * slowPartOf(1, quick));
/** How soon after one swing is begun another may be. (The wind's gust waits as long as a plain swing and its rest take together: with a forged net, as long as that net's.) */
export const againMs = (spent: boolean, wind = false, quick = 1, rest = 1) => (!spent && wind && quick === 1 && rest === 1 ? WIND.again : swingMs(spent, false, quick) + Math.round(NET.again * rest));
/** Where a net aimed at a point comes down: there, or as near it as the reach of whoever swings allows. */
export function aimAt(me: Vec, at: Vec, reach = NET.reach): Vec {
  const d = far(me, at);
  return d <= reach || d === 0 ? { x: at.x, y: at.y } : { x: me.x + ((at.x - me.x) * reach) / d, y: me.y + ((at.y - me.y) * reach) / d };
}
/** Whether a net landing at a point takes an insect as it is then. */
export const taken = (id: BugId, p: Pose, at: Vec, spent: boolean, wide = 1, harder = 1, forged = 1) => p.open && far(aimOf(p), at) <= ringOf(id, spent, wide, harder, forged);
