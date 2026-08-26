"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  { images, onRemove, onToggleHidden, canEdit = false, overlay,
    picking = false, onPickPoint }: {
    images: GalleryImage[];
    onRemove?: (id: number) => void;
    /** Put this one picture away, or take it back. Owners and admins only. */
    onToggleHidden?: (id: number, hidden: boolean) => void;
    canEdit?: boolean;
    /** Drawn on top of the picture, in the picture's own coordinate space. */
    overlay?: (image: GalleryImage) => ReactNode;
    /** Waiting for a click on the picture to place a tag. */
    picking?: boolean;
    onPickPoint?: (image: GalleryImage, x: number, y: number) => void;
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

  // A click lands somewhere in the frame; a tag has to be somewhere in the
  // picture. They are the same thing only because the frame is sized to the
  // picture below — with the image stretched to the full width and letterboxed,
  // a point clicked on a face would be stored as a point in the empty margin.
  function place(e: React.MouseEvent<HTMLDivElement>) {
    if (!picking || !onPickPoint) return;
    // Only the photograph itself. The arrows and the dots sit inside the same
    // frame, and a click meant for one of those is not a face.
    if (!(e.target instanceof HTMLImageElement)) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    onPickPoint(current, x, y);
  }

  return (
    <div ref={box} onClick={place}
         className={`group/photo relative mx-auto w-fit max-w-full ${
           picking ? "cursor-crosshair" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt=""
           width={current.width ?? undefined} height={current.height ?? undefined}
           draggable={false}
           className="block max-h-[78vh] w-auto max-w-full rounded-xl border border-line bg-bg" />

      {overlay?.(current)}

      {picking && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full border border-accent bg-bg/85 px-3 py-1 text-[12px] text-accent backdrop-blur">
            {t("gallery.tagClickFace")}
          </span>
        </div>
      )}

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

      {/* A hidden picture is still in the set for the people it belongs to,
          and dimmed so it is obvious which one is not on the wall. Nobody else
          is sent the row at all, so nobody else sees any of this. */}
      {current.hidden && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-bg/65" />
      )}
      {canEdit && onToggleHidden && (
        <button onClick={() => onToggleHidden(current.id, !current.hidden)}
                className={`absolute left-2 top-2 rounded-lg border px-2.5 py-1 text-[12px] backdrop-blur ${
                  current.hidden
                    ? "border-jade/60 bg-bg/85 text-jade hover:bg-jade/15"
                    : "border-line bg-bg/80 text-muted hover:border-chili hover:text-chili"}`}>
          {current.hidden ? t("gallery.restore") : t("gallery.hideThisOne")}
        </button>
      )}

      {canEdit && onRemove && (
        <button
          onClick={() => onRemove(current.id)}
          title={t("gallery.removeImage")}
          className="absolute right-2 top-2 rounded-lg border border-chili/60 bg-bg/80 px-2.5 py-1 text-[12px] text-chili backdrop-blur hover:bg-chili/15">
          {t("gallery.removeImage")}
        </button>
      )}
    </div>
  );
}
