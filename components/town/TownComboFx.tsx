"use client";

import type { ComboCue, ComboEffect } from "@/lib/town/combo-types";

const WORDS: Record<ComboCue, [string,string]> = {
  water: ["สายน้ำตอบรับกัน", "The water answers"],
  wood: ["จังหวะสองเสียงตรงกัน", "Two rhythms meet"],
  echo: ["เสียงสะท้อนขานรับ", "An echo answers"],
};
/** Generic motifs reveal a reaction, never an undiscovered recipe. */
export default function TownComboFx({ cue, effect, th, reduced = false, quiet = false }: {
  cue: ComboCue; effect?: ComboEffect; th: boolean; reduced?: boolean; quiet?: boolean;
}) {
  return <div data-combo-fx={cue} data-still={reduced || undefined} className="bond-fx flex items-center justify-center gap-1 rounded-md border border-[#f0c060]/35 bg-[#281d25]/80 px-2 py-1 text-[#ffe19a]">
    <style href="town-bond-fx" precedence="medium">{`
      @keyframes bond-water { 0% { transform: scale(.75); opacity: .2 } 45% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
      @keyframes bond-wood { 0%, 35% { transform: rotate(-8deg) scale(.85); opacity: .35 } 65% { transform: rotate(5deg) scale(1.1) } 100% { transform: none; opacity: 1 } }
      @keyframes bond-echo { 0% { transform: scale(.6); opacity: .1 } 55% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
      .bond-art { image-rendering: pixelated; animation: bond-water 700ms ease-out both }
      [data-combo-fx=wood] .bond-art { animation-name: bond-wood }
      [data-combo-fx=echo] .bond-art { animation-name: bond-echo }
      .bond-fx[data-still] .bond-art, [data-town-lines][data-still] .bond-art { animation: none }
      @media (prefers-reduced-motion: reduce) { .bond-art { animation: none } }
    `}</style>
    {/* Original generated pixels stay sharp; no next/image interpolation for this sprite. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/town/combos/${cue}-v1.png`} alt="" width={quiet ? 40 : 64} height={quiet ? 40 : 64} className="bond-art shrink-0" />
    <span className="text-meta leading-snug" role={quiet ? undefined : "status"}>
      {effect?.fresh && <strong className="block text-[#fff2c8]">{th ? "ค้นพบความผูกพันใหม่!" : "A new bond discovered!"}</strong>}
      {WORDS[cue][th ? 0 : 1]}
      {effect?.resume !== undefined && <span className="block font-data">{th ? `เริ่มใกล้ฝั่งขึ้น ${Math.round(effect.resume * 100)}%` : `${Math.round(effect.resume * 100)}% closer to shore`}</span>}
    </span>
  </div>;
}
