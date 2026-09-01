"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, postPath, thumbOf,
         type GalleryPost } from "@/lib/gallery";

/**
 * Enough to fill about three columns' worth of masonry without turning the
 * front page into the gallery. Uncropped pictures pack to different heights, so
 * this is a count rather than a promise of exactly three rows.
 */
const SHOW = 18;

/**
 * The pictures the FC is looking at this week, drifting past the front page.
 *
 * Ranked by the same decayed score the gallery uses, so this is genuinely
 * "lately" rather than "best ever" — a wall of the same six all-time favourites
 * would stop being worth a glance after the second visit.
 *
 * Three rows sliding sideways, alternate rows the other way. That shape is what
 * lets the pictures keep their own proportions: every row is a fixed height and
 * each picture takes whatever width its shape asks for, so nothing is cropped
 * and nothing is letterboxed. A grid of equal boxes can only have one of those
 * two, and cropping somebody's screenshot to a square throws away the framing
 * they chose when they took it.
 *
 * It also means the strip is not limited to what fits. A still row shows six
 * pictures; this one shows all of them, a few at a time, in the height of one.
 *
 * Each links straight to its own page rather than opening a lightbox here: the
 * front page is a summary, and the gallery is where you go to browse.
 */
function DriftTile({ post }: { post: GalleryPost }) {
  return (
    <Link href={postPath(post.id)}
          className="group relative mr-2 h-full shrink-0 overflow-hidden rounded-lg border border-line no-underline">
      {/* Height from the row, width from the picture. This is the whole trick:
          nothing is asked to be a shape it is not. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbOf(post)} alt={post.caption ?? ""} loading="lazy"
           className="block h-full w-auto max-w-none object-contain transition-transform duration-300 group-hover:scale-105" />
      {(post.like_count ?? 0) > 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-bg/75 px-1.5 py-0.5 text-[11px] text-ink">
          🥔 {post.like_count}
        </span>
      )}
    </Link>
  );
}

/**
 * One sliding row.
 *
 * The pictures are rendered twice. The track travels exactly half its own
 * width, so at the instant the animation restarts the second copy is sitting
 * where the first began and the loop has no seam. The duplicate is hidden from
 * screen readers, which should hear each picture once.
 */
function DriftRow(
  { posts, seconds, reverse }:
  { posts: GalleryPost[]; seconds: number; reverse?: boolean },
) {
  if (!posts.length) return null;
  return (
    // A fixed height is what lets every picture keep its own width, and so its
    // own shape. Shorter on a phone, where the strip is competing for a screen.
    <div className="drift-row h-[76px] overflow-hidden sm:h-[92px]">
      <div className={`drift ${reverse ? "drift-reverse" : ""}`}
           style={{ "--drift-dur": `${seconds}s` } as React.CSSProperties}>
        {posts.map((p) => <DriftTile key={p.id} post={p} />)}
        <span aria-hidden className="contents">
          {posts.map((p) => <DriftTile key={`copy-${p.id}`} post={p} />)}
        </span>
      </div>
    </div>
  );
}

export default function HotGallery() {
  const { t } = useLang();
  const [posts, setPosts] = useState<GalleryPost[]>([]);

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

    })();
  }, []);

  if (!posts.length) return null;

  // Dealt across the rows rather than sliced into thirds, so each row holds a
  // mix of shapes instead of one row getting all the wide ones.
  const rows: GalleryPost[][] = [[], [], []];
  posts.forEach((p, n) => rows[n % 3].push(p));

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-3 font-display text-lg font-semibold">
        {t("gallery.hotHeading")}
        <Link href="/gallery"
              className="text-[12.5px] font-normal text-accent no-underline hover:underline">
          {t("gallery.seeAll")} →
        </Link>
      </h2>
      {/* Three rows, alternate ones the other way, at speeds that do not divide
          into each other — otherwise they line up into one moving block and the
          eye reads it as a single thing sliding past. */}
      <div className="flex flex-col gap-2">
        {rows.map((row, n) => (
          <DriftRow key={n} posts={row} reverse={n % 2 === 1}
                    seconds={54 + n * 13} />
        ))}
      </div>
    </section>
  );
}
