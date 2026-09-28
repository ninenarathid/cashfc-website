"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import PrizeChat from "@/components/PrizeChat";
import { deliver } from "@/lib/prizes";
import { fmtGil } from "@/lib/wallet";
import type { AquaQueueGroup, AquaQueueItem } from "@/lib/aqua";

/**
 * Who is waiting for Aqua, one person to a row.
 *
 * By person rather than by prize, because the job is a meeting and not a
 * prize: somebody holding eight wins is met once and handed all eight, and a
 * list that spread them over eight rows made that one meeting look like
 * eight chores. Each prize still has its own thread and its own handover
 * (PrizeChat, deliver_prize, the same as the prize tab), so the winner hears
 * about every one the way they always have; "all of them" is just those
 * handovers one after another.
 *
 * The person waiting longest comes first, and anything past three days is
 * marked, because a queue is only fair if its oldest end is the one seen.
 */
export default function AquaQueue(
  { supabase, me, groups, count, unclaimed, names, onChanged }: {
    supabase: SupabaseClient;
    me: string | null;
    groups: AquaQueueGroup[];
    /** Every waiting prize, across all the groups. */
    count: number;
    unclaimed: number;
    names: Record<string, string>;
    onChanged: () => Promise<void> | void;
  },
) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  const [asking, setAsking] = useState<{ who: string; items: AquaQueueItem[]; gil: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const what = (q: AquaQueueItem) =>
    q.gil != null ? `${fmtGil(q.gil)} gil` : (lang === "en" && q.prizeEn ? q.prizeEn : q.prize);
  const waitedText = (n: number) => (n === 0 ? t("aqua.qToday") : t("aqua.qWaited", { n }));

  const handOver = async (items: AquaQueueItem[]) => {
    setBusy(true); setErr(null);
    for (const q of items) {
      const r = await deliver(supabase, q.id);
      // Stop at the first that fails rather than carrying on past it: the ones
      // before it are done, and the reason is worth reading before the rest.
      if (r.error) { setErr(`${what(q)}: ${r.error}`); break; }
    }
    setBusy(false);
    setOpen(null);
    await onChanged();
  };

  return (
    <section className="rounded-xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-title font-semibold">{t("aqua.qTitle")}</h2>
        {count > 0 && (
          <span className="rounded-full bg-gold/15 px-2 font-data text-meta font-bold text-gold">{count}</span>
        )}
      </div>
      <p className="mt-0.5 text-meta text-muted">{t("aqua.qNote")}</p>

      {groups.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
          {t("aqua.qEmpty")}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {groups.map((g) => (
            <li key={g.winner} className="border-t border-line/60 py-3 first:border-t-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-read font-semibold text-ink">{g.who}</span>
                <span className="text-meta text-muted">{t("aqua.gItems", { n: g.items.length })}</span>
                {g.gil > 0 && (
                  <span className="text-ui font-semibold tabular-nums text-gold">{fmtGil(g.gil)} gil</span>
                )}
                <span className={`text-meta ${g.waited >= 3 ? "font-semibold text-gold" : "text-muted"}`}>
                  · {waitedText(g.waited)}
                </span>
                {g.items.length > 1 && (
                  <button type="button" disabled={busy}
                          onClick={() => setAsking({ who: g.who, items: g.items, gil: g.gil })}
                          className="ml-auto rounded-md border border-jade/60 bg-jade/15 px-2.5 py-1 text-ui font-semibold text-jade hover:bg-jade/25 disabled:opacity-40">
                    {t("aqua.deliverAll", { n: g.items.length })}
                  </button>
                )}
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {g.items.map((q) => (
                  <li key={q.id}>
                    <div className="flex items-center gap-2 rounded-lg bg-bg/50 px-2.5 py-1.5">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-label font-semibold ${
                        q.gil != null ? "bg-gold/15 text-gold" : "bg-jade/15 text-jade"}`}>
                        {q.gil != null ? t("aqua.qCash") : t("aqua.qItem")}
                      </span>
                      <span className="min-w-0 flex-1 text-ui text-ink/90">{what(q)}</span>
                      {g.items.length > 1 && (
                        <span className="hidden shrink-0 text-label text-muted sm:inline">{waitedText(q.waited)}</span>
                      )}
                      <button type="button" onClick={() => setOpen(open === q.id ? null : q.id)}
                              aria-expanded={open === q.id}
                              className={`shrink-0 rounded-md border px-2 py-0.5 text-ui ${
                                open === q.id ? "border-accent text-accent" : "border-line text-muted hover:text-ink"}`}>
                        {t("aqua.qTalk")}
                      </button>
                      <button type="button" disabled={busy}
                              onClick={() => setAsking({ who: g.who, items: [q], gil: q.gil ?? q.worth ?? 0 })}
                              className="shrink-0 rounded-md border border-jade/60 px-2 py-0.5 text-ui text-jade hover:bg-jade/15 disabled:opacity-40">
                        {t("adm.prizeDeliver")}
                      </button>
                    </div>
                    {open === q.id && me && (
                      <div className="mt-1.5 rounded-lg border border-line bg-bg/40 p-2">
                        <PrizeChat supabase={supabase} winId={q.id} me={me} winner={q.winner}
                                   closed={false} nameOf={(id) => names[id] ?? null} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {unclaimed > 0 && (
        <p className="mt-2 text-meta text-muted">{t("aqua.qUnclaimed", { n: unclaimed })}</p>
      )}
      {err && <p className="mt-2 text-ui text-chili">{err}</p>}

      {asking && (
        <ConfirmDialog z={120}
                       message={asking.items.length === 1
                         ? t("adm.prizeDeliverAsk", { name: what(asking.items[0]), who: asking.who })
                         : t("aqua.deliverAllAsk", {
                           n: asking.items.length, who: asking.who, gil: fmtGil(asking.gil) })}
                       confirmLabel={asking.items.length === 1
                         ? t("adm.prizeDeliver") : t("aqua.deliverAll", { n: asking.items.length })}
                       onCancel={() => setAsking(null)}
                       onConfirm={() => { const a = asking; setAsking(null); void handOver(a.items); }} />
      )}
    </section>
  );
}
