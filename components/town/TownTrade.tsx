"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WATER } from "@/lib/town/farm";
import { CARRIES } from "@/lib/town/gear";
import { HINT_PRICE, hintOf } from "@/lib/town/hints";
import { BUFFS, ITEMS, SCROLLS, iconOf, isDish, potIconOf, type BuffId, type DishId, type ItemId, type ItemKind } from "@/lib/town/items";
import type { Order } from "@/lib/town/orders";
import { opens } from "@/lib/town/scrolls";
import { MEALS, STAMINA, buffOf, eatenToday, mealOf, mealProgress, nextMealAt, staminaOf } from "@/lib/town/stamina";
import {
  GOODS, RULES, SHELF, handOf, leftOf, mayBuy, mayChange, nextRoundAt, onShelf, waiting,
  type Purse, type Refusal, type Stack, type Stall,
} from "@/lib/town/trade";
import type { Did, Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import TownIcon, { type IconName } from "./TownIcon";

/** What of the trade is open on the screen: the uncle's stall (buying, or leaving things to be sold), the bank, or my own bag. */
export type TradeView = "buy" | "sell" | "bank" | "bag";
/** What the map needs to know of me without opening anything: my coins, the money waiting with the uncle, my stamina, the buff a meal left, the meal I am at, and what I hold in my hand. */
export interface TradeSummary {
  hand: ItemId | null;
  coins: number;
  waiting: number;
  stamina: number;
  buff: BuffId | null;
  eating: { dish: DishId; progress: number } | null;
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
  meal: ["มื้อนี้กินไปแล้ว รอมื้อถัดไป", "This meal is eaten. Wait for the next."],
  stand: ["นั่งก่อนถึงจะกินได้", "Sit down first"],
  known: ["สูตรนี้รู้อยู่แล้ว", "You know this recipe already"],
  dry: ["ไม่มีน้ำ", "There is no water"],
  worn: ["สะพายแบบนี้อยู่แล้ว", "You are wearing one already"],
  crew: ["คนยังไม่ครบ", "Not everybody is here"],
  taken: ["ตรงนี้มีของวางอยู่แล้ว", "Something stands here already"],
  many: ["วางหม้อไว้หลายใบแล้ว เก็บใบเก่าก่อน", "Too many pots set down: take one up first"],
  busy: ["กำลังแลกของกับคนอื่นอยู่", "In a deal with somebody else"],
  away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town cannot be reached. Try again."],
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

/** The picture of what is in a slot: the thing's own, but a pot of food is its dish's pot, and a bucket with water in it is full. */
export function StackIcon({ stack, size, className }: { stack: Stack; size: number; className?: string }) {
  const name = stack.of ? potIconOf(stack.of.dish) : stack.water && stack.item in WATER.buckets ? `${stack.item}Full` : iconOf(stack.item);
  return <TownIcon name={name as IconName} size={size} className={className} />;
}

/** A thing's picture, by its name in lib/town/items. */
export function ItemIcon({ id, size, className }: { id: ItemId; size: number; className?: string }) {
  return <TownIcon name={iconOf(id) as IconName} size={size} className={className} />;
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
export default function TownTrade({ keeper, view, th, art, seated, company, onView, onSummary, onScroll }: {
  /** Who keeps my purse. */
  keeper: Keeper;
  view: TradeView | null;
  th: boolean;
  /** The town's own pixel art for a picture's name, once the scenery has come. */
  art: (name: string) => Sprite | null;
  /** Whether I am sitting down (a meal is eaten sitting), and how many are eating beside me. */
  seated: boolean;
  company: number;
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
  const atStall = view === "buy" || view === "sell";
  useEffect(() => (atStall ? keeper.look("stall") : undefined), [atStall, keeper]);
  // (handed to scripts in `next dev`, like the town's own handle: the trial itself where there is one)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townTrade?: unknown; __townKeeper?: Keeper };
    w.__townTrade = keeper.trial ?? keeper;
    w.__townKeeper = keeper;
    return () => { delete w.__townTrade; delete w.__townKeeper; };
  }, [keeper]);

  const now = keeper.now(), purse = keeper.purse(), stall = keeper.stall();
  const due = waiting(purse, now), stamina = staminaOf(purse, now), buff = buffOf(purse, now);
  const eating = purse.eating ? { dish: purse.eating.dish, progress: mealProgress(purse, now) } : null, hand = handOf(purse);
  useEffect(() => {
    onSummary({ hand, coins: purse.coins, waiting: due.coins, stamina: Math.round(stamina), buff, eating });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the meal is told by its dish and how far through it is
  }, [onSummary, hand, purse.coins, due.coins, Math.round(stamina), buff, eating?.dish, eating && Math.round(eating.progress * 100)]);

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

  if (!view) return null;
  const uncle = atStall, order = keeper.order();
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
          {([["buy", th ? "ซื้อของ" : "Buy"], ["sell", th ? "ฝากขาย" : "Sell"]] as const).map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)}
                    className={`pressable -mb-px rounded-t-lg border-b-2 px-3 py-2 text-ui font-semibold ${view === v ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
              {label}
              {v === "sell" && due.coins > 0 && <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 font-data text-meta text-gold">{due.coins}</span>}
            </button>
          ))}
        </div>
      )}

      {uncle && (view === "buy" || view === "sell") && (
        <NextRound keeper={keeper} th={th} sell={view === "sell"} coming={due.held.reduce((t, l) => t + l.n * l.pays, 0)} />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3">
        <p className="mb-2 min-h-[1.5em] text-meta text-accent" aria-live="polite">{said ?? ""}</p>
        {view === "buy" && <Buy purse={purse} stall={stall} now={now} th={th} next={keeper.nextHint()} shelf={keeper.shelf()}
                                onBuy={(id, n) => tried(keeper.buy(id, n), ["ขอบใจนะหลาน", "Much obliged, kiddo."])}
                                onHint={() => tried(keeper.hint(), ["ลุงจดให้แล้วนะ ส่วนอย่างสุดท้าย ไปเดาเอาเอง", "There, I've jotted it down. The last thing is yours to guess."])} />}
        {view === "sell" && order && <Wanted order={order} purse={purse} th={th}
                                    onGive={async (slot, n) => {
                                      const did = await keeper.orderGive(slot, n);
                                      if (!did.ok) { say(...why(did.why)); return; }
                                      if (did.opened) say(`ครบแล้ว! ขอบใจทุกคนนะ ลุงมีของใหม่มาขาย: ${ITEMS[did.opened].name.th}`, `That's the lot! Thank you all. Something new on my shelf: ${ITEMS[did.opened].name.en.toLowerCase()}`);
                                      else say(`ขอบใจนะหลาน นี่ ${did.coins} coin`, `Much obliged, kiddo. Here's ${did.coins} coins.`);
                                    }} />}
        {view === "sell" && <Sell purse={purse} now={now} th={th}
                                  onLeave={(slot, n) => tried(keeper.leave(slot, n), ["ลุงรับฝากไว้ให้นะ ญาติลุงมารับรอบหน้า", "I'll keep it for my relatives. They fetch it next round."])}
                                  onBack={(at) => tried(keeper.takeBack(at), ["เอาคืนไปได้เลย", "Here, have it back."])}
                                  onCollect={() => tried(keeper.collect(), ["นี่เงินของหลาน นับดูได้เลย", "Here's your money. Count it if you like."])} />}
        {view === "bank" && <Bank purse={purse} now={now} th={th}
                                  onChange={(kind, n) => tried(keeper.change(kind, n), ["เรียบร้อยครับ ผมจดลงสมุดแล้ว", "All done. It is written in my ledger."])} />}
        {view === "bag" && <Bag purse={purse} now={now} th={th} seated={seated} company={company} recipes={[...keeper.known(), ...keeper.knownMakes()]}
                                onWear={(slot) => tried(keeper.wear(slot), ["สะพายแล้ว", "On your back."])}
                                onTakeOff={(item) => tried(keeper.takeOff(item), ["ถอดเก็บแล้ว", "Taken off."])}
                                onServe={async (slot) => { const did = await keeper.serve(slot); if (did.ok) say("ตักใส่ถ้วยแล้ว", "A helping, in your bowl."); else say(...(did.why === "tool" ? (["ไม่มีถ้วย", "No bowl"] as [string, string]) : why(did.why))); }}
                                onEat={(slot) => tried(keeper.sitDown(slot, seated), ["เริ่มกินแล้ว", "Tucking in."])}
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
                                onDrop={(slot) => tried(keeper.drop(slot), ["ทิ้งไปแล้ว", "Thrown away."])} />}
      </div>

      {/* what I carry, always in sight at the stall: buying fills it, leaving things empties it */}
      {uncle && (
        <div className="border-t border-line bg-[#1d140c] px-4 py-2">
          <Pockets bag={purse.bag} th={th} small />
        </div>
      )}

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
function Buy({ purse, stall, now, th, next, shelf, onBuy, onHint }: {
  purse: Purse; stall: Stall; now: number; th: boolean;
  /** The hint he would sell me next, if he has one. */
  next: ItemId | null;
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
      {/* a recipe is not told: the uncle sells a hint of the next one, which names all that goes in but the last thing */}
      {kind === "scroll" && (
        <div className="mb-2 rounded-xl border border-line bg-card/60 px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <TownIcon name="note" size={30} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-ui font-semibold text-ink">{th ? "คำใบ้ของลุง" : "The uncle's hint"}</span>
                {next && <Coins n={HINT_PRICE[ITEMS[next].tier]} th={th} small />}
              </div>
              <p className="font-data text-meta text-muted">{hints.length}</p>
            </div>
            <button type="button" disabled={!next} onClick={onHint}
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

/** What I can leave with the uncle to be sold, what he is holding for me, and the money that has come back. */
function Sell({ purse, now, th, onLeave, onBack, onCollect }: {
  purse: Purse; now: number; th: boolean;
  onLeave: (slot: number, n: number) => void; onBack: (at: number) => void; onCollect: () => void;
}) {
  const due = waiting(purse, now), mine = purse.bag.map((s, slot) => ({ s, slot })).filter((x) => x.s);
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
            const it = ITEMS[s!.item];
            return (
              <li key={slot} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2">
                <ItemIcon id={s!.item} size={30} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold text-ink">{th ? it.name.th : it.name.en} <span className="font-data text-muted">×{s!.n}</span></span>
                  {it.pays
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
              <li key={`${l.item}:${l.round}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2">
                <ItemIcon id={l.item} size={26} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-ui text-ink">{th ? ITEMS[l.item].name.th : ITEMS[l.item].name.en} <span className="font-data text-muted">×{l.n}</span></span>
                <Coins n={l.n * l.pays} th={th} small />
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
function Bag({ purse, now, th, seated, company, recipes, onEat, onGetUp, onRead, onRecipe, onHold, onDrop, onWear, onTakeOff, onServe, onOpen }: {
  purse: Purse; now: number; th: boolean; seated: boolean; company: number;
  /** What I know how to make: dishes, and other things. */
  recipes: ItemId[];
  onEat: (slot: number) => void; onGetUp: () => void; onRead: (slot: number) => void; onRecipe: (dish: ItemId) => void;
  /** Put on what carries more (from a slot), take one off, and ladle a helping out of a pot of my own. */
  onWear: (slot: number) => void; onTakeOff: (item: ItemId) => void; onServe: (slot: number) => void;
  /** Take the thing in a slot up to hold it in the hand, or (null) put away what is held. */
  onHold: (slot: number | null) => void;
  onDrop: (slot: number) => void;
  /** Open the thing in a slot, to see what is in it. */
  onOpen: (slot: number) => void;
}) {
  const stamina = Math.round(staminaOf(purse, now)), meal = mealOf(now), eaten = eatenToday(purse, now), buff = buffOf(purse, now);
  const hoursLeft = buff && purse.buff ? Math.max(1, Math.ceil((purse.buff.until - now) / 60_000)) : 0;
  /** The thing taken up to look at, by its slot: it is named under the pockets, with what can be done with it. (When the slot comes to hold something else, nothing is taken up.) */
  const [picked, setPicked] = useState<{ slot: number; item: ItemId } | null>(null);
  const slot = picked && purse.bag[picked.slot]?.item === picked.item ? picked.slot : null, inHand = slot !== null ? purse.bag[slot]! : null;
  const it = inHand ? ITEMS[inHand.item] : null, dish = !!inHand && isDish(inHand.item), scroll = inHand ? SCROLLS[inHand.item] : undefined;
  const mayEat = dish && !purse.eating && !eaten[meal];
  const full = purse.bag.filter(Boolean).length, hand = handOf(purse);
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
            <span key={i} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-meta ${eaten[i] ? "bg-line text-muted line-through" : i === meal ? "bg-accent/15 font-semibold text-accent" : "bg-bg/40 text-muted"}`}>
              <TownIcon name={(["morning", "noon", "evening"] as const)[i]} size={12} />{th ? MEAL_NAME[i][0] : MEAL_NAME[i][1]}
            </span>
          ))}
        </div>
        {buff && (
          <p className="mt-2 flex items-center gap-1.5 text-meta text-ink">
            <TownIcon name={BUFFS[buff].icon as IconName} size={18} />
            <span className="font-semibold text-gold">{th ? BUFFS[buff].name.th : BUFFS[buff].name.en}</span>
            <span className="min-w-0 text-muted">{th ? `อีก ${hoursLeft} นาที` : `${hoursLeft} min left`}</span>
          </p>
        )}
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
            {company > 0 && <p className="mt-1 text-meta text-muted">{th ? `กินด้วยกัน ${company + 1} คน` : `${company + 1} eating together`}</p>}
          </div>
        )}
      </div>

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
            <p className="mb-2 flex items-center justify-between font-data text-label uppercase tracking-wider text-[#c9a877]">
              <span>{th ? "ของในกระเป๋า" : "In the bag"}</span>
              <span className="tabular-nums">{full} / {purse.bag.length}</span>
            </p>
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
            <Pockets bag={purse.bag} th={th} picked={slot} hand={hand} onPick={(i) => setPicked(i === slot || !purse.bag[i] ? null : { slot: i, item: purse.bag[i]!.item })} />
            <div className="mt-2.5 min-h-[4.25rem] rounded-xl border border-[#4a341f] bg-[#2a1e13]/80 px-2.5 py-2" aria-live="polite">
              {inHand && it ? (
                <div className="flex items-center gap-2.5">
                  <StackIcon stack={inHand} size={38} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui font-semibold text-[#f3e3c3]">{inHand.of ? (th ? `หม้อ${ITEMS[inHand.of.dish].name.th}` : `A pot of ${ITEMS[inHand.of.dish].name.en.toLowerCase()}`) : th ? it.name.th : it.name.en} {it.stack > 1 && <span className="font-data text-[#c9a877]">×{inHand.n}</span>}</p>
                    <p className="text-meta text-[#c9a877]">{th ? it.about.th : it.about.en}</p>
                    {holdsOf(inHand, th) && <p className="text-meta text-[#f3e3c3]">{inHand.of ? (th ? `เหลือ ${inHand.of.left} ที่` : `${inHand.of.left} helpings left`) : holdsOf(inHand, th)}</p>}
                    {dish && !mayEat && !purse.eating && <p className="text-meta text-chili">{th ? WHY.meal[0] : WHY.meal[1]}</p>}
                    {dish && mayEat && !seated && <p className="text-meta text-chili">{th ? WHY.stand[0] : WHY.stand[1]}</p>}
                  </div>
                  {/* anything can be held in the hand, for the town to see (the owner: "ของทุกชิ้นสามารถ กดใส่เพื่อถือในมือได้") */}
                  <button type="button" onClick={() => onHold(hand === inHand.item ? null : slot!)} aria-pressed={hand === inHand.item}
                          className={`pressable min-h-11 shrink-0 rounded-full border px-3 text-ui ${hand === inHand.item ? "border-gold bg-gold/15 font-semibold text-gold" : "border-[#6b4a2a] text-[#f3e3c3] hover:border-gold"}`}>
                    {hand === inHand.item ? (th ? "เก็บ" : "Put away") : (th ? "ถือ" : "Hold")}
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
                    <button type="button" disabled={!mayEat || !seated} onClick={() => onEat(slot!)}
                            className="pressable min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                      {th ? "กิน" : "Eat"}
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
                  {!it.pays && !scroll && it.kind === "catch" && (
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
    </>
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
      {holds && <span className="mt-1 block text-meta text-[#f3e3c3]">{holds}</span>}
    </span>
  );
}
/** What a thing in the bag holds, in words: the dish in a pot and its helpings, the water in a can or a bucket. Nothing, for a thing that holds nothing. */
export function holdsOf(s: Stack, th: boolean): string | null {
  if (s.of) return `${th ? ITEMS[s.of.dish].name.th : ITEMS[s.of.dish].name.en} · ${s.of.left}`;
  if (s.item in WATER.buckets) return s.water ? (th ? "มีน้ำเต็ม" : "Full of water") : (th ? "ว่างเปล่า" : "Empty");
  if (s.water !== undefined || s.item in WATER.cans) return s.water ? (th ? `มีน้ำ ${s.water}` : `Water: ${s.water}`) : (th ? "ไม่มีน้ำ" : "No water in it");
  return null;
}

/** The bag's pockets, five to a row: what is in each, and how many. A thing's card shows over it; a tap takes it up. Small, it is a strip at a panel's foot, to look at only. */
function Pockets({ bag, th, picked = null, hand = null, onPick, small = false }: {
  bag: Purse["bag"]; th: boolean; picked?: number | null; hand?: ItemId | null; onPick?: (slot: number) => void; small?: boolean;
}) {
  return (
    <ul className="grid grid-cols-5 gap-1.5" aria-label={th ? "กระเป๋า" : "Bag"}>
      {bag.map((s, i) => {
        const look = `relative grid w-full place-items-center rounded-xl border-2 ${small ? "h-11" : "aspect-square"} ${s
          ? `bg-[#33251a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] ${picked === i ? "border-gold" : "border-[#6b4a2a] hover:border-[#c9a877]"}`
          : "border-dashed border-[#4a341f] bg-[#241a10] shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)]"}`;
        if (!s) return <li key={i} className={look}><span className="sr-only">{th ? "ช่องว่าง" : "Empty slot"}</span></li>;
        const name = th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en;
        const inside = (
          <>
            <StackIcon stack={s} size={small ? 24 : 36} />
            {ITEMS[s.item].stack > 1 && <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000,0_0_2px_#000]">{s.n}</span>}
            {(s.of || (s.water !== undefined && !(s.item in WATER.buckets))) && (
              <span className={`absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums [text-shadow:0_1px_2px_#000,0_0_2px_#000] ${s.of ? "text-[#f3e3c3]" : "text-[#8fd0ff]"}`}>{s.of ? s.of.left : s.water}</span>
            )}
            {hand === s.item && <span className="absolute left-0.5 top-0.5 rounded-full bg-gold px-1 font-data text-[9px] font-semibold uppercase leading-4 text-bg">{th ? "ถือ" : "held"}</span>}
            <ItemCard id={s.item} n={s.n} th={th} at={((i % 5) + 0.5) / 5} holds={holdsOf(s, th)} />
          </>
        );
        return (
          <li key={i} className="relative hover:z-20 focus-within:z-20">
            {onPick
              ? <button type="button" onClick={() => onPick(i)} aria-pressed={picked === i} aria-label={`${name} ×${s.n}`} className={`group pressable ${look}`}>{inside}</button>
              : <span tabIndex={0} aria-label={`${name} ×${s.n}`} className={`group ${look}`}>{inside}</span>}
          </li>
        );
      })}
    </ul>
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
function Pic({ sprite, box }: { sprite: Sprite | null; box: number }) {
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
