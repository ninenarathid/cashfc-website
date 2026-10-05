"use client";

import { useEffect, useState } from "react";
import { NOTE, WISH, WISHES, tidyNote, type WishId, type WishNote } from "@/lib/town/fountain";
import type { Keeper } from "@/lib/town/keeper";
import TownIcon, { type IconName } from "./TownIcon";
import { Coins } from "./TownTrade";

/** Why a toss was not taken, in the fountain's own words. */
const WHY: Record<string, [string, string]> = {
  coins: ["เหรียญไม่พอ", "Not enough coins"],
  amount: ["ใส่จำนวนเหรียญก่อน", "Say how many coins"],
  none: ["น้ำพุไม่รู้จักพรนี้", "The fountain knows no such wish"],
  note: ["คำอธิษฐานยาวเกินไป", "Those words are too long for a wish"],
  gone: ["คำอธิษฐานนี้ไม่อยู่แล้ว", "That wish is no longer there"],
  away: ["ติดต่อเมืองไม่ได้ ลองใหม่อีกทีนะ", "The town couldn't be reached; try again"],
};
/** The handfuls a tap adds. */
const HANDFULS = [1, 10, 50];

/** Minutes and hours left, as the bag says a buff's. */
function left(ms: number, th: boolean): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  if (min < 60) return th ? `อีก ${min} นาที` : `${min} min left`;
  const h = Math.floor(min / 60), m = min % 60;
  return th ? `อีก ${h} ชม.${m ? ` ${m} นาที` : ""}` : `${h} h${m ? ` ${m} min` : ""} left`;
}

/**
 * The wishing fountain (lib/town/fountain): a tap on the fountain in the
 * middle of the plaza opens it. It shows the pot the village is filling and
 * what is behind each wish, takes coins towards one, and says which blessings
 * are running and whose they are. A toss may carry a line of words, the wish
 * itself; what others have wished is read below, each with a coin to toss
 * onto it, and a way to say one should not be there.
 *
 * Who tossed is told by name and never how much each: the pot is the
 * village's. What the numbers are (the goal, how long a blessing lasts, what
 * tossing together counts for) is the keeper's to say, so a knob turned in the
 * database is what the panel says at the next look.
 */
export default function TownFountain({ keeper, th, onClose }: { keeper: Keeper; th: boolean; onClose: () => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 15_000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  // The pot is everybody's: kept in sight while the panel is open.
  useEffect(() => keeper.look("fountain"), [keeper]);

  // A town that does not answer (or a database that has no fountain yet) is said, not waited for.
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 5000); return () => clearTimeout(t); }, []);

  const [wish, setWish] = useState<WishId | null>(null);
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  /** The words of my wish, as they are being written (kept tidy only when they are tossed). */
  const [words, setWords] = useState("");
  const letters = Array.from(words.trim()).length, tooLong = letters > NOTE.most;

  const now = keeper.now(), purse = keeper.purse(), f = keeper.fountain();
  const give = Math.min(coins, purse.coins);
  // (what can be wished for is the keeper's to say: a wish the database does not know yet is not offered, one this page was built before is not drawn)
  const wishes = (f?.wishes ?? WISHES).filter((w) => w in WISH);
  const most = f ? Math.max(0, ...wishes.map((w) => f.by[w] ?? 0)) : 0;
  const filled = f && f.goal ? Math.min(1, f.pot / f.goal) : 0;

  const toss = async () => {
    if (!wish || give < 1 || busy) return;
    setBusy(true);
    // (the words as they will be kept: tidied here, since what cannot be seen cannot all be sent)
    const did = await keeper.toss(wish, give, tidyNote(words));
    setBusy(false);
    if (!did.ok) { const [a, b] = WHY[did.why] ?? WHY.away; setSaid(th ? a : b); return; }
    setCoins(0);
    setWords("");
    const name = th ? WISH[did.granted ?? wish].name.th : WISH[did.granted ?? wish].name.en;
    if (did.granted) setSaid(th ? `น้ำพุเรืองแสง: พร "${name}" เป็นจริงแล้ว` : `The fountain glows: "${name}" has come true`);
    else if (did.counted > did.took) setSaid(th ? `โยนพร้อมกัน: ${did.took} เหรียญนับเป็น ${did.counted}` : `Tossed together: ${did.took} coins counted for ${did.counted}`);
    else setSaid(th ? `โยนไป ${did.took} เหรียญ` : `${did.took} coins tossed`);
  };

  /** A deed on somebody's wish: a coin onto it, a report, my own taken back, an admin's hiding. What came of it is said in the same line as a toss's. */
  const onNote = async (doing: Promise<{ ok: true } | { ok: false; why: string }>, done: [string, string]) => {
    if (busy) return;
    setBusy(true);
    const did = await doing;
    setBusy(false);
    const [a, b] = did.ok ? done : WHY[did.why] ?? WHY.away;
    setSaid(th ? a : b);
  };

  return (
    <section aria-labelledby="town-fountain-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <TownIcon name="coin" size={24} />
        <h2 id="town-fountain-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{th ? "น้ำพุอธิษฐาน" : "The wishing fountain"}</h2>
        <Coins n={purse.coins} th={th} className="ml-auto" />
        <button type="button" onClick={onClose} className="pressable rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "ปิด" : "Close"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        {!f ? (
          <p className="text-meta text-muted" aria-live="polite">
            {waited ? (th ? "น้ำพุยังไม่รับคำอธิษฐานตอนนี้ ลองใหม่อีกทีนะ" : "The fountain isn't taking wishes just now; try again in a while")
              : (th ? "กำลังมองลงไปในน้ำ…" : "Looking into the water…")}
          </p>
        ) : (
          <>
            {f.blessings.length > 0 && (
              <>
                <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "พรที่กำลังเป็นจริง" : "Blessings running"}</h3>
                <ul className="mb-4 flex flex-col gap-1.5">
                  {f.blessings.map((b) => (
                    <li key={`${b.id}:${b.from}`} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${b.mine ? "border-gold/60 bg-gold/10" : "border-line bg-card/60"}`}>
                      <TownIcon name={WISH[b.id].icon as IconName} size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ui font-semibold text-ink">{th ? WISH[b.id].name.th : WISH[b.id].name.en}
                          <span className="ml-1.5 font-normal text-muted">{left(b.until - now, th)}</span></p>
                        <p className="truncate text-meta text-muted">
                          {th ? `${b.by} โยนเหรียญสุดท้าย · ได้พร ${b.people} คน` : `${b.by} tossed the last coin · ${b.people} have it`}
                        </p>
                      </div>
                      {b.mine
                        ? <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-meta font-semibold text-bg">{th ? "ของฉัน" : "Mine"}</span>
                        : <span className="shrink-0 text-meta text-muted">{th ? "โยน 1 เหรียญเพื่อรับ" : "Toss a coin to join"}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "เหรียญในน้ำพุ" : "The pot"}</h3>
            <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5">
              {f.goal === null ? (
                <p className="text-ui text-ink">{th ? `วันนี้น้ำพุให้พรครบ ${f.rounds} ครั้งแล้ว เหรียญที่โยนตอนนี้จะรอถึงพรุ่งนี้` : `The fountain has granted today's ${f.rounds} wishes; coins tossed now wait for tomorrow`}</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-data text-read font-semibold tabular-nums text-gold">{Math.floor(f.pot)}</span>
                    <span className="font-data text-ui tabular-nums text-muted">/ {f.goal}</span>
                    <span className="ml-auto text-meta text-muted">{th ? `พรครั้งที่ ${f.given + 1} ของวัน` : `Wish ${f.given + 1} of the day`}</span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${Math.max(filled ? 2 : 0, filled * 100)}%` }} />
                  </div>
                </>
              )}
              <p className="mt-2 text-meta text-muted">
                {f.who.length
                  ? (th ? `โยนแล้ว ${f.who.length} คน: ${f.who.join(", ")}` : `${f.who.length} have tossed: ${f.who.join(", ")}`)
                  : (th ? "ยังไม่มีใครโยน" : "Nobody has tossed yet")}
              </p>
            </div>

            <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">{th ? "อธิษฐาน" : "Make a wish"}</h3>
            <div role="radiogroup" aria-label={th ? "พร" : "Wishes"} className="flex flex-col gap-1.5">
              {wishes.map((w) => {
                const behind = f.by[w] ?? 0, chosen = wish === w, leads = behind > 0 && behind >= most;
                return (
                  <button key={w} type="button" role="radio" aria-checked={chosen} onClick={() => setWish(w)}
                          className={`pressable relative overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors ${chosen ? "border-accent bg-accent/10" : "border-line-strong hover:border-accent"}`}>
                    {/* how much of the goal is behind this wish, behind the words */}
                    <span aria-hidden className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${chosen ? "bg-accent/20" : "bg-ink/[0.06]"}`}
                          style={{ width: `${f.goal ? Math.min(100, Math.round((behind / f.goal) * 100)) : 0}%` }} />
                    <span className="relative flex items-center gap-2.5">
                      <TownIcon name={WISH[w].icon as IconName} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui font-semibold text-ink">{th ? WISH[w].name.th : WISH[w].name.en}</span>
                        <span className="block truncate text-meta text-muted">{th ? WISH[w].about.th : WISH[w].about.en}</span>
                      </span>
                      {leads && <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-meta font-semibold text-gold">{th ? "นำอยู่" : "Leading"}</span>}
                      <Coins n={Math.floor(behind)} th={th} small />
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-3 block">
              <span className="sr-only">{th ? "คำอธิษฐาน" : "Your wish, in words"}</span>
              <input type="text" value={words} onChange={(e) => setWords(e.target.value)} maxLength={NOTE.most * 2} enterKeyHint="done" autoComplete="off"
                     placeholder={th ? "เขียนคำอธิษฐาน (ไม่เขียนก็ได้)" : "Write your wish (or leave it)"}
                     aria-invalid={tooLong} className={`min-h-11 w-full rounded-xl border bg-bg/40 px-3 text-ui text-ink placeholder:text-muted focus:outline-none ${tooLong ? "border-chili" : "border-line-strong focus:border-accent"}`} />
              {letters > 0 && <span className={`mt-0.5 block text-right font-data text-label tabular-nums ${tooLong ? "text-chili" : "text-muted"}`}>{letters} / {NOTE.most}</span>}
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {HANDFULS.map((n) => (
                <button key={n} type="button" disabled={purse.coins < 1} onClick={() => setCoins((c) => Math.min(purse.coins, c + n))}
                        className="pressable min-h-11 rounded-full border border-line-strong px-3 font-data text-ui tabular-nums text-ink hover:border-accent disabled:opacity-40">
                  +{n}
                </button>
              ))}
              <button type="button" disabled={!coins} onClick={() => setCoins(0)}
                      className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent disabled:opacity-40">
                {th ? "ล้าง" : "Clear"}
              </button>
              <Coins n={give} th={th} className="ml-auto" />
            </div>
            <button type="button" disabled={!wish || give < 1 || busy || tooLong} onClick={() => void toss()}
                    className="pressable mt-2 min-h-11 w-full rounded-full bg-gold px-4 text-ui font-semibold text-bg disabled:opacity-40">
              {wish
                ? (th ? `โยน ${give} เหรียญ ขอพร "${WISH[wish].name.th}"` : `Toss ${give} for "${WISH[wish].name.en}"`)
                : (th ? "เลือกพรก่อน" : "Choose a wish first")}
            </button>
            <p className="mt-2 min-h-5 text-meta text-ink" aria-live="polite">{said}</p>

            {f.notes.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? "คำอธิษฐานของชาวเมือง" : "What the town has wished"}</h3>
                <ul className="flex flex-col gap-1.5">
                  {f.notes.map((n: WishNote) => (
                    <li key={n.id} className={`rounded-xl border px-3 py-2 ${n.hidden ? "border-line bg-card/30 opacity-70" : n.mine ? "border-accent/50 bg-accent/5" : "border-line bg-card/60"}`} data-note={n.id}>
                      <p className="flex items-center gap-1.5 text-meta text-muted">
                        <TownIcon name={WISH[n.wish]?.icon as IconName} size={16} />
                        <span className="min-w-0 truncate font-semibold text-ink">{n.by}</span>
                        {n.hidden && <span className="shrink-0 rounded-full bg-line px-1.5 text-label">{th ? "ถูกซ่อน" : "Hidden"}</span>}
                        {n.cheers > 0 && <span className="ml-auto flex shrink-0 items-center gap-1 font-data tabular-nums text-gold"><TownIcon name="coin" size={12} />{th ? `ร่วมอธิษฐาน ${n.cheers}` : `${n.cheers} joined`}</span>}
                      </p>
                      {/* (a member's own words: shown as text, never as anything else) */}
                      <p className="mt-0.5 break-words text-ui text-ink">{n.note}</p>
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        {!n.mine && !n.hidden && (
                          <button type="button" disabled={busy || purse.coins < 1} onClick={() => void onNote(keeper.cheer(n.id, 1), ["ร่วมอธิษฐานแล้ว 1 เหรียญ", "A coin tossed onto that wish"])}
                                  className="pressable min-h-9 rounded-full border border-line-strong px-3 text-meta text-ink hover:border-accent disabled:opacity-40">
                            {n.cheered ? (th ? "ร่วมอีก 1 เหรียญ" : "Another coin") : (th ? "ร่วมอธิษฐาน 1 เหรียญ" : "Wish with them: 1 coin")}
                          </button>
                        )}
                        {!n.mine && !n.reported && !f.admin && (
                          <button type="button" disabled={busy} onClick={() => void onNote(keeper.wishReport(n.id), ["รายงานแล้ว ขอบคุณที่ช่วยดูแล", "Reported, thank you"])}
                                  className="pressable min-h-9 rounded-full px-2.5 text-meta text-muted hover:text-chili">{th ? "รายงาน" : "Report"}</button>
                        )}
                        {n.mine && (
                          <button type="button" disabled={busy} onClick={() => void onNote(keeper.wishUnsay(n.id), ["ลบคำอธิษฐานแล้ว", "Your wish is taken back"])}
                                  className="pressable min-h-9 rounded-full px-2.5 text-meta text-muted hover:text-chili">{th ? "ลบของฉัน" : "Take mine back"}</button>
                        )}
                        {f.admin && (
                          <button type="button" disabled={busy} onClick={() => void onNote(keeper.wishHide(n.id, !n.hidden), n.hidden ? ["แสดงอีกครั้งแล้ว", "Shown again"] : ["ซ่อนแล้ว", "Hidden"])}
                                  className="pressable min-h-9 rounded-full border border-line-strong px-2.5 text-meta text-ink hover:border-chili">{n.hidden ? (th ? "แสดง" : "Show") : (th ? "ซ่อน" : "Hide")}</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
