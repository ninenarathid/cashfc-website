import { describe, expect, it } from "vitest";
import {
  SMITH, TRIES, bellows, bellowsLeft, bellowsOff, candidates, choose, collect, draw, dryOf, forgeTry, gemsIn, markFound, markTop, maySmelt, newBoard, newSmithy, outcomeOf, owedOf,
  pendingSlot, pickOffer, placesOf, redraw, setGem, smelt, smeltCost, smithView, soundSmithy, timberFor, toolsIn, tryCost, tryLacks, tryOdds, widen, widerCost, withMaker, type Smithy,
} from "./forge";
import type { ItemId } from "./items";
import { BUILT, ELEMENTS, FORGE, GEMS, TOOL_KINDS, drawable, drawnOf, gemsOf, has, levelOf, makerName, makersOf, modsOf, poolOf, type OptionId } from "./tools";
import { forged, held, newPurse, put, type Purse, type Stack } from "./trade";

const NOW = Date.parse("2026-10-08T12:00:00+07:00"), MIN = 60_000;
/** A purse with coins and things: tools first, each in a slot of its own, as they are given. */
function purseWith(coins: number, things: Array<[ItemId, number]>, tools: Stack[] = []): Purse {
  const p = newPurse();
  let bag: Purse["bag"] = [...tools, ...Array<null>(20 - tools.length).fill(null)];
  for (const [id, n] of things) bag = put(bag, id, n);
  return { ...p, coins, bag };
}
const tool = (item: ItemId, plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item, n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });
const ok = <T extends { ok: boolean }>(d: T): Extract<T, { ok: true }> => { if (!d.ok) throw new Error(`refused: ${(d as unknown as { why: string }).why}`); return d as Extract<T, { ok: true }>; };

describe("smelting", () => {
  it("takes ten fragments, a fine timber and the fee a piece, and gives it after its minutes", () => {
    const purse = purseWith(100, [["shardCopper", 25], ["timber", 5]]);
    expect(smeltCost(purse, newSmithy(), "oreCopper", 2)).toEqual({ of: "shardCopper", fragments: 20, timber: 2, fee: 10 });
    const d = ok(smelt(purse, newSmithy(), "oreCopper", 2, NOW));
    expect(held(d.purse.bag, "shardCopper")).toBe(5);
    expect(held(d.purse.bag, "timber")).toBe(3);
    expect(d.purse.coins).toBe(90);
    // one after another, by the clock
    expect(d.smithy.queue).toEqual([{ piece: "oreCopper", from: NOW, till: NOW + 5 * MIN }, { piece: "oreCopper", from: NOW + 5 * MIN, till: NOW + 10 * MIN }]);
    const mid = smithView(d.smithy, NOW + 6 * MIN);
    expect(mid.done.length).toBe(1);
    expect(mid.now).toEqual({ piece: "oreCopper", from: NOW + 5 * MIN, till: NOW + 10 * MIN });
    expect(mid.waiting).toEqual([]);
  });
  it("is longer and dearer the rarer the ore, and a gem has its own minutes and fee", () => {
    const purse = purseWith(1000, [["shardIron", 10], ["shardSilver", 10], ["chipRuby", 10], ["timber", 3]]);
    let s = newSmithy(), p = purse;
    for (const piece of ["oreIron", "oreSilver", "gemRuby"] as const) { const d = ok(smelt(p, s, piece, 1, NOW)); p = d.purse; s = d.smithy; }
    expect(s.queue.map((q) => (q.till - q.from) / MIN)).toEqual([8, 11, 10]);
    expect(p.coins).toBe(1000 - 10 - 15 - 20);
  });
  it("has three places; a piece that is done takes none, and waits until it is taken, however long", () => {
    const purse = purseWith(1000, [["shardCopper", 60], ["timber", 6]]);
    expect(placesOf(newSmithy())).toBe(3);
    expect(maySmelt(purse, newSmithy(), "oreCopper", NOW)).toBe(3);
    expect(smelt(purse, newSmithy(), "oreCopper", 4, NOW)).toEqual({ ok: false, why: "places" });
    const a = ok(smelt(purse, newSmithy(), "oreCopper", 3, NOW));
    expect(smithView(a.smithy, NOW).free).toBe(0);
    expect(smelt(a.purse, a.smithy, "oreCopper", 1, NOW + MIN)).toEqual({ ok: false, why: "places" });
    // one is done: its place is free, though nobody has taken it
    expect(smithView(a.smithy, NOW + 5 * MIN).free).toBe(1);
    const b = ok(smelt(a.purse, a.smithy, "oreCopper", 1, NOW + 5 * MIN));
    expect(b.smithy.queue.length).toBe(4);
    // a month away: everything is done and still there
    const later = NOW + 30 * 24 * 60 * MIN, view = smithView(b.smithy, later);
    expect(view.done.length).toBe(4);
    expect(view.now).toBeNull();
    const got = ok(collect(b.purse, b.smithy, later));
    expect(got.got).toEqual([["oreCopper", 4]]);
    expect(held(got.purse.bag, "oreCopper")).toBe(4);
    expect(got.smithy.queue).toEqual([]);
  });
  it("gives what the bag has room for and keeps the rest; nothing is taken before it is done", () => {
    const purse = purseWith(1000, [["shardCopper", 30], ["timber", 3]]);
    const a = ok(smelt(purse, newSmithy(), "oreCopper", 3, NOW));
    expect(collect(a.purse, a.smithy, NOW + MIN)).toEqual({ ok: false, why: "none" });
    // a bag with no slot free and no ore in it: nothing fits
    const fullBag: Purse = { ...a.purse, bag: a.purse.bag.map((s) => s ?? { item: "minnow", n: 1 }) };
    expect(collect(fullBag, a.smithy, NOW + 20 * MIN)).toEqual({ ok: false, why: "full" });
    // one slot, already holding nineteen of twenty: one fits, two wait
    const tight: Purse = { ...a.purse, bag: fullBag.bag.map((s, i) => (i === 19 ? { item: "oreCopper" as ItemId, n: 19 } : s)) };
    const got = ok(collect(tight, a.smithy, NOW + 20 * MIN));
    expect(got.got).toEqual([["oreCopper", 1]]);
    expect(smithView(got.smithy, NOW + 20 * MIN).done.length).toBe(2);
  });
  it("is refused for want of fragments, of timber, of coins; and of what is not smelted", () => {
    expect(smelt(purseWith(100, [["shardCopper", 9], ["timber", 1]]), newSmithy(), "oreCopper", 1, NOW)).toEqual({ ok: false, why: "ore" });
    expect(smelt(purseWith(100, [["shardCopper", 10]]), newSmithy(), "oreCopper", 1, NOW)).toEqual({ ok: false, why: "timber" });
    expect(smelt(purseWith(4, [["shardCopper", 10], ["timber", 1]]), newSmithy(), "oreCopper", 1, NOW)).toEqual({ ok: false, why: "coins" });
    expect(smelt(purseWith(100, [["stone", 10], ["timber", 1]]), newSmithy(), "stone", 1, NOW)).toEqual({ ok: false, why: "none" });
    expect(smelt(purseWith(100, [["shardCopper", 10], ["timber", 1]]), newSmithy(), "oreCopper", 0, NOW)).toEqual({ ok: false, why: "amount" });
    expect(smelt(purseWith(100, [["shardCopper", 10], ["timber", 1]]), newSmithy(), "oreCopper", 1.5, NOW)).toEqual({ ok: false, why: "amount" });
  });
  it("is widened twice, three places each time, for fine timber and coins", () => {
    expect(widerCost(newSmithy())).toEqual({ timber: 20, coins: 200 });
    expect(widen(purseWith(200, [["timber", 19]]), newSmithy())).toEqual({ ok: false, why: "timber" });
    expect(widen(purseWith(199, [["timber", 20]]), newSmithy())).toEqual({ ok: false, why: "coins" });
    const a = ok(widen(purseWith(700, [["timber", 60]]), newSmithy()));
    expect(placesOf(a.smithy)).toBe(6);
    expect(a.purse.coins).toBe(500);
    expect(held(a.purse.bag, "timber")).toBe(40);
    expect(widerCost(a.smithy)).toEqual({ timber: 40, coins: 500 });
    const b = ok(widen(a.purse, a.smithy));
    expect(placesOf(b.smithy)).toBe(9);
    expect(b.purse.coins).toBe(0);
    expect(held(b.purse.bag, "timber")).toBe(0);
    expect(widerCost(b.smithy)).toBeNull();
    expect(widen(purseWith(9999, [["timber", 50]]), b.smithy)).toEqual({ ok: false, why: "top" });
  });
  it("a friend at the bellows takes a tenth of the piece's whole time off the piece smelting, and off what waits behind it: three presses a piece, whoever presses, never one's own", () => {
    const a = ok(smelt(purseWith(100, [["shardCopper", 20], ["timber", 2]]), newSmithy(), "oreCopper", 2, NOW));
    expect(bellows(a.smithy, "me", "me", NOW + MIN)).toEqual({ ok: false, why: "self" });
    expect([bellowsOff("oreCopper"), bellowsOff("oreIron"), bellowsOff("oreSilver"), bellowsOff("gemRuby")]).toEqual([30_000, 48_000, 66_000, 60_000]);
    let s = a.smithy;
    for (let i = 0; i < 3; i++) {
      expect(bellowsLeft(s, NOW + MIN)).toBe(3 - i);
      // (any friend's press counts: the three are the piece's, not the presser's)
      const d = ok(bellows(s, "me", i === 1 ? "other" : "pal", NOW + MIN));
      expect(d.off).toBe(30_000);
      s = d.smithy;
    }
    expect(s.queue).toEqual([{ piece: "oreCopper", from: NOW, till: NOW + 5 * MIN - 90_000, blown: 3 }, { piece: "oreCopper", from: NOW + 5 * MIN - 90_000, till: NOW + 10 * MIN - 90_000 }]);
    expect(bellowsLeft(s, NOW + MIN)).toBe(0);
    expect(bellows(s, "me", "pal", NOW + MIN)).toEqual({ ok: false, why: "tired" });
    expect(bellows(s, "me", "other", NOW + MIN)).toEqual({ ok: false, why: "tired" });
    // the piece behind it has its own three, once it is the one smelting
    const next = NOW + 5 * MIN - 90_000 + 1000;
    expect(bellowsLeft(s, next)).toBe(3);
    expect(ok(bellows(s, "me", "pal", next)).smithy.queue[1]).toEqual({ piece: "oreCopper", from: NOW + 5 * MIN - 90_000, till: NOW + 10 * MIN - 120_000, blown: 1 });
    expect(bellowsLeft(newSmithy(), NOW)).toBe(0);
    // never past the piece's end; and nothing to blow on when nothing smelts
    const near = ok(bellows(a.smithy, "me", "pal", NOW + 5 * MIN - 10_000));
    expect(near.off).toBe(10_000);
    expect(near.smithy.queue[0].till).toBe(NOW + 5 * MIN - 10_000);
    expect(bellows(a.smithy, "me", "pal", NOW + 60 * MIN)).toEqual({ ok: false, why: "idle" });
    expect(bellows(newSmithy(), "me", "pal", NOW)).toEqual({ ok: false, why: "idle" });
    expect(SMITH.bellows).toEqual({ share: 0.1, each: 3, points: 2 });
  });
  it("with seasoned wood on an axe in the bag, one timber smelts two pieces, however they are put in", () => {
    const dry = tool("axe", 3, ["axDry"]), low = tool("axe", 2, ["axDry"]);
    expect(dryOf([dry])).toBe(2);
    // (an option once drawn works whatever the level)
    expect(dryOf([low])).toBe(2);
    expect(dryOf([tool("axe", 3, ["axKeen"])])).toBe(1);
    expect(timberFor(newSmithy(), 3, 2)).toEqual({ timber: 2, ember: 1 });
    expect(timberFor(newSmithy(), 3, 1)).toEqual({ timber: 3, ember: 0 });
    // one at a time: the second piece burns no timber
    const p0 = purseWith(100, [["shardCopper", 30], ["timber", 2]], [dry]);
    const a = ok(smelt(p0, newSmithy(), "oreCopper", 1, NOW));
    expect(a.timber).toBe(1);
    expect(a.smithy.ember).toBe(1);
    const b = ok(smelt(a.purse, a.smithy, "oreCopper", 1, NOW));
    expect(b.timber).toBe(0);
    expect(held(b.purse.bag, "timber")).toBe(1);
    const c = ok(smelt(b.purse, b.smithy, "oreCopper", 1, NOW));
    expect(c.timber).toBe(1);
    expect(held(c.purse.bag, "timber")).toBe(0);
  });
  it("is kept soundly, whatever was written", () => {
    expect(soundSmithy(null)).toEqual(newSmithy());
    expect(soundSmithy({ queue: [{ piece: "stone", from: 1, till: 2 }, { piece: "oreIron", from: 5, till: 9 }, { piece: "oreIron", from: 9, till: 3 }, "x"], more: 7, ember: -2, helps: [{ by: 3, at: 1 }, { by: "a", at: 2 }], pending: { item: "minnow", at: 0, offer: [] } }))
      .toEqual({ queue: [{ piece: "oreIron", from: 5, till: 9 }], more: 2, ember: 0, pending: null });
    // (a piece's presses of the bellows: a whole number up to as many as a piece takes; nothing kept of none)
    expect(soundSmithy({ queue: [{ piece: "oreIron", from: 5, till: 9, blown: 2 }, { piece: "oreIron", from: 9, till: 12, blown: 7 }, { piece: "oreIron", from: 12, till: 15, blown: -1 }, { piece: "oreIron", from: 15, till: 18, blown: "2" }] }).queue.map((q) => q.blown)).toEqual([2, 3, undefined, undefined]);
    const p = { item: "pick", at: 1, offer: ["pkPeek", "pkCrumb"], old: "pkSteady" };
    expect(soundSmithy({ pending: p }).pending).toEqual(p);
  });
});

describe("a forging try (the table is the owner's)", () => {
  it("the table, exactly", () => {
    expect(TRIES.map((t) => [t.to, t.take, t.stay, t.down, t.fee, t.ore, t.n, t.timber])).toEqual([
      [1, 100, 0, 0, 10, "shardCopper", 5, 2], [2, 100, 0, 0, 20, "shardCopper", 8, 2], [3, 100, 0, 0, 40, "shardCopper", 12, 3], [4, 100, 0, 0, 80, "shardIron", 16, 3],
      [5, 90, 10, 0, 150, "oreIron", 1, 4], [6, 80, 15, 5, 250, "oreIron", 2, 4], [7, 70, 20, 10, 400, "oreSilver", 2, 5], [8, 60, 25, 15, 600, "oreSilver", 3, 5],
      [9, 50, 25, 25, 900, "oreSilver", 4, 6], [10, 40, 30, 30, 1500, "oreSilver", 5, 6],
    ]);
    for (const t of TRIES) expect(t.take + t.stay + t.down).toBe(100);
    expect(tryOdds(11)).toBeNull();
    expect(tryCost("pick", 11)).toBeNull();
  });
  it("two recipes: a wooden tool takes half the ore, rounded up, and twice the timber", () => {
    expect(tryCost("pick", 1)).toEqual({ fee: 10, ore: "shardCopper", n: 5, timber: 2 });
    expect(tryCost("axe", 1)).toEqual({ fee: 10, ore: "shardCopper", n: 3, timber: 4 });
    expect(tryCost("rod", 5)).toEqual({ fee: 150, ore: "oreIron", n: 1, timber: 8 });
    expect(tryCost("bugNet", 10)).toEqual({ fee: 1500, ore: "oreSilver", n: 3, timber: 12 });
    expect(tryCost("hoe", 10)).toEqual({ fee: 1500, ore: "oreSilver", n: 5, timber: 6 });
    for (const k of ["can", "pot", "pan", "grill"] as const) expect(tryCost(k, 4)).toEqual({ fee: 80, ore: "shardIron", n: 16, timber: 3 });
  });
  it("what comes of it is read from the number of chance: taken, then stays, then down, in the table's shares", () => {
    expect(outcomeOf(1, 0.999)).toBe("taken");
    expect(outcomeOf(5, 0.899)).toBe("taken");
    expect(outcomeOf(5, 0.9)).toBe("stays");
    expect(outcomeOf(5, 0.999)).toBe("stays");
    expect(outcomeOf(6, 0.79)).toBe("taken");
    expect(outcomeOf(6, 0.8)).toBe("stays");
    expect(outcomeOf(6, 0.949)).toBe("stays");
    expect(outcomeOf(6, 0.95)).toBe("down");
    expect(outcomeOf(10, 0.39)).toBe("taken");
    expect(outcomeOf(10, 0.4)).toBe("stays");
    expect(outcomeOf(10, 0.7)).toBe("down");
    expect(outcomeOf(10, 1)).toBe("down");
    // over a thousand even numbers of chance, each level's shares come out as the table has them
    for (const t of TRIES) {
      const n = { taken: 0, stays: 0, down: 0 };
      for (let i = 0; i < 1000; i++) n[outcomeOf(t.to, (i + 0.5) / 1000)]++;
      expect([n.taken, n.stays, n.down]).toEqual([t.take * 10, t.stay * 10, t.down * 10]);
    }
  });
  it("spends its materials and its fee, taken or not, and leaves the tool in its slot", () => {
    const purse = purseWith(1000, [["oreIron", 3], ["timber", 10]], [tool("hoe", 5, ["hoFirst"], ["earth"])]);
    for (const [r, out, level] of [[0.1, "taken", 6], [0.85, "stays", 5], [0.97, "down", 4]] as const) {
      const d = ok(forgeTry(purse, newSmithy(), 0, r));
      expect(d.out).toBe(out);
      expect(d.from).toBe(5);
      expect(d.level).toBe(level);
      expect(d.purse.coins).toBe(750);
      expect(held(d.purse.bag, "oreIron")).toBe(1);
      expect(held(d.purse.bag, "timber")).toBe(6);
      expect(d.purse.bag[0]).toEqual({ item: "hoe", n: 1, plus: level, opts: ["hoFirst"], gems: ["earth"] });
    }
  });
  it("up to +4 always takes; from the try to +5 on it may fail, and never leaves a tool under +4", () => {
    let purse = purseWith(100_000, [["shardCopper", 99], ["shardIron", 99], ["oreIron", 20], ["oreSilver", 20], ["timber", 50]], [tool("can")]);
    let smithy = newSmithy();
    for (let to = 1; to <= 4; to++) {
      const d = ok(forgeTry(purse, smithy, 0, 0.999999));
      expect(d.out).toBe("taken");
      expect(d.level).toBe(to);
      purse = d.purse;
      // (the draw a milestone owes is chosen before the tool is forged further)
      if (d.owed >= 0) { const laid = ok(draw(purse, smithy, 0, 0, 0)), c = ok(choose(purse, laid.smithy, 0, laid.pending.offer[0])); purse = c.purse; smithy = c.smithy; }
    }
    // the worst of luck at +4: it stays (the try to +5 never lowers)
    const at4 = ok(forgeTry(purse, smithy, 0, 0.999999));
    expect(at4.out).toBe("stays");
    expect(at4.level).toBe(4);
    // from +5 the worst of luck lowers it by one, and from there never under +4
    const two = drawable("can", 1).slice(0, 2);
    const at5 = ok(forgeTry({ ...purse, bag: purse.bag.map((s, i) => (i === 0 ? tool("can", 5, two) : s)) }, newSmithy(), 0, 0.999999));
    expect(at5.out).toBe("down");
    expect(at5.level).toBe(4);
    for (let from = 5; from <= 9; from++) {
      const d = ok(forgeTry({ ...purse, bag: purse.bag.map((s, i) => (i === 0 ? tool("can", from, two) : s)) }, newSmithy(), 0, 0.999999));
      expect(d.level).toBe(from - 1);
      expect(d.level).toBeGreaterThanOrEqual(FORGE.floor);
      expect(d.purse.bag[0]?.item).toBe("can");
    }
  });
  it("is refused of what is no tool that is forged, at the top, and for want of ore, timber or coins: and then nothing is spent", () => {
    const things: Array<[ItemId, number]> = [["shardCopper", 5], ["timber", 2]];
    expect(forgeTry(purseWith(100, things, [{ item: "minnow", n: 1 }]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "tool" });
    expect(forgeTry(purseWith(100, things, [{ item: "hoeIron", n: 1 }]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "tool" });
    expect(forgeTry(purseWith(100, things), newSmithy(), 5, 0)).toEqual({ ok: false, why: "tool" });
    expect(forgeTry(purseWith(100_000, [["oreSilver", 20], ["timber", 50]], [tool("pick", 10, ["pkPeek", "pkCrumb", "pkQuake"])]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "top" });
    expect(forgeTry(purseWith(100, [["shardCopper", 4], ["timber", 2]], [tool("pick")]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "ore" });
    expect(forgeTry(purseWith(100, [["shardCopper", 5], ["timber", 1]], [tool("pick")]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "timber" });
    expect(forgeTry(purseWith(9, things, [tool("pick")]), newSmithy(), 0, 0)).toEqual({ ok: false, why: "coins" });
    expect(tryLacks(purseWith(9, [["shardCopper", 4]], [tool("pick")]), 0)).toEqual(["ore", "timber", "coins"]);
    expect(tryLacks(purseWith(100, things, [tool("pick")]), 0)).toEqual([]);
  });
  it("a tool as it was bought, forged once, carries a plus and is no plain thing any more", () => {
    const d = ok(forgeTry(purseWith(100, [["shardCopper", 5], ["timber", 2]], [tool("pick")]), newSmithy(), 0, 0));
    expect(d.purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 1 });
    expect(forged(d.purse.bag[0])).toBe(true);
    // what a can holds stays in it
    const can = ok(forgeTry(purseWith(100, [["shardCopper", 5], ["timber", 2]], [{ item: "can", n: 1, water: 5 }]), newSmithy(), 0, 0));
    expect(can.purse.bag[0]).toEqual({ item: "can", n: 1, water: 5, plus: 1 });
  });
});

describe("the options drawn at a milestone", () => {
  const rich = (t: Stack, more: Array<[ItemId, number]> = []) => purseWith(100_000, [["shardCopper", 99], ["shardIron", 99], ["oreIron", 20], ["oreSilver", 20], ["timber", 50], ...more], [t]);
  it("a tool that reaches +3 is owed a draw: two of its first pool are laid out, never the same twice, and one is chosen", () => {
    const d = ok(forgeTry(rich(tool("pick", 2)), newSmithy(), 0, 0));
    expect(d.level).toBe(3);
    expect(d.owed).toBe(0);
    expect(owedOf(d.purse.bag[0])).toBe(0);
    const laid = ok(draw(d.purse, newSmithy(), 0, 0, 0));
    expect(laid.fresh).toBe(true);
    expect(laid.pending).toEqual({ item: "pick", at: 0, offer: ["pkPeek", "pkCrumb"] });
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) {
      const offer = ok(draw(d.purse, newSmithy(), 0, i / 20, j / 20)).pending.offer;
      expect(offer.length).toBe(2);
      expect(offer[0]).not.toBe(offer[1]);
      for (const o of offer) expect(poolOf("pick", 1)).toContain(o);
    }
    const c = ok(choose(d.purse, laid.smithy, 0, "pkCrumb"));
    expect(c.opt).toBe("pkCrumb");
    expect(c.purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 3, opts: ["pkCrumb"] });
    expect(c.smithy.pending).toBeNull();
    expect(has(c.purse.bag[0], "pkCrumb")).toBe(true);
    expect(owedOf(c.purse.bag[0])).toBe(-1);
    // what was not laid out cannot be chosen, and nothing is chosen with no draw waiting
    expect(choose(d.purse, laid.smithy, 0, "pkSteady")).toEqual({ ok: false, why: "none" });
    expect(choose(d.purse, newSmithy(), 0, "pkPeek")).toEqual({ ok: false, why: "none" });
  });
  it("a draw that waits is the same draw when asked again, whatever chance is given; and the tool is not forged further before it is chosen", () => {
    const p = rich(tool("pick", 3));
    const first = ok(draw(p, newSmithy(), 0, 0, 0));
    const again = ok(draw(p, first.smithy, 0, 0.9, 0.9));
    expect(again.fresh).toBe(false);
    expect(again.pending).toEqual(first.pending);
    expect(forgeTry(p, first.smithy, 0, 0)).toEqual({ ok: false, why: "owed" });
    expect(forgeTry(p, newSmithy(), 0, 0)).toEqual({ ok: false, why: "owed" });
    // moved to another slot of the bag, it is still that draw
    const moved: Purse = { ...p, bag: [null, ...p.bag.slice(1, 5), p.bag[0], ...p.bag.slice(6)] };
    expect(pendingSlot(moved, first.pending)).toBe(5);
    expect(ok(draw(moved, first.smithy, 5, 0.9, 0.9)).pending).toEqual(first.pending);
    // and another tool is not drawn for while that one waits in the bag
    const two: Purse = { ...p, bag: [p.bag[0], tool("axe", 3), ...p.bag.slice(2)] };
    expect(draw(two, first.smithy, 1, 0, 0)).toEqual({ ok: false, why: "owed" });
    // (a draw whose tool has left the bag does not stand in another's way)
    const gone: Purse = { ...two, bag: [null, ...two.bag.slice(1)] };
    expect(ok(draw(gone, first.smithy, 1, 0, 0)).pending.item).toBe("axe");
  });
  it("+6 never offers the option had at +3; +10 draws from the second pool", () => {
    const at6 = rich(tool("pick", 6, ["pkPeek"]));
    expect(owedOf(at6.bag[0])).toBe(1);
    expect(candidates(at6.bag[0], 1)).toEqual(["pkCrumb", "pkSteady", "pkLoose", "pkFresh", "pkCutter"]);
    for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) expect(ok(draw(at6, newSmithy(), 0, i / 25, j / 25)).pending.offer).not.toContain("pkPeek");
    const at10 = rich(tool("pick", 10, ["pkPeek", "pkCrumb"]));
    expect(owedOf(at10.bag[0])).toBe(2);
    const laid = ok(draw(at10, newSmithy(), 0, 0.99, 0.99));
    for (const o of laid.pending.offer) expect(poolOf("pick", 2)).toContain(o);
    const c = ok(choose(at10, laid.smithy, 0, laid.pending.offer[0]));
    expect(drawnOf(c.purse.bag[0]).filter(Boolean).length).toBe(3);
  });
  it("an option stays the tool's and goes on working when the level falls under its milestone, and is never drawn again by a level regained", () => {
    const p = rich(tool("pick", 6, ["pkPeek", "pkSteady"]));
    const fell = ok(forgeTry(p, newSmithy(), 0, 0.999999));
    expect(fell.level).toBe(5);
    expect(modsOf(fell.purse.bag[0]).opts).toEqual(["pkPeek", "pkSteady"]);
    expect(modsOf(fell.purse.bag[0]).asleep).toEqual([]);
    expect(has(fell.purse.bag[0], "pkSteady")).toBe(true);
    expect(fell.owed).toBe(-1);
    const back = ok(forgeTry(fell.purse, newSmithy(), 0, 0));
    expect(back.level).toBe(6);
    expect(modsOf(back.purse.bag[0]).opts).toEqual(["pkPeek", "pkSteady"]);
    // back at +6 it is owed nothing: the option drawn there is still the tool's
    expect(back.owed).toBe(-1);
    expect(draw(back.purse, newSmithy(), 0, 0, 0)).toEqual({ ok: false, why: "none" });
  });
  it("is drawn again for a gem of any element and a hundred coins: two are laid out, and the old one may be kept", () => {
    const p = rich(tool("pick", 4, ["pkPeek"]), [["gemOnyx", 2]]);
    const d = ok(redraw(p, newSmithy(), 0, 0, "gemOnyx", 0, 0));
    expect(d.purse.coins).toBe(p.coins - 100);
    expect(held(d.purse.bag, "gemOnyx")).toBe(1);
    expect(d.pending).toEqual({ item: "pick", at: 0, offer: ["pkCrumb", "pkSteady"], old: "pkPeek" });
    // the old one is never one of the two
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) expect(ok(redraw(p, newSmithy(), 0, 0, "gemOnyx", i / 20, j / 20)).pending.offer).not.toContain("pkPeek");
    const kept = ok(choose(d.purse, d.smithy, 0, "pkPeek"));
    expect(kept.kept).toBe(true);
    expect(kept.purse.bag[0]).toEqual(p.bag[0]);
    const taken = ok(choose(d.purse, d.smithy, 0, "pkSteady"));
    expect(taken.kept).toBe(false);
    expect(taken.purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 4, opts: ["pkSteady"] });
    // refused: with no gem, too few coins, a milestone with nothing drawn, a draw that waits
    expect(redraw(rich(tool("pick", 4, ["pkPeek"])), newSmithy(), 0, 0, "gemOnyx", 0, 0)).toEqual({ ok: false, why: "gem" });
    expect(redraw(p, newSmithy(), 0, 0, "stone", 0, 0)).toEqual({ ok: false, why: "gem" });
    expect(redraw({ ...p, coins: 99 }, newSmithy(), 0, 0, "gemOnyx", 0, 0)).toEqual({ ok: false, why: "coins" });
    expect(redraw(p, newSmithy(), 0, 1, "gemOnyx", 0, 0)).toEqual({ ok: false, why: "none" });
    expect(redraw(d.purse, d.smithy, 0, 0, "gemOnyx", 0, 0)).toEqual({ ok: false, why: "owed" });
    // (an option whose level has fallen under its milestone is made again like any other, and the draw that waits is still that tool's)
    const fallen = rich(tool("pick", 5, ["pkPeek", "pkSteady"]), [["gemOnyx", 1]]), again = ok(redraw(fallen, newSmithy(), 0, 1, "gemOnyx", 0, 0));
    expect(again.pending.old).toBe("pkSteady");
    expect(pendingSlot(again.purse, again.pending)).toBe(0);
    expect(ok(choose(again.purse, again.smithy, 0, again.pending.offer[0])).purse.bag[0]?.opts).toEqual(["pkPeek", again.pending.offer[0]]);
  });
  it("only what is built is ever laid out: for every kind of tool, at every milestone", () => {
    for (const k of TOOL_KINDS) for (let at = 0; at < 3; at++) {
      const from = candidates(tool(k, 10), at);
      for (const o of from) expect(BUILT[k].opts).toContain(o);
      expect(from).toEqual(drawable(k, FORGE.pools[at]));
      // a tool with nothing to draw at a milestone is owed nothing there, and may be forged on
      if (!from.length) expect(owedOf(tool(k, FORGE.milestones[at]))).not.toBe(at);
    }
    expect(pickOffer([], 0, 0)).toEqual([]);
    expect(pickOffer(["pkPeek"] as OptionId[], 0.5, 0.5)).toEqual(["pkPeek"]);
  });
});

describe("a gem set in a tool", () => {
  const p = purseWith(200, [["gemRuby", 2], ["gemSapphire", 1], ["timber", 10]], [tool("pick", 2)]);
  it("takes a gem, a mount of five fine timber and fifty coins, and always takes: from +0, one socket", () => {
    expect(SMITH.gem).toEqual({ mount: "timber", mounts: 5, fee: 50 });
    const d = ok(setGem(p, 0, "gemRuby"));
    expect(d.element).toBe("fire");
    expect(d.over).toBeNull();
    expect(d.purse.coins).toBe(150);
    expect(held(d.purse.bag, "gemRuby")).toBe(1);
    expect(held(d.purse.bag, "timber")).toBe(5);
    expect(d.purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 2, gems: ["fire"] });
    const bare = ok(setGem(purseWith(50, [["gemRuby", 1], ["timber", 5]], [tool("axe")]), 0, "gemRuby"));
    expect(bare.purse.bag[0]).toEqual({ item: "axe", n: 1, gems: ["fire"] });
    expect(forged(bare.purse.bag[0])).toBe(true);
  });
  it("a new gem over an old one costs the same, and the old one is gone", () => {
    const a = ok(setGem(p, 0, "gemRuby")), b = ok(setGem(a.purse, 0, "gemSapphire"));
    expect(b.over).toBe("fire");
    expect(b.purse.coins).toBe(100);
    expect(gemsOf(b.purse.bag[0])).toEqual(["water"]);
    expect(held(b.purse.bag, "gemRuby")).toBe(1);
    expect(held(b.purse.bag, "timber")).toBe(0);
    // the same element again is refused: it would only be lost
    expect(setGem(a.purse, 0, "gemRuby")).toEqual({ ok: false, why: "same" });
  });
  it("is refused with no such gem, no mount, too few coins, of what is no tool, and of an element that does nothing for the tool yet", () => {
    expect(setGem(p, 0, "gemOnyx")).toEqual({ ok: false, why: "gem" });
    expect(setGem(p, 0, "stone")).toEqual({ ok: false, why: "gem" });
    // (too little of the mount is said as too little fine timber: one short, none, and copper ore is no mount any more)
    expect(setGem(purseWith(200, [["gemRuby", 1]], [tool("pick")]), 0, "gemRuby")).toEqual({ ok: false, why: "timber" });
    expect(setGem(purseWith(200, [["gemRuby", 1], ["timber", 4]], [tool("pick")]), 0, "gemRuby")).toEqual({ ok: false, why: "timber" });
    expect(setGem(purseWith(200, [["gemRuby", 1], ["oreCopper", 5]], [tool("pick")]), 0, "gemRuby")).toEqual({ ok: false, why: "timber" });
    expect(setGem({ ...p, coins: 49 }, 0, "gemRuby")).toEqual({ ok: false, why: "coins" });
    expect(setGem(purseWith(200, [["gemRuby", 1], ["timber", 5]], [{ item: "minnow", n: 1 }]), 0, "gemRuby")).toEqual({ ok: false, why: "tool" });
    for (const k of TOOL_KINDS) for (const e of ELEMENTS) {
      const d = setGem(purseWith(200, [[GEMS[e].gem, 1], ["timber", 5]], [tool(k)]), 0, GEMS[e].gem);
      expect(d.ok).toBe(BUILT[k].gems.includes(e));
      if (!d.ok) expect(d.why).toBe("unbuilt");
    }
  });
  it("keeps the tool's plus and options, and what a bag has to set", () => {
    const d = ok(setGem(purseWith(200, [["gemEmerald", 1], ["timber", 5]], [tool("pick", 6, ["pkPeek", "pkSteady"])]), 0, "gemEmerald"));
    expect(d.purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 6, opts: ["pkPeek", "pkSteady"], gems: ["wind"] });
    expect(levelOf(d.purse.bag[0])).toBe(6);
    expect(gemsIn(p.bag)).toEqual([{ element: "fire", gem: "gemRuby", n: 2 }, { element: "water", gem: "gemSapphire", n: 1 }]);
    expect(toolsIn(p.bag).map((t) => [t.slot, t.kind])).toEqual([[0, "pick"]]);
  });
});

describe("the smith's board", () => {
  it("writes down the first to forge each kind of tool to the top, and the first to find each option: only the first", () => {
    let b = newBoard();
    b = markTop(b, "pick", { id: "a", name: "Aqua" }, NOW);
    b = markTop(b, "pick", { id: "b", name: "Bo" }, NOW + 1);
    b = markTop(b, "rod", { id: "b", name: "Bo" }, NOW + 2);
    expect(b.tops).toEqual({ pick: { by: "a", name: "Aqua", at: NOW }, rod: { by: "b", name: "Bo", at: NOW + 2 } });
    b = markFound(b, "pkPeek", { id: "b", name: "Bo" }, NOW);
    b = markFound(b, "pkPeek", { id: "a", name: "Aqua" }, NOW + 1);
    expect(b.found).toEqual({ pkPeek: { by: "b", name: "Bo", at: NOW } });
  });
});

describe("a whole road, from a tool as it was bought to the top", () => {
  it("with the best of luck: ten tries, three draws, and the count of what it took", () => {
    let purse = purseWith(100_000, [["shardCopper", 99], ["shardIron", 99], ["oreIron", 20], ["oreSilver", 20], ["timber", 50]], [tool("pick")]);
    let s: Smithy = newSmithy();
    const before = { coins: purse.coins, timber: held(purse.bag, "timber") };
    for (let to = 1; to <= 10; to++) {
      const d = ok(forgeTry(purse, s, 0, 0));
      purse = d.purse;
      if (d.owed >= 0) {
        const laid = ok(draw(purse, s, 0, 0, 0));
        const c = ok(choose(purse, laid.smithy, 0, laid.pending.offer[0]));
        purse = c.purse; s = c.smithy;
      }
    }
    expect(purse.bag[0]).toEqual({ item: "pick", n: 1, plus: 10, opts: ["pkPeek", "pkCrumb", "pkQuake"] });
    expect(before.coins - purse.coins).toBe(TRIES.reduce((t, x) => t + x.fee, 0));
    expect(before.coins - purse.coins).toBe(3950);
    expect(before.timber - held(purse.bag, "timber")).toBe(40);
    expect(99 - held(purse.bag, "shardCopper")).toBe(25);
    expect(99 - held(purse.bag, "shardIron")).toBe(16);
    expect(20 - held(purse.bag, "oreIron")).toBe(3);
    expect(20 - held(purse.bag, "oreSilver")).toBe(14);
    expect(modsOf(purse.bag[0]).glow).toBe(2);
  });
});

describe("a maker's history (the owner, 2026-10-08)", () => {
  const stocked = (s: Stack): Purse => purseWith(100_000, [["shardCopper", 99], ["shardIron", 99], ["oreIron", 20], ["oreSilver", 20], ["timber", 50]], [s]);
  it("a try that takes a tool to a milestone writes who forged it there, and no other try does", () => {
    const to3 = ok(forgeTry(stocked(tool("pick", 2)), newSmithy(), 0, 0, "Aqua"));
    expect(to3.level).toBe(3);
    expect(makersOf(to3.purse.bag[0])).toEqual(["Aqua", null, null]);
    expect(to3.purse.bag[0]?.makers).toEqual(["Aqua"]);
    // (a level that is no milestone, a try that fails, and a try with no name: nothing written)
    expect(ok(forgeTry(stocked(tool("pick", 0)), newSmithy(), 0, 0, "Aqua")).purse.bag[0]?.makers).toBeUndefined();
    expect(ok(forgeTry(stocked(tool("pick", 5, ["pkPeek"])), newSmithy(), 0, 0.999999, "Aqua")).purse.bag[0]?.makers).toBeUndefined();
    expect(ok(forgeTry(stocked(tool("pick", 2)), newSmithy(), 0, 0)).purse.bag[0]?.makers).toBeUndefined();
  });
  it("the first to bring it there is its maker for good; another's hand writes the next milestone beside it", () => {
    const made: Stack = { ...tool("pick", 5, ["pkPeek"]), makers: ["Aqua"] };
    const to6 = ok(forgeTry(stocked(made), newSmithy(), 0, 0, "Nine"));
    expect(makersOf(to6.purse.bag[0])).toEqual(["Aqua", "Nine", null]);
    // (fallen under +6 and forged back by a third: the +6 mark stays the first maker's)
    const back = ok(forgeTry(stocked({ ...tool("pick", 5, ["pkPeek", "pkSteady"]), makers: ["Aqua", "Nine"] }), newSmithy(), 0, 0, "Third"));
    expect(makersOf(back.purse.bag[0])).toEqual(["Aqua", "Nine", null]);
    // (a tool that came with no mark at +3 keeps that place empty)
    expect(ok(forgeTry(stocked(tool("pick", 5, ["pkPeek"])), newSmithy(), 0, 0, "Nine")).purse.bag[0]?.makers).toEqual(["", "Nine"]);
  });
  it("stays on the tool through everything else done to it, and is read soundly", () => {
    const made: Stack = { ...tool("pick", 6, ["pkPeek", "pkSteady"]), makers: ["Aqua", "Nine"] };
    const p = purseWith(500, [["gemRuby", 1], ["timber", 5]], [made]);
    expect(ok(setGem(p, 0, "gemRuby")).purse.bag[0]?.makers).toEqual(["Aqua", "Nine"]);
    expect(forged(made)).toBe(true);
    expect(makerName("  A   long\nname that goes on and on and on  ")).toBe("A long name that goes on");
    expect(makerName(7)).toBe("");
    expect(makersOf({ item: "pick", n: 1, plus: 10, makers: ["", 3 as unknown as string, "  Z  ", "extra"] })).toEqual([null, null, "Z"]);
    expect(makersOf({ item: "worm", n: 1, makers: ["A"] })).toEqual([null, null, null]);
    expect(withMaker(made, 1, "Other")).toBe(made);
    expect(withMaker(made, 2, "")).toBe(made);
    expect(withMaker(made, 7, "Other")).toBe(made);
  });
});
