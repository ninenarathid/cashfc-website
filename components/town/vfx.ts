import type { Vec } from "@/lib/town/world";
import type { FarmFrame } from "./TownFarm";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import type { Stack } from "@/lib/town/trade";
import { elementAction } from "@/lib/town/element-action";
import { ACTION_LIFE, ACTION_LIMIT, paintElementAction, type ElementBurst } from "./element-action-art";

/**
 * What flies up where work is done (the owner, 2026-10-03: "การทำอาหาร และ ปลูกพืช ช่วย
 * ใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลาเลย"): clods of earth from a hoe, leaves
 * from weeds, seeds dropped, water from a can, dust, a mist, a sparkle over
 * what is picked, steam and smoke from a pot, bubbles from a tub, a splash.
 * Each is a burst of square pixels at a point of the map, every particle on
 * its own way from the burst's seed, so nothing is kept but when it began.
 *
 * Drawn among everything else on the map, by whoever keeps one (the farm's
 * panel, the kitchen's). Mine only: nobody is told of them. With reduced
 * motion there are none.
 */
export type VfxKind = "soil" | "leaves" | "seeds" | "water" | "dust" | "mist" | "sparkle" | "steam" | "smoke" | "bubbles" | "splash" | "pop" | "bless";

interface Burst { kind: VfxKind; at: Vec | null; born: number; seed: number; icon?: string; lift: number }

/** How long each lasts, in milliseconds. */
const LIFE: Record<VfxKind, number> = {
  soil: 560, leaves: 760, seeds: 460, water: 700, dust: 640, mist: 820, sparkle: 820, steam: 1350, smoke: 1600, bubbles: 1450, splash: 600, pop: 950, bless: 1300,
};
/** The sparkle's four frames (the icons' own), for the lights round a blessing's burst. */
const SPARKS: IconName[] = ["fxSpark1", "fxSpark2", "fxSpark3", "fxSpark4"];
const EARTH = ["#6b4a2a", "#8a623a", "#4e3520"], GREEN = ["#5a9a3a", "#7cc04f", "#3f7a2a"], WATER = ["#7fc7f0", "#bfe6ff", "#4fa3e0"];

/** A number in [0, 1) from a seed and two counts: the same every frame, so a particle keeps its own way. */
function rnd(seed: number, i: number, k: number): number {
  let h = (seed ^ Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** One burst, `t` of the way through its life (0 to 1), its foot at (x, y) on the screen. */
function paint({ ctx, s, img }: FarmFrame, b: Burst, x: number, y: number, t: number) {
  const px = Math.max(1, Math.round(1.6 * s)), secs = (t * LIFE[b.kind]) / 1000, fade = t < 0.7 ? 1 : (1 - t) / 0.3;
  const dot = (dx: number, dy: number, size: number, colour: string, alpha = 1) => {
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.ceil(size * px), Math.ceil(size * px));
  };
  ctx.save();
  switch (b.kind) {
    case "soil": case "leaves": case "splash": {
      // thrown up and out, and down again to the ground
      const colours = b.kind === "soil" ? EARTH : b.kind === "leaves" ? GREEN : WATER, n = b.kind === "leaves" ? 7 : 10, g = b.kind === "leaves" ? 190 : 420;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (rnd(b.seed, i, 0) - 0.5) * 2.2, v = 70 + rnd(b.seed, i, 1) * 95;
        const dx = Math.cos(a) * v * secs + (b.kind === "leaves" ? Math.sin(secs * 9 + i) * 3 : 0), dy = Math.sin(a) * v * secs + 0.5 * g * secs * secs;
        dot(dx, Math.min(dy, 2), rnd(b.seed, i, 2) > 0.6 ? 2 : 1, colours[i % 3], fade);
      }
      break;
    }
    case "seeds":
      // dropped from the hand into the soil
      for (let i = 0; i < 5; i++) dot((rnd(b.seed, i, 0) - 0.5) * 16, -22 * (1 - clamp(t * 1.7 - rnd(b.seed, i, 1) * 0.3)), 1, "#f0e2b8", fade);
      break;
    case "water":
      // from the can's rose, in an arc, onto the plot
      for (let i = 0; i < 12; i++) {
        const u = (t - rnd(b.seed, i, 0) * 0.42) / 0.55;
        if (u <= 0 || u >= 1) continue;
        dot(-14 + (14 + (rnd(b.seed, i, 1) - 0.5) * 18) * u, -24 * (1 - u) - 9 * Math.sin(Math.PI * u), 1, WATER[i % 3], 0.95);
      }
      break;
    case "dust": case "mist": {
      const colours = b.kind === "dust" ? ["#c9a877", "#a8845a", "#e5cc9a"] : ["#bfe8a8", "#e6f7d8", "#8fd070"], wide = b.kind === "dust" ? 30 : 44;
      for (let i = 0; i < 8; i++) {
        dot((rnd(b.seed, i, 0) - 0.5) * wide * (0.35 + t), -6 - (10 + 16 * rnd(b.seed, i, 1)) * t, b.kind === "mist" ? 2 : 1 + (i % 2), colours[i % 3], (1 - t) * 0.8);
      }
      break;
    }
    case "sparkle":
      // little four-pointed lights, going up and out, each twinkling on its own beat
      for (let i = 0; i < 6; i++) {
        const a = rnd(b.seed, i, 0) * Math.PI * 2, r = 8 + 24 * t * (0.6 + rnd(b.seed, i, 1));
        const cx = Math.cos(a) * r, cy = -16 + Math.sin(a) * r * 0.6 - 12 * t, lit = Math.sin(secs * 14 + i * 2.1) > -0.2;
        const colour = ["#fff6c8", "#ffe07a", "#ffffff"][i % 3];
        dot(cx, cy, 1, colour, fade);
        if (lit) for (const [ax, ay] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) dot(cx + ax, cy + ay, 1, colour, fade * 0.8);
      }
      break;
    case "steam": case "smoke": {
      // puffs going up one after another, each growing and thinning
      const colours = b.kind === "steam" ? ["#ffffff", "#f1efe6", "#e4e1d6"] : ["#8a7fa0", "#6e6486", "#a79cc0"], tall = b.kind === "steam" ? 46 : 58;
      for (let i = 0; i < 7; i++) {
        const late = (i / 7) * 0.5, u = clamp((t - late) / (1 - late));
        if (u <= 0) continue;
        dot((rnd(b.seed, i, 0) - 0.5) * 16 + Math.sin(u * 6 + i) * 3, -8 - tall * u, 1.5 + 1.8 * u, colours[i % 3], 0.8 * (1 - u));
      }
      break;
    }
    case "bubbles":
      // soap bubbles going up, wobbling, and gone
      for (let i = 0; i < 7; i++) {
        const late = rnd(b.seed, i, 0) * 0.45, u = clamp((t - late) / (1 - late));
        if (u <= 0 || u >= 1) continue;
        const size = (2 + (i % 2)) * px, bx = Math.round(x + ((rnd(b.seed, i, 1) - 0.5) * 28 + Math.sin(u * 8 + i) * 2.5) * s), by = Math.round(y + (-6 - 40 * u) * s);
        ctx.globalAlpha = 0.9 * (1 - u * 0.5);
        ctx.strokeStyle = "#d6f0ff";
        ctx.lineWidth = Math.max(1, px * 0.6);
        ctx.strokeRect(bx, by, size, size);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx + size * 0.2, by + size * 0.2, Math.max(1, px * 0.6), Math.max(1, px * 0.6));
      }
      break;
    case "pop": {
      // the thing itself, held up for a moment
      const cell = b.icon ? ICON_ATLAS.icons[b.icon as IconName] : undefined;
      if (!cell || !img?.complete || !img.naturalWidth) break;
      const [sx, sy, w, h] = cell, k = (26 / Math.max(w, h)) * s, rise = (18 + 22 * Math.min(1, t * 2.2)) * s;
      ctx.globalAlpha = clamp(t < 0.12 ? t / 0.12 : fade);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sx, sy, w, h, Math.round(x - (w * k) / 2), Math.round(y - rise - h * k), w * k, h * k);
      break;
    }
    case "bless": {
      // a buff at work (components/town/TownBuffFx): its own burst, growing as it rises and then gone, with little
      // lights twinkling round it, each through the sparkle's four frames on its own beat
      const cell = b.icon ? ICON_ATLAS.icons[b.icon as IconName] : undefined;
      if (!cell || !img?.complete || !img.naturalWidth) break;
      const [sx, sy, w, h] = cell, k = (28 / Math.max(w, h)) * s * (0.7 + 0.45 * Math.min(1, t * 3)), rise = (18 + 20 * t) * s;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = clamp(t < 0.1 ? t / 0.1 : fade);
      ctx.drawImage(img, sx, sy, w, h, Math.round(x - (w * k) / 2), Math.round(y - rise - (h * k) / 2), w * k, h * k);
      for (let i = 0; i < 4; i++) {
        const light = ICON_ATLAS.icons[SPARKS[Math.min(3, Math.floor(((t * 2.4 + rnd(b.seed, i, 0)) % 1) * 4))]];
        if (!light) continue;
        const a = rnd(b.seed, i, 1) * Math.PI * 2, r = (15 + 13 * rnd(b.seed, i, 2)) * s * (0.6 + 0.6 * t), [lx, ly, lw, lh] = light, lk = 0.5 * s;
        ctx.globalAlpha = clamp(fade * 0.95);
        ctx.drawImage(img, lx, ly, lw, lh, Math.round(x + Math.cos(a) * r - (lw * lk) / 2), Math.round(y - rise + Math.sin(a) * r * 0.7 - (lh * lk) / 2), lw * lk, lh * lk);
      }
      break;
    }
  }
  ctx.restore();
}

export class Vfx {
  private bursts: Burst[] = [];
  private elements: { burst: ElementBurst; at: Vec | null; lift: number }[] = [];
  private seeds = 20261003;

  element(stack: Stack | null | undefined, at: Vec | null = null, opts: { lift?: number } = {}) {
    const look = elementAction(stack);
    if (!look) return;
    const now = performance.now();
    this.elements = this.elements.filter((b) => now - b.burst.born < ACTION_LIFE);
    if (this.elements.length >= ACTION_LIMIT) this.elements.shift();
    this.elements.push({ burst: { look, born: now, seed: ++this.seeds, x: 0, y: 0, soft: false }, at: at ? { ...at } : null, lift: opts.lift ?? 0 });
  }

  /** Begin a burst at a point of the map, or (with none) where I stand when it is first drawn. `lift` raises it off the ground, in the map's own pixels; `icon` is the thing a "pop" holds up. */
  add(kind: VfxKind, at: Vec | null = null, opts: { icon?: string; lift?: number } = {}) {
    if (this.bursts.length > 40) this.bursts.shift();
    this.seeds = (Math.imul(this.seeds, 1664525) + 1013904223) | 0;
    this.bursts.push({ kind, at, born: performance.now(), seed: this.seeds, icon: opts.icon, lift: opts.lift ?? 0 });
  }

  /** Put what is in the air this frame among everything else the map draws. */
  draw(frame: FarmFrame) {
    if (!this.bursts.length && !this.elements.length) return;
    if (frame.still) this.bursts = [];
    const now = performance.now();
    this.elements = this.elements.filter((b) => now - b.burst.born < ACTION_LIFE);
    for (const b of this.elements) {
      if (!b.at) { if (!frame.self) continue; b.at = { ...frame.self }; }
      const at = b.at, c = frame.project(at);
      if (!frame.onScreen(c)) continue;
      const draw = () => paintElementAction(frame.ctx,
        { ...b.burst, x: c.x, y: c.y - b.lift * frame.s }, now, frame.s, frame.still);
      if (frame.over && (frame.dark ?? 0) > 0.3) frame.over(draw);
      else frame.things.push({ depth: at.x + at.y + 1.5, draw });
    }
    this.bursts = this.bursts.filter((b) => now - b.born < LIFE[b.kind]);
    for (const b of this.bursts) {
      if (!b.at) { if (!frame.self) continue; b.at = { ...frame.self }; }
      const at = b.at, c = frame.project(at);
      if (!frame.onScreen(c)) continue;
      frame.things.push({ depth: at.x + at.y + 1.4, draw: () => paint(frame, b, c.x, c.y - b.lift * frame.s, clamp((now - b.born) / LIFE[b.kind])) });
    }
  }

  /** How many bursts are in the air (for scripts in `next dev`). */
  get count() { return this.bursts.length + this.elements.length; }
}
