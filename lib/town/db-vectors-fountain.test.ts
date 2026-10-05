import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cook } from "./cooking";
import { chore, sow, water, type Plot } from "./farm";
import { BLESSINGS, WISHES, WISHING, blessed, blessingsOf, dawned, firstGoal, goalOf, hastened, newFountain, tidyNote, toss, type Fountain, type WishId, type Wishing } from "./fountain";
import { BUFFS, type BuffId, type ItemId } from "./items";
import { buffOf, buffsOf, costOf, hasBuff } from "./stamina";
import { newPurse, type Purse, type Stack } from "./trade";

/**
 * The cases the database's fountain is held to (v123), made as lib/town/db-vectors makes the others': each is a rule
 * of lib/town/fountain, or one of another file's that a blessing changes, what it was asked, and what the site's own
 * code answered. The dry run puts every one to the SQL and wants the same answer back.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-fountain.test.ts     writes vectors-v123.json
 *
 * They are kept apart from lib/town/db-vectors so that the fountain's can be made again without the rest.
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

/** Chance that is the same every time (mulberry32). */
function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), of: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)], maybe: (p: number) => next() < p };
}

const at = (s: string) => Date.parse(`${s}+07:00`);
const PEOPLE = ["a", "b", "c", "d", "e", "f"];
const MEALS = Object.keys(BUFFS) as BuffId[];
const KNOBS: Wishing[] = [
  WISHING,
  { ...WISHING, share: 0.1, least: 20 },
  { ...WISHING, rounds: 1, more: 3, hours: 1 },
  { ...WISHING, people: 2, within: 10, counts: 2 },
  { ...WISHING, rounds: 5, more: 1.5, people: 4, counts: 1.25, least: 7 },
];
/** What v123's own list has: the forest's two are put on it by their own file, v125, which holds the list to all of them. */
const V123 = WISHES.filter((w) => w !== "forage" && w !== "net");
const bagOf = (stacks: Stack[]): Purse["bag"] => [...stacks, ...Array<null>(10).fill(null)].slice(0, 10);

export function vectorsV123(): Vector[] {
  const c = chance(20261005), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  add("wishes", [], V123);
  for (const k of KNOBS) for (const supply of [-10, 0, 1, 16, 17, 50, 1_369, 3_333, 3_334, 49_999, 50_000, 123_456.5, 2_000_000]) add("first_goal", [supply, k], firstGoal(supply, k));

  // the fountain as a village leaves it: some days of tossing, by a few people, now alone and now together
  const states: Array<{ f: Fountain; now: number; k: Wishing }> = [];
  for (let run = 0; run < 60; run++) {
    const k = c.of(KNOBS);
    let f = newFountain(), now = at("2026-10-05T05:00:00") + c.int(0, 20) * 3_600_000 + c.int(0, 3_599_999);
    for (let i = 0, n = c.int(5, 60); i < n; i++) {
      // (a few seconds on, a few minutes, some hours, or into another day)
      now += c.of([c.int(0, 15_000), c.int(0, 15_000), c.int(20_000, 90_000), c.int(1, 40) * 60_000, c.int(1, 5) * 3_600_000, c.int(8, 30) * 3_600_000]);
      const me = c.of(PEOPLE), purse: Purse = { ...newPurse(), coins: c.of([0, 1, 5, 40, 250, 5_000]) };
      const wish = c.maybe(0.03) ? ("rain" as WishId) : c.of(V123), coins = c.maybe(0.05) ? c.of([0, -2, 1.5]) : c.of([1, 1, 2, 3, 7, 10, 25, 60, 150, 800, 6_000]);
      const supply = c.of([0, 900, 1_369, 12_000, 80_000]);
      states.push({ f, now, k });
      add("goal_of", [f, k], goalOf(f, k));
      add("dawned", [f, now, supply, k], dawned(f, now, supply, k));
      const who = c.of(PEOPLE);
      add("blessings_of", [f, who, now], blessingsOf(f, who, now));
      const did = toss(purse, f, me, wish, coins, now, supply, k);
      add("toss", [purse, f, me, wish, coins, now, supply, k], did);
      if (did.ok) f = did.fountain;
    }
  }

  // a purse read with the fountain as it stands; and what the rules then make of the buffs it has
  for (let i = 0; i < 400; i++) {
    const { f, now: was } = c.of(states), now = was + c.of([0, 1, 60_000, 3_600_000, 3 * 3_600_000, 5 * 3_600_000]);
    const me = c.of(PEOPLE);
    const kept: Purse = {
      ...newPurse(), coins: c.int(0, 99),
      buff: c.maybe(0.5) ? null : { id: c.of(MEALS), until: now + c.int(-2, 2) * 3_600_000 + c.int(0, 999) },
      // (what a purse may have been kept with: nothing, a blessing that has ended, one that has not)
      ...(c.maybe(0.3) ? { blessed: [{ id: c.of(V123), until: now + c.int(-2, 2) * 3_600_000 + c.int(1, 999) }] } : {}),
    };
    const p = blessed(kept, f, me, now);
    add("blessed", [kept, f, me, now], p);
    add("buff_of", [p, now], buffOf(p, now));
    for (const id of V123) add("has_buff", [p, now, id], hasBuff(p, now, id));
    const one = c.of(V123);
    add("has_buff", [kept, now, one], hasBuff(kept, now, one));
    const n = c.of([0, 1, 2, 3, 4, 5, 7, 12, 2.5]);
    add("cost_of", [p, n, now], costOf(p, n, now));
    if (i < 3) expect(buffsOf(p, now).length).toBeLessThanOrEqual(V123.length);
  }

  // a line dropped under the swift blessing: the bite and the twitches before it come sooner
  for (let i = 0; i < 120; i++) {
    const wait = c.int(1, 120), by = c.of([BLESSINGS.swift.by, BLESSINGS.swift.by, 0.25, 0.5, 0]);
    const line = { what: c.of(["minnow", "catfish", "koi", "boot"]), wait, size: c.int(0, 90), nibbles: Array.from({ length: c.int(0, 3) }, () => c.int(1, Math.max(1, wait - 1))).sort((x, y) => x - y) };
    add("hastened", [line, by], hastened(line, by));
  }

  // a wish's words, as they are kept
  for (const text of ["", " ", "   ", "plain", "  two  words ", "tab\tand\nline", "a\u0001b\u001fc\u007fd", "ขอให้เคลียร์  savage สัปดาห์นี้", "ก".repeat(79), "ก".repeat(80), "ก".repeat(81),
    "🐟".repeat(80), "🐟".repeat(81), " " + "x".repeat(80) + " ", "x".repeat(40) + "  " + "y".repeat(39), "x".repeat(40) + " " + "y".repeat(40), "<b>bold</b> & \"quoted\" 'single'", "50% off; drop table --"]) {
    add("tidy_note", [text], tidyNote(text));
  }
  add("tidy_note", [null], tidyNote(null));

  // the rules a blessing changes, with it and without: a seed sown, a plant watered, a pot cooked
  const NOON = at("2026-10-05T12:00:00"), HOUR = 3_600_000;
  const having = (ids: WishId[], bag: Stack[], hand: ItemId | null, more: Partial<Purse> = {}): Purse => ({
    ...newPurse(), coins: 9, bag: bagOf(bag), hand, stamina: { day: -1, left: 0 }, ...more,
    ...(ids.length ? { blessed: ids.map((id, i) => ({ id, until: NOON + (i + 1) * HOUR })) } : {}),
  });
  const SETS: WishId[][] = [[], ["sprout"], ["spring"], ["green"], ["spring", "green"], ["feast"], ["feast", "hearty"], ["swift", "clear"], ["carry"], ["sprout", "spring", "feast", "green", "hearty", "carry"]];
  // water carried: a bucket drawn at the river, poured into the well, and a can filled there
  for (const ids of SETS) for (const bucket of ["bucket", "bucketIron"] as ItemId[]) for (const now of [NOON, NOON + 9 * HOUR]) {
    const empty = having(ids, [{ item: bucket, n: 1 }], bucket), full = having(ids, [{ item: bucket, n: 1, water: 3 }], bucket);
    add("chore", [empty, "river", 12, now], chore(empty, "river", 12, now));
    add("chore", [full, "well", 12, now], chore(full, "well", 12, now));
    add("chore", [full, "well", 39, now], chore(full, "well", 39, now));
    const can = having(ids, [{ item: "can", n: 1, water: 2 }], "can");
    add("chore", [can, "well", 12, now], chore(can, "well", 12, now));
  }
  const tilled: Plot = { soil: "tilled", plant: null };
  for (const ids of SETS) for (const seed of ["seedKangkong", "seedChili", "seedPumpkin", "seedCabbage"] as ItemId[]) for (const now of [NOON, NOON + 2 * HOUR, NOON + 9 * HOUR]) {
    const p = having(ids, [{ item: seed, n: 3 }], seed);
    add("sow", [p, tilled, seed, "a", now], sow(p, tilled, seed, "a", now));
  }
  for (const ids of SETS) for (const left of [1, 5]) for (const now of [NOON, NOON + 30 * 60_000, NOON + 9 * HOUR]) {
    const plot: Plot = { soil: "tilled", plant: { by: "a", crop: "chili", sown: NOON - 2 * HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } };
    const p = having(ids, [{ item: "can", n: 1, water: left }], "can");
    add("water", ["3,3", p, plot, "can", now], water("3,3", p, plot, "can", now));
  }
  for (const ids of SETS) for (const misses of [0, 1]) for (const now of [NOON, NOON + 9 * HOUR]) {
    // a recipe's dish (three minnows and salt in a pan), and things that make nothing, in a pot
    const fry: Array<[ItemId, number]> = [["minnow", 3], ["salt", 1]], odd: Array<[ItemId, number]> = [["kangkong", 2], ["salt", 1]];
    const p = having(ids, [{ item: "minnow", n: 3 }, { item: "salt", n: 2 }, { item: "kangkong", n: 2 }, { item: "pan", n: 1 }, { item: "pot", n: 1 }], null);
    add("cook", [p, fry, ["pan"], misses, now], cook(p, fry, ["pan"], misses, now));
    add("cook", [p, odd, ["pot"], misses, now], cook(p, odd, ["pot"], misses, now));
  }
  return out;
}

describe("the cases the database's fountain is held to", () => {
  it("are made the same every time, and try every way a toss can go", () => {
    const all = vectorsV123();
    expect(JSON.stringify(vectorsV123())).toBe(JSON.stringify(all));
    const tosses = all.filter((v) => v.fn === "toss").map((v) => v.want as { ok: boolean; why?: string; granted?: string | null; took?: number; counted?: number; fountain?: Fountain });
    expect(tosses.length).toBeGreaterThan(1_500);
    expect([...new Set(tosses.map((w) => (w.ok ? "ok" : w.why)))].sort()).toEqual(["amount", "coins", "none", "ok"]);
    // every wish comes true somewhere; a coin counts for more than itself somewhere, and less is taken than was offered
    expect(new Set(tosses.filter((w) => w.granted).map((w) => w.granted)).size).toBe(V123.length);
    expect(tosses.some((w) => w.ok && w.counted! > w.took!)).toBe(true);
    expect(tosses.some((w) => w.ok && w.granted && w.fountain!.pot > 0)).toBe(true);
    // two and three blessings running at once, and a day whose last has been given
    expect(Math.max(...tosses.filter((w) => w.ok).map((w) => w.fountain!.blessings.length))).toBeGreaterThan(1);
    expect(all.some((v) => v.fn === "goal_of" && v.want === null)).toBe(true);
    // a purse with a blessing beside a meal's buff, and with two blessings
    const held = all.filter((v) => v.fn === "blessed").map((v) => v.want as Purse);
    expect(held.some((p) => (p.blessed?.length ?? 0) > 1)).toBe(true);
    expect(held.some((p) => p.blessed && p.buff)).toBe(true);
    expect(held.some((p) => !p.blessed)).toBe(true);
    // what a blessing changes is done every time (a refusal would prove nothing), and comes out both ways
    for (const fn of ["sow", "water", "cook", "chore"]) expect(all.filter((v) => v.fn === fn).every((v) => (v.want as { ok: boolean }).ok)).toBe(true);
    const boosts = new Set(all.filter((v) => v.fn === "sow").map((v) => (v.want as { plot: Plot }).plot.plant!.boost > 0));
    expect(boosts.size).toBe(2);
    const cans = new Set(all.filter((v) => v.fn === "water" && (v.args[1] as Purse).bag[0]!.water === 5).map((v) => (v.want as { purse: Purse }).purse.bag[0]!.water));
    expect([...cans].sort()).toEqual([4, 5]);
    expect(new Set(all.filter((v) => v.fn === "cook").map((v) => (v.want as { n: number }).n)).size).toBeGreaterThan(2);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v123.json`, JSON.stringify(all)); }
  });
});
