import { describe, expect, it } from "vitest";
import { FINDS, FORAGING, KINDS, SPOTS, SPOT_KINDS, fullMoon, gameFor, gather, holds, isDayOf, mayGather, reaches, turnOf, turnStart, type Held, type Spot } from "./forest";
import { cook, isCookware } from "./cooking";
import { PUT_ON } from "./farm";
import { PLAIN, gearOf } from "./gear";
import { DISHES, DISH_IDS, ITEMS, ITEM_IDS, MAKES, type ItemId } from "./items";
import { UNLOCKS, mayAsk, sourcesAt } from "./orders";
import { staminaOf } from "./stamina";
import { HOUR, held, newPurse, put, type Purse } from "./trade";
import { sources } from "./uses";
import { ALWAYS_RAIN, DRY } from "./weather";
import { FOREST, GATES, findPath, groundAt, placeOf, walkable, zoneAt } from "./world";

/** 2026-10-05 12:00 in Bangkok. */
const NOON = Date.UTC(2026, 9, 5, 5), MINUTE = 60_000;
const bagOf = (...items: Array<[ItemId, number]>): Purse => ({ ...newPurse(), bag: items.reduce((bag, [id, n]) => put(bag, id, n), newPurse().bag) });
const spotOf = (kind: Spot["kind"], zone?: Spot["zone"]) => SPOTS.find((s) => s.kind === kind && (!zone || s.zone === zone))!;
/** Everything a place has over so many of its turns from a moment, with a keeper's word. */
function over(salt: string, spot: Spot, from: number, turns: number, rains = DRY): Array<Held | null> {
  return Array.from({ length: turns }, (_, i) => holds(salt, spot, from + i * KINDS[spot.kind].every * MINUTE, rains));
}

describe("the forest's things (the owner, 2026-10-05: \"หาของป่า … ของบางอย่างเกิดทุก 10 นาที ไปจนถึง ขอหายาก ที่จะเกิดเฉพาะบางวัน แบบ Random\")", () => {
  it("are things of the early game that are found, each of them somewhere", () => {
    const wild = ITEM_IDS.filter((id) => ITEMS[id].kind === "wild");
    expect(wild.length).toBe(35);
    for (const id of wild) {
      expect(ITEMS[id].tier).toBe(1);
      expect(FINDS).toContain(id);
    }
    // besides its own, the forest gives two things the uncle sells: a worm, and an egg he has not opened yet
    expect(FINDS.filter((id) => ITEMS[id].kind !== "wild").sort()).toEqual(["egg", "worm"]);
    // a toadstool is worth nothing to anybody; nothing else of the forest's is
    for (const id of wild) expect(ITEMS[id].pays > 0).toBe(id !== "toadstool");
    // universal, and a few of no country at all as the rare finds (the owner: "ใช้ของประเทศไหนก็ได้ หรือจะแฟนตาซีก็ได้")
    for (const id of ["glowMushroom", "mandrake", "moonflower", "starShard"] as const) expect(ITEMS[id].pays).toBeGreaterThanOrEqual(12);
  });

  it("can all be had: with empty hands, and what is dug with a hoe", () => {
    const bare = sources(["bowl"]);
    for (const k of SPOT_KINDS) for (const f of KINDS[k].finds) expect(bare.get(f.item) === "forest").toBe(KINDS[k].how !== "dig" || f.item === "egg" || bare.has(f.item));
    expect(bare.get("toadstool")).toBe("forest");
    expect(bare.has("truffle")).toBe(false);
    const dug = sources(["hoe"]);
    for (const id of ["bambooShoot", "wildYam", "truffle", "ginseng", "amber", "mandrake"] as const) expect(dug.get(id)).toBe("forest");
    // but what the uncle asks for never hangs on the forest (what he hints at may: a hint is only something heard)
    for (const stage of [0, 5, 80]) for (const [id, from] of sourcesAt(stage)) { expect(from).not.toBe("forest"); expect(ITEMS[id].kind).not.toBe("wild"); }
    expect(sourcesAt(0).has("egg")).toBe(false);
    expect(sourcesAt(0).has("mushroomSoup")).toBe(false);
    expect(sourcesAt(0, true).get("egg")).toBe("forest");
    expect(sourcesAt(0, true).get("mushroomSoup")).toBe("kitchen");
  });

  it("has every find's numbers in order", () => {
    for (const k of SPOT_KINDS) {
      const kind = KINDS[k];
      expect(kind.finds.length).toBeGreaterThan(0);
      expect(kind.chance).toBeGreaterThan(0);
      expect(kind.chance).toBeLessThanOrEqual(1);
      expect(kind.shares).toBeGreaterThanOrEqual(2);
      expect(kind.cost).toBeGreaterThanOrEqual(1);
      expect(kind.every).toBeGreaterThanOrEqual(10);
      for (const f of kind.finds) {
        expect(ITEM_IDS).toContain(f.item);
        expect(f.weight).toBeGreaterThan(0);
        expect(f.n[0]).toBeGreaterThanOrEqual(1);
        expect(f.n[1]).toBeGreaterThanOrEqual(f.n[0]);
        expect(f.n[1]).toBeLessThanOrEqual(ITEMS[f.item].stack);
        if (f.day) { expect(f.day).toBeGreaterThan(0); expect(f.day).toBeLessThan(1); }
      }
    }
    // what lies about comes every ten minutes; the rare things have a day, a night, a sky or the moon of their own
    expect(Math.min(...SPOT_KINDS.map((k) => KINDS[k].every))).toBe(10);
    const rare = SPOT_KINDS.flatMap((k) => KINDS[k].finds).filter((f) => ITEMS[f.item].pays >= 40);
    expect(rare.length).toBeGreaterThanOrEqual(7);
    for (const f of rare) expect(!!(f.day || f.moon || f.hours || f.rain) || f.weight <= 3).toBe(true);
    // a point of stamina spent in the forest earns about what one spent at the river does: the rare things apart, and
    // what waits for rain, which is worth going out in it for
    for (const k of SPOT_KINDS) for (const f of KINDS[k].finds) {
      if (ITEMS[f.item].pays >= 12 || ITEMS[f.item].kind !== "wild" || KINDS[k].every > 60 || f.rain || f.day || f.moon) continue;
      const coins = ITEMS[f.item].pays * (f.n[0] + f.n[1]) / 2 / KINDS[k].cost;
      expect(coins).toBeGreaterThanOrEqual(1);
      expect(coins).toBeLessThanOrEqual(4);
    }
  });
});

describe("the places things are found at", () => {
  it("are laid out over the whole forest, each where somebody can get to it", () => {
    expect(SPOTS.length).toBeGreaterThan(180);
    expect(SPOTS.map((s) => s.id)).toEqual(SPOTS.map((_, i) => i));
    const start = GATES.find((g) => g.leads === "forest")!.to;
    for (const s of SPOTS) {
      expect(placeOf(s.x, s.y)).toBe("forest");
      expect(s.zone).toBe(zoneAt(s.x, s.y));
      // a tree that bears is stood beside; anything else is stood on
      const stand: Array<[number, number]> = s.kind === "fruit" ? [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [s.x + dx, s.y + dy]) : [[s.x, s.y]];
      expect(walkable(s.x, s.y)).toBe(s.kind !== "fruit");
      expect(stand.some(([x, y]) => walkable(x, y) && reaches(s, [x, y]))).toBe(true);
      // every kind of thing there may be found somewhere
      expect(groundAt(s.x, s.y)).not.toBe("water");
    }
    // each is walked to from the gate (a few tried: the layout itself takes only tiles that are)
    for (const s of SPOTS.filter((_, i) => i % 23 === 0)) {
      const to = s.kind === "fruit" ? [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [s.x + dx, s.y + dy]).find(([x, y]) => walkable(x, y))! : [s.x, s.y];
      expect(findPath(start, { x: to[0] + 0.5, y: to[1] + 0.5 })).not.toBeNull();
    }
    // no two crowd each other, and none is at the gate or on the camp's logs
    for (const a of SPOTS) for (const b of SPOTS) if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(FORAGING.apart);
    for (const s of SPOTS) expect(s.y).toBeLessThan(FOREST.y + FOREST.h - 5);
    // every kind has places, and every find a place in a part of the forest it grows in
    for (const k of SPOT_KINDS) {
      const here = SPOTS.filter((s) => s.kind === k);
      expect(here.length).toBeGreaterThanOrEqual(5);
      for (const f of KINDS[k].finds) expect(here.some((s) => !f.zones || f.zones.includes(s.zone))).toBe(true);
    }
  });

  it("go in turns, each kind's as long as its own and each place's from its own minute", () => {
    const s = spotOf("sticks"), every = KINDS.sticks.every * MINUTE;
    const t = turnOf(s, NOON), from = turnStart(s, t);
    expect(from).toBeLessThanOrEqual(NOON);
    expect(from + every).toBeGreaterThan(NOON);
    expect(turnOf(s, from)).toBe(t);
    expect(turnOf(s, from - 1)).toBe(t - 1);
    expect(turnOf(s, from + every)).toBe(t + 1);
    // the forest never changes all at once: the sticks' turns begin at several different minutes
    const minutes = new Set(SPOTS.filter((x) => x.kind === "sticks").map((x) => (((turnStart(x, turnOf(x, NOON)) / MINUTE) % 10) + 10) % 10));
    expect(minutes.size).toBeGreaterThanOrEqual(6);
  });
});

describe("what a place has", () => {
  it("is the same for everybody through a turn, changes with the turn, and is nothing some of the time", () => {
    const s = spotOf("sticks"), from = turnStart(s, turnOf(s, NOON)), every = KINDS.sticks.every * MINUTE;
    expect(holds("word", s, from)).toEqual(holds("word", s, from + every - 1));
    const seen = over("word", s, from, 400);
    const some = seen.filter(Boolean) as Held[];
    expect(some.length / seen.length).toBeGreaterThan(KINDS.sticks.chance - 0.12);
    expect(some.length / seen.length).toBeLessThan(KINDS.sticks.chance + 0.12);
    // mostly twigs, now and then a feather; never what does not lie about
    const count = (id: ItemId) => some.filter((h) => h.item === id).length;
    expect(count("twig")).toBeGreaterThan(count("pineCone"));
    expect(count("pineCone")).toBeGreaterThan(count("feather"));
    expect(count("feather")).toBeGreaterThan(0);
    for (const h of some) { expect(KINDS.sticks.finds.map((f) => f.item)).toContain(h.item); expect(h.n).toBeGreaterThanOrEqual(1); expect(h.n).toBeLessThanOrEqual(2); }
    // and it hangs on the keeper's word: with another, another forest
    expect(JSON.stringify(over("other", s, from, 60))).not.toBe(JSON.stringify(over("word", s, from, 60)));
  });

  it("depends on the part of the forest", () => {
    const all = (kind: Spot["kind"], zone: Spot["zone"], rains = DRY, from = NOON) =>
      new Set(SPOTS.filter((s) => s.kind === kind && s.zone === zone).flatMap((s) => over("word", s, from, 200, rains)).filter(Boolean).map((h) => h!.item));
    expect([...all("greens", "rise")]).toEqual(["rosemary"]);
    expect([...all("greens", "stream")].sort()).toEqual(["fiddlehead", "mint"]);
    expect(all("berries", "rise").has("blueberry")).toBe(false);
    expect(all("fruit", "edge")).toEqual(new Set(["wildApple"]));
    expect(all("fruit", "deep").has("wildApple")).toBe(false);
    expect(all("mound", "bamboo", DRY, NOON - 6 * HOUR).has("bambooShoot")).toBe(true);
  });

  it("depends on the hour, the rain and the moon", () => {
    const deep = SPOTS.filter((s) => s.kind === "mushrooms" && s.zone === "deep");
    const found = (from: number, rains = DRY) => new Set(deep.flatMap((s) => over("word", s, from, 12, rains)).filter(Boolean).map((h) => h!.item));
    // by day and dry, only what always grows; after rain the mushrooms that wait for it; by night the ones that glow
    expect([...found(NOON)]).toEqual(["shiitake"]);
    expect(found(NOON, ALWAYS_RAIN).has("chanterelle")).toBe(true);
    expect(found(NOON, ALWAYS_RAIN).has("porcini")).toBe(true);
    expect(found(NOON, [[NOON - 3 * HOUR, NOON - 2 * HOUR]]).has("chanterelle")).toBe(true);
    expect(found(NOON, [[NOON - 30 * HOUR, NOON - 20 * HOUR]]).has("chanterelle")).toBe(false);
    expect(found(NOON + 10 * HOUR).has("glowMushroom")).toBe(true);
    expect(found(NOON).has("glowMushroom")).toBe(false);
    // bamboo shoots come up in the morning only
    const groves = SPOTS.filter((s) => s.kind === "mound" && s.zone === "bamboo");
    const shoots = (from: number) => groves.flatMap((s) => over("word", s, from, 4)).some((h) => h?.item === "bambooShoot");
    expect(shoots(NOON - 5 * HOUR)).toBe(true);
    expect(shoots(NOON + 3 * HOUR)).toBe(false);
    // the moonflower opens in the deep woods on the nights of a full moon, and on no other
    const glades = SPOTS.filter((s) => s.kind === "flowers" && s.zone === "deep");
    expect(glades.length).toBeGreaterThan(0);
    const full = Array.from({ length: 40 }, (_, d) => NOON + 10 * HOUR + d * 24 * HOUR).filter(fullMoon);
    expect(full.length).toBeGreaterThanOrEqual(1);
    expect(full.length).toBeLessThanOrEqual(6);
    const blooms = (night: number) => glades.flatMap((s) => over("word", s, night, 12)).some((h) => h?.item === "moonflower");
    for (const night of full) expect(blooms(night)).toBe(true);
    for (let d = 0; d < 40; d++) { const night = NOON + 10 * HOUR + d * 24 * HOUR; if (!fullMoon(night) && !fullMoon(night + 2 * HOUR)) expect(blooms(night)).toBe(false); }
    expect(blooms(full[0] - 10 * HOUR)).toBe(false);
  });

  it("has its rare things only on days of their own: about one in four for a truffle, by the keeper's word", () => {
    const days = Array.from({ length: 400 }, (_, d) => NOON + d * 24 * HOUR);
    const truffle = days.filter((t) => isDayOf("word", "truffle", 0.25, t)).length;
    expect(truffle).toBeGreaterThan(70);
    expect(truffle).toBeLessThan(130);
    // the whole day long, from dawn to dawn, and not the same days for another thing or another word
    expect(isDayOf("word", "truffle", 0.25, NOON)).toBe(isDayOf("word", "truffle", 0.25, NOON + 11 * HOUR));
    expect(days.map((t) => isDayOf("word", "truffle", 0.25, t)).join()).not.toBe(days.map((t) => isDayOf("word", "wildOrchid", 0.25, t)).join());
    expect(days.map((t) => isDayOf("word", "truffle", 0.25, t)).join()).not.toBe(days.map((t) => isDayOf("other", "truffle", 0.25, t)).join());
    // on a day that is not a truffle's, no mound has one; on one that is, some do
    const mounds = SPOTS.filter((s) => s.kind === "mound" && s.zone === "deep");
    const dug = (day: number) => mounds.flatMap((s) => over("word", s, day, 40)).some((h) => h?.item === "truffle");
    const yes = days.find((t) => isDayOf("word", "truffle", 0.25, t))!, noDay = days.find((t) => !isDayOf("word", "truffle", 0.25, t))!;
    expect(dug(yes)).toBe(true);
    expect(dug(noDay)).toBe(false);
    // a star falls on few nights, and is looked for in the deep woods' glades
    expect(KINDS.glint.finds[0].day).toBeLessThan(0.3);
    expect(SPOTS.filter((s) => s.kind === "glint").every((s) => s.zone === "deep")).toBe(true);
  });
});

describe("gathering", () => {
  const s = spotOf("mushrooms"), has: Held = { turn: 1, item: "shiitake", n: 2 }, at: [number, number] = [s.x, s.y], clean = { misses: 0, wrong: 0 };

  it("puts what a place has in the bag, for the stamina it costs", () => {
    const did = gather(newPurse(), s, has, 0, false, null, at, clean, NOON);
    expect(did.ok && did.got).toEqual([["shiitake", 2]]);
    expect(did.ok && held(did.purse.bag, "shiitake")).toBe(2);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - KINDS.mushrooms.cost);
    // every miss of its game is one fewer, never none
    const missed = gather(newPurse(), s, has, 0, false, null, at, { misses: 1, wrong: 0 }, NOON);
    expect(missed.ok && missed.got).toEqual([["shiitake", 1]]);
    const all = gather(newPurse(), s, has, 0, false, null, at, { misses: 9, wrong: 0 }, NOON);
    expect(all.ok && all.got).toEqual([["shiitake", 1]]);
    // among mushrooms a wrong one taken is a toadstool besides, two at the most
    const wrong = gather(newPurse(), s, has, 0, false, null, at, { misses: 0, wrong: 5 }, NOON);
    expect(wrong.ok && wrong.got).toEqual([["shiitake", 2], ["toadstool", 2]]);
    const herbs = spotOf("greens");
    const picked = gather(newPurse(), herbs, { turn: 1, item: "mint", n: 2 }, 0, false, null, [herbs.x, herbs.y], { misses: 0, wrong: 3 }, NOON);
    expect(picked.ok && picked.got).toEqual([["mint", 2]]);
    // with no stamina left it is done all the same
    const tired = { ...newPurse(), stamina: { day: Math.floor((NOON + 2 * HOUR) / (24 * HOUR)), left: 0 } };
    expect(gather(tired, s, has, 0, false, null, at, clean, NOON).ok).toBe(true);
  });

  it("is for several, and each takes once", () => {
    expect(gather(newPurse(), s, has, KINDS.mushrooms.shares - 1, false, null, at, clean, NOON).ok).toBe(true);
    expect(gather(newPurse(), s, has, KINDS.mushrooms.shares, false, null, at, clean, NOON)).toEqual({ ok: false, why: "bare" });
    expect(gather(newPurse(), s, has, 1, true, null, at, clean, NOON)).toEqual({ ok: false, why: "had" });
    expect(gather(newPurse(), s, null, 0, false, null, at, clean, NOON)).toEqual({ ok: false, why: "none" });
  });

  it("is done from beside the place, with a hoe in the hand for what is dug, and room in the bag", () => {
    expect(gather(newPurse(), s, has, 0, false, null, [s.x + 1, s.y - 1], clean, NOON).ok).toBe(true);
    expect(gather(newPurse(), s, has, 0, false, null, [s.x + 2, s.y], clean, NOON)).toEqual({ ok: false, why: "far" });
    const mound = spotOf("mound"), yam: Held = { turn: 1, item: "wildYam", n: 2 }, there: [number, number] = [mound.x, mound.y];
    expect(gather(newPurse(), mound, yam, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "tool" });
    expect(gather(newPurse(), mound, yam, 0, false, "rod", there, clean, NOON)).toEqual({ ok: false, why: "tool" });
    const dug = gather(bagOf(["hoe", 1]), mound, yam, 0, false, "hoe", there, clean, NOON);
    expect(dug.ok && dug.got).toEqual([["wildYam", 2]]);
    expect(dug.ok && staminaOf(dug.purse, NOON)).toBe(100 - KINDS.mound.cost);
    expect(mayGather("mound", "hoeSteel")).toBe(true);
    expect(mayGather("mound", null)).toBe(false);
    expect(mayGather("sticks", null)).toBe(true);
    expect(mayGather("fruit", "rod")).toBe(true);
    // a full bag takes nothing, and nothing is spent
    const full = { ...newPurse(), bag: newPurse().bag.map(() => ({ item: "rod" as ItemId, n: 1 })) };
    expect(gather(full, s, has, 0, false, null, at, clean, NOON)).toEqual({ ok: false, why: "full" });
    // (room for the mushrooms but none for the toadstools taken with them: nothing either)
    const nearly = { ...full, bag: full.bag.map((slot, i) => (i ? slot : null)) };
    expect(gather(nearly, s, has, 0, false, null, at, { misses: 0, wrong: 1 }, NOON)).toEqual({ ok: false, why: "full" });
    expect(gather(nearly, s, has, 0, false, null, at, clean, NOON).ok).toBe(true);
  });

  it("is a game of its own for each way of gathering; picking up is none, but with no stamina", () => {
    expect(gameFor("choose", false)).toBe("choosing");
    expect(gameFor("dig", false)).toBe("digging");
    expect(gameFor("shake", true)).toBe("catching");
    expect(gameFor("pick", false)).toBeNull();
    expect(gameFor("pick", true)).toBe("steady");
    expect(new Set(SPOT_KINDS.map((k) => KINDS[k].how))).toEqual(new Set(["pick", "choose", "dig", "shake"]));
  });
});

describe("what is made of the forest's things", () => {
  /** What only the forest gives: everything that can be had with it and cannot without. */
  const wild = new Set(ITEM_IDS.filter((id) => sources().get(id) === "forest"));
  /** The dishes that have one of those in them. */
  const dishes = DISH_IDS.filter((id) => DISHES[id].recipe?.needs.some(([n]) => wild.has(n)));

  it("a skewer is whittled from two twigs by hand, and is cookware", () => {
    const did = cook(bagOf(["twig", 2]), [["twig", 2]], [null], 0, NOON);
    expect(did.ok && did.made).toBe("skewer");
    expect(did.ok && held(did.purse.bag, "skewer")).toBe(1);
    expect(isCookware("skewer")).toBe(true);
    expect(MAKES.skewer!.in).toEqual([]);
  });

  it("with the skewer in the hand a dish is roasted on it; with bare hands the same things come to nothing", () => {
    const things: Array<[ItemId, number]> = [["salt", 1], ["shiitake", 2]];
    const mine = bagOf(["skewer", 1], ...things);
    const roasted = cook(mine, things, ["skewer"], 0, NOON);
    expect(roasted.ok && roasted.made).toBe("mushroomSkewer");
    expect(roasted.ok && held(roasted.purse.bag, "skewer")).toBe(1);
    const bare = cook(mine, things, [null], 0, NOON);
    expect(bare.ok && bare.made).toBeNull();
    // (and whoever cooks it in a pot has a pot of the odd dish)
    const potted = cook(bagOf(["pot", 1], ...things), things, ["pot"], 0, NOON);
    expect(potted.ok && potted.made).toBe("oddDish");
  });

  it("four dishes take nothing bought but salt: somebody with no coins can eat", () => {
    const roasts = DISH_IDS.filter((id) => DISHES[id].recipe?.in.includes("skewer"));
    expect(roasts).toHaveLength(4);
    for (const id of roasts) {
      const r = DISHES[id].recipe!;
      expect(r.in, id).toEqual(["skewer"]);
      expect(r.cooks, id).toBe(1);
      expect(r.needs.filter(([n]) => n !== "salt").every(([n]) => wild.has(n) || sourcesAt(0).get(n) === "river"), id).toBe(true);
    }
  });

  it("every dish of the forest keeps the forest's own thing for last: what a found recipe does not name", () => {
    // (seventeen; the eighteenth, a fish on a stick, has nothing of the forest in it but the stick)
    expect(dishes.length).toBe(17);
    for (const id of dishes) expect(wild.has(DISHES[id].recipe!.needs.at(-1)![0]), id).toBe(true);
    expect(DISHES.fishOnStick.recipe!.needs.some(([n]) => wild.has(n))).toBe(false);
  });

  it("mulch feeds a plant and a sachet of lavender guards one; a feather floats and silk is a line", () => {
    expect(PUT_ON.mulch).toBe("feed");
    expect(PUT_ON.lavenderSachet).toBe("guard");
    expect(gearOf(bagOf(["floatFeather", 1]).bag, null).strike).toBeGreaterThan(PLAIN.strike);
    expect(gearOf(bagOf(["lineSpun", 1]).bag, null).snap).toBeGreaterThan(PLAIN.snap);
    for (const id of ["skewer", "floatFeather", "lineSpun", "mulch", "lavenderSachet"] as ItemId[]) {
      expect(MAKES[id]!.in, id).toEqual([]);
      expect(MAKES[id]!.needs.some(([n]) => wild.has(n)), id).toBe(true);
    }
  });

  it("the uncle never asks for anything of the forest, or made of it, however far his shelf has opened", () => {
    const made = new Set<ItemId>([...dishes, ...(Object.keys(MAKES) as ItemId[]).filter((id) => MAKES[id]!.needs.some(([n]) => wild.has(n)))]);
    for (let open = 0; open <= UNLOCKS.length; open++) {
      const ask = mayAsk(open);
      for (const id of [...ask.fish, ...ask.crop, ...ask.made]) expect(wild.has(id) || made.has(id), `${id} at ${open}`).toBe(false);
      for (const id of wild) expect(sourcesAt(open).has(id), `${id} at ${open}`).toBe(false);
    }
  });

  it("but he may hint at them: a hint is only something heard", () => {
    for (const id of dishes) expect(sourcesAt(UNLOCKS.length, true).get(id), id).toBe("kitchen");
    // (the four roasted on a stick can be made on the first day, by whoever has salt)
    expect(sourcesAt(0, true).get("mushroomSkewer")).toBe("kitchen");
  });
});
