"use client";

import { useState } from "react";

export interface AchievementInfo {
  name: string | null;
  pct: number | null;
  icon: string | null;
  category: string | null;
  type: string | null;
  patch: string | null;
  points: number | null;
  title: string | null;
}

const SHOW_FIRST = 8;

/** Rarer reads hotter. Thresholds follow FFXIV Collect's own ownership percentages. */
function rarityColor(pct: number | null): string {
  if (pct == null) return "#7a7a7a";
  if (pct < 0.5) return "#e5cc80";
  if (pct < 1) return "#e268a8";
  if (pct < 3) return "#ff8000";
  if (pct < 5) return "#a335ee";
  return "#2f7fd4";
}

function rarityLabel(pct: number | null): string {
  if (pct == null) return "unknown";
  if (pct < 0.05) return "<0.1% of players";
  return `${pct}% of players`;
}

export default function RareAchievements(
  { items }: { items: AchievementInfo[] },
) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;

  const shown = expanded ? items : items.slice(0, SHOW_FIRST);

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-semibold">
        Rarest achievements{" "}
        <span className="text-[13px] font-normal text-muted">
          ({items.length} shown, rarest first)
        </span>
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((a, i) => (
          <div key={`${a.name}-${i}`}
               className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            {a.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.icon} alt="" loading="lazy"
                   className="size-9 shrink-0 rounded-md border border-line bg-card" />
            ) : (
              <span className="size-9 shrink-0 rounded-md border border-line bg-card" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] text-ink" title={a.name ?? ""}>
                {a.name ?? "—"}
              </div>
              <div className="truncate text-[11.5px] text-muted">
                {[a.category, a.patch && `patch ${a.patch}`].filter(Boolean).join(" · ")}
                {a.title && (
                  <span className="text-gold"> · title &ldquo;{a.title}&rdquo;</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right font-data text-[12.5px] font-semibold"
                 style={{ color: rarityColor(a.pct) }}
                 title={rarityLabel(a.pct)}>
              {a.pct == null ? "—" : `${a.pct}%`}
            </div>
          </div>
        ))}
      </div>
      {items.length > SHOW_FIRST && (
        <button onClick={() => setExpanded(!expanded)}
                className="mt-2 text-[12.5px] text-muted underline hover:text-ink">
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
