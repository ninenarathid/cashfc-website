import { describe, expect, it } from "vitest";
import { KINDS } from "./forest";
import { BUGS } from "./insects";
import { CROPS, CROP_IDS, DISHES, DISH_IDS, FISH, FISH_IDS } from "./items";
import { POINTS, count, countsOf, newLine, type Done } from "./line-points";
import { LINES } from "./lines";

const deed = (what: string, thing: string | null = null, doc: Record<string, unknown> = {}, n = 1): Done => ({ from: "deed", what, thing, n, doc });
const play = (game: string, thing: string, won = true): Done => ({ from: "play", what: game, thing, n: 1, won, doc: {} });
const ME = "me", HER = "her";

describe("what counts for a line's points", () => {
  it("fishing: a fish landed, by how rare it is; nothing for what is no fish, or for a line that was lost", () => {
    const of = (tier: string) => FISH_IDS.find((f) => FISH[f].tier === tier)!;
    expect(["common", "uncommon", "rare", "legend"].map((t) => countsOf(play("fishing", of(t)), ME)[0].raw)).toEqual([1, 3, 8, 30]);
    expect(countsOf(play("fishing", of("rare")), ME)).toEqual([{ to: null, line: "fishing", raw: 8, first: `fishing:${of("rare")}` }]);
    expect(countsOf(play("fishing", "boot"), ME)).toEqual([]);
    expect(countsOf(play("fishing", of("legend"), false), ME)).toEqual([]);
    // every fish there is counts for something
    for (const f of FISH_IDS) expect(countsOf(play("fishing", f), ME)[0]?.raw, f).toBeGreaterThan(0);
  });

  it("kitchen: a pot of a real recipe is worth its helpings, three pots of a dish a day; the odd dish nothing", () => {
    expect(countsOf(play("cooking", "tomYum"), ME)).toEqual([{ to: null, line: "kitchen", raw: DISHES.tomYum.recipe!.serves, first: "kitchen:tomYum", held: { key: "pot:tomYum", most: 3 } }]);
    expect(countsOf(play("cooking", "pestCure"), ME)[0]).toMatchObject({ line: "kitchen", raw: 1 });
    expect(countsOf(play("cooking", "oddDish"), ME)).toEqual([]);
    expect(countsOf(play("cooking", "nothing"), ME)).toEqual([]);
    expect(countsOf(play("cooking", "tomYum", false), ME)).toEqual([]);
    for (const d of DISH_IDS.filter((x) => DISHES[x].recipe)) expect(countsOf(play("cooking", d), ME)[0].raw, d).toBe(DISHES[d].recipe!.serves);
  });
  it("kitchen: a helping somebody else ladles from one's pot is a point to whoever set it down, nine of one person's a day", () => {
    expect(countsOf(deed("ladle", "tomYum", { pot: "p1", whose: HER }), ME)).toEqual([{ to: HER, line: "kitchen", raw: 1, held: { key: `ladle:${ME}`, most: 9 } }]);
    // out of one's own pot: nothing
    expect(countsOf(deed("ladle", "tomYum", { pot: "p1" }), ME)).toEqual([]);
    expect(countsOf(deed("ladle", "tomYum", { pot: "p1", whose: ME }), ME)).toEqual([]);
  });

  it("helpers: only on other people's plants and beds, and a thanks received", () => {
    expect(["water", "clear", "till", "feed", "cure"].map((w) => countsOf(deed(w, "tomato", { whose: HER }), ME)[0]?.raw)).toEqual([1, 2, 2, 2, 5]);
    for (const w of ["water", "clear", "till", "feed", "cure"]) {
      expect(countsOf(deed(w, "tomato", {}), ME), w).toEqual([]);
      expect(countsOf(deed(w, "tomato", { whose: ME }), ME), w).toEqual([]);
    }
    // (a hoe's work in a bed that is somebody else's has no plant to say whose: the bed's owner says it)
    expect(countsOf(deed("till", null, { owner: HER }), ME)).toEqual([{ to: null, line: "helpers", raw: 2 }]);
    expect(countsOf(deed("thank", null, { to: [HER, "him", ME] }), ME)).toEqual([{ to: HER, line: "helpers", raw: 3 }, { to: "him", line: "helpers", raw: 3 }]);
    // sowing, pulling and picking for somebody are no help that counts
    for (const w of ["sow", "pull", "uproot"]) expect(countsOf(deed(w, "tomato", { whose: HER }), ME), w).toEqual([]);
  });

  it("the forest: what is picked up, chosen or shaken down, dug; ten more for a rare thing of its own day", () => {
    expect(["pick", "choose", "shake", "dig"].map((how) => countsOf(deed("gather", "twig", { how }), ME)[0].raw)).toEqual([1, 2, 2, 3]);
    expect(countsOf(deed("gather", "truffle", { how: "dig" }), ME)).toEqual([{ to: null, line: "forest", raw: 13, first: "forest:truffle" }]);
    expect(countsOf(deed("gather", "wildOrchid", { how: "pick" }), ME)[0].raw).toBe(11);
    expect(countsOf(deed("gather", "twig", {}), ME)).toEqual([]);
    // every way of gathering the forest has is one of these
    for (const k of Object.values(KINDS)) expect(POINTS.forest[k.how], k.how).toBeGreaterThan(0);
  });

  it("insects: one in plain sight, one caught by its own way, a rare one or a beetle", () => {
    expect(countsOf(deed("net", "butterflyWhite"), ME)).toEqual([{ to: null, line: "insects", raw: 1, first: "insects:butterflyWhite" }]);
    expect(countsOf(deed("net", "caterpillar"), ME)[0].raw).toBe(1);
    expect(countsOf(deed("net", "cricket"), ME)[0].raw).toBe(3);
    expect(countsOf(deed("net", "moth"), ME)[0].raw).toBe(3);
    expect(countsOf(deed("net", "rhinoBeetle"), ME)[0].raw).toBe(8);
    expect(countsOf(deed("net", "morpho"), ME)[0].raw).toBe(8);
    expect(countsOf(deed("net", "herculesBeetle"), ME)[0].raw).toBe(8);
    expect(countsOf(deed("net", "noSuchBug"), ME)).toEqual([]);
    for (const id of Object.keys(BUGS)) expect([1, 3, 8], id).toContain(countsOf(deed("net", id), ME)[0].raw);
  });

  it("farming: a picking of a plant one sowed, a point for every twelve hours its crop takes", () => {
    expect(countsOf(deed("pick", "kangkong", {}, 4), ME)).toEqual([{ to: null, line: "farming", raw: 1, first: "farming:kangkong" }]);
    expect(countsOf(deed("pick", "tomato"), ME)[0].raw).toBe(6);
    expect(countsOf(deed("pick", "coconut"), ME)[0].raw).toBe(24);
    // somebody else's plant: no farming of one's own
    expect(countsOf(deed("pick", "tomato", { whose: HER }), ME)).toEqual([]);
    for (const c of CROP_IDS) expect(countsOf(deed("pick", c), ME)[0].raw, c).toBe(Math.max(1, Math.floor(CROPS[c].hours / 12)));
  });

  it("nothing else counts: buying, selling, eating, walking a pot about", () => {
    for (const w of ["buy", "leave", "collect", "eat", "serve", "pot_down", "pot_take", "drop", "hold", "toss", "shop_sell", "cast", "pour", "draw", "pass", "yard"]) expect(countsOf(deed(w, "tomYum", { whose: HER }), ME), w).toEqual([]);
    expect(countsOf(play("farming", "till"), ME)).toEqual([]);
  });
});

describe("a line as it is kept", () => {
  const DAY = 20000;
  it("adds what a thing is worth, and ten more for the first of its kind, once ever", () => {
    const c = countsOf(play("fishing", "minnow"), ME)[0];
    const one = count(newLine(), c, DAY);
    expect(one).toEqual({ points: 1 + POINTS.first, day: DAY, today: 11, held: {}, firsts: ["fishing:minnow"] });
    const two = count(one, c, DAY);
    expect(two.points).toBe(12);
    expect(two.firsts).toEqual(["fishing:minnow"]);
    // on another day too: the first was had
    expect(count(two, c, DAY + 1).points).toBe(13);
  });
  it("holds a thing to so many a day: a fourth pot of the same dish is worth nothing, and tomorrow's first is again", () => {
    const c = countsOf(play("cooking", "tomYum"), ME)[0], serves = DISHES.tomYum.recipe!.serves;
    let k = newLine();
    for (let i = 0; i < 5; i++) k = count(k, c, DAY);
    expect(k.points).toBe(3 * serves + POINTS.first);
    expect(k.held).toEqual({ "pot:tomYum": 3 });
    expect(count(k, c, DAY + 1).points).toBe(4 * serves + POINTS.first);
    // of one person's ladling, nine helpings a day; another person's are their own nine
    const ladle = countsOf(deed("ladle", "tomYum", { whose: HER }), ME)[0], his = countsOf(deed("ladle", "tomYum", { whose: HER }), "him")[0];
    let hers = newLine();
    for (let i = 0; i < 12; i++) hers = count(hers, ladle, DAY);
    expect(hers.points).toBe(9);
    expect(count(hers, his, DAY).points).toBe(10);
  });
  it("counts a day's points in full up to the line's bound and a quarter past it, and a new day in full again", () => {
    const big = { to: null, line: "kitchen" as const, raw: 100 };
    let k = count(count(newLine(), big, DAY), big, DAY);
    expect(k).toMatchObject({ points: 150 + 50 * 0.25, today: 200 });
    k = count(k, big, DAY);
    expect(k.points).toBe(150 + 150 * 0.25);
    k = count(k, big, DAY + 1);
    expect(k).toMatchObject({ points: 150 + 150 * 0.25 + 100, day: DAY + 1, today: 100, held: {} });
    expect(LINES.kitchen.day).toBe(150);
  });
  it("is as it was for a thing worth nothing", () => {
    const k = count(newLine(), { to: null, line: "forest", raw: 3 }, DAY);
    expect(count(k, { to: null, line: "forest", raw: 0 }, DAY)).toBe(k);
  });
});
