import { describe, expect, it } from "vitest";
import { COOKING, cook, stirMods } from "./cooking";
import { FARMING, WATER, WILD, canHolds, chore, choreFor, tend, water, type Plant, type Plot } from "./farm";
import { FIGHT, STRIKE, startFight, strikeOf, strikeWindow, strikeWindowOf } from "./fishing";
import {
  COOK_KINDS, OLD_FX, PLAIN_CAN, PLAIN_COOK, PLAIN_HOE, PLAIN_NET, PLAIN_ROD, canFx, cookFx, easedBy, hitsWith, hoeFx, missesWith, netFx, partOf, rodFx, slowPartOf, slowedBy, stirsWith,
} from "./forged";
import { toolOwed, toolPaid } from "./forged-keep";
import { PLAIN, RODS, gearOf, rodStack } from "./gear";
import { HAUNTS, NET, againMs, aimAt, fledBy, net, ringOf, swingMs, taken, type Swarm } from "./insects";
import { FISH, type ItemId } from "./items";
import { LONG, startLong } from "./longpour";
import { POURING, pour, startPour } from "./pouring";
import { powerLeft, powerUsed } from "./powers";
import { dayOf, spend, staminaOf } from "./stamina";
import { STIRRING, startStir, stir } from "./stirring";
import { TIMING, over, press, pressRow, startRound, startRow, type Round } from "./timing";
import { BUILT, ELEMENTS, FORGE, LEVELS, OPTIONS, drawable, poolOf, settable, type OptionId, type ToolKind } from "./tools";
import { HOUR, hold, newPurse, put, type Purse, type Stack } from "./trade";
import { WEEDING, patchAt, startPatch, touch } from "./weeding";

/** Noon in Bangkok: lunch's hours. */
const NOW = Date.parse("2026-10-08T12:00:00+07:00");
const tool = (item: ItemId, plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item, n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });
/** A purse with these stacks in its first slots (and a full day's stamina), the first of them in the hand. */
const purseOf = (...stacks: Stack[]): Purse => {
  const p = newPurse(), bag = [...stacks, ...Array<null>(20 - stacks.length).fill(null)] as Purse["bag"];
  const d = hold({ ...p, bag, stamina: { day: dayOf(NOW), left: 100 } }, 0);
  if (!d.ok) throw new Error("nothing to hold");
  return d.purse;
};
const buffed = (p: Purse, id: "keen" | "calm" | "hearty", level: number): Purse => ({ ...p, buffs: [{ id, level, until: NOW + HOUR }] });
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "kangkong", sown: NOW - HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });
/** The options of a tool as its stack keeps them: one drawn at each milestone, in their order (null: none there). */
const drawn = (a: OptionId | null, b: OptionId | null = null, c: OptionId | null = null): string[] => [a ?? "", b ?? "", c ?? ""];
const OLD: ToolKind[] = ["rod", "hoe", "can", "bugNet", "pot", "pan", "grill"];

describe("the tables of lib/town/tools begin where the games are today", () => {
  it("at +0 each is the game's own number", () => {
    expect(LEVELS.rod.strike[0]).toBe(STRIKE.window);
    expect(LEVELS.rod.band[0]).toBe(1);
    expect(LEVELS.rod.slow[0]).toBe(0);
    expect(LEVELS.hoe.band[0]).toBe(1);
    expect(LEVELS.hoe.slow[0]).toBe(0);
    expect(LEVELS.can.waterings[0]).toBe(WATER.cans.can);
    expect(LEVELS.can.marks[0]).toBe(1);
    expect(LEVELS.bugNet.ring[0]).toBe(NET.radius);
    expect(LEVELS.bugNet.lands[0]).toBe(NET.lands);
    for (const k of COOK_KINDS) expect(LEVELS[k as "pot"].band[0]).toBe(1);
  });
});

describe("the cap", () => {
  it("lets a tool's part add to the rest only as far as the cap, and never takes from the rest", () => {
    expect(easedBy(1, 1.5)).toBe(1.5);
    expect(easedBy(2, 1.5)).toBe(3);
    expect(easedBy(2.5, 1.5)).toBe(FORGE.cap);
    // (what the rest came to by itself stays, past the cap or not)
    expect(easedBy(4.2, 1.5)).toBe(4.2);
    expect(easedBy(4.2, 1)).toBe(4.2);
    // (a part that makes it harder is taken whole)
    expect(easedBy(2, 0.9)).toBeCloseTo(1.8, 12);
  });
  it("is the same for what is easier the smaller it is", () => {
    expect(slowedBy(1, 0.7)).toBe(0.7);
    expect(slowedBy(0.5, 0.5)).toBeCloseTo(1 / 3, 12);
    expect(slowedBy(0.2, 0.5)).toBe(0.2);
    expect(slowedBy(1, 1.1)).toBeCloseTo(1.1, 12);
  });
  it("gives a plain tool a part of exactly one", () => {
    for (const rest of [1, 1.3, 2.1, 3, 4.2, 0.76]) { expect(partOf(rest, 1)).toBe(1); expect(slowPartOf(rest, 1)).toBe(1); }
    expect(2.1 * partOf(2.1, 1.5)).toBeCloseTo(3, 12);
  });
});

describe("a plain tool reads as nothing", () => {
  it("every reader gives its plain object for no tool, a tool as it was bought, a better tool, and a tool of another kind", () => {
    for (const s of [null, undefined, tool("rod"), tool("rodTeak", 10, [], ["fire"]), tool("hoe", 10)]) expect(rodFx(s)).toBe(PLAIN_ROD);
    for (const s of [null, tool("hoe"), tool("hoeIron", 10), tool("can", 10)]) expect(hoeFx(s)).toBe(PLAIN_HOE);
    for (const s of [null, tool("can"), tool("canCopper", 10), tool("hoe", 10)]) expect(canFx(s)).toBe(PLAIN_CAN);
    for (const s of [null, tool("bugNet"), tool("rod", 10)]) expect(netFx(s)).toBe(PLAIN_NET);
    for (const s of [null, tool("pot"), tool("pan"), tool("grill"), tool("potBrass", 10), tool("hoe", 10)]) expect(cookFx(s)).toBe(PLAIN_COOK);
  });
  it("and the plain objects are the numbers that change nothing", () => {
    expect(PLAIN_ROD).toEqual({ band: 1, pace: 1, strike: 1, line: 1, fierce: 1, spared: 0, still: 0, shimmer: 0, stamina: 0, fresh: false, quick: 0, keeps: 0, rare: 1 });
    expect(PLAIN_HOE).toEqual({ band: 1, pace: 1, fewer: 0, spared: 0, stones: 0, even: false, glow: false, stamina: 0, fresh: false, next: 0, worm: 0 });
    expect(PLAIN_CAN).toEqual({ more: 0, marks: 1, pace: 1, spared: 0, takes: null, stamina: 0, fresh: false, kind: 0, next: 0, rich: 0, uses: 1, glint: 0 });
    expect(PLAIN_NET).toEqual({ ring: 1, lands: 1, again: 1, reach: 0, spared: 0, bears: 0, flight: 1, stamina: 0, fresh: false, twin: 0, seen: 0 });
    expect(PLAIN_COOK).toEqual({ band: 1, shorter: 0, spared: 0, grace: 1, stamina: 0, fresh: false, helping: 0 });
  });
  it("an option sleeps under its milestone, and a gem works one level stronger at the top", () => {
    expect(hoeFx(tool("hoe", 3, drawn("hoLight"))).even).toBe(true);
    expect(hoeFx(tool("hoe", 2, drawn("hoLight"))).even).toBe(false);
    expect(netFx(tool("bugNet", 1, [], ["earth"])).stamina).toBe(OLD_FX.earth.stamina[0]);
    expect(netFx(tool("bugNet", 10, [], ["earth"])).stamina).toBe(OLD_FX.earth.stamina[1]);
  });
});

describe("a forged rod", () => {
  const fish = "tilapia" as const;
  it("is the gear's own: the rod in the hand, by its slot; in the bag only, the one forged furthest", () => {
    const bag = purseOf(tool("rod", 4), tool("rod", 10), tool("worm")).bag;
    expect(rodStack(bag, "rod", 0)?.plus).toBe(4);
    expect(rodStack(bag, "rod", 1)?.plus).toBe(10);
    expect(rodStack(bag, "rod", null)?.plus).toBe(10);
    expect(gearOf(bag, "rod", 0).fx?.band).toBe(LEVELS.rod.band[4]);
    expect(gearOf(bag, "worm", 2).fx?.band).toBe(LEVELS.rod.band[10]);
  });
  it("leaves the gear of a plain rod as it was, with nothing of its own", () => {
    const bag = purseOf(tool("rod")).bag;
    expect(gearOf(bag, "rod", 0)).toEqual({ ...PLAIN, rod: "rod", ...RODS.rod });
    expect(gearOf(bag, "rod", 0).fx).toBeUndefined();
    // (a better rod is not forged: whatever its stack says, it is the rod it was)
    expect(gearOf(purseOf(tool("rodMaster", 10)).bag, "rodMaster", 0)).toEqual({ ...PLAIN, rod: "rodMaster", ...RODS.rodMaster });
  });
  it("widens the safe stretch, slows it, and lengthens the strike's moment, by its level", () => {
    const plain = startFight(fish, "good", { gear: gearOf(purseOf(tool("rod")).bag, "rod", 0) }, 7);
    expect(plain).toEqual(startFight(fish, "good", {}, 7));
    for (const l of [1, 4, 7, 10]) {
      const gear = gearOf(purseOf(tool("rod", l)).bag, "rod", 0), f = startFight(fish, "good", { gear }, 7);
      expect(f.band).toBeCloseTo(plain.band * LEVELS.rod.band[l], 12);
      expect(f.pace).toBeCloseTo(plain.pace * (1 - LEVELS.rod.slow[l]), 12);
      expect(strikeWindow({ gear })).toBeCloseTo(LEVELS.rod.strike[l], 12);
      // (nothing else of the fight is the plus's: the line, the pull, how long the line and the hook bear)
      expect([f.length, f.pull, f.power, f.snapIn, f.slipIn, f.sway]).toEqual([plain.length, plain.pull, plain.power, plain.snapIn, plain.slipIn, plain.sway]);
    }
    expect(startFight(fish, "good", { gear: gearOf(purseOf(tool("rod", 10)).bag, "rod", 0) }, 7).band).toBeCloseTo(FISH[fish].fight.band * 1.5, 12);
  });
  it("never eases past the cap with a meal's buff and a gift together, and never takes from what they give", () => {
    const gear = gearOf(purseOf(tool("rod", 10, [], ["ice"]), tool("floatBell")).bag, "rod", 0), bare = gearOf(purseOf(tool("rod"), tool("floatBell")).bag, "rod", 0);
    // the strike: a keen eye at its levels (1.5 to 3 times), the bell float (1.5 times) and a charm's number
    for (const keen of [0, 1, 2, 3, 4]) for (const charm of [1, 1.5]) {
      const rest = strikeWindow({ keen, gear: bare, charm }) / STRIKE.window, mine = strikeWindow({ keen, gear, charm }) / STRIKE.window;
      expect(mine).toBeCloseTo(Math.max(rest, Math.min(FORGE.cap, rest * (LEVELS.rod.strike[10] / LEVELS.rod.strike[0]))), 10);
      expect(mine).toBeGreaterThanOrEqual(rest);
    }
    expect(strikeWindow({ keen: 1, gear: gearOf(purseOf(tool("rod", 10)).bag, "rod", 0), charm: 1.5 })).toBeCloseTo(STRIKE.window * FORGE.cap, 10);
    // the stretch: steady hands at their levels (1.2 to 3 times)
    for (const calm of [0, 1, 2, 3, 4]) {
      const rest = startFight(fish, "good", { calm, gear: bare }, 3).band / FISH[fish].fight.band, mine = startFight(fish, "good", { calm, gear }, 3).band / FISH[fish].fight.band;
      expect(mine).toBeCloseTo(Math.max(rest, Math.min(FORGE.cap, rest * 1.5)), 10);
    }
    // the pace: the plus and ice together never under a third of the plain pace
    expect(startFight(fish, "good", { gear }, 3).pace / FISH[fish].fight.pace).toBeCloseTo(0.7 * 0.75, 10);
    expect(slowedBy(1, 0.7 * (1 - OLD_FX.ice.slow[3]) * 0.5)).toBeCloseTo(1 / FORGE.cap, 10);
  });
  it("tired hands have the same share of a forged rod's moment as of a plain one's", () => {
    const gear = gearOf(purseOf(tool("rod", 10)).bag, "rod", 0);
    expect(strikeWindow({ spent: true, gear }) / strikeWindow({ gear })).toBeCloseTo(strikeWindow({ spent: true }) / strikeWindow(), 12);
    expect(strikeOf(2.1, { gear })).toBe("late");
    expect(strikeOf(2.1, {})).toBeNull();
  });
  it("is read from the purse by whoever judges the strike: the rod in the hand, by the slot it was taken up from", () => {
    const p = purseOf(tool("rod", 10), tool("rod"));
    expect(strikeWindowOf(p, NOW)).toBeCloseTo(LEVELS.rod.strike[10], 12);
    expect(strikeWindowOf(done(hold(p, 1)).purse, NOW)).toBe(STRIKE.window);
    expect(strikeWindowOf(purseOf(tool("rod")), NOW)).toBe(STRIKE.window);
  });
  it("with fire has less line to win, with dark a fiercer fish, with a still water more time before the stretch moves", () => {
    const at = (s: Stack) => startFight("koi", "good", { gear: gearOf(purseOf(s).bag, "rod", 0) }, 11), plain = at(tool("rod"));
    expect(at(tool("rod", 1, [], ["fire"])).length).toBeCloseTo(plain.length * 0.85, 12);
    expect(at(tool("rod", 10, [], ["fire"])).length).toBeCloseTo(plain.length * 0.75, 12);
    const dark = at(tool("rod", 1, [], ["dark"]));
    expect([dark.pull / plain.pull, dark.power / plain.power]).toEqual([1.1, 1.1].map((x) => expect.closeTo(x, 10)));
    expect(at(tool("rod", 3, drawn("rdCalm"))).rest).toBeCloseTo(plain.rest + OPTIONS.rdCalm.n.secs, 12);
    // (the line to win is never under a third of the plain line's, whatever net is carried)
    const netted = startFight("koi", "good", { gear: gearOf(purseOf(tool("rod", 10, [], ["fire"]), tool("netLong")).bag, "rod", 0) }, 11);
    expect(netted.length / FISH.koi.fight.line).toBeCloseTo(0.76 * 0.75, 10);
    expect(FIGHT.reel).toBeGreaterThan(0);
  });
});

describe("a forged hoe", () => {
  const mods = (s: Stack, more: object = {}) => { const fx = hoeFx(s); return { forged: fx.band, pace: fx.pace, spare: fx.spared, even: fx.even, stones: fx.stones, ...more }; };
  it("leaves the tilling and the weeding of a plain hoe exactly as they were", () => {
    for (const spent of [false, true]) for (const seed of [1, 99, 12345]) {
      expect(startRound(3, { tool: 1, spent, drops: true, ...mods(tool("hoe")) }, seed)).toEqual(startRound(3, { tool: 1, spent, drops: true }, seed));
      expect(startRow(5, { buff: 1.5, ...mods(tool("hoe")) }, seed)).toEqual(startRow(5, { buff: 1.5 }, seed));
      expect(startPatch(3, { tool: 1, spent, drops: true, buff: 2, ...mods(tool("hoe")) }, seed)).toEqual(startPatch(3, { tool: 1, spent, drops: true, buff: 2 }, seed));
    }
  });
  it("widens the tilling's stretch and slows its marker and the weeding's gusts, by its level", () => {
    const plain = startRound(3, {}, 5), patch = startPatch(3, {}, 5);
    for (const l of [1, 4, 7, 10]) {
      const r = startRound(3, mods(tool("hoe", l)), 5), p = startPatch(3, mods(tool("hoe", l)), 5);
      expect(r.width).toBeCloseTo(TIMING.zone * LEVELS.hoe.band[l], 12);
      expect(r.speed).toBeCloseTo(TIMING.speed * (1 - LEVELS.hoe.slow[l]), 12);
      expect(p.every).toBeCloseTo(WEEDING.gust / (1 - LEVELS.hoe.slow[l]), 12);
      expect([r.need, r.most, p.need, p.most]).toEqual([plain.need, plain.most, patch.need, patch.most]);
    }
    // (tired hands have the same share of it)
    expect(startRound(3, { spent: true, ...mods(tool("hoe", 10)) }, 5).width).toBeCloseTo(TIMING.zone * TIMING.spent.zone * 1.5, 12);
  });
  it("never eases past the cap with a keen eye and the guardian's cloak together", () => {
    const m = mods(tool("hoe", 10, [], ["ice"]));
    for (const buff of [1, 1.5, 2, 2.5, 3]) for (const wide of [1, 2]) {
      const rest = buff * wide, r = startRound(3, { buff, wide, ...m }, 5), p = startPatch(3, { buff: buff * wide, ...m }, 5);
      expect(r.width).toBeCloseTo(Math.min(0.5, TIMING.zone * Math.max(rest, Math.min(FORGE.cap, rest * 1.5))), 10);
      expect(p.every).toBeCloseTo(WEEDING.gust * Math.max(rest, Math.min(FORGE.cap, rest / (0.7 * 0.75))), 10);
    }
    expect(startRound(3, m, 5).speed).toBeCloseTo(TIMING.speed * 0.7 * 0.75, 10);
  });
  it("forgives so many misses, keeps its marker's pace, and has fewer stones among the weeds, by what it carries", () => {
    const off = (r: Round) => { for (let t = 0.01; t < 5; t += 0.01) if (!over(r, t)) return t; throw new Error("no miss"); };
    let r = startRound(3, mods(tool("hoe", 3, drawn("hoFirst"), ["water"])), 8);
    expect(r.spare).toBe(2);
    r = press(r, off(r)); r = press(r, off(r));
    expect([r.misses, r.spare]).toEqual([0, 0]);
    r = press(r, off(r));
    expect(r.misses).toBe(1);
    // the light hoe: a hit does not quicken the marker (a plain one's does)
    const hit = (x: Round) => { for (let t = 0.01; t < 5; t += 0.01) if (over(x, t)) return press(x, t); throw new Error("no hit"); };
    const pace3 = TIMING.speed * (1 - LEVELS.hoe.slow[3]);
    expect(hit(startRound(3, mods(tool("hoe", 3, drawn("hoLight"))), 8)).speed).toBeCloseTo(pace3, 12);
    expect(hit(startRound(3, mods(tool("hoe", 3)), 8)).speed).toBeCloseTo(pace3 * TIMING.quicken, 12);
    expect(hit(startRound(3, {}, 8)).speed).toBe(TIMING.speed * TIMING.quicken);
    const row = startRow(4, mods(tool("hoe", 3, drawn("hoLight"))), 8);
    expect(pressRow(row, 0.3).speed).toBeCloseTo(pace3, 12);
    // loose earth: two stones fewer, with stamina and without
    const stones = (m: object) => startPatch(3, m, 4).cells.filter((c) => c?.kind === "stone").length;
    expect(stones({})).toBe(WEEDING.stones);
    expect(stones(mods(tool("hoe", 3, drawn("hoClear"))))).toBe(0);
    expect(stones({ spent: true, ...mods(tool("hoe", 3, drawn("hoClear"))) })).toBe(WEEDING.tiredStones - 2);
    // and a stone touched with a forgiving hoe is no miss, once
    let p = startPatch(3, mods(tool("hoe", 1, [], ["water"])), 4);
    const stone = p.cells.findIndex((c) => c?.kind === "stone");
    p = touch(p, 0.1, stone);
    expect([p.misses, p.spare]).toEqual([0, 0]);
    expect(touch(p, 0.2, patchAt(p, 0.2).cells.findIndex((c) => c?.kind === "stone")).misses).toBe(1);
  });
  it("with fire takes a hit fewer a plot, never under one; with dark its marker is quicker", () => {
    expect(hitsWith(FARMING.swings.till, hoeFx(tool("hoe", 1, [], ["fire"])))).toBe(2);
    expect(hitsWith(FARMING.swings.clear, hoeFx(tool("hoe", 10, [], ["fire"])))).toBe(2);
    expect(hitsWith(1, { fewer: 2 })).toBe(1);
    expect(hitsWith(3, PLAIN_HOE)).toBe(3);
    expect(hitsWith(0, { fewer: 1 })).toBe(0);
    // (a gem is set in a tool at any plus: here in one as it was bought, so that the gem's part is all there is)
    expect(hoeFx(tool("hoe", 0, [], ["dark"])).pace).toBeCloseTo(1.1, 12);
    expect(startRound(3, mods(tool("hoe", 0, [], ["dark"])), 5).speed).toBeCloseTo(TIMING.speed * 1.1, 12);
    expect(hoeFx(tool("hoe", 1, [], ["light"])).glow).toBe(true);
  });
});

describe("a forged can", () => {
  it("holds more waterings a filling, by its level; and a filling keeps what the can carries", () => {
    expect([0, 4, 7, 10].map((l) => canHolds(tool("can", l)))).toEqual([8, 9, 11, 16]);
    expect(canHolds(tool("canCopper", 10))).toBe(WATER.cans.canCopper);
    expect(canHolds(tool("hoe", 10))).toBe(0);
    for (const l of [0, 4, 10]) {
      const p = purseOf(tool("can", l)), did = done(chore(p, "well", 50, NOW));
      expect(did.purse.bag[0]).toEqual({ ...tool("can", l), water: LEVELS.can.waterings[l] });
      expect(did.well).toBe(50 - WATER.fill);
      // (full: there is nothing more to fill)
      expect(choreFor(did.purse, "well", 50)).toBeNull();
    }
    // (a can with a plain can's fill in it is not full when it holds more)
    expect(choreFor(purseOf({ ...tool("can", 10), water: 8 }), "well", 50)).toBe("fill");
    expect(choreFor(purseOf({ ...tool("can"), water: 8 }), "well", 50)).toBeNull();
  });
  it("half a filling is half of what the can holds", () => {
    expect(done(chore(purseOf(tool("can", 10)), "well", 1, NOW)).purse.bag[0]?.water).toBe(8);
    expect(done(chore(purseOf(tool("can")), "well", 1, NOW)).purse.bag[0]?.water).toBe(4);
  });
  it("is the can in the hand when that is the forged one: its water is used, and it is the one filled", () => {
    const two = { ...newPurse(), stamina: { day: dayOf(NOW), left: 100 }, bag: [{ ...tool("can"), water: 3 }, { ...tool("can", 10), water: 5 }, ...Array<null>(18).fill(null)] as Purse["bag"] };
    const held = done(hold(two, 1)).purse, w = done(water("1,1", held, sown(), "can", NOW));
    expect([w.purse.bag[0]?.water, w.purse.bag[1]?.water]).toEqual([3, 4]);
    expect(done(chore(held, "well", 50, NOW)).purse.bag[1]).toEqual({ ...tool("can", 10), water: 16 });
    // (two plain cans: the first that will do, as ever, whichever is held)
    const plain = { ...two, bag: [{ ...tool("can"), water: 3 }, { ...tool("can"), water: 5 }, ...Array<null>(18).fill(null)] as Purse["bag"] };
    expect(done(water("1,1", done(hold(plain, 1)).purse, sown(), "can", NOW)).purse.bag.slice(0, 2).map((s) => s?.water)).toEqual([2, 5]);
  });
  it("with fire and a last drop holds more still, and a thrifty one fills from one bucketful", () => {
    expect(canHolds(tool("can", 1, [], ["fire"]))).toBe(9);
    expect(canHolds(tool("can", 10, [], ["fire"]))).toBe(18);
    expect(canHolds(tool("can", 6, drawn("cnDrop", "cnThrift"), ["fire"]))).toBe(LEVELS.can.waterings[6] + 1 + 1);
    const thrifty = done(chore(purseOf(tool("can", 3, drawn("cnThrift"))), "well", 50, NOW));
    expect([thrifty.well, thrifty.purse.bag[0]?.water]).toEqual([49, LEVELS.can.waterings[3]]);
    expect(done(chore(purseOf(tool("can", 3, drawn("cnThrift"))), "well", 1, NOW)).purse.bag[0]?.water).toBe(LEVELS.can.waterings[3]);
  });
  it("with dark a watering adds a share more and uses two of the can's (what it has, of a can with one)", () => {
    const plain = done(water("1,1", purseOf({ ...tool("can"), water: 5 }), sown(), "can", NOW)), base = plain.plot.plant!.boost;
    const dark = done(water("1,1", purseOf({ ...tool("can", 1, [], ["dark"]), water: 5 }), sown(), "can", NOW));
    expect(dark.plot.plant!.boost).toBeCloseTo(base * 1.1, 6);
    expect(dark.purse.bag[0]?.water).toBe(3);
    expect(done(water("1,1", purseOf({ ...tool("can", 10, [], ["dark"]), water: 1 }), sown(), "can", NOW)).purse.bag[0]?.water).toBe(0);
    expect(plain.purse.bag[0]?.water).toBe(4);
    expect(base).toBe(FARMING.water.adds * 60_000);
  });
  it("widens the pour's marks by its level, slows its water with ice, and forgives a miss with water", () => {
    const mods = (s: Stack, more: object = {}) => { const fx = canFx(s); return { forged: fx.marks, pace: fx.pace, spare: fx.spared, ...more }; };
    for (const spent of [false, true]) expect(startPour(2, { spent, drops: true, ...mods(tool("can")) }, 9)).toEqual(startPour(2, { spent, drops: true }, 9));
    expect(startLong([1, 2, 3], { buff: 1.2, ...mods(tool("can")) }, 1, 9)).toEqual(startLong([1, 2, 3], { buff: 1.2 }, 1, 9));
    for (const l of [4, 7, 10]) {
      expect(startPour(2, { spent: true, ...mods(tool("can", l)) }, 9).width).toBeCloseTo(POURING.tired * LEVELS.can.marks[l], 12);
      expect(startLong([1, 2, 3], mods(tool("can", l)), 1, 9).zone).toBeCloseTo(LONG.zone * LEVELS.can.marks[l], 12);
    }
    // (steady hands and the can together: never past the cap, never less than the hands alone)
    for (const buff of [1.2, 1.6, 2.2, 3]) expect(startPour(2, { spent: true, buff, ...mods(tool("can", 10)) }, 9).width).toBeCloseTo(POURING.tired * Math.max(buff, Math.min(FORGE.cap, buff * 1.5)), 10);
    const icy = startPour(2, { spent: true, ...mods(tool("can", 1, [], ["ice"])) }, 9), bare = startPour(2, { spent: true }, 9);
    expect(pour(icy, true, 0.2).level).toBeCloseTo(pour(bare, true, 0.2).level * 0.85, 12);
    expect(startLong([1, 2], mods(tool("can", 1, [], ["ice"])), 1, 9).speed).toBeCloseTo(LONG.speed * 0.85, 12);
    // a pour let go short of the marks, forgiven once
    let p = startPour(2, { spent: true, drops: true, ...mods(tool("can", 1, [], ["water"])) }, 9);
    p = pour(pour(p, true, 0.05), false, 0.01);
    expect([p.misses, p.spare]).toEqual([0, 0]);
    p = pour(pour(p, true, 0.05), false, 0.01);
    expect(p.misses).toBe(1);
  });
});

describe("a forged net", () => {
  const bug = "ladybird" as const;
  it("leaves a plain net's ring and swing exactly as they were", () => {
    const fx = netFx(tool("bugNet"));
    for (const spent of [false, true]) {
      expect(ringOf(bug, spent, 1, 1, fx.ring)).toBe(ringOf(bug, spent));
      expect(swingMs(spent, false, fx.lands)).toBe(spent ? NET.tired.lands : NET.lands);
      expect(againMs(spent, false, fx.lands, fx.again)).toBe(againMs(spent));
      expect(againMs(spent, true, fx.lands, fx.again)).toBe(againMs(spent, true));
      expect(fledBy(2, spent, fx.bears)).toBe(fledBy(2, spent));
    }
  });
  it("has a wider ring and a swing that lands sooner, by its level", () => {
    for (const l of [4, 7, 10]) {
      const fx = netFx(tool("bugNet", l));
      expect(ringOf(bug, false, 1, 1, fx.ring) / ringOf(bug, false)).toBeCloseTo(LEVELS.bugNet.ring[l] / NET.radius, 12);
      expect(swingMs(false, false, fx.lands)).toBe(LEVELS.bugNet.lands[l]);
      expect(swingMs(true, false, fx.lands)).toBe(Math.round((NET.tired.lands * LEVELS.bugNet.lands[l]) / NET.lands));
      expect(againMs(false, false, fx.lands, fx.again)).toBe(LEVELS.bugNet.lands[l] + NET.again);
    }
    // (the wind's gust still waits as long as a swing and its rest take: a forged net's own)
    const top = netFx(tool("bugNet", 10));
    expect(swingMs(false, true, top.lands)).toBe(0);
    expect(againMs(false, true, top.lands, top.again)).toBe(150 + NET.again);
  });
  it("never eases past the cap: the ring with all that widens it, the swing with fire in it", () => {
    const fx = netFx(tool("bugNet", 10, [], ["fire"]));
    expect(swingMs(false, false, fx.lands)).toBe(Math.round(NET.lands * 0.5 * 0.75));
    expect(swingMs(false, false, 0.1)).toBe(Math.round(NET.lands / FORGE.cap));
    for (const wide of [1, 2, 2.5, 4]) expect(ringOf(bug, false, wide, 1, fx.ring) / ringOf(bug, false)).toBeCloseTo(Math.max(wide, Math.min(FORGE.cap, wide * 1.5)), 10);
  });
  it("by what it carries: a quicker return, a miss more borne, a longer reach, a smaller ring with dark", () => {
    const fx = netFx(tool("bugNet", 6, drawn("ntAgain", "ntMesh")));
    expect(againMs(false, false, fx.lands, fx.again)).toBe(LEVELS.bugNet.lands[6] + NET.again / 2);
    expect([fledBy(2, true, fx.bears), fledBy(3, true, fx.bears), fledBy(9, false, fx.bears)]).toEqual([false, true, false]);
    const long = netFx(tool("bugNet", 3, drawn("ntLong")));
    expect(long.reach).toBe(1);
    expect(aimAt({ x: 0, y: 0 }, { x: 10, y: 0 }, NET.reach + long.reach).x).toBeCloseTo(NET.reach + 1, 12);
    expect(netFx(tool("bugNet", 0, [], ["dark"])).ring).toBeCloseTo(0.9, 12);
    expect(ringOf(bug, false, 1, 1, 0.9)).toBeCloseTo(ringOf(bug, false) * 0.9, 12);
    // (an insect between the plain ring and the forged one: taken by the one, missed by the other)
    const top = netFx(tool("bugNet", 10)).ring, between = { x: 5 + (ringOf(bug, false) + ringOf(bug, false, 1, 1, top)) / 2, y: 5, lift: 0, right: true, open: true } as never;
    expect(taken(bug, between, { x: 5, y: 5 }, false, 1, 1, top)).toBe(true);
    expect(taken(bug, between, { x: 5, y: 5 }, false)).toBe(false);
    expect(missesWith(3, netFx(tool("bugNet", 1, [], ["water"])).spared)).toBe(2);
    expect(missesWith(1, 2)).toBe(0);
    expect(missesWith(2, 0)).toBe(2);
  });
});

describe("forged cookware", () => {
  const mods = (s: Stack, more: object = {}) => { const fx = cookFx(s); return { ...stirMods([], false), forged: fx.band, spare: fx.spared, grace: fx.grace, ...more }; };
  it("leaves the stirring with a plain pot exactly as it was", () => {
    for (const k of COOK_KINDS) for (const spent of [false, true]) {
      expect(startStir(5, { ...stirMods([], spent, 1.6), forged: cookFx(tool(k as ItemId)).band, spare: cookFx(tool(k as ItemId)).spared, grace: cookFx(tool(k as ItemId)).grace })).toEqual(startStir(5, stirMods([], spent, 1.6)));
    }
    expect(stirsWith(5, PLAIN_COOK)).toBe(5);
  });
  it("widens the good pace by its level, the pot, the pan and the grill alike", () => {
    const plain = startStir(5, stirMods([], false)), either = (plain.hi - plain.lo) / 2;
    for (const k of COOK_KINDS) for (const l of [4, 7, 10]) {
      const s = startStir(5, mods(tool(k as ItemId, l)));
      expect((s.hi - s.lo) / 2).toBeCloseTo(Math.min(STIRRING.pace * 0.8, either * LEVELS.pot.band[l]), 12);
      expect(s.grace).toBe(plain.grace);
    }
  });
  it("never eases past the cap with steady hands and an apron together", () => {
    const apron = [{ item: "apron" as ItemId, n: 1 }], base = STIRRING.either * Math.sqrt(COOKING.stirring.wide);
    for (const calm of [1, 1.2, 1.6, 2.2, 3]) {
      const s = startStir(5, { ...stirMods(apron, false, calm), forged: cookFx(tool("pot", 10)).band }), rest = Math.sqrt(1.3) * calm;
      expect((s.hi - s.lo) / 2).toBeCloseTo(Math.min(STIRRING.pace * 0.8, base * Math.max(rest, Math.min(FORGE.cap, rest * 1.5))), 10);
    }
  });
  it("by what it carries: fewer stirs, a miss that loses nothing, a slower slip, a harder pace with dark", () => {
    expect(stirsWith(8, cookFx(tool("pot", 3, drawn("ckBrisk"))))).toBe(6);
    expect(stirsWith(5, cookFx(tool("pan", 1, [], ["fire"])))).toBe(Math.ceil(5 * 0.85));
    expect(stirsWith(8, cookFx(tool("grill", 10, drawn("ckBrisk"), ["fire"])))).toBe(Math.ceil(8 * 0.75 * 0.75));
    expect(stirsWith(1, { shorter: 0.9 })).toBe(1);
    const base = startStir(5, mods(tool("pot", 3, drawn("ckBase"), ["water"])));
    expect(base.spare).toBe(2);
    // (left to catch on the bottom: two slips cost nothing, the third a helping)
    let s = stir(base, 0.01, 0.125);
    for (let i = 0; i < 30; i++) s = stir(s, 0.001, 0.125);
    expect([s.misses, s.spare]).toEqual([1, 0]);
    let bare = stir(startStir(5, stirMods([], false)), 0.01, 0.125);
    for (let i = 0; i < 30; i++) bare = stir(bare, 0.001, 0.125);
    expect(bare.misses).toBe(3);
    expect(startStir(5, mods(tool("pot", 1, [], ["ice"]))).grace).toBeCloseTo(STIRRING.grace / 0.85, 12);
    const plain = startStir(5, stirMods([], false)), dark = startStir(5, mods(tool("pot", 0, [], ["dark"])));
    expect((dark.hi - dark.lo) / (plain.hi - plain.lo)).toBeCloseTo(1 / 1.1, 12);
    expect(cookFx(tool("pot", 1, [], ["dark"])).helping).toBe(OLD_FX.dark.cook.helping[0]);
    expect(cookFx(tool("pot", 10, [], ["lightning"])).helping).toBe(OLD_FX.lightning.chance[1]);
  });
});

describe("the stamina a forged tool takes off (whoever keeps the game)", () => {
  const paid = (p: Purse, cost: number, s: Stack, fx: { stamina: number; fresh: boolean }, id: OptionId) => toolPaid(p, spend(p, cost, NOW), NOW, s, fx, id);
  it("a plain tool takes nothing off, and keeps nothing", () => {
    const p = purseOf(tool("hoe")), after = spend(p, 2, NOW);
    expect(toolPaid(p, after, NOW, p.bag[0], hoeFx(p.bag[0]), "hoFresh")).toBe(after);
  });
  it("earth takes its share off, owed forward in whole points, never touching the gifts", () => {
    const s = tool("can", 1, [], ["earth"]);
    let p = purseOf(s);
    const left: number[] = [];
    for (let i = 0; i < 20; i++) { p = paid(p, 1, s, canFx(s), "cnFresh"); left.push(staminaOf(p, NOW)); }
    // twenty waterings of a point each, 15% off: seventeen points paid, three given back, the first at the seventh
    expect(left[19]).toBe(100 - 17);
    expect(left.slice(0, 8)).toEqual([100, 99, 98, 97, 96, 95, 95, 94]);
    expect(toolOwed(p)).toBeCloseTo(0, 6);
    expect(p.gifts).toBeUndefined();
    // a deed of two points with a quarter off: one and a half, so three for two deeds
    const top = tool("hoe", 10, [], ["earth"]);
    let q = purseOf(top);
    q = paid(q, 2, top, hoeFx(top), "hoFresh");
    expect([staminaOf(q, NOW), toolOwed(q)]).toEqual([99, expect.closeTo(0.5, 6)]);
    q = paid(q, 2, top, hoeFx(top), "hoFresh");
    expect([staminaOf(q, NOW), toolOwed(q)]).toEqual([97, expect.closeTo(0, 6)]);
  });
  it("with a hearty meal the two together never leave less than a third of the plain cost", () => {
    const s = tool("pot", 10, [], ["earth"]);
    // hearty at its last level leaves a third already: earth adds nothing to it
    let p = buffed(purseOf(s), "hearty", 4);
    for (let i = 0; i < 12; i++) p = paid(p, 3, s, cookFx(s), "ckFresh");
    expect(staminaOf(p, NOW)).toBe(100 - 12);
    // at its first (three tenths off), a quarter more off what is left
    let q = buffed(purseOf(s), "hearty", 1);
    for (let i = 0; i < 10; i++) q = paid(q, 10, s, cookFx(s), "ckFresh");
    expect([100 - staminaOf(q, NOW), toolOwed(q)]).toEqual([Math.floor(10 * 7 * 0.75), expect.closeTo(0.5, 6)]);
  });
  it("the first few deeds of a meal's hours cost none, counted by the option; then they cost as ever", () => {
    const s = tool("hoe", 3, drawn("hoFresh"));
    let p = purseOf(s);
    for (let i = 0; i < powerLeft(purseOf(s), "hoFresh", NOW); i++) p = paid(p, 2, s, hoeFx(s), "hoFresh");
    expect([staminaOf(p, NOW), powerUsed(p, "hoFresh", NOW), powerLeft(p, "hoFresh", NOW)]).toEqual([100, 10, 0]);
    p = paid(p, 2, s, hoeFx(s), "hoFresh");
    expect(staminaOf(p, NOW)).toBe(98);
    // (the next meal's hours: free again)
    const dinner = NOW + 6 * HOUR, before = { ...p }, after = toolPaid(before, spend(before, 2, dinner), dinner, s, hoeFx(s), "hoFresh");
    expect(staminaOf(after, dinner)).toBe(98);
    // (a deed that cost nothing is not counted: tired hands, or a gift that paid for it)
    const tired = { ...purseOf(s), stamina: { day: dayOf(NOW), left: 0 } };
    expect(powerUsed(paid(tired, 2, s, hoeFx(s), "hoFresh"), "hoFresh", NOW)).toBe(0);
    // (asleep under its milestone, it frees nothing)
    const low = tool("hoe", 2, drawn("hoFresh"));
    expect(staminaOf(paid(purseOf(low), 2, low, hoeFx(low), "hoFresh"), NOW)).toBe(98);
  });
  it("is paid where the deed is judged: the hoe's work, a watering, a catch, a pot", () => {
    // the hoe: ten free plots, with the tool in the hand
    let p = purseOf(tool("hoe", 3, drawn("hoFresh")));
    const hoed = done(tend("1,1", WILD, undefined, 0, 0, p, "me", NOW));
    expect([hoed.deed, staminaOf(hoed.purse, NOW), powerUsed(hoed.purse, "hoFresh", NOW)]).toEqual(["clear", 100, 1]);
    expect(staminaOf(done(tend("1,1", WILD, undefined, 0, 0, purseOf(tool("hoe")), "me", NOW)).purse, NOW)).toBe(100 - FARMING.costs.clear);
    // a watering with earth in the can
    p = purseOf({ ...tool("can", 10, [], ["earth"]), water: 9 });
    let n = 0;
    for (let i = 0; i < 8; i++) { const w = done(tend(`${i},1`, sown(), undefined, 0, 0, p, "me", NOW)); p = w.purse; n++; }
    expect([n, staminaOf(p, NOW), p.bag[0]?.water]).toEqual([8, 100 - 6, 1]);
    // and a can whose first waterings of a meal's hours are free
    const fresh = done(tend("1,1", sown(), undefined, 0, 0, purseOf({ ...tool("can", 3, drawn("cnFresh")), water: 5 }), "me", NOW));
    expect([fresh.deed, staminaOf(fresh.purse, NOW), powerUsed(fresh.purse, "cnFresh", NOW), fresh.purse.bag[0]?.water]).toEqual(["water", 100, 1, 4]);
    expect(staminaOf(done(tend("1,1", sown(), undefined, 0, 0, purseOf({ ...tool("can"), water: 5 }), "me", NOW)).purse, NOW)).toBe(100 - FARMING.costs.water);
    // a catch with a forged net: ten free catches a meal's hours
    const h = HAUNTS[0], has: Swarm = { turn: 1, bug: "ladybird", n: 1, seed: 1 }, at: [number, number] = [Math.floor(h.perches[0].x), Math.floor(h.perches[0].y)];
    const netted = done(net(purseOf(tool("bugNet", 3, drawn("ntFresh"))), h, has, 0, false, "bugNet", at, 2, NOW));
    expect([staminaOf(netted.purse, NOW), powerUsed(netted.purse, "ntFresh", NOW)]).toEqual([100, 1]);
    expect(staminaOf(done(net(purseOf(tool("bugNet")), h, has, 0, false, "bugNet", at, 0, NOW)).purse, NOW)).toBeLessThan(100);
    // a pot: the first of a meal's hours with a forged pot in the hand, and only with that pot the dish's own cookware
    const things: Array<[ItemId, number]> = [["barb", 2], ["daikon", 1], ["cabbage", 1], ["chili", 1]];
    const cookWith = (s: Stack) => { let q = purseOf(s); for (const [id, k] of things) q = { ...q, bag: put(q.bag, id, k) }; return q; };
    const first = done(cook(cookWith(tool("pot", 3, drawn("ckFresh"))), things, ["pot"], 0, NOW));
    expect([first.made, staminaOf(first.purse, NOW), powerUsed(first.purse, "ckFresh", NOW)]).toEqual(["sourCurry", 100, 1]);
    let again = first.purse;
    for (const [id, k] of things) again = { ...again, bag: put(again.bag, id, k) };
    expect(staminaOf(done(cook(again, things, ["pot"], 0, NOW)).purse, NOW)).toBe(100 - COOKING.cost);
    expect(staminaOf(done(cook(cookWith(tool("pot")), things, ["pot"], 0, NOW)).purse, NOW)).toBe(100 - COOKING.cost);
  });
});

describe("what is built", () => {
  it("lists, for each of the old tools, only options that are its own and elements there are", () => {
    for (const kind of OLD) {
      for (const id of BUILT[kind].opts) expect((OPTIONS[id].tools as readonly ToolKind[]).includes(kind)).toBe(true);
      for (const e of BUILT[kind].gems) expect(ELEMENTS).toContain(e);
      expect(new Set(BUILT[kind].opts).size).toBe(BUILT[kind].opts.length);
      // (what the smith draws from and sets is that list)
      expect(drawable(kind, 1)).toEqual(poolOf(kind, 1).filter((id) => BUILT[kind].opts.includes(id)));
      for (const e of ELEMENTS) expect(settable(kind, e)).toBe(BUILT[kind].gems.includes(e));
    }
    // the pot, the pan and the grill are forged alike
    expect(BUILT.pan).toEqual(BUILT.pot);
    expect(BUILT.grill).toEqual(BUILT.pot);
    // (and the wind is every tool's: lib/town/tools walks whoever holds it)
    for (const kind of OLD) expect(BUILT[kind].gems).toContain("wind");
  });
  it("is, of each tool's options and elements, those a reader of this file gives something for", () => {
    const stack = (kind: ToolKind, opt: OptionId | null, gem: string | null): Stack => {
      const pool = opt ? OPTIONS[opt].pool : 1;
      return tool(kind as ItemId, 10, opt ? (pool === 1 ? drawn(opt) : drawn(null, null, opt)) : [], gem ? [gem] : []);
    };
    const read = (kind: ToolKind, s: Stack) => JSON.stringify(kind === "rod" ? rodFx(s) : kind === "hoe" ? hoeFx(s) : kind === "can" ? canFx(s) : kind === "bugNet" ? netFx(s) : cookFx(s));
    for (const kind of OLD) {
      const bare = read(kind, stack(kind, null, null));
      for (const id of BUILT[kind].opts) expect(read(kind, stack(kind, id, null)), `${kind} ${id}`).not.toBe(bare);
      for (const e of BUILT[kind].gems) if (e !== "wind") expect(read(kind, stack(kind, null, e)), `${kind} ${e}`).not.toBe(bare);
    }
  });
});
