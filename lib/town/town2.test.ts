import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * The editor's town (lib/town/town2, 2026-10-22) and the old town it can be switched back to (lib/town/town-map). The old
 * town is what a test has unless it asks; the editor's is read here afresh with the switch set.
 */
const SNAPSHOT = path.join(__dirname, "haunts-classic.json");
const g = globalThis as { __cashTownMap?: string };

describe("the old town's haunts, kept for the editor's town", () => {
  it("are the old town's own, every one", async () => {
    vi.resetModules();
    delete g.__cashTownMap;
    const { HAUNTS } = await import("./insects");
    const { T2 } = await import("./world");
    expect(T2).toBe(false);
    if (process.env.TOWN_WRITE) fs.writeFileSync(SNAPSHOT, JSON.stringify(HAUNTS));
    expect(JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"))).toEqual(JSON.parse(JSON.stringify(HAUNTS)));
  });
});

describe("the editor's town", () => {
  afterAll(() => { delete g.__cashTownMap; vi.resetModules(); });
  const load = async () => {
    vi.resetModules();
    g.__cashTownMap = "town2";
    const world = await import("./world");
    const insects = await import("./insects");
    return { ...world, HAUNTS: insects.HAUNTS };
  };

  it("is this page's town, 80 by 80", async () => {
    const w = await load();
    expect(w.T2).toBe(true);
    expect([w.COLS, w.ROWS]).toEqual([80, 80]);
    expect(w.placeOf(79, 79)).toBe("town");
    expect(w.placeOf(80, 10)).toBe(null);
  });

  it("walks as its rules say", async () => {
    const w = await load();
    expect(w.walkable(36, 44)).toBe(true); // the plaza
    expect(w.walkable(2, 30)).toBe(false); // the river
    expect(w.walkable(2, 17)).toBe(true); // a west bridge's boards
    expect(w.walkable(39, 41)).toBe(false); // the fountain
    expect(w.walkable(69, 49)).toBe(true); // the kitchen hall's floor
    expect(w.walkable(65, 50)).toBe(false); // a table in it
    // into the hall by its two ways only, never through its wall: the gap in the front wall, the doorway at the back
    const front = [67, 68, 69, 70];
    expect(w.findPath({ x: 66.5, y: 55.5 }, { x: 66.5, y: 51.5 })?.some((p) => Math.floor(p.y) === 54 && front.includes(Math.floor(p.x)))).toBe(true);
    const round = w.findPath({ x: 73.5, y: 55.5 }, { x: 73.5, y: 51.5 })!;
    for (let i = 1; i < round.length; i++) {
      const [a, b] = [round[i - 1], round[i]], into = b.y < 54 && a.y >= 54;
      if (into) expect(front).toContain(Math.floor(b.x));
    }
    const back = w.findPath({ x: 68.5, y: 43.5 }, { x: 68.5, y: 48.5 })!;
    expect(back.length).toBeLessThan(12);
    expect(back.some((p) => Math.floor(p.x) === 68 && Math.floor(p.y) === 45)).toBe(true);
    // (the stove that stood in the doorway taken out: its tile is the hall's floor)
    expect(w.walkable(68, 46)).toBe(true);
    // (and not in at the side any more)
    expect(w.findPath({ x: 77.5, y: 47.5 }, { x: 74.5, y: 47.5 })!.length).toBeGreaterThan(6);
  });

  it("has its fishing pier stepped on and off at the foot of its stairs only", async () => {
    const w = await load();
    const { t2OverRail } = await import("./town2");
    // off its front by the crates, its right side, a jetty's rope side: over the railing; down its stairs: not
    expect([t2OverRail(15, 66, 15, 67), t2OverRail(17, 65, 18, 65), t2OverRail(18, 62, 19, 62), t2OverRail(14, 67, 15, 67), t2OverRail(8, 60, 8, 59)]).toEqual([true, true, true, true, true]);
    expect([t2OverRail(19, 63, 20, 63), t2OverRail(20, 64, 19, 64), t2OverRail(15, 65, 15, 66)]).toEqual([false, false, false]);
    // from the grass below its front, up onto the deck: round by the stairs
    const way = w.findPath({ x: 16.5, y: 68.5 }, { x: 15.5, y: 65.5 })!;
    expect(way.some((p) => Math.floor(p.x) === 20 && [63, 64].includes(Math.floor(p.y)))).toBe(true);
  });

  it("has each way out where its ring is, and every arrival on open ground", async () => {
    const w = await load();
    // (the clothes shop's door is a tile of the townhouse walked onto only to go in: lib/town/shop-room.test)
    const town = w.GATES.filter((gt) => gt.from === "town" && gt.leads !== "shop" && gt.leads !== "casino");
    expect(town.map((gt) => gt.leads).sort()).toEqual(["farm", "farm", "forest", "mountain"]);
    for (const gt of town) {
      expect(gt.tiles.length).toBeGreaterThan(0);
      for (const [x, y] of gt.tiles) expect(w.walkable(x, y)).toBe(true);
    }
    for (const gt of w.GATES.filter((q) => q.leads === "town")) {
      expect(w.walkable(Math.floor(gt.to.x), Math.floor(gt.to.y))).toBe(true);
      expect(w.gateAt(gt.to.x, gt.to.y)).toBe(null);
    }
  });

  it("has its shopkeepers, the smith, the chest and the boards where they can be reached", async () => {
    const w = await load();
    const near = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => w.walkable(x + dx, y + dy));
    for (const k of w.KEEPERS) for (const [x, y] of k.tiles) { expect(w.walkable(x, y)).toBe(false); expect(near(x, y)).toBe(true); }
    expect(near(w.STOREBOX.x, w.STOREBOX.y)).toBe(true);
    expect(w.walkable(w.STOREBOX.x, w.STOREBOX.y)).toBe(false);
    expect(w.walkable(Math.floor(w.SMITH.at.x), Math.floor(w.SMITH.at.y)) || near(Math.floor(w.SMITH.at.x), Math.floor(w.SMITH.at.y))).toBe(true);
    expect(w.spawnFor("someone")).toBeTruthy();
  });

  it("has a kitchen hall to cook and eat in: stoves, worktables, water and twelve seats", async () => {
    const w = await load();
    const kinds = new Set(w.KITCHEN.places.map((p) => p.kind));
    expect(kinds.has("stove")).toBe(true);
    expect(kinds.has("table")).toBe(true);
    expect(w.KITCHEN.wash.length).toBeGreaterThan(0);
    expect(w.KITCHEN.seats.length).toBe(12);
    for (const s of w.KITCHEN.seats) expect(w.walkable(s.stand[0], s.stand[1])).toBe(true);
    for (const p of w.KITCHEN.places) expect(w.walkable(p.at[0], p.at[1])).toBe(true);
    expect(w.walkable(w.KITCHEN.feast.tile[0], w.KITCHEN.feast.tile[1])).toBe(true);
  });

  it("has its stage walked on, up and down its stairs only, and nobody behind the water pavilion's tank", async () => {
    const w = await load();
    const { t2Lift, t2OverRail } = await import("./town2");
    expect([w.walkable(9, 48), w.walkable(12, 49), w.walkable(13, 48), w.walkable(14, 49)]).toEqual([true, true, true, true]);
    expect([t2Lift(9.5, 48.5), t2Lift(14.5, 48.5), t2Lift(15.5, 48.5)]).toEqual([70, 17.5, 0]);
    // off its stairs' side: over its edge; off their foot: not
    expect([t2OverRail(14, 48, 14, 47), t2OverRail(14, 49, 14, 50), t2OverRail(14, 48, 15, 48), t2OverRail(15, 49, 14, 49)]).toEqual([true, true, false, false]);
    const up = w.findPath({ x: 16.5, y: 50.5 }, { x: 9.5, y: 48.5 })!;
    expect(up.some((p) => Math.floor(p.x) === 15 && [48, 49].includes(Math.floor(p.y)))).toBe(true);
    expect([w.walkable(69, 16), w.walkable(69, 17), w.walkable(70, 15), w.walkable(71, 15), w.walkable(70, 18), w.walkable(72, 17)]).toEqual([false, false, false, false, true, true]);
  });

  it("has every bench sat on facing its way, two to a long one, each reached and drawn on it", async () => {
    const w = await load();
    const { T2_THINGS } = await import("./town2");
    const benches = w.BENCHES.filter((b) => b.of !== undefined);
    const things = [...new Set(benches.map((b) => b.of!))];
    expect(things.length).toBe(19);
    for (const i of things) {
      const t = T2_THINGS[i], places = benches.filter((b) => b.of === i), [x0, y0, x1, y1] = t.box;
      const f = places[0].facing!, alongX = f === "SW" || f === "NE", length = alongX ? x1 - x0 : y1 - y0;
      expect(places.every((p) => p.facing === f)).toBe(true);
      expect(places.length).toBe(length >= 1.5 ? 2 : 1);
      // a bench with a back faces as its picture does: down-left as drawn, down-right mirrored
      if (/tea_house_bench|plain_dark_wooden_bench/.test(t.name)) expect(["SW", "SE"]).toContain(f);
      for (const p of places) {
        expect(w.walkable(p.stand!.x, p.stand!.y)).toBe(true);
        expect(w.findPath({ x: 39.5, y: 46.5 }, { x: p.stand!.x + 0.5, y: p.stand!.y + 0.5 })).toBeTruthy();
        expect(p.over).toBeGreaterThan(t.c.x + t.c.y - 0.5);
      }
    }
    const at = (x: number, y: number) => benches.filter((b) => Math.floor(T2_THINGS[b.of!].c.x) === x && Math.floor(T2_THINGS[b.of!].c.y) === y)[0].facing;
    // the water's two face it, the stage's rows the stage, the square's four one another, the backed ones by the lantern the path
    expect([at(55, 70), at(58, 70)]).toEqual(["SW", "SW"]);
    expect([at(15, 46), at(17, 46), at(20, 47), at(15, 51), at(18, 52), at(20, 52)]).toEqual(["NW", "NW", "NW", "NW", "NW", "NW"]);
    expect([at(10, 23), at(7, 23), at(10, 27), at(7, 27)]).toEqual(["SW", "SW", "NE", "NE"]);
    expect([at(53, 38), at(53, 36)]).toEqual(["SE", "SE"]);
    // a place somebody has: the other one on the bench
    const long = benches.find((b) => benches.filter((q) => q.of === b.of).length === 2)!;
    expect(w.benchMates(w.BENCHES.indexOf(long)).length).toBe(2);
    // the hall's places drawn on their benches, before them
    for (const s of w.KITCHEN.seats) expect("over" in s && typeof s.over === "number").toBe(true);
  });

  it("is fished from its decks (deep) and its shores (the shallows)", async () => {
    const w = await load();
    expect(w.fishFrom(13, 64)?.deep).toBe(true);
    expect(w.fishFrom(5, 25)?.deep).toBe(false);
    expect(w.fishFrom(39, 44)).toBe(null);
  });

  it("keeps every haunt's number and kind, the farm's and the forest's untouched, and lays the town's in the editor's town", async () => {
    const { HAUNTS, placeOf } = await load();
    const old = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")) as typeof HAUNTS;
    expect(HAUNTS.length).toBe(old.length);
    HAUNTS.forEach((h, i) => {
      expect(h.id).toBe(old[i].id);
      expect(h.kind).toBe(old[i].kind);
      expect(h.place).toBe(old[i].place);
      if (h.place !== "town") expect(h).toEqual(old[i]);
      else {
        expect(placeOf(Math.floor(h.x), Math.floor(h.y))).toBe("town");
        expect(h.perches.length).toBeGreaterThan(0);
      }
    });
    expect(HAUNTS.filter((h) => h.place === "town").length).toBe(old.filter((h) => h.place === "town").length);
  });

  it("keeps the town's haunts within reach of somebody standing, wherever a new export closes a tile", async () => {
    const { HAUNTS, walkable } = await load();
    for (const h of HAUNTS.filter((q) => q.place === "town")) {
      const near = h.perches.filter((p) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => walkable(Math.floor(p.x) + dx, Math.floor(p.y) + dy))));
      expect(near.length, `haunt ${h.id}`).toBe(h.perches.length);
    }
  });

  // (makoto's feedback on the map, 2026-10-31: what covers what among things that stand still is the editor's)
  describe("draws what stands still as the editor does", () => {
    type O = number[];
    const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, "town2-map.json"), "utf8")) as { names: string[]; objects: O[]; strips: Record<string, number[]>; sprites: Array<[string, number, number]> };
    const of = (re: RegExp, x0: number, y0: number, x1: number, y1: number) => MAP.objects.filter((o) => {
      const cx = (o[8] + o[10]) / 2, cy = (o[9] + o[11]) / 2;
      return re.test(MAP.names[o[0]]) && cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
    });
    /** Whether two things' pictures share a part of the screen. */
    const meet = (a: O, b: O) => {
      const [aw, ah] = [MAP.sprites[a[1]][1] * a[4], MAP.sprites[a[1]][2] * a[4]], [bw, bh] = [MAP.sprites[b[1]][1] * b[4], MAP.sprites[b[1]][2] * b[4]];
      return a[2] < b[2] + bw && b[2] < a[2] + aw && a[3] < b[3] + bh && b[3] < a[3] + ah;
    };
    const STONE = /stepping_stones/;

    it("has every stepping stone standing among the walkers, and nothing but rings, decks and the hall's inside on the floor", () => {
      expect(new Set(MAP.objects.filter((o) => o[6] === 0).map((o) => MAP.names[o[0]]))).toEqual(
        new Set(["bridge", "fishing_pier", "game_ring", "kitchen_house_inside_cloud", "pier_of_mossy_stone_pillars_holding_a_wo"]));
      for (const o of MAP.objects.filter((q) => STONE.test(MAP.names[q[0]]))) expect(o[6]).toBe(1);
    });

    it("has the stones before the flower square over its tulips, and its hydrangeas over the stones below them", () => {
      const tulips = of(/tulips/, 28, 56, 37, 64), hydrangeas = of(/purple_hydrangea/, 33, 61, 46, 72);
      const stones = of(STONE, 32, 59, 40, 67);
      // (the two rows are told apart by their place across the square: x + y about 97 for the upper, 101 and more for the lower)
      const across = (o: O) => (o[8] + o[10] + o[9] + o[11]) / 2;
      const upper = stones.filter((o) => across(o) < 99), lower = stones.filter((o) => across(o) >= 99);
      expect(upper.length).toBeGreaterThan(8);
      expect(lower.length).toBeGreaterThan(8);
      for (const s of upper) for (const t of tulips) if (meet(s, t)) expect(s[7]).toBeGreaterThan(t[7]);
      for (const s of lower) for (const h of hydrangeas) if (meet(s, h)) expect(h[7]).toBeGreaterThan(s[7]);
    });

    it("has the shrine's flower beds over its foot", () => {
      const shrine = MAP.objects.findIndex((o) => MAP.names[o[0]] === "shrine_hall"), strips = MAP.strips[shrine], o = MAP.objects[shrine];
      expect(strips.length).toBe(Math.ceil((MAP.sprites[o[1]][1] * o[4]) / 12));
      // (those in front of its long east side: the strip at the middle of each stands behind it; checks/town2-order.mjs goes by the pixels)
      for (const f of of(/azalea|hydrangea_bush/, 70, 2, 73, 9)) {
        const n = Math.floor((f[2] + (MAP.sprites[f[1]][1] * f[4]) / 2 - o[2]) / 12);
        if (strips[n] !== undefined) expect(f[7]).toBeGreaterThan(strips[n]);
      }
    });

    it("has whoever stands on a stepping stone over it", () => {
      for (const s of MAP.objects.filter((q) => STONE.test(MAP.names[q[0]]))) {
        const cx = (s[8] + s[10]) / 2, cy = (s[9] + s[11]) / 2;
        expect(s[7]).toBeLessThanOrEqual(cx + cy - 0.4);
      }
    });

    it("has the foxes on their rocks, and the stage's pumpkins on it among those walking up there", async () => {
      for (const [fx, rx] of [[61.85, 62.49], [68.85, 69.49]]) {
        const fox = of(/kitsune_fox/, fx - 0.5, 9, fx + 0.5, 11)[0], rock = of(/sacred_rock/, rx - 0.5, 10, rx + 0.5, 11)[0];
        expect(fox[7]).toBeGreaterThan(rock[7]);
      }
      await load();
      const { T2_STAGE_BASE, T2_STAGE_UP } = await import("./town2");
      const { x, y, r } = T2_STAGE_BASE;
      const big = of(/^game_pumpkin2$/, 4, 43, 5, 45)[0], cx = (big[8] + big[10]) / 2, cy = (big[9] + big[11]) / 2;
      // (its place on the stage's top, and past the stage's back edge at its column, so not behind the stage)
      expect(big[7]).toBeCloseTo(cx + cy + T2_STAGE_UP / 16, 2);
      expect(big[7]).toBeGreaterThan(x + y - Math.sqrt(2 * r * r - (cx - cy - (x - y)) ** 2));
      expect(big[6]).toBe(1);
    });
  });
});
