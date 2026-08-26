"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

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
 * and drawn once, at full quality, straight to the output size.
 *
 * The picture can never be dragged out of its own frame — the offsets are clamped
 * so it always covers. An avatar with a sliver of empty canvas down one edge is
 * the kind of thing nobody notices until it is on every page.
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

  function rezoom(next: number) {
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
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
    canvas.toBlob((b) => { if (b) onDone(b); }, "image/jpeg", 0.9);
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={frame}
           onPointerDown={down} onPointerMove={move}
           onPointerUp={up} onPointerCancel={up}
           style={{ height: box.h || undefined }}
           className={`relative w-full cursor-grab touch-none select-none overflow-hidden border border-line bg-bg active:cursor-grabbing ${
             round ? "rounded-full" : "rounded-xl"}`}>
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
        <input type="range" min={1} max={4} step={0.01} value={zoom}
               onChange={(e) => rezoom(Number(e.target.value))}
               className="h-1 flex-1 accent-[var(--color-accent)]" />
      </label>

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
