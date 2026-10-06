"use client";

import { useEffect, useState } from "react";
import { wearing } from "@/lib/town/gifts";
import { HELPING, runOf, timesAt } from "@/lib/town/helping";
import type { Keeper } from "@/lib/town/keeper";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * What the gifts of the helpers' line show on the map's page (lib/town/helping), beside the farm's own buttons
 * (components/town/TownFarm, which draws what is drawn on the map itself).
 */

/**
 * The anklet's run, while it lasts: a pip for each plant of it, up to the twenty that make the most of it, what a
 * watering is worth now, and how much of the eight seconds is left before it begins anew. It says nothing of how:
 * the pips and the time say it.
 */
export function AnkletRun({ keeper }: { keeper: Keeper }) {
  const [, setTick] = useState(0);
  const purse = keeper.purse(), now = keeper.now(), run = wearing(purse, "charmAnklet") ? runOf(purse, now) : 0, alive = run > 0;
  // (the time left runs down by itself: looked at five times a second while there is a run)
  useEffect(() => { if (!alive) return; const t = setInterval(() => setTick((n) => n + 1), 200); return () => clearInterval(t); }, [alive]);
  if (!alive) return null;
  const top = run >= HELPING.anklet.run, left = Math.max(0, Math.min(1, 1 - (now - (purse.chime?.at ?? now)) / (HELPING.anklet.gap * 1000)));
  return (
    <div className={`pop-in pointer-events-none flex items-center gap-2 rounded-full border-2 bg-[#3a2513]/95 py-1 pl-1.5 pr-3 shadow-lg shadow-black/40 ${top ? "border-[#ffe19a]" : "border-[#9c6b3d]"}`}
         data-state="open" data-anklet-run={run} data-anklet-times={timesAt(run)} aria-hidden>
      <span className="grid size-8 place-items-center rounded-full border-2 border-[#2a190d] bg-[#6b4424]"><TownIcon name={"charmAnklet" as IconName} size={22} /></span>
      <span className="flex flex-col gap-1">
        {/* a pip a plant, ten to a line */}
        <span className="grid grid-cols-10 gap-[2px]">
          {Array.from({ length: HELPING.anklet.run }, (_, i) => <span key={i} className={`size-[5px] ${i < run ? (top ? "bg-[#ffd98a]" : "bg-[#cfe9ff]") : "bg-[#4a2f18]"}`} />)}
        </span>
        {/* the time left before the run begins anew */}
        <span className="block h-[3px] w-full overflow-hidden bg-[#4a2f18]"><span className={`block h-full ${top ? "bg-[#ffd98a]" : "bg-[#cfe9ff]"}`} style={{ width: `${left * 100}%` }} /></span>
      </span>
      <span className={`font-data text-ui font-semibold tabular-nums ${top ? "text-[#ffe19a]" : "text-[#e9cfa4]"}`}>×{timesAt(run)}</span>
    </div>
  );
}
