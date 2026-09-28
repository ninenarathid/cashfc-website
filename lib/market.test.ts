import { describe, expect, it } from "vitest";
import { board, pegPrice } from "@/lib/market";

/**
 * The board's arithmetic.
 *
 * Small, and worth pinning down anyway, because these are the two numbers
 * people will be converting their popoto at. A spread applied the wrong way
 * round hands out more than it takes in on every trip.
 */

describe("board", () => {
  it("turns a potion price into popoto per HQ, and pays back less", () => {
    const b = board(4_140, 200, 20)!;
    expect(b.sell).toBeCloseTo(20.7);
    expect(b.buy).toBeCloseTo(16.56);
    expect(b.buy).toBeLessThan(b.sell);
  });

  // With a fifth taken off, the potion has to rise a quarter before a round
  // trip breaks even. That is the number the daily limit on the price has to
  // stay under.
  it("says how far the price must rise before a round trip pays", () => {
    expect(board(4_000, 200, 20)!.breakEven).toBeCloseTo(0.25);
    expect(board(4_000, 200, 0)!.breakEven).toBe(0);
  });

  it("gives no board at all rather than one built on nothing", () => {
    expect(board(0, 200, 20)).toBeNull();
    expect(board(4_000, 0, 20)).toBeNull();
  });
});

describe("pegPrice", () => {
  const prices = { STR: 4_156, DEX: 4_185, INT: 3_875, MND: 4_246 };

  it("follows one potion when one is chosen", () => {
    expect(pegPrice(prices, "STR")).toBe(4_156);
  });

  it("averages the four, and leaves out one it could not read", () => {
    expect(pegPrice(prices, "avg")).toBeCloseTo(4_115.5);
    expect(pegPrice({ STR: 4_000, DEX: 5_000 }, "avg")).toBe(4_500);
    expect(pegPrice({}, "avg")).toBeNull();
    expect(pegPrice({ DEX: 4_000 }, "STR")).toBeNull();
  });
});
