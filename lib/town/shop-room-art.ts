/**
 * Granny Twilla's clothes shop drawn (lib/town/shop-room): its floor (the wooden boards with the walls' shadows on them,
 * one picture), its walls and its things, each from the export's own picture (public/town/shop, one webp a picture, cut
 * to what is drawn of it), back to front with the walkers.
 *
 * Light on memory, as the editor's town is (lib/town/town2-art): a picture is fetched only once the room comes within a
 * screen of the view, and let go a while after it has been out of view, so nobody outside the shop holds any of it.
 *
 * How a thing stands among the walkers (shop-map.json's own word for it, from the builder):
 * - on the floor, under everybody: the floor's picture and the ring of light;
 * - a wall: before anything in the room (every place in the room is on its front side: the export's README §6), in the
 *   editor's own order;
 * - standing: by the number the builder gave it, its middle's x + y + z, moved where a walker could stand over its
 *   picture so that whoever stands before its footprint is drawn after it and whoever stands behind it before.
 */
import MAP from "./shop-map.json";
import { SHOP_KEEPER, SHOP_MANNEQUIN, SHOP_RING, SHOP_ROOM } from "./shop-room";
import type { Vec } from "./world";

const FLOOR = 0, WALL = 2;
/** Let a picture go once it has been out of view this long (ms). */
const LET_GO_MS = 10_000;

interface Thing {
  i: number; name: string; s: number;
  /** Where its picture's top-left is drawn, in isometric pixels, and how many of them a picture pixel is. */
  x: number; y: number; k: number; flip: boolean; how: number;
  /** Its place back to front among the walkers. */
  d: number;
}
interface Sprite { src: string; w: number; h: number; img: HTMLImageElement | null; ready: boolean; seen: number }

/** The isometric point of a tile point. */
const iso = (p: Vec) => ({ x: (p.x - p.y) * 32, y: (p.x + p.y) * 16 });
/** The room's own isometric origin (its tile 0, 0) in the tile space's. */
const ORIGIN = iso({ x: SHOP_ROOM.x, y: SHOP_ROOM.y });
/** The room's tiles' x + y at its own corner: what its things' numbers back to front are counted from. */
const DEPTH0 = SHOP_ROOM.x + SHOP_ROOM.y;

export type Screen = (ix: number, iy: number) => Vec;
export type Push = (depth: number, draw: () => void) => void;

export class ShopRoomArt {
  readonly things: Thing[];
  private readonly sprites: Sprite[];
  private readonly floor: Sprite & { x: number; y: number };
  /** The room's whole box, in isometric pixels: its floor and everything that stands on it. */
  private readonly box: { x0: number; y0: number; x1: number; y1: number };
  /** Where Granny is drawn back to front: in her own place on the floor, as anybody standing there (lib/town/shop-room's SHOP_KEEPER). */
  readonly keeperDepth: number;
  /**
   * The week's auction outfits on the mannequin, once there is something to show (the auction's own code sets this):
   * called right after the mannequin's picture is drawn, in its place back to front, with its foot on the screen and the
   * screen pixels to an isometric pixel. Nothing is drawn there until it is set.
   */
  onMannequin: ((ctx: CanvasRenderingContext2D, foot: Vec, s: number, now: number) => void) | null = null;

  constructor() {
    this.sprites = (MAP.sprites as Array<[string, number, number]>).map(([src, w, h]) => ({ src: `/town/shop/${src}`, w, h, img: null, ready: false, seen: 0 }));
    const [src, fx, fy, fw, fh] = MAP.floor as [string, number, number, number, number];
    this.floor = { src: `/town/shop/${src}`, w: fw, h: fh, img: null, ready: false, seen: 0, x: ORIGIN.x + fx, y: ORIGIN.y + fy };
    this.things = (MAP.objects as Array<Array<number>>).map((o, i) => ({
      i, name: MAP.names[o[0]], s: o[1], x: ORIGIN.x + o[2], y: ORIGIN.y + o[3], k: o[4], flip: o[5] === 1, how: o[6],
      // (the walls, before anything in the room, in the editor's own order among themselves)
      d: o[6] === WALL ? DEPTH0 - 1 + o[13] / 1000 : DEPTH0 + o[7],
    }));
    const xs = [this.floor.x, this.floor.x + fw], ys = [this.floor.y, this.floor.y + fh];
    for (const t of this.things) { const sp = this.sprites[t.s]; xs.push(t.x, t.x + sp.w * t.k); ys.push(t.y, t.y + sp.h * t.k); }
    this.box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    this.keeperDepth = SHOP_KEEPER.at.x + SHOP_KEEPER.at.y;
  }

  /** How much is held now: pictures fetched, and what they come to decoded (bytes). */
  memory(): { pictures: number; bytes: number; of: number } {
    let n = 0, bytes = 0;
    for (const s of [...this.sprites, this.floor]) if (s.img) { n++; bytes += s.w * s.h * 4; }
    return { pictures: n, bytes, of: this.sprites.length + 1 };
  }

  /** A thing's box on the screen (its picture's), for taps. */
  boxOf(i: number, screen: Screen, s: number): { x0: number; y0: number; x1: number; y1: number } | null {
    const t = this.things[i];
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

  private lastLetGo = 0;
  /** Let go of the pictures nothing near the view has drawn for a while. */
  private letGo(now: number) {
    if (now - this.lastLetGo < 5000) return;
    this.lastLetGo = now;
    for (const sp of [...this.sprites, this.floor]) if (sp.img && now - sp.seen > LET_GO_MS) { sp.img.src = ""; sp.img = null; sp.ready = false; }
  }

  /**
   * The things worth drawing this frame (isometric pixels of the view): none while the room is more than half a screen
   * from it; once it is nearer, all its pictures are asked for at once (it is small), and those that meet the view drawn.
   */
  visible(view: { x0: number; y0: number; x1: number; y1: number }, now: number): Thing[] | null {
    const w = view.x1 - view.x0, h = view.y1 - view.y0, b = this.box;
    if (b.x1 < view.x0 - w / 2 || b.x0 > view.x1 + w / 2 || b.y1 < view.y0 - h / 2 || b.y0 > view.y1 + h / 2) { this.letGo(now); return null; }
    const out: Thing[] = [];
    this.want(this.floor, now);
    for (const t of this.things) {
      const sp = this.sprites[t.s], x1 = t.x + sp.w * t.k, y1 = t.y + sp.h * t.k;
      const near = !(x1 < view.x0 || t.x > view.x1 || y1 < view.y0 || t.y > view.y1);
      if (this.want(sp, now) && near) out.push(t);
    }
    this.letGo(now);
    return out;
  }

  /** Draw a picture whole, where it is (isometric pixels), crisp. */
  private paint(ctx: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, k0: number, flip: boolean, screen: Screen, s: number, px: number) {
    if (!sp.img || !sp.ready) return;
    const k = k0 * s, a = screen(x, y);
    ctx.save();
    ctx.imageSmoothingEnabled = k * px < 1;
    ctx.imageSmoothingQuality = "high";
    const dx = Math.round(a.x * px) / px, dy = Math.round(a.y * px) / px;
    if (flip) {
      ctx.translate(dx + sp.w * k, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sp.img, 0, 0, sp.w * k, sp.h * k);
    } else ctx.drawImage(sp.img, dx, dy, sp.w * k, sp.h * k);
    ctx.restore();
  }

  /** What lies under everybody: the floor (its boards and the walls' shadows) and the ring of light. */
  drawFloor(ctx: CanvasRenderingContext2D, things: Thing[], screen: Screen, s: number, px: number) {
    this.paint(ctx, this.floor, this.floor.x, this.floor.y, 1, false, screen, s, px);
    for (const t of things) if (t.how === FLOOR) this.paint(ctx, this.sprites[t.s], t.x, t.y, t.k, t.flip, screen, s, px);
  }

  /** Everything else, to be drawn back to front with the walkers: the walls, then each thing in its place. */
  pushStanding(ctx: CanvasRenderingContext2D, things: Thing[], push: Push, screen: Screen, s: number, px: number, now: number) {
    for (const t of things) {
      if (t.how === FLOOR) continue;
      push(t.d, () => {
        this.paint(ctx, this.sprites[t.s], t.x, t.y, t.k, t.flip, screen, s, px);
        // (the mannequin: whatever the week's auction has it wear, over it)
        if (t.i === SHOP_MANNEQUIN.i && this.onMannequin) {
          const sp = this.sprites[t.s], foot = screen(t.x + (sp.w * t.k) / 2, t.y + sp.h * t.k);
          this.onMannequin(ctx, foot, s, now);
        }
      });
    }
  }

  /**
   * The room's own light (no sky indoors: Town.tsx lays this in its place): the boards and walls a touch warm, as under
   * lamps, a soft glow over the middle of the floor, and the ring of light's own, breathing slowly.
   */
  light(ctx: CanvasRenderingContext2D, screen: Screen, s: number, cw: number, ch: number, now: number, still: boolean) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(255,243,226)";
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = "lighter";
    const mid = iso({ x: SHOP_ROOM.x + SHOP_ROOM.w / 2, y: SHOP_ROOM.y + SHOP_ROOM.h / 2 }), c = screen(mid.x, mid.y - 40);
    const glow = (x: number, y: number, r: number, rgb: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    glow(c.x, c.y, 300 * s, "255,196,130", 0.07);
    const breath = still ? 0.9 : 0.8 + 0.2 * Math.sin(now / 1500), ring = iso(SHOP_RING.at), r = screen(ring.x, ring.y);
    glow(r.x, r.y - 2 * s, 40 * s, "120,205,255", 0.3 * breath);
    glow(r.x, r.y - 8 * s, 66 * s, "110,180,255", 0.12 * breath);
    ctx.restore();
  }
}
