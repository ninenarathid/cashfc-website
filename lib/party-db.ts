import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFull, MAX_UPLOAD_BYTES } from "@/lib/gallery";
import { knownRoulettes } from "@/lib/roulettes";
import type {
  Floater, Flex, LengthUnit, Loot, MapPlan, Party, PartyBlock, PartyComment,
  Progress, Reaction, SeatRule, Shape, SlotTaken, Spot,
} from "@/lib/party";

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
}

const POST_COLS =
  "id, owner, owner_character_id, content_key, note, shape, starts_at,"
  + " length_minutes, length_unit, runs, one_of_each_job, closed, rules, progress,"
  + " loot, spot, maps, roulettes, body, created_at, updated_at";

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
              + " mentions, reply_to")
      .in("party_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  const seatsOf = new Map<number, Record<string, SlotTaken>>();
  const floatOf = new Map<number, Floater[]>();
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
      replyTo: c.reply_to == null ? null : String(c.reply_to),
    });
    talkOf.set(c.party_id, at);
  }

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
    closed: p.closed ?? [],
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
  if (rows.length) {
    const put = await supabase.from("party_members").insert(rows);
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
 */
export async function askToJoin(
  supabase: SupabaseClient, userId: string, partyId: string,
  who: { characterId: number | null; name: string; avatar: string | null;
         job?: string | null; jobs?: string[]; flex?: Flex;
         seat?: string | null },
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from("party_members").insert({
    party_id: Number(partyId),
    seat: who.seat ?? null,
    character_id: who.characterId,
    name: who.name,
    avatar: who.avatar,
    // One job named is a job settled; several is an offer, and `job` stays
    // empty until somebody picks from it.
    job: who.job ?? (who.jobs?.length === 1 ? who.jobs[0] : null),
    jobs: who.jobs && who.jobs.length > 1 ? who.jobs : null,
    flex: who.flex ?? null,
    asked_by: "self",
    confirmed_at: null,
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
 * Taking one down.
 *
 * A tombstone rather than a delete, which is the opposite of what a dropped
 * seat gets and for the opposite reason: a seat is not a record of anything
 * once it is empty, and a party is — it has a conversation attached to it, and
 * people who were in it. Everything that reads the board filters on this
 * column already, so a retired party leaves the board and keeps its history.
 *
 * Who may is the policy's business, not ours: the owner, or an admin, because
 * somebody has to be able to take down a listing whose author has gone quiet.
 */
export async function deleteParty(
  supabase: SupabaseClient, partyId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", Number(partyId));
  return error ? { error: error.message } : {};
}

/**
 * Let somebody in, or say yes to an invitation.
 *
 * One function for both because it is one column either way, and which
 * direction it was asked in is already on the row.
 */
export async function confirmSeat(
  supabase: SupabaseClient, seatRowId: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_members")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", seatRowId);
  return error ? { error: error.message } : {};
}

/** What happened when somebody said yes. See v47. */
export type Accepted = "seat" | "flex" | "gone";

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
 * Take a free seat, once already in.
 *
 * The other half: you say yes first and choose where you are standing
 * afterwards, which is the order people decide in. Returns "taken" when
 * somebody got there first, which is a thing to say rather than an error.
 */
export async function takeSeat(
  supabase: SupabaseClient, seatRowId: number, seat: string,
): Promise<{ got: "seat" | "taken" | "gone" } | { error: string }> {
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

/** Take a listing off the board without destroying it. */
export async function retireParty(
  supabase: SupabaseClient, partyId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", Number(partyId));
  return error ? { error: error.message } : {};
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
