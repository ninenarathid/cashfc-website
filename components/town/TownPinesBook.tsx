"use client";

import { useEffect, useState } from "react";
import { KEEPSAKES, KEEPSAKE_IDS, type KeepsakeId } from "@/lib/town/trees";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";

/** A keepsake's picture: its own (`keep_` and its id), or a branch until that is drawn. */
export const keepsakeIcon = (id: KeepsakeId): IconName => (`keep_${id}` in ICON_ATLAS.icons ? `keep_${id}` : "pineBranch") as IconName;

/**
 * The book of the pines (lib/town/trees' keepsakes): the village's. A leaf for each of the small things a pine lets
 * fall now and then: its picture, its name, a line of what it looks like, who found it first, and how many of it are
 * mine. One nobody has found yet is a shade. A keepsake is no thing of the bag: this book is the one place it is.
 */
export default function TownPinesBook({ th, book, mine, first, onClose }: {
  th: boolean;
  /** What the village has found, each with who found it first (lib/town/trees' TreesTold.book). */
  book: ReadonlyArray<readonly [id: string, by: string]>;
  /** What I have found myself, how many of each. */
  mine: Partial<Record<KeepsakeId, number>>;
  /** The leaf it opens at, if any. */
  first?: KeepsakeId | null;
  onClose: () => void;
}) {
  const by = new Map(book), found = KEEPSAKE_IDS.filter((id) => by.has(id));
  const [at, setAt] = useState<KeepsakeId | null>(first && by.has(first) ? first : found[0] ?? null);
  // Escape shuts the book. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onClose]);
  const seen = at && by.has(at) ? at : null, k = seen ? KEEPSAKES[seen] : null;
  return (
    <section aria-label={th ? "สมุดป่าสน" : "The book of the pines"} data-pines-book data-state="open" data-found={found.length}
             className="pop-in pointer-events-auto w-full max-w-[22rem] select-none rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
      <div className="flex min-h-9 items-center gap-2">
        <TownIcon name={"wellBook" as IconName} size={24} />
        <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{th ? "สมุดป่าสน" : "The book of the pines"}</h2>
        <span className="font-data text-meta tabular-nums text-[#e9cfa4]">{found.length}/{KEEPSAKE_IDS.length}</span>
        <button type="button" onClick={onClose} className="pressable -mr-1 ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "ปิด" : "Close"}</button>
      </div>
      {/* a leaf each: what somebody has found, in its own colours; what nobody has, a shade */}
      <ul className="grid grid-cols-4 gap-1.5">
        {KEEPSAKE_IDS.map((id) => {
          const known = by.has(id), n = mine[id] ?? 0;
          return (
            <li key={id}>
              <button type="button" disabled={!known} aria-pressed={seen === id} onClick={() => setAt(id)} data-pines-leaf={id} data-known={known ? "" : undefined} data-mine={n}
                      aria-label={known ? (th ? KEEPSAKES[id].name.th : KEEPSAKES[id].name.en) : th ? "ยังไม่มีใครพบ" : "Nobody has found this yet"}
                      className={`relative grid aspect-square w-full place-items-center rounded-[4px] border-2 ${seen === id ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#4a2f18]"} ${known ? "pressable" : ""}`}>
                <span className={known ? "" : "opacity-35 brightness-0"}><TownIcon name={keepsakeIcon(id)} size={40} /></span>
                {n > 0 && <span className="absolute bottom-0.5 right-1 font-data text-label tabular-nums text-[#ffe19a]">×{n}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {/* the leaf that is open */}
      <div className="mt-2 min-h-[4.5rem] rounded-[4px] border-2 border-[#2a190d] bg-[#3a2513] px-2.5 py-2 text-label text-[#e9cfa4]" aria-live="polite" data-pines-open={seen ?? undefined}>
        {k && seen ? (
          <>
            <p className="text-ui font-semibold text-[#ffeccb]">{th ? k.name.th : k.name.en}</p>
            <p className="mt-0.5">{th ? k.line.th : k.line.en}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="flex items-center gap-1"><TownIcon name="rosette" size={16} />{th ? `คนแรกที่พบ: ${by.get(seen)}` : `First found by ${by.get(seen)}`}</span>
              <span className="font-data tabular-nums">{th ? `ของฉัน ×${mine[seen] ?? 0}` : `Mine ×${mine[seen] ?? 0}`}</span>
            </p>
          </>
        ) : (
          <p>{th ? "ยังไม่มีใครในหมู่บ้านพบอะไรเลย" : "Nobody in the village has found anything yet"}</p>
        )}
      </div>
    </section>
  );
}
