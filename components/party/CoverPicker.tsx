"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentDef } from "@/lib/party";
import type { CoverChoice, Crop } from "@/lib/party-cover";
import {
  COVER_MIN_W, COVER_PICK_MAX, PHONE_SHOWS, clampCrop, coverKin,
  coverUrl, cropRect, maxZoom, outputSize, partyArt, zoomAt,
} from "@/lib/party-cover";
import { loadCoverChoices, uploadPartyCover } from "@/lib/party-db";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";

/**
 * A party's own picture, chosen in the form (v332).
 *
 * Optional, and says so: most parties are happy with the duty's banner, and
 * the field stays one small row until somebody wants it. Three ways to answer:
 * upload and crop a picture, take one another lead already used for this
 * fight (the most used first), or go back to the banner.
 *
 * The preview is the shape the board draws, so what is chosen here is what
 * the window, the row and the Discord card will show.
 */
export default function CoverPicker(
  { value, onChange, def, content, userId }: {
    /** The chosen path, or null for the duty's banner. */
    value: string | null;
    onChange: (path: string | null) => void;
    def: ContentDef;
    content: readonly ContentDef[];
    userId: string;
  },
) {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [choices, setChoices] = useState<CoverChoice[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  /*
   * What other leads have used for this fight, read when the fight is chosen.
   *
   * Once per fight rather than when the gallery opens, so the button can say
   * how many there are — and not appear at all where there are none, which
   * is most fights for now.
   */
  const kinKey = def.key;
  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    let live = true;
    void loadCoverChoices(sb, coverKin(def, content), def.key)
      .then((c) => { if (live) setChoices(c); });
    return () => { live = false; };
    // The catalogue does not change while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kinKey]);

  const art = partyArt(value, def);
  const tap = "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-read transition-colors sm:min-h-9";

  const pick = (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (!f.type.startsWith("image/") || f.type === "image/svg+xml") { setErr(t("pf.notPicture")); return; }
    if (f.size > COVER_PICK_MAX) { setErr(t("pf.tooBig")); return; }
    setFile(f);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-data text-meta uppercase tracking-[0.14em] text-muted">
          {t("pf.cover")}
        </span>
        <span className="text-read text-muted">{t("pf.coverOptional")}</span>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {/* The banner's own shape, small. */}
        <div style={{
               backgroundImage: art ? `url(${art.url})` : undefined,
               backgroundPosition: art?.focus ?? "center",
             }}
             className="relative aspect-[1128/360] w-full shrink-0 overflow-hidden rounded-lg border border-line bg-card bg-cover sm:w-[220px]">
          <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 font-data text-meta ${
            value ? "bg-accent/85 text-bg" : "bg-black/60 text-white/90"}`}>
            {value ? t("pf.coverOwn") : t("pf.coverDefault")}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => pickRef.current?.click()}
                    className={`${tap} border-accent/70 bg-accent/10 text-accent hover:bg-accent/20`}>
              <span aria-hidden>⬆</span>
              {value ? t("pf.coverChange") : t("pf.coverUpload")}
            </button>
            {choices.length > 0 && (
              <button type="button" onClick={() => setBrowsing(true)}
                      className={`${tap} border-line text-ink hover:border-muted`}>
                <span aria-hidden>🖼</span>
                {t("pf.coverPickUsed", { n: choices.length })}
              </button>
            )}
            {value && (
              <button type="button" onClick={() => onChange(null)}
                      className={`${tap} border-line text-muted hover:border-muted hover:text-ink`}>
                <span aria-hidden>↺</span>
                {t("pf.coverReset")}
              </button>
            )}
          </div>
          <p className="text-meta leading-relaxed text-muted">{t("pf.coverGuide")}</p>
          {err && <p className="text-read text-chili" role="alert">{err}</p>}
        </div>
      </div>

      <input ref={pickRef} type="file" hidden
             accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
             onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

      {file && (
        <CoverCrop file={file} userId={userId}
                   onCancel={() => setFile(null)}
                   onDone={(path) => { setFile(null); onChange(path); }} />
      )}

      {browsing && (
        <CoverGallery def={def} choices={choices} value={value}
                      onPick={(p) => { onChange(p); setBrowsing(false); }}
                      onClose={() => setBrowsing(false)} />
      )}
    </section>
  );
}

/* ── the gallery ─────────────────────────────────────────────────────────── */

export function CoverGallery(
  { def, choices, value, onPick, onClose }: {
    def: ContentDef;
    choices: CoverChoice[];
    value: string | null;
    onPick: (path: string | null) => void;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const tile = (on: boolean) =>
    `relative aspect-[1128/360] w-full overflow-hidden rounded-xl border-2 bg-card text-left transition-colors ${
      on ? "border-accent" : "border-line hover:border-muted"}`;
  const chip = "rounded-md bg-black/65 px-1.5 py-0.5 font-data text-meta text-white/90";

  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }} wide
           title={t("pf.coverUsedTitle")}>
      <div className="flex flex-col gap-3">
        <p className="text-read text-muted">
          {t("pf.coverUsedHint", { name: def.duty ?? def.name })}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {/* The banner first: going back to it is always one of the choices. */}
          {def.art && (
            <button type="button" onClick={() => onPick(null)} className={tile(!value)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={def.art} alt="" loading="lazy"
                   style={{ objectPosition: def.focus ?? "center" }}
                   className="absolute inset-0 h-full w-full object-cover" />
              <span className={`absolute left-2 top-2 ${chip}`}>{t("pf.coverDefault")}</span>
            </button>
          )}
          {choices.map((c, i) => {
            const url = coverUrl(c.path);
            if (!url) return null;
            return (
              <button key={c.path} type="button" onClick={() => onPick(c.path)}
                      className={tile(value === c.path)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy"
                     className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
                  {i === 0 && c.uses > 1 && (
                    <span className="rounded-md bg-accent/90 px-1.5 py-0.5 font-data text-meta text-bg">
                      🔥 {t("pf.coverPopular")}
                    </span>
                  )}
                  {!c.same && <span className={chip}>{t("pf.coverKin")}</span>}
                </span>
                <span className={`absolute bottom-2 right-2 ${chip}`}>
                  {t("pf.coverUsed", { n: c.uses })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* ── the crop ────────────────────────────────────────────────────────────── */

/**
 * Cropping a picked file to the banner's shape, in the browser.
 *
 * The frame is the banner, and the picture moves under it: drag to move,
 * wheel or pinch or the slider to zoom, the arrow keys and + / - from the
 * keyboard. The crop is kept in the picture's own pixels (see Crop), so the
 * frame can be any width and the piece taken is the same.
 *
 * What a phone will show is drawn over it, and the board's own shading along
 * the bottom with a time on it, so the lead sees the picture as the board
 * will draw it rather than as a rectangle.
 *
 * Only the piece is uploaded, already the right size, so a twelve-megapixel
 * phone photo goes up as a couple of hundred kilobytes.
 */
export function CoverCrop(
  { file, userId, onCancel, onDone }: {
    file: File;
    userId: string;
    onCancel: () => void;
    onDone: (path: string) => void;
  },
) {
  const { t } = useLang();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [frameW, setFrameW] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** The file would not decode as a picture. */
  const [bad, setBad] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  /*
   * The file, decoded once.
   *
   * On the file alone: anything else in the list would run this again while
   * the picture is on screen, and the cleanup would revoke the address it is
   * being drawn from.
   */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    let live = true;
    im.src = url;
    im.decode().then(() => {
      if (!live) return;
      if (im.naturalWidth < 16 || im.naturalHeight < 16) { setBad(true); return; }
      setImg(im);
      setCrop(clampCrop({ cx: im.naturalWidth / 2, cy: im.naturalHeight / 2, zoom: 1 },
        im.naturalWidth, im.naturalHeight));
    }).catch(() => { if (live) setBad(true); });
    return () => { live = false; URL.revokeObjectURL(url); };
  }, [file]);

  /* How wide the frame is drawn, which sets how many screen pixels a picture pixel is. */
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  const iw = img?.naturalWidth ?? 1, ih = img?.naturalHeight ?? 1;
  const rect = crop && img ? cropRect(crop, iw, ih) : null;
  const k = rect && frameW ? frameW / rect.sw : 0;
  const zMax = img ? maxZoom(iw, ih) : 1;

  const move = useCallback((dx: number, dy: number) => {
    if (!img) return;
    setCrop((c) => {
      if (!c || !frame.current) return c;
      const r = cropRect(c, img.naturalWidth, img.naturalHeight);
      const kk = frame.current.clientWidth / r.sw;
      return clampCrop({ ...c, cx: c.cx - dx / kk, cy: c.cy - dy / kk },
        img.naturalWidth, img.naturalHeight);
    });
  }, [img]);

  const zoomTo = useCallback((to: number, fx = 0.5, fy = 0.5) => {
    if (!img) return;
    setCrop((c) => c && zoomAt(c, to, fx, fy, img.naturalWidth, img.naturalHeight));
  }, [img]);

  /* The wheel, as a listener of its own: React's is passive and cannot stop the page scrolling. */
  useEffect(() => {
    const el = frame.current;
    if (!el || !img) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = el.getBoundingClientRect();
      setCrop((c) => c && zoomAt(c, c.zoom * Math.exp(-e.deltaY * 0.0015),
        (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height,
        img.naturalWidth, img.naturalHeight));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [img]);

  const down = (e: React.PointerEvent) => {
    frame.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const drag = (e: React.PointerEvent) => {
    const all = pointers.current;
    const was = all.get(e.pointerId);
    if (!was || !img || !frame.current) return;
    if (all.size === 1) {
      move(e.clientX - was.x, e.clientY - was.y);
    } else if (all.size === 2) {
      // Two fingers: the gap between them is the zoom, their middle the point it holds.
      const other = [...all.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(was.x - other.x, was.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const b = frame.current.getBoundingClientRect();
      const mx = ((e.clientX + other.x) / 2 - b.left) / b.width;
      const my = ((e.clientY + other.y) / 2 - b.top) / b.height;
      if (before > 4) {
        setCrop((c) => c && zoomAt(c, c.zoom * (after / before), mx, my,
          img.naturalWidth, img.naturalHeight));
      }
    }
    all.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); };

  const key = (e: React.KeyboardEvent) => {
    const step = 12;
    const go: Record<string, () => void> = {
      ArrowLeft: () => move(step, 0), ArrowRight: () => move(-step, 0),
      ArrowUp: () => move(0, step), ArrowDown: () => move(0, -step),
      "+": () => crop && zoomTo(crop.zoom * 1.1), "=": () => crop && zoomTo(crop.zoom * 1.1),
      "-": () => crop && zoomTo(crop.zoom / 1.1),
    };
    if (go[e.key]) { e.preventDefault(); go[e.key](); }
  };

  const out = rect ? outputSize(rect.sw) : null;
  const small = !!rect && rect.sw < COVER_MIN_W - 0.5;

  const save = async () => {
    if (!img || !rect || !out) return;
    const sb = createClient();
    if (!sb) return;
    setBusy(true); setErr(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = out.w; canvas.height = out.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, out.w, out.h);
      const as = (type: string, q: number) =>
        new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, q));
      // WebP where the browser can write it; an older Safari hands back a PNG
      // when asked, so that is caught and it goes up as a JPEG instead.
      let blob = await as("image/webp", 0.86);
      if (!blob || blob.type !== "image/webp") blob = await as("image/jpeg", 0.88);
      if (!blob) throw new Error("no picture");
      const r = await uploadPartyCover(sb, userId, blob);
      if ("error" in r) {
        setErr(r.error === "too-big" ? t("pf.tooBig")
          : r.error === "not-image" ? t("pf.notPicture") : r.error);
        return;
      }
      onDone(r.path);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const side = `${((1 - PHONE_SHOWS) / 2) * 100}%`;
  const btn = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 text-title text-ink hover:border-muted disabled:opacity-40 sm:min-h-9 sm:min-w-9";

  return (
    <Modal open sticky wide onOpenChange={(v) => { if (!v && !busy) onCancel(); }}
           title={t("pf.coverCrop")}>
      <div className="flex flex-col gap-3">
        <p className="text-read text-muted">{t("pf.coverCropHint")}</p>

        <div ref={frame} data-vaul-no-drag tabIndex={0}
             role="group" aria-label={t("pf.coverCrop")}
             onPointerDown={down} onPointerMove={drag}
             onPointerUp={up} onPointerCancel={up} onKeyDown={key}
             className="relative aspect-[1128/360] w-full cursor-grab touch-none select-none overflow-hidden rounded-xl border border-line bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing">
          {img && rect && k > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt="" draggable={false}
                 style={{
                   width: iw * k, height: ih * k, maxWidth: "none",
                   transform: `translate(${-rect.sx * k}px, ${-rect.sy * k}px)`,
                 }}
                 className="pointer-events-none absolute left-0 top-0" />
          )}
          {/* The board's own shading, and a time where the board puts one. */}
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <span aria-hidden className="pointer-events-none absolute bottom-2 left-3 font-data text-[19px] font-semibold tabular-nums text-white/90 drop-shadow">
            20:00
          </span>
          {/* What a phone keeps: the middle, about two to one. */}
          <span aria-hidden style={{ left: side, right: side }}
                className="pointer-events-none absolute inset-y-0 border-x-2 border-dashed border-white/70">
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded bg-black/60 px-1.5 font-data text-meta text-white/90">
              {t("pf.coverPhone")}
            </span>
          </span>
          {!img && !bad && (
            <span className="absolute inset-0 flex items-center justify-center text-read text-white/70">…</span>
          )}
        </div>

        <div data-vaul-no-drag className="flex flex-wrap items-center gap-2">
          <span className="font-data text-meta uppercase tracking-[0.14em] text-muted">{t("pf.coverZoom")}</span>
          <button type="button" className={btn} disabled={!crop || crop.zoom <= 1}
                  onClick={() => crop && zoomTo(crop.zoom / 1.2)} aria-label="−">−</button>
          <input type="range" min={1} max={zMax} step={0.01}
                 value={crop?.zoom ?? 1} disabled={!crop || zMax <= 1}
                 aria-label={t("pf.coverZoom")}
                 onChange={(e) => zoomTo(Number(e.target.value))}
                 className="h-11 min-w-[8rem] flex-1 accent-accent sm:h-9" />
          <button type="button" className={btn} disabled={!crop || crop.zoom >= zMax}
                  onClick={() => crop && zoomTo(crop.zoom * 1.2)} aria-label="+">+</button>
          <button type="button" className={btn} disabled={!img}
                  onClick={() => img && setCrop(clampCrop(
                    { cx: iw / 2, cy: ih / 2, zoom: 1 }, iw, ih))}>
            {t("pf.coverCentre")}
          </button>
        </div>

        <p className="text-meta leading-relaxed text-muted">{t("pf.coverKeepIn")}</p>
        {small && rect && (
          <p className="text-read text-gold">
            {t("pf.coverSmall", { w: Math.round(rect.sw), h: Math.round(rect.sh) })}
          </p>
        )}
        {(err || bad) && (
          <p className="text-read text-chili" role="alert">{bad ? t("pf.coverBadFile") : err}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {out && (
            <span className="mr-auto font-data text-meta text-muted">
              {out.w}×{out.h} px
            </span>
          )}
          <button type="button" onClick={onCancel} disabled={busy}
                  className="min-h-11 rounded-lg border border-line px-4 text-lead text-muted hover:border-muted hover:text-ink disabled:opacity-40 sm:min-h-9">
            {t("pf.cancel")}
          </button>
          <button type="button" onClick={() => void save()} disabled={!img || busy}
                  className="min-h-11 rounded-lg border border-accent bg-accent/15 px-4 text-lead text-accent hover:bg-accent/25 disabled:opacity-40 sm:min-h-9">
            {busy ? t("pf.coverSaving") : t("pf.coverUse")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
