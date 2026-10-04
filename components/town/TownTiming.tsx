"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dropped, finished, markerAt, press, startRound, type Round, type TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { BIG, GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps, type GameResult } from "./TownGame";

/** How a round of the timing game went (what every game gives back: components/town/TownGame). */
export type TimingResult = GameResult;

/**
 * The game of timing on the screen (lib/town/timing): the hoe runs to and fro along a strip of the plot's earth, and
 * the big button (or the space bar) is pressed while it is over the soft stretch. Each hit is a swing of the hoe,
 * and leaves a furrow where it fell; so many and the soil is tilled.
 *
 * It is tilling's game alone now (the owner, 2026-10-04: "การกดตามจังหว่ะ ดูจะมีเยอะไปหน่อย"): what else was this game
 * is each its own (TownWeeding, TownStirring, TownPouring, TownSteady). The swing of a hoe is a thing of timing.
 *
 * Nothing on it says how it works: what moves, the stretch and the squares that fill say it.
 */
export default function TownTiming({ th, title, verb, need, mods, icon = "hoe", onDone, onCancel, onHit }: GameProps & {
  /** The word on the button: what a hit is. */
  verb: string;
  need: number;
  mods: TimingMods;
  /** What runs along the strip: the hoe in the hand. */
  icon?: IconName;
}) {
  const round = useRef<Round>(startRound(need, mods, Math.floor(Math.random() * 2 ** 31)));
  const from = useRef(0);
  const [, setShown] = useState(0);
  /** Where each swing fell along the strip: a furrow is left there. */
  const [furrows, setFurrows] = useState<number[]>([]);
  const marker = useRef<HTMLSpanElement>(null), bar = useRef<HTMLDivElement>(null), tool = useRef<HTMLSpanElement>(null), puff = useRef<HTMLSpanElement>(null);
  const ended = useRef(false);
  useEffect(() => { from.current = performance.now(); }, []);

  useFrames((_dt, t) => {
    if (marker.current) marker.current.style.left = `${markerAt(round.current, (t - from.current) / 1000) * 100}%`;
  });

  const strike = useCallback(() => {
    if (ended.current) return;
    const t = (performance.now() - from.current) / 1000, was = round.current, now = press(was, t);
    round.current = now;
    const hit = now.hits > was.hits;
    onHit?.(hit);
    // a miss jolts the strip; a hit is the hoe coming down, the earth it throws up, and the furrow it leaves
    if (!hit && bar.current) bar.current.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 160 });
    if (hit) {
      tool.current?.animate([{ transform: "rotate(-38deg) translateY(-6px)" }, { transform: "rotate(14deg) translateY(6px)" }, { transform: "rotate(0) translateY(0)" }], { duration: 200 });
      puff.current?.animate([{ opacity: 0.95, transform: "translateY(0) scale(0.7)" }, { opacity: 0, transform: "translateY(-30px) scale(1.5)" }], { duration: 560, easing: "ease-out" });
      setFurrows((f) => [...f, markerAt(was, t)]);
    }
    setShown((n) => n + 1);
    if (finished(now) || dropped(now)) {
      ended.current = true;
      window.setTimeout(() => onDone({ hits: now.hits, misses: now.misses, secs: Math.round(t * 10) / 10, need: now.need, ...(dropped(now) ? { dropped: true } : {}) }), dropped(now) ? 420 : 220);
    }
  }, [onDone, onHit]);

  // The space bar is the big button; Escape gives the work up. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      if (e.key !== " " && e.code !== "Space") return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) strike();
    };
    const up = (e: KeyboardEvent) => { if (e.key === " " || e.code === "Space") { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [strike, onCancel]);

  // (for scripts in `next dev`: the round, and a press; under the game's own name and, as it always was, the timing's)
  const handle = { kind: "timing", round: () => ({ ...round.current, at: markerAt(round.current, (performance.now() - from.current) / 1000) }), press: strike };
  useGameHandle(handle, [strike]);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __townTiming?: typeof handle }).__townTiming = handle;
    return () => { delete (window as unknown as { __townTiming?: typeof handle }).__townTiming; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt with the press
  }, [strike]);

  const r = round.current;
  return (
    <GameFrame th={th} title={title} need={r.need} hits={r.hits} misses={r.misses} most={r.most} onCancel={onCancel}>
      {/* a strip of the plot's earth, the soft stretch in it, the furrows left so far, and the hoe that runs over it */}
      <div className="relative mt-9">
        <div ref={bar} aria-hidden className={`${STAGE} h-11`} data-look="hoe">
          <PixelGround kind="rows" w={96} h={12} className="absolute inset-0 size-full" />
          <span className="absolute inset-y-0 border-x-[3px] border-[#ffe19a] bg-[#f3d08a]/55" style={{ left: `${r.lo * 100}%`, width: `${r.width * 100}%` }} />
          {furrows.map((at, i) => <span key={i} className="absolute inset-y-1 -ml-[5px] w-[10px] border-x-2 border-[#2a190d] bg-[#3b210c]" style={{ left: `${at * 100}%` }} />)}
        </div>
        <span ref={marker} aria-hidden className="pointer-events-none absolute inset-y-0 w-0" style={{ left: "0%" }}>
          <span className="absolute inset-y-[3px] -ml-[1.5px] w-[3px] bg-[#fff6e3]" />
          <span ref={tool} className="absolute -top-8 -ml-[15px] block origin-bottom"><TownIcon name={icon} size={30} /></span>
          <span ref={puff} className="absolute -top-3 -ml-[10px] opacity-0"><TownIcon name="plotSoil" size={20} /></span>
        </span>
      </div>
      <button type="button" onPointerDown={(e) => { e.preventDefault(); strike(); }} className={`${BIG} mt-3`}>
        {verb}<kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
      </button>
    </GameFrame>
  );
}
