import { roll, see, type Plot } from "./farm";
import { SPOTS, fullMoon, isDayOf } from "./forest";
import type { ItemId } from "./items";
import { spend } from "./stamina";
import { BANGKOK, DAY, HOUR, no, put, roomFor, type Done, type Purse } from "./trade";
import { DRY, wetMs, type Rain } from "./weather";
import { CAMP, FARM, FOREST, FOREST_PROPS, GATES, PROPS, WATERFALL, WELL, asBuilt, groundAt, placeOf, plotAt, walkable, zoneAt, type Place, type Vec, type Zone } from "./world";

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
 *   catches. With no stamina the ring is smaller and the net slower.
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
  mantis: { habit: "behind", at: ["field"], weight: 22, n: [1, 1], cost: 3, size: 0.9, places: ["farm"], hours: DAYTIME, tracks: true },
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
  ladybird: { habit: "crawl", at: ["field", "blooms"], weight: 60, n: [1, 1], cost: 1, size: 1, places: ["farm", "town"], hours: [[5, 18]], rids: 0.1 },
  scarab: { habit: "crawl", at: ["field"], weight: 30, n: [1, 1], cost: 1, size: 1, places: ["farm"], hours: DAYTIME },
  caterpillar: { habit: "crawl", at: ["litter", "blooms"], weight: 45, n: [1, 1], cost: 1, size: 1, places: ["forest"], hours: DAYTIME },
};
export const BUG_IDS = Object.keys(BUGS) as BugId[];
export const isBug = (id: string | null | undefined): id is BugId => !!id && id in BUGS;

/**
 * A kind of haunt: how many minutes its turn lasts, the chance a turn has an insect, and how many people may catch it
 * in a turn. One, since 2026-10-05 (three before): an insect caught is gone for everybody (the owner: "เมื่อจับแมลงแล้ว
 * ช่วยทำให้หายไปจากแมพ ในหน้าจอคนอื่นด้วย").
 */
export const HAUNT_KINDS: Record<HauntKind, { every: number; chance: number; shares: number }> = {
  blooms: { every: 10, chance: 0.55, shares: 1 },
  water: { every: 10, chance: 0.5, shares: 1 },
  field: { every: 10, chance: 0.55, shares: 1 },
  lamp: { every: 10, chance: 0.6, shares: 1 },
  tree: { every: 20, chance: 0.5, shares: 1 },
  litter: { every: 20, chance: 0.5, shares: 1 },
  glade: { every: 60, chance: 0.25, shares: 1 },
  falls: { every: 30, chance: 0.3, shares: 1 },
};
/**
 * An insect caught comes back somewhere else (the owner, the same day: "หลังจากนั้น จะมี delay เล็กน้อยก่อนสุ่มเกิดที่ใหม่"):
 * so many seconds after the catch, at another haunt of the same map that has nothing in its turn, which must have at
 * least so many seconds of that turn left. Once: what came back and is caught does not come back again, so that a
 * map gives at most twice what its haunts roll, however many hunt it.
 */
export const COMEBACK = { after: 30, least: 120 };

export const NET = {
  /** How far from where one stands a swing can be aimed, in tiles. */
  reach: 2.4,
  /** How long after it is begun a swing lands, in milliseconds; and how soon after that another can begin. */
  lands: 300, again: 350,
  /** The ring a net takes what is under, in tiles across its half. */
  radius: 0.6,
  /** With no stamina: the ring as a share of that, and how long the swing takes. */
  tired: { radius: 0.65, lands: 450 },
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

/** Whether an insect may be at a haunt in the turn that begins at a moment. */
function fits(b: Bug, id: BugId, h: Haunt, at: number, salt: string, rains: readonly Rain[]): boolean {
  if (!b.at.includes(h.kind)) return false;
  if (b.places && !b.places.includes(h.place)) return false;
  if (b.zones && (!h.zone || !b.zones.includes(h.zone))) return false;
  if (b.hours) { const hr = ((((at + BANGKOK) % DAY) + DAY) % DAY) / HOUR; if (!b.hours.some(([a, z]) => hr >= a && hr < z)) return false; }
  if (b.dry && wetMs(rains, at - HOUR / 2, at) > 0) return false;
  if (b.day && !isDayOf(salt, id, b.day, at)) return false;
  if (b.moon && !fullMoon(at)) return false;
  return true;
}

/** What a haunt has in a turn: the turn, the insect, how many a catch gives, and the seed its ways follow from (no secret: it only says how it moves); and whether it is one that came back there after a catch elsewhere. */
export interface Swarm { turn: number; bug: BugId; n: number; seed: number; back?: boolean }
/** An insect that comes back: at which haunt, in which turn of its, which insect and how many a catch gives, and from what moment it is there. */
export interface Comeback { haunt: number; turn: number; bug: BugId; n: number; from: number }

/** The insects that may be at a haunt in a turn of its, in the order they are weighed. */
const mayBe = (salt: string, h: Haunt, turn: number, rains: readonly Rain[]) => { const at = bugTurnStart(h, turn); return BUG_IDS.filter((id) => fits(BUGS[id], id, h, at, salt, rains)); };
/** One of them, by their weights and a number from 0 up to 1. */
function whichOf(may: BugId[], r: number): BugId | undefined {
  let left = r * may.reduce((t, id) => t + BUGS[id].weight, 0);
  return may.find((id) => (left -= BUGS[id].weight) < 0) ?? may[may.length - 1];
}

/** What a haunt has now, or null: decided as its turn begins, and rolled from the keeper's word, the haunt and the turn. The same for everybody. */
export function swarmAt(salt: string, h: Haunt, now: number, rains: readonly Rain[] = DRY): Swarm | null {
  const kind = HAUNT_KINDS[h.kind], turn = bugTurn(h, now);
  if (roll(`${salt}:bug`, h.id, turn) >= kind.chance) return null;
  const bug = whichOf(mayBe(salt, h, turn, rains), roll(`${salt}:which`, h.id, turn));
  if (!bug) return null;
  const [lo, hi] = BUGS[bug].n;
  return { turn, bug, n: lo + Math.floor(roll(`${salt}:bugs`, h.id, turn) * (hi - lo + 1)), seed: h.id * 100003 + turn };
}

/** What a haunt has now, of its own or come back to it after a catch elsewhere (`backs`: those the keeper knows of). */
export function hereAt(salt: string, h: Haunt, now: number, rains: readonly Rain[], backs: readonly Comeback[]): Swarm | null {
  const own = swarmAt(salt, h, now, rains);
  if (own) return own;
  const turn = bugTurn(h, now), back = backs.find((b) => b.haunt === h.id && b.turn === turn && b.from <= now);
  return back ? { turn, bug: back.bug, n: back.n, seed: h.id * 100003 + turn, back: true } : null;
}

/**
 * Where the insect caught at a haunt comes back, and as what: at another haunt of the same map that has nothing in the
 * turn it will be in then (none of its own, none come back to it already), with enough of that turn left, picked by a
 * number from 0 up to 1 among them in the order of their numbers; the insect by that haunt's own weights at that hour
 * (a second number), and how many (a third). Null when the map has no such haunt. Whether a catch brings one back at
 * all is the keeper's to say: only one that was the haunt's own does.
 */
export function comeback(salt: string, from: Haunt, now: number, rains: readonly Rain[], backs: readonly Comeback[], r: readonly [number, number, number]): Comeback | null {
  const at = now + COMEBACK.after * 1000;
  const free = HAUNTS.filter((h) => {
    if (h.id === from.id || h.place !== from.place) return false;
    const turn = bugTurn(h, at);
    if (bugTurnStart(h, turn + 1) - at < COMEBACK.least * 1000) return false;
    if (swarmAt(salt, h, at, rains) || backs.some((b) => b.haunt === h.id && b.turn === turn)) return false;
    return mayBe(salt, h, turn, rains).length > 0;
  });
  if (!free.length) return null;
  const pick = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(x * n)));
  const h = free[pick(r[0], free.length)], turn = bugTurn(h, at), bug = whichOf(mayBe(salt, h, turn, rains), Math.min(0.999999, Math.max(0, r[1])))!;
  const [lo, hi] = BUGS[bug].n;
  return { haunt: h.id, turn, bug, n: lo + pick(r[2], hi - lo + 1), from: at };
}

/** A haunt as somebody sees it now: which, its insect, and what its ways follow from. */
export interface BugSight { id: number; bug: BugId; turn: number; seed: number }
/** Every haunt that has an insect for me now: one out this turn (its own, or come back to it), that nobody has caught. */
export function swarms(salt: string, now: number, rains: readonly Rain[], took: (h: Haunt, turn: number) => { n: number; mine: boolean }, backs: readonly Comeback[] = []): BugSight[] {
  const out: BugSight[] = [];
  for (const h of HAUNTS) {
    const has = hereAt(salt, h, now, rains, backs);
    if (!has) continue;
    const t = took(h, has.turn);
    if (t.mine || t.n >= HAUNT_KINDS[h.kind].shares) continue;
    out.push({ id: h.id, bug: has.bug, turn: has.turn, seed: has.seed });
  }
  return out;
}

/* ── a catch ────────────────────────────────────────────────────────────── */

/** Why an insect was not caught, besides what a bag or a hand may lack: had already this turn, the last of them gone to others, stood too far from, or (a beetle) nobody under its tree with something sweet. */
export type BugRefusal = "had" | "bare" | "far" | "lure";

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
  return { ok: true, purse: { ...spend(purse, cost, now), bag: put(purse.bag, has.bug, has.n) }, got: [[has.bug, has.n]] };
}

/* ── a ladybird's doing ─────────────────────────────────────────────────── */

/**
 * Which plant a ladybird rids of its pest: one of the plots that have a pest on them at this moment (a plant already
 * dead of one has none), whoever sowed it, picked by a number from 0 up to 1 among them in the order of their tiles
 * (across, then down); null when no plot has one. Whether a catch does this at all is the keeper's roll, against the
 * insect's `rids`; the plot is then cured as a cure in the hand cures it (lib/town/farm: `cured` is that moment).
 */
export function pestToRid(plots: Readonly<Record<string, Plot>>, now: number, rains: readonly Rain[], pick: number): string | null {
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
 * soft step (lib/town/forest-eye), the share of an insect's senses that reaches them.
 */
export interface Person { x: number; y: number; moving: boolean; hold: ItemId | null; soft?: number }
/** How far something an insect sees or hears by reaches a person. */
const sensed = (reach: number, p: Person) => reach * (p.soft ?? 1);
/**
 * What an insect has in mind, on one screen: the perch it is at or bound for, the one it left and when, when it
 * comes (or came) there, how many it has been to, until when it keeps quiet, which way it faces across the screen,
 * the last time it looked about, and (a beetle) since when something sweet has been held under it and when last.
 */
export interface Mind { at: number; from: number; left: number; land: number; visit: number; hush: number; face: 1 | -1; looked: number; lured: number; last: number }
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
 * What an insect makes of the moment: whoever is about, and the clock. Gives back the same mind when nothing
 * changes. (A butterfly, a moth and whatever only walks mind nobody: where they are follows from the clock alone.)
 */
export function think(id: BugId, h: Haunt, seed: number, m: Mind, now: number, people: readonly Person[]): Mind {
  const bug = BUGS[id], quick = bug.quick ?? 1, here = h.perches[m.at];
  if (now < m.land && bug.habit !== "lure") return m;
  switch (bug.habit) {
    case "spot": {
      const H = HABITS.spot, scare = people.find((p) => p.moving && far(p, here) < sensed(H.notice, p));
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
      const seenBy = people.find((p) => far(p, here) < sensed(side(here, p) === mind.face ? H.ahead : H.back, p));
      return seenBy ? off(h, seed, mind, away(h, mind.at, seenBy), now, H.hop) : mind;
    }
    case "sound": {
      const H = HABITS.sound, mover = people.find((p) => p.moving && far(p, here) < sensed(H.notice, p));
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

/** Where a net has to land to take something: the point of the ground its picture is drawn over (a tile of lift is a tile up the screen, which is one back along each of the map's ways). */
export const aimOf = (p: Pose): Vec => ({ x: p.x - p.lift, y: p.y - p.lift });
/** The ring a net takes an insect within, in tiles: smaller for the small ones, and for tired hands. */
export const ringOf = (id: BugId, spent: boolean) => NET.radius * BUGS[id].size * (spent ? NET.tired.radius : 1);
/** How long a swing takes to land. */
export const swingMs = (spent: boolean) => (spent ? NET.tired.lands : NET.lands);
/** Whether a net landing at a point takes an insect as it is then. */
export const taken = (id: BugId, p: Pose, at: Vec, spent: boolean) => p.open && far(aimOf(p), at) <= ringOf(id, spent);
