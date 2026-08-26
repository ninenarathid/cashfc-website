"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The faces members chose for themselves, laid over the ones the Lodestone gave
 * them.
 *
 * Every page on this site is built from members.json, which is written by the
 * nightly crawler and knows nothing about anybody's account. A picture a member
 * uploaded this afternoon cannot be in it, and rebuilding five hundred static
 * pages because somebody changed their portrait would be a strange trade.
 *
 * So the overrides arrive separately: one small query, once per page load,
 * shared by everything on the page through this context. Only members who
 * actually chose a picture have a row, which in practice is a handful — the
 * response is a few hundred bytes and the board renders immediately with the
 * Lodestone portraits either way.
 *
 * That ordering is deliberate. The board is readable before this resolves, and a
 * face swapping in a moment later is a far better failure than an empty circle
 * waiting on a request that may never come back.
 */
type Overrides = Record<number, string>;

const AvatarCtx = createContext<Overrides>({});

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      // Verified only: an unverified claim to a character is somebody's typing,
      // and a picture attached to it would be a face on a stranger's name.
      const { data } = await supabase.from("profiles")
        .select("character_id, avatar_url")
        .not("avatar_url", "is", null)
        .not("character_id", "is", null)
        .not("character_verified_at", "is", null);
      const out: Overrides = {};
      for (const r of (data ?? []) as { character_id: number; avatar_url: string }[]) {
        out[r.character_id] = r.avatar_url;
      }
      setOverrides(out);
    })();
  }, []);

  return <AvatarCtx.Provider value={overrides}>{children}</AvatarCtx.Provider>;
}

/** Every chosen face on the page, keyed by character. */
export function useAvatarOverrides(): Overrides {
  return useContext(AvatarCtx);
}

/**
 * The picture to show for one character: what they chose, or what the Lodestone
 * has, or nothing — in that order, everywhere on the site.
 */
export function useAvatar(
  characterId: number | null | undefined,
  fallback?: string | null,
): string | null {
  const overrides = useContext(AvatarCtx);
  if (characterId != null && overrides[characterId]) return overrides[characterId];
  return fallback ?? null;
}
