import { describe, expect, it } from "vitest";
import { walkable } from "./world";
import { BIRDS, BUTTERFLIES, birdAt, butterflyAt, petsOf, rompAt, rompsNow } from "./critters";

const t0 = Date.parse("2026-10-05T10:00:00+07:00");

describe("life about town", () => {
  it("has birds that mostly sit, and fly now and then, the same on every screen", () => {
    let flying = 0, n = 0;
    for (let i = 0; i < BIRDS; i++) for (let ms = t0; ms < t0 + 10 * 60_000; ms += 500) {
      const b = birdAt(i, ms)!;
      expect(b).not.toBeNull();
      expect(JSON.stringify(birdAt(i, ms))).toBe(JSON.stringify(b));
      if (b.flying) flying++;
      n++;
    }
    expect(flying / n).toBeGreaterThan(0.005);
    expect(flying / n).toBeLessThan(0.2);
  });

  it("flies smoothly: no jumps from one moment to the next", () => {
    for (let i = 0; i < BIRDS; i++) for (let ms = t0; ms < t0 + 5 * 60_000; ms += 50) {
      const a = birdAt(i, ms)!, b = birdAt(i, ms + 50)!;
      if (a.flying || b.flying) expect(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)).toBeLessThan(0.6);
    }
  });

  it("keeps butterflies round the flowers in town", () => {
    expect(BUTTERFLIES).toBeGreaterThan(3);
    for (let i = 0; i < BUTTERFLIES; i++) {
      const a = butterflyAt(i, t0)!, b = butterflyAt(i, t0 + 3000)!;
      expect(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)).toBeLessThan(4);
      expect(a.height).toBeGreaterThan(0);
    }
  });

  it("lets cats and dogs out now and then, on open ground, the dog behind the cat in a chase", () => {
    let romps = 0;
    const kinds = new Set<string>();
    for (let ms = t0; ms < t0 + 24 * 3_600_000; ms += 3 * 60_000) {
      const r = rompAt(ms);
      if (!r) continue;
      romps++;
      kinds.add(r.kind);
      for (const p of r.route) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
      const mid = petsOf(r, r.start + 3000);
      if (r.kind === "chase") {
        const [cat, dog] = mid;
        expect(cat.pet).toBe("cat");
        expect(dog.pet).toBe("dog");
      }
      expect(rompsNow(r.start + 1000)).toContainEqual(r);
    }
    expect(romps).toBeGreaterThan(200);
    expect(romps).toBeLessThan(400);
    expect([...kinds].sort()).toEqual(["cat", "chase", "dog"]);
  });
});
