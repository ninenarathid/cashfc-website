"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/dates";
import ConfirmDialog from "@/components/ConfirmDialog";
import { TIER_LOOK, type RareTier } from "@/lib/popoto-rare";

/** The three shares, as whole percentages of the rares that come out. */
export interface TierOdds { rare: number; super: number; ultra: number }

/** The split before v86, for a database that has not had it run. */
const OLD_ODDS: TierOdds = { rare: 70, super: 25, ultra: 5 };

const num = (s: string) => Number(s.replace(",", "."));
const okPct = (s: string) => {
  const n = num(s);
  return s.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
};

/**
 * Whether a popoto can come up rare at all, how often, and how good. See v79,
 * v83 and v86.
 *
 * Off until the keeper says otherwise, so the flavours and lines can all be
 * written before anybody can unwrap one. Asks before turning on, because on is
 * the moment the whole Free Company can start receiving them, and asks before
 * turning off too, because off stops a thing people may already be enjoying.
 *
 * The three numbers underneath are not asked about, because none of them
 * starts or stops anything — they take effect on the next popoto sent and are
 * as easy to type back.
 */
export default function AdminRareSwitch(
  { ready, onOdds }: {
    /** How many flavours can actually be received (active, with a line). */
    ready: number;
    /**
     * The tier split as it is in the database, for whoever draws the flavours
     * by tier. Called on every read, so it does not have to be stable.
     */
    onOdds?: (odds: TierOdds) => void;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [on, setOn] = useState<boolean | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** How often a popoto comes up rare, as a percentage. See v83. */
  const [chance, setChance] = useState<number | null>(null);
  /** Which tier it is when it does, as shares of a hundred. See v86. */
  const [odds, setOddsState] = useState<TierOdds>(OLD_ODDS);
  const [draft, setDraft] = useState("");
  const [draftSuper, setDraftSuper] = useState(String(OLD_ODDS.super));
  const [draftUltra, setDraftUltra] = useState(String(OLD_ODDS.ultra));
  const [saving, setSaving] = useState(false);

  // Held in a ref so a parent passing a fresh function each render cannot turn
  // reading the row into a loop.
  const report = useRef(onOdds);
  report.current = onOdds;

  const read = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("popoto_rare_switch")
      .select("enabled, changed_at, chance_pct, super_pct, ultra_pct").eq("id", 1).maybeSingle();
    if (error) { setErr(error.message); return; }
    const r = data as {
      enabled: boolean; changed_at: string; chance_pct?: number | string;
      super_pct?: number | string; ultra_pct?: number | string;
    } | null;
    setOn(!!r?.enabled);
    setAt(r?.changed_at ?? null);
    // A database that has not had v83 run keeps the old fixed one in a hundred,
    // and one without v86 the old fixed 70/25/5 — the same numbers the roll
    // itself falls back on, so the panel says what is actually happening.
    const one = (v: number | string | undefined, fallback: number) => {
      const n = v == null ? fallback : Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const pct = one(r?.chance_pct, 1);
    const sup = one(r?.super_pct, OLD_ODDS.super);
    const ult = one(r?.ultra_pct, OLD_ODDS.ultra);
    setChance(pct);
    setDraft(String(pct));
    const now = { rare: Math.max(0, 100 - sup - ult), super: sup, ultra: ult };
    setOddsState(now);
    setDraftSuper(String(sup));
    setDraftUltra(String(ult));
    report.current?.(now);
  }, [supabase]);
  useEffect(() => { void read(); }, [read]);

  const flip = async () => {
    if (!supabase || on == null) return;
    setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("popoto_rare_switch")
      .update({ enabled: !on, changed_at: new Date().toISOString(), changed_by: u.user?.id ?? null })
      .eq("id", 1);
    if (error) { setErr(error.message); return; }
    await read();
  };

  const wanted = num(draft);
  const wantSuper = num(draftSuper);
  const wantUltra = num(draftUltra);
  const okChance = okPct(draft);
  const okTiers = okPct(draftSuper) && okPct(draftUltra);
  const fits = okTiers && wantSuper + wantUltra <= 100;
  const ok = okChance && fits;
  const changed = ok && chance != null
    && (wanted !== chance || wantSuper !== odds.super || wantUltra !== odds.ultra);

  /** The rare share is whatever the other two have not taken. */
  const wantRare = fits ? Math.round((100 - wantSuper - wantUltra) * 100) / 100 : null;

  /**
   * A tier's share of a hundred, turned into the number a keeper can picture:
   * one popoto in so many arrives as this. Both halves have to be there for a
   * tier to ever come up, so either at zero is "never".
   */
  const every = (share: number | null): string => {
    if (share == null || share <= 0 || !okChance || wanted <= 0) return t("adm.rareNever");
    return t("adm.rareEvery", { n: Math.round(10000 / (wanted * share)).toLocaleString() });
  };

  const save = async () => {
    if (!supabase || !changed || saving) return;
    setErr(null);
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("popoto_rare_switch")
      .update({
        chance_pct: wanted, super_pct: wantSuper, ultra_pct: wantUltra,
        changed_at: new Date().toISOString(), changed_by: u.user?.id ?? null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    await read();
  };

  if (on == null && !err) return null;

  /**
   * One tier's share: the colour and letter it is known by, the number, and
   * what that number means in popotos. `edit` is null for rare, which is not
   * typed in but worked out from the other two.
   */
  const tierBox = (
    tier: RareTier, edit: { value: string; set: (v: string) => void } | null,
  ) => {
    const look = TIER_LOOK[tier];
    const share = edit ? (okPct(edit.value) ? num(edit.value) : null) : wantRare;
    return (
      <div key={tier} className="flex min-w-[8.5rem] flex-1 flex-col gap-1 rounded-lg border p-2"
           style={{ borderColor: `${look.color}55`, background: `${look.color}0f` }}>
        <div className="flex items-center gap-2">
          <span className="text-lead font-bold" style={{ color: look.color }}>{look.short}</span>
          {edit ? (
            <input type="number" min={0} max={100} step={1} value={edit.value}
                   onChange={(e) => edit.set(e.target.value)}
                   className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-right text-lead text-ink" />
          ) : (
            <span className="w-16 px-2 py-1 text-right text-lead text-ink">{share ?? "—"}</span>
          )}
          <span className="text-read text-muted">%</span>
        </div>
        <span className="text-ui text-muted">
          {edit ? every(share) : `${t("adm.rareTiersRest")} · ${every(share)}`}
        </span>
      </div>
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-3 ${
      on ? "border-jade/60 bg-jade/10" : "border-line bg-card"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-head font-semibold ${on ? "text-jade" : "text-ink"}`}>
          {on ? t("adm.rareOn") : t("adm.rareOff")}
        </span>
        <span className="text-read text-muted">
          {on ? t("adm.rareOnWhy", { pct: chance ?? "?" }) : t("adm.rareOffWhy")}
          {at && <> · {fmtDateTime(at)}</>}
        </span>
        {/* Turning on with nothing ready turns on a draw with nothing in it. */}
        {!on && ready === 0 && (
          <span className="text-read text-gold">{t("adm.rareNothingReady")}</span>
        )}
      </div>
      <button type="button" onClick={() => setAsking(true)} disabled={on == null}
              className={`rounded-lg border px-4 py-2 text-lead font-medium disabled:opacity-40 ${
                on ? "border-chili/60 text-chili hover:bg-chili/10"
                   : "border-jade/60 bg-jade/15 text-jade hover:bg-jade/25"}`}>
        {on ? t("adm.rareTurnOff") : t("adm.rareTurnOn")}
      </button>
      {/* How often, beside whether. One in every so many popotos, said both
          ways: the percentage is what gets typed, and the count is what it
          actually means on an evening of giving. */}
      <div className="flex w-full flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="text-read text-ink">{t("adm.rareChance")}</span>
        <input type="number" min={0} max={100} step={0.1} value={draft}
               onChange={(e) => setDraft(e.target.value)}
               className="w-24 rounded-lg border border-line bg-surface px-3 py-1.5 text-right text-lead text-ink" />
        <span className="text-read text-muted">%</span>
        {okChance && wanted > 0 && (
          <span className="text-ui text-muted">
            {t("adm.rareChanceMeans", { n: Math.round(100 / wanted) })}
          </span>
        )}
        {okChance && wanted === 0 && (
          <span className="text-ui text-gold">{t("adm.rareChanceZero")}</span>
        )}
        {!okChance && <span className="text-ui text-chili">{t("adm.rareChanceBad")}</span>}
      </div>
      {/* And which tier it is when it is one. Two boxes for three tiers: rare
          is the remainder, which is the only way the three cannot be made to
          add up to something other than a hundred. Each says how often it
          lands in whole popotos, because a share of a share of a percent is
          not a number anybody can feel. */}
      <div className="flex w-full flex-col gap-2 border-t border-line pt-3">
        <span className="text-read text-ink">{t("adm.rareTiers")}</span>
        <div className="flex flex-wrap items-stretch gap-2">
          {tierBox("rare", null)}
          {tierBox("super", { value: draftSuper, set: setDraftSuper })}
          {tierBox("ultra", { value: draftUltra, set: setDraftUltra })}
        </div>
        {!okTiers && <span className="text-ui text-chili">{t("adm.rareChanceBad")}</span>}
        {okTiers && !fits && <span className="text-ui text-chili">{t("adm.rareTiersSum")}</span>}
      </div>
      <div className="flex w-full items-center justify-end">
        <button type="button" onClick={() => void save()} disabled={!changed || saving}
                className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-40">
          {t("adm.save")}
        </button>
      </div>
      {err && <p className="w-full text-read text-chili">{err}</p>}

      {asking && (
        <ConfirmDialog z={120} danger={!!on}
                       message={on ? t("adm.rareOffAsk") : t("adm.rareOnAsk", { n: ready })}
                       confirmLabel={on ? t("adm.rareTurnOff") : t("adm.rareTurnOn")}
                       onCancel={() => setAsking(false)}
                       onConfirm={() => { setAsking(false); void flip(); }} />
      )}
    </div>
  );
}
