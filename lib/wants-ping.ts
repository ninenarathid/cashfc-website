import type { SupabaseClient } from "@supabase/supabase-js";
import type { Party } from "@/lib/party";
import { partyContent } from "@/lib/party-seeds";
import { loadWants, wantMatches } from "@/lib/wants";

/**
 * The half of the wants feature that only the server may carry.
 *
 * Its own file because party-seeds reads the content catalogue off disk, and a
 * module the browser imports for `dropWant` cannot also drag node:fs into the
 * bundle — which is exactly what it did, and the board went white.
 */
/**
 * Tell everybody whose want has just come true.
 *
 * Run from the board's own five-minute sweep rather than from a trigger: the
 * matching needs the party model — which seats a shape has, which roles are
 * still short, whether two evenings overlap — and that lives in TypeScript. A
 * trigger would need a second copy of it in SQL, and two copies of a rule is
 * one rule and one bug waiting for the day they disagree.
 *
 * Five minutes late is not late. "A party went up" is news for as long as the
 * party has not started.
 *
 * Idempotent on purpose: it asks what has already been sent rather than
 * remembering where it got to. A watermark would have to survive a redeploy, a
 * clock change and a failed run; this survives all three by not existing, and
 * the same sweep run twice sends nothing twice.
 */
export async function pingWants(
  supabase: SupabaseClient, parties: readonly Party[],
): Promise<number> {
  const wants = await loadWants(supabase);
  if (!wants.length) return 0;

  const ids = [...new Set(
    wants.map((w) => w.characterId).filter((x): x is number => x != null))];
  const { data: profs } = await supabase.from("profiles")
    .select("id, character_id, availability")
    .in("character_id", ids);

  type Prof = { id: string; character_id: number; availability: string | null };
  const by = new Map((profs ?? [] as unknown as Prof[])
    .map((x) => [(x as Prof).character_id, x as Prof]));

  // What has already been said, so a sweep that runs every five minutes does
  // not say it again every five minutes.
  const { data: sent } = await supabase.from("notifications")
    .select("recipient, party_id")
    .eq("kind", "party_match")
    .in("recipient", [...by.values()].map((x) => x.id));
  const said = new Set(((sent ?? []) as { recipient: string; party_id: number | null }[])
    .map((r) => `${r.recipient}|${r.party_id}`));

  const defs = Object.fromEntries(partyContent().map((c) => [c.key, c]));
  const rows: Record<string, unknown>[] = [];
  for (const w of wants) {
    const prof = w.characterId == null ? undefined : by.get(w.characterId);
    if (!prof) continue;
    for (const p of parties) {
      if (said.has(`${prof.id}|${p.id}`)) continue;
      const def = defs[p.contentKey];
      if (!wantMatches(w, p, def?.kind, {
        parties, hours: prof.availability ?? null,
      })) continue;
      said.add(`${prof.id}|${p.id}`);
      rows.push({
        recipient: prof.id,
        kind: "party_match",
        party_id: Number(p.id),
        body: def?.short ?? def?.badge ?? def?.name ?? "",
      });
    }
  }

  if (!rows.length) return 0;
  const { error } = await supabase.from("notifications").insert(rows);
  return error ? 0 : rows.length;
}
