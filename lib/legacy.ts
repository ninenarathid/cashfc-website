import data from "@/data/legacy.json";

/**
 * Everything you can still walk into unsynced, by expansion.
 *
 * Trials and eight-player raids, normal and savage, read from the game's own
 * Duty Finder table by scripts/fetch-legacy.mjs — two hundred and twenty of
 * them, and a hand-written list would be wrong the week a patch lands.
 *
 * What is not here and why. The Ultimates are a content type of their own and
 * nobody farms one. The alliance raids have their own heading on this board.
 * And this patch's extreme and savage are still marked high-end by the game —
 * minimum item level, no undersizing — which is the game saying they are
 * progression rather than something you farm; the flag comes off when the next
 * patch lands. Until then they are under Extreme and Savage, where they belong.
 *
 * The current tier's *normal* raid is here, because there is nowhere else for
 * it: a weekly book run is not progression and never was.
 */

export interface Legacy {
  /** The Duty Finder row, which is also release order. */
  id: number;
  name: string;
  /** The level you have to be. What tells two similar names apart. */
  level: number;
  ilvl: number;
  /** Eight, for every one of them. Kept in case that ever stops being true. */
  size: number;
  /** A raid rather than a trial. Both are arranged the same way. */
  raid: boolean;
  expansion: string;
}

/** Newest first, and only the ones that actually have something in them. */
export const EXPANSIONS: string[] = (data as { expansions: string[] }).expansions;

/**
 * Newest expansion first, and by level inside each one.
 *
 * The file is written by level across the whole game, which is the order the
 * Duty Finder lists them in and the wrong order for a picker: whatever builds
 * the expansion chips takes them in the order they first appear, and that puts
 * A Realm Reborn at the front with the current expansion six chips along.
 */
export const LEGACY: Legacy[] = [...(data as { duties: Legacy[] }).duties]
  .sort((a, b) =>
    EXPANSIONS.indexOf(a.expansion) - EXPANSIONS.indexOf(b.expansion)
    || a.level - b.level || a.id - b.id);

export const legacyIn = (expansion: string): Legacy[] =>
  LEGACY.filter((t) => t.expansion === expansion);
