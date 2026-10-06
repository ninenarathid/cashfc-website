import { describe, expect, it } from "vitest";
import { startShower } from "./catching";
import { startBunch } from "./choosing";
import { stirMods } from "./cooking";
import { startDig } from "./digging";
import { FOREST_EYE, eyes, softStep } from "./forest-eye";
import { BUFF_LEVELS, DISHES, DISH_IDS, ITEMS, byOf } from "./items";
import { chew, levelOf, mealBuffs, sitDown } from "./stamina";
import { newPurse, put } from "./trade";
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

describe("the forest's dishes (the owner's plan of 2026-10-06: they leave the forest's own two buffs)", () => {
  const forest = DISH_IDS.filter((id) => DISHES[id].recipe?.needs.some(([t]) => ITEMS[t].kind === "wild"));
  it("each leaves the forest eye or the soft step, and nothing of the five", () => {
    expect(forest.length).toBeGreaterThanOrEqual(17);
    for (const id of forest) expect(["forage", "net"], id).toContain(DISHES[id].buff);
    expect(forest.filter((id) => DISHES[id].buff === "forage").length).toBeGreaterThanOrEqual(7);
    expect(forest.filter((id) => DISHES[id].buff === "net").length).toBeGreaterThanOrEqual(7);
    // and no other dish does: the two are the forest's
    for (const id of DISH_IDS) if (!forest.includes(id)) expect(["forage", "net"], id).not.toContain(DISHES[id].buff);
  });
  it("eaten up, one leaves its buff at a level like any, and the one buff a purse always kept as it was", () => {
    const NOON = Date.parse("2026-10-03T12:00:00+07:00"), dish = forest.find((id) => DISHES[id].buff === "forage")!;
    const had = { ...newPurse(), buff: { id: "calm" as const, until: NOON + 3_600_000 }, bag: put(newPurse().bag, dish, 2) };
    const sat = sitDown(had, 0, true, NOON);
    if (!sat.ok) throw new Error(sat.why);
    const one = chew(sat.purse, 0, NOON + 5 * 60_000).purse;
    expect(mealBuffs(one, NOON + 5 * 60_000).map((b) => [b.id, b.level])).toEqual([["calm", 1], ["forage", 1]]);
    expect(one.buff).toEqual({ id: "calm", until: NOON + 3_600_000 });
    const again = sitDown(one, 0, true, NOON + 6 * 60_000);
    if (!again.ok) throw new Error(again.why);
    expect(levelOf(chew(again.purse, 0, NOON + 11 * 60_000).purse, NOON + 11 * 60_000, "forage")).toBe(2);
  });
  it("the forest eye is worth more at its levels: look-alikes fewer, strokes more, fruit more; a blessing is one", () => {
    expect(eyes(true)).toBe(FOREST_EYE);
    expect(eyes(false)).toBe(0);
    expect(LEVELS.map((l) => eyes(byOf("forage", l)))).toEqual([1, 2, 2, 3]);
    expect(byOf("forage", 1)).toBe(FOREST_EYE);
    const fakes = (eye: number | boolean) => startBunch(3, false, 7, eye).cells.filter((c) => c && !c.good).length;
    expect(fakes(true)).toBe(fakes(1));
    expect(fakes(1)).toBeLessThanOrEqual(fakes(0));
    expect(fakes(3)).toBeGreaterThanOrEqual(1);
    expect(startDig(3, false, 7, 3).strokes).toBe(startDig(3, false, 7).strokes + 3);
    expect(startShower(3, false, 7, 2).drops.length).toBe(startShower(3, false, 7).drops.length + 2);
  });
  it("the soft step is softer at its levels: an insect's senses reach two thirds as far, then half, to a third", () => {
    expect(softStep(0)).toBe(1);
    expect(LEVELS.map((l) => Math.round(softStep(byOf("net", l)) * 1000) / 1000)).toEqual([0.667, 0.5, 0.4, 0.333]);
  });
});
