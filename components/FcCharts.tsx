"use client";

import { useMemo, useState } from "react";
import type { HistoryRow, Member } from "@/lib/types";
import { RACE_ORDER, isOnVacation } from "@/lib/types";
import { TAG_COLOR, TAG_LABELS } from "@/components/MemberTags";
import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface Slice { name: string; value: number; color: string }

const tooltipStyle = {
  background: "#262017", border: "1px solid #3a3226", borderRadius: 8,
  color: "#efe6d3", fontSize: 12.5,
};

const RACE_COLORS: Record<string, string> = {
  Hyur: "#e8a33d", Elezen: "#7ea6c9", Lalafell: "#4fb8a8", "Miqo'te": "#d14b3a",
  Roegadyn: "#c98a5b", "Au Ra": "#a37fd1", Hrothgar: "#e5cc80", Viera: "#8fbf6a",
};

const PARSE_BRACKETS = [
  { name: "100", min: 100, max: 100, color: "#e5cc80" },
  { name: "99", min: 99, max: 99, color: "#e268a8" },
  { name: "95+", min: 95, max: 98, color: "#ff8000" },
  { name: "75+", min: 75, max: 94, color: "#a335ee" },
  { name: "50+", min: 50, max: 74, color: "#2f7fd4" },
  { name: "25+", min: 25, max: 49, color: "#4caf50" },
  { name: "<25", min: 0, max: 24, color: "#7a7a7a" },
];

// Order the donut reads in. Anything not listed still appears, just after these.
const TAG_ORDER = ["tier-clear", "prog", "raider", "ultimate", "veteran", "extreme",
                   "crafter", "gatherer", "relic", "explorer", "treasure",
                   "goldsaucer", "seasonal", "pvp", "oldtimer", "casual", "unknown"];

export default function FcCharts({
  members, labels, history,
}: {
  members: Member[];
  labels: string[];
  history: HistoryRow[];
}) {
  // Both on to start, so the page opens showing the whole FC. Turning one off
  // re-cuts every chart below, which is the point: "what do the active members
  // actually play" is a different question from "what does the roster look like".
  const [showActive, setShowActive] = useState(true);
  const [showVacation, setShowVacation] = useState(true);

  const activity = useMemo(() => {
    const vacation = members.filter(isOnVacation).length;
    return { active: members.length - vacation, vacation };
  }, [members]);

  const shown = useMemo(
    () => members.filter((m) => (isOnVacation(m) ? showVacation : showActive)),
    [members, showActive, showVacation]);

  const total = shown.length;
  const share = (n: number, of = total) =>
    of > 0 ? `${Math.round((n / of) * 100)}%` : "—";

  const tagCounts: Slice[] = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of shown) for (const t of m.tags) c[t] = (c[t] ?? 0) + 1;
    return Object.entries(c)
      .sort((a, b) => (TAG_ORDER.indexOf(a[0]) + 99) - (TAG_ORDER.indexOf(b[0]) + 99))
      .map(([k, value]) => ({ name: TAG_LABELS[k] ?? k, value,
                              color: TAG_COLOR[k] ?? "#7a7a7a" }));
  }, [shown]);

  const raceCounts: Slice[] = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of shown) if (m.race) c[m.race] = (c[m.race] ?? 0) + 1;
    const rows = Object.entries(c)
      .sort((a, b) => (RACE_ORDER.indexOf(a[0]) + 99) - (RACE_ORDER.indexOf(b[0]) + 99))
      .map(([name, value]) => ({ name, value, color: RACE_COLORS[name] ?? "#7a7a7a" }));
    // Scraping character pages fails for a handful every run. Showing the gap keeps
    // the shares honest — they are shares of the FC, not of whoever could be read.
    const unknown = shown.length - rows.reduce((a, r) => a + r.value, 0);
    if (unknown > 0) rows.push({ name: "No data", value: unknown, color: "#55493a" });
    return rows;
  }, [shown]);

  const parseDist: Slice[] = useMemo(
    () => PARSE_BRACKETS.map((b) => ({
      name: b.name, color: b.color,
      value: shown.filter((m) => m.parse != null && m.parse >= b.min && m.parse <= b.max).length,
    })), [shown]);

  const prog = useMemo(
    () => labels.map((label, i) => ({
      label, cleared: shown.filter((m) => m.current_clears?.[i]).length,
    })), [shown, labels]);

  // History rows carry a per-tag breakdown; flatten it so every tag is a plottable
  // series alongside the roster-wide numbers the pipeline has always recorded.
  const historyRows = useMemo(
    () => history.map((r) => ({ ...r, ...(r.tags ?? {}) })), [history]);

  const series = useMemo(() => {
    const seen = new Set<string>();
    for (const r of history) for (const k of Object.keys(r.tags ?? {})) seen.add(k);
    const tagSeries = [...seen]
      .sort((a, b) => (TAG_ORDER.indexOf(a) + 99) - (TAG_ORDER.indexOf(b) + 99))
      .map((k) => ({ key: k, label: TAG_LABELS[k] ?? k, color: TAG_COLOR[k] ?? "#7a7a7a" }));
    return [
      { key: "final_boss", label: "Final boss cleared", color: "#4fb8a8" },
      ...tagSeries,
    ];
  }, [history]);

  // Everything at once is unreadable, so start with the few that describe the FC's
  // shape and let people add the rest.
  const [shownSeries, setShownSeries] = useState<Set<string>>(
    () => new Set(["tier-clear", "prog", "extreme", "ultimate", "final_boss"]));
  const toggleSeries = (k: string) =>
    setShownSeries((prev) => {
      const next = new Set(prev);
      if (!next.delete(k)) next.add(k);
      return next;
    });

  const anyParse = parseDist.some((p) => p.value > 0);
  const anyProg = prog.some((p) => p.cleared > 0);
  const racedTotal = raceCounts.reduce((s, r) => s + r.value, 0);

  const toggle = (on: boolean, dot: string, n: number, label: string,
                  onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        on ? "border-amber/50 bg-card" : "border-line bg-card/40 opacity-50"}`}>
      <div className="flex items-baseline gap-2">
        <span className="size-2.5 rounded-full" style={{ background: dot }} />
        <span className="font-data text-2xl font-semibold text-ink">{n}</span>
      </div>
      <div className="text-xs text-muted">
        {label}{" "}
        <span className="text-muted/70">· {share(n, members.length)}</span>
      </div>
    </button>
  );

  return (
    <details open className="mt-5 rounded-xl border border-line bg-surface open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 font-display font-semibold marker:text-amber">
        📊 FC overview
      </summary>

      <div className="grid gap-6 px-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-muted">Activity</span>
            <span className="text-[11.5px] text-muted/70">
              tap to include or exclude — every chart below follows
            </span>
          </div>
          <div className="flex gap-2.5">
            {toggle(showActive, "#43b581", activity.active, "Active",
                    () => setShowActive(!showActive))}
            {toggle(showVacation, "#747f8d", activity.vacation, "On vacation",
                    () => setShowVacation(!showVacation))}
          </div>
          {total === 0 && (
            <p className="mt-2 text-[12.5px] text-muted">
              Nothing selected — turn one back on to see the charts.
            </p>
          )}
          {total > 0 && (!showActive || !showVacation) && (
            <p className="mt-2 text-[12.5px] text-muted">
              Showing {total} of {members.length} members
              {!showVacation && " — active only"}
              {!showActive && " — on vacation only"}
            </p>
          )}
        </div>

        {total > 0 && (
          <>
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
              <div className="mb-1 text-[13px] font-medium text-muted">Races</div>
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
                        <span className="opacity-70">({share(s.value)})</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-[13px] leading-relaxed text-muted">
                  Race data arrives once the pipeline has walked the character pages.
                </div>
              )}
            </div>

            {/* FC history over time. Not affected by the toggles: the pipeline records
                one roster-wide row a night and cannot re-cut the past. */}
            <div className="sm:col-span-2">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-muted">
                  FC history over time{" "}
                  <span className="text-[11px] text-muted/70">
                    (whole FC — the toggles above do not apply)
                  </span>
                </span>
                {history.length >= 2 && (
                  <span className="text-[11.5px] text-muted/70">
                    tap a name to add or remove its line
                  </span>
                )}
              </div>
              {history.length >= 2 ? (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyRows}>
                        <XAxis dataKey="date" tick={{ fill: "#9c8f78", fontSize: 10 }}
                               axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                        <YAxis allowDecimals={false} width={28}
                               tick={{ fill: "#9c8f78", fontSize: 11 }}
                               axisLine={{ stroke: "#3a3226" }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        {[...series].filter((s) => shownSeries.has(s.key)).map((s) => (
                          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                                stroke={s.color} strokeWidth={2} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]">
                    {series.map((s) => {
                      const on = shownSeries.has(s.key);
                      return (
                        <button key={s.key}
                                onClick={() => toggleSeries(s.key)}
                                aria-pressed={on}
                                className={`inline-flex items-center gap-1 transition-opacity ${
                                  on ? "text-ink" : "text-muted opacity-50"}`}>
                          <span className="size-2 rounded-full"
                                style={{ background: s.color }} />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-[13px] leading-relaxed text-muted">
                  The chart starts drawing once at least two days have accumulated
                  — the pipeline records one row a night.
                </div>
              )}
            </div>

            {/* Raiding stats, folded away. This FC does plenty that has nothing to do
                with raiding, and an overview that leads with parse percentages says
                otherwise. Open it if you want it. */}
            <details className="rounded-xl border border-line bg-card sm:col-span-2">
              <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-medium text-muted marker:text-amber">
                ⚔️ Raiding — parse distribution and tier progress
              </summary>
              <div className="grid gap-6 px-3 pb-3 pt-1 sm:grid-cols-2">
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
                      No parses in this selection yet
                    </div>
                  )}
                </div>

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
                        No clears in this selection yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </>
        )}
      </div>
    </details>
  );
}
