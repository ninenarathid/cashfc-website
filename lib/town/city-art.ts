/**
 * The city drawn (lib/town/city): its placed things, from their own pictures (public/town/city, one webp a picture, cut to
 * what is drawn of it), back to front with the walkers, as the editor's town's and farm's are (lib/town/town2-art,
 * farm2-art): a picture is fetched only when its thing comes within half a screen of the view, and let go a while after
 * it has been out of view, so what a page holds is what is about it (some 28 MB on a desktop's screen, 12 on a phone's,
 * as the editor's town held; 160 MB if the whole city were held at once).
 *
 * How a thing stands among the walkers (city-map.json's own word for it, from the builder):
 * - on the floor, under everybody (the gates' rings);
 * - in the order of its middle (most things);
 * - in upright strips, each as far forward as the footprint's front edge below it (a building; a stretch of raised or
 *   sunk ground at its row, README §11, less where the editor draws something standing on it in front of that);
 * - a length of fence on a tile's edge, in strips as far forward as its edge's line (README §6's rule for walls);
 * - a room's outside, as a building, but not for whoever is in that room; its cut-away inside only for whoever is in it,
 *   in strips at its back walls (so that whoever stands on its floor is in front of them, and whoever is behind it,
 *   outside, behind them);
 * - a chest open, only while its storage box is open (the game says which: `opened`).
 * Every picture already stands as high as the ground under it (the builder raised or sank it with its `lift`): the
 * ground's height that the page lays on whatever else stands at a tile (Town.tsx's HILL) is not laid on these again.
 * The fences' shadows lie on the ground under everything (README §8), cut into squares fetched as they come near.
 */
import { FLAT, SWAY, swayPx } from "@/lib/town-hd/sway";
import MAP from "./city-map.json";
import { WATER_MS, waterFrames } from "./scenery";
import { T2_ROOMS, t2RoomAt } from "./city";
import type { Vec } from "./world";

const FLOOR = 0, STAND = 1, WIDE = 2, EDGE = 3, ROLE = 4, OUTSIDE = 5, INSIDE = 6;
const STRIP = 12;
const LET_GO_MS = 10_000;
const DIR = "/town/city/";
/** Things whose water moves, as the editor's town's fountain's does: the park's fountain. */
const FLOWING = /potato_park_fountain/;
/** What never sways, whatever its name says: lamps, posts, signs, boards, seats, fences. */
const STILL = /lamp|street|post|sign|board|bench|chair|fence|stall|vending/;

interface Thing {
  i: number; name: string; s: number;
  x: number; y: number; k: number; flip: boolean; how: number;
  d: number; box: [number, number, number, number];
  rings?: Array<[number, number, string]>;
  wall?: [number, number, string];
  strips?: number[];
}
interface Sprite { src: string; w: number; h: number; img: HTMLImageElement | null; ready: boolean; seen: number }

const stripDepth = ([bx0, by0, bx1, by1]: readonly number[], mid: number) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
const edgeDepth = ([x, y, side]: readonly [number, number, string], mid: number) => (side === "n" ? mid / 32 + 2 * y : 2 * x - mid / 32);

export type Screen = (ix: number, iy: number) => Vec;
export type Push = (depth: number, draw: () => void) => void;

export class CityArt {
  readonly things: Thing[];
  private readonly byIndex: Thing[];
  private readonly sprites: Sprite[];
  private readonly shadows: Array<{ x: number; y: number; w: number; h: number; sp: Sprite }>;
  private ripples: HTMLImageElement | null = null;
  private ripplesReady = false;
  /** Which room's outside each thing is, and which room's inside (by the thing). */
  private readonly outsideOf = new Map<number, string>();
  private readonly insideOf = new Map<number, string>();
  /** Each room's inside, its strips' places back to front (its back walls', less where furniture stands against them). */
  private readonly insideStrips = new Map<number, number[]>();
  /** Where I stand (the page says each frame): the room I am in sees its inside. */
  here: Vec | null = null;
  /** The chest whose open picture is drawn (its shut picture's thing), while its storage box is open; else null. */
  opened: number | null = null;
  /** What the page's frame sets on the editor's town's art, here unused: the city has no pumpkins, no dressed tables, no 3D-lit things yet. */
  carving = false;
  dressed: { cloth: boolean; cushions: boolean } = { cloth: false, cushions: false };
  lit: unknown = null;
  solid: ((i: number) => boolean) | null = null;
  /** The made-up hills of the 3D town are not the city's: its pictures stand at its own heights already. */
  lift: ((x: number, y: number) => number) | null = null;
  sway: { sec: number; me: { x: number; y: number } | null } | null = null;
  private now = 0;
  private lastLetGo = 0;
  /** Each flowing thing's picture in its frames, made once its picture has come (dropped with it). */
  private readonly flowing = new Map<number, HTMLCanvasElement[]>();
  private lastSeen: Thing[] = [];

  constructor() {
    const rings = MAP.rings as unknown as Record<string, Array<[number, number, string]>>;
    const walls = MAP.walls as unknown as Record<string, [number, number, string]>;
    const strips = MAP.strips as unknown as Record<string, number[]>;
    this.sprites = (MAP.sprites as Array<[string, number, number]>).map(([src, w, h]) => ({ src: DIR + src, w, h, img: null, ready: false, seen: 0 }));
    this.byIndex = (MAP.objects as number[][]).map((o, i) => ({
      i, name: MAP.names[o[0]], s: o[1], x: o[2], y: o[3], k: o[4], flip: o[5] === 1, how: o[6], d: o[7],
      box: [o[8], o[9], o[10], o[11]] as [number, number, number, number], rings: rings[i], wall: walls[i], strips: strips[i],
    }));
    this.things = this.byIndex;
    for (const r of T2_ROOMS) { this.outsideOf.set(r.out, r.name); this.insideOf.set(r.in, r.name); }
    // a room's inside, drawn from within at its back walls: but never over what stands against them (the kitchen's
    // worktable stands half over its back wall's line, and its inside covered it: the owner, 2026-11-23, "ห้องครัว ส่วนนี้ หาย")
    for (const r of T2_ROOMS) {
      const t = this.byIndex[r.in];
      if (!t) continue;
      const [x0, y0, x1, y1] = r.box, sp = this.sprites[t.s];
      const inRoom = this.byIndex.filter((q) => q.i !== r.in && q.i !== r.out && (q.how === STAND || q.how === WIDE || q.how === ROLE)
        && (q.box[0] + q.box[2]) / 2 > x0 - 0.6 && (q.box[0] + q.box[2]) / 2 < x1 && (q.box[1] + q.box[3]) / 2 > y0 - 0.6 && (q.box[1] + q.box[3]) / 2 < y1);
      const nearest = (q: Thing) => (q.how === WIDE ? Math.min(...(q.strips ?? Array.from({ length: Math.ceil((this.sprites[q.s].w * q.k) / STRIP) }, (_, n) => stripDepth(q.box, q.x + n * STRIP + STRIP / 2)))) : q.d);
      const out: number[] = [];
      for (let x = t.x; x < t.x + sp.w * t.k; x += STRIP) {
        const u = (x + STRIP / 2) / 32;
        let d = u >= x0 - y0 ? u + 2 * y0 : 2 * x0 - u;
        for (const q of inRoom) { const qw = this.sprites[q.s].w * q.k; if (q.x < x + STRIP && q.x + qw > x) d = Math.min(d, nearest(q) - 0.01); }
        out.push(d);
      }
      this.insideStrips.set(r.in, out);
    }
    this.shadows = (MAP.shadows as Array<[number, number, number, number, string]>).map(([x, y, w, h, src]) => ({ x, y, w, h, sp: { src: DIR + src, w, h, img: null, ready: false, seen: 0 } }));
  }

  /** How much is held now: pictures fetched, and what they come to decoded (bytes). */
  memory(): { pictures: number; bytes: number; of: number } {
    let n = 0, bytes = 0;
    for (const s of [...this.sprites, ...this.shadows.map((q) => q.sp)]) if (s.img) { n++; bytes += s.w * s.h * 4; }
    return { pictures: n, bytes, of: this.sprites.length + this.shadows.length };
  }

  /** A thing's box on the screen (its picture's), for taps. */
  boxOf(i: number, screen: Screen, s: number): { x0: number; y0: number; x1: number; y1: number } | null {
    const t = this.byIndex[i];
    if (!t) return null;
    const sp = this.sprites[t.s], a = screen(t.x, t.y);
    return { x0: a.x, y0: a.y, x1: a.x + sp.w * t.k * s, y1: a.y + sp.h * t.k * s };
  }

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
    this.sprites.forEach((sp, i) => { if (sp.img && now - sp.seen > LET_GO_MS) { sp.img.src = ""; sp.img = null; sp.ready = false; this.flowing.delete(i); } });
    for (const { sp } of this.shadows) if (sp.img && now - sp.seen > LET_GO_MS) { sp.img.src = ""; sp.img = null; sp.ready = false; }
  }

  /** The room I am in, if any. */
  private roomHere(): string | null {
    const p = this.here;
    return p ? t2RoomAt(Math.floor(p.x), Math.floor(p.y))?.name ?? null : null;
  }

  /** The things worth drawing this frame: those whose pictures meet the view; half a screen beyond, asked for now. */
  visible(view: { x0: number; y0: number; x1: number; y1: number }, now: number): Thing[] {
    this.now = now;
    const w = view.x1 - view.x0, h = view.y1 - view.y0, out: Thing[] = [], room = this.roomHere();
    for (const t of this.things) {
      // (a room's inside only for whoever is in it; its outside for everybody else; a chest open only while it is)
      if (t.how === INSIDE && this.insideOf.get(t.i) !== room) continue;
      if (t.how === OUTSIDE && this.outsideOf.get(t.i) === room) continue;
      if (t.how === ROLE) continue;
      const sp = this.sprites[t.s], x1 = t.x + sp.w * t.k, y1 = t.y + sp.h * t.k;
      if (x1 < view.x0 - w / 2 || t.x > view.x1 + w / 2 || y1 < view.y0 - h / 2 || t.y > view.y1 + h / 2) continue;
      const near = !(x1 < view.x0 || t.x > view.x1 || y1 < view.y0 || t.y > view.y1);
      if (this.want(sp, now) && near) out.push(t);
    }
    // the open chest, in place of the shut one
    if (this.opened !== null) {
      const open = this.openOf(this.opened);
      if (open && this.want(this.sprites[open.s], now)) out.push(open);
    }
    for (const q of this.shadows) {
      if (q.x + q.w < view.x0 - w / 2 || q.x > view.x1 + w / 2 || q.y + q.h < view.y0 - h / 2 || q.y > view.y1 + h / 2) continue;
      this.want(q.sp, now);
    }
    if (now - this.lastLetGo > 5000) { this.lastLetGo = now; this.letGo(now); }
    this.lastSeen = out;
    return out;
  }
  /** A shut chest's open picture: the role thing on the same spot. */
  private openOf(shut: number): Thing | null {
    const a = this.byIndex[shut];
    if (!a) return null;
    return this.byIndex.find((t) => t.how === ROLE && Math.abs(t.box[0] - a.box[0]) < 0.6 && Math.abs(t.box[1] - a.box[1]) < 0.6) ?? null;
  }

  private leanOf(t: Thing, sp: Sprite, s: number): number {
    // (what grows sways; a street lamp's picture is named "street", which has "tree" in it: posts, lamps, signs and seats stand
    // still, the owner, 2026-11-23, "เสาไฟ ไม่ควรจะพริ้วไหวตามสายลม")
    if (!this.sway || t.how !== STAND || !SWAY.test(t.name) || STILL.test(t.name) || FLAT.test(t.name)) return 0;
    const ix = t.x + (sp.w * t.k) / 2, iy = t.y + sp.h * t.k;
    return swayPx((ix / 32 + iy / 16) / 2, (iy / 16 - ix / 32) / 2, sp.w * t.k, this.sway.sec, this.sway.me) * s;
  }

  private paint(ctx: CanvasRenderingContext2D, t: Thing, screen: Screen, s: number, px: number, strip?: [number, number]) {
    const sp = this.sprites[t.s];
    if (!sp.img || !sp.ready) return;
    const k = t.k * s, a = screen(t.x, t.y);
    let pic: CanvasImageSource = sp.img;
    if (FLOWING.test(t.name) && this.now) {
      let frames = this.flowing.get(t.s);
      if (!frames) {
        frames = [];
        try {
          const c = document.createElement("canvas");
          c.width = sp.w; c.height = sp.h;
          const g = c.getContext("2d", { willReadFrequently: true })!;
          g.drawImage(sp.img, 0, 0);
          frames = waterFrames(g.getImageData(0, 0, sp.w, sp.h));
        } catch { /* a picture that cannot be read back stands still */ }
        this.flowing.set(t.s, frames);
      }
      if (frames.length) pic = frames[Math.floor(this.now / WATER_MS) % frames.length];
    }
    let sx0 = 0, sx1 = sp.w;
    if (strip) {
      const c0 = (strip[0] - t.x) / t.k, c1 = (strip[1] - t.x) / t.k;
      sx0 = Math.max(0, Math.floor(t.flip ? sp.w - c1 : c0));
      sx1 = Math.min(sp.w, Math.ceil(t.flip ? sp.w - c0 : c1));
      if (sx1 <= sx0) return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = k * px < 1;
    ctx.imageSmoothingQuality = "high";
    const X = Math.round(a.x * px) / px, Y = Math.round(a.y * px) / px;
    const lean = strip ? 0 : this.leanOf(t, sp, s), foot = Y + sp.h * k;
    if (strip) {
      // (a strip is cut on the screen, its edges on whole device pixels, and drawn from a little more of the picture than
      // it shows: strips side by side then meet with neither a gap nor an overlap, and no seam shows down a building)
      const e0 = Math.round(screen(strip[0], t.y).x * px) / px, e1 = Math.round(screen(strip[1], t.y).x * px) / px;
      ctx.beginPath();
      ctx.rect(e0, Y - 1, e1 - e0, sp.h * k + 2);
      ctx.clip();
      sx0 = Math.max(0, sx0 - 2); sx1 = Math.min(sp.w, sx1 + 2);
    }
    if (lean) { ctx.translate(0, foot); ctx.transform(1, 0, -lean / (sp.h * k), 1, 0, 0); ctx.translate(0, -foot); }
    if (t.flip) {
      ctx.translate(X + sp.w * k, Y);
      ctx.scale(-1, 1);
      ctx.drawImage(pic, sx0, 0, sx1 - sx0, sp.h, sx0 * k, 0, (sx1 - sx0) * k, sp.h * k);
    } else {
      // (every screen pixel shows the picture's pixel under its middle, wherever the picture stands: its edges on whole
      // device pixels and the part of the picture taken to match, as the export's README §11 says. Rounded each on its
      // own, neighbouring pictures, the rows of raised and sunk ground, stood half a pixel apart and the ground under them
      // showed through in dotted lines: the owner, 2026-11-23, "แมพมีรอยต่อพื้นแปลกๆ")
      const kk = k * px, dx = a.x * px, dy = a.y * px;
      const X0 = Math.round(dx + sx0 * kk), X1 = Math.round(dx + sx1 * kk), Y0 = Math.round(dy), Y1 = Math.round(dy + sp.h * kk);
      if (X1 > X0 && Y1 > Y0) ctx.drawImage(pic, (X0 - dx) / kk, (Y0 - dy) / kk, (X1 - X0) / kk, (Y1 - Y0) / kk, X0 / px, Y0 / px, (X1 - X0) / px, (Y1 - Y0) / px);
    }
    ctx.restore();
  }

  private ripplesSheet(): HTMLImageElement | null {
    if (!this.ripples) {
      const img = new Image();
      img.onload = () => { this.ripplesReady = true; };
      img.src = DIR + MAP.ripples.src;
      this.ripples = img;
    }
    return this.ripplesReady ? this.ripples : null;
  }

  /** What lies on the ground, under everybody: the fences' shadows, the water's rings round whatever stands in it (moving), the rings of light. */
  drawFloor(ctx: CanvasRenderingContext2D, things: Thing[], screen: Screen, s: number, px: number, now: number, _inHall?: boolean) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const q of this.shadows) {
      if (!q.sp.img || !q.sp.ready) continue;
      const a = screen(q.x, q.y);
      ctx.drawImage(q.sp.img, Math.round(a.x * px) / px, Math.round(a.y * px) / px, q.w * s, q.h * s);
    }
    ctx.restore();
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

  /** Everything else that stands about, back to front with the walkers. */
  pushStanding(ctx: CanvasRenderingContext2D, things: Thing[], push: Push, screen: Screen, s: number, px: number, _inHall?: boolean) {
    for (const t of things) {
      if (this.solid?.(t.i)) continue;
      if (t.how === FLOOR) continue;
      if (t.how === STAND || t.how === ROLE) { push(t.d, () => this.paint(ctx, t, screen, s, px)); continue; }
      const sp = this.sprites[t.s];
      if (t.how === INSIDE) {
        // (from inside: at its back walls, the line x = x0 down its west wall, y = y0 along its north one)
        const ds = this.insideStrips.get(t.i);
        if (!ds) continue;
        for (let x = t.x, n = 0; x < t.x + sp.w * t.k; x += STRIP, n++) push(ds[n], () => this.paint(ctx, t, screen, s, px, [x, x + STRIP]));
        continue;
      }
      for (let x = t.x, n = 0; x < t.x + sp.w * t.k; x += STRIP, n++) {
        const mid = x + STRIP / 2, d = t.strips?.[n] ?? (t.how === EDGE && t.wall ? edgeDepth(t.wall, mid) : stripDepth(t.box, mid));
        push(d, () => this.paint(ctx, t, screen, s, px, [x, x + STRIP]));
      }
    }
  }

  /** The night's lights of the things last seen near the view: none of the city's buildings is lit yet (its lamps are the game's: lib/town/city's T2_LAMP_LIGHT). */
  lightsSeen(_but = -1): Array<[number, number, number]> { return []; }

  /** Whether a point is in one of the city's rooms. */
  static inRoom(p: Vec | null): boolean { return !!p && !!t2RoomAt(Math.floor(p.x), Math.floor(p.y)); }
  /** The things last seen near the view. */
  get seen(): Thing[] { return this.lastSeen; }
}
