import { describe, expect, it } from "vitest";
import { deedFor, ownerOf, pick, see, yieldOf, type Bed, type Plant, type Plot } from "./farm";
import { giantPull, gripOf, needsOf } from "./giant-pull";
import { FIT_LOW, FIT_TOP, SIZES, fitOf, growFrame, growPlant, saleNow, saleOf, seedsFor, sizeFor, sizeOf, swellOf, waitOf } from "./giant-sizes";
import { CROPS } from "./items";
import { heldIn } from "./pouches";
import { GRADES, gradeOf } from "./quality";
import { GOLD, goldChance, goldOf, harvestOf, qualityNow, turnedGold, wholeQuality } from "./quality-plant";
import { HOUR, newPurse, type Purse } from "./trade";
import { bedCorner, bedOf } from "./world";

const NOON = Date.parse("2026-10-20T12:00:00+07:00");
const [cx, cy] = bedCorner(0), k = (dx: number, dy: number) => `${cx + dx},${cy + dy}`, ROOT = k(3, 3);
/** A round settled ahead of every moment here: each bar at `ceiling` percent, the floor raised by `narrow` (0 to 20). */
const round = (ceiling: number, narrow = 0) => ({ at: NOON + 9_000 * HOUR, span: 100, area: [ceiling, ceiling, ceiling, ceiling] as [number, number, number, number], nar: [narrow * 5, narrow * 5, 0] as [number, number, number] });
const ripe = (more: Partial<Plant> = {}): Plant => ({ by: "me", crop: "pumpkin", sown: NOON - CROPS.pumpkin.hours * HOUR, boost: 0, watered: 0, fed: 0, guard: NOON + 9_000 * HOUR, cured: 0, picked: 0, pickedAt: 0, q: round(100), ...more } as Plant);
const whole = () => Array.from({ length: 49 }, (_, i) => k(i % 7, Math.floor(i / 7)));
const bedWith = (p: Plant = ripe()): Record<string, Plot> => ({ ...Object.fromEntries(whole().map((c) => [c, { soil: "tilled", plant: null } as Plot])), [ROOT]: { soil: "tilled", plant: p } });
const seeds = (n: number): Purse => ({ ...newPurse(), bag: [{ item: "seedPumpkin", n }, ...Array(9).fill(null)] } as Purse);
const empty = { ...newPurse(), bag: Array(10).fill(null) } as Purse;
const keeping: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
const ask = (plots: Record<string, Plot>, n: number, purse = seeds(9), owner: string | null = "me", at = NOON) => growPlant(ROOT, plots, n, "me", owner, keeping, purse, at);
const grown = (n: number, more: Partial<Plant> = {}): Plant => ripe({ giant: true, root: ROOT, footprint: [ROOT], size: { n, at: NOON - waitOf("pumpkin", n) * HOUR, until: NOON, plain: true }, ...more });
const at = (p: Plant): Plot => ({ soil: "tilled", plant: p });
const must = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw Error(JSON.stringify(d)); return d as Extract<T, { ok: true }>; };

describe("the steps of a plant grown over its ground", () => {
  it("goes up one side at a time, to the whole bed", () => {
    expect(SIZES.map((s) => s.n)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(sizeFor(69)).toBeNull();
    expect(sizeFor(70)?.n).toBe(2);
    expect(sizeFor(99)?.n).toBe(6);
    expect(sizeFor(100)?.n).toBe(7);
  });
  it("is never larger than the next step, at any Quality", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const top = n * (FIT_TOP[n] ?? 1), nextLeast = (n + 1) * FIT_LOW;
      expect(top).toBeLessThan(nextLeast);
      for (let q = 0; q <= 100; q++) expect(n * fitOf(q, n)).toBeLessThan(nextLeast);
    }
  });
  it("grows a little with Quality inside a step", () => {
    expect(fitOf(78, 3)).toBeCloseTo(FIT_LOW);
    expect(fitOf(84, 3)).toBeGreaterThan(fitOf(80, 3));
    expect(fitOf(100, 7)).toBeLessThanOrEqual(FIT_TOP[7]);
  });
  it("takes one seed a row", () => {
    expect(seedsFor(7)).toBe(6);
    expect(seedsFor(7, 2)).toBe(5);
    expect(seedsFor(2)).toBe(1);
  });
  it("pays more for each plot the larger it is", () => {
    expect(saleOf("pumpkin", 7, 3)).toBe(Math.floor(49 * 2 * 110 * 3 * GRADES[3].pays));
    expect(saleOf("pumpkin", 2, 0)).toBe(440);
    for (const n of [3, 4, 5, 6, 7]) expect(saleOf("carrot", n, 2) / (n * n)).toBeGreaterThan(saleOf("carrot", n - 1, 2) / ((n - 1) * (n - 1)));
  });
});

describe("asking a ripe plant to grow", () => {
  it("finds the square inside the bed and says what stands in the way", () => {
    const f = growFrame(ROOT, 3, bedWith())!;
    expect(f.cells).toHaveLength(9);
    expect(f.cells).toContain(ROOT);
    expect(f.blocked.size).toBe(0);
    const near = k(2, 2), wide = growFrame(ROOT, 7, { ...bedWith(), [near]: { soil: "cleared", plant: null } })!;
    expect(wide.cells).toHaveLength(49);
    expect(wide.blocked.get(near)).toBe("soil");
    for (const c of growFrame(ROOT, 7, bedWith())!.cells) expect(bedOf(...(c.split(",").map(Number) as [number, number]))).toBe(bedOf(cx, cy));
  });
  it("takes the ground at once, one seed a row, and holds its bed until it has swollen", () => {
    const did = must(ask(bedWith(), 3));
    expect(Object.keys(did.plots)).toHaveLength(9);
    for (const plot of Object.values(did.plots)) {
      expect(plot.plant!.root).toBe(ROOT);
      expect(plot.plant!.giant).toBe(true);
      expect(plot.plant!.size).toEqual({ n: 3, at: NOON, until: NOON + waitOf("pumpkin", 3) * HOUR, plain: true });
    }
    expect(heldIn(did.purse, "seedPumpkin")).toBe(7);
    expect(did.bed.tended).toBe(NOON + waitOf("pumpkin", 3) * HOUR);
    expect(ownerOf(did.bed, true, NOON + 10 * 24 * HOUR)).toBe("me");
    expect(ownerOf(did.bed, true, NOON + waitOf("pumpkin", 3) * HOUR + 97 * HOUR)).toBeNull();
  });
  it("lets a rank-7 giant grow on as a 2x2, and one grown already take a further step", () => {
    const seven = ripe({ giant: true, root: ROOT, footprint: [ROOT, k(4, 3), k(3, 4), k(4, 4)] });
    const did = must(ask({ ...bedWith(seven), [k(4, 3)]: at(seven), [k(3, 4)]: at(seven), [k(4, 4)]: at(seven) }, 4));
    expect(did.plots[ROOT].plant!.size).toMatchObject({ n: 4, plain: false });
    expect(heldIn(did.purse, "seedPumpkin")).toBe(7);
    const on = must(ask(bedWith(grown(3)), 5));
    expect(on.plots[ROOT].plant!.size).toMatchObject({ n: 5, plain: true });
  });
  it("refuses a stranger, a plant not ripe or not good enough, ground not ready, too few seeds, a plant being pulled", () => {
    expect(ask(bedWith(), 2, seeds(9), "them")).toEqual({ ok: false, why: "theirs" });
    expect(ask(bedWith(), 2, seeds(9), null)).toEqual({ ok: false, why: "theirs" });
    expect(ask(bedWith(), 2, seeds(9), "me", NOON - 48 * HOUR)).toEqual({ ok: false, why: "unripe" });
    expect(ask(bedWith(), 1)).toEqual({ ok: false, why: "none" });
    expect(ask(bedWith(), 8)).toEqual({ ok: false, why: "none" });
    expect(ask(bedWith(ripe({ crop: "kangkong" as never })), 2)).toEqual({ ok: false, why: "none" });
    expect(ask(bedWith(ripe({ q: round(69) })), 2)).toEqual({ ok: false, why: "quality" });
    expect(ask(bedWith(ripe({ q: round(95) })), 7)).toEqual({ ok: false, why: "quality" });
    expect(ask({ ...bedWith(), [k(4, 4)]: { soil: "cleared", plant: null }, [k(2, 2)]: { soil: "cleared", plant: null } }, 7)).toEqual({ ok: false, why: "room" });
    expect(ask({ ...bedWith(), [k(0, 0)]: at(ripe({ sown: NOON - HOUR })) }, 7)).toEqual({ ok: false, why: "room" });
    expect(ask(bedWith(), 7, seeds(5))).toEqual({ ok: false, why: "seeds" });
    expect(ask(bedWith(grown(3, { pull: { by: "me", at: NOON, crew: ["me"], go: 0, hits: {}, paid: [], out: 0, bonus: 0, helped: [] } })), 4)).toEqual({ ok: false, why: "busy" });
    expect(ask(bedWith(grown(3, { pull: { by: "me", at: NOON, crew: ["me"], go: 0, hits: {}, paid: [], out: NOON, bonus: 0, helped: [] } })), 4)).toEqual({ ok: false, why: "busy" });
    // (nor while it swells, nor to a size it has)
    expect(ask(bedWith(grown(3, { size: { n: 3, at: NOON, until: NOON + HOUR, plain: true } })), 4)).toEqual({ ok: false, why: "unripe" });
    expect(ask(bedWith(grown(3)), 3)).toEqual({ ok: false, why: "none" });
  });
  it("reads the ceiling it was given, as the inspector does", () => {
    expect(qualityNow(ripe(), NOON).range.hi).toBe(100);
    expect(qualityNow(ripe({ q: round(78) }), NOON).range.hi).toBe(76);
  });
});

describe("a plant swelling over its ground", () => {
  const swelling = () => grown(3, { size: { n: 3, at: NOON - HOUR, until: NOON + 100 * HOUR, plain: true } });
  it("is not ripe, stands at its fourth stage and wants nothing until it has done", () => {
    const plot = at(swelling()), seen = see(ROOT, plot, NOON);
    expect(seen.ripe).toBe(false);
    expect(seen.stage).toBe(4);
    expect(seen.pest).toBe(false);
    expect(see(ROOT, plot, NOON + 101 * HOUR).ripe).toBe(true);
    for (const hand of ["can", "compost", "pollenBrush", null] as const) expect(deedFor(ROOT, plot, hand, "me", NOON)).toBeNull();
    // (the hoe may still dig it out; swollen, it is pulled and not picked)
    expect(deedFor(ROOT, plot, "hoe", "me", NOON)).toBe("uproot");
    expect(deedFor(ROOT, plot, null, "me", NOON + 101 * HOUR)).toBeNull();
    expect(swellOf(plot.plant!, NOON)).toBeLessThan(0.02);
    expect(swellOf(plot.plant!, NOON + 101 * HOUR)).toBe(1);
  });
  it("cannot be pulled before it has done", () => {
    expect(giantPull("open", ROOT, at(swelling()), "me", true, empty, NOON)).toEqual({ ok: false, why: "none" });
    expect(giantPull("dig", ROOT, at(swelling()), "me", true, empty, NOON)).toEqual({ ok: false, why: "none" });
  });
});

describe("pulling it out, and what it comes to", () => {
  it("takes more hands, and stronger pulls, the larger it is", () => {
    for (const s of SIZES) expect(needsOf(grown(s.n)).hands).toBe(sizeOf(s.n)!.hands);
    expect(needsOf(ripe({ giant: true })).hands).toBe(1);
    expect(needsOf(grown(7)).crew).toBeGreaterThanOrEqual(6);
    // (three pulling together on one half-swing are worth 3 at 5x5, but 1 at 7x7, which wants four)
    const three = { a: [0], b: [0], c: [0] };
    expect(gripOf(three, needsOf(grown(5))).done).toBe(3);
    expect(gripOf(three, needsOf(grown(7))).done).toBe(1);
    // (a rank-7 giant as it was: two together are worth 3)
    expect(gripOf({ a: [0], b: [0] }).done).toBe(3);
  });
  it("will not start short of hands; a rank-7 giant is pulled alone as ever", () => {
    let plot = must(giantPull("open", ROOT, at(grown(4)), "me", true, empty, NOON + 1000)).plot;
    expect(giantPull("go", ROOT, plot, "me", true, empty, NOON + 2000)).toEqual({ ok: false, why: "hands" });
    for (const who of ["a", "b"]) plot = must(giantPull("join", ROOT, plot, who, false, empty, NOON + 1500)).plot;
    must(giantPull("go", ROOT, plot, "me", true, empty, NOON + 2000));
    const seven = must(giantPull("open", ROOT, at(ripe({ giant: true, root: ROOT, footprint: [ROOT] })), "me", true, empty, NOON + 1000)).plot;
    must(giantPull("go", ROOT, seven, "me", true, empty, NOON + 2000));
  });
  it("holds no more than its crew", () => {
    let plot = must(giantPull("open", ROOT, at(grown(7)), "me", true, empty, NOON + 1000)).plot;
    for (const who of ["a", "b", "c", "d", "e", "f", "g"]) plot = must(giantPull("join", ROOT, plot, who, false, empty, NOON + 1500)).plot;
    expect(giantPull("join", ROOT, plot, "h", false, empty, NOON + 1500)).toEqual({ ok: false, why: "full" });
  });
  it("sells whole once at the pick, and pays nothing when dug out alone", () => {
    const out = at(grown(3, { pull: { by: "me", at: NOON, crew: ["me", "a", "b"], go: NOON, hits: {}, paid: [], out: NOON + 1000, bonus: 0, helped: [] } }));
    const did = must(pick(ROOT, empty, out, true, null, NOON + 2000, undefined, "me"));
    const sale = saleNow(ROOT, out.plant!, NOON + 2000);
    expect(sale).toBeGreaterThan(0);
    expect(did.purse.coins).toBe(empty.coins + sale);
    expect(did.plot.plant).toBeNull();
    expect(yieldOf(ROOT, out.plant!)).toBe(2);
    const dug = must(giantPull("dig", ROOT, at(grown(3)), "me", true, empty, NOON + 1000));
    expect(dug.plot.plant!.pull!.alone).toBe(true);
    expect(must(pick(ROOT, empty, dug.plot, true, null, NOON + 2000, undefined, "me")).purse.coins).toBe(empty.coins);
    // (nobody but its keeper digs, and a giant of rank 7 is not dug: it may be pulled alone)
    expect(giantPull("dig", ROOT, at(grown(3)), "them", false, empty, NOON + 1000)).toEqual({ ok: false, why: "theirs" });
    expect(giantPull("dig", ROOT, at(ripe({ giant: true, root: ROOT, footprint: [ROOT] })), "me", true, empty, NOON + 1000)).toEqual({ ok: false, why: "none" });
  });
  it("is not picked before it comes out, nor sold twice with a bearing more", () => {
    expect(pick(ROOT, empty, at(grown(3)), true, null, NOON + 2000, undefined, "me")).toEqual({ ok: false, why: "unripe" });
    const sung = at(grown(3, { more: 2, pull: { by: "me", at: NOON, crew: ["me"], go: NOON, hits: {}, paid: [], out: NOON + 1000, bonus: 0, helped: [] } } as Partial<Plant>));
    expect(must(pick(ROOT, empty, sung, true, null, NOON + 2000, undefined, "me")).plot.plant).toBeNull();
  });
  it("keeps a rank-7 giant's six times the fruits when it grows on", () => {
    expect(yieldOf(ROOT, grown(3, { size: { n: 3, at: NOON - HOUR, until: NOON, plain: false } }))).toBe(12);
  });
});

describe("the gold mutation", () => {
  it("has no chance until the floor is raised past ten, and five in a hundred at the top", () => {
    expect(goldChance(0)).toBe(0);
    expect(goldChance(GOLD.from)).toBe(0);
    expect(goldChance(11)).toBeCloseTo(0.005);
    expect(goldChance(20)).toBeCloseTo(0.05);
  });
  it("is shown only for the round it turned in", () => {
    expect(turnedGold({ gold: 0, picked: 0 })).toBe(true);
    expect(turnedGold({ gold: 0, picked: 1 })).toBe(false);
    expect(turnedGold({ picked: 0 })).toBe(false);
  });
  it("comes about one in twenty at the top, the same however often it is asked, a grade up and twice the sale", () => {
    let turned = 0;
    for (let i = 0; i < 1000; i++) {
      const p = ripe({ sown: NOON - CROPS.pumpkin.hours * HOUR - i * 1000, q: round(100, 20) });
      const yes = goldOf(ROOT, p, NOON);
      expect(goldOf(ROOT, p, NOON + 5000)).toBe(yes);
      expect(goldOf(ROOT, { ...p, q: round(100, 0) }, NOON)).toBe(false);
      if (!yes) continue;
      turned++;
      // (every fruit a grade up: from a range of 90 to 100 they all come Excellent)
      for (const v of harvestOf(ROOT, p, 6, NOON).values) expect(v).toBeGreaterThanOrEqual(95);
      const big: Plant = { ...p, giant: true, root: ROOT, footprint: [ROOT], size: { n: 3, at: NOON - HOUR, until: NOON, plain: true } };
      expect(saleNow(ROOT, big, NOON)).toBe(saleOf("pumpkin", 3, gradeOf(wholeQuality(ROOT, big, NOON))) * 2);
    }
    expect(turned).toBeGreaterThan(20);
    expect(turned).toBeLessThan(90);
  });
});
