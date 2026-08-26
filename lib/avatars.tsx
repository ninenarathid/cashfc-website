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
} {
  const [state, setState] = useState<{
    ready: boolean; characterId: number | null;
    name: string | null; avatar: string | null;
  }>({ ready: false, characterId: null, name: null, avatar: null });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setState((s) => ({ ...s, ready: true })); return; }

    const resolve = async (userId: string | undefined) => {
      if (!userId) {
        setState({ ready: true, characterId: null, name: null, avatar: null });
        return;
      }
      const { data } = await supabase.from("profiles")
        .select("character_id, character_name, display_name, discord_username, discord_avatar, avatar_url")
        .eq("id", userId).maybeSingle();
      const p = (data ?? {}) as {
        character_id?: number | null; character_name?: string | null;
        display_name?: string | null; discord_username?: string | null;
        discord_avatar?: string | null; avatar_url?: string | null;
      };
      const characterId = p.character_id ?? null;
      const name = p.character_name ?? p.display_name ?? p.discord_username ?? null;
      if (p.avatar_url) {
        setState({ ready: true, characterId, name, avatar: p.avatar_url });
        return;
      }
      // Nothing chosen, so fall back to the character's own portrait. Asked for
      // by id rather than shipped with the page: the header needs one member out
      // of five hundred, and only when somebody is signed in.
      if (characterId) {
        try {
          const res = await fetch(`/api/face/${characterId}`);
          if (res.ok) {
            const face = await res.json() as { name?: string; avatar?: string | null };
            setState({
              ready: true, characterId,
              name: name ?? face.name ?? null,
              avatar: face.avatar ?? p.discord_avatar ?? null,
            });
            return;
          }
        } catch { /* fall through to the account's own picture */ }
      }
      setState({ ready: true, characterId, name, avatar: p.discord_avatar ?? null });
    };

    void supabase.auth.getUser().then(({ data }) => resolve(data.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, session) => { void resolve(session?.user?.id); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
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
