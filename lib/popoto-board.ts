import type { SupabaseClient } from "@supabase/supabase-js";
import { allRowsOrThrow } from "@/lib/rows";
import { splitPopoto, splitPopotoLikes,
         type PopotoPost, type PopotoTag, type PopotoTotal } from "@/lib/popoto";

/**
 * The two popoto boards' arithmetic, away from their drawing.
 *
 * Here rather than beside the boards because two places ask: the browser, for
 * the numbers as they are now, and the leaderboards page while it is being
 * built, so the boards are already on the page when it opens instead of
 * arriving after everything else. Both have to come to the same answer, and
 * one copy of the counting is how they do.
 */

/** Who received how many, and from how many distinct places. */
export type Totals = Map<number, PopotoTotal>;

/** How many names a board shows. */
export const TOP_N = 10;

export type Names = Record<number, { name: string; avatar: string | null }>;

/** One line of a board, ready to draw. */
export interface BoardRow {
  id: number;
  name: string;
  avatar: string | null;
  score: number;
  n: number;
}

/** This month's two boards as the page was built with them. */
export type FirstLook = Record<"profile" | "gallery", BoardRow[]>;

/**
 * Send popoto on a profile, since `from` or ever when it is null.
 *
 * One row per sender per person per day, which the table enforces, so counting
 * rows counts potatoes and counting senders counts people.
 */
export async function profileTotals(
  supabase: SupabaseClient, from: string | null,
): Promise<Totals> {
  // Paged. This used to be one select, which meant the board counted the
  // first thousand rows of the table and then quietly stopped — every
  // total on the page was short from the day kudos passed that mark, while
  // each member's own page, which filters to one person, stayed right.
  // In id order, so no page can repeat or skip a row of the one before.
  const data = await allRowsOrThrow<{ receiver_character_id: number; sender_id: string }>(
    (a, b) => {
      let q = supabase.from("kudos").select("receiver_character_id, sender_id");
      if (from) q = q.gte("created_at", from);
      return q.order("id").range(a, b);
    });
  const out: Totals = new Map();
  const senders = new Map<number, Set<string>>();
  for (const k of data) {
    const at = out.get(k.receiver_character_id) ?? { score: 0, n: 0 };
    at.score += 1;
    out.set(k.receiver_character_id, at);
    const s = senders.get(k.receiver_character_id) ?? new Set<string>();
    s.add(k.sender_id);
    senders.set(k.receiver_character_id, s);
  }
  for (const [id, s] of senders) {
    const at = out.get(id);
    if (at) at.n = s.size;
  }
  return out;
}

/**
 * Potatoes on pictures, since `from` or ever when it is null.
 *
 * Divided between everybody in the picture, which the FC voted for. The rule
 * itself is in lib/popoto.ts, shared with the front page so the two boards can
 * never come to different answers about the same photograph.
 *
 * Not filtered to posts with a character on them any more: a picture posted
 * for nobody in particular still belongs to whoever is tagged in it.
 */
export async function galleryTotals(
  supabase: SupabaseClient, from: string | null,
): Promise<Totals> {
  // Paged for the same reason, before it becomes the same bug: these two
  // are in the dozens today and the gallery only grows.
  const [posts, tags, likes] = await Promise.all([
    allRowsOrThrow<PopotoPost>((a, b) => supabase.from("gallery_posts")
      .select("id, character_id, like_count").order("id").range(a, b)),
    allRowsOrThrow<PopotoTag>((a, b) => supabase.from("gallery_tags")
      .select("post_id, character_id, confirmed_at")
      .order("post_id").order("character_id").range(a, b)),
    // All time is already counted on each picture. A month needs the
    // potatoes themselves, to know when each one was pressed.
    from == null ? null
      : allRowsOrThrow<{ post_id: number }>((a, b) => supabase.from("gallery_likes")
          .select("post_id").gte("created_at", from)
          .order("post_id").order("profile_id").range(a, b)),
  ]);
  return likes ? splitPopotoLikes(posts, tags, likes) : splitPopoto(posts, tags);
}

/** The top of a board, from everybody's totals. */
export const rank = (got: Totals, names: Names): BoardRow[] =>
  [...got.entries()]
    .map(([id, v]) => ({
      id,
      name: names[id]?.name ?? `#${id}`,
      avatar: names[id]?.avatar ?? null,
      score: v.score,
      n: v.n,
    }))
    // Nobody on zero, so a quiet month is an empty board rather than a
    // ranking of people nobody has given one to.
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.n - a.n)
    .slice(0, TOP_N);
