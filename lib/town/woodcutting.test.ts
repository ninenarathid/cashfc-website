import { describe, expect, it } from "vitest";
import { WOOD_ITEMS, WOOD_TOOL_IDS } from "./wood-items";
import { grainOf, type WoodSelection } from "./wood-grain";
import { woodMods, woodQuality } from "./woodcutting";
import { begin, fell, newGrove, opened, woodOf } from "./trees";
import { held, newPurse, type Purse, type Stack } from "./trade";
import { dayOf } from "./stamina";
import { CRAFT_IDS, CRAFTS } from "./crafting";
import { DISHES, MAKES, type ItemId } from "./items";
import { sources, usesOf } from "./uses";

const NOW = Date.UTC(2026, 9, 10, 5), tree = 3, at = [30, 31] as const;
const wood = woodOf([{ id: tree, x: 30, y: 30, tier: 1 }], { x: 100, y: 100, w: 3 });
const choice = (part: WoodSelection["part"] = "wood"): WoodSelection => ({ notches: grainOf(tree).notches, direction: grainOf(tree).lean, part });
const purse = (tools: ItemId[] = []): Purse => ({ ...newPurse(), bag: [{ item: "axe", n: 1 }, ...tools.map(item => ({ item, n: 1 })), ...Array(12).fill(null)], hand: "axe", handAt: 0, stamina: { day: dayOf(NOW), left: 100 } });
const cut = (p = purse(), grain = choice(), misses = 0, through = true) => fell(p, newGrove(), "me", { tree, through, misses, secs: 60, grain }, at, NOW, [], wood);

describe("woodcutting expansion", () => {
  it("has 25 distinct obtainable items with a working use", () => {
    const from = sources();
    expect(Object.keys(WOOD_ITEMS)).toHaveLength(25);
    for (const id of Object.keys(WOOD_ITEMS) as ItemId[]) {
      expect(from.has(id), id).toBe(true);
      expect(id in MAKES || id in DISHES || CRAFT_IDS.includes(id as typeof CRAFT_IDS[number]) || usesOf(id).length > 0 || Object.values(MAKES).some(r => r.needs.some(([n]) => n === id)) || Object.values(CRAFTS).some(r => r.some(([n]) => n === id)), id).toBe(true);
    }
    expect(WOOD_TOOL_IDS.every(id => usesOf(id).includes("woodwork"))).toBe(true);
  });
  it("keeps original logs and timber and adds the part selected", () => {
    for (const [part, item] of [["wood", "heartwood"], ["bark", "pineBark"], ["sap", "pinePitch"], ["seed", "pineNut"], ["root", "rootFiber"]] as const) {
      const p = purse(), before = structuredClone(p), got = cut(p, choice(part));
      expect(got.ok).toBe(true);
      if (!got.ok) continue;
      expect(got.felled[0].quality).toBe("heart");
      expect(held(got.purse.bag, item)).toBeGreaterThan(0);
      expect(held(got.purse.bag, "log")).toBeGreaterThan(0);
      expect(p).toEqual(before);
    }
  });
  it("grades actual choices and misses, and takes the strongest hint", () => {
    const p = purse(["notchGauge", "grainLens", "braceStake"]);
    p.buffs = [{ id: "grain", level: 4, until: NOW + 1000 }];
    expect(woodMods(p, NOW).hints).toBe(3);
    expect(woodMods(p, NOW + 1000).hints).toBe(3);
    expect(woodQuality(tree, choice(), 1, p, NOW)).toBe("heart");
    expect(woodQuality(tree, choice(), 2, p, NOW)).toBe("clear");
    expect(woodQuality(tree, { ...choice(), direction: -choice().direction as -1 | 1 }, 0, purse(), NOW)).toBe("clear");
  });
  it("lost rounds, held trees and malformed choices give no materials", () => {
    const p = purse();
    expect(cut(p, choice(), 2, false)).toMatchObject({ ok: true, got: [], purse: p, stood: true });
    expect(fell(p, opened(newGrove(), "other", [tree], NOW), "me", { tree, through: true, misses: 0, secs: 60, grain: choice() }, at, NOW, [], wood)).toMatchObject({ ok: false, why: "held" });
    for (const value of [null, {}, { notches: [-1, -1, -1], part: "wood" }, { ...choice(), part: "coin" }]) expect(cut(p, value as WoodSelection)).toMatchObject({ ok: false, why: "none" });
    expect(cut(p, choice(), 0.5)).toMatchObject({ ok: false, why: "none" });
  });
  it("a full bag rejects the entire harvest without changing the purse or grove", () => {
    const p = purse();
    p.bag = [{ item: "axe", n: 1 }, { item: "log", n: 1 }, { item: "timber", n: 1 }, { item: "salt", n: 20 }, { item: "rice", n: 20 }] as Stack[];
    const before = structuredClone(p);
    expect(cut(p)).toEqual({ ok: false, why: "full" });
    expect(p).toEqual(before);
    expect(begin(p, newGrove(), tree, at, NOW, 1, wood)).toMatchObject({ ok: true });
  });
  it("a successful tree cannot be claimed twice", () => {
    const first = cut();
    if (!first.ok) throw new Error(first.why);
    expect(fell(first.purse, first.grove, "me", { tree, through: true, misses: 0, secs: 60, grain: choice() }, at, NOW, [], wood)).toEqual({ ok: false, why: "stump" });
  });
});
