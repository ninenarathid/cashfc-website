"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";
import { fmtDateTime } from "@/lib/dates";

interface Option { key: string; th: string; en: string }
interface Voter { name: string; choice: string; voted_at: string }

interface Row {
  id: number;
  question: string;
  question_en: string | null;
  options: Option[];
  closes_at: string | null;
  closed: boolean;
  created_at: string;
}

/**
 * The polls, and the one button that matters: ending one.
 *
 * Writing a poll is not here. The first was seeded with the migration that made
 * the table, and a form for composing a question, its note and its options in
 * two languages is a lot of screen for something that has happened once — when
 * there is a second it can be built from what the second one turns out to need.
 * Closing, on the other hand, is needed the moment a poll exists.
 *
 * The totals are read through poll_tally, the same function the gallery card
 * uses. Who voted which way is a second, deliberate step: it is folded away
 * behind a summary somebody has to open, and the poll card tells members it
 * can be seen at all. It was going to be nobody's business, which is a fine
 * rule right up until you remember the SQL editor ignores row-level security —
 * a promise that only holds while nobody opens the right tab is not one worth
 * making, so it is made honestly instead.
 */
export default function AdminPoll() {
  const { t } = useLang();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [tally, setTally] = useState<Record<number, Record<string, number>>>({});
  const [voters, setVoters] = useState<Record<number, Voter[]>>({});
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState<{ text: string; run: () => void } | null>(null);

  const flash = (s: string) => { setMsg(s); setTimeout(() => setMsg(""), 2500); };

  const refresh = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("polls")
      .select("id, question, question_en, options, closes_at, closed, created_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Row[];
    setRows(list);
    const counts: Record<number, Record<string, number>> = {};
    await Promise.all(list.map(async (r) => {
      const { data: t } = await supabase.rpc("poll_tally", { p_poll: r.id });
      const one: Record<string, number> = {};
      for (const x of (t ?? []) as { choice: string; votes: number }[]) {
        one[x.choice] = Number(x.votes);
      }
      counts[r.id] = one;
    }));
    setTally(counts);
  };

  useEffect(() => { void refresh(); }, [supabase]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Only when an admin opens the summary. The names are not part of what the
  // screen shows by default, and not fetching them until then keeps that true
  // of the network as well as of the page.
  const showVoters = async (id: number) => {
    if (!supabase || voters[id]) return;
    const { data } = await supabase.rpc("poll_voters", { p_poll: id });
    setVoters((v) => ({ ...v, [id]: (data ?? []) as Voter[] }));
  };

  if (!supabase) return null;

  return (
    <div className="mt-1">
      <p className="text-[12.5px] leading-relaxed text-muted">
        {t("adm.pollHint")}
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">{t("adm.pollNone")}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((r) => {
            const counts = tally[r.id] ?? {};
            const total = Object.values(counts).reduce((n, v) => n + v, 0);
            const ended = r.closed
              || (!!r.closes_at && new Date(r.closes_at) <= new Date());
            return (
              <div key={r.id} className="rounded-xl border border-line bg-card p-3.5">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className={`text-[12px] ${ended ? "text-muted" : "text-jade"}`}>
                    {ended ? t("adm.pollEnded") : t("adm.pollOpen")}
                  </span>
                  {r.closes_at && (
                    <span className="text-[12px] text-muted">
                      {t("adm.pollCloses", { when: fmtDateTime(r.closes_at) })}
                    </span>
                  )}
                  <span className="text-[12px] text-muted">
                    {t("adm.pollVotes", { n: total })}
                  </span>
                  {!ended && (
                    <button
                      onClick={() => setAsk({
                        text: t("adm.pollConfirmClose"),
                        run: async () => {
                          await supabase.from("polls")
                            .update({ closed: true }).eq("id", r.id);
                          setAsk(null);
                          await refresh(); flash(t("adm.pollClosed"));
                        },
                      })}
                      className="ml-auto rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                      {t("adm.pollClose")}
                    </button>
                  )}
                </div>

                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
                  {r.question}
                </p>

                <div className="mt-2.5 flex flex-col gap-1.5">
                  {r.options.map((o) => {
                    const n = counts[o.key] ?? 0;
                    const pct = total ? Math.round((n / total) * 100) : 0;
                    return (
                      <div key={o.key}
                           className="relative overflow-hidden rounded-lg border border-line bg-surface px-3 py-1.5 text-[12.5px]">
                        <span aria-hidden style={{ width: `${pct}%` }}
                              className="absolute inset-y-0 left-0 bg-accent/15" />
                        <span className="relative flex items-baseline justify-between gap-3">
                          <span className="text-ink/90">{o.th}</span>
                          <span className="shrink-0 font-data text-muted">
                            {pct}% <span className="opacity-70">({n})</span>
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Folded, and it says what it holds before it is opened. */}
                <details className="mt-2.5" onToggle={() => void showVoters(r.id)}>
                  <summary className="cursor-pointer text-[12px] text-muted hover:text-ink">
                    {t("adm.pollWhoVoted")}
                  </summary>
                  {(voters[r.id]?.length ?? 0) === 0 ? (
                    <p className="mt-1.5 text-[12px] text-muted">
                      {voters[r.id] ? t("adm.pollNoVotes") : t("adm.loading")}
                    </p>
                  ) : (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {voters[r.id].map((v, n) => {
                        const opt = r.options.find((o) => o.key === v.choice);
                        return (
                          <div key={n}
                               className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md border border-line bg-surface px-2.5 py-1 text-[12.5px]">
                            <span className="font-data text-ink/90">{v.name}</span>
                            <span className="text-muted">{opt?.th ?? v.choice}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </details>
              </div>
            );
          })}
        </div>
      )}

      {msg && <div className="mt-3 text-[13px] text-jade">{msg}</div>}
      {ask && (
        <ConfirmDialog message={ask.text} confirmLabel={t("adm.pollClose")}
                       danger onConfirm={ask.run} onCancel={() => setAsk(null)} />
      )}
    </div>
  );
}
