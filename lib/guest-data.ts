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
}

const HOMES = (guestData as { guests?: Record<string, GuestHome> }).guests ?? {};

/** What is known about where a guest plays, if the pipeline has looked yet. */
export const guestHome = (characterId: number): GuestHome | undefined =>
  HOMES[String(characterId)];


/**
 * A guest as a Member row, for the pages built from the roster file.
 *
 * What the roster supplies and nothing here can — parses, clears, the tier
 * board — stays null rather than zero. Nobody has looked, and a zero reads as
 * "looked, found nothing", which is a different and untrue thing.
 *
 * The collection is no longer in that category. It is null until the daily
 * sweep has read them and their own numbers afterwards, so the same rule still
 * holds: null is "not looked at yet", and a count is a count.
 */
export function guestMember(id: number, home: GuestHome): Member {
  return {
    id,
    name: home.name ?? "—",
    rank: GUEST_RANK,
    level: null,
    avatar: home.portrait ?? null,
    portrait: home.portrait ?? null,
    tags: [],
    parse: null,
    savage_kills: 0,
    ult_clears: 0,
    mounts: home.mounts ?? null,
    minions: home.minions ?? null,
    rare_achv: home.rare_achv ?? null,
    ach_public: home.ach_public ?? null,
  } as unknown as Member;
}

/** Every guest the pipeline has looked up, for building their pages. */
export const allGuestIds = (): number[] => Object.keys(HOMES).map(Number);
