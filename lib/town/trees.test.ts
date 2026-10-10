import { describe, expect, it, vi } from "vitest";
import { FELLING, leastSecs } from "./felling";
import { countsOf, POINTS } from "./line-points";
import { powerLeft } from "./powers";
import { STAMINA, dayOf, staminaOf } from "./stamina";
import { GEM_FX, LEVELS, OPTIONS, axeChops } from "./tools";
import { held, newPurse, type Purse, type Stack } from "./trade";
import {
  KEEPSAKES, KEEPSAKE_IDS, TREES, ageOf, bearsOf, begin, braceGo, bracePay, bringHome, chopsFor, farFrom, fell, fellingOf, girthOf, groupOf, groveOf, grownAt, keepsakeFor, keepsakesOf, kindOf, lookAt, lookOf, mostTimber, newGrove, opened,
  rootBack, rootable, tidied, timberFor, toldOf, treeOf, wantsOf, woodOf,
  type FellLuck, type Grove, type Standing, fellWord, heldBy, readFellWord,
} from "./trees";

const MIN = 60_000, HOUR = 3_600_000;
/** 2026-10-08 12:00 in Bangkok: a moment in the middle of a day and of a meal's hours. */
const NOON = Date.UTC(2026, 9, 8, 5, 0, 0);
/**
 * A made-up wood: three pines two tiles apart, one far off, an ironwood, a moonwood, and the ancient tree. By their
 * numbers (lib/town/trees' girthOf) pine 0 is slender, 1 plain, 2 stout, 3 plain and 4 slender.
 */
const WOOD: Standing[] = woodOf(
  [{ id: 0, x: 10, y: 10, tier: 1 }, { id: 1, x: 12, y: 10, tier: 1 }, { id: 2, x: 10, y: 12, tier: 1 }, { id: 3, x: 30, y: 30, tier: 1 }, { id: 60, x: 40, y: 10, tier: 2 }, { id: 100, x: 50, y: 10, tier: 3 }, { id: 4, x: 13, y: 12, tier: 1 }],
  { x: 20, y: 20, w: 3 },
);
const BESIDE: Record<number, [number, number]> = { 0: [10, 11], 1: [12, 11], 2: [11, 12], 3: [30, 31], 60: [40, 11], 100: [50, 11], 4: [13, 13], 900: [23, 21] };
/** A purse with an axe in the hand (as it was forged), full of stamina. */
function woodcutter(axe: Partial<Stack> = {}, more: Partial<Purse> = {}): Purse {
  const p = newPurse();
  return { ...p, bag: [{ item: "axe", n: 1, ...axe }, ...p.bag.slice(1)], hand: "axe", handAt: 0, stamina: { day: dayOf(NOON), left: STAMINA.max }, ...more };
}
const LUCKLESS: FellLuck = { dark: 0.99, scent: 0.99, which: 0.99, chain: 0.99 };
const lucky = (n: number, l: Partial<FellLuck> = {}) => Array.from({ length: n }, () => ({ ...LUCKLESS, ...l }));
/** One tree felled on the board by the purse's axe: its trunk cut through with so many misses, in time enough. */
function cut(p: Purse, g: Grove, id: number, misses = 0, more: { luck?: Partial<FellLuck>; one?: boolean; twice?: boolean; now?: number } = {}) {
  return fell(p, g, "me", { tree: id, through: true, misses, secs: 6, one: more.one, twice: more.twice }, BESIDE[id], more.now ?? NOON, lucky(1, more.luck), WOOD);
}
const opts3 = (id: string) => ({ plus: 3, opts: [id] }), top = (id?: string) => ({ plus: 10, opts: id ? ["", "", id] : [] });

describe("a tree, by the clock", () => {
  it("is a stump, a sprout, a young tree and grown at the shares of its six minutes", () => {
    const from = NOON, until = grownAt({}, from);
    expect(until - from).toBe(TREES.regrow * MIN);
    expect(TREES.regrow).toBe(6);
    expect(lookAt(from, until, from)).toBe(0);
    expect(lookAt(from, until, from + 0.249 * TREES.regrow * MIN)).toBe(0);
    expect(lookAt(from, until, from + 0.25 * TREES.regrow * MIN)).toBe(1);
    expect(lookAt(from, until, from + 0.599 * TREES.regrow * MIN)).toBe(1);
    expect(lookAt(from, until, from + 0.6 * TREES.regrow * MIN)).toBe(2);
    expect(lookAt(from, until, from + 0.999 * TREES.regrow * MIN)).toBe(2);
    expect(lookAt(from, until, from + TREES.regrow * MIN)).toBe(3);
  });

  it("the ancient tree is grown once a day, from dawn in Bangkok, and a stump until then", () => {
    const elder = treeOf(TREES.elder.id, WOOD)!;
    // felled at noon: back at five the next morning (22:00 UTC of the same day)
    expect(grownAt(elder, NOON)).toBe(Date.UTC(2026, 9, 8, 22, 0, 0));
    // felled a minute before dawn: back a minute later; a minute after: a day on
    const dawn = Date.UTC(2026, 9, 7, 22, 0, 0);
    expect(grownAt(elder, dawn - MIN)).toBe(dawn);
    expect(grownAt(elder, dawn + MIN)).toBe(dawn + 24 * HOUR);
    const g: Grove = { down: { [TREES.elder.id]: { at: NOON, by: "me" } }, half: [] };
    expect(ageOf(g, elder, NOON + 10 * HOUR)).toBe(0);
    expect(ageOf(g, elder, Date.UTC(2026, 9, 8, 22, 0, 0))).toBe(3);
  });

  it("what has grown again is forgotten, and a page reads each tree's look from what it is told", () => {
    const g: Grove = { down: { 0: { at: NOON, by: "a" }, 1: { at: NOON - 50 * MIN, by: "b" } }, half: [2, 0] };
    expect(Object.keys(tidied(g, NOON, WOOD).down)).toEqual(["0"]);
    const told = toldOf(g, woodcutter(), NOON + 2 * MIN, WOOD);
    expect(told).toEqual({ down: [{ id: 0, at: NOON, until: NOON + TREES.regrow * MIN }], half: [2] });
    expect(lookOf(told, 0, NOON + 2 * MIN)).toBe(1);
    expect(lookOf(told, 0, NOON + 41 * MIN)).toBe(3);
    expect(lookOf(told, 1, NOON)).toBe(3);
    expect(lookOf(null, 5, NOON)).toBe(3);
  });
});

describe("walking up to a tree with an axe", () => {
  it("is a game of twelve chops with a plain axe, branches seen three up, at the plain pace", () => {
    const did = begin(woodcutter(), newGrove(), 3, BESIDE[3], NOON, 77, WOOD);
    expect(did).toMatchObject({ ok: true, trees: [3], elder: false, ask: { ahead: 3, pace: 1, spared: 0, spent: false } });
    if (did.ok) expect(did.ask).toMatchObject({ trees: [{ id: 3, girth: 2, timber: [2, 0] }], chops: 12, girth: 2, family: "pairs" });
  });

  it("a pine's girth is its own from its number: a slender one is a short game with a kind bar and one fine timber, a stout one a long game with a tight bar and three", () => {
    expect([0, 1, 2, 3, 4].map((id) => girthOf(treeOf(id, WOOD)!))).toEqual([1, 2, 3, 2, 1]);
    // the trees of the upper terraces are all alike, and the ancient tree is a great one
    expect(girthOf(treeOf(60, WOOD)!)).toBe(TREES.girthAbove);
    expect(girthOf(treeOf(TREES.elder.id, WOOD)!)).toBe(3);
    const at = (id: number, more: Partial<Purse> = {}) => { const did = begin(woodcutter({}, more), newGrove(), id, BESIDE[id], NOON, 9, WOOD); if (!did.ok) throw new Error(did.why); return did.ask; };
    expect(at(4)).toMatchObject({ trees: [{ id: 4, girth: 1, timber: [2] }], chops: 8, girth: 1, family: "alternate", pace: 0.8 });
    expect(at(3)).toMatchObject({ chops: 12, girth: 2, family: "pairs", pace: 1 });
    // (pine 2 stands by itself for whoever wears no echo)
    expect(at(2)).toMatchObject({ trees: [{ id: 2, girth: 3, timber: [3, 1, 0] }], chops: 16, girth: 3, family: "run", pace: 1.05 });
    expect(TREES.girths.map((g) => g.timber.length)).toEqual([1, 2, 3]);
    expect([4, 3, 2].map((id) => mostTimber(treeOf(id, WOOD)!))).toEqual([1, 2, 3]);
    expect(bearsOf(treeOf(2, WOOD)!)).toEqual([3, 1, 0]);
    // with no stamina the bar's pace is the girth's own for tired hands
    const spent = { stamina: { day: dayOf(NOON), left: 0 } };
    expect([4, 3, 2].map((id) => at(id, spent).pace)).toEqual(TREES.girths.map((g) => g.spent));
    // and an axe's own ease is on top of the girth's
    const forged = begin(woodcutter({ plus: 10 }), newGrove(), 2, BESIDE[2], NOON, 9, WOOD);
    expect(forged.ok && forged.ask.chops).toBe(Math.ceil((LEVELS.axe.chops[10] * 16) / 12));
    expect(forged.ok && forged.ask.pace).toBeCloseTo(0.5 * 1.05);
  });

  it("a tree this axe cannot fell says which axe it wants", () => {
    expect(wantsOf(treeOf(60, WOOD)!)).toEqual({ tier: 2, plus: 0 });
    expect(wantsOf(treeOf(100, WOOD)!)).toEqual({ tier: 3, plus: 0 });
    expect(wantsOf(treeOf(TREES.elder.id, WOOD)!)).toEqual({ tier: TREES.axeTier, plus: TREES.elder.plus });
    expect(wantsOf(treeOf(3, WOOD)!)).toBe(null);
  });

  it("refuses, each for its own state: no axe held, too far, an axe that will not bite, a stump, a full bag", () => {
    const p = woodcutter(), g = newGrove();
    expect(begin({ ...p, hand: null }, g, 3, BESIDE[3], NOON, 1, WOOD)).toEqual({ ok: false, why: "tool" });
    expect(begin({ ...p, bag: [{ item: "hoe", n: 1 }], hand: "hoe" }, g, 3, BESIDE[3], NOON, 1, WOOD)).toEqual({ ok: false, why: "tool" });
    expect(begin(p, g, 3, [30, 33], NOON, 1, WOOD)).toEqual({ ok: false, why: "far" });
    expect(begin(p, g, 60, BESIDE[60], NOON, 1, WOOD)).toEqual({ ok: false, why: "bite" });
    expect(begin(woodcutter({ plus: 10 }), g, 100, BESIDE[100], NOON, 1, WOOD)).toEqual({ ok: false, why: "bite" });
    expect(begin(p, { down: { 3: { at: NOON - (TREES.regrow - 1) * MIN, by: "x" } }, half: [] }, 3, BESIDE[3], NOON, 1, WOOD)).toEqual({ ok: false, why: "stump" });
    expect(begin(p, { down: { 3: { at: NOON - 40 * MIN, by: "x" } }, half: [] }, 3, BESIDE[3], NOON, 1, WOOD).ok).toBe(true);
    expect(begin(p, g, 999, BESIDE[3], NOON, 1, WOOD)).toEqual({ ok: false, why: "none" });
    const full = { ...p, bag: p.bag.map((s) => s ?? { item: "stone" as const, n: 50 }) };
    expect(begin(full, g, 3, BESIDE[3], NOON, 1, WOOD)).toEqual({ ok: false, why: "full" });
  });

  it("the ancient tree is refused under the top plus, and at it is a longer game, by itself", () => {
    const g = newGrove();
    for (const plus of [0, 5, 9]) expect(begin(woodcutter({ plus }), g, TREES.elder.id, BESIDE[900], NOON, 1, WOOD)).toEqual({ ok: false, why: "plus" });
    const did = begin(woodcutter({ plus: 10 }), g, TREES.elder.id, BESIDE[900], NOON, 1, WOOD);
    expect(did).toMatchObject({ ok: true, elder: true, trees: [TREES.elder.id] });
    if (did.ok) {
      expect(did.ask.chops).toBe(axeChops({ item: "axe", n: 1, plus: 10 }, TREES.elderChops));
      expect(did.ask.chops).toBe(2 * LEVELS.axe.chops[10]);
      expect(did.ask.family).toBe(TREES.elderFamily);
    }
    // reached from any tile beside its three by three
    const elder = treeOf(TREES.elder.id, WOOD)!;
    expect(farFrom(elder, [19, 19])).toBe(1);
    expect(farFrom(elder, [21, 21])).toBe(0);
    expect(farFrom(elder, [24, 22])).toBe(2);
  });

  it("with no stamina the game is the tired one", () => {
    const did = begin(woodcutter({}, { stamina: { day: dayOf(NOON), left: 0 } }), newGrove(), 3, BESIDE[3], NOON, 1, WOOD);
    expect(did).toMatchObject({ ok: true, ask: { spent: true, pace: TREES.girths[1].spent } });
  });
});

describe("a tree felled", () => {
  it("gives two logs always, and fine timber by the misses: two with none, one with one or two, none with more", () => {
    expect([0, 1, 2, 3, 9].map((m) => timberFor(m))).toEqual([2, 1, 1, 0, 0]);
    expect([0, 2, 3].map((m) => timberFor(m, 1))).toEqual([1, 1, 0]);
    expect([0, 1, 2, 3, 4].map((m) => timberFor(m, 3))).toEqual([3, 2, 1, 1, 0]);
    for (const [misses, timber] of [[0, 2], [1, 1], [2, 1], [3, 0]] as const) {
      const did = cut(woodcutter(), newGrove(), 3, misses);
      expect(did.ok).toBe(true);
      if (!did.ok) continue;
      expect(held(did.purse.bag, "log")).toBe(2);
      expect(held(did.purse.bag, "timber")).toBe(timber);
      expect(did.got).toEqual(timber ? [["log", 2], ["timber", timber]] : [["log", 2]]);
      expect(did.felled).toMatchObject([{ id: 3, kind: "pine", misses, chained: null, free: false, twice: false }]);
    }
  });

  it("costs two stamina a tree, and is a stump for everybody from then on, with who felled it and when", () => {
    const p = woodcutter(), did = cut(p, newGrove(), 3);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(staminaOf(did.purse, NOON)).toBe(STAMINA.max - TREES.cost);
    expect(did.grove.down[3]).toEqual({ at: NOON, by: "me" });
    // somebody else, with another purse, is told the same
    expect(toldOf(did.grove, newPurse(), NOON, WOOD).down).toEqual([{ id: 3, at: NOON, until: NOON + TREES.regrow * MIN }]);
    // and nobody fells it again until it is grown
    expect(cut(did.purse, did.grove, 3, 0, { now: NOON + (TREES.regrow - 1) * MIN })).toEqual({ ok: false, why: "stump" });
    expect(cut(did.purse, did.grove, 3, 0, { now: NOON + TREES.regrow * MIN }).ok).toBe(true);
  });

  it("stands when its go is lost: nothing is felled, nothing is given, no stamina is paid, and the go is over (the owner, 2026-10-09)", () => {
    for (const went of [{ through: false, misses: 0, secs: 2 }, { through: false, misses: 3, secs: 0.4 }, { misses: 0, secs: 9 }]) {
      const p = woodcutter(), did = fell(p, newGrove(), "me", { tree: 3, ...went }, BESIDE[3], NOON, lucky(1, { keep: 0, kind: 0 }), WOOD);
      expect(did).toMatchObject({ ok: true, through: false, plain: false, stood: true, felled: [], got: [], found: [], braced: null });
      if (!did.ok) continue;
      expect(did.purse).toEqual(p);
      expect(staminaOf(did.purse, NOON)).toBe(STAMINA.max);
      expect(did.grove).toEqual(newGrove());
    }
    // the go is over: its hold is gone, and the tree is anybody's at once
    const open = opened(newGrove(), "me", [3], NOON);
    expect(begin(woodcutter(), open, 3, BESIDE[3], NOON + 1000, 1, WOOD, "her")).toEqual({ ok: false, why: "held" });
    const lost = fell(woodcutter(), open, "me", { tree: 3, through: false, misses: 1, secs: 1 }, BESIDE[3], NOON + 2000, lucky(1), WOOD);
    if (!lost.ok) throw new Error(lost.why);
    expect(lost.grove.goes).toBeUndefined();
    expect(begin(woodcutter(), lost.grove, 3, BESIDE[3], NOON + 3000, 1, WOOD, "her")).toMatchObject({ ok: true, trees: [3] });
    // with no stamina left it is the same: the tree stands, and nothing is owed
    const tired = { ...woodcutter(), stamina: { day: woodcutter().stamina!.day, left: 0 } };
    expect(fell(tired, newGrove(), "me", { tree: 3, through: false, misses: 3, secs: 1 }, BESIDE[3], NOON, lucky(1), WOOD)).toMatchObject({ ok: true, stood: true, felled: [], got: [], purse: tired });
  });

  it("has no plain way any more: a go that asks for a tree at once, with no board, is refused whatever the tree (the owner, 2026-10-09)", () => {
    const worn = { gifts: { had: ["charmEchoAxe"], charms: ["charmEchoAxe"] } };
    for (const [id, more] of [[3, {}], [2, {}], [0, worn]] as const) {
      expect(fell(woodcutter({}, more), newGrove(), "me", { tree: id, secs: 0, plain: true }, BESIDE[id], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "board" });
      // (and said with a go that was cut through, it is refused all the same: it is the saying so that is refused)
      expect(fell(woodcutter({}, more), newGrove(), "me", { tree: id, through: true, misses: 0, secs: 9, plain: true }, BESIDE[id], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "board" });
    }
    // a stump and the ancient tree are refused the same way
    expect(fell(woodcutter(), { down: { 3: { at: NOON, by: "x" } }, half: [] }, "me", { tree: 3, secs: 0, plain: true }, BESIDE[3], NOON + MIN, lucky(1), WOOD)).toEqual({ ok: false, why: "board" });
    expect(fell(woodcutter({ plus: 10 }), newGrove(), "me", { tree: TREES.elder.id, secs: 0, plain: true }, BESIDE[900], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "board" });
    // what is refused before it is refused as it was: no axe, and too far
    expect(fell(newPurse(), newGrove(), "me", { tree: 3, secs: 0, plain: true }, BESIDE[3], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "tool" });
    expect(fell(woodcutter(), newGrove(), "me", { tree: 3, secs: 0, plain: true }, [BESIDE[3][0] + 9, BESIDE[3][1] + 9], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "far" });
  });

  it("with no stamina it costs nothing more, and gives as it gives anybody", () => {
    const p = woodcutter({}, { stamina: { day: dayOf(NOON), left: 0 } }), did = cut(p, newGrove(), 3, 2);
    expect(did.ok).toBe(true);
    if (did.ok) { expect(staminaOf(did.purse, NOON)).toBe(0); expect(did.got).toEqual([["log", 2], ["timber", 1]]); }
  });

  it("is held to what was walked up to, to an axe that bites, and to what a hand can do", () => {
    const p = woodcutter(), g = newGrove();
    expect(fell(p, g, "me", { tree: 3, through: true, misses: 0, secs: 6 }, [30, 33], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "far" });
    expect(fell({ ...p, hand: null }, g, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "tool" });
    expect(fell(p, g, "me", { tree: 60, through: true, misses: 0, secs: 6 }, BESIDE[60], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "bite" });
    // twelve chops in half a second were not chopped
    expect(leastSecs([12])).toBeGreaterThan(0.5);
    expect(fell(p, g, "me", { tree: 3, through: true, misses: 0, secs: 0.5 }, BESIDE[3], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "none" });
    // with no echo worn, only the tree walked up to comes down
    const alone = fell(p, g, "me", { tree: 0, through: true, misses: 0, secs: 12 }, BESIDE[0], NOON, lucky(3), WOOD);
    expect(alone.ok && alone.felled.map((f) => f.id)).toEqual([0]);
  });

  it("one go on a tree at a time: while a board's hold lasts nobody else's board or press takes on its tree, and a hold that lapsed frees it", () => {
    const p = woodcutter(), open = opened(newGrove(), "me", [3], NOON);
    expect(open.goes).toEqual({ me: { trees: [3], at: NOON } });
    expect(heldBy(open, 3, NOON + 5000)).toBe("me");
    expect(heldBy(open, 3, NOON + 5000, "me")).toBeNull();
    // five seconds on she is refused, a go of hers and her own board alike; I am not
    expect(fell(woodcutter(), open, "her", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON + 5000, lucky(1), WOOD)).toEqual({ ok: false, why: "held" });
    expect(begin(woodcutter(), open, 3, BESIDE[3], NOON + 5000, 1, WOOD, "her")).toEqual({ ok: false, why: "held" });
    expect(begin(p, open, 3, BESIDE[3], NOON + 5000, 1, WOOD, "me")).toMatchObject({ ok: true, trees: [3] });
    // my go goes on, and pays me alone: the stump is mine
    const mine = fell(p, open, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON + 9000, lucky(1), WOOD);
    expect(mine).toMatchObject({ ok: true, through: true, felled: [{ id: 3, timber: 2 }], got: [["log", 2], ["timber", 2]] });
    if (!mine.ok) return;
    expect(mine.grove.down[3]).toEqual({ at: NOON + 9000, by: "me" });
    expect(mine.grove.goes).toBeUndefined();
    expect(staminaOf(mine.purse, NOON + 9000)).toBe(STAMINA.max - TREES.cost);
    // once only: the go is over, and the tree is a stump to me as to anybody
    expect(fell(mine.purse, mine.grove, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON + 12000, lucky(1), WOOD)).toEqual({ ok: false, why: "stump" });
    // a tree that was down before my board was open is no part of my go
    const before: Grove = { down: { 3: { at: NOON - 1000, by: "her" } }, half: [], goes: { me: { trees: [3], at: NOON } } };
    expect(fell(p, before, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON + 9000, lucky(1), WOOD)).toEqual({ ok: false, why: "stump" });
    // a hold that has lapsed frees the tree: she fells it, and my go, ended after that, is paid for nothing (the tree pays once)
    const late = NOON + (TREES.go.secs + 1) * 1000;
    expect(heldBy(open, 3, late)).toBeNull();
    const hers = fell(woodcutter(), open, "her", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], late, lucky(1), WOOD);
    if (!hers.ok) throw new Error(hers.why);
    expect(hers.grove.down[3]).toEqual({ at: late, by: "her" });
    expect(fell(p, hers.grove, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], late + 1000, lucky(1), WOOD)).toEqual({ ok: false, why: "stump" });
    // ...and with the tree still standing my late go is paid as any go is
    expect(fell(p, open, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], late, lucky(1), WOOD)).toMatchObject({ ok: true, felled: [{ id: 3, timber: 2 }] });
    expect(tidied(open, late, WOOD).goes).toBeUndefined();
    // what the room is told of a go, and read back: the tree walked up to, and every tree the go holds
    expect(fellWord([12])).toBe("f12");
    expect(fellWord([12, 13, 15])).toBe("f12.13.15");
    expect(readFellWord("f12.13.15")).toEqual({ kind: "f", tree: 12, trees: [12, 13, 15] });
    expect(readFellWord("b7")).toEqual({ kind: "b", tree: 7, trees: [7] });
    for (const bad of ["", "f", "x3", "b1.2", "f1.", "f1.2.3.4.5", null, 3]) expect(readFellWord(bad)).toBeNull();
    // what is kept is made sound, with its goes
    expect(groveOf({ down: {}, half: [], goes: { me: { trees: [3], at: NOON, braced: "her" }, bad: { trees: [], at: NOON }, self: { trees: [1], at: NOON, braced: "self" } } }).goes).toEqual({ me: { trees: [3], at: NOON, braced: "her" }, self: { trees: [1], at: NOON } });
  });

  it("the ancient tree, to an axe at the top: fifteen fine timber and three resin, whatever the misses, and gone until dawn", () => {
    const did = cut(woodcutter({ plus: 10 }), newGrove(), TREES.elder.id, 4);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.got).toEqual([["timber", 15], ["resin", 3]]);
    expect(did.felled[0].kind).toBe("elder");
    // it alone stands when its go is lost: nothing is changed, and it may be tried again
    const top10 = woodcutter({ plus: 10 }), lost = fell(top10, newGrove(), "me", { tree: TREES.elder.id, through: false, misses: 1, secs: 3 }, BESIDE[900], NOON, lucky(1), WOOD);
    expect(lost).toMatchObject({ ok: true, stood: true, through: false, felled: [], got: [] });
    if (lost.ok) { expect(lost.purse).toEqual(top10); expect(lost.grove.down).toEqual({}); }
    expect(cut(did.purse, did.grove, TREES.elder.id, 0, { now: NOON + 5 * HOUR })).toEqual({ ok: false, why: "stump" });
    expect(cut(did.purse, did.grove, TREES.elder.id, 0, { now: NOON + 17 * HOUR }).ok).toBe(true);
    expect(cut(woodcutter({ plus: 9 }), newGrove(), TREES.elder.id)).toEqual({ ok: false, why: "plus" });
    // when it is grown again is told only to whoever holds an axe that knows
    expect(toldOf(did.grove, woodcutter({ plus: 10 }), NOON, WOOD).down).toEqual([{ id: TREES.elder.id, at: NOON }]);
  });

  it("is two points on the line, ten for the ancient tree, and ten more the first of each kind", () => {
    expect(countsOf({ from: "deed", what: "fell", thing: kindOf(treeOf(3, WOOD)!), n: 1, doc: {} }, "me")).toEqual([{ to: null, line: "felling", raw: 2, first: "felling:pine" }]);
    expect(countsOf({ from: "deed", what: "fell", thing: kindOf(treeOf(TREES.elder.id, WOOD)!), n: 1, doc: {} }, "me")).toEqual([{ to: null, line: "felling", raw: 10, first: "felling:elder" }]);
    expect(countsOf({ from: "deed", what: "fell", thing: "oak", n: 1, doc: {} }, "me")).toEqual([]);
    // whoever braced the trunk has a point of the helpers' (never the feller's own)
    expect(countsOf({ from: "deed", what: "fell", thing: "pine", n: 1, doc: { braced: "her" } }, "me")).toEqual([{ to: null, line: "felling", raw: 2, first: "felling:pine" }, { to: "her", line: "helpers", raw: POINTS.braced }]);
    expect(countsOf({ from: "deed", what: "fell", thing: "pine", n: 1, doc: { braced: "me" } }, "me").length).toBe(1);
    expect(POINTS.first).toBe(10);
  });

  it("goes into the bag whole or not at all", () => {
    const p = woodcutter();
    expect(bringHome(p, [["log", 2], ["timber", 2]])?.bag.filter(Boolean).length).toBe(3);
    const tight = { ...p, bag: p.bag.map((s, i) => s ?? (i < 9 ? { item: "stone" as const, n: 50 } : null)) };
    expect(bringHome(tight, [["log", 2]])).not.toBe(null);
    expect(bringHome(tight, [["log", 2], ["timber", 2]])).toBe(null);
  });
});

describe("the echo axe (felling's first rank): one game for the trees standing close", () => {
  const worn = { gifts: { had: ["charmEchoAxe"], charms: ["charmEchoAxe"] } };

  it("takes up to three grown trees within two tiles of the first, the nearest first; never the ancient tree, never a stump, and only when worn", () => {
    const p = woodcutter({}, worn), axe = p.bag[0]!, first = treeOf(0, WOOD)!;
    expect(groupOf(p, newGrove(), first, axe, NOON, WOOD).map((t) => t.id)).toEqual([0, 1, 2]);
    expect(groupOf(woodcutter(), newGrove(), first, axe, NOON, WOOD).map((t) => t.id)).toEqual([0]);
    expect(groupOf(woodcutter({}, { gifts: { had: ["charmEchoAxe"], charms: [] } }), newGrove(), first, axe, NOON, WOOD).map((t) => t.id)).toEqual([0]);
    expect(groupOf(p, { down: { 1: { at: NOON, by: "x" } }, half: [] }, first, axe, NOON, WOOD).map((t) => t.id)).toEqual([0, 2]);
    expect(groupOf(p, newGrove(), treeOf(3, WOOD)!, axe, NOON, WOOD).map((t) => t.id)).toEqual([3]);
    expect(groupOf(woodcutter({ plus: 10 }, worn), newGrove(), treeOf(TREES.elder.id, WOOD)!, axe, NOON, WOOD).map((t) => t.id)).toEqual([TREES.elder.id]);
    // one game on one trunk: the hardest of them (the stout pine's sixteen chops, its bar, its long runs)
    const did = begin(p, newGrove(), 0, BESIDE[0], NOON, 5, WOOD);
    expect(did.ok && did.trees).toEqual([0, 1, 2]);
    expect(did.ok && did.ask).toMatchObject({ trees: [{ id: 0, girth: 1, timber: [2] }, { id: 1, girth: 2, timber: [2, 0] }, { id: 2, girth: 3, timber: [3, 1, 0] }], chops: 16, girth: 3, family: "run", pace: 1.05 });
  });

  it("every tree in reach comes down with the one trunk: stamina for each, and each its own fine timber by that game's misses", () => {
    const p = woodcutter({}, worn);
    const did = fell(p, newGrove(), "me", { tree: 0, through: true, misses: 1, secs: 14 }, BESIDE[0], NOON, lucky(3), WOOD);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.felled.map((f) => [f.id, f.girth, f.timber, f.most])).toEqual([[0, 1, 1, 1], [1, 2, 1, 2], [2, 3, 2, 3]]);
    expect(Object.keys(did.grove.down)).toEqual(["0", "1", "2"]);
    expect(staminaOf(did.purse, NOON)).toBe(STAMINA.max - 3 * TREES.cost);
    expect(did.got).toEqual([["log", 6], ["timber", 4]]);
    // a go that was lost: all three stand, and nothing is spent
    const lost = fell(p, newGrove(), "me", { tree: 0, through: false, misses: 2, secs: 3 }, BESIDE[0], NOON, lucky(3), WOOD);
    expect(lost).toMatchObject({ ok: true, stood: true, felled: [], got: [], purse: p });
    // and it is held to the one trunk's chops: sixteen were not chopped in a second
    expect(fell(p, newGrove(), "me", { tree: 0, through: true, misses: 0, secs: 0.9 }, BESIDE[0], NOON, lucky(3), WOOD)).toEqual({ ok: false, why: "none" });
    // of a go whose board was opened, the trees are those it was opened for: one that grew meanwhile is no part of it
    // (it is grown again twenty seconds after the board is opened, and the go ends thirty seconds after: within its hold)
    const open = opened({ down: { 1: { at: NOON - 40 * MIN + 20_000, by: "x" } }, half: [] }, "me", [0, 2], NOON);
    const held = fell(p, open, "me", { tree: 0, through: true, misses: 0, secs: 14 }, BESIDE[0], NOON + 30_000, lucky(3), WOOD);
    expect(held.ok && held.felled.map((f) => f.id)).toEqual([0, 2]);
  });
});

describe("the woodpecker (felling's second rank)", () => {
  it("forgives one branch a tree, while it follows", () => {
    const following = woodcutter({}, { gifts: { had: ["famWoodpecker"], charms: [], familiar: "famWoodpecker" } });
    const resting = woodcutter({}, { gifts: { had: ["famWoodpecker"], charms: [], familiar: null } });
    const a = begin(following, newGrove(), 3, BESIDE[3], NOON, 1, WOOD), b = begin(resting, newGrove(), 3, BESIDE[3], NOON, 1, WOOD);
    expect(a.ok && a.ask.spared).toBe(TREES.pecks);
    expect(b.ok && b.ask.spared).toBe(0);
  });
});

describe("what an axe's plus, options and gems change", () => {
  const ask = (axe: Partial<Stack>, grove = newGrove()) => { const did = begin(woodcutter(axe), grove, 3, BESIDE[3], NOON, 1, WOOD); if (!did.ok) throw new Error(did.why); return did.ask; };

  it("a plus: fewer chops, branches seen further, a slower bar; never more wood", () => {
    expect([0, 4, 7, 10].map((plus) => ask({ plus }).chops)).toEqual([12, 10, 7, 4]);
    expect([0, 6, 10].map((plus) => ask({ plus }).ahead)).toEqual([3, 4, 5]);
    expect([0, 4, 10].map((plus) => ask({ plus }).pace)).toEqual([1, 0.9, 0.5]);
    const did = cut(woodcutter({ plus: 10 }), newGrove(), 3);
    expect(did.ok && did.got).toEqual([["log", 2], ["timber", 2]]);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(STAMINA.max - TREES.cost);
  });

  it("the keen edge and the grain-reader: an option drawn is the axe's whatever its plus has fallen to", () => {
    expect(ask(opts3("axKeen")).chops).toBe(LEVELS.axe.chops[3] - OPTIONS.axKeen.n.chops);
    expect(ask({ plus: 2, opts: ["axKeen"] }).chops).toBe(LEVELS.axe.chops[2] - OPTIONS.axKeen.n.chops);
    expect(ask(opts3("axGrain")).ahead).toBe(LEVELS.axe.ahead[3] + OPTIONS.axGrain.n.ahead);
  });

  it("the offcut: every fifth tree a log more, counted in the purse", () => {
    let p = woodcutter(opts3("axDust")), g = newGrove();
    const logs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const did = cut(p, g, 3, 0, { now: NOON + i * 41 * MIN });
      if (!did.ok) throw new Error(did.why);
      logs.push(did.got.find(([id]) => id === "log")![1]);
      p = { ...did.purse, bag: woodcutter(opts3("axDust")).bag, stamina: { day: dayOf(NOON + i * 41 * MIN), left: STAMINA.max } };
      g = did.grove;
    }
    expect(logs).toEqual([2, 2, 2, 2, 3, 2, 2, 2, 2, 3]);
    expect(fellingOf(p).dust).toBe(0);
    // and a plain axe counts nothing
    const plain = cut(woodcutter(), newGrove(), 3);
    expect(plain.ok && fellingOf(plain.purse).dust).toBe(0);
  });

  it("the resin-scent: one tree in four, a resin or a pine cone", () => {
    const of = (scent: number, which: number) => { const did = cut(woodcutter(opts3("axResin")), newGrove(), 3, 0, { luck: { scent, which } }); return did.ok ? did.got : null; };
    expect(of(0.24, 0.1)).toEqual([["log", 2], ["timber", 2], ["resin", 1]]);
    expect(of(0.24, 0.9)).toEqual([["log", 2], ["timber", 2], ["pineCone", 1]]);
    expect(of(0.26, 0.1)).toEqual([["log", 2], ["timber", 2]]);
    const plain = cut(woodcutter(), newGrove(), 3, 0, { luck: { scent: 0, which: 0 } });
    expect(plain.ok && plain.got).toEqual([["log", 2], ["timber", 2]]);
  });

  it("the woodcutter's wind: the first five trees of a meal's hours cost no stamina, the sixth does, and the next meal's begin again", () => {
    let p = woodcutter(opts3("axFresh")), g = newGrove();
    const left: number[] = [];
    for (let i = 0; i < 6; i++) {
      const did = fell(p, g, "me", { tree: 3, through: true, misses: 0, secs: 6 }, BESIDE[3], NOON, lucky(1), WOOD);
      if (!did.ok) throw new Error(did.why);
      left.push(staminaOf(did.purse, NOON));
      expect(did.felled[0].free).toBe(i < 5);
      p = { ...did.purse, bag: woodcutter(opts3("axFresh")).bag };
      g = newGrove();
    }
    expect(left).toEqual([100, 100, 100, 100, 100, 98]);
    expect(powerLeft(p, "axFresh", NOON)).toBe(0);
    expect(powerLeft(p, "axFresh", NOON + 7 * HOUR)).toBe(5);
  });

  it("fire: fewer chops; ice: a slower bar; water: branches forgiven; dark: a faster bar, and now and then a log more", () => {
    expect(ask({ gems: ["fire"] }).chops).toBe(Math.ceil(12 * (1 - GEM_FX.fire.axe.fewer[0])));
    expect(ask({ plus: 10, gems: ["fire"] }).chops).toBe(Math.ceil(4 * (1 - GEM_FX.fire.axe.fewer[1])));
    expect(ask({ gems: ["ice"] }).pace).toBeCloseTo(1 - GEM_FX.ice.axe.slow[0]);
    expect(ask({ gems: ["water"] }).spared).toBe(1);
    expect(ask({ plus: 10, gems: ["water"] }).spared).toBe(2);
    expect(ask({ gems: ["dark"] }).pace).toBeCloseTo(1 + GEM_FX.dark.axe.faster[0]);
    const dark = (luck: number, plus = 0) => { const did = cut(woodcutter({ plus, gems: ["dark"] }), newGrove(), 3, 0, { luck: { dark: luck } }); return did.ok ? did.got[0] : null; };
    expect(dark(0.09)).toEqual(["log", 3]);
    expect(dark(0.11)).toEqual(["log", 2]);
    expect(dark(0.19, 10)).toEqual(["log", 3]);
  });

  it("earth: a tree costs so much less stamina, what is left of a point owed on to the next", () => {
    let p = woodcutter({ gems: ["earth"] });
    for (let i = 0; i < 20; i++) {
      const did = cut(p, newGrove(), 3);
      if (!did.ok) throw new Error(did.why);
      p = did.purse;
    }
    // twenty trees at 1.7 each
    expect(STAMINA.max - staminaOf(p, NOON)).toBe(Math.round(20 * TREES.cost * (1 - GEM_FX.earth.axe.stamina[0])));
    expect(fellingOf(p).owed).toBeLessThan(1);
  });

  it("lightning: now and then the nearest grown tree is left half cut, for whoever fells it next", () => {
    const struck = cut(woodcutter({ gems: ["lightning"] }), newGrove(), 0, 0, { luck: { chain: 0.09 } });
    expect(struck.ok && struck.felled[0].chained).toBe(1);
    if (!struck.ok) return;
    expect(struck.grove.half).toEqual([1]);
    const p = woodcutter(), half = begin(p, struck.grove, 1, BESIDE[1], NOON, 1, WOOD);
    expect(half.ok && half.ask.chops).toBe(6);
    expect(chopsFor(p.bag[0]!, treeOf(1, WOOD)!, true)).toBe(6);
    // felled, it is whole again when it grows back
    const next = cut(p, struck.grove, 1);
    expect(next.ok && next.grove.half).toEqual([]);
    // no luck, no neighbour; and never a tree out of reach
    const none = cut(woodcutter({ gems: ["lightning"] }), newGrove(), 0, 0, { luck: { chain: 0.11 } });
    expect(none.ok && none.grove.half).toEqual([]);
    const far = cut(woodcutter({ gems: ["lightning"] }), newGrove(), 3, 0, { luck: { chain: 0 } });
    expect(far.ok && far.felled[0].chained).toBe(null);
  });
});

describe("the powers of an axe at the top, counted by the day", () => {
  it("one stroke: the tree falls with no game, thirty a day, never the ancient tree", () => {
    let p = woodcutter(top("axOne")), g = newGrove();
    for (let i = 0; i < 30; i++) {
      const did = fell(p, g, "me", { tree: 3, secs: 0, one: true }, BESIDE[3], NOON, lucky(1), WOOD);
      expect(did).toMatchObject({ ok: true, one: true, plain: false, felled: [{ id: 3, misses: 0 }], got: [["log", 2], ["timber", 2]] });
      if (did.ok) p = did.purse;
    }
    expect(powerLeft(p, "axOne", NOON)).toBe(0);
    expect(fell(p, g, "me", { tree: 3, secs: 0, one: true }, BESIDE[3], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "spent" });
    expect(powerLeft(p, "axOne", NOON + 24 * HOUR)).toBe(30);
    expect(fell(woodcutter(top("axOne")), g, "me", { tree: TREES.elder.id, secs: 0, one: true }, BESIDE[900], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "none" });
    // an axe without it has no such stroke
    expect(fell(woodcutter({ plus: 10 }), g, "me", { tree: 3, secs: 0, one: true }, BESIDE[3], NOON, lucky(1), WOOD)).toEqual({ ok: false, why: "none" });
    // and it gives every fine timber the tree has: a stout pine's three
    const stout = fell(woodcutter(top("axOne")), g, "me", { tree: 2, secs: 0, one: true }, BESIDE[2], NOON, lucky(1), WOOD);
    expect(stout.ok && stout.got).toEqual([["log", 2], ["timber", 3]]);
  });

  it("a double haul: twice the wood of a tree, ten a day, and plain after", () => {
    let p = woodcutter(top("axDouble"));
    const first = cut(p, newGrove(), 3, 1, { twice: true });
    expect(first.ok && first.got).toEqual([["log", 4], ["timber", 2]]);
    expect(first.ok && first.felled[0].twice).toBe(true);
    if (first.ok) p = first.purse;
    expect(powerLeft(p, "axDouble", NOON)).toBe(9);
    // not asked for, not used
    const plain = cut(p, newGrove(), 3, 0);
    expect(plain.ok && plain.got).toEqual([["log", 2], ["timber", 2]]);
    expect(plain.ok && powerLeft(plain.purse, "axDouble", NOON)).toBe(9);
    // used up: a plain tree
    const spent = { ...p, powers: { axDouble: { k: dayOf(NOON), n: 10 } } };
    const after = cut(spent, newGrove(), 3, 0, { twice: true });
    expect(after.ok && after.got).toEqual([["log", 2], ["timber", 2]]);
  });

  it("the quickening root: the stump I just made grows back for everybody, three a day; never another's, never an old one, never the ancient tree's", () => {
    const p = woodcutter(top("axRoot")), did = cut(p, newGrove(), 3);
    if (!did.ok) throw new Error(did.why);
    expect(rootable(did.purse, did.grove, "me", NOON + 5000, WOOD)).toBe(3);
    expect(rootable(did.purse, did.grove, "you", NOON + 5000, WOOD)).toBe(null);
    expect(rootBack(did.purse, did.grove, "you", 3, NOON + 5000, WOOD)).toEqual({ ok: false, why: "none" });
    expect(rootBack(did.purse, did.grove, "me", 3, NOON + (TREES.root.within + 1) * 1000, WOOD)).toEqual({ ok: false, why: "none" });
    const back = rootBack(did.purse, did.grove, "me", 3, NOON + 5000, WOOD);
    expect(back).toMatchObject({ ok: true, left: 2 });
    if (back.ok) { expect(back.grove.down).toEqual({}); expect(cut(back.purse, back.grove, 3, 0, { now: NOON + 6000 }).ok).toBe(true); }
    const spent = { ...did.purse, powers: { axRoot: { k: dayOf(NOON), n: 3 } } };
    expect(rootBack(spent, did.grove, "me", 3, NOON + 5000, WOOD)).toEqual({ ok: false, why: "spent" });
    expect(rootable(spent, did.grove, "me", NOON + 5000, WOOD)).toBe(null);
    const elder = cut(woodcutter(top("axRoot")), newGrove(), TREES.elder.id);
    expect(elder.ok && rootBack(elder.purse, elder.grove, "me", TREES.elder.id, NOON + 1000, WOOD)).toEqual({ ok: false, why: "none" });
  });

  it("the elder's friend: half as much again from the ancient tree, and told when it is grown", () => {
    const p = woodcutter(top("axElder")), did = cut(p, newGrove(), TREES.elder.id);
    expect(did.ok && did.got).toEqual([["timber", 23], ["resin", 5]]);
    if (!did.ok) return;
    expect(toldOf(did.grove, did.purse, NOON, WOOD).down).toEqual([{ id: TREES.elder.id, at: NOON, until: Date.UTC(2026, 9, 8, 22, 0, 0) }]);
    // a plain tree is as anybody's
    const plain = cut(p, newGrove(), 3);
    expect(plain.ok && plain.got).toEqual([["log", 2], ["timber", 2]]);
  });
});

describe("a friend braces the trunk", () => {
  it("of a go that is open, from within two tiles of its tree: once, never one's own, and paid a log when the go is over", () => {
    const open = opened(newGrove(), "me", [3], NOON);
    expect(braceGo(open, "me", "me", [31, 31], NOON + 1000, WOOD)).toEqual({ ok: false, why: "none" });
    expect(braceGo(open, "her", "nobody", [31, 31], NOON + 1000, WOOD)).toEqual({ ok: false, why: "none" });
    expect(braceGo(open, "her", "me", [33, 30], NOON + 1000, WOOD)).toEqual({ ok: false, why: "far" });
    expect(braceGo(open, "her", "me", [32, 31], NOON + (TREES.go.secs + 1) * 1000, WOOD)).toEqual({ ok: false, why: "none" });
    const braced = braceGo(open, "her", "me", [32, 31], NOON + 1000, WOOD);
    expect(braced).toMatchObject({ ok: true, tree: 3 });
    if (!braced.ok) return;
    expect(braced.grove.goes).toEqual({ me: { trees: [3], at: NOON, braced: "her" } });
    // one brace a go
    expect(braceGo(braced.grove, "him", "me", [32, 31], NOON + 2000, WOOD)).toEqual({ ok: false, why: "none" });
    // the trunk cut through, with whatever misses: who braced it is told, to be paid
    const did = fell(woodcutter(), braced.grove, "me", { tree: 3, through: true, misses: 2, secs: 4 }, BESIDE[3], NOON + 8000, lucky(1), WOOD);
    expect(did.ok && did.braced).toBe("her");
    expect(did.ok && did.grove.goes).toBeUndefined();
    // a go that was lost fells nothing, and nobody is paid for bracing it
    const lostGo = fell(woodcutter(), braced.grove, "me", { tree: 3, through: false, misses: 2, secs: 4 }, BESIDE[3], NOON + 8000, lucky(1), WOOD);
    expect(lostGo).toMatchObject({ ok: true, stood: true, braced: null, felled: [] });
    expect(lostGo.ok && lostGo.grove.goes).toBeUndefined();
    // (the plain way that was is refused, braced or not: nobody is paid for it)
    expect(fell(woodcutter(), braced.grove, "me", { tree: 3, secs: 0, plain: true }, BESIDE[3], NOON + 8000, lucky(1), WOOD)).toEqual({ ok: false, why: "board" });
    // a log of their own, where the bag has room; and nothing lost where it has none
    const hers = bracePay(newPurse());
    expect(hers.got).toEqual([["log", TREES.brace.logs]]);
    expect(held(hers.purse.bag, "log")).toBe(TREES.brace.logs);
    const p = newPurse(), full = { ...p, bag: p.bag.map((s) => s ?? { item: "stone" as const, n: 50 }) };
    expect(bracePay(full)).toEqual({ purse: full, got: [] });
  });
});

describe("keepsakes", () => {
  it("are a dozen, each with its name and a line of what it looks like; the rarer ones only a stout pine has", () => {
    expect(KEEPSAKE_IDS.length).toBe(12);
    for (const id of KEEPSAKE_IDS) { const k = KEEPSAKES[id]; expect(k.name.th && k.name.en && k.line.th && k.line.en && k.weight > 0, id).toBeTruthy(); }
    expect(keepsakesOf(3)).toEqual(KEEPSAKE_IDS);
    expect(keepsakesOf(1)).toEqual(keepsakesOf(2));
    expect(keepsakesOf(1).length).toBe(9);
    // the three a slender or a plain pine never has are the three that fall least often
    const rare = KEEPSAKE_IDS.filter((id) => !keepsakesOf(1).includes(id));
    expect(Math.max(...rare.map((id) => KEEPSAKES[id].weight))).toBeLessThan(Math.min(...keepsakesOf(1).map((id) => KEEPSAKES[id].weight)));
  });

  it("fall from about one pine in six, by the weights; never from the ancient tree nor from the trees above", () => {
    const pine = treeOf(3, WOOD)!, stout = treeOf(2, WOOD)!;
    expect(keepsakeFor(pine, 1 / TREES.keepsake.in - 0.001, 0)).toBe(KEEPSAKE_IDS[0]);
    expect(keepsakeFor(pine, 1 / TREES.keepsake.in + 0.001, 0)).toBe(null);
    expect(keepsakeFor(pine, 0, 0.9999)).toBe(keepsakesOf(2)[8]);
    expect(keepsakeFor(stout, 0, 0.9999)).toBe(KEEPSAKE_IDS[11]);
    expect(keepsakeFor(treeOf(TREES.elder.id, WOOD)!, 0, 0)).toBe(null);
    expect(keepsakeFor(treeOf(60, WOOD)!, 0, 0)).toBe(null);
    // every one of them can fall, from a stout pine
    expect(new Set(Array.from({ length: 400 }, (_, i) => keepsakeFor(stout, 0, i / 400))).size).toBe(12);
  });

  it("are kept by whoever felled the tree, never in the bag; and the first of each is written in the village's book with who found it", () => {
    // (a trunk cut through with so many misses that it gives its logs alone)
    const p = woodcutter(), did = fell(p, newGrove(), "me", { tree: 3, through: true, misses: 9, secs: 6 }, BESIDE[3], NOON, lucky(1, { keep: 0, kind: 0 }), WOOD, "Aqua");
    if (!did.ok) throw new Error(did.why);
    const id = KEEPSAKE_IDS[0];
    expect(did.found).toEqual([{ id, first: true }]);
    expect(did.felled[0].keepsake).toBe(id);
    expect(did.got).toEqual([["log", 2]]);
    expect(did.purse.bag.filter(Boolean).length).toBe(2);
    expect(fellingOf(did.purse).keeps).toEqual({ [id]: 1 });
    expect(did.grove.book).toEqual({ [id]: { by: "Aqua", at: NOON } });
    expect(toldOf(did.grove, did.purse, NOON, WOOD).book).toEqual([[id, "Aqua"]]);
    // found again by another: theirs to keep too, and the book's first stays
    const hers = fell(woodcutter(), did.grove, "her", { tree: 0, through: true, misses: 9, secs: 6 }, BESIDE[0], NOON + MIN, lucky(1, { keep: 0, kind: 0 }), WOOD, "Bee");
    expect(hers.ok && hers.found).toEqual([{ id, first: false }]);
    expect(hers.ok && hers.grove.book).toEqual({ [id]: { by: "Aqua", at: NOON } });
    // with no luck, nothing
    const none = cut(woodcutter(), newGrove(), 3);
    expect(none.ok && none.found).toEqual([]);
    expect(none.ok && fellingOf(none.purse).keeps).toEqual({});
  });
});

describe("the mountain as it is laid out (the preview)", () => {
  it("has a hundred and twenty numbered trees and the ancient one, and most pines have another within the echo's reach", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const live = await import("./trees");
    vi.unstubAllEnvs();
    expect(live.WOOD.length).toBe(213);
    expect(live.WOOD.filter((t) => t.elder).map((t) => t.id)).toEqual([live.TREES.elder.id]);
    expect(live.WOOD.every((t) => t.elder || t.id < live.TREES.elder.id)).toBe(true);
    const pines = live.WOOD.filter((t) => t.tier === 1 && !t.elder);
    expect(pines.length).toBe(92);
    const near = pines.filter((t) => pines.some((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= live.TREES.echo.reach));
    expect(near.length).toBeGreaterThan(40);
    // about a third of the pines each girth (the first sixty, a third each to the tree)
    expect([1, 2, 3].map((g) => pines.filter((t) => t.id < 60 && live.girthOf(t) === g).length)).toEqual([20, 20, 20]);
    for (const g of [1, 2, 3]) expect(pines.filter((t) => live.girthOf(t) === g).length).toBeGreaterThanOrEqual(25);
  });

  it("is the same wood in a production build: the mountain is laid out in every build, and reached only while the far side is open", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { WOOD: wood } = await import("./trees");
    expect(wood.length).toBe(213);
    vi.unstubAllEnvs();
    expect(FELLING.tired.misses).toBe(3);
  });
});
