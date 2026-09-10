import data from "@/data/treasure-maps.json";

/**
 * Every treasure map somebody can bring to a map night.
 *
 * Read from the game's item sheet by scripts/fetch-treasure-maps.mjs rather
 * than typed out here, for the reason the extremes are read from the board: a
 * hand-written list is wrong the week a patch adds one, and wrong in the one
 * place people would be trying to use it.
 *
 * Newest first. Somebody arranging a map night means this week's map far more
 * often than a nine-year-old one, and a list that opens on Leather asks them to
 * scroll past a decade to reach what they meant.
 */

export interface TreasureMap {
  /** The item id, which is also its release order. */
  id: number;
  /** The item's own name: "Timeworn Gargantuaskin Map". */
  name: string;
  /**
   * What everybody calls it. Absent on the maps that are not part of the run —
   * the Thief's Map and the "Special" ones are real maps and are not what
   * anybody means by a G.
   */
  g?: string;
  /** What people say out loud: "Gargantuaskin", not the whole item name. */
  short: string;
}

export const TREASURE_MAPS: TreasureMap[] = (data as { maps: TreasureMap[] }).maps;

/** The one at the top, which is the one most nights are about. */
export const LATEST_MAP: string | null =
  (data as { latest: string | null }).latest;

const BY_NAME = new Map(TREASURE_MAPS.map((m) => [m.name, m]));

export const mapByName = (name: string | undefined): TreasureMap | undefined =>
  name ? BY_NAME.get(name) : undefined;

/**
 * The shortest thing that still identifies a map.
 *
 * "G18" where there is a G, because that is what gets typed in Discord and
 * read off a listing at a glance; the short name otherwise, because "Thief's"
 * is clearer than nothing and there is no number to give.
 */
export const mapLabel = (name: string | undefined): string | undefined => {
  const m = mapByName(name);
  return m ? m.g ?? m.short : name;
};

/** "G18 · Gargantuaskin" — for a picker, where both halves earn their place. */
export const mapFullLabel = (m: TreasureMap): string =>
  m.g ? `${m.g} · ${m.short}` : m.short;

/**
 * How many maps one person can sensibly be asked to bring.
 *
 * Capped rather than free text because the number is a plan, not a count: a
 * party saying "twelve each" is not describing an evening anybody is going to
 * finish. Six is already a long night.
 */
export const MAPS_EACH = [1, 2, 3, 4, 5, 6];
