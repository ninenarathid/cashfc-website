import { t2Look } from "@/lib/town/town2";
import { CANVAS, MAP_SCALE, drawKrathong, drawProp, hallSlots, krathongImage } from "@/lib/town/krathong-art";
import type { AwardView, RiverKrathong } from "@/lib/town/krathong";
import type { Vec } from "@/lib/town/world";

/**
 * Loy Krathong on the editor's town map: the stall beside the Popoto Board, the hall of the year's outstanding
 * krathongs beside it once the results are out, and the floated krathongs on the west river by the festival stage,
 * drifting downstream and gathering, candle-lit, where the river widens (the night fills it as the members float).
 */

/** Ground points (feet) of the stall and the hall, on the plaza east of the Popoto Board (29,36–38). */
export const STALL_AT: Vec = { x: 31.6, y: 39.4 };
export const HALL_AT: Vec = { x: 33.2, y: 36.2 };
/** Where a member stands to float: the bank by the festival stage. */
export const FLOAT_BANK: [number, number] = [6, 46];

const START_Y = 45.5, REST_Y0 = 55.5, REST_Y1 = 63.2, DRIFT_MS = 12 * 60_000;

/** The river's water across a row near the west edge: its middle and half its width (tiles). */
const rowWater = (() => {
  const memo = new Map<number, { mid: number; half: number }>();
  return (y: number) => {
    const r = Math.floor(y);
    let got = memo.get(r);
    if (!got) {
      let x1 = -1;
      for (let x = 0; x < 12; x++) { if (t2Look(x, r) === "t2water") x1 = x; else if (x1 >= 0) break; }
      got = x1 >= 0 ? { mid: (x1 + 1) / 2, half: (x1 + 1) / 2 } : { mid: 2, half: 1.5 };
      memo.set(r, got);
    }
    return got;
  };
})();

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
  th: boolean;
}

/** The stall: drawn, and where it is for a tap. */
export function drawStall(d: FestivalDraw): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(STALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  let box: ReturnType<typeof drawProp> = null;
  d.push(STALL_AT.x + STALL_AT.y, () => {
    box = drawProp(d.ctx, "stall", feet.x, feet.y, MAP_SCALE * d.s);
    if (box) { const b = box; d.sign(() => d.label(d.th ? "ซุ้มกระทง" : "Krathong stall", (b.x0 + b.x1) / 2, b.y0 - 12 * d.s)); }
  });
  // (the tap box is the prop's size wherever it stands, known before its turn to be drawn)
  const k = MAP_SCALE * d.s;
  return { x0: feet.x - 40 * k, y0: feet.y - 70 * k, x1: feet.x + 40 * k, y1: feet.y + 4 * k };
}

/** The hall: its stage, the year's top krathongs on its pedestals, their makers' names above. */
export function drawHall(d: FestivalDraw, awards: AwardView[]): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(HALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  const top = awards.filter((a) => a.kind === "popular").sort((a, b) => a.place - b.place).slice(0, 3);
  const k = MAP_SCALE * d.s;
  d.push(HALL_AT.x + HALL_AT.y, () => {
    const box = drawProp(d.ctx, "hall", feet.x, feet.y, k);
    if (!box) return;
    const slots = hallSlots();
    top.forEach((a, i) => {
      const at = slots[i];
      if (!at) return;
      const x = box.x0 + at[0] * k, y = box.y0 + at[1] * k, [w, h] = CANVAS;
      drawKrathong(d.ctx, a.krathong.design, x - (w / 2) * k * 0.75, y - h * k * 0.75, k * 0.75, Math.floor(d.now / 180) % 3);
      if (a.maker?.name) { const name = a.maker.name; d.sign(() => d.label(`${a.place}. ${name}`, x, y - (h * 0.75 + 8) * k)); }
    });
    d.sign(() => d.label(d.th ? "กระทงดีเด่นประจำปี" : "Krathongs of the year", (box.x0 + box.x1) / 2, box.y0 - 12 * d.s));
  });
  return { x0: feet.x - 56 * k, y0: feet.y - 80 * k, x1: feet.x + 56 * k, y1: feet.y + 4 * k };
}

/** Every floated krathong on the river, with its candle's glow at night. */
export function drawRiver(d: FestivalDraw, river: RiverKrathong[]) {
  if (!river.length || !krathongImage()) return;
  const k = MAP_SCALE * d.s * 0.75, [w, h] = CANVAS, frame = Math.floor(d.now / 180);
  for (const kr of river) {
    const p = riverPos(kr, d.now), at = d.project(p);
    if (!d.onScreen(at)) continue;
    const bob = Math.sin(d.now / 700 + kr.id) * 1.2 * d.s;
    d.push(p.x + p.y, () => {
      const { ctx } = d;
      if (d.night) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(at.x, at.y - h * k * 0.55 + bob, 0, at.x, at.y - h * k * 0.55 + bob, 26 * d.s);
        g.addColorStop(0, "rgba(255,196,110,0.35)");
        g.addColorStop(1, "rgba(255,160,60,0)");
        ctx.fillStyle = g;
        ctx.fillRect(at.x - 26 * d.s, at.y - h * k * 0.55 + bob - 26 * d.s, 52 * d.s, 52 * d.s);
        ctx.restore();
      }
      // its reflection: a faint warm streak on the water below it
      ctx.save();
      ctx.globalAlpha = d.night ? 0.28 : 0.12;
      ctx.fillStyle = "#ffd27a";
      ctx.fillRect(Math.round(at.x - 1.5 * d.s), Math.round(at.y + 2 * d.s), Math.round(3 * d.s), Math.round(5 * d.s));
      ctx.restore();
      drawKrathong(ctx, kr.design, at.x - (w / 2) * k, at.y - (h - 6) * k + bob, k, frame + kr.id);
      if (kr.mine) d.sign(() => d.label(d.th ? "กระทงของฉัน" : "Mine", at.x, at.y - (h + 6) * k + bob));
    });
  }
}
