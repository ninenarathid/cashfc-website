/**
 * The Popoto Casino drawn in the town (lib/town/casino-room): the interior the casino's own map drew
 * (components/town/TownCasinoMap: its floor and walls, the five machines with their reels, the stools, the sofa, the
 * counter, the plants and the marquees over the machines), laid at the room's place in the tile space and drawn back to
 * front with the walkers by the town's own frame. Its pictures (public/town/casino/v2) are fetched only once the room
 * is near the view and let go a while after it has been out of it, as the clothes shop's are.
 *
 * What the reels show is the database's: the page that keeps the casino (components/casino/CasinoInTown) hands this
 * the spins (`spins`) and its clock (`clock`), and which machine's sheet is open (`selected`).
 */
import { reelAt, spinRevealed, type CasinoSpin, type SymbolId } from "../casino";
import { CASINO_FURNITURE, casinoScenery, type CasinoFurniture } from "./casino-scenery";
import { CASINO_MACHINE_X } from "./casino-floor";
import { CASINO_ROOM } from "./casino-room";
import { drawCasinoMarquee } from "./casino-marquee";
import { drawCasinoSymbol } from "./casino-symbol-art";
import { toIso, type Vec } from "./world";

/** An isometric point of the tile space on the screen (Town.tsx's `toScreen` for the frame's camera). */
export type Screen = (ix: number, iy: number) => Vec;
export type Push = (depth: number, draw: () => void) => void;
type Sprite = "slot" | "chair" | "planter" | "counter" | "sofa" | "wall";
/** Let the pictures go once the room has been out of view this long (ms). */
const LET_GO_MS = 10_000;
/** The room's own isometric origin (its tile 0, 0) in the tile space's. */
const ORIGIN = toIso(CASINO_ROOM.x, CASINO_ROOM.y);
/** The cached floor's size and where the room's origin is in it (TownCasinoMap's own numbers). */
const BG = { w: 1000, h: 650, ox: 420, oy: 140 };

export class CasinoRoomArt {
  /** The spins the reels and the marquees show, newest first (the database's). */
  spins: () => CasinoSpin[] = () => [];
  /** The database's clock. */
  clock: () => number = () => Date.now();
  /** The machine whose sheet is open (1 to 5), or 0. */
  selected = 0;
  /** Whether the open sheet covers the machines on a phone (their marquees are then left out). */
  sheetOpen = false;
  /** The tap boxes of this frame: a machine or its stool (1 to 5) and the counter (0). */
  boxes: Array<{ n: number; x0: number; y0: number; x1: number; y1: number }> = [];
  private art: Partial<Record<Sprite, HTMLImageElement>> = {};
  private floor: HTMLCanvasElement | null = null;
  private seen = 0;

  /** Whether the room is within half a screen of the view (isometric pixels): its pictures are asked for then, and let go after. */
  near(view: { x0: number; y0: number; x1: number; y1: number }, now: number): boolean {
    const w = view.x1 - view.x0, h = view.y1 - view.y0;
    const x0 = ORIGIN.x - BG.ox, y0 = ORIGIN.y - BG.oy, x1 = x0 + BG.w, y1 = y0 + BG.h;
    if (x1 < view.x0 - w / 2 || x0 > view.x1 + w / 2 || y1 < view.y0 - h / 2 || y0 > view.y1 + h / 2) {
      if (this.floor && now - this.seen > LET_GO_MS) { this.floor = null; this.art = {}; }
      return false;
    }
    this.seen = now;
    if (!this.art.slot) for (const key of ["slot", "chair", "planter", "counter", "sofa", "wall"] as Sprite[]) {
      const img = new Image();
      img.onload = () => { if (key === "wall") this.floor = null; };
      img.src = `/town/casino/v2/${key === "chair" ? "stool" : key}.png`;
      this.art[key] = img;
    }
    return true;
  }

  private ready(key: Sprite) { const img = this.art[key]; return img?.complete && img.naturalWidth ? img : null; }

  /** The floor and the walls (one picture made once at the world's own scale), under everybody. */
  drawFloor(ctx: CanvasRenderingContext2D, screen: Screen, s: number) {
    if (!this.floor) {
      const cached = document.createElement("canvas");
      cached.width = BG.w; cached.height = BG.h;
      const c = cached.getContext("2d")!;
      c.imageSmoothingEnabled = false;
      const project = (x: number, y: number, z = 0) => { const p = toIso(x, y); return { x: p.x + BG.ox, y: p.y + BG.oy - z }; };
      casinoScenery(c, project, 1).background();
      // (the walls share the furniture's and the dolls' own pixels)
      const wall = this.ready("wall");
      if (wall) {
        for (let x = 1; x < 16; x += 2) { const p = project(x, 0); c.drawImage(wall, Math.round(p.x - 46), Math.round(p.y - 100), 80, 105); }
        for (let y = 1; y < 12; y += 2) { const p = project(0, y); c.save(); c.translate(Math.round(p.x + 46), Math.round(p.y - 100)); c.scale(-1, 1); c.drawImage(wall, 0, 0, 80, 105); c.restore(); }
      }
      this.floor = cached;
    }
    const corner = screen(ORIGIN.x - BG.ox, ORIGIN.y - BG.oy);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.floor, Math.round(corner.x), Math.round(corner.y), BG.w * s, BG.h * s);
    // the open sheet's machine, its stool's tile lit
    if (this.selected) {
      const point = this.point(screen, s);
      casinoScenery(ctx, point, s).tile(CASINO_MACHINE_X[this.selected - 1] - .44, 3.06, .88, .88, "#dec18e16", .8, "#c9aa61");
    }
    ctx.restore();
  }

  /** A point of the room's own tiles (and a height) on the screen. */
  private point(screen: Screen, s: number) {
    return (x: number, y: number, z = 0) => { const p = toIso(CASINO_ROOM.x + x, CASINO_ROOM.y + y); const q = screen(p.x, p.y); return { x: q.x, y: q.y - z * s }; };
  }

  /**
   * The machines, the stools, the furniture and the man at the counter, each in its place back to front with the walkers
   * (by the tile space's x + y, as Town.tsx sorts). `banker` draws the town's banker at a point, at a size.
   */
  pushStanding(ctx: CanvasRenderingContext2D, push: Push, screen: Screen, s: number, now: number, reduced: boolean,
    banker: (at: Vec, size: number) => void) {
    this.boxes = [];
    const point = this.point(screen, s), at = (x: number, y: number) => point(x, y), spins = this.spins(), t = this.clock();
    const glyph = (id: SymbolId, x: number, y: number, size: number) => drawCasinoSymbol(ctx, id, x, y, size);
    const D = CASINO_ROOM.x + CASINO_ROOM.y;
    for (let n = 1; n <= 5; n++) {
      const x = CASINO_MACHINE_X[n - 1];
      push(D + x + 2.5, () => {
        const p = at(x, 2.5), k = s, latest = spins.find((q) => q.machine === n), rolling = !!latest && !spinRevealed(latest, t);
        const slot = this.ready("slot");
        if (slot) {
          const left = p.x - 40 * k, top = p.y - 85 * k;
          ctx.save(); ctx.imageSmoothingEnabled = false;
          ctx.drawImage(slot, Math.round(left), Math.round(top), 72 * k, 85 * k);
          ctx.restore();
          // four windows on the front face: the perspective follows the cabinet itself
          for (let r = 0; r < 4; r++) { ctx.save(); ctx.translate(left + (15 + r * 9) * k, top + (32 + r * 1.8) * k); ctx.transform(1, .21, 0, 1, 0, 0); glyph(latest ? reelAt(latest, r, t, reduced) : "popoto", 0, 0, 8 * k); ctx.restore(); }
          ctx.fillStyle = this.selected === n ? "#ffdf9b" : "#c9ad80"; ctx.font = `bold ${10 * k}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(String(n), p.x - 7 * k, p.y - 89 * k);
          if (rolling || (latest?.prize && t < Date.parse(latest.reveal_at) + 2500)) {
            for (let light = 0; light < 6; light++) { if (rolling && !reduced && Math.floor(now / 150 + light) % 3 === 0) continue; ctx.fillStyle = rolling ? "#f2d58a" : "#b1d6a1"; ctx.fillRect(left + (13 + light * 5) * k, top + (16 + light * .9) * k, 2 * k, 2 * k); }
          }
          // a win throws chips from the cabinet's window
          if (latest?.prize && !rolling && !reduced) {
            const sec = (t - Date.parse(latest.reveal_at)) / 1000;
            if (sec >= 0 && sec < 1.8) for (let chip = 0; chip < 14; chip++) {
              const spread = Math.sin(chip * 2.41), launch = 18 + (chip % 5) * 7;
              const cx = left + (30 + spread * 35 * sec) * k, cy = top + (45 - launch * sec + 32 * sec * sec) * k;
              ctx.globalAlpha = Math.min(1, (1.8 - sec) * 2); ctx.fillStyle = chip % 3 === 0 ? "#b55361" : "#edc783";
              ctx.fillRect(Math.round(cx), Math.round(cy), (chip % 2 + 1) * k, k); ctx.globalAlpha = 1;
            }
          }
          this.boxes.push({ n, x0: left, y0: top, x1: left + 72 * k, y1: top + 90 * k });
        }
      });
      push(D + x + 3.45, () => {
        const seat = at(x, 3.5), k = s, chair = this.ready("chair");
        this.boxes.push({ n, x0: seat.x - 20 * k, y0: seat.y - 38 * k, x1: seat.x + 20 * k, y1: seat.y + 7 * k });
        if (chair) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(chair, Math.round(seat.x - 14 * k), Math.round(seat.y - 43 * k), 28 * k, 43 * k); ctx.restore(); }
      });
    }
    for (const item of CASINO_FURNITURE) push(D + item.x + item.y + item.w + item.h - .5, () => this.furniture(ctx, item, at, s));
    // the town's banker behind the counter, its front lip over his feet (his name is the town's to write, over every head)
    push(D + 20, () => banker(point(13.3, 7.4, 28), .75 * s));
  }

  private furniture(ctx: CanvasRenderingContext2D, item: CasinoFurniture, at: (x: number, y: number) => Vec, s: number) {
    const p = at(item.x + item.w / 2, item.y + item.h / 2 + (item.kind === "counter" ? .8 : 0));
    const sprite = this.ready(item.kind === "plant" ? "planter" : item.kind === "sofa" ? "sofa" : "counter");
    if (sprite) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(sprite, Math.round(p.x - sprite.naturalWidth * s / 2), Math.round(p.y - sprite.naturalHeight * s), sprite.naturalWidth * s, sprite.naturalHeight * s); ctx.restore(); }
    if (item.kind === "counter") this.boxes.push({ n: 0, x0: p.x - 65 * s, y0: p.y - 110 * s, x1: p.x + 65 * s, y1: p.y });
  }

  /**
   * The marquee over each machine that is playing, has played, or is sat at: who is at it and what came of it, over
   * every head. `sitter(n)` is who sits at machine n's stool. On a narrow screen with the sheet open, a marquee that
   * would stand under the town's top bar is left out (the sheet shows that machine's reels large).
   */
  drawSigns(ctx: CanvasRenderingContext2D, screen: Screen, s: number, reduced: boolean, sitter: (n: number) => string | null, narrow: boolean) {
    const point = this.point(screen, s), spins = this.spins(), t = this.clock();
    for (let n = 1; n <= 5; n++) {
      const latest = spins.find((q) => q.machine === n), occupant = sitter(n);
      if (!latest && !occupant && this.selected !== n) continue;
      const p = point(CASINO_MACHINE_X[n - 1], 2.5);
      if (narrow && this.sheetOpen && p.y - 176 * s < 104) continue;
      drawCasinoMarquee(ctx, n, latest, occupant ?? "พร้อมเล่น", t, p.x - 7 * s, p.y - 176 * s, s, reduced);
    }
  }

  /** The room's own light (no sky indoors: Town.tsx lays this in its place): warm, and each lamp along the walls. */
  light(ctx: CanvasRenderingContext2D, screen: Screen, s: number, cw: number, ch: number, now: number, reduced: boolean) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(255,238,214)";
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
    casinoScenery(ctx, this.point(screen, s), s).lights(now, reduced);
  }

  /** The machine (1 to 5), the counter (0) or nothing under a point of the screen, the one drawn last first. */
  hit(x: number, y: number): number | null {
    for (let i = this.boxes.length - 1; i >= 0; i--) { const b = this.boxes[i]; if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b.n; }
    return null;
  }
}
