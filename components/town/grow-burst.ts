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

/** On the ground, under the plant: the square heaving, and the soil breaking in a broken ring of whole pixels that runs out across it. */
export function burstGround(ctx: CanvasRenderingContext2D, x: number, y: number, wide: number, high: number, since: number, s: number, salt: number): void {
  const heave = Math.max(0, 1 - since / 420), ring = Math.min(1, since / 620), unit = Math.max(1, Math.round(2 * s));
  ctx.save();
  if (heave > 0) { ctx.fillStyle = `rgba(28,16,6,${0.5 * heave})`; ctx.beginPath(); ctx.ellipse(x, y, wide * 0.4, high * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
  if (ring < 1) {
    const pieces = Math.round(wide / (unit * 3)), r = 0.34 + 0.4 * ring;
    for (let i = 0; i < pieces; i++) {
      // (broken, not a line: some of it is not there, and each piece has its own place about the ring)
      if (mix(salt + 11, i) < 0.28) continue;
      const a = (i / pieces) * Math.PI * 2, off = 1 + (mix(salt + 12, i) - 0.5) * 0.09, size = unit * (1 + Math.floor(mix(salt + 13, i) * 2));
      const gold = mix(salt + 14, i) < 0.14;
      ctx.fillStyle = gold ? GOLD[i % GOLD.length] : EARTH[Math.floor(mix(salt + 15, i) * EARTH.length)];
      ctx.globalAlpha = (gold ? 0.95 : 0.9) * (1 - ring * ring);
      ctx.fillRect(Math.round(x + Math.cos(a) * wide * r * off), Math.round(y + Math.sin(a) * high * r * off), size, size);
    }
  }
  ctx.restore();
}

/** Over everything: the clods and the dust of its square thrown out where it meets the ground, and the gold going up off it. */
export function burstEarth(ctx: CanvasRenderingContext2D, x: number, y: number, foot: number, wide: number, n: number, since: number, s: number, salt: number): void {
  const unit = Math.max(1, Math.round(2 * s)), high = wide / 2, gy = y + high * 0.56;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // (the earth: thrown as the plant pushes up, most of it toward the eye where its edge meets the ground, falling back on it)
  const clods = Math.min(72, 16 + n * 8);
  for (let i = 0; i < clods; i++) {
    const a = (i % 4 ? mix(salt, i) * Math.PI : mix(salt, i) * Math.PI * 2), delay = HELD + mix(i, salt) * 260, time = (since - delay) / 1000;
    const life = 0.55 + mix(salt + 1, i) * 0.35;
    if (time <= 0 || time > life) continue;
    const speed = (40 + mix(salt + 2, i) * 80) * s * (0.8 + n * 0.1), lift = (90 + mix(salt + 3, i) * 110) * s * (0.8 + n * 0.08);
    // (from where its edge has reached by then)
    const rim = 0.45 + 0.45 * Math.min(1, burstScale(delay));
    const px = x + Math.cos(a) * (wide * rim + speed * time), py = gy + Math.sin(a) * (high * rim + (speed * time) / 2) - lift * time + 320 * s * time * time;
    const size = unit * (1 + Math.floor(mix(salt + 4, i) * 3));
    ctx.fillStyle = EARTH[Math.floor(mix(salt + 5, i) * EARTH.length)];
    ctx.globalAlpha = Math.min(1, (life - time) / 0.12);
    ctx.fillRect(Math.round(px), Math.round(py), size, size);
  }
  // (the dust: pale clumps rolling low off its front edge, thinning)
  const puffs = Math.min(22, 8 + n * 2), dustEnd = 1050;
  if (since > HELD && since < dustEnd) for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 1.25 - Math.PI * 0.125 + mix(salt + 6, i) * 0.3, t = (since - HELD) / (dustEnd - HELD), r = 0.74 + 0.42 * t;
    const px = x + Math.cos(a) * wide * r, py = gy + Math.sin(a) * high * r - 7 * s * t;
    ctx.fillStyle = i % 3 ? "#cdb48c" : "#a98f68"; ctx.globalAlpha = 0.62 * (1 - t) * (1 - t);
    for (let b = 0; b < 4; b++) {
      const size = Math.round(unit * (2 + 2 * t + mix(salt + 16 + b, i) * 2));
      ctx.fillRect(Math.round(px + (mix(salt + 20 + b, i) - 0.5) * unit * 7 - size / 2), Math.round(py + (mix(salt + 24 + b, i) - 0.5) * unit * 4 - size / 2), size, size);
    }
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
