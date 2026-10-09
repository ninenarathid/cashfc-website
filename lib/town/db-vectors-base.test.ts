import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsPlain } from "./db-vectors-plain.test";
import { stretchOf } from "./gifts";
import { ITEMS, ITEM_IDS, type ItemId } from "./items";
import { NOTICES, capOf as noticeCap, dearOf } from "./notices";
import { POUCHES, bagToPouch, heldIn, pouchToBag, pouchesOf, roomIn, stow, stowAll, takeOut } from "./pouches";
import { mayPower, powerLeft, powerRule, powerUsed, usePower } from "./powers";
import { SHOP, capOf as stallCap } from "./shop";
import {
  ELEMENTS, FORGE, GEMS, GEM_FX, OPTIONS, OPTION_IDS, TOOL_KINDS, awayOf, drawnOf, elementOfChip, elementOfGem, gemBy, gemLevel, gemsOf, has, levelOf, lineKinds, makerName, makersOf, modsOf, optN, originOf,
  poolOf, samePool, toolKindOf, type Element, type OptionId, type ToolKind,
} from "./tools";
import { handSlot, heldStack, newPurse, put, type Purse, type Stack } from "./trade";

/**
 * The cases the database's rules are held to for v164's base: what the far side's other parts stand on
 * (lib/town/db-vectors-gifts.test.ts says how such a file works). Each is a function of the schema `town` with its
 * arguments and what the code answers (.claude/skills/fc-cash-town/scripts/db/v164.base.calls.json says which
 * function each name is):
 *
 * - what a tool carries, read back (lib/town/tools): `tool_kind`, `line_kinds`, `same_pool`; `tool_level`,
 *   `tool_drawn`, `tool_origin`, `tool_away`, `tool_gems`, `tool_makers`, `tool_mods`, `tool_has`, `gem_level` of
 *   tools kept soundly and not (a plus that is no number, past the top, under nothing; options of another pool, of
 *   another tool, the same twice, a hole, what is no option; gems that are no element, more than the sockets; makers'
 *   names with white space of every sort, too long, of no name; a forging that came out of a fellow of its line, of
 *   the same pool and of another, and out of what is no fellow), and of things that are no tool that is forged;
 *   `maker_name`; `gem_by` with steps of every length; `opt_n`; `gem_element`, `chip_element`;
 * - the hand (lib/town/trade): `hand_slot`, `hand_stack` of purses with two tools of a kind, the slot remembered
 *   rightly, wrongly and not at all;
 * - what is counted (lib/town/powers): `power_used`, `power_left`, `may_power`, `use_power` of options counted by the
 *   day and by the meal and not counted, with counts kept of this stretch, of another, wrongly, and used up; by a
 *   tool that has the option awake, asleep, and not at all;
 * - the pouches (lib/town/pouches): `pouches_of`, `held_in`, `room_in` of purses with one pouch, both and neither,
 *   kept soundly and not; `stow_away`, `stow_all`, `take_out`; `pouch_to_bag`, `bag_to_pouch` of every slot and what
 *   is no slot, into room, into too little and into none;
 * - the most a thing may be asked for (lib/town/notices, lib/town/shop): `dear_of`, `shop_cap`, `notice_cap` of every
 *   thing there is, by the knobs as they are and by others;
 * - and what a forged tool means to the rules that were there (lib/town/db-vectors-plain.test.ts, carried).
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-base.test.ts
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
const KINDS: ToolKind[] = [...TOOL_KINDS];
/** Things that are no tool that is forged: better tools, what holds something, plain things. */
const NO_TOOLS: ItemId[] = ["rodTeak", "hoeIron", "canCopper", "potBrass", "netSmall", "minnow", "bowl", "timber", "oreCopper", "gemRuby", "bucket"];
const MINE: ItemId[] = ["stone", "shardCopper", "shardIron", "chipRuby", "chipOnyx", "oreCopper", "gemRuby"], WOODS: ItemId[] = ["log", "timber"];
const GIFTS_ALL = POUCHES.map((p) => p.gift);

export function vectorsBase(): Vector[] {
  const c = chance(20261164), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const two = (from: readonly OptionId[]): OptionId[] => { const pool = [...from]; return [pool.splice(c.int(0, pool.length - 1), 1)[0], pool.splice(c.int(0, Math.max(0, pool.length - 1)), 1)[0]].filter(Boolean); };

  /* ── what a tool may carry: sound, or wrong in one of the ways there are ── */
  const plusKept = (): unknown => c.of<() => unknown>([() => undefined, () => 0, () => c.int(1, 10), () => c.int(1, 10), () => c.int(1, 10), () => 3, () => 6, () => 7, () => 10, () => 11, () => 99, () => -2, () => 4.7, () => "5", () => null, () => true])();
  const optsKept = (kind: ToolKind): unknown => {
    const p1 = poolOf(kind, 1), p2 = poolOf(kind, 2), other = c.of(KINDS.filter((k) => k !== kind && !samePool(k, kind)));
    const [x, y] = two(p1);
    return c.of<() => unknown>([
      () => undefined, () => [], () => [x], () => [x], () => [x, y], () => [x, y], () => [x, y, c.of(p2)], () => [x, y, c.of(p2)],
      () => ["", y], () => ["", "", c.of(p2)], () => [x, "", c.of(p2)], () => [x, x], () => [x, y, x], () => [c.of(p2)], () => [x, c.of(p2)], () => [x, y, c.of(p1)],
      () => [c.of(poolOf(other, 1))], () => [x, c.of(poolOf(other, 1)), c.of(poolOf(other, 2))], () => ["noSuchOption", 3, null], () => [null, y], () => x, () => null, () => ({ 0: x }), () => [x, y, c.of(p2), c.of(p2)],
    ])();
  };
  const gemsKept = (): unknown => c.of<() => unknown>([() => undefined, () => undefined, () => [], () => [c.of(ELEMENTS)], () => [c.of(ELEMENTS)], () => [c.of(ELEMENTS), c.of(ELEMENTS)], () => ["noSuchElement", "ice"], () => [3, "light"], () => "fire", () => null, () => [null], () => ["gemRuby"]])();
  const NAMES: unknown[] = ["Aqua", "Nine Nine", "  Aqua   the\tGreat  ", "ช่าง ตีเหล็ก", "a b　c﻿d", "line one\nline\r\ntwo", "A very long name that goes on past what a tool keeps of it", "twenty-three characters x and more", "😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀 x y z", "", "   ", null, 5, ["Aqua"], { name: "Aqua" }, " thin space sep"];
  const makersKept = (): unknown => c.of<() => unknown>([() => undefined, () => undefined, () => [], () => [c.of(NAMES)], () => [c.of(NAMES), c.of(NAMES)], () => [c.of(NAMES), c.of(NAMES), c.of(NAMES)], () => ["Aqua", "", "Nine", "One more"], () => "Aqua", () => null, () => ({ 0: "Aqua" })])();
  /** Where a tool's forging came from, as it may be kept: nothing said (mostly), a fellow of its line, what is no fellow, what is no kind. */
  const originKept = (kind: ToolKind): unknown => c.of<() => unknown>([
    () => undefined, () => undefined, () => undefined, () => c.of(lineKinds(kind)), () => c.of(lineKinds(kind)), () => kind, () => c.of(KINDS), () => "noSuchKind", () => 5, () => null, () => ["hoe"],
  ])();
  /** A stack of a kind of tool, with whatever is kept on it (and now and then the water a can holds). */
  const anyTool = (kind: ToolKind): Stack => {
    const plus = plusKept(), opts = optsKept(kind), gems = gemsKept(), makers = makersKept(), origin = originKept(kind);
    return {
      item: kind, n: 1, ...(plus === undefined ? {} : { plus }), ...(opts === undefined ? {} : { opts }), ...(gems === undefined ? {} : { gems }), ...(makers === undefined ? {} : { makers }),
      ...(origin === undefined ? {} : { origin }), ...(kind === "can" && c.maybe(0.5) ? { water: c.int(0, 8) } : {}),
    } as Stack;
  };
  /** A tool kept soundly at a level: its options drawn at every milestone reached, and a gem or none. */
  const soundTool = (kind: ToolKind, level: number, gem: Element | null = c.maybe(0.3) ? c.of(ELEMENTS) : null): Stack => {
    const [x, y] = two(poolOf(kind, 1)), z = c.of(poolOf(kind, 2));
    const drawn = [x, y, z].slice(0, FORGE.milestones.filter((m) => level >= m).length);
    return { item: kind, n: 1, ...(level > 0 ? { plus: level } : {}), ...(drawn.length ? { opts: drawn } : {}), ...(gem ? { gems: [gem] } : {}) };
  };
  /** A forging that sits in a fellow of its line: a hoe's in a watering can and a can's in a hoe (another pool), or among the cookware (one pool). */
  const movedTool = (): Stack => {
    const [into, from] = c.of<[ToolKind, ToolKind]>([["can", "hoe"], ["hoe", "can"], ["pan", "pot"], ["grill", "pan"], ["pot", "grill"]]);
    const theirs = soundTool(from, c.of([3, 6, 10]));
    return { ...theirs, item: into, origin: from, ...(c.maybe(0.3) ? { opts: [] } : {}) };
  };
  const notTool = (): Stack | null => c.of<() => Stack | null>([
    () => null, () => ({ item: c.of(NO_TOOLS), n: 1 }), () => ({ item: "minnow", n: c.int(1, 9) }), () => ({ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }),
    () => ({ item: "rodTeak", n: 1, plus: 5, opts: ["rdBait"], gems: ["fire"], makers: ["Aqua"], origin: "rod" }), () => ({ item: "bucket", n: 1, water: 1 }),
  ])();
  const someTool = (): Stack | null => (c.maybe(0.1) ? notTool() : c.maybe(0.15) ? movedTool() : c.maybe(0.3) ? soundTool(c.of(KINDS), c.int(0, 10)) : anyTool(c.of(KINDS)));
  /** A purse with a bag of so many slots: what is given first, each in a slot of its own, then things by the number. */
  const purseWith = (stacks: Array<Stack | null>, things: Array<[ItemId, number]> = [], slots = 10): Purse => {
    let bag: Purse["bag"] = [...stacks, ...Array<null>(Math.max(0, slots - stacks.length)).fill(null)];
    for (const [id, n] of things) if (n > 0) bag = put(bag, id, n);
    return { ...newPurse(), coins: c.int(0, 400), bag };
  };

  /* ── what a tool carries, read back ── */
  for (const item of [...KINDS, ...NO_TOOLS, "potFull", "noSuchThing", "", null]) add("tool_kind", [item], toolKindOf(item));
  for (const k of KINDS) add("line_kinds", [k], lineKinds(k));
  for (const a of KINDS) for (const b of KINDS) add("same_pool", [a, b], samePool(a, b));
  for (const name of NAMES) add("maker_name", [[name]], makerName(name));
  for (let i = 0; i < 900; i++) {
    const s = someTool();
    add("tool_level", [s], levelOf(s));
    add("tool_drawn", [s], drawnOf(s));
    add("tool_origin", [s], originOf(s));
    add("tool_away", [s], awayOf(s));
    add("tool_gems", [s], gemsOf(s));
    add("tool_makers", [s], makersOf(s));
    const { hue: _hue, ...mods } = modsOf(s);
    add("tool_mods", [s], mods);
    const kind = s ? toolKindOf(s.item) : null, mine = kind ? [...poolOf(kind, 1), ...poolOf(kind, 2)] : OPTION_IDS;
    const opt = c.maybe(0.7) && Array.isArray(s?.opts) && s.opts.length ? (c.of(s.opts as string[]) as OptionId) : c.maybe(0.8) ? c.of(mine) : ("noSuchOption" as OptionId);
    add("tool_has", [s, opt], has(s, opt));
    const e = c.maybe(0.6) && Array.isArray(s?.gems) && s.gems.length ? (c.of(s.gems as string[]) as Element) : c.maybe(0.9) ? c.of(ELEMENTS) : ("noSuchElement" as Element);
    add("gem_level", [s, e], gemLevel(s, e));
    const steps = c.of<readonly number[]>([GEM_FX.fire.pick.fewer, GEM_FX.light.pick.glint, GEM_FX.dark.pick.swings, GEM_FX.dark.pick.veins, GEM_FX.light.axe.glint, [5], [0.1, 0.9]]), else_ = c.of([0, 0, 1]);
    add("gem_by", [s, e, steps, else_], gemBy(s, e, steps, else_));
  }
  // (every option's own numbers, and a number it has not)
  for (const id of OPTION_IDS) for (const key of [...Object.keys(OPTIONS[id].n), "noSuchNumber"]) add("opt_n", [id, key], optN(id, key));
  add("opt_n", ["noSuchOption", "more"], 0);
  for (const item of [...ELEMENTS.flatMap((e) => [GEMS[e].gem, GEMS[e].chip]), "oreCopper", "shardCopper", "minnow", "noSuchThing", null]) {
    add("gem_element", [item], elementOfGem(item));
    add("chip_element", [item], elementOfChip(item));
  }

  /* ── the hand ── */
  for (let i = 0; i < 360; i++) {
    const kind = c.of<ToolKind>(["pick", "axe", "rod"]);
    const p = purseWith([c.maybe(0.7) ? soundTool(kind, c.int(0, 10)) : null, c.maybe(0.5) ? { item: "minnow", n: 3 } : null, c.maybe(0.7) ? soundTool(kind, c.int(0, 10)) : null, c.maybe(0.3) ? soundTool("hoe", 2) : null], [], c.of([6, 10]));
    const hand = c.of<unknown>([kind, kind, kind, "minnow", "hoe", "noSuchThing", null, undefined]), handAt = c.of<unknown>([0, 2, 2, 1, 3, 5, 99, -1, 2.5, 2.0, "2", null, undefined, undefined]);
    const purse = { ...p, ...(hand === undefined ? {} : { hand }), ...(handAt === undefined ? {} : { handAt }) } as Purse;
    const taken = c.of<number | null>([null, null, 0, 2, 1, 5, 99, -1]);
    add("hand_slot", [purse, taken], handSlot(purse, taken));
    add("hand_stack", [purse], heldStack(purse));
  }

  /* ── what is counted by the day or the meal ── */
  const counted = OPTION_IDS.filter((id) => powerRule(id)), uncounted = OPTION_IDS.filter((id) => !powerRule(id));
  for (let i = 0; i < 700; i++) {
    const id = c.maybe(0.85) ? c.of(counted) : c.maybe(0.8) ? c.of(uncounted) : ("noSuchOption" as OptionId), rule = powerRule(id), now = c.of(NOWS);
    const kind = (OPTIONS as Record<string, { tools: readonly ToolKind[] }>)[id]?.tools[0] ?? "pick";
    // a tool that has it awake (drawn at its own milestone), asleep (in a fellow of another pool), or not at all
    const awake: Stack = { item: kind, n: 1, plus: 10, opts: (OPTIONS as Record<string, { pool: number }>)[id]?.pool === 2 ? ["", "", id] : [id] };
    const tool = c.of<() => Stack | null>([() => awake, () => awake, () => awake, () => soundTool(kind, c.int(0, 10)), () => null, () => ({ item: kind, n: 1 }),
      () => (kind === "hoe" || kind === "can" ? { ...awake, item: kind === "hoe" ? "can" : "hoe", origin: kind } : awake)])();
    const k = rule ? stretchOf(rule, now) : 0, n = rule ? c.of([0, 1, rule.n - 1, rule.n, rule.n + 3]) : 1;
    const powers = c.of<() => unknown>([
      () => undefined, () => ({}), () => ({ [id]: { k, n } }), () => ({ [id]: { k, n } }), () => ({ [id]: { k, n } }), () => ({ [id]: { k: k - 1, n } }), () => ({ [id]: { k: k + 1, n } }),
      () => ({ [id]: { k, n: -2 } }), () => ({ [id]: { k, n: 1.7 } }), () => ({ [id]: { k, n: "2" } }), () => ({ [id]: { k: String(k), n } }), () => ({ [id]: [k, n] }), () => ({ [id]: null }), () => [], () => null,
      () => ({ pkPeek: { k, n: 1 }, [id]: { k, n } }),
    ])();
    const purse = { ...purseWith([tool]), ...(powers === undefined ? {} : { powers }) } as Purse;
    add("power_used", [purse, id, now], powerUsed(purse, id, now));
    add("power_left", [purse, id, now], powerLeft(purse, id, now));
    add("may_power", [purse, tool, id, now], mayPower(purse, tool, id, now));
    add("use_power", [purse, tool, id, now], usePower(purse, tool, id, now));
  }

  /* ── the pouches ── */
  /** What a pouch's slots may be kept as: sound, or wrong in one of the ways there are. */
  const slotKept = (holds: readonly ItemId[]): unknown => c.of<() => unknown>([
    () => null, () => null, () => ({ item: c.of(holds), n: c.int(1, 20) }), () => ({ item: c.of(holds), n: c.int(1, 20) }), () => ({ item: c.of(holds), n: ITEMS[holds[0]].stack }), () => ({ item: c.of(holds), n: 9999 }),
    () => ({ item: "minnow", n: 3 }), () => ({ item: c.of(holds), n: 0 }), () => ({ item: c.of(holds), n: 2.5 }), () => ({ item: c.of(holds), n: "3" }), () => ({ item: c.of(holds) }), () => "stone", () => [c.of(holds), 2], () => 7,
  ])();
  const pouchKept = (gift: string): unknown => {
    const p = POUCHES.find((x) => x.gift === gift)!;
    return c.of<() => unknown>([
      () => undefined, () => Array.from({ length: p.slots }, () => slotKept(p.holds)), () => Array.from({ length: p.slots }, () => slotKept(p.holds)), () => Array.from({ length: p.slots }, () => slotKept(p.holds)),
      () => Array.from({ length: p.slots + 2 }, () => slotKept(p.holds)), () => [slotKept(p.holds)], () => [], () => null, () => "full", () => ({ 0: { item: p.holds[0], n: 2 } }),
    ])();
  };
  /** A purse with the gifts said (and now and then one that is no gift, or none), each pouch kept somehow; `sound`: every pouch kept as it should be. */
  const pouchPurse = (sound = false): Purse => {
    const had = c.of<string[]>([GIFTS_ALL, GIFTS_ALL, GIFTS_ALL, [GIFTS_ALL[0]], [GIFTS_ALL[1]], [], ["thingBasket", ...GIFTS_ALL], ["noSuchGift", GIFTS_ALL[0]]]);
    const pouches: Record<string, unknown> = {};
    for (const p of POUCHES) {
      const kept = sound ? Array.from({ length: p.slots }, () => (c.maybe(0.5) ? { item: c.of(p.holds), n: c.int(1, 30) } : null)) : pouchKept(p.gift);
      if (kept !== undefined && (c.maybe(0.9) || had.includes(p.gift))) pouches[p.gift] = kept;
    }
    const whole = sound ? pouches : c.of<() => unknown>([() => pouches, () => pouches, () => pouches, () => pouches, () => undefined, () => null, () => [], () => "none"])();
    const stacks: Array<Stack | null> = Array.from({ length: c.of([6, 10]) }, () => c.of<() => Stack | null>([
      () => null, () => null, () => null, () => ({ item: c.of(MINE), n: c.int(1, 40) }), () => ({ item: c.of(WOODS), n: c.int(1, 50) }), () => ({ item: "minnow", n: c.int(1, 9) }), () => ({ item: "pick", n: 1 }),
      () => ({ item: "pick", n: 1, plus: 3 }), () => ({ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }), () => ({ item: "bucket", n: 1, water: c.of([0, 1]) }), () => ({ item: "stone", n: ITEMS.stone.stack }),
      // (there is no such thing in the game, and the rule says no all the same: a thing a pouch holds that carries something of its own, or holds something)
      () => c.of<Stack>([{ item: "log", n: 2, plus: 1 }, { item: "stone", n: 2, gems: ["fire"] }, { item: "timber", n: 2, opts: ["axGrain"] }, { item: "stone", n: 1, water: 0 }, { item: "log", n: 1, of: { dish: "tomYum", left: 1 } }, { item: "stone", n: 2, plus: 0 }]),
    ])());
    return { ...newPurse(), coins: c.int(0, 99), bag: stacks, gifts: { had, charms: [], owed: 0, familiar: null, used: {} }, ...(whole === undefined ? {} : { pouches: whole }) } as Purse;
  };
  const things: ItemId[] = [...MINE, ...WOODS, "minnow", "pick"];
  for (let i = 0; i < 420; i++) {
    const p = pouchPurse(), id = c.of(things);
    add("pouches_of", [p], pouchesOf(p).map(({ pouch, slots }) => ({ gift: pouch.gift, slots, holds: [...pouch.holds] })));
    add("held_in", [p, id], heldIn(p, id));
    add("room_in", [p, id], roomIn(p, id));
  }
  for (let i = 0; i < 520; i++) {
    // (what is put away and taken out is written back, so these are of purses whose pouches are kept as a document or not at all)
    const p = pouchPurse(c.maybe(0.6)), sane = p.pouches === undefined || p.pouches === null || (typeof p.pouches === "object" && !Array.isArray(p.pouches)) ? p : { ...p, pouches: {} };
    const id = c.of(things), room = roomIn(sane, id), has_ = heldIn(sane, id);
    if (room > 0) { const n = c.of([1, room, c.int(1, room), Math.min(room, 3)]); add("stow_away", [sane, id, n], stow(sane, id, n)); }
    if (has_ > 0) { const n = c.of([1, has_, c.int(1, has_)]); add("take_out", [sane, id, n], takeOut(sane, id, n)); }
    const many: Array<[ItemId, number]> = Array.from({ length: c.of([1, 2, 3]) }, () => [c.of(things), c.of([0, 1, 2, 5, 30, 200, 900])]);
    add("stow_all", [sane, many], stowAll(sane, many));
    const gift = c.maybe(0.9) ? c.of(GIFTS_ALL) : c.of(["thingBasket", "noSuchGift"]), slot = c.of<number | null>([0, 1, 2, 3, 4, 5, 9, -1, null]);
    add("pouch_to_bag", [sane, gift, slot], pouchToBag(sane, gift, slot as number));
    const from = c.maybe(0.9) ? c.int(0, sane.bag.length - 1) : c.of<number | null>([-1, 99, null]);
    add("bag_to_pouch", [sane, from], bagToPouch(sane, from as number));
  }

  /* ── the most a thing may be asked for ── */
  const knobs = [{ cap: SHOP.cap, capless: SHOP.capless }, { cap: 3, capless: 77 }];
  for (const id of ITEM_IDS) {
    add("dear_of", [id], dearOf(id));
    for (const k of knobs) {
      add("shop_cap", [id, k], stallCap(id, { ...SHOP, ...k }));
      add("notice_cap", [id, k], noticeCap(id, { ...NOTICES, ...k }));
    }
  }
  return out;
}

describe("the cases the database's rules are held to for the far side's base", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const own = vectorsBase(), all = [...own, ...vectorsPlain()];
    expect(JSON.stringify(vectorsBase())).toBe(JSON.stringify(own));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string } | null; return d === null ? "null" : d.ok ? "ok" : d.why; }))].sort();

    // what a tool carries: every level, options awake and asleep, a forging at home and away, names cut and tidied
    expect(new Set(of("tool_level").map((v) => v.want)).size).toBe(11);
    const mods = of("tool_mods").map((v) => v.want as { kind: string | null; opts: string[]; asleep: string[]; gems: Record<string, number>; glow: number });
    expect(mods.some((m) => m.kind === null) && mods.some((m) => m.opts.length === 3) && mods.some((m) => m.asleep.length > 0) && mods.some((m) => Object.values(m.gems).includes(2)) && mods.some((m) => Object.values(m.gems).includes(1))).toBe(true);
    expect(new Set(mods.map((m) => m.glow))).toEqual(new Set([0, 1, 2]));
    expect(mods.every((m) => !(m.opts.length && m.asleep.length))).toBe(true);
    expect(of("tool_away").some((v) => v.want === true) && of("tool_away").some((v) => v.want === false && typeof (v.args[0] as Stack | null)?.origin === "string")).toBe(true);
    expect(of("tool_origin").some((v) => v.want !== null && v.want !== (v.args[0] as Stack).item) && of("tool_origin").some((v) => v.want === null)).toBe(true);
    expect(of("tool_drawn").some((v) => (v.want as unknown[]).every((x) => x === null) && Array.isArray((v.args[0] as Stack | null)?.opts) && ((v.args[0] as Stack).opts as unknown[]).length > 0)).toBe(true);
    expect(of("tool_has").some((v) => v.want === true) && of("tool_has").some((v) => v.want === false)).toBe(true);
    expect(of("same_pool").filter((v) => v.want === true).length).toBe(TOOL_KINDS.length + 6);
    const named = of("tool_makers").flatMap((v) => v.want as Array<string | null>).filter((x): x is string => !!x);
    expect(named.every((x) => Array.from(x).length <= FORGE.maker && x === x.trim() && !/\s\s|[\t\n\r 　]/.test(x))).toBe(true);
    expect(named.some((x) => Array.from(x).length === FORGE.maker) && named.some((x) => /[ก-๙]/.test(x))).toBe(true);
    expect(of("gem_by").some((v) => v.want === v.args[3] && v.want === 1) && new Set(of("gem_by").map((v) => v.want)).size).toBeGreaterThan(8);
    // the hand: the slot remembered, the first of the kind when it is not, nothing held
    expect(of("hand_slot").some((v) => v.want === -1) && of("hand_slot").some((v) => v.want === 2 && v.args[1] === 2) && of("hand_slot").some((v) => v.want === 0 && v.args[1] === 5)).toBe(true);
    expect(of("hand_stack").some((v) => v.want === null) && of("hand_stack").some((v) => v.want !== null && (v.args[0] as Purse).handAt === 2 && JSON.stringify(v.want) === JSON.stringify((v.args[0] as Purse).bag[2]) && JSON.stringify(v.want) !== JSON.stringify((v.args[0] as Purse).bag[0]))).toBe(true);
    // what is counted
    expect(whys("use_power")).toEqual(["none", "ok", "spent"]);
    expect(of("power_used").some((v) => (v.want as number) > 0) && of("power_left").some((v) => v.want === 0) && of("may_power").some((v) => v.want === true) && of("may_power").some((v) => v.want === false)).toBe(true);
    expect(of("use_power").filter((v) => (v.want as { ok: boolean }).ok).some((v) => (v.want as { left: number }).left === 0)).toBe(true);
    // the pouches: both, one, none; filled before the bag, emptied after it; moved either way and refused each way
    const told = of("pouches_of").map((v) => v.want as Array<{ gift: string; slots: Array<Stack | null> }>);
    expect(new Set(told.map((t) => t.map((p) => p.gift).join("+")))).toEqual(new Set(["", GIFTS_ALL[0], GIFTS_ALL[1], GIFTS_ALL.join("+")]));
    expect(told.every((t) => t.every((p) => p.slots.length === POUCHES.find((x) => x.gift === p.gift)!.slots && p.slots.every((s) => !s || (POUCHES.find((x) => x.gift === p.gift)!.holds.includes(s.item) && s.n >= 1 && s.n <= ITEMS[s.item].stack))))).toBe(true);
    const stowed = of("stow_away").map((v) => ({ before: v.args[0] as Purse, id: v.args[1] as ItemId, n: v.args[2] as number, after: v.want as Purse }));
    expect(stowed.every((x) => heldIn(x.after, x.id) === heldIn(x.before, x.id) + x.n)).toBe(true);
    expect(stowed.some((x) => JSON.stringify(x.after.bag) === JSON.stringify(x.before.bag)) && stowed.some((x) => JSON.stringify(x.after.bag) !== JSON.stringify(x.before.bag) && JSON.stringify(x.after.pouches) !== JSON.stringify(x.before.pouches))).toBe(true);
    const taken = of("take_out").map((v) => ({ before: v.args[0] as Purse, id: v.args[1] as ItemId, n: v.args[2] as number, after: v.want as Purse }));
    expect(taken.every((x) => heldIn(x.after, x.id) === heldIn(x.before, x.id) - x.n)).toBe(true);
    expect(taken.some((x) => JSON.stringify(x.after.pouches) !== JSON.stringify(x.before.pouches)) && taken.some((x) => JSON.stringify(x.after.pouches) === JSON.stringify(x.before.pouches))).toBe(true);
    expect(of("stow_all").some((v) => v.want === null) && of("stow_all").some((v) => v.want !== null)).toBe(true);
    expect(whys("pouch_to_bag")).toEqual(["full", "none", "ok"]);
    expect(whys("bag_to_pouch")).toEqual(["full", "none", "ok"]);
    // the most a thing may be asked for: a gem's and a fragment's are their own, by any knobs; every other thing's is as it was
    const dear = new Set(Object.values(GEMS).flatMap((g) => [g.gem, g.chip]));
    expect(of("dear_of").filter((v) => v.want !== null).length).toBe(dear.size);
    for (const fn of ["shop_cap", "notice_cap"]) {
      expect(of(fn).length).toBe(ITEM_IDS.length * 2);
      for (const v of of(fn)) {
        const id = v.args[0] as ItemId, k = v.args[1] as { cap: number; capless: number };
        expect(v.want, `${fn} ${id}`).toBe(dear.has(id) ? (Object.values(GEMS).some((g) => g.gem === id) ? 100_000 : 10_000) : ITEMS[id].pays > 0 ? ITEMS[id].pays * k.cap : k.capless);
      }
    }
    expect(all.length).toBeGreaterThan(14_000);

    const dir = process.env.TOWN_VECTORS;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/vectors-base.json`, JSON.stringify(all));
      // (the catalog as the code has it: with the mountain's trees and rocks in it, lib/town/far-side)
      writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf()));
    }
  });
});
