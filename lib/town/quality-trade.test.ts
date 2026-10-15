import { describe, expect, it } from "vitest";
import { pick, type Plant, type Plot } from "./farm";
import { ITEMS } from "./items";
import { harvestOf } from "./quality-plant";
import { collect, held, leave, newPurse, plainStack, put, roomFor, roundOf, take, takeBack, waiting, wholeStack, type Purse } from "./trade";
import { fits } from "./box";
import { pull, push } from "./deal";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
const bagOf = (...slots: Purse["bag"]): Purse => ({ ...newPurse(), bag: [...slots, ...Array(10 - slots.length).fill(null)] });

describe("graded produce in the bag", () => {
  it("joins stacks only of the same grade, and counts each grade apart", () => {
    let bag = put(bagOf().bag, "tomato", 5, 2);
    bag = put(bag, "tomato", 3);
    bag = put(bag, "tomato", 4, 2);
    expect(bag.filter(Boolean)).toEqual([{ item: "tomato", n: 9, grade: 2 }, { item: "tomato", n: 3 }]);
    expect([held(bag, "tomato"), held(bag, "tomato", 2), held(bag, "tomato", 0), held(bag, "tomato", 3)]).toEqual([12, 9, 3, 0]);
    expect(roomFor(bag, "tomato", 2)).toBe(ITEMS.tomato.stack - 9 + 8 * ITEMS.tomato.stack);
  });

  it("takes the lowest grade first unless a grade is asked for, and a stack left keeps its grade", () => {
    const bag = put(put(bagOf().bag, "tomato", 5, 3), "tomato", 2);
    expect(take(bag, "tomato", 3).filter(Boolean)).toEqual([{ item: "tomato", n: 4, grade: 3 }]);
    expect(take(bag, "tomato", 1, 3).filter(Boolean)).toEqual([{ item: "tomato", n: 4, grade: 3 }, { item: "tomato", n: 2 }]);
  });

  it("is moved whole, never sold by number on a stall or the board", () => {
    expect(plainStack({ item: "tomato", n: 4, grade: 1 })).toBe(false);
    expect(wholeStack({ item: "tomato", n: 4, grade: 1 })).toBe(true);
    expect(plainStack({ item: "tomato", n: 4 })).toBe(true);
  });
});

describe("the uncle's relatives pay by the grade", () => {
  it("leaves a lot of the slot's grade and pays ×1.75 for gold", () => {
    const now = T0, purse = bagOf({ item: "tomato", n: 6, grade: 2 }, { item: "tomato", n: 4 });
    const a = leave(purse, 0, 4, now);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.purse.bag[0]).toEqual({ item: "tomato", n: 2, grade: 2 });
    const b = leave(a.purse, 1, 4, now);
    if (!b.ok) throw new Error(b.why);
    expect(b.purse.left.map((l) => [l.n, l.grade ?? 0])).toEqual([[4, 2], [4, 0]]);
    // a round later the relatives have fetched both: 4 gold at ×1.75 and 4 normal
    const later = now + 13 * H, pays = ITEMS.tomato.pays;
    expect(roundOf(later)).toBeGreaterThan(roundOf(now));
    expect(waiting(b.purse, later).coins).toBe(Math.floor(4 * pays * 1.75 + 4 * pays));
    const got = collect(b.purse, later);
    expect(got.ok && got.coins).toBe(Math.floor(4 * pays * 1.75 + 4 * pays));
  });

  it("gives a lot back at its grade", () => {
    const left = leave(bagOf({ item: "tomato", n: 3, grade: 3 }), 0, 3, T0);
    if (!left.ok) throw new Error(left.why);
    const back = takeBack(left.purse, 0, T0);
    expect(back.ok && back.purse.bag[0]).toEqual({ item: "tomato", n: 3, grade: 3 });
  });
});

describe("a pick rolls each fruit's Quality", () => {
  // a tomato cared for well all its round: half of every bar (48), brushed
  const plant: Plant = { by: "me", crop: "tomato", sown: T0, boost: 0, watered: 0, fed: 0, cured: 0, picked: 0, pickedAt: 0,
    q: { at: T0 + 80 * H, span: 1, area: [0.5, 0.5, 0.5, 0.5], nar: [0, 0, 0] }, brushed: T0 + H, guard: T0 + 300 * H };
  const plot: Plot = { soil: "tilled", plant };

  it("puts each grade in its own stack, the same fruits on every try", () => {
    const now = T0 + 80 * H, me = bagOf();
    const did = pick("3,3", me, plot, true, null, now);
    if (!did.ok) throw new Error(did.why);
    const fruits = did.fruits!;
    expect(fruits.range).toEqual({ lo: 28, hi: 48 });
    expect(fruits.values.every((v) => v >= 28 && v <= 48)).toBe(true);
    expect(did.got).toEqual([["tomato", fruits.values.length]]);
    const silver = fruits.values.filter((v) => v >= 40).length, normal = fruits.values.length - silver;
    expect(held(did.purse.bag, "tomato", 1)).toBe(silver);
    expect(held(did.purse.bag, "tomato", 0)).toBe(normal);
    expect(harvestOf("3,3", plant, fruits.values.length, now).values).toEqual(fruits.values);
  });

  it("refuses a bag without room for every grade it gives, and draws the same fruits again", () => {
    const now = T0 + 80 * H, n = harvestOf("3,3", plant, 8, now);
    // a bag full but for one slot that holds one grade only
    const full: Purse = { ...newPurse(), bag: [...Array(9).fill({ item: "salt", n: 1 }), null] };
    const did = pick("3,3", full, plot, true, null, now);
    if (n.groups.length > 1) expect(did.ok ? "ok" : did.why).toBe("full");
    expect(harvestOf("3,3", plant, 8, now).values).toEqual(n.values);
  });
});

describe("graded produce moves with its grade", () => {
  it("joins its own grade in a box or a bag it is pushed into, and fits whole in one slot", () => {
    const into = put([null, null, ...Array(3).fill({ item: "salt", n: 1 })], "tomato", 4, 2);
    expect(fits(into, { item: "tomato", n: 9, grade: 2 })).toBe(9);
    const out = push(into, [{ item: "tomato", n: 9, grade: 2 }, { item: "tomato", n: 2 }])!;
    expect(out.filter((s) => s?.item === "tomato")).toEqual([{ item: "tomato", n: 13, grade: 2 }, { item: "tomato", n: 2 }]);
  });

  it("gives only normal stock when a deal names a thing by its kind, and a graded stack only by its slot", () => {
    const bag = put(put(bagOf().bag, "tomato", 3, 3), "tomato", 2);
    const byKind = pull(bag, [["tomato", 2]]);
    expect(byKind.stacks).toEqual([{ item: "tomato", n: 2 }]);
    expect(held(byKind.bag, "tomato", 3)).toBe(3);
    const bySlot = pull(bag, [["tomato", 3, { slot: 0, stack: { item: "tomato", n: 3, grade: 3 } }]]);
    expect(bySlot.stacks).toEqual([{ item: "tomato", n: 3, grade: 3 }]);
  });
});
