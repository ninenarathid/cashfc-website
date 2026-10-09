import { describe, expect, it } from "vitest";
import { STOREBOX } from "./world";
import { stow, unstow, type Box } from "./box";
import { push, swap, type Deal } from "./deal";
import { pickUp, type Dropped } from "./ground";
import { ITEMS, type ItemId } from "./items";
import { drop as jarDrop, type Jar } from "./jar";
import { plain, takePlain } from "./notices";
import { forged, held, hold, leave, newPurse, plainStack, wholeStack, type Purse, type Stack } from "./trade";

/**
 * The cases the database's rules are held to for what a forged tool means to what was there already (carried from
 * branch smith-sql, where they were v164's "plain" part; they are part of v164's base now, and
 * lib/town/db-vectors-base.test.ts writes them out with its own: this file only makes them and says what they reach.
 * lib/town/db-vectors-gifts.test.ts says how such a file works). Each is a function of the schema `town` with its
 * arguments and what the code answers (.claude/skills/fc-cash-town/scripts/db/v164.base.calls.json says which):
 *
 * - `forged`: stacks with a plus of every sort (none, nothing, some, under nothing, no number), options and gems
 *   (none, an empty list, some), of tools and of what is no tool; and no stack at all;
 * - `plain`, `take_plain`: bags with tools as they were bought beside forged ones of the same kind, pots of food,
 *   cans and buckets with water and without, and plain things in more than one stack;
 * - `push`: stacks of every sort into bags with room, with one slot, with none: a forged tool into a slot of its own
 *   beside one of its kind, a tool as it was bought, a pot of food, a can, things that stack;
 * - `stow`, `unstow`: the same through the storage box, there and back, from near it and from too far;
 * - `ground_pick`: the same picked up off the ground;
 * - `swap`: a deal that carries a forged tool across, and comes back for want of a free slot;
 * - `jar_drop`: what the jar at the well takes and does not, a thing that carries something of its own among it;
 * - `leave`: a tool as it was bought left with the uncle, a forged one refused, at the usual price and at a moved one;
 * - `hold`: every slot of a bag and what is no slot: the slot is kept with the hand.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-base.test.ts      (which writes these with the base's own)
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
const NOW = Date.parse("2026-10-08T12:00:00+07:00");
const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002";
const TOOLS: ItemId[] = ["pick", "axe", "rod", "hoe", "can", "bugNet", "pot"];
const NEAR: [number, number] = [STOREBOX.x + 1, STOREBOX.y + 1], FAR: [number, number] = [STOREBOX.x + 9, STOREBOX.y];

export function vectorsPlain(): Vector[] {
  const c = chance(20261165), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  /** What a tool carries of its own: nothing, or something in one of the ways there are. */
  const own = (): Partial<Stack> => c.of<() => Partial<Stack>>([
    () => ({}), () => ({}), () => ({ plus: c.int(1, 10) }), () => ({ plus: c.int(1, 10), opts: ["pkPeek"] }), () => ({ plus: 10, opts: ["axGrain", "axDry", "axOne"], gems: ["fire"] }), () => ({ gems: ["wind"] }),
    () => ({ opts: ["", "pkCrumb"] }), () => ({ plus: 0 }), () => ({ plus: 0, opts: [], gems: [] }), () => ({ plus: 3, gems: [] }),
  ])();
  /** A stack of any sort: a tool (forged or not), a pot of food, a can or a bucket with water or none, a plain thing. */
  const any = (): Stack => c.of<() => Stack>([
    () => ({ item: c.of(TOOLS), n: 1, ...own() }), () => ({ item: c.of(TOOLS), n: 1, ...own() }), () => ({ item: "pick", n: 1, ...own() }), () => ({ item: "pick", n: 1 }),
    () => ({ item: "potFull", n: 1, of: { dish: c.of(["tomYum", "friedMinnow"] as const), left: c.int(1, 4) } }), () => ({ item: "can", n: 1, water: c.int(0, 8), ...own() }), () => ({ item: "bucket", n: 1, water: c.of([0, 1]) }),
    () => ({ item: c.of<ItemId>(["minnow", "timber", "oreCopper", "gemRuby", "rice", "bowl"]), n: c.int(1, 9) }), () => ({ item: "minnow", n: c.int(1, 30) }),
  ])();
  const bagOf = (slots: number, fill: number): Purse["bag"] => Array.from({ length: slots }, () => (c.maybe(fill) ? any() : null));
  const purseOf = (slots = c.of([6, 10]), fill = c.of([0.4, 0.8, 1])): Purse => ({ ...newPurse(), coins: c.int(0, 500), bag: bagOf(slots, fill) });

  // a thing that carries something of its own
  const odd: unknown[] = [null, { item: "pick", n: 1 }, { item: "pick", n: 1, plus: 0 }, { item: "pick", n: 1, plus: 1 }, { item: "pick", n: 1, plus: -2 }, { item: "pick", n: 1, plus: 0.5 }, { item: "pick", n: 1, plus: null },
    { item: "pick", n: 1, opts: [] }, { item: "pick", n: 1, opts: [""] }, { item: "pick", n: 1, opts: ["pkPeek"] }, { item: "pick", n: 1, opts: null }, { item: "pick", n: 1, gems: [] }, { item: "pick", n: 1, gems: ["fire"] }, { item: "pick", n: 1, gems: null },
    { item: "minnow", n: 3, plus: 2 }, { item: "minnow", n: 3 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }, { item: "can", n: 1, water: 5 }, { item: "can", n: 1, water: 5, plus: 4 }];
  for (const s of odd) add("forged", [s], forged(s as Stack | null));
  for (let i = 0; i < 160; i++) { const s = any(); add("forged", [s], forged(s)); }

  // counted and taken as plain things
  for (let i = 0; i < 420; i++) {
    const bag = bagOf(c.of([6, 10]), c.of([0.6, 1])), ids = [...new Set(bag.filter((s): s is Stack => !!s).map((s) => s.item))];
    const id = c.maybe(0.9) && ids.length ? c.of(ids) : c.of<ItemId>(["pick", "minnow", "hoe"]);
    add("plain", [bag, id], plain(bag, id));
    const has = plain(bag, id);
    if (has > 0) { const n = c.int(1, has); add("take_plain", [bag, id, n], takePlain(bag, id, n)); }
  }
  // (a forged pick between two that are as they were bought: the forged one is passed over, wherever it stands)
  for (const at of [0, 1, 2]) for (const n of [1, 2]) {
    const bag: Purse["bag"] = [0, 1, 2].map((i) => (i === at ? { item: "pick" as ItemId, n: 1, plus: 5, gems: ["ice"] } : { item: "pick" as ItemId, n: 1 }));
    add("plain", [bag, "pick"], plain(bag, "pick"));
    add("take_plain", [bag, "pick", n], takePlain(bag, "pick", n));
  }

  // moved whole, into a slot of its own
  for (let i = 0; i < 520; i++) {
    const into = bagOf(c.of([4, 8]), c.of([0, 0.5, 0.85, 1])), stacks = Array.from({ length: c.of([1, 1, 2, 3]) }, () => any());
    add("push", [into, stacks], push(into, stacks));
  }
  for (const free of [0, 1, 2]) for (const s of [{ item: "pick", n: 1, plus: 7, opts: ["pkPeek", "pkCrumb"], gems: ["dark"] }, { item: "pick", n: 1 }, { item: "can", n: 1, water: 0, plus: 2 }] as Stack[]) {
    const into: Purse["bag"] = [{ item: "pick", n: 1 }, { item: "pick", n: 1, plus: 2 }, ...Array<null>(free).fill(null)];
    add("push", [into, [s]], push(into, [s]));
    add("push", [into, [s, s]], push(into, [s, s]));
  }
  // the storage box, there and back
  for (let i = 0; i < 360; i++) {
    const p = purseOf(), box: Box = { things: bagOf(10, c.of([0, 0.5, 1])), more: 0 };
    const slot = c.maybe(0.9) ? c.int(0, p.bag.length - 1) : c.of([-1, 99]), n = c.of([1, 1, 1, p.bag[slot]?.n ?? 1, 2, 0]), at = c.maybe(0.9) ? NEAR : FAR;
    add("stow", [p, box, slot, n, at[0], at[1]], stow(p, box, slot, n, at));
    const from = c.maybe(0.9) ? c.int(0, 9) : c.of([-1, 99]), m = c.of([1, 1, 1, box.things[from]?.n ?? 1, 0]);
    add("unstow", [p, box, from, m, at[0], at[1]], unstow(p, box, from, m, at));
  }
  // picked up off the ground
  for (let i = 0; i < 200; i++) {
    const p = purseOf(c.of([4, 8]), c.of([0, 0.6, 1])), d: Dropped = { id: i + 1, by: B, stack: any(), at: [20, 20], until: NOW + c.of([5000, 5000, -1]) };
    const at: [number, number] = c.maybe(0.9) ? [20, 21] : [29, 29];
    add("ground_pick", [p, d, at[0], at[1], NOW], pickUp(p, d, at, NOW));
  }
  // a deal that carries a forged tool across
  for (let i = 0; i < 200; i++) {
    const tool: Stack = { item: "pick", n: 1, plus: c.int(1, 10), ...(c.maybe(0.5) ? { opts: ["pkPeek"] } : {}), ...(c.maybe(0.5) ? { gems: ["earth"] } : {}) };
    const pa: Purse = { ...newPurse(), coins: 50, bag: [tool, c.maybe(0.5) ? { item: "pick", n: 1 } : null, { item: "minnow", n: 4 }, ...bagOf(3, 0.5)] };
    const pb: Purse = { ...newPurse(), coins: 80, bag: [{ item: "timber", n: 9 }, ...bagOf(c.of([1, 4]), c.of([0, 0.6, 1]))] };
    const deal: Deal = { a: A, b: B, names: { a: "Member One", b: "Member Two" }, at: NOW, give: { a: [["pick", c.of([1, 1, 2])]], b: c.of<Array<[ItemId, number]>>([[], [["timber", 3]]]) }, coins: { a: 0, b: c.of([0, 30]) }, ok: { a: true, b: true } } as Deal;
    add("swap", [deal, pa, pb], swap(deal, pa, pb));
  }

  // the jar at the well
  const jar: Jar = { round: 5, coins: 2, things: [["minnow", 1]] };
  for (let i = 0; i < 220; i++) {
    const p = purseOf(), slot = c.maybe(0.9) ? c.int(0, p.bag.length - 1) : c.of([-1, 99]);
    add("jar_drop", [p, jar, { slot, n: c.of([1, 1, p.bag[slot]?.n ?? 1, 0]) }], jarDrop(p, jar, { slot, n: c.of([1]) }));
  }
  // (jar_drop's number was drawn twice above: answered again as it was asked)
  for (const v of out) if (v.fn === "jar_drop") v.want = JSON.parse(JSON.stringify(jarDrop(v.args[0] as Purse, v.args[1] as Jar, v.args[2] as { slot: number; n: number })));
  // (a thing of a kind the jar takes that carries something of its own: there is none in the game, and the rule says no all the same)
  for (const s of [{ item: "minnow", n: 3, plus: 1 }, { item: "minnow", n: 3, gems: ["fire"] }, { item: "minnow", n: 3, opts: ["pkPeek"] }, { item: "minnow", n: 3 }, { item: "minnow", n: 3, plus: 0 }] as Stack[]) {
    const p: Purse = { ...newPurse(), bag: [s, null] };
    add("jar_drop", [p, jar, { slot: 0, n: 1 }], jarDrop(p, jar, { slot: 0, n: 1 }));
  }
  add("jar_drop", [{ ...newPurse(), coins: 9 }, jar, { coins: 4 }], jarDrop({ ...newPurse(), coins: 9 }, jar, { coins: 4 }));

  // left with the uncle
  for (let i = 0; i < 320; i++) {
    const p = purseOf(), slot = c.maybe(0.9) ? c.int(0, p.bag.length - 1) : c.of<number | null>([-1, 99, null]), n = c.of<number | null>([1, 1, 1, p.bag[slot as number]?.n ?? 1, 2, 0, null]), f = c.of([100, 100, 80, 120]);
    add("leave", [p, slot, n, NOW, f], leave(p, slot as number, n as number, NOW, f));
  }
  for (const item of TOOLS) for (const more of [{}, { plus: 1 }, { opts: ["pkPeek"] }, { gems: ["fire"] }, { plus: 0 }] as Array<Partial<Stack>>) {
    const p: Purse = { ...newPurse(), bag: [{ item, n: 1, ...more } as Stack, null] };
    add("leave", [p, 0, 1, NOW, 100], leave(p, 0, 1, NOW, 100));
  }

  // the hand, and the slot it was taken up from
  for (let i = 0; i < 200; i++) {
    const p: Purse = { ...purseOf(), ...(c.maybe(0.4) ? { hand: "pick" as ItemId, handAt: c.int(0, 5) } : {}) }, slot = c.maybe(0.9) ? c.int(0, p.bag.length - 1) : c.of<number | null>([-1, 99, null]);
    add("hold", [p, slot], hold(p, slot as number));
  }
  return out;
}

describe("the cases the database's rules are held to for a forged tool among what was there", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsPlain();
    expect(JSON.stringify(vectorsPlain())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => [...new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string } | null; return d === null ? "null" : d.ok ? "ok" : d.why; }))].sort();
    for (const fn of ["forged", "plain", "take_plain", "push", "stow", "unstow", "ground_pick", "swap", "jar_drop", "leave", "hold"]) expect(of(fn).length, fn).toBeGreaterThan(20);
    expect(of("forged").some((v) => v.want === true) && of("forged").some((v) => v.want === false && (v.args[0] as Stack | null)?.plus === 0)).toBe(true);
    // a forged tool is not counted among the plain ones of its kind, and is passed over when they are taken
    const counted = of("plain").map((v) => ({ bag: v.args[0] as Purse["bag"], id: v.args[1] as ItemId, n: v.want as number }));
    expect(counted.some((x) => x.n < held(x.bag, x.id) && x.bag.some((s) => s?.item === x.id && forged(s))) && counted.some((x) => x.n > 0 && x.n === held(x.bag, x.id))).toBe(true);
    const taken = of("take_plain").map((v) => ({ bag: v.args[0] as Purse["bag"], id: v.args[1] as ItemId, after: v.want as Purse["bag"] }));
    expect(taken.every((x) => x.bag.every((s, i) => !s || plainStack(s) || JSON.stringify(x.after[i]) === JSON.stringify(s)))).toBe(true);
    expect(taken.some((x) => x.bag.some((s) => s?.item === x.id && forged(s)))).toBe(true);
    // moved whole: every forged tool that went in is in a slot of its own, as it was; and refused for want of one
    const pushed = of("push").map((v) => ({ into: v.args[0] as Purse["bag"], stacks: v.args[1] as Stack[], after: v.want as Purse["bag"] | null }));
    expect(pushed.some((x) => x.after === null && x.stacks.some(forged)) && pushed.some((x) => x.after !== null && x.stacks.some(forged))).toBe(true);
    expect(pushed.filter((x) => x.after !== null).every((x) => x.stacks.filter(wholeStack).every((s) => x.after!.filter((b) => JSON.stringify(b) === JSON.stringify(s)).length >= x.into.filter((b) => JSON.stringify(b) === JSON.stringify(s)).length + 1))).toBe(true);
    expect(whys("stow")).toEqual(["amount", "far", "none", "ok", "packed"]);
    expect(whys("unstow")).toEqual(["amount", "far", "full", "none", "ok"]);
    const stowed = of("stow").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ s: (v.args[0] as Purse).bag[v.args[2] as number]!, box: (v.want as { box: Box }).box }));
    expect(stowed.some((x) => forged(x.s) && x.box.things.some((b) => JSON.stringify(b) === JSON.stringify(x.s)))).toBe(true);
    expect(whys("ground_pick")).toEqual(["far", "full", "lost", "ok"]);
    expect(whys("swap")).toEqual(["full", "none", "ok"]);
    const dealt = of("swap").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ a: v.args[1] as Purse, b: (v.want as { b: Purse }).b }));
    expect(dealt.length).toBeGreaterThan(20);
    expect(dealt.every((x) => x.b.bag.some((s) => !!s && s.item === "pick" && forged(s) && JSON.stringify(s) === JSON.stringify(x.a.bag[0])) || x.b.bag.some((s) => s?.item === "pick"))).toBe(true);
    // refused as unwanted: by the jar, and by the uncle
    expect(whys("jar_drop")).toEqual(["amount", "none", "ok", "unwanted"]);
    expect(of("jar_drop").some((v) => { const p = v.args[0] as Purse, w = v.args[2] as { slot?: number }; return w.slot === 0 && p.bag[0]?.item === "minnow" && forged(p.bag[0]) && (v.want as { why?: string }).why === "unwanted"; })).toBe(true);
    expect(whys("leave")).toEqual(["amount", "none", "ok", "unwanted"]);
    const left = of("leave").map((v) => ({ s: (v.args[0] as Purse).bag[v.args[1] as number] ?? null, n: v.args[2] as number, d: v.want as { ok: boolean; why?: string } }));
    expect(left.some((x) => x.s && forged(x.s) && ITEMS[x.s.item].pays > 0 && x.n === 1 && x.d.why === "unwanted") && left.some((x) => x.s && !forged(x.s) && ITEMS[x.s.item].kind === "tool" && x.d.ok)).toBe(true);
    expect(left.every((x) => !(x.s && forged(x.s) && x.d.ok))).toBe(true);
    // the slot is kept with the hand
    expect(whys("hold")).toEqual(["none", "ok"]);
    expect(of("hold").filter((v) => (v.want as { ok: boolean }).ok).every((v) => (v.want as { purse: Purse }).purse.handAt === v.args[1] && (v.want as { purse: Purse }).purse.hand === (v.args[0] as Purse).bag[v.args[1] as number]!.item)).toBe(true);
  });
});
