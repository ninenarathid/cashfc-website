import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BEDS_IN_FARM, FARM, FARM_ALL, FARM_PROPS, FARM_PROPS_FIRST, GATES, WELLS, asBuilt, bedCorner, findPath, groundAt, placeOf, walkable } from "./world";
import { HAUNTS } from "./insects";
import { EGG_SPOTS, MEADOW_SPOTS, PASTURE, PASTURE_AREA, POPOTO, WAGON_STOPS, animalSpot, asleepAt, inPasture, pastureThing, spotOf } from "./pasture";
import { BOUNDS } from "./camera";

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

describe("the pasture leaves the garden as it was", () => {
  // (taken on branch animals-page before the pasture was laid, 2026-10-20: every number below is what the garden was)
  it("keeps the insects' haunts, the beds' corners, the props, the gates and the wells byte for byte", () => {
    expect(hash(HAUNTS)).toBe("1e96d4e3a5ce87d7");
    expect(HAUNTS.length).toBe(173);
    expect(hash(Array.from({ length: BEDS_IN_FARM }, (_, i) => bedCorner(i)))).toBe("0625fe206d1af8b2");
    expect(hash(FARM_PROPS)).toBe("f50f409c5339809e");
    expect(hash(FARM_PROPS_FIRST)).toBe("5aad1a817a7165b9");
    expect(hash(GATES)).toBe("fbe2dedea7c2561c");
    expect(hash(WELLS)).toBe("737090a3a5755e88");
  });
  it("keeps every tile of the garden as it could be walked and as its ground was", () => {
    const tiles: string[] = [];
    for (let y = FARM.y; y < FARM.y + FARM.h; y++) { let s = ""; for (let x = FARM.x; x < FARM.x + FARM.w; x++) s += (walkable(x, y) ? "." : "#") + groundAt(x, y)[0]; tiles.push(s); }
    expect(hash(tiles)).toBe("aa0c702494c896fe");
  });
  it("is no part of the farm as built (what the haunts were laid out on)", () => {
    expect(asBuilt(() => placeOf(150, -10))).toBeNull();
    expect(placeOf(150, -10)).toBe("farm");
  });
});

describe("the pasture's map", () => {
  it("widens the farm's bounds to (128, -32, 60, 118) with signed y everywhere", () => {
    expect([FARM_ALL.x, FARM_ALL.y, FARM_ALL.w, FARM_ALL.h]).toEqual([...PASTURE.rect]);
    expect(placeOf(128, -32)).toBe("farm");
    expect(placeOf(187, -1)).toBe("farm");
    expect(placeOf(128, -33)).toBeNull();
    expect(BOUNDS.farm.minY).toBe((FARM_ALL.x + FARM_ALL.y) * 16 - 130);
  });
  it("walks from the garden's gate to the meadow through the pasture's gate, and back (findPath's numbers signed)", () => {
    const there = findPath({ x: FARM.x + 2.5, y: FARM.y + 21.5 }, { x: 140.5, y: -27.5 });
    expect(there).not.toBeNull();
    expect(there!.at(-1)).toEqual({ x: 140.5, y: -27.5 });
    expect(there!.some((p) => p.y < 0 && p.y > -2 && p.x >= 155 && p.x < 158)).toBe(true);
    for (const p of there!) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
    const back = findPath({ x: 140.5, y: -27.5 }, { x: 130.5, y: 21.5 });
    expect(back?.at(-1)).toEqual({ x: 130.5, y: 21.5 });
  });
  it("has every egg spot, forage spot and the wagon's stops on ground that can be stood on", () => {
    for (const [x, y] of [...EGG_SPOTS, ...MEADOW_SPOTS]) { expect(inPasture(x, y), `${x},${y}`).toBe(true); expect(walkable(x, y), `${x},${y}`).toBe(true); }
    expect(new Set(EGG_SPOTS.map(String)).size).toBe(EGG_SPOTS.length);
    expect(MEADOW_SPOTS.length).toBe(12);
    expect(spotOf(-7)).toEqual([...EGG_SPOTS[EGG_SPOTS.length - 7]]);
    for (const [map, [x, y]] of Object.entries(WAGON_STOPS)) { expect(placeOf(x, y)).toBe(map); expect(walkable(x, y)).toBe(true); }
    for (const [x, y] of POPOTO.tiles) expect(walkable(x, y)).toBe(false);
  });
  it("draws each animal the same on every page, never inside a building, and asleep at night", () => {
    const day = Date.UTC(2026, 9, 20, 3, 0, 0), night = Date.UTC(2026, 9, 20, 15, 0, 0);
    for (const sp of ["cow", "sheep", "chicken", "duck"]) for (let i = 0; i < 40; i++) {
      const t = day + i * 7_919, at = animalSpot(`id-${sp}-${i % 5}`, sp, i % 3 === 0, t, () => i % 2 === 0);
      expect(animalSpot(`id-${sp}-${i % 5}`, sp, i % 3 === 0, t, () => i % 2 === 0)).toEqual(at);
      if (at.pose !== "walk" && at.pose !== "swim") expect(pastureThing(Math.floor(at.x), Math.floor(at.y)), `${sp} ${at.x},${at.y}`).toBeNull();
    }
    expect(asleepAt(night)).toBe(true);
    expect(animalSpot("a", "cow", false, night, () => false).pose).toBe("sleep");
    expect(inPasture(PASTURE_AREA.x, PASTURE_AREA.y)).toBe(true);
  });
});
