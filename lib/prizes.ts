import type { SupabaseClient } from "@supabase/supabase-js";
import type { RareTier } from "@/lib/popoto-rare";

/**
 * Prizes that somebody has to hand over. See v87.
 *
 * The rare popoto (lib/popoto-rare.ts) is a gift the site can complete on its
 * own: it decides, it wraps it, you open it, it is yours. This is the other
 * kind — a minion, some gil, a glamour set — where the site can only say who
 * won and then get out of the way of two people arranging to meet in game.
 *
 * So a prize has a longer life than a popoto: won, claimed, talked about,
 * handed over. Only the first of those happens by itself.
 *
 * Nothing here decides anything. The roll, the stock and who may claim what
 * are all the database's, because a browser that decided would be a browser
 * anybody could tell to decide yes.
 */

/** When a prize is rolled, and therefore who wins it. */
export type PrizeDraw = "receive" | "give" | "daily" | "both";

/** Who may win it. */
export type PrizeAudience = "fc" | "guest" | "all";

export const DRAWS: PrizeDraw[] = ["give", "receive", "both", "daily"];
export const AUDIENCES: PrizeAudience[] = ["fc", "guest", "all"];

/**
 * A prize won by two people at once leaves stock two at a time, so an odd
 * number would end with one nobody can win. The database refuses it; this is
 * so the form can say so before the save rather than after.
 */
export const stockFits = (draw: PrizeDraw, stock: number | null): boolean =>
  draw !== "both" || stock === null || stock % 2 === 0;

/**
 * What each tier is worth suggesting, as a chance.
 *
 * Advice and nothing more — the tier is the costume a win arrives in and the
 * chance is how often it arrives, and the database lets any pair of them
 * through. These are the rare popoto's own proportions read back as whole
 * percentages, so a prize dressed as an SR turns up about as often against
 * the others as an SR popoto does.
 */
export const TIER_ADVICE: Record<RareTier, { low: number; high: number }> = {
  rare: { low: 1, high: 5 },
  super: { low: 0.2, high: 1 },
  ultra: { low: 0.05, high: 0.2 },
};

/** One thing that can be won, as the admin panel edits it. */
export interface Prize {
  id: number;
  name: string;
  nameEn: string | null;
  detail: string | null;
  detailEn: string | null;
  icon: string | null;
  color: string;
  chance: number;
  draw: PrizeDraw;
  audience: PrizeAudience;
  /** Which of the three a win of it looks like. See TIER_LOOK, TIER_FX. */
  tier: RareTier;
  /** How many are left, or null for unlimited. */
  stock: number | null;
  active: boolean;
  at: string;
}

/** What somebody won, as both sides see it. */
export interface Win {
  id: number;
  prizeId: number | null;
  winner: string;
  characterId: number | null;
  name: string;
  nameEn: string | null;
  detail: string | null;
  detailEn: string | null;
  icon: string | null;
  color: string;
  tier: RareTier;
  draw: PrizeDraw;
  at: string;
  claimedAt: string | null;
  deliveredAt: string | null;
  seenWinner: string | null;
  seenAdmin: string | null;
}

/** One line in a prize's thread. */
export interface PrizeMessage {
  id: number;
  winId: number;
  authorId: string;
  body: string;
  at: string;
}

/** Where a prize is claimed: the inventory on the edit-profile page. */
export const PRIZE_INVENTORY_ID = "prize-inventory";
export const PRIZE_INVENTORY = `/profile#${PRIZE_INVENTORY_ID}`;

/** The default colour of a new prize, the same gold a wrapped popoto wears. */
export const PRIZE_COLOR = "#f3c969";

const PRIZE_COLS =
  "id, name, name_en, detail, detail_en, icon_url, color, chance_pct, draw,"
  + " audience, tier, stock, active, created_at";

const WIN_COLS =
  "id, prize_id, winner, character_id, prize_name, prize_name_en, prize_detail,"
  + " prize_detail_en, prize_icon, prize_color, prize_tier, draw, won_at,"
  + " claimed_at, delivered_at, seen_winner, seen_admin";

interface PrizeRow {
  id: number; name: string; name_en: string | null; detail: string | null;
  detail_en: string | null; icon_url: string | null; color: string | null;
  chance_pct: number | string; draw: string; audience: string; tier: string;
  stock: number | null; active: boolean; created_at: string;
}

interface WinRow {
  id: number; prize_id: number | null; winner: string; character_id: number | null;
  prize_name: string; prize_name_en: string | null; prize_detail: string | null;
  prize_detail_en: string | null; prize_icon: string | null; prize_color: string | null;
  prize_tier: string | null;
  draw: string; won_at: string; claimed_at: string | null; delivered_at: string | null;
  seen_winner: string | null; seen_admin: string | null;
}

const asDraw = (s: string): PrizeDraw =>
  s === "give" || s === "daily" || s === "both" ? s : "receive";
const asAudience = (s: string): PrizeAudience =>
  s === "guest" || s === "all" ? s : "fc";
const asTier = (s: string | null): RareTier =>
  s === "super" || s === "ultra" ? s : "rare";

const toPrize = (r: PrizeRow): Prize => ({
  id: r.id, name: r.name, nameEn: r.name_en, detail: r.detail, detailEn: r.detail_en,
  icon: r.icon_url, color: r.color ?? PRIZE_COLOR, chance: Number(r.chance_pct) || 0,
  draw: asDraw(r.draw), audience: asAudience(r.audience), tier: asTier(r.tier),
  stock: r.stock, active: r.active, at: r.created_at,
});

const toWin = (r: WinRow): Win => ({
  id: r.id, prizeId: r.prize_id, winner: r.winner, characterId: r.character_id,
  name: r.prize_name, nameEn: r.prize_name_en, detail: r.prize_detail,
  detailEn: r.prize_detail_en, icon: r.prize_icon, color: r.prize_color ?? PRIZE_COLOR,
  tier: asTier(r.prize_tier),
  draw: asDraw(r.draw), at: r.won_at, claimedAt: r.claimed_at,
  deliveredAt: r.delivered_at, seenWinner: r.seen_winner, seenAdmin: r.seen_admin,
});

/**
 * The cupboard, oldest first.
 *
 * In the order they were made, which is the order the roll lays them end to
 * end — so the list on the screen is the line the number falls along, and the
 * running total underneath it means something.
 *
 * An error is an empty cupboard: a database without v87 has no prizes, which
 * is the truth about a site that cannot have given one.
 */
export async function allPrizes(supabase: SupabaseClient): Promise<Prize[]> {
  const { data, error } = await supabase.from("prizes")
    .select(PRIZE_COLS).order("id", { ascending: true });
  if (error) return [];
  return ((data ?? []) as unknown as PrizeRow[]).map(toPrize);
}

/** What one person is holding: won, not yet handed over. */
export async function myWins(supabase: SupabaseClient, me: string): Promise<Win[]> {
  const { data, error } = await supabase.from("prize_wins")
    .select(WIN_COLS).eq("winner", me).is("delivered_at", null)
    .order("won_at", { ascending: false }).limit(200);
  if (error) return [];
  return ((data ?? []) as unknown as WinRow[]).map(toWin);
}

/**
 * The admin queue, in the order the work should be done.
 *
 * Claimed first, because somebody is waiting on those and on nothing else.
 * Then won but unclaimed, which are nobody's job yet but are worth seeing.
 * Handed over last, as the record.
 *
 * Oldest first inside the two live groups — a queue where the newest arrival
 * is served first is not a queue — and newest first among the finished ones,
 * where the question is "what happened lately" rather than "what is next".
 */
export function inQueueOrder(wins: Win[]): Win[] {
  const rank = (w: Win) => (w.deliveredAt ? 2 : w.claimedAt ? 0 : 1);
  return [...wins].sort((a, b) => rank(a) - rank(b)
    || (rank(a) === 2 ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));
}

/** Every win, for the admins, in that order. */
export async function allWins(supabase: SupabaseClient): Promise<Win[]> {
  const { data, error } = await supabase.from("prize_wins")
    .select(WIN_COLS).order("won_at", { ascending: false }).limit(500);
  if (error) return [];
  return inQueueOrder(((data ?? []) as unknown as WinRow[]).map(toWin));
}

/** Everything said about one win, oldest first. */
export async function messagesFor(
  supabase: SupabaseClient, winId: number,
): Promise<PrizeMessage[]> {
  const { data, error } = await supabase.from("prize_messages")
    .select("id, win_id, author_id, body, created_at")
    .eq("win_id", winId).order("created_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as unknown as {
    id: number; win_id: number; author_id: string; body: string; created_at: string;
  }[]).map((m) => ({
    id: m.id, winId: m.win_id, authorId: m.author_id, body: m.body, at: m.created_at,
  }));
}

/** Say something in a thread. */
export async function say(
  supabase: SupabaseClient, winId: number, me: string, body: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("prize_messages")
    .insert({ win_id: winId, author_id: me, body: body.trim() });
  return error ? { error: error.message } : {};
}

/** "Yes, I want this one." The winner's press, once. */
export async function claim(
  supabase: SupabaseClient, winId: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("claim_prize", { p_win: winId });
  return error ? { error: error.message } : {};
}

/** "Handed over." An admin's press, and the end of the thread. */
export async function deliver(
  supabase: SupabaseClient, winId: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("deliver_prize", { p_win: winId });
  return error ? { error: error.message } : {};
}

/** Mark a thread read, from whichever side is asking. The trigger keeps the right one. */
export async function markRead(
  supabase: SupabaseClient, winId: number,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("prize_wins")
    .update({ seen_winner: now, seen_admin: now }).eq("id", winId);
}

/**
 * Put the Free Company's characters in the database, if they are not already.
 *
 * The roll has to know who is in the FC to answer an FC-only prize, and the
 * roster lives in a file the pipeline writes (data/fc-ids.json) which the
 * database has no way to read — the pipeline deliberately holds no key to it.
 * So the admin panel carries it across: it already has the ids, it is where
 * prizes are made, and no prize exists without somebody having been here.
 *
 * Only when they differ, so opening the tab is normally not a write. Returns
 * how many characters the database knows about afterwards, or null if it could
 * not be asked or written — which the panel says out loud, because a roster
 * that is not there quietly stops every FC-only prize.
 */
export async function syncRoster(
  supabase: SupabaseClient, ids: number[],
): Promise<number | null> {
  const { data, error } = await supabase.from("fc_roster").select("character_id");
  if (error) return null;
  const there = new Set(((data ?? []) as { character_id: number }[])
    .map((r) => r.character_id));
  const want = new Set(ids);
  if (there.size === want.size && [...want].every((id) => there.has(id))) return there.size;
  const { data: n, error: e2 } = await supabase.rpc("sync_fc_roster", { p_ids: ids });
  if (e2) return null;
  return typeof n === "number" ? n : want.size;
}

/** Whether the draw runs at all, and when that was last changed. See v88. */
export interface PrizeSwitch { on: boolean; at: string | null }

/**
 * The master switch.
 *
 * A prize per-row `active` says whether that one is in the draw; this says
 * whether there is a draw. Same shape as the rare popoto's (v79) and off to
 * start with for the same reason — the cupboard can be filled and looked at
 * before anybody can win out of it.
 *
 * Null when it cannot be read, which for an admin means v88 has not been run.
 */
export async function readSwitch(supabase: SupabaseClient): Promise<PrizeSwitch | null> {
  const { data, error } = await supabase.from("prize_switch")
    .select("enabled, changed_at").eq("id", 1).maybeSingle();
  if (error) return null;
  const r = data as { enabled: boolean; changed_at: string } | null;
  return r ? { on: !!r.enabled, at: r.changed_at } : null;
}

/** Turn the whole draw on or off. */
export async function flipSwitch(
  supabase: SupabaseClient, on: boolean, by: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("prize_switch")
    .update({ enabled: on, changed_at: new Date().toISOString(), changed_by: by })
    .eq("id", 1);
  return error ? { error: error.message } : {};
}

/**
 * How often this prize actually lands, said in popotos rather than in percent.
 *
 * A percentage under one is a number nobody can feel. "One popoto in two
 * hundred" is the same fact in units an evening of giving is measured in, and
 * it is the sentence that catches a decimal point in the wrong place.
 */
export const oneIn = (chance: number): number | null =>
  chance > 0 ? Math.round(100 / chance) : null;
