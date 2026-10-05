"use client";

import { useCallback, useEffect, useState } from "react";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { mayDrop } from "@/lib/town/jar";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { handOf } from "@/lib/town/trade";
import { NATURE_NAMES, type Nature } from "@/lib/town/waters";
import { RANK_TITLES } from "@/lib/town/well";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";

/** The mark of each rank, the first to the last. */
export const RANK_ICONS: IconName[] = ["rankWaterA", "rankWaterB", "rankWaterC"];
/** The picture of each water that has a nature (lib/town/waters): a drop under the rising sun, under a cloud, beside the moon. */
const NATURE_ICONS: Record<Nature, IconName> = { dawn: "waterDawn", rain: "waterRain", moon: "waterMoon" };

/**
 * The well's book (lib/town/well; the owner, 2026-10-05: those who carry water
 * for the others' sake got nothing for it, and nobody saw them). Standing at
 * the farm's well, a small book is offered; opened, it says what came of the
 * water I carried today, what I have carried all told and how far along I am,
 * and who carried today, by name, in the order they came. When the well has
 * something for me, the book says so and hands it over.
 *
 * It states what is, as everything in the town does: nothing says how many
 * bucketfuls a rank takes, nor what the well will have for whoever gets there.
 *
 * The book has two things more (v129). **The thanks I have had** (lib/town/
 * thanks): today's, by whom; this week's and all told; and who has been
 * thanked most this week. And **the jar** that stands by the well (lib/town/
 * jar): what is in it, when it is next shared, coins or the thing in my hand
 * dropped in, and what waits for me taken. The jar alone says what it is for,
 * as the bank says what changing popoto costs: nobody gives to a jar they
 * know nothing of.
 *
 * What is kept is the keeper's: for a member the database's (v127), where the
 * book is read as it is opened; in `next dev`'s test room the browser's trial.
 * A keeper that knows of no book (the database before v127) offers none.
 */
export default function TownWell({ keeper, name, th, at, phone, tabbar, bottom, sfx }: {
  keeper: Keeper;
  /** What I am called: the trial knows its carriers only by their ids. */
  name: string;
  th: boolean;
  /** Whether I stand at the well. */
  at: boolean;
  phone: boolean;
  tabbar: boolean;
  /** How far up from the foot of the map the little book sits. */
  bottom: string;
  sfx: FishSfx | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // read as I come to the well, and again as the book is opened; walking off shuts it
  useEffect(() => { if (at) void keeper.wellLook(); else setOpen(false); }, [at, keeper]);
  useEffect(() => { if (open) { setNote(null); void keeper.wellLook(); } }, [open, keeper]);
  useEffect(() => {
    if (!open) return;
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open]);

  const book = keeper.wellBook(), thanks = keeper.thanks(), jar = keeper.jar();
  const purse = keeper.purse(), hand = handOf(purse), handSlot = hand ? purse.bag.findIndex((s) => s?.item === hand && mayDrop(s)) : -1;
  /** Drop coins into the jar, or one of the thing in my hand; and take what waits for me. */
  const give = useCallback(async (what: { coins: number } | { slot: number; n: number }) => {
    setBusy(true);
    const did = await keeper.jarDrop(what);
    setBusy(false);
    if (!did.ok) { const w = WHY[did.why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); return; }
    sfx?.wake();
    sfx?.work("pick");
    void keeper.wellLook();
  }, [keeper, th, sfx]);
  const takeShare = useCallback(async () => {
    setBusy(true);
    const did = await keeper.jarTake();
    setBusy(false);
    if (!did.ok) { const w = WHY[did.why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); return; }
    sfx?.wake();
    sfx?.work("pick");
    void keeper.wellLook();
  }, [keeper, th, sfx]);
  const take = useCallback(async () => {
    setBusy(true);
    const did = await keeper.wellTake();
    setBusy(false);
    if (!did.ok) { const w = WHY[did.why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); return; }
    sfx?.wake();
    sfx?.work("pick");
    setNote(th ? `ได้รับ ${ITEMS[did.gift].name.th}` : `You have the ${ITEMS[did.gift].name.en.toLowerCase()}`);
    void keeper.wellLook();
  }, [keeper, th, sfx]);

  // (for scripts in `next dev`: the book as it is read, opening it, taking what waits)
  useEffect(() => {
    const handle = { book: () => keeper.wellBook(), ranks: () => keeper.ranks(), open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open, take, jar: () => keeper.jar(), thanks: () => keeper.thanks(), give, takeShare };
    (window as unknown as { __townWell?: typeof handle }).__townWell = handle;
    return () => { delete (window as unknown as { __townWell?: typeof handle }).__townWell; };
  }, [keeper, open, take, give, takeShare]);

  if (!at || !book) return null;
  const title = book.rank > 0 ? RANK_TITLES[book.rank - 1][th ? 0 : 1] : null;
  const n = (k: number) => k.toLocaleString(th ? "th-TH" : "en-US");
  const hour = (at: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(at);
  const things = (list: Array<[ItemId, number]>) => list.map(([id, k]) => (
    <span key={id} className="flex items-center gap-1" title={th ? ITEMS[id]?.name.th : ITEMS[id]?.name.en}>
      <TownIcon name={(iconOf(id) in ICON_ATLAS.icons ? iconOf(id) : "mystery") as IconName} size={18} />
      <span className="font-data tabular-nums">{n(k)}</span>
    </span>
  ));
  return (
    <>
      {!open && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-2" style={{ bottom }}>
          <button type="button" onClick={() => setOpen(true)} data-well-chip data-state="open"
                  className="pop-in pressable pointer-events-auto relative flex min-h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent">
            <TownIcon name="wellBook" size={22} />
            {th ? "สมุดบ่อน้ำ" : "The well's book"}
            {book.gift && <span data-well-waiting className="absolute -right-1 -top-2"><TownIcon name="wellGift" size={20} /></span>}
          </button>
        </div>
      )}
      {open && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(62%,34rem)] rounded-t-2xl"
               : "right-3 top-16 w-[22rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open" data-well-panel>
          <section aria-labelledby="town-well-h" className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <TownIcon name="wellBook" size={26} />
              <h2 id="town-well-h" className="font-display text-title font-semibold text-ink">{th ? "สมุดบ่อน้ำ" : "The well's book"}</h2>
              <button type="button" onClick={() => setOpen(false)} data-well-close
                      className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
                {th ? "ปิด" : "Close"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "น้ำของฉัน" : "My water"}</h3>
              <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {book.rank > 0 ? <TownIcon name={RANK_ICONS[book.rank - 1]} size={28} /> : <TownIcon name="bucketFull" size={26} />}
                  <span className="text-read font-semibold text-ink" data-well-rank={book.rank}>{title ?? (th ? "ยังไม่มีฉายา" : "No name yet")}</span>
                  <span className="ml-auto font-data text-ui tabular-nums text-muted" data-well-total>{th ? `${n(book.buckets)} ถัง` : `${n(book.buckets)} bucketful${book.buckets === 1 ? "" : "s"}`}</span>
                </div>
                {/* how far along to the next: a bar, and no number */}
                <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-[#4aa3d8] transition-[width] duration-500" data-well-towards={book.towards} style={{ width: `${Math.round(book.towards * 100)}%` }} />
                </div>
                {book.gift && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent/60 bg-accent/10 px-2.5 py-2">
                    <TownIcon name="wellGift" size={26} />
                    <span className="min-w-0 flex-1 text-ui text-ink">{th ? "บ่อน้ำมีของฝากไว้ให้" : "The well has something for you"}</span>
                    <button type="button" onClick={() => void take()} disabled={busy} data-well-take
                            className="pressable min-h-10 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-60">
                      {th ? "รับ" : "Take it"}
                    </button>
                  </div>
                )}
                {note && <p className="mt-2 text-meta text-ink" aria-live="polite" data-well-note>{note}</p>}
              </div>

              {/* the well's water, while it has a nature (lib/town/waters): what it is, for how long yet, and whose doing; never what it does */}
              {book.water && book.water.until > keeper.now() && (
                <p className="mt-3 flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-ui text-ink" data-well-water={book.water.kind}>
                  <TownIcon name={NATURE_ICONS[book.water.kind]} size={24} />
                  <span className="min-w-0">
                    {th
                      ? `น้ำในบ่อตอนนี้คือ${NATURE_NAMES[book.water.kind][0]} · อีก ${Math.max(1, Math.ceil((book.water.until - keeper.now()) / 60_000))} นาที · ${book.water.name || "เพื่อนคนหนึ่ง"}หาบมา`
                      : `The well's water is ${NATURE_NAMES[book.water.kind][1].toLowerCase()} · ${Math.max(1, Math.ceil((book.water.until - keeper.now()) / 60_000))} min more · brought by ${book.water.name || "somebody"}`}
                  </span>
                </p>
              )}

              <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "วันนี้" : "Today"}</h3>
              <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-card/60 px-3 py-2.5 text-ui text-ink" data-well-today>
                {/* (every bucketful carried: into the well, over a bed, into the cooking yard's jar) */}
                <Line icon="bucketFull" text={th ? `หาบน้ำมา ${n(book.today.buckets)} ถัง` : `Carried: ${n(book.today.buckets)} bucketful${book.today.buckets === 1 ? "" : "s"}`} />
                <Line icon="plotDrop" text={th
                  ? `น้ำของฉันถูกรดไป ${n(book.today.waterings)} ครั้ง · ผัก ${n(book.today.plants)} ต้น · ของ ${n(book.today.people)} คน`
                  : `My water went on ${n(book.today.waterings)} watering${book.today.waterings === 1 ? "" : "s"} · ${n(book.today.plants)} plant${book.today.plants === 1 ? "" : "s"} · of ${n(book.today.people)} ${book.today.people === 1 ? "person" : "people"}`} />
                <Line icon="can" text={th
                  ? `รดน้ำให้ผักของคนอื่น ${n(book.today.watered)} ครั้ง · ${n(book.today.helped)} คน`
                  : `Watered others' plants ${n(book.today.watered)} time${book.today.watered === 1 ? "" : "s"} · for ${n(book.today.helped)} ${book.today.helped === 1 ? "person" : "people"}`} />
                {/* (the cooking yard's jar: said only once a pot has been cooked with my water) */}
                {!!book.today.pots && (
                  <Line icon="yardJar" text={th
                    ? `น้ำของฉันอยู่ในอาหาร ${n(book.today.pots)} หม้อ · ของ ${n(book.today.cooks ?? 0)} คน`
                    : `My water went into ${n(book.today.pots)} pot${book.today.pots === 1 ? "" : "s"} · of ${n(book.today.cooks ?? 0)} ${book.today.cooks === 1 ? "cook" : "cooks"}`} />
                )}
              </ul>

              <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "คนหาบน้ำวันนี้" : "Today's carriers"}</h3>
              {book.carriers.length ? (
                <ol className="flex flex-col gap-1" data-well-carriers>
                  {book.carriers.map((c) => (
                    <li key={c.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${c.id === keeper.id ? "border-accent/60 bg-accent/10" : "border-line bg-card/60"}`}>
                      {c.rank > 0 ? <TownIcon name={RANK_ICONS[c.rank - 1]} size={20} /> : <span aria-hidden className="inline-block size-5 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">{c.id === keeper.id && c.name === c.id ? name : c.name}</span>
                      <span className="shrink-0 font-data text-ui tabular-nums text-muted">{th ? `${n(c.buckets)} ถัง` : n(c.buckets)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-meta text-muted">{th ? "วันนี้ยังไม่มีใครหาบน้ำมาเติมบ่อ" : "Nobody has carried water to the well today"}</p>
              )}

              {thanks && (
                <>
                  <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "คำขอบคุณ" : "Thanks"}</h3>
                  <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5" data-well-thanks>
                    <div className="flex items-center gap-2">
                      <TownIcon name="thanksCard" size={22} />
                      <span className="text-ui text-ink">{th ? `สัปดาห์นี้ ${n(thanks.week)} · ทั้งหมด ${n(thanks.all)}` : `This week ${n(thanks.week)} · all told ${n(thanks.all)}`}</span>
                    </div>
                    <p className="mt-1 text-meta text-muted">
                      {thanks.today.length
                        ? `${th ? "วันนี้" : "Today"}: ${thanks.today.map((p) => p.name || "?").join(", ")}`
                        : th ? "วันนี้ยังไม่มีใครขอบคุณ" : "Nobody has thanked you today"}
                    </p>
                    {thanks.top.length > 0 && (
                      <ol className="mt-2 flex flex-col gap-1 border-t border-line pt-2" data-well-thanked>
                        {thanks.top.map((p) => (
                          <li key={p.id} className="flex items-center gap-2 text-ui">
                            <span className={`min-w-0 flex-1 truncate ${p.id === keeper.id ? "font-semibold text-accent" : "text-ink"}`}>{p.id === keeper.id && p.name === p.id ? name : p.name}</span>
                            <span className="shrink-0 font-data tabular-nums text-muted">{n(p.n)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </>
              )}

              {jar && (
                <>
                  <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "กระปุกน้ำใจ" : "The jar"}</h3>
                  <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5" data-well-jar>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui text-ink">
                      <TownIcon name="tipJar" size={26} />
                      <span className="flex items-center gap-1" data-jar-coins-in={jar.coins}><TownIcon name="coin" size={16} /><span className="font-data tabular-nums">{n(jar.coins)}</span></span>
                      {things(jar.things)}
                    </div>
                    <p className="mt-1 text-meta leading-snug text-muted">
                      {th ? `แบ่งให้คนที่หาบน้ำและรดน้ำให้คนอื่น ตอน ${hour(jar.next)} น.` : `Shared among those who carried and watered for others, at ${hour(jar.next)}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[1, 5, 10].map((k) => (
                        <button key={k} type="button" onClick={() => void give({ coins: k })} disabled={busy || purse.coins < k} data-jar-give={k}
                                className="pressable flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3 text-ui font-semibold text-ink transition-colors hover:border-accent disabled:opacity-40">
                          +{k} <TownIcon name="coin" size={14} />
                        </button>
                      ))}
                      {hand && handSlot >= 0 && (
                        <button type="button" onClick={() => void give({ slot: handSlot, n: 1 })} disabled={busy} data-jar-give-thing
                                className="pressable flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3 text-ui font-semibold text-ink transition-colors hover:border-accent disabled:opacity-40">
                          +1 <TownIcon name={(iconOf(hand) in ICON_ATLAS.icons ? iconOf(hand) : "mystery") as IconName} size={16} />
                        </button>
                      )}
                    </div>
                    {jar.mine && (jar.mine.coins > 0 || jar.mine.things.length > 0) && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-accent/60 bg-accent/10 px-2.5 py-2 text-ui text-ink" data-jar-mine>
                        <span className="min-w-0 flex-1">{th ? "ส่วนแบ่งของฉัน" : "My share"}</span>
                        {jar.mine.coins > 0 && <span className="flex items-center gap-1"><TownIcon name="coin" size={16} /><span className="font-data tabular-nums">{n(jar.mine.coins)}</span></span>}
                        {things(jar.mine.things)}
                        <button type="button" onClick={() => void takeShare()} disabled={busy} data-jar-take
                                className="pressable min-h-10 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-60">
                          {th ? "รับ" : "Take it"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Line({ icon, text }: { icon: string; text: string }) {
  const name = (icon in ICON_ATLAS.icons ? icon : iconOf("bucket")) as IconName;
  return (
    <li className="flex items-start gap-2">
      <TownIcon name={name} size={18} className="mt-0.5" />
      <span className="min-w-0 flex-1 leading-snug">{text}</span>
    </li>
  );
}
