"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

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

/** Columns beyond the base set, added by later migrations. */
const BASE = "character_id, character_name, avatar_url";
const WITH_HOME = `${BASE}, home_world, home_fc`;

export interface GuestRow {
  character_id: number;
  character_name: string | null;
  avatar_url: string | null;
  /** The world they play on. Null until the pipeline has looked them up. */
  home_world?: string | null;
  /** Their own Free Company, if they are in one. */
  home_fc?: string | null;
}

/**
 * The guests, as Member rows the rest of the site already knows how to draw.
 *
 * Everything the FC roster supplies and a guest cannot — parses, clears,
 * collection counts — is null rather than zero. Nobody has looked, and a zero
 * would read as "looked, found nothing", which is a different and untrue thing.
 */
export function useGuests(rosterIds: Set<number>): Member[] {
  const [guests, setGuests] = useState<Member[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const ask = (cols: string) => supabase.from("profiles").select(cols)
        .not("character_id", "is", null)
        .not("character_verified_at", "is", null);
      // Asking for a column the database has not got fails the whole query, and
      // the guests would disappear rather than merely lose their world.
      const full = await ask(WITH_HOME);
      const rows = (full.error ? (await ask(BASE)).data : full.data) ?? [];

      setGuests((rows as unknown as GuestRow[])
        .filter((r) => !rosterIds.has(r.character_id))
        .map((r) => ({
          id: r.character_id,
          name: r.character_name ?? "—",
          rank: GUEST_RANK,
          level: null,
          avatar: r.avatar_url ?? null,
          tags: [],
          parse: null,
          savage_kills: 0,
          ult_clears: 0,
          mounts: null,
          minions: null,
          rare_achv: null,
          home_world: r.home_world ?? null,
          home_fc: r.home_fc ?? null,
        } as unknown as Member)));
    })();
    // The set is rebuilt on every render by its owner; its contents are what
    // matter, and those only change when the roster file does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIds.size]);

  return guests;
}
