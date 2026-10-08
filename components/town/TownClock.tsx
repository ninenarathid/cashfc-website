"use client";

import { useEffect, useState } from "react";
import { PHASE_NAMES, clockText, daylight } from "@/lib/town/daylight";
import TownIcon from "./TownIcon";

/**
 * The town's clock: Thai time and the part of the day the sky is in
 * (lib/town/daylight). Its own little component, ticking on its own, so the
 * town around it never re-renders for the time.
 */
export default function TownClock({ th, compact }: { th: boolean; compact: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  // Nothing on the server's render: the time is the browser's to tell.
  if (!now) return null;
  const phase = PHASE_NAMES[daylight(now).phase];
  return (
    <span role="timer" aria-label={`${th ? "เวลาในเมือง" : "Town time"} ${clockText(now)} · ${th ? phase.th : phase.en}`}
          className="pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-bg/80 px-3 shadow-lg shadow-black/30 backdrop-blur-sm">
      {/* (on the narrowest phones, under 22.5rem, the hour alone: the top row has no room for the sky's picture) */}
      <TownIcon name={daylight(now).phase} size={20} className={compact ? "max-[22.49rem]:hidden" : undefined} />
      <span className="font-data text-ui font-semibold tabular-nums text-ink">{clockText(now)}</span>
      {!compact && <span className="text-label text-muted">{th ? phase.th : phase.en}</span>}
    </span>
  );
}
