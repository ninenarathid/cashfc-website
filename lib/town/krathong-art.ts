import ART from "./krathong-art.json";
import { COLORS, colorOf, type Design } from "./krathong";

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
 * A part's pixels dyed one of COLORS (the owner, 2026-11-24: "เอาให้เปลี่ยนสีได้ด้วย ในแต่ละส่วนประกอบ"): each pixel takes
 * the colour's hue at its own lightness, so the part's shading and its pixels stay as drawn; its dark outline stays, and
 * a light's flame (bright yellow-orange) stays a flame. Kept, one canvas a part's rect and colour, for the river's many.
 */
const dyed = new Map<string, HTMLCanvasElement | null>();
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function dye(im: HTMLImageElement, r: Rect, color: number, light: boolean): HTMLCanvasElement | null {
  const c = COLORS[color];
  if (!c || c.mode === "own" || typeof document === "undefined") return null;
  const key = `${r.join(",")}|${color}|${light ? 1 : 0}`;
  if (dyed.has(key)) return dyed.get(key)!;
  const cv = document.createElement("canvas");
  cv.width = r[2]; cv.height = r[3];
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) { dyed.set(key, null); return null; }
  ctx.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
  let data: ImageData;
  try { data = ctx.getImageData(0, 0, r[2], r[3]); } catch { dyed.set(key, null); return null; }
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const [h, sat, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    if (l < 0.13) continue; // the outline
    if (light && ((h >= 18 && h <= 66 && sat > 0.45 && l > 0.55) || l > 0.86)) continue; // the flame and its glow
    let nh = h, ns = sat, nl = l;
    if (c.mode === "hue") { nh = c.h ?? h; ns = Math.min(1, Math.max(sat, 0.22) * 0.45 + (c.s ?? 0.6) * 0.55); }
    else if (c.mode === "white") { ns = sat * 0.12; nl = 0.42 + l * 0.6; }
    else if (c.mode === "dark") { ns = sat * 0.45; nl = l * 0.58; }
    const [rr, gg, bb] = hslToRgb(nh, ns, Math.min(0.97, nl));
    px[i] = rr; px[i + 1] = gg; px[i + 2] = bb;
  }
  ctx.putImageData(data, 0, 0);
  dyed.set(key, cv);
  return cv;
}

/**
 * Lay a krathong's parts onto a 2D context: `x, y` the template's top-left in the context's pixels, `k` the size of an
 * art pixel there, `frame` which of the light's three frames. Draws nothing until the atlas has come.
 */
export function drawKrathong(ctx: CanvasRenderingContext2D, design: Design, x: number, y: number, k: number, frame = 0): boolean {
  const im = krathongImage();
  if (!im) return false;
  const put = (r: Rect | undefined, px: number, py: number, color = 0, light = false) => {
    if (!r) return;
    const dx = Math.round(x + px * k), dy = Math.round(y + py * k), d = color ? dye(im, r, color, light) : null;
    if (d) ctx.drawImage(d, 0, 0, r[2], r[3], dx, dy, r[2] * k, r[3] * k);
    else ctx.drawImage(im, r[0], r[1], r[2], r[3], dx, dy, r[2] * k, r[3] * k);
  };
  const part = (id: string) => A.parts[id];
  const at = (id: string, color = 0) => { const p = part(id); if (p?.at) put(p.at, p.place?.[0] ?? 0, p.place?.[1] ?? 0, color); };
  ctx.imageSmoothingEnabled = false;
  at(design.base[0], colorOf(design.base));
  at(`${design.ring[0]}_back`, colorOf(design.ring));
  const light = part(design.light[0]), lc = colorOf(design.light);
  if (light?.frames?.length) put(light.frames[((frame % light.frames.length) + light.frames.length) % light.frames.length], light.place?.[0] ?? 0, light.place?.[1] ?? 0, lc, true);
  else if (light?.at) put(light.at, light.place?.[0] ?? 0, light.place?.[1] ?? 0, lc, true);
  at(design.centre[0], colorOf(design.centre));
  at(`${design.ring[0]}_front`, colorOf(design.ring));
  design.trims.slice(0, TRIM_FEET.length).forEach((t, i) => {
    const r = part(t[0])?.at;
    if (!r) return;
    const [fx, fy] = TRIM_FEET[i];
    put(r, fx - Math.floor(r[2] / 2), fy - r[3], colorOf(t));
  });
  return true;
}

/** One part alone, centred in a `box`-pixel square at the largest whole zoom that fits (a ring: both halves). */
export function drawPart(ctx: CanvasRenderingContext2D, id: string, box: number, color = 0): boolean {
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
  const light = !!p?.frames?.length;
  for (const q of pieces) {
    const d = color ? dye(im, q.r, color, light) : null;
    if (d) ctx.drawImage(d, 0, 0, q.r[2], q.r[3], ox + (q.px - x0) * k, oy + (q.py - y0) * k, q.r[2] * k, q.r[3] * k);
    else ctx.drawImage(im, q.r[0], q.r[1], q.r[2], q.r[3], ox + (q.px - x0) * k, oy + (q.py - y0) * k, q.r[2] * k, q.r[3] * k);
  }
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
