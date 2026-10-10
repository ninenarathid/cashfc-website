import { describe, expect, it } from "vitest";
import { veinEnd, type PendingVein } from "./mining";
import { dayOf } from "./stamina";
import { newPurse, type Purse, type Stack } from "./trade";
import { VEIN, bestRoute, begin, faceOf, headOf, over, strike, type Cell, type VeinMods } from "./vein";
import { VEIN_STRIKES, accountOf, mostOf, oddOf, veinFrom, type VeinAccount } from "./vein-account";

/** Numbers from 0 to 1 in an order that a seed fixes. */
function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), of: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)], maybe: (p: number) => next() < p };
}
const NOW = Date.parse("2026-10-08T12:00:00+07:00");
const veinOf = (seed: number, gem: PendingVein["gem"], mods: VeinMods, more = 0, again = false): PendingVein => ({ f: 3, rock: 5, turn: 99, seed, gem, mods, more, ...(again ? { again: true } : {}) });
const purseOf = (vein: PendingVein | null, bag: Array<Stack | null> = [{ item: "pick", n: 1 }], more: Partial<Purse> = {}): Purse => {
  const p = newPurse();
  return { ...p, bag: [...bag, ...p.bag.slice(bag.length)], hand: "pick", handAt: 0, mine: { owed: 0, crumb: 0, loose: { k: "", ids: [] }, vein, rests: [], last: 0, paid: null }, ...more } as Purse;
};
/** A go played by somebody who strikes any cell that can be struck: its strikes, in their order. */
function anyGo(c: ReturnType<typeof chance>, vein: PendingVein): Array<[number, number]> {
  const face = faceOf(vein.seed, !!vein.gem), strikes: Array<[number, number]> = [];
  let crack = begin(face, vein.mods);
  for (let i = 0; i < 40 && !over(face, crack); i++) {
    const [hx, hy] = headOf(crack), [dx, dy] = c.of([[1, 0], [-1, 0], [0, 1], [0, -1]] as const), far = c.int(1, VEIN.reach), to: [number, number] = [hx + dx * far, hy + dy * far];
    const did = strike(face, vein.mods, crack, to);
    if (did.moved < 0) continue;
    strikes.push(to);
    crack = did.crack;
  }
  return strikes;
}

describe("a go at a vein, as its page tells it to a keeper that does not lay the face out", () => {
  it("is never odd, and comes to what the trial's keeper gives, on every face and with any strikes", () => {
    const c = chance(20261164);
    let gos = 0, twins = 0, fulls = 0, gems = 0, backs = 0;
    for (let seed = 1; seed <= 1500; seed++) {
      for (const gem of [null, "fire", "dark"] as const) {
        const mods: VeinMods = { strikes: c.of([4, 5, 6, 6, 7, 8, 9, 10, 12]), back: c.of([0, 0, 1, 2]), cross: c.of([0, 0, 1, 2]), spent: c.maybe(0.3) };
        const vein = veinOf(seed * 7919 + (gem ? 13 : 0), gem, mods, gem && c.maybe(0.4) ? 1 : 0, c.maybe(0.15)), face = faceOf(vein.seed, !!gem);
        const played = c.of<() => unknown>([
          () => bestRoute(face, mods).strikes, () => anyGo(c, vein), () => anyGo(c, vein), () => [],
          // (cells that cannot be struck, cells off the face, what is no cell, and more strikes than a go is told with)
          () => [...anyGo(c, vein).slice(0, 2), [9, 9], [-1, 0], [2.5, 1], "x", null, [1, 2, 3], ...anyGo(c, vein)],
          () => Array.from({ length: 90 }, () => [c.int(0, 5), c.int(0, 5)]),
          () => "strikes",
        ])() as Array<Cell>;
        const pick: Stack = c.maybe(0.3) ? { item: "pick", n: 1, plus: 10, opts: ["pkPeek", "pkLoose", "pkTwin"] } : { item: "pick", n: 1 };
        const full = c.maybe(0.05), sack = c.maybe(0.3);
        const purse = purseOf(vein, full ? [pick, ...Array.from({ length: 9 }, (): Stack => ({ item: "boot", n: 1 }))] : [pick], {
          ...(sack ? { gifts: { had: ["thingSack"], charms: [] } } : {}), ...(c.maybe(0.2) ? { powers: { pkTwin: { k: dayOf(NOW), n: c.of([0, 4, 5]) } } } : {}),
        } as Partial<Purse>);
        const said = accountOf(vein, played), want = veinEnd(purse, played, NOW);
        expect(oddOf(vein, said)).toBeNull();
        expect(veinFrom(purse, said, NOW)).toEqual(want);
        // (what is said goes over a wire: said again from its own text it is the same account)
        expect(veinFrom(purse, JSON.parse(JSON.stringify(said)), NOW)).toEqual(want);
        gos++;
        if (want.ok && (want.purse.powers?.pkTwin?.n ?? 0) > (purse.powers?.pkTwin?.n ?? 0)) twins++;
        if (!want.ok && want.why === "full") fulls++;
        if (want.ok && want.got.some(([id]) => id.startsWith("chip"))) gems++;
        if (said.struck > mods.strikes) backs++;
      }
    }
    expect([gos, twins > 100, fulls > 50, gems > 500, backs > 20]).toEqual([4500, true, true, true, true]);
    // (4,500 goes, each laid out and played twice: two seconds alone, and more than the five a test is given when
    // the whole suite runs beside it)
  }, 60_000);

  it("refuses what no face could have come to, and closes the vein; and answers nothing to an account of another vein", () => {
    const mods: VeinMods = { strikes: 6, back: 1, cross: 0, spent: false }, plain = veinOf(4242, null, mods), gemVein = veinOf(4242, "fire", mods, 1);
    const cells = (n: number): Array<[number, number]> => Array.from({ length: n }, (_, i): [number, number] => [i % VEIN.size, 0]);
    const ok: VeinAccount = { seed: 4242, again: false, strikes: cells(6), struck: 6, of: 6, ore: 6, gems: [] };
    expect(oddOf(plain, ok)).toBeNull();
    const odd = (vein: PendingVein, a: unknown) => oddOf(vein, a);
    // the shape of it
    for (const a of [null, "go", { ...ok, struck: 1.5 }, { ...ok, struck: -1 }, { ...ok, of: "6" }, { ...ok, ore: null }, { ...ok, gems: 2 }, { ...ok, gems: [1.5] }, { ...ok, gems: [-1] }]) expect(odd(plain, a)).toBe("shape");
    for (const a of [{ ...ok, strikes: null }, { ...ok, strikes: cells(VEIN_STRIKES + 1) }, { ...ok, strikes: [[6, 0]] }, { ...ok, strikes: [[0, -1]] }, { ...ok, strikes: [[0.5, 1]] }, { ...ok, strikes: [[1, 2, 3]] }, { ...ok, strikes: ["x"] }]) expect(odd(plain, a)).toBe("strikes");
    // a face has four to six glinting cells
    expect([odd(plain, { ...ok, of: 3, ore: 3 }), odd(plain, { ...ok, of: 7 }), odd(plain, { ...ok, of: 4, ore: 4 })]).toEqual(["of", "of", null]);
    // no more strikes count than were made, nor than a go has: the vein's own, and what a knot may give back
    expect([odd(plain, { ...ok, struck: 7, strikes: cells(6) }), odd(plain, { ...ok, struck: 7, strikes: cells(7) }), odd(plain, { ...ok, struck: 8, strikes: cells(8) })]).toEqual(["struck", null, "struck"]);
    expect(odd(veinOf(4242, null, { ...mods, back: 0 }), { ...ok, struck: 7, strikes: cells(7) })).toBe("struck");
    // only a gem's vein has gem's cells: two at the most, of one to three fragments each
    expect([odd(plain, { ...ok, ore: 5, gems: [1] }), odd(gemVein, { ...ok, ore: 4, gems: [3, 3] }), odd(gemVein, { ...ok, ore: 3, gems: [1, 2, 3] }), odd(gemVein, { ...ok, ore: 4, gems: [4] }), odd(gemVein, { ...ok, ore: 4, gems: [0] })])
      .toEqual(["gems", null, "gems", "gems", "gems"]);
    // the crack passes no more glinting cells than the face has; and a gem's vein has a cell at least that is no ore
    expect([odd(plain, { ...ok, of: 5, ore: 6 }), odd(gemVein, { ...ok, ore: 6 }), odd(gemVein, { ...ok, ore: 5 }), odd(gemVein, { ...ok, ore: 5, gems: [2] }), odd(gemVein, { ...ok, ore: 5, gems: [2, 2] })]).toEqual(["passed", "passed", null, null, "passed"]);
    // nor more than it can have run through: two cells a strike, and one fewer for a strike a knot gave back
    expect([odd(plain, { ...ok, struck: 2, ore: 5 }), odd(plain, { ...ok, struck: 2, ore: 4 }), odd(plain, { ...ok, struck: 0, ore: 1 }), odd(plain, { ...ok, struck: 0, ore: 0 })]).toEqual(["far", null, "far", null]);
    expect([odd(veinOf(1, null, { strikes: 1, back: 2, cross: 0, spent: false }), { ...ok, struck: 3, strikes: cells(3), ore: 5 }), odd(veinOf(1, null, { strikes: 1, back: 2, cross: 0, spent: false }), { ...ok, struck: 3, strikes: cells(3), ore: 4 })]).toEqual(["far", null]);

    // an odd account pays nothing and closes the vein; the purse is otherwise as it was
    const purse = purseOf(plain), did = veinFrom(purse, { ...ok, of: 7 }, NOW);
    expect(did).toEqual({ ok: false, why: "odd", how: "of", purse: { ...purse, mine: { ...purse.mine, vein: null } } });
    // an account of another vein, of the other go of this one, of no vein, and what is no account: nothing is done
    for (const a of [{ ...ok, seed: 4243 }, { ...ok, again: true }, { ...ok, seed: "4242" }, null, "go", [], 7]) expect(veinFrom(purse, a, NOW)).toEqual({ ok: false, why: "none" });
    expect(veinFrom(purseOf(null), ok, NOW)).toEqual({ ok: false, why: "none" });
    expect(veinFrom(purseOf(veinOf(4242, null, mods, 0, true)), { ...ok, again: true }, NOW)).toMatchObject({ ok: true, again: false, got: [["shardCopper", 12]] });
  });

  it("says the most a page could be believed about: every glinting cell a face can have, and a gem's cells at their most", () => {
    const mods: VeinMods = { strikes: 6, back: 0, cross: 0, spent: false };
    expect(mostOf(veinOf(1, null, mods))).toEqual({ ore: VEIN.points[1] * VEIN.ore, gems: 0 });
    expect(mostOf(veinOf(1, "fire", mods, 1))).toEqual({ ore: (VEIN.points[1] - VEIN.gem.points[1]) * VEIN.ore, gems: VEIN.gem.points[1] * VEIN.gem.chips[1] + 1 });
    // …and that much is within the rules, on a vein with the fewest strikes a go can have
    const tired: VeinMods = { strikes: 4, back: 0, cross: 0, spent: true }, strikes = Array.from({ length: 4 }, (_, i): [number, number] => [i, 0]);
    expect(oddOf(veinOf(1, null, tired), { seed: 1, again: false, strikes, struck: 4, of: 6, ore: 6, gems: [] })).toBeNull();
    expect(oddOf(veinOf(1, "fire", tired, 1), { seed: 1, again: false, strikes, struck: 4, of: 6, ore: 4, gems: [3, 3] })).toBeNull();
  });
});
