import { describe, expect, it } from "vitest";
import { dug, dugUp, startDig, strike } from "./digging";
import { FORAGING, KINDS, SPOTS, costFor, fetches, gather, pigletDigs, reachOf, reaches, type Held, type Spot } from "./forest";
import { USES, giftOf, numberOf, stretchOf, usedOf, usesLeft } from "./gifts";
import type { ItemId } from "./items";
import { dayOf, staminaOf } from "./stamina";
import { held, newPurse, type Purse } from "./trade";

/**
 * The gifts of the forest's ranks (lib/town/gifts), as the forest's own rules have them: what each changes of a
 * gathering, for whom, and what it leaves as it is for everybody else.
 */

/** 2026-10-05 12:00 in Bangkok. */
const NOON = Date.UTC(2026, 9, 5, 5);
const spotOf = (kind: Spot["kind"], zone?: Spot["zone"]) => SPOTS.find((s) => s.kind === kind && (!zone || s.zone === zone))!;
const clean = { misses: 0, wrong: 0 };
/** A purse with these gifts had, this familiar following and these charms worn. */
const withGifts = (had: string[], familiar: string | null = null, charms: string[] = [], more: Partial<Purse> = {}): Purse =>
  ({ ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, gifts: { had, charms, familiar }, ...more });

describe("the squirrel (the forest's second rank): it fetches what lies on the ground as its member walks past", () => {
  const sticks = spotOf("sticks"), twigs: Held = { turn: 1, item: "twig", n: 2 };
  const squirrel = withGifts(["famSquirrel"], "famSquirrel"), bare = withGifts([]);

  it("fetches only what is picked up with no game, and only while it follows", () => {
    expect(fetches(squirrel, "pick")).toBe(true);
    for (const how of ["choose", "dig", "shake"] as const) expect(fetches(squirrel, how)).toBe(false);
    expect(fetches(bare, "pick")).toBe(false);
    // (had, and at rest: nothing)
    expect(fetches(withGifts(["famSquirrel"]), "pick")).toBe(false);
    // (another familiar at the heels: nothing)
    expect(fetches(withGifts(["famSquirrel", "famGnome"], "famGnome"), "pick")).toBe(false);
    // (said to follow, and never taken: nothing)
    expect(fetches(withGifts([], "famSquirrel"), "pick")).toBe(false);
    expect(reachOf(squirrel, "pick")).toBe(FORAGING.squirrel);
    expect(reachOf(squirrel, "choose")).toBe(FORAGING.reach);
    expect(reachOf(bare, "pick")).toBe(FORAGING.reach);
    expect(FORAGING.squirrel).toBeGreaterThan(FORAGING.reach);
    expect(costFor(squirrel, KINDS.sticks)).toBe(0);
    expect(costFor(squirrel, KINDS.mushrooms)).toBe(KINDS.mushrooms.cost);
    expect(costFor(bare, KINDS.sticks)).toBe(KINDS.sticks.cost);
  });

  it("from as far as it runs, for none of its member's stamina", () => {
    const far: [number, number] = [sticks.x + FORAGING.squirrel, sticks.y - FORAGING.squirrel];
    expect(reaches(sticks, far)).toBe(false);
    expect(reaches(sticks, far, FORAGING.squirrel)).toBe(true);
    // by hand, from there: too far
    expect(gather(bare, sticks, twigs, 0, false, null, far, clean, NOON)).toEqual({ ok: false, why: "far" });
    const did = gather(squirrel, sticks, twigs, 0, false, null, far, clean, NOON);
    expect(did.ok && did.got).toEqual([["twig", 2]]);
    expect(did.ok && held(did.purse.bag, "twig")).toBe(2);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100);
    // by hand, standing at it: the stamina it costs, as ever
    const hand = gather(bare, sticks, twigs, 0, false, null, [sticks.x, sticks.y], clean, NOON);
    expect(hand.ok && staminaOf(hand.purse, NOON)).toBe(100 - KINDS.sticks.cost);
    // and not from further than it runs
    expect(gather(squirrel, sticks, twigs, 0, false, null, [sticks.x + FORAGING.squirrel + 1, sticks.y], clean, NOON)).toEqual({ ok: false, why: "far" });
  });

  it("with no stamina left it fetches all the same, and nothing is taken from nothing", () => {
    const tired = withGifts(["famSquirrel"], "famSquirrel", [], { stamina: { day: dayOf(NOON), left: 0 } });
    const did = gather(tired, sticks, twigs, 0, false, null, [sticks.x + 2, sticks.y], clean, NOON);
    expect(did.ok && did.got).toEqual([["twig", 2]]);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(0);
  });

  it("as by hand for the rest: a heap's shares, each once a turn, room in the bag", () => {
    const there: [number, number] = [sticks.x + 1, sticks.y + 2];
    expect(gather(squirrel, sticks, twigs, KINDS.sticks.shares, false, null, there, clean, NOON)).toEqual({ ok: false, why: "bare" });
    expect(gather(squirrel, sticks, twigs, 1, true, null, there, clean, NOON)).toEqual({ ok: false, why: "had" });
    expect(gather(squirrel, sticks, null, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "none" });
    const full = { ...squirrel, bag: squirrel.bag.map(() => ({ item: "rod" as ItemId, n: 1 })) };
    expect(gather(full, sticks, twigs, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "full" });
  });

  it("what grows, is buried or hangs is still its member's to gather, standing at it, for its stamina", () => {
    const shrooms = spotOf("mushrooms"), has: Held = { turn: 1, item: "shiitake", n: 2 };
    expect(gather(squirrel, shrooms, has, 0, false, null, [shrooms.x + 2, shrooms.y], clean, NOON)).toEqual({ ok: false, why: "far" });
    const did = gather(squirrel, shrooms, has, 0, false, null, [shrooms.x + 1, shrooms.y], clean, NOON);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - KINDS.mushrooms.cost);
  });

  it("is said on the gift in both languages", () => {
    const g = giftOf("famSquirrel")!;
    expect(g.does.th).toMatch(/เก็บ/);
    expect(g.does.en).toMatch(/fetch/);
  });
});

describe("the truffle piglet (the forest's third rank): no hoe, no bruise, one more from every hole, so many holes to a meal's hours", () => {
  const mound = spotOf("mound"), yam: Held = { turn: 1, item: "wildYam", n: 2 }, there: [number, number] = [mound.x, mound.y];
  const piglet = withGifts(["famPiglet"], "famPiglet"), asked = { misses: 0, wrong: 0, with: "famPiglet" };
  const usedUp = (n: number): Purse => ({ ...piglet, gifts: { ...piglet.gifts!, used: { famPiglet: { k: stretchOf(USES.famPiglet!, NOON), n } } } });

  it("digs while it follows and has a hole left to these hours", () => {
    expect(USES.famPiglet).toEqual({ n: 10, per: "meal" });
    expect(pigletDigs(piglet, NOON)).toBe(true);
    expect(pigletDigs(withGifts(["famPiglet"]), NOON)).toBe(false);
    expect(pigletDigs(withGifts(["famPiglet", "famSquirrel"], "famSquirrel"), NOON)).toBe(false);
    expect(pigletDigs(withGifts([], "famPiglet"), NOON)).toBe(false);
    expect(pigletDigs(usedUp(9), NOON)).toBe(true);
    expect(pigletDigs(usedUp(10), NOON)).toBe(false);
    // (the next meal's hours: its holes are whole again)
    expect(pigletDigs(usedUp(10), NOON + 6 * 3_600_000)).toBe(true);
  });

  it("with no hoe held, and one more comes out of the hole; the hole is one of its count", () => {
    const did = gather(piglet, mound, yam, 0, false, null, there, asked, NOON);
    expect(did.ok && did.got).toEqual([["wildYam", 2 + numberOf("famPiglet")]]);
    expect(did.ok && held(did.purse.bag, "wildYam")).toBe(3);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - KINDS.mound.cost);
    expect(did.ok && usedOf(did.purse, "famPiglet", NOON)).toBe(1);
    expect(did.ok && usesLeft(did.purse, "famPiglet", NOON)).toBe(9);
    // a thing that comes one at a time comes two
    const truffle = gather(piglet, mound, { turn: 1, item: "truffle", n: 1 }, 0, false, null, there, asked, NOON);
    expect(truffle.ok && truffle.got).toEqual([["truffle", 2]]);
    // what its game left under the earth is still left: one fewer for each, never none, and the one more besides
    const badly = gather(piglet, mound, yam, 0, false, null, there, { ...asked, misses: 1 }, NOON);
    expect(badly.ok && badly.got).toEqual([["wildYam", 2]]);
    const worst = gather(piglet, mound, yam, 0, false, null, there, { ...asked, misses: 7 }, NOON);
    expect(worst.ok && worst.got).toEqual([["wildYam", 2]]);
  });

  it("is asked for: with a hoe in the hand and the piglet at the heels, the hoe's way is as for anybody", () => {
    const both: Purse = { ...piglet, hand: "hoe" as ItemId };
    const plain = gather(both, mound, yam, 0, false, "hoe", there, clean, NOON);
    expect(plain.ok && plain.got).toEqual([["wildYam", 2]]);
    expect(plain.ok && usedOf(plain.purse, "famPiglet", NOON)).toBe(0);
    const pig = gather(both, mound, yam, 0, false, "hoe", there, asked, NOON);
    expect(pig.ok && pig.got).toEqual([["wildYam", 3]]);
    expect(pig.ok && usedOf(pig.purse, "famPiglet", NOON)).toBe(1);
    // and with neither a hoe nor the asking, nothing digs
    expect(gather(piglet, mound, yam, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "tool" });
  });

  it("past its count, or not at the heels, it is refused and nothing is lost: digging is as for anybody", () => {
    expect(gather(usedUp(10), mound, yam, 0, false, null, there, asked, NOON)).toEqual({ ok: false, why: "spent" });
    expect(gather(usedUp(10), mound, yam, 0, false, "hoe", there, asked, NOON)).toEqual({ ok: false, why: "spent" });
    const hoe = gather({ ...usedUp(10), hand: "hoe" as ItemId }, mound, yam, 0, false, "hoe", there, clean, NOON);
    expect(hoe.ok && hoe.got).toEqual([["wildYam", 2]]);
    expect(gather(withGifts(["famPiglet"]), mound, yam, 0, false, null, there, asked, NOON)).toEqual({ ok: false, why: "none" });
    expect(gather(withGifts([]), mound, yam, 0, false, null, there, asked, NOON)).toEqual({ ok: false, why: "none" });
    const last = gather(usedUp(9), mound, yam, 0, false, null, there, asked, NOON);
    expect(last.ok && usesLeft(last.purse, "famPiglet", NOON)).toBe(0);
  });

  it("is the piglet's only where something is dug; and the rest of a gathering is as ever", () => {
    // (asked for at a place that is not dug: the asking is nothing, and no hole is counted)
    const shrooms = spotOf("mushrooms"), did = gather(piglet, shrooms, { turn: 1, item: "shiitake", n: 2 }, 0, false, null, [shrooms.x, shrooms.y], asked, NOON);
    expect(did.ok && did.got).toEqual([["shiitake", 2]]);
    expect(did.ok && usedOf(did.purse, "famPiglet", NOON)).toBe(0);
    expect(gather(piglet, mound, yam, 0, false, null, [mound.x + 2, mound.y], asked, NOON)).toEqual({ ok: false, why: "far" });
    expect(gather(piglet, mound, yam, KINDS.mound.shares, false, null, there, asked, NOON)).toEqual({ ok: false, why: "bare" });
    expect(gather(piglet, mound, yam, 0, true, null, there, asked, NOON)).toEqual({ ok: false, why: "had" });
    // (no room for the one more: nothing, and no hole counted)
    const tight: Purse = { ...piglet, bag: piglet.bag.map((_, i) => (i ? { item: "rod" as ItemId, n: 1 } : { item: "wildYam" as ItemId, n: 18 })) };
    expect(gather(tight, mound, yam, 0, false, null, there, asked, NOON)).toEqual({ ok: false, why: "full" });
    expect(gather({ ...tight, hand: "hoe" as ItemId }, mound, yam, 0, false, "hoe", there, clean, NOON).ok).toBe(true);
  });

  it("its snout bruises nothing: a part rooted at again is only a root gone, and what is left under the earth is still left", () => {
    for (let seed = 1; seed < 60; seed++) {
      let plain = startDig(2, false, seed), soft = startDig(2, false, seed, false, { gentle: true });
      expect(soft.cells).toEqual(plain.cells);
      expect(soft.strokes).toBe(plain.strokes);
      const part = plain.cells.findIndex((c) => c.over), earth = plain.cells[part].earth;
      for (let i = 0; i <= earth; i++) { plain = strike(plain, part); soft = strike(soft, part); }
      // (the last of those fell on a part already bare)
      expect(plain.misses).toBe(1);
      expect(soft.misses).toBe(0);
      expect(soft.strokes).toBe(plain.strokes);
      expect(soft.hits).toBe(plain.hits);
    }
    // every stroke thrown away where nothing lies: the strokes run out, and what is under the earth stays there
    let d = startDig(2, false, 5, false, { gentle: true });
    const empty = d.cells.findIndex((c) => !c.over);
    while (!dug(d)) d = strike(d, empty);
    expect(dugUp(d)).toEqual({ hits: 0, misses: d.need });
  });
});
