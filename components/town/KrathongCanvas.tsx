"use client";
import { useEffect, useRef, useState } from "react";
import { CANVAS, drawKrathong, krathongImage } from "@/lib/town/krathong-art";
import type { Design } from "@/lib/town/krathong";

/** Night water under a krathong: deep blue, a moon's path of light across it, faint ripples. */
const WATER: React.CSSProperties = {
  backgroundColor: "#0e1c2f",
  backgroundImage: "radial-gradient(ellipse 45% 30% at 50% 78%, rgba(255,226,150,0.22), transparent 70%), repeating-linear-gradient(180deg, transparent 0 9px, rgba(140,190,255,0.07) 9px 11px)",
  borderRadius: 12,
};

/**
 * A krathong drawn at a whole-number zoom (pixel art stays crisp), its light flickering through its three frames
 * unless the reader asked for less motion. `water` lays it on a strip of moonlit water.
 */
export default function KrathongCanvas({ design, zoom, water = false, still = false, className = "" }: {
  design: Design; zoom: number; water?: boolean; still?: boolean; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [, setReady] = useState(0);
  const [w, h] = CANVAS;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = still || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    let frame = 0, raf = 0, last = 0;
    const paint = (t: number) => {
      if (t - last >= 180 || !last) {
        last = t;
        ctx.clearRect(0, 0, c.width, c.height);
        if (!drawKrathong(ctx, design, 0, 0, zoom, frame)) krathongImage(() => setReady((n) => n + 1));
        frame = (frame + 1) % 3;
      }
      if (!reduced) raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [design, zoom, still]);
  return (
    <span className={`relative inline-grid place-items-center ${className}`} style={water ? WATER : undefined}>
      <canvas ref={ref} width={w * zoom} height={h * zoom} aria-hidden className="relative [image-rendering:pixelated]" style={{ width: w * zoom, height: h * zoom }} />
    </span>
  );
}
