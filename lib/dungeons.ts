import data from "@/data/dungeons.json";

/**
 * Every dungeon in the game, by expansion.
 *
 * Read from the game's own Duty Finder table by scripts/fetch-dungeons.mjs
 * rather than typed out, for the reason the extremes are read from the board:
 * there are a hundred and three of them, a hand-written list would be wrong the
 * week a patch lands, and the game already knows the level and the expansion.
 *
 * Expansions newest first. Somebody arranging a dungeon run means this
 * expansion far more often than a twelve-year-old one, and a list that opens on
 * A Realm Reborn asks them to scroll past the whole game to reach what they
 * meant.
 */

export interface Dungeon {
  /** The Duty Finder row, which is also release order. */
  id: number;
  name: string;
  /** The level you have to be. What tells two similar names apart. */
  level: number;
  ilvl: number;
  /** Four, for every one of them. Kept in case that ever stops being true. */
  size: number;
  expansion: string;
}

/** Newest first, and only the ones that actually have dungeons in them. */
export const EXPANSIONS: string[] = (data as { expansions: string[] }).expansions;

/**
 * Newest expansion first, and by level inside each one.
 *
 * The file is written by level across the whole game, which is the order the
 * Duty Finder lists them in and the wrong order for a picker: whatever builds
 * the expansion chips takes them in the order they first appear, and that put
 * A Realm Reborn at the front with the current expansion six chips along. The
 * two orders are both right for their own job, so the sort belongs here rather
 * than in the file.
 */
export const DUNGEONS: Dungeon[] = [...(data as { dungeons: Dungeon[] }).dungeons]
  .sort((a, b) =>
    EXPANSIONS.indexOf(a.expansion) - EXPANSIONS.indexOf(b.expansion)
    || a.level - b.level || a.id - b.id);

export const dungeonsIn = (expansion: string): Dungeon[] =>
  DUNGEONS.filter((d) => d.expansion === expansion);
