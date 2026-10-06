import { describe, expect, it } from "vitest";
import { CATCHING, caught, fallen, fell, showerAt, startShower } from "./catching";
import { CHOOSING, chosen, dimmed, startBunch, takeAt } from "./choosing";
import { DIGGING, dug, dugUp, startDig, strike } from "./digging";
import { KINDS, SPOTS, holds, sights } from "./forest";
import { FOREST_EYE, softStep } from "./forest-eye";
import { DRY } from "./weather";

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

describe("choosing what to take (mushrooms, herbs, berries)", () => {
  it("is a patch of good ones and look-alikes, in places worked out from a seed", () => {
    for (const seed of SEEDS) for (const need of [1, 2, 3]) {
      const b = startBunch(need, false, seed);
      expect(b.cells.length).toBe(CHOOSING.cols * CHOOSING.rows);
      expect(b.cells.filter((c) => c?.good).length).toBe(need);
      expect(b.cells.filter((c) => c && !c.good).length).toBe(CHOOSING.fakes);
      expect(b).toEqual(startBunch(need, false, seed));
      expect(b.dim).toBeNull();
    }
    // not always in the same places
    expect(new Set(SEEDS.map((s) => startBunch(2, false, s).cells.map((c) => (c ? (c.good ? "g" : "f") : ".")).join(""))).size).toBeGreaterThan(20);
  });

  it("takes whatever is touched: a good one, or a look-alike for what it is", () => {
    let b = startBunch(2, false, 5);
    const good = b.cells.flatMap((c, i) => (c?.good ? [i] : [])), fake = b.cells.findIndex((c) => c && !c.good), bare = b.cells.findIndex((c) => !c);
    b = takeAt(b, bare);
    expect([b.hits, b.wrong]).toEqual([0, 0]);
    b = takeAt(b, fake);
    expect([b.hits, b.wrong, chosen(b)]).toEqual([0, 1, false]);
    // (gone, it cannot be taken twice)
    expect(takeAt(b, fake)).toBe(b);
    b = takeAt(b, good[0]);
    expect([b.hits, chosen(b)]).toEqual([1, false]);
    b = takeAt(b, good[1]);
    expect([b.hits, b.wrong, chosen(b)]).toEqual([2, 1, true]);
    // done, nothing more is taken
    expect(takeAt(b, b.cells.findIndex((c) => c && !c.taken))).toBe(b);
  });

  it("is seen clearly only for a moment with no stamina left, among more look-alikes", () => {
    const b = startBunch(2, true, 5);
    expect(b.cells.filter((c) => c && !c.good).length).toBe(CHOOSING.tiredFakes);
    expect(CHOOSING.tiredFakes).toBeGreaterThan(CHOOSING.fakes);
    expect(dimmed(b, CHOOSING.peek - 0.1)).toBe(false);
    expect(dimmed(b, CHOOSING.peek)).toBe(true);
    expect(dimmed(startBunch(2, false, 5), 999)).toBe(false);
  });
});

describe("digging something up", () => {
  it("is a mound with something lying under a run of its places, only its top showing", () => {
    for (const seed of SEEDS) for (const parts of [1, 2, 3]) {
      const d = startDig(parts, false, seed), over = d.cells.flatMap((c, i) => (c.over ? [i] : []));
      expect(d.cells.length).toBe(DIGGING.cols * DIGGING.rows);
      expect(over.length).toBe(d.need);
      expect(d.need).toBe(Math.max(2, parts + 1));
      // in a run: across (next to each other in a row) or down (one above the other)
      const across = over.every((i, k) => !k || (i === over[k - 1] + 1 && Math.floor(i / DIGGING.cols) === Math.floor(over[0] / DIGGING.cols)));
      const down = over.every((i, k) => !k || i === over[k - 1] + DIGGING.cols);
      expect(across || down).toBe(true);
      // its top is one end of it
      const top = d.cells.findIndex((c) => c.top);
      expect([over[0], over[over.length - 1]]).toContain(top);
      expect(d.cells.filter((c) => c.top).length).toBe(1);
      for (const c of d.cells) { expect(c.earth).toBeGreaterThanOrEqual(DIGGING.deep[0]); expect(c.earth).toBeLessThanOrEqual(DIGGING.deep[1]); }
      // strokes for all of it, and a few to spare
      expect(d.strokes).toBe(over.reduce((t, i) => t + d.cells[i].earth, 0) + DIGGING.spare);
      expect(d).toEqual(startDig(parts, false, seed));
    }
  });

  it("gets a part out when its earth is off, bruises one that is struck again, and wastes a stroke where nothing lies", () => {
    let d = startDig(2, false, 11);
    const over = d.cells.flatMap((c, i) => (c.over ? [i] : [])), bare = d.cells.findIndex((c) => !c.over), at = d.strokes;
    for (let n = d.cells[over[0]].earth; n > 1; n--) d = strike(d, over[0]);
    expect(d.hits).toBe(0);
    d = strike(d, over[0]);
    expect(d.hits).toBe(1);
    // once more on the bare part: a bruise
    d = strike(d, over[0]);
    expect([d.hits, d.misses]).toEqual([1, 1]);
    // where nothing lies, earth comes off and nothing else; bare of earth, a stroke is only a stroke gone
    const depth = d.cells[bare].earth;
    for (let n = 0; n < depth + 1; n++) d = strike(d, bare);
    expect([d.hits, d.misses, d.cells[bare].earth]).toEqual([1, 1, 0]);
    expect(d.strokes).toBe(at - d.cells[over[0]].earth - startDig(2, false, 11).cells[over[0]].earth - 1 - depth - 1);
  });

  it("ends with the whole thing bare, or with the strokes spent and what is still buried left there", () => {
    // a careful hand: every part's earth off, and not a stroke more
    for (const seed of SEEDS.slice(0, 60)) {
      let d = startDig(2, false, seed);
      for (const [i, c] of d.cells.entries()) if (c.over) for (let n = c.earth; n > 0; n--) d = strike(d, i);
      expect(dug(d)).toBe(true);
      expect(dugUp(d)).toEqual({ hits: d.need, misses: 0 });
      expect(strike(d, 0)).toBe(d);
    }
    // a careless one: every stroke on bare ground
    let d = startDig(2, false, 11);
    const bare = d.cells.findIndex((c) => !c.over);
    while (!dug(d)) d = strike(d, bare);
    expect(dugUp(d)).toEqual({ hits: 0, misses: d.need });
    // with no stamina left how deep it is cannot be seen, and there is hardly a stroke to spare
    const tired = startDig(2, true, 11);
    expect(tired.seen).toBe(false);
    expect(startDig(2, false, 11).seen).toBe(true);
    expect(tired.strokes).toBe(startDig(2, false, 11).strokes - DIGGING.spare + DIGGING.tiredSpare);
  });
});

describe("shaking a tree and catching what falls", () => {
  it("lets fall a few more than are wanted, one after another, never twice running in the same lane", () => {
    for (const seed of SEEDS) for (const need of [1, 2, 3]) {
      const sh = startShower(need, false, seed);
      expect(sh.drops.length).toBe(need + CATCHING.spare);
      sh.drops.forEach((d, i) => {
        expect(d.lane).toBeGreaterThanOrEqual(0);
        expect(d.lane).toBeLessThan(CATCHING.lanes);
        if (i) { expect(d.lane).not.toBe(sh.drops[i - 1].lane); expect(d.lands - sh.drops[i - 1].lands).toBeCloseTo(CATCHING.gap, 9); }
      });
      expect(sh).toEqual(startShower(need, false, seed));
    }
  });

  it("catches what lands in the basket's lane, and loses the rest", () => {
    let sh = startShower(2, false, 3);
    const [a, b, c, d] = sh.drops;
    expect(fallen(sh, a, 0)).toBe(0);
    expect(fallen(sh, a, a.lands - sh.fall / 2)).toBeCloseTo(0.5, 9);
    expect(fallen(sh, a, a.lands)).toBe(1);
    // nothing has landed: nothing is settled
    expect(showerAt(sh, a.lands - 0.01, a.lane)).toBe(sh);
    sh = showerAt(sh, a.lands, a.lane);
    expect(sh.drops[0].caught).toBe(true);
    sh = showerAt(sh, b.lands, a.lane);
    expect(sh.drops[1].caught).toBe(false);
    sh = showerAt(sh, c.lands, c.lane);
    expect([fell(sh), caught(sh)]).toEqual([false, { hits: 2, misses: 0 }]);
    sh = showerAt(sh, d.lands, d.lane);
    // three caught of two wanted: two, and none let fall
    expect([fell(sh), caught(sh)]).toEqual([true, { hits: 2, misses: 0 }]);
    // everything let fall: none, and all of them missed
    let none = startShower(3, false, 3);
    none = showerAt(none, 99, -1);
    expect(caught(none)).toEqual({ hits: 0, misses: 3 });
  });

  it("falls faster and closer together with no stamina left, with none to spare", () => {
    const tired = startShower(3, true, 3), fed = startShower(3, false, 3);
    expect(tired.drops.length).toBe(3);
    expect(tired.fall).toBeLessThan(fed.fall);
    expect(tired.drops[1].lands - tired.drops[0].lands).toBeLessThan(fed.drops[1].lands - fed.drops[0].lands);
  });
});

describe("what somebody sees of the forest", () => {
  const NOON = Date.UTC(2026, 9, 5, 5), nobody = () => ({ n: 0, mine: false });

  it("is every place that has something, with what it is; but what is buried is not told", () => {
    const seen = sights("word", NOON, DRY, nobody);
    expect(seen.length).toBeGreaterThan(SPOTS.length * 0.4);
    expect(seen.length).toBeLessThan(SPOTS.length * 0.8);
    for (const s of seen) {
      const spot = SPOTS[s.id], has = holds("word", spot, NOON)!;
      expect(has).not.toBeNull();
      expect(s.n).toBe(has.n);
      expect(s.item).toBe(KINDS[spot.kind].how === "dig" ? null : has.item);
    }
    expect(seen.some((s) => s.item === null)).toBe(true);
  });

  it("leaves out what I have taken from, and what others have had the last of", () => {
    const all = sights("word", NOON, DRY, nobody), first = all[0], second = all[1];
    const mine = sights("word", NOON, DRY, (spot) => ({ n: 1, mine: spot.id === first.id }));
    expect(mine.map((s) => s.id)).toEqual(all.map((s) => s.id).filter((id) => id !== first.id));
    const bare = sights("word", NOON, DRY, (spot) => ({ n: spot.id === second.id ? KINDS[SPOTS[spot.id].kind].shares : 0, mine: false }));
    expect(bare.map((s) => s.id)).toEqual(all.map((s) => s.id).filter((id) => id !== second.id));
    // (asked about the turn the place is in)
    const turns: number[] = [];
    sights("word", NOON, DRY, (spot, turn) => { if (spot.id === first.id) turns.push(turn); return { n: 0, mine: false }; });
    expect(turns).toEqual([holds("word", SPOTS[first.id], NOON)!.turn]);
  });
});

describe("the fountain's forest eye (the owner: \"อยากให้ช่วยเพิ่ม บัฟที่เกี่ยวของกับ การหาของป่า\")", () => {
  it("makes each of the forest's games a little kinder, and gives nothing more", () => {
    for (const spent of [false, true]) for (let seed = 1; seed < 40; seed++) {
      const plain = startBunch(2, spent, seed), kind = startBunch(2, spent, seed, true);
      const fakes = (b: typeof plain) => b.cells.filter((c) => c && !c.good).length;
      expect(fakes(kind)).toBe(Math.max(1, fakes(plain) - FOREST_EYE));
      // (as many good ones as there were: the eye spares a mistake, it does not find more)
      expect(kind.need).toBe(plain.need);
      expect(startDig(2, spent, seed, true).strokes).toBe(startDig(2, spent, seed).strokes + FOREST_EYE);
      expect(startDig(2, spent, seed, true).need).toBe(startDig(2, spent, seed).need);
      expect(startShower(3, spent, seed, true).drops.length).toBe(startShower(3, spent, seed).drops.length + FOREST_EYE);
      expect(startShower(3, spent, seed, true).need).toBe(startShower(3, spent, seed).need);
    }
  });
});

describe("the fountain's soft step", () => {
  it("lets somebody come half as near again before an insect minds them", () => {
    expect(softStep(0.5)).toBeCloseTo(2 / 3, 6);
    expect(softStep(0)).toBe(1);
    expect(softStep(-3)).toBe(1);
  });
});
