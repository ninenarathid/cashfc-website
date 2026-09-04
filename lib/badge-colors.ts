/**
 * The metals a badge can be struck in.
 *
 * Four, and they are ranks rather than decorations: Platinum, Gold, Silver,
 * Bronze say where a thing sits against the others, which is what an award is
 * for. The twelve free-standing hues this replaces said nothing — a violet
 * badge and a jade one were only two badges, and the admin picking between
 * them was picking a colour rather than a standing.
 *
 * Each is a light plate for a dark page, which is the other half of the change.
 * A tinted transparent pill reads as a chip, and the board already has fifteen
 * of those; a struck plate with dark lettering reads as something that was
 * awarded, because that is how one looks.
 */
export interface BadgeColor {
  key: string;
  /** What the admin picker calls it. */
  label: string;
  /** One flat colour that stands for the metal — the swatch, and the badge's
      name where it appears on a dark ground such as a tooltip. */
  hex: string;
  /** The plate. Light, dark, light, darker: metal is only ever a gradient,
      and three stops is the fewest that reads as a curved surface. */
  gradient: string;
  /** The lettering. Dark, because everything above it is light. */
  ink: string;
  /** The rim. A shade under the metal's midpoint, so the plate has an edge
      rather than bleeding into the card behind it. */
  edge: string;
}

export const BADGE_COLORS: BadgeColor[] = [
  {
    key: "platinum", label: "Platinum", hex: "#dfe6ee",
    gradient: "linear-gradient(135deg, #fbfdff 0%, #cfd9e6 38%, #f3f7fb 62%, #c5d1e0 100%)",
    ink: "#2f3742", edge: "#b3c0d0",
  },
  {
    key: "gold", label: "Gold", hex: "#e8c15c",
    gradient: "linear-gradient(135deg, #fdf3cd 0%, #e6bd54 40%, #fbeaae 62%, #d6a73c 100%)",
    ink: "#4a3a12", edge: "#c9a23f",
  },
  {
    key: "silver", label: "Silver", hex: "#c9d0d8",
    gradient: "linear-gradient(135deg, #fafbfc 0%, #c3cbd4 40%, #eef1f4 62%, #b1bac5 100%)",
    ink: "#333a44", edge: "#a8b2bd",
  },
  {
    key: "bronze", label: "Bronze", hex: "#c98a5b",
    gradient: "linear-gradient(135deg, #f7ddc4 0%, #c98a5b 42%, #edc9a6 64%, #a96c40 100%)",
    ink: "#4a2c17", edge: "#a8703f",
  },
];

export const DEFAULT_BADGE_COLOR = "gold";

/**
 * The metal for a stored key.
 *
 * Falls back rather than rendering nothing: the twelve hues that came before
 * are still sitting in any badge made while they existed, and a badge whose
 * colour was retired should look like a badge, not like a bug.
 */
export function badgeColor(key: string | null | undefined): BadgeColor {
  return BADGE_COLORS.find((c) => c.key === key)
    ?? BADGE_COLORS.find((c) => c.key === DEFAULT_BADGE_COLOR)!;
}

/** The plate, ready to hand to a style attribute. */
export function badgeShades(key: string | null | undefined) {
  const m = badgeColor(key);
  return {
    /** For a dark ground — a tooltip, a swatch outline. */
    accent: m.hex,
    background: m.gradient,
    border: m.edge,
    ink: m.ink,
    glow: `color-mix(in srgb, ${m.hex} 35%, transparent)`,
  };
}
