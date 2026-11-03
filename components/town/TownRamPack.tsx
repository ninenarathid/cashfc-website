"use client";

import { useEffect, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { PACK, packOpen, roomyPack } from "@/lib/town/ram-pack";
import TownFoot from "./TownFoot";
import TownIcon from "./TownIcon";
import { Slots } from "./TownBox";

/**
 * The cloud ram's pack (lib/town/ram-pack; the owner, 2026-11-04: ten slots on the ram that hold anything, its owner's
 * alone, open while the ram is the familiar put on). A power beside the ride button while the cloud ram follows; opened,
 * the saddlebags' ten slots over my bag, as the storage box shows its own: a tap moves a stack across, all of it, half or
 * one, as chosen at the head. With another familiar the button is gone and what is in the pack stays where it is.
 */
type Step = "all" | "half" | "one";
const STEPS: Array<[Step, [th: string, en: string]]> = [["all", ["ทั้งหมด", "All"]], ["half", ["ครึ่ง", "Half"]], ["one", ["1 ชิ้น", "One"]]];
const stepOf = (step: Step, have: number) => (step === "all" ? have : step === "half" ? Math.ceil(have / 2) : 1);
const WHY: Record<string, [th: string, en: string]> = {
  shut: ["ใส่แกะปุยเมฆเป็นภูตก่อน กระเป๋าถึงจะเปิด", "Put the cloud ram on first to open its pack"],
  packed: ["กระเป๋าแกะเต็มแล้ว", "The ram's pack is full"],
  full: ["กระเป๋าของคุณเต็ม", "Your bag is full"],
};

export default function TownRamPack({ keeper, th }: { keeper: Keeper; th: boolean }) {
  const [open, setOpen] = useState(false), [step, setStep] = useState<Step>("all"), [said, setSaid] = useState<string | null>(null), [busy, setBusy] = useState(false), [, tick] = useState(0);
  useEffect(() => keeper.watch(() => tick((n) => n + 1)), [keeper]);
  const purse = keeper.purse(), on = packOpen(purse) && !!keeper.packPut;
  useEffect(() => { if (open && on) void keeper.packLook?.().catch(() => { /* a database before v319 knows of no pack */ }); }, [open, on, keeper]);
  useEffect(() => { if (!on) setOpen(false); }, [on]);
  if (!on) return null;
  const pack = roomyPack(keeper.pack?.() ?? null), inPack = pack.things.filter(Boolean).length, inBag = purse.bag.filter(Boolean).length;
  const title = th ? "กระเป๋าบนหลังแกะ" : "The ram's pack";

  async function move(from: "pack" | "bag", i: number) {
    const s = (from === "pack" ? pack.things : purse.bag)[i];
    if (!s || busy) return;
    setBusy(true); setSaid(null);
    try {
      const n = stepOf(step, s.n), did = from === "pack" ? await keeper.packTake!(i, n) : await keeper.packPut!(i, n);
      if (!did.ok) setSaid((WHY[did.why] ?? [th ? "ย้ายไม่ได้ ลองใหม่อีกครั้ง" : "That did not move; try again", ""])[th ? 0 : 1]);
    } catch { setSaid(th ? "ติดต่อเมืองไม่ได้ ลองใหม่อีกครั้ง" : "Could not reach the town; try again"); }
    finally { setBusy(false); }
  }

  if (!open) return (
    <TownFoot rank="power" order={11} icon={"ramPack"} badge={inPack || undefined}>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${title} (${inPack}/${PACK.slots})`} data-ram-pack="closed" />
    </TownFoot>
  );
  return (
    <TownFoot rank="board" order={62}>
      <section className="pop-in pointer-events-auto w-[min(400px,calc(100vw-24px))] max-h-[70dvh] overflow-y-auto rounded-xl border border-line-lit bg-surface/97 text-ink shadow-xl shadow-black/40 backdrop-blur-sm" aria-labelledby="town-pack-h" data-ram-pack="open">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <TownIcon name="ramPack" size={30} />
          <h2 id="town-pack-h" className="min-w-0 truncate font-display text-title font-semibold">{title}</h2>
          <button type="button" onClick={() => setOpen(false)} className="pressable ml-auto min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg" data-ram-pack-close>{th ? "ปิด" : "Close"}</button>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span id="town-pack-step" className="mr-1 text-meta text-muted">{th ? "ย้ายครั้งละ" : "A tap moves"}</span>
            <div role="radiogroup" aria-labelledby="town-pack-step" className="flex gap-1.5">
              {STEPS.map(([s, w]) => (
                <button key={s} type="button" role="radio" aria-checked={step === s} onClick={() => setStep(s)}
                        className={`pressable min-h-11 rounded-full border px-3 text-meta ${step === s ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-muted hover:text-ink"}`}>{w[th ? 0 : 1]}</button>
              ))}
            </div>
          </div>
          <p className={`mt-2 min-h-[1.6em] text-meta leading-relaxed ${said ? "text-accent" : "text-muted"}`} aria-live="polite" data-ram-pack-said>
            {said ?? (th ? "เก็บอะไรก็ได้ 10 ช่อง เปิดได้เฉพาะตอนแกะปุยเมฆเป็นภูต คนอื่นเปิดไม่ได้" : "Ten slots for anything, open while the cloud ram follows you, and yours alone")}
          </p>
          {/* the saddlebags: soft leather, a buckle strap down the middle */}
          <div className="relative mt-1 rounded-2xl border-2 border-[#2a190d] bg-gradient-to-b from-[#a8743f] to-[#7a4f26] p-2 shadow-lg shadow-black/40" data-ram-pack-things>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 border-x border-[#2a190d] bg-[#5a3a1c]" />
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1 h-3 w-4 -translate-x-1/2 rounded-sm border-2 border-[#2a190d] bg-[#e0b04a]" />
            <div className="relative rounded-xl border-2 border-[#2e1c0c] bg-[#1d140c] px-2.5 pb-2.5 pt-2 shadow-[inset_0_6px_14px_rgba(0,0,0,0.75)]">
              <p className="mb-2 flex items-center justify-between font-data text-label uppercase tracking-wider text-[#c9a877]">
                <span>{th ? "ในกระเป๋าแกะ" : "In the ram's pack"}</span>
                <span className="tabular-nums" data-ram-pack-count>{inPack} / {pack.things.length}</span>
              </p>
              <Slots slots={pack.things} th={th} label={th ? "ในกระเป๋าแกะ" : "In the ram's pack"} act={th ? "หยิบใส่กระเป๋า" : "Take out"} onPick={(i) => void move("pack", i)} />
            </div>
          </div>
          {/* my bag, as the box shows it */}
          <div className="relative mt-3 rounded-[1.6rem] border-2 border-[#2e1c0c] bg-gradient-to-b from-[#8a5a2b] to-[#6e4420] p-2 shadow-lg shadow-black/40" data-ram-pack-bag>
            <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[1.3rem] border-2 border-dashed border-[#f0d9a8]/35" />
            <div className="relative rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] px-2.5 pb-2.5 pt-2 shadow-[inset_0_6px_14px_rgba(0,0,0,0.75)]">
              <p className="mb-2 flex items-center justify-between font-data text-label uppercase tracking-wider text-[#c9a877]">
                <span className="flex items-center gap-1.5"><TownIcon name="bag" size={14} />{th ? "ในกระเป๋า" : "In the bag"}</span>
                <span className="tabular-nums">{inBag} / {purse.bag.length}</span>
              </p>
              <Slots slots={purse.bag} th={th} label={th ? "ในกระเป๋า" : "In the bag"} act={th ? "ใส่กระเป๋าแกะ" : "Put in the pack"} onPick={(i) => void move("bag", i)} />
            </div>
          </div>
        </div>
      </section>
    </TownFoot>
  );
}
