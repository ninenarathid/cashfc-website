/**
 * How rare is rare, as a colour.
 *
 * Gold, pink, orange, violet, blue — the ladder FFXIV players already read off
 * a parse, reused for ownership because it needs no legend either. The numbers
 * are FFXIV Collect's `owned` percentages: what share of the characters it
 * tracks have the thing.
 *
 * One ladder in one place, because achievements, mounts, minions and now titles
 * are all measured the same way and a member comparing two of them on one page
 * should not have to ask whether the colours mean the same.
 */
export function rarityColor(pct: number | null | undefined): string {
  if (pct == null) return "#8b97a8";
  if (pct < 0.5) return "#e5cc80";
  if (pct < 1) return "#e268a8";
  if (pct < 3) return "#ff8000";
  if (pct < 5) return "#a335ee";
  if (pct < 15) return "#2f7fd4";
  return "#8b97a8";
}

/** The same number as words, for a tooltip. Rounds honestly at the bottom. */
export function rarityLabel(pct: number | null | undefined, th: boolean): string {
  if (pct == null) return th ? "ไม่ทราบความหายาก" : "rarity unknown";
  // Collect rounds to a tenth, so "0%" means "under a twentieth of a percent"
  // rather than nobody — and nobody is not true of something being worn.
  if (pct < 0.05) return th ? "ผู้เล่นน้อยกว่า 0.1% มี" : "under 0.1% of players have it";
  return th ? `ผู้เล่น ${pct}% มี` : `${pct}% of players have it`;
}
