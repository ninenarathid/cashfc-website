"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImagePicker from "@/components/ImagePicker";
import PrizeChat from "@/components/PrizeChat";
import PrizeOdds from "@/components/PrizeOdds";
import { TierBadge } from "@/components/PopotoRare";
import { TIER_LOOK, type RareTier } from "@/lib/popoto-rare";
import fcIds from "@/data/fc-ids.json";
import {
  AQUA_FX, AUDIENCES, DRAWS, OTHER_SIDES, PRIZE_COLOR, PRIZE_INVENTORY,
  TIER_ADVICE, allPrizes, allWins, aquaArt, deliver, flipSwitch, oneIn,
  otherSideApplies, readSwitch, stockFits, syncRoster,
  type Prize, type PrizeAudience, type PrizeDraw, type PrizeFx, type PrizeKind,
  type PrizeOtherSide, type PrizeSwitch, type Win,
} from "@/lib/prizes";
import {
  WALLET, WALLET_COLOR, fmtGil, readWalletSwitch, saveWalletSwitch,
  type WalletSwitch,
} from "@/lib/wallet";
import { toast } from "@/components/ui/Toast";

const inputCls =
  "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

/**
 * Everything the form edits. Stock is text, because empty means unlimited.
 *
 * No detail. The prize had a second line saying what the thing actually is,
 * which in practice repeated the name in more words — so the form no longer
 * asks for one. The column and anything already written in it are left alone:
 * the saves below simply do not name it, so an old prize keeps the line it
 * has and a new one has none.
 */
interface Draft {
  name: string;
  nameEn: string;
  icon: string | null;
  color: string;
  chance: string;
  draw: PrizeDraw;
  audience: PrizeAudience;
  otherSide: PrizeOtherSide;
  tier: RareTier;
  /** Which card a win of it arrives on. See PrizeFx and v92. */
  fx: PrizeFx;
  kind: PrizeKind;
  /** How much gil, for a gil one. Text, because half-typed is not a number. */
  gil: string;
  stock: string;
}

const EMPTY: Draft = {
  name: "", nameEn: "", icon: null, color: PRIZE_COLOR,
  chance: "1", draw: "give", audience: "fc", otherSide: "anyone", tier: "rare",
  fx: "tier", kind: "item", gil: "10000", stock: "",
};

const TIERS: RareTier[] = ["rare", "super", "ultra"];

const num = (s: string) => Number(s.replace(",", "."));

/** The two choices, in words. Spelled out rather than built from the value:
 *  a key made by interpolation is a key no tool can find. */
const DRAW_LABEL: Record<PrizeDraw, Key> = {
  receive: "adm.prizeDrawReceive",
  give: "adm.prizeDrawGive",
  both: "adm.prizeDrawBoth",
  daily: "adm.prizeDrawDaily",
};
const DRAW_WHY: Record<PrizeDraw, Key> = {
  receive: "adm.prizeDrawReceiveWhy",
  give: "adm.prizeDrawGiveWhy",
  both: "adm.prizeDrawBothWhy",
  daily: "adm.prizeDrawDailyWhy",
};
/** The three of her, in words. See AQUA_FX. */
const FX_LABEL: Record<PrizeFx, Key> = {
  tier: "adm.prizeTier",
  aqua: "adm.prizeFxAqua",
  aqua_purse: "adm.prizeFxPurse",
  aqua_card: "adm.prizeFxCard",
};

/** Who has to be at the other end, in words. See otherSideApplies. */
const OTHER_SIDE_LABEL: Record<PrizeOtherSide, Key> = {
  anyone: "adm.prizeSideAnyone",
  fc: "adm.prizeSideFc",
  fc_verified: "adm.prizeSideFcVerified",
};
const AUDIENCE_LABEL: Record<PrizeAudience, Key> = {
  fc: "adm.prizeForFc",
  guest: "adm.prizeForGuest",
  all: "adm.prizeForAll",
};

/**
 * The prize cupboard, and the queue of things to hand over. See v87.
 *
 * Two halves in the order the job happens, the same shape AdminBadges uses: a
 * prize is a thing that exists once, and somebody winning one is a separate
 * event with its own life. Both on one screen because whoever comes here to
 * add a prize is usually here because somebody has claimed one.
 *
 * Every admin, unlike the rare popoto flavours — those are one keeper's
 * surprise (v77) and this is the FC's cupboard. The database agrees: these
 * tables ask is_admin() and nothing else.
 */
export default function AdminPrizes(
  { chart }: {
    /**
     * The giving, drawn, above the odds bar.
     *
     * Passed in rather than imported here because it needs the roster to put
     * names on its bars and this screen has never needed the roster. It sits
     * where it does because the two answer the same question from opposite
     * ends: how much giving there is, and what that giving can turn into.
     */
    chart?: ReactNode;
  } = {},
) {
  const { t, lang } = useLang();
  const supabase = useMemo(() => createClient(), []);

  const [me, setMe] = useState<string | null>(null);
  /**
   * The claim somebody followed a link to, until it has been scrolled to.
   *
   * The admin inbox links at one claim rather than at this tab in general
   * (/admin#prizes:24), and the queue it is in may still be loading when the
   * link arrives. Kept as its own piece of state rather than scrolling to
   * whatever is open, so that opening a thread by hand does not move the page
   * under the hand that opened it.
   */
  const [jumpTo, setJumpTo] = useState<number | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  /** How many characters the database has as the FC. undefined until asked. */
  const [roster, setRoster] = useState<number | null | undefined>(undefined);
  /** The master switch. undefined until read, null when v88 has not been run. */
  const [master, setMaster] = useState<PrizeSwitch | null | undefined>(undefined);
  /** The wallet's own, and its bar. Null when v91 has not been run. */
  const [purse, setPurse] = useState<WalletSwitch | null | undefined>(undefined);
  /** The bar while it is being typed, which is not a number until it is saved. */
  const [bar, setBar] = useState("");
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [d, setD] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<
    { text: string; label: string; run: () => void; danger?: boolean } | null>(null);
  const [openWin, setOpenWin] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const flash = (s: string) => { setMsg(s); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [supabase]);

  /**
   * A claim linked to from the admin inbox: /admin#prizes:24.
   *
   * The tab card reads the part before the colon and opens this tab; the rest
   * is ours. Listened for as well as read once, because both ends of that link
   * are on the same page: a second click, on another claim, moves the address
   * and nothing else.
   */
  useEffect(() => {
    const want = () => {
      const [key, id] = window.location.hash.slice(1).split(":");
      if (key !== "prizes" || !id) return;
      const n = Number(id);
      if (!Number.isFinite(n)) return;
      setOpenWin(n);
      setJumpTo(n);
    };
    want();
    window.addEventListener("hashchange", want);
    return () => window.removeEventListener("hashchange", want);
  }, []);

  // And scrolled to once the queue holding it has been drawn, which is normally
  // a fetch later than the link that asked for it.
  useEffect(() => {
    if (jumpTo == null) return;
    const el = document.getElementById(`win-${jumpTo}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setJumpTo(null);
  }, [jumpTo, wins]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [p, w, sw, pw] = await Promise.all([
      allPrizes(supabase), allWins(supabase), readSwitch(supabase),
      readWalletSwitch(supabase)]);
    setPrizes(p);
    setWins(w);
    setMaster(sw);
    setPurse(pw);
    // Only when it is not being edited: a refresh under a half-typed number
    // would put the saved one back mid-keystroke.
    setBar((v) => (v === "" && pw ? String(pw.threshold) : v));
    const ids = [...new Set(w.map((x) => x.winner))];
    if (ids.length) {
      const { data } = await supabase.from("profiles")
        .select("id, character_name, display_name, discord_username").in("id", ids);
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as Record<string, string | null>[]) {
        map[r.id as string] = r.character_name ?? r.display_name
          ?? r.discord_username ?? "—";
      }
      setNames(map);
    }
  }, [supabase]);

  useEffect(() => { void refresh(); }, [refresh]);

  /*
   * The roll has to know who is in the Free Company and the database has no
   * way to find out — data/fc-ids.json is written by a pipeline that holds no
   * key to it. So this tab carries the list across on the way in, and only
   * when it differs, so opening the tab is normally not a write. See v87.
   */
  useEffect(() => {
    if (!supabase) return;
    const ids = (fcIds as { ids: number[] }).ids;
    void syncRoster(supabase, ids).then(setRoster);
  }, [supabase]);

  const clear = () => { setEditing(null); setD(EMPTY); };

  const load = (p: Prize) => {
    setEditing(p.id);
    setD({
      name: p.name, nameEn: p.nameEn ?? "", icon: p.icon, color: p.color,
      chance: String(p.chance), draw: p.draw, audience: p.audience,
      otherSide: p.otherSide, tier: p.tier, fx: p.fx,
      kind: p.kind, gil: p.gilAmount == null ? "10000" : String(p.gilAmount),
      stock: p.stock == null ? "" : String(p.stock),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chance = num(d.chance);
  const stock = d.stock.trim() === "" ? null : Math.floor(num(d.stock));
  const okChance = d.chance.trim() !== "" && Number.isFinite(chance)
    && chance >= 0 && chance <= 100;
  const okStock = stock === null || (Number.isFinite(stock) && stock >= 0);
  const evenStock = okStock && stockFits(d.draw, stock);
  const okName = d.name.trim().length > 0 && d.name.trim().length <= 60;
  const gil = Math.floor(num(d.gil));
  // Gil is a whole number of gil and there is no such thing as none of it: a
  // prize worth nothing would still take its span of the line and pay nobody.
  const okGil = d.kind !== "gil" || (Number.isFinite(gil) && gil > 0);
  const ok = okName && okChance && okStock && evenStock && okGil;

  const save = async () => {
    if (!supabase || !ok || busy) return;
    setBusy(true);
    setErr(null);
    const { data: u } = await supabase.auth.getUser();
    // A gil prize has no picture: what a payment into a wallet looks like is a
    // figure on a bar. Cleared rather than kept, so a prize turned from an item
    // into gil does not carry an invisible minion's picture around with it.
    const money = d.kind === "gil";
    const row = {
      name: d.name.trim(),
      name_en: d.nameEn.trim() || null,
      icon_url: money ? null : d.icon,
      color: d.color,
      chance_pct: chance,
      draw: d.draw,
      audience: d.audience,
      // Kept rather than reset on the draws that do not read it, so switching
      // a prize to a pair and back does not quietly lose the setting.
      other_side: d.otherSide,
      tier: d.tier,
      fx: d.fx,
      kind: d.kind,
      gil_amount: money ? gil : null,
      stock,
    };
    const r = editing
      ? await supabase.from("prizes").update(row).eq("id", editing)
      : await supabase.from("prizes").insert({ ...row, created_by: u.user?.id ?? null });
    setBusy(false);
    if (r.error) { setErr(r.error.message); return; }
    clear();
    await refresh();
    flash(t("adm.saved"));
  };

  const flip = async (p: Prize) => {
    if (!supabase) return;
    const r = await supabase.from("prizes").update({ active: !p.active }).eq("id", p.id);
    if (r.error) { setErr(r.error.message); return; }
    await refresh();
  };

  const remove = async (p: Prize) => {
    if (!supabase) return;
    const r = await supabase.from("prizes").delete().eq("id", p.id);
    if (r.error) { setErr(r.error.message); return; }
    if (editing === p.id) clear();
    await refresh();
    flash(t("adm.prizeGone"));
  };

  const flipMaster = async () => {
    if (!supabase || !master) return;
    setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const r = await flipSwitch(supabase, !master.on, u.user?.id ?? null);
    if (r.error) { setErr(r.error); return; }
    await refresh();
  };

  /**
   * The wallet's switch and its bar, saved together.
   *
   * One write for both, because they are one decision: turning the wallet on
   * with the bar at whatever it happened to be is how a Free Company ends up
   * handing out a quarter of a million gil it had meant to set to a million.
   */
  const savePurse = async (next: { on: boolean; threshold: number }) => {
    if (!supabase || busy) return;
    setBusy(true);
    setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const r = await saveWalletSwitch(supabase, next, u.user?.id ?? null);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    await refresh();
    flash(t("adm.saved"));
  };

  /**
   * Throw the card it would arrive on into the corner of the screen.
   *
   * Nothing is written and nobody is told: this is the same toast() every
   * notification goes through, called straight from the button. How a win
   * lands is the one thing about a prize that cannot be judged from a form —
   * R, SR, UR and Aqua are four words here and four quite different two
   * seconds over there.
   */
  const preview = (x: {
    kind: PrizeKind; fx: PrizeFx; tier: RareTier;
    name: string; icon: string | null; gil: number | null;
  }) => {
    const money = x.kind === "gil";
    toast({
      text: money
        ? t("notif.walletDrop", { n: fmtGil(x.gil ?? 0) })
        : t("notif.prizeWinNamed", { prize: x.name || t("adm.prizeName") }),
      image: money ? null : x.icon,
      square: true,
      badge: money ? "💰" : "🎉",
      tone: aquaArt(x.fx) ? "wallet" : "prize",
      aqua: aquaArt(x.fx) ?? undefined,
      tier: aquaArt(x.fx) ? undefined : x.tier,
      cta: money ? undefined : t("prize.openInInventory"),
      href: money ? WALLET : PRIZE_INVENTORY,
    });
  };

  const handOver = async (w: Win) => {
    if (!supabase || busy) return;
    setBusy(true);
    setErr(null);
    const r = await deliver(supabase, w.id);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    await refresh();
    flash(t("adm.prizeDelivered"));
  };

  /**
   * What the whole cupboard adds up to.
   *
   * One number for all four groups, because since v90 they share one roll:
   * every prize a popoto could produce is laid end to end on a single number
   * and at most one comes up, so the total is how often a popoto wins
   * anything at all. It used to be a total per group, which was right while
   * the groups rolled separately and would now read as four chances.
   *
   * Anything past a hundred is a prize at the end of the line that can never
   * come up, which is worth saying rather than leaving to be discovered by
   * nobody ever winning it.
   */
  const total = useMemo(
    () => prizes
      // A gil prize with the wallet switched off is off the line entirely
      // (v91), the same as one that is paused, so it is not part of what a
      // popoto can turn into today.
      .filter((p) => p.active && (p.kind !== "gil" || purse?.on))
      .reduce((n, p) => n + p.chance, 0),
    [prizes, purse]);

  const waiting = wins.filter((w) => !w.deliveredAt).length;

  if (!supabase) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── How much giving there is, and what it turns into ────────────
          First, above even the switches. Everything under these two is a
          decision about a number — how often, how much, who — and these are
          the only things on the tab that say what those numbers are being
          applied to. Worth reading before rather than after. */}
      {chart}

      {/* And what that giving can turn into, right under it: the two are the
          same question from opposite ends, and neither is much use alone. A
          chance per popoto means nothing until you know how many popotos a
          day there are, and how many popotos a day there are means nothing
          until you know what one can become. */}
      {master !== null && (
        <PrizeOdds supabase={supabase} prizes={prizes} prizesOn={!!master?.on}
                   walletOn={!!purse?.on} />
      )}

      {/* ── Whether any of it runs ──────────────────────────────────────
          Above everything, because it is the answer to the first question
          anybody opening this tab has, and because a cupboard full of prizes
          with the draw switched off looks exactly like one that is working. */}
      {master === null && (
        <p className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-2 text-ui text-chili">
          {t("adm.prizeSwitchMissing")}
        </p>
      )}
      {master && (
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-3 ${
          master.on ? "border-jade/60 bg-jade/10" : "border-line bg-card"}`}>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-head font-semibold ${master.on ? "text-jade" : "text-ink"}`}>
              {master.on ? t("adm.prizeSwitchOn") : t("adm.prizeSwitchOff")}
            </span>
            <span className="text-read text-muted">
              {master.on ? t("adm.prizeSwitchOnWhy") : t("adm.prizeSwitchOffWhy")}
              {master.at && <> · {fmtDateTime(master.at)}</>}
            </span>
          </div>
          <button type="button" onClick={() => setAsking(true)}
                  className={`rounded-lg border px-4 py-2 text-lead font-medium ${
                    master.on ? "border-chili/60 text-chili hover:bg-chili/10"
                              : "border-jade/60 bg-jade/15 text-jade hover:bg-jade/25"}`}>
            {master.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
          </button>
        </div>
      )}
      {/* ── and whether the small money runs ───────────────────────────
          Under the master switch because it is beneath it in every sense: the
          gil is on the same line as the prizes and is drawn by the same roll,
          so with the switch above off this one changes nothing. See v91. */}
      {purse === null && (
        <p className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-ui text-gold">
          {t("adm.walletMissing")}
        </p>
      )}
      {purse && (
        <div className="flex flex-col gap-2.5 rounded-xl border p-3"
             style={{ borderColor: purse.on ? WALLET_COLOR : undefined,
                      background: purse.on ? `${WALLET_COLOR}0d` : undefined }}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl">💰</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-head font-semibold"
                    style={{ color: purse.on ? WALLET_COLOR : undefined }}>
                {purse.on ? t("adm.walletOn") : t("adm.walletOff")}
              </span>
              <span className="text-read leading-relaxed text-muted">
                {purse.on ? t("adm.walletOnWhy") : t("adm.walletOffWhy")}
                {purse.at && <> · {fmtDateTime(purse.at)}</>}
              </span>
            </div>
            <button type="button" disabled={busy}
                    onClick={() => setConfirm({
                      text: purse.on ? t("adm.walletOffAsk") : t("adm.walletOnAsk"),
                      label: purse.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn"),
                      danger: purse.on,
                      run: () => void savePurse({ on: !purse.on, threshold: purse.threshold }),
                    })}
                    className={`rounded-lg border px-4 py-2 text-lead font-medium disabled:opacity-40 ${
                      purse.on ? "border-chili/60 text-chili hover:bg-chili/10"
                               : "border-jade/60 bg-jade/15 text-jade hover:bg-jade/25"}`}>
              {purse.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
            </button>
          </div>

          {/* The bar, which is a minimum and not a price: the button in
              somebody's wallet hands over everything that is in there. */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-ui text-muted">{t("adm.walletBar")}</span>
              <span className="flex items-center gap-1.5">
                <input type="number" min={1} step={1000} value={bar}
                       onChange={(e) => setBar(e.target.value)}
                       className={`${inputCls} w-36 text-right`} />
                <span className="text-read text-muted">gil</span>
              </span>
            </label>
            <button type="button"
                    disabled={busy || !(Number(bar) > 0)
                      || Math.round(Number(bar)) === purse.threshold}
                    onClick={() => void savePurse({
                      on: purse.on, threshold: Math.round(Number(bar)) })}
                    className="mb-0.5 rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-40">
              {t("adm.save")}
            </button>
            <p className="mb-1 max-w-prose text-ui leading-relaxed text-muted">
              {t("adm.walletBarWhy")}
            </p>
          </div>

          {/* A wallet that can be filled and never emptied is the one state
              worth shouting about, and it is one scroll away from here. */}
          {purse.on && master && !master.on && (
            <p className="text-ui text-gold">{t("adm.walletNeedsDraw")}</p>
          )}
        </div>
      )}

      {(roster === 0 || roster === null) && (
        <p className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-ui text-gold">
          {t("adm.prizeNoRoster")}
        </p>
      )}

      <div ref={formRef} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3">
        <div className="font-display font-semibold">
          {editing ? t("adm.prizeEditing") : t("adm.prizeNew")}
        </div>

        {/* What winning it gets you, and therefore what the rest of this form
            is for. First, because it decides which half of the fields below
            mean anything: a payment into a wallet has no picture to pick, no
            line of detail to write and no fanfare to dress up. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ui text-muted">{t("adm.prizeKind")}</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setD({ ...d, kind: "item" })}
                    className={`rounded-lg border px-3 py-1.5 text-read ${
                      d.kind === "item"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              🎁 {t("adm.prizeKindItem")}
            </button>
            <button type="button"
                    onClick={() => setD({ ...d, kind: "gil", fx: "aqua",
                                          color: d.color === PRIZE_COLOR ? WALLET_COLOR : d.color })}
                    className={`rounded-lg border px-3 py-1.5 text-read ${
                      d.kind === "gil"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              💰 {t("adm.prizeKindGil")}
            </button>
          </div>
          <span className="max-w-prose text-ui leading-relaxed text-muted">
            {t(d.kind === "gil" ? "adm.prizeKindGilWhy" : "adm.prizeKindItemWhy")}
          </span>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })}
                 placeholder={t("adm.prizeName")} className={inputCls} />
          <input value={d.nameEn} onChange={(e) => setD({ ...d, nameEn: e.target.value })}
                 placeholder={t("adm.prizeNameEn")} className={inputCls} />
        </div>

        {/* How much one of them is worth. Beside nothing else, because it is
            the whole of what a gil prize is. */}
        {d.kind === "gil" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-ui text-muted">{t("adm.prizeGilAmount")}</span>
              <span className="flex items-center gap-1.5">
                <input type="number" min={1} step={1000} value={d.gil}
                       onChange={(e) => setD({ ...d, gil: e.target.value })}
                       className={`${inputCls} w-36 text-right`} />
                <span className="text-read text-muted">gil</span>
              </span>
            </label>
            {!okGil && <span className="pb-2.5 text-ui text-chili">{t("adm.prizeGilNeeded")}</span>}
            {okGil && purse && okChance && chance > 0 && (
              // The sentence somebody setting this is actually trying to write:
              // not "one in a hundred" but "how long until somebody can cash
              // out". Both numbers are on this screen and multiplying them in
              // your head is how a decimal point goes unnoticed.
              <span className="max-w-prose pb-2.5 text-ui leading-relaxed text-muted">
                {t("adm.prizeGilPace", {
                  n: Math.max(1, Math.round(purse.threshold / (gil * (chance / 100)))).toLocaleString(),
                  bar: fmtGil(purse.threshold),
                })}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeChance")}</span>
            <span className="flex items-center gap-1.5">
              <input type="number" min={0} max={100} step={0.1} value={d.chance}
                     onChange={(e) => setD({ ...d, chance: e.target.value })}
                     className={`${inputCls} w-24 text-right`} />
              <span className="text-read text-muted">%</span>
            </span>
          </label>
          <span className="pb-2.5 text-ui text-muted">
            {okChance && chance > 0
              ? t("adm.prizeChanceMeans", { n: (oneIn(chance) ?? 0).toLocaleString() })
              : t("adm.prizeChanceNever")}
          </span>

          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeDraw")}</span>
            <select value={d.draw} className={inputCls}
                    onChange={(e) => setD({ ...d, draw: e.target.value as PrizeDraw })}>
              {DRAWS.map((k) => (
                <option key={k} value={k}>{t(DRAW_LABEL[k])}</option>
              ))}
            </select>
          </label>
          {/* What the choice above actually means on an evening of giving.
              Beside it rather than in a tooltip: "give" and "daily" differ by
              a factor of the sender's enthusiasm, which is the whole choice. */}
          <span className="max-w-xs pb-2.5 text-ui leading-relaxed text-muted">
            {t(DRAW_WHY[d.draw])}
            {otherSideApplies(d.draw) && d.otherSide !== "anyone" && (
              <> {t(d.otherSide === "fc" ? "adm.prizeOtherSideFcWhy"
                : "adm.prizeOtherSideVerifiedWhy")}</>
            )}
          </span>

          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeAudience")}</span>
            <select value={d.audience} className={inputCls}
                    onChange={(e) => setD({ ...d, audience: e.target.value as PrizeAudience })}>
              {AUDIENCES.map((k) => (
                <option key={k} value={k}>{t(AUDIENCE_LABEL[k])}</option>
              ))}
            </select>
          </label>
          {/* And who else was involved. Only where there is somebody else: a
              pair is both ends at once and already asks the question above of
              both of them, and a once-a-day roll is about a person's day. */}
          {otherSideApplies(d.draw) && (
            <label className="flex flex-col gap-1">
              <span className="text-ui text-muted">
                {t(d.draw === "give" ? "adm.prizeSentTo" : "adm.prizeGotFrom")}
              </span>
              <select value={d.otherSide} className={inputCls}
                      onChange={(e) => setD({ ...d,
                        otherSide: e.target.value as PrizeOtherSide })}>
                {OTHER_SIDES.map((k) => (
                  <option key={k} value={k}>{t(OTHER_SIDE_LABEL[k])}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeStock")}</span>
            <input type="number" min={0} step={1} value={d.stock}
                   onChange={(e) => setD({ ...d, stock: e.target.value })}
                   placeholder={t("adm.prizeStockAny")}
                   className={`${inputCls} w-32 text-right`} />
          </label>
        </div>

        {/* The tier, picked the way a flavour's is (AdminFlavors): the three
            badges themselves, ringed when chosen. One control for one ladder
            — somebody who has set a flavour's tier already knows this one,
            and a dropdown reading "ULTRA RARE" says less than the chip that
            is actually going to turn up on the card. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* The fanfare it arrives with, for both sorts. A prize plays it on
              its card in the inventory and a wallet payment plays it on the
              wallet itself — same three steps, same noise, so an ultra means
              the same thing whichever of them just landed. */}
          <span className="text-ui text-muted">{t("adm.prizeTier")}</span>
          {TIERS.map((x) => {
            const on = d.fx === "tier" && d.tier === x;
            return (
              <button key={x} type="button"
                      onClick={() => setD({ ...d, tier: x, fx: "tier" })}
                      className={`rounded-full border-2 p-0.5 ${
                        on ? "" : "border-transparent opacity-60 hover:opacity-100"}`}
                      style={on ? { borderColor: TIER_LOOK[x].color } : undefined}>
                <TierBadge tier={x} />
              </button>
            );
          })}
          {/* And the three of her, which are not three more rungs: the ladder
              above is how loud, and these are three different things to be
              handed. The tier a prize had is kept and still used — on its chip
              and on its card in the winner's inventory — because the only thing
              this changes is the two seconds it lands in. See v92, v93. */}
          {AQUA_FX.map((x) => (
            <button key={x} type="button" onClick={() => setD({ ...d, fx: x })}
                    className={`rounded-full border-2 px-2.5 py-1 text-ui font-semibold ${
                      d.fx === x ? "" : "border-transparent opacity-60 hover:opacity-100"}`}
                    style={{ background: `${WALLET_COLOR}22`, color: WALLET_COLOR,
                             borderColor: d.fx === x ? WALLET_COLOR : undefined }}>
              💰 {t(FX_LABEL[x])}
            </button>
          ))}
          <button type="button"
                  onClick={() => preview({ kind: d.kind, fx: d.fx, tier: d.tier,
                                           name: d.name.trim(), icon: d.icon,
                                           gil: okGil ? gil : 0 })}
                  className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
            {t("adm.prizeTestToast")}
          </button>
          <label className="ml-auto flex items-center gap-2 text-read text-muted">
            {t("adm.prizeColor")}
            <input type="color" value={d.color}
                   onChange={(e) => setD({ ...d, color: e.target.value })}
                   className="h-8 w-12 cursor-pointer rounded border border-line bg-transparent" />
          </label>
        </div>

        {/* The guide, under the row it is about. A suggestion in a sentence
            rather than a validation, because the tier is what a win looks
            like and the chance is how often it happens, and nobody but the
            person giving the thing away can say how those should line up. */}
        {/* Only while a tier is what arrives. Her three say nothing here: the
            preview button beside them shows the thing itself, which is a
            better answer than a paragraph about it. */}
        {d.fx === "tier" && (
          <p className="max-w-prose text-ui leading-relaxed text-muted">
            {t(d.kind === "gil" ? "adm.prizeTierGilWhy" : "adm.prizeTierWhy")}
          </p>
        )}
        {d.kind === "item" && d.fx === "tier" && okChance && chance > 0
          && (chance < TIER_ADVICE[d.tier].low || chance > TIER_ADVICE[d.tier].high) && (
          <p className="text-ui text-gold">
            {t("adm.prizeTierOff", {
              tier: TIER_LOOK[d.tier].label,
              low: TIER_ADVICE[d.tier].low,
              high: TIER_ADVICE[d.tier].high,
            })}
          </p>
        )}
        {!evenStock && <p className="text-ui text-chili">{t("adm.prizeStockEven")}</p>}

        {d.kind === "item" && (
          <div className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeIcon")}</span>
            <ImagePicker supabase={supabase} value={d.icon}
                         onChange={(url) => setD({ ...d, icon: url })} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={!ok || busy}
                  className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-40">
            {editing ? t("adm.save") : t("adm.prizeAdd")}
          </button>
          {editing && (
            <button type="button" onClick={clear}
                    className="rounded-lg border border-line px-4 py-1.5 text-read text-muted hover:border-muted hover:text-ink">
              {t("common.cancel")}
            </button>
          )}
          {msg && <span className="self-center text-ui text-jade">{msg}</span>}
        </div>
      </div>

      {/* ── The cupboard, by when it is drawn ───────────────────────────── */}
      {/* The total is over all of them together and said once, because one
          popoto draws one prize out of the whole cupboard. Grouping below is
          about who wins, not about which draw it is. */}
      {prizes.some((p) => p.active) && (
        <p className={`text-ui ${total > 100 ? "text-chili" : "text-muted"}`}>
          {t("adm.prizeTotal", { pct: Math.round(total * 1000) / 1000 })}
          {total > 100 && ` · ${t("adm.prizeOverflow")}`}
        </p>
      )}
      {DRAWS.map((k) => {
        const inDraw = prizes.filter((p) => p.draw === k);
        if (!inDraw.length) return null;
        return (
          <section key={k} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display font-semibold">
                {t(DRAW_LABEL[k])}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {inDraw.map((p) => {
                const name = (lang === "en" ? p.nameEn : null) || p.name;
                const detail = (lang === "en" ? p.detailEn : null) || p.detail;
                const out = p.stock === 0;
                return (
                  <div key={p.id}
                       className={`flex flex-wrap items-center gap-3 rounded-xl border p-2.5 ${
                         p.active && !out && (p.kind !== "gil" || purse?.on)
                           ? "" : "opacity-55"}`}
                       style={{ borderColor: `${p.color}66`, background: `${p.color}0d` }}>
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50">
                      {p.icon
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.icon} alt="" className="size-11 object-contain" />
                        : <span className="text-xl">{p.kind === "gil" ? "💰" : "🎁"}</span>}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        {p.fx !== "tier" ? (
                          <span className="rounded-md px-1.5 py-[2px] text-label font-extrabold leading-none"
                                style={{ background: `${WALLET_COLOR}26`, color: WALLET_COLOR }}>
                            💰 {t(FX_LABEL[p.fx])}
                          </span>
                        ) : <TierBadge tier={p.tier} small />}
                        {p.kind === "gil" && (
                          <span className="font-data text-lead font-semibold"
                                style={{ color: p.color }}>
                            {fmtGil(p.gilAmount ?? 0)} gil
                          </span>
                        )}
                        <span className={p.kind === "gil"
                          ? "text-ui text-muted" : "text-lead font-semibold"}
                              style={p.kind === "gil" ? undefined : { color: p.color }}>
                          {name}
                        </span>
                      </span>
                      {detail && <span className="text-ui text-ink/75">{detail}</span>}
                      <span className="flex flex-wrap gap-x-2 text-meta text-muted">
                        <span>{p.chance}%</span>
                        {oneIn(p.chance) != null && (
                          <span>· {t("adm.prizeChanceMeans",
                            { n: (oneIn(p.chance) ?? 0).toLocaleString() })}</span>
                        )}
                        {/* When it is drawn and who had to be at the other
                            end, in one phrase and on every prize — including
                            the ones open to anybody. "Sent to somebody in the
                            FC" and "sent to anybody" are the same fact
                            answered two ways, and a row that only says it when
                            the answer is unusual leaves the reader to
                            remember which way round silence means. */}
                        <span>· {otherSideApplies(p.draw)
                          ? t(p.draw === "give" ? "adm.prizeDrawGiveTo"
                            : "adm.prizeDrawReceiveFrom",
                          { who: t(OTHER_SIDE_LABEL[p.otherSide]) })
                          : t(DRAW_LABEL[p.draw])}</span>
                        {/* Labelled, because the line above now ends in a
                            "to anybody" and two unlabelled "anybody"s in a row
                            read as one thing said twice. */}
                        <span>· {t("adm.prizeAudience")}: {t(AUDIENCE_LABEL[p.audience])}</span>
                        <span>· {p.stock == null
                          ? t("adm.prizeStockAny")
                          : t("adm.prizeLeft", { n: p.stock })}</span>
                        {!p.active && <span>· {t("adm.prizeOff")}</span>}
                        {/* On the line only while the wallet is running (v91).
                            A gil prize switched on under a wallet switched off
                            looks exactly like one that is working. */}
                        {p.kind === "gil" && p.active && purse && !purse.on && (
                          <span className="text-gold">· {t("adm.prizeGilWaiting")}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button"
                              onClick={() => preview({
                                kind: p.kind, fx: p.fx, tier: p.tier, name,
                                icon: p.icon, gil: p.gilAmount })}
                              className="rounded-lg border border-line px-3 py-1 text-ui text-muted hover:border-accent hover:text-accent">
                        {t("adm.prizeTestToast")}
                      </button>
                      <button type="button" onClick={() => load(p)}
                              className="rounded-lg border border-line px-3 py-1 text-ui text-muted hover:border-accent hover:text-accent">
                        {t("adm.edit")}
                      </button>
                      <button type="button" onClick={() => void flip(p)}
                              className="rounded-lg border border-line px-3 py-1 text-ui text-muted hover:border-accent hover:text-accent">
                        {p.active ? t("adm.prizePause") : t("adm.prizeResume")}
                      </button>
                      <button type="button"
                              onClick={() => setConfirm({
                                text: t("adm.prizeDropAsk", { name }),
                                label: t("adm.delete"),
                                danger: true,
                                run: () => void remove(p),
                              })}
                              className="rounded-lg border border-chili/50 px-3 py-1 text-ui text-chili hover:bg-chili/10">
                        {t("adm.delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── Who is waiting for what ─────────────────────────────────────── */}
      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-display font-semibold">{t("adm.prizeQueue")}</span>
          <span className="text-ui text-muted">
            {waiting ? t("adm.prizeWaiting", { n: waiting }) : t("adm.prizeNothingWaiting")}
          </span>
        </div>

        {!wins.length && (
          <p className="rounded-xl border border-dashed border-line p-5 text-center text-ui text-muted">
            {t("adm.prizeNoWins")}
          </p>
        )}

        {wins.map((w) => {
          const name = (lang === "en" ? w.nameEn : null) || w.name;
          const showing = openWin === w.id;
          const unread = !!w.claimedAt
            && (!w.seenAdmin || w.seenAdmin < (w.claimedAt ?? ""));
          const state = w.deliveredAt ? "done" : w.claimedAt ? "claimed" : "won";
          return (
            <div key={w.id} id={`win-${w.id}`}
                 className={`rounded-xl border p-3 ${
                   state === "claimed" ? "border-accent/50 bg-accent/5"
                     : state === "done" ? "border-line bg-surface opacity-70"
                       : "border-line bg-surface"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50">
                  {w.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.icon} alt="" className="size-10 object-contain" />
                    : <span className="text-lg">{w.gilAmount != null ? "💰" : "🎁"}</span>}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    {/* A wallet cashed out wears no tier: nobody got lucky
                        pressing a button on money they had already earned.
                        What it is worth takes the place of one. See v91.
                        And one that arrived on Aqua's card says so, because
                        that is what the winner saw. See v92. */}
                    {w.gilAmount == null && (w.fx !== "tier" ? (
                      <span className="rounded-md px-1.5 py-[2px] text-label font-extrabold leading-none"
                            style={{ background: `${WALLET_COLOR}26`, color: WALLET_COLOR }}>
                        💰 {t(FX_LABEL[w.fx])}
                      </span>
                    ) : <TierBadge tier={w.tier} small />)}
                    <span className="text-lead font-semibold text-ink">
                      {names[w.winner] ?? "—"}
                    </span>
                    <span className={w.gilAmount != null ? "font-data text-read font-semibold" : "text-read"}
                          style={{ color: w.color }}>
                      {w.gilAmount != null ? `${fmtGil(w.gilAmount)} gil` : name}
                    </span>
                    {unread && <span className="size-2 rounded-full bg-chili" />}
                  </span>
                  <span className="text-meta text-muted">
                    {t("prize.wonOn", { when: fmtDate(w.at) })}
                    {w.claimedAt && ` · ${t("adm.prizeClaimedAt", { when: fmtDateTime(w.claimedAt) })}`}
                    {w.deliveredAt && ` · ${t("adm.prizeDeliveredAt", { when: fmtDate(w.deliveredAt) })}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button"
                          onClick={() => {
                            setOpenWin(showing ? null : w.id);
                            // The chat marks it read on the way in; this is the
                            // same fact on the screen, without the round trip
                            // a dot that stays lit looks like a failure.
                            if (!showing) {
                              const now = new Date().toISOString();
                              setWins((v) => v.map((x) =>
                                (x.id === w.id ? { ...x, seenAdmin: now } : x)));
                            }
                          }}
                          className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
                    {showing ? t("prize.hideChat") : t("prize.openChat")}
                  </button>
                  {!w.deliveredAt && (
                    <button type="button" disabled={busy}
                            onClick={() => setConfirm({
                              text: t("adm.prizeDeliverAsk",
                                { name, who: names[w.winner] ?? "—" }),
                              label: t("adm.prizeDeliver"),
                              run: () => void handOver(w),
                            })}
                            className="rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-ui font-medium text-jade hover:bg-jade/25 disabled:opacity-40">
                      {t("adm.prizeDeliver")}
                    </button>
                  )}
                </div>
              </div>
              {showing && me && (
                <div className="mt-3 border-t border-line pt-3">
                  <PrizeChat supabase={supabase} winId={w.id} me={me} winner={w.winner}
                             closed={!!w.deliveredAt}
                             nameOf={(id) => names[id] ?? null} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {err && <p className="text-read text-chili">{err}</p>}

      {asking && master && (
        <ConfirmDialog z={120} danger={master.on}
                       message={master.on ? t("adm.prizeOffAsk") : t("adm.prizeOnAsk")}
                       confirmLabel={master.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
                       onCancel={() => setAsking(false)}
                       onConfirm={() => { setAsking(false); void flipMaster(); }} />
      )}

      {confirm && (
        <ConfirmDialog z={120} danger={!!confirm.danger}
                       message={confirm.text} confirmLabel={confirm.label}
                       onCancel={() => setConfirm(null)}
                       onConfirm={() => { const r = confirm.run; setConfirm(null); r(); }} />
      )}
    </div>
  );
}
