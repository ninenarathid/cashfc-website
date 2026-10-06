/**
 * What a rain frog shows beyond its picture (lib/town/well-gifts; the well's fifth rank), drawn on the map in the
 * town's own square pixels: its hop, its croak before rain, and the rain gathering into its member's empty bucket.
 * Every page draws these for every frog it sees, from its own sky (lib/town/skies): nothing is told through the
 * room but that the frog follows somebody. With the town kept still each is one picture that does not move.
 */

/** How high a frog is off the ground at a moment, in the map's own pixels: long hops as it follows, and a small glad one now and then while it stands in the rain. */
export function frogHop(now: number, moving: boolean, raining: boolean): number {
  if (moving) return Math.abs(Math.sin(now / 150)) * 8;
  if (!raining) return 0;
  const t = (now % 2400) / 2400;
  return t < 0.16 ? Math.sin((t / 0.16) * Math.PI) * 5 : 0;
}

/** How far through a croak a frog is at a moment (0 to 1), or null between two: one every three seconds and a little. */
const CROAK_EVERY = 3200, CROAK_MS = 1100;
export const croakPhase = (now: number, seed = 0): number | null => {
  const t = (((now + seed * 517) % CROAK_EVERY) + CROAK_EVERY) % CROAK_EVERY;
  return t < CROAK_MS ? t / CROAK_MS : null;
};

/**
 * A croak: the throat swells pale under the chin, and rings of sound go out the way the frog looks. `at` is where
 * the frog's feet are on the screen, `tall` how tall its picture is drawn, `s` the map's scale.
 */
export function drawCroak(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, s: number, now: number, still: boolean, right: boolean, tall: number, seed = 0) {
  const t = still ? 0.45 : croakPhase(now, seed);
  if (t === null) return;
  const px = Math.max(2, Math.round(1.7 * s)), way = right ? 1 : -1, swell = Math.sin(Math.min(1, t * 1.6) * Math.PI);
  const cx = at.x + way * 5 * s, cy = at.y - tall * 0.3;
  ctx.save();
  // the throat: a round of pale pixels, bigger as it fills
  const r = Math.round((1.5 + 2.5 * swell) * px * 0.5);
  ctx.globalAlpha = 0.92;
  for (let dy = -r; dy <= r; dy += px) for (let dx = -r; dx <= r; dx += px) {
    if (dx * dx + dy * dy > r * r + px) continue;
    ctx.fillStyle = dx + dy < 0 ? "#f6f3c9" : "#d9d59a";
    ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), px, px);
  }
  // the sound: three short arcs going out, each fainter than the last
  for (let i = 0; i < 3; i++) {
    const out = still ? i / 3 + 0.2 : t * 1.25 - i * 0.2;
    if (out <= 0 || out >= 1) continue;
    const radius = (9 + out * 16) * s;
    ctx.globalAlpha = (1 - out) * 0.9;
    ctx.fillStyle = "#eaf7d0";
    for (let k = -2; k <= 2; k++) {
      const a = k * 0.26;
      ctx.fillRect(Math.round(cx + way * Math.cos(a) * radius), Math.round(cy - 3 * s + Math.sin(a) * radius), px, px);
    }
  }
  ctx.restore();
}

/** A number in [0, 1) from two counts: the same every frame, so a drop keeps its own way. */
function rnd(i: number, k: number): number {
  let h = (Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Rain gathering into a bucket: drops drawn in from all about, falling onto one point, and a ring where they land.
 * `at` is that point on the screen. `full` (0 to 1): how far along the filling is, when the page knows (its own
 * bucket): a small gauge beside it; left out for somebody else's.
 */
export function drawRainGather(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, s: number, now: number, still: boolean, full?: number, side: 1 | -1 = 1) {
  const px = Math.max(2, Math.round(1.6 * s));
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const t = still ? (i + 0.5) / 8 : (now / (480 + rnd(i, 0) * 240) + rnd(i, 1)) % 1;
    // (drawn in from the side its holder is not on, so that they fall beside the body and not over the face)
    const from = side * (2 + rnd(i, 2) * 20) * s, x = at.x + from * (1 - t) * (1 - t), y = at.y - (1 - t) * (26 + rnd(i, 3) * 12) * s;
    ctx.globalAlpha = 0.35 + 0.6 * t;
    ctx.fillStyle = i % 3 ? "#bfe6ff" : "#7fc7f0";
    ctx.fillRect(Math.round(x), Math.round(y), px, px * 2);
  }
  // where they land: a ring of the water's light, coming and going
  const ring = still ? 0.5 : (now / 700) % 1;
  ctx.globalAlpha = (1 - ring) * 0.8;
  ctx.fillStyle = "#dff3ff";
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, r = (3 + ring * 7) * s;
    ctx.fillRect(Math.round(at.x + Math.cos(a) * r), Math.round(at.y + Math.sin(a) * r * 0.5), px, px);
  }
  if (full !== undefined) {
    // how full: a little glass beside the bucket, rising
    const w = 3 * px, h = 9 * px, gx = Math.round(at.x + side * 13 * s - (side < 0 ? w : 0)), gy = Math.round(at.y - h + 4 * px), lvl = Math.round(Math.max(0, Math.min(1, full)) * h);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#1c2f3d";
    ctx.fillRect(gx - px, gy - px, w + 2 * px, h + 2 * px);
    ctx.fillStyle = "#3a586c";
    ctx.fillRect(gx, gy, w, h);
    ctx.fillStyle = "#7fc7f0";
    ctx.fillRect(gx, gy + h - lvl, w, lvl);
    ctx.fillStyle = "#dff3ff";
    if (lvl > 0) ctx.fillRect(gx, gy + h - lvl, w, px);
  }
  ctx.restore();
}
