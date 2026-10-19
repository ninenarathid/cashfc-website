import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { COLS, FARM, GATES, PROPS, PROPS_FIRST, ROWS, ROWS_FIRST, asBuilt, findPath, fishFrom, gateAt, groundAt, placeOf, walkable } from "./world";

/*
 * The farm's second gate and the town's southern strip (the owner, 2026-10-19: "อยากทำวาร์ปกลับเมืองตรงนี้ โดยอยากให้
 * ห่างกับวาร์ปจุดแรกเท่ากับความห่างของวาร์ปจุดแรกและจุดสอง", and asked, "ขยายเมืองลง 16 แถว").
 */
const tiles = (from: string, leads: string) => GATES.filter((g) => g.from === from && g.leads === leads).map((g) => g.tiles.map(([x, y]) => `${x},${y}`).sort());

describe("the farm's second gate", () => {
  it("is as far below the first on both sides: 42 rows", () => {
    const [town1, town2] = tiles("town", "farm"), [farm1, farm2] = tiles("farm", "town");
    expect(town1).toEqual(["62,30", "62,31", "63,30", "63,31"]);
    expect(town2).toEqual(["62,72", "62,73", "63,72", "63,73"]);
    expect(farm1).toEqual([`${FARM.x},21`, `${FARM.x},22`]);
    expect(farm2).toEqual([`${FARM.x},63`, `${FARM.x},64`]);
    const [to1, to2] = GATES.filter((g) => g.from === "farm").map((g) => g.to), [at1, at2] = GATES.filter((g) => g.leads === "farm").map((g) => g.to);
    expect(to2.y - to1.y).toBe(42);
    expect(at2.y - at1.y).toBe(42);
  });

  it("puts you on a way you can walk, off any gate, on the map it leads to", () => {
    for (const g of GATES.filter((g) => (g.from === "farm" && g.leads === "town") || (g.from === "town" && g.leads === "farm"))) {
      const tx = Math.floor(g.to.x), ty = Math.floor(g.to.y);
      expect(placeOf(tx, ty)).toBe(g.leads);
      expect(walkable(tx, ty)).toBe(true);
      expect(groundAt(tx, ty)).toBe("road");
      expect(gateAt(g.to.x, g.to.y)).toBeNull();
      for (const [x, y] of g.tiles) { expect(walkable(x, y)).toBe(true); expect(groundAt(x, y)).toBe("road"); }
    }
  });

  it("is walked to from the town's first gate, down the lane, and from the farm's", () => {
    const [town1, town2] = GATES.filter((g) => g.from === "farm" && g.leads === "town").map((g) => g.to);
    const way = findPath({ x: town1.x, y: town1.y }, { x: 62.5, y: 72.5 }) ?? [];
    expect(way.length).toBeGreaterThan(30);
    expect(way.every((p) => walkable(Math.floor(p.x), Math.floor(p.y)))).toBe(true);
    const [, farm2] = GATES.filter((g) => g.from === "town" && g.leads === "farm").map((g) => g.to);
    expect((findPath({ x: farm2.x, y: farm2.y }, { x: FARM.x + 28.5, y: FARM.y + 63.5 }) ?? []).length).toBeGreaterThan(20);
    expect(town2).toEqual({ x: COLS - 3.5, y: 73.5 });
  });
});

describe("the town's southern strip", () => {
  it("is town, and nowhere as the town was built", () => {
    expect([ROWS_FIRST, ROWS]).toEqual([64, 80]);
    expect(placeOf(60, 79)).toBe("town");
    expect(asBuilt(() => placeOf(60, 64))).toBeNull();
    expect(asBuilt(() => placeOf(60, 63))).toBe("town");
  });

  it("leaves what stood in the first 64 rows where it stood, but off the lane", () => {
    const first = new Set(PROPS_FIRST.map((p) => `${p.kind},${p.x},${p.y}`));
    const kept = PROPS.filter((p) => p.y < ROWS_FIRST - 1);
    expect(kept.every((p) => first.has(`${p.kind},${p.x},${p.y}`))).toBe(true);
    const gone = PROPS_FIRST.filter((p) => !PROPS.some((q) => q.kind === p.kind && q.x === p.x && q.y === p.y));
    expect(gone.every((p) => ["tree", "pine", "bush", "rock", "flowers"].includes(p.kind) && p.x >= 54)).toBe(true);
    // nothing solid on the lane, and nothing at all where the town's own things were
    for (let y = 30; y < ROWS; y++) for (let x = 54; x < COLS; x++) if (groundAt(x, y) === "road") expect(walkable(x, y), `${x},${y}`).toBe(true);
    expect(asBuilt(() => groundAt(58, 50))).toBe("grass");
  });

  it("has a bank nobody fishes or draws water from: a hand of water from the farm's southern well", () => {
    const places = catalogOf().fishing.places as Record<string, boolean>;
    expect(Object.keys(places).filter((k) => { const [x, y] = k.split(",").map(Number); return x < COLS && y >= ROWS_FIRST && y < ROWS; })).toEqual([]);
    let bank = 0;
    for (let y = ROWS_FIRST; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (groundAt(x, y) === "sand" && walkable(x, y)) { bank++; expect(fishFrom(x, y)).toBeNull(); }
    expect(bank).toBeGreaterThan(10);
  });
});
