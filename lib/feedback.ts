import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFull, MAX_UPLOAD_BYTES } from "@/lib/gallery";

/** Where the pictures attached to a conversation live. */
export const FEEDBACK_BUCKET = "feedback";

/**
 * Enough for a bug report and not enough for an album.
 *
 * A report is normally one screenshot and occasionally three — before, after,
 * and the console. A ceiling this low is not a restriction anybody will meet by
 * accident, and it keeps a thread readable as a conversation rather than as a
 * gallery with sentences between the pictures.
 */
export const MAX_FEEDBACK_IMAGES = 4;

/**
 * One attached picture, stored and turned into a URL.
 *
 * Re-encoded on the way up wherever that is lighter, the same as a gallery
 * post: a screenshot of a website is a large PNG of mostly flat colour and
 * WebP takes it apart. No thumbnail — these are drawn small inside a message
 * and opened at full size in a new tab, so a second copy would be a second
 * upload for a size nothing asks for.
 *
 * The path starts with the uploader's id because the storage policy requires
 * it, and carries the time and some randomness because two people reporting the
 * same bug both attach screenshot.png.
 */
export async function uploadFeedbackImage(
  supabase: SupabaseClient, userId: string, file: File,
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "not-image" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too-big" };

  let body: Blob = file;
  let ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  let type: string | undefined;
  try {
    const lighter = await makeFull(file);
    if (lighter) { body = lighter; ext = "webp"; type = "image/webp"; }
  } catch { /* the original will do */ }

  const at = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from(FEEDBACK_BUCKET)
    .upload(at, body, { cacheControl: "31536000", upsert: false, contentType: type });
  if (up.error) return { error: up.error.message };

  return {
    url: supabase.storage.from(FEEDBACK_BUCKET).getPublicUrl(at).data.publicUrl,
  };
}
