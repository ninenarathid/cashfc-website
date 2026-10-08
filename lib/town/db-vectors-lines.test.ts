import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { KINDS } from "./forest";
import { BUGS } from "./insects";
import { CROP_IDS, DISHES, DISH_IDS, FISH_IDS, MAKE_IDS } from "./items";
import { count, countsOf, newLine, type Counts, type Done, type LineKept } from "./line-points";
import { LINES, LINE_IDS, countedOn, rankOf } from "./lines";

/**
 * The cases the database's rules of the lines of work are held to (v149; lib/town/db-vectors-box.test.ts says how
 * such a file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - `counts_of`: everything that can be done and counts (every fish, dish, made thing, insect, crop, every way of
 *   gathering, help of every kind, thanks), and the same things where they do not count (a go lost, one's own pot,
 *   one's own plant for help and somebody else's for a picking, words that are no deed of a line's);
 * - `line_count`: a line as it is kept with one more thing counted, from lines of every sort (new, of today, of
 *   another day, with holds at and under their most, with firsts had and not);
 * - `counted_on` and `line_rank`: the day's bound and the marks, either side of each.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-lines.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

const ME = "00000000-0000-0000-0000-000000000001", HER = "00000000-0000-0000-0000-000000000002", HIM = "00000000-0000-0000-0000-000000000003";

export function vectorsLines(): Vector[] {
  const c = chance(20261007), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const said = (d: Done, doer = ME) => add("counts_of", [d, doer], countsOf(d, doer));
  const deed = (what: string, thing: string | null, doc: Record<string, unknown> = {}, n = 1): Done => ({ from: "deed", what, thing, n, doc });
  const play = (game: string, thing: string | null, won: boolean): Done => ({ from: "play", what: game, thing, n: 1, won, doc: {} });

  // a go at a game: every fish and what is no fish, every dish and made thing, the odd dish, nothing; won and lost
  for (const f of [...FISH_IDS, "boot", "hyacinth", "noSuchFish"]) for (const won of [true, false]) said(play("fishing", f, won));
  for (const d of [...DISH_IDS, ...MAKE_IDS, "nothing", "noSuchDish"]) for (const won of [true, false]) said(play("cooking", d, won));
  for (const game of ["farming", "washing", "noGame"]) said(play(game, "tomYum", true));
  said(play("fishing", null, true));
  // a helping ladled: out of somebody else's pot, one's own, a pot with nobody named
  for (const doc of [{ pot: "p", whose: HER }, { pot: "p", whose: ME }, { pot: "p" }, { pot: "p", whose: 7 }, { pot: "p", whose: null }]) said(deed("ladle", "tomYum", doc));
  said(deed("ladle", "tomYum", { whose: ME }, 1), HER);
  // help: every farm deed, on somebody else's plant, one's own, nobody's; a hoe's work in a bed that is another's
  for (const what of ["water", "clear", "till", "feed", "cure", "sow", "pull", "uproot", "pick"]) {
    for (const doc of [{ whose: HER }, { whose: ME }, {}, { owner: HER }, { owner: ME }, { whose: "", owner: HER }, { whose: HER, owner: HIM }, { tile: [3, 4] }]) said(deed(what, c.of(CROP_IDS), doc));
  }
  // every crop picked: one's own, and somebody else's
  for (const crop of [...CROP_IDS, "noSuchCrop"]) { said(deed("pick", crop, {}, c.int(1, 6))); said(deed("pick", crop, { whose: HER })); }
  // thanks: to some, to nobody, to oneself among them, to what is no member's name
  for (const to of [[HER], [HER, HIM], [], [ME], [HER, ME, HIM], [HER, 5, null, HIM], "her", null]) said(deed("thank", null, { to }));
  said(deed("thank", null, {}));
  // the forest: every thing it has, by the way its kind is had, and by every other way; and with no way said
  const wild = [...new Set(Object.values(KINDS).flatMap((k) => k.finds.map((f) => f.item)))];
  for (const item of [...wild, "noSuchThing"]) {
    const own = Object.values(KINDS).find((k) => k.finds.some((f) => f.item === item))?.how ?? "pick";
    said(deed("gather", item, { how: own, kind: "x" }, c.int(1, 3)));
    said(deed("gather", item, { how: c.of(["pick", "choose", "shake", "dig"]) }));
  }
  for (const how of ["rare", "", "sniff", null, 3]) said(deed("gather", "truffle", { how }));
  said(deed("gather", "truffle", {}));
  // insects: every one, and what is none
  for (const bug of [...Object.keys(BUGS), "noSuchBug"]) said(deed("net", bug, { haunt: 3 }, c.int(1, 2)));
  // what counts for nothing
  for (const what of ["buy", "leave", "collect", "eat", "serve", "pot_down", "pot_take", "drop", "hold", "put_away", "toss", "cast", "pour", "draw", "pass", "yard", "ditch", "title", "shop_sell", "open", "give", "wear"]) {
    said(deed(what, c.of(["tomYum", "minnow", "tomato", null]), c.maybe(0.5) ? { whose: HER } : {}));
  }

  // a line as it is kept, with one more thing counted
  const DAY = 20733;
  const kept = (line: keyof typeof LINES): LineKept => {
    if (c.maybe(0.15)) return newLine();
    const bound = LINES[line].day;
    return {
      points: c.of([0, 3, 49.75, 148, 150.5, 699, 7999.25, 12000]), day: c.of([DAY, DAY, DAY, DAY - 1, DAY - 30, -1]),
      today: c.of([0, 1, bound - 10, bound - 1, bound, bound + 37, 900]),
      held: Object.fromEntries([["pot:tomYum", c.int(0, 4)], [`ladle:${HER}`, c.int(0, 10)], [`ladle:${HIM}`, c.int(0, 10)]].filter(() => c.maybe(0.5))),
      firsts: ["fishing:minnow", "kitchen:tomYum", "forest:truffle", "insects:moth", "farming:tomato"].filter(() => c.maybe(0.4)),
    };
  };
  const things: Counts[] = [
    ...countsOf(play("fishing", "minnow", true), ME), ...countsOf(play("fishing", FISH_IDS[FISH_IDS.length - 1], true), ME),
    ...countsOf(play("cooking", "tomYum", true), ME), ...countsOf(play("cooking", "pestCure", true), ME),
    ...countsOf(deed("ladle", "tomYum", { whose: ME }), HER), ...countsOf(deed("ladle", "tomYum", { whose: ME }), HIM),
    ...countsOf(deed("cure", "tomato", { whose: HER }), ME), ...countsOf(deed("thank", null, { to: [HER] }), ME),
    ...countsOf(deed("gather", "truffle", { how: "dig" }), ME), ...countsOf(deed("net", "moth"), ME), ...countsOf(deed("pick", "tomato"), ME), ...countsOf(deed("pick", "coconut"), ME),
    { to: null, line: "kitchen", raw: 0 }, { to: null, line: "forest", raw: 400 }, { to: null, line: "well", raw: 190, held: { key: "x", most: 1 } }, { to: null, line: "helpers", raw: -3, first: "helpers:odd" },
  ];
  for (let i = 0; i < 1400; i++) {
    const thing = c.of(things), k = kept(thing.line), day = c.of([DAY, DAY, DAY + 1]);
    add("line_count", [k, thing, day], count(k, thing, day));
  }
  // the day's bound and the marks, either side of each
  for (const line of LINE_IDS) {
    const bound = LINES[line].day;
    for (const today of [0, 1, bound - 10, bound - 1, bound, bound + 1, 5000, -4]) for (const more of [0, -2, 1, 9, 10, 11, 37.5, 400]) add("counted_on", [line, today, more], countedOn(line, today, more));
    for (const at of LINES[line].marks) for (const p of [at - 1, at - 0.25, at, at + 0.25, at + 1]) add("line_rank", [line, p], rankOf(line, p));
    add("line_rank", [line, 0], rankOf(line, 0));
    add("line_rank", [line, 9_999_999], rankOf(line, 9_999_999));
  }
  return out;
}

describe("the cases the database's rules of the lines of work are held to", () => {
  it("are made the same every time, and reach every thing that counts and that does not", () => {
    const all = vectorsLines();
    expect(JSON.stringify(vectorsLines())).toBe(JSON.stringify(all));
    const told = all.filter((v) => v.fn === "counts_of");
    expect(told.length).toBeGreaterThan(600);
    const lines = new Set(told.flatMap((v) => (v.want as Counts[]).map((x) => x.line)));
    expect([...lines].sort()).toEqual(["farming", "fishing", "forest", "helpers", "insects", "kitchen"]);
    expect(told.filter((v) => (v.want as Counts[]).length === 0).length).toBeGreaterThan(150);
    // every dish with a recipe is worth its helpings somewhere among them
    for (const d of DISH_IDS.filter((x) => DISHES[x].recipe)) expect(told.some((v) => (v.want as Counts[])[0]?.first === `kitchen:${d}`), d).toBe(true);
    // a line counted: a hold at its most, a first had and not had, a day turned, the bound crossed
    const counted = all.filter((v) => v.fn === "line_count").map((v) => ({ k: v.args[0] as LineKept, c: v.args[1] as Counts, day: v.args[2] as number, w: v.want as LineKept }));
    expect(counted.some((x) => x.c.held && (x.k.held[x.c.held.key] ?? 0) >= x.c.held.most && x.k.day === x.day)).toBe(true);
    expect(counted.some((x) => x.c.first && x.k.firsts.includes(x.c.first))).toBe(true);
    expect(counted.some((x) => x.c.first && !x.k.firsts.includes(x.c.first))).toBe(true);
    expect(counted.some((x) => x.k.day !== x.day && x.k.day !== -1)).toBe(true);
    expect(counted.some((x) => x.k.day === x.day && x.k.today < LINES[x.c.line].day && x.w.today > LINES[x.c.line].day)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-lines.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
