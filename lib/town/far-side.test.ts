import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogOf } from "./catalog";
import { farCedar, farRocks, farTrees } from "./far-side";
import { MOUNTAIN_ROCKS, MOUNTAIN_TREES } from "./world";

/**
 * The database is given the far side whole, whoever writes its catalog: the mountain's trees and the rocks of its
 * foot are laid out by lib/town/far-side wherever it is asked, and are what the world itself has in `next dev`.
 * (A test is not `next dev`: here the world has none of it, which is the very reason the catalog does not read the
 * world's own lists.)
 */
describe("the far side's lists, for the database", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("are full, as the world's own are in every build", () => {
    expect([MOUNTAIN_TREES.length, MOUNTAIN_ROCKS.length]).toEqual([120, 54]);
    expect(farTrees()).toEqual(MOUNTAIN_TREES);
    expect([farTrees().length, farRocks().length]).toEqual([120, 54]);
    const all = catalogOf();
    // (the hundred and twenty numbered trees and the ancient cedar; every rock of the mountain's foot)
    expect(all.trees.wood.length).toBe(121);
    expect(all.mining.rocks.length).toBe(54);
    expect(all.trees.wood.map((t) => t[0])).toEqual([...Array.from({ length: 120 }, (_, i) => i), all.trees.elder.id]);
    expect(all.mining.rocks.map((r) => r[0])).toEqual(Array.from({ length: 54 }, (_, i) => i));
  });

  it("are the world's own, tree for tree and rock for rock, as `next dev` has them", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const world = await import("./world"), trees = await import("./trees"), far = await import("./far-side"), catalog = await import("./catalog");
    expect(world.PREVIEW).toBe(true);
    expect(far.farTrees()).toEqual(world.MOUNTAIN_TREES);
    expect(far.farRocks()).toEqual(world.MOUNTAIN_ROCKS);
    expect(far.farCedar()).toEqual(world.MOUNTAIN_AT.cedar);
    // (and so the two rows are the ones a catalog written in `next dev` would have)
    expect(JSON.parse(JSON.stringify(catalog.catalogOf().trees))).toEqual(JSON.parse(JSON.stringify(trees.treesRow())));
    expect(catalog.catalogOf().mining.rocks).toEqual(world.MOUNTAIN_ROCKS.map((r) => [r.id, r.x, r.y, r.look]));
    // (the same lists, made here where the world has none)
    expect(far.farTrees()).toEqual(farTrees());
    expect(far.farRocks()).toEqual(farRocks());
    expect(far.farCedar()).toEqual(farCedar());
  });

  it("are in the block v164 carries, in a production build as in the others", async () => {
    const { CATALOG_KEYS, seedFor } = await import("./catalog");
    expect(CATALOG_KEYS.v164).toEqual({ keys: ["forge", "trees", "mining", "pouches"], over: ["items", "goods", "shelf", "hints", "makes", "cooking", "work", "gifts"] });
    const block = seedFor("v164");
    // (a row's top entries are a line each: the two lists, whole)
    const line = (key: string) => JSON.parse(block.split("\n").find((l) => l.startsWith(`    "${key}": `))!.replace(/^ {4}"[a-z]+": /, "").replace(/,$/, "")) as unknown[];
    expect([line("wood").length, line("rocks").length]).toEqual([121, 54]);
    // (a production build lays the mountain out too: the block is the same there)
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const there = await import("./catalog");
    expect(there.catalogOf().trees.wood.length).toBe(121);
    expect(there.seedFor("v164")).toBe(block);
  }, 60_000);
});
