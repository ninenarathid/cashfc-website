import { describe, expect, it } from "vitest";
import { basketEat, basketOf, basketPut, basketTake, cook, feastEat, ladle, potMarks, serve, setDown, takeUp, type Pot } from "./cooking";
import { DISHES, DISH_IDS, ITEMS, MAKES, MAKE_IDS, type DishId, type ItemId } from "./items";
import { PREPARATION, prepare, type PrepRun } from "./preparation";
import { FOOD_PREPS, GRADES, buffFloorOf, restoresOf } from "./quality";
import { extractionMarks } from "./reward-actions";
import { kitchenAction } from "./reward-kitchen";
import { STAMINA, begun, chew, dayOf, helpingGives, sitDown } from "./stamina";
import { carriesGrade, newPurse, put, usedGrade, type Purse, type Stack } from "./trade";

// (piece 2.4 of the farm's Quality: a dish is as good as the worst graded thing that went into it, and gives so much more)
const NOW = Date.parse("2026-10-16T12:00:00+07:00"), MIN = 60_000;
type G = 0 | 1 | 2 | 3;
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
/** A purse whose bag holds these things, each at its grade (normal when none is said), in twenty slots. */
const purseOf = (...items: Array<[ItemId, number, G?]>): Purse => {
  const p = newPurse();
  return { ...p, stamina: { day: dayOf(NOW), left: 10 }, bag: items.reduce((bag, [id, n, g]) => put(bag, id, n, g ?? 0), Array<null>(20).fill(null) as Purse["bag"]) };
};
const potIn = (p: Purse): Stack => p.bag.find((s) => s?.item === "potFull")!;
const pans = (things: Array<[ItemId, number]>, crew: ItemId[], p: Purse) => done(cook(p, things, crew, 0, NOW));

describe("what carries a grade into the kitchen", () => {
  it("is produce, and the preparations made of it that go into a dish: the list is the recipes'", () => {
    const fromCrop = (id: ItemId, seen = new Set<ItemId>()): boolean => {
      if (ITEMS[id]?.kind === "crop") return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return !!MAKES[id]?.needs.some(([x]) => fromCrop(x, seen));
    };
    const feeds = (id: ItemId, seen = new Set<ItemId>()): boolean => {
      if (DISH_IDS.some((d) => DISHES[d].recipe?.needs.some(([x]) => x === id))) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return MAKE_IDS.some((m) => MAKES[m]!.needs.some(([x]) => x === id) && feeds(m, seen));
    };
    const derived = MAKE_IDS.filter((id) => ITEMS[id].kind !== "crop" && fromCrop(id) && feeds(id));
    expect([...FOOD_PREPS].sort()).toEqual([...derived].sort());
  });

  it("is never what the uncle sells, a fish, compost, a fertiliser, the cure or a cup", () => {
    expect(["tomato", "chili", "rowBean"].every((id) => carriesGrade(id as ItemId))).toBe(true);
    expect(["curryPaste", "brownedOnion", "thickBroth", "beanPaste"].every((id) => carriesGrade(id as ItemId))).toBe(true);
    for (const id of ["salt", "rice", "sugar", "minnow", "snakehead", "compost", "guardFert", "growFert", "pestCure", "gourdCup", "pickle", "fishStock", "fragrantOil"]) expect(carriesGrade(id as ItemId)).toBe(false);
  });

  it("is counted by the units that left the bag, lowest first, and is null when none of them carried one", () => {
    const before = purseOf(["tomato", 2, 2], ["tomato", 1], ["salt", 3]).bag;
    const after = purseOf(["tomato", 1, 2], ["salt", 1]).bag;
    expect(usedGrade(before, after, ["tomato", "salt"])).toBe(0);
    expect(usedGrade(before, purseOf(["tomato", 1], ["salt", 1]).bag, ["tomato", "salt"])).toBe(2);
    expect(usedGrade(before, purseOf(["tomato", 2, 2], ["tomato", 1]).bag, ["tomato", "salt"])).toBeNull();
  });
});

describe("a dish's grade", () => {
  it("is its lowest graded ingredient; the uncle's things and fish do not count", () => {
    const things: Array<[ItemId, number]> = [["kangkong", 3], ["chili", 1], ["garlic", 1]];
    const p = pans(things, ["pan"], purseOf(["kangkong", 3, 3], ["chili", 1, 2], ["garlic", 1, 3], ["pan", 1]));
    expect(potIn(p.purse)).toMatchObject({ item: "potFull", of: { dish: "stirKangkong" }, grade: 2 });
    // fish and salt carry none: a dish of them is normal, and a crop among them decides alone
    const fish = pans([["minnow", 3], ["salt", 1]], ["pan"], purseOf(["minnow", 3], ["salt", 1], ["pan", 1]));
    expect(potIn(fish.purse).grade).toBeUndefined();
    const yum = pans([["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]], ["pot"], purseOf(["snakehead", 1], ["tomato", 2, 3], ["chili", 2, 3], ["scallion", 1, 1], ["pot", 1]));
    expect(potIn(yum.purse).grade).toBe(1);
  });

  it("takes the lowest grade first, so a normal unit in the bag makes the dish normal", () => {
    const p = pans([["corn", 2]], ["grill"], purseOf(["corn", 5, 3], ["corn", 1], ["grill", 1]));
    expect(potIn(p.purse).grade).toBeUndefined();
    // what is left is the excellent corn, one taken from it
    expect(p.purse.bag.filter((s) => s?.item === "corn")).toEqual([{ item: "corn", n: 4, grade: 3 }]);
  });

  it("goes onto a preparation made at the yard, never onto compost or what feeds no dish", () => {
    const paste = pans([["chili", 3], ["garlic", 2], ["lemongrass", 1], ["galangal", 1]], ["mortar"], purseOf(["chili", 3, 2], ["garlic", 2, 3], ["lemongrass", 1, 2], ["galangal", 1, 2], ["mortar", 1]));
    expect(paste.purse.bag.find((s) => s?.item === "curryPaste")).toEqual({ item: "curryPaste", n: 2, grade: 2 });
    const cure = pans([["chili", 2], ["scallion", 2], ["salt", 1]], ["pot"], purseOf(["chili", 2, 3], ["scallion", 2, 3], ["salt", 1], ["pot", 1]));
    expect(cure.purse.bag.find((s) => s?.item === "pestCure")).toEqual({ item: "pestCure", n: 2 });
    // and a graded preparation counts in the dish made of it
    const curry = purseOf(["featherback", 1], ["curryPaste", 1, 1], ["coconutMilk", 1], ["eggplant", 2, 3], ["basil", 1, 3], ["mortar", 1]);
    const green = pans([["featherback", 1], ["curryPaste", 1], ["coconutMilk", 1], ["eggplant", 2], ["basil", 1]], ["mortar", "pot"], curry);
    // (a normal coconut milk is a normal preparation of produce: it counts, and the dish is normal)
    expect(potIn(green.purse).grade).toBeUndefined();
  });

  it("goes onto a preparation at the board, and a mistake's compost has none", () => {
    const tile = PREPARATION.stations[0] as [number, number];
    const run: PrepRun = { id: "r1", recipe: "brownedOnion", seed: 1, at: NOW - 3000, until: NOW + MIN, tile };
    const answers = { method: PREPARATION.methods.brownedOnion, heat: PREPARATION.heat.brownedOnion, finish: PREPARATION.finish.brownedOnion };
    const p = purseOf(["scallion", 2, 3], ["prepBoard", 1], ["pan", 1]);
    const ok = prepare(p, run, "r1", answers, tile, NOW);
    expect(ok.ok && ok.purse.bag.find((s) => s?.item === "brownedOnion")).toEqual({ item: "brownedOnion", n: 2, grade: 3 });
    const wrong = prepare(p, run, "r1", { ...answers, heat: (answers.heat + 1) % 3, finish: (answers.finish + 1) % 3 }, tile, NOW);
    expect(wrong.ok && wrong.purse.bag.find((s) => s?.item === "compost")).toEqual({ item: "compost", n: 1 });
  });
});

describe("the grade rides with the food", () => {
  const graded = (g: G): Purse => pans([["corn", 2]], ["grill"], purseOf(["corn", 2, g], ["grill", 1], ["bowl", 3])).purse;

  it("in the pot set down, on the feast table and taken up again", () => {
    const p = graded(2), slot = p.bag.findIndex((s) => s?.item === "potFull");
    const down = done(setDown(p, slot, "me", [3, 3], "pot1", { now: NOW, yard: true, tile: [9, 9] }));
    expect(down.pot).toMatchObject({ dish: "grilledCorn", feast: true, grade: 2 });
    const up = done(takeUp(down.purse, down.pot, "me"));
    expect(potIn(up.purse)).toMatchObject({ item: "potFull", of: { dish: "grilledCorn" }, grade: 2 });
    expect(potMarks({ grade: 3, warm: 0 })).toEqual({ grade: 3 });
    expect(potMarks({ grade: 0 as never })).toEqual({});
  });

  it("into a bowl ladled or served (its grade alone), and a bowl of another grade is a stack of its own", () => {
    const p = graded(3), slot = p.bag.findIndex((s) => s?.item === "potFull");
    const one = done(serve(p, slot));
    expect(one.purse.bag.find((s) => s?.item === "grilledCorn")).toEqual({ item: "grilledCorn", n: 1, grade: 3 });
    const pot: Pot = { id: "x", by: "you", dish: "grilledCorn", left: 2, at: [3, 3], warm: 1, grade: 1 };
    const two = done(ladle(one.purse, pot));
    expect(two.purse.bag.filter((s) => s?.item === "grilledCorn")).toEqual([{ item: "grilledCorn", n: 1, grade: 3 }, { item: "grilledCorn", n: 1, grade: 1 }]);
    expect(two.pot).toMatchObject({ left: 1, grade: 1 });
  });

  it("into the meal eaten at the feast table, and into a banquet's pots", () => {
    const pot: Pot = { id: "x", by: "you", dish: "tomYum", left: 2, at: [3, 3], feast: true, set: NOW, grade: 3 };
    const ate = done(feastEat(purseOf(), pot, true, NOW));
    expect(ate.purse.eating).toMatchObject({ dish: "tomYum", lent: true, grade: 3 });
    // the dragon pot's banquet keeps each pot's grade (lib/town/reward-kitchen)
    const foods = (["tomYum", "grilledCorn", "stirKangkong", "tomYum", "grilledCorn"] as DishId[]).map((dish, i) => ({ item: "potFull" as ItemId, n: 1, of: { dish, left: 1 }, ...(i % 2 ? { grade: 2 as const } : {}) }));
    const state = { kitchen: { id: "k", kind: "banquet" as const, seed: 7, at: [1, 1] as [number, number], began: NOW, until: NOW + 30 * MIN, stage: 2, attempts: 0, foods } };
    const banquetPurse: Purse = { ...purseOf(), professionRewards: state as never, gifts: { had: ["thingDragonPot"], charms: [] } };
    const marks = extractionMarks((7 + 2) >>> 0);
    const did = kitchenAction(banquetPurse, { action: "kitchenEnd", run: "k", marks, at: [1, 1] }, "id", NOW + 5000, 0, "me");
    expect(did.ok && "banquet" in did && did.banquet?.map((p) => p.grade ?? 0)).toEqual([0, 2, 0, 2, 0]);
  });

  it("in the basket: one entry a dish and grade, out again the lowest grade first; a pair from before is normal", () => {
    const p: Purse = { ...purseOf(["grilledCorn", 2, 2], ["grilledCorn", 1], ["grilledCorn", 1, 3]), gifts: { had: ["thingBasket"], charms: [] } };
    const a = done(basketPut(p, 0, 2)), b = done(basketPut(a.purse, 1, 1)), c = done(basketPut(b.purse, 2, 1));
    expect(c.purse.basket).toEqual([["grilledCorn", 2, 2], ["grilledCorn", 1], ["grilledCorn", 1, 3]]);
    const t = done(basketTake(c.purse, "grilledCorn", 2));
    expect(t.purse.basket).toEqual([["grilledCorn", 1, 2], ["grilledCorn", 1, 3]]);
    expect(t.purse.bag.filter((s) => s?.item === "grilledCorn")).toEqual([{ item: "grilledCorn", n: 1 }, { item: "grilledCorn", n: 1, grade: 2 }]);
    const e = done(basketEat(t.purse, "grilledCorn", true, NOW));
    expect(e.purse.eating).toMatchObject({ dish: "grilledCorn", grade: 2 });
    expect(e.purse.basket).toEqual([["grilledCorn", 1, 3]]);
    // what a purse keeps is made sound: a pair is normal, a third number only 1 to 3, one entry a dish and grade
    expect(basketOf({ basket: [["tomYum", 2], ["tomYum", 1, 0], ["tomYum", 3, 2], ["tomYum", 1, 2], ["tomYum", 4, 9], ["grilledCorn", 1, 1]] as never })).toEqual([["tomYum", 2], ["tomYum", 3, 2], ["grilledCorn", 1, 1]]);
  });

  it("in a helping sat down to out of the bag, and what is left of the stack keeps it", () => {
    const p = purseOf(["tomYum", 2, 1]);
    const sat = done(sitDown(p, 0, true, NOW));
    expect(sat.purse.bag[0]).toEqual({ item: "tomYum", n: 1, grade: 1 });
    expect(sat.purse.eating).toMatchObject({ dish: "tomYum", grade: 1 });
    // a normal one is as it always was: no grade anywhere
    const plain = done(sitDown(purseOf(["tomYum", 2]), 0, true, NOW));
    expect(plain.purse.bag[0]).toEqual({ item: "tomYum", n: 1 });
    expect(plain.purse.eating).toEqual({ dish: "tomYum", meal: 1, from: NOW, till: NOW, got: 0 });
  });
});

describe("eating a graded helping", () => {
  const at = (g: G, more: Partial<NonNullable<Purse["eating"]>> = {}, left = 0, purse: Partial<Purse> = {}): Purse =>
    ({ ...purseOf(), stamina: { day: dayOf(NOW), left }, ...purse, ...begun(purseOf(), "tomYum", NOW, g), eating: { ...begun(purseOf(), "tomYum", NOW, g).eating!, ...more } });
  const end = NOW + STAMINA.minutes * MIN;

  it("restores the dish's own stamina and +20% / +40% / +60% of it", () => {
    for (const g of [0, 1, 2, 3] as const) expect(chew(at(g), 0, end).purse.stamina.left).toBeCloseTo(DISHES.tomYum.stamina * (1 + GRADES[g].restores), 9);
    expect(GRADES.map((x) => x.restores)).toEqual([0, 0.2, 0.4, 0.6]);
    expect(restoresOf(undefined)).toBe(0);
  });

  it("then the scent and the company add as ever, and the gauge stops at its hundred", () => {
    const got = chew(at(2, { scent: 5 }), 2, end).purse.stamina.left;
    expect(got).toBeCloseTo((40 * 1.4 + 5) * 1.2, 9);
    expect(helpingGives("tomYum", 2, 2)).toBeCloseTo(40 * 1.4 * 1.2, 9);
    expect(helpingGives("tomYum", 0)).toBe(40);
    expect(chew(at(3, {}, 80), 0, end).purse.stamina.left).toBe(STAMINA.max);
    // counted as it is eaten: half the time, half of it
    expect(chew(at(3), 0, NOW + (STAMINA.minutes * MIN) / 2).purse.stamina.left).toBeCloseTo(40 * 1.6 / 2, 9);
  });

  it("an excellent one starts its own buff at the second level, one more on a buff one has; the flavour stays at the first", () => {
    const buff = DISHES.tomYum.buff!;
    expect(buffFloorOf(3)).toBe(2);
    expect([0, 1, 2].map((g) => buffFloorOf(g))).toEqual([0, 0, 0]);
    expect(chew(at(3), 0, end).purse.buffs).toEqual([{ id: buff, level: 2, until: end + 3 * 3_600_000 }]);
    expect(chew(at(2), 0, end).purse.buffs).toEqual([{ id: buff, level: 1, until: end + 3 * 3_600_000 }]);
    const had = { buffs: [{ id: buff, level: 2, until: end + 60 * MIN }] };
    expect(chew(at(3, {}, 0, had), 0, end).purse.buffs).toEqual([{ id: buff, level: 3, until: end + 60 * MIN }]);
    const top = { buffs: [{ id: buff, level: 4, until: end + 60 * MIN }] };
    expect(chew(at(3, {}, 0, top), 0, end).purse.buffs![0].level).toBe(4);
    const flavour = chew(at(3, { secondary: "green" }), 0, end).purse.buffs!;
    expect(flavour.find((b) => b.id === "green")?.level).toBe(1);
    // a sprinkled bowl's level, if higher, is kept
    expect(chew({ ...at(3), spiced: { from: NOW, level: 3 } }, 0, end).purse.buffs![0].level).toBe(3);
  });
});
