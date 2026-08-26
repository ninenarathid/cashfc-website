"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import GalleryGrid, { LoadMore, useGallery } from "@/components/gallery/GalleryGrid";
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
export default function GalleryPage({ openId }: { openId?: number | null }) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const { posts, authors, counts, isAdmin, ready, hasMore, loading, loadMore, reload } =
    useGallery();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? posts.filter((p) =>
          (p.caption ?? "").toLowerCase().includes(q)
          || (authors[p.author_id]?.name ?? "").toLowerCase().includes(q))
      : posts;

    // Hot is reactions decayed by age, so a picture from this morning with two
    // popotos can sit above one from last month with five. Halving every four
    // days is roughly the pace an FC's attention moves at: a good shot stays up
    // for a week or so and then makes room. Comments count for less than a
    // popoto because they are cheaper to leave, and the +1 keeps a brand new
    // picture with no reactions from scoring zero and sinking on arrival.
    const HALF_LIFE_H = 96;
    const hot = (p: (typeof posts)[number]) => {
      const c = counts[p.id];
      const weight = (c?.likes ?? 0) * 2 + (c?.comments ?? 0) + 1;
      const hours = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
      return weight * Math.pow(0.5, hours / HALF_LIFE_H);
    };

    const out = [...rows];
    if (sort === "new") {
      out.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sort === "top") {
      out.sort((a, b) => (counts[b.id]?.likes ?? 0) - (counts[a.id]?.likes ?? 0)
        || b.created_at.localeCompare(a.created_at));
    } else {
      out.sort((a, b) => hot(b) - hot(a));
    }
    return out;
  }, [posts, authors, counts, query, sort]);

  useEffect(() => {
    void (async () => {
      if (!supabase) { setAllowed(false); return; }
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      if ((setting as { value?: string } | null)?.value !== "off") { setAllowed(true); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setAllowed(false); return; }
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      setAllowed(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    })();
  }, [supabase]);

  if (allowed === null) {
    return <main className="pt-7 text-muted">{t("common.loading")}</main>;
  }
  if (!allowed) notFound();

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("gallery.eyebrow")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("gallery.title")}</h1>

      <div className="mt-5">
        <GalleryUpload onPosted={reload} />
      </div>

      {ready && posts.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
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

      {ready && (
        shown.length === 0 && query ? (
          <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] text-muted">
            {t("gallery.nothingFound")}
          </div>
        ) : (
          <>
            <GalleryGrid posts={shown} authors={authors} counts={counts}
                         isAdmin={isAdmin} onChanged={reload}
                         initialOpen={openId ?? null} />
            {/* Kept out of the way while a search is on: filtering the loaded
                set is the point of the box, and pulling in more pages behind it
                would make the result shift under the reader. */}
            {!query && <LoadMore onVisible={loadMore} active={hasMore && !loading} />}
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
