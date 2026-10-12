import { describe, expect, it } from "vitest";
import { ITEMS } from "./items";
import { ALL_LINE_IDS, LINES, harvestReserve, lineSlowed, linesOf } from "./lines";
import { bugPoints, count, countsOf, farmPoints, fishPoints, harvestWork, kitchenPoints, linesRow, newLine, type Counts, type Done } from "./line-points";
import type { Plant } from "./farm";

const deed = (what: string, thing: string | null, doc: Record<string, unknown> = {}, n = 1): Done => ({ from: "deed", what, thing, doc, n });
const harvest: Counts = { to: null, line: "farming", raw: 12 };

describe("profession experience rewards actual work", () => {
  it("pays hybrids for their real footprint and giants once for four occupied cells", () => {
    expect(farmPoints("corn")).toBe(4);
    expect(farmPoints("blueCorn")).toBe(30);
    expect(farmPoints("teaBush")).toBe(28);
    expect(farmPoints("pumpkin", 0, true)).toBe(48);
    expect(farmPoints("pumpkin", 0, true, 50)).toBe(50);
    expect(countsOf(deed("pick", "pumpkin", {}, 100), "me")[0].raw).toBe(12);
  });

  it("rewards regrowth time plus a bounded establishment premium, rather than the initial wait repeatedly", () => {
    expect(farmPoints("tomato")).toBe(6);
    expect(farmPoints("tomato", 1)).toBe(4);
    expect(farmPoints("coconut")).toBe(24);
    expect(farmPoints("coconut", 9)).toBe(8);
    expect(farmPoints("trellisBerry", 1)).toBe(18);
  });

  it("credits care only in its actual bearing, never an old fertiliser again", () => {
    const plant: Plant = { by: "me", crop: "tomato", sown: 1000, boost: 0, watered: 4000, fed: 2000, guard: 0, cured: 0, picked: 1, pickedAt: 3000 };
    expect(harvestWork(plant).care).toBe(1);
    expect(harvestWork({ ...plant, fed: 5000 }).care).toBe(2);
    expect(harvestWork({ ...plant, watered: 0 }).care).toBe(0);
  });

  it("starts the allowance at sowing without giving repeatable sowing XP", () => {
    const sow = countsOf(deed("sow", "corn"), "me")[0];
    let k = count(newLine(), sow, 100);
    expect(k.points).toBe(0);
    expect(k.reserve).toBe(150);
    for (let i = 0; i < 100; i++) k = count(k, sow, 100);
    expect(k.points).toBe(0);
    expect(k.reserve).toBe(150);
    expect(countsOf(deed("sow", "corn", { whose: "friend" }), "me")).toEqual([]);
  });

  it("does not penalise a six-day harvest for collecting the same completed work together", () => {
    const start = count(newLine(), { to: null, line: "farming", raw: 0 }, 100);
    const one = count(start, { ...harvest, raw: 360 }, 106);
    let many = start;
    for (let i = 0; i < 30; i++) many = count(many, harvest, 106);
    expect(one.points).toBe(360);
    expect(many).toEqual(one);
    expect(one.reserve).toBe(690);
    expect(lineSlowed("farming", { points: one.points, today: 360, full: one.reserve })).toBe(false);
  });

  it("caps saved full XP, spends it once, and only refills after the next Bangkok day", () => {
    const sow = count(newLine(), { ...harvest, raw: 0 }, 100);
    const picked = count(sow, { ...harvest, raw: 1200 }, 200);
    expect(picked.points).toBe(1087.5);
    expect(picked.reserve).toBe(0);
    const again = count(picked, harvest, 200);
    expect(again.points).toBe(1090.5);
    expect(harvestReserve(again, 201)).toBe(150);
    expect(count(again, harvest, 201).earned).toBe(12);
    expect(harvestReserve(again, 500)).toBe(1050);
  });

  it("honours a trusted original planting day when first counting a legacy root", () => {
    const k = count(newLine(), { ...harvest, raw: 360, started: 100 }, 106);
    expect(k.points).toBe(360);
    expect(k.reserve).toBe(690);
    expect(count(newLine(), { ...harvest, started: 999 }, 100).reserve).toBe(138);
    const legacy = { ...newLine(), points: 1000, day: 100, today: 200 };
    expect(count(legacy, harvest, 100).points).toBe(1003);
    expect(count(legacy, harvest, 101).points).toBe(1012);
  });

  it("separates actual credited XP from raw work after the allowance", () => {
    const k = count(newLine(), { ...harvest, raw: 200 }, 100);
    expect(k.today).toBe(200);
    expect(k.earned).toBe(162.5);
    expect(lineSlowed("farming", { points: k.points, today: k.today, full: k.reserve })).toBe(true);
    const told = linesOf({ farming: { points: 162.5, today: 200, earned: 162.5, full: 0, bound: 150 } });
    expect(told.lines.farming).toEqual({ points: 162.5, today: 200, earned: 162.5, full: 0, bound: 150 });
    expect(lineSlowed("well", { points: 1000, today: 1000 })).toBe(false);
  });

  it("gives expensive garden insects fair XP independently of any later price edit", () => {
    expect(bugPoints("goldenAnt")).toBe(8);
    expect(bugPoints("silkMoth")).toBe(8);
    expect(bugPoints("honeyBee")).toBe(8);
    const price = ITEMS.goldenAnt.pays;
    try {
      ITEMS.goldenAnt.pays = 500;
      expect(bugPoints("goldenAnt")).toBe(8);
    } finally { ITEMS.goldenAnt.pays = price; }
  });

  it("pays for both secret-forest stages and deliberate plant-part gathering", () => {
    expect(countsOf(deed("gather", "truffle", { how: "choose", kind: "ring" }), "me")[0].raw).toBe(15);
    expect(countsOf(deed("gather", "fragrantPetal", { how: "pick", kind: "flowers" }), "me")[0].raw).toBe(3);
  });

  it("rewards harder trees and clean work without multiplying by timber yield", () => {
    expect(countsOf(deed("fell", "pine", { girth: 0, misses: 2 }, 20), "me")[0].raw).toBe(2);
    expect(countsOf(deed("fell", "pine", { girth: 2, misses: 0 }), "me")[0].raw).toBe(5);
    expect(countsOf(deed("fell", "moonwood", { girth: 2, misses: 0 }), "me")[0].raw).toBe(9);
    expect(countsOf(deed("fell", "elder"), "me")[0].raw).toBe(12);
  });

  it("rewards mine depth and perfect veins while a twin replay never pays base XP twice", () => {
    expect(countsOf(deed("mine", "stone", { floor: 25 }, 2), "me")[0].raw).toBe(6);
    expect(countsOf(deed("vein", "oreSilver", { floor: 25, passed: 4, of: 4 }), "me")[0].raw).toBe(7);
    expect(countsOf(deed("vein", "oreSilver", { floor: 25, passed: 4, of: 4, again: true }), "me")[0].raw).toBe(0);
    expect(countsOf(deed("vein", null, { floor: 25, passed: 0, of: 4 }, 0), "me")[0].raw).toBe(0);
    expect(countsOf(deed("crystal", "stone", { floor: 28 }), "me")[0].raw).toBe(12);
  });

  it("rewards recipe complexity and special fish conditions but never a failed activity", () => {
    expect(kitchenPoints("bowl")).toBe(1);
    expect(kitchenPoints("fragrantOil")).toBe(4);
    expect(kitchenPoints("tomYum")).toBe(5);
    expect(fishPoints("minnow")).toBe(1);
    expect(fishPoints("moonFish")).toBe(9);
    expect(countsOf({ ...deed("fishing", "moonFish"), from: "play", won: false }, "me")).toEqual([]);
  });

  it("uses an equal 80-full-allowance-day target for community lines without changing their rank marks", () => {
    for (const line of ALL_LINE_IDS) expect(LINES[line].marks.at(-1)! / LINES[line].day).toBe(80);
    const water = countsOf(deed("carry", null, {}, 400), "me")[0];
    expect(count(newLine(), water, 1).points).toBe(381.25);
    expect(linesRow().experienceVersion).toBe(2);
  });

  it("preserves today's real community XP across a midday upgrade and resets it tomorrow", () => {
    const legacy = { ...newLine(), points: 1000, day: 100, today: 500 };
    const water: Counts = { to: null, line: "helpers", raw: 1 };
    const today = count(legacy, water, 100);
    expect(today.points).toBe(1000.25);
    expect(today.earned).toBe(275.25);
    const tomorrow = count(today, water, 101);
    expect(tomorrow.earned).toBe(1);
    const idle = count(today, { ...water, raw: 0 }, 101);
    expect(idle.earned).toBe(0);
    expect(count(idle, water, 101).earned).toBe(1);
  });
});
