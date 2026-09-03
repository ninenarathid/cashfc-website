import type { Member } from "@/lib/types";
import guestData from "@/data/guests.json";

/**
 * People who registered here but are not in the Free Company.
 *
 * A guest is defined by absence: a verified claim on a character the FC roster
 * does not contain. Friends, static-mates from other companies, alts on another
 * world. They are here to be seen rather than ranked — the FC's own statistics
 * are about the FC, and somebody who is not in it should not quietly move them.
 *
 * Verified only. An unverified claim is a name somebody typed, and a board that
 * showed those would be a board anybody could put any character on.
 *
 * The one definition, in one place. It used to live inside the member board,
 * and the moment a second screen needed it the two would have started
 * disagreeing about who counts — which is the kind of difference nobody spots
 * until the numbers on two pages fail to add up.
 */

/** The rank a guest wears, so the rest of the site can tell at a glance. */
export const GUEST_RANK = "Guest";

export const isGuest = (m: Member): boolean => m.rank === GUEST_RANK;

/**
 * Where a guest actually plays, from the Lodestone.
 *
 * Read from a data file rather than from the database, because it is not
 * theirs: nobody types their own world, it is scraped from a public page by
 * `pipeline/update_guests.py`. Facts about the world go in data/, facts a
 * member owns go in Supabase, and keeping that line means this needed no
 * migration, no new column and no write credentials in CI.
 */
export interface GuestHome {
  name?: string | null;
  world?: string | null;
  dc?: string | null;
  /** Their own Free Company. Null means they are in none — a real answer. */
  fc?: string | null;

  /**
   * What FFXIV Collect knows, put here by pipeline/collect_missing.py.
   *
   * Guests used to have none of this, and not because it was private: the
   * pipeline works from the FC roster, so nobody had ever asked Collect about
   * them. Undefined still means unread — which is why the counts are optional
   * rather than defaulting to zero.
   */
  mounts?: number | null;
  minions?: number | null;
  rare_achv?: number | null;
  ach_public?: boolean | null;
  /** Their character portrait, for the boards that only had a bare id before. */
  portrait?: string | null;

  /**
   * How they play, worked out by pipeline/update_guest_stats.py.
   *
   * The roster's own stages, run over the guest list: the same FF Logs query,
   * the same rollup, the same tagging. Graded against the FC's curve without
   * being counted into it — a guest cannot move the cutoff that decides who
   * this Free Company calls a Crafter.
   *
   * Loosely typed on purpose. These are the member row's own fields under the
   * member row's own names, and they are spread into a Member below; naming
   * each here would be a second copy of that shape to keep in step.
   */
  tags?: string[];
  achv_tiers?: Record<string, string>;
  parse?: number | null;
  savage_kills?: number;
  ult_clears?: number;
  fflogs?: string;
  [stat: string]: unknown;
}

/**
 * Facts about where a guest plays, as opposed to how. Scraped from a Lodestone
 * page and kept out of the Member row they are spread into: a member has no
 * "which world" field, because every member is on the same one.
 */
const PLACE = new Set([
  "name", "world", "dc", "fc", "seen", "collect_seen", "stats_seen",
]);

const HOMES = (guestData as { guests?: Record<string, GuestHome> }).guests ?? {};

/** What is known about where a guest plays, if the pipeline has looked yet. */
export const guestHome = (characterId: number): GuestHome | undefined =>
  HOMES[String(characterId)];


/**
 * A guest as a Member row, for the pages built from the roster file.
 *
 * Everything the daily sweeps have worked out is passed straight through under
 * the names the member row already uses, which is why they are written that way
 * rather than translated here — a mapping table between two spellings of
 * "savage_kills" is a thing to get wrong, not a thing to have.
 *
 * What nothing has looked at yet stays null rather than zero. A zero reads as
 * "looked, found nothing", which is a different and untrue thing — and the
 * distinction is live here, because the sweeps run on their own schedule and a
 * guest who registered this morning has been through none of them.
 *
 * Level, race and title stay null regardless: they come from a Lodestone
 * character page that nothing in the guest pipeline fetches.
 */
export function guestMember(id: number, home: GuestHome): Member {
  const stats = Object.fromEntries(
    Object.entries(home).filter(([k]) => !PLACE.has(k)));
  return {
    ...stats,
    id,
    name: home.name ?? "—",
    rank: GUEST_RANK,
    level: null,
    avatar: home.portrait ?? null,
    portrait: home.portrait ?? null,
    tags: home.tags ?? [],
    parse: home.parse ?? null,
    savage_kills: home.savage_kills ?? 0,
    ult_clears: home.ult_clears ?? 0,
    mounts: home.mounts ?? null,
    minions: home.minions ?? null,
    rare_achv: home.rare_achv ?? null,
    ach_public: home.ach_public ?? null,
  } as unknown as Member;
}

/** Every guest the pipeline has looked up, for building their pages. */
export const allGuestIds = (): number[] => Object.keys(HOMES).map(Number);
