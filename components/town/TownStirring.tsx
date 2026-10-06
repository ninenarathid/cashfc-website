"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keptMotion } from "@/lib/town/motion";
import { startStir, stir, stirred, type Stir } from "@/lib/town/stirring";
import type { TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { GameFrame, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** How big the pot is drawn: six of the screen's pixels to one of its own. */
const POT = 180;
/** How near the middle of the pot a finger is too near to say which way round it is going, as a share of the picture's half. */
const HUB = 0.16;

/**
 * Stirring a pot on the screen (lib/town/stirring): the pot seen from above, and the ladle in it. A finger, or the
 * mouse held down, is taken round the pot and the ladle goes with it. A turn made at a good pace is a stir done:
 * the ring round the pot fills as it is made. Too fast for a while and the soup goes over the rim; too slow, or
 * left, and it catches: the pot shows which, and the gauge under it shows the pace.
 *
 * Played by a finger or the mouse: there is no going round a pot with a key.
 */
export default function TownStirring({ th, title, need, mods, harder = 1, onDone, onCancel, onHit }: GameProps & {
  need: number; mods: TimingMods;
  /** How many times harder this pot is for whoever stirs it (lib/town/cooking's harderCook): nothing of it is shown but the game itself. */
  harder?: number;
}) {
  const game = useRef<Stir>(startStir(need, mods, harder));
  const ended = useRef(false);
  const [, setShown] = useState(0);
  /** Whether the town's motion is turned off on this device (lib/town/motion): the ring that says what to do stands still then. */
  const [still] = useState(() => !keptMotion());
  /** What the pot looks like now: simmering, going over, catching. */
  const [pot, setPot] = useState<IconName>("potTop");
  const stage = useRef<HTMLDivElement>(null), ladle = useRef<HTMLSpanElement>(null), ring = useRef<HTMLSpanElement>(null), needle = useRef<HTMLSpanElement>(null), picture = useRef<HTMLSpanElement>(null);
  /** The finger on the pot: which it is, and the angle it was last at (none, while it is too near the middle). */
  const drag = useRef<{ id: number; angle: number | null } | null>(null);
  /** How far round the ladle has been taken since the last frame, in turns; and, for a script, a pace to stir at by itself. */
  const moved = useRef(0), driven = useRef<number | null>(null), angle = useRef(-Math.PI / 2);

  const angleOf = (e: { clientX: number; clientY: number }): number | null => {
    const r = stage.current?.getBoundingClientRect();
    if (!r) return null;
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return Math.hypot(dx, dy) < (Math.min(r.width, r.height) / 2) * HUB ? null : Math.atan2(dy, dx);
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    stage.current?.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, angle: angleOf(e) };
    if (drag.current.angle !== null) angle.current = drag.current.angle;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleOf(e);
    if (a !== null && d.angle !== null) {
      let by = a - d.angle;
      if (by > Math.PI) by -= 2 * Math.PI; else if (by < -Math.PI) by += 2 * Math.PI;
      moved.current += Math.abs(by) / (2 * Math.PI);
    }
    if (a !== null) angle.current = a;
    d.angle = a;
  };
  const up = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };

  useFrames((dt) => {
    if (ended.current) return;
    const was = game.current, auto = driven.current;
    if (auto !== null) angle.current += auto * dt * 2 * Math.PI;
    const now = stir(was, moved.current + (auto ?? 0) * dt, dt);
    moved.current = 0;
    game.current = now;
    if (now.hits > was.hits) onHit?.(true);
    if (now.misses > was.misses) {
      onHit?.(false);
      picture.current?.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 180 });
    }
    // what is drawn every frame is set straight on the page: the ladle, the ring of the turn being made, the pace
    if (ladle.current) ladle.current.style.transform = `rotate(${angle.current + Math.PI / 2}rad)`;
    if (ring.current) ring.current.style.background = `conic-gradient(#ffe19a 0deg ${now.turned * 360}deg, transparent ${now.turned * 360}deg)`;
    if (needle.current) needle.current.style.left = `${Math.min(1, now.pace / (now.hi * 1.5)) * 100}%`;
    // the pot shows what is wrong once it has been wrong a moment (not at every wobble of the hand)
    const look: IconName = now.begun && now.off !== 0 && now.out > 0.25 ? (now.off > 0 ? "potTopOver" : "potTopBurnt") : "potTop";
    if (look !== pot) setPot(look);
    if (now.hits !== was.hits || now.misses !== was.misses || now.begun !== was.begun) setShown((n) => n + 1);
    if (stirred(now)) {
      ended.current = true;
      window.setTimeout(() => onDone({ hits: now.hits, misses: now.misses, secs: Math.round(now.t * 10) / 10, need: now.need }), 260);
    }
  });

  // Escape gives the cooking up. Heard before the town hears it.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onCancel]);

  const drive = useCallback((pace: number | null) => { driven.current = pace; }, []);
  useGameHandle({ kind: "stirring", state: () => ({ ...game.current }), drive }, [drive]);

  const s = game.current, top = s.hi * 1.5;
  return (
    <GameFrame th={th} title={title} need={s.need} hits={s.hits} misses={s.misses} most={0} onCancel={onCancel} word={th ? "ลากวนรอบหม้อ ให้สม่ำเสมอ" : "Drag round the pot, at an even pace"}>
      <div ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
           className={`${STAGE} mx-auto mt-1 grid size-[232px] max-w-full cursor-grab touch-none place-items-center bg-[#2c1c10] active:cursor-grabbing`} data-look="stir" data-pot={pot}>
        {/* before the first touch: a ring that goes round, to say what the hand does */}
        {!s.begun && <span aria-hidden className={`pointer-events-none absolute inset-3 rounded-full border-[3px] border-dashed border-[#ffe19a]/70 ${still ? "" : "animate-[spin_3.2s_linear_infinite]"}`} />}
        {/* the turn being made, round the pot */}
        <span ref={ring} aria-hidden className="pointer-events-none absolute inset-2 rounded-full"
              style={{ WebkitMask: "radial-gradient(farthest-side, transparent 91%, #000 92%)", mask: "radial-gradient(farthest-side, transparent 91%, #000 92%)" }} />
        <span ref={picture} aria-hidden className="pointer-events-none block"><TownIcon name={pot} size={POT} /></span>
        {/* the ladle, where the finger is */}
        <span ref={ladle} aria-hidden className="pointer-events-none absolute inset-0" style={{ transform: "rotate(0rad)" }}>
          <span className="absolute left-1/2 top-[30px] -ml-[17px] block"><TownIcon name="ladle" size={44} /></span>
        </span>
      </div>
      {/* the pace: too slow at one end, too fast at the other, good between the marks */}
      <div aria-hidden className={`${STAGE} mx-auto mt-2 h-4 w-[232px] max-w-full`} data-pace>
        <span className="absolute inset-y-0 left-0 bg-[#5a3a22]" style={{ width: `${(s.lo / top) * 100}%` }} />
        <span className="absolute inset-y-0 border-x-2 border-[#2a190d] bg-[#8fd45f]" style={{ left: `${(s.lo / top) * 100}%`, width: `${((s.hi - s.lo) / top) * 100}%` }} />
        <span className="absolute inset-y-0 right-0 bg-[#e9573f]" style={{ width: `${(1 - s.hi / top) * 100}%` }} />
        <span ref={needle} className="absolute inset-y-0 -ml-[2px] w-1 bg-[#fff6e3] shadow-[0_0_0_1px_#2a190d]" style={{ left: "0%" }} />
      </div>
      <p className="sr-only" aria-live="polite">{pot === "potTopOver" ? (th ? "เร็วไป น้ำแกงล้น" : "Too fast: it is going over") : pot === "potTopBurnt" ? (th ? "ช้าไป ก้นหม้อไหม้" : "Too slow: it is catching") : ""}</p>
    </GameFrame>
  );
}
