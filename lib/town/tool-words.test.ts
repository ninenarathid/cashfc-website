import { describe, expect, it } from "vitest";
import { OLD_FX } from "./forged";
import type { ItemId } from "./items";
import { cardOf, countWords, gemDoes, nextOf, optionDoes } from "./tool-words";
import { BUILT, ELEMENTS, FORGE, GEM_FX, OPTIONS, OPTION_IDS, TOOL_KINDS, optN } from "./tools";
import type { Stack } from "./trade";

describe("what an option does, in a line (the smith's cards)", () => {
  it("every option has a line in both languages, and no two say the same", () => {
    const seen = new Set<string>();
    for (const id of OPTION_IDS) {
      const w = optionDoes(id);
      expect(w.th.length).toBeGreaterThan(8);
      expect(w.en.length).toBeGreaterThan(8);
      expect(w.th).not.toMatch(/undefined|NaN/);
      expect(w.en).not.toMatch(/undefined|NaN/);
      seen.add(w.th); seen.add(w.en);
    }
    expect(seen.size).toBe(OPTION_IDS.length * 2);
  });
  it("a line's numbers are the registry's: a knob turned there turns the words", () => {
    expect(optionDoes("pkSteady").en).toContain(String(optN("pkSteady", "strikes")));
    expect(optionDoes("axKeen").th).toContain(String(optN("axKeen", "chops")));
    expect(optionDoes("pkQuake").en).toContain(`${OPTIONS.pkQuake.use?.n} a day`);
    expect(optionDoes("rdQuick").en).toContain("15%");
    expect(optionDoes("ckBrisk").th).toContain("25%");
    for (const id of OPTION_IDS) {
      const use = (OPTIONS[id] as { use?: { n: number } }).use;
      // (what is counted says its count)
      if (use && use.n > 1) expect(`${optionDoes(id).en} ${optionDoes(id).th}`).toContain(String(use.n));
    }
  });
  it("a counted option's count has words of its own", () => {
    expect(countWords("pkQuake")).toEqual({ th: "วันละ 10 ครั้ง", en: "10 a day" });
    expect(countWords("cnFull")).toEqual({ th: "วันละ 1 ครั้ง", en: "once a day" });
    expect(countWords("pkFresh")?.en).toBe("the first 10 of a meal's hours");
    expect(countWords("pkPeek")).toBeNull();
  });
});

describe("what a gem does in a tool, in a line (said only on the card of a tool it is set in)", () => {
  it("the pick and the axe: every element at every level, each level saying more than the last or the same", () => {
    for (const kind of ["pick", "axe"] as const) for (const e of ELEMENTS) {
      const lines = [1, 2, 3, 4].map((l) => gemDoes(kind, e, l));
      for (const w of lines) {
        expect(w).not.toBeNull();
        expect(w!.th.length).toBeGreaterThan(6);
        expect(w!.en.length).toBeGreaterThan(6);
        expect(`${w!.th} ${w!.en}`).not.toMatch(/undefined|NaN/);
      }
      // (a level that changes a number changes the words: fire's four shares are four lines)
      if (e === "fire") expect(new Set(lines.map((w) => w!.en)).size).toBe(4);
    }
    expect(gemDoes("pick", "fire", 1)!.en).toContain(String(Math.round(GEM_FX.fire.pick.fewer[0] * 100)));
    expect(gemDoes("axe", "light", 4)!.en).toMatch(/whole map/);
    expect(gemDoes("pick", "light", 1)!.en).toContain(String(GEM_FX.light.pick.glint[0]));
  });
  it("with no gem set there is nothing to say", () => {
    for (const kind of TOOL_KINDS) for (const e of ELEMENTS) expect(gemDoes(kind, e, 0)).toBeNull();
  });
  it("the older tools: every gem the smith will set in one has a line, at both levels a first-tier tool reaches, from the numbers its game reads", () => {
    for (const kind of TOOL_KINDS) for (const e of BUILT[kind].gems) for (const level of [1, 2]) {
      const w = gemDoes(kind, e, level);
      expect(w, `${kind} ${e} ${level}`).not.toBeNull();
      expect(w!.th.length).toBeGreaterThan(6);
      expect(w!.en.length).toBeGreaterThan(6);
      expect(`${w!.th} ${w!.en}`).not.toMatch(/undefined|NaN/);
    }
    expect(gemDoes("rod", "wind", 1)).toEqual(gemDoes("pick", "wind", 1));
    expect(gemDoes("hoe", "wind", 2)!.en).toContain("15%");
    expect(gemDoes("rod", "fire", 1)!.en).toContain(String(Math.round(OLD_FX.fire.rod.tires[0] * 100)));
    expect(gemDoes("rod", "fire", 1)!.en).toMatch(/tires/);
    expect(gemDoes("can", "fire", 2)!.en).toContain(String(OLD_FX.fire.can.more[1]));
    expect(gemDoes("bugNet", "light", 1)!.en).toContain(String(OLD_FX.light.bugNet.seen[0]));
    // the pot, the pan and the grill say the same
    for (const e of BUILT.pot.gems) expect(gemDoes("pan", e, 1)).toEqual(gemDoes("pot", e, 1));
  });
});

describe("a tool's own numbers (its card, and what the next level changes)", () => {
  const tool = (item: ItemId, plus = 0, opts: string[] = [], gems: string[] = []): Stack => ({ item, n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts } : {}), ...(gems.length ? { gems } : {}) });
  it("no plus leaves every number of the card as the plus before left it, for any of the nine tools", () => {
    for (const kind of TOOL_KINDS) for (let l = 1; l <= FORGE.top; l++) {
      const was = cardOf(tool(kind, l - 1)).map((x) => x.value.en), is = cardOf(tool(kind, l)).map((x) => x.value.en);
      expect(is.length, kind).toBeGreaterThan(0);
      expect(is, `${kind} +${l}`).not.toEqual(was);
      // (and the forging leaf has something to show before the try)
      const next = nextOf(tool(kind, l - 1));
      expect(next.length, `${kind} +${l}`).toBeGreaterThan(0);
      for (const c of next) expect(c.from.en, `${kind} +${l} ${c.key}`).not.toBe(c.to.en);
    }
  });
  it("the first plus of an axe is a chop fewer, and of a can a watering more", () => {
    expect(nextOf(tool("axe")).find((c) => c.key === "chops")).toMatchObject({ from: { en: "12" }, to: { en: "11" } });
    expect(nextOf(tool("can")).find((c) => c.key === "waterings")).toMatchObject({ from: { en: "8" }, to: { en: "9" } });
  });
  it("a card is the tool as it works: its options and its gem are in the numbers; nothing of what is not forged, or at the top", () => {
    expect(cardOf(tool("axe", 3, ["axKeen"])).find((x) => x.key === "chops")?.value.en).toBe("8");
    expect(cardOf(tool("can", 0, [], ["fire"])).find((x) => x.key === "waterings")?.value.en).toBe("9");
    expect(cardOf({ item: "rodTeak", n: 1 })).toEqual([]);
    expect(cardOf(null)).toEqual([]);
    expect(nextOf(tool("pick", FORGE.top))).toEqual([]);
    expect(nextOf({ item: "worm", n: 3 })).toEqual([]);
    for (const kind of TOOL_KINDS) for (const line of cardOf(tool(kind))) expect(`${line.name.th} ${line.name.en} ${line.value.th} ${line.value.en}`).not.toMatch(/undefined|NaN/);
  });
});
