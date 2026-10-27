import { describe, expect, it } from "vitest";
import { PULL, calling, cleanHits, giantPull, gripOf, judgePull, leanAt, peakAt, pullable, pulling, sideOf, worthOf, type GiantPull } from "./giant-pull";
import { deedFor, pick, yieldOf, type Plant, type Plot } from "./farm";
import { CROPS } from "./items";
import { newPurse } from "./trade";
import { staminaOf } from "./stamina";
import { countsOf } from "./line-points";

const t = Date.parse("2026-10-27T20:00:00+07:00"), key = "134,6";
const giant = (more: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: {
  by: "me", crop: "pumpkin", sown: t - CROPS.pumpkin.hours * 3_600_000, boost: 0, watered: 0, fed: 0, guard: t + 86_400_000, cured: 0, picked: 0, pickedAt: 0,
  root: key, footprint: [key, "135,6", "134,7", "135,7"], giant: true, ...more } });
const purse = { ...newPurse(), bag: Array(10).fill(null) };
const ok = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw Error(JSON.stringify(d)); return d as Extract<T, { ok: true }>; };
/** The plot after a run of deeds, each [who, action, at, hits?]. */
function run(plot: Plot, steps: Array<[string, Parameters<typeof giantPull>[0], number, number[]?]>) {
  for (const [who, action, at, hits] of steps) plot = ok(giantPull(action, key, plot, who, who === "me", purse, at, hits ?? [])).plot;
  return plot;
}

describe("the rocking", () => {
  it("leans right first, peaks each half-swing, and is still outside the go", () => {
    const go = t;
    expect(sideOf(0)).toBe(1);
    expect(sideOf(1)).toBe(-1);
    expect(leanAt(go, peakAt(go, 0))).toBeCloseTo(1);
    expect(leanAt(go, peakAt(go, 1))).toBeCloseTo(-1);
    expect(leanAt(go, go + 1000)).toBe(0);
    expect(leanAt(go, peakAt(go, PULL.swings) + 1000)).toBe(0);
  });
  it("judges a press by the nearest peak: the right side inside the window pulls well", () => {
    const go = t;
    expect(judgePull(go, peakAt(go, 0) + 200, 1)).toEqual({ k: 0, good: true, off: 200 });
    expect(judgePull(go, peakAt(go, 0) - 230, 1)?.good).toBe(false);
    expect(judgePull(go, peakAt(go, 0), -1)?.good).toBe(false);
    expect(judgePull(go, peakAt(go, 3) + 10, -1)).toEqual({ k: 3, good: true, off: 10 });
    expect(judgePull(go, go + 500, 1)).toBeNull();
  });
  it("is worth 1 pulled alone and 3 pulled together, never more", () => {
    expect([0, 1, 2, 3, 4].map(worthOf)).toEqual([0, 1, 3, 3, 3]);
    expect(gripOf({ a: [0, 1, 2], b: [1, 2], c: [2] })).toEqual({ done: 1 + 3 + 3, left: PULL.grip - 7 });
  });
  it("takes no half-swing that is not yet, nor one twice", () => {
    expect(cleanHits(t, [2, 0, 2], peakAt(t, 2))).toEqual([0, 2]);
    expect(cleanHits(t, [5], peakAt(t, 2))).toBeNull();
    expect(cleanHits(t, [1.5], peakAt(t, 2))).toBeNull();
    expect(cleanHits(t, [PULL.swings], goEndsAfter())).toBeNull();
  });
});
const goEndsAfter = () => peakAt(t, PULL.swings) + 5000;

describe("the call and the go", () => {
  it("is called only by whoever may pick it, at a ripe giant's root", () => {
    expect(giantPull("open", key, giant(), "you", false, purse, t)).toEqual({ ok: false, why: "theirs" });
    expect(giantPull("open", key, giant({ sown: t }), "me", true, purse, t)).toEqual({ ok: false, why: "none" });
    expect(giantPull("open", "135,6", giant(), "me", true, purse, t)).toEqual({ ok: false, why: "none" });
    expect(pullable(key, giant(), t)).toBe(true);
    const plot = run(giant(), [["me", "open", t]]);
    expect(plot.plant!.pull).toMatchObject({ by: "me", crew: ["me"], go: 0, out: 0 });
    expect(calling(plot.plant!.pull!, t + 1000)).toBe(true);
    expect(giantPull("open", key, plot, "me", true, purse, t + 1000)).toEqual({ ok: false, why: "busy" });
  });
  it("lets three join, once each, and no more; a helper may leave, the caller's leaving ends it", () => {
    let plot = run(giant(), [["me", "open", t], ["a", "join", t + 1], ["b", "join", t + 2]]);
    expect(giantPull("join", key, plot, "a", false, purse, t + 3)).toEqual({ ok: false, why: "in" });
    plot = run(plot, [["c", "join", t + 3]]);
    expect(giantPull("join", key, plot, "d", false, purse, t + 4)).toEqual({ ok: false, why: "full" });
    plot = run(plot, [["b", "leave", t + 5]]);
    expect(plot.plant!.pull!.crew).toEqual(["me", "a", "c"]);
    expect(run(plot, [["me", "leave", t + 6]]).plant!.pull).toBeUndefined();
    expect(giantPull("join", key, plot, "d", false, purse, t + PULL.call + 1)).toEqual({ ok: false, why: "shut" });
  });
  it("is started by the caller only, and nobody joins once it has", () => {
    let plot = run(giant(), [["me", "open", t], ["a", "join", t + 1]]);
    expect(giantPull("go", key, plot, "a", false, purse, t + 2)).toEqual({ ok: false, why: "theirs" });
    plot = run(plot, [["me", "go", t + 2]]);
    expect(pulling(plot.plant!.pull!, t + 3)).toBe(true);
    expect(giantPull("join", key, plot, "b", false, purse, t + 3)).toEqual({ ok: false, why: "shut" });
    expect(giantPull("hits", key, plot, "b", false, purse, t + 9000, [0])).toEqual({ ok: false, why: "crew" });
  });
});

describe("pulling it out", () => {
  const go = t + 10;
  const called = () => run(giant(), [["me", "open", t], ["a", "join", t + 1], ["b", "join", t + 2], ["me", "go", go]]);
  it("comes out alone after the grip's worth of good pulls, and spends a stamina once", () => {
    let plot = run(giant(), [["me", "open", t], ["me", "go", go]]);
    const firsts = Array.from({ length: PULL.grip - 1 }, (_, k) => k);
    let d = ok(giantPull("hits", key, plot, "me", true, purse, peakAt(go, PULL.grip - 2), firsts.slice(0, 5)));
    expect(staminaOf(d.purse, peakAt(go, 4))).toBe(staminaOf(purse, peakAt(go, 4)) - 1);
    d = ok(giantPull("hits", key, d.plot, "me", true, d.purse, peakAt(go, PULL.grip - 2), firsts));
    expect(staminaOf(d.purse, peakAt(go, 4))).toBe(staminaOf(purse, peakAt(go, 4)) - 1);
    expect(d.plot.plant!.pull!.out).toBe(0);
    plot = d.plot;
    d = ok(giantPull("hits", key, plot, "me", true, d.purse, peakAt(go, PULL.grip - 1), [PULL.grip - 1]));
    expect(d.plot.plant!.pull).toMatchObject({ out: peakAt(go, PULL.grip - 1), bonus: 0, helped: [] });
    expect(giantPull("hits", key, d.plot, "me", true, purse, peakAt(go, PULL.grip), [PULL.grip])).toEqual({ ok: false, why: "done" });
  });
  it("comes out sooner together; helpers who pulled well three times each give a fruit more and are credited", () => {
    let plot = called();
    const at = peakAt(go, 9);
    plot = ok(giantPull("hits", key, plot, "a", false, purse, at, [0, 1, 2, 3, 4, 5, 6, 7])).plot;
    plot = ok(giantPull("hits", key, plot, "b", false, purse, at, [0, 1])).plot;
    const d = ok(giantPull("hits", key, plot, "me", true, purse, at, [0, 1, 2, 3, 4, 5, 6, 7]));
    expect(gripOf(d.plot.plant!.pull!.hits).done).toBe(24);
    expect(d.helped).toEqual(["a"]);
    expect(d.plot.plant!.pull).toMatchObject({ out: at, bonus: 1, helped: ["a"] });
  });
  it("is late after the last half-swing and its grace; then called again with the crew kept", () => {
    const plot = called();
    expect(giantPull("hits", key, plot, "a", false, purse, peakAt(go, PULL.swings) + PULL.grace + 1000, [0])).toEqual({ ok: false, why: "late" });
    const again = ok(giantPull("open", key, plot, "me", true, purse, peakAt(go, PULL.swings) + PULL.grace + 1000)).plot.plant!.pull!;
    expect(again).toMatchObject({ crew: ["me", "a", "b"], go: 0, hits: {} });
  });
});

describe("the farm, with a giant", () => {
  const pulled = (bonus: number): GiantPull => ({ by: "me", at: t, crew: ["me"], go: t, hits: {}, paid: [], out: t, bonus, helped: [] });
  it("offers no plain pick until it is pulled out, and a fruit more a helper after", () => {
    expect(deedFor(key, giant(), null, "me", t, "me")).toBeNull();
    expect(pick(key, purse, giant(), true, null, t).ok).toBe(false);
    expect(deedFor(key, giant({ pull: pulled(0) }), null, "me", t, "me")).toBe("pick");
    const plain = yieldOf(key, giant().plant!), more = yieldOf(key, giant({ pull: pulled(2) }).plant!);
    expect(more).toBe(plain + 2);
    expect(pick(key, purse, giant({ pull: pulled(2) }), true, null, t).ok).toBe(true);
  });
  it("gives a helper five points on the helpers' line", () => {
    expect(countsOf({ from: "deed", what: "giant_help", thing: "pumpkin", n: 1, doc: { by: "me" } } as never, "a")).toEqual([{ to: null, line: "helpers", raw: PULL.points }]);
  });
});
