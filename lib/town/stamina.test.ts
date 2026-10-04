import { describe, expect, it } from "vitest";
import { BUFFS, BUFF_HOURS, CROPS, CROP_IDS, DISHES, DISH_IDS, ITEMS, ITEM_IDS, SCROLLS, STAGES, STAGE_AT, growth, iconOf, isDish, type DishId, type ItemId } from "./items";
import { STAMINA, bowlsBack, buffOf, chew, costOf, dayOf, eatenToday, getUp, mealOf, mealProgress, nextMealAt, readScroll, settle, sitDown, spend, staminaOf } from "./stamina";
import { GOODS, held, newPurse, put, type Purse } from "./trade";
import atlas from "./icon-atlas.json";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-03T12:00:00"), MIN = 60_000;
const withFood = (item: ItemId, n = 1): Purse => ({ ...newPurse(), bag: put(newPurse().bag, item, n) });

describe("everything there is", () => {
  it("has a name in both languages and a picture of its own", () => {
    for (const id of ITEM_IDS) {
      const it = ITEMS[id];
      for (const l of [it.name, it.about]) { expect(l.th.trim()).not.toBe(""); expect(l.en.trim()).not.toBe(""); expect(/[฀-๿]/.test(l.en)).toBe(false); }
      expect(it.stack).toBeGreaterThanOrEqual(1);
      expect(it.pays).toBeGreaterThanOrEqual(0);
      expect(Object.keys(atlas.icons)).toContain(iconOf(id));
    }
    for (const b of Object.values(BUFFS)) expect(Object.keys(atlas.icons)).toContain(b.icon);
    // the uncle asks more for a thing than his relatives pay for it
    for (const [id, g] of Object.entries(GOODS)) expect(ITEMS[id as ItemId].pays).toBeLessThan(g!.price);
  });

  it("makes every dish out of things that exist, in cookware that does", () => {
    for (const id of DISH_IDS) {
      const d = DISHES[id];
      expect(ITEMS[id].kind).toBe("dish");
      expect(d.stamina).toBeGreaterThan(0);
      expect(d.stamina).toBeLessThanOrEqual(STAMINA.max / 2);
      if (!d.recipe) continue;
      // cooked in cookware that exists, each piece worked by a cook of its own
      expect(d.recipe.in.length).toBeGreaterThanOrEqual(1);
      for (const tool of d.recipe.in) expect(ITEMS[tool].kind).toBe("tool");
      expect(d.recipe.cooks).toBeGreaterThanOrEqual(d.recipe.in.length);
      expect(d.recipe.serves).toBeGreaterThanOrEqual(1);
      expect(d.recipe.needs.length).toBeGreaterThanOrEqual(1);
      for (const [item, n] of d.recipe.needs) { expect(ITEM_IDS).toContain(item); expect(n).toBeGreaterThanOrEqual(1); }
    }
    // the dishes with no recipe: the one the uncle sells, and the odd dish that comes of cooking the wrong things
    expect(DISH_IDS.filter((id) => !DISHES[id].recipe)).toEqual(["riceBox", "oddDish", "dozyFish", "rainbowFish"]);
    expect(GOODS.oddDish).toBeUndefined();
    expect(DISHES.oddDish.buff).toBeUndefined();
    expect(GOODS.riceBox).toBeDefined();
    // the scrolls he sells are of the two simplest recipes of each tier; the early game's are both made from what the
    // river gives (every other dish has a scroll too, which is found: lib/town/scrolls)
    // (the one scroll he sells that is of no dish, of the cure for pests, aside)
    const first = Object.entries(SCROLLS).filter(([scroll, of]) => ITEMS[scroll as ItemId].tier === 1 && GOODS[scroll as ItemId] && isDish(of!));
    expect(first.map(([, dish]) => dish).sort()).toEqual(["friedMinnow", "grilledFish"]);
    for (const [scroll, dish] of first) { expect(GOODS[scroll as ItemId]).toBeDefined(); expect(DISHES[dish as DishId].recipe!.needs.length).toBeLessThanOrEqual(2); }
    // the big pot takes three to cook, and feeds the most of the early game's dishes
    expect(DISHES.shabu.recipe!.cooks).toBe(3);
    expect(Math.max(...DISH_IDS.filter((id) => ITEMS[id].tier === 1).map((id) => DISHES[id].recipe?.serves ?? 0))).toBe(DISHES.shabu.recipe!.serves);
  });

  it("grows every vegetable through five stages, the first only what was sown, and some of them again after picking", () => {
    expect(STAGES).toBe(5);
    expect(STAGE_AT).toEqual([0, 0.1, 0.3, 0.6, 1]);
    for (const id of CROP_IDS) {
      const c = CROPS[id];
      expect(ITEMS[id].kind).toBe("crop");
      expect(ITEMS[c.seed].kind).toBe("seed");
      // six hours to six or seven days in the early game; a later tier's tree takes up to twelve
      expect(c.hours).toBeGreaterThanOrEqual(6);
      expect(c.hours).toBeLessThanOrEqual((ITEMS[id].tier === 1 ? 7 : 12) * 24);
      expect(growth(id, 0)).toEqual({ stage: 1, ripe: false, spent: false });
      // what was sown lies in the ground first ("ให้ state แรก เป็นแค่ seed ก่อน"), then a sprout, a seedling, the plant half grown
      expect(growth(id, c.hours * 0.05).stage).toBe(1);
      expect(growth(id, c.hours * 0.2).stage).toBe(2);
      expect(growth(id, c.hours * 0.45).stage).toBe(3);
      expect(growth(id, c.hours * 0.8).stage).toBe(4);
      expect(growth(id, c.hours - 0.01)).toEqual({ stage: 4, ripe: false, spent: false });
      expect(growth(id, c.hours)).toEqual({ stage: 5, ripe: true, spent: false });
      if (c.again) {
        // picked, it is back at the stage before the last, and ripe again after its own while
        expect(growth(id, c.hours, 1, 0)).toEqual({ stage: 4, ripe: false, spent: false });
        expect(growth(id, c.hours, 1, c.again)).toEqual({ stage: 5, ripe: true, spent: false });
        expect(c.again).toBeGreaterThanOrEqual(12);
        expect(c.again).toBeLessThanOrEqual(48);
        expect(growth(id, c.hours, c.picks!, 999).spent).toBe(true);
      } else {
        expect(growth(id, c.hours, 1).spent).toBe(true);
      }
    }
    expect(CROP_IDS.filter((id) => CROPS[id].again).length).toBeGreaterThanOrEqual(4);
  });
});

describe("stamina", () => {
  it("is full at dawn, once a day", () => {
    const p = spend(newPurse(), 30, NOON);
    expect(staminaOf(newPurse(), NOON)).toBe(STAMINA.max);
    expect(staminaOf(p, NOON)).toBe(70);
    expect(staminaOf(p, at("2026-10-04T04:59:00"))).toBe(70);
    expect(staminaOf(p, at("2026-10-04T05:00:00"))).toBe(STAMINA.max);
    expect(dayOf(at("2026-10-04T04:59:59"))).toBe(dayOf(NOON));
    expect(dayOf(at("2026-10-04T05:00:00"))).toBe(dayOf(NOON) + 1);
  });

  it("can be spent to nothing, and no further", () => {
    let p = newPurse();
    for (let i = 0; i < 12; i++) p = spend(p, 12, NOON);
    expect(staminaOf(p, NOON)).toBe(0);
  });

  it("costs less after a hearty meal", () => {
    const hearty: Purse = { ...newPurse(), buff: { id: "hearty", until: NOON + 1 } };
    expect(costOf(hearty, 10, NOON)).toBe(7);
    expect(costOf(hearty, 10, NOON + 2)).toBe(10);
    expect(staminaOf(spend(hearty, 10, NOON), NOON)).toBe(93);
  });
});

describe("meals", () => {
  it("are three a day, by the clock: breakfast, lunch, dinner", () => {
    expect(mealOf(at("2026-10-03T05:00:00"))).toBe(0);
    expect(mealOf(at("2026-10-03T10:59:00"))).toBe(0);
    expect(mealOf(at("2026-10-03T11:00:00"))).toBe(1);
    expect(mealOf(at("2026-10-03T16:59:00"))).toBe(1);
    expect(mealOf(at("2026-10-03T17:00:00"))).toBe(2);
    expect(mealOf(at("2026-10-04T02:00:00"))).toBe(2);
    expect(mealOf(at("2026-10-04T04:59:00"))).toBe(2);
    expect(nextMealAt(NOON)).toBe(at("2026-10-03T17:00:00"));
    expect(nextMealAt(at("2026-10-03T22:00:00"))).toBe(at("2026-10-04T05:00:00"));
    expect(nextMealAt(at("2026-10-04T02:00:00"))).toBe(at("2026-10-04T05:00:00"));
  });

  it("are eaten sitting down, a helping at a time, one to each meal's hours", () => {
    const p = withFood("riceBox", 3);
    expect(sitDown(p, 0, false, NOON)).toEqual({ ok: false, why: "stand" });
    expect(sitDown(p, 1, true, NOON)).toEqual({ ok: false, why: "none" });
    expect(sitDown({ ...p, bag: put(newPurse().bag, "worm", 1) }, 0, true, NOON)).toEqual({ ok: false, why: "none" });
    const sat = sitDown(Object.freeze(p) as Purse, 0, true, NOON);
    expect(sat.ok).toBe(true);
    if (!sat.ok) return;
    expect(sat.purse.bag[0]).toEqual({ item: "riceBox", n: 2 });
    expect(sat.purse.eating).toMatchObject({ dish: "riceBox", meal: 1, got: 0 });
    expect(eatenToday(sat.purse, NOON)).toEqual([false, true, false]);
    // not a second lunch, neither while eating nor after
    expect(sitDown(sat.purse, 0, true, NOON + MIN)).toEqual({ ok: false, why: "meal" });
    const done = chew(sat.purse, 0, NOON + 6 * MIN).purse;
    expect(sitDown(done, 0, true, at("2026-10-03T16:00:00"))).toEqual({ ok: false, why: "meal" });
    // dinner is another meal, and tomorrow another day
    expect(sitDown(done, 0, true, at("2026-10-03T18:00:00")).ok).toBe(true);
    expect(eatenToday(done, at("2026-10-04T05:00:00"))).toEqual([false, false, false]);
  });

  it("take five minutes, the stamina coming as they are eaten and the buff at the end", () => {
    expect(STAMINA.minutes).toBe(5);
    const hungry = spend(withFood("grilledFish"), 60, NOON);
    const sat = sitDown(hungry, 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    const dish = DISHES.grilledFish;
    const half = chew(sat.purse, 0, NOON + 2.5 * MIN);
    expect(half.done).toBe(false);
    expect(staminaOf(half.purse, NOON + 2.5 * MIN)).toBeCloseTo(40 + dish.stamina / 2, 6);
    expect(mealProgress(half.purse, NOON + 2.5 * MIN)).toBeCloseTo(0.5, 6);
    expect(buffOf(half.purse, NOON + 2.5 * MIN)).toBeNull();
    // counted in two goes or in one, it comes to the same
    const end = NOON + 5 * MIN, whole = chew(half.purse, 0, end), atOnce = chew(sat.purse, 0, end);
    expect(whole.done).toBe(true);
    expect(staminaOf(whole.purse, end)).toBeCloseTo(40 + dish.stamina, 6);
    expect(staminaOf(atOnce.purse, end)).toBeCloseTo(40 + dish.stamina, 6);
    expect(whole.purse.eating).toBeNull();
    expect(buffOf(whole.purse, end)).toBe(dish.buff);
    expect(buffOf(whole.purse, end + BUFF_HOURS * 3_600_000 - 1)).toBe(dish.buff);
    expect(buffOf(whole.purse, end + BUFF_HOURS * 3_600_000)).toBeNull();
    // somebody who went away and came back an hour later has finished it, and no more than that
    const later = chew(sat.purse, 0, NOON + 60 * MIN);
    expect(later.done).toBe(true);
    expect(staminaOf(later.purse, NOON + 60 * MIN)).toBeCloseTo(40 + dish.stamina, 6);
  });

  it("give more eaten together: a tenth more for each other, up to five of them", () => {
    const sat = sitDown(spend(withFood("riceBox"), 90, NOON), 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    const end = NOON + 5 * MIN, base = DISHES.riceBox.stamina;
    const alone = staminaOf(chew(sat.purse, 0, end).purse, end) - 10;
    expect(alone).toBeCloseTo(base, 6);
    expect(staminaOf(chew(sat.purse, 2, end).purse, end) - 10).toBeCloseTo(base * 1.2, 6);
    expect(staminaOf(chew(sat.purse, 5, end).purse, end) - 10).toBeCloseTo(base * 1.5, 6);
    expect(staminaOf(chew(sat.purse, 30, end).purse, end) - 10).toBeCloseTo(base * 1.5, 6);
    // company for half the meal counts for that half
    const mid = chew(sat.purse, 4, NOON + 2.5 * MIN).purse;
    expect(staminaOf(chew(mid, 0, end).purse, end) - 10).toBeCloseTo(base * (0.5 * 1.4 + 0.5), 6);
  });

  it("never fill the gauge past full", () => {
    const sat = sitDown(spend(withFood("shabu"), 10, NOON), 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    expect(staminaOf(chew(sat.purse, 5, NOON + 5 * MIN).purse, NOON + 5 * MIN)).toBe(STAMINA.max);
  });

  it("can be left early: what was eaten stays, the rest and the buff are forfeit", () => {
    const before: Purse = { ...spend(withFood("grilledFish"), 60, NOON), buff: { id: "lucky", until: NOON + 3_600_000 } };
    const sat = sitDown(before, 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    const up = getUp(sat.purse, 0, NOON + MIN);
    expect(up.eating).toBeNull();
    expect(staminaOf(up, NOON + MIN)).toBeCloseTo(40 + DISHES.grilledFish.stamina / 5, 6);
    // the buff from the meal before is still there; this one's never came
    expect(buffOf(up, NOON + MIN)).toBe("lucky");
    expect(eatenToday(up, NOON + MIN)[1]).toBe(true);
    // the helping is gone; the bowl it was in is back all the same
    expect(held(up.bag, "grilledFish")).toBe(0);
    expect(up.bag[0]).toEqual({ item: "bowl", n: 1 });
  });

  it("give the bowl back when they are eaten up (the owner: \"ต้องกินหมดก่อนถ้วยค่อยกลับมา\")", () => {
    const sat = sitDown(withFood("grilledFish", 2), 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    // while it is being eaten there is no bowl: it is in the eater's hands
    expect(held(sat.purse.bag, "bowl")).toBe(0);
    expect(held(chew(sat.purse, 0, NOON + 4 * MIN).purse.bag, "bowl")).toBe(0);
    const ate = chew(sat.purse, 0, NOON + 5 * MIN);
    expect(ate.done).toBe(true);
    expect(held(ate.purse.bag, "bowl")).toBe(1);
    expect(held(ate.purse.bag, "grilledFish")).toBe(1);
    // a purse that was not looked at while the meal ran out has it too
    expect(held(settle(sat.purse, NOON + 60 * MIN).bag, "bowl")).toBe(1);
    // what the uncle sells ready comes wrapped: no bowl comes of eating it
    const parcel = sitDown(withFood("riceBox"), 0, true, NOON);
    if (!parcel.ok) throw new Error(parcel.why);
    expect(held(chew(parcel.purse, 0, NOON + 5 * MIN).purse.bag, "bowl")).toBe(0);
    expect(held(getUp(parcel.purse, 0, NOON + MIN).bag, "bowl")).toBe(0);
    // the odd dish came out of a pot like any other
    const odd = sitDown(withFood("oddDish"), 0, true, NOON);
    if (!odd.ok) throw new Error(odd.why);
    expect(held(chew(odd.purse, 0, NOON + 5 * MIN).purse.bag, "bowl")).toBe(1);
  });

  it("never lose a bowl to a full bag: it is owed, and back as soon as there is room", () => {
    // five slots: two helpings in one, and the other four full
    const full: Purse = { ...newPurse(), bag: [{ item: "grilledFish", n: 2 }, ...Array.from({ length: 4 }, () => ({ item: "boot" as ItemId, n: 5 }))] };
    const sat = sitDown(full, 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    const ate = chew(sat.purse, 0, NOON + 5 * MIN).purse;
    expect(held(ate.bag, "bowl")).toBe(0);
    expect(ate.owed).toBe(1);
    // looked at again with the bag still full, nothing changes; with a slot free, the bowl is in it and nothing is owed
    expect(settle(ate, NOON + 6 * MIN)).toEqual(ate);
    const room: Purse = { ...ate, bag: ate.bag.map((s, i) => (i === 4 ? null : s)) };
    const back = settle(room, NOON + 6 * MIN);
    expect(back.bag[4]).toEqual({ item: "bowl", n: 1 });
    expect("owed" in back).toBe(false);
    // two owed and one slot: one comes back, one is still owed
    const two = bowlsBack({ ...room, owed: 1 }, 1);
    expect(held(two.bag, "bowl")).toBe(1);
    expect(two.owed).toBe(1);
    expect(bowlsBack(newPurse())).toEqual(newPurse());
  });
});

describe("a meal left running (a tab closed at the table)", () => {
  it("is finished by the clock: the rest counts as eaten alone, and its buff runs from when the meal ended", () => {
    const sat = sitDown(withFood("tomYum"), 0, true, NOON);
    if (!sat.ok) throw new Error("did not sit");
    // two minutes in, with two friends, then nothing more is heard of it
    const some = chew(sat.purse, 2, NOON + 2 * MIN).purse;
    expect(settle(some, NOON + 4 * MIN)).toBe(some);
    // looked at again an hour on: finished at its fifth minute
    const done = settle(some, NOON + 60 * MIN), end = NOON + STAMINA.minutes * MIN;
    expect(done.eating).toBeNull();
    expect(done).toEqual(chew(some, 0, end).purse);
    expect(done.buff).toEqual({ id: DISHES.tomYum.buff, until: end + BUFF_HOURS * 3_600_000 });
    // (so a buff of three hours is over if nobody looked for four)
    expect(buffOf(settle(some, NOON + 240 * MIN), NOON + 240 * MIN)).toBeNull();
    // a purse with no meal is as it was
    const idle = newPurse();
    expect(settle(idle, NOON)).toBe(idle);
  });
});

describe("a recipe scroll", () => {
  it("teaches its recipe once, and is used up", () => {
    const p = withFood("scrollGrilledFish");
    const read = readScroll(p, 0);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.dish).toBe("grilledFish");
    expect(read.purse.recipes).toEqual(["grilledFish"]);
    expect(read.purse.bag[0]).toBeNull();
    expect(readScroll({ ...read.purse, bag: p.bag }, 0)).toEqual({ ok: false, why: "known" });
    expect(readScroll(withFood("worm"), 0)).toEqual({ ok: false, why: "none" });
  });

  it("teaches how the cure for pests is made as it teaches a dish", () => {
    const read = readScroll({ ...withFood("scrollPestCure"), recipes: ["grilledFish"] }, 0);
    expect(read.ok && read.dish).toBe("pestCure");
    expect(read.ok && read.purse.recipes).toEqual(["grilledFish", "pestCure"]);
    expect(read.ok && read.purse.bag[0]).toBeNull();
    expect(iconOf("scrollPestCure")).toBe("scroll");
  });
});
