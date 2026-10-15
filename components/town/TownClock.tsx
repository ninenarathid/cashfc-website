"use client";

import { useEffect, useState } from "react";
import { bandAt, bandOf } from "@/lib/town/bands";
import { clockText } from "@/lib/town/daylight";
import TownIcon from "./TownIcon";

/**
 * The town's clock: Thai time and which of the day's eight bands it is
 * (lib/town/bands; the owner, 2026-10-15: one set of names on the clock). Its
 * own little component, ticking on its own, so the town around it never
 * re-renders for the time.
 */
export default function TownClock({ th, compact, bare = false, hour = null }: {
  th: boolean; compact: boolean; bare?: boolean;
  /** `next dev`'s ?townHour, so the clock tells the hour the sky is showing. */
  hour?: number | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  // Nothing on the server's render: the time is the browser's to tell.
  if (!now) return null;
  const phase = hour !== null ? bandAt(hour * 60) : bandOf(now);
  const time = hour !== null ? `${String(Math.floor(hour) % 24).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}` : clockText(now);
  return (
    <span role="timer" aria-label={`${th ? "เวลาในเมือง" : "Town time"} ${time} · ${th ? phase.th : phase.en}`}
          className={bare ? "flex shrink-0 items-center gap-1.5" : "pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-bg/80 px-3 shadow-lg shadow-black/30 backdrop-blur-sm"}>
      {/* (on the narrowest phones, under 22.5rem, the hour alone: the top row has no room for the sky's picture) */}
      {/* (`bare`: inside the plaque of the map's top row, which is its frame) */}
      <TownIcon name={phase.icon} size={bare ? 16 : 20} className={compact && !bare ? "max-[22.49rem]:hidden" : undefined} />
      <span className={`font-data font-semibold tabular-nums text-ink ${bare ? "text-meta leading-none" : "text-ui"}`}>{time}</span>
      {/* (the band's name on a phone too, inside the plaque: it says what can be found now) */}
      {(!compact || bare) && <span className={`text-muted ${bare ? "text-meta leading-none" : "text-label"}`}>{th ? phase.th : phase.en}</span>}
    </span>
  );
}
