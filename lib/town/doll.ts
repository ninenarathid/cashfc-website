"use client";

import {
  BROWS, EYES, EYE_COLORS, GENDERS, HAIRS, HAIR_COLORS, MOUTHS, OUTFITS, SKINS, type Look,
} from "./look";

/**
 * Drawing a Cash Town avatar: the Lalafell paper doll, from one picture.
 *
 * One picture in public/town holds every layer (the hairless bodies with
 * their heads, the hairstyles, the face parts), cut and packed by the
 * fc-cash-town skill's build-town-atlas.mjs; doll.json says where each one
 * is, and which picture: it is named by its content, so the browser keeps it
 * for a week (next.config.ts) and a new map never meets an old picture. The art is
 * painted in key colours (green hair, blue cloth, violet eyes, one skin), and
 * every colour a member picks is a shift of those, worked out here: the same
 * rules as the dressing room it was proved in.
 *
 * The body and hair of each look and facing are put together once and kept
 * (within a budget of pixels, so a crowded town stays light on a phone); the
 * face goes on as each frame is drawn, which is what lets it blink and talk.
 */

type Frame = [x: number, y: number, w: number, h: number, ox: number, oy: number];
type PartRef = { frame: string; ax: number; ay: number };

interface AtlasJson {
  v: 1;
  /** The picture's file in public/town, named by its content. */
  image: string;
  scale: number;
  size: [number, number];
  frames: Record<string, Frame>;
  bodies: Record<"f" | "m", Array<{ W: number; H: number; feetY: number; cx: number }>>;
  faces: Record<"f" | "m", Array<{ eyes: Array<{ x: number; y: number; w: number; h: number }>; mouth: { x: number; y: number } }>>;
  parts: {
    scale: Record<"f" | "m", number>;
    eyes: Array<{ id: string; L: PartRef; R: PartRef }>;
    brows: Array<{ id: string; L: PartRef; R: PartRef }>;
    mouths: Array<{ id: string } & PartRef>;
    extras: Array<{ id: string } & PartRef>;
  };
}

/** Which way a doll faces: front, three-quarter (to the right), three-quarter back (to the right). */
export type View = 0 | 1 | 2;

export interface DrawState {
  /** Eyes shut for a blink. */
  blink?: boolean;
  /** A mouth to show instead of the chosen one (talking). */
  mouth?: string;
}

/* ── colour ─────────────────────────────────────────────────────────────── */

const CL = { clear: 0, green: 1, violet: 2, skin: 3, blue: 4, cream: 5, brown: 6, dark: 7, white: 8, pink: 9, other: 10 } as const;

function hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function rgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

function classify(r: number, g: number, b: number, a: number): number {
  if (a < 60) return CL.clear;
  const [h, s, l] = hsl(r, g, b);
  if (l < 0.2) return CL.dark;
  if (s < 0.18 && l > 0.88) return CL.white;
  if (h >= 70 && h <= 170 && s > 0.2 && l > 0.15) return CL.green;
  if (h >= 245 && h <= 300 && s > 0.18) return CL.violet;
  if (h >= 195 && h <= 240 && s > 0.18 && l > 0.3) return CL.blue;
  if (h >= 12 && h <= 36 && s > 0.25 && l >= 0.45 && l <= 0.86) return CL.skin;
  if (h <= 50 && l < 0.45 && s > 0.15) return CL.brown;
  if (l > 0.75 && s < 0.8 && h >= 20 && h <= 70) return CL.cream;
  if ((h >= 330 || h <= 12) && s > 0.3 && l > 0.45) return CL.pink;
  return CL.other;
}

type Region = "green" | "skin" | "blue" | "eye" | "all";
type Targets = Partial<Record<Region, string>>;

/** Brows in a darker, quieter take on the hair colour. */
function browColour(hairHex: string): string {
  const [h, s, l] = hexHsl(hairHex);
  const [r, g, b] = rgb(h, Math.min(1, s * 0.8), Math.min(l, 0.42) * 0.62);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ── the kit ────────────────────────────────────────────────────────────── */

/** Pixels the kept bodies may use in all, about 24 MB. */
const BASE_BUDGET = 6_000_000;

interface FrameData { data: Uint8ClampedArray; lab: Uint8Array; med: Partial<Record<Region, [number, number, number]>> }
interface Base { canvas: HTMLCanvasElement; ux: number; uy: number; f: number }

export class DollKit {
  private readonly sheet: HTMLCanvasElement;
  private readonly pixels: Uint8ClampedArray;
  private readonly frameData = new Map<string, FrameData>();
  private readonly tinted = new Map<string, HTMLCanvasElement>();
  private readonly bases = new Map<string, Base>();
  private basePixels = 0;

  constructor(readonly atlas: AtlasJson, img: HTMLImageElement) {
    const [W, H] = atlas.size;
    this.sheet = document.createElement("canvas");
    this.sheet.width = W; this.sheet.height = H;
    const g = this.sheet.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    this.pixels = g.getImageData(0, 0, W, H).data;
  }

  /** The doll's height in its own pixels, from the top of the bald head to the feet. */
  height(look: Look, view: View): number {
    const g = GENDERS[look.gender].id as "f" | "m";
    const body = this.atlas.frames[`body-${g}-${view}`];
    return this.atlas.bodies[g][view].feetY - body[5];
  }

  private frame(name: string): FrameData {
    let fd = this.frameData.get(name);
    if (fd) return fd;
    const [x, y, w, h] = this.atlas.frames[name];
    const W = this.atlas.size[0];
    const data = new Uint8ClampedArray(w * h * 4);
    for (let r = 0; r < h; r++) data.set(this.pixels.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4);
    const lab = new Uint8Array(w * h);
    const samples: Record<Region, Array<[number, number, number]>> = { green: [], skin: [], blue: [], eye: [], all: [] };
    for (let p = 0, i = 0; p < lab.length; p++, i += 4) {
      const c = classify(data[i], data[i + 1], data[i + 2], data[i + 3]);
      lab[p] = c;
      if (c === CL.clear || p % 3) continue;
      const v = hsl(data[i], data[i + 1], data[i + 2]);
      samples.all.push(v);
      if (c === CL.green) samples.green.push(v);
      if (c === CL.skin) samples.skin.push(v);
      if (c === CL.blue) samples.blue.push(v);
      if (c === CL.violet || c === CL.blue) samples.eye.push(v);
    }
    const med: FrameData["med"] = {};
    for (const [k, arr] of Object.entries(samples) as Array<[Region, Array<[number, number, number]>]>) {
      if (!arr.length) continue;
      const at = (j: number) => { const s = arr.map((a) => a[j]).sort((a, b) => a - b); return s[s.length >> 1]; };
      med[k] = [at(0), at(1), at(2)];
    }
    fd = { data, lab, med };
    this.frameData.set(name, fd);
    return fd;
  }

  /**
   * A layer with its regions moved to new colours, keeping their shading.
   * Line-work and soft edges that carry a region's hue move with it, keeping
   * their darkness; otherwise black hair keeps green lines.
   */
  private tint(name: string, targets: Targets): HTMLCanvasElement {
    const fd = this.frame(name);
    const [, , w, h] = this.atlas.frames[name];
    const out = new ImageData(new Uint8ClampedArray(fd.data), w, h), d = out.data;
    const T: Partial<Record<Region, [number, number, number]>> = {};
    for (const [k, hex] of Object.entries(targets) as Array<[Region, string | undefined]>) if (hex) T[k] = hexHsl(hex);
    for (let p = 0, i = 0; p < fd.lab.length; p++, i += 4) {
      const c = fd.lab[p];
      if (c === CL.clear) continue;
      let region: Region | null = null, line = false;
      if (T.all) region = "all";
      else if (c === CL.green && T.green) region = "green";
      else if (c === CL.skin && T.skin) region = "skin";
      else if (c === CL.blue && T.blue) region = "blue";
      else if ((c === CL.violet || c === CL.blue) && T.eye) region = "eye";
      else if (c === CL.dark || c === CL.other) {
        const [hh, ss] = hsl(d[i], d[i + 1], d[i + 2]);
        if (ss > 0.12) {
          if (T.green && hh >= 70 && hh <= 170) region = "green";
          else if (T.blue && hh >= 195 && hh <= 240) region = "blue";
          else if (T.eye && hh >= 195 && hh <= 300) region = "eye";
          line = region !== null && c === CL.dark;
        }
      }
      const m = region && fd.med[region], t = region && T[region];
      if (!m || !t) continue;
      const [, s, l] = hsl(d[i], d[i + 1], d[i + 2]);
      const [ht, st, lt] = t, [, sb, lb] = m;
      const s2 = Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb))));
      const l2 = line ? Math.min(l, lt) : Math.max(0, Math.min(1, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1)));
      const [r, g, b] = rgb(ht, s2, l2);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d")!.putImageData(out, 0, 0);
    return cv;
  }

  /** A small layer (an eye, a brow) in its colours, kept: there are few of them. */
  private tintedPart(name: string, targets: Targets): HTMLCanvasElement {
    const key = `${name}|${targets.eye ?? ""}|${targets.skin ?? ""}|${targets.all ?? ""}`;
    let cv = this.tinted.get(key);
    if (cv) { this.tinted.delete(key); this.tinted.set(key, cv); return cv; }
    cv = this.tint(name, targets);
    this.tinted.set(key, cv);
    if (this.tinted.size > 160) this.tinted.delete(this.tinted.keys().next().value!);
    return cv;
  }

  /**
   * Body and hair of a look and facing, put together at a fraction `f` of
   * the sheet's size (a quarter, a half or all of it, whichever the drawing
   * needs), kept within BASE_BUDGET pixels.
   */
  private base(look: Look, view: View, f: number): Base {
    const g = GENDERS[look.gender].id;
    const hair = HAIRS[look.hair].id;
    const key = `${g}${hair}${look.hairColor}.${look.skin}.${look.outfit}:${view}@${f}`;
    const known = this.bases.get(key);
    if (known) { this.bases.delete(key); this.bases.set(key, known); return known; }

    const layers: Array<[string, Targets]> = [[`body-${g}-${view}`, { blue: OUTFITS[look.outfit].hex, skin: SKINS[look.skin].hex }]];
    if (hair !== "bald") layers.push([`hair-${hair}-${g}-${view}`, { green: HAIR_COLORS[look.hairColor].hex }]);
    let ux0 = Infinity, uy0 = Infinity, ux1 = -Infinity, uy1 = -Infinity;
    for (const [name] of layers) {
      const [, , w, h, ox, oy] = this.atlas.frames[name];
      ux0 = Math.min(ux0, ox); uy0 = Math.min(uy0, oy); ux1 = Math.max(ux1, ox + w); uy1 = Math.max(uy1, oy + h);
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((ux1 - ux0) * f); canvas.height = Math.ceil((uy1 - uy0) * f);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    for (const [name, targets] of layers) {
      const [, , w, h, ox, oy] = this.atlas.frames[name];
      ctx.drawImage(this.tint(name, targets), (ox - ux0) * f, (oy - uy0) * f, w * f, h * f);
    }
    const b = { canvas, ux: ux0, uy: uy0, f };
    this.bases.set(key, b);
    this.basePixels += canvas.width * canvas.height;
    while (this.basePixels > BASE_BUDGET && this.bases.size > 1) {
      const oldest = this.bases.keys().next().value!;
      const o = this.bases.get(oldest)!;
      this.basePixels -= o.canvas.width * o.canvas.height;
      this.bases.delete(oldest);
    }
    return b;
  }

  /**
   * Draw a doll standing at (x, y), its feet there, `height` pixels from the
   * top of the head to the feet (hair may rise above). `mirror` faces it the
   * other way. `px` is how many device pixels a CSS pixel is.
   */
  draw(ctx: CanvasRenderingContext2D, look: Look, view: View, mirror: boolean, x: number, y: number,
    height: number, state: DrawState = {}, px = 1) {
    const g = GENDERS[look.gender].id as "f" | "m";
    const B = this.atlas.bodies[g][view];
    const k = height / this.height(look, view);
    // The smallest copy that is still sharp at this size.
    const need = k * px;
    const f = need <= 0.25 ? 0.25 : need <= 0.5 ? 0.5 : 1;
    const base = this.base(look, view, f);

    ctx.save();
    ctx.translate(x, y);
    if (mirror) ctx.scale(-1, 1);
    ctx.scale(k, k);
    ctx.translate(-B.cx, -B.feetY);
    ctx.drawImage(base.canvas, base.ux, base.uy, base.canvas.width / f, base.canvas.height / f);
    if (view !== 2) this.face(ctx, look, view, g, state);
    ctx.restore();
  }

  /** Eyes, brows, cheeks and mouth, in the doll's own pixels. */
  private face(ctx: CanvasRenderingContext2D, look: Look, view: 0 | 1, g: "f" | "m", state: DrawState) {
    const A = this.atlas;
    const F = A.faces[g][view];
    const ps = A.parts.scale[g];
    const [eL, eR] = F.eyes;
    const squash = view === 1 ? 0.78 : 1;
    const put = (part: PartRef, cv: CanvasImageSource | null, tx: number, ty: number, sx = 1, alpha = 1) => {
      const fr = A.frames[part.frame];
      if (!fr) return;
      ctx.globalAlpha = alpha;
      const dx = tx - part.ax * ps * sx, dy = ty - part.ay * ps, dw = fr[2] * ps * sx, dh = fr[3] * ps;
      if (cv) ctx.drawImage(cv, dx, dy, dw, dh);
      else ctx.drawImage(this.sheet, fr[0], fr[1], fr[2], fr[3], dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    };
    if (look.blush) {
      const bl = A.parts.extras.find((e) => e.id === "blushL"), br = A.parts.extras.find((e) => e.id === "blushR");
      if (bl) put(bl, null, eL.x - eL.w * 0.25, eL.y + eL.h, 1, 0.55);
      // Three-quarter: the far cheek turns away.
      if (br && view === 0) put(br, null, eR.x + eR.w * 0.25, eR.y + eR.h, 1, 0.55);
    }
    const eyeId = EYES[look.eyes].id;
    const shut = state.blink && eyeId !== "happy" && eyeId !== "closed";
    const set = A.parts.eyes.find((e) => e.id === (shut ? "closed" : eyeId)) ?? A.parts.eyes[0];
    const eyeT: Targets = { eye: EYE_COLORS[look.eyeColor].hex, skin: SKINS[look.skin].hex };
    put(set.L, this.tintedPart(set.L.frame, eyeT), eL.x, eL.y);
    put(set.R, this.tintedPart(set.R.frame, eyeT), eR.x, eR.y, squash);
    const browId = BROWS[look.brow].id;
    if (browId !== "none") {
      const br = A.parts.brows.find((b) => b.id === browId);
      if (br) {
        const bt: Targets = { all: browColour(HAIR_COLORS[look.hairColor].hex) };
        put(br.L, this.tintedPart(br.L.frame, bt), eL.x, eL.y - eL.h * 1.3);
        put(br.R, this.tintedPart(br.R.frame, bt), eR.x, eR.y - eR.h * 1.3, squash);
      }
    }
    const mouthId = state.mouth ?? MOUTHS[look.mouth].id;
    const m = A.parts.mouths.find((q) => q.id === mouthId) ?? A.parts.mouths[0];
    put(m, null, F.mouth.x, F.mouth.y, view === 1 ? 0.88 : 1);
  }
}

let kit: Promise<DollKit> | null = null;

/** The doll kit, fetched once per tab: one picture and its map. */
export function loadDollKit(): Promise<DollKit> {
  kit ??= (async () => {
    const r = await fetch("/town/doll.json");
    if (!r.ok) throw new Error(`doll.json ${r.status}`);
    const json = await r.json() as AtlasJson;
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    return new DollKit(json, img);
  })();
  // A failed fetch may be tried again later rather than remembered.
  kit.catch(() => { kit = null; });
  return kit;
}

/**
 * Which way somebody faces when walking by (dx, dy) tiles: towards the
 * viewer (three-quarter) or away (three-quarter back), mirrored for the
 * left-hand directions. On screen x runs down to the right and y down to
 * the left, so (x − y) is across and (x + y) is down.
 */
export function facingFor(dx: number, dy: number): { view: View; mirror: boolean } {
  const across = dx - dy, down = dx + dy;
  return { view: down >= 0 ? 1 : 2, mirror: across < 0 };
}
