"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PACE, type Fps } from "@/lib/town/pace";
import TownIcon from "./TownIcon";

/**
 * The town's settings: a cog in the corner that opens a small panel, like the music's beside it. What it holds is
 * how often the map is drawn (lib/town/pace): 60 frames a second at the most, or 30 for a machine that still runs
 * hot (the owner, 2026-10-04: "ทำ setting ที่ขวาบนหน้าจอเพื่อใช้ปรับส่วนนี้เลยก็ได้"); and whether the town moves at all
 * (lib/town/motion): it does for everybody, and whoever the rain and the leaves make dizzy turns it off here. The
 * choices are the town's page's to keep and to draw by; this shows them, and what the map is drawing at now, and asks.
 */
export default function TownSettingsButton({ th, pace, onPace, drawn, onShown, moving, onMoving, low = false, under = false, className }: {
  /** In the map's menu: the panel hangs under the menu, not under this button. */
  under?: boolean;
  th: boolean;
  /** How many frames a second the map is held to. */
  pace: Fps;
  onPace: (fps: Fps) => void;
  /** How many the map drew in the last second: the page's own count, read while the panel is open. */
  drawn: { readonly current: number };
  /**
   * Told when the panel opens and shuts: the map rests while nobody touches the page (lib/town/pace), but not
   * under somebody reading here what it draws at, or the number would not be the one they chose.
   */
  onShown?: (open: boolean) => void;
  /** Whether the town moves: the rain, the leaves, the river, the trees. */
  moving: boolean;
  onMoving: (moving: boolean) => void;
  /**
   * At the foot of a phone's screen, where the cog sits beside the chat: the panel opens upwards, from the left edge
   * of whatever positioned box the cog is in.
   */
  low?: boolean;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  // A tap outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    onShown?.(true);
    return () => onShown?.(false);
  }, [open, onShown]);

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
  const motion = th ? "ภาพเคลื่อนไหว" : "Motion";
  return (
    <div ref={box} className={low || under ? "" : "relative"}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label} className={className} data-town-settings>
        <TownIcon name="settings" size={20} /><span className="sr-only">{label}</span>
      </button>
      {open && (
        <div data-state="open" data-town-settings-panel
             className={`pop-in absolute z-30 ${under
               ? "tk tk-window right-0 top-[7.75rem] w-full p-4 text-left"
               : `rounded-2xl border border-line-lit bg-surface/97 p-3 shadow-xl shadow-black/40 backdrop-blur-sm ${low ? "bottom-12 left-0 w-[min(18rem,calc(100vw-1.5rem))]" : "right-0 top-12 w-72"}`}`}>
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
          </div>
          {/* Whether the town moves: on for everybody, whatever the machine says of motion, until it is turned off here */}
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <TownIcon name="walk" size={18} />
            <span id={`${id}-motion`} className="text-ui font-semibold text-ink">{motion}</span>
            <button type="button" role="switch" aria-checked={moving} id={`${id}-switch`} aria-labelledby={`${id}-motion ${id}-switch`}
                    data-town-motion={moving ? "on" : "off"} onClick={() => onMoving(!moving)}
                    className={`pressable ml-auto rounded-full px-3 py-1 text-ui font-semibold ${moving ? "bg-accent text-bg" : "border border-line-strong text-ink hover:border-accent"}`}>
              {moving ? (th ? "เปิดอยู่" : "On") : (th ? "ปิดอยู่" : "Off")}
            </button>
          </div>
          <div className="mt-2 space-y-0.5 text-label leading-relaxed text-muted">
            <p>{th ? "ฝน ใบไม้ปลิว สายน้ำ และต้นไม้ที่ไหว" : "The rain, leaves on the wind, the river, the trees swaying."}</p>
            <p>{th ? "ถ้าดูแล้วเวียนหัว ปิดได้ ภาพในเมืองจะนิ่ง" : "If it makes you dizzy, turn it off: the town stands still."}</p>
            <p>{th ? "ค่าเหล่านี้จำไว้เฉพาะเครื่องนี้" : "Kept on this device only."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
