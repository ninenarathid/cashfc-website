import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { movePlant, type Plant, type Plot } from "./farm";
import { syncGarden } from "./gardening";
import { settled, syncMove } from "./quality-plant";
import type { FarmSky } from "./farm";
import { Trial } from "./trial";
import { newLog } from "./well";
import { bedCorner } from "./world";

/**
 * The trial's stand-in for town_move (lib/town/trial's moveDo, the dev server's `?townTest=` room): the farm after a
 * move or a swap is what the database leaves (lib/town/farm's movePlant, then quality-plant's syncMove, as v273's
 * test holds the database to), who helped each plant goes with it, and the bed is tended.
 */
const H = 3_600_000, NOW = Date.UTC(2026, 9, 17, 5);
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  const kept = new Map<string, string>();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => kept.set(k, v), removeItem: (k: string) => kept.delete(k) } }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const [BX, BY] = bedCorner(0), k = (u: number, v: number) => `${BX + u},${BY + v}`;
const plant = (crop: Plant["crop"], over: Partial<Plant> = {}): Plant => ({ by: "A", crop, sown: NOW - 10 * H, boost: 0, watered: NOW - 2 * H, fed: 0, guard: NOW + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...over });
/**
 * Two farms alike as the Quality reads them: every plot's soil and plant the same, but for when each round was last
 * settled. (The trial's every write of the farm settles each plant to its moment, as its plots are read afresh; the
 * database settles a plant only when it or its gift changes. A round settled at one moment or another is the same
 * round: what is gathered by a later moment is alike, to the rounding.)
 */
function alike(a: Record<string, Plot>, b: Record<string, Plot>, later: number, sky: FarmSky) {
  expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  for (const key of Object.keys(a)) {
    const p = a[key].plant, q = b[key].plant;
    expect({ ...a[key], plant: p ? { ...p, q: undefined } : null }, key).toEqual({ ...b[key], plant: q ? { ...q, q: undefined } : null });
    if (!p?.q || !q?.q) { expect(!!p?.q, key).toBe(!!q?.q); continue; }
    expect(p.q.bed ?? null, key).toEqual(q.q.bed ?? null);
    const x = settled(p, later, sky), y = settled(q, later, sky);
    expect(x.span, key).toBeCloseTo(y.span, 9);
    x.area.forEach((v, i) => expect(v, key).toBeCloseTo(y.area[i], 9));
    x.nar.forEach((v, i) => expect(v, key).toBeCloseTo(y.nar[i], 9));
  }
}
const bedOfTrial = (t: Trial) => Object.fromEntries(Object.entries(t.farm()).filter(([key]) => { const [x, y] = key.split(",").map(Number); return x >= BX && x < BX + 7 && y >= BY && y < BY + 7; }));
function laid() {
  const t = new Trial("A");
  window.localStorage.setItem("cashtown.trial.beds.1", JSON.stringify({ 0: { by: "A", tended: NOW - H, empty: 0, name: "A" } }));
  // (two tomatoes of one sowing, a basil beside one of them, a marigold helping, tilled ground; laid one by one, the bed settled at each)
  t.setPlot(k(1, 1), { soil: "tilled", plant: plant("tomato", { sown: NOW - 20 * H }) });
  vi.setSystemTime(NOW + H);
  t.setPlot(k(4, 4), { soil: "tilled", plant: plant("tomato", { sown: NOW - 20 * H, watered: 0 }) });
  t.setPlot(k(4, 5), { soil: "tilled", plant: plant("basil") });
  t.setPlot(k(2, 1), { soil: "tilled", plant: plant("marigold", { root: k(2, 1), footprint: [k(2, 1)] }) });
  t.setPlot(k(6, 6), { soil: "tilled", plant: null });
  vi.setSystemTime(NOW + 3 * H);
  t.setGifts(["charmHoe"]);
  expect(t.charmsWear(["charmHoe"])).toEqual({ ok: true });
  return t;
}

describe("the trial moves a plant as the database does", () => {
  it("onto empty ground: the farm the code's, the help moved, the bed tended, one move counted", () => {
    const t = laid(), before = t.farm(), now = t.now();
    expect(t.moveAt(k(1, 1))).toContain(k(6, 6));
    window.localStorage.setItem("cashtown.trial.welllog.1", JSON.stringify({ ...newLog(), help: { [k(1, 1)]: { owner: "A", by: { B: { water: 3, carry: 0 } } }, [k(6, 6)]: { owner: "C", by: { D: { water: 1, carry: 0 } } } } }));
    const want = movePlant(k(1, 1), k(6, 6), bedOfTrial(t), t.purse(), "A", now, "A", t.sky());
    expect(want.ok).toBe(true);
    if (!want.ok) return;
    expect(t.moveDo(k(1, 1), k(6, 6))).toEqual({ ok: true, swap: false, left: 9 });
    alike(t.farm(), syncGarden(syncMove(before, want.plots, now, t.sky())), now + 9 * H, t.sky());
    expect(t.farm()[k(6, 6)].plant).toMatchObject({ crop: "tomato", home: k(1, 1) });
    const log = JSON.parse(window.localStorage.getItem("cashtown.trial.welllog.1")!);
    expect(log.help).toEqual({ [k(6, 6)]: { owner: "A", by: { B: { water: 3, carry: 0 } } } });
    expect(t.beds()[0].tended).toBe(now);
  });

  it("a swap of two plants of one sowing: each keeps its own round, and every gift is its layout's", () => {
    const t = laid(), before = t.farm(), now = t.now(), p = before[k(1, 1)].plant!, q = before[k(4, 4)].plant!;
    expect(p.q).not.toEqual(q.q);
    const want = movePlant(k(1, 1), k(4, 4), bedOfTrial(t), t.purse(), "A", now, "A", t.sky());
    expect(want.ok && want.swap).toBe(true);
    if (!want.ok) return;
    expect(t.moveDo(k(1, 1), k(4, 4))).toEqual({ ok: true, swap: true, left: 9 });
    const after: Record<string, Plot> = t.farm();
    alike(after, syncGarden(syncMove(before, want.plots, now, t.sky())), now + 9 * H, t.sky());
    expect(after[k(4, 4)].plant).toMatchObject({ home: k(1, 1), watered: p.watered });
    expect(after[k(1, 1)].plant).toMatchObject({ home: k(4, 4), watered: q.watered });
    // (the tomato now beside the basil has its partner: the bed's gift given at the move)
    expect(after[k(4, 4)].plant!.q?.bed?.p).toBe(1);
    expect(after[k(1, 1)].plant!.q?.bed?.p).toBeUndefined();
  });

  it("refuses as the rule does, and changes nothing", () => {
    const t = laid(), before = t.farm();
    expect(t.moveDo(k(1, 1), k(0, 6))).toEqual({ ok: false, why: "soil" });
    t.charmsWear([]);
    expect(t.moveDo(k(1, 1), k(6, 6))).toEqual({ ok: false, why: "none" });
    expect(t.moveAt(k(1, 1))).toEqual([]);
    expect(t.farm()).toEqual(before);
  });
});
