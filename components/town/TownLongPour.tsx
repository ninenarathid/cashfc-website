"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { atMarks, front, longOver, pourOn, reached, startLong, type LongPour } from "@/lib/town/longpour";
import type { TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { BIG, GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** A plant of the row to water: where it stands along the row, and its picture. */
export interface PourPlant { place: number; icon: IconName }

/**
 * The long pour on the screen (lib/town/longpour): the row lies across the board, each thirsty plant at its own
 * place. While the big button is held the water runs along the row from its head, the can going with it, and each
 * plant it comes to is watered there and then. Beyond the last plant stand the two marks: let go between them, the
 * whole row has had its water; let go sooner, the plants ahead of the water stay dry; held past them, it runs out
 * of the bed, and the last plants are washed dry of it.
 *
 * One pour and no second try: it is over in a few seconds.
 *
 * Nothing on it says how it works: the water, the marks and what the plants do say it.
 */
export default function TownLongPour({ th, title, verb, plants, mods, hard = 1, icon, side = 7, onDone, onCancel, onHit }: GameProps & {
  /** The word on the button: what holding it does. */
  verb: string;
  plants: PourPlant[];
  mods: TimingMods;
  /** How much harder the row is for whoever pours (1: as for everybody). */
  hard?: number;
  /** What the water is poured from: the can in the hand. */
  icon: IconName;
  /** How many plots the row has. */
  side?: number;
}) {
  const sorted = useRef([...plants].sort((a, b) => a.place - b.place)).current;
  const game = useRef<LongPour>(startLong(sorted.map((p) => p.place), mods, hard, Math.floor(Math.random() * 2 ** 31)));
  const holding = useRef(false), ended = useRef(false);
  /** For a script: a hand that lets go by itself once the water has got so far along the row (in plots), or never (Infinity: it is spilt). */
  const until = useRef<number | null>(null);
  /** How many plants the water has reached: the board is drawn again as each is. */
  const wet = useRef(0);
  const [, setShown] = useState(0);
  const stream = useRef<HTMLSpanElement>(null), can = useRef<HTMLSpanElement>(null);
  /** Where a place along the row is across the board, as a share of its width: the row, a plot's width before it for the water to come in by, and a plot's beyond it for the marks. */
  const across = (v: number) => ((v + 1) / (side + 2)) * 100;

  useFrames((dt) => {
    if (ended.current) return;
    const was = game.current;
    let now = was;
    if (until.current === null) now = pourOn(was, holding.current, dt);
    // (a script's hand: in steps too small to overshoot the place it means to let go at)
    else for (let left = dt; left > 0 && !longOver(now); left -= 0.002) now = pourOn(now, front(now) < until.current, Math.min(left, 0.002));
    game.current = now;
    const x = front(now);
    if (stream.current) stream.current.style.width = `${Math.max(0, across(x) - across(now.from))}%`;
    if (can.current) { can.current.style.left = `${across(x)}%`; can.current.dataset.tipped = String(now.held); }
    const n = now.places.filter((p) => x >= p + 0.5).length;
    if (n !== wet.current) { wet.current = n; onHit?.(true); setShown((k) => k + 1); }
    if (now.held !== was.held) setShown((k) => k + 1);
    if (longOver(now)) {
      ended.current = true;
      const how = reached(now), hits = how.filter(Boolean).length;
      if (now.spilt) onHit?.(false);
      setShown((k) => k + 1);
      window.setTimeout(() => onDone({ hits, misses: how.length - hits, secs: Math.round(now.t * 10) / 10, need: how.length, marks: how }), now.spilt ? 620 : 420);
    }
  });

  const hold = useCallback((on: boolean) => { holding.current = on; }, []);

  // The space bar is the big button, held and let go; Escape gives the work up. Heard before the town hears them.
  useEffect(() => {
    const key = (on: boolean) => (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape" && on) { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      if (e.key !== " " && e.code !== "Space") return;
      e.preventDefault();
      e.stopPropagation();
      hold(on);
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [hold, onCancel]);

  // (for scripts in `next dev`: the pour as it stands, the button, and a hand that lets go by itself: between the marks
  // at a share of the way across them, as the water passes a plant, or never)
  const letGoAt = useCallback((at: number | null) => { until.current = at; }, []);
  useGameHandle({
    kind: "longpour", state: () => { const s = game.current; return { ...s, front: front(s), good: atMarks(s), reached: reached(s), ended: ended.current }; }, hold,
    steady: (share: number) => letGoAt(game.current.end + game.current.zone * share), stopAfter: (i: number) => letGoAt(game.current.places[i] + 0.56), spill: () => letGoAt(Infinity),
  }, [hold, letGoAt]);

  const s = game.current, x = front(s), over = longOver(s), how = over ? reached(s) : s.places.map((p) => x >= p + 0.5);
  const hits = how.filter(Boolean).length;
  return (
    <GameFrame th={th} title={title} need={s.places.length} hits={hits} misses={over ? how.length - hits : 0} most={0} onCancel={onCancel}>
      <div className="relative mt-1">
        <div aria-hidden className={`${STAGE} h-[7.5rem]`} data-look="longpour" data-spilt={s.spilt}>
          <PixelGround kind="rows" w={98} h={22} className="absolute inset-0 size-full" />
          {/* the plots of the row */}
          {Array.from({ length: side + 1 }, (_, i) => <span key={i} className="absolute inset-y-0 border-l-2 border-[#2a190d]/45" style={{ left: `${across(i)}%` }} />)}
          {/* (the grass at the row's head, where the water comes in, and at its foot, where it would run out) */}
          <span className="absolute inset-y-0 left-0 bg-[#2f4a1f]/70" style={{ width: `${across(0)}%` }} />
          <span className="absolute inset-y-0 right-0 bg-[#2f4a1f]/70" style={{ width: `${100 - across(side)}%` }} />
          {/* the water as far as it has run */}
          <span ref={stream} className="absolute bottom-0 h-3 border-t-[3px] border-[#bfe6ff] bg-[#3f96c2] data-[spilt=true]:bg-[#7d8f9a]" data-spilt={s.spilt} style={{ left: `${across(s.from)}%`, width: `${Math.max(0, across(x) - across(s.from))}%` }} />
          {/* the two marks beyond the last plant: let go between them, the whole row is watered */}
          <span className={`absolute bottom-0 h-9 border-x-[3px] ${over && !s.spilt && s.at !== null && s.at >= s.end ? "border-[#d6ffe0] bg-[#5cc58d]/70" : "border-[#ffe19a] bg-[#ffe19a]/30"}`}
                style={{ left: `${across(s.end)}%`, width: `${across(s.end + s.zone) - across(s.end)}%`, minWidth: 6 }} data-marks />
          {sorted.map((p, i) => {
            const state = how[i] ? "wet" : over ? "dry" : "waits";
            return (
              <span key={p.place} className="absolute inset-y-0" style={{ left: `${across(p.place)}%`, width: `${100 / (side + 2)}%` }} data-pour-plant={state}>
                <span className={`absolute bottom-3 left-1/2 block origin-bottom -translate-x-1/2 transition-all duration-300 motion-reduce:transition-none ${state === "wet" ? "scale-110" : state === "dry" ? "opacity-45 grayscale" : ""}`}>
                  <TownIcon name={p.icon} size={34} />
                </span>
                {/* a drop over a plant the water has reached */}
                {state === "wet" && <span className="pop-in absolute bottom-[3.1rem] left-1/2 -translate-x-1/2" data-state="open"><TownIcon name="plotDrop" size={16} /></span>}
              </span>
            );
          })}
        </div>
        {/* the can, going along with the water's head: tipped while the button is held */}
        <span ref={can} aria-hidden data-tipped="false" className="pointer-events-none absolute top-1 block w-0 data-[tipped=true]:[&>span]:rotate-[38deg]" style={{ left: `${across(x)}%` }}>
          <span className="-ml-[30px] block origin-bottom-right transition-transform duration-100 motion-reduce:transition-none"><TownIcon name={icon} size={34} /></span>
        </span>
      </div>
      <button type="button" className={`${BIG} mt-3`} disabled={over}
              onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold(true); }}
              onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)}>
        {s.spilt ? (th ? "น้ำล้นแปลง" : "Spilt") : verb}
        <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
      </button>
    </GameFrame>
  );
}
