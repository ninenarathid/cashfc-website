"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";
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

/**
 * The width two stacked pictures share, in row heights.
 *
 * Each was given the row's height and whatever width its own shape implied,
 * which meant a pair of different shapes came out different widths and the
 * narrower one sat with a strip of empty page beside it. Nothing was wrong
 * with either picture; the column was simply two widths wide.
 *
 * So the pair is given one width and the split between them moves instead.
 * For a shared width W the two stand W/a1 and W/a2 tall, and those plus the
 * gap have to come to the height of two rows and a gap — which leaves
 * W = 2R / (1/a1 + 1/a2), the harmonic mean of the two aspects. Neither
 * picture is cropped, neither is padded, and the column has one edge.
 */
const pairWidth = (a1: number, a2: number) => 2 / (1 / a1 + 1 / a2);

interface Face { name: string; avatar: string | null }

function Tile(
  { post, w, h, by, others }: {
    post: GalleryPost; w: string; h: string;
    /** Whose picture it is. */
    by?: Face | null;
    /** Everybody else confirmed to be in it. */
    others?: Face[];
  },
) {
  return (
    <Link href={postPath(post.id)}
          style={{ height: h, width: w }}
          className="group relative block shrink-0 overflow-hidden rounded-lg border border-line no-underline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbOf(post)} alt={post.caption ?? ""} loading="lazy"
           className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      {/* The same overlay the gallery wall uses, and hidden the same way: out
          of sight until somebody looks at one, because a caption on every tile
          is a wall of text over a wall of pictures. On a touchscreen there is
          no hover to wait for, so it simply shows. */}
      {(by || post.caption || (post.like_count ?? 0) > 0 || (post.comment_count ?? 0) > 0) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 via-bg/70 to-transparent px-2.5 pb-2 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {/* Whose it is, and who else is in it — the same line the gallery
              wall shows, so a picture says the same thing wherever it is seen.
              A hair smaller here, because these tiles are smaller. */}
          {by && (
            <div className="mb-0.5 flex items-center gap-1.5">
              {by.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={by.avatar} alt="" loading="lazy"
                     className="size-5 shrink-0 rounded-full border border-line object-cover" />
              ) : (
                <span className="size-5 shrink-0 rounded-full border border-line bg-card" />
              )}
              <span className="truncate font-data text-[11.5px] font-semibold text-ink">
                {by.name}
              </span>
              {(others?.length ?? 0) > 0 && (
                <span className="ml-auto flex shrink-0 items-center -space-x-1.5">
                  {others!.slice(0, 3).map((o, n) => (
                    o.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={o.avatar} alt={o.name} title={o.name} loading="lazy"
                           className="size-[18px] rounded-full border border-bg object-cover" />
                    ) : (
                      <span key={n} title={o.name}
                            className="grid size-[18px] place-items-center rounded-full border border-bg bg-card font-data text-[8px] text-ink/80">
                        {o.name.slice(0, 1)}
                      </span>
                    )
                  ))}
                  {others!.length > 3 && (
                    <span className="pl-2 font-data text-[10.5px] text-ink/70">
                      +{others!.length - 3}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
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
  /** Confirmed tags per post, for the hover. */
  const [tagged, setTagged] = useState<Record<number, number[]>>({});
  /** The name and account face for anybody a picture names. */
  const [roster, setRoster] = useState<Record<number, Face>>({});
  // The faces members chose for themselves win over the account ones, the same
  // way they do everywhere else on the site.
  const chosen = useAvatarOverrides();

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
      if (!rows.length) return;

      // Who is in each one. Confirmed tags only: an unconfirmed tag is
      // somebody's guess, and the front page is not the place to publish one.
      const { data: tagRows } = await supabase.from("gallery_tags")
        .select("post_id, character_id")
        .in("post_id", rows.map((r) => r.id))
        .not("confirmed_at", "is", null);
      const seen: Record<number, Set<number>> = {};
      for (const r of (tagRows ?? []) as { post_id: number; character_id: number }[]) {
        (seen[r.post_id] ??= new Set()).add(r.character_id);
      }
      const byPost: Record<number, number[]> = {};
      for (const [pid, ids] of Object.entries(seen)) byPost[Number(pid)] = [...ids];
      setTagged(byPost);

      // Names and faces for everybody either owning one or appearing in one,
      // asked for by id rather than by pulling the whole roster onto the front
      // page — which is eight hundred kilobytes for a dozen names.
      const ids = [...new Set([
        ...rows.map((r) => r.character_id).filter(Boolean) as number[],
        ...Object.values(byPost).flat(),
      ])];
      if (!ids.length) return;
      const { data: people } = await supabase.from("profiles")
        .select("character_id, character_name, display_name, discord_username, discord_avatar")
        .in("character_id", ids);
      const map: Record<number, Face> = {};
      for (const r of (people ?? []) as Record<string, unknown>[]) {
        map[r.character_id as number] = {
          name: (r.character_name as string | null)
            ?? (r.display_name as string | null)
            ?? (r.discord_username as string | null) ?? "—",
          avatar: (r.discord_avatar as string | null) ?? null,
        };
      }
      setRoster(map);
    })();
  }, []);

  /** One member as the hover should draw them, chosen face first. */
  const faceOf = (id: number | null | undefined): Face | null => {
    if (!id) return null;
    const r = roster[id];
    const avatar = chosen[id] ?? r?.avatar ?? null;
    return r || avatar ? { name: r?.name ?? "—", avatar } : null;
  };

  const columns = useMemo(() => pack(posts), [posts]);

  // Everybody in a picture except whoever it already belongs to — naming them
  // twice in one line reads as two different people.
  const othersOf = (p: GalleryPost): Face[] =>
    (tagged[p.id] ?? [])
      .filter((id) => id !== p.character_id)
      .map(faceOf)
      .filter(Boolean) as Face[];
  if (!posts.length) return null;

  const column = (col: Column, key: string) => {
    // A portrait keeps the whole column: its height is the two rows and the gap
    // between them, and its width follows from its own shape as before.
    if (col.tall) {
      const a = Math.min(aspectOf(col.tall), MAX_ASPECT * 2);
      const h = "calc(var(--row-h) * 2 + var(--row-gap))";
      return (
        <div key={key} className="mr-2 flex shrink-0 flex-col gap-2">
          <Tile post={col.tall} h={h} w={`calc(${h} * ${a})`}
                by={faceOf(col.tall.character_id)} others={othersOf(col.tall)} />
        </div>
      );
    }
    if (!col.top || !col.bottom) return null;
    const a1 = Math.min(aspectOf(col.top), MAX_ASPECT);
    const a2 = Math.min(aspectOf(col.bottom), MAX_ASPECT);
    const k = pairWidth(a1, a2);
    const w = `calc(var(--row-h) * ${k})`;
    return (
      <div key={key} className="mr-2 flex shrink-0 flex-col gap-2">
        <Tile post={col.top} w={w} h={`calc(var(--row-h) * ${k / a1})`}
              by={faceOf(col.top.character_id)} others={othersOf(col.top)} />
        <Tile post={col.bottom} w={w} h={`calc(var(--row-h) * ${k / a2})`}
              by={faceOf(col.bottom.character_id)} others={othersOf(col.bottom)} />
      </div>
    );
  };

  return (
    <section className="mt-4">
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
