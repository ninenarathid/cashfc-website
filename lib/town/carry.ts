/**
 * What somebody carries in both hands (a stone for the bridge: lib/town/bridge; the owner, 2026-10-08) makes them
 * slow: **half the walking pace**, the water cart's own rule for one alone (lib/town/cart), and **a quarter with no
 * stamina left** (with none a thing is harder, never refused).
 *
 * The pace is the page's own (every page moves everybody it sees by the same rule, lib/town/session), like where
 * anybody stands: nothing that keeps the game knows of it. It is here, apart from the bridge's rules, because the
 * session walks everybody on every page of the site and is to stay as light as it is.
 */
export const CARRY = {
  /** How fast whoever carries something in their hands walks, as a share of anybody's pace. */
  held: 0.5,
  /** And with no stamina left. */
  spent: 0.25,
};

/**
 * How fast somebody walks with what they carry in their hands, as a share of the walking pace: anybody's with
 * nothing, half with something, a quarter with something and no stamina left. (`spent` is what the room says of
 * them: not said by a page built before it was, and then they are taken to have some.)
 */
export const carryPace = (carry: string | null | undefined, spent: boolean | null | undefined): number =>
  (!carry ? 1 : spent === true ? CARRY.spent : CARRY.held);
