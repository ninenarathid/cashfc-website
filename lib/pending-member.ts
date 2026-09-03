import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

/**
 * Somebody who has claimed a character the site has no data for yet.
 *
 * There is a gap between joining and appearing. A guest verifies their
 * character in the afternoon; the pipeline that looks up which world and which
 * company they play in runs that night and commits data/guests.json; the site
 * only knows about them after the deploy that follows. In between, every link
 * to their page — from a tag on a picture, from the profile they just filled
 * in, from the address they pasted to a friend — answered with a 404.
 *
 * A 404 says the page does not exist. For somebody who registered an hour ago
 * that is both wrong and discouraging, and it is the first thing the site ever
 * said to them. So the claim itself is enough to get a page: it is in the
 * database, it is theirs, and "we have not looked yet" is a better answer than
 * "no such person".
 *
 * Read with the anon key and no cookies. Nothing here is about the visitor, so
 * there is no session to carry, and the roster and guest pages that were built
 * ahead of time never reach this code — only an id none of them covered does.
 */

export interface PendingMember {
  id: number;
  /** What they claimed to be playing. Null if they never got that far. */
  name: string | null;
  /** Null while the claim is unproved — a different page, and a different fix. */
  verifiedAt: string | null;
}

export async function pendingMember(id: number): Promise<PendingMember | null> {
  // A character id is a positive integer. Anything else is somebody typing in
  // the address bar, and deserves the 404 it was going to get.
  if (!Number.isSafeInteger(id) || id <= 0 || !supabaseConfigured) return null;

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data } = await db.from("profiles")
    .select("character_name, character_verified_at")
    .eq("character_id", id)
    .limit(1);

  const row = (data ?? [])[0] as
    { character_name: string | null; character_verified_at: string | null } | undefined;
  if (!row) return null;

  return {
    id,
    // Only for a proved claim. An unverified one is a name somebody picked off
    // a list, and printing it as a heading would let anybody put any name on a
    // page of the site.
    name: row.character_verified_at ? row.character_name : null,
    verifiedAt: row.character_verified_at,
  };
}
