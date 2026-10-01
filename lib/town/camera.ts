import { COLS, ROWS, TILE_H, TILE_W, type Vec } from "./world";

/**
 * The town's camera: how far in it is zoomed and which point of the map is
 * in the middle of the screen. Pure, so its limits can be tested.
 *
 * Positions are the map's unscaled isometric pixels (world.toIso); `s` is
 * screen pixels per isometric pixel. The map never slides off the screen:
 * when it is smaller than the screen it sits in the middle, and when it is
 * larger it can be panned only as far as its edges (plus `PAD`, so the
 * buildings at the rim can be brought out from under the buttons).
 */

/** The map's isometric extent, with room above for roofs and signs. */
export const ISO_MIN_X = -ROWS * (TILE_W / 2);
export const ISO_MAX_X = COLS * (TILE_W / 2);
export const ISO_MIN_Y = -130;
export const ISO_MAX_Y = (COLS + ROWS) * (TILE_H / 2) + 50;

/** Screen pixels the edge of the map may be pulled in from the edge of the screen. */
export const PAD = 56;
/** As close as the camera goes: a doll's face fills a thumb. */
export const MAX_SCALE = 2.4;
/** Never further out than the whole map, nor smaller than this. */
export const MIN_SCALE = 0.3;

export interface Cam {
  /** Screen pixels per isometric pixel. */
  s: number;
  /** The isometric point in the middle of the screen. */
  cx: number;
  cy: number;
}

/** The scale at which the whole map fits the screen. */
export function fitScale(cw: number, ch: number): number {
  return Math.min(cw / (ISO_MAX_X - ISO_MIN_X), ch / (ISO_MAX_Y - ISO_MIN_Y));
}

/** The furthest out the camera may go: the whole map, or MIN_SCALE on a tiny screen. */
export function minScale(cw: number, ch: number): number {
  return Math.max(MIN_SCALE, Math.min(fitScale(cw, ch), 1));
}

/**
 * Where the camera starts: the whole map on a wide screen; closer on a phone
 * or any upright screen (a tablet held tall), where the whole map would be a
 * small diamond between empty bands.
 */
export function startScale(cw: number, ch: number): number {
  const fit = fitScale(cw, ch);
  return cw < 640 || ch > cw * 1.15 ? Math.min(MAX_SCALE, Math.max(0.85, fit)) : Math.max(0.62, fit);
}

export const clampScale = (s: number, cw: number, ch: number) => Math.min(MAX_SCALE, Math.max(minScale(cw, ch), s));

/** Keep the map on the screen (see the note at the top). */
export function clampCam(cam: Cam, cw: number, ch: number): Cam {
  const axis = (c: number, lo: number, hi: number, size: number) => {
    const span = (hi - lo) * cam.s;
    if (span + 2 * PAD <= size) return (lo + hi) / 2;
    const half = (size / 2 - PAD) / cam.s;
    return Math.min(hi - half, Math.max(lo + half, c));
  };
  return { s: cam.s, cx: axis(cam.cx, ISO_MIN_X, ISO_MAX_X, cw), cy: axis(cam.cy, ISO_MIN_Y, ISO_MAX_Y, ch) };
}

/** Zoom to `s` keeping the isometric point under the screen point (px, py) where it is. */
export function zoomAt(cam: Cam, s: number, px: number, py: number, cw: number, ch: number): Cam {
  const ns = clampScale(s, cw, ch);
  const ix = cam.cx + (px - cw / 2) / cam.s, iy = cam.cy + (py - ch / 2) / cam.s;
  return clampCam({ s: ns, cx: ix - (px - cw / 2) / ns, cy: iy - (py - ch / 2) / ns }, cw, ch);
}

/** Isometric pixels to the screen. */
export function toScreen(cam: Cam, iso: Vec, cw: number, ch: number): Vec {
  return { x: cw / 2 + (iso.x - cam.cx) * cam.s, y: ch / 2 + (iso.y - cam.cy) * cam.s };
}

/** The screen back to isometric pixels. */
export function toIsoPoint(cam: Cam, px: number, py: number, cw: number, ch: number): Vec {
  return { x: cam.cx + (px - cw / 2) / cam.s, y: cam.cy + (py - ch / 2) / cam.s };
}
