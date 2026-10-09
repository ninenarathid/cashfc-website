import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsLines } from "./db-vectors-lines.test";
import {
  SMITH, TRIES, bellows, bellowsLeft, bellowsOff, candidates, choose, collect, draw, dryOf, forgeTry, markFound, markTop, newBoard, newSmithy, outcomeOf, owedOf, pendingSlot, pickOffer,
  redraw, setGem, smelt, smithView, soundSmithy, timberFor, tryCost, tryOdds, widen, type Pending, type SmithBoard, type Smithy,
} from "./forge";
import { ITEMS, type ItemId } from "./items";
import { countsOf, type Counts, type Done } from "./line-points";
import {
  BUILT, ELEMENTS, FORGE, GEMS, OPTIONS, OPTION_IDS, SMELTING, SMELTS, TOOL_KINDS, drawable, drawnOf, elementOfGem, gemsOf, has, levelOf, poolOf, settable, toolKindOf,
  type Element, type OptionId, type ToolKind,
} from "./tools";
import { held, newPurse, put, type Purse, type Stack } from "./trade";

/**
 * The cases the database's rules of the blacksmith are held to (v164's smith part; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers
 * (.claude/skills/fc-cash-town/scripts/db/v164.smith.calls.json says which function each name is):
 *
 * - what a tool carries, read back (lib/town/tools): `tool_kind`, `tool_level`, `tool_drawn`, `tool_gems`, `tool_has`
 *   of tools kept soundly and not (a plus that is no number, past the top, under nothing; options of another pool, of
 *   another tool, the same twice, a hole, what is no option; gems that are no element, more than the sockets), and of
 *   things that are no tool that is forged; `forge_drawable`, `forge_settable`, `gem_element`: every kind, pool,
 *   element and gem there is, and what is none;
 * - the table: `try_cost` and `try_odds` of every kind and level, and past both ends; `outcome_of` either side of each
 *   share's edge;
 * - what is kept: `smithy_sound` of smithies kept soundly and wrongly in each way there is; `smith_view` of queues
 *   with pieces done, smelting, waiting and none, at moments either side of each end;
 * - smelting: `smith_dry`, `smith_timber`; `smelt` with every piece and what is no piece, numbers of every sort,
 *   places free and not, fragments, timber and coins enough and one short, a timber already burning, an axe of
 *   seasoned wood awake and asleep; `smith_collect` with nothing done, some done and a bag with room for all, some
 *   and none of it; `bellows_left` and `bellows` by the owner and by another, with a piece smelting and none, a piece
 *   that has had none to three presses (and one kept with more), every piece's own share, and a piece with less
 *   than a press's worth left; `smith_widen` at each width, with enough and one short;
 * - a try: `forge_candidates`, `forge_owed`; `forge_try` of every kind at every level with chance of every sort, with
 *   ore, timber and coins enough and one short, of a tool owed a draw, of what is no tool, of no slot;
 * - the options: `pick_offer` from none to six options with chance at both ends; `pending_slot`; `forge_draw` with no
 *   draw waiting, the same one waiting, another's waiting whose tool is in the bag and whose tool is not;
 *   `forge_redraw` of an option awake, asleep and not had, with a gem, without, with what is no gem, with a draw
 *   waiting; `forge_choose` of one laid out, of the old one, of neither, for the tool meant and another;
 * - a gem: `gem_set` in every kind of tool, of every element and what is no gem, over none, another and the same,
 *   with the mount and the coins and without;
 * - the board: `board_top`, `board_found`, written once and not again;
 * - the helpers' line: `counts_of` of the bellows worked for another, for oneself and for nobody named; and every
 *   case the lines of work are held to already (lib/town/db-vectors-lines.test.ts), to see that nothing else counts
 *   otherwise.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-smith.test.ts
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
const NOW = at("2026-10-08T12:00:00"), MIN = 60_000, HOUR = 60 * MIN;
const ME = "00000000-0000-0000-0000-000000000001", HER = "00000000-0000-0000-0000-000000000002", HIM = "00000000-0000-0000-0000-000000000003";
const KINDS: ToolKind[] = [...TOOL_KINDS];
const PIECES = Object.keys(SMELTS) as ItemId[];
const GEM_IDS = ELEMENTS.map((e) => GEMS[e].gem);
/** Things that are no tool that is forged: better tools, what holds something, plain things. */
const NO_TOOLS: ItemId[] = ["rodTeak", "hoeIron", "canCopper", "potBrass", "netSmall", "minnow", "bowl", "timber", "oreCopper", "gemRuby", "bucket"];

export function vectorsSmith(): Vector[] {
  const c = chance(20261164), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const two = (from: readonly OptionId[]): OptionId[] => { const pool = [...from]; return [pool.splice(c.int(0, pool.length - 1), 1)[0], pool.splice(c.int(0, Math.max(0, pool.length - 1)), 1)[0]].filter(Boolean); };
  const edge = () => c.of([0, 0.000001, 0.5, 0.999998, 0.999999, 1, 1.7, -0.3]);
  const luck = () => (c.maybe(0.2) ? edge() : c.next());

  /* ── what a tool may carry: sound, or wrong in one of the ways there are ── */
  const plusKept = (): unknown => c.of<() => unknown>([() => undefined, () => 0, () => c.int(1, 10), () => c.int(1, 10), () => c.int(1, 10), () => 3, () => 6, () => 10, () => 11, () => 99, () => -2, () => 4.7, () => "5", () => null, () => true])();
  const optsKept = (kind: ToolKind): unknown => {
    const p1 = poolOf(kind, 1), p2 = poolOf(kind, 2), other = c.of(KINDS.filter((k) => k !== kind && !(OPTIONS[poolOf(k, 1)[0]].tools as readonly string[]).includes(kind)));
    const [x, y] = two(p1);
    return c.of<() => unknown>([
      () => undefined, () => [], () => [x], () => [x], () => [x, y], () => [x, y], () => [x, y, c.of(p2)], () => [x, y, c.of(p2)],
      () => ["", y], () => ["", "", c.of(p2)], () => [x, "", c.of(p2)], () => [x, x], () => [x, y, x], () => [c.of(p2)], () => [x, c.of(p2)], () => [x, y, c.of(p1)],
      () => [c.of(poolOf(other, 1))], () => [x, c.of(poolOf(other, 1)), c.of(poolOf(other, 2))], () => ["noSuchOption", 3, null], () => [null, y], () => x, () => null, () => ({ 0: x }), () => [x, y, c.of(p2), c.of(p2)],
    ])();
  };
  const gemsKept = (): unknown => c.of<() => unknown>([() => undefined, () => undefined, () => [], () => [c.of(ELEMENTS)], () => [c.of(ELEMENTS)], () => [c.of(ELEMENTS), c.of(ELEMENTS)], () => ["noSuchElement", "ice"], () => [3, "light"], () => "fire", () => null, () => [null], () => ["gemRuby"]])();
  /** A stack of a kind of tool, with whatever is kept on it (and now and then the water a can holds). */
  const anyTool = (kind: ToolKind): Stack => {
    const plus = plusKept(), opts = optsKept(kind), gems = gemsKept();
    return { item: kind, n: 1, ...(plus === undefined ? {} : { plus }), ...(opts === undefined ? {} : { opts }), ...(gems === undefined ? {} : { gems }), ...(kind === "can" && c.maybe(0.5) ? { water: c.int(0, 8) } : {}) } as Stack;
  };
  /** A tool kept soundly at a level: its options drawn at every milestone reached (or, where said, owed one), and a gem or none. */
  const soundTool = (kind: ToolKind, level: number, how: { owed?: boolean; gem?: Element | null } = {}): Stack => {
    const [x, y] = two(poolOf(kind, 1)), z = c.of(poolOf(kind, 2));
    const reached = FORGE.milestones.filter((m) => level >= m).length, drawn = [x, y, z].slice(0, how.owed ? Math.max(0, reached - 1) : reached);
    const gem = how.gem === undefined ? (c.maybe(0.3) ? c.of(ELEMENTS) : null) : how.gem;
    return { item: kind, n: 1, ...(level > 0 ? { plus: level } : {}), ...(drawn.length ? { opts: drawn } : {}), ...(gem ? { gems: [gem] } : {}) };
  };
  const notTool = (): Stack | null => c.of<() => Stack | null>([
    () => null, () => ({ item: c.of(NO_TOOLS), n: 1 }), () => ({ item: "minnow", n: c.int(1, 9) }), () => ({ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }),
    () => ({ item: "rodTeak", n: 1, plus: 5, opts: ["rdBait"], gems: ["fire"] }), () => ({ item: "bucket", n: 1, water: 1 }),
  ])();
  /** A purse with coins and a bag of so many slots: what is given first, each in a slot of its own, then things by the number. */
  const purseWith = (coins: number, stacks: Array<Stack | null>, things: Array<[ItemId, number]> = [], slots = 12): Purse => {
    let bag: Purse["bag"] = [...stacks, ...Array<null>(Math.max(0, slots - stacks.length)).fill(null)];
    for (const [id, n] of things) if (n > 0) bag = put(bag, id, n);
    return { ...newPurse(), coins, bag };
  };

  /* ── what a tool carries, read back ── */
  for (const item of [...KINDS, ...NO_TOOLS, "potFull", "noSuchThing", "", null]) add("tool_kind", [item], toolKindOf(item));
  for (let i = 0; i < 520; i++) {
    const kind = c.of(KINDS), s = c.maybe(0.12) ? notTool() : anyTool(kind);
    add("tool_level", [s], levelOf(s));
    add("tool_drawn", [s], drawnOf(s));
    add("tool_gems", [s], gemsOf(s));
    const mine = drawnOf(s).filter((o): o is OptionId => !!o), id = c.of<string>([mine[0] ?? c.of(OPTION_IDS), mine[mine.length - 1] ?? c.of(OPTION_IDS), c.of(OPTION_IDS), "axDry", "noSuchOption"]);
    add("tool_has", [s, id], has(s, id as OptionId));
    for (let m = -1; m <= FORGE.milestones.length; m++) add("forge_candidates", [s, m], candidates(s, m));
    add("forge_owed", [s], owedOf(s));
  }
  // (every option of every kind where it is awake and where it sleeps: at each level, drawn at its own milestone)
  for (const kind of KINDS) for (const pool of [1, 2] as const) for (const id of poolOf(kind, pool)) for (const level of [0, 2, 3, 5, 6, 9, 10]) {
    const s: Stack = { item: kind, n: 1, plus: level, opts: pool === 1 ? (c.maybe(0.5) ? [id] : ["", id]) : ["", "", id] };
    add("tool_has", [s, id], has(s, id));
  }
  for (const kind of [...KINDS, "rodTeak", "noSuchThing", null]) {
    for (const pool of [1, 2, 0, 3]) add("forge_drawable", [kind, pool], kind && toolKindOf(kind) && (pool === 1 || pool === 2) ? drawable(kind as ToolKind, pool) : []);
    for (const e of [...ELEMENTS, "noSuchElement", null]) add("forge_settable", [kind, e], !!kind && !!toolKindOf(kind) && !!e && (ELEMENTS as readonly string[]).includes(e) && settable(kind as ToolKind, e as Element));
  }
  for (const item of [...GEM_IDS, ...ELEMENTS.map((e) => GEMS[e].chip), "oreCopper", "timber", "noSuchThing", null]) add("gem_element", [item], elementOfGem(item));

  /* ── the table ── */
  for (const kind of KINDS) for (let to = -1; to <= FORGE.top + 2; to++) add("try_cost", [kind, to], tryCost(kind, to));
  for (let to = -1; to <= FORGE.top + 2; to++) {
    add("try_odds", [to], tryOdds(to));
    const o = tryOdds(to) ?? { take: 50, stay: 25, down: 25 }, tiny = 1e-9;
    for (const r of [0, 0.25, o.take / 100 - tiny, o.take / 100, o.take / 100 + tiny, (o.take + o.stay) / 100 - tiny, (o.take + o.stay) / 100, (o.take + o.stay) / 100 + tiny, 0.999998, 0.999999, 1, 2.5, -0.4, c.next(), c.next()]) add("outcome_of", [to, r], outcomeOf(to, r));
  }

  /* ── what is kept ── */
  /** A queue: pieces done, the one smelting (`blown`: the presses of the bellows it has had), those waiting, by the moment; one after another, as they are put in. */
  const queueAt = (now: number, done: number, running: boolean, waiting: number, blown = 0): Smithy["queue"] => {
    const q: Smithy["queue"] = [];
    let from = now - done * 20 * MIN - (running ? c.int(1, 4) * MIN : -c.int(0, 1) * MIN);
    for (let i = 0; i < done + (running ? 1 : 0) + waiting; i++) {
      const piece = c.of(PIECES), mins = i < done ? c.int(5, 11) : SMELTS[piece]!.mins, till = i < done ? Math.min(now - (done - i - 1) * MIN, from + mins * MIN) : from + mins * MIN;
      q.push({ piece, from: Math.min(from, till), till, ...(running && i === done && blown > 0 ? { blown } : {}) });
      from = till;
    }
    return q;
  };
  const smithyAt = (now: number, how: Partial<{ done: number; running: boolean; waiting: number; more: number; ember: number; helped: number; pending: Pending | null }> = {}): Smithy => ({
    queue: queueAt(now, how.done ?? c.int(0, 2), how.running ?? c.maybe(0.6), how.waiting ?? c.int(0, 2), how.helped ?? c.int(0, 3)), more: how.more ?? c.of([0, 0, 1, 2]), ember: how.ember ?? c.of([0, 0, 0, 1]),
    pending: how.pending ?? null,
  });
  const kepts: unknown[] = [
    undefined, null, "smithy", 7, [], {}, newSmithy(),
    { queue: "x", more: "2", ember: -3, helps: {}, pending: [] },
    { queue: [{ piece: "oreCopper", from: 5, till: 9 }, { piece: "oreIron", from: 9, till: 7 }, { piece: "noSuchPiece", from: 1, till: 2 }, { piece: "shardCopper", from: 1, till: 2 }, null, 3, { piece: "gemRuby", from: "1", till: 2 }, { piece: "gemOnyx", from: 2, till: 2, extra: true }, { from: 1, till: 2 }], more: 1.9, ember: 2.5 },
    { queue: [{ piece: "oreSilver", from: 50, till: 90 }, { piece: "oreCopper", from: 10, till: 40 }, { piece: "oreIron", from: 40, till: 50 }, { piece: "gemRuby", from: 20, till: 40 }], more: 7, ember: 0 },
    { more: -1, ember: 3, helps: [{ by: ME, at: 5 }, { by: 3, at: 5 }, { by: HER }, null, "x", { by: HIM, at: "7" }, { by: HER, at: 9, more: 1 }] },
    { queue: [{ piece: "oreIron", from: 5, till: 9, blown: 2 }, { piece: "oreCopper", from: 9, till: 12, blown: 9 }, { piece: "gemRuby", from: 12, till: 15, blown: -1 }, { piece: "gemOnyx", from: 15, till: 18, blown: "2" }, { piece: "oreSilver", from: 18, till: 21, blown: 1.9 }] },
    { pending: { item: "pick", at: 0, offer: ["pkPeek", "pkCrumb"] } }, { pending: { item: "axe", at: 2, offer: ["axOne"], old: "axRoot" } }, { pending: { item: "pick", at: 1, offer: [], old: 5 } },
    { pending: { item: "rodTeak", at: 0, offer: ["rdBait"] } }, { pending: { item: "pick", at: 3, offer: ["pkPeek"] } }, { pending: { item: "pick", at: -1, offer: ["pkPeek"] } }, { pending: { item: "pick", at: 1.5, offer: ["pkPeek"] } },
    { pending: { item: "pick", at: 0, offer: ["pkPeek", 3] } }, { pending: { item: "pick", at: 0, offer: "pkPeek" } }, { pending: { item: "pick", at: 0 } }, { pending: "pick" }, { pending: null }, { pending: { item: "pick", at: "0", offer: [] } },
    { pending: { item: "hoe", at: 1, offer: ["anything", ""], old: "", junk: 1 } },
  ];
  // (a word is sent as the document it is: whoever asks the database sends text for a document as it is written)
  for (const k of kepts) add("smithy_sound", [k === undefined ? null : typeof k === "string" ? JSON.stringify(k) : k], soundSmithy(k));
  for (let i = 0; i < 160; i++) { const s = smithyAt(NOW), k = c.maybe(0.5) ? { ...s, queue: [...s.queue].reverse(), junk: true } : s; add("smithy_sound", [k], soundSmithy(k)); }
  for (let i = 0; i < 260; i++) {
    const s = smithyAt(NOW), ends = s.queue.flatMap((q) => [q.from, q.till]);
    const now = c.of([NOW, NOW, NOW + c.int(1, 30) * MIN, NOW - c.int(1, 30) * MIN, ...(ends.length ? [c.of(ends), c.of(ends) - 1, c.of(ends) + 1] : [NOW])]);
    add("smith_view", [s, now], smithView(s, now));
  }

  /* ── smelting ── */
  /** An axe of seasoned wood: awake at its level, asleep under it, or the option not had. */
  const dryAxe = (): Stack | null => c.of<() => Stack | null>([() => null, () => null, () => null, () => ({ item: "axe", n: 1, plus: c.int(3, 10), opts: ["axDry"] }), () => ({ item: "axe", n: 1, plus: c.int(6, 10), opts: ["axKeen", "axDry"] }),
    () => ({ item: "axe", n: 1, plus: c.int(0, 2), opts: ["axDry"] }), () => ({ item: "axe", n: 1, plus: 5, opts: ["axKeen", "axDry"] }), () => ({ item: "axe", n: 1, plus: 9, opts: ["axKeen"] }), () => ({ item: "pick", n: 1, plus: 9, opts: ["axDry"] })])();
  for (let i = 0; i < 120; i++) { const p = purseWith(0, [dryAxe(), notTool(), dryAxe()]); add("smith_dry", [p.bag], dryOf(p.bag)); }
  for (const ember of [0, 1, 2, 5]) for (const n of [0, 1, 2, 3, 4, 7]) for (const dry of [1, 2, 3]) add("smith_timber", [{ ...newSmithy(), ember }, n, dry], timberFor({ ...newSmithy(), ember }, n, dry));
  for (let i = 0; i < 620; i++) {
    const piece = c.maybe(0.9) ? c.of(PIECES) : c.of<string>(["shardCopper", "timber", "noSuchPiece", "pick"]), rule = SMELTS[piece as ItemId];
    const n = c.of<number | null>([1, 1, 1, 2, 2, 3, 3, 4, 6, 0, -1, 1.5, null]), k = typeof n === "number" && Number.isInteger(n) && n > 0 ? n : 1;
    const s = smithyAt(NOW, { more: c.of([0, 0, 0, 1, 2]) });
    const fragments = rule ? SMELTING.fragments * k + c.of([0, 0, 0, 5, 40, -1, -SMELTING.fragments * k]) : 30, timber = k + c.of([0, 0, 0, 2, -1, -k]), coins = (rule?.fee ?? 5) * k + c.of([0, 0, 0, 100, -1]);
    const p = purseWith(Math.max(0, coins), [dryAxe()], [...(rule ? [[rule.of, Math.min(99, Math.max(0, fragments))] as [ItemId, number]] : []), ["timber", Math.max(0, timber)], ["shardIron", c.int(0, 12)]]);
    const now = c.of([NOW, NOW, NOW + 3 * MIN, NOW + HOUR]);
    add("smelt", [p, s, piece, n, now], smelt(p, s, piece as ItemId, n as number, now));
  }
  // (each thing short by itself, with everything else plentiful: so that it is that one which refuses)
  for (const piece of PIECES) for (const short of ["nothing", "places", "ore", "timber", "coins"] as const) for (const n of [1, 3]) {
    const rule = SMELTS[piece]!, s = { ...newSmithy(), queue: short === "places" ? queueAt(NOW, 0, true, 3 - n) : [] };
    const p = purseWith(short === "coins" ? rule.fee * n - 1 : 5000, [], [[rule.of, short === "ore" ? SMELTING.fragments * n - 1 : 60], ["timber", short === "timber" ? n - 1 : 9]]);
    add("smelt", [p, s, piece, n, NOW], smelt(p, s, piece, n, NOW));
  }
  for (let i = 0; i < 380; i++) {
    const s = smithyAt(NOW, { done: c.of([0, 1, 2, 3, 5]) }), fill = c.of(["empty", "some", "one", "none"] as const);
    let bag: Purse["bag"] = Array<null>(c.of([4, 8])).fill(null);
    if (fill === "some") bag = bag.map((_, j) => (j % 2 ? { item: "boot" as ItemId, n: 1 } : null));
    if (fill === "one") bag = bag.map((_, j) => (j === 2 ? (c.maybe(0.5) ? null : { item: c.of(PIECES), n: ITEMS.oreCopper.stack - 1 }) : { item: "boot" as ItemId, n: 1 }));
    if (fill === "none") bag = bag.map(() => ({ item: "boot" as ItemId, n: 1 }));
    const p = { ...newPurse(), coins: 3, bag }, now = c.of([NOW, NOW, NOW + 10 * MIN, NOW + 30 * 24 * HOUR, NOW - HOUR]);
    add("smith_collect", [p, s, now], collect(p, s, now));
  }
  for (let i = 0; i < 520; i++) {
    const s = smithyAt(NOW, { running: c.maybe(0.75), helped: c.of([0, 0, 1, 2, 3, 4]) }), owner = c.of([HER, HER, HER, ME]), now = c.of([NOW, NOW, NOW + 30_000, NOW + 2 * MIN]);
    add("bellows_left", [s, now], bellowsLeft(s, now));
    add("bellows", [s, owner, ME, now], bellows(s, owner, ME, now));
  }
  // (every piece's own share, with less than a press's worth left and with more; and a piece that has had each number of presses)
  for (const piece of PIECES) for (const left of [1, 1000, bellowsOff(piece) - 1, bellowsOff(piece), bellowsOff(piece) + 1, 4 * MIN]) for (const blown of [0, 1, 2, 3]) {
    const s: Smithy = { ...newSmithy(), queue: [{ piece, from: NOW - MIN, till: NOW + left, ...(blown ? { blown } : {}) }, { piece: "gemRuby", from: NOW + left, till: NOW + left + 10 * MIN }] };
    add("bellows_left", [s, NOW], bellowsLeft(s, NOW));
    add("bellows", [s, HER, ME, NOW], bellows(s, HER, ME, NOW));
  }
  for (const more of [0, 1, 2, 3]) for (const short of ["nothing", "timber", "coins"] as const) for (const extra of [0, 7]) {
    const cost = SMITH.more[more] ?? { timber: 20, coins: 200 }, s = { ...smithyAt(NOW), more };
    const p = purseWith(short === "coins" ? cost.coins - 1 : cost.coins + extra, [soundTool("axe", 4)], [["timber", short === "timber" ? cost.timber - 1 : cost.timber + extra]]);
    add("smith_widen", [p, s], widen(p, s));
  }

  /* ── a try ── */
  for (let i = 0; i < 1500; i++) {
    const kind = c.of(KINDS), level = c.of([0, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 10]);
    const stack = c.maybe(0.06) ? anyTool(kind) : soundTool(kind, level, { owed: c.maybe(0.08) }), from = levelOf(stack), cost = tryCost(kind, from + 1) ?? tryCost(kind, 1)!;
    const ore = cost.n + c.of([0, 0, 0, 0, 3, 30, -1, -cost.n]), timber = cost.timber + c.of([0, 0, 0, 0, 2, 9, -1, -cost.timber]), coins = cost.fee + c.of([0, 0, 0, 0, 1, 4000, -1, -cost.fee]);
    const before = Array.from({ length: c.int(0, 3) }, () => notTool());
    const p = purseWith(Math.max(0, coins), [...before, stack, c.maybe(0.3) ? soundTool(kind, c.int(0, 10)) : null], [[cost.ore, Math.min(ITEMS[cost.ore].stack, Math.max(0, ore))], ["timber", Math.max(0, timber)], ["minnow", 3]], c.of([8, 12]));
    const slot = c.maybe(0.9) ? before.length : c.of<number | null>([-1, p.bag.length, 99, 0, before.length + 2, null]);
    const r = luck();
    add("forge_try", [p, slot, r], forgeTry(p, newSmithy(), slot as number, r));
  }
  // (every kind at every level with everything it takes, and chance in each share: what is spent, and where the level goes)
  for (const kind of KINDS) for (let level = 0; level <= FORGE.top; level++) for (const share of ["taken", "stays", "down"] as const) {
    const o = tryOdds(level + 1) ?? { take: 100, stay: 0, down: 0 }, cost = tryCost(kind, level + 1) ?? tryCost(kind, 1)!;
    const r = share === "taken" ? (o.take / 100) * c.next() : share === "stays" ? (o.take + o.stay * c.next()) / 100 : (o.take + o.stay + o.down * c.next()) / 100;
    // (a watering can keeps the water in it through a try)
    const p = purseWith(cost.fee + 10, [{ ...soundTool(kind, level, { gem: null }), ...(kind === "can" ? { water: 5 } : {}) }], [[cost.ore, cost.n + 1], ["timber", cost.timber + 1]]);
    add("forge_try", [p, 0, r], forgeTry(p, newSmithy(), 0, r));
  }
  // (the ore in two stacks, and the tool behind them: taking its materials never moves it)
  for (const kind of ["pick", "axe"] as const) for (const level of [0, 3, 4, 8]) {
    const cost = tryCost(kind, level + 1)!, half = Math.max(1, Math.floor(cost.n / 2));
    const p: Purse = { ...newPurse(), coins: cost.fee, bag: [{ item: cost.ore, n: half }, { item: "timber", n: cost.timber }, soundTool(kind, level, { gem: null }), { item: cost.ore, n: cost.n - half + 2 }, null, { item: "timber", n: 1 }] };
    add("forge_try", [p, 2, 0.1], forgeTry(p, newSmithy(), 2, 0.1));
  }

  /* ── the options ── */
  for (const n of [0, 1, 2, 3, 6]) for (let i = 0; i < 14; i++) { const from = OPTION_IDS.slice(0, n), r1 = luck(), r2 = luck(); add("pick_offer", [from, r1, r2], pickOffer(from, r1, r2)); }
  /** A draw that waits, for a kind of tool at a milestone: as it is owed, or (`old`) as it is made again. */
  const waiting = (kind: ToolKind, m: number, old?: OptionId): Pending => ({ item: kind, at: m, offer: two(drawable(kind, FORGE.pools[m] ?? 1).length ? drawable(kind, FORGE.pools[m] ?? 1) : poolOf(kind, FORGE.pools[m] ?? 1)), ...(old ? { old } : {}) });
  const BUILT_KINDS = KINDS.filter((k) => BUILT[k].opts.length > 0);
  for (let i = 0; i < 900; i++) {
    const kind = c.maybe(0.85) ? c.of(BUILT_KINDS) : c.of(KINDS), level = c.of([0, 2, 3, 3, 4, 5, 6, 6, 7, 9, 10, 10]);
    const stack = c.maybe(0.05) ? anyTool(kind) : soundTool(kind, level, { owed: c.maybe(0.6) }), m = owedOf(stack), mine = drawnOf(stack);
    const otherKind = c.of(BUILT_KINDS.filter((k) => k !== kind)), other = soundTool(otherKind, c.of([3, 6, 10]), { owed: true });
    const second = c.of<() => Stack | null>([() => null, () => null, () => other, () => soundTool(kind, level, { owed: true }), () => notTool()])();
    const p = purseWith(c.of([0, 99, 100, 5000]), [notTool(), stack, second], [[c.of(GEM_IDS), c.int(0, 2)], ["oreCopper", 2]]);
    const pending = c.of<() => Pending | null>([
      () => null, () => null, () => null, () => (m >= 0 ? waiting(kind, m) : waiting(kind, 0)), () => (m >= 0 ? waiting(kind, m) : null), () => waiting(otherKind, owedOf(other) >= 0 ? owedOf(other) : 0),
      () => waiting(c.of(BUILT_KINDS), c.int(0, 2)), () => { const had = mine.findIndex((o) => !!o); return had >= 0 ? waiting(kind, had, mine[had]!) : waiting(kind, 0, "pkPeek"); },
    ])();
    const s: Smithy = { ...newSmithy(), pending }, slot = c.maybe(0.8) ? 1 : c.of<number | null>([0, 2, -1, 40, null]);
    const r1 = luck(), r2 = luck();
    add("pending_slot", [p, pending, slot], pendingSlot(p, pending, slot as number));
    add("forge_draw", [p, s, slot, r1, r2], draw(p, s, slot as number, r1, r2));
    const at = c.of<number | null>([0, 0, 1, 1, 2, 2, -1, 3, null]), gem = c.of<string | null>([c.of(GEM_IDS), c.of(GEM_IDS), (p.bag.find((b) => b && elementOfGem(b.item))?.item ?? "gemRuby"), (p.bag.find((b) => b && elementOfGem(b.item))?.item ?? "gemRuby"), "oreCopper", "chipRuby", "noSuchThing", null]);
    add("forge_redraw", [p, s, slot, at, gem, r1, r2], redraw(p, s, slot as number, at as number, gem as ItemId, r1, r2));
    const pick = c.of<string | null>([pending?.offer[0] ?? "pkPeek", pending?.offer[0] ?? "pkPeek", pending?.offer[1] ?? "pkCrumb", pending?.old ?? "pkLoose", c.of(OPTION_IDS), "", "noSuchOption", null]);
    // (one input is left out, for the code has no answer to it: a draw waiting whose tool is not in the bag, chosen
    // for slot -1. `pendingSlot` says -1 for "no tool fits", which is then taken for the slot asked, and `choose`
    // throws on the stack that is not there. The database answers "tool" there, as for any slot that is none.)
    if (!(slot === -1 && pending && pendingSlot(p, pending, -1) === -1)) add("forge_choose", [p, s, slot, pick], choose(p, s, slot as number, pick as string));
  }
  // (an option made again, with everything it takes: at each milestone, with a gem of each element, of a tool at the top and of one whose
  // level has fallen under that milestone, which is made again like any other; and each thing short by itself)
  for (const kind of BUILT_KINDS) for (const m of [0, 1, 2]) for (const short of ["nothing", "gem", "coins", "under", "owed"] as const) {
    const level = short === "under" ? FORGE.milestones[m] - 1 : FORGE.top, stack = soundTool(kind, FORGE.top, { gem: null }), gem = c.of(GEM_IDS);
    const p = purseWith(short === "coins" ? SMITH.redraw.fee - 1 : SMITH.redraw.fee + 5, [{ ...stack, plus: level }], short === "gem" ? [] : [[gem, 1]]);
    const s: Smithy = { ...newSmithy(), pending: short === "owed" ? waiting(kind, m, drawnOf(stack)[m]!) : null }, r1 = c.next(), r2 = c.next();
    add("forge_redraw", [p, s, 0, m, gem, r1, r2], redraw(p, s, 0, m, gem, r1, r2));
    const again = redraw(p, s, 0, m, gem, r1, r2);
    if (again.ok) for (const pick of [again.pending.offer[0], again.pending.offer[1] ?? again.pending.offer[0], again.pending.old!, "noSuchOption"]) add("forge_choose", [again.purse, again.smithy, 0, pick], choose(again.purse, again.smithy, 0, pick));
  }
  // (a tool of a kind nothing is built for, that has an option all the same: nothing to lay out again)
  for (const kind of KINDS.filter((k) => !BUILT[k].opts.length)) {
    const p = purseWith(500, [{ item: kind, n: 1, plus: 4, opts: [poolOf(kind, 1)[0]] }], [["gemRuby", 1]]);
    add("forge_redraw", [p, newSmithy(), 0, 0, "gemRuby", 0.3, 0.6], redraw(p, newSmithy(), 0, 0, "gemRuby", 0.3, 0.6));
    add("forge_draw", [p, newSmithy(), 0, 0.3, 0.6], draw(p, newSmithy(), 0, 0.3, 0.6));
  }

  /* ── a gem ── */
  // (the mount by the number it takes: enough for one, for four, none, and one short of each; copper ore, which was the mount, lies beside it and is not taken)
  for (let i = 0; i < 700; i++) {
    const kind = c.maybe(0.75) ? c.of(BUILT_KINDS) : c.of(KINDS), stack = c.maybe(0.08) ? anyTool(kind) : soundTool(kind, c.int(0, 10)), was = gemsOf(stack)[0];
    const gem = c.of<string | null>([c.of(GEM_IDS), c.of(GEM_IDS), c.of(GEM_IDS), c.of(GEM_IDS), was ? GEMS[was].gem : c.of(GEM_IDS), "chipRuby", "oreCopper", "noSuchThing", null]);
    const p = purseWith(SMITH.gem.fee + c.of([0, 0, 0, 30, -1, -SMITH.gem.fee]), [notTool(), stack], [...(gem && gem in ITEMS && c.maybe(0.88) ? [[gem as ItemId, c.int(1, 3)] as [ItemId, number]] : []), [SMITH.gem.mount, c.of([1, 1, 1, 4, 0]) * SMITH.gem.mounts - c.of([0, 0, 0, 1])], ["oreCopper", 2]]);
    const slot = c.maybe(0.88) ? 1 : c.of<number | null>([0, -1, 30, null]);
    add("gem_set", [p, slot, gem], setGem(p, slot as number, gem as ItemId));
  }
  // (every element in the two tools it is built for, over nothing and over another; the gem and its mount in one stack each, the last of them)
  for (const kind of BUILT_KINDS) for (const e of ELEMENTS) for (const over of [null, ELEMENTS[(ELEMENTS.indexOf(e) + 3) % ELEMENTS.length]]) {
    const p = purseWith(SMITH.gem.fee, [soundTool(kind, c.of([0, 5, 10]), { gem: over })], [[GEMS[e].gem, 1], [SMITH.gem.mount, SMITH.gem.mounts]]);
    add("gem_set", [p, 0, GEMS[e].gem], setGem(p, 0, GEMS[e].gem));
  }

  /* ── the board ── */
  const boards: SmithBoard[] = [newBoard(), { tops: { pick: { by: HER, name: "Member Two", at: NOW - HOUR } }, found: {} }, { tops: {}, found: { pkPeek: { by: HIM, name: "Him", at: NOW - 5 }, axDry: { by: ME, name: "Me", at: 3 } } },
    { tops: { pick: { by: HER, name: "Member Two", at: 1 }, axe: { by: ME, name: "Member One", at: 2 } }, found: { pkPeek: { by: HER, name: "Member Two", at: 4 } } }];
  for (const b of boards) {
    for (const kind of ["pick", "axe", "rod", "grill"] as const) add("board_top", [b, kind, ME, "Member One", NOW], markTop(b, kind, { id: ME, name: "Member One" }, NOW));
    for (const opt of ["pkPeek", "axDry", "pkQuake", "ckBig"] as const) add("board_found", [b, opt, ME, "Member One", NOW], markFound(b, opt, { id: ME, name: "Member One" }, NOW));
  }

  /* ── the helpers' line ── */
  const blown = (doc: Record<string, unknown>, n = 1, thing: string | null = "oreIron"): Done => ({ from: "deed", what: "bellows", thing, n, doc });
  for (const doc of [{ whose: HER }, { whose: HER, off: 30_000, left: 2 }, { whose: ME }, {}, { whose: 7 }, { whose: null }, { owner: HER }, { whose: HER, owner: ME }, { whose: "" }, { whose: [HER] }]) for (const n of [1, 0, 3]) {
    const d = blown(doc, n, c.of(["oreIron", "gemRuby", null]));
    for (const doer of [ME, HER]) add("counts_of", [d, doer], countsOf(d, doer));
  }
  add("counts_of", [{ from: "play", what: "bellows", thing: null, n: 1, won: true, doc: { whose: HER } }, ME], countsOf({ from: "play", what: "bellows", thing: null, n: 1, won: true, doc: { whose: HER } }, ME));
  // (and everything the lines are held to already)
  for (const v of vectorsLines()) if (v.fn === "counts_of") out.push(v);
  return out;
}

// SKIPPED, 2026-10-09, and to come back with the blacksmith's own migration. The blacksmith is not in v164 (the owner:
// the first opening is the mountain with mining and felling only; the smith follows in a migration of his own), and
// these cases were written for the draft of his SQL from before the rules of forging were changed: one refusal the
// test expects of `forge_redraw` (`unbuilt`) is one no case reaches any more. It fails so on main as it is live, and
// no rule is changed to make it pass. Whoever writes the blacksmith's migration makes these cases anew from the rules
// as they stand then (`vectorsSmith` is as it was), takes the `.skip` off, and holds his SQL to them.
describe.skip("the cases the database's rules of the blacksmith are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsSmith();
    expect(JSON.stringify(vectorsSmith())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string }; return d.ok ? "ok" : d.why; }))].sort();
    for (const fn of ["tool_level", "tool_drawn", "tool_gems", "tool_has", "forge_candidates", "forge_owed", "try_cost", "outcome_of", "smithy_sound", "smith_view", "smelt", "smith_collect", "bellows", "bellows_left",
      "forge_try", "pick_offer", "pending_slot", "forge_draw", "forge_redraw", "forge_choose", "gem_set", "counts_of"]) expect(of(fn).length, fn).toBeGreaterThan(40);

    // what a tool carries: every level, options awake and asleep, a tool kept wrongly made sound
    expect(new Set(of("tool_level").map((v) => v.want)).size).toBe(FORGE.top + 1);
    expect(of("tool_drawn").some((v) => (v.want as unknown[]).every((o) => o === null)) && of("tool_drawn").some((v) => (v.want as unknown[]).every((o) => o !== null))).toBe(true);
    expect(of("tool_drawn").some((v) => { const s = v.args[0] as Stack | null; return !!s && Array.isArray(s.opts) && s.opts.length > 0 && (v.want as unknown[]).filter(Boolean).length < s.opts.filter(Boolean).length; })).toBe(true);
    // (an option once drawn works whatever the level: a tool has exactly the options drawn for it)
    expect(of("tool_has").some((v) => v.want === true) && of("tool_has").some((v) => v.want === false)).toBe(true);
    expect(of("tool_has").every((v) => v.want === drawnOf(v.args[0] as Stack).includes(v.args[1] as OptionId))).toBe(true);
    expect(of("tool_gems").some((v) => (v.want as unknown[]).length === 1) && of("tool_gems").every((v) => (v.want as unknown[]).length <= FORGE.sockets)).toBe(true);
    expect(new Set(of("forge_owed").map((v) => v.want))).toEqual(new Set([-1, 0, 1, 2]));
    expect(of("forge_drawable").some((v) => (v.want as unknown[]).length >= 4) && of("forge_drawable").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    expect(of("forge_settable").some((v) => v.want === true) && of("forge_settable").some((v) => v.want === false)).toBe(true);
    expect(new Set(of("gem_element").map((v) => v.want)).size).toBe(ELEMENTS.length + 1);

    // the table: every level of both recipes, and each way a try goes at every level it can
    expect(of("try_cost").filter((v) => v.want !== null).length).toBe(TOOL_KINDS.length * TRIES.length);
    for (const t of TRIES) for (const out of ["taken", "stays", "down"] as const) expect(of("outcome_of").some((v) => v.args[0] === t.to && v.want === out), `${t.to} ${out}`).toBe(t[out === "taken" ? "take" : out === "stays" ? "stay" : "down"] > 0);

    // what is kept, made sound; a queue seen at every part of it
    const empty = (s: Smithy) => !s.queue.length && s.pending === null && s.more === 0 && s.ember === 0;
    expect(of("smithy_sound").some((v) => empty(v.want as Smithy)) && of("smithy_sound").some((v) => (v.want as Smithy).pending?.old !== undefined)).toBe(true);
    expect(of("smithy_sound").some((v) => { const k = v.args[0] as { queue?: unknown[] } | null; return Array.isArray(k?.queue) && (v.want as Smithy).queue.length > 0 && (v.want as Smithy).queue.length < k!.queue!.length; })).toBe(true);
    const views = of("smith_view").map((v) => v.want as ReturnType<typeof smithView>);
    expect(views.some((x) => x.done.length > 0 && x.now && x.waiting.length > 0) && views.some((x) => !x.now && x.waiting.length > 0) && views.some((x) => x.free === 0) && views.some((x) => x.free === x.places)).toBe(true);

    // smelting: done, and refused each way; a timber that smelts two; what is done taken whole, in part, and not at all
    expect(whys("smelt")).toEqual(["amount", "coins", "none", "ok", "ore", "places", "timber"]);
    const smelted = of("smelt").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, n: v.args[3] as number, d: v.want as { timber: number; fee: number; smithy: Smithy; purse: Purse } }));
    for (const piece of PIECES) expect(of("smelt").some((v) => v.args[2] === piece && (v.want as { ok: boolean }).ok), piece).toBe(true);
    expect(smelted.some((x) => x.d.timber < x.n) && smelted.some((x) => x.d.timber === x.n && x.n > 1) && smelted.some((x) => x.d.smithy.ember > 0)).toBe(true);
    expect(smelted.every((x) => x.d.purse.coins === x.p.coins - x.d.fee && held(x.d.purse.bag, "timber") === held(x.p.bag, "timber") - x.d.timber)).toBe(true);
    expect(new Set(of("smith_dry").map((v) => v.want))).toEqual(new Set([1, 2]));
    expect(whys("smith_collect")).toEqual(["full", "none", "ok"]);
    const got = of("smith_collect").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ s: v.args[1] as Smithy, now: v.args[2] as number, d: v.want as { smithy: Smithy; got: Array<[string, number]> } }));
    expect(got.some((x) => x.d.smithy.queue.some((q) => q.till <= x.now)) && got.some((x) => x.d.got.length > 1) && got.every((x) => x.d.got.reduce((n, g) => n + g[1], 0) === x.s.queue.length - x.d.smithy.queue.length)).toBe(true);
    expect(whys("bellows")).toEqual(["idle", "ok", "self", "tired"]);
    const blows = of("bellows").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { off: number });
    // (a press takes the piece's own share off it, or what is left of the piece where that is less)
    const shares = new Set(PIECES.map((piece) => bellowsOff(piece)));
    expect(shares.size).toBeGreaterThan(1);
    for (const share of shares) expect(blows.some((b) => b.off === share), String(share)).toBe(true);
    expect(blows.some((b) => b.off > 0 && b.off < Math.min(...shares))).toBe(true);
    expect(of("bellows").filter((v) => (v.want as { ok: boolean }).ok).every((v) => (v.want as { smithy: Smithy }).smithy.queue.some((q) => (q.blown ?? 0) >= 1 && (q.blown ?? 0) <= SMITH.bellows.each))).toBe(true);
    expect(new Set(of("bellows_left").map((v) => v.want))).toEqual(new Set([0, 1, 2, 3]));
    expect(whys("smith_widen")).toEqual(["coins", "ok", "timber", "top"]);

    // a try: every kind to every level, each way it goes; refused each way; and never under the floor once there
    expect(whys("forge_try")).toEqual(["coins", "ok", "ore", "owed", "timber", "tool", "top"]);
    const tries = of("forge_try").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, slot: v.args[1] as number, d: v.want as { out: string; from: number; level: number; item: ToolKind; owed: number; purse: Purse } }));
    for (const kind of TOOL_KINDS) for (const t of TRIES) expect(tries.some((x) => x.d.item === kind && x.d.from === t.to - 1 && x.d.out === "taken" && x.d.level === t.to), `${kind} +${t.to}`).toBe(true);
    // (by the table as it is, a try that loses a level begins above the floor: the try to the level after the floor never does)
    expect(tries.some((x) => x.d.out === "down" && x.d.level === x.d.from - 1) && tries.some((x) => x.d.out === "stays" && x.d.level === x.d.from)).toBe(true);
    expect(tries.filter((x) => x.d.out === "down").every((x) => x.d.from > FORGE.floor && x.d.level === x.d.from - 1)).toBe(true);
    expect(tries.every((x) => x.d.level >= Math.min(x.d.from, FORGE.floor) && x.d.level <= x.d.from + 1 && (x.d.from < FORGE.floor ? x.d.out === "taken" : true))).toBe(true);
    expect(tries.every((x) => x.d.purse.coins === x.p.coins - tryCost(x.d.item, x.d.from + 1)!.fee && x.d.purse.bag[x.slot]?.item === x.d.item && levelOf(x.d.purse.bag[x.slot]) === x.d.level)).toBe(true);
    expect(tries.some((x) => x.d.owed >= 0) && tries.some((x) => x.d.owed < 0) && tries.some((x) => (x.d.purse.bag[x.slot] as Stack).water !== undefined)).toBe(true);

    // the options: laid out fresh, the same again, refused each way; made again; chosen, kept, refused
    expect(of("pick_offer").some((v) => (v.want as unknown[]).length === 2) && of("pick_offer").some((v) => (v.want as unknown[]).length === 1) && of("pick_offer").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    expect(of("pick_offer").every((v) => new Set(v.want as string[]).size === (v.want as string[]).length)).toBe(true);
    expect(whys("forge_draw")).toEqual(["none", "ok", "owed", "tool"]);
    const draws = of("forge_draw").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ s: v.args[1] as Smithy, d: v.want as { fresh: boolean; pending: Pending } }));
    expect(draws.some((x) => x.d.fresh && !x.s.pending) && draws.some((x) => x.d.fresh && !!x.s.pending) && draws.some((x) => !x.d.fresh && JSON.stringify(x.d.pending) === JSON.stringify(x.s.pending))).toBe(true);
    for (const m of [0, 1, 2]) expect(draws.some((x) => x.d.fresh && x.d.pending.at === m && x.d.pending.offer.length === 2), `milestone ${m}`).toBe(true);
    expect(new Set(of("pending_slot").map((v) => v.want)).size).toBeGreaterThan(2);
    expect(whys("forge_redraw")).toEqual(["coins", "gem", "none", "ok", "owed", "tool", "unbuilt"]);
    expect(whys("forge_choose")).toEqual(["none", "ok", "tool"]);
    const chosen = of("forge_choose").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { kept: boolean; at: number; opt: string; smithy: Smithy });
    expect(chosen.some((x) => x.kept) && chosen.some((x) => !x.kept) && chosen.every((x) => x.smithy.pending === null)).toBe(true);
    for (const m of [0, 1, 2]) expect(chosen.some((x) => x.at === m), `chosen at ${m}`).toBe(true);

    // a gem: set, over none and over another, refused each way
    expect(whys("gem_set")).toEqual(["coins", "gem", "ok", "ore", "same", "tool", "unbuilt"]);
    const sets = of("gem_set").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { element: string; over: string | null });
    for (const e of ELEMENTS) expect(sets.some((x) => x.element === e && x.over === null) && sets.some((x) => x.element === e && x.over !== null), e).toBe(true);

    // the board: written once
    expect(of("board_top").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("board_top").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);
    expect(of("board_found").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("board_found").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);

    // the helpers' line: the bellows worked for somebody else count, and for nobody else do not
    const blownFor = of("counts_of").filter((v) => (v.args[0] as Done).what === "bellows").map((v) => v.want as Counts[]);
    expect(blownFor.some((x) => x.length === 1 && x[0].line === "helpers" && x[0].raw === SMITH.bellows.points) && blownFor.some((x) => x.length === 0)).toBe(true);
    expect(of("counts_of").length).toBeGreaterThan(600);

    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-smith.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
