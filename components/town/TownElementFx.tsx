"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { heldStack } from "@/lib/town/trade";
import { elementAction, type ElementAction } from "@/lib/town/element-action";
import { ACTION_LIFE, ElementBursts, paintElementAction } from "./element-action-art";
import { announceElementAction } from "./element-action-events";

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
export default function TownElementFx({ pulse, active, x = 0.5, y = 0.55, target = ".town-game-stage", anchor }: {
  pulse: string | number; active: boolean; x?: number; y?: number; target?: string; anchor?: string;
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
    let settled = 0;
    let stage: HTMLElement | null = null;
    const pool = bursts.current;
    const measure = () => {
      stage = parent.querySelector<HTMLElement>(target);
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
    const point = () => {
      const held = anchor ? stage?.querySelector<HTMLElement>(anchor) : null;
      if (!held || !stage || !width || !height) return { x: input.current.x, y: input.current.y };
      const at = held.getBoundingClientRect(), box = stage.getBoundingClientRect();
      return { x: Math.max(.08, Math.min(.92, (at.left + at.width / 2 - box.left) / width)),
        y: Math.max(.2, Math.min(.8, (at.top + at.height / 2 - box.top) / height)) };
    };
    const paint = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      // Wide, shallow stages need smaller material motion so crests/flame tips
      // stay within the play area and the fish remains easy to read.
      const scale = Math.max(0.8, Math.min(2, width / 200, height / 80));
      for (const burst of pool.alive(now)) paintElementAction(ctx, { ...burst, x: burst.x * width, y: burst.y * height }, now, scale, still);
    };
    const step = (now: number) => {
      raf = 0;
      if (document.hidden || still) return;
      if (now - last >= 1000 / 30) {
        last = now;
        if (input.current.active && now - trail >= 1350) {
          const at = point(); pool.add(look, now, at.x, at.y, true); trail = now;
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
      const at = point(); pool.add(look, now, at.x, at.y, soft); trail = now;
      if (!soft) announceElementAction(look);
      paint(now); start();
      if (still) {
        clearTimeout(settled);
        settled = window.setTimeout(() => { pool.clear(); ctx.clearRect(0, 0, width, height); }, ACTION_LIFE);
      }
    };
    const visibility = () => {
      if (raf) cancelAnimationFrame(raf); raf = 0; pool.clear(); ctx.clearRect(0, 0, width, height);
      clearTimeout(settled);
      if (!document.hidden) wake.current(true);
    };
    const observer = new ResizeObserver(() => { measure(); if (still) wake.current(true); else start(); });
    observer.observe(parent);
    measure(); wake.current(true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect(); document.removeEventListener("visibilitychange", visibility);
      clearTimeout(settled);
      if (raf) cancelAnimationFrame(raf); pool.clear(); wake.current = () => {};
    };
  }, [look, context.reduced, target, anchor]);
  useEffect(() => {
    if (previous.current !== pulse) { previous.current = pulse; wake.current(); }
  }, [pulse]);
  // A stage may change during fishing; each phase pulse also remeasures it.
  return look ? <canvas ref={canvas} aria-hidden data-town-element-fx={look.key} className="pointer-events-none absolute z-[2]" /> : null;
}
