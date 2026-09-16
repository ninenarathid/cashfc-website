"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/dates";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * Whether a popoto can come up rare at all. See v79.
 *
 * Off until the keeper says otherwise, so the flavours and lines can all be
 * written before anybody can unwrap one. Asks before turning on, because on is
 * the moment the whole Free Company can start receiving them, and asks before
 * turning off too, because off stops a thing people may already be enjoying.
 */
export default function AdminRareSwitch(
  { ready }: {
    /** How many flavours can actually be received (active, with a line). */
    ready: number;
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
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const read = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("popoto_rare_switch")
      .select("enabled, changed_at, chance_pct").eq("id", 1).maybeSingle();
    if (error) { setErr(error.message); return; }
    const r = data as { enabled: boolean; changed_at: string; chance_pct?: number | string } | null;
    setOn(!!r?.enabled);
    setAt(r?.changed_at ?? null);
    // A database that has not had v83 run keeps the old fixed one in a hundred.
    const pct = r?.chance_pct == null ? 1 : Number(r.chance_pct);
    setChance(Number.isFinite(pct) ? pct : 1);
    setDraft(String(Number.isFinite(pct) ? pct : 1));
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

  const wanted = Number(draft.replace(",", "."));
  const okChance = draft.trim() !== "" && Number.isFinite(wanted) && wanted >= 0 && wanted <= 100;
  const changed = okChance && chance != null && wanted !== chance;

  const saveChance = async () => {
    if (!supabase || !changed || saving) return;
    setErr(null);
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("popoto_rare_switch")
      .update({ chance_pct: wanted, changed_at: new Date().toISOString(), changed_by: u.user?.id ?? null })
      .eq("id", 1);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    await read();
  };

  if (on == null && !err) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-3 ${
      on ? "border-jade/60 bg-jade/10" : "border-line bg-card"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-[16px] font-semibold ${on ? "text-jade" : "text-ink"}`}>
          {on ? t("adm.rareOn") : t("adm.rareOff")}
        </span>
        <span className="text-[13px] text-muted">
          {on ? t("adm.rareOnWhy", { pct: chance ?? "?" }) : t("adm.rareOffWhy")}
          {at && <> · {fmtDateTime(at)}</>}
        </span>
        {/* Turning on with nothing ready turns on a draw with nothing in it. */}
        {!on && ready === 0 && (
          <span className="text-[13px] text-gold">{t("adm.rareNothingReady")}</span>
        )}
      </div>
      <button type="button" onClick={() => setAsking(true)} disabled={on == null}
              className={`rounded-lg border px-4 py-2 text-[14.5px] font-medium disabled:opacity-40 ${
                on ? "border-chili/60 text-chili hover:bg-chili/10"
                   : "border-jade/60 bg-jade/15 text-jade hover:bg-jade/25"}`}>
        {on ? t("adm.rareTurnOff") : t("adm.rareTurnOn")}
      </button>
      {/* How often, beside whether. One in every so many popotos, said both
          ways: the percentage is what gets typed, and the count is what it
          actually means on an evening of giving. */}
      <div className="flex w-full flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="text-[13.5px] text-ink">{t("adm.rareChance")}</span>
        <input type="number" min={0} max={100} step={0.1} value={draft}
               onChange={(e) => setDraft(e.target.value)}
               className="w-24 rounded-lg border border-line bg-surface px-3 py-1.5 text-right text-[14px] text-ink" />
        <span className="text-[13.5px] text-muted">%</span>
        {okChance && wanted > 0 && (
          <span className="text-[12.5px] text-muted">
            {t("adm.rareChanceMeans", { n: Math.round(100 / wanted) })}
          </span>
        )}
        {okChance && wanted === 0 && (
          <span className="text-[12.5px] text-gold">{t("adm.rareChanceZero")}</span>
        )}
        {!okChance && <span className="text-[12.5px] text-chili">{t("adm.rareChanceBad")}</span>}
        <button type="button" onClick={() => void saveChance()} disabled={!changed || saving}
                className="ml-auto rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13.5px] text-accent hover:bg-accent/25 disabled:opacity-40">
          {t("adm.save")}
        </button>
      </div>
      {err && <p className="w-full text-[13px] text-chili">{err}</p>}

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
