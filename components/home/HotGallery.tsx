"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, postPath,
         type GalleryImage, type GalleryPost } from "@/lib/gallery";
import { useCycle } from "@/components/gallery/useCycle";

const SHOW = 6;

/**
 * The pictures the FC is looking at this week, on the front page.
 *
 * Ranked by the same decayed score the gallery uses, so this is genuinely
 * "lately" rather than "best ever" — a wall of the same six all-time favourites
 * would stop being worth a glance after the second visit.
 *
 * Each one links straight to its own page rather than opening a lightbox here:
 * the front page is a summary, and the gallery is where you go to browse.
 *
 * A post holding several pictures turns over on the spot, the same way it does
 * on the gallery wall — six squares that never change are a screenshot of the
 * gallery, and the point of this strip is that there is more behind it.
 */
function HotTile(
  { post, images, index }:
  { post: GalleryPost; images: GalleryImage[]; index: number },
) {
  const i = useCycle(images.length, index);
  if (images.length < 2) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.image_url} alt={post.caption ?? ""} loading="lazy"
           className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
    );
  }
  // Both frames stay mounted and cross-fade, so the tile never shows a gap while
  // the next picture decodes.
  return (
    <div className="size-full transition-transform duration-300 group-hover:scale-105">
      {images.map((img, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.id} src={img.url} alt="" loading="lazy"
             className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
               n === i ? "opacity-100" : "opacity-0"}`} />
      ))}
    </div>
  );
}

export default function HotGallery() {
  const { t } = useLang();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [images, setImages] = useState<Record<number, GalleryImage[]>>({});

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      if ((setting as { value?: string } | null)?.value === "off") return;
      const { data } = await supabase.rpc("gallery_feed", {
        p_sort: "hot", p_query: null, p_limit: SHOW, p_offset: 0, p_character: null,
      });
      const rows = ((data as GalleryPost[]) ?? []).filter((p) => p.image_url);
      setPosts(rows);

      // Only the posts that actually hold several: a single-picture post already
      // carries everything its tile needs on its own row.
      const multi = rows.filter((p) => (p.image_count ?? 1) > 1).map((p) => p.id);
      if (!multi.length) return;
      const { data: imgs } = await supabase.from("gallery_images")
        .select("id, post_id, url, width, height, position")
        .in("post_id", multi).order("position", { ascending: true });
      const grouped: Record<number, GalleryImage[]> = {};
      for (const im of ((imgs ?? []) as GalleryImage[])) {
        (grouped[im.post_id] ??= []).push(im);
      }
      setImages(grouped);
    })();
  }, []);

  if (!posts.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-3 font-display text-lg font-semibold">
        {t("gallery.hotHeading")}
        <Link href="/gallery"
              className="text-[12.5px] font-normal text-accent no-underline hover:underline">
          {t("gallery.seeAll")} →
        </Link>
      </h2>
      {/* A fixed-height strip rather than a masonry: this is a glance, and the
          row has to stay the same shape however tall the pictures in it are. */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {posts.map((p, n) => (
          <Link key={p.id} href={postPath(p.id)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-line no-underline">
            <HotTile post={p} images={images[p.id] ?? []} index={n} />
            {(p.like_count ?? 0) > 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-bg/75 px-1.5 py-0.5 text-[11px] text-ink">
                🥔 {p.like_count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
