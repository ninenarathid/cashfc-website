"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { SEATS, isSeat, seatColor, seatIcon, type Seat } from "@/lib/guides";

const KEY = "cashfc_guide_slot";

/**
 * Which seat this reader plays, remembered per browser.
 *
 * The one thing somebody should never have to say twice: a healer opens every
 * guide as a healer. MT until they say otherwise.
 */
export function useSeat(): [Seat, (s: Seat) => void] {
  const [seat, setSeatState] = useState<Seat>("MT");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (isSeat(saved)) setSeatState(saved);
    } catch { /* private window; MT it is */ }
  }, []);
  const setSeat = (s: Seat) => {
    setSeatState(s);
    try { window.localStorage.setItem(KEY, s); } catch { /* ignore */ }
  };
  return [seat, setSeat];
}

/**
 * The seats, pinned under the site's header while the fight scrolls past: eight,
 * or the four of a criterion dungeon's party.
 *
 * Eight across even on a phone (44px each on a 384px one, 41 on 360; 46
 * tall): the whole point is that changing seat is one tap from anywhere in
 * the guide, so it never folds into a menu.
 */
export default function SeatBar(
  { seat, seats = SEATS, onSeat }: { seat: Seat; seats?: readonly Seat[]; onSeat: (s: Seat) => void },
) {
  const { t } = useLang();
  return (
    <div className="sticky top-[var(--nav-h)] z-30 -mx-4 border-b border-line bg-bg/85 px-2 py-2 backdrop-blur sm:px-4">
      <div role="radiogroup" aria-label={t("guide.seat")}
           className={`mx-auto grid gap-0.5 sm:gap-1 ${seats.length === 4 ? "max-w-sm grid-cols-4" : "max-w-xl grid-cols-8"}`}>
        {seats.map((s) => {
          const on = s === seat;
          const c = seatColor(s);
          return (
            <button key={s} type="button" role="radio" aria-checked={on}
                    onClick={() => onSeat(s)}
                    className={`flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${on ? "text-ink" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"}`}
                    style={on ? { borderColor: c, backgroundColor: `${c}33`, boxShadow: `inset 0 0 0 1px ${c}` } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={seatIcon(s)} alt="" width={20} height={20} decoding="async"
                   className={`size-5 rounded-[5px] ${on ? "" : "opacity-70 grayscale-[35%]"}`} />
              <span className="font-data text-label font-semibold leading-none">{s}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
