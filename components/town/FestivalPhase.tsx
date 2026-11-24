"use client";
import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PHASE_ICON, PHASE_NAME, openPhases, shortWhen, soonestClose, untilText, windowOf, type Festival, type Phase } from "@/lib/town/festivals";
import type { TownSession } from "@/lib/town/session";
import TownFoot, { TownFootContext } from "./TownFoot";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * Loy Krathong's phases told in the town (the owner, 2026-11-24: "ประกาศเฟสทำกระทง โหวต ลอย ให้ชัดเจน"):
 * - under the clock, while a phase is open, a chip with what is open and how long it has left; a tap opens the stall;
 * - when a phase opens (or on coming into the town while it is open, once a device), a card at the head that says it,
 *   with the way to the stall, and the same words as a line of the town's chat.
 */
const KEY = "cashtown.festival.heard";
const icon = (name: string) => name as IconName;

interface Told { title: string; line: string; phases: Phase[] }
function tell(f: Festival, phases: Phase[], now: number, th: boolean): Told {
  const until = (k: Phase) => { const w = windowOf(f, k); return w?.until ? shortWhen(w.until, now, th) : ""; };
  if (phases.includes("results")) return { phases, title: th ? "ประกาศผลกระทงดีเด่นแล้ว" : "The krathong awards are out",
    line: th ? "ดูผลที่ซุ้มกระทง และหอเกียรติยศข้างน้ำพุ" : "See them at the stall and the hall by the fountain" };
  // (the festival's evening: entries still open, and the float with them: 2026-11-24, entries until midnight)
  if (phases.includes("make") && phases.includes("float")) return { phases, title: th ? "เปิดลอยกระทงแล้ว" : "Floating is open",
    line: th ? `ทำกระทงแล้วลอยได้เลย · ส่งประกวดได้ถึง ${until("make")}` : `Make one and float it · entries close ${until("make")}` };
  if (phases.includes("vote") && phases.includes("float")) return { phases, title: th ? "เปิดโหวตกระทงแล้ว" : "Voting is open",
    line: th ? `ให้ popoto กระทงที่ชอบ ถึง ${until("vote")} · ยังลอยได้ถึง ${until("float")}` : `Give popoto until ${until("vote")} · float until ${until("float")}` };
  if (phases.includes("float")) return { phases, title: th ? "ยังลอยกระทงได้" : "Floating is still open",
    line: th ? `ลอยได้ถึง ${until("float")}` : `Float until ${until("float")}` };
  if (phases.includes("vote")) return { phases, title: th ? "เปิดโหวตกระทงแล้ว" : "Voting is open", line: th ? `ถึง ${until("vote")}` : `Until ${until("vote")}` };
  return { phases, title: th ? "เปิดส่งกระทงประกวดแล้ว" : "Krathong entries are open",
    line: th ? `ประกอบกระทงที่ซุ้มข้างบอร์ด Popoto · ปิด ${until("make")}` : `Build one at the stall by the Popoto Board · closes ${until("make")}` };
}

export default function FestivalPhase({ f, session, th, hidden, onOpen }: {
  f: Festival | null; session: TownSession | null; th: boolean; hidden: boolean; onOpen: () => void;
}) {
  const { head } = useContext(TownFootContext);
  const [now, setNow] = useState(() => Date.now());
  const [card, setCard] = useState<Told | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const phases = f ? openPhases(f, now) : [];
  const sig = f && phases.length ? `${f.id}:${phases.join("+")}` : "";

  // (told once a device a phase: what was last told is kept; a phase opening while I am in town is told then)
  useEffect(() => {
    if (!f || !sig) return;
    let heard = "";
    try { heard = localStorage.getItem(KEY) ?? ""; } catch { /* not kept: told each time */ }
    if (heard === sig) return;
    const told = tell(f, phases, Date.now(), th);
    setCard(told);
    // (a line of the town's chat, numbered below the database's announcements so the two never meet)
    let h = 0;
    for (const c of sig) h = (h * 31 + c.charCodeAt(0)) | 0;
    session?.townAnnouncement(-1 - Math.abs(h), `${told.title} · ${told.line}`, Date.now(), th ? "ลอยกระทง" : "Loy Krathong");
    try { localStorage.setItem(KEY, sig); } catch { /* as above */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  useEffect(() => { if (!card) return; const t = setTimeout(() => setCard(null), 15_000); return () => clearTimeout(t); }, [card]);

  if (!f || !phases.length) return null;
  const close = soonestClose(f, now);
  const names = phases.map((k) => (th ? PHASE_NAME[k].th : PHASE_NAME[k].en)).join(" · ");
  return (
    <>
      {!hidden && (
        <TownFoot rank="corner">
          <button type="button" onClick={onOpen} data-festival-phase={phases.join("+")}
                  aria-label={`${names}${close ? (th ? ` เหลือ ${untilText(close, now, th)}` : ` ${untilText(close, now, th)} left`) : ""}`}
                  className="pop-in pressable pointer-events-auto flex min-h-11 max-w-full items-center gap-2 border-2 border-[#2a1b12] bg-[#c8975a] px-3 text-ui font-bold text-[#2b1a0c] shadow-[inset_0_2px_0_#e9c78b,inset_0_-3px_0_#a47238]">
            <TownIcon name={icon(PHASE_ICON[phases[0]])} size={22} />
            <span className="truncate">{names}</span>
            {close && <span className="shrink-0 rounded bg-[#3d2913] px-1.5 py-px font-data text-label tabular-nums text-[#f3e3c3]">{th ? "เหลือ " : ""}{untilText(close, now, th)}</span>}
          </button>
        </TownFoot>
      )}
      {card && head && !hidden && createPortal(
        <aside role="status" data-festival-card={card.phases.join("+")}
               className="pop-in pointer-events-auto relative flex w-[min(32rem,calc(100vw-1.5rem))] items-center gap-3 rounded-lg border-2 border-[#c39a5b] bg-[#2b211a]/97 p-2 pr-11 text-[#f3e3c3] shadow-[inset_0_0_0_1px_#4e3e28,0_3px_0_#17120e,0_8px_24px_#0006]">
          <div className="grid size-16 shrink-0 place-items-center rounded-sm border border-[#a58556] bg-[radial-gradient(ellipse_at_50%_40%,#2c4a5e_0%,#1a2c3d_60%,#0f1b27_100%)]">
            <TownIcon name={icon(PHASE_ICON[card.phases[card.phases.length - 1]])} size={44} />
          </div>
          <div className="min-w-0 py-1">
            <p className="text-[15px] font-semibold leading-snug text-[#fff0d1]">{card.title}</p>
            <p className="text-[13px] leading-relaxed text-[#e2d2b8]">{card.line}</p>
            <button type="button" className="pressable tk tk-btn-wood mt-1.5 min-h-11 px-4 text-ui font-semibold" onClick={() => { setCard(null); onOpen(); }}>
              {th ? "ไปซุ้มกระทง" : "To the stall"}
            </button>
          </div>
          <button type="button" aria-label={th ? "ปิดประกาศ" : "Dismiss"} onClick={() => setCard(null)}
                  className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#f0ca83]">
            <TownIcon name="close" size={16} />
          </button>
        </aside>, head)}
    </>
  );
}
