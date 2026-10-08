import { describe, expect, it } from "vitest";
import { HANDY_MOST, handy, handySlots, nextHandy } from "./hand";
import { ITEMS, type ItemId } from "./items";
import { newPurse, put, type Purse, type Stack } from "./trade";

const purseWith = (slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};

describe("the hand's quick bar (a member: \"สลับเครื่องมือในตัวแบบไวๆ ไม่ต้องเปิดช่องเก็บของเพื่อกดถือทุกครั้ง\")", () => {
  it("offers what a deed asks to be in the hand: tools, seed, what is put on a plant, what calls a beetle down", () => {
    for (const id of ["hoe", "can", "rod", "bucket", "bugNet", "potFull", "seedKangkong", "growFert", "pestCure", "ladybird", "resin"] as ItemId[]) expect(handy(id), id).toBe(true);
  });

  it("and not what is only carried: what is grown, caught, cooked or kept to sell", () => {
    for (const id of ["kangkong", "minnow", "riceBox", "salt", "rice"] as ItemId[]) expect(handy(id), id).toBe(false);
  });

  it("every tool and every bag of seed there is, is on it", () => {
    for (const id of Object.keys(ITEMS) as ItemId[]) if (ITEMS[id].kind === "tool" || ITEMS[id].kind === "seed") expect(handy(id), id).toBe(true);
  });

  it("is the bag's own slots in the bag's order, with what is only carried left out", () => {
    const purse = purseWith(10, ["kangkong", 5], ["hoe", 1], ["minnow", 2], ["can", 1], ["seedKangkong", 6]);
    expect(handySlots(purse).map((s) => purse.bag[s]!.item)).toEqual(["hoe", "can", "seedKangkong"]);
    expect(handySlots(purse)).toEqual([1, 3, 4]);
  });

  it("has a kind of thing once (the first slot that has it), but every pot of food", () => {
    const pot = (dish: ItemId): Stack => ({ item: "potFull", n: 1, of: { dish, left: 3 } } as Stack);
    const purse = { ...newPurse(), bag: [{ item: "seedKangkong", n: 20 }, { item: "seedKangkong", n: 4 }, pot("riceBox"), pot("riceBox"), null] as Purse["bag"] };
    expect(handySlots(purse)).toEqual([0, 2, 3]);
  });

  it("never has more than the number keys reach", () => {
    const tools = (Object.keys(ITEMS) as ItemId[]).filter((id) => ITEMS[id].kind === "tool").slice(0, 14);
    const purse = { ...newPurse(), bag: tools.map((item) => ({ item, n: 1 })) as Purse["bag"] };
    expect(tools.length).toBeGreaterThan(HANDY_MOST);
    expect(handySlots(purse)).toHaveLength(HANDY_MOST);
    expect(HANDY_MOST).toBe(9);
  });

  it("goes round: the one after what is held, the first with nothing held or at the end, nothing with an empty bar", () => {
    expect(nextHandy([1, 3, 4], -1)).toBe(1);
    expect(nextHandy([1, 3, 4], 1)).toBe(3);
    expect(nextHandy([1, 3, 4], 4)).toBe(1);
    // (what is held is not on the bar: something only carried, taken up in the bag)
    expect(nextHandy([1, 3, 4], 7)).toBe(1);
    expect(nextHandy([], 2)).toBe(-1);
  });
});
