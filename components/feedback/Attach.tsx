"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { MAX_UPLOAD_BYTES } from "@/lib/gallery";
import { MAX_FEEDBACK_IMAGES } from "@/lib/feedback";

/**
 * Pictures put onto a message by dropping them on it.
 *
 * There is no button that opens a file dialog, and that is the point rather
 * than an omission. What gets attached here is a screenshot somebody has just
 * taken of the thing they are describing — it is already on their clipboard or
 * already the file under their cursor, and the file dialog's whole job is to
 * make them find it again somewhere else. Dropping it and pasting it both skip
 * that; browsing for it does not, so it is not offered.
 *
 * The box is the target and says so while it is empty, which is the only
 * instruction anybody needs. Nothing is uploaded from here: the files are held
 * until the message they belong to is sent, so abandoning a half-written reply
 * leaves nothing behind in storage.
 */
export default function Attach(
  { files, onChange, disabled = false }: {
    files: File[];
    onChange: (files: File[]) => void;
    disabled?: boolean;
  },
) {
  const { t } = useLang();
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // dragenter and dragleave fire for each element crossed on the way in, so a
  // plain boolean flickers off the moment a file passes over a preview. Depth
  // is what holds the outline still.
  const depth = useRef(0);

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

  // A screenshot on the clipboard never had to be found on disk at all. Ignored
  // while the paste is going into something somebody is typing in — except a
  // textarea, because the message box is a textarea and pasting a picture into
  // the words you are writing is exactly where this belongs.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.isContentEditable)) return;
      const found = [...(e.clipboardData?.files ?? [])]
        .filter((f) => f.type.startsWith("image/"));
      if (!found.length) return;
      e.preventDefault();
      take(found);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });   // Every render: `take` closes over the current files, and there is one
        // listener either way.

  return (
    <div
      onDragEnter={(e) => {
        if (!e.dataTransfer?.types?.includes("Files")) return;
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        take([...(e.dataTransfer?.files ?? [])]);
      }}
      className={`rounded-lg border border-dashed px-3 py-2.5 transition-colors ${
        over ? "border-accent bg-accent/10" : "border-line"}`}>

      {files.length === 0 ? (
        <p className="text-center text-[12px] leading-relaxed text-muted">
          {over ? t("feedback.dropHere") : t("feedback.attachHint")}
        </p>
      ) : (
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
              {over ? t("feedback.dropHere") : t("feedback.attachMore")}
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-1.5 text-[11.5px] text-chili">{err}</p>}
    </div>
  );
}
