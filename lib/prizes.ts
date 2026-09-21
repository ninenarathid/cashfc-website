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

/**
 * What winning it gets you.
 *
 * An item is the original: a minion, a glamour set, a thing an admin has to
 * meet somebody in game to hand over. Gil is paid into the winner's wallet
 * instead (lib/wallet.ts) and nobody is interrupted — it adds up there until it
 * is worth a meeting, and the meeting is arranged once for the lot of it.
 *
 * Both are drawn the same way, off the same line, out of the same cupboard.
 * See v91.
 */
export type PrizeKind = "item" | "gil";

/**
 * Who has to be at the other end of the popoto.
 *
 * `audience` is about the person who wins; this is about the person they sent
 * it to, or the person it came from — the other end of the same popoto, read
 * as whichever of those two questions the draw makes it. See v91.
 *
 * 'anyone' is the old behaviour and what every prize made before this has.
 */
export type PrizeOtherSide = "anyone" | "fc" | "fc_verified";

/**
 * Which card a win arrives on.
 *
 * 'tier' is the R/SR/UR one, which everything wore until v92: light, sparks
 * and a chip, as loud as the tier says. The rest are hers — she stands out of
 * the top of the card, on a loop, for as long as it is up, throwing coins or
 * pushing a purse at you or holding out a black card in sunglasses.
 *
 * Not a fourth tier, and the difference matters: the tier is a ladder whose
 * rungs mean the same amount of noise everywhere on this site, and a rung that
 * is not louder than the one below it but merely different is not a rung. A
 * prize keeps its tier when it is dressed as Aqua — the chip on it and the
 * card in the winner's inventory still use it. This is the moment it lands.
 */
export type PrizeFx = "tier" | "aqua" | "aqua_purse" | "aqua_card";

/**
 * The three of her, and which drawing each one means.
 *
 * 'aqua' is the coins, and keeps its plain name rather than becoming
 * 'aqua_shower': it is already written on every gil prize in the cupboard and
 * on every win anybody is holding, and renaming a stored value to make a set
 * look tidy is a change that can only break things. See v93.
 */
export const AQUA_FX: PrizeFx[] = ["aqua", "aqua_purse", "aqua_card"];

export const aquaArt = (fx: PrizeFx): "shower" | "purse" | "card" | null =>
  fx === "aqua" ? "shower"
    : fx === "aqua_purse" ? "purse"
      : fx === "aqua_card" ? "card" : null;

export const DRAWS: PrizeDraw[] = ["give", "receive", "both", "daily"];
export const AUDIENCES: PrizeAudience[] = ["fc", "guest", "all"];
export const KINDS: PrizeKind[] = ["item", "gil"];
export const OTHER_SIDES: PrizeOtherSide[] = ["anyone", "fc", "fc_verified"];

/**
 * Whether the other end of the popoto is a question this prize can ask.
 *
 * Only the two draws with two ends and one winner. A pair is both ends at once
 * and already asks `audience` of both of them, and a once-a-day roll is about
 * somebody's day rather than about one popoto — so on those the setting is
 * kept and not read, and the form does not offer it.
 */
export const otherSideApplies = (draw: PrizeDraw): boolean =>
  draw === "give" || draw === "receive";

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
  /** A thing to hand over, or gil into the winner's wallet. */
  kind: PrizeKind;
  /** How much gil, for the ones that are gil. Null for the rest. */
  gilAmount: number | null;
  /** Who the popoto has to have gone to, or come from. See otherSideApplies. */
  otherSide: PrizeOtherSide;
  /** Which card a win of it arrives on. See PrizeFx. */
  fx: PrizeFx;
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
  /** Which card it arrived on, as it was set at the moment it was won. */
  fx: PrizeFx;
  draw: PrizeDraw;
  /**
   * What a cash-out was worth, or null for everything else.
   *
   * A wallet emptied becomes a win like any other, and this is the only thing
   * about it that is not on the row already: its name is "เงินสะสม" and the
   * figure is the whole of what it is. See v91.
   */
  gilAmount: number | null;
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

/**
 * The columns, and the columns a migration has not necessarily made yet.
 *
 * A select that names a column which is not there fails whole — it does not
 * skip the column, it returns nothing — and an error here has always been read
 * as an empty cupboard, which is the right answer for a database that has
 * never had prizes and the wrong one for a database that has four and has not
 * been given v91 yet. That is not a hypothetical: adding the wallet's columns
 * to this list emptied the cupboard and the queue on a live site between the
 * code going out and the migration being run.
 *
 * So each read asks for everything, and asks again without the newer half if
 * the database says no. The row types make the newer half optional and the
 * converters below default it, so the rest of the file never has to know which
 * of the two answers it is holding.
 */
const PRIZE_COLS_BASE =
  "id, name, name_en, detail, detail_en, icon_url, color, chance_pct, draw,"
  + " audience, tier, stock, active, created_at";
const PRIZE_COLS = `${PRIZE_COLS_BASE}, kind, gil_amount, other_side, fx`;

const WIN_COLS_BASE =
  "id, prize_id, winner, character_id, prize_name, prize_name_en, prize_detail,"
  + " prize_detail_en, prize_icon, prize_color, prize_tier, draw,"
  + " won_at, claimed_at, delivered_at, seen_winner, seen_admin";
const WIN_COLS = `${WIN_COLS_BASE}, gil_amount, prize_fx`;

interface PrizeRow {
  id: number; name: string; name_en: string | null; detail: string | null;
  detail_en: string | null; icon_url: string | null; color: string | null;
  chance_pct: number | string; draw: string; audience: string; tier: string;
  /** v91 and v92, and absent on a database that has not had them. */
  kind?: string | null; gil_amount?: number | string | null;
  other_side?: string | null; fx?: string | null;
  stock: number | null; active: boolean; created_at: string;
}

interface WinRow {
  id: number; prize_id: number | null; winner: string; character_id: number | null;
  prize_name: string; prize_name_en: string | null; prize_detail: string | null;
  prize_detail_en: string | null; prize_icon: string | null; prize_color: string | null;
  prize_tier: string | null;
  /** v91 and v92, and absent on a database that has not had them. */
  gil_amount?: number | string | null; prize_fx?: string | null;
  draw: string; won_at: string; claimed_at: string | null; delivered_at: string | null;
  seen_winner: string | null; seen_admin: string | null;
}

const asDraw = (s: string): PrizeDraw =>
  s === "give" || s === "daily" || s === "both" ? s : "receive";
const asAudience = (s: string): PrizeAudience =>
  s === "guest" || s === "all" ? s : "fc";
const asTier = (s: string | null): RareTier =>
  s === "super" || s === "ultra" ? s : "rare";
const asKind = (s: string | null | undefined): PrizeKind =>
  (s === "gil" ? "gil" : "item");
const asOtherSide = (s: string | null | undefined): PrizeOtherSide =>
  (s === "fc" || s === "fc_verified" ? s : "anyone");
const asFx = (s: string | null | undefined): PrizeFx =>
  (s === "aqua" || s === "aqua_purse" || s === "aqua_card" ? s : "tier");
/** A bigint arrives as a number or a string, and an absent one as null. */
const asGil = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toPrize = (r: PrizeRow): Prize => ({
  id: r.id, name: r.name, nameEn: r.name_en, detail: r.detail, detailEn: r.detail_en,
  icon: r.icon_url, color: r.color ?? PRIZE_COLOR, chance: Number(r.chance_pct) || 0,
  draw: asDraw(r.draw), audience: asAudience(r.audience), tier: asTier(r.tier),
  kind: asKind(r.kind), gilAmount: asGil(r.gil_amount),
  otherSide: asOtherSide(r.other_side), fx: asFx(r.fx),
  stock: r.stock, active: r.active, at: r.created_at,
});

const toWin = (r: WinRow): Win => ({
  id: r.id, prizeId: r.prize_id, winner: r.winner, characterId: r.character_id,
  name: r.prize_name, nameEn: r.prize_name_en, detail: r.prize_detail,
  detailEn: r.prize_detail_en, icon: r.prize_icon, color: r.prize_color ?? PRIZE_COLOR,
  tier: asTier(r.prize_tier), fx: asFx(r.prize_fx), gilAmount: asGil(r.gil_amount),
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
  const ask = (cols: string) => supabase.from("prizes")
    .select(cols).order("id", { ascending: true });
  let got = await ask(PRIZE_COLS);
  if (got.error) got = await ask(PRIZE_COLS_BASE);
  if (got.error) return [];
  return ((got.data ?? []) as unknown as PrizeRow[]).map(toPrize);
}

/** What one person is holding: won, not yet handed over. */
export async function myWins(supabase: SupabaseClient, me: string): Promise<Win[]> {
  const ask = (cols: string) => supabase.from("prize_wins")
    .select(cols).eq("winner", me).is("delivered_at", null)
    .order("won_at", { ascending: false }).limit(200);
  let got = await ask(WIN_COLS);
  if (got.error) got = await ask(WIN_COLS_BASE);
  if (got.error) return [];
  return ((got.data ?? []) as unknown as WinRow[]).map(toWin);
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
  const ask = (cols: string) => supabase.from("prize_wins")
    .select(cols).order("won_at", { ascending: false }).limit(500);
  let got = await ask(WIN_COLS);
  if (got.error) got = await ask(WIN_COLS_BASE);
  if (got.error) return [];
  return inQueueOrder(((got.data ?? []) as unknown as WinRow[]).map(toWin));
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
 * What a rare popoto costs a popoto, for the odds summary.
 *
 * Its own switch and its own chance (v79, v83), read here so one screen can
 * show everything a single popoto can turn into rather than making somebody
 * hold two tabs side by side and multiply.
 *
 * The chance only. How that splits between R, SR and UR is a second roll
 * inside this one, set and shown on the rare popoto's own tab; the summary
 * asks how often a popoto is anything other than a popoto.
 *
 * Null when it cannot be read, which is the ordinary answer for an admin who
 * is not the popoto keeper: the whole of that feature is deliberately one
 * person's to see (v77), and this does not make an exception of the numbers.
 */
export interface RareOdds {
  on: boolean;
  /** How often any popoto is rare at all, as a percentage. */
  chance: number;
}

export async function readRareOdds(supabase: SupabaseClient): Promise<RareOdds | null> {
  const { data, error } = await supabase.from("popoto_rare_switch")
    .select("enabled, chance_pct").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  const r = data as { enabled: boolean; chance_pct?: number | string };
  // The same fallback the roll itself uses for a database missing v83.
  const n = r.chance_pct == null ? 1 : Number(r.chance_pct);
  return { on: !!r.enabled, chance: Number.isFinite(n) ? n : 1 };
}

/**
 * How many popotos the Free Company sends on an ordinary day.
 *
 * A percentage is a number nobody can feel. "One in five hundred" is better
 * and still abstract; "about once a day" is the sentence somebody setting a
 * prize is actually trying to write, and it cannot be worked out without
 * knowing how many popotos there are to roll on.
 *
 * A fortnight, because a week is one quiet stretch away from being wrong and
 * a month has the shape of an old FC in it. Counted rather than stored: it is
 * one count over an indexed column, asked when an admin opens a tab.
 *
 * Every popoto, including the handful given to one's own character, which are
 * counted and never rolled. They are about two in a hundred here, which is
 * inside the noise of an estimate that is the shape of a fortnight anyway.
 */
export async function popotoPerDay(
  supabase: SupabaseClient, days = 14,
): Promise<number | null> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { count, error } = await supabase.from("kudos")
    .select("id", { count: "exact", head: true }).gte("created_at", since);
  if (error || count == null) return null;
  return count / days;
}

/**
 * A chance, said as how often it will actually happen.
 *
 * Wins a day while that is a number worth saying, then days between, then
 * months — the unit changes because "0.04 times a day" and "once every two
 * months" are the same fact and only one of them is a sentence.
 */
export function howOften(
  pct: number, perDay: number,
): { every: "day" | "days" | "months"; n: number } | null {
  const rate = perDay * (pct / 100);
  if (!(rate > 0)) return null;
  if (rate >= 0.9) return { every: "day", n: Math.round(rate * 10) / 10 };
  const days = 1 / rate;
  if (days <= 45) return { every: "days", n: Math.round(days) };
  return { every: "months", n: Math.round(days / 30.4) };
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
