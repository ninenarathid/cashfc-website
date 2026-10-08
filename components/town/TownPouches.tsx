"use client";

import { useState } from "react";
import { giftOf } from "@/lib/town/gifts";
import { ITEMS, iconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { pouchesOf } from "@/lib/town/pouches";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * The pouches somebody has, in the bag's panel: each a row of its own under the bag's pockets (lib/town/pouches: slots
 * beyond the bag's that hold only some things). A tap on what is in a slot takes it out into the bag; the button at a
 * row's end puts away what the bag has that the pouch takes. Nothing at all, for whoever has no pouch.
 */
export default function TownPouches({ keeper, th }: { keeper: Keeper; th: boolean }) {
  const [busy, setBusy] = useState(false), [said, setSaid] = useState<string | null>(null);
  const purse = keeper.purse(), mine = pouchesOf(purse).filter((p) => keeper.gives(p.pouch.gift));
  if (!mine.length) return null;
  const run = async (go: () => Promise<{ ok: boolean; why?: string }>) => {
    if (busy) return;
    setBusy(true); setSaid(null);
    const did = await go();
    if (!did.ok) setSaid(did.why === "full" ? (th ? "ไม่มีที่ว่างแล้ว" : "No room") : null);
    setBusy(false);
  };
  return (
    <div className="mt-2 flex flex-col gap-2" data-pouches>
      {mine.map(({ pouch, slots }) => {
        const gift = giftOf(pouch.gift), fits = purse.bag.map((s, i) => ({ s, i })).filter(({ s }) => !!s && pouch.holds.includes(s.item) && !s.of && s.water === undefined && !(s.plus ?? 0) && !s.opts?.length && !s.gems?.length);
        return (
          <section key={pouch.gift} aria-label={gift ? (th ? gift.name.th : gift.name.en) : pouch.gift} data-pouch={pouch.gift}>
            <div className="mb-1 flex items-center gap-1.5">
              <TownIcon name={pouch.gift as IconName} size={20} />
              <h3 className="text-meta font-semibold text-[#e9cfa4]">{gift ? (th ? gift.name.th : gift.name.en) : pouch.gift}</h3>
              {said && <span className="text-label text-[#ffb09c]" aria-live="polite">{said}</span>}
              <button type="button" disabled={busy || !fits.length} data-pouch-in
                      onClick={() => run(async () => { let any = false, why: string | undefined; for (const { i } of [...fits].reverse()) { const did = await keeper.pouchIn(i); if (did.ok) any = true; else why = did.why; } return { ok: any, why }; })}
                      className="pressable ml-auto min-h-8 rounded-md border border-[#6b4a2a] bg-[#33251a] px-2.5 text-label text-[#f3e3c3] disabled:opacity-40">{th ? "เก็บจากกระเป๋า" : "Put away"}</button>
            </div>
            <ul className="grid grid-cols-5 gap-1.5">
              {slots.map((s, i) => {
                const look = `relative grid h-11 w-full place-items-center rounded-xl border-2 ${s ? "border-[#7a6a4a] bg-[#2f2a22] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] hover:border-[#c9a877]" : "border-dashed border-[#4a4334] bg-[#211d17] shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)]"}`;
                if (!s) return <li key={i} className={look} data-pouch-slot={i}><span className="sr-only">{th ? "ช่องว่าง" : "Empty slot"}</span></li>;
                const name = th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en;
                return (
                  <li key={i}>
                    <button type="button" disabled={busy} onClick={() => run(() => keeper.pouchOut(pouch.gift, i))} data-pouch-slot={i} data-item={s.item} data-n={s.n}
                            aria-label={`${name} ×${s.n}`} title={name} className={`pressable ${look}`}>
                      <TownIcon name={iconOf(s.item) as IconName} size={26} />
                      <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000,0_0_2px_#000]">{s.n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
