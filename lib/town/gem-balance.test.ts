import { describe, expect, it } from "vitest";
import { canFx, cookFx, hoeFx, netFx, rodFx, stirsWith } from "./forged";
import { toolPaid } from "./forged-keep";
import { darkSoil } from "./gem-soil";
import { MINING, mine, mineOf, pickSwingMs } from "./mining";
import { STAG_PACE } from "./riding";
import { dayOf, spend, staminaOf } from "./stamina";
import { ELEMENTS, FORGE, axeChops, gemStamina, toolWord, walkPace, type Element } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import { veinMods } from "./vein";

const NOW = Date.UTC(2026, 9, 11, 6);
const tool = (item: Stack["item"], gems: Element[] = [], plus = 10): Stack => ({ item, n: 1, plus, gems });
const purse = (held: Stack): Purse => ({ ...newPurse(), bag: [held, ...Array(15).fill(null)], hand: held.item, handAt: 0, stamina: { day: dayOf(NOW), left: 100 } });

describe("gems change the work loop without replacing its gates", () => {
  it("a second fire gem improves one-hit mining cadence and standard tree chopping", () => {
    expect([pickSwingMs(tool("pick")), pickSwingMs(tool("pick", ["fire"])), pickSwingMs(tool("pick", ["fire", "fire"]))]).toEqual([320, 256, 208]);
    expect(pickSwingMs(tool("pick", ["fire", "fire"]))).toBeGreaterThanOrEqual(MINING.swing.least);
    expect([axeChops(tool("axe")), axeChops(tool("axe", ["fire"])), axeChops(tool("axe", ["fire", "fire"]))]).toEqual([4, 3, 2]);
    expect(canFx(tool("can", ["fire"])).more - canFx(tool("can")).more).toBe(6);
  });

  it("clean play saves effort with water, and earth remains the stamina specialist", () => {
    const pay = (gems: Element[]) => {
      const s = tool("hoe", gems); let p = purse(s);
      for (let i = 0; i < 20; i++) p = toolPaid(p, spend(p, 2, NOW), NOW, s, hoeFx(s), "hoFresh");
      return 100 - staminaOf(p, NOW) + (p.toolOwed ?? 0);
    };
    expect(pay([])).toBeCloseTo(40);
    expect(pay(["water"])).toBeCloseTo(26);
    expect(pay(["earth"])).toBeCloseTo(20);
    expect(pay(["earth", "water"])).toBeCloseTo(40 / FORGE.cap);
    const empty = purse(tool("hoe", ["water"]));
    expect(toolPaid(empty, empty, NOW, empty.bag[0], hoeFx(empty.bag[0]), "hoFresh")).toBe(empty);
  });

  it("water and earth save the vein-opening cost as well as the broken rock", () => {
    for (const [gems,effort] of [[[],4],[["water"],2.6],[["earth"],2],[["water","earth"],4/3]] as [Element[],number][]) {
      const p = purse(tool("pick", gems));
      const did = mine(p, { now: NOW, floor: 5, rock: 0, at: [11,10], swings: 99, rocks: [{ id: 0, x: 10, y: 10 }], standing: () => true, salt: "gem-balance", day: dayOf(NOW), today: { way: null, crystal: null }, element: "fire", points: 0, fate: () => ({ kind: "vein", gem: false, seed: 1234 }) });
      expect(did.ok && did.done === true && did.vein !== null).toBe(true);
      if (did.ok && did.done === true) expect(100 - staminaOf(did.purse, NOW) + mineOf(did.purse).owed).toBeCloseTo(effort);
    }
  });

  it("ice changes motion and mining obstacles, lightning retains its success and room conditions", () => {
    expect(rodFx(tool("rod", ["ice"])).pace / rodFx(tool("rod")).pace).toBeCloseTo(0.6);
    expect(veinMods(tool("pick", ["ice"]), false).cross).toBe(3);
    expect([hoeFx(tool("hoe", ["lightning"])).next, netFx(tool("bugNet", ["lightning"])).twin, cookFx(tool("pot", ["lightning"])).helping]).toEqual([0.35, 0.35, 0.35]);
  });

  it("wind stacks with a stag and changes bite waits, net recovery and real cooking stirs", () => {
    expect(STAG_PACE * walkPace(toolWord(tool("rod", ["wind"])))).toBeCloseTo(2.9);
    expect(STAG_PACE * walkPace(toolWord(tool("rod", ["wind", "wind"])))).toBeCloseTo(3.3);
    expect(rodFx(tool("rod", ["wind"])).quick).toBeCloseTo(0.35);
    expect(netFx(tool("bugNet", ["wind"])).again).toBeCloseTo(0.65);
    expect(netFx(tool("bugNet", ["wind"])).reach).toBe(2);
    expect(stirsWith(12, cookFx(tool("pot", ["wind"])))).toBe(8);
    expect(stirsWith(12, cookFx(tool("pot", ["wind", "fire"])))).toBeGreaterThanOrEqual(4);
  });

  it("light helps after the hoe's stones are gone and supplies actual mining strikes", () => {
    expect(hoeFx(tool("hoe", ["light"])).band / hoeFx(tool("hoe")).band).toBeCloseTo(1.35);
    expect(hoeFx(tool("hoe", ["light", "light"])).band).toBeGreaterThan(hoeFx(tool("hoe", ["light"])).band);
    expect(veinMods(tool("pick", ["light"]), false).strikes - veinMods(tool("pick"), false).strikes).toBe(4);
    expect(rodFx(tool("rod", ["light"])).strike / rodFx(tool("rod")).strike).toBeCloseTo(1.35);
    expect(netFx(tool("bugNet", ["light"])).ring / netFx(tool("bugNet")).ring).toBeCloseTo(1.35);
  });

  it("dark soil's daily allowance belongs to the member and survives swapping tools", () => {
    let p = purse(tool("hoe", ["dark"]));
    for (let i = 0; i < 25; i++) p = darkSoil(p, tool("hoe", i % 2 ? ["dark", "dark"] : ["dark"]), NOW).purse;
    expect(p.darkSoil).toEqual({ day: dayOf(NOW), n: 20 });
    expect(p.bag.find(s => s?.item === "compost")?.n).toBe(20);
    expect(darkSoil(p, tool("hoe", ["dark"]), NOW).n).toBe(0);
    expect(darkSoil(p, tool("hoe", ["dark"]), NOW + 86_400_000).n).toBe(1);
    const full = { ...purse(tool("hoe", ["dark"])), bag: Array.from({ length: 16 }, (): Stack => ({ item: "log", n: 999 })) };
    expect(darkSoil(full, tool("hoe", ["dark"]), NOW)).toEqual({ purse: full, n: 0 });
    expect(darkSoil(p, tool("hoe"), NOW)).toEqual({ purse: p, n: 0 });
  });

  it("all legal mixed and matching sockets respect effort and cooking caps", () => {
    for (const a of ELEMENTS) for (const b of ELEMENTS) {
      const s = tool("pot", [a, b]);
      expect(gemStamina(s)).toBeLessThanOrEqual(1 - 1 / FORGE.cap + 1e-12);
      expect(stirsWith(30, cookFx(s))).toBeGreaterThanOrEqual(10);
    }
  });
});
