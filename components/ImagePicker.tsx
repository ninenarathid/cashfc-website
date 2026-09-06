"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import DropZone, { useDropTarget } from "@/components/ui/DropZone";

const BUCKET = "post-images";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Picking a picture for a post, uploaded straight to Supabase Storage.
 *
 * Deliberately not a paste-a-URL box: an image hosted somewhere else disappears
 * the day that host tidies up, and the post it illustrated is left with a broken
 * frame nobody notices for months.
 *
 * Only admins can write to the bucket, enforced by the storage policy rather than
 * by this component — the same rule that already governs the posts themselves.
 *
 * Empty, it is the site's drop zone. Once there is a picture the picture is the
 * target: it is already the right shape and in the right place, and a dashed
 * rectangle beside it would only be a second box asking the same question.
 */
export default function ImagePicker(
  { supabase, value, onChange }: {
    supabase: SupabaseClient;
    value: string | null;
    onChange: (url: string | null) => void;
  },
) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("That is not an image");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr(`Too big — ${(file.size / 1024 / 1024).toFixed(1)}MB, the limit is 5MB`);
      return;
    }
    setBusy(true);
    // Named by time and a random suffix rather than by the original filename:
    // two people uploading "screenshot.png" should not overwrite each other, and
    // the path ends up in a public URL either way.
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("Bucket not found")
        ? "Storage is not set up yet — the gallery bucket is missing"
        : `Upload failed: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onChange(data.publicUrl);
  }

  // One picture, so only the first of a handful dropped at once is taken.
  const take = (files: File[]) => { if (files[0]) void upload(files[0]); };
  // Paste is off: an announcement form has a title and a body in it, and Ctrl+V
  // in an admin panel means the words far more often than it means a picture.
  const { over, handlers } = useDropTarget({ onFiles: take, disabled: busy });

  if (!value) {
    return (
      <div className="flex flex-col gap-2">
        <DropZone size="sm" paste={false} onFiles={take} disabled={busy}
                  title={busy ? "Uploading…" : undefined}
                  hint="PNG or JPG, up to 5MB" />
        {err && <p className="text-[12.5px] text-chili">{err}</p>}
      </div>
    );
  }

  return (
    <div {...handlers} className="flex flex-col gap-2">
      {/* self-start, or the flex column stretches it. The parent is a flex-col,
          whose default align-items is stretch, so the image was being pulled to
          the full width of the form while max-h-40 held its height — which
          turned a 1024x1536 poster into a wide smear and made every upload look
          badly cropped when nothing was wrong with it. w-auto does not stop
          that; only opting out of the stretch does. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value} alt=""
           className={`max-h-52 w-auto self-start rounded-lg border-2 transition-colors ${
             over ? "border-dashed border-accent opacity-60" : "border-line"}`} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] text-muted">
          {over ? "Drop to replace it" : "Drag a picture onto it to replace it"}
        </span>
        <button type="button" onClick={() => { onChange(null); setErr(null); }}
                disabled={busy}
                className="rounded-lg border border-chili/50 px-3 py-1.5 text-[12.5px] text-chili hover:bg-chili/10 disabled:opacity-50">
          Remove
        </button>
      </div>

      {err && <p className="text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}
