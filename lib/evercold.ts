import type { SupabaseClient } from "@supabase/supabase-js";
import { isFcMember } from "@/lib/people";

/**
 * Popoto: Road to Evercold — the Free Company's month-long draw.
 *
 * Every day of the event, an FC member who gives a potato to somebody else
 * earns one entry. One a day, however many they give: the point is turning up,
 * not clicking. The rule is not new — the admin report has counted exactly this
 * since it was written, and the draw has always been made from it. What is new
 * is that the member finds out at the moment it happens instead of never.
 *
 * The counting rule, restated here because a member reading a notification
 * should be able to trust it means the same thing the draw does:
 *
 *   One day of giving is one entry, whatever the count that day.
 *   Giving to yourself does not count — it is free, and a draw decided by who
 *   remembered to click their own profile is a draw about nothing.
 *   Pictures count as well as profiles: a potato is a potato.
 *   The Free Company only. A guest can give and be thanked for it; the prize
 *   is the FC's, so telling somebody outside it that they have earned a ticket
 *   would be telling them something untrue.
 */

/** Bangkok dates, as the poster prints them. */
export const EVENT_FROM = "2026-09-09";
export const EVENT_TO = "2026-10-09";

/** The poster, which is the picture the notification carries. */
export const EVENT_POSTER =
  "https://hltyphvolaobfqeybpot.supabase.co/storage/v1/object/public/"
  + "post-images/1788428393012-nj5dzb.png";

/**
 * The window as instants.
 *
 * Bangkok, because the poster says 23.59 น. and the FC reads dates in Thai
 * time. Bangkok is UTC+7 all year, so this is subtraction rather than a
 * seasonal case: the event opens at midnight on the ninth and shuts at the end
 * of the ninth of October, both Thai.
 */
export const EVENT_OPENS = `${EVENT_FROM}T00:00:00+07:00`;
export const EVENT_SHUTS = `${EVENT_TO}T23:59:59.999+07:00`;

export function eventIsOn(at: Date = new Date()): boolean {
  const t = at.getTime();
  return t >= Date.parse(EVENT_OPENS) && t <= Date.parse(EVENT_SHUTS);
}

/** The day a give falls on, in Bangkok — which is the day the draw counts. */
const bangkokDay = (iso: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));

/**
 * How many entries somebody has earned so far.
 *
 * Counted from what they actually gave rather than from a running total kept
 * somewhere, because a total is a second copy of the truth and the day it
 * disagrees with the giving is the day somebody loses a ticket they earned.
 * Two queries, once a day per member — the price of the count being right.
 */
export async function countEntries(
  supabase: SupabaseClient, userId: string, myCharacterId: number | null,
): Promise<number> {
  const [{ data: kudos }, { data: likes }] = await Promise.all([
    supabase.from("kudos")
      .select("created_at, receiver_character_id")
      .eq("sender_id", userId)
      .gte("created_at", EVENT_OPENS).lte("created_at", EVENT_SHUTS),
    supabase.from("gallery_likes")
      .select("created_at, gallery_posts(character_id)")
      .eq("profile_id", userId)
      .gte("created_at", EVENT_OPENS).lte("created_at", EVENT_SHUTS),
  ]);

  const days = new Set<string>();
  for (const k of (kudos ?? []) as unknown as
       { created_at: string; receiver_character_id: number }[]) {
    if (myCharacterId != null && k.receiver_character_id === myCharacterId) continue;
    days.add(bangkokDay(k.created_at));
  }
  for (const l of (likes ?? []) as unknown as
       { created_at: string; gallery_posts: { character_id: number | null } | null }[]) {
    const owner = l.gallery_posts?.character_id ?? null;
    // A picture credited to nobody belongs to nobody, so a potato on it cannot
    // be a potato on your own.
    if (owner != null && myCharacterId != null && owner === myCharacterId) continue;
    days.add(bangkokDay(l.created_at));
  }
  return days.size;
}

/**
 * Tell somebody they have earned today's entry, once.
 *
 * Called after a potato has been given, from every place one can be given. It
 * decides for itself whether anything should happen, so the callers do not
 * each have to know the rules of the event — they only have to say that a
 * potato went out.
 *
 * Silent about failure on purpose. This is a bonus notification about a draw;
 * a member whose potato landed should not be shown an error because the
 * congratulation did not.
 */
export async function markEntry(
  supabase: SupabaseClient | null,
  userId: string | null,
  myCharacterId: number | null,
): Promise<void> {
  if (!supabase || !userId) return;
  if (!eventIsOn()) return;
  if (!isFcMember(myCharacterId)) return;

  const today = bangkokDay(new Date().toISOString());

  // Already told them today. Checked against what was sent rather than against
  // a flag, so the second potato of the evening is silent whichever page it
  // was given from — and a refresh does not repeat the congratulation.
  const { data: said } = await supabase.from("notifications")
    .select("id")
    .eq("recipient", userId).eq("kind", "evercold")
    .gte("created_at", `${today}T00:00:00+07:00`)
    .limit(1);
  if (said?.length) return;

  const total = await countEntries(supabase, userId, myCharacterId);
  if (!total) return;

  await supabase.from("notifications").insert({
    recipient: userId,
    kind: "evercold",
    // The running total, which is the whole content of the line. Kept in body
    // because that column is already the place a notification puts the one
    // thing its wording needs.
    body: String(total),
  });
}
