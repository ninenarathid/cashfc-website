import { afterAll, describe, expect, it, vi } from "vitest";
import MAP from "./shop-map.json";

/**
 * Granny Twilla's clothes shop (lib/town/shop-room, 2026-10-25): a room of its own, entered from the editor's town by
 * the townhouse's door. Read with the editor's town switched on, as lib/town/town2.test does.
 */
const g = globalThis as { __cashTownMap?: string };
const load = async () => {
  vi.resetModules();
  g.__cashTownMap = "town2";
  const world = await import("./world");
  const room = await import("./shop-room");
  const town2 = await import("./town2");
  return { ...world, ...room, T2_SHOP_DOOR: town2.T2_SHOP_DOOR };
};
afterAll(() => { delete g.__cashTownMap; vi.resetModules(); });

describe("the clothes shop", () => {
  it("is a map of its own, clear of every other", async () => {
    const w = await load();
    const { x, y, w: cols, h: rows } = w.SHOP_ROOM;
    expect([cols, rows]).toEqual([MAP.cols, MAP.rows]);
    for (let ty = y - 1; ty <= y + rows; ty++) for (let tx = x - 1; tx <= x + cols; tx++) {
      const inside = tx >= x && ty >= y && tx < x + cols && ty < y + rows;
      expect(w.placeOf(tx, ty)).toBe(inside ? "shop" : null);
    }
    expect(w.indoors("shop")).toBe(true);
    expect(w.indoors("town")).toBe(false);
    // (and the camera has its bounds)
    const { BOUNDS } = await import("./camera");
    expect(BOUNDS.shop.maxX - BOUNDS.shop.minX).toBe((cols + rows) * 32);
  });

  it("is walked as the export says: its collision rows, and never across a wall", async () => {
    const w = await load();
    const { x: X, y: Y } = w.SHOP_ROOM;
    // (and the one tile Granny stands on, which the export has open)
    const granny = (tx: number, ty: number) => w.SHOP_KEEPER.tiles.some(([gx, gy]) => gx === X + tx && gy === Y + ty);
    for (let ty = 0; ty < MAP.rows; ty++) for (let tx = 0; tx < MAP.cols; tx++) expect(w.walkable(X + tx, Y + ty)).toBe(MAP.walk[ty][tx] === "." && !granny(tx, ty));
    // the west and north walls close their edges, straight and round their ends; inside the room nothing is walled
    expect(w.shopOverWall(X, Y + 2, X - 1, Y + 2)).toBe(true);
    expect(w.shopOverWall(X + 4, Y, X + 4, Y - 1)).toBe(true);
    expect(w.shopOverWall(X + 4, Y, X + 3, Y - 1)).toBe(true);
    expect(w.shopOverWall(X + 4, Y + 1, X + 5, Y + 1)).toBe(false);
    expect(w.shopOverWall(X + 4, Y + 1, X + 5, Y)).toBe(false);
    // from the way in to the floor before the west counter, and to behind the middle counter, inside the room all along
    for (const goal of [{ x: X + 1.5, y: Y + 6.5 }, { x: X + 4.5, y: Y + 3.5 }, { x: X + 4.5, y: Y + 0.5 }]) {
      const path = w.findPath(w.SHOP_IN, goal);
      expect(path).not.toBeNull();
      for (const p of path!) expect(w.placeOf(p.x, p.y)).toBe("shop");
    }
    // and no path out of it but by the ring
    expect(w.findPath(w.SHOP_IN, { x: 75.5, y: 36.5 })).toBeNull();
  });

  it("is gone into by the townhouse's door and out by its ring, never bounced back", async () => {
    const w = await load();
    const [dx, dy] = w.T2_SHOP_DOOR.tile;
    // the door is a tile of the house: nobody stands on it, a path ends on it from the street before it, and it leads in
    expect(w.walkable(dx, dy)).toBe(false);
    expect(w.walkable(Math.floor(w.T2_SHOP_DOOR.out.x), Math.floor(w.T2_SHOP_DOOR.out.y))).toBe(true);
    const inward = w.findPath(w.T2_SHOP_DOOR.out, { x: dx + 0.5, y: dy + 0.5 })!;
    expect(inward.map((p) => [Math.floor(p.x), Math.floor(p.y)])).toEqual([[dx, dy]]);
    expect(w.gateAt(dx + 0.5, dy + 0.5)).toEqual(w.SHOP_IN);
    // never walked through on the way past it
    const past = w.findPath({ x: dx - 0.5, y: dy + 1.5 }, { x: dx + 1.5, y: dy + 1.5 })!;
    expect(past.some((p) => Math.floor(p.x) === dx && Math.floor(p.y) === dy)).toBe(false);
    // in: by the ring, on open floor, on no gate
    expect(w.walkable(Math.floor(w.SHOP_IN.x), Math.floor(w.SHOP_IN.y))).toBe(true);
    expect(w.gateAt(w.SHOP_IN.x, w.SHOP_IN.y)).toBeNull();
    // out: the ring's tiles, open, leading to the street before the door, which is no gate
    expect(w.SHOP_RING.tiles.length).toBeGreaterThan(0);
    for (const [x, y] of w.SHOP_RING.tiles) {
      expect(w.walkable(x, y)).toBe(true);
      expect(w.gateAt(x + 0.5, y + 0.5)).toEqual(w.T2_SHOP_DOOR.out);
      expect(Math.hypot(x + 0.5 - w.SHOP_IN.x, y + 0.5 - w.SHOP_IN.y)).toBeLessThan(1.6);
    }
    expect(w.gateAt(w.T2_SHOP_DOOR.out.x, w.T2_SHOP_DOOR.out.y)).toBeNull();
    // the gates of the other maps are where they were in the list, the shop's after them all
    expect(w.GATES.slice(-2).map((q) => `${q.from}>${q.leads}`)).toEqual(["town>shop", "shop>town"]);
  });

  it("has Granny Twilla before her table in the east corner, on a tile of her own, reached from the floor beside her", async () => {
    const w = await load();
    const granny = w.KEEPERS.find((k) => k.id === "granny")!;
    expect(granny).toBeTruthy();
    expect(w.KEEPERS[0].id).toBe("uncle");
    expect(w.KEEPERS[1].id).toBe("banker");
    expect(granny.tiles).toEqual([[Math.floor(granny.at.x), Math.floor(granny.at.y)]]);
    expect(w.walkable(Math.floor(granny.at.x), Math.floor(granny.at.y))).toBe(false);
    expect(w.placeOf(granny.stand.x, granny.stand.y)).toBe("shop");
    // the floor before her table (the owner moved her there, 2026-10-26) is open and reached from the way in
    const table = w.SHOP_THINGS[w.SHOP_KEEPER.behind];
    expect(table.name).toMatch(/^wrapping_table/);
    const before = { x: Math.floor(granny.at.x) + 0.5, y: Math.floor(granny.at.y) + 1.5 };
    expect(w.walkable(Math.floor(before.x), Math.floor(before.y))).toBe(true);
    expect(w.findPath(w.SHOP_IN, before)).not.toBeNull();
    // drawn in front of her table, after the walls
    const { ShopRoomArt } = await import("./shop-room-art");
    const art = new ShopRoomArt(), table2 = art.things[w.SHOP_KEEPER.behind];
    expect(art.keeperDepth).toBeGreaterThan(table2.d);
    const walls = art.things.filter((t) => t.how === 2), rest = art.things.filter((t) => t.how === 1);
    expect(walls.length).toBe(MAP.walls.length);
    expect(Math.max(...walls.map((t) => t.d))).toBeLessThan(Math.min(...rest.map((t) => t.d), art.keeperDepth));
  });

  it("keeps the outdoors' things outdoors: nothing is dropped on its floor", async () => {
    await load();
    const { drop } = await import("./ground");
    const { newPurse } = await import("./trade");
    const { SHOP_IN, SHOP_ROOM } = await import("./shop-room");
    const purse = { ...newPurse(), bag: [{ item: "worm", n: 1 }, ...newPurse().bag.slice(1)] } as ReturnType<typeof newPurse>;
    expect(drop(purse, 0, "me", [Math.floor(SHOP_IN.x), Math.floor(SHOP_IN.y)], 0, 1).ok).toBe(false);
    // (as in the town's plaza it is)
    expect(drop(purse, 0, "me", [36, 44], 0, 1).ok).toBe(true);
    expect(SHOP_ROOM.x).toBeGreaterThan(0);
  });
});
