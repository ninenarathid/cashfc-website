import { ISO_MAX_X, ISO_MAX_Y, ISO_MIN_X, ISO_MIN_Y } from "./camera";

/**
 * Clouds over Cash Town, seen as their shadows drifting across the ground by day (the owner, 2026-10-03: "เงาเมฆ
 * เคลื่อนตัว ตอนเช้า"). They cross the map from left to right, the way the wind blows the leaves, each at its own
 * height on the map and a little faster or slower than the next, and come round again once past the far edge.
 * How many there are follows the sky (lib/town/weather's `clouds`): a few on a clear day, most of them under cloud.
 *
 * Pure: where each shadow lies is a matter of how far the clouds have drifted, which the map counts up as the
 * wind blows (components/town/Town), so it can be tested without a browser.
 */

export interface CloudShadow {
  /** Its middle, in the map's unscaled isometric pixels (world.toIso). */
  x: number;
  y: number;
  /** How wide and how tall it lies on the ground: about half as tall as wide, the ground being seen at a slant. */
  w: number;
  h: number;
  /** Which of the SHAPES it is. */
  shape: number;
  /** How much of it is there, 0 to 1: a cloud comes and goes gently as the sky fills and clears. */
  k: number;
}

/** Clouds in all, under a sky full of them. */
export const CLOUDS = 12;
/** Different outlines a cloud may have. */
export const SHAPES = 4;

/** Room beyond the map's edges: more than half the widest shadow, so one is wholly off the map when it comes round. */
export const MARGIN = 620;
const X0 = ISO_MIN_X - MARGIN;
export const FIELD = ISO_MAX_X - ISO_MIN_X + 2 * MARGIN;
const Y0 = ISO_MIN_Y - 60, TALL = ISO_MAX_Y - ISO_MIN_Y + 120;

/** A number from 0 to 1 that is always the same for the same cloud and purpose. */
function chance(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * The shadows on the map when the clouds have drifted `drift` isometric pixels, under a sky with `cover` (0 to 1)
 * of cloud. Each cloud keeps its own lane down the map; they take their turns as the sky fills, in an order that
 * spreads the first few over the whole town.
 */
export function cloudsAt(drift: number, cover: number): CloudShadow[] {
  const out: CloudShadow[] = [];
  const sky = Math.min(1, Math.max(0, cover)) * CLOUDS;
  for (let i = 0; i < CLOUDS; i++) {
    const turn = (i * 5) % CLOUDS;
    const k = Math.min(1, Math.max(0, sky - turn));
    if (k <= 0.01) continue;
    const w = 520 + chance(i, 1) * 480;
    const speed = 0.85 + chance(i, 3) * 0.3;
    const along = chance(i, 4) * FIELD + drift * speed;
    out.push({
      x: X0 + (((along % FIELD) + FIELD) % FIELD),
      y: Y0 + ((i + 0.2 + 0.6 * chance(i, 5)) / CLOUDS) * TALL,
      w,
      h: w * (0.42 + chance(i, 2) * 0.12),
      shape: i % SHAPES,
      k,
    });
  }
  return out;
}

/**
 * A cloud's outline: soft round blobs clustered about its middle, each [x, y, radius] in a box one wide and one
 * tall (the map stretches it to the shadow's size). Always the same for the same shape.
 */
export function cloudBlobs(shape: number): Array<[number, number, number]> {
  const blobs: Array<[number, number, number]> = [];
  const n = 6 + (shape % 3);
  for (let b = 0; b < n; b++) {
    const a = (b / n) * Math.PI * 2 + chance(shape * 17 + b, 7) * 0.9;
    // (never so far out, or so big, that a blob leaves the box: its soft edge would be cut straight)
    const far = 0.06 + chance(shape * 17 + b, 8) * 0.12;
    const r = 0.17 + chance(shape * 17 + b, 9) * 0.1;
    blobs.push([0.5 + Math.cos(a) * far * 1.25, 0.5 + Math.sin(a) * far, r]);
  }
  // one in the middle, so no cloud has a hole in it
  blobs.push([0.5, 0.5, 0.26]);
  return blobs;
}
