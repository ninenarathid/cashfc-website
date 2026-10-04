"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dropped, finished, markerAt, press, startRound, type Round, type TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";

/** How a round of the timing game went. `dropped`: the work was not done (tired hands, and too many misses). */
export interface TimingResult { hits: number; misses: number; secs: number; need: number; dropped?: boolean }
/** What the game is dressed as: a hoe along a strip of earth, a ladle round a pot, a brush along a soapy tub, a can along a strip of water. */
export type TimingLook = "hoe" | "stir" | "scrub" | "water";

/** The two that run along a bar: its ground, the stretch to hit, and the tool that runs over it. */
const STRIPS = {
  hoe: { bar: "linear-gradient(180deg,#4a3320,#33220f)", edge: "#6b4a2a", zone: "rgba(226,184,104,0.5)", line: "#e9c877", tool: "hoe", puff: "plotSoil" },
  scrub: { bar: "linear-gradient(180deg,#2f5874,#1f3d52)", edge: "#4b84a8", zone: "rgba(240,250,255,0.72)", line: "#ffffff", tool: "brush", puff: "puff" },
  water: { bar: "linear-gradient(180deg,#2b6272,#1b4452)", edge: "#4f99a8", zone: "rgba(214,246,252,0.62)", line: "#e8fcff", tool: "can", puff: "plotDrop" },
} as const;

/**
 * The game of timing on the screen (lib/town/timing): something runs to and
 * fro, and the big button (or the space bar) is pressed while it is over the
 * lit stretch. So many hits and the work is done. Hoeing a plot, cooking and
 * scrubbing a pot are all this game, and each looks like the work it is (the
 * owner, 2026-10-03: "การทำอาหาร และ ปลูกพืช ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลา
 * เลย"): a hoe along a strip of earth, a ladle round a pot seen from above,
 * a brush along a soapy tub. The rules are the same for all three.
 *
 * Nothing on it says how it works: what moves, the stretch and the dots that
 * fill say it.
 */
export default function TownTiming({ th, title, verb, need, mods, look, icon, onDone, onCancel, onHit }: {
  th: boolean;
  title: string;
  /** The word on the button: what a hit is. */
  verb: string;
  need: number;
  mods: TimingMods;
  /** What it is dressed as (a plain bar, with none). */
  look?: TimingLook;
  /** What runs along the strip, in place of the look's own tool: the thing in the hand, for the farm's lighter work. */
  icon?: IconName;
  onDone: (result: TimingResult) => void;
  onCancel: () => void;
  /** Told at each press, a hit or a miss: for a sound. */
  onHit?: (hit: boolean) => void;
}) {
  const round = useRef<Round>(startRound(need, mods, Math.floor(Math.random() * 2 ** 31)));
  const from = useRef(0);
  const [, setShown] = useState(0);
  const marker = useRef<HTMLSpanElement>(null), bar = useRef<HTMLDivElement>(null), tool = useRef<HTMLSpanElement>(null), puff = useRef<HTMLSpanElement>(null);
  const ended = useRef(false);
  const round_ = look === "stir";

  useEffect(() => {
    from.current = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const at = markerAt(round.current, (t - from.current) / 1000);
      // round the pot and back again; or along the bar and back
      if (marker.current) { if (round_) marker.current.style.transform = `rotate(${at * 360}deg)`; else marker.current.style.left = `${at * 100}%`; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [round_]);

  const strike = useCallback(() => {
    if (ended.current) return;
    const t = (performance.now() - from.current) / 1000, was = round.current, now = press(was, t);
    round.current = now;
    const hit = now.hits > was.hits;
    onHit?.(hit);
    // a miss shakes it; a hit is the tool at its work, and what comes up from it
    if (!hit && bar.current) bar.current.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 160 });
    if (hit) {
      tool.current?.animate(look === "hoe" ? [{ transform: "rotate(-38deg) translateY(-6px)" }, { transform: "rotate(10deg) translateY(5px)" }, { transform: "rotate(0) translateY(0)" }]
        : look === "scrub" ? [{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }]
          : look === "water" ? [{ transform: "rotate(0) translateY(0)" }, { transform: "rotate(30deg) translateY(4px)" }, { transform: "rotate(0) translateY(0)" }]
          : [{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 200 });
      puff.current?.animate([{ opacity: 0.95, transform: "translateY(0) scale(0.7)" }, { opacity: 0, transform: "translateY(-30px) scale(1.5)" }], { duration: 560, easing: "ease-out" });
    }
    setShown((n) => n + 1);
    if (finished(now) || dropped(now)) {
      ended.current = true;
      window.setTimeout(() => onDone({ hits: now.hits, misses: now.misses, secs: Math.round(t * 10) / 10, need: now.need, ...(dropped(now) ? { dropped: true } : {}) }), dropped(now) ? 420 : 220);
    }
  }, [onDone, onHit, look]);

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

  // (for scripts in `next dev`: the round, and a press)
  useEffect(() => {
    const handle = {
      round: () => ({ ...round.current, at: markerAt(round.current, (performance.now() - from.current) / 1000) }),
      press: strike, look: look ?? null,
    };
    (window as unknown as { __townTiming?: typeof handle }).__townTiming = handle;
    return () => { delete (window as unknown as { __townTiming?: typeof handle }).__townTiming; };
  }, [strike, look]);

  const r = round.current, strip = look && look !== "stir" ? STRIPS[look] : null;
  return (
    <section aria-label={title} className="rounded-2xl border border-line-lit bg-surface/97 px-4 pb-3 pt-3 shadow-xl shadow-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-title font-semibold text-ink">{title}</h2>
        {/* a dot for each hit wanted, filled as they come */}
        <span className="ml-2 flex gap-1" aria-label={`${r.hits} / ${r.need}`}>
          {Array.from({ length: r.need }, (_, i) => <span key={i} className={`size-2.5 rounded-full ${i < r.hits ? "bg-jade" : "bg-line-strong"}`} />)}
        </span>
        {/* tired hands: a mark for each miss they still have in them, going out one by one (said by nothing but itself) */}
        {r.most > 0 ? (
          <span className="ml-1 flex gap-1" aria-label={`${Math.max(0, r.most - r.misses)} / ${r.most}`} data-misses-left={Math.max(0, r.most - r.misses)}>
            {Array.from({ length: r.most }, (_, i) => <span key={i} className={`size-2 rotate-45 ${i < r.most - r.misses ? "bg-chili" : "bg-line"}`} />)}
          </span>
        ) : r.misses > 0 && <span className="font-data text-meta tabular-nums text-chili">×{r.misses}</span>}
        <button type="button" onClick={onCancel} className="pressable -mr-1 ml-auto rounded-full px-3 py-1.5 text-meta text-muted hover:text-ink">{th ? "เลิก" : "Stop"}</button>
      </div>
      {round_ ? (
        // a pot seen from above: its rim, what simmers in it, the stretch of the rim to stir at, and the ladle going round
        <div ref={bar} aria-hidden className="relative mx-auto mt-3 size-40" data-look="stir">
          <span className="absolute inset-0 rounded-full bg-[#7a3f22] shadow-[inset_0_0_0_3px_#4a2412]" />
          <span className="absolute inset-[9px] overflow-hidden rounded-full bg-[radial-gradient(circle_at_38%_32%,#f3b45c,#cf7a2c_62%,#a8551c)] shadow-[inset_0_0_10px_rgba(60,25,5,0.6)]">
            <span className="absolute inset-0 animate-[spin_4s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,rgba(255,236,190,0.28),transparent_28%,rgba(255,236,190,0.18)_52%,transparent_78%)] motion-reduce:animate-none" />
          </span>
          <span className="absolute inset-[1px] rounded-full"
                style={{
                  background: `conic-gradient(from ${r.lo * 360}deg, rgba(126,236,176,0.95) 0deg ${r.width * 360}deg, transparent ${r.width * 360}deg)`,
                  WebkitMask: "radial-gradient(farthest-side, transparent 78%, #000 80%)", mask: "radial-gradient(farthest-side, transparent 78%, #000 80%)",
                }} />
          <span ref={marker} className="absolute inset-0" style={{ transform: "rotate(0deg)" }}>
            <span ref={tool} className="absolute left-1/2 top-[2px] -ml-[18px] block"><TownIcon name="ladle" size={36} /></span>
          </span>
          <span ref={puff} className="pointer-events-none absolute left-1/2 top-[34%] -ml-[14px] opacity-0"><TownIcon name="puff" size={28} /></span>
        </div>
      ) : strip ? (
        // a strip of earth, or of soapy water, and the tool that runs along it
        <div ref={bar} aria-hidden className="relative mt-9 h-9 rounded-lg border-2" data-look={look} style={{ background: strip.bar, borderColor: strip.edge }}>
          <span className="absolute inset-y-0 border-x-2" style={{ left: `${r.lo * 100}%`, width: `${r.width * 100}%`, background: strip.zone, borderColor: strip.line }} />
          <span ref={marker} className="absolute inset-y-0 w-0" style={{ left: "0%" }}>
            <span className="absolute inset-y-0 -ml-px w-[2px] bg-ink/80" />
            <span ref={tool} className="absolute -top-8 -ml-[15px] block origin-bottom"><TownIcon name={icon ?? strip.tool} size={30} /></span>
            <span ref={puff} className="pointer-events-none absolute -top-3 -ml-[10px] opacity-0"><TownIcon name={strip.puff} size={20} /></span>
          </span>
        </div>
      ) : (
        <div ref={bar} aria-hidden className="relative mt-3 h-9 overflow-hidden rounded-lg border border-line-strong bg-bg/60">
          <span className="absolute inset-y-0 border-x-2 border-jade bg-jade/45" style={{ left: `${r.lo * 100}%`, width: `${r.width * 100}%` }} />
          <span ref={marker} className="absolute inset-y-0 -ml-[2px] w-[4px] bg-ink shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ left: "0%" }} />
        </div>
      )}
      <button type="button" onPointerDown={(e) => { e.preventDefault(); strike(); }}
              className="mt-3 min-h-14 w-full touch-none select-none rounded-2xl bg-accent text-read font-semibold text-bg active:brightness-125">
        {verb}<kbd aria-hidden className="ml-2 hidden rounded border border-bg/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
      </button>
    </section>
  );
}
