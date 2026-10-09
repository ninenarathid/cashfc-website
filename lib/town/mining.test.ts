import { describe, expect, it } from "vitest";
import { caveFloor, isRest } from "./cave";
import { floorRocks } from "./cave-state";
import { MINING, anyPick, crystalOf, drill, elementOf, hardnessOf, helpersOf, holdsOf, isDug, isWhole, liftStops, lightOf, mayRide, mine, mineOf, nextTurnAt, oreOf, partOf, payFirst, peekOf, reachRest, struckOf, swingsFor, torchDown, turnOf, veinEnd, wayRockOf, type Go, type Holds, type Mined, type RockAt, type Struck } from "./mining";
import { powerLeft } from "./powers";
import { dayOf, staminaOf } from "./stamina";
import { ELEMENTS, GEMS, LEVELS } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import { VEIN, faceOf, headOf, play, begin, strike, type Cell } from "./vein";

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-08T12:00:00");
const SALT = "a word for the tests";
const pickAt = (plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item: "pick", n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });
/** A member with a pick in the hand and so much stamina. */
const miner = (pick: Stack = pickAt(), stamina = 50, more: Partial<Purse> = {}): Purse => {
  const p = newPurse();
  return { ...p, bag: p.bag.map((s, i) => (i === 0 ? pick : s)), hand: "pick", handAt: 0, stamina: { day: dayOf(NOON), left: stamina }, ...more };
};
/** A made-up place: rocks in a row two tiles apart (so each touches the next), and one far off. */
const ROCKS: RockAt[] = [...Array.from({ length: 12 }, (_, i) => ({ id: i, x: 10 + i * 2, y: 10, look: i === 7 ? 3 : 0 })), { id: 12, x: 60, y: 40, look: 1 }];
const NONE = { way: null, crystal: null };
const go = (over: Partial<Go> = {}): Go => {
  const r = ROCKS.find((x) => x.id === (over.rock ?? 0));
  return { now: NOON, floor: 5, rock: 0, at: r ? [r.x + 1, r.y] : [0, 0], swings: 99, rocks: ROCKS, standing: () => true, salt: SALT, day: dayOf(NOON), today: NONE, element: "fire", points: 0, ...over };
};
const done = (d: ReturnType<typeof mine>): Mined => { if (!d.ok) throw new Error(`refused: ${d.why}`); if (d.done !== true) throw new Error(`not broken: ${String(d.done)}`); return d; };
/** A rock and a turn of a floor where the rolls come out some way, with the tests' word. */
function where(floor: number, want: (h: Holds) => boolean, pick: Stack | null = null): { rock: number; now: number } {
  for (let t = 0; t < 400; t++) for (const r of ROCKS) {
    const now = NOON + t * MINING.turn;
    if (want(holdsOf(SALT, floor, r.id, turnOf(now), NONE, pick))) return { rock: r.id, now };
  }
  throw new Error("no such rock");
}
const count = (p: Purse, id: string) => p.bag.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0);

describe("mining: when, and what a place is", () => {
  it("a turn is twenty minutes, and the day's turn at five in the morning is a turn's edge", () => {
    expect(MINING.turn).toBe(20 * 60_000);
    expect(turnOf(NOON + MINING.turn) - turnOf(NOON)).toBe(1);
    expect(nextTurnAt(NOON + 1)).toBe(NOON + MINING.turn);
    const dawn = at("2026-10-09T05:00:00");
    expect(dawn % MINING.turn).toBe(0);
    expect(dayOf(dawn) - dayOf(dawn - 1)).toBe(1);
    expect(turnOf(dawn) - turnOf(dawn - 1)).toBe(1);
  });
  it("a rock is as hard as its depth, and a pick of each plus takes the swings the table says", () => {
    expect([0, 1, 10, 11, 20, 21, 30].map((f) => hardnessOf(f))).toEqual([12, 12, 12, 18, 18, 24, 24]);
    expect([5, 15, 25].map((f) => swingsFor(pickAt(), f, false))).toEqual([4, 6, 8]);
    expect(swingsFor(pickAt(), 0, false)).toBe(4);
    expect(LEVELS.pick.power.map((_, l) => swingsFor(pickAt(l), 5, false))).toEqual([4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1]);
    // with no stamina twice the swings; a rock loosened one fewer, never under one
    expect(LEVELS.pick.power.map((_, l) => swingsFor(pickAt(l), 5, true))).toEqual([8, 8, 8, 8, 6, 6, 6, 4, 4, 4, 2]);
    expect(swingsFor(pickAt(), 5, false, true)).toBe(3);
    expect(swingsFor(pickAt(10), 5, false, true)).toBe(1);
    // a fire gem a share fewer (rounded up), a dark gem one more
    expect(swingsFor(pickAt(0, [], ["fire"]), 25, false)).toBe(Math.ceil(8 * 0.85));
    expect(swingsFor(pickAt(0, [], ["dark"]), 5, false)).toBe(5);
  });
  it("from the fourth rank of the line the deeper floors' rocks are harder, and the first ten floors' never", () => {
    expect(hardnessOf(15, 700)).toBeCloseTo(18 * 1.08);
    expect(hardnessOf(25, 12000)).toBeCloseTo(24 * 1.56);
    expect(hardnessOf(5, 12000)).toBe(12);
    expect(hardnessOf(0, 12000)).toBe(12);
    expect(swingsFor(pickAt(), 15, false, false, 700)).toBe(7);
  });
  it("the ore is the depth's: copper, iron, silver; copper on the mountain's foot", () => {
    expect([0, 1, 10, 11, 20, 21, 30].map(oreOf)).toEqual(["shardCopper", "shardCopper", "shardCopper", "shardIron", "shardIron", "shardSilver", "shardSilver"]);
  });
  it("a floor's element is the day's, the same for everybody; light and dark come half as often as each of the others", () => {
    const n: Record<string, number> = {};
    for (let day = 0; day < 400; day++) for (let f = 1; f <= 30; f++) { const e = elementOf(SALT, f, day); n[e] = (n[e] ?? 0) + 1; }
    const plain = ELEMENTS.filter((e) => e !== "light" && e !== "dark").map((e) => n[e]), mean = plain.reduce((a, b) => a + b, 0) / plain.length;
    for (const k of plain) expect(k / mean).toBeGreaterThan(0.9);
    for (const k of plain) expect(k / mean).toBeLessThan(1.1);
    for (const e of ["light", "dark"]) { expect(n[e] / mean).toBeGreaterThan(0.42); expect(n[e] / mean).toBeLessThan(0.58); }
    expect(elementOf(SALT, 7, 20734)).toBe(elementOf(SALT, 7, 20734));
    expect(new Set(Array.from({ length: 30 }, (_, i) => elementOf("another word", 7, i)).map((e, i) => e === elementOf(SALT, 7, i))).has(false)).toBe(true);
  });
  it("what a rock holds: stone always, fragments four times in ten in the cave and one in five on the foot, a vein eight in a hundred, a gem's one vein in twenty", () => {
    let shards = 0, veins = 0, gems = 0, two = 0, all = 0, foot = 0;
    for (let turn = 0; turn < 3000; turn++) for (let rock = 0; rock < 20; rock++) {
      const h = holdsOf(SALT, 7, rock, turn, NONE);
      all++;
      if (h.kind === "vein") { veins++; if (h.gem) gems++; expect(Number.isInteger(h.seed) && h.seed >= 0 && h.seed < 2 ** 32).toBe(true); }
      else if (h.kind === "stone" && h.shards) { shards++; expect([1, 2]).toContain(h.shards); if (h.shards === 2) two++; }
      const m = holdsOf(SALT, 0, rock, turn, NONE);
      expect(m.kind).toBe("stone");
      if (m.kind === "stone" && m.shards) { foot++; expect(m.shards).toBe(1); }
    }
    expect(veins / all).toBeGreaterThan(0.07); expect(veins / all).toBeLessThan(0.09);
    expect(gems / veins).toBeGreaterThan(0.03); expect(gems / veins).toBeLessThan(0.07);
    // (fragments are rolled apart from the vein: of the rocks that are no vein, four in ten)
    expect(shards / (all - veins)).toBeGreaterThan(0.38); expect(shards / (all - veins)).toBeLessThan(0.42);
    expect(two / shards).toBeGreaterThan(0.45); expect(two / shards).toBeLessThan(0.55);
    expect(foot / all).toBeGreaterThan(0.185); expect(foot / all).toBeLessThan(0.215);
    // the same for the same rock, turn and word; and nothing of it without the word
    expect(holdsOf(SALT, 7, 3, 99, NONE)).toEqual(holdsOf(SALT, 7, 3, 99, NONE));
    let differs = 0;
    for (let rock = 0; rock < 200; rock++) if (JSON.stringify(holdsOf(SALT, 7, rock, 5, NONE)) !== JSON.stringify(holdsOf("another word", 7, rock, 5, NONE))) differs++;
    expect(differs).toBeGreaterThan(60);
  });
  it("a dark gem makes veins likelier for whoever strikes with it, and changes nothing else", () => {
    const dark = pickAt(0, [], ["dark"]);
    let plain = 0, more = 0;
    for (let turn = 0; turn < 3000; turn++) for (let rock = 0; rock < 20; rock++) {
      const a = holdsOf(SALT, 7, rock, turn, NONE), b = holdsOf(SALT, 7, rock, turn, NONE, dark);
      if (a.kind === "vein") { plain++; expect(b).toEqual(a); }
      if (b.kind === "vein") more++;
    }
    expect(more / plain).toBeGreaterThan(1.2); expect(more / plain).toBeLessThan(1.4);
  });
  it("one rock a floor hides the way down, the same all day; none on a resting floor nor on the last", () => {
    for (const day of [20733, 20734]) for (let f = 1; f <= 30; f++) {
      const rocks = floorRocks(f, day), crystal = crystalOf(SALT, day, (n) => floorRocks(n, day)), way = wayRockOf(SALT, f, day, rocks, crystal?.floor === f ? crystal.rock : null);
      if (isRest(f) || f === 30) { expect(way).toBeNull(); continue; }
      expect(rocks.some((r) => r.id === way)).toBe(true);
      if (crystal?.floor === f) expect(way).not.toBe(crystal.rock);
      expect(holdsOf(SALT, f, way!, 123, { way, crystal: null }).kind).toBe("way");
      // (once it is open the rock is whatever else it would have been)
      expect(holdsOf(SALT, f, way!, 123, NONE).kind).not.toBe("way");
    }
    expect(new Set(Array.from({ length: 40 }, (_, d) => wayRockOf(SALT, 3, d, ROCKS))).size).toBeGreaterThan(5);
    expect(isDug(10)).toBe(false); expect(isDug(0)).toBe(false); expect(isDug(29)).toBe(true); expect(isDug(31)).toBe(false);
  });
  it("the crystal rock: one a day, on a floor from 28 to 30 that has rocks, one with crystals in it", () => {
    const floors = new Set<number>();
    for (let day = 20700; day < 20760; day++) {
      const c = crystalOf(SALT, day, (n) => floorRocks(n, day))!;
      floors.add(c.floor);
      expect([28, 29]).toContain(c.floor);
      expect(caveFloor(c.floor, day).rocks.find((r) => r.id === c.rock)!.look).toBe(3);
      expect(holdsOf(SALT, c.floor, c.rock, 5, { way: null, crystal: c.rock })).toEqual({ kind: "crystal" });
    }
    expect([...floors].sort()).toEqual([28, 29]);
    expect(crystalOf(SALT, 1, () => [])).toBeNull();
  });
  it("a peek says stone, fragments or a vein, and nothing of the way down", () => {
    expect(peekOf({ kind: "stone", shards: 0 })).toBe("stone");
    expect(peekOf({ kind: "stone", shards: 2 })).toBe("shards");
    expect(peekOf({ kind: "vein", gem: true, seed: 1 })).toBe("vein");
    expect(peekOf({ kind: "way", shards: 0 })).toBe("stone");
    expect(peekOf({ kind: "way", shards: 1 })).toBe("shards");
  });
});

describe("mining: a rock struck", () => {
  it("is refused with nothing changed: no pick, no such rock, gone, too far, no room, quicker than a hand; too few swings leave it standing, so much of it struck away", () => {
    const p = miner();
    expect(mine({ ...p, hand: "stone" }, go())).toEqual({ ok: false, why: "tool" });
    expect(mine({ ...p, hand: null }, go())).toEqual({ ok: false, why: "tool" });
    expect(mine(p, go({ rock: 99, at: [0, 0] }))).toEqual({ ok: false, why: "none" });
    expect(mine(p, go({ standing: (id) => id !== 0 }))).toEqual({ ok: false, why: "gone" });
    expect(mine(p, go({ at: [12, 12] }))).toEqual({ ok: false, why: "far" });
    expect(mine(p, go({ at: [11.9, 11.9] })).ok).toBe(true);
    expect(mine(p, go({ swings: 0 }))).toEqual({ ok: false, why: "more" });
    expect(mine(p, go({ swings: 3 }))).toMatchObject({ ok: true, done: false, part: 0.75 });
    expect(mine(p, go({ swings: 4 }))).toMatchObject({ ok: true, done: true });
    expect(mine({ ...p, stamina: { day: dayOf(NOON), left: 0 } }, go({ swings: 7 }))).toMatchObject({ ok: true, done: false, part: 0.875 });
    expect(mine({ ...p, stamina: { day: dayOf(NOON), left: 0 } }, go({ swings: 8 }))).toMatchObject({ ok: true, done: true });
    const full: Purse = { ...p, bag: p.bag.map((s, i) => (i === 0 ? s : { item: "minnow", n: 1 })) };
    expect(mine(full, go())).toEqual({ ok: false, why: "full" });
    expect(mine({ ...p, mine: { last: NOON - 100 } }, go())).toEqual({ ok: false, why: "soon" });
    expect(mine({ ...p, mine: { last: NOON - 4 * MINING.swing.least } }, go()).ok).toBe(true);
    // a moment that is not after the last strike believed is too soon too, however far before it: a call that took
    // its moment and then waited, while a newer one of the same member moved `last` on, is not believed its swings
    expect(mine({ ...p, mine: { last: NOON } }, go())).toEqual({ ok: false, why: "soon" });
    expect(mine({ ...p, mine: { last: NOON + 1 } }, go())).toEqual({ ok: false, why: "soon" });
    expect(mine({ ...p, mine: { last: NOON + 3_600_000 } }, go({ swings: 1 }))).toEqual({ ok: false, why: "soon" });
  });
  it("a rock broken leaves a stone always, its fragments if it had any, and costs a point of stamina whatever the swings", () => {
    const bare = where(5, (h) => h.kind === "stone" && h.shards === 0), rich = where(5, (h) => h.kind === "stone" && h.shards === 2);
    const a = done(mine(miner(), go({ ...bare })));
    expect(a.got).toEqual([["stone", 1]]);
    expect(a.broke).toEqual([bare.rock]);
    expect(count(a.purse, "stone")).toBe(1);
    expect(staminaOf(a.purse, bare.now)).toBe(49);
    expect(a.cost).toBe(1);
    expect(a.way).toBeNull(); expect(a.vein).toBeNull(); expect(a.crystal).toBe(false);
    expect(mineOf(a.purse).last).toBe(bare.now);
    const b = done(mine(miner(), go({ ...rich })));
    expect(b.got).toEqual([["stone", 1], ["shardCopper", 2]]);
    expect(count(b.purse, "shardCopper")).toBe(2);
    expect(done(mine(miner(), go({ ...where(15, (h) => h.kind === "stone" && h.shards > 0), floor: 15 }))).got[1][0]).toBe("shardIron");
    expect(done(mine(miner(), go({ ...where(25, (h) => h.kind === "stone" && h.shards > 0), floor: 25 }))).got[1][0]).toBe("shardSilver");
    // with no stamina it is done all the same, the harder way, and costs nothing more
    const tired = done(mine(miner(pickAt(), 0), go({ ...bare, swings: 8 })));
    expect(tired.spent).toBe(true); expect(staminaOf(tired.purse, bare.now)).toBe(0);
  });
  it("the rock that hides the way down opens it, and the crystal rock needs a pick at the top", () => {
    const way = done(mine(miner(), go({ rock: 4, today: { way: 4, crystal: null } })));
    expect(way.way).toBe(4);
    expect(way.got[0]).toEqual(["stone", 1]);
    const crystal = { way: null, crystal: 7 };
    expect(mine(miner(pickAt(9)), go({ rock: 7, floor: 28, today: crystal, element: "ice" }))).toEqual({ ok: false, why: "weak" });
    const c = done(mine(miner(pickAt(10)), go({ rock: 7, floor: 28, today: crystal, element: "ice" })));
    expect(c.crystal).toBe(true);
    expect(c.got).toEqual([["stone", 1], ["shardSilver", 20], [GEMS.ice.chip, 2]]);
    // (half as much again, with the gleam)
    const g = done(mine(miner(pickAt(10, ["pkPeek", "pkCrumb", "pkGleam"])), go({ rock: 7, floor: 28, today: crystal, element: "dark" })));
    expect(g.got).toEqual([["stone", 1], ["shardSilver", 30], [GEMS.dark.chip, 3]]);
  });
  it("a rock that hides a vein opens it for its breaker: played with the pick as it is, for three more stamina", () => {
    const v = where(5, (h) => h.kind === "vein" && !h.gem), g = where(5, (h) => h.kind === "vein" && h.gem);
    const a = done(mine(miner(), go({ ...v })));
    expect(a.got).toEqual([["stone", 1]]);
    expect(a.vein).toMatchObject({ f: 5, rock: v.rock, gem: null, mods: { strikes: 6, back: 0, cross: 0, spent: false }, more: 0 });
    expect(staminaOf(a.purse, v.now)).toBe(50 - 1 - VEIN.stamina);
    expect(mineOf(a.purse).vein).toEqual(a.vein);
    // nothing else is struck until it is played out
    expect(mine(a.purse, go({ rock: 12, at: [61, 40], now: v.now + 60_000 }))).toEqual({ ok: false, why: "vein" });
    const b = done(mine(miner(pickAt(6, ["pkSteady", "pkCutter"], ["water"])), go({ ...g, element: "wind" })));
    expect(b.vein).toMatchObject({ gem: "wind", mods: { strikes: 9, back: 1, cross: 0 }, more: 1 });
    // with no stamina left after the rock: two strikes fewer, and its points not seen for long
    const t = done(mine(miner(pickAt(), 1), go({ ...v })));
    expect(t.vein!.mods).toMatchObject({ strikes: 4, spent: true });
    expect(staminaOf(t.purse, v.now)).toBe(0);
  });
  it("an earth gem takes a share off a rock's stamina, kept exact from one rock to the next", () => {
    const pick = pickAt(0, [], ["earth"]), s = where(5, (h) => h.kind === "stone", pick);
    let p = miner(pick, 50), now = s.now;
    for (let i = 0; i < 20; i++) {
      now += 30_000;
      const d = done(mine(p, go({ now, rock: s.rock })));
      expect(d.cost === 0 || d.cost === 1).toBe(true);
      p = { ...d.purse, bag: miner(pick).bag };
    }
    expect(50 - staminaOf(p, now)).toBe(17);
    expect(mineOf(p).owed).toBeCloseTo(0, 5);
  });
  it("the miner's wind: the first ten rocks of a meal's hours cost no stamina", () => {
    const pick = pickAt(3, ["pkFresh"]), s = where(5, (h) => h.kind === "stone", pick);
    let p = miner(pick, 50), now = s.now;
    for (let i = 0; i < 12; i++) {
      now += 30_000;
      const d = done(mine(p, go({ now, rock: s.rock })));
      expect(d.cost).toBe(i < 10 ? 0 : 1);
      p = { ...d.purse, bag: miner(pick).bag };
    }
    expect(50 - staminaOf(p, now)).toBe(2);
    expect(powerLeft(p, "pkFresh", now)).toBe(0);
    // fallen under the milestone it was drawn at, it works all the same: no option sleeps (lib/town/tools' `has`)
    const fallen = done(mine(miner(pickAt(2, ["pkFresh"]), 50), go({ ...where(5, (h) => h.kind === "stone") })));
    expect(fallen.cost).toBe(0);
  });
  it("a crumb: every fifth plain rock leaves one more fragment of the floor's ore", () => {
    const pick = pickAt(3, ["pkCrumb"]);
    let p = miner(pick), plain = 0, extra = 0;
    for (let t = 0; t < 60 && plain < 15; t++) {
      const now = NOON + t * MINING.turn, h = holdsOf(SALT, 5, 12, turnOf(now), NONE, pick);
      if (h.kind !== "stone") continue;
      const d = done(mine(p, go({ now, rock: 12, at: [61, 40] })));
      plain++;
      const shards = d.got.find((g) => g[0] === "shardCopper")?.[1] ?? 0;
      expect(shards - h.shards).toBe(plain % 5 === 0 ? 1 : 0);
      extra += shards - h.shards;
      p = { ...d.purse, bag: miner(pick).bag };
    }
    expect(plain).toBe(15); expect(extra).toBe(3);
  });
  it("a loosened stone: the rocks that touch one that broke take a swing fewer, for that member, in that turn", () => {
    const pick = pickAt(3, ["pkLoose"]), s = where(5, (h) => h.kind === "stone", pick);
    const r = ROCKS.find((x) => x.id === s.rock)!, d = done(mine(miner(pick), go({ ...s })));
    const touching = ROCKS.filter((x) => x.id !== r.id && Math.abs(x.x - r.x) <= 2 && Math.abs(x.y - r.y) <= 2).map((x) => x.id);
    expect(d.loose).toEqual(touching);
    if (touching.length) {
      const next = touching[0], h = holdsOf(SALT, 5, next, turnOf(s.now), NONE, pick);
      if (h.kind === "stone") {
        expect(mine(d.purse, go({ now: s.now + 5000, rock: next, swings: 2, standing: (id) => id !== r.id }))).toMatchObject({ ok: true, done: false });
        expect(mine(d.purse, go({ now: s.now + 5000, rock: next, swings: 3, standing: (id) => id !== r.id }))).toMatchObject({ ok: true, done: true });
      }
      // (at the next turn it is as hard as ever: three swings leave it standing)
      expect(mine(d.purse, go({ now: s.now + MINING.turn, rock: next, swings: 3 }))).toMatchObject({ ok: true, done: false });
    }
    expect(done(mine(miner(), go({ ...where(5, (h) => h.kind === "stone") }))).loose).toEqual([]);
  });
  it("lightning: now and then a touching rock breaks too, for no more stamina", () => {
    const pick = pickAt(0, [], ["lightning"]);
    let chained = 0, tried = 0;
    for (let t = 0; t < 600; t++) {
      const now = NOON + t * MINING.turn;
      if (holdsOf(SALT, 5, 3, turnOf(now), NONE, pick).kind !== "stone") continue;
      const d = done(mine(miner(pick), go({ now, rock: 3 })));
      tried++;
      if (d.chained === null) { expect(d.broke).toEqual([3]); continue; }
      chained++;
      expect([1, 2, 4, 5]).toContain(d.chained);
      expect(d.broke).toEqual([3, d.chained]);
      expect(d.got.find((g) => g[0] === "stone")![1]).toBe(2);
      expect(d.cost).toBe(1);
      expect(holdsOf(SALT, 5, d.chained, turnOf(now), NONE, pick).kind).toBe("stone");
    }
    expect(chained / tried).toBeGreaterThan(0.05); expect(chained / tried).toBeLessThan(0.16);
    // and never without the gem
    for (let t = 0; t < 50; t++) { const now = NOON + t * MINING.turn; if (holdsOf(SALT, 5, 3, turnOf(now), NONE).kind === "stone") expect(done(mine(miner(), go({ now, rock: 3 }))).chained).toBeNull(); }
  });
  it("the earthshaker: one swing breaks every plain rock within a step of the member, ten times a day", () => {
    const pick = pickAt(10, ["pkPeek", "pkCrumb", "pkQuake"]);
    // (standing between rocks 3 and 4: both are within a step)
    const s = (() => { for (let t = 0; t < 400; t++) { const now = NOON + t * MINING.turn, turn = turnOf(now); if ([3, 4].every((r) => holdsOf(SALT, 5, r, turn, NONE, pick).kind === "stone")) return now; } throw new Error("none"); })();
    const d = done(mine(miner(pick), go({ now: s, rock: 3, at: [17, 10], swings: 1, quake: true })));
    expect(d.broke.sort()).toEqual([3, 4]);
    expect(d.got.find((g) => g[0] === "stone")![1]).toBe(2);
    expect(d.cost).toBe(1);
    expect(powerLeft(d.purse, "pkQuake", s)).toBe(9);
    // without the power, or with none left today, it is refused
    expect(mine(miner(pickAt(10)), go({ now: s, rock: 3, at: [17, 10], swings: 1, quake: true }))).toEqual({ ok: false, why: "spent" });
    const used: Purse = { ...miner(pick), powers: { pkQuake: { k: dayOf(s), n: 10 } } };
    expect(mine(used, go({ now: s, rock: 3, at: [17, 10], swings: 1, quake: true }))).toEqual({ ok: false, why: "spent" });
    // a rock that is no plain one is left standing by it
    const v = where(5, (h) => h.kind === "vein", pick), vr = ROCKS.find((x) => x.id === v.rock)!;
    if (vr.id > 0 && vr.id < 12 && holdsOf(SALT, 5, vr.id - 1, turnOf(v.now), NONE, pick).kind === "stone") {
      const q = done(mine(miner(pick), go({ now: v.now, rock: vr.id - 1, at: [vr.x - 1, 10], swings: 1, quake: true })));
      expect(q.broke).not.toContain(vr.id);
    }
  });
});

// (written with the rule and never run: the owner's word that evening was to build and not to test yet)
describe("mining: glowing moss", () => {
  it("about one plain rock in ten of the cave lets some out as it breaks, never a rock of the mountain's foot nor one that hides a vein", () => {
    let stone = 0, moss = 0;
    for (let turn = 0; turn < 600; turn++) for (let rock = 0; rock < 24; rock++) {
      const h = holdsOf(SALT, 7, rock, turn, NONE);
      if (h.kind === "stone") { stone++; if (h.moss) moss++; } else expect(h).not.toHaveProperty("moss");
      expect(holdsOf(SALT, 0, rock, turn, NONE)).not.toHaveProperty("moss");
    }
    expect(moss / stone).toBeGreaterThan(0.08); expect(moss / stone).toBeLessThan(0.12);
    const m = where(5, (h) => h.kind === "stone" && !!h.moss), d = done(mine(miner(), go({ ...m })));
    expect(d.moss).toEqual([m.rock]);
    expect(d.got[0]).toEqual(["stone", 1]);
    expect(done(mine(miner(), go({ ...where(5, (h) => h.kind === "stone" && !h.moss) }))).moss).toEqual([]);
    expect(MINING.moss).toEqual({ chance: 0.1, glows: 60_000 });
  });
});

// (written with the rule and never run: the owner's word that evening was to build and not to test yet)
describe("mining: several picks on one rock", () => {
  const tally = (t: Struck | null) => () => t;
  const still = (d: ReturnType<typeof mine>) => { if (!d.ok || d.done !== false) throw new Error("the rock should still stand"); return d; };
  it("swings add up, a member's own share a swing; what the rock leaves is for whoever struck it first, and a helper pays nothing", () => {
    const s = where(5, (h) => h.kind === "stone" && h.shards === 0);
    const a = still(mine(miner(), go({ ...s, swings: 2, who: "a", name: "Aqua" })));
    expect(a.part).toBeCloseTo(0.5, 5);
    expect(a.struck).toMatchObject({ first: "a", name: "Aqua", at: s.now });
    expect(isWhole(a.struck)).toBe(false);
    expect(staminaOf(a.purse, s.now)).toBe(50);
    expect(count(a.purse, "stone")).toBe(0);
    // more of one's own, told later: they add to what was told before
    const more = still(mine(a.purse, go({ ...s, now: s.now + 2000, swings: 1, who: "a", name: "Aqua", struck: tally(a.struck) })));
    expect(more.part).toBeCloseTo(0.75, 5);
    // somebody else strikes the rest away: the rock is the first's to be paid for, and the helper's purse is as it was
    const later = s.now + 4000;
    const b = mine(miner(), go({ ...s, now: later, swings: 2, who: "b", name: "Bo", struck: tally(a.struck) }));
    if (!b.ok || b.done !== "theirs") throw new Error("the rock should be the first's");
    expect(partOf(b.struck)).toBeCloseTo(1, 5);
    expect(helpersOf(b.struck)).toEqual(["b"]);
    expect(staminaOf(b.purse, later)).toBe(50);
    expect(count(b.purse, "stone")).toBe(0);
    const paid = payFirst(a.purse, go({ ...s, now: later, who: "b", name: "Bo", struck: tally(b.struck) }), b.struck);
    if (!paid.ok) throw new Error(`refused: ${paid.why}`);
    expect(paid.got).toEqual([["stone", 1]]);
    expect(paid.broke).toEqual([s.rock]);
    expect(staminaOf(paid.purse, later)).toBe(49);
    expect(mineOf(paid.purse).paid).toMatchObject({ at: later, f: 5, rock: s.rock, by: "Bo", got: [["stone", 1]], way: false, crystal: false, vein: false });
    // the first, striking the last of it away themselves, is paid as ever, and told of nobody
    const own = done(mine(a.purse, go({ ...s, now: later, swings: 2, who: "a", name: "Aqua", struck: tally(a.struck) })));
    expect(own.got).toEqual([["stone", 1]]);
    expect(mineOf(own.purse).paid).toBeNull();
  });
  it("a tired hand's swing is half a share; the first is paid wherever they stand, with the best pick they have; a full bag makes the rock wait", () => {
    const s = where(5, (h) => h.kind === "stone" && h.shards === 0);
    expect(still(mine(miner(pickAt(), 0), go({ ...s, swings: 2, who: "t" }))).part).toBeCloseTo(0.25, 5);
    const begun: Struck = { first: "a", name: "Aqua", at: s.now, by: { a: 0.5, b: 0.5 } };
    // (the first has put the pick away since, and stands far off)
    const away: Purse = { ...miner(pickAt(4)), hand: null, handAt: undefined };
    expect(anyPick(away)).toMatchObject({ item: "pick", plus: 4 });
    const paid = payFirst(away, go({ ...s, at: [0, 0], who: "b", name: "Bo", struck: tally(begun) }), begun);
    expect(paid.ok && paid.got).toEqual([["stone", 1]]);
    const full: Purse = { ...away, bag: away.bag.map((x, i) => (i === 0 ? x : { item: "minnow", n: 1 })) };
    expect(payFirst(full, go({ ...s, who: "b", name: "Bo", struck: tally(begun) }), begun)).toEqual({ ok: false, why: "full" });
  });
  it("the first, paid for a rock somebody else broke, keeps the vein they have open: a rock that opens none leaves it as it is, and one that would open another waits", () => {
    const s = where(5, (h) => h.kind === "stone" && h.shards === 0), v = where(5, (h) => h.kind === "vein" && !h.gem);
    // (the first struck half of a rock, went off, and broke a rock elsewhere that hid a vein: it is open, not played yet)
    const open = { f: 3, rock: 9, turn: 77, seed: 4242, gem: null, mods: { strikes: 6, back: 0, cross: 0, spent: false }, more: 0 };
    const begun: Struck = { first: "a", name: "Aqua", at: s.now, by: { a: 0.5, b: 0.5 } };
    const first: Purse = { ...miner(), mine: { vein: open } };
    const paid = payFirst(first, go({ ...s, who: "b", name: "Bo", struck: tally(begun) }), begun);
    if (!paid.ok) throw new Error(`refused: ${paid.why}`);
    expect(paid.got).toEqual([["stone", 1]]);
    // the rock opened no vein, and says so; the vein that was open is the member's still, as it was
    expect(paid.vein).toBeNull();
    expect(mineOf(paid.purse).paid).toMatchObject({ rock: s.rock, vein: false, by: "Bo" });
    expect(mineOf(paid.purse).vein).toEqual(open);
    // (with none open there is none after it)
    const none = payFirst(miner(), go({ ...s, who: "b", name: "Bo", struck: tally(begun) }), begun);
    expect(none.ok && mineOf(none.purse).vein).toBeNull();
    // a rock that hides a vein, for somebody who has one open: refused with nothing changed, and the rock waits for them
    const waits: Struck = { first: "a", name: "Aqua", at: v.now, by: { a: 0.5, b: 0.5 } };
    expect(payFirst(first, go({ ...v, who: "b", name: "Bo", struck: tally(waits) }), waits)).toEqual({ ok: false, why: "vein" });
    // …and for somebody who has none it opens, theirs, and what they were paid says so
    const opened = payFirst(miner(), go({ ...v, who: "b", name: "Bo", struck: tally(waits) }), waits);
    if (!opened.ok) throw new Error(`refused: ${opened.why}`);
    expect(opened.vein).toMatchObject({ f: 5, rock: v.rock });
    expect(mineOf(opened.purse).vein).toEqual(opened.vein);
    expect(mineOf(opened.purse).paid).toMatchObject({ vein: true });
  });
  it("the earthshaker leaves a rock somebody else has begun standing, and on such a rock a swing is a swing", () => {
    const pick = pickAt(10, ["pkPeek", "pkCrumb", "pkQuake"]);
    const s = (() => { for (let t = 0; t < 400; t++) { const now = NOON + t * MINING.turn, turn = turnOf(now); if ([3, 4].every((r) => holdsOf(SALT, 5, r, turn, NONE, pick).kind === "stone")) return now; } throw new Error("none"); })();
    const theirs: Struck = { first: "b", name: "Bo", at: s, by: { b: 0.25 } };
    const d = done(mine(miner(pick), go({ now: s, rock: 3, at: [17, 10], swings: 1, quake: true, who: "a", struck: (id) => (id === 4 ? theirs : null) })));
    expect(d.broke).toEqual([3]);
    // (aimed at theirs: no power is used, and one swing of a pick at the top strikes the rest of it away for them)
    const on = mine(miner(pick), go({ now: s, rock: 4, at: [17, 10], swings: 1, quake: true, who: "a", struck: (id) => (id === 4 ? theirs : null) }));
    expect(on).toMatchObject({ ok: true, done: "theirs" });
    expect(on.ok && powerLeft(on.purse, "pkQuake", s)).toBe(10);
  });
  it("a tally is kept sound", () => {
    expect(struckOf(null)).toBeNull();
    expect(struckOf({ first: "a", by: {} })).toBeNull();
    expect(struckOf({ first: "a", name: "Aqua", at: 5, by: { a: 0.5, b: "x", c: -1, d: 7 } })).toEqual({ first: "a", name: "Aqua", at: 5, by: { a: 0.5, d: 1 } });
    expect(partOf(null)).toBe(0);
  });
});

describe("mining: a vein played out, the lift, a torch, the floor broken through", () => {
  const open = (pick: Stack = pickAt(), gem = false) => { const v = where(5, (h) => h.kind === "vein" && h.gem === gem, pick); return { v, d: done(mine(miner(pick), go({ ...v, element: "fire" }))) }; };
  /** Strikes that run the crack as far as it will go by itself: towards each glinting cell in turn. */
  const strikesFor = (seed: number, gem: boolean, mods: Mined["vein"] & object): Cell[] => {
    const face = faceOf(seed, gem), out: Cell[] = [];
    let crack = begin(face, mods.mods);
    for (let i = 0; i < 40 && crack.left > 0; i++) {
      const [hx, hy] = headOf(crack), want = face.points.find((p, k) => !crack.got.includes(k) && (p.x === hx || p.y === hy)) ?? face.points.find((_, k) => !crack.got.includes(k));
      if (!want) break;
      const cell: Cell = want.x === hx || want.y === hy ? [want.x, want.y] : [want.x, hy];
      out.push(cell);
      crack = strike(face, mods.mods, crack, cell).crack;
    }
    return out;
  };
  it("gives what its strikes come to when they are played again by the rules, and the vein is then done with", () => {
    const { v, d } = open(), strikes = strikesFor(d.vein!.seed, false, d.vein!), face = faceOf(d.vein!.seed), crack = play(face, d.vein!.mods, strikes);
    const end = veinEnd(d.purse, strikes, v.now + 30_000);
    if (!end.ok) throw new Error(end.why);
    expect(end.passed).toBe(crack.got.length);
    expect(end.of).toBe(face.points.length);
    expect(end.got).toEqual(crack.got.length ? [["shardCopper", crack.got.length * VEIN.ore]] : []);
    expect(count(end.purse, "shardCopper")).toBe(crack.got.length * VEIN.ore);
    expect(mineOf(end.purse).vein).toBeNull();
    expect(end.again).toBe(false);
    expect(veinEnd(end.purse, strikes, v.now + 40_000)).toEqual({ ok: false, why: "none" });
    // strikes that are no strikes come to nothing, and lose nothing
    const none = veinEnd(d.purse, [[9, 9], ["x", 1] as unknown as Cell, [-1, 0]], v.now);
    expect(none.ok && none.got).toEqual([]);
  });
  it("waits when the bag has no room for what it gives", () => {
    const { v, d } = open(), strikes = strikesFor(d.vein!.seed, false, d.vein!);
    const full: Purse = { ...d.purse, bag: d.purse.bag.map((s) => s ?? { item: "minnow", n: 1 }) };
    if (play(faceOf(d.vein!.seed), d.vein!.mods, strikes).got.length) {
      expect(veinEnd(full, strikes, v.now)).toEqual({ ok: false, why: "full" });
      expect(mineOf(full).vein).not.toBeNull();
    }
  });
  it("a gem vein gives the floor's gem in fragments for its gem cells, one more with a gem-cutter's eye", () => {
    for (const pick of [pickAt(), pickAt(3, ["pkCutter"])]) {
      const { v, d } = open(pick, true), face = faceOf(d.vein!.seed, true);
      expect(face.points.filter((p) => p.gem > 0).length).toBeGreaterThanOrEqual(1);
      const strikes = strikesFor(d.vein!.seed, true, d.vein!), crack = play(face, d.vein!.mods, strikes), end = veinEnd(d.purse, strikes, v.now);
      if (!end.ok) throw new Error(end.why);
      const gems = crack.got.map((i) => face.points[i]).filter((p) => p.gem > 0), chips = gems.reduce((t, p) => t + p.gem, 0);
      expect(end.got.find((g) => g[0] === "chipRuby")?.[1] ?? 0).toBe(chips ? chips + d.vein!.more : 0);
      expect(end.got.find((g) => g[0] === "shardCopper")?.[1] ?? 0).toBe((crack.got.length - gems.length) * VEIN.ore);
    }
  });
  it("a twin vein is played once more, five times a day", () => {
    const pick = pickAt(10, ["pkPeek", "pkCrumb", "pkTwin"]), { v, d } = open(pick);
    const one = veinEnd(d.purse, [], v.now);
    if (!one.ok) throw new Error(one.why);
    expect(one.again).toBe(true);
    expect(mineOf(one.purse).vein).toMatchObject({ seed: d.vein!.seed, again: true });
    expect(powerLeft(one.purse, "pkTwin", v.now)).toBe(4);
    const two = veinEnd(one.purse, [], v.now);
    expect(two.ok && two.again).toBe(false);
    expect(two.ok && mineOf(two.purse).vein).toBeNull();
    // with none left today, once
    const spent = veinEnd({ ...d.purse, powers: { pkTwin: { k: dayOf(v.now), n: 5 } } }, [], v.now);
    expect(spent.ok && spent.again).toBe(false);
  });
  it("the lift stops at the mouth and at the resting floors a member has reached", () => {
    let p = miner();
    expect(liftStops(p)).toEqual([0]);
    expect(mayRide(p, 10)).toBe(false);
    p = reachRest(p, 10);
    expect(reachRest(p, 10)).toBe(p);
    expect(reachRest(p, 11)).toBe(p);
    expect(reachRest(p, 40)).toBe(p);
    p = reachRest(reachRest(p, 30), 20);
    expect(liftStops(p)).toEqual([0, 10, 20, 30]);
    expect(mayRide(p, 20)).toBe(true); expect(mayRide(p, 0)).toBe(true); expect(mayRide(p, 15)).toBe(false);
  });
  it("a torch is set down from the hand, one fewer in the bag", () => {
    const p = miner(), with_: Purse = { ...p, bag: p.bag.map((s, i) => (i === 1 ? { item: "torch", n: 2 } : s)) };
    expect(torchDown(with_)).toEqual({ ok: false, why: "tool" });
    const d = torchDown({ ...with_, hand: "torch", handAt: 1 });
    expect(d.ok && count(d.purse, "torch")).toBe(1);
    expect(torchDown({ ...p, hand: "torch" })).toEqual({ ok: false, why: "tool" });
  });
  it("how far one sees: two tiles, three with a glowing mushroom held, four with the miner's lamp worn", () => {
    const p = miner();
    expect(lightOf(p)).toBe(2);
    expect(lightOf({ ...p, bag: p.bag.map((s, i) => (i === 1 ? { item: "glowMushroom", n: 1 } : s)), hand: "glowMushroom", handAt: 1 })).toBe(3);
    expect(lightOf({ ...p, hand: "glowMushroom" })).toBe(2);
    expect(lightOf({ ...p, gifts: { had: ["charmMinerLamp"], charms: ["charmMinerLamp"] } })).toBe(4);
    expect(lightOf({ ...p, gifts: { had: ["charmMinerLamp"], charms: [] } })).toBe(2);
  });
  it("the floor-breaker opens the way down oneself, three times a day, where there is one to open", () => {
    const pick = pickAt(10, ["pkPeek", "pkCrumb", "pkDrill"]);
    expect(drill(miner(), 5, false, NOON)).toEqual({ ok: false, why: "tool" });
    expect(drill(miner(pick), 10, false, NOON)).toEqual({ ok: false, why: "none" });
    expect(drill(miner(pick), 30, false, NOON)).toEqual({ ok: false, why: "none" });
    expect(drill(miner(pick), 0, false, NOON)).toEqual({ ok: false, why: "none" });
    expect(drill(miner(pick), 5, true, NOON)).toEqual({ ok: false, why: "open" });
    let p = miner(pick);
    for (let i = 0; i < 3; i++) { const d = drill(p, 5 + i, false, NOON); if (!d.ok) throw new Error(d.why); expect(d.left).toBe(2 - i); p = d.purse; }
    expect(drill(p, 9, false, NOON)).toEqual({ ok: false, why: "spent" });
    expect(drill(p, 9, false, NOON + 24 * 3_600_000).ok).toBe(true);
  });
});
