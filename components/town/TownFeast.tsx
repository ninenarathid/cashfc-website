"use client";

import { useEffect, useRef } from "react";
import { ODD, ladle, potNow, type FeastTold, type Pot } from "@/lib/town/cooking";
import { BOWL, ITEMS, potIconOf, type ItemId } from "@/lib/town/items";
import { bowlsToday, mealOf } from "@/lib/town/stamina";
import { held, type Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";

/** An hour and its minutes by Bangkok's clock, as the town's own clock writes them. */
export const clockOf = (ms: number) => {
  const d = new Date(ms + 7 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

/**
 * The feast table (lib/town/cooking; the owner, 2026-10-07, of a member's "ต้องมี
 * โต๊ะวางอาหารเป็นหลักแหล่งแล้ว ตอนนี้เกลื่อนเมือง"): the cooking yard's two dining
 * tables are the village's table, and this is what is on it, for whoever
 * stands on the yard's floor.
 *
 * Each pot is a line: its dish, how many helpings are left, who cooked it and
 * until when it stands there. From a line a helping is eaten at the table out
 * of one of the table's own bowls (sitting down: the map finds a place, and
 * nothing is carried off), or ladled into a bowl of one's own, as from any
 * pot; whoever cooked a pot takes it back. Over the lines, the pots of food in
 * my own bag are set on the table with a tap each (never the odd dish, which
 * the table does not take).
 *
 * What is kept is the keeper's (lib/town/keeper); TownCook asks it. A keeper
 * that knows of no feast table (the database before v159) is offered none.
 */
export default function TownFeast({ th, phone, tabbar, me, pots, purse, now, most, feast, said, busy, onEat, onLadle, onTake, onSet, onClose }: {
  th: boolean;
  phone: boolean;
  tabbar: boolean;
  me: string;
  /** The pots on the table, as they stand now. */
  pots: Pot[];
  purse: Purse;
  now: number;
  /** How many helpings a meal's hours take, as whoever keeps the game counts them. */
  most: number;
  feast: FeastTold;
  /** What was last done or refused here, in a few words. */
  said: string | null;
  busy: boolean;
  onEat: (pot: Pot) => void;
  onLadle: (pot: Pot) => void;
  onTake: (pot: Pot) => void;
  /** Set the pot of food in a slot of my bag on the table. */
  onSet: (slot: number) => void;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { close.current?.focus(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onClose]);
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  // what goes soonest is read first; of two that go together, the one that came first
  const lines = pots.map((pot) => ({ pot, until: potNow(pot, now, feast.ground)?.until ?? Infinity })).sort((a, b) => a.until - b.until || Number(a.pot.id) - Number(b.pot.id));
  const eaten = bowlsToday(purse, now)[mealOf(now)], bowls = held(purse.bag, BOWL);
  const mayEat = !purse.eating && eaten < most;
  const mine = purse.bag.map((s, slot) => ({ s, slot })).filter(({ s }) => s?.item === "potFull" && !!s.of);
  const onTable = pots.filter((o) => o.by === me).length, room = onTable < feast.pots;
  const helpings = pots.reduce((n, o) => n + o.left, 0);
  const title = th ? "โต๊ะเลี้ยง" : "The feast table";
  const chip = "pressable flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-ui font-semibold disabled:opacity-45";
  return (
    <div className={`pop-in pointer-events-auto absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
           ? "inset-x-0 h-[min(84%,42rem)] rounded-t-2xl" : "right-3 top-16 w-[25rem] rounded-2xl"}`}
         style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
         data-state="open" data-feast-panel>
      <section aria-labelledby="town-feast-h" className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <TownIcon name="potFull" size={28} />
          <div className="min-w-0">
            <h2 id="town-feast-h" className="truncate font-display text-title font-semibold leading-tight text-ink">{title}</h2>
            <p className="truncate font-data text-meta tabular-nums text-muted" data-feast-count={pots.length}>
              {pots.length ? (th ? `${pots.length} หม้อ · ${helpings} ที่` : `${pots.length} pot${pots.length === 1 ? "" : "s"} · ${helpings} helping${helpings === 1 ? "" : "s"}`) : (th ? "ยังไม่มีอาหาร" : "Nothing on it yet")}
            </p>
          </div>
          <button ref={close} type="button" onClick={onClose} data-feast-close className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
            {th ? "ปิด" : "Close"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          {/* how I stand with this meal's helpings and with bowls of my own */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
            <span className="flex items-center gap-1" data-feast-meal={eaten}><TownIcon name="meal" size={16} />{th ? `มื้อนี้กินแล้ว ${Math.min(eaten, most)}/${most}` : `This meal: ${Math.min(eaten, most)} of ${most}`}</span>
            <span className="flex items-center gap-1" data-feast-bowls={bowls}><TownIcon name={BOWL as IconName} size={16} />{th ? `ถ้วยของฉัน ${bowls}` : `My bowls: ${bowls}`}</span>
          </p>

          {/* the pots of food in my bag, each set on the table with a tap */}
          {mine.length > 0 && (
            <div className="mt-3 rounded-xl border border-line bg-bg/40 p-2.5" data-feast-mine>
              <p className="text-meta font-semibold text-ink">{th ? "หม้อในกระเป๋าของฉัน" : "The pots in my bag"}</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {mine.map(({ s, slot }) => {
                  const dish = s!.of!.dish, odd = dish === ODD;
                  return (
                    <li key={slot} className="flex items-center gap-2">
                      <TownIcon name={potIconOf(dish) as IconName} size={26} />
                      <span className="min-w-0 flex-1 truncate text-ui text-ink">{name(dish)} <span className="font-data tabular-nums text-muted">×{s!.of!.left}</span></span>
                      {odd ? <span className="shrink-0 text-meta text-muted" data-feast-odd>{th ? "โต๊ะไม่รับอาหารแปลกๆ" : "The table takes no odd dish"}</span> : (
                        <button type="button" disabled={busy || !room} onClick={() => onSet(slot)} data-feast-set={slot} className={`${chip} shrink-0 border border-line-lit bg-surface text-ink`}>
                          {th ? "วางบนโต๊ะ" : "Set on the table"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!room && <p className="mt-1 text-meta text-gold" data-feast-full>{th ? `วางได้คนละ ${feast.pots} หม้อ เก็บหม้อเก่าก่อน` : `${feast.pots} pots each: take one of yours back first`}</p>}
            </div>
          )}

          {/* what is on the table */}
          {lines.length === 0 ? (
            <p className="mt-6 text-center text-ui text-muted" data-feast-empty>{th ? "ใครทำอาหารเสร็จ วางไว้บนโต๊ะนี้ได้เลย" : "Whoever has cooked may set a pot here."}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2" data-feast-list>
              {lines.map(({ pot, until }) => {
                const own = pot.by === me, fits = ladle(purse, pot).ok;
                return (
                  <li key={pot.id} className="rounded-xl border border-line bg-bg/40 p-2.5" data-feast-pot={pot.id} data-dish={pot.dish} data-left={pot.left}>
                    <div className="flex items-center gap-2.5">
                      <TownIcon name={potIconOf(pot.dish) as IconName} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ui font-semibold text-ink">{name(pot.dish)} <span className="font-data font-normal tabular-nums text-muted">×{pot.left}</span></p>
                        {/* ── forging: old tools ── what this pot has from the cookware it was cooked in, for whoever eats out of it here: a state of the pot */}
                        {(!!pot.scent || !!pot.warm) && (
                          <p className="mt-0.5 flex flex-wrap gap-1 text-label text-gold" data-feast-marks>
                            {!!pot.scent && <span className="rounded-full border border-line px-1.5 py-px font-data tabular-nums" data-feast-scent={pot.scent}>{th ? `หอมทั้งลาน · stamina +${pot.scent}` : `Fragrant · +${pot.scent} stamina`}</span>}
                            {!!pot.warm && <span className="rounded-full border border-line px-1.5 py-px font-data tabular-nums" data-feast-warm={pot.warm}>{th ? `อุ่นนาน · บัฟ +${pot.warm} ชม.` : `Warm · buff +${pot.warm} h`}</span>}
                          </p>
                        )}
                        <p className="truncate text-meta text-muted">
                          {own ? (th ? "ของฉัน" : "Mine") : pot.name ? (th ? `โดย ${pot.name}` : `By ${pot.name}`) : ""}
                          {Number.isFinite(until) && <span className="font-data tabular-nums">{own || pot.name ? " · " : ""}{th ? `ถึง ${clockOf(until)} น.` : `until ${clockOf(until)}`}</span>}
                        </p>
                      </div>
                      {own && (
                        <button type="button" disabled={busy} onClick={() => onTake(pot)} data-feast-take className="pressable shrink-0 rounded-full border border-line px-3 py-1.5 text-meta font-semibold text-muted disabled:opacity-45">
                          {th ? "เก็บคืน" : "Take back"}
                        </button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button type="button" disabled={busy || !mayEat} onClick={() => onEat(pot)} data-feast-eat className={`${chip} bg-accent text-bg`}>
                        <TownIcon name="meal" size={18} />{th ? "นั่งกินที่โต๊ะ" : "Eat at the table"}
                      </button>
                      <button type="button" disabled={busy || !fits} onClick={() => onLadle(pot)} data-feast-ladle className={`${chip} border border-line-lit bg-surface text-ink`}>
                        <TownIcon name={BOWL as IconName} size={18} />{th ? "ตักใส่ถ้วยฉัน" : "Into my bowl"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {lines.length > 0 && !mayEat && <p className="mt-2 text-meta text-gold" data-feast-nomeal>{purse.eating ? (th ? "กำลังกินอยู่" : "You are at a meal") : (th ? "มื้อนี้กินครบแล้ว รอมื้อถัดไป" : "This meal's helpings are eaten. Wait for the next.")}</p>}
          <p className="mt-2 min-h-5 text-ui text-ink" role="status" aria-live="polite" data-feast-said>{said ?? ""}</p>
        </div>
      </section>
    </div>
  );
}
