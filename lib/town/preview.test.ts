import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * What is to come (the bridge, the blacksmith, the mountain's foot, the cave) is in `next dev` only: lib/town/world's
 * PREVIEW. A test runs as neither `next dev` nor a production build, and there the town is as its members have it,
 * which is what every other test of the town is about. So this one says which it means: it makes the world as
 * `next dev` does, and as a production build does, and holds the two to each other.
 */
type World = typeof import("./world");
const made = async (env: "development" | "production" | "test"): Promise<World> => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  return import("./world");
};
const FOUNTAIN_SIDE = { x: 32.5, y: 31.5 };
/** Every tile of a map walked to from one, a step at a time (never over a corner). */
function walked(W: World, from: { x: number; y: number }): Set<string> {
  const start: [number, number] = [Math.floor(from.x), Math.floor(from.y)], place = W.placeOf(start[0], start[1]), floor = W.floorOf(start[0], start[1]);
  const seen = new Set([start.join(",")]), queue = [start];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (seen.has(k) || W.placeOf(x + dx, y + dy) !== place || W.floorOf(x + dx, y + dy) !== floor || !W.walkable(x + dx, y + dy)) continue;
      seen.add(k);
      queue.push([x + dx, y + dy]);
    }
  }
  return seen;
}

describe("what is to come, in next dev only", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("is not there in a production build, nor in a test: no bridge, no blacksmith, no mountain, no cave", async () => {
    for (const env of ["production", "test"] as const) {
      const W = await made(env);
      expect(W.PREVIEW).toBe(false);
      expect(W.GATES.map((g) => [g.from, g.leads])).toEqual([["town", "farm"], ["farm", "town"], ["town", "forest"], ["forest", "town"]]);
      expect(W.KEEPERS.map((k) => k.id)).toEqual(["uncle", "banker"]);
      expect(W.bridgeOpen()).toBe(false);
      expect([W.BRIDGE.tiles, W.SMITH.tiles, W.MOUNTAIN_PROPS, W.MOUNTAIN_TREES, W.MOUNTAIN_ROCKS, W.MORE_GROUND, W.CAVE.laid, W.CAVE_SEATS, W.PEAKS]).toEqual([[], [], [], [], [], [], [], [], []]);
      // nobody is anywhere there, nothing is seen there, and nobody crosses the river
      for (const [x, y] of [[W.MOUNTAIN.x + 60, W.MOUNTAIN.y + 30], [W.CAVE.x + 10, W.CAVE.y + 10], [-5, 30]]) {
        expect(W.placeOf(x, y)).toBeNull();
        expect(W.walkable(x, y)).toBe(false);
        expect(W.seenAt(x + 0.5, y + 0.5)).toBe(false);
        expect(W.floorOf(x, y)).toBe(0);
      }
      expect(W.findPath(FOUNTAIN_SIDE, { x: 0.5, y: 32.5 })).toBeNull();
      expect(W.walkable(8, 30)).toBe(false);
      expect(W.gateAt(0.5, 32.5)).toBeNull();
      expect(W.groundLook(11.5, 28.5)).toBe(W.groundAt(11, 28));
      // (setting the bridge whole and open there opens nothing: there is no bridge to set)
      W.setBridge(6, true);
      expect(W.bridgeOpen()).toBe(false);
      expect(W.walkable(8, 30)).toBe(false);
      expect(W.BENCHES.every((b) => W.placeOf(b.x, b.y) === "town" || W.placeOf(b.x, b.y) === "forest")).toBe(true);
    }
  });

  it("leaves everything the town already has where it was: its props, its benches, its gates, and every tile of its three maps but the bridge's and the blacksmith's", async () => {
    // (as a test has it: the town as it is live, with the deck and the cooking yard finished as `next dev` has them)
    const live = await made("test"), liveProps = JSON.stringify([live.PROPS, live.FARM_PROPS, live.FOREST_PROPS, live.BEYOND_PROPS]), liveBenches = JSON.stringify(live.BENCHES);
    const liveGates = JSON.stringify(live.GATES), liveShut = new Map<string, boolean>();
    for (const r of [{ x: 0, y: 0, w: live.COLS, h: live.ROWS }, live.FARM, live.FOREST]) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) liveShut.set(`${x},${y}`, live.walkable(x, y));
    const W = await made("development");
    expect(W.PREVIEW).toBe(true);
    expect(JSON.stringify([W.PROPS, W.FARM_PROPS, W.FOREST_PROPS, W.BEYOND_PROPS])).toBe(liveProps);
    // the benches that were, in their places in the list (somebody sitting is told to the room by that number); the new ones after them
    expect(JSON.stringify(W.BENCHES.slice(0, live.BENCHES.length))).toBe(liveBenches);
    expect(JSON.stringify(W.GATES.slice(0, 4))).toBe(liveGates);
    const changed: string[] = [];
    for (const [k, was] of liveShut) { const [x, y] = k.split(",").map(Number); if (W.walkable(x, y) !== was) changed.push(k); }
    const water = W.BRIDGE.tiles.flat().filter(([x, y]) => W.groundAt(x, y) === "water").map(([x, y]) => `${x},${y}`);
    expect(changed.sort()).toEqual([...water, ...W.SMITH.tiles.map(([x, y]) => `${x},${y}`)].sort());
    // and laid out as it was (asBuilt), every one of those tiles is as it is live: what the database keeps is made so
    W.asBuilt(() => { for (const [k, was] of liveShut) { const [x, y] = k.split(",").map(Number); expect(W.walkable(x, y), k).toBe(was); } });
    expect(W.bridgeOpen()).toBe(true);
  });

  it("makes every row the database keeps a copy of exactly as a production build does", async () => {
    const rows = async (env: "development" | "production"): Promise<Record<string, string>> => {
      await made(env);
      const { catalogOf } = await import("./catalog");
      const { HAUNTS } = await import("./insects");
      const { SPOTS, SECRETS } = await import("./forest");
      const all = catalogOf() as unknown as Record<string, unknown>;
      return { ...Object.fromEntries(Object.keys(all).map((key) => [key, JSON.stringify(all[key])])), haunts: JSON.stringify(HAUNTS), spots: JSON.stringify([SPOTS, SECRETS]) };
    };
    const here = await rows("development"), there = await rows("production");
    expect(Object.keys(here)).toEqual(Object.keys(there));
    expect(Object.keys(here).filter((key) => here[key] !== there[key])).toEqual([]);
    expect(JSON.parse(here.haunts).length).toBeGreaterThan(80);
  }, 120_000);

  it("has a bridge of six spans straight across the river at the west path, walked on only when it is whole and opened", async () => {
    const W = await made("development"), tiles = W.BRIDGE.tiles;
    expect(tiles.length).toBe(6);
    expect(tiles.flat().length).toBe(18);
    expect(new Set(tiles.flat().map(([x, y]) => `${x},${y}`)).size).toBe(18);
    // each span is three tiles across the bridge, and the spans go out from the town's bank straight across the screen (x + y the same)
    tiles.forEach(([mid, far, near], i) => {
      expect(mid).toEqual([10 - i, 28 + i]);
      expect(mid[0] + mid[1]).toBe(38);
      expect(far[0] + far[1]).toBe(37);
      expect(near[0] + near[1]).toBe(39);
    });
    // ten of its tiles are water; its first span stands on the town's bank and its last on the far one
    const wet = tiles.map((span) => span.filter(([x, y]) => W.groundAt(x, y) === "water").length);
    expect(wet).toEqual([0, 3, 3, 3, 1, 0]);
    // its foot: a tile of the town's bank one can stand on, beside the first span and walked to from the fountain
    expect(W.BRIDGE.foot).toEqual([11, 27]);
    expect(W.walkable(11, 27)).toBe(true);
    expect(Math.max(Math.abs(11 - tiles[0][0][0]), Math.abs(27 - tiles[0][0][1]))).toBe(1);
    expect(W.findPath(FOUNTAIN_SIDE, { x: 11.5, y: 27.5 })).not.toBeNull();
    // whole and open in the preview: the far bank and the gate on it are walked to, in a straight line over the water
    expect([W.BRIDGE.spans, W.BRIDGE.open, W.bridgeOpen()]).toEqual([6, true, true]);
    for (const [x, y] of tiles.flat()) expect(W.walkable(x, y), `${x},${y}`).toBe(true);
    const over = W.findPath({ x: 11.5, y: 27.5 }, { x: 4.5, y: 34.5 })!;
    expect(over.map((p) => p.x + p.y)).toEqual(over.map(() => 39));
    const gate = W.GATES[4];
    expect(W.findPath(FOUNTAIN_SIDE, { x: gate.tiles[0][0] + 0.5, y: gate.tiles[0][1] + 0.5 })).not.toBeNull();
    expect(W.gateAt(gate.tiles[0][0] + 0.5, gate.tiles[0][1] + 0.5)).toEqual(gate.to);
    // short of whole, or whole and not opened: drawn, and no more. Nobody crosses, and the gate beyond leads nowhere
    for (const [spans, open] of [[0, true], [3, true], [5, true], [6, false]] as const) {
      W.setBridge(spans, open);
      expect(W.BRIDGE.spans).toBe(spans);
      expect(W.bridgeOpen(), `${spans} spans`).toBe(false);
      for (const [x, y] of tiles.flat()) if (W.groundAt(x, y) === "water") expect(W.walkable(x, y), `${spans} spans, ${x},${y}`).toBe(false);
      expect(W.findPath(FOUNTAIN_SIDE, { x: 0.5, y: 32.5 })).toBeNull();
      for (const [x, y] of gate.tiles) expect(W.gateAt(x + 0.5, y + 0.5)).toBeNull();
      // (the town's own gates are as they were)
      expect(W.gateAt(W.GATES[0].tiles[0][0] + 0.5, W.GATES[0].tiles[0][1] + 0.5)).toEqual(W.GATES[0].to);
    }
    W.setBridge(6);
    expect(W.bridgeOpen()).toBe(true);
    expect(W.findPath(FOUNTAIN_SIDE, { x: 0.5, y: 32.5 })).not.toBeNull();
  });

  it("stands the blacksmith beyond the banker, on grass, in nobody's way", async () => {
    const live = await made("test"), before = walked(live, FOUNTAIN_SIDE);
    const W = await made("development"), S = W.SMITH;
    expect(S.id).toBe("smith");
    expect(S.tiles.length).toBeGreaterThanOrEqual(3);
    for (const [x, y] of S.tiles) {
      expect(W.thingAt(x, y)).toBe("keeper");
      expect(W.groundAt(x, y)).toBe("grass");
      expect(W.PROPS.some((p) => p.x === x && p.y === y), `a prop at ${x},${y}`).toBe(false);
      expect(W.KEEPERS.some((k) => k.tiles.some(([kx, ky]) => kx === x && ky === y))).toBe(false);
    }
    // he stands before his forge (lower on the screen), on a tile of his own; his board and his sign on theirs
    for (const at of [S.stand, S.at, S.board, S.sign]) expect(S.tiles.some(([x, y]) => x === Math.floor(at.x) && y === Math.floor(at.y)), JSON.stringify(at)).toBe(true);
    expect(S.at.x + S.at.y).toBeGreaterThan(S.stand.x + S.stand.y);
    // in the keepers' row, beyond the banker: to his right on the screen, and about as far down it
    const banker = W.KEEPERS[1];
    expect(S.stand.x - S.stand.y).toBeGreaterThan(banker.stand.x - banker.stand.y);
    expect(Math.abs(S.stand.x + S.stand.y - banker.stand.x - banker.stand.y)).toBeLessThan(2);
    // somebody can walk up to him, and every tile that was walked to from the fountain still is, but his own
    expect(W.findPath(FOUNTAIN_SIDE, { x: Math.floor(S.at.x) + 0.5, y: Math.floor(S.at.y) + 1.5 })).not.toBeNull();
    W.setBridge(0);
    const after = walked(W, FOUNTAIN_SIDE), his = new Set(S.tiles.map(([x, y]) => `${x},${y}`));
    expect([...before].filter((k) => !after.has(k)).sort()).toEqual([...his].sort());
    expect([...after].filter((k) => !before.has(k))).toEqual([]);
  });

  it("puts the mountain and the cave's floors in tile space of their own, clear of every other map", async () => {
    const W = await made("development");
    const boxes: Array<[string, { x: number; y: number; w: number; h: number }]> = [
      ["town", { x: 0, y: 0, w: W.COLS, h: W.ROWS }], ["farm", W.FARM], ["forest", W.FOREST], ["north", W.BEYOND.north], ["south", W.BEYOND.south],
      ["mountain", W.MOUNTAIN], ["west", W.BEYOND_MORE.west], ["low", W.BEYOND_MORE.low], ["high", W.BEYOND_MORE.high],
      ...W.CAVE.laid.map((n): [string, { x: number; y: number; w: number; h: number }] => [`floor ${n}`, { ...W.floorCorner(n), w: W.CAVE.size, h: W.CAVE.size }]),
    ];
    for (const [a, p] of boxes) for (const [b, q] of boxes) {
      if (a >= b) continue;
      // (what is seen beyond a map lies against it; no two boxes share a tile)
      expect(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h, `${a} and ${b}`).toBe(false);
    }
    // walked maps are no further east than a path's tiles are numbered, and nowhere left or above the tile space's corner
    for (const [name, r] of boxes) if (name === "mountain" || name.startsWith("floor")) { expect(r.x).toBeGreaterThanOrEqual(0); expect(r.y).toBeGreaterThanOrEqual(0); expect(r.x + r.w).toBeLessThanOrEqual(256); }
    // a floor's square is far enough from the next that the two are never on one screen: more than a floor's width of nothing between
    expect(W.CAVE.apart - W.CAVE.size).toBeGreaterThanOrEqual(W.CAVE.size);
    // where one stands says which map, and which floor
    expect(W.placeOf(W.MOUNTAIN.x + 60, W.MOUNTAIN.y + 30)).toBe("mountain");
    expect(W.placeOf(W.MOUNTAIN.x - 1, W.MOUNTAIN.y + 30)).toBeNull();
    expect(W.seenAt(W.MOUNTAIN.x - 1, W.MOUNTAIN.y + 30)).toBe(true);
    expect(W.seenAt(-3, 33)).toBe(true);
    expect(W.placeOf(-3, 33)).toBeNull();
    for (const n of W.CAVE.laid) {
      const c = W.floorCorner(n);
      expect(W.floorOf(c.x, c.y)).toBe(n);
      expect(W.floorOf(c.x + W.CAVE.size - 1, c.y + W.CAVE.size - 1)).toBe(n);
      expect(W.placeOf(c.x + 5, c.y + 5)).toBe("cave");
      expect(W.floorOf(c.x + W.CAVE.size, c.y)).toBe(0);
      expect(W.placeOf(c.x + W.CAVE.size, c.y)).toBeNull();
    }
    expect(W.CAVE.laid).toEqual([1, 2, 3, 10, 11, 20, 21, 30]);
    // (a floor that is not laid is nowhere)
    const four = W.floorCorner(4);
    expect(W.floorOf(four.x + 5, four.y + 5)).toBe(0);
    expect(W.floorOf(32.5, 31.5)).toBe(0);
  });

  it("joins the town and the mountain by a gate each, beyond the bridge and in the mountain's east edge", async () => {
    const W = await made("development");
    expect(W.GATES.map((g) => [g.from, g.leads])).toEqual([["town", "farm"], ["farm", "town"], ["town", "forest"], ["forest", "town"], ["town", "mountain"], ["mountain", "town"]]);
    const [, , , , west, back] = W.GATES;
    // the town's is at its west edge, on the far bank; no tile is a gate to two places
    for (const [x] of west.tiles) expect(x).toBeLessThan(2);
    expect(west.tiles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(W.GATES.flatMap((g) => g.tiles.map(([x, y]) => `${x},${y}`))).size).toBe(W.GATES.reduce((n, g) => n + g.tiles.length, 0));
    for (const g of [west, back]) {
      for (const [x, y] of g.tiles) {
        expect(W.placeOf(x, y)).toBe(g.from);
        expect(W.groundAt(x, y)).toBe("road");
        expect(W.walkable(x, y)).toBe(true);
        expect(W.gateAt(x + 0.5, y + 0.5)).toEqual(g.to);
      }
      // it puts one on the other map, on a tile of path that is not itself a gate
      expect(W.placeOf(g.to.x, g.to.y)).toBe(g.leads);
      expect(W.walkable(Math.floor(g.to.x), Math.floor(g.to.y))).toBe(true);
      expect(W.groundAt(Math.floor(g.to.x), Math.floor(g.to.y))).toBe("road");
      expect(W.gateAt(g.to.x, g.to.y)).toBeNull();
      // its gateway stands on its own map with ground all round it, a ring's width
      expect(W.placeOf(g.arch.x, g.arch.y)).toBe(g.from);
      for (let turn = 0; turn < 16; turn++) expect(W.seenAt(g.arch.x + Math.cos((turn * Math.PI) / 8) * 1.3, g.arch.y + Math.sin((turn * Math.PI) / 8) * 1.3)).toBe(true);
    }
    // from the fountain to the gate, through it, and from where it puts one back to the mountain's own gate
    expect(W.findPath(FOUNTAIN_SIDE, { x: west.tiles[0][0] + 0.5, y: west.tiles[0][1] + 0.5 })).not.toBeNull();
    expect(W.findPath(west.to, { x: back.tiles[0][0] + 0.5, y: back.tiles[0][1] + 0.5 })).not.toBeNull();
    expect(W.findPath(back.to, { x: 30.5, y: 30.5 })).not.toBeNull();
    // no walking from one map to another
    expect(W.findPath(FOUNTAIN_SIDE, west.to)).toBeNull();
    expect(W.findPath(west.to, { x: W.FOREST.x + 48.5, y: W.FOREST.y + 76.5 })).toBeNull();
  });

  it("stands the mountain in the world: all of it walked to from its gate, its trees and rocks numbered, its seats benches", async () => {
    const W = await made("development"), M = W.MOUNTAIN, start = W.GATES[4].to, seen = walked(W, start);
    for (let y = M.y; y < M.y + M.h; y++) for (let x = M.x; x < M.x + M.w; x++) if (W.walkable(x, y)) expect(seen.has(`${x},${y}`), `${x},${y}`).toBe(true);
    expect(seen.size).toBeGreaterThan(2800);
    // every tree and every rock: its number is its place in the list, its tile is its own and nobody walks on it
    expect(W.MOUNTAIN_TREES.map((t) => t.id)).toEqual(W.MOUNTAIN_TREES.map((_, i) => i));
    expect(W.MOUNTAIN_ROCKS.map((r) => r.id)).toEqual(W.MOUNTAIN_ROCKS.map((_, i) => i));
    expect([W.MOUNTAIN_TREES.filter((t) => t.tier === 1).length, W.MOUNTAIN_TREES.filter((t) => t.tier === 2).length, W.MOUNTAIN_TREES.filter((t) => t.tier === 3).length]).toEqual([60, 40, 20]);
    expect(W.MOUNTAIN_ROCKS.length).toBe(54);
    for (const t of [...W.MOUNTAIN_TREES, ...W.MOUNTAIN_ROCKS]) {
      expect(W.placeOf(t.x, t.y)).toBe("mountain");
      expect(W.walkable(t.x, t.y)).toBe(false);
      // (somebody can stand beside each one)
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${t.x + dx},${t.y + dy}`)), `${t.id} at ${t.x},${t.y}`).toBe(true);
    }
    expect(new Set([...W.MOUNTAIN_TREES, ...W.MOUNTAIN_ROCKS].map((t) => `${t.x},${t.y}`)).size).toBe(174);
    expect(W.MOUNTAIN_TREES[0]).toEqual({ id: 0, x: M.x + 39, y: M.y + 45, tier: 1 });
    expect(W.MOUNTAIN_ROCKS[0]).toEqual({ id: 0, x: M.x + 39, y: M.y + 24, look: W.MOUNTAIN_ROCKS[0].look });
    // the camp's four logs and the lookout's bench are benches, after the forest's; each is sat on from a tile one can walk to
    const seats = W.BENCHES.filter((b) => W.placeOf(b.x, b.y) === "mountain");
    expect(seats.map((b) => b.kind)).toEqual(["logseat", "logseat", "logseat", "logseat", "bench"]);
    for (const b of seats) expect(seen.has(`${b.x + W.FRONT[b.facing!].x},${b.y + W.FRONT[b.facing!].y}`)).toBe(true);
    // its great things: the cedar's nine tiles shut, the lookout's deck open, the mine's mouth open in the cliff
    const { cedar, lookout, mouthTiles } = W.MOUNTAIN_AT;
    for (let y = cedar.y; y < cedar.y + cedar.h; y++) for (let x = cedar.x; x < cedar.x + cedar.w; x++) expect(W.walkable(x, y)).toBe(false);
    expect(W.walkable(lookout.x, lookout.y)).toBe(true);
    for (const [x, y] of mouthTiles) expect(seen.has(`${x},${y}`)).toBe(true);
    // the ground: what it is drawn as, and what the town's own kinds say of it
    expect(W.groundLook(M.x + 54.5, M.y + 20.5)).toBe("cliff");
    expect(W.groundAt(M.x + 54, M.y + 20)).toBe("sand");
    expect(W.groundLook(M.x + 54.5, M.y + 14)).toBe("stair");
    expect(W.groundAt(M.x + 54, M.y + 14)).toBe("road");
    expect(W.faceRise(M.x + 54.5, M.y + 20.5)).toBeGreaterThan(0);
    expect(W.faceRise(M.x + 60.5, M.y + 20.5)).toBeNull();
  });

  it("joins the mine's mouth and the cave's floors by ladders, made anew each day", async () => {
    const W = await made("development");
    for (const day of [0, 20369, 20370]) {
      W.setCaveDay(day);
      expect(W.caveDayNow()).toBe(day);
      const one = W.caveSpots(1), [mx, my] = W.MOUNTAIN_AT.mouthTiles[0];
      // the mouth puts one beside the first floor's ladder
      for (const [x, y] of W.MOUNTAIN_AT.mouthTiles) expect(W.gateAt(x + 0.5, y + 0.5)).toEqual({ x: one.arrive[0] + 0.5, y: one.arrive[1] + 0.5 });
      // the ladder one came down by goes back up: to before the mouth, on the yard, not on a gate
      const out = W.gateAt(one.up[0] + 0.5, one.up[1] + 0.5)!;
      expect(W.placeOf(out.x, out.y)).toBe("mountain");
      expect(W.walkable(Math.floor(out.x), Math.floor(out.y))).toBe(true);
      expect(W.gateAt(out.x, out.y)).toBeNull();
      expect(Math.hypot(out.x - mx, out.y - my)).toBeLessThan(3.5);
      // each ladder down puts one beside the next floor's ladder up, and that one beside the ladder down it came from
      for (const [n, next] of [[1, 2], [2, 3], [10, 11], [20, 21]]) {
        const here = W.caveSpots(n), there = W.caveSpots(next);
        const down = W.gateAt(here.down[0] + 0.5, here.down[1] + 0.5)!, up = W.gateAt(there.up[0] + 0.5, there.up[1] + 0.5)!;
        expect(down).toEqual({ x: there.arrive[0] + 0.5, y: there.arrive[1] + 0.5 });
        expect(W.floorOf(up.x, up.y)).toBe(n);
        expect(Math.max(Math.abs(up.x - 0.5 - here.down[0]), Math.abs(up.y - 0.5 - here.down[1]))).toBe(1);
        for (const to of [down, up]) { expect(W.walkable(Math.floor(to.x), Math.floor(to.y))).toBe(true); expect(W.gateAt(to.x, to.y)).toBeNull(); }
      }
      // where the next floor is not laid a ladder leads nowhere: down from 3, 11, 21 and 30; up from 10, 20 and 30
      for (const n of [3, 11, 21, 30]) { const s = W.caveSpots(n); expect(W.gateAt(s.down[0] + 0.5, s.down[1] + 0.5)).toBeNull(); }
      for (const n of [10, 20, 30]) { const s = W.caveSpots(n); expect(W.gateAt(s.up[0] + 0.5, s.up[1] + 0.5)).toBeNull(); }
      // every floor: walked from where one arrives to its ladder down by the map's own way of finding a path, and nobody walks into its rock
      for (const n of W.CAVE.laid) {
        const s = W.caveSpots(n), c = W.floorCorner(n);
        expect(W.findPath({ x: s.arrive[0] + 0.5, y: s.arrive[1] + 0.5 }, { x: s.down[0] + 0.5, y: s.down[1] + 0.5 }), `floor ${n}, day ${day}`).not.toBeNull();
        expect(W.walkable(c.x, c.y)).toBe(false);
        expect(W.groundLook(c.x + 0.5, c.y + 0.5)).toBe("cavewall");
        expect(W.groundLook(s.arrive[0] + 0.5, s.arrive[1] + 0.5)).toBe("cavefloor");
        // its rocks, in the world's tiles, each with its number on that floor; nobody walks on one
        const rocks = W.caveRocks(n);
        expect(rocks.map((r) => r.id)).toEqual(rocks.map((_, i) => i));
        for (const r of rocks) { expect(W.floorOf(r.x, r.y)).toBe(n); expect(W.walkable(r.x, r.y)).toBe(false); }
        expect(rocks.length).toBe(n % 10 === 0 ? 0 : W.caveToday(n).rocks.length);
        if (s.lift) { expect(W.walkable(s.lift[0], s.lift[1])).toBe(false); expect(W.walkable(s.liftAt![0], s.liftAt![1])).toBe(true); expect(W.walkable(s.fire![0], s.fire![1])).toBe(false); }
      }
      // no walking from one floor to another
      const two = W.caveSpots(2);
      expect(W.findPath({ x: one.arrive[0] + 0.5, y: one.arrive[1] + 0.5 }, { x: two.arrive[0] + 0.5, y: two.arrive[1] + 0.5 })).toBeNull();
    }
    // another day, another cave: the first floor's ladders are somewhere else (a resting floor's are where they were)
    W.setCaveDay(20369);
    const then = JSON.stringify(W.caveSpots(1)), rest = JSON.stringify(W.caveSpots(10));
    W.setCaveDay(20370);
    expect(JSON.stringify(W.caveSpots(1))).not.toBe(then);
    expect(JSON.stringify(W.caveSpots(10))).toBe(rest);
    // the logs round each resting floor's fire are benches, the last in the list
    expect(W.CAVE_SEATS.length).toBe(12);
    expect(W.BENCHES.slice(-12)).toEqual(W.CAVE_SEATS);
    for (const b of W.CAVE_SEATS) { expect(W.placeOf(b.x, b.y)).toBe("cave"); expect(W.walkable(b.x + W.FRONT[b.facing!].x, b.y + W.FRONT[b.facing!].y)).toBe(true); }
  });

  it("stands somebody told to go to another floor there at once: between floors there is no walking", async () => {
    const W = await made("development");
    W.setCaveDay(20369);
    const one = W.caveSpots(1), two = W.caveSpots(2);
    const from = { x: one.down[0] + 0.5, y: one.down[1] + 0.5 }, to = { x: two.arrive[0] + 0.5, y: two.arrive[1] + 0.5 };
    // (what a page that hears of such a move walks: one step to there, lib/town/session)
    expect(W.stepAlong(from, [to], 0.05)).toEqual({ pos: to, path: [] });
    // on one floor, and everywhere else, a step is a step
    const beside = { x: from.x + 1, y: from.y };
    expect(W.stepAlong(from, [beside], 0.25)).toEqual({ pos: { x: from.x + 0.25, y: from.y }, path: [beside] });
    expect(W.stepAlong({ x: 30.5, y: 30.5 }, [{ x: 34.5, y: 30.5 }], 1).pos).toEqual({ x: 31.5, y: 30.5 });
  });

  it("shades its own ground: a cliff by its height, a stair by its steps, a cave by its depth", async () => {
    const W = await made("development"), M = W.MOUNTAIN;
    expect(W.MORE_GROUND).toEqual(["rock", "cliff", "stair", "snow", "cavefloor", "cavewall"]);
    // a cliff's face is darker at its foot than up it, and brightest at its lip
    const { cliffTop, CLIFF } = await import("./mountain"), top = M.x + cliffTop(0, 20.5);
    const foot = W.groundTone("cliff", top + CLIFF - 0.1, M.y + 20.5)![0], mid = W.groundTone("cliff", top + CLIFF / 2, M.y + 20.5)![0], lip = W.groundTone("cliff", top + 0.1, M.y + 20.5)![0];
    expect(foot).toBeLessThan(mid);
    expect(mid).toBeLessThan(lip);
    // a stair has light treads and dark risers, three steps to a tile
    const steps = Array.from({ length: 30 }, (_, i) => W.groundTone("stair", M.x + 54 + i / 30, M.y + 14)![0]);
    expect(new Set(steps).size).toBe(2);
    expect(steps.filter((k, i) => i > 0 && k !== steps[i - 1]).length).toBeGreaterThanOrEqual(5);
    // bare rock and snow are as their textures are
    expect(W.groundTone("rock", M.x + 20, M.y + 20)).toBeNull();
    // the cave's earth: as its texture is on the first ten floors, colder on the next ten, redder below
    const floorTone = (n: number) => { const s = W.caveSpots(n); return W.groundTone("cavefloor", s.arrive[0] + 0.5, s.arrive[1] + 0.5); };
    expect(floorTone(1)).toBeNull();
    expect(floorTone(10)).toBeNull();
    const cold = floorTone(11)!, red = floorTone(21)!;
    expect(cold[2]).toBeGreaterThan(cold[0]);
    expect(red[0]).toBeGreaterThan(red[2]);
    expect(floorTone(30)).toEqual(red);
    // the top of a cave's rock is all but black
    const c = W.floorCorner(1);
    expect(W.groundTone("cavewall", c.x + 0.5, c.y + 0.5)![0]).toBeLessThanOrEqual(0.5);
  });
});
