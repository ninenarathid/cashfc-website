/**
 * Who a picture's potatoes belong to.
 *
 * They used to belong to whoever the picture was credited to, all of them,
 * however many people were in the shot. The FC was asked and voted to change it
 * — ten to six — so a potato on a group photo is now divided between everybody
 * in that photo. Somebody pressing the button under a picture of five people is
 * saying something about the picture, and the picture is five people's.
 *
 * The rules, and why each one is a rule:
 *
 *   The owner is always in it. It is their picture whether or not anybody
 *   thought to tag them in it.
 *
 *   A set, not a list. Eleven pictures on this site are tagged with the person
 *   who posted them, and counting them twice would hand them two shares and
 *   shrink everybody else's — the one case worth naming out loud, because it is
 *   the one that looks like it works right up until the arithmetic is checked.
 *
 *   Confirmed tags only. A tag nobody has agreed to is somebody's guess, and a
 *   guess should not move points off one person and onto another.
 *
 *   A guest is not a sharer. Somebody with no character on this site cannot
 *   hold a score, so counting them in the divisor would delete the share rather
 *   than give it to anyone. They are in the picture; they are not in the split.
 *
 *   A picture with nobody in it — no credit, no confirmed tags — has nowhere to
 *   send anything, and is skipped rather than dropped on the uploader.
 *
 * Shares are kept as fractions and only rounded when they are drawn. Rounding
 * each one as it is added would quietly invent or destroy potatoes: three
 * people sharing five is 1.67 each, and three times 2 is not five.
 */

import { bangkokDay } from "@/lib/evercold";

export interface PopotoPost {
  id: number;
  character_id: number | null;
  like_count: number | null;
}

export interface PopotoTag {
  post_id: number;
  character_id: number | null;
  confirmed_at: string | null;
}

/** A running total, and how many pictures it came from. */
export interface PopotoTotal { score: number; n: number }

/** Everybody a picture's potatoes are divided between, in no particular order. */
export function sharersOf(post: PopotoPost, tags: PopotoTag[]): number[] {
  const who = new Set<number>();
  if (post.character_id != null) who.add(post.character_id);
  for (const t of tags) {
    if (t.character_id == null) continue;   // a guest holds no score
    if (!t.confirmed_at) continue;          // nobody has agreed to it yet
    who.add(t.character_id);
  }
  return [...who];
}

/**
 * Every member's share of every picture's potatoes.
 *
 * `n` counts the pictures somebody has a share in, which is what the number in
 * brackets under a leaderboard total means — not how many they posted.
 */
export function splitPopoto(
  posts: PopotoPost[], tags: PopotoTag[],
): Map<number, PopotoTotal> {
  const byPost = new Map<number, PopotoTag[]>();
  for (const t of tags) {
    const at = byPost.get(t.post_id);
    if (at) at.push(t);
    else byPost.set(t.post_id, [t]);
  }

  const out = new Map<number, PopotoTotal>();
  for (const post of posts) {
    const likes = post.like_count ?? 0;
    if (likes <= 0) continue;
    const who = sharersOf(post, byPost.get(post.id) ?? []);
    if (!who.length) continue;
    const each = likes / who.length;
    for (const id of who) {
      const at = out.get(id) ?? { score: 0, n: 0 };
      at.score += each;
      at.n += 1;
      out.set(id, at);
    }
  }
  return out;
}

/**
 * The same split, for only the potatoes given since a moment.
 *
 * like_count is every potato a picture has ever had, so a board for this month
 * counts the likes themselves, by the day each one was pressed: a picture from
 * August that the FC finds again in October earns its potatoes in October. They
 * still go to whoever is in the picture now, by the rule above.
 */
export function splitPopotoLikes(
  posts: PopotoPost[], tags: PopotoTag[], likes: { post_id: number }[],
): Map<number, PopotoTotal> {
  const given = new Map<number, number>();
  for (const l of likes) given.set(l.post_id, (given.get(l.post_id) ?? 0) + 1);
  return splitPopoto(
    posts.map((p) => ({ ...p, like_count: given.get(p.id) ?? 0 })), tags);
}

/** How far back a popoto board counts. */
export type PopotoPeriod = "month" | "year" | "all";

/**
 * The moment a period starts, or null for all of it.
 *
 * Midnight in Bangkok, the same midnight the draw and the bell count from: a
 * month that began at seven in the morning, Thai time, would hand the first
 * hours of every month to the one before. Bangkok keeps no summer time, so the
 * "+07:00" is the whole of the time-zone arithmetic.
 */
export function periodStart(period: PopotoPeriod, now = new Date()): string | null {
  if (period === "all") return null;
  const today = bangkokDay(now.toISOString());
  const first = period === "month" ? today.slice(0, 7) : `${today.slice(0, 4)}-01`;
  return `${first}-01T00:00:00+07:00`;
}

/**
 * A share, written out.
 *
 * Whole numbers stay whole — most totals are — and a fraction keeps one decimal
 * place, which is as fine as thirds and quarters of a potato need to be read.
 */
export const popotoText = (score: number): string =>
  Number.isInteger(score) ? String(score) : score.toFixed(1);
