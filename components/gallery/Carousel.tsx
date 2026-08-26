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
/**
 * A chevron, drawn.
 *
 * The arrows were the characters ‹ and ›, which are punctuation: they inherit a
 * text font, sit on a baseline rather than in the middle of the button, and come
 * out a different weight in every face the site might load. A stroked path is the
 * same shape at every size and centres properly.
 */
function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width="22" height="22"
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round"
         style={back ? undefined : { transform: "rotate(180deg)" }}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

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
  // Pictures used to be swapped on the spot, which read as a flicker rather than
  // as a change. The old one fades out, the new one is put in place while nothing
  // is visible — which also hides the frame resizing between two different
  // shapes — and it fades back in once it has actually loaded.
  const [shown, setShown] = useState(true);
  const swapping = useRef(false);
  // The key handler is bound once and must not close over a stale swap; it asks
  // this for whatever the current one is.
  const showRef = useRef<(n: number) => void>(() => {});
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (settle.current) clearTimeout(settle.current); }, []);

  // Removing the picture you are looking at should not leave the viewer past
  // the end of the list.
  useEffect(() => {
    if (i > images.length - 1) setI(Math.max(0, images.length - 1));
  }, [images.length, i]);

  useEffect(() => {
    if (images.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      // Through the same path as the arrows, so the keyboard fades too rather
      // than snapping while the mouse does not.
      if (e.key === "ArrowLeft") showRef.current(-1);
      if (e.key === "ArrowRight") showRef.current(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  const current = images[i];
  if (!current) return null;

  function show(next: number) {
    if (next === i || swapping.current) return;
    const still = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still) { setI(next); return; }
    swapping.current = true;
    setShown(false);
    settle.current = setTimeout(() => {
      setI(next);
      // Normally the picture's own onLoad brings it back. This is the promise
      // that it comes back anyway — a file that never loads should leave an empty
      // frame, not an empty carousel nobody can get out of.
      settle.current = setTimeout(() => { setShown(true); swapping.current = false; }, 900);
    }, 170);
  }

  const go = (d: number) => show((i + d + images.length) % images.length);
  showRef.current = go;

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
      <img key={current.url} src={current.url} alt=""
           width={current.width ?? undefined} height={current.height ?? undefined}
           draggable={false}
           onLoad={() => {
             if (settle.current) { clearTimeout(settle.current); settle.current = null; }
             setShown(true);
             swapping.current = false;
           }}
           className={`block max-h-[78vh] w-auto max-w-full rounded-xl border border-line bg-bg transition-opacity duration-300 ${
             shown ? "opacity-100" : "opacity-0"}`} />

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
          {/* Quiet until the pointer is over the picture, and never quite
              invisible on a touch screen where there is no hover to wait for.
              A round target big enough to hit without aiming. */}
          <button onClick={() => go(-1)} aria-label={t("gallery.prev")}
                  className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-bg/45 text-ink/85 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-bg/80 hover:text-ink group-hover/photo:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
            <Chevron back />
          </button>
          <button onClick={() => go(1)} aria-label={t("gallery.next")}
                  className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-bg/45 text-ink/85 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-bg/80 hover:text-ink group-hover/photo:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
            <Chevron />
          </button>
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-bg/55 px-2.5 py-1 font-data text-[11.5px] text-ink/90 opacity-0 backdrop-blur transition-opacity duration-200 group-hover/photo:opacity-100 [@media(hover:none)]:opacity-100">
            {t("gallery.imageOf", { n: i + 1, total: images.length })}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((img, n) => (
              <button key={img.id} onClick={() => show(n)}
                      aria-label={t("gallery.imageOf", { n: n + 1, total: images.length })}
                      className={`rounded-full shadow transition-all duration-200 ${
                        n === i ? "size-2.5 bg-accent" : "size-2 bg-ink/45 hover:bg-ink/80"}`} />
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
