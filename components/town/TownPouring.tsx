"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { between, dropped, pour, poured, startPour, type Pour } from "@/lib/town/pouring";
import type { TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { BIG, GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/**
 * Pouring water on the screen (lib/town/pouring): the thing the water is in (the can, the bucket), tipped while the
 * button is held (or dipped, where water is taken up), and beside it how high the water stands, with the two marks
 * it has to stand between when the button is let go. Over the brim and it is spilt.
 *
 * Tired hands play it for everything that is done with water: watering a plant, drawing a bucket at the river,
 * pouring it into the well, filling a can. The big button is held and let go; the space bar is the same button.
 */
export default function TownPouring({ th, title, verb, need, mods, icon, into, taking = false, onDone, onCancel, onHit }: GameProps & {
  /** The word on the button. */
  verb: string;
  need: number;
  mods: TimingMods;
  /** What the water is poured from: the thing in the hand. */
  icon: IconName;
  /** What it is poured into, or onto; or, where water is taken up (a bucket at the river, a can at the well), what it is taken from. */
  into: IconName;
  /** Whether the water is taken up, not poured out: the thing is dipped, not tipped, and it is its own filling that rises. */
  taking?: boolean;
}) {
  const game = useRef<Pour>(startPour(need, mods, Math.floor(Math.random() * 2 ** 31)));
  const from = useRef(0), ended = useRef(false), holding = useRef(false);
  /** For a script: a hand that lets go by itself, so far between the marks (a share of the way from the lower to the upper). */
  const sure = useRef<number | null>(null);
  const [, setShown] = useState(0);
  const water = useRef<HTMLSpanElement>(null), vessel = useRef<HTMLSpanElement>(null), stream = useRef<HTMLSpanElement>(null), tube = useRef<HTMLDivElement>(null);
  useEffect(() => { from.current = performance.now(); }, []);

  useFrames((dt) => {
    if (ended.current) return;
    const was = game.current;
    let now = was;
    if (sure.current === null) now = pour(was, holding.current, dt);
    // (a script's hand: in steps too small to overshoot the place it means to let go at)
    else for (let left = dt; left > 0; left -= 0.002) now = pour(now, !now.spilt && now.level < now.lo + now.width * sure.current, Math.min(left, 0.002));
    game.current = now;
    if (now.hits > was.hits) onHit?.(true);
    if (now.misses > was.misses) {
      onHit?.(false);
      tube.current?.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 180 });
    }
    // drawn every frame, straight on the page: the water, the thing tipped, what runs out of it
    if (water.current) { water.current.style.height = `${now.level * 100}%`; water.current.dataset.good = String(between(now)); }
    const tipped = now.held && !now.spilt;
    if (vessel.current) vessel.current.style.transform = !tipped ? "rotate(0deg)" : taking ? "translateY(26px) rotate(-10deg)" : "rotate(38deg) translateY(2px)";
    if (stream.current) stream.current.style.opacity = tipped && !taking ? "1" : "0";
    if (now.hits !== was.hits || now.misses !== was.misses || now.lo !== was.lo || now.spilt !== was.spilt) setShown((n) => n + 1);
    if (poured(now) || dropped(now)) {
      ended.current = true;
      const lost = dropped(now), secs = Math.round(((performance.now() - from.current) / 1000) * 10) / 10;
      window.setTimeout(() => onDone({ hits: now.hits, misses: now.misses, secs, need: now.need, ...(lost ? { dropped: true } : {}) }), lost ? 420 : 240);
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

  const steadyHand = useCallback((share: number | null) => { sure.current = share; }, []);
  useGameHandle({ kind: "pouring", state: () => ({ ...game.current }), hold, steady: steadyHand }, [hold, steadyHand]);

  const p = game.current;
  return (
    <GameFrame th={th} title={title} need={p.need} hits={p.hits} misses={p.misses} most={p.most} onCancel={onCancel}>
      <div className="mt-2 flex items-stretch gap-3" data-look="pour">
        {/* what is poured, and what into: tipped while the button is held */}
        <div aria-hidden className={`${STAGE} relative min-h-[150px] flex-1`}>
          {/* what is under it: water where it is taken up or poured back, the plot's earth where a plant is watered */}
          <PixelGround kind={taking || into === "well" ? "water" : "rows"} w={64} h={16} className="absolute inset-x-0 bottom-0 h-[40%] w-full border-t-[3px] border-[#2a190d]" />
          <span ref={vessel} className="absolute left-[18%] top-[14%] block origin-bottom-right transition-transform duration-100"><TownIcon name={icon} size={56} /></span>
          <span ref={stream} className="absolute left-[52%] top-[40%] block h-[38%] w-[6px] bg-[#7cc6e6] opacity-0 shadow-[2px_0_0_#bfe6ff]" />
          <span className="absolute bottom-[14%] left-[46%] block"><TownIcon name={into} size={52} /></span>
        </div>
        {/* how high the water stands, and the two marks */}
        <div ref={tube} aria-hidden className={`${STAGE} relative w-14 shrink-0 bg-[#1c2c38]`} data-tube>
          <span ref={water} data-good="false" className="absolute inset-x-0 bottom-0 border-t-[3px] border-[#bfe6ff] bg-[#3f96c2] data-[good=true]:bg-[#5cc58d] data-[good=true]:border-[#d6ffe0]" style={{ height: "0%" }} />
          <span className="absolute inset-x-0 border-y-[3px] border-[#ffe19a] bg-[#ffe19a]/20" style={{ bottom: `${p.lo * 100}%`, height: `${p.width * 100}%`, minHeight: 7 }} data-marks />
          <span className="absolute inset-x-0 top-0 h-[6%] bg-[#e9573f]/50" />
        </div>
      </div>
      <button type="button" className={`${BIG} mt-3`}
              onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold(true); }}
              onPointerUp={() => hold(false)} onPointerCancel={() => hold(false)} onLostPointerCapture={() => hold(false)}>
        {p.spilt ? (th ? "หกแล้ว ปล่อยก่อน" : "Spilt: let go") : verb}
        <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
      </button>
    </GameFrame>
  );
}
