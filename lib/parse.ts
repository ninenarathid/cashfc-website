/**
 * The colour FF Logs gives a parse, and the site follows.
 *
 * Grey, green, blue, purple, orange, pink, gold — the ladder every raider
 * already reads without a legend, so the number needs no explaining beside it.
 *
 * Here rather than in a component because three of them were drawing parses and
 * two had their own copy of this. Two copies of a colour ladder is two ladders
 * the day somebody edits one.
 */
export function parseColor(p: number | null | undefined): string {
  if (p == null) return "#7a7a7a";
  if (p >= 100) return "#e5cc80";
  if (p >= 99) return "#e268a8";
  if (p >= 95) return "#ff8000";
  if (p >= 75) return "#a335ee";
  if (p >= 50) return "#2f7fd4";
  if (p >= 25) return "#4caf50";
  return "#7a7a7a";
}
