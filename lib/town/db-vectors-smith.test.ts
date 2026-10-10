import { dayOf } from "./stamina";
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsLines } from "./db-vectors-lines.test";
import { canHolds } from "./farm";
import {
  SMITH, TRIES, bellows, bellowsLeft, bellowsOff, candidates, choose, collect, draw, dryOf, forgeTry, forgingOf, markFound, markTop, moveFee, moveFeeAt, moveForging, moveWhy, newBoard, newSmithy,
  outcomeOf, owedOf, pendingSlot, pickOffer, redraw, setGem, smelt, smithView, soundSmithy, stickerOf, timberFor, tryCost, tryOdds, widen, withForging, withMaker,
  type Outcome, type Pending, type SmithBoard, type Smithy,
} from "./forge";
import { fireFromPurse, fireSpent, fireTold, fireWhy, halfFound, joinRow, leaveRow, litAt, newGreatFire, openTo, soundGreatFire, type GreatFire, type Half } from "./great-fire";
import { ITEMS, type ItemId } from "./items";
import { countsOf, type Counts, type Done } from "./line-points";
import { bagToPouch, heldIn } from "./pouches";
import { TIMED, running } from "./powers";
import {
  BUILT, ELEMENTS, FORGE, GEMS, OPTIONS, OPTION_IDS, SMELTING, SMELTS, TOOL_KINDS, awayOf, drawable, drawnOf, elementOfGem, gemsOf, levelOf, lineKinds, makersOf, poolOf, samePool, settable, toolKindOf,
  type Element, type OptionId, type ToolKind,
} from "./tools";
import { newPurse, put, type Purse, type Stack } from "./trade";
import { SMITH as SMITH_PLACE, bySmith } from "./world";

/**
 * The cases the database's rules of the blacksmith are held to (v174's smith part; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers
 * (.claude/skills/fc-cash-town/scripts/db/v174.smith.calls.json says which function each name is). What a tool
 * carries is read by v164's readers, which have cases of their own (lib/town/db-vectors-base.test.ts); these are of
 * what the smith does with it:
 *
 * - `forge_candidates`, `forge_owed` of tools kept soundly and not, at home and away; `forge_drawable`,
 *   `forge_settable` of every kind, pool and element, and what is none;
 * - the table: `try_cost` and `try_odds` of every kind and level, and past both ends; `outcome_of` either side of each
 *   share's edge;
 * - what is kept: `smithy_sound` of smithies kept soundly and wrongly in each way there is; `smith_view` of queues
 *   with pieces done, smelting, waiting and none, at moments either side of each end;
 * - smelting: `smith_dry`, `smith_timber`; `smelt` with every piece and what is no piece, numbers of every sort,
 *   places free and not, fragments, timber and coins enough and one short, in the bag, in a pouch and in both;
 *   `smith_collect` with nothing done, some done and room for all, some and none of it, into a pouch and into the
 *   bag; `bellows_off`, `bellows_left` and `bellows` by the owner and by another, with a piece smelting and none, a
 *   piece that has had none to three presses (and one kept with more), and a piece with less than a press's worth
 *   left; `smith_widen` at each width, with enough and one short;
 * - a try: `tool_with_maker`; `forge_try` of every kind at every level with chance of every sort, with ore, timber
 *   and coins enough and one short (bag and pouches), of a tool owed a draw, of a forging away from home, of what is
 *   no tool, of no slot; and whose name is written on the tool, where;
 * - the options: `pick_offer`; `pending_slot`; `forge_draw` with no draw waiting, the same one waiting, another's
 *   waiting whose tool is in the bag and whose tool is not; `forge_redraw`; `forge_choose`;
 * - a gem: `gem_set` in every kind of tool, of every element and what is no gem, over none, another and the same,
 *   with the mount and the coins and without;
 * - a move: `can_holds`, `forging_of`, `tool_with_forging`, `sticker_of`, `move_fee_at`, `move_fee`, `power_running`,
 *   `by_smith` (every tile about the forge), `move_why` and `move_forging` refused each way and done;
 * - the board: `board_top`, `board_found`, written once and not again;
 * - the great fire: `fire_sound`, `fire_lit_at`, `fire_open_to`, `fire_half_found`, `fire_join`, `fire_leave`,
 *   `fire_why`, `fire_spent`, `fire_told`; `forge_under_top`; and `forge_try_fired`, a try as whoever keeps the game
 *   makes it (lib/town/trial's `smithTry`: refused without the fire one level under the top, and spending it);
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
const NOW = at("2026-10-08T12:00:00"), MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const ME = "00000000-0000-0000-0000-000000000001", HER = "00000000-0000-0000-0000-000000000002", HIM = "00000000-0000-0000-0000-000000000003";
const KINDS: ToolKind[] = [...TOOL_KINDS];
const PIECES = Object.keys(SMELTS) as ItemId[];
const GEM_IDS = ELEMENTS.map((e) => GEMS[e].gem);
/** Things that are no tool that is forged: better tools, what holds something, plain things. */
const NO_TOOLS: ItemId[] = ["rodTeak", "hoeIron", "canCopper", "potBrass", "netSmall", "minnow", "bowl", "timber", "oreCopper", "gemRuby", "bucket"];
/** Names as a member may be called: plain, Thai, with space about and within, none, and longer than a tool takes. */
const NAMES = ["Aqua", "Member One", "น้องส้ม ช่างตี", "  spaced   out  ", "", "A name that is a good deal longer than a tool has room for", "tab\tand\nline"];
/** A try as whoever keeps the game makes it (lib/town/trial's `smithTry`): with the fire, where the try is for the top. */
function tryFired(purse: Purse, fire: GreatFire, slot: number, r: number, id: string, name: string, now: number, luck: number) {
  const held = purse.bag[slot], needs = !!held && !!toolKindOf(held.item) && levelOf(held) === FORGE.top - 1;
  if (needs) { const why = fireWhy(fireFromPurse(purse, id), id, now); if (why) return { ok: false as const, why }; }
  const did = forgeTry(purse, newSmithy(), slot, r, name);
  if (!did.ok) return did;
  return { ...did, purse: needs ? { ...did.purse, forgeDay: dayOf(now) } : did.purse, spent: needs, fire: needs ? fireSpent(fire, { id, name }, did.out, now, luck) : fire };
}

export function vectorsSmith(): Vector[] {
  const c = chance(20261173), out: Vector[] = [];
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
  const makersKept = (): unknown => c.of<() => unknown>([() => undefined, () => undefined, () => undefined, () => ["Aqua"], () => ["", "Nine"], () => ["Aqua", "", "Mint"], () => ["Aqua", "Nine", "Mint", "Extra"], () => [3, null, "  wide   name  "], () => "Aqua", () => []])();
  /** A stack of a kind of tool, with whatever is kept on it (and now and then the water a can holds, or a kind its options are said to be of). */
  const anyTool = (kind: ToolKind): Stack => {
    const plus = plusKept(), opts = optsKept(kind), gems = gemsKept(), makers = makersKept();
    const origin = c.maybe(0.12) ? c.of<unknown>([...lineKinds(kind), "pick", "noSuchKind", 4, null]) : undefined;
    return { item: kind, n: 1, ...(plus === undefined ? {} : { plus }), ...(opts === undefined ? {} : { opts }), ...(gems === undefined ? {} : { gems }), ...(makers === undefined ? {} : { makers }),
      ...(origin === undefined ? {} : { origin }), ...(kind === "can" && c.maybe(0.5) ? { water: c.int(0, 8) } : {}) } as Stack;
  };
  /** A tool kept soundly at a level: its options drawn at every milestone reached (or, where said, owed one), and a gem or none. */
  const soundTool = (kind: ToolKind, level: number, how: { owed?: boolean; gem?: Element | null } = {}): Stack => {
    const [x, y] = two(poolOf(kind, 1)), z = c.of(poolOf(kind, 2));
    const reached = FORGE.milestones.filter((m) => level >= m).length, drawn = [x, y, z].slice(0, how.owed ? Math.max(0, reached - 1) : reached);
    const gem = how.gem === undefined ? (c.maybe(0.3) ? c.of(ELEMENTS) : null) : how.gem;
    return { item: kind, n: 1, ...(level > 0 ? { plus: level } : {}), ...(drawn.length ? { opts: drawn } : {}), ...(gem ? { gems: [gem] } : {}) };
  };
  /** A tool that carries what the smith put into a fellow of its line: that fellow's options, with the fellow written as their kind (null: a kind alone in its line). */
  const movedTool = (kind: ToolKind, level = c.of([3, 4, 6, 7, 9, 10])): Stack | null => {
    const fellows = lineKinds(kind).filter((k) => k !== kind);
    if (!fellows.length) return null;
    const from = c.of(fellows), theirs = soundTool(from, Math.max(3, level), { gem: c.maybe(0.4) ? c.of(ELEMENTS) : null });
    return { ...theirs, item: kind, origin: from, ...(kind === "can" ? { water: c.int(0, 16) } : {}) };
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
  /** The same purse with the miner's sack and the woodcutter's bundle, and some of what they hold put into them out of the bag: now and then, so that what the smith takes is in the bag, in a pouch, and in both. */
  const pouched = (p: Purse, often = 0.5): Purse => {
    if (!c.maybe(often)) return p;
    let q: Purse = { ...p, gifts: { had: c.of([["thingSack", "thingBundle"], ["thingSack", "thingBundle"], ["thingSack"], ["thingBundle"]]), charms: [], owed: 0, familiar: null, used: {} } } as Purse;
    for (let slot = 0; slot < q.bag.length; slot++) {
      if (!c.maybe(0.6)) continue;
      const did = bagToPouch(q, slot);
      if (did.ok) q = did.purse;
    }
    return q;
  };

  /* ── what the smith may draw and set ── */
  for (let i = 0; i < 560; i++) {
    const kind = c.of(KINDS), s = c.maybe(0.1) ? notTool() : c.maybe(0.2) ? movedTool(kind) ?? anyTool(kind) : anyTool(kind);
    for (let m = -1; m <= FORGE.milestones.length; m++) add("forge_candidates", [s, m], candidates(s, m));
    add("forge_owed", [s], owedOf(s));
    add("forging_of", [s], forgingOf(s));
  }
  for (const kind of [...KINDS, "rodTeak", "noSuchThing", null]) {
    for (const pool of [1, 2, 0, 3]) add("forge_drawable", [kind, pool], kind && toolKindOf(kind) && (pool === 1 || pool === 2) ? drawable(kind as ToolKind, pool) : []);
    for (const e of [...ELEMENTS, "noSuchElement", null]) add("forge_settable", [kind, e], !!kind && !!toolKindOf(kind) && !!e && (ELEMENTS as readonly string[]).includes(e) && settable(kind as ToolKind, e as Element));
  }

  /* ── the table ── */
  for (const kind of KINDS) for (let to = -1; to <= FORGE.top + 2; to++) add("try_cost", [kind, to], tryCost(kind, to));
  for (let to = -1; to <= FORGE.top + 2; to++) {
    add("try_odds", [to], tryOdds(to));
    const o = tryOdds(to) ?? { take: 50, stay: 25, down: 25 }, tiny = 1e-9;
    for (const r of [0, 0.25, o.take / 100 - tiny, o.take / 100, o.take / 100 + tiny, (o.take + o.stay) / 100 - tiny, (o.take + o.stay) / 100, (o.take + o.stay) / 100 + tiny, 0.999998, 0.999999, 1, 2.5, -0.4, c.next(), c.next()]) add("outcome_of", [to, r], outcomeOf(to, r));
  }

  /* ── what is kept ── */
  /** A queue: pieces done, the one smelting (`blown`: the presses of the bellows it has had), those waiting, by the moment; one after another, as they are put in. */
  const queueAt = (now: number, done: number, running_: boolean, waiting: number, blown = 0): Smithy["queue"] => {
    const q: Smithy["queue"] = [];
    let from = now - done * 20 * MIN - (running_ ? c.int(1, 4) * MIN : -c.int(0, 1) * MIN);
    for (let i = 0; i < done + (running_ ? 1 : 0) + waiting; i++) {
      const piece = c.of(PIECES), mins = i < done ? c.int(5, 11) : SMELTS[piece]!.mins, till = i < done ? Math.min(now - (done - i - 1) * MIN, from + mins * MIN) : from + mins * MIN;
      q.push({ piece, from: Math.min(from, till), till, ...(running_ && i === done && blown > 0 ? { blown } : {}) });
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
  /** An axe that may make a timber smelt more than one piece: with the option, without it, and a tool of another kind kept with it. */
  const dryAxe = (): Stack | null => c.of<() => Stack | null>([() => null, () => null, () => null, () => ({ item: "axe", n: 1, plus: c.int(3, 10), opts: ["axDry"] }), () => ({ item: "axe", n: 1, plus: c.int(6, 10), opts: ["axKeen", "axDry"] }),
    () => ({ item: "axe", n: 1, plus: c.int(0, 2), opts: ["axDry"] }), () => ({ item: "axe", n: 1, plus: 5, opts: ["axKeen", "axDry"] }), () => ({ item: "axe", n: 1, plus: 9, opts: ["axKeen"] }), () => ({ item: "pick", n: 1, plus: 9, opts: ["axDry"] })])();
  for (let i = 0; i < 120; i++) { const p = purseWith(0, [dryAxe(), notTool(), dryAxe()]); add("smith_dry", [p.bag], dryOf(p.bag)); }
  for (const ember of [0, 1, 2, 5]) for (const n of [0, 1, 2, 3, 4, 7]) for (const dry of [1, 2, 3]) add("smith_timber", [{ ...newSmithy(), ember }, n, dry], timberFor({ ...newSmithy(), ember }, n, dry));
  for (let i = 0; i < 700; i++) {
    const piece = c.maybe(0.9) ? c.of(PIECES) : c.of<string>(["shardCopper", "timber", "noSuchPiece", "pick"]), rule = SMELTS[piece as ItemId];
    const n = c.of<number | null>([1, 1, 1, 2, 2, 3, 3, 4, 6, 0, -1, 1.5, null]), k = typeof n === "number" && Number.isInteger(n) && n > 0 ? n : 1;
    const s = smithyAt(NOW, { more: c.of([0, 0, 0, 1, 2]) });
    const fragments = rule ? SMELTING.fragments * k + c.of([0, 0, 0, 5, 40, -1, -SMELTING.fragments * k]) : 30, timber = k + c.of([0, 0, 0, 2, -1, -k]), coins = (rule?.fee ?? 5) * k + c.of([0, 0, 0, 100, -1]);
    const p = pouched(purseWith(Math.max(0, coins), [dryAxe()], [...(rule ? [[rule.of, Math.min(99, Math.max(0, fragments))] as [ItemId, number]] : []), ["timber", Math.max(0, timber)], ["shardIron", c.int(0, 12)]]));
    const now = c.of([NOW, NOW, NOW + 3 * MIN, NOW + HOUR]);
    add("smelt", [p, s, piece, n, now], smelt(p, s, piece as ItemId, n as number, now));
  }
  // (each thing short by itself, with everything else plentiful: so that it is that one which refuses; in the bag, and with some of it in a pouch)
  for (const piece of PIECES) for (const short of ["nothing", "places", "ore", "timber", "coins"] as const) for (const n of [1, 3]) for (const inPouch of [false, true]) {
    const rule = SMELTS[piece]!, s = { ...newSmithy(), queue: short === "places" ? queueAt(NOW, 0, true, 3 - n) : [] };
    const p = pouched(purseWith(short === "coins" ? rule.fee * n - 1 : 5000, [], [[rule.of, short === "ore" ? SMELTING.fragments * n - 1 : 60], ["timber", short === "timber" ? n - 1 : 9]]), inPouch ? 1 : 0);
    add("smelt", [p, s, piece, n, NOW], smelt(p, s, piece, n, NOW));
  }
  for (let i = 0; i < 420; i++) {
    const s = smithyAt(NOW, { done: c.of([0, 1, 2, 3, 5]) }), fill = c.of(["empty", "some", "one", "none"] as const);
    let bag: Purse["bag"] = Array<null>(c.of([4, 8])).fill(null);
    if (fill === "some") bag = bag.map((_, j) => (j % 2 ? { item: "boot" as ItemId, n: 1 } : null));
    if (fill === "one") bag = bag.map((_, j) => (j === 2 ? (c.maybe(0.5) ? null : { item: c.of(PIECES), n: ITEMS.oreCopper.stack - 1 }) : { item: "boot" as ItemId, n: 1 }));
    if (fill === "none") bag = bag.map(() => ({ item: "boot" as ItemId, n: 1 }));
    // (now and then with the miner's sack: empty, part full, or full of something else, so that a piece goes into it before the bag or finds no room there)
    const sack = c.of<Array<Stack | null> | null>([null, null, [null, null, null, null, null], [{ item: "stone", n: 99 }, null, { item: c.of(PIECES), n: 3 }, null, null],
      Array.from({ length: 5 }, () => ({ item: "stone" as ItemId, n: ITEMS.stone.stack }))]);
    const p = { ...newPurse(), coins: 3, bag, ...(sack ? { gifts: { had: ["thingSack"], charms: [], owed: 0, familiar: null, used: {} }, pouches: { thingSack: sack } } : {}) } as Purse;
    const now = c.of([NOW, NOW, NOW + 10 * MIN, NOW + 30 * 24 * HOUR, NOW - HOUR]);
    add("smith_collect", [p, s, now], collect(p, s, now));
  }
  for (const piece of [...PIECES, "shardCopper", "noSuchPiece", null]) add("bellows_off", [piece], bellowsOff(piece as ItemId));
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
  for (const more of [0, 1, 2, 3]) for (const short of ["nothing", "timber", "coins"] as const) for (const extra of [0, 7]) for (const inPouch of [false, true]) {
    const cost = SMITH.more[more] ?? { timber: 20, coins: 200 }, s = { ...smithyAt(NOW), more };
    const p = pouched(purseWith(short === "coins" ? cost.coins - 1 : cost.coins + extra, [soundTool("axe", 4)], [["timber", short === "timber" ? cost.timber - 1 : cost.timber + extra]]), inPouch ? 1 : 0);
    add("smith_widen", [p, s], widen(p, s));
  }

  /* ── a try ── */
  for (let i = 0; i < 260; i++) {
    const kind = c.of(KINDS), s = c.maybe(0.15) ? notTool() ?? anyTool(kind) : anyTool(kind), where = c.of([-1, 0, 0, 1, 1, 2, 2, 3]), by = c.of(NAMES);
    add("tool_with_maker", [s, where, by], withMaker(s, where, by));
  }
  for (let i = 0; i < 1700; i++) {
    const kind = c.of(KINDS), level = c.of([0, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 10]);
    const stack = c.maybe(0.06) ? anyTool(kind) : c.maybe(0.06) ? movedTool(kind, level) ?? soundTool(kind, level) : soundTool(kind, level, { owed: c.maybe(0.08) }), from = levelOf(stack), cost = tryCost(kind, from + 1) ?? tryCost(kind, 1)!;
    const ore = cost.n + c.of([0, 0, 0, 0, 3, 30, -1, -cost.n]), timber = cost.timber + c.of([0, 0, 0, 0, 2, 9, -1, -cost.timber]), coins = cost.fee + c.of([0, 0, 0, 0, 1, 4000, -1, -cost.fee]);
    const before = Array.from({ length: c.int(0, 3) }, () => notTool());
    const p = pouched(purseWith(Math.max(0, coins), [...before, stack, c.maybe(0.3) ? soundTool(kind, c.int(0, 10)) : null], [[cost.ore, Math.min(ITEMS[cost.ore].stack, Math.max(0, ore))], ["timber", Math.max(0, timber)], ["minnow", 3]], c.of([8, 12])), 0.35);
    const slot = c.maybe(0.9) ? before.length : c.of<number | null>([-1, p.bag.length, 99, 0, before.length + 2, null]);
    const r = luck(), by = c.of(NAMES);
    add("forge_try", [p, slot, r, by], forgeTry(p, newSmithy(), slot as number, r, by));
  }
  // (every kind at every level with everything it takes, and chance in each share: what is spent, and where the level goes)
  for (const kind of KINDS) for (let level = 0; level <= FORGE.top; level++) for (const share of ["taken", "stays", "down"] as const) {
    const o = tryOdds(level + 1) ?? { take: 100, stay: 0, down: 0 }, cost = tryCost(kind, level + 1) ?? tryCost(kind, 1)!;
    const r = share === "taken" ? (o.take / 100) * c.next() : share === "stays" ? (o.take + o.stay * c.next()) / 100 : (o.take + o.stay + o.down * c.next()) / 100;
    // (a watering can keeps the water in it through a try; and a tool that has a maker written keeps the name)
    const tool = { ...soundTool(kind, level, { gem: null }), ...(kind === "can" ? { water: 5 } : {}), ...(level >= 3 && c.maybe(0.5) ? { makers: ["Aqua"] } : {}) };
    const p = purseWith(cost.fee + 10, [tool], [[cost.ore, cost.n + 1], ["timber", cost.timber + 1]]);
    add("forge_try", [p, 0, r, "Member One"], forgeTry(p, newSmithy(), 0, r, "Member One"));
  }
  // (the ore in two stacks, and the tool behind them: taking its materials never moves it)
  for (const kind of ["pick", "axe"] as const) for (const level of [0, 3, 4, 8]) {
    const cost = tryCost(kind, level + 1)!, half = Math.max(1, Math.floor(cost.n / 2));
    const p: Purse = { ...newPurse(), coins: cost.fee, bag: [{ item: cost.ore, n: half }, { item: "timber", n: cost.timber }, soundTool(kind, level, { gem: null }), { item: cost.ore, n: cost.n - half + 2 }, null, { item: "timber", n: 1 }] };
    add("forge_try", [p, 2, 0.1, ""], forgeTry(p, newSmithy(), 2, 0.1, ""));
  }

  /* ── the options ── */
  for (const n of [0, 1, 2, 3, 6]) for (let i = 0; i < 14; i++) { const from = OPTION_IDS.slice(0, n), r1 = luck(), r2 = luck(); add("pick_offer", [from, r1, r2], pickOffer(from, r1, r2)); }
  /** A draw that waits, for a kind of tool at a milestone: as it is owed, or (`old`) as it is made again. */
  const waiting = (kind: ToolKind, m: number, old?: OptionId): Pending => ({ item: kind, at: m, offer: two(drawable(kind, FORGE.pools[m] ?? 1).length ? drawable(kind, FORGE.pools[m] ?? 1) : poolOf(kind, FORGE.pools[m] ?? 1)), ...(old ? { old } : {}) });
  const BUILT_KINDS = KINDS.filter((k) => BUILT[k].opts.length > 0);
  for (let i = 0; i < 1000; i++) {
    const kind = c.maybe(0.85) ? c.of(BUILT_KINDS) : c.of(KINDS), level = c.of([0, 2, 3, 3, 4, 5, 6, 6, 7, 9, 10, 10]);
    const stack = c.maybe(0.05) ? anyTool(kind) : c.maybe(0.08) ? movedTool(kind, level) ?? soundTool(kind, level) : soundTool(kind, level, { owed: c.maybe(0.6) }), m = owedOf(stack), mine = drawnOf(stack);
    const otherKind = c.of(BUILT_KINDS.filter((k) => k !== kind)), other = soundTool(otherKind, c.of([3, 6, 10]), { owed: true });
    const second = c.of<() => Stack | null>([() => null, () => null, () => other, () => soundTool(kind, level, { owed: true }), () => notTool()])();
    const p = pouched(purseWith(c.of([0, 99, 100, 5000]), [notTool(), stack, second], [[c.of(GEM_IDS), c.int(0, 2)], ["oreCopper", 2]]), 0.3);
    const pending = c.of<() => Pending | null>([
      () => null, () => null, () => null, () => (m >= 0 ? waiting(kind, m) : waiting(kind, 0)), () => (m >= 0 ? waiting(kind, m) : null), () => waiting(otherKind, owedOf(other) >= 0 ? owedOf(other) : 0),
      () => waiting(c.of(BUILT_KINDS), c.int(0, 2)), () => { const had = mine.findIndex((o) => !!o); return had >= 0 ? waiting(kind, had, mine[had]!) : waiting(kind, 0, "pkPeek"); },
    ])();
    const s: Smithy = { ...newSmithy(), pending }, slot = c.maybe(0.8) ? 1 : c.of<number | null>([0, 2, -1, 40, null]);
    const r1 = luck(), r2 = luck();
    add("pending_slot", [p, pending, slot], pendingSlot(p, pending, slot as number));
    add("forge_draw", [p, s, slot, r1, r2], draw(p, s, slot as number, r1, r2));
    const where = c.of<number | null>([0, 0, 1, 1, 2, 2, -1, 3, null]);
    const mineGem = (Object.keys(ITEMS) as ItemId[]).find((id) => !!elementOfGem(id) && heldIn(p, id) > 0) ?? "gemRuby";
    const gem = c.of<string | null>([c.of(GEM_IDS), c.of(GEM_IDS), mineGem, mineGem, "oreCopper", "chipRuby", "noSuchThing", null]);
    add("forge_redraw", [p, s, slot, where, gem, r1, r2], redraw(p, s, slot as number, where as number, gem as ItemId, r1, r2));
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
  // (a forging away from home is neither drawn for nor made again, whatever else is so)
  for (const kind of ["hoe", "can"] as const) for (const level of [3, 6, 10]) {
    const tool = movedTool(kind, level)!, p = purseWith(500, [tool], [["gemRuby", 1]]);
    add("forge_draw", [p, newSmithy(), 0, 0.3, 0.6], draw(p, newSmithy(), 0, 0.3, 0.6));
    add("forge_redraw", [p, newSmithy(), 0, 0, "gemRuby", 0.3, 0.6], redraw(p, newSmithy(), 0, 0, "gemRuby", 0.3, 0.6));
  }

  /* ── a gem ── */
  // (the mount by the number it takes: enough for one, for four, none, and one short of each; copper ore, which was the mount, lies beside it and is not taken)
  for (let i = 0; i < 760; i++) {
    const kind = c.maybe(0.75) ? c.of(BUILT_KINDS) : c.of(KINDS), stack = c.maybe(0.08) ? anyTool(kind) : c.maybe(0.06) ? movedTool(kind) ?? soundTool(kind, 4) : soundTool(kind, c.int(0, 10)), was = gemsOf(stack)[0];
    const gem = c.of<string | null>([c.of(GEM_IDS), c.of(GEM_IDS), c.of(GEM_IDS), c.of(GEM_IDS), was ? GEMS[was].gem : c.of(GEM_IDS), "chipRuby", "oreCopper", "noSuchThing", null]);
    const p = pouched(purseWith(SMITH.gem.fee + c.of([0, 0, 0, 30, -1, -SMITH.gem.fee]), [notTool(), stack], [...(gem && gem in ITEMS && c.maybe(0.88) ? [[gem as ItemId, c.int(1, 3)] as [ItemId, number]] : []), [SMITH.gem.mount, c.of([1, 1, 1, 4, 0]) * SMITH.gem.mounts - c.of([0, 0, 0, 1])], ["oreCopper", 2]]), 0.35);
    const slot = c.maybe(0.88) ? 1 : c.of<number | null>([0, -1, 30, null]);
    add("gem_set", [p, slot, gem], setGem(p, slot as number, gem as ItemId));
  }
  // (every element in every kind, over nothing and over another; the gem and its mount in one stack each, the last of them)
  for (const kind of BUILT_KINDS) for (const e of ELEMENTS) for (const over of [null, ELEMENTS[(ELEMENTS.indexOf(e) + 3) % ELEMENTS.length]]) {
    const p = purseWith(SMITH.gem.fee, [soundTool(kind, c.of([0, 5, 10]), { gem: over })], [[GEMS[e].gem, 1], [SMITH.gem.mount, SMITH.gem.mounts]]);
    add("gem_set", [p, 0, GEMS[e].gem], setGem(p, 0, GEMS[e].gem));
  }

  /* ── a move ── */
  for (const item of ["can", "canCopper", "canBrass", "bucket", "hoe", "noSuchThing"] as const) for (const level of [0, 1, 4, 7, 9, 10]) for (const gem of [null, "fire", "water"] as const) for (const opts of [[], ["cnDrop"], ["cnThrift", "cnDrop"], ["hoClear"]]) {
    const s = { item, n: 1, ...(level ? { plus: level } : {}), ...(gem ? { gems: [gem] } : {}), ...(opts.length ? { opts } : {}), ...(opts[0] === "hoClear" ? { origin: "hoe" } : {}) } as unknown as Stack;
    add("can_holds", [s], canHolds(s));
  }
  add("can_holds", [null], canHolds(null));
  for (let i = 0; i < 420; i++) {
    const kind = c.of(KINDS), other = c.of(lineKinds(kind));
    const tool = c.maybe(0.15) ? anyTool(kind) : c.maybe(0.3) ? movedTool(kind) ?? soundTool(kind, c.int(0, 10)) : { ...soundTool(kind, c.int(0, 10)), ...(kind === "can" ? { water: c.int(0, 16) } : {}), ...(c.maybe(0.3) ? { makers: ["Aqua", "", "Mint"].slice(0, c.int(1, 3)) } : {}) };
    const from = c.maybe(0.2) ? anyTool(other) : c.maybe(0.3) ? movedTool(other) ?? soundTool(other, c.int(0, 10)) : { ...soundTool(other, c.int(0, 10)), ...(c.maybe(0.4) ? { makers: ["Nine", "Nine"].slice(0, c.int(1, 2)) } : {}) };
    add("tool_with_forging", [tool, forgingOf(from)], withForging(tool, forgingOf(from)));
    add("move_fee", [tool, from], moveFee(tool, from));
  }
  for (const s of [null, { item: "minnow", n: 2 }, { item: "rodTeak", n: 1, plus: 4 }] as Array<Stack | null>) add("move_fee", [s, { item: "pot", n: 1, plus: 3 }], moveFee(s, { item: "pot", n: 1, plus: 3 }));
  for (const level of [-1, 0, 1, 3, 4, 4.5, 9, 10, 11, 12]) add("sticker_of", [level], stickerOf(level));
  for (const kinds of [0, 1, 2, 3, 4]) for (const level of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9.7, 10, 12]) add("move_fee_at", [kinds, level], moveFeeAt(kinds, level));
  // (what goes on for a while: begun and not over, over, never begun, kept wrongly; of a tool that has the option, awake and asleep, and of one that has not)
  for (const [id, key] of Object.entries(TIMED) as Array<[OptionId, "canFull" | "rodStill"]>) for (const till of [undefined, NOW - 1, NOW, NOW + 1, NOW + 20 * MIN, "soon", null] as unknown[]) {
    const kind = OPTIONS[id].tools[0] as ToolKind, fellow = lineKinds(kind).find((k) => k !== kind);
    const tools: Array<Stack | null> = [{ item: kind, n: 1, plus: 10, opts: ["", "", id] }, { item: kind, n: 1, plus: 10, opts: ["", "", c.of(poolOf(kind, 2).filter((o) => o !== id))] }, { item: kind, n: 1 }, null, { item: "minnow", n: 1 },
      ...(fellow ? [{ item: fellow, n: 1, plus: 10, opts: ["", "", id], origin: kind } as Stack] : [])];
    for (const tool of tools) {
      const purse = { ...newPurse(), ...(till === undefined ? {} : { [key]: till }) } as Purse;
      add("power_running", [purse, tool, NOW], running(purse, tool, NOW));
    }
  }
  // (every tile about the forge: by it, or not)
  for (let x = Math.floor(SMITH_PLACE.stand.x) - 10; x <= Math.floor(SMITH_PLACE.stand.x) + 10; x++) for (let y = Math.floor(SMITH_PLACE.stand.y) - 10; y <= Math.floor(SMITH_PLACE.stand.y) + 10; y++) add("by_smith", [x, y], bySmith(x + 0.5, y + 0.5));
  /** Two tools to trade, in a bag, and what is asked of the moment: every way a move is refused, and the moves that are made. */
  const pairs: Array<() => [Stack | null, Stack | null]> = [
    () => [soundTool("pot", c.of([4, 5, 7, 8, 9]), {}), { item: c.of(["pan", "grill"] as const), n: 1 }],
    () => [soundTool("pan", c.of([4, 7, 10]), {}), soundTool("grill", c.of([4, 5, 8]), {})],
    () => [{ ...soundTool("hoe", c.of([4, 5, 7, 10]), {}) }, { item: "can", n: 1, water: c.int(0, 8) }],
    () => [{ ...soundTool("can", c.of([4, 5, 7, 10]), { gem: c.of([null, "fire"] as const) }), water: c.int(0, 16) }, { item: "hoe", n: 1 }],
    () => [movedTool("can", c.of([4, 5, 7]))!, { item: "hoe", n: 1 }],
    () => [movedTool("hoe", c.of([4, 5, 7]))!, soundTool("can", c.of([4, 5, 8]), {})],
    () => [soundTool("pot", 3, { owed: true }), { item: "pan", n: 1 }],
    () => [{ item: "pan", n: 1 }, soundTool("grill", 6, { owed: true })],
    () => [{ item: "pot", n: 1 }, { item: "pan", n: 1 }],
    () => { const s = soundTool("pot", 5, { gem: "ice" }); return [s, { ...s, item: "grill" }]; },
    () => [soundTool("pick", 5, {}), { item: "pick", n: 1 }],
    () => [soundTool("pot", 5, {}), soundTool("hoe", 5, {})],
    () => [soundTool("pot", 5, {}), { item: "potBrass", n: 1 }],
    () => [soundTool("pot", 5, {}), null],
    () => [{ item: "can", n: 1, plus: 10, opts: ["cnDrop", "cnThrift", "cnFull"], water: 12 }, { item: "hoe", n: 1, plus: 4, opts: ["hoClear"] }],
    () => [{ item: "pot", n: 1, plus: 9, opts: ["ckFire", "ckBase"], gems: ["fire"], makers: ["Aqua", "Nine"] }, { item: "grill", n: 1, plus: 4, opts: ["ckBrisk"], makers: ["Mint"] }],
  ];
  for (let i = 0; i < 900; i++) {
    const [a, b] = c.of(pairs)(), flip = c.maybe(0.5), first = flip ? b : a, second = flip ? a : b;
    const fee = moveFee(a, b) ?? 50, coins = c.of([fee, fee, fee, fee + 500, 5000, fee - 1, 0]);
    const p: Purse = { ...purseWith(Math.max(0, coins), [notTool(), first, second, notTool()], [["minnow", 2]]), ...(c.maybe(0.15) ? { canFull: c.of([NOW + 5 * MIN, NOW - 1]) } : {}), ...(c.maybe(0.1) ? { rodStill: NOW + MIN } : {}) };
    const mine = [first, second].find((s) => !!s && owedOf(s) < 0 && drawnOf(s).some(Boolean)) ?? null, had = mine ? drawnOf(mine).findIndex(Boolean) : -1;
    const pending = c.of<() => Pending | null>([() => null, () => null, () => null, () => null, () => (mine && had >= 0 ? { item: toolKindOf(mine.item)!, at: had, offer: [c.of(OPTION_IDS)], old: drawnOf(mine)[had]! } : null),
      () => waiting("pick", 0), () => { const owed = [first, second].find((s) => !!s && owedOf(s) >= 0); return owed ? waiting(toolKindOf(owed.item)!, owedOf(owed)) : null; }])();
    const s: Smithy = { ...newSmithy(), pending };
    const from = c.maybe(0.88) ? 1 : c.of<number | null>([2, 0, 3, -1, 40, null]), to = c.maybe(0.88) ? 2 : c.of<number | null>([1, 0, 3, -1, 40, null]);
    const ask = { near: c.maybe(0.92), playing: c.maybe(0.06), now: NOW };
    add("move_why", [p, s, from, to, ask.near, ask.playing, ask.now], moveWhy(p, s, from as number, to as number, ask));
    add("move_forging", [p, s, from, to, ask.near, ask.playing, ask.now], moveForging(p, s, from as number, to as number, ask));
  }

  /* ── the board ── */
  const boards: SmithBoard[] = [newBoard(), { tops: { pick: { by: HER, name: "Member Two", at: NOW - HOUR } }, found: {} }, { tops: {}, found: { pkPeek: { by: HIM, name: "Him", at: NOW - 5 }, axDry: { by: ME, name: "Me", at: 3 } } },
    { tops: { pick: { by: HER, name: "Member Two", at: 1 }, axe: { by: ME, name: "Member One", at: 2 } }, found: { pkPeek: { by: HER, name: "Member Two", at: 4 } } }];
  for (const b of boards) {
    for (const kind of ["pick", "axe", "rod", "grill"] as const) add("board_top", [b, kind, ME, "Member One", NOW], markTop(b, kind, { id: ME, name: "Member One" }, NOW));
    for (const opt of ["pkPeek", "axDry", "pkQuake", "ckBig"] as const) add("board_found", [b, opt, ME, "Member One", NOW], markFound(b, opt, { id: ME, name: "Member One" }, NOW));
  }

  /* ── the great fire ── */
  const WHO = [ME, HER, HIM, "00000000-0000-0000-0000-000000000004", "00000000-0000-0000-0000-000000000005", "00000000-0000-0000-0000-000000000006", "00000000-0000-0000-0000-000000000007", "00000000-0000-0000-0000-000000000008"];
  const called = (id: string) => `สมาชิก ${id.slice(-1)}`;
  /** A fire as the village may keep it: its time come or not, each half found or not (and how long ago), a row of some, and some who have topped. */
  const fireAt = (how: Partial<{ due: number; flint: number | null; tinder: number | null; row: string[]; topped: string[] }> = {}): GreatFire => {
    const ago = () => c.of([0, 1, 30 * MIN, DAY - 1, DAY, DAY + 1, 2 * DAY + HOUR, 9 * DAY]);
    const flint = how.flint === undefined ? (c.maybe(0.6) ? NOW - ago() : null) : how.flint, tinder = how.tinder === undefined ? (c.maybe(0.6) ? NOW - ago() : null) : how.tinder;
    const topped = how.topped ?? WHO.filter(() => c.maybe(0.15)), row = how.row ?? WHO.filter((id) => !topped.includes(id) && c.maybe(0.5)).sort(() => c.next() - 0.5);
    return {
      due: how.due ?? c.of([0, 0, NOW - DAY, NOW - 1, NOW, NOW + 1, NOW + 20 * DAY]),
      flint: flint === null ? null : { id: c.of(WHO), name: called(c.of(WHO)), at: flint }, tinder: tinder === null ? null : { id: c.of(WHO), name: called(c.of(WHO)), at: tinder },
      used: Object.fromEntries(WHO.filter(() => c.maybe(0.3)).map((id) => [id, dayOf(NOW)])),
      row: row.map((id, i) => ({ id, name: called(id), since: NOW - (row.length - i) * HOUR })), topped,
    };
  };
  const fires: unknown[] = [
    undefined, null, "fire", 7, [], {}, newGreatFire(),
    { due: "soon", flint: [], tinder: "x", row: {}, topped: "all" },
    { due: -5, flint: { id: ME, name: "Me", at: 3 }, tinder: { id: "", name: "Nobody", at: 4 }, row: [], topped: [ME, ME, "", 3, null, HER] },
    { due: 12.5, flint: { id: ME, at: 3 }, tinder: { id: HER, name: 7, at: 9 }, row: [{ id: ME, name: "Me", since: 1 }, { id: ME, name: "Me again", since: 2 }, { id: HER, since: 3 }, { id: HIM, name: "Him", since: "4" }, null, "x", [HIM], { name: "No id", since: 5 }, { id: HIM, name: "Him", at: 6 }], topped: [] },
    { flint: { id: ME, name: "A name that runs on a good deal past the forty characters a finder's name is kept to", at: 3 }, tinder: { id: HER, name: "Her", at: "9" }, row: [{ id: HER, name: "Her", since: 1 }, { id: HIM, name: "Him", since: 2 }], topped: [HER] },
    { due: 5, row: Array.from({ length: 60 + 7 }, (_, i) => ({ id: `id-${i}`, name: `ชื่อ ${i}`, since: i })), topped: ["id-3"] },
  ];
  for (const k of fires) add("fire_sound", [k === undefined ? null : typeof k === "string" ? JSON.stringify(k) : k], soundGreatFire(k));
  for (let i = 0; i < 700; i++) {
    const f = c.maybe(0.08) ? fireAt({ row: Array.from({ length: 60 }, (_, n) => `id-${n}`), topped: [] }) : c.maybe(0.1) ? fireAt({ flint: NOW - c.int(0, 3) * DAY, tinder: NOW - HOUR }) : fireAt();
    const id = c.of([...WHO, f.row[0]?.id ?? ME, f.row[f.row.length - 1]?.id ?? HER, f.topped[0] ?? HIM]), now = c.of([NOW, NOW, NOW, NOW + DAY, NOW - 2 * HOUR, NOW + 1]);
    add("fire_sound", [f], soundGreatFire(f));
    add("fire_lit_at", [f], litAt(f));
    add("fire_open_to", [f, now], openTo(f, now));
    const half = c.of<Half>(["flint", "tinder"]);
    add("fire_half_found", [f, half, id, called(id), now], halfFound(f, half, { id, name: called(id) }, now));
    const ready = c.maybe(0.8);
    add("fire_join", [f, id, called(id), ready, now], joinRow(f, { id, name: called(id) }, ready, now));
    add("fire_leave", [f, id], leaveRow(f, id));
    add("fire_why", [f, id, now], fireWhy(f, id, now));
    const outcome = c.of<Outcome>(["taken", "stays", "down"]), draw_ = c.of([0, 1, 0.5, -0.2, 1.3, c.next(), c.next(), c.next()]);
    add("fire_spent", [f, id, called(id), outcome, now, draw_], fireSpent(f, { id, name: called(id) }, outcome, now, draw_));
    add("fire_told", [f, id, now], fireTold(f, id, now));
  }
  for (let i = 0; i < 80; i++) {
    const p = purseWith(0, [notTool(), soundTool(c.of(KINDS), c.of([8, 9, 9, 10, 0])), c.maybe(0.3) ? { item: "rodTeak", n: 1, plus: 9 } : null, c.maybe(0.2) ? anyTool(c.of(KINDS)) : null]);
    add("forge_under_top", [p], p.bag.some((s) => !!s && !!toolKindOf(s.item) && levelOf(s) === FORGE.top - 1));
  }
  // (a try as whoever keeps the game makes it: of a tool one level under the top with the fire lit and my turn, not lit, not my turn, not in the row, topped
  // before; with what it takes and one short; and of a tool at any other level, which no fire is asked for)
  for (let i = 0; i < 900; i++) {
    const kind = c.of(KINDS), level = c.of([9, 9, 9, 9, 9, 9, 8, 5, 10, 0]), tool = soundTool(kind, level, { gem: null }), cost = tryCost(kind, Math.min(FORGE.top, level + 1))!;
    const short = c.of(["nothing", "nothing", "nothing", "nothing", "ore", "timber", "coins"] as const);
    const p = purseWith(short === "coins" ? cost.fee - 1 : cost.fee + 3, [tool], [[cost.ore, short === "ore" ? cost.n - 1 : cost.n], ["timber", short === "timber" ? cost.timber - 1 : cost.timber]]);
    const lit = c.maybe(0.75), f = fireAt({ ...(lit ? { flint: NOW - c.of([1, HOUR, DAY + 5, 3 * DAY]), tinder: NOW - c.of([1, HOUR]) } : {}),
      ...(c.maybe(0.7) ? { row: c.of([[ME], [ME, HER], [HER, ME], [HER, HIM, ME], [HER]]), topped: c.of([[], [], [HIM], [ME]]).filter((id) => id !== ME || c.maybe(0.5)) } : {}) });
    p.forgeDay = c.maybe(0.3) ? dayOf(NOW) : dayOf(NOW) - 1;
    const sound = soundGreatFire(f), r = luck(), draw_ = c.of([0, 1, c.next(), c.next()]), slot = c.maybe(0.95) ? 0 : c.of([1, -1]);
    add("forge_try_fired", [p, sound, slot, r, ME, "Member One", NOW, draw_], tryFired(p, sound, slot, r, ME, "Member One", NOW, draw_));
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

describe("the cases the database's rules of the blacksmith are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsSmith();
    expect(JSON.stringify(vectorsSmith())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string }; return d.ok ? "ok" : d.why; }))].sort();
    for (const fn of ["forge_candidates", "forge_owed", "forging_of", "try_cost", "outcome_of", "smithy_sound", "smith_view", "smelt", "smith_collect", "bellows", "bellows_left", "tool_with_maker",
      "forge_try", "pick_offer", "pending_slot", "forge_draw", "forge_redraw", "forge_choose", "gem_set", "can_holds", "tool_with_forging", "move_fee", "move_fee_at", "power_running", "by_smith", "move_why", "move_forging",
      "fire_sound", "fire_lit_at", "fire_open_to", "fire_half_found", "fire_join", "fire_leave", "fire_why", "fire_spent", "fire_told", "forge_under_top", "forge_try_fired", "counts_of"]) expect(of(fn).length, fn).toBeGreaterThan(40);

    // what the smith may draw: owed at each milestone and at none; nothing for a forging away from home
    expect(new Set(of("forge_owed").map((v) => v.want))).toEqual(new Set([-1, 0, 1, 2]));
    expect(of("forge_candidates").some((v) => awayOf(v.args[0] as Stack) && (v.want as unknown[]).length === 0) && of("forge_candidates").some((v) => (v.want as unknown[]).length >= 4)).toBe(true);
    expect(of("forge_drawable").some((v) => (v.want as unknown[]).length >= 4) && of("forge_drawable").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    expect(of("forge_settable").some((v) => v.want === true) && of("forge_settable").some((v) => v.want === false)).toBe(true);

    // the table: every level of both recipes, and each way a try goes at every level it can
    expect(of("try_cost").filter((v) => v.want !== null).length).toBe(TOOL_KINDS.length * TRIES.length);
    for (const t of TRIES) for (const out of ["taken", "stays", "down"] as const) expect(of("outcome_of").some((v) => v.args[0] === t.to && v.want === out), `${t.to} ${out}`).toBe(t[out === "taken" ? "take" : out === "stays" ? "stay" : "down"] > 0);

    // what is kept, made sound; a queue seen at every part of it
    const empty = (s: Smithy) => !s.queue.length && s.pending === null && s.more === 0 && s.ember === 0;
    expect(of("smithy_sound").some((v) => empty(v.want as Smithy)) && of("smithy_sound").some((v) => (v.want as Smithy).pending?.old !== undefined)).toBe(true);
    expect(of("smithy_sound").some((v) => { const k = v.args[0] as { queue?: unknown[] } | null; return Array.isArray(k?.queue) && (v.want as Smithy).queue.length > 0 && (v.want as Smithy).queue.length < k!.queue!.length; })).toBe(true);
    const views = of("smith_view").map((v) => v.want as ReturnType<typeof smithView>);
    expect(views.some((x) => x.done.length > 0 && x.now && x.waiting.length > 0) && views.some((x) => !x.now && x.waiting.length > 0) && views.some((x) => x.free === 0) && views.some((x) => x.free === x.places)).toBe(true);

    // smelting: done, and refused each way; paid from the bag, from a pouch, and from both; what is done taken whole, in part, and not at all
    expect(whys("smelt")).toEqual(["amount", "coins", "none", "ok", "ore", "places", "timber"]);
    const smelted = of("smelt").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, n: v.args[3] as number, d: v.want as { timber: number; fee: number; smithy: Smithy; purse: Purse } }));
    for (const piece of PIECES) expect(of("smelt").some((v) => v.args[2] === piece && (v.want as { ok: boolean }).ok), piece).toBe(true);
    expect(smelted.some((x) => x.d.timber < x.n) && smelted.some((x) => x.d.timber === x.n && x.n > 1) && smelted.some((x) => x.d.smithy.ember > 0)).toBe(true);
    expect(smelted.every((x) => x.d.purse.coins === x.p.coins - x.d.fee && heldIn(x.d.purse, "timber") === heldIn(x.p, "timber") - x.d.timber)).toBe(true);
    const fromPouch = (x: { p: Purse; d: { purse: Purse } }) => JSON.stringify(x.p.pouches ?? null) !== JSON.stringify(x.d.purse.pouches ?? null), fromBag = (x: { p: Purse; d: { purse: Purse } }) => JSON.stringify(x.p.bag) !== JSON.stringify(x.d.purse.bag);
    expect(smelted.some((x) => fromPouch(x) && !fromBag(x)) && smelted.some((x) => fromPouch(x) && fromBag(x)) && smelted.some((x) => !fromPouch(x) && fromBag(x))).toBe(true);
    expect(new Set(of("smith_dry").map((v) => v.want))).toEqual(new Set([1, 2]));
    expect(whys("smith_collect")).toEqual(["full", "none", "ok"]);
    const got = of("smith_collect").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, s: v.args[1] as Smithy, now: v.args[2] as number, d: v.want as { smithy: Smithy; purse: Purse; got: Array<[string, number]> } }));
    expect(got.some((x) => x.d.smithy.queue.some((q) => q.till <= x.now)) && got.some((x) => x.d.got.length > 1) && got.every((x) => x.d.got.reduce((n, g) => n + g[1], 0) === x.s.queue.length - x.d.smithy.queue.length)).toBe(true);
    expect(got.some((x) => fromPouch(x) && !fromBag(x)) && got.some((x) => fromBag(x))).toBe(true);
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

    // a try: every kind to every level, each way it goes; refused each way; never under the floor once there; and a maker written once
    expect(whys("forge_try")).toEqual(["coins", "foreign", "ok", "ore", "owed", "timber", "tool", "top"]);
    const tries = of("forge_try").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, slot: v.args[1] as number, by: v.args[3] as string, d: v.want as { out: string; from: number; level: number; item: ToolKind; owed: number; purse: Purse } }));
    for (const kind of TOOL_KINDS) for (const t of TRIES) expect(tries.some((x) => x.d.item === kind && x.d.from === t.to - 1 && x.d.out === "taken" && x.d.level === t.to), `${kind} +${t.to}`).toBe(true);
    // (by the table as it is, a try that loses a level begins above the floor: the try to the level after the floor never does)
    expect(tries.some((x) => x.d.out === "down" && x.d.level === x.d.from - 1) && tries.some((x) => x.d.out === "stays" && x.d.level === x.d.from)).toBe(true);
    expect(tries.filter((x) => x.d.out === "down").every((x) => x.d.from > FORGE.floor && x.d.level === x.d.from - 1)).toBe(true);
    expect(tries.every((x) => x.d.level >= Math.min(x.d.from, FORGE.floor) && x.d.level <= x.d.from + 1 && (x.d.from < 3 ? x.d.out === "taken" : true))).toBe(true);
    expect(tries.every((x) => x.d.purse.coins === x.p.coins - tryCost(x.d.item, x.d.from + 1)!.fee && x.d.purse.bag[x.slot]?.item === x.d.item && levelOf(x.d.purse.bag[x.slot]) === x.d.level)).toBe(true);
    expect(tries.some((x) => x.d.owed >= 0) && tries.some((x) => x.d.owed < 0) && tries.some((x) => (x.d.purse.bag[x.slot] as Stack).water !== undefined)).toBe(true);
    expect(tries.some((x) => fromPouch(x))).toBe(true);
    const named = (x: (typeof tries)[number]) => makersOf(x.d.purse.bag[x.slot]).filter(Boolean).length - makersOf(x.p.bag[x.slot]).filter(Boolean).length;
    expect(tries.some((x) => named(x) === 1 && x.d.out === "taken") && tries.every((x) => named(x) === 0 || (x.d.out === "taken" && FORGE.milestones.includes(x.d.level)))).toBe(true);
    expect(of("tool_with_maker").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("tool_with_maker").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);

    // the options: laid out fresh, the same again, refused each way; made again; chosen, kept, refused
    expect(of("pick_offer").some((v) => (v.want as unknown[]).length === 2) && of("pick_offer").some((v) => (v.want as unknown[]).length === 1) && of("pick_offer").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    expect(of("pick_offer").every((v) => new Set(v.want as string[]).size === (v.want as string[]).length)).toBe(true);
    expect(whys("forge_draw")).toEqual(["foreign", "none", "ok", "owed", "tool"]);
    const draws = of("forge_draw").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ s: v.args[1] as Smithy, d: v.want as { fresh: boolean; pending: Pending } }));
    expect(draws.some((x) => x.d.fresh && !x.s.pending) && draws.some((x) => x.d.fresh && !!x.s.pending) && draws.some((x) => !x.d.fresh && JSON.stringify(x.d.pending) === JSON.stringify(x.s.pending))).toBe(true);
    for (const m of [0, 1, 2]) expect(draws.some((x) => x.d.fresh && x.d.pending.at === m && x.d.pending.offer.length === 2), `milestone ${m}`).toBe(true);
    expect(new Set(of("pending_slot").map((v) => v.want)).size).toBeGreaterThan(2);
    // (`unbuilt` is the rule's answer where a pool has nothing left to lay out; with every option built no tool reaches it, and the rule keeps the line)
    expect(whys("forge_redraw")).toEqual(["coins", "foreign", "gem", "none", "ok", "owed", "tool"]);
    expect(whys("forge_choose")).toEqual(["none", "ok", "tool"]);
    const chosen = of("forge_choose").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { kept: boolean; at: number; opt: string; smithy: Smithy });
    expect(chosen.some((x) => x.kept) && chosen.some((x) => !x.kept) && chosen.every((x) => x.smithy.pending === null)).toBe(true);
    for (const m of [0, 1, 2]) expect(chosen.some((x) => x.at === m), `chosen at ${m}`).toBe(true);

    // a gem: set, over none and over another, refused each way (too little of the mount by the mount's own word)
    expect(whys("gem_set")).toEqual(["coins", "gem", "ok", "same", "timber", "tool"]);
    const sets = of("gem_set").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { element: string; over: string | null });
    for (const e of ELEMENTS) expect(sets.some((x) => x.element === e && x.over === null) && sets.some((x) => x.element === e && x.over !== null), e).toBe(true);

    // a move: refused each way in the code's order, and made; a can's water never more than it holds; the forge's reach has an inside and an outside
    expect(whys("move_forging")).toEqual(["alone", "coins", "far", "line", "nothing", "ok", "owed", "playing", "running", "tool", "twice"]);
    expect(new Set(of("move_why").map((v) => v.want))).toEqual(new Set([null, "alone", "coins", "far", "line", "nothing", "owed", "playing", "running", "tool", "twice"]));
    const moved = of("move_forging").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ p: v.args[0] as Purse, from: v.args[2] as number, to: v.args[3] as number, d: v.want as { fee: number; spilt: number; purse: Purse } }));
    expect(moved.some((x) => x.d.spilt > 0) && moved.some((x) => x.d.spilt === 0) && moved.every((x) => x.d.purse.coins === x.p.coins - x.d.fee && x.d.fee >= SMITH.move.least)).toBe(true);
    expect(moved.every((x) => [x.from, x.to].every((i) => x.d.purse.bag[i]!.item === x.p.bag[i]!.item && (typeof x.d.purse.bag[i]!.water !== "number" || canHolds(x.d.purse.bag[i]) === 0 || x.d.purse.bag[i]!.water! <= canHolds(x.d.purse.bag[i]))))).toBe(true);
    expect(moved.some((x) => awayOf(x.d.purse.bag[x.from]) || awayOf(x.d.purse.bag[x.to])) && moved.some((x) => awayOf(x.p.bag[x.from]) && !awayOf(x.d.purse.bag[x.to]))).toBe(true);
    expect(of("tool_with_forging").some((v) => (v.want as Stack).origin !== undefined) && of("tool_with_forging").some((v) => { const f = v.args[1] as { origin: ToolKind | null }, t = v.args[0] as Stack; return !!f.origin && f.origin !== t.item && samePool(f.origin, toolKindOf(t.item)!) && (v.want as Stack).origin === undefined; })).toBe(true);
    expect(of("by_smith").some((v) => v.want === true) && of("by_smith").some((v) => v.want === false)).toBe(true);
    expect(of("power_running").some((v) => (v.want as unknown[]).length === 1) && of("power_running").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    expect(new Set(of("can_holds").map((v) => v.want)).size).toBeGreaterThan(6);
    expect(new Set(of("move_fee_at").map((v) => v.want)).size).toBeGreaterThan(8);

    // the board: written once
    expect(of("board_top").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("board_top").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);
    expect(of("board_found").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("board_found").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);

    // Daily rights are independent of old queues and previous top outcomes.
    expect(of("fire_half_found").every((v) => !(v.want as { found: boolean }).found)).toBe(true);
    expect(whys("fire_join")).toEqual(["daily", "level", "ok"]);
    expect(whys("fire_leave")).toEqual(["none"]);
    expect(new Set(of("fire_why").map((v) => v.want))).toEqual(new Set([null, "daily"]));
    const spent = of("fire_spent").map((v) => ({ id: v.args[1] as string, now: v.args[4] as number, d: v.want as GreatFire }));
    expect(spent.every((x) => x.d.used?.[x.id] === dayOf(x.now))).toBe(true);
    expect(new Set(of("forge_under_top").map((v) => v.want))).toEqual(new Set([true, false]));
    expect(whys("forge_try_fired")).toEqual(["coins", "daily", "ok", "ore", "timber", "tool", "top"]);
    const fired = of("forge_try_fired").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { spent: boolean; out: string; from: number; purse: Purse });
    expect(fired.some((x) => x.spent && x.out === "taken") && fired.some((x) => x.spent && x.out !== "taken") && fired.some((x) => !x.spent)).toBe(true);
    expect(fired.every((x) => x.spent === (x.from === FORGE.top - 1) && (!x.spent || x.purse.forgeDay === dayOf(NOW)))).toBe(true);

    // the helpers' line: the bellows worked for somebody else count, and for nobody else do not
    const blownFor = of("counts_of").filter((v) => (v.args[0] as Done).what === "bellows").map((v) => v.want as Counts[]);
    expect(blownFor.some((x) => x.length === 1 && x[0].line === "helpers" && x[0].raw === SMITH.bellows.points) && blownFor.some((x) => x.length === 0)).toBe(true);
    expect(of("counts_of").length).toBeGreaterThan(600);

    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-smith.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
