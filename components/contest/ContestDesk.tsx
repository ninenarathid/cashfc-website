"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang, type Key } from "@/lib/i18n";
import { STAGE_TONE, contestPath, loadContest, phaseOf, type Contest } from "@/lib/contest";
import { ContestIcon } from "@/components/ui/NavIcons";

/**
 * The glamour contest, on Aqua's page.
 *
 * The contests are mostly hers to run, and her page is the one she opens, so
 * the way in is there as well as on the admin panel — as the contest itself
 * rather than as a line of text: its poster, its name, where it stands, and
 * how many have taken part, so she can see whether it needs her before she
 * goes in. The newest one, drafts included, because that is the one being
 * worked on; the rest are a click away on the contest page.
 *
 * With no contest yet it is the way to start one.
 */
export default function ContestDesk({ supabase }: { supabase: SupabaseClient }) {
  const { t, lang } = useLang();
  // Undefined while asking, null for "there is none".
  const [contest, setContest] = useState<Contest | null | undefined>(undefined);
  const [turnout, setTurnout] = useState<{ entries: number; voters: number } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const c = await loadContest(supabase, null);
      if (!live) return;
      setContest(c);
      if (!c) return;
      const { data } = await supabase.rpc("contest_turnout", { p_contest: c.id });
      const row = ((data ?? []) as { entries: number; voters: number }[])[0];
      if (live && row) setTurnout({ entries: Number(row.entries), voters: Number(row.voters) });
    })();
    return () => { live = false; };
  }, [supabase]);

  // The same height as the card, so the page does not move when it arrives.
  if (contest === undefined) {
    return <div aria-hidden className="mt-4 h-[124px] animate-pulse rounded-2xl border border-line bg-surface/60" />;
  }

  if (!contest) {
    return (
      <Link href="/admin/contest"
            className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-accent/50 bg-accent/5 px-4 py-4 no-underline transition-colors hover:border-accent hover:bg-accent/10">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent/40 bg-accent/10">
          <ContestIcon size={24} className="text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-data text-meta uppercase tracking-[0.22em] text-accent">
            {t("aqua.contestEyebrow")}
          </span>
          <span className="mt-0.5 block text-read text-ink">{t("aqua.contestNone")}</span>
        </span>
        <span className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-ui text-accent">
          {t("aqua.contestStart")} →
        </span>
      </Link>
    );
  }

  const phase = phaseOf(contest);
  const title = lang === "en" && contest.title_en ? contest.title_en : contest.title;

  return (
    <section className="relative mt-4 overflow-hidden rounded-2xl border border-accent/40 bg-surface">
      {/* The poster again, blurred into the background, so the card takes
          its colour from whatever this contest looks like. */}
      {contest.poster_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={contest.poster_url} alt="" aria-hidden
             className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-45 blur-2xl" />
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/20 via-surface/60 to-surface/90" />

      <div className="relative flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap sm:p-4">
        <Link href={contestPath(contest.id)} className="shrink-0 no-underline" aria-label={title}>
          {contest.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contest.poster_url} alt=""
                 className="h-[100px] w-20 rounded-xl border border-line-lit object-cover shadow-lg shadow-black/40" />
          ) : (
            <span className="grid h-[100px] w-20 place-items-center rounded-xl border border-accent/40 bg-accent/10">
              <ContestIcon size={28} className="text-accent" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-data text-meta uppercase tracking-[0.22em] text-accent">
            <ContestIcon size={14} />
            {t("aqua.contestEyebrow")}
          </div>
          <div className="mt-1 line-clamp-2 font-display text-lead font-semibold leading-snug text-ink">
            {title}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border bg-bg/40 px-2.5 py-0.5 text-meta font-medium ${STAGE_TONE[phase.stage]}`}>
              {t(`contest.stage.${phase.stage}` as Key)}
            </span>
            {turnout && (
              <span className="font-data text-meta text-muted">
                {t("contest.turnout", { entries: turnout.entries, voters: turnout.voters })}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-col">
          <Link href={`/admin/contest?c=${contest.id}`}
                className="flex-1 rounded-lg border border-accent bg-accent/20 px-3.5 py-2 text-center text-ui font-medium text-accent no-underline transition-colors hover:bg-accent/30">
            {t("aqua.contestManage")} →
          </Link>
          <Link href={contestPath(contest.id)}
                className="flex-1 rounded-lg border border-line bg-bg/40 px-3.5 py-2 text-center text-ui text-muted no-underline transition-colors hover:border-muted hover:text-ink">
            {t("aqua.contestOpen")}
          </Link>
        </div>
      </div>
    </section>
  );
}
