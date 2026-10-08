import { describe, expect, it } from "vitest";
import { caveFloor, isRest } from "./cave";
import { boardOf, breakRocks, caveAt, caveDay, chamberOf, changesAt, cornerOf, crystalBroken, floorRocks, floorSpots, floorTile, goneAt, mossAt, newCave, openWay, setMoss, setTorch, stands, strikeRock, struckAt, struckTold, torchesAt, wayOpen } from "./cave-state";
import { MINING } from "./mining";
import { pouchToBag, bagToPouch, heldIn, pouchesOf, roomIn, stow, stowAll, takeOut, POUCHES } from "./pouches";
import { newPurse, type Purse } from "./trade";

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-08T12:00:00"), DAWN = at("2026-10-09T05:00:00");
const who = (by = "me", name = "Mi", when = NOON) => ({ by, name, at: when });

describe("what the village shares of the cave", () => {
  it("a rock broken is gone for its turn and back at the next", () => {
    let s = caveAt(null, NOON);
    expect(s).toEqual(newCave(caveDay(NOON)));
    s = breakRocks(s, 3, [4, 7], NOON);
    s = breakRocks(s, 3, [7, 9], NOON + 60_000);
    s = breakRocks(s, 0, [1], NOON);
    expect(goneAt(s, 3, NOON + 5 * 60_000).sort()).toEqual([4, 7, 9]);
    expect(goneAt(s, 0, NOON)).toEqual([1]);
    expect(goneAt(s, 4, NOON)).toEqual([]);
    expect(stands(s, 3, 4, NOON)).toBe(false);
    expect(stands(s, 3, 5, NOON)).toBe(true);
    // twenty minutes on: back, and a state read then no longer has them
    expect(goneAt(s, 3, NOON + MINING.turn)).toEqual([]);
    expect(caveAt(s, NOON + MINING.turn).broken).toEqual({});
    expect(caveAt(s, NOON + MINING.turn - 1).broken["3"].ids.sort()).toEqual([4, 7, 9]);
    // a rock broken in the new turn does not bring the old ones along
    expect(goneAt(breakRocks(s, 3, [1], NOON + MINING.turn), 3, NOON + MINING.turn)).toEqual([1]);
  });
  it("a way down found is open to everybody until five in the morning, its rock gone meanwhile; a resting floor's stands open", () => {
    let s = caveAt(null, NOON);
    expect(wayOpen(s, 3)).toBe(false);
    expect(wayOpen(s, 10)).toBe(true); expect(wayOpen(s, 20)).toBe(true);
    expect(wayOpen(s, 30)).toBe(false); expect(wayOpen(s, 0)).toBe(false);
    s = openWay(s, 3, { rock: 6, x: 140, y: 330, ...who() });
    expect(wayOpen(s, 3)).toBe(true);
    expect(stands(s, 3, 6, NOON + 3 * MINING.turn)).toBe(false);
    expect(goneAt(s, 3, NOON + 3 * MINING.turn)).toEqual([6]);
    // whoever opens it again changes nothing
    expect(openWay(s, 3, { rock: 2, x: 1, y: 1, ...who("you", "Yu") })).toBe(s);
    expect(openWay(s, 30, { rock: null, x: 1, y: 1, ...who() })).toBe(s);
    const kept = JSON.parse(JSON.stringify(s));
    expect(caveAt(kept, DAWN - 1).ways["3"]).toMatchObject({ rock: 6, x: 140, y: 330, by: "me" });
    expect(caveAt(kept, DAWN).ways).toEqual({});
    expect(caveAt(kept, DAWN).day).toBe(caveDay(NOON) + 1);
  });
  it("the board tells the deepest floor the village has opened the way to today, and who opened it", () => {
    let s = caveAt(null, NOON);
    expect(boardOf(s)).toBeNull();
    s = openWay(s, 1, { rock: 2, x: 0, y: 0, ...who("a", "Aqua") });
    expect(boardOf(s)).toEqual({ floor: 2, by: "a", name: "Aqua", at: NOON });
    s = openWay(s, 4, { rock: null, x: 0, y: 0, ...who("b", "Bo", NOON + 5) });
    expect(boardOf(s)).toMatchObject({ floor: 5, name: "Bo" });
    s = openWay(s, 2, { rock: 1, x: 0, y: 0, ...who("c", "Cy") });
    expect(boardOf(s)).toMatchObject({ floor: 5, name: "Bo" });
    expect(boardOf(caveAt(JSON.parse(JSON.stringify(s)), DAWN))).toBeNull();
  });
  it("the crystal rock, once broken, is gone for the day", () => {
    let s = caveAt(null, NOON);
    expect(stands(s, 28, 5, NOON, 5)).toBe(true);
    s = crystalBroken(s, who());
    expect(stands(s, 28, 5, NOON + 5 * MINING.turn, 5)).toBe(false);
    expect(stands(s, 28, 6, NOON, 5)).toBe(true);
    expect(crystalBroken(s, who("x", "X"))).toBe(s);
    expect(caveAt(JSON.parse(JSON.stringify(s)), DAWN).crystal).toBeNull();
  });
  it("a torch burns five minutes where it was set down, for everybody; one to a tile", () => {
    let s = setTorch(caveAt(null, NOON), 3, 140, 330, "me", NOON);
    s = setTorch(s, 3, 141, 330, "you", NOON + 60_000);
    s = setTorch(s, 4, 200, 330, "me", NOON + 60_000);
    expect(torchesAt(s, 3, NOON + 2 * 60_000).length).toBe(2);
    expect(torchesAt(s, 3, NOON + 5 * 60_000).map((t) => t.x)).toEqual([141]);
    expect(torchesAt(s, 3, NOON + 6 * 60_000)).toEqual([]);
    expect(caveAt(s, NOON + 5 * 60_000).torches.length).toBe(2);
    const anew = setTorch(s, 3, 140, 330, "you", NOON + 4 * 60_000);
    expect(torchesAt(anew, 3, NOON + 8 * 60_000).map((t) => [t.x, t.by])).toEqual([[140, "you"]]);
    // what a page was told changes by itself at the first torch out, or the rocks' next turn
    expect(changesAt(s, NOON + 60_000)).toBe(NOON + 5 * 60_000);
    expect(changesAt(caveAt(null, NOON), NOON + 60_000)).toBe(NOON + MINING.turn);
  });
  // (the two below were written with their rules and never run: the owner's word that evening was to build and not to test yet)
  it("what is struck away of a rock is kept for its turn, for everybody, and is no more once the rock breaks", () => {
    let s = caveAt(null, NOON);
    expect(struckAt(s, 3, 4, NOON)).toBeNull();
    s = strikeRock(s, 3, 4, { first: "a", name: "Aqua", at: NOON, by: { a: 0.5 } }, NOON);
    s = strikeRock(s, 3, 4, { first: "a", name: "Aqua", at: NOON, by: { a: 0.5, b: 0.25 } }, NOON + 1000);
    s = strikeRock(s, 3, 9, { first: "b", name: "Bo", at: NOON, by: { b: 0.25 } }, NOON + 2000);
    expect(struckAt(s, 3, 4, NOON + 5000)).toMatchObject({ first: "a", by: { a: 0.5, b: 0.25 } });
    expect(struckTold(s, 3, "b", NOON + 5000)).toEqual({ 4: { part: 0.75, own: 0.25, by: "Aqua", mine: false }, 9: { part: 0.25, own: 0.25, by: "Bo", mine: true } });
    expect(struckTold(s, 4, "b", NOON + 5000)).toEqual({});
    // kept as it is read again; gone with its rock, and with its turn
    expect(struckAt(caveAt(JSON.parse(JSON.stringify(s)), NOON + 5000), 3, 4, NOON + 5000)).toMatchObject({ first: "a", name: "Aqua" });
    expect(struckAt(breakRocks(s, 3, [4], NOON + 6000), 3, 4, NOON + 6000)).toBeNull();
    expect(struckAt(breakRocks(s, 3, [4], NOON + 6000), 3, 9, NOON + 6000)).toMatchObject({ first: "b" });
    expect(struckAt(s, 3, 4, NOON + MINING.turn)).toBeNull();
    expect(caveAt(s, NOON + MINING.turn).struck).toEqual({});
  });
  it("moss let out of a rock glows a minute where the rock stood, for everybody; and the chamber it lights is the one its rock stood in", () => {
    let s = caveAt(null, NOON);
    s = setMoss(s, 3, 140, 400, "me", NOON);
    expect(mossAt(s, 3, NOON + 59_000)).toEqual([{ f: 3, x: 140, y: 400, until: NOON + 60_000, by: "me" }]);
    expect(mossAt(s, 3, NOON + 60_000)).toEqual([]);
    expect(mossAt(s, 4, NOON)).toEqual([]);
    expect(changesAt(s, NOON)).toBe(NOON + 60_000);
    expect(caveAt(s, NOON + 61_000).moss).toEqual([]);
    expect(caveAt(s, DAWN).moss).toEqual([]);
    const day = caveDay(NOON), corner = cornerOf(3);
    for (const r of floorRocks(3, day)) {
      const c = chamberOf(3, day, r.x, r.y)!;
      expect(c.x).toBeGreaterThan(corner.x); expect(c.y).toBeGreaterThan(corner.y);
      expect(Math.hypot(r.x + 0.5 - c.x, r.y + 0.5 - c.y)).toBeLessThan(c.r + 4);
    }
    expect(chamberOf(0, day, 1, 1)).toBeNull();
  });
  it("what is kept wrongly is read as nothing", () => {
    expect(caveAt("nonsense", NOON)).toEqual(newCave(caveDay(NOON)));
    expect(caveAt({ day: caveDay(NOON), ways: { 3: { x: "a" } }, broken: { 3: { turn: 1, ids: [1] } }, torches: [{ f: 1 }], deepest: { floor: "x" }, crystal: 5 }, NOON)).toEqual(newCave(caveDay(NOON)));
  });
});

describe("where the cave's things are", () => {
  it("the floors lie four to a row, sixty-four tiles apart, and a floor's rocks are told in the world's tiles", () => {
    expect(cornerOf(1)).toEqual({ x: 0, y: 320 });
    expect(cornerOf(4)).toEqual({ x: 192, y: 320 });
    expect(cornerOf(5)).toEqual({ x: 0, y: 384 });
    expect(cornerOf(30)).toEqual({ x: 64, y: 320 + 7 * 64 });
    for (const day of [20733, 20734]) for (let f = 1; f <= 30; f++) {
      const rocks = floorRocks(f, day), laid = caveFloor(f, day), c = cornerOf(f);
      expect(rocks.length).toBe(isRest(f) ? 0 : laid.rocks.length);
      for (const r of rocks) { expect(r.x - c.x).toBe(laid.rocks[r.id].u); expect(floorTile(f, day, r.x, r.y)).toBe(false); }
      const spots = floorSpots(f, day);
      expect(floorTile(f, day, spots.arrive[0], spots.arrive[1])).toBe(true);
      expect(!!spots.lift).toBe(isRest(f));
      if (spots.liftAt) expect(floorTile(f, day, spots.liftAt[0], spots.liftAt[1])).toBe(true);
    }
    expect(floorRocks(0, 1)).toEqual([]); expect(floorRocks(31, 1)).toEqual([]);
    expect(floorTile(31, 1, 0, 0)).toBe(false);
  });
});

describe("pouches", () => {
  const sack: Purse = { ...newPurse(), gifts: { had: ["thingSack"], charms: [] } };
  it("a pouch is its gift's: so many slots that hold only some things, and nobody without the gift has any", () => {
    expect(POUCHES.find((p) => p.gift === "thingSack")).toMatchObject({ slots: 5 });
    const holds = POUCHES.find((p) => p.gift === "thingSack")!.holds;
    for (const id of ["stone", "shardCopper", "shardIron", "shardSilver", "chipRuby", "chipOnyx", "oreCopper", "oreSilver", "gemRuby", "gemOnyx"] as const) expect(holds).toContain(id);
    for (const id of ["log", "timber", "torch", "pick", "minnow"] as const) expect(holds).not.toContain(id);
    expect(pouchesOf(newPurse())).toEqual([]);
    expect(pouchesOf(sack)).toEqual([{ pouch: POUCHES[0], slots: [null, null, null, null, null] }]);
    expect(roomIn(newPurse(), "stone")).toBe(10 * 50);
    expect(roomIn(sack, "stone")).toBe(15 * 50);
    expect(roomIn(sack, "minnow")).toBe(roomIn(newPurse(), "minnow"));
  });
  it("what a pouch takes goes into it before the bag, and what it does not take never goes in", () => {
    let p = stow(sack, "stone", 60);
    expect(p.pouches!.thingSack.slice(0, 2)).toEqual([{ item: "stone", n: 50 }, { item: "stone", n: 10 }]);
    expect(p.bag.every((s) => s === null)).toBe(true);
    p = stow(p, "minnow", 2);
    expect(p.bag[0]).toMatchObject({ item: "minnow", n: 2 });
    expect(heldIn(p, "stone")).toBe(60);
    // five kinds fill it; the sixth goes to the bag
    p = stowAll(sack, [["stone", 1], ["shardCopper", 1], ["shardIron", 1], ["chipRuby", 1], ["gemOnyx", 1], ["oreCopper", 3]])!;
    expect(p.pouches!.thingSack.every((s) => s !== null)).toBe(true);
    expect(p.bag[0]).toEqual({ item: "oreCopper", n: 3 });
    // and with no room anywhere, nothing is put
    const full: Purse = { ...p, bag: p.bag.map(() => ({ item: "minnow" as const, n: 1 })) };
    expect(stowAll(full, [["stone", 49]])).not.toBeNull();
    expect(stowAll(full, [["stone", 50]])).toBeNull();
    expect(stowAll(full, [["oreIron", 1]])).toBeNull();
  });
  it("things are taken out of the bag first, and moved between a pouch and the bag a slot at a time", () => {
    let p = stow(sack, "shardCopper", 30);
    p = { ...p, bag: p.bag.map((s, i) => (i === 0 ? { item: "shardCopper", n: 5 } : s)) };
    expect(heldIn(p, "shardCopper")).toBe(35);
    const less = takeOut(p, "shardCopper", 12);
    expect(less.bag[0]).toBeNull();
    expect(less.pouches!.thingSack[0]).toEqual({ item: "shardCopper", n: 23 });
    const out = pouchToBag(less, "thingSack", 0);
    expect(out.ok && out.n).toBe(23);
    expect(out.ok && heldIn(out.purse, "shardCopper")).toBe(23);
    expect(out.ok && out.purse.pouches!.thingSack[0]).toBeNull();
    expect(pouchToBag(less, "thingSack", 3)).toEqual({ ok: false, why: "none" });
    expect(pouchToBag(newPurse(), "thingSack", 0)).toEqual({ ok: false, why: "none" });
    const back = bagToPouch(p, 0);
    expect(back.ok && back.purse.bag[0]).toBeNull();
    expect(back.ok && back.purse.pouches!.thingSack[0]).toEqual({ item: "shardCopper", n: 35 });
    expect(bagToPouch({ ...sack, bag: sack.bag.map((s, i) => (i === 0 ? { item: "minnow", n: 1 } : s)) }, 0)).toEqual({ ok: false, why: "none" });
    expect(bagToPouch({ ...sack, bag: sack.bag.map((s, i) => (i === 0 ? { item: "pick", n: 1, plus: 2 } : s)) }, 0)).toEqual({ ok: false, why: "none" });
  });
  it("a pouch kept wrongly is read as what it may hold", () => {
    const odd: Purse = { ...sack, pouches: { thingSack: [{ item: "minnow", n: 3 }, { item: "stone", n: 999 }, null, { item: "stone", n: 0 }, { item: "chipRuby", n: 2 }, { item: "stone", n: 1 }] } };
    expect(pouchesOf(odd)[0].slots).toEqual([null, { item: "stone", n: 50 }, null, null, { item: "chipRuby", n: 2 }]);
  });
});
