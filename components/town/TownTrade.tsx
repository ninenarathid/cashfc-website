"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sorted, whatOf } from "@/lib/town/bag";
import { WATER } from "@/lib/town/farm";
import { seedTime } from "@/lib/town/clues";
import { CARRIES } from "@/lib/town/gear";
import { hintOf } from "@/lib/town/hints";
import { WISH, type WishId } from "@/lib/town/fountain";
import { BUG_IDS } from "@/lib/town/insects";
import { BUFFS, ITEMS, SCROLLS, iconOf, isDish, potIconOf, type DishId, type ItemId, type ItemKind } from "@/lib/town/items";
import { GEMS, OPTIONS, gemsShown, makersOf, modsOf, readToolWord, toolWord, type Element } from "@/lib/town/tools";
import { keptMotion } from "@/lib/town/motion";
import { levelHue } from "./held";
import type { Order } from "@/lib/town/orders";
import { opens } from "@/lib/town/scrolls";
import { carried } from "@/lib/town/line";
import type { PricesTold } from "@/lib/town/market";
import { MEALS, STAMINA, bowlsToday, buffsOf, levelOf, mayEat as mayEatNow, mealBuffs, mealOf, mealProgress, nextMealAt, staminaOf } from "@/lib/town/stamina";
import {
  GOODS, RULES, SHELF, forged, handOf, leftOf, lotWorth, mayBuy, mayChange, nextRoundAt, onShelf, waiting,
  type Purse, type Refusal, type Stack, type Stall,
} from "@/lib/town/trade";
import type { Did, Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import TownPouches from "./TownPouches";   // ── mining ──
import TownIcon, { type IconName } from "./TownIcon";
import TownNotices from "./TownNotices";
// ── gifts: kitchen ──
import TownBasket, { takesSpice } from "./TownBasket";
import { hasThing, usesLeft } from "@/lib/town/gifts";
import { Delta, PriceGraph, PriceNow } from "./TownPrice";

/** What of the trade is open on the screen: the uncle's stall (buying, leaving things to be sold, or the notice board beside it, where members sell to one another), the bank, or my own bag. */
export type TradeView = "buy" | "sell" | "board" | "bank" | "bag";
/** What the map needs to know of me without opening anything: my coins, the money waiting with the uncle, my stamina, the buff a meal left, the meal I am at, and what I hold in my hand (and whether it is a bucket with water in it). */
export interface TradeSummary {
  hand: ItemId | null;
  wet: boolean;
  coins: number;
  waiting: number;
  stamina: number;
  buff: WishId | null;
  /** (`from`: the moment this helping began, which tells one helping from the next of the same dish) */
  eating: { dish: DishId; progress: number; from: number } | null;
  /** (forging) What the tool in my hand carries, as the room is told it (lib/town/tools' toolWord): "" for a plain one or an empty hand. */
  tool?: string;
}

type Kind = keyof Purse["popoto"];
/** Whether the bank offers to change popoto from pictures: not yet (see the bank's panel). */
const PICTURES = false;

/** Why something was not done, in a few words. */
export const WHY: Record<Refusal, [th: string, en: string]> = {
  coins: ["Popoto coin ไม่พอ", "Not enough Popoto coins"],
  sold: ["หมดแล้ว รอรอบหน้านะ", "Sold out until the next round"],
  each: ["รอบนี้ซื้อครบจำนวนที่ซื้อได้แล้ว", "You have bought all you may this round"],
  full: ["กระเป๋าเต็ม", "Your bag is full"],
  none: ["ไม่มีของชิ้นนั้นแล้ว", "That is not there any more"],
  unwanted: ["ของชิ้นนี้ญาติลุงไม่รับ", "The relatives do not take that"],
  gone: ["ญาติลุงมารับไปแล้ว", "The relatives have fetched it already"],
  nothing: ["ยังไม่มีเงินรอรับ", "No money is waiting yet"],
  cap: ["สัปดาห์นี้แลกครบแล้ว รอวันจันทร์", "This week's popoto are changed. Monday brings more."],
  popoto: ["popoto ไม่พอ", "Not that many popoto"],
  amount: ["จำนวนไม่ถูกต้อง", "Not a number that can be"],
  tool: ["ต้องมีคันเบ็ดในกระเป๋า", "You need a rod in your bag"],
  meal: ["มื้อนี้กินครบแล้ว รอมื้อถัดไป", "This meal's helpings are eaten. Wait for the next."],
  stand: ["นั่งก่อนถึงจะกินได้", "Sit down first"],
  known: ["สูตรนี้รู้อยู่แล้ว", "You know this recipe already"],
  dry: ["ไม่มีน้ำ", "There is no water"],
  worn: ["สะพายแบบนี้อยู่แล้ว", "You are wearing one already"],
  crew: ["คนยังไม่ครบ", "Not everybody is here"],
  taken: ["ตรงนี้มีของวางอยู่แล้ว", "Something stands here already"],
  many: ["วางหม้อไว้หลายใบแล้ว เก็บใบเก่าก่อน", "Too many pots set down: take one up first"],
  note: ["คำอธิษฐานยาวเกินไป", "Those words are too long for a wish"],
  busy: ["กำลังแลกของกับคนอื่นอยู่", "In a deal with somebody else"],
  away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town cannot be reached. Try again."],
};
/** Why a thing on the ground was not picked up (lib/town/ground), beyond what a bag refuses for. */
export const WHY_GROUND: Record<string, [th: string, en: string]> = {
  lost: ["ไม่อยู่แล้ว", "It is gone"],
  far: ["ต้องยืนใกล้กว่านี้", "Stand nearer"],
};

/**
 * When the relatives come next, at the uncle's stall, for everybody to see (the owner, 2026-10-04: "ในลุงขายของ ช่วยทำ
 * ให้ขึ้นเวลาด้วยว่า รอบต่อไปที่เงินจะเข้าเหลือเวลาอีกเท่าไหร่ เห็นทุกคนได้เลย"): the hour by Bangkok's clock, and how long until
 * it, counted down by the keeper's clock (the database's, for a member) second by second. That is when what was left
 * with him is paid for, and when his shelf is full again; where something is left with him, what it will fetch.
 */
function NextRound({ keeper, th, sell, coming }: { keeper: Keeper; th: boolean; sell: boolean; coming: number }) {
  const [now, setNow] = useState(() => keeper.now());
  useEffect(() => {
    const t = setInterval(() => setNow(keeper.now()), 1000);
    return () => clearInterval(t);
  }, [keeper]);
  const at = nextRoundAt(now), { h, m, s } = leftOf(at - now);
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at));
  const left = [h ? (th ? `${h} ชม.` : `${h} h`) : "", h || m ? (th ? `${m} นาที` : `${m} min`) : "", s !== null ? (th ? `${s} วิ` : `${s} s`) : ""].filter(Boolean).join(" ");
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-line px-4 py-2 text-meta text-muted" data-next-round={at}>
      <span>{th ? (sell ? "ญาติลุงมารับของ เงินเข้ารอบถัดไป" : "ของขึ้นแผงใหม่รอบถัดไป") : sell ? "The relatives come, and pay, at" : "The shelf is full again at"}</span>
      <span className="font-data tabular-nums text-ink">{hour}{th ? " น." : ""}</span>
      <span className="font-data tabular-nums text-accent" aria-live="off">{th ? `อีก ${left}` : `in ${left}`}</span>
      {sell && coming > 0 && <span className="ml-auto flex items-center gap-1">{th ? "จะได้" : "to come"} <Coins n={coming} th={th} small /></span>}
    </p>
  );
}
const MEAL_NAME: Array<[th: string, en: string]> = [["มื้อเช้า", "Breakfast"], ["มื้อเที่ยง", "Lunch"], ["มื้อเย็น", "Dinner"]];

/**
 * (forging) A gem's pip on a tool's slot, by its element: the element's colour in two tones, so that the eight are
 * told apart at a pip's size (water from ice, earth from lightning, light from everything) by a lighter core or a
 * darker rim, never by their size.
 */
const PIP: Record<Element, { core: string; rim: string }> = {
  fire: { core: "#ffb547", rim: "#e2351f" }, water: { core: "#5c9bff", rim: "#1f47b8" }, ice: { core: "#c6f3ff", rim: "#2fb2e6" }, earth: { core: "#c98b3b", rim: "#6e4416" },
  lightning: { core: "#fff570", rim: "#e0a400" }, wind: { core: "#a5f5ba", rim: "#22a258" }, light: { core: "#ffffff", rim: "#ecc552" }, dark: { core: "#2a184f", rim: "#a47bff" },
};
/**
 * (forging) The gems a tool carries, in words: each element once, in the order they were set, with a count for one
 * set more than once ("ไฟ ×3", "ไฟ + น้ำ + น้ำแข็ง"). Nothing, of a tool with no gem.
 */
export function gemWords(stack: Stack | null | undefined, th: boolean): string {
  const gems = gemsShown(stack);
  return [...new Set(gems)].map((e) => { const n = gems.filter((g) => g === e).length; return `${th ? GEMS[e].name.th : GEMS[e].name.en}${n > 1 ? ` ×${n}` : ""}`; }).join(" + ");
}
/** (forging) What a forged tool carries, said shortly for a slot's label: its plus, and its gems in words. Nothing, of a plain thing. */
export function forgeWords(stack: Stack | null | undefined, th: boolean): string {
  if (!stack || !forged(stack)) return "";
  const level = modsOf(stack).level, gems = gemWords(stack, th);
  return [level > 0 ? `+${level}` : null, gems ? `${th ? "พลอย" : "gems:"} ${gems}` : null].filter(Boolean).join(" · ");
}
/**
 * (forging) What a forged tool's slot says of it, wherever a slot is drawn (the hand bar, the bag, the storage box,
 * the ground, the smith's screen): its plus small at the upper right corner, and **a pip for each gem set in it**
 * in a row at the lower left, in the order set (the owner, 2026-10-09: three elements are three colours, one
 * element three times three pips of one colour). Both stand out over the picture's corners, so that the tool's own
 * picture is seen whole. Laid over the slot's picture: its parent is the picture's own box.
 */
export function ForgeMarks({ stack, size }: { stack: Stack; size: number }) {
  const level = modsOf(stack).level, gems = gemsShown(stack);
  const big = size >= 34, pip = big ? 10 : size >= 26 ? 8 : 7, out = big ? 6 : 5;
  return (
    <>
      {level > 0 && (
        <span data-forge-plus={level} className="pointer-events-none absolute z-[1] whitespace-nowrap rounded-[5px] border border-[#2a190d] bg-[#f0c46a] font-data font-bold tabular-nums text-[#2a190d]"
              style={{ right: -out - 5, top: -out - 3, fontSize: big ? 9 : 8, lineHeight: big ? "11px" : "10px", padding: "0 2px" }}>+{level}</span>
      )}
      {gems.length > 0 && (
        <span aria-hidden data-forge-gems={gems.join(" ")} className="pointer-events-none absolute z-[1] flex" style={{ left: -out, bottom: -out, gap: 1 }}>
          {gems.map((e, i) => <span key={i} className="block rounded-full border border-[#2a190d]" style={{ width: pip, height: pip, background: PIP[e].core, boxShadow: `inset 0 0 0 ${big ? 2 : 1.5}px ${PIP[e].rim}` }} />)}
        </span>
      )}
    </>
  );
}

/** The picture of what is in a slot: the thing's own, but a pot of food is its dish's pot, and a bucket with water in it is full. */
export function StackIcon({ stack, size, className }: { stack: Stack; size: number; className?: string }) {
  const name = stack.of ? potIconOf(stack.of.dish) : stack.water && stack.item in WATER.buckets ? `${stack.item}Full` : iconOf(stack.item);
  const icon = <TownIcon name={name as IconName} size={size} className={className} />;
  // ── forging ── (a tool that carries something says so wherever it is drawn: its plus at a corner, a pip a gem at another)
  if (!forged(stack)) return icon;
  const gems = gemsShown(stack);
  // (and one forged far shimmers in its slot as it does in the hand: a light behind its picture in the colour of its
  // light on the map, its outline lit, breathing at the top; still, with the town's motion switched off)
  const look = readToolWord(toolWord(stack)), far = look?.glow ? look : null, hue = far ? levelHue(far) : null;
  return (
    <span className={`relative inline-block align-middle ${far ? "isolate" : ""}`} data-plus={modsOf(stack).level} data-gem={gems[0] ?? ""} data-gems={gems.join(" ")}
          style={hue ? ({ "--forge": hue } as React.CSSProperties) : undefined}>
      {far && hue && (
        <span aria-hidden data-forge-light={far.glow} className="pointer-events-none absolute -inset-[24%] -z-10 rounded-full"
              style={{ background: `radial-gradient(circle, ${hue} 0%, ${hue}77 36%, transparent 68%)`, opacity: far.glow === 2 ? 0.85 : 0.5, animation: far.glow === 2 && keptMotion() ? "forge-breathe 2.6s ease-in-out infinite" : undefined }} />
      )}
      {far ? <TownIcon name={name as IconName} size={size} className={`${className ?? ""} ${far.glow === 2 ? "[filter:drop-shadow(0_0_1px_var(--forge))_drop-shadow(0_0_3px_var(--forge))]" : "[filter:drop-shadow(0_0_1px_var(--forge))_drop-shadow(0_0_2px_var(--forge))]"}`} /> : icon}
      <ForgeMarks stack={stack} size={size} />
    </span>
  );
}

/** A thing's picture, by its name in lib/town/items. */
export function ItemIcon({ id, size, className }: { id: ItemId; size: number; className?: string }) {
  return <TownIcon name={iconOf(id) as IconName} size={size} className={className} />;
}
/**
 * What a seed's card says of its plant: how long it takes to ripen, in round words (lib/town/clues; the owner,
 * 2026-10-06: "ควรต้องเปิดเผยเวลาในการปลูกพืชแต่ละต้นในถุงเมล็ด", "บอกไปเลย"). The same words a recipe's clue uses of a
 * vegetable, so that one can be matched to the other. Nothing, for what is no seed.
 */
export function SeedTime({ id, th, className = "" }: { id: ItemId; th: boolean; className?: string }) {
  const t = seedTime(id);
  if (!t) return null;
  return (
    <span className={`flex items-center gap-1 ${className}`} data-seed-time>
      <TownIcon name="plotSprout" size={14} className="shrink-0" />{th ? t.th : t.en[0].toUpperCase() + t.en.slice(1)}
    </span>
  );
}

/**
 * The uncle's stall, the banker's counter and my bag, as panels (the owner,
 * 2026-10-03: "NPC สองตัวเปิดใช้งานจริงเลย ในdev"). The rules are lib/town/trade's
 * and lib/town/stamina's; what is kept is the keeper's (lib/town/keeper): the
 * database's for a member, and in `next dev`'s test room the browser's own
 * trial, where nobody's real popoto are touched, and a line at the foot of
 * every panel says so, with a way to bring the next round on and a way to
 * begin again.
 *
 * The panels show what is (a number, a bar, what is left) and why a thing was
 * refused, and do not explain how anything works (the owner, 2026-10-03:
 * "คำอธิบายค่าต่างๆ … เอาออกได้เลย ส่วนใหญ่ผมอยากให้ ผู้เล่น หาข้อมูลกันเอาเอง"): that is for
 * the players to find out, and for the shopkeepers to let slip. The bank is
 * the exception: what changing popoto costs is said plainly, because those
 * are real.
 *
 * It is always there while I am in town: it counts a meal on while I sit at
 * it, and tells the map my coins, my stamina and what I am eating. It draws a
 * panel only when one is open.
 */
export default function TownTrade({ keeper, view, th, art, seated, company, where, onView, onSummary, onScroll }: {
  /** Who keeps my purse. */
  keeper: Keeper;
  view: TradeView | null;
  th: boolean;
  /** The town's own pixel art for a picture's name, once the scenery has come. */
  art: (name: string) => Sprite | null;
  /** Whether I am sitting down (a meal is eaten sitting), and how many are eating beside me. */
  seated: boolean;
  company: number;
  /** The tile I am on, asked when a thing is dropped on the ground or picked back up from it. */
  where: () => [number, number] | null;
  onView: (view: TradeView | null) => void;
  onSummary: (s: TradeSummary) => void;
  /** Unroll a recipe to read: a dish's, or that of something else that is made. */
  onScroll: (dish: ItemId) => void;
}) {
  // (the trial's own buttons, in a branch a production build drops)
  const trial = process.env.NODE_ENV !== "production" ? keeper.trial : null;
  const [, setTick] = useState(0);
  // Whatever changes (here, in another tab, or the minute), look again.
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again);
    const t = setInterval(again, 20_000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  // What the stall has left is the whole village's: kept in sight while its panel is open.
  const atStall = view === "buy" || view === "sell" || view === "board";
  useEffect(() => (atStall ? keeper.look("stall") : undefined), [atStall, keeper]);
  // …and so is the notice board beside it (lib/town/notices): there is a tab for it once the keeper has been told of one
  useEffect(() => (atStall ? keeper.look("notices") : undefined), [atStall, keeper]);
  // (handed to scripts in `next dev`, like the town's own handle: the trial itself where there is one)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townTrade?: unknown; __townKeeper?: Keeper };
    w.__townTrade = keeper.trial ?? keeper;
    w.__townKeeper = keeper;
    return () => { delete w.__townTrade; delete w.__townKeeper; };
  }, [keeper]);

  const now = keeper.now(), purse = keeper.purse(), stall = keeper.stall();
  const due = waiting(purse, now), stamina = staminaOf(purse, now), buff = buffsOf(purse, now)[0] ?? null;
  const eating = purse.eating ? { dish: purse.eating.dish, progress: mealProgress(purse, now), from: purse.eating.from } : null, hand = handOf(purse), wet = !!carried(purse);
  // (forging: what the tool in my hand carries, for the room)
  const heldAt = keeper.handSlot(), tool = toolWord(heldAt >= 0 ? purse.bag[heldAt] : null);
  useEffect(() => {
    onSummary({ hand, wet, coins: purse.coins, waiting: due.coins, stamina: Math.round(stamina), buff, eating, tool });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the meal is told by its dish and how far through it is
  }, [onSummary, hand, wet, purse.coins, due.coins, Math.round(stamina), buff, eating?.dish, eating?.from, eating && Math.round(eating.progress * 100), tool]);

  // A meal is counted on every second while I sit at it; getting up leaves it.
  const sitting = useRef(seated), beside = useRef(company);
  useEffect(() => { sitting.current = seated; beside.current = company; }, [seated, company]);
  const atMeal = !!purse.eating;
  useEffect(() => {
    if (!atMeal) return;
    const t = setInterval(() => { if (sitting.current) keeper.chew(beside.current); else void keeper.getUp(beside.current); }, 1000);
    return () => clearInterval(t);
  }, [atMeal, keeper]);

  /** What the keeper says to the last thing done: thanks, or why not. */
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => { setSaid(null); }, [view]);
  const say = useCallback((th0: string, en: string) => setSaid(th ? th0 : en), [th]);
  const why = (w: string): [string, string] => WHY[w as Refusal] ?? WHY.none;
  /** Say what came of a deed, when its answer is in. */
  const tried = (doing: Promise<Did>, thanks: [string, string]) => {
    void doing.then((done) => { if (done.ok) say(...thanks); else say(...why(done.why)); });
  };

  // ── gifts: kitchen ── (the stardust spice held over the next bowl, by the bag's own "eat" and the basket's: lib/town/cooking's spiceEat)
  const [spiceOn, setSpiceOn] = useState(false);
  const sprinkles = (item: ItemId) => spiceOn && !purse.eating && takesSpice(item) && hasThing(purse, "thingSpice") && usesLeft(purse, "thingSpice", now) > 0;
  const eatFrom = async (slot: number): Promise<Did> => {
    const item = purse.bag[slot]?.item;
    if (!item || !sprinkles(item)) return keeper.sitDown(slot, seated);
    const did = await keeper.spiceEat({ slot }, seated);
    if (did.ok) setSpiceOn(false);
    return did as Did;
  };

  if (!view) return null;
  const uncle = atStall, order = keeper.order(), board = keeper.notices();
  const title = uncle ? (th ? "แผงของลุง" : "The uncle's stall") : view === "bank" ? (th ? "ธนาคาร Popoto" : "The Popoto Bank") : (th ? "กระเป๋าของฉัน" : "My bag");
  return (
    <section aria-labelledby="town-trade-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {view === "bag" ? <TownIcon name="bag" size={26} /> : <Pic sprite={art(uncle ? "un_stand" : "bk_stand")} box={30} />}
        <h2 id="town-trade-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{title}</h2>
        <Coins n={purse.coins} th={th} className="ml-auto" />
        <button type="button" onClick={() => onView(null)}
                className="pressable rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "ปิด" : "Close"}
        </button>
      </div>

      {uncle && (
        <div role="tablist" aria-label={title} className="flex gap-1 border-b border-line px-3 pt-2">
          {([["buy", th ? "ซื้อของ" : "Buy"], ["sell", th ? "ฝากขาย" : "Sell"], ...(board ? [["board", th ? "กระดาน" : "Board"] as const] : [])] as const).map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)}
                    className={`pressable -mb-px rounded-t-lg border-b-2 px-3 py-2 text-ui font-semibold ${view === v ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
              {label}
              {v === "sell" && due.coins > 0 && <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 font-data text-meta text-gold">{due.coins}</span>}
              {v === "board" && !!board?.due && <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 font-data text-meta text-gold">{board.due}</span>}
            </button>
          ))}
        </div>
      )}

      {uncle && (view === "buy" || view === "sell") && (
        <NextRound keeper={keeper} th={th} sell={view === "sell"} coming={Math.floor(due.held.reduce((t, l) => t + lotWorth(l), 0))} />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3">
        <p className="mb-2 min-h-[1.5em] text-meta text-accent" aria-live="polite">{said ?? ""}</p>
        {view === "buy" && <Buy purse={purse} stall={stall} now={now} th={th} hintCoins={keeper.hintPrice()} shelf={keeper.shelf()}
                                onBuy={(id, n) => tried(keeper.buy(id, n), ["ขอบใจนะหลาน", "Much obliged, kiddo."])}
                                onHint={() => tried(keeper.hint(), ["ลุงจดให้แล้วนะ ส่วนอย่างสุดท้าย ไปเดาเอาเอง", "There, I've jotted it down. The last thing is yours to guess."])} />}
        {view === "sell" && order && <Wanted order={order} purse={purse} th={th}
                                    onGive={async (slot, n) => {
                                      const did = await keeper.orderGive(slot, n);
                                      if (!did.ok) { say(...why(did.why)); return; }
                                      if (did.opened) say(`ครบแล้ว! ขอบใจทุกคนนะ ลุงมีของใหม่มาขาย: ${ITEMS[did.opened].name.th}`, `That's the lot! Thank you all. Something new on my shelf: ${ITEMS[did.opened].name.en.toLowerCase()}`);
                                      else say(`ขอบใจนะหลาน นี่ ${did.coins} coin`, `Much obliged, kiddo. Here's ${did.coins} coins.`);
                                    }} />}
        {view === "sell" && <Sell purse={purse} now={now} th={th} prices={keeper.prices()}
                                  onLeave={(slot, n) => tried(keeper.leave(slot, n), ["ลุงรับฝากไว้ให้นะ ญาติลุงมารับรอบหน้า", "I'll keep it for my relatives. They fetch it next round."])}
                                  onBack={(at) => tried(keeper.takeBack(at), ["เอาคืนไปได้เลย", "Here, have it back."])}
                                  onCollect={() => tried(keeper.collect(), ["นี่เงินของหลาน นับดูได้เลย", "Here's your money. Count it if you like."])} />}
        {view === "board" && board && <TownNotices keeper={keeper} board={board} purse={purse} prices={keeper.prices()} now={now} th={th} say={say} />}
        {view === "bank" && <Bank purse={purse} now={now} th={th}
                                  onChange={(kind, n) => tried(keeper.change(kind, n), ["เรียบร้อยครับ ผมจดลงสมุดแล้ว", "All done. It is written in my ledger."])} />}
        {view === "bag" && <Bag pouches={<TownPouches keeper={keeper} th={th} />} purse={purse} held={keeper.handSlot()} now={now} th={th} seated={seated} company={company} helpings={keeper.helpings()} recipes={[...keeper.known(), ...keeper.knownMakes()]} book={keeper.bugBook()}
                                // ── gifts: kitchen ── (the kitchen's gifts that are used from the bag: components/town/TownBasket)
                                kitchen={<TownBasket keeper={keeper} purse={purse} now={now} th={th} seated={seated} helpings={keeper.helpings()} say={say} spice={spiceOn} onSpice={setSpiceOn}
                                                     onStove={() => { onView(null); window.dispatchEvent(new CustomEvent("cashtown:stove")); }} />}
                                sprinkles={sprinkles}
                                onWear={(slot) => tried(keeper.wear(slot), ["สะพายแล้ว", "On your back."])}
                                onTakeOff={(item) => tried(keeper.takeOff(item), ["ถอดเก็บแล้ว", "Taken off."])}
                                onServe={async (slot) => { const did = await keeper.serve(slot); if (did.ok) say("ตักใส่ถ้วยแล้ว", "A helping, in your bowl."); else say(...(did.why === "tool" ? (["ไม่มีถ้วย", "No bowl"] as [string, string]) : why(did.why))); }}
                                onEat={(slot) => tried(eatFrom(slot), ["เริ่มกินแล้ว", "Tucking in."])}
                                onGetUp={() => { void keeper.getUp(company).then(() => say("ลุกจากมื้ออาหารแล้ว", "You left the meal.")); }}
                                onRead={async (slot) => {
                                  const item = purse.bag[slot]?.item, dish = item ? SCROLLS[item] : undefined;
                                  if (!dish) return;
                                  const read = await keeper.readScroll(slot);
                                  if (read.ok) say("จดสูตรลงสมุดแล้ว", "Copied into your recipe book.");
                                  onScroll(dish);
                                }}
                                onRecipe={onScroll}
                                onHold={(slot) => tried(keeper.hold(slot), slot === null ? ["เก็บใส่กระเป๋าแล้ว", "Put away."] : ["ถือไว้ในมือแล้ว", "In your hand."])}
                                onOpen={async (slot) => {
                                  const did = await keeper.openThing(slot);
                                  if (!did.ok) { say(...why(did.why)); return; }
                                  if (did.found) say(`ข้างในมี ${ITEMS[did.found].name.th}`, `Inside: ${ITEMS[did.found].name.en.toLowerCase()}`);
                                  else say("ข้างในไม่มีอะไร", "There is nothing in it.");
                                }}
                                // (the bag put in order, where whoever keeps the game lets it be: lib/town/bag. A move that comes off says nothing: the thing is where it was put)
                                tidy={keeper.bagTidy()}
                                onMove={(from, to) => { void keeper.bagMove(from, to).then((did) => { if (!did.ok) say(...why(did.why)); }); }}
                                onSort={() => tried(keeper.bagSort(), ["จัดเรียงกระเป๋าแล้ว", "Your bag is in order."])}
                                dropsAll={keeper.ground() !== null}
                                lying={<Lying keeper={keeper} th={th} where={where} say={say} />}
                                onDrop={(slot) => {
                                  // onto the ground where I stand, for anybody to pick up while it lies there (lib/town/ground);
                                  // where whoever keeps the game knows of no ground, junk is thrown away, as it always was
                                  const at = keeper.ground() ? where() : null;
                                  if (at) tried(keeper.groundDrop(slot, at), ["วางลงพื้นแล้ว", "On the ground."]);
                                  else tried(keeper.drop(slot), ["ทิ้งไปแล้ว", "Thrown away."]);
                                }} />}
      </div>

      {/* what I carry, at the stall's foot: buying fills it, leaving things empties it; it folds away */}
      {uncle && <StallBag bag={purse.bag} th={th} />}

      {/* this is a trial: say so, and let a round be brought on */}
      {process.env.NODE_ENV !== "production" && trial && <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1.5 border-t border-line bg-bg/40 px-4 py-2 text-meta text-muted">
        <p className="flex basis-full items-center gap-2">
          <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 font-data text-label uppercase tracking-wider text-gold">{th ? "โหมดลอง" : "Trial"}</span>
          <span className="min-w-0">{th ? "ข้อมูลอยู่ในเบราว์เซอร์นี้ ไม่แตะ popoto จริง" : "Kept in this browser. No real popoto are touched."}</span>
        </p>
        {view === "bag" ? (
          <button type="button" onClick={() => { trial.skipHours((nextMealAt(now) - now) / 3_600_000 + 0.02); say("ข้ามไปมื้อถัดไปแล้ว", "On to the next meal's hours."); }}
                  className="pressable rounded-full border border-line-strong px-3 py-1.5 text-meta text-ink hover:border-accent">
            {th ? "ข้ามไปมื้อถัดไป" : "Skip to the next meal"}
          </button>
        ) : (
          <button type="button" onClick={() => { trial.skipRound(); say("ข้ามไปรอบถัดไปแล้ว ญาติลุงเพิ่งมา", "On to the next round: the relatives have just been."); }}
                  className="pressable rounded-full border border-line-strong px-3 py-1.5 text-meta text-ink hover:border-accent">
            {th ? "ข้ามไปรอบถัดไป" : "Skip to the next round"}
          </button>
        )}
        <button type="button" onClick={() => { trial.reset(); say("เริ่มใหม่แล้ว", "Begun again."); }}
                className="pressable rounded-full border border-line-strong px-3 py-1.5 text-meta text-ink hover:border-chili">
          {th ? "เริ่มใหม่" : "Begin again"}
        </button>
      </div>}
    </section>
  );
}

/** The stall's shelf: each thing, what it costs, how many are left for the village and for me, and a button to buy. */
function Buy({ purse, stall, now, th, hintCoins, shelf, onBuy, onHint }: {
  purse: Purse; stall: Stall; now: number; th: boolean;
  /** What his next hint costs me, if he has one for me: which one it will be is by chance, and not this page's to know. */
  hintCoins: number | null;
  /** What the stall has open: the basic things, and what the village's orders have opened since (lib/town/orders). */
  shelf: ItemId[];
  onBuy: (id: ItemId, n: number) => void; onHint: () => void;
}) {
  /** The shelf is long: one kind of thing at a time. */
  const [kind, setKind] = useState<ItemKind>("tool");
  const kinds = KINDS.filter(([k]) => shelf.some((id) => ITEMS[id].kind === k));
  const hints = purse.hints ?? [];
  return (
    <>
      <div role="tablist" aria-label={th ? "ชนิดของ" : "Kinds of thing"} className="mb-2 flex flex-wrap gap-1.5">
        {kinds.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
                  className={`pressable min-h-9 rounded-full border px-3 text-meta ${kind === k ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-muted hover:text-ink"}`}>
            {th ? label[0] : label[1]}
          </button>
        ))}
      </div>
      {/* a recipe is not told: the uncle sells a hint of one, by chance, which names all that goes in but the last thing */}
      {kind === "scroll" && (
        <div data-uncle-hint={hintCoins ?? "none"} className="mb-2 rounded-xl border border-line bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <TownIcon name="note" size={30} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-ui font-semibold text-ink">{th ? "คำใบ้ของลุง" : "The uncle's hint"}</span>
                {hintCoins !== null && <Coins n={hintCoins} th={th} small />}
              </div>
              <p className="font-data text-meta text-muted">{hints.length}</p>
            </div>
            <button type="button" disabled={hintCoins === null} onClick={onHint}
                    className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
              {th ? "ซื้อ" : "Buy"}
            </button>
          </div>
          {hints.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
              {[...hints].reverse().map((id) => (
                <li key={id} className="flex items-start gap-2 text-meta text-ink">
                  <ItemIcon id={id} size={18} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">{th ? hintOf(id).th : hintOf(id).en}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {SHELF.filter((id) => shelf.includes(id) && ITEMS[id].kind === kind).map((id) => {
          const it = ITEMS[id], may = mayBuy(purse, stall, id, now, shelf), left = onShelf(stall, id, now), many = Math.min(5, may.n);
          return (
            <li key={id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2">
              <ItemIcon id={id} size={30} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-ui font-semibold text-ink">{th ? it.name.th : it.name.en}</span>
                  <Coins n={GOODS[id]!.price} th={th} small />
                </div>
                <p className="truncate text-meta text-muted">{th ? it.about.th : it.about.en}</p>
                <SeedTime id={id} th={th} className="text-meta text-ink" />
                <p className={`font-data text-meta ${may.n ? "text-muted" : "text-chili"}`}>
                  {may.n
                    ? (th ? `เหลือ ${left} · ซื้อได้อีก ${may.n}` : `${left} left · you may buy ${may.n}`)
                    : (th ? WHY[may.stop][0] : WHY[may.stop][1])}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {many > 1 && (
                  <button type="button" onClick={() => onBuy(id, many)} aria-label={`${th ? "ซื้อ" : "Buy"} ${many} ${th ? it.name.th : it.name.en}`}
                          className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
                    ×{many}
                  </button>
                )}
                <button type="button" disabled={!may.n} onClick={() => onBuy(id, 1)} aria-label={`${th ? "ซื้อ" : "Buy"} ${th ? it.name.th : it.name.en}`}
                        className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                  {th ? "ซื้อ" : "Buy"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * What I can leave with the uncle to be sold, what he is holding for me, and the money that has come back. A thing
 * whose price moves (lib/town/market) says what one fetches this round, and opens its graph (./TownPrice); a lot is
 * worth what it was left at.
 */
function Sell({ purse, now, th, prices, onLeave, onBack, onCollect }: {
  purse: Purse; now: number; th: boolean; prices: PricesTold;
  onLeave: (slot: number, n: number) => void; onBack: (at: number) => void; onCollect: () => void;
}) {
  const due = waiting(purse, now), mine = purse.bag.map((s, slot) => ({ s, slot })).filter((x) => x.s);
  /** The slot whose graph is open: shut again when the slot is emptied. */
  const [graph, setGraph] = useState<number | null>(null);
  const gone = graph !== null && !purse.bag[graph];
  useEffect(() => { if (gone) setGraph(null); }, [gone]);
  return (
    <>
      <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${due.coins ? "border-gold/60 bg-gold/10" : "border-line bg-card/60"}`}>
        <div className="min-w-0 flex-1">
          <p className="text-ui font-semibold text-ink">{th ? "เงินรอรับ" : "Money waiting"}</p>
        </div>
        <Coins n={due.coins} th={th} />
        <button type="button" disabled={!due.coins} onClick={onCollect}
                className="pressable min-h-11 rounded-full bg-gold px-4 text-ui font-semibold text-bg disabled:opacity-40">
          {th ? "รับเงิน" : "Collect"}
        </button>
      </div>

      <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "ฝากขายจากกระเป๋า" : "Leave from your bag"}</h3>
      {mine.length ? (
        <ul className="flex flex-col gap-1.5">
          {mine.map(({ s, slot }) => {
            const it = ITEMS[s!.item], told = it.pays ? prices.things[s!.item] : undefined;
            return (
              <li key={slot} className="rounded-xl border border-line bg-card/60 px-2.5 py-2">
                <div className="flex items-center gap-2.5">
                  <ItemIcon id={s!.item} size={30} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-ui font-semibold text-ink">{th ? it.name.th : it.name.en} <span className="font-data text-muted">×{s!.n}</span></span>
                    {told
                      ? <PriceNow id={s!.item} told={told} th={th} open={graph === slot} onToggle={() => setGraph(graph === slot ? null : slot)} />
                      : it.pays
                        ? <span className="flex items-center gap-1 text-meta text-muted">{th ? "ได้ชิ้นละ" : "Fetches"} <Coins n={it.pays} th={th} small />{th ? "" : " each"}</span>
                        : <span className="text-meta text-muted">{th ? WHY.unwanted[0] : WHY.unwanted[1]}</span>}
                  </div>
                  {it.pays > 0 && (
                    <div className="flex shrink-0 gap-1">
                      {s!.n > 1 && (
                        <button type="button" onClick={() => onLeave(slot, s!.n)}
                                className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
                          {th ? "ทั้งหมด" : "All"}
                        </button>
                      )}
                      <button type="button" onClick={() => onLeave(slot, 1)}
                              className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
                        {th ? "ฝาก 1" : "Leave 1"}
                      </button>
                    </div>
                  )}
                </div>
                {told && graph === slot && <PriceGraph id={s!.item} told={told} round={prices.round} th={th} />}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-meta text-muted">{th ? "กระเป๋ายังว่างอยู่" : "Your bag is empty."}</p>}

      <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "ฝากไว้กับลุง" : "With the uncle"}</h3>
      {due.held.length ? (
        <>
          <ul className="flex flex-col gap-1.5">
            {due.held.map((l, at) => (
              <li key={`${l.item}:${l.round}:${l.f ?? 100}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2" data-lot={l.item}>
                <ItemIcon id={l.item} size={26} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-ui text-ink">{th ? ITEMS[l.item].name.th : ITEMS[l.item].name.en} <span className="font-data text-muted">×{l.n}</span></span>
                <Delta f={l.f ?? 100} th={th} />
                <Coins n={Math.floor(lotWorth(l))} th={th} small />
                <button type="button" onClick={() => onBack(at)}
                        className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
                  {th ? "เอาคืน" : "Take back"}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="text-meta text-muted">{th ? "ยังไม่ได้ฝากอะไรไว้" : "Nothing left with him."}</p>}
    </>
  );
}

/** The banker's counter: which popoto, how many, and what they come to. */
function Bank({ purse, now, th, onChange }: { purse: Purse; now: number; th: boolean; onChange: (kind: Kind, n: number) => void }) {
  const [kind, setKind] = useState<Kind>("profile");
  const [n, setN] = useState(1);
  const left = mayChange(purse, now), most = Math.min(left, Math.floor(purse.popoto[kind])), take = Math.max(1, Math.min(n, Math.max(1, most)));
  // Popoto on pictures are not changed for now (the owner, 2026-10-04: "ปิด popoto จาก gallery ไว้ก่อน"): the picture
  // board divides a picture's popoto between everybody in it, and which of them would stop counting is not settled.
  // The database refuses them too (v114's `bank_gallery`). The rule and its words stay, for the day it opens.
  const kinds = ([["profile", th ? "Popoto จากโปรไฟล์" : "Popoto from your profile"], ["gallery", th ? "Popoto จากรูป" : "Popoto from pictures"]] as Array<[Kind, string]>)
    .filter(([k]) => k !== "gallery" || PICTURES);
  return (
    <>
      <p className="mb-2 text-meta text-muted">
        {th ? `1 popoto = ${RULES.rate} Popoto coin · สัปดาห์นี้แลกได้อีก ${left} จาก ${RULES.weekly} ลูก (เริ่มนับใหม่วันจันทร์)`
          : `1 popoto = ${RULES.rate} Popoto coins · ${left} of this week's ${RULES.weekly} left (Monday starts a new week)`}
      </p>
      <div role="radiogroup" aria-label={th ? "popoto ที่จะแลก" : "Which popoto"} className="flex flex-col gap-1.5">
        {kinds.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setN(1); }}
                  className={`pressable flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left ${kind === k ? "border-accent bg-accent/10" : "border-line-strong hover:border-accent"}`}>
            <span aria-hidden className={`grid size-4 shrink-0 place-items-center rounded-full border ${kind === k ? "border-accent" : "border-line-strong"}`}>
              {kind === k && <span className="size-2 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0 flex-1 text-ui font-semibold text-ink">{label}</span>
            <span className="font-data text-ui tabular-nums text-muted">{Math.floor(purse.popoto[k])}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card/60 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" disabled={take <= 1} onClick={() => setN(take - 1)} aria-label={th ? "ลดลง" : "Fewer"}
                  className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink disabled:opacity-40">−</button>
          <span className="w-10 text-center font-data text-title tabular-nums text-ink" aria-live="polite">{most ? take : 0}</span>
          <button type="button" disabled={take >= most} onClick={() => setN(take + 1)} aria-label={th ? "เพิ่มขึ้น" : "More"}
                  className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink disabled:opacity-40">+</button>
          {most > 1 && (
            <button type="button" onClick={() => setN(most)} className="pressable ml-1 min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
              {th ? "มากสุด" : "Most"}
            </button>
          )}
        </div>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-ui text-muted">{th ? "ได้" : "For"} <Coins n={most ? take * RULES.rate : 0} th={th} /></span>
        <button type="button" disabled={!most} onClick={() => { onChange(kind, take); setN(1); }}
                className="pressable min-h-11 rounded-full bg-accent px-5 text-ui font-semibold text-bg disabled:opacity-40">
          {th ? "แลก" : "Exchange"}
        </button>
      </div>
      {!most && <p className="mt-1.5 text-meta text-chili">{th ? WHY[left ? "popoto" : "cap"][0] : WHY[left ? "popoto" : "cap"][1]}</p>}
      <p className="mt-3 text-meta text-muted">
        {th ? "แลกแล้วจำนวน popoto จะลดลงจริง ส่วนประวัติว่าใครส่งให้ยังอยู่ครบ ตอนนี้แลกได้ขาเดียว จาก popoto เป็น coin"
          : "What you exchange really comes off your popoto count; the record of who sent them stays. For now it goes one way: popoto into coins."}
      </p>
    </>
  );
}

/** My bag, and how I am: my stamina and the day's meals, what a meal left, the bag itself, opened, and the recipes I know. */
function Bag({ purse, held, now, th, seated, company, helpings, recipes, book, dropsAll, lying, onEat, onGetUp, onRead, onRecipe, onHold, onDrop, onWear, onTakeOff, onServe, onOpen, kitchen, sprinkles, tidy = false, onMove, onSort, pouches }: {
  // ── mining ── (the pouches somebody has, each a row of its own under the bag's pockets: components/town/TownPouches)
  pouches?: React.ReactNode;
  purse: Purse; now: number; th: boolean; seated: boolean; company: number;
  /** The slot the thing in the hand is in (the keeper's handSlot): of several pots of food, which is the one held. */
  held: number;
  // ── gifts: kitchen ── (what the kitchen's gifts show in the bag's panel, under how I am; and whether "eat" will sprinkle the stardust spice on a thing)
  kitchen?: React.ReactNode;
  sprinkles?: (item: ItemId) => boolean;
  /** How many helpings a meal's hours take with whoever keeps the game (the keeper's `helpings`). */
  helpings: number;
  /** Whether anything can be dropped (onto the ground, where somebody may pick it up); otherwise only what is worth nothing, which is thrown away. And what I dropped that still lies there. */
  dropsAll: boolean;
  lying: React.ReactNode;
  /** What I know how to make: dishes, and other things. */
  recipes: ItemId[];
  /** The village's book of insects: who first caught each kind that has been caught. */
  book: Record<string, string>;
  onEat: (slot: number) => void; onGetUp: () => void; onRead: (slot: number) => void; onRecipe: (dish: ItemId) => void;
  /** Put on what carries more (from a slot), take one off, and ladle a helping out of a pot of my own. */
  onWear: (slot: number) => void; onTakeOff: (item: ItemId) => void; onServe: (slot: number) => void;
  /** Take the thing in a slot up to hold it in the hand, or (null) put away what is held. */
  onHold: (slot: number | null) => void;
  onDrop: (slot: number) => void;
  /** Open the thing in a slot, to see what is in it. */
  onOpen: (slot: number) => void;
  /**
   * The bag put in order (lib/town/bag; a member, 2026-10-08: "ขอ function sort ของในกระเป๋า และ ลากวางได้"): whether whoever
   * keeps the game lets it be, a thing moved from one slot to another, and the whole of it sorted.
   */
  tidy?: boolean; onMove?: (from: number, to: number) => void; onSort?: () => void;
}) {
  const stamina = Math.round(staminaOf(purse, now)), meal = mealOf(now), bowls = bowlsToday(purse, now);
  // Every buff I have, each with its level and the minutes it has left: what meals left (a level each, the owner,
  // 2026-10-06), and the fountain's blessings (one had from both lasts as long as the longer, at the higher level).
  const until = (id: WishId) => Math.max(0, ...mealBuffs(purse, now).filter((b) => b.id === id).map((b) => b.until), ...(purse.blessed ?? []).filter((b) => b.id === id).map((b) => b.until));
  const buffs = buffsOf(purse, now).map((id) => ({ id, level: levelOf(purse, now, id), minutes: Math.max(1, Math.ceil((until(id) - now) / 60_000)) }));
  /** The thing taken up to look at, by its slot: it is named under the pockets, with what can be done with it. (When the slot comes to hold something else, nothing is taken up.) */
  const [picked, setPicked] = useState<{ slot: number; item: ItemId } | null>(null);
  const slot = picked && purse.bag[picked.slot]?.item === picked.item ? picked.slot : null, inHand = slot !== null ? purse.bag[slot]! : null;
  const it = inHand ? ITEMS[inHand.item] : null, dish = !!inHand && isDish(inHand.item), scroll = inHand ? SCROLLS[inHand.item] : undefined;
  const mayEat = dish && mayEatNow(purse, now, helpings);
  const full = purse.bag.filter(Boolean).length, hand = handOf(purse);
  // (a pot of food is held by its slot: every pot is the same kind of thing, with a dish of its own)
  const holding = !!inHand && hand === inHand.item && (!inHand.of || slot === held);
  /** The slot whose thing is being placed by taps: the way to move a thing with no dragging (the thing taken up, "move", then the slot it goes to). */
  const [moving, setMoving] = useState<number | null>(null);
  useEffect(() => { if (moving !== null && moving !== slot) setMoving(null); }, [moving, slot]);
  const mayMove = tidy && !!onMove;
  /** A thing moved, by a drag or by taps: what is taken up to look at goes with it. */
  const move = (from: number, to: number) => {
    const s = purse.bag[from];
    setMoving(null);
    if (!s || !onMove || from === to) return;
    if (picked?.slot === from) setPicked({ slot: to, item: s.item });
    else if (picked?.slot === to) setPicked(null);
    onMove(from, to);
  };
  return (
    <>
      <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <TownIcon name="stamina" size={20} />
          <span className="text-ui font-semibold text-ink">Stamina</span>
          <span className="ml-auto font-data text-ui tabular-nums text-ink">{stamina}<span className="text-muted"> / {STAMINA.max}</span></span>
        </div>
        <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${stamina ? "bg-jade" : "bg-chili"}`} style={{ width: `${Math.max(2, (stamina / STAMINA.max) * 100)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MEALS.map((_, i) => (
            <span key={i} data-meal={i} data-bowls={bowls[i]} aria-label={th ? `${MEAL_NAME[i][0]} กินแล้ว ${bowls[i]} จาก ${helpings} ถ้วย` : `${MEAL_NAME[i][1]}: ${bowls[i]} of ${helpings} helpings eaten`}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-meta ${bowls[i] >= helpings ? "bg-line text-muted" : i === meal ? "bg-accent/15 font-semibold text-accent" : "bg-bg/40 text-muted"}`}>
              <TownIcon name={(["morning", "noon", "evening"] as const)[i]} size={12} /><span className={bowls[i] >= helpings ? "line-through" : ""}>{th ? MEAL_NAME[i][0] : MEAL_NAME[i][1]}</span>
              {/* a mark for each helping the meal's hours take, filled as they are eaten */}
              <span aria-hidden className="ml-0.5 flex gap-0.5">
                {Array.from({ length: helpings }, (_, k) => <span key={k} className={`size-1.5 rounded-full ${k < bowls[i] ? "bg-current" : "border border-current opacity-50"}`} />)}
              </span>
            </span>
          ))}
        </div>
        {buffs.map((b) => (
          <p key={b.id} className="mt-2 flex items-center gap-1.5 text-meta text-ink">
            <TownIcon name={WISH[b.id].icon as IconName} size={18} />
            <span className="font-semibold text-gold">{th ? WISH[b.id].name.th : WISH[b.id].name.en}</span>
            {b.level > 1 && <span className="rounded-full bg-gold/15 px-1.5 font-data text-label font-semibold text-gold" data-buff-level={b.level}>{th ? `ขั้น ${b.level}` : `Lv ${b.level}`}</span>}
            <span className="min-w-0 text-muted">{th ? `อีก ${b.minutes} นาที` : `${b.minutes} min left`}</span>
          </p>
        ))}
        {purse.eating && (
          <div className="mt-2 rounded-lg border border-gold/50 bg-gold/10 px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-ui text-ink">
              <ItemIcon id={purse.eating.dish} size={20} />
              <span className="min-w-0 flex-1 truncate font-semibold">{th ? `กำลังกิน ${ITEMS[purse.eating.dish].name.th}` : `Eating: ${ITEMS[purse.eating.dish].name.en}`}</span>
              <button type="button" onClick={onGetUp} className="pressable rounded-full border border-line-strong px-3 py-1 text-meta text-ink hover:border-chili">{th ? "ลุก" : "Get up"}</button>
            </p>
            <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(mealProgress(purse, now) * 100)}%` }} />
            </div>
            {company > 0 && <p className="mt-1 text-meta text-muted">{th ? `กินด้วยกัน ${company + 1} คน · stamina +${Math.round(STAMINA.together * 100) * Math.min(STAMINA.company, company)}%` : `${company + 1} eating together · stamina +${Math.round(STAMINA.together * 100) * Math.min(STAMINA.company, company)}%`}</p>}
          </div>
        )}
      </div>

      {/* ── gifts: kitchen ── */}
      {kitchen}

      {/* The bag itself, opened (the owner: "ให้เหมือนเปิดกระเป๋ามากกว่านี้"): its flap thrown back, its pockets inside, and
          under them the thing taken up to look at. What a thing is shows when the mouse is over it; a tap takes it up. */}
      <div className="mt-4" aria-label={th ? "กระเป๋า" : "Bag"}>
        <div aria-hidden className="relative mx-4 h-10 rounded-t-[2rem] border-2 border-b-0 border-[#2e1c0c] bg-gradient-to-b from-[#a8733a] to-[#8a5a2b] shadow-[inset_0_2px_0_rgba(255,235,190,0.25)]">
          <span className="absolute inset-x-2 bottom-0 top-1.5 rounded-t-[1.6rem] border-2 border-b-0 border-dashed border-[#f0d9a8]/45" />
          <span className="absolute left-1/2 top-2 h-12 w-7 -translate-x-1/2 rounded-b-md border-2 border-[#2e1c0c] bg-[#6e4420]" />
          <span className="absolute left-1/2 top-9 size-4 -translate-x-1/2 rounded-sm border-2 border-[#2e1c0c] bg-[#d9b24a] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]" />
        </div>
        <div className="relative rounded-[1.6rem] border-2 border-[#2e1c0c] bg-gradient-to-b from-[#8a5a2b] to-[#6e4420] p-2.5 shadow-lg shadow-black/40">
          <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[1.3rem] border-2 border-dashed border-[#f0d9a8]/35" />
          <div className="relative rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] px-2.5 pb-2.5 pt-4 shadow-[inset_0_6px_14px_rgba(0,0,0,0.75)]">
            <div className="mb-2 flex min-h-8 items-center gap-1.5 font-data text-label uppercase tracking-wider text-[#c9a877]">
              {moving !== null ? (
                // (placing a thing by taps: said where the words were, with the way out of it)
                <span className="min-w-0 flex-1 truncate normal-case tracking-normal text-[#f3e3c3]" aria-live="polite" data-bag-placing>{th ? "แตะช่องที่จะวาง" : "Tap the slot it goes to"}</span>
              ) : <span className="min-w-0 flex-1 truncate">{th ? "ของในกระเป๋า" : "In the bag"}</span>}
              {mayMove && moving !== null && (
                <button type="button" onClick={() => setMoving(null)}
                        className="pressable min-h-8 shrink-0 rounded-full border border-[#6b4a2a] px-2.5 text-meta normal-case tracking-normal text-[#f3e3c3] hover:border-gold">{th ? "ยกเลิก" : "Cancel"}</button>
              )}
              {mayMove && moving === null && slot !== null && (
                <button type="button" onClick={() => setMoving(slot)} data-bag-move
                        className="pressable min-h-8 shrink-0 rounded-full border border-[#6b4a2a] px-2.5 text-meta normal-case tracking-normal text-[#f3e3c3] hover:border-gold">{th ? "ย้าย" : "Move"}</button>
              )}
              {tidy && onSort && moving === null && (
                <button type="button" onClick={onSort} disabled={sorted(purse)} data-bag-sort
                        className="pressable min-h-8 shrink-0 rounded-full border border-[#6b4a2a] px-2.5 text-meta normal-case tracking-normal text-[#f3e3c3] hover:border-gold disabled:opacity-40">{th ? "จัดเรียง" : "Sort"}</button>
              )}
              <span className="shrink-0 tabular-nums">{full} / {purse.bag.length}</span>
            </div>
            {/* what is worn to carry more: a tap takes it off */}
            {(purse.wears ?? []).length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={th ? "ที่สะพายอยู่" : "Worn"}>
                {(purse.wears ?? []).map((id) => (
                  <li key={id}>
                    <button type="button" onClick={() => onTakeOff(id)} title={th ? ITEMS[id].name.th : ITEMS[id].name.en}
                            className="pressable flex min-h-9 items-center gap-1.5 rounded-full border border-[#6b4a2a] bg-[#33251a] pl-1.5 pr-3 text-meta text-[#f3e3c3] hover:border-chili">
                      <ItemIcon id={id} size={22} />{th ? "ถอด" : "Take off"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lying}
            <Pockets bag={purse.bag} th={th} picked={slot} hand={hand} held={held} onPick={(i) => setPicked(i === slot || !purse.bag[i] ? null : { slot: i, item: purse.bag[i]!.item })}
                     onMove={mayMove ? move : undefined} placing={moving} onPlace={(to) => (to === moving ? setMoving(null) : move(moving!, to))} />
            {pouches}
            <div className="mt-2.5 min-h-[4.25rem] rounded-xl border border-[#4a341f] bg-[#2a1e13]/80 px-2.5 py-2" aria-live="polite">
              {inHand && it ? (
                <div className="flex items-center gap-2.5">
                  <StackIcon stack={inHand} size={38} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui font-semibold text-[#f3e3c3]">{inHand.of ? (th ? `หม้อ${ITEMS[inHand.of.dish].name.th}` : `A pot of ${ITEMS[inHand.of.dish].name.en.toLowerCase()}`) : th ? it.name.th : it.name.en} {it.stack > 1 && <span className="font-data text-[#c9a877]">×{inHand.n}</span>}</p>
                    <p className="text-meta text-[#c9a877]">{th ? it.about.th : it.about.en}</p>
                    <SeedTime id={inHand.item} th={th} className="text-meta text-[#f3e3c3]" />
                    {holdsOf(inHand, th) && <p className="text-meta text-[#f3e3c3]">{inHand.of ? (th ? `เหลือ ${inHand.of.left} ที่` : `${inHand.of.left} helpings left`) : holdsOf(inHand, th)}</p>}
                    {dish && !mayEat && !purse.eating && <p className="text-meta text-chili">{th ? WHY.meal[0] : WHY.meal[1]}</p>}
                    {dish && mayEat && !seated && <p className="text-meta text-chili">{th ? WHY.stand[0] : WHY.stand[1]}</p>}
                  </div>
                  {/* anything can be held in the hand, for the town to see (the owner: "ของทุกชิ้นสามารถ กดใส่เพื่อถือในมือได้") */}
                  <button type="button" onClick={() => onHold(holding ? null : slot!)} aria-pressed={holding}
                          className={`pressable min-h-11 shrink-0 rounded-full border px-3 text-ui ${holding ? "border-gold bg-gold/15 font-semibold text-gold" : "border-[#6b4a2a] text-[#f3e3c3] hover:border-gold"}`}>
                    {holding ? (th ? "เก็บ" : "Put away") : (th ? "ถือ" : "Hold")}
                  </button>
                  {inHand.item in CARRIES && (
                    <button type="button" onClick={() => onWear(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
                      {th ? "สะพาย" : "Wear"}
                    </button>
                  )}
                  {inHand.of && (
                    <button type="button" onClick={() => onServe(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
                      {th ? "ตัก" : "Ladle"}
                    </button>
                  )}
                  {dish && (
                    <button type="button" disabled={!mayEat || !seated} onClick={() => onEat(slot!)} data-bag-eat data-spiced={sprinkles?.(inHand.item) ? "" : undefined}
                            aria-label={sprinkles?.(inHand.item) ? (th ? "โรยเครื่องเทศแล้วกิน" : "Sprinkle the spice and eat") : undefined}
                            className="pressable flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                      {sprinkles?.(inHand.item) && <TownIcon name={"thingSpice" as IconName} size={18} />}{th ? "กิน" : "Eat"}
                    </button>
                  )}
                  {scroll && (
                    <button type="button" onClick={() => onRead(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
                      {th ? "คลี่อ่าน" : "Unroll"}
                    </button>
                  )}
                  {/* what may hold something is offered to be opened (nothing says which things do) */}
                  {opens(inHand.item) && (
                    <button type="button" onClick={() => onOpen(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
                      {th ? "เปิดดู" : "Open"}
                    </button>
                  )}
                  {(dropsAll || (!it.pays && !scroll && it.kind === "catch")) && (
                    <button type="button" onClick={() => onDrop(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full border border-[#6b4a2a] px-3 text-ui text-[#f3e3c3] hover:border-chili">
                      {th ? "ทิ้ง" : "Drop"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="grid min-h-[3.25rem] place-items-center text-center text-meta text-[#a88a5e]">
                  {full ? "" : (th ? "กระเป๋ายังว่างอยู่" : "Your bag is empty.")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* the recipe book: not there until a recipe is known (the owner: "สมุดสูตรอาหาร Hide ไว้ก่อน ถ้ารู้แล้วค่อยขึ้นมาให้เห็น") */}
      {recipes.length > 0 && (
        <>
        <h3 className="mb-1.5 mt-4 flex items-center gap-1.5 font-data text-label uppercase tracking-wider text-muted"><TownIcon name="recipes" size={14} />{th ? "สมุดสูตรอาหาร" : "Recipe book"}</h3>
        <ul className="flex flex-wrap gap-1.5">
          {recipes.map((d) => (
            <li key={d}>
              <button type="button" onClick={() => onRecipe(d)}
                      className="pressable flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-card/60 px-3 text-ui text-ink hover:border-accent">
                <ItemIcon id={d} size={20} />{th ? ITEMS[d].name.th : ITEMS[d].name.en}
                {/* a recipe I have not made myself has a thing in it I am not told */}
                {!(purse.made ?? []).includes(d) && <TownIcon name="mystery" size={16} />}
              </button>
            </li>
          ))}
        </ul>
        </>
      )}

      {/* the village's book of insects: not there until one has been caught; only the kinds somebody has caught, each with who caught the first */}
      {BUG_IDS.some((id) => book[id] !== undefined) && (
        <>
        <h3 className="mb-1.5 mt-4 flex items-center gap-1.5 font-data text-label uppercase tracking-wider text-muted" data-bug-book>
          <TownIcon name="bugNet" size={14} />{th ? "สมุดแมลงของหมู่บ้าน" : "The village's book of insects"}
          <span className="ml-1 text-muted">{BUG_IDS.filter((id) => book[id] !== undefined).length}/{BUG_IDS.length}</span>
        </h3>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {BUG_IDS.filter((id) => book[id] !== undefined).map((id) => (
            <li key={id} className="flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-card/60 px-3 py-1.5" data-bug={id}>
              <ItemIcon id={id} size={26} />
              <span className="min-w-0">
                <span className="block truncate text-ui text-ink">{th ? ITEMS[id].name.th : ITEMS[id].name.en}</span>
                <span className="block truncate text-label text-muted">{th ? "จับได้คนแรก" : "First caught by"} {book[id] || (th ? "ใครสักคน" : "somebody")}</span>
              </span>
            </li>
          ))}
        </ul>
        </>
      )}
    </>
  );
}

/**
 * What I have dropped that still lies on the ground (lib/town/ground), in my bag's own panel: each with the seconds it
 * has left there, and a tap picks it back up from where I stand. So a thing dropped by a slip of the finger is not
 * lost for it, though the bag's panel covers the map.
 */
function Lying({ keeper, th, where, say }: { keeper: Keeper; th: boolean; where: () => [number, number] | null; say: (th: string, en: string) => void }) {
  const [, setTick] = useState(0);
  const mine = (keeper.ground() ?? []).filter((d) => d.by === keeper.id), some = mine.length > 0;
  useEffect(() => {
    if (!some) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [some]);
  if (!some) return null;
  const now = keeper.now();
  const back = async (id: number) => {
    const at = where();
    if (!at) return;
    const did = await keeper.groundTake(id, at);
    if (did.ok) say("เก็บคืนแล้ว", "Picked back up.");
    else say(...(WHY_GROUND[did.why] ?? WHY[did.why as Refusal] ?? WHY.none));
  };
  return (
    <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={th ? "ของที่วางไว้บนพื้น" : "On the ground"} data-bag-lying>
      {mine.map((d) => (
        <li key={d.id}>
          <button type="button" onClick={() => void back(d.id)} data-item={d.stack.item}
                  className="pressable flex min-h-9 items-center gap-1.5 rounded-full border border-[#6b4a2a] bg-[#33251a] pl-1.5 pr-3 text-meta text-[#f3e3c3] hover:border-gold">
            <StackIcon stack={d.stack} size={22} />{th ? "เก็บคืน" : "Pick back up"}
            <span aria-hidden className="font-data tabular-nums text-[#c9a877]">{Math.max(1, Math.ceil((d.until - now) / 1000))}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * A thing's card, for when the mouse is over it (the owner: "รายละเอียด item ขึ้นตอนเอาเมาส์ไป hover"): its name, how
 * many, and what it looks like. It hangs above whatever holds it; `at` is how far across its row that is, from 0 to
 * 1, so that the card leans the same way and never leaves the row. What holds it is a `group`.
 */
export function ItemCard({ id, n, th, at, holds }: { id: ItemId; n?: number; th: boolean; at: number; holds?: string | null }) {
  const it = ITEMS[id];
  return (
    <span role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 block w-52 rounded-xl border border-[#6b4a2a] bg-[#1d140c]/97 px-2.5 py-2 text-left opacity-0 shadow-xl shadow-black/60 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ transform: `translateX(-${Math.round(at * 100)}%)` }}>
      <span className="flex items-center gap-2">
        <ItemIcon id={id} size={26} className="shrink-0" />
        <span className="min-w-0 text-ui font-semibold text-[#f3e3c3]">{th ? it.name.th : it.name.en}{n !== undefined && it.stack > 1 && <span className="font-data font-normal text-[#c9a877]"> ×{n}</span>}</span>
      </span>
      <span className="mt-1 block text-meta text-[#c9a877]">{th ? it.about.th : it.about.en}</span>
      <SeedTime id={id} th={th} className="mt-1 text-meta text-[#f3e3c3]" />
      {holds && <span className="mt-1 block text-meta text-[#f3e3c3]">{holds}</span>}
    </span>
  );
}
/** What a thing in the bag holds, in words: the dish in a pot and its helpings, the water in a can or a bucket. Nothing, for a thing that holds nothing. */
export function holdsOf(s: Stack, th: boolean): string | null {
  const holds = heldIn(s, th);
  // ── forging ── (and what a tool carries of its own: its plus, its gem, its options by their names; what each does is the smith's card's to say)
  if (!forged(s)) return holds;
  const m = modsOf(s), gems = gemWords(s, th);
  // (and who forged it, each name once: a tool's history goes with it into whoever's bag it comes)
  const makers = [...new Set(makersOf(s).filter((x): x is string => !!x))];
  return [m.level > 0 ? `+${m.level}` : null, gems ? `${th ? "พลอย" : "gems:"} ${gems}` : null,
    ...m.opts.map((id) => (th ? OPTIONS[id].name.th : OPTIONS[id].name.en)), makers.length ? `${th ? "ตีโดย" : "forged by"} ${makers.join(", ")}` : null, holds].filter(Boolean).join(" · ") || null;
}
function heldIn(s: Stack, th: boolean): string | null {
  if (s.of) return `${th ? ITEMS[s.of.dish].name.th : ITEMS[s.of.dish].name.en} · ${s.of.left}`;
  if (s.item in WATER.buckets) return s.water ? (th ? "มีน้ำเต็ม" : "Full of water") : (th ? "ว่างเปล่า" : "Empty");
  if (s.water !== undefined || s.item in WATER.cans) return s.water ? (th ? `มีน้ำ ${s.water}` : `Water: ${s.water}`) : (th ? "ไม่มีน้ำ" : "No water in it");
  return null;
}

/**
 * The bag's pockets, five to a row: what is in each, and how many. A thing's card shows over it; a tap takes it up.
 * Small, it is a strip at a panel's foot, to look at only. What is in the hand is marked wherever the bag has it; of
 * pots of food, only the one in the slot `held` (they are one kind of thing, and only one of them is in the hand).
 */
function Pockets({ bag, th, picked = null, hand = null, held = -1, onPick, small = false, onMove, placing = null, onPlace }: {
  bag: Purse["bag"]; th: boolean; picked?: number | null; hand?: ItemId | null; held?: number; onPick?: (slot: number) => void; small?: boolean;
  /**
   * A thing dragged from one slot to another (the bag's own panel, where whoever keeps the game lets a bag be put in
   * order): with a mouse by pressing and pulling, with a finger by holding a moment and then pulling (a finger that
   * moves at once is scrolling the panel, as ever).
   */
  onMove?: (from: number, to: number) => void;
  /** The slot whose thing is being placed by taps: every slot is then somewhere to put it (its own gives it up). */
  placing?: number | null; onPlace?: (to: number) => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  /** The thing being carried: where it came from, where the pointer is, and the slot under it. */
  const [drag, setDrag] = useState<{ from: number; x: number; y: number; over: number | null } | null>(null);
  /** A press that may become a carry: its slot and what was in it, where it began, whether the thing is up yet, and a finger's moment of holding. */
  const live = useRef<{ from: number; what: string; x0: number; y0: number; on: boolean; timer: number | null; touch: boolean } | null>(null);
  /** What is in a slot, as a word (lib/town/bag's: the thing, and for what holds something what it holds). */
  const whatIn = (i: number) => whatOf(bag[i]);
  /** The bag as the last drawing had it, for a finger's moment that ends between two drawings. */
  const now = useRef(whatIn);
  now.current = whatIn;
  /** The click that follows a carry is the carry's own end, not a tap on the slot it ended over. */
  const swallow = useRef(false);
  const can = !!onMove;
  const slotAt = (x: number, y: number) => { const el = document.elementFromPoint(x, y)?.closest("[data-bag-slot]") as HTMLElement | null; return el && list.current?.contains(el) ? Number(el.dataset.bagSlot) : null; };
  const lift = (x: number, y: number) => { const l = live.current; if (!l) return; if (now.current(l.from) !== l.what) { quit(); return; } l.on = true; setDrag({ from: l.from, x, y, over: l.from }); };
  const carry = (x: number, y: number) => setDrag((d) => (d ? { ...d, x, y, over: slotAt(x, y) } : d));
  const quit = () => { const l = live.current; if (l?.timer) window.clearTimeout(l.timer); live.current = null; setDrag(null); };
  const drop = (x: number, y: number) => {
    const l = live.current;
    quit();
    if (!l?.on) return;
    swallow.current = true;
    window.setTimeout(() => { swallow.current = false; }, 400);
    const to = slotAt(x, y);
    // (what was pressed is what is moved: the slot's thing become another under the carry, by a sort answered late
    // say, nothing is)
    if (to !== null && to !== l.from && now.current(l.from) === l.what) onMove?.(l.from, to);
  };
  // A finger that carries a thing must not scroll the panel under it: only a listener that is not passive may say so.
  useEffect(() => {
    const el = list.current;
    if (!el || !can) return;
    const move = (e: TouchEvent) => {
      const l = live.current, t = e.touches[0];
      if (!l?.touch || !t) return;
      // (a second finger, wherever it came down, is another gesture: whatever the first had begun is over)
      if (e.touches.length !== 1) { quit(); return; }
      if (l.on) { e.preventDefault(); carry(t.clientX, t.clientY); }
      else if (Math.hypot(t.clientX - l.x0, t.clientY - l.y0) > 10) quit();
    };
    // (…and one that comes down on the bag itself, on an empty slot or between two, is heard here: Codex's second look)
    const more = (e: TouchEvent) => { if (live.current?.touch && e.touches.length > 1) quit(); };
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchstart", more, { passive: true });
    return () => { el.removeEventListener("touchmove", move); el.removeEventListener("touchstart", more); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the listener reads the press from its ref
  }, [can]);
  useEffect(() => () => { if (live.current?.timer) window.clearTimeout(live.current.timer); }, []);
  // The thing carried is gone from its slot, or another is in it (eaten, sold, a sort answered while it was carried,
  // another page of mine): the carry is over, whether or not the pointer's end is ever heard (the button it began on
  // may have gone with the thing). Found by Codex's check: a carry went on with whatever had come into the slot.
  const gone = !!drag && whatIn(drag.from) !== live.current?.what;
  useEffect(() => {
    if (gone) quit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quit reads the press from its ref
  }, [gone]);
  return (
    <ul ref={list} className="grid grid-cols-5 gap-1.5" aria-label={th ? "กระเป๋า" : "Bag"} data-bag-dragging={drag ? drag.from : undefined}
        onClickCapture={(e) => { if (swallow.current) { swallow.current = false; e.preventDefault(); e.stopPropagation(); } }}>
      {bag.map((s, i) => {
        // (where a carried thing would land, and in placing by taps every slot but its own)
        const target = (drag && drag.over === i && drag.from !== i) || (placing !== null && placing !== i);
        const look = `relative grid w-full place-items-center rounded-xl border-2 ${small ? "h-11" : "aspect-square"} ${s
          ? `bg-[#33251a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] ${picked === i ? "border-gold" : target ? "border-accent" : "border-[#6b4a2a] hover:border-[#c9a877]"}`
          : `border-dashed bg-[#241a10] shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)] ${target ? "border-accent" : "border-[#4a341f]"}`}`;
        if (!s) return (
          <li key={i} data-bag-slot={i} className={look}>
            {placing !== null && onPlace
              ? <button type="button" onClick={() => onPlace(i)} aria-label={th ? `วางที่ช่องว่าง ${i + 1}` : `Put it in empty slot ${i + 1}`} className="absolute inset-0 rounded-xl" />
              : <span className="sr-only">{th ? "ช่องว่าง" : "Empty slot"}</span>}
          </li>
        );
        // (a forged tool's slot says its plus and its gems to a screen reader too)
        const carries_ = forgeWords(s, th), name = `${th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en}${carries_ ? ` ${carries_}` : ""}`;
        const inside = (
          <>
            <StackIcon stack={s} size={small ? 24 : 36} />
            {ITEMS[s.item].stack > 1 && <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000,0_0_2px_#000]">{s.n}</span>}
            {(s.of || (s.water !== undefined && !(s.item in WATER.buckets))) && (
              <span className={`absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums [text-shadow:0_1px_2px_#000,0_0_2px_#000] ${s.of ? "text-[#f3e3c3]" : "text-[#8fd0ff]"}`}>{s.of ? s.of.left : s.water}</span>
            )}
            {hand === s.item && (!s.of || i === held) && <span data-bag-held className="absolute left-0.5 top-0.5 rounded-full bg-gold px-1 font-data text-[9px] font-semibold uppercase leading-4 text-bg">{th ? "ถือ" : "held"}</span>}
            {/* (no card over a thing while one is carried or placed: it would lie on the slots above, and on the bag's head where the way to place is said) */}
            {!drag && placing === null && <ItemCard id={s.item} n={s.n} th={th} at={((i % 5) + 0.5) / 5} holds={holdsOf(s, th)} />}
          </>
        );
        // (a press that may become a carry: a mouse's by pulling, a finger's by holding a moment first)
        const carries = can ? {
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            if (e.pointerType === "touch" || e.button !== 0 || placing !== null) return;
            live.current = { from: i, what: whatIn(i), x0: e.clientX, y0: e.clientY, on: false, timer: null, touch: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          },
          onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            const l = live.current;
            if (!l || l.touch) return;
            if (l.on) carry(e.clientX, e.clientY);
            else if (Math.hypot(e.clientX - l.x0, e.clientY - l.y0) >= 6) lift(e.clientX, e.clientY);
          },
          onPointerUp: (e: React.PointerEvent<HTMLElement>) => { if (live.current && !live.current.touch) drop(e.clientX, e.clientY); },
          onPointerCancel: () => { if (live.current && !live.current.touch) quit(); },
          // (the pointer taken away with no word of its end, by another window say: after a pointer let go this finds nothing to end)
          onLostPointerCapture: () => { if (live.current && !live.current.touch) quit(); },
          onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
            const t = e.touches[0];
            // (a second finger is another gesture: whatever the first had begun is over)
            if (e.touches.length !== 1) { quit(); return; }
            if (!t || placing !== null) return;
            const l = { from: i, what: whatIn(i), x0: t.clientX, y0: t.clientY, on: false, timer: null as number | null, touch: true };
            l.timer = window.setTimeout(() => { l.timer = null; if (live.current === l) { lift(l.x0, l.y0); navigator.vibrate?.(12); } }, 320);
            live.current = l;
          },
          onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
            const t = e.changedTouches[0];
            if (!live.current?.touch || !t) return;
            // (let go of with another finger still down: not a thing put somewhere)
            if (e.touches.length > 0) quit(); else drop(t.clientX, t.clientY);
          },
          onTouchCancel: () => { if (live.current?.touch) quit(); },
          onContextMenu: (e: React.MouseEvent) => { if (live.current) e.preventDefault(); },
        } : {};
        const slotLook = `group select-none ${look} ${drag?.from === i ? "opacity-40" : ""}`;
        return (
          <li key={i} data-bag-slot={i} className="relative hover:z-20 focus-within:z-20" style={can ? { WebkitTouchCallout: "none" } : undefined}>
            {placing !== null && onPlace
              ? <button type="button" onClick={() => onPlace(i)} aria-pressed={placing === i} aria-label={placing === i ? `${name} ×${s.n}` : (th ? `วางที่ช่องของ ${name}` : `Put it where the ${name} is`)} className={`pressable ${slotLook}`}>{inside}</button>
              : onPick
                ? <button type="button" onClick={() => onPick(i)} aria-pressed={picked === i} aria-label={`${name} ×${s.n}`} className={`pressable ${slotLook}`} {...carries}>{inside}</button>
                : <span tabIndex={0} aria-label={`${name} ×${s.n}`} className={slotLook}>{inside}</span>}
          </li>
        );
      })}
      {/* the thing being carried, under the pointer: over everything (the ladder's top, where the thrown potato is) */}
      {drag && bag[drag.from] && createPortal(
        <span aria-hidden className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 scale-125 [filter:drop-shadow(0_6px_8px_rgba(0,0,0,0.6))]" style={{ left: drag.x, top: drag.y }} data-bag-ghost>
          <StackIcon stack={bag[drag.from]!} size={small ? 24 : 36} />
        </span>, document.body)}
    </ul>
  );
}

/**
 * What I carry, at the foot of the stall, and it folds to one line (the owner, 2026-10-08, of a phone on which a bag of
 * twenty-five slots left the shelf a sliver: "มองไม่เห็นเมนูที่จะขายเลย ถ้าหด UI หน้าตะกร้าออกไปได้จะดีมาก"). Folded it says how
 * many slots are taken and how many are free, which is what buying asks. On a phone it begins folded, and unfolded
 * shows two rows at a time; on a wide screen it begins open while the bag is three rows or fewer. The choice is kept
 * on the device, a phone's apart.
 */
function StallBag({ bag, th }: { bag: Purse["bag"]; th: boolean }) {
  // (a phone is what the map takes for one: Town.tsx's own query. Asked here, so that the panel's props stay as they are)
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)"), update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  // (until somebody chooses: folded on a phone, and on a wide screen once the bag is more than three rows)
  const key = `cashTown:stallBag:${phone ? "phone" : "wide"}`, roomy = !phone && bag.length <= 15;
  const [open, setOpen] = useState(roomy);
  useEffect(() => {
    let kept: string | null = null;
    try { kept = window.localStorage.getItem(key); } catch { /* the default, then */ }
    setOpen(kept ? kept === "open" : roomy);
  }, [key, roomy]);
  const toggle = () => {
    setOpen(!open);
    try { window.localStorage.setItem(key, open ? "shut" : "open"); } catch { /* not kept, then */ }
  };
  const used = bag.filter(Boolean).length, free = bag.length - used;
  return (
    <div className="border-t border-line bg-[#1d140c]" data-stall-bag={open ? "open" : "shut"}>
      <button type="button" onClick={toggle} aria-expanded={open}
              className="pressable flex min-h-11 w-full items-center gap-2 px-4 text-left text-meta text-[#c9a877] hover:text-[#f3e3c3]">
        <TownIcon name="bag" size={20} />
        <span className="font-semibold text-[#f3e3c3]">{th ? "กระเป๋า" : "Bag"}</span>
        <span className="font-data tabular-nums">{used}/{bag.length}</span>
        <span className={free ? "" : "font-semibold text-gold"}>{free ? (th ? `ว่าง ${free} ช่อง` : `${free} free`) : (th ? "เต็มแล้ว" : "full")}</span>
        <span className="ml-auto flex items-center gap-1.5">{open ? (th ? "พับเก็บ" : "Fold away") : (th ? "เปิดดู" : "Show")}<TownIcon name="chevron" size={12} className={open ? "" : "rotate-180"} /></span>
      </button>
      {open && (
        <div className="px-4 pb-2 max-sm:max-h-[6.75rem] max-sm:overflow-y-auto max-sm:overscroll-contain">
          <Pockets bag={bag} th={th} small />
        </div>
      )}
    </div>
  );
}

/**
 * What the uncle wants today (lib/town/orders; the owner: "ลุงขายของ จะมีเควส รายวันปลดล็อคของในร้านทีละอย่าง"): three things,
 * how many of each have come from the whole village, and a button to bring what I carry of it, paid on the spot. A
 * day's order filled puts one more thing on his shelf; what, is not said until it is there.
 */
function Wanted({ order, purse, th, onGive }: { order: Order; purse: Purse; th: boolean; onGive: (slot: number, n: number) => void }) {
  if (!order.wants.length) return null;
  return (
    <section aria-label={th ? "ของที่ลุงอยากได้วันนี้" : "What the uncle wants today"} className="mb-3 rounded-xl border border-gold/50 bg-gold/10 px-2.5 py-2">
      <h3 className="flex items-center gap-1.5 font-data text-label uppercase tracking-wider text-gold">
        {th ? "ของที่ลุงอยากได้วันนี้" : "What the uncle wants today"}
        {order.filled && <span className="ml-auto rounded-full bg-jade px-1.5 text-[10px] font-semibold normal-case tracking-normal text-bg">{th ? "ครบแล้ว" : "Filled"}</span>}
      </h3>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {order.wants.map((w) => {
          const slot = purse.bag.findIndex((s) => s?.item === w.item), have = slot < 0 ? 0 : purse.bag[slot]!.n, n = Math.min(have, w.n - w.got);
          return (
            <li key={w.item} className="flex items-center gap-2.5">
              <ItemIcon id={w.item} size={28} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-ui text-ink">
                  <span className="min-w-0 truncate font-semibold">{th ? ITEMS[w.item].name.th : ITEMS[w.item].name.en}</span>
                  <span className="ml-auto shrink-0 font-data tabular-nums text-muted">{w.got} / {w.n}</span>
                </p>
                <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className={`h-full rounded-full ${w.got >= w.n ? "bg-jade" : "bg-gold"}`} style={{ width: `${Math.round((w.got / w.n) * 100)}%` }} />
                </div>
              </div>
              <button type="button" disabled={n < 1} onClick={() => onGive(slot, n)} aria-label={`${th ? "ให้ลุง" : "Give"} ${th ? ITEMS[w.item].name.th : ITEMS[w.item].name.en} ×${n}`}
                      className="pressable min-h-11 shrink-0 rounded-full bg-accent px-3 text-ui font-semibold text-bg disabled:opacity-40">
                {th ? "ให้ลุง" : "Give"}{n > 0 ? ` ×${n}` : ""}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The kinds of thing the stall's shelf is laid out by, in order. */
const KINDS: Array<[ItemKind, [th: string, en: string]]> = [
  ["tool", ["เครื่องมือ", "Tools"]], ["bait", ["เหยื่อ", "Bait"]], ["staple", ["ของครัว", "Staples"]], ["seed", ["เมล็ดพันธุ์", "Seeds"]],
  ["goods", ["ของใช้", "Goods"]], ["dish", ["อาหาร", "Food"]], ["scroll", ["สูตรและคำใบ้", "Recipes and hints"]],
];

/** So many Popoto coins, with the coin beside the number. */
export function Coins({ n, th, small = false, className = "" }: { n: number; th: boolean; small?: boolean; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-1 font-data tabular-nums text-gold ${small ? "text-meta" : "text-ui font-semibold"} ${className}`}>
      <TownIcon name="coin" size={small ? 13 : 17} />{n}<span className="sr-only"> {th ? "Popoto coin" : "Popoto coins"}</span>
    </span>
  );
}

/** A picture from the scenery, fitted into a square box; an empty box until it has come. */
export function Pic({ sprite, box }: { sprite: Sprite | null; box: number }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: box }} />;
  const [x, y, w, h] = sprite.at, k = box / Math.max(w, h);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: box }}>
      <span style={{
        width: w * k, height: h * k,
        backgroundImage: `url(${sprite.src})`,
        backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`,
        backgroundPosition: `${-x * k}px ${-y * k}px`,
        imageRendering: k >= 1 ? "pixelated" : "auto",
      }} />
    </span>
  );
}
