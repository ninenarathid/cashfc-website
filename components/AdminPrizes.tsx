"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImagePicker from "@/components/ImagePicker";
import PrizeChat from "@/components/PrizeChat";
import fcIds from "@/data/fc-ids.json";
import {
  AUDIENCES, DRAWS, PRIZE_COLOR, allPrizes, allWins, deliver, oneIn, syncRoster,
  type Prize, type PrizeAudience, type PrizeDraw, type Win,
} from "@/lib/prizes";

const inputCls =
  "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

/** Everything the form edits. Stock is text, because empty means unlimited. */
interface Draft {
  name: string;
  nameEn: string;
  detail: string;
  detailEn: string;
  icon: string | null;
  color: string;
  chance: string;
  draw: PrizeDraw;
  audience: PrizeAudience;
  stock: string;
}

const EMPTY: Draft = {
  name: "", nameEn: "", detail: "", detailEn: "", icon: null, color: PRIZE_COLOR,
  chance: "1", draw: "receive", audience: "fc", stock: "",
};

const num = (s: string) => Number(s.replace(",", "."));

/** The two choices, in words. Spelled out rather than built from the value:
 *  a key made by interpolation is a key no tool can find. */
const DRAW_LABEL: Record<PrizeDraw, Key> = {
  receive: "adm.prizeDrawReceive",
  give: "adm.prizeDrawGive",
  daily: "adm.prizeDrawDaily",
};
const DRAW_WHY: Record<PrizeDraw, Key> = {
  receive: "adm.prizeDrawReceiveWhy",
  give: "adm.prizeDrawGiveWhy",
  daily: "adm.prizeDrawDailyWhy",
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
export default function AdminPrizes() {
  const { t, lang } = useLang();
  const supabase = useMemo(() => createClient(), []);

  const [me, setMe] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  /** How many characters the database has as the FC. undefined until asked. */
  const [roster, setRoster] = useState<number | null | undefined>(undefined);
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

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [p, w] = await Promise.all([allPrizes(supabase), allWins(supabase)]);
    setPrizes(p);
    setWins(w);
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
      name: p.name, nameEn: p.nameEn ?? "", detail: p.detail ?? "",
      detailEn: p.detailEn ?? "", icon: p.icon, color: p.color,
      chance: String(p.chance), draw: p.draw, audience: p.audience,
      stock: p.stock == null ? "" : String(p.stock),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chance = num(d.chance);
  const stock = d.stock.trim() === "" ? null : Math.floor(num(d.stock));
  const okChance = d.chance.trim() !== "" && Number.isFinite(chance)
    && chance >= 0 && chance <= 100;
  const okStock = stock === null || (Number.isFinite(stock) && stock >= 0);
  const okName = d.name.trim().length > 0 && d.name.trim().length <= 60;
  const ok = okName && okChance && okStock;

  const save = async () => {
    if (!supabase || !ok || busy) return;
    setBusy(true);
    setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const row = {
      name: d.name.trim(),
      name_en: d.nameEn.trim() || null,
      detail: d.detail.trim() || null,
      detail_en: d.detailEn.trim() || null,
      icon_url: d.icon,
      color: d.color,
      chance_pct: chance,
      draw: d.draw,
      audience: d.audience,
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
   * What each group of prizes adds up to.
   *
   * The roll lays them end to end on one number, so the total is how often
   * anything is won from that group — and anything past a hundred is a prize
   * that can never come up, which is worth saying rather than leaving to be
   * discovered by nobody ever winning it.
   */
  const totals = useMemo(() => {
    const out = {} as Record<PrizeDraw, number>;
    for (const k of DRAWS) {
      out[k] = prizes.filter((p) => p.active && p.draw === k)
        .reduce((n, p) => n + p.chance, 0);
    }
    return out;
  }, [prizes]);

  const waiting = wins.filter((w) => !w.deliveredAt).length;

  if (!supabase) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── What can be won ─────────────────────────────────────────────── */}
      <p className="max-w-prose text-ui leading-relaxed text-muted">
        {t("adm.prizesWhy")}
      </p>
      {(roster === 0 || roster === null) && (
        <p className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-ui text-gold">
          {t("adm.prizeNoRoster")}
        </p>
      )}

      <div ref={formRef} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3">
        <div className="font-display font-semibold">
          {editing ? t("adm.prizeEditing") : t("adm.prizeNew")}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })}
                 placeholder={t("adm.prizeName")} className={inputCls} />
          <input value={d.nameEn} onChange={(e) => setD({ ...d, nameEn: e.target.value })}
                 placeholder={t("adm.prizeNameEn")} className={inputCls} />
          <input value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })}
                 placeholder={t("adm.prizeDetail")} className={inputCls} />
          <input value={d.detailEn} onChange={(e) => setD({ ...d, detailEn: e.target.value })}
                 placeholder={t("adm.prizeDetailEn")} className={inputCls} />
        </div>

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

          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeStock")}</span>
            <input type="number" min={0} step={1} value={d.stock}
                   onChange={(e) => setD({ ...d, stock: e.target.value })}
                   placeholder={t("adm.prizeStockAny")}
                   className={`${inputCls} w-32 text-right`} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ui text-muted">{t("adm.prizeColor")}</span>
            <input type="color" value={d.color}
                   onChange={(e) => setD({ ...d, color: e.target.value })}
                   className="h-10 w-16 rounded-lg border border-line bg-card" />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-ui text-muted">{t("adm.prizeIcon")}</span>
          <ImagePicker supabase={supabase} value={d.icon}
                       onChange={(url) => setD({ ...d, icon: url })} />
        </div>

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
      {DRAWS.map((k) => {
        const inDraw = prizes.filter((p) => p.draw === k);
        if (!inDraw.length) return null;
        const total = totals[k];
        return (
          <section key={k} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display font-semibold">
                {t(DRAW_LABEL[k])}
              </span>
              <span className={`text-ui ${total > 100 ? "text-chili" : "text-muted"}`}>
                {t("adm.prizeTotal", { pct: Math.round(total * 1000) / 1000 })}
                {total > 100 && ` · ${t("adm.prizeOverflow")}`}
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
                         p.active && !out ? "" : "opacity-55"}`}
                       style={{ borderColor: `${p.color}66`, background: `${p.color}0d` }}>
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50">
                      {p.icon
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.icon} alt="" className="size-11 object-contain" />
                        : <span className="text-xl">🎁</span>}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-lead font-semibold" style={{ color: p.color }}>
                        {name}
                      </span>
                      {detail && <span className="text-ui text-ink/75">{detail}</span>}
                      <span className="flex flex-wrap gap-x-2 text-meta text-muted">
                        <span>{p.chance}%</span>
                        {oneIn(p.chance) != null && (
                          <span>· {t("adm.prizeChanceMeans",
                            { n: (oneIn(p.chance) ?? 0).toLocaleString() })}</span>
                        )}
                        <span>· {t(AUDIENCE_LABEL[p.audience])}</span>
                        <span>· {p.stock == null
                          ? t("adm.prizeStockAny")
                          : t("adm.prizeLeft", { n: p.stock })}</span>
                        {!p.active && <span>· {t("adm.prizeOff")}</span>}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
            <div key={w.id}
                 className={`rounded-xl border p-3 ${
                   state === "claimed" ? "border-accent/50 bg-accent/5"
                     : state === "done" ? "border-line bg-surface opacity-70"
                       : "border-line bg-surface"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50">
                  {w.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.icon} alt="" className="size-10 object-contain" />
                    : <span className="text-lg">🎁</span>}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lead font-semibold text-ink">
                      {names[w.winner] ?? "—"}
                    </span>
                    <span className="text-read" style={{ color: w.color }}>{name}</span>
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

      {confirm && (
        <ConfirmDialog z={120} danger={!!confirm.danger}
                       message={confirm.text} confirmLabel={confirm.label}
                       onCancel={() => setConfirm(null)}
                       onConfirm={() => { const r = confirm.run; setConfirm(null); r(); }} />
      )}
    </div>
  );
}
