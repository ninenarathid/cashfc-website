import { describe, expect, it } from "vitest";
import { COOKING, stirMods } from "./cooking";
import { FARMING, gameFor, hitsFor, type Chore, type Deed } from "./farm";
import { POURING, between, pour, poured, startPour, dropped as pourDropped, type Pour } from "./pouring";
import { STEADY, handAt, startHands, steadied, steady, wander, within, dropped as handsDropped, type Hands } from "./steady";
import { STIRRING, startStir, stir, stirred, type Stir } from "./stirring";
import { TIMING } from "./timing";
import { WEEDING, cleared, patchAt, startPatch, stirring, touch, dropped as patchDropped, type Patch } from "./weeding";

const TIRED = { spent: true, drops: true };
const weedsOf = (p: Patch) => p.cells.flatMap((c, i) => (c?.kind === "weed" ? [i] : []));
const stonesOf = (p: Patch) => p.cells.flatMap((c, i) => (c?.kind === "stone" ? [i] : []));
const bareOf = (p: Patch) => p.cells.flatMap((c, i) => (c === null ? [i] : []));

describe("each piece of work has a game of its own (the owner, 2026-10-04: \"ช่วยทำให้แต่ละ mini game แตกต่างกันด้วย การกดตามจังหว่ะ ดูจะมีเยอะไปหน่อย\")", () => {
  it("weeds are pulled, soil is tilled by the game of timing, water is poured, and tired hands are steadied", () => {
    expect(gameFor("clear")).toBe("weeding");
    expect(gameFor("till")).toBe("timing");
    for (const work of ["water", "draw", "pour", "fill"] as const) expect(gameFor(work)).toBe("pouring");
    for (const work of ["sow", "feed", "cure", "pick"] as const) expect(gameFor(work)).toBe("steady");
    // digging a plant out is no game at all
    for (const work of ["pull", "uproot"] as const) { expect(gameFor(work)).toBeNull(); for (const spent of [false, true]) expect(hitsFor(work, spent)).toBe(0); }
    // only one of the farm's is the game of timing now
    const all: Array<Deed | Chore> = ["clear", "till", "pull", "uproot", "sow", "water", "feed", "cure", "pick", "draw", "pour", "fill"];
    expect(all.filter((w) => gameFor(w) === "timing")).toEqual(["till"]);
    // how much of each is asked is what it was: the hoe's three always, two of anything else from tired hands
    expect(hitsFor("clear", false)).toBe(FARMING.swings.clear);
    expect(hitsFor("water", true)).toBe(FARMING.tired);
    expect(hitsFor("water", false)).toBe(0);
  });
});

describe("pulling weeds", () => {
  it("begins with as many weeds as are wanted, some stones, and bare ground: more stones for tired hands", () => {
    for (let seed = 1; seed < 60; seed++) {
      const fresh = startPatch(3, {}, seed), tired = startPatch(3, TIRED, seed);
      expect(fresh.cells.length).toBe(WEEDING.cols * WEEDING.rows);
      expect(weedsOf(fresh).length).toBe(3);
      expect(stonesOf(fresh).length).toBe(WEEDING.stones);
      expect(weedsOf(tired).length).toBe(3);
      expect(stonesOf(tired).length).toBe(WEEDING.tiredStones);
      expect(bareOf(tired).length).toBeGreaterThanOrEqual(1);
      // the same from the same seed
      expect(startPatch(3, {}, seed)).toEqual(fresh);
    }
    // not always laid out alike
    expect(new Set(Array.from({ length: 40 }, (_, s) => JSON.stringify(startPatch(3, {}, s + 1).cells.map((c) => c?.kind ?? "-")))).size).toBeGreaterThan(15);
  });

  it("a weed touched is pulled; a stone or bare ground touched is a miss; so many weeds and it is cleared", () => {
    let p = startPatch(3, {}, 7);
    const [w1, w2, w3] = weedsOf(p), [stone] = stonesOf(p), [bare] = bareOf(p);
    p = touch(p, 0.2, stone);
    expect(p).toMatchObject({ hits: 0, misses: 1 });
    expect(stonesOf(p)).toContain(stone);
    p = touch(p, 0.3, bare);
    expect(p).toMatchObject({ hits: 0, misses: 2 });
    p = touch(p, 0.4, w1);
    expect(p).toMatchObject({ hits: 1, misses: 2 });
    expect(p.cells[w1]).toBeNull();
    // where it stood is bare now: touched again, a miss
    expect(touch(p, 0.45, w1)).toMatchObject({ hits: 1, misses: 3 });
    p = touch(touch(p, 0.5, w2), 0.6, w3);
    expect(cleared(p)).toBe(true);
    expect(patchDropped(p)).toBe(false);
    // done is done: nothing more is counted, and no gust moves it
    expect(touch(p, 0.7, stone)).toEqual(p);
    expect(patchAt(p, 99)).toEqual(p);
    // a touch that is nowhere is nothing
    expect(touch(startPatch(3, {}, 7), 0.1, -1)).toMatchObject({ hits: 0, misses: 0 });
    expect(touch(startPatch(3, {}, 7), 0.1, 99)).toMatchObject({ hits: 0, misses: 0 });
  });

  it("the wind goes through it every so often and things change places: the same things, elsewhere", () => {
    for (let seed = 1; seed < 40; seed++) {
      const p = startPatch(3, {}, seed), before = patchAt(p, WEEDING.gust - 0.01), after = patchAt(p, WEEDING.gust + 0.01);
      expect(before.cells).toEqual(p.cells);
      expect(after.cells).not.toEqual(p.cells);
      expect(weedsOf(after).length).toBe(3);
      expect(stonesOf(after).length).toBe(WEEDING.stones);
      // it is seen coming: the patch stirs a moment before
      expect(stirring(p, WEEDING.gust - WEEDING.stir - 0.05)).toBe(false);
      expect(stirring(p, WEEDING.gust - WEEDING.stir + 0.05)).toBe(true);
      // and what is asked later is the same whenever it is asked
      expect(patchAt(patchAt(p, WEEDING.gust * 2.5), WEEDING.gust * 5.2)).toEqual(patchAt(p, WEEDING.gust * 5.2));
    }
    // a weed that stood somewhere before the gust is touched after it: what stands there now decides
    const p = startPatch(3, {}, 11), was = weedsOf(p)[0], now = patchAt(p, WEEDING.gust + 0.1);
    const late = touch(p, WEEDING.gust + 0.1, was);
    expect(late.hits + late.misses).toBe(1);
    expect(late.hits).toBe(now.cells[was]?.kind === "weed" ? 1 : 0);
  });

  it("with no stamina the gusts come four times as often and hardly stir first, and it is dropped at the third miss", () => {
    const fresh = startPatch(3, {}, 5), tired = startPatch(3, TIRED, 5);
    expect(fresh.most).toBe(0);
    expect(tired.most).toBe(TIMING.spent.misses);
    expect(fresh.every).toBeCloseTo(WEEDING.gust);
    expect(tired.every).toBeCloseTo(WEEDING.tiredGust);
    expect(WEEDING.gust / WEEDING.tiredGust).toBeGreaterThanOrEqual(3);
    expect(tired.warn).toBeLessThan(fresh.warn);
    // with stamina a miss only costs what it costs: the patch is never lost
    let p = fresh;
    for (let i = 0; i < 12; i++) p = touch(p, 0.1, stonesOf(p)[0]);
    expect(p.misses).toBe(12);
    expect(patchDropped(p)).toBe(false);
    // tired: the third miss drops it, and nothing more is counted
    let q = tired;
    for (let i = 0; i < 3; i++) { expect(patchDropped(q)).toBe(false); q = touch(q, 0.1, stonesOf(q)[0]); }
    expect(patchDropped(q)).toBe(true);
    expect(touch(q, 0.2, weedsOf(q)[0])).toEqual(q);
    // tired, but work that is not dropped (none is, today): the misses only count
    expect(startPatch(3, { spent: true }, 5).most).toBe(0);
    // a better hoe gives longer between the gusts
    expect(startPatch(3, { tool: 2.2 }, 5).every).toBeCloseTo(WEEDING.gust * Math.sqrt(2.2));
    expect(startPatch(3, { ...TIRED, tool: 1.5 }, 5).every).toBeCloseTo(WEEDING.tiredGust * Math.sqrt(1.5));
  });
});

describe("stirring a pot", () => {
  const kind = () => stirMods([], false), tiredKind = () => stirMods([], true);
  /** Stir at an even pace for so long. */
  const keep = (s: Stir, pace: number, secs: number) => { for (let t = 0; t < secs; t += 1 / 60) s = stir(s, pace / 60, 1 / 60); return s; };

  it("every turn made at a good pace is a stir done, and so many cook the dish", () => {
    let s = startStir(5, kind());
    expect(s).toMatchObject({ need: 5, hits: 0, misses: 0, begun: false });
    expect(s.lo).toBeLessThan(STIRRING.pace);
    expect(s.hi).toBeGreaterThan(STIRRING.pace);
    // nothing is held against a ladle that has not been touched yet
    expect(keep(s, 0, 5)).toEqual(s);
    s = keep(s, STIRRING.pace, 3);
    expect(s.hits).toBeGreaterThanOrEqual(1);
    expect(s.hits).toBeLessThan(5);
    expect(s.misses).toBe(0);
    s = keep(s, STIRRING.pace, 5);
    expect(stirred(s)).toBe(true);
    expect(s.misses).toBe(0);
    // done is done
    expect(keep(s, 9, 3)).toEqual(s);
    // either way round is stirring
    expect(stir(stir(startStir(1, kind()), -0.4, 0.4), -0.4, 0.4).pace).toBeGreaterThan(0);
  });

  it("stirred too fast, too slowly or left, for a while, is a helping lost; a slip that is mended in time is not", () => {
    const going = keep(startStir(9, kind()), STIRRING.pace, 1.5);
    expect(going.off).toBe(0);
    // too fast: the soup goes over
    let s = keep(going, 3, 0.5);
    expect(s.off).toBe(1);
    expect(s.misses).toBe(0);
    // mended before the grace is up: nothing lost
    expect(keep(s, STIRRING.pace, 2).misses).toBe(0);
    // kept up: a helping, and another for as long again
    s = keep(going, 3, STIRRING.grace + 0.6);
    expect(s.misses).toBe(1);
    expect(keep(s, 3, STIRRING.grace + 0.1).misses).toBe(2);
    // too slowly, and left altogether: it catches
    expect(keep(going, 0.15, STIRRING.grace + 0.9)).toMatchObject({ off: -1, misses: 1 });
    expect(keep(going, 0, STIRRING.grace + 0.9)).toMatchObject({ off: -1, misses: 1 });
    // a turn made at a bad pace is no stir
    const hits = going.hits;
    expect(keep(going, 3, 0.8).hits).toBeLessThanOrEqual(hits + 1);
    expect(keep(keep(going, 3, 0.5), 3, 2).hits).toBeLessThanOrEqual(hits + 1);
    // it cannot be lost: a pot goes on being stirred, however many helpings it costs
    expect(stirred(keep(keep(startStir(3, kind()), 4, 8), STIRRING.pace, 6))).toBe(true);
  });

  it("is the kindest of the games: the good pace is wide, and with no stamina only a little narrower and less patient", () => {
    const fresh = startStir(5, kind()), tired = startStir(5, tiredKind());
    // wider than it would be with no kindness in it
    expect(fresh.hi - fresh.lo).toBeGreaterThan(startStir(5, {}).hi - startStir(5, {}).lo);
    expect((fresh.hi - fresh.lo) / STIRRING.pace).toBeGreaterThan(1);
    // tired: three quarters of it, not a third
    expect((tired.hi - tired.lo) / (fresh.hi - fresh.lo)).toBeCloseTo(COOKING.stirring.spent.zone, 5);
    expect(tired.grace).toBeCloseTo(STIRRING.grace / COOKING.stirring.spent.speed, 5);
    // an apron widens it
    const apron = startStir(5, stirMods([{ item: "apron", n: 1 }], false));
    expect(apron.hi - apron.lo).toBeGreaterThan(fresh.hi - fresh.lo);
    // and the pace never has to be nothing to be good
    for (const s of [fresh, tired, apron]) expect(s.lo).toBeGreaterThan(0.1);
  });
});

describe("pouring water", () => {
  /** Hold until the water stands so high, then let go. */
  const fill = (p: Pour, to: number) => { for (let i = 0; i < 2000 && p.level < to && !p.spilt; i++) p = pour(p, true, 1 / 480); return pour(p, false, 1 / 480); };

  it("held, the water rises; let go between the marks it is a good pour, anywhere else a miss", () => {
    const p = startPour(2, TIRED, 3);
    expect(p).toMatchObject({ need: 2, hits: 0, misses: 0, level: 0, most: TIMING.spent.misses });
    expect(p.lo).toBeGreaterThanOrEqual(POURING.from);
    expect(p.lo + p.width).toBeLessThanOrEqual(POURING.brim + 1e-9);
    // not held, nothing happens
    expect(pour(p, false, 1)).toEqual(p);
    const good = fill(p, p.lo + p.width / 2);
    expect(good).toMatchObject({ hits: 1, misses: 0, level: 0 });
    // the marks stand somewhere else for the next, and the water rises at another pace
    expect(good.lo === p.lo && good.rate === p.rate).toBe(false);
    expect(fill(p, p.lo - 0.05)).toMatchObject({ hits: 0, misses: 1, level: 0 });
    expect(fill(p, p.lo + p.width + 0.02)).toMatchObject({ hits: 0, misses: 1 });
    // a miss leaves the marks where they were
    expect(fill(p, p.lo - 0.05).lo).toBe(p.lo);
    const done = fill(good, good.lo + good.width / 2);
    expect(poured(done)).toBe(true);
    expect(pour(done, true, 1)).toEqual(done);
  });

  it("held until it runs over the brim it is spilt: a miss at once, and the hand must let go before it pours again", () => {
    let p = startPour(2, TIRED, 9);
    for (let i = 0; i < 4000 && !p.spilt; i++) p = pour(p, true, 1 / 480);
    expect(p).toMatchObject({ spilt: true, misses: 1, level: 0 });
    // still held: nothing rises
    expect(pour(p, true, 0.5)).toEqual(p);
    p = pour(p, false, 0.01);
    expect(p.spilt).toBe(false);
    expect(pour(p, true, 0.1).level).toBeGreaterThan(0);
    // letting go after a spill is no second miss
    expect(p.misses).toBe(1);
  });

  it("tired hands drop it at the third miss; the marks are as far apart as the stretch of the game it takes the place of was long", () => {
    let p = startPour(2, TIRED, 4);
    for (let i = 0; i < 3; i++) { expect(pourDropped(p)).toBe(false); p = fill(p, 0.1); }
    expect(pourDropped(p)).toBe(true);
    expect(pour(p, true, 1)).toEqual(p);
    // the water is between the marks for about as long as the marker was over the tired stretch
    const over = (TIMING.zone * TIMING.spent.zone) / (TIMING.speed * TIMING.spent.speed), between_ = POURING.tired * POURING.full;
    expect(between_ / over).toBeGreaterThan(0.9);
    expect(between_ / over).toBeLessThan(1.15);
    // a better can widens the marks
    expect(startPour(2, { ...TIRED, tool: 2.2 }, 4).width).toBeCloseTo(POURING.tired * Math.sqrt(2.2));
    // with stamina (were it ever played) the marks are four times as far apart, and it is never dropped
    expect(startPour(2, {}, 4)).toMatchObject({ width: POURING.marks, most: 0 });
    // no two pours rise alike, or stand alike, over many
    const seen = new Set<string>();
    let q = startPour(40, {}, 1);
    for (let i = 0; i < 40; i++) { seen.add(`${q.lo.toFixed(3)}|${q.rate.toFixed(3)}`); q = fill(q, q.lo + q.width / 2); expect(between({ ...q, level: q.lo + q.width / 2 })).toBe(true); }
    expect(seen.size).toBe(40);
    for (const s of seen) { const rate = Number(s.split("|")[1]); expect(rate * POURING.full).toBeGreaterThan(1 - POURING.sway - 1e-6); expect(rate * POURING.full).toBeLessThan(1 + POURING.sway + 1e-6); }
  });
});

describe("tired hands, steadied", () => {
  /** Hold the hand over the middle for so long: move it back by exactly what the wandering carried it. */
  const hold = (h: Hands, secs: number) => { for (let t = 0; t < secs; t += 1 / 60) { const at = handAt(h); h = steady(h, -at.x, -at.y, 1 / 60); } return h; };
  /** Let it wander for so long. */
  const leave = (h: Hands, secs: number) => { for (let t = 0; t < secs; t += 1 / 60) h = steady(h, 0, 0, 1 / 60); return h; };

  it("begins over the plant, and wanders: a slow sway and a quick tremble, the same from the same seed", () => {
    for (let seed = 1; seed < 30; seed++) {
      const h = startHands(2, TIRED, seed), at = handAt(h);
      expect(Math.hypot(at.x, at.y)).toBeLessThan(1e-9);
      expect(within(h)).toBe(true);
      expect(wander(seed, 1.7)).toEqual(wander(seed, 1.7));
      // left alone it leaves the ring within a few seconds
      let out = false, g = h;
      for (let t = 0; t < 6 && !out; t += 1 / 60) { g = steady(g, 0, 0, 1 / 60); out = !within(g); }
      expect(out, `seed ${seed}`).toBe(true);
      // and never goes further than the sway and the tremble can carry it
      for (let t = 0; t < 30; t += 0.37) { const w = wander(seed, t); expect(Math.abs(w.x)).toBeLessThanOrEqual(STEADY.sway + 2 * STEADY.tremble + 1e-9); expect(Math.abs(w.y)).toBeLessThanOrEqual(STEADY.sway + 2 * STEADY.tremble + 1e-9); }
    }
    expect(wander(1, 1)).not.toEqual(wander(2, 1));
  });

  it("kept inside the ring so long is a part done; so many parts and the work is done", () => {
    let h = startHands(2, TIRED, 3);
    h = hold(h, STEADY.beat - 0.1);
    expect(h).toMatchObject({ hits: 0, misses: 0 });
    h = hold(h, 0.2);
    expect(h.hits).toBe(1);
    h = hold(h, STEADY.beat + 0.05);
    expect(steadied(h)).toBe(true);
    expect(h.misses).toBe(0);
    expect(leave(h, 5)).toEqual(h);
    // it has to be kept in one go: what was kept is lost when it leaves the ring
    let g = hold(startHands(2, TIRED, 3), STEADY.beat - 0.1);
    expect(g.inside).toBeGreaterThan(STEADY.beat - 0.2);
    g = steady(g, 1.2, 0, 1 / 60);
    expect(g).toMatchObject({ inside: 0, hits: 0 });
    // and a hand that does nothing gets nowhere: over many goes, hardly ever
    let lucky = 0;
    for (let seed = 100; seed < 300; seed++) { let k = startHands(2, TIRED, seed); while (!steadied(k) && !handsDropped(k) && k.t < 30) k = steady(k, 0, 0, 1 / 60); if (steadied(k)) lucky++; }
    expect(lucky).toBeLessThan(12);
  });

  it("left outside for a while is a miss, and the third drops it; a hand moved back in time loses nothing", () => {
    const h = startHands(2, TIRED, 5);
    // pushed far out and left there
    let out = steady(h, 1.2, 0, 1 / 60);
    expect(within(out)).toBe(false);
    out = leave(out, STEADY.slip - 0.1);
    expect(out.misses).toBe(0);
    // brought back in time
    expect(hold(out, 0.3).misses).toBe(0);
    out = leave(out, 0.2);
    expect(out.misses).toBe(1);
    out = leave(out, STEADY.slip * 2 + 0.1);
    expect(handsDropped(out)).toBe(true);
    expect(out.misses).toBe(TIMING.spent.misses);
    expect(hold(out, 3)).toEqual(out);
    // the hand cannot be dragged off further than it can reach
    let far = h;
    for (let i = 0; i < 100; i++) far = steady(far, 1, 1, 1 / 60);
    expect(Math.abs(far.x)).toBeLessThanOrEqual(STEADY.reach);
    // a better tool widens the ring; work that cannot be dropped is never dropped
    expect(startHands(2, { ...TIRED, tool: 2.2 }, 5).ring).toBeCloseTo(STEADY.ring * Math.sqrt(2.2));
    expect(startHands(2, { spent: true }, 5).most).toBe(0);
  });
});
