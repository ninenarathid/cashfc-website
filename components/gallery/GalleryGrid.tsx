"use client";

import { useCallback, useEffect, useState } from "react";
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

              {isAdmin && (
                <button onClick={() => setHidden(p.id, !p.hidden)}
                        title={p.hidden ? t("gallery.restore") : t("gallery.hide")}
                        className={`absolute right-2 top-2 rounded-md border px-2 py-0.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
                          p.hidden ? "border-jade/60 bg-bg/85 text-jade"
                                   : "border-chili/60 bg-bg/85 text-chili"}`}>
                  {p.hidden ? t("gallery.restore") : t("gallery.hide")}
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
             className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/85 p-4 backdrop-blur-sm sm:items-center">
          <div onClick={(e) => e.stopPropagation()}
               className="w-full max-w-5xl rounded-2xl border border-line bg-surface p-4 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button onClick={() => setOpen(null)} aria-label={t("common.cancel")}
                      className="rounded-lg border border-line px-3 py-1 text-[13px] text-muted hover:border-muted hover:text-ink">
                ✕
              </button>
            </div>
            <PostDetail post={current} authors={authors}
                        onDeleted={() => { setOpen(null); onChanged(); }}
                        onChanged={onChanged} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Everything the gallery needs in one place: the pictures, who posted them, and
 * how many reactions each has.
 *
 * The counts are fetched once for the whole page rather than per tile — four
 * hundred tiles each asking for their own totals is four hundred requests to
 * render one screen. Authors come from profiles rather than from the roster,
 * because a guest with no character can still post.
 */
export function useGallery(characterId?: number) {
  const [supabase] = useState(createClient);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [counts, setCounts] = useState<Record<number, Counts>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setReady(true); return; }

    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", user.user.id).maybeSingle();
      setIsAdmin(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    }

    let q = supabase.from("gallery_posts")
      .select("id, author_id, character_id, image_url, width, height, caption, created_at, hidden")
      .order("created_at", { ascending: false })
      .limit(200);
    if (characterId != null) q = q.eq("character_id", characterId);
    const { data } = await q;
    const rows = (data as GalleryPost[]) ?? [];
    setPosts(rows);

    const ids = rows.map((p) => p.id);
    if (ids.length) {
      const [likeRows, commentRows] = await Promise.all([
        supabase.from("gallery_likes").select("post_id").in("post_id", ids),
        supabase.from("gallery_comments").select("post_id").in("post_id", ids),
      ]);
      const tally: Record<number, Counts> = {};
      for (const id of ids) tally[id] = { likes: 0, comments: 0 };
      for (const r of (likeRows.data ?? []) as { post_id: number }[]) tally[r.post_id].likes++;
      for (const r of (commentRows.data ?? []) as { post_id: number }[]) tally[r.post_id].comments++;
      setCounts(tally);
    }

    const authorIds = [...new Set(rows.map((p) => p.author_id))];
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
      setAuthors(map);
    }
    setReady(true);
  }, [supabase, characterId]);

  useEffect(() => { void load(); }, [load]);
  return { posts, authors, counts, isAdmin, ready, reload: load };
}
