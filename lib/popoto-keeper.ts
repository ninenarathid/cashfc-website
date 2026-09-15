"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Whether the reader looks after the rare popoto flavours and lines. See v77.
 *
 * Not the admin switch: the flavours are a surprise kept from the other
 * admins too, and the database holds the same rule, so this only decides
 * whether the tab is worth drawing. Each person can ask only about themselves.
 */
export function usePopotoKeeper(): boolean {
  const [keeper, setKeeper] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let live = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: row, error } = await supabase.from("popoto_keepers")
        .select("profile_id").eq("profile_id", uid).maybeSingle();
      if (live) setKeeper(!error && !!row);
    });
    return () => { live = false; };
  }, []);
  return keeper;
}
