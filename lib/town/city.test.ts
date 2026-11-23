import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * The city (lib/town/city, 2026-11-23), read afresh with the switch set (lib/town/town-map), as the editor's town's tests
 * read it: where it lies, where one may walk, its rooms, its ground's heights, its ways out, its fishing, its insects.
 */
const g = globalThis as { __cashTownMap?: string };

describe("the city", () => {
  afterAll(() => { delete g.__cashTownMap; vi.resetModules(); });
  const load = async () => {
    vi.resetModules();
    g.__cashTownMap = "city";
    const world = await import("./world");
    const city = await import("./city");
    const insects = await import("./insects");
    return { world, city, insects };
  };

  it("lies from x -16 to 123 and rows 0 to 134, short of the farm", async () => {
    const { world } = await load();
    expect(world.CITY).toBe(true);
    expect(world.TOWN_RECT).toEqual({ x: -16, y: 0, w: 140, h: 135 });
    expect(world.placeOf(-16, 0)).toBe("town");
    expect(world.placeOf(123, 134)).toBe("town");
    expect(world.placeOf(-17, 10)).toBe(null);
    expect(world.placeOf(128, 10)).toBe("farm");
    expect(world.FARM.x).toBeGreaterThan(123);
  });

  it("is walked on its ground, not in its water nor through its buildings", async () => {
    const { world } = await load();
    expect(world.walkable(50, 66)).toBe(true); // the park
    expect(world.walkable(19, 20)).toBe(false); // the canal
    expect(world.walkable(72, 24)).toBe(false); // the smith's shop
    expect(world.walkable(98, 123)).toBe(true); // the dock's boards
  });

  it("has its rooms walked into by their doorways only", async () => {
    const { city } = await load();
    expect(city.T2_ROOMS.map((r) => r.name).sort()).toEqual(["bank", "cityhall", "hospital", "kitchen", "mart"]);
    const hall = city.T2_ROOMS.find((r) => r.name === "cityhall")!;
    const door = hall.doors[0];
    expect(city.t2OverWall(door.inside[0], door.inside[1], door.outside[0], door.outside[1])).toBe(false);
    // its west wall, a tile in from the doorway
    expect(city.t2OverWall(hall.box[0], hall.box[1] + 3, hall.box[0] - 1, hall.box[1] + 3)).toBe(true);
    expect(city.t2RoomAt(40, 22)?.name).toBe("cityhall");
    expect(city.t2RoomAt(40, 30)).toBe(null);
  });

  it("has its park four steps down and its roads a kerb down", async () => {
    const { city } = await load();
    expect(city.t2Lift(50.5, 66.5)).toBe(-36);
    expect(city.t2Lift(40.5, 30.5)).toBe(0);
    expect([0, -9]).toContain(city.t2Lift(30.5, 66.5));
  });

  it("has four ways out, each with a ring one may step on and a way back onto open ground", async () => {
    const { world, city } = await load();
    for (const g2 of Object.values(city.T2_GATES)) {
      expect(g2.tiles.length).toBeGreaterThan(0);
      expect(world.walkable(Math.floor(g2.back.x), Math.floor(g2.back.y))).toBe(true);
    }
    expect(world.GATES.filter((x) => x.from === "town").map((x) => x.leads).sort()).toEqual(expect.arrayContaining(["casino", "farm", "farm", "forest", "shop"]));
  });

  it("is fished from its banks and, deep, from its dock", async () => {
    const { world } = await load();
    expect(world.fishFrom(98, 123)?.deep).toBe(true);
    expect(world.fishFrom(15, 20)?.deep).toBe(false);
  });

  it("keeps every insect haunt of the town, each by its number, on ground one may stand by", async () => {
    const { world, insects } = await load();
    const town = insects.HAUNTS.filter((h) => h.place === "town");
    expect(town).toHaveLength(23);
    for (const h of town) expect(world.placeOf(Math.floor(h.x), Math.floor(h.y))).toBe("town");
  });

  it("opens the one box at its three chests", async () => {
    const { city } = await load();
    const box = await import("./box");
    expect(city.T2_CHESTS).toHaveLength(3);
    for (const c of city.T2_CHESTS.slice(1)) expect(box.MORE_CHESTS).toContainEqual({ x: c.x, y: c.y });
  });
});
