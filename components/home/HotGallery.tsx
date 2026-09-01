"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, postPath, thumbOf,
         type GalleryPost } from "@/lib/gallery";

/** Enough to be worth scrolling, few enough to arrive at once. */
const SHOW = 24;

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
      {(post.like_count ?? 0) > 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-bg/75 px-1.5 py-0.5 text-[11px] text-ink">
          🥔 {post.like_count}
        </span>
      )}
    </Link>
  );
}

export default function HotGallery() {
  const { t } = useLang();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const strip = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ start: true, end: true });

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

  // Which arrows are worth showing. An arrow that cannot move anything is a
  // button that teaches people the strip is broken.
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setAt({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, posts]);

  const nudge = (dir: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    // Most of a screenful, not all of it: a column left showing is what tells
    // somebody the strip carried on rather than started again.
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const columns = useMemo(() => pack(posts), [posts]);
  if (!posts.length) return null;

  /**
   * A way on to the next few pictures, at the edge it moves towards.
   *
   * Over the strip rather than up in the heading, because that is where the
   * hand already is and where the movement happens. It fades out at the end it
   * cannot travel any further towards, and goes untabbable with it: an arrow
   * that does nothing is worse than no arrow, and one that does nothing but
   * still takes a tab stop is worse again.
   */
  const arrow = (dir: 1 | -1, done: boolean) => (
    <button onClick={() => nudge(dir)} tabIndex={done ? -1 : 0} aria-hidden={done}
            aria-label={dir === 1 ? "Later pictures" : "Earlier pictures"}
            className={`absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/80 text-ink shadow-lg backdrop-blur transition-all hover:border-accent hover:text-accent ${
              dir === 1 ? "right-1" : "left-1"} ${
              done ? "pointer-events-none opacity-0" : "opacity-90 hover:opacity-100"}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden
           stroke="currentColor" strokeWidth="2.2"
           strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 1 ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
      </svg>
    </button>
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

      {/* The two numbers the whole layout is built from, declared once here so
          the tiles can do their arithmetic in CSS and stay right at every
          width. Scrolled natively as well as by the arrows, so a touchscreen
          swipes it and a trackpad does what a trackpad does — the bar itself is
          hidden, because the arrows say the same thing and a scrollbar under a
          row of pictures is a piece of furniture nobody asked for. */}
      <div className="relative">
      {arrow(-1, at.start)}
      {arrow(1, at.end)}
      <div ref={strip} onScroll={measure}
           className="-mx-1 flex snap-x snap-proximity gap-2 overflow-x-auto px-1 [--row-gap:8px] [--row-h:112px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:[--row-h:148px]">
        {columns.map((col, i) => (
          <div key={i} className="flex shrink-0 snap-start flex-col gap-2">
            {col.tall && <Tile post={col.tall} rows={2} />}
            {col.top && <Tile post={col.top} rows={1} />}
            {col.bottom && <Tile post={col.bottom} rows={1} />}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
