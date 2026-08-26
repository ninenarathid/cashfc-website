"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Draw a region of a picture down to a target size without losing it on the way.
 *
 * A single drawImage from four thousand pixels to five hundred throws away most
 * of what it was handed. Successive halves keep the average of everything.
 */
function drawStepped(
  target: CanvasRenderingContext2D, img: CanvasImageSource,
  sx: number, sy: number, sw: number, sh: number, dw: number, dh: number,
) {
  let w = Math.max(1, Math.round(sw));
  let h = Math.max(1, Math.round(sh));
  let stage = document.createElement("canvas");
  stage.width = w; stage.height = h;
  const first = stage.getContext("2d");
  if (!first) return;
  first.imageSmoothingQuality = "high";
  first.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  while (w > dw * 2 && h > dh * 2) {
    const nw = Math.max(dw, Math.round(w / 2));
    const nh = Math.max(dh, Math.round(h / 2));
    const next = document.createElement("canvas");
    next.width = nw; next.height = nh;
    const ctx = next.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(stage, 0, 0, w, h, 0, 0, nw, nh);
    stage = next; w = nw; h = nh;
  }

  target.drawImage(stage, 0, 0, w, h, 0, 0, dw, dh);
}

/**
 * Choosing which part of a picture to keep.
 *
 * The site draws portraits at one size and covers at another, so something has
 * to decide what to throw away. Doing it automatically means centre-cropping,
 * which on a GPose shot reliably keeps the middle of somebody's chest and loses
 * their face — the one thing the picture was taken for. So the member frames it:
 * drag to move, zoom to fill, and what is inside the frame is what everybody
 * sees.
 *
 * The frame is the real shape at a readable size rather than the output size, and
 * the export is worked back from it. Screenshots are far larger than any avatar,
 * so cropping at display scale and enlarging would have thrown away detail the
 * source still had; instead the visible rectangle is converted into source pixels
 * and cut from the original.
 *
 * The picture can never be dragged out of its own frame — the offsets are clamped
 * so it always covers. An avatar with a sliver of empty canvas down one edge is
 * the kind of thing nobody notices until it is on every page.
 *
 * Zoom stops where the picture runs out of pixels. A fixed ceiling let anybody
 * zoom to four times whatever they had, and past a certain point the crop is
 * asking for detail the source never held, so the browser invents it and the
 * result is the blocky avatar that prompted this. The ceiling is now worked out
 * from the picture itself: as far in as the source can go while still filling the
 * export honestly, and no further. A small picture therefore zooms less than a
 * large one, which is the truth of it rather than a restriction.
 *
 * The export steps down rather than leaping. A screenshot is several times the
 * size of an avatar, and asking the canvas to do that in one go samples too few
 * of the pixels it was given and comes out gritty; halving repeatedly costs a few
 * milliseconds and keeps the detail.
 */
export default function ImageCropper(
  { src, outWidth, outHeight, round = false, onDone, onCancel, busy = false }: {
    /** Blob or object URL. Never a remote URL — a tainted canvas cannot export. */
    src: string;
    outWidth: number;
    outHeight: number;
    /** Draw the frame as a circle: an avatar is round everywhere it is used. */
    round?: boolean;
    onDone: (blob: Blob) => void;
    onCancel: () => void;
    busy?: boolean;
  },
) {
  const { t } = useLang();
  const frame = useRef<HTMLDivElement | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const aspect = outWidth / outHeight;

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.src = src;
  }, [src]);

  // The frame is as wide as there is room for and as tall as its shape requires.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setBox({ w, h: Math.round(w / aspect) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // Scale at which the picture exactly covers the frame. Everything else is
  // measured from here, so zoom 1 always means "no empty space" whatever shape
  // the source happens to be.
  const cover = img && box.w
    ? Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) : 1;
  const scale = cover * zoom;
  const drawn = img
    ? { w: img.naturalWidth * scale, h: img.naturalHeight * scale }
    : { w: 0, h: 0 };

  // As far in as the source can go while the crop still holds roughly one source
  // pixel for every pixel of the export. A quarter over that is allowed on
  // purpose: a 1080p screenshot cannot honestly fill a 1600px cover at all, and
  // a slider frozen at its minimum is worse than a shade of softness nobody can
  // see. Four times over is what made the blocky avatar, and that is now out of
  // reach. Six is a sanity stop for a picture so large the frame would otherwise
  // become a microscope.
  const OVERSHOOT = 1.25;
  const maxZoom = img && box.w && cover
    ? Math.max(1, Math.min(6, (box.w * OVERSHOOT) / (cover * outWidth)))
    : 1;
  // Even fully zoomed out there is not enough picture here — worth saying, since
  // the zoom being stuck at its minimum otherwise looks like a broken slider.
  const tooSmall = !!img && box.w > 0 && box.w / cover < outWidth - 1;

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.min(0, Math.max(box.w - drawn.w, x)),
    y: Math.min(0, Math.max(box.h - drawn.h, y)),
  }), [box.w, box.h, drawn.w, drawn.h]);

  // Re-centre whenever the picture or the frame changes underneath.
  useEffect(() => {
    if (!img || !box.w) return;
    setOff({ x: (box.w - drawn.w) / 2, y: (box.h - drawn.h) / 2 });
    // Only on a new picture or a new frame — not on every zoom step, which
    // handles its own offsets so the centre of the frame stays put.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, box.w, box.h]);

  // A new picture, or a resized frame, can lower the ceiling under a zoom that
  // was fine a moment ago.
  useEffect(() => {
    setZoom((z) => Math.min(z, maxZoom));
  }, [maxZoom]);

  function rezoom(raw: number) {
    const next = Math.min(maxZoom, Math.max(1, raw));
    const before = cover * zoom;
    const after = cover * next;
    if (!before || !after) { setZoom(next); return; }
    // Keep whatever is in the middle of the frame in the middle of the frame.
    const cx = (box.w / 2 - off.x) / before;
    const cy = (box.h / 2 - off.y) / before;
    setZoom(next);
    const w = (img?.naturalWidth ?? 0) * after;
    const h = (img?.naturalHeight ?? 0) * after;
    const x = Math.min(0, Math.max(box.w - w, box.w / 2 - cx * after));
    const y = Math.min(0, Math.max(box.h - h, box.h / 2 - cy * after));
    setOff({ x, y });
  }

  function down(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setOff(clamp(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y)));
  }
  function up() { drag.current = null; }

  function save() {
    if (!img || !box.w) return;
    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    // The frame, expressed in the source picture's own pixels — so the export is
    // cut from the original at full size rather than from anything on screen.
    const sx = -off.x / scale;
    const sy = -off.y / scale;
    const sw = box.w / scale;
    const sh = box.h / scale;
    drawStepped(ctx, img, sx, sy, sw, sh, outWidth, outHeight);
    canvas.toBlob((b) => { if (b) onDone(b); }, "image/jpeg", 0.92);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* A round frame is held to a comfortable size. Filling the page with a
          circle made the crop no more precise and the section no easier to use. */}
      <div ref={frame}
           onPointerDown={down} onPointerMove={move}
           onPointerUp={up} onPointerCancel={up}
           style={{ height: box.h || undefined }}
           className={`relative w-full cursor-grab touch-none select-none overflow-hidden border border-line bg-bg active:cursor-grabbing ${
             round ? "mx-auto max-w-[340px] rounded-full" : "rounded-xl"}`}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" draggable={false}
               style={{
                 position: "absolute", left: off.x, top: off.y,
                 width: drawn.w, height: drawn.h, maxWidth: "none",
               }} />
        )}
      </div>

      <label className="flex items-center gap-3">
        <span className="font-data text-[11px] uppercase tracking-[0.14em] text-muted">
          {t("profile.picZoom")}
        </span>
        <input type="range" min={1} max={Math.max(1.01, maxZoom)} step={0.01}
               value={zoom} disabled={maxZoom <= 1}
               onChange={(e) => rezoom(Number(e.target.value))}
               className="h-1 flex-1 accent-[var(--color-accent)] disabled:opacity-40" />
      </label>

      {tooSmall && (
        <p className="text-[12px] leading-relaxed text-muted">
          {t("profile.picSmall")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={!img || busy}
                className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-[13.5px] text-accent hover:bg-accent/25 disabled:opacity-50">
          {busy ? t("profile.picSaving") : t("gallery.save")}
        </button>
        <button onClick={onCancel} disabled={busy}
                className="rounded-lg border border-line px-4 py-2 text-[13.5px] text-muted hover:border-muted hover:text-ink disabled:opacity-40">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
