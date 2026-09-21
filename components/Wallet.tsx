"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/dates";
import ConfirmDialog from "@/components/ConfirmDialog";
import Fanfare from "@/components/PrizeFanfare";
import { TierBadge } from "@/components/PopotoRare";
import { TIER_FX, TIER_LOOK, type RareTier } from "@/lib/popoto-rare";
import {
  EMPTY_WALLET, WALLET_COLOR, WALLET_ID, fmtGil, loudestOf, markDropsSeen,
  myDrops, myWallet, readWalletSwitch, walletProgress, withdraw,
  type Wallet as Purse, type WalletDrop, type WalletSwitch,
} from "@/lib/wallet";

/**
 * The wallet, above the inventories on the edit-profile page. See v91.
 *
 * The prizes beside it are things: each one arrives whole, is claimed, and is
 * handed over. This is the other half of that — the payments too small to be
 * worth arranging a meeting for, which add up here instead until they are.
 *
 * So the bar is the feature. A number going up on a page nobody visits is not
 * a reward; what makes this worth anything is being able to see how far along
 * it is, and that it keeps going after the line rather than stopping at it.
 * Past the bar the bar stays full and the percentage carries on climbing,
 * which is the honest drawing of a wallet somebody has decided to leave
 * filling.
 *
 * It renders nothing at all when the wallet is switched off, and an empty one
 * when it is on and nothing has been paid in yet — an empty wallet with a bar
 * at nought is the only way anybody finds out there is something to fill.
 */
export function Wallet({ verified }: {
  /** Whether they have proved a character. Nothing is paid to anybody who has
   *  not (v91), so an unverified wallet says so rather than waiting silently. */
  verified: boolean;
}) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  /** The switch. undefined until read, null when v91 has not been run. */
  const [sw, setSw] = useState<WalletSwitch | null | undefined>(undefined);
  const [purse, setPurse] = useState<Purse>(EMPTY_WALLET);
  const [drops, setDrops] = useState<WalletDrop[]>([]);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The tier being played right now, or null when the card is quiet. */
  const [lit, setLit] = useState<RareTier | null>(null);
  /**
   * Play the fanfare, for 2600ms, at that tier.
   *
   * Up here with the hooks rather than down beside the markup that uses it,
   * because the console commands below close over it and this component
   * returns early — on the first render it has no account and no switch yet,
   * so a `const` declared after that return is a `const` that never runs, and
   * the command registered on mount reaches a name that was never given a
   * value. Which is what it did.
   */
  const replay = useCallback((tier: RareTier) => {
    setLit(tier);
    setTimeout(() => setLit(null), 2600);
  }, []);

  /*
   * `testWallet()` in the console, locally: the wallet drawn at whatever
   * numbers are given, so the bar can be looked at full, half full and past
   * the line without waiting for a popoto to pay one. Nothing is written and
   * the button does nothing while it is on. `testWallet(false)` puts it back.
   *
   *   testWallet()                        120,000 of 250,000
   *   testWallet(380000)                  past the line, and ready
   *   testWallet(50000, 1000000)          a bar somebody has moved
   *   testWallet(130000, 250000, "ultra") and the fanfare that tier arrives with
   *   testAqua("super")                   just the fanfare, again
   */
  const [demo, setDemo] = useState<{ balance: number; threshold: number } | null>(null);
  /** Whether the card is on the page at all, which the commands below need. */
  const on = !!sw?.on;
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      testWallet?: (balance?: number | false, threshold?: number, tier?: RareTier) => void;
      testAqua?: (tier?: RareTier) => void;
    };
    w.testWallet = (balance = 120_000, threshold = 250_000, tier?: RareTier) => {
      setDemo(balance === false ? null : { balance, threshold });
      if (balance !== false && tier) replay(tier);
      console.info(balance === false
        ? "[wallet] back to the real one"
        : `[wallet] ${balance.toLocaleString()} of ${threshold.toLocaleString()}`
          + (tier ? ` · playing ${tier}` : ""));
    };
    /*
     * And the fanfare on its own, which is the one that gets pressed twenty
     * times while the timing is being tuned.
     *
     * It brings the card up first if there is nothing to play it on. With the
     * wallet switched off this component draws nothing at all, so the command
     * used to set a tier onto a card that was not there, do exactly what it
     * was asked, and look broken — a console that answers `undefined` and
     * changes nothing on the screen is indistinguishable from one that failed.
     */
    w.testAqua = (tier: RareTier = "rare") => {
      if (!on) setDemo((d) => d ?? { balance: 130_000, threshold: 250_000 });
      replay(tier);
      console.info(`[wallet] playing ${tier}`);
    };
    return () => { delete w.testWallet; delete w.testAqua; };
  }, [replay, on]);
  const [err, setErr] = useState<string | null>(null);
  /** What the last press handed over, said once and then left alone. */
  const [took, setTook] = useState<number | null>(null);

  const read = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    setMe(uid);
    const on = await readWalletSwitch(supabase);
    setSw(on);
    if (!uid || !on?.on) return;
    const [w, d] = await Promise.all([myWallet(supabase, uid), myDrops(supabase, uid)]);
    setPurse(w);
    setDrops(d);
  }, [supabase]);
  useEffect(() => { void read(); }, [read]);


  /*
   * Money that landed while they were away.
   *
   * The same record the prize inventory keeps, and for the same reason: the
   * fanfare goes off once, the first time its owner lays eyes on the payment,
   * and a page reloaded an hour later is quiet. Three at once play one
   * fanfare at the best of their tiers rather than three in a row.
   *
   * Stamped as it starts rather than when it ends, so a page closed halfway
   * through does not queue the same one up for ever.
   */
  const fresh = drops.filter((d) => !d.seenAt).map((d) => d.id).join(",");
  useEffect(() => {
    if (!fresh || !supabase) return;
    const ids = fresh.split(",").map(Number);
    setLit(loudestOf(drops.filter((d) => ids.includes(d.id))));
    void markDropsSeen(supabase, ids);
    const stop = setTimeout(() => setLit(null), 2600);
    return () => clearTimeout(stop);
    // The list is read as it is when a new payment appears in it; a later one
    // brings its own round of this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, supabase]);

  /*
   * Arriving from the notification. The same problem both inventories have:
   * this is a long way down a long page and does not exist until the switch
   * has been read, by which time the browser has given up on the #wallet in
   * the address.
   */
  const there = sw?.on === true;
  useEffect(() => {
    if (!there || window.location.hash !== `#${WALLET_ID}`) return;
    document.getElementById(WALLET_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [there]);

  // The demo stands in for the switch as well, so the wallet can be looked at
  // on a database that has never had v91 run against it.
  const bar = demo?.threshold ?? sw?.threshold ?? 0;
  const held = demo ? { ...EMPTY_WALLET, balance: demo.balance } : purse;
  if (!supabase || !me || !(demo || sw?.on)) return null;

  const { pct, over, left, ready } = walletProgress(held.balance, bar);
  const canTake = ready && verified && !busy && !demo;

  const take = async () => {
    if (!canTake) return;
    setBusy(true);
    setErr(null);
    const r = await withdraw(supabase);
    setBusy(false);
    if ("error" in r) { setErr(r.error); return; }
    setTook(r.amount);
    await read();
  };

  // What the fanfare is coloured by: the tier's own, so a super or an ultra
  // payment reads as one of those rather than as more of the wallet's gold.
  const flare = lit ? TIER_LOOK[lit].color : WALLET_COLOR;

  return (
    <section id={WALLET_ID}
             className={`relative mt-3 scroll-mt-24 overflow-hidden rounded-xl border-2 p-4 ${
               lit && TIER_FX[lit].shake ? `rare-shake-${TIER_FX[lit].shake}` : ""}`}
             style={{ borderColor: lit ? flare : ready ? WALLET_COLOR : `${WALLET_COLOR}55`,
                      background: `${WALLET_COLOR}0d`,
                      boxShadow: ready ? `inset 0 0 26px ${WALLET_COLOR}22` : undefined }}>
      {lit && <Fanfare tier={lit} hue={flare} />}
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-bg/50 text-2xl">
          💰
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display font-semibold">{t("wallet.title")}</span>
          <span className="text-ui leading-relaxed text-muted">{t("wallet.what")}</span>
        </div>
        {/* The figure, in the one place the eye goes first. Grouped digits in
            both languages: this is a number somebody is about to compare with
            what is in their purse in game. */}
        <span className="flex items-baseline gap-1.5 font-data">
          <span className="text-head font-semibold" style={{ color: WALLET_COLOR }}>
            {fmtGil(held.balance)}
          </span>
          <span className="text-ui text-muted">/ {fmtGil(bar)} gil</span>
        </span>
      </div>

      {/* ── how far along ──────────────────────────────────────────────── */}
      <div className="relative mt-3">
        <div className="h-3.5 w-full overflow-hidden rounded-full border border-line bg-bg">
          <div className="h-full rounded-full transition-[width] duration-700 ease-out"
               style={{
                 width: `${pct}%`,
                 background: ready
                   ? `linear-gradient(90deg, ${WALLET_COLOR}, #f3c969, ${WALLET_COLOR})`
                   : `linear-gradient(90deg, ${WALLET_COLOR}99, ${WALLET_COLOR})`,
                 boxShadow: ready ? `0 0 14px ${WALLET_COLOR}` : undefined,
               }} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`text-read ${ready ? "font-medium" : "text-muted"}`}
                style={ready ? { color: WALLET_COLOR } : undefined}>
            {ready ? t("wallet.ready", { pct: over })
                   : t("wallet.toGo", { n: fmtGil(left) })}
          </span>
          {held.earned > held.balance && (
            <span className="text-ui text-muted">
              · {t("wallet.earned", { n: fmtGil(held.earned) })}
            </span>
          )}
          <button type="button" onClick={() => setAsking(true)} disabled={!canTake}
                  className="ml-auto rounded-lg border border-jade/60 bg-jade/15 px-3.5 py-1.5 text-lead font-medium text-jade hover:bg-jade/25 disabled:opacity-40">
            {t("wallet.take")}
          </button>
        </div>
      </div>

      {/* Nothing is ever paid to an account that has not proved a character
          (v91), so this says so where the bar is rather than leaving somebody
          to work out why theirs never moves. */}
      {!verified && (
        <p className="mt-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-ui leading-relaxed text-gold">
          {t("wallet.needVerify")}
        </p>
      )}

      {took != null && (
        <p className="mt-2 text-read text-jade">
          {t("wallet.tookIt", { n: fmtGil(took) })}
        </p>
      )}
      {err && <p className="mt-2 text-ui text-chili">{err}</p>}

      {/* ── where it came from ─────────────────────────────────────────── */}
      {drops.length > 0 ? (
        <div className="relative mt-3 border-t border-line pt-3">
          <div className="text-ui text-muted">{t("wallet.lately")}</div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {drops.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-ui">
                {/* Pressing it plays that one again, which is what somebody
                    who missed their own ultra will try. */}
                <button type="button" onClick={() => replay(d.tier)}
                        title={TIER_LOOK[d.tier].label}
                        className="transition-transform hover:scale-105">
                  <TierBadge tier={d.tier} small />
                </button>
                <span className="font-data font-semibold"
                      style={{ color: d.color || WALLET_COLOR }}>
                  +{fmtGil(d.amount)}
                </span>
                <span className="text-ink/80">{d.name}</span>
                <span className="ml-auto text-meta text-muted">{fmtDateTime(d.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-ui leading-relaxed text-muted">
          {t("wallet.nothingYet")}
        </p>
      )}

      {asking && (
        <ConfirmDialog z={120}
                       message={t("wallet.takeAsk", { n: fmtGil(held.balance) })}
                       confirmLabel={t("wallet.take")}
                       onCancel={() => setAsking(false)}
                       onConfirm={() => { setAsking(false); void take(); }} />
      )}
    </section>
  );
}

export default Wallet;
