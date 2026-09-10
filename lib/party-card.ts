import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import type { LengthUnit, Loot, MapPlan, Progress, Shape, Spot } from "@/lib/party";

/**
 * One party, as much of it as a link preview should say.
 *
 * Read through the party_card function rather than off the tables, because the
 * thing asking is Discord's crawler and it has no session — the party tables
 * are `authenticated` only, which is why a link to a raid night used to unfurl
 * as the site's own boilerplate. See v43 for why it is a function and not a
 * policy.
 *
 * Every failure returns null, and every caller falls back to the plain page
 * metadata. A card is a nicety; a link that 500s because a preview could not be
 * drawn is not.
 */

export interface PartyCard {
  contentKey: string;
  note: string | null;
  shape: Shape;
  startsAt: string;
  lengthMinutes: number;
  lengthUnit: LengthUnit;
  /** How many goes, where the length is a count of them. */
  runs: number | null;
  ownerName: string | null;
  /** 0 for a party with no fixed seats. */
  seatsTotal: number;
  seatsTaken: number;
  progress: Progress | null;
  loot: Loot | null;
  spot: Spot | null;
  maps: MapPlan | null;
  roulettes: string[] | null;
}

interface Row {
  content_key: string;
  note: string | null;
  shape: string;
  starts_at: string;
  length_minutes: number;
  length_unit: string;
  runs: number | null;
  owner_name: string | null;
  seats_total: number;
  seats_taken: number;
  progress: Progress | null;
  loot: Loot | null;
  spot: Spot | null;
  maps: MapPlan | null;
  roulettes: string[] | null;
}

/** Long enough for a cold function, short enough not to hold up a page. */
const FETCH_MS = 3500;

export async function partyCard(id: string): Promise<PartyCard | null> {
  if (!supabaseConfigured) return null;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/party_card`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_id: n }),
      signal: AbortSignal.timeout(FETCH_MS),
      // The board moves. A card cached for an hour would tell Discord a party
      // still needs a healer twenty minutes after somebody filled the seat.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json() as Row[];
    const r = rows?.[0];
    if (!r) return null;
    return {
      contentKey: r.content_key,
      note: r.note,
      shape: r.shape as Shape,
      startsAt: r.starts_at,
      lengthMinutes: r.length_minutes,
      lengthUnit: (r.length_unit === "hours" ? "hours"
        : r.length_unit === "runs" ? "runs"
          : r.length_unit === "maps" ? "maps" : "food") as LengthUnit,
      runs: r.runs ?? null,
      ownerName: r.owner_name,
      seatsTotal: r.seats_total,
      seatsTaken: r.seats_taken,
      progress: r.progress,
      loot: r.loot,
      spot: r.spot,
      maps: r.maps,
      roulettes: r.roulettes,
    };
  } catch {
    return null;
  }
}

/** "4/8", or "3 coming" where there are no seats to be full of. */
export const seatCount = (c: PartyCard): string =>
  c.seatsTotal ? `${c.seatsTaken}/${c.seatsTotal}` : String(c.seatsTaken);
