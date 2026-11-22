import ART from "./krathong-art.json";
import type { Design } from "./krathong";

/**
 * Drawing a krathong from its parts (lib/town/krathong-art.json, built by pixel/build-krathong.mjs): each part a
 * picture of its own laid in the 48×40 template, back to front: base, the ring's back half, the light (three
 * frames of its flame), the centrepiece, the ring's front half, the trims on the rim. Pixel art at whole steps only.
 */

type Rect = [number, number, number, number];
interface PartArt { at?: Rect; frames?: Rect[]; place?: [number, number] }
interface PropArt { at: Rect; foot: [number, number]; scale?: number }
interface ArtJson { v: number; image: string; size: [number, number]; canvas: [number, number]; mapScale?: number; trims?: Array<[number, number]>; parts: Record<string, PartArt>; props: Record<string, PropArt> }
const A = ART as unknown as ArtJson;

export const CANVAS = A.canvas;
/** Screen pixels a krathong art pixel takes on the town map at camera scale 1. */
export const MAP_SCALE = A.mapScale ?? 1;
/** Where trims stand on the rim: their bottom middles in the template. */
export const TRIM_FEET: Array<[number, number]> = A.trims?.length ? A.trims : [[10, 43], [24, 47], [38, 43]];

let img: HTMLImageElement | null = null;
const waiting = new Set<() => void>();
/** The atlas, once it has come (null before; `then` is told when it does). */
export function krathongImage(then?: () => void): HTMLImageElement | null {
  if (!A.image) return null;
  if (img?.complete && img.naturalWidth) return img;
  if (then) waiting.add(then);
  if (!img && typeof Image !== "undefined") {
    img = new Image();
    img.decoding = "async";
    img.onload = () => { for (const fn of waiting) fn(); waiting.clear(); };
    img.src = A.image;
  }
  return null;
}
export const hasArt = () => !!A.image && Object.keys(A.parts).length > 0;

/**
 * Lay a krathong's parts onto a 2D context: `x, y` the template's top-left in the context's pixels, `k` the size of an
 * art pixel there, `frame` which of the light's three frames. Draws nothing until the atlas has come.
 */
export function drawKrathong(ctx: CanvasRenderingContext2D, design: Design, x: number, y: number, k: number, frame = 0): boolean {
  const im = krathongImage();
  if (!im) return false;
  const put = (r: Rect | undefined, px: number, py: number) => {
    if (!r) return;
    ctx.drawImage(im, r[0], r[1], r[2], r[3], Math.round(x + px * k), Math.round(y + py * k), r[2] * k, r[3] * k);
  };
  const part = (id: string) => A.parts[id];
  const at = (id: string) => { const p = part(id); if (p?.at) put(p.at, p.place?.[0] ?? 0, p.place?.[1] ?? 0); };
  ctx.imageSmoothingEnabled = false;
  at(design.base[0]);
  at(`${design.ring[0]}_back`);
  const light = part(design.light[0]);
  if (light?.frames?.length) put(light.frames[((frame % light.frames.length) + light.frames.length) % light.frames.length], light.place?.[0] ?? 0, light.place?.[1] ?? 0);
  else if (light?.at) at(design.light[0]);
  at(design.centre[0]);
  at(`${design.ring[0]}_front`);
  design.trims.slice(0, TRIM_FEET.length).forEach((t, i) => {
    const r = part(t[0])?.at;
    if (!r) return;
    const [fx, fy] = TRIM_FEET[i];
    put(r, fx - Math.floor(r[2] / 2), fy - r[3]);
  });
  return true;
}

/** One part alone, centred in a `box`-pixel square at the largest whole zoom that fits (a ring: both halves). */
export function drawPart(ctx: CanvasRenderingContext2D, id: string, box: number): boolean {
  const im = krathongImage();
  if (!im) return false;
  const p = A.parts[id], back = A.parts[`${id}_back`], front = A.parts[`${id}_front`];
  const pieces: Array<{ r: Rect; px: number; py: number }> = [];
  if (back?.at) pieces.push({ r: back.at, px: back.place?.[0] ?? 0, py: back.place?.[1] ?? 0 });
  if (front?.at) pieces.push({ r: front.at, px: front.place?.[0] ?? 0, py: front.place?.[1] ?? 0 });
  const one = p?.at ?? p?.frames?.[0];
  if (one) pieces.push({ r: one, px: p?.place?.[0] ?? 0, py: p?.place?.[1] ?? 0 });
  if (!pieces.length) return true;
  const x0 = Math.min(...pieces.map((q) => q.px)), y0 = Math.min(...pieces.map((q) => q.py));
  const x1 = Math.max(...pieces.map((q) => q.px + q.r[2])), y1 = Math.max(...pieces.map((q) => q.py + q.r[3]));
  const k = Math.max(1, Math.floor(box / Math.max(x1 - x0, y1 - y0)));
  const ox = Math.floor((box - (x1 - x0) * k) / 2), oy = Math.floor((box - (y1 - y0) * k) / 2);
  ctx.imageSmoothingEnabled = false;
  for (const q of pieces) ctx.drawImage(im, q.r[0], q.r[1], q.r[2], q.r[3], ox + (q.px - x0) * k, oy + (q.py - y0) * k, q.r[2] * k, q.r[3] * k);
  return true;
}

/** A prop of the festival (the stall, the hall), standing with its foot at x, y; `k` screen pixels an art pixel. */
export function drawProp(ctx: CanvasRenderingContext2D, name: "stall" | "hall", x: number, y: number, k: number): { x0: number; y0: number; x1: number; y1: number } | null {
  const im = krathongImage(), p = A.props[name];
  if (!im || !p) return null;
  const kk = k * (p.scale ?? 1), [sx, sy, w, h] = p.at, left = x - p.foot[0] * kk, top = y - p.foot[1] * kk;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, sx, sy, w, h, Math.round(left), Math.round(top), w * kk, h * kk);
  return { x0: left, y0: top, x1: left + w * kk, y1: top + h * kk };
}
/** The hall's three pedestals: where a krathong's bottom middle sits on each, in the hall's own art pixels (left, middle, right). */
export function hallSlots(): Array<[number, number]> {
  const p = A.props.hall as (PropArt & { slots?: Array<[number, number]> }) | undefined;
  if (p?.slots?.length) return p.slots.map(([x, y]) => [x * (p.scale ?? 1), y * (p.scale ?? 1)]);
  const w = (p?.at[2] ?? 120) * (p?.scale ?? 1), h = (p?.at[3] ?? 80) * (p?.scale ?? 1);
  return [[w * 0.22, h * 0.55], [w * 0.5, h * 0.5], [w * 0.78, h * 0.55]];
}
export const propSize =(name: "stall" | "hall"): [number, number] | null => { const p = A.props[name]; return p ? [p.at[2] * (p.scale ?? 1), p.at[3] * (p.scale ?? 1)] : null; };
