import { describe, expect, it } from "vitest";
import { BANDS } from "./bands";
import { ITEMS } from "./items";
import { BOARD, FIGHT_FEEL, hoopNow, moveHoop, openHoop, rocksOf, scoops, shutHoop, startFish, stepFish, type Hoop } from "./giant-fight";
import { GIANT, GIANT_BAIT, GIANT_IDS, GIANTS, callWords, giantChance, giantFish, giantOf, giantsOut, settled, type GiantHook } from "./giant-fish";

const t = 1_800_000_000_000;
const hook = (o: Partial<GiantHook> = {}): GiantHook => ({
  id: "h1", giant: "sailbackCarp", size: 140, weight: 49.4, by: "me", byName: "Me", tile: [50, 74], water: "town", at: t,
  netter: null, netterName: null, go: 0, scoops: [], frays: [], calls: [], end: 0, how: "", claimed: [], seed: 7, ...o,
});
const ok = (d: ReturnType<typeof giantFish>) => { if (!d.ok) throw new Error(d.why); return d; };

describe("the twenty giants", () => {
  it("are five a water, never a bag item, two out at every hour and the rare one before dawn", () => {
    expect(GIANT_IDS).toHaveLength(20);
    for (const id of GIANT_IDS) expect(id in ITEMS).toBe(false);
    for (const water of ["town", "creek", "headwater", "pool"] as const) {
      expect(GIANT_IDS.filter((id) => GIANTS[id].water === water)).toHaveLength(5);
      for (let h = 0; h < 24; h++) {
        const out = giantsOut(water, h);
        expect(out.filter((g) => !GIANTS[g.id].rare)).toHaveLength(2);
        expect(out.some((g) => GIANTS[g.id].rare)).toBe(h >= 3 && h < 7);
      }
    }
  });
  it("roll a length inside their own and a weight from it", () => {
    for (let i = 0; i < 50; i++) {
      const g = giantOf("pool", 4, i / 50, (i * 7 % 50) / 50)!;
      expect(g.size).toBeGreaterThanOrEqual(GIANTS[g.id].size[0]);
      expect(g.size).toBeLessThanOrEqual(GIANTS[g.id].size[1]);
      expect(g.weight).toBeGreaterThan(0);
    }
  });
  it("are bands that exist", () => { for (const id of GIANT_IDS) for (const b of GIANTS[id].bands) expect(BANDS.some((x) => x.id === b)).toBe(true); });
});

describe("the chance of one on a cast", () => {
  it("is the giant's share of what is no fish, only with the water's bait, never within twenty minutes of the last", () => {
    expect(giantChance("dough", "town", 12, 0.2, null, t)).toBeCloseTo(0.1);
    expect(giantChance("worm", "town", 12, 0.2, null, t)).toBe(0);
    expect(giantChance(GIANT_BAIT.creek, "creek", 12, 0.2, t - GIANT.every + 1, t)).toBe(0);
    expect(giantChance(GIANT_BAIT.creek, "creek", 12, 0.2, t - GIANT.every, t)).toBeCloseTo(0.1);
    expect(giantChance("dough", "town", 12, 0.01, null, t)).toBe(0);
    expect(giantChance("dough", "town", 12, 0.2, null, t, true)).toBe(0);
  });
});

describe("a giant on the line", () => {
  it("cannot be landed alone: the hold runs out", () => {
    expect(settled(hook(), t + GIANT.hold).how).toBe("lost");
    expect(giantFish("scoop", hook(), "me", "Me", t + 10_000)).toEqual({ ok: false, why: "soon" });
    expect(giantFish("join", hook(), "me", "Me", t + 1, { at: [50, 74] })).toEqual({ ok: false, why: "self" });
  });
  it("takes three calls, a minute apart, of at most 120 letters", () => {
    let h = hook();
    h = ok(giantFish("call", h, "me", "Me", t + 1, { text: "มาช่วยหน่อย" })).hook;
    expect(giantFish("call", h, "me", "Me", t + 30_000, { text: "อีกที" })).toEqual({ ok: false, why: "soon" });
    expect(giantFish("call", h, "you", "You", t + 70_000, { text: "x" })).toEqual({ ok: false, why: "theirs" });
    expect(giantFish("call", h, "me", "Me", t + 70_000, { text: "ก".repeat(121) })).toEqual({ ok: false, why: "long" });
    expect(giantFish("call", h, "me", "Me", t + 70_000, { text: "   " })).toEqual({ ok: false, why: "empty" });
    h = ok(giantFish("call", h, "me", "Me", t + 70_000, { text: "x" })).hook;
    h = ok(giantFish("call", h, "me", "Me", t + 140_000, { text: "y" })).hook;
    expect(giantFish("call", h, "me", "Me", t + 210_000, { text: "z" })).toEqual({ ok: false, why: "many" });
    expect(callWords("  a \n b  ")).toBe("a b");
  });
  it("is joined by one netter near the post, who then nets it three times, scoops apart", () => {
    expect(giantFish("join", hook(), "you", "You", t + 5_000, { at: [70, 74] })).toEqual({ ok: false, why: "far" });
    let h = ok(giantFish("join", hook(), "you", "You", t + 5_000, { at: [52, 76] })).hook;
    expect(h.go).toBe(t + 5_000);
    expect(giantFish("join", h, "them", "Them", t + 6_000, { at: [50, 74] })).toEqual({ ok: false, why: "taken" });
    expect(giantFish("scoop", h, "me", "Me", t + 20_000)).toEqual({ ok: false, why: "theirs" });
    expect(giantFish("scoop", h, "you", "You", t + 5_000 + GIANT.scoopGap - 1)).toEqual({ ok: false, why: "soon" });
    for (let i = 1; i <= GIANT.scoops; i++) h = ok(giantFish("scoop", h, "you", "You", t + 5_000 + i * GIANT.scoopGap)).hook;
    expect(h.how).toBe("landed");
    const mine = ok(giantFish("claim", h, "me", "Me", h.end + 1));
    expect(mine.steak).toBe(true);
    expect(giantFish("claim", mine.hook, "me", "Me", h.end + 2)).toEqual({ ok: false, why: "taken" });
    expect(giantFish("claim", mine.hook, "them", "Them", h.end + 2)).toEqual({ ok: false, why: "theirs" });
    expect(giantFish("claim", mine.hook, "you", "You", h.end + 2, { bagFull: true })).toEqual({ ok: false, why: "full" });
    expect(ok(giantFish("claim", mine.hook, "you", "You", h.end + 3)).steak).toBe(true);
  });
  it("breaks at the third fray, and gets away when the fight's time is up", () => {
    let h = ok(giantFish("join", hook(), "you", "You", t + 1, { at: [50, 74] })).hook;
    for (let i = 1; i <= GIANT.frays; i++) h = ok(giantFish("fray", h, "me", "Me", t + 1 + i * GIANT.frayGap)).hook;
    expect(h.how).toBe("broke");
    const h2 = ok(giantFish("join", hook(), "you", "You", t + 1, { at: [50, 74] })).hook;
    expect(giantFish("scoop", h2, "you", "You", t + 1 + GIANT.fight + GIANT.grace + 1)).toEqual({ ok: false, why: "gone" });
  });
});

/** Two pairs of hands play the fight: the angler keeps the tip under the fish but off the rocks' line, the netter follows the fish late. */
function play(seed: number, lag: number, tired: boolean, dodge = 0.6): { scoops: number; frays: number } {
  const rocks = rocksOf(seed), dt = 1 / 30;
  let fish = startFish(seed), hoop: Hoop = { x: 100, open: null }, sc = 0, fr = 0, seen: { x: number; y: number }[] = [], last = -99;
  for (let t = 0; t < GIANT.fight / 1000 && sc < GIANT.scoops && fr < GIANT.frays; t += dt) {
    // (the angler: under the fish, moved to the side away from the rock nearest the line)
    let tip = fish.x;
    for (const o of rocks) if (o.y > fish.y) tip += (tip - o.x) * dodge * Math.max(0, 1 - Math.abs(o.x - tip) / 40);
    tip = Math.max(BOARD.left, Math.min(BOARD.right, tip));
    const s = stepFish(fish, t, dt, tip, tired, seed, rocks, false);
    fish = s.fish; if (s.frayed) fr++;
    seen.push({ x: fish.x, y: fish.y });
    const late = seen[Math.max(0, seen.length - 1 - Math.round(lag / dt))];
    hoop = moveHoop(hoop, Math.sign(late.x - hoop.x) * (Math.abs(late.x - hoop.x) > 3 ? 1 : 0), dt);
    hoop = hoopNow(hoop, t);
    if (late.y >= BOARD.net - 14 && Math.abs(late.x - hoop.x) < 12) hoop = openHoop(hoop, t);
    if (late.y < BOARD.net - 20) hoop = shutHoop(hoop, t);
    if (scoops(hoop, fish, t) && t - last >= GIANT.scoopGap / 1000) { sc++; last = t; hoop = shutHoop(hoop, t); fish = stepFish(fish, t, dt, tip, tired, seed, rocks, true).fish; }
  }
  return { scoops: sc, frays: fr };
}
describe("the fight, played", () => {
  it("lands most giants with hands that mind the rocks, tired too; fewer when the rocks are not minded", () => {
    const rate = (lag: number, tired: boolean, dodge?: number) => { let n = 0; for (let s = 1; s <= 200; s++) if (play(s, lag, tired, dodge).scoops >= GIANT.scoops) n++; return n / 200; };
    const good = rate(0.25, false), slow = rate(0.6, false), tired = rate(0.25, true), careless = rate(0.25, false, 0);
    expect(good).toBeGreaterThan(0.7);
    expect(slow).toBeGreaterThan(0.6);
    expect(tired).toBeGreaterThan(0.6);
    expect(careless).toBeLessThan(good - 0.1);
  });
  it("has its rocks off the net's line and apart", () => {
    for (let s = 1; s < 100; s++) for (const o of rocksOf(s)) expect(o.y + o.r).toBeLessThan(BOARD.net - 8);
    expect(FIGHT_FEEL.reach).toBeGreaterThan(8);
  });
});

describe("the points of a giant", () => {
  it("are a rare fish's on the fishing line for each of the two, a legend's for the dawn's rare one, the first of each ten more", async () => {
    const { countsOf, POINTS } = await import("./line-points");
    expect(countsOf({ from: "deed", what: "giant", thing: "sailbackCarp", n: 1, doc: {} }, "me")).toEqual([{ to: null, line: "fishing", raw: POINTS.fishing.rare, first: "fishing:sailbackCarp" }]);
    expect(countsOf({ from: "deed", what: "giant", thing: "glasswakeCarp", n: 1, doc: {} }, "me")[0].raw).toBe(POINTS.fishing.legend);
    expect(countsOf({ from: "deed", what: "giant", thing: "nothing", n: 1, doc: {} }, "me")).toEqual([]);
  });
});
