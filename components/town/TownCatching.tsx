"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATCHING, caught, fallen, fell, showerAt, startShower, type Shower } from "@/lib/town/catching";
import type { Sprite } from "@/lib/town/scenery";
import TownIcon, { type IconName } from "./TownIcon";
import { GameFrame, GameScene, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** Where in the scene the fruit comes out of the crown and where it lands, as shares of its height. */
const TOP = 26, FALL = 58;

/**
 * Shaking a tree on the screen (lib/town/catching): the crown along the top, its fruit coming down one after
 * another, each in its own lane, and a basket along the bottom that goes where the finger or the mouse is (or by
 * the arrow keys). What lands in the basket is caught.
 */
export default function TownCatching({ th, title, need, spent, eye = false, icon, scene, onDone, onCancel, onHit }: GameProps & { need: number; spent: boolean; eye?: boolean; icon: IconName; scene: Sprite | null }) {
  const shower = useRef<Shower>(startShower(need, spent, Math.floor(Math.random() * 2 ** 31), eye));
  const basket = useRef(Math.floor(CATCHING.lanes / 2));
  const from = useRef(0), ended = useRef(false);
  const [, setShown] = useState(0);
  const stage = useRef<HTMLDivElement>(null), drops = useRef<Array<HTMLSpanElement | null>>([]), holder = useRef<HTMLSpanElement>(null);
  const now = () => (performance.now() - from.current) / 1000;
  useEffect(() => { from.current = performance.now(); }, []);

  const move = useCallback((lane: number) => {
    basket.current = Math.max(0, Math.min(CATCHING.lanes - 1, lane));
    if (holder.current) holder.current.style.left = `${((basket.current + 0.5) / CATCHING.lanes) * 100}%`;
  }, []);

  useFrames(() => {
    if (ended.current) return;
    const t = now(), was = shower.current, next = showerAt(was, t, basket.current);
    if (next !== was) {
      shower.current = next;
      next.drops.forEach((d, i) => { if (d.caught !== null && was.drops[i].caught === null) onHit?.(d.caught); });
      setShown((n) => n + 1);
      if (fell(next)) {
        ended.current = true;
        const out = caught(next), secs = Math.round(t * 10) / 10;
        window.setTimeout(() => onDone({ ...out, secs, need: next.need }), 300);
      }
    }
    next.drops.forEach((d, i) => {
      const el = drops.current[i];
      if (!el) return;
      const f = fallen(next, d, t);
      el.style.top = `${TOP + f * FALL}%`;
      el.style.opacity = d.caught !== null || f <= 0 ? "0" : "1";
    });
  });

  // The arrow keys move the basket; Escape gives the work up. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      const way = e.key === "ArrowLeft" || e.key === "a" || e.key === "A" ? -1 : e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : 0;
      if (!way) return;
      e.preventDefault();
      e.stopPropagation();
      move(basket.current + way);
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel, move]);

  const point = (e: React.PointerEvent) => {
    const box = stage.current?.getBoundingClientRect();
    if (box?.width) move(Math.floor(((e.clientX - box.left) / box.width) * CATCHING.lanes));
  };

  useGameHandle({ kind: "catching", shower: () => shower.current, basket: () => basket.current, move, time: now }, [move]);

  const sh = shower.current, got = sh.drops.filter((d) => d.caught).length;
  return (
    <GameFrame th={th} title={title} need={sh.need} hits={Math.min(sh.need, got)} misses={sh.drops.filter((d) => d.caught === false).length} most={0} onCancel={onCancel}>
      <div ref={stage} className={`${STAGE} mt-2 aspect-[3/2] w-full touch-none`} data-look="catching" onPointerDown={point} onPointerMove={point}>
        {/* the tree's crown along the top, which the fruit comes out of, open air under it, and grass along the bottom */}
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="leaf" className="absolute inset-0 size-full" />}
        {sh.drops.map((d, i) => (
          <span key={i} ref={(el) => { drops.current[i] = el; }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 opacity-0"
                style={{ left: `${((d.lane + 0.5) / CATCHING.lanes) * 100}%`, top: `${TOP}%` }} data-lane={d.lane}>
            <TownIcon name={icon} size={38} />
          </span>
        ))}
        <span ref={holder} className="pointer-events-none absolute bottom-[3%] -translate-x-1/2" style={{ left: `${((basket.current + 0.5) / CATCHING.lanes) * 100}%` }}>
          <TownIcon name="basket" size={52} />
        </span>
      </div>
    </GameFrame>
  );
}
