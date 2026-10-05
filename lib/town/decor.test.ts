import { describe, expect, it } from "vitest";
import { DECOR, FACES, artOf, carving, gateLook, ringAt } from "./decor";
import { FARM_PROPS, FOREST_PROPS, GATES, NORTH_WOOD, PROPS, BEYOND_PROPS, placeOf, seenAt, walkable } from "./world";

describe("what the town has only to look at (the owner's own pixel art, 2026-10-05)", () => {
  it("draws some of the town's and the farm's trees as apple trees, and none of the forest's", () => {
    const share = (props: typeof PROPS) => { const trees = props.filter((p) => p.kind === "tree"); return trees.filter((p) => artOf(p) === "appletree").length / trees.length; };
    expect(share(FARM_PROPS)).toBeGreaterThan(0.15);
    expect(share(FARM_PROPS)).toBeLessThan(0.5);
    expect(share(PROPS)).toBeGreaterThan(0.05);
    expect(share(PROPS)).toBeLessThan(0.3);
    expect(share(FOREST_PROPS)).toBe(0);
    expect(share([...BEYOND_PROPS.north, ...BEYOND_PROPS.south])).toBe(0);
    // nor in the woods that close in on the way to the forest
    expect(PROPS.filter((p) => p.kind === "tree" && p.y < NORTH_WOOD.h && artOf(p) !== "tree")).toEqual([]);
  });

  it("gives about half the forest's stumps toadstools, and a log in three is a short one", () => {
    const stumps = FOREST_PROPS.filter((p) => p.kind === "stump"), logs = FOREST_PROPS.filter((p) => p.kind === "log");
    const plain = stumps.filter((p) => artOf(p) === "stump").length / stumps.length;
    expect(plain).toBeGreaterThan(0.25);
    expect(plain).toBeLessThan(0.75);
    expect(new Set(stumps.map(artOf))).toEqual(new Set(["stump", "stumpCaps", "stumpMoss"]));
    expect(new Set(logs.map(artOf))).toEqual(new Set(["log", "logShort"]));
  });

  it("changes nothing but those pictures: every other prop is drawn as its kind, and the same on every call", () => {
    for (const p of [...PROPS, ...FARM_PROPS, ...FOREST_PROPS]) {
      if (p.kind !== "tree" && p.kind !== "stump" && p.kind !== "log") expect(artOf(p)).toBe(p.kind);
      expect(artOf(p)).toBe(artOf({ ...p }));
    }
  });

  it("marks the forest's way with a torii at both ends, the farm's with its wooden gateway, each over a ring", () => {
    for (const g of GATES) {
      const look = gateLook(g), forest = g.from === "forest" || g.leads === "forest";
      expect(look.arch).toBe(forest ? "torii" : "gateway");
      expect(look.ring).toBe(forest ? "ringWild" : "ring");
    }
  });

  it("lays every ring on ground there is, on the gate's own map", () => {
    // (a ring is about a tile and a third from its middle to its rim)
    for (const g of GATES) {
      const at = ringAt(g);
      expect(placeOf(at.x, at.y)).toBe(g.from);
      for (let turn = 0; turn < 16; turn++) {
        const x = at.x + Math.cos((turn * Math.PI) / 8) * 1.3, y = at.y + Math.sin((turn * Math.PI) / 8) * 1.3;
        expect(seenAt(x, y), `${g.from} to ${g.leads}, ${x.toFixed(1)},${y.toFixed(1)}`).toBe(true);
      }
    }
  });

  it("puts every pumpkin on a tile nobody walks on, so that none is walked through and no tile closes for one", () => {
    expect(DECOR.length).toBeGreaterThan(8);
    for (const d of DECOR) {
      expect(placeOf(d.x, d.y), `${d.art} at ${d.x},${d.y}`).not.toBeNull();
      expect(walkable(Math.floor(d.x), Math.floor(d.y)), `${d.art} at ${d.x},${d.y}`).toBe(false);
    }
  });

  it("keeps the carved ones in the town and the plain ones on the farm, and knows where a carved one's face is", () => {
    for (const d of DECOR) {
      expect(placeOf(d.x, d.y)).toBe(d.carved ? "town" : "farm");
      expect(d.art in FACES).toBe(!!d.carved);
    }
  });

  it("has carved pumpkins out from the first of October to the second of November, by Bangkok's calendar", () => {
    const at = (iso: string) => carving(Date.parse(iso));
    expect(at("2026-10-05T12:00:00+07:00")).toBe(true);
    expect(at("2026-10-01T00:00:00+07:00")).toBe(true);
    expect(at("2026-09-30T23:59:59+07:00")).toBe(false);
    expect(at("2026-11-02T23:59:59+07:00")).toBe(true);
    expect(at("2026-11-03T00:00:00+07:00")).toBe(false);
    expect(at("2027-01-15T12:00:00+07:00")).toBe(false);
  });
});
