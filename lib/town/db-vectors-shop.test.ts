import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ITEMS, type ItemId } from "./items";
import { shelfOf } from "./orders";
import { SHOP, alive, beat, buy, canOf, capOf, open, sell, told, toldOf, type Shop, type ShopAsk, type ShopLine } from "./shop";
import { newPurse, type Purse, type Stack } from "./trade";

/**
 * The cases the database's rules of a stall are held to (v142; lib/town/db-vectors-ground.test.ts is the same for
 * things dropped on the ground, and says how). Two kinds:
 *
 * - **rules**: each a function of the schema `town` with its arguments and what the code answers: a stall opened
 *   (lines that sell and that buy, too many, a thing twice, things not held, not met, not known, numbers that are no
 *   numbers, prices at and above their most, coins that do and do not cover what is wanted); a thing bought and a
 *   thing brought (a stall open, shut, none, one's own; from beside it and from too far; lines with and without so
 *   many left; keepers who still hold the things and who do not, with and without the coins and the room); how many
 *   of a line can change hands; and a stall as a comer is told it;
 * - **stories**: two members and a run of deeds, one after another (opening, buying, bringing, saying one is still
 *   there, shutting, and the clock put on, sometimes past a stall's quiet), each with what the code answers and
 *   what both purses hold and both are told after it: the dry run does the same through the functions a member calls.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-shop.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
interface After { coins: [number, number]; bags: [Purse["bag"], Purse["bag"]]; mine: [unknown, unknown]; seenBy: [unknown, unknown] }
type Step = { wait: number } & After & (
  | { deed: "open"; who: 0 | 1; ask: ShopAsk; at: [number, number]; want: { ok: boolean; why?: string } }
  | { deed: "buy"; who: 0 | 1; item: string; n: number; at: [number, number]; want: { ok: boolean; why?: string; coins?: number } }
  | { deed: "sell"; who: 0 | 1; item: string; n: number; at: [number, number]; want: { ok: boolean; why?: string; coins?: number } }
  | { deed: "beat"; who: 0 | 1; want: { ok: boolean } }
  | { deed: "close"; who: 0 | 1 }
  | { deed: "fill"; who: 0 | 1; give: number; bag: Purse["bag"] });
interface Story { coins: [number, number]; bags: [Purse["bag"], Purse["bag"]]; steps: Step[] }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

const THINGS: Stack[] = [
  { item: "kangkong", n: 7 }, { item: "kangkong", n: 20 }, { item: "kangkong", n: 13 }, { item: "minnow", n: 1 }, { item: "minnow", n: 19 }, { item: "worm", n: 12 },
  { item: "cabbage", n: 10 }, { item: "carp", n: 4 }, { item: "koi", n: 1 }, { item: "rod", n: 1 }, { item: "hoe", n: 1 }, { item: "boot", n: 2 },
  { item: "bucket", n: 1, water: 1 }, { item: "bucket", n: 1 }, { item: "can", n: 1, water: 0 }, { item: "can", n: 1, water: 6 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } },
];
const POOL: ItemId[] = ["kangkong", "minnow", "worm", "cabbage", "carp", "koi", "rod", "hoe", "boot", "bucket", "can", "potFull", "catfish", "pumpkin"];
/** What the village has met, in these cases: some of the pool, and the uncle's first shelf (which the database counts in by itself). */
const MET: ItemId[] = ["kangkong", "minnow", "cabbage", "carp", "koi", "boot", "bucket"];
const SEEN: ItemId[] = [...new Set<ItemId>([...MET, ...shelfOf(0)])].sort();
const HERE: [number, number] = [30, 40], NOW = Date.parse("2026-10-06T09:00:00+07:00");
const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"];
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const K = SHOP;

function pieces(c: ReturnType<typeof chance>) {
  const bag = (full: number, slots = 10) => Array.from({ length: slots }, () => (c.maybe(full) ? { ...c.of(THINGS) } : null));
  const purse = (full: number, coins = c.of([0, 3, 11, 40, 120, 600])): Purse => ({ ...newPurse(), coins, bag: bag(full, c.of([10, 10, 15])) });
  /** A line somebody might ask for: mostly sound, now and then wrong in one way. */
  const line = (p: Purse): ShopAsk[number] => {
    const held = p.bag.flatMap((s) => (s ? [s.item] : []));
    const kind = c.maybe(0.02) ? ("rent" as "sell") : c.maybe(0.55) ? "sell" : "buy";
    const item = c.maybe(0.02) ? ("notAThing" as ItemId) : kind === "sell" && held.length && c.maybe(0.9) ? c.of(held) : c.maybe(0.85) ? c.of(MET) : c.of(POOL);
    const most = item in ITEMS ? capOf(item) : 5;
    // (how many: mostly a few, of what is held when it is to be sold; a price: mostly one that may be asked)
    const have = p.bag.reduce((t, s) => t + (s && s.item === item && !s.of && !s.water ? s.n : 0), 0);
    const n = c.maybe(0.9) ? (kind === "sell" && have > 0 ? c.int(1, have) : c.of([1, 1, 2, 3, 5])) : c.of([12, 20, 200, 201, 0, -1, 1.5]);
    return { kind, item, n, price: c.maybe(0.9) ? c.int(1, most) : c.of([most, most + 1, 0, 2.5]) };
  };
  const ask = (p: Purse): ShopAsk => {
    const n = c.of([1, 1, 1, 2, 2, 2, 3, 3, 4, 6, 0, 7]), out: ShopAsk = [];
    for (let i = 0; i < n; i++) out.push(line(p));
    // (a thing named twice, now and then; else each once)
    return c.maybe(0.9) ? out.filter((l, i) => out.findIndex((x) => x.item === l.item) === i || c.maybe(0.1)) : out;
  };
  /** A stall that is open, of things its keeper holds and things the village has met. */
  const stall = (p: Purse, by: string, now: number): Shop | null => {
    for (let i = 0; i < 30; i++) { const did = open(p, by, ask(p), HERE, now, SEEN, K); if (did.ok) return did.shop; }
    return null;
  };
  return { bag, purse, ask, stall };
}

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(142), { purse, ask, stall } = pieces(c);
  for (let i = 0; i < 700; i++) {
    const p = purse(c.of([0.3, 0.7, 1])), a = ask(p), at: [number, number] = [c.int(0, 60), c.int(0, 60)], now = NOW + c.int(0, 99_999), seen = c.maybe(0.85) ? SEEN : MET.slice(0, c.int(0, MET.length));
    out.push({ fn: "shop_open", args: plain([p, WHO[0], a, at[0], at[1], now, seen, K]), want: plain(open(p, WHO[0], a, at, now, seen, K)) });
  }
  for (let i = 0; i < 1600; i++) {
    const keeper = purse(c.of([0.6, 0.9, 1])), opened = NOW + c.int(0, 9_999);
    let shop = stall(keeper, WHO[0], opened);
    if (!shop) continue;
    // (some of it gone already; its keeper heard from just now, a while ago, or too long ago)
    shop = { ...shop, lines: shop.lines.map((l) => ({ ...l, left: c.maybe(0.2) ? c.int(0, l.n) : l.left })), beat: opened + c.of([0, 0, 40_000, 149_999, 150_000, 400_000]), took: c.int(0, 50), paid: c.int(0, 50) };
    const now = opened + c.of([0, 1000, 60_000, 149_999, 150_000, 300_000, 549_999]);
    // (the keeper as they are now: as they were, or with things used and coins spent since)
    const theirs: Purse = c.maybe(0.7) ? keeper : { ...keeper, coins: c.of([0, 2, keeper.coins]), bag: keeper.bag.map((s) => (s && c.maybe(0.4) ? null : s)) };
    const mine = purse(c.of([0, 0.5, 0.9, 1]));
    const me = c.maybe(0.05) ? WHO[0] : WHO[1], l = c.of(shop.lines), kind = c.maybe(0.85) ? (l.kind === "sell" ? "shop_buy" : "shop_sell") : c.of(["shop_buy", "shop_sell"] as const);
    // (whoever comes to a line that wants a thing mostly has some of it)
    if (l.kind === "buy" && c.maybe(0.6)) mine.bag[0] = { item: l.item, n: Math.min(ITEMS[l.item].stack, c.int(1, 20)) };
    const item = c.maybe(0.92) ? l.item : c.of(POOL), n = c.of([1, 1, 1, 2, 3, 5, l.left, l.left + 1, 0, -2, 50]);
    const at: [number, number] = c.maybe(0.85) ? [HERE[0] + c.int(-K.reach, K.reach), HERE[1] + c.int(-K.reach, K.reach)] : [HERE[0] + c.of([K.reach + 1, -K.reach - 1, 0, 9]), HERE[1] + c.of([0, K.reach + 1, -K.reach - 1])];
    const kept = c.maybe(0.04) ? null : shop;
    out.push({ fn: kind, args: plain([mine, theirs, kept, me, item, n, at[0], at[1], now, K]), want: plain((kind === "shop_buy" ? buy : sell)(mine, theirs, kept, me, item, n, at, now, K)) });
    if (i % 4 === 0) {
      for (const line of shop.lines) out.push({ fn: "shop_can", args: plain([line, theirs]), want: canOf(line, theirs) });
      out.push({ fn: "shop_told_of", args: plain([kept, theirs, now, K]), want: plain(toldOf(kept, theirs, now, K)) });
      out.push({ fn: "shop_mine", args: plain([kept, now, K]), want: plain(told(kept, now, [], K).mine) });
    }
  }
  return out;
}

function story(seed: number): Story {
  const c = chance(seed), { bag, ask } = pieces(c);
  const purses: [Purse, Purse] = [{ ...newPurse(), coins: c.of([20, 60, 200]), bag: bag(0.8) }, { ...newPurse(), coins: c.of([5, 40, 150]), bag: bag(0.5) }];
  const first = { coins: [purses[0].coins, purses[1].coins] as [number, number], bags: [plain(purses[0].bag), plain(purses[1].bag)] as [Purse["bag"], Purse["bag"]] };
  const shops: [Shop | null, Shop | null] = [null, null];
  let now = NOW;
  const steps: Step[] = [];
  const after = (): After => ({
    coins: [purses[0].coins, purses[1].coins], bags: [plain(purses[0].bag), plain(purses[1].bag)],
    mine: [plain(told(shops[0], now, SEEN, K).mine), plain(told(shops[1], now, SEEN, K).mine)],
    // (each one's stall as the other is told it: its lines)
    seenBy: [plain(toldOf(shops[0], purses[0], now, K)?.lines ?? null), plain(toldOf(shops[1], purses[1], now, K)?.lines ?? null)],
  });
  for (let i = 0; i < 70; i++) {
    const who: 0 | 1 = c.maybe(0.5) ? 0 : 1, other = (1 - who) as 0 | 1;
    // (a little while goes by before each deed: mostly seconds, now and then longer than a stall stays open unheard from)
    const wait = c.maybe(0.93) ? c.int(500, 6_000) : c.int(K.quiet * 1000 - 5000, K.quiet * 1000 + 30_000);
    now += wait;
    if (i % 17 === 16) {
      purses[who] = { ...purses[who], coins: c.of([0, 30, 120]), bag: bag(0.7) };
      steps.push({ deed: "fill", who, wait, give: purses[who].coins, bag: plain(purses[who].bag), ...after() });
      continue;
    }
    const theirs = shops[other], r = c.next();
    if (r < 0.22 || (!shops[0] && !shops[1])) {
      // (mostly a stall that can be opened: asked for again until one is; now and then whatever was asked first)
      let a = ask(purses[who]);
      const at: [number, number] = [HERE[0] + who * 2, HERE[1]];
      if (c.maybe(0.85)) for (let k = 0; k < 30 && !open(purses[who], WHO[who], a, at, now, SEEN, K).ok; k++) a = ask(purses[who]);
      const did = open(purses[who], WHO[who], a, at, now, SEEN, K);
      if (did.ok) shops[who] = did.shop;
      steps.push({ deed: "open", who, ask: plain(a), at, wait, want: did.ok ? { ok: true } : { ok: false, why: did.why }, ...after() });
    } else if (r < 0.34) {
      const mine = shops[who], ok = !!mine && alive(mine, now, K);
      if (mine && ok) shops[who] = beat(mine, now);
      steps.push({ deed: "beat", who, wait, want: { ok }, ...after() });
    } else if (r < 0.37) {
      shops[who] = null;
      steps.push({ deed: "close", who, wait, ...after() });
    } else {
      // (at the other's stall, mostly a line it has; sometimes my own, by way of its keeper's id)
      const at: [number, number] = c.maybe(0.92) ? [HERE[0] + other * 2 + c.int(-2, 2), HERE[1] + c.int(-2, 2)] : [HERE[0] + 9, HERE[1]];
      const l: ShopLine | undefined = theirs?.lines.length ? c.of(theirs.lines) : undefined;
      const deed = l && c.maybe(0.9) ? (l.kind === "sell" ? "buy" : "sell") : c.of(["buy", "sell"] as const);
      const item = l && c.maybe(0.95) ? l.item : c.of(POOL), n = c.of([1, 1, 2, 3, 5, l?.left ?? 1, (l?.left ?? 1) + 1, 0]);
      // (the while that went by is the first deed's of the two, when a bag is filled first)
      let waited = false;
      // (whoever brings a thing mostly has some: put in their bag first, as a deed of its own)
      if (deed === "sell" && l && c.maybe(0.6)) {
        purses[who] = { ...purses[who], bag: [{ item: l.item, n: Math.min(ITEMS[l.item].stack, c.int(1, 12)) }, ...purses[who].bag.slice(1)] };
        steps.push({ deed: "fill", who, wait, give: purses[who].coins, bag: plain(purses[who].bag), ...after() });
        waited = true;
      }
      const did = (deed === "buy" ? buy : sell)(purses[who], purses[other], theirs, WHO[who], item, n, at, now, K);
      if (did.ok) { purses[who] = did.mine; purses[other] = did.theirs; shops[other] = did.shop; }
      steps.push({ deed, who, item, n, at, wait: waited ? 0 : wait, want: did.ok ? { ok: true, coins: did.coins } : { ok: false, why: did.why }, ...after() });
    }
  }
  return { ...first, steps };
}

describe("the cases the database's rules of a stall are held to", () => {
  it("are made the same every time: the rules, and stories of two who keep stalls and come to each other's", () => {
    const made = () => ({ knobs: K, met: MET, rules: rules(), stories: Array.from({ length: 30 }, (_, i) => story(1420 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(2500);
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => ((v.want as { ok?: boolean }).ok ? "ok" : (v.want as { why?: string }).why)));
    expect(whys("shop_open")).toEqual(new Set(["ok", "lines", "none", "amount", "dear", "coins"]));
    expect(whys("shop_buy")).toEqual(new Set(["ok", "amount", "shut", "own", "far", "gone", "coins", "full"]));
    expect(whys("shop_sell")).toEqual(new Set(["ok", "amount", "shut", "own", "far", "gone", "none", "short", "packed"]));
    const done = (fn: string) => all.rules.filter((v) => v.fn === fn && (v.want as { ok: boolean }).ok);
    expect(done("shop_open").length).toBeGreaterThan(60);
    expect(done("shop_buy").length).toBeGreaterThan(80);
    expect(done("shop_sell").length).toBeGreaterThan(30);
    // a stall that both sells and buys; nothing made or lost in any sale; a stall told as shut, and told with a line left out
    expect(done("shop_open").some((v) => { const lines = (v.want as { shop: Shop }).shop.lines; return lines.some((l) => l.kind === "sell") && lines.some((l) => l.kind === "buy"); })).toBe(true);
    for (const v of [...done("shop_buy"), ...done("shop_sell")]) {
      const w = v.want as { mine: Purse; theirs: Purse }, a = v.args as [Purse, Purse];
      expect(w.mine.coins + w.theirs.coins).toBe(a[0].coins + a[1].coins);
    }
    const tolds = all.rules.filter((v) => v.fn === "shop_told_of");
    expect(tolds.some((v) => v.want === null)).toBe(true);
    expect(tolds.some((v) => v.want !== null && (v.want as { lines: unknown[] }).lines.length < (v.args[0] as Shop).lines.length)).toBe(true);
    expect(new Set(all.rules.filter((v) => v.fn === "shop_can").map((v) => v.want)).size).toBeGreaterThan(5);
    // the stories: stalls opened and refused, things bought and brought, stalls gone quiet, and every refusal met
    const steps = all.stories.flatMap((s) => s.steps);
    const of = <D extends Step["deed"]>(d: D) => steps.filter((s): s is Extract<Step, { deed: D }> => s.deed === d);
    expect(of("open").filter((s) => s.want.ok).length).toBeGreaterThan(100);
    expect(of("open").some((s) => !s.want.ok)).toBe(true);
    expect(of("buy").filter((s) => s.want.ok).length).toBeGreaterThan(60);
    expect(of("sell").filter((s) => s.want.ok).length).toBeGreaterThan(25);
    const refused = new Set([...of("buy"), ...of("sell")].filter((s) => !s.want.ok).map((s) => s.want.why));
    for (const why of ["amount", "shut", "far", "gone", "coins", "full", "none", "packed"]) expect(refused).toContain(why);
    expect(of("beat").some((s) => s.want.ok) && of("beat").some((s) => !s.want.ok)).toBe(true);
    expect(steps.some((s) => s.mine[0] !== null && s.mine[1] !== null)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v142.json`, JSON.stringify(all)); }
  });
});
