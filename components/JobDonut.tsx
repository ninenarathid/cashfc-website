"use client";

import { useId } from "react";
import JobIcon, { jobColor, jobLabel } from "@/components/JobIcon";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLang } from "@/lib/i18n";

/** Past this the ring is confetti, so the rest goes into one slice. */
const SLICES = 6;

/**
 * What somebody actually plays, as one ring.
 *
 * The list beside this answers "how good are they on each job?" — a bar for
 * proficiency, a colour for the best parse, a tier badge. None of that answers
 * "what do they play?", which is a different question and the one people ask
 * first. Twenty rows of numbers can be read for it, but a ring is read at a
 * glance: the biggest arc is the main job, and a ring that is one colour is a
 * different player from a ring that is six.
 *
 * Kills rather than fights, because a job taken to four bosses once is not
 * played more than a job farmed on one of them fifty times, and fights would
 * say it was.
 *
 * ── Six slices, and square ends ──────────────────────────────────────────
 *
 * The first version rounded the cap on every arc and drew every job, and it
 * came out a bead necklace rather than a ring. Two causes, and both are worth
 * writing down because both look like improvements on their own.
 *
 * A round cap is half the stroke hanging off each end, so an arc drawn at its
 * true length overlaps both neighbours and has to be trimmed by a whole stroke
 * width to fit. On a ring of 339 units that trim is 18 — more than half of a
 * ten percent slice. Every arc ended up shorter than the share it stood for,
 * which is the one thing a chart may not do.
 *
 * And twenty slices is not a chart. A deep record touches nearly every job in
 * the game, most of them for a kill or two, and twenty arcs in twenty hues is
 * a picture of nothing. Six named and the rest gathered into one quiet slice:
 * the ring answers "what do they play", and the list beside it still holds
 * every job, which is where somebody goes when that answer is not enough.
 */
export default function JobDonut(
  { rows, size = 200 }: {
    rows: { job: string; kills: number }[];
    size?: number;
  },
) {
  const { t } = useLang();
  // The sheen is referenced by id, and a page could hold more than one ring.
  const uid = useId().replace(/:/g, "");

  const played = rows.filter((r) => r.kills > 0)
    .sort((a, b) => b.kills - a.kills);
  const total = played.reduce((n, r) => n + r.kills, 0);
  if (!total) return null;

  const named = played.slice(0, SLICES);
  const rest = played.slice(SLICES);
  const restKills = rest.reduce((n, r) => n + r.kills, 0);
  const data: { job: string | null; label: string; color: string; kills: number }[] = [
    ...named.map((r) => ({
      job: r.job, label: jobLabel(r.job), color: jobColor(r.job), kills: r.kills,
    })),
    // Grey on purpose: it is the one slice that is not a job, and colouring it
    // would put a twenty-first hue on the ring to say "no particular job".
    ...(restKills > 0 ? [{
      job: null,
      label: t("member.otherJobs", { n: rest.length }),
      color: "#3c4655",
      kills: restKills,
    }] : []),
  ];

  const R = 52;
  const W = 19;
  const C = 2 * Math.PI * R;
  // Square ends and a hairline between them: enough to see the join, small
  // enough that an arc still measures its own share.
  const GAP = data.length > 1 ? 1.6 : 0;

  // Everything that is not drawn in the viewBox is sized off the ring, so one
  // number at the top changes the whole thing and nothing drifts out of
  // proportion with it.
  const ICON = Math.round(size * 0.115);
  // How much arc an icon needs under it before it stops sitting on its own
  // slice and starts sitting across the two either side. In viewBox units, and
  // the same share of the ring at every size, because ICON scales too.
  const NEEDS = (ICON / (size / 140)) * 1.45;

  let run = 0;
  const arcs = data.map((d) => {
    const len = (d.kills / total) * C;
    // Where the icon goes: the middle of the arc, in the same rotated frame
    // the arcs are drawn in — twelve o'clock is -90 degrees.
    const mid = ((run + len / 2) / C) * 2 * Math.PI - Math.PI / 2;
    const arc = {
      ...d,
      len: Math.max(len - GAP, 0.8),
      offset: run,
      // Percentages of the box, so the overlay lands on the ring at any size.
      x: ((70 + R * Math.cos(mid)) / 140) * 100,
      y: ((70 + R * Math.sin(mid)) / 140) * 100,
      roomy: d.job != null && len >= NEEDS,
    };
    run += len;
    return arc;
  });

  const top = data[0];

  return (
    <div className="flex shrink-0 flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" className="donut size-full"
             style={{ ["--c" as string]: C.toFixed(2) }}>
          <defs>
            {/* One sheen across every slice, rather than a gradient defined
                per job: twenty gradients say the same thing twenty times. */}
            <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          {/* Twelve o'clock, clockwise: a ring that starts anywhere else reads
              as having been rotated for a reason. */}
          <g transform="rotate(-90 70 70)">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-card)"
                    strokeWidth={W} />
            {arcs.map((a, i) => (
              <Tooltip key={a.job ?? "rest"} side="bottom"
                       content={
                         <span className="flex items-center gap-1.5">
                           {a.job && <JobIcon job={a.job} size={14} />}
                           {a.label} — {a.kills} kill{a.kills === 1 ? "" : "s"}
                           {" · "}{Math.round((a.kills / total) * 100)}%
                         </span>
                       }>
                <circle
                  cx="70" cy="70" r={R} fill="none"
                  stroke={a.color} strokeWidth={W}
                  strokeDasharray={`${a.len} ${C - a.len}`}
                  strokeDashoffset={-a.offset}
                  style={{ ["--i" as string]: i }}
                  className="donut-arc cursor-default" />
              </Tooltip>
            ))}
            {/* Over the colours and under the pointer: a curved highlight so
                the ring reads as a band rather than as flat paint. */}
            <circle cx="70" cy="70" r={R} fill="none" strokeWidth={W}
                    stroke={`url(#sheen-${uid})`} className="pointer-events-none" />
          </g>
        </svg>
        {/* The job's own mark, on the arcs with room to hold one. Below the
            threshold an icon stops sitting on its slice and starts sitting
            across the two either side of it, which is worse than no icon.
            Laid over the SVG rather than drawn into it so it is the same
            component as everywhere else, fallback square and all; nothing here
            takes the pointer, so the arc underneath still answers a hover. */}
        {arcs.filter((a) => a.roomy).map((a) => (
          <span key={a.job} aria-hidden
                style={{ left: `${a.x}%`, top: `${a.y}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2
                           drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
            <JobIcon job={a.job!} size={ICON} />
          </span>
        ))}
        {/* The middle is the total, so the ring is not a picture of a number
            nobody can name. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data font-semibold leading-none text-ink"
                style={{ fontSize: Math.round(size * 0.145) }}>
            {total}
          </span>
          <span className="mt-1 uppercase tracking-[0.14em] text-muted"
                style={{ fontSize: Math.round(size * 0.055) }}>
            {t("member.killsUnit")}
          </span>
        </div>
      </div>

      {top?.job && (
        // Said rather than implied. The biggest arc is only obviously the
        // biggest when two of them are close in size; naming it means the ring
        // never has to be measured by eye.
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {t("member.mostPlayed")}
          </span>
          <span className="flex items-center gap-1.5 text-[13px]">
            <JobIcon job={top.job} size={16} />
            <span style={{ color: top.color }}>{top.label}</span>
            <span className="text-muted">
              {Math.round((top.kills / total) * 100)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
