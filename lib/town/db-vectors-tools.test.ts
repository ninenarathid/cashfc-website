import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { COOKING, ODD, RECIPE_IDS, cook, feastEat, needsOf, setDown, takeUp, takes, type Pot } from "./cooking";
import { SEEDS, beside, chore, choreFor, pourFor, sow, tend, water, type Bed, type Deed, type Plant, type Plot } from "./farm";
import { goldStrike, fightPaid, lulled, oddsOf, rarer, rodHaste, rodOf, strikeWindowOf, calledCast } from "./fishing";
import { PLAIN_ROD, canFx, cookFx, easedBy, hoeFx, luckOf, netFx, partOf, rodFx, slowPartOf, slowedBy } from "./forged";
import { toolOwed, toolPaid } from "./forged-keep";
import { hastened } from "./fountain";
import { gearOf } from "./gear";
import { BUGS, BUG_IDS, HAUNTS, HAUNT_KINDS, UNHUNTED, comeback, net, netMine, tierOf, type BugId, type Comeback, type Swarm } from "./insects";
import { BAITS, CROPS, DISHES, FISH, FISH_IDS, ITEMS, type CropId, type DishId, type ItemId } from "./items";
import { countsOf, type Done } from "./line-points";
import { usePower } from "./powers";
import { STAMINA, chew, dayOf, spend } from "./stamina";
import { BUILT, ELEMENTS, FORGE, OPTIONS, TOOL_KINDS, drawable, has, type Element, type OptionId, type ToolKind } from "./tools";
import { HOUR, handOf, heldStack, newPurse, put, type Purse, type Stack } from "./trade";
import { DRY } from "./weather";
import { BEDS_IN_FARM, bedCorner, rowOf } from "./world";

/**
 * The cases the database's rules of the seven older tools are held to (v174's tools part;
 * lib/town/db-vectors-gifts.test.ts says how such a file works). Each is a function of the schema `town` with its
 * arguments and what the code answers (.claude/skills/fc-cash-town/scripts/db/v174.tools.calls.json says which
 * function each name is). Two sorts:
 *
 * - **the helpers the part adds**: the cap (`eased_by`, `slowed_by`, `part_of`, `slow_part_of`), `luck_of`, the five
 *   readers (`rod_fx`, `hoe_fx`, `can_fx`, `net_fx`, `cook_fx`: every kind of tool at every plus, each option the
 *   registry's `BUILT` lists for it alone, each element alone below the top and at it, and many together; a forging
 *   moved into a fellow of its line; what is kept wrongly; and what is no such tool), `tool_owed`, `tool_paid`, and
 *   the rules of each game that a forged tool changes;
 * - **the rules that were there**, each asked with a forged tool where it used to be asked with a plain one, and
 *   with a plain one beside it: `strike_window`, `tend`, `water`, `sow`, `chore`, `chore_for`, `pour_for`, `net`,
 *   `net_mine`, `comeback`, `cook`, `set_down`, `take_up`, `feast_eat`, `chew`, `counts_of`.
 *
 * A meal's buff, a gift and better gear are in the cases with the tool, for the cap.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-tools.test.ts
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
const NOW = at("2026-10-12T10:00:00"), MIN = 60_000, DAY = 24 * HOUR;
const ME = "00000000-0000-0000-0000-000000000001", YOU = "00000000-0000-0000-0000-000000000002";
export const TOOLS_WORD = "tools-part";
const OLD: ToolKind[] = ["rod", "hoe", "can", "bugNet", "pot", "pan", "grill"];
const FRESH: Record<string, OptionId> = { rod: "rdFresh", hoe: "hoFresh", can: "cnFresh", bugNet: "ntFresh", pot: "ckFresh", pan: "ckFresh", grill: "ckFresh" };
const fxOf = (s: Stack | null) => (s?.item === "rod" ? rodFx(s) : s?.item === "hoe" ? hoeFx(s) : s?.item === "can" ? canFx(s) : s?.item === "bugNet" ? netFx(s) : cookFx(s));

export function vectorsTools(): Vector[] {
  const c = chance(20261010), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });

  /* ── stacks ── */
  /** A tool with one option at the milestone it is drawn at. */
  const withOpt = (kind: ToolKind, id: OptionId, plus = FORGE.top): Stack => {
    const opts = FORGE.milestones.map(() => "");
    opts[OPTIONS[id].pool === 2 ? FORGE.pools.indexOf(2) : 0] = id;
    return { item: kind as ItemId, n: 1, plus, opts };
  };
  const withGem = (kind: ToolKind, e: Element, plus: number): Stack => ({ item: kind as ItemId, n: 1, plus, gems: [e] });
  /** A tool forged at random: some plus, an option or none at each milestone (each once), a gem or none. */
  const forgedOf = (kind: ToolKind): Stack => {
    const plus = c.of([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10]), opts: string[] = [];
    FORGE.milestones.forEach((_, i) => {
      const pool = drawable(kind, FORGE.pools[i]).filter((id) => !opts.includes(id));
      opts.push(c.maybe(0.7) && pool.length ? c.of(pool) : "");
    });
    const s: Stack = { item: kind as ItemId, n: 1 };
    if (plus > 0 || c.maybe(0.3)) s.plus = plus;
    if (opts.some(Boolean)) s.opts = opts;
    if (c.maybe(0.6)) s.gems = [c.of(ELEMENTS)];
    if (c.maybe(0.2)) s.makers = ["Somebody", "", ""];
    return s;
  };
  const every: Stack[] = [];
  for (const kind of TOOL_KINDS) {
    for (let plus = 0; plus <= FORGE.top; plus++) every.push({ item: kind as ItemId, n: 1, plus });
    for (const id of BUILT[kind].opts) { every.push(withOpt(kind, id)); every.push(withOpt(kind, id, 2)); }
    for (const e of ELEMENTS) for (const plus of [0, 6, FORGE.top]) every.push(withGem(kind, e, plus));
    for (let i = 0; i < 60; i++) every.push(forgedOf(kind));
  }
  // (kept wrongly, moved, and what is no such tool)
  every.push(
    { item: "rod", n: 1, plus: 99 }, { item: "hoe", n: 1, plus: 2.7 }, { item: "can", n: 1, plus: -3 }, { item: "bugNet", n: 1, plus: 0, opts: [], gems: [] },
    { item: "rod", n: 1, plus: 10, opts: ["rdBait", "rdBait", "rdGold"] }, { item: "rod", n: 1, plus: 10, opts: ["rdGold", "rdBait", "rdCall"] }, { item: "rod", n: 1, opts: ["noSuch", "", "rdStill"] },
    { item: "pot", n: 1, plus: 4, gems: ["noSuch", "fire"] }, { item: "pan", n: 1, gems: ["fire", "dark"] },
    { item: "can", n: 1, plus: 10, opts: ["hoClear", "hoFirst", "hoWet"], origin: "hoe" }, { item: "hoe", n: 1, plus: 10, opts: ["cnDrop", "cnKind", "cnRain"], origin: "can", gems: ["dark"] },
    { item: "pan", n: 1, plus: 7, opts: ["ckFire", "ckBrisk", ""], origin: "pot", gems: ["ice"] }, { item: "grill", n: 1, plus: 10, opts: ["ckBase", "", "ckWarm"], origin: "pan" },
    { item: "rodTeak" as ItemId, n: 1, plus: 5, gems: ["fire"] }, { item: "canCopper" as ItemId, n: 1, plus: 5, opts: ["cnDrop", "", ""] }, { item: "hoeIron" as ItemId, n: 1, plus: 3 },
    { item: "potBrass" as ItemId, n: 1, plus: 10, gems: ["dark"] }, { item: "worm", n: 3 }, { item: "rod", n: 1 }, { item: "can", n: 1, water: 5 },
  );
  for (const s of every) {
    add("rod_fx", [s], rodFx(s)); add("hoe_fx", [s], hoeFx(s)); add("can_fx", [s], canFx(s)); add("net_fx", [s], netFx(s)); add("cook_fx", [s], cookFx(s));
  }
  for (const s of [null]) { add("rod_fx", [s], rodFx(s)); add("hoe_fx", [s], hoeFx(s)); add("can_fx", [s], canFx(s)); add("net_fx", [s], netFx(s)); add("cook_fx", [s], cookFx(s)); }

  /* ── the cap, and chance ── */
  const RESTS = [0.3, 0.34, 0.5, 0.76, 0.88, 1, 1.15, 1.2, 1.5, 2, 2.9, 3, 3.5, 6], MINES = [0.2, 0.33, 0.5, 0.55, 0.75, 0.85, 0.9, 1, 1.025, 1.1, 1.25, 1.5, 2, 3, 4];
  for (const rest of RESTS) for (const mine of MINES) {
    add("eased_by", [rest, mine], easedBy(rest, mine)); add("slowed_by", [rest, mine], slowedBy(rest, mine));
    add("part_of", [rest, mine], partOf(rest, mine)); add("slow_part_of", [rest, mine], slowPartOf(rest, mine));
  }
  for (const word of ["helping", "twin", "worm|3,4", "next|10,12", "worm|66,31", ""]) for (let i = 0; i < 40; i++) {
    const nums = Array.from({ length: c.int(0, 3) }, () => c.of([0, 1, 7, 42, c.int(0, 99999), NOW + c.int(0, DAY)]));
    add("luck_of", [word, nums], luckOf(word, ...nums));
  }

  /* ── purses ── */
  const buffsOf = (now: number): Purse["buffs"] | undefined => c.of<() => Purse["buffs"] | undefined>([() => undefined, () => undefined, () => [{ id: "hearty", level: c.int(1, 4), until: now + HOUR }],
    () => [{ id: "keen", level: c.int(1, 4), until: now + HOUR }, { id: "green", level: c.int(1, 4), until: now + HOUR }], () => [{ id: "hearty", level: 4, until: now - 1 }, { id: "calm", level: 2, until: now + HOUR }]])();
  /** A purse with some stacks in its first slots, something in the hand (by the slot), and what a deed reads beside. */
  const purseOf = (stacks: Array<Stack | null>, hand: number | null, now: number, more: Partial<Purse> = {}, slots = 12): Purse => {
    const bag: Purse["bag"] = Array.from({ length: Math.max(slots, stacks.length) }, (_, i) => stacks[i] ?? null), bf = buffsOf(now);
    return { ...newPurse(), bag, stamina: { day: dayOf(now), left: c.of([100, 100, 40, 3, 2, 1, 0]) }, ...(hand === null || !bag[hand] ? {} : { hand: bag[hand]!.item, ...(c.maybe(0.85) ? { handAt: hand } : {}) }),
      ...(bf ? { buffs: bf } : {}), ...more } as Purse;
  };
  /** How often the counted options of a kind have been used: none, some, all of some. */
  const powersOf = (kind: ToolKind, now: number): Purse["powers"] | undefined => {
    if (c.maybe(0.4)) return undefined;
    const kept: Record<string, { k: number; n: number }> = {};
    for (const id of BUILT[kind].opts) {
      const use = (OPTIONS[id] as { use?: { n: number; per: "day" | "meal" } }).use;
      if (!use || c.maybe(0.5)) continue;
      const used = usePower({ powers: {} }, withOpt(kind, id), id, now);
      const k = used.ok ? (used.purse.powers as Record<string, { k: number; n: number }>)[id].k : 0;
      kept[id] = { k: c.maybe(0.85) ? k : k - 1, n: c.of([0, 1, use.n - 1, use.n, use.n, use.n + 2]) };
    }
    return kept as Purse["powers"];
  };
  const owedOf = () => c.of<unknown>([undefined, undefined, 0, 0.3, 0.85, 0.999, 1, -0.2, "0.5", null]);
  const plain = (item: string, more: Partial<Stack> = {}): Stack => ({ item: item as ItemId, n: 1, ...more });

  /* ── what a tool pays ── */
  for (const owed of [undefined, 0, 0.5, 0.999, 1, 1.5, -0.2, "0.5", null, true]) add("tool_owed", [{ toolOwed: owed }], toolOwed({ toolOwed: owed } as never));
  for (let i = 0; i < 2400; i++) {
    const kind = c.of(OLD), now = NOW + c.int(0, 3) * DAY + c.int(0, DAY - 1), tool = c.maybe(0.9) ? forgedOf(kind) : plain(kind);
    const owed = owedOf(), powers = powersOf(kind, now);
    const before = purseOf([tool, plain("worm", { n: 3 })], 0, now, { ...(owed === undefined ? {} : { toolOwed: owed as number }), ...(powers ? { powers } : {}) });
    const after = spend(before, c.of([0, 1, 1, 2, 2, 3, 5]), now), fx = fxOf(tool), fresh = FRESH[kind];
    add("tool_paid", [before, after, now, tool, fx, fresh], toolPaid(before, after as Purse, now, tool, fx as { stamina: number; fresh: boolean }, fresh));
  }

  /* ── fishing ── */
  const rods = (): Array<Stack | null> => {
    const list: Array<Stack | null> = [];
    const n = c.int(0, 3);
    for (let i = 0; i < n; i++) list.push(c.of<() => Stack>([() => forgedOf("rod"), () => forgedOf("rod"), () => plain("rod"), () => plain("rodTeak"), () => plain("rodMaster"), () => plain("rod", { plus: c.int(1, 10) })])());
    list.push(plain(c.of(["floatFeather", "floatBell", "netSmall", "netLong", "worm", "hoe"])), c.maybe(0.5) ? plain(c.of(["netSmall", "netLong", "floatQuill", "boot"])) : null, plain("worm", { n: 5 }));
    return list.sort(() => c.next() - 0.5);
  };
  const fisher = (now: number): Purse => {
    const stacks = rods(), hand = c.maybe(0.75) ? c.int(0, stacks.length - 1) : null, powers = powersOf("rod", now), owed = owedOf();
    const still = c.of<unknown>([undefined, undefined, now + 5 * MIN, now - 1, now, "soon"]);
    return purseOf(stacks, hand, now, { ...(powers ? { powers } : {}), ...(owed === undefined ? {} : { toolOwed: owed as number }), ...(still === undefined ? {} : { rodStill: still as number }) });
  };
  for (let i = 0; i < 1500; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, DAY - 1), p = fisher(now), rod = rodOf(p), fx = rodFx(rod);
    add("rod_of", [p], rod);
    add("rod_held", [p], fx !== PLAIN_ROD ? rod : null);
    add("strike_window", [p, now], strikeWindowOf(p, now));
    add("rod_line", [p, fx], slowPartOf(gearOf(p.bag, handOf(p)).line, fx.line));
    // a fight paid for, and the water lulled
    const what = c.of([...FISH_IDS.slice(0, 40), "boot", "hyacinth"]), effort = what in FISH ? FISH[what as keyof typeof FISH].fight.effort : c.of([1, 2]);
    add("rod_fought", [p, spend(p, effort, now), rod, fx, what, now], lulled(fightPaid(p, effort, now), what as never, now));
    // a strike after the moment
    const late = c.of([0, 1, 1500, 2999, 3000, 3001, 9000, -1]);
    add("gold_strike", [p, rod, fx, late, now], goldStrike(p, late / 1000, now));
    // a line dropped: the wait a rod shortens, or a line that is bitten at once
    const drawn = c.int(3, 60), line = { what, wait: c.maybe(0.5) ? drawn : Math.max(1, Math.ceil(drawn * c.of([0.5, 0.8, 0.35]))), nibbles: c.of([[], [3], [4.5, 9]]), size: 12.5 };
    const haste = rodHaste(line.wait / Math.max(1, drawn), fx.quick), call = usePower(p, rod, "rdCall", now);
    add("rod_cast", [p, rod, fx, line, drawn, now], call.ok ? { purse: call.purse, line: calledCast(line) } : { purse: p, line: haste > 0 ? hastened(line, haste) : line });
  }
  for (const rest of [0.005, 0.01, 0.2, 0.34, 0.5, 0.8, 1, 1.5]) for (const quick of [0, 0.15, 0.5, 0.7, 0.9]) add("rod_haste", [rest, quick], rodHaste(rest, quick));
  for (const bait of BAITS) for (const hour of [6, 13, 21]) {
    const odds = oddsOf(bait, hour, hour === 13, false, hour === 21);
    for (const k of [0.5, 1, 1.2, 1.4, 1.8, 3]) add("rarer", [odds, k], rarer(odds, k));
  }
  add("rarer", [[], 1.4], rarer([], 1.4));

  /* ── the farm ── */
  const crop: CropId = (Object.keys(CROPS) as CropId[]).find((id) => CROPS[id].hours >= 8 && !CROPS[id].again) ?? (Object.keys(CROPS) as CropId[])[0];
  const again: CropId = (Object.keys(CROPS) as CropId[]).find((id) => !!CROPS[id].again) ?? crop;
  /** A plant sown a while ago, safe from pests: watered so long ago, by whom. */
  const plantOf = (now: number, by: string, wateredAgo: number | null, more: Partial<Plant> = {}, of: CropId = crop): Plant =>
    ({ by, crop: of, sown: now - 50 * MIN, boost: c.of([0, 0, 1_800_000]), watered: wateredAgo === null ? 0 : now - wateredAgo, fed: 0, guard: now + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...more });
  const cans = (): Array<Stack | null> => {
    const list: Array<Stack | null> = [], n = c.int(1, 3);
    for (let i = 0; i < n; i++) {
      const s = c.of<() => Stack>([() => forgedOf("can"), () => forgedOf("can"), () => forgedOf("can"), () => plain("can"), () => plain("canCopper"), () => plain("can", { plus: 10, opts: ["cnDrop", "cnThrift", c.of(["cnFull", "cnTwice", "cnRain"])], gems: [c.of(["dark", "fire", "earth"])] })])();
      const w = c.of([undefined, 0, 1, 2, 5, 8, 9, 12, 16, 22]);
      list.push(w === undefined ? s : { ...s, water: w });
    }
    if (c.maybe(0.3)) list.push(plain("hoe"));
    return list.sort(() => c.next() - 0.5);
  };
  const gardener = (now: number, stacks: Array<Stack | null>, kind: "can" | "hoe", want: string | null = null): Purse => {
    const idx = stacks.map((s, i) => (s && (want ? s.item === want : true) ? i : -1)).filter((i) => i >= 0);
    const hand = idx.length ? c.of(idx) : null, powers = powersOf(kind, now), owed = owedOf();
    const full = c.of<unknown>([undefined, undefined, undefined, now + 20 * MIN, now - 1, now]);
    const gifts = c.of<Purse["gifts"] | undefined>([undefined, undefined, undefined, { had: ["charmGloves"], charms: ["charmGloves"] } as Purse["gifts"]]);
    return purseOf(stacks, hand, now, { ...(powers ? { powers } : {}), ...(owed === undefined ? {} : { toolOwed: owed as number }), ...(full === undefined ? {} : { canFull: full as number }), ...(gifts ? { gifts } : {}) });
  };
  // watering: every sort of can in the bag and in the hand, on a plant dry, wet, wet twice over, somebody else's
  for (let i = 0; i < 2600; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, 8 * HOUR), stacks = cans(), p = gardener(now, stacks, "can", c.maybe(0.9) ? c.of(["can", "can", "can", "canCopper"]) : null), hand = handOf(p);
    const key = `${c.int(60, 66)},${c.int(30, 36)}`, by = c.of([ME, ME, YOU]), ago = c.of([null, 5 * MIN, 59 * MIN, 61 * MIN, 3 * HOUR]);
    const watered = ago === null ? 0 : now - ago, plant = plantOf(now, by, ago, c.of<Partial<Plant>>([{}, {}, { twice: watered }, { twice: watered - HOUR }]), c.of([crop, crop, again]));
    const plot: Plot = c.maybe(0.06) ? { soil: "tilled", plant: null } : { soil: "tilled", plant };
    add("water", [key, p, plot, hand, now], water(key, p, plot, hand, now));
    const bed: Bed | null = c.maybe(0.85) ? { by: c.of([ME, ME, YOU]), tended: now - HOUR, empty: 0 } : null;
    add("tend", [key, plot, bed, 2, 0, p, ME, now], tend(key, plot, bed ?? undefined, 2, 0, p, ME, now));
    add("kind_doc", [p, "water", plot, ME], (() => { const n = plot.plant && plot.plant.by !== ME ? canFx(heldStack(p)).kind : 0; return n > 0 ? { kind: n } : {}; })());
    // the well: whether a can is to be filled, and a filling
    const where = c.of<"well" | "river" | null>(["well", "well", "well", "river", null]), well = c.of([0, 1, 1, 2, 5, 40]);
    add("chore_for", [p, where, well], choreFor(p, where, well));
    add("chore", [p, where, well, now], chore(p, where, well, now));
  }
  // the hoe's work with every sort of hoe, on ground wild, cleared and tilled; and a seed sown in a furrow of each sort
  for (let i = 0; i < 2600; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, 8 * HOUR), hoe = c.of<() => Stack>([() => forgedOf("hoe"), () => forgedOf("hoe"), () => forgedOf("hoe"), () => plain("hoe"), () => plain("hoeIron"),
      () => plain("hoe", { plus: 10, opts: [c.of(["hoFresh", "hoFirst"]), "hoLight", c.of(["hoBoth", "hoGrip", "hoWet"])], gems: [c.of(["dark", "earth", "lightning"])] })])();
    const filler: Array<Stack | null> = c.maybe(0.15) ? Array.from({ length: 11 }, () => plain("boot")) : [plain("worm", { n: c.of([1, 20]) })];
    const stacks = [hoe, ...filler].sort(() => c.next() - 0.5), p = gardener(now, stacks, "hoe", hoe.item);
    const key = `${c.int(60, 66)},${c.int(30, 36)}`, plot: Plot = c.of<Plot>([{ soil: "wild", plant: null }, { soil: "cleared", plant: null }, { soil: "tilled", plant: null }, { soil: "tilled", plant: plantOf(now, ME, null) }]);
    const bed: Bed | null = c.maybe(0.8) ? { by: c.of([ME, ME, YOU]), tended: now - HOUR, empty: 0 } : null;
    const others = c.of([0, 2]);
    add("tend", [key, plot, bed, others, 0, p, ME, now], tend(key, plot, bed ?? undefined, others, 0, p, ME, now));
    const seed = c.of(SEEDS), damp = c.of<Plot>([{ soil: "tilled", plant: null, damp: true }, { soil: "tilled", plant: null, damp: true }, { soil: "tilled", plant: null }, { soil: "cleared", plant: null, damp: true }]);
    const sower = purseOf([plain(seed, { n: 3 })], c.maybe(0.9) ? 0 : null, now);
    add("sow", [sower, damp, handOf(sower), ME, now], sow(sower, damp, handOf(sower), ME, now));
    add("tend", [key, damp, bed, 0, 0, sower, ME, now], tend(key, damp, bed ?? undefined, 0, 0, sower, ME, now));
  }
  // the plots beside a deed's: a row of every sort, the deed done from one of its plots, by chance said and by the moment's own
  for (let i = 0; i < 2200; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, 8 * HOUR), b = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(b), y = by + c.int(0, 6), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`);
    const hoes = c.maybe(0.5), who = c.of([ME, ME, YOU]), plots: Record<string, Plot> = {};
    for (const k of keys) {
      if (c.maybe(0.25)) continue;
      plots[k] = hoes ? c.of<Plot>([{ soil: "wild", plant: null }, { soil: "cleared", plant: null }, { soil: "cleared", plant: null }, { soil: "tilled", plant: null }, { soil: "tilled", plant: plantOf(now, who, null) }])
        : c.of<Plot>([{ soil: "tilled", plant: plantOf(now, c.of([ME, YOU]), c.of([null, 10 * MIN, 2 * HOUR])) }, { soil: "tilled", plant: plantOf(now, who, null) }, { soil: "tilled", plant: null }]);
    }
    const tool = hoes ? c.of<() => Stack>([() => plain("hoe", { plus: c.int(0, 10), gems: ["lightning"] }), () => forgedOf("hoe"), () => plain("hoe")])()
      : c.of<() => Stack>([() => plain("can", { plus: c.int(0, 10), gems: ["lightning"], water: 9 }), () => plain("can", { plus: 10, opts: ["cnDrop", "cnKind", "cnRain"], gems: [c.of(["lightning", "dark", "fire"])], water: 9 }), () => ({ ...forgedOf("can"), water: 4 }), () => plain("can", { water: 5 })])();
    const before = gardener(now, [tool, plain("worm")], hoes ? "hoe" : "can", tool.item), key = c.maybe(0.9) ? c.of(keys) : "1,1";
    const deed: Deed = hoes ? c.of(["clear", "till"]) : c.maybe(0.9) ? "water" : "sow", after = spend(before, 1, now), owner = c.of<string | null>([ME, ME, YOU, null]);
    const luck = c.of<number | undefined>([undefined, undefined, 0, 0.05, 0.15, 0.25, 0.99]);
    add("beside", [key, keys, plots, deed, before, after, ME, now, owner, luck ?? null], beside(key, keys, plots, deed, before, after as Purse, ME, now, owner, DRY, luck));
    // the long pour's row, while a can's minutes run and while they do not
    add("pour_for", [key, keys, plots, before, ME, now, owner], pourFor(key, keys, plots, before, ME, now, owner));
  }
  // what a watering's deed says for the lines of work
  const deed = (what: string, doc: Record<string, unknown>): Done => ({ from: "deed", what, thing: "chili", n: 1, doc });
  for (const kind of [undefined, 0, 1, 2, 5, 1.7, 0.4, -1, "1", null]) for (const whose of [YOU, ME, undefined]) for (const what of ["water", "clear", "feed"]) {
    const d = deed(what, { ...(whose ? { whose } : {}), ...(kind === undefined ? {} : { kind }) });
    add("counts_of", [d, ME], countsOf(d, ME));
  }

  /* ── the insects ── */
  const START = at("2026-10-12T00:00:00");
  for (let i = 0; i < 2000; i++) {
    const h = c.of(HAUNTS), fit = BUG_IDS.filter((id) => BUGS[id].at.includes(h.kind)), bug = c.of(fit), now = START + c.int(0, 60) * HOUR + c.int(0, 59) * MIN + c.int(0, 59_999);
    const has: Swarm | null = c.maybe(0.04) ? null : { turn: c.int(1, 99999), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), seed: h.id * 100003 + 7 };
    const most = ITEMS[bug].stack ?? 1, exact = !!has && most > has.n && c.maybe(0.3);
    const tool = exact ? plain("bugNet", { plus: c.of([3, 10]), gems: ["lightning"] })
      : c.of<() => Stack>([() => forgedOf("bugNet"), () => forgedOf("bugNet"), () => forgedOf("bugNet"), () => plain("bugNet"), () => plain("bugNet", { plus: c.int(0, 10), gems: [c.of(["lightning", "earth"])], opts: ["ntFresh", "", ""] }), () => forgedOf("hoe")])();
    // (a bag with no room at all; one with room for exactly as many as the haunt has, and no more; one with some of the kind in it already)
    const filler: Array<Stack | null> = exact ? [plain(bug, { n: most - has!.n }), ...Array.from({ length: 10 }, () => plain("boot"))]
      : c.maybe(0.1) ? Array.from({ length: 11 }, () => plain("boot")) : c.maybe(0.2) ? [plain(bug, { n: c.int(1, 19) })] : [];
    const stacks = [tool, ...filler].sort(() => c.next() - 0.5), powers = powersOf("bugNet", now), owed = owedOf();
    const gifts = c.of<Purse["gifts"] | undefined>([undefined, undefined, { had: ["charmCloak"], charms: ["charmCloak"] } as Purse["gifts"]]);
    const purse = purseOf(stacks, c.maybe(0.95) ? stacks.indexOf(tool) : null, now, { ...(powers ? { powers } : {}), ...(owed === undefined ? {} : { toolOwed: owed as number }), ...(gifts ? { gifts } : {}),
      ...(c.maybe(0.5) ? { lured: { x: 20, y: 20, haunt: h.id, bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), from: now - 1000, until: now + 60_000, seed: 5 } } : {}),
      ...(c.maybe(0.5) ? { follower: { bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), at: [20, 20] as [number, number], until: now + 2000 } } : {}) });
    const shares = HAUNT_KINDS[h.kind].shares, taken = c.maybe(0.05) ? shares : 0, perch = c.of(h.perches);
    const tile: [number, number] = [Math.floor(perch.x) + c.int(-3, 3), Math.floor(perch.y) + c.int(-3, 3)], misses = c.of([0, 0, 1, 2, 5]), hand = handOf(purse);
    const lure = BUGS[bug].habit === "lure" ? c.of<ItemId | null>(["resin", "wildApple", null]) : null;
    add("net", [purse, h.id, has, taken, false, hand, tile[0], tile[1], misses, now, lure], net(purse, h, has, taken, false, hand, tile, misses, now, lure));
    const which = c.of(["lured", "pair"] as const), near: [number, number] = [20 + c.int(-2, 2), 20 + c.int(-2, 2)];
    add("net_mine", [purse, which, hand, near[0], near[1], misses, now], netMine(purse, which, hand, near, misses, now));
    const k = netFx(heldStack(purse)).rare;
    add("net_rarer", [purse], k > 1 ? k : null);
  }
  // what comes back after a catch, with the rare kinds weighing as a net has them
  const farmOrForest = HAUNTS.filter((_, i) => i % 3 === 0);
  for (let i = 0; i < 700; i++) {
    const h = c.of(farmOrForest), now = START + c.int(0, 200) * HOUR + c.int(0, 59) * MIN, r: [number, number, number] = [c.next(), c.next(), c.next()], k = c.of([1, 1.2, 1.4, 1.8]);
    const backs: Comeback[] = [];
    add("comeback_rarer", [h.id, now, backs, r[0], r[1], r[2], k, TOOLS_WORD], comeback(TOOLS_WORD, h, now, DRY, backs, r, UNHUNTED, k));
  }
  add("rare_kinds", [], BUG_IDS.filter((id: BugId) => tierOf(id) === "rare"));

  /* ── the kitchen ── */
  const one = RECIPE_IDS.filter((id) => { const t = takes(id); return t.cooks === 1 && t.in.length === 1 && ["pot", "pan", "grill"].includes(t.in[0]); });
  for (let i = 0; i < 2400; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, DAY - 1), id = c.of(one), ware = takes(id).in[0] as ToolKind, needs = needsOf(id);
    const tool = c.of<() => Stack>([() => forgedOf(ware), () => forgedOf(ware), () => forgedOf(ware), () => plain(ware), () => plain(ware, { plus: 10, opts: [c.of(["ckFresh", "ckBase"]), "ckBrisk", c.of(["ckBig", "ckWarm", "ckScent"])], gems: [c.of(["lightning", "dark", "earth"])] }),
      () => forgedOf(c.of(["pot", "pan", "grill"] as ToolKind[]))])();
    // (the things of the recipe, or of them one short: what is no recipe's comes to the odd dish in cookware)
    const things = c.maybe(0.8) ? needs : needs.slice(0, Math.max(1, needs.length - 1));
    const stacks: Array<Stack | null> = [tool, ...needs.map(([x, n]) => plain(x, { n: n + 1 })), ...(c.maybe(0.1) ? Array.from({ length: 12 }, () => plain("boot")) : [])];
    const powers = powersOf(ware, now), owed = owedOf();
    const p = purseOf(stacks, c.maybe(0.93) ? 0 : null, now, { ...(powers ? { powers } : {}), ...(owed === undefined ? {} : { toolOwed: owed as number }), ...(c.maybe(0.5) ? { made: [id] } : {}) }, 14);
    const crew: Array<ItemId | null> = [c.maybe(0.9) ? handOf(p) : c.of<ItemId | null>(["pot", "pan", null])], misses = c.of([0, 0, 1, 2, 9]);
    add("cook", [p, things, crew, misses, now], cook(p, things, crew, misses, now));
  }
  // a pot that carries something from its cookware: set down, taken up, eaten from at the table, and the helping eaten up
  const marks = () => c.of<Record<string, unknown>>([{}, {}, { warm: 2 }, { scent: 10 }, { warm: 2, scent: 10 }, { warm: 0, scent: -1 }, { warm: "2" }, { scent: 4.5, warm: 1.5 }]);
  const DISHES_COOKED = (Object.keys(DISHES) as DishId[]).filter((d) => DISHES[d].recipe);
  for (let i = 0; i < 900; i++) {
    const now = NOW + c.int(0, 2) * DAY + c.int(0, DAY - 1), dish = c.of([...DISHES_COOKED, ODD]), m = marks();
    const potFull = { item: "potFull" as ItemId, n: 1, of: { dish, left: c.of([1, 2, 5]) }, ...m } as Stack;
    const p = purseOf([plain("bowl"), potFull, c.maybe(0.3) ? plain("tok") : null], 1, now, {}, c.of([3, 6]));
    add("set_down", [p, 1, ME, [50, 50], "7"], setDown(p, 1, ME, [50, 50], "7"));
    const pot = { id: "9", by: c.of([ME, ME, YOU]), dish, left: c.of([0, 1, 3]), at: [50, 50] as [number, number], feast: c.maybe(0.8), set: now - 10 * MIN, ...marks() } as Pot;
    add("take_up", [p, pot, ME], takeUp(p, pot, ME));
    const seated = c.maybe(0.9);
    add("feast_eat", [p, pot, seated, now], feastEat(p, pot, seated, now));
    add("pot_marks", [m], (() => { const s = setDown(p, 1, ME, [50, 50], "7"); return s.ok ? { ...(s.pot.warm !== undefined ? { warm: s.pot.warm } : {}), ...(s.pot.scent !== undefined ? { scent: s.pot.scent } : {}) } : {}; })());
    // the helping, eaten: halfway, and to its end; with a buff of the dish's running already, and none
    const MEAL = STAMINA.minutes * MIN, from = now - c.of([0, MIN, MEAL - 1, MEAL, MEAL + MIN]), buff = DISHES[dish].buff;
    const buffs = c.of<() => Purse["buffs"] | undefined>([() => undefined, () => [], () => (buff ? [{ id: buff, level: c.int(1, 4), until: now + c.int(1, 170) * MIN }] : []), () => (buff ? [{ id: buff, level: c.int(1, 3), until: now + c.of([3.5, 4, 5]) * HOUR }] : []), () => [{ id: "hearty", level: 2, until: now + 40 * MIN }]])();
    const eater = { ...newPurse(), stamina: { day: dayOf(now), left: c.of([0, 40, 95]) }, meals: { day: dayOf(now), eaten: [false, true, false], bowls: [0, 1, 0] },
      eating: { dish, meal: 1 as const, from, till: from + c.of([0, 30_000]), got: c.of([0, 3.5]), ...(c.maybe(0.7) ? { lent: true } : {}), ...marks() }, ...(buffs === undefined ? {} : { buffs }) } as Purse;
    const company = c.of([0, 0, 2, 7]);
    add("chew", [eater, company, now], chew(eater, company, now));
  }
  void COOKING; void has;
  return out;
}

describe("the cases the database's rules of the seven older tools are held to", () => {
  it("are made the same every time, and reach what a forged tool changes in each game", () => {
    const all = vectorsTools(), of = (fn: string) => all.filter((v) => v.fn === fn);
    expect(JSON.stringify(vectorsTools())).toBe(JSON.stringify(all));
    const ok = (v: Vector) => !!v.want && (v.want as { ok?: boolean }).ok === true;
    // every reader answers its plain object for what is no such tool, and something else for one that is forged
    for (const fn of ["rod_fx", "hoe_fx", "can_fx", "net_fx", "cook_fx"]) {
      const plainOne = JSON.stringify(of(fn).find((v) => v.args[0] === null)!.want);
      expect(of(fn).filter((v) => JSON.stringify(v.want) === plainOne).length).toBeGreaterThan(500);
      expect(of(fn).filter((v) => JSON.stringify(v.want) !== plainOne).length).toBeGreaterThan(80);
    }
    // the cap is reached, and so is its other end
    expect(of("eased_by").some((v) => v.want === FORGE.cap)).toBe(true);
    expect(of("slowed_by").some((v) => v.want === 1 / FORGE.cap)).toBe(true);
    // a tool pays nothing, a share less, and with its counted option nothing at all
    const paid = of("tool_paid");
    expect(paid.some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[1]))).toBe(true);
    expect(paid.some((v) => typeof (v.want as Purse).toolOwed === "number" && (v.want as Purse).toolOwed! > 0)).toBe(true);
    expect(paid.some((v) => JSON.stringify((v.want as Purse).powers) !== JSON.stringify((v.args[1] as Purse).powers))).toBe(true);
    // fishing: a forged rod in the hand and only in the bag, a strike taken late, a line bitten at once, the water lulled
    expect(of("rod_held").filter((v) => v.want !== null).length).toBeGreaterThan(200);
    expect(of("rod_held").filter((v) => v.want === null).length).toBeGreaterThan(200);
    expect(of("gold_strike").filter((v) => v.want !== null).length).toBeGreaterThan(5);
    expect(of("rod_cast").some((v) => (v.want as { line: { wait: number } }).line.wait === 1 && (v.args[3] as { wait: number }).wait > 1)).toBe(true);
    expect(of("rod_fought").some((v) => typeof (v.want as Purse).rodStill === "number" && (v.want as Purse).rodStill !== (v.args[0] as Purse).rodStill)).toBe(true);
    expect(of("rarer").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0]))).toBe(true);
    // the farm: every answer of a watering, a plant watered twice in its hour, a can that waters with none, a filling of each sort
    const waters = of("water");
    for (const why of ["wet", "dry", "hand", "soil"]) expect(waters.some((v) => (v.want as { why?: string }).why === why), why).toBe(true);
    expect(waters.some((v) => ok(v) && typeof (v.want as { plot: Plot }).plot.plant!.twice === "number" && (v.want as { plot: Plot }).plot.plant!.twice === (v.args[4] as number))).toBe(true);
    expect(waters.some((v) => ok(v) && typeof (v.want as { purse: Purse }).purse.canFull === "number" && (v.want as { purse: Purse }).purse.canFull !== (v.args[1] as Purse).canFull)).toBe(true);
    expect(of("chore").filter((v) => ok(v) && (v.want as { chore: string }).chore === "fill").length).toBeGreaterThan(200);
    const tends = of("tend");
    expect(tends.some((v) => ok(v) && (v.want as { plot: Plot }).plot.damp === true)).toBe(true);
    expect(tends.some((v) => ok(v) && (v.want as { deed: string }).deed === "clear" && (v.want as { plot: Plot }).plot.soil === "tilled")).toBe(true);
    expect(tends.some((v) => ok(v) && (v.want as { got: unknown[] }).got.some((g) => (g as [string, number])[0] === "worm"))).toBe(true);
    expect(of("sow").some((v) => ok(v) && (v.want as { plot: Plot }).plot.plant!.watered === (v.args[4] as number))).toBe(true);
    const besides = of("beside");
    expect(besides.filter((v) => Object.keys((v.want as { plots: object }).plots).length === 1).length).toBeGreaterThan(40);
    expect(besides.filter((v) => Object.keys((v.want as { plots: object }).plots).length > 1).length).toBeGreaterThan(10);
    expect(of("counts_of").some((v) => JSON.stringify(v.want).includes('"raw":') && (v.args[0] as Done).doc.kind === 1 && (v.want as Array<{ raw: number }>)[0]?.raw > 1)).toBe(true);
    // the insects: a catch that brings one more, and one that pays less
    expect(of("net").filter(ok).length).toBeGreaterThan(600);
    expect(of("net").some((v) => ok(v) && (v.want as { got: Array<[string, number]> }).got[0][1] > (v.args[2] as Swarm).n)).toBe(true);
    expect(of("net_mine").some((v) => ok(v))).toBe(true);
    // (a catch with room for what the haunt has and not for one more, at a moment that would bring one more)
    expect(of("net").filter((v) => ok(v) && (v.args[0] as Purse).bag.some((b) => b?.item === (v.args[2] as Swarm).bug && b.n === (ITEMS[(v.args[2] as Swarm).bug as ItemId].stack ?? 1) - (v.args[2] as Swarm).n)
      && luckOf("twin", v.args[1] as number, (v.args[2] as Swarm).turn, v.args[9] as number) < netFx(heldStack(v.args[0] as Purse)).twin).length).toBeGreaterThan(5);
    expect(of("comeback_rarer").filter((v) => v.want !== null).length).toBeGreaterThan(100);
    // the kitchen: a dish with more helpings, a pot that carries each mark, a helping that gives each
    const cooks = of("cook");
    expect(cooks.filter(ok).length).toBeGreaterThan(1200);
    expect(cooks.some((v) => ok(v) && (v.want as { purse: Purse }).purse.bag.some((s) => s?.item === "potFull" && typeof s.warm === "number"))).toBe(true);
    expect(cooks.some((v) => ok(v) && (v.want as { purse: Purse }).purse.bag.some((s) => s?.item === "potFull" && typeof s.scent === "number"))).toBe(true);
    expect(of("feast_eat").some((v) => ok(v) && typeof (v.want as { purse: Purse }).purse.eating?.warm === "number")).toBe(true);
    expect(of("chew").some((v) => (v.want as { done: boolean }).done)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-tools.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  }, 240_000);
});
