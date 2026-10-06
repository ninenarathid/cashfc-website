import { describe, expect, it } from "vitest";
import { ITEMS, type ItemId } from "./items";
import { NOTICES } from "./notices";
import { SHOP, alive, beat, buy, canOf, capOf, near, open, sell, told, toldOf, type Shop, type ShopAsk } from "./shop";
import { GOODS, held, newPurse, put, type Purse, type Stack } from "./trade";

const purseWith = (coins: number, slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, coins, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const why = (d: { ok: boolean; why?: string }) => (d.ok ? "ok" : d.why);
const HERE: [number, number] = [30, 40], NOW = Date.parse("2026-10-06T12:00:00+07:00");
const SEEN: ItemId[] = ["kangkong", "minnow", "carp"];
const stall = (purse: Purse, ask: ShopAsk): Shop => done(open(purse, "keeper", ask, HERE, NOW, SEEN)).shop;

describe("a stall of one's own (the owner: \"ตั้งรับซื้อของ หรือ ขายของโดยไม่ผ่าน ลุงขายของ (ไม่โดนภาษี) แต่ผู้เล่นต้อง online ค้างไว้เท่านั้น\")", () => {
  it("opens with lines that sell and lines that buy at once, and takes nothing out of the bag or the purse", () => {
    const purse = purseWith(100, 10, ["kangkong", 12]);
    const did = done(open(purse, "keeper", [{ kind: "sell", item: "kangkong", n: 10, price: 4 }, { kind: "buy", item: "minnow", n: 5, price: 6 }], HERE, NOW, SEEN));
    expect(did.shop).toEqual({
      by: "keeper", at: HERE, since: NOW, beat: NOW, took: 0, paid: 0,
      lines: [{ kind: "sell", item: "kangkong", n: 10, left: 10, price: 4 }, { kind: "buy", item: "minnow", n: 5, left: 5, price: 6 }],
    });
  });

  it("refuses a stall with no line, too many, or a thing named twice", () => {
    const purse = purseWith(100, 10, ["kangkong", 12]);
    expect(why(open(purse, "k", [], HERE, NOW, SEEN))).toBe("lines");
    expect(why(open(purse, "k", Array.from({ length: SHOP.lines + 1 }, () => ({ kind: "sell" as const, item: "kangkong" as ItemId, n: 1, price: 1 })), HERE, NOW, SEEN))).toBe("lines");
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 1, price: 2 }, { kind: "buy", item: "kangkong", n: 1, price: 1 }], HERE, NOW, SEEN))).toBe("lines");
  });

  it("sells only what is in the bag as plain things, in whole numbers, at no more than the notice board's most", () => {
    const pot: Stack = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } };
    const purse = { ...purseWith(100, 10, ["kangkong", 3]), bag: [...purseWith(0, 9, ["kangkong", 3]).bag, pot] };
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 4, price: 2 }], HERE, NOW, SEEN))).toBe("none");
    expect(why(open(purse, "k", [{ kind: "sell", item: "potFull", n: 1, price: 2 }], HERE, NOW, SEEN))).toBe("none");
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 1.5, price: 2 }], HERE, NOW, SEEN))).toBe("amount");
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 1, price: 0 }], HERE, NOW, SEEN))).toBe("amount");
    expect(capOf("kangkong")).toBe(ITEMS.kangkong.pays * NOTICES.cap);
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 1, price: capOf("kangkong") + 1 }], HERE, NOW, SEEN))).toBe("dear");
    expect(why(open(purse, "k", [{ kind: "sell", item: "kangkong", n: 1, price: capOf("kangkong") }], HERE, NOW, SEEN))).toBe("ok");
    // what the uncle sells is never asked more for than he asks
    expect(capOf("worm")).toBe(GOODS.worm!.price);
  });

  it("wants only what the village has met, and only what the purse can pay for (the owner, of the board: \"การรับซื้อห้าม show ไอเทม ที่ยังไม่มีคนพบเด็ดขาด\")", () => {
    const purse = purseWith(30, 10);
    expect(why(open(purse, "k", [{ kind: "buy", item: "catfish", n: 1, price: 5 }], HERE, NOW, SEEN))).toBe("none");
    expect(why(open(purse, "k", [{ kind: "buy", item: "minnow", n: 6, price: 6 }], HERE, NOW, SEEN))).toBe("coins");
    expect(why(open(purse, "k", [{ kind: "buy", item: "minnow", n: 5, price: 6 }], HERE, NOW, SEEN))).toBe("ok");
  });

  it("is open only while its keeper's page is heard from", () => {
    const shop = stall(purseWith(0, 10, ["kangkong", 5]), [{ kind: "sell", item: "kangkong", n: 5, price: 4 }]);
    expect(alive(shop, NOW + SHOP.quiet * 1000 - 1)).toBe(true);
    expect(alive(shop, NOW + SHOP.quiet * 1000)).toBe(false);
    expect(alive(beat(shop, NOW + 100_000), NOW + SHOP.quiet * 1000 + 50_000)).toBe(true);
    // (its keeper's page says so more than twice in the time it takes to be thought gone)
    expect(SHOP.every * 2).toBeLessThan(SHOP.quiet);
  });

  it("hands things and coins over at once, all of the coins: nothing is kept back (the owner: \"ไม่โดนภาษี\")", () => {
    const keeper = purseWith(7, 10, ["kangkong", 12]), comer = purseWith(50, 10);
    const shop = stall(keeper, [{ kind: "sell", item: "kangkong", n: 10, price: 4 }]);
    const did = done(buy(comer, keeper, shop, "comer", "kangkong", 3, [31, 42], NOW + 1000));
    expect(did.coins).toBe(12);
    expect(did.mine.coins).toBe(38);
    expect(held(did.mine.bag, "kangkong")).toBe(3);
    expect(did.theirs.coins).toBe(19);
    expect(held(did.theirs.bag, "kangkong")).toBe(9);
    expect(did.shop.lines[0].left).toBe(7);
    expect(did.shop.took).toBe(12);
    // (not a coin made or lost between the two)
    expect(did.mine.coins + did.theirs.coins).toBe(comer.coins + keeper.coins);
  });

  it("refuses a sale with nothing changed: shut, my own, too far, not so many left, the things gone from the bag, no coins, no room", () => {
    const keeper = purseWith(0, 10, ["kangkong", 12]), comer = purseWith(50, 10);
    const shop = stall(keeper, [{ kind: "sell", item: "kangkong", n: 10, price: 4 }]);
    const at: [number, number] = [31, 41];
    expect(why(buy(comer, keeper, null, "comer", "kangkong", 1, at, NOW))).toBe("shut");
    expect(why(buy(comer, keeper, shop, "comer", "kangkong", 1, at, NOW + SHOP.quiet * 1000))).toBe("shut");
    expect(why(buy(keeper, keeper, shop, "keeper", "kangkong", 1, at, NOW))).toBe("own");
    expect(why(buy(comer, keeper, shop, "comer", "kangkong", 1, [HERE[0] + SHOP.reach + 1, HERE[1]], NOW))).toBe("far");
    expect(why(buy(comer, keeper, shop, "comer", "kangkong", 11, at, NOW))).toBe("gone");
    expect(why(buy(comer, keeper, shop, "comer", "minnow", 1, at, NOW))).toBe("gone");
    expect(why(buy(comer, keeper, shop, "comer", "kangkong", 0, at, NOW))).toBe("amount");
    // the keeper ate, sold or gave away what the line says: there are not so many any more
    expect(why(buy(comer, purseWith(0, 10, ["kangkong", 2]), shop, "comer", "kangkong", 3, at, NOW))).toBe("gone");
    expect(why(buy(purseWith(11, 10), keeper, shop, "comer", "kangkong", 3, at, NOW))).toBe("coins");
    expect(why(buy(purseWith(50, 1, ["minnow", 1]), keeper, shop, "comer", "kangkong", 1, at, NOW))).toBe("full");
  });

  it("takes what it wants from whoever brings it, and pays them at once out of its keeper's purse", () => {
    const keeper = purseWith(40, 10), comer = purseWith(1, 10, ["minnow", 4]);
    const shop = stall(keeper, [{ kind: "buy", item: "minnow", n: 5, price: 6 }]);
    const did = done(sell(comer, keeper, shop, "comer", "minnow", 4, HERE, NOW));
    expect(did.coins).toBe(24);
    expect(did.mine.coins).toBe(25);
    expect(held(did.mine.bag, "minnow")).toBe(0);
    expect(did.theirs.coins).toBe(16);
    expect(held(did.theirs.bag, "minnow")).toBe(4);
    expect(did.shop.lines[0].left).toBe(1);
    expect(did.shop.paid).toBe(24);
  });

  it("refuses what is brought with nothing changed: not held, no more wanted, a keeper with no coins left, or no room", () => {
    const keeper = purseWith(40, 10), comer = purseWith(0, 10, ["minnow", 9]);
    const shop = stall(keeper, [{ kind: "buy", item: "minnow", n: 5, price: 6 }]);
    expect(why(sell(purseWith(0, 10), keeper, shop, "comer", "minnow", 1, HERE, NOW))).toBe("none");
    expect(why(sell(comer, keeper, shop, "comer", "minnow", 6, HERE, NOW))).toBe("gone");
    expect(why(sell(comer, purseWith(11, 10), shop, "comer", "minnow", 2, HERE, NOW))).toBe("short");
    expect(why(sell(comer, purseWith(40, 1, ["kangkong", 1]), shop, "comer", "minnow", 1, HERE, NOW))).toBe("packed");
    expect(why(sell(comer, keeper, shop, "keeper", "minnow", 1, HERE, NOW))).toBe("own");
  });

  it("tells a comer only the lines that have something to them now, and how many can change hands", () => {
    const keeper = purseWith(13, 10, ["kangkong", 4]);
    const shop: Shop = { ...stall(purseWith(100, 10, ["kangkong", 10], ["carp", 2]), [{ kind: "sell", item: "kangkong", n: 10, price: 4 }, { kind: "sell", item: "carp", n: 2, price: 9 }, { kind: "buy", item: "minnow", n: 5, price: 6 }]) };
    // the keeper holds four of the ten now, none of the carp, and coins for two minnows
    expect(shop.lines.map((l) => canOf(l, keeper))).toEqual([4, 0, 2]);
    expect(toldOf(shop, keeper, NOW)).toEqual({ by: "keeper", at: HERE, lines: [{ kind: "sell", item: "kangkong", price: 4, can: 4 }, { kind: "buy", item: "minnow", price: 6, can: 2 }] });
    expect(toldOf(shop, keeper, NOW + SHOP.quiet * 1000)).toBeNull();
    expect(near(shop, [HERE[0] - SHOP.reach, HERE[1] + SHOP.reach])).toBe(true);
  });

  it("tells its keeper every line, what it took and paid, and what may be wanted", () => {
    const shop = stall(purseWith(100, 10, ["kangkong", 10]), [{ kind: "sell", item: "kangkong", n: 10, price: 4 }]);
    const t = told(shop, NOW, SEEN);
    expect(t.mine).toEqual({ at: HERE, lines: shop.lines, since: NOW, took: 0, paid: 0 });
    expect(t.seen).toEqual(SEEN);
    expect(told(shop, NOW + SHOP.quiet * 1000, SEEN).mine).toBeNull();
    expect(told(null, NOW, SEEN).mine).toBeNull();
  });
});
