import { describe, expect, it } from "vitest";
import {
  HANDING, aimOf, at, inMouth, landOf, landsAt, lurchOf, mark, otherSeed, readTold, slide, standOf, startHolding, startTipping, thrownAt, tiltFor, tip, wander,
  type Track,
} from "./handing";

/** A hand: how long it is before it moves after seeing what to do (seconds, and how much that varies), and how unsure it is of where it puts its thing (the tilt; the ground). */
interface Hand { late: number; vary: number; tilt: number; ground: number }
// (a member's hand, as slow and unsure as theirs were at the other games on their first day; and a very good one)
const MEMBER: Hand = { late: 0.38, vary: 0.07, tilt: 0.03, ground: 0.05 };
const GOOD: Hand = { late: 0.21, vary: 0.03, tilt: 0.009, ground: 0.018 };
/** A hand that is exactly where it means to be, a moment after it sees where. */
const SURE: Hand = { late: 0.15, vary: 0, tilt: 0, ground: 0 };

function rng(seed: number) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/**
 * One handing-over played out by two made-up hands (either may be nobody: a hand that does nothing), each page
 * hearing of the other so much late. Whoever throws has the board from the button (a lag before the other is asked)
 * and knows where the bucket will stand; a moment after seeing it the hand tips the bucket so far, against its own
 * sway as it was a moment ago. Whoever takes it sees the water as it flies, and a moment later moves the bucket to
 * where it comes down, against theirs.
 */
function go(seed: number, from: Hand | null, to: Hand | null, tired: [boolean, boolean], lag = 0.2) {
  const r = rng(seed ^ 0x9e3779b9), dt = 1 / 120, place = standOf(seed), up = -HANDING.count - lag;
  let p = { ...startTipping(tired[0], seed), t: up }, h = { ...startHolding(tired[1], otherSeed(seed), place), t: up };
  const fromLate = from ? Math.max(0.12, from.late + from.vary * gauss(r)) : 0, toLate = to ? Math.max(0.12, to.late + to.vary * gauss(r)) : 0;
  const eg = from ? from.tilt * gauss(r) : 0, et = to ? to.ground * gauss(r) : 0;
  for (let T = up; T < landsAt() - 1e-9; T += dt) {
    let wantTilt = 0;
    if (from && T >= up + fromLate) wantTilt = tiltFor(place) - (tired[0] ? HANDING.tired.sway.tilt * wander(seed, T - fromLate - HANDING.aim).sway : 0) + eg;
    p = tip(p, wantTilt, dt);
    let wantB = h.hand;
    if (to) {
      const mine = tired[1] ? HANDING.tired.sway.bucket * wander(otherSeed(seed), T - toLate - landsAt()).sway : 0;
      if (T >= thrownAt() + toLate && p.thrown !== null) wantB = landOf(p.thrown, seed) - mine + et;
      else if (tired[1] && T >= -HANDING.count + toLate) wantB = place - mine;
    }
    h = slide(h, wantB, dt);
  }
  const landing = landOf(p.thrown ?? 0, seed);
  return { won: inMouth(landing, h.x), landing, bucket: h.x, aimed: p.thrown, place };
}
/** The share of so many goes in which the water was handed on. */
const rate = (from: Hand | null, to: Hand | null, tired: [boolean, boolean], n = 400, lag = 0.2) => {
  let won = 0;
  for (let s = 1; s <= n; s++) if (go(s * 7919 + 13, from, to, tired, lag).won) won++;
  return won / n;
};

describe("water handed on, a game for two at once (the owner, 2026-10-06: \"minigame ตอนส่งน้ำ เป็นแบบเล่นพร้อมกัน\")", () => {
  it("is one throw, and short: half a second to aim, a swing, and the water in the air (\"ต้องทำให้ minigame จบเร็วที่สุด\")", () => {
    expect(thrownAt()).toBeCloseTo(HANDING.aim + HANDING.swing);
    expect(landsAt()).toBeCloseTo(thrownAt() + HANDING.flight);
    // from the first moment to the last: well under two seconds, with next to nothing waited for before it
    expect(landsAt()).toBeLessThan(1.5);
    expect(HANDING.count).toBeLessThan(0.5);
    // and the water is in the air long enough for a hand to answer it (\"เน้น reaction เร็วๆ\", and \"ถ้ายากไป คนจะไม่เล่น\")
    expect(HANDING.flight).toBeGreaterThanOrEqual(0.5);
    expect(HANDING.flight).toBeLessThanOrEqual(0.8);
  });

  it("the further the bucket is tipped the further the water is aimed; short of the lip it is not thrown at all", () => {
    expect(aimOf(0)).toBe(0);
    expect(aimOf(HANDING.lip)).toBe(0);
    expect(aimOf(tiltFor(0.6))).toBeCloseTo(0.6);
    expect(aimOf(tiltFor(1))).toBeCloseTo(1);
    expect(aimOf(1)).toBe(HANDING.far);
    expect(aimOf(0.5)).toBeGreaterThan(aimOf(0.4));
  });

  it("the aim is fixed after its moment: the hand can do nothing about the throw then", () => {
    let p = startTipping(false, 3);
    expect([p.t, p.thrown]).toEqual([-HANDING.count, null]);
    // while it may still be aimed the bucket follows the hand
    while (p.t < HANDING.aim - 0.05) p = tip(p, tiltFor(0.6), 1 / 120);
    expect(p.thrown).toBeNull();
    expect(p.aim).toBeCloseTo(0.6);
    expect(p.tilt).toBe(p.hand);
    // then it is fixed, and stays what it was whatever the hand does
    while (p.t < HANDING.aim + 0.01) p = tip(p, tiltFor(0.6), 1 / 120);
    expect(p.thrown).toBeCloseTo(0.6);
    const was = p.thrown;
    for (let i = 0; i < 60; i++) p = tip(p, 1, 1 / 120);
    expect(p.thrown).toBe(was);
    expect(p.t).toBeGreaterThan(thrownAt());
    // a bucket never tipped throws nothing: it comes down nowhere a bucket can be
    let idle = startTipping(false, 3);
    while (idle.thrown === null) idle = tip(idle, 0, 1 / 120);
    expect(idle.thrown).toBe(0);
    expect(landOf(idle.thrown!, 3)).toBe(0);
    expect(inMouth(landOf(0, 3), HANDING.near)).toBe(false);
  });

  it("thrown water never comes down just where it was aimed: one way or the other, further off than a bucket's mouth reaches", () => {
    const [lo, hi] = HANDING.lurch;
    let left = 0, right = 0;
    for (let s = 1; s <= 400; s++) {
      const l = lurchOf(s * 31 + 7);
      expect(Math.abs(l)).toBeGreaterThanOrEqual(lo);
      expect(Math.abs(l)).toBeLessThanOrEqual(hi);
      if (l < 0) left++; else right++;
      // the same for the same seed: both pages have it
      expect(lurchOf(s * 31 + 7)).toBe(l);
      expect(landOf(0.6, s * 31 + 7)).toBeCloseTo(0.6 + l);
    }
    expect(Math.min(left, right)).toBeGreaterThan(150);
    // a bucket that does not move never has it: whoever takes the water has to move
    expect(lo).toBeGreaterThan(HANDING.mouth);
    expect(inMouth(landOf(0.6, 5), 0.6)).toBe(false);
    expect(inMouth(landOf(0.6, 5), 0.6 + lurchOf(5))).toBe(true);
    expect(inMouth(0.6, 0.6 + HANDING.mouth - 0.01)).toBe(true);
    expect(inMouth(0.6, 0.6 + HANDING.mouth + 0.01)).toBe(false);
  });

  it("the other's bucket stands somewhere new each time, about the middle: water aimed at it comes down on the ground whichever way it goes", () => {
    const [lo, hi] = HANDING.stand;
    const places = Array.from({ length: 300 }, (_, i) => standOf(i * 131 + 3));
    expect(Math.min(...places)).toBeGreaterThanOrEqual(lo);
    expect(Math.max(...places)).toBeLessThanOrEqual(hi);
    expect(Math.max(...places) - Math.min(...places)).toBeGreaterThan((hi - lo) * 0.9);
    expect(standOf(77)).toBe(standOf(77));
    // (where a bucket may stand reaches from `near` to 1: it can get under the water at either end)
    expect(lo - HANDING.lurch[1]).toBeGreaterThanOrEqual(HANDING.near);
    expect(hi + HANDING.lurch[1]).toBeLessThanOrEqual(1 + HANDING.mouth);
    const h = startHolding(false, 9, standOf(9));
    expect(h.x).toBe(standOf(9));
    expect(h.hand).toBe(h.x);
  });

  it("what one page tells the other is a track: straight between two moments, staying after the last", () => {
    const track: Track = [];
    expect(at(track, 1)).toBe(0);
    // (told out of turn, a moment is put where it belongs; told twice, it is the later word)
    mark(track, 0, 0.2); mark(track, 2, 0.4); mark(track, 1, 0.6); mark(track, 1, 0.6); mark(track, 2, 0.4);
    expect(track).toEqual([[0, 0.2], [1, 0.6], [2, 0.4]]);
    expect(at(track, -1)).toBe(0.2);
    expect(at(track, 0.5)).toBeCloseTo(0.4);
    expect(at(track, 1.5)).toBeCloseTo(0.5);
    expect(at(track, 7)).toBe(0.4);
  });

  it("tired hands shake and are slow, and only theirs: the other's are as they were", () => {
    // with stamina the bucket is where the hand is
    let fresh = startHolding(false, 9, 0.6), weary = startHolding(true, 9, 0.6), most = 0;
    for (let i = 0; i < 190; i++) { fresh = slide(fresh, 0.7, 1 / 120); weary = slide(weary, 0.7, 1 / 120); most = Math.max(most, Math.abs(weary.x - weary.hand)); }
    expect(fresh.x).toBeCloseTo(0.7);
    expect(fresh.x).toBe(fresh.hand);
    expect(weary.hand).toBeCloseTo(0.7);
    // with none it wanders from the hand, by about as much as the mouth reaches
    expect(most).toBeGreaterThan(HANDING.mouth * 0.8);
    // and follows the hand slower
    const afterTenth = (tired: boolean) => { let b = startHolding(tired, 9, 0.3); for (let i = 0; i < 12; i++) b = slide(b, 1, 1 / 120); return b.hand; };
    expect(afterTenth(true)).toBeLessThan(afterTenth(false));
    // the same of the bucket that is thrown from
    let a = startTipping(false, 9), b = startTipping(true, 9), off = 0;
    while (a.thrown === null) { a = tip(a, 0.4, 1 / 120); b = tip(b, 0.4, 1 / 120); off = Math.max(off, Math.abs(b.tilt - b.hand)); expect(a.tilt).toBe(a.hand); }
    expect(off).toBeGreaterThan(0.08);
    // the sway is near the middle and going fastest at the moment that counts for that hand (a hand that only goes where the thing should be is carried past)
    expect(Math.abs(wander(9, 0).sway)).toBeLessThan(0.3);
    expect(Math.abs(wander(9, 0.15).sway - wander(9, -0.15).sway)).toBeGreaterThan(0.6);
    // a hand may go past either end against it; and the two do not shake alike
    let past = startHolding(true, 9, 0.6);
    for (let i = 0; i < 240; i++) past = slide(past, 9, 1 / 120);
    expect(past.hand).toBeCloseTo(1 + HANDING.spare);
    expect(past.x).toBeLessThanOrEqual(1);
    expect(otherSeed(9)).not.toBe(9);
  });

  it("two sure hands hand it over every time; one alone does not: it takes both", () => {
    const one = go(101, SURE, SURE, [false, false]);
    expect(one.won).toBe(true);
    expect(one.aimed).toBeCloseTo(one.place);
    expect(Math.abs(one.landing - one.bucket)).toBeLessThan(0.02);
    expect(rate(SURE, SURE, [false, false], 200)).toBe(1);
    // nobody throwing: nothing; nobody getting the bucket under it: nothing, however well it was aimed
    expect(rate(null, SURE, [false, false], 100)).toBe(0);
    expect(rate(SURE, null, [false, false], 100)).toBe(0);
    // (aimed by an unsure hand it now and then comes down on a bucket nobody moved: seldom)
    expect(rate(MEMBER, null, [false, false])).toBeLessThan(0.25);
  });

  it("with stamina it is easy (\"ถ้ายากไป คนจะไม่เล่น และจะเดินส่งคนเดียว\"); with none it is much harder for whoever has none, and hardest when neither has", () => {
    const fresh = rate(MEMBER, MEMBER, [false, false]), throws = rate(MEMBER, MEMBER, [true, false]), takes = rate(MEMBER, MEMBER, [false, true]), both = rate(MEMBER, MEMBER, [true, true]);
    expect(fresh).toBeGreaterThan(0.96);
    expect(throws).toBeLessThan(fresh - 0.12);
    expect(takes).toBeLessThan(fresh - 0.25);
    expect(both).toBeLessThan(Math.min(throws, takes));
    expect(both).toBeLessThan(fresh / 2);
    // still to be done by a very good hand (the owner's rule for every game: "ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก")
    expect(rate(GOOD, GOOD, [false, false])).toBe(1);
    expect(rate(GOOD, GOOD, [true, false])).toBeGreaterThan(0.85);
    expect(rate(GOOD, GOOD, [false, true])).toBeGreaterThan(0.82);
    expect(rate(GOOD, GOOD, [true, true])).toBeGreaterThan(0.55);
    // and a quick hand is what counts: the same unsure hand, only quicker, does better with tired hands
    expect(rate(MEMBER, { ...MEMBER, late: GOOD.late }, [false, true])).toBeGreaterThan(takes + 0.08);
  });

  it("what one page hears of the other late changes nothing: whoever throws has the board from the button, and the aim is fixed a swing before the water flies", () => {
    expect(rate(MEMBER, MEMBER, [false, false], 300, 0.05)).toBeGreaterThan(0.96);
    expect(rate(MEMBER, MEMBER, [false, false], 300, 0.5)).toBeGreaterThan(0.96);
    expect(HANDING.swing).toBeGreaterThanOrEqual(0.15);
  });

  it("only what another page may say is read", () => {
    expect(readTold({ k: "ask", m: "ab12cd34", s: true, z: 77 })).toEqual({ k: "ask", m: "ab12cd34", s: true, z: 77 });
    expect(readTold({ k: "ok", m: "ab12cd34", s: false, t0: 1_780_000_000_000 })).toEqual({ k: "ok", m: "ab12cd34", s: false });
    expect(readTold({ k: "no", m: "ab12cd34", w: "away" })).toEqual({ k: "no", m: "ab12cd34", w: "away" });
    expect(readTold({ k: "g", m: "ab12cd34", t: 0.2, q: 0.6, a: 0.5, extra: 1 })).toEqual({ k: "g", m: "ab12cd34", t: 0.2, q: 0.6, a: 0.5 });
    expect(readTold({ k: "g", m: "ab12cd34", t: 0.5, q: 0.7, a: 0.46, e: true })).toEqual({ k: "g", m: "ab12cd34", t: 0.5, q: 0.7, a: 0.46, e: true });
    expect(readTold({ k: "t", m: "ab12cd34", t: 1.2, b: 0.6 })).toEqual({ k: "t", m: "ab12cd34", t: 1.2, b: 0.6 });
    expect(readTold({ k: "end", m: "ab12cd34", c: true })).toEqual({ k: "end", m: "ab12cd34", c: true });
    expect(readTold({ k: "bye", m: "ab12cd34" })).toEqual({ k: "bye", m: "ab12cd34" });
    for (const bad of [
      null, "ask", 7, {}, { k: "ask", m: "x", s: true, z: 1 }, { k: "ask", m: "AB12CD34", s: true, z: 1 }, { k: "ask", m: "ab12cd34", s: 1, z: 1 }, { k: "ask", m: "ab12cd34", s: true, z: 1.5 },
      { k: "ok", m: "ab12cd34", s: "yes" }, { k: "no", m: "ab12cd34", w: "rude" }, { k: "g", m: "ab12cd34", t: 0.2, q: 9, a: 0.5 }, { k: "g", m: "ab12cd34", t: 1e9, q: 0.5, a: 0.5 },
      { k: "g", m: "ab12cd34", t: 0.2, q: Number.NaN, a: 0.5 }, { k: "t", m: "ab12cd34", t: 1, b: 0 }, { k: "t", m: "ab12cd34", t: 1, b: 2 }, { k: "end", m: "ab12cd34", c: 1 }, { k: "win", m: "ab12cd34" },
    ]) expect(readTold(bad)).toBeNull();
  });
});
