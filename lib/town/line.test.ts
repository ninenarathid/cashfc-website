import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { WATER } from "./farm";
import type { ItemId } from "./items";
import { LINE, OFFER, between, carried, inReach, pass, takers, toWell, type Stander } from "./line";
import { staminaOf } from "./stamina";
import { hold, newPurse, put, type Purse } from "./trade";
import { workOf } from "./jar";
import { helpersOf } from "./thanks";
import { LINE_HANDS, bookOf, newLog, rankOf, seen, type WaterDeed } from "./well";
import { FARM, GATES, WELL, atWell } from "./world";

const NOW = Date.parse("2026-10-06T09:00:00+07:00");
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const withWater = (id: ItemId, n: number, ...more: Array<[ItemId, number]>): Purse => {
  const p = purseWith([id, 1], ...more);
  return { ...p, bag: p.bag.map((s) => (s?.item === id && n ? { ...s, water: n } : s)) };
};
const holding = (p: Purse, id: ItemId): Purse => {
  const d = hold(p, p.bag.findIndex((s) => s?.item === id));
  if (!d.ok) throw new Error("nothing to hold");
  return d.purse;
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };

describe("a bucket line (the owner, 2026-10-05: \"a bucket line of three or more\")", () => {
  it("hands the water in my bucket on into the empty bucket somebody holds", () => {
    const me = holding(withWater("bucket", 1), "bucket"), you = holding(purseWith(["bucket", 1]), "bucket");
    const did = done(pass(me, you, NOW));
    expect([did.n, did.can, did.into]).toEqual([1, "bucket", "bucket"]);
    expect(did.from.bag.find((s) => s?.item === "bucket")).toEqual({ item: "bucket", n: 1 });
    expect(did.to.bag.find((s) => s?.item === "bucket")).toEqual({ item: "bucket", n: 1, water: 1 });
    // it costs whoever hands it on a stamina, and whoever takes it nothing
    expect(staminaOf(did.from, NOW)).toBe(100 - LINE.cost);
    expect(did.to.stamina).toEqual(you.stamina);
    expect([LINE.reach, LINE.cost]).toEqual([40, 1]);
  });

  it("gives as much as the other's bucket carries, and keeps the rest", () => {
    // a great yoke's four into a plain bucket: one goes over
    const yoke = holding(withWater("waterYokeGreat", 4), "waterYokeGreat");
    let did = done(pass(yoke, holding(purseWith(["bucket", 1]), "bucket"), NOW));
    expect(did.n).toBe(1);
    expect(did.from.bag.find((s) => s?.item === "waterYokeGreat")).toEqual({ item: "waterYokeGreat", n: 1, water: 3 });
    // …into another great yoke: all four
    did = done(pass(yoke, holding(purseWith(["waterYokeGreat", 1]), "waterYokeGreat"), NOW));
    expect(did.n).toBe(4);
    expect(did.to.bag.find((s) => s?.item === "waterYokeGreat")).toEqual({ item: "waterYokeGreat", n: 1, water: 4 });
    // a plain bucket's one into an iron one: one, though it carries two
    did = done(pass(holding(withWater("bucket", 1), "bucket"), holding(purseWith(["bucketIron", 1]), "bucketIron"), NOW));
    expect([did.n, did.to.bag.find((s) => s?.item === "bucketIron")!.water]).toEqual([1, 1]);
    for (const id of Object.keys(WATER.buckets) as ItemId[]) expect(carried(holding(withWater(id, 1), id))).toMatchObject({ hand: id, has: 1 });
  });

  it("is refused with nothing to hand on, nobody holding a bucket to take it, or a bucket that has water", () => {
    const me = holding(withWater("bucket", 1), "bucket"), empty = holding(purseWith(["bucket", 1]), "bucket");
    // my bucket empty; a can; a full bucket in the bag and not in the hand
    expect(pass(empty, empty, NOW)).toEqual({ ok: false, why: "hand" });
    expect(pass(holding(withWater("can", 5), "can"), empty, NOW)).toEqual({ ok: false, why: "hand" });
    expect(pass(withWater("bucket", 1), empty, NOW)).toEqual({ ok: false, why: "hand" });
    // they hold nothing; a can; their bucket in the bag and not in the hand
    expect(pass(me, purseWith(["bucket", 1]), NOW)).toEqual({ ok: false, why: "none" });
    expect(pass(me, holding(purseWith(["can", 1]), "can"), NOW)).toEqual({ ok: false, why: "none" });
    // their bucket has water already
    expect(pass(me, holding(withWater("bucket", 1), "bucket"), NOW)).toEqual({ ok: false, why: "full" });
    expect(pass(me, holding(withWater("waterYoke", 1), "waterYoke"), NOW)).toEqual({ ok: false, why: "full" });
    expect(carried(empty)).toBeNull();
  });

  it("with no stamina left is done all the same", () => {
    const tired: Purse = { ...holding(withWater("bucket", 1), "bucket"), stamina: { day: Math.floor((NOW + 2 * 3_600_000) / 86_400_000), left: 0 } };
    const did = done(pass(tired, holding(purseWith(["bucket", 1]), "bucket"), NOW));
    expect([did.n, staminaOf(did.from, NOW)]).toEqual([1, 0]);
  });

  it("measures the way as the path goes: straight on a map, by the gate between two", () => {
    expect(between({ x: 10, y: 10 }, { x: 13, y: 14 })).toBe(5);
    const toFarm = GATES.find((g) => g.from === "town" && g.leads === "farm")!, [gx, gy] = toFarm.tiles[0];
    // standing on the gate: the other side is where it leads
    expect(between({ x: gx + 0.5, y: gy + 0.5 }, toFarm.to)).toBe(0);
    expect(between({ x: gx + 0.5, y: gy + 0.5 - 6 }, { x: toFarm.to.x + 8, y: toFarm.to.y })).toBeCloseTo(14, 0);
    // …and back by the farm's own gate
    expect(between({ x: FARM.x + 10, y: 20 }, { x: 50, y: 31 })).toBeLessThan(30);
    // off every map there is no way
    expect(between({ x: -5, y: -5 }, { x: 10, y: 10 })).toBe(Infinity);
    expect(inReach({ x: 10, y: 10 }, { x: 10, y: 50 })).toBe(true);
    expect(inReach({ x: 10, y: 10 }, { x: 10, y: 51 })).toBe(false);
  });

  it("takes three to bring water from the river to the farm's well: two cannot reach", () => {
    const river = Object.keys(catalogOf().fishing.places).map((k) => { const [x, y] = k.split(",").map(Number); return { x: x + 0.5, y: y + 0.5 }; });
    const atTheWell: Array<{ x: number; y: number }> = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (atWell(WELL.x + dx, WELL.y + dy)) atTheWell.push({ x: WELL.x + dx + 0.5, y: WELL.y + dy + 0.5 });
    expect(atTheWell.length).toBeGreaterThan(0);
    // from no tile of the river is anybody at the well within reach
    const nearest = Math.min(...river.flatMap((r) => atTheWell.map((w) => between(r, w))));
    expect(nearest).toBeGreaterThan(LINE.reach);
    // …and there are places to stand in between from which both are: so three can
    const gate = GATES.find((g) => g.from === "town" && g.leads === "farm")!;
    const mid = { x: gate.tiles[0][0] + 0.5 - 2, y: gate.tiles[0][1] + 0.5 };
    expect(river.some((r) => inReach(r, mid))).toBe(true);
    expect(atTheWell.some((w) => inReach(mid, w))).toBe(true);
    expect(nearest).toBeLessThan(2 * LINE.reach);
  });

  it("counts a bucketful for everybody whose hands it went through, when it is poured: the well's book", () => {
    const deeds: WaterDeed[] = [
      { by: "ann", at: NOW, what: "draw", can: "bucket" },
      { by: "ann", at: NOW + 1000, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucket" },
      { by: "bo", at: NOW + 2000, what: "pass", n: 1, can: "bucket", to: "cy", into: "bucketIron" },
      { by: "cy", at: NOW + 3000, what: "pour", n: 1, can: "bucketIron" },
    ];
    const log = deeds.reduce(seen, newLog()), name = (id: string) => id;
    // each of the three has carried a bucketful: towards their rank, among the day's carriers (all at the moment it was poured, so by their names' order), and at the jar by the well
    expect(Object.fromEntries(Object.entries(log.carriers).map(([id, c]) => [id, c.buckets]))).toEqual({ ann: 1, bo: 1, cy: 1 });
    expect(bookOf(log, "ann", NOW + 5000, name).carriers.map((c) => [c.id, c.buckets])).toEqual([["ann", 1], ["bo", 1], ["cy", 1]]);
    for (const who of ["ann", "bo", "cy"]) expect(bookOf(log, who, NOW + 5000, name).today.buckets).toBe(1);
    const round = Number(Object.keys(log.work)[0]);
    expect(workOf(log, round, round + 1)).toEqual([["ann", 8], ["bo", 8], ["cy", 8]]);
    // whose water it is in the well is the pourer's
    expect(log.water).toEqual([{ by: "cy", left: 1 }]);
    // the hands it came by are kept with the bucket that has it, the holder last
    expect(log.line).toMatchObject({ "bo/bucket": ["ann", "bo"], "cy/bucketIron": ["ann", "bo", "cy"] });
  });

  it("follows the hands to a bed and to the yard's jar too, and only as far as the water went", () => {
    // over a bed: the bucketfuls it took count for the one who handed it on; whose plants were watered have the pourer to thank, not them
    let log = ([
      { by: "ann", at: NOW, what: "pass", n: 2, can: "waterYoke", to: "bo", into: "waterYoke" },
      { by: "bo", at: NOW + 1000, what: "ditch", n: 2, plants: 9, can: "waterYoke" },
      { by: "bo", at: NOW + 1000, what: "water", can: "waterYoke", tile: [133, 5], whose: "di" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect([log.carriers.ann.buckets, log.carriers.bo.buckets]).toEqual([2, 2]);
    expect(helpersOf(log, "133,5", "di").map((h) => h.id)).toEqual(["bo"]);
    // into the yard's jar
    log = ([
      { by: "ann", at: NOW, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucket" },
      { by: "bo", at: NOW + 1000, what: "yard", n: 1, can: "bucket" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect([log.carriers.ann.buckets, log.carriers.bo.buckets, log.yard]).toEqual([1, 1, [{ by: "bo", left: 1 }]]);
    // a bucket drawn anew has nobody's hands on it but the drawer's: the next pouring is theirs alone
    log = ([
      { by: "ann", at: NOW, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucket" },
      { by: "bo", at: NOW + 1000, what: "pour", n: 1, can: "bucket" },
      { by: "bo", at: NOW + 2000, what: "draw", can: "bucket" },
      { by: "bo", at: NOW + 3000, what: "pour", n: 1, can: "bucket" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect([log.carriers.ann.buckets, log.carriers.bo.buckets]).toEqual([1, 2]);
    expect("bo/bucket" in log.line).toBe(false);
    // a bucket poured by halves counts each time for those it came by
    log = ([
      { by: "ann", at: NOW, what: "pass", n: 4, can: "waterYokeGreat", to: "bo", into: "waterYokeGreat" },
      { by: "bo", at: NOW + 1000, what: "pour", n: 3, can: "waterYokeGreat" },
      { by: "bo", at: NOW + 2000, what: "pour", n: 1, can: "waterYokeGreat" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect([log.carriers.ann.buckets, log.carriers.bo.buckets]).toEqual([4, 4]);
    // water handed back to somebody who had it before: they are there once, the last
    log = ([
      { by: "ann", at: NOW, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucket" },
      { by: "bo", at: NOW + 1000, what: "pass", n: 1, can: "bucket", to: "ann", into: "bucket" },
      { by: "ann", at: NOW + 2000, what: "pour", n: 1, can: "bucket" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect(log.line["ann/bucket"]).toEqual(["bo", "ann"]);
    expect([log.carriers.ann.buckets, log.carriers.bo.buckets]).toEqual([1, 1]);
    // six hundred bucketfuls through one's hands make a keeper of the well as surely as six hundred carried alone
    expect(rankOf(([{ by: "ann", at: NOW, what: "pass", n: 4, can: "waterYokeGreat", to: "bo", into: "waterYokeGreat" }, ...Array.from({ length: 150 }, (_, i): WaterDeed => ({ by: "bo", at: NOW + 1000 + i, what: "pour", n: 4, can: "waterYokeGreat" }))] as WaterDeed[])
      .reduce(seen, newLog()).carriers.ann.buckets)).toBe(3);
  });

  it("remembers the last eight hands, and nothing of a line that says too little", () => {
    const who = Array.from({ length: 12 }, (_, i) => `m${String(i).padStart(2, "0")}`);
    let log = newLog();
    for (let i = 0; i + 1 < who.length; i++) log = seen(log, { by: who[i], at: NOW + i, what: "pass", n: 1, can: "bucket", to: who[i + 1], into: "bucket" });
    expect(log.line[`${who[11]}/bucket`]).toEqual(who.slice(-LINE_HANDS));
    expect(LINE.hands).toBe(LINE_HANDS);
    log = seen(log, { by: who[11], at: NOW + 100, what: "pour", n: 1, can: "bucket" });
    expect(Object.keys(log.carriers).sort()).toEqual(who.slice(-LINE_HANDS));
    // a pass with nobody to take it, no bucket named, or nothing in it: nothing
    for (const d of [{ to: undefined }, { into: undefined }, { can: undefined }, { n: 0 }]) {
      expect(seen(newLog(), { by: "ann", at: NOW, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucket", ...d } as WaterDeed)).toEqual(newLog());
    }
    // water poured out of a bucket nothing is known of (every bucketful before there were lines): the pourer's alone
    expect(Object.keys(seen(newLog(), { by: "ann", at: NOW, what: "pour", n: 2 }).carriers)).toEqual(["ann"]);
  });
});

describe("whom a page offers the water to (the owner, 2026-10-05: \"การส่งน้ำ ต้องทำยังไง ทำไมใช้ยากจังเลย\")", () => {
  // a plot of the farm some twenty tiles from the well, and somebody standing still there with an empty bucket
  const HERE = { x: FARM.x + 12.5, y: FARM.y + 8.5 };
  const one = (id: string, dx: number, dy: number, more: Partial<Stander> = {}): Stander => ({ id, name: id, x: HERE.x + dx, y: HERE.y + dy, moving: false, hold: "bucket", wet: false, ...more });
  const ids = (people: Stander[], quiet = false) => takers("me", HERE, people, quiet).offered.map((p) => p.id);
  const lacks = (people: Stander[], quiet = false) => { const l = takers("me", HERE, people, quiet).lacks; return l ? [l.who.id, l.why] : null; };

  it("offers a friend who stands beside me, whichever of us is nearer the well", () => {
    // (water went only to somebody two tiles or more nearer the well: side by side nobody was offered anything)
    const nearer = one("bo", 1, 0), further = one("cy", -1, 0), level = one("di", 0.3, -0.3);
    expect(toWell(nearer)).toBeLessThan(toWell(HERE));
    expect(toWell(HERE) - toWell(nearer)).toBeLessThan(2);
    expect(toWell(further)).toBeGreaterThan(toWell(HERE));
    expect(ids([nearer])).toEqual(["bo"]);
    expect(ids([further])).toEqual(["cy"]);
    expect(ids([level])).toEqual(["di"]);
    // …and a farmer at a bed far out from the well, from somebody who stands by it
    const byWell = { x: WELL.x - 0.5, y: WELL.y + 0.5 }, farmer: Stander = { id: "ed", name: "ed", x: FARM.x + 50.5, y: FARM.y + 6.5, moving: false, hold: "waterYoke", wet: false };
    expect(toWell(farmer)).toBeGreaterThan(toWell(byWell) + 20);
    expect(takers("me", byWell, [farmer]).offered.map((p) => p.id)).toEqual(["ed"]);
  });

  it("offers nobody who is walking, whose bucket has water, who holds no bucket, who is out of reach, nor me", () => {
    expect(ids([one("bo", 2, 0, { moving: true })])).toEqual([]);
    expect(ids([one("bo", 2, 0, { wet: true })])).toEqual([]);
    expect(ids([one("bo", 2, 0, { hold: null })])).toEqual([]);
    expect(ids([one("bo", 2, 0, { hold: "can" })])).toEqual([]);
    expect(ids([one("me", 2, 0)])).toEqual([]);
    expect(ids([one("bo", LINE.reach + 0.5, 0)])).toEqual([]);
    expect(ids([one("bo", LINE.reach - 0.5, 0)])).toEqual(["bo"]);
    // a page built before it was told whether a bucket has water says nothing of it: offered (whoever keeps the game refuses a full one)
    expect(ids([one("bo", 2, 0, { wet: undefined })])).toEqual(["bo"]);
    // handing water on is a game the two play together (lib/town/handing): whoever is looking at another page is not there to play
    expect(ids([one("bo", 2, 0, { away: true })])).toEqual([]);
    expect(ids([one("bo", 2, 0, { away: false })])).toEqual(["bo"]);
    // every kind of bucket takes water
    for (const id of Object.keys(WATER.buckets) as ItemId[]) expect(ids([one("bo", 2, 0, { hold: id })])).toEqual(["bo"]);
  });

  it("puts those nearer the well first, the nearest to it first, then the others by how near they are to me: three at the most", () => {
    // towards the well from here is down the map and to the right: two that way, two the other
    const a = one("a-far-forward", 10, 8), b = one("b-near-forward", 3, 2), c = one("c-beside-back", -1, -1), d = one("d-far-back", -9, -3);
    expect([toWell(a), toWell(b)].every((w) => w < toWell(HERE)) && [toWell(c), toWell(d)].every((w) => w > toWell(HERE))).toBe(true);
    expect(toWell(a)).toBeLessThan(toWell(b));
    expect(ids([d, c, b, a])).toEqual(["a-far-forward", "b-near-forward", "c-beside-back"]);
    expect(ids([d, c])).toEqual(["c-beside-back", "d-far-back"]);
    expect(OFFER.most).toBe(3);
    // with somebody to offer, nobody is named as lacking anything
    expect(lacks([c, one("w", 1, 1, { moving: true })])).toBeNull();
  });

  it("with nobody to offer, names whoever stands close by and what they lack", () => {
    expect(lacks([])).toBeNull();
    expect(lacks([one("bo", 2, 0, { moving: true })])).toEqual(["bo", "walking"]);
    expect(lacks([one("bo", 2, 0, { wet: true })])).toEqual(["bo", "full"]);
    // (walking with a full bucket: it is the water that is in the way)
    expect(lacks([one("bo", 2, 0, { wet: true, moving: true })])).toEqual(["bo", "full"]);
    expect(lacks([one("bo", 2, 0, { hold: null })])).toEqual(["bo", "bare"]);
    expect(lacks([one("bo", 2, 0, { hold: "can" })])).toEqual(["bo", "bare"]);
    // standing there with an empty bucket, and looking at another page: said so (the water in their bucket first, and walking)
    expect(lacks([one("bo", 2, 0, { away: true })])).toEqual(["bo", "away"]);
    expect(lacks([one("bo", 2, 0, { away: true, wet: true })])).toEqual(["bo", "full"]);
    expect(lacks([one("bo", 2, 0, { away: true, moving: true })])).toEqual(["bo", "walking"]);
    // somebody with a bucket before somebody with none, however near; of two alike, the nearer
    expect(lacks([one("bare", 1, 0, { hold: null }), one("full", 3, 0, { wet: true })])).toEqual(["full", "full"]);
    expect(lacks([one("far", 3, 0, { hold: null }), one("near", 1, 0, { hold: null })])).toEqual(["near", "bare"]);
    // only who is close by: further off they are nobody's business
    expect(lacks([one("bo", OFFER.beside + 0.5, 0, { wet: true }), one("cy", 0, OFFER.beside + 0.5, { hold: null })])).toBeNull();
    expect(lacks([one("bo", OFFER.beside - 0.5, 0, { wet: true })])).toEqual(["bo", "full"]);
    // somebody passing by with nothing in their hand is not named
    expect(lacks([one("bo", 1, 0, { hold: null, moving: true })])).toBeNull();
    // where the water has a place of its own to go, those standing about with no bucket are not named; one with a bucket still is
    expect(lacks([one("bo", 1, 0, { hold: null })], true)).toBeNull();
    expect(lacks([one("bo", 1, 0, { hold: null }), one("cy", 2, 0, { wet: true })], true)).toEqual(["cy", "full"]);
  });

  it("still makes a line of three from the river to the well", () => {
    const river = Object.keys(catalogOf().fishing.places).map((k) => { const [x, y] = k.split(",").map(Number); return { x: x + 0.5, y: y + 0.5 }; })
      .sort((p, q) => toWell(p) - toWell(q))[0];
    const gate = GATES.find((g) => g.from === "town" && g.leads === "farm")!;
    const mid: Stander = { id: "mid", name: "mid", x: gate.tiles[0][0] + 0.5 - 2, y: gate.tiles[0][1] + 0.5, moving: false, hold: "bucket", wet: false };
    const last: Stander = { id: "last", name: "last", x: WELL.x - 0.5, y: WELL.y + 0.5, moving: false, hold: "bucketIron", wet: false };
    // by the river: the one about the gate, and not the one at the well (out of reach)
    expect(takers("first", river, [mid, last]).offered.map((p) => p.id)).toEqual(["mid"]);
    // about the gate with the water: the one at the well first, then the one by the river (whose bucket is empty now)
    const first: Stander = { id: "first", name: "first", ...river, moving: false, hold: "bucket", wet: false };
    expect(takers("mid", mid, [first, last]).offered.map((p) => p.id)).toEqual(["last", "first"]);
    // …and while the first still has water, only the one at the well
    expect(takers("mid", mid, [{ ...first, wet: true }, last]).offered.map((p) => p.id)).toEqual(["last"]);
  });
});
