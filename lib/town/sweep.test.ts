import { describe, expect, it } from "vitest";
import { startPour } from "./pouring";
import { startHands } from "./steady";
import { SWEEP, bladeAt, cuts, over, paceAt, startSweep, sweepSecs, swept, swing, type Sweep } from "./sweep";
import { TIMING, narrowed, startRound } from "./timing";

/** The moment the blade is at a place along the row. */
const when = (s: Sweep, x: number) => (Math.sqrt(s.speed * s.speed + 2 * s.gain * (x - s.from)) - s.speed) / s.gain;

describe("the crescent sickle's sweep", () => {
  it("goes along the row once, from before the first plant to past the last, gathering pace all the way", () => {
    const s = startSweep([0, 1, 2, 3, 4, 5, 6]);
    expect(s.places).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(bladeAt(s, 0)).toBe(-SWEEP.lead);
    expect(bladeAt(s, -3)).toBe(-SWEEP.lead);
    expect(s.to).toBe(7 + SWEEP.tail);
    let last = bladeAt(s, 0);
    for (let t = 0.1; t < 6; t += 0.1) { const x = bladeAt(s, t); expect(x).toBeGreaterThan(last); last = x; }
    expect(paceAt(s, 2)).toBeGreaterThan(paceAt(s, 1));
    expect(swept(s, sweepSecs(s) - 0.01)).toBe(false);
    expect(swept(s, sweepSecs(s) + 0.01)).toBe(true);
    // a few seconds, no more: quicker than seven plants picked one by one
    expect(sweepSecs(s)).toBeGreaterThan(2.5);
    expect(sweepSecs(s)).toBeLessThan(4.5);
    // the last plant is passed about twice as fast as the first: the row's far end is its hardest
    expect(paceAt(s, when(s, 6.5)) / paceAt(s, when(s, 0.5))).toBeGreaterThan(1.6);
  });

  it("begins before the first plant there is and ends after the last, wherever they stand in the row", () => {
    const s = startSweep([5, 2, 3]);
    expect(s.places).toEqual([2, 3, 5]);
    expect(s.from).toBe(2 - SWEEP.lead);
    expect(s.to).toBe(6 + SWEEP.tail);
    expect(sweepSecs(s)).toBeLessThan(sweepSecs(startSweep([0, 6])));
  });

  it("cuts a plant well when the blade is within its mark, badly when it is in its plot but outside the mark; a plant is cut once", () => {
    let s = startSweep([0, 1, 2]);
    const half = s.bands[0] / 2;
    expect(over(s, when(s, 0.5))).toBe(0);
    // the first, at its middle: well
    s = swing(s, when(s, 0.5));
    expect(s.cut).toEqual([true, null, null]);
    // again in the same plot: nothing changes of it, and the swing is air
    s = swing(s, when(s, 0.9));
    expect(s.cut).toEqual([true, null, null]);
    expect(s.air).toBe(1);
    // the second, just outside its mark: badly
    s = swing(s, when(s, 1.5 + half + 0.02));
    expect(s.cut).toEqual([true, false, null]);
    // the third, just inside: well
    s = swing(s, when(s, 2.5 - half + 0.01));
    expect(cuts(s)).toEqual([true, false, true]);
  });

  it("a plant passed with no swing was cut badly; a swing where no plant stands, before the row or after it, is air", () => {
    let s = startSweep([1, 4]);
    s = swing(s, when(s, 0.5));
    expect(s.air).toBe(1);
    s = swing(s, when(s, 2.7));
    expect(s.air).toBe(2);
    s = swing(s, when(s, 4.5));
    expect(cuts(s)).toEqual([false, true]);
    // once it has run out nothing more is cut
    const over_ = swing(startSweep([1]), 99);
    expect(over_.cut).toEqual([null]);
    expect(cuts(over_)).toEqual([false]);
  });

  it("a keen eye widens every cut, tired hands have a narrower cut and a quicker blade, and a harder plant a narrower cut of its own", () => {
    const plain = startSweep([0, 1, 2]);
    expect(plain.bands).toEqual([SWEEP.zone, SWEEP.zone, SWEEP.zone]);
    expect(startSweep([0], { buff: 1.3 }).bands[0]).toBeCloseTo(SWEEP.zone * 1.3, 12);
    expect(startSweep([0], { buff: 9 }).bands[0]).toBe(SWEEP.most);
    const tired = startSweep([0, 1, 2], { spent: true });
    expect(tired.bands[0]).toBeCloseTo(SWEEP.zone * TIMING.spent.zone, 12);
    expect(tired.speed).toBeCloseTo(SWEEP.speed * TIMING.spent.speed, 12);
    expect(sweepSecs(tired)).toBeLessThan(sweepSecs(plain));
    // (how hard each is goes with its plant, whatever order they are told in)
    const mixed = startSweep([4, 0, 2], {}, [1.24, 1, 1.56]);
    expect(mixed.places).toEqual([0, 2, 4]);
    expect(mixed.bands[0]).toBe(SWEEP.zone);
    expect(mixed.bands[1]).toBeCloseTo(SWEEP.zone / 1.56, 12);
    expect(mixed.bands[2]).toBeCloseTo(SWEEP.zone / 1.24, 12);
    // (nothing is ever made easier by it)
    expect(startSweep([0], {}, [0.5]).bands[0]).toBe(SWEEP.zone);
  });

  it("gives a practised hand most of a row and nobody all of it for nothing: the time within a cut at each end of the row", () => {
    const s = startSweep([0, 1, 2, 3, 4, 5, 6]), within = (place: number) => (s.bands[0] / paceAt(s, when(s, place + 0.5))) * 1000;
    // (the members' presses are off by about 70 thousandths of a second either way; a practised hand's by 35)
    expect(within(0)).toBeGreaterThan(200);
    expect(within(6)).toBeGreaterThan(110);
    expect(within(6)).toBeLessThan(160);
    const tired = startSweep([0, 1, 2, 3, 4, 5, 6], { spent: true }), tiredWithin = (tired.bands[0] / paceAt(tired, when(tired, 6.5))) * 1000;
    expect(tiredWithin).toBeLessThan(within(6) / 2.5);
  });
});

describe("good things are harder for the skilled: a narrower mark in the farm's games", () => {
  it("leaves of a width its own part, never more than the whole, and all of it where nothing is said", () => {
    expect(narrowed({})).toBe(1);
    expect(narrowed({ hard: 1 })).toBe(1);
    expect(narrowed({ hard: 0.5 })).toBe(1);
    expect(narrowed({ hard: 1.08 })).toBeCloseTo(1 / 1.08, 12);
    expect(narrowed({ hard: 1.56 })).toBeCloseTo(1 / 1.56, 12);
  });

  it("narrows the hoe's stretch, the pouring's marks and the ring tired hands steady in, and nothing else of them", () => {
    const plain = startRound(3, { spent: true, drops: true }, 7), hard = startRound(3, { spent: true, drops: true, hard: 1.24 }, 7);
    expect(hard.width).toBeCloseTo(plain.width / 1.24, 12);
    expect({ ...hard, width: 0, lo: 0 }).toEqual({ ...plain, width: 0, lo: 0 });
    const pour = startPour(2, { spent: true, drops: true }, 7), hardPour = startPour(2, { spent: true, drops: true, hard: 1.24 }, 7);
    expect(hardPour.width).toBeCloseTo(pour.width / 1.24, 12);
    expect(hardPour.need).toBe(pour.need);
    const hands = startHands(2, { spent: true, drops: true }, 7), hardHands = startHands(2, { spent: true, drops: true, hard: 1.24 }, 7);
    expect(hardHands.ring).toBeCloseTo(hands.ring / 1.24, 12);
    expect({ ...hardHands, ring: 0 }).toEqual({ ...hands, ring: 0 });
  });
});
