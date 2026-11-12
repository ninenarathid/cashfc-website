import { SUPABASE_URL } from "@/lib/supabase/config";
import type { ContentDef } from "@/lib/party";

/**
 * A party's own picture, in place of the duty's banner.
 *
 * The duty banners are the game's own, drawn at 1128x360, and everything that
 * shows a party's picture was laid out around that shape: the window's banner
 * keeps it, the Discord card crops it a little, the board's row takes a slice
 * from the middle. So a lead's picture is cropped to the same shape before it
 * goes up, and every one of those places treats it exactly as it treats the
 * banner it replaces.
 *
 * Stored at one and a half times the banner, so it stays sharp on a phone's
 * dense screen and on the 1200-wide Discord card, and is still a picture of a
 * hundred-odd kilobytes rather than a photograph.
 */

/** The banner's shape: 1128 by 360 is 47 by 15. */
export const COVER_RATIO = 47 / 15;
export const COVER_W = 1692;
export const COVER_H = 540;
/** The banner's own size. Smaller than this and it is stretched somewhere. */
export const COVER_MIN_W = 1128;
export const COVER_MIN_H = 360;
/** What a picked file may weigh before it is cropped; the crop is far smaller. */
export const COVER_PICK_MAX = 20 * 1024 * 1024;

/**
 * How much of the width a phone shows of it.
 *
 * The party window's banner keeps the shape down to a floor of 168px tall, and
 * on a phone the floor wins: about two to one, the middle of the picture. The
 * crop draws this so the lead can keep what matters inside it.
 */
export const PHONE_SHOWS = 2 / COVER_RATIO;

/**
 * The only shape v332 lets into the column: `<uploader>/cover-<time>-<random>.<ext>`.
 *
 * Checked here as well as in the database because a path goes into a URL and
 * a CSS `url()`, and the page should never build either out of something it
 * did not make.
 */
const COVER_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$/;

export const isCoverPath = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 120 && COVER_PATH.test(s);

/** A fresh path in the uploader's own folder, which the bucket's policy insists on. */
export const newCoverPath = (userId: string, ext: "webp" | "jpg" | "png"): string =>
  `${userId}/cover-${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(4, "0")}.${ext}`;

/** The public address of a stored cover, or null for anything that is not one. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!isCoverPath(path) || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/party/${path}`;
}

/**
 * The picture a party is drawn with: its own, or its duty's.
 *
 * `focus` only means something for the duty banners, which are anchored where
 * their subject is; a cover was framed by the person who cropped it, so it is
 * shown from the middle.
 */
export function partyArt(
  cover: string | null | undefined, def: ContentDef | undefined,
): { url: string; focus: string; own: boolean } | null {
  const own = coverUrl(cover);
  if (own) return { url: own, focus: "center", own: true };
  if (def?.art) return { url: def.art, focus: def.focus ?? "center", own: false };
  return null;
}

/**
 * The fights a picture may be borrowed between.
 *
 * The same content key, and any other key that is the same duty or wears the
 * same banner: the two halves of one savage floor are two keys but one place,
 * and a picture of that arena suits either.
 */
export function coverKin(def: ContentDef | undefined, content: readonly ContentDef[]): string[] {
  if (!def) return [];
  const place = def.duty ?? null;
  const out = new Set([def.key]);
  for (const c of content) {
    if ((place && c.duty === place) || (def.art && c.art === def.art)) out.add(c.key);
  }
  return [...out];
}

/** One picture on offer, and how much it has been used. */
export interface CoverChoice {
  path: string;
  /** How many parties carry it now. */
  uses: number;
  /** When it was last put up, for ordering pictures used equally often. */
  lastAt: string;
  /** Whether any of those parties was this very content, not only its kin. */
  same: boolean;
}

/**
 * The pictures of these parties, most used first.
 *
 * A use is a party that carries the picture. Counted here rather than kept as
 * a number, because a counter would have to be put right through every edit,
 * copy and deletion; a party that changes its picture simply stops counting
 * towards the old one.
 */
export function rankCovers(
  rows: readonly { cover: string | null; content_key: string; created_at: string }[],
  key: string,
  limit = 30,
): CoverChoice[] {
  const by = new Map<string, CoverChoice>();
  for (const r of rows) {
    if (!isCoverPath(r.cover)) continue;
    const had = by.get(r.cover);
    if (had) {
      had.uses += 1;
      if (r.created_at > had.lastAt) had.lastAt = r.created_at;
      if (r.content_key === key) had.same = true;
    } else {
      by.set(r.cover, { path: r.cover, uses: 1, lastAt: r.created_at, same: r.content_key === key });
    }
  }
  return [...by.values()]
    .sort((a, b) => b.uses - a.uses
      || Number(b.same) - Number(a.same)
      || (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0))
    .slice(0, limit);
}

/* ── the crop ────────────────────────────────────────────────────────────── */

/**
 * Where the crop is, in the picture's own pixels: its middle and its zoom.
 *
 * Kept in the source's pixels rather than the screen's, so the frame can be
 * any width — a phone, a desktop, a window being resized — and the crop stays
 * the same piece of the picture.
 */
export interface Crop { cx: number; cy: number; zoom: number }

/** The biggest banner-shaped piece the picture holds, at zoom 1. */
export function baseSize(iw: number, ih: number): { w: number; h: number } {
  const w = Math.min(iw, ih * COVER_RATIO);
  return { w, h: w / COVER_RATIO };
}

/**
 * How far in it may zoom.
 *
 * Down to a piece about as wide as the board's row shows, and never past five
 * times — but never below one, because a picture already smaller than the
 * banner still has to be croppable at all.
 */
export const maxZoom = (iw: number, ih: number): number =>
  Math.max(1, Math.min(5, baseSize(iw, ih).w / 360));

/** The crop held inside the picture and inside the zoom it allows. */
export function clampCrop(c: Crop, iw: number, ih: number): Crop {
  const zoom = Math.min(maxZoom(iw, ih), Math.max(1, c.zoom));
  const { w, h } = baseSize(iw, ih);
  const sw = w / zoom, sh = h / zoom;
  return {
    zoom,
    cx: Math.min(iw - sw / 2, Math.max(sw / 2, c.cx)),
    cy: Math.min(ih - sh / 2, Math.max(sh / 2, c.cy)),
  };
}

/** The piece of the picture the crop takes, as drawImage wants it. */
export function cropRect(c: Crop, iw: number, ih: number) {
  const { w, h } = baseSize(iw, ih);
  const sw = w / c.zoom, sh = h / c.zoom;
  return { sx: c.cx - sw / 2, sy: c.cy - sh / 2, sw, sh };
}

/**
 * Zoom about a point of the frame, so the spot under the finger stays put.
 *
 * `fx`, `fy` are where in the frame, from 0 to 1.
 */
export function zoomAt(c: Crop, to: number, fx: number, fy: number, iw: number, ih: number): Crop {
  const before = cropRect(c, iw, ih);
  const px = before.sx + fx * before.sw;
  const py = before.sy + fy * before.sh;
  const next = clampCrop({ ...c, zoom: to }, iw, ih);
  const after = cropRect(next, iw, ih);
  return clampCrop({
    zoom: next.zoom,
    cx: px - fx * after.sw + after.sw / 2,
    cy: py - fy * after.sh + after.sh / 2,
  }, iw, ih);
}

/** The size the cropped picture is saved at: the stored size, or less if the piece is smaller. */
export function outputSize(sw: number): { w: number; h: number } {
  const w = Math.max(1, Math.min(COVER_W, Math.round(sw)));
  return { w, h: Math.round(w / COVER_RATIO) };
}
