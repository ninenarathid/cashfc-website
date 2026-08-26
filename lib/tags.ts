import { ACHV_TIER_LABEL, type Member } from "@/lib/types";

/**
 * What to call somebody under their name.
 *
 * The in-game title, and nothing if they wear none. The FC rank used to stand in,
 * which quietly told anybody without a title that their rank was their identity —
 * and put a word under half the roster that none of them had chosen. Silence says
 * less and is truer, so every caller is expected to leave the line out rather
 * than fill it.
 *
 * The rank stays in the data regardless: the board still groups and filters by
 * it, and vacation is read from it.
 */
export function memberTitle(m: Pick<Member, "title">): string | null {
  return m.title ?? null;
}

/**
 * What a tag is called and what colour it wears.
 *
 * Kept out of the component that draws them because the share card is rendered
 * on the server, where a client module cannot be reached. Two lists of tag names
 * that were supposed to match would have drifted the first time one was edited,
 * and a member reading as "Tier cleared" on the board and "TIER-CLEAR" in a
 * Discord embed is exactly the drift worth spending a file to prevent.
 */
export const TAG_LABELS: Record<string, string> = {
  all: "All",
  "tier-clear": "Tier cleared", prog: "Progging",
  ultimate: "Ultimate", veteran: "Veteran", extreme: "Extreme",
  crafter: "Crafter", gatherer: "Gatherer", relic: "Relic grinder",
  explorer: "Explorer", treasure: "Treasure hunter", goldsaucer: "Gold Saucer",
  seasonal: "Seasonal", pvp: "PvP", oldtimer: "Old-timer",
  casual: "Casual", unknown: "No data",
};

/** The same palette as TAG_CLASS, as hex, for charts that cannot use classes. */
export const TAG_COLOR: Record<string, string> = {
  "tier-clear": "#d14b3a", prog: "#a8483c",
  ultimate: "#e5cc80", veteran: "#a05a5a", extreme: "#a87fd8",
  crafter: "#c98a5b", gatherer: "#6aa84f", relic: "#b07ce8",
  explorer: "#4fa8b8", treasure: "#d9a441", goldsaucer: "#e07bb0",
  seasonal: "#8fa3d9", pvp: "#7ea6c9", oldtimer: "#a58b6a",
  casual: "#8b97a8", unknown: "#55493a",
};

/** "Legendary crafter" reads better than "Legendary Crafter" mid-sentence. */
export function tagText(tag: string, tier?: string): string {
  const base = TAG_LABELS[tag] ?? tag;
  return tier ? `${ACHV_TIER_LABEL[tier]} ${base.toLowerCase()}` : base;
}
