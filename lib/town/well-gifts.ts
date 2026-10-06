import { hasThing, numberOf, stretchOf } from "./gifts";
import { STAMINA, dayOf, staminaOf } from "./stamina";
import type { Purse } from "./trade";

/**
 * What the well's later ranks give (lib/town/gifts: the fourth to the sixth; the first three are the well's own
 * book's, things of the bag that are lent). The owner, 2026-10-07: a rank's gift cuts a whole rule of its line out,
 * each more than the last, and none takes failing away.
 *
 * **The flask of living water** (rank 4, `thingFlask`): a drink for a friend. Whoever has the flask holds a drink
 * out to somebody standing near (`drinkOffer`); the friend drinks it (`drinkTake`), and has thirty stamina of it,
 * and the flask's owner ten for the giving. Nothing more than stamina: no coins, no things.
 *
 * - **A member is given such a drink once in a meal's hours**, whoever gives it (`drunk`, kept in the drinker's
 *   purse): so a ring of friends cannot pass a flask round for stamina without end. The giver has no count: what
 *   bounds a giver is how many near them have not drunk in these hours.
 * - **Never above a full gauge**, either of them; and somebody whose gauge is full is not given one at all (`sated`):
 *   their one drink of these hours is not spent on nothing, and nobody is given ten for a drink that gave none.
 * - **It is the friend who drinks**: a drink held out waits twenty seconds for them, and is put away. So nobody's one
 *   drink is spent when they would rather it were not, nor on somebody who is not there to take it; and whoever keeps
 *   the game hears where each of the two stands from themselves (the giver as they hold it out, the friend as they
 *   drink): three tiles apart at the most.
 *
 * Pure: every function is given the moment, and what it gives back is new. The database judges the same (v153:
 * `town.drink_offer`, `town.drink_take`), both purses in the one call that drinks. **Every number is mine.**
 */
export const DRINK = {
  /** The stamina a drink gives whoever drinks it (the flask's own number, lib/town/gifts), and its owner for the giving. */
  gives: numberOf("thingFlask"),
  back: 10,
  /** How near the two stand, in tiles: within so many of each other, any way. */
  reach: 3,
  /** How long a drink is held out for, in seconds. */
  waits: 20,
};

/**
 * Why nothing came of something of the well's gifts, beyond what a bag refuses for: a drink that was held out too
 * long ago (`late`), or from too far (`far`), or to somebody who has drunk in these hours (`drunk`) or whose gauge
 * is full (`sated`).
 */
export type WellGiftRefusal = "none" | "late" | "far" | "drunk" | "sated";
type Not = { ok: false; why: WellGiftRefusal };
const not = (why: WellGiftRefusal): Not => ({ ok: false, why });

const whole = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
/** A tile as it is told, if it is one: two whole numbers. */
const tileOf = (v: unknown): [number, number] | null => (Array.isArray(v) && v.length === 2 && whole(v[0]) && whole(v[1]) ? [v[0], v[1]] : null);
/** The meal's hours a moment is in, as one number (lib/town/gifts' stretch of a count to a meal). */
export const mealHours = (now: number): number => stretchOf({ n: 1, per: "meal" }, now);

/** The drink somebody holds out, as it is kept, if it is kept soundly: to whom, from which tile, until when. (Lapsed or not: `drinkTake` says which.) */
export function toastOf(purse: Pick<Purse, "toast">): NonNullable<Purse["toast"]> | null {
  const t = purse.toast as { to?: unknown; at?: unknown; till?: unknown } | null | undefined, at = tileOf(t?.at);
  return t && typeof t === "object" && typeof t.to === "string" && t.to !== "" && at && typeof t.till === "number" && Number.isFinite(t.till) ? { to: t.to, at, till: t.till } : null;
}
/** Whether somebody has been given a drink in the meal's hours a moment is in. */
export const hasDrunk = (purse: Pick<Purse, "drunk">, now: number): boolean => {
  const d = purse.drunk as { k?: unknown } | null | undefined;
  return !!d && typeof d === "object" && d.k === mealHours(now);
};

/**
 * Hold a drink out to somebody, from the tile I stand on (null: put it away). One at a time: another takes the last
 * one's place. Refused to whoever has no flask, to oneself, and from what is no tile.
 */
export function drinkOffer<P extends Purse>(purse: P, me: string, to: string | null, at: readonly [number, number], now: number): { ok: true; purse: P; till: number | null } | Not {
  if (!hasThing(purse, "thingFlask")) return not("none");
  const { toast: _was, ...rest } = purse;
  if (to === null) return { ok: true, till: null, purse: rest as P };
  const tile = tileOf(at);
  if (to === "" || to === me || !tile) return not("none");
  const till = now + DRINK.waits * 1000;
  return { ok: true, till, purse: { ...rest, toast: { to, at: tile, till } } as P };
}

/**
 * Drink what somebody holds out to me, from the tile I stand on. Gives both purses as they are afterwards (the
 * giver's with the drink no longer held out), what I had of it and what its giver had for the giving.
 */
export function drinkTake(giver: Purse, drinker: Purse, from: string, me: string, at: readonly [number, number], now: number):
  { ok: true; giver: Purse; drinker: Purse; got: number; back: number } | Not {
  const held = toastOf(giver);
  if (from === me || !hasThing(giver, "thingFlask") || !held || held.to !== me) return not("none");
  if (!(held.till > now)) return not("late");
  const tile = tileOf(at);
  if (!tile || Math.max(Math.abs(tile[0] - held.at[0]), Math.abs(tile[1] - held.at[1])) > DRINK.reach) return not("far");
  if (hasDrunk(drinker, now)) return not("drunk");
  const mine = staminaOf(drinker, now);
  if (mine >= STAMINA.max) return not("sated");
  const theirs = staminaOf(giver, now), day = dayOf(now);
  const left = Math.min(STAMINA.max, mine + DRINK.gives), after = Math.min(STAMINA.max, theirs + DRINK.back);
  const { toast: _held, ...rest } = giver;
  return {
    ok: true, got: left - mine, back: after - theirs,
    giver: { ...rest, stamina: { day, left: after } },
    drinker: { ...drinker, stamina: { day, left }, drunk: { k: mealHours(now), by: from } },
  };
}

/**
 * What two pages tell each other of a drink, through the room's letterboxes (lib/town/session's `pair`), so that
 * each shows the other's part at once: a drink is held out until `t`; it was drunk (what each had of it); it was
 * not (why); it was put away. Only what is shown: what is true is the keeper's, and a word that never comes costs
 * nothing but the showing.
 */
export type DrinkNo = "drunk" | "sated" | "busy" | "far" | "later";
export type DrinkTold =
  | { k: "dr"; m: "offer"; t: number }
  | { k: "dr"; m: "ok"; g: number; b: number }
  | { k: "dr"; m: "no"; w: DrinkNo }
  | { k: "dr"; m: "off" };
const DRINK_NOS: readonly string[] = ["drunk", "sated", "busy", "far", "later"];
/** A word of a drink as another page said it, if it is one. */
export function readDrinkTold(raw: unknown): DrinkTold | null {
  const d = raw as { k?: unknown; m?: unknown; t?: unknown; g?: unknown; b?: unknown; w?: unknown } | null;
  if (!d || typeof d !== "object" || d.k !== "dr") return null;
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (d.m === "offer") return num(d.t) ? { k: "dr", m: "offer", t: d.t } : null;
  if (d.m === "ok") return num(d.g) && num(d.b) && d.g >= 0 && d.b >= 0 ? { k: "dr", m: "ok", g: d.g, b: d.b } : null;
  if (d.m === "no") return typeof d.w === "string" && DRINK_NOS.includes(d.w) ? { k: "dr", m: "no", w: d.w as DrinkNo } : null;
  return d.m === "off" ? { k: "dr", m: "off" } : null;
}
/** Whether two stand near enough for a drink, as a page has them: the tiles they are on within reach of each other. */
export const drinkNear = (a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
  Math.max(Math.abs(Math.floor(a.x) - Math.floor(b.x)), Math.abs(Math.floor(a.y) - Math.floor(b.y))) <= DRINK.reach;
