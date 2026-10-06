import { describe, expect, it } from "vitest";
import { CATCHING, startShower } from "./catching";
import { CHOOSING, dimmed, startBunch } from "./choosing";
import { DIGGING, dug, dugUp, startDig, strike } from "./digging";
import {
  FORAGING, KINDS, SECRETS, SECRET_KINDS, SECRET_KIND_IDS, SPOTS, WILD_TIERS, costFor, fetches, gamesOf, gather, harderOf, holds, isSecret, lanternLit, pigletDigs, placeAt, reachOf, reaches,
  ruleOf, sights, turnOf, turnStart, wildTier, type Held, type Spot,
} from "./forest";
import { HARDER, USES, giftOf, harderAt, numberOf, stretchOf, usedOf, usesLeft } from "./gifts";
import { HAUNTS } from "./insects";
import { ITEMS, ITEM_IDS, type ItemId } from "./items";
import { LINES } from "./lines";
import { DRY } from "./weather";
import { FOREST_PROPS, GATES, findPath, zoneAt } from "./world";
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

describe("the firefly lantern (the forest's fourth rank): what every place holds, at any hour, and the secret places of the deep woods", () => {
  const lit = withGifts(["charmFirefly"], null, ["charmFirefly"]), unlit = withGifts(["charmFirefly"]), nobody = () => ({ n: 0, mine: false });
  /** A moment at which every secret place has something, under this word: found by looking. */
  const WORD = "lantern";
  const whenAll = (() => { for (let t = NOON; t < NOON + 400 * 3_600_000; t += 1_800_000) if (SECRETS.every((s) => holds(WORD, s, t))) return t; throw new Error("no such moment"); })();

  it("is lit while it is worn", () => {
    expect(lanternLit(lit)).toBe(true);
    expect(lanternLit(unlit)).toBe(false);
    expect(lanternLit(withGifts([], null, ["charmFirefly"]))).toBe(false);
    expect(lanternLit(withGifts(["charmFirefly", "charmLamp"], null, ["charmLamp"]))).toBe(false);
    expect(giftOf("charmFirefly")).toMatchObject({ kind: "charm", line: "forest", rank: 4 });
  });

  it("there are six secret places, in the deep woods, away from every other place and far from each other", () => {
    expect(SECRETS.length).toBe(6);
    expect(SECRETS.filter((s) => s.kind === "ring").length).toBe(3);
    expect(SECRETS.filter((s) => s.kind === "bough").length).toBe(3);
    expect(SECRETS.map((s) => s.id)).toEqual(SECRETS.map((_, i) => SPOTS.length + i));
    const from = GATES.find((g) => g.leads === "forest")!.to;
    for (const s of SECRETS) {
      expect(zoneAt(s.x, s.y)).toBe("deep");
      expect(s.zone).toBe("deep");
      expect(isSecret(s.id)).toBe(true);
      expect(placeAt(s.id)).toBe(s);
      for (const o of SPOTS) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThanOrEqual(FORAGING.apart);
      for (const o of SECRETS) if (o !== s) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThanOrEqual(9);
      // a ring is stood on; a bough is on one of the forest's own trees, with open ground beside it
      const stand = s.kind === "ring" ? [[0, 0]] : [[1, 0], [0, 1], [-1, 0], [0, -1]];
      expect(stand.some(([dx, dy]) => findPath(from, { x: s.x + dx + 0.5, y: s.y + dy + 0.5 }) !== null)).toBe(true);
      if (s.kind === "bough") expect(FOREST_PROPS.some((p) => p.x === s.x && p.y === s.y && (p.kind === "oak" || p.kind === "pine"))).toBe(true);
      // (and no insect's perch is on one)
      expect(HAUNTS.some((h) => h.perches.some((p) => Math.floor(p.x) === s.x && Math.floor(p.y) === s.y))).toBe(false);
    }
    for (const id of [-1, SPOTS.length + SECRETS.length, 99999]) { expect(isSecret(id)).toBe(false); expect(placeAt(id)).toBeNull(); }
    expect(isSecret(SPOTS.length - 1)).toBe(false);
    expect(placeAt(0)).toBe(SPOTS[0]);
  });

  it("each kind takes two games running, holds only good things, and turns as slowly as an afternoon", () => {
    expect(SECRET_KIND_IDS).toEqual(["ring", "bough"]);
    expect(gamesOf({ kind: "ring" })).toEqual(["choose", "dig"]);
    expect(gamesOf({ kind: "bough" })).toEqual(["shake", "choose"]);
    expect(gamesOf({ kind: "mound" })).toBeNull();
    for (const k of SECRET_KIND_IDS) {
      const rule = SECRET_KINDS[k];
      expect(rule.then).not.toBe(rule.how);
      expect(rule.how).not.toBe("pick");
      expect(rule.then).not.toBe("pick");
      expect(rule.every).toBeGreaterThanOrEqual(240);
      expect(rule.chance).toBeLessThanOrEqual(0.5);
      expect(rule.cost).toBeGreaterThan(Math.max(...Object.values(KINDS).map((x) => x.cost)));
      expect(ruleOf({ kind: k })).toBe(rule);
      for (const f of rule.finds) {
        expect(ITEM_IDS).toContain(f.item);
        expect(wildTier(f.item)).not.toBe("common");
        expect(f.n[1]).toBeLessThanOrEqual(3);
        // (nothing there is new to the forest: every one of them is found somewhere by everybody too)
        expect(Object.values(KINDS).some((x) => x.finds.some((o) => o.item === f.item))).toBe(true);
      }
      // (at any hour and under any sky something may be there: a find or two wait for nothing)
      expect(rule.finds.filter((f) => !f.hours && !f.moon && !f.rain && !f.day).length).toBeGreaterThanOrEqual(2);
    }
    expect(ruleOf(SPOTS[0])).toBe(KINDS[SPOTS[0].kind]);
  });

  it("what a secret place has is rolled as every place's is: the same for everybody through a turn, nothing about half the time", () => {
    const s = SECRETS[0], every = SECRET_KINDS[s.kind].every * 60_000;
    let some = 0;
    for (let i = 0; i < 400; i++) {
      const t = NOON + i * every, has = holds(WORD, s, t);
      if (!has) continue;
      some++;
      expect(holds(WORD, s, turnStart(s, has.turn) + 1)).toEqual(has);
      expect(holds(WORD, s, turnStart(s, has.turn + 1) - 1)).toEqual(has);
      expect(has.turn).toBe(turnOf(s, t));
      expect(SECRET_KINDS[s.kind].finds.some((f) => f.item === has.item && has.n >= f.n[0] && has.n <= f.n[1])).toBe(true);
    }
    expect(some).toBeGreaterThan(150);
    expect(some).toBeLessThan(250);
    // (by another word, another forest)
    expect(Array.from({ length: 60 }, (_, i) => JSON.stringify(holds("other", s, NOON + i * every))).join()).not.toBe(Array.from({ length: 60 }, (_, i) => JSON.stringify(holds(WORD, s, NOON + i * every))).join());
  });

  it("without it nobody is told of a secret place, nor what lies buried; with it both are seen", () => {
    const plain = sights(WORD, whenAll, DRY, nobody), seen = sights(WORD, whenAll, DRY, nobody, true);
    expect(plain.some((x) => isSecret(x.id))).toBe(false);
    expect(plain.filter((x) => KINDS[SPOTS[x.id].kind].how === "dig").every((x) => x.item === null)).toBe(true);
    expect(plain.some((x) => x.item === null)).toBe(true);
    expect(seen.filter((x) => isSecret(x.id)).map((x) => x.id)).toEqual(SECRETS.map((s) => s.id));
    expect(seen.every((x) => x.item !== null)).toBe(true);
    // the places everybody has are the same places either way, and what is not buried is told the same
    expect(seen.filter((x) => !isSecret(x.id)).map((x) => [x.id, x.n])).toEqual(plain.map((x) => [x.id, x.n]));
    for (const x of plain) if (x.item) expect(seen.find((y) => y.id === x.id)!.item).toBe(x.item);
    for (const x of seen) expect(x.item).toBe(holds(WORD, placeAt(x.id)!, whenAll)!.item);
    // (a secret place I have taken from, or others have had the last of, is left out as any place is)
    const first = SECRETS[0].id;
    expect(sights(WORD, whenAll, DRY, (spot) => ({ n: 1, mine: spot.id === first }), true).some((x) => x.id === first)).toBe(false);
    expect(sights(WORD, whenAll, DRY, (spot) => ({ n: spot.id === first ? SECRET_KINDS.bough.shares : 0, mine: false }), true).some((x) => x.id === first)).toBe(false);
  });

  it("a secret place gives only to whoever wears the lantern, and all it has when both its games are won", () => {
    const s = SECRETS.find((x) => x.kind === "ring")!, has: Held = { turn: 3, item: "truffle", n: 2 }, there: [number, number] = [s.x, s.y];
    expect(gather(unlit, s, has, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "none" });
    expect(gather(withGifts([]), s, has, 0, false, "hoe", there, clean, NOON)).toEqual({ ok: false, why: "none" });
    const did = gather(lit, s, has, 0, false, null, there, clean, NOON);
    expect(did.ok && did.got).toEqual([["truffle", 2]]);
    expect(did.ok && did.lost).toBeUndefined();
    expect(did.ok && held(did.purse.bag, "truffle")).toBe(2);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - SECRET_KINDS.ring.cost);
    // (it is in my record of the secret places, once, in their order)
    expect(did.ok && did.purse.forest).toEqual({ secrets: [s.id] });
    const again = gather({ ...lit, forest: { secrets: [SECRETS[5].id, s.id] } }, s, has, 0, false, null, there, clean, NOON);
    expect(again.ok && again.purse.forest).toEqual({ secrets: [SECRETS[5].id, s.id] });
    const more = gather({ ...lit, forest: { secrets: [SECRETS[5].id] } }, s, has, 0, false, null, there, clean, NOON);
    expect(more.ok && more.purse.forest).toEqual({ secrets: [s.id, SECRETS[5].id].sort((a, b) => a - b) });
    // a bough is gathered from beside its tree, with any hand
    const b = SECRETS.find((x) => x.kind === "bough")!;
    const shaken = gather(lit, b, { turn: 1, item: "amber", n: 1 }, 0, false, "rod", [b.x + 1, b.y], clean, NOON);
    expect(shaken.ok && shaken.got).toEqual([["amber", 1]]);
  });

  it("fail either game, or leave them, and the turn there is spent with nothing got", () => {
    const s = SECRETS.find((x) => x.kind === "ring")!, has: Held = { turn: 3, item: "ginseng", n: 1 }, there: [number, number] = [s.x, s.y];
    for (const play of [{ misses: 1, wrong: 0 }, { misses: 0, wrong: 1 }, { misses: 3, wrong: 2 }, { misses: 0, wrong: 0, lost: true }]) {
      const did = gather(lit, s, has, 0, false, null, there, play, NOON);
      expect(did.ok && did.lost).toBe(true);
      expect(did.ok && did.got).toEqual([]);
      expect(did.ok && did.purse.bag).toEqual(lit.bag);
      expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - SECRET_KINDS.ring.cost);
      expect(did.ok && did.purse.forest).toBeUndefined();
    }
    // (a part of a miss is none, as everywhere)
    expect(gather(lit, s, has, 0, false, null, there, { misses: 0.9, wrong: 0 }, NOON)).toMatchObject({ ok: true, got: [["ginseng", 1]] });
    // lost even with a full bag; won, a full bag takes nothing and nothing is spent, so that one comes back
    const full = { ...lit, bag: lit.bag.map(() => ({ item: "rod" as ItemId, n: 1 })) };
    expect(gather(full, s, has, 0, false, null, there, { misses: 1, wrong: 0 }, NOON)).toMatchObject({ ok: true, lost: true });
    expect(gather(full, s, has, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "full" });
  });

  it("is a heap for several like any place, reached from a tile, and no squirrel or piglet has any part in it", () => {
    const s = SECRETS.find((x) => x.kind === "ring")!, has: Held = { turn: 3, item: "truffle", n: 1 }, there: [number, number] = [s.x, s.y];
    expect(gather(lit, s, has, SECRET_KINDS.ring.shares, false, null, there, clean, NOON)).toEqual({ ok: false, why: "bare" });
    expect(gather(lit, s, has, 1, true, null, there, clean, NOON)).toEqual({ ok: false, why: "had" });
    expect(gather(lit, s, null, 0, false, null, there, clean, NOON)).toEqual({ ok: false, why: "none" });
    expect(gather(lit, s, has, 0, false, null, [s.x + 2, s.y], clean, NOON)).toEqual({ ok: false, why: "far" });
    // (too far to lose it, too: a turn is spent only from where its games are played)
    expect(gather(lit, s, has, 0, false, null, [s.x + 2, s.y], { misses: 0, wrong: 0, lost: true }, NOON)).toEqual({ ok: false, why: "far" });
    const both = withGifts(["charmFirefly", "famPiglet"], "famPiglet", ["charmFirefly"]);
    const did = gather(both, s, has, 0, false, null, there, { misses: 0, wrong: 0, with: "famPiglet" }, NOON);
    expect(did.ok && did.got).toEqual([["truffle", 1]]);
    expect(did.ok && usedOf(did.purse, "famPiglet", NOON)).toBe(0);
    const squirrel = withGifts(["charmFirefly", "famSquirrel"], "famSquirrel", ["charmFirefly"]);
    expect(gather(squirrel, s, has, 0, false, null, [s.x + 2, s.y], clean, NOON)).toEqual({ ok: false, why: "far" });
    expect(gather(squirrel, s, has, 0, false, null, there, clean, NOON)).toMatchObject({ ok: true });
  });
});

describe("good things are harder for the skilled (from the forest's fourth rank, so much a rank; common things as they are)", () => {
  const marks = LINES.forest.marks;

  it("a thing of the forest's is common, uncommon or rare by what the relatives pay for it", () => {
    expect(WILD_TIERS).toEqual({ uncommon: 5, rare: 40 });
    for (const id of ["twig", "leafMould", "wildflower", "shiitake", "mint", "blueberry", "wildApple", "chestnut", "worm", "egg", "toadstool"] as ItemId[]) expect(wildTier(id), id).toBe("common");
    for (const id of ["chanterelle", "porcini", "glowMushroom", "silkCocoon", "bambooShoot", "wildYam"] as ItemId[]) expect(wildTier(id), id).toBe("uncommon");
    for (const id of ["fourLeafClover", "truffle", "ginseng", "amber", "mandrake", "wildOrchid", "moonflower", "starShard"] as ItemId[]) expect(wildTier(id), id).toBe("rare");
    // (every thing the forest gives is one of the three, and most of them are common)
    const wild = ITEM_IDS.filter((id) => ITEMS[id].kind === "wild");
    expect(wild.filter((id) => wildTier(id) === "common").length).toBeGreaterThan(wild.length / 2);
  });

  it("is 1 below the fourth rank, for what is common at any rank, and for what is not known", () => {
    for (const points of [0, marks[0], marks[2], marks[3] - 1]) for (const id of ["twig", "truffle", "porcini"] as ItemId[]) expect(harderOf(id, points)).toBe(1);
    for (const points of [marks[3], marks[5], marks[9], 999_999]) {
      expect(harderOf("twig", points)).toBe(1);
      expect(harderOf("shiitake", points)).toBe(1);
      expect(harderOf(null, points)).toBe(1);
    }
    expect(harderOf("truffle", marks[3])).toBe(harderAt(4));
    expect(harderOf("porcini", marks[3])).toBe(harderAt(4));
    expect(harderOf("wildYam", marks[5])).toBe(harderAt(6));
    expect(harderOf("mandrake", marks[9])).toBe(harderAt(10));
    expect(+harderAt(4).toFixed(2)).toBe(1 + HARDER.by);
    expect(+harderAt(10).toFixed(2)).toBe(1.56);
  });

  it("choosing: the patch goes dim sooner (with stamina it never did)", () => {
    const easy = startBunch(2, false, 7), hard4 = startBunch(2, false, 7, false, harderAt(4)), hard10 = startBunch(2, false, 7, false, harderAt(10));
    expect(easy.dim).toBeNull();
    expect(hard4.dim).toBeCloseTo(CHOOSING.glance / 1.08, 6);
    expect(hard10.dim).toBeCloseTo(CHOOSING.glance / 1.56, 6);
    expect(hard10.dim!).toBeLessThan(hard4.dim!);
    // (the patch itself is the same patch)
    expect(hard4.cells).toEqual(easy.cells);
    expect(dimmed(hard4, hard4.dim! - 0.01)).toBe(false);
    expect(dimmed(hard4, hard4.dim!)).toBe(true);
    expect(dimmed(easy, 9999)).toBe(false);
    // tired, the moment it is seen for is shorter by as much
    expect(startBunch(2, true, 7).dim).toBe(CHOOSING.peek);
    expect(startBunch(2, true, 7, false, harderAt(6)).dim).toBeCloseTo(CHOOSING.peek / 1.24, 6);
    // (a number under 1 is no kindness: 1)
    expect(startBunch(2, false, 7, false, 0.5).dim).toBeNull();
  });

  it("digging: fewer strokes to spare, one fewer from the fourth rank and two from the eighth", () => {
    const strokesOver = (harder: number, spent = false) => { const d = startDig(2, spent, 11, false, { harder }); return d.strokes - d.cells.filter((c) => c.over).reduce((t, c) => t + c.earth, 0); };
    expect(strokesOver(1)).toBe(DIGGING.spare);
    expect([4, 5, 6, 7].map((r) => strokesOver(harderAt(r)))).toEqual([3, 3, 3, 3]);
    expect([8, 9, 10].map((r) => strokesOver(harderAt(r)))).toEqual([2, 2, 2]);
    expect(strokesOver(1, true)).toBe(DIGGING.tiredSpare);
    expect(strokesOver(harderAt(4), true)).toBe(0);
    // (the mound is the same mound; and a piglet's snout is as gentle on it)
    expect(startDig(2, false, 11, false, { harder: harderAt(9) }).cells).toEqual(startDig(2, false, 11).cells);
    expect(startDig(2, false, 11, false, { harder: harderAt(9), gentle: true }).gentle).toBe(true);
    expect(strokesOver(0.3)).toBe(DIGGING.spare);
  });

  it("catching: the fruit falls quicker, and closer together", () => {
    const easy = startShower(3, false, 5), hard = startShower(3, false, 5, false, harderAt(6));
    expect(hard.fall).toBeCloseTo(CATCHING.fall / 1.24, 6);
    expect(hard.drops.length).toBe(easy.drops.length);
    expect(hard.drops.map((d) => d.lane)).toEqual(easy.drops.map((d) => d.lane));
    expect(hard.drops[1].lands - hard.drops[0].lands).toBeCloseTo(CATCHING.gap / 1.24, 6);
    expect(startShower(3, true, 5, false, harderAt(10)).fall).toBeCloseTo(CATCHING.tiredFall / 1.56, 6);
    expect(startShower(3, false, 5, false, 0.2).fall).toBe(CATCHING.fall);
  });
});
