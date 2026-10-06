import { describe, expect, it } from "vitest";
import { LONG, atMarks, front, frontAt, longOver, longSecs, pourOn, reached, startLong, type LongPour } from "./longpour";
import { POURING } from "./pouring";
import { TIMING } from "./timing";

const ROW = [0, 1, 2, 3, 4, 5, 6];
/** Hold the button until the water has got so far along the row, and let go. */
function pourTo(s: LongPour, x: number): LongPour {
  let g = s;
  for (let i = 0; i < 20000 && !longOver(g) && front(g) < x; i++) g = pourOn(g, true, 0.001);
  return pourOn(g, false, 0.001);
}

describe("the long pour: a row of somebody else's watered at one pour", () => {
  it("runs from before the first plant, ever onward, gathering pace, and never evenly", () => {
    const s = startLong(ROW, {}, 1, 7);
    expect(s.from).toBe(-LONG.lead);
    expect(s.end).toBe(6.5);
    let last = frontAt(s, 0);
    expect(last).toBeCloseTo(s.from, 9);
    const paces: number[] = [];
    for (let t = 0.05; t < 4; t += 0.05) { const x = frontAt(s, t); expect(x).toBeGreaterThan(last); paces.push((x - last) / 0.05); last = x; }
    expect(paces[paces.length - 1]).toBeGreaterThan(paces[0] * 1.5);
    // (it wavers: its pace does not only rise)
    expect(paces.some((p, i) => i > 0 && p < paces[i - 1])).toBe(true);
    // (another seed wavers otherwise: no pour is learnt by counting)
    expect(frontAt(startLong(ROW, {}, 1, 8), 1.5)).not.toBeCloseTo(frontAt(s, 1.5), 3);
  });

  it("nothing is poured until the button is held; let go, the water stops where it had got to, once", () => {
    let s = startLong(ROW, {}, 1, 3);
    s = pourOn(s, false, 1);
    expect([s.t, longOver(s)]).toEqual([0, false]);
    s = pourTo(s, 2.6);
    expect(longOver(s)).toBe(true);
    expect(reached(s)).toEqual([true, true, true, false, false, false, false]);
    // (it is over: held again, nothing more is poured)
    expect(pourOn(s, true, 1)).toBe(s);
  });

  it("let go between the marks the whole row is watered; sooner, the plants it had not reached get none", () => {
    const s = startLong(ROW, {}, 1, 3);
    const whole = pourTo(s, s.end + s.zone / 2);
    expect([atMarks(whole), whole.spilt]).toEqual([true, false]);
    expect(reached(whole)).toEqual(ROW.map(() => true));
    // (a plant is reached at its middle: a hair short of the last one's, six of seven)
    expect(reached(pourTo(s, s.end - 0.05))).toEqual([true, true, true, true, true, true, false]);
    expect(reached(pourTo(s, 0.2))).toEqual(ROW.map(() => false));
  });

  it("held past the marks it is spilt, and the row's last plants get none: never the whole row, never nothing", () => {
    let s = startLong(ROW, {}, 1, 3);
    for (let i = 0; i < 20000 && !longOver(s); i++) s = pourOn(s, true, 0.001);
    expect([s.spilt, s.at]).toEqual([true, null]);
    expect(reached(s)).toEqual([true, true, true, true, true, false, false]);
    let two = startLong([2, 5], {}, 1, 3);
    for (let i = 0; i < 20000 && !longOver(two); i++) two = pourOn(two, true, 0.001);
    expect(reached(two)).toEqual([true, false]);
  });

  it("a row with gaps is poured along from its first plant to its last", () => {
    const s = startLong([5, 1, 3], {}, 1, 3);
    expect([s.places, s.from, s.end]).toEqual([[1, 3, 5], 1 - LONG.lead, 5.5]);
    expect(reached(pourTo(s, 3.6))).toEqual([true, true, false]);
  });

  it("is longer and harder than one plant's pour: three seconds and more, and marks no longer in passing than a plant's", () => {
    const s = startLong(ROW, {}, 1, 3), secs = longSecs(s);
    expect(secs).toBeGreaterThan(3 * POURING.full);
    expect(secs).toBeLessThan(LONG.longest / 2);
    // how long the water is between the marks, beside how long one plant's is between its own
    const pace = (frontAt(s, secs + 0.01) - frontAt(s, secs)) / 0.01, inMarks = s.zone / pace, onePlant = POURING.marks * POURING.full;
    expect(inMarks).toBeLessThanOrEqual(onePlant * 1.25);
    expect(inMarks).toBeGreaterThan(onePlant * 0.6);
  });

  it("tired hands have narrower marks and quicker water; a better can, steady hands and a wider game widen the marks; a harder row narrows them", () => {
    const plain = startLong(ROW, {}, 1, 3), tired = startLong(ROW, { spent: true }, 1, 3);
    expect(tired.zone).toBeCloseTo(plain.zone * TIMING.spent.zone, 9);
    expect(longSecs(tired)).toBeLessThan(longSecs(plain));
    expect(startLong(ROW, { tool: 2.25 }, 1, 3).zone).toBeCloseTo(plain.zone * 1.5, 9);
    expect(startLong(ROW, { buff: 1.2 }, 1, 3).zone).toBeCloseTo(plain.zone * 1.2, 9);
    expect(startLong(ROW, { wide: 2 }, 1, 3).zone).toBeCloseTo(plain.zone * 2, 9);
    expect(startLong(ROW, {}, 1.56, 3).zone).toBeCloseTo(plain.zone / 1.56, 9);
    expect(startLong(ROW, { wide: 9 }, 1, 3).zone).toBe(LONG.most);
  });
});
