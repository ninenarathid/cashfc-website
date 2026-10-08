"use client";

import { useState } from "react";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Did, Keeper } from "@/lib/town/keeper";
import type { PricesTold } from "@/lib/town/market";
import { NOTICES, afterFee, capOf, plain, type NoticeTold, type PinboardTold } from "@/lib/town/notices";
import { roomFor, type Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";
import TownNumber from "./TownNumber";

/**
 * The notice board beside the uncle's stall (lib/town/notices; the owner, 2026-10-05: "กระดานฝากขายระหว่างสมาชิก ทำได้
 * เลย"): what members have pinned up to sell, what they want, and my own notices, with what waits there for me.
 *
 * - **To sell** and **wanted** are two lists, the newest first. A notice says the thing, how many are left, the price
 *   each and who pinned it; mine are marked, and have nothing to press.
 * - **The two deeds are at its head**, always in sight: leave something to be sold, or ask for something (the
 *   owner, 2026-10-05: "เมื่อเข้าไปมีปุ่ม ฝากขาย กับฝากซื้อได้เลย ตอนนี้ยุ่งยากไป"). A thing to sell is picked from my bag,
 *   and begins at all I have of it; a thing wanted from what the village has met, and from nothing else: what the
 *   database tells (`seen`) is all this page ever names. With every place of mine taken, the way to one more is there.
 * - **Mine**: my notices, whatever has become of them (one past its days is off the board, and says so).
 * - **What the board keeps is said plainly** where a notice is written, like the bank's rate: coins are at stake.
 *
 * It asks its keeper for every deed and shows what the keeper was told; nothing is decided here.
 */

const WHY: Record<string, [th: string, en: string]> = {
  slots: ["ช่องประกาศของคุณเต็มแล้ว", "Every place you have on the board is taken"],
  dear: ["ตั้งราคาสูงเกินไป", "That price is more than the thing may be asked for"],
  own: ["ประกาศนี้เป็นของคุณเอง", "That notice is your own"],
  gone: ["ประกาศนี้ไม่อยู่แล้ว หรือเหลือไม่พอ", "That notice is gone, or has fewer left"],
  none: ["ไม่มีของชิ้นนั้นแล้ว", "That is not there any more"],
  coins: ["Popoto coin ไม่พอ", "Not enough Popoto coins"],
  full: ["กระเป๋าเต็ม", "Your bag is full"],
  nothing: ["ยังไม่มีเงินรอรับ", "No money is waiting yet"],
  amount: ["จำนวนไม่ถูกต้อง", "Not a number that can be"],
  away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town cannot be reached. Try again."],
};

function Coin({ n, small = false }: { n: number; small?: boolean }) {
  return <span className={`flex shrink-0 items-center gap-1 font-data tabular-nums text-gold ${small ? "text-meta" : "text-ui font-semibold"}`}><TownIcon name="coin" size={small ? 13 : 17} />{n}<span className="sr-only"> Popoto coin</span></span>;
}
const Pic = ({ id, size }: { id: ItemId; size: number }) => <TownIcon name={iconOf(id) as IconName} size={size} className="shrink-0" />;
/** How long a notice has left, in days and hours (or hours and minutes at the end). */
function leftOf(ms: number, th: boolean): string {
  if (ms <= 0) return th ? "หมดเวลาแล้ว" : "past its days";
  const m = Math.floor(ms / 60_000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? (th ? `เหลือ ${d} วัน ${h} ชม.` : `${d} d ${h} h left`) : h ? (th ? `เหลือ ${h} ชม. ${m % 60} นาที` : `${h} h ${m % 60} min left`) : (th ? `เหลือ ${m % 60} นาที` : `${m % 60} min left`);
}

type Tab = "sell" | "want" | "mine";
interface Draft { kind: "sell" | "want"; item: ItemId | null; n: number; price: number }

export default function TownNotices({ keeper, board, purse, prices, now, th, say }: {
  keeper: Keeper; board: PinboardTold; purse: Purse; prices: PricesTold; now: number; th: boolean;
  /** Say what came of a deed, in the panel's own line. */
  say: (th: string, en: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("sell");
  const [draft, setDraft] = useState<Draft | null>(null);
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  /** A deed's answer: thanks in its own words, or why not. */
  const tried = <T,>(doing: Promise<Did<T>>, thanks: (did: T) => [string, string], then?: () => void) => {
    void doing.then((did) => { if (did.ok) { say(...thanks(did)); then?.(); } else say(...(WHY[did.why] ?? WHY.none)); });
  };
  // (only what the page knows how to draw: the database can come to name a thing this page was built before)
  const known = (n: NoticeTold) => n.item in ITEMS;
  const selling = board.notices.filter((n) => n.kind === "sell" && known(n)), wanted = board.notices.filter((n) => n.kind === "want" && known(n)), mine = board.mine.filter(known);
  const TABS: Array<[Tab, string, string]> = [["sell", th ? "ขาย" : "For sale", String(selling.length)], ["want", th ? "รับซื้อ" : "Wanted", String(wanted.length)], ["mine", th ? "ของฉัน" : "Mine", `${mine.length}/${board.slots}`]];

  return (
    <div data-notices>
      {/* the two things to do here, first and always in sight (the owner, 2026-10-05: "เมื่อเข้าไปมีปุ่ม ฝากขาย กับฝากซื้อได้เลย"):
          a notice being written takes their place; with every place of mine taken, the way to one more does */}
      {draft ? (
        <div className="mb-3">
          <Writing draft={draft} board={board} purse={purse} prices={prices} th={th} onChange={setDraft} onCancel={() => setDraft(null)}
                   onPin={(d) => tried(keeper.noticePost(d.kind, d.item!, d.n, d.price), () => ["ปักประกาศแล้ว", "Pinned up."], () => { setDraft(null); setTab("mine"); })} />
        </div>
      ) : mine.length < board.slots ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDraft({ kind: "sell", item: null, n: 1, price: 1 })} data-notice-new="sell"
                  className="pressable flex min-h-14 flex-col items-center justify-center rounded-2xl bg-accent px-3 py-2 text-bg">
            <span className="text-lead font-semibold">{th ? "ฝากขาย" : "Sell"}</span>
            <span className="text-meta opacity-80">{th ? "ของในกระเป๋า" : "from your bag"}</span>
          </button>
          <button type="button" onClick={() => setDraft({ kind: "want", item: null, n: 1, price: 1 })} data-notice-new="want"
                  className="pressable flex min-h-14 flex-col items-center justify-center rounded-2xl border border-accent/70 bg-accent/10 px-3 py-2 text-ink hover:border-accent">
            <span className="text-lead font-semibold">{th ? "ฝากซื้อ" : "Ask for"}</span>
            <span className="text-meta text-muted">{th ? "ของที่อยากได้" : "something you want"}</span>
          </button>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-line bg-card/60 px-3 py-2.5">
          <p className="text-ui font-semibold text-ink">{th ? `ช่องประกาศเต็มแล้ว (${mine.length}/${board.slots})` : `Every place you have is taken (${mine.length}/${board.slots}).`}</p>
          {board.more !== null && (
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-meta text-muted">{th ? "เพิ่มอีก 1 ช่อง" : "One more place"}</p>
              <Coin n={board.more} small />
              <button type="button" disabled={purse.coins < board.more} onClick={() => tried(keeper.noticeSlot(), () => ["ได้ช่องประกาศเพิ่มแล้ว", "One more place is yours."])} data-notice-slot
                      className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent disabled:opacity-40">
                {th ? "ซื้อช่อง" : "Buy"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* what waits here for me, when something does */}
      {board.due > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-gold/60 bg-gold/10 px-3 py-2.5" data-notice-due>
          <p className="min-w-0 flex-1 text-ui font-semibold text-ink">{th ? "เงินรอรับที่กระดาน" : "Waiting at the board"}</p>
          <Coin n={board.due} />
          <button type="button" onClick={() => tried(keeper.noticeCollect(), (d) => [`รับเงิน ${d.coins} coin แล้ว`, `${d.coins} coins collected.`])}
                  className="pressable min-h-11 rounded-full bg-gold px-4 text-ui font-semibold text-bg">
            {th ? "รับเงิน" : "Collect"}
          </button>
        </div>
      )}

      <div role="tablist" aria-label={th ? "กระดานประกาศ" : "The notice board"} className="mb-2 flex gap-1.5">
        {TABS.map(([v, label, count]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} data-notices-tab={v}
                  className={`pressable min-h-9 rounded-full border px-3 text-ui font-semibold ${tab === v ? "border-accent bg-accent/15 text-accent" : "border-line-strong text-muted hover:text-ink"}`}>
            {label} <span className="font-data font-normal tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      {tab === "sell" && (selling.length ? (
        <ul className="flex flex-col gap-1.5">
          {selling.map((n) => {
            const can = Math.min(n.left, Math.floor(purse.coins / n.price), roomFor(purse.bag, n.item));
            return (
              <li key={n.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2" data-notice={n.id}>
                <Pic id={n.item} size={30} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold text-ink">{name(n.item)} <span className="font-data text-muted">×{n.left}</span></span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-meta text-muted">{th ? "ชิ้นละ" : "Each"} <Coin n={n.price} small /><span className="truncate">· {n.mine ? (th ? "ของฉัน" : "mine") : n.by}</span></span>
                </div>
                {!n.mine && (
                  <div className="flex shrink-0 gap-1">
                    {can > 1 && (
                      <button type="button" onClick={() => tried(keeper.noticeBuy(n.id, can), (d) => [`ซื้อ ${name(d.item)} ${can} ชิ้น จ่าย ${d.coins} coin`, `Bought ${can} for ${d.coins} coins.`])}
                              className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
                        {th ? `ซื้อ ${can}` : `Buy ${can}`}
                      </button>
                    )}
                    <button type="button" disabled={can < 1} onClick={() => tried(keeper.noticeBuy(n.id, 1), (d) => [`ซื้อ ${name(d.item)} 1 ชิ้น จ่าย ${d.coins} coin`, `Bought one for ${d.coins} coins.`])}
                            className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                      {th ? "ซื้อ 1" : "Buy 1"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-meta text-muted">{th ? "ยังไม่มีใครปักประกาศขาย" : "Nobody has pinned anything up to sell."}</p>)}

      {tab === "want" && (wanted.length ? (
        <ul className="flex flex-col gap-1.5">
          {wanted.map((n) => {
            const can = Math.min(n.left, plain(purse.bag, n.item));
            return (
              <li key={n.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2" data-notice={n.id}>
                <Pic id={n.item} size={30} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold text-ink">{name(n.item)} <span className="font-data text-muted">{th ? `ต้องการ ${n.left}` : `${n.left} wanted`}</span></span>
                  <span className="flex flex-wrap items-center gap-x-1.5 text-meta text-muted">{th ? "ให้ชิ้นละ" : "Pays"} <Coin n={n.price} small /><span className="truncate">· {n.mine ? (th ? "ของฉัน" : "mine") : n.by}</span></span>
                </div>
                {!n.mine && (
                  <div className="flex shrink-0 gap-1">
                    {can > 1 && (
                      <button type="button" onClick={() => tried(keeper.noticeFill(n.id, can), (d) => [`ส่ง ${name(d.item)} ${can} ชิ้นแล้ว เงินรอรับที่กระดาน`, `Brought ${can}. The money waits at the board.`])}
                              className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">
                        {th ? `ส่ง ${can}` : `Bring ${can}`}
                      </button>
                    )}
                    <button type="button" disabled={can < 1} onClick={() => tried(keeper.noticeFill(n.id, 1), (d) => [`ส่ง ${name(d.item)} 1 ชิ้นแล้ว เงินรอรับที่กระดาน`, "Brought one. The money waits at the board."])}
                            className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
                      {th ? "ส่ง 1" : "Bring 1"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-meta text-muted">{th ? "ยังไม่มีใครปักประกาศรับซื้อ" : "Nobody has pinned up anything wanted."}</p>)}

      {tab === "mine" && (
        <>
          {mine.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {mine.map((n) => (
                <li key={n.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card/60 px-2.5 py-2" data-notice={n.id} data-notice-mine>
                  <Pic id={n.item} size={28} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-ui font-semibold text-ink">{name(n.item)} <span className="font-data text-muted">{n.kind === "sell" ? `×${n.left}` : (th ? `ต้องการอีก ${n.left}` : `${n.left} more wanted`)}</span></span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-meta text-muted">
                      {n.kind === "sell" ? (th ? "ขายชิ้นละ" : "Each") : (th ? "ให้ชิ้นละ" : "Pays")} <Coin n={n.price} small />
                      <span className={now >= n.until ? "text-copper" : ""}>· {leftOf(n.until - now, th)}</span>
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {n.held > 0 && (
                      <button type="button" onClick={() => tried(keeper.noticeFetch(n.id), (d) => [`รับ ${name(d.item)} ${d.got} ชิ้นแล้ว`, `Took ${d.got}.`])}
                              className="pressable min-h-11 rounded-full bg-accent px-3 text-ui font-semibold text-bg">
                        {th ? `รับของ ${n.held}` : `Take ${n.held}`}
                      </button>
                    )}
                    <button type="button" onClick={() => tried(keeper.noticeDown(n.id), () => ["เอาประกาศลงแล้ว", "Taken down."])}
                            className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-chili">
                      {th ? "เอาลง" : "Take down"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {mine.length === 0 && <p className="text-meta text-muted">{th ? "ยังไม่มีประกาศของฉัน" : "You have no notice up."}</p>}
        </>
      )}
    </div>
  );
}

/** A new notice being written: the thing, how many, the price each; and, before it is pinned, what it comes to. */
function Writing({ draft, board, purse, prices, th, onChange, onCancel, onPin }: {
  draft: Draft; board: PinboardTold; purse: Purse; prices: PricesTold; th: boolean;
  onChange: (d: Draft) => void; onCancel: () => void; onPin: (d: Draft) => void;
}) {
  const [find, setFind] = useState("");
  const sell = draft.kind === "sell", item = draft.item;
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  // what can be chosen: to sell, the plain things in my bag; wanted, what the village has met (and this page can draw)
  const mine = [...new Set(purse.bag.flatMap((s) => (s && plain(purse.bag, s.item) > 0 ? [s.item] : [])))];
  const q = find.trim().toLowerCase();
  const met = board.seen.filter((id): id is ItemId => id in ITEMS).filter((id) => !q || ITEMS[id].name.th.toLowerCase().includes(q) || ITEMS[id].name.en.toLowerCase().includes(q));
  const cap = item ? capOf(item, { ...NOTICES, cap: board.cap, capless: board.capless }) : 1;
  const most = item ? (sell ? Math.min(board.most, plain(purse.bag, item)) : board.most) : 1;
  const total = draft.n * draft.price, short = !sell && purse.coins < total;
  // what is known of its price: what the relatives give for one this round (or usually), and what it fetched on the board lately
  const told = item ? prices.things[item] : undefined, pays = item ? ITEMS[item].pays : 0, uncle = item && pays > 0 ? Math.round(pays * (told?.f ?? 100)) / 100 : null;
  const days = item ? board.sales[item] ?? [] : [], soldN = days.reduce((t, d) => t + d[1], 0), soldCoins = days.reduce((t, d) => t + d[2], 0);
  const pick = (id: ItemId) => {
    const c = capOf(id, { ...NOTICES, cap: board.cap, capless: board.capless }), usual = ITEMS[id].pays || 1;
    onChange({ ...draft, item: id, n: sell ? Math.max(1, Math.min(board.most, plain(purse.bag, id))) : 1, price: Math.max(1, Math.min(c, usual)) });
  };

  return (
    <div className="rounded-xl border border-accent/50 bg-card/60 px-3 py-3" data-notice-writing={draft.kind}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-ui font-semibold text-ink">{sell ? (th ? "ฝากขาย" : "Sell") : (th ? "ฝากซื้อ" : "Ask for")}{!item && <span className="ml-2 text-meta font-normal text-muted">{sell ? (th ? "เลือกของจากกระเป๋า" : "pick from your bag") : (th ? "เลือกของที่อยากได้" : "pick what you want")}</span>}</h3>
        <button type="button" onClick={onCancel} className="pressable min-h-9 rounded-full border border-line-strong px-3 text-meta text-ink hover:border-accent">{th ? "ยกเลิก" : "Cancel"}</button>
      </div>

      {!item ? (
        sell ? (
          mine.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {mine.map((id) => (
                <li key={id}><button type="button" onClick={() => pick(id)} data-notice-pick={id}
                                     className="pressable flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong px-2.5 text-ui text-ink hover:border-accent">
                  <Pic id={id} size={22} />{name(id)} <span className="font-data text-muted">×{plain(purse.bag, id)}</span></button></li>
              ))}
            </ul>
          ) : <p className="text-meta text-muted">{th ? "กระเป๋ายังว่างอยู่" : "Your bag is empty."}</p>
        ) : (
          <>
            <label className="mb-2 block">
              <span className="sr-only">{th ? "ค้นหาของ" : "Find a thing"}</span>
              <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={th ? "ค้นหาของ…" : "Find a thing…"}
                     className="min-h-11 w-full rounded-xl border border-line-strong bg-bg/60 px-3 text-ui text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
            </label>
            {met.length ? (
              <ul className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto overscroll-contain">
                {met.slice(0, 60).map((id) => (
                  <li key={id}><button type="button" onClick={() => pick(id)} data-notice-pick={id}
                                       className="pressable flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong px-2.5 text-ui text-ink hover:border-accent">
                    <Pic id={id} size={22} />{name(id)}</button></li>
                ))}
              </ul>
            ) : <p className="text-meta text-muted">{th ? "ไม่พบของชื่อนี้" : "Nothing by that name."}</p>}
          </>
        )
      ) : (
        <>
          <button type="button" onClick={() => onChange({ ...draft, item: null })} className="pressable mb-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-line-strong px-2.5 text-left hover:border-accent">
            <Pic id={item} size={26} />
            <span className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">{name(item)}{sell && <span className="font-data font-normal text-muted"> ×{plain(purse.bag, item)}</span>}</span>
            <span className="text-meta text-muted">{th ? "เปลี่ยน" : "Change"}</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-meta text-muted">{th ? `จำนวน (ไม่เกิน ${most})` : `How many (${most} at the most)`}</span>
              <TownNumber max={most} value={draft.n} onChange={(n) => onChange({ ...draft, n })} data-notice-n
                     className="min-h-11 w-full rounded-xl border border-line-strong bg-bg/60 px-3 font-data text-ui tabular-nums text-ink focus:border-accent focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-meta text-muted">{th ? `ราคาชิ้นละ (ไม่เกิน ${cap})` : `Price each (${cap} at the most)`}</span>
              <TownNumber max={cap} value={draft.price} onChange={(price) => onChange({ ...draft, price })} data-notice-price
                     className="min-h-11 w-full rounded-xl border border-line-strong bg-bg/60 px-3 font-data text-ui tabular-nums text-ink focus:border-accent focus:outline-none" />
            </label>
          </div>
          {(uncle !== null || soldN > 0) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-muted" data-notice-known>
              {uncle !== null && <span className="flex items-center gap-1">{th ? "ญาติลุงให้ชิ้นละ" : "The relatives give"} <Coin n={uncle} small /></span>}
              {soldN > 0 && <span className="flex items-center gap-1">{th ? `บนกระดาน ${board.sales[item]!.length} วันล่าสุด ${soldN} ชิ้น เฉลี่ย` : `On the board lately: ${soldN}, on average`} <Coin n={Math.round((soldCoins / soldN) * 10) / 10} small /></span>}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-line pt-2 text-meta text-muted" data-notice-sum>
            {sell ? (
              <>{th ? "ขายหมดได้" : "Sold out, you get"} <Coin n={afterFee(total, board.fee)} small /> <span>{th ? `(กระดานหัก ${board.fee}%)` : `(the board keeps ${board.fee}%)`}</span></>
            ) : (
              <>{th ? "วางเงินไว้ที่กระดาน" : "Put down at the board"} <Coin n={total} small /> <span>{th ? `(ผู้ขายได้ ${100 - board.fee}%)` : `(whoever brings it gets ${100 - board.fee}%)`}</span></>
            )}
            <span>· {th ? `ประกาศอยู่ ${Math.round(board.hours / 24)} วัน` : `up for ${Math.round(board.hours / 24)} days`}</span>
          </p>
          <button type="button" disabled={short} onClick={() => onPin(draft)} data-notice-pin
                  className="pressable mt-2 min-h-11 w-full rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
            {short ? (th ? "Popoto coin ไม่พอ" : "Not enough Popoto coins") : sell ? (th ? "ฝากขายเลย" : "Pin it up to sell") : (th ? "ฝากซื้อเลย" : "Pin it up")}
          </button>
        </>
      )}
    </div>
  );
}
