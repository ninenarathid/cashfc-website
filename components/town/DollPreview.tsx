"use client";

import { useEffect, useRef, useState } from "react";
import { KIT_SHEET_EVENT } from "@/lib/town/pixeldoll";

/**
 * A small picture drawn by the doll's own code, crisp at the screen's own pixels (the wardrobe's cards, Granny Twilla's
 * rails and her auction's lots). Drawn again when an outfit's own picture comes: the starter's body stands in until
 * then (lib/town/pixeldoll).
 */
export default function DollPreview({ w, h, draw, deps }: { w: number; h: number; draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void; deps: unknown[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sheets, setSheets] = useState(0);
  useEffect(() => {
    const came = () => setSheets((n) => n + 1);
    window.addEventListener(KIT_SHEET_EVENT, came);
    return () => window.removeEventListener(KIT_SHEET_EVENT, came);
  }, []);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    c.width = w * dpr; c.height = h * dpr;
    ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx, c.width, c.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, sheets]);
  return <canvas ref={ref} aria-hidden style={{ width: w, height: h, imageRendering: "pixelated" }} />;
}
