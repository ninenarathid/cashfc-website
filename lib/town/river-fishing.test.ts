import { describe, expect, it } from "vitest";
import { FISH, ITEMS, MAKES, DISHES } from "./items";
import { oddsOf, starOdds, startFight, warning, FIGHT } from "./fishing";
import { castPattern, currentAt, currentsAt, patternOdds } from "./river-fishing";
import { RIVER_ITEMS, RIVER_FISH, RIVER_MAKES, RIVER_DISHES } from "./river-items";
import { newPurse } from "./trade";
import atlas from "./icon-atlas.json";
import { sources } from "./uses";
import { HINT_IDS } from "./hints";

describe("river fishing", () => {
  it("adds 25 distinct items, all illustrated, and gives every fish a recipe", () => {
    expect(Object.keys(RIVER_ITEMS)).toHaveLength(25);
    for (const id of Object.keys(RIVER_ITEMS)) expect(atlas.icons).toHaveProperty(id);
    const recipes = [...Object.values(RIVER_MAKES), ...Object.values(RIVER_DISHES).map(d => d.recipe!)];
    for (const id of Object.keys(RIVER_FISH)) expect(recipes.some(r => r.needs.some(([need]) => need === id))).toBe(true);
    for (const [id, r] of Object.entries(RIVER_MAKES)) {
      expect(MAKES).toHaveProperty(id);
      for (const [need] of r.needs) expect(ITEMS).toHaveProperty(need);
    }
    for (const id of Object.keys(RIVER_DISHES)) expect(DISHES).toHaveProperty(id);
    const reachable=sources();
    for (const id of Object.keys(RIVER_ITEMS) as Array<keyof typeof RIVER_ITEMS>) expect(reachable.has(id),id).toBe(true);
    for (const id of [...Object.keys(RIVER_MAKES),...Object.keys(RIVER_DISHES)]) expect(HINT_IDS).toContain(id);
  });

  it("keeps the existing town free of regional fish", () => {
    for (let hour = 0; hour < 24; hour++) {
      for (const bait of ["worm", "corn", "loach", "shadeLure"] as const)
        expect(oddsOf(bait, hour, true, true, false, ["after"]).some(o => o.what in RIVER_FISH)).toBe(false);
      expect(starOdds(true, false, ["after"], 3).some(o => o.what in RIVER_FISH)).toBe(false);
    }
  });

  it("makes every regional fish reachable on its own bait and current", () => {
    for (const [id, f] of Object.entries(RIVER_FISH)) {
      const bait = Object.keys(f.baits)[0] as keyof typeof f.baits;
      const odds = oddsOf(bait, f.hours[0][0], true, false, false, f.needs ?? [], f.habitat![0], f.current![0]);
      expect(odds.some(o => o.what === id), id).toBe(true);
      expect(odds.reduce((n, o) => n + o.p, 0)).toBeCloseTo(1);
      expect(odds.filter(o => o.what in FISH).every(o => FISH[o.what as keyof typeof FISH].habitat?.includes(f.habitat![0]))).toBe(true);
    }
    expect(oddsOf("corn", 7, false, false, false, [], "creek", "run").some(o => o.what === "torrentBarb")).toBe(true);
    expect(oddsOf("corn", 7, false, false, false, [], "creek", "eddy").some(o => o.what === "torrentBarb")).toBe(false);
  });

  it("resets repeated bait by position, bait, current or elapsed time", () => {
    const p = newPurse();
    let pattern = castPattern(p, "worm", [150, 140], "run", 100);
    for (let i = 1; i < 20; i++) pattern = castPattern({ ...p, fishingPattern: pattern }, "worm", [150, 140], "run", 100 + i);
    expect(pattern.n).toBe(6);
    const repeated = { ...p, fishingPattern: pattern };
    expect(castPattern(repeated, "corn", [150, 140], "run", 121).n).toBe(1);
    expect(castPattern(repeated, "worm", [151, 140], "run", 121).n).toBe(1);
    expect(castPattern(repeated, "worm", [150, 140], "shelter", 121).n).toBe(1);
    expect(castPattern(repeated, "worm", [150, 140], "run", pattern.at + 900_000).n).toBe(1);
    expect(castPattern(repeated, "worm", [150, 140], "run", 0).n).toBe(1);
  });

  it("reduces rare shares after repetition while preserving a chance and a total of one", () => {
    const odds = oddsOf("loach", 4, false, false, false, [], "creek", "run");
    expect(patternOdds(odds, 3)).toEqual(odds);
    const changed = patternOdds(odds, 4);
    expect(changed.reduce((n, o) => n + o.p, 0)).toBeCloseTo(1);
    const rare = (os: typeof odds) => os.find(o => o.what === "riverLamprey")!.p;
    expect(rare(changed)).toBeGreaterThan(0);
    expect(rare(changed)).toBeLessThan(rare(odds));
    expect(patternOdds([], 4)).toEqual([]);
  });

  it("restricts available pockets and gives a warning without changing fight strength", () => {
    expect(currentsAt("pool")).toEqual(["eddy", "shelter"]);
    expect(currentAt("pool", "shelter", "run")).toBe("shelter");
    const f = startFight("riverLamprey", "good", {}, 31);
    const ahead = { ...f, t: f.surge.from - FIGHT.warn / 2 };
    expect(warning(ahead)).toBe(false);
    expect(warning(ahead, true)).toBe(true);
    expect(warning({ ...ahead, t: f.surge.from - FIGHT.warn - 1 }, true)).toBe(false);
  });
});
