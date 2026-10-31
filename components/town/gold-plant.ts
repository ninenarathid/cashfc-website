/*
 * A plant turned gold (the owner, 2026-10-31: "กลายพันธุ์ กลายเป็นสีทองคำ", then "ให้ดู ทองคำ ระยิบระยับ มากกว่านี้ ทำอนิเมชั่น vfx เพิ่ม"):
 * the drawn picture itself, each pixel moved to a metal of its own lightness, so its outline, leaves and shading stay as
 * drawn; the soil of its mound stays soil. The light is the game's, never drawn into the picture: a band of shine that
 * sweeps across it, stars that twinkle on its brightest pixels and one that flashes as the shine passes, motes of gold
 * rising from it, and a warm breath of light on the ground under it.
 */
/** Metal, not yellow: deep bronze shadows, a rich gold middle, a pale highlight with a darker edge beyond it. */
const RAMP: ReadonlyArray<[number, [number, number, number]]> = [
  [0, [36, 16, 2]], [0.18, [104, 54, 6]], [0.36, [178, 104, 10]], [0.52, [232, 160, 18]], [0.66, [255, 205, 44]], [0.78, [255, 236, 120]], [0.86, [255, 250, 205]], [0.93, [255, 222, 90]], [1, [255, 255, 235]],
];
function goldAt(l: number): [number, number, number] {
  for (let i = 1; i < RAMP.length; i++) if (l <= RAMP[i][0]) {
    const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i], t = (l - a) / (b - a);
    return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
  }
  return RAMP[RAMP.length - 1][1];
}

export interface GoldLook {
  /** The picture in gold. */
  base: HTMLCanvasElement;
  /** Its gold pixels alone, without the soil: what the shine falls on. */
  metal: HTMLCanvasElement;
  /** Bright pixels of it, scattered: where stars come out, the brightest first. */
  spots: Array<[number, number]>;
  shine: HTMLCanvasElement;
  light: HTMLCanvasElement;
}
const looks = new Map<string, GoldLook>();
const canvasOf = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** A gold copy of a piece of a picture, the same size, made once. */
export function goldLook(key: string, img: CanvasImageSource, x: number, y: number, w: number, h: number, hasSoil = true): GoldLook {
  const had = looks.get(key);
  if (had) return had;
  const base = canvasOf(w, h), metal = canvasOf(w, h), g = base.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, x, y, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data, m = new ImageData(w, h);
  // (the mound's soil: dull browns joined to the picture's lowest rows; a fruit's shade is as dark but burning, and outlines part it from the soil)
  const earthy = (i: number) => { const r = p[i], gr = p[i + 1], b = p[i + 2]; if (!p[i + 3] || !(r > gr && gr >= b)) return false; const hi = r / 255, lo = b / 255, l = (hi + lo) / 2, s2 = hi === lo ? 0 : (hi - lo) / (1 - Math.abs(2 * l - 1)); return l < 0.42 && s2 < 0.78 && l > 0.04; };
  const soil = new Uint8Array(w * h), stack: number[] = [];
  for (let yy = Math.floor(h * 0.45); yy < h; yy++) for (let xx = 0; xx < w; xx++) { const n = yy * w + xx; if (hasSoil && earthy(n * 4) && !soil[n] && (yy > h * 0.8 || xx < w * 0.12 || xx > w * 0.88)) { soil[n] = 1; stack.push(n); } }
  while (stack.length) { const n = stack.pop()!, xx = n % w; for (const q of [xx > 0 ? n - 1 : -1, xx < w - 1 ? n + 1 : -1, n - w, n + w]) if (q >= 0 && q < w * h && !soil[q] && earthy(q * 4)) { soil[q] = 1; stack.push(q); } }
  // (every picture measured by its own light, so that a white fleece, a brown hen and a black-and-white cow all come to the same
  // rich gold: a colour's place on the ramp is how much of the picture is darker than it; a broad flat colour starts its band there)
  const bright: Array<[number, number, number]> = [], counts = new Uint32Array(256);
  let leaves = 0, all = 0;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] && !soil[i / 4]) { counts[Math.round(0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2])]++; all++; if (p[i + 1] >= p[i]) leaves++; }
  const darker = new Float32Array(256);
  for (let i = 1, sum = 0; i < 256; i++) { sum += counts[i - 1]; darker[i] = sum / Math.max(1, all); }
  const leafy = leaves < all * 0.5;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3] || soil[i / 4]) continue;
    const l = Math.round(0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]), leaf = p[i + 1] >= p[i];
    // (a leaf a little deeper than the fruit, so that the two still read apart)
    const t = Math.min(1, (0.2 + 0.72 * darker[l]) * (leaf && leafy ? 0.92 : 1));
    [p[i], p[i + 1], p[i + 2]] = goldAt(t);
    m.data.set([p[i], p[i + 1], p[i + 2], 255], i);
    if (t > 0.5) bright.push([(i / 4) % w, Math.floor(i / 4 / w), t]);
  }
  g.putImageData(d, 0, 0);
  metal.getContext("2d")!.putImageData(m, 0, 0);
  // (scattered by a fixed walk, so that the stars do not bunch; the brightest of them first, for the flash)
  bright.sort((a, b) => b[2] - a[2]);
  const spots: Array<[number, number]> = [];
  for (let i = 0, at = 0; i < 128 && bright.length; i++) { at = (at * 31 + 2654435761 + i * 977) % bright.length; const s = bright[i === 0 ? 0 : Math.floor(at)]; spots.push([s[0], s[1]]); }
  const look = { base, metal, spots, shine: canvasOf(w, h), light: canvasOf(w, h) };
  looks.set(key, look);
  return look;
}

const SWEEP = 3600, SWEEPS = 0.42;
/** The picture as it is now, with the band of shine across it; the picture alone between sweeps and for whoever wants nothing moving. */
export function goldNow(look: GoldLook, now: number, still = false): HTMLCanvasElement {
  const phase = (now % SWEEP) / SWEEP;
  if (still || phase >= SWEEPS) return look.base;
  const w = look.base.width, h = look.base.height, u = phase / SWEEPS, x = -0.3 * w + u * 1.75 * w, l = look.light.getContext("2d")!, c = look.shine.getContext("2d")!;
  l.globalCompositeOperation = "source-over";
  l.clearRect(0, 0, w, h);
  l.drawImage(look.metal, 0, 0);
  l.globalCompositeOperation = "source-atop";
  // (it bends round the fruit as light does on a ball, row by row, in whole pixels)
  const band = (off: number, wide: number, colour: string) => { l.fillStyle = colour; for (let yy = 0; yy < h; yy += 2) { const v = yy / h - 0.55; l.fillRect(Math.round(x + off - h * 0.2 * v - v * v * w * 0.42), yy, Math.max(1, Math.round(wide * (1 - v * v * 1.6))), 2); } };
  band(0, w * 0.05, "rgba(255,253,226,0.62)");
  band(-w * 0.024, w * 0.012, "rgba(255,244,180,0.36)");
  band(w * 0.066, w * 0.01, "rgba(255,244,180,0.3)");
  c.clearRect(0, 0, w, h);
  c.drawImage(look.base, 0, 0);
  c.drawImage(look.light, 0, 0);
  return look.shine;
}

const roll = (seed: number, i: number, a: number) => { const v = Math.sin(seed * 12.9898 + i * 78.233 + a * 37.719) * 43758.5453; return v - Math.floor(v); };
function star(ctx: CanvasRenderingContext2D, x: number, y: number, arm: number, px: number) {
  ctx.fillStyle = "#fff9d6";
  ctx.fillRect(x - px, y - px, px * 3, px * 3);
  for (let k = 2; k <= arm + 1; k++) {
    ctx.fillStyle = k > arm ? "#ffc93f" : k > arm - 1 ? "#ffe98a" : "#fffbe6";
    ctx.fillRect(x, y - k * px, px, px); ctx.fillRect(x, y + k * px, px, px); ctx.fillRect(x - k * px, y, px, px); ctx.fillRect(x + k * px, y, px, px);
  }
}
/**
 * The light over a gold plant standing in a box: stars on its bright pixels (each comes, peaks and goes), one great flash as
 * the shine passes, and motes of gold rising. `n`: its square's side, which says how much of it there is. Whole pixels.
 */
export function goldFx(ctx: CanvasRenderingContext2D, look: GoldLook, seed: number, x: number, y: number, w: number, h: number, n: number, now: number, s: number, still = false, quiet = false) {
  const px = Math.max(1, Math.round(1.15 * s)), k = w / look.base.width, snap = (v: number) => Math.round(v / px) * px, big = n >= 5 ? 2 : n >= 3 ? 1 : 0, spots = look.spots.length;
  if (!spots) return;
  ctx.save();
  const stars = quiet ? 2 : 3 + n * 4;
  for (let i = 0; i < stars; i++) {
    const period = 1100 + roll(seed, i, 1) * 1500, clock = now + roll(seed, i, 2) * period, t = still ? roll(seed, i, 2) : (clock % period) / period;
    const wave = t < 0.5 ? Math.sin((t / 0.5) * Math.PI) : 0;
    if (wave < 0.15) continue;
    // (each comes out somewhere new each time)
    const [sx, sy] = look.spots[Math.floor(roll(seed + (still ? 0 : Math.floor(clock / period)), i, 3) * spots)];
    star(ctx, snap(x + sx * k), snap(y + sy * k), Math.max(1, Math.round(wave * (2 + big))), px);
  }
  // the great flash, as the shine crosses its brightest pixel
  const phase = (now % SWEEP) / SWEEP;
  if (!still && !quiet && phase > SWEEPS * 0.45 && phase < SWEEPS * 0.95) {
    const u = (phase - SWEEPS * 0.45) / (SWEEPS * 0.5), wave = Math.sin(u * Math.PI), fx = snap(x + look.spots[0][0] * k), fy = snap(y + look.spots[0][1] * k), reach = Math.max(2, Math.round(wave * (3 + n)));
    star(ctx, fx, fy, reach, px);
    ctx.fillStyle = "#fff4b8";
    for (let j = 2; j <= Math.ceil(reach / 2.4) + 1; j++) { ctx.fillRect(fx + j * px, fy + j * px, px, px); ctx.fillRect(fx - j * px, fy + j * px, px, px); ctx.fillRect(fx + j * px, fy - j * px, px, px); ctx.fillRect(fx - j * px, fy - j * px, px, px); }
  }
  // motes rising from it
  if (!still && !quiet) {
    const motes = 4 + n * 3, tones = ["#ffe98a", "#fff6c9", "#f4b93a"];
    for (let i = 0; i < motes; i++) {
      const period = 2400 + roll(seed, i, 4) * 1900, u = ((now + roll(seed, i, 5) * period) % period) / period;
      const mx = x + w * (0.08 + roll(seed, i, 6) * 0.84) + Math.sin(u * 6.28 + i) * 5 * s, my = y + h * (0.86 - roll(seed, i, 7) * 0.3) - u * h * 0.62;
      ctx.globalAlpha = u < 0.15 ? u / 0.15 : u > 0.72 ? (1 - u) / 0.28 : 1;
      ctx.fillStyle = tones[i % tones.length];
      const size = u < 0.7 && i % 3 === 0 ? px * 2 : px;
      ctx.fillRect(snap(mx), snap(my), size, size);
    }
  }
  ctx.restore();
}
/** A ring of light turning on the ground about something great. */
export function goldRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, now: number, s: number, still = false) {
  ctx.save();
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.setLineDash([7 * s, 6 * s]);
  ctx.lineDashOffset = still ? 0 : -now / 55;
  ctx.strokeStyle = "rgba(255,226,120,0.85)";
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([3 * s, 9 * s]);
  ctx.lineDashOffset = still ? 0 : now / 80;
  ctx.strokeStyle = "rgba(255,246,190,0.75)";
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.16, ry * 1.16, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
/** Gold dust left behind something walking: `dir` the way it goes, 1 or -1; points of it fall behind and go out. */
export function goldTrail(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, length: number, now: number, s: number) {
  const px = Math.max(1, Math.round(1.2 * s));
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const u = ((now / 1500 + i / 12) % 1), bx = x - dir * (length * 0.3 + u * length * 1.1), by = y + (roll(3, i, 1) - 0.5) * length * 0.24 - Math.sin(u * 3.14) * 5 * s;
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = i % 3 ? "#ffe07a" : "#fff8d0";
    const size = u < 0.4 ? px * 2 : px;
    ctx.fillRect(Math.round(bx / px) * px, Math.round(by / px) * px, size, size);
  }
  ctx.restore();
}
/** The warm light it throws on the ground under it, breathing slowly. */
export function goldGround(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, now: number, power = 1) {
  const breath = 0.72 + 0.28 * Math.sin(now / 900);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.35, 0, 0, rx);
  g.addColorStop(0, `rgba(255,196,70,${0.42 * breath * power})`);
  g.addColorStop(0.72, `rgba(255,176,50,${0.2 * breath * power})`);
  g.addColorStop(1, "rgba(255,170,40,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
