import { describe, expect, it } from "vitest";
import { TOP_N, rank, type Totals } from "@/lib/popoto-board";

/**
 * The top of a popoto board.
 *
 * The page asks this while it is built and the browser asks it again a moment
 * later, and the two lists are drawn one over the other, so it has to come out
 * the same way every time: most potatoes first, then the one more people gave
 * to, and nobody on nothing.
 */

const totals = (rows: [number, number, number][]): Totals =>
  new Map(rows.map(([id, score, n]) => [id, { score, n }]));

describe("rank", () => {
  const names = { 1: { name: "Aqua Eleison", avatar: "a.png" } };

  it("puts the most potatoes first, and more givers first on a tie", () => {
    const got = rank(totals([[3, 5, 2], [1, 9, 4], [2, 5, 3]]), names);
    expect(got.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("leaves out anybody on zero", () => {
    expect(rank(totals([[1, 0, 0], [2, 1, 1]]), names).map((r) => r.id)).toEqual([2]);
  });

  it("names people from the roster, and a stranger by their id", () => {
    const [first, second] = rank(totals([[1, 2, 1], [77, 1, 1]]), names);
    expect(first).toEqual({ id: 1, name: "Aqua Eleison", avatar: "a.png", score: 2, n: 1 });
    expect(second).toEqual({ id: 77, name: "#77", avatar: null, score: 1, n: 1 });
  });

  it(`stops at ${TOP_N}`, () => {
    const many = totals(Array.from({ length: 25 }, (_, i) => [i + 1, 30 - i, 1]));
    expect(rank(many, names)).toHaveLength(TOP_N);
  });
});
