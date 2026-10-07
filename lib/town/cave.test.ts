import { describe, expect, it } from "vitest";
import { CAVE_LIGHT, CAVE_ROCKS, CAVE_SIZE, caveFloor, depthOf, floorAt, hollowAt, isRest, lightsOf, litBy, reveal, type CaveFloor } from "./cave";
import { FRONT } from "./world";

const DAYS = [0, 1, 7, 20369, 20370, 20371];
const FLOORS = Array.from({ length: 30 }, (_, i) => i + 1);
const at = (u: number, v: number) => v * CAVE_SIZE + u;
/** Every tile walked to from one, a step at a time and never across a corner, on the floor nobody's rock stands on. */
function walked(f: CaveFloor, from: readonly [number, number]): Set<number> {
  const seen = new Set([at(from[0], from[1])]), queue: Array<[number, number]> = [[from[0], from[1]]];
  while (queue.length) {
    const [u, v] = queue.pop()!;
    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!floorAt(f, u + du, v + dv) || seen.has(at(u + du, v + dv))) continue;
      seen.add(at(u + du, v + dv));
      queue.push([u + du, v + dv]);
    }
  }
  return seen;
}

describe("a floor of the cave", () => {
  it("is the same for the same floor and day, wherever it is made, and another one the next day or a floor down", () => {
    for (const n of [1, 2, 3, 11, 29]) for (const day of DAYS) expect(caveFloor(n, day)).toEqual(caveFloor(n, day));
    const shape = (f: CaveFloor) => Array.from(f.open).join("");
    expect(shape(caveFloor(1, 20369))).not.toBe(shape(caveFloor(1, 20370)));
    expect(shape(caveFloor(1, 20369))).not.toBe(shape(caveFloor(2, 20369)));
    // (one floor by name: a change of the generator would make another cave of every day)
    const f = caveFloor(1, 20369);
    expect([f.chambers.length, f.tunnels.length, f.rocks.length, f.up, f.arrive, f.down]).toEqual([3, 2, 24, [17, 17], [18, 18], [7, 6]]);
  });

  it("is a square of rock with three or four chambers joined by tunnels, its outermost ring always rock", () => {
    const counts = new Set<number>();
    for (const n of FLOORS) for (const day of DAYS) {
      const f = caveFloor(n, day);
      expect(f.open.length).toBe(CAVE_SIZE * CAVE_SIZE);
      expect([f.n, f.day]).toEqual([n, day]);
      if (!isRest(n)) {
        counts.add(f.chambers.length);
        expect(f.tunnels.length).toBeGreaterThanOrEqual(f.chambers.length - 1);
        expect(f.tunnels.length).toBeLessThanOrEqual(f.chambers.length);
      }
      for (let i = 0; i < CAVE_SIZE; i++) for (const [u, v] of [[i, 0], [i, CAVE_SIZE - 1], [0, i], [CAVE_SIZE - 1, i]]) expect(f.open[at(u, v)]).toBe(0);
      // a tile is floor when its middle is in a chamber or a tunnel; what is drawn is the same shapes, with curves
      for (let v = 0; v < CAVE_SIZE; v++) for (let u = 0; u < CAVE_SIZE; u++) if (f.open[at(u, v)]) expect(hollowAt(f, u + 0.5, v + 0.5), `floor ${n}, day ${day}, ${u},${v}`).toBe(true);
      // a good part of the square is hollow, and a good part rock
      const hollow = f.open.reduce((s, x) => s + (x ? 1 : 0), 0);
      expect(hollow).toBeGreaterThan(150);
      expect(hollow).toBeLessThan(520);
    }
    expect([...counts].sort()).toEqual([3, 4]);
  });

  it("is walked from the ladder one comes down by to the ladder down, and to every tile of its floor", () => {
    for (const n of FLOORS) for (const day of DAYS) {
      const f = caveFloor(n, day), label = `floor ${n}, day ${day}`;
      for (const [u, v] of [f.up, f.arrive, f.down]) expect(floorAt(f, u, v), label).toBe(true);
      // one arrives beside the ladder, a step down the screen from it, with the ladder against the rock behind it
      expect(f.arrive).toEqual([f.up[0] + 1, f.up[1] + 1]);
      expect(f.open[at(f.up[0] - 1, f.up[1] - 1)], label).toBe(0);
      // the way down is at the far end of the way through: not beside the way in
      expect(Math.max(Math.abs(f.down[0] - f.arrive[0]), Math.abs(f.down[1] - f.arrive[1])), label).toBeGreaterThanOrEqual(6);
      const seen = walked(f, f.arrive);
      expect(seen.has(at(f.down[0], f.down[1])), label).toBe(true);
      expect(seen.has(at(f.up[0], f.up[1])), label).toBe(true);
      for (let i = 0; i < f.open.length; i++) if (f.open[i] === 1) expect(seen.has(i), `${label}, tile ${i % CAVE_SIZE},${Math.floor(i / CAVE_SIZE)}`).toBe(true);
    }
  });

  it("has about twenty-four rocks, each numbered, each with floor all round it, none touching another or a ladder", () => {
    const looks = new Set<number>();
    for (const n of FLOORS) for (const day of DAYS) {
      const f = caveFloor(n, day), label = `floor ${n}, day ${day}`;
      if (isRest(n)) { expect(f.rocks).toEqual([]); continue; }
      expect(f.rocks.length, label).toBeGreaterThanOrEqual(CAVE_ROCKS.least);
      expect(f.rocks.length, label).toBeLessThanOrEqual(CAVE_ROCKS.most);
      // a rock's number is its place among the floor's rocks
      expect(f.rocks.map((r) => r.id)).toEqual(f.rocks.map((_, i) => i));
      for (const r of f.rocks) {
        looks.add(r.look);
        // nobody stands on its tile, and every tile round it is floor (a rock, or the ladders, are never there)
        expect(f.open[at(r.u, r.v)], label).toBe(2);
        for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (du || dv) expect(f.open[at(r.u + du, r.v + dv)], `${label}, rock ${r.id}`).toBe(1);
        for (const [u, v] of [f.up, f.arrive, f.down]) expect(Math.max(Math.abs(r.u - u), Math.abs(r.v - v)), `${label}, rock ${r.id}`).toBeGreaterThanOrEqual(3);
      }
      // one of them at least has crystals in it
      expect(f.rocks.some((r) => r.look === 3), label).toBe(true);
    }
    expect([...looks].sort()).toEqual([0, 1, 2, 3]);
  });

  it("is a resting floor every tenth: no rocks, a fire with logs to sit by, a lift, and the same every day", () => {
    expect(FLOORS.filter(isRest)).toEqual([10, 20, 30]);
    for (const n of [10, 20, 30]) {
      const f = caveFloor(n, 0), rest = f.rest!;
      expect(rest).toBeDefined();
      expect(f.rocks).toEqual([]);
      // the same on every day but for the day's own number: one knows it again
      for (const day of DAYS) expect(caveFloor(n, day)).toEqual({ ...f, day });
      // nobody stands on the fire, a log or the lift; a log is sat on from the tile before it, and the lift is stood before
      for (const [u, v] of [rest.fire, rest.lift, ...rest.seats.map((s): [number, number] => [s.u, s.v])]) expect(f.open[at(u, v)]).toBe(2);
      expect(rest.seats.length).toBe(4);
      const seen = walked(f, f.arrive);
      for (const s of rest.seats) {
        expect(Math.max(Math.abs(s.u - rest.fire[0]), Math.abs(s.v - rest.fire[1]))).toBeLessThanOrEqual(2);
        expect(seen.has(at(s.u + FRONT[s.facing].x, s.v + FRONT[s.facing].y))).toBe(true);
      }
      expect(seen.has(at(rest.lift[0] + 1, rest.lift[1] + 1))).toBe(true);
      // the lift leans against the rock at the back of its chamber, as a ladder does
      expect(f.open[at(rest.lift[0] - 1, rest.lift[1] - 1)]).toBe(0);
    }
    for (const n of FLOORS) if (!isRest(n)) expect(caveFloor(n, 3).rest).toBeUndefined();
  });

  it("is tinted by its depth: the first ten floors, the next ten, and the deepest", () => {
    expect([1, 10, 11, 20, 21, 30].map(depthOf)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe("light in the cave", () => {
  const f = caveFloor(1, 20369);

  it("is two tiles about a walker and three about the lamp on the ladder one came down by", () => {
    expect([CAVE_LIGHT.walker, CAVE_LIGHT.ladder]).toEqual([2, 3]);
    const alone = lightsOf(f, []);
    expect(alone).toEqual([{ u: f.up[0] + 0.5, v: f.up[1] + 0.5, r: 3 }]);
    expect(litBy(alone, f.up[0] + 0.5 + 2.9, f.up[1] + 0.5)).toBe(true);
    expect(litBy(alone, f.up[0] + 0.5 + 3.1, f.up[1] + 0.5)).toBe(false);
    const me = { u: f.down[0] + 0.5, v: f.down[1] + 0.5 }, mine = lightsOf(f, [me]);
    expect(litBy(mine, me.u + 1.9, me.v)).toBe(true);
    expect(litBy(mine, me.u, me.v - 2.1)).toBe(false);
  });

  it("adds up: whoever stands near me lights their own ground too, and a torch set down lights for everybody", () => {
    const me = { u: 8.5, v: 8.5 }, friend = { u: 12.5, v: 8.5 }, between = [10.5, 8.5] as const, beyond = [14, 8.5] as const;
    expect(litBy(lightsOf(f, [me]), ...beyond)).toBe(false);
    expect(litBy(lightsOf(f, [me, friend]), ...beyond)).toBe(true);
    expect(litBy(lightsOf(f, [me, friend]), ...between)).toBe(true);
    // how far a member's own light reaches can be said for each (whoever keeps the game does); with nothing said, two tiles
    expect(litBy(lightsOf(f, [{ ...me, r: 5 }]), 13, 8.5)).toBe(true);
    expect(litBy(lightsOf(f, [me]), 13, 8.5)).toBe(false);
    const torch = { u: 22.5, v: 22.5, r: CAVE_LIGHT.torch };
    expect(litBy(lightsOf(f, [me], [torch]), 25.5, 22.5)).toBe(true);
    expect(litBy(lightsOf(f, [me]), 25.5, 22.5)).toBe(false);
    // a resting floor's fire lights its chamber
    const rest = caveFloor(10, 0);
    expect(lightsOf(rest, []).map((l) => l.r)).toEqual([CAVE_LIGHT.ladder, CAVE_LIGHT.fire]);
  });

  it("fills the small map in as it is walked: what a light has reached stays seen", () => {
    const seen = new Uint8Array(CAVE_SIZE * CAVE_SIZE);
    const first = reveal(seen, lightsOf(f, []));
    expect(first).toBeGreaterThan(20);
    // (nothing new from the same lights)
    expect(reveal(seen, lightsOf(f, []))).toBe(0);
    const before = seen.reduce((s, x) => s + x, 0);
    const more = reveal(seen, lightsOf(f, [{ u: f.down[0] + 0.5, v: f.down[1] + 0.5 }]));
    expect(more).toBeGreaterThan(8);
    expect(seen.reduce((s, x) => s + x, 0)).toBe(before + more);
    // a tile is seen when its middle is within reach, and not otherwise
    expect(seen[at(f.down[0] + 1, f.down[1])]).toBe(1);
    expect(seen[at(f.down[0] + 3, f.down[1])]).toBe(0);
    // walking the whole floor fills all of it that one can stand on
    for (let v = 0; v < CAVE_SIZE; v++) for (let u = 0; u < CAVE_SIZE; u++) if (floorAt(f, u, v)) reveal(seen, lightsOf(f, [{ u: u + 0.5, v: v + 0.5 }]));
    for (let i = 0; i < seen.length; i++) if (f.open[i]) expect(seen[i]).toBe(1);
  });
});
