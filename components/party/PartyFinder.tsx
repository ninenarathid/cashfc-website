"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PersonOption } from "@/lib/people";
import type { ContentSeed } from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import PartyBoard from "@/components/party/PartyBoard";
import type { SuggestRow } from "@/lib/suggest";

/**
 * Who is reading, for a board anybody may look at.
 *
 * The gate is gone: this was admin-only while it was being built, and it is
 * built. What is left is not permission but identity — which character the
 * reader is, so the board can pull the parties they are in to the top and let
 * them take a seat.
 *
 * Signed out is a perfectly good state here. Somebody can read the whole board
 * without an account, the same as every other page on this site; what they
 * cannot do is join, which the buttons say for themselves rather than the page
 * refusing to draw.
 *
 * A verified character is still required to hold a seat. An unverified claim
 * to a name is somebody's typing, and a raid night arranged under one wastes
 * an evening — the same rule the rest of the site uses for anything that says
 * who you are in game.
 */
export default function PartyFinder(
  props: {
    people: PersonOption[];
    extremes: ContentSeed[];
    savage: ContentSeed[];
    ultimates: ContentSeed[];
    alliances: ContentSeed[];
    criterions: ContentSeed[];
    art: DutyArt;
    /** Opened straight away, when the address named one. See app/party/[id]. */
    openParty?: string;
    /** Who plays what, for the seat suggestions. */
    suggest?: SuggestRow[];
    labels?: string[];
  },
) {
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<PersonOption | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: row } = await supabase.from("profiles")
        .select("character_id, character_name, character_verified_at")
        .eq("id", data.user.id).single();
      setUserId(data.user.id);

      const cid = row?.character_verified_at ? (row.character_id as number | null) : null;
      setMe(props.people.find((p) => p.id === cid)
        ?? (cid ? { id: cid, name: (row?.character_name as string) ?? "You", avatar: null }
                : null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Drawn straight away, for everybody. Waiting on the session before drawing
  // anything made the whole board flash "Checking…" for a reader who was only
  // ever going to look at it.
  return <PartyBoard {...props} me={me} userId={userId} />;
}
