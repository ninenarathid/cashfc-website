"use client";

import { useEffect, useRef } from "react";
import { drawForgeEffects } from "@/lib/town/forge-effects";
import { showMs, type ForgeShow } from "@/lib/town/forge-show";

/** Local forge canvas: bounded to 30 fps, asleep when hidden, with no React updates per frame. */
export default function TownForgeEffects({ show, reduced, x, y }: { show: ForgeShow; reduced: boolean; x: number; y: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0, timer = 0, width = 0, height = 0, disposed = false;
    const clear = () => ctx.clearRect(0, 0, width, height);
    const frame = () => {
      if (disposed || document.hidden) return;
      const wall = performance.now(); clear();
      if (wall - show.at >= showMs(show)) return;
      ctx.save(); ctx.translate(width * x, height * y);
      const scale = Math.min(1.6, Math.max(.8, width / 300)); ctx.scale(scale, scale);
      drawForgeEffects(ctx, show, 0, 0, wall, reduced); ctx.restore();
      if (!reduced) timer = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 1000 / 30);
      else timer = window.setTimeout(clear, Math.max(0, show.at + showMs(show) - wall));
    };
    const stop = () => { cancelAnimationFrame(raf); window.clearTimeout(timer); };
    const resize = () => {
      stop(); const box = canvas.getBoundingClientRect(); width = box.width; height = box.height;
      const ratio = Math.min(1.5, window.devicePixelRatio || 1); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); frame();
    };
    const visibility = () => { stop(); if (!document.hidden) frame(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    document.addEventListener("visibilitychange", visibility); resize();
    return () => { disposed = true; stop(); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [show, reduced, x, y]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" data-smith-effects={show.out ?? "knocks"} />;
}
