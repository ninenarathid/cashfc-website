"use client";

import { useState } from "react";
import { basketOf, basketRoom } from "@/lib/town/cooking";
import { USES, hasThing, numberOf, usesLeft } from "@/lib/town/gifts";
import { DISHES, ITEMS, isDish, type DishId, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { mayEat, spiceOf } from "@/lib/town/stamina";
import type { Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon, WHY } from "./TownTrade";

/** Why not, in the basket's own words (the rest are the trade's). */
const WHY_BASKET: Record<string, [string, string]> = {
  full: ["ตะกร้าเต็มแล้ว", "The basket is full"], none: ["ไม่มีของแบบนั้น", "Nothing of the kind there"], spent: ["วันนี้ใช้ครบแล้ว", "No more of it today"],
};
const STARS = [[8, 22], [19, 70], [31, 38], [44, 82], [52, 16], [63, 58], [74, 30], [86, 74], [93, 12], [38, 8], [69, 90], [14, 48]];
/** Whether the stardust spice has anything to raise on a thing: a dish that leaves a buff. */
export const takesSpice = (id: ItemId): boolean => isDish(id) && !!DISHES[id].buff;

/**
 * The kitchen's gifts that are used from the bag (lib/town/gifts), in the bag's own panel.
 *
 * - **The dimension basket** (the second rank): a food pocket of its owner's own. Its twelve places are shown, a
 *   helping to a place; a tap on one takes that dish up, to be eaten straight from the basket (sitting, as from the
 *   bag) or taken back out. Under them, the helpings the bag has: a tap puts one in.
 * - **The stardust spice** (the fifth rank): held over the next bowl (`spice`, the panel's own: the bag's "eat" and
 *   the basket's both read it), and sprinkled as that bowl is begun. It says where it is: over the next bowl, on the
 *   bowl being eaten, or used for today.
 * - **The phoenix flame in a bottle** (the sixth rank): its stove is set where I stand from here (`onStove`: the bag
 *   is put away and the kitchen table laid over the flame), and it says how many times more today it gives back what
 *   comes to nothing.
 *
 * It draws and asks; what is kept is the keeper's. Nothing of a gift is there for somebody who has it not.
 */
export default function TownBasket({ keeper, purse, now, th, seated, helpings, say, spice, onSpice, onStove }: {
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
  /** Whether the spice is held over the next bowl; and holding it there, or putting it away. */
  spice: boolean;
  onSpice: (on: boolean) => void;
  /** Set the phoenix flame's stove where I stand: the bag is put away, and the kitchen table laid there. */
  onStove: () => void;
}) {
  const basket = hasThing(purse, "thingBasket"), jar = hasThing(purse, "thingSpice"), bottle = hasThing(purse, "thingFlame");
  const [picked, setPicked] = useState<DishId | null>(null);
  const [busy, setBusy] = useState(false);
  if (!basket && !jar && !bottle) return null;
  const flameLeft = bottle ? usesLeft(purse, "thingFlame", now) : 0;
  const mine = basketOf(purse), holds = numberOf("thingBasket"), room = basketRoom(purse), n = holds - room;
  const cells: Array<DishId | null> = [...mine.flatMap(([d, k]) => Array<DishId>(k).fill(d)), ...Array<null>(Math.max(0, room)).fill(null)];
  const taken = picked && mine.find(([d]) => d === picked) ? picked : null, count = taken ? mine.find(([d]) => d === taken)![1] : 0;
  const name = (d: DishId) => (th ? ITEMS[d].name.th : ITEMS[d].name.en);
  const fromBag = purse.bag.flatMap((s, slot) => (s && isDish(s.item) ? [{ slot, dish: s.item, n: s.n }] : []));
  const eats = mayEat(purse, now, helpings);
  const spiceLeft = jar ? usesLeft(purse, "thingSpice", now) : 0, onBowl = spiceOf(purse) > 0, armed = jar && spice && spiceLeft > 0 && !purse.eating;
  const why = (w: string): [string, string] => WHY_BASKET[w] ?? WHY[w as keyof typeof WHY] ?? WHY.none;
  /** One deed at a time: what it came to is said, or why not. */
  const doing = async <T extends { ok: boolean; why?: string }>(deed: () => Promise<T>, thanks: [string, string]) => {
    if (busy) return;
    setBusy(true);
    try { const did = await deed(); if (did.ok) say(...thanks); else say(...why(did.why ?? "none")); return did.ok; } finally { setBusy(false); }
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
  /** A helping out of the basket: sprinkled, where the spice is held over the next bowl and the dish leaves a buff. */
  const eat = async (dish: DishId) => {
    const sprinkle = armed && takesSpice(dish);
    const did = await doing(() => (sprinkle ? keeper.spiceEat({ dish }, seated) : keeper.basketEat(dish, seated)), sprinkle ? ["โรยเครื่องเทศแล้ว เริ่มกิน", "Sprinkled. Tucking in."] : ["เริ่มกินแล้ว", "Tucking in."]);
    if (did && sprinkle) onSpice(false);
  };

  return (
    <div className="mt-4 flex flex-col gap-3" data-town-kitchen-gifts>
      <style href="town-basket" precedence="medium">{`
        @keyframes tb-pop { from { transform: scale(.4) rotate(-14deg); opacity: 0 } 70% { transform: scale(1.12) } to { transform: none; opacity: 1 } }
        @keyframes tb-twinkle { 0%, 100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes tb-swirl { to { transform: rotate(360deg) } }
        @keyframes tb-fall { 0% { transform: translate(0, -8px) scale(.6); opacity: 0 } 25% { opacity: 1 } 100% { transform: translate(var(--dx), 26px) scale(1); opacity: 0 } }
        @keyframes tb-tilt { 0%, 100% { transform: rotate(0) } 30% { transform: rotate(-24deg) } 60% { transform: rotate(-16deg) } }
        .tb-pop { animation: tb-pop 260ms cubic-bezier(.2, .8, .2, 1) }
        .tb-star { animation: tb-twinkle 2.8s ease-in-out infinite }
        .tb-swirl { animation: tb-swirl 38s linear infinite }
        .tb-fall { animation: tb-fall 1.1s ease-in infinite }
        .tb-tilt { animation: tb-tilt 1.6s ease-in-out infinite; transform-origin: 60% 80% }
        @keyframes tb-flame { 0%, 100% { transform: scale(1) } 35% { transform: scale(1.06, 1.12) } 70% { transform: scale(.97, 1.04) } }
        .tb-flame { animation: tb-flame 900ms steps(4) infinite; transform-origin: 50% 100% }
        @media (prefers-reduced-motion: reduce) { .tb-pop, .tb-star, .tb-swirl, .tb-tilt, .tb-flame { animation: none } .tb-fall { animation: none; opacity: .9 } }
      `}</style>

      {basket && (
        <section aria-label={th ? "ตะกร้ามิติ" : "Dimension basket"} data-town-basket data-in={n} data-holds={holds}>
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
                    <button type="button" disabled={busy || !eats || !seated} onClick={() => void eat(taken)} data-basket-eat data-spiced={armed && takesSpice(taken) ? "" : undefined}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                      {armed && takesSpice(taken) ? (th ? "โรยแล้วกิน" : "Sprinkle & eat") : (th ? "กิน" : "Eat")}
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
      )}

      {/* the stardust spice: held over the next bowl, on the bowl being eaten, or used for today */}
      {jar && (
        <section aria-label={th ? "เครื่องเทศดาวตก" : "Stardust spice"} data-town-spice data-left={spiceLeft} data-state={onBowl ? "bowl" : armed ? "held" : spiceLeft > 0 ? "ready" : "spent"}
                 className={`relative flex min-h-14 items-center gap-2.5 overflow-hidden rounded-xl border-2 px-2.5 py-1.5 ${onBowl || armed ? "border-[#f2c14e] bg-[#2a1f4f]" : "border-[#3b2f66] bg-[#1d1638]"}`}>
          <span className="relative grid size-11 shrink-0 place-items-center">
            <TownIcon name={"thingSpice" as IconName} size={36} className={armed || onBowl ? "tb-tilt" : spiceLeft > 0 ? "" : "opacity-45 grayscale"} />
            {(armed || onBowl) && [[-10, 0], [2, 0.3], [-4, 0.6], [8, 0.85]].map(([dx, at], i) => (
              <span key={i} aria-hidden className="tb-fall pointer-events-none absolute left-1/2 top-1/2 size-1 bg-[#ffe9a6] shadow-[0_0_4px_#ffe9a6]" style={{ ["--dx" as string]: `${dx}px`, animationDelay: `${-at}s` }} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-ui font-semibold text-[#f3e9ff]">
              <span className="truncate">{th ? "เครื่องเทศดาวตก" : "Stardust spice"}</span>
              <span aria-hidden className="flex shrink-0 gap-0.5">
                {Array.from({ length: USES.thingSpice?.n ?? 1 }, (_, i) => <span key={i} className={`size-1.5 rounded-full border border-[#c9b6ff] ${i < spiceLeft ? "bg-[#ffe9a6]" : "bg-transparent"}`} />)}
              </span>
            </span>
            <span className="block truncate text-meta text-[#c9b6ff]" aria-live="polite">
              {onBowl ? (th ? `ถ้วยนี้โรยแล้ว · บัฟขั้น ${spiceOf(purse)}` : `On this bowl · buff level ${spiceOf(purse)}`)
                : armed ? (th ? "ถืออยู่เหนือถ้วยถัดไป" : "Held over the next bowl")
                  : spiceLeft > 0 ? (th ? "พร้อมโรย" : "Ready") : (th ? "วันนี้ใช้แล้ว" : "Used today")}
            </span>
          </span>
          <button type="button" disabled={spiceLeft < 1 || !!purse.eating} aria-pressed={armed} onClick={() => onSpice(!armed)} data-spice-hold
                  className={`pressable min-h-11 shrink-0 rounded-full px-3 text-ui font-semibold disabled:opacity-40 ${armed ? "border border-[#f2c14e] text-[#ffe9a6]" : "bg-[#f2c14e] text-[#2a1f0a]"}`}>
            {armed ? (th ? "เก็บ" : "Put away") : (th ? "โรยถ้วยถัดไป" : "Sprinkle next")}
          </button>
        </section>
      )}

      {/* the phoenix flame in a bottle: its stove set where I stand, and how many times more today it gives back what comes to nothing */}
      {bottle && (
        <section aria-label={th ? "เปลวฟีนิกซ์ในขวด" : "Phoenix flame in a bottle"} data-town-flame data-left={flameLeft}
                 className="relative flex min-h-14 items-center gap-2.5 overflow-hidden rounded-xl border-2 border-[#7a3a12] px-2.5 py-1.5" style={{ background: "radial-gradient(120% 140% at 0% 100%, rgba(255,140,50,0.28), transparent 60%), #24140e" }}>
          <span className="grid size-11 shrink-0 place-items-center"><span className="tb-flame block"><TownIcon name={"thingFlame" as IconName} size={36} /></span></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-ui font-semibold text-[#ffe6cc]">
              <span className="truncate">{th ? "เปลวฟีนิกซ์ในขวด" : "Phoenix flame"}</span>
              <span aria-hidden className="flex shrink-0 gap-0.5">
                {Array.from({ length: USES.thingFlame?.n ?? 3 }, (_, i) => <span key={i} className={`size-1.5 rounded-full border border-[#ff9a3c] ${i < flameLeft ? "bg-[#ff9a3c]" : "bg-transparent"}`} />)}
              </span>
            </span>
            <span className="block truncate text-meta text-[#e0a878]">{th ? `คืนวัตถุดิบได้อีก ${flameLeft} ครั้งวันนี้` : `Gives things back ${flameLeft} more time${flameLeft === 1 ? "" : "s"} today`}</span>
          </span>
          <button type="button" onClick={onStove} data-flame-stove
                  className="pressable min-h-11 shrink-0 rounded-full bg-[#ff9a3c] px-3 text-ui font-semibold text-[#2a1206]">
            {th ? "ตั้งเตาตรงนี้" : "Set the stove here"}
          </button>
        </section>
      )}
    </div>
  );
}
