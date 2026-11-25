"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLang } from "@/lib/i18n";
import FocusPicture from "@/components/guides/FocusPicture";
import { seatColor, type Seat, type StepRow } from "@/lib/guides";

/**
 * A guide's pictures, one at a time, as large as the screen allows.
 *
 * The owner, 2026-11-25: "ทำให้กดดูรูปใหญ่ได้". A plain image viewer would show
 * the picture without the light on your own spot, which is the point of it,
 * so this draws the same FocusPicture large, with your line under it and a
 * switch to the whole picture. ‹ › (arrow keys, a swipe on a phone) go
 * through every picture in the guide in order, which is how somebody studies
 * a fight before a pull.
 *
 * Built like ui/ImageLightbox so the two read as one family: the dark ground
 * closes it, ✕ at the top right, the count at the bottom.
 */
export default function PictureViewer({
  steps, at, seat, onMove, onClose,
}: {
  steps: StepRow[];
  at: number;
  seat: Seat;
  onMove: (at: number) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [whole, setWhole] = useState(false);
  const many = steps.length > 1;
  const step = steps[at];
  const move = (d: number) => { if (many) onMove((at + d + steps.length) % steps.length); };
  const swipe = useRef<number | null>(null);
  // A swipe that ends on the dark ground is not a tap on it.
  const swiped = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!step) return null;
  const spot = step.spots[seat];
  const points = spot?.at ?? [];
  const color = seatColor(seat);
  const W = step.pic_w ?? 1000, H = step.pic_h ?? 1000;
  const nav = "grid size-11 place-items-center rounded-full border border-line bg-bg/85 text-title text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent";

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="rise-in fixed inset-0 z-[80] bg-bg/95 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDown={(e) => { swipe.current = e.clientX; }}
          onPointerUp={(e) => {
            const from = swipe.current;
            swipe.current = null;
            if (from == null) return;
            const dx = e.clientX - from;
            if (Math.abs(dx) > 60) { swiped.current = true; move(dx < 0 ? 1 : -1); }
          }}
          onClickCapture={(e) => {
            if (swiped.current) { swiped.current = false; e.preventDefault(); e.stopPropagation(); }
          }}
          className="rise-in fixed inset-0 z-[81] flex flex-col items-center justify-center gap-3 p-3 outline-none sm:p-5">
          <Dialog.Close className="absolute inset-0 cursor-zoom-out" aria-label={t("common.close")} />

          <div className="relative flex w-full max-w-5xl items-start justify-between gap-3 pr-12">
            <Dialog.Title className="min-w-0 text-left">
              {step.mech && <span className="block text-ui text-muted">{step.mech}</span>}
              <span className="text-title font-semibold text-ink">{step.name}</span>
            </Dialog.Title>
          </div>

          {/* As wide as the screen, and no taller than what is left of it once
              the title and the line under it have their room. */}
          <div className="relative" style={{ width: `min(100%, calc((100dvh - 15rem) * ${W / H}), 72rem)` }}>
            <FocusPicture picture={step.picture} w={step.pic_w} h={step.pic_h} points={points}
                          ring={step.ring} color={color} focus={!whole} alt={step.name} />
          </div>

          <div className="relative flex w-full max-w-5xl flex-col items-center gap-2">
            {spot?.say && (
              <p className="flex max-w-3xl items-start gap-2 text-lead font-semibold leading-snug text-ink">
                <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-data text-label font-bold text-white"
                      style={{ backgroundColor: color }}>{seat}</span>
                <span className="min-w-0 break-words">{spot.say}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              {many && <button type="button" onClick={() => move(-1)} aria-label={t("gallery.prev")} className={nav}>‹</button>}
              {points.length > 0 && (
                <button type="button" onClick={() => setWhole((v) => !v)} aria-pressed={whole}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg/85 px-4 text-read text-ink backdrop-blur hover:border-accent hover:text-accent">
                  <span aria-hidden>{whole ? "◎" : "⤢"}</span>
                  {whole ? t("guide.showMine") : t("guide.showAll")}
                </button>
              )}
              {many && (
                <span className="rounded-full border border-line bg-bg/85 px-3 py-1 font-data text-meta text-muted backdrop-blur">
                  {t("gallery.imageOf", { n: at + 1, total: steps.length })}
                </span>
              )}
              {many && <button type="button" onClick={() => move(1)} aria-label={t("gallery.next")} className={nav}>›</button>}
            </div>
          </div>

          <Dialog.Close
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full border border-line bg-bg/85 text-muted backdrop-blur transition-colors hover:border-accent hover:text-accent"
            aria-label={t("common.close")}>
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
