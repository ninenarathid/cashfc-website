"use client";

import { EYES, EYE_COLORS, GENDERS, HAIRS, HAIR_COLORS, SKINS, type Look } from "./look";

/**
 * Drawing a Cash Town avatar: a pixel Lalafell.
 *
 * One picture in public/town holds every piece, cut and packed by the
 * fc-cash-town skill's scripts/pixel/build-pixel-atlas.mjs from AI-made
 * sheets; pixel.json says where each piece is and which picture (named by its
 * content, so the browser keeps it a week and a new map never meets an old
 * picture).
 *
 * A walking doll is three pieces, drawn in this order:
 * - the body of the step it is on (four steps each way, in the gender's
 *   starter outfit), the head left off;
 * - a face on the one shared skull, per gender and eye shape (the back of the
 *   head is the same for everybody), carried by the step, so it never
 *   shimmers;
 * - the hairstyle laid over the face.
 * Two ways are drawn, three-quarter towards the viewer and away, each facing
 * right; mirroring gives the left.
 *
 * Colours a member picks are shifts of the art's key colours: green hair,
 * violet eyes, and skin painted in one ramp of six exact colours (skin is told
 * apart from the tan boots that way, not by its hue). Each piece is kept per
 * colour choice (they are small). Faces also come with the eyes closed and the
 * mouth open, for blinking and talking.
 */

type Frame = [x: number, y: number, w: number, h: number, ox: number, oy: number];
type Eye = { x0: number; y0: number; x1: number; y1: number; cells: Array<[number, number]> };
type G = "f" | "m";
type RGB = [number, number, number];

interface AtlasJson {
  v: 2;
  image: string;
  size: [number, number];
  frames: Record<string, Frame>;
  /** Per gender and way, the four steps: the body piece and where the head's reference point is, from the feet. */
  walk: Record<G, Record<View, Array<{ body: string; hx: number; hy: number }>>>;
  /** Per gender and way, sitting: the body (its bottom is the seat) and the head's reference point. */
  sit?: Record<G, Record<View, { body: string; hx: number; hy: number }>>;
  /** Face pieces per gender and eye shape (front), and the back of the head. */
  face: Record<G, Record<string, string>> & { back: string };
  /** Hair pieces per hairstyle and way. */
  hair: Record<string, Partial<Record<View, string>>>;
  /** A face's eyes, mouth and skin colour, in its own pixels; only faces that can blink. */
  faceData: Record<string, { eyes: Eye[]; mouth: { x: number; y: number } | null; skin: RGB }>;
  /** The skin ramp: every skin pixel is exactly one of these. */
  skin: RGB[];
}

/** Which way a doll faces: three-quarter towards the viewer, or away; both turned to the right. */
export type View = "front" | "back";

export interface DrawState {
  /** The step while walking (0–3, any whole number); standing otherwise. */
  step?: number;
  /** Eyes shut for a blink. */
  blink?: boolean;
  /** Mouth open (talking). */
  talk?: boolean;
  /** Sitting (on a bench): drawn with its seat at (x, y). */
  sit?: boolean;
}

/** Steps a second while walking. */
export const WALK_FPS = 10;
/** The step with both feet under the body. */
const STAND = 1;

/* ── colour ─────────────────────────────────────────────────────────────── */

function hsl(r: number, g: number, b: number): RGB {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function rgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexHsl(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/** A colour moved to a target, keeping its place in the shading: lightness by offset, saturation by ratio. */
function shift([, s, l]: RGB, [sb, lb]: [number, number], [ht, st, lt]: RGB): RGB {
  const s2 = Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb))));
  // Dark colours keep their steps closer together, or black hair loses its shape.
  const l2 = Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1)));
  return rgb(ht, s2, l2);
}

/** The art's key colours, as the atlas builder sorts them (pxlib.mjs `cls`). */
const isHair = ([h, s, l]: RGB) => h >= 70 && h <= 170 && s > 0.2 && l > 0.08;
const isEye = ([h, s, l]: RGB) => h >= 245 && h <= 310 && s > 0.15 && l > 0.12;

/** Pixels whose colour passes `test`, moved to `hex` around their own median. */
function recolourWhere(d: Uint8ClampedArray, test: (c: RGB) => boolean, hex: string) {
  const hits: number[] = [], ss: number[] = [], ls: number[] = [];
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const c = hsl(d[i], d[i + 1], d[i + 2]);
    if (test(c)) { hits.push(i); ss.push(c[1]); ls.push(c[2]); }
  }
  if (!hits.length) return;
  const base: [number, number] = [median(ss), median(ls)], to = hexHsl(hex);
  for (const i of hits) [d[i], d[i + 1], d[i + 2]] = shift(hsl(d[i], d[i + 1], d[i + 2]), base, to);
}

/* ── the kit ────────────────────────────────────────────────────────────── */

const canvasOf = (img: ImageData) => {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
};

/** Pieces kept at once, in their colours; each is a few kilobytes. */
const KEPT = 400;

export class PixelKit {
  private readonly pixels: CanvasRenderingContext2D;
  private readonly kept = new Map<string, HTMLCanvasElement[]>();
  private readonly skinRamp: { keys: Map<string, RGB>; base: [number, number] };

  constructor(readonly atlas: AtlasJson, img: HTMLImageElement) {
    const [W, H] = atlas.size;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    this.pixels = c.getContext("2d", { willReadFrequently: true })!;
    this.pixels.drawImage(img, 0, 0);
    const hs = atlas.skin.map((c) => hsl(...c));
    this.skinRamp = {
      keys: new Map(atlas.skin.map((c) => [c.join(","), c])),
      base: [median(hs.map((h) => h[1])), median(hs.map((h) => h[2]))],
    };
  }

  /** The skin ramp's colours moved to a skin swatch. */
  private skinTo(hex: string): Map<string, RGB> {
    const to = hexHsl(hex), out = new Map<string, RGB>();
    for (const [k, c] of this.skinRamp.keys) out.set(k, shift(hsl(...c), this.skinRamp.base, to));
    return out;
  }

  private paintSkin(d: Uint8ClampedArray, skin: Map<string, RGB>) {
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const to = skin.get(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      if (to) [d[i], d[i + 1], d[i + 2]] = to;
    }
  }

  /** A piece's pixels, as drawn in the picture. */
  private read(name: string): ImageData {
    const [x, y, w, h] = this.atlas.frames[name];
    return this.pixels.getImageData(x, y, w, h);
  }

  private keep(key: string, make: () => HTMLCanvasElement[]): HTMLCanvasElement[] {
    const known = this.kept.get(key);
    if (known) { this.kept.delete(key); this.kept.set(key, known); return known; }
    const made = make();
    this.kept.set(key, made);
    if (this.kept.size > KEPT) this.kept.delete(this.kept.keys().next().value!);
    return made;
  }

  private body(name: string, look: Look) {
    return this.keep(`${name}|${look.skin}`, () => {
      const img = this.read(name);
      this.paintSkin(img.data, this.skinTo(SKINS[look.skin].hex));
      return [canvasOf(img)];
    })[0];
  }

  private hair(name: string, look: Look) {
    return this.keep(`${name}|${look.hairColor}`, () => {
      const img = this.read(name);
      recolourWhere(img.data, isHair, HAIR_COLORS[look.hairColor].hex);
      return [canvasOf(img)];
    })[0];
  }

  /** A face in a look's colours: as it is, eyes shut, mouth open, both (the last three only where it can blink). */
  private face(name: string, look: Look): HTMLCanvasElement[] {
    return this.keep(`${name}|${look.skin}|${look.eyeColor}`, () => {
      const base = this.read(name), { width: w, height: h } = base;
      const skin = this.skinTo(SKINS[look.skin].hex);
      this.paintSkin(base.data, skin);
      recolourWhere(base.data, isEye, EYE_COLORS[look.eyeColor].hex);
      const out = [canvasOf(base)];
      const face = this.atlas.faceData[name];
      if (!face) return out;
      const at = (px: number, py: number) => { const i = (py * w + px) * 4; return [base.data[i], base.data[i + 1], base.data[i + 2], 255]; };
      const paint = (img: ImageData, px: number, py: number, c: number[]) => {
        if (px >= 0 && py >= 0 && px < w && py < h) img.data.set(c, (py * w + px) * 4);
      };
      const faceSkin = [...(skin.get(face.skin.join(",")) ?? face.skin), 255];
      // Shut: each eye's own pixels (never the hair over it) in the skin under it,
      // with a lash line across its lower half.
      const shut = (img: ImageData) => {
        for (const e of face.eyes) {
          let line = [40, 26, 30, 255], dark = 1;
          for (const [cx, cy] of e.cells) {
            const c = at(cx, cy), l = (c[0] + c[1] + c[2]) / 765;
            if (l < dark) { dark = l; line = c; }
          }
          for (const [cx, cy] of e.cells) paint(img, cx, cy, faceSkin);
          const ly = Math.round(e.y0 + (e.y1 - e.y0) * 0.65);
          for (const [cx, cy] of e.cells) if (cy === ly) paint(img, cx, cy, line);
        }
      };
      // Open: a small dark mouth where the line of it was.
      const open = (img: ImageData) => {
        if (!face.mouth) return;
        const { x: mx, y: my } = face.mouth;
        for (let px = mx - 1; px <= mx + 1; px++) { paint(img, px, my, [74, 28, 34, 255]); paint(img, px, my + 1, [74, 28, 34, 255]); }
        paint(img, mx, my + 1, [196, 92, 96, 255]);
      };
      const variant = (steps: Array<(img: ImageData) => void>) => {
        const img = new ImageData(new Uint8ClampedArray(base.data), w, h);
        for (const step of steps) step(img);
        return canvasOf(img);
      };
      out.push(variant([shut]), variant([open]), variant([shut, open]));
      return out;
    });
  }

  /**
   * Draw a doll with its feet at (x, y), one picture pixel `scale` canvas
   * units across. `mirror` faces it left. `px` is how many device pixels a
   * canvas unit is, so the doll lands on whole pixels and stays crisp.
   */
  draw(ctx: CanvasRenderingContext2D, look: Look, view: View, mirror: boolean, x: number, y: number,
    scale: number, state: DrawState = {}, px = 1) {
    const A = this.atlas;
    const g = (GENDERS[look.gender]?.id ?? "f") as G;
    const steps = A.walk[g][view];
    const step = (state.sit && A.sit?.[g]?.[view]) || steps[state.step === undefined ? STAND : ((state.step % 4) + 4) % 4];
    const faceName = view === "back" ? A.face.back : (A.face[g][EYES[look.eyes]?.id] ?? A.face[g].round);
    const hairName = A.hair[HAIRS[look.hair]?.id ?? ""]?.[view];
    const faces = this.face(faceName, look);
    const face = faces[faces.length > 1 ? (state.blink ? 1 : 0) + (state.talk ? 2 : 0) : 0];

    ctx.save();
    // Hard pixels while a picture pixel covers at least a screen pixel; zoomed
    // further out, nearest-neighbour would drop whole rows of the outline.
    ctx.imageSmoothingEnabled = scale * px < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(Math.round(x * px) / px, Math.round(y * px) / px);
    if (mirror) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    const [, , , , box, boy] = A.frames[step.body];
    ctx.drawImage(this.body(step.body, look), box, boy);
    const [, , , , fox, foy] = A.frames[faceName];
    ctx.drawImage(face, step.hx + fox, step.hy + foy);
    if (hairName) {
      const [, , , , hox, hoy] = A.frames[hairName];
      ctx.drawImage(this.hair(hairName, look), step.hx + hox, step.hy + hoy);
    }
    ctx.restore();
  }
}

let kit: Promise<PixelKit> | null = null;

/** The pixel kit, fetched once per tab: one picture and its map. */
export function loadPixelKit(): Promise<PixelKit> {
  kit ??= (async () => {
    const r = await fetch("/town/pixel.json");
    if (!r.ok) throw new Error(`pixel.json ${r.status}`);
    const json = await r.json() as AtlasJson;
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    return new PixelKit(json, img);
  })();
  // A failed fetch may be tried again later rather than remembered.
  kit.catch(() => { kit = null; });
  return kit;
}

/**
 * Which way somebody faces when walking by (dx, dy) tiles: towards the
 * viewer or away, mirrored for the left-hand directions. On screen x runs
 * down to the right and y down to the left, so (x − y) is across and (x + y)
 * is down.
 */
export function facingFor(dx: number, dy: number): { view: View; mirror: boolean } {
  const across = dx - dy, down = dx + dy;
  return { view: down >= 0 ? "front" : "back", mirror: across < 0 };
}
