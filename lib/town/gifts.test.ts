import { describe, expect, it } from "vitest";
import { FARMING, tend, type Plant, type Plot } from "./farm";
import { STRIKE, strikeOf, strikeWindowOf } from "./fishing";
import { CHARMS, CHARM_IDS, GIFTS, charmBy, dueOf, giftAt, giftsOf, giftsRow, gloved, leftOf, takeGift, wearCharms, wearing } from "./gifts";
import type { ItemId } from "./items";
import { LINES, LINE_IDS } from "./lines";
import { eased, staminaOf } from "./stamina";
import { hold, newPurse, put, type Purse } from "./trade";

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-06T12:00:00");
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const first = (line: string) => LINES[line as (typeof LINE_IDS)[number]].marks[0];

describe("the gifts of the lines of work", () => {
  it("are the first rank of every line but the well's, each a charm with its words in both languages", () => {
    expect(GIFTS.map((g) => g.line).sort()).toEqual(LINE_IDS.filter((l) => l !== "well").sort());
    for (const g of GIFTS) {
      expect(g.rank, g.id).toBe(1);
      expect(g.kind, g.id).toBe("charm");
      expect(g.name.th && g.name.en && g.does.th && g.does.en, g.id).toBeTruthy();
      expect(giftAt(g.line, g.rank)?.id, g.id).toBe(g.id);
      expect(CHARMS[g.id], g.id).toBeGreaterThan(0);
    }
    expect(new Set(GIFTS.map((g) => g.id)).size).toBe(GIFTS.length);
    expect(giftAt("well", 1)).toBeNull();
    expect(giftAt("kitchen", 2)).toBeNull();
    expect(giftAt("cooking", 1)).toBeNull();
  });

  it("a purse from before has none, and what is kept is made sound", () => {
    expect(giftsOf(newPurse())).toEqual({ had: [], charms: [], owed: 0 });
    expect(giftsOf({ gifts: { had: ["charmHoe", "charmHoe", "noSuch", 3 as unknown as string], charms: ["charmHoe", "charmNet", "charmHoe"], owed: 7 } })).toEqual({ had: ["charmHoe"], charms: ["charmHoe"], owed: 0 });
    // (no more worn than there are places)
    expect(giftsOf({ gifts: { had: [...CHARM_IDS], charms: ["charmHoe", "charmNet", "charmApron"] } }).charms).toEqual(["charmHoe", "charmNet"]);
    expect(giftsOf({ gifts: null as unknown as Purse["gifts"] })).toEqual({ had: [], charms: [], owed: 0 });
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
    expect(took.purse.gifts).toEqual({ had: ["charmApron"], charms: [], owed: 0 });
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
    expect(charmBy(p, "charmBasket", 0)).toBe(0);
    p = done(wearCharms(p, ["charmNet"])).purse;
    expect(giftsOf(p).charms).toEqual(["charmNet"]);
    p = done(wearCharms(p, [])).purse;
    expect(giftsOf(p)).toEqual({ had: ["charmApron", "charmHoe", "charmNet"], charms: [], owed: 0 });
  });

  it("the catalog's row says which rank of which line gives which, the places, and the two numbers the database judges by", () => {
    const row = giftsRow();
    expect(row.slots).toBe(2);
    expect(Object.keys(row.gifts).sort()).toEqual([...CHARM_IDS].sort());
    expect(row.gifts.charmFloat).toEqual({ kind: "charm", line: "fishing", rank: 1 });
    expect(row.strike).toBe(1.5);
    expect(row.theirs).toBe(0.5);
  });
});

describe("what the charms the database judges do", () => {
  const worn = (...ids: string[]): Purse => ({ ...newPurse(), gifts: { had: ids, charms: ids } });

  it("the whispering float: the strike's moment is half as long again, only while it is worn", () => {
    const bare = newPurse(), had: Purse = { ...bare, gifts: { had: ["charmFloat"], charms: [] } };
    expect(strikeWindowOf(bare, NOON)).toBeCloseTo(STRIKE.window);
    expect(strikeWindowOf(had, NOON)).toBeCloseTo(STRIKE.window);
    expect(strikeWindowOf(worn("charmFloat"), NOON)).toBeCloseTo(STRIKE.window * 1.5);
    // (a strike that would have been too late is a late one with it; a charm never shrinks the moment)
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
