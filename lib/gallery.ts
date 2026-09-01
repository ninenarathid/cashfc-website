import type { SupabaseClient } from "@supabase/supabase-js";

export const GALLERY_BUCKET = "gallery";
export const GALLERY_PUBLIC_KEY = "gallery_public";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * How wide a thumbnail is.
 *
 * The gallery grid draws a picture about 325 CSS pixels across and the home
 * page draws one at about 160, so 700 covers both at twice the density a
 * high-resolution screen asks for. Anything past that is detail the browser
 * discards before it reaches an eye — which is the entire problem this exists
 * to solve, since it was being paid for by the byte.
 */
export const THUMB_WIDTH = 700;
/**
 * WebP, because it is roughly a third the size of JPEG at a quality nobody can
 * tell apart at this scale, and every browser has read it for years.
 */
const THUMB_TYPE = "image/webp";
const THUMB_QUALITY = 0.82;

/**
 * A small copy of a picture, made in the browser before either is uploaded.
 *
 * Made from the file rather than from the uploaded original, so the original is
 * never fetched back to shrink it, and never re-encoded — decoding and
 * re-encoding a JPEG costs a little quality every time, and the full-size view
 * is the one place where that would be visible.
 *
 * Returns null for anything already small enough to be its own thumbnail, and
 * for anything the browser will not decode. Both mean "just use the original",
 * which is what the site did before this existed.
 */
export async function makeThumb(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const src = await loadImage(file);
  if (!src) return null;
  const { image, done } = src;
  try {
    if (image.naturalWidth <= THUMB_WIDTH) return null;
    const scale = THUMB_WIDTH / image.naturalWidth;
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH;
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Asking the canvas to drop four thousand pixels to seven hundred in one
    // step samples too few of them and comes out soft. Halving repeatedly until
    // the last step is a small one keeps it crisp.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(halve(image, canvas.width), 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, THUMB_TYPE, THUMB_QUALITY));
    // A thumbnail bigger than the original helps nobody; that happens with
    // small PNG art, where WebP of a resize can lose to the original.
    return blob && blob.size < file.size ? blob : null;
  } finally {
    done();
  }
}

/** Repeated halving down to just above the target, for a clean final resample. */
function halve(image: HTMLImageElement, target: number): CanvasImageSource {
  let w = image.naturalWidth;
  let h = image.naturalHeight;
  let from: CanvasImageSource = image;
  while (w / 2 > target) {
    const step = document.createElement("canvas");
    step.width = Math.round(w / 2);
    step.height = Math.max(1, Math.round(h / 2));
    const ctx = step.getContext("2d");
    if (!ctx) return from;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(from, 0, 0, step.width, step.height);
    from = step;
    w = step.width;
    h = step.height;
  }
  return from;
}

function loadImage(file: File)
: Promise<{ image: HTMLImageElement; done: () => void } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const done = () => URL.revokeObjectURL(url);
    image.onload = () => resolve({ image, done });
    image.onerror = () => { done(); resolve(null); };
    image.src = url;
  });
}

export interface GalleryPost {
  id: number;
  author_id: string;
  character_id: number | null;
  image_url: string;
  /** A small copy for grids. Null on anything posted before v22. */
  thumb_url?: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  created_at: string;
  /**
   * Taken down by an admin. Nobody but an admin can clear it, and nobody but an
   * admin and the people the post belongs to ever receives the row.
   */
  hidden?: boolean | null;
  /**
   * Put away by whoever the post belongs to. A separate flag from the admin's on
   * purpose: one shared between them would let an author restore what an admin
   * had just taken down, which is the one case hiding exists for.
   */
  owner_hidden?: boolean | null;
  /** Kept on the row by database triggers so the feed can rank by them. */
  like_count?: number | null;
  comment_count?: number | null;
  /** How many pictures the post holds, kept on the row by a trigger. */
  image_count?: number | null;
  /** Set when an admin posted on somebody else's behalf. */
  credited_name?: string | null;
}

/**
 * Puts one chosen file in the gallery bucket and hands back what the row needs.
 * Shared by posting and by adding to a post that already exists, so both file
 * uploads the same way and under the same folder rule.
 */
export async function uploadOne(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  file: File,
): Promise<{
  url: string; thumb: string | null;
  width: number | null; height: number | null;
} | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "not-image" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too-big" };
  const dims = await measure(file);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  // Filed under the uploader's id because the storage policy requires it, and
  // named by time so two people posting screenshot.png cannot collide.
  const stem = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const up = await supabase.storage.from(GALLERY_BUCKET)
    .upload(`${stem}.${ext}`, file, { cacheControl: "31536000", upsert: false });
  if (up.error) return { error: up.error.message };
  const url = supabase.storage.from(GALLERY_BUCKET)
    .getPublicUrl(`${stem}.${ext}`).data.publicUrl;

  // The small copy is a convenience, never a requirement. If making it or
  // storing it fails, the post is still a post and the grid falls back to the
  // original — the same thing it did before thumbnails existed.
  let thumb: string | null = null;
  try {
    const small = await makeThumb(file);
    if (small) {
      const at = `${stem}.thumb.webp`;
      const put = await supabase.storage.from(GALLERY_BUCKET)
        .upload(at, small, { cacheControl: "31536000", upsert: false,
                             contentType: THUMB_TYPE });
      if (!put.error) {
        thumb = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(at).data.publicUrl;
      }
    }
  } catch { /* the original will do */ }

  return { url, thumb, width: dims?.width ?? null, height: dims?.height ?? null };
}

/**
 * The pictures of several posts at once, for the tiles that flip through them.
 *
 * Asks for the thumbnail and falls back to the older column list if the
 * database has not had migration_v22 run on it — selecting a column that does
 * not exist fails the whole query, and the gallery would go blank rather than
 * merely un-thumbnailed. `thumbOf` then quietly uses the original, which is
 * what the site did before any of this.
 */
export async function imagesForPosts(
  supabase: SupabaseClient, postIds: number[],
): Promise<GalleryImage[]> {
  const BASE = "id, post_id, url, width, height, position";
  const ask = (cols: string) => supabase.from("gallery_images")
    .select(cols).in("post_id", postIds).order("position", { ascending: true });
  const full = await ask(`${BASE}, thumb_url`);
  const rows = full.error ? (await ask(BASE)).data : full.data;
  return ((rows ?? []) as unknown as GalleryImage[]);
}

/** The small copy if there is one, else the picture itself. */
export const thumbOf = (
  row: { thumb_url?: string | null; image_url?: string | null; url?: string | null },
): string => row.thumb_url || row.image_url || row.url || "";

/** One picture inside a post. The post's own image_url mirrors the first. */
export interface GalleryImage {
  id: number;
  post_id: number;
  url: string;
  width: number | null;
  height: number | null;
  position: number;
  /**
   * One picture out of a set, put away without touching the rest. Only the
   * people the post belongs to are sent these rows at all, so a viewer's
   * carousel simply has one fewer picture in it.
   */
  hidden?: boolean | null;
  /** A small copy for grids. Null on anything posted before v22. */
  thumb_url?: string | null;
}

export interface GalleryComment {
  id: number;
  post_id: number;
  author_id: string;
  body: string;
  created_at: string;
}

/**
 * Whether the gallery is open to everybody.
 *
 * Open unless an admin has closed it — it spent its first day admins-only while
 * the FC looked at it, and now the default is the other way round. Still a
 * setting rather than row-level security, because who is shown a page is a
 * product decision and undoing it in RLS would have needed a migration.
 */
export async function galleryIsPublic(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY)
    .maybeSingle();
  return (data as { value?: string } | null)?.value !== "off";
}


/**
 * Reads a picture's real dimensions before upload so the grid can reserve the
 * right space. Without it every arriving image shoves the ones below it down,
 * which on a masonry layout means the whole page jumps while it loads.
 */
export function measure(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Where one picture lives, for sharing and for the Discord embed. */
export const postPath = (id: number) => `/gallery/${id}`;

/**
 * The roster, keyed by character, for putting a face and a name to a picture.
 *
 * Read from the Lodestone rather than from the poster's account, so a member who
 * has never signed in — or signed in but not verified — still appears as their
 * character rather than as a blank circle. It is the picture of them that
 * everybody in the FC would recognise, which is the whole job of the byline.
 */
export type Roster = Record<number, { name: string; avatar: string | null }>;

/**
 * Somebody else who is in the picture.
 *
 * Points at a character rather than an account, because most of the people in a
 * group shot have never signed in here — a tag that only worked for members with
 * accounts would miss most of the FC.
 *
 * The confirmation is the whole point of the row: a null confirmed_at means the
 * name has been written on the picture but the person has not agreed to it, and
 * until they do the picture stays off their page entirely.
 */
export interface GalleryTag {
  id: number;
  post_id: number;
  character_id: number;
  name: string;
  confirmed_at: string | null;
  /**
   * Where on the picture they are, as fractions of its width and height.
   *
   * Fractions rather than pixels so the pin lands on the same face whatever
   * size the picture is drawn at — a coordinate in pixels would slide off
   * somebody's head the moment the lightbox is a different width.
   *
   * All three are null together for a tag with no point: a plain name in the
   * list, which is still a tag and still needs confirming.
   */
  image_id: number | null;
  x: number | null;
  y: number | null;
  created_at?: string;
}

/** The columns a tag is read with, in one place so every query agrees. */
export const TAG_COLUMNS =
  "id, post_id, character_id, name, confirmed_at, image_id, x, y, created_at";
