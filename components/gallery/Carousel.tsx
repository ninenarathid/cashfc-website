"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { GalleryImage } from "@/lib/gallery";

/**
 * The pictures in one post, one at a time.
 *
 * Arrows and dots rather than a scrolling strip: a post holds a handful of
 * images, and a strip would shrink each of them to make room for the others —
 * the opposite of what somebody opening a screenshot wants.
 *
 * Arrow keys move between them, which costs nothing and is the first thing
 * anybody tries. The counter is only drawn when there is more than one, so a
 * single-picture post looks exactly as it did before posts could hold several.
 */
export default function Carousel(
  { images, onRemove, canEdit = false }: {
    images: GalleryImage[];
    onRemove?: (id: number) => void;
    canEdit?: boolean;
  },
) {
  const { t } = useLang();
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);

  // Removing the picture you are looking at should not leave the viewer past
  // the end of the list.
  useEffect(() => {
    if (i > images.length - 1) setI(Math.max(0, images.length - 1));
  }, [images.length, i]);

  useEffect(() => {
    if (images.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setI((n) => (n + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  const current = images[i];
  if (!current) return null;

  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);

  return (
    <div ref={box} className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt=""
           width={current.width ?? undefined} height={current.height ?? undefined}
           className="max-h-[78vh] w-full rounded-xl border border-line bg-bg object-contain" />

      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label={t("gallery.prev")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-bg/75 px-3 py-2 text-ink backdrop-blur transition-colors hover:bg-bg">
            ‹
          </button>
          <button onClick={() => go(1)} aria-label={t("gallery.next")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-bg/75 px-3 py-2 text-ink backdrop-blur transition-colors hover:bg-bg">
            ›
          </button>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-bg/75 px-2.5 py-1 font-data text-[11.5px] text-ink backdrop-blur">
            {t("gallery.imageOf", { n: i + 1, total: images.length })}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((img, n) => (
              <button key={img.id} onClick={() => setI(n)}
                      aria-label={t("gallery.imageOf", { n: n + 1, total: images.length })}
                      className={`size-2 rounded-full transition-colors ${
                        n === i ? "bg-accent" : "bg-ink/40 hover:bg-ink/70"}`} />
            ))}
          </div>
        </>
      )}

      {canEdit && onRemove && (
        <button
          onClick={() => {
            if (images.length === 1 && !confirm(t("gallery.removeLast"))) return;
            onRemove(current.id);
          }}
          title={t("gallery.removeImage")}
          className="absolute right-2 top-2 rounded-lg border border-chili/60 bg-bg/80 px-2.5 py-1 text-[12px] text-chili backdrop-blur hover:bg-chili/15">
          {t("gallery.removeImage")}
        </button>
      )}
    </div>
  );
}
