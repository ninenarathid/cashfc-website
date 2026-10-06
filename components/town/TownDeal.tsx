"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEAL, sideOf, type Give } from "@/lib/town/deal";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { FishSfx } from "@/lib/town/sfx";
import { held } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import TownIcon from "./TownIcon";
import { Coins, ItemIcon, WHY } from "./TownTrade";

/** Open a deal with somebody: their id in the town, and what they are called. */
export type OpenDeal = (id: string, name: string) => void;

/**
 * A deal between two members (the owner, 2026-10-03: "ช่วยทำระบบ เทรด แลกเปลี่ยน item
 * สำหรับผู้เล่นด้วยกันเองด้วย"). The rules are lib/town/deal's: each lays out things
 * from their own bag, either changing their side takes back both words, and
 * when both have given their word everything changes hands at once. Coins
 * may be laid beside the things (the owner, 2026-10-03: "อย่าลืมทำระบบเทรด item
 * หรือ popoto coin ให้ด้วย"), so a thing can be bought and sold too.
 *
 * Opened from somebody's card on the map. What is kept is the keeper's
 * (lib/town/keeper): for a member the database's, where the swap is done in
 * one go; in `next dev`'s test room the browser's trial, where a deal is
 * between two testers of one browser, each in a tab.
 */
export default function TownDeal({ me, keeper, name, th, sfx, bottom, register }: {
  me: string;
  keeper: Keeper;
  /** What I am called. */
  name: string;
  th: boolean;
  sfx: FishSfx | null;
  bottom: string;
  /** Hand the map the way to open a deal (and take it back with null). */
  register: (open: OpenDeal | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 2000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  // Somebody may open a deal with me at any moment: kept in sight while I am in town (the room says when to look).
  useEffect(() => keeper.look("deal"), [keeper]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); }, [note]);
  const say = useCallback((why: string) => { const w = WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  useEffect(() => {
    register((id, other) => { void keeper.dealOpen(id, name, other).then((did) => { if (!did.ok) say(did.why); }); });
    return () => register(null);
  }, [register, keeper, name, say]);

  const deal = keeper.deal(), purse = keeper.purse();
  // an ended deal is said once, to both sides
  const said = useRef(0);
  useEffect(() => {
    if (!deal?.end || said.current === deal.at) return;
    said.current = deal.at;
    setNote(deal.end === "done" ? (th ? "แลกของเรียบร้อย" : "The deal is done") : (th ? "ยกเลิกการแลกแล้ว" : "The deal is off"));
    if (deal.end === "done") { sfx?.wake(); sfx?.play("landed", "common", 0.7); }
  }, [deal?.end, deal?.at, th, sfx]);

  const side = deal && !deal.end ? sideOf(deal, me) : null, other = side === "a" ? "b" : "a";
  // What I have laid out is shown as of my last tap, until the keeper has answered them all: taps that come quicker
  // than answers are each counted.
  const [laid, setLaid] = useState<{ give: Give; coins: number } | null>(null);
  const laying = useRef(0);
  useEffect(() => { if (!side) setLaid(null); }, [side]);
  const mine: Give = side ? laid?.give ?? deal!.give[side] : [], theirs: Give = side ? deal!.give[other] : [];
  const count = (id: ItemId) => mine.find(([t]) => t === id)?.[1] ?? 0;
  const coins = side ? laid?.coins ?? deal!.coins?.[side] ?? 0 : 0, theirCoins = side ? deal!.coins?.[other] ?? 0 : 0;
  const lay = (give: Give, pay = coins) => {
    const turn = ++laying.current;
    setLaid({ give, coins: pay });
    void keeper.dealLay(give, pay).then((did) => {
      if (turn === laying.current) setLaid(null);
      if (!did.ok) say(did.why);
    });
  };
  /** So many coins more (or fewer) beside my things: never more than I have, never fewer than none. */
  const pay = (by: number) => lay(mine, Math.max(0, Math.min(purse.coins, coins + by)));
  const add = (id: ItemId) => {
    if (count(id) >= held(purse.bag, id) || (!count(id) && mine.length >= DEAL.kinds)) return;
    lay(count(id) ? mine.map(([t, n]): [ItemId, number] => (t === id ? [t, n + 1] : [t, n])) : [...mine, [id, 1]]);
  };
  const drop = (id: ItemId) => lay(mine.flatMap(([t, n]): Give => (t !== id ? [[t, n]] : n > 1 ? [[t, n - 1]] : [])));
  const agree = () => { void keeper.dealAgree(!deal!.ok[side!]).then((did) => { if (!did.ok) say(did.why); }); };

  // (for scripts in `next dev`)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { deal: () => keeper.deal(), open: (id: string, other: string) => keeper.dealOpen(id, name, other), lay: (g: Give, c = 0) => keeper.dealLay(g, c), agree: (w = true) => keeper.dealAgree(w), cancel: () => keeper.dealCancel() };
    (window as unknown as { __townDeal?: typeof handle }).__townDeal = handle;
    return () => { delete (window as unknown as { __townDeal?: typeof handle }).__townDeal; };
  }, [keeper, name]);

  if (!side && !note) return null;
  const label = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const stuff = side ? purse.bag.flatMap((s) => (s ? [s.item] : [])).filter((id, i, all) => all.indexOf(id) === i) : [];
  const Side = ({ title, give, word, own, paid }: { title: string; give: Give; word: boolean; own: boolean; paid: number }) => (
    <div className={`min-w-0 flex-1 rounded-xl border px-2 py-1.5 ${word ? "border-jade bg-jade/10" : "border-dashed border-line-strong bg-bg/40"}`}>
      <p className="mb-1 flex items-center gap-1 truncate font-data text-label uppercase tracking-wider text-muted">
        <span className="min-w-0 truncate">{title}</span>
        {word && <span className="ml-auto shrink-0 rounded-full bg-jade px-1.5 text-[10px] font-semibold text-bg">{th ? "ตกลง" : "OK"}</span>}
      </p>
      <ul className="flex min-h-10 flex-wrap items-center gap-1.5">
        {/* the coins laid beside the things (mine: a tap takes them all back) */}
        {paid > 0 && (
          <li>
            {own ? (
              <button type="button" onClick={() => pay(-paid)} aria-label={`${paid} coin`}
                      className="pressable flex min-h-9 items-center rounded-full border border-gold/60 bg-gold/10 px-2.5 hover:border-chili"><Coins n={paid} th={th} small /></button>
            ) : (
              <span aria-label={`${paid} coin`} className="flex min-h-9 items-center rounded-full border border-gold/60 bg-gold/10 px-2.5"><Coins n={paid} th={th} small /></span>
            )}
          </li>
        )}
        {give.map(([id, n]) => (
          <li key={id}>
            {own ? (
              <button type="button" onClick={() => drop(id)} aria-label={`${label(id)} ×${n}`} title={label(id)}
                      className="pressable flex min-h-9 items-center gap-1 rounded-full border border-line-strong bg-card/70 pl-1.5 pr-2.5 text-ui text-ink hover:border-chili">
                <ItemIcon id={id} size={22} /><span className="font-data tabular-nums">×{n}</span>
              </button>
            ) : (
              <span aria-label={`${label(id)} ×${n}`} title={label(id)} className="flex min-h-9 items-center gap-1 rounded-full border border-line-strong bg-card/70 pl-1.5 pr-2.5 text-ui text-ink">
                <ItemIcon id={id} size={22} /><span className="font-data tabular-nums">×{n}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {side && deal && (
        <section aria-label={th ? "แลกของ" : "A deal"} className="pop-in pointer-events-auto w-full max-w-[30rem] rounded-2xl border border-line-lit bg-surface/97 px-4 pb-3 pt-3 shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
          <div className="flex items-center gap-2">
            <TownIcon name="handshake" size={24} />
            <h2 className="min-w-0 truncate font-display text-title font-semibold text-ink">{deal.names[other]}</h2>
            <button type="button" onClick={() => { void keeper.dealCancel(); }} className="pressable -mr-1 ml-auto rounded-full px-3 py-1.5 text-meta text-muted hover:text-ink">{th ? "ยกเลิก" : "Call it off"}</button>
          </div>
          <div className="mt-2 flex gap-2">
            {Side({ title: th ? "ของฉัน" : "Mine", give: mine, word: deal.ok[side], own: true, paid: coins })}
            {Side({ title: deal.names[other], give: theirs, word: deal.ok[other], own: false, paid: theirCoins })}
          </div>
          {/* my coins: so many more laid beside my things at a tap */}
          <div className="mt-2 flex items-center gap-1.5" aria-label={th ? "Popoto coin ของฉัน" : "My Popoto coins"}>
            <Coins n={purse.coins - coins} th={th} small />
            <span className="ml-auto flex gap-1">
              {[1, 10, 50].map((n) => (
                <button key={n} type="button" disabled={coins + n > purse.coins} onClick={() => pay(n)} aria-label={`+${n} coin`}
                        className="pressable min-h-9 rounded-full border border-line-strong px-3 font-data text-meta tabular-nums text-ink hover:border-gold disabled:opacity-35">+{n}</button>
              ))}
              <button type="button" disabled={!coins} onClick={() => pay(-1)} aria-label="-1 coin"
                      className="pressable min-h-9 rounded-full border border-line-strong px-3 font-data text-meta tabular-nums text-ink hover:border-chili disabled:opacity-35">−1</button>
            </span>
          </div>
          {/* my bag: a tap lays one out */}
          <ul className="mt-2 grid max-h-[7.5rem] grid-cols-6 gap-1.5 overflow-y-auto pr-0.5" aria-label={th ? "ของในกระเป๋า" : "In the bag"}>
            {stuff.map((id) => {
              const left = held(purse.bag, id) - count(id);
              return (
                <li key={id}>
                  <button type="button" disabled={left < 1} onClick={() => add(id)} aria-label={`${label(id)} ×${left}`} title={label(id)}
                          className="pressable relative grid aspect-square w-full place-items-center rounded-xl border-2 border-[#6b4a2a] bg-[#33251a] disabled:opacity-35">
                    <ItemIcon id={id} size={30} />
                    <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000]">{left}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={agree} aria-pressed={deal.ok[side]}
                  className={`pressable mt-2 min-h-12 w-full rounded-2xl text-read font-semibold ${deal.ok[side] ? "border border-jade bg-jade/15 text-jade" : "bg-accent text-bg"}`}>
            {deal.ok[side] ? (th ? "รออีกฝ่าย…" : "Waiting for the other…") : (th ? "ตกลงแลก" : "Agree")}
          </button>
        </section>
      )}
    </div>
  );
}
