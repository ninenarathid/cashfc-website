"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { LOY_KRATHONG_2026, isOpen, riverOn, stageOf, windowOf, type Festival } from "@/lib/town/festivals";
import type { AwardView, RiverKrathong } from "@/lib/town/krathong";

export interface FestivalLive {
  /** The krathong festival the map shows (this year's Loy Krathong), or null. */
  f: Festival | null;
  river: RiverKrathong[];
  awards: AwardView[] | null;
}

/**
 * The festival calendar for the board and what the map draws of Loy Krathong: the stall while its edition is on,
 * the floated krathongs while the float is open (read every 45 s), the hall once the results are out (every 10 min).
 * A database before v336 says nothing; the calendar is then empty and nothing is drawn.
 */
export function useFestival(keeper: Keeper | null, game: boolean) {
  const [festivals, setFestivals] = useState<Festival[] | null>(null);
  const live = useRef<FestivalLive>({ f: null, river: [], awards: null });
  // (the keeper as it is now, for the readers called from outside a render: the dev hook, a float)
  const keeperRef = useRef(keeper);
  keeperRef.current = keeper;
  const [, setTick] = useState(0);
  const pick = (list: Festival[], now: number): Festival | null => {
    const lk = list.filter((f) => f.slug === "loykrathong").sort((a, b) => b.year - a.year);
    return lk.find((f) => stageOf(f, now) !== "hidden" && (stageOf(f, now) !== "after" || now - Date.parse(f.ends) < 340 * 86_400_000)) ?? null;
  };
  const readRiver = useCallback(async () => {
    const f = live.current.f, keeper = keeperRef.current;
    // (a week after the float closes too, v343: what floats no longer changes then, so it is read with the list, not every 45 s)
    if (!keeper || !f || !riverOn(f, Date.now())) { live.current.river = []; return; }
    const r = await keeper.krathongRiver(f.id);
    if (r) live.current.river = r;
  }, []);
  const readAwards = useCallback(async () => {
    const f = live.current.f, keeper = keeperRef.current;
    if (!keeper || !f || !isOpen(windowOf(f, "results"), Date.now())) return;
    const s = await keeper.krathong(f.id);
    if (s) live.current.awards = s.awards;
  }, []);
  useEffect(() => {
    if (!keeper || !game) return;
    let gone = false;
    const list = async () => {
      const got = await keeper.festivals();
      if (gone) return;
      setFestivals(got ?? []);
      live.current.f = got ? pick(got, Date.now()) : null;
      void readRiver(); void readAwards();
      setTick((n) => n + 1);
    };
    void list();
    const a = setInterval(() => { if (document.visibilityState === "visible") void list(); }, 10 * 60_000);
    const b = setInterval(() => { const f = live.current.f; if (document.visibilityState === "visible" && f && isOpen(windowOf(f, "float"), Date.now())) void readRiver(); }, 45_000);
    const c = setInterval(() => { if (document.visibilityState === "visible") void readAwards(); }, 10 * 60_000);
    return () => { gone = true; clearInterval(a); clearInterval(b); clearInterval(c); };
  }, [keeper, game, readRiver, readAwards]);
  return { festivals, live, readRiver, readAwards, keeper: keeperRef };
}

/** (the calendar's own copy when the database has none: not used for anything but a fallback in tests) */
export const FALLBACK = [LOY_KRATHONG_2026];
