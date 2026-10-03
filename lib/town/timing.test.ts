import { describe, expect, it } from "vitest";
import { TIMING, finished, markerAt, over, press, startRound, type Round } from "./timing";

/** The first moment from `from` on at which the marker is over the stretch (or not), found by looking every millisecond. */
function when(r: Round, from: number, inside: boolean): number {
  for (let t = from; t < from + 20; t += 0.001) if (over(r, t) === inside) return t;
  throw new Error("never");
}

describe("the game of timing", () => {
  it("runs the marker to one end of the bar and back to the other, evenly", () => {
    const r = startRound(3, {}, 1), sweep = 1 / r.speed;
    expect(markerAt(r, 0)).toBe(0);
    expect(markerAt(r, sweep / 2)).toBeCloseTo(0.5, 6);
    expect(markerAt(r, sweep)).toBeCloseTo(1, 6);
    expect(markerAt(r, sweep * 1.5)).toBeCloseTo(0.5, 6);
    expect(markerAt(r, sweep * 2)).toBeCloseTo(0, 6);
    for (let t = 0; t < 10; t += 0.013) { const m = markerAt(r, t); expect(m).toBeGreaterThanOrEqual(0); expect(m).toBeLessThanOrEqual(1); }
  });

  it("counts a press over the stretch as a hit: the stretch moves, the marker quickens and carries on from where it was", () => {
    const r = startRound(3, {}, 7), t = when(r, 0, true) + 0.01, hit = press(r, t);
    expect(hit.hits).toBe(1);
    expect(hit.misses).toBe(0);
    expect(hit.speed).toBeCloseTo(r.speed * TIMING.quicken, 9);
    // the stretch is somewhere else, still on the bar
    expect(Math.abs(hit.lo - r.lo)).toBeGreaterThanOrEqual(r.width - 1e-9);
    expect(hit.lo).toBeGreaterThanOrEqual(TIMING.edge - 1e-9);
    expect(hit.lo + hit.width).toBeLessThanOrEqual(1 - TIMING.edge + 1e-9);
    // no jump: just after the press the marker is where it was just before
    expect(markerAt(hit, t)).toBeCloseTo(markerAt(r, t), 9);
    expect(Math.abs(markerAt(hit, t + 0.01) - markerAt(r, t))).toBeLessThan(0.05);
    // what it was given is left alone
    expect(r.hits).toBe(0);
  });

  it("counts a press anywhere else as a miss, and the work goes on", () => {
    const r = startRound(2, {}, 7), miss = press(r, when(r, 0, false));
    expect(miss).toEqual({ ...r, misses: 1 });
    expect(finished(miss)).toBe(false);
  });

  it("is done after so many hits, and takes no more presses", () => {
    let r = startRound(3, {}, 11), t = 0;
    for (let n = 0; n < 3; n++) { t = when(r, t, true) + 0.005; r = press(r, t); }
    expect(finished(r)).toBe(true);
    expect(r.hits).toBe(3);
    expect(press(r, t + 1)).toBe(r);
    // never faster than the fastest, however many hits
    let long = startRound(40, {}, 3), at = 0;
    for (let n = 0; n < 40; n++) { at = when(long, at, true) + 0.002; long = press(long, at); }
    expect(long.speed).toBeLessThanOrEqual(TIMING.fastest + 1e-9);
    expect(finished(long)).toBe(true);
  });

  it("is easier with a better tool and much harder with no stamina left", () => {
    const plain = startRound(3, {}, 5), good = startRound(3, { tool: 2.2 }, 5), spent = startRound(3, { spent: true }, 5);
    expect(good.width).toBeGreaterThan(plain.width * 1.3);
    expect(spent.width).toBeLessThan(plain.width * 0.7);
    expect(spent.speed).toBeGreaterThan(plain.speed * 1.2);
    // hard, not impossible: the stretch is never under a tenth of the bar, and the marker is over it for a tenth of a second and more
    expect(spent.width).toBeGreaterThanOrEqual(0.1);
    expect(plain.width / plain.speed).toBeGreaterThan(0.15);
    expect(spent.width / spent.speed).toBeGreaterThan(0.08);
    // the same seed is the same round
    expect(startRound(3, {}, 5)).toEqual(plain);
    expect(startRound(3, {}, 6)).not.toEqual(plain);
  });
});
