import { describe, expect, it } from "vitest";
import {
  CLOUD_ONE_IN, FLOCK_MAX, Flocks, POP_MS, POP_SEATED, flockOrder, restSlot, hasRoom, headingOf, homeAt, lambColour, lambStep, newTrail,
  onCloud, pastFull, placeAt, popAt, popPart, seedOf, slotOnTrail, trailPoint, trailStep, walkSlot, type FlockIn, type Lamb, type Pt,
} from "./flock";
import { RAM_PACE } from "./riding";
import { readDoing } from "./room";

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
/** The shortest way from a point to a broken line. */
function toLine(p: Pt, line: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
    best = Math.min(best, dist(p, { x: a.x + dx * t, y: a.y + dy * t }));
  }
  return best;
}

describe("the cloud ram's flock: the same on every screen", () => {
  it("a passenger's lamb is white, cream or pink by who rides it, and all three come up", () => {
    expect(lambColour("abc")).toBe(lambColour("abc"));
    const seen = new Set(Array.from({ length: 60 }, (_, i) => lambColour(`member-${i}`)));
    expect([...seen].sort()).toEqual(["c", "p", "w"]);
    expect(seedOf("a")).toBe(0xe40c292c);
  });

  it("the magic ram's cloud is one boarding in five, rolled from what every page hears (the ids and the moment of getting on)", () => {
    // the same seat rolls the same, however often and wherever it is rolled
    for (let i = 0; i < 50; i++) expect(onCloud("owner", `r${i}`, 1_700_000_000_000 + i)).toBe(onCloud("owner", `r${i}`, 1_700_000_000_000 + i));
    // about one in five over many boardings
    let n = 0; const N = 20_000;
    for (let i = 0; i < N; i++) if (onCloud("owner-7", "rider-3", 1_762_000_000_000 + i * 977)) n++;
    expect(n / N).toBeGreaterThan(1 / CLOUD_ONE_IN - 0.015);
    expect(n / N).toBeLessThan(1 / CLOUD_ONE_IN + 0.015);
    // a new boarding is a new roll: the same rider gets both over a few boardings
    const rolls = new Set(Array.from({ length: 40 }, (_, i) => onCloud("o", "r", 1000 + i)));
    expect(rolls).toEqual(new Set([true, false]));
    // the rider and the ram both count: the same moment rolls otherwise for another pair
    const pairs = new Set(Array.from({ length: 40 }, (_, i) => onCloud(`o${i}`, `r${i}`, 5000)));
    expect(pairs.size).toBe(2);
    // a browser older than the flock tells no moment: rolled on the two ids, the same everywhere
    expect(onCloud("o", "r", undefined)).toBe(onCloud("o", "r", 0));
  });

  it("every page hears the moment of getting on, and nothing that is not one", () => {
    expect(readDoing({ seat: "r:abc", seatAt: 1762700000123.7 })).toMatchObject({ seat: "r:abc", seatAt: 1762700000123 });
    for (const bad of [-1, Infinity, NaN, "12", null]) expect(readDoing({ seat: "r:abc", seatAt: bad }).seatAt).toBeUndefined();
  });

  it("lines up by when they got on; who told no moment after those who did; ties by id: the same order from any order heard", () => {
    const heard = [{ id: "d" }, { id: "b", at: 30 }, { id: "a", at: 10 }, { id: "c", at: 30 }, { id: "e" }];
    const want = ["a", "b", "c", "d", "e"];
    expect(flockOrder(heard).map((b) => b.id)).toEqual(want);
    expect(flockOrder([...heard].reverse()).map((b) => b.id)).toEqual(want);
    expect(heard[0].id).toBe("d"); // (the list heard is left as it was)
  });

  it("at most eight ride: a ninth who got on with the eighth is past the last place, and a full flock has no room", () => {
    expect(FLOCK_MAX).toBe(8);
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, at: 100 + i }));
    const order = flockOrder(nine);
    expect(order.slice(0, 8).every((b) => !pastFull(order, b.id))).toBe(true);
    expect(pastFull(order, "p8")).toBe(true);
    // (the one who got on last is the one who gets down, whoever's page works it out)
    expect(pastFull(flockOrder([...nine].reverse()), "p8")).toBe(true);
    expect(hasRoom(7)).toBe(true);
    expect(hasRoom(8)).toBe(false);
  });
});

describe("where the lambs go", () => {
  it("walking: two by two right behind the big ram (the kit's places), the pairs further back one after another, nobody on anybody", () => {
    for (const back of [false, true]) {
      const slots = Array.from({ length: 8 }, (_, i) => walkSlot(i, back, true));
      for (let r = 0; r < 4; r++) {
        const [l, rt] = [slots[r * 2], slots[r * 2 + 1]];
        // a pair side by side: across from each other by more than a lamb's width
        expect(Math.abs(rt.across - l.across)).toBeGreaterThan(40);
        expect(l.back).toBeGreaterThan(0);
        if (r) expect((l.back + rt.back) / 2).toBeGreaterThan((slots[r * 2 - 2].back + slots[r * 2 - 1].back) / 2);
      }
      // the first pair close behind the big ram (its body is about 80 long)
      expect(slots[0].back).toBeLessThan(65);
      // every two at least a lamb's half-length apart (the kit keeps an ellipse of 40 by 26 between them), the line within five lambs' length
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(((slots[i].back - slots[j].back) / 40) ** 2 + ((slots[i].across - slots[j].across) / 26) ** 2).toBeGreaterThanOrEqual(0.99);
      expect(Math.max(...slots.map((s) => s.back))).toBeLessThan(200);
    }
    // the kit's own numbers: SE's first place 52 behind and 20 to the left
    expect(walkSlot(0)).toEqual({ back: 52, across: -20 });
    // seen in a mirror (SW, NW), across the other way
    expect(walkSlot(3, false, false)).toEqual({ back: 102, across: -72 });
    expect(walkSlot(3, true, false)).toEqual({ back: 88, across: -62 });
    // (a ninth, for the moment before it gets down: further back than all)
    expect(walkSlot(8).back).toBeGreaterThan(walkSlot(6).back);
  });

  it("standing: they crowd round the big ram, nearer than in the walk, some at its sides", () => {
    for (const back of [false, true]) {
      const spots = Array.from({ length: 8 }, (_, i) => restSlot(i, back, true));
      const near = spots.reduce((n, c) => n + Math.hypot(c.back, c.across), 0) / 8, far = Array.from({ length: 8 }, (_, i) => walkSlot(i, back, true)).reduce((n, c) => n + Math.hypot(c.back, c.across), 0) / 8;
      expect(near).toBeLessThan(far);
      expect(spots.some((c) => c.back <= 6)).toBe(true);
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(((spots[i].back - spots[j].back) / 40) ** 2 + ((spots[i].across - spots[j].across) / 26) ** 2).toBeGreaterThanOrEqual(0.99);
      // and none in the big ram's own footprint (62 by 34 about its feet)
      for (const c of spots) expect((c.back / 31) ** 2 + (c.across / 17) ** 2).toBeGreaterThanOrEqual(0.99);
    }
  });

  it("the kit's places land where the kit drew them on the screen", () => {
    // flock-seats.json: SE walk slot 1 at (-37.6, -41.1) from the big ram's feet; NE rest slot 6 at (46.9, 11.2)
    const se = placeAt({ x: 0, y: 0 }, headingOf(false, true), walkSlot(0));
    expect(se.x).toBeCloseTo(-37.6, 0); expect(se.y).toBeCloseTo(-41.1, 0);
    const ne = placeAt({ x: 0, y: 0 }, headingOf(true, true), restSlot(5, true, true));
    expect(ne.x).toBeCloseTo(46.9, 0); expect(ne.y).toBeCloseTo(11.2, 0);
    // and its mirror (SW) the same with x the other way
    const sw = placeAt({ x: 0, y: 0 }, headingOf(false, false), walkSlot(0, false, false));
    expect(sw.x).toBeCloseTo(37.6, 0); expect(sw.y).toBeCloseTo(-41.1, 0);
  });

  it("behind and to the right are behind and to the right whichever way the big ram faces", () => {
    for (const [back, right] of [[false, true], [false, false], [true, true], [true, false]] as const) {
      const d = headingOf(back, right), at = { x: 100, y: 100 };
      const behind = placeAt(at, d, { back: 50, across: 0 });
      expect((behind.x - at.x) * d.x + (behind.y - at.y) * d.y).toBeCloseTo(-50);
      const side = placeAt(at, d, { back: 0, across: 30 });
      expect(dist(side, at)).toBeCloseTo(30);
      expect((side.x - at.x) * d.x + (side.y - at.y) * d.y).toBeCloseTo(0);
    }
  });

  it("follows the big ram's path round a turn, not a straight line behind it", () => {
    const t = newTrail({ x: 0, y: 0 }, headingOf(false, true)), path: Pt[] = [{ x: 0, y: 0 }];
    // right 200, then down 60: a sharp turn
    for (let x = 4; x <= 200; x += 4) { trailStep(t, { x, y: 0 }); path.push({ x, y: 0 }); }
    for (let y = 4; y <= 60; y += 4) { trailStep(t, { x: 200, y }); path.push({ x: 200, y }); }
    const now = { x: 200, y: 60 };
    for (const back of [30, 60, 100, 140]) {
      const p = trailPoint(t, now, back);
      expect(toLine(p.at, path)).toBeLessThan(1.5);
    }
    // a place 100 back is round the corner, on the first leg: going right there
    const p = trailPoint(t, now, 100);
    expect(p.at.y).toBeCloseTo(0, 0);
    expect(p.dir.x).toBeCloseTo(1, 1);
    // across from the path, as far as its slot says
    const s = slotOnTrail(t, now, { back: 100, across: 20 });
    expect(toLine(s, path)).toBeCloseTo(20, 0);
    // before it has gone anywhere: straight back from the way it faces
    const fresh = newTrail({ x: 0, y: 0 }, headingOf(true, false));
    const q = trailPoint(fresh, { x: 0, y: 0 }, 50);
    expect(q.at.x).toBeGreaterThan(0);
    expect(q.at.y).toBeGreaterThan(0);
  });

  it("a lamb keeps up with the big ram's pace, stays on its place once there, and is there at once from far off", () => {
    const pace = 3.5 * RAM_PACE * 45;
    const l: Lamb = { owner: "o", rider: "r", at: { x: 0, y: 0 }, back: false, right: true, moving: false, still: 0, cloud: false, colour: "w", popped: -Infinity, beat: 0 };
    let goal = { x: 30, y: 0 };
    for (let f = 0; f < 120; f++) { goal = { x: goal.x + pace / 60, y: 0 }; lambStep(l, goal, 1 / 60, pace, f * 16); }
    expect(dist(l.at, goal)).toBeLessThan(0.01);
    expect(l.right).toBe(true);
    lambStep(l, { x: l.at.x + 1000, y: 0 }, 1 / 60, pace, 3000);
    expect(l.moving).toBe(false);
  });
});

describe("a flock on a page", () => {
  const ride = (riders: { id: string; at?: number }[], over: Partial<FlockIn> = {}): FlockIn => ({ owner: "own", at: { x: 0, y: 0 }, moving: false, back: false, right: true, pace: 240, riders, ...over });

  it("a lamb puffs out of the fleece for whoever gets on later; a flock already there when the page came does not", () => {
    const f = new Flocks();
    f.tick(0, 1 / 60, [ride([{ id: "a", at: 1 }])]);
    expect(popPart(f.lamb("a")!, 0)).toBe(1);
    for (let t = 16; t < 5000; t += 16) f.tick(t, 1 / 60, [ride([{ id: "a", at: 1 }])]);
    f.tick(5000, 1 / 60, [ride([{ id: "a", at: 1 }, { id: "b", at: 2 }])]);
    const b = f.lamb("b")!;
    expect(popPart(b, 5000)).toBe(0);
    expect(popPart(b, 5000 + POP_MS * POP_SEATED)).toBeCloseTo(POP_SEATED);
    expect(popPart(b, 5000 + POP_MS)).toBe(1);
    // out of the fleece and onto its place
    const from = f.fleece("own", b.at)!;
    expect(dist(popAt(from, b.at, 0.2), from)).toBeLessThan(0.01);
    expect(dist(popAt(from, b.at, POP_SEATED), b.at)).toBeLessThan(0.01);
    expect(dist(from, { x: 0, y: 0 })).toBeLessThan(25);
  });

  it("when one in the middle gets down, its lamb jumps home and those behind move up", () => {
    const f = new Flocks(), riders = ["a", "b", "c", "d"].map((id, i) => ({ id, at: i }));
    // walking right, a long way, so the line is out behind
    for (let i = 0; i <= 120; i++) f.tick(i * 16, 0.016, [ride(riders, { at: { x: i * 4, y: 0 }, moving: true })]);
    const before = { c: { ...f.lamb("c")!.at }, b: { ...f.lamb("b")!.at } };
    for (let i = 121; i <= 240; i++) f.tick(i * 16, 0.016, [ride(riders.filter((r) => r.id !== "b"), { at: { x: i * 4, y: 0 }, moving: true })]);
    expect(f.lamb("b")).toBeUndefined();
    expect(f.leaving.length).toBe(0); // (its jump home is over by now)
    // c is in b's old place in the line now: the second's (the right of the first pair), not the third's
    const head = { x: 240 * 4, y: 0 }, cNow = f.lamb("c")!.at;
    const second = walkSlot(1), third = walkSlot(2);
    expect(Math.abs((head.x - cNow.x) - second.back)).toBeLessThan(6);
    expect(Math.abs((120 * 4 - before.c.x) - third.back)).toBeLessThan(6);
    // (and a ram that was out of sight a while: its flock is taken as there already, no puffs)
    const g = new Flocks();
    g.tick(0, 0.016, [ride([{ id: "a", at: 1 }])]);
    g.tick(9000, 0.016, [ride([{ id: "a", at: 1 }, { id: "b", at: 2 }])]);
    expect(popPart(g.lamb("b")!, 9000)).toBe(1);
  });

  it("a lamb whose rider gets down jumps back into the fleece, and is gone once in", () => {
    const f = new Flocks();
    f.tick(0, 0.016, [ride([{ id: "a", at: 1 }])]);
    f.tick(100, 0.016, [ride([])]);
    expect(f.lamb("a")).toBeUndefined();
    expect(f.leaving).toHaveLength(1);
    const g = f.leaving[0];
    expect(dist(homeAt(g.from, g.to, 0.1), g.from)).toBeLessThan(0.01);
    expect(dist(homeAt(g.from, g.to, 0.6), g.to)).toBeLessThan(0.01);
    f.tick(100 + POP_MS + 1, 0.016, [ride([])]);
    expect(f.leaving).toHaveLength(0);
    // and when the owner gets down, every lamb goes home
    f.tick(2000, 0.016, [ride([{ id: "x", at: 1 }, { id: "y", at: 2 }])]);
    f.tick(2100, 0.016, []);
    expect(f.leaving.map((l) => l.rider).sort()).toEqual(["x", "y"]);
  });

  it("stood still a moment, they crowd round the big ram; a stop between two taps is no stop", () => {
    const f = new Flocks(), riders = ["a", "b", "c"].map((id, i) => ({ id, at: i }));
    for (let i = 0; i <= 60; i++) f.tick(i * 16, 0.016, [ride(riders, { at: { x: i * 4, y: 0 }, moving: true })]);
    const walking = { ...f.lamb("a")!.at };
    f.tick(61 * 16 + 300, 0.016, [ride(riders, { at: { x: 240, y: 0 } })]);
    expect(dist(f.lamb("a")!.at, walking)).toBeLessThan(5);
    for (let t = 61 * 16 + 300; t < 6000; t += 16) f.tick(t, 0.016, [ride(riders, { at: { x: 240, y: 0 } })]);
    const ram = { x: 240, y: 0 }, a = f.lamb("a")!;
    expect(dist(a.at, placeAt(ram, headingOf(false, true), restSlot(0)))).toBeLessThan(1);
    // gathered round, they face the way the big ram does
    expect(a.back).toBe(false);
    expect(a.right).toBe(true);
    // (and it turned NW: they go round to its other places, and face that way)
    for (let t = 6000; t < 9000; t += 16) f.tick(t, 0.016, [ride(riders, { at: { x: 240, y: 0 }, back: true, right: false })]);
    expect(dist(f.lamb("a")!.at, placeAt(ram, headingOf(true, false), restSlot(0, true, false)))).toBeLessThan(1);
    expect(f.lamb("a")!.back).toBe(true);
  });
});
