import { describe, expect, it } from "vitest";
import { EGGS, MILK, SHEAR, SWIRL, basketWidth, boxAt, caughtBy, chewAt, eggsPlay, eggsStart, fallMs, milkPlay, milkPress, milkStart, milkTick, shearMove, shearPlay, shearStart, type Ease } from "./animal-games";
import { LEAST_SECS, scoreOf, unitsOf } from "./animals";

/** A seeded normal: the members' hands, as measured (a press at a mark seen coming, about 54 ms off; 87-91 taps in 100 right). */
function hands(seed: number) {
  let a = seed;
  const r = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
  return { r, normal };
}
const FED: Ease = { tired: false, harp: false }, TIRED: Ease = { tired: true, harp: false }, HARP: Ease = { tired: true, harp: true };

/** A regular member milking: each press about 68 ms off the chew (54 on average), the right handle nine times in ten. */
function milkGo(e: Ease, seed: number) {
  const h = hands(seed), s = milkStart(0);
  let side: "L" | "R" = "L";
  for (let n = 0; n < MILK.beats; n++) {
    const t = chewAt(s, n) + h.normal() * 68;
    milkTick(s, t, e);
    milkPress(s, h.r() < 0.9 ? side : side === "L" ? "R" : "L", t, e);
    side = side === "L" ? "R" : "L";
  }
  milkTick(s, chewAt(s, MILK.beats) + 1000, e);
  return milkPlay(s, chewAt(s, MILK.beats) + 1000);
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("milking to the cow's beat", () => {
  it("a regular member, fed, fills the pail most of the time; tired, less; the harp gives the window back", () => {
    const fed = mean(Array.from({ length: 60 }, (_, i) => scoreOf(milkGo(FED, i + 1))));
    const tired = mean(Array.from({ length: 60 }, (_, i) => scoreOf(milkGo(TIRED, i + 1))));
    const harp = mean(Array.from({ length: 60 }, (_, i) => scoreOf(milkGo(HARP, i + 1))));
    expect(fed).toBeGreaterThan(0.85);
    expect(tired).toBeLessThan(fed);
    expect(tired).toBeGreaterThan(0.6);
    expect(harp).toBeGreaterThan(tired);
    expect(unitsOf("milk", 1, milkGo(FED, 3)).units).toBeGreaterThanOrEqual(4);
  });
  it("a go lasts long enough to be believed, and pumping too fast shifts the cow", () => {
    expect(milkGo(FED, 9).secs).toBeGreaterThanOrEqual(LEAST_SECS.milk);
    const s = milkStart(0);
    const between = chewAt(s, 0) + MILK.beat / 2;
    const said = [0, 1, 2, 3].map((i) => milkPress(s, "L", between + i * 10, FED));
    expect(said).toContain("shift");
    expect(milkPress(s, "R", between + 100, FED)).toBe("still");
    expect(s.misses).toBe(1);
  });
});

describe("the coop's eggs", () => {
  it("lays one egg a round banked, each in a box of its own, and catches what lands in the basket", () => {
    const go = eggsStart(4, 12345, 0);
    expect(go.eggs).toHaveLength(4);
    expect(new Set(go.eggs.map((e) => e.box)).size).toBe(4);
    expect(caughtBy(2, boxAt(2), FED)).toBe(true);
    expect(caughtBy(2, boxAt(2) + basketWidth(FED) / 2 + 0.01, FED)).toBe(false);
    expect(basketWidth(HARP)).toBeGreaterThan(basketWidth(TIRED));
    expect(fallMs(TIRED)).toBeLessThan(fallMs(FED));
    const eggs = go.eggs.map((e, i) => ({ ...e, out: 100, landed: true, caught: i !== 0 }));
    expect(eggsPlay(eggs, 0, 4000)).toEqual({ hits: 3, misses: 1, secs: 4, cracked: 1 });
  });
  it("is within a regular member's reach: a surprise answered in 450 ms and the basket moved in 250 is under the egg, fed", () => {
    expect(450 + 250).toBeLessThan(fallMs(FED));
    expect(EGGS.boxes * basketWidth(FED)).toBeGreaterThanOrEqual(1);
  });
});

describe("shearing the fleece's swirl", () => {
  it("traced whole along its line is a whole fleece; off the line it is nicked", () => {
    const s = shearStart();
    let t = 0;
    for (let i = 0; i < SWIRL.length; i++) { t += ((i ? Math.hypot(SWIRL[i].x - SWIRL[i - 1].x, SWIRL[i].y - SWIRL[i - 1].y) : 0) / SHEAR.speed) * 1000; shearMove(s, SWIRL[i], t, FED); }
    const whole = shearPlay(s, t);
    expect(whole.misses).toBe(0);
    expect(unitsOf("shear", 1, whole).whole).toBe(true);
    expect(whole.secs).toBeGreaterThanOrEqual(LEAST_SECS.shear);
    const h = hands(7), w = shearStart();
    for (let i = 0; i < SWIRL.length; i++) shearMove(w, { x: SWIRL[i].x + h.normal() * 30, y: SWIRL[i].y + h.normal() * 30 }, i * 200, TIRED);
    const rough = shearPlay(w, SWIRL.length * 200);
    expect(rough.misses).toBeGreaterThan(0);
    expect(unitsOf("shear", 1, rough).units).toBeGreaterThanOrEqual(3);
  });
});
