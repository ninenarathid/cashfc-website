"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { heldStack } from "@/lib/town/trade";
import { elementAction, type ElementAction } from "@/lib/town/element-action";
import { ElementBursts, paintElementAction } from "./element-action-art";

const ElementContext = createContext({ word: "null", reduced: false });
const empty = () => "null";
export function TownElementProvider({ keeper, reduced, children }: { keeper: Keeper | null; reduced: boolean; children: ReactNode }) {
  const subscribe = useCallback((fn: () => void) => keeper?.watch(fn) ?? (() => {}), [keeper]);
  const snapshot = useCallback(() => JSON.stringify(elementAction(keeper ? heldStack(keeper.purse(), keeper.handSlot()) : null)), [keeper]);
  const word = useSyncExternalStore(subscribe, snapshot, empty);
  const value = useMemo(() => ({ word, reduced }), [word, reduced]);
  return <ElementContext.Provider value={value}>{children}</ElementContext.Provider>;
}

/** One loadout per round. Hit bursts and a quiet working trail share the map's renderer. */
export default function TownElementFx({ pulse, active, x = 0.5, y = 0.55, target = ".town-game-stage" }: {
  pulse: string | number; active: boolean; x?: number; y?: number; target?: string;
}) {
  const context = useContext(ElementContext);
  const [look] = useState<ElementAction | null>(() => JSON.parse(context.word));
  const canvas = useRef<HTMLCanvasElement>(null);
  const bursts = useRef(new ElementBursts());
  const input = useRef({ active, x, y });
  const wake = useRef<(soft?: boolean) => void>(() => {});
  const previous = useRef(pulse);
  useEffect(() => { input.current = { active, x, y }; }, [active, x, y]);
  useEffect(() => {
    if (!look || !canvas.current) return;
    const el = canvas.current, parent = el.parentElement;
    if (!parent) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const still = context.reduced;
    let width = 0, height = 0, raf = 0, last = 0, trail = 0;
    const pool = bursts.current;
    const measure = () => {
      const stage = parent.querySelector<HTMLElement>(target);
      if (!stage) { width = height = 0; el.width = el.height = 0; return; }
      const box = stage.getBoundingClientRect(), origin = parent.getBoundingClientRect();
      width = Math.round(box.width); height = Math.round(box.height);
      el.style.left = `${box.left - origin.left - parent.clientLeft}px`;
      el.style.top = `${box.top - origin.top - parent.clientTop}px`;
      el.style.width = `${width}px`; el.style.height = `${height}px`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const scale = Math.max(0.8, Math.min(2, width / 200));
      for (const burst of pool.alive(now)) paintElementAction(ctx, { ...burst, x: burst.x * width, y: burst.y * height }, now, scale, still);
    };
    const step = (now: number) => {
      raf = 0;
      if (document.hidden || still) return;
      if (now - last >= 1000 / 30) {
        last = now;
        if (input.current.active && now - trail >= 1350) {
          pool.add(look, now, input.current.x, input.current.y, true); trail = now;
        }
        paint(now);
      }
      if (input.current.active || pool.alive(now).length) raf = requestAnimationFrame(step);
    };
    const start = () => { if (!raf && !still && !document.hidden) raf = requestAnimationFrame(step); };
    wake.current = (soft = false) => {
      if (document.hidden) return;
      measure();
      const now = performance.now();
      if (still) pool.clear();
      pool.add(look, now, input.current.x, input.current.y, soft); trail = now;
      paint(now); start();
    };
    const visibility = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0; pool.clear(); ctx.clearRect(0, 0, width, height);
      if (!document.hidden) wake.current(true);
    };
    const observer = new ResizeObserver(() => { measure(); if (still) wake.current(true); else start(); });
    observer.observe(parent);
    measure(); wake.current(true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect(); document.removeEventListener("visibilitychange", visibility);
      if (raf) cancelAnimationFrame(raf); pool.clear(); wake.current = () => {};
    };
  }, [look, context.reduced, target]);
  useEffect(() => {
    if (previous.current !== pulse) { previous.current = pulse; wake.current(); }
  }, [pulse]);
  // A stage may change during fishing; each phase pulse also remeasures it.
  return look ? <canvas ref={canvas} aria-hidden data-town-element-fx={look.key} className="pointer-events-none absolute z-[2]" style={{ imageRendering: "pixelated" }} /> : null;
}
