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
 * What it costs: every piece is a small picture of one sheet (the fc-cash-town skill's scripts/pixel/build-held.mjs)
 * laid with `drawImage`, the light a picture made once for each colour; no path, no gradient and nothing kept from
 * frame to frame: where a piece is follows from the clock and its holder's id. So many pieces a doll and so many a
 * screen at the most (`CAP`); past that a tool has no more of them. With the town's motion switched off: the light,
 * still.
 */
type Cell = [number, number, number, number];
export const HELD_ART = art as unknown as {
  image: string; size: [number, number];
  /** A long tool's picture: where it is, where its handle stands (from its left) and where its head is, in its own pixels. */
  tools: Record<string, [number, number, number, number, number, number, number]>;
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
 * A long tool in a fist: its picture upright, mirrored by the side faced, its handle through the fist. `tall` is the
 * doll's standing height on the screen. Hard pixels while a picture pixel covers a screen pixel, as the dolls are.
 * Gives back where its head is on the screen, or null if its picture has not come yet (nothing is drawn then).
 * `under` is called with that place just before the picture is laid, for what belongs behind the tool's head.
 */
export function drawLongTool(ctx: CanvasRenderingContext2D, item: string, fist: Vec, tall: number, side: 1 | -1, dpr: number, under?: (head: Vec) => void): Vec | null {
  const img = heldPicture(), cell = HELD_ART.tools[item], rule = LONG[item];
  if (!img || !cell || !rule) return null;
  const [sx, sy, w, h, gx, hx, hy] = cell, k = (rule.tall * tall) / h, grip = rule.grip * h;
  const head = { x: fist.x + side * (hx - gx + LEAN * (grip - hy)) * k, y: fist.y + (hy - grip) * k };
  // (what lies behind its head is laid first: the light of its gems, a ring about it)
  under?.(head);
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = k * dpr < 1;
  ctx.translate(Math.round(fist.x * dpr) / dpr, Math.round(fist.y * dpr) / dpr);
  // (sheared, not turned: every row of its pixels stays a row, a little further out the higher it is)
  ctx.transform(side * k, 0, -side * LEAN * k, k, 0, 0);
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
 * The light a tool's gems throw in the dark, for the map's own lights (components/town/Town lays them once the
 * night is on the picture): each gem's colour as `r,g,b`, and how far it reaches in map pixels.
 */
const RGB = Object.fromEntries((Object.keys(GEMS) as Element[]).map((e) => { const n = parseInt(GEMS[e].hue.slice(1), 16); return [e, `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`]; })) as Record<Element, string>;
export function gemLights(look: ToolLook | null): Array<{ rgb: string; reach: number }> {
  const strength = gemShow(look);
  if (!look || !strength) return [];
  return [...new Set(look.gems)].map((e) => ({ rgb: RGB[e], reach: 16 + 5 * strength }));
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
