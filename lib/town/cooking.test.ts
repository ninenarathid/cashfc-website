import { describe, expect, it } from "vitest";
import {
  COOKING, ODD, RECIPE_IDS, cook, dishOf, easeOf, feastEat, feastEnds, goesIn, hasMade, helpings, isCookware, isFind, ladle, madeOf, mayLeave, mayTake, oddHelpings, potNow, potSays, reachOf, reaches, serve, setDown, stirsFor, takeUp, takes, tasteOf, tidied, tidy,
  type Pot,
} from "./cooking";
import atlas from "./icon-atlas.json";
import { WATER } from "./farm";
import { toldOf } from "./hints";
import { DISHES, DISH_IDS, ITEMS, MAKES, MAKE_IDS, SCROLLS, potIconOf, type DishId, type ItemId } from "./items";
import { BASIC, sourcesAt } from "./orders";
import { STAMINA, chew, getUp, mealOf, nextMealAt, staminaOf } from "./stamina";
import { GOODS, held, newPurse, put, type Purse } from "./trade";

const NOW = Date.parse("2026-10-03T12:00:00+07:00"), MIN = 60_000;
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
/** A purse with everything a thing takes, a clean pot, and whatever else. */
const ready = (id: ItemId, ...more: Array<[ItemId, number]>): Purse =>
  purseWith(...(id in DISHES ? DISHES[id as DishId].recipe!.needs : MAKES[id]!.needs), ["pot", 1], ...more);
const needsOf = (id: ItemId) => (id in DISHES ? DISHES[id as DishId].recipe!.needs : MAKES[id]!.needs);

describe("what things make", () => {
  it("is the dish whose recipe they are exactly, whatever order they are put in", () => {
    expect(madeOf([["minnow", 3], ["salt", 1]])).toBe("friedMinnow");
    expect(madeOf([["salt", 1], ["minnow", 2], ["minnow", 1]])).toBe("friedMinnow");
    expect(madeOf([["minnow", 3]])).toBeNull();
    expect(madeOf([["minnow", 3], ["salt", 2]])).toBeNull();
    expect(madeOf([["minnow", 4], ["salt", 2]])).toBe("fishSauce");
    expect(tidy([["salt", 1], ["minnow", 2], ["minnow", 1], ["rice", 0]])).toEqual([["minnow", 3], ["salt", 1]]);
  });

  it("is never two things: no two recipes take the same things", () => {
    const all = [...DISH_IDS.filter((id) => DISHES[id].recipe).map((id) => [id, DISHES[id].recipe!.needs] as const), ...MAKE_IDS.map((id) => [id, MAKES[id]!.needs] as const)];
    const seen = new Map<string, string>();
    for (const [id, needs] of all) {
      const key = JSON.stringify(tidy(needs));
      expect(seen.get(key)).toBeUndefined();
      seen.set(key, id);
      expect(madeOf(needs)).toBe(id);
      // what goes in is something that goes in, and no more kinds than can be put together
      for (const [n] of needs) expect(goesIn(n)).toBe(true);
      expect(tidy(needs).length).toBeLessThanOrEqual(COOKING.kinds);
    }
    expect(seen.size).toBe(all.length);
  });

  it("takes its cookware, each piece in a different cook's hand, and cooks enough", () => {
    const things = DISHES.crabCurry.recipe!.needs;
    expect(dishOf(things, ["mortar", "pot"])).toBe("crabCurry");
    expect(dishOf(things, ["pot", "mortar", null])).toBe("crabCurry");
    expect(dishOf(things, ["mortar"])).toBeNull();
    expect(dishOf(things, ["pot", "pot"])).toBeNull();
    // the big pot: one pot, three at it
    expect(dishOf(DISHES.shabu.recipe!.needs, ["pot", null, null])).toBe("shabu");
    expect(dishOf(DISHES.shabu.recipe!.needs, ["pot", null])).toBeNull();
    expect(takes("khantoke")).toEqual({ in: ["hotpot", "steamerBamboo", "wok", "mortar"], cooks: 4 });
    expect(takes("basket")).toEqual({ in: [], cooks: 1 });
    expect(isCookware("jar")).toBe(true);
    expect(isCookware("rod")).toBe(false);
    expect(isCookware(null)).toBe(false);
  });
});

describe("cooking", () => {
  it("makes a pot of the dish, with its helpings, and takes the things: the pot is the yard's, the cook brings none (the owner: \"ช่วยเอาเงื่อนไข หม้อเปล่าในการทำอาหารออกไปเลย\")", () => {
    const d = done(cook(ready("tomYum"), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW));
    expect(d.made).toBe("tomYum");
    expect(d.n).toBe(DISHES.tomYum.recipe!.serves);
    const pot = d.purse.bag.find((s) => s?.item === "potFull")!;
    expect(pot.of).toEqual({ dish: "tomYum", left: 4 });
    // (the pot in the cook's hand was what it was cooked in, and is still theirs)
    expect(held(d.purse.bag, "pot")).toBe(1);
    // cooked in a pan by somebody with no pot at all: the same
    const noPot = purseWith(...DISHES.friedMinnow.recipe!.needs, ["pan", 1]);
    expect(done(cook(noPot, DISHES.friedMinnow.recipe!.needs, ["pan"], 0, NOW)).purse.bag.find((s) => s?.item === "potFull")!.of).toEqual({ dish: "friedMinnow", left: 2 });
    // (the pot a dish comes in is the yard's, and goes with its last helping: no pot is ever made by cooking)
    expect(held(d.purse.bag, "pot") + held(noPot.bag, "pot")).toBe(1);
    for (const [id] of DISHES.tomYum.recipe!.needs) expect(held(d.purse.bag, id)).toBe(0);
    expect(staminaOf(d.purse, NOW)).toBe(100 - COOKING.cost);
  });

  it("cooks every dish there is, and makes everything else that is made", () => {
    for (const id of DISH_IDS) {
      const r = DISHES[id].recipe;
      if (!r) continue;
      const crew: Array<ItemId | null> = [...r.in, ...Array<null>(Math.max(0, r.cooks - r.in.length)).fill(null)];
      const d = done(cook(ready(id), r.needs, crew, 0, NOW));
      expect(d.made).toBe(id);
      expect(d.purse.bag.find((s) => s?.item === "potFull")!.of!.dish).toBe(id);
      expect(d.n).toBeGreaterThanOrEqual(r.serves);
    }
    for (const id of MAKE_IDS) {
      const m = MAKES[id]!, d = done(cook(ready(id), m.needs, m.in.length ? m.in : [null], 0, NOW));
      expect(d.made).toBe(id);
      expect(d.n).toBe(m.gives);
      expect(held(d.purse.bag, id)).toBe(m.gives);
      // (nothing that is made comes in a pot)
      expect(held(d.purse.bag, "potFull")).toBe(0);
    }
  });

  it("makes an odd dish of the wrong things, cooked by somebody who holds cookware: a pot of it, good for little (the owner: \"ถ้าเลือกผิดจะได้อาหารแปลกๆ มา กินได้ แต่ไม่ได้เพิ่ม stamina เยอะ และไม่มี buff\")", () => {
    const things: Array<[ItemId, number]> = [["minnow", 2], ["rice", 1]];
    const d = done(cook(purseWith(...things, ["pot", 1]), things, ["pot"], 0, NOW));
    expect(d.made).toBe(ODD);
    expect(isFind(d.made)).toBe(false);
    expect(d.n).toBe(1);
    expect(d.purse.bag.find((s) => s?.item === "potFull")!.of).toEqual({ dish: "oddDish", left: 1 });
    expect(held(d.purse.bag, "minnow")).toBe(0);
    expect(held(d.purse.bag, "compost")).toBe(0);
    expect(staminaOf(d.purse, NOW)).toBe(100 - COOKING.cost);
    // it can be eaten, gives less than anything else there is to eat, leaves nothing behind, and nobody buys it
    expect(DISHES.oddDish).toEqual({ stamina: 6 });
    // (of what is cooked or sold: a fish eaten as it comes up for its luck gives less still)
    expect(DISHES.oddDish.stamina).toBeLessThan(Math.min(...DISH_IDS.filter((id) => id !== ODD && id !== "rainbowFish").map((id) => DISHES[id].stamina)));
    expect(ITEMS.oddDish.kind).toBe("dish");
    expect(ITEMS.oddDish.pays).toBe(0);
    // a helping for every two things put in, never more than four; a stir missed is one fewer, never under half
    expect(oddHelpings([["minnow", 1]], 0)).toBe(1);
    expect(oddHelpings([["minnow", 3], ["salt", 2]], 0)).toBe(2);
    expect(oddHelpings([["minnow", 9], ["salt", 9]], 0)).toBe(COOKING.odd.most);
    expect(oddHelpings([["minnow", 9], ["salt", 9]], 1)).toBe(3);
    expect(oddHelpings([["minnow", 9], ["salt", 9]], 9)).toBe(2);
    // it needs no pot either, only a slot of the bag: with every slot still taken once the things are out, nothing is cooked and nothing lost
    expect(done(cook(purseWith(...things, ["pan", 1]), things, ["pan"], 0, NOW)).made).toBe(ODD);
    const full: Purse = { ...newPurse(), bag: [{ item: "pan", n: 1 }, { item: "minnow", n: 5 }, { item: "rice", n: 5 }, { item: "rod", n: 1 }, { item: "hoe", n: 1 }] };
    expect(cook(full, things, ["pan"], 0, NOW)).toEqual({ ok: false, why: "full" });
    expect(done(cook(full, [["minnow", 5], ["rice", 1]], ["pan"], 0, NOW)).made).toBe(ODD);
  });

  it("can be tasted: what the wrong things come to says how near they were to something (the owner: \"ยังต้องทำให้ ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้\")", () => {
    const needs = DISHES.tomYum.recipe!.needs;   // snakehead 1, tomato 2, chili 2, scallion 1: in a pot
    const without = (id: ItemId) => needs.filter(([n]) => n !== id);
    // everything right but the cookware, or the cooks
    expect(tasteOf(needs, ["pan"])).toEqual({ taste: "way", of: "tomYum", lacks: null });
    expect(tasteOf(DISHES.crabCurry.recipe!.needs, ["mortar"]).taste).toBe("way");
    // the right things, in the wrong amounts
    expect(tasteOf(needs.map(([id, n], i): [ItemId, number] => [id, i ? n : n + 1]), ["pot"])).toEqual({ taste: "amounts", of: "tomYum", lacks: null });
    // one thing short, one too many, one that is not the one
    expect(tasteOf(without("scallion"), ["pot"])).toEqual({ taste: "less", of: "tomYum", lacks: "scallion" });
    expect(tasteOf([...needs, ["rice", 1]], ["pot"])).toEqual({ taste: "more", of: "tomYum", lacks: null });
    expect(tasteOf([...without("scallion"), ["basil", 1]], ["pot"])).toEqual({ taste: "swap", of: "tomYum", lacks: "scallion" });
    // some of it right; nothing like anything
    expect(tasteOf([["snakehead", 1], ["tomato", 2], ["rice", 1], ["worm", 1]], ["pot"]).taste).toBe("some");
    expect(tasteOf([["worm", 1], ["boot", 1]], ["pot"])).toEqual({ taste: "far", of: null, lacks: null });
    // (one thing of a recipe of two is one thing short of it)
    expect(tasteOf([["compost", 2]], ["pot"])).toEqual({ taste: "less", of: "growFert", lacks: "minnow" });
    // the nearest thing is whatever it is, a dish or something else that is made
    expect(tasteOf([["hyacinth", 5]], [null])).toMatchObject({ taste: "amounts" });
    // cooking tells it: with the odd dish, and with nothing at all
    const odd = done(cook(purseWith(...without("scallion"), ["basil", 1], ["pot", 1]), [...without("scallion"), ["basil", 1]], ["pot"], 0, NOW));
    expect([odd.made, odd.taste]).toEqual([ODD, "swap"]);
    expect(done(cook(purseWith(["worm", 1], ["boot", 1]), [["worm", 1], ["boot", 1]], [null], 0, NOW)).taste).toBe("far");
    // and what is made right has no taste to tell
    expect(done(cook(ready("tomYum"), needs, ["pot"], 0, NOW)).taste).toBeUndefined();
    // every recipe is its own nearest
    for (const id of [...DISH_IDS.filter((d) => DISHES[d].recipe), ...MAKE_IDS] as ItemId[]) expect(tasteOf(needsOf(id), [null]).of).toBe(id);
  });

  it("counts a miss by a recipe's last thing alone, the one a found recipe does not name; and nothing else", () => {
    const needs = DISHES.tomYum.recipe!.needs, last = needs[needs.length - 1][0], rest = needs.slice(0, -1);
    expect(last).toBe("scallion");
    // the last thing guessed wrong, three times
    let purse = purseWith(["snakehead", 3], ["tomato", 6], ["chili", 6], ["basil", 1], ["garlic", 1], ["kangkong", 1], ["pot", 1]);
    for (const [n, guess] of (["basil", "garlic", "kangkong"] as ItemId[]).entries()) {
      // (each pot of the odd dish is thrown out, to make room for the next)
      purse = { ...purse, bag: purse.bag.map((s) => (s?.item === "potFull" ? null : s)) };
      const d = done(cook(purse, [...rest, [guess, 1]], ["pot"], 0, NOW));
      expect(d.made).toBe(ODD);
      expect(d.purse.tries).toEqual({ tomYum: n + 1 });
      purse = d.purse;
    }
    // left out altogether: a try too
    expect(done(cook(ready("tomYum"), rest, ["pot"], 0, NOW)).purse.tries).toEqual({ tomYum: 1 });
    // another thing wrong, the wrong amounts, the wrong cookware: none of them is a try at the last thing
    const other = needs.map(([id, n]): [ItemId, number] => (id === "tomato" ? ["basil", n] : [id, n]));
    expect(done(cook(purseWith(...other, ["pot", 1]), other, ["pot"], 0, NOW)).purse.tries).toBeUndefined();
    const off = needs.map(([id, n], i): [ItemId, number] => [id, i ? n : n + 1]);
    expect(done(cook(purseWith(...off, ["pot", 1]), off, ["pot"], 0, NOW)).purse.tries).toBeUndefined();
    expect(done(cook(ready("tomYum"), needs, ["pan"], 0, NOW)).purse.tries).toBeUndefined();
    expect(COOKING.clue).toBe(3);
  });

  it("wastes what makes nothing when it is put together with bare hands, and leaves a little compost", () => {
    const d = done(cook(purseWith(["minnow", 2], ["rice", 1], ["pot", 1]), [["minnow", 2], ["rice", 1]], [null], 0, NOW));
    expect(d.made).toBeNull();
    expect(isFind(d.made)).toBe(false);
    expect(held(d.purse.bag, "minnow")).toBe(0);
    expect(held(d.purse.bag, "compost")).toBe(1);
    expect(held(d.purse.bag, "potFull")).toBe(0);
  });

  it("says nothing of what was wrong: the wrong amounts, the wrong cookware and too few cooks are an odd dish like any other", () => {
    const things = DISHES.tomYum.recipe!.needs, me = ready("tomYum");
    // the right things in the wrong amounts
    const off = things.map(([id, n], i): [ItemId, number] => [id, i ? n : n + 1]);
    expect(done(cook(purseWith(...off, ["pot", 1]), off, ["pot"], 0, NOW)).made).toBe(ODD);
    // the wrong cookware in the hand; with none, the things are simply lost
    const wrong = done(cook(me, things, ["pan"], 0, NOW));
    expect(wrong.made).toBe(ODD);
    for (const [id] of things) expect(held(wrong.purse.bag, id)).toBe(0);
    expect(done(cook(me, things, [null], 0, NOW)).made).toBeNull();
    // a dish for two, alone; or both there, one with the wrong thing
    const two = ready("crabCurry");
    expect(done(cook(two, DISHES.crabCurry.recipe!.needs, ["mortar"], 0, NOW)).made).toBe(ODD);
    expect(done(cook(two, DISHES.crabCurry.recipe!.needs, ["mortar", "pan"], 0, NOW)).made).toBe(ODD);
    // and so is something else that is made, in the wrong cookware
    expect(done(cook(ready("fishSauce"), MAKES.fishSauce!.needs, ["pan"], 0, NOW)).made).toBe(ODD);
    // the right ones, as they should be, are a find
    expect(isFind(done(cook(me, things, ["pot"], 0, NOW)).made)).toBe(true);
    expect(isFind(done(cook(ready("fishSauce"), MAKES.fishSauce!.needs, ["pot"], 0, NOW)).made)).toBe(true);
  });

  it("tells somebody who has made the thing before what is missing, and wastes nothing", () => {
    const things = DISHES.tomYum.recipe!.needs, me: Purse = { ...ready("tomYum"), made: ["tomYum"] };
    expect(hasMade(me, "tomYum")).toBe(true);
    expect(hasMade(ready("tomYum"), "tomYum")).toBe(false);
    // the wrong cookware in the hand, or none
    expect(cook(me, things, ["pan"], 0, NOW)).toEqual({ ok: false, why: "tool" });
    expect(cook(me, things, [null], 0, NOW)).toEqual({ ok: false, why: "tool" });
    // a dish for two, alone; or both there, one with the wrong thing
    const two: Purse = { ...ready("crabCurry"), made: ["crabCurry"] };
    expect(cook(two, DISHES.crabCurry.recipe!.needs, ["mortar"], 0, NOW)).toEqual({ ok: false, why: "crew" });
    expect(cook(two, DISHES.crabCurry.recipe!.needs, ["mortar", "pan"], 0, NOW)).toEqual({ ok: false, why: "crew" });
    // (what they have not made, they are told nothing of)
    expect(done(cook({ ...ready("tomYum"), made: ["crabCurry"] }, things, ["pan"], 0, NOW)).made).toBe(ODD);
  });

  it("refuses, with nothing lost, what cannot be begun at all", () => {
    const things = DISHES.tomYum.recipe!.needs, me = ready("tomYum");
    // things that are not in the bag, tools, nothing at all, too many kinds
    expect(cook(newPurse(), things, ["pot"], 0, NOW)).toEqual({ ok: false, why: "none" });
    expect(cook(purseWith(["rod", 1], ["pot", 1]), [["rod", 1]], ["pot"], 0, NOW)).toEqual({ ok: false, why: "none" });
    expect(cook(me, [], ["pot"], 0, NOW)).toEqual({ ok: false, why: "amount" });
    const many = (["minnow", "barb", "tilapia", "perch", "catfish", "rice", "salt", "worm", "dough"] as ItemId[]).map((id): [ItemId, number] => [id, 1]);
    expect(cook(purseWith(...many, ["pot", 1]), many, ["pot"], 0, NOW)).toEqual({ ok: false, why: "amount" });
  });

  it("gives fewer helpings for every stir missed, never under half; more from better cookware, the big stove and a ladle", () => {
    expect(helpings("tomYum", ["pot"], 0)).toBe(4);
    expect(helpings("tomYum", ["pot"], 1)).toBe(3);
    expect(helpings("tomYum", ["pot"], 9)).toBe(2);
    expect(helpings("friedRice", ["wok"], 0)).toBe(Math.round(3 * 1.25));
    expect(helpings("jungleCurry", ["mortar", "potBrass"], 0)).toBe(9);
    const bag = purseWith(["stoveBig", 1], ["ladle", 1]).bag;
    expect(helpings("tomYum", ["pot"], 0, bag)).toBe(Math.round(4 * 1.25 + COOKING.ladle));
    // made things too: one fewer for a miss, never none
    const m = MAKES.charcoal!;
    expect(done(cook(ready("charcoal"), m.needs, m.in, 2, NOW)).n).toBe(m.gives - 2);
    expect(done(cook(ready("charcoal"), m.needs, m.in, 99, NOW)).n).toBe(1);
    // the stirring: a stir for every kind of thing and two more; easier with an apron
    expect(stirsFor(DISHES.tomYum.recipe!.needs)).toBe(COOKING.stirs + 4);
    expect(easeOf(purseWith(["apron", 1]).bag)).toBeGreaterThan(1);
    expect(easeOf(newPurse().bag)).toBe(1);
  });
});

describe("a pot of food", () => {
  const cooked = () => done(cook(ready("tomYum", ["bowl", 1]), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW)).purse;
  const slotOf = (p: Purse, id: ItemId) => p.bag.findIndex((s) => s?.item === id);

  it("is set down for others to ladle from, each into a bowl of their own, which goes with the helping", () => {
    const cookPurse = cooked(), down = done(setDown(cookPurse, slotOf(cookPurse, "potFull"), "me", [45, 47], "p1"));
    expect(down.pot).toEqual({ id: "p1", by: "me", dish: "tomYum", left: 4, at: [45, 47] });
    expect(slotOf(down.purse, "potFull")).toBe(-1);
    // no bowl, no helping
    expect(ladle(newPurse(), down.pot)).toEqual({ ok: false, why: "tool" });
    // the bowl leaves the bag with the helping in it (the owner: "ตอนตักใส่ถ้วย ถ้วยต้องหายไปด้วย")
    const guest = purseWith(["bowl", 2]), one = done(ladle(guest, down.pot));
    expect(held(one.purse.bag, "tomYum")).toBe(1);
    expect(held(one.purse.bag, "bowl")).toBe(1);
    expect(one.pot!.left).toBe(3);
    // so a helping takes a bowl each: one bowl, one helping at a time
    const two = done(ladle(one.purse, one.pot!));
    expect(held(two.purse.bag, "tomYum")).toBe(2);
    expect(held(two.purse.bag, "bowl")).toBe(0);
    expect(ladle(two.purse, two.pot!)).toEqual({ ok: false, why: "tool" });
    // a full bag is no bar: the helping sits where the bowl sat
    const full: Purse = { ...newPurse(), bag: [{ item: "bowl", n: 1 }, ...Array.from({ length: 4 }, () => ({ item: "boot" as ItemId, n: 5 }))] };
    const squeezed = done(ladle(full, down.pot));
    expect(squeezed.purse.bag[0]).toEqual({ item: "tomYum", n: 1 });
    expect(setDown(cookPurse, slotOf(cookPurse, "bowl"), "me", [1, 1], "p2")).toEqual({ ok: false, why: "none" });
  });

  it("is gone when its last helping is ladled out: there is no dirty pot (the owner: \"หม้อสกปรก ตัดออกเลย พอตักครบออกหายออกจากพื้นไปเลย\")", () => {
    let pot: Pot | null = { id: "p1", by: "me", dish: "tomYum", left: 3, at: [45, 47] }, purse: Purse = purseWith(["bowl", 3]);
    for (let i = 0; i < 2; i++) { const d: { purse: Purse; pot: Pot | null } = done(ladle(purse, pot as Pot)); pot = d.pot; purse = d.purse; }
    expect(pot).toEqual({ id: "p1", by: "me", dish: "tomYum", left: 1, at: [45, 47] });
    const last = done(ladle(purse, pot!));
    expect(last.pot).toBeNull();
    expect(held(last.purse.bag, "tomYum")).toBe(3);
    expect(held(last.purse.bag, "bowl")).toBe(0);
    // (an empty one, were there such a thing, gives nothing)
    expect(ladle(purseWith(["bowl", 1]), { id: "p1", by: "me", dish: "tomYum", left: 0, at: [45, 47] })).toEqual({ ok: false, why: "none" });
  });

  it("is taken up again by whoever set it down, and nobody else", () => {
    const pot: Pot = { id: "p1", by: "me", dish: "tomYum", left: 2, at: [45, 47] };
    expect(done(takeUp(newPurse(), pot, "me")).purse.bag[0]).toEqual({ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } });
    expect(mayTake(pot, "me")).toBe(true);
    expect(mayTake(pot, "you")).toBe(false);
    expect(takeUp(newPurse(), pot, "you")).toEqual({ ok: false, why: "none" });
    const full: Purse = { ...newPurse(), bag: newPurse().bag.map(() => ({ item: "boot" as ItemId, n: 1 })) };
    expect(takeUp(full, pot, "me")).toEqual({ ok: false, why: "full" });
    // one person leaves only so many standing on the ground, and more than that on the feast table
    expect(COOKING.pots).toBeGreaterThanOrEqual(1);
    expect(COOKING.feast.pots).toBeGreaterThan(COOKING.pots);
  });

  it("feeds its own cook too, a helping at a time, each into a bowl; its last helping out, the pot is gone", () => {
    let purse = done(cook(ready("tomYum", ["bowl", 4]), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW)).purse;
    for (let i = 0; i < 4; i++) {
      expect(held(purse.bag, "bowl")).toBe(4 - i);
      const d = done(serve(purse, slotOf(purse, "potFull")));
      expect(d.dish).toBe("tomYum");
      purse = d.purse;
    }
    expect(held(purse.bag, "tomYum")).toBe(4);
    expect(held(purse.bag, "bowl")).toBe(0);
    expect(slotOf(purse, "potFull")).toBe(-1);
    // with a bowl short, the pot keeps what is left
    const short = done(serve(cooked(), slotOf(cooked(), "potFull"))).purse;
    expect(short.bag[slotOf(short, "potFull")]).toEqual({ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } });
    expect(serve(short, slotOf(short, "potFull"))).toEqual({ ok: false, why: "tool" });
    const noBowl = done(cook(ready("tomYum"), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW)).purse;
    expect(serve(noBowl, slotOf(noBowl, "potFull"))).toEqual({ ok: false, why: "tool" });
  });

  it("gathers more round it on a rattan table", () => {
    const withTok = done(cook(ready("tomYum", ["tok", 1]), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW)).purse;
    const down = done(setDown(withTok, slotOf(withTok, "potFull"), "me", [45, 47], "p1"));
    expect(down.pot.tok).toBe(true);
    expect(reachOf(down.pot)).toBeGreaterThan(reachOf({ ...down.pot, tok: false }));
    expect(held(down.purse.bag, "tok")).toBe(1);
  });
});

describe("the things themselves", () => {
  it("are a pot of food, which nobody buys, a pot to cook in, and a bowl: one to a slot, but three bowls", () => {
    expect(ITEMS.potFull.pays).toBe(0);
    // (nothing makes a pot any more, so the uncle's relatives buy one again)
    expect(ITEMS.pot.pays).toBeGreaterThan(0);
    for (const id of ["potFull", "pot", "bowl"] as const) { expect(ITEMS[id].stack).toBe(id === "bowl" ? 3 : 1); expect(ITEMS[id].tier).toBe(1); }
    // there is no dirty pot, and nothing to wash one with
    for (const id of ["potDirty", "scrubber", "brush", "ash", "soap"]) expect(id in ITEMS).toBe(false);
  });

  it("have their pictures: a pot for every dish that is cooked (the owner: \"Gen ภาพสำหรับ อาหารแต่ละชนิดด้วย\"), and the rest the kitchen and the well show", () => {
    const icons = Object.keys(atlas.icons);
    for (const id of DISH_IDS) if (DISHES[id].recipe) expect(icons).toContain(potIconOf(id));
    // the odd dish too, in its bowl and in its pot; and the thing a recipe does not name
    for (const icon of ["oddDish", potIconOf(ODD), "mystery", "rosette"]) expect(icons).toContain(icon);
    expect(potIconOf("tomYum")).toBe("potTomYum");
    for (const name of ["potEmpty", "tok", "tub", "note", "handshake", "hand", ...Object.keys(WATER.buckets).map((b) => `${b}Full`)]) expect(icons).toContain(name);
  });
});

describe("the cure for pests (the owner, 2026-10-04: \"ช่วยเพิ่มสูตรทำยาฆ่าแมลงในร้านค้าให้ด้วย\")", () => {
  it("is made of what the first day's shelf grows, and its recipe is sold from the first day", () => {
    const m = MAKES.pestCure!, first = sourcesAt(0);
    expect(m.in).toEqual(["pot"]);
    // every thing of it, and the pot, can be had before any of the uncle's orders is filled: so can it
    for (const [id] of m.needs) expect(first.has(id)).toBe(true);
    expect(first.has("pot")).toBe(true);
    expect(first.get("pestCure")).toBe("kitchen");
    expect(BASIC).toContain("scrollPestCure");
    expect(SCROLLS.scrollPestCure).toBe("pestCure");
    // a scroll like the others he sells, and more of it: every plot wants the cure
    expect(GOODS.scrollPestCure!.price).toBe(GOODS.scrollFriedMinnow!.price);
    expect(GOODS.scrollPestCure!.stock).toBeGreaterThan(GOODS.scrollFriedMinnow!.stock);
    expect(ITEMS.scrollPestCure.pays).toBe(0);
  });

  it("is told by its scroll as any found recipe is: all but its last thing, a staple", () => {
    const told = toldOf("pestCure");
    expect(told.needs).toEqual([["chili", 2], ["scallion", 2]]);
    expect(told.last).toMatchObject({ kind: "staple", n: 1 });
    // (salt: a staple the uncle has had from the first, and nothing of what it looks like until it has been missed)
    expect(told.last!.from?.en).toBe("on the uncle's shelf from the first");
    expect(told.last!.looks).toBeUndefined();
    expect(told.in).toEqual(["pot"]);
    expect(told.gives).toBe(2);
    expect(ITEMS[MAKES.pestCure!.needs.at(-1)![0]].kind).toBe("staple");
  });

  it("comes of those things in a pot, two of it; a miss of the stirring is one fewer, never none", () => {
    const made = done(cook(ready("pestCure"), MAKES.pestCure!.needs, ["pot"], 0, NOW));
    expect(made.made).toBe("pestCure");
    expect(made.n).toBe(2);
    expect(held(made.purse.bag, "pestCure")).toBe(2);
    expect(done(cook(ready("pestCure"), MAKES.pestCure!.needs, ["pot"], 5, NOW)).n).toBe(1);
    // the wrong staple is an odd dish, and tastes of being one thing off
    const wrong = done(cook(purseWith(["chili", 2], ["scallion", 2], ["rice", 1], ["pot", 1]), [["chili", 2], ["scallion", 2], ["rice", 1]], ["pot"], 0, NOW));
    expect(wrong.made).toBe(ODD);
    expect(wrong.taste).toBe("swap");
  });
});

describe("what the pot says to whoever wears the enchanted apron (the owner, 2026-10-07: a first charm nearly OP, as the forest's lamp is)", () => {
  it("an empty pot is on its way to anything, and is nothing whole", () => {
    expect(potSays([])).toEqual({ fits: true, whole: false, wrong: [] });
    expect(potSays([["rice", 0]])).toEqual({ fits: true, whole: false, wrong: [] });
  });

  it("every recipe, put in a thing at a time in any order, fits at every step and is whole only at the last", () => {
    for (const id of RECIPE_IDS) {
      const needs = needsOf(id), units = needs.flatMap(([k, n]) => Array.from({ length: n }, () => k));
      for (const order of [units, [...units].reverse()]) {
        const pot: Array<[ItemId, number]> = [];
        order.forEach((k, i) => {
          pot.push([k, 1]);
          const said = potSays(pot);
          expect(said.fits, `${id} after ${i + 1}`).toBe(true);
          expect(said.wrong).toEqual([]);
          // (whole before the last thing only where what is in is another recipe by itself)
          if (i === order.length - 1) expect(said.whole, id).toBe(true);
          else expect(said.whole).toBe(madeOf(pot) !== null);
        });
      }
    }
  });

  it("one thing too many, and one thing that is in no recipe with the rest, are named; the rest are not", () => {
    for (const id of RECIPE_IDS.slice(0, 40)) {
      const needs = needsOf(id);
      // one more of its first thing than any recipe with these things takes
      const [k, n] = needs[0], most = Math.max(...RECIPE_IDS.filter((r) => needs.every(([j, m]) => (new Map(needsOf(r)).get(j) ?? 0) >= m)).map((r) => new Map(needsOf(r)).get(k) ?? 0));
      const over = potSays([...needs.slice(1), [k, most + 1]]);
      expect(over.fits, id).toBe(false);
      expect(over.whole).toBe(false);
      expect(over.wrong, id).toContain(k);
      void n;
    }
    // a thing nothing is cooked with: it is the one in the way, whatever else is in
    const never = (Object.keys(ITEMS) as ItemId[]).filter(goesIn).find((x) => !RECIPE_IDS.some((r) => needsOf(r).some(([j]) => j === x)));
    expect(never).toBeDefined();
    const needs = needsOf(RECIPE_IDS[0]);
    expect(potSays([...needs, [never!, 1]])).toEqual({ fits: false, whole: false, wrong: [never!] });
    expect(potSays([[never!, 2]])).toEqual({ fits: false, whole: false, wrong: [never!] });
  });

  it("two things that each go with a third and never with each other: both are in the way, since either out would mend it", () => {
    // found from the recipes themselves: a, b, c with {a, c} and {b, c} each within some recipe and {a, b, c} within none
    const within = (some: ItemId[]) => RECIPE_IDS.some((r) => some.every((x) => needsOf(r).some(([j]) => j === x)));
    const things = [...new Set(RECIPE_IDS.flatMap((r) => needsOf(r).map(([j]) => j)))];
    let found: [ItemId, ItemId, ItemId] | null = null;
    for (const c of things) { for (const a of things) { for (const b of things) {
      if (a < b && a !== c && b !== c && within([a, c]) && within([b, c]) && !within([a, b, c]) && !within([a, b])) { found = [a, b, c]; break; }
    } if (found) break; } if (found) break; }
    expect(found).not.toBeNull();
    const [a, b, c] = found!, said = potSays([[a, 1], [b, 1], [c, 1]]);
    expect(said.fits).toBe(false);
    expect([...said.wrong].sort()).toEqual([a, b].sort());
    expect(said.wrong).not.toContain(c);
  });

  it("says nothing of whose recipe, what is still to go in or what it is cooked in: three answers and the things in the way", () => {
    const said = potSays(needsOf(RECIPE_IDS[0]));
    expect(Object.keys(said).sort()).toEqual(["fits", "whole", "wrong"]);
    expect(said).toEqual({ fits: true, whole: true, wrong: [] });
  });
});

describe("bowls, three to a slot (the owner, 2026-10-08: \"ช่วยแก้ให้ถ้วย stack ได้ด้วย ซัก 3 ใบ\")", () => {
  const pot: Pot = { id: "p1", by: "me", dish: "tomYum", left: 9, at: [45, 47] };
  it("sit three to a slot, and a fourth takes another", () => {
    expect(ITEMS.bowl.stack).toBe(3);
    expect(put(newPurse().bag, "bowl", 3).filter(Boolean)).toEqual([{ item: "bowl", n: 3 }]);
    expect(put(newPurse().bag, "bowl", 4).filter(Boolean)).toEqual([{ item: "bowl", n: 3 }, { item: "bowl", n: 1 }]);
  });

  it("leave a helping each, the slot of bowls a bowl the less and the helpings together in another", () => {
    let purse: Purse = { ...newPurse(), bag: put(newPurse().bag, "bowl", 3) }, from: Pot | null = pot;
    for (let i = 0; i < 3; i++) { const d: { purse: Purse; pot: Pot | null } = done(ladle(purse, from!)); purse = d.purse; from = d.pot; }
    expect(purse.bag.filter(Boolean)).toEqual([{ item: "tomYum", n: 3 }]);
    expect(from!.left).toBe(6);
    expect(ladle(purse, from!)).toEqual({ ok: false, why: "tool" });
  });

  it("with no slot to spare and more than one bowl in theirs, a helping has nowhere to go: full (the last bowl of a slot gives the helping its place, as one bowl always did)", () => {
    const boots = (n: number) => Array.from({ length: n }, () => ({ item: "boot" as ItemId, n: 5 }));
    const crowded: Purse = { ...newPurse(), bag: [{ item: "bowl", n: 2 }, ...boots(newPurse().bag.length - 1)] };
    expect(ladle(crowded, pot)).toEqual({ ok: false, why: "full" });
    const last: Purse = { ...newPurse(), bag: [{ item: "bowl", n: 1 }, ...boots(newPurse().bag.length - 1)] };
    expect(done(ladle(last, pot)).purse.bag[0]).toEqual({ item: "tomYum", n: 1 });
    // (and with a helping of that dish in the bag already, the next sits with it)
    const begun: Purse = { ...newPurse(), bag: [{ item: "bowl", n: 2 }, { item: "tomYum", n: 1 }, ...boots(newPurse().bag.length - 2)] };
    expect(done(ladle(begun, pot)).purse.bag.slice(0, 2)).toEqual([{ item: "bowl", n: 1 }, { item: "tomYum", n: 2 }]);
  });
});

describe("the feast table (the owner, 2026-10-07: pots stood all over the town for good)", () => {
  const HOUR = 60 * MIN, TILE: [number, number] = [48, 47], GROUND = COOKING.feast.ground * MIN;
  const pot = (more: Partial<Pot> = {}): Pot => ({ id: "p1", by: "me", dish: "tomYum", left: 4, at: [20, 20], set: NOW, ...more });
  const purseOf = () => done(cook(ready("tomYum", ["bowl", 1]), DISHES.tomYum.recipe!.needs, ["pot"], 0, NOW)).purse;
  const slotOf = (p: Purse) => p.bag.findIndex((b) => b?.item === "potFull");

  it("clears what came to it when the meal's hours after the ones it came in are over", () => {
    // noon is lunch's hours (11 to 17): dinner's are the next, and end at five the next morning
    expect(mealOf(NOW)).toBe(1);
    expect(feastEnds(NOW)).toBe(Date.parse("2026-10-04T05:00:00+07:00"));
    // late at night is still dinner's hours: breakfast's are the next, and end at eleven
    expect(feastEnds(Date.parse("2026-10-04T02:00:00+07:00"))).toBe(Date.parse("2026-10-04T11:00:00+07:00"));
    expect(feastEnds(Date.parse("2026-10-04T06:00:00+07:00"))).toBe(Date.parse("2026-10-04T17:00:00+07:00"));
    // never sooner than a whole meal's hours, never later than two
    for (let h = 0; h < 48; h++) {
      const at = NOW + h * HOUR + 7 * MIN, left = feastEnds(at) - at;
      expect(feastEnds(at)).toBe(nextMealAt(nextMealAt(at)));
      expect(left).toBeGreaterThan(6 * HOUR - 8 * MIN);
      expect(left).toBeLessThanOrEqual(18 * HOUR);
    }
  });

  it("has a pot set down on the ground stand there an hour, then on the table, then nowhere", () => {
    const p = pot();
    expect(potNow(p, NOW)).toEqual({ feast: false, from: NOW, until: NOW + GROUND });
    expect(potNow(p, NOW + GROUND - 1)).toEqual({ feast: false, from: NOW, until: NOW + GROUND });
    // as its hour ends it is on the table, as if set there then
    const onTable = { feast: true, from: NOW + GROUND, until: feastEnds(NOW + GROUND) };
    expect(potNow(p, NOW + GROUND)).toEqual(onTable);
    expect(potNow(p, onTable.until - 1)).toEqual(onTable);
    expect(potNow(p, onTable.until)).toBeNull();
    // one set on the table is there from the first
    const f = pot({ feast: true });
    expect(potNow(f, NOW)).toEqual({ feast: true, from: NOW, until: feastEnds(NOW) });
    expect(potNow(f, feastEnds(NOW))).toBeNull();
    // whoever keeps the game says how long the hour is
    expect(potNow(p, NOW + 10 * MIN, 5)).toEqual({ feast: true, from: NOW + 5 * MIN, until: feastEnds(NOW + 5 * MIN) });
  });

  it("never takes the odd dish: it is gone with its hour on the ground (the owner: \"คนชอบทิ้ง อาหารแปลกๆ ที่ได้จากการใช้สูตรผิด\")", () => {
    const odd = pot({ dish: ODD });
    expect(potNow(odd, NOW + GROUND - 1)?.feast).toBe(false);
    expect(potNow(odd, NOW + GROUND)).toBeNull();
  });

  it("leaves a pot told by a keeper from before the table where it was set, for good", () => {
    const old: Pot = { id: "p0", by: "me", dish: "tomYum", left: 2, at: [5, 5] };
    expect(potNow(old, NOW + 400 * HOUR)).toEqual({ feast: false, from: 0, until: Infinity });
    expect(tidied([old], NOW + 400 * HOUR, TILE)).toEqual({ pots: [old], gone: [] });
  });

  it("tidies the pots that stand about: the hour's end takes one to the table's tile and off its rattan table, the table's end takes it away", () => {
    const a = pot({ id: "a", tok: true }), b = pot({ id: "b", dish: ODD }), c = pot({ id: "c", feast: true, at: TILE }), d = pot({ id: "d", set: NOW + 30 * MIN });
    expect(tidied([a, b, c, d], NOW + 10 * MIN, TILE)).toEqual({ pots: [a, b, c, d], gone: [] });
    const later = tidied([a, b, c, d], NOW + GROUND, TILE);
    expect(later.gone).toEqual([b]);
    expect(later.pots).toEqual([{ id: "a", by: "me", dish: "tomYum", left: 4, at: TILE, feast: true, set: NOW + GROUND }, c, d]);
    // tidied again a moment on, it is as it was: the moment it came to the table is kept
    expect(tidied(later.pots, NOW + GROUND + MIN, TILE).pots).toEqual(later.pots);
    // and when the table is cleared, everything that was on it is gone
    const end = tidied(later.pots, feastEnds(NOW + GROUND + 30 * MIN), TILE);
    expect(end.pots).toEqual([]);
    expect(end.gone.map((o) => o.id)).toEqual(["a", "c", "d"]);
  });

  it("takes a dish set down in the cooking yard at once, and leaves anything else on the ground", () => {
    const p = purseOf(), slot = slotOf(p);
    // in the yard: on the table, said to stand on the table's tile, on no rattan table
    const inYard = done(setDown({ ...p, bag: put(p.bag, "tok", 1) }, slot, "me", [47, 49], "p1", { now: NOW, yard: true, tile: TILE }));
    expect(inYard.pot).toEqual({ id: "p1", by: "me", dish: "tomYum", left: 4, at: TILE, feast: true, set: NOW });
    // anywhere else: on the ground where it was set, with the moment
    expect(done(setDown(p, slot, "me", [20, 20], "p2", { now: NOW, yard: false, tile: TILE })).pot).toEqual({ id: "p2", by: "me", dish: "tomYum", left: 4, at: [20, 20], set: NOW });
    // the odd dish stays on the ground even in the yard
    const odd: Purse = { ...p, bag: p.bag.map((b, i) => (i === slot ? { item: "potFull" as ItemId, n: 1, of: { dish: ODD, left: 2 } } : b)) };
    expect(done(setDown(odd, slot, "me", [47, 49], "p3", { now: NOW, yard: true, tile: TILE })).pot).toEqual({ id: "p3", by: "me", dish: ODD, left: 2, at: [47, 49], set: NOW });
    // (a keeper from before says nothing of a table: the pot as it always was)
    expect(done(setDown(p, slot, "me", [47, 49], "p4")).pot).toEqual({ id: "p4", by: "me", dish: "tomYum", left: 4, at: [47, 49] });
  });

  it("lets one person leave two on the ground and six on the table, each counted by itself", () => {
    const ground = (n: number, by = "me") => Array.from({ length: n }, (_, i) => pot({ id: `g${by}${i}`, by }));
    const table = (n: number, by = "me") => Array.from({ length: n }, (_, i) => pot({ id: `t${by}${i}`, by, feast: true }));
    expect([COOKING.pots, COOKING.feast.pots, COOKING.feast.ground]).toEqual([2, 6, 60]);
    expect(mayLeave(ground(1), "me", false)).toBe(true);
    expect(mayLeave(ground(2), "me", false)).toBe(false);
    expect(mayLeave([...ground(2), ...table(5)], "me", true)).toBe(true);
    expect(mayLeave(table(6), "me", true)).toBe(false);
    expect(mayLeave(table(6), "me", false)).toBe(true);
    // other people's are no count of mine
    expect(mayLeave([...ground(2, "you"), ...table(6, "you")], "me", false)).toBe(true);
    expect(mayLeave([...ground(2, "you"), ...table(6, "you")], "me", true)).toBe(true);
  });

  it("is reached from anywhere on the yard's floor, and a pot on the ground from beside it", () => {
    const f = pot({ feast: true, at: TILE }), g = pot(), t = pot({ tok: true });
    expect(reaches(f, [10, 10], true)).toBe(true);
    expect(reaches(f, TILE, false)).toBe(false);
    expect(reaches(g, [21, 21], false)).toBe(true);
    expect(reaches(g, [22, 21], true)).toBe(false);
    expect(reaches(t, [22, 21], false)).toBe(true);
    expect(reachOf(t)).toBeGreaterThan(reachOf(g));
  });

  it("feeds somebody sitting down out of its own bowl: a helping begun at once, nothing in the bag, and no bowl back", () => {
    const f = pot({ feast: true, at: TILE, left: 2 }), empty = newPurse();
    const one = done(feastEat(empty, f, true, NOW));
    expect(one.dish).toBe("tomYum");
    expect(one.pot).toEqual({ ...f, left: 1 });
    expect(one.purse.bag).toEqual(empty.bag);
    expect(one.purse.eating).toEqual({ dish: "tomYum", meal: 1, from: NOW, till: NOW, got: 0, lent: true });
    expect(one.purse.meals.bowls).toEqual([0, 1, 0]);
    // its last helping out, the pot is gone
    expect(done(feastEat(empty, { ...f, left: 1 }, true, NOW)).pot).toBeNull();
    // eaten up, it gives its stamina and its buff as any helping does, and no bowl
    const tired: Purse = { ...one.purse, stamina: { day: one.purse.meals.day, left: 10 } };
    const ate = chew(tired, 0, NOW + STAMINA.minutes * MIN);
    expect(ate.done).toBe(true);
    expect(staminaOf(ate.purse, NOW + STAMINA.minutes * MIN)).toBe(Math.min(STAMINA.max, 10 + DISHES.tomYum.stamina));
    expect(held(ate.purse.bag, "bowl")).toBe(0);
    expect(ate.purse.owed).toBeUndefined();
    // left half eaten, no bowl either
    const up = getUp(tired, 0, NOW + 2 * MIN);
    expect(up.eating).toBeNull();
    expect(held(up.bag, "bowl")).toBe(0);
    expect(up.owed).toBeUndefined();
    // (the same helping out of a bowl of one's own gives its bowl back, eaten up or left)
    const own: Purse = { ...tired, eating: { ...tired.eating!, lent: undefined } };
    expect(held(chew(own, 0, NOW + STAMINA.minutes * MIN).purse.bag, "bowl")).toBe(1);
    expect(held(getUp(own, 0, NOW + 2 * MIN).bag, "bowl")).toBe(1);
  });

  it("feeds nobody standing, nobody at a meal, nobody who has had this meal's helpings, and from no pot on the ground", () => {
    const f = pot({ feast: true, at: TILE });
    expect(feastEat(newPurse(), f, false, NOW)).toEqual({ ok: false, why: "stand" });
    expect(feastEat(newPurse(), pot(), true, NOW)).toEqual({ ok: false, why: "none" });
    expect(feastEat(newPurse(), { ...f, left: 0 }, true, NOW)).toEqual({ ok: false, why: "none" });
    const eating = done(feastEat(newPurse(), f, true, NOW)).purse;
    expect(feastEat(eating, f, true, NOW + MIN)).toEqual({ ok: false, why: "meal" });
    // three helpings in a meal's hours, the table's among them
    let p = newPurse();
    for (let i = 0; i < STAMINA.bowls; i++) p = chew(done(feastEat(p, f, true, NOW + i * 6 * MIN)).purse, 0, NOW + i * 6 * MIN + STAMINA.minutes * MIN).purse;
    expect(feastEat(p, f, true, NOW + 30 * MIN)).toEqual({ ok: false, why: "meal" });
    // (a keeper that still counts a meal once)
    expect(feastEat(chew(done(feastEat(newPurse(), f, true, NOW)).purse, 0, NOW + 6 * MIN).purse, f, true, NOW + 7 * MIN, 1)).toEqual({ ok: false, why: "meal" });
  });
});
