import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BEDS_IN_FARM, FARM, FARM_ALL, FARM_PROPS, FARM_PROPS_FIRST, GATES, WELLS, asBuilt, bedCorner, findPath, groundAt, placeOf, walkable } from "./world";
import { HAUNTS } from "./insects";
import {
  BARNS, BARN_SIZE, EGG_SPOTS, FARM_GATES, FENCE_X, MEADOW_SPOTS, PASTURE, PASTURE_AREA, PEN, POPOTO, TROUGH, WAGON_STOPS, allWays, animalSpot,
  asleepAt, barnAt, barnWall, inPasture, nearFarmGate, onLane, pastureThing, penSpot, slotSpot, spotOf, troughOf,
} from "./pasture";
import { BOUNDS } from "./camera";

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

describe("the animal farm leaves the garden as it was, but for its two gates", () => {
  // (taken on branch animals-page before the pasture was laid, 2026-10-20, and after main took the trees between the
  // farm's halves off (f66524c0): every number below is what the garden was)
  it("keeps the insects' haunts, the beds' corners, the first half's props, the gates and the wells byte for byte", () => {
    expect(hash(HAUNTS)).toBe("1e96d4e3a5ce87d7");
    expect(HAUNTS.length).toBe(173);
    expect(hash(Array.from({ length: BEDS_IN_FARM }, (_, i) => bedCorner(i)))).toBe("0625fe206d1af8b2");
    expect(hash(FARM_PROPS_FIRST)).toBe("5aad1a817a7165b9");
    expect(hash(GATES)).toBe("fbe2dedea7c2561c");
    expect(hash(WELLS)).toBe("737090a3a5755e88");
  });
  it("takes off only the rim's trees by the two gates (thirteen), and carries the two roads through the rim", () => {
    // (the garden's props after f66524c0, less the thirteen trees within eight rows of a gate's road)
    expect(hash(FARM_PROPS)).toBe("0ce3e1b0c837bde7");
    for (const p of FARM_PROPS) if (["tree", "pine", "bush"].includes(p.kind)) expect(nearFarmGate(p.x - FARM.x, p.y - FARM.y), `${p.kind} ${p.x},${p.y}`).toBe(false);
    for (const g of FARM_GATES) for (const y of [g.road, g.road + 1]) for (let x = FARM.x + FARM.w - 4; x < FARM.x + FARM.w; x++) expect(groundAt(x, y), `${x},${y}`).toBe("road");
  });
  it("keeps every other tile of the garden as it could be walked and as its ground was", () => {
    const tiles: string[] = [];
    for (let y = FARM.y; y < FARM.y + FARM.h; y++) { let s = ""; for (let x = FARM.x; x < FARM.x + FARM.w; x++) s += (walkable(x, y) ? "." : "#") + groundAt(x, y)[0]; tiles.push(s); }
    expect(hash(tiles)).toBe("9f6106691dba2cbe");
  });
  it("is no part of the farm as built (what the haunts were laid out on)", () => {
    expect(asBuilt(() => placeOf(200, 40))).toBeNull();
    expect(placeOf(200, 40)).toBe("farm");
  });
});

describe("the animal farm's map", () => {
  it("widens the farm's bounds to (128, 0, 112, 86), east of the garden, every x under 256", () => {
    expect([FARM_ALL.x, FARM_ALL.y, FARM_ALL.w, FARM_ALL.h]).toEqual([...PASTURE.rect]);
    expect([PASTURE_AREA.x, PASTURE_AREA.x + PASTURE_AREA.w]).toEqual([FARM.x + FARM.w, FARM_ALL.x + FARM_ALL.w]);
    expect(FARM_ALL.x + FARM_ALL.w).toBeLessThan(256);
    expect(placeOf(239, 85)).toBe("farm");
    expect(placeOf(240, 0)).toBeNull();
    expect(placeOf(200, -1)).toBeNull();
    expect(BOUNDS.farm.minY).toBe((FARM_ALL.x + FARM_ALL.y) * 16 - 130);
  });
  it("is walked into from the garden through either gate, along the roads carried on, and back", () => {
    for (const g of FARM_GATES) {
      const there = findPath({ x: FARM.x + 2.5, y: g.road + 0.5 }, { x: 230.5, y: g.road + 1.5 });
      expect(there, g.name).not.toBeNull();
      expect(there!.at(-1)).toEqual({ x: 230.5, y: g.road + 1.5 });
      // (through the gate's opening, the fence elsewhere shut)
      const at = there!.filter((p) => Math.floor(p.x) === FENCE_X).map((p) => Math.floor(p.y));
      expect(at.length).toBeGreaterThan(0);
      for (const y of at) expect(y >= g.rows[0] && y <= g.rows[1], `${g.name} ${y}`).toBe(true);
      for (const p of there!) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
      expect(findPath({ x: 230.5, y: g.road + 1.5 }, { x: FARM.x + 2.5, y: g.road + 0.5 })?.at(-1)).toEqual({ x: FARM.x + 2.5, y: g.road + 0.5 });
    }
    for (let y = 0; y < 86; y++) if (!FARM_GATES.some((g) => y >= g.rows[0] && y <= g.rows[1])) expect(walkable(FENCE_X, y), `fence ${y}`).toBe(false);
  });
  it("has 24 barns of 8 by 4, clear of each other and of every lane, entered only by their doors", () => {
    expect(BARNS.length).toBe(24);
    const seen = new Set<string>();
    for (const b of BARNS) {
      expect([b.w, b.h]).toEqual([BARN_SIZE.w, BARN_SIZE.h]);
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        expect(seen.has(`${x},${y}`)).toBe(false); seen.add(`${x},${y}`);
        expect(barnAt(x, y)).toBe(b.i);
        expect(onLane(x, y), `lane in barn ${b.i}`).toBe(false);
        const solid = (x === b.nest[0] && y === b.nest[1]) || (x === b.hay[0] && y === b.hay[1]);
        expect(walkable(x, y), `${b.i}: ${x},${y}`).toBe(!solid);
      }
      for (const [x, y] of b.step) { expect(walkable(x, y)).toBe(true); expect(barnAt(x, y)).toBe(-1); expect(onLane(x, y + 1), `the lane before barn ${b.i}`).toBe(true); }
      // (in only by the door: a way to the back corner goes through it; no step across a wall)
      const way = findPath({ x: b.x + 5.5, y: b.y + b.h + 1.5 }, { x: b.x + 0.5, y: b.y + 0.5 })!;
      expect(way, `barn ${b.i}`).not.toBeNull();
      let was = { x: b.x + 5, y: b.y + b.h + 1 };
      for (const p of way) { const t = { x: Math.floor(p.x), y: Math.floor(p.y) }; expect(barnWall(was.x, was.y, t.x, t.y), `barn ${b.i} ${was.x},${was.y}>${t.x},${t.y}`).toBe(false); was = t; }
      expect(way.some((p) => b.door.some(([dx, dy]) => Math.floor(p.x) === dx && Math.floor(p.y) === dy))).toBe(true);
      expect(barnWall(b.x - 1, b.y + 1, b.x, b.y + 1)).toBe(true);
      expect(barnWall(b.door[0][0], b.door[0][1] + 1, b.door[0][0] + 1, b.door[0][1])).toBe(true);
    }
  });
  it("has every egg spot, forage spot and the wagon's stops on ground that can be stood on; Uncle Popoto's stall and pen shut", () => {
    for (const [x, y] of [...EGG_SPOTS, ...MEADOW_SPOTS]) { expect(inPasture(x, y), `${x},${y}`).toBe(true); expect(walkable(x, y), `${x},${y}`).toBe(true); expect(barnAt(x, y)).toBe(-1); }
    expect(new Set(EGG_SPOTS.map(String)).size).toBe(EGG_SPOTS.length);
    expect(new Set(MEADOW_SPOTS.map(String)).size).toBe(12);
    expect(spotOf(-7)).toEqual([...EGG_SPOTS[EGG_SPOTS.length - 7]]);
    for (const [map, [x, y]] of Object.entries(WAGON_STOPS)) { expect(placeOf(x, y)).toBe(map); expect(walkable(x, y)).toBe(true); }
    for (const [x, y] of POPOTO.tiles) expect(walkable(x, y)).toBe(false);
    for (let y = PEN.y; y < PEN.y + PEN.h; y++) for (let x = PEN.x; x < PEN.x + PEN.w; x++) expect(walkable(x, y)).toBe(false);
    // (Uncle Popoto is talked to from the road the north gate lets in)
    expect(findPath({ x: FARM.x + 2.5, y: 21.5 }, { x: POPOTO.at.x, y: POPOTO.at.y + 1.5 })).not.toBeNull();
  });
});

describe("the animals on the map", () => {
  const day = Date.UTC(2026, 9, 20, 3, 0, 0), night = Date.UTC(2026, 9, 20, 15, 0, 0);
  it("never walks a way through a wall, a tree, the fence or the water", () => {
    for (const w of allWays()) for (let i = 1; i < w.length; i++) {
      const a = w[i - 1], b = w[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
      let was = { x: Math.floor(a.x), y: Math.floor(a.y) };
      for (let k = 0; k <= n; k++) {
        const x = a.x + ((b.x - a.x) * k) / n, y = a.y + ((b.y - a.y) * k) / n, t = { x: Math.floor(x), y: Math.floor(y) };
        expect(walkable(t.x, t.y) || pastureThing(t.x, t.y) === "water", `${t.x},${t.y}`).toBe(true);
        if (t.x !== was.x || t.y !== was.y) expect(barnWall(was.x, was.y, t.x, t.y), `${was.x},${was.y}>${t.x},${t.y}`).toBe(false);
        was = t;
      }
    }
  });
  it("keeps to its barn while the door is shut, comes out when it opens and home when it shuts, the same on every page", () => {
    const b = BARNS[9];
    for (const sp of ["cow", "sheep", "chicken", "duck"]) for (let i = 0; i < 4; i++) {
      const who = { id: `id-${sp}-${i}`, species: sp, young: i === 3 };
      const shut = animalSpot(who, b.i, i, [], day + i * 7_919, false);
      expect(shut.inside).toBe(b.i);
      expect(animalSpot(who, b.i, i, [], day + i * 7_919, false)).toEqual(shut);
      const opened = day - 20 * 60_000;
      for (let k = 0; k < 30; k++) {
        const t = day + k * 41_000, out = animalSpot(who, b.i, i, [[opened, null]], t, false);
        expect(out.inside === -1 || out.inside === b.i, `${sp} ${t}`).toBe(true);
        if (out.pose !== "walk" && out.pose !== "swim") expect(pastureThing(Math.floor(out.x), Math.floor(out.y)), `${sp} ${out.x},${out.y}`).toBeNull();
      }
      // (out a while, then home: in its stall a few minutes after the door is shut)
      expect(animalSpot(who, b.i, i, [[opened, null]], day, false).inside).toBe(-1);
      expect(animalSpot(who, b.i, i, [[opened, day]], day + 40 * 60_000, false).inside).toBe(b.i);
    }
  });
  it("lies down at night, in the barn or out", () => {
    expect(asleepAt(night)).toBe(true);
    expect(animalSpot({ id: "a", species: "cow", young: false }, 0, 0, [], night).pose).toBe("sleep");
    expect(penSpot("a", "cow", night).pose).toBe("sleep");
    const p = penSpot("b", "sheep", day, false);
    expect(p.x >= PEN.x && p.x < PEN.x + PEN.w && p.y >= PEN.y && p.y < PEN.y + PEN.h).toBe(true);
  });
  it("has one trough along each barn's back wall, a whole tile a slot for each place, an animal eating at its own", () => {
    expect(Number.isInteger(TROUGH.slot)).toBe(true);
    for (const b of BARNS) for (const room of [2, 4]) {
      const tr = troughOf(b, room);
      expect(tr.slots.length).toBe(room);
      expect(tr.x0).toBeGreaterThanOrEqual(b.x);
      expect(tr.x1).toBeLessThanOrEqual(b.x + b.w);
      expect(tr.y).toBe(b.y);
      for (let k = 0; k < room; k++) { const e = slotSpot(b, room, k); expect(barnAt(e.x, e.y)).toBe(b.i); expect(walkable(Math.floor(e.x), Math.floor(e.y))).toBe(true); expect(tr.slots[k].x1 - tr.slots[k].x0).toBe(TROUGH.slot); }
    }
  });
});
