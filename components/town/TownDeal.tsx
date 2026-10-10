"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEAL, sideOf, type Give } from "@/lib/town/deal";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { FishSfx } from "@/lib/town/sfx";
import { held } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import TownIcon from "./TownIcon";
import TownFoot from "./TownFoot";
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
  // Show the proposed amount while it is saved; wait for that answer before another change or agreement.
  const [laid, setLaid] = useState<{ give: Give; coins: number } | null>(null);
  const [chosen, setChosen] = useState<{ id: ItemId; value: string } | null>(null);
  const laying = useRef(0);
  const saving = useRef(false);
  useEffect(() => {
    ++laying.current;
    saving.current = false;
    setLaid(null);
    setChosen(null);
  }, [side, deal?.a, deal?.b, deal?.at]);
  const mine: Give = side ? laid?.give ?? deal!.give[side] : [], theirs: Give = side ? deal!.give[other] : [];
  const count = (id: ItemId) => mine.find(([t]) => t === id)?.[1] ?? 0;
  const coins = side ? laid?.coins ?? deal!.coins?.[side] ?? 0 : 0, theirCoins = side ? deal!.coins?.[other] ?? 0 : 0;
  const lay = (give: Give, pay = coins) => {
    if (saving.current || !side) return;
    saving.current = true;
    const turn = ++laying.current;
    setLaid({ give, coins: pay });
    void keeper.dealLay(give, pay).then((did) => {
      if (turn === laying.current) { saving.current = false; setLaid(null); }
      if (!did.ok) say(did.why);
    }).catch(() => {
      if (turn === laying.current) { saving.current = false; setLaid(null); say("away"); }
    });
  };
  /** So many coins more (or fewer) beside my things: never more than I have, never fewer than none. */
  const pay = (by: number) => lay(mine, Math.max(0, Math.min(purse.coins, coins + by)));
  const amount = (id: ItemId, want: number) => {
    if (saving.current || !Number.isSafeInteger(want)) return;
    const n = Math.max(0, Math.min(held(purse.bag, id), want));
    if (n > 0 && !count(id) && mine.length >= DEAL.kinds) { say("amount"); return; }
    setChosen({ id, value: String(n) });
    if (n === count(id)) return;
    lay(count(id) ? mine.flatMap(([t, old]): Give => t !== id ? [[t, old]] : n > 0 ? [[id, n]] : []) : n > 0 ? [...mine, [id, n]] : mine);
  };
  const pending = laid !== null;
  const chosenCount = chosen ? count(chosen.id) : 0;
  const chosenMax = chosen ? held(purse.bag, chosen.id) : 0;
  const chosenNumber = chosen && /^\d+$/.test(chosen.value) ? Number(chosen.value) : NaN;
  const validAmount = Number.isSafeInteger(chosenNumber) && chosenNumber >= 0 && chosenNumber <= chosenMax;
  const editing = chosen !== null && (!validAmount || chosenNumber !== chosenCount);
  const agree = () => {
    if (saving.current || editing) return;
    void keeper.dealAgree(!deal!.ok[side!]).then((did) => { if (!did.ok) say(did.why); });
  };

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
              <button type="button" disabled={pending} onClick={() => pay(-paid)} aria-label={`${paid} coin`}
                      className="pressable flex min-h-9 items-center rounded-full border border-gold/60 bg-gold/10 px-2.5 hover:border-chili"><Coins n={paid} th={th} small /></button>
            ) : (
              <span aria-label={`${paid} coin`} className="flex min-h-9 items-center rounded-full border border-gold/60 bg-gold/10 px-2.5"><Coins n={paid} th={th} small /></span>
            )}
          </li>
        )}
        {give.map(([id, n]) => (
          <li key={id}>
            {own ? (
              <button type="button" disabled={pending} onClick={() => setChosen({ id, value: String(n) })} aria-label={`${th ? "แก้จำนวน" : "Edit amount of"} ${label(id)} ×${n}`} title={label(id)}
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
    <TownFoot rank={side && deal ? "board" : "note"} wide>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {side && deal && (
        <section aria-label={th ? "แลกของ" : "A deal"} className="pop-in pointer-events-auto max-h-[80dvh] w-full max-w-[30rem] overflow-y-auto rounded-2xl border border-line-lit bg-surface/97 px-4 pb-3 pt-3 shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
          <div className="flex items-center gap-2">
            <TownIcon name="handshake" size={24} />
            <h2 className="min-w-0 truncate font-display text-title font-semibold text-ink">{deal.names[other]}</h2>
            <button type="button" onClick={() => { void keeper.dealCancel(); }} className="pressable -mr-1 ml-auto rounded-full px-3 py-1.5 text-meta text-muted hover:text-ink">{th ? "ยกเลิก" : "Call it off"}</button>
          </div>
          <div className="mt-2 flex gap-2">
            {Side({ title: th ? "ของฉัน" : "Mine", give: mine, word: !pending && deal.ok[side], own: true, paid: coins })}
            {Side({ title: deal.names[other], give: theirs, word: !pending && deal.ok[other], own: false, paid: theirCoins })}
          </div>
          {/* my coins: so many more laid beside my things at a tap */}
          <div className="mt-2 flex items-center gap-1.5" aria-label={th ? "Popoto coin ของฉัน" : "My Popoto coins"}>
            <Coins n={purse.coins - coins} th={th} small />
            <span className="ml-auto flex gap-1">
              {[1, 10, 50].map((n) => (
                <button key={n} type="button" disabled={pending || coins + n > purse.coins} onClick={() => pay(n)} aria-label={`+${n} coin`}
                        className="pressable min-h-9 rounded-full border border-line-strong px-3 font-data text-meta tabular-nums text-ink hover:border-gold disabled:opacity-35">+{n}</button>
              ))}
              <button type="button" disabled={pending || !coins} onClick={() => pay(-1)} aria-label="-1 coin"
                      className="pressable min-h-9 rounded-full border border-line-strong px-3 font-data text-meta tabular-nums text-ink hover:border-chili disabled:opacity-35">−1</button>
            </span>
          </div>
          <p className="mt-2 text-meta text-muted">{th ? "กดของเพื่อเพิ่ม 1 ชิ้น แล้วเลือกจำนวนได้ด้านล่าง" : "Tap an item to add one, then choose its amount below"}</p>
          {/* A tap still adds one; the selected kind also gets bulk controls. */}
          <ul className="mt-2 grid max-h-[7.5rem] grid-cols-6 gap-1.5 overflow-y-auto pr-0.5" aria-label={th ? "ของในกระเป๋า" : "In the bag"}>
            {stuff.map((id) => {
              const left = held(purse.bag, id) - count(id);
              return (
                <li key={id}>
                  <button type="button" disabled={pending || (left > 0 && !count(id) && mine.length >= DEAL.kinds)} onClick={() => amount(id, count(id) + (left > 0 ? 1 : 0))} aria-label={`${label(id)} ×${left}`} aria-pressed={chosen?.id === id} title={label(id)}
                          className={`pressable relative grid aspect-square w-full place-items-center rounded-xl border-2 ${chosen?.id === id ? "border-gold" : "border-[#6b4a2a]"} bg-[#33251a] disabled:opacity-35`}>
                    <ItemIcon id={id} size={30} />
                    <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000]">{left}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {chosen && (
            <form className="mt-2 rounded-xl border border-line-strong bg-bg/40 p-2" onSubmit={(event) => { event.preventDefault(); if (validAmount) amount(chosen.id, chosenNumber); }}>
              <div className="flex items-center gap-2 text-ui text-ink">
                <ItemIcon id={chosen.id} size={22} />
                <span className="min-w-0 flex-1 truncate">{label(chosen.id)}</span>
                <span className="shrink-0 font-data text-meta tabular-nums text-muted">{th ? "มี" : "Have"} {chosenMax}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="town-deal-amount" className="text-meta text-muted">{th ? "จำนวนที่เสนอ" : "Offer amount"}</label>
                <input id="town-deal-amount" type="number" inputMode="numeric" min={0} max={chosenMax} step={1} value={chosen.value} disabled={pending}
                       onChange={(event) => setChosen({ id: chosen.id, value: event.target.value })} aria-invalid={!validAmount}
                       className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-bg px-2 font-data text-ui tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-gold" />
                <button type="submit" disabled={pending || !validAmount || !editing} className="pressable min-h-10 shrink-0 rounded-lg bg-accent px-3 text-meta font-semibold text-bg disabled:opacity-35">{th ? "ใช้จำนวน" : "Apply"}</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[-1, 1, 10, 100].map((by) => (
                  <button key={by} type="button" disabled={pending || (by < 0 ? chosenCount === 0 : chosenCount >= chosenMax)} onClick={() => amount(chosen.id, chosenCount + by)}
                          aria-label={`${by > 0 ? "+" : ""}${by} ${label(chosen.id)}`}
                          className="pressable min-h-10 rounded-lg border border-line-strong px-2.5 font-data text-meta tabular-nums text-ink hover:border-gold disabled:opacity-35">{by > 0 ? `+${by}` : "−1"}</button>
                ))}
                <button type="button" disabled={pending || chosenCount >= chosenMax} onClick={() => amount(chosen.id, chosenMax)} className="pressable min-h-10 rounded-lg border border-line-strong px-2.5 text-meta text-ink hover:border-gold disabled:opacity-35">{th ? "ทั้งหมด" : "All"}</button>
                <button type="button" disabled={pending || chosenCount === 0} onClick={() => amount(chosen.id, 0)} className="pressable min-h-10 rounded-lg border border-line-strong px-2.5 text-meta text-muted hover:border-chili disabled:opacity-35">{th ? "เอาออก" : "Remove"}</button>
              </div>
              {editing && <p className="mt-1 text-meta text-muted">{validAmount ? (th ? "กดใช้จำนวนก่อนตกลงแลก" : "Apply this amount before agreeing") : (th ? `กรอกจำนวนเต็มตั้งแต่ 0 ถึง ${chosenMax}` : `Enter a whole number from 0 to ${chosenMax}`)}</p>}
            </form>
          )}
          <button type="button" disabled={pending || editing} onClick={agree} aria-pressed={!pending && deal.ok[side]}
                  className={`pressable mt-2 min-h-12 w-full rounded-2xl text-read font-semibold disabled:opacity-35 ${!pending && deal.ok[side] ? "border border-jade bg-jade/15 text-jade" : "bg-accent text-bg"}`}>
            {pending ? (th ? "กำลังบันทึก…" : "Saving…") : deal.ok[side] ? (th ? "รออีกฝ่าย…" : "Waiting for the other…") : (th ? "ตกลงแลก" : "Agree")}
          </button>
        </section>
      )}
    </TownFoot>
  );
}
