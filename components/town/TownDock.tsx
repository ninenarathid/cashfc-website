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
  if (path === "/town") return null;
  // (resumable() again: leaving from the dock forgets the stay, and the door takes its place at once)
  if (active || (resume && resumable() !== null)) return <TownBar />;
  return canEnterTown ? <TownDoor /> : null;
}

/** The way in, where the dock would be, the same size and look. */
function TownDoor() {
  const { lang } = useLang();
  const th = lang === "th";
  return (
    <div role="region" aria-label="Cash Town"
         className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0 sm:w-[26rem]">
      {/* data-state: the site's quiet pop-in (globals.css), off for reduced motion. */}
      <Link href="/town" data-state="open"
            className="pop-in group flex items-center gap-3 rounded-2xl border border-line-lit bg-surface/95 p-2 pl-3 no-underline shadow-xl shadow-black/40 backdrop-blur-sm transition-colors hover:border-accent">
        <TownIcon name="town" size={30} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-read font-semibold text-ink">Cash Town</span>
          <span className="block truncate text-ui text-muted">{th ? "เมืองของ FC เดินเล่น คุยกับเพื่อนๆ" : "The FC's town: walk around, chat with friends"}</span>
        </span>
        <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-jade px-4 text-read font-semibold text-bg shadow-lg shadow-black/30 transition-transform group-hover:scale-[1.03] group-active:scale-95">
          <TownIcon name="walk" size={18} />{th ? "เข้าเมือง" : "Go in"}
        </span>
      </Link>
    </div>
  );
}
