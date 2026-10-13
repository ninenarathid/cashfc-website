"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadMyFace } from "./my-face";

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

/**
 * Who the signed-in member is, as the site would name them anywhere else.
 *
 * Written once and used by everything that has to show "you" — the header, the
 * top of the profile page — because two of those disagreeing is exactly the bug
 * this replaces: the header said the Discord handle beside a Discord avatar
 * while the page underneath said the character. The account is how somebody got
 * in; the character is who they are here.
 *
 * The order is the site's order everywhere: the picture they chose, then the
 * Lodestone's, then whatever the provider they signed in with had. That last one
 * only survives for a guest with no character linked, which is the one case
 * where there is nothing else to show.
 */
export function useMyFace(): {
  ready: boolean;
  characterId: number | null;
  name: string | null;
  avatar: string | null;
  userId: string | null;
  error: boolean;
  retry(): void;
} {
  const [state, setState] = useState<{
    ready: boolean; characterId: number | null;
    name: string | null; avatar: string | null;
    userId: string | null; error: boolean;
  }>({ ready: false, characterId: null, name: null, avatar: null, userId: null, error: false });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setState((s) => ({ ...s, ready: true })); return; }

    let stopped = false, generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resolve = async (user: import("@supabase/supabase-js").User | null) => {
      const mine = ++generation;
      clearTimeout(timer);
      if (!user) {
        setState({ ready: true, characterId: null, name: null, avatar: null, userId: null, error: false });
        return;
      }
      setState(s => s.userId === user.id ? s : { ready: false, characterId: null, name: null, avatar: null, userId: user.id, error: false });
      try {
        const face = await loadMyFace(supabase, user);
        if (!stopped && mine === generation) setState({ ...face, ready: true, error: false });
      } catch {
        if (!stopped && mine === generation) {
          setState(s => ({ ...s, ready: true, error: true }));
          timer = setTimeout(retry, Math.min(30_000, 5_000 * (attempt + 1)));
        }
      }
    };
    const initial = generation;
    void supabase.auth.getUser().then(({ data }) => {
      if (!stopped && initial === generation) void resolve(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { void resolve(session?.user ?? null); });
    return () => { stopped = true; generation++; clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, [attempt, retry]);

  return { ...state, retry };
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
