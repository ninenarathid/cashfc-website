import { describe, expect, it } from "vitest";
import type { Plant, Plot } from "./farm";
import { barsOfQ } from "./quality";
import { HAND, progressOf, qualityNow, settled, syncQuality } from "./quality-plant";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20), LAUNCH = T0 - 100 * H;
// a tomato: 72 hours to its first bearing, then every 36
const tomato = (more: Partial<Plant> = {}): Plant => ({ by: "me", crop: "tomato", sown: T0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
const plot = (plant: Plant | null): Plot => ({ soil: "tilled", plant });

describe("a plant's Quality in the ground", () => {
  it("grows its round by its own clock, and stops at ripeness", () => {
    const at = progressOf(tomato());
    expect(at(T0)).toBe(0);
    expect(at(T0 + 36 * H)).toBeCloseTo(0.5);
    expect(at(T0 + 200 * H)).toBe(1);
    // a re-bearing round counts from the last picking, by the crop's own while between pickings
    expect(progressOf(tomato({ picked: 1, pickedAt: T0 + 80 * H }))(T0 + 98 * H)).toBeCloseTo(0.5);
  });

  it("keeps half the water bar for 26 hours after a watering", () => {
    const q = settled(tomato({ watered: T0 }), T0 + 100 * H, [], LAUNCH);
    expect(barsOfQ(q).water).toBe(Math.floor(25 * HAND.level * (26 / 72)));
  });

  it("keeps half the water bar all its life in a damp furrow, and half the soil bar from compost on", () => {
    expect(barsOfQ(settled(tomato({ moist: true }), T0 + 100 * H, [], LAUNCH)).water).toBe(12);
    expect(barsOfQ(settled(tomato({ compost: T0 + 36 * H }), T0 + 100 * H, [], LAUNCH)).soil).toBe(6);
  });

  it("counts rain as watering, while it falls and 12 hours after", () => {
    const q = settled(tomato(), T0 + 100 * H, [[T0, T0 + 6 * H]], LAUNCH);
    expect(barsOfQ(q).water).toBe(Math.floor(25 * HAND.level * (18 / 72)));
  });

  it("counts nothing from before Quality began", () => {
    const q = settled(tomato({ compost: T0 }), T0 + 100 * H, [], T0 + 36 * H);
    expect(q.span).toBeCloseTo(0.5);
    expect(barsOfQ(q).soil).toBe(12);
  });

  it("settles a plant as it stood before each change, so a new watering never rewrites the past", () => {
    const first = tomato({ watered: T0 });
    // watered again 50 hours on: the first watering's 26 hours stay counted
    const before = { "3,3": plot(first) }, after = { "3,3": plot({ ...first, watered: T0 + 50 * H, boost: 30 * 60_000 }) };
    const kept = syncQuality(before, after, T0 + 50 * H, [], LAUNCH)["3,3"].plant!;
    const end = settled(kept, T0 + 100 * H, [], LAUNCH);
    // 26 hours from the first watering and what the second covers until ripeness (about 22 hours), half each
    expect(barsOfQ(end).water).toBeGreaterThanOrEqual(Math.floor(12.5 * (26 + 21) / 72));
  });

  it("starts a new round when the plant is picked, and leaves another planting alone", () => {
    const was = tomato({ moist: true }), now = T0 + 80 * H;
    const picked = syncQuality({ "1,1": plot(was) }, { "1,1": plot({ ...was, picked: 1, pickedAt: now }) }, now, [], LAUNCH)["1,1"].plant!;
    expect(picked.q).toEqual({ at: now, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0] });
    const other = syncQuality({ "1,1": plot(was) }, { "1,1": plot(tomato({ sown: now })) }, now, [], LAUNCH)["1,1"].plant!;
    expect(other.q).toBeUndefined();
  });

  it("tells the inspector the bars, the range and its chances, the brush raising the floor this round", () => {
    const p = tomato({ moist: true, compost: T0, guard: T0 + 200 * H, brushed: T0 + H });
    const seen = qualityNow({ ...p, q: settled(p, T0, [], LAUNCH) }, T0 + 100 * H, [], LAUNCH);
    expect(seen.bars).toEqual({ soil: 12, water: 12, pollen: 12, guard: 12 });
    expect(seen.range).toEqual({ lo: 28, hi: 48 });
    expect(seen.chances[0] + seen.chances[1]).toBeCloseTo(1);
  });
});
