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
  /** Taken down by an admin. Non-admins never receive these rows at all. */
  hidden?: boolean | null;
  /** Kept on the row by database triggers so the feed can rank by them. */
  like_count?: number | null;
  comment_count?: number | null;
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
