"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import TownIcon, { type IconName } from "./TownIcon";
import { extractionMarks } from "@/lib/town/reward-actions";
import type { GIANT_CROPS } from "@/lib/town/reward-garden";
import type { CampMiss } from "@/lib/town/reward-camp";
import { CROPS } from "@/lib/town/items";
import s from "./TownGiantGarden.module.css";

/**
 * The farming line's magic garden (the owner, 2026-10-27: "ทำให้ UI ดีขึ้นกว่านี้ด้วย ดูมีความแฟนตาซี เหมือนเกี่ยวข้องกับ สวนผักวิเศษ"):
 * a night bed of enchanted soil with the giant to be grown standing in it, and the giant's own planting game. Drawn from
 * the town's own pictures (the giants, the soil, the sprouts, the sparkles, the trowel); the light is the code's.
 */
export type GiantCrop = (typeof GIANT_CROPS)[number];
/** A giant's picture in the atlas, ripe or growing. */
export const giantIcon = (crop: GiantCrop, ripe = true) => `giant${crop[0].toUpperCase()}${crop.slice(1)}${ripe ? "B" : "A"}` as IconName;
export const seedIcon = (crop: GiantCrop) => CROPS[crop].seed as IconName;

// (where the motes drift: left %, top %, delay s, tone)
const MOTES = [[12, 30, 0, ""], [28, 16, 1.4, "lilac"], [70, 22, 2.6, ""], [86, 38, 0.8, "lilac"], [56, 10, 3.4, ""]] as const;

/** The bed, with the giant standing in it; `bloom` when it has just come up. */
export function GiantBed({ crop, bloom = false, children }: { crop: GiantCrop | null; bloom?: boolean; children?: ReactNode }) {
  return (
    <div className={s.bed} data-giant-bed>
      {MOTES.map(([x, y, d, tone], i) => <i key={i} className={s.mote} data-tone={tone || undefined} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
      <span className={s.shine} style={{ left: "18%", top: "12%" }}><TownIcon name="plotShine" size={14} /></span>
      <span className={s.shine} style={{ right: "17%", top: "24%", animationDelay: "1.1s" }}><TownIcon name="plotShine" size={12} /></span>
      <span className={s.shroom} style={{ left: 6 }}><TownIcon name="glowMushroom" size={30} /></span>
      <span className={s.shroom} style={{ right: 8 }}><TownIcon name="glowMushroom" size={24} /></span>
      {crop && <>
        <i key={`ring-${crop}-${bloom}`} className={s.glowRing} data-bloom={bloom || undefined} />
        <span key={`giant-${crop}-${bloom}`} className={s.giant} data-bloom={bloom || undefined}><TownIcon name={giantIcon(crop)} size={104} /></span>
      </>}
      {children}
    </div>
  );
}

/**
 * The giant's planting game: a trowel goes to and fro over a row of tilled soil; dig while it is over the glowing spot,
 * three times. The marks are the reward games' own (lib/town/reward-actions' extractionMarks: the same sweep, the same
 * width), so the database judges them as before; only what is seen is the garden's. A camp pennant's replay of the first
 * missed beat is kept (`retryFirst`).
 */
export function GiantPlantingGame({ run, crop, th, retryFirst = false, onFinish, aside }: {
  run: { id: string; seed: number }; crop: GiantCrop; th: boolean; retryFirst?: boolean;
  onFinish: (marks: number[], miss?: CampMiss) => void;
  /** What stands beside the dig button (the stop): one row, so that a short phone keeps both in sight. */
  aside?: ReactNode;
}) {
  const WIDTH = 0.09;
  const cursor = useRef<HTMLSpanElement>(null), began = useRef(0), marks = useRef<number[]>([]), locked = useRef(false), retried = useRef<CampMiss | undefined>(undefined);
  const [done, setDone] = useState<{ at: number; hit: boolean }[]>([]), [digs, setDigs] = useState(0), [retryNote, setRetryNote] = useState(false);
  const targets = extractionMarks(run.seed), step = done.length;
  useEffect(() => {
    let frame = 0;
    began.current = performance.now();
    const tick = (t: number) => { if (cursor.current) cursor.current.style.left = `${((1 - Math.cos((t - began.current) / 500)) / 2) * 100}%`; frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run.id]);
  function dig() {
    if (locked.current) return;
    const mark = (1 - Math.cos((performance.now() - began.current) / 500)) / 2, hit = Math.abs(mark - targets[marks.current.length]) <= WIDTH;
    setDigs((n) => n + 1);
    if (retryFirst && !retried.current && !hit) { retried.current = { index: marks.current.length, mark }; began.current = performance.now(); setRetryNote(true); return; }
    marks.current.push(mark);
    setDone((d) => [...d, { at: mark, hit }]);
    setRetryNote(false);
    if (marks.current.length === 3) { locked.current = true; onFinish(marks.current, retried.current); }
  }
  return (
    <div className={s.game} data-giant-game>
      <div className={s.beats}>
        <p className="text-ui">{th ? "ขุดตอนพลั่วอยู่เหนือจุดเรืองแสง · พักไว้ได้ ไม่เสียสิทธิ์" : "Dig while the trowel is over the glow · stopping keeps today’s planting"}</p>
        <span className="flex shrink-0 items-end gap-1" aria-label={`${step}/3`}>
          {[0, 1, 2].map((i) => <TownIcon key={i} name={i < step && done[i].hit ? "plotSprout" : "mound"} size={20} className={i < step ? "" : "opacity-35"} />)}
        </span>
      </div>
      <div className={s.track} aria-hidden>
        <div className={s.soil}>{Array.from({ length: 12 }, (_, i) => <TownIcon key={i} name="plotSoil" size={36} />)}</div>
        <div className={s.lane}>
          {step < 3 && <>
            <i className={s.spot} style={{ left: `${(targets[step] - WIDTH) * 100}%`, width: `${WIDTH * 200}%` }} />
            <span className={s.spotShine} style={{ left: `${targets[step] * 100}%` }}><TownIcon name="plotShine" size={18} /></span>
          </>}
          {done.map((d, i) => <span key={i} className={s.planted} style={{ left: `${d.at * 100}%` }}><TownIcon name={d.hit ? "plotSprout" : "mound"} size={d.hit ? 30 : 22} /></span>)}
          <span ref={cursor} className={s.cursor} data-giant-trowel><span key={digs} className={s.trowel} data-dig={digs ? "" : undefined}><TownIcon name="soilScoop" size={30} /></span></span>
        </div>
      </div>
      {retryNote && <p role="status" className={`${s.note} text-ui`}>{th ? "ธงค่ายให้ขุดจังหวะนี้ใหม่ได้หนึ่งครั้ง" : "The camp pennant lets you dig this beat again once."}</p>}
      <div className="mt-2 flex gap-2">
        {aside}
        <button autoFocus type="button" data-giant-dig disabled={step >= 3} onClick={dig}
                className="pressable tk tk-btn flex min-h-12 flex-1 items-center justify-center gap-2 font-display text-ui font-semibold disabled:opacity-50">
          <TownIcon name={seedIcon(crop)} size={20} />{th ? "ขุดปลูก" : "Dig and plant"}
        </button>
      </div>
    </div>
  );
}
