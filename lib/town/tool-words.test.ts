import { afterEach, describe, expect, it } from "vitest";
import { countWords, gemDoes, optionDoes, setGemWords } from "./tool-words";
import { ELEMENTS, GEM_FX, OPTIONS, OPTION_IDS, TOOL_KINDS, optN } from "./tools";

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
    expect(optionDoes("pkQuake").en).toContain(`${OPTIONS.pkQuake.use.n} a day`);
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
  afterEach(() => setGemWords(() => null));
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
  it("the older tools: the wind's line is the same for every tool; the rest is said by whoever builds what they do", () => {
    expect(gemDoes("rod", "wind", 1)).toEqual(gemDoes("pick", "wind", 1));
    expect(gemDoes("hoe", "wind", 2)!.en).toContain("15%");
    setGemWords((kind, element, level) => (kind === "rod" && element === "fire" ? { th: `ไฟ ${level}`, en: `fire ${level}` } : null));
    expect(gemDoes("rod", "fire", 2)).toEqual({ th: "ไฟ 2", en: "fire 2" });
    expect(gemDoes("hoe", "fire", 2)).toBeNull();
    expect(gemDoes("pick", "fire", 1)!.en).toMatch(/swings/);
  });
});
