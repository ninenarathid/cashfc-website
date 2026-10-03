import { describe, expect, it } from "vitest";
import { DEAL, agree, hasAll, lay, newDeal, sideOf, swap, tidyGive, type Deal } from "./deal";
import type { ItemId } from "./items";
import { handOf, held, hold, newPurse, put, type Purse } from "./trade";

const purseWith = (slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, coins: 50, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const open = () => newDeal("fisher", "cook", { a: "Fisher", b: "Cook" }, 1);
/** A deal both have laid their side of and given their word to. */
function agreed(a: Purse, b: Purse, giveA: Array<[ItemId, number]>, giveB: Array<[ItemId, number]>): Deal {
  let deal = done(lay(open(), "fisher", a, giveA)).deal;
  deal = done(lay(deal, "cook", b, giveB)).deal;
  deal = done(agree(deal, "fisher")).deal;
  return done(agree(deal, "cook")).deal;
}

describe("a deal between two (the owner: \"ระบบ เทรด แลกเปลี่ยน item สำหรับผู้เล่นด้วยกันเอง\")", () => {
  it("is laid out by each from their own bag, and either changing their side takes back both words", () => {
    const fisher = purseWith(5, ["snakehead", 2], ["minnow", 6]), cook = purseWith(5, ["tomYum", 3]);
    let deal = open();
    expect(sideOf(deal, "fisher")).toBe("a");
    expect(sideOf(deal, "cook")).toBe("b");
    expect(sideOf(deal, "somebody")).toBeNull();
    deal = done(lay(deal, "fisher", fisher, [["snakehead", 1], ["minnow", 2], ["minnow", 1]])).deal;
    expect(deal.give.a).toEqual([["snakehead", 1], ["minnow", 3]]);
    deal = done(agree(deal, "fisher")).deal;
    expect(deal.ok).toEqual({ a: true, b: false });
    // the cook lays out their side: the fisher's word is taken back with it
    deal = done(lay(deal, "cook", cook, [["tomYum", 2]])).deal;
    expect(deal.ok).toEqual({ a: false, b: false });
    // nobody lays out what they do not have, nor more kinds than a deal takes; a stranger lays out nothing
    expect(lay(deal, "cook", cook, [["tomYum", 4]])).toEqual({ ok: false, why: "none" });
    expect(lay(deal, "cook", cook, [["koi", 1]])).toEqual({ ok: false, why: "none" });
    expect(lay(deal, "somebody", cook, [["tomYum", 1]])).toEqual({ ok: false, why: "none" });
    expect(tidyGive([["minnow", 0], ["minnow", 1.5], ["rice", 2]])).toEqual([["rice", 2]]);
    expect(DEAL.kinds).toBeGreaterThanOrEqual(6);
    // a word can be taken back
    expect(done(agree(done(agree(deal, "cook")).deal, "cook", false)).deal.ok.b).toBe(false);
  });

  it("changes everything hands at once, when both have given their word", () => {
    const fisher = purseWith(5, ["snakehead", 2], ["minnow", 6]), cook = purseWith(5, ["tomYum", 3], ["bowl", 1]);
    const deal = agreed(fisher, cook, [["snakehead", 1], ["minnow", 4]], [["tomYum", 2]]);
    const d = done(swap(deal, fisher, cook));
    expect(held(d.a.bag, "snakehead")).toBe(1);
    expect(held(d.a.bag, "minnow")).toBe(2);
    expect(held(d.a.bag, "tomYum")).toBe(2);
    expect(held(d.b.bag, "snakehead")).toBe(1);
    expect(held(d.b.bag, "minnow")).toBe(4);
    expect(held(d.b.bag, "tomYum")).toBe(1);
    // coins are nobody's to hand over
    expect(d.a.coins).toBe(50);
    expect(d.b.coins).toBe(50);
    // without both words, nothing
    const half = done(agree(done(lay(open(), "fisher", fisher, [["minnow", 1]])).deal, "fisher")).deal;
    expect(swap(half, fisher, cook)).toEqual({ ok: false, why: "none" });
  });

  it("is a gift when one side is empty", () => {
    const fisher = purseWith(5, ["minnow", 6]), cook = purseWith(5);
    const d = done(swap(agreed(fisher, cook, [["minnow", 6]], []), fisher, cook));
    expect(held(d.a.bag, "minnow")).toBe(0);
    expect(held(d.b.bag, "minnow")).toBe(6);
  });

  it("does nothing at all when a bag has no room, or what was laid out is no longer there", () => {
    const fisher = purseWith(2, ["snakehead", 1], ["rod", 1]), cook = purseWith(2, ["tomYum", 1], ["pot", 1]);
    // each gives one kind and gets one: the slot given up is the slot filled
    expect(swap(agreed(fisher, cook, [["snakehead", 1]], [["tomYum", 1]]), fisher, cook).ok).toBe(true);
    // the cook's bag is full of other things and gives nothing: no room for the fish
    const deal = agreed(fisher, cook, [["snakehead", 1]], []);
    expect(swap(deal, fisher, cook)).toEqual({ ok: false, why: "full" });
    // the fish was eaten in the meantime
    const eaten: Purse = { ...fisher, bag: fisher.bag.map((s) => (s?.item === "snakehead" ? null : s)) };
    expect(hasAll(eaten, deal.give.a)).toBe(false);
    expect(swap(agreed(fisher, purseWith(5), [["snakehead", 1]], []), eaten, purseWith(5))).toEqual({ ok: false, why: "none" });
  });

  it("hands over a thing that holds something as it is: a pot with its food, a can with its water", () => {
    const cook: Purse = { ...purseWith(5), bag: [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, { item: "can", n: 1, water: 5 }, { item: "can", n: 1 }, null, null] };
    const friend = purseWith(5, ["minnow", 2]);
    const d = done(swap(agreed(cook, friend, [["potFull", 1], ["can", 1]], [["minnow", 2]]), cook, friend));
    expect(d.b.bag.find((s) => s?.item === "potFull")).toEqual({ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } });
    // (the last can in the bag goes: the empty one; the one with water stays)
    expect(d.b.bag.filter((s) => s?.item === "can")).toEqual([{ item: "can", n: 1 }]);
    expect(d.a.bag.filter((s) => s?.item === "can")).toEqual([{ item: "can", n: 1, water: 5 }]);
    expect(held(d.a.bag, "minnow")).toBe(2);
  });

  it("leaves the hand empty when what it held has gone", () => {
    const fisher = done(hold(purseWith(5, ["rod", 1], ["minnow", 2]), 0)).purse, friend = purseWith(5);
    expect(handOf(fisher)).toBe("rod");
    const d = done(swap(agreed(fisher, friend, [["rod", 1]], []), fisher, friend));
    expect(handOf(d.a)).toBeNull();
    expect(held(d.b.bag, "rod")).toBe(1);
  });
  it("may have coins in it: a thing bought and sold, not only swapped (the owner: \"อย่าลืมทำระบบเทรด item หรือ popoto coin ให้ด้วย\")", () => {
    const fisher = purseWith(5, ["snakehead", 1]), cook = purseWith(5);   // fifty coins each
    let deal = done(lay(open(), "fisher", fisher, [["snakehead", 1]])).deal;
    deal = done(agree(deal, "fisher")).deal;
    // coins laid beside the things take both words back, like any change
    deal = done(lay(deal, "cook", cook, [], 30)).deal;
    expect(deal.coins).toEqual({ a: 0, b: 30 });
    expect(deal.ok).toEqual({ a: false, b: false });
    // more than is in the purse; no whole amount; less than nothing
    expect(lay(deal, "cook", cook, [], 51)).toEqual({ ok: false, why: "coins" });
    expect(lay(deal, "cook", cook, [], 1.5)).toEqual({ ok: false, why: "amount" });
    expect(lay(deal, "cook", cook, [], -1)).toEqual({ ok: false, why: "amount" });
    deal = done(agree(done(agree(deal, "fisher")).deal, "cook")).deal;
    const d = done(swap(deal, fisher, cook));
    expect([d.a.coins, d.b.coins]).toEqual([80, 20]);
    expect(held(d.a.bag, "snakehead")).toBe(0);
    expect(held(d.b.bag, "snakehead")).toBe(1);
    // the coins spent since they were laid out: nothing changes hands
    expect(swap(deal, fisher, { ...cook, coins: 29 })).toEqual({ ok: false, why: "coins" });
    // coins for nothing are a gift, like things for nothing; and coins both ways come to their difference
    const gift = done(agree(done(agree(done(lay(open(), "fisher", fisher, [], 7)).deal, "fisher")).deal, "cook")).deal;
    expect(done(swap(gift, fisher, cook)).b.coins).toBe(57);
    let both = done(lay(open(), "fisher", fisher, [], 10)).deal;
    both = done(lay(both, "cook", cook, [], 4)).deal;
    both = done(agree(done(agree(both, "fisher")).deal, "cook")).deal;
    const e = done(swap(both, fisher, cook));
    expect([e.a.coins, e.b.coins]).toEqual([44, 56]);
    // a deal kept from before there were coins in one is a deal with none
    const old = { ...agreed(fisher, cook, [["snakehead", 1]], []), coins: undefined } as unknown as Deal;
    expect(done(swap(old, fisher, cook)).a.coins).toBe(50);
  });
});

describe("the map's own number for how near two stand", () => {
  it("is the rule's", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../../components/town/Town.tsx", import.meta.url), "utf8");
    expect(src).toContain(`const DEAL_NEAR = ${DEAL.near};`);
  });
});
