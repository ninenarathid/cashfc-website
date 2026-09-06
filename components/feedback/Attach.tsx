"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { MAX_UPLOAD_BYTES } from "@/lib/gallery";
import { MAX_FEEDBACK_IMAGES } from "@/lib/feedback";
import DropZone, { useDropTarget, usePasteImages } from "@/components/ui/DropZone";

/**
 * Pictures put onto a message by dropping them on it.
 *
 * What gets attached here is a screenshot somebody has just taken of the thing
 * they are describing — it is already on their clipboard or already the file
 * under their cursor, and a file dialog's whole job is to make them find it
 * again somewhere else. So the box is the target, and the same one the rest of
 * the site uses: one shape for "put a picture here", wherever you meet it.
 *
 * Nothing is uploaded from here. The files are held until the message they
 * belong to is sent, so abandoning a half-written reply leaves nothing behind
 * in storage.
 */
export default function Attach(
  { files, onChange, disabled = false }: {
    files: File[];
    onChange: (files: File[]) => void;
    disabled?: boolean;
  },
) {
  const { t } = useLang();
  const [err, setErr] = useState<string | null>(null);

  // One object URL per file, made when the file arrives and given back when it
  // goes — a preview that outlives its file is a leak with a picture in it.
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function take(chosen: File[]) {
    if (disabled) return;
    setErr(null);
    const room = MAX_FEEDBACK_IMAGES - files.length;
    if (room <= 0) { setErr(t("feedback.tooMany", { n: MAX_FEEDBACK_IMAGES })); return; }
    const ok: File[] = [];
    for (const f of chosen) {
      if (!f.type.startsWith("image/")) { setErr(t("gallery.notImage")); continue; }
      if (f.size > MAX_UPLOAD_BYTES) { setErr(t("gallery.tooBig")); continue; }
      ok.push(f);
    }
    if (ok.length > room) setErr(t("feedback.tooMany", { n: MAX_FEEDBACK_IMAGES }));
    if (!ok.length) return;
    onChange([...files, ...ok.slice(0, room)]);
  }

  // Held here rather than left to the zone, because the zone is replaced by the
  // previews the moment there is one and Ctrl+V has to go on working after that.
  usePasteImages(take, !disabled);
  const { over, handlers } = useDropTarget({ onFiles: take, disabled });

  if (!files.length) {
    return (
      <div>
        <DropZone size="sm" multiple paste={false} onFiles={take} disabled={disabled}
                  title={t("feedback.attachTitle")}
                  hint={t("feedback.attachLimit", { n: MAX_FEEDBACK_IMAGES })} />
        {err && <p className="mt-1.5 text-[11.5px] text-chili">{err}</p>}
      </div>
    );
  }

  return (
    <div {...handlers}
         className={`rounded-lg border border-dashed px-3 py-2.5 transition-colors ${
           over ? "border-accent bg-accent/10" : "border-line"}`}>
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt=""
                 className="h-20 w-auto rounded-md border border-line object-contain" />
            <button onClick={() => onChange(files.filter((_, n) => n !== i))}
                    disabled={disabled}
                    aria-label={t("gallery.removeImage")}
                    className="absolute right-1 top-1 rounded border border-chili/60 bg-bg/85 px-1 text-[11px] text-chili disabled:opacity-40">
              ✕
            </button>
          </div>
        ))}
        {files.length < MAX_FEEDBACK_IMAGES && (
          <div className="grid h-20 flex-1 place-items-center px-2 text-center text-[11.5px] text-muted">
            {over ? t("drop.now") : t("feedback.attachMore")}
          </div>
        )}
      </div>

      {err && <p className="mt-1.5 text-[11.5px] text-chili">{err}</p>}
    </div>
  );
}
