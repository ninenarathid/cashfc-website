/**
 * A fight's name, as the filename its picture would have.
 *
 * Extreme, savage and Ultimate rows are near-identical cards with a name and a
 * number, and the name is the only thing telling them apart — which does not
 * help anybody who has not learned the tier yet. A still from the fight does.
 *
 * Kept apart from the half that reads the folders, because that half imports
 * node:fs and this one is called from a client component. Importing them
 * together put fs in the browser bundle and failed the build, which is the
 * right failure — the browser has no business reading public/duty.
 *
 * See public/duty/README.md for the shape those pictures want to be.
 */
export type DutyKind = "extreme" | "savage" | "ultimate";

export function dutySlug(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug to public path, per kind of fight. Empty where nobody has added one. */
export type DutyArt = Record<DutyKind, Record<string, string>>;

export const NO_ART: DutyArt = { extreme: {}, savage: {}, ultimate: {} };


/**
 * Where a picture is anchored when the card crops it.
 *
 * "center top" everywhere, because a game screenshot almost always keeps its
 * subject in the upper half and the card throws away the bottom. Almost: a shot
 * framed with the boss dead centre loses its head to that rule, which is what
 * happened to both halves of M12S — the top of each was an empty room and a
 * dark sliver.
 *
 * A table rather than something clever. Guessing where the subject is from the
 * pixels is a real thing to attempt and would be wrong occasionally with no way
 * for anybody to correct it; two lines here are wrong never.
 */
const ART_FOCUS: Record<string, string> = {
  lindwurm: "center",
  // A percentage, not a keyword, because neither keyword was right: dead centre
  // cut the head off the top and `top` gave a dark sliver of ceiling. A fifth of
  // the way down puts the eyes in the frame with the flames still under them.
  "lindwurm-ii": "center 20%",

  // Ultimates, all shot 16:9 with the boss below the horizon. The default
  // anchors to the top, which on these gave a ceiling, a sky and a wall of
  // light; each of these was picked by cropping it at 0, 25, 50, 75 and 100 per
  // cent and looking at the five.
  "dragonsong-s-reprise": "center",
  "the-omega-protocol": "center",
  "the-epic-of-alexander": "center",
  // Further still: the dragons and the party only clear the bottom edge of the
  // fireball three quarters of the way down.
  "the-unending-coil-of-bahamut": "center 75%",
};

export const artFocus = (slug: string): string => ART_FOCUS[slug] ?? "center top";
