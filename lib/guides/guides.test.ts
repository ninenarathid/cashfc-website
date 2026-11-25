import { describe, expect, it } from "vitest";
import {
  cleanRing, cleanSpots, fitPicture, inPhases, isPicturePath, isSlug, newPicturePath, slugify,
  togglePoint, withSeat, type StepRow,
} from "./index";

const UID = "0b9c1f2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f";

describe("picture paths", () => {
  it("accepts what the editor writes", () => {
    expect(isPicturePath(newPicturePath(UID, "webp"))).toBe(true);
    expect(isPicturePath(newPicturePath(UID, "jpg"))).toBe(true);
  });
  it("refuses anything else", () => {
    expect(isPicturePath("https://evil.example/a.webp")).toBe(false);
    expect(isPicturePath(`${UID}/../a.webp`)).toBe(false);
    expect(isPicturePath(`${UID}/cover-1764000000000-abcd.webp`)).toBe(false);
    expect(isPicturePath(null)).toBe(false);
  });
});

describe("cleanSpots", () => {
  it("keeps seats, points and lines", () => {
    expect(cleanSpots({ MT: { at: [[50, 20.04]], say: " หน้าบอส " } }))
      .toEqual({ MT: { at: [[50, 20]], say: "หน้าบอส" } });
  });
  it("drops unknown seats, bad points and clamps", () => {
    expect(cleanSpots({
      XX: { at: [[1, 1]] },
      ST: { at: [["1", 2], [1, 2, 3], [120, -5], [NaN, 1]] },
      H1: "north",
      H2: { at: [] },
    })).toEqual({ ST: { at: [[100, 0]] } });
  });
  it("keeps at most four points", () => {
    const at = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]];
    expect(cleanSpots({ D1: { at } }).D1?.at).toHaveLength(4);
  });
  it("reads garbage as nothing", () => {
    expect(cleanSpots(null)).toEqual({});
    expect(cleanSpots([1, 2])).toEqual({});
    expect(cleanSpots("MT")).toEqual({});
  });
});

describe("cleanRing", () => {
  it("clamps and defaults", () => {
    expect(cleanRing(99)).toBe(30);
    expect(cleanRing(1)).toBe(3);
    expect(cleanRing("x")).toBe(9);
  });
});

describe("togglePoint", () => {
  it("adds a point, and a tap on it takes it away", () => {
    const one = togglePoint([], [40, 40], 3);
    expect(one).toEqual([[40, 40]]);
    expect(togglePoint(one, [41, 41], 3)).toEqual([]);
  });
  it("a fifth point replaces the oldest", () => {
    const four: [number, number][] = [[10, 10], [20, 20], [30, 30], [40, 40]];
    expect(togglePoint(four, [80, 80], 3)).toEqual([[20, 20], [30, 30], [40, 40], [80, 80]]);
  });
});

describe("withSeat", () => {
  it("sets a seat and removes an empty one", () => {
    const s = withSeat({}, "MT", { at: [[1, 1]], say: "x" });
    expect(s).toEqual({ MT: { at: [[1, 1]], say: "x" } });
    expect(withSeat(s, "MT", { at: [], say: " " })).toEqual({});
  });
});

describe("slugs", () => {
  it("makes an address from a short name", () => {
    expect(slugify("M9S")).toBe("m9s");
    expect(slugify("  FRU — Futures Rewritten! ")).toBe("fru-futures-rewritten");
    expect(isSlug(slugify("M12S Door Boss"))).toBe(true);
    expect(isSlug("Bad Slug")).toBe(false);
    expect(slugify("ไทยล้วน")).toBe("");
  });
});

describe("fitPicture", () => {
  it("shrinks big pictures and keeps small ones", () => {
    expect(fitPicture(2800, 1400)).toEqual({ w: 1400, h: 700 });
    expect(fitPicture(800, 600)).toEqual({ w: 800, h: 600 });
  });
});

describe("inPhases", () => {
  const step = (id: number, sort: number, phase: string | null): StepRow => ({
    id, guide_id: 1, sort, phase, name: `s${id}`, note: null, picture: null,
    pic_w: null, pic_h: null, ring: 9, spots: {},
  });
  it("groups steps under the phase before them, in order", () => {
    const groups = inPhases([step(3, 3, null), step(1, 1, "P1"), step(2, 2, null), step(4, 4, "P2")]);
    expect(groups.map((g) => [g.phase, g.steps.map((s) => s.id)]))
      .toEqual([["P1", [1, 2, 3]], ["P2", [4]]]);
  });
});
