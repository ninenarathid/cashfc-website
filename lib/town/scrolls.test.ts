import { describe, expect, it } from "vitest";
import { FISH_IDS, FLOTSAM_IDS, DISHES, DISH_IDS, ITEMS, SCROLLS, type ItemId } from "./items";
import { INSIDE, SCROLL_OF, foundScrolls, insideOf, open, opens } from "./scrolls";
import { GOODS, held, newPurse, put, type Purse } from "./trade";
import { sources } from "./uses";

const purseWith = (slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };

describe("the scrolls nobody sells (the owner: \"อาหารมีหลายอย่างมาก ทำไมม้วนสูตรมีแค่ 6 อัน\")", () => {
  it("has a scroll for every dish that is cooked: six the uncle sells, every other found in what the river brings up", () => {
    const cooked = DISH_IDS.filter((id) => DISHES[id].recipe);
    for (const dish of cooked) {
      const scroll = SCROLL_OF[dish]!;
      expect(SCROLLS[scroll]).toBe(dish);
      expect(ITEMS[scroll].kind).toBe("scroll");
      // a scroll is of its dish's tier, so that it is found no earlier than its dish can be cooked
      expect(ITEMS[scroll].tier).toBe(ITEMS[dish].tier);
    }
    // and one more, of no dish: how the cure for pests is made, which the uncle sells (the owner, 2026-10-04)
    expect(SCROLLS.scrollPestCure).toBe("pestCure");
    expect(SCROLL_OF.pestCure).toBe("scrollPestCure");
    expect(Object.keys(SCROLLS).length).toBe(cooked.length + 1);
    const sold = (Object.keys(SCROLLS) as ItemId[]).filter((s) => GOODS[s]), found = foundScrolls([1, 2, 3]);
    expect(sold.length).toBe(7);
    expect(sold).toContain("scrollPestCure");
    expect(found.length).toBe(cooked.length - 6);
    expect(new Set([...sold, ...found]).size).toBe(cooked.length + 1);
    // each tier's are in something: the early game's in a boot or a bottle, the last tier's in a chest
    for (const tier of [1, 2, 3] as const) expect((Object.keys(INSIDE) as ItemId[]).some((thing) => INSIDE[thing]!.tiers?.includes(tier))).toBe(true);
    for (const scroll of found) expect((Object.keys(INSIDE) as ItemId[]).some((thing) => insideOf(thing).includes(scroll))).toBe(true);
    // what holds them comes up on a line, and no later than the scrolls in it are of use
    for (const thing of Object.keys(INSIDE) as ItemId[]) {
      expect([...FLOTSAM_IDS, ...FISH_IDS] as ItemId[]).toContain(thing);
      for (const inside of insideOf(thing)) expect(ITEMS[inside]).toBeDefined();
      expect(Math.max(...insideOf(thing).map((x) => ITEMS[x].tier))).toBeGreaterThanOrEqual(ITEMS[thing].tier);
      expect(opens(thing)).toBe(true);
    }
    expect(opens("rod")).toBe(false);
    expect(opens(null)).toBe(false);
    // so every scroll can be had
    const from = sources();
    for (const scroll of Object.keys(SCROLLS) as ItemId[]) expect(from.get(scroll)).toBe(GOODS[scroll] ? "shop" : "river");
  });

  it("opens a boot, a bottle, a chest: the thing is gone, and what was in it is in the bag", () => {
    // a bottle always has one, of the first two tiers' dishes; which is chance
    const bottles = purseWith(5, ["bottle", 3]);
    const first = done(open(bottles, 0, [0, 0])), last = done(open(bottles, 0, [0.999, 0.999999]));
    expect(first.found).toBe(foundScrolls([1, 2])[0]);
    expect(last.found).toBe(foundScrolls([1, 2]).at(-1));
    expect(held(first.purse.bag, "bottle")).toBe(2);
    expect(held(first.purse.bag, first.found!)).toBe(1);
    expect(ITEMS[last.found!].tier).toBeLessThanOrEqual(2);
    // a chest, of the later two
    const chest = done(open(purseWith(5, ["chest", 1]), 0, [0.5, 0.999999]));
    expect(ITEMS[chest.found!].tier).toBeGreaterThanOrEqual(2);
    expect(ITEMS[done(open(purseWith(5, ["chest", 1]), 0, [0.5, 0.5])).found!].tier).toBe(3);
    expect(held(chest.purse.bag, "chest")).toBe(0);
    // an old boot has one now and then, of the early game's; more often it is only a boot, and gone either way
    const boot = purseWith(5, ["boot", 1]);
    expect(ITEMS[done(open(boot, 0, [INSIDE.boot!.chance - 0.01, 0.5])).found!].tier).toBe(1);
    const empty = done(open(boot, 0, [INSIDE.boot!.chance, 0.5]));
    expect(empty.found).toBeNull();
    expect(empty.purse.bag.every((s) => s === null)).toBe(true);
    // every scroll that is found can be the one
    const all = foundScrolls([1, 2]);
    expect(new Set(all.map((_, i) => done(open(bottles, 0, [0, (i + 0.5) / all.length])).found)).size).toBe(all.length);
  });

  it("opens nothing else, and asks for a slot before it says what is inside", () => {
    expect(open(purseWith(5, ["rod", 1]), 0, [0, 0])).toEqual({ ok: false, why: "none" });
    expect(open(purseWith(5), 0, [0, 0])).toEqual({ ok: false, why: "none" });
    // five slots, all taken, and more than one bottle in its slot: no room for what is inside, whatever it is
    const full = purseWith(5, ["bottle", 2], ["rod", 1], ["hoe", 1], ["can", 1], ["pan", 1]);
    expect(open(full, 0, [0, 0])).toEqual({ ok: false, why: "full" });
    expect(open({ ...full, bag: full.bag.map((s) => (s?.item === "bottle" ? { item: "boot" as ItemId, n: 2 } : s)) }, 0, [0.99, 0])).toEqual({ ok: false, why: "full" });
    // the last one of its stack leaves its own slot for it
    const one = purseWith(5, ["bottle", 1], ["rod", 1], ["hoe", 1], ["can", 1], ["pan", 1]);
    expect(done(open(one, 0, [0, 0])).purse.bag[0]?.item).toBe(foundScrolls([1, 2])[0]);
  });
});
