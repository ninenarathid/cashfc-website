"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang, type Key } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import { fmtGil, saveWalletSwitch, type WalletSwitch } from "@/lib/wallet";
import { flipSwitch, oneIn, stockFits, type PrizeDraw, type PrizeSwitch } from "@/lib/prizes";
import { forecast, type CupboardPrize } from "@/lib/aqua";

/**
 * The part of Aqua's page that changes things: the two switches, the bar a
 * wallet is cashed out at, and the chance and size of every prize.
 *
 * Built for changing a number and seeing what it costs before saving it. The
 * forecast at the top is worked out from what the cupboard actually paid last
 * week (see forecast in lib/aqua.ts), so it moves as a chance is typed and
 * says what a day will cost afterwards next to what it costs now.
 *
 * Everything else about a prize (its name, picture, tier, who can win it) is
 * still the prize tab's, which has the whole form for it.
 */

const GOLD = "#d9a441";

const SIDE: Record<string, Key> = {
  anyone: "adm.prizeSideAnyone",
  fc: "adm.prizeSideFc",
  fc_verified: "adm.prizeSideFcVerified",
};

/** What Aqua has typed over a prize, before it is saved. */
interface Edit { chance?: string; gil?: string; stock?: string; active?: boolean }

const num = (s: string | undefined) => (s == null || s.trim() === "" ? null : Number(s));

export default function AquaControls(
  { supabase, cupboard, master, purse, rolls, actualPerDay, onSaved }: {
    supabase: SupabaseClient;
    cupboard: CupboardPrize[];
    master: PrizeSwitch | null;
    purse: WalletSwitch | null;
    rolls: Record<string, number>;
    /** What a finished day actually cost, on average, for comparison. */
    actualPerDay: number;
    onSaved: () => Promise<void> | void;
  },
) {
  const { t } = useLang();
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [bar, setBar] = useState<string>(purse ? String(purse.threshold) : "");
  const [asking, setAsking] = useState<null | "master" | "purse" | "prizes">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  /** The cupboard as it would be if what is typed were saved. */
  const draft = useMemo(() => cupboard.map((p): CupboardPrize => {
    const e = edits[p.id];
    if (!e) return p;
    const chance = num(e.chance);
    const gil = num(e.gil);
    return {
      ...p,
      chance: chance != null && Number.isFinite(chance) ? chance : p.chance,
      gil: p.kind === "gil" && gil != null && Number.isFinite(gil) ? gil : p.gil,
      stock: e.stock === undefined ? p.stock : e.stock.trim() === "" ? null : Number(e.stock),
      active: e.active ?? p.active,
    };
  }), [cupboard, edits]);

  const walletOn = !!purse?.on;
  const now = useMemo(() => forecast(cupboard, rolls, walletOn), [cupboard, rolls, walletOn]);
  const next = useMemo(() => forecast(draft, rolls, walletOn), [draft, rolls, walletOn]);
  const changed = cupboard.filter((p, i) => {
    const d = draft[i];
    return d.chance !== p.chance || d.gil !== p.gil || d.stock !== p.stock || d.active !== p.active;
  });

  /** What is wrong with a row as typed, or null. Checked before anything is sent. */
  const problem = (p: CupboardPrize, d: CupboardPrize): string | null => {
    if (!(d.chance >= 0 && d.chance <= 100)) return t("aqua.badChance");
    if (p.kind === "gil" && !(Number.isInteger(d.gil) && (d.gil ?? 0) > 0)) return t("aqua.badGil");
    if (d.stock != null && !(Number.isInteger(d.stock) && d.stock >= 0)) return t("aqua.badStock");
    if (!stockFits(p.draw as PrizeDraw, d.stock)) return t("adm.prizeStockEven");
    return null;
  };
  const problems = cupboard.map((p, i) => problem(p, draft[i]));
  const blocked = problems.some((x) => x != null);

  const set = (id: number, patch: Edit) =>
    setEdits((all) => ({ ...all, [id]: { ...all[id], ...patch } }));

  const oftenText = (perDay: number | null) => {
    if (perDay == null) return "—";
    if (perDay <= 0) return "—";
    if (perDay >= 1) return t("aqua.fPerDay", { n: perDay >= 10 ? Math.round(perDay) : Math.round(perDay * 10) / 10 });
    return t("aqua.fEvery", { n: Math.max(1, Math.round(1 / perDay)) });
  };

  const run = async (what: () => Promise<{ error?: string }>, ok: string) => {
    setBusy(true); setErr(null); setDone(null);
    const r = await what();
    setBusy(false);
    if (r.error) { setErr(r.error); return false; }
    setDone(ok);
    await onSaved();
    return true;
  };

  const me = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const flipMaster = () => master && run(
    async () => flipSwitch(supabase, !master.on, await me()), t("adm.saved"));

  const savePurse = (on: boolean) => {
    const threshold = Math.round(Number(bar));
    if (!(threshold > 0)) { setErr(t("aqua.badBar")); return; }
    return run(async () => saveWalletSwitch(supabase, { on, threshold }, await me()), t("adm.saved"));
  };

  const savePrizes = () => run(async () => {
    for (const p of changed) {
      const d = draft[cupboard.indexOf(p)];
      const { error } = await supabase.from("prizes").update({
        chance_pct: Math.round(d.chance * 1000) / 1000,
        active: d.active,
        stock: d.stock,
        ...(p.kind === "gil" ? { gil_amount: d.gil } : {}),
      }).eq("id", p.id);
      if (error) return { error: `${p.name}: ${error.message}` };
    }
    setEdits({});
    return {};
  }, t("aqua.savedPrizes", { n: changed.length }));

  const delta = now.gilPerDay > 0 ? (next.gilPerDay - now.gilPerDay) / now.gilPerDay : 0;
  const barChanged = purse != null && Number(bar) !== purse.threshold;

  const cell = (on: boolean) =>
    `w-full rounded-md border bg-bg px-2 py-1 text-right text-ui tabular-nums text-ink outline-none focus:border-accent ${
      on ? "border-gold" : "border-line"}`;

  const table = (kind: "gil" | "item") => {
    const list = cupboard.map((p, i) => ({ p, d: draft[i], f: next.prizes[i], bad: problems[i] }))
      .filter((x) => x.p.kind === kind);
    if (!list.length) return null;
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-ui">
          <thead>
            <tr className="text-left text-meta text-muted">
              <th className="py-1.5 pr-2 font-normal">{t("aqua.colOn")}</th>
              <th className="py-1.5 pr-2 font-normal">{t("aqua.colPrize")}</th>
              {kind === "gil" && <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colAmount")}</th>}
              <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colChance")}</th>
              {kind === "item" && <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colStock")}</th>}
              <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colOften")}</th>
              {kind === "gil" && <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colCost")}</th>}
              <th className="py-1.5 font-normal">{t("aqua.colSide")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ p, d, f, bad }) => {
              const e = edits[p.id] ?? {};
              const n = oneIn(d.chance);
              return (
                <tr key={p.id} className={`border-t border-line/60 align-middle ${d.active ? "" : "opacity-60"}`}>
                  <td className="py-2 pr-2">
                    <button type="button" role="switch" aria-checked={d.active}
                            aria-label={p.name}
                            onClick={() => set(p.id, { active: !d.active })}
                            className={`relative h-5 w-9 rounded-full transition-colors ${
                              d.active ? "bg-jade" : "bg-line"} ${
                              d.active !== p.active ? "ring-2 ring-gold ring-offset-1 ring-offset-card" : ""}`}>
                      <span className={`absolute top-0.5 size-4 rounded-full bg-ink transition-[left] ${
                        d.active ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-ink">
                      {p.name}
                      {d.stock === 0 && (
                        <span className="rounded bg-line/70 px-1.5 text-label font-semibold text-muted">
                          {t("aqua.soldOut")}
                        </span>
                      )}
                    </div>
                    {bad && <div className="text-meta text-chili">{bad}</div>}
                  </td>
                  {kind === "gil" && (
                    <td className="w-28 py-2 pr-2">
                      <input type="number" inputMode="numeric" min={1} step={10}
                             aria-label={`${p.name} · ${t("aqua.colAmount")}`}
                             value={e.gil ?? String(p.gil ?? "")}
                             onChange={(ev) => set(p.id, { gil: ev.target.value })}
                             className={cell(d.gil !== p.gil)} />
                    </td>
                  )}
                  <td className="w-28 py-2 pr-2">
                    <input type="number" inputMode="decimal" min={0} max={100} step={0.001}
                           aria-label={`${p.name} · ${t("aqua.colChance")}`}
                           value={e.chance ?? String(p.chance)}
                           onChange={(ev) => set(p.id, { chance: ev.target.value })}
                           className={cell(d.chance !== p.chance)} />
                    <div className="mt-0.5 text-right text-label text-muted">
                      {n ? t("adm.prizeChanceMeans", { n: n.toLocaleString("en-US") }) : "—"}
                    </div>
                  </td>
                  {kind === "item" && (
                    <td className="w-24 py-2 pr-2">
                      <input type="number" inputMode="numeric" min={0} step={1}
                             aria-label={`${p.name} · ${t("aqua.colStock")}`}
                             placeholder={t("adm.prizeStockAny")}
                             value={e.stock ?? (p.stock == null ? "" : String(p.stock))}
                             onChange={(ev) => set(p.id, { stock: ev.target.value })}
                             className={cell(d.stock !== p.stock)} />
                    </td>
                  )}
                  <td className="py-2 pr-2 text-right tabular-nums text-muted">{oftenText(f.perDay)}</td>
                  {kind === "gil" && (
                    <td className="py-2 pr-2 text-right tabular-nums text-ink">
                      {f.gilPerDay == null ? "—" : fmtGil(f.gilPerDay)}
                    </td>
                  )}
                  <td className="py-2 text-meta text-muted">{t(SIDE[p.otherSide] ?? "adm.prizeSideAnyone")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const switchCard = (
    { on, title, why, action, extra }: {
      on: boolean; title: string; why: string; action: () => void; extra?: ReactNode;
    },
  ) => (
    <div className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${
      on ? "border-jade/60 bg-jade/10" : "border-line bg-bg/40"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className={`text-read font-semibold ${on ? "text-jade" : "text-ink"}`}>{title}</div>
          <div className="mt-0.5 text-meta leading-relaxed text-muted">{why}</div>
        </div>
        <button type="button" disabled={busy} onClick={action}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-ui font-medium disabled:opacity-40 ${
                  on ? "border-chili/60 text-chili hover:bg-chili/10"
                     : "border-jade/60 bg-jade/15 text-jade hover:bg-jade/25"}`}>
          {on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
        </button>
      </div>
      {extra}
    </div>
  );

  return (
    <section className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
      <h2 className="font-display text-title font-semibold">{t("aqua.cTitle")}</h2>
      <p className="mt-0.5 max-w-prose text-meta leading-relaxed text-muted">{t("aqua.cNote")}</p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {master ? switchCard({
          on: master.on,
          title: master.on ? t("adm.prizeSwitchOn") : t("adm.prizeSwitchOff"),
          why: master.on ? t("adm.prizeSwitchOnWhy") : t("adm.prizeSwitchOffWhy"),
          action: () => setAsking("master"),
        }) : <p className="text-ui text-chili">{t("adm.prizeSwitchMissing")}</p>}
        {purse ? switchCard({
          on: purse.on,
          title: purse.on ? t("adm.walletOn") : t("adm.walletOff"),
          why: purse.on ? t("adm.walletOnWhy") : t("adm.walletOffWhy"),
          action: () => setAsking("purse"),
          extra: (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-meta text-muted">
                {t("adm.walletBar")}
                <input type="number" inputMode="numeric" min={1} step={1000} value={bar}
                       onChange={(e) => setBar(e.target.value)}
                       className={`w-36 ${cell(barChanged)}`} />
              </label>
              <button type="button" disabled={busy || !barChanged}
                      onClick={() => void savePurse(purse.on)}
                      className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25 disabled:opacity-40">
                {t("adm.save")}
              </button>
            </div>
          ),
        }) : <p className="text-ui text-gold">{t("adm.walletMissing")}</p>}
      </div>

      {/* ── What a day costs, as set and as typed ─────────────────────── */}
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl border p-4"
           style={{ borderColor: `${GOLD}55`,
                    background: `linear-gradient(160deg, color-mix(in oklab, ${GOLD} 9%, var(--color-card)), var(--color-card))` }}>
        <div>
          <div className="text-meta text-muted">{changed.length ? t("aqua.fIfSaved") : t("aqua.fNow")}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-data text-[34px] font-bold leading-none text-gold">{fmtGil(next.gilPerDay)}</span>
            <span className="text-ui text-muted">{t("aqua.fGilDay")}</span>
            {changed.length > 0 && Math.abs(delta) >= 0.005 && (
              <span className={`rounded-full px-2 py-0.5 text-meta font-semibold ${
                delta > 0 ? "bg-chili/15 text-chili" : "bg-jade/15 text-jade"}`}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 1000) / 10)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-meta text-muted">
          {changed.length > 0 && <span>{t("aqua.fWas", { gil: fmtGil(now.gilPerDay) })}</span>}
          <span>{t("aqua.fActual", { gil: fmtGil(actualPerDay) })}</span>
          <span>{t("aqua.fChance", { pct: Math.round(next.chance * 1000) / 1000 })}</span>
        </div>
        {next.chance > 100 && <p className="w-full text-ui text-chili">{t("aqua.fOver")}</p>}
        {next.unknown > 0 && <p className="w-full text-meta text-muted">{t("aqua.fUnknown", { n: next.unknown })}</p>}
      </div>

      <h3 className="mt-5 font-display text-read font-semibold">{t("aqua.gilPrizes")}</h3>
      {table("gil")}
      <h3 className="mt-5 font-display text-read font-semibold">{t("aqua.itemPrizes")}</h3>
      <p className="text-meta text-muted">{t("aqua.itemPrizesNote")}</p>
      {table("item")}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !changed.length || blocked}
                onClick={() => setAsking("prizes")}
                className="rounded-lg border border-gold bg-gold/15 px-4 py-2 text-read font-semibold text-gold hover:bg-gold/25 disabled:opacity-40">
          {changed.length ? t("aqua.saveN", { n: changed.length }) : t("adm.save")}
        </button>
        {changed.length > 0 && (
          <button type="button" disabled={busy} onClick={() => setEdits({})}
                  className="rounded-lg border border-line px-3 py-2 text-ui text-muted hover:text-ink">
            {t("aqua.undo")}
          </button>
        )}
        <Link href="/admin#prizes" className="ml-auto text-ui text-accent no-underline hover:underline">
          {t("aqua.fullEditor")}
        </Link>
      </div>
      {err && <p className="mt-2 text-ui text-chili">{err}</p>}
      {done && !err && <p className="mt-2 text-ui text-jade">{done}</p>}

      {asking === "master" && master && (
        <ConfirmDialog z={120} danger={master.on}
                       message={master.on ? t("adm.prizeOffAsk") : t("adm.prizeOnAsk")}
                       confirmLabel={master.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
                       onCancel={() => setAsking(null)}
                       onConfirm={() => { setAsking(null); void flipMaster(); }} />
      )}
      {asking === "purse" && purse && (
        <ConfirmDialog z={120} danger={purse.on}
                       message={purse.on ? t("adm.walletOffAsk") : t("adm.walletOnAsk")}
                       confirmLabel={purse.on ? t("adm.prizeTurnOff") : t("adm.prizeTurnOn")}
                       onCancel={() => setAsking(null)}
                       onConfirm={() => { setAsking(null); void savePurse(!purse.on); }} />
      )}
      {asking === "prizes" && (
        <ConfirmDialog z={120}
                       message={t("aqua.saveAsk", {
                         n: changed.length, from: fmtGil(now.gilPerDay), to: fmtGil(next.gilPerDay) })}
                       confirmLabel={t("adm.save")}
                       onCancel={() => setAsking(null)}
                       onConfirm={() => { setAsking(null); void savePrizes(); }} />
      )}
    </section>
  );
}

