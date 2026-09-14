import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A conversation hanging off something, whatever that something is.
 *
 * The party board grew a conversation first; the gallery got one in v68 and the
 * front page's notices in v70, and all three are the same rows with a different
 * word in front of them. This was about to be written out a third time — so it
 * is written once and told which tables to use.
 *
 * The party board is not on this: its messages come back inside loadParties
 * with the party they belong to, and its rows carry the author's name and face
 * rather than looking them up. Pulling it in would mean changing how a party
 * loads to save a function it does not call.
 *
 * The eventual right answer is one table of messages keyed by what they hang
 * off. That is a migration of everything rather than an addition to it, and
 * this is the shape to do it behind.
 */
export interface Thread {
  /** The table the messages are in. */
  table: string;
  /** Its reactions table. */
  reactions: string;
  /** The column naming the thing being talked about. */
  key: string;
}

export const GALLERY_THREAD: Thread = {
  table: "gallery_comments",
  reactions: "gallery_comment_reactions",
  key: "post_id",
};

export const NOTICE_THREAD: Thread = {
  table: "announcement_comments",
  reactions: "announcement_comment_reactions",
  key: "announcement_id",
};

/** The same shape the party board's messages are in. See ui/Messages. */
export interface Message {
  id: string;
  author: { characterId: number | null; name: string; avatar: string | null };
  text: string;
  images?: string[];
  reactions?: { emoji: string; by: { characterId: number | null; name: string }[] }[];
  at: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  mentions?: number[];
  mentionsAll?: boolean;
  replyTo?: string | null;
}

interface Row {
  id: number;
  author_id: string;
  body: string | null;
  images: string[] | null;
  reply_to: number | null;
  edited_at: string | null;
  deleted_at: string | null;
  mentions: number[] | null;
  mentions_all: boolean | null;
  created_at: string;
}

/**
 * Everything said about one thing, oldest first.
 *
 * Authors are resolved here rather than handed in. The page that draws the
 * gallery builds a map of whoever posted a picture, and somebody who has only
 * ever left a comment is not in it — which read as a message from "—".
 *
 * Reactions come in a second query rather than a join: joining them would
 * return every message once per reaction with its pictures repeated in each
 * copy.
 */
export async function loadThread(
  supabase: SupabaseClient, t: Thread, id: number,
): Promise<Message[]> {
  const { data: rows } = await supabase.from(t.table)
    .select("id, author_id, body, images, reply_to, edited_at, deleted_at,"
      + " mentions, mentions_all, created_at")
    .eq(t.key, id)
    .order("created_at", { ascending: true });

  const talk = (rows ?? []) as unknown as Row[];
  if (!talk.length) return [];

  const [{ data: profs }, { data: reacts }] = await Promise.all([
    supabase.from("profiles")
      .select("id, character_id, character_name, display_name,"
        + " discord_username, discord_avatar, avatar_url")
      .in("id", [...new Set(talk.map((c) => c.author_id))]),
    supabase.from(t.reactions)
      .select("comment_id, character_id, name, emoji")
      .in("comment_id", talk.map((c) => c.id)),
  ]);

  type Prof = {
    id: string; character_id: number | null; character_name: string | null;
    display_name: string | null; discord_username: string | null;
    discord_avatar: string | null; avatar_url: string | null;
  };
  const who = new Map(((profs ?? []) as unknown as Prof[]).map((p) => [p.id, {
    characterId: p.character_id,
    name: p.character_name ?? p.display_name ?? p.discord_username ?? "—",
    // What they chose first, then what Discord gave them, the same order the
    // member board lays an override over a Lodestone portrait.
    avatar: p.avatar_url ?? p.discord_avatar ?? null,
  }]));

  const on = new Map<number, Message["reactions"]>();
  for (const r of ((reacts ?? []) as unknown as {
    comment_id: number; character_id: number | null; name: string; emoji: string;
  }[])) {
    const list = on.get(r.comment_id) ?? [];
    const already = list.find((x) => x.emoji === r.emoji);
    const w = { characterId: r.character_id, name: r.name };
    if (already) already.by.push(w);
    else list.push({ emoji: r.emoji, by: [w] });
    on.set(r.comment_id, list);
  }

  return talk.map((c) => ({
    id: String(c.id),
    author: who.get(c.author_id)
      ?? { characterId: null, name: "—", avatar: null },
    text: c.body ?? "",
    ...(c.images?.length ? { images: c.images } : {}),
    ...(on.has(c.id) ? { reactions: on.get(c.id) } : {}),
    at: c.created_at,
    deletedAt: c.deleted_at,
    editedAt: c.edited_at,
    ...(c.mentions?.length ? { mentions: c.mentions } : {}),
    ...(c.mentions_all ? { mentionsAll: true } : {}),
    replyTo: c.reply_to == null ? null : String(c.reply_to),
  }));
}

export async function addToThread(
  supabase: SupabaseClient, t: Thread, id: number, userId: string,
  c: { text: string; images?: string[]; mentions?: number[];
       mentionsAll?: boolean; replyTo?: string | null },
): Promise<{ error?: string }> {
  const { error } = await supabase.from(t.table).insert({
    [t.key]: id,
    author_id: userId,
    // Cut here as well as in the box: the column allows two thousand and the
    // one writer the app has should not be the thing that finds out.
    body: c.text.slice(0, 2000),
    images: c.images ?? [],
    mentions: c.mentions ?? [],
    mentions_all: !!c.mentionsAll,
    reply_to: c.replyTo ? Number(c.replyTo) : null,
  });
  return error ? { error: error.message } : {};
}

/** Changed, and stamped so the line can say so. */
export async function editInThread(
  supabase: SupabaseClient, t: Thread, id: string, text: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from(t.table)
    .update({ body: text.slice(0, 2000), edited_at: new Date().toISOString() })
    .eq("id", Number(id));
  return error ? { error: error.message } : {};
}

/**
 * Taken back: the row stays and the body goes.
 *
 * The pictures go with the words — a screenshot is as much of a thing said.
 */
export async function dropFromThread(
  supabase: SupabaseClient, t: Thread, id: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from(t.table)
    .update({ body: "", images: [], deleted_at: new Date().toISOString() })
    .eq("id", Number(id));
  return error ? { error: error.message } : {};
}

/**
 * Put one on, or take it off.
 *
 * Pressing it twice quickly races itself against the unique index. The row it
 * collided with is the row the reader wanted, so that is not a failure to
 * report — it is the second press finding the first already done.
 */
export async function reactInThread(
  supabase: SupabaseClient, t: Thread, userId: string, commentId: string,
  emoji: string, who: { characterId: number | null; name: string }, mine: boolean,
): Promise<{ error?: string }> {
  if (mine) {
    const { error } = await supabase.from(t.reactions)
      .delete()
      .eq("comment_id", Number(commentId))
      .eq("profile_id", userId)
      .eq("emoji", emoji);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.from(t.reactions).insert({
    comment_id: Number(commentId),
    profile_id: userId,
    character_id: who.characterId,
    name: who.name,
    emoji,
  });
  return error && error.code !== "23505" ? { error: error.message } : {};
}
