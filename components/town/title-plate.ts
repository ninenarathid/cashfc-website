import { LINES, RANKS, type LineId } from "@/lib/town/lines";
import { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";

/**
 * The title worn under a name, as a plate that grows grander up the ladder (the owner, 2026-10-19: "อยากให้ปรับ vfx
 * ภาพตอนแสดงฉายา ที่อยู่ใต้ชื่อให้สวยกว่านี้"). Five looks:
 *
 * - ranks 1–3, a dark pill with a bronze rim; 4–6, a silver rim, a bevel and two studs;
 * - 7–8, a gold plate with cut corners, the line's own picture at its left and a spark that catches it now and then;
 * - 9, the gold plate with feathered wings, gilded words, a glow behind it, a light that runs across it and gold dust;
 * - 10, a plate in the line's own colours: pointed ends, three feathers a side, a gem on its brow, its picture in a
 *   medallion, a glow that breathes, and the line's own matter coming off it (embers from the kitchen, drops from the
 *   well, fireflies in the forest, sparks of ruby from the mountain's heart).
 *
 * The plate's body is a picture made once for its size (as the forge's are, lib/town/forge-effects); a frame adds
 * only the moving light, the words and a few square pixels. Nothing moves for whoever asks the page for less motion.
 */
type Band = 0 | 1 | 2 | 3 | 4;
export const bandOf = (rank: number): Band => (rank >= RANKS ? 4 : rank >= 9 ? 3 : rank >= 7 ? 2 : rank >= 4 ? 1 : 0);

/** How the line's matter moves off a rank-10 plate. */
type Drift = "embers" | "drops" | "petals" | "bubbles" | "fireflies" | "dust" | "pollen" | "leaves" | "shards";
interface Look { deep: string; mid: string; rim: string; light: string; ink: string; motes: string[]; drift: Drift }

const BRONZE = "#e0a66a", SILVER = "#dfe5ec", EDGE = "rgba(6,4,2,0.88)";
const GOLD: Look = { deep: "#170f06", mid: "#34230c", rim: "#e9b949", light: "#fff0b8", ink: "#f8d870", motes: ["#fff0b8"], drift: "dust" };
const RADIANT: Look = { deep: "#1b1106", mid: "#4a3310", rim: "#ffcf55", light: "#fff8dc", ink: "#ffe596", motes: ["#fff3c0", "#ffd25e"], drift: "dust" };
/** Each line's own colours at the top of its ladder. */
const LEGEND: Record<LineId, Look> = {
  kitchen: { deep: "#2a0905", mid: "#701c0c", rim: "#ff9040", light: "#ffe0a0", ink: "#ffd27a", motes: ["#ffb347", "#ff6a2b", "#ffe28a"], drift: "embers" },
  well: { deep: "#071a2b", mid: "#164c74", rim: "#7fd3ff", light: "#e6f9ff", ink: "#a8e4ff", motes: ["#9fe0ff", "#e0f7ff", "#5fb8ec"], drift: "drops" },
  helpers: { deep: "#0b2118", mid: "#1d5037", rim: "#8fe3a8", light: "#f6ffe6", ink: "#bff2c9", motes: ["#ffd1e8", "#b7f5c4", "#fff6b0"], drift: "petals" },
  fishing: { deep: "#04211f", mid: "#0c5056", rim: "#5fe0d0", light: "#d4fff8", ink: "#90f0e2", motes: ["#c9fff6", "#7feadc", "#ffffff"], drift: "bubbles" },
  forest: { deep: "#0c1d0f", mid: "#254d20", rim: "#b5e86a", light: "#f4ffd2", ink: "#d6f59a", motes: ["#e8ff7a", "#c6ff5a"], drift: "fireflies" },
  insects: { deep: "#1a0d2e", mid: "#40256e", rim: "#d79bff", light: "#f8ecff", ink: "#e6c4ff", motes: ["#8ff0ff", "#ff9ff0", "#fff3a0"], drift: "dust" },
  farming: { deep: "#211903", mid: "#544412", rim: "#ffd95a", light: "#fff8d0", ink: "#ffe58a", motes: ["#fff1a0", "#d8f07a", "#ffffff"], drift: "pollen" },
  felling: { deep: "#1f1308", mid: "#53351a", rim: "#e6a55c", light: "#ffe6c0", ink: "#f5c890", motes: ["#8fcf4a", "#5fa83a", "#e8c89a"], drift: "leaves" },
  mining: { deep: "#1e0610", mid: "#511628", rim: "#ff6f91", light: "#ffe0e8", ink: "#ffb0c4", motes: ["#ffb8cc", "#b8f2ff", "#ffffff"], drift: "shards" },
  animals: { deep: "#1f1607", mid: "#4d3a12", rim: "#f2c46b", light: "#fff4d6", ink: "#ffe2a0", motes: ["#fff6e0", "#a8e07a", "#ffd1e0"], drift: "petals" },
};

const HEIGHT: Record<Band, number> = { 0: 16, 1: 16, 2: 17, 3: 18, 4: 20 };
const WEIGHT: Record<Band, number> = { 0: 600, 1: 600, 2: 700, 3: 700, 4: 700 };
const SIZE: Record<Band, number> = { 0: 10, 1: 10, 2: 10, 3: 10.5, 4: 11.5 };
/** How far below the given middle a plate sits, to keep a taller one clear of the name over it. */
const DROP: Record<Band, number> = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 3 };
/** How far a rank-10 plate's ends come to a point. */
const TIP = 7;
/** Room kept round a body's picture for its wings and its brow. */
const PAD = 14;

/** The room the words leave at each end of a plate. */
function insets(band: Band): [number, number] {
  return band === 4 ? [TIP + 23, TIP + 9] : band >= 2 ? [19, 11] : band === 1 ? [10, 10] : [6, 6];
}

/** A number in [0, 1) from a seed and two counts, the same every frame. */
function rnd(seed: number, i: number, k: number): number {
  let h = (seed ^ Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The plate's outline, at (0, 0), `w` by `h`; a negative inset is the outline grown. */
function outline(ctx: CanvasRenderingContext2D, band: Band, w: number, h: number, inset = 0) {
  const i = inset;
  ctx.beginPath();
  if (band === 4) {
    ctx.moveTo(TIP + i * .5, i); ctx.lineTo(w - TIP - i * .5, i); ctx.lineTo(w - i, h / 2); ctx.lineTo(w - TIP - i * .5, h - i);
    ctx.lineTo(TIP + i * .5, h - i); ctx.lineTo(i, h / 2); ctx.closePath();
  } else if (band >= 2) {
    const c = 3;
    ctx.moveTo(c + i, i); ctx.lineTo(w - c - i, i); ctx.lineTo(w - i, c + i); ctx.lineTo(w - i, h - c - i); ctx.lineTo(w - c - i, h - i);
    ctx.lineTo(c + i, h - i); ctx.lineTo(i, h - c - i); ctx.lineTo(i, c + i); ctx.closePath();
  } else ctx.roundRect(i, i, w - i * 2, h - i * 2, Math.max(0, h / 2 - i));
}

/**
 * Feathered wings at both ends of a plate, in square pixels: each feather sweeps out and up from the plate's end, the
 * upper ones longest, lit along their upper edge and outlined dark so they read on grass and on stone.
 */
function feathers(ctx: CanvasRenderingContext2D, w: number, h: number, look: Look, end: number, n: number) {
  const mid = Math.round(h / 2), steps: Array<[number, number, number]> = [];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? end + 1 : w - end - 1;
    for (let f = 0; f < n; f++) {
      const len = 12 - f * 3, y0 = mid - 4 + f * 3;
      for (let s = 0; s < len; s += 2) steps.push([side < 0 ? x0 - s - 2 : x0 + s, y0 - Math.floor(s / 3), s >= len - 2 ? 1 : 2]);
    }
  }
  ctx.fillStyle = EDGE;
  for (const [x, y, t] of steps) ctx.fillRect(x - 1, y - 1, 4, t + 2);
  for (const [x, y, t] of steps) {
    ctx.fillStyle = look.rim; ctx.fillRect(x, y, 2, t);
    ctx.fillStyle = look.light; ctx.fillRect(x, y, 2, 1);
  }
}

/** A cut gem, five pixels across, its middle at (x, y). */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, look: Look) {
  ctx.fillStyle = EDGE; ctx.fillRect(x - 2, y - 3, 4, 6); ctx.fillRect(x - 3, y - 2, 6, 4);
  ctx.fillStyle = look.rim; ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillRect(x - 2, y - 1, 4, 2);
  ctx.fillStyle = look.light; ctx.fillRect(x - 1, y - 1, 1, 1);
}

const bodies = new Map<string, HTMLCanvasElement>();
/** The still part of a plate, made once for its size and kept. */
function body(band: Band, line: LineId, w: number, h: number, k: number): HTMLCanvasElement {
  const key = `${band}|${band === 4 ? line : ""}|${w}|${k}`, kept = bodies.get(key);
  if (kept) return kept;
  if (bodies.size > 160) bodies.clear();
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((w + PAD * 2) * k); canvas.height = Math.ceil((h + PAD * 2) * k);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(k, k); ctx.translate(PAD, PAD);
  if (band <= 1) {
    ctx.fillStyle = band === 0 ? "rgba(15,19,25,0.76)" : "rgba(16,21,29,0.86)";
    outline(ctx, band, w, h); ctx.fill();
    ctx.strokeStyle = band === 0 ? "rgba(224,166,106,0.42)" : "rgba(196,206,218,0.8)"; ctx.lineWidth = 1;
    outline(ctx, band, w, h, .5); ctx.stroke();
    if (band === 1) {
      ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(h / 2, 1.5, w - h, 1);
      ctx.fillStyle = SILVER; ctx.fillRect(3, h / 2 - 1, 2, 2); ctx.fillRect(w - 5, h / 2 - 1, 2, 2);
    }
  } else {
    const look = band === 4 ? LEGEND[line] : band === 3 ? RADIANT : GOLD;
    if (band >= 3) feathers(ctx, w, h, look, band === 4 ? 1 : 0, band === 4 ? 3 : 2);
    // a dark edge round it all, so that it reads on bright grass as on dark stone
    ctx.fillStyle = EDGE; outline(ctx, band, w, h, -1); ctx.fill();
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, look.mid); fill.addColorStop(.6, look.deep); fill.addColorStop(1, look.deep);
    ctx.fillStyle = fill; outline(ctx, band, w, h); ctx.fill();
    // the rim, a dark line inside it, a second fine rim on the top ranks, and light along the upper edge
    ctx.lineWidth = 1;
    ctx.strokeStyle = look.rim; outline(ctx, band, w, h, .5); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; outline(ctx, band, w, h, 1.5); ctx.stroke();
    if (band >= 3) { ctx.globalAlpha = .35; ctx.strokeStyle = look.light; outline(ctx, band, w, h, 2.5); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = look.light; ctx.globalAlpha = .6;
    ctx.fillRect(band === 4 ? TIP + 1 : 4, 1, w - (band === 4 ? TIP * 2 + 2 : 8), 1);
    ctx.globalAlpha = 1;
    gem(ctx, w - (band === 4 ? TIP + 4 : 6), Math.round(h / 2), look);
    if (band === 4) {
      // a gem on its brow, and the medallion for the line's picture
      gem(ctx, Math.round(w / 2), 0, look);
      const cx = TIP + 8.5, r = h / 2 + 2;
      ctx.fillStyle = EDGE; ctx.beginPath(); ctx.arc(cx, h / 2, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = look.deep; ctx.beginPath(); ctx.arc(cx, h / 2, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = look.rim; ctx.beginPath(); ctx.arc(cx, h / 2, r - .5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = look.light; ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(cx, h / 2, r - 1.5, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  bodies.set(key, canvas);
  return canvas;
}

const glows = new Map<string, HTMLCanvasElement>();
/** A soft glow, flattened to lie behind a plate. */
function glow(color: string): HTMLCanvasElement {
  const kept = glows.get(color);
  if (kept) return kept;
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d")!, g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, `${color}dd`); g.addColorStop(.4, `${color}66`); g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  glows.set(color, canvas);
  return canvas;
}
let sheen: HTMLCanvasElement | null = null;
/** The light that runs across a plate: a slanted band, bright in its middle. */
function sheenPicture(): HTMLCanvasElement {
  if (sheen) return sheen;
  sheen = document.createElement("canvas"); sheen.width = 32; sheen.height = 4;
  const ctx = sheen.getContext("2d")!, g = ctx.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 4);
  return sheen;
}

/**
 * The line's picture, about `size` (a fifth larger at most), taken down only by a whole share on the screen's own pixels (each of its
 * pixels one of the screen's, or every two by two made one) and set on the screen's grid: a pixel picture taken down
 * by a share that is not whole loses pixels and smears.
 */
function emblem(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, name: IconName, cx: number, cy: number, size: number) {
  if (!img?.complete || !img.naturalWidth || !ICON_ATLAS.icons[name]) return;
  const [x, y, w, h] = ICON_ATLAS.icons[name], k = ctx.getTransform().a || 1;
  const most = Math.max(w, h), want = size * k;
  let n = Math.max(1, Math.round(most / want));
  if (most / n > want * 1.2) n++;
  const dw = Math.round(w / n), dh = Math.round(h / n);
  ctx.save(); ctx.imageSmoothingEnabled = n > 1; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h, Math.round(cx * k - dw / 2) / k, Math.round(cy * k - dh / 2) / k, dw / k, dh / k);
  ctx.restore();
}

const SPARKS: IconName[] = ["fxSpark1", "fxSpark2", "fxSpark3", "fxSpark4"];

export interface PlateAt {
  text: string; line: LineId; rank: number;
  /** Where its middle goes, on the screen. */
  x: number; y: number;
  /** `now` in milliseconds; `seed` steady for whoever wears it (components/town/held's `seedOf`). */
  now: number; seed: number; img: HTMLImageElement | null; font: string; reduced: boolean;
}

/** How wide and high a plate is for these words, before its wings and what comes off it. */
export function plateSize(ctx: CanvasRenderingContext2D, text: string, rank: number, font: string): { w: number; h: number } {
  const band = bandOf(rank), [l, r] = insets(band);
  ctx.font = `${WEIGHT[band]} ${SIZE[band]}px ${font}`;
  return { w: Math.ceil(ctx.measureText(text).width) + l + r, h: HEIGHT[band] };
}

/** One title plate, drawn into a canvas already scaled to CSS pixels. */
export function drawTitlePlate(ctx: CanvasRenderingContext2D, at: PlateAt) {
  const band = bandOf(at.rank), { w, h } = plateSize(ctx, at.text, at.rank, at.font);
  const k = Math.max(1, Math.round(ctx.getTransform().a * 100) / 100);
  const left = Math.round(at.x - w / 2), top = Math.round(at.y - h / 2) + DROP[band], mid = top + h / 2;
  const base = ctx.globalAlpha, look = band === 4 ? LEGEND[at.line] : band === 3 ? RADIANT : GOLD;
  const still = at.reduced, t = at.now + ((at.seed >>> 0) % 9973);
  ctx.save();
  // the glow behind, breathing on a rank-10 plate
  if (band >= 3) {
    ctx.globalAlpha = base * (band === 4 ? (still ? .5 : .42 + .14 * Math.sin(t / 820)) : .34);
    ctx.drawImage(glow(look.rim), left - 22, mid - h * 1.4, w + 44, h * 2.8);
  }
  ctx.globalAlpha = base;
  ctx.drawImage(body(band, at.line, w, h, k), left - PAD, top - PAD, w + PAD * 2, h + PAD * 2);
  // the light across the plate, once every few seconds
  if (band >= 3 && !still) {
    const every = band === 4 ? 3400 : 4800, run = 900, u = (t % every) / run;
    if (u < 1) {
      ctx.save(); ctx.translate(left, top); outline(ctx, band, w, h, 1); ctx.clip();
      ctx.globalAlpha = base * (band === 4 ? .55 : .45); ctx.transform(1, 0, -.55, 1, 0, 0);
      ctx.drawImage(sheenPicture(), -24 + (w + 48) * u, 0, 18, h);
      ctx.restore();
    }
  }
  // the line's picture
  if (band >= 2) {
    const icon = LINES[at.line].icon as IconName;
    ctx.globalAlpha = base;
    emblem(ctx, at.img, icon, band === 4 ? left + TIP + 8.5 : left + 10, mid, band === 4 ? 17 : 13);
  }
  // the words: gilded and edged dark on the top two ranks, so that they read on any plate's colour
  ctx.font = `${WEIGHT[band]} ${SIZE[band]}px ${at.font}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const [l, r] = insets(band), tx = left + l + (w - l - r) / 2, ty = mid + .5;
  if (band === 2) { ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillText(at.text, tx, ty + 1); }
  if (band >= 3) {
    ctx.lineJoin = "round"; ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(8,5,3,0.9)"; ctx.strokeText(at.text, tx, ty + .5);
    const gild = ctx.createLinearGradient(0, top + 4, 0, top + h - 4);
    gild.addColorStop(0, band === 4 ? "#ffffff" : look.light); gild.addColorStop(1, look.ink);
    ctx.fillStyle = gild;
  } else ctx.fillStyle = band === 0 ? BRONZE : band === 1 ? SILVER : look.ink;
  ctx.fillText(at.text, tx, ty);
  if (!still && band >= 2) {
    // a spark that catches a corner now and then
    const every = band === 2 ? 4600 : 3200, u = t % every;
    if (u < 520) {
      const turn = Math.floor(t / every), right = (turn + (at.seed & 1)) % 2 === 0;
      ctx.globalAlpha = base;
      drawIcon(ctx, at.img, SPARKS[Math.min(3, Math.floor(u / 130))], right ? left + w - 4 : left + (band === 4 ? TIP + 17 : 17), top + 1, band === 4 ? 12 : 10);
    }
    if (band >= 3) motes(ctx, look, left, top, w, h, t, at.seed, base, band === 4 ? 6 : 2);
  }
  ctx.restore();
}

/** What comes off a plate of the top two ranks: square pixels of the line's own matter (gold dust on the ninth). */
function motes(ctx: CanvasRenderingContext2D, look: Look, left: number, top: number, w: number, h: number, t: number, seed: number, base: number, n: number) {
  const span = Math.max(8, w - 24), from = left + 12;
  for (let i = 0; i < n; i++) {
    const life = 1600 + (i % 3) * 420, q = t + i * 571, turn = Math.floor(q / life), u = (q % life) / life;
    const r0 = rnd(seed, i, turn), r1 = rnd(seed, i + 7, turn), color = look.motes[(i + turn) % look.motes.length];
    let x = from + r0 * span, y = top, size = 2, alpha = Math.sin(u * Math.PI), high = 0;
    switch (look.drift) {
      case "embers": y = top + 1 - u * 20; x += Math.sin(u * 7 + i) * 2; size = r1 > .4 ? 2 : 1; alpha *= (Math.floor(q / 80) + i) % 3 ? 1 : .5; break;
      case "drops": y = top + h - 1 + u * u * 14; alpha = 1 - u * u; size = 1; high = 3; break;
      case "petals": y = top - u * 17; x += Math.sin(u * 5 + i * 2) * 4; break;
      case "bubbles": y = top + 1 - u * 19; x += Math.sin(u * 9 + i) * 1.5; size = r1 > .5 ? 2 : 1; break;
      case "fireflies": x = left + r0 * w; y = top - 4 - r1 * 9 + Math.sin(u * 4 + i) * 2; alpha = Math.max(0, Math.sin(u * Math.PI * 3)); break;
      case "dust": y = top - u * 16; x += Math.sin(u * 6 + i) * 2.5; size = r1 > .5 ? 2 : 1; break;
      case "pollen": y = top - u * 15; x += Math.sin(u * 4 + i) * 3; size = r1 > .4 ? 2 : 1; break;
      case "leaves": y = top + h - 1 + u * 13; x += Math.sin(u * 6 + i) * 4; alpha = 1 - u; high = r1 > .5 ? 2 : 1; break;
      case "shards": x = left + 6 + r0 * (w - 12); y = top - 3 - r1 * 9; break;
    }
    const a = base * Math.max(0, Math.min(1, alpha)), px = Math.round(x), py = Math.round(y);
    ctx.fillStyle = color;
    if (look.drift === "shards" && alpha > .5) {
      ctx.globalAlpha = a; ctx.fillRect(px - 2, py, 5, 1); ctx.fillRect(px, py - 2, 1, 5);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(px, py, 1, 1);
    } else if (look.drift === "fireflies" || look.drift === "embers") {
      // a small halo round each, so that it glows rather than sits on the screen
      ctx.globalAlpha = a * .3; ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
      ctx.globalAlpha = a; ctx.fillRect(px, py, size, size);
    } else { ctx.globalAlpha = a; ctx.fillRect(px, py, size, high || size); }
  }
}
