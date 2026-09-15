"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RARE_DEMO, realRareDemo, type RareGift } from "@/lib/popoto-rare";

/**
 * Sample gifts for a local test command, while it is on.
 *
 * The real flavours when they can be read (the keeper, locally), so what is
 * tried out is the site as it will be; the built-in samples otherwise.
 * Undefined while off, and while the real ones are still being fetched.
 */
export function useRareDemo(on: boolean): RareGift[] | undefined {
  const [supabase] = useState(createClient);
  const [gifts, setGifts] = useState<RareGift[] | undefined>(undefined);
  useEffect(() => {
    if (!on) { setGifts(undefined); return; }
    let live = true;
    void (supabase ? realRareDemo(supabase) : Promise.resolve(null))
      .then((real) => { if (live) setGifts(real ?? RARE_DEMO); });
    return () => { live = false; };
  }, [on, supabase]);
  return gifts;
}
