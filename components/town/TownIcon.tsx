import atlas from "@/lib/town/icon-atlas.json";

/**
 * Cash Town's icons: pixel art made for the town (the fc-cash-town skill's
 * scripts/pixel/build-icons.mjs), never emoji (the owner's call, 2026-10-02).
 * One small picture holds them all; each icon is a window onto it.
 */
export type IconName = keyof typeof atlas.icons;

/** The picture and where each icon sits in it, for drawing one on a canvas. */
export const ICON_ATLAS = atlas as {
  image: string; size: [number, number]; icons: Record<IconName, [number, number, number, number]>;
  /** The mouse cursor's frames: where in each the click lands (the arrow's tip, the finger's tip). */
  cursor: Partial<Record<IconName, [number, number]>>;
};

export default function TownIcon({ name, size = 20, className = "" }: {
  name: IconName;
  /** The longer side, in CSS pixels. */
  size?: number;
  className?: string;
}) {
  // (a picture not built into the atlas yet, of something declared before it was drawn: an empty place of its size)
  const cell = ICON_ATLAS.icons[name] as [number, number, number, number] | undefined;
  if (!cell) return <span aria-hidden className={className} style={{ display: "inline-block", width: size, height: size }} data-icon-missing={name} />;
  const [x, y, w, h] = cell;
  const k = size / Math.max(w, h);
  return (
    <span aria-hidden className={`inline-block shrink-0 align-middle ${className}`}
          style={{
            width: Math.round(w * k), height: Math.round(h * k),
            backgroundImage: `url(${ICON_ATLAS.image})`,
            backgroundSize: `${ICON_ATLAS.size[0] * k}px ${ICON_ATLAS.size[1] * k}px`,
            backgroundPosition: `${-x * k}px ${-y * k}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
          }} />
  );
}

/** Draw an icon on a canvas, centred on (cx, cy), its longer side `size` canvas units. */
export function drawIcon(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, name: IconName, cx: number, cy: number, size: number) {
  if (!img?.complete || !img.naturalWidth) return false;
  const [x, y, w, h] = ICON_ATLAS.icons[name];
  const k = size / Math.max(w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, w, h, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
  ctx.restore();
  return true;
}
