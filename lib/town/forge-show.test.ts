import { describe, expect, it } from "vitest";
import { KNOCKS_MS, SHOW, grandeur, isTop, levelAfter, readTold, showAt, showMs, toldOf, type ForgeShow } from "./forge-show";

describe("a try at the forge, shown over the head", () => {
  it("reads only a try that can be: a forgeable tool, a level a try is made from, one of the three ways it goes", () => {
    expect(readTold({ i: "pick", f: 9, o: "taken" })).toEqual({ item: "pick", from: 9, out: "taken" });
    expect(readTold(toldOf({ item: "pot", from: 0, out: "down" }))).toEqual({ item: "pot", from: 0, out: "down" });
    for (const raw of [null, undefined, "pick", {}, { i: "worm", f: 3, o: "taken" }, { i: "pick", f: 10, o: "taken" }, { i: "pick", f: -1, o: "taken" },
      { i: "pick", f: 2.5, o: "taken" }, { i: "pick", f: "2", o: "taken" }, { i: "pick", f: 2, o: "won" }, { i: "pick", f: 2 }, { i: "<b>", f: 2, o: "taken" }, { i: 7, f: 2, o: "taken" }]) {
      expect(readTold(raw)).toBeNull();
    }
  });

  it("says the level after: one up when it took, the same when it stayed, one down when it fell", () => {
    expect(levelAfter({ from: 7, out: "taken" })).toBe(8);
    expect(levelAfter({ from: 7, out: "stays" })).toBe(7);
    expect(levelAfter({ from: 7, out: "down" })).toBe(6);
    expect(levelAfter({ from: 7, out: null })).toBe(7);
  });

  it("makes more of a higher level, and the top is the top taken and nothing else", () => {
    expect(grandeur({ from: 0 })).toBeLessThan(grandeur({ from: 5 }));
    expect(grandeur({ from: 9 })).toBe(1);
    expect(isTop({ from: 9, out: "taken" })).toBe(true);
    expect(isTop({ from: 9, out: "stays" })).toBe(false);
    expect(isTop({ from: 8, out: "taken" })).toBe(false);
    expect(showMs({ from: 9, out: "taken" })).toBeGreaterThan(showMs({ from: 8, out: "taken" }));
  });

  it("goes through its knocks, then what came of it, and is over", () => {
    const show: ForgeShow = { item: "pick", from: 4, out: "stays", at: 1000 };
    expect(showAt(show, 999)).toBeNull();
    expect(showAt(show, 1000)).toMatchObject({ phase: "knocks", beat: 0, held: false });
    expect(showAt(show, 1000 + SHOW.knock * 2 + 10)).toMatchObject({ phase: "knocks", beat: 2 });
    expect(showAt(show, 1000 + KNOCKS_MS)).toMatchObject({ phase: "result", ms: 0, alpha: 1 });
    const late = showAt(show, 1000 + KNOCKS_MS + SHOW.result - SHOW.fade / 2);
    expect(late?.phase === "result" && late.alpha).toBeCloseTo(0.5);
    expect(showAt(show, 1000 + KNOCKS_MS + SHOW.result)).toBeNull();
  });

  it("holds the hammer up while the answer has not come, and not for ever", () => {
    const show: ForgeShow = { item: "pick", from: 4, out: null, at: 0 };
    expect(showAt(show, KNOCKS_MS + 500)).toMatchObject({ phase: "knocks", held: true });
    expect(showAt(show, SHOW.wait)).toBeNull();
  });
});
