import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsV147 } from "./db-vectors-swarm.test";
import { tend, type Bed, type Plot } from "./farm";
import { backBait, strikeWindowOf } from "./fishing";
import { CHARM_IDS, charmBy, famBy, FAMILIAR_IDS, GIFTS, giftsOf, gloved, stretchOf, takeGift, usedOf, useGift, wearCharms, wearFamiliar, wearing, works, type FamiliarId } from "./gifts";
import { ITEMS, type ItemId } from "./items";
import { LINES, LINE_IDS } from "./lines";
import { dayOf, eased, staminaOf } from "./stamina";
import { newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the gifts are held to (v151; lib/town/db-vectors-box.test.ts says how such a
 * file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - `gifts_of`, `wearing`, `charm_by`: purses with gifts kept soundly and not (a gift there is none of, one twice,
 *   a charm worn that was never taken, more worn than there are places, an owing that is no part of a point);
 * - `familiar_wear`, `fam_by`: one had, one not had, a charm, none, what is no gift; and what a familiar does only while it follows;
 * - `gift_works`, `used_of`, `gift_use`: a counted gift used with every count kept (none, some, all, too many, kept
 *   wrongly), in the stretch it was kept in and in another; one that does not follow, one not had, one not counted;
 * - `gift_take`: every line and rank, with points either side of the rank's mark, taken and not;
 * - `charms_wear`: none, one, two, three, the same twice, one not had, something that is no gift;
 * - `eased`, `gloved`: costs of none to seven points, parts and owings of every sort, purses near no stamina;
 * - `strike_window`: the float worn and not, with a keen eye at every level, with and without stamina, with a
 *   float of the bag's;
 * - `tend`: the farm's own cases under a clear sky (lib/town/db-vectors-swarm.test.ts) with the gloves on, owing
 *   nothing and owing half a point: work on somebody else's plant and in somebody else's bed, and on one's own.
 *
 * - `back_bait`: a fish lost in the fight gives its bait back: with room in the bag, with a stack of it not yet full,
 *   with none, and a bait that is not eaten.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts.test.ts
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
const NOW = at("2026-10-06T12:00:00");

export function vectorsGifts(): Vector[] {
  const c = chance(20261051), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const ids = GIFTS.map((g) => g.id) as string[], fams = [...FAMILIAR_IDS] as string[];
  const some = (n: number) => { const pool = [...ids]; return Array.from({ length: Math.min(n, pool.length) }, () => pool.splice(c.int(0, pool.length - 1), 1)[0]); };
  /** What a purse may keep of gifts: sound, or wrong in one of the ways there are. */
  const kept = (): Purse["gifts"] | undefined | null => {
    const had = some(c.int(0, ids.length)), worn = had.filter(() => c.maybe(0.5)).slice(0, c.int(0, 3));
    // (a familiar that follows: one had, one not had, a charm, something that is none, or nothing said of one)
    const fam = c.of<() => string | null | undefined>([() => undefined, () => undefined, () => null, () => had.find((x) => fams.includes(x)) ?? c.of(fams), () => c.of(fams), () => c.of([...CHARM_IDS]), () => "noSuchGift"])();
    // (what was used of a counted gift: nothing said, a sound count of these hours or of others, and counts kept wrongly)
    const k = stretchOf({ n: 1, per: "meal" }, NOW);
    const used = c.of<() => unknown>([() => undefined, () => undefined, () => undefined, () => ({ famOtter: { k, n: c.int(0, 12) } }), () => ({ famOtter: { k: k - 1, n: 4 } }), () => "x", () => [1, 2],
      () => ({ famOtter: "3" }), () => ({ famOtter: { k, n: 2.5 } }), () => ({ noSuchGift: { k: 1, n: 1 }, famOtter: { k, n: -3 } })])();
    const and = <T extends object>(g: T) => ({ ...g, ...(fam === undefined ? {} : { familiar: fam }), ...(used === undefined ? {} : { used }) }) as T;
    return c.of<() => Purse["gifts"] | undefined | null>([
      () => undefined, () => null, () => and({ had, charms: worn }), () => and({ had, charms: worn, owed: 0.5 }), () => and({ had, charms: worn.slice(0, 2), owed: 0 }),
      () => ({ had: [...had, had[0] ?? "charmHoe", "noSuchGift"], charms: [...worn, "charmNet", "noSuchGift"] }),
      () => ({ had, charms: [worn[0] ?? "charmApron", worn[0] ?? "charmApron"], owed: 1 }), () => ({ had: had as unknown as string[], charms: [...ids], owed: -0.5 }),
      () => ({ had: "charmHoe" as unknown as string[], charms: ["charmHoe"] }), () => ({ had: [3, null, "charmFloat"] as unknown as string[], charms: [null, "charmFloat"] as unknown as string[], owed: "0.5" as unknown as number }),
    ])();
  };
  const purse = (gifts: Purse["gifts"] | undefined | null, more: Partial<Purse> = {}): Purse => {
    const p = { ...newPurse(), stamina: { day: dayOf(NOW), left: 100 }, ...more } as Purse;
    return gifts === undefined ? p : ({ ...p, gifts } as Purse);
  };

  // what is kept, made sound; who wears what; what a charm does for its wearer
  for (let i = 0; i < 260; i++) {
    const p = purse(kept());
    add("gifts_of", [p], giftsOf(p));
    const id = c.of([...CHARM_IDS, "noSuchGift"]);
    add("wearing", [p, id], wearing(p, id as (typeof CHARM_IDS)[number]));
    if (id !== "noSuchGift") add("charm_by", [p, id, c.of([0, 1])], charmBy(p, id as (typeof CHARM_IDS)[number], c.of([0, 1])));
    const fid = c.of(fams) as FamiliarId, else_ = c.of([0, 1]);
    add("fam_by", [p, fid, else_], famBy(p, fid, else_));
    const want = c.of<string | null>([null, c.of(fams), c.of(fams), c.of([...CHARM_IDS]), "noSuchGift"]);
    add("familiar_wear", [p, want], wearFamiliar(p, want));
    const gid = c.of([...ids, "noSuchGift"]), when = c.of([NOW, NOW + 7 * 3_600_000, NOW + 86_400_000, NOW - 5 * 3_600_000]);
    add("gift_works", [p, gid], works(p, gid));
    add("used_of", [p, gid, when], usedOf(p, gid, when));
    add("gift_use", [p, gid, when], useGift(p, gid, when));
  }
  // a counted gift used: the otter following and not, with every count kept, in the stretch kept and in another
  // (and something else kept beside it of what was used, which a use leaves as it is)
  for (const fam of ["famOtter", "famSquirrel", null, undefined]) for (const n of [undefined, 0, 1, 9, 10, 11, 3.5, -2, "4"]) for (const dk of [0, 1, -1]) for (const when of [NOW, NOW + 7 * 3_600_000, NOW + 86_400_000]) {
    const p = purse({ had: ["famOtter", "famSquirrel", "charmHoe"], charms: ["charmHoe"], ...(fam === undefined ? {} : { familiar: fam }), ...(n === undefined ? {} : { used: { famOtter: { k: stretchOf({ n: 1, per: "meal" }, NOW) + dk, n }, ...(dk === 0 ? { famSquirrel: { k: 7, n: 2 } } : {}) } }) } as Purse["gifts"]);
    for (const id of ["famOtter", "famSquirrel", "charmHoe"]) {
      add("gift_works", [p, id], works(p, id));
      add("used_of", [p, id, when], usedOf(p, id, when));
      add("gift_use", [p, id, when], useGift(p, id, when));
    }
  }
  // (charm_by's last argument was drawn twice above: answered again as it was asked)
  for (const v of out) if (v.fn === "charm_by") v.want = charmBy(v.args[0] as Purse, v.args[1] as (typeof CHARM_IDS)[number], v.args[2] as number);

  // a gift taken: every line and its first ranks, with points either side of each mark
  for (const line of [...LINE_IDS, "cooking"]) for (const rank of [0, 1, 2, 3, 4, 5, 6, 11]) {
    const mark = line in LINES ? LINES[line as (typeof LINE_IDS)[number]].marks[Math.max(0, Math.min(9, rank - 1))] : 50;
    for (const has of [0, mark - 1, mark - 0.25, mark, mark + 40, 99999]) for (const gifts of [undefined, { had: [], charms: [] }, { had: [...ids], charms: ["charmHoe"] }, { had: some(3), charms: [], owed: 0.5 }]) {
      const p = purse(gifts), points = c.maybe(0.85) ? { farming: c.of([0, 60]), [line]: has } : {};
      const did = takeGift(p, points as Record<string, number>, line, rank);
      add("gift_take", [p, points, line, rank], did);
    }
  }
  // charms worn: none, one, two, three; the same twice; one not had; what is no gift
  for (let i = 0; i < 320; i++) {
    const had = some(c.int(0, 6)), p = purse(c.maybe(0.1) ? undefined : { had, charms: had.slice(0, c.int(0, 2)), ...(c.maybe(0.3) ? { owed: 0.5 } : {}) });
    const want = c.of<() => string[]>([
      () => [], () => had.slice(0, 1), () => had.slice(0, 2), () => had.slice(0, 3), () => [had[0] ?? "charmHoe", had[0] ?? "charmHoe"], () => [c.of(ids)], () => [c.of(ids), c.of(ids)],
      () => ["noSuchGift"], () => [had[1] ?? "charmNet", "noSuchGift"], () => some(2), () => some(3),
    ])();
    add("charms_wear", [p, want], wearCharms(p, want));
  }

  // a cost with a part of it left to pay, kept exact over time
  const day = dayOf(NOW);
  for (const left of [100, 50, 3, 1, 0]) for (const cost of [0, 1, 2, 3, 4, 7]) for (const part of [0.5, 1, 0, 0.25, 1.5, -1]) for (const owed of [0, 0.5, 0.25, 0.75, 1, 3, -0.5]) {
    const before: Purse = { ...newPurse(), stamina: { day, left } }, after: Purse = { ...before, stamina: { day, left: Math.max(0, left - cost) } };
    add("eased", [before, after, NOW, part, owed], eased(before, after, NOW, part, owed));
  }
  // (a purse counted on another day begins the day full: what it cost is counted from there)
  for (const cost of [0, 1, 2, 5]) {
    const before: Purse = { ...newPurse(), stamina: { day: day - 1, left: 12 } }, after: Purse = { ...before, stamina: { day, left: 100 - cost } };
    add("eased", [before, after, NOW, 0.5, 0], eased(before, after, NOW, 0.5, 0));
  }
  for (let i = 0; i < 300; i++) {
    const g = kept(), left = c.of([100, 40, 2, 1, 0]), cost = c.of([0, 1, 1, 2, 2, 3]);
    const before = purse(g, { stamina: { day, left } }), after = { ...before, stamina: { day, left: Math.max(0, left - cost) }, coins: before.coins + 1 } as Purse;
    add("gloved", [before, after, NOW], gloved(before, after, NOW));
  }

  // a bait given back: an empty bag, a stack of it begun, a stack of it full with and without a slot beside, no room at all; a bait that is not eaten
  for (const bait of ["worm", "dough", "corn", "lure", "minnow"] as ItemId[]) for (const fill of ["empty", "some", "stackFull", "stackFullAndFree", "full"] as const) {
    const base = purse(undefined), stack = ITEMS[bait].stack;
    let bag = base.bag.map(() => null) as Purse["bag"];
    if (fill === "some") bag = put(bag, bait, Math.max(1, stack - 3));
    if (fill === "stackFull" || fill === "stackFullAndFree") { bag = put(bag, bait, stack); if (fill === "stackFull") bag = bag.map((slot) => slot ?? { item: "boot" as ItemId, n: 1 }); }
    if (fill === "full") bag = bag.map(() => ({ item: "boot" as ItemId, n: 1 }));
    const p = { ...base, bag } as Purse;
    add("back_bait", [p, bait], backBait(p, bait as Parameters<typeof backBait>[1]));
  }

  // the strike's moment: the float worn and not, a keen eye at every level, with and without stamina, a float in the bag
  const FLOATS = Object.entries(catalogOf().fishing.floats as Record<string, number>).map(([id]) => id as ItemId);
  for (const worn of [undefined, { had: ["charmFloat"], charms: [] }, { had: ["charmFloat"], charms: ["charmFloat"] }, { had: ["charmFloat", "charmHoe"], charms: ["charmHoe", "charmFloat"] }, { had: ["charmHoe"], charms: ["charmHoe"] }]) {
    for (const level of [0, 1, 2, 3, 4]) for (const left of [100, 1, 0]) for (const float of [null, ...FLOATS]) {
      const base = purse(worn, { stamina: { day, left } });
      const p: Purse = { ...base, bag: float ? put(base.bag, float, 1) : base.bag, ...(level ? { buffs: [{ id: "keen", level, until: NOW + 3_600_000 }] } : {}) } as Purse;
      add("strike_window", [p, NOW], strikeWindowOf(p, NOW));
    }
  }

  // the farm's own cases under a clear sky, with the gloves on: owing nothing, and owing half a point
  const dry = { rains: [], swarms: {} };
  for (const v of vectorsV147().cases) {
    if (v.sky !== 0 || v.fn !== "tend") continue;
    const [key, plot, bed, others, holds, p, me, now] = v.args as [string, Plot, Bed | null, number, number, Purse, string, number];
    for (const owed of [0, 0.5]) {
      // (stamina to pay with, or none: a hand already at none pays nothing)
      const worn: Purse = { ...p, stamina: { day: dayOf(now), left: c.of([100, 100, 1, 0]) }, gifts: { had: ["charmGloves", "charmHoe"], charms: c.maybe(0.85) ? ["charmGloves"] : ["charmHoe"], ...(owed ? { owed } : {}) } };
      add("tend", [key, plot, bed, others, holds, worn, me, now], tend(key, plot, bed ?? undefined, others, holds, worn, me, now, dry));
    }
  }
  return out;
}

describe("the cases the database's rules of the gifts are held to", () => {
  it("are made the same every time, and reach every way a gift is kept, taken, worn and felt", () => {
    const all = vectorsGifts();
    expect(JSON.stringify(vectorsGifts())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    for (const fn of ["gifts_of", "wearing", "charm_by", "fam_by", "familiar_wear", "gift_works", "used_of", "gift_use", "gift_take", "charms_wear", "eased", "gloved", "strike_window", "tend"]) expect(of(fn).length, fn).toBeGreaterThan(40);
    // a bait given back, and one that is not: for no room, and for a bait that is not eaten
    const backs = of("back_bait");
    expect(backs.length).toBe(25);
    expect(backs.some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && backs.some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]))).toBe(true);
    // a counted gift used with times left, with none, and refused as nothing to use; a count read as some and as none
    const uses = of("gift_use").map((v) => v.want as { ok: boolean; why?: string; left?: number });
    expect(uses.some((d) => d.ok && d.left === 0) && uses.some((d) => d.ok && (d.left ?? 0) > 5) && uses.some((d) => !d.ok && d.why === "spent") && uses.some((d) => !d.ok && d.why === "none")).toBe(true);
    expect(of("used_of").some((v) => (v.want as number) > 0) && of("gift_works").some((v) => v.want === true) && of("gift_works").some((v) => v.want === false)).toBe(true);
    // a familiar set to follow, taken off, and refused; and one that follows among the purses asked about
    const fams = of("familiar_wear").map((v) => ({ id: v.args[1], d: v.want as { ok: boolean; why?: string } }));
    expect(fams.some((x) => x.d.ok && x.id !== null) && fams.some((x) => x.d.ok && x.id === null) && fams.some((x) => !x.d.ok && x.d.why === "none")).toBe(true);
    expect(of("gifts_of").some((v) => (v.want as { familiar: string | null }).familiar !== null) && of("fam_by").some((v) => (v.want as number) > 1)).toBe(true);
    // a gift taken, and refused each way
    const took = of("gift_take").map((v) => v.want as { ok: boolean; why?: string });
    for (const why of ["none", "rank", "had"]) expect(took.some((d) => !d.ok && d.why === why), why).toBe(true);
    for (const g of GIFTS) expect(of("gift_take").some((v) => (v.want as { ok: boolean; gift?: string }).ok && (v.want as { gift: string }).gift === g.id), g.id).toBe(true);
    // charms worn, and refused each way
    const wore = of("charms_wear").map((v) => v.want as { ok: boolean; why?: string });
    expect(wore.some((d) => d.ok) && wore.some((d) => !d.ok && d.why === "slots") && wore.some((d) => !d.ok && d.why === "none")).toBe(true);
    // the float's half as long again is among the strikes, and a keen eye with it
    const strikes = of("strike_window").map((v) => ({ p: v.args[0] as Purse, w: v.want as number }));
    expect(strikes.some((s) => wearing(s.p, "charmFloat") && (s.p.buffs?.length ?? 0) > 0) && strikes.some((s) => !wearing(s.p, "charmFloat"))).toBe(true);
    // the gloves: on somebody else's plant every point is given back (nothing is left to pay, since the ladder was laid out anew: a half
    // owing from before stays as it was kept, and is never asked for), and nothing on one's own
    const tended = of("tend").map((v) => ({ before: v.args[5] as Purse, plot: v.args[1] as Plot, me: v.args[6] as string, now: v.args[7] as number, did: v.want as { ok: boolean; purse?: Purse } })).filter((x) => x.did.ok);
    const paid = (x: (typeof tended)[number]) => staminaOf(x.before, x.now) - staminaOf(x.did.purse!, x.now);
    expect(tended.some((x) => wearing(x.before, "charmGloves") && x.plot.plant?.by !== x.me && giftsOf(x.before).owed === 0 && giftsOf(x.did.purse!).owed === 0 && paid(x) === 0)).toBe(true);
    expect(tended.some((x) => wearing(x.before, "charmGloves") && x.plot.plant?.by !== x.me && giftsOf(x.before).owed === 0.5 && giftsOf(x.did.purse!).owed === 0.5 && paid(x) === 0)).toBe(true);
    expect(tended.some((x) => wearing(x.before, "charmGloves") && x.plot.plant?.by === x.me && paid(x) >= 1 && giftsOf(x.did.purse!).owed === giftsOf(x.before).owed)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
