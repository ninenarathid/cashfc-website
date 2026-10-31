"use client";
import { useEffect, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { GiantRun } from "@/lib/town/reward-garden";
import type { CampMiss } from "@/lib/town/reward-camp";
import { useReward } from "./TownRewardActions";
import TownIcon from "./TownIcon";
import { GiantBed, GiantPlantingGame, type GiantCrop } from "./TownGiantGarden";
import { GROW_REFUSED } from "./TownQuality";
import s from "./TownGiantGarden.module.css";

const WOOD = "pressable tk tk-btn-wood min-h-11 px-3 text-ui font-semibold disabled:opacity-50";

/**
 * The farming line's seventh rank grown at once (lib/town/reward-garden, asked from "let it grow"): the magic garden's own bed
 * and planting game, for the plant at `at` and the size chosen. Passed, the panels close, so that the map's bursting is seen
 * (grow-burst). Missed, the plant, the seeds and the day's use are as they were. A go left open is taken up again.
 */
export default function TownGrowAtOnce({ keeper, th, at, n, onBack, onDone }: { keeper: Keeper; th: boolean; at: string; n: number; onBack: () => void; onDone: () => void }) {
  const a = useReward(keeper, "garden-grow"), [finishing, setFinishing] = useState(false), [missed, setMissed] = useState(false), [refused, setRefused] = useState<string | null>(null), asked = useRef(false);
  const place = at.split(",").map(Number) as [number, number], plant = keeper.farm()[at]?.plant ?? null, crop = plant?.crop as GiantCrop | undefined, purse = keeper.purse(), now = keeper.now();
  const open = purse.professionRewards?.giant, run: GiantRun | null = open && open.until > now && open.grow === n && open.key === at ? open : null;
  async function begin() {
    if (!crop) return;
    setMissed(false); setRefused(null);
    // (a go at something else still open is put down first: there is one at a time)
    if (open && open.until > keeper.now()) await a.send({ action: "giantCancel", at: place });
    const did = await a.send({ action: "giantBegin", grow: n, crop, at: place });
    if (did && !did.ok) setRefused(did.why);
  }
  // (a tick on, not in the mount itself: the request's own hook reads what is left over from before as this mounts)
  useEffect(() => { const t = setTimeout(() => { if (asked.current) return; asked.current = true; if (!run) void begin(); }, 0); return () => clearTimeout(t); }, []);
  async function finish(marks: number[], campMiss?: CampMiss) {
    if (!run) return;
    setFinishing(true);
    try {
      const ms = Math.max(0, run.began + 2400 - keeper.now());
      if (ms) await new Promise((r) => setTimeout(r, ms));
      const did = await a.send({ action: "giantEnd", run: run.id, marks, at: place, ...(campMiss ? { campMiss } : {}) });
      if (did?.ok && did.gardenPassed) onDone();
      else if (did?.ok) setMissed(true);
      else if (did) setRefused(did.why);
    } finally { setFinishing(false); }
  }
  const name = plant ? ITEMS[plant.crop as ItemId]?.name[th ? "th" : "en"] ?? plant.crop : "";
  return (
    <section data-grow-at-once className={`tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col overflow-hidden p-1.5 text-ui text-ink`} style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }} aria-label={th ? "โตทันที" : "Grow at once"}>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1.5 sm:p-2.5">
        <header className="sticky -top-1.5 z-10 -mx-1 flex items-center gap-2 bg-[#5f3b1d] px-1 sm:-top-2.5">
          <TownIcon name="thingGiantSeeds" size={28} />
          <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? `โตทันที ${n}×${n}` : `Grow at once, ${n}×${n}`}</h2>
          <button type="button" onClick={onBack} aria-label={th ? "กลับ" : "Back"} disabled={finishing} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center disabled:opacity-50"><TownIcon name="close" size={16} /></button>
        </header>
        <GiantBed crop={crop ?? null} />
        {run && crop && !finishing && !missed && <GiantPlantingGame key={run.id} run={run} crop={crop} th={th} retryFirst={purse.campRetry?.line === "farming" && purse.campRetry.until > now} onFinish={(m, miss) => void finish(m, miss)}
          aside={<button type="button" data-grow-at-once-stop className={`${WOOD} min-h-12`} disabled={a.busy} onClick={() => { void a.send({ action: "giantCancel", at: place }).then(onBack); }}>{th ? "พักไว้ก่อน" : "Stop"}</button>} />}
        {finishing && <p role="status" className={`${s.note} text-ui`}>{th ? `กำลังปลุก${name}ให้โต…` : `Waking the ${name}…`}</p>}
        {missed && <>
          <p role="status" className={`${s.note} text-ui`} data-tone="miss" data-grow-at-once-missed>{th ? "จังหวะยังไม่ลงตัว ต้นนี้ เมล็ด และสิทธิ์วันนี้ยังอยู่ ลองใหม่ได้เลย" : "The rhythm slipped. The plant, the seeds and today’s use remain; try again."}</p>
          <div className="flex gap-2"><button type="button" className={`${WOOD} min-h-12`} onClick={onBack}>{th ? "กลับ" : "Back"}</button><button type="button" data-grow-at-once-again disabled={a.busy} onClick={() => void begin()} className="pressable tk tk-btn flex min-h-12 flex-1 items-center justify-center font-display text-ui font-semibold disabled:opacity-50">{th ? "ลองอีกครั้ง" : "Try again"}</button></div>
        </>}
        {refused && <>
          <p role="status" className={`${s.note} text-ui`} data-tone="miss" data-grow-at-once-refused={refused}>{(GROW_REFUSED[refused] ?? GROW_REFUSED.none)[th ? 0 : 1]}</p>
          <button type="button" className={`${WOOD} min-h-12`} onClick={onBack}>{th ? "กลับ" : "Back"}</button>
        </>}
        {a.retry && <button type="button" className={`${WOOD} min-h-12`} onClick={() => void a.send()}>{th ? "ตรวจคำสั่งเดิม" : "Check the same request"}</button>}
        <p className="pl-12 text-meta text-[#ead9b4] sm:pl-0">{th ? "แรง 2 ต่อครั้ง · พลาดหรือพักไว้ ไม่เสียสิทธิ์และเมล็ด" : "2 stamina a try · a miss or a stop keeps today’s use and the seeds"}</p>
      </div>
    </section>
  );
}
