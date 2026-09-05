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

  const gap = box < 640 ? 12 : 16;
  const width = box || 1344;

  /**
   * Rows that end exactly where the mat does.
   *
   * The grid this replaces gave a picture two or three of six columns, which
   * put portraits and landscapes on level terms but could not always fill a
   * row: a row that came out 2+3 left one column that nothing was ever narrow
   * enough to go in. Every pair of spans that does tile a row perfectly puts
   * one shape ahead of the other again — the two wants are not compatible in a
   * grid of fixed columns, which is what sent this to a different layout.
   *
   * Here a row is solved rather than snapped to. Pictures are laid across it
   * at whatever height makes their widths, plus the gaps, come to exactly the
   * mat: a picture's width is its height times its own ratio, so the total is
   * linear in the height and the height falls out of one division. Nothing is
   * cropped, nothing is padded, and there is no such thing as a leftover.
   *
   * The height varies row to row, which is the trade and is what a justified
   * wall looks like — Flickr and Google Photos both do this.
   *
   * ── Why rows come in pairs of bands ──────────────────────────────────
   *
   * At one shared height a 16:9 shot is two and a half times the area of a
   * 9:16 one, which is the imbalance the columns were introduced to fix. So a
   * row is two bands tall, and holds two kinds of thing: a portrait standing
   * the full two bands, or two landscapes stacked one band each. The stacked
   * pair shares a width the same way the front page's strip does —
   * so the column they make has one edge.
   */
  /**
   * How tall a band has to have fallen to before a row is closed.
   *
   * This, and not the width of the mat, is what decides how big a picture is
   * drawn. Widening the mat only lets another picture onto the row: at 1040 a
   * row holds three and solves to a 220px band, and at 1900 it holds four and
   * solves to 293 — barely different pictures, just more of them. Raising this
   * closes the row sooner, so what is on it has more room each.
   */
  const TARGET_BAND = box < 700 ? 260 : 460;

  type Unit =
    | { kind: "tall"; post: GalleryPost; k: number }
    | { kind: "stack"; top: GalleryPost; bottom: GalleryPost; k: number };

  /** A unit's width, per band height. Everything below is linear in this. */
  const ratioOf = (p: GalleryPost) => tileRatio(p.width, p.height) ?? 1;

  const rows = useMemo(() => {
    const units: Unit[] = [];
    let held: GalleryPost | null = null;
    for (const p of posts) {
      if (ratioOf(p) < WIDE_AT) {
        // Two bands tall, so its width is twice a band plus the gap between.
        units.push({ kind: "tall", post: p, k: 2 * ratioOf(p) });
      } else if (held) {
        const a1 = ratioOf(held), a2 = ratioOf(p);
        // Both at one width, their heights summing to the two bands.
        units.push({ kind: "stack", top: held, bottom: p, k: 2 / (1 / a1 + 1 / a2) });
        held = null;
      } else {
        held = p;
      }
    }
    // A landscape with nobody to stack with stands alone, one band tall in a
    // two-band row. It is the only place a gap can appear, and it can only
    // ever be the last picture on the page.
    if (held) units.push({ kind: "stack", top: held, bottom: held, k: ratioOf(held) });

    // Fill a row until the height it solves to drops past the target.
    const out: { units: Unit[]; band: number }[] = [];
    let run: Unit[] = [];
    const solve = (us: Unit[]) => {
      const k = us.reduce((n, u) => n + u.k, 0);
      // width = band * k + gaps between units + the gap inside a tall unit
      const fixed = gap * (us.length - 1)
        + us.reduce((n, u) => n + (u.kind === "tall" ? u.k / 2 * gap : 0), 0);
      return (width - fixed) / k;
    };
    for (const u of units) {
      run.push(u);
      if (solve(run) <= TARGET_BAND) { out.push({ units: run, band: solve(run) }); run = []; }
    }
    // The last row is not stretched: one picture left over would fill the mat.
    if (run.length) out.push({ units: run, band: Math.min(TARGET_BAND, solve(run)) });
    return out;
  }, [posts, width, gap, TARGET_BAND]);   // eslint-disable-line react-hooks/exhaustive-deps

  // One picture as it is drawn, given the box the row solved for it. Lifted
  // out of the loop it used to sit in so a row can call it for a portrait
  // standing two bands tall and for each half of a stacked pair alike.
  const tile = (p: GalleryPost, w: number, h: number, idx: number) => {
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
              <div key={p.id} style={{ width: w, height: h }}
                   className="group shrink-0">
              <div className="relative">
                <button onClick={() => setOpen(p.id)}
                        className="block w-full overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent">
                  <TileImage post={p} images={shots} index={idx}
                             width={w} />
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
          and re-centring gives it the width it was written for.

          It was widened from there — 1600, then 2600 following the screen —
          and brought back to a fixed measure. A collage stretched across a very
          wide monitor stops being an object on a page and becomes a wall, which
          is the thing the first line of this comment was written to avoid.

          How large a picture is drawn is not set here, though it reads as if it
          would be: see TARGET_BAND. */}
      <div className="mx-[calc(50%-50vw)] mt-4 w-screen px-2 sm:px-3">
      <div className="mx-auto w-full max-w-[1360px] rounded-2xl bg-surface/50 p-1.5 sm:p-2">
      <div ref={mat} className="flex flex-col gap-3 sm:gap-4">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-3 sm:gap-4">
            {row.units.map((u, ui) => {
              // Both bands and the gap between them, which is what a portrait
              // stands in and what a stacked pair shares out between them.
              const tall = row.band * 2 + gap;
              if (u.kind === "tall") {
                return tile(u.post, row.band * u.k + gap * (u.k / 2), tall, ri * 10 + ui);
              }
              const w = row.band * u.k;
              const a1 = ratioOf(u.top), a2 = ratioOf(u.bottom);
              return (
                <div key={ui} className="flex shrink-0 flex-col gap-3 sm:gap-4"
                     style={{ width: w }}>
                  {tile(u.top, w, w / a1, ri * 10 + ui)}
                  {u.bottom !== u.top && tile(u.bottom, w, w / a2, ri * 10 + ui + 1)}
                </div>
              );
            })}
          </div>
        ))}
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
