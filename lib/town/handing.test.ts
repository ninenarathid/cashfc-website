import { describe, expect, it } from "vitest";
import { HANDING, canThrow, caught, inTime, readTold, shownAt, sideOf, type Side } from "./handing";

function rng(seed: number) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** A hand: how long it is before it presses the side it has been shown (seconds, and how much that varies), and how often it presses the wrong one first. */
interface Hand { late: number; vary: number; wrong: number }
// (a member's, as slow as theirs were at the other games on their first day; and a very good one)
const MEMBER: Hand = { late: 0.38, vary: 0.08, wrong: 0.06 };
const GOOD: Hand = { late: 0.24, vary: 0.04, wrong: 0.01 };

/** One catch by a made-up hand: it presses a side a moment after being shown which, and once more if that was the wrong one and there is time. */
function take(seed: number, hand: Hand, tired: boolean): boolean {
  const r = rng(seed ^ 0x9e3779b9), side = sideOf(seed);
  const first = shownAt(tired) + Math.max(0.12, hand.late + hand.vary * gauss(r));
  let put: Side | 0 = 0;
  if (inTime(first)) put = r() < hand.wrong ? (-side as Side) : side;
  // (the wrong side seen and put right: as long again)
  const again = first + Math.max(0.12, hand.late + hand.vary * gauss(r));
  if (put !== side && put !== 0 && inTime(again)) put = side;
  return caught(side, put);
}
const takes = (hand: Hand, tired: boolean, n = 2000) => { let won = 0; for (let s = 1; s <= n; s++) if (take(s * 7919 + 13, hand, tired)) won++; return won / n; };

/** How long it is from the other's being ready to the water flying, for a made-up hand that presses a moment after it may. */
function throwAfter(seed: number, hand: Hand, tired: boolean): number {
  const r = rng(seed ^ 0x51ed27), dt = 1 / 120;
  let numb = 0, sawAt: number | null = null, due = Infinity;
  for (let t = 0; t < 30; t += dt) {
    const lit = canThrow(tired, seed, t) && t >= numb;
    if (lit && sawAt === null) { sawAt = t; due = t + Math.max(0.1, hand.late * 0.8 + hand.vary * gauss(r)); }
    if (!lit && sawAt !== null && t < due) { /* it went dark before the hand came: the press that is on its way lands in the dark */ }
    if (t >= due) {
      if (canThrow(tired, seed, t) && t >= numb) return t;
      numb = t + HANDING.fumble; sawAt = null; due = Infinity;
    }
  }
  return 30;
}
const throwsIn = (hand: Hand, tired: boolean, n = 600) => { let sum = 0; for (let s = 1; s <= n; s++) sum += throwAfter(s * 104729 + 7, hand, tired); return sum / n; };

describe("water handed on with no stamina, a game for two (the owner, 2026-10-06: \"เอาให้ง่ายๆไปเลย แต่ยังเร็วอยู่ได้ไหม\")", () => {
  it("is short: the water is in the air under a second, and a board does not stay up for somebody who went away", () => {
    expect(HANDING.flight).toBeGreaterThanOrEqual(0.7);
    expect(HANDING.flight).toBeLessThanOrEqual(1);
    expect(HANDING.limit).toBeLessThanOrEqual(30);
  });

  it("the water flies to the left or to the right, by the seed the two pages share", () => {
    let left = 0, right = 0;
    for (let s = 1; s <= 600; s++) { const side = sideOf(s * 31 + 7); expect(sideOf(s * 31 + 7)).toBe(side); if (side < 0) left++; else right++; }
    expect(Math.min(left, right)).toBeGreaterThan(240);
    // caught: the bucket was put to that side, and to no other; a bucket left where it stood has none of it
    expect(caught(1, 1)).toBe(true);
    expect(caught(-1, -1)).toBe(true);
    expect(caught(1, -1)).toBe(false);
    expect(caught(1, 0)).toBe(false);
  });

  it("a press counts until the water has landed, and a blink after for a screen that shows it late", () => {
    expect(inTime(0)).toBe(true);
    expect(inTime(HANDING.flight)).toBe(true);
    expect(inTime(HANDING.flight + HANDING.grace)).toBe(true);
    expect(inTime(HANDING.flight + HANDING.grace + 0.01)).toBe(false);
  });

  it("with stamina the taker is shown which way from the moment it flies; tired hands only late in its flight", () => {
    expect(shownAt(false)).toBe(0);
    expect(shownAt(true)).toBeCloseTo(HANDING.flight - HANDING.late);
    expect(shownAt(true)).toBeGreaterThan(0.3);
    // (still long enough for a hand to answer: it is meant to be done)
    expect(HANDING.late).toBeGreaterThanOrEqual(0.4);
  });

  it("with stamina a bucket is thrown whenever its holder likes; tired hands only on its forward swing, never at the first moment", () => {
    for (let t = 0; t < 5; t += 0.05) expect(canThrow(false, 77, t)).toBe(true);
    for (let s = 1; s <= 200; s++) {
      const seed = s * 131 + 3;
      expect(canThrow(true, seed, 0)).toBe(false);
      // the first forward swing comes within a second, and lasts as long as a swing's forward part
      let first = -1, lit = 0;
      for (let i = 0; i < 1200; i++) { const t = i / 1000; if (canThrow(true, seed, t)) { if (first < 0) first = t; lit++; } }
      expect(first).toBeGreaterThan(0.3);
      expect(first).toBeLessThan(0.8);
      expect(lit / 1000).toBeCloseTo(HANDING.forward, 1);
      // and it comes round again a swing later
      expect(canThrow(true, seed, first + 0.05 + HANDING.swing)).toBe(true);
      expect(canThrow(true, seed, first + HANDING.forward + 0.05)).toBe(false);
    }
    expect(canThrow(true, 5, -1)).toBe(false);
  });

  it("is easy: a member with stamina catches it all but always, and a tired one most times (\"ถ้ายากไป คนจะไม่เล่น และจะเดินส่งคนเดียว\")", () => {
    const fresh = takes(MEMBER, false), tired = takes(MEMBER, true);
    expect(fresh).toBeGreaterThan(0.99);
    // harder with no stamina, for whoever has none: and still most times
    expect(tired).toBeLessThan(fresh - 0.04);
    expect(tired).toBeGreaterThan(0.8);
    // a quick hand is what counts
    expect(takes(GOOD, true)).toBeGreaterThan(0.99);
  });

  it("tired hands that throw lose a little time, never the water", () => {
    expect(throwsIn(MEMBER, false)).toBeLessThan(0.5);
    const tired = throwsIn(MEMBER, true);
    expect(tired).toBeGreaterThan(throwsIn(MEMBER, false) + 0.3);
    expect(tired).toBeLessThan(2.5);
  });

  it("only what another page may say is read", () => {
    expect(readTold({ k: "ask", m: "ab12cd34", s: true, z: 77 })).toEqual({ k: "ask", m: "ab12cd34", s: true, z: 77 });
    expect(readTold({ k: "ok", m: "ab12cd34", s: false, more: 1 })).toEqual({ k: "ok", m: "ab12cd34", s: false });
    expect(readTold({ k: "no", m: "ab12cd34", w: "away" })).toEqual({ k: "no", m: "ab12cd34", w: "away" });
    expect(readTold({ k: "r", m: "ab12cd34" })).toEqual({ k: "r", m: "ab12cd34" });
    expect(readTold({ k: "th", m: "ab12cd34", side: 1 })).toEqual({ k: "th", m: "ab12cd34" });
    expect(readTold({ k: "p", m: "ab12cd34", d: -1 })).toEqual({ k: "p", m: "ab12cd34", d: -1 });
    expect(readTold({ k: "end", m: "ab12cd34", c: true })).toEqual({ k: "end", m: "ab12cd34", c: true });
    expect(readTold({ k: "bye", m: "ab12cd34" })).toEqual({ k: "bye", m: "ab12cd34" });
    for (const bad of [
      null, "ask", 7, {}, { k: "ask", m: "x", s: true, z: 1 }, { k: "ask", m: "AB12CD34", s: true, z: 1 }, { k: "ask", m: "ab12cd34", s: 1, z: 1 }, { k: "ask", m: "ab12cd34", s: true, z: 1.5 },
      { k: "ok", m: "ab12cd34", s: "yes" }, { k: "no", m: "ab12cd34", w: "rude" }, { k: "end", m: "ab12cd34", c: 1 }, { k: "p", m: "ab12cd34", d: 0 }, { k: "p", m: "ab12cd34", d: 2 }, { k: "r" }, { k: "win", m: "ab12cd34" },
    ]) expect(readTold(bad)).toBeNull();
  });
});
