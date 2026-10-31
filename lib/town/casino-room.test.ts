import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * The Popoto Casino as a room of the town (lib/town/casino-room, 2026-10-27): in by the kura's door of the editor's
 * town, which opens only for whom the database lets in (lib/town/world's setCasinoDoor); out by the carpet at its foot.
 * Read with the editor's town switched on, as lib/town/shop-room.test does.
 */
const g = globalThis as { __cashTownMap?: string };
const load = async () => {
  vi.resetModules();
  g.__cashTownMap = "town2";
  const world = await import("./world");
  const room = await import("./casino-room");
  const floor = await import("./casino-floor");
  const town2 = await import("./town2");
  return { ...world, ...room, ...floor, T2_CASINO_DOOR: town2.T2_CASINO_DOOR, T2_SHOP_DOOR: town2.T2_SHOP_DOOR, SHOP_ROOM: (await import("./shop-room")).SHOP_ROOM };
};
afterAll(() => { delete g.__cashTownMap; vi.resetModules(); });

describe("the Popoto Casino in the town", () => {
  it("is a map of its own, indoors, clear of every other and of the clothes shop", async () => {
    const w = await load();
    const { x, y, w: cols, h: rows } = w.CASINO_ROOM;
    for (let ty = y - 1; ty <= y + rows; ty++) for (let tx = x - 1; tx <= x + cols; tx++) {
      const inside = tx >= x && ty >= y && tx < x + cols && ty < y + rows;
      expect(w.placeOf(tx, ty)).toBe(inside ? "casino" : null);
    }
    expect(w.indoors("casino")).toBe(true);
    expect(x).toBeGreaterThanOrEqual(w.SHOP_ROOM.x + w.SHOP_ROOM.w + 1);
    const { BOUNDS } = await import("./camera");
    expect(BOUNDS.casino.maxX).toBeGreaterThan(BOUNDS.casino.minX);
  });

  it("is walked as its interior says, and every stool is reached from the way in", async () => {
    const w = await load();
    for (let ty = 0; ty < w.CASINO_ROOM.h; ty++) for (let tx = 0; tx < w.CASINO_ROOM.w; tx++) {
      expect(w.walkable(w.CASINO_ROOM.x + tx, w.CASINO_ROOM.y + ty)).toBe(w.casinoWalkable({ x: tx + 0.5, y: ty + 0.5 }));
    }
    expect(w.walkable(Math.floor(w.CASINO_IN.x), Math.floor(w.CASINO_IN.y))).toBe(true);
    expect(w.gateAt(w.CASINO_IN.x, w.CASINO_IN.y)).toBeNull();
    for (const [i, stool] of w.CASINO_STOOLS.entries()) {
      const path = w.findPath(w.CASINO_IN, stool);
      expect(path, `stool ${i + 1}`).not.toBeNull();
      expect(path!.at(-1)).toEqual(stool);
      expect(w.stoolAt(stool)).toBe(i + 1);
    }
    expect(w.stoolAt(w.CASINO_IN)).toBe(0);
    // twenty, on two rows, the first ten where they stood before the room went back (the owner, 2026-10-31)
    expect(w.CASINO_STOOLS).toHaveLength(20);
    expect(new Set(w.CASINO_STOOLS.map((s) => `${s.x},${s.y}`)).size).toBe(20);
    expect(w.CASINO_STOOLS[0]).toEqual({ x: 342.5, y: 115.5 });
    expect(w.CASINO_STOOLS[9]).toEqual({ x: 369.5, y: 115.5 });
    expect(w.CASINO_STOOLS[10]).toEqual({ x: 342.5, y: 109.5 });
    expect(w.CASINO_IN).toEqual({ x: 356.5, y: 121.5 });
  });

  it("is gone into by the kura's door only while it opens for this page, and out by the carpet always", async () => {
    const w = await load();
    const [dx, dy] = w.T2_CASINO_DOOR.tile;
    // the door's tile is the kura's: nobody stands on it, a path may end there
    expect(w.walkable(dx, dy)).toBe(false);
    expect(w.walkable(Math.floor(w.T2_CASINO_DOOR.out.x), Math.floor(w.T2_CASINO_DOOR.out.y))).toBe(true);
    expect(w.findPath(w.T2_CASINO_DOOR.out, { x: dx + 0.5, y: dy + 0.5 })).not.toBeNull();
    w.setCasinoDoor(false);
    expect(w.gateAt(dx + 0.5, dy + 0.5)).toBeNull();
    w.setCasinoDoor(true);
    expect(w.gateAt(dx + 0.5, dy + 0.5)).toEqual(w.CASINO_IN);
    w.setCasinoDoor(false);
    for (const [x, y] of w.CASINO_EXIT.tiles) {
      expect(w.walkable(x, y)).toBe(true);
      expect(w.gateAt(x + 0.5, y + 0.5)).toEqual(w.T2_CASINO_DOOR.out);
      expect(w.findPath(w.CASINO_IN, { x: x + 0.5, y: y + 0.5 })).not.toBeNull();
    }
    expect(w.gateAt(w.T2_CASINO_DOOR.out.x, w.T2_CASINO_DOOR.out.y)).toBeNull();
    // the shop's door is not the casino's
    expect(w.T2_CASINO_DOOR.tile).not.toEqual(w.T2_SHOP_DOOR.tile);
  });
});
