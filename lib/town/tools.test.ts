import { describe, expect, it } from "vitest";
import { ITEMS, ITEM_IDS, type ItemId } from "./items";
import { plain as plainIn, takePlain } from "./notices";
import { mayDrop } from "./jar";
import { push } from "./deal";
import { fits } from "./box";
import { cook, goesIn } from "./cooking";
import { powerLeft, powerRule, powerUsed, usePower } from "./powers";
import { dayOf } from "./stamina";
import {
  ELEMENTS, FELLED, FORGE, GEMS, GEM_FX, LEVELS, MINED, OPTIONS, OPTION_IDS, ORES, ROCKS, SMELTS, TOOL_KINDS, WOODEN,
  TOOL_WORD, WIND_WALK, axeAhead, axeBarPace, axeBarSlow, axeChops, capEase, drawnOf, elementOfChip, elementOfGem, gemBy, gemLevel, gemsOf, glowOf, has, isWooden, levelOf, modsOf, readToolWord, toolWord, walkPace,
  optN, pickPower, pickSwings, poolOf, ramp, smeltedOf, toolKindOf, veinStrikes, type OptionId, type ToolKind,
} from "./tools";
import { GOODS, HOUR, forged, leave, newPurse, plainStack, put, wholeStack, type Purse, type Stack } from "./trade";

const NOW = Date.parse("2026-10-08T12:00:00+07:00");
const tool = (item: ItemId, plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item, n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });

describe("the twenty-eight things of woodcutting and mining", () => {
  const NEW: ItemId[] = ["pick", "axe", "stone", "log", "timber", "shardCopper", "shardIron", "shardSilver", "oreCopper", "oreIron", "oreSilver",
    "chipRuby", "chipSapphire", "chipAquamarine", "chipAmber", "chipTopaz", "chipEmerald", "chipDiamond", "chipOnyx",
    "gemRuby", "gemSapphire", "gemAquamarine", "gemAmber", "gemTopaz", "gemEmerald", "gemDiamond", "gemOnyx", "torch"];
  it("are there, all of the early game, each with its names and a line", () => {
    expect(NEW.length).toBe(28);
    for (const id of NEW) {
      expect(ITEM_IDS).toContain(id);
      expect(ITEMS[id].tier).toBe(1);
      expect(ITEMS[id].name.th.length).toBeGreaterThan(0);
      expect(ITEMS[id].name.en.length).toBeGreaterThan(0);
      expect(ITEMS[id].about.th.length).toBeGreaterThan(5);
      expect(ITEMS[id].about.en.length).toBeGreaterThan(5);
    }
  });
  it("fetch nothing from the uncle's relatives, but for the two tools he sells", () => {
    for (const id of NEW) if (id !== "pick" && id !== "axe") expect(ITEMS[id].pays).toBe(0);
    // the two tools are on his shelf as the hoe is: its price, its stock, one a member a round
    expect(GOODS.pick).toEqual(GOODS.hoe);
    expect(GOODS.axe).toEqual(GOODS.hoe);
    expect(GOODS.pick).toEqual({ price: 50, stock: 6, each: 1 });
    // and his relatives pay less for one than he asks
    expect(ITEMS.pick.pays).toBeLessThan(GOODS.pick!.price);
    expect(ITEMS.axe.pays).toBeLessThan(GOODS.axe!.price);
  });
  it("stack as the spec has them", () => {
    for (const id of ["stone", "log", "timber"] as const) expect(ITEMS[id].stack).toBe(50);
    for (const o of ORES) { expect(ITEMS[o.shard].stack).toBe(99); expect(ITEMS[o.ore].stack).toBe(20); }
    for (const e of ELEMENTS) { expect(ITEMS[GEMS[e].chip].stack).toBe(99); expect(ITEMS[GEMS[e].gem].stack).toBe(20); }
    expect(ITEMS.torch.stack).toBe(10);
    expect(ITEMS.pick.stack).toBe(1);
    expect(ITEMS.axe.stack).toBe(1);
  });
  it("say what a thing looks like, never a number of what it does", () => {
    for (const id of NEW) expect(`${ITEMS[id].about.th} ${ITEMS[id].about.en}`).not.toMatch(/\d/);
  });
});

describe("what a rock or a tree leaves is not cooked", () => {
  it("no stone, ore, gem or log goes in a pot, nor a torch; fine timber does, for a torch is made of it by hand", () => {
    for (const id of MINED) expect(goesIn(id)).toBe(false);
    for (const id of Object.keys(SMELTS) as ItemId[]) expect(goesIn(id)).toBe(false);
    expect(goesIn("log")).toBe(false);
    expect(goesIn("torch")).toBe(false);
    expect(goesIn("timber")).toBe(true);
    expect(goesIn("resin")).toBe(true);
    // and by hand, of one fine timber and one resin, two torches
    const purse: Purse = { ...newPurse(), stamina: { day: dayOf(NOW), left: 50 }, bag: put(put(newPurse().bag, "timber", 1), "resin", 1) };
    const made = cook(purse, [["timber", 1], ["resin", 1]], [null], 0, NOW);
    expect(made.ok && made.made).toBe("torch");
    expect(made.ok && made.n).toBe(2);
    // what went in as it always did still does
    for (const id of ["minnow", "kangkong", "twig", "clay", "rice", "fishSauce"] as const) expect(goesIn(id)).toBe(true);
    for (const id of ["rod", "scrollFriedMinnow", "tomYum", "monarch"] as const) expect(goesIn(id)).toBe(false);
  });
});

describe("which tools are forged", () => {
  it("the nine kinds are things of the first tier, tools every one, three of them wooden", () => {
    expect(TOOL_KINDS.length).toBe(9);
    for (const k of TOOL_KINDS) { expect(ITEMS[k].kind).toBe("tool"); expect(ITEMS[k].tier).toBe(1); expect(toolKindOf(k)).toBe(k); }
    expect([...WOODEN].sort()).toEqual(["axe", "bugNet", "rod"]);
    expect(TOOL_KINDS.filter((k) => !isWooden(k)).sort()).toEqual(["can", "grill", "hoe", "pan", "pick", "pot"]);
  });
  it("nothing else is: no better tool of a later tier, no thing that is no tool", () => {
    for (const id of ["rodTeak", "hoeIron", "canBrass", "potBrass", "wok", "bucket", "potFull", "minnow", "stone", "gemRuby"] as const) {
      expect(toolKindOf(id)).toBeNull();
      expect(modsOf({ item: id, n: 1, plus: 9, opts: ["pkPeek"], gems: ["fire"] })).toEqual(modsOf(null));
    }
    expect(toolKindOf(null)).toBeNull();
    expect(toolKindOf(undefined)).toBeNull();
  });
});

describe("elements, gems and ore", () => {
  it("eight elements, each with a gem and its fragment of their own", () => {
    expect(ELEMENTS.length).toBe(8);
    const gems = ELEMENTS.map((e) => GEMS[e].gem), chips = ELEMENTS.map((e) => GEMS[e].chip);
    expect(new Set(gems).size).toBe(8);
    expect(new Set(chips).size).toBe(8);
    for (const e of ELEMENTS) {
      expect(elementOfGem(GEMS[e].gem)).toBe(e);
      expect(elementOfChip(GEMS[e].chip)).toBe(e);
      expect(GEMS[e].hue).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(elementOfGem("stone")).toBeNull();
    expect(GEMS.fire.gem).toBe("gemRuby"); expect(GEMS.water.gem).toBe("gemSapphire"); expect(GEMS.ice.gem).toBe("gemAquamarine"); expect(GEMS.earth.gem).toBe("gemAmber");
    expect(GEMS.lightning.gem).toBe("gemTopaz"); expect(GEMS.wind.gem).toBe("gemEmerald"); expect(GEMS.light.gem).toBe("gemDiamond"); expect(GEMS.dark.gem).toBe("gemOnyx");
  });
  it("three ores, and what is smelted of what: longer and dearer the rarer", () => {
    expect(ORES.map((o) => [o.shard, o.ore, o.mins, o.fee])).toEqual([["shardCopper", "oreCopper", 5, 5], ["shardIron", "oreIron", 8, 10], ["shardSilver", "oreSilver", 11, 15]]);
    expect(Object.keys(SMELTS).length).toBe(3 + 8);
    expect(SMELTS.oreIron).toEqual({ of: "shardIron", mins: 8, fee: 10 });
    expect(SMELTS.gemTopaz).toEqual({ of: "chipTopaz", mins: 10, fee: 20 });
    expect(smeltedOf("shardSilver")).toBe("oreSilver");
    expect(smeltedOf("chipOnyx")).toBe("gemOnyx");
    expect(smeltedOf("stone")).toBeNull();
  });
  it("what the two tools bring home", () => {
    expect([...FELLED]).toEqual(["log", "timber"]);
    expect(MINED.length).toBe(1 + 3 + 8);
    expect(MINED).toContain("stone");
    for (const o of ORES) expect(MINED).toContain(o.shard);
    for (const e of ELEMENTS) expect(MINED).toContain(GEMS[e].chip);
  });
});

describe("what a plus gives", () => {
  it("every table has a number for each plus from 0 to 10", () => {
    for (const k of TOOL_KINDS) for (const [, table] of Object.entries(LEVELS[k])) {
      expect(table.length).toBe(11);
      for (const v of table) expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("the pick and the axe: as bought and at the top as they were approved, and every level between another", () => {
    // (2026-10-08: the levels between were laid again so that no plus leaves the tool as the plus before left it)
    expect([...LEVELS.pick.power]).toEqual([3, 3.45, 3.65, 3.7, 4, 4.5, 5, 6, 7, 8.5, 12]);
    expect([...LEVELS.pick.strikes]).toEqual([6, 6, 6, 7, 7, 7, 7, 8, 9, 9, 10]);
    expect([...LEVELS.axe.chops]).toEqual([12, 11, 11, 10, 10, 9, 8, 7, 7, 6, 4]);
    expect([...LEVELS.axe.ahead]).toEqual([3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5]);
    expect([...LEVELS.axe.slow]).toEqual([0, 0, 0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5]);
    // swings on the mountain's foot and the first ten floors, and at +0 on the deeper ones
    expect(Array.from({ length: 11 }, (_, l) => pickSwings(tool("pick", l), 12))).toEqual([4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1]);
    expect([...ROCKS].map((h) => pickSwings(tool("pick"), h))).toEqual([4, 6, 8]);
    // (and on the deeper ones by the level: the first plus is a swing fewer on the deepest, the second on the middle)
    expect(Array.from({ length: 11 }, (_, l) => pickSwings(tool("pick", l), 18))).toEqual([6, 6, 5, 5, 5, 4, 4, 3, 3, 3, 2]);
    expect(Array.from({ length: 11 }, (_, l) => pickSwings(tool("pick", l), 24))).toEqual([8, 7, 7, 7, 6, 6, 5, 4, 4, 3, 2]);
  });
  it("the seven old tools at +0, +4, +7 and +10, climbing evenly between and never falling back", () => {
    const at = (t: readonly number[]) => [t[0], t[4], t[7], t[10]];
    expect(at(LEVELS.rod.band)).toEqual([1, 1.1, 1.25, 1.5]);
    expect(at(LEVELS.rod.slow)).toEqual([0, 0.05, 0.15, 0.3]);
    expect(at(LEVELS.rod.strike)).toEqual([1.6, 1.7, 1.9, 2.2]);
    expect(at(LEVELS.hoe.band)).toEqual([1, 1.1, 1.25, 1.5]);
    expect(at(LEVELS.hoe.slow)).toEqual([0, 0.05, 0.15, 0.3]);
    // (the can's waterings were laid again, 2026-10-08: one more at the first plus, and no two levels running the same past the fourth)
    expect([...LEVELS.can.waterings]).toEqual([8, 9, 9, 10, 10, 11, 11, 12, 13, 14, 16]);
    expect(at(LEVELS.can.marks)).toEqual([1, 1.1, 1.25, 1.5]);
    expect(at(LEVELS.bugNet.ring)).toEqual([0.6, 0.66, 0.75, 0.9]);
    expect(at(LEVELS.bugNet.lands)).toEqual([300, 270, 225, 150]);
    for (const k of ["pot", "pan", "grill"] as const) expect(at(LEVELS[k].band)).toEqual([1, 1.1, 1.25, 1.5]);
    const rising = (t: readonly number[]) => t.every((v, i) => i === 0 || v >= t[i - 1]), falling = (t: readonly number[]) => t.every((v, i) => i === 0 || v <= t[i - 1]);
    for (const t of [LEVELS.rod.band, LEVELS.rod.slow, LEVELS.rod.strike, LEVELS.hoe.band, LEVELS.can.waterings, LEVELS.can.marks, LEVELS.bugNet.ring, LEVELS.pick.power, LEVELS.pick.strikes, LEVELS.axe.ahead, LEVELS.axe.slow]) expect(rising(t)).toBe(true);
    for (const t of [LEVELS.bugNet.lands, LEVELS.axe.chops]) expect(falling(t)).toBe(true);
    for (const v of LEVELS.can.waterings) expect(Number.isInteger(v)).toBe(true);
    // most of it comes near the top: the last three levels give more than the first four
    expect(LEVELS.rod.band[10] - LEVELS.rod.band[7]).toBeGreaterThan(LEVELS.rod.band[4] - LEVELS.rod.band[0]);
    expect(ramp(0, 4, 7, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("a tool at +0 with nothing on it is the tool as it is today", () => {
    for (const k of TOOL_KINDS) {
      const m = modsOf(tool(k));
      expect(m).toEqual({ kind: k, level: 0, opts: [], asleep: [], gems: {}, glow: 0, hue: "#ffd98a" });
    }
    expect(pickPower(tool("pick"))).toBe(3);
    expect(veinStrikes(tool("pick"))).toBe(6);
    expect(axeChops(tool("axe"))).toBe(12);
    expect(axeAhead(tool("axe"))).toBe(3);
    expect(axeBarSlow(tool("axe"))).toBe(0);
    expect(axeBarPace(tool("axe"))).toBe(1);
    expect(LEVELS.rod.band[0]).toBe(1); expect(LEVELS.hoe.band[0]).toBe(1); expect(LEVELS.can.marks[0]).toBe(1); expect(LEVELS.pot.band[0]).toBe(1);
    expect(LEVELS.rod.slow[0]).toBe(0); expect(LEVELS.hoe.slow[0]).toBe(0);
  });
  it("is read soundly: a plus that is no number, or past the top, or of a thing that is not forged", () => {
    expect(levelOf(tool("pick", 7))).toBe(7);
    expect(levelOf({ item: "pick", n: 1, plus: 99 })).toBe(10);
    expect(levelOf({ item: "pick", n: 1, plus: -3 })).toBe(0);
    expect(levelOf({ item: "pick", n: 1, plus: 4.9 })).toBe(4);
    expect(levelOf({ item: "pick", n: 1, plus: Number.NaN })).toBe(0);
    expect(levelOf({ item: "pick", n: 1, plus: "7" as unknown as number })).toBe(0);
    expect(levelOf({ item: "rodTeak", n: 1, plus: 7 })).toBe(0);
    expect(levelOf(null)).toBe(0);
    expect(pickPower(null)).toBe(3);
    expect(axeChops(undefined)).toBe(12);
  });
  it("ease is capped at three times the plain tool", () => {
    expect(FORGE.cap).toBe(3);
    expect(capEase(5)).toBe(3);
    expect(capEase(2)).toBe(2);
    expect(capEase(0.1)).toBeCloseTo(1 / 3);
    expect(capEase(0.5)).toBe(0.5);
  });
});

describe("options", () => {
  it("thirty-two in the first pool and twenty-three in the second, each with a name in both languages, each for tools that are forged", () => {
    expect(OPTION_IDS.filter((id) => OPTIONS[id].pool === 1).length).toBe(32);
    expect(OPTION_IDS.filter((id) => OPTIONS[id].pool === 2).length).toBe(23);
    const names = new Set<string>();
    for (const id of OPTION_IDS) {
      const o = OPTIONS[id];
      expect(o.name.th.length).toBeGreaterThan(1);
      expect(o.name.en.length).toBeGreaterThan(1);
      expect(o.tools.length).toBeGreaterThan(0);
      for (const t of o.tools) expect(TOOL_KINDS).toContain(t);
      names.add(o.name.th); names.add(o.name.en);
    }
    expect(names.size).toBe(OPTION_IDS.length * 2);
  });
  it("each kind of tool has its own pools: six and four for the pick and the axe, four and three for the rest, the cookware sharing one", () => {
    const n = (k: ToolKind) => [poolOf(k, 1).length, poolOf(k, 2).length];
    expect(n("pick")).toEqual([6, 4]);
    expect(n("axe")).toEqual([6, 4]);
    for (const k of ["rod", "hoe", "can", "bugNet", "pot", "pan", "grill"] as const) expect(n(k)).toEqual([4, 3]);
    expect(poolOf("pot", 1)).toEqual(poolOf("pan", 1));
    expect(poolOf("pan", 2)).toEqual(poolOf("grill", 2));
    expect(poolOf("pick", 1)).toEqual(["pkPeek", "pkCrumb", "pkSteady", "pkLoose", "pkFresh", "pkCutter"]);
    expect(poolOf("axe", 2)).toEqual(["axOne", "axDouble", "axRoot", "axElder"]);
    // (two pools of a kind never share an option)
    for (const k of TOOL_KINDS) expect(poolOf(k, 1).filter((id) => poolOf(k, 2).includes(id))).toEqual([]);
  });
  it("what is counted is counted to a day or to a meal's hours", () => {
    const counted = OPTION_IDS.filter((id) => powerRule(id));
    for (const id of counted) { const r = powerRule(id)!; expect(r.n).toBeGreaterThan(0); expect(["day", "meal"]).toContain(r.per); }
    // the first pool's counted ones are a meal's hours' (the first so many cost no stamina); the second pool's, a day's
    for (const id of counted) expect(powerRule(id)!.per).toBe(OPTIONS[id].pool === 1 ? "meal" : "day");
    expect(powerRule("pkQuake")).toEqual({ n: 10, per: "day" });
    expect(powerRule("pkTwin")).toEqual({ n: 5, per: "day" });
    expect(powerRule("pkDrill")).toEqual({ n: 3, per: "day" });
    expect(powerRule("axOne")).toEqual({ n: 10, per: "day" });
    expect(powerRule("axRoot")).toEqual({ n: 3, per: "day" });
    expect(powerRule("pkFresh")).toEqual({ n: 10, per: "meal" });
    expect(powerRule("axFresh")).toEqual({ n: 5, per: "meal" });
    expect(powerRule("ckFresh")).toEqual({ n: 1, per: "meal" });
    expect(powerRule("pkPeek")).toBeNull();
    expect(powerRule("pkGleam")).toBeNull();
    expect(powerRule("nothing")).toBeNull();
    expect(optN("pkSteady", "strikes")).toBe(2);
    expect(optN("axKeen", "chops")).toBe(2);
    expect(optN("axGrain", "ahead")).toBe(2);
    expect(optN("pkPeek", "strikes")).toBe(0);
  });
});

describe("what a tool carries, read as it works now", () => {
  it("an option once drawn works whatever the level has fallen to: none sleeps (the owner, 2026-10-08)", () => {
    expect([...FORGE.milestones]).toEqual([3, 6, 10]);
    const t = (plus: number) => modsOf(tool("pick", plus, ["pkSteady", "pkLoose", "pkQuake"]));
    for (const plus of [10, 9, 6, 5, 4]) {
      expect(t(plus).opts).toEqual(["pkSteady", "pkLoose", "pkQuake"]);
      expect(t(plus).asleep).toEqual([]);
    }
    // (a level lost to a failed try: the +6 option is still the tool's, and still works)
    expect(has(tool("pick", 5, ["pkSteady", "pkLoose"]), "pkLoose")).toBe(true);
    expect(has(tool("pick", 6, ["pkSteady", "pkLoose"]), "pkLoose")).toBe(true);
    expect(has(tool("pick", 6, ["pkSteady", "pkLoose"]), "pkSteady")).toBe(true);
    expect(has(tool("pick", 6, ["pkSteady"]), "pkLoose")).toBe(false);
    expect(has(null, "pkSteady")).toBe(false);
  });
  it("is read soundly: only this tool's options, each at the milestone its pool is drawn at, each once", () => {
    // another tool's option, a second-pool option at a first-pool milestone, the same option twice, something that is no option
    expect(drawnOf(tool("pick", 10, ["axKeen", "pkQuake", "pkPeek"]))).toEqual([null, null, null]);
    expect(drawnOf(tool("pick", 10, ["pkPeek", "pkPeek", "pkQuake"]))).toEqual(["pkPeek", null, "pkQuake"]);
    expect(drawnOf(tool("pick", 10, ["pkPeek", "nothing", "pkQuake"]))).toEqual(["pkPeek", null, "pkQuake"]);
    expect(drawnOf({ item: "pick", n: 1, plus: 10, opts: "pkPeek" as unknown as string[] })).toEqual([null, null, null]);
    expect(modsOf(tool("pot", 10, ["ckFire", "ckBase", "ckBig"])).opts).toEqual(["ckFire", "ckBase", "ckBig"]);
    expect(modsOf(tool("grill", 6, ["ckFire", "ckBase"])).opts).toEqual(["ckFire", "ckBase"]);
    // more than three are not read
    expect(modsOf(tool("pick", 10, ["pkPeek", "pkCrumb", "pkQuake", "pkTwin"])).opts).toEqual(["pkPeek", "pkCrumb", "pkQuake"]);
  });
  it("a gem works at the first level, and one more at the top; a tool of the first tier has one socket", () => {
    expect(FORGE.sockets).toBe(1);
    expect(gemLevel(tool("pick", 0, [], ["fire"]), "fire")).toBe(1);
    expect(gemLevel(tool("pick", 9, [], ["fire"]), "fire")).toBe(1);
    expect(gemLevel(tool("pick", 10, [], ["fire"]), "fire")).toBe(2);
    expect(gemLevel(tool("pick", 10, [], ["fire"]), "ice")).toBe(0);
    expect(gemLevel(tool("pick"), "fire")).toBe(0);
    expect(gemsOf(tool("pick", 0, [], ["fire", "ice"]))).toEqual(["fire"]);
    expect(gemsOf(tool("pick", 0, [], ["plasma", "ice"]))).toEqual(["ice"]);
    expect(gemsOf({ item: "pick", n: 1, gems: "fire" as unknown as string[] })).toEqual([]);
    expect(gemsOf({ item: "rodTeak", n: 1, gems: ["fire"] })).toEqual([]);
    expect(gemBy(tool("pick", 0, [], ["fire"]), "fire", [0.15, 0.25, 0.35, 0.45])).toBe(0.15);
    expect(gemBy(tool("pick", 10, [], ["fire"]), "fire", [0.15, 0.25, 0.35, 0.45])).toBe(0.25);
    expect(gemBy(tool("pick"), "fire", [0.15, 0.25, 0.35, 0.45])).toBe(0);
    expect(gemBy(tool("pick"), "dark", [1.3, 1.6], 1)).toBe(1);
  });
  it("the two new tools' elements, as the table has them", () => {
    for (const e of ELEMENTS) for (const k of ["pick", "axe"] as const) for (const steps of Object.values(GEM_FX[e][k])) expect(steps.length).toBe(4);
    expect([...GEM_FX.fire.pick.fewer]).toEqual([0.15, 0.25, 0.35, 0.45]);
    expect([...GEM_FX.light.pick.glint]).toEqual([4, 7, 10, 999]);
    expect([...GEM_FX.light.axe.glint]).toEqual([10, 20, 30, 999]);
    expect([...GEM_FX.dark.pick.veins]).toEqual([1.3, 1.6, 1.9, 2.2]);
    expect([...GEM_FX.wind.axe.walk]).toEqual([0.1, 0.15, 0.2, 0.25]);
  });
  it("the pick's and the axe's own numbers, all told", () => {
    expect(veinStrikes(tool("pick", 10))).toBe(10);
    expect(veinStrikes(tool("pick", 3, ["pkSteady"]))).toBe(9);
    expect(veinStrikes(tool("pick", 2, ["pkSteady"]))).toBe(8);
    // fire: so much fewer, rounded up; dark: a swing more
    expect(pickSwings(tool("pick", 0, [], ["fire"]), 24)).toBe(7);
    expect(pickSwings(tool("pick", 10, [], ["fire"]), 24)).toBe(2);
    expect(pickSwings(tool("pick", 0, [], ["dark"]), 12)).toBe(5);
    expect(pickSwings(tool("pick", 10), 12)).toBe(1);
    expect(axeChops(tool("axe", 10))).toBe(4);
    expect(axeChops(tool("axe", 3, ["axKeen"]))).toBe(8);
    expect(axeChops(tool("axe", 0, [], ["fire"]))).toBe(11);
    expect(axeChops(tool("axe", 10, ["axKeen"], ["fire"]))).toBe(2);
    // (a tree that takes twice the chops takes twice the axe's)
    expect(axeChops(tool("axe"), 24)).toBe(24);
    expect(axeChops(tool("axe", 10), 24)).toBe(8);
    expect(axeAhead(tool("axe", 10))).toBe(5);
    expect(axeAhead(tool("axe", 3, ["axGrain"]))).toBe(5);
    expect(axeBarSlow(tool("axe", 10))).toBeCloseTo(0.5);
    expect(axeBarSlow(tool("axe", 0, [], ["ice"]))).toBeCloseTo(0.15);
    expect(axeBarPace(tool("axe", 0, [], ["dark"]))).toBeCloseTo(1.15);
    expect(axeBarSlow(tool("axe", 0, [], ["dark"]))).toBeCloseTo(-0.15);
    // (the top and its ice together: under the cap, and never past it)
    expect(axeBarPace(tool("axe", 10, [], ["ice"]))).toBeCloseTo(0.5 * 0.75);
    expect(axeBarPace(tool("axe", 10, [], ["ice"]))).toBeGreaterThanOrEqual(1 / FORGE.cap);
  });
  it("glows from +7 and fully at +10, in its gem's colour", () => {
    expect(modsOf(tool("rod", 6)).glow).toBe(0);
    expect(modsOf(tool("rod", 7)).glow).toBe(1);
    expect(modsOf(tool("rod", 9)).glow).toBe(1);
    expect(modsOf(tool("rod", 10)).glow).toBe(2);
    expect(modsOf(tool("rod", 10, [], ["ice"])).hue).toBe(GEMS.ice.hue);
    // what the room is told: how it glows, and its gem's letter and level; nothing of a tool with nothing to tell
    expect(toolWord(tool("rod", 6))).toBe("");
    expect(toolWord(tool("rod", 6, [], ["ice"]))).toBe("0i1");
    expect(toolWord(tool("rod", 7))).toBe("1");
    expect(toolWord(tool("rod", 10, [], ["ice"]))).toBe("2i2");
    expect(toolWord({ item: "minnow", n: 1, plus: 10 })).toBe("");
    expect(toolWord(null)).toBe("");
    expect(glowOf("2i2")).toEqual({ glow: 2, hue: GEMS.ice.hue });
    expect(glowOf("1")).toEqual({ glow: 1, hue: "#ffd98a" });
    expect(glowOf("0i1")).toBeNull();
    expect(readToolWord("0i1")).toEqual({ glow: 0, element: "ice", level: 1, hue: GEMS.ice.hue });
    // every element comes back as itself
    for (const e of ELEMENTS) {
      expect(glowOf(toolWord(tool("pick", 10, [], [e])))).toEqual({ glow: 2, hue: GEMS[e].hue });
      expect(readToolWord(toolWord(tool("pick", 0, [], [e])))).toEqual({ glow: 0, element: e, level: 1, hue: GEMS[e].hue });
      expect(toolWord(tool("pick", 10, [], [e]))).toMatch(TOOL_WORD);
    }
    for (const bad of ["", "3", "1q", "2ii", "x", "1i", "1i5", "2q1", null, 7, undefined]) expect(readToolWord(bad)).toBeNull();
  });
  it("the wind in a tool walks its holder faster, by what the room is told: the same on every page", () => {
    expect(walkPace("")).toBe(1);
    expect(walkPace(undefined)).toBe(1);
    expect(walkPace("2f2")).toBe(1);
    expect(walkPace(toolWord(tool("hoe", 0, [], ["wind"])))).toBeCloseTo(1.1);
    expect(walkPace(toolWord(tool("pick", 10, [], ["wind"])))).toBeCloseTo(1.15);
    expect(walkPace("0a4")).toBeCloseTo(1.25);
    expect([...GEM_FX.wind.pick.walk]).toEqual([...WIND_WALK]);
    expect([...GEM_FX.wind.axe.walk]).toEqual([...WIND_WALK]);
  });
});

describe("a tool that carries something is not a plain thing", () => {
  const plain = tool("pick"), plus = tool("pick", 1), opted = tool("pick", 0, ["pkPeek"]), gemmed = tool("pick", 0, [], ["fire"]);
  it("forged: a plus, an option or a gem; a tool as it was bought is not", () => {
    expect(forged(plain)).toBe(false);
    expect(forged({ item: "pick", n: 1, plus: 0, opts: [], gems: [] })).toBe(false);
    for (const s of [plus, opted, gemmed]) expect(forged(s)).toBe(true);
    expect(forged(null)).toBe(false);
  });
  it("a plain thing holds nothing and carries nothing; a thing moved whole holds or carries something", () => {
    expect(plainStack(plain)).toBe(true);
    expect(plainStack({ item: "minnow", n: 5 })).toBe(true);
    expect(plainStack({ item: "can", n: 1, water: 0 })).toBe(true);
    expect(plainStack({ item: "can", n: 1, water: 3 })).toBe(false);
    expect(plainStack({ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } })).toBe(false);
    for (const s of [plus, opted, gemmed]) { expect(plainStack(s)).toBe(false); expect(wholeStack(s)).toBe(true); }
    expect(wholeStack(plain)).toBe(false);
    expect(wholeStack({ item: "can", n: 1, water: 0 })).toBe(true);
    expect(plainStack(null)).toBe(false);
    expect(wholeStack(null)).toBe(false);
  });
  it("a stall and the notice board do not count it, nor take it", () => {
    const bag: Purse["bag"] = [plus, plain, gemmed, null];
    expect(plainIn(bag, "pick")).toBe(1);
    const left = takePlain(bag, "pick", 1);
    expect(left[0]).toEqual(plus);
    expect(left[1]).toBeNull();
    expect(left[2]).toEqual(gemmed);
  });
  it("the yard's jar does not take it", () => {
    // (the jar takes no tool at all; a forged thing of a kind it does take would be refused the same way)
    expect(mayDrop({ item: "minnow", n: 1 })).toBe(true);
    expect(mayDrop({ ...({ item: "minnow", n: 1 } as Stack), plus: 1 })).toBe(false);
  });
  it("the uncle's relatives do not take it to sell: what it carries would be lost", () => {
    const purse: Purse = { ...newPurse(), bag: [plus, plain, null, null, null, null, null, null, null, null] };
    expect(leave(purse, 0, 1, NOW)).toEqual({ ok: false, why: "unwanted" });
    const left = leave(purse, 1, 1, NOW);
    expect(left.ok).toBe(true);
  });
  it("a deal and the storage box carry it whole, in a slot of its own", () => {
    const whole = tool("rod", 7, ["rdBait", "rdCalm"], ["wind"]);
    const into = push([{ item: "rod", n: 1 }, null, null], [whole]);
    expect(into).not.toBeNull();
    expect(into![0]).toEqual({ item: "rod", n: 1 });
    expect(into![1]).toEqual(whole);
    expect(push([{ item: "rod", n: 1 }], [whole])).toBeNull();
    expect(fits([null, null], whole)).toBe(1);
    expect(fits([{ item: "minnow", n: 1 }], whole)).toBe(0);
    // a plain tool goes as it always did
    expect(push(put([null, null], "minnow", 3), [{ item: "minnow", n: 2 }])![0]).toEqual({ item: "minnow", n: 5 });
  });
});

describe("what an option does only so many times", () => {
  const quake = tool("pick", 10, ["pkPeek", "pkCrumb", "pkQuake"]), fresh = tool("pick", 3, ["pkFresh"]);
  it("is counted in the purse by the day, the member's whichever tool it was used with", () => {
    let purse: Pick<Purse, "powers"> = {};
    expect(powerLeft(purse, "pkQuake", NOW)).toBe(10);
    for (let i = 0; i < 10; i++) {
      const d = usePower(purse, quake, "pkQuake", NOW);
      if (!d.ok) throw new Error("refused");
      expect(d.left).toBe(9 - i);
      purse = d.purse;
    }
    expect(powerUsed(purse, "pkQuake", NOW)).toBe(10);
    expect(usePower(purse, quake, "pkQuake", NOW)).toEqual({ ok: false, why: "spent" });
    // another pick with the same option shares the count
    expect(usePower(purse, tool("pick", 10, ["pkSteady", "pkLoose", "pkQuake"]), "pkQuake", NOW)).toEqual({ ok: false, why: "spent" });
    // a new day (from dawn) begins it again
    const tomorrow = NOW + 24 * HOUR;
    expect(dayOf(tomorrow)).toBe(dayOf(NOW) + 1);
    expect(powerLeft(purse, "pkQuake", tomorrow)).toBe(10);
    expect(usePower(purse, quake, "pkQuake", tomorrow).ok).toBe(true);
    // and it is kept apart from the gifts' counts
    expect(Object.keys(purse)).toEqual(["powers"]);
  });
  it("a meal's hours for the first pool's: the next meal begins it again", () => {
    let purse: Pick<Purse, "powers"> = {};
    for (let i = 0; i < 10; i++) { const d = usePower(purse, fresh, "pkFresh", NOW); if (!d.ok) throw new Error("refused"); purse = d.purse; }
    expect(usePower(purse, fresh, "pkFresh", NOW)).toEqual({ ok: false, why: "spent" });
    expect(powerLeft(purse, "pkFresh", NOW + 6 * HOUR)).toBe(10);
  });
  it("is refused of a tool that has not the option, or of an option that is not counted", () => {
    expect(usePower({}, tool("pick", 10), "pkQuake", NOW)).toEqual({ ok: false, why: "none" });
    expect(usePower({}, tool("pick", 10, ["pkPeek", "pkCrumb", "pkTwin"]), "pkQuake", NOW)).toEqual({ ok: false, why: "none" });
    expect(usePower({}, tool("pick", 3, ["pkPeek"]), "pkPeek", NOW)).toEqual({ ok: false, why: "none" });
    expect(usePower({}, null, "pkQuake", NOW)).toEqual({ ok: false, why: "none" });
    expect(powerLeft({}, "pkPeek", NOW)).toBe(0);
  });
  it("believes only a count of the stretch it is asked about, kept rightly", () => {
    const k = dayOf(NOW);
    expect(powerUsed({ powers: { pkQuake: { k, n: 4 } } }, "pkQuake", NOW)).toBe(4);
    expect(powerUsed({ powers: { pkQuake: { k: k - 1, n: 4 } } }, "pkQuake", NOW)).toBe(0);
    expect(powerUsed({ powers: { pkQuake: { k, n: Number.NaN } } }, "pkQuake", NOW)).toBe(0);
    expect(powerUsed({ powers: [] as unknown as Purse["powers"] }, "pkQuake", NOW)).toBe(0);
    expect(powerUsed({ powers: { pkQuake: "4" as unknown as { k: number; n: number } } }, "pkQuake", NOW)).toBe(0);
  });
  it("every counted option's id is one of its tool's", () => {
    for (const id of OPTION_IDS as OptionId[]) if (powerRule(id)) expect(OPTIONS[id].tools.length).toBeGreaterThan(0);
  });
});
