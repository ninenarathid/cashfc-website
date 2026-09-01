"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, postPath, thumbOf,
         type GalleryPost } from "@/lib/gallery";

/**
 * How many to put on the strip.
 *
 * Every one of these is a thumbnail the browser will fetch — about 95 KB each —
 * so the number is a bandwidth decision as much as a design one. Thirty is
 * roughly 2.8 MB for somebody who watches the whole loop go round, against a
 * budget of about 165 MB a day for the whole site. Fifty would be nearer 4.8 MB
 * and would put the front page alone within reach of that on a busy day, which
 * is the thing we have just spent a week climbing out of.
 *
 * They load lazily, so a short visit costs only what actually drifted past.
 */
const SHOW = 30;

/** Seconds each column takes to cross. Slow: this is scenery, not a carousel. */
const PACE = 4.2;

/**
 * The pictures the FC is looking at this week, on the front page.
 *
 * Ranked by the same decayed score the gallery uses, so this is genuinely
 * "lately" rather than "best ever" — a wall of the same favourites would stop
 * being worth a glance after the second visit.
 *
 * Two rows of small pictures that scroll sideways, and not one of them is
 * cropped. That combination is the whole design problem: a grid of equal cells
 * has to either crop a picture to fit or letterbox it with empty space, and
 * cropping somebody's screenshot throws away the framing they chose when they
 * took it.
 *
 * The way out is to fix the height and let the width follow. Every picture is
 * exactly one row tall — or two, if it is a portrait, which is what gives the
 * strip its varied shape — and as wide as its own proportions make it. Nothing
 * is asked to be a shape it is not, and the top and bottom edges still line up,
 * because those are set by the rows rather than by the pictures.
 *
 * Each links straight to its own page rather than opening a lightbox here: the
 * front page is a summary, and the gallery is where you go to browse.
 */

/** A picture taller than this much of its width gets a column to itself. */
const PORTRAIT = 1.1;
/**
 * Widest a single picture may be, measured in row heights.
 *
 * The box is otherwise built from the picture's own ratio, so it fits exactly
 * and nothing is cropped. This only comes into play for something wider than
 * four to one, where one picture would otherwise take the whole strip and the
 * strip would stop being a row of pictures.
 */
const MAX_ASPECT = 4;

const aspectOf = (p: GalleryPost) =>
  p.width && p.height ? p.width / p.height : 3 / 2;

interface Column {
  tall?: GalleryPost;
  top?: GalleryPost;
  bottom?: GalleryPost;
}

/**
 * Deal the pictures into columns of one tall or two stacked.
 *
 * Portraits go full height because at one row tall they would be slivers, and
 * because a strip of nothing but landscapes reads as a filmstrip rather than as
 * a wall. Everything else pairs up, in the order it arrived, so the ranking
 * survives the layout.
 *
 * An odd one left at the end is dropped rather than left sitting alone in a
 * half-empty column — with two dozen pictures to choose from, a gap in the row
 * costs more than the picture does.
 */
function pack(posts: GalleryPost[]): Column[] {
  const columns: Column[] = [];
  let pending: GalleryPost | null = null;
  for (const p of posts) {
    if (aspectOf(p) < 1 / PORTRAIT) {
      columns.push({ tall: p });
      continue;
    }
    if (pending) {
      columns.push({ top: pending, bottom: p });
      pending = null;
    } else {
      pending = p;
    }
  }
  return columns;
}

function Tile({ post, rows }: { post: GalleryPost; rows: 1 | 2 }) {
  // Height comes from the row, width from the picture's own proportions. Both
  // are set before it loads, so the strip does not reflow as pictures arrive.
  const a = Math.min(aspectOf(post), MAX_ASPECT * rows);
  const h = rows === 2
    ? "calc(var(--row-h) * 2 + var(--row-gap))"
    : "var(--row-h)";
  return (
    <Link href={postPath(post.id)}
          style={{ height: h, width: `calc(${h} * ${a})` }}
          className="group relative block shrink-0 overflow-hidden rounded-lg border border-line no-underline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbOf(post)} alt={post.caption ?? ""} loading="lazy"
           className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      {/* The same overlay the gallery wall uses, and hidden the same way: out
          of sight until somebody looks at one, because a caption on every tile
          is a wall of text over a wall of pictures. On a touchscreen there is
          no hover to wait for, so it simply shows. */}
      {(post.caption || (post.like_count ?? 0) > 0 || (post.comment_count ?? 0) > 0) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 via-bg/70 to-transparent px-2.5 pb-2 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {post.caption && (
            <p className="line-clamp-2 text-[12px] leading-snug text-ink">
              {post.caption}
            </p>
          )}
          {((post.like_count ?? 0) > 0 || (post.comment_count ?? 0) > 0) && (
            <div className="mt-1 flex gap-2 text-[11.5px] font-medium text-ink/85">
              {(post.like_count ?? 0) > 0 && <span>🥔 {post.like_count}</span>}
              {(post.comment_count ?? 0) > 0 && <span>💬 {post.comment_count}</span>}
            </div>
          )}
        </div>
      )}
    </Link>
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
      setPosts(((data as GalleryPost[]) ?? []).filter((p) => p.image_url));
    })();
  }, []);

  const columns = useMemo(() => pack(posts), [posts]);
  if (!posts.length) return null;

  const column = (col: Column, key: string) => (
    <div key={key} className="mr-2 flex shrink-0 flex-col gap-2">
      {col.tall && <Tile post={col.tall} rows={2} />}
      {col.top && <Tile post={col.top} rows={1} />}
      {col.bottom && <Tile post={col.bottom} rows={1} />}
    </div>
  );

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-3 font-display text-lg font-semibold">
        {t("gallery.hotHeading")}
        <Link href="/gallery"
              className="text-[12.5px] font-normal text-accent no-underline hover:underline">
          {t("gallery.seeAll")} →
        </Link>
      </h2>

      {/* It moves on its own rather than waiting to be pushed. A strip that
          only scrolls when somebody finds the arrows is a strip most people see
          the first six pictures of; one that drifts shows the whole wall to
          anybody who glances at it twice. It pauses under the cursor, because a
          link that slides away is a link nobody catches.

          The two numbers the layout is built from live here, so the tiles can
          do their arithmetic in CSS and stay right at every width. */}
      <div className="drift-row full-bleed overflow-hidden [--row-gap:8px] [--row-h:168px] sm:[--row-h:222px]">
        <div className="drift"
             style={{ ["--drift-dur" as string]: `${columns.length * PACE * 2}s` }}>
          {columns.map((c, i) => column(c, `a${i}`))}
          {/* The second pass, for the seam. Hidden from screen readers, which
              should hear each picture once. */}
          <span aria-hidden className="contents">
            {columns.map((c, i) => column(c, `b${i}`))}
          </span>
        </div>
      </div>
    </section>
  );
}
