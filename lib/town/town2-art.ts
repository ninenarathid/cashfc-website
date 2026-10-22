/**
 * The editor's town drawn (lib/town/town2): its placed things, from their own pictures (public/town/town2, one webp a
 * picture, cut to what is drawn of it), back to front with the walkers.
 *
 * Light on memory (the owner, 2026-10-22: "ช่วยทำให้กินหน่วยความจำน้อย"): a picture is fetched only when its thing
 * comes within a screen of the view, and let go a while after it has been out of view (the browser drops what it had
 * decoded), so what a page holds is what is about it, not the whole town (some 70 MB of pictures decoded, against the
 * old town's one 12 MB sheet). `memory()` says what is held now.
 *
 * How a thing stands among the walkers (town2-map.json's own word for it, from the builder):
 * - on the floor, under everybody (the rings, stepping stones, the decks people walk on); the hall's inside, while I am
 *   in it, and the stage stand in strips at their back edges (pushAtBack);
 * - in the order of its middle, as the editor draws it (most things);
 * - in upright strips (a building, the water wheel: anything too wide for one place in that order), each strip as far
 *   forward as the footprint's front edge below it, so that somebody beside a house is before or behind it as they stand.
 */
import MAP from "./town2-map.json";
import { WATER_MS, waterFrames } from "./scenery";
import { T2_CHEST_OPEN, T2_CHEST_SHUT, T2_HALL, T2_LEFT_OUT, T2_RING_MOVES, T2_STAGE, T2_STAGE_BASE, t2InHall } from "./town2";
import type { Vec } from "./world";

const FLOOR = 0, STAND = 1, WIDE = 2;
/** How narrow a strip of a wide thing is, in isometric pixels. */
const STRIP = 12;
/** The pumpkins and the carved ones, out only in their season (lib/town/decor's carving, 1 October to 2 November in Bangkok). */
const SEASONAL = /^game_(pumpkin|jacko)/;
/** Things whose water moves, as the old town's fountain's did: the plaza's fountain, the basin by the pond, the shrine's water pavilion. */
const FLOWING = /wishing_basin|temizuya/;
/** Let a picture go once it has been out of view this long (ms). */
const LET_GO_MS = 10_000;

interface Thing {
  i: number; name: string; s: number;
  /** Where its picture's top-left is drawn, in isometric pixels, and how many of them a picture pixel is. */
  x: number; y: number; k: number; flip: boolean; how: number;
  /** Its place back to front (its middle's x + y), and its footprint. */
  d: number; box: [number, number, number, number];
  /** Where its legs meet the water, if they do: isometric pixels and which rings. */
  rings?: Array<[number, number, string]>;
  /** What of it glows at night (its lanterns, its fire): isometric pixels and how big. */
  lights?: Array<[number, number, number]>;
}
interface Sprite { src: string; w: number; h: number; img: HTMLImageElement | null; ready: boolean; seen: number }

/** The isometric point of a tile point. */
const iso = (p: Vec) => ({ x: (p.x - p.y) * 32, y: (p.x + p.y) * 16 });

export type Screen = (ix: number, iy: number) => Vec;
export type Push = (depth: number, draw: () => void) => void;

export class Town2Art {
  readonly things: Thing[];
  private readonly sprites: Sprite[];
  private ripples: HTMLImageElement | null = null;
  /** Each flowing thing's picture in its frames, made once its picture has come (dropped with it). */
  private readonly flowing = new Map<number, HTMLCanvasElement[]>();
  /** The frame's time, for what moves. */
  private now = 0;
  /** Whether the pumpkins are out (the calendar's, or as `next dev` was asked). */
  carving = false;
  private ripplesReady = false;

  constructor() {
    const rings = MAP.rings as unknown as Record<string, Array<[number, number, string]>>;
    const lights = MAP.lights as unknown as Record<string, Array<[number, number, number]>>;
    this.sprites = (MAP.sprites as Array<[string, number, number]>).map(([src, w, h]) => ({ src: `/town/town2/${src}`, w, h, img: null, ready: false, seen: 0 }));
    this.things = (MAP.objects as number[][]).map((o, i) => ({
      i, name: MAP.names[o[0]], s: o[1], x: o[2], y: o[3], k: o[4], flip: o[5] === 1, how: o[6], d: o[7],
      box: [o[8], o[9], o[10], o[11]] as [number, number, number, number], rings: rings[i], lights: lights[i],
    })).filter((t) => !T2_LEFT_OUT.has(t.i));
    // the chest's open picture stood where the closed one is (the editor laid it two tiles off: the owner, 2026-10-22, "ตอน
    // เปิด มันไม่ขยับออกจากตำแหน่งเดิม"): the same bottom, the same middle, the same place back to front
    const shut = this.things.find((q) => q.i === T2_CHEST_SHUT), open = this.things.find((q) => q.i === T2_CHEST_OPEN);
    if (shut && open) {
      const a = this.sprites[shut.s], b = this.sprites[open.s];
      open.x = shut.x + (a.w * shut.k - b.w * open.k) / 2;
      open.y = shut.y + a.h * shut.k - b.h * open.k;
      open.d = shut.d; open.box = shut.box; open.how = shut.how;
    }
    // the west bridges' rings, from the bridges' feet to their far ends (where the way on is), on the boards
    for (const m of T2_RING_MOVES) {
      const t = this.things.find((q) => q.i === m.i);
      if (!t) continue;
      const was = { x: (t.box[0] + t.box[2]) / 2, y: (t.box[1] + t.box[3]) / 2 }, a = iso(was), b = iso(m.to);
      t.x += b.x - a.x; t.y += b.y - a.y - 17;
      t.box = [m.to.x - 0.9, m.to.y - 0.9, m.to.x + 0.9, m.to.y + 0.9];
    }
  }

  /** How much is held now: pictures fetched, and what they come to decoded (bytes). */
  memory(): { pictures: number; bytes: number; of: number } {
    let n = 0, bytes = 0;
    for (const s of this.sprites) if (s.img) { n++; bytes += s.w * s.h * 4; }
    return { pictures: n, bytes, of: this.sprites.length };
  }

  /** A thing's box on the screen (its picture's), for taps. */
  boxOf(i: number, screen: Screen, s: number): { x0: number; y0: number; x1: number; y1: number } | null {
    const t = this.things.find((q) => q.i === i);
    if (!t) return null;
    const sp = this.sprites[t.s], a = screen(t.x, t.y);
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

  /** Let go of the pictures nothing near the view has drawn for a while. */
  private letGo(now: number) {
    this.sprites.forEach((sp, i) => { if (sp.img && now - sp.seen > LET_GO_MS) { sp.img.src = ""; sp.img = null; sp.ready = false; this.flowing.delete(i); } });
  }

  private lastLetGo = 0;
  /**
   * The things worth drawing this frame: those whose pictures meet the view (isometric pixels), and, half a screen beyond,
   * those about to: their pictures are asked for now, so they are there by the time they come into view.
   */
  visible(view: { x0: number; y0: number; x1: number; y1: number }, now: number): Thing[] {
    this.now = now;
    const w = view.x1 - view.x0, h = view.y1 - view.y0, out: Thing[] = [];
    for (const t of this.things) {
      if (!this.carving && SEASONAL.test(t.name)) continue;
      const sp = this.sprites[t.s], x1 = t.x + sp.w * t.k, y1 = t.y + sp.h * t.k;
      if (x1 < view.x0 - w / 2 || t.x > view.x1 + w / 2 || y1 < view.y0 - h / 2 || t.y > view.y1 + h / 2) continue;
      const near = !(x1 < view.x0 || t.x > view.x1 || y1 < view.y0 || t.y > view.y1);
      if (this.want(sp, now) && near) out.push(t);
    }
    if (now - this.lastLetGo > 5000) { this.lastLetGo = now; this.letGo(now); }
    this.lastSeen = out;
    return out;
  }

  /** Draw a thing's picture, or the strip of it between two isometric x's. */
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
      // the strip's columns of the picture (mirrored, counted from its right)
      const c0 = (strip[0] - t.x) / t.k, c1 = (strip[1] - t.x) / t.k;
      sx0 = Math.max(0, Math.floor(t.flip ? sp.w - c1 : c0));
      sx1 = Math.min(sp.w, Math.ceil(t.flip ? sp.w - c0 : c1));
      if (sx1 <= sx0) return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = k * px < 1;
    ctx.imageSmoothingQuality = "high";
    const dx = Math.round(a.x * px) / px, dy = Math.round(a.y * px) / px;
    if (t.flip) {
      ctx.translate(dx + sp.w * k, dy);
      ctx.scale(-1, 1);
      // (mirrored, picture column c lands at w − c from the left: the columns' own place in the mirrored frame is c itself)
      ctx.drawImage(pic, sx0, 0, sx1 - sx0, sp.h, sx0 * k, 0, (sx1 - sx0) * k, sp.h * k);
    } else ctx.drawImage(pic, sx0, 0, sx1 - sx0, sp.h, dx + sx0 * k, dy, (sx1 - sx0) * k, sp.h * k);
    ctx.restore();
  }

  /** The ripples' sheet, asked for with the first frame that has water in it. */
  private ripplesSheet(): HTMLImageElement | null {
    if (!this.ripples) {
      const img = new Image();
      img.onload = () => { this.ripplesReady = true; };
      img.src = `/town/town2/${MAP.ripples.src}`;
      this.ripples = img;
    }
    return this.ripplesReady ? this.ripples : null;
  }

  /**
   * What lies on the ground, under everybody: the rings, stepping stones, the decks, the hall's inside (only while I am
   * in it), and the water's rings round whatever stands in it, moving (README §7: two frames a second).
   */
  drawFloor(ctx: CanvasRenderingContext2D, things: Thing[], screen: Screen, s: number, px: number, now: number, inHall: boolean) {
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
    for (const t of things) {
      if (t.how !== FLOOR || t.i === T2_HALL.inside) continue;
      this.paint(ctx, t, screen, s, px);
    }
  }

  /**
   * Everything else, to be drawn back to front with the walkers: a thing at its middle's place; a wide one in strips,
   * each at its footprint's front edge below it. The kitchen hall is not drawn while I am in it (its inside is).
   */
  pushStanding(ctx: CanvasRenderingContext2D, things: Thing[], push: Push, screen: Screen, s: number, px: number, inHall: boolean) {
    for (const t of things) {
      if (t.i === T2_HALL.inside) {
        if (inHall) { const { x0, y0 } = T2_HALL.floor; this.pushAtBack(ctx, t, push, screen, s, px, (u) => (u >= x0 - y0 ? u + 2 * y0 : 2 * x0 - u)); }
        continue;
      }
      // (the stage, walked on: in front of whoever is behind it, behind whoever is on it or before it)
      // (round: its back edge under each strip is its round foot's, not its footprint's corner, or a pumpkin behind it by
      // that corner came out on top of it, the owner, 2026-10-22: "ฟักทองตรงเวทีบั๊ค")
      if (t.i === T2_STAGE.i) {
        const { x, y, r } = T2_STAGE_BASE;
        this.pushAtBack(ctx, t, push, screen, s, px, (u) => x + y - Math.sqrt(Math.max(0, 2 * r * r - (u - (x - y)) ** 2)));
        continue;
      }
      if (t.how === FLOOR) continue;
      if (t.i === T2_HALL.thing && inHall) continue;
      if (t.how === STAND) { push(t.d, () => this.paint(ctx, t, screen, s, px)); continue; }
      const sp = this.sprites[t.s], [bx0, by0, bx1, by1] = t.box;
      const xBottom = (bx1 - by1) * 32;
      for (let x = t.x; x < t.x + sp.w * t.k; x += STRIP) {
        const mid = x + STRIP / 2;
        // the footprint's front edge under the strip's middle: the left side (y = by1) before its bottom corner, the right (x = bx1) after
        const depth = mid <= xBottom ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
        push(depth, () => this.paint(ctx, t, screen, s, px, [x, x + STRIP]));
      }
    }
  }

  /**
   * Something stood on, in upright strips, each as far forward as its back edge under it (`back`, of the strip's column
   * x − y in tiles), so that it stands in front of whoever is behind it and behind whoever is on it or before it: the
   * hall's inside while I am in it (the owner, 2026-10-22: "ถ้ามีคนยืนตรงนี้มันควรโดนกำแพงบัง", of somebody outside behind
   * its back wall drawn over it while the inside lay under everybody as a floor), and the stage.
   */
  private pushAtBack(ctx: CanvasRenderingContext2D, t: Thing, push: Push, screen: Screen, s: number, px: number, back: (u: number) => number) {
    const sp = this.sprites[t.s];
    for (let x = t.x; x < t.x + sp.w * t.k; x += STRIP) push(back((x + STRIP / 2) / 32), () => this.paint(ctx, t, screen, s, px, [x, x + STRIP]));
  }

  /** The night's lights of the things last seen near the view (visible()). */
  lightsSeen(): Array<[number, number, number]> { return this.lastSeen.flatMap((t) => t.lights ?? []); }
  private lastSeen: Thing[] = [];

  /** Whether a point is in the kitchen hall. */
  static inHall(p: Vec | null): boolean { return !!p && t2InHall(Math.floor(p.x), Math.floor(p.y)); }
}
