"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import type { GalleryPost } from "@/lib/gallery";
import PostDetail from "@/components/gallery/PostDetail";

interface Author { id: string; name: string; characterId: number | null; avatar: string | null }
export interface Counts { likes: number; comments: number }

/**
 * The wall of pictures, and the one you clicked.
 *
 * CSS columns rather than a measured masonry: the browser balances the columns
 * itself, so there is no layout pass to run on resize and nothing to go wrong
 * when a picture arrives late.
 *
 * Every picture keeps its own shape. Nothing is cropped to a common ratio and
 * nothing is stretched — a tall GPose portrait stays tall next to a wide group
 * shot, which is what a masonry layout is for. The stored width and height only
 * reserve the right space up front, so the column does not jump as images load.
 *
 * Opening a picture puts its id in the URL. A lightbox that cannot be linked to
 * is one somebody has to describe over voice chat, and the back button should
 * close it rather than leave the gallery.
 */
export default function GalleryGrid(
  { posts, authors, counts, onChanged, initialOpen, isAdmin = false }: {
    posts: GalleryPost[];
    authors: Record<string, Author>;
    counts: Record<number, Counts>;
    onChanged: () => void;
    initialOpen?: number | null;
    isAdmin?: boolean;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [open, setOpen] = useState<number | null>(initialOpen ?? null);
  const current = posts.find((p) => p.id === open) ?? null;

  // Escape closes, and the page underneath must not scroll while it is open.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [current]);

  async function setHidden(id: number, hidden: boolean) {
    if (!supabase) return;
    await supabase.from("gallery_posts").update({ hidden }).eq("id", id);
    onChanged();
  }

  if (!posts.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] leading-relaxed text-muted">
        {t("gallery.empty")}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 columns-2 gap-3 sm:columns-3 lg:columns-4">
        {posts.map((p) => {
          const c = counts[p.id];
          return (
            <div key={p.id} className="group relative mb-3 break-inside-avoid">
              <button onClick={() => setOpen(p.id)}
                      className="block w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.caption ?? ""} loading="lazy"
                     width={p.width ?? undefined} height={p.height ?? undefined}
                     style={p.width && p.height
                       ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                     className="block h-auto w-full" />
              </button>

              {/* Counts on hover only, and only when there is something to say —
                  a wall of "0 · 0" would be noise on a page that is about the
                  pictures. Always visible on touch, where there is no hover. */}
              {(c?.likes || c?.comments) ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 rounded-b-xl bg-gradient-to-t from-bg/85 to-transparent px-2.5 pb-2 pt-6 text-[12px] font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  {c.likes > 0 && <span>🥔 {c.likes}</span>}
                  {c.comments > 0 && <span>💬 {c.comments}</span>}
                </div>
              ) : null}

              {/* Restoring is offered on the tile because a hidden picture is
                  otherwise only reachable by an admin who remembers it exists.
                  Hiding is not: it lives in the lightbox, where somebody has
                  actually looked at the picture before taking it down. */}
              {isAdmin && p.hidden && (
                <button onClick={() => setHidden(p.id, false)}
                        title={t("gallery.restore")}
                        className="absolute right-2 top-2 rounded-md border border-jade/60 bg-bg/85 px-2 py-0.5 text-[11px] text-jade">
                  {t("gallery.restore")}
                </button>
              )}

              {p.hidden && (
                <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-chili/60 bg-bg/85 px-2 py-0.5 text-[11px] text-chili">
                  {t("gallery.hiddenTag")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {current && (
        <div role="dialog" aria-modal="true"
             onClick={() => setOpen(null)}
             className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/90 p-2 backdrop-blur-sm sm:p-4">
          <div onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-[1400px] rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:p-4">
            {/* Floated over the picture rather than given a row of its own, so
                the close button costs no height the image could have had. */}
            <button onClick={() => setOpen(null)} aria-label={t("common.cancel")}
                    className="absolute right-4 top-4 z-10 rounded-lg border border-line bg-bg/80 px-3 py-1 text-[13px] text-muted backdrop-blur hover:border-muted hover:text-ink">
              ✕
            </button>
            <PostDetail post={current} authors={authors}
                        onDeleted={() => { setOpen(null); onChanged(); }}
                        onChanged={onChanged} />
          </div>
        </div>
      )}
    </>
  );
}

/** Pictures per fetch. Small enough that the first screen arrives quickly. */
const PAGE = 24;

export type Sort = "hot" | "new" | "top";

/**
 * Everything the gallery needs, a page at a time, ordered and searched in the
 * database.
 *
 * Both used to happen here, over whatever had been scrolled into memory — which
 * quietly meant "the newest few dozen", so a search could miss a picture that
 * existed and Top could name the wrong winner. gallery_feed does the work where
 * the whole table is, and this asks it for one page at a time.
 *
 * Changing the sort or the search starts the list again from the top, because
 * page four of one ordering has nothing to do with page four of another.
 */
export function useGallery(
  { characterId, sort = "hot", query = "" }:
  { characterId?: number; sort?: Sort; query?: string } = {},
) {
  const [supabase] = useState(createClient);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  // In a ref as well as in state: two scroll events can fire before React
  // re-renders, and without this the same page is fetched twice.
  const busy = useRef(false);
  // Every fetch carries the query it belongs to, so a slow first page cannot
  // land after a faster second one and overwrite it.
  const run = useRef(0);

  const fetchPage = useCallback(async (from: number, replace: boolean) => {
    if (!supabase) { setReady(true); setHasMore(false); return; }
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const ticket = replace ? ++run.current : run.current;

    const { data, error } = await supabase.rpc("gallery_feed", {
      p_sort: sort,
      p_query: query.trim() || null,
      p_limit: PAGE,
      p_offset: from,
      p_character: characterId ?? null,
    });

    if (ticket !== run.current) { busy.current = false; return; }

    const rows = (error ? [] : (data as GalleryPost[])) ?? [];
    setPosts((prev) => {
      if (replace) return rows;
      const seen = new Set(prev.map((x) => x.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(rows.length === PAGE);

    const authorIds = [...new Set(rows.map((r) => r.author_id))];
    if (authorIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, character_id, character_name, display_name, discord_username, discord_avatar")
        .in("id", authorIds);
      const map: Record<string, Author> = {};
      for (const r of (profs ?? []) as Record<string, unknown>[]) {
        map[r.id as string] = {
          id: r.id as string,
          name: (r.character_name as string | null)
            ?? (r.display_name as string | null)
            ?? (r.discord_username as string | null) ?? "—",
          characterId: (r.character_id as number | null) ?? null,
          avatar: (r.discord_avatar as string | null) ?? null,
        };
      }
      setAuthors((prev) => (replace ? map : { ...prev, ...map }));
    } else if (replace) {
      setAuthors({});
    }

    setReady(true);
    setLoading(false);
    busy.current = false;
  }, [supabase, sort, query, characterId]);

  const reload = useCallback(async () => {
    setHasMore(true);
    await fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || busy.current) return;
    void fetchPage(posts.length, false);
  }, [hasMore, posts.length, fetchPage]);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", user.user.id).maybeSingle();
      setIsAdmin(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    })();
  }, [supabase]);

  // Sort and search are part of fetchPage's identity, so this restarts the list
  // whenever either changes.
  useEffect(() => { void fetchPage(0, true); }, [fetchPage]);

  // The counts now travel on the row itself, kept by database triggers, so the
  // grid no longer needs a second query to know them.
  const counts = useMemo(() => {
    const out: Record<number, Counts> = {};
    for (const p of posts) {
      out[p.id] = { likes: p.like_count ?? 0, comments: p.comment_count ?? 0 };
    }
    return out;
  }, [posts]);

  return { posts, authors, counts, isAdmin, ready, hasMore, loading, loadMore, reload };
}

/**
 * The strip at the end of the list that asks for the next page when it comes
 * into view. Given room below the fold so the next page is already arriving by
 * the time somebody reaches the bottom.
 */
export function LoadMore(
  { onVisible, active }: { onVisible: () => void; active: boolean },
) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) onVisible(); },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, active]);
  return <div ref={ref} aria-hidden className="h-4" />;
}
