import { describe, expect, it } from "vitest";
import { stirMods } from "./cooking";
import { BUFF_LEVELS, byOf } from "./items";
import { POURING, startPour } from "./pouring";
import { ROASTING, startRoast } from "./roasting";
import { STIRRING, startStir } from "./stirring";
import { TIMING, startRound } from "./timing";
import { WEEDING, startPatch } from "./weeding";

/**
 * A meal's buffs beyond fishing (the owner, 2026-10-06: "บัฟอาหารที่ดีขึ้น ส่งผลให้เล่นเกมง่ายขึ้นจริง และเข้าขั้น OP ได้เลย"; and how
 * far, "มากสุดแค่ x3"): a keen eye for what is timed, steady hands for what is held steady. Each game is told so
 * many times as kind (`TimingMods.buff`: 1 and what the buff does at its level), and keeps its own most.
 */
const LEVELS = Array.from({ length: BUFF_LEVELS }, (_, i) => i + 1);
const keen = (level: number) => 1 + byOf("keen", level), calm = (level: number) => 1 + byOf("calm", level);

describe("a keen eye, beyond the strike", () => {
  it("widens the stretch the hoe is swung at, by its level, to the game's own most", () => {
    const plain = startRound(3, {}, 7).width;
    expect(plain).toBeCloseTo(TIMING.zone, 9);
    expect(LEVELS.map((l) => Math.round((startRound(3, { buff: keen(l) }, 7).width / plain) * 100) / 100)).toEqual([1.5, 2, 2.5, 2.94]);
    // (half the bar is the most there is: the fourth level comes to it)
    expect(startRound(3, { buff: keen(4) }, 7).width).toBe(0.5);
    // tired hands with a keen eye are still tired, only less so
    const tired = startRound(3, { spent: true }, 7).width;
    expect(startRound(3, { spent: true, buff: keen(2) }, 7).width).toBeCloseTo(tired * 2, 9);
    expect(startRound(3, { spent: true, buff: keen(4) }, 7).width).toBeLessThan(plain * 1.1);
    // with none, the game is as it was
    expect(startRound(3, { buff: 1 }, 7)).toEqual(startRound(3, {}, 7));
  });
  it("gives longer between the gusts that stir a patch of weeds", () => {
    expect(startPatch(3, {}, 7).every).toBe(WEEDING.gust);
    expect(LEVELS.map((l) => startPatch(3, { buff: keen(l) }, 7).every / WEEDING.gust)).toEqual([1.5, 2, 2.5, 3]);
    // (the same patch, laid out the same: only its gusts are rarer)
    expect(startPatch(3, { buff: keen(3) }, 7).cells).toEqual(startPatch(3, {}, 7).cells);
  });
});

describe("steady hands, beyond the fight", () => {
  it("widens the marks water is poured between, to the game's own most", () => {
    const plain = startPour(3, {}, 7).width;
    expect(plain).toBeCloseTo(POURING.marks, 9);
    expect(LEVELS.map((l) => Math.round((startPour(3, { buff: calm(l) }, 7).width / plain) * 100) / 100)).toEqual([1.2, 1.6, 2, 2]);
    expect(startPour(3, { spent: true, buff: calm(4) }, 7).width).toBeCloseTo(POURING.tired * 3, 9);
  });
  it("widens the pace a pot is stirred at", () => {
    const plain = startStir(4, stirMods([], false)), wide = (l: number) => { const s = startStir(4, stirMods([], false, calm(l))); return (s.hi - s.lo) / (plain.hi - plain.lo); };
    expect(wide(0)).toBe(1);
    expect(wide(1)).toBeGreaterThan(1.1);
    for (const l of LEVELS.slice(1)) expect(wide(l)).toBeGreaterThanOrEqual(wide(l - 1));
    // (never so wide that any pace at all is a good one)
    const most = startStir(4, stirMods([], false, calm(4)));
    expect(most.lo).toBeGreaterThan(0);
    expect(most.hi - most.lo).toBeLessThanOrEqual(STIRRING.pace * 1.6 + 1e-9);
  });
  it("makes the fire flare the less often over a roast", () => {
    const flares = (level: number) => startRoast(false, 7, calm(level)).flares.filter((at) => at <= ROASTING.longest).length;
    expect(flares(4)).toBeLessThan(flares(0));
    for (const l of LEVELS) expect(flares(l)).toBeLessThanOrEqual(flares(l - 1));
    // the same fire, with none
    expect(startRoast(false, 7, 1)).toEqual(startRoast(false, 7));
  });
});
