import { COLS, FARM, ROWS, TILE_H, TILE_W, type Place, type Vec } from "./world";

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

/** A map's isometric extent: the camera stays inside the one it is looking at. */
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }
/** The town's, and the farm's (a map of its own, far to the east in the same tile space), with the same room above and below. */
export const BOUNDS: Record<Place, Bounds> = {
  town: { minX: ISO_MIN_X, maxX: ISO_MAX_X, minY: ISO_MIN_Y, maxY: ISO_MAX_Y },
  farm: {
    minX: (FARM.x - FARM.y - FARM.h) * (TILE_W / 2), maxX: (FARM.x + FARM.w - FARM.y) * (TILE_W / 2),
    minY: (FARM.x + FARM.y) * (TILE_H / 2) - 130, maxY: (FARM.x + FARM.w + FARM.y + FARM.h) * (TILE_H / 2) + 50,
  },
};

/** Screen pixels the edge of the map may be pulled in from the edge of the screen. */
export const PAD = 56;
/** As close as the camera goes: a doll's face fills a thumb. */
export const MAX_SCALE = 2.4;
/**
 * As far out as the camera goes (the owner's call, 2026-10-02: "ไม่สามารถ zoom
 * out ได้มากเกินไป"): about the starter town's width across the screen, and
 * never so small that a doll is a speck (a phone stops at MIN_SCALE).
 */
export const MOST_TILES_ACROSS = 26;
export const MIN_SCALE = 0.55;

export interface Cam {
  /** Screen pixels per isometric pixel. */
  s: number;
  /** The isometric point in the middle of the screen. */
  cx: number;
  cy: number;
}

/** The scale at which the whole map fits the screen. */
export function fitScale(cw: number, ch: number, b: Bounds = BOUNDS.town): number {
  return Math.min(cw / (b.maxX - b.minX), ch / (b.maxY - b.minY));
}

/** The furthest out the camera may go: MOST_TILES_ACROSS tiles across, and never below MIN_SCALE. */
export function minScale(cw: number, ch: number, b: Bounds = BOUNDS.town): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, cw / (MOST_TILES_ACROSS * TILE_W), fitScale(cw, ch, b)));
}

/**
 * Where the camera starts: close, so the dolls' faces and hair read (the
 * owner's call, 2026-10-02, with the bigger map: "default zoom ใกล้กว่านี้").
 * The camera follows you, so the rest of the town is a walk or a drag away.
 */
export const START_DESK = 1.6;
export const START_PHONE = 1.3;
export function startScale(cw: number, ch: number): number {
  const fit = fitScale(cw, ch);
  return Math.min(MAX_SCALE, Math.max(fit, cw < 640 || ch > cw * 1.15 ? START_PHONE : START_DESK));
}

export const clampScale = (s: number, cw: number, ch: number, b: Bounds = BOUNDS.town) => Math.min(MAX_SCALE, Math.max(minScale(cw, ch, b), s));

/** Keep the map on the screen (see the note at the top): the town, or whichever map's bounds are given. */
export function clampCam(cam: Cam, cw: number, ch: number, b: Bounds = BOUNDS.town): Cam {
  const axis = (c: number, lo: number, hi: number, size: number) => {
    const span = (hi - lo) * cam.s;
    if (span + 2 * PAD <= size) return (lo + hi) / 2;
    const half = (size / 2 - PAD) / cam.s;
    return Math.min(hi - half, Math.max(lo + half, c));
  };
  return { s: cam.s, cx: axis(cam.cx, b.minX, b.maxX, cw), cy: axis(cam.cy, b.minY, b.maxY, ch) };
}

/** Zoom to `s` keeping the isometric point under the screen point (px, py) where it is. */
export function zoomAt(cam: Cam, s: number, px: number, py: number, cw: number, ch: number, b: Bounds = BOUNDS.town): Cam {
  const ns = clampScale(s, cw, ch, b);
  const ix = cam.cx + (px - cw / 2) / cam.s, iy = cam.cy + (py - ch / 2) / cam.s;
  return clampCam({ s: ns, cx: ix - (px - cw / 2) / ns, cy: iy - (py - ch / 2) / ns }, cw, ch, b);
}

/** Isometric pixels to the screen. */
export function toScreen(cam: Cam, iso: Vec, cw: number, ch: number): Vec {
  return { x: cw / 2 + (iso.x - cam.cx) * cam.s, y: ch / 2 + (iso.y - cam.cy) * cam.s };
}

/** The screen back to isometric pixels. */
export function toIsoPoint(cam: Cam, px: number, py: number, cw: number, ch: number): Vec {
  return { x: cam.cx + (px - cw / 2) / cam.s, y: cam.cy + (py - ch / 2) / cam.s };
}
