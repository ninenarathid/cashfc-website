"use client";

import { useEffect, useRef, useState } from "react";
import { PACE, type Fps } from "@/lib/town/pace";
import TownIcon from "./TownIcon";

/**
 * The town's settings: a cog in the corner that opens a small panel, like the music's beside it. What it holds is
 * how often the map is drawn (lib/town/pace): 60 frames a second at the most, or 30 for a machine that still runs
 * hot (the owner, 2026-10-04: "ทำ setting ที่ขวาบนหน้าจอเพื่อใช้ปรับส่วนนี้เลยก็ได้"). The choice is the town's page's to keep
 * and to draw by; this shows it, and what the map is drawing at now, and asks.
 */
export default function TownSettingsButton({ th, pace, onPace, drawn, className }: {
  th: boolean;
  /** How many frames a second the map is held to. */
  pace: Fps;
  onPace: (fps: Fps) => void;
  /** How many the map drew in the last second: the page's own count, read while the panel is open. */
  drawn: { readonly current: number };
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // A tap outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);

  // What the map is drawing at: the page counts it once a second, so twice a second is often enough to read it.
  useEffect(() => {
    if (!open) return;
    const read = () => setNow(drawn.current);
    read();
    const t = setInterval(read, 500);
    return () => clearInterval(t);
  }, [open, drawn]);

  const label = th ? "ตั้งค่า" : "Settings";
  const head = th ? "ความลื่นของภาพ" : "Frame rate";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label} className={className} data-town-settings>
        <TownIcon name="settings" size={20} /><span className="sr-only">{label}</span>
      </button>
      {open && (
        <div data-state="open" data-town-settings-panel
             className="pop-in absolute right-0 top-12 z-30 w-72 rounded-2xl border border-line-lit bg-surface/97 p-3 shadow-xl shadow-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <TownIcon name="gauge" size={18} />
            <span className="text-ui font-semibold text-ink">{head}</span>
            <span className="ml-auto font-data text-meta tabular-nums text-muted" data-drawn={now}>
              {th ? `ตอนนี้ ${now} fps` : `now ${now} fps`}
            </span>
          </div>
          <div role="radiogroup" aria-label={head} className="mt-2.5 grid grid-cols-2 gap-2">
            {PACE.choices.map((fps) => {
              const mine = fps === pace, most = fps === PACE.most;
              return (
                <button key={fps} type="button" role="radio" aria-checked={mine} data-fps={fps} onClick={() => onPace(fps)}
                        className={`pressable flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition-colors ${mine ? "border-accent bg-accent/15" : "border-line-strong hover:border-accent"}`}>
                  <span className={`flex items-center gap-1.5 font-data text-ui font-semibold tabular-nums ${mine ? "text-accent" : "text-ink"}`}>
                    <TownIcon name={most ? "bolt" : "snowflake"} size={16} />{fps} fps
                  </span>
                  <span className="text-label text-muted">
                    {most ? (th ? "ภาพลื่น" : "Smooth") : (th ? "เครื่องเย็น" : "Cooler")}
                  </span>
                </button>
              );
            })}
          </div>
          {/* (a line each: Thai has no spaces to break at, and a browser breaks it where it pleases) */}
          <div className="mt-2.5 space-y-0.5 text-label leading-relaxed text-muted">
            <p>{th ? `เมืองวาดภาพไม่เกิน ${PACE.most} เฟรมต่อวินาที` : `The town draws ${PACE.most} frames a second at the most.`}</p>
            <p>{th ? `ถ้าเครื่องยังร้อนหรือพัดลมดัง ลองเลือก ${PACE.choices[0]}` : `If the machine still runs hot, or its fan is loud, try ${PACE.choices[0]}.`}</p>
            <p>{th ? "ค่านี้จำไว้เฉพาะเครื่องนี้" : "Kept on this device only."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
