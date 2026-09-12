import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFull, MAX_UPLOAD_BYTES } from "@/lib/gallery";
import { knownRoulettes } from "@/lib/roulettes";
import type {
  Floater, Flex, LengthUnit, Loot, MapPlan, Party, PartyBlock, PartyComment,
  Progress, Reaction, SeatRule, Shape, SlotTaken, Spot,
} from "@/lib/party";
import { askedAbout } from "@/lib/party";

/**
 * The party finder, read from and written to the database.
 *
 * Kept apart from lib/party.ts, which is the model and knows nothing about
 * where a party is stored — the seat arithmetic and the resolver are the same
 * whether the data came from a table or from a test.
 *
 * Three tables. The listing carries its own small structured facts as jsonb
 * because nothing filters on them in SQL; the people are rows because they are
 * asked about one at a time; the comments are rows for the same reason. See
 * v39 for the argument in full.
 */

export const PARTY_BUCKET = "party";

/* ── shapes as the tables hold them ───────────────────────────────────────── */

interface PostRow {
  id: number;
  owner: string;
  owner_character_id: number | null;
  content_key: string;
  note: string | null;
  shape: string;
  starts_at: string;
  length_minutes: number;
  length_unit: string;
  /** How many goes, where the length is a count of them. See v44. */
  runs: number | null;
  one_of_each_job: boolean;
  closed: string[] | null;
  rules: Record<string, SeatRule> | null;
  progress: Progress | null;
  loot: Loot | null;
  spot: Spot | null;
  maps: MapPlan | null;
  roulettes: string[] | null;
  body: PartyBlock[] | null;
  created_at: string;
  updated_at: string | null;
  ended_at: string | null;
}

interface MemberRow {
  id: number;
  party_id: number;
  seat: string | null;
  character_id: number | null;
  name: string;
  avatar: string | null;
  job: string | null;
  flex: Flex | null;
  /** Every job they offered, where they offered more than one. */
  jobs: string[] | null;
  /** 'owner' if the lead put them here, 'self' if they asked to join. */
  asked_by: string | null;
  confirmed_at: string | null;
}

interface ReactionRow {
  comment_id: number;
  character_id: number | null;
  name: string;
  emoji: string;
}

interface CommentRow {
  id: number;
  party_id: number;
  author_character_id: number | null;
  author_name: string;
  author_avatar: string | null;
  body: string | null;
  images: string[] | null;
  created_at: string;
  deleted_at: string | null;
  edited_at: string | null;
  mentions: number[] | null;
  reply_to: number | null;
  mentions_all: boolean | null;
}

const POST_COLS =
  "id, owner, owner_character_id, content_key, note, shape, starts_at,"
  + " length_minutes, length_unit, runs, one_of_each_job, closed, rules, progress,"
  + " loot, spot, maps, roulettes, body, created_at, updated_at, ended_at";

const MEMBER_COLS =
  "id, party_id, seat, character_id, name, avatar, job, jobs, flex, asked_by,"
  + " confirmed_at";

/* ── reading ──────────────────────────────────────────────────────────────── */

/**
 * Every party still to come, with its people and its conversation.
 *
 * Three queries rather than one join. A join would return the listing once per
 * member and once per comment — a party of eight with four replies arriving
 * thirty-two times, its write-up and every one of its screenshots repeated in
 * each copy. Fetching the children by party id and stitching them here costs
 * two extra round trips and moves a great deal less.
 *
 * Finished parties are left behind. The board is for what is still to come, and
 * "started three hours ago and ran for two" is arithmetic the database can do
 * on the way out rather than the browser doing it on everything ever posted.
 *
 * `back` widens that window, which is what the Ended filter asks for. Kept as
 * an argument rather than always fetching a month, because the common load is
 * every load and a board that drags a month of finished parties across the wire
 * to show tonight's four is a board that feels slow to everybody in order to
 * serve the one person who went looking.
 */
export async function loadParties(
  supabase: SupabaseClient, opts?: { back?: number },
): Promise<Party[]> {
  const since = new Date(Date.now() - (opts?.back ?? 12) * 3600_000).toISOString();
  const { data: posts, error } = await supabase.from("party_posts")
    .select(POST_COLS)
    .is("deleted_at", null)
    .gte("starts_at", since)
    // Soonest first while the window is the usual one. Reversed for a wide
    // window so that the two hundred rows kept are the recent ones: asking for
    // a month and getting the oldest two hundred of it would hand back exactly
    // the parties nobody was looking for.
    .order("starts_at", { ascending: !opts?.back })
    .limit(200);
  if (error || !posts?.length) return [];

  const ids = (posts as unknown as PostRow[]).map((p) => p.id);
  const [{ data: members }, { data: comments }] = await Promise.all([
    supabase.from("party_members")
      .select(MEMBER_COLS)
      .in("party_id", ids),
    /*
     * Including the deleted ones, which are tombstones rather than holes.
     *
     * The body is already gone by the time anybody can read one — a trigger
     * blanks it when deleted_at is set — so what comes back is who said
     * something, when, and that it is no longer there.
     */
    supabase.from("party_comments")
      .select("id, party_id, author_character_id, author_name, author_avatar,"
              + " body, images, created_at, deleted_at, edited_at,"
              + " mentions, reply_to, mentions_all")
      .in("party_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  const seatsOf = new Map<number, Record<string, SlotTaken>>();
  const floatOf = new Map<number, Floater[]>();
  const askOf = new Map<number, Floater[]>();
  const inviteOf = new Map<number, Floater[]>();
  for (const m of (members ?? []) as unknown as MemberRow[]) {
    const who = {
      characterId: m.character_id, name: m.name, avatar: m.avatar,
      job: m.job, confirmedAt: m.confirmed_at,
      // Kept so a seat can be answered from either end. See SlotTaken.by.
      seatRowId: m.id,
      by: (m.asked_by === "self" ? "self" : "owner") as "self" | "owner",
      ...(m.jobs?.length ? { jobs: m.jobs } : {}),
      ...(m.flex ? { flex: m.flex } : {}),
    };
    /*
     * Asked, and not yet answered — which is not being in the party.
     *
     * Its own list rather than a flag on a seat, so that everything which
     * draws the party draws the party: the grid, the headcount and what it is
     * short of read the seats and the floaters, and none of them has to
     * remember that one of the rows in there is only a question. See
     * Party.requests.
     *
     * The seat it names is moved into the flex, which is where a request keeps
     * it — v59 does the same to the rows written before that was true, and
     * this handles either shape so the board reads correctly the moment the
     * code lands rather than the moment the migration runs.
     *
     * A lead taking a seat in their own party is never one of these: they
     * arrive answered, because there is nobody for them to be asking.
     */
    if (who.by === "self" && !m.confirmed_at) {
      const at = askOf.get(m.party_id) ?? [];
      at.push({
        ...who,
        flex: m.flex ?? (m.seat ? { seats: [m.seat] } : {}),
      } as Floater);
      askOf.set(m.party_id, at);
      continue;
    }
    /*
     * Asked by the lead, and not answered — which is also not being in the
     * party, and for the same reason the line above says it.
     *
     * This one had been left in, and it is the more expensive of the two to
     * leave in: a lead asks several people about one seat on purpose, so the
     * count runs away fastest exactly where the board is trying hardest to be
     * read. Its seat moves into the flex the same way, which is where v47 said
     * an invitation keeps it.
     */
    if (!m.confirmed_at) {
      const at = inviteOf.get(m.party_id) ?? [];
      at.push({
        ...who,
        flex: m.flex ?? (m.seat ? { seats: [m.seat] } : {}),
      } as Floater);
      inviteOf.set(m.party_id, at);
      continue;
    }
    if (m.seat) {
      const at = seatsOf.get(m.party_id) ?? {};
      at[m.seat] = who as SlotTaken;
      seatsOf.set(m.party_id, at);
    } else {
      // A member with no seat is floating, and the resolver works out where
      // they land from the seats free at the moment the party is drawn.
      const at = floatOf.get(m.party_id) ?? [];
      at.push({ ...who, flex: m.flex ?? {} } as Floater);
      floatOf.set(m.party_id, at);
    }
  }

  /*
   * The reactions, in a fourth query rather than a join.
   *
   * Same argument as the other three: joining them onto the comments would
   * return every comment once per reaction, with its pictures repeated in each
   * copy. Asked for by comment id, which is why it waits until the comments
   * have come back.
   */
  const talk = (comments ?? []) as unknown as CommentRow[];
  const reactOf = new Map<number, Reaction[]>();
  if (talk.length) {
    const { data: reacts } = await supabase.from("party_comment_reactions")
      .select("comment_id, character_id, name, emoji")
      .in("comment_id", talk.map((c) => c.id));
    for (const r of (reacts ?? []) as unknown as ReactionRow[]) {
      const on = reactOf.get(r.comment_id) ?? [];
      const already = on.find((x) => x.emoji === r.emoji);
      const who = { characterId: r.character_id, name: r.name };
      if (already) already.by.push(who);
      else on.push({ emoji: r.emoji, by: [who] });
      reactOf.set(r.comment_id, on);
    }
  }

  const talkOf = new Map<number, PartyComment[]>();
  for (const c of talk) {
    const at = talkOf.get(c.party_id) ?? [];
    at.push({
      id: String(c.id),
      author: {
        characterId: c.author_character_id, name: c.author_name,
        avatar: c.author_avatar,
      },
      text: c.body ?? "",
      ...(c.images?.length ? { images: c.images } : {}),
      ...(reactOf.has(c.id) ? { reactions: reactOf.get(c.id) } : {}),
      at: c.created_at,
      deletedAt: c.deleted_at,
      editedAt: c.edited_at,
      ...(c.mentions?.length ? { mentions: c.mentions } : {}),
      ...(c.mentions_all ? { mentionsAll: true } : {}),
      replyTo: c.reply_to == null ? null : String(c.reply_to),
    });
    talkOf.set(c.party_id, at);
  }

  /**
   * The shut seats, minus any the party has asked somebody to sit in.
   *
   * Two things a lead can say about one chair that contradict each other:
   * "we are not looking for anybody here" and "would you take D4?". The
   * listing said both about The Epic of Alexander -- D3 and D4 shut, four
   * invitations out to them -- and the board believed the first, so an eight
   * man fight advertised itself as 4/6 with two free seats while the people
   * who could fill them were being asked about the other two.
   *
   * The invitation wins, because it is the more recent and the more specific
   * thing the lead did: shutting a seat is a standing statement about a chair
   * and asking somebody is an act aimed at that chair. Shut it again by
   * withdrawing the invitation, which is the same sentence said once.
   */
  const stillShut = (shut: string[] | null, asked: Floater[] | undefined) => {
    const open = new Set(
      (asked ?? []).map((f) => askedAbout(f)).filter((s): s is string => !!s));
    return (shut ?? []).filter((id) => !open.has(id));
  };

  return (posts as unknown as PostRow[]).map((p) => ({
    id: String(p.id),
    contentKey: p.content_key,
    note: p.note ?? undefined,
    shape: p.shape as Shape,
    startsAt: p.starts_at,
    lengthMinutes: p.length_minutes,
    lengthUnit: (p.length_unit === "hours" ? "hours"
      : p.length_unit === "runs" ? "runs"
        : p.length_unit === "maps" ? "maps" : "food") as LengthUnit,
    ...(p.runs ? { runs: p.runs } : {}),
    ownerCharacterId: p.owner_character_id ?? -1,
    owner: p.owner,
    seats: seatsOf.get(p.id) ?? {},
    floating: floatOf.get(p.id) ?? [],
    requests: askOf.get(p.id) ?? [],
    invites: inviteOf.get(p.id) ?? [],
    closed: stillShut(p.closed, inviteOf.get(p.id)),
    rules: p.rules ?? {},
    oneOfEachJob: p.one_of_each_job,
    progress: p.progress ?? undefined,
    loot: p.loot ?? undefined,
    spot: p.spot ?? undefined,
    maps: p.maps ?? undefined,
    // Only the ones the game still has, so a retired roulette cannot linger
    // on a listing written before it went.
    ...(p.roulettes?.length ? { roulettes: knownRoulettes(p.roulettes) } : {}),
    body: p.body ?? [],
    comments: talkOf.get(p.id) ?? [],
    createdAt: p.created_at,
    updatedAt: p.updated_at ?? undefined,
    endedAt: p.ended_at,
  }));
}

/* ── writing ──────────────────────────────────────────────────────────────── */

/**
 * Put a party on the board.
 *
 * The listing goes in first because everybody else needs its id. If the members
 * fail after that the party exists with only its owner in it, which is a party
 * somebody can fix by clicking a seat — the other order would leave orphaned
 * member rows pointing at nothing.
 */
export async function createParty(
  supabase: SupabaseClient, userId: string, p: Party,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from("party_posts").insert({
    owner: userId,
    owner_character_id: p.ownerCharacterId > 0 ? p.ownerCharacterId : null,
    content_key: p.contentKey,
    note: p.note ?? null,
    shape: p.shape,
    starts_at: p.startsAt,
    length_minutes: p.lengthMinutes,
    length_unit: p.lengthUnit,
    runs: p.lengthUnit === "runs" ? (p.runs ?? null) : null,
    one_of_each_job: !!p.oneOfEachJob,
    closed: p.closed ?? [],
    rules: p.rules ?? {},
    progress: p.progress ?? null,
    loot: p.loot ?? null,
    spot: p.spot ?? null,
    maps: p.maps ?? null,
    roulettes: p.roulettes?.length ? p.roulettes : null,
    body: p.body ?? [],
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row" };

  const partyId = (data as { id: number }).id;
  const rows = [
    ...Object.entries(p.seats).map(([seat, v]) => ({
      party_id: partyId, seat,
      character_id: v.characterId, name: v.name, avatar: v.avatar,
      job: v.job ?? null, flex: v.flex ?? null,
      asked_by: v.by ?? "owner",
      confirmed_at: v.confirmedAt, invited_by: userId,
    })),
    ...(p.floating ?? []).map((f) => ({
      party_id: partyId, seat: null,
      character_id: f.characterId, name: f.name, avatar: f.avatar,
      job: f.job ?? null, flex: f.flex ?? null,
      asked_by: f.by ?? "owner",
      confirmed_at: f.confirmedAt, invited_by: userId,
    })),
  ];
  /*
   * Nobody twice, checked here rather than left to the constraint.
   *
   * party_members_once is on (party_id, character_id), and this is one insert:
   * a single duplicate takes the whole statement down, so a draft with the
   * lead both seated and flexing produced a party with nobody in it at all —
   * including the four people who were not duplicated. The listing is already
   * written by then, which is how the board ended up with a four-seat party
   * its own lead could not be found in.
   *
   * The seat wins, because it is the more specific of the two answers and it
   * is the one the grid is drawn from. Outsiders are left alone: they have no
   * id, the constraint does not apply to them, and two people called nothing
   * in particular are still two people.
   */
  const seen = new Set<number>();
  const once = rows.filter((r) => {
    if (r.character_id == null) return true;
    if (seen.has(r.character_id)) return false;
    seen.add(r.character_id);
    return true;
  });
  if (once.length) {
    const put = await supabase.from("party_members").insert(once);
    if (put.error) return { error: put.error.message };
  }
  return { id: String(partyId) };
}

/** Say something under a party. */
export async function addComment(
  supabase: SupabaseClient, userId: string, partyId: string,
  c: { characterId: number | null; name: string; avatar: string | null;
       text: string; images: string[];
       /** Characters named with an @. Decides who is told, and how. */
       mentions?: number[];
       /** Or the room, which is everybody in the party and nobody else. */
       mentionsAll?: boolean;
       /** The message this answers, where it answers one. */
       replyTo?: string | null },
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from("party_comments").insert({
    party_id: Number(partyId),
    author: userId,
    author_character_id: c.characterId,
    author_name: c.name,
    author_avatar: c.avatar,
    body: c.text,
    images: c.images,
    // Empty rather than an empty array: a column that is null for "nobody" is
    // one the trigger can test with coalesce and be done.
    mentions: c.mentions?.length ? c.mentions : null,
    mentions_all: !!c.mentionsAll,
    reply_to: c.replyTo ? Number(c.replyTo) : null,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row" };
  return { id: String((data as { id: number }).id) };
}

/* ── asking to join ───────────────────────────────────────────────────────── */

/**
 * Ask for a seat.
 *
 * Written unconfirmed, which is what makes it a request rather than a fact: the
 * board goes on advertising the seat until the lead says yes, because a party
 * that counts unanswered requests as filled turns away the people it is looking
 * for. A trigger tells the lead; nothing here has to remember to.
 *
 * `seat` is null for a flex join — "I can play any of these, put me where you
 * need me". The resolver works out where that lands every time the party is
 * drawn, so there is nothing to decide here.
 *
 * And naming one seat does not hold it, which is v47's rule for invitations
 * arriving where it always belonged. One seat holds one row, so a request
 * written into the chair meant the first person to ask about D4 was the only
 * person who could: everybody after them collided with the constraint and was
 * told they were already in the party. The seat goes into the flex instead —
 * "I could take D4", which is what it always meant — and party_let_in claims
 * the chair at the moment the lead says yes.
 *
 * `own` is the exception and stays a real seat, because it is not a request.
 * The lead is not asking anybody, the row arrives answered, and there is
 * nothing between writing it and holding the chair.
 */
export async function askToJoin(
  supabase: SupabaseClient, userId: string, partyId: string,
  who: { characterId: number | null; name: string; avatar: string | null;
         job?: string | null; jobs?: string[]; flex?: Flex;
         seat?: string | null;
         /**
          * The lead taking a seat in their own party.
          *
          * Same row, already answered. Everybody else is asking, and what they
          * are asking is for the lead to say yes — which is not a question the
          * lead can be on both ends of. Left as a request it would put them in
          * their own waiting list to approve themselves.
          */
         own?: boolean },
): Promise<{ id: string } | { error: string }> {
  const wants = who.seat ?? null;
  const { data, error } = await supabase.from("party_members").insert({
    party_id: Number(partyId),
    seat: who.own ? wants : null,
    character_id: who.characterId,
    name: who.name,
    avatar: who.avatar,
    // One job named is a job settled; several is an offer, and `job` stays
    // empty until somebody picks from it.
    job: who.job ?? (who.jobs?.length === 1 ? who.jobs[0] : null),
    jobs: who.jobs && who.jobs.length > 1 ? who.jobs : null,
    // The seat asked for, carried rather than held. askedAbout reads it back
    // out of exactly this shape.
    flex: who.own ? (who.flex ?? null)
      : wants ? { seats: [wants] }
        : (who.flex ?? null),
    asked_by: who.own ? "owner" : "self",
    confirmed_at: who.own ? new Date().toISOString() : null,
    invited_by: userId,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row" };
  return { id: String((data as { id: number }).id) };
}

/**
 * The listing, changed.
 *
 * The party's own details and nothing else: who is in it is not edited through
 * this form. A save that rewrote the roster would have to delete and recreate
 * every row to do it, and the thing those rows carry is whether somebody said
 * yes — which is not the lead's to retype. People join, leave and are let in
 * through the seat controls, which is where those decisions already live.
 *
 * updated_at is the database's, not ours: a trigger sets it on every update, so
 * a client with a wrong clock cannot claim a party was edited tomorrow.
 */
export async function updateParty(
  supabase: SupabaseClient, partyId: string, p: Party,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_posts").update({
    content_key: p.contentKey,
    note: p.note ?? null,
    shape: p.shape,
    starts_at: p.startsAt,
    length_minutes: p.lengthMinutes,
    length_unit: p.lengthUnit,
    runs: p.lengthUnit === "runs" ? (p.runs ?? null) : null,
    one_of_each_job: !!p.oneOfEachJob,
    closed: p.closed ?? [],
    rules: p.rules ?? {},
    progress: p.progress ?? null,
    loot: p.loot ?? null,
    spot: p.spot ?? null,
    maps: p.maps ?? null,
    roulettes: p.roulettes?.length ? p.roulettes : null,
    body: p.body ?? [],
  }).eq("id", Number(partyId));
  return error ? { error: error.message } : {};
}

/**
 * Over, when the lead says it is over.
 *
 * A stamp rather than a state, so "ended" and "ends at" are the same question
 * with one answer. Early or late both work: a farm party that finished three
 * runs ahead of the estimate and a prog night that ran two hours past it are
 * the same correction, and the estimate was never more than a guess.
 *
 * Nothing is destroyed. The party happened — or was called off, which is also
 * something that happened — and it keeps its conversation and its roster
 * either way. What stops is the board offering it as somewhere to go.
 *
 * Plain column, no function: unlike retiring, this does not hide the row from
 * the policy that has to read it back, so there is nothing here for the two
 * policies to disagree about.
 */
export async function finishParty(
  supabase: SupabaseClient, partyId: string, on = true,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_posts")
    .update({ ended_at: on ? new Date().toISOString() : null })
    .eq("id", Number(partyId));
  return error ? { error: error.message } : {};
}

/**
 * Taking one down.
 *
 * A tombstone rather than a delete, which is the opposite of what a dropped
 * seat gets and for the opposite reason: a seat is not a record of anything
 * once it is empty, and a party is — it has a conversation attached to it, and
 * people who were in it. Everything that reads the board filters on this
 * column already, so a retired party leaves the board and keeps its history.
 *
 * Through a function rather than by writing the column, which is v55's doing
 * and worth a line here. Setting deleted_at over the table was refused: the
 * read policy is `deleted_at is null`, so the update handed back a row the
 * same statement was no longer allowed to see, and the owner could change
 * every other column on their own listing except this one. The function asks
 * the ownership question plainly instead.
 *
 * Who may is still the owner or an admin, because somebody has to be able to
 * take down a listing whose author has gone quiet. False means it was already
 * gone, which is a second press rather than a failure, and reads the same way
 * to the caller as having just retired it.
 */
export async function deleteParty(
  supabase: SupabaseClient, partyId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("party_retire", {
    p_party: Number(partyId),
  });
  return error ? { error: error.message } : {};
}

/**
 * Let somebody in.
 *
 * Not one column any more, which is what v59 changed. A request names its seat
 * in the flex and does not hold it, so saying yes has two halves — the answer
 * and the chair — and they have to be one statement or two people let in at
 * once could be handed the same seat. The database does both and decides the
 * race; whoever it cannot seat is in the party as a floater, which is where
 * somebody who asked for "anywhere" was always going to land.
 *
 * Which seat they got is not reported back. There is only one person pressing
 * this — the lead, on their own party, one request at a time — so the answer
 * is whatever the board shows a moment later, and the board is reloaded either
 * way.
 */
export async function confirmSeat(
  supabase: SupabaseClient, seatRowId: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("party_let_in", { p_member: seatRowId });
  return error ? { error: error.message } : {};
}

/** What happened when somebody said yes. See v47. */
/**
 * What happened when somebody said yes. See v47, and v61 for "full".
 *
 * "full" is the one that is not about them: the party filled up while they
 * were deciding. An invitation was never a reservation, so this is a normal
 * outcome rather than an error — and it has to be said out loud, because the
 * button they pressed promised otherwise.
 */
export type Accepted = "seat" | "flex" | "gone" | "full";

/**
 * Say yes to an invitation, and take the suggested seat if it is still there.
 *
 * Through the database rather than as two statements from here, because two
 * people accepting the same seat in the same second is the whole problem this
 * is meant to solve: the unique index decides, and whoever loses is put in the
 * party without a seat instead of having their acceptance fail.
 */
export async function acceptInvite(
  supabase: SupabaseClient, seatRowId: number,
): Promise<{ got: Accepted } | { error: string }> {
  const { data, error } = await supabase.rpc("party_accept", { p_member: seatRowId });
  if (error) return { error: error.message };
  return { got: (data as Accepted) ?? "flex" };
}

/**
 * Say yes to an invitation, into the seat they picked.
 *
 * Two statements because the database's own function answers the invitation
 * and claims whatever seat the row names — so the row is told which seat first,
 * and then answered. The chair is still claimed by party_accept in one
 * statement, which is what keeps two people answering at once from both
 * getting it.
 *
 * The job rides along on the first write. It is optional everywhere it is
 * asked for, so null is a normal answer and not a missing one.
 */
export async function acceptInto(
  supabase: SupabaseClient, seatRowId: number, seat: string,
  job: string | null,
): Promise<{ got: Accepted } | { error: string }> {
  const { error: first } = await supabase.from("party_members")
    .update({ flex: { seats: [seat] }, ...(job ? { job } : {}) })
    .eq("id", seatRowId);
  if (first) return { error: first.message };
  return acceptInvite(supabase, seatRowId);
}

/**
 * Stand up, and stay in the party.
 *
 * The other half of taking a seat, and it had nowhere to be done from: the
 * only way out of a chair was out of the evening. Somebody who has said yes
 * and would rather leave the seat open while the party sorts itself out is
 * exactly who the bench is for.
 *
 * The offer they are standing up into is theirs to say. "Anywhere" is the
 * common one and stays the default, but somebody who can play the two DPS
 * seats and nothing else is making a different and more useful offer, and
 * writing "anywhere" over it would have the resolver put them in the healer
 * seat it was trying to fill.
 */
export async function leaveSeat(
  supabase: SupabaseClient, seatRowId: number, flex: Flex = { all: true },
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_members")
    .update({ seat: null, flex })
    .eq("id", seatRowId);
  return error ? { error: error.message } : {};
}

/**
 * Take a free seat, once already in.
 *
 * The other half: you say yes first and choose where you are standing
 * afterwards, which is the order people decide in. Returns "taken" when
 * somebody got there first, which is a thing to say rather than an error.
 */
export async function takeSeat(
  supabase: SupabaseClient, seatRowId: number, seat: string,
  job: string | null = null,
): Promise<{ got: "seat" | "taken" | "gone" } | { error: string }> {
  // Written before the claim, because the claim clears the flex and this is
  // the same row: two writes in the other order would fight each other.
  if (job) {
    const { error: first } = await supabase.from("party_members")
      .update({ job }).eq("id", seatRowId);
    if (first) return { error: first.message };
  }
  const { data, error } = await supabase.rpc("party_take_seat", {
    p_member: seatRowId, p_seat: seat,
  });
  if (error) return { error: error.message };
  return { got: (data as "seat" | "taken" | "gone") ?? "taken" };
}

/**
 * Take a seat back: turned down, withdrawn, or somebody leaving.
 *
 * A real delete rather than a tombstone, for the reason v39 gives: a seat is
 * not a record of anything once it is empty, and a hidden row would have to be
 * filtered out of every count on the board.
 */
export async function dropSeat(
  supabase: SupabaseClient, seatRowId: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_members").delete().eq("id", seatRowId);
  return error ? { error: error.message } : {};
}

/**
 * People the lead has just added to their own party.
 *
 * Invitations, not memberships: asked_by says the lead asked, and nothing is
 * confirmed — being added to a party is not the same as having agreed to come,
 * and the seat grid already draws the difference. Somebody from off this site
 * is the exception and arrives answered, because there is no account behind
 * them to do the answering.
 *
 * Only people who are not in it yet. The form shows everybody, and everybody
 * already there is locked in it: the rows carry whether somebody said yes,
 * which is theirs and not the lead's to retype. Anyone the form hands back
 * without a row id is somebody who was added just now.
 *
 * One insert, deduplicated first, for the reason createParty learned the hard
 * way: party_members_once is on (party_id, character_id) and a single
 * collision takes the whole statement with it.
 */
export async function inviteMembers(
  supabase: SupabaseClient, userId: string, partyId: string,
  who: { seat: string | null; characterId: number | null; name: string;
         avatar: string | null; job?: string | null; jobs?: string[];
         flex?: Flex | null; confirmedAt?: string | null }[],
): Promise<{ error?: string; added: number }> {
  if (!who.length) return { added: 0 };
  const seen = new Set<number>();
  const once = who.filter((w) => {
    if (w.characterId == null) return true;
    if (seen.has(w.characterId)) return false;
    seen.add(w.characterId);
    return true;
  });
  const { error } = await supabase.from("party_members").insert(
    once.map((w) => ({
      party_id: Number(partyId),
      seat: w.seat,
      character_id: w.characterId,
      name: w.name,
      avatar: w.avatar,
      job: w.job ?? (w.jobs?.length === 1 ? w.jobs[0] : null),
      jobs: w.jobs && w.jobs.length > 1 ? w.jobs : null,
      flex: w.flex ?? null,
      asked_by: "owner",
      confirmed_at: w.confirmedAt ?? null,
      invited_by: userId,
    })));
  return error ? { error: error.message, added: 0 } : { added: once.length };
}

/**
 * The lead's own place, changed from the listing form.
 *
 * One row and only one: the caller's. The form has never written the roster
 * and still does not — who else is in a party is settled by those people
 * saying yes, and a save that rewrote the list would be the lead retyping
 * other people's answers. But their own place is theirs, and the form is
 * where they were looking for it.
 *
 * Three things can have happened, and they are three different calls rather
 * than one upsert: joining is a new row, leaving destroys one, and moving
 * keeps the row — which matters, because the row is where "they said yes"
 * lives and a move that dropped and re-added it would quietly reset that.
 *
 * Taking a seat goes through party_take_seat even here, so the lead editing
 * their listing races for a seat on the same terms as somebody pressing join
 * on the party page. The index decides; `taken` is the answer when it decides
 * against them, which is a thing to say rather than an error.
 */
export async function setOwnSeat(
  supabase: SupabaseClient, userId: string, partyId: string,
  me: { characterId: number; name: string; avatar: string | null },
  was: { rowId?: number; seat: string | null; flex: Flex | null } | null,
  want: { seat: string | null; flex: Flex | null } | null,
): Promise<{ error?: string; taken?: string }> {
  if (!was && !want) return {};

  if (!was) {
    const r = await askToJoin(supabase, userId, partyId, {
      characterId: me.characterId, name: me.name, avatar: me.avatar,
      seat: want!.seat, flex: want!.flex ?? undefined, own: true,
    });
    return "error" in r ? { error: r.error } : {};
  }

  // Nothing to delete where there is no row: a draft the database never saw.
  if (was.rowId == null) return {};
  if (!want) return dropSeat(supabase, was.rowId);

  const same = was.seat === want.seat
    && JSON.stringify(was.flex ?? null) === JSON.stringify(want.flex ?? null);
  if (same) return {};

  if (want.seat) {
    const r = await takeSeat(supabase, was.rowId, want.seat);
    if ("error" in r) return { error: r.error };
    return r.got === "taken" ? { taken: want.seat } : {};
  }

  // Out of the seat and back to flexible, which party_take_seat has no way to
  // say — it only ever puts somebody into one.
  const { error } = await supabase.from("party_members")
    .update({ seat: null, flex: want.flex ?? { all: true } })
    .eq("id", was.rowId);
  return error ? { error: error.message } : {};
}

/**
 * Change what a message says.
 *
 * The stamp goes on from here rather than from a trigger, because a delete
 * also updates the row and is not an edit — and a line that claimed to have
 * been edited the moment it was deleted would be the tombstone lying about
 * what happened to it.
 */
export async function editComment(
  supabase: SupabaseClient, commentId: string, text: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_comments")
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq("id", Number(commentId));
  return error ? { error: error.message } : {};
}

/**
 * Take one back.
 *
 * Only the stamp is sent. What the row keeps is the database's decision, not
 * this function's: a trigger blanks the body and the pictures, so the promise
 * that a deleted message is gone does not depend on which client made the
 * call.
 */
export async function dropComment(
  supabase: SupabaseClient, commentId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", Number(commentId));
  return error ? { error: error.message } : {};
}

/**
 * Put a reaction on a reply, or take it off again.
 *
 * One call for both, because from the reader's side it is one button: the
 * second press on the same emoji is how you undo the first. Which it does is
 * decided by what is already there rather than by the caller, so two windows
 * open on the same party cannot disagree about what the button means.
 */
export async function toggleReaction(
  supabase: SupabaseClient, userId: string, commentId: string, emoji: string,
  who: { characterId: number | null; name: string },
  mine: boolean,
): Promise<{ error?: string }> {
  if (mine) {
    const { error } = await supabase.from("party_comment_reactions")
      .delete()
      .eq("comment_id", Number(commentId))
      .eq("profile_id", userId)
      .eq("emoji", emoji);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.from("party_comment_reactions").insert({
    comment_id: Number(commentId),
    profile_id: userId,
    character_id: who.characterId,
    name: who.name,
    emoji,
  });
  // Pressing it twice quickly races itself against the unique index. The row
  // it collided with is the row the reader wanted, so this is not a failure to
  // report — it is the second press finding the first already done.
  if (error && !/duplicate key/i.test(error.message)) return { error: error.message };
  return {};
}

/* ── pictures ─────────────────────────────────────────────────────────────── */

/**
 * One screenshot, stored and turned into a URL.
 *
 * The same arrangement the feedback attachments use, down to the re-encode: a
 * game screenshot is a large PNG of mostly flat colour and WebP takes it apart.
 * The path starts with the uploader's id because the storage policy insists on
 * it, and carries the time and some randomness because everybody's screenshot
 * is called the same thing.
 */
export async function uploadPartyImage(
  supabase: SupabaseClient, userId: string, file: File,
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "not-image" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too-big" };

  let body: Blob = file;
  let ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  let type: string | undefined;
  try {
    const lighter = await makeFull(file);
    if (lighter) { body = lighter; ext = "webp"; type = "image/webp"; }
  } catch { /* the original will do */ }

  const at = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from(PARTY_BUCKET)
    .upload(at, body, { cacheControl: "31536000", upsert: false, contentType: type });
  if (up.error) return { error: up.error.message };

  return { url: supabase.storage.from(PARTY_BUCKET).getPublicUrl(at).data.publicUrl };
}
