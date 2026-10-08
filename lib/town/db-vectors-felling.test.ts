import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { catalogOf } from "./catalog";
import { giftsRowAll } from "./gifts";
import { countsOf, type Done } from "./line-points";
import { dayOf, mealOf } from "./stamina";
import { ELEMENTS, OPTIONS, OPTION_IDS, axeAhead, axeBarPace, axeChops, gemLevel, has, type OptionId, type OptionUse } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import { TREES, axeOf, begin, fell, grownAt, rootBack, toldOf, type FellLuck, type FellWent, type Grove, type Standing } from "./trees";

/**
 * The cases the database's rules of woodcutting are held to (v164's felling part; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers
 * (.claude/skills/fc-cash-town/scripts/db/v164.felling.calls.json says which function each name is):
 *
 * - the axe as the game reads it: `axe_of` (the stack in the hand, by the slot it was taken up from, of purses with
 *   one axe, two, none, another thing held), `axe_has`, `axe_gem`, `axe_chops`, `axe_ahead`, `axe_pace` of axes kept
 *   soundly and not (a plus that is no whole number, past the top, under nothing; options at the wrong milestone, of
 *   another tool, twice; gems that are no element, more than the sockets);
 * - a tree by the clock: `tree_until` of a plain tree and of the ancient one, either side of dawn;
 * - what a page is told: `trees_told` of groves with stumps, trees grown again and not yet forgotten, trees half
 *   cut, the ancient tree down, to a purse that knows when it is back and one that does not;
 * - walking up: `fell_begin` at every kind of tree and at none, near and far, with every kind of axe and with none,
 *   with stamina and without, the echo axe worn and not, the woodpecker following and not, a bag with room and none;
 * - a go: `fell` of what was begun and of what was not, felled and not, clean and with misses, too fast, with the
 *   same tree named twice, with a tree that is no part of it, by the axe's one chop, with twice the wood asked for,
 *   with chance of every sort; `fell_root` of my own fresh stump, another's, an old one, the ancient tree's;
 * - the line: `counts_of` of a tree of each kind felled, and of what is no tree.
 *
 * The trees are the mountain's, which is laid out only in `next dev`: the cases are made with the layout as it is
 * there, and the catalog's `trees` row written with them is that one.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-felling.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOWS = [at("2026-10-08T12:00:00"), at("2026-10-08T04:59:30"), at("2026-10-08T05:00:30"), at("2026-10-08T19:30:00"), at("2026-10-09T08:15:00")];
const MIN = 60_000, HOUR = 60 * MIN;
const ME = "00000000-0000-0000-0000-000000000001", HER = "00000000-0000-0000-0000-000000000002";
const AXE_OPTS = OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly string[]).includes("axe"));
const POOL1 = AXE_OPTS.filter((id) => OPTIONS[id].pool === 1), POOL2 = AXE_OPTS.filter((id) => OPTIONS[id].pool === 2);

/** The mountain's trees as `next dev` lays them out, and the catalog's row made there. */
async function mountain(): Promise<{ wood: Standing[]; row: unknown }> {
  vi.stubEnv("NODE_ENV", "development");
  vi.resetModules();
  const live = await import("./trees");
  vi.unstubAllEnvs();
  vi.resetModules();
  return { wood: live.WOOD, row: JSON.parse(JSON.stringify(live.treesRow())) };
}

export async function vectorsFelling(): Promise<{ all: Vector[]; trees: unknown; wood: Standing[] }> {
  const { wood, row } = await mountain();
  const c = chance(20261164), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push(JSON.parse(JSON.stringify({ fn, args, want: want ?? null })) as Vector);
  const pines = wood.filter((t) => t.tier === 1 && !t.elder), elder = wood.find((t) => t.elder)!, upper = wood.filter((t) => t.tier > 1);
  const trio = pines.filter((t) => pines.filter((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= TREES.echo.reach).length >= 2);

  /** An axe as it may be kept: mostly soundly. */
  const axe = (): Stack => {
    const s: Stack = { item: "axe", n: 1 };
    const plus = c.maybe(0.25) ? 10 : c.maybe(0.1) ? c.of([-1, 3.7, 12, 9.99]) : c.int(0, 10);
    if (plus !== 0 || c.maybe(0.2)) s.plus = plus;
    if (c.maybe(0.6)) {
      const first = c.of(POOL1), second = c.of(POOL1.filter((x) => x !== first)), third = c.of(POOL2);
      s.opts = c.maybe(0.12) ? [third, first, second] : c.maybe(0.08) ? [first, first, third] : c.maybe(0.08) ? [first, "pkPeek", third] : c.maybe(0.1) ? [first] : c.maybe(0.1) ? ["", "", third] : [first, second, third];
    }
    if (c.maybe(0.55)) s.gems = c.maybe(0.1) ? ["glass", c.of(ELEMENTS)] : c.maybe(0.1) ? [c.of(ELEMENTS), c.of(ELEMENTS)] : [c.of(ELEMENTS)];
    return s;
  };
  /** A purse about to fell: an axe held (mostly), stamina, gifts, counts kept. */
  const purse = (now: number, more: { full?: boolean } = {}): Purse => {
    const p = newPurse(), bag: Array<Stack | null> = p.bag.map(() => null);
    const holds = c.maybe(0.92), slot = c.int(0, 3);
    if (holds || c.maybe(0.5)) bag[slot] = axe();
    if (c.maybe(0.12)) bag[slot + 2] = axe();
    if (c.maybe(0.5)) bag[7] = { item: "log", n: c.of([1, 20, 47, 49, 50]) };
    if (c.maybe(0.4)) bag[8] = { item: "timber", n: c.of([1, 30, 48, 50]) };
    if (c.maybe(0.2)) bag[9] = { item: "resin", n: c.of([1, 9, 10]) };
    if (more.full || c.maybe(0.06)) for (let i = 0; i < bag.length; i++) bag[i] ??= { item: "stone", n: 50 };
    const hand = holds ? "axe" : c.of([null, "hoe", "axe"]);
    const out: Purse = { ...p, bag, hand: hand as Purse["hand"], stamina: c.maybe(0.1) ? { day: dayOf(now) - 1, left: 3 } : { day: dayOf(now), left: c.of([0, 0, 1, 2, 3, 40, 100]) } };
    if (c.maybe(0.5)) out.handAt = c.maybe(0.8) ? slot : c.of([slot + 2, 5, -1, 2.5]);
    if (c.maybe(0.5)) {
      const had = (["charmEchoAxe", "famWoodpecker", "thingBundle"] as const).filter(() => c.maybe(0.75));
      out.gifts = { had: [...had], charms: had.includes("charmEchoAxe") && c.maybe(0.8) ? ["charmEchoAxe"] : [], familiar: had.includes("famWoodpecker") && c.maybe(0.8) ? "famWoodpecker" : null };
    }
    if (c.maybe(0.45)) {
      const powers: Record<string, { k: number; n: number }> = {};
      for (const id of ["axFresh", "axOne", "axDouble", "axRoot"] as const) {
        if (!c.maybe(0.5)) continue;
        const rule = (OPTIONS[id] as { use: OptionUse }).use, k = rule.per === "day" ? dayOf(now) : dayOf(now) * 3 + mealOf(now);
        powers[id] = { k: c.maybe(0.85) ? k : k - 1, n: c.of([0, 1, rule.n - 1, rule.n, rule.n + 2]) };
      }
      out.powers = powers;
    }
    if (c.maybe(0.4)) out.felling = { owed: c.of([0, 0.3, 0.7, 0.15, 1.2, -1]), dust: c.of([0, 1, 3, 4, 5, 2.5]) };
    return out;
  };
  /** The trees as they may be kept: some down (stumps, growing, grown and not yet forgotten), some half cut. */
  const grove = (now: number, about: Standing | null): Grove => {
    const down: Grove["down"] = {}, half: number[] = [];
    const near = about ? wood.filter((t) => !t.elder && Math.max(Math.abs(t.x - about.x), Math.abs(t.y - about.y)) <= 4) : [];
    for (let i = c.int(0, 5); i > 0; i--) { const t = c.maybe(0.6) && near.length ? c.of(near) : c.of(wood); down[t.id] = { at: now - c.of([0, 5, 9, 20, 39, 40, 41, 90]) * MIN - c.int(0, 999), by: c.of([ME, HER]) }; }
    if (c.maybe(0.25)) down[elder.id] = { at: now - c.of([1, 4, 11, 20, 30]) * HOUR, by: c.of([ME, HER]) };
    if (c.maybe(0.05)) down["9999"] = { at: now, by: HER };
    for (let i = c.int(0, 3); i > 0; i--) { const t = c.maybe(0.7) && near.length ? c.of(near) : c.of(pines); if (!half.includes(t.id)) half.push(t.id); }
    return { down, half };
  };
  const beside = (t: Standing): [number, number] => { const n = t.size ?? 1; return c.of([[t.x - 1, t.y], [t.x + n, t.y], [t.x, t.y + n], [t.x + n, t.y + n], [t.x - 1, t.y - 1]] as Array<[number, number]>); };
  const which = (): Standing => (c.maybe(0.25) ? c.of(trio) : c.maybe(0.12) ? elder : c.maybe(0.1) ? c.of(upper) : c.of(pines));
  const luck = (): FellLuck => ({ dark: c.maybe(0.3) ? c.next() * 0.2 : c.next(), scent: c.maybe(0.4) ? c.next() * 0.25 : c.next(), which: c.next(), chain: c.maybe(0.4) ? c.next() * 0.2 : c.next() });

  // the axe as the game reads it
  for (let i = 0; i < 400; i++) {
    const s = axe();
    const base = i % 2 ? TREES.chops : TREES.elderChops;
    add("axe_chops", [s, base], axeChops(s, base));
    add("axe_ahead", [s], axeAhead(s));
    add("axe_pace", [s], axeBarPace(s));
    const id = c.of(AXE_OPTS), e = c.of(ELEMENTS);
    add("axe_has", [s, id], has(s, id as OptionId));
    add("axe_gem", [s, e], gemLevel(s, e));
  }
  for (let i = 0; i < 200; i++) { const p = purse(NOWS[0]); add("axe_of", [p], axeOf(p)); }

  // a tree by the clock
  for (const now of NOWS) for (const back of [0, 1, 59_999, 5 * HOUR, 23 * HOUR + 59 * MIN, 24 * HOUR]) for (const old of [false, true]) add("tree_until", [old, now - back], grownAt({ elder: old }, now - back));

  // what a page is told
  for (let i = 0; i < 300; i++) { const now = c.of(NOWS), p = purse(now), g = grove(now, c.maybe(0.5) ? c.of(pines) : null); add("trees_told", [g, p, now], toldOf(g, p, now, wood)); }

  // walking up to a tree, and a go at it
  for (let i = 0; i < 1500; i++) {
    const now = c.of(NOWS), t = which(), p = purse(now, { full: c.maybe(0.03) }), g = grove(now, t);
    const id = c.maybe(0.03) ? 9999 : t.id, where = c.maybe(0.9) ? beside(t) : ([t.x + 4, t.y + 3] as [number, number]), seed = c.int(0, 2 ** 31 - 1);
    const b = begin(p, g, id, where, now, seed, wood);
    add("fell_begin", [p, g, id, where[0], where[1], now, seed], b);
    // the go: of what was begun, mostly; now and then of something else
    const group = b.ok ? b.trees : [id];
    let named = group.map((tree) => ({ id: tree, felled: c.maybe(0.85), misses: c.of([0, 0, 0, 1, 1, 2, 3, 5]) }));
    if (c.maybe(0.05)) named = [...named, { id: c.of(pines).id, felled: true, misses: 0 }];
    if (c.maybe(0.03) && named.length) named = [...named, named[0]];
    const chops = b.ok ? b.ask.trees.reduce((n, x) => n + x.chops, 0) : 12;
    const went: FellWent = { tree: id, trees: named, secs: c.maybe(0.08) ? c.of([0, 0.1, 0.3]) : Math.round((chops * (0.2 + c.next() * 0.5)) * 10) / 10, ...(c.maybe(0.15) ? { one: true } : {}), ...(c.maybe(0.3) ? { twice: true } : {}) };
    const lucks = named.map(() => luck());
    add("fell", [p, g, ME, went, where[0], where[1], now, lucks], fell(p, g, ME, went, where, now, lucks, wood));
  }
  // the powers of an axe at the top, with some of each left, one left, and none
  for (let i = 0; i < 160; i++) {
    const now = c.of(NOWS), t = c.maybe(0.15) ? elder : c.of(pines), p = purse(now), g: Grove = c.maybe(0.3) ? grove(now, t) : { down: {}, half: [] }, where = beside(t);
    const power = c.of(POOL2), first = c.of(POOL1);
    p.bag = p.bag.map((s, k) => (k === 0 ? { item: "axe", n: 1, plus: 10, opts: [first, c.of(POOL1.filter((x) => x !== first)), power], ...(c.maybe(0.5) ? { gems: [c.of(ELEMENTS)] } : {}) } : s?.item === "axe" ? null : s));
    p.hand = "axe"; p.handAt = 0;
    p.stamina = { day: dayOf(now), left: c.of([0, 2, 100]) };
    p.powers = { axOne: { k: dayOf(now), n: c.of([0, 9, 10]) }, axDouble: { k: dayOf(now), n: c.of([0, 9, 10]) }, axRoot: { k: dayOf(now), n: c.of([0, 2, 3]) }, axFresh: { k: dayOf(now) * 3 + mealOf(now), n: c.of([0, 4, 5]) } };
    const b = begin(p, g, t.id, where, now, i, wood);
    add("fell_begin", [p, g, t.id, where[0], where[1], now, i], b);
    const named = (b.ok ? b.trees : [t.id]).map((tree) => ({ id: tree, felled: true, misses: c.of([0, 1, 3]) }));
    const went: FellWent = { tree: t.id, trees: named, secs: 9, ...(c.maybe(0.5) ? { one: true } : {}), ...(c.maybe(0.5) ? { twice: true } : {}) };
    const lucks = named.map(() => luck());
    add("fell", [p, g, ME, went, where[0], where[1], now, lucks], fell(p, g, ME, went, where, now, lucks, wood));
    const mine: Grove = { down: { ...g.down, [t.id]: { at: now - c.of([1, 60, 119, 121]) * 1000, by: c.maybe(0.85) ? ME : HER } }, half: g.half };
    add("fell_root", [p, mine, ME, t.id, now], rootBack(p, mine, ME, t.id, now, wood));
  }
  for (let i = 0; i < 300; i++) {
    const now = c.of(NOWS), t = c.maybe(0.1) ? elder : c.of(pines), p = purse(now), g = grove(now, t);
    if (c.maybe(0.7)) g.down[t.id] = { at: now - c.of([1, 30, 119, 120, 121, 600]) * 1000, by: c.maybe(0.8) ? ME : HER };
    const id = c.maybe(0.03) ? 9999 : t.id;
    add("fell_root", [p, g, ME, id, now], rootBack(p, g, ME, id, now, wood));
  }

  // the line
  for (const thing of [...TREES.kinds, TREES.elderKind, "oak", ""]) for (const whose of [undefined, HER]) {
    const done: Done = { from: "deed", what: "fell", thing, n: 1, doc: whose ? { whose } : {} };
    add("counts_of", [done, ME], countsOf(done, ME));
  }
  return { all: out, trees: row, wood };
}

describe("the cases the database's rules of woodcutting are held to", () => {
  it("are made the same every time, and reach every way a tree is walked up to, felled and kept", async () => {
    const { all, trees, wood } = await vectorsFelling();
    expect(JSON.stringify((await vectorsFelling()).all)).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const w = v.want as { ok: boolean; why?: string }; return w.ok ? "ok" : w.why!; }))].sort();
    expect(wood.length).toBe(121);
    expect((trees as { wood: unknown[] }).wood.length).toBe(121);
    expect(whys("fell_begin")).toEqual(["bite", "far", "full", "none", "ok", "plus", "stump", "tool"]);
    expect(whys("fell")).toEqual(["bite", "far", "full", "none", "ok", "plus", "spent", "stump", "tool"]);
    expect(whys("fell_root")).toEqual(["none", "ok", "spent", "tool"]);
    const begun = of("fell_begin").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { trees: number[]; elder: boolean; ask: { trees: Array<{ chops: number }>; spared: number; spent: boolean; ahead: number; pace: number } });
    expect(begun.some((b) => b.trees.length === 3) && begun.some((b) => b.trees.length === 2) && begun.some((b) => b.elder) && begun.some((b) => b.ask.spent) && begun.some((b) => b.ask.spared >= 2)).toBe(true);
    expect(new Set(begun.map((b) => b.ask.trees[0].chops)).size).toBeGreaterThan(8);
    expect(new Set(begun.map((b) => b.ask.pace)).size).toBeGreaterThan(8);
    const felled = of("fell").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { felled: Array<{ id: number; kind: string; got: Array<[string, number]>; chained: number | null; free: boolean; twice: boolean }>; one: boolean; purse: Purse });
    expect(felled.some((f) => f.felled.length === 0) && felled.some((f) => f.felled.length === 3) && felled.some((f) => f.one) && felled.some((f) => f.felled.some((x) => x.kind === "elder"))).toBe(true);
    expect(felled.some((f) => f.felled.some((x) => x.chained !== null)) && felled.some((f) => f.felled.some((x) => x.free)) && felled.some((f) => f.felled.some((x) => x.twice))).toBe(true);
    for (const item of ["log", "timber", "resin", "pineCone"]) expect(felled.some((f) => f.felled.some((x) => x.got.some(([id]) => id === item))), item).toBe(true);
    expect(felled.some((f) => (f.purse.felling?.owed ?? 0) > 0) && felled.some((f) => (f.purse.felling?.dust ?? 0) > 0)).toBe(true);
    expect(of("trees_told").some((v) => (v.want as { down: Array<{ until?: number }> }).down.some((d) => d.until === undefined)) && of("trees_told").some((v) => (v.want as { half: number[] }).half.length > 0)).toBe(true);
    expect(of("axe_of").some((v) => v.want === null) && of("axe_of").some((v) => v.want !== null)).toBe(true);
    expect(of("counts_of").filter((v) => (v.want as unknown[]).length === 1).length).toBe(8);
    expect(all.length).toBeGreaterThan(4000);

    const dir = process.env.TOWN_VECTORS;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/vectors-felling.json`, JSON.stringify(all));
      // (the catalog as the code has it, with the trees as `next dev` lays them out and the gifts of the later lines)
      writeFileSync(`${dir}/catalog.json`, JSON.stringify({ ...catalogOf(), trees, gifts: giftsRowAll() }));
    }
  });
});
