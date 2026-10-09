import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { farCedar, farTrees } from "./far-side";
import { timberOf } from "./felling";
import { ITEMS } from "./items";
import { countsOf, type Done } from "./line-points";
import { dayOf, mealOf } from "./stamina";
import { ELEMENTS, OPTIONS, OPTION_IDS, axeAhead, axeBarPace, axeChops, type OptionUse } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import {
  KEEPSAKE_IDS, TREES, axeOf, bearsOf, begin, bites, braceGo, bracePay, chopsFor, farFrom, fell, fellingOf, girthOf, groupOf, grownAt, heldBy, isGrown, keepsakeFor, keepsakesOf, kindOf, mostOf,
  mostTimber, opened, rootBack, tidied, toldOf, treeOf, woodOf, type FellLuck, type FellWent, type Go, type Grove, type Standing,
} from "./trees";

/**
 * The cases the database's rules of woodcutting are held to (v164's felling part; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers
 * (.claude/skills/fc-cash-town/scripts/db/v164.felling.calls.json says which function each name is):
 *
 * - a tree as the layout has it: `tree_of` (its number, tile, tier, tiles across and girth: the catalog's row held to
 *   the code's own girths), `tree_kind`, `tree_bears`, `tree_most`, `tree_far`; and by the clock: `tree_until` of a
 *   plain tree and of the ancient one either side of dawn, `tree_grown`;
 * - the axe as the game reads it: `axe_of` (the stack in the hand, by the slot it was taken up from), `axe_bites`,
 *   `axe_chops`, `axe_ahead`, `axe_pace`, `fell_chops` of axes kept soundly and not;
 * - one go on a tree at a time: `tree_held` of groves with goes that hold, that have lapsed, mine and others';
 *   `fell_opened`; `brace_go` near and far, of a go that holds and one that does not, braced already and by its own
 *   feller; `brace_pay` into a bag, into the firewood cord, and into no room;
 * - what a tree lets fall: `keepsake_ids` (the order they are weighed in), `keepsakes_of`, `keepsake_for`; and what a
 *   purse keeps of the line, `felling_of`, kept soundly and not;
 * - what is kept and told: `grove_tidied`, `trees_told` of groves with stumps, trees grown again and not yet
 *   forgotten, trees half cut, the ancient tree down, goes, a book;
 * - walking up: `fell_group`, `fell_most`, `fell_begin` at every kind of tree and at none, near and far, with every
 *   kind of axe and with none, with stamina and without, a tree somebody else's go holds, a bag and a cord with room
 *   and with none;
 * - a go: `timber_of`; `fell` of a go whose board is open, lapsed and never written down, cut through and lost, with
 *   misses, too fast, the plain way, by the axe's one chop, with twice the wood asked for, braced, with chance of
 *   every sort; `fell_root` of my own fresh stump, another's, an old one, the ancient tree's;
 * - the line: `counts_of` of a tree of each kind felled, braced and not, and of what is no tree.
 *
 * The trees are the mountain's as lib/town/far-side lays them out, wherever this is run: the ones the catalog's
 * `trees` row has.
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
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN;
const ME = "00000000-0000-0000-0000-000000000001", HER = "00000000-0000-0000-0000-000000000002", HIM = "00000000-0000-0000-0000-00000000000a";
const AXE_OPTS = OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly string[]).includes("axe"));
const POOL1 = AXE_OPTS.filter((id) => OPTIONS[id].pool === 1), POOL2 = AXE_OPTS.filter((id) => OPTIONS[id].pool === 2);
/** A tree as the catalog's row has it. */
const rowOf = (t: Standing | null) => (t ? [t.id, t.x, t.y, t.tier, t.size ?? 1, girthOf(t)] : null);

export function vectorsFelling(): { all: Vector[]; wood: Standing[] } {
  const wood = woodOf(farTrees(), farCedar());
  const c = chance(20261164), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push(JSON.parse(JSON.stringify({ fn, args, want: want ?? null })) as Vector);
  const pines = wood.filter((t) => t.tier === 1 && !t.elder), elder = wood.find((t) => t.elder)!, upper = wood.filter((t) => t.tier > 1);
  const apart = (a: Standing, b: Standing) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const trio = pines.filter((t) => pines.filter((o) => o.id !== t.id && apart(o, t) <= TREES.echo.reach).length >= 2);
  const around = (t: Standing, reach: number) => wood.filter((o) => !o.elder && o.id !== t.id && apart(o, t) <= reach);

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
  /** What a purse keeps of the line, as it may be kept. */
  const fellingKept = (): unknown => ({
    owed: c.of<unknown>([0, 0.3, 0.7, 0.15, 1.2, -1, "0.5", undefined]), dust: c.of<unknown>([0, 1, 3, 4, 5, 2.5, "2", undefined]),
    ...(c.maybe(0.6) ? { keeps: c.of<unknown>([{}, { nest: 2 }, { nest: 1, rustKey: 3, noSuchThing: 4, amber: 0, ribbon: 1.5, feather: "2", pellet: 7 }, { carvedBird: 1 }, [1, 2], "nest", null]) } : {}),
  });
  /** A purse about to fell: an axe held (mostly), stamina, gifts, the firewood cord with wood in it, counts kept. */
  const purse = (now: number, more: { full?: boolean } = {}): Purse => {
    const p = newPurse(), bag: Array<Stack | null> = p.bag.map(() => null);
    const holds = c.maybe(0.92), slot = c.int(0, 3);
    if (holds || c.maybe(0.5)) bag[slot] = axe();
    if (c.maybe(0.12)) bag[slot + 2] = axe();
    if (c.maybe(0.5)) bag[7] = { item: "log", n: c.of([1, 20, ITEMS.log.stack - 3, ITEMS.log.stack - 1, ITEMS.log.stack]) };
    if (c.maybe(0.4)) bag[8] = { item: "timber", n: c.of([1, 30, ITEMS.timber.stack - 2, ITEMS.timber.stack]) };
    if (c.maybe(0.2)) bag[9] = { item: "resin", n: c.of([1, ITEMS.resin.stack - 1, ITEMS.resin.stack]) };
    if (more.full || c.maybe(0.06)) for (let i = 0; i < bag.length; i++) bag[i] ??= { item: "stone", n: ITEMS.stone.stack };
    const hand = holds ? "axe" : c.of([null, "hoe", "axe"]);
    const out: Purse = { ...p, bag, hand: hand as Purse["hand"], stamina: c.maybe(0.1) ? { day: dayOf(now) - 1, left: 3 } : { day: dayOf(now), left: c.of([0, 0, 1, 2, 3, 40, 100]) } };
    if (c.maybe(0.5)) out.handAt = c.maybe(0.8) ? slot : c.of([slot + 2, 5, -1, 2.5]);
    if (c.maybe(0.55)) {
      const had = (["charmEchoAxe", "famWoodpecker", "thingBundle"] as const).filter(() => c.maybe(0.75));
      out.gifts = { had: [...had], charms: had.includes("charmEchoAxe") && c.maybe(0.8) ? ["charmEchoAxe"] : [], owed: 0, familiar: had.includes("famWoodpecker") && c.maybe(0.8) ? "famWoodpecker" : null, used: {} } as Purse["gifts"];
      // (the cord: three slots that take logs and fine timber before the bag does)
      if (had.includes("thingBundle") && c.maybe(0.7)) {
        out.pouches = { thingBundle: Array.from({ length: 3 }, () => c.of<Stack | null>([null, null, { item: "log", n: c.of([1, 30, ITEMS.log.stack]) }, { item: "timber", n: c.of([2, ITEMS.timber.stack - 1, ITEMS.timber.stack]) }])) };
      }
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
    if (c.maybe(0.45)) out.felling = fellingKept() as Purse["felling"];
    return out;
  };
  /** A go as it may be kept: begun so long ago, braced or not. */
  const go = (now: number, trees: number[], more: { braced?: string } = {}): Go => ({ trees, at: now - c.of([0, 1, 10, 44, 45, 46, 300]) * SEC - c.of([0, 0, 1]), ...more });
  /** The trees as they may be kept: some down (stumps, growing, grown and not yet forgotten), some half cut, goes open and lapsed, a book. */
  const grove = (now: number, about: Standing | null): Grove => {
    const down: Grove["down"] = {}, half: number[] = [];
    const near = about ? around(about, 4) : [];
    for (let i = c.int(0, 5); i > 0; i--) { const t = c.maybe(0.6) && near.length ? c.of(near) : c.of(wood); down[t.id] = { at: now - c.of([0, 5, 9, 20, 39, 40, 41, 90]) * MIN - c.int(0, 999), by: c.of([ME, HER]) }; }
    if (c.maybe(0.25)) down[elder.id] = { at: now - c.of([1, 4, 11, 20, 30]) * HOUR, by: c.of([ME, HER]) };
    if (c.maybe(0.05)) down["9999"] = { at: now, by: HER };
    for (let i = c.int(0, 3); i > 0; i--) { const t = c.maybe(0.7) && near.length ? c.of(near) : c.of(pines); if (!half.includes(t.id)) half.push(t.id); }
    const out: Grove = { down, half };
    // (somebody else's go: at the tree itself now and then, at a neighbour more often, or far off)
    if (c.maybe(0.3)) {
      const theirs = c.maybe(0.3) && about ? about : c.maybe(0.7) && near.length ? c.of(near) : c.of(pines);
      out.goes = { ...(out.goes ?? {}), [c.of([HER, HIM])]: go(now, [theirs.id, ...(c.maybe(0.3) && near.length ? [c.of(near).id] : [])], c.maybe(0.2) ? { braced: ME } : {}) };
    }
    if (c.maybe(0.3)) {
      const book: NonNullable<Grove["book"]> = {};
      for (const id of KEEPSAKE_IDS) if (c.maybe(0.3)) book[id] = { by: c.of(["Aqua", "Nine Nine", HER]), at: now - c.int(1, 99) * HOUR };
      if (Object.keys(book).length) out.book = book;
    }
    return out;
  };
  const beside = (t: Standing): [number, number] => { const n = t.size ?? 1; return c.of([[t.x - 1, t.y], [t.x + n, t.y], [t.x, t.y + n], [t.x + n, t.y + n], [t.x - 1, t.y - 1]] as Array<[number, number]>); };
  const which = (): Standing => (c.maybe(0.25) ? c.of(trio) : c.maybe(0.12) ? elder : c.maybe(0.1) ? c.of(upper) : c.of(pines));
  const luck = (): FellLuck => ({ dark: c.maybe(0.3) ? c.next() * 0.2 : c.next(), scent: c.maybe(0.4) ? c.next() * 0.25 : c.next(), which: c.next(), chain: c.maybe(0.4) ? c.next() * 0.2 : c.next(), keep: c.maybe(0.5) ? c.next() * 0.16 : c.next(), kind: c.next() });
  const lucks = (): FellLuck[] => Array.from({ length: TREES.echo.trees }, () => luck());

  /* ── a tree as the layout has it, and by the clock ── */
  for (const t of wood) {
    add("tree_of", [t.id], rowOf(t));
    add("tree_kind", [t.id], kindOf(t));
    add("tree_bears", [t.id], bearsOf(t));
    add("tree_most", [t.id], mostTimber(t));
    const where: [number, number] = c.maybe(0.5) ? beside(t) : [t.x + c.int(-4, 5), t.y + c.int(-4, 5)];
    add("tree_far", [t.id, where[0], where[1]], farFrom(t, where));
  }
  for (const id of [-1, 120, 899, 901, 9999]) add("tree_of", [id], rowOf(treeOf(id, wood)));
  for (const now of NOWS) for (const back of [0, 1, 59_999, 5 * HOUR, 23 * HOUR + 59 * MIN, 24 * HOUR]) for (const old of [false, true]) add("tree_until", [old, now - back], grownAt({ elder: old }, now - back));
  for (let i = 0; i < 240; i++) { const now = c.of(NOWS), t = c.maybe(0.2) ? elder : c.of(pines), g = grove(now, t); add("tree_grown", [g, t.id, now], isGrown(g, t, now)); }

  /* ── the axe as the game reads it ── */
  for (let i = 0; i < 400; i++) {
    const s = axe();
    const base = i % 4 === 3 ? TREES.elderChops : TREES.girths[i % 3].chops;
    add("axe_chops", [s, base], axeChops(s, base));
    add("axe_ahead", [s], axeAhead(s));
    add("axe_pace", [s], axeBarPace(s));
    const t = which();
    add("axe_bites", [s, t.id], bites(s, t));
  }
  for (let i = 0; i < 400; i++) { const s = axe(), t = which(), half = c.maybe(0.4); add("fell_chops", [s, t.id, half], chopsFor(s, t, half)); }
  for (let i = 0; i < 200; i++) { const p = purse(NOWS[0]); add("axe_of", [p], axeOf(p)); }

  /* ── one go on a tree at a time ── */
  for (let i = 0; i < 300; i++) {
    const now = c.of(NOWS), t = c.of(pines), g = grove(now, t), me = c.of([ME, HER, HIM]);
    if (c.maybe(0.5)) g.goes = { ...(g.goes ?? {}), [c.of([ME, HER])]: go(now, [t.id, ...around(t, 2).slice(0, c.int(0, 2)).map((o) => o.id)]) };
    add("tree_held", [g, t.id, now, me], heldBy(g, t.id, now, me) !== null);
  }
  for (let i = 0; i < 120; i++) {
    const now = c.of(NOWS), t = c.of(pines), g = grove(now, t), ids = [t.id, ...around(t, 2).slice(0, c.int(0, 2)).map((o) => o.id)];
    add("fell_opened", [g, ME, ids, now], opened(g, ME, ids, now));
  }
  for (let i = 0; i < 400; i++) {
    const now = c.of(NOWS), t = c.maybe(0.1) ? elder : c.of(pines), g = grove(now, t), feller = c.maybe(0.9) ? HER : c.of([ME, HIM]);
    if (c.maybe(0.85)) g.goes = { ...(g.goes ?? {}), [HER]: go(now, c.maybe(0.03) ? [9999] : [t.id], c.maybe(0.15) ? { braced: c.of([ME, HIM]) } : {}) };
    const n = t.size ?? 1, where: [number, number] = c.of([[t.x - 1, t.y], [t.x - 2, t.y + 1], [t.x + n + 1, t.y + n + 1], [t.x - 3, t.y], [t.x + n + 2, t.y - 2], [t.x, t.y + n]] as Array<[number, number]>);
    add("brace_go", [g, ME, feller, where[0], where[1], now], braceGo(g, ME, feller, where, now, wood));
    // (and, of every eighth, the go's own member at their own trunk from the same tile: nobody braces their own. No
    // number of chance is drawn for it, so every case after it is as it was)
    if (i % 8 === 0) add("brace_go", [g, HER, HER, where[0], where[1], now], braceGo(g, HER, HER, where, now, wood));
  }
  for (let i = 0; i < 200; i++) { const p = purse(NOWS[0], { full: c.maybe(0.3) }); add("brace_pay", [p], bracePay(p)); }

  /* ── what a tree lets fall, and what a purse keeps of the line ── */
  add("keepsake_ids", [], KEEPSAKE_IDS);
  for (const girth of [1, 2, 3] as const) add("keepsakes_of", [girth], keepsakesOf(girth));
  for (let i = 0; i < 700; i++) {
    const t = c.maybe(0.08) ? elder : c.maybe(0.08) ? c.of(upper) : c.of(pines);
    const whether = c.maybe(0.75) ? c.next() / TREES.keepsake.in : c.of([1 / TREES.keepsake.in, 0.5, 1, 0]), kind = c.maybe(0.9) ? c.next() : c.of([0, 1, 0.999999, 0.9999999, -1, 2]);
    add("keepsake_for", [t.id, whether, kind], keepsakeFor(t, whether, kind));
  }
  for (let i = 0; i < 200; i++) { const p = { ...newPurse(), ...(c.maybe(0.9) ? { felling: fellingKept() } : {}) } as Purse; add("felling_of", [p], fellingOf(p)); }
  for (const bears of [[2], [2, 0], [3, 1, 0], [999], []]) for (const misses of [0, 1, 2, 3, 4, 998, 999, 1000]) add("timber_of", [bears, misses], timberOf(bears, misses));

  /* ── what is kept, and what a page is told ── */
  for (let i = 0; i < 300; i++) {
    const now = c.of(NOWS), g = grove(now, c.maybe(0.5) ? c.of(pines) : null);
    if (c.maybe(0.4)) g.goes = { ...(g.goes ?? {}), [ME]: go(now, [c.of(pines).id]) };
    if (c.maybe(0.05)) g.goes = {};
    add("grove_tidied", [g, now], tidied(g, now, wood));
  }
  for (let i = 0; i < 300; i++) { const now = c.of(NOWS), p = purse(now), g = grove(now, c.maybe(0.5) ? c.of(pines) : null); add("trees_told", [g, p, now], toldOf(g, p, now, wood)); }

  /* ── walking up to a tree, and a go at it ── */
  for (let i = 0; i < 1300; i++) {
    const now = c.of(NOWS), t = which(), p = purse(now, { full: c.maybe(0.03) }), g = grove(now, t);
    const id = c.maybe(0.03) ? 9999 : t.id, where = c.maybe(0.9) ? beside(t) : ([t.x + 4, t.y + 3] as [number, number]), seed = c.maybe(0.9) ? c.int(0, 2 ** 31 - 1) : c.of([0, 1, 2 ** 31 - 1, 2 ** 31]);
    const mine = axeOf(p);
    if (mine && i % 3 === 0) {
      add("fell_group", [p, g, t.id, mine, now, ME], groupOf(p, g, t, mine, now, wood, ME).map((x) => x.id));
      const some = [t, ...around(t, 3).slice(0, c.int(0, 2))];
      add("fell_most", [mine, some.map((x) => x.id)], mostOf(mine, some));
    }
    const b = begin(p, g, id, where, now, seed, wood, ME);
    add("fell_begin", [p, g, id, where[0], where[1], now, seed, ME], b);
    // the go as it is kept when its board is put up; now and then it has lapsed by the time it ends, was never
    // written down, is for another tree, or somebody braces its trunk
    let kept = g, then = now;
    if (b.ok && c.maybe(0.8)) {
      kept = opened(g, ME, b.trees, now);
      then = now + c.of([3, 8, 20, 44, 45, 46, 120]) * SEC;
      if (c.maybe(0.3)) kept = { ...kept, goes: { ...kept.goes, [ME]: { ...kept.goes![ME], braced: c.maybe(0.9) ? HER : ME } } };
      // (a tree of the go felled by somebody meanwhile: it could not be, while the go held; it can, once it has lapsed)
      if (c.maybe(0.12)) kept = { ...kept, down: { ...kept.down, [c.of(b.trees)]: { at: then - 2 * SEC, by: HER } } };
    } else if (c.maybe(0.1)) {
      kept = opened(g, ME, [c.of(pines).id], now);
    }
    // the go: cut through, mostly; now and then lost (the trees stand); now and then the axe's one chop, or the plain way that was (refused)
    const chops = b.ok ? b.ask.chops : 12;
    const went: FellWent = {
      tree: id, through: c.maybe(0.85), misses: c.of([0, 0, 0, 1, 1, 2, 3, 5]), secs: c.maybe(0.08) ? c.of([0, 0.1, 0.3]) : Math.round((chops * (0.2 + c.next() * 0.5)) * 10) / 10,
      ...(c.maybe(0.12) ? { plain: true } : {}), ...(c.maybe(0.12) ? { one: true } : {}), ...(c.maybe(0.3) ? { twice: true } : {}),
    };
    const who = c.of(["Aqua", "Nine Nine", ME]), chanced = c.maybe(0.04) ? [] : c.maybe(0.04) ? [{ dark: 0.01, scent: 0.01, which: 0.6, chain: 0.01 } as FellLuck] : lucks();
    add("fell", [p, kept, ME, went, where[0], where[1], then, chanced, who], fell(p, kept, ME, went, where, then, chanced, wood, who));
  }
  // the powers of an axe at the top, with some of each left, one left, and none
  for (let i = 0; i < 200; i++) {
    const now = c.of(NOWS), t = c.maybe(0.15) ? elder : c.maybe(0.3) ? c.of(trio) : c.of(pines), p = purse(now), g: Grove = c.maybe(0.3) ? grove(now, t) : { down: {}, half: [] }, where = beside(t);
    const power = c.of(POOL2), first = c.of(POOL1);
    p.bag = p.bag.map((s, k) => (k === 0 ? { item: "axe", n: 1, plus: 10, opts: [first, c.of(POOL1.filter((x) => x !== first)), power], ...(c.maybe(0.5) ? { gems: [c.of(ELEMENTS)] } : {}) } : s?.item === "axe" ? null : s));
    p.hand = "axe"; p.handAt = 0;
    p.stamina = { day: dayOf(now), left: c.of([0, 2, 100]) };
    p.powers = { axOne: { k: dayOf(now), n: c.of([0, 9, 10]) }, axDouble: { k: dayOf(now), n: c.of([0, 9, 10]) }, axRoot: { k: dayOf(now), n: c.of([0, 2, 3]) }, axFresh: { k: dayOf(now) * 3 + mealOf(now), n: c.of([0, 4, 5]) } };
    const b = begin(p, g, t.id, where, now, i, wood, ME);
    add("fell_begin", [p, g, t.id, where[0], where[1], now, i, ME], b);
    const kept = b.ok && c.maybe(0.7) ? opened(g, ME, b.trees, now) : g;
    const went: FellWent = { tree: t.id, through: true, misses: c.of([0, 1, 3]), secs: 9, ...(c.maybe(0.4) ? { one: true } : {}), ...(c.maybe(0.5) ? { twice: true } : {}) };
    const chanced = lucks();
    add("fell", [p, kept, ME, went, where[0], where[1], now + 9 * SEC, chanced, "Aqua"], fell(p, kept, ME, went, where, now + 9 * SEC, chanced, wood, "Aqua"));
    const stump: Grove = { down: { ...g.down, [t.id]: { at: now - c.of([1, 60, 119, 121]) * SEC, by: c.maybe(0.85) ? ME : HER } }, half: g.half, ...(g.goes ? { goes: g.goes } : {}), ...(g.book ? { book: g.book } : {}) };
    add("fell_root", [p, stump, ME, t.id, now], rootBack(p, stump, ME, t.id, now, wood));
  }
  for (let i = 0; i < 300; i++) {
    const now = c.of(NOWS), t = c.maybe(0.1) ? elder : c.of(pines), p = purse(now), g = grove(now, t);
    if (c.maybe(0.7)) g.down[t.id] = { at: now - c.of([1, 30, 119, 120, 121, 600]) * SEC, by: c.maybe(0.8) ? ME : HER };
    const id = c.maybe(0.03) ? 9999 : t.id;
    add("fell_root", [p, g, ME, id, now], rootBack(p, g, ME, id, now, wood));
  }

  /* ── the line ── */
  for (const thing of [...TREES.kinds, TREES.elderKind, "oak", ""]) for (const braced of [undefined, HER, ME, "", 7]) {
    const done: Done = { from: "deed", what: "fell", thing, n: 1, doc: { tree: 5, misses: 0, ...(braced === undefined ? {} : { braced }) } };
    add("counts_of", [done, ME], countsOf(done, ME));
  }
  return { all: out, wood };
}

describe("the cases the database's rules of woodcutting are held to", () => {
  it("are made the same every time, and reach every way a tree is walked up to, felled, braced and kept", () => {
    const { all, wood } = vectorsFelling();
    expect(JSON.stringify(vectorsFelling().all)).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const w = v.want as { ok: boolean; why?: string }; return w.ok ? "ok" : w.why!; }))].sort();
    expect(wood.length).toBe(213);
    expect((catalogOf().trees as { wood: unknown[] }).wood).toEqual(wood.map(rowOf));
    expect(whys("fell_begin")).toEqual(["bite", "far", "full", "held", "none", "ok", "plus", "stump", "tool"]);
    expect(whys("fell")).toEqual(["bite", "board", "far", "full", "held", "none", "ok", "plus", "spent", "stump", "tool"]);
    expect(whys("fell_root")).toEqual(["none", "ok", "spent", "tool"]);
    expect(whys("brace_go")).toEqual(["far", "none", "ok"]);
    // (one's own trunk is refused, and often where anybody else would have been let: the go up, near enough, nobody at it yet)
    const own = of("brace_go").filter((v) => v.args[1] === v.args[2]);
    expect(own.every((v) => (v.want as { why?: string }).why === "none")).toBe(true);
    expect(own.filter((v) => braceGo(v.args[0] as Grove, ME, HER, [v.args[3] as number, v.args[4] as number], v.args[5] as number, wood).ok).length).toBeGreaterThan(10);
    const begun = of("fell_begin").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { trees: number[]; elder: boolean; ask: { chops: number; spared: number; spent: boolean; ahead: number; pace: number; family: string; girth: number; trees: Array<{ timber: number[] }> } });
    expect(begun.some((b) => b.trees.length === 3) && begun.some((b) => b.trees.length === 2) && begun.some((b) => b.elder) && begun.some((b) => b.ask.spent) && begun.some((b) => b.ask.spared >= 2)).toBe(true);
    expect(new Set(begun.map((b) => b.ask.family))).toEqual(new Set(["alternate", "pairs", "run", "noise"]));
    expect(new Set(begun.map((b) => b.ask.girth))).toEqual(new Set([1, 2, 3]));
    expect(new Set(begun.map((b) => b.ask.chops)).size).toBeGreaterThan(8);
    expect(new Set(begun.map((b) => b.ask.pace)).size).toBeGreaterThan(8);
    type One = { id: number; kind: string; girth: number; misses: number; got: Array<[string, number]>; timber: number; most: number; chained: number | null; free: boolean; twice: boolean; keepsake?: string };
    const felled = of("fell").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ args: v.args, ...(v.want as { felled: One[]; one: boolean; plain: boolean; through: boolean; stood: boolean; found: Array<{ id: string; first: boolean }>; braced: string | null; purse: Purse; grove: Grove }) }));
    expect(felled.some((f) => f.stood && f.felled.length === 0) && felled.some((f) => f.felled.length === 3) && felled.some((f) => f.one) && !felled.some((f) => f.plain)).toBe(true);
    // a go that was lost: every tree of it stands, whatever the tree, and the purse is as it came
    const lostGoes = felled.filter((f) => !f.through);
    expect(lostGoes.length).toBeGreaterThan(50);
    expect(lostGoes.every((f) => f.stood && f.felled.length === 0 && f.found.length === 0 && f.braced === null && JSON.stringify(f.purse) === JSON.stringify(f.args[0]))).toBe(true);
    expect(lostGoes.some((f) => (f.args[3] as FellWent).tree !== TREES.elder.id) && lostGoes.some((f) => !!(f.args[1] as Grove).goes?.[ME] && !f.grove.goes?.[ME])).toBe(true);
    expect(felled.every((f) => f.through || f.stood)).toBe(true);
    // (the plain way that was is asked for some hundreds of times, and never answered with a tree)
    const plains = of("fell").filter((v) => (v.args[3] as FellWent).plain && !(v.args[3] as FellWent).one);
    expect(plains.length).toBeGreaterThan(100);
    expect(plains.every((v) => (v.want as { ok: boolean }).ok === false) && plains.some((v) => (v.want as { why?: string }).why === "board")).toBe(true);
    expect(felled.some((f) => f.felled.some((x) => x.kind === "elder")) && felled.some((f) => f.felled.some((x) => x.chained !== null)) && felled.some((f) => f.felled.some((x) => x.free)) && felled.some((f) => f.felled.some((x) => x.twice))).toBe(true);
    for (const item of ["log", "timber", "resin", "pineCone"]) expect(felled.some((f) => f.felled.some((x) => x.got.some(([id]) => id === item))), item).toBe(true);
    // every fine timber a girth has is won and lost; a keepsake found for the first time and not; a brace to be paid
    expect(new Set(felled.flatMap((f) => f.felled.filter((x) => x.kind === "pine" && !f.one).map((x) => `${x.girth}:${x.timber}`))).size).toBeGreaterThanOrEqual(9);
    expect(felled.some((f) => f.found.some((x) => x.first)) && felled.some((f) => f.found.some((x) => !x.first)) && new Set(felled.flatMap((f) => f.found.map((x) => x.id))).size).toBe(KEEPSAKE_IDS.length);
    expect(felled.some((f) => f.braced === HER) && felled.some((f) => f.braced === null && (f.args[1] as Grove).goes?.[ME]?.braced === ME)).toBe(true);
    expect(felled.some((f) => (f.purse.felling?.owed ?? 0) > 0) && felled.some((f) => (f.purse.felling?.dust ?? 0) > 0) && felled.some((f) => Object.keys(f.purse.felling?.keeps ?? {}).length > 1)).toBe(true);
    // a go whose board was open is paid for its own trees; one that lapsed, for those still standing; wood into the cord before the bag
    expect(felled.some((f) => !!(f.args[1] as Grove).goes?.[ME] && !f.grove.goes?.[ME]) && felled.some((f) => JSON.stringify(f.purse.pouches) !== JSON.stringify((f.args[0] as Purse).pouches))).toBe(true);
    expect(of("trees_told").some((v) => (v.want as { down: Array<{ until?: number }> }).down.some((d) => d.until === undefined)) && of("trees_told").some((v) => (v.want as { half: number[] }).half.length > 0)
      && of("trees_told").some((v) => ((v.want as { book?: unknown[] }).book ?? []).length > 1)).toBe(true);
    expect(of("grove_tidied").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0])) && of("grove_tidied").some((v) => !!(v.args[0] as Grove).goes && !(v.want as Grove).goes)
      && of("grove_tidied").some((v) => Object.keys((v.want as Grove).down).length < Object.keys((v.args[0] as Grove).down).length)).toBe(true);
    expect(of("tree_held").some((v) => v.want === true) && of("tree_held").some((v) => v.want === false && !!(v.args[0] as Grove).goes)).toBe(true);
    expect(of("axe_of").some((v) => v.want === null) && of("axe_of").some((v) => v.want !== null)).toBe(true);
    expect(new Set(of("keepsake_for").map((v) => v.want)).size).toBe(KEEPSAKE_IDS.length + 1);
    expect(of("brace_pay").some((v) => (v.want as { got: unknown[] }).got.length === 0) && of("brace_pay").some((v) => (v.want as { got: unknown[] }).got.length === 1)).toBe(true);
    expect(of("counts_of").filter((v) => (v.want as unknown[]).length === 2).length).toBe(4);
    expect(of("counts_of").filter((v) => (v.want as unknown[]).length === 1).length).toBe(16);
    expect(all.length).toBeGreaterThan(7000);

    const dir = process.env.TOWN_VECTORS;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/vectors-felling.json`, JSON.stringify(all));
      // (the catalog as the code has it: with the mountain's trees in it, lib/town/far-side)
      writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf()));
    }
  });
});
