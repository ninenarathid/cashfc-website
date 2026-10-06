import { describe, expect, it } from "vitest";
import { FARMING, tend, type Plant, type Plot } from "./farm";
import { STRIKE, strikeOf, strikeWindowOf } from "./fishing";
import { CHARMS, CHARM_IDS, FAMILIARS, FAMILIAR_IDS, GIFTS, charmBy, dueOf, famBy, familiarOf, giftAt, giftsOf, giftsRow, gloved, leftOf, stretchOf, takeGift, useGift, usedOf, usesLeft, USES, wearCharms, wearFamiliar, wearing, works, type CharmId, type FamiliarId } from "./gifts";
import type { ItemId } from "./items";
import { LINES, LINE_IDS } from "./lines";
import { eased, staminaOf } from "./stamina";
import { hold, newPurse, put, type Purse } from "./trade";

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-06T12:00:00");
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const first = (line: string) => LINES[line as (typeof LINE_IDS)[number]].marks[0];

describe("the gifts of the lines of work", () => {
  it("the first rank of every line but the well's gives a charm, and the second of three lines a familiar; each has its words in both languages", () => {
    const first = GIFTS.filter((g) => g.rank === 1), second = GIFTS.filter((g) => g.rank === 2);
    expect(first.map((g) => g.line).sort()).toEqual(LINE_IDS.filter((l) => l !== "well").sort());
    expect(first.every((g) => g.kind === "charm") && second.every((g) => g.kind === "familiar")).toBe(true);
    expect(second.map((g) => g.id).sort()).toEqual([...FAMILIAR_IDS].sort());
    expect(GIFTS.length).toBe(first.length + second.length);
    for (const g of GIFTS) {
      expect(g.name.th && g.name.en && g.does.th && g.does.en, g.id).toBeTruthy();
      expect(giftAt(g.line, g.rank)?.id, g.id).toBe(g.id);
      expect(g.kind === "charm" ? CHARMS[g.id as CharmId] : FAMILIARS[g.id as FamiliarId], g.id).toBeGreaterThan(0);
    }
    expect(new Set(GIFTS.map((g) => g.id)).size).toBe(GIFTS.length);
    expect(giftAt("well", 1)).toBeNull();
    expect(giftAt("kitchen", 2)).toBeNull();
    expect(giftAt("forest", 2)?.id).toBe("famSquirrel");
    expect(giftAt("cooking", 1)).toBeNull();
  });

  it("a purse from before has none, and what is kept is made sound", () => {
    expect(giftsOf(newPurse())).toEqual({ had: [], charms: [], owed: 0, familiar: null, used: {} });
    expect(giftsOf({ gifts: { had: ["charmHoe", "charmHoe", "noSuch", 3 as unknown as string], charms: ["charmHoe", "charmNet", "charmHoe"], owed: 7 } })).toEqual({ had: ["charmHoe"], charms: ["charmHoe"], owed: 0, familiar: null, used: {} });
    // (no more worn than there are places)
    expect(giftsOf({ gifts: { had: [...CHARM_IDS], charms: ["charmHoe", "charmNet", "charmApron"] } }).charms).toEqual(["charmHoe", "charmNet"]);
    expect(giftsOf({ gifts: null as unknown as Purse["gifts"] })).toEqual({ had: [], charms: [], owed: 0, familiar: null, used: {} });
    // (a familiar follows only if it was taken and is one; a charm is no familiar, and a familiar is in no place for charms)
    expect(giftsOf({ gifts: { had: ["famGnome", "charmHoe"], charms: ["famGnome", "charmHoe"], familiar: "famGnome" } })).toEqual({ had: ["famGnome", "charmHoe"], charms: ["charmHoe"], owed: 0, familiar: "famGnome", used: {} });
    expect(giftsOf({ gifts: { had: ["charmHoe"], charms: [], familiar: "famGnome" } }).familiar).toBeNull();
    expect(giftsOf({ gifts: { had: ["charmHoe"], charms: [], familiar: "charmHoe" } }).familiar).toBeNull();
    expect(giftsOf({ gifts: { had: [], charms: [], owed: 0.5 } }).owed).toBe(0.5);
  });

  it("a gift is taken once, of a rank reached, and goes into no bag", () => {
    const p = newPurse();
    expect(takeGift(p, {}, "kitchen", 1)).toEqual({ ok: false, why: "rank" });
    expect(takeGift(p, { kitchen: first("kitchen") - 1 }, "kitchen", 1)).toEqual({ ok: false, why: "rank" });
    expect(takeGift(p, { kitchen: 99999 }, "kitchen", 2)).toEqual({ ok: false, why: "none" });
    expect(takeGift(p, { well: 99999 }, "well", 1)).toEqual({ ok: false, why: "none" });
    const took = done(takeGift(p, { kitchen: first("kitchen") }, "kitchen", 1));
    expect(took.gift).toBe("charmApron");
    expect(took.purse.gifts).toEqual({ had: ["charmApron"], charms: [], owed: 0, familiar: null, used: {} });
    expect(took.purse.bag).toEqual(p.bag);
    expect(takeGift(took.purse, { kitchen: 99999 }, "kitchen", 1)).toEqual({ ok: false, why: "had" });
    // (points of one line are no rank of another)
    expect(takeGift(took.purse, { kitchen: 99999 }, "fishing", 1)).toEqual({ ok: false, why: "rank" });
  });

  it("what may be taken now is told, the lines in their order; and how many there are still to get, and no more than that", () => {
    const p = newPurse();
    expect(dueOf({}, p)).toEqual([]);
    expect(leftOf(p)).toBe(GIFTS.length);
    const points = { farming: first("farming"), kitchen: first("kitchen"), fishing: first("fishing") - 1 };
    expect(dueOf(points, p).map((g) => g.id)).toEqual(["charmApron", "charmHoe"]);
    const took = done(takeGift(p, points, "farming", 1)).purse;
    expect(dueOf(points, took).map((g) => g.id)).toEqual(["charmApron"]);
    expect(leftOf(took)).toBe(GIFTS.length - 1);
  });

  it("two charms are worn at a time, ones had, each once; and all may be taken off", () => {
    let p: Purse = { ...newPurse(), gifts: { had: ["charmApron", "charmHoe", "charmNet"], charms: [] } };
    expect(wearCharms(p, ["charmApron", "charmHoe", "charmNet"])).toEqual({ ok: false, why: "slots" });
    expect(wearCharms(p, ["charmApron", "charmApron"])).toEqual({ ok: false, why: "slots" });
    expect(wearCharms(p, ["charmFloat"])).toEqual({ ok: false, why: "none" });
    expect(wearCharms(p, ["noSuch"])).toEqual({ ok: false, why: "none" });
    p = done(wearCharms(p, ["charmHoe", "charmApron"])).purse;
    expect(giftsOf(p).charms).toEqual(["charmHoe", "charmApron"]);
    expect(wearing(p, "charmHoe") && wearing(p, "charmApron") && !wearing(p, "charmNet")).toBe(true);
    expect(charmBy(p, "charmHoe")).toBe(1.5);
    expect(charmBy(p, "charmNet")).toBe(1);
    expect(charmBy(p, "charmLamp", 0)).toBe(0);
    expect(charmBy({ gifts: { had: ["charmLamp"], charms: ["charmLamp"] } }, "charmLamp", 0)).toBe(5);
    p = done(wearCharms(p, ["charmNet"])).purse;
    expect(giftsOf(p).charms).toEqual(["charmNet"]);
    p = done(wearCharms(p, [])).purse;
    expect(giftsOf(p)).toEqual({ had: ["charmApron", "charmHoe", "charmNet"], charms: [], owed: 0, familiar: null, used: {} });
  });

  it("one familiar follows at a time: one had, changed as often as one likes, or none; and it does its work only while it follows", () => {
    let p: Purse = { ...newPurse(), gifts: { had: ["famSquirrel", "famGnome", "charmHoe"], charms: ["charmHoe"] } };
    expect(familiarOf(p)).toBeNull();
    expect(wearFamiliar(p, "famButterfly")).toEqual({ ok: false, why: "none" });
    expect(wearFamiliar(p, "charmHoe")).toEqual({ ok: false, why: "none" });
    expect(wearFamiliar(p, "noSuch")).toEqual({ ok: false, why: "none" });
    p = done(wearFamiliar(p, "famSquirrel")).purse;
    expect(familiarOf(p)).toBe("famSquirrel");
    expect(famBy(p, "famSquirrel")).toBe(2);
    expect(famBy(p, "famGnome")).toBe(0);
    // (the charms worn are as they were, and a familiar takes no place of theirs)
    expect(giftsOf(p).charms).toEqual(["charmHoe"]);
    p = done(wearFamiliar(p, "famGnome")).purse;
    expect(familiarOf(p)).toBe("famGnome");
    expect(famBy(p, "famGnome")).toBe(10);
    expect(famBy(p, "famSquirrel", 0)).toBe(0);
    p = done(wearFamiliar(p, null)).purse;
    expect(familiarOf(p)).toBeNull();
    expect(giftsOf(p).had).toEqual(["famSquirrel", "famGnome", "charmHoe"]);
    // (a charm cannot be worn as a familiar is, nor a familiar as a charm)
    expect(wearCharms(p, ["famGnome"])).toEqual({ ok: false, why: "none" });
  });

  it("a gift works for whoever has it: a charm when it is worn, a familiar when it follows", () => {
    const p = { gifts: { had: ["charmHoe", "charmNet", "famGnome", "famSquirrel"], charms: ["charmHoe"], familiar: "famGnome" } };
    expect(works(p, "charmHoe")).toBe(true);
    expect(works(p, "charmNet")).toBe(false);
    expect(works(p, "famGnome")).toBe(true);
    expect(works(p, "famSquirrel")).toBe(false);
    expect(works(p, "famButterfly")).toBe(false);
    expect(works(p, "noSuchGift")).toBe(false);
    expect(works({}, "charmHoe")).toBe(false);
  });

  it("what a gift does so many times is counted in the purse, by the stretch of time it is of, and begins again with each", () => {
    const morning = at("2026-10-06T08:00:00"), noon = at("2026-10-06T12:00:00"), next = at("2026-10-07T08:00:00");
    const rule = USES.famGnome!;
    expect(rule).toEqual({ n: FAMILIARS.famGnome, per: "meal" });
    // (a day is from dawn; a meal's hours are a third of it)
    expect(stretchOf("day", morning)).toBe(stretchOf("day", noon));
    expect(stretchOf("meal", morning)).not.toBe(stretchOf("meal", noon));
    expect(stretchOf("day", at("2026-10-07T04:00:00"))).toBe(stretchOf("day", morning));
    expect(stretchOf("meal", at("2026-10-07T04:00:00"))).toBe(stretchOf("meal", at("2026-10-06T19:00:00")));
    let p: Pick<Purse, "gifts"> = { gifts: { had: ["famGnome", "charmHoe"], charms: ["charmHoe"], familiar: "famGnome" } };
    expect(usesLeft(p, "famGnome", morning)).toBe(rule.n);
    for (let i = 1; i <= rule.n; i++) {
      const did = useGift(p, "famGnome", morning + i * 1000);
      expect(did.ok && did.left).toBe(rule.n - i);
      if (did.ok) p = did.purse;
    }
    expect(usedOf(p, "famGnome", morning)).toBe(rule.n);
    // (no more in these hours; what I wear and what follows me is as it was)
    expect(useGift(p, "famGnome", morning)).toEqual({ ok: false, why: "spent" });
    expect(giftsOf(p)).toMatchObject({ had: ["famGnome", "charmHoe"], charms: ["charmHoe"], familiar: "famGnome" });
    // (another meal's hours, and another day's same hours: all of them again)
    expect(usesLeft(p, "famGnome", noon)).toBe(rule.n);
    expect(usesLeft(p, "famGnome", next)).toBe(rule.n);
    const again = useGift(p, "famGnome", noon);
    expect(again.ok && again.left).toBe(rule.n - 1);
    // (one that does not follow me, one I have not, one that is not counted, and what is no gift: nothing to use)
    expect(useGift({ gifts: { had: ["famGnome"], charms: [] } }, "famGnome", morning)).toEqual({ ok: false, why: "none" });
    expect(useGift({ gifts: { had: [], charms: [], familiar: "famGnome" } }, "famGnome", morning)).toEqual({ ok: false, why: "none" });
    expect(useGift(p, "charmHoe", morning)).toEqual({ ok: false, why: "none" });
    expect(useGift(p, "noSuchGift", morning)).toEqual({ ok: false, why: "none" });
    expect(usesLeft(p, "charmHoe", morning)).toBe(0);
    // (a count kept wrongly counts for nothing)
    const k = stretchOf("meal", morning), bad = (used: unknown) => ({ gifts: { had: ["famGnome"], charms: [], familiar: "famGnome", used } }) as Pick<Purse, "gifts">;
    for (const used of ["x", [1], { famGnome: "3" }, { famGnome: { k, n: "3" } }, { famGnome: { k: k + 1, n: 3 } }, { famGnome: { k, n: -4 } }, { famGnome: null }]) expect(usedOf(bad(used), "famGnome", morning)).toBe(0);
    expect(usedOf(bad({ famGnome: { k, n: 3.7 } }), "famGnome", morning)).toBe(3);
    expect(usesLeft(bad({ famGnome: { k, n: 99 } }), "famGnome", morning)).toBe(0);
  });

  it("the catalog's row says the places, and of each gift which rank of which line gives it and its number", () => {
    const row = giftsRow();
    expect(row.slots).toBe(2);
    expect(Object.keys(row.gifts).sort()).toEqual([...CHARM_IDS, ...FAMILIAR_IDS].sort());
    expect(row.gifts.famGnome).toEqual({ kind: "familiar", line: "farming", rank: 2, by: 10 });
    // (the float and the net do something that is no number: theirs is 1, which does nothing where a rule multiplies by it)
    expect(row.gifts.charmFloat).toEqual({ kind: "charm", line: "fishing", rank: 1, by: 1 });
    expect(row.gifts.charmNet.by).toBe(1);
    expect(row.gifts.charmApron.by).toBe(1);
    expect(row.gifts.charmGloves.by).toBe(0.5);
  });
});

describe("what the charms the database judges do", () => {
  const worn = (...ids: string[]): Purse => ({ ...newPurse(), gifts: { had: ids, charms: ids } });

  it("the whispering float tells what is coming, and no longer lengthens the strike's moment (the owner, 2026-10-07)", () => {
    const bare = newPurse(), had: Purse = { ...bare, gifts: { had: ["charmFloat"], charms: [] } };
    expect(strikeWindowOf(bare, NOON)).toBeCloseTo(STRIKE.window);
    expect(strikeWindowOf(had, NOON)).toBeCloseTo(STRIKE.window);
    expect(strikeWindowOf(worn("charmFloat"), NOON)).toBeCloseTo(STRIKE.window);
    expect(CHARMS.charmFloat).toBe(1);
    // (the rule still reads a charm's number, and one never shrinks the moment)
    expect(strikeOf(STRIKE.window * 1.2)).toBeNull();
    expect(strikeOf(STRIKE.window * 1.2, { charm: 1.5 })).toBe("late");
    expect(strikeOf(STRIKE.window * 0.9, { charm: 0.2 })).toBe("late");
  });

  it("what is left to pay of a cost: a half kept exact, in whole points, the rest of a point owed to the next time", () => {
    const before: Purse = { ...newPurse(), stamina: { day: 20732, left: 50 } };
    const now = 20732 * 86_400_000 + 8 * 3_600_000;
    const after = (cost: number): Purse => ({ ...before, stamina: { day: before.stamina.day, left: before.stamina.left - cost } });
    const paid = (cost: number, owed = 0) => { const d = eased(before, after(cost), now, 0.5, owed); return [50 - staminaOf(d.purse, now), d.owed]; };
    expect(staminaOf(before, now)).toBe(50);
    expect([0, 1, 2, 3, 4, 7].map((c) => paid(c))).toEqual([[0, 0], [0, 0.5], [1, 0], [1, 0.5], [2, 0], [3, 0.5]]);
    expect([0, 1, 2, 3].map((c) => paid(c, 0.5))).toEqual([[0, 0.5], [1, 0], [1, 0.5], [2, 0]]);
    // (nothing off, with the whole to pay; an owing that is no part of a point is none)
    expect(eased(before, after(4), now, 1)).toEqual({ purse: after(4), owed: 0 });
    expect(paid(1, 3)).toEqual([0, 0.5]);
    // (somebody already at none pays nothing, and owes nothing more for it)
    const none: Purse = { ...before, stamina: { day: before.stamina.day, left: 0 } };
    expect(eased(none, none, now, 0.5, 0.5)).toEqual({ purse: none, owed: 0.5 });
  });

  it("the gardener's gloves: work on somebody else's plant takes half the stamina over time, one's own the whole, and without them the whole", () => {
    const plant = (by: string): Plant => ({ by, crop: "kangkong", sown: NOON - 3_600_000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 });
    const plot = (by: string): Plot => ({ soil: "tilled", plant: plant(by) });
    const can = (p: Purse): Purse => {
      const bag = put(p.bag, "can" as ItemId, 1), slot = bag.findIndex((s) => s?.item === "can");
      return done(hold({ ...p, bag: bag.map((s, i) => (i === slot && s ? { ...s, water: 5 } : s)) }, slot)).purse;
    };
    const water = (p: Purse, by: string, bedBy: string) => done(tend("1,1", plot(by), { by: bedBy, tended: NOON, empty: 0 }, 1, 0, p, "me", NOON)).purse;
    const cost = (p: Purse, q: Purse) => staminaOf(p, NOON) - staminaOf(q, NOON);
    const full = FARMING.costs.water, bare = can(newPurse()), gloves = can(worn("charmGloves"));
    expect(full).toBe(1);
    expect(cost(bare, water(bare, "you", "you"))).toBe(1);
    // (four waterings of somebody else's plants: two points, where they were four)
    let p = gloves; const paid: number[] = [];
    for (let i = 0; i < 4; i++) { const q = water(p, "you", "you"); paid.push(cost(p, q)); p = q; }
    expect(paid).toEqual([0, 1, 0, 1]);
    expect(giftsOf(p).owed).toBe(0);
    // (one's own plant: the whole, and nothing owed for it; a plant of somebody else's in a bed that is mine: theirs still)
    expect(cost(gloves, water(gloves, "me", "me"))).toBe(1);
    expect(giftsOf(water(gloves, "me", "me")).owed).toBe(0);
    expect(giftsOf(water(gloves, "you", "me")).owed).toBe(0.5);
    // (the gloves had and not worn do nothing)
    const off = can({ ...newPurse(), gifts: { had: ["charmGloves"], charms: [] } });
    expect(cost(off, water(off, "you", "you"))).toBe(1);
    expect(gloved(off, water(off, "you", "you"), NOON).gifts?.owed ?? 0).toBe(0);
  });
});
