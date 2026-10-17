"use client";

import { EYES, EYE_COLORS, GENDERS, HAIR_COLORS, RACES, hairsOf, raceOf, skinsOf, type Look } from "./look";
import { FACE_WEAR, HAIR_WEAR, HATS, NECK_WEAR, OUTFITS, onTop, wornId } from "./wear";

/**
 * Drawing a Cash Town avatar: a pixel character of one of the game's races.
 *
 * One picture per race in public/town holds every piece, cut and packed by the
 * fc-cash-town skill's scripts/pixel/build-pixel-atlas.mjs (the Lalafell) or
 * build-race-atlas.mjs (every other race) from AI-made sheets; its map
 * (pixel.json, pixel-<race>.json) says where each piece is and which picture (named by its
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

/** Where a piece is in its picture, and where it is drawn from its reference point; an outfit's own picture's name last (Doll 2). */
type Frame = [x: number, y: number, w: number, h: number, ox: number, oy: number, sheet?: string];
type Eye = { x0: number; y0: number; x1: number; y1: number; cells: Array<[number, number]> };
type G = "f" | "m";
type Step = { body: string; hx: number; hy: number; chair?: boolean };
/** An eating frame: a seated step, and (seen from the front) where its hands are from the feet, for the dish. */
type EatStep = Step & { hand?: { x: number; y: number }; fingers?: string };
/** A worn thing's piece per way (lib/town/wear); a hat also says where its brim comes down to in each column. */
type Worn = Partial<Record<View, string>> & { clip?: Partial<Record<View, { x0: number; ys: number[] }>> };
type RGB = [number, number, number];

interface AtlasJson {
  v: 2 | 3;
  image: string;
  size: [number, number];
  frames: Record<string, Frame>;
  /** Per gender and way, the four steps: the body piece and where the head's reference point is, from the feet. */
  walk: Record<G, Record<View, Array<{ body: string; hx: number; hy: number }>>>;
  /** Per gender and way, sitting: the body (its bottom is the seat) and the head's reference point. */
  sit?: Record<G, Record<View, { body: string; hx: number; hy: number; chair?: boolean }>>;
  /** Face pieces per gender and eye shape (front), and the back of the head (shared by the Lalafell, per gender for the rest). */
  face: Record<G, Record<string, string>> & { back?: string };
  /** How tall a standing doll is, per gender, in picture pixels (not given for the Lalafell). */
  height?: Partial<Record<G, number>>;
  /** How big this race's picture pixels are against the Lalafell's, per gender: drawn that much larger (not given for the Lalafell). */
  scale?: Partial<Record<G, number>>;
  /** Per gender, from the feet to the top of the head, ears left out (not given for the Lalafell). */
  body?: Partial<Record<G, number>>;
  /** The race's green is fur too (Miqo'te ears and tail): recoloured with the hair everywhere. */
  furKey?: boolean;
  /** Hair pieces per hairstyle and way. */
  hair: Record<string, Partial<Record<View, string>>>;
  /** A face's eyes, mouth and skin colour, in its own pixels; only faces that can blink. */
  faceData: Record<string, { eyes: Eye[]; mouth: { x: number; y: number } | null; skin: RGB }>;
  /** The skin ramp: every skin pixel is exactly one of these. */
  skin: RGB[];
  /**
   * Faces made for a moment (lib/town/expression), per gender: the piece, and whether it is laid over the player's own
   * face (`keep`: their eyes stay) or shown in its place. Missing from an atlas built before them.
   */
  expr?: Partial<Record<G, Record<string, { face: string; keep: boolean }>>>;
  /** Doll 2's outfits (lib/town/wear's OUTFITS but the starter), one body for both genders. Missing before them. */
  outfits?: Record<string, { walk: Record<View, Step[]>; sit?: Record<View, Step>; eat?: Record<View, EatStep[]> }>;
  /**
   * Doll 2: the outfits each in a picture of its own, by outfit (`<id>`, `<id>_f`), fetched when somebody first wears
   * one (the owner, before any push: every outfit in one picture grew with each). Missing before them.
   */
  sheets?: Record<string, { image: string; size: [number, number] }>;
  /** The starter's eating frames, both genders: the hands at the chest, then at the mouth. */
  eat?: Record<View, EatStep[]>;
  /** Doll 2's hats and accessories, by slot and id. */
  wear?: { hat: Record<string, Worn>; face: Record<string, Worn>; neck: Record<string, Worn>; hair: Record<string, Worn> };
}

/** Which way a doll faces: three-quarter towards the viewer, or away; both turned to the right. */
export type View = "front" | "back";

export interface DrawState {
  /** Portraits may resample the source art smoothly at a larger UI size. */
  smooth?: boolean;
  /** The step while walking (0–3, any whole number); standing otherwise. */
  step?: number;
  /** Eyes shut for a blink. */
  blink?: boolean;
  /** Mouth open (talking). */
  talk?: boolean;
  /** A face made for a moment (an id of lib/town/expression), seen from the front only; no blink or talk meanwhile. */
  expr?: string | null;
  /** Eating where they sit: 0 the dish held at the chest, 1 brought up to the mouth (where the atlas has eating frames). */
  eat?: 0 | 1;
  /** Sitting (on a bench): drawn with its seat at (x, y). */
  sit?: boolean;
  /**
   * Sitting with their back to the viewer on a bench that has a table before it (the cooking yard's near benches):
   * the legs are under the table, on the far side of the body. The sitting body the dolls have is of somebody on the
   * ground, its legs out to one side, which on a bench lay along the seat (the owner, 2026-10-04: "นั่งมุมนี้ ถอดออกไปก่อน";
   * 2026-10-07: "ขาตัวละครบั๊คตอนนั่งหันหลัง"). So: the standing body seen from behind, down to its hips and no further, set
   * on the seat with the head where the sitting body has it, so nobody is taller or shorter for it.
   */
  perch?: boolean;
}

/** How tall a standing Lalafell is in its picture's pixels: the measure the other races are sized by. */
const LALAFELL_H = 77;
/**
 * The measure the other races are sized by: a Lalafell of the game's own height against them, three fifths of the
 * Lalafell picture, so a game Lalafell stands about 46 of the town's pixels and the tallest of the others (a
 * Roegadyn man, 2.47 Lalafell) about a street lamp's height.
 */
const GAME_LALAFELL = 0.6;
/**
 * The Lalafell themselves are drawn a little larger than that, the top of their head at about a Viera's waist (the
 * owner, 2026-10-02: "lalafell ตัวเล็กเกินไป ปรับแค่ lalafell ให้ตัวใหญ่ขึ้น สูงถึงประมาณเอว เผ่า Viera"; a Viera's
 * belt is at 0.54 of her height, 2.03 game Lalafell). Nobody else changes size.
 */
const LALAFELL_SIZE = 0.67;

/** Steps a second while walking. */
export const WALK_FPS = 10;

/** Said on the window when an outfit's own picture has come (a drawing made once draws again: the wardrobe's cards). */
export const KIT_SHEET_EVENT = "cashtown:kit-sheet";
/** How long a picture that would not load is left before it is asked for again. */
const SHEET_RETRY_MS = 30_000;
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

/** Pixels (offsets into a piece's data) moved to `hex` around their own median. */
function recolour(d: Uint8ClampedArray, hits: number[], hex: string) {
  if (!hits.length) return;
  const cs = hits.map((i) => hsl(d[i], d[i + 1], d[i + 2]));
  const base: [number, number] = [median(cs.map((c) => c[1])), median(cs.map((c) => c[2]))], to = hexHsl(hex);
  hits.forEach((i, k) => { [d[i], d[i + 1], d[i + 2]] = shift(cs[k], base, to); });
}

/**
 * A piece's key colours moved to a look's: the skin (the ramp's exact colours, each to its shade of the swatch),
 * the eyes (violet, to a colour) and the hair or, on a furry race, the fur (green, to a colour).
 *
 * Which pixel is which is told from the art as drawn, all of it before anything is recoloured, so one key's new
 * colour can never pass for another key: a green eye colour is in the fur's range, and a Miqo'te or a Viera who
 * chose green eyes had eyes the colour of her hair (a member, 2026-10-03: "แก้สีตาเป็นสีเขียว แต่ตายังเป็นสีชมพู").
 */
export function paintKeys(d: Uint8ClampedArray, to: { skin?: Map<string, RGB>; eyes?: string; fur?: string }) {
  const eyes: number[] = [], fur: number[] = [];
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const skin = to.skin?.get(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    if (skin) { [d[i], d[i + 1], d[i + 2]] = skin; continue; }
    if (!to.eyes && !to.fur) continue;
    const c = hsl(d[i], d[i + 1], d[i + 2]);
    if (to.eyes && isEye(c)) eyes.push(i);
    else if (to.fur && isHair(c)) fur.push(i);
  }
  if (to.eyes) recolour(d, eyes, to.eyes);
  if (to.fur) recolour(d, fur, to.fur);
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
  /** The outfits' own pictures that have come, and when each was last asked for (lib/town/pixeldoll's `sheets`). */
  private readonly sheetPixels = new Map<string, CanvasRenderingContext2D>();
  private readonly sheetAsked = new Map<string, number>();
  private readonly sheetWaits = new Map<string, Array<() => void>>();
  private readonly kept = new Map<string, HTMLCanvasElement[]>();
  private readonly skinRamp: { keys: Map<string, RGB>; base: [number, number] };

  constructor(readonly atlas: AtlasJson, img: HTMLImageElement, readonly race = 0) {
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

  /** A piece's pixels, as drawn in the picture. */
  private read(name: string): ImageData {
    const [x, y, w, h, , , sheet] = this.atlas.frames[name];
    const from = sheet ? this.sheetPixels.get(sheet) : this.pixels;
    // (an outfit's piece is asked for only once its picture has come: outfitOf)
    return from ? from.getImageData(x, y, w, h) : new ImageData(w, h);
  }

  /** Whether an outfit's own picture is here (or it has none); the first time it is not, it is asked for. */
  private hasSheet(id: string): boolean {
    const s = this.atlas.sheets?.[id];
    if (!s || this.sheetPixels.has(id)) return true;
    const asked = this.sheetAsked.get(id);
    if (asked !== undefined && Date.now() - asked < SHEET_RETRY_MS) return false;
    this.sheetAsked.set(id, Date.now());
    const i = new Image();
    i.decoding = "async";
    i.onload = () => {
      const c = document.createElement("canvas");
      c.width = s.size[0]; c.height = s.size[1];
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(i, 0, 0);
      this.sheetPixels.set(id, ctx);
      for (const done of this.sheetWaits.get(id) ?? []) done();
      this.sheetWaits.delete(id);
      window.dispatchEvent(new Event(KIT_SHEET_EVENT));
    };
    i.src = `/town/${s.image}`;
    return false;
  }

  /** When the outfit a look wears can be drawn as itself (at once if it has no picture of its own, or it has come). */
  ready(look: Look): Promise<void> {
    const id = this.outfitKey(look);
    if (!id || this.hasSheet(id)) return Promise.resolve();
    return new Promise((done) => { const w = this.sheetWaits.get(id) ?? []; w.push(done); this.sheetWaits.set(id, w); });
  }

  private keep(key: string, make: () => HTMLCanvasElement[]): HTMLCanvasElement[] {
    const known = this.kept.get(key);
    if (known) { this.kept.delete(key); this.kept.set(key, known); return known; }
    const made = make();
    this.kept.set(key, made);
    if (this.kept.size > KEPT) this.kept.delete(this.kept.keys().next().value!);
    return made;
  }

  /** The look's skin swatch in this race's list. */
  private skinHex(look: Look) {
    const skins = skinsOf(this.race);
    return (skins[look.skin] ?? skins[0]).hex;
  }

  private body(name: string, look: Look) {
    return this.keep(`${name}|${look.skin}|${this.atlas.furKey ? look.hairColor : ""}`, () => {
      const img = this.read(name);
      paintKeys(img.data, { skin: this.skinTo(this.skinHex(look)), fur: this.atlas.furKey ? HAIR_COLORS[look.hairColor].hex : undefined });
      return [canvasOf(img)];
    })[0];
  }

  /**
   * How much larger than its picture a gender of this race is drawn: whole, in its own proportions, so its
   * body (feet to the top of the head, ears left out) stands at the race's height in the game against a
   * Lalafell (lib/town/look RACES), and the Lalafell are drawn small enough for the tallest to fit the map
   * (the owner, 2026-10-02: "scale ตามเกมเหมือนเดิม ตามที่ดีไซน์ แต่ lalafell ต้องตัวเล็กลง"). Body and head
   * are kept apart so a race could be drawn more chibi one day; today they are the same size.
   */
  private sizesOf(g: G): { body: number; head: number } {
    if (this.race === 0) return { body: LALAFELL_SIZE, head: LALAFELL_SIZE };
    const want = raceOf(this.race).height?.[g], total = this.atlas.body?.[g];
    const k = want && total ? (LALAFELL_H * GAME_LALAFELL * want) / total : this.atlas.scale?.[g] ?? 1;
    return { body: k, head: k };
  }

  /** How tall a doll of this look stands, ears included, in Lalafell picture pixels, if the picture says. */
  heightOf(look: Look): number | undefined {
    const g = (GENDERS[look.gender]?.id ?? "f") as G, h = this.atlas.height?.[g];
    if (this.race === 0) return LALAFELL_H * LALAFELL_SIZE;
    if (h === undefined) return undefined;
    const k = this.sizesOf(g), neck = -(this.atlas.walk[g]?.front?.[STAND]?.hy ?? 0);
    return neck * k.body + (h - neck) * k.head;
  }

  /** Standing height without ears, so long ears do not enlarge tools or move their grip up the chest. */
  bodyHeightOf(look: Look): number | undefined {
    if (this.race === 0) return this.heightOf(look);
    const g = (GENDERS[look.gender]?.id ?? "f") as G, h = this.atlas.body?.[g];
    return h === undefined ? this.heightOf(look) : h * this.sizesOf(g).body;
  }

  /**
   * Where a doll's mouth is from its feet, in canvas units, standing or sitting: for what is brought up to it (a
   * morsel of a meal). Null when it faces away, or its picture does not say where its mouth is.
   */
  mouthOf(look: Look, view: View, mirror: boolean, scale: number, sit = false, eat?: 0 | 1): { x: number; y: number } | null {
    if (view === "back") return null;
    const A = this.atlas, g = (GENDERS[look.gender]?.id ?? "f") as G, O = this.outfitOf(look);
    const step = (sit && this.eatStep(look, view, eat)) || (sit && (O?.sit?.[view] ?? A.sit?.[g]?.[view])) || (O?.walk ?? A.walk[g])[view][STAND];
    const name = A.face[g][EYES[look.eyes]?.id] ?? A.face[g].round, mouth = A.faceData[name]?.mouth, frame = A.frames[name];
    if (!mouth || !frame) return null;
    const sizes = this.sizesOf(g), kb = scale * sizes.body, kh = scale * sizes.head;
    const x = step.hx * kb + (frame[4] + mouth.x + 0.5) * kh, y = step.hy * kb + (frame[5] + mouth.y + 1) * kh;
    return { x: mirror ? -x : x, y };
  }

  /**
   * The outfit a look wears, where this atlas has it: a woman's own version of it (<id>_f, the owner's ask of
   * 2026-10-17) where there is one, else the outfit as first drawn; the starter is the gender's own body unless a
   * woman's starter is drawn.
   */
  private outfitOf(look: Look) {
    const key = this.outfitKey(look);
    // (the starter's body while the outfit's own picture is on its way: hasSheet asks for it)
    return key && this.hasSheet(key) ? this.atlas.outfits?.[key] : undefined;
  }
  /** Which of the atlas's outfits a look wears (`<id>_f` for a woman where there is one), or none for the starter's body. */
  private outfitKey(look: Look): string | undefined {
    const id = wornId(OUTFITS, look.outfit) ?? "starter";
    if (GENDERS[look.gender]?.id === "f" && this.atlas.outfits?.[`${id}_f`]) return `${id}_f`;
    return id !== "starter" && this.atlas.outfits?.[id] ? id : undefined;
  }

  /** The eating frame a look sits in, if this atlas has them. */
  private eatStep(look: Look, view: View, eat: 0 | 1 | undefined): EatStep | undefined {
    if (eat === undefined) return undefined;
    // (an outfit's own, or none: the starter's eating body in another outfit's place would change the clothes)
    const O = this.outfitOf(look);
    return (O ? O.eat : this.atlas.eat)?.[view]?.[eat];
  }

  /** Whether this atlas can draw a look eating with the dish in its hands. */
  eatsInHand(look: Look): boolean { return !!this.eatStep(look, "front", 0)?.hand; }

  /**
   * Where the hands of a look eating are (frame 0 or 1, seen from the front), from its feet, in canvas units: the
   * dish is drawn there, held. Null seen from behind, or where the atlas has no eating frames.
   */
  handOf(look: Look, view: View, mirror: boolean, scale: number, eat: 0 | 1): { x: number; y: number } | null {
    const step = view === "front" ? this.eatStep(look, view, eat) : undefined;
    if (!step?.hand) return null;
    const kb = scale * this.sizesOf((GENDERS[look.gender]?.id ?? "f") as G).body;
    const x = (step.hand.x + 0.5) * kb, y = (step.hand.y + 0.5) * kb;
    return { x: mirror ? -x : x, y };
  }

  /**
   * The fingers of a look eating (frame 0 or 1, seen from the front), drawn over the dish the town has put in its hands
   * (handOf), with the doll's own feet at (x, y) as for draw: so the dish is held.
   */
  drawFingers(ctx: CanvasRenderingContext2D, look: Look, view: View, mirror: boolean, x: number, y: number, scale: number, eat: 0 | 1, px = 1) {
    const step = view === "front" ? this.eatStep(look, view, eat) : undefined;
    if (!step?.fingers || !this.atlas.frames[step.fingers]) return;
    const kb = scale * this.sizesOf((GENDERS[look.gender]?.id ?? "f") as G).body;
    const [, , , , ox, oy] = this.atlas.frames[step.fingers];
    ctx.save();
    ctx.translate(Math.round(x * px) / px, Math.round(y * px) / px);
    if (mirror) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = kb * px < 1;
    ctx.scale(kb, kb);
    ctx.drawImage(this.body(step.fingers, look), ox, oy);
    ctx.restore();
  }

  /** A worn thing's piece as drawn (it is not recoloured). */
  private plain(name: string) {
    return this.keep(`${name}|plain`, () => [canvasOf(this.read(name))])[0];
  }

  /** A hairstyle under a hat: its hair above the hat's brim taken away, column by column, so none shows through. */
  private hairUnder(name: string, look: Look, hat: string, view: View, clip: { x0: number; ys: number[] }) {
    return this.keep(`${name}|${look.hairColor}|${look.skin}|${hat}|${view}`, () => {
      const [, , w, h, ox, oy] = this.atlas.frames[name];
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d")!;
      x.drawImage(this.hair(name, look), 0, 0);
      for (let px = 0; px < w; px++) {
        const j = Math.min(clip.ys.length - 1, Math.max(0, px + ox - clip.x0));
        const rows = Math.min(h, clip.ys[j] - oy + 1);
        if (rows > 0) x.clearRect(px, 0, 1, rows);
      }
      return [c];
    })[0];
  }

  /**
   * A hairstyle in a look's colours: the hair, and the skin the piece carries (an ear or a horn through the hair,
   * drawn on the hair sheet a little apart from the bald head's: it is in the skin ramp's colours like any skin).
   */
  private hair(name: string, look: Look) {
    return this.keep(`${name}|${look.hairColor}|${look.skin}`, () => {
      const img = this.read(name);
      paintKeys(img.data, { skin: this.skinTo(this.skinHex(look)), fur: HAIR_COLORS[look.hairColor].hex });
      return [canvasOf(img)];
    })[0];
  }

  /** A face in a look's colours: as it is, eyes shut, mouth open, both (the last three only where it can blink). */
  private face(name: string, look: Look): HTMLCanvasElement[] {
    return this.keep(`${name}|${look.skin}|${look.eyeColor}|${this.atlas.furKey ? look.hairColor : ""}`, () => {
      const base = this.read(name), { width: w, height: h } = base;
      const skin = this.skinTo(this.skinHex(look));
      paintKeys(base.data, { skin, eyes: EYE_COLORS[look.eyeColor].hex, fur: this.atlas.furKey ? HAIR_COLORS[look.hairColor].hex : undefined });
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
   * A look's head seen from the front with what it wears there, layer by layer, and the box it takes about the head's
   * reference point, in picture pixels: the face between its ears from just above the crown to the chin, grown to take
   * in a hat, a neck thing and the rest (a tall topknot above it and hair below the chin are left out, as a portrait).
   */
  private headOf(look: Look, expr?: string | null) {
    const A = this.atlas, g = (GENDERS[look.gender]?.id ?? "f") as G;
    const faceName = A.face[g][EYES[look.eyes]?.id] ?? A.face[g].round;
    const ex = expr ? A.expr?.[g]?.[expr] : undefined;
    const hairName = A.hair[hairsOf(this.race)[look.hair]?.id ?? ""]?.front;
    const W = A.wear, hatId = wornId(HATS, look.hat), hat = hatId ? W?.hat?.[hatId] : undefined;
    const worn = (slot: "face" | "neck" | "hair", list: typeof HATS, i: number | undefined) => { const id = wornId(list, i); return id ? W?.[slot]?.[id]?.front : undefined; };
    const neck = worn("neck", NECK_WEAR, look.neck), glasses = worn("face", FACE_WEAR, look.faceWear), clip = hatId && onTop(look.hairWear) ? undefined : worn("hair", HAIR_WEAR, look.hairWear);
    const layers: Array<{ name: string; draw: () => CanvasImageSource }> = [];
    const plain = (name: string | undefined) => { if (name && A.frames[name]) layers.push({ name, draw: () => this.plain(name) }); };
    plain(neck);
    const shown = ex && !ex.keep ? ex.face : faceName;
    layers.push({ name: shown, draw: () => this.face(shown, look)[0] });
    if (ex?.keep) layers.push({ name: ex.face, draw: () => this.face(ex.face, look)[0] });
    if (hairName) {
      const cut = hat?.front ? hat.clip?.front : undefined;
      layers.push({ name: hairName, draw: () => (cut ? this.hairUnder(hairName, look, hatId!, "front", cut) : this.hair(hairName, look)) });
    }
    plain(glasses); plain(clip); plain(hat?.front);
    const [, , w, h, ox, oy] = A.frames[faceName];
    let x0 = ox, y0 = oy, x1 = ox + w, y1 = oy + h;
    if (hairName) { const [, , hw, , hox, hoy] = A.frames[hairName]; x0 = Math.min(x0, hox); x1 = Math.max(x1, hox + hw); y0 = Math.max(oy - 5, Math.min(y0, hoy)); }
    for (const n of [neck, glasses, clip, hat?.front]) {
      if (!n || !A.frames[n]) continue;
      const [, , iw, ih, iox, ioy] = A.frames[n];
      x0 = Math.min(x0, iox); x1 = Math.max(x1, iox + iw); y0 = Math.min(y0, ioy); y1 = Math.max(y1, ioy + ih);
    }
    return { layers, box: { x0, y0, x1, y1 } };
  }

  /** How wide and tall a look's head is seen from the front, with what it wears there, in picture pixels. */
  headSize(look: Look): { w: number; h: number } {
    const { box } = this.headOf(look);
    return { w: box.x1 - box.x0, h: box.y1 - box.y0 };
  }

  /**
   * A look's head alone, seen from the front, with what it wears there, making a face (or none), its box's top left at
   * (x, y), one picture pixel `scale` canvas units: the emote window's faces and the wardrobe's cards (the player's own
   * head making each face, wearing each thing).
   */
  drawHead(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, scale: number, expr?: string | null) {
    const A = this.atlas, { layers, box } = this.headOf(look, expr);
    ctx.save();
    ctx.imageSmoothingEnabled = scale < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-box.x0, -box.y0);
    for (const { name, draw } of layers) { const [, , , , ox, oy] = A.frames[name]; ctx.drawImage(draw(), ox, oy); }
    ctx.restore();
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
    const O = this.outfitOf(look);
    const steps = O?.walk[view] ?? A.walk[g][view];
    const sat = state.sit ? (O?.sit?.[view] ?? A.sit?.[g]?.[view]) : undefined;
    // (how much of the standing body is legs: what the head comes down by when the same doll sits)
    // A complete rear seated pose keeps its folded legs on chairs and benches.
    // Older ground poses still need the table's existing hidden-leg fallback.
    const perch = state.perch && view === "back" && sat && !sat.chair ? Math.max(0, sat.hy - steps[STAND].hy) : 0;
    const eating = !perch && state.sit ? this.eatStep(look, view, state.eat) : undefined;
    const step = perch ? steps[STAND] : eating || sat || steps[state.step === undefined ? STAND : ((state.step % 4) + 4) % 4];
    const faceName = view === "back" ? (A.face[g].back ?? A.face.back!) : (A.face[g][EYES[look.eyes]?.id] ?? A.face[g].round);
    const hairName = A.hair[hairsOf(this.race)[look.hair]?.id ?? ""]?.[view];
    const ex = view === "front" && state.expr ? A.expr?.[g]?.[state.expr] : undefined;
    const shown = ex && !ex.keep ? ex.face : faceName;
    const faces = this.face(shown, look);
    const face = faces[!ex && faces.length > 1 ? (state.blink ? 1 : 0) + (state.talk ? 2 : 0) : 0];

    ctx.save();
    // Hard pixels while a picture pixel covers at least a screen pixel; zoomed
    // further out, nearest-neighbour would drop whole rows of the outline.
    const sizes = this.sizesOf(g), kb = scale * sizes.body, kh = scale * sizes.head;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(Math.round(x * px) / px, Math.round(y * px) / px);
    if (mirror) ctx.scale(-1, 1);
    // the body, then the head on its neck, each at its own size
    ctx.save();
    ctx.imageSmoothingEnabled = state.smooth ?? kb * px < 1;
    ctx.scale(kb, kb);
    const [, , bw, bh, box, boy] = A.frames[step.body];
    if (perch) ctx.drawImage(this.body(step.body, look), 0, 0, bw, bh - perch, box, boy + perch, bw, bh - perch);
    else ctx.drawImage(this.body(step.body, look), box, boy);
    ctx.restore();
    ctx.translate(step.hx * kb, (step.hy + perch) * kb);
    ctx.imageSmoothingEnabled = state.smooth ?? kh * px < 1;
    ctx.scale(kh, kh);
    // what is worn (lib/town/wear), in the head's place: at the neck under the face; glasses, the hair clip and the
    // hat over the hair (glasses under it, their far lens was lost behind the side hair and read as a monocle: the
    // owner, 2026-10-17, "แว่นกันแดดยังไม่ดี"); the hair under a hat is cut at its brim
    const W = A.wear, worn = (slot: "hat" | "face" | "neck" | "hair", id: string | null) => (id ? W?.[slot]?.[id] : undefined);
    const hatId = wornId(HATS, look.hat), hat = worn("hat", hatId);
    const lay = (name: string | undefined) => { if (!name || !A.frames[name]) return; const [, , , , ox, oy] = A.frames[name]; ctx.drawImage(this.plain(name), ox, oy); };
    lay(worn("neck", wornId(NECK_WEAR, look.neck))?.[view]);
    const [, , , , fox, foy] = A.frames[shown];
    ctx.drawImage(face, fox, foy);
    if (ex?.keep) { const [, , , , eox, eoy] = A.frames[ex.face]; ctx.drawImage(this.face(ex.face, look)[0], eox, eoy); }
    if (hairName) {
      const [, , , , hox, hoy] = A.frames[hairName];
      const clip = hat?.[view] ? hat.clip?.[view] : undefined;
      ctx.drawImage(clip ? this.hairUnder(hairName, look, hatId!, view, clip) : this.hair(hairName, look), hox, hoy);
    }
    lay(worn("face", wornId(FACE_WEAR, look.faceWear))?.[view]);
    // (a thing on top of the head is not worn under a hat: lib/town/wear's together; a look that says both shows the hat)
    if (!(hatId && onTop(look.hairWear))) lay(worn("hair", wornId(HAIR_WEAR, look.hairWear))?.[view]);
    lay(hat?.[view]);
    ctx.restore();
  }
}

const kits = new Map<number, Promise<PixelKit>>();

/** A race's pixel kit (the Lalafell's by default), fetched once per tab: one picture and its map. */
export function loadPixelKit(race = 0): Promise<PixelKit> {
  let kit = kits.get(race);
  if (kit) return kit;
  const atlas = RACES[race]?.atlas ?? RACES[0].atlas;
  kit = (async () => {
    const r = await fetch(atlas);
    if (!r.ok) throw new Error(`${atlas} ${r.status}`);
    const json = await r.json() as AtlasJson;
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    return new PixelKit(json, img, race);
  })();
  kits.set(race, kit);
  // A failed fetch may be tried again later rather than remembered.
  kit.catch(() => { kits.delete(race); });
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
