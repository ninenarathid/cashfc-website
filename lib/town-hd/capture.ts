/**
 * The bridge from the live town's own drawing to the 3D town's scene (the owner, 2026-11-18: "เขียนใหม่ทั้งหมดเลย
 * เริ่มจากตัวละครก่อน"). The live town draws a frame with a 2D context: the ground's things first, then everything that
 * stands, back to front. Here that context is one that can be pointed elsewhere: what lies on the ground is drawn on a
 * picture of its own (`floor`), and each standing thing is drawn alone, measured, and kept as a piece of one sheet
 * (`atlas`) with where it was on the screen and how far forward it stands (`cards`). The 3D town then lays the floor on
 * its ground and stands every piece in its scene (./engine's `renderWorld`), and the picture comes back to the live
 * town's canvas for what it draws over everything (the sky, the names).
 *
 * Until a system draws itself in the scene, this carries it there as it is; as each is rewritten (the walkers first), it
 * leaves this bridge.
 */

/** A piece of the sheet: how far forward it stands (x + y in tiles), its turn among those as far forward, where it was drawn on the screen and where it is kept on the sheet (all in the canvas's own pixels). */
export interface Card { depth: number; seq: number; x: number; y: number; w: number; h: number; ax: number; ay: number; /** Not a piece of the sheet but a walker, stood in the scene by the 3D town itself. */ actor?: Actor; /** Not a piece of the sheet but a picture of the live town's own, laid in the scene straight from that picture (`ax`, `ay` its corner in it). */ sprite?: Sprite }
/** A picture drawn whole and plainly (no turn, no cut, nothing mixed): the picture, how much of it, how solid, and whether mirrored. */
export interface Sprite { img: HTMLImageElement; sw: number; sh: number; alpha: number; flip: boolean; /** Drawn smoothed (the live town's context was, as it is unless a drawing says otherwise). */ smooth: boolean }
/** A walker in the scene: their doll's cell of the dolls' sheet (`ax`, `ay`, and the card's `w`, `h` on the screen), where they stand (tiles), and how solid they are drawn. */
export interface Actor { sw: number; sh: number; bx: number; bz: number; alpha: number }

type Ctx = CanvasRenderingContext2D;
/** The calls that change a drawing's measure. */
/** The calls that paint. */
const PAINTS = new Set(["drawImage", "fillRect", "strokeRect", "clearRect", "fill", "stroke", "fillText", "strokeText", "putImageData"]);
const TURNS = new Set(["save", "restore", "translate", "scale", "rotate", "transform", "setTransform", "resetTransform"]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export class Capture {
  /** The context the live town draws its frame with: it draws wherever this is pointed. */
  readonly ctx: Ctx;
  readonly floor = document.createElement("canvas");
  readonly atlas = document.createElement("canvas");
  /**
   * Where a standing thing is drawn at first: a canvas of a few pixels, which keeps the drawing's state true (its
   * measure, its colours, what it is asked) while nothing is painted; what was called is written down (`ops`), and once
   * the piece's box is known it is called again straight onto the sheet, at the piece's place there. (At first each
   * thing was painted on a canvas the screen's size and its box copied to the sheet: on a graphics card every copy took
   * a copy of that whole canvas with it, a hundred times a frame; the owner, 2026-11-18: "ยังหน่วงอยู่".)
   */
  private readonly state = Object.assign(document.createElement("canvas"), { width: 4, height: 4 });
  private ops: Any[] = [];
  private from = 0;
  private W = 0;
  private H = 0;
  private smoothed = true;
  cards: Card[] = [];
  /** Pieces that found no room on the sheet this frame (it is larger the next). */
  lost = 0;
  private to!: Ctx;
  private main!: Ctx;
  private tracking = false;
  private dpr = 1;
  private box = [Infinity, Infinity, -Infinity, -Infinity];
  private path = [Infinity, Infinity, -Infinity, -Infinity];
  private wild = false;
  private shelf = { x: 0, y: 0, h: 0 };
  private seq = 0;
  private depth = 0;
  private want = 0;
  /** The drawing's own measure now (asked of the canvas only after something changed it: it is asked for with every call). */
  private matrix: DOMMatrix | null = null;
  private m(): DOMMatrix { return (this.matrix ??= this.to.getTransform()); }

  constructor() {
    const wrapped = new Map<PropertyKey, (...a: Any[]) => Any>();
    this.ctx = new Proxy({} as Ctx, {
      get: (_t, prop) => {
        // (the canvas a drawing asks its size of is the town's own, wherever the drawing goes)
        if (prop === "canvas") return this.main.canvas;
        const v = (this.to as Any)[prop];
        if (typeof v !== "function") return v;
        let f = wrapped.get(prop);
        if (!f) {
          f = prop === "drawImage"
            ? (...a: Any[]) => { if (this.tracking) { if (this.plain(a)) return; this.track("drawImage", a); this.ops.push("drawImage", a); } return (this.to as Any).drawImage(...a); }
            : (...a: Any[]) => { if (this.tracking) { this.track(prop as string, a); this.ops.push(prop as string, a); } return (this.to as Any)[prop](...a); };
          wrapped.set(prop, f);
        }
        return f;
      },
      set: (_t, prop, value) => { if (this.tracking) this.ops.push(`=${String(prop)}`, value); (this.to as Any)[prop] = value; return true; },
    });
  }

  /** A frame begins: until `things`, what is drawn lies on the ground. */
  begin(main: Ctx, dpr: number) {
    this.main = main; this.dpr = dpr;
    const W = main.canvas.width, H = main.canvas.height;
    if (this.floor.width !== W || this.floor.height !== H) { this.floor.width = W; this.floor.height = H; }
    this.W = W; this.H = H; this.smoothed = main.imageSmoothingEnabled;
    // The sheet is sent whole to the graphics card every frame: it is kept as small as the last frame's pieces needed
    // (the owner, 2026-11-18, of one of 4096 by 4096 sent sixty times a second: "หน่วงเลย").
    const used = this.shelf.y + this.shelf.h, wide = 2 ** Math.ceil(Math.log2(Math.max(1024, W + 2)));
    const tall = Math.min(8192, Math.max(512, this.want, Math.ceil((used * 1.25 + 128) / 512) * 512));
    this.want = 0;
    const a = this.atlas.getContext("2d")!;
    a.setTransform(1, 0, 0, 1, 0, 0);
    if (this.atlas.width !== wide || this.atlas.height !== tall) { this.atlas.width = wide; this.atlas.height = tall; }
    else a.clearRect(0, 0, wide, Math.min(tall, used + 1));
    for (const c of [this.floor, this.state]) {
      const g = c.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
      if (c === this.floor) g.clearRect(0, 0, W, H);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = main.imageSmoothingEnabled;
    }
    this.cards = []; this.lost = 0; this.seq = 0;
    this.shelf = { x: 0, y: 0, h: 0 };
    this.to = this.floor.getContext("2d")!;
    this.tracking = false;
  }

  /** One standing thing, drawn alone and kept as a piece (or as several: `cut`). */
  thing(depth: number, draw: () => void) {
    const g = this.state.getContext("2d")!;
    this.to = g; this.tracking = true; this.depth = depth;
    this.clipped = false; this.clips = []; this.matrix = null;
    this.ops = []; this.from = 0;
    this.reset();
    g.save();
    try { draw(); } finally {
      this.cut();
      this.tracking = false;
      this.ops = [];
      g.restore();
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
  }

  /** What has been drawn of this thing so far becomes a piece of its own; what follows is another, in front of it. */
  cut() {
    const W = this.W, H = this.H, from = this.from;
    let [x0, y0, x1, y1] = this.wild ? [0, 0, W, H] : this.box;
    this.reset();
    this.from = this.ops.length;
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(W, Math.ceil(x1) + 2); y1 = Math.min(H, Math.ceil(y1) + 2);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const side = this.atlas.width, s = this.shelf;
    if (s.x + w > side) { s.x = 0; s.y += s.h + 1; s.h = 0; }
    if (w > side || s.y + h > this.atlas.height) { this.lost++; this.want = Math.min(8192, Math.max(this.want, (s.y + h) * 2)); return; }
    this.replay(from, this.from, s.x, s.y, w, h, s.x - x0, s.y - y0);
    this.cards.push({ depth: this.depth, seq: this.seq++, x: x0, y: y0, w, h, ax: s.x, ay: s.y });
    s.x += w + 1; s.h = Math.max(s.h, h);
  }

  /**
   * The thing's calls again, onto the sheet, moved by (ox, oy) and kept inside the piece's place (x, y, w, h): all of
   * them from the thing's start, for the state they leave, but of those that paint only the ones of this piece
   * (`from` to `to`: what was painted before is another piece's).
   */
  private replay(from: number, to: number, x: number, y: number, w: number, h: number, ox: number, oy: number) {
    const a = this.atlas.getContext("2d")! as Any, ops = this.ops;
    a.save();
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.beginPath(); a.rect(x, y, w, h); a.clip();
    a.beginPath();
    a.setTransform(this.dpr, 0, 0, this.dpr, ox, oy);
    a.imageSmoothingEnabled = this.smoothed;
    let depth = 0;
    for (let i = 0; i < to; i += 2) {
      const name = ops[i] as string, arg = ops[i + 1];
      if (name.charCodeAt(0) === 61) { a[name.slice(1)] = arg; continue; }
      if (PAINTS.has(name)) {
        if (i < from) continue;
        if (name === "putImageData") { a.putImageData(arg[0], arg[1] + ox, arg[2] + oy, ...arg.slice(3)); continue; }
      } else if (name === "save") depth++;
      else if (name === "restore") { if (depth > 0) { depth--; a.restore(); } continue; }
      else if (name === "resetTransform") { a.setTransform(1, 0, 0, 1, ox, oy); continue; }
      else if (name === "setTransform") {
        const m = arg.length >= 6 ? arg : arg.length ? [arg[0].a ?? arg[0].m11 ?? 1, arg[0].b ?? arg[0].m12 ?? 0, arg[0].c ?? arg[0].m21 ?? 0, arg[0].d ?? arg[0].m22 ?? 1, arg[0].e ?? arg[0].m41 ?? 0, arg[0].f ?? arg[0].m42 ?? 0] : [1, 0, 0, 1, 0, 0];
        a.setTransform(m[0], m[1], m[2], m[3], m[4] + ox, m[5] + oy);
        continue;
      }
      a[name](...arg);
    }
    while (depth-- > 0) a.restore();
    a.restore();
  }

  /**
   * A walker, in their turn among the pieces: what was drawn of this thing before them is a piece behind them, what is
   * drawn after is one before them. `x`, `y`, `w`, `h`: where their doll's cell lies on the screen, in the drawing's own
   * measure now; `sx`, `sy`, `sw`, `sh`: the cell in the dolls' sheet.
   */
  actor(x: number, y: number, w: number, h: number, sx: number, sy: number, sw: number, sh: number, bx: number, bz: number) {
    this.cut();
    const m = this.m();
    this.cards.push({ depth: this.depth, seq: this.seq++, x: m.a * x + m.e, y: m.d * y + m.f, w: m.a * w, h: m.d * h, ax: sx, ay: sy, actor: { sw, sh, bx, bz, alpha: this.to.globalAlpha } });
  }

  /** The standing things are all kept: what is drawn from now goes to the live town's own canvas again. */
  end() { this.to = this.main; this.tracking = false; }

  /**
   * A picture drawn plainly is not drawn here at all: it goes into the scene as itself, in its turn. Plainly: one of the
   * town's own loaded pictures, upright and unsheared, its pixels as they are (not smoothed, nothing mixed or cut out
   * of it, no glow under it). Whether this call was such a one.
   */
  private plain(a: Any[]): boolean {
    const g = this.to, img = a[0];
    // (nor a picture larger than a phone's graphics hold as one: that one is drawn here as before)
    if (!(img instanceof HTMLImageElement) || img.naturalWidth > 4096 || img.naturalHeight > 4096 || this.clipped || g.globalCompositeOperation !== "source-over" || g.shadowBlur || (g.filter && g.filter !== "none")) return false;
    const m = this.m();
    if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || m.d <= 0 || !m.a) return false;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight, dx: number, dy: number, dw = sw, dh = sh;
    if (a.length >= 9) [, sx, sy, sw, sh, dx, dy, dw, dh] = a;
    else if (a.length >= 5) [, dx, dy, dw, dh] = a;
    else [, dx, dy] = a;
    if (!(dw > 0) || !(dh > 0) || !(sw > 0) || !(sh > 0)) return false;
    this.cut();
    const x0 = m.a * dx + m.e, x1 = m.a * (dx + dw) + m.e;
    this.cards.push({ depth: this.depth, seq: this.seq++, x: Math.min(x0, x1), y: m.d * dy + m.f, w: Math.abs(x1 - x0), h: m.d * dh, ax: sx, ay: sy, sprite: { img, sw, sh, alpha: g.globalAlpha, flip: m.a < 0, smooth: g.imageSmoothingEnabled } });
    return true;
  }
  private clipped = false;
  private clips: boolean[] = [];

  private reset() { this.box = [Infinity, Infinity, -Infinity, -Infinity]; this.path = [Infinity, Infinity, -Infinity, -Infinity]; this.wild = false; }

  private add(into: number[], m: DOMMatrix, x: number, y: number, pad = 0) {
    const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f;
    if (X - pad < into[0]) into[0] = X - pad;
    if (Y - pad < into[1]) into[1] = Y - pad;
    if (X + pad > into[2]) into[2] = X + pad;
    if (Y + pad > into[3]) into[3] = Y + pad;
  }
  private rect(into: number[], m: DOMMatrix, x: number, y: number, w: number, h: number, pad = 0) {
    this.add(into, m, x, y, pad); this.add(into, m, x + w, y, pad); this.add(into, m, x, y + h, pad); this.add(into, m, x + w, y + h, pad);
  }

  /** Where a call draws, added to this piece's box (in the canvas's own pixels). */
  private track(name: string, a: Any[]) {
    const g = this.to;
    if (TURNS.has(name)) this.matrix = null;
    switch (name) {
      // (a cut-out region: what is drawn inside it is not a plain picture, until it is put back)
      case "save": this.clips.push(this.clipped); break;
      case "restore": this.clipped = this.clips.pop() ?? false; break;
      case "clip": this.clipped = true; break;
      case "drawImage": {
        const m = this.m(), pad = g.shadowBlur ? g.shadowBlur * 2 + 4 : 0;
        if (a.length >= 9) this.rect(this.box, m, a[5], a[6], a[7], a[8], pad);
        else if (a.length >= 5) this.rect(this.box, m, a[1], a[2], a[3], a[4], pad);
        else this.rect(this.box, m, a[1], a[2], a[0].naturalWidth ?? a[0].videoWidth ?? a[0].width, a[0].naturalHeight ?? a[0].videoHeight ?? a[0].height, pad);
        break;
      }
      case "fillRect": case "strokeRect": {
        const m = this.m();
        this.rect(this.box, m, a[0], a[1], a[2], a[3], (name === "strokeRect" ? g.lineWidth * Math.hypot(m.a, m.b) : 0) + (g.shadowBlur ? g.shadowBlur * 2 + 4 : 0));
        break;
      }
      case "fillText": case "strokeText": {
        const m = this.m(), w = g.measureText(String(a[0])).width + 8, px = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 16);
        this.rect(this.box, m, a[1] - w, a[2] - px * 1.5, w * 2, px * 2.3, (g.lineWidth + (g.shadowBlur ? g.shadowBlur * 2 : 0)) * Math.hypot(m.a, m.b) + 2);
        break;
      }
      case "putImageData": this.rect(this.box, new DOMMatrix(), a[1], a[2], a[0].width, a[0].height); break;
      case "beginPath": this.path = [Infinity, Infinity, -Infinity, -Infinity]; break;
      case "moveTo": case "lineTo": this.add(this.path, this.m(), a[0], a[1]); break;
      case "rect": case "roundRect": this.rect(this.path, this.m(), a[0], a[1], a[2], a[3]); break;
      case "arc": this.rect(this.path, this.m(), a[0] - a[2], a[1] - a[2], a[2] * 2, a[2] * 2); break;
      case "ellipse": { const r = Math.max(a[2], a[3]); this.rect(this.path, this.m(), a[0] - r, a[1] - r, r * 2, r * 2); break; }
      case "arcTo": case "quadraticCurveTo": { const m = this.m(); this.add(this.path, m, a[0], a[1]); this.add(this.path, m, a[2], a[3]); break; }
      case "bezierCurveTo": { const m = this.m(); this.add(this.path, m, a[0], a[1]); this.add(this.path, m, a[2], a[3]); this.add(this.path, m, a[4], a[5]); break; }
      case "fill": case "stroke": {
        // (a path made elsewhere says nothing of where it is: the whole canvas is this piece)
        if (a[0] && typeof a[0] === "object") { this.wild = true; break; }
        if (this.path[2] < this.path[0]) break;
        const m = this.m(), pad = (name === "stroke" ? g.lineWidth * Math.hypot(m.a, m.b) : 0) + (g.shadowBlur ? g.shadowBlur * 2 + 4 : 0) + 1;
        if (this.path[0] - pad < this.box[0]) this.box[0] = this.path[0] - pad;
        if (this.path[1] - pad < this.box[1]) this.box[1] = this.path[1] - pad;
        if (this.path[2] + pad > this.box[2]) this.box[2] = this.path[2] + pad;
        if (this.path[3] + pad > this.box[3]) this.box[3] = this.path[3] + pad;
        break;
      }
    }
  }
}
