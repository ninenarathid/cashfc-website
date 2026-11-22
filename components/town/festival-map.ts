import { CANVAS, MAP_SCALE, drawKrathong, drawProp, hallSlots, krathongImage, propSize } from "@/lib/town/krathong-art";
import type { AwardView, RiverKrathong } from "@/lib/town/krathong";
import type { Vec } from "@/lib/town/world";

/**
 * Loy Krathong on the editor's town map: the stall beside the Popoto Board, the hall of the year's outstanding
 * krathongs beside it once the results are out, and the floated krathongs on the west river by the festival stage,
 * drifting downstream and gathering, candle-lit, where the river widens (the night fills it as the members float).
 */

/** Ground points (feet) of the stall (on the open plaza before the Popoto Board, 29,35–37) and the hall (south-east of the fountain, clear of the torii and the benches). */
export const STALL_AT: Vec = { x: 34.4, y: 40.2 };
export const HALL_AT: Vec = { x: 42.6, y: 46.8 };
/** Where a member stands to float: the west river's bank, north of the festival stage. */
export const FLOAT_BANK: [number, number] = [4, 37];

// The west river runs north–south over x -1..5 by the plaza and the stage (the bank beyond x 0 is water too); the
// fishing pier stands over it from y 57.7 at x 3.8 and on, so the krathongs come to rest on the open water above it,
// south of the stage (which would hide them behind it), between y 53.6 and 58.2, x -0.6..3.6.
const START_Y = 37.6, REST_Y0 = 53.6, REST_Y1 = 58.2, DRIFT_MS = 12 * 60_000, MID = 1.5, HALF = 2.1;
const rowWater = (_y: number) => ({ mid: MID, half: HALF });

/** A small steady hash of a krathong's id, 0..1, for its own lane, pace and resting place. */
const h01 = (id: number, salt: number) => { let x = Math.imul(id ^ (salt * 0x9e3779b9), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

/** Where a floated krathong is on the river at a moment (tile coordinates). */
export function riverPos(k: RiverKrathong, now: number): Vec {
  const restY = REST_Y0 + h01(k.id, 1) * (REST_Y1 - REST_Y0);
  const f = Math.min(1, Math.max(0, (now - k.floated) / (DRIFT_MS * (0.8 + 0.4 * h01(k.id, 2)))));
  const ease = 1 - (1 - f) * (1 - f);
  const y = START_Y + (restY - START_Y) * ease;
  const w = rowWater(y), lane = (h01(k.id, 3) - 0.5) * 2 * Math.max(0.2, w.half - 0.7);
  // a slow sway along its way, and at rest a little circling in the eddy
  const t = now / 1000, sway = Math.sin(t / 3.2 + k.id) * 0.18 * (1 - f) + Math.sin(t / 7 + k.id * 1.7) * 0.12 * f;
  return { x: Math.max(0.6, w.mid + lane + sway), y: y + Math.cos(t / 9 + k.id) * 0.1 * f };
}

export interface FestivalDraw {
  ctx: CanvasRenderingContext2D;
  s: number;
  now: number;
  night: boolean;
  project: (t: Vec) => Vec;
  onScreen: (p: Vec) => boolean;
  push: (depth: number, draw: () => void) => void;
  sign: (draw: () => void) => void;
  label: (text: string, x: number, y: number) => void;
  /** A light laid after the night's dark (the town's own lights: a candle shines through it). */
  light: (x: number, y: number, reach: number, rgb: string, strong?: number, flat?: number) => void;
  th: boolean;
}

/** Where the light part's flame is in the 48×50 template (the candle's wick, the jar's middle). */
const FLAME: Record<string, [number, number]> = { l_candle: [33, 6], l_firefly: [32, 14] };

/** The stall: drawn, and where it is for a tap. */
export function drawStall(d: FestivalDraw): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(STALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  let box: ReturnType<typeof drawProp> = null;
  d.push(STALL_AT.x + STALL_AT.y, () => {
    // (a prop's own `scale` is map pixels an art pixel: the camera's scale is all that is added)
    box = drawProp(d.ctx, "stall", feet.x, feet.y, d.s);
    if (box) { const b = box; d.sign(() => d.label(d.th ? "ซุ้มกระทง" : "Krathong stall", (b.x0 + b.x1) / 2, b.y0 - 12 * d.s)); }
  });
  // (the tap box is the prop's size wherever it stands, known before its turn to be drawn)
  const [w, h] = propSize("stall") ?? [134, 138];
  return { x0: feet.x - (w / 2) * d.s, y0: feet.y - h * d.s, x1: feet.x + (w / 2) * d.s, y1: feet.y + 4 * d.s };
}

/** The hall: its stage, the year's top krathongs on its pedestals, their makers' names above. */
export function drawHall(d: FestivalDraw, awards: AwardView[]): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(HALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  const top = awards.filter((a) => a.kind === "popular").sort((a, b) => a.place - b.place).slice(0, 3);
  const k = MAP_SCALE * d.s;
  d.push(HALL_AT.x + HALL_AT.y, () => {
    const box = drawProp(d.ctx, "hall", feet.x, feet.y, d.s);
    if (!box) return;
    const slots = hallSlots();
    // (the first place in the middle, the next on its left and right: [left, middle, right] are the hall's pedestals)
    const order = [1, 0, 2];
    top.forEach((a, i) => {
      const at = slots[order[i]];
      if (!at) return;
      const x = box.x0 + at[0] * d.s, y = box.y0 + at[1] * d.s, [w, h] = CANVAS;
      const kx = x - (w / 2) * k * 0.75, ky = y - h * k * 0.75, [fx, fy] = FLAME[a.krathong.design.light[0]] ?? [32, 8];
      drawKrathong(d.ctx, a.krathong.design, kx, ky, k * 0.75, Math.floor(d.now / 180) % 3);
      if (d.night) d.light(kx + fx * k * 0.75, ky + fy * k * 0.75, 18 * d.s, "255,196,120", 0.9);
      if (a.maker?.name) {
        const name = a.maker.name, above = order[i] === 1;
        d.sign(() => d.label(`${a.place}. ${name}`, x, above ? y - (h * 0.75 + 6) * k : box.y1 + 10 * d.s));
      }
    });
    d.sign(() => d.label(d.th ? "กระทงดีเด่นประจำปี" : "Krathongs of the year", (box.x0 + box.x1) / 2, box.y0 - 12 * d.s));
  });
  const [hw, hh] = propSize("hall") ?? [168, 154];
  return { x0: feet.x - (hw / 2) * d.s, y0: feet.y - hh * d.s, x1: feet.x + (hw / 2) * d.s, y1: feet.y + 4 * d.s };
}

/** Every floated krathong on the river, with its candle's glow at night. */
export function drawRiver(d: FestivalDraw, river: RiverKrathong[]) {
  if (!river.length || !krathongImage()) return;
  const k = MAP_SCALE * d.s, [w, h] = CANVAS, frame = Math.floor(d.now / 180);
  for (const kr of river) {
    const p = riverPos(kr, d.now), at = d.project(p);
    if (!d.onScreen(at)) continue;
    const bob = Math.sin(d.now / 700 + kr.id) * 1.2 * d.s, x0 = at.x - (w / 2) * k, y0 = at.y - (h - 6) * k + bob;
    const [fx, fy] = FLAME[kr.design.light[0]] ?? [32, 8];
    // the candle shines through the night's dark, and lies on the water under it
    if (d.night) {
      const flicker = 0.85 + 0.15 * Math.sin(d.now / 130 + kr.id * 2.1);
      d.light(x0 + fx * k, y0 + fy * k, 22 * d.s, "255,196,120", flicker);
      d.light(at.x, at.y + 3 * d.s, 30 * d.s, "255,170,90", 0.55 * flicker, 0.38);
    }
    d.push(p.x + p.y, () => {
      const { ctx } = d;
      // its reflection: a faint warm streak on the water below it
      ctx.save();
      ctx.globalAlpha = d.night ? 0.3 : 0.12;
      ctx.fillStyle = "#ffd27a";
      ctx.fillRect(Math.round(x0 + fx * k - 1.5 * d.s), Math.round(at.y + 3 * d.s), Math.round(3 * d.s), Math.round(6 * d.s));
      ctx.restore();
      drawKrathong(ctx, kr.design, x0, y0, k, frame + kr.id);
      if (kr.mine) d.sign(() => d.label(d.th ? "กระทงของฉัน" : "Mine", at.x, y0 - 8 * d.s));
    });
  }
}
