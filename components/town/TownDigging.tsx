"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DIGGING, dug, dugUp, startDig, strike, type Dig, type DigHow } from "@/lib/town/digging";
import type { Sprite } from "@/lib/town/scenery";
import TownIcon, { type IconName } from "./TownIcon";
import { GameFrame, GameScene, PixelGround, STAGE, useGameHandle, type GameProps } from "./TownGame";

/** Earth by how much of it is left on a place: one layer (thin and pale), two, three (heaped and dark). */
const EARTH: IconName[] = ["earthThin", "earthMid", "earthDeep"];
/** What every place is covered in when how deep it is cannot be seen. */
const BLIND: IconName = "earthMid";

/**
 * Digging something up on the screen (lib/town/digging): a patch of loosened earth seen from above, each place of it
 * under a clod, darker and higher the more earth there is. A stroke of the hoe takes a layer off the place it lands on; what lies under comes to light
 * part by part; a part struck again is bruised. The strokes left are counted on the board.
 *
 * Each place is a button, so it is played by a finger, the mouse or the keys alike.
 *
 * Dug by a truffle piglet (`how.gentle`, lib/town/gifts' famPiglet), the piglet is on the board: it trots to the place
 * touched and roots there, and nothing it roots at twice is bruised.
 */
export default function TownDigging({ th, title, need, spent, eye = false, how, scene, onDone, onCancel, onHit }: GameProps & { need: number; spent: boolean; eye?: boolean | number; how?: DigHow; scene: Sprite | null }) {
  const dig = useRef<Dig>(startDig(need, spent, Math.floor(Math.random() * 2 ** 31), eye, how));
  const from = useRef(0), ended = useRef(false);
  const [, setShown] = useState(0);
  const stage = useRef<HTMLDivElement>(null), pig = useRef<HTMLSpanElement>(null);
  /** Where the piglet roots: the place last touched (at first, by the top that shows). */
  const [snout, setSnout] = useState(() => Math.max(0, dig.current.cells.findIndex((c) => c.top)));
  const now = () => (performance.now() - from.current) / 1000;
  useEffect(() => { from.current = performance.now(); }, []);

  const tap = useCallback((place: number) => {
    if (ended.current) return;
    const was = dig.current, next = strike(was, place);
    if (next === was) return;
    dig.current = next;
    const bruised = next.misses > was.misses;
    onHit?.(!bruised);
    if (was.gentle) {
      setSnout(place);
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) pig.current?.animate([{ transform: "translate(-50%, -78%)" }, { transform: "translate(-50%, -96%)" }, { transform: "translate(-50%, -78%)" }], { duration: 170 });
    }
    if (bruised) stage.current?.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: 180 });
    setShown((n) => n + 1);
    if (dug(next)) {
      ended.current = true;
      const out = dugUp(next), secs = Math.round(now() * 10) / 10;
      window.setTimeout(() => onDone({ ...out, secs, need: next.need }), 320);
    }
  }, [onHit, onDone]);

  // Escape gives the work up. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel]);

  useGameHandle({ kind: "digging", dig: () => dig.current, strike: tap }, [tap]);

  const d = dig.current;
  return (
    <GameFrame th={th} title={title} need={d.need} hits={d.hits} misses={d.misses} most={0} onCancel={onCancel}
               word={d.gentle ? (th ? `หมูน้อยคุ้ยได้อีก ${d.strokes} ที` : `${d.strokes} more roots of the snout`) : th ? `เหลือ ${d.strokes} จอบ` : `${d.strokes} strokes left`}>
      <div ref={stage} className={`${STAGE} mt-2 aspect-[3/2] w-full`} data-look="digging" data-strokes={d.strokes} data-gentle={d.gentle ? "1" : "0"}>
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="soil" className="absolute inset-0 size-full" />}
        <div className="absolute inset-[9%] grid" style={{ gridTemplateColumns: `repeat(${DIGGING.cols}, 1fr)`, gridTemplateRows: `repeat(${DIGGING.rows}, 1fr)` }}>
          {d.cells.map((c, i) => {
            const bare = c.earth <= 0;
            return (
              <button key={i} type="button" data-place={i} data-earth={c.earth} data-over={c.over ? "1" : "0"}
                      aria-label={bare ? (c.over ? (th ? "ของที่ขุดเจอ" : "Something dug out") : th ? "หลุมเปล่า" : "An empty hole") : th ? "ดิน" : "Earth"}
                      onPointerDown={(e) => { e.preventDefault(); tap(i); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) tap(i); } }}
                      className="relative grid touch-none place-items-center outline-none focus-visible:shadow-[inset_0_0_0_3px_#ffe19a]">
                {/* a clod as deep as its earth; a hole where it is off, with a part of the thing in it or nothing; and its top, which shows from the start */}
                <TownIcon name={bare ? (c.over ? "earthFound" : "earthHole") : d.seen ? EARTH[Math.min(EARTH.length, c.earth) - 1] : BLIND} size={64} />
                {c.top && !bare && <span className="absolute"><TownIcon name="plotSprout" size={26} /></span>}
              </button>
            );
          })}
        </div>
        {/* the piglet, over the place it roots at */}
        {d.gentle && (
          <span ref={pig} aria-hidden data-dig-piglet={snout}
                className="pointer-events-none absolute z-10 transition-[left,top] duration-150 ease-out motion-reduce:transition-none [filter:drop-shadow(0_2px_0_rgba(0,0,0,0.45))]"
                style={{ left: `${9 + (((snout % DIGGING.cols) + 0.5) / DIGGING.cols) * 82}%`, top: `${9 + ((Math.floor(snout / DIGGING.cols) + 0.5) / DIGGING.rows) * 82}%`, transform: "translate(-50%, -78%)" }}>
            <TownIcon name={"famPiglet" as IconName} size={44} />
          </span>
        )}
      </div>
    </GameFrame>
  );
}
