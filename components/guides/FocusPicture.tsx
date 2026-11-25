"use client";

import { useId } from "react";
import { pictureUrl, type Point } from "@/lib/guides";

/**
 * One picture of a fight, dark everywhere except where you stand.
 *
 * The dimming is an SVG over the picture in the picture's own pixels, so a
 * circle stays round whatever size the page draws it at, and a point written
 * as a percentage lands on the same spot of the picture on a phone and on a
 * wide screen. The bright hole is a mask, and the ring around it is a white
 * line in a band of the seat's colour, which reads on a dark picture and a
 * light one. The eye goes to the ring first, and the picture around it is
 * still there, darker, for where the ring is in the room.
 *
 * Switching seats moves the circles rather than swapping them (cx, cy and r
 * are CSS properties of an SVG circle), so a reader flicking from MT to ST sees
 * the light travel to the other side of the arena; reduced motion jumps.
 */
export default function FocusPicture({
  picture, w, h, points, ring, color, focus = true, alt, onPoint, children,
}: {
  picture: string | null;
  w: number | null;
  h: number | null;
  points: Point[];
  /** The circle's radius, in percent of the picture's width. */
  ring: number;
  color: string;
  /** False shows the whole picture, undimmed. */
  focus?: boolean;
  alt: string;
  /** Editing: where a tap landed, in percent of the picture. */
  onPoint?: (at: Point) => void;
  children?: React.ReactNode;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const url = pictureUrl(picture);
  const W = w && w > 0 ? w : 1000;
  const H = h && h > 0 ? h : 1000;
  const r = (ring / 100) * W;
  const lit = focus && points.length > 0;

  const tap = onPoint
    ? (e: React.PointerEvent<HTMLDivElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      onPoint([
        ((e.clientX - box.left) / box.width) * 100,
        ((e.clientY - box.top) / box.height) * 100,
      ]);
    }
    : undefined;

  return (
    <div onPointerUp={tap}
         className={`guide-pic relative w-full overflow-hidden rounded-lg border border-line bg-black ${onPoint ? "cursor-crosshair touch-manipulation" : ""}`}
         style={{ aspectRatio: `${W} / ${H}` }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} width={W} height={H} loading="lazy" decoding="async"
             draggable={false}
             className="absolute inset-0 size-full select-none object-fill" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ui text-muted">{alt}</div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden
           className="pointer-events-none absolute inset-0 size-full">
        <defs>
          <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="white" />
            {points.map(([x, y], i) => (
              <circle key={i} className="guide-ring" cx={(x / 100) * W} cy={(y / 100) * H} r={r} fill="black" />
            ))}
          </mask>
        </defs>
        <rect width={W} height={H} fill="rgb(5 7 12)" mask={`url(#m${id})`}
              className="guide-dim" style={{ opacity: lit ? 0.74 : 0 }} />
        {lit && points.map(([x, y], i) => (
          <g key={i}>
            <circle className="guide-ring" cx={(x / 100) * W} cy={(y / 100) * H} r={r}
                    fill="none" stroke={color} strokeOpacity={0.75} strokeWidth={W * 0.016} />
            <circle className="guide-ring" cx={(x / 100) * W} cy={(y / 100) * H} r={r}
                    fill="none" stroke="#fff" strokeOpacity={0.92} strokeWidth={W * 0.004} />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
