"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import type { GalleryPost } from "@/lib/gallery";
import PostDetail from "@/components/gallery/PostDetail";

interface Author { id: string; name: string; characterId: number | null; avatar: string | null }

/**
 * The wall of pictures, and the one you clicked.
 *
 * CSS columns rather than a measured masonry: the browser balances the columns
 * itself, so there is no layout pass to run on resize and nothing to go wrong
 * when a picture arrives late. Each tile reserves its real aspect ratio from the
 * width and height stored at upload, so the grid settles once instead of
 * reshuffling as images load.
 *
 * Opening a picture puts its id in the URL. A lightbox that cannot be linked to
 * is a lightbox somebody has to describe over voice chat, and the back button
 * should close it rather than leave the gallery.
 */
export default function GalleryGrid(
  { posts, authors, onChanged, initialOpen }: {
    posts: GalleryPost[];
    authors: Record<string, Author>;
    onChanged: () => void;
    initialOpen?: number | null;
  },
) {
  const { t } = useLang();
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

  if (!posts.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] leading-relaxed text-muted">
        {t("gallery.empty")}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 [column-fill:_balance] columns-2 gap-3 sm:columns-3 lg:columns-4">
        {posts.map((p) => (
          <button key={p.id} onClick={() => setOpen(p.id)}
                  className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-line bg-surface text-left transition-colors hover:border-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt={p.caption ?? ""} loading="lazy"
                 width={p.width ?? undefined} height={p.height ?? undefined}
                 style={p.width && p.height
                   ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                 className="w-full object-cover" />
            {p.caption && (
              <div className="truncate px-2.5 py-1.5 text-[12px] text-muted">
                {p.caption}
              </div>
            )}
          </button>
        ))}
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
                        onDeleted={() => { setOpen(null); onChanged(); }} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Everything the gallery needs in one place: the pictures and who posted them.
 * Authors come from profiles rather than from the roster, because a guest with
 * no character can still post one.
 */
export function useGallery(characterId?: number) {
  const [supabase] = useState(createClient);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setReady(true); return; }
    let q = supabase.from("gallery_posts")
      .select("id, author_id, character_id, image_url, width, height, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (characterId != null) q = q.eq("character_id", characterId);
    const { data } = await q;
    const rows = (data as GalleryPost[]) ?? [];
    setPosts(rows);

    const ids = [...new Set(rows.map((p) => p.author_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, character_id, character_name, display_name, discord_username, discord_avatar")
        .in("id", ids);
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
  return { posts, authors, ready, reload: load };
}
