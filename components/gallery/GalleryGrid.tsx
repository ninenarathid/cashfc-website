"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import type { GalleryImage, GalleryPost, Roster } from "@/lib/gallery";
import type { MemberOption } from "@/components/gallery/MemberPicker";
import PostDetail from "@/components/gallery/PostDetail";
import { useAdmin } from "@/lib/admin";
import { useCycle } from "@/components/gallery/useCycle";

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
/**
 * A tile's picture, which turns over on its own when the post holds several.
 *
 * Each tile is given its own offset so the wall does not flip in unison, which
 * would read as a glitch rather than as motion. Both frames stay mounted and
 * cross-fade, so the tile never shows a gap while the next one decodes.
 *
 * Stops entirely when the reader has asked for less motion, and when the tab is
 * in the background — a page quietly swapping images nobody is looking at is
 * just work.
 */
/**
 * How far from square a tile is allowed to get.
 *
 * Letting every picture keep its exact shape sounded right and looked wrong: one
 * portrait shot four times taller than it is wide swallowed an entire column and
 * pushed everything under it off the screen, leaving the column beside it empty.
 * Anything within these bounds is shown exactly as it was taken; anything beyond
 * them is framed to the nearest bound, which crops rather than squashes.
 */
const MIN_RATIO = 0.66;   // tallest allowed, a little narrower than 2:3
const MAX_RATIO = 2.4;    // widest allowed, a shade past a cinematic panorama

function tileRatio(w?: number | null, h?: number | null): number | null {
  if (!w || !h) return null;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h));
}

function TileImage(
  { post, images, index }: { post: GalleryPost; images: GalleryImage[]; index: number },
) {
  const many = images.length > 1;
  const i = useCycle(images.length, index);
  // The space is already reserved, so a picture arriving can fade in rather
  // than snapping into a hole — which is what makes a long scroll feel calm.
  const [shown, setShown] = useState(false);

  const ratio = tileRatio(post.width, post.height);
  const natural = post.width && post.height ? post.width / post.height : null;
  // Only the extremes are cropped; everything in between keeps its own shape.
  const cropped = ratio != null && natural != null
    && Math.abs(ratio - natural) > 0.001;
  const shape = ratio ? { aspectRatio: String(ratio) } : undefined;

  if (!many) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.image_url} alt={post.caption ?? ""} loading="lazy"
           width={post.width ?? undefined} height={post.height ?? undefined}
           style={shape}
           onLoad={() => setShown(true)}
           className={`block w-full transition-opacity duration-500 ${
             shown ? "opacity-100" : "opacity-0"} ${
             cropped ? "size-full object-cover" : "h-auto"}`} />
    );
  }

  return (
    <div className="relative w-full" style={shape}>
      {images.map((img, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.id} src={img.url} alt="" loading="lazy"
             className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
               n === i ? "opacity-100" : "opacity-0"}`} />
      ))}
    </div>
  );
}

export default function GalleryGrid(
  { posts, authors, counts, images, roster = {}, memberOptions = [],
    onChanged, initialOpen, isAdmin = false }: {
    posts: GalleryPost[];
    authors: Record<string, Author>;
    counts: Record<number, Counts>;
    images: Record<number, GalleryImage[]>;
    roster?: Roster;
    memberOptions?: MemberOption[];
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
    // Restoring from the tile is an admin's control, so it lifts an admin's
    // takedown. A member's own is lifted from inside the picture, where they
    // have actually looked at what they are putting back.
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
      {/* A printed collage rather than a wall: the pictures sit centred on a
          mat with air around all four edges, which is what gives a mixed set of
          shapes a shape of its own. Edge to edge across a wide monitor made the
          same pictures read as a feed that happened to stop somewhere.

          The mat is held to a measure a little wider than the page text and
          centred in whatever room is left, so the collage stays the same object
          on a laptop and on a very wide screen instead of thinning out. */}
      <div className="mx-auto mt-4 w-full max-w-[1040px] rounded-2xl bg-surface/50 p-3 sm:p-4">
        <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 lg:columns-3">
          {posts.map((p, idx) => {
            const c = counts[p.id];
            const shots = images[p.id] ?? [];
            const many = (p.image_count ?? 1) > 1;
            return (
              <div key={p.id} className="group relative mb-3 break-inside-avoid sm:mb-4">
                <button onClick={() => setOpen(p.id)}
                        className="block w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent">
                  <TileImage post={p} images={shots} index={idx} />
                </button>

                {many && (
                  <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-bg/75 px-1.5 py-0.5 font-data text-[11px] text-ink backdrop-blur">
                    {t("gallery.morePictures", { n: p.image_count ?? shots.length })}
                  </span>
                )}

                {/* The caption and the counts, on hover. Both are kept off the
                    tile until then because the wall is for looking at pictures;
                    the words are what you read once one has caught your eye. The
                    caption is clamped to two lines — enough to know what it is,
                    never enough to cover the picture it describes. Always shown
                    on touch, where there is no hover to wait for. */}
                {(p.caption || c?.likes || c?.comments) ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-bg/90 via-bg/70 to-transparent px-3 pb-2.5 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    {p.caption && (
                      <p className="line-clamp-2 text-[12.5px] leading-snug text-ink">
                        {p.caption}
                      </p>
                    )}
                    {(c?.likes || c?.comments) ? (
                      <div className="mt-1 flex gap-2 text-[12px] font-medium text-ink/85">
                        {c.likes > 0 && <span>🥔 {c.likes}</span>}
                        {c.comments > 0 && <span>💬 {c.comments}</span>}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Restoring is offered on the tile because a hidden picture is
                    otherwise only reachable by an admin who remembers it exists.
                    Hiding is not: it lives in the lightbox, where somebody has
                    actually looked at the picture before taking it down. */}
                {isAdmin && (p.hidden || p.owner_hidden) && (
                  <button onClick={() => setHidden(p.id, false)}
                          title={t("gallery.restore")}
                          className="absolute right-2 top-2 rounded-md border border-jade/60 bg-bg/85 px-2 py-0.5 text-[11px] text-jade">
                    {t("gallery.restore")}
                  </button>
                )}

                {(p.hidden || p.owner_hidden) && (
                  <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-chili/60 bg-bg/85 px-2 py-0.5 text-[11px] text-chili">
                    {t("gallery.hiddenTag")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {current && (
        <div role="dialog" aria-modal="true"
             onClick={() => setOpen(null)}
             className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/90 p-2 backdrop-blur-sm sm:p-4">
          <div onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-[1400px] rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:p-4">
            {/* Its own row rather than floated over the picture. Thirty pixels
                is a cheaper price than a button sitting on somebody's
                screenshot, which is what everybody opened this to look at.
                A cross and nothing else: a frame and a word around it were two
                more things drawn next to a photograph that wanted the room. */}
            <div className="mb-1 flex items-center justify-end">
              <button onClick={() => setOpen(null)} aria-label={t("gallery.close")}
                      title={t("gallery.close")}
                      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink">
                <svg viewBox="0 0 24 24" aria-hidden width="19" height="19"
                     fill="none" stroke="currentColor" strokeWidth="1.9"
                     strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <PostDetail post={current} authors={authors} roster={roster}
                        memberOptions={memberOptions}
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
  // Not asked of the database here any more: whether admin controls are drawn is
  // a switch the admin holds, and one answer has to serve the whole page.
  const { isAdmin } = useAdmin();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [images, setImages] = useState<Record<number, GalleryImage[]>>({});
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

    // Only the posts that actually hold several: a single-picture post already
    // carries everything the tile needs on its own row.
    const multi = rows.filter((r) => (r.image_count ?? 1) > 1).map((r) => r.id);
    if (multi.length) {
      const { data: imgs } = await supabase.from("gallery_images")
        .select("id, post_id, url, width, height, position")
        .in("post_id", multi)
        .order("position", { ascending: true });
      const grouped: Record<number, GalleryImage[]> = {};
      for (const im of ((imgs ?? []) as GalleryImage[])) {
        (grouped[im.post_id] ??= []).push(im);
      }
      setImages((prev) => (replace ? grouped : { ...prev, ...grouped }));
    } else if (replace) {
      setImages({});
    }

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

  return { posts, authors, counts, images, isAdmin, ready, hasMore, loading,
           loadMore, reload };
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
