/**
 * The aura of a limited outfit (lib/town/limited), on the wearer's own map (the owner, 2026-10-31: "มีออร่า vfx ตอนยืนเฉยๆ กับ
 * เดิน"): at rest what the outfit is made of moves round them, walking it comes off at each real footfall. All of it is laid
 * in the doll's own pixels. `auraBehind` before the doll, `auraFront` after it, so what circles passes behind and before.
 *
 * Nothing is kept a frame beyond the footfalls: every mote is worked out from the clock, so a wearer costs a few rects
 * and at most four small pictures a frame, and few wear these. The pumpkin's is the largest, on the owner's word that it
 * should beat what its bidders expected ("โดยเฉพาะชุดฟักทองที่คนประมูลกันน้อย ช่วยทำให้เกินความคาดหมายผู้เล่นด้วย").
 */
import AURA_ART from "@/lib/town/limited-aura-art.json";
import { dyedHsl, type AuraRamp, type LimitedDye, type LimitedKind } from "@/lib/town/limited";

type Art = { image: string; icons: Record<string, [number, number, number, number]> };
const ART = AURA_ART as unknown as Art;

type Name = "auraPumpkinA" | "auraPumpkinB" | "auraBatA" | "auraBatB" | "auraLeafA" | "auraLeafB"
  | "auraPetalA" | "auraPetalB" | "auraKrathong" | "auraLantern" | "auraFishA" | "auraFishB";

export type AuraState = {
  /** Where this wearer's feet last came down, on the ground: what is left there stays there as the camera moves. */
  steps: Array<{ gx: number; gy: number; at: number; side: number }>;
  lastStep: number;
};
export type Wearer = {
  id: string;
  kind: LimitedKind;
  dye: LimitedDye;
  x: number;
  y: number;
  /** Map pixels to one of the doll's own. */
  cell: number;
  /** What the aura is laid out and its motes squared in: a little coarser than the doll's own, as the town's ground is. */
  s: number;
  step: number | undefined;
  sat: boolean;
  /** Where the wearer stands on the ground, and where a point of the ground is on the screen. */
  ground: { x: number; y: number };
  screen: (at: { x: number; y: number }) => { x: number; y: number };
  /** The least of it: by the viewer's own switch in the town's settings, or by the wearer's in the wardrobe. */
  minimal: boolean;
  /** How dark the hour is, 0 to 1. */
  night: number;
  now: number;
  state: AuraState;
};

let sheet: HTMLImageElement | null = null;
const tinted = new Map<string, HTMLCanvasElement>();
function picture(name: Name, dye: LimitedDye): HTMLCanvasElement | null {
  sheet ??= Object.assign(new Image(), { src: `/town/limited/${ART.image.split("/").pop()}` });
  if (!sheet.complete || !sheet.naturalWidth) return null;
  const key = `${name}|${dye.en}`;
  const known = tinted.get(key);
  if (known) return known;
  // (a piece the picture does not have yet is left out: a throw here took the wearer's whole doll with it)
  const at = (ART.icons as Partial<Record<Name, number[]>>)[name];
  if (!at) return null;
  const [x, y, w, h] = at;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  if (dye.bands.length) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const [r, g, b] = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (mx === mn) continue;
      const m = mx - mn, sat = l > 0.5 ? m / (2 - mx - mn) : m / (mx + mn);
      const hue = (mx === r ? (g - b) / m + (g < b ? 6 : 0) : mx === g ? (b - r) / m + 2 : (r - g) / m + 4) * 60;
      const to = dyedHsl(hue, sat, l, dye.bands);
      if (!to) continue;
      const cc = (1 - Math.abs(2 * to[2] - 1)) * to[1], hp = to[0] / 60, xx = cc * (1 - Math.abs((hp % 2) - 1)), o = to[2] - cc / 2;
      const [rr, gg, bb] = hp < 1 ? [cc, xx, 0] : hp < 2 ? [xx, cc, 0] : hp < 3 ? [0, cc, xx] : hp < 4 ? [0, xx, cc] : hp < 5 ? [xx, 0, cc] : [cc, 0, xx];
      d[i] = Math.round((rr + o) * 255); d[i + 1] = Math.round((gg + o) * 255); d[i + 2] = Math.round((bb + o) * 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  tinted.set(key, c);
  return c;
}

/** A sprite of the sheet in a dye's colours, at this many map pixels to one of its own; for the title's plate too. */
export function limitedSprite(ctx: CanvasRenderingContext2D, name: Name, dye: LimitedDye, x: number, y: number, scale: number, alpha = 1) {
  sprite(ctx, name, dye, x, y, 1, scale, alpha);
}

/** A soft pool of light, made once a colour: light is the code's, never on a picture. */
const pools = new Map<string, HTMLCanvasElement>();
function pool(hex: string): HTMLCanvasElement {
  const known = pools.get(hex);
  if (known) return known;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!, g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `${hex}cc`); g.addColorStop(0.45, `${hex}55`); g.addColorStop(1, `${hex}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  pools.set(hex, c);
  return c;
}

const hexRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
const seedOf = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (Math.abs(h) % 1000) / 1000; };
const frac = (v: number) => v - Math.floor(v);

/** One square of the doll's pixels, on the screen's whole pixels. */
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, cells: number, s: number) {
  const size = Math.max(1, Math.round(cells * s));
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

function glow(ctx: CanvasRenderingContext2D, hex: string, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.drawImage(pool(hex), x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function sprite(ctx: CanvasRenderingContext2D, name: Name, dye: LimitedDye, x: number, y: number, s: number, scale: number, alpha = 1) {
  const p = picture(name, dye);
  if (!p) return;
  const w = Math.max(1, Math.round(p.width * s * scale)), h = Math.max(1, Math.round(p.height * s * scale));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.drawImage(p, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  ctx.restore();
}

/** A tongue of fire in the doll's pixels: a column of squares narrowing to its tip, each level a step along the ramp. */
function tongue(ctx: CanvasRenderingContext2D, ramp: AuraRamp, x: number, y: number, tall: number, s: number) {
  const n = Math.max(1, Math.round(tall));
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ctx.fillStyle = ramp[Math.min(3, Math.floor(t * 3.2) + (t > 0.8 ? 1 : 0))];
    dot(ctx, x + Math.sin(i * 1.4 + x) * s * 0.4, y - i * s * 1.6, t < 0.4 ? 2 : 1, s);
  }
}

/** The wearer's feet: a footfall is noted each time the walk puts one down (the second and the fourth of its four frames). */
function noteSteps(w: Wearer) {
  const st = w.state;
  if (w.step !== undefined && !w.sat) {
    const n = Math.floor(w.step / 2);
    if (n !== st.lastStep) {
      st.lastStep = n;
      st.steps.push({ gx: w.ground.x, gy: w.ground.y, at: w.now, side: n % 2 ? 1 : -1 });
      if (st.steps.length > 8) st.steps.shift();
    }
  }
  while (st.steps.length && w.now - st.steps[0].at > 1400) st.steps.shift();
}

/** Each footfall left, where it now is on the screen. */
const footfalls = (w: Wearer) => w.state.steps.map((f) => {
  const p = w.screen({ x: f.gx, y: f.gy });
  return { x: p.x + f.side * 3 * w.s, y: p.y, at: f.at, side: f.side };
});

// ── the pumpkin: spirits that circle, ghost fire at the feet, flames left in each footprint ──
const SPIRITS = 3;
function spirit(ctx: CanvasRenderingContext2D, w: Wearer, i: number, front: boolean) {
  const seed = seedOf(w.id), walking = w.step !== undefined;
  const speed = w.sat ? 0.00022 : walking ? 0.00055 : 0.00038;
  const a = (w.now * speed + i / SPIRITS + seed) * Math.PI * 2;
  const near = Math.sin(a) > 0;
  if (near !== front) return;
  // (walking they string out behind the wearer's turning circle, a little wider; sitting they hang close)
  const rx = (w.sat ? 16 : walking ? 24 : 21) * w.s, ry = (w.sat ? 5 : 7) * w.s;
  const lift = (w.sat ? 22 : 34) * w.s + Math.sin(w.now * 0.0021 + i * 2.1) * 3 * w.s;
  const x = w.x + Math.cos(a) * rx, y = w.y - lift + Math.sin(a) * ry;
  const flick = Math.sin(w.now * 0.009 + i * 5) + Math.sin(w.now * 0.023 + i) > 0;
  const size = near ? 1 : 0.75;
  glow(ctx, w.dye.aura[2], x, y, 26 * w.s, 26 * w.s, (near ? 0.5 : 0.32) + w.night * 0.28);
  // (its own little flame, the code's: light is never on the picture)
  const tip = 3 + (flick ? 2 : 0);
  tongue(ctx, w.dye.aura, x + Math.cos(a) * w.s, y - 5 * w.s, tip, w.s * 0.7);
  sprite(ctx, flick ? "auraPumpkinA" : "auraPumpkinB", w.dye, x, y, w.cell, size);
}

function pumpkinBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura, walking = w.step !== undefined, breath = 0.75 + Math.sin(w.now * 0.002) * 0.15;
  glow(ctx, ramp[2], w.x, w.y - 2 * w.s, (w.sat ? 58 : 70) * w.s, 24 * w.s, breath * (0.5 + w.night * 0.45));
  // a ring of ghost fire: the far half of it behind the doll
  const n = walking ? 6 : 8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + Math.PI, x = w.x + Math.cos(a) * 19 * w.s, y = w.y + Math.sin(a) * 6 * w.s;
    const t = 3 + Math.round((Math.sin(w.now * 0.008 + i * 2.6) + 1) * 2.5);
    tongue(ctx, ramp, x, y, w.sat ? t - 1 : t, w.s);
  }
  ctx.restore();
  for (let i = 0; i < SPIRITS; i++) spirit(ctx, w, i, false);
}

function pumpkinFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura, walking = w.step !== undefined;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const n = walking ? 6 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI, x = w.x + Math.cos(a) * 20 * w.s, y = w.y + Math.sin(a) * 6 * w.s;
    const t = 2 + Math.round((Math.sin(w.now * 0.009 + i * 1.9) + 1) * 2);
    tongue(ctx, ramp, x, y, w.sat ? t - 1 : t, w.s);
  }
  // now and then the ghost fire breathes out over the ground, a ring of it
  const pulse = frac(w.now / 5200 + seedOf(w.id));
  if (pulse < 0.5) {
    const t = pulse * 2;
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.fillStyle = ramp[2];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      dot(ctx, w.x + Math.cos(a) * (14 + t * 40) * w.s, w.y + Math.sin(a) * (4 + t * 13) * w.s, 1, w.s);
    }
  }
  // sparks going up
  for (let i = 0; i < 9; i++) {
    const t = frac(w.now / 1500 + i / 9 + seedOf(w.id));
    const x = w.x + Math.sin(i * 7.3 + t * 3) * 18 * w.s, y = w.y - t * 54 * w.s;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = ramp[t < 0.5 ? 3 : 2];
    dot(ctx, x, y, t < 0.6 ? 1.5 : 1, w.s);
  }
  // what each footfall left: a footprint that burns out
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    ctx.globalAlpha = 1 - t;
    for (let i = -1; i <= 1; i++) tongue(ctx, ramp, f.x + i * 3 * w.s, f.y + Math.abs(i) * w.s, Math.round((1 - t) * 6) + 1 - Math.abs(i), w.s);
    // and sparks thrown out of it
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ramp[3];
      dot(ctx, f.x + (i - 1) * t * 16 * w.s, f.y - t * (9 + i * 3) * w.s, 1, w.s);
    }
  }
  ctx.restore();
  for (let i = 0; i < SPIRITS; i++) spirit(ctx, w, i, true);
}

// ── the count: three bats about the wearer, crimson mist off the cape ──
const BATS = 3;
function bat(ctx: CanvasRenderingContext2D, w: Wearer, i: number, front: boolean) {
  const a = (w.now * (w.step !== undefined ? 0.0006 : 0.00042) + i / BATS + seedOf(w.id)) * Math.PI * 2, near = Math.sin(a) > 0;
  if (near !== front) return;
  const x = w.x + Math.cos(a) * 24 * w.s + Math.sin(w.now * 0.003 + i) * 2 * w.s;
  const y = w.y - (w.sat ? 28 : 42) * w.s + Math.sin(a * 2 + i) * 8 * w.s;
  sprite(ctx, Math.floor(w.now / 110 + i) % 2 ? "auraBatA" : "auraBatB", w.dye, x, y, w.cell, near ? 0.75 : 0.6);
}

function batsBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  glow(ctx, w.dye.aura[2], w.x, w.y - 3 * w.s, 74 * w.s, 24 * w.s, 0.5 + w.night * 0.4);
  glow(ctx, w.dye.aura[1], w.x, w.y - 18 * w.s, 56 * w.s, 56 * w.s, 0.28 + w.night * 0.3);
  // the night's own mist rising behind the cape in a slow wall
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const t = frac(w.now / 2600 + i / 9 + seedOf(w.id));
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.75;
    ctx.fillStyle = w.dye.aura[t < 0.5 ? 1 : 0];
    dot(ctx, w.x + Math.cos(i * 2.1) * (15 + Math.sin(t * 3 + i) * 3) * w.s, w.y - (2 + t * 26) * w.s, 3, w.s);
  }
  ctx.restore();
  for (let i = 0; i < BATS; i++) bat(ctx, w, i, false);
}

function batsFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura;
  ctx.save();
  // mist off the hem, sinking and spreading
  for (let i = 0; i < 10; i++) {
    const t = frac(w.now / 2200 + i / 10 + seedOf(w.id));
    ctx.globalAlpha = (1 - t) * 0.85;
    ctx.fillStyle = ramp[t < 0.5 ? 1 : 0];
    dot(ctx, w.x + Math.cos(i * 2.4) * (10 + t * 12) * w.s, w.y - (8 - t * 7) * w.s, 2, w.s);
  }
  // embers
  for (let i = 0; i < 8; i++) {
    const t = frac(w.now / 1900 + i / 8 + seedOf(w.id) * 2);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = ramp[2];
    dot(ctx, w.x + Math.sin(i * 5.1 + t * 2) * 16 * w.s, w.y - (10 + t * 38) * w.s, 1, w.s);
  }
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.fillStyle = ramp[1];
    for (let i = 0; i < 4; i++) dot(ctx, f.x + Math.cos(i * 1.6) * t * 12 * w.s, f.y - t * (2 + i) * w.s, 2, w.s);
  }
  ctx.restore();
  for (let i = 0; i < BATS; i++) bat(ctx, w, i, true);
}

// ── the moon keeper: the lantern at the hip gives real light, gold dust goes up, each step a little crescent ──
function moonBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  const breath = 0.8 + Math.sin(w.now * 0.0017) * 0.12;
  glow(ctx, w.dye.aura[1], w.x, w.y - 2 * w.s, 60 * w.s, 20 * w.s, breath * (0.32 + w.night * 0.5));
}

function moonFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura, breath = 0.8 + Math.sin(w.now * 0.0017) * 0.12, hipX = w.x - 9 * w.s, hipY = w.y - (w.sat ? 8 : 15) * w.s;
  glow(ctx, ramp[1], hipX, hipY, 42 * w.s, 42 * w.s, breath * (0.26 + w.night * 0.34));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const t = frac(w.now / 2600 + i / 8 + seedOf(w.id));
    ctx.globalAlpha = Math.sin(t * Math.PI);
    ctx.fillStyle = ramp[i % 2 ? 3 : 2];
    dot(ctx, w.x + Math.sin(i * 3.7 + t * 4) * (8 + i * 1.6) * w.s, w.y - (6 + t * 56) * w.s, i % 3 ? 1 : 1.5, w.s);
  }
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = ramp[3];
    // (a crescent of dust in the doll's pixels)
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
      dot(ctx, f.x + Math.cos(a) * (5 + t * 7) * w.s, f.y + 1 * w.s - Math.sin(a) * (2 + t * 4) * w.s, 1, w.s);
    }
  }
  ctx.restore();
}

// ── the maple: leaves come off the mantle and fall, each footfall kicks more up ──
function leaf(ctx: CanvasRenderingContext2D, w: Wearer, x: number, y: number, t: number, alpha: number, i: number) {
  const turn = Math.floor(t * 8 + i) % 2 === 0;
  sprite(ctx, turn ? "auraLeafA" : "auraLeafB", w.dye, x, y, w.cell, 0.5, alpha);
}

function leavesBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  glow(ctx, w.dye.aura[2], w.x, w.y - 2 * w.s, 60 * w.s, 20 * w.s, 0.34 + w.night * 0.42);
}

function leavesFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const seed = seedOf(w.id), count = w.sat ? 3 : 6;
  for (let i = 0; i < count; i++) {
    const t = frac(w.now / 3400 + i / count + seed);
    const x = w.x + Math.sin(i * 4.2) * 18 * w.s + Math.sin(t * Math.PI * 3 + i) * 9 * w.s;
    const y = w.y - (44 - t * 44) * w.s;
    leaf(ctx, w, x, y, t, t > 0.85 ? (1 - t) / 0.15 : 1, i);
  }
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    for (let i = 0; i < 3; i++) {
      const dir = (i - 1 || 0.4) * (f.side || 1);
      leaf(ctx, w, f.x + dir * t * 14 * w.s, f.y - Math.sin(t * Math.PI) * (12 + i * 3) * w.s, t, 1 - t, i);
    }
  }
}

// ── Loy Krathong (the owner, 2026-11-14: "สวยทั้งสามชุด เอาทั้งสามชุดเลย"): each its own water and light ──

/** A candle's flame on a lotus raft, the code's: a little tongue and the light it gives. */
function candle(ctx: CanvasRenderingContext2D, w: Wearer, x: number, y: number, i: number, alpha: number) {
  glow(ctx, w.dye.aura[2], x, y, 18 * w.s, 18 * w.s, alpha * (0.4 + w.night * 0.4));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  tongue(ctx, w.dye.aura, x, y, 2 + (Math.sin(w.now * 0.011 + i * 3) > 0 ? 1 : 0), w.s * 0.7);
  ctx.restore();
}

/** A ring spreading on water, in the doll's pixels. */
function ripple(ctx: CanvasRenderingContext2D, w: Wearer, x: number, y: number, t: number, colour: string, wide = 1) {
  ctx.globalAlpha = (1 - t) * 0.85;
  ctx.fillStyle = colour;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    dot(ctx, x + Math.cos(a) * (4 + t * 16) * wide * w.s, y + Math.sin(a) * (1.4 + t * 5) * wide * w.s, 1, w.s);
  }
}

// the lotus raft keeper: two little lotus rafts with their candles go round the feet, petals fall, each step a ring
const RAFTS = 2;
function raft(ctx: CanvasRenderingContext2D, w: Wearer, i: number, front: boolean) {
  const a = (w.now * (w.step !== undefined ? 0.0003 : 0.00018) + i / RAFTS + seedOf(w.id)) * Math.PI * 2, near = Math.sin(a) > 0;
  if (near !== front) return;
  const x = w.x + Math.cos(a) * (w.sat ? 17 : 21) * w.s, y = w.y + Math.sin(a) * 6 * w.s - (2 + Math.sin(w.now * 0.0024 + i * 2) * 1) * w.s;
  sprite(ctx, "auraKrathong", w.dye, x, y, w.cell, near ? 0.5 : 0.42);
  candle(ctx, w, x, y - 4 * w.s, i, near ? 1 : 0.8);
}

function lotusBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  glow(ctx, w.dye.aura[1], w.x, w.y - 2 * w.s, 62 * w.s, 20 * w.s, 0.32 + w.night * 0.42);
  for (let i = 0; i < RAFTS; i++) raft(ctx, w, i, false);
}

function lotusFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const seed = seedOf(w.id), count = w.sat ? 3 : 5;
  ctx.save();
  // the water under the feet now and then rings outward, as if the wearer stood in the river
  const pulse = frac(w.now / 4600 + seed);
  if (pulse < 0.6) ripple(ctx, w, w.x, w.y, pulse / 0.6, w.dye.aura[3], 1.3);
  for (const f of footfalls(w)) ripple(ctx, w, f.x, f.y, (w.now - f.at) / 1400, w.dye.aura[2]);
  ctx.restore();
  for (let i = 0; i < count; i++) {
    const t = frac(w.now / 3800 + i / count + seed);
    const x = w.x + Math.sin(i * 3.9) * 17 * w.s + Math.sin(t * Math.PI * 2 + i) * 7 * w.s;
    const turn = Math.floor(t * 7 + i) % 2 === 0;
    sprite(ctx, turn ? "auraPetalA" : "auraPetalB", w.dye, x, w.y - (46 - t * 46) * w.s, w.cell, 0.45, t > 0.85 ? (1 - t) / 0.15 : 1);
  }
  for (let i = 0; i < RAFTS; i++) raft(ctx, w, i, true);
}

// the sky lantern bearer: little lanterns go up from behind the shoulders, sparks from the hem, each step a ring of embers
function skyLantern(ctx: CanvasRenderingContext2D, w: Wearer, t: number, i: number) {
  const x = w.x + (i % 2 ? 1 : -1) * (10 + i * 3) * w.s + Math.sin(t * Math.PI * 2 + i * 1.7) * 4 * w.s;
  const y = w.y - ((w.sat ? 24 : 34) + t * 64) * w.s;
  const alpha = t < 0.12 ? t / 0.12 : t > 0.8 ? (1 - t) / 0.2 : 1, size = 0.5 - t * 0.18;
  glow(ctx, w.dye.aura[2], x, y + 2 * w.s, 30 * w.s, 30 * w.s, alpha * (0.45 + w.night * 0.4));
  sprite(ctx, "auraLantern", w.dye, x, y, w.cell, size, alpha);
  // (its little flame, under the open bottom: the code's)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  tongue(ctx, w.dye.aura, x, y + 4 * w.s * (size / 0.5), 2, w.s * 0.6);
  ctx.restore();
}

function lanternsBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  const breath = 0.8 + Math.sin(w.now * 0.0019) * 0.14;
  glow(ctx, w.dye.aura[1], w.x, w.y - 2 * w.s, 62 * w.s, 20 * w.s, breath * (0.34 + w.night * 0.46));
  const seed = seedOf(w.id), n = w.sat ? 2 : 3;
  for (let i = 0; i < n; i++) skyLantern(ctx, w, frac(w.now / 6400 + i / n + seed), i);
}

function lanternsFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const t = frac(w.now / 2300 + i / 8 + seedOf(w.id));
    ctx.globalAlpha = Math.sin(t * Math.PI);
    ctx.fillStyle = ramp[i % 2 ? 3 : 2];
    dot(ctx, w.x + Math.sin(i * 4.3 + t * 3) * (12 + i) * w.s, w.y - (4 + t * 44) * w.s, i % 3 ? 1 : 1.5, w.s);
  }
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    ctx.globalAlpha = 1 - t;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = ramp[i % 2 ? 3 : 2];
      dot(ctx, f.x + Math.cos(a) * (3 + t * 9) * w.s, f.y + Math.sin(a) * (1 + t * 3) * w.s - t * 6 * w.s, 1, w.s);
    }
  }
  ctx.restore();
}

// the river spirit: two fish swim round, bubbles go up, the ground ripples and each step splashes
const FISH = 2;
function fish(ctx: CanvasRenderingContext2D, w: Wearer, i: number, front: boolean) {
  const turn = w.now * (w.step !== undefined ? 0.0005 : 0.00034) + i / FISH + seedOf(w.id), a = turn * Math.PI * 2, near = Math.sin(a) > 0;
  if (near !== front) return;
  const x = w.x + Math.cos(a) * 22 * w.s, y = w.y - (w.sat ? 20 : 28 + i * 8) * w.s + Math.sin(a) * 6 * w.s + Math.sin(w.now * 0.003 + i) * 2 * w.s;
  // (it swims the way it goes round: drawn facing left, so turned when it goes right, near it goes right. The sheet's two
  // fish came out as one fish and its mirror, not two strokes of a tail: the left-facing one is drawn, and its swimming is
  // a sway of its width)
  const right = near, sway = 1 + Math.sin(w.now * 0.018 + i * 2.1) * 0.09;
  ctx.save();
  ctx.translate(x, 0); ctx.scale(right ? -sway : sway, 1); ctx.translate(-x, 0);
  sprite(ctx, "auraFishB", w.dye, x, y, w.cell, near ? 0.5 : 0.4, near ? 1 : 0.8);
  ctx.restore();
}

function riverBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  glow(ctx, w.dye.aura[1], w.x, w.y - 2 * w.s, 66 * w.s, 22 * w.s, 0.34 + w.night * 0.42);
  glow(ctx, w.dye.aura[0], w.x, w.y - 20 * w.s, 52 * w.s, 52 * w.s, 0.18 + w.night * 0.22);
  for (let i = 0; i < FISH; i++) fish(ctx, w, i, false);
}

function riverFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  const ramp = w.dye.aura, seed = seedOf(w.id);
  ctx.save();
  for (let k = 0; k < 2; k++) {
    const t = frac(w.now / 3000 + k / 2 + seed);
    ripple(ctx, w, w.x, w.y, t, ramp[k ? 2 : 3], 1.25);
  }
  // bubbles going up: a ring of four squares, a bright one on its upper left
  for (let i = 0; i < 6; i++) {
    const t = frac(w.now / 2600 + i / 6 + seed);
    const x = w.x + Math.sin(i * 5.3 + t * 4) * (10 + i * 1.5) * w.s, y = w.y - (6 + t * 50) * w.s;
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.9;
    ctx.fillStyle = ramp[2];
    if (i % 2) dot(ctx, x, y, 1, w.s);
    else { dot(ctx, x - w.s, y, 1, w.s); dot(ctx, x + w.s, y, 1, w.s); dot(ctx, x, y - w.s, 1, w.s); dot(ctx, x, y + w.s, 1, w.s); ctx.fillStyle = ramp[3]; dot(ctx, x - w.s, y - w.s, 1, w.s); }
  }
  // each footfall throws up a splash: drops in two arcs that fall back
  for (const f of footfalls(w)) {
    const t = (w.now - f.at) / 1400;
    ripple(ctx, w, f.x, f.y, t, ramp[2], 0.8);
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = ramp[3];
    for (let i = 0; i < 4; i++) {
      const dir = i < 2 ? -1 : 1, out = (i % 2 ? 6 : 10) * t;
      dot(ctx, f.x + dir * out * w.s, f.y - Math.sin(Math.min(1, t * 1.6) * Math.PI) * (6 + (i % 2) * 3) * w.s, 1, w.s);
    }
  }
  ctx.restore();
  for (let i = 0; i < FISH; i++) fish(ctx, w, i, true);
}

export const auraState = (): AuraState => ({ steps: [], lastStep: -1 });

// ── the least of it: a faint pool at the feet and three motes, whichever the outfit ──
function minimalBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  glow(ctx, w.dye.aura[1], w.x, w.y - 2 * w.s, 44 * w.s, 14 * w.s, 0.22 + w.night * 0.22);
}

function minimalFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const t = frac(w.now / 3200 + i / 3 + seedOf(w.id));
    ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
    ctx.fillStyle = w.dye.aura[i % 2 ? 3 : 2];
    dot(ctx, w.x + Math.sin(i * 4.1 + t * 2) * 12 * w.s, w.y - (8 + t * 34) * w.s, 1, w.s);
  }
  ctx.restore();
}

/** What of the aura gives light, for the map's lights over the night's dark. */
export function auraLights(w: Wearer): Array<{ x: number; y: number; rgb: string; reach: number; strong: number }> {
  const rgb = hexRgb(w.dye.aura[2]), breath = 0.85 + Math.sin(w.now * 0.002) * 0.15;
  if (w.minimal) return [{ x: w.x, y: w.y - 10 * w.s, rgb, reach: 26, strong: 0.35 }];
  if (w.kind === "spirits") return [{ x: w.x, y: w.y - 14 * w.s, rgb, reach: 78, strong: breath }, { x: w.x, y: w.y, rgb, reach: 44, strong: 0.7 }];
  if (w.kind === "moon") return [{ x: w.x - 9 * w.s, y: w.y - (w.sat ? 8 : 15) * w.s, rgb, reach: 70, strong: 0.65 * breath }];
  // (the lanterns light the air above the wearer, the rafts the ground about the feet)
  if (w.kind === "lanterns") return [{ x: w.x, y: w.y - 60 * w.s, rgb, reach: 70, strong: 0.55 * breath }, { x: w.x, y: w.y - 10 * w.s, rgb, reach: 40, strong: 0.45 }];
  if (w.kind === "lotus") return [{ x: w.x, y: w.y, rgb, reach: 56, strong: 0.6 * breath }];
  return [{ x: w.x, y: w.y - 12 * w.s, rgb, reach: 42, strong: 0.5 * breath }];
}

/**
 * The aura again over the night's dark, as a lamp's flame is (what is drawn under the dark is only dimmed): what burns
 * stays bright after dark, the busiest hours in the town.
 */
export function auraOverDark(ctx: CanvasRenderingContext2D, w: Wearer) {
  // (what is over the dark is over the name under the feet too: it stops at the ground)
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x - 120 * w.s, w.y - 120 * w.s, 240 * w.s, 120 * w.s);
  ctx.clip();
  if (w.minimal) { minimalFront(ctx, w); ctx.restore(); return; }
  if (w.kind === "spirits") {
    const ramp = w.dye.aura, n = w.step !== undefined ? 6 : 8;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI + Math.PI;
      tongue(ctx, ramp, w.x + Math.cos(a) * 19 * w.s, w.y + Math.sin(a) * 6 * w.s, 3 + Math.round((Math.sin(w.now * 0.008 + i * 2.6) + 1) * 2.5), w.s);
    }
    ctx.restore();
  }
  auraFront(ctx, w);
  ctx.restore();
}

export function auraBehind(ctx: CanvasRenderingContext2D, w: Wearer) {
  if (w.minimal) { minimalBehind(ctx, w); return; }
  noteSteps(w);
  if (w.kind === "spirits") pumpkinBehind(ctx, w);
  else if (w.kind === "bats") batsBehind(ctx, w);
  else if (w.kind === "moon") moonBehind(ctx, w);
  else if (w.kind === "lotus") lotusBehind(ctx, w);
  else if (w.kind === "lanterns") lanternsBehind(ctx, w);
  else if (w.kind === "river") riverBehind(ctx, w);
  else leavesBehind(ctx, w);
}

export function auraFront(ctx: CanvasRenderingContext2D, w: Wearer) {
  if (w.minimal) { minimalFront(ctx, w); return; }
  if (w.kind === "spirits") pumpkinFront(ctx, w);
  else if (w.kind === "bats") batsFront(ctx, w);
  else if (w.kind === "moon") moonFront(ctx, w);
  else if (w.kind === "lotus") lotusFront(ctx, w);
  else if (w.kind === "lanterns") lanternsFront(ctx, w);
  else if (w.kind === "river") riverFront(ctx, w);
  else leavesFront(ctx, w);
}
