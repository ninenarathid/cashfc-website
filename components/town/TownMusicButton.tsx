"use client";

import { useEffect, useRef, useState } from "react";
import { bangkokMinute } from "@/lib/town/daylight";
import { TownMusic } from "@/lib/town/music";
import TownIcon from "./TownIcon";

/** Kept on this device only: whether the music is on, and how loud. */
const KEY = "cashTown:music";
/** On, softly, until somebody says otherwise (the owner's call, 2026-10-02: "default เป็นเปิด แบบเบาๆ"). */
const DEFAULT = { on: true, vol: 0.3 };
function readPref(): { on: boolean; vol: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { on?: unknown; vol?: unknown } | null;
    return { on: v?.on !== false, vol: typeof v?.vol === "number" && v.vol >= 0 && v.vol <= 1 ? v.vol : DEFAULT.vol };
  } catch { return DEFAULT; }
}
function savePref(p: { on: boolean; vol: number }) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: it just won't be remembered */ }
}

/**
 * The town's music (lib/town/music): a button in the corner that opens a
 * small panel to turn it on or off and set how loud. On, softly, by default:
 * it starts with the first tap in town (a browser plays nothing before one),
 * and stays off for whoever turns it off.
 */
export default function TownMusicButton({ th, hour, under = false, className }: {
  /** In the map's menu: the panel hangs under the menu, not under this button. */
  under?: boolean;
  th: boolean;
  /** `next dev`'s ?townHour, so the music matches the sky being shown. */
  hour: number | null;
  className: string;
}) {
  const music = useRef<TownMusic | null>(null);
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(DEFAULT.vol);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  /** The hour in Bangkok, a new piece each. */
  const hourNow = (): number => (hour !== null ? Math.floor(hour) : Math.floor(bangkokMinute(new Date()) / 60));
  /** The player, made when it is first wanted. */
  const player = (): TownMusic => {
    music.current ??= new TownMusic();
    // for the test scripts (fc-cash-town): never in a production build
    if (process.env.NODE_ENV !== "production") (window as unknown as { __townMusic?: TownMusic }).__townMusic = music.current;
    return music.current;
  };

  // The saved choice; if it was on, start with the first tap anywhere.
  useEffect(() => {
    const p = readPref();
    setVol(p.vol);
    if (!p.on) return;
    const go = () => {
      player().setVolume(p.vol);
      player().start(hourNow());
      setOn(true);
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new hour, a new piece.
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => music.current?.setHour(hourNow()), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, hour]);

  useEffect(() => () => { music.current?.close(); music.current = null; }, []);

  // A tap outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);

  const toggle = () => {
    const next = !on;
    if (next) { player().setVolume(vol); player().start(hourNow()); } else player().stop();
    setOn(next);
    savePref({ on: next, vol });
  };
  const loud = (v: number) => {
    setVol(v);
    music.current?.setVolume(v);
    savePref({ on, vol: v });
  };

  const label = th ? "เพลง" : "Music";
  return (
    <div ref={box} className={under ? "" : "relative"}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label} className={className}>
        <TownIcon name={on ? "music" : "musicOff"} size={20} /><span className="sr-only">{label}</span>
      </button>
      {open && (
        <div data-state="open"
             className={`pop-in absolute z-30 ${under ? "tk tk-window right-0 top-[7.75rem] w-full p-4 text-left" : "right-0 top-12 w-60 rounded-2xl border border-line-lit bg-surface/97 p-3 shadow-xl shadow-black/40 backdrop-blur-sm"}`}>
          <div className="flex items-center gap-2">
            <TownIcon name="music" size={18} />
            <span className="text-ui font-semibold text-ink">{th ? "เพลงในเมือง" : "Town music"}</span>
            <button type="button" role="switch" aria-checked={on} onClick={toggle}
                    className={`pressable ml-auto rounded-full px-3 py-1 text-ui font-semibold ${on ? "bg-accent text-bg" : "border border-line-strong text-ink hover:border-accent"}`}>
              {on ? (th ? "เปิดอยู่" : "On") : (th ? "ปิดอยู่" : "Off")}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2">
            <span className="sr-only">{th ? "ความดัง" : "Volume"}</span>
            <TownIcon name="volumeLow" size={16} />
            <input type="range" min={0} max={100} step={1} value={Math.round(vol * 100)}
                   onChange={(e) => loud(Number(e.target.value) / 100)}
                   aria-valuetext={`${Math.round(vol * 100)}%`}
                   className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent,#6aa9e0)]" />
            <TownIcon name="volumeHigh" size={18} />
          </label>
        </div>
      )}
    </div>
  );
}
