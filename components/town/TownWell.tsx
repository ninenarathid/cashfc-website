"use client";

import { useCallback, useEffect, useState } from "react";
import { ITEMS, iconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { RANK_TITLES } from "@/lib/town/well";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";

/** The mark of each rank, the first to the last. */
export const RANK_ICONS: IconName[] = ["rankWaterA", "rankWaterB", "rankWaterC"];

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

  const book = keeper.wellBook();
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
    const handle = { book: () => keeper.wellBook(), ranks: () => keeper.ranks(), open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open, take };
    (window as unknown as { __townWell?: typeof handle }).__townWell = handle;
    return () => { delete (window as unknown as { __townWell?: typeof handle }).__townWell; };
  }, [keeper, open, take]);

  if (!at || !book) return null;
  const title = book.rank > 0 ? RANK_TITLES[book.rank - 1][th ? 0 : 1] : null;
  const n = (k: number) => k.toLocaleString(th ? "th-TH" : "en-US");
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

              <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "วันนี้" : "Today"}</h3>
              <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-card/60 px-3 py-2.5 text-ui text-ink" data-well-today>
                <Line icon="bucketFull" text={th ? `เทน้ำลงบ่อ ${n(book.today.buckets)} ถัง` : `Poured into the well: ${n(book.today.buckets)}`} />
                <Line icon="plotDrop" text={th
                  ? `น้ำของฉันถูกรดไป ${n(book.today.waterings)} ครั้ง · ผัก ${n(book.today.plants)} ต้น · ของ ${n(book.today.people)} คน`
                  : `My water went on ${n(book.today.waterings)} watering${book.today.waterings === 1 ? "" : "s"} · ${n(book.today.plants)} plant${book.today.plants === 1 ? "" : "s"} · of ${n(book.today.people)} ${book.today.people === 1 ? "person" : "people"}`} />
                <Line icon="can" text={th
                  ? `รดน้ำให้ผักของคนอื่น ${n(book.today.watered)} ครั้ง · ${n(book.today.helped)} คน`
                  : `Watered others' plants ${n(book.today.watered)} time${book.today.watered === 1 ? "" : "s"} · for ${n(book.today.helped)} ${book.today.helped === 1 ? "person" : "people"}`} />
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
