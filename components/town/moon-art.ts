/**
 * What is seen at the farm's well when a moon flask is poured into it (lib/town/well-gifts; the well's sixth rank),
 * drawn in the town's own square pixels: a column of the water's light going up out of the well, a ring going out
 * over the ground, and motes rising fast. On the pourer's own page, for a few seconds; what everybody sees of it is
 * the well's own look while its water has a nature (components/town/TownFarm). With the town kept still it is one
 * picture that does not move.
 */

/** How long the light lasts, in milliseconds. */
export const FLASK_LIGHT_MS = 2800;

/** A number in [0, 1) from two counts: the same every frame, so a mote keeps its own way. */
function rnd(i: number, k: number): number {
  let h = (Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The light, `t` of the way through its time (0 to 1), its foot at `at` on the screen (the well's middle); `s` is the map's scale, `n` how many bucketfuls were poured (one to three: more is taller and wider). */
export function drawFlaskLight(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, s: number, t: number, colour: string, n: number, still: boolean) {
  const u = still ? 0.35 : Math.max(0, Math.min(1, t)), px = Math.max(2, Math.round(2 * s));
  const rise = Math.min(1, u / 0.22), fade = u < 0.55 ? 1 : Math.max(0, (1 - u) / 0.45), big = 0.8 + 0.2 * Math.max(1, Math.min(3, n));
  ctx.save();
  ctx.fillStyle = colour;
  // the column: bands of light one over the other, narrower and fainter the higher they are
  const tall = 130 * s * big * (1 - (1 - rise) * (1 - rise)), bands = 22;
  for (let i = 0; i < bands; i++) {
    const k = i / bands, w = Math.round((16 - 9 * k) * s * big);
    ctx.globalAlpha = fade * (0.5 - 0.38 * k);
    ctx.fillRect(Math.round(at.x - w / 2), Math.round(at.y - 18 * s - k * tall - tall / bands), w, Math.ceil(tall / bands) + 1);
  }
  // the ring: a round of points going out over the ground
  const r = (12 + 46 * u) * s * big;
  ctx.globalAlpha = fade * 0.85;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    ctx.fillRect(Math.round(at.x + Math.cos(a) * r), Math.round(at.y - 6 * s + Math.sin(a) * r * 0.5), px, px);
  }
  // the motes: each a small cross, rising fast and spreading as it goes
  for (let i = 0; i < 16; i++) {
    const own = still ? (i + 0.5) / 16 : (u * 1.6 + rnd(i, 0)) % 1, x = at.x + (rnd(i, 1) - 0.5) * (14 + 30 * own) * s * big, y = at.y - (20 + own * 120 * big) * s;
    ctx.globalAlpha = fade * Math.sin(own * Math.PI);
    ctx.fillRect(Math.round(x), Math.round(y), px, px);
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(Math.round(x - px), Math.round(y), px * 3, px);
    ctx.fillRect(Math.round(x), Math.round(y - px), px, px * 3);
  }
  ctx.restore();
}
