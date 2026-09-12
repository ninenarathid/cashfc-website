import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import type {
  Flex, Floater, LengthUnit, Loot, MapPlan, Party, Progress, SeatRule, Shape,
  SlotRole, SlotTaken, Spot,
} from "@/lib/party";
import { shortfallOf } from "@/lib/party";

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
  /**
   * Whether the roster came back at all.
   *
   * The card function learned to return members in v50. Before that migration
   * runs it does not, and an empty roster is indistinguishable from a party
   * nobody has joined — which would have every card announcing a full raid as
   * short of eight. So this says which, and what is short is not guessed at
   * until the database is actually answering the question.
   */
  hasMembers: boolean;
  /** Everybody in it, answered or not, for working out what is short. */
  seats: Record<string, SlotTaken>;
  floating: Floater[];
  closed: string[];
  rules: Record<string, SeatRule>;
  oneOfEachJob: boolean;
}

interface Member {
  seat: string | null;
  character_id: number | null;
  name: string;
  avatar: string | null;
  job: string | null;
  flex: Flex | null;
  confirmed_at: string | null;
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
  rules: Record<string, SeatRule> | null;
  closed: string[] | null;
  one_of_each_job: boolean | null;
  members: Member[] | null;
  /** Absent until v63 has run, which reads as "nobody has been asked". */
  asked_seats?: string[] | null;
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
      hasMembers: Array.isArray(r.members),
      ...split(r.members ?? []),
      /*
       * Shut, minus the seats somebody has been asked to sit in.
       *
       * The same rule the site applies when it loads a party, applied here
       * because this is the one place that cannot see the invitations for
       * itself -- v61 took the unanswered members off the card, and a seat a
       * lead is waiting on an answer about is not a seat the party has shut.
       * Without it the picture inside the Discord message worked from six
       * seats while the message around it worked from eight.
       */
      closed: (r.closed ?? []).filter(
        (id) => !(r.asked_seats ?? []).includes(id)),
      rules: r.rules ?? {},
      oneOfEachJob: !!r.one_of_each_job,
    };
  } catch {
    return null;
  }
}

/** "4/8", or "3 coming" where there are no seats to be full of. */
export const seatCount = (c: PartyCard): string =>
  c.seatsTotal ? `${c.seatsTaken}/${c.seatsTotal}` : String(c.seatsTaken);

/**
 * Members, as the board keeps them: in seats, or standing beside them.
 *
 * The same split loadParties makes, for the same reason — a floater is not in
 * a seat, and writing them into one would decide something nobody has.
 */
function split(rows: Member[]): { seats: Record<string, SlotTaken>; floating: Floater[] } {
  const seats: Record<string, SlotTaken> = {};
  const floating: Floater[] = [];
  for (const m of rows) {
    const who = {
      characterId: m.character_id, name: m.name, avatar: m.avatar,
      job: m.job, flex: m.flex ?? {}, confirmedAt: m.confirmed_at,
    };
    if (m.seat) seats[m.seat] = who;
    else floating.push(who);
  }
  return { seats, floating };
}

/**
 * Which roles the party is short of, the way the board says it.
 *
 * Not a subtraction. Somebody flexing across MT and D2 covers whichever of the
 * two is still open, so what a party is short of is the answer to a resolution
 * rather than a count — and this runs the resolver the board runs, so the card
 * and the row cannot disagree about whether a healer is wanted.
 *
 * Empty for a party with no seats, which is short of nothing by definition, and
 * for one whose remaining seats all have somebody hovering over them: what that
 * party wants is bodies, and the card already says how many.
 *
 * Empty for an alliance too. Twenty-four seats short of a dozen is not a line
 * anybody reads off a card in a Discord channel — it is three numbers that add
 * up to what "8/24" already said, in bigger type. A party of eight or four is
 * the size where "need one healer" is a fact somebody can act on.
 */
export const cardNeeds = (c: PartyCard): [SlotRole[], number][] => {
  if (!c.hasMembers || !c.seatsTotal || c.seatsTotal > 8) return [];
  const p: Party = {
    id: "card", contentKey: c.contentKey, shape: c.shape,
    startsAt: c.startsAt, lengthMinutes: c.lengthMinutes, lengthUnit: c.lengthUnit,
    ownerCharacterId: 0, createdAt: c.startsAt,
    seats: c.seats, floating: c.floating,
    closed: c.closed, rules: c.rules, oneOfEachJob: c.oneOfEachJob,
  };
  /*
   * A list of roles per badge, not one role per badge.
   *
   * Almost every badge names one role and always did. The exception is the
   * party whose healer can tank: it wants one more person and will take
   * either, so "Need 1 Tank/Healer" is one chip and one person, where two
   * chips would have been the card asking for two.
   */
  const cut = shortfallOf(p);
  const out = (["tank", "healer", "dps"] as SlotRole[])
    .filter((r) => cut.need[r] > 0)
    .map((r) => [[r], cut.need[r]] as [SlotRole[], number]);
  // No roles on the last badge means the remainder could not be named as a
  // choice without lying about how many of each could come. "Need 2 more".
  if (cut.either) out.push([cut.either.roles, cut.either.n]);
  else if (cut.spare) out.push([[], cut.spare]);
  return out;
};
