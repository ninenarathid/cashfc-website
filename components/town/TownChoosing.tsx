"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHOOSING, chosen, dimmed, startBunch, takeAt, type Bunch } from "@/lib/town/choosing";
import type { Sprite } from "@/lib/town/scenery";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { GameFrame, GameScene, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/**
 * How a look-alike differs from the real thing when it has no picture of its own: its colour a little off. (Each
 * thing that is chosen has one: `like` and its name, the same thing wrong in one way of its own, which is what
 * there is to learn.) And how everything looks once the patch has gone dim.
 */
const FAKE = "hue-rotate(28deg) saturate(0.82) brightness(0.92)", DIM = "brightness(0.28) saturate(0)";
/** The picture of what only looks like a thing, if it has one. */
const likeOf = (icon: IconName): IconName | null => {
  const name = `like${icon[0].toUpperCase()}${icon.slice(1)}`;
  return name in ICON_ATLAS.icons ? (name as IconName) : null;
};

/**
 * Choosing what to take on the screen (lib/town/choosing): a patch of the forest's floor seen close, under a mossy
 * log, the thing that is wanted standing in it among others that only look like it. Whatever is touched is taken, and comes up out of
 * the ground. Nothing says which is which; with no stamina left the whole patch goes dim after a moment.
 *
 * Each place is a button, so it is played by a finger, the mouse or the keys alike.
 */
export default function TownChoosing({ th, title, need, spent, eye = false, icon, scene, onDone, onCancel, onHit }: GameProps & { need: number; spent: boolean; eye?: boolean; icon: IconName; scene: Sprite | null }) {
  const like = likeOf(icon);
  const bunch = useRef<Bunch>(startBunch(need, spent, Math.floor(Math.random() * 2 ** 31), eye));
  const from = useRef(0), ended = useRef(false);
  const [, setShown] = useState(0);
  const [dim, setDim] = useState(false);
  const now = () => (performance.now() - from.current) / 1000;
  useEffect(() => { from.current = performance.now(); }, []);

  useFrames(() => { if (!dim && dimmed(bunch.current, now())) setDim(true); });

  const tap = useCallback((place: number) => {
    if (ended.current) return;
    const was = bunch.current, next = takeAt(was, place);
    if (next === was) return;
    bunch.current = next;
    onHit?.(next.hits > was.hits);
    setShown((n) => n + 1);
    if (chosen(next)) {
      ended.current = true;
      const secs = Math.round(now() * 10) / 10;
      window.setTimeout(() => onDone({ hits: next.hits, misses: next.wrong, secs, need: next.need }), 260);
    }
  }, [onHit, onDone]);

  // Escape gives the work up. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel]);

  useGameHandle({ kind: "choosing", bunch: () => bunch.current, take: tap, dimmed: () => dimmed(bunch.current, now()) }, [tap]);

  const b = bunch.current;
  return (
    <GameFrame th={th} title={title} need={b.need} hits={b.hits} misses={b.wrong} most={0} onCancel={onCancel}>
      <div className={`${STAGE} mt-2 aspect-[3/2] w-full`} data-look="choosing" data-dim={dim ? "1" : "0"}>
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="leaf" className="absolute inset-0 size-full" />}
        {/* (the log lies along the top of the scene: what grows stands on the open ground below it) */}
        <div className="absolute inset-x-0 bottom-0 top-[30%] grid" style={{ gridTemplateColumns: `repeat(${CHOOSING.cols}, 1fr)`, gridTemplateRows: `repeat(${CHOOSING.rows}, 1fr)` }}>
          {b.cells.map((c, i) => (
            <button key={i} type="button" data-place={i} data-kind={!c ? "bare" : c.taken ? "taken" : c.good ? "good" : "like"}
                    aria-label={c && !c.taken ? (th ? "บางอย่างขึ้นอยู่" : "Something growing") : th ? "พื้นว่าง" : "Bare ground"}
                    onPointerDown={(e) => { e.preventDefault(); tap(i); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) tap(i); } }}
                    className="grid touch-none place-items-center outline-none focus-visible:shadow-[inset_0_0_0_3px_#ffe19a]">
              {c && (
                <span className={`block transition-[opacity,transform,filter] duration-300 ${c.taken ? "-translate-y-8 opacity-0" : ""}`}
                      style={{ transform: c.taken ? undefined : c.look % 2 ? "scaleX(-1)" : undefined, filter: dim && !c.taken ? DIM : c.good || like ? undefined : FAKE }}>
                  <TownIcon name={c.good || !like ? icon : like} size={60} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </GameFrame>
  );
}
