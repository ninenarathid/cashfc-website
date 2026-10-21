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
    // into the hall by a door, never through its wall
    expect(w.findPath({ x: 66.5, y: 55.5 }, { x: 66.5, y: 51.5 })?.some((p) => Math.floor(p.y) === 54 && [66, 67].includes(Math.floor(p.x)))).toBe(true);
    const round = w.findPath({ x: 70.5, y: 55.5 }, { x: 70.5, y: 52.5 })!;
    for (let i = 1; i < round.length; i++) {
      const [a, b] = [round[i - 1], round[i]], into = b.y < 54 && a.y >= 54;
      if (into) expect([66, 67]).toContain(Math.floor(b.x));
    }
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
