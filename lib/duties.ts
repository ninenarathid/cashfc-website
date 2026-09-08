/**
 * What the game calls an extreme trial, and where it sits in the tier.
 *
 * FF Logs names these after the boss — Valigarmanda, Doomtrain — because that is
 * what it ranks. Players name them after the duty they queue for, and after the
 * number: "EX3", "the second one". Both are needed. The duty name is what you
 * search the Party Finder for, the boss name is what the parse belongs to, and
 * the badge is what anybody actually says out loud.
 *
 * A hand-written table because no API has it. FF Logs knows the boss and the
 * zone id; FFXIV Collect knows neither. The order in particular is a fact about
 * the patch cycle that exists nowhere machine-readable — EX6 arrived after the
 * Monster Hunter collaboration, which is not numbered at all.
 *
 * Keyed by the boss name FF Logs reports, since that is the only handle the
 * data gives. A fight missing from here still renders: it keeps the boss name
 * as its title and gets no badge, which is what every previous tier will do
 * until somebody adds it.
 */
export interface DutyInfo {
  /** EX1, Collab — what people say. */
  badge: string;
  /** The duty as the game lists it. */
  duty: string;
  /** Release order within the tier. */
  order: number;
}

export const EXTREME_DUTIES: Record<string, DutyInfo> = {
  "Valigarmanda":     { badge: "EX1", duty: "Worqor Lar Dor (Extreme)", order: 1 },
  "Zoraal Ja":        { badge: "EX2", duty: "Everkeep (Extreme)", order: 2 },
  "Queen Eternal":    { badge: "EX3", duty: "The Minstrel's Ballad: Sphene's Burden", order: 3 },
  "Zelenia":          { badge: "EX4", duty: "Recollection (Extreme)", order: 4 },
  "Necron":           { badge: "EX5", duty: "The Minstrel's Ballad: Necron's Embrace", order: 5 },
  // Not numbered: the Monster Hunter crossover sits outside the EX sequence,
  // and calling it EX6 would push every later trial's name out of step with
  // what the FC says to each other.
  "Guardian Arkveld": { badge: "Collab", duty: "The Windward Wilds (Extreme)", order: 6 },
  "Doomtrain":        { badge: "EX6", duty: "Hell on Rails (Extreme)", order: 7 },
  "Enuo":             { badge: "EX7", duty: "The Unmaking (Extreme)", order: 8 },
};

export const dutyOf = (boss: string | null | undefined): DutyInfo | undefined =>
  boss ? EXTREME_DUTIES[boss] : undefined;

/**
 * Release order, then whatever FF Logs gave us.
 *
 * Anything this table has not heard of goes last rather than first: a trial
 * from a tier nobody has added yet should not open the list.
 */
export function byReleaseOrder<T extends { name?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const x = dutyOf(a.name)?.order ?? Number.MAX_SAFE_INTEGER;
    const y = dutyOf(b.name)?.order ?? Number.MAX_SAFE_INTEGER;
    return x - y || (a.name ?? "").localeCompare(b.name ?? "");
  });
}


/**
 * The duty a savage floor belongs to, from its label and its tier.
 *
 * Derived rather than tabled, because this one has a rule where the extremes
 * have none. A savage tier is four duties named after the zone and numbered one
 * to four — AAC Cruiserweight M1 (Savage) through M4 — and the label FF Logs
 * gives each floor carries its number: the tier starting at M9S makes M9S the
 * first of its four, M12S the fourth. Two encounters sharing a floor, as M12S-1
 * and M12S-2 do, are two halves of one duty and get the same name.
 *
 * Only ever asked about the current tier. Previous tiers are listed elsewhere
 * on the page and are not all named this way — Pandaemonium counts circles and
 * Eden names each floor outright — so a rule that assumes the AAC pattern must
 * not be pointed at them.
 */
export function savageDuty(label: string | null | undefined,
                           zone: string | null | undefined): string | null {
  const floor = /^M(\d+)S/.exec(label ?? "")?.[1];
  if (!floor || !zone) return null;
  return `${zone} M${((Number(floor) - 1) % 4) + 1} (Savage)`;
}


/**
 * The alliance raids of the current expansion.
 *
 * Hand-written for the same reason the extremes above are: FF Logs does not
 * rank 24-player content, so nothing in this project's data has ever heard of
 * these, and no API will hand them over. Three lines that change once every two
 * years are cheaper than a scraper that has to be right.
 *
 * Dawntrail's series is the Final Fantasy XI crossover, one raid per odd patch.
 * Checked against the Console Games Wiki and Icy Veins in September 2026 — the
 * third had landed by then, so this is the whole set unless 7.6 adds one.
 *
 * The patch is the badge because it is the only short handle these have. The
 * FC says "Jeuno" and "San d'Oria" for the first two, which is the city rather
 * than the duty, and a badge reading "Jeuno" beside a title reading "Jeuno: The
 * First Walk" says one thing twice.
 */
export interface AllianceRaid {
  /** The duty as the game lists it. */
  duty: string;
  /** The patch it arrived in, which is also its badge. */
  patch: string;
}

export const ALLIANCE_RAIDS: AllianceRaid[] = [
  { duty: "Jeuno: The First Walk", patch: "7.1" },
  { duty: "San d'Oria: The Second Walk", patch: "7.3" },
  { duty: "Windurst: The Third Walk", patch: "7.5" },
];


/**
 * Every Variant and Criterion dungeon, newest first.
 *
 * Hand-written for the reason the two tables above are: this is four-player
 * side content that FF Logs does not rank and no API will hand over. Checked
 * against the Console Games Wiki in September 2026.
 *
 * All of them, not only this expansion's. Unlike a savage tier, these do not
 * go stale — people still put Aloalo runs together for the mount and the
 * weapons years later, and a board that only offered the newest one would be
 * missing most of what actually gets organised.
 *
 * Three names for what is nearly the same dungeon, and the game's own naming is
 * the thing to trust rather than tidy up: the plain name is the Variant, which
 * is exploration and can be done alone; "Another" is the Criterion, which is a
 * fight; "(Savage)" is the Criterion that hurts. Dawntrail changed the pattern
 * to Variant, Variant (Advanced), Criterion — so the shape of this list is not
 * something to enforce, only to record.
 *
 * The patch is the badge for the same reason it is on the alliance raids:
 * these have no shorthand anybody says out loud, and the number sorts them.
 */
export interface CriterionDungeon {
  /** The duty as the game lists it. */
  duty: string;
  patch: string;
  /** Which one it is, since the name alone does not always say. */
  kind: "Variant" | "Advanced" | "Criterion" | "Criterion (Savage)";
}

export const CRITERION_DUNGEONS: CriterionDungeon[] = [
  { duty: "Another Merchant's Tale", patch: "7.45", kind: "Criterion" },
  { duty: "The Merchant's Tale (Advanced)", patch: "7.45", kind: "Advanced" },
  { duty: "The Merchant's Tale", patch: "7.45", kind: "Variant" },

  { duty: "Another Aloalo Island (Savage)", patch: "6.51", kind: "Criterion (Savage)" },
  { duty: "Another Aloalo Island", patch: "6.51", kind: "Criterion" },
  { duty: "Aloalo Island", patch: "6.51", kind: "Variant" },

  { duty: "Another Mount Rokkon (Savage)", patch: "6.45", kind: "Criterion (Savage)" },
  { duty: "Another Mount Rokkon", patch: "6.45", kind: "Criterion" },
  { duty: "Mount Rokkon", patch: "6.45", kind: "Variant" },

  { duty: "Another Sil'dihn Subterrane (Savage)", patch: "6.25", kind: "Criterion (Savage)" },
  { duty: "Another Sil'dihn Subterrane", patch: "6.25", kind: "Criterion" },
  { duty: "The Sil'dihn Subterrane", patch: "6.25", kind: "Variant" },
];
