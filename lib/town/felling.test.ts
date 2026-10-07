import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FELLING, barShare, beginPlay, branchesOf, chop, isOver, leastSecs, missesOf, outcomeOf, seen, startFelling, tick, type Felling, type FellingAsk, type Side } from "./felling";
import { LEVELS } from "./tools";

function rng(seed: number) {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/**
 * A made-up hand at the game. It chops to a beat, and is off the beat by so much either way (`vary`: the members' own
 * presses at the town's other games were off by about 0.07 s, a practised hand's by 0.035, a very good one's by 0.02).
 * The beat is its own easy one (`mind`, and room for being off) while the bar is well filled, and quicker the lower
 * the bar runs, down to the fastest it can move (`fastest`). After a chop it takes the hand `mind`
 * seconds to have made its mind up about the next (and `see` more, of a branch that came into sight only with that
 * chop); a chop that falls before that is made from the side it stands on, as the last was: under a branch, a miss.
 */
interface Hand { mind: number; vary: number; fastest: number; see: number }
const MEMBER: Hand = { mind: 0.36, vary: 0.07, fastest: 0.22, see: 0.3 };
const PRACTISED: Hand = { mind: 0.28, vary: 0.035, fastest: 0.17, see: 0.22 };
const GOOD: Hand = { mind: 0.21, vary: 0.02, fastest: 0.13, see: 0.16 };
/** The beat a hand keeps where nothing hurries it: its mind made up, with room for being off. */
const easy = (h: Hand) => h.mind + 3 * h.vary;
/** A hand keeps its easy beat while the bar has so many seconds in it, and is at its fastest when it has only so many. */
const CALM = 1.3, PANIC = 0.4;

/** One game played by a hand, from a seed. */
function play(hand: Hand, ask: FellingAsk, seed: number) {
  const game: Felling = startFelling(ask), r = rng(seed ^ 0x2545f491);
  let p = beginPlay(game), t = 0, last = 0, stretch = -1, shown: number[] = [];
  while (!isOver(game, p)) {
    const st = game.stretches[p.at];
    if (p.at !== stretch) { stretch = p.at; shown = st.branches.map((_, i) => (i <= game.ahead ? -1e9 : Infinity)); }
    const next = p.cut + 1 < st.chops ? st.branches[p.cut + 1] : 0;
    // the side it stands on (before the first chop of a tree: the side the first branch in sight is not on, read at leisure)
    const first = !p.running;
    const side: Side = p.side !== 0 && !first ? p.side : ((st.branches.find((b, i) => i > 0 && i <= game.ahead && b !== 0) ?? 1) === 1 ? -1 : 1);
    const must = next === side;
    let at = t, ready = true;
    if (!first) {
      // the beat: its own easy one while the bar is well filled, quicker the lower the bar is, the fastest it can when the bar is nearly out
      const secs = p.bar / st.pace, hurry = Math.max(0, Math.min(1, (CALM - secs) / (CALM - PANIC)));
      const beat = easy(hand) + (hand.fastest - easy(hand)) * hurry;
      at = last + Math.max(hand.fastest * 0.8, beat + hand.vary * gauss(r));
      const made = Math.max(last, shown[p.cut + 1] + hand.see) + hand.mind + hand.vary * gauss(r);
      ready = made <= at;
    }
    const to: Side = must && ready ? (-side as Side) : side;
    p = tick(game, p, at - t);
    t = at;
    if (isOver(game, p) || p.at !== stretch) continue; // the bar ran out on the way
    p = chop(game, p, to).play;
    last = t;
    // what the chop brought into sight
    if (p.at === stretch) { const i = p.cut + game.ahead; if (i < st.chops && shown[i] === Infinity) shown[i] = t; }
  }
  return outcomeOf(game, p);
}
/** Many games: the share of first trees felled, their misses on average, the share felled with none and with more than two, and the seconds a game took. */
function many(hand: Hand, ask: Omit<FellingAsk, "trees"> & { chops?: number; trees?: number }, n = 1500) {
  let felled = 0, misses = 0, clean = 0, poor = 0, secs = 0, all = 0, dropped = 0;
  for (let s = 1; s <= n; s++) {
    const out = play(hand, { ...ask, trees: Array.from({ length: ask.trees ?? 1 }, (_, i) => ({ id: i, chops: ask.chops ?? 12, seed: s * 7919 + i * 101 })) }, s * 104729 + 7);
    const first = out.trees[0];
    if (first.felled) { felled++; misses += first.misses; if (first.misses === 0) clean++; if (first.misses > 2) poor++; }
    all += out.trees.filter((x) => x.felled).length;
    if (out.dropped) dropped++;
    secs += out.secs;
  }
  return { felled: felled / n, misses: felled ? misses / felled : 0, clean: clean / n, poor: poor / n, secs: secs / n, trees: all / n, dropped: dropped / n };
}
const PLAIN = { ahead: LEVELS.axe.ahead[0], pace: 1 };
/** (`FELLING_TABLE=<a file> npx vitest run lib/town/felling.test.ts` writes what the hands made of each game there, a line a hand) */
const show = (label: string, rows: Record<string, ReturnType<typeof many>>) => {
  if (!process.env.FELLING_TABLE) return;
  for (const [who, r] of Object.entries(rows)) appendFileSync(process.env.FELLING_TABLE, `${label} ${who}: ${Object.entries(r).map(([k, v]) => `${k} ${Math.round(v * 100) / 100}`).join("  ")}
`);
};

describe("a trunk, from a seed", () => {
  it("is the same trunk from the same seed, with nothing on its lowest segment", () => {
    for (let s = 1; s <= 200; s++) {
      const a = branchesOf(s * 31, 12);
      expect(a).toEqual(branchesOf(s * 31, 12));
      expect(a.length).toBe(12);
      expect(a[0]).toBe(0);
      expect(a.every((b) => b === -1 || b === 0 || b === 1)).toBe(true);
    }
    expect(branchesOf(5, 0).length).toBe(1);
  });

  it("has branches on both sides, about as many as the knob says, and a branch is oftener across from the one before", () => {
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
});

describe("a game, chop by chop", () => {
  const one = (chops: number, seed: number, more: Partial<FellingAsk> = {}) => startFelling({ trees: [{ id: 7, chops, seed }], ...PLAIN, ...more });
  /** The side a chop is safe from: the one the segment that comes level has no branch on. */
  const safe = (g: Felling, p: ReturnType<typeof beginPlay>): Side => (g.stretches[p.at].branches[p.cut + 1] === 1 ? -1 : 1);

  it("fells the tree in as many chops as it takes, with no miss for whoever is never under a branch", () => {
    for (let s = 1; s <= 100; s++) {
      const g = one(12, s);
      let p = beginPlay(g), n = 0;
      while (!isOver(g, p)) { const did = chop(g, p, safe(g, p)); p = did.play; n++; expect(did.what).toBe(n === 12 ? "felled" : "cut"); }
      expect(n).toBe(12);
      expect(outcomeOf(g, p)).toMatchObject({ trees: [{ tree: 7, felled: true, misses: 0, chops: 12 }], misses: 0, dropped: false });
    }
  });

  it("counts a miss for standing on the side a branch comes level on, and takes time off the bar for it", () => {
    const g = one(12, 11), at = g.stretches[0].branches.findIndex((b) => b !== 0);
    expect(at).toBeGreaterThan(0);
    let p = beginPlay(g);
    for (let i = 0; i < at - 1; i++) p = chop(g, p, safe(g, p)).play;
    const before = p.bar, did = chop(g, p, g.stretches[0].branches[at] as Side);
    expect(did.what).toBe("hit");
    expect(missesOf(did.play)).toBe(1);
    expect(did.play.bar).toBeLessThan(before + FELLING.bar.top);
  });

  it("stands still until the first chop, then the bar runs down, a chop puts some back, and run out the tree stands", () => {
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
    expect(outcomeOf(g, p).trees[0]).toMatchObject({ felled: false });
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
    expect(rows[1]).toBe(g.stretches[0].branches[1]);
    expect(rows[2]).toBe(g.stretches[0].branches[2]);
    expect(rows[3]).toBe(null);
    expect(rows[5]).toBe(null);
    expect(rows[6]).toBe("top");
    const after = chop(g, p, safe(g, p)).play;
    expect(seen(g, after, 8)[2]).toBe(g.stretches[0].branches[3]);
    expect(seen(g, after, 8)[5]).toBe("top");
  });

  it("forgives so many branches a tree: no miss, and no time lost", () => {
    const g = one(12, 11, { spared: 1 }), b = g.stretches[0].branches;
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

  it("with no stamina: a faster bar, branches seen a segment later, and the axe dropped at the third miss with the tree standing", () => {
    const g = one(12, 11, { spent: true });
    expect(g.most).toBe(FELLING.tired.misses);
    expect(g.ahead).toBe(PLAIN.ahead - FELLING.tired.later);
    expect(g.stretches[0].pace).toBeCloseTo(FELLING.tired.pace);
    const b = g.stretches[0].branches;
    let p = beginPlay(g), last: string | null = null;
    while (!isOver(g, p)) { const did = chop(g, p, (b[p.cut + 1] || 1) as Side); last = did.what; p = did.play; }
    expect(last).toBe("dropped");
    expect(outcomeOf(g, p)).toMatchObject({ dropped: true, misses: 3, trees: [{ felled: false }] });
    // and never fewer than one segment in sight
    expect(startFelling({ trees: [{ id: 1, chops: 4, seed: 1 }], ahead: 1, pace: 1, spent: true }).ahead).toBe(FELLING.least);
  });

  it("plays one game over several trees: a stretch a tree, each a little faster, each with its own bar; a stretch out of time leaves its tree and the next begins", () => {
    const g = startFelling({ trees: [{ id: 1, chops: 5, seed: 1 }, { id: 2, chops: 5, seed: 2 }, { id: 3, chops: 5, seed: 3 }], ...PLAIN });
    expect(g.stretches.map((s) => s.pace)).toEqual([1, 1 + FELLING.faster, 1 + 2 * FELLING.faster]);
    let p = beginPlay(g);
    while (p.at === 0) p = chop(g, p, safe(g, p)).play;
    expect(p).toMatchObject({ at: 1, cut: 0, running: false, bar: FELLING.bar.from });
    // the second: one chop, then walked away from
    p = chop(g, p, safe(g, p)).play;
    p = tick(g, p, 60);
    expect(p).toMatchObject({ at: 2, cut: 0, running: false });
    while (!isOver(g, p)) p = chop(g, p, safe(g, p)).play;
    expect(outcomeOf(g, p).trees.map((t) => t.felled)).toEqual([true, false, true]);
  });

  it("holds a go to what a hand can do: so many chops take at least so long", () => {
    expect(leastSecs([12])).toBeCloseTo(11 * FELLING.quickest);
    expect(leastSecs([12, 12])).toBeCloseTo(22 * FELLING.quickest);
    expect(leastSecs([1])).toBe(0);
  });
});

describe("how hard it is, for made-up hands (a member's presses are off by about 0.07 s, a practised hand's by 0.035, a very good one's by 0.02)", () => {
  it("with stamina and a plain axe: a member fells most trees with a miss or two, in about six seconds; better hands fell them clean", () => {
    const m = many(MEMBER, PLAIN), p = many(PRACTISED, PLAIN), g = many(GOOD, PLAIN);
    show("fed", { m, p, g });
    // (fitted 2026-10-08: a member 98 in 100 felled, 1.06 misses a tree, 31 in 100 with none and 7 with more than two, 4.8 s;
    // a practised hand and a very good one all of them, 0.08 misses a tree)
    expect(m.felled).toBeGreaterThan(0.93);
    expect(m.misses).toBeGreaterThan(0.7);
    expect(m.misses).toBeLessThan(1.5);
    expect(m.clean).toBeGreaterThan(0.2);
    expect(m.poor).toBeLessThan(0.15);
    expect(m.secs).toBeGreaterThan(4);
    expect(m.secs).toBeLessThan(6.5);
    expect(p.felled).toBeGreaterThan(0.98);
    expect(p.misses).toBeLessThan(0.25);
    expect(g.felled).toBeGreaterThan(0.98);
    expect(g.misses).toBeLessThan(0.25);
  });

  it("with no stamina it is much harder and never refused: a member fells one tree in ten, a practised hand about one in two, a very good one most", () => {
    const tired = { ...PLAIN, spent: true };
    const m = many(MEMBER, tired), p = many(PRACTISED, tired), g = many(GOOD, tired);
    show("tired", { m, p, g });
    // (fitted 2026-10-08: of a hundred trees a member fells 11, a practised hand 55, a very good one 87: about as the tired hoe is)
    expect(m.felled).toBeGreaterThan(0.04);
    expect(m.felled).toBeLessThan(0.25);
    expect(p.felled).toBeGreaterThan(0.4);
    expect(p.felled).toBeLessThan(0.7);
    expect(g.felled).toBeGreaterThan(0.78);
    expect(g.felled).toBeLessThan(0.97);
  });

  it("a forged axe buys time and ease: fewer chops, branches seen further, a slower bar", () => {
    const at = (l: number) => many(MEMBER, { chops: LEVELS.axe.chops[l], ahead: LEVELS.axe.ahead[l], pace: 1 - LEVELS.axe.slow[l] });
    const l0 = at(0), l4 = at(4), l7 = at(7), l10 = at(10);
    show("levels", { l0, l4, l7, l10 });
    expect(l4.felled).toBeGreaterThanOrEqual(l0.felled);
    expect(l7.felled).toBeGreaterThan(0.95);
    expect(l7.misses).toBeLessThan(l0.misses);
    expect(l10.felled).toBeGreaterThan(0.99);
    expect(l10.misses).toBeLessThan(0.25);
    // and with no stamina the top axe is a way through for a member, where a plain one is not
    const tired = many(MEMBER, { chops: LEVELS.axe.chops[10], ahead: LEVELS.axe.ahead[10], pace: 1 - LEVELS.axe.slow[10], spent: true });
    show("tired +10", { m: tired });
    expect(tired.felled).toBeGreaterThan(0.8);
  });

  it("three trees in one game: a member fells most of them, each stretch a little faster than the last", () => {
    const m = many(MEMBER, { ...PLAIN, trees: 3 }), g = many(GOOD, { ...PLAIN, trees: 3 });
    show("echo", { m, g });
    // (fitted: a member 2.7 of the three, a very good hand all three)
    expect(m.trees).toBeGreaterThan(2.3);
    expect(m.trees).toBeLessThan(m.felled * 3 + 0.001);
    expect(g.trees).toBeGreaterThan(2.8);
  });
});
