"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, type Roster } from "@/lib/gallery";
import GalleryGrid, { LoadMore, useGallery, type Sort } from "@/components/gallery/GalleryGrid";
import PollCard from "@/components/gallery/PollCard";
import HotExplainer from "@/components/gallery/HotExplainer";
import GalleryUpload from "@/components/gallery/GalleryUpload";

/**
 * The gallery.
 *
 * Open to the FC unless an admin closes it, which is a site setting rather than
 * a rule in the database: whether a page is linked and reachable is a product
 * decision the FC can reverse from /admin without a migration. Individual
 * pictures are a different matter — a hidden one is enforced in the read policy,
 * so it does not leave the database for anybody but an admin.
 */
interface Option { id: number; name: string; avatar?: string | null }

export default function GalleryPage(
  { openId, memberOptions = [] }:
  { openId?: number | null; memberOptions?: Option[] },
) {
  const roster: Roster = useMemo(() => {
    const out: Roster = {};
    for (const o of memberOptions) out[o.id] = { name: o.name, avatar: o.avatar ?? null };
    return out;
  }, [memberOptions]);
  const { t } = useLang();
  const [supabase] = useState(createClient);
  // The site setting, separately from whether this particular reader gets in.
  // Kept apart because the switch that decides the second arrives a moment after
  // the first: folding them together in an effect would have settled the answer
  // while the admin flag was still false and never revisited it.
  const [open, setOpen] = useState<boolean | null>(null);
  // The poster starts folded away. Somebody arriving here is far more likely
  // to be looking than posting, and a form above the fold pushes the pictures —
  // the entire reason for the page — below it.
  const [posting, setPosting] = useState(false);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("hot");

  // Typing runs ahead of the database, so the request waits for a pause rather
  // than firing on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const { posts, authors, counts, images, tagged, isAdmin, ready, hasMore, loading,
          loadMore, reload } = useGallery({ sort, query });


  useEffect(() => {
    void (async () => {
      if (!supabase) { setOpen(false); return; }
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      setOpen((setting as { value?: string } | null)?.value !== "off");
    })();
  }, [supabase]);

  // The site setting or the reader's own standing; either lets them in.
  const allowed = open === null ? null : (open || isAdmin);
  if (allowed === null) {
    return <main className="pt-7 text-muted">{t("common.loading")}</main>;
  }
  if (!allowed) notFound();

  return (
    <main className="pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
            {t("gallery.eyebrow")}
          </div>
          <h1 className="font-display text-3xl font-bold">{t("gallery.title")}</h1>
        </div>
        <button onClick={() => setPosting((v) => !v)}
                className={`rounded-lg border px-4 py-2 text-[13.5px] transition-colors ${
                  posting ? "border-line text-muted hover:border-muted hover:text-ink"
                          : "border-accent bg-accent/15 text-accent hover:bg-accent/25"}`}>
          {posting ? t("gallery.closePoster") : `+ ${t("gallery.openPoster")}`}
        </button>
      </div>

      {posting && (
        <div className="mt-4">
          <GalleryUpload onPosted={() => { setPosting(false); void reload(); }}
                         memberOptions={memberOptions} />
        </div>
      )}

      {/* Stays within reach while scrolling, because a feed is long and going
          back to the top to change the sort is the kind of small friction that
          stops somebody browsing. */}
      {(posts.length > 0 || typed) && (
        <div className="sticky top-0 z-30 -mx-4 mt-4 flex flex-wrap gap-2.5 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur">
          <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)}
                 placeholder={t("gallery.search")} aria-label={t("gallery.search")}
                 className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted" />
          <div className="flex overflow-hidden rounded-lg border border-line"
               role="group" aria-label={t("gallery.sortHot")}>
            {([["hot", "gallery.sortHot"], ["new", "gallery.sortNew"],
               ["top", "gallery.sortTop"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)}
                      aria-pressed={sort === key}
                      className={`px-3 py-2 text-[13px] transition-colors ${
                        sort === key ? "bg-accent/15 text-accent"
                                     : "text-muted hover:bg-card hover:text-ink"}`}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="mt-8 flex items-center justify-center gap-2.5 text-[13px] text-muted">
          <span aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          {t("common.loading")}
        </div>
      )}

      {ready && !(loading && posts.length === 0) && (
        posts.length === 0 && query ? (
          <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] text-muted">
            {t("gallery.nothingFound")}
          </div>
        ) : (
          <>
            {sort === "hot" && <HotExplainer />}
            <PollCard />
            <GalleryGrid posts={posts} authors={authors} counts={counts}
                         images={images} tagged={tagged} roster={roster} memberOptions={memberOptions}
                         isAdmin={isAdmin}
                         onChanged={reload} initialOpen={openId ?? null} />
            <LoadMore onVisible={loadMore} active={hasMore && !loading} />
            {loading && (
              <p className="py-4 text-center text-[12.5px] text-muted">
                {t("gallery.loadingMore")}
              </p>
            )}
          </>
        )
      )}
    </main>
  );
}
