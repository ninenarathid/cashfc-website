import { describe, expect, it } from "vitest";
import { INSECT_ITEMS, INSECT_SPECIES, INSECT_TOOLS } from "./insect-items";
import { insectCare, insectCareMode, INSECT_GARDEN, scentMods } from "./insect-garden";
import { BUGS, HAUNTS, newMind, poseOf, stealthOf } from "./insects";
import { see, type Plant, type Plot } from "./farm";
import { sources, usesOf } from "./uses";
import { held, newPurse, type Purse } from "./trade";
import { dayOf } from "./stamina";
import type { ItemId } from "./items";

const NOW = Date.UTC(2026, 9, 10, 5), key = "45,42";
const plant: Plant = { by: "me", crop: "corn", sown: NOW - 3600000, boost: 0, fed: 0, watered: 0, guard: NOW + 3600000, cured: 0, picked: 0, pickedAt: 0 };
const plot: Plot = { soil: "tilled", plant };
const purse = (items: ItemId[]): Purse => ({ ...newPurse(), bag: items.map(item => ({ item, n: 2 })), stamina: { day: dayOf(NOW), left: 100 } });
describe("insect visitors and garden care", () => {
  it("adds 25 obtainable items with usable routes and tools", () => {
    expect(Object.keys(INSECT_ITEMS)).toHaveLength(25);
    for (const id of Object.keys(INSECT_ITEMS) as ItemId[]) expect(sources().has(id), id).toBe(true);
    for (const id of INSECT_TOOLS) expect(usesOf(id)).toContain("insectCare");
    for (const id of Object.keys(INSECT_SPECIES) as Array<keyof typeof INSECT_SPECIES>) {
      const haunt = HAUNTS.find(h => BUGS[id].at.includes(h.kind))!;
      const pose = poseOf(id, haunt, 123, newMind(id, haunt, 123, NOW), NOW + 1500);
      expect([pose.x, pose.y, pose.lift].every(Number.isFinite), id).toBe(true);
      expect(insectCareMode(id), id).not.toBeNull();
    }
  });
  it("uses the strongest scent aid and coexists with a separate familiar", () => {
    const tool = purse(["scentSatchel"]), meal = { ...tool, buffs: [{ id: "scent" as const, level: 2, until: NOW + 1000 }] };
    expect(scentMods(tool, NOW).soft).toBe(0.85);
    expect(scentMods(meal, NOW).soft).toBe(0.8);
    expect(scentMods(meal, NOW).route).toBe(true);
    expect(stealthOf(meal, NOW)).toBe(0.8);
    expect(scentMods(meal, NOW + 1000).soft).toBe(0.85);
  });
  it("releases exactly one insect without charging coins or stamina, once per bearing", () => {
    const p = purse(["honeyBee"]), copy = structuredClone(p), did = insectCare(key, plot, p, 0, "pollinate", "me", NOW, []);
    expect(did.ok).toBe(true); if (!did.ok) return;
    expect(held(did.purse.bag, "honeyBee")).toBe(1);
    expect(did.purse.stamina).toEqual(p.stamina); expect(did.purse.coins).toBe(p.coins);
    expect(did.plot.plant.boost).toBe(INSECT_GARDEN.boost);
    expect(did.purse.insectGardenBook).toEqual(["honeyBee:corn:pollinate"]);
    expect(insectCare(key, did.plot, did.purse, 0, "pollinate", "me", NOW, [])).toEqual({ ok: false, why: "wet" });
    expect(p).toEqual(copy);
    const bearing = { ...did.plot, plant: { ...did.plot.plant, picked: 1 } };
    expect(insectCare(key, bearing, did.purse, 0, "pollinate", "me", NOW, []).ok).toBe(true);
  });
  it("different field tools change pollen duration and growth independently", () => {
    const did = insectCare(key, plot, purse(["hoverfly", "pollenFan", "releaseCage"]), 0, "pollinate", "me", NOW, []);
    expect(did.ok).toBe(true); if (!did.ok) return;
    expect(did.plot.plant.boost).toBe(INSECT_GARDEN.fanBoost);
    expect(did.plot.plant.pollenUntil).toBe(NOW + INSECT_GARDEN.cageMinutes * 60000);
  });
  it("refuses invalid insects, slots, ownership, dead plants and reserved cells atomically", () => {
    const p = purse(["honeyBee"]), copy = structuredClone(p);
    for (const slot of [-1, 0.5, 99]) expect(insectCare(key, plot, p, slot, "pollinate", "me", NOW, []).ok).toBe(false);
    expect(insectCare(key, plot, p, 0, "guard", "me", NOW, []).ok).toBe(false);
    expect(insectCare(key, plot, p, 0, "pollinate", "other", NOW, [])).toEqual({ ok: false, why: "theirs" });
    expect(insectCare(key, { ...plot, plant: { ...plant, root: "46,42" } }, p, 0, "pollinate", "me", NOW, []).ok).toBe(false);
    expect(insectCare(key, { soil: "tilled", plant: null }, p, 0, "pollinate", "me", NOW, []).ok).toBe(false);
    expect(p).toEqual(copy);
  });
  it("predators cure a real pest and cannot be spent twice on the cured plant", () => {
    let pest: Plot | undefined;
    for (let h = 2; h < 120; h++) { const candidate = { ...plot, plant: { ...plant, sown: NOW - h * 3600000, guard: 0 } }; if (see(key, candidate, NOW, []).pest) { pest = candidate; break; } }
    expect(pest).toBeDefined(); if (!pest) return;
    const did = insectCare(key, pest, purse(["lacewing", "pestWhistle"]), 0, "guard", "me", NOW, []);
    expect(did.ok).toBe(true); if (!did.ok) return;
    expect(did.plot.plant.cured).toBe(NOW);
    expect(did.plot.plant.guard).toBe(NOW + INSECT_GARDEN.guardMinutes * 60000);
    expect(insectCare(key, did.plot, did.purse, 0, "guard", "me", NOW, []).ok).toBe(false);
  });
});
