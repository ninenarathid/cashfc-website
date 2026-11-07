/**
 * The editor's farm drawn (lib/town/farm2): its placed things, from their own pictures (public/town/farm2, one webp a
 * picture, cut to what is drawn of it), back to front with the walkers, as the editor's town's are (lib/town/town2-art):
 * a picture is fetched only when its thing comes within a screen of the view, and let go a while after it has been out of
 * view, so what a page holds is what is about it.
 *
 * How a thing stands among the walkers (farm2-map.json's own word for it, from the builder):
 * - on the floor, under everybody (the gates' rings, the pen's sand);
 * - in the order of its middle (most things);
 * - in upright strips (a glasshouse, the cheese house: anything too wide for one place in that order), each as far
 *   forward as the footprint's front edge below it;
 * - a length of fence on a tile's edge, in strips as far forward as its edge's line: whoever stands on its near side is in
 *   front of it, on its far side behind (the export's README, §6's rule for walls);
 * - what the game draws itself where and when what it stands for says (`role`): each barn in the look its owner has
 *   bought, shut, open, or from inside for whoever is in it; each animal's tray, full or empty; a chest open while its
 *   panel is; the fire bowls' lit pictures are never drawn (a fire is its bowl with the game's own flames rising in it).
 */
import MAP from "./farm2-map.json";
import { F2_DESIGNS, F2_SCARECROWS, F2_TRAYS } from "./farm2";
import type { Vec } from "./world";

const FLOOR = 0, STAND = 1, WIDE = 2, EDGE = 3, ROLE = 4;
/** How wide a strip of a wide thing is, in isometric pixels (lib/town/town2's T2_STRIP). */
const STRIP = 12;
/** Let a picture go once it has been out of view this long (ms). */
const LET_GO_MS = 10_000;

interface Thing {
  i: number; name: string; s: number;
  /** Where its picture's top-left is drawn, in isometric pixels, and how many of them a picture pixel is. */
  x: number; y: number; k: number; flip: boolean; how: number;
  /** Its place back to front (its middle's x + y), and its footprint. */
  d: number; box: [number, number, number, number];
  rings?: Array<[number, number, string]>;
  /** A length of fence: the tile edge it stands on (its tile's north edge, n, or west, w). */
  wall?: [number, number, string];
}
interface Sprite { src: string; w: number; h: number; img: HTMLImageElement | null; ready: boolean; seen: number }

const iso = (x: number, y: number) => ({ x: (x - y) * 32, y: (x + y) * 16 });
/** Where a strip of a thing with a footprint stands back to front: the footprint's front edge under its middle column (lib/town/town2's t2StripDepth). */
const stripDepth = ([bx0, by0, bx1, by1]: readonly number[], mid: number) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
/** Where a strip of a fence on an edge stands back to front: the edge's line under its middle column. */
const edgeDepth = ([x, y, side]: readonly [number, number, string], mid: number) => (side === "n" ? mid / 32 + 2 * y : 2 * x - mid / 32);

export type Screen = (ix: number, iy: number) => Vec;
export type Push = (depth: number, draw: () => void) => void;
/** A barn's look and how it is seen: from outside shut or open, or from inside. */
export type BarnSeen = "shut" | "open" | "inside";

export class Farm2Art {
  readonly things: Thing[];
  private readonly byIndex: Thing[];
  private readonly sprites: Sprite[];
  private ripples: HTMLImageElement | null = null;
  private ripplesReady = false;
  private readonly scarecrows = new Set(F2_SCARECROWS.map((s) => s.thing));

  constructor() {
    const rings = MAP.rings as unknown as Record<string, Array<[number, number, string]>>;
    const walls = MAP.walls as unknown as Record<string, [number, number, string]>;
    this.sprites = (MAP.sprites as Array<[string, number, number]>).map(([src, w, h]) => ({ src: `/town/farm2/${src}`, w, h, img: null, ready: false, seen: 0 }));
    this.byIndex = (MAP.objects as number[][]).map((o, i) => ({
      i, name: MAP.names[o[0]], s: o[1], x: o[2], y: o[3], k: o[4], flip: o[5] === 1, how: o[6], d: o[7],
      box: [o[8], o[9], o[10], o[11]] as [number, number, number, number], rings: rings[i], wall: walls[i],
    }));
    // (what the game draws itself is not among what stands about)
    this.things = this.byIndex.filter((t) => t.how !== ROLE);
  }

  /** How much is held now: pictures fetched, and what they come to decoded (bytes). */
  memory(): { pictures: number; bytes: number; of: number } {
    let n = 0, bytes = 0;
    for (const s of this.sprites) if (s.img) { n++; bytes += s.w * s.h * 4; }
    return { pictures: n, bytes, of: this.sprites.length };
  }

  /** A thing's box on the screen (its picture's), for taps; moved by (dx, dy) isometric pixels for a picture the game places. */
  boxOf(i: number, screen: Screen, s: number, dx = 0, dy = 0): { x0: number; y0: number; x1: number; y1: number } | null {
    const t = this.byIndex[i];
    if (!t) return null;
    const sp = this.sprites[t.s], a = screen(t.x + dx, t.y + dy);
    return { x0: a.x, y0: a.y, x1: a.x + sp.w * t.k * s, y1: a.y + sp.h * t.k * s };
  }

  /** Ask for a picture, if it is not here; it is drawn from the frame after it has come. */
  private want(sp: Sprite, now: number): boolean {
    sp.seen = now;
    if (sp.ready) return true;
    if (!sp.img) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { sp.ready = true; };
      img.src = sp.src;
      sp.img = img;
    }
    return false;
  }

  private letGo(now: number) {
    for (const sp of this.sprites) if (sp.img && now - sp.seen > LET_GO_MS) { sp.img.src = ""; sp.img = null; sp.ready = false; }
  }

  private lastLetGo = 0;
  private now = 0;
  /** The things worth drawing this frame: those whose pictures meet the view; half a screen beyond, asked for now. */
  visible(view: { x0: number; y0: number; x1: number; y1: number }, now: number): Thing[] {
    this.now = now;
    const w = view.x1 - view.x0, h = view.y1 - view.y0, out: Thing[] = [];
    for (const t of this.things) {
      const sp = this.sprites[t.s], x1 = t.x + sp.w * t.k, y1 = t.y + sp.h * t.k;
      if (x1 < view.x0 - w / 2 || t.x > view.x1 + w / 2 || y1 < view.y0 - h / 2 || t.y > view.y1 + h / 2) continue;
      const near = !(x1 < view.x0 || t.x > view.x1 || y1 < view.y0 || t.y > view.y1);
      if (this.want(sp, now) && near) out.push(t);
    }
    if (now - this.lastLetGo > 5000) { this.lastLetGo = now; this.letGo(now); }
    return out;
  }

  /** Draw a thing's picture (moved by dx, dy isometric pixels), or the strip of it between two isometric x's, at `alpha`. */
  private paint(ctx: CanvasRenderingContext2D, t: Thing, screen: Screen, s: number, px: number, strip?: [number, number], dx = 0, dy = 0, alpha = 1) {
    const sp = this.sprites[t.s];
    if (!sp.img || !sp.ready || alpha <= 0.01) return;
    const k = t.k * s, x = t.x + dx, a = screen(x, t.y + dy);
    let sx0 = 0, sx1 = sp.w;
    if (strip) {
      const c0 = (strip[0] - x) / t.k, c1 = (strip[1] - x) / t.k;
      sx0 = Math.max(0, Math.floor(t.flip ? sp.w - c1 : c0));
      sx1 = Math.min(sp.w, Math.ceil(t.flip ? sp.w - c0 : c1));
      if (sx1 <= sx0) return;
    }
    ctx.save();
    if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = k * px < 1;
    ctx.imageSmoothingQuality = "high";
    const X = Math.round(a.x * px) / px, Y = Math.round(a.y * px) / px;
    if (t.flip) {
      ctx.translate(X + sp.w * k, Y);
      ctx.scale(-1, 1);
      ctx.drawImage(sp.img, sx0, 0, sx1 - sx0, sp.h, sx0 * k, 0, (sx1 - sx0) * k, sp.h * k);
    } else ctx.drawImage(sp.img, sx0, 0, sx1 - sx0, sp.h, X + sx0 * k, Y, (sx1 - sx0) * k, sp.h * k);
    ctx.restore();
  }

  private ripplesSheet(): HTMLImageElement | null {
    if (!this.ripples) {
      const img = new Image();
      img.onload = () => { this.ripplesReady = true; };
      img.src = `/town/farm2/${MAP.ripples.src}`;
      this.ripples = img;
    }
    return this.ripplesReady ? this.ripples : null;
  }

  /** What lies on the ground, under everybody: the rings, the pen's sand, and the water's rings round whatever stands in it, moving. */
  drawFloor(ctx: CanvasRenderingContext2D, things: Thing[], screen: Screen, s: number, px: number, now: number) {
    const sheet = things.some((t) => t.rings) ? this.ripplesSheet() : null;
    if (sheet) {
      const frame = Math.floor((now / 1000) * MAP.ripples.fps) % MAP.ripples.frames;
      const sizes = MAP.ripples.sizes as unknown as Record<string, { frame: [number, number]; centre: [number, number]; back: number[]; front: number[] }>;
      ctx.save();
      ctx.imageSmoothingEnabled = s * px < 1;
      for (const t of things) for (const [x, y, size] of t.rings ?? []) {
        const r = sizes[size];
        if (!r) continue;
        const [fw, fh] = r.frame, a = screen(x - r.centre[0], y - r.centre[1]);
        for (const part of [r.back, r.front]) ctx.drawImage(sheet, part[0] + frame * fw, part[1], fw, fh, a.x, a.y, fw * s, fh * s);
      }
      ctx.restore();
    }
    for (const t of things) if (t.how === FLOOR) this.paint(ctx, t, screen, s, px);
  }

  /**
   * Everything else that stands about, back to front with the walkers. `seeThrough(thing)`, if given, is how much of a
   * scarecrow is drawn (1 all of it): one faded while whoever is behind it works the beds it stands before (the owner,
   * 2026-11-07: "ถ้าบังแปลงผัก ยังสามารถ interact กับแปลงผักข้างหลังได้").
   */
  pushStanding(ctx: CanvasRenderingContext2D, things: Thing[], push: Push, screen: Screen, s: number, px: number, seeThrough?: (thing: number) => number) {
    for (const t of things) {
      if (t.how === FLOOR) continue;
      if (t.how === STAND) {
        const alpha = seeThrough && this.scarecrows.has(t.i) ? seeThrough(t.i) : 1;
        push(t.d, () => this.paint(ctx, t, screen, s, px, undefined, 0, 0, alpha));
        continue;
      }
      const sp = this.sprites[t.s];
      for (let x = t.x; x < t.x + sp.w * t.k; x += STRIP) {
        const mid = x + STRIP / 2, d = t.how === EDGE && t.wall ? edgeDepth(t.wall, mid) : stripDepth(t.box, mid);
        push(d, () => this.paint(ctx, t, screen, s, px, [x, x + STRIP]));
      }
    }
  }

  /** Make sure a picture the game places itself is fetched; whether it is here to be drawn. */
  ready(i: number, now = this.now): boolean { const t = this.byIndex[i]; return !!t && this.want(this.sprites[t.s], now); }

  /**
   * A barn in a look (0..3, the game's facade), seen shut, open or from inside, where the barn stands (its footprint
   * x, y, w, h), at `alpha` (its outside going while whoever walks in goes in, its inside coming): from outside in strips
   * at its footprint's front edge, as the town's buildings are; from inside in strips at its back edge, so that whoever
   * stands on its floor is in front of its back walls and whoever is behind it, outside, behind them.
   */
  pushBarn(ctx: CanvasRenderingContext2D, push: Push, screen: Screen, s: number, px: number, b: { x: number; y: number; w: number; h: number }, look: number, seen: BarnSeen, alpha: number) {
    const d = F2_DESIGNS[Math.max(0, Math.min(F2_DESIGNS.length - 1, look | 0))];
    const t = this.byIndex[d[seen]];
    if (!t || alpha <= 0.01 || !this.ready(t.i)) return;
    const corner = iso(b.x, b.y), [ax, ay] = d.at[seen], dx = corner.x + ax - t.x, dy = corner.y + ay - t.y;
    const box: [number, number, number, number] = [b.x, b.y, b.x + b.w, b.y + b.h], sp = this.sprites[t.s];
    for (let x = t.x + dx; x < t.x + dx + sp.w * t.k; x += STRIP) {
      const mid = x + STRIP / 2, u = mid / 32;
      // (inside: its back edge, the line x = b.x down its west wall, y = b.y along its north one)
      const depth = seen === "inside" ? (u >= b.x - b.y ? u + 2 * b.y : 2 * b.x - u) : stripDepth(box, mid);
      push(depth, () => this.paint(ctx, t, screen, s, px, [x, x + STRIP], dx, dy, alpha));
    }
  }

  /** A barn's picture's box on the screen, shut, open or inside, where the barn stands (for its sign and taps). */
  barnBox(b: { x: number; y: number }, look: number, seen: BarnSeen, screen: Screen, s: number) {
    const d = F2_DESIGNS[Math.max(0, Math.min(F2_DESIGNS.length - 1, look | 0))], t = this.byIndex[d[seen]];
    if (!t) return null;
    const corner = iso(b.x, b.y), [ax, ay] = d.at[seen];
    return this.boxOf(t.i, screen, s, corner.x + ax - t.x, corner.y + ay - t.y);
  }

  /** An animal's food tray, full or empty, on its tile's middle (a point in tiles), back to front at `depth`. */
  pushTray(ctx: CanvasRenderingContext2D, push: Push, screen: Screen, s: number, px: number, at: Vec, full: boolean, depth: number, alpha = 1) {
    const tr = F2_TRAYS[full ? "full" : "empty"], t = this.byIndex[tr.thing];
    if (!t || !this.ready(t.i)) return;
    const c = iso(at.x, at.y), dx = c.x + tr.at[0] - t.x, dy = c.y + tr.at[1] - t.y;
    push(depth, () => this.paint(ctx, t, screen, s, px, undefined, dx, dy, alpha));
  }

  /** A thing the game draws in its own turn, where the map has it (a chest open), back to front at its own place. */
  pushThing(ctx: CanvasRenderingContext2D, push: Push, i: number, screen: Screen, s: number, px: number, alpha = 1) {
    const t = this.byIndex[i];
    if (!t || !this.ready(t.i)) return;
    push(t.d, () => this.paint(ctx, t, screen, s, px, undefined, 0, 0, alpha));
  }

  /** Where a thing's picture's top middle and its size are, isometric pixels (a lantern's light, a bowl's mouth). */
  pictureOf(i: number): { x: number; y: number; w: number; h: number } | null {
    const t = this.byIndex[i];
    if (!t) return null;
    const sp = this.sprites[t.s];
    return { x: t.x, y: t.y, w: sp.w * t.k, h: sp.h * t.k };
  }
}

let art: Farm2Art | null = null;
/** The page's one drawing of the editor's farm (Town.tsx draws what stands about; TownPasture its barns; TownLamps its fires). */
export const farm2Art = () => (art ??= new Farm2Art());
