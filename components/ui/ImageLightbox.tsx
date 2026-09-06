"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLang } from "@/lib/i18n";

/**
 * One picture, opened big, without leaving the page it belongs to.
 *
 * A new tab was the cheap answer and the wrong one: it takes the reader out of
 * the conversation the picture was attached to, loses the thread's scroll
 * position on the way back, and hands them a bare URL in a tab with no way of
 * telling which message it came from. Everything else on this site opens a
 * picture in place, and an attachment should not be the exception.
 *
 * A message may carry several, so the arrows are here too — being able to open
 * the second screenshot of a bug report without closing the first is most of
 * why somebody attached both.
 *
 * The picture is drawn at its own size up to the window and never past it:
 * a screenshot of a website is read by looking closely at one corner, and
 * anything that scales it down is working against the reason it was sent.
 */
export default function ImageLightbox(
  { images, at, onMove, onClose }: {
    images: string[];
    /** Which one is showing; the caller holds it so the arrows can move it. */
    at: number;
    onMove: (at: number) => void;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const many = images.length > 1;
  const step = (d: number) => onMove((at + d + images.length) % images.length);

  // Radix takes Escape. The arrows are ours, and they are what somebody
  // comparing a before and an after reaches for without thinking.
  useEffect(() => {
    if (!many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const src = images[at];
  if (!src) return null;

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="pop-in fixed inset-0 z-[80] bg-bg/90 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="pop-in fixed inset-0 z-[81] flex items-center justify-center p-4 outline-none">
          <Dialog.Title className="sr-only">{t("feedback.imageOpen")}</Dialog.Title>

          {/* The ground behind the picture is the way out of it, the same as
              every other viewer: click the dark, and it closes. */}
          <Dialog.Close className="absolute inset-0 cursor-zoom-out" aria-label={t("common.close")} />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt=""
               className="relative max-h-[88vh] max-w-full rounded-lg border border-line object-contain shadow-2xl shadow-black/60" />

          {many && (
            <>
              <button onClick={() => step(-1)} aria-label={t("gallery.prev")}
                      className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/85 text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent">
                ‹
              </button>
              <button onClick={() => step(1)} aria-label={t("gallery.next")}
                      className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/85 text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent">
                ›
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-bg/85 px-3 py-1 font-data text-[11.5px] text-muted backdrop-blur">
                {t("gallery.imageOf", { n: at + 1, total: images.length })}
              </div>
            </>
          )}

          <Dialog.Close
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-line bg-bg/85 text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
            aria-label={t("common.close")}>
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
