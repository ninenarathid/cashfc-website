"use client";

import type { JobKills, JobScore, MemberRaids } from "@/lib/types";
import { ACHV_TIER_LABEL, CONTENT_LABEL } from "@/lib/types";
import JobIcon, { jobColor, jobLabel, jobTierStyle } from "@/components/JobIcon";
import JobDonut from "@/components/JobDonut";
import { parseColor } from "@/lib/parse";

/** FFLogs' standard parse colours. */
interface Fight {
  name: string;
  label: string | null;
  best: number | null;
  kills: number;
  where: string;
}

interface JobRow {
  job: string;
  best: number;
  fights: number;
  kills: number;
  where: string[];
  /** Every ranked encounter behind the totals, so the row can be opened up. */
  entries: Fight[];
}

/**
 * Which jobs this member actually shows up as, drawn from the job FFLogs recorded
 * behind each ranked fight. This replaces a self-declared "main job", which was
 * misleading for anyone who plays several.
 */
export function jobRows(raids: MemberRaids | null): JobRow[] {
  if (!raids) return [];
  const acc = new Map<string, JobRow>();

  const add = (job: string | null | undefined, fight: Fight) => {
    if (!job) return;
    const row = acc.get(job) ??
      { job, best: -1, fights: 0, kills: 0, where: [], entries: [] };
    if (fight.best != null && fight.best > row.best) row.best = fight.best;
    row.fights += 1;
    row.kills += fight.kills || 0;
    if (!row.where.includes(fight.where)) row.where.push(fight.where);
    row.entries.push(fight);
    acc.set(job, row);
  };

  // One fight, split across the jobs that actually fought it. Where the
  // job-detail stage has not reached a fight yet there is only the job holding
  // the best parse, and it takes the whole fight — which is what every row here
  // used to be, and what put fifty-three Paladin kills under Dark Knight.
  const split = (
    row: { job: string | null; job_kills?: JobKills | null;
           best: number | null; kills: number },
    fight: Omit<Fight, "best" | "kills">,
  ) => {
    const per = Object.entries(row.job_kills ?? {});
    if (per.length) {
      for (const [job, r] of per)
        add(job, { ...fight, best: r.best, kills: r.kills });
    } else {
      add(row.job, { ...fight, best: row.best, kills: row.kills });
    }
  };

  for (const e of raids.current?.encounters ?? [])
    split(e, { name: e.name ?? "?", label: e.label, where: "Savage" });
  for (const e of raids.extremes ?? [])
    split(e, { name: e.name ?? "?", label: null, where: "Extreme" });
  for (const u of raids.ultimates ?? [])
    split(u, { name: u.name ?? u.zone, label: null, where: "Ultimate" });
  for (const z of raids.legacy ?? [])
    for (const e of z.encounters ?? [])
      split(e, { name: e.name ?? "?", label: e.label, where: z.zone });

  return [...acc.values()].map((r) => ({
    ...r,
    best: r.best < 0 ? 0 : r.best,
    entries: r.entries.sort((a, b) => (b.best ?? -1) - (a.best ?? -1)),
  }));
}

export default function JobBreakdown(
  { raids, jobScores }:
  { raids: MemberRaids | null; jobScores?: Record<string, JobScore> | null },
) {
  const rows = jobRows(raids);
  if (!rows.length) return null;

  // Bar length is the same score the tier badge is derived from. It used to be the
  // number of distinct fights, which contradicted the badge on screen: a job with
  // more fights but fewer kills drew a longer bar while being graded lower, and the
  // two sat side by side disagreeing with each other.
  const weight = (r: JobRow) => jobScores?.[r.job]?.score ?? r.fights;
  const maxWeight = Math.max(...rows.map(weight)) || 1;
  const ordered = [...rows].sort((a, b) => weight(b) - weight(a) || b.best - a.best);

  // Reading each kill's own job turned this list from "the jobs they parsed best
  // on" into "every job they have ever killed anything on", which for the deepest
  // records is eighteen rows — and most of the new ones are a single kill on a
  // job somebody was levelling. The record should hold them; the page should not
  // open on them. Anything graded, or with a real handful of kills behind it,
  // stays out; the tail folds away.
  const main = ordered.filter((r) => jobScores?.[r.job]?.tier || r.kills >= 3);
  const tail = ordered.filter((r) => !main.includes(r));
  const rowsShown = main.length ? main : ordered;
  const folded = main.length ? tail : [];

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-semibold">
        Jobs played
      </h2>
      {/* The ring beside the list, not under it. They are two answers to the
          same subject — what they play, and how well — and side by side each
          one is read against the other. */}
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-start sm:gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {rowsShown.map((r) => {
          const s = jobScores?.[r.job];
          return (
            <details key={r.job} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[104px_1fr_auto] items-center gap-3 rounded-lg py-1 marker:content-none hover:bg-card/60">
                <span className="flex min-w-0 items-center gap-1.5" title={r.job}>
                  <span className="text-[10px] text-muted transition-transform group-open:rotate-90">
                    ▶
                  </span>
                  <JobIcon job={r.job} size={18} />
                  {/* The same colour as this job's arc in the ring, which is
                      what lets the two be read together without a legend. */}
                  <span className="truncate font-data text-[13px]"
                        style={{ color: `color-mix(in srgb, ${jobColor(r.job)} 78%, #e3e8ef)` }}>
                    {jobLabel(r.job)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {/* Length is the proficiency score behind the tier; colour is the
                      best parse. "How strong overall" and "best single pull" stay
                      separate. */}
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-card"
                        title={s ? `Proficiency ${s.score} of 100` : `${r.fights} fights`}>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (weight(r) / maxWeight) * 100)}%`,
                        background: parseColor(r.best || null),
                      }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-right text-[11.5px] text-muted">
                    {r.kills} kill{r.kills === 1 ? "" : "s"}{" "}· {r.fights} fight{r.fights === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="flex items-center justify-end gap-2">
                  {s?.tier && (
                    <span
                      title={`Proficiency ${s.score} of 100 — ${s.parse} difficulty- and kill-weighted parse over ${s.kills} kills across ${s.fights} fights` +
                        (s.hardest ? `, up to ${CONTENT_LABEL[s.hardest] ?? s.hardest}` : "")}
                      style={jobTierStyle(r.job, s.tier)}
                      className="whitespace-nowrap rounded-full border px-2 py-[2px] text-[10.5px]">
                      {ACHV_TIER_LABEL[s.tier]}
                    </span>
                  )}
                  <span className="w-9 text-right font-data text-sm font-semibold"
                        style={{ color: parseColor(r.best || null) }}
                        title={`Best parse on ${jobLabel(r.job)}`}>
                    {r.best || "—"}
                  </span>
                </span>
              </summary>

              <div className="mb-1 ml-[104px] mt-1 flex flex-col gap-0.5 border-l border-line pl-3">
                {r.entries.map((f, i) => (
                  <div key={`${f.name}-${i}`}
                       className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 text-[12px]">
                    <span className="min-w-0 truncate text-muted">
                      {f.label && (
                        <span className="mr-1.5 font-data text-[11px] text-ink/70">
                          {f.label}
                        </span>
                      )}
                      {f.name}
                      <span className="ml-1.5 text-[11px] text-muted/60">{f.where}</span>
                    </span>
                    <span className="text-right text-[11.5px] text-muted">
                      {f.kills} kill{f.kills === 1 ? "" : "s"}
                    </span>
                    <span className="w-9 text-right font-data font-semibold"
                          style={{ color: parseColor(f.best) }}>
                      {f.best ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
        {folded.length > 0 && (
          <details className="mt-1 border-t border-line/60 pt-1.5">
            <summary className="cursor-pointer list-none text-[12px] text-muted marker:content-none hover:text-ink">
              {folded.length} more job{folded.length === 1 ? "" : "s"}, a kill or two each
            </summary>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
              {folded.map((r) => (
                <span key={r.job} className="inline-flex items-center gap-1.5">
                  <JobIcon job={r.job} size={14} />
                  {jobLabel(r.job)}
                  <span className="text-muted/70">
                    {r.kills} kill{r.kills === 1 ? "" : "s"}
                  </span>
                </span>
              ))}
            </div>
          </details>
        )}
      </div>
      {/* Every job, not only the ones on screen: the fold below the list hides
          rows that are a kill or two, and a ring missing them would not add up
          to the number in its middle. */}
      <JobDonut rows={ordered} />
      </div>
    </section>
  );
}
