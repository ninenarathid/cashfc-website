"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GUEST_RANK } from "@/lib/guest-data";
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
      const { data } = await supabase.from("profiles").select(BASE)
        .not("character_id", "is", null)
        .not("character_verified_at", "is", null);

      setGuests(((data ?? []) as unknown as GuestRow[])
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
        } as unknown as Member)));
    })();
    // The set is rebuilt on every render by its owner; its contents are what
    // matter, and those only change when the roster file does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIds.size]);

  return guests;
}
