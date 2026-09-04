"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * A badge as the admin defined it.
 *
 * Both languages are carried rather than one being picked here: this hook has
 * no idea which language the reader is in, and AwardBadge does. Picking early
 * would also mean re-fetching when somebody flips the language switch.
 */
export interface BadgeDef {
  id: number;
  label: string;
  label_en: string | null;
  description: string | null;
  description_en: string | null;
  /** A PNG in the post-images bucket, or nothing. */
  icon_url: string | null;
  color: string;
}

/** Every column of a badge, in one place, so the two queries cannot drift. */
export const BADGE_COLUMNS =
  "id, label, label_en, description, description_en, icon_url, color";

/** One badge as one member holds it. */
export interface AwardedBadge extends BadgeDef {
  /** Why this member got it, where the badge's own description is general. */
  note: string | null;
}

export type BadgesByMember = Record<number, AwardedBadge[]>;

/**
 * Every badge that has been given out, by character.
 *
 * The same arrangement as the avatar overrides next door, and for the same
 * reason: the board is built from members.json by the nightly crawler, which
 * knows nothing about a badge an admin handed out this afternoon. So it arrives
 * separately and the page renders without waiting — a badge appearing a moment
 * after the row it belongs to is a much better failure than a row that will not
 * draw until a request comes back.
 *
 * Two queries rather than one embedded select. The join is a dozen lines here
 * and it does not depend on PostgREST guessing which foreign key the embed
 * meant, which is the kind of thing that works until a second reference to the
 * same table is added.
 */
export function useMemberBadges(): { byMember: BadgesByMember; loading: boolean } {
  const [byMember, setByMember] = useState<BadgesByMember>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    void (async () => {
      const [defs, awards] = await Promise.all([
        supabase.from("badges").select(BADGE_COLUMNS),
        supabase.from("member_badges")
          .select("badge_id, character_id, note")
          .order("awarded_at", { ascending: true }),
      ]);
      const byId = new Map<number, BadgeDef>();
      for (const d of (defs.data ?? []) as BadgeDef[]) byId.set(d.id, d);

      const out: BadgesByMember = {};
      for (const a of (awards.data ?? []) as
           { badge_id: number; character_id: number; note: string | null }[]) {
        const def = byId.get(a.badge_id);
        if (!def) continue;
        (out[a.character_id] ??= []).push({ ...def, note: a.note });
      }
      setByMember(out);
      setLoading(false);
    })();
  }, []);

  return { byMember, loading };
}

/** The same data for one character, for a page that only shows one. */
export function useBadgesFor(characterId: number | null | undefined): AwardedBadge[] {
  const { byMember } = useMemberBadges();
  return characterId ? (byMember[characterId] ?? []) : [];
}
