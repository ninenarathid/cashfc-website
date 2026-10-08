import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FELLING, barShare, beginPlay, brace, branchesOf, chop, headingFor, isOver, leastSecs, leave, missesOf, nearOf, onTheEdge, outcomeOf, paceNow, seen, startFelling, tick, timberOf,
  type Family, type Felling, type FellingAsk, type Girth, type Side,
} from "./felling";
import { LEVELS } from "./tools";
import { TREES } from "./trees";

function rng(seed: number) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/**
 * A made-up hand at the game. It chops to a beat, and is off the beat by so much either way (`vary`: the members' own
 * presses at the town's other games were off by about 0.07 s, a practised hand's by 0.035, a very good one's by 0.02;
 * a hand that has never played is slower to make its mind up and further off).
 * The beat is its own easy one (`mind`, and room for being off) while the bar is well filled, and quicker the lower
 * the bar runs, down to the fastest it can move (`fastest`). After a chop it takes the hand `mind`
 * seconds to have made its mind up about the next (and `see` more, of a branch that came into sight only with that
 * chop); a chop that falls before that is made from the side it stands on, as the last was: under a branch, a miss.
 * (It reads no family: a member who has learnt how a girth's branches come does better than this.)
 */
interface Hand { mind: number; vary: number; fastest: number; see: number }
const NEW: Hand = { mind: 0.5, vary: 0.1, fastest: 0.3, see: 0.4 };
const MEMBER: Hand = { mind: 0.36, vary: 0.07, fastest: 0.22, see: 0.3 };
const PRACTISED: Hand = { mind: 0.28, vary: 0.035, fastest: 0.17, see: 0.22 };
const GOOD: Hand = { mind: 0.21, vary: 0.02, fastest: 0.13, see: 0.16 };
/** The beat a hand keeps where nothing hurries it: its mind made up, with room for being off. */
const easy = (h: Hand) => h.mind + 3 * h.vary;
/** A hand keeps its easy beat while the bar has so many seconds in it, and is at its fastest when it has only so many. */
const CALM = 1.3, PANIC = 0.4;

/** One game played by a hand, from a seed; a friend braces the trunk once so many chops are made (never, under none). */
function play(hand: Hand, ask: FellingAsk, seed: number, braceAt = -1) {
  const game: Felling = startFelling(ask), r = rng(seed ^ 0x2545f491);
  let p = beginPlay(game), t = 0, last = 0;
  const shown = game.branches.map((_, i) => (i <= game.ahead ? -1e9 : Infinity));
  while (!isOver(game, p)) {
    const next = p.cut + 1 < game.chops ? game.branches[p.cut + 1] : 0;
    // the side it stands on (before the first chop: the side the first branch in sight is not on, read at leisure)
    const first = !p.running;
    const side: Side = p.side !== 0 && !first ? p.side : ((game.branches.find((b, i) => i > 0 && i <= game.ahead && b !== 0) ?? 1) === 1 ? -1 : 1);
    const must = next === side;
    let at = t, ready = true;
    if (!first) {
      // the beat: its own easy one while the bar is well filled, quicker the lower the bar is, the fastest it can when the bar is nearly out
      const secs = p.bar / paceNow(game, p), hurry = Math.max(0, Math.min(1, (CALM - secs) / (CALM - PANIC)));
      const beat = easy(hand) + (hand.fastest - easy(hand)) * hurry;
      at = last + Math.max(hand.fastest * 0.8, beat + hand.vary * gauss(r));
      const made = Math.max(last, shown[p.cut + 1] + hand.see) + hand.mind + hand.vary * gauss(r);
      ready = made <= at;
    }
    const to: Side = must && ready ? (-side as Side) : side;
    p = tick(game, p, at - t);
    t = at;
    if (isOver(game, p)) break; // the bar ran out on the way
    p = chop(game, p, to).play;
    if (braceAt >= 0 && p.cut === braceAt) p = brace(game, p);
    last = t;
    // what the chop brought into sight
    const i = p.cut + game.ahead;
    if (i < game.chops && shown[i] === Infinity) shown[i] = t;
  }
  return outcomeOf(game, p);
}
/** A pine of a girth, as lib/town/trees puts its game together for a plain axe (or as told otherwise). */
function gameOf(girth: Girth, spent: boolean, seed: number, more: { chops?: number; ahead?: number; slow?: number; spared?: number } = {}): FellingAsk {
  const g = TREES.girths[girth - 1];
  return { trees: [{ id: 1, girth, timber: g.timber }], chops: more.chops ?? g.chops, seed, girth, family: g.family, ahead: more.ahead ?? LEVELS.axe.ahead[0], pace: (spent ? g.spent : g.pace) * (1 - (more.slow ?? 0)), spent, spared: more.spared ?? 0 };
}
/** Many games at a pine of a girth: the share cut through, their misses on average, the share that won any fine timber, the fine timber on average, and the seconds a game took. */
function many(hand: Hand, girth: Girth, spent: boolean, more: { chops?: number; ahead?: number; slow?: number; spared?: number; brace?: number } = {}, n = 1500) {
  const bears = TREES.girths[girth - 1].timber;
  let through = 0, misses = 0, any = 0, timber = 0, secs = 0;
  for (let s = 1; s <= n; s++) {
    const out = play(hand, gameOf(girth, spent, s * 7919 + girth * 101, more), s * 104729 + 7, more.brace ?? -1), got = out.through ? timberOf(bears, out.misses) : 0;
    if (out.through) { through++; misses += out.misses; }
    if (got > 0) any++;
    timber += got;
    secs += out.secs;
  }
  return { through: through / n, misses: through ? misses / through : 0, any: any / n, timber: timber / n, secs: secs / n };
}
/** (`FELLING_TABLE=<a file> npx vitest run lib/town/felling.test.ts` writes what the hands made of each game there, a line a hand) */
const show = (label: string, rows: Record<string, ReturnType<typeof many>>) => {
  if (!process.env.FELLING_TABLE) return;
  for (const [who, r] of Object.entries(rows)) appendFileSync(process.env.FELLING_TABLE, `${label} ${who}: ${Object.entries(r).map(([k, v]) => `${k} ${Math.round(v * 100) / 100}`).join("  ")}
`);
};
const PLAIN = { ahead: LEVELS.axe.ahead[0], pace: 1 };

describe("a trunk, from a seed", () => {
  it("is the same trunk from the same seed, with nothing on its lowest segment, whatever its family", () => {
    for (const family of ["noise", "alternate", "pairs", "run"] as Family[]) for (let s = 1; s <= 200; s++) {
      const a = branchesOf(s * 31, 12, family);
      expect(a).toEqual(branchesOf(s * 31, 12, family));
      expect(a.length).toBe(12);
      expect(a[0]).toBe(0);
      expect(a.every((b) => b === -1 || b === 0 || b === 1)).toBe(true);
    }
    expect(branchesOf(5, 0).length).toBe(1);
    expect(branchesOf(5, 1, "run")).toEqual([0]);
  });

  it("of no family has branches on both sides, about as many as the knob says, and a branch is oftener across from the one before", () => {
    let branches = 0, left = 0, of = 0, turns = 0, pairs = 0;
    for (let s = 1; s <= 600; s++) {
      const b = branchesOf(s * 977 + 3, 12);
      let last = 0;
      for (const x of b.slice(1)) { of++; if (x) { branches++; if (x < 0) left++; if (last) { pairs++; if (x !== last) turns++; } last = x; } }
    }
    expect(Math.abs(branches / of - FELLING.branch)).toBeLessThan(0.03);
    expect(Math.abs(left / branches - 0.5)).toBeLessThan(0.04);
    expect(Math.abs(turns / pairs - FELLING.turn)).toBeLessThan(0.04);
  });

  it("of a family comes in that family's shape: turn about; in pairs; in long runs with a switch", () => {
    /** The branches of a trunk as runs: how many stand on a side before the side changes (bare segments left out). */
    const runs = (b: readonly number[]): number[] => {
      const out: number[] = [];
      let last = 0;
      for (const x of b) { if (!x) continue; if (x === last) out[out.length - 1]++; else { out.push(1); last = x; } }
      return out;
    };
    let left = 0, all = 0;
    for (let s = 1; s <= 300; s++) {
      // turn about: never two on a side together
      expect(Math.max(0, ...runs(branchesOf(s * 613, 16, "alternate")))).toBeLessThanOrEqual(1);
      // in pairs: two on a side (the first pair, and the last, may be cut short)
      const pairs = runs(branchesOf(s * 613, 16, "pairs"));
      expect(Math.max(...pairs)).toBeLessThanOrEqual(2);
      expect(pairs.slice(1, -1).every((n) => n === 2)).toBe(true);
      // a long run with a switch: so many on a side (the first run, and the last, may be cut short)
      const long = runs(branchesOf(s * 613, 24, "run"));
      expect(Math.max(...long)).toBeLessThanOrEqual(FELLING.families.run.to);
      expect(long.slice(1, -1).every((n) => n >= FELLING.families.run.from)).toBe(true);
      expect(long.length).toBeGreaterThan(2);
      for (const x of branchesOf(s * 613, 16, "run")) { if (x) { all++; if (x < 0) left++; } }
    }
    // and a family begins on either side
    expect(Math.abs(left / all - 0.5)).toBeLessThan(0.08);
  });
});

describe("a game, chop by chop", () => {
  const one = (chops: number, seed: number, more: Partial<FellingAsk> = {}) => startFelling({ trees: [{ id: 7, girth: 2, timber: [2, 0] }], chops, seed, girth: 2, family: "noise", ...PLAIN, ...more });
  /** The side a chop is safe from: the one the segment that comes level has no branch on. */
  const safe = (g: Felling, p: ReturnType<typeof beginPlay>): Side => (g.branches[p.cut + 1] === 1 ? -1 : 1);

  it("cuts the trunk through in as many chops as it takes, with no miss for whoever is never under a branch", () => {
    for (let s = 1; s <= 100; s++) {
      const g = one(12, s);
      let p = beginPlay(g), n = 0;
      while (!isOver(g, p)) { const did = chop(g, p, safe(g, p)); p = did.play; n++; expect(did.what).toBe(n === 12 ? "felled" : "cut"); }
      expect(n).toBe(12);
      expect(outcomeOf(g, p)).toMatchObject({ trees: [7], through: true, end: "through", misses: 0, chops: 12, cut: 12 });
    }
  });

  it("counts a miss for standing on the side a branch comes level on, and takes time off the bar for it", () => {
    const g = one(12, 11), at = g.branches.findIndex((b) => b !== 0);
    expect(at).toBeGreaterThan(0);
    let p = beginPlay(g);
    for (let i = 0; i < at - 1; i++) p = chop(g, p, safe(g, p)).play;
    const before = p.bar, did = chop(g, p, g.branches[at] as Side);
    expect(did.what).toBe("hit");
    expect(missesOf(did.play)).toBe(1);
    expect(did.play.bar).toBeLessThan(before + FELLING.bar.top);
  });

  it("stands still until the first chop, then the bar runs down, a chop puts some back, and run out the go is over with the trunk not cut through", () => {
    const g = one(12, 3);
    let p = beginPlay(g);
    expect(barShare(p)).toBeCloseTo(FELLING.bar.from / FELLING.bar.full);
    p = tick(g, p, 30);
    expect(p.bar).toBe(FELLING.bar.from);
    p = chop(g, p, safe(g, p)).play;
    const full = p.bar;
    p = tick(g, p, 0.5);
    expect(p.bar).toBeCloseTo(full - 0.5);
    const more = chop(g, p, safe(g, p)).play;
    expect(more.bar).toBeCloseTo(Math.min(FELLING.bar.full, p.bar + FELLING.bar.top));
    p = tick(g, more, 10);
    expect(isOver(g, p)).toBe(true);
    expect(outcomeOf(g, p)).toMatchObject({ through: false, end: "time", cut: 2 });
    expect(chop(g, p, 1).what).toBe(null);
  });

  it("runs the bar at the pace it is given: half as fast, twice the time", () => {
    const slow = one(12, 3, { pace: 0.5 });
    let p = chop(slow, beginPlay(slow), 1).play;
    const from = p.bar;
    p = tick(slow, p, 1);
    expect(p.bar).toBeCloseTo(from - 0.5);
  });

  it("shows branches only so far up, and nothing above the trunk's top", () => {
    const g = one(6, 21, { ahead: 2 });
    const p = beginPlay(g), rows = seen(g, p, 8);
    expect(rows[0]).toBe(0);
    expect(rows[1]).toBe(g.branches[1]);
    expect(rows[2]).toBe(g.branches[2]);
    expect(rows[3]).toBe(null);
    expect(rows[5]).toBe(null);
    expect(rows[6]).toBe("top");
    const after = chop(g, p, safe(g, p)).play;
    expect(seen(g, after, 8)[2]).toBe(g.branches[3]);
    expect(seen(g, after, 8)[5]).toBe("top");
  });

  it("forgives so many branches a game: no miss, and no time lost", () => {
    const g = one(12, 11, { spared: 1 }), b = g.branches;
    let p = beginPlay(g), hits = 0, forgiven = 0;
    // stand under every branch there is
    while (!isOver(g, p)) {
      const next = b[p.cut + 1], did = chop(g, p, (next || 1) as Side);
      if (did.what === "forgiven") forgiven++;
      if (did.what === "hit") hits++;
      p = did.play;
    }
    const branches = b.filter((x) => x !== 0).length;
    expect(forgiven).toBe(1);
    expect(hits).toBe(branches - 1);
    expect(outcomeOf(g, p).misses).toBe(branches - 1);
  });

  it("with no stamina: branches seen a segment later, and the axe dropped at the third miss (the pace is as it was given: a trunk's own for tired hands)", () => {
    const g = one(12, 11, { spent: true, pace: 1.22 });
    expect(g.most).toBe(FELLING.tired.misses);
    expect(g.ahead).toBe(PLAIN.ahead - FELLING.tired.later);
    expect(g.pace).toBeCloseTo(1.22);
    const b = g.branches;
    let p = beginPlay(g), last: string | null = null;
    while (!isOver(g, p)) { const did = chop(g, p, (b[p.cut + 1] || 1) as Side); last = did.what; p = did.play; }
    expect(last).toBe("dropped");
    expect(outcomeOf(g, p)).toMatchObject({ end: "dropped", through: false, misses: 3 });
    // and never fewer than one segment in sight
    expect(startFelling({ trees: [{ id: 1, girth: 1, timber: [2] }], chops: 4, seed: 1, girth: 1, family: "alternate", ahead: 1, pace: 1, spent: true }).ahead).toBe(FELLING.least);
  });

  it("is one trunk whatever comes down with it: every tree of the game has its own fine timber by the game's misses, and none of a go that was lost", () => {
    const g = startFelling({ trees: [{ id: 1, girth: 1, timber: [2] }, { id: 2, girth: 2, timber: [2, 0] }, { id: 3, girth: 3, timber: [3, 1, 0] }], chops: 6, seed: 5, girth: 3, family: "run", ...PLAIN });
    expect(g.branches.length).toBe(6);
    let p = beginPlay(g);
    expect(headingFor(g, p)).toEqual([1, 2, 3]);
    expect(onTheEdge(g, p)).toBe(true);
    // one miss: the plain tree's second and the stout tree's third are gone
    expect(headingFor(g, { ...p, misses: 1 })).toEqual([1, 1, 2]);
    expect(headingFor(g, { ...p, misses: 2 })).toEqual([1, 1, 1]);
    expect(onTheEdge(g, { ...p, misses: 2 })).toBe(true);
    expect(headingFor(g, { ...p, misses: 3 })).toEqual([0, 0, 1]);
    expect(headingFor(g, { ...p, misses: 4 })).toEqual([0, 0, 0]);
    expect(onTheEdge(g, { ...p, misses: 4 })).toBe(false);
    // the bar run out: nothing
    p = chop(g, p, safe(g, p)).play;
    p = tick(g, p, 60);
    expect(outcomeOf(g, p)).toMatchObject({ trees: [1, 2, 3], through: false, end: "time", cut: 1, chops: 6 });
    expect(headingFor(g, p)).toEqual([0, 0, 0]);
  });

  it("the axe put down ends a go that was begun, and is nothing before the first chop", () => {
    const g = one(8, 4);
    let p = beginPlay(g);
    expect(leave(g, p)).toBe(p);
    p = chop(g, p, safe(g, p)).play;
    const left = leave(g, p);
    expect(outcomeOf(g, left)).toMatchObject({ end: "left", through: false, cut: 1 });
    expect(isOver(g, left)).toBe(true);
    expect(leave(g, left)).toBe(left);
  });

  it("a friend's brace slows the bar from then on, once a go", () => {
    const g = one(12, 3);
    let p = chop(g, beginPlay(g), safe(g, beginPlay(g))).play;
    const from = p.bar;
    p = brace(g, p);
    expect(p.braced).toBe(true);
    expect(brace(g, p)).toBe(p);
    expect(paceNow(g, p)).toBeCloseTo(1 - FELLING.brace);
    p = tick(g, p, 1);
    expect(p.bar).toBeCloseTo(from - (1 - FELLING.brace));
    expect(outcomeOf(g, p).braced).toBe(true);
  });

  it("says how near a go was to more: the misses too many for the next fine timber, or the chops that were left", () => {
    expect(timberOf([3, 1, 0], 0)).toBe(3);
    expect([0, 1, 2, 3, 4].map((m) => timberOf([3, 1, 0], m))).toEqual([3, 2, 1, 1, 0]);
    expect([0, 1, 2, 3].map((m) => timberOf([2, 0], m))).toEqual([2, 1, 1, 0]);
    expect([0, 2, 3].map((m) => timberOf([2], m))).toEqual([1, 1, 0]);
    const out = (through: boolean, misses: number, cut = 16) => ({ through, misses, chops: 16, cut });
    expect(nearOf(out(true, 0), [3, 1, 0])).toEqual({ misses: 0, chops: 0, got: 3 });
    expect(nearOf(out(true, 1), [3, 1, 0])).toEqual({ misses: 1, chops: 0, got: 2 });
    expect(nearOf(out(true, 3), [3, 1, 0])).toEqual({ misses: 2, chops: 0, got: 1 });
    expect(nearOf(out(true, 5), [3, 1, 0])).toEqual({ misses: 2, chops: 0, got: 0 });
    expect(nearOf(out(false, 1, 13), [3, 1, 0])).toEqual({ misses: 0, chops: 3, got: 0 });
  });

  it("holds a go to what a hand can do: so many chops take at least so long", () => {
    expect(leastSecs([12])).toBeCloseTo(11 * FELLING.quickest);
    expect(leastSecs([12, 12])).toBeCloseTo(22 * FELLING.quickest);
    expect(leastSecs([1])).toBe(0);
  });
});

/**
 * Fitted 2026-10-08 (evening) to what was asked of the girths: a new hand with stamina wins the slender tree's fine
 * timber about nine goes in ten; an ordinary tired hand about seven in ten, and a plain tree's first about four in
 * ten; a sharp tired hand takes most of a stout tree's. What the hands made of them (4,000 games each):
 *
 *   slender (8 chops, bar 0.8 / tired 1.6, turn about):  new 91%; member 100%; tired member 71%, tired practised 100%
 *   plain (12 chops, bar 1 / tired 1.22, pairs):         new 3%; member 87% any (33% both, 1.28 misses); practised 1.94 of 2;
 *                                                        tired member 38% any; tired practised 94% any
 *   stout (16 chops, bar 1.05 / tired 1.2, long runs):   member 50% any (19% all three); practised 2.91 of 3;
 *                                                        tired member 9%; tired practised 2.04 of 3; tired very good 2.95 of 3
 *   a brace from the second chop on, a member:           tired plain 99% any, stout 2.94 of 3, tired stout 2.45 of 3
 */
describe("how hard each girth is, for made-up hands (a new hand, a member, a practised hand, a very good one)", () => {
  it("a slender pine: a new hand with stamina wins its fine timber about nine goes in ten; an ordinary tired hand about seven in ten", () => {
    const fresh = many(NEW, 1, false), m = many(MEMBER, 1, false), tired = many(MEMBER, 1, true), sharp = many(PRACTISED, 1, true);
    show("slender", { new: fresh, member: m, tiredMember: tired, tiredPractised: sharp });
    expect(fresh.any).toBeGreaterThan(0.85);
    expect(fresh.any).toBeLessThan(0.97);
    expect(m.any).toBeGreaterThan(0.97);
    expect(tired.any).toBeGreaterThan(0.62);
    expect(tired.any).toBeLessThan(0.8);
    expect(sharp.any).toBeGreaterThan(0.95);
  });

  it("a plain pine: about as it was for a member with stamina, and its first fine timber about four goes in ten for an ordinary tired hand", () => {
    const fresh = many(NEW, 2, false), m = many(MEMBER, 2, false), p = many(PRACTISED, 2, false), tired = many(MEMBER, 2, true), sharp = many(PRACTISED, 2, true);
    show("plain", { new: fresh, member: m, practised: p, tiredMember: tired, tiredPractised: sharp });
    expect(m.through).toBeGreaterThan(0.93);
    expect(m.misses).toBeGreaterThan(0.9);
    expect(m.misses).toBeLessThan(1.6);
    expect(m.any).toBeGreaterThan(0.8);
    expect(m.secs).toBeGreaterThan(4);
    expect(m.secs).toBeLessThan(6.5);
    expect(p.timber).toBeGreaterThan(1.8);
    expect(tired.any).toBeGreaterThan(0.3);
    expect(tired.any).toBeLessThan(0.48);
    expect(sharp.any).toBeGreaterThan(0.85);
    // a hand that has never played does not win a plain tree's: the slender ones are where it learns
    expect(fresh.any).toBeLessThan(0.15);
  });

  it("a stout pine: half of a member's goes win something, a practised hand nearly all three, and a sharp tired hand most of them", () => {
    const m = many(MEMBER, 3, false), p = many(PRACTISED, 3, false), tired = many(MEMBER, 3, true), sharp = many(PRACTISED, 3, true), best = many(GOOD, 3, true);
    show("stout", { member: m, practised: p, tiredMember: tired, tiredPractised: sharp, tiredGood: best });
    expect(m.any).toBeGreaterThan(0.4);
    expect(m.any).toBeLessThan(0.6);
    expect(m.timber).toBeLessThan(1.3);
    expect(p.timber).toBeGreaterThan(2.7);
    expect(tired.any).toBeLessThan(0.2);
    expect(sharp.timber).toBeGreaterThan(1.7);
    expect(sharp.timber).toBeLessThan(2.4);
    expect(best.timber).toBeGreaterThan(2.8);
  });

  it("a forged axe buys time and ease on every girth: fewer chops, branches seen further, a slower bar", () => {
    const at = (girth: Girth, l: number, spent = false) => many(MEMBER, girth, spent, { chops: Math.ceil((LEVELS.axe.chops[l] * TREES.girths[girth - 1].chops) / LEVELS.axe.chops[0]), ahead: LEVELS.axe.ahead[l], slow: LEVELS.axe.slow[l] });
    const l0 = at(2, 0), l4 = at(2, 4), l7 = at(2, 7), l10 = at(2, 10), stout4 = at(3, 4), stout7 = at(3, 7);
    show("levels", { l0, l4, l7, l10, stout4, stout7 });
    expect(l4.timber).toBeGreaterThan(l0.timber);
    expect(l7.timber).toBeGreaterThan(1.9);
    expect(l10.timber).toBeGreaterThan(1.95);
    expect(stout4.timber).toBeGreaterThan(1.7);
    expect(stout7.timber).toBeGreaterThan(2.8);
    // and with no stamina a well forged axe is a way through for a member, where a plain one is not
    const tired = at(2, 7, true), stout = at(3, 10, true);
    show("tired levels", { plain7: tired, stout10: stout });
    expect(tired.timber).toBeGreaterThan(1.8);
    expect(stout.timber).toBeGreaterThan(2.9);
  });

  it("a friend's brace is worth having: a tired member wins a plain tree's fine timber nearly every go, and most of a stout tree's", () => {
    const plain = many(MEMBER, 2, true, { brace: 1 }), stout = many(MEMBER, 3, true, { brace: 1 }), fed = many(MEMBER, 3, false, { brace: 1 });
    show("braced", { tiredPlain: plain, tiredStout: stout, stout: fed });
    expect(plain.any).toBeGreaterThan(0.93);
    expect(stout.timber).toBeGreaterThan(2.1);
    expect(fed.timber).toBeGreaterThan(2.8);
  });
});
