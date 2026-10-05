"use client";

import { BEYOND, COLS, FARM, FOREST, ROWS, TILE_H, TILE_W, fromIso, groundLook, seenAt } from "./world";

/**
 * Cash Town's scenery in pixel art: the ground and what stands on it (trees,
 * lamps, benches, flowers, the fountain), from one picture in public/town made
 * by the fc-cash-town skill's scripts/pixel/build-scenery.mjs, at the
 * characters' own pixel size.
 *
 * The ground comes as top-down textures (grass, cobbles, a dirt path). They
 * are laid onto the isometric map pixel by pixel, at one picture pixel per
 * isometric pixel, in square chunks laid as they come into view (the whole
 * 64 × 64 map at once would be a 4096 × 2048 picture, too much for a phone).
 * Each point takes its texture at its own place on the map, so the ground runs
 * on with no seams; what kind of ground a point is comes from the world's
 * shapes (groundLook), not its tiles, so a path's bend or the river's bank is
 * a curve, and where the kind changes the edge is shaded a little.
 *
 * The fountain's water moves: four frames drawn together by the image model
 * (the jet rising and falling, splashes, ripples), played there and back, with
 * the stone the same in all of them. A picture without them falls back to
 * cycling the one fountain's blues.
 *
 * The forest's things are in a picture of their own (public/town/forest.json,
 * the same script's `--set forest`), fetched only by somebody who goes that way
 * (loadForest) and added to this one: nobody who stays in town pays for it.
 */

type Piece = [x: number, y: number, w: number, h: number, ax: number, ay: number];

/** A prop in the scenery picture: the picture, its size, and the prop's box in it. */
export interface Sprite { src: string; sheet: [number, number]; at: [x: number, y: number, w: number, h: number] }

interface SceneryJson {
  v: 1;
  image: string;
  size: [number, number];
  /** Props: where in the picture, and their ground point (bottom middle). */
  props: Record<string, Piece>;
  /**
   * `field` (the farm's plots) is missing from a picture built before the farm: its plots are then laid in the path's
   * earth. `wood` (the forest's floor) is the forest picture's: until that has come it is laid in grass.
   */
  textures: Partial<Record<(typeof KINDS)[number], [x: number, y: number, w: number, h: number]>>;
}

/** Texture pixels along a tile's side: a 64×32 diamond holds as many pixels as a 32×32 square. */
const PER_TILE = Math.sqrt((TILE_W * TILE_H) / 2);
/** The ground's chunks: their side in isometric pixels, how many are kept, how many are laid in one frame. */
const CHUNK = 512;
const CHUNKS_KEPT = 24;
const LAY_PER_FRAME = 2;
/** The ground's kind is worked out once per eighth of a tile, then remembered. */
const SUB = 8;
const KINDS = ["grass", "plaza", "road", "water", "sand", "field", "wood"] as const;
/** What a kind is laid in while its own texture is missing. */
const STAND_IN: Partial<Record<(typeof KINDS)[number], (typeof KINDS)[number]>> = { field: "road", wood: "grass" };
/** The maps, each with its own grid of remembered kinds: the town's, the farm's, the forest's; and the woods seen beyond the town's north gate and the forest's own (ground to look at, on no map). */
const MAPS = [{ x: 0, y: 0, w: COLS, h: ROWS }, FARM, FOREST, BEYOND.north, BEYOND.south];
/** How dark the rim of a plot is laid: the ridge of earth between one plot and the next. */
const RIDGE = 0.085;

export class SceneryKit {
  /**
   * The isometric point at the ground's top-left corner, and the ground's size
   * in isometric pixels: the box round every map, the town's and the farm's and
   * the forest's far off from it. Most of it is nothing at all, and no chunk of
   * that is ever laid.
   */
  readonly origin = { x: Math.min(...MAPS.map((m) => m.x - m.y - m.h)) * (TILE_W / 2), y: Math.min(...MAPS.map((m) => m.x + m.y)) * (TILE_H / 2) };
  readonly size = {
    w: Math.max(...MAPS.map((m) => m.x + m.w - m.y)) * (TILE_W / 2) - this.origin.x,
    h: Math.max(...MAPS.map((m) => m.x + m.w + m.y + m.h)) * (TILE_H / 2) - this.origin.y,
  };
  private readonly img: HTMLImageElement;
  /** Pictures added to the first (the forest's): each with its own props. */
  private readonly more: Array<{ json: SceneryJson; img: HTMLImageElement }> = [];
  /** The fountain, its water a step further along in each. */
  private readonly fountain: HTMLCanvasElement[] = [];
  private readonly tex: Record<(typeof KINDS)[number], { w: number; h: number; d: Uint8ClampedArray }>;
  /** The kind at each eighth of a tile, as 1 + its index in KINDS; 0 not worked out yet. A grid to a map (MAPS). */
  private readonly kinds = MAPS.map((m) => new Uint8Array(m.w * SUB * m.h * SUB));
  /** The ground is laid in square chunks, each when it first comes into view, a few kept. */
  private readonly chunks = new Map<string, HTMLCanvasElement>();

  constructor(readonly json: SceneryJson, img: HTMLImageElement) {
    this.img = img;
    const [W, H] = json.size;
    const src = document.createElement("canvas");
    src.width = W; src.height = H;
    const sg = src.getContext("2d", { willReadFrequently: true })!;
    sg.drawImage(img, 0, 0);
    this.tex = Object.fromEntries(KINDS.map((k) => {
      const [x, y, w, h] = json.textures[k] ?? json.textures[STAND_IN[k] ?? "road"]!;
      return [k, { w, h, d: sg.getImageData(x, y, w, h).data }];
    })) as SceneryKit["tex"];
    const fp = json.props.fountain;
    if (fp) for (const c of waterFrames(sg.getImageData(fp[0], fp[1], fp[2], fp[3]))) this.fountain.push(c);
  }

  /**
   * More scenery, from a picture of its own: its props are added to the first's, and its textures take the place of
   * what stood in for them (the ground laid so far is laid again).
   */
  add(json: SceneryJson, img: HTMLImageElement) {
    this.more.push({ json, img });
    const src = document.createElement("canvas");
    src.width = json.size[0]; src.height = json.size[1];
    const sg = src.getContext("2d", { willReadFrequently: true })!;
    sg.drawImage(img, 0, 0);
    for (const k of KINDS) {
      const t = json.textures[k];
      if (t) this.tex[k] = { w: t[2], h: t[3], d: sg.getImageData(t[0], t[1], t[2], t[3]).data };
    }
    this.chunks.clear();
    this.parts.clear();
  }

  /** A prop's piece and the picture it is in: the first picture's, or one added to it. */
  private piece(name: string): { p: Piece; img: HTMLImageElement } | null {
    const p = this.json.props[name];
    if (p) return { p, img: this.img };
    for (const m of this.more) if (m.json.props[name]) return { p: m.json.props[name], img: m.img };
    return null;
  }

  private kindAt(x: number, y: number): (typeof KINDS)[number] {
    // Each map's points are remembered apart: on its own grid, from its own corner. (A point of no map is asked
    // only as the neighbour of one at a map's edge: it is taken for the edge's.)
    let n = -1;
    // (a point is its own map's first: only one that is in none is given to the map it is beside)
    for (let i = 0; i < MAPS.length && n < 0; i++) if (x >= MAPS[i].x && y >= MAPS[i].y && x < MAPS[i].x + MAPS[i].w && y < MAPS[i].y + MAPS[i].h) n = i;
    for (let i = 0; i < MAPS.length && n < 0; i++) if (x >= MAPS[i].x - 1 && y >= MAPS[i].y - 1 && x < MAPS[i].x + MAPS[i].w + 1 && y < MAPS[i].y + MAPS[i].h + 1) n = i;
    if (n < 0) n = 0;
    const { x: ox, y: oy, w: cols, h: rows } = MAPS[n], kinds = this.kinds[n];
    const sx = Math.min(cols * SUB - 1, Math.max(0, Math.floor((x - ox) * SUB))), sy = Math.min(rows * SUB - 1, Math.max(0, Math.floor((y - oy) * SUB)));
    const k = sy * cols * SUB + sx;
    let v = kinds[k];
    if (!v) { v = KINDS.indexOf(groundLook(ox + (sx + 0.5) / SUB, oy + (sy + 0.5) / SUB)) + 1; kinds[k] = v; }
    return KINDS[v - 1];
  }

  /** One chunk of the ground, laid pixel by pixel from the textures. */
  private chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = `${cx},${cy}`;
    const known = this.chunks.get(key);
    if (known) { this.chunks.delete(key); this.chunks.set(key, known); return known; }
    const c = document.createElement("canvas");
    c.width = CHUNK; c.height = CHUNK;
    const g = c.getContext("2d")!;
    const out = g.createImageData(CHUNK, CHUNK), o = out.data;
    for (let py = 0; py < CHUNK; py++) for (let px = 0; px < CHUNK; px++) {
      const t = fromIso(this.origin.x + cx * CHUNK + px + 0.5, this.origin.y + cy * CHUNK + py + 0.5);
      if (!seenAt(t.x, t.y)) continue;
      const kind = this.kindAt(t.x, t.y), T = this.tex[kind];
      const u = ((Math.floor(t.x * PER_TILE) % T.w) + T.w) % T.w, v = ((Math.floor(t.y * PER_TILE) % T.h) + T.h) % T.h;
      const si = (v * T.w + u) * 4, di = (py * CHUNK + px) * 4;
      // a little shade along an edge where the ground changes kind (a verge, the river's bank)
      const e = 2 / PER_TILE;
      const edge = this.kindAt(t.x - e, t.y) !== kind || this.kindAt(t.x + e, t.y) !== kind
        || this.kindAt(t.x, t.y - e) !== kind || this.kindAt(t.x, t.y + e) !== kind;
      // and, in a field, along each plot's rim: the low ridge of earth between one plot and the next
      const fx = t.x - Math.floor(t.x), fy = t.y - Math.floor(t.y);
      const ridge = kind === "field" && (fx < RIDGE || fx > 1 - RIDGE || fy < RIDGE || fy > 1 - RIDGE);
      const k = edge ? 0.8 : ridge ? 0.7 : 1;
      o[di] = T.d[si] * k; o[di + 1] = T.d[si + 1] * k; o[di + 2] = T.d[si + 2] * k; o[di + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    this.chunks.set(key, c);
    if (this.chunks.size > CHUNKS_KEPT) this.chunks.delete(this.chunks.keys().next().value!);
    return c;
  }

  /**
   * Draw the ground seen through a camera (`s` screen pixels per isometric
   * pixel, `cx`, `cy` the isometric point in the middle of a `cw` × `ch`
   * screen). Chunks not laid yet are laid a few a frame, so a long walk never
   * stalls a frame.
   */
  drawGround(ctx: CanvasRenderingContext2D, cam: { s: number; cx: number; cy: number }, cw: number, ch: number, px = 1) {
    const { s } = cam;
    const ix0 = cam.cx - cw / 2 / s - this.origin.x, iy0 = cam.cy - ch / 2 / s - this.origin.y;
    const ix1 = ix0 + cw / s, iy1 = iy0 + ch / s;
    const nx = Math.ceil(this.size.w / CHUNK), ny = Math.ceil(this.size.h / CHUNK);
    let laid = 0;
    ctx.save();
    ctx.imageSmoothingEnabled = s * px < 1;
    for (let cy = Math.max(0, Math.floor(iy0 / CHUNK)); cy <= Math.min(ny - 1, Math.floor(iy1 / CHUNK)); cy++) {
      for (let cx = Math.max(0, Math.floor(ix0 / CHUNK)); cx <= Math.min(nx - 1, Math.floor(ix1 / CHUNK)); cx++) {
        if (!this.chunks.has(`${cx},${cy}`) && laid++ >= LAY_PER_FRAME) continue;
        const c = this.chunk(cx, cy);
        // whole device pixels at both edges, so neighbouring chunks never show a seam
        const x0 = Math.round(((cx * CHUNK - ix0) * s) * px) / px, y0 = Math.round(((cy * CHUNK - iy0) * s) * px) / px;
        const x1 = Math.round((((cx + 1) * CHUNK - ix0) * s) * px) / px, y1 = Math.round((((cy + 1) * CHUNK - iy0) * s) * px) / px;
        ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0);
      }
    }
    ctx.restore();
  }

  /** Whether the picture has this prop. */
  has(name: string): boolean { return name in this.json.props || this.more.some((m) => name in m.json.props); }

  /**
   * Draw a prop with its ground point at (x, y) on the canvas, one picture
   * pixel `scale` canvas units across; `px` is device pixels per unit.
   */
  /** Where a prop sits in the picture, for drawing it outside the map (a CSS sprite). */
  sprite(name: string): Sprite | null {
    const at = this.piece(name);
    if (!at) return null;
    const sheet = at.img === this.img ? this.json.size : this.more.find((m) => m.img === at.img)!.json.size;
    return { src: at.img.src, sheet, at: [at.p[0], at.p[1], at.p[2], at.p[3]] };
  }

  /** Water that moves in a prop of an added picture (the forest's waterfall), as the fountain's does: its frames, made once. */
  private readonly moving = new Map<string, HTMLCanvasElement[]>();
  private framesOf(name: string): HTMLCanvasElement[] {
    let frames = this.moving.get(name);
    if (!frames) {
      frames = [];
      const at = this.piece(name);
      try {
        if (at) {
          const [sx, sy, w, h] = at.p, c = document.createElement("canvas");
          c.width = w; c.height = h;
          const g = c.getContext("2d", { willReadFrequently: true })!;
          g.drawImage(at.img, sx, sy, w, h, 0, 0, w, h);
          frames = waterFrames(g.getImageData(0, 0, w, h));
        }
      } catch { /* a picture that cannot be read back stands still */ }
      this.moving.set(name, frames);
    }
    return frames;
  }

  /** Where a prop stands in its picture: its ground point, from the picture's top-left corner. */
  anchorOf(name: string): [number, number] {
    const p = this.piece(name)?.p;
    return p ? [p[4], p[5]] : [0, 0];
  }

  /** A prop's size in picture pixels: [width, height]. */
  sizeOf(name: string): [number, number] {
    const p = this.piece(name)?.p;
    return p ? [p[2], p[3]] : [0, 0];
  }

  /** `skew` leans it from its foot, as wind does a tree: its top moves skew × its height sideways. */
  drawProp(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, scale: number, px = 1, now = 0, mirror = false, skew = 0) {
    if (name === "fountain" && this.json.props[FOUNTAIN_LOOP[0]]) name = FOUNTAIN_LOOP[Math.floor(now / FOUNTAIN_MS) % FOUNTAIN_LOOP.length];
    const at = this.piece(name);
    if (!at) return;
    const [sx, sy, w, h, ax, ay] = at.p;
    const flows = name === "fountain" ? this.fountain : FLOWING.includes(name) && now ? this.framesOf(name) : [];
    const frame = flows.length ? flows[Math.floor(now / WATER_MS) % flows.length] : null;
    ctx.save();
    ctx.imageSmoothingEnabled = scale * px < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(Math.round(x * px) / px, Math.round(y * px) / px);
    if (mirror) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    if (skew) ctx.transform(1, 0, mirror ? skew : -skew, 1, 0, 0);
    if (frame) ctx.drawImage(frame, -ax, -ay);
    else ctx.drawImage(at.img, sx, sy, w, h, -ax, -ay, w, h);
    ctx.restore();
  }

  /** Parts of props cut out to be drawn again (drawPart), by the prop and the part. */
  private readonly parts = new Map<string, HTMLCanvasElement | null>();

  /**
   * Draw a part of a prop where it is in the whole, the prop's ground point
   * being at (x, y): `box` is the part, in the prop's own pixels from its
   * ground point (left, top, right, bottom). For a prop that people stand on
   * (the cooking yard): what stands on it is drawn again, each piece as far
   * forward as its own foot, over whoever stands behind it. Only the thing
   * itself is: the grey stone of the ground in the part is left out, so that
   * nobody's legs go behind a floor.
   */
  drawPart(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, scale: number, px: number, box: readonly [number, number, number, number]) {
    const at = this.piece(name);
    if (!at) return;
    const [sx, sy, w, h, ax, ay] = at.p;
    const x0 = Math.max(0, Math.floor(box[0] + ax)), y0 = Math.max(0, Math.floor(box[1] + ay));
    const x1 = Math.min(w, Math.ceil(box[2] + ax)), y1 = Math.min(h, Math.ceil(box[3] + ay));
    if (x1 <= x0 || y1 <= y0) return;
    const key = `${name}:${x0},${y0},${x1},${y1}`;
    let part = this.parts.get(key);
    if (part === undefined) {
      part = null;
      try {
        const cut = document.createElement("canvas");
        cut.width = x1 - x0;
        cut.height = y1 - y0;
        const c = cut.getContext("2d", { willReadFrequently: true })!;
        c.drawImage(at.img, sx + x0, sy + y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        const data = c.getImageData(0, 0, cut.width, cut.height), d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const hi = Math.max(d[i], d[i + 1], d[i + 2]), lo = Math.min(d[i], d[i + 1], d[i + 2]);
          // stone: hardly any colour in it, and not dark (an outline, an iron pot)
          if (hi > 96 && hi - lo < hi * 0.14) d[i + 3] = 0;
        }
        c.putImageData(data, 0, 0);
        part = cut;
      } catch { /* a picture that cannot be read back is not drawn again: whoever stands behind is only not hidden */ }
      this.parts.set(key, part);
    }
    if (!part) return;
    ctx.save();
    ctx.imageSmoothingEnabled = scale * px < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(Math.round(x * px) / px, Math.round(y * px) / px);
    ctx.scale(scale, scale);
    ctx.drawImage(part, x0 - ax, y0 - ay);
    ctx.restore();
  }
}

/** The fountain's drawn frames, there and back, and how long each shows. */
const FOUNTAIN_LOOP = ["fountain_a1", "fountain_a2", "fountain_a3", "fountain_a4", "fountain_a3", "fountain_a2"];
const FOUNTAIN_MS = 150;
/** How long each step of the cycled water shows (a picture without the drawn frames). */
const WATER_MS = 130;
/** The props of an added picture whose water moves the same way. */
const FLOWING = ["waterfall"];
const WATER_FRAMES = 6;

/**
 * The fountain in WATER_FRAMES frames. Water is its blues and the near-white
 * spray; each water pixel takes a shade a step lighter or darker than its own,
 * in bands that move down over time (falling) and, low in the basin, sideways
 * (ripples). Nothing else in the picture changes.
 */
function waterFrames(src: ImageData): HTMLCanvasElement[] {
  const { width: w, height: h, data } = src;
  const shades: Array<[number, number, number, number]> = [];
  const pick = new Map<string, number>();
  const water: Array<[number, number, number]> = []; // pixel index, x, y
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (!data[i + 3]) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510;
    const blue = b > r + 25 && b >= g && (mx - mn) / 255 > 0.18;
    const spray = l > 0.82 && b >= r && b >= g - 4;
    if (!blue && !spray) continue;
    const k = `${r},${g},${b}`;
    if (!pick.has(k)) { pick.set(k, shades.length); shades.push([r, g, b, l]); }
    water.push([i, p % w, Math.floor(p / w)]);
  }
  const order = shades.map((c, i) => [c[3], i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const rank = new Map(order.map((i, r) => [i, r]));
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < WATER_FRAMES; f++) {
    const d = new Uint8ClampedArray(data);
    for (const [i, x, y] of water) {
      const r0 = rank.get(pick.get(`${data[i]},${data[i + 1]},${data[i + 2]}`)!)!;
      // falling in the upper part, rippling across the basin lower down
      const band = y < h * 0.62 ? Math.floor((y - f * 2) / 3) : Math.floor((x + y * 2 - f * 3) / 4);
      const step = ((band % 3) + 3) % 3 - 1;
      const c = shades[order[Math.max(0, Math.min(order.length - 1, r0 + step))]];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d")!.putImageData(new ImageData(d, w, h), 0, 0);
    out.push(cv);
  }
  return out;
}

let kit: Promise<SceneryKit> | null = null;

/** The scenery, fetched and laid out once per tab. */
export function loadScenery(): Promise<SceneryKit> {
  kit ??= (async () => {
    const r = await fetch("/town/scenery.json");
    if (!r.ok) throw new Error(`scenery.json ${r.status}`);
    const json = await r.json() as SceneryJson;
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    return new SceneryKit(json, img);
  })();
  kit.catch(() => { kit = null; });
  return kit;
}

let forest: Promise<void> | null = null;

/** The forest's picture, fetched once per tab by whoever goes that way, and added to the scenery. */
export function loadForest(): Promise<void> {
  forest ??= (async () => {
    const into = await loadScenery();
    const r = await fetch("/town/forest.json");
    if (!r.ok) throw new Error(`forest.json ${r.status}`);
    const json = await r.json() as SceneryJson;
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    into.add(json, img);
  })();
  forest.catch(() => { forest = null; });
  return forest;
}
