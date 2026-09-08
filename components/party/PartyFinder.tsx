"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PersonOption } from "@/lib/people";
import type { ContentSeed } from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import PartyBoard from "@/components/party/PartyBoard";

/**
 * Who may see the party finder while it is being built.
 *
 * Only the gate lives here; the board itself is PartyBoard. Two reasons for the
 * split. A page that decides what to draw and also decides who may look at it
 * cannot be looked at by anybody testing it, which is how a draft ships with a
 * layout nobody checked. And this gate is temporary — it comes off the day the
 * board is real — while everything it wraps is not.
 *
 * Checked against the database rather than against the admin switch. The switch
 * is a view: it decides whether an admin is *shown* admin controls, and using
 * it to guard a page would hide this from an admin who had turned it off, which
 * is exactly the person it is for.
 *
 * It is also not a lock. Nothing here is secret — the tables have their own
 * policies and those are the real ones. This keeps an unfinished page out of
 * the way; it does not defend it.
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
  },
) {
  const [supabase] = useState(createClient);
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const [me, setMe] = useState<PersonOption | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) { setPhase("denied"); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setPhase("denied"); return; }
      const { data: row } = await supabase.from("profiles")
        .select("is_admin, character_id, character_name, character_verified_at")
        .eq("id", data.user.id).single();
      if (!row?.is_admin) { setPhase("denied"); return; }
      setUserId(data.user.id);

      // Only a verified character can hold a seat, which is the same rule the
      // rest of the site uses for anything that says who you are in game.
      const cid = row.character_verified_at ? (row.character_id as number | null) : null;
      setMe(props.people.find((p) => p.id === cid)
        ?? (cid ? { id: cid, name: (row.character_name as string) ?? "You", avatar: null }
                : null));
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  if (phase === "loading") {
    return <p className="px-1 py-10 text-center text-[13px] text-muted">Checking…</p>;
  }
  if (phase === "denied") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <p className="text-[13.5px] text-muted">
          This page is still being built, and is open to admins only for now.
        </p>
        <Link href="/" className="mt-2 inline-block text-[13px] text-accent no-underline">
          Back to the board
        </Link>
      </div>
    );
  }

  return <PartyBoard {...props} me={me} userId={userId} />;
}
