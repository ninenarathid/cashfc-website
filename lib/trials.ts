import data from "@/data/trials.json";

/**
 * Every trial you can still walk into unsynced, by expansion.
 *
 * Read from the game's own Duty Finder table by scripts/fetch-trials.mjs, for
 * the reason the dungeons are: there are ninety-eight of them, a hand-written
 * list would be wrong the week a patch lands, and the game already knows the
 * level and the expansion.
 *
 * What is here and what is not. The Ultimates are their own content type in
 * the game and are not on this list — nobody farms one for a mount. Neither is
 * this patch's extreme, which the game still marks as a high-end duty and
 * which is already on the board under Extreme; the flag comes off when the
 * next patch lands, which is the moment a trial stops being progression and
 * starts being something you run eight of on a Sunday.
 */

export interface Trial {
  /** The Duty Finder row, which is also release order. */
  id: number;
  name: string;
  /** The level you have to be. What tells two similar names apart. */
  level: number;
  ilvl: number;
  /** Eight, for every one of them. Kept in case that ever stops being true. */
  size: number;
  expansion: string;
}

/** Newest first, and only the ones that actually have trials in them. */
export const EXPANSIONS: string[] = (data as { expansions: string[] }).expansions;

/**
 * Newest expansion first, and by level inside each one.
 *
 * The file is written by level across the whole game, which is the order the
 * Duty Finder lists them in and the wrong order for a picker: whatever builds
 * the expansion chips takes them in the order they first appear, and that puts
 * A Realm Reborn at the front with the current expansion six chips along.
 */
export const TRIALS: Trial[] = [...(data as { trials: Trial[] }).trials]
  .sort((a, b) =>
    EXPANSIONS.indexOf(a.expansion) - EXPANSIONS.indexOf(b.expansion)
    || a.level - b.level || a.id - b.id);

export const trialsIn = (expansion: string): Trial[] =>
  TRIALS.filter((t) => t.expansion === expansion);
