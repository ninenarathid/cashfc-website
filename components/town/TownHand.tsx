"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { handySlots, nextHandy } from "@/lib/town/hand";
import { ITEMS } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import TownFoot from "./TownFoot";
import TownIcon from "./TownIcon";
import { StackIcon, holdsOf } from "./TownTrade";

/**
 * The hand's quick bar: what of the bag is taken in the hand to do something with (lib/town/hand), there on the map,
 * so that changing from the hoe to the seed to the can needs no opening of the bag (a member, by way of the owner,
 * 2026-10-08: "มีปุ่ม / คีย์ลัดสลับเครื่องมือในตัวแบบไวๆ ไม่ต้องเปิดช่องเก็บของเพื่อกดถือทุกครั้ง").
 *
 * - A wide screen: a row at the foot of the map (the foot's lowest piece, put away with the rest while a game's
 *   board is up), each thing with the number of its key.
 * - A phone: one button beside the chat's, with what is in the hand on it; a tap unfolds the things over it.
 * - A tap on a thing takes it in the hand, and on the one that is held puts it away. The keys 1 to 9 are the
 *   things in their order, and Q goes round them (by the keys' places, so the same keys with a Thai layout).
 *   Not while something is typed, a game's board is up, or a screen lies over the whole map (the kitchen's table).
 * - It says nothing of what a thing is for: it is the bag's own things by their pictures and names, as the bag has
 *   them. Taking one up is the bag's own "hold" (`keeper.hold`): nothing new is asked of whoever keeps the game.
 */
export default function TownHand({ keeper, th, phone = false, hidden = false, className = "" }: {
  keeper: Keeper; th: boolean;
  /** A phone's: one button that unfolds, in the row of the chat's button (the map puts it there). */
  phone?: boolean;
  /** Something of the map's is open that the bar would be in the way of, or that the keys are for. */
  hidden?: boolean;
  /** The look of a phone's button: the map's own for the buttons beside it. */
  className?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse(), slots = handySlots(purse), held = keeper.handSlot();
  const [open, setOpen] = useState(false), box = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const take = useCallback((slot: number) => {
    if (slot < 0 || busy.current) return;
    busy.current = true;
    void keeper.hold(keeper.handSlot() === slot ? null : slot).finally(() => { busy.current = false; });
  }, [keeper]);

  // The keys: by their places on the keyboard. Read from the keeper as the key comes, so that nothing is stale.
  const off = useRef(hidden);
  off.current = hidden;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (off.current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (!digit && e.code !== "KeyQ") return;
      // (a game's board is up, or a screen lies over the whole map: the hand stays as it is)
      const stage = document.querySelector("canvas")?.parentElement;
      if (document.querySelector('[data-foot="board"]') || stage?.querySelector(":scope > .absolute.inset-0.z-30")) return;
      const now = handySlots(keeper.purse());
      const slot = digit ? now[Number(digit[1]) - 1] ?? -1 : nextHandy(now, keeper.handSlot());
      if (slot < 0) return;
      e.preventDefault();
      if (digit) take(slot); else if (slot !== keeper.handSlot()) take(slot);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keeper, take]);

  // A phone's: a tap outside folds it again; so does whatever hides it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => { if (hidden || !slots.length) setOpen(false); }, [hidden, slots.length]);

  // (for scripts in `next dev`: what the bar has, what is held, and taking one up)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { slots: () => handySlots(keeper.purse()), held: () => keeper.handSlot(), take, open: () => open };
    (window as unknown as { __townHand?: typeof handle }).__townHand = handle;
    return () => { delete (window as unknown as { __townHand?: typeof handle }).__townHand; };
  }, [keeper, take, open]);

  if (hidden || !slots.length) return null;
  const nameOf = (slot: number) => { const s = purse.bag[slot]!; return s.of ? (th ? `หม้อ${ITEMS[s.of.dish].name.th}` : `Pot of ${ITEMS[s.of.dish].name.en.toLowerCase()}`) : th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en; };
  const label = th ? "ของในมือ" : "In the hand";

  if (phone) {
    const inHand = held >= 0 ? purse.bag[held] : null;
    return (
      <div ref={box} data-town-hand="phone">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={label} title={label}
                className={`${className} ${open ? "border-accent" : inHand ? "border-gold" : ""}`}>
          {inHand ? <StackIcon stack={inHand} size={26} /> : <TownIcon name="hand" size={24} />}
        </button>
        {open && (
          <div role="menu" aria-label={label} data-state="open"
               className="pop-in absolute bottom-full left-0 z-30 mb-2 grid w-[15rem] max-w-[calc(100vw-1.5rem)] grid-cols-3 gap-1 rounded-2xl border border-line-lit bg-surface/97 p-1.5 shadow-xl shadow-black/40 backdrop-blur-sm">
            {slots.map((slot) => {
              const on = slot === held;
              return (
                <button key={slot} type="button" role="menuitemradio" aria-checked={on} data-hand-slot={slot} onClick={() => { take(slot); setOpen(false); }}
                        className={`pressable flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-label leading-tight text-ink ${on ? "border-gold bg-gold/15" : "border-transparent hover:bg-card"}`}>
                  <StackIcon stack={purse.bag[slot]!} size={30} />
                  <span className="line-clamp-2 text-center">{nameOf(slot)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <TownFoot rank="chip" order={90}>
      <div role="toolbar" aria-label={label} data-town-hand="bar" data-state="open"
           className="pop-in pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-line bg-bg/70 p-1 shadow-lg shadow-black/30 backdrop-blur-sm">
        {slots.map((slot, i) => {
          const s = purse.bag[slot]!, on = slot === held, holds = holdsOf(s, th);
          return (
            <button key={slot} type="button" aria-pressed={on} data-hand-slot={slot} onClick={() => take(slot)}
                    title={`${nameOf(slot)}${holds ? ` · ${holds}` : ""} (${i + 1})`} aria-label={`${nameOf(slot)} (${i + 1})`}
                    className={`pressable relative grid size-10 place-items-center rounded-xl border transition-colors ${on ? "border-gold bg-gold/20" : "border-line-strong bg-bg/60 hover:border-accent"}`}>
              <StackIcon stack={s} size={26} />
              <kbd aria-hidden className={`absolute left-0.5 top-0 font-data text-[0.625rem] leading-4 ${on ? "text-gold" : "text-muted"}`}>{i + 1}</kbd>
              {ITEMS[s.item].stack > 1 && <span aria-hidden className="absolute bottom-0 right-0.5 font-data text-[0.625rem] font-semibold leading-4 tabular-nums text-ink [text-shadow:0_1px_2px_#000]">{s.n}</span>}
            </button>
          );
        })}
      </div>
    </TownFoot>
  );
}
