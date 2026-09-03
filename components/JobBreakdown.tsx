"use client";

import type { JobScore, MemberRaids } from "@/lib/types";
import { ACHV_TIER_LABEL, CONTENT_LABEL } from "@/lib/types";
import JobIcon, { jobLabel, jobTierStyle } from "@/components/JobIcon";
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

  for (const e of raids.current?.encounters ?? [])
    add(e.job, { name: e.name ?? "?", label: e.label, best: e.best,
                 kills: e.kills, where: "Savage" });
  for (const e of raids.extremes ?? [])
    add(e.job, { name: e.name ?? "?", label: null, best: e.best,
                 kills: e.kills, where: "Extreme" });
  for (const u of raids.ultimates ?? [])
    add(u.job, { name: u.name ?? u.zone, label: null, best: u.best,
                 kills: u.kills, where: "Ultimate" });
  for (const z of raids.legacy ?? [])
    for (const e of z.encounters ?? [])
      add(e.job, { name: e.name ?? "?", label: e.label, best: e.best,
                   kills: e.kills, where: z.zone });

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

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-semibold">
        Jobs played
      </h2>
      <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
        {ordered.map((r) => {
          const s = jobScores?.[r.job];
          return (
            <details key={r.job} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[104px_1fr_auto] items-center gap-3 rounded-lg py-1 marker:content-none hover:bg-card/60">
                <span className="flex min-w-0 items-center gap-1.5" title={r.job}>
                  <span className="text-[10px] text-muted transition-transform group-open:rotate-90">
                    ▶
                  </span>
                  <JobIcon job={r.job} size={18} />
                  <span className="truncate font-data text-[13px] text-ink">
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
                    {r.fights} fight{r.fights === 1 ? "" : "s"} · {r.kills} kills
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
      </div>
    </section>
  );
}
