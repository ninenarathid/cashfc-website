import type { SupabaseClient } from "@supabase/supabase-js";
import { isFcMember } from "@/lib/people";
import { allRowsOrThrow } from "@/lib/rows";

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

/**
 * The day a give falls on, in Bangkok — which is the day the draw counts.
 *
 * Exported so the draw asks this and not a clock of its own. The admin report
 * once bucketed by the reader's clock, which only agreed with this one for a
 * reader in Thailand.
 */
export const bangkokDay = (iso: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));

/**
 * The days somebody has earned an entry on so far, as Bangkok dates.
 *
 * Counted from what they actually gave rather than from a running total kept
 * somewhere, because a total is a second copy of the truth and the day it
 * disagrees with the giving is the day somebody loses a ticket they earned.
 * Two queries, about once a day per member — the price of the count being right.
 *
 * The days rather than how many, because how many cannot say whether today is
 * one of them, and the notice is a sentence about today.
 */
export async function entryDays(
  supabase: SupabaseClient, userId: string, myCharacterId: number | null,
): Promise<Set<string>> {
  // Paged, the way the draw reads the same rows. One member's month of giving is
  // well under a thousand, and a count that is right only until somebody is
  // generous enough is the leaderboard's short count over again (lib/rows.ts).
  // Strictly, too: a page that failed throws rather than counting fewer days.
  const [kudos, likes] = await Promise.all([
    allRowsOrThrow<{ created_at: string; receiver_character_id: number }>(
      (from, to) => supabase.from("kudos")
        .select("created_at, receiver_character_id")
        .eq("sender_id", userId)
        .gte("created_at", EVENT_OPENS).lte("created_at", EVENT_SHUTS)
        .order("created_at").range(from, to)),
    allRowsOrThrow(
      (from, to) => supabase.from("gallery_likes")
        .select("created_at, gallery_posts(character_id)")
        .eq("profile_id", userId)
        .gte("created_at", EVENT_OPENS).lte("created_at", EVENT_SHUTS)
        .order("created_at").range(from, to)),
  ]);

  const days = new Set<string>();
  for (const k of kudos) {
    if (myCharacterId != null && k.receiver_character_id === myCharacterId) continue;
    days.add(bangkokDay(k.created_at));
  }
  // The post a like is on is one row; the client, knowing no schema, types the
  // embed as a list.
  for (const l of likes as unknown as
       { created_at: string; gallery_posts: { character_id: number | null } | null }[]) {
    const owner = l.gallery_posts?.character_id ?? null;
    // A picture credited to nobody belongs to nobody, so a potato on it cannot
    // be a potato on your own.
    if (owner != null && myCharacterId != null && owner === myCharacterId) continue;
    days.add(bangkokDay(l.created_at));
  }
  return days;
}

/**
 * Tell somebody they have earned today's entry, once.
 *
 * Called after a potato has been given, from every place one can be given. It
 * decides for itself whether anything should happen, so the callers do not
 * each have to know the rules of the event — they only have to say that a
 * potato went out.
 *
 * Silent to the member about failure on purpose: this is a bonus congratulation
 * about a draw, and somebody whose potato landed should not be shown an error
 * because the applause did not arrive.
 *
 * Not silent to a developer, though. It was, and that cost a day — the insert
 * was being refused by a policy that did not exist yet, and there was nothing
 * anywhere to say so. A warning in the console is the difference between
 * "nothing happened" and a sentence naming the reason.
 *
 * One call at a time. Sending potatoes back down the bell gives several inside
 * a second, and each call used to ask whether today's notice had gone before
 * any of them had sent it — one member was told four times in a fifth of a
 * second. Each call now waits for the one before, so the second asks after the
 * first has answered. Another tab can still race this page; the database's
 * one-notice-a-day index settles that, and its refusal is read here as the
 * notice having gone.
 */
export function markEntry(
  supabase: SupabaseClient | null,
  userId: string | null,
  myCharacterId: number | null,
): Promise<void> {
  const turn = queue.then(() => mark(supabase, userId, myCharacterId));
  // A turn that went wrong must not hold up the ones behind it.
  queue = turn.catch(() => undefined);
  return turn;
}

/** The call before this one, for the next to wait on. */
let queue: Promise<void> = Promise.resolve();

async function mark(
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

  let days: Set<string>;
  try {
    days = await entryDays(supabase, userId, myCharacterId);
  } catch (e) {
    // A count that could not read every page may be a day short, which is the
    // notice this file must not send again. Nothing is sent, so the next potato
    // today asks afresh.
    console.warn("evercold: could not count the entries —",
      e instanceof Error ? e.message : e);
    return;
  }
  // Today has to be one of them. A potato to yourself calls this too, and that
  // used to be enough: the count skipped it, came back with yesterday's total,
  // and "today's entry is yours" went out one short — after which every potato
  // that did count found the notice already sent and said nothing. In the first
  // week that was twenty-six notices to sixteen members, found when one of them
  // asked why theirs had not moved. Saying nothing here leaves the notice to the
  // first potato that counts.
  if (!days.has(today)) return;

  const { error } = await supabase.from("notifications").insert({
    recipient: userId,
    kind: "evercold",
    // The running total, which is the whole content of the line. Kept in body
    // because that column is already the place a notification puts the one
    // thing its wording needs.
    body: String(days.size),
  });
  // Another tab's notice landed first and the one-a-day index turned this one
  // away. The notice they have says what this one would have.
  if (error?.code === "23505") return;
  if (error) console.warn("evercold: could not write the entry notice —", error.message);
}
