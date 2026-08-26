import type { SupabaseClient } from "@supabase/supabase-js";

export const GALLERY_BUCKET = "gallery";
export const GALLERY_PUBLIC_KEY = "gallery_public";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface GalleryPost {
  id: number;
  author_id: string;
  character_id: number | null;
  image_url: string;
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
): Promise<{ url: string; width: number | null; height: number | null } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "not-image" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too-big" };
  const dims = await measure(file);
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  // Filed under the uploader's id because the storage policy requires it, and
  // named by time so two people posting screenshot.png cannot collide.
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from(GALLERY_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (up.error) return { error: up.error.message };
  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, width: dims?.width ?? null, height: dims?.height ?? null };
}

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
