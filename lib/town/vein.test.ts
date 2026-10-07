import { describe, expect, it } from "vitest";
import type { Stack } from "./trade";
import { VEIN, begin, bestOf, faceOf, headOf, iceOf, mayStrike, over, play, stops, strike, veinMods, yieldOf, type Face, type VeinMods } from "./vein";

const pickAt = (plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item: "pick", n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });
const PLAIN: VeinMods = { strikes: 6, back: 0, cross: 0, spent: false };
/** A face laid by hand: the crack starts at the left of the top row; a knot two cells along it. */
const FACE: Face = { size: 6, start: [0, 0], points: [{ x: 1, y: 0, gem: 0 }, { x: 0, y: 2, gem: 2 }, { x: 4, y: 2, gem: 0 }, { x: 5, y: 5, gem: 0 }], knots: [[3, 0], [2, 2], [0, 4]] };

describe("the vein's face", () => {
  it("is six by six, the same for the same seed, with four to six glinting cells and four to six knots, the crack starting at an edge", () => {
    const starts = new Set<string>();
    for (let seed = 1; seed <= 600; seed++) {
      const f = faceOf(seed * 7919);
      expect(f).toEqual(faceOf(seed * 7919));
      expect(f.size).toBe(6);
      expect(f.points.length).toBeGreaterThanOrEqual(VEIN.points[0]); expect(f.points.length).toBeLessThanOrEqual(VEIN.points[1]);
      expect(f.knots.length).toBeGreaterThanOrEqual(VEIN.knots[0]); expect(f.knots.length).toBeLessThanOrEqual(VEIN.knots[1]);
      const [sx, sy] = f.start;
      expect(sx === 0 || sy === 0 || sx === 5 || sy === 5).toBe(true);
      starts.add(`${sx},${sy}`);
      // nothing lies on anything else, and all of it is on the face
      const cells = [`${sx},${sy}`, ...f.points.map((p) => `${p.x},${p.y}`), ...f.knots.map(([x, y]) => `${x},${y}`)];
      expect(new Set(cells).size).toBe(cells.length);
      for (const c of cells) { const [x, y] = c.split(",").map(Number); expect(x >= 0 && y >= 0 && x < 6 && y < 6).toBe(true); }
      expect(f.points.every((p) => p.gem === 0)).toBe(true);
    }
    expect(starts.size).toBeGreaterThan(15);
    expect(faceOf(1)).not.toEqual(faceOf(2));
  });
  it("a gem vein has one or two gem cells of one to three fragments each, and is otherwise laid as any other", () => {
    const many = new Set<number>(), chips = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      const f = faceOf(seed * 104729, true), gems = f.points.filter((p) => p.gem > 0);
      many.add(gems.length);
      for (const g of gems) chips.add(g.gem);
    }
    expect([...many].sort()).toEqual([1, 2]);
    expect([...chips].sort()).toEqual([1, 2, 3]);
  });
  it("every glinting cell can be come to round the knots, and a good go of six strikes passes most of them", () => {
    let best = 0, all = 0, none = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const f = faceOf(seed * 31337), b = bestOf(f, PLAIN);
      best += b; all += f.points.length;
      if (b === 0) none++;
      expect(b).toBeLessThanOrEqual(f.points.length);
    }
    expect(none).toBe(0);
    // (of what glints, the best go there is passes well over half, and seldom all: there is something to weigh)
    expect(best / all).toBeGreaterThan(0.6);
    expect(best / all).toBeLessThan(0.98);
  });
});

describe("a strike", () => {
  it("is on a cell of the crack's own row or column, and lengthens it two cells at the most, never past the cell", () => {
    const c = begin(FACE, PLAIN);
    expect(headOf(c)).toEqual([0, 0]);
    expect(mayStrike(FACE, c, [0, 0])).toBe(false);
    expect(mayStrike(FACE, c, [1, 1])).toBe(false);
    expect(mayStrike(FACE, c, [6, 0])).toBe(false);
    expect(mayStrike(FACE, c, [0, -1])).toBe(false);
    expect(mayStrike(FACE, c, [5, 0])).toBe(true);
    expect(strike(FACE, PLAIN, c, [1, 1])).toMatchObject({ moved: -1, crack: c });
    const one = strike(FACE, PLAIN, c, [1, 0]);
    expect(one).toMatchObject({ moved: 1, knot: false, passed: [0] });
    expect(headOf(one.crack)).toEqual([1, 0]);
    expect(one.crack.left).toBe(5);
    const far = strike(FACE, PLAIN, c, [0, 5]);
    expect(far.moved).toBe(2);
    expect(headOf(far.crack)).toEqual([0, 2]);
    expect(far.passed).toEqual([1]);
    expect(far.crack.path).toEqual([[0, 0], [0, 1], [0, 2]]);
  });
  it("is stopped by a knot: the crack runs up to it, the strike is spent all the same", () => {
    const c = begin(FACE, PLAIN), a = strike(FACE, PLAIN, c, [5, 0]);
    expect(a).toMatchObject({ moved: 2, knot: false });
    const b = strike(FACE, PLAIN, a.crack, [5, 0]);
    expect(b).toMatchObject({ moved: 0, knot: true, back: false });
    expect(headOf(b.crack)).toEqual([2, 0]);
    expect(b.crack.left).toBe(4);
    expect(stops(FACE, PLAIN, 3, 0)).toBe(true);
    expect(stops(FACE, PLAIN, 4, 0)).toBe(false);
  });
  it("water gives back so many of the strikes a knot stopped, and ice lets the crack cross the first knots", () => {
    const water: VeinMods = { ...PLAIN, back: 1 }, a = strike(FACE, water, begin(FACE, water), [5, 0]).crack;
    const b = strike(FACE, water, a, [5, 0]);
    expect(b).toMatchObject({ moved: 0, knot: true, back: true });
    expect(b.crack.left).toBe(5); expect(b.crack.back).toBe(0);
    const again = strike(FACE, water, b.crack, [5, 0]);
    expect(again).toMatchObject({ knot: true, back: false });
    expect(again.crack.left).toBe(4);
    const ice: VeinMods = { ...PLAIN, cross: 1 };
    expect(iceOf(FACE, ice)).toEqual([[3, 0]]);
    expect(stops(FACE, ice, 3, 0)).toBe(false);
    expect(stops(FACE, ice, 2, 2)).toBe(true);
    const through = strike(FACE, ice, strike(FACE, ice, begin(FACE, ice), [5, 0]).crack, [5, 0]);
    expect(through).toMatchObject({ moved: 2, knot: false });
    expect(headOf(through.crack)).toEqual([4, 0]);
  });
  it("a go is over with its last strike, or when nothing is left to pass; a cell passed twice gives once", () => {
    const two: VeinMods = { ...PLAIN, strikes: 2 };
    let c = strike(FACE, two, begin(FACE, two), [1, 0]).crack;
    expect(over(FACE, c)).toBe(false);
    c = strike(FACE, two, c, [0, 0]).crack;
    expect(c.got).toEqual([0]);
    expect(over(FACE, c)).toBe(true);
    expect(mayStrike(FACE, c, [1, 0])).toBe(false);
    const small: Face = { ...FACE, points: [{ x: 1, y: 0, gem: 0 }] };
    expect(over(small, strike(small, PLAIN, begin(small, PLAIN), [1, 0]).crack)).toBe(true);
  });
  it("a go played again from its strikes comes to the same; what is no strike is passed over, and nothing is struck once it is over", () => {
    const strikes: Array<[number, number]> = [[1, 0], [1, 1], [9, 9], [1, 5], [5, 3], [5, 3], [5, 5], [5, 5], [0, 5]];
    const c = play(FACE, PLAIN, strikes);
    expect(c.struck).toBe(6);
    expect(c.left).toBe(0);
    expect(play(FACE, PLAIN, strikes)).toEqual(c);
    expect(play(FACE, PLAIN, "nonsense" as unknown as [])).toEqual(begin(FACE, PLAIN));
  });
});

describe("what a vein gives, and what it is played with", () => {
  it("two fragments of the floor's ore for each glinting cell of ore, and a gem's cell its own fragments of the gem", () => {
    expect(yieldOf(FACE, { got: [] }, "shardIron", null)).toEqual([]);
    expect(yieldOf(FACE, { got: [0, 2] }, "shardIron", null)).toEqual([["shardIron", 4]]);
    expect(yieldOf(FACE, { got: [0, 1] }, "shardIron", "chipTopaz")).toEqual([["shardIron", 2], ["chipTopaz", 2]]);
    expect(yieldOf(FACE, { got: [0, 1] }, "shardIron", "chipTopaz", 1)).toEqual([["shardIron", 2], ["chipTopaz", 3]]);
    // (one more only of a gem that was come to; and a gem cell of a vein that is no gem's is ore)
    expect(yieldOf(FACE, { got: [0] }, "shardIron", "chipTopaz", 1)).toEqual([["shardIron", 2]]);
    expect(yieldOf(FACE, { got: [1] }, "shardIron", null, 1)).toEqual([["shardIron", 2]]);
  });
  it("the strikes are the pick's: six, more by its plus and its steady hand; two fewer with no stamina, and the points then seen only at first", () => {
    expect(veinMods(pickAt(), false)).toEqual({ strikes: 6, back: 0, cross: 0, spent: false });
    expect([0, 4, 7, 9, 10].map((l) => veinMods(pickAt(l), false).strikes)).toEqual([6, 7, 8, 9, 10]);
    expect(veinMods(pickAt(3, ["pkSteady"]), false).strikes).toBe(8);
    expect(veinMods(pickAt(), true)).toMatchObject({ strikes: 4, spent: true });
    expect(veinMods(null, true).strikes).toBe(4);
    expect(veinMods(pickAt(0, [], ["water"]), false).back).toBe(1);
    expect(veinMods(pickAt(10, [], ["water"]), false).back).toBe(2);
    expect(veinMods(pickAt(0, [], ["ice"]), false).cross).toBe(1);
    expect(veinMods(pickAt(10, [], ["ice"]), false).cross).toBe(2);
    expect(VEIN.tired.shows).toBe(2000);
    expect(VEIN.stamina).toBe(3);
  });
});
