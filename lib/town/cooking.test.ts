import { describe, expect, it } from "vitest";
import {
  COOKING, ODD, cook, dishOf, easeOf, goesIn, hasMade, helpings, isCookware, isFind, ladle, madeOf, mayTake, oddHelpings, reachOf, serve, setDown, stirsFor, takeUp, takes, tasteOf, tidy,
  type Pot,
} from "./cooking";
import atlas from "./icon-atlas.json";
import { WATER } from "./farm";
import { DISHES, DISH_IDS, ITEMS, MAKES, MAKE_IDS, potIconOf, type DishId, type ItemId } from "./items";
import { staminaOf } from "./stamina";
import { held, newPurse, put, type Purse } from "./trade";

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
    expect(DISHES.oddDish.stamina).toBeLessThan(Math.min(...DISH_IDS.filter((id) => id !== ODD).map((id) => DISHES[id].stamina)));
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
    // one person leaves only so many standing about
    expect(COOKING.pots).toBeGreaterThanOrEqual(3);
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
  it("are a pot of food, which nobody buys, a pot to cook in, and a bowl: one to a slot", () => {
    expect(ITEMS.potFull.pays).toBe(0);
    // (nothing makes a pot any more, so the uncle's relatives buy one again)
    expect(ITEMS.pot.pays).toBeGreaterThan(0);
    for (const id of ["potFull", "pot", "bowl"] as const) { expect(ITEMS[id].stack).toBe(1); expect(ITEMS[id].tier).toBe(1); }
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
