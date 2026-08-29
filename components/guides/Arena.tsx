"use client";

import { useRef } from "react";
import type { Arena as ArenaShape, Danger, GuideRole, Spot } from "@/lib/guides/types";

/**
 * The floor, what is dangerous on it, and who is standing where.
 *
 * Drawn as SVG from coordinates rather than shipped as a picture, which is what
 * makes everything else possible: it is sharp at any size for a few hundred
 * bytes, it takes the site's colours instead of fighting them, its labels can be
 * translated because they are text, and — the part that matters — the same
 * numbers that draw the answer can be used to mark one.
 *
 * Angles are degrees clockwise from north, because that is how a raid says them
 * out loud. North is up. A format nobody has to convert is a format nobody gets
 * wrong at two in the morning.
 */

/** Half the arena across. Everything is authored against this and nothing else. */
const R = 10;

const ROLE_COLOR: Record<GuideRole, string> = {
  tank: "#7ea6c9",
  pure: "#6aa84f", barrier: "#4fb8a8",
  melee: "#d14b3a", pranged: "#d98b3a", mranged: "#a87fd8",
};

const WAYMARK_COLOR: Record<string, string> = {
  A: "#d14b3a", B: "#e5cc80", C: "#6aa9e0", D: "#a87fd8",
  "1": "#d14b3a", "2": "#e5cc80", "3": "#6aa9e0", "4": "#a87fd8",
};

/** Maths coordinates in, screen coordinates out: y points up for the author. */
const sy = (y: number) => -y;
/** A heading in degrees clockwise from north, as a unit vector in author space. */
const dir = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};

function dangerPath(d: Danger): string {
  switch (d.kind) {
    case "cone": {
      // Drawn well past the edge and clipped to the floor, so a cone always
      // reaches the wall however wide the arena happens to be.
      const far = R * 3;
      const a = dir(d.facing - d.angle / 2);
      const b = dir(d.facing + d.angle / 2);
      const big = d.angle > 180 ? 1 : 0;
      return `M ${d.at.x} ${sy(d.at.y)} `
        + `L ${d.at.x + a.x * far} ${sy(d.at.y + a.y * far)} `
        + `A ${far} ${far} 0 ${big} 1 `
        + `${d.at.x + b.x * far} ${sy(d.at.y + b.y * far)} Z`;
    }
    case "rect": {
      const f = d.facing ?? 0;
      const u = dir(f);                       // along the long axis
      const v = dir(f + 90);                  // across it
      const hw = d.w / 2, hl = d.h / 2;
      const c = [
        [+hl, +hw], [+hl, -hw], [-hl, -hw], [-hl, +hw],
      ].map(([l, w]) => ({
        x: d.at.x + u.x * l + v.x * w,
        y: d.at.y + u.y * l + v.y * w,
      }));
      return "M " + c.map((p) => `${p.x} ${sy(p.y)}`).join(" L ") + " Z";
    }
    case "half": {
      const far = R * 3;
      const u = dir(d.facing);
      const v = dir(d.facing + 90);
      const c = [
        { x: v.x * far, y: v.y * far },
        { x: v.x * far + u.x * far, y: v.y * far + u.y * far },
        { x: -v.x * far + u.x * far, y: -v.y * far + u.y * far },
        { x: -v.x * far, y: -v.y * far },
      ];
      return "M " + c.map((p) => `${p.x} ${sy(p.y)}`).join(" L ") + " Z";
    }
    default:
      return "";
  }
}

export interface Mark { role: GuideRole; at: Spot; you?: boolean }

export default function Arena(
  { arena, danger = [], marks = [], boss, pick, answer, onPick, tolerance = 2 }: {
    arena: ArenaShape;
    danger?: Danger[];
    marks?: Mark[];
    boss?: Spot | null;
    /** Where the reader clicked, while they are being asked. */
    pick?: Spot | null;
    /** The spot they were being asked for, once it is time to show it. */
    answer?: Spot | null;
    onPick?: (at: Spot) => void;
    tolerance?: number;
  },
) {
  const svg = useRef<SVGSVGElement | null>(null);
  const pad = 1.6;
  const span = (R + pad) * 2;

  function click(e: React.MouseEvent) {
    if (!onPick || !svg.current) return;
    const b = svg.current.getBoundingClientRect();
    // The viewBox is square and the element is square, so one ratio does both.
    const x = ((e.clientX - b.left) / b.width) * span - (R + pad);
    const y = -(((e.clientY - b.top) / b.height) * span - (R + pad));
    onPick({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  const floor = arena.shape === "circle"
    ? <circle cx={0} cy={0} r={R} />
    : <rect x={-R} y={-R} width={R * 2} height={R * 2} rx={0.6} />;

  return (
    <svg ref={svg} onClick={click}
         viewBox={`${-(R + pad)} ${-(R + pad)} ${span} ${span}`}
         className={`w-full select-none ${onPick ? "cursor-crosshair" : ""}`}
         role="img">
      <defs>
        {/* Everything dangerous is cut to the floor, so a cone or a half never
            spills into the margin and pretends the room is bigger than it is. */}
        <clipPath id="arena-floor">{floor}</clipPath>
      </defs>

      <g className="text-line">
        {/* The floor is always drawn. A picture of the real room goes over it
            when there is one — and if that file is missing or slow, what is left
            is the plain shape rather than a hole, because the mechanics are
            coordinates and never needed the picture. */}
        <g fill="var(--color-card)" stroke="currentColor" strokeWidth={0.16}>
          {floor}
        </g>
        {arena.image && (
          <image href={arena.image} x={-R} y={-R} width={R * 2} height={R * 2}
                 clipPath="url(#arena-floor)" preserveAspectRatio="xMidYMid slice"
                 opacity={0.5} />
        )}
        {/* Only when there is no photograph of the floor. A real arena that is
            divided into tiles already shows them, and drawing a second set over
            the first is two grids that will never quite line up. */}
        {arena.grid && arena.grid > 1 && !arena.image && (
          <g clipPath="url(#arena-floor)" stroke="currentColor" strokeWidth={0.07}
             opacity={0.55}>
            {Array.from({ length: arena.grid - 1 }, (_, i) => {
              const at = -R + ((i + 1) * (R * 2)) / arena.grid!;
              return (
                <g key={i}>
                  <line x1={at} y1={-R} x2={at} y2={R} />
                  <line x1={-R} y1={at} x2={R} y2={at} />
                </g>
              );
            })}
          </g>
        )}
        <g fill="none" stroke="currentColor" strokeWidth={0.16}>{floor}</g>
      </g>

      {/* North, so nobody has to guess which way the diagram is facing. */}
      <text x={0} y={sy(R + 0.9)} textAnchor="middle" dominantBaseline="middle"
            className="fill-muted" fontSize={1.1}>N</text>

      <g clipPath="url(#arena-floor)">
        {danger.map((d, i) => (
          d.kind === "circle" ? (
            <circle key={i} cx={d.at.x} cy={sy(d.at.y)} r={d.r}
                    className="fill-chili/25 stroke-chili/70" strokeWidth={0.14} />
          ) : d.kind === "donut" ? (
            // Hit at the edges, safe in the middle — drawn as the ring it is
            // rather than as a hole somebody has to infer.
            <path key={i} fillRule="evenodd"
                  d={`M ${-R * 3} ${-R * 3} H ${R * 3} V ${R * 3} H ${-R * 3} Z `
                     + `M ${d.at.x - d.r} ${sy(d.at.y)} `
                     + `a ${d.r} ${d.r} 0 1 0 ${d.r * 2} 0 `
                     + `a ${d.r} ${d.r} 0 1 0 ${-d.r * 2} 0 Z`}
                  className="fill-chili/25" />
          ) : (
            <path key={i} d={dangerPath(d)}
                  className="fill-chili/25 stroke-chili/70" strokeWidth={0.14} />
          )
        ))}
      </g>

      {Object.entries(arena.waymarks ?? {}).map(([k, at]) => (
        <g key={k}>
          <circle cx={at.x} cy={sy(at.y)} r={0.85}
                  fill={`${WAYMARK_COLOR[k] ?? "#8b97a8"}33`}
                  stroke={WAYMARK_COLOR[k] ?? "#8b97a8"} strokeWidth={0.14} />
          <text x={at.x} y={sy(at.y)} textAnchor="middle" dominantBaseline="central"
                fill={WAYMARK_COLOR[k] ?? "#8b97a8"} fontSize={1.05}
                fontWeight={600}>{k}</text>
        </g>
      ))}

      {boss && (
        <g>
          <circle cx={boss.x} cy={sy(boss.y)} r={1.5}
                  className="fill-surface stroke-ink/70" strokeWidth={0.16} />
          <text x={boss.x} y={sy(boss.y)} textAnchor="middle" dominantBaseline="central"
                className="fill-ink" fontSize={1.1} fontWeight={700}>B</text>
        </g>
      )}

      {marks.map((m, i) => (
        <g key={i}>
          <circle cx={m.at.x} cy={sy(m.at.y)} r={m.you ? 1.15 : 0.85}
                  fill={`${ROLE_COLOR[m.role]}${m.you ? "55" : "22"}`}
                  stroke={ROLE_COLOR[m.role]} strokeWidth={m.you ? 0.26 : 0.14} />
          {m.you && (
            <circle cx={m.at.x} cy={sy(m.at.y)} r={1.9} fill="none"
                    stroke={ROLE_COLOR[m.role]} strokeWidth={0.12}
                    strokeDasharray="0.5 0.4" />
          )}
        </g>
      ))}

      {/* What the reader answered, and how close they had to be. The ring is
          drawn as well as the point, because "you were nearly right" is a
          different lesson from "you were wrong" and the guide should say which. */}
      {answer && (
        <circle cx={answer.x} cy={sy(answer.y)} r={tolerance} fill="none"
                className="stroke-jade/60" strokeWidth={0.12} strokeDasharray="0.6 0.4" />
      )}
      {pick && (
        <g>
          <circle cx={pick.x} cy={sy(pick.y)} r={0.7} fill="none"
                  className="stroke-ink" strokeWidth={0.2} />
          <path d={`M ${pick.x - 0.45} ${sy(pick.y) - 0.45} l 0.9 0.9 `
                   + `M ${pick.x + 0.45} ${sy(pick.y) - 0.45} l -0.9 0.9`}
                className="stroke-ink" strokeWidth={0.2} />
        </g>
      )}
    </svg>
  );
}
