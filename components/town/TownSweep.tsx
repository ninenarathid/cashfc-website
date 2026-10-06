"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bladeAt, cuts, over, paceAt, startSweep, sweepSecs, swept, swing, type Sweep } from "@/lib/town/sweep";
import type { TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { BIG, GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** A plant of the row to cut: where it stands along the row, its picture, and how much harder it is for whoever sweeps (1: as for everybody). */
export interface SweepPlant { place: number; icon: IconName; hard: number }

/**
 * The crescent sickle's sweep on the screen (lib/town/sweep): the row lies across the board, each ripe plant at its
 * own place in it, with the cut marked at its foot. The blade sets off from before the first of them and sweeps
 * along the row once, gathering pace; the big button (or the space bar) is pressed as it passes each plant. A plant
 * cut within its mark flies up bright; one cut outside it, or passed with no swing, is gathered plainly.
 *
 * The farm's one game that is a single pass: nothing is tried twice, and it is over in a few seconds.
 *
 * Nothing on it says how it works: the blade, the marks and what the plants do say it.
 */
export default function TownSweep({ th, title, verb, plants, mods, side = 7, onDone, onCancel, onHit }: GameProps & {
  /** The word on the button: what a swing is. */
  verb: string;
  plants: SweepPlant[];
  mods: TimingMods;
  /** How many plots the row has. */
  side?: number;
}) {
  const sorted = useRef([...plants].sort((a, b) => a.place - b.place)).current;
  const sweep = useRef<Sweep>(startSweep(sorted.map((p) => p.place), mods, sorted.map((p) => p.hard)));
  /** When the blade sets off, by the page's clock: a moment after the board comes up, to make ready in. */
  const from = useRef(0);
  const [, setShown] = useState(0);
  /** How many plants the blade has gone past: each of them not swung at was missed. And where the blade was when the board last drew a frame (before the first: where it sets off from). */
  const gone = useRef(0), seen = useRef(sweep.current.from);
  const blade = useRef<HTMLSpanElement>(null), tool = useRef<HTMLSpanElement>(null);
  const ended = useRef(false);
  useEffect(() => { from.current = performance.now() + 550; }, []);
  const secs = () => (performance.now() - from.current) / 1000;
  /** Where a place along the row is across the board, as a share of its width: the row, and a plot's width before it for the blade to come in by. */
  const across = (v: number) => ((v + 1) / (side + 1)) * 100;

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    const s = sweep.current, how = cuts(s), hits = how.filter(Boolean).length;
    window.setTimeout(() => onDone({ hits, misses: how.length - hits, secs: Math.round(sweepSecs(s) * 10) / 10, need: how.length, marks: how }), 320);
  }, [onDone]);

  useFrames(() => {
    const t = secs(), s = sweep.current, x = bladeAt(s, t);
    seen.current = x;
    if (blade.current) blade.current.style.left = `${across(x)}%`;
    // (a plant the blade has gone past without a swing was missed: shown as it is passed)
    const past = s.places.filter((p) => x >= p + 1).length;
    if (past !== gone.current) { gone.current = past; setShown((n) => n + 1); }
    if (swept(s, t)) finish();
  });

  const strike = useCallback(() => {
    const t = secs();
    if (ended.current || t < 0) return;
    const was = sweep.current, i = over(was, t), now = swing(was, t);
    sweep.current = now;
    const well = i >= 0 && was.cut[i] === null && now.cut[i] === true;
    onHit?.(well);
    tool.current?.animate([{ transform: "rotate(-70deg)" }, { transform: "rotate(35deg)" }, { transform: "rotate(0)" }], { duration: 170, easing: "ease-out" });
    setShown((n) => n + 1);
    // (the last plant swung at: nothing is left to wait for)
    if (now.cut.every((c) => c !== null)) finish();
  }, [finish, onHit]);

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

  // (for scripts in `next dev`: the sweep, where the blade is, which plant it is over, and a swing)
  useGameHandle({ kind: "sweep", state: () => { const t = secs(), s = sweep.current; return { ...s, t, at: bladeAt(s, t), pace: paceAt(s, t), over: over(s, t), ended: ended.current }; }, press: strike }, [strike]);

  const s = sweep.current, how = cuts(s), x = seen.current;
  const hits = how.filter(Boolean).length, missed = s.places.filter((p, i) => s.cut[i] === false || (s.cut[i] === null && x >= p + 1)).length;
  return (
    <GameFrame th={th} title={title} need={s.places.length} hits={hits} misses={missed} most={0} onCancel={onCancel}>
      {/* the row from one end to the other: each ripe plant at its place, the cut marked at its foot, and the blade going along it once */}
      <div className="relative mt-1">
        <div aria-hidden className={`${STAGE} h-[5.5rem]`} data-look="sweep">
          <PixelGround kind="rows" w={98} h={22} className="absolute inset-0 size-full" />
          {/* the plots of the row, each a seventh of it */}
          {Array.from({ length: side + 1 }, (_, i) => <span key={i} className="absolute inset-y-0 border-l-2 border-[#2a190d]/45" style={{ left: `${across(i)}%` }} />)}
          {/* (the grass at the row's head, where the blade comes in) */}
          <span className="absolute inset-y-0 left-0 bg-[#2f4a1f]/70" style={{ width: `${across(0)}%` }} />
          {sorted.map((p, i) => {
            const cut = s.cut[i], passed = cut === null && x >= p.place + 1, state = cut === true ? "well" : cut === false || passed ? "badly" : "stands";
            return (
              <span key={p.place} className="absolute inset-y-0" style={{ left: `${across(p.place)}%`, width: `${100 / (side + 1)}%` }} data-sweep-plant={state}>
                {/* the cut: within it the plant is cut well */}
                <span className={`absolute bottom-0 h-2.5 -translate-x-1/2 border-x-2 ${state === "well" ? "border-[#bff29a] bg-[#8fd45f]" : state === "badly" ? "border-[#8a3a2a] bg-[#c8553d]/70" : "border-[#ffe19a] bg-[#f3d08a]/80"}`}
                      style={{ left: "50%", width: `${s.bands[i] * 100}%` }} />
                <span className={`absolute bottom-2 left-1/2 block origin-bottom -translate-x-1/2 transition-all duration-300 motion-reduce:transition-none ${state === "well" ? "-translate-y-3 scale-110" : state === "badly" ? "translate-y-1 rotate-12 opacity-45 grayscale" : ""}`}>
                  <TownIcon name={p.icon} size={34} />
                </span>
                {/* one more, of a plant cut well: it goes up from it */}
                {state === "well" && <span className="pop-in absolute left-1/2 top-0 -translate-x-1/2 font-data text-meta font-semibold tabular-nums text-[#e8ffd0] [text-shadow:0_1px_0_#2a190d]" data-state="open">+1</span>}
              </span>
            );
          })}
        </div>
        {/* the blade: a hairline where it cuts, and the sickle over it */}
        <span ref={blade} aria-hidden className="pointer-events-none absolute inset-y-0 w-0" style={{ left: `${across(x)}%` }}>
          <span className="absolute inset-y-[3px] -ml-px w-[2px] bg-[#f4f7ff] shadow-[0_0_6px_2px_rgba(214,228,255,0.7)]" />
          <span className="absolute inset-y-[3px] -ml-[14px] w-[13px] bg-gradient-to-r from-transparent to-[#d6e4ff]/45 motion-reduce:hidden" />
          <span ref={tool} className="absolute -top-3 -ml-[17px] block origin-[70%_80%]"><TownIcon name={"charmSickle" as IconName} size={34} /></span>
        </span>
      </div>
      <button type="button" onPointerDown={(e) => { e.preventDefault(); strike(); }} className={`${BIG} mt-3`}>
        {verb}<kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
      </button>
    </GameFrame>
  );
}
