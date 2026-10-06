import { describe, expect, it } from "vitest";
import { FORAGING, KINDS, SPOTS, costFor, fetches, gather, reachOf, reaches, type Held, type Spot } from "./forest";
import { giftOf } from "./gifts";
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
