import { describe, expect, it } from "vitest";
import { FORAGING, KINDS, SECRETS, SPOTS, gather, reachOf, type Held } from "./forest";
import { giftOf, numberOf } from "./gifts";
import { STAG, STAG_PACE, hasStag, paceOf, rides } from "./riding";
import { dayOf, staminaOf } from "./stamina";
import { newPurse, type Purse } from "./trade";
import { SPEED, stepAlong } from "./world";

/** 2026-10-05 12:00 in Bangkok. */
const NOON = Date.UTC(2026, 9, 5, 5), clean = { misses: 0, wrong: 0 };
const withGifts = (had: string[], familiar: string | null = null, charms: string[] = []): Purse => ({ ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, gifts: { had, charms, familiar } });

describe("the moss stag (the forest's sixth rank): ridden on every map, twice as fast, and gathering from its back", () => {
  it("is the familiar of the sixth rank, and its pace is the gift's own number", () => {
    expect(giftOf(STAG)).toMatchObject({ kind: "familiar", line: "forest", rank: 6 });
    expect(STAG_PACE).toBe(numberOf(STAG));
    expect(STAG_PACE).toBe(2);
  });

  it("whoever the room is told a stag follows goes twice as fast; anybody else as ever", () => {
    expect(paceOf(STAG)).toBe(2);
    for (const pet of ["", null, undefined, "famSquirrel", "famPiglet", "charmFirefly", "stag"]) { expect(paceOf(pet)).toBe(1); expect(hasStag(pet)).toBe(false); }
    expect(hasStag(STAG)).toBe(true);
    // a walk of ten tiles takes half the frames
    const walk = (pace: number) => { let pos = { x: 0.5, y: 0.5 }, path = [{ x: 10.5, y: 0.5 }], n = 0; while (path.length && n < 10000) { ({ pos, path } = stepAlong(pos, path, SPEED * pace / 60)); n++; } return n; };
    const afoot = walk(paceOf(null)), riding = walk(paceOf(STAG));
    expect(Math.abs(afoot - 2 * riding)).toBeLessThanOrEqual(2);
  });

  it("is ridden while its member walks or stands, and stands by while they sit", () => {
    expect(rides(STAG, false)).toBe(true);
    expect(rides(STAG, true)).toBe(false);
    expect(rides("famSquirrel", false)).toBe(false);
    expect(rides(null, false)).toBe(false);
  });

  it("from its back whatever is within two tiles is gathered: what grows, hangs, lies buried or lies about", () => {
    const stag = withGifts(["famStag"], "famStag"), bare = withGifts(["famStag"]);
    expect(FORAGING.stag).toBe(2);
    for (const how of ["pick", "choose", "dig", "shake"] as const) { expect(reachOf(stag, how, NOON)).toBe(FORAGING.stag); expect(reachOf(bare, how, NOON)).toBe(FORAGING.reach); }
    // (another familiar at the heels: no further than a hand, but for what a squirrel fetches)
    expect(reachOf(withGifts(["famStag", "famPiglet"], "famPiglet"), "dig", NOON)).toBe(FORAGING.reach);
    const shrooms = SPOTS.find((s) => s.kind === "mushrooms")!, has: Held = { turn: 1, item: "shiitake", n: 2 }, two: [number, number] = [shrooms.x + 2, shrooms.y - 2];
    expect(gather(bare, shrooms, has, 0, false, null, two, clean, NOON)).toEqual({ ok: false, why: "far" });
    const did = gather(stag, shrooms, has, 0, false, null, two, clean, NOON);
    expect(did.ok && did.got).toEqual([["shiitake", 2]]);
    // for the stamina it costs, as on foot: the stag carries, it does not gather
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(100 - KINDS.mushrooms.cost);
    expect(gather(stag, shrooms, has, 0, false, null, [shrooms.x + 3, shrooms.y], clean, NOON)).toEqual({ ok: false, why: "far" });
    // what is dug still takes a hoe in the hand
    const mound = SPOTS.find((s) => s.kind === "mound")!, yam: Held = { turn: 1, item: "wildYam", n: 1 };
    expect(gather(stag, mound, yam, 0, false, null, [mound.x + 2, mound.y], clean, NOON)).toEqual({ ok: false, why: "tool" });
    expect(gather({ ...stag, hand: "hoe" }, mound, yam, 0, false, "hoe", [mound.x + 2, mound.y], clean, NOON)).toMatchObject({ ok: true });
    // and a secret place is reached from its back too, by whoever wears the lantern
    const s = SECRETS[0], lit = withGifts(["famStag", "charmFirefly"], "famStag", ["charmFirefly"]);
    expect(gather(lit, s, { turn: 1, item: "amber", n: 1 }, 0, false, null, [s.x - 2, s.y + 1], clean, NOON)).toMatchObject({ ok: true, got: [["amber", 1]] });
    expect(gather(stag, s, { turn: 1, item: "amber", n: 1 }, 0, false, null, [s.x - 2, s.y + 1], clean, NOON)).toEqual({ ok: false, why: "none" });
  });
});
