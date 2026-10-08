"use client";

import { useEffect, useRef, useState } from "react";
import { giftAt, type Gifts } from "@/lib/town/gifts";
import type { Keeper } from "@/lib/town/keeper";
import { ALL_LINE_IDS, LINES, RANKS, ladderOf, linesShown, pastBound, rankOf, titleOf, towards, type LineId, type LinesTold, type Worn } from "@/lib/town/lines";
import TownIcon, { type IconName } from "./TownIcon";
import TownMe from "./TownMe";

/** The board's wood and what is written on it; a ladder's paper and its ink (the kitchen table's own). */
const CREAM = "#ffeccb", CREAM_SOFT = "#e9cfa4", HOLLOW = "#3a2513";
const PAPER = "#f0dfb6", PAPER_EDGE = "#d9bf85", INK = "#4a3520", INK_SOFT = "#7a5f3c", JADE = "#2f7d4f";
/** What a rank's mark is cast in: bronze for the first three, silver, gold, and the last one's own. */
export const rankInk = (rank: number) => (rank >= RANKS ? "#ff9d6c" : rank >= 7 ? "#f2c94c" : rank >= 4 ? "#d5dce3" : "#e0a66a");
const fmt = (n: number) => Math.floor(n).toLocaleString("en-US");

/**
 * The lines of work, each with its ladder (the owner, 2026-10-06: "ช่วยทำ UI progression ของแต่ละสายให้ด้วย มีบอกด้วยว่า ตอนนี้มี
 * คะแนนเท่าไหร่ ต้องถึงเท่าไหร่ถึงได้ แต่ของที่ยังไม่ปลดล็อคจะยังไม่มีข้อมูลให้เห็น"; and of a title, "เลือกได้ ทำ UI ให้ด้วย").
 *
 * - **Seven lines** on one board: each with its picture, the title its member has reached (or none yet), the points
 *   they have and the points the next rank takes, and how far between the two they are. Today's points beside it,
 *   and a word when the day has passed its bound.
 * - **A ladder**, for the line picked: ten rungs. A rank one has says its title and its mark, and may be worn under
 *   one's name; the next says its mark and nothing more; those beyond say nothing at all (lib/town/lines' ladderOf:
 *   what is not unlocked is not in what the screen is given, so nothing of it can show).
 * - **The title worn**, at the head: any rank of any line one has, or none.
 *
 * - **A rank's gift** (lib/town/gifts), where whoever keeps the game gives them: on the rung of a rank one has, a
 *   button to take it, and its name once taken. Nothing of a gift shows on a rung not reached.
 * - **A second leaf, "ตัวฉัน"** (TownMe): the charms worn of what was taken. The map opens the board at either leaf.
 *
 * It says what is, never how points are come by: that is found by doing. With `reduced` nothing moves.
 */
export default function TownLines({ keeper, told, gifts, gifting, given, leaf, th, reduced, called, bottom, onClose }: {
  keeper: Keeper;
  told: LinesTold;
  /** What I have of the gifts and wear of them, and whether whoever keeps the game gives any (else nothing of them shows). */
  gifts: Gifts;
  gifting: boolean;
  /** The gifts whoever keeps the game gives yet: nothing is offered or counted of any other. */
  given: readonly string[];
  /** Which leaf the board opens at. */
  leaf: "lines" | "me";
  th: boolean;
  reduced: boolean;
  /** What I am called: the title is shown under it as it will be on the map. */
  called: string;
  bottom: string;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<LineId>(() => [...linesShown(told)].sort((a, b) => told.lines[b].points - told.lines[a].points)[0]);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState<"lines" | "me">(gifting ? leaf : "lines");
  const board = useRef<HTMLElement>(null);
  useEffect(() => { board.current?.focus(); keeper.linesRead(); }, [keeper]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onClose]);
  const wear = async (worn: Worn | null) => { if (busy) return; setBusy(true); await keeper.titleWear(worn); setBusy(false); };
  const take = async (rank: number) => { if (busy) return; setBusy(true); await keeper.giftTake(picked, rank); setBusy(false); };
  const worn = told.worn, wornTitle = worn ? titleOf(worn.line, worn.rank) : null;
  const line = LINES[picked], mine = told.lines[picked], ladder = ladderOf(picked, mine.points);

  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center bg-black/60 min-[900px]:items-center min-[900px]:px-4 min-[900px]:pt-4" style={{ paddingBottom: bottom }} onClick={onClose}>
      <style href="town-lines" precedence="medium">{`
        @keyframes tl-fill { from { transform: scaleX(0) } to { transform: none } }
        .tl-fill { transform-origin: 0 50%; animation: tl-fill 520ms cubic-bezier(.2, .8, .2, 1) }
        [data-town-lines][data-still] .tl-fill { animation: none }
      `}</style>
      <section ref={board} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="town-lines-h" data-town-lines data-still={reduced ? "" : undefined}
               onClick={(e) => e.stopPropagation()} style={{ outline: "none" }}
               className="relative flex size-full max-w-[60rem] select-none flex-col border-[#2a190d] bg-[#6b4424] shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)] min-[900px]:h-auto min-[900px]:max-h-full min-[900px]:rounded-lg min-[900px]:border-[3px]">
        <header className="flex min-h-11 shrink-0 items-center gap-2 px-3 pt-1">
          <TownIcon name="rosette" size={24} />
          <h2 id="town-lines-h" className={gifting ? "sr-only" : "font-display text-title font-semibold [text-shadow:0_2px_0_#2a190d]"} style={{ color: CREAM }}>{at === "me" ? (th ? "ตัวฉัน" : "Me") : (th ? "สายอาชีพ" : "Lines of work")}</h2>
          {gifting && (
            <div role="tablist" aria-label={th ? "หน้า" : "Leaves"} className="flex gap-1">
              {([["lines", th ? "สายอาชีพ" : "Lines of work"], ["me", th ? "ตัวฉัน" : "Me"]] as const).map(([id, name]) => (
                <button key={id} type="button" role="tab" aria-selected={at === id} onClick={() => setAt(id)} data-lines-leaf={id}
                        className={`pressable min-h-9 rounded-md border-2 px-3 font-display text-ui font-semibold ${at === id ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#4a2f18] hover:bg-[#523520]"}`} style={{ color: CREAM }}>{name}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={onClose} className="pressable ml-auto min-h-9 shrink-0 rounded-md border-2 border-[#2a190d] bg-[#4a2f18] px-3 text-meta hover:bg-[#5a3a1c]" style={{ color: CREAM }}>{th ? "ปิด" : "Close"}</button>
        </header>

        {/* the title worn: as it will read under my name */}
        <div className="mx-2 mt-1 flex shrink-0 items-center gap-3 rounded-[4px] border-[3px] border-[#2a190d] px-3 py-2" style={{ backgroundColor: HOLLOW }} data-lines-worn={worn ? `${worn.line}:${worn.rank}` : ""}>
          <div className="min-w-0 flex-1">
            <p className="font-data text-label" style={{ color: CREAM_SOFT }}>{th ? "ฉายาใต้ชื่อ" : "The title under your name"}</p>
            <p className="truncate text-ui font-semibold" style={{ color: CREAM }}>{called}</p>
            {wornTitle
              ? <p className="mt-0.5 inline-block max-w-full truncate rounded-full bg-[rgba(15,19,25,0.72)] px-2.5 py-0.5 text-meta font-semibold" style={{ color: rankInk(worn!.rank) }}>{th ? wornTitle.th : wornTitle.en}</p>
              : <p className="mt-0.5 text-meta" style={{ color: CREAM_SOFT }}>{th ? "ยังไม่ได้ใส่ฉายา" : "No title worn"}</p>}
          </div>
          {worn && <button type="button" disabled={busy} onClick={() => wear(null)} data-lines-bare className="pressable min-h-10 shrink-0 rounded-md border-2 border-[#2a190d] bg-[#4a2f18] px-3 text-meta disabled:opacity-50" style={{ color: CREAM }}>{th ? "ถอดฉายา" : "Wear none"}</button>}
        </div>

        {at === "me" ? <TownMe keeper={keeper} told={told} gifts={gifts} given={given} th={th} /> : (
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-2 p-2 min-[900px]:grid-cols-[minmax(0,1fr)_22rem] min-[900px]:grid-rows-[minmax(0,1fr)]">
          {/* ── the seven lines ── */}
          <ul className="flex gap-1.5 overflow-x-auto pb-1 min-[900px]:max-h-[30rem] min-[900px]:flex-col min-[900px]:overflow-y-auto min-[900px]:overflow-x-hidden min-[900px]:pb-0 min-[900px]:pr-1 [scrollbar-color:#6b4a2a_transparent] [scrollbar-width:thin]" aria-label={th ? "สายทั้งหมด" : "The lines"}>
            {/* (lines to come: a later line has a card only where whoever keeps the game gives it) */}
            {linesShown(told).map((id) => {
              const l = LINES[id], has = told.lines[id], at = towards(id, has.points), title = titleOf(id, at.rank), on = id === picked;
              return (
                <li key={id} className="w-[13.5rem] shrink-0 min-[900px]:w-auto">
                  <button type="button" onClick={() => setPicked(id)} aria-pressed={on} data-lines-line={id} data-rank={at.rank} data-points={Math.floor(has.points)}
                          className={`pressable flex w-full items-center gap-2.5 rounded-[4px] border-2 px-2.5 py-2 text-left ${on ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#4a2f18] hover:bg-[#523520]"}`}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-md border-2 border-[#2a190d]" style={{ backgroundColor: HOLLOW }}><TownIcon name={l.icon as IconName} size={28} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="truncate text-ui font-semibold" style={{ color: CREAM }}>{th ? l.name.th : l.name.en}</span>
                        <span className="ml-auto shrink-0 font-data text-label tabular-nums" style={{ color: at.rank ? rankInk(at.rank) : CREAM_SOFT }}>{th ? `ขั้น ${at.rank}` : `Rank ${at.rank}`}</span>
                      </span>
                      <span className="block truncate text-meta" style={{ color: title ? rankInk(at.rank) : CREAM_SOFT }}>{title ? (th ? title.th : title.en) : (th ? "ยังไม่มีขั้น" : "No rank yet")}</span>
                      {/* how far to the next rank: the points had, and the points it takes */}
                      <span aria-hidden className="mt-1 block h-2 overflow-hidden rounded-full border border-[#2a190d]" style={{ backgroundColor: HOLLOW }}>
                        <span key={`${id}:${Math.floor(has.points)}`} className="tl-fill block h-full rounded-full" style={{ width: `${Math.max(at.share > 0 ? 3 : 0, at.share * 100)}%`, backgroundColor: at.next === null ? rankInk(RANKS) : "#8fd45f" }} />
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-data text-label tabular-nums" style={{ color: CREAM_SOFT }}>
                        <span>{at.next === null ? fmt(has.points) : `${fmt(has.points)} / ${fmt(at.next)}`}</span>
                        {has.today > 0 && <span className="ml-auto" style={{ color: pastBound(id, has.today) ? "#ffb09c" : "#bfe7a0" }}>{th ? `วันนี้ +${fmt(has.today)}` : `today +${fmt(has.today)}`}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ── the ladder of the line picked ── */}
          <section aria-label={th ? `บันไดขั้นของ${line.name.th}` : `The ladder of ${line.name.en.toLowerCase()}`} data-lines-ladder={picked}
                   className="flex min-h-0 flex-col overflow-hidden rounded-[4px] border-[3px] border-[#2a190d] min-[900px]:max-h-[30rem]"
                   style={{ color: INK, backgroundColor: PAPER, backgroundImage: `linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 7%, transparent 93%, ${PAPER_EDGE} 100%)` }}>
            <div className="flex shrink-0 items-center gap-2 border-b-2 px-3 py-2" style={{ borderColor: PAPER_EDGE }}>
              <TownIcon name={line.icon as IconName} size={26} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-title font-semibold leading-tight">{th ? line.name.th : line.name.en}</h3>
                <p className="font-data text-meta tabular-nums" style={{ color: INK_SOFT }}>
                  {th ? `${fmt(mine.points)} แต้ม` : `${fmt(mine.points)} points`}
                  {pastBound(picked, mine.today) && <span className="ml-2" data-lines-past>{th ? "วันนี้แต้มขึ้นช้าลงแล้ว" : "today's points come slower now"}</span>}
                </p>
              </div>
            </div>
            <ol className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 [scrollbar-color:#b99a5e_transparent] [scrollbar-width:thin]">
              {ladder.map((r) => {
                const isWorn = worn?.line === picked && worn.rank === r.rank;
                const there = gifting && r.state === "had" ? giftAt(picked, r.rank) : null, gift = there && given.includes(there.id) ? there : null, has = !!gift && gifts.had.includes(gift.id);
                return (
                  <li key={r.rank} data-lines-rank={r.rank} data-state={r.state} className="flex items-center gap-2.5 py-1.5" style={{ opacity: r.state === "far" ? 0.55 : 1 }}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 font-data text-ui font-semibold tabular-nums"
                          style={r.state === "had" ? { borderColor: INK, backgroundColor: INK, color: rankInk(r.rank) } : { borderColor: INK_SOFT, color: INK_SOFT, borderStyle: r.state === "far" ? "dashed" : "solid" }}>{r.rank}</span>
                    <span className="min-w-0 flex-1">
                      {r.state === "had" ? (
                        <>
                          <span className="block truncate text-ui font-semibold">{th ? r.title.th : r.title.en}</span>
                          <span className="block font-data text-label tabular-nums" style={{ color: JADE }}>{th ? `ถึงแล้ว · ${fmt(r.at)} แต้ม` : `reached · ${fmt(r.at)} points`}</span>
                          {gift && has && (
                            <span className="mt-0.5 flex items-center gap-1 text-label" data-lines-gift={gift.id}><TownIcon name={gift.id as IconName} size={16} /><span className="truncate">{th ? gift.name.th : gift.name.en}</span></span>
                          )}
                          {gift && !has && (
                            <button type="button" disabled={busy} onClick={() => take(r.rank)} data-lines-take={r.rank}
                                    className="pressable mt-1 min-h-8 rounded-md border-2 px-2.5 text-label font-semibold disabled:opacity-50" style={{ borderColor: "#8a5a12", backgroundColor: "#f0c060", color: "#3a2513" }}>{th ? "รับของขั้นนี้" : "Take this rank's gift"}</button>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="block text-ui font-semibold" style={{ color: INK_SOFT }}>???</span>
                          {r.state === "next" && <span className="block font-data text-label tabular-nums" style={{ color: INK_SOFT }}>{th ? `ต้องถึง ${fmt(r.at)} แต้ม (อีก ${fmt(Math.max(0, r.at - mine.points))})` : `at ${fmt(r.at)} points (${fmt(Math.max(0, r.at - mine.points))} to go)`}</span>}
                        </>
                      )}
                    </span>
                    {r.state === "had" && (
                      <button type="button" disabled={busy || isWorn} onClick={() => wear({ line: picked, rank: r.rank })} data-lines-wear={r.rank} aria-pressed={isWorn}
                              className="pressable min-h-9 shrink-0 rounded-md border-2 px-2.5 text-meta font-semibold disabled:opacity-100"
                              style={isWorn ? { borderColor: JADE, backgroundColor: JADE, color: "#fff" } : { borderColor: INK_SOFT, color: INK }}>
                        {isWorn ? (th ? "ใส่อยู่" : "Worn") : (th ? "ใส่ฉายานี้" : "Wear")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        )}
      </section>
    </div>
  );
}

/** The rank somebody has on each line, for whoever wants them at a glance. */
export const ranksOf = (told: LinesTold) => Object.fromEntries(ALL_LINE_IDS.map((id) => [id, rankOf(id, told.lines[id].points)])) as Record<LineId, number>;
