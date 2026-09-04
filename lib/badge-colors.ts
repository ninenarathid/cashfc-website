/**
 * The colours a custom badge can be given.
 *
 * A fixed palette rather than a colour picker, for the same reason the tag
 * colours are fixed: every one of these was chosen against this theme's surface
 * and checked to stay legible at 11px, which is not something a free hex field
 * can promise. Twelve is enough that two badges are rarely the same colour and
 * few enough to see all at once in the admin picker.
 *
 * Five are the theme's own accents, so a badge in one of those looks like part
 * of the site rather than a sticker on it.
 */
export interface BadgeColor {
  key: string;
  /** What the admin picker calls it. */
  label: string;
  hex: string;
}

export const BADGE_COLORS: BadgeColor[] = [
  { key: "gold", label: "Gold", hex: "#e5cc80" },
  { key: "amber", label: "Amber", hex: "#e0a458" },
  { key: "copper", label: "Copper", hex: "#c98a5b" },
  { key: "chili", label: "Chili", hex: "#d14b3a" },
  { key: "rose", label: "Rose", hex: "#e07a9b" },
  { key: "magenta", label: "Magenta", hex: "#c469d6" },
  { key: "violet", label: "Violet", hex: "#9b7ae0" },
  { key: "azure", label: "Azure", hex: "#6aa9e0" },
  { key: "steel", label: "Steel", hex: "#7ea6c9" },
  { key: "jade", label: "Jade", hex: "#4fb8a8" },
  { key: "lime", label: "Lime", hex: "#8fc55a" },
  { key: "silver", label: "Silver", hex: "#b8c2cf" },
];

export const DEFAULT_BADGE_COLOR = "gold";

/** The palette entry for a stored key, falling back rather than rendering nothing. */
export function badgeColor(key: string | null | undefined): BadgeColor {
  return BADGE_COLORS.find((c) => c.key === key)
    ?? BADGE_COLORS.find((c) => c.key === DEFAULT_BADGE_COLOR)!;
}

/**
 * The three shades one badge is drawn in.
 *
 * Derived from the single hex rather than stored, so adding a colour to the
 * palette above is one line and cannot leave a badge half-styled.
 */
export function badgeShades(key: string | null | undefined) {
  const { hex } = badgeColor(key);
  return {
    text: hex,
    border: `color-mix(in srgb, ${hex} 45%, transparent)`,
    background: `color-mix(in srgb, ${hex} 13%, transparent)`,
    glow: `color-mix(in srgb, ${hex} 30%, transparent)`,
  };
}
