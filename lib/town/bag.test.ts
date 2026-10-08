import { describe, expect, it } from "vitest";
import { KIND_ORDER, moveSlot, sortBag, sorted, sortedSlot } from "./bag";
import { ITEMS, type ItemId, type ItemKind } from "./items";
import { handOf, held, hold, newPurse, type Purse, type Stack } from "./trade";

const bagOf = (...slots: Array<Stack | [ItemId, number] | null>): Purse => ({ ...newPurse(), bag: slots.map((s) => (Array.isArray(s) ? { item: s[0], n: s[1] } : s)) });
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const items = (p: Purse) => p.bag.map((s) => (s ? `${s.item}×${s.n}` : null));
const pot = (dish: ItemId, left: number): Stack => ({ item: "potFull", n: 1, of: { dish, left } } as Stack);
const count = (p: Purse) => { const all: Record<string, number> = {}; for (const s of p.bag) if (s) all[s.item] = (all[s.item] ?? 0) + s.n; return all; };

describe("a thing moved in the bag (a member: \"ลากวางได้\")", () => {
  it("goes into an empty slot, and leaves its own empty", () => {
    const p = done(moveSlot(bagOf(["hoe", 1], null, ["kangkong", 5], null), 2, 1)).purse;
    expect(items(p)).toEqual(["hoe×1", "kangkong×5", null, null]);
  });

  it("changes places with another thing", () => {
    const p = done(moveSlot(bagOf(["hoe", 1], ["kangkong", 5]), 0, 1)).purse;
    expect(items(p)).toEqual(["kangkong×5", "hoe×1"]);
  });

  it("joins more of the same thing as far as a slot holds, what does not fit staying where it was", () => {
    const stack = ITEMS.kangkong.stack;
    expect(items(done(moveSlot(bagOf(["kangkong", 5], ["kangkong", 3]), 0, 1)).purse)).toEqual([null, "kangkong×8"]);
    expect(items(done(moveSlot(bagOf(["kangkong", stack - 2], ["kangkong", 5]), 1, 0)).purse)).toEqual([`kangkong×${stack}`, "kangkong×3"]);
    // (onto a full slot of it there is nothing to join: they change places)
    expect(items(done(moveSlot(bagOf(["kangkong", 3], ["kangkong", stack]), 0, 1)).purse)).toEqual([`kangkong×${stack}`, "kangkong×3"]);
  });

  it("never joins what holds something: two pots of one dish change places, each with its own food", () => {
    const p = done(moveSlot(bagOf(pot("riceBox", 3), pot("riceBox", 1)), 0, 1)).purse;
    expect(p.bag.map((s) => s?.of?.left)).toEqual([1, 3]);
    const cans = done(moveSlot(bagOf({ item: "can", n: 1, water: 6 }, { item: "can", n: 1 }), 0, 1)).purse;
    expect(cans.bag.map((s) => s?.water ?? 0)).toEqual([0, 6]);
  });

  it("is refused for a slot the bag has not, the same slot, an empty slot to move from, and no slot at all", () => {
    const p = bagOf(["hoe", 1], null);
    for (const [from, to] of [[0, 2], [-1, 0], [0, 0], [1, 0], [0.5, 1], [0, Number.NaN]]) expect(moveSlot(p, from, to)).toEqual({ ok: false, why: "none" });
  });

  it("makes nothing and loses nothing, leaves the bag its slots, the purse it was given untouched, and the hand as it was", () => {
    const before = done(hold(bagOf(["hoe", 1], ["kangkong", 5], null, ["kangkong", 19], pot("riceBox", 2)), 0)).purse, kept = JSON.stringify(before);
    for (const [from, to] of [[0, 2], [1, 3], [3, 1], [4, 0], [0, 4]]) {
      const after = done(moveSlot(before, from, to)).purse;
      expect(count(after)).toEqual(count(before));
      expect(after.bag).toHaveLength(before.bag.length);
      expect(handOf(after)).toBe("hoe");
    }
    expect(JSON.stringify(before)).toBe(kept);
  });
});

describe("a bag sorted (a member: \"ขอ function sort ของในกระเป๋า\")", () => {
  it("has its things from the first slot on with no gap, by kind and then by the thing", () => {
    const p = sortBag(bagOf(["kangkong", 5], null, ["worm", 3], ["hoe", 1], null, ["seedKangkong", 2], ["can", 1], ["minnow", 4]));
    expect(items(p)).toEqual(["can×1", "hoe×1", "seedKangkong×2", "worm×3", "kangkong×5", "minnow×4", null, null]);
  });

  it("knows every kind of thing there is", () => {
    const kinds = new Set<ItemKind>((Object.keys(ITEMS) as ItemId[]).map((id) => ITEMS[id].kind));
    expect([...kinds].filter((k) => !KIND_ORDER.includes(k))).toEqual([]);
    expect(new Set(KIND_ORDER).size).toBe(KIND_ORDER.length);
  });

  it("brings split stacks of one thing together into as few slots as hold them, the full ones first", () => {
    const stack = ITEMS.kangkong.stack;
    const p = sortBag(bagOf(["kangkong", 5], ["hoe", 1], ["kangkong", stack - 1], ["kangkong", 7]));
    expect(items(p)).toEqual(["hoe×1", `kangkong×${stack}`, "kangkong×11", null]);
    expect(held(p.bag, "kangkong")).toBe(stack + 11);
  });

  it("keeps what holds something as it is: each pot its food, each can its water, never joined", () => {
    const p = sortBag(bagOf(pot("riceBox", 1), { item: "can", n: 1 }, pot("riceBox", 3), { item: "can", n: 1, water: 6 }, ["bowl", 2], ["bowl", 2]));
    expect(p.bag.map((s) => (s ? [s.item, s.n, s.of?.left ?? null, s.water ?? null] : null))).toEqual([
      ["bowl", 3, null, null], ["bowl", 1, null, null], ["can", 1, null, 6], ["can", 1, null, null], ["potFull", 1, 3, null], ["potFull", 1, 1, null],
    ]);
  });

  it("makes nothing and loses nothing, leaves the bag its slots and the hand as it was, and comes out the same sorted again", () => {
    const before = done(hold(bagOf(["minnow", 2], null, ["hoe", 1], ["kangkong", 19], pot("riceBox", 2), ["kangkong", 19], null, ["worm", 20], ["worm", 1]), 2)).purse;
    const after = sortBag(before);
    expect(count(after)).toEqual(count(before));
    expect(after.bag).toHaveLength(before.bag.length);
    expect(handOf(after)).toBe("hoe");
    expect(sortBag(after).bag).toEqual(after.bag);
    expect(sorted(after)).toBe(true);
    expect(sorted(before)).toBe(false);
  });

  it("knows a bag in order when its stacks were written down otherwise (the database's order of a stack's words is its own)", () => {
    const after = sortBag(bagOf(["kangkong", 5], ["hoe", 1], pot("riceBox", 2)));
    const asKept: Purse = { ...after, bag: after.bag.map((s) => (s ? (Object.fromEntries(Object.entries(s).reverse()) as unknown as Stack) : null)) };
    expect(JSON.stringify(asKept.bag)).not.toBe(JSON.stringify(after.bag));
    expect(sorted(asKept)).toBe(true);
  });

  it("keeps whole a stack with anything hung on it but what it is and how many, and such stacks alike in all else as they stood", () => {
    const marked = (n: number, mark: string) => ({ item: "kangkong", n, mark } as unknown as Stack);
    const p = sortBag(bagOf(marked(2, "b"), ["kangkong", 4], marked(2, "a"), ["kangkong", 3]));
    expect(p.bag.map((s) => (s ? [s.n, (s as unknown as { mark?: string }).mark ?? null] : null))).toEqual([[7, null], [2, "b"], [2, "a"], null]);
    expect(items(done(moveSlot(bagOf(marked(2, "b"), ["kangkong", 4]), 0, 1)).purse)).toEqual(["kangkong×4", "kangkong×2"]);
  });

  it("says where the thing in a slot is afterwards: of two pots of one dish the one that was meant, and of a stack brought together nothing", () => {
    const p = bagOf(pot("riceBox", 1), ["kangkong", 5], ["hoe", 1], pot("riceBox", 3), null, ["kangkong", 3]);
    const after = sortBag(p);
    expect(after.bag[sortedSlot(p, 0)!]?.of?.left).toBe(1);
    expect(after.bag[sortedSlot(p, 3)!]?.of?.left).toBe(3);
    expect(after.bag[sortedSlot(p, 2)!]?.item).toBe("hoe");
    // (the five and the three are one stack of eight now: neither is anywhere)
    expect(sortedSlot(p, 1)).toBeNull();
    expect(sortedSlot(p, 4)).toBeNull();
    // (a stack that was whole already is where it is)
    const q = bagOf(["worm", 2], ["hoe", 1]);
    expect(sortedSlot(q, 0)).toBe(1);
    expect(sortBag(q).bag[1]).toEqual({ item: "worm", n: 2 });
  });

  it("is the same whichever order the things lay in", () => {
    const things: Array<Stack | [ItemId, number] | null> = [["kangkong", 5], ["worm", 3], ["hoe", 1], ["seedKangkong", 2], pot("riceBox", 2), ["kangkong", 18], null, { item: "can", n: 1, water: 4 }];
    const first = JSON.stringify(sortBag(bagOf(...things)).bag);
    for (let turn = 1; turn < things.length; turn++) expect(JSON.stringify(sortBag(bagOf(...things.slice(turn), ...things.slice(0, turn))).bag)).toBe(first);
    expect(JSON.stringify(sortBag(bagOf(...[...things].reverse())).bag)).toBe(first);
  });
});
