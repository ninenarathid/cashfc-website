import { describe, expect, it } from "vitest";
import {
  BUILDINGS, COLS, DROP, FAR, MAX_LINES, MOVE_BUDGET, NEAR, ROWS, TREES, findPath, fromIso, hearing,
  moveEvery, pickLines, spawnFor, stepAlong, toIso, walkable,
} from "./world";

describe("projection", () => {
  it("goes to isometric pixels and back", () => {
    for (const [x, y] of [[0, 0], [3.5, 7.25], [17.9, 0.1], [9, 9]]) {
      const back = fromIso(toIso(x, y).x, toIso(x, y).y);
      expect(back.x).toBeCloseTo(x, 9);
      expect(back.y).toBeCloseTo(y, 9);
    }
  });
});

describe("walking", () => {
  it("keeps people off buildings, trees and the edge of the world", () => {
    const k = BUILDINGS[0];
    expect(walkable(k.x, k.y)).toBe(false);
    expect(walkable(TREES[0].x, TREES[0].y)).toBe(false);
    expect(walkable(-1, 3)).toBe(false);
    expect(walkable(COLS, 3)).toBe(false);
    expect(walkable(0, 0)).toBe(true);
  });

  it("finds a path around a building, never through it", () => {
    const path = findPath({ x: 1.5, y: 3.5 }, { x: 6.5, y: 3.5 })!;
    expect(path).not.toBeNull();
    expect(path.at(-1)).toEqual({ x: 6.5, y: 3.5 });
    for (const p of path) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
  });

  it("never cuts a corner past something solid", () => {
    const path = findPath({ x: 0.5, y: 0.5 }, { x: 17.5, y: 17.5 })!;
    let prev = { x: 0.5, y: 0.5 };
    for (const p of path) {
      const dx = Math.sign(p.x - prev.x), dy = Math.sign(p.y - prev.y);
      if (dx && dy) {
        expect(walkable(Math.floor(prev.x) + dx, Math.floor(prev.y))).toBe(true);
        expect(walkable(Math.floor(prev.x), Math.floor(prev.y) + dy)).toBe(true);
      }
      prev = p;
    }
  });

  it("refuses a destination nobody can stand on", () => {
    const k = BUILDINGS[0];
    expect(findPath({ x: 0.5, y: 0.5 }, { x: k.x + 1.5, y: k.y + 1.5 })).toBeNull();
  });

  it("is the same path every time, so every client draws the same walk", () => {
    const a = JSON.stringify(findPath({ x: 6.5, y: 6.5 }, { x: 16.5, y: 11.5 }));
    const b = JSON.stringify(findPath({ x: 6.5, y: 6.5 }, { x: 16.5, y: 11.5 }));
    expect(a).toBe(b);
  });

  it("walks a distance along the path and stops at the end", () => {
    const path = [{ x: 2.5, y: 0.5 }, { x: 2.5, y: 2.5 }];
    const half = stepAlong({ x: 0.5, y: 0.5 }, path, 1);
    expect(half.pos.x).toBeCloseTo(1.5);
    expect(half.path).toHaveLength(2);
    const end = stepAlong({ x: 0.5, y: 0.5 }, path, 99);
    expect(end.pos).toEqual({ x: 2.5, y: 2.5 });
    expect(end.path).toHaveLength(0);
  });
});

describe("hearing", () => {
  it("with distance: full up close, silent far away, and fades in between", () => {
    expect(hearing(0, true)).toBe(1);
    expect(hearing(NEAR, true)).toBe(1);
    expect(hearing(FAR, true)).toBe(0);
    expect(hearing(30, true)).toBe(0);
    const mid = hearing((NEAR + FAR) / 2, true);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it("without distance: everybody at full volume, wherever they stand", () => {
    expect(hearing(0, false)).toBe(1);
    expect(hearing(30, false)).toBe(1);
  });
});

describe("voice lines", () => {
  const me = { x: 9, y: 6 };
  const at = (id: string, d: number) => ({ id, pos: { x: 9 + d, y: 6 } });

  it("with distance: opens lines to people within earshot, not beyond", () => {
    const lines = pickLines(me, [at("near", 2), at("edge", FAR), at("far", FAR + 0.5)], new Set(), true);
    expect([...lines].sort()).toEqual(["edge", "near"]);
  });

  it("with distance: keeps an open line until somebody is past DROP, so the edge does not flap", () => {
    const keep = pickLines(me, [at("walking", FAR + 1)], new Set(["walking"]), true);
    expect(keep.has("walking")).toBe(true);
    const gone = pickLines(me, [at("walking", DROP + 0.1)], new Set(["walking"]), true);
    expect(gone.has("walking")).toBe(false);
  });

  it("with distance: opens no more than MAX_LINES, nearest first", () => {
    const crowd = Array.from({ length: 20 }, (_, i) => at(`p${String(i).padStart(2, "0")}`, 0.2 + i * 0.3));
    const lines = pickLines(me, crowd, new Set(), true);
    expect(lines.size).toBe(MAX_LINES);
    expect(lines.has("p00")).toBe(true);
    expect(lines.has("p19")).toBe(false);
  });

  it("without distance: a line to everybody in voice, however far", () => {
    const lines = pickLines(me, [at("near", 1), at("far", 30)], new Set(), false);
    expect([...lines].sort()).toEqual(["far", "near"]);
  });
});

describe("announcing steps", () => {
  it("is quick in a small room", () => {
    expect(moveEvery(2)).toBe(300);
    expect(moveEvery(6)).toBe(300);
  });

  it("keeps a whole room's steps within the budget, even if everybody clicks nonstop", () => {
    for (let n = 2; n <= 40; n++) {
      expect((n * (n - 1) * 1000) / moveEvery(n)).toBeLessThanOrEqual(MOVE_BUDGET);
    }
  });

  it("slows down as the room fills", () => {
    expect(moveEvery(30)).toBe(3480);
    expect(moveEvery(30)).toBeGreaterThan(moveEvery(20));
  });
});

describe("arriving", () => {
  it("puts the same person in the same walkable spot every time", () => {
    const a = spawnFor("00000000-0000-0000-0000-000000000001");
    expect(spawnFor("00000000-0000-0000-0000-000000000001")).toEqual(a);
    expect(walkable(Math.floor(a.x), Math.floor(a.y))).toBe(true);
    expect(a.x).toBeLessThan(COLS);
    expect(a.y).toBeLessThan(ROWS);
  });
});
