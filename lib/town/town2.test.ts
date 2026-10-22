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
    const town = w.GATES.filter((gt) => gt.from === "town");
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
});
