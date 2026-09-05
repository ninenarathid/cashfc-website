"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";
import { THUMB_WIDTH as THUMB_W, fullOf, imagesForPosts, thumbOf, type GalleryImage, type GalleryPost, type Roster } from "@/lib/gallery";
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

/**
 * A wide picture takes two columns, a tall one takes one.
 *
 * Columns of equal width make height the only thing that varies, and height is
 * width over the aspect ratio — so a 2:3 portrait stood one and a half times
 * the column while a 16:9 shot stood two fifths of it, and the portrait took
 * three and a half times the area. Members noticed: the tall pictures were the
 * gallery and the wide ones were trim around them.
 *
 * Giving a wide picture two columns is the fix that costs nothing, because it
 * gives it back the width its shape asks for rather than taking height off a
 * portrait by cropping it. A 16:9 across two columns and a 2:3 down one land
 * within a quarter of each other's area.
 *
 * The threshold is a shade above square: anything close to square is happier at
 * one column, where two would make it enormous.
 */
const WIDE_AT = 1.25;

/**
 * One pixel per grid row, and no row gap at all.
 *
 * The gap between tiles is padding on the tile instead. That looks like a
 * detour and is the whole trick: a row of 8px with a 16px gap quantises every
 * tile to the nearest 24, so a cell rounded up to fit its picture could stand
 * a full 24 pixels taller than it — which read as tall pictures having more
 * air above and below them than everything else. At one pixel a row and the
 * gap moved inside the tile, the error is at most one pixel.
 */
const ROW = 1;

/**
 * How many columns fit, decided from the measured width rather than from the
 * breakpoints — the spans below are worked out in JavaScript and would drift
 * from a CSS breakpoint the first time either was changed alone.
 */
function columnsFor(width: number): number {
  if (width < 560) return 1;
  if (width < 900) return 2;
  return 3;
}

function TileImage(
  { post, images, index, width }: {
    post: GalleryPost; images: GalleryImage[]; index: number;
    /** How wide this tile will actually be drawn, in CSS pixels. */
    width: number;
  },
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

  // The thumbnail is 700 pixels across. A tile one column wide is about 325,
  // so even a screen with two device pixels to each CSS one is covered — but a
  // wide picture now takes two columns and is drawn at about 666, where the
  // same screen wants 1332 and the thumbnail is stretched to nearly double.
  // That is the softness, and it arrived with the two-column change.
  //
  // So the bigger copy is offered alongside, and the browser decides. On a
  // one-to-one monitor nothing changes; a dense screen fetches it only for the
  // tiles that would otherwise be soft. Nobody downloads more than the picture
  // they are actually being shown.
  const big = images[0] ? fullOf(images[0]) : null;
  const wide = big && width > 500 && post.width && post.width > 900
    ? { srcSet: `${thumbOf(post)} ${THUMB_W}w, ${big} ${post.width}w`,
        sizes: `${Math.round(width)}px` }
    : {};

  if (!many) {
    return (
      // The small copy by default. This box can be 325 pixels across and the
      // original four thousand; the difference was being paid for by the byte
      // and thrown away by the browser before anybody saw it.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbOf(post)} {...wide} alt={post.caption ?? ""} loading="lazy"
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
        <img key={img.id} src={thumbOf(img)} loading="lazy" alt=""
             srcSet={width > 500 && img.width && img.width > 900
               ? `${thumbOf(img)} ${THUMB_W}w, ${fullOf(img)} ${img.width}w` : undefined}
             sizes={width > 500 ? `${Math.round(width)}px` : undefined}
             className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
               n === i ? "opacity-100" : "opacity-0"}`} />
      ))}
    </div>
  );
}

export default function GalleryGrid(
  { posts, authors, counts, images, tagged = {}, roster = {}, memberOptions = [],
    onChanged, initialOpen, isAdmin = false }: {
    posts: GalleryPost[];
    authors: Record<string, Author>;
    counts: Record<number, Counts>;
    images: Record<number, GalleryImage[]>;
    /** Confirmed tags per post — who is in the picture. */
    tagged?: Record<number, number[]>;
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

  // The face a member chose for themselves, which is the one they are known by
  // everywhere else on the site. Without it a wall of pictures bylines people
  // with the Lodestone portrait they may have replaced months ago.
  const chosen = useAvatarOverrides();

  // The mat's inner width, watched rather than guessed: every span below is a
  // count of 8px rows, and a row count only means anything once the width a
  // picture will actually be drawn at is known.
  const mat = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(0);
  useEffect(() => {
    const el = mat.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBox(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = columnsFor(box || 1040);
  const gap = box < 640 ? 12 : 16;      // gap-3 / sm:gap-4

  /**
   * The cell one picture sits in: how many columns across, and how many 8px
   * rows tall to hold the shape it will be drawn at.
   *
   * Before the first measurement every tile is one column and a plausible
   * height, so the first paint is a grid rather than a pile — the real spans
   * land on the frame after.
   */
  const cellOf = (p: GalleryPost) => {
    const r = tileRatio(p.width, p.height) ?? 1;
    const across = Math.min(cols, r >= WIDE_AT ? 2 : 1);
    const width = box
      ? (box - gap * (cols - 1)) / cols * across + gap * (across - 1)
      : 320;
    // Rounded up, never to nearest. The picture inside sizes itself from its
    // own aspect ratio, so a cell rounded down is a few pixels shorter than
    // what it holds — and the wrapper used to clip that off, which is why some
    // tiles lost the curve on their bottom corners. Up, the slack falls below
    // the picture where a masonry wall has gaps anyway.
    // The picture's own height, plus the border around it, plus the gap that
    // now belongs to the tile.
    const tall = width / r + 2 + gap;
    const rows = Math.max(1, Math.ceil(tall));
    return { width, style: { gridColumn: `span ${across}`,
                             gridRow: `span ${rows}`,
                             paddingBottom: gap } as React.CSSProperties };
  };

  return (
    <>
      {/* A printed collage rather than a wall: the pictures sit centred on a
          mat with air around all four edges, which is what gives a mixed set of
          shapes a shape of its own. Edge to edge across a wide monitor made the
          same pictures read as a feed that happened to stop somewhere.

          The mat is held to a measure a little wider than the page text and
          centred in whatever room is left, so the collage stays the same object
          on a laptop and on a very wide screen instead of thinning out.

          Its own padding is thin — enough for the mat to read as a mat and for
          the pictures not to touch its corners, and no more. Every pixel of it
          is width taken off three columns of photographs. */}
      {/* Out of the page's column first, then back to its own measure.

          The mat asked for 1040 and had never once had it: every page here is
          a column 1024 wide with a gutter either side, so the pictures got 960
          and the mat's own number meant nothing. Stepping outside that column
          and re-centring gives the collage a width of its own without widening
          anything else on the site — and once it could actually have one,
          1360 was the width worth asking for.

          Still three columns. Four would fit at this measure and would show
          more pictures at the size they were before, which is a different
          thing from showing these ones larger. */}
      <div className="mx-[calc(50%-50vw)] mt-4 w-screen px-2 sm:px-3">
      <div className="mx-auto w-full max-w-[1360px] rounded-2xl bg-surface/50 p-1.5 sm:p-2">
        <div ref={mat}
             style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gridAutoRows: `${ROW}px`, rowGap: 0 }}
             // dense, so a single column left by a wide picture is filled by
             // the next tall one rather than left as a hole. Only a column gap
             // here: the space between rows is padding on the tiles, so a tall
             // picture and a wide one are spaced the same — see ROW.
             className="grid [grid-auto-flow:row_dense] gap-x-3 sm:gap-x-4">
          {posts.map((p, idx) => {
            const cell = cellOf(p);
            const c = counts[p.id];
            const shots = images[p.id] ?? [];
            const many = (p.image_count ?? 1) > 1;
            // Whose picture it is, worked out the same way the open post does
            // it: the character it belongs to, then the account that posted it,
            // and only that far — a picture belongs to whoever is in it, not to
            // whoever happened to press upload.
            const who = p.character_id ? roster[p.character_id] : undefined;
            const byName = p.credited_name ?? who?.name ?? authors[p.author_id]?.name ?? null;
            const byFace = (p.character_id ? chosen[p.character_id] : null)
              ?? who?.avatar
              ?? (p.credited_name ? null : authors[p.author_id]?.avatar ?? null);
            // Everybody else in it. The owner is already named above, so naming
            // them again in the same breath reads as two different people.
            const others = (tagged[p.id] ?? [])
              .filter((id) => id !== p.character_id)
              .map((id) => (roster[id]
                ? { name: roster[id].name, avatar: chosen[id] ?? roster[id].avatar }
                : null))
              .filter(Boolean) as { name: string; avatar: string | null }[];
            return (
              // No clipping here: the button inside already rounds and clips
              // its own picture, and a square-cornered box cropping a rounded
              // one is exactly how the corners went missing.
              // The cell is a slot in the grid and is rounded up to whole rows,
              // so it can stand a few pixels taller than the picture in it. The
              // caption is positioned against the picture rather than the slot,
              // or it hangs in that slack below the frame.
              <div key={p.id} style={cell.style} className="group">
              <div className="relative">
                <button onClick={() => setOpen(p.id)}
                        className="block w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent">
                  <TileImage post={p} images={shots} index={idx}
                             width={cell.width} />
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
                {(byName || p.caption || c?.likes || c?.comments) ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-bg/90 via-bg/70 to-transparent px-3 pb-2.5 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    {byName && (
                      <div className="mb-1 flex items-center gap-1.5">
                        {byFace ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={byFace} alt="" loading="lazy"
                               className="size-6 shrink-0 rounded-full border border-line object-cover" />
                        ) : (
                          <span className="size-6 shrink-0 rounded-full border border-line bg-card" />
                        )}
                        <span className="truncate font-data text-[12.5px] font-semibold text-ink">
                          {byName}
                        </span>
                        {/* The faces of everybody else in the picture, at the
                            size a face is still a face. Three, then a count:
                            the row has one line, and the whole list is on the
                            picture itself once it is open. */}
                        {others.length > 0 && (
                          <span className="ml-auto flex shrink-0 items-center -space-x-1.5">
                            {others.slice(0, 3).map((o, n) => (
                              o.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={n} src={o.avatar} alt={o.name} title={o.name}
                                     loading="lazy"
                                     className="size-5 rounded-full border border-bg object-cover" />
                              ) : (
                                <span key={n} title={o.name}
                                      className="grid size-5 place-items-center rounded-full border border-bg bg-card font-data text-[9px] text-ink/80">
                                  {o.name.slice(0, 1)}
                                </span>
                              )
                            ))}
                            {others.length > 3 && (
                              <span className="pl-2 font-data text-[11px] text-ink/70">
                                +{others.length - 3}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
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
              </div>
            );
          })}
        </div>
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
  /** Confirmed tags per post, for the hover. */
  const [tagged, setTagged] = useState<Record<number, number[]>>({});
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

    // Every post on the page, not only the ones holding several pictures. A
    // single-picture post carries its thumbnail on its own row but not the
    // lighter full-size copy, and a tile two columns wide needs to know where
    // that is — see TileImage.
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const imgs = await imagesForPosts(supabase, ids);
      const grouped: Record<number, GalleryImage[]> = {};
      for (const im of ((imgs ?? []) as GalleryImage[])) {
        (grouped[im.post_id] ??= []).push(im);
      }
      setImages((prev) => (replace ? grouped : { ...prev, ...grouped }));
    } else if (replace) {
      setImages({});
    }

    // Who is in each picture. One query for the page, and only the tags that
    // have been confirmed: an unconfirmed tag is somebody's guess, and naming
    // a member on a wall of pictures on a guess is exactly the thing the
    // confirm step exists to prevent.
    if (rows.length) {
      const { data: tagRows } = await supabase.from("gallery_tags")
        .select("post_id, character_id")
        .in("post_id", rows.map((r) => r.id))
        .not("confirmed_at", "is", null);
      // Once each. A post holds several pictures and a tag belongs to a
      // picture, so somebody in three of them comes back three times — and a
      // row of the same face three times reads as three people.
      const seen: Record<number, Set<number>> = {};
      for (const r of (tagRows ?? []) as { post_id: number; character_id: number }[]) {
        (seen[r.post_id] ??= new Set()).add(r.character_id);
      }
      const byPost: Record<number, number[]> = {};
      for (const [pid, ids] of Object.entries(seen)) byPost[Number(pid)] = [...ids];
      setTagged((prev) => (replace ? byPost : { ...prev, ...byPost }));
    } else if (replace) {
      setTagged({});
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

  return { posts, authors, counts, images, tagged, isAdmin, ready, hasMore,
           loading, loadMore, reload };
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
