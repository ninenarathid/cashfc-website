import { describe, expect, it } from "vitest";
import { gardenCross, GARDEN } from "./gardening";
import type { Plant, Plot } from "./farm";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
const ripe = (crop: string, more: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: { by: "me", crop: crop as Plant["crop"], sown: T0 - 400 * H, boost: 0, watered: 0, fed: 0, guard: T0 + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...more } });
describe("the helpers' crossings beside the garden's own (the owner, 2026-10-15: \"ช่วยเช็คด้วยว่าจะมี conflict กับน้ำเต้าไหม\")", () => {
  it("leaves the bottle gourd's crossing first, and gives the helper's child by the pollinator's sky", () => {
    const now = T0;
    // pumpkin beside a cucumber and a tomato, a day pollinator let go on it
    const both = { "133,5": ripe("pumpkin", { pollenRound: 0, pollenSky: "sun" }), "134,5": ripe("cucumber"), "132,5": ripe("tomato") };
    expect(gardenCross("133,5", both, "me", now, [])).toBe("bottleGourd");
    const noBug = { ...both, "133,5": ripe("pumpkin") };
    expect(gardenCross("133,5", noBug, "me", now, [])).toBe("bottleGourd");
    const tomatoOnly = { "133,5": ripe("pumpkin", { pollenRound: 0, pollenSky: "moon" }), "132,5": ripe("tomato") };
    expect(gardenCross("133,5", tomatoOnly, "me", now, [])).toBe("mint");
    expect(gardenCross("133,5", { "133,5": ripe("pumpkin", { pollenRound: 0, pollenSky: "sun" }), "132,5": ripe("tomato") }, "me", now, [])).toBe("fig");
    expect(gardenCross("133,5", { "133,5": ripe("pumpkin"), "132,5": ripe("tomato") }, "me", now, [])).toBe(null);
    const gourdShape = GARDEN.shapes.bottleGourd;
    // (on one plot since 2026-10-16)
    expect(gourdShape).toEqual([[0, 0]]);
  });
});
