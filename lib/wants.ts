import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentKind, Party, SlotRole } from "@/lib/party";
import { clashFor, needsByRole, partyStatus, placeOf } from "@/lib/party";
import { freeAt } from "@/lib/suggest";

/**
 * Somebody looking for a party, which the board has never had room for.
 *
 * Every row on /party is supply: a lead has decided to run something and is
 * short of people. The demand side — somebody who wants to raid this week and
 * has not found a group — had nowhere to stand, so a lead building a party
 * guessed who to ask from availability grids and old logs, and the person who
 * would have said yes immediately was guessed at along with everybody else.
 *
 * One want is one sentence: what, and as which role. When comes from the
 * availability grid on their profile, because "when am I free" should not have
 * two answers on one website.
 *
 * Two days. A want is about this week, and a list of people who were looking a
 * fortnight ago is a list nobody trusts — which is worse than an empty one,
 * because an empty list at least tells the truth.
 */
export interface Want {
  id: string;
  owner: string;
  characterId: number | null;
  name: string;
  avatar: string | null;
  /** Content kinds. Empty means anything. */
  kinds: ContentKind[];
  /** Particular fights, where the answer is narrower than a kind. */
  contentKeys: string[];
  /** Empty means whatever the party is short of. */
  roles: SlotRole[];
  note?: string;
  expiresAt: string;
  createdAt: string;
}

interface Row {
  id: number;
  owner: string;
  character_id: number | null;
  name: string;
  avatar: string | null;
  kinds: string[] | null;
  content_keys: string[] | null;
  roles: string[] | null;
  note: string | null;
  expires_at: string;
  created_at: string;
}

const COLUMNS = "id, owner, character_id, name, avatar, kinds, content_keys,"
  + " roles, note, expires_at, created_at";

const shape = (r: Row): Want => ({
  id: String(r.id),
  owner: r.owner,
  characterId: r.character_id,
  name: r.name,
  avatar: r.avatar,
  kinds: (r.kinds ?? []) as ContentKind[],
  contentKeys: r.content_keys ?? [],
  roles: (r.roles ?? []) as SlotRole[],
  note: r.note ?? undefined,
  expiresAt: r.expires_at,
  createdAt: r.created_at,
});

/** Everybody currently looking, oldest first so the longest wait reads first. */
export async function loadWants(supabase: SupabaseClient): Promise<Want[]> {
  const { data } = await supabase.from("party_wants")
    .select(COLUMNS)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  return ((data ?? []) as unknown as Row[]).map(shape);
}

export async function postWant(
  supabase: SupabaseClient, owner: string,
  me: { characterId: number; name: string; avatar: string | null },
  w: { kinds: ContentKind[]; contentKeys: string[]; roles: SlotRole[];
       note?: string },
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_wants").insert({
    owner,
    character_id: me.characterId,
    name: me.name,
    avatar: me.avatar,
    kinds: w.kinds,
    content_keys: w.contentKeys,
    roles: w.roles,
    // Cut here as well as in the box, so the one writer the app has cannot
    // put a paragraph on a card that clamps to two lines whatever it holds.
    note: w.note?.trim().slice(0, 60) || null,
  });
  return error ? { error: error.message } : {};
}

/** Gone, and gone properly: nobody needs a history of who was looking. */
export async function dropWant(
  supabase: SupabaseClient, id: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("party_wants").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

/**
 * Another two days.
 *
 * From now rather than from the old expiry, so a want extended on its last
 * evening is good for two more and not for five minutes.
 */
export async function extendWant(
  supabase: SupabaseClient, id: string,
): Promise<{ error?: string }> {
  const when = new Date(Date.now() + 2 * 86_400_000).toISOString();
  const { error } = await supabase.from("party_wants")
    .update({ expires_at: when }).eq("id", id);
  return error ? { error: error.message } : {};
}

/* ── matching ─────────────────────────────────────────────────────────────── */

/**
 * Whether this want is about this fight at all.
 *
 * The content half of wantMatches on its own, for the places that are asking a
 * different question. The suggestion list beside a seat wants to know who put
 * their hand up for this fight; whether tonight suits them is what the rest of
 * that list is already about, and a volunteer who turns out to be busy is
 * still a volunteer.
 */
export function wantCovers(
  w: Want, contentKey: string, kind: ContentKind | undefined, role?: SlotRole,
): boolean {
  if (w.contentKeys.length) {
    if (!w.contentKeys.includes(contentKey)) return false;
  } else if (w.kinds.length) {
    if (!kind || !w.kinds.includes(kind)) return false;
  }
  return !role || !w.roles.length || w.roles.includes(role);
}

/**
 * Whether this party is the one they were waiting to hear about.
 *
 * Deliberately here rather than in the database. Whether a party is still
 * short of a healer depends on which seats a shape has, who has offered to
 * move out of one, and who is already hovering over the rest — all of which
 * lives in party.ts, and none of which should exist twice.
 *
 * The last three checks are the ones that keep a notification from being an
 * annoyance: nobody wants to be told about their own party, a party they are
 * already in, or a party they could not join if they wanted to because they
 * have promised those hours to somebody else. A notification somebody can act
 * on is worth sending; the rest is noise with their name on it.
 */
export function wantMatches(
  w: Want, p: Party, kind: ContentKind | undefined,
  ctx: {
    /** Every party, for working out whether they are already busy then. */
    parties: readonly Party[];
    /** Their availability grid, or null where they have never filled it in. */
    hours: string | null;
    now?: number;
  },
): boolean {
  const now = ctx.now ?? Date.now();
  if (w.characterId == null) return false;

  // Only about parties that turned up after they said they were looking.
  if (new Date(p.createdAt).getTime() <= new Date(w.createdAt).getTime()) {
    return false;
  }
  /*
   * And only about evenings that have not started.
   *
   * "soon" is the last few minutes before the pull and nothing else, so a
   * party put up for Friday is "upcoming" — the two together are the whole of
   * "has not begun". A party already running is not something to be told
   * about: by the time anybody reads it the group has pulled.
   */
  const where = partyStatus(p, now);
  if (p.endedAt || (where !== "upcoming" && where !== "soon")) return false;

  // What they asked for. A named fight beats a kind, since somebody who named
  // one has told you they do not want the others.
  if (w.contentKeys.length) {
    if (!w.contentKeys.includes(p.contentKey)) return false;
  } else if (w.kinds.length) {
    if (!kind || !w.kinds.includes(kind)) return false;
  }

  // The role, as the board's own filter answers it: could a party like this
  // take somebody like me. An empty list is "whatever you are short of".
  if (w.roles.length) {
    const need = needsByRole(p);
    if (!w.roles.some((r) => need[r] > 0)) return false;
  }

  // Their hours. Unknown is not a no — most of the roster has never filled the
  // grid in, and refusing to tell them about anything would be a worse answer
  // than telling them about one evening they turn out to be busy for.
  if (freeAt(ctx.hours, p.startsAt) === false) return false;

  if (p.ownerCharacterId === w.characterId) return false;
  if (placeOf(p, w.characterId)) return false;
  if (clashFor(ctx.parties, w.characterId, p, p.id)) return false;

  return true;
}

