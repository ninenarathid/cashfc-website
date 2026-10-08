"use client";

import { useState } from "react";
import { CHARMS, USES, dueOf, giftOf, usesLeft, type CharmId, type FamiliarId, type Gift, type Gifts, type ThingId } from "@/lib/town/gifts";
import type { Keeper } from "@/lib/town/keeper";
import { ALL_LINE_IDS, LINES, type LinesTold } from "@/lib/town/lines";
import TownIcon, { type IconName } from "./TownIcon";

const CREAM = "#ffeccb", CREAM_SOFT = "#e9cfa4", HOLLOW = "#3a2513", GOLD = "#f0c060";
const PAPER = "#f0dfb6", PAPER_EDGE = "#d9bf85", INK = "#4a3520", INK_SOFT = "#7a5f3c", JADE = "#2f7d4f";

/**
 * "ตัวฉัน": what I wear of the gifts of my ranks (the owner, 2026-10-06: "อาจต้องมีหน้าจอ UI สำหรับ Equipment … ใช้ในการใส่ ภูติ
 * หรือ สัตว์เดินตามได้ 1 ชนิด"; "ช่องเครื่องราง 2 ช่อง"; "ผูกกับตัวทั้งหมด ไม่นับรวมใน ช่องเก็บของ"; a familiar changed "อิสระ").
 *
 * - **Two places for charms.** A charm worn works by itself, with nothing held for it: the hand stays free for the
 *   hoe or the rod. A tap on one worn takes it off; a tap on one I have puts it on, where there is a place.
 * - **A shelf of things**: the gifts that are neither worn nor follow (lib/town/gifts' things). Each works by itself
 *   once had, or is used where its line's game is played; the shelf says what each does and, where it is counted, how
 *   many times it may still be used in this stretch. Nothing is used from here.
 * - **A place for a familiar**: the one that follows me, for everybody to see; a tap sends it to rest, a tap on
 *   another I have calls that one. Empty until a rank gives one, and then it says nothing of what is to come.
 * - **What waits to be taken**: the gift of a rank I have reached and not taken, with a button. Only then is it named.
 * - What I have not got is a number and no more ("ของที่ยังไม่ได้: ไม่บอกชื่อ บอกแค่จำนวน").
 *
 * A panel of the lines' board (TownLines), on its wood. With the keeper busy nothing is pressed twice.
 */
export default function TownMe({ keeper, told, gifts, given, th }: { keeper: Keeper; told: LinesTold; gifts: Gifts; given: readonly string[]; th: boolean }) {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const points = Object.fromEntries(ALL_LINE_IDS.map((id) => [id, told.lines[id].points]));
  const due = dueOf(points, { gifts }).filter((g) => given.includes(g.id)), worn = gifts.charms, full = worn.length >= CHARMS.slots;
  const fams = gifts.had.filter((id) => giftOf(id)?.kind === "familiar") as FamiliarId[], fam = gifts.familiar ? giftOf(gifts.familiar) : null;
  const got = gifts.had.filter((id) => given.includes(id)).length, left = given.length - got;
  const spare = gifts.had.filter((id) => giftOf(id)?.kind === "charm" && !worn.includes(id as CharmId)) as CharmId[];
  const things = gifts.had.filter((id) => giftOf(id)?.kind === "thing") as ThingId[];
  /** How a count's stretch is said. */
  const stretch = (id: string) => { const u = USES[id as ThingId]; return !u ? "" : u.per === "day" ? (th ? "วันนี้" : "today") : u.per === "meal" ? (th ? "มื้อนี้" : "these hours") : (th ? "ตอนนี้" : "now"); };
  const act = async (what: () => Promise<{ ok: boolean }>, no: string) => {
    if (busy) return;
    setBusy(true); setSaid(null);
    const did = await what();
    if (!did.ok) setSaid(no);
    setBusy(false);
  };
  const wear = (ids: CharmId[]) => act(() => keeper.charmsWear(ids), th ? "ใส่ไม่ได้ ลองอีกครั้งนะ" : "That could not be worn. Try again.");
  const take = (g: Gift) => act(() => keeper.giftTake(g.line, g.rank), th ? "รับไม่ได้ ลองอีกครั้งนะ" : "That could not be taken. Try again.");
  const follow = (id: FamiliarId | null) => act(() => keeper.familiarWear(id), th ? "เรียกภูตไม่ได้ ลองอีกครั้งนะ" : "It would not come. Try again.");
  const slots = Array.from({ length: CHARMS.slots }, (_, i) => (worn[i] ? giftOf(worn[i]) : null));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-color:#6b4a2a_transparent] [scrollbar-width:thin]" data-town-me>
      <style href="town-me" precedence="medium">{`
        @keyframes tm-in { from { opacity: 0; transform: translateY(4px) scale(.96) } to { opacity: 1; transform: none } }
        .tm-in { animation: tm-in 220ms cubic-bezier(.2, .8, .2, 1) }
        @keyframes tm-glint { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
        .tm-glint { animation: tm-glint 1.8s ease-in-out infinite }
        [data-town-lines][data-still] .tm-in, [data-town-lines][data-still] .tm-glint { animation: none }
      `}</style>

      {/* ── what waits to be taken ── */}
      {due.length > 0 && (
        <section className="mb-2 rounded-[4px] border-[3px] px-3 py-2" style={{ borderColor: GOLD, backgroundColor: "#5a3a1c" }} aria-label={th ? "ของที่รอรับ" : "Waiting to be taken"}>
          <h3 className="flex items-center gap-1.5 text-ui font-semibold" style={{ color: GOLD }}><span aria-hidden className="tm-glint inline-block size-2 rounded-full" style={{ backgroundColor: GOLD }} />{th ? "มีของรอรับ" : "Something waits for you"}</h3>
          <ul className="mt-1.5 grid gap-1.5">
            {due.map((g) => (
              <li key={g.id} className="flex items-center gap-2.5" data-me-due={g.id}>
                <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#2a190d]" style={{ backgroundColor: HOLLOW }}><TownIcon name={LINES[g.line].icon as IconName} size={24} /></span>
                <span className="min-w-0 flex-1 text-meta" style={{ color: CREAM }}>{th ? `ของขั้น ${g.rank} ของ${LINES[g.line].name.th}` : `The gift of rank ${g.rank}, ${LINES[g.line].name.en.toLowerCase()}`}</span>
                <button type="button" disabled={busy} onClick={() => take(g)} data-me-take={g.id}
                        className="pressable min-h-10 shrink-0 rounded-md border-2 border-[#2a190d] px-3 text-meta font-semibold disabled:opacity-50" style={{ backgroundColor: GOLD, color: "#3a2513" }}>{th ? "รับของ" : "Take it"}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-2 min-[900px]:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── the charms worn ── */}
        <section className="rounded-[4px] border-[3px] border-[#2a190d] px-3 py-2.5" style={{ backgroundColor: HOLLOW }} aria-label={th ? "เครื่องราง" : "Charms"} data-me-worn={worn.join(",")}>
          <h3 className="flex items-baseline gap-2 text-ui font-semibold" style={{ color: CREAM }}>
            {th ? "เครื่องราง" : "Charms"}
            <span className="font-data text-label tabular-nums" style={{ color: CREAM_SOFT }}>{worn.length} / {CHARMS.slots}</span>
          </h3>
          <p className="text-label" style={{ color: CREAM_SOFT }}>{th ? "ใส่แล้วมีผลเอง ไม่ต้องถือในมือ" : "A charm worn works by itself: nothing to hold"}</p>
          <ul className="mt-2 grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
            {slots.map((g, i) => (
              <li key={g ? g.id : `empty-${i}`}>
                {g ? (
                  <button type="button" disabled={busy} onClick={() => wear(worn.filter((id) => id !== g.id))} data-me-slot={g.id} title={th ? "แตะเพื่อถอด" : "Tap to take off"}
                          className="tm-in pressable flex w-full items-center gap-2.5 rounded-md border-2 px-2.5 py-2 text-left disabled:opacity-60" style={{ borderColor: GOLD, backgroundColor: "#5a3a1c" }}>
                    <span className="grid size-14 shrink-0 place-items-center rounded-md border-2 border-[#2a190d]" style={{ backgroundColor: "#2b1a0c" }}><TownIcon name={g.id as IconName} size={40} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui font-semibold" style={{ color: CREAM }}>{th ? g.name.th : g.name.en}</span>
                      <span className="block text-label leading-snug" style={{ color: CREAM_SOFT }}>{th ? g.does.th : g.does.en}</span>
                      <span className="mt-0.5 block font-data text-label" style={{ color: GOLD }}>{th ? "ใส่อยู่ · แตะเพื่อถอด" : "Worn · tap to take off"}</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex min-h-[4.75rem] items-center gap-2.5 rounded-md border-2 border-dashed px-2.5 py-2" style={{ borderColor: "#6b4a2a" }} data-me-slot="">
                    <span className="grid size-14 shrink-0 place-items-center rounded-md border-2 border-dashed" style={{ borderColor: "#6b4a2a" }} aria-hidden />
                    <span className="text-meta" style={{ color: CREAM_SOFT }}>{th ? "ช่องว่าง" : "An empty place"}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <h4 className="mt-3 text-meta font-semibold" style={{ color: CREAM }}>{th ? "เครื่องรางที่มี" : "Charms you have"}</h4>
          {spare.length === 0 ? (
            <p className="mt-1 text-label" style={{ color: CREAM_SOFT }} data-me-none>
              {!gifts.had.some((id) => giftOf(id)?.kind === "charm") ? (th ? "ยังไม่มีเครื่องราง ขั้นแรกของแต่ละสายมีของให้" : "None yet. The first rank of a line gives one.") : (th ? "ใส่ครบทุกชิ้นที่มีแล้ว" : "Every one you have is worn.")}
            </p>
          ) : (
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 min-[520px]:grid-cols-2">
              {spare.map((id) => {
                const g = giftOf(id)!;
                return (
                  <li key={id}>
                    <button type="button" disabled={busy || full} onClick={() => wear([...worn, id])} data-me-charm={id}
                            className="pressable flex w-full items-center gap-2 rounded-md border-2 border-[#2a190d] bg-[#4a2f18] px-2 py-1.5 text-left hover:bg-[#523520] disabled:opacity-55">
                      <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#2a190d]" style={{ backgroundColor: "#2b1a0c" }}><TownIcon name={id as IconName} size={28} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-meta font-semibold" style={{ color: CREAM }}>{th ? g.name.th : g.name.en}</span>
                        <span className="block text-label leading-snug" style={{ color: CREAM_SOFT }}>{th ? g.does.th : g.does.en}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {full && spare.length > 0 && <p className="mt-1.5 text-label" style={{ color: CREAM_SOFT }} data-me-full>{th ? "ช่องเต็มแล้ว แตะชิ้นที่ใส่อยู่เพื่อถอดก่อน" : "Both places are taken: tap one that is worn to take it off first."}</p>}
          <p className="mt-1.5 min-h-4 text-label" role="status" aria-live="polite" style={{ color: "#ffb09c" }}>{said}</p>
        </section>

        {/* ── a familiar's place, and what is still to get ── */}
        <div className="grid content-start gap-2">
          <section className="rounded-[4px] border-[3px] border-[#2a190d] px-3 py-2.5" style={{ color: INK, backgroundColor: PAPER, backgroundImage: `linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 7%, transparent 93%, ${PAPER_EDGE} 100%)` }}
                   aria-label={th ? "ภูตคู่ใจ" : "A familiar"} data-me-familiar="">
            <h3 className="text-ui font-semibold">{th ? "ภูตคู่ใจ" : "A familiar"}</h3>
            {fam ? (
              <button type="button" disabled={busy} onClick={() => follow(null)} data-me-fam={fam.id} title={th ? "แตะเพื่อให้พัก" : "Tap to send it to rest"}
                      className="tm-in pressable mt-1.5 flex w-full items-center gap-2.5 rounded-md border-2 px-2 py-1.5 text-left disabled:opacity-60" style={{ borderColor: JADE, backgroundColor: "rgba(47,125,79,0.12)" }}>
                <span className="grid size-14 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: JADE, backgroundColor: PAPER_EDGE }}><TownIcon name={fam.id as IconName} size={40} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold">{th ? fam.name.th : fam.name.en}</span>
                  <span className="block text-label leading-snug" style={{ color: INK_SOFT }}>{th ? fam.does.th : fam.does.en}</span>
                  {USES[fam.id] && (() => { const n = usesLeft(keeper.purse(), fam.id, keeper.now()); return <span className="mt-0.5 block font-data text-label tabular-nums" style={{ color: n ? JADE : "#b0452f" }} data-me-fam-left={n}>{th ? `${stretch(fam.id)}เหลือ ${n}/${USES[fam.id]!.n}` : `${n}/${USES[fam.id]!.n} left ${stretch(fam.id)}`}</span>; })()}
                  <span className="mt-0.5 block font-data text-label" style={{ color: JADE }}>{th ? "เดินตามอยู่ · แตะเพื่อให้พัก" : "Following you · tap to send it to rest"}</span>
                </span>
              </button>
            ) : (
              <div className="mt-1.5 flex items-center gap-2.5" data-me-fam="">
                <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-dashed font-data text-title" style={{ borderColor: INK_SOFT, color: INK_SOFT }} aria-hidden>{fams.length ? "" : "?"}</span>
                <p className="min-w-0 flex-1 text-meta leading-snug" style={{ color: INK_SOFT }}>
                  {fams.length ? (th ? "ยังไม่มีภูตเดินตาม แตะตัวที่มีเพื่อเรียก" : "None follows you now. Tap one you have to call it.") : (th ? "ยังไม่ได้พบภูตตัวใด ภูตจะเดินตามเราไปทุกที่" : "No familiar met yet. One follows you wherever you go.")}
                </p>
              </div>
            )}
            {fams.filter((id) => id !== gifts.familiar).length > 0 && (
              <ul className="mt-2 grid gap-1.5">
                {fams.filter((id) => id !== gifts.familiar).map((id) => {
                  const g = giftOf(id)!;
                  return (
                    <li key={id}>
                      <button type="button" disabled={busy} onClick={() => follow(id)} data-me-call={id}
                              className="pressable flex w-full items-center gap-2 rounded-md border-2 px-2 py-1.5 text-left hover:brightness-95 disabled:opacity-55" style={{ borderColor: INK_SOFT, backgroundColor: "rgba(74,53,32,0.06)" }}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: INK_SOFT, backgroundColor: PAPER_EDGE }}><TownIcon name={id as IconName} size={28} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-meta font-semibold">{th ? g.name.th : g.name.en}</span>
                          <span className="block text-label leading-snug" style={{ color: INK_SOFT }}>{th ? g.does.th : g.does.en}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {things.length > 0 && (
            <section className="rounded-[4px] border-[3px] border-[#2a190d] px-3 py-2.5" style={{ color: INK, backgroundColor: PAPER, backgroundImage: `linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 7%, transparent 93%, ${PAPER_EDGE} 100%)` }}
                     aria-label={th ? "ของวิเศษ" : "Things"} data-me-things={things.join(",")}>
              <h3 className="text-ui font-semibold">{th ? "ของวิเศษ" : "Things"}</h3>
              <p className="text-label" style={{ color: INK_SOFT }}>{th ? "มีแล้วใช้ได้เลย ไม่ต้องใส่" : "Yours to use: nothing to put on."}</p>
              <ul className="mt-1.5 grid gap-1.5">
                {things.map((id) => {
                  const g = giftOf(id)!, use = USES[id], left = use ? usesLeft(keeper.purse(), id, keeper.now()) : null;
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-md border-2 px-2 py-1.5" style={{ borderColor: INK_SOFT, backgroundColor: "rgba(74,53,32,0.06)" }} data-me-thing={id} data-left={left ?? ""}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-md border-2" style={{ borderColor: INK_SOFT, backgroundColor: PAPER_EDGE }}><TownIcon name={id as IconName} size={28} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-meta font-semibold">{th ? g.name.th : g.name.en}</span>
                        <span className="block text-label leading-snug" style={{ color: INK_SOFT }}>{th ? g.does.th : g.does.en}</span>
                        {use && <span className="mt-0.5 block font-data text-label tabular-nums" style={{ color: left ? JADE : "#b0452f" }}>{th ? `${stretch(id)}เหลือ ${left}/${use.n}` : `${left}/${use.n} left ${stretch(id)}`}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section className="rounded-[4px] border-[3px] border-[#2a190d] px-3 py-2.5" style={{ color: INK, backgroundColor: PAPER, backgroundImage: `linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 7%, transparent 93%, ${PAPER_EDGE} 100%)` }}
                   aria-label={th ? "ของที่สะสมได้" : "What you have"} data-me-count={`${got}/${given.length}`}>
            <h3 className="text-ui font-semibold">{th ? "ของที่สะสมได้" : "What you have"}</h3>
            <p className="mt-0.5 font-data text-read tabular-nums"><span style={{ color: JADE }}>{got}</span> <span style={{ color: INK_SOFT }}>/ {given.length}</span></p>
            <p className="text-label" style={{ color: INK_SOFT }}>
              {left <= 0 ? (th ? "ได้ครบทุกชิ้นที่มีตอนนี้แล้ว" : "You have every one there is for now.") : (th ? `ยังมีอีก ${left} ชิ้นที่ยังไม่ได้ ไต่ขั้นแต่ละสายเพื่อรู้ว่าเป็นอะไร` : `${left} still to get: climb a line to learn what they are.`)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
