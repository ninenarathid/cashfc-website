import { describe, expect, it } from "vitest";
import {
  ANCIENT, CAMP, CLIFF, GATE_ROWS, LOOKOUT, MOUNTAIN_H, MOUNTAIN_W, MOUTH, MOUTH_AT, STAIRS,
  cliffAt, cliffTop, closedOf, layMountain, mountainGround, sampleAge, shut, stairAt, terraceAt, type MountainProp,
} from "./mountain";
import { FRONT } from "./world";

const key = (u: number, v: number) => `${u},${v}`;
const props = layMountain(), closed = closedOf(props);
const open = (u: number, v: number, also?: (u: number, v: number) => boolean) =>
  u >= 0 && v >= 0 && u < MOUNTAIN_W && v < MOUNTAIN_H && !closed.has(key(u, v)) && !also?.(u, v);
/** Every tile walked to from one, a step at a time (up, down and across the tiles: never over a corner), where `also` shuts some more. */
function walked(from: readonly [number, number], also?: (u: number, v: number) => boolean): Set<string> {
  const seen = new Set([key(from[0], from[1])]), queue: Array<[number, number]> = [[from[0], from[1]]];
  while (queue.length) {
    const [u, v] = queue.pop()!;
    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!open(u + du, v + dv, also) || seen.has(key(u + du, v + dv))) continue;
      seen.add(key(u + du, v + dv));
      queue.push([u + du, v + dv]);
    }
  }
  return seen;
}
/** Where the town's gate puts somebody: a few tiles in from the east edge, in the gate's row. */
const START: [number, number] = [MOUNTAIN_W - 4, GATE_ROWS[0]];
const isStair = (u: number, v: number) => stairAt(u + 0.5, v + 0.5);
const terraceOfTile = (u: number, v: number) => terraceAt(u + 0.5, v + 0.5);

/** The first and the last tree of each kind, and three rocks, as the seed lays them: [its number, its tile]. */
const TREES_BY_NAME = [[0, 39, 45], [59, 37, 45], [60, 28, 52], [99, 24, 11], [100, 10, 9], [119, 8, 2]];
const ROCKS_BY_NAME = [[0, 39, 24], [39, 43, 13], [53, 7, 39]];

describe("the mountain's foot, laid out", () => {
  it("is the same every time: every screen has the same mountain", () => {
    expect(layMountain()).toEqual(props);
    expect(props.length).toBeGreaterThan(300);
    // (a few things, by name: a change of the seed or of the order things are laid in would move them)
    expect(props[0]).toEqual({ kind: "campfire", u: CAMP.u, v: CAMP.v, solid: true });
    expect(props.filter((p) => p.kind === "logseat").map((p) => [p.u, p.v, p.facing])).toEqual([[62, 36, "SE"], [62, 37, "SE"], [63, 35, "SW"], [64, 35, "SW"]]);
  });

  it("climbs in four terraces towards the screen's upper left, each divided from the next by a cliff", () => {
    const tiles = [0, 0, 0, 0];
    for (let v = 1; v < MOUNTAIN_H - 1; v++) {
      // along any row, from the east edge to the west: the yard, a cliff, the slope, a cliff, the upper terrace, a cliff, the summit
      let row = "";
      for (let u = MOUNTAIN_W - 2; u >= 1; u--) {
        const c = cliffAt(u + 0.5, v + 0.5), part = c ? `c${c.k}` : `t${terraceOfTile(u, v)}`;
        if (!row.endsWith(part)) row += part;
        if (!c) tiles[terraceOfTile(u, v)]++;
      }
      expect(row, `row ${v}`).toBe("t0c0t1c1t2c2t3");
    }
    for (const n of tiles) expect(n).toBeGreaterThan(600);
    // a cliff is as thick everywhere, and thick enough that no step, straight or across a corner, gets over it
    for (let k = 0; k < 3; k++) for (let v = 0; v < MOUNTAIN_H; v++) {
      const top = cliffTop(k, v + 0.5);
      let wide = 0;
      for (let u = 0; u < MOUNTAIN_W; u++) if (cliffAt(u + 0.5, v + 0.5)?.k === k) wide++;
      expect(wide, `cliff ${k}, row ${v}`).toBeGreaterThanOrEqual(2);
      expect(wide).toBeLessThanOrEqual(3);
      expect(Math.abs(cliffTop(k, v + 1.5) - top)).toBeLessThan(0.5);
      // its face rises from its foot (the lower terrace's side) to its top
      expect(cliffAt(top + 0.05, v + 0.5)!.rise).toBeGreaterThan(0.95);
      expect(cliffAt(top + CLIFF - 0.05, v + 0.5)!.rise).toBeLessThan(0.05);
    }
  });

  it("has two stone stairs up each cliff, two tiles wide, and they are the only way from one terrace to the next", () => {
    expect(STAIRS.map((s) => s.length)).toEqual([2, 2, 2]);
    for (let k = 0; k < 3; k++) for (const s of STAIRS[k]) {
      for (const v of [s, s + 1]) {
        const tiles = [...Array(MOUNTAIN_W).keys()].filter((u) => cliffAt(u + 0.5, v + 0.5)?.k === k);
        expect(tiles.length).toBeGreaterThanOrEqual(2);
        for (const u of tiles) { expect(isStair(u, v)).toBe(true); expect(open(u, v)).toBe(true); expect(mountainGround(u + 0.5, v + 0.5)).toBe("stair"); }
      }
      // (the rows beside a stair are cliff)
      for (const v of [s - 1, s + 2]) for (let u = 0; u < MOUNTAIN_W; u++) if (cliffAt(u + 0.5, v + 0.5)?.k === k) expect(open(u, v)).toBe(false);
    }
    // every tile of a cliff that is neither a stair nor the mine's mouth is shut
    for (let v = 0; v < MOUNTAIN_H; v++) for (let u = 0; u < MOUNTAIN_W; u++) {
      if (cliffAt(u + 0.5, v + 0.5) && !isStair(u, v) && !MOUTH.some(([mu, mv]) => mu === u && mv === v)) expect(open(u, v), key(u, v)).toBe(false);
    }
    const highest = (seen: Set<string>) => Math.max(...[...seen].map((k) => { const [u, v] = k.split(",").map(Number); return cliffAt(u + 0.5, v + 0.5) ? 0 : terraceOfTile(u, v); }));
    // with every stair shut, nobody leaves the foot yard
    expect(highest(walked(START, isStair))).toBe(0);
    // with one cliff's two stairs shut, nobody gets above it; with only one of the two shut, everybody still does
    for (let k = 0; k < 3; k++) {
      const both = (u: number, v: number) => isStair(u, v) && cliffAt(u + 0.5, v + 0.5)!.k === k;
      expect(highest(walked(START, both))).toBe(k);
      for (const s of STAIRS[k]) {
        const one = (u: number, v: number) => both(u, v) && (v === s || v === s + 1);
        expect(highest(walked(START, one))).toBe(3);
      }
    }
  });

  it("can be walked all over from the gate: nothing but the cliffs shuts a way", () => {
    const seen = walked(START);
    for (let v = 0; v < MOUNTAIN_H; v++) for (let u = 0; u < MOUNTAIN_W; u++) if (open(u, v)) expect(seen.has(key(u, v)), key(u, v)).toBe(true);
    // the gate's two tiles at the east edge, the mine's mouth, and the rim shut everywhere else
    for (const v of GATE_ROWS) { expect(open(MOUNTAIN_W - 1, v)).toBe(true); expect(mountainGround(MOUNTAIN_W - 0.5, v + 0.5)).toBe("road"); }
    for (let v = 0; v < MOUNTAIN_H; v++) {
      expect(open(0, v)).toBe(false);
      if (!(GATE_ROWS as readonly number[]).includes(v)) expect(open(MOUNTAIN_W - 1, v)).toBe(false);
    }
    for (let u = 0; u < MOUNTAIN_W; u++) { expect(shut(u, 0)).toBe(true); expect(shut(u, MOUNTAIN_H - 1)).toBe(true); }
  });

  it("has the mine's mouth in the first cliff's face, open, with the yard before it", () => {
    expect(MOUTH.length).toBe(2);
    for (const [u, v] of MOUTH) {
      expect(open(u, v)).toBe(true);
      // the foot yard is the next tile out, and the cliff the next tile in
      expect(open(u + 1, v)).toBe(true);
      expect(terraceOfTile(u + 1, v)).toBe(0);
      expect(cliffAt(u - 0.5, v + 0.5)?.k).toBe(0);
      expect(open(u - 1, v)).toBe(false);
    }
    expect(cliffAt(MOUTH[0][0] + 0.5, MOUTH[0][1] + 0.5)?.k).toBe(0);
    expect(MOUTH_AT).toEqual({ u: MOUTH[0][0] + 1, v: MOUTH[1][1] });
    // it faces the gate: in the gate's own rows
    expect(MOUTH.map(([, v]) => v)).toEqual([...GATE_ROWS]);
  });

  it("stands nothing on a stair, a gate, the mouth or a trail, and nothing solid where it could shut a way", () => {
    const solid = new Set(props.filter((p) => p.solid).map((p) => key(p.u, p.v)));
    const hard = (u: number, v: number) => ["cliff", "stair", "road"].includes(mountainGround(u + 0.5, v + 0.5));
    const rim = (u: number, v: number) => u <= 0 || v <= 0 || v >= MOUNTAIN_H - 1 || u >= MOUNTAIN_W - 1;
    expect(new Set(props.map((p) => key(p.u, p.v))).size).toBe(props.length);
    for (const p of props) {
      expect(isStair(p.u, p.v), `${p.kind} ${p.u},${p.v}`).toBe(false);
      expect(mountainGround(p.u + 0.5, p.v + 0.5), `${p.kind} ${p.u},${p.v}`).not.toBe("road");
      expect(MOUTH.some(([u, v]) => u === p.u && v === p.v)).toBe(false);
      expect(p.u === MOUNTAIN_W - 1 && (GATE_ROWS as readonly number[]).includes(p.v)).toBe(false);
      if (!p.solid || rim(p.u, p.v)) continue;
      // whatever is laid from the seed and stops a walker has open ground all round it: no other solid thing, no cliff, no
      // stair, no trail, no rim. (The camp's four logs and the things by them are set down by hand, a step apart.)
      const byHand = Math.hypot(p.u - CAMP.u, p.v - CAMP.v) < 5 || p.kind === "bench" || p.kind === "msign";
      for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) {
        if (!du && !dv) continue;
        const u = p.u + du, v = p.v + dv;
        if (!byHand) { expect(solid.has(key(u, v)), `${p.kind} ${p.u},${p.v} beside another`).toBe(false); expect(hard(u, v), `${p.kind} ${p.u},${p.v}`).toBe(false); expect(rim(u, v)).toBe(false); }
      }
    }
    // the rim's own things stand on the rim, on every other tile of it
    for (const p of props) if (rim(p.u, p.v)) { expect(p.solid).toBe(true); expect((p.u + p.v) % 2).toBe(0); }
  });

  it("has about sixty pines and forty rocks on the slope, forty ironwoods above, twenty moonwoods on the summit, and one ancient cedar", () => {
    const trees = (tier: number) => props.filter((p) => p.kind === "mtree" && p.tier === tier);
    expect(trees(1).length).toBe(60);
    expect(trees(2).length).toBe(40);
    expect(trees(3).length).toBe(20);
    for (const [tier, terrace] of [[1, 1], [2, 2], [3, 3]] as const) for (const p of trees(tier)) expect(terraceOfTile(p.u, p.v)).toBe(terrace);
    const rocks = props.filter((p) => p.kind === "mrock");
    expect(rocks.filter((p) => terraceOfTile(p.u, p.v) === 1).length).toBe(40);
    for (const p of rocks) expect([0, 1, 2]).toContain(p.look);
    expect(new Set(rocks.map((p) => p.look)).size).toBe(3);
    // the layout says nothing of a tree's age: whoever keeps the game does. Where nobody does yet, the preview can ask
    // for a sample, in which every kind of tree is there at every age and most are grown
    for (const tier of [1, 2, 3]) {
      expect(new Set(trees(tier).map((p) => sampleAge(p.id!)))).toEqual(new Set([0, 1, 2, 3]));
      expect(trees(tier).filter((p) => sampleAge(p.id!) === 3).length).toBeGreaterThan(trees(tier).length * 0.55);
    }
    // the cedar: three tiles by three on the slope, shut, in a glade with nothing standing within a step of it
    for (let v = ANCIENT.v; v < ANCIENT.v + ANCIENT.h; v++) for (let u = ANCIENT.u; u < ANCIENT.u + ANCIENT.w; u++) {
      expect(open(u, v)).toBe(false);
      expect(terraceOfTile(u, v)).toBe(1);
    }
    for (const p of props) expect(p.u >= ANCIENT.u - 1 && p.u < ANCIENT.u + ANCIENT.w + 1 && p.v >= ANCIENT.v - 1 && p.v < ANCIENT.v + ANCIENT.h + 1, `${p.kind} by the cedar`).toBe(false);
    expect(mountainGround(ANCIENT.u + 1.5, ANCIENT.v + 4.5)).toBe("grass");
  });

  it("gives every tree and every rock a number of its own, which stays what it is", () => {
    const trees = props.filter((p) => p.kind === "mtree"), rocks = props.filter((p) => p.kind === "mrock");
    // numbered from nought in the order they were laid, each kind by itself: a number is a place in its list
    expect(trees.map((p) => p.id)).toEqual(trees.map((_, i) => i));
    expect(rocks.map((p) => p.id)).toEqual(rocks.map((_, i) => i));
    // the slope's pines first, then the upper terrace's ironwoods, then the summit's moonwoods
    expect(trees.map((p) => p.tier).join("")).toBe("1".repeat(60) + "2".repeat(40) + "3".repeat(20));
    expect(rocks.slice(0, 40).every((p) => terraceOfTile(p.u, p.v) === 1)).toBe(true);
    // nothing else has one
    for (const p of props) if (p.kind !== "mtree" && p.kind !== "mrock") expect(p.id).toBeUndefined();
    // (a few by name: whoever keeps the game keeps these numbers, and a change of the seed would hand its trees to other tiles)
    const at = (p: MountainProp) => [p.id, p.u, p.v];
    expect([trees[0], trees[59], trees[60], trees[99], trees[100], trees[119]].map(at)).toEqual(TREES_BY_NAME);
    expect([rocks[0], rocks[39], rocks[53]].map(at)).toEqual(ROCKS_BY_NAME);
  });

  it("has a camp in the foot yard with logs to sit on, a storage chest, and a lookout with a bench on the summit", () => {
    const seats = props.filter((p): p is MountainProp & { facing: NonNullable<MountainProp["facing"]> } => !!p.facing);
    expect(seats.map((p) => p.kind)).toEqual(["logseat", "logseat", "logseat", "logseat", "bench"]);
    const seen = walked(START);
    for (const p of seats) {
      // sat on from the tile before it, which is open and walked to
      const f = FRONT[p.facing];
      expect(open(p.u + f.x, p.v + f.y), `${p.kind} ${p.u},${p.v}`).toBe(true);
      expect(seen.has(key(p.u + f.x, p.v + f.y))).toBe(true);
    }
    expect(terraceOfTile(CAMP.u, CAMP.v)).toBe(0);
    expect(props.filter((p) => p.kind === "storebox").map((p) => terraceOfTile(p.u, p.v))).toEqual([0]);
    // the lookout: at the summit's far end, its deck walked on, its bench looking out (away from the map)
    const bench = seats[4];
    expect(terraceOfTile(bench.u, bench.v)).toBe(3);
    expect(bench.facing).toBe("NW");
    expect(bench.u).toBeLessThan(8);
    for (let v = LOOKOUT.v; v < LOOKOUT.v + LOOKOUT.h; v++) for (let u = LOOKOUT.u; u < LOOKOUT.u + LOOKOUT.w; u++) if (!(u === bench.u && v === bench.v)) expect(open(u, v)).toBe(true);
  });

  it("is floored differently on each terrace, with trails from the gate to the mouth, to every stair and to the lookout", () => {
    const grounds = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
    for (let v = 1; v < MOUNTAIN_H - 1; v++) for (let u = 1; u < MOUNTAIN_W - 1; u++) {
      const g = mountainGround(u + 0.5, v + 0.5);
      if (g !== "cliff" && g !== "stair") grounds[terraceOfTile(u, v)].set(g, (grounds[terraceOfTile(u, v)].get(g) ?? 0) + 1);
    }
    const most = (m: Map<string, number>) => [...m].filter(([g]) => g !== "road").sort((a, b) => b[1] - a[1])[0][0];
    expect(grounds.map(most)).toEqual(["grass", "wood", "rock", "snow"]);
    for (const m of grounds) expect(m.get("road") ?? 0).toBeGreaterThan(20);
    // a trail at each end of every stair, and at the gate, the mouth and the lookout
    for (let k = 0; k < 3; k++) for (const s of STAIRS[k]) {
      const v = s + 1, top = cliffTop(k, v);
      expect(mountainGround(top - 0.6, v)).toBe("road");
      expect(mountainGround(top + CLIFF + 0.6, v)).toBe("road");
    }
    expect(mountainGround(MOUTH_AT.u + 0.6, MOUTH_AT.v)).toBe("road");
    expect(mountainGround(LOOKOUT.u + LOOKOUT.w - 0.4, LOOKOUT.v + 1.5)).toBe("road");
  });
});
