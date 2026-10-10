import { describe, expect, it } from "vitest";
import { GEOLOGY_ITEMS, GEOLOGY_TOOLS } from "./geology-items";
import { echoOf, geologicalYield, geologyMods, type RockChoice } from "./geology";
import { accountOf, veinFrom } from "./vein-account";
import { veinEnd, type PendingVein } from "./mining";
import { faceOf, bestRoute } from "./vein";
import { newPurse, held, type Purse } from "./trade";
import { sources, idle } from "./uses";
const NOW = Date.UTC(2026, 9, 10, 5);
const vein = (seed: number, gem: PendingVein["gem"] = "fire"): PendingVein => ({ f: 12, rock: 1, turn: 2, seed, gem, mods: { strikes: 12, back: 1, cross: 1, spent: false }, more: 0 });
const purse = (v: PendingVein): Purse => ({ ...newPurse(), bag: [...GEOLOGY_TOOLS.map(item => ({ item, n: 1 })), ...Array(12).fill(null)], mine: { vein: v } });
describe("mineral layers and preserving crystals", () => {
  it("has 25 obtainable new items and no idle tool", () => {
    expect(Object.keys(GEOLOGY_ITEMS)).toHaveLength(25);
    const from = sources();
    for (const id of Object.keys(GEOLOGY_ITEMS) as Array<keyof typeof GEOLOGY_ITEMS>) expect(from.has(id), id).toBe(true);
    for (const id of GEOLOGY_TOOLS) expect(idle()).not.toContain(id);
  });
  it("replays honest routes and agrees with the bounded account for both choices", () => {
    for (let seed = 10; seed < 22; seed++) {
      const v = vein(seed), p = purse(v), route = bestRoute(faceOf(v.seed, true), v.mods);
      for (const focus of ["ore", "crystal"] as const) {
        const choice: RockChoice = { echo: echoOf(seed), focus };
        expect(veinEnd(p, route.strikes, NOW, choice)).toEqual(veinFrom(p, accountOf(v, route.strikes, choice), NOW));
      }
    }
  });
  it("preserving crystals replaces fragments and does not spend a duplicate-yield power on them", () => {
    const v = vein(13), p = purse(v), route = bestRoute(faceOf(v.seed, true), v.mods), choice: RockChoice = { echo: echoOf(v.seed), focus: "crystal" };
    const did = veinEnd(p, route.strikes, NOW, choice);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(held(did.purse.bag, "chipRuby")).toBe(0);
    expect(held(did.purse.bag, "wholeGeode")).toBe(2);
    expect(veinEnd(did.purse, route.strikes, NOW, choice)).toEqual({ ok: false, why: "none" });
  });
  it("wrong echoes and empty attempts cannot conjure preserved crystals", () => {
    const v = vein(13), p = purse(v);
    expect(geologicalYield(v, { echo: -echoOf(v.seed) as -1 | 1, focus: "crystal" }, 4, 2, p)).toEqual([]);
    expect(geologicalYield(v, { echo: echoOf(v.seed), focus: "ore" }, 0, 0, p)).toEqual([]);
    expect(veinEnd(p, [], NOW, { echo: 2, focus: "ore" } as unknown as RockChoice)).toEqual({ ok: false, why: "none" });
  });
  it("a full bag keeps the pending vein and pays nothing", () => {
    const v = vein(13), p = { ...purse(v), bag: [{ item: "salt" as const, n: 20 }] }, before = structuredClone(p), route = bestRoute(faceOf(v.seed, true), v.mods);
    expect(veinEnd(p, route.strikes, NOW, { echo: echoOf(v.seed), focus: "ore" })).toEqual({ ok: false, why: "full" });
    expect(p).toEqual(before);
  });
  it("meal and hammer share one hint, and independent tools retain their effects", () => {
    const p = purse(vein(13)); p.buffs = [{ id: "layers", level: 4, until: NOW + 1000 }];
    expect(geologyMods(p, NOW)).toMatchObject({ hint: true, cavities: true, preserve: true });
    expect(geologyMods({ ...newPurse(), buffs: p.buffs }, NOW + 1000).hint).toBe(false);
  });
});
