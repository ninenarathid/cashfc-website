import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFull, MAX_UPLOAD_BYTES } from "@/lib/gallery";
import type {
  Floater, Flex, Loot, Party, PartyBlock, PartyComment, Progress, SeatRule,
  Shape, SlotTaken, Spot,
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
  one_of_each_job: boolean;
  closed: string[] | null;
  rules: Record<string, SeatRule> | null;
  progress: Progress | null;
  loot: Loot | null;
  spot: Spot | null;
  body: PartyBlock[] | null;
  created_at: string;
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
  confirmed_at: string | null;
}

interface CommentRow {
  id: number;
  party_id: number;
  author_character_id: number | null;
  author_name: string;
  author_avatar: string | null;
  body: string;
  images: string[] | null;
  created_at: string;
}

const POST_COLS =
  "id, owner, owner_character_id, content_key, note, shape, starts_at,"
  + " length_minutes, length_unit, one_of_each_job, closed, rules, progress,"
  + " loot, spot, body, created_at";

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
 */
export async function loadParties(supabase: SupabaseClient): Promise<Party[]> {
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data: posts, error } = await supabase.from("party_posts")
    .select(POST_COLS)
    .is("deleted_at", null)
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error || !posts?.length) return [];

  const ids = (posts as unknown as PostRow[]).map((p) => p.id);
  const [{ data: members }, { data: comments }] = await Promise.all([
    supabase.from("party_members")
      .select("id, party_id, seat, character_id, name, avatar, job, flex, confirmed_at")
      .in("party_id", ids),
    supabase.from("party_comments")
      .select("id, party_id, author_character_id, author_name, author_avatar,"
              + " body, images, created_at")
      .in("party_id", ids).is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const seatsOf = new Map<number, Record<string, SlotTaken>>();
  const floatOf = new Map<number, Floater[]>();
  for (const m of (members ?? []) as unknown as MemberRow[]) {
    const who = {
      characterId: m.character_id, name: m.name, avatar: m.avatar,
      job: m.job, confirmedAt: m.confirmed_at,
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

  const talkOf = new Map<number, PartyComment[]>();
  for (const c of (comments ?? []) as unknown as CommentRow[]) {
    const at = talkOf.get(c.party_id) ?? [];
    at.push({
      id: String(c.id),
      author: {
        characterId: c.author_character_id, name: c.author_name,
        avatar: c.author_avatar,
      },
      text: c.body,
      ...(c.images?.length ? { images: c.images } : {}),
      at: c.created_at,
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
    lengthUnit: (p.length_unit === "hours" ? "hours" : "food") as "hours" | "food",
    ownerCharacterId: p.owner_character_id ?? -1,
    seats: seatsOf.get(p.id) ?? {},
    floating: floatOf.get(p.id) ?? [],
    closed: p.closed ?? [],
    rules: p.rules ?? {},
    oneOfEachJob: p.one_of_each_job,
    progress: p.progress ?? undefined,
    loot: p.loot ?? undefined,
    spot: p.spot ?? undefined,
    body: p.body ?? [],
    comments: talkOf.get(p.id) ?? [],
    createdAt: p.created_at,
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
    one_of_each_job: !!p.oneOfEachJob,
    closed: p.closed ?? [],
    rules: p.rules ?? {},
    progress: p.progress ?? null,
    loot: p.loot ?? null,
    spot: p.spot ?? null,
    body: p.body ?? [],
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row" };

  const partyId = (data as { id: number }).id;
  const rows = [
    ...Object.entries(p.seats).map(([seat, v]) => ({
      party_id: partyId, seat,
      character_id: v.characterId, name: v.name, avatar: v.avatar,
      job: v.job ?? null, flex: v.flex ?? null,
      confirmed_at: v.confirmedAt, invited_by: userId,
    })),
    ...(p.floating ?? []).map((f) => ({
      party_id: partyId, seat: null,
      character_id: f.characterId, name: f.name, avatar: f.avatar,
      job: f.job ?? null, flex: f.flex ?? null,
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
       text: string; images: string[] },
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from("party_comments").insert({
    party_id: Number(partyId),
    author: userId,
    author_character_id: c.characterId,
    author_name: c.name,
    author_avatar: c.avatar,
    body: c.text,
    images: c.images,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row" };
  return { id: String((data as { id: number }).id) };
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
