"use client";

import type { HistoryRow } from "@/lib/types";
import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface Slice { name: string; value: number; color: string }

const tooltipStyle = {
  background: "#262017", border: "1px solid #3a3226", borderRadius: 8,
  color: "#efe6d3", fontSize: 12.5,
};

export default function FcCharts({
  tagCounts, parseDist, prog, total, history, raceCounts, activity,
}: {
  tagCounts: Slice[];
  parseDist: Slice[];
  prog: { label: string; cleared: number }[];
  total: number;
  history: HistoryRow[];
  raceCounts: Slice[];
  activity: { active: number; vacation: number };
}) {
  const anyParse = parseDist.some((p) => p.value > 0);
  const anyProg = prog.some((p) => p.cleared > 0);
  const racedTotal = raceCounts.reduce((s, r) => s + r.value, 0);
  // Counts alone do not answer "is that a lot?" for a 502-member FC.
  const share = (n: number, of = total) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";

  return (
    <details open className="mt-5 rounded-xl border border-line bg-surface open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 font-display font-semibold marker:text-amber">
        📊 FC overview
      </summary>

      <div className="grid gap-6 px-4 sm:grid-cols-2">
        {/* Activity split */}
        <div className="sm:col-span-2">
          <div className="mb-1 text-[13px] font-medium text-muted">Activity</div>
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-xl border border-line bg-card px-3 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="size-2.5 rounded-full bg-[#43b581]" />
                <span className="font-data text-2xl font-semibold text-ink">
                  {activity.active}
                </span>
              </div>
              <div className="text-xs text-muted">
                Active <span className="text-muted/70">· {share(activity.active)}</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-line bg-card px-3 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="size-2.5 rounded-full bg-[#747f8d]" />
                <span className="font-data text-2xl font-semibold text-muted">
                  {activity.vacation}
                </span>
              </div>
              <div className="text-xs text-muted">
                On vacation <span className="text-muted/70">· {share(activity.vacation)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Player-type split */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">Player types</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tagCounts} dataKey="value" nameKey="name"
                     innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                  {tagCounts.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
            {tagCounts.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.name} {s.value}
                <span className="opacity-70">({share(s.value)})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Race breakdown */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">
            Races{racedTotal ? ` (${racedTotal} known)` : ""}
          </div>
          {racedTotal ? (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={raceCounts} dataKey="value" nameKey="name"
                         innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                      {raceCounts.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
                {raceCounts.map((s) => (
                  <span key={s.name} className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name} {s.value}
                    <span className="opacity-70">({share(s.value, racedTotal)})</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-[13px] leading-relaxed text-muted">
              Race data arrives once the pipeline has walked the character pages
              — run the workflow with &ldquo;full_extras&rdquo; ticked to fill it in one pass.
            </div>
          )}
        </div>


        {/* FC history over time */}
        <div>
          <div className="mb-1 text-[13px] font-medium text-muted">FC history over time</div>
          {history.length >= 2 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="date" tick={{ fill: "#9c8f78", fontSize: 10 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <YAxis allowDecimals={false} width={28}
                         tick={{ fill: "#9c8f78", fontSize: 11 }}
                         axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="raider" name="Raider"
                        stroke="#d14b3a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ultimate" name="Ultimate"
                        stroke="#e5cc80" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="final_boss" name="Final boss cleared"
                        stroke="#4fb8a8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-[13px] leading-relaxed text-muted">
              The chart starts drawing once at least two days have accumulated
              — the pipeline records a stat row every night.
            </div>
          )}
        </div>
        {/* Raiding stats, folded away. This FC does plenty that has nothing to do
            with raiding, and an overview that leads with parse percentages says
            otherwise. Open it if you want it. */}
        <details className="sm:col-span-2 rounded-xl border border-line bg-card">
          <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-medium text-muted marker:text-amber">
            ⚔️ Raiding — parse distribution and tier progress
          </summary>
          <div className="grid gap-6 px-3 pb-3 pt-1 sm:grid-cols-2">
          {/* Parse distribution */}
          <div>
            <div className="mb-1 text-[13px] font-medium text-muted">
              Parse distribution (best)
            </div>
            {anyParse ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parseDist}>
                    <XAxis dataKey="name" tick={{ fill: "#9c8f78", fontSize: 11 }}
                           axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                    <YAxis allowDecimals={false} width={28}
                           tick={{ fill: "#9c8f78", fontSize: 11 }}
                           axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#efe6d30d" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {parseDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line text-[13px] text-muted">
                Waiting on FF Logs data (set the API keys, then run the pipeline)
              </div>
            )}
          </div>

          {/* Current-tier prog board */}
          <div>
            <div className="mb-1 text-[13px] font-medium text-muted">
              Current tier progress
            </div>
            <div className="flex flex-col gap-2.5">
              {prog.map((p) => (
                <div key={p.label}>
                  <div className="mb-0.5 flex justify-between font-data text-[12px]">
                    <span className="text-ink">{p.label}</span>
                    <span className="text-muted">
                      {p.cleared}/{total} cleared · {share(p.cleared)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-card">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-chili to-amber transition-[width]"
                      style={{ width: `${total ? Math.round((p.cleared / total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!anyProg && (
                <div className="text-[12px] text-muted">
                  No clear data yet — it appears automatically once FF Logs is connected
                </div>
              )}
            </div>
          </div>
          </div>
        </details>
      </div>
    </details>
  );
}
