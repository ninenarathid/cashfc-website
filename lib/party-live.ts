"use client";

import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The board, kept current without anybody pressing reload.
 *
 * A party finder is the one page on this site where a stale copy actively costs
 * something. Two people looking at the last open healer seat both take it,
 * because neither could see the other do it; somebody watches a party they are
 * waiting on and cannot tell whether nothing has happened or whether their
 * browser simply has not asked. The fix is the same one Discord gets for free
 * and a list of rows does not.
 *
 * Reload rather than patch. A change event says a row changed and hands over
 * that row, but the board is three tables stitched together — a new member row
 * has to find its party, be sorted into seats or floaters, and go back through
 * the resolver — and applying that by hand means writing the join a second
 * time, in a second place, where it can disagree with the first. Refetching
 * three small queries is a fraction of a second and cannot drift.
 *
 * Debounced, because one action is several events: creating a party writes the
 * listing and then eight member rows, and a fetch per row would be nine fetches
 * for one thing happening.
 */
export function useLiveParties(
  supabase: SupabaseClient | null,
  refresh: () => void | Promise<void>,
  enabled = true,
): void {
  // The callback changes identity on every render of the board. Kept in a ref
  // so that does not tear down and rebuild the subscription each time — which
  // would drop events in the gap, and drop exactly the ones that arrive while
  // the board is busy re-rendering.
  const cb = useRef(refresh);
  cb.current = refresh;

  useEffect(() => {
    if (!supabase || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void cb.current(); }, 400);
    };

    /*
     * The database tells the board (v272): a write to any of its tables (the
     * listings, the seats, the comments and their reactions, the questions)
     * sends one hint with nothing in it to this private channel, once a
     * statement; a page may only hear it, not send it.
     * It used to ride the change feed, whose poll of the database ran ten
     * times a second for as long as anybody listened (2026-10-16).
     */
    let gone = false;
    const ch = supabase.channel("party-board", { config: { private: true } })
      .on("broadcast", { event: "changed" }, soon);
    void supabase.realtime.setAuth().catch(() => {}).then(() => { if (!gone) ch.subscribe(); });

    return () => {
      gone = true;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(ch);
    };
  }, [supabase, enabled]);
}
