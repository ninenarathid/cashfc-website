import art from "@/lib/town/held-art.json";
import { ITEMS } from "@/lib/town/items";
import { GEMS, gemShow, type Element, type ToolLook } from "@/lib/town/tools";
import type { Vec } from "@/lib/town/world";

/**
 * A tool in the hand, in proportion to whoever holds it, and what its gems show about it (the owner, 2026-10-08:
 * "ช่วยปรับอุปกรณ์ที่ถือไว้บนมือ ให้ขนาดสมส่วนกับตัวละครได้ไหม (แบบเบ็ดตกปลา) ถ้ามีการใส่อัญมณีช่วยทำให้มี effect ธาตุนั้นออกมา
 * ยิ่งใส่หลายอัญมณี ยิ่ง effect เยอะ ใส่ซ้ำกันคือยิ่งอลังการ ใส่หลายธาตุคือ effect ผสมธาตุกัน").
 *
 * **A long tool** (a pick, an axe, a hoe, an insect net, a sickle, shears) is its own upright picture: its handle in
 * the fist, its head at the top, so much of the doll's own standing height, so a small race holds a smaller tool
 * than a tall one. **A hand tool** (a watering can, a bucket, cookware) is its bag picture at a size a hand of that
 * doll carries, at the fist or hung from it. Everything else held is the picture it always was (components/town/Town).
 *
 * **A gem shows as its element about the tool's head, on every page**, from what the room is told of the tool
 * (lib/town/tools' `readToolWord`): a soft light in the gem's colour, small pieces of the element on their way
 * (embers up, drops down, frost, grit, sparks, swirls, motes, wisps), more of them the more gems the tool carries;
 * **the same element twice or more a flourish of its own** (a crown of flame, a ring of water, a ring of frost,
 * stones going round, a bolt to the ground, a whirlwind, a halo, a dark orb), grander at three; **several elements
 * each in its share**, their lights side by side, and where two of a few pairs meet something of the two together
 * (steam, mist, a crackle, a dim halo). How it LOOKS only: what an element does is its game's.
 *
 * **A tool forged far has a light of its own** (the owner, 2026-10-09: "+7 กับ +10 ตอนนี้แสงยังไม่อลังการเท่าไหร่ เนื่องจาก
 * มันตีขึ้นยากมาก เราควรจะให้แสงมันดีกว่านี้"): from +7 a breathing halo behind its head, a rim of light along its own
 * outline, a glint that runs up it every few seconds and a few motes going up; at the top all of that stronger, and
 * rays slowly turning about the head, motes going round it, a pool of light on the ground under its holder, a ring
 * that goes out from the head every few seconds, and sparks left behind on a walk. A warm white-gold with no gem;
 * with gems their colours together. It is soft light, added to what is there, under the gems' own pieces, which are
 * hard pixels: the level and the element are two layers. A look only.
 *
 * What it costs: every piece is a small picture of one sheet (the fc-cash-town skill's scripts/pixel/build-held.mjs)
 * laid with `drawImage`, the light a picture made once for each colour; no path, no gradient and nothing kept from
 * frame to frame: where a piece is follows from the clock and its holder's id. So many pieces a doll and so many a
 * screen at the most (`CAP`, and `LEVEL_CAP` for the level's light); past that a tool has no more of them. With the
 * town's motion switched off: the lights, still (and a forged tool's rim).
 */
type Cell = [number, number, number, number];
export const HELD_ART = art as unknown as {
  image: string; size: [number, number];
  /** A long tool's picture: where it is, where its handle stands (from its left) and where its head is, in its own pixels. */
  tools: Record<string, [number, number, number, number, number, number, number]>;
  /** The same tools drawn finer, for where the first would be blown up (a tall doll's hand, a close zoom). */
  fine?: Record<string, [number, number, number, number, number, number, number]>;
  /** An element's six pictures: three small pieces, its flourish twice, its grandest. `mix`: a puff, a wisp of mist, a blue spark; steam, a bank of mist, a dim halo. */
  fx: Record<Element | "mix", Cell[]>;
};

let picture: HTMLImageElement | null = null;
/** The sheet, once it has come (asked for the first time this is called: the town asks as it opens). Null until then, and where there is no window. */
export function heldPicture(): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  if (!picture) { picture = new Image(); picture.src = HELD_ART.image; }
  return picture.complete && picture.naturalWidth ? picture : null;
}

/* ── tools, by the doll's size ──────────────────────────────────────────── */

/**
 * The long tools: how tall each stands against the doll that holds it (a share of the doll's standing height), and
 * how far down its picture the fist has it (a share of the picture's height, from the top). A sickle and shears are
 * short things, held by their grips.
 */
const LONG: Record<string, { tall: number; grip: number }> = {
  pick: { tall: 0.74, grip: 0.74 }, axe: { tall: 0.74, grip: 0.74 },
  hoe: { tall: 0.78, grip: 0.72 }, hoeIron: { tall: 0.78, grip: 0.72 }, hoeSteel: { tall: 0.78, grip: 0.72 },
  bugNet: { tall: 0.84, grip: 0.74 }, sickle: { tall: 0.44, grip: 0.84 }, shears: { tall: 0.44, grip: 0.84 },
};
/** How far a long tool leans out from upright, away from its holder (so much sideways for each pixel up). */
const LEAN = 0.1;
export const isLongTool = (item: string): boolean => item in LONG && item in HELD_ART.tools;
/**
 * Which of a long tool's two pictures a doll so tall holds: the finer one where a pixel of the first would cover
 * more than a screen pixel and a half (a tall race's hand, a Lalafell seen close), so that a tool's pixels are near
 * its holder's own; the first one otherwise (the finer made smaller would lose its outline).
 */
function longCell(item: string, tall: number, dpr: number) {
  const first = HELD_ART.tools[item], rule = LONG[item], fine = HELD_ART.fine?.[item];
  return first && rule && fine && ((rule.tall * tall) / first[3]) * dpr > 1.5 ? fine : first;
}
/** Where a long tool's head is on the screen, held in a fist there by a doll so tall on the side faced: without drawing it. Null for what is no long tool. */
export function longHead(item: string, fist: Vec, tall: number, side: 1 | -1, dpr = 1): Vec | null {
  const cell = longCell(item, tall, dpr), rule = LONG[item];
  if (!cell || !rule) return null;
  const [, , , h, gx, hx, hy] = cell, k = (rule.tall * tall) / h, grip = rule.grip * h;
  return { x: fist.x + side * (hx - gx + LEAN * (grip - hy)) * k, y: fist.y + (hy - grip) * k };
}

/**
 * A long tool in a fist: its picture upright, mirrored by the side faced, its handle through the fist. `tall` is the
 * doll's standing height on the screen. Hard pixels while a picture pixel covers a screen pixel, as the dolls are.
 * Gives back where its head is on the screen, or null if its picture has not come yet (nothing is drawn then).
 * `under` is called with that place just before the picture is laid, for what belongs behind the tool's head.
 */
export function drawLongTool(ctx: CanvasRenderingContext2D, item: string, fist: Vec, tall: number, side: 1 | -1, dpr: number, under?: (head: Vec) => void, rim?: Rim): Vec | null {
  const img = heldPicture(), cell = longCell(item, tall, dpr), rule = LONG[item];
  if (!img || !cell || !rule) return null;
  const [sx, sy, w, h, gx] = cell, k = (rule.tall * tall) / h, grip = rule.grip * h;
  const head = longHead(item, fist, tall, side, dpr)!;
  // (what lies behind its head is laid first: the light of its gems, a ring about it)
  under?.(head);
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = k * dpr < 1;
  ctx.translate(Math.round(fist.x * dpr) / dpr, Math.round(fist.y * dpr) / dpr);
  // (sheared, not turned: every row of its pixels stays a row, a little further out the higher it is)
  ctx.transform(side * k, 0, -side * LEAN * k, k, 0, 0);
  // (a tool forged far: its own outline in light, under it)
  if (rim) {
    const [f, t] = rimSize(rim, k * dpr), was = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = was * rim.alpha;
    ctx.drawImage(rimOf(img, cell, rim.hex, t, f), -gx - t / f, -grip - t / f, w + (t * 2) / f, h + (t * 2) / f);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = was;
  }
  ctx.drawImage(img, sx, sy, w, h, -gx, -grip, w, h);
  ctx.restore();
  return head;
}

/**
 * A hand tool: how large its bag picture is against the doll that holds it (the longer side, a share of the doll's
 * standing height), how far under the fist it hangs (a share of that size: 0 is as every held thing sits, a little
 * over the fist), and whether its picture is turned round so that its handle is the fist's. Any other tool: `HAND`.
 */
interface Hand { size: number; hang: number; turn?: boolean }
const HAND: Hand = { size: 0.3, hang: 0 };
const HANDS: Record<string, Hand> = {
  can: { size: 0.32, hang: 0.3 }, canCopper: { size: 0.34, hang: 0.3 }, canBrass: { size: 0.34, hang: 0.3 },
  bucket: { size: 0.3, hang: 0.72 }, bucketIron: { size: 0.32, hang: 0.72 }, krabung: { size: 0.36, hang: 0.72 },
  pot: { size: 0.3, hang: 0.5 }, potBrass: { size: 0.34, hang: 0.5 }, potFull: { size: 0.34, hang: 0.5 }, jar: { size: 0.34, hang: 0.5 },
  pan: { size: 0.36, hang: 0, turn: true }, panBrass: { size: 0.38, hang: 0 },
  grill: { size: 0.32, hang: 0.5 }, stoveBig: { size: 0.38, hang: 0.5 }, oven: { size: 0.4, hang: 0.5 },
  wok: { size: 0.42, hang: 0.4 }, hotpot: { size: 0.36, hang: 0.5 }, steamer: { size: 0.34, hang: 0.5 }, steamerBamboo: { size: 0.34, hang: 0.5 }, tok: { size: 0.4, hang: 0.4 },
  mortar: { size: 0.3, hang: 0.5 }, stoneBowl: { size: 0.26, hang: 0.4 }, bowl: { size: 0.22, hang: 0.2 },
  hookScale: { size: 0.2, hang: 0 }, hookSteel: { size: 0.2, hang: 0 }, hookTwin: { size: 0.2, hang: 0 },
  floatGlow: { size: 0.22, hang: 0 }, floatFeather: { size: 0.22, hang: 0 }, floatQuill: { size: 0.22, hang: 0 }, floatBell: { size: 0.22, hang: 0 },
};
/** How a held thing that is a tool is carried, or null for what is no tool (a fish, a crop, a dish, a scroll: drawn as ever). */
export function handOf(item: string): Hand | null {
  if ((ITEMS as Record<string, { kind: string } | undefined>)[item]?.kind !== "tool") return null;
  return HANDS[item] ?? HAND;
}
/**
 * How large a hand tool is on the screen for a doll so tall (`tall` on the screen, at the map's `zoom`). A Lalafell's
 * is what every held thing always was; a taller doll's is larger, by three quarters of what it stands taller: the
 * tall races have long legs and small hands for their height, and a can as wide as its holder's chest is no hand tool.
 */
const SMALL = 52;
export const handSize = (hand: Hand, tall: number, zoom: number): number => Math.max(8, Math.round(hand.size * (SMALL + (tall / zoom - SMALL) * 0.75) * zoom));

/* ── the light of a tool forged far ─────────────────────────────────────── */

/** The rim of light a forged tool's own picture is laid on: its colour, whether the tool is at the top, and how strong. */
export interface Rim { hex: string; top: boolean; alpha: number }
/** The colour of a forged tool's light with no gem in it: a warm white-gold of its own. */
const LEVEL_PLAIN = "#ffd272";
const HUES = new Map<string, string>();
/** The colour of a forged tool's light: its own white-gold with no gem; with gems their colours together, each gem its share, lifted a little towards white. */
export function levelHue(look: ToolLook): string {
  if (!look.gems.length) return LEVEL_PLAIN;
  const key = look.gems.join(" ");
  let hex = HUES.get(key);
  if (!hex) {
    let r = 0, g = 0, b = 0;
    for (const e of look.gems) { const n = parseInt(GEMS[e].hue.slice(1), 16); r += (n >> 16) & 255; g += (n >> 8) & 255; b += n & 255; }
    const lift = (v: number) => Math.round((v / look.gems.length) * 0.82 + 255 * 0.18).toString(16).padStart(2, "0");
    hex = `#${lift(r)}${lift(g)}${lift(b)}`;
    HUES.set(key, hex);
  }
  return hex;
}
const rgbOf = (hex: string): string => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };

/** Pictures made once and laid ever after: the rays, the ring and a mote of each colour, and each tool's rim. (Emptied when there are very many: they are made again in a moment.) */
const MADE = new Map<string, HTMLCanvasElement>();
function made(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let canvas = MADE.get(key);
  if (canvas) return canvas;
  if (MADE.size > 160) MADE.clear();
  canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext("2d");
  if (c) paint(c);
  MADE.set(key, canvas);
  return canvas;
}
/** Rays about a middle: twelve, long and short in turn, white at the middle and the colour along them, fading to nothing. */
function raysPicture(hex: string): HTMLCanvasElement {
  const R = 64, rgb = rgbOf(hex);
  return made(`rays|${hex}`, R * 2, R * 2, (c) => {
    const g = c.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.3, `rgba(${rgb},0.7)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6, far = R * (i % 2 ? 0.6 : 1), wide = i % 2 ? 2.2 : 3.4, cos = Math.cos(a), sin = Math.sin(a);
      c.beginPath();
      c.moveTo(R - sin * wide, R + cos * wide);
      c.lineTo(R + cos * far, R + sin * far);
      c.lineTo(R + sin * wide, R - cos * wide);
      c.closePath();
      c.fill();
    }
  });
}
/** A soft ring of a colour: nothing in its middle, bright near its rim. */
function ringPicture(hex: string): HTMLCanvasElement {
  const R = 48, rgb = rgbOf(hex);
  return made(`ring|${hex}`, R * 2, R * 2, (c) => {
    const g = c.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(0.62, `rgba(${rgb},0)`);
    g.addColorStop(0.8, `rgba(${rgb},0.8)`);
    g.addColorStop(0.88, "rgba(255,255,255,0.85)");
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, R * 2, R * 2);
  });
}
/** A mote: a small four-pointed light in hard pixels, white at its middle, the colour along its arms. */
function motePicture(hex: string): HTMLCanvasElement {
  const rgb = rgbOf(hex);
  return made(`mote|${hex}`, 7, 7, (c) => {
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(${rgb},${i === 0 || i === 6 ? 0.45 : i === 1 || i === 5 ? 0.8 : 1})`;
      c.fillRect(i, 3, 1, 1);
      c.fillRect(3, i, 1, 1);
    }
    c.fillStyle = `rgba(${rgb},0.6)`;
    for (const [x, y] of [[2, 2], [4, 2], [2, 4], [4, 4]]) c.fillRect(x, y, 1, 1);
    c.fillStyle = "#ffffff";
    c.fillRect(3, 3, 1, 1);
    c.fillRect(2, 3, 3, 1);
    c.fillRect(3, 2, 1, 3);
  });
}
/**
 * A picture's rim: its own outline in one colour, to lay under the picture itself with added light. Of any picture
 * of a sheet (a long tool's, a bag picture). The picture is taken `f` times as large and its outline is `t` of
 * those finer pixels wide, so that a rim is about as wide on the screen whatever the picture's own pixels come to
 * there (a tall doll's tool has large ones). Made once for each picture, colour and size.
 */
export function rimOf(img: HTMLImageElement, cell: readonly number[], hex: string, t: number, f: number): HTMLCanvasElement {
  const [sx, sy, w, h] = cell;
  return made(`rim|${img.src}|${sx},${sy}|${hex}|${t}|${f}`, w * f + t * 2, h * f + t * 2, (c) => {
    c.imageSmoothingEnabled = false;
    for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) if ((dx || dy) && dx * dx + dy * dy <= t * t + 1) c.drawImage(img, sx, sy, w, h, t + dx, t + dy, w * f, h * f);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = hex;
    c.fillRect(0, 0, w * f + t * 2, h * f + t * 2);
  });
}
/** How fine a rim is made and how wide, for a picture whose pixel covers so many of the screen's own: about a pixel and a half of the screen from +7, two and a half at the top. */
function rimSize(rim: Rim, k: number): [f: number, t: number] {
  const f = Math.max(1, Math.min(6, Math.round(k)));
  return [f, Math.max(1, Math.min(5, Math.round(((rim.top ? 2.6 : 1.6) * f) / Math.max(0.5, k))))];
}
/** A bag picture's rim laid under it: the picture's middle at (cx, cy), its longer side `size` on the screen (as components/town/TownIcon's drawIcon lays it). */
export function drawIconRim(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cell: readonly number[] | undefined, cx: number, cy: number, size: number, rim: Rim, dpr: number) {
  if (!img?.complete || !img.naturalWidth || !cell) return;
  const [, , w, h] = cell, k = size / Math.max(w, h), [f, t] = rimSize(rim, k * dpr), was = ctx.globalAlpha;
  ctx.save();
  ctx.imageSmoothingEnabled = k * dpr < 1;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = was * rim.alpha;
  ctx.drawImage(rimOf(img, cell, rim.hex, t, f), cx - (w / 2 + t / f) * k, cy - (h / 2 + t / f) * k, (w + (t * 2) / f) * k, (h + (t * 2) / f) * k);
  ctx.restore();
}

/** The most pieces of the level's light laid for one doll, and for every other doll of a screen in one frame (past that a tool keeps its halo and its rim). */
export const LEVEL_CAP = { doll: 20, screen: 240 };
let levelFrame = -1, levelLeft = LEVEL_CAP.screen;
/** Where a forged tool's light is laid: the tool's head, the way a glint runs along it, its holder's feet, and how its holder walks on the screen (pixels a second) if they walk. */
export interface LevelAt {
  head: Vec; from: Vec; to: Vec; feet: Vec; tall: number; zoom: number; dpr: number; now: number; seed: number; still: boolean; mine: boolean; vel: Vec | null;
  /** Laid after the tool and not before its holder (a rod, whose tip is known only once it is drawn): fainter at its heart, so that the tool is seen through it. */
  late?: boolean;
}
/** How strong a forged tool's rim is this moment: breathing a little at the top. */
export const rimFor = (look: ToolLook, now: number, seed: number, still: boolean): Rim => ({
  hex: levelHue(look), top: look.glow === 2, alpha: look.glow === 2 ? (still ? 0.95 : 0.85 + 0.15 * Math.sin(now / 420 + (seed & 31))) : 0.75,
});
/**
 * The light of a tool forged far (see the top of this file), in two goes: `back`, before its holder's body is drawn,
 * so that nothing of it lies over a face (the pool on the ground, the halo, the rays, the ring, the motes at the
 * back of their round); and `over`, after the tool's picture (the glint, the motes, the sparks of a walk). The rim
 * is the tool's own to lay (`drawLongTool`, `drawIconRim`). Nothing, of a tool under +7.
 */
export function drawLevel(ctx: CanvasRenderingContext2D, look: ToolLook | null, layer: "back" | "over", o: LevelAt) {
  if (!look || !look.glow) return;
  const top = look.glow === 2, hex = levelHue(look);
  if (o.now !== levelFrame) { levelFrame = o.now; levelLeft = LEVEL_CAP.screen; }
  // a map pixel on the screen, by the doll's size; and a mote's pixel, a whole number of the screen's own
  const u = Math.max(0.72, Math.min(1.3, o.tall / o.zoom / 70)) * o.zoom, q = Math.max(1, Math.round(u * o.dpr * 0.8)) / o.dpr;
  const base = ctx.globalAlpha, t = o.now / 1000, ph = (o.seed & 255) / 40, snap = (v: number) => Math.round(v * o.dpr) / o.dpr;
  let laid = 0;
  const room = () => laid < LEVEL_CAP.doll && (o.mine || levelLeft > 0);
  const spend = () => { laid++; if (!o.mine) levelLeft--; };
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "lighter";
  const soft = (pic: HTMLCanvasElement, x: number, y: number, r: number, alpha: number, flat = 1) => {
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = base * Math.min(1, alpha);
    ctx.drawImage(pic, x - r, y - r * flat, r * 2, r * 2 * flat);
    spend();
  };
  const mote = (x: number, y: number, alpha: number, m = 1) => {
    if (alpha <= 0.03 || !room()) return;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = base * Math.min(1, alpha);
    ctx.drawImage(motePicture(hex), snap(x - 3.5 * q * m), snap(y - 3.5 * q * m), 7 * q * m, 7 * q * m);
    spend();
  };
  /** The motes going round the head at the top: six, each twinkling; those at the back of their round in the first go. */
  const round = (front: boolean) => {
    for (let i = 0; i < 6; i++) {
      const a = (t / 3.2 + i / 6) * Math.PI * 2 + ph;
      if (Math.sin(a) > 0 === front) mote(o.head.x + Math.cos(a) * 14 * u, o.head.y + Math.sin(a) * 6 * u, 0.65 + 0.35 * Math.sin(t * 5 + i * 2.1));
    }
  };
  if (layer === "back") {
    // the pool on the ground under its holder, the halo behind its head (always: also past the caps)
    if (top) soft(lightPicture(hex), o.feet.x, o.feet.y, o.tall * 0.52, 0.36, 0.36);
    const breath = o.still ? 1 : 1 + 0.08 * Math.sin(t * 2.6 + ph), faint = o.late ? 0.5 : 1;
    soft(lightPicture(hex), o.head.x, o.head.y, (top ? 24 : 16) * u * breath, (top ? 0.62 : 0.7) * faint);
    // (and a small bright heart to it, which is what is seen of it by day on pale ground)
    soft(lightPicture(hex), o.head.x, o.head.y, (top ? 10 : 8) * u * breath, (top ? 0.85 : 0.75) * faint);
    if (top && room()) {
      // rays slowly turning about the head, and fainter ones the other way
      const rays = raysPicture(hex);
      for (const [far, alpha, turn] of [[42, 0.85, 1], [27, 0.55, -1.7]]) {
        ctx.save();
        ctx.translate(o.head.x, o.head.y);
        ctx.rotate(o.still ? 0.3 * turn : (t / 9) * turn + ph);
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = base * alpha;
        ctx.drawImage(rays, -far * u, -far * u, far * 2 * u, far * 2 * u);
        ctx.restore();
        spend();
      }
      if (!o.still) {
        // a ring going out from the head every few seconds
        const beat = ((t + ph) % 3.4) / 0.85;
        if (beat < 1 && room()) soft(ringPicture(hex), o.head.x, o.head.y, (8 + 32 * beat) * u, (1 - beat) * 0.75);
        round(false);
      }
    }
    ctx.restore();
    return;
  }
  if (o.still) { ctx.restore(); return; }
  // a glint that runs up the tool every few seconds, and twinkles at its head
  const every = top ? 2.3 : 3.6, run = ((t + ph * 1.7) % every) / 0.5;
  if (run < 1) mote(o.from.x + (o.to.x - o.from.x) * run, o.from.y + (o.to.y - o.from.y) * run, Math.sin(Math.PI * Math.min(1, run + 0.15)), 1);
  else if (run < 1.5) mote(o.to.x, o.to.y, 1 - (run - 1) * 2, top ? 3 : 2);
  // motes going up from the head
  for (let i = 0; i < (top ? 4 : 3); i++) {
    const at = t / 2.3 + rnd(o.seed, i, 31), c = Math.floor(at), f = at - c;
    mote(o.head.x + ((rnd(o.seed, i, c * 2 + 33) - 0.5) * 16 + Math.sin(f * 6 + i) * 2) * u, o.head.y + (4 - f * 19) * u, Math.sin(Math.PI * f) * 0.95);
  }
  if (top) {
    round(true);
    // sparks left behind on a walk: where the head was a moment ago, falling a little, gone in half a second
    if (o.vel) {
      const step = 105, n0 = Math.floor(o.now / step);
      for (let k = 0; k < 5; k++) {
        const age = (o.now - (n0 - k) * step) / 1000, life = age / 0.56;
        if (life >= 1) continue;
        mote(o.head.x - o.vel.x * age + (rnd(o.seed, n0 - k, 41) - 0.5) * 7 * u, o.head.y - o.vel.y * age + (rnd(o.seed, n0 - k, 43) - 0.5) * 7 * u + 26 * u * age * age, 1 - life);
      }
    }
  }
  ctx.restore();
}

/* ── a gem's element about the tool ─────────────────────────────────────── */

/**
 * The most pieces laid for one doll's tool (so many behind its head and so many before it), and for every tool on a
 * screen in one frame (my own tool is never left out).
 */
export const CAP = { under: 6, over: 14, screen: 150 };
/** The small pieces a tool has, by how strongly its gems show (1 to 4). */
const PIECES = [0, 3, 5, 7, 9];
/** How long a small piece of each element is on its way, in milliseconds. */
const LIFE: Record<Element, number> = { fire: 1100, water: 1300, ice: 2300, earth: 1200, lightning: 430, wind: 1700, light: 2500, dark: 1900 };
/** The pairs that make something of the two together. */
const MIXES: Array<[Element, Element, "steam" | "mist" | "crackle" | "halo"]> = [["fire", "water", "steam"], ["fire", "ice", "mist"], ["lightning", "water", "crackle"], ["light", "dark", "halo"]];

/** A number in [0, 1) from a seed and two counts: the same every frame, so a piece keeps its own way. */
function rnd(seed: number, i: number, k: number): number {
  let h = (seed ^ Math.imul(i + 1, 374761393) ^ Math.imul(k + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** A number from somebody's id, for their pieces' ways. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h | 0;
}

const LIGHTS = new Map<string, HTMLCanvasElement>();
/** A soft round light of a colour as a picture, made once for each colour (there are eight). */
function lightPicture(hex: string): HTMLCanvasElement {
  let canvas = LIGHTS.get(hex);
  if (canvas) return canvas;
  const R = 32, n = parseInt(hex.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  canvas = document.createElement("canvas");
  canvas.width = canvas.height = R * 2;
  const c = canvas.getContext("2d");
  if (c) {
    const g = c.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, `rgba(${rgb},0.95)`);
    g.addColorStop(0.45, `rgba(${rgb},0.4)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, R * 2, R * 2);
  }
  LIGHTS.set(hex, canvas);
  return canvas;
}

/**
 * The light a tool throws in the dark, for the map's own lights (components/town/Town lays them once the night is
 * on the picture): each gem's colour as `r,g,b` and how far it reaches in map pixels; and of a tool forged far its
 * own light about its head, and at the top a pool of it on the ground (`ground`: laid flat at its holder's feet).
 */
const RGB = Object.fromEntries((Object.keys(GEMS) as Element[]).map((e) => { const n = parseInt(GEMS[e].hue.slice(1), 16); return [e, `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`]; })) as Record<Element, string>;
export function gemLights(look: ToolLook | null): Array<{ rgb: string; reach: number; strong: number; ground?: boolean }> {
  if (!look) return [];
  const strength = gemShow(look), kinds = [...new Set(look.gems)], lights: Array<{ rgb: string; reach: number; strong: number; ground?: boolean }> = [];
  // (several lights at one head are each fainter: together about one and a half, never a white patch over a face)
  const each = 1 / Math.sqrt(kinds.length + (look.glow ? 1 : 0) || 1);
  if (strength) for (const e of kinds) lights.push({ rgb: RGB[e], reach: 14 + 4 * strength, strong: each });
  // (and a tool forged far: its own light about its head, and at the top a pool of it on the ground)
  if (look.glow) lights.push({ rgb: rgbOf(levelHue(look)), reach: look.glow === 2 ? 30 : 20, strong: each });
  if (look.glow === 2) lights.push({ rgb: rgbOf(levelHue(look)), reach: 56, strong: 0.8, ground: true });
  return lights;
}

/** The pieces left to lay on this screen in this frame: a frame is known by its clock. */
let frame = -1, left = CAP.screen;

/**
 * What a tool's gems show about its head (see the top of this file). `head` is where the tool's head is on the
 * screen and `ground` where its holder's feet are; `tall` the holder's standing height on the screen and `zoom` the
 * map's; `seed` from the holder's id. Nothing, of a tool with no gem.
 *
 * It is laid in two goes, so that the tool itself is seen among it: `under` before the tool's picture (the light, a
 * ring or an orb behind its head, whatever goes round it while it is at the back) and `over` after it (everything
 * else). Every piece belongs to one of the two.
 */
export function drawGems(ctx: CanvasRenderingContext2D, look: ToolLook | null, layer: "under" | "over", head: Vec, ground: number, tall: number, zoom: number, dpr: number,
  now: number, seed: number, still: boolean, mine: boolean) {
  const strength = gemShow(look);
  if (!look || !strength) return;
  if (now !== frame) { frame = now; left = CAP.screen; }
  const gems = look.gems, kinds = [...new Set(gems)];
  // a picture pixel of a piece is a whole number of the screen's own pixels: by the doll's size and the map's zoom
  const q = Math.max(1, Math.round(Math.max(0.72, Math.min(1.3, tall / zoom / 70)) * zoom * dpr)) / dpr;
  const base = ctx.globalAlpha, snap = (v: number) => Math.round(v * dpr) / dpr;
  const back = layer === "under";
  let laid = 0;
  const room = () => laid < (back ? CAP.under : CAP.over) && (mine || left > 0);
  const spend = () => { laid++; if (!mine) left--; };
  ctx.save();
  // (a tool that glows is drawn under a shadow of its own: none of that on these)
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  // ── the light, in each gem's colour: side by side where there are several, going slowly round ──
  if (back) {
    const wide = (9 + 3 * strength) * q, turn = still ? 0.6 : now / 2600 + (seed & 7);
    ctx.imageSmoothingEnabled = true;
    kinds.forEach((e, k) => {
      const a = turn + (k * Math.PI * 2) / kinds.length, off = kinds.length > 1 ? 4 * q : 0;
      ctx.globalAlpha = base * (still ? 1 : kinds.length > 1 ? 0.7 : 0.8);
      ctx.drawImage(lightPicture(GEMS[e].hue), head.x + Math.cos(a) * off - wide, head.y + Math.sin(a) * off * 0.7 - wide, wide * 2, wide * 2);
      spend();
    });
  }
  const img = heldPicture();
  if (still || !img) { ctx.restore(); return; }
  ctx.imageSmoothingEnabled = false;
  /** One picture, its middle at so many picture pixels from the head: so strong, mirrored, `m` times as large; `behind` the tool's head or before it. */
  const lay = (cell: Cell | undefined, dx: number, dy: number, alpha = 1, flip = false, m = 1, behind = false) => {
    if (behind !== back || !cell || alpha <= 0.02 || !room()) return;
    const [sx, sy, w, h] = cell, u = q * m, x = snap(head.x + dx * q - (w * u) / 2), y = snap(head.y + dy * q - (h * u) / 2);
    ctx.globalAlpha = base * Math.min(1, alpha);
    if (flip) { ctx.save(); ctx.translate(x + w * u, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, w, h, 0, 0, w * u, h * u); ctx.restore(); }
    else ctx.drawImage(img, sx, sy, w, h, x, y, w * u, h * u);
    spend();
  };
  const beat = (ms: number, of = 2) => Math.floor(now / ms + (seed & 3)) % of;

  // ── the same element twice or more: its own flourish, behind its small pieces (grander at three) ──
  for (const e of kinds) {
    const n = gems.filter((g) => g === e).length;
    if (n < 2) continue;
    const big = HELD_ART.fx[e], [A, B, C] = [big?.[3], big?.[4], big?.[5]], grand = n >= 3;
    switch (e) {
      case "fire": {
        // a crown of flame on the head, flickering
        const cell = grand ? (beat(130) ? C : B) : beat(140) ? A : B;
        if (cell) lay(cell, 0, -4 - cell[3] / 2, 1);
        break;
      }
      case "water":
        // a ring of water about the head, its crest going round
        lay(grand ? C : beat(300) ? A : B, 0, 1, 0.95, grand && !!beat(300), 1, true);
        break;
      case "ice":
        // a ring of frost, growing and drawing in
        lay(grand ? (beat(650) ? B : C) : beat(700) ? A : B, 0, 0, 0.95, false, 1, true);
        break;
      case "earth": {
        // stones going round the head (and a boulder over it)
        const t = now / 2600 + rnd(seed, 0, 9);
        [A, B].forEach((cell, k) => { const a = (t + k / 2) * Math.PI * 2; lay(cell, Math.cos(a) * 15, Math.sin(a) * 5 - 1, 1, Math.cos(a) < 0, 1, Math.sin(a) < 0); });
        if (grand) lay(C, 0, -19 + Math.sin(now / 520) * 1.5, 1);
        break;
      }
      case "lightning": {
        // a bolt from the head to the ground, now and then
        const every = grand ? 1050 : 1700, c = Math.floor(now / every + rnd(seed, 1, 9)), t = (now / every + rnd(seed, 1, 9)) % 1, lit = t * every;
        if (lit > 230) break;
        const cell = lit < 110 ? (grand ? C : A) : B;
        if (!cell) break;
        const m = Math.max(1, Math.round((ground - head.y) / (cell[3] * q)));
        lay(cell, (rnd(seed, c, 3) - 0.5) * 8 + (cell[2] * m) / 2 - 3, (cell[3] * m) / 2, 1, rnd(seed, c, 4) > 0.5, m);
        if (grand && lit < 110) lay(A, -9, (A ? A[3] : 0) / 2, 0.9, true);
        break;
      }
      case "wind":
        // a whirlwind about the head
        lay(grand ? C : beat(170) ? A : B, 0, 2, 0.8, grand && !!beat(170));
        break;
      case "light":
        // a halo, its rays reaching and drawing in
        lay(grand ? (beat(520) ? B : C) : beat(560) ? A : B, 0, 0, 0.95, false, 1, true);
        break;
      case "dark":
        // a dark orb, its wisps licking about
        lay(grand ? C : beat(380) ? A : B, 0, -2, 1, grand && !!beat(380), 1, true);
        break;
    }
  }

  // ── where two meet ──
  const mix = HELD_ART.fx.mix;
  for (const [a, b, what] of MIXES) {
    if (!kinds.includes(a) || !kinds.includes(b) || !mix) continue;
    if (what === "steam") {
      for (let i = 0; i < 2; i++) { const t = (now / 1900 + i / 2 + rnd(seed, i, 11)) % 1; lay(i ? mix[0] : mix[3], (rnd(seed, i, 12) - 0.5) * 8 + Math.sin(t * 5 + i) * 2, -5 - t * 17, (1 - t) * 0.9); }
    } else if (what === "mist") {
      lay(mix[4], Math.sin(now / 1500 + (seed & 15)) * 6, 6, 0.75);
      lay(mix[1], -Math.sin(now / 1100 + (seed & 15)) * 9, -4, 0.7);
    } else if (what === "crackle") {
      for (let i = 0; i < 2; i++) { const c = Math.floor(now / 330 + i * 0.5), t = (now / 330 + i * 0.5) % 1; if (t < 0.5) lay(mix[2], (rnd(seed, c, 13 + i) - 0.5) * 20, (rnd(seed, c, 15 + i) - 0.5) * 14 + 3, 1, rnd(seed, c, 17) > 0.5); }
    } else lay(mix[5], 0, 0, 0.7 + 0.2 * Math.sin(now / 700), false, 1, true);
  }

  // ── the small pieces: each gem's in its share, each on its own way ──
  const count = PIECES[strength];
  for (let i = 0; i < count; i++) {
    const e = gems[i % gems.length], bits = HELD_ART.fx[e], life = LIFE[e];
    if (!bits) continue;
    const at = now / life + rnd(seed, i, 0), c = Math.floor(at), t = at - c, r1 = rnd(seed, i, c * 3 + 1), r2 = rnd(seed, i, c * 3 + 2), r3 = rnd(seed, i, c * 3 + 3);
    switch (e) {
      case "fire":
        // embers going up, a flame burning down to a spark
        lay(bits[t < 0.35 ? 2 : t < 0.7 ? 1 : 0], (r1 - 0.5) * 11 + Math.sin(t * 6 + r2 * 6) * 1.5, 1 - t * (12 + r3 * 7), t < 0.8 ? 1 : (1 - t) / 0.2, r1 > 0.5);
        break;
      case "water":
        // drops falling, and their splash
        lay(bits[t < 0.8 ? (i % 3 === 2 ? 0 : 1) : 2], (r1 - 0.5) * 13, -2 + Math.min(t, 0.8) ** 2 * (22 + r2 * 8), t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1);
        break;
      case "ice": {
        // frost hanging about the head, glinting, sinking a little
        const a = r1 * Math.PI * 2, far = 7 + r2 * 6;
        lay(bits[t < 0.25 || t > 0.75 ? 0 : i % 2 ? 1 : 2], Math.cos(a) * far, Math.sin(a) * far * 0.7 + t * 4, Math.sin(Math.PI * t) ** 0.6);
        break;
      }
      case "earth": {
        // grit thrown off and falling
        const s = (t * life) / 1000;
        lay(bits[i % 4 === 3 ? 0 : 1 + (i % 2)], (r1 - 0.5) * 14 + (r2 - 0.5) * 9 * t, 1 - 14 * s + 20 * s * s, t > 0.8 ? (1 - t) / 0.2 : 1, r3 > 0.5);
        break;
      }
      case "lightning":
        // sparks, here and gone
        if (t < 0.2 || (t > 0.3 && t < 0.46)) lay(bits[(c + i) % 3], (r1 - 0.5) * 21, (r2 - 0.5) * 16, 1, r3 > 0.5);
        break;
      case "wind": {
        // swirls going round the head
        const a = (t + i / count) * Math.PI * 2;
        lay(bits[i % 3], Math.cos(a) * (10 + r1 * 3), Math.sin(a) * 5 - 1, 0.95, Math.sin(a) > 0, 1, Math.sin(a) < 0);
        break;
      }
      case "light":
        // motes going up slowly, twinkling
        lay(bits[Math.floor(t * 6 + i) % 3], (r1 - 0.5) * 17 + Math.sin(t * Math.PI * 2 + r2 * 6) * 2, 5 - t * 15, Math.sin(Math.PI * t));
        break;
      case "dark": {
        // wisps drawn in towards the head
        const a = r1 * Math.PI * 2 + t * 3, far = (1 - t) * 12 + 2;
        lay(bits[t > 0.82 ? 0 : 1 + (i % 2)], Math.cos(a) * far, Math.sin(a) * far * 0.6 - t * 5, t < 0.2 ? t / 0.2 : 1 - (t - 0.2) * 0.7);
        break;
      }
    }
  }
  ctx.restore();
}
