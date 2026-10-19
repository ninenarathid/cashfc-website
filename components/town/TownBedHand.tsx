"use client";

import { useEffect, useRef, useState } from "react";
import { useCloses } from "./useCloses";
import { BEDS, type Plot } from "@/lib/town/farm";
import { BED_NEAR, houseIn, plantsIn } from "@/lib/town/bed-hand";
import type { Keeper } from "@/lib/town/keeper";
import type { Stander } from "@/lib/town/line";
import TownIcon, { type IconName } from "./TownIcon";

/*
 * A bed's owner's say over it on the page (lib/town/bed-hand; the owner, 2026-10-19): a chip when I stand in my own
 * bed, and the card it opens: hand the bed to somebody standing near me, or give it up. Each is asked again before it
 * is sent, every time, with what it does said plainly ("ขึ้นเตือนก่อนด้วย ให้กด ยืนยันทุกครั้ง เพราะเป็นคำสั่ง สำคัญ"),
 * as the farm asks before a plant is dug out: the confirming card with "leave it" ready under the finger.
 */

const WHY: Record<string, [string, string]> = {
  beds: ["คนนี้มีแปลงครบ 2 แปลงแล้ว รับเพิ่มไม่ได้", "They hold two beds already and may take no more"],
  theirs: ["แปลงนี้ไม่ใช่ของเราแล้ว", "This bed is no longer yours"],
  full: ["กระเป๋าเต็ม · ต้องมีที่ว่าง 1 ช่องให้บ้านแมลงก่อน", "Your bag is full · make room for the insect house first"],
  none: ["ทำไม่ได้ตอนนี้", "That cannot be done now"],
};

/** Standing in my own bed: how many plants it has, and the way into its card. */
export function BedChip({ bed, plots, th, onOpen }: { bed: number; plots: Readonly<Record<string, Plot>>; th: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-bed-chip
            className="pop-in pressable tk tk-slot pointer-events-auto flex min-h-11 items-center gap-2 px-3 text-ui text-ink" data-state="open">
      <TownIcon name={"hoe" as IconName} size={22} />
      <span className="font-semibold">{th ? "แปลงของฉัน" : "My bed"}</span>
      <span className="text-meta text-muted">{th ? `ผัก ${plantsIn(bed, plots)} ต้น` : `${plantsIn(bed, plots)} plants`}</span>
    </button>
  );
}

/** Who stands near me, still and here, the nearest first: whom a bed may be handed to. */
export function standersNear(people: Stander[], me: string): Array<Stander & { far: number }> {
  const self = people.find((p) => p.id === me);
  if (!self) return [];
  return people.filter((p) => p.id !== me && !p.away).map((p) => ({ ...p, far: Math.max(Math.abs(p.x - self.x), Math.abs(p.y - self.y)) }))
    .filter((p) => p.far <= BED_NEAR).sort((a, b) => a.far - b.far || (a.id < b.id ? -1 : 1));
}

type Asking = { what: "give"; to: string; name: string } | { what: "leave" };

/** My bed's card: hand it to somebody near, or give it up; each asked again before it is sent. */
export function BedHandPanel({ keeper, bed, plots, holds, people, th, onClose, onDone }: {
  keeper: Keeper;
  bed: number;
  plots: Readonly<Record<string, Plot>>;
  /** How many beds each member holds now (lib/town/keeper's owners, counted). */
  holds: ReadonlyMap<string, number>;
  people: () => Stander[];
  th: boolean;
  onClose: () => void;
  /** What came of it, said in the farm's line. */
  onDone: (said: string) => void;
}) {
  const close = useRef<HTMLButtonElement>(null), leaveIt = useRef<HTMLButtonElement>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [busy, setBusy] = useState(false);
  useCloses(() => (asking ? setAsking(null) : onClose()), asking ? leaveIt : close);
  useEffect(() => { if (asking) leaveIt.current?.focus(); }, [asking]);
  const near = standersNear(people(), keeper.id), plants = plantsIn(bed, plots), house = houseIn(bed, plots);

  const send = async () => {
    if (!asking || busy) return;
    // (the one to hand it to is still near at the confirming: whoever walked off or left is not handed a bed)
    if (asking.what === "give" && !standersNear(people(), keeper.id).some((p) => p.id === asking.to)) {
      setAsking(null);
      onDone(th ? `${asking.name} ไม่ได้ยืนใกล้แล้ว · ยังไม่ได้ยกแปลง` : `${asking.name} is no longer near · the bed is still yours`);
      return;
    }
    setBusy(true);
    const did = asking.what === "give" ? await keeper.bedGive(bed, asking.to, asking.name) : await keeper.bedLeave(bed);
    setBusy(false);
    setAsking(null);
    if (!did.ok) { const w = WHY[did.why] ?? WHY.none; onDone(th ? w[0] : w[1]); return; }
    onDone(asking.what === "give"
      ? (th ? `ยกแปลงให้ ${asking.name} แล้ว` : `The bed is ${asking.name}'s now`)
      : (th ? "เลิกแปลงแล้ว แปลงว่างให้คนอื่นจองได้" : "The bed is given up and free for anybody"));
    onClose();
  };

  if (asking) return (
    <div role="alertdialog" aria-labelledby="bed-ask-h" aria-describedby="bed-ask-p" data-state="open" data-bed-ask={asking.what}
         className="pop-in pointer-events-auto w-full max-w-[22rem] rounded-2xl border border-line-lit bg-surface/97 p-4 shadow-xl shadow-black/40 backdrop-blur-sm">
      <p id="bed-ask-h" className="text-read font-semibold text-ink">
        {asking.what === "give" ? (th ? `ยกแปลงนี้ให้ ${asking.name}?` : `Hand this bed to ${asking.name}?`) : th ? "เลิกแปลงนี้?" : "Give this bed up?"}
      </p>
      <p id="bed-ask-p" className="mt-1 text-ui leading-relaxed text-muted">
        {asking.what === "give"
          ? (th ? `ผัก ${plants} ต้น${house ? "และบ้านแมลง" : ""}ในแปลงจะเป็นของ ${asking.name} ทั้งหมด ยกแล้วเอาคืนไม่ได้ เว้นแต่เขายกคืนให้`
            : `The ${plants} plant${plants === 1 ? "" : "s"}${house ? " and the insect house" : ""} in it will all be ${asking.name}'s. It cannot be had back unless they hand it back.`)
          : (th ? `ผักทั้งหมด ${plants} ต้นจะหายไป${house ? " บ้านแมลงกลับเข้ากระเป๋า แมลงในห้องจะบินหนีไป" : ""} และแปลงจะว่างให้คนอื่นจอง เอาคืนไม่ได้`
            : `All ${plants} plant${plants === 1 ? "" : "s"} will be gone${house ? ", the insect house back in your bag and its insects flown" : ""}, and the bed free for anybody. It cannot be had back.`)}
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button ref={leaveIt} type="button" onClick={() => setAsking(null)} data-bed-ask-no
                className="pressable min-h-11 rounded-full border border-line-strong px-4 text-ui font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
          {th ? "ยกเลิก" : "Leave it"}
        </button>
        <button type="button" onClick={() => void send()} disabled={busy} data-bed-ask-yes
                className="pressable min-h-11 rounded-full border border-chili bg-chili/15 px-4 text-ui font-semibold text-chili transition-colors hover:bg-chili/25 disabled:opacity-60">
          {asking.what === "give" ? (th ? `ยืนยัน ยกให้ ${asking.name}` : `Yes, hand it to ${asking.name}`) : th ? "ยืนยัน เลิกแปลง" : "Yes, give it up"}
        </button>
      </div>
    </div>
  );

  return (
    <section data-bed-panel aria-label={th ? "แปลงของฉัน" : "My bed"} style={{ maxHeight: "min(36rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto overscroll-contain p-3 pb-12 text-ui text-ink sm:gap-2.5 sm:p-4">
      <header className="flex items-center gap-2">
        <TownIcon name={"hoe" as IconName} size={28} />
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? "แปลงของฉัน" : "My bed"}</h2>
        <span className="text-meta text-muted" data-bed-plants>{th ? `ผัก ${plants} ต้น${house ? " · บ้านแมลง" : ""}` : `${plants} plants${house ? " · insect house" : ""}`}</span>
        <button ref={close} type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <h3 className="text-meta font-semibold">{th ? "ยกแปลงให้คนที่ยืนใกล้ๆ" : "Hand it to somebody near you"}</h3>
      {near.length ? (
        <ul className="flex flex-col gap-1.5" data-bed-near>
          {near.map((p) => {
            const n = holds.get(p.id) ?? 0, full = n >= BEDS.each;
            return (
              <li key={p.id}>
                <button type="button" disabled={full || busy} onClick={() => setAsking({ what: "give", to: p.id, name: p.name })} data-bed-give={p.id}
                        className="pressable tk tk-slot flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left disabled:opacity-60">
                  <span className="min-w-0 truncate font-semibold">{th ? `ยกให้ ${p.name}` : `Hand to ${p.name}`}</span>
                  <span className="shrink-0 text-meta text-muted">{full ? (th ? `มีครบ ${BEDS.each} แปลงแล้ว` : `holds ${BEDS.each} already`) : th ? `มี ${n} แปลง` : `holds ${n}`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-bed-none-near>
          {th ? `ยังไม่มีใครยืนใกล้ๆ · ให้เพื่อนมายืนห่างไม่เกิน ${BED_NEAR} ช่อง` : `Nobody stands near · a friend within ${BED_NEAR} tiles may be handed it`}
        </p>
      )}
      <button type="button" disabled={busy} onClick={() => setAsking({ what: "leave" })} data-bed-leave
              className="pressable mt-1 min-h-11 self-start rounded-full border-2 border-[#4a140c] bg-[#b8432f] px-4 text-ui font-semibold text-[#fff7df] shadow-[0_2px_0_rgb(0_0_0/0.35)] transition-[filter] [text-shadow:0_1px_0_rgb(0_0_0/0.4)] hover:brightness-110 disabled:opacity-60">
        {th ? "เลิกแปลงนี้" : "Give this bed up"}
      </button>
    </section>
  );
}
