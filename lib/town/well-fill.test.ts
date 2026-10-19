import { describe, expect, it } from "vitest";
import { newLog, seen, type WaterDeed } from "./well";

/**
 * The well's book and a can's filling of two bucketfuls (the owner, 2026-10-07: a bucketful of the well's water goes
 * half as far in a can): the book takes as many of its oldest water as the filling took of the well, so that the
 * book and the well agree; the can's water is of whoever carried the oldest of them.
 */
const T = Date.parse("2026-10-07T12:00:00+07:00");
const after = (deeds: WaterDeed[]) => deeds.reduce(seen, newLog());
const pour = (by: string, n: number, at = T): WaterDeed => ({ by, at, what: "pour", n, can: "bucket" });

describe("the well's book, when a can's filling takes more than one bucketful", () => {
  it("takes as many bucketfuls of the oldest water as the filling took, across carriers", () => {
    const log = after([pour("al", 3), pour("bo", 2, T + 1), { by: "cy", at: T + 2, what: "fill", n: 2, can: "can" }]);
    expect(log.water).toEqual([{ by: "al", left: 1 }, { by: "bo", left: 2 }]);
    expect(log.cans["cy/can"]).toEqual({ by: "al", left: 8 });
    // the next two: the last of the first carrier's and the first of the second's; the can is the first's
    const next = seen(log, { by: "di", at: T + 3, what: "fill", n: 2, can: "canBrass" });
    expect(next.water).toEqual([{ by: "bo", left: 1 }]);
    expect(next.cans["di/canBrass"]).toEqual({ by: "al", left: 18 });
  });

  it("takes what there is when the book knows of fewer, and one where the deed says none (as it was)", () => {
    const one = after([pour("al", 1), { by: "cy", at: T + 2, what: "fill", n: 2, can: "can" }]);
    expect(one.water).toEqual([]);
    expect(one.cans["cy/can"]).toEqual({ by: "al", left: 8 });
    const none = after([{ by: "cy", at: T, what: "fill", n: 2, can: "can" }]);
    expect(none.water).toEqual([]);
    expect(none.cans["cy/can"]).toEqual({ by: null, left: 8 });
    const old = after([pour("al", 3), { by: "cy", at: T + 2, what: "fill", can: "can" }]);
    expect(old.water).toEqual([{ by: "al", left: 2 }]);
  });
});

describe("the well's book, each well its own water (v287)", () => {
  it("keeps a lot poured into the second well as the second's, fills a can there from the second's alone, and leaves the first's", () => {
    const log = after([pour("al", 3), { ...pour("bo", 2, T + 1), well: 1 }, { by: "cy", at: T + 2, what: "fill", n: 2, can: "can", well: 1 }]);
    expect(log.water).toEqual([{ by: "al", left: 3 }]);
    expect(log.cans["cy/can"]).toEqual({ by: "bo", left: 8 });
    const next = seen(log, { by: "di", at: T + 3, what: "fill", n: 2, can: "can" });
    expect(next.water).toEqual([{ by: "al", left: 1 }]);
    expect(next.cans["di/can"]).toEqual({ by: "al", left: 8 });
    // (a can filled at a well with none of the book's water is of nobody's, and takes nothing of the other's)
    const dry = seen(next, { by: "ed", at: T + 4, what: "fill", n: 2, can: "can", well: 1 });
    expect([dry.water, dry.cans["ed/can"]]).toEqual([[{ by: "al", left: 1 }], { by: null, left: 8 }]);
  });
  it("gives a bucket's nature to the well it was poured into, and to no other", () => {
    const drawn = (by: string, well?: number): WaterDeed[] => [{ by, at: T, what: "draw", can: "bucket", kind: "dawn" }, { ...pour(by, 1, T + 1), ...(well === undefined ? {} : { well }) }];
    const south = after(drawn("al", 1)), north = after(drawn("bo"));
    expect([south.wellWater, south.southWater?.kind]).toEqual([null, "dawn"]);
    expect([north.wellWater?.kind, north.southWater ?? null]).toEqual(["dawn", null]);
  });
});
