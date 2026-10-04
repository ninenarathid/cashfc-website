"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STEADY, dropped, handAt, startHands, steadied, steady, within, type Hands } from "@/lib/town/steady";
import type { TimingMods } from "@/lib/town/timing";
import TownIcon, { type IconName } from "./TownIcon";
import { GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** The field the hand wanders in: its side, in the screen's pixels (half of it is the rules' 1). */
const FIELD = 232;

/**
 * Tired hands on the screen (lib/town/steady): the plot seen close, a ring over the plant, and the thing in the hand
 * hanging over it, wandering. A finger (or the mouse, held down) dragged anywhere on the picture moves it back: it
 * is not held by its own place, so the finger never hides it. Kept inside the ring, the ring fills; when it is full
 * a part of the work is done. Left outside, drops of sweat fall, and it is a miss.
 *
 * What tired hands play for sowing, feeding, curing and picking.
 */
export default function TownSteady({ th, title, need, mods, icon, over, onDone, onCancel, onHit }: GameProps & {
  need: number;
  mods: TimingMods;
  /** The thing in the hand. */
  icon: IconName;
  /** What it is held over: the plot, or the plant in it. */
  over: IconName;
}) {
  const game = useRef<Hands>(startHands(need, mods, Math.floor(Math.random() * 2 ** 31)));
  const ended = useRef(false);
  const [, setShown] = useState(0);
  const stage = useRef<HTMLDivElement>(null), hand = useRef<HTMLSpanElement>(null), ring = useRef<HTMLSpanElement>(null), fill = useRef<HTMLSpanElement>(null);
  /** The finger on the picture, and where it last was; how far it has been dragged since the last frame, in the rules' own measure. */
  const drag = useRef<{ id: number; x: number; y: number } | null>(null), moved = useRef({ x: 0, y: 0 });
  /** For a script: a hand that holds it over the middle by itself. */
  const held = useRef(false);

  const down = (e: React.PointerEvent) => { e.preventDefault(); stage.current?.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const half = (stage.current?.getBoundingClientRect().width ?? FIELD) / 2;
    moved.current.x += (e.clientX - d.x) / half;
    moved.current.y += (e.clientY - d.y) / half;
    d.x = e.clientX; d.y = e.clientY;
  };
  const up = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };

  useFrames((dt) => {
    if (ended.current) return;
    const was = game.current;
    let { x, y } = moved.current;
    moved.current = { x: 0, y: 0 };
    if (held.current) { const at = handAt(was); x = -at.x; y = -at.y; }
    const now = steady(was, x, y, dt);
    game.current = now;
    if (now.hits > was.hits) onHit?.(true);
    if (now.misses > was.misses) {
      onHit?.(false);
      stage.current?.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 180 });
    }
    // drawn every frame, straight on the page: where the hand is, whether it is inside, how full the ring is
    const at = handAt(now), inside = within(now);
    if (hand.current) hand.current.style.transform = `translate(${at.x * 50}%, ${at.y * 50}%)`;
    if (ring.current) ring.current.dataset.inside = String(inside);
    if (fill.current) fill.current.style.background = `conic-gradient(#8fd45f 0deg ${(now.inside / STEADY.beat) * 360}deg, transparent ${(now.inside / STEADY.beat) * 360}deg)`;
    if (now.hits !== was.hits || now.misses !== was.misses) setShown((n) => n + 1);
    if (steadied(now) || dropped(now)) {
      ended.current = true;
      const lost = dropped(now);
      window.setTimeout(() => onDone({ hits: now.hits, misses: now.misses, secs: Math.round(now.t * 10) / 10, need: now.need, ...(lost ? { dropped: true } : {}) }), lost ? 420 : 240);
    }
  });

  // Escape gives the work up. Heard before the town hears it.
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [onCancel]);

  const hold = useCallback((on: boolean) => { held.current = on; }, []);
  const shove = useCallback((x: number, y: number) => { moved.current.x += x; moved.current.y += y; }, []);
  useGameHandle({ kind: "steady", state: () => ({ ...game.current, at: handAt(game.current), within: within(game.current) }), hold, shove }, [hold, shove]);

  const h = game.current, size = `${h.ring * 100}%`;
  return (
    <GameFrame th={th} title={title} need={h.need} hits={h.hits} misses={h.misses} most={h.most} onCancel={onCancel} word={th ? "มือสั่น ลากประคองให้อยู่ในวง" : "Shaky hands: drag to keep it in the ring"}>
      <div ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
           className={`${STAGE} mx-auto mt-1 aspect-square w-[232px] max-w-full cursor-grab touch-none active:cursor-grabbing`} data-look="steady">
        <PixelGround kind="rows" w={58} h={58} className="absolute inset-0 size-full" />
        {/* what it is held over, in the middle */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 opacity-90"><TownIcon name={over} size={56} /></span>
        {/* the ring, and how much of this part is kept so far */}
        <span ref={ring} aria-hidden data-inside="true"
              className="pointer-events-none absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed border-[#ffe19a] data-[inside=false]:border-[#e9573f]"
              style={{ width: size, height: size }}>
          <span ref={fill} className="absolute -inset-[3px] rounded-full opacity-80"
                style={{ WebkitMask: "radial-gradient(farthest-side, transparent 86%, #000 87%)", mask: "radial-gradient(farthest-side, transparent 86%, #000 87%)" }} />
        </span>
        {/* the thing in the hand, wandering: moved from the middle by halves of the picture */}
        <span ref={hand} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center" style={{ transform: "translate(0%, 0%)" }}>
          <span className="block drop-shadow-[0_3px_0_rgba(0,0,0,0.45)]"><TownIcon name={icon} size={44} /></span>
        </span>
      </div>
    </GameFrame>
  );
}
