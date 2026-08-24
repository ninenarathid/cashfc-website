"use client";

import type { JobScore, MemberRaids } from "@/lib/types";
import { ACHV_TIER_LABEL } from "@/lib/types";
import JobIcon, { jobTierStyle } from "@/components/JobIcon";

/** FFLogs' standard parse colours. */
function parseColor(p: number | null | undefined): string {
  if (p == null) return "#7a7a7a";
  if (p >= 100) return "#e5cc80";
  if (p >= 99) return "#e268a8";
  if (p >= 95) return "#ff8000";
  if (p >= 75) return "#a335ee";
  if (p >= 50) return "#2f7fd4";
  if (p >= 25) return "#4caf50";
  return "#7a7a7a";
}

interface JobRow {
  job: string;
  best: number;
  fights: number;
  kills: number;
  where: string[];
}

/**
 * Which jobs this member actually shows up as, drawn from the job FFLogs recorded
 * behind each ranked fight. This replaces a self-declared "main job", which was
 * misleading for anyone who plays several.
 */
export function jobRows(raids: MemberRaids | null): JobRow[] {
  if (!raids) return [];
  const acc = new Map<string, JobRow>();

  const add = (job: string | null, best: number | null, kills: number, where: string) => {
    if (!job) return;
    const row = acc.get(job) ?? { job, best: -1, fights: 0, kills: 0, where: [] };
    if (best != null && best > row.best) row.best = best;
    row.fights += 1;
    row.kills += kills || 0;
    if (!row.where.includes(where)) row.where.push(where);
    acc.set(job, row);
  };

  for (const e of raids.current?.encounters ?? [])
    add(e.job, e.best, e.kills, "Savage");
  for (const e of raids.extremes ?? [])
    add(e.job, e.best, e.kills, "Extreme");
  for (const u of raids.ultimates ?? [])
    add(u.job, u.best, u.kills, "Ultimate");
  for (const z of raids.legacy ?? [])
    for (const e of z.encounters ?? []) add(e.job, e.best, e.kills, "Legacy");

  return [...acc.values()]
    .map((r) => ({ ...r, best: r.best < 0 ? 0 : r.best }))
    .sort((a, b) => b.fights - a.fights || b.best - a.best);
}

export default function JobBreakdown(
  { raids, jobScores }:
  { raids: MemberRaids | null; jobScores?: Record<string, JobScore> | null },
) {
  const rows = jobRows(raids);
  if (!rows.length) return null;

  const maxFights = Math.max(...rows.map((r) => r.fights));

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-semibold">
        Jobs played{" "}
        <span className="text-[13px] font-normal text-muted">
          ({rows.length} recorded by FF Logs)
        </span>
      </h2>
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        {rows.map((r) => (
          <div key={r.job} className="grid grid-cols-[104px_1fr_auto] items-center gap-3">
            <span className="flex min-w-0 items-center gap-1.5" title={r.job}>
              <JobIcon job={r.job} size={18} />
              <span className="truncate font-data text-[13px] text-ink">{r.job}</span>
            </span>
            <span className="flex items-center gap-2">
              {/* Bar length is how often they play it; colour is how well it parses,
                  so "plays a lot" and "plays well" stay readable as separate things. */}
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-card">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(6, (r.fights / maxFights) * 100)}%`,
                    background: parseColor(r.best || null),
                  }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-[11.5px] text-muted">
                {r.fights} fight{r.fights === 1 ? "" : "s"} · {r.kills} kills
              </span>
            </span>
            <span className="flex items-center justify-end gap-2">
              {jobScores?.[r.job]?.tier && (
                <span
                  title={`${jobScores[r.job].parse} average best parse over ${jobScores[r.job].kills} kills across ${jobScores[r.job].fights} fights`}
                  style={jobTierStyle(r.job, jobScores[r.job].tier)}
                  className="whitespace-nowrap rounded-full border px-2 py-[2px] text-[10.5px]">
                  {ACHV_TIER_LABEL[jobScores[r.job].tier!]}
                </span>
              )}
              <span className="w-9 text-right font-data text-sm font-semibold"
                    style={{ color: parseColor(r.best || null) }}
                    title={`Best parse on ${r.job} — ${r.where.join(", ")}`}>
                {r.best || "—"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
