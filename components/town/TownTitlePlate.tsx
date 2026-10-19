"use client";

import { useEffect, useRef } from "react";
import type { LineId } from "@/lib/town/lines";
import { ICON_ATLAS } from "./TownIcon";
import { bandOf, drawTitlePlate, plateSize } from "./title-plate";

/** Room round a plate in its own little canvas: for its wings and glow at the sides, and above for what comes off it. */
const ROOM_X = 26, ROOM_Y = 18;
/** How far a plate's wings reach past its ends, by its band (components/town/title-plate). */
const WINGS = [0, 0, 1, 12, 15];

/**
 * A worn title as it reads under one's name on the map, drawn by the map's own painter, for the lines' board
 * (components/town/TownLines). Its words are there for a screen reader too; it moves only while it is on the screen
 * and the page has not been asked for less motion.
 */
export default function TownTitlePlate({ text, line, rank }: { text: string; line: LineId; rank: number }) {
  const ref = useRef<HTMLCanvasElement>(null), holder = useRef<HTMLSpanElement>(null);
  const band = bandOf(rank);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const font = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";
    // (drawn a little larger on a wide screen, where the board's own words are larger, and sharp at that size)
    const big = window.innerWidth >= 900 ? 1.3 : 1, dpr = Math.min(3, window.devicePixelRatio || 1) * big, still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { w, h } = plateSize(ctx, text, rank, font), cw = w + ROOM_X * 2, ch = h + ROOM_Y * 2;
    canvas.width = Math.ceil(cw * dpr); canvas.height = Math.ceil(ch * dpr); canvas.style.width = `${cw * big}px`;
    if (holder.current) Object.assign(holder.current.style, { marginLeft: `${-(ROOM_X - WINGS[band]) * big}px`, marginTop: `${-(ROOM_Y - 6) * big}px`, marginBottom: `${-(ROOM_Y - 4) * big}px` });
    const img = new Image(); img.src = ICON_ATLAS.image;
    let frame = 0, gone = false;
    const draw = (now: number) => {
      if (gone) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTitlePlate(ctx, { text, line, rank, x: cw / 2, y: ROOM_Y + h / 2 - (band === 4 ? 3 : band === 3 ? 1 : 0), now, seed: 1, img, font, reduced: still });
      if (!still && band >= 2) frame = requestAnimationFrame(draw);
    };
    img.onload = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    frame = requestAnimationFrame(draw);
    return () => { gone = true; cancelAnimationFrame(frame); };
  }, [text, line, rank, band]);
  return (
    <span ref={holder} className="relative block" style={{ marginLeft: -(ROOM_X - WINGS[band]), marginTop: -(ROOM_Y - 6), marginBottom: -(ROOM_Y - 4) }}>
      <canvas ref={ref} aria-hidden className="pointer-events-none block h-auto max-w-[calc(100%+40px)]" />
      <span className="sr-only">{text}</span>
    </span>
  );
}
