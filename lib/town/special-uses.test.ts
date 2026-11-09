import { describe, expect, it } from "vitest";
import { ANIMALS, adultAt, breedOf, crossOf, dayOf, dayStart, newHerd, type Animal } from "./animals";
import { animalAction, type AnimalWorld, type Env } from "./animal-act";
import { FAMILY } from "./animal-items";
import { clueOf } from "./clues";
import { cook, feastEat, madeOf, potNow, tableEnds, feastEnds, type Pot } from "./cooking";
import { rainAt, rainEgg } from "./ditch";
import { farmBook, isOpen } from "./farm-book";
import { HINT_IDS, toldOf } from "./hints";
import { BUFFS, BUFF_HOURS, BUFF_STEPS, CROPS, DISHES, ITEMS, SCROLLS, byOf, type DishId, type ItemId, type MealBuffId } from "./items";
import { foundScrolls } from "./scrolls";
import { LEGEND_DISHES, SPECIAL_DISHES, SPECIAL_DISH_IDS, SPECIAL_DISH_SCROLLS } from "./special-dishes";
import {
  CARRY, SPECIAL_USE, carryOf, cushionCompany, fleetPace, gentleHearts, hazardLead, hazardNear, isLegend, laid, layDress, matchOdds, mealsMore,
  inkOf, moonTiles, rainSquare, togetherAt, woolOff, woolWorth, writable, writeScroll, type Dress,
} from "./special-uses";
import { SPECIALS } from "./specials";
import { chew, levelOf, mealBuffs, nextMealAt } from "./stamina";
import { held, newPurse, put, type Purse } from "./trade";
import { fireAt, startRoast } from "./roasting";
import type { Plot } from "./farm";

const H = 3_600_000, MIN = 60_000;
const NOW = Date.parse("2026-11-10T12:00:00+07:00");
const NIGHT = Date.parse("2026-11-10T21:00:00+07:00");
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const recipe = (id: DishId) => DISHES[id].recipe!;
const crewOf = (id: DishId): Array<ItemId | null> => { const r = recipe(id); return [...r.in, ...Array<null>(Math.max(0, r.cooks - r.in.length)).fill(null)]; };
const withBuff = (p: Purse, id: MealBuffId, level: number, now = NOW): Purse => ({ ...p, buffs: [...(p.buffs ?? []), { id, level, until: now + H }] });

describe("the specials' ten dishes (lib/town/special-dishes)", () => {
  it("are ten, each a dish of the third tier with a picture, a pot and a scroll that only a paper writes", () => {
    expect(SPECIAL_DISH_IDS.length).toBe(10);
    for (const id of SPECIAL_DISH_IDS) {
      expect(ITEMS[id].kind).toBe("dish");
      expect(ITEMS[id].tier).toBe(3);
      expect(DISHES[id].recipe).toBeTruthy();
    }
    expect(Object.values(SPECIAL_DISH_SCROLLS).sort()).toEqual([...SPECIAL_DISH_IDS].sort());
    for (const s of Object.keys(SPECIAL_DISH_SCROLLS)) expect(foundScrolls([1, 2, 3])).not.toContain(s);
    // never hinted: the uncle sells no hint of them
    for (const id of SPECIAL_DISH_IDS) expect(HINT_IDS).not.toContain(id);
  });

  it("each has a fantasy or legend special as its last, hidden thing; the seven give the five new buffs and two old ones", () => {
    const fantasy = new Set(SPECIALS.filter((x) => x.tier !== "real" && x.line !== "wool").map((x) => x.id));
    for (const id of SPECIAL_DISH_IDS) {
      const last = recipe(id).needs.at(-1)![0];
      expect(fantasy.has(last as never), `${id} ends on ${last}`).toBe(true);
      expect(toldOf(id).last).toMatchObject({ kind: "goods" });
    }
    const buffs = SPECIAL_DISH_IDS.filter((id) => !isLegend(id)).map((id) => DISHES[id].buff);
    for (const b of ["gentle", "aroma", "featherlight", "moonSight", "luckyMatch"] as const) expect(buffs).toContain(b);
  });

  it("cook as their recipe says, in its cookware and by its cooks; without the special, never the dish", () => {
    for (const id of SPECIAL_DISH_IDS) {
      const r = recipe(id), crew = crewOf(id);
      const d = done(cook(purseWith(...r.needs, ...r.in.map((t): [ItemId, number] => [t, 1])), r.needs, crew, 0, NOW));
      expect(d.made, id).toBe(id);
      // as many helpings as it says at the least (better cookware gives more, as for every dish)
      expect(d.n, id).toBeGreaterThanOrEqual(r.serves);
      // the same less its special: an odd dish (whoever begins holds cookware), never the dish
      const less = r.needs.slice(0, -1);
      const odd = cook(purseWith(...less, ...r.in.map((t): [ItemId, number] => [t, 1])), less, crew, 0, NOW);
      expect(odd.ok && odd.made !== id, id).toBe(true);
    }
  });

  it("two of them want specials of two animals; the legend three are four cooks and twenty helpings", () => {
    const animals = (id: DishId) => new Set(recipe(id).needs.map(([x]) => SPECIALS.find((s) => s.id === x)?.species).filter(Boolean));
    expect(SPECIAL_DISH_IDS.filter((id) => animals(id).size >= 2).sort()).toEqual(["cocoaMousse", "milkyWayCake"]);
    for (const id of LEGEND_DISHES) expect([recipe(id).cooks, recipe(id).serves, new Set(recipe(id).in).size]).toEqual([4, 20, 4]);
  });

  it("pay about their peers: never more than the dearest pasture dish of their kind", () => {
    for (const id of SPECIAL_DISH_IDS) expect(ITEMS[id].pays).toBeLessThanOrEqual(isLegend(id) ? 120 : 60);
    expect(ITEMS.phoenixBake.pays + ITEMS.pearlBroth.pays + ITEMS.milkyWayCake.pays).toBe(70 + 80 + 90);
  });

  it("a special's clue tells its animal and how rare its breed, never its name", () => {
    expect(clueOf("fireflyEgg").sort.en).toMatch(/hen/);
    expect(clueOf("fireflyEgg").from!.en).toMatch(/fantasy/);
    expect(clueOf("cometMilkCrystal").from!.en).toMatch(/legend/);
  });
});

describe("the real breeds' specials: an egg or milk in every recipe, and a second buff into the pot", () => {
  it("stand in for an egg or milk (the nine of B to D that are eggs or milk), never the fantasy breeds'", () => {
    for (const x of SPECIALS) {
      const fam = FAMILY[x.id];
      if (x.tier === "real" && (x.family === "egg" || x.family === "milk")) expect(fam, x.id).toBe(x.family);
      else expect(fam, x.id).toBeUndefined();
    }
    expect(Object.keys(CARRY).length).toBe(9);
    expect(madeOf([["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]])).toBe("custard");
  });

  it("carry their breed's second buff into the pot, one a pot, never the dish's own", () => {
    expect(carryOf([["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]], "custard")).toBe("gentle");
    // two of them: one a pot, the first by its id
    expect(carryOf([["silkieTwinEgg", 1], ["dawnBlueEgg", 1], ["milk", 1], ["sugar", 1]], "custard")).toBe("keen");
    // the dish's own buff is no second one (jersey's calm in custard, which leaves calm): none
    expect(carryOf([["egg", 2], ["goldenCreamTop", 1], ["sugar", 1]], "custard")).toBeNull();
    const d = done(cook(purseWith(["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1], ["pot", 1]), [["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]], ["pot"], 0, NOW));
    const pot = d.purse.bag.find((s) => s?.item === "potFull")!;
    expect([pot.of!.dish, pot.carry]).toEqual(["custard", "gentle"]);
  });

  it("a helping of such a pot at the table, eaten up, leaves both buffs, each a meal's three hours", () => {
    const pot: Pot = { id: "p1", by: "x", dish: "custard", left: 3, at: [0, 0], feast: true, set: NOW, carry: "gentle" };
    const ate = done(feastEat(newPurse(), pot, true, NOW));
    expect(ate.purse.eating!.carry).toBe("gentle");
    const end = chew(ate.purse, 0, NOW + 6 * MIN).purse;
    const live = mealBuffs(end, NOW + 6 * MIN);
    expect(live.map((b) => b.id).sort()).toEqual(["calm", "gentle"]);
    expect(live.every((b) => b.level === 1 && b.until >= NOW + BUFF_HOURS * H)).toBe(true);
  });
});

describe("the five buffs: three hours, four levels, never past three times, none that removes failing", () => {
  it("are of the meals' buffs, with four steps each", () => {
    for (const id of ["gentle", "aroma", "featherlight", "moonSight", "luckyMatch"] as const) {
      expect(BUFFS[id]).toBeTruthy();
      expect(BUFF_STEPS[id].length).toBe(4);
      expect(byOf(id, 9)).toBe(BUFF_STEPS[id][3]);
    }
    // what multiplies stays under three times
    expect(1 + byOf("gentle", 4)).toBeLessThanOrEqual(3);
    expect(fleetPace(4)).toBeLessThanOrEqual(3);
  });

  it("gentle: a pet or a treat gives so many more hearts, +20% to +80%", () => {
    expect([1, 2, 3, 4].map((l) => gentleHearts(10, l))).toEqual([12, 14, 16, 18]);
    expect(gentleHearts(10, 0)).toBe(10);
  });

  it("gentle reaches the animal: a pet under it gives more hearts than without", () => {
    const T0 = dayStart(20_380) + 2 * H;
    const hen: Animal = { id: "a1", owner: "me", species: "chicken", breed: "silkie", name: "", born: T0 - 10 * 24 * H, bought: false, home: "barn",
      sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 }, streak: 0, at: T0, food: 20, grown: adultAt("chicken"), made: 0, banked: 0, hearts: 100, today: { day: dayOf(T0) }, speedUntil: 0, windUntil: 0,
      narrow: 0, rest: 0, lent: null, outside: [], outBands: 0 };
    const world = { animals: [hen], herds: [{ ...newHerd("me"), barn: 0, door: [] }], found: {}, spells: [], wagons: [], offers: [], asks: [] } as unknown as AnimalWorld;
    const env: Env = { me: "me", now: T0, rand: () => 0.5, newId: () => "n1", spot: () => [200, 40] } as Env;
    const plain = animalAction(world, newPurse(), { action: "pet", id: "a1" } as never, env);
    const kind = animalAction(world, withBuff(newPurse(), "gentle", 4, T0), { action: "pet", id: "a1" } as never, env);
    const heartsOf = (r: typeof plain) => (r.ok ? r.world.animals[0].hearts : -1);
    expect(heartsOf(kind) - 100).toBeCloseTo((heartsOf(plain) - 100) * 1.8, 1);
  });

  it("lucky match: so many points more, never past three times the breed's own odds nor the cap, never less than without", () => {
    expect(matchOdds(60, 0, 4, 70)).toBe(70);
    expect(matchOdds(30, 10, 4, 70)).toBe(60);
    expect(matchOdds(10, 10, 4, 70)).toBe(30);
    expect(matchOdds(10, 10, 0, 70)).toBe(20);
    expect(matchOdds(10, 0, 1, 70)).toBe(15);
    // and the cross reads it
    const a = breedOf("lanternHen")!, b = breedOf("cloudHen")!;
    const plain = crossOf(a, b, null, false, 0), with20 = crossOf(a, b, null, false, 20);
    expect(with20.odds).toBeGreaterThanOrEqual(plain.odds);
    expect(ANIMALS.oddsCap).toBe(70);
  });

  it("aroma: the roast's crackle comes earlier by its lead, and the flare is no gentler", () => {
    expect([1, 2, 3, 4].map(hazardLead)).toEqual([0.3, 0.5, 0.7, 1]);
    expect(hazardNear([5], 4.2, 0.55, 0)).toBe(false);
    expect(hazardNear([5], 4.2, 0.55, 1)).toBe(true);
    expect(hazardNear([5], 5, 0.55, 1)).toBe(false);
    const plain = startRoast(false, 7), lead = startRoast(false, 7, 1, 1, 1);
    expect(lead.flares).toEqual(plain.flares);
    const f = plain.flares[0];
    expect(fireAt(plain, f - 0.9).crackling).toBe(false);
    expect(fireAt(lead, f - 0.9).crackling).toBe(true);
    expect(fireAt(lead, f + 0.1)).toEqual(fireAt(plain, f + 0.1));
  });

  it("featherlight: on foot only; moon sight: at night only", () => {
    expect([1, 2, 3, 4].map((l) => fleetPace(l))).toEqual([1.05, 1.1, 1.15, 1.2]);
    expect(fleetPace(4, true)).toBe(1);
    expect(moonTiles(3, NIGHT)).toBe(3);
    expect(moonTiles(3, NOW)).toBe(0);
    expect(moonTiles(0, NIGHT)).toBe(0);
  });
});

describe("the legend feast: eaten together, a level more", () => {
  const T = NOW;
  it("three or more who begin a helping of one pot within five minutes", () => {
    expect(togetherAt([{ by: "a", at: T }, { by: "b", at: T + 2 * MIN }, { by: "c", at: T + 4 * MIN }], "a", T)).toBe(true);
    // two are not three
    expect(togetherAt([{ by: "a", at: T }, { by: "b", at: T + 2 * MIN }], "a", T)).toBe(false);
    // one who began twice is one
    expect(togetherAt([{ by: "a", at: T }, { by: "b", at: T + MIN }, { by: "b", at: T + 2 * MIN }], "a", T)).toBe(false);
    // three spread over eight minutes are no five minutes' three, for any of them
    const spread = [{ by: "a", at: T }, { by: "b", at: T + 4 * MIN }, { by: "c", at: T + 8 * MIN }];
    for (const x of spread) expect(togetherAt(spread, x.by, x.at), x.by).toBe(false);
    // I need not be the first
    expect(togetherAt([{ by: "a", at: T }, { by: "b", at: T + MIN }, { by: "c", at: T + 3 * MIN }], "c", T + 3 * MIN)).toBe(true);
  });

  it("a helping of a legend pot at the table knows its pot; eaten together at its end it is a level more", () => {
    const pot: Pot = { id: "L1", by: "x", dish: "phoenixBake", left: 20, at: [0, 0], feast: true, set: T };
    const ate = done(feastEat(newPurse(), pot, true, T));
    expect(ate.purse.eating!.pot).toBe("L1");
    const alone = chew(ate.purse, 0, T + 6 * MIN).purse, together = chew(ate.purse, 0, T + 6 * MIN, true).purse;
    expect(levelOf(alone, T + 6 * MIN, "hearty")).toBe(1);
    expect(levelOf(together, T + 6 * MIN, "hearty")).toBe(2);
    // never past the last
    const high = { ...ate.purse, buffs: [{ id: "hearty" as const, level: 4, until: T + H }] };
    expect(levelOf(chew(high, 0, T + 6 * MIN, true).purse, T + 6 * MIN, "hearty")).toBe(4);
    // a pot of no legend has no pot told, and together does nothing
    const plain = done(feastEat(newPurse(), { ...pot, dish: "custard" }, true, T));
    expect(plain.purse.eating!.pot).toBeUndefined();
    expect(levelOf(chew(plain.purse, 0, T + 6 * MIN, true).purse, T + 6 * MIN, "calm")).toBe(1);
  });
});

describe("the sheep's wool at the feast table", () => {
  const d: Dress = { cloth: { at: NOW, until: NOW + 24 * H, by: "A" }, cushions: { at: NOW, until: NOW + 24 * H, by: "B" } };
  it("cushions: a companion more at the table while they lie there, within the most there may be", () => {
    expect(cushionCompany(d, NOW + H)).toBe(1);
    expect(cushionCompany(d, NOW + 25 * H)).toBe(0);
    const pot: Pot = { id: "p", by: "x", dish: "custard", left: 3, at: [0, 0], feast: true, set: NOW };
    const on = done(feastEat(newPurse(), pot, true, NOW, undefined, true)).purse, off = done(feastEat(newPurse(), pot, true, NOW)).purse;
    expect(on.eating!.cushion).toBe(true);
    const gain = (p: Purse) => chew(p, 0, NOW + 2 * MIN).purse.eating!.got;
    expect(gain(on)).toBeGreaterThan(gain(off));
    expect(chew(on, 5, NOW + 2 * MIN).purse.eating!.got).toBe(chew(off, 5, NOW + 2 * MIN).purse.eating!.got);
  });

  it("a cover and the golden cloth: a meal's hours more each, never more than the two", () => {
    const end = feastEnds(NOW);
    expect(tableEnds({}, NOW)).toBe(end);
    expect(tableEnds({ cover: true }, NOW)).toBe(nextMealAt(end));
    expect(tableEnds({}, NOW, d)).toBe(nextMealAt(end));
    expect(tableEnds({ cover: true }, NOW, d)).toBe(nextMealAt(nextMealAt(end)));
    expect(mealsMore({ cover: true }, d, end)).toBe(2);
    // the cloth gone before the pot's time: nothing more for it
    expect(tableEnds({}, NOW, { cloth: { at: NOW, until: NOW + H, by: "A" } })).toBe(end);
    const pot: Pot = { id: "p", by: "x", dish: "custard", left: 3, at: [0, 0], feast: true, set: NOW, cover: true };
    expect(potNow(pot, end + MIN)?.feast).toBe(true);
    expect(potNow({ ...pot, cover: false }, end + MIN)).toBeNull();
  });

  it("laying them uses the wool up; laid again, it runs from now and never shorter", () => {
    const p = purseWith(["wholeGoldenFleece", 2], ["cloudFluffTuft", 1]);
    const one = done(layDress(p, null, "cloth", "A", NOW));
    expect(held(one.purse.bag, "wholeGoldenFleece")).toBe(1);
    expect(laid(one.dress, "cloth", NOW + 23 * H)).toBe(true);
    const two = done(layDress(one.purse, one.dress, "cloth", "B", NOW + 10 * H));
    expect(two.dress.cloth!.until).toBe(NOW + 34 * H);
    expect(layDress(purseWith(["rice", 1]), null, "cushions", "A", NOW).ok).toBe(false);
  });

  it("a cloth laid after the last had gone keeps the meal of the pots whose time fell while that one lay", () => {
    // a pot set late in the first cloth's day: its time falls while it lies, so it stays a meal's hours more
    const first = done(layDress(purseWith(["wholeGoldenFleece", 2]), null, "cloth", "A", NOW));
    // (the latest set-down whose time falls while the first cloth lies and whose meal runs past it)
    const set = Array.from({ length: 48 }, (_, i) => NOW + (47 - i) * 30 * MIN)
      .find((t) => laid(first.dress, "cloth", feastEnds(t)) && nextMealAt(feastEnds(t)) > first.dress.cloth!.until + 30 * MIN)!;
    expect(set).toBeDefined();
    const end = feastEnds(set);
    const kept = tableEnds({}, set, first.dress);
    expect(kept).toBe(nextMealAt(end));
    // the first cloth gone, another laid before the pot's meal is over: the pot keeps it
    const at = Math.max(first.dress.cloth!.until, end) + 30 * MIN;
    expect(at).toBeLessThan(kept);
    const second = done(layDress(first.purse, first.dress, "cloth", "B", at));
    expect(second.dress.cloth).toEqual({ at, until: at + 24 * H, by: "B" });
    expect(second.dress.clothWas).toEqual(first.dress.cloth);
    expect(tableEnds({}, set, second.dress)).toBe(kept);
    // (and what is drawn, and the panel, are of the cloth on the table now)
    expect(laid(second.dress, "cloth", at - MIN)).toBe(false);
    // laid again while it lies: one cloth, its time longer, nothing kept beside it
    const again = done(layDress(purseWith(["wholeGoldenFleece", 1]), first.dress, "cloth", "C", NOW + H));
    expect(again.dress.clothWas).toBeUndefined();
  });
});

describe("the other uses", () => {
  it("the first-rain egg waters every thirsty plant of the nine plots about it, anybody's, once", () => {
    const plant = (by: string) => ({ crop: "kangkong", sown: NOW - 2 * H, watered: 0, boost: 0, by } as unknown as NonNullable<Plot["plant"]>);
    const plots: Record<string, Plot> = { "10,10": { soil: "tilled", plant: plant("me") }, "11,11": { soil: "tilled", plant: plant("them") }, "13,10": { soil: "tilled", plant: plant("them") } } as Record<string, Plot>;
    const hand = { ...purseWith(["firstRainEgg", 2]), hand: "firstRainEgg" as ItemId };
    expect(rainSquare(10, 10).length).toBe(9);
    expect(rainAt(hand, plots, [10, 10], NOW).sort()).toEqual(["10,10", "11,11"]);
    const did = rainEgg(hand, plots, [10, 10], NOW);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.watered.sort()).toEqual(["10,10", "11,11"]);
    expect(held(did.purse.bag, "firstRainEgg")).toBe(1);
    expect(did.plots["10,10"].plant!.watered).toBe(NOW);
    // nothing in the hand, or nothing thirsty there: refused, nothing used
    expect(rainEgg(purseWith(["firstRainEgg", 1]), plots, [10, 10], NOW)).toEqual({ ok: false, why: "hand" });
    expect(rainEgg(hand, plots, [30, 30], NOW).ok).toBe(false);
  });

  it("a blank recipe paper is written only with a dish one has made, into its scroll", () => {
    const p = { ...purseWith(["blankRecipePaper", 1]), made: ["fireflyCustard", "compost"] as ItemId[] };
    expect(writable(p)).toEqual(["fireflyCustard"]);
    const w = done(writeScroll(p, "fireflyCustard"));
    expect(w.scroll).toBe("scrollFireflyCustard");
    expect(held(w.purse.bag, "blankRecipePaper")).toBe(0);
    expect(held(w.purse.bag, "scrollFireflyCustard" as ItemId)).toBe(1);
    // a dish not made: refused, the paper kept
    expect(writeScroll(p, "pearlBroth")).toEqual({ ok: false, why: "known" });
    expect(writeScroll({ ...p, bag: newPurse().bag }, "fireflyCustard")).toEqual({ ok: false, why: "none" });
    // a written scroll fetches no more than the paper did
    expect(ITEMS["scrollFireflyCustard" as ItemId].pays).toBe(ITEMS.blankRecipePaper.pays);
    expect(inkOf("fireflyCustard")).toBe(0);
    expect(w.purse.coins).toBe(p.coins);
  });

  it("writing a scroll that fetches more than the paper costs its ink: never coins out of nothing", () => {
    const rich = ITEMS["scrollStarPudding" as ItemId].pays - ITEMS.blankRecipePaper.pays;
    expect(rich).toBeGreaterThan(0);
    expect(inkOf("starPudding" as ItemId)).toBe(rich);
    const p = { ...purseWith(["blankRecipePaper", 1]), made: ["starPudding"] as ItemId[] };
    expect(writeScroll({ ...p, coins: rich - 1 }, "starPudding" as ItemId)).toEqual({ ok: false, why: "coins" });
    const w = done(writeScroll({ ...p, coins: rich + 5 }, "starPudding" as ItemId));
    expect(w.purse.coins).toBe(5);
    // the paper and the ink together are what the scroll fetches: nothing made
    expect(ITEMS.blankRecipePaper.pays + rich).toBe(ITEMS["scrollStarPudding" as ItemId].pays);
    // over every recipe that has a scroll
    for (const [s, dish] of Object.entries(SCROLLS)) expect(ITEMS.blankRecipePaper.pays + inkOf(dish as ItemId)).toBeGreaterThanOrEqual(ITEMS[s as ItemId].pays ?? 0);
  });

  it("Granny takes the three wools off a piece, each kind once, by what the wool would fetch", () => {
    const p = purseWith(["rareShadeLock", 2], ["spiralShedHorn", 1], ["rainbowArcLock", 1], ["wool", 1]);
    const slot = (id: ItemId) => p.bag.findIndex((s) => s?.item === id);
    const all = done(woolOff(p, [slot("rareShadeLock"), slot("spiralShedHorn"), slot("rainbowArcLock")]));
    expect(all.off).toBe(12 + 12 + 18);
    expect(held(all.bag, "rareShadeLock")).toBe(1);
    expect(woolOff(p, [slot("rareShadeLock"), slot("rareShadeLock")]).ok).toBe(false);
    expect(woolOff(p, [slot("wool")]).ok).toBe(false);
    expect(woolWorth({ item: "rareShadeLock", grade: 2 })).toBe(Math.round(12 * 1.75));
  });

  it("the golden dandelion: sown of its special, a rare flower shut in the farm book until somebody grows one", () => {
    expect(CROPS.goldenDandelion.seed).toBe("goldenDandelionSeed");
    expect(isOpen("goldenDandelion", new Set())).toBe(false);
    expect(isOpen("goldenDandelion", new Set(["goldenDandelion"]))).toBe(true);
    const page = farmBook(new Set()).find((p) => p.id === "goldenDandelion")!;
    expect([page.kind, page.open, page.hint]).toEqual(["rare", false, "goldenDandelionSeed"]);
  });
});
