"use client";

import { useEffect, useState } from "react";
import type { Deed } from "@/lib/town/farm";
import { WISH, type WishId } from "@/lib/town/fountain";
import { hasBuff } from "@/lib/town/stamina";
import type { Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * What shows when a buff is at work (the owner, 2026-10-05: "เมื่อมีบัฟอยู่ การกระทำอะไร หรือ minigame ที่เกี่ยวของจะมี effect
 * พิเศษขึ้นมา ใช้ OPenai gen effect พิเศษได้เลยนะครับ"): a meal's buff or a blessing of the fountain's has a burst of its
 * own (drawn for it: water rings, leaves, clover, a heart, steam with stars, drops), and a little light that
 * twinkles. Where the work is on the map the burst flies up from it (components/town/vfx's "bless"); on a game's
 * board the buffs that have a hand in that game stand at its head, twinkling.
 *
 * Nothing here says what a buff does: it shows that it is there.
 */
export const BURST: Record<WishId, IconName> = {
  calm: "fxRipple", keen: "fxSpark3", lucky: "fxClover", hearty: "fxHeart", green: "fxLeaves",
  swift: "fxRipple", clear: "fxRing2", spring: "fxDrops", sprout: "fxLeaves", feast: "fxSteam",
  carry: "fxDrops", forage: "fxLeaves", net: "fxSpark3",
};
/** The sparkle's frames, as it twinkles: small, grown, at its biggest, gone to a few lights. */
export const SPARKS: IconName[] = ["fxSpark1", "fxSpark2", "fxSpark3", "fxSpark4"];

/** The buffs that have a hand in a line dropped and fought, in the work of the farm, and at the pot. */
export const AT_THE_LINE: WishId[] = ["calm", "keen", "lucky", "swift", "clear", "hearty"];
export const AT_THE_POT: WishId[] = ["feast", "hearty"];
const AT_A_PLOT: Partial<Record<Deed | "draw" | "pour" | "fill", WishId[]>> = { water: ["green", "spring"], sow: ["sprout"], draw: ["carry"] };
/** Which of somebody's buffs have a hand in a piece of the farm's work (every piece costs stamina, so a hearty one always). */
export const atPlot = (work: string, purse: Purse, now: number): WishId[] =>
  [...(AT_A_PLOT[work as Deed] ?? []), "hearty" as WishId].filter((id) => hasBuff(purse, now, id));
/** …and which of them did something that can be seen where the work was done: those get a burst over the plot. */
export const seenAtPlot = (deed: string, purse: Purse, now: number): WishId[] => (AT_A_PLOT[deed as Deed] ?? []).filter((id) => hasBuff(purse, now, id));

/** One little light, twinkling: the sparkle's four frames in turn (one of them, still, when motion is not wanted). */
export function Twinkle({ size = 14, every = 150, from = 0, className = "" }: { size?: number; every?: number; from?: number; className?: string }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setN((x) => x + 1), every);
    return () => clearInterval(t);
  }, [every]);
  return <span aria-hidden className={`pointer-events-none inline-grid place-items-center ${className}`} style={{ width: size, height: size }}><TownIcon name={SPARKS[n % SPARKS.length]} size={size} /></span>;
}

/** The buffs at work on a game's board: each one's own picture, with a light twinkling at its corner. Nothing, when there are none. */
export function BuffAura({ ids, th, size = 22, className = "" }: { ids: WishId[]; th: boolean; size?: number; className?: string }) {
  if (!ids.length) return null;
  return (
    <span className={`flex items-center gap-1.5 ${className}`} data-buffs={ids.join(" ")}>
      {ids.map((id, i) => (
        <span key={id} className="relative grid place-items-center" title={th ? WISH[id].name.th : WISH[id].name.en}>
          <TownIcon name={WISH[id].icon as IconName} size={size} />
          <Twinkle size={Math.round(size * 0.6)} from={i} className="absolute -right-1.5 -top-1.5" />
          <span className="sr-only">{th ? WISH[id].name.th : WISH[id].name.en}</span>
        </span>
      ))}
    </span>
  );
}
