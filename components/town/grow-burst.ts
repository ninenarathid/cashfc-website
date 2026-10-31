/**
 * **A plant bursting out of its ground**, as the giant seeds grow it at once (the owner, 2026-11-01: rank 7 to be "ของที่ดีมากๆ";
 * and his standing rule that an effect is energy and material coming out of an action, never a picture faded in). The ground
 * gives first; then the plant comes up from its own foot past its size and settles, throwing the earth of its square out to
 * the rim and leaving the seeds' gold rising. All in whole pixels of the map's scale, played once on each page that sees it.
 */
export const BURST_MS = 1500;
/** When it starts to rise: until then only the ground moves. */
const HELD = 130;
const RISE = 520;
const EARTH = ["#3d2612", "#5a3a1c", "#7a5229", "#96703d"], GOLD = ["#fff4c4", "#ffe08a", "#ffc94d"];

/** How large it is drawn by its foot: small, past itself, back; exactly 1 from the moment it has settled. */
export function burstScale(since: number): number {
  if (since >= HELD + RISE) return 1;
  if (since <= HELD) return 0.2;
  const t = (since - HELD) / RISE, back = 1.9, up = 1 + (back + 1) * (t - 1) ** 3 + back * (t - 1) ** 2;
  return 0.2 + 0.8 * up;
}

/** A little hash: where each clod goes is the same on every frame, and on every page. */
const mix = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

/** On the ground, under the plant: the square heaving and the ring of its breaking running out across the soil. */
export function burstGround(ctx: CanvasRenderingContext2D, x: number, y: number, wide: number, high: number, since: number): void {
  const t = since / BURST_MS, heave = Math.max(0, 1 - since / 420), ring = Math.min(1, since / 620);
  ctx.save();
  if (heave > 0) { ctx.fillStyle = `rgba(28,16,6,${0.5 * heave})`; ctx.beginPath(); ctx.ellipse(x, y, wide * 0.4, high * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
  if (t < 0.6) {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,214,120,${0.55 * (1 - ring)})`;
    ctx.lineWidth = Math.max(1, (high / 14) * (1 - ring) + 1);
    ctx.beginPath(); ctx.ellipse(x, y, wide * (0.32 + 0.42 * ring), high * (0.32 + 0.42 * ring), 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Over everything: the clods and the dust of its square thrown out, and the gold going up off it. */
export function burstEarth(ctx: CanvasRenderingContext2D, x: number, y: number, foot: number, wide: number, n: number, since: number, s: number, salt: number): void {
  const unit = Math.max(1, Math.round(2 * s)), high = wide / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // (the earth: thrown from the rim of the square as the plant pushes up, falling back on it)
  const clods = Math.min(44, 10 + n * 5);
  for (let i = 0; i < clods; i++) {
    const a = mix(salt, i) * Math.PI * 2, delay = HELD + mix(i, salt) * 160, time = (since - delay) / 1000;
    const life = 0.55 + mix(salt + 1, i) * 0.35;
    if (time <= 0 || time > life) continue;
    const speed = (40 + mix(salt + 2, i) * 70) * s * (0.8 + n * 0.1), lift = (90 + mix(salt + 3, i) * 90) * s * (0.8 + n * 0.08);
    const px = x + Math.cos(a) * (wide * 0.8 + speed * time), py = y + Math.sin(a) * (high * 0.8 + (speed * time) / 2) - lift * time + 320 * s * time * time;
    const size = unit * (1 + Math.floor(mix(salt + 4, i) * 3));
    ctx.fillStyle = EARTH[Math.floor(mix(salt + 5, i) * EARTH.length)];
    ctx.globalAlpha = Math.min(1, (life - time) / 0.12);
    ctx.fillRect(Math.round(px), Math.round(py), size, size);
  }
  // (the dust: pale blocks spreading low along the rim, thinning)
  const puffs = Math.min(18, 6 + n * 2), dustEnd = 1000;
  if (since < dustEnd) for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2 + mix(salt + 6, i), t = Math.max(0, since - 90) / (dustEnd - 90), r = 0.86 + 0.36 * t;
    const px = x + Math.cos(a) * wide * r, py = y + Math.sin(a) * high * r - 6 * s * t, size = Math.round(unit * (3 + 3 * t));
    ctx.fillStyle = "#cdb48c"; ctx.globalAlpha = 0.5 * (1 - t);
    ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
  }
  // (the seeds' gold: motes going up off the plant, late, twinkling out)
  ctx.globalCompositeOperation = "lighter";
  const motes = Math.min(30, 8 + n * 3), tall = foot - y + n * 26 * s;
  for (let i = 0; i < motes; i++) {
    const delay = 240 + mix(salt + 7, i) * 500, t = (since - delay) / 760;
    if (t <= 0 || t >= 1) continue;
    const px = x + (mix(salt + 8, i) - 0.5) * wide * 1.7, py = foot - mix(salt + 9, i) * tall * 0.7 - t * 46 * s;
    if (Math.floor((since + i * 37) / 90) % 3 === 0) continue;
    ctx.fillStyle = GOLD[i % GOLD.length]; ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    ctx.fillRect(Math.round(px), Math.round(py), unit, unit);
  }
  ctx.restore();
}
