import { geologicalYield, rockChoice, type RockChoice } from "./geology";
import type { ItemId } from "./items";
import { mineOf, oreOf, pickOf, type MineRefusal, type PendingVein, type VeinDone } from "./mining";
import { stowAll } from "./pouches";
import { usePower } from "./powers";
import { GEMS, optN } from "./tools";
import type { Purse } from "./trade";
import { VEIN, faceOf, play, type Cell } from "./vein";

/**
 * A go at a vein, as a page tells it to a keeper that does not lay the face out.
 *
 * The browser's trial makes a vein's face from its seed (lib/town/vein's `faceOf`: a generator of many tries with a
 * search in it) and plays the page's strikes on it again. The database does not make the face: the generator is not
 * written twice. So the database's keeper is told the go by the page, which has the face (`accountOf`), and believes
 * it within what the rules allow of ANY face (`oddOf`), and pays by the same rule as the trial (`veinFrom`, which is
 * lib/town/mining's `veinEnd` with the account in the face's place). An account of an honest page is never odd, and
 * comes to what the trial gives to the last fragment: lib/town/vein-account.test.ts holds the two to each other.
 *
 * Whether there is a vein, whether it is a gem's and of which, the strikes a go has, what a knot gives back and the
 * vein's `more`: those are the keeper's (the `PendingVein` in the purse, which striking the rock wrote), never the
 * page's.
 *
 * Pure, like the rest.
 */
export interface VeinAccount {
  /** The vein it is a go at: the seed of its face, and whether this is its second go (a twin's). */
  seed: number; again: boolean; geology?: RockChoice;
  /** The strikes as they were made, in their order: cells of the face, sixty-four at the most. Kept for the record. */
  strikes: Array<[number, number]>;
  /** How many of them counted (a strike on a cell that cannot be struck is passed over). */
  struck: number;
  /** How many cells of the face glint. */
  of: number;
  /** How many glinting cells of ore the crack passed. */
  ore: number;
  /** What each gem's cell it passed gives, in fragments of the gem. */
  gems: number[];
}
/** The most strikes a go is told with. */
export const VEIN_STRIKES = 64;

const isCell = (c: unknown): c is Cell => Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1]);
const onFace = (c: unknown): c is Cell => isCell(c) && c[0] >= 0 && c[1] >= 0 && c[0] < VEIN.size && c[1] < VEIN.size;
const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/** What a page that has the face says of a go: the strikes played on the face by the rules, and what the crack passed. */
export function accountOf(vein: PendingVein, strikes: ReadonlyArray<Cell>, choice?: RockChoice): VeinAccount {
  const face = faceOf(vein.seed, !!vein.gem), sound = (Array.isArray(strikes) ? strikes : []).filter(isCell), crack = play(face, vein.mods, sound);
  const passed = crack.got.map((i) => face.points[i]).filter((p) => !!p), gem = (p: { gem: number }) => p.gem > 0 && !!vein.gem;
  return {
    seed: vein.seed, again: !!vein.again, ...(choice ? { geology: choice } : {}),
    // (a cell off the face is never struck: it is left out of the record, and of nothing else)
    strikes: sound.slice(0, VEIN_STRIKES).filter(onFace).map(([x, y]): [number, number] => [x, y]),
    struck: crack.struck, of: face.points.length, ore: passed.filter((p) => !gem(p)).length, gems: passed.filter(gem).map((p) => p.gem),
  };
}

/**
 * Whether an account says something no face of that vein could have come to, and what: null for one that is within
 * the rules. What holds of every face:
 *
 * - a face has so many glinting cells, least to most (`points`);
 * - a go has the vein's strikes, and so many more given back at the most; no more count than were made;
 * - a strike lengthens the crack by `reach` cells at the most, and one that a knot stopped (the only kind given
 *   back) by one fewer; the crack passes no more glinting cells than it has run through;
 * - only a gem's vein has gem's cells: at least one and at the most `gem.points`, each of `gem.chips` fragments; so
 *   so many of its glinting cells are not ore.
 */
export function oddOf(vein: PendingVein, said: unknown): string | null {
  const a = said as Partial<VeinAccount> | null;
  if (!a || typeof a !== "object" || !whole(a.struck) || !whole(a.of) || !whole(a.ore) || !Array.isArray(a.gems) || !a.gems.every(whole)) return "shape";
  if (!Array.isArray(a.strikes) || a.strikes.length > VEIN_STRIKES || !a.strikes.every(onFace)) return "strikes";
  if (a.of < VEIN.points[0] || a.of > VEIN.points[1]) return "of";
  const mine = Math.max(1, vein.mods.strikes), back = Math.max(0, vein.mods.back);
  if (a.struck > a.strikes.length || a.struck > mine + back) return "struck";
  if (vein.gem ? a.gems.length > VEIN.gem.points[1] || a.gems.some((n) => n < VEIN.gem.chips[0] || n > VEIN.gem.chips[1]) : a.gems.length > 0) return "gems";
  const passed = a.ore + a.gems.length;
  if (passed > a.of || (vein.gem && a.ore > a.of - Math.max(1, a.gems.length))) return "passed";
  if (passed > VEIN.reach * Math.min(a.struck, mine) + (VEIN.reach - 1) * Math.max(0, a.struck - mine)) return "far";
  return null;
}
/** The most a go at a vein can be said to give within the rules, whatever its face: for telling what believing a page costs. */
export function mostOf(vein: PendingVein): { ore: number; gems: number } {
  const cells = VEIN.points[1], gems = vein.gem ? VEIN.gem.points[1] : 0;
  return { ore: (cells - (vein.gem ? Math.max(1, gems) : 0)) * VEIN.ore, gems: gems ? gems * VEIN.gem.chips[1] + Math.max(0, vein.more) : 0 };
}

/**
 * A vein played out, by what its page says of the go (lib/town/mining's `veinEnd`, with the account in the face's
 * place). Refused with nothing changed when no vein is open, the account is of another vein than the one that is
 * (`none`), or there is no room for what it gives (`full`: the vein then waits). An account that no face could have
 * come to (`odd`) gives nothing and closes the vein: the purse given back with it is the one to keep.
 */
export function veinFrom(purse: Purse, said: unknown, now: number): VeinDone | { ok: false; why: MineRefusal | "odd"; purse?: Purse; how?: string } {
  const kept = mineOf(purse), vein = kept.vein, a = said as Partial<VeinAccount> | null;
  if (!vein) return { ok: false, why: "none" };
  if (!a || typeof a !== "object" || Array.isArray(a) || a.seed !== vein.seed || !!a.again !== !!vein.again) return { ok: false, why: "none" };
  if ("geology" in a && !rockChoice((a as VeinAccount).geology)) return { ok: false, why: "none" };
  const how = oddOf(vein, a);
  if (how) return { ok: false, why: "odd", how, purse: { ...purse, mine: { ...kept, vein: null } } };
  const told = a as VeinAccount, chip = vein.gem ? GEMS[vein.gem].chip : null, shards = told.ore * VEIN.ore, cut = told.gems.reduce((t, n) => t + n, 0), chips = cut > 0 ? cut + Math.max(0, vein.more) : 0;
  const got: Array<[ItemId, number]> = [...(shards ? [[oreOf(vein.f), shards] as [ItemId, number]] : []), ...(chips && chip && told.geology?.focus !== "crystal" ? [[chip, chips] as [ItemId, number]] : [])];
  const pick = pickOf(purse), twin = got.length > 0 && !vein.again && pick ? usePower(purse, pick, "pkTwin", now) : null;
  if (twin?.ok) for (const part of got) part[1] *= optN("pkTwin", "times", pick);
  if (told.geology) got.push(...geologicalYield(vein, told.geology, told.ore, told.gems.length, purse));
  const stowed = stowAll(twin?.ok ? twin.purse : purse, got);
  if (!stowed) return { ok: false, why: "full" };
  // Match veinEnd: the accepted yield is multiplied immediately, with no replay.
  const after = stowed;
  return {
    ok: true, got, passed: told.ore + told.gems.length, of: told.of, struck: told.struck, again: false, vein,
    purse: { ...after, mine: { ...mineOf(after), vein: null } },
  };
}
