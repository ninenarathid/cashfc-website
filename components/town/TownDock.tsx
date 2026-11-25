"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { useLang } from "@/lib/i18n";
import { resumable, useTownActive } from "@/lib/town/active";
import TownIcon from "./TownIcon";

const TownBar = dynamic(() => import("./TownBar"), { ssr: false });

/**
 * Cash Town on every page that is not the town: the dock (TownBar) while this
 * tab is in town, so looking at the gallery does not mean leaving it; and for
 * every member who may go in but is not there, a door to it in the same place
 * (the owner, 2026-10-02: "ให้ขึ้นโชว์ตลอด คนจะได้เข้ามากันเยอะๆ").
 *
 * This much is in every page. The dock and the town's code come only for a
 * tab that is in town, or was a moment ago and is coming back after a reload;
 * the door is a link and a picture, and asks nothing of the room (no count of
 * who is in: that would keep a realtime line open on every page).
 */
export default function TownDock() {
  const active = useTownActive();
  const path = usePathname();
  const { canEnterTown } = useAdmin();
  const [resume, setResume] = useState(false);
  useEffect(() => { setResume(resumable() !== null); }, []);
  // The town's own page shows all of it already.
  // (nor on the HD-2D trial, /town/hd-test: the owner, 2026-11-17, "เอาปุ่มนี้ออกให้ด้วย ตอนอยู่ในเมือง hd")
  if (path === "/town" || path?.startsWith("/town/")) return null;
  // (resumable() again: leaving from the dock forgets the stay, and the door takes its place at once)
  if (active || (resume && resumable() !== null)) return <TownBar />;
  return canEnterTown ? <TownDoor /> : null;
}

/**
 * The way in, folded away until asked for (the owner, 2026-11-26: "ช่วยทำให้
 * tab cash town ในเว็บสามารถเลื่อนปิดได้ โดยจะปิดเป็น default ถ้าจะเข้าเมืองค่อยกด
 * เพื่อกดปุ่มเข้าอีกที เพื่อที่จะได้ไม่บังหน้าจอเกินไป").
 *
 * Closed it is one small pill in a corner; a tap opens the card with its
 * "go in" button, and the card folds away again from its ⌄ or, on a phone, a
 * swipe down. Closed on every visit: the state lives here, in the layout, so it
 * survives moving between pages but not a reload.
 */
function TownDoor() {
  const { lang } = useLang();
  const th = lang === "th";
  const [open, setOpen] = useState(false);
  // A swipe down on the open card folds it; the tap that ends a swipe must
  // not also go in.
  const [startY, setStartY] = useState<number | null>(null);
  const [swiped, setSwiped] = useState(false);

  if (!open) {
    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-[45] sm:bottom-5 sm:left-5 sm:right-auto">
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
                aria-label={th ? "เปิดทางเข้า Cash Town" : "Open the way into Cash Town"}
                data-state="open"
                className="pop-in flex h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-1.5 pr-3.5 text-read font-semibold text-ink shadow-xl shadow-black/40 backdrop-blur-sm transition-colors hover:border-accent active:scale-[.97]">
          <TownIcon name="town" size={30} />
          Cash Town
          <span aria-hidden className="text-muted">▴</span>
        </button>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Cash Town"
         onPointerDown={(e) => { if (e.pointerType !== "mouse") { setStartY(e.clientY); setSwiped(false); } }}
         onPointerUp={(e) => {
           if (startY !== null && e.clientY - startY > 40) { setSwiped(true); setOpen(false); }
           setStartY(null);
         }}
         onClickCapture={(e) => { if (swiped) { e.preventDefault(); e.stopPropagation(); setSwiped(false); } }}
         className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[45] mx-auto flex max-w-md touch-pan-x items-stretch gap-1.5 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0 sm:w-[26rem]">
      {/* data-state: the site's quiet pop-in (globals.css), off for reduced motion. */}
      <Link href="/town" data-state="open"
            className="pop-in group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line-lit bg-surface/95 p-2 pl-3 no-underline shadow-xl shadow-black/40 backdrop-blur-sm transition-colors hover:border-accent">
        <TownIcon name="town" size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-read font-semibold text-ink">Cash Town</span>
          <span className="block truncate text-ui text-muted">{th ? "เมืองของ FC เดินเล่น คุยกับเพื่อนๆ" : "The FC's town: walk around, chat with friends"}</span>
        </span>
        <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-jade px-4 text-read font-semibold text-bg shadow-lg shadow-black/30 transition-transform group-hover:scale-[1.03] group-active:scale-95">
          <TownIcon name="walk" size={18} />{th ? "เข้าเมือง" : "Go in"}
        </span>
      </Link>
      {/* Beside the card, not in it: a button may not sit inside the link. */}
      <button type="button" onClick={() => setOpen(false)} aria-expanded={true}
              aria-label={th ? "พับทางเข้า Cash Town เก็บ" : "Fold the way into Cash Town away"}
              data-state="open"
              className="pop-in flex w-11 shrink-0 items-center justify-center rounded-2xl border border-line-lit bg-surface/95 text-muted shadow-xl shadow-black/40 backdrop-blur-sm transition-colors hover:border-accent hover:text-ink active:scale-95">
        <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
    </div>
  );
}
