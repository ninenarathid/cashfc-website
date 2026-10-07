"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { letters } from "@/lib/town/chat";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { plain } from "@/lib/town/notices";
import type { TownSession } from "@/lib/town/session";
import type { FishSfx } from "@/lib/town/sfx";
import { capOf, type ShopAsk, type ShopLine, type ShopLineTold } from "@/lib/town/shop";
import { SIGN, decodeSign, tidyTitle, type Sign } from "@/lib/town/sign";
import { plainStack, roomFor } from "@/lib/town/trade";
import SignIcon from "./SignIcon";
import TownIcon from "./TownIcon";
import { Coins, ItemIcon, WHY } from "./TownTrade";

/** Which of the sign's panels is open: holding one up, my own, or somebody's stall. */
export type SignView = "setup" | "mine" | { who: string; name: string };

/** Why a sign was not held up or a sale not made, in a few words (what a bag refuses for is TownTrade's to word). */
const WHY_SIGN: Record<string, [th: string, en: string]> = {
  walking: ["หยุดเดินก่อนถึงจะชูป้ายได้", "Stand still to hold a sign up"],
  here: ["ตรงนี้ชูป้ายไม่ได้", "A sign cannot be held up here"],
  lines: ["เลือกของลงร้านก่อน (ของแต่ละอย่างลงได้ครั้งเดียว)", "Put something on the stall first (each thing once)"],
  dear: ["ตั้งราคาสูงเกินไป", "That price is too high"],
  own: ["ร้านของตัวเอง", "That is your own stall"],
  far: ["ต้องยืนใกล้ร้านกว่านี้", "Stand nearer the stall"],
  shut: ["ร้านปิดแล้ว", "The stall is shut"],
  short: ["เจ้าของร้านมีเหรียญไม่พอ", "Its keeper has not the coins"],
  packed: ["กระเป๋าเจ้าของร้านเต็ม", "Its keeper's bag is full"],
  gone: ["เหลือไม่ถึงจำนวนนั้นแล้ว", "There are not so many left"],
  none: ["ไม่มีของชิ้นนั้นในกระเป๋า", "That is not in the bag"],
};
const why = (w: string, th: boolean) => { const m = WHY_SIGN[w] ?? WHY[w as keyof typeof WHY] ?? WHY.none; return th ? m[0] : m[1]; };
const nameOf = (id: ItemId, th: boolean) => (id in ITEMS ? (th ? ITEMS[id].name.th : ITEMS[id].name.en) : id);
const whole = (v: string, most: number) => Math.max(1, Math.min(most, Math.floor(Number(v)) || 1));

/** The two marks a stall's sign carries, in the board's own colours (the map draws the same). */
export const SELL_INK = "#a8452a", BUY_INK = "#2f6f8f";

/**
 * A sign held up over one's head (lib/town/sign; the owner, 2026-10-06:
 * "ช่วยทำระบบตั้งห้องแชท บนหัวผู้เล่น … สามารถตั้งรับซื้อของ หรือ ขายของ", "ร้านเดียวทั้งขาย
 * และรับซื้อพร้อมกัน", "อยากให้เหมือนกำลังชูป้ายอยู่"): its panels.
 *
 * - **Holding one up** (from the emote window): a chat room, or a stall. A
 *   title; for a stall, its lines: things from my bag to sell, things wanted
 *   (only those the village has met, which is all the keeper ever names), each
 *   with how many and at what price. The board is shown as it will read.
 * - **My own**: what it is; of a stall, what is left on each line and what it
 *   has taken and paid; and taking it down.
 * - **Somebody's stall** (a tap on their sign, standing by them): what they
 *   sell and what they want, and buying or bringing so many.
 *
 * It is always there while I am in town, panel or no panel: it keeps my sign
 * and my stall the same thing (a stall whose sign is down is shut; a sign
 * whose stall is gone comes down; a stall with nothing left takes its sign
 * down), and says when something was sold.
 *
 * A stall is the keeper's (lib/town/shop): the database's for a member, in
 * \`next dev\`'s test room the browser's trial. A keeper that knows of no stalls
 * (the database before v142) leaves a sign to be a chat room only.
 */
export default function TownSign({ keeper, session, th, phone, tabbar, view, onView, where, sfx, hidden, bottom }: {
  keeper: Keeper | null;
  session: TownSession;
  th: boolean;
  phone: boolean;
  tabbar: boolean;
  view: SignView | null;
  onView: (v: SignView | null) => void;
  /** The tile I am on. */
  where: () => [number, number] | null;
  sfx: FishSfx | null;
  /** Something else is open over the map: no panel of the sign's is shown meanwhile. */
  hidden: boolean;
  /** How far up from the foot of the map a word about my stall sits. */
  bottom: string;
}) {
  useSyncExternalStore(session.subscribe, session.getVersion, () => 0);
  const [, setTick] = useState(0);
  useEffect(() => keeper?.watch(() => setTick((n) => n + 1)), [keeper]);
  const t = useCallback((a: string, b: string) => (th ? a : b), [th]);

  const sign = session.sign, shops = keeper?.shops() ?? null, purse = keeper?.purse() ?? null;
  const [kind, setKind] = useState<Sign["kind"]>("chat");
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<ShopAsk>([]);
  const [pick, setPick] = useState<"sell" | "buy" | null>(null);
  const [q, setQ] = useState("");
  const [said, setSaid] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const busy = useRef(false);

  // The stall and the sign are one thing: looked at every little while, and put right when they are not.
  const was = useRef<{ took: number; paid: number } | null>(null);
  useEffect(() => {
    if (!keeper) return;
    let off = 0;
    const id = setInterval(() => {
      const told = keeper.shops();
      if (busy.current || !told) { off = 0; return; }
      const mine = told.mine, held = session.sign?.kind === "shop";
      if (!!mine !== held) {
        // (twice running, so that the moment between the stall opening and the sign going up is not taken for it)
        if (++off < 2) return;
        off = 0;
        if (mine) void keeper.shopClose(); else session.lowerSign();
        return;
      }
      off = 0;
      if (!mine) { was.current = null; return; }
      const left = mine.lines.filter((l) => l.left > 0);
      if (!left.length) { session.lowerSign(); setToast(th ? "ของในร้านหมดแล้ว เก็บป้ายให้แล้ว" : "Your stall has nothing left: the sign is down"); return; }
      session.setShopSign(left.some((l) => l.kind === "sell"), left.some((l) => l.kind === "buy"));
    }, 2500);
    return () => clearInterval(id);
  }, [keeper, session, th]);
  // While my stall is open it is read again now and then, and at once when the room says somebody came to it.
  const open = !!shops?.mine;
  useEffect(() => (keeper && open ? keeper.look("shop") : undefined), [keeper, open]);
  // Something was sold or bought at my stall: said, wherever on the map I am looking.
  const took = shops?.mine?.took ?? null, paid = shops?.mine?.paid ?? null;
  useEffect(() => {
    if (took === null || paid === null) { was.current = null; return; }
    const before = was.current;
    was.current = { took, paid };
    if (!before) return;
    if (took > before.took) { sfx?.wake(); sfx?.work("pick"); setToast(th ? `ร้านของคุณขายได้ +${took - before.took} เหรียญ` : `Your stall sold: +${took - before.took} coins`); }
    else if (paid > before.paid) { sfx?.wake(); sfx?.work("pick"); setToast(th ? `ร้านของคุณรับซื้อของแล้ว −${paid - before.paid} เหรียญ` : `Your stall bought: −${paid - before.paid} coins`); }
  }, [took, paid, th, sfx]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 5000); return () => clearTimeout(id); }, [toast]);

  // Somebody's stall: read as it is opened and now and then; shut when I walk off, or their sign comes down.
  const who = view && typeof view === "object" ? view.who : null;
  useEffect(() => {
    if (!keeper || !who) return;
    // (read, and then drawn: a keeper that has it at hand tells nobody that it was looked at)
    const look = () => void keeper.shopVisit(who).then(() => setTick((n) => n + 1));
    look();
    const id = setInterval(look, 15_000);
    return () => { clearInterval(id); void keeper.shopVisit(null); };
  }, [keeper, who]);
  // (whoever looks at a stall stays by it: no tap on the map walks them off until its panel is closed)
  useEffect(() => { session.setBrowsing(!!who); return () => session.setBrowsing(false); }, [session, who]);
  const theirs = who ? session.avatars.get(who) : null, theirSign = theirs && theirs.byeAt === undefined ? decodeSign(theirs.info.sign) : null;
  const walking = session.self.path.length > 0;
  useEffect(() => { if (who && (walking || theirSign?.kind !== "shop")) onView(null); }, [who, walking, theirSign?.kind, onView]);
  // Walking takes my sign down, and its panel with it; with no sign up, "mine" is the way to hold one up.
  useEffect(() => { if (view === "mine" && !sign) onView(null); if (view === "setup" && sign) onView("mine"); }, [view, sign, onView]);
  useEffect(() => { setSaid(null); setPick(null); }, [view]);
  // What may be wanted grows as the village meets things: read again as the panel that holds a sign up is opened.
  useEffect(() => { if (view === "setup") void keeper?.shopLook(); }, [view, keeper]);
  useEffect(() => {
    if (!view || hidden) return;
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onView(null); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [view, hidden, onView]);

  /** Hold the sign up: a chat room at once; a stall once its keeper has opened it. */
  const raise = useCallback(async () => {
    if (busy.current) return;
    setSaid(null);
    const no = session.canRaise();
    if (no) { setSaid(why(no, th)); return; }
    if (kind === "chat") {
      const refused = session.raiseChat(title);
      if (refused) setSaid(why(refused, th)); else { sfx?.wake(); sfx?.work("pick"); onView(null); }
      return;
    }
    const at = where();
    if (!keeper || !at) return;
    busy.current = true;
    const did = await keeper.shopOpen(lines, at);
    if (!did.ok) { busy.current = false; setSaid(why(did.why, th)); return; }
    const refused = session.raiseShop(title, lines.some((l) => l.kind === "sell"), lines.some((l) => l.kind === "buy"), keeper.shopBeater());
    busy.current = false;
    if (refused) { void keeper.shopClose(); setSaid(why(refused, th)); return; }
    sfx?.wake(); sfx?.work("pick");
    onView("mine");
  }, [session, keeper, kind, title, lines, th, where, sfx, onView]);

  /** Buy so many at the stall I am looking at, or bring it so many. */
  const trade = useCallback(async (line: ShopLineTold, n: number) => {
    const at = where();
    if (!keeper || !who || !at || busy.current) return;
    busy.current = true;
    const did = await (line.kind === "sell" ? keeper.shopBuy(who, line.item, n, at) : keeper.shopSell(who, line.item, n, at));
    busy.current = false;
    if (!did.ok) { setSaid(why(did.why, th)); void keeper.shopVisit(who); return; }
    sfx?.wake(); sfx?.work("pick");
    const what = `${nameOf(line.item, th)}${n > 1 ? ` ×${n}` : ""}`;
    setSaid(line.kind === "sell" ? (th ? `ซื้อ ${what} แล้ว −${did.coins} เหรียญ` : `Bought ${what}: −${did.coins} coins`) : (th ? `ขาย ${what} แล้ว +${did.coins} เหรียญ` : `Sold ${what}: +${did.coins} coins`));
  }, [keeper, who, where, th, sfx]);

  // (for scripts in \`next dev\`: the panel that is open, the form, holding a sign up, and the stall looked at)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      view: () => view, open: (v: SignView | null) => onView(v), said: () => said, toast: () => toast,
      form: (k: Sign["kind"], name: string, ask: ShopAsk = []) => { setKind(k); setTitle(name); setLines(ask); },
      raise, shops: () => keeper?.shops() ?? null, seen: () => keeper?.shopSeen() ?? null,
      trade: (item: ItemId, n: number) => { const l = keeper?.shopSeen()?.told?.lines.find((x) => x.item === item); return l ? trade(l, n) : Promise.resolve(); },
    };
    (window as unknown as { __townSign?: typeof handle }).__townSign = handle;
    return () => { delete (window as unknown as { __townSign?: typeof handle }).__townSign; };
  }, [view, onView, said, toast, raise, keeper, trade]);

  const word = toast && (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-2" style={{ bottom }}>
      <p role="status" data-sign-toast className="pop-in flex min-h-9 items-center gap-2 rounded-full border border-gold/60 bg-surface/95 px-4 text-ui font-semibold text-gold shadow-lg shadow-black/30 backdrop-blur-sm">
        <SignIcon size={18} />{toast}
      </p>
    </div>
  );
  if (!view || hidden) return word || null;

  const visiting = typeof view === "object";
  const heading = visiting ? (th ? `ร้านของ ${view.name}` : `${view.name}'s stall`) : view === "mine" ? t("ป้ายของฉัน", "My sign") : t("ชูป้าย", "Hold up a sign");
  const count = letters(title).length;
  const wanted = lines.filter((l) => l.kind === "buy").reduce((sum, l) => sum + l.n * l.price, 0);
  const onLine = new Set(lines.map((l) => l.item));
  const mineLines: ShopLine[] = shops?.mine?.lines ?? [];
  return (
    <>
      {word}
      <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
             ? "inset-x-0 h-[min(84%,42rem)] rounded-t-2xl"
             : "right-3 top-16 w-[24rem] rounded-2xl"}`}
           style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
           data-state="open" data-sign-panel={visiting ? "visit" : view}>
        <section aria-labelledby="town-sign-h" className="flex h-full flex-col">
          {/* the panel's head is a board on its pole, like the one held up */}
          <div className="relative border-b-2 border-[#2a1b12] bg-gradient-to-b from-[#d9aa63] to-[#b98445] px-4 py-3 shadow-[inset_0_2px_0_#e9c78b,inset_0_-3px_0_#a47238]">
            <span aria-hidden className="absolute left-2 top-2 size-1 bg-[#5b3a1c]" /><span aria-hidden className="absolute right-2 top-2 size-1 bg-[#5b3a1c]" />
            <div className="flex items-center gap-2">
              <SignIcon size={26} />
              <h2 id="town-sign-h" className="min-w-0 truncate font-display text-title font-semibold text-[#2b1a0c]">{heading}</h2>
              <button type="button" onClick={() => onView(null)} data-sign-close
                      className="pressable ml-auto rounded-full bg-[#2b1a0c] px-4 py-1.5 text-ui font-semibold text-[#f3e3c3]">{t("ปิด", "Close")}</button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
            {view === "setup" && (
              <>
                <div role="radiogroup" aria-label={t("ชนิดของป้าย", "Kind of sign")} className="grid grid-cols-2 gap-2">
                  {([["chat", t("ห้องแชท", "Chat room")], ["shop", t("ร้านขาย / รับซื้อ", "Stall")]] as const).map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={kind === k} disabled={k === "shop" && !shops} onClick={() => { setKind(k); setSaid(null); }} data-sign-kind={k}
                            className={`pressable flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-ui font-semibold disabled:opacity-40 ${kind === k ? "border-accent bg-accent/15 text-accent" : "border-line-strong text-muted hover:text-ink"}`}>
                      <TownIcon name={k === "chat" ? "chat" : "basket"} size={18} />{label}
                    </button>
                  ))}
                </div>

                <label className="mt-3 block">
                  <span className="flex items-baseline justify-between text-meta text-muted">
                    <span>{t("ข้อความบนป้าย", "What the sign says")}</span>
                    <span className="font-data tabular-nums">{count} / {SIGN.title}</span>
                  </span>
                  <input value={title} onChange={(e) => { const typed = e.target.value.replace(/\s+/g, " "), l = letters(typed); setTitle(l.length > SIGN.title ? l.slice(0, SIGN.title).join("") : typed); }} maxLength={120} data-sign-title
                         placeholder={kind === "chat" ? t("เช่น คุยเรื่องตกปลา", "e.g. Fishing talk") : t("เช่น ผักสดจากสวน", "e.g. Fresh from the farm")}
                         className="mt-1 h-10 w-full rounded-xl border border-line-strong bg-bg/85 px-3 text-read text-ink outline-none placeholder:text-muted focus:border-accent" />
                </label>

                {/* the board as it will be held up */}
                <div className="mt-3 flex justify-center" aria-hidden>
                  <Board sign={{ kind, title: tidyTitle(title), n: 1, sells: lines.some((l) => l.kind === "sell"), buys: lines.some((l) => l.kind === "buy") }} th={th} />
                </div>

                {kind === "shop" && shops && purse && (
                  <div className="mt-3" data-sign-lines>
                    <ul className="flex flex-col gap-1.5">
                      {lines.map((l, i) => {
                        const most = l.kind === "sell" ? Math.min(shops.most, plain(purse.bag, l.item)) : shops.most, cap = capOf(l.item, { ...shops, quiet: 0 });
                        const set = (patch: Partial<ShopAsk[number]>) => setLines((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                        return (
                          <li key={l.item} data-line={l.item} className="flex items-center gap-2 rounded-xl border border-line bg-card/60 p-2">
                            <ItemIcon id={l.item} size={30} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-ui font-semibold text-ink">{nameOf(l.item, th)}</div>
                              <Mark kind={l.kind} th={th} />
                            </div>
                            <label className="flex flex-col items-center text-label text-muted">{t("จำนวน", "How many")}
                              <input type="number" inputMode="numeric" min={1} max={most} value={l.n} onChange={(e) => set({ n: whole(e.target.value, most) })} data-line-n
                                     className="h-9 w-14 rounded-lg border border-line-strong bg-bg/85 text-center font-data text-ui tabular-nums text-ink outline-none focus:border-accent" />
                            </label>
                            <label className="flex flex-col items-center text-label text-muted">{t("ราคา/ชิ้น", "Each")}
                              <input type="number" inputMode="numeric" min={1} max={cap} value={l.price} onChange={(e) => set({ price: whole(e.target.value, cap) })} data-line-price
                                     className="h-9 w-16 rounded-lg border border-line-strong bg-bg/85 text-center font-data text-ui tabular-nums text-gold outline-none focus:border-accent" />
                            </label>
                            <button type="button" onClick={() => setLines((all) => all.filter((_, j) => j !== i))} aria-label={`${t("เอาออก", "Remove")}: ${nameOf(l.item, th)}`}
                                    className="pressable grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-card hover:text-ink"><TownIcon name="close" size={14} /></button>
                          </li>
                        );
                      })}
                    </ul>
                    {lines.length < shops.lines && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setPick(pick === "sell" ? null : "sell")} aria-expanded={pick === "sell"} data-sign-add="sell"
                                className="pressable min-h-10 rounded-xl border border-dashed px-2 text-ui font-semibold" style={{ borderColor: SELL_INK, color: pick === "sell" ? "#fff" : "#e08a6b", background: pick === "sell" ? SELL_INK : "transparent" }}>+ {t("ของที่จะขาย", "To sell")}</button>
                        <button type="button" onClick={() => setPick(pick === "buy" ? null : "buy")} aria-expanded={pick === "buy"} data-sign-add="buy"
                                className="pressable min-h-10 rounded-xl border border-dashed px-2 text-ui font-semibold" style={{ borderColor: BUY_INK, color: pick === "buy" ? "#fff" : "#7fb9d6", background: pick === "buy" ? BUY_INK : "transparent" }}>+ {t("ของที่รับซื้อ", "Wanted")}</button>
                      </div>
                    )}
                    {pick === "sell" && (() => {
                      const mine = [...new Set(purse.bag.flatMap((s) => (s && plainStack(s) && s.item in ITEMS ? [s.item] : [])))].filter((id) => !onLine.has(id));
                      return (
                        <Picker th={th} ids={mine} empty={t("ไม่มีของในกระเป๋าที่ลงขายได้", "Nothing in the bag to put up")}
                                count={(id) => plain(purse.bag, id)}
                                onPick={(id) => { setLines((all) => [...all, { kind: "sell", item: id, n: Math.min(shops.most, plain(purse.bag, id)), price: Math.max(1, Math.min(capOf(id, { ...shops, quiet: 0 }), ITEMS[id].pays || 1)) }]); setPick(null); }} />
                      );
                    })()}
                    {pick === "buy" && (() => {
                      const k = q.trim().toLowerCase();
                      const met = shops.seen.filter((id) => id in ITEMS && !onLine.has(id)).filter((id) => !k || ITEMS[id].name.th.toLowerCase().includes(k) || ITEMS[id].name.en.toLowerCase().includes(k));
                      return (
                        <>
                          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ค้นหาชื่อของ", "Find a thing")} aria-label={t("ค้นหาชื่อของ", "Find a thing")}
                                 className="mt-2 h-9 w-full rounded-xl border border-line-strong bg-bg/85 px-3 text-ui text-ink outline-none placeholder:text-muted focus:border-accent" />
                          <Picker th={th} ids={met} empty={t("ไม่พบ", "Nothing found")}
                                  onPick={(id) => { setLines((all) => [...all, { kind: "buy", item: id, n: 1, price: Math.max(1, Math.min(capOf(id, { ...shops, quiet: 0 }), ITEMS[id].pays || 1)) }]); setPick(null); setQ(""); }} />
                        </>
                      );
                    })()}
                    {wanted > 0 && (
                      <p className={`mt-2 flex items-center justify-end gap-2 text-meta ${wanted > purse.coins ? "text-chili" : "text-muted"}`} data-sign-wanted>
                        {t("รับซื้อทั้งหมด", "All that is wanted")}<Coins n={wanted} th={th} small /><span>/</span><Coins n={purse.coins} th={th} small />
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-2 min-h-[1.6em] text-meta leading-relaxed text-chili" aria-live="polite" data-sign-said>{said}</p>
                <button type="button" onClick={() => void raise()} disabled={kind === "shop" && !lines.length} data-sign-raise
                        className="pressable mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-read font-semibold text-bg disabled:opacity-40">
                  <SignIcon size={22} />{t("ชูป้าย", "Hold it up")}
                </button>
              </>
            )}

            {view === "mine" && sign && (
              <>
                <div className="flex justify-center" aria-hidden><Board sign={sign} th={th} /></div>
                {sign.kind === "chat" && (
                  <p className="mt-3 flex items-center justify-center gap-2 text-ui text-ink" data-sign-count>
                    <TownIcon name="people" size={16} />{sign.n} / {SIGN.cap}
                  </p>
                )}
                {sign.kind === "shop" && shops?.mine && (
                  <>
                    <ul className="mt-3 flex flex-col gap-1.5" data-sign-mine>
                      {mineLines.map((l) => (
                        <li key={l.item} data-line={l.item} data-left={l.left} className={`flex items-center gap-2 rounded-xl border border-line bg-card/60 p-2 ${l.left ? "" : "opacity-50"}`}>
                          <ItemIcon id={l.item} size={30} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-ui font-semibold text-ink">{nameOf(l.item, th)}</div>
                            <Mark kind={l.kind} th={th} />
                          </div>
                          <span className="font-data text-ui tabular-nums text-ink">{l.left} / {l.n}</span>
                          <Coins n={l.price} th={th} small />
                        </li>
                      ))}
                    </ul>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl border border-line bg-card/60 p-2"><dt className="text-label text-muted">{t("ขายได้", "Taken")}</dt><dd className="mt-0.5 flex justify-center" data-sign-took={shops.mine.took}><Coins n={shops.mine.took} th={th} /></dd></div>
                      <div className="rounded-xl border border-line bg-card/60 p-2"><dt className="text-label text-muted">{t("จ่ายรับซื้อ", "Paid")}</dt><dd className="mt-0.5 flex justify-center" data-sign-paid={shops.mine.paid}><Coins n={shops.mine.paid} th={th} /></dd></div>
                    </dl>
                  </>
                )}
                <button type="button" onClick={() => { session.lowerSign(); onView(null); }} data-sign-lower
                        className="pressable mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong px-4 text-ui font-semibold text-ink hover:border-chili hover:text-chili">
                  {t("เก็บป้าย", "Take it down")}
                </button>
              </>
            )}

            {visiting && (() => {
              const told = keeper?.shopSeen(), stall = told?.who === view.who ? told.told : undefined;
              const sells = stall?.lines.filter((l) => l.kind === "sell") ?? [], buys = stall?.lines.filter((l) => l.kind === "buy") ?? [];
              return (
                <div data-sign-stall>
                  {theirSign && <div className="flex justify-center" aria-hidden><Board sign={theirSign} th={th} /></div>}
                  <p className={`mt-2 min-h-[1.6em] text-meta leading-relaxed ${said ? "text-accent" : "text-muted"}`} aria-live="polite" data-sign-said>
                    {said ?? (stall === undefined ? t("กำลังดูของในร้าน…", "Looking at the stall…") : stall === null ? why("shut", th) : !stall.lines.length ? t("ตอนนี้ร้านไม่มีอะไร", "The stall has nothing just now") : "")}
                  </p>
                  {purse && sells.length > 0 && (
                    <StallLines title={t("ขาย", "Sells")} ink={SELL_INK} lines={sells} th={th} act={t("ซื้อ", "Buy")}
                                most={(l) => Math.min(l.can, Math.floor(purse.coins / l.price), l.item in ITEMS ? roomFor(purse.bag, l.item) : l.can)} onDo={(l, n) => void trade(l, n)} />
                  )}
                  {purse && buys.length > 0 && (
                    <StallLines title={t("รับซื้อ", "Wants")} ink={BUY_INK} lines={buys} th={th} act={t("ขายให้", "Sell")} held={(l) => plain(purse.bag, l.item)}
                                most={(l) => Math.min(l.can, plain(purse.bag, l.item))} onDo={(l, n) => void trade(l, n)} />
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </>
  );
}

/** "sells" or "wants", as a small mark in its own colour. */
function Mark({ kind, th }: { kind: "sell" | "buy"; th: boolean }) {
  return <span className="inline-block rounded px-1.5 py-px text-label font-bold text-white" style={{ background: kind === "sell" ? SELL_INK : BUY_INK }}>{kind === "sell" ? (th ? "ขาย" : "SELL") : (th ? "รับซื้อ" : "BUY")}</span>;
}

/** A sign's board, as the map draws it over a head: its marks, its title, and how many are in a chat room. */
export function Board({ sign, th }: { sign: Sign; th: boolean }) {
  const title = sign.title || (sign.kind === "chat" ? (th ? "ห้องแชท" : "Chat room") : sign.sells || sign.buys ? "" : (th ? "ร้าน" : "Stall"));
  return (
    <span className="relative inline-flex flex-col items-center pb-5" data-sign-board>
      <span className="relative z-10 inline-flex min-h-8 max-w-full items-center gap-1.5 border-2 border-[#2a1b12] bg-[#c8975a] px-2.5 py-1 shadow-[inset_0_2px_0_#e9c78b,inset_0_-3px_0_#a47238]">
        {sign.kind === "chat" && <span className="grid size-5 place-items-center rounded-full bg-[#3d2913]"><TownIcon name="chat" size={12} /></span>}
        {sign.kind === "shop" && sign.sells && <Mark kind="sell" th={th} />}
        {sign.kind === "shop" && sign.buys && <Mark kind="buy" th={th} />}
        {title && <span className="truncate text-ui font-bold text-[#2b1a0c]">{title}</span>}
        {sign.kind === "chat" && <span className="rounded bg-[#3d2913] px-1.5 py-px font-data text-label font-bold tabular-nums text-[#f3e3c3]">{sign.n}/{SIGN.cap}</span>}
      </span>
      <span className="absolute bottom-0 h-6 w-1.5 border-x-2 border-[#2a1b12] bg-[#9a6b3c]" />
    </span>
  );
}

/** Things to choose from, a few to a row: each a picture with its name under the pointer; how many are held, where that is told. */
function Picker({ ids, th, empty, count, onPick }: { ids: ItemId[]; th: boolean; empty: string; count?: (id: ItemId) => number; onPick: (id: ItemId) => void }) {
  if (!ids.length) return <p className="mt-2 text-meta text-muted">{empty}</p>;
  return (
    <ul className="mt-2 grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain rounded-xl border border-line bg-bg/60 p-2" data-sign-picker>
      {ids.map((id) => (
        <li key={id}>
          <button type="button" onClick={() => onPick(id)} title={nameOf(id, th)} aria-label={nameOf(id, th)} data-item={id}
                  className="pressable relative grid aspect-square w-full place-items-center rounded-lg border border-line-strong bg-card hover:border-accent">
            <ItemIcon id={id} size={30} />
            {count && <span className="absolute bottom-0 right-1 font-data text-label font-semibold tabular-nums text-ink [text-shadow:0_1px_2px_#000]">{count(id)}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One side of somebody's stall: each line with its price, how many can change hands, and a way to say how many and do it. */
function StallLines({ title, ink, lines, th, act, most, held, onDo }: {
  title: string; ink: string; lines: ShopLineTold[]; th: boolean; act: string;
  most: (l: ShopLineTold) => number; held?: (l: ShopLineTold) => number; onDo: (l: ShopLineTold, n: number) => void;
}) {
  const [n, setN] = useState<Record<string, number>>({});
  return (
    <section className="mt-2" data-stall-side={lines[0]?.kind}>
      <h3 className="inline-block rounded px-2 py-0.5 text-label font-bold text-white" style={{ background: ink }}>{title}</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {lines.map((l) => {
          const top = Math.max(0, most(l)), want = Math.max(1, Math.min(top || 1, n[l.item] ?? 1));
          const set = (v: number) => setN((all) => ({ ...all, [l.item]: Math.max(1, Math.min(top || 1, v)) }));
          return (
            <li key={l.item} data-line={l.item} data-can={l.can} className="flex items-center gap-2 rounded-xl border border-line bg-card/60 p-2">
              <ItemIcon id={l.item} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-ui font-semibold text-ink">{nameOf(l.item, th)}</div>
                <div className="flex items-center gap-2 text-label text-muted">
                  <Coins n={l.price} th={th} small /><span>× {l.can}</span>
                  {held && <span className="flex items-center gap-1"><TownIcon name="bag" size={11} />{held(l)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => set(want - 1)} disabled={want <= 1} aria-label={th ? "ลดจำนวน" : "Fewer"} className="pressable grid size-8 place-items-center rounded-full border border-line-strong text-ink disabled:opacity-30">−</button>
                <span className="w-7 text-center font-data text-ui tabular-nums text-ink" data-line-n>{want}</span>
                <button type="button" onClick={() => set(want + 1)} disabled={want >= top} aria-label={th ? "เพิ่มจำนวน" : "More"} className="pressable grid size-8 place-items-center rounded-full border border-line-strong text-ink disabled:opacity-30">+</button>
                <button type="button" onClick={() => set(top)} disabled={top <= 1 || want >= top} className="pressable h-8 rounded-full border border-line-strong px-2 text-label text-muted hover:text-ink disabled:opacity-30">{th ? "สุด" : "Max"}</button>
              </div>
              <button type="button" onClick={() => onDo(l, want)} disabled={top < 1} data-line-do
                      className="pressable flex min-h-10 shrink-0 flex-col items-center justify-center rounded-xl px-3 text-ui font-semibold text-white disabled:opacity-40" style={{ background: ink }}>
                {act}<Coins n={want * l.price} th={th} small className="!text-white" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
