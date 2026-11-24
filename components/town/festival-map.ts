import { CANVAS, MAP_SCALE, drawKrathong, drawProp, hallSlots, krathongImage, propSize } from "@/lib/town/krathong-art";
import type { AwardView, RiverKrathong } from "@/lib/town/krathong";
import type { Vec } from "@/lib/town/world";
import { CITY } from "@/lib/town/town-map";
import { ed } from "@/lib/town/ed";

/**
 * Loy Krathong on the editor's town map: the stall beside the Popoto Board, the hall of the year's outstanding
 * krathongs by the fountain once the results are out, and the floated krathongs on the water, drifting out and
 * gathering, candle-lit (the night fills it as the members float).
 */

/**
 * Where the festival stands on each of the editor's towns (the page's town is fixed for its life, lib/town/town-map):
 * - **the city** (2026-11-23, the town for everyone): the stall on the open lawn south of the park's Popoto Board (38.4,71.5: in front of it the stall hid it),
 *   the hall on the grass south-east of the fountain, and the floating at the dirt landing on the canal's east bank west
 *   of the park (27–30,72–76): a krathong is set on the water before it and drifts out to gather on the open canal
 *   in front of the landing (x 21–26, y 62.5–73.5), clear of the bank's trees further down (they would hide it).
 * - **town2** (now the emergency switch): the stall before the Popoto Board, the hall south-east of the fountain clear
 *   of the torii and the benches, and the west river by the festival stage: the fishing pier stands over it from y 57.7
 *   at x 3.8 and on, so the krathongs come to rest on the open water above it, south of the stage, y 53.6–58.2.
 */
interface Water { startX: number | null; startY: number; rest: [number, number]; mid: number; half: number; least: number }
const PLACES: { stall: Vec; hall: Vec; bank: [number, number]; water: Water } = CITY
  ? { stall: { x: 41.8, y: 81.2 }, hall: { x: 61.6, y: 79.2 }, bank: [28, 73], water: { startX: 25.3, startY: 71.4, rest: [54, 93], mid: 23.5, half: 2.5, least: -1e9 } }
  : { stall: { x: 34.4, y: 40.2 }, hall: { x: 42.6, y: 46.8 }, bank: [4, 37], water: { startX: null, startY: 37.6, rest: [53.6, 58.2], mid: 1.5, half: 2.1, least: 0.6 } };
/** Ground points (feet) of the stall and the hall. */
export const STALL_AT: Vec = PLACES.stall;
export const HALL_AT: Vec = PLACES.hall;
/** Where a member stands to float. */
export const FLOAT_BANK: [number, number] = PLACES.bank;
const W = PLACES.water, DRIFT_MS = 12 * 60_000;

/** A small steady hash of a krathong's id, 0..1, for its own lane, pace and resting place. */
const h01 = (id: number, salt: number) => { let x = Math.imul(id ^ (salt * 0x9e3779b9), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

/**
 * Where a krathong set on the water by its maker is at a moment (v339: "ลอยตามแม่น้ำในเมือง ส่วนไหนก็ได้ กระทงจะลอยอยู่
 * บริเวณนั้น"): it eases a little way out from where it was set down over its first minute, then turns slowly about there.
 */
export function spotPos(k: RiverKrathong, now: number): Vec {
  const w = walkAt(k, now), t = now / 1000;
  if (w) return { x: w.x + Math.sin(t / 6 + k.id) * 0.05, y: w.y + Math.cos(t / 8 + k.id * 1.3) * 0.05 };
  const f = Math.min(1, Math.max(0, (now - k.floated) / 60_000)), a = h01(k.id, 4) * Math.PI * 2;
  return { x: k.x! + Math.cos(a) * 0.3 * f + Math.sin(t / 6 + k.id) * 0.15, y: k.y! + Math.sin(a) * 0.3 * f + Math.cos(t / 8 + k.id * 1.3) * 0.15 };
}

/**
 * The current takes it (the owner, 2026-11-24: "อัพเดทให้กระทงลอยไปไกลๆได้หน่อย มีการเคลื่อนไหว ตามกระแสน้ำ แบบ random"):
 * from where it was set down it drifts out on the water, a step every five seconds, its heading leaning to the town's
 * current (which turns every six minutes, the same for every krathong) and now and then turning on its own; never onto
 * the bank (each step lands on open water, or on no less open water than it left) and never more than REACH tiles from
 * where it was set. Every step is from integer hashes and plain sums, so every member sees it in the same place.
 */
const STEP_MS = 5000, STEP = 0.35, REACH = 16, CURRENT_STEPS = 72, SETTLE_STEPS = 2880;
/** Sixteen headings, written out (so no engine's own cos/sin decides a krathong's way). */
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [0.9239, 0.3827], [0.7071, 0.7071], [0.3827, 0.9239], [0, 1], [-0.3827, 0.9239], [-0.7071, 0.7071], [-0.9239, 0.3827],
  [-1, 0], [-0.9239, -0.3827], [-0.7071, -0.7071], [-0.3827, -0.9239], [0, -1], [0.3827, -0.9239], [0.7071, -0.7071], [0.9239, -0.3827],
];
const hh = (a: number, b: number) => {
  let x = Math.imul(a | 0, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; x = Math.imul(x, 0x297a2d39); x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
};
const wetAt = (x: number, y: number) => ed.t2Tile(Math.floor(x), Math.floor(y)) === "~";
/** How open the water is about a point: itself and four points half a tile off, 0..5. */
const openAt = (x: number, y: number) => (wetAt(x, y) ? 1 : 0) + (wetAt(x + 0.5, y) ? 1 : 0) + (wetAt(x - 0.5, y) ? 1 : 0) + (wetAt(x, y + 0.5) ? 1 : 0) + (wetAt(x, y - 0.5) ? 1 : 0);
interface Walk { m: number; x: number; y: number; d: number; nx: number; ny: number; nd: number }
const walks = new Map<string, Walk>();

function stepFrom(id: number, sx: number, sy: number, m: number, x: number, y: number, d0: number): [number, number, number] {
  const r = hh(id, m), current = Math.floor(hh(Math.floor(m / CURRENT_STEPS), 77) * 16), diff = ((current - d0 + 24) % 16) - 8;
  let d = d0;
  if (r < 0.4 && diff !== 0) d = (d + Math.sign(diff) + 16) % 16;
  else if (r < 0.58) d = (d + 1) % 16;
  else if (r < 0.76) d = (d + 15) % 16;
  const sp = STEP * (0.6 + 0.8 * hh(id + 7919, m)), here = openAt(x, y), turn = hh(id + 104729, m) < 0.5 ? 1 : -1;
  const far0 = (x - sx) ** 2 + (y - sy) ** 2;
  for (let i = 0; i <= 8; i++) for (const s of i === 0 ? [0] : [turn * i, -turn * i]) {
    const dd = (d + s + 16) % 16, nx = x + DIRS[dd][0] * sp, ny = y + DIRS[dd][1] * sp;
    if (!wetAt(nx, ny) || openAt(nx, ny) < Math.min(5, here)) continue;
    const far = (nx - sx) ** 2 + (ny - sy) ** 2;
    if (far > REACH * REACH && far > far0) continue;
    return [nx, ny, dd];
  }
  return [x, y, (d + 8) % 16];
}

/** Where its walk has it at a moment (null where it was not set on the town's water: then it rests as before). */
function walkAt(k: RiverKrathong, now: number): { x: number; y: number; tx: number; ty: number } | null {
  const sx = k.x!, sy = k.y!;
  if (!wetAt(sx, sy)) return null;
  // (after SETTLE_STEPS (four hours) it has found its place, and only turns slowly about it: so a week on the water, v343,
  // is never a week of steps to work out when the town opens)
  const key = `${k.id}:${k.floated}`, m0 = Math.floor(k.floated / STEP_MS), mNow = Math.min(m0 + SETTLE_STEPS, Math.max(m0, Math.floor(now / STEP_MS)));
  let w = walks.get(key);
  if (!w || w.m > mNow) {
    // its first heading: towards the most open water about it
    let best = 0, d = 0;
    for (let dd = 0; dd < 16; dd++) {
      let n = hh(k.id, dd + 900) * 0.5;
      for (let r = 1; r <= 4; r++) n += openAt(sx + DIRS[dd][0] * r, sy + DIRS[dd][1] * r);
      if (n > best) { best = n; d = dd; }
    }
    const [nx, ny, nd] = stepFrom(k.id, sx, sy, m0 + 1, sx, sy, d);
    w = { m: m0, x: sx, y: sy, d, nx, ny, nd };
    walks.set(key, w);
  }
  while (w.m < mNow) {
    const [nx, ny, nd] = stepFrom(k.id, sx, sy, w.m + 2, w.nx, w.ny, w.nd);
    w.m++; w.x = w.nx; w.y = w.ny; w.d = w.nd; w.nx = nx; w.ny = ny; w.nd = nd;
  }
  const f = Math.min(1, Math.max(0, (now - w.m * STEP_MS) / STEP_MS));
  let x = w.x + (w.nx - w.x) * f, y = w.y + (w.ny - w.y) * f;
  if (w.m >= m0 + SETTLE_STEPS) {
    // settled: a slow circle about its place, wider on open water, coming on over a minute
    const t = now - (w.m + 1) * STEP_MS, r = (openAt(w.nx, w.ny) >= 5 ? 0.28 : 0.08) * Math.min(1, Math.max(0, t / 60_000)), a = now / 40_000 + k.id;
    x += Math.cos(a) * r; y += Math.sin(a) * r;
  }
  return { x, y, tx: f < 0.5 ? w.x : w.nx, ty: f < 0.5 ? w.y : w.ny };
}
/** The water tile a set-down krathong is told by (for its depth and whether it shows): always one of its walk's steps, so never the bank. */
export function spotTile(k: RiverKrathong, now: number): Vec {
  const w = walkAt(k, now);
  return w ? { x: w.tx, y: w.ty } : { x: k.x!, y: k.y! };
}
/** Where a floated krathong is at a moment: about where its maker set it down, or (none said) down the festival's river. */
export const floatPos = (k: RiverKrathong, now: number): Vec => (k.x != null && k.y != null ? spotPos(k, now) : riverPos(k, now));

/** Where a floated krathong is on the river at a moment (tile coordinates). */
export function riverPos(k: RiverKrathong, now: number): Vec {
  const restY = W.rest[0] + h01(k.id, 1) * (W.rest[1] - W.rest[0]);
  const f = Math.min(1, Math.max(0, (now - k.floated) / (DRIFT_MS * (0.8 + 0.4 * h01(k.id, 2)))));
  const ease = 1 - (1 - f) * (1 - f);
  const y = W.startY + (restY - W.startY) * ease;
  const restX = W.mid + (h01(k.id, 3) - 0.5) * 2 * Math.max(0.2, W.half - 0.7);
  // (the city's: set down off the landing, then out to its lane; town2's: in its lane from the start)
  const x = W.startX == null ? restX : W.startX + (restX - W.startX) * ease;
  // a slow sway along its way, and at rest a little circling in the eddy
  const t = now / 1000, sway = Math.sin(t / 3.2 + k.id) * 0.18 * (1 - f) + Math.sin(t / 7 + k.id * 1.7) * 0.12 * f;
  // (at rest it wanders a little up and down the water, each to its own slow beat: the owner, 2026-11-24: "ช่วยทำให้บรรยากาศสวย เป็นที่น่าจดจำ vibe ดีมากขึ้นได้ไหม")
  const wander = Math.sin(t / 47 + k.id * 2.3) * 1.1 * f;
  return { x: Math.max(W.least, x + sway), y: y + Math.cos(t / 9 + k.id) * 0.1 * f + wander };
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
  /** A few lines of somebody's words in a bubble whose foot is at (x, y): a floated krathong's wish. */
  note?: (text: string, x: number, y: number) => void;
  /** Drawn over everything, names too: what a tap asked to read. */
  top?: (draw: () => void) => void;
  /** A light laid after the night's dark (the town's own lights: a candle shines through it). */
  light: (x: number, y: number, reach: number, rgb: string, strong?: number, flat?: number) => void;
  /** Drawn after the night's dark, its light added: a candle's reflection on the water, the fireflies over it. */
  after?: (draw: (ctx: CanvasRenderingContext2D) => void) => void;
  th: boolean;
  /** The phases open now, said short, for the stall's sign ("ทำกระทง", "โหวต · ลอยกระทง"). */
  phase?: string;
  /** Where each floated krathong was drawn, for a tap (filled by drawRiver), and the one tapped, whose name it shows. */
  hits?: Array<{ id: number; x0: number; y0: number; x1: number; y1: number }>;
  picked?: number | null;
}

/** Where the light part's flame is in the 48×50 template (the candle's wick, the jar's middle). */
export const FLAME: Record<string, [number, number]> = { l_candle: [33, 7], l_firefly: [32, 15], l_lantern: [32, 12], l_incense: [32, 7] };

/** The stall: drawn, and where it is for a tap. */
export function drawStall(d: FestivalDraw): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(STALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  let box: ReturnType<typeof drawProp> = null;
  d.push(STALL_AT.x + STALL_AT.y, () => {
    // (a prop's own `scale` is map pixels an art pixel: the camera's scale is all that is added)
    box = drawProp(d.ctx, "stall", feet.x, feet.y, d.s);
    if (box) { const b = box; d.sign(() => d.label(`${d.th ? "ซุ้มกระทง" : "Krathong stall"}${d.phase ? ` · ${d.phase}` : ""}`, (b.x0 + b.x1) / 2, b.y0 - 12 * d.s)); }
  });
  // (the tap box is the prop's size wherever it stands, known before its turn to be drawn)
  const [w, h] = propSize("stall") ?? [134, 138];
  return { x0: feet.x - (w / 2) * d.s, y0: feet.y - h * d.s, x1: feet.x + (w / 2) * d.s, y1: feet.y + 4 * d.s };
}

/**
 * What each of the hall's pedestals shows, in place order: one krathong, or the krathongs that tied for its place,
 * taking turns (2026-11-25, three tied for third and the hall had room for one of them; the owner, "แก้หอเกียรติยศให้
 * สลับโชว์เลย"). While fewer places than pedestals are left, the largest group is split, so no pedestal stands empty
 * while another takes turns (1, 1, 3 stands on three pedestals as before).
 */
export function hallPedestals(awards: AwardView[], n = 3): AwardView[][] {
  const top = awards.filter((a) => a.kind === "popular").sort((a, b) => a.place - b.place || a.entry - b.entry);
  const groups: AwardView[][] = [];
  for (const a of top) {
    const g = groups[groups.length - 1];
    if (g && g[0].place === a.place) g.push(a);
    else groups.push([a]);
  }
  groups.splice(n);
  while (groups.length < n) {
    let i = -1;
    groups.forEach((g, j) => { if (g.length > 1 && (i < 0 || g.length > groups[i].length)) i = j; });
    if (i < 0) break;
    const g = groups[i], half = Math.ceil(g.length / 2);
    groups.splice(i, 1, g.slice(0, half), g.slice(half));
  }
  return groups;
}
/** How long a krathong that shares its pedestal stands before the next one, and its fade out and in. */
const HALL_TURN_MS = 4000, HALL_FADE_MS = 320;

/** The hall: its stage, the year's top krathongs on its pedestals (tied ones taking turns), their makers' names. */
export function drawHall(d: FestivalDraw, awards: AwardView[]): { x0: number; y0: number; x1: number; y1: number } | null {
  const feet = d.project(HALL_AT);
  if (!d.onScreen(feet) || !krathongImage()) return null;
  // (a pedestal shared by a tie shows each in turn, faded out and in; the pedestals' turns staggered)
  const peds = hallPedestals(awards);
  const top = peds.map((g, i) => {
    if (g.length === 1) return { a: g[0], alpha: 1 };
    const t = d.now + i * 1300, at = t % HALL_TURN_MS;
    return { a: g[Math.floor(t / HALL_TURN_MS) % g.length], alpha: Math.max(0, Math.min(1, at / HALL_FADE_MS, (HALL_TURN_MS - at) / HALL_FADE_MS)) };
  });
  const plate = (a: AwardView) => `${a.place}. ${a.maker?.name ?? ""}`;
  const k = MAP_SCALE * d.s;
  d.push(HALL_AT.x + HALL_AT.y, () => {
    const box = drawProp(d.ctx, "hall", feet.x, feet.y, d.s);
    if (!box) return;
    const slots = hallSlots();
    // (each pedestal's lantern, lit through the night's dark, and a warm pool before the stage)
    if (d.night) {
      for (const [sx, sy] of slots) d.light(box.x0 + sx * d.s, box.y0 + (sy - 46) * d.s, 30 * d.s, "255,200,130", 0.9);
      d.light((box.x0 + box.x1) / 2, box.y1 - 12 * d.s, 90 * d.s, "255,180,110", 0.45, 0.4);
    }
    // (the first place in the middle, the next on its left and right: [left, middle, right] are the hall's pedestals)
    const order = [1, 0, 2];
    // (the left and right names sit under the stage; when the longest of each would touch at this zoom, the right one a
    // row lower, judged by the longest so a name taking its turn never makes it jump)
    const longest = (g: AwardView[] | undefined) => {
      d.ctx.save();
      d.ctx.font = "600 12px sans-serif";
      const w = Math.max(0, ...(g ?? []).map((a) => d.ctx.measureText(plate(a)).width + 14));
      d.ctx.restore();
      return w;
    };
    const gap = slots[2] && slots[0] ? (slots[2][0] - slots[0][0]) * d.s : Infinity;
    const lower = (longest(peds[1]) + longest(peds[2])) / 2 + 8 > gap ? 22 : 0;
    top.forEach(({ a, alpha }, i) => {
      const at = slots[order[i]];
      if (!at || alpha <= 0) return;
      const x = box.x0 + at[0] * d.s, y = box.y0 + at[1] * d.s, [w, h] = CANVAS;
      const kx = x - (w / 2) * k * 0.75, ky = y - h * k * 0.75, [fx, fy] = FLAME[a.krathong.design.light[0]] ?? [32, 8];
      d.ctx.save();
      d.ctx.globalAlpha *= alpha;
      drawKrathong(d.ctx, a.krathong.design, kx, ky, k * 0.75, Math.floor(d.now / 180) % 3);
      d.ctx.restore();
      if (d.night) d.light(kx + fx * k * 0.75, ky + fy * k * 0.75, 18 * d.s, "255,196,120", 0.9 * alpha);
      if (a.maker?.name) {
        const above = order[i] === 1, ly = above ? y - (h * 0.75 + 6) * k : box.y1 + 10 * d.s + (order[i] === 2 ? lower : 0);
        d.sign(() => {
          d.ctx.save();
          d.ctx.globalAlpha *= alpha;
          d.label(plate(a), x, ly);
          d.ctx.restore();
        });
      }
    });
    d.sign(() => d.label(d.th ? "กระทงดีเด่นประจำปี" : "Krathongs of the year", (box.x0 + box.x1) / 2, box.y0 - 12 * d.s));
  });
  const [hw, hh] = propSize("hall") ?? [168, 154];
  return { x0: feet.x - (hw / 2) * d.s, y0: feet.y - hh * d.s, x1: feet.x + (hw / 2) * d.s, y1: feet.y + 4 * d.s };
}

/** Every floated krathong on the river, with its candle's glow at night. */
/**
 * Rings on the water about a floated krathong, as pixels on the map's grid: two, half a beat apart, each widening from
 * its base and fading; the far half (behind it) or the near half (over its base).
 */
function ripple(ctx: CanvasRenderingContext2D, d: FestivalDraw, cx: number, cy: number, rx0: number, id: number, far: boolean) {
  const unit = Math.max(1, Math.round(d.s)), snap = (n: number) => Math.round(n / unit) * unit;
  ctx.save();
  // (by night lit by its own candle: warm)
  ctx.fillStyle = d.night ? "#ffe2b0" : "#eaf6ff";
  for (const off of [0, 0.5]) {
    const t = (d.now / 1800 + off + id * 0.37) % 1, rx = rx0 * (1 + 0.5 * t), ry = rx * 0.32;
    ctx.globalAlpha = (far ? 0.5 : 0.7) * (1 - t * 0.8) * (d.night ? 1 : 0.85);
    const steps = Math.max(12, Math.round(rx / unit) * 2);
    let last = "";
    for (let i = 0; i <= steps; i++) {
      const a = (far ? Math.PI : 0) + (i / steps) * Math.PI, x = snap(cx + Math.cos(a) * rx), y = snap(cy + Math.sin(a) * ry);
      const key = x + "," + y;
      if (key === last) continue;
      last = key;
      ctx.fillRect(x, y, unit, unit);
    }
  }
  ctx.restore();
}

/**
 * A candle's reflection on the night water (the owner, 2026-11-24: "ช่วยทำให้บรรยากาศสวย เป็นที่น่าจดจำ vibe ดีมากขึ้นได้ไหม"): a column of short warm dashes under it, each wavering on its
 * own beat and fainter the further down, broken where the water moves, as a flame's light lies on a river; on the
 * map's pixel grid.
 */
function reflection(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, now: number, id: number, strong: number, dashes = 8) {
  const u = Math.max(1, Math.round(s)), snap = (n: number) => Math.round(n / u) * u;
  for (let i = 0; i < dashes; i++) {
    const beat = now / (420 + i * 90) + id * 1.7 + i * 2.3, a = strong * (1 - i / dashes) * (0.6 + 0.4 * Math.sin(beat));
    if (a < 0.06) continue;
    const half = Math.max(1, Math.round((3.6 - i * 0.3 + Math.sin(beat * 1.3)) * u)), dy = snap(y + i * 2.4 * u), dx = snap(x + Math.sin(beat * 0.7) * 1.6 * u);
    // (orange, so that on the night's blue the light it adds is warm, not white)
    ctx.fillStyle = `rgba(255,${i < 2 ? 190 : 150},${i < 2 ? 90 : 50},${Math.min(1, a).toFixed(3)})`;
    ctx.fillRect(dx - half, dy, half * 2, u);
  }
}

/** A firefly over the night water: a soft yellow-green point that drifts and blinks, now and then near a krathong. */
function firefly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, now: number, id: number) {
  const t = now / 1000, blink = Math.max(0, Math.sin(t * 1.6 + id * 3.1)) ** 2;
  if (blink < 0.05) return;
  const u = Math.max(1, Math.round(s)), fx = Math.round((x + Math.sin(t / 2.1 + id) * 26 * s) / u) * u, fy = Math.round((y - 18 * s + Math.cos(t / 1.7 + id * 1.3) * 12 * s) / u) * u;
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7 * s);
  g.addColorStop(0, `rgba(214,255,140,${(0.5 * blink).toFixed(3)})`);
  g.addColorStop(1, "rgba(214,255,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(fx - 7 * s, fy - 7 * s, 14 * s, 14 * s);
  ctx.fillStyle = `rgba(246,255,200,${(0.9 * blink).toFixed(3)})`;
  ctx.fillRect(fx, fy, u, u);
}

export function drawRiver(d: FestivalDraw, river: RiverKrathong[]) {
  if (!river.length || !krathongImage()) return;
  const k = MAP_SCALE * d.s, [w, h] = CANVAS, frame = Math.floor(d.now / 180);
  // (where many float close together their light is shared out, so a crowd is many small flames, not one white glare)
  const placed = river.map((kr) => { const p = floatPos(kr, d.now); return { kr, p, at: d.project(p) }; }).filter((x) => d.onScreen(x.at));
  const near = (i: number) => { let n = 0; const a = placed[i].at; for (let j = 0; j < placed.length; j++) if (j !== i && Math.abs(placed[j].at.x - a.x) < 46 * d.s && Math.abs(placed[j].at.y - a.y) < 30 * d.s) n++; return n; };
  for (let i = 0; i < placed.length; i++) {
    const { kr, p, at } = placed[i], set = kr.x != null && kr.y != null;
    // (the city's water is sunk: only over its water, each at its water's place back to front, the near bank before it,
    // as Town.tsx's cityRiver; one set down by its maker is told by the tile it was set on, so it never blinks at an edge)
    const tile = set ? spotTile(kr, d.now) : p;
    if (CITY && ed.t2Tile(Math.floor(tile.x), Math.floor(tile.y)) !== "~") continue;
    const bob = Math.sin(d.now / 700 + kr.id) * 1.2 * d.s, x0 = at.x - (w / 2) * k, y0 = at.y - (h - 6) * k + bob;
    const [fx, fy] = FLAME[kr.design.light[0]] ?? [32, 8];
    // the candle shines through the night's dark, and lies on the water under it: a small flame's light, a warm pool,
    // its reflection down the water and, by some, a firefly
    if (d.night) {
      const flicker = 0.85 + 0.15 * Math.sin(d.now / 130 + kr.id * 2.1), share = 1 / Math.sqrt(1 + near(i));
      // (the town's lights are laid at a third of their strength: a candle's core, its halo and its pool told so)
      d.light(x0 + fx * k, y0 + fy * k, 5 * d.s, "255,226,160", 2.6 * flicker * Math.max(0.6, share));
      d.light(x0 + fx * k, y0 + fy * k, 17 * d.s, "255,188,110", 1.9 * flicker * share);
      d.light(at.x, at.y + 3 * d.s, 30 * d.s, "255,160,80", 1.1 * flicker * share, 0.38);
      // (the reflection only as far as the water runs on under it: never over the near bank, its wall or its lamps)
      const wet = (n: number) => !CITY || ed.t2Tile(Math.floor(tile.x + n), Math.floor(tile.y + n)) === "~";
      const dashes = !wet(0.8) ? 0 : !wet(1.6) ? 3 : 8;
      d.after?.((ctx) => {
        if (dashes) reflection(ctx, x0 + fx * k, at.y + 4 * d.s, d.s, d.now, kr.id, flicker * Math.max(0.55, share), dashes);
        if (kr.id % 3 === 0) firefly(ctx, at.x, at.y, d.s, d.now, kr.id);
      });
    }
    d.hits?.push({ id: kr.id, x0: x0 - 4 * d.s, y0: y0 - 4 * d.s, x1: x0 + w * k + 4 * d.s, y1: y0 + h * k + 4 * d.s });
    d.push(CITY ? Math.floor(tile.x) + Math.floor(tile.y) + 0.977 : p.x + p.y, () => {
      const { ctx } = d;
      // (Codex's UI review: "floating krathongs look suspended above the water": rings where its base meets the water,
      // the far half behind it, the near half over its base, so it sits in the water)
      const waterY = at.y + 3 * k + bob * 0.5;
      ripple(ctx, d, at.x, waterY, 23 * k, kr.id, true);
      // its reflection by day: a faint warm streak on the water below it (by night, laid after the dark: `reflection`)
      if (!d.night) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#ffd27a";
        ctx.fillRect(Math.round(x0 + fx * k - 1.5 * d.s), Math.round(at.y + 3 * d.s), Math.round(3 * d.s), Math.round(6 * d.s));
        ctx.restore();
      }
      drawKrathong(ctx, kr.design, x0, y0, k, frame + kr.id);
      ripple(ctx, d, at.x, waterY, 23 * k, kr.id, false);
      // (a tap says whose it is, the owner, 2026-11-24: "สามารถคลิ๊กดูได้ว่าของใคร"; mine says so the whole time)
      // (and its wish over it, for everybody: the owner, 2026-11-24: "คำอวยพร เห็นได้ทุกคน คนอื่นก็เห็น ชื่อคนทำ ชื่อกระทง เห็นหมด")
      if (d.picked === kr.id) (d.top ?? d.sign)(() => {
        d.label(`${kr.mine ? (d.th ? "ของฉัน" : "Mine") : (kr.maker ?? (d.th ? "ผู้เล่น" : "A player"))}${kr.name ? ` · ${kr.name}` : ""}`, at.x, y0 - 8 * d.s);
        if (kr.wish) d.note?.(`“${kr.wish}”`, at.x, y0 - 8 * d.s - 13);
      });
      else if (kr.mine) d.sign(() => d.label(d.th ? "กระทงของฉัน" : "Mine", at.x, y0 - 8 * d.s));
    });
  }
}
