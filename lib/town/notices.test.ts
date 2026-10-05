import { describe, expect, it } from "vitest";
import type { ItemId } from "./items";
import { NOTICES, afterFee, buy, capOf, collectDue, dueOf, fetch, fill, moreSlot, newPinboard, nextSlot, plain, post, slotsOf, takeDown, told, type Pinboard } from "./notices";
import { dayOf } from "./stamina";
import { HOUR, newPurse, put, type Purse } from "./trade";

const NOON = Date.parse("2026-10-05T12:00:00+07:00");
const SEEN: ItemId[] = ["kangkong", "minnow", "carrot", "worm"];
const has = (coins: number, things: Array<[ItemId, number]> = []): Purse => things.reduce((p, [id, n]) => ({ ...p, bag: put(p.bag, id, n) }), { ...newPurse(), coins });
/** Do a thing that must go through. */
function done<T extends { ok: boolean }>(did: T): Extract<T, { ok: true }> {
  if (!did.ok) throw new Error(`refused: ${JSON.stringify(did)}`);
  return did as Extract<T, { ok: true }>;
}

describe("a notice to sell", () => {
  it("takes the things out of the bag and pins them up, for three days", () => {
    const did = done(post(has(0, [["kangkong", 30]]), newPinboard(), "a", "sell", "kangkong", 25, 4, NOON, SEEN));
    expect(plain(did.purse.bag, "kangkong")).toBe(5);
    expect(did.board.notices).toEqual([{ id: 1, by: "a", kind: "sell", item: "kangkong", n: 25, left: 25, price: 4, held: 0, at: NOON, until: NOON + 72 * HOUR }]);
    expect(did.board.next).toBe(2);
  });
  it("is refused for more than is held, for no whole number, and for a price above the most", () => {
    const p = has(0, [["kangkong", 30]]), b = newPinboard();
    expect(post(p, b, "a", "sell", "kangkong", 31, 4, NOON, SEEN)).toEqual({ ok: false, why: "none" });
    for (const n of [0, -1, 1.5, NaN, NOTICES.most + 1]) expect(post(p, b, "a", "sell", "kangkong", n, 4, NOON, SEEN)).toEqual({ ok: false, why: "amount" });
    for (const price of [0, -3, 2.5]) expect(post(p, b, "a", "sell", "kangkong", 5, price, NOON, SEEN)).toEqual({ ok: false, why: "amount" });
    expect(capOf("kangkong")).toBe(30);
    expect(post(p, b, "a", "sell", "kangkong", 5, 31, NOON, SEEN)).toEqual({ ok: false, why: "dear" });
    expect(post(p, b, "a", "sell", "kangkong", 5, 30, NOON, SEEN).ok).toBe(true);
    expect(post(p, b, "a", "sell", "nothing" as ItemId, 5, 3, NOON, SEEN)).toEqual({ ok: false, why: "none" });
  });
  it("of what the uncle sells is never above his price; of what the relatives do not take, never above a flat most", () => {
    expect(capOf("worm")).toBe(2);
    expect(capOf("rod")).toBe(60);
    expect(post(has(0, [["worm", 5]]), newPinboard(), "a", "sell", "worm", 5, 3, NOON, SEEN)).toEqual({ ok: false, why: "dear" });
  });
  it("does not take a thing that holds something: a can with water in it is no plain can", () => {
    const p: Purse = { ...newPurse(), bag: [{ item: "can", n: 1, water: 3 }, { item: "can", n: 1 }, ...Array(8).fill(null)] };
    expect(plain(p.bag, "can")).toBe(1);
    expect(post(p, newPinboard(), "a", "sell", "can", 2, 10, NOON, SEEN)).toEqual({ ok: false, why: "none" });
    const did = done(post(p, newPinboard(), "a", "sell", "can", 1, 10, NOON, SEEN));
    expect(did.purse.bag.slice(0, 2)).toEqual([{ item: "can", n: 1, water: 3 }, null]);
  });
  it("is bought from by somebody else, some at a time: the things at once, and nine tenths waiting for its writer", () => {
    const up = done(post(has(0, [["kangkong", 25]]), newPinboard(), "a", "sell", "kangkong", 25, 4, NOON, SEEN));
    const did = done(buy(has(100), up.board, "b", 1, 10, NOON + 1));
    expect(did.purse.coins).toBe(60);
    expect(plain(did.purse.bag, "kangkong")).toBe(10);
    expect(did.board.notices[0].left).toBe(15);
    expect(dueOf(did.board, "a")).toBe(36);
    expect(did.board.sales).toEqual([{ at: NOON + 1, item: "kangkong", n: 10, price: 4 }]);
    // the last of them: the notice is gone
    const rest = done(buy(has(100), did.board, "c", 1, 15, NOON + 2));
    expect(rest.board.notices).toEqual([]);
    expect(dueOf(rest.board, "a")).toBe(90);
  });
  it("is not bought from by its writer, past its days, for more than is left, without the coins or the room", () => {
    const up = done(post(has(0, [["kangkong", 25]]), newPinboard(), "a", "sell", "kangkong", 25, 4, NOON, SEEN));
    expect(buy(has(100), up.board, "a", 1, 1, NOON)).toEqual({ ok: false, why: "own" });
    expect(buy(has(100), up.board, "b", 1, 1, NOON + 72 * HOUR)).toEqual({ ok: false, why: "gone" });
    expect(buy(has(100), up.board, "b", 1, 26, NOON)).toEqual({ ok: false, why: "gone" });
    expect(buy(has(100), up.board, "b", 2, 1, NOON)).toEqual({ ok: false, why: "gone" });
    expect(buy(has(3), up.board, "b", 1, 1, NOON)).toEqual({ ok: false, why: "coins" });
    expect(buy(has(100), up.board, "b", 1, 0, NOON)).toEqual({ ok: false, why: "amount" });
    const full: Purse = { ...has(100), bag: Array(10).fill({ item: "worm", n: 20 }) };
    expect(buy(full, up.board, "b", 1, 1, NOON)).toEqual({ ok: false, why: "full" });
  });
  it("taken down gives back what was not sold, all of it or nothing", () => {
    const up = done(post(has(0, [["kangkong", 25]]), newPinboard(), "a", "sell", "kangkong", 25, 4, NOON, SEEN));
    const sold = done(buy(has(100), up.board, "b", 1, 10, NOON));
    expect(takeDown(up.purse, sold.board, "b", 1)).toEqual({ ok: false, why: "none" });
    const full: Purse = { ...newPurse(), bag: Array(10).fill({ item: "worm", n: 20 }) };
    expect(takeDown(full, sold.board, "a", 1)).toEqual({ ok: false, why: "full" });
    const down = done(takeDown(up.purse, sold.board, "a", 1));
    expect([down.things, down.coins, plain(down.purse.bag, "kangkong"), down.board.notices.length]).toEqual([15, 0, 15, 0]);
    expect(dueOf(down.board, "a")).toBe(36);
  });
});

describe("a notice of something wanted", () => {
  it("puts the coins down, and names only what somebody has found", () => {
    const did = done(post(has(100), newPinboard(), "a", "want", "minnow", 10, 5, NOON, SEEN));
    expect(did.purse.coins).toBe(50);
    expect(did.board.notices[0]).toMatchObject({ kind: "want", item: "minnow", n: 10, left: 10, held: 0, price: 5 });
    expect(post(has(100), newPinboard(), "a", "want", "megaCatfish", 1, 50, NOON, SEEN)).toEqual({ ok: false, why: "none" });
    expect(post(has(49), newPinboard(), "a", "want", "minnow", 10, 5, NOON, SEEN)).toEqual({ ok: false, why: "coins" });
  });
  it("is brought to by whoever holds the thing: it waits for the writer, and nine tenths wait for whoever brought it", () => {
    const up = done(post(has(100), newPinboard(), "a", "want", "minnow", 10, 5, NOON, SEEN));
    const did = done(fill(has(0, [["minnow", 7]]), up.board, "b", 1, 4, NOON + 5));
    expect(plain(did.purse.bag, "minnow")).toBe(3);
    expect(did.purse.coins).toBe(0);
    expect(did.board.notices[0]).toMatchObject({ left: 6, held: 4 });
    expect(dueOf(did.board, "b")).toBe(18);
    expect(fill(has(0, [["minnow", 7]]), did.board, "b", 1, 7, NOON)).toEqual({ ok: false, why: "gone" });
    expect(fill(has(0, [["minnow", 2]]), did.board, "b", 1, 3, NOON)).toEqual({ ok: false, why: "none" });
    expect(fill(has(0, [["minnow", 7]]), did.board, "a", 1, 1, NOON)).toEqual({ ok: false, why: "own" });
    expect(fill(has(0, [["minnow", 7]]), did.board, "b", 1, 1, NOON + 72 * HOUR)).toEqual({ ok: false, why: "gone" });
  });
  it("gives its writer what was brought, as much as there is room for; done with, it is gone", () => {
    const up = done(post(has(100), newPinboard(), "a", "want", "minnow", 4, 5, NOON, SEEN));
    const some = done(fill(has(0, [["minnow", 7]]), up.board, "b", 1, 3, NOON));
    expect(fetch(up.purse, some.board, "b", 1)).toEqual({ ok: false, why: "none" });
    const got = done(fetch(up.purse, some.board, "a", 1));
    expect([got.got, plain(got.purse.bag, "minnow"), got.board.notices[0].held, got.board.notices[0].left]).toEqual([3, 3, 0, 1]);
    expect(fetch(got.purse, got.board, "a", 1)).toEqual({ ok: false, why: "none" });
    const all = done(fill(has(0, [["minnow", 7]]), got.board, "b", 1, 1, NOON));
    const last = done(fetch(got.purse, all.board, "a", 1));
    expect(last.board.notices).toEqual([]);
    expect(plain(last.purse.bag, "minnow")).toBe(4);
  });
  it("taken down gives back the coins not spent, and what was brought", () => {
    const up = done(post(has(100), newPinboard(), "a", "want", "minnow", 10, 5, NOON, SEEN));
    const some = done(fill(has(0, [["minnow", 7]]), up.board, "b", 1, 4, NOON));
    const down = done(takeDown(up.purse, some.board, "a", 1));
    expect([down.coins, down.things, down.purse.coins, plain(down.purse.bag, "minnow")]).toEqual([30, 4, 80, 4]);
    expect(down.board.notices).toEqual([]);
  });
});

describe("the board's books", () => {
  it("owe whoever sells nine tenths, to the hundredth, paid in whole coins with the rest waiting", () => {
    let board: Pinboard = done(post(has(0, [["kangkong", 9]]), newPinboard(), "a", "sell", "kangkong", 9, 1, NOON, SEEN)).board;
    // nine sold one at a time at one coin: nine tenths of nine coins, not nine times nothing
    for (let i = 0; i < 9; i++) board = done(buy(has(10), board, "b", 1, 1, NOON)).board;
    expect(board.due.a).toBe(810);
    const did = done(collectDue(has(0), board, "a"));
    expect([did.coins, did.purse.coins, did.board.due.a]).toEqual([8, 8, 10]);
    expect(collectDue(did.purse, did.board, "a")).toEqual({ ok: false, why: "nothing" });
    expect(afterFee(9)).toBe(8);
  });
  it("give a member three places, and sell five more, each for twice the one before", () => {
    let board = newPinboard(), purse = has(10_000, [["kangkong", 100]]);
    for (let i = 0; i < 3; i++) { const did = done(post(purse, board, "a", "sell", "kangkong", 1, 3, NOON, SEEN)); board = did.board; purse = did.purse; }
    expect(post(purse, board, "a", "sell", "kangkong", 1, 3, NOON, SEEN)).toEqual({ ok: false, why: "slots" });
    expect(post(purse, board, "b", "want", "kangkong", 1, 3, NOON, SEEN).ok).toBe(true);
    const paid: number[] = [];
    for (let i = 0; i < 5; i++) { paid.push(nextSlot(board, "a")!); const did = done(moreSlot(purse, board, "a")); board = did.board; purse = did.purse; }
    expect(paid).toEqual([100, 200, 400, 800, 1600]);
    expect([purse.coins, slotsOf(board, "a"), nextSlot(board, "a")]).toEqual([10_000 - 3100, 8, null]);
    expect(moreSlot(purse, board, "a")).toEqual({ ok: false, why: "slots" });
    expect(moreSlot(has(99), newPinboard(), "b")).toEqual({ ok: false, why: "coins" });
    expect(post(purse, board, "a", "sell", "kangkong", 1, 3, NOON, SEEN).ok).toBe(true);
  });
  it("keep a notice's place taken while it is on the board, past its days too", () => {
    let board = newPinboard(), purse = has(0, [["kangkong", 100]]);
    for (let i = 0; i < 3; i++) { const did = done(post(purse, board, "a", "sell", "kangkong", 1, 3, NOON, SEEN)); board = did.board; purse = did.purse; }
    expect(post(purse, board, "a", "sell", "kangkong", 1, 3, NOON + 100 * HOUR, SEEN)).toEqual({ ok: false, why: "slots" });
    const down = done(takeDown(purse, board, "a", 2));
    expect(post(down.purse, down.board, "a", "sell", "kangkong", 1, 3, NOON + 100 * HOUR, SEEN).ok).toBe(true);
  });
  it("tell a member the notices that are up, their own whatever has become of them, and what was sold lately", () => {
    let board = newPinboard();
    board = done(post(has(0, [["kangkong", 25]]), board, "a", "sell", "kangkong", 25, 4, NOON, SEEN)).board;
    board = done(post(has(100), board, "b", "want", "minnow", 10, 5, NOON + HOUR, SEEN)).board;
    board = done(buy(has(100), board, "b", 1, 10, NOON + 2 * HOUR)).board;
    board = done(buy(has(100), board, "c", 1, 5, NOON + 26 * HOUR)).board;
    board = done(fill(has(0, [["minnow", 4]]), board, "a", 2, 4, NOON + 27 * HOUR)).board;
    const name = (id: string) => `Tester ${id.toUpperCase()}`;
    const a = told(board, "a", NOON + 28 * HOUR, name, SEEN), b = told(board, "b", NOON + 28 * HOUR, name, SEEN);
    expect(a.notices.map((n) => [n.id, n.kind, n.item, n.left, n.price, n.by, n.mine, n.held])).toEqual([[2, "want", "minnow", 6, 5, "Tester B", false, 0], [1, "sell", "kangkong", 10, 4, "Tester A", true, 0]]);
    // (what was brought to a notice is told only to its writer)
    expect(b.mine.map((n) => [n.id, n.held])).toEqual([[2, 4]]);
    expect([a.due, b.due, a.slots, a.more, a.fee, a.hours]).toEqual([54 + 18, 0, 3, 100, 10, 72]);
    const day = dayOf(NOON);
    expect(a.sales).toEqual({ kangkong: [[day, 10, 40], [day + 1, 5, 20]], minnow: [[day + 1, 4, 20]] });
    expect(a.seen).toEqual(SEEN);
    // past its days a notice is off the board for everybody else, and still its writer's to take down
    const late = told(board, "c", NOON + 80 * HOUR, name, SEEN), mine = told(board, "a", NOON + 80 * HOUR, name, SEEN);
    expect(late.notices).toEqual([]);
    expect(mine.mine.map((n) => n.id)).toEqual([1]);
    // …and what was sold more than seven days ago is no longer told
    expect(told(board, "a", NOON + 9 * 24 * HOUR, name, SEEN).sales).toEqual({});
  });
});
