import type { SupabaseClient } from "@supabase/supabase-js";
import type { RareTier } from "@/lib/popoto-rare";

/**
 * The wallet. See v91.
 *
 * A third thing a popoto can turn into, after the rare one (lib/popoto-rare.ts)
 * and the prizes somebody has to hand over (lib/prizes.ts) — and the only one
 * that adds up. Ten thousand gil is not worth arranging a meeting for; ten
 * thousand gil twenty-five times is, so the small payments go into a wallet and
 * wait there until the person decides it is worth cashing.
 *
 * It is not a fourth system. A gil prize is a row in the same cupboard, drawn
 * on the same line, set on the same admin tab — what is different is only where
 * a win of one goes. That is why this file is short and lib/prizes.ts is not.
 *
 * Nothing here decides anything either. The balance is written by the database
 * and read back; the button calls a function that checks the bar itself,
 * because a browser that decided it had enough is a browser anybody could tell
 * to decide yes.
 */

/** Whether the wallet runs at all, and what it takes to cash one out. */
export interface WalletSwitch {
  on: boolean;
  /** What a wallet must hold before the button works. A minimum, not a price. */
  threshold: number;
  at: string | null;
}

/** What one person is holding. */
export interface Wallet {
  /** What the button would hand over right now. */
  balance: number;
  /** Everything that has ever gone in, which never goes down. */
  earned: number;
  at: string | null;
}

/** One payment in: which prize, how much, when. */
export interface WalletDrop {
  id: number;
  amount: number;
  prizeId: number | null;
  name: string;
  color: string | null;
  /** How loud it was, on the rare popoto's ladder. See TIER_FX. */
  tier: RareTier;
  /** When its owner first saw it, or null for one that has just landed. */
  seenAt: string | null;
  at: string;
}

/**
 * The loudest of a handful of payments.
 *
 * Somebody who has been away comes back to three at once, and three fanfares
 * one after another is a page nobody can read. One goes off, at the tier of
 * the best of them, which is the one they would have wanted to see anyway.
 */
export function loudestOf(drops: WalletDrop[]): RareTier {
  const rank: Record<RareTier, number> = { rare: 0, super: 1, ultra: 2 };
  let best: RareTier = "rare";
  for (const d of drops) if (rank[d.tier] > rank[best]) best = d.tier;
  return best;
}

/** Where a wallet is emptied: beside the inventories on the edit-profile page. */
export const WALLET_ID = "wallet";
export const WALLET = `/profile#${WALLET_ID}`;

/** The gold a wallet and its cash-out wear. One of the site's own palette. */
export const WALLET_COLOR = "#d9a441";

/** An empty wallet, which is what an account nobody has ever paid has. */
export const EMPTY_WALLET: Wallet = { balance: 0, earned: 0, at: null };

/**
 * Gil, written the way the game writes it.
 *
 * Always grouped and always in English digits, in both languages: this is a
 * figure somebody is going to compare against what is in their own purse in
 * game, and 250,000 is the spelling on that screen.
 */
export const fmtGil = (n: number): string => Math.round(n).toLocaleString("en-US");

/**
 * How full a wallet is, for the bar and the button.
 *
 * `pct` is capped at a hundred because a bar cannot be more than full, and
 * `over` is how far past the bar it actually is — which is the part worth
 * saying out loud, since filling past the bar is the whole point of a wallet
 * that can be left to fill. `left` is what the bar is short by, and is nought
 * once it is ready rather than a negative number nobody wants read to them.
 */
export function walletProgress(
  balance: number, threshold: number,
): { pct: number; over: number; left: number; ready: boolean } {
  if (!(threshold > 0)) return { pct: 0, over: 0, left: 0, ready: false };
  const share = (balance / threshold) * 100;
  return {
    pct: Math.max(0, Math.min(100, share)),
    over: Math.max(0, Math.round(share)),
    left: Math.max(0, threshold - balance),
    ready: balance >= threshold,
  };
}

/**
 * The switch and the bar.
 *
 * Null when it cannot be read, which for anybody is "v91 has not been run" —
 * unlike the prize switch (v88), this one is readable by everybody signed in,
 * because the wallet is on a member's own page and has to know whether to be
 * there at all.
 */
export async function readWalletSwitch(
  supabase: SupabaseClient,
): Promise<WalletSwitch | null> {
  const { data, error } = await supabase.from("wallet_switch")
    .select("enabled, threshold, changed_at").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  const r = data as { enabled: boolean; threshold: number | string; changed_at: string };
  const bar = Number(r.threshold);
  return {
    on: !!r.enabled,
    threshold: Number.isFinite(bar) && bar > 0 ? bar : 250_000,
    at: r.changed_at ?? null,
  };
}

/** Turn it on or off, or move the bar. An admin's, which the database checks. */
export async function saveWalletSwitch(
  supabase: SupabaseClient,
  next: { on: boolean; threshold: number },
  by: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("wallet_switch")
    .update({
      enabled: next.on, threshold: Math.round(next.threshold),
      changed_at: new Date().toISOString(), changed_by: by,
    })
    .eq("id", 1);
  return error ? { error: error.message } : {};
}

/**
 * What one person is holding.
 *
 * No row means nothing has ever been paid in, which is an empty wallet and not
 * an error — the row is made by the first payment (v91) rather than at sign-up.
 */
export async function myWallet(
  supabase: SupabaseClient, me: string,
): Promise<Wallet> {
  const { data, error } = await supabase.from("wallets")
    .select("balance, earned, updated_at").eq("profile_id", me).maybeSingle();
  if (error || !data) return EMPTY_WALLET;
  const r = data as { balance: number | string; earned: number | string; updated_at: string };
  return {
    balance: Number(r.balance) || 0,
    earned: Number(r.earned) || 0,
    at: r.updated_at ?? null,
  };
}

/**
 * Where the money came from, newest first.
 *
 * A balance that goes up on its own is a number nobody can check. Ten is
 * enough: this is the answer to "where did that come from", asked about
 * something that happened this week, and the whole history of it is a ledger
 * nobody reads on a profile page.
 */
export async function myDrops(
  supabase: SupabaseClient, me: string, n = 10,
): Promise<WalletDrop[]> {
  const { data, error } = await supabase.from("wallet_drops")
    .select("id, amount, prize_id, prize_name, prize_color, tier, seen_at, created_at")
    .eq("profile_id", me).order("created_at", { ascending: false }).limit(n);
  if (error) return [];
  return ((data ?? []) as unknown as {
    id: number; amount: number; prize_id: number | null; prize_name: string;
    prize_color: string | null; tier: string | null; seen_at: string | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id, amount: Number(r.amount) || 0, prizeId: r.prize_id,
    name: r.prize_name, color: r.prize_color,
    tier: r.tier === "super" || r.tier === "ultra" ? r.tier : "rare",
    seenAt: r.seen_at, at: r.created_at,
  }));
}

/**
 * "I have seen these."
 *
 * Stamped as the fanfare starts rather than when it finishes, so a page closed
 * halfway through one does not queue it up again for ever. The column grant is
 * the whole of the permission: seen_at is the only thing about a payment its
 * owner may write (v91).
 */
export async function markDropsSeen(
  supabase: SupabaseClient, ids: number[],
): Promise<void> {
  if (!ids.length) return;
  await supabase.from("wallet_drops")
    .update({ seen_at: new Date().toISOString() }).in("id", ids);
}

/**
 * "I'll take it." The whole balance, once it is at or past the bar.
 *
 * What comes back is an ordinary prize to be handed over — already claimed,
 * because pressing this is the claim — so it lands in the inventory beside the
 * rest and the admins see it in the same queue.
 */
export async function withdraw(
  supabase: SupabaseClient,
): Promise<{ amount: number } | { error: string }> {
  const { data, error } = await supabase.rpc("withdraw_wallet");
  if (error) return { error: error.message };
  return { amount: Number(data) || 0 };
}
