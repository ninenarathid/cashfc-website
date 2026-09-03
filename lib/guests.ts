"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GUEST_RANK, guestHome, guestMember } from "@/lib/guest-data";
import type { Member } from "@/lib/types";

export * from "@/lib/guest-data";

const BASE = "character_id, character_name, avatar_url";

export interface GuestRow {
  character_id: number;
  character_name: string | null;
  avatar_url: string | null;
}

/**
 * The guests, as Member rows the rest of the site already knows how to draw.
 *
 * Two sources, because they answer different halves of the question. The claims
 * table says who is a guest and says it the moment somebody verifies, hours
 * before any pipeline has run. guests.json says everything else about them —
 * world, company, collection, clears, tags — and only the daily sweeps can fill
 * that in.
 *
 * So the row is built by guestMember from the file, and the live claim is laid
 * over the top for the two fields it holds more recent answers to. This used to
 * build its own row from nothing, with tags always empty, which is why a guest
 * could show eight playstyle tags on their own page and none at all in the list
 * beside it. One definition of what a guest row contains, and it is not here.
 */
export function useGuests(rosterIds: Set<number>): Member[] {
  const [guests, setGuests] = useState<Member[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select(BASE)
        .not("character_id", "is", null)
        .not("character_verified_at", "is", null);

      setGuests(((data ?? []) as unknown as GuestRow[])
        .filter((r) => !rosterIds.has(r.character_id))
        .map((r) => {
          const home = guestHome(r.character_id);
          // No entry yet means they verified since the last sweep. An empty row
          // is the honest answer for a few hours; nulls throughout say nobody
          // has looked, where zeros would say somebody looked and found none.
          const base = home
            ? guestMember(r.character_id, home)
            : ({
                id: r.character_id, name: "—", rank: GUEST_RANK, level: null,
                avatar: null, tags: [], parse: null, savage_kills: 0,
                ult_clears: 0, mounts: null, minions: null, rare_achv: null,
              } as unknown as Member);
          return {
            ...base,
            name: r.character_name ?? base.name,
            // Their own picture beats the Lodestone portrait the file carries.
            avatar: r.avatar_url ?? base.avatar,
          } as Member;
        }));
    })();
    // The set is rebuilt on every render by its owner; its contents are what
    // matter, and those only change when the roster file does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIds.size]);

  return guests;
}
