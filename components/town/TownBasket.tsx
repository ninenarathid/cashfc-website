"use client";

import { useState } from "react";
import { basketOf, basketRoom } from "@/lib/town/cooking";
import { hasThing, numberOf } from "@/lib/town/gifts";
import { ITEMS, isDish, type DishId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { mayEat } from "@/lib/town/stamina";
import type { Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon, WHY } from "./TownTrade";

/** Why not, in the basket's own words (the rest are the trade's). */
const WHY_BASKET: Record<string, [string, string]> = {
  full: ["ตะกร้าเต็มแล้ว", "The basket is full"], none: ["ไม่มีของแบบนั้น", "Nothing of the kind there"],
};
const STARS = [[8, 22], [19, 70], [31, 38], [44, 82], [52, 16], [63, 58], [74, 30], [86, 74], [93, 12], [38, 8], [69, 90], [14, 48]];

/**
 * The kitchen's gifts that are used from the bag (lib/town/gifts), in the bag's own panel.
 *
 * - **The dimension basket** (the second rank): a food pocket of its owner's own. Its twelve places are shown, a
 *   helping to a place; a tap on one takes that dish up, to be eaten straight from the basket (sitting, as from the
 *   bag) or taken back out. Under them, the helpings the bag has: a tap puts one in.
 *
 * It draws and asks; what is kept is the keeper's. Nothing of it is there for somebody who has not the gift.
 */
export default function TownBasket({ keeper, purse, now, th, seated, helpings, say }: {
  keeper: Keeper;
  purse: Purse;
  now: number;
  th: boolean;
  /** Whether I am sitting down: a meal is eaten sitting. */
  seated: boolean;
  /** How many helpings a meal's hours take with whoever keeps the game. */
  helpings: number;
  /** Say what came of a deed, in the panel's own line. */
  say: (th: string, en: string) => void;
}) {
  const has = hasThing(purse, "thingBasket");
  const [picked, setPicked] = useState<DishId | null>(null);
  const [busy, setBusy] = useState(false);
  if (!has) return null;
  const mine = basketOf(purse), holds = numberOf("thingBasket"), room = basketRoom(purse), n = holds - room;
  const cells: Array<DishId | null> = [...mine.flatMap(([d, k]) => Array<DishId>(k).fill(d)), ...Array<null>(Math.max(0, room)).fill(null)];
  const taken = picked && mine.find(([d]) => d === picked) ? picked : null, count = taken ? mine.find(([d]) => d === taken)![1] : 0;
  const name = (d: DishId) => (th ? ITEMS[d].name.th : ITEMS[d].name.en);
  const fromBag = purse.bag.flatMap((s, slot) => (s && isDish(s.item) ? [{ slot, dish: s.item, n: s.n }] : []));
  const eats = mayEat(purse, now, helpings);
  const why = (w: string): [string, string] => WHY_BASKET[w] ?? WHY[w as keyof typeof WHY] ?? WHY.none;
  /** One deed at a time: what it came to is said, or why not. */
  const doing = async <T extends { ok: boolean; why?: string }>(deed: () => Promise<T>, thanks: [string, string]) => {
    if (busy) return;
    setBusy(true);
    try { const did = await deed(); if (did.ok) say(...thanks); else say(...why(did.why ?? "none")); } finally { setBusy(false); }
  };
  const putAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let put = 0;
      // (the bag's helpings, last slot first, so that a slot emptied does not move the ones still to go)
      for (const s of [...fromBag].reverse()) {
        const left = basketRoom(keeper.purse());
        if (left < 1) break;
        const did = await keeper.basketPut(s.slot, Math.min(s.n, left));
        if (did.ok) put += did.n;
      }
      say(`ใส่ตะกร้าแล้ว ${put} ที่`, `${put} helping${put === 1 ? "" : "s"} into the basket.`);
    } finally { setBusy(false); }
  };

  return (
    <section aria-label={th ? "ตะกร้ามิติ" : "Dimension basket"} className="mt-4" data-town-basket data-in={n} data-holds={holds}>
      <style href="town-basket" precedence="medium">{`
        @keyframes tb-pop { from { transform: scale(.4) rotate(-14deg); opacity: 0 } 70% { transform: scale(1.12) } to { transform: none; opacity: 1 } }
        @keyframes tb-twinkle { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes tb-swirl { to { transform: rotate(360deg) } }
        .tb-pop { animation: tb-pop 260ms cubic-bezier(.2, .8, .2, 1) }
        .tb-star { animation: tb-twinkle 2.8s ease-in-out infinite }
        .tb-swirl { animation: tb-swirl 38s linear infinite }
        @media (prefers-reduced-motion: reduce) { .tb-pop, .tb-star, .tb-swirl { animation: none } }
      `}</style>
      <h3 className="mb-1.5 flex items-center gap-1.5 font-data text-label uppercase tracking-wider text-muted">
        <TownIcon name={"thingBasket" as IconName} size={18} />{th ? "ตะกร้ามิติ" : "Dimension basket"}
        <span className="ml-auto tabular-nums text-[#c9b6ff]" data-basket-count>{n} / {holds}</span>
      </h3>
      {/* the basket: wicker round a little night sky, a place to a helping */}
      <div className="rounded-2xl border-2 border-[#2e1c0c] p-1.5 shadow-lg shadow-black/40" style={{ backgroundImage: "repeating-linear-gradient(45deg, #8a5a2b 0 5px, #734a22 5px 10px)" }}>
        <div className="relative overflow-hidden rounded-xl border-2 border-[#2e1c0c] bg-[#17102e] px-2 pb-2 pt-2 shadow-[inset_0_6px_16px_rgba(0,0,0,0.8)]">
          <span aria-hidden className="tb-swirl pointer-events-none absolute -inset-1/2 opacity-60" style={{ background: "conic-gradient(from 0deg, transparent 0 20%, rgba(122,92,255,0.22) 32%, transparent 46% 62%, rgba(74,200,220,0.14) 74%, transparent 88%)" }} />
          {STARS.map(([x, y], i) => (
            <span key={i} aria-hidden className="tb-star pointer-events-none absolute size-[2px] bg-[#e9e2ff]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-(i * 0.37) % 2.8}s` }} />
          ))}
          <ul className="relative grid grid-cols-6 gap-1" aria-label={th ? `อาหารในตะกร้า ${n} จาก ${holds} ที่` : `${n} of ${holds} helpings`}>
            {cells.map((d, i) => (
              <li key={`${i}:${d ?? ""}`} className="aspect-square">
                {d ? (
                  <button type="button" onClick={() => setPicked(taken === d ? null : d)} aria-pressed={taken === d} title={name(d)} aria-label={name(d)} data-basket-cell={d}
                          className={`tb-pop pressable grid size-full place-items-center rounded-lg border-2 bg-[#2a2050]/80 ${taken === d ? "border-[#f2c14e] shadow-[0_0_10px_rgba(242,193,78,0.6)]" : "border-[#4a3a8a]"}`}>
                    <ItemIcon id={d} size={30} />
                  </button>
                ) : <span className="block size-full rounded-lg border-2 border-dashed border-[#3b2f66]/70" data-basket-cell="" />}
              </li>
            ))}
          </ul>
          {/* the dish taken up: eaten straight from the basket, or taken back out */}
          <div className="relative" aria-live="polite">
            {taken ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5" data-basket-picked={taken}>
                <p className="min-w-0 flex-1 truncate text-ui font-semibold text-[#f3e9ff]">{name(taken)} <span className="font-data text-[#c9b6ff]">×{count}</span></p>
                <button type="button" disabled={busy} onClick={() => void doing(() => keeper.basketTake(taken, 1), ["หยิบออกมาแล้ว", "Back in your bag."])} data-basket-take
                        className="pressable min-h-11 shrink-0 rounded-full border border-[#6f5fc0] px-3 text-ui text-[#f3e9ff] hover:border-[#f2c14e] disabled:opacity-40">
                  {th ? "หยิบออก" : "Take out"}
                </button>
                <button type="button" disabled={busy || !eats || !seated} onClick={() => void doing(() => keeper.basketEat(taken, seated), ["เริ่มกินแล้ว", "Tucking in."])} data-basket-eat
                        className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                  {th ? "กิน" : "Eat"}
                </button>
                {!eats && !purse.eating && <p className="w-full text-meta text-[#ffb09c]">{th ? WHY.meal[0] : WHY.meal[1]}</p>}
                {eats && !seated && <p className="w-full text-meta text-[#ffb09c]">{th ? WHY.stand[0] : WHY.stand[1]}</p>}
              </div>
            ) : n === 0 && !fromBag.length ? (
              <p className="mt-2 grid min-h-11 place-items-center text-center text-meta text-[#a89ad6]">{th ? "ตะกร้ายังว่างอยู่" : "The basket is empty."}</p>
            ) : null}
          </div>
          {/* what the bag has that can go in: a tap puts one helping in */}
          {fromBag.length > 0 && (
            <div className="relative mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[#3b2f66] pt-2" data-basket-from>
              <span className="font-data text-label text-[#a89ad6]">{th ? "จากกระเป๋า" : "From the bag"}</span>
              {fromBag.map((s) => (
                <button key={s.slot} type="button" disabled={busy || room < 1} onClick={() => void doing(() => keeper.basketPut(s.slot, 1), ["ใส่ตะกร้าแล้ว", "Into the basket."])}
                        title={name(s.dish)} aria-label={th ? `ใส่ ${name(s.dish)} ลงตะกร้าหนึ่งที่` : `Put one ${name(s.dish)} in`} data-basket-put={s.dish}
                        className="pressable flex min-h-11 items-center gap-1 rounded-full border border-[#6b4a2a] bg-[#33251a] pl-1.5 pr-2.5 text-meta text-[#f3e3c3] hover:border-[#f2c14e] disabled:opacity-40">
                  <ItemIcon id={s.dish} size={24} /><span className="font-data tabular-nums">×{s.n}</span>
                </button>
              ))}
              <button type="button" disabled={busy || room < 1} onClick={() => void putAll()} data-basket-all
                      className="pressable ml-auto min-h-11 rounded-full border border-[#6f5fc0] px-3 text-meta text-[#f3e9ff] hover:border-[#f2c14e] disabled:opacity-40">
                {th ? "ใส่ทั้งหมด" : "Put all in"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
