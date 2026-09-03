"use client";

import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 */
export default function ImagePicker(
  { supabase, value, onChange }: {
    supabase: SupabaseClient;
    value: string | null;
    onChange: (url: string | null) => void;
  },
) {
  const input = useRef<HTMLInputElement>(null);
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/*" className="hidden"
               onChange={(e) => {
                 const f = e.target.files?.[0];
                 if (f) void upload(f);
                 e.target.value = "";
               }} />
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
                className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          {busy ? "Uploading…" : value ? "Replace image" : "Add an image"}
        </button>
        {value && (
          <button type="button" onClick={() => { onChange(null); setErr(null); }}
                  className="rounded-lg border border-chili/50 px-3 py-1.5 text-[12.5px] text-chili hover:bg-chili/10">
            Remove
          </button>
        )}
        <span className="text-[11.5px] text-muted">PNG or JPG, up to 5MB</span>
      </div>

      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        // self-start, or the flex column stretches it. The parent is a
        // flex-col, whose default align-items is stretch, so the image was being
        // pulled to the full width of the form while max-h-40 held its height —
        // which turned a 1024x1536 poster into a wide smear and made every
        // upload look badly cropped when nothing was wrong with it. w-auto does
        // not stop that; only opting out of the stretch does.
        <img src={value} alt=""
             className="max-h-52 w-auto self-start rounded-lg border border-line" />
      )}
      {err && <p className="text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}
