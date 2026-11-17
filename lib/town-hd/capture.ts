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
export interface Card { depth: number; seq: number; x: number; y: number; w: number; h: number; ax: number; ay: number; /** Not a piece of the sheet but a walker, stood in the scene by the 3D town itself. */ actor?: Actor }
/** A walker in the scene: their doll's cell of the dolls' sheet (`ax`, `ay`, and the card's `w`, `h` on the screen), where they stand (tiles), and how solid they are drawn. */
export interface Actor { sw: number; sh: number; bx: number; bz: number; alpha: number }

type Ctx = CanvasRenderingContext2D;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export class Capture {
  /** The context the live town draws its frame with: it draws wherever this is pointed. */
  readonly ctx: Ctx;
  readonly floor = document.createElement("canvas");
  readonly atlas = document.createElement("canvas");
  private readonly scratch = document.createElement("canvas");
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
  private want = 2048;

  constructor() {
    const wrapped = new Map<PropertyKey, (...a: Any[]) => Any>();
    this.ctx = new Proxy({} as Ctx, {
      get: (_t, prop) => {
        const v = (this.to as Any)[prop];
        if (typeof v !== "function") return v;
        let f = wrapped.get(prop);
        if (!f) { f = (...a: Any[]) => { if (this.tracking) this.track(prop as string, a); return (this.to as Any)[prop](...a); }; wrapped.set(prop, f); }
        return f;
      },
      set: (_t, prop, value) => { (this.to as Any)[prop] = value; return true; },
    });
  }

  /** A frame begins: until `things`, what is drawn lies on the ground. */
  begin(main: Ctx, dpr: number) {
    this.main = main; this.dpr = dpr;
    const W = main.canvas.width, H = main.canvas.height;
    for (const c of [this.floor, this.scratch]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const side = Math.min(8192, Math.max(this.want, 2 ** Math.ceil(Math.log2(Math.max(W, H) * 2))));
    if (this.atlas.width !== side) { this.atlas.width = side; this.atlas.height = side; }
    const a = this.atlas.getContext("2d")!;
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, side, Math.min(side, this.shelf.y + this.shelf.h + 1));
    for (const c of [this.floor, this.scratch]) {
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
    const g = this.scratch.getContext("2d")!;
    this.to = g; this.tracking = true; this.depth = depth;
    this.reset();
    g.save();
    try { draw(); } finally {
      g.restore();
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      this.cut();
      this.tracking = false;
    }
  }

  /** What has been drawn of this thing so far becomes a piece of its own; what follows is another, in front of it. */
  cut() {
    const W = this.scratch.width, H = this.scratch.height;
    let [x0, y0, x1, y1] = this.wild ? [0, 0, W, H] : this.box;
    this.reset();
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(W, Math.ceil(x1) + 2); y1 = Math.min(H, Math.ceil(y1) + 2);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const side = this.atlas.width, s = this.shelf;
    if (s.x + w > side) { s.x = 0; s.y += s.h + 1; s.h = 0; }
    const g = this.scratch.getContext("2d")!;
    if (w > side || s.y + h > side) { this.lost++; this.want = Math.min(8192, side * 2); }
    else {
      const a = this.atlas.getContext("2d")!;
      a.drawImage(this.scratch, x0, y0, w, h, s.x, s.y, w, h);
      this.cards.push({ depth: this.depth, seq: this.seq++, x: x0, y: y0, w, h, ax: s.x, ay: s.y });
      s.x += w + 1; s.h = Math.max(s.h, h);
    }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(x0, y0, w, h);
    g.restore();
  }

  /**
   * A walker, in their turn among the pieces: what was drawn of this thing before them is a piece behind them, what is
   * drawn after is one before them. `x`, `y`, `w`, `h`: where their doll's cell lies on the screen, in the drawing's own
   * measure now; `sx`, `sy`, `sw`, `sh`: the cell in the dolls' sheet.
   */
  actor(x: number, y: number, w: number, h: number, sx: number, sy: number, sw: number, sh: number, bx: number, bz: number) {
    this.cut();
    const m = this.to.getTransform();
    this.cards.push({ depth: this.depth, seq: this.seq++, x: m.a * x + m.e, y: m.d * y + m.f, w: m.a * w, h: m.d * h, ax: sx, ay: sy, actor: { sw, sh, bx, bz, alpha: this.to.globalAlpha } });
  }

  /** The standing things are all kept: what is drawn from now goes to the live town's own canvas again. */
  end() { this.to = this.main; this.tracking = false; }

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
    switch (name) {
      case "drawImage": {
        const m = g.getTransform(), pad = g.shadowBlur ? g.shadowBlur * 2 + 4 : 0;
        if (a.length >= 9) this.rect(this.box, m, a[5], a[6], a[7], a[8], pad);
        else if (a.length >= 5) this.rect(this.box, m, a[1], a[2], a[3], a[4], pad);
        else this.rect(this.box, m, a[1], a[2], a[0].naturalWidth ?? a[0].videoWidth ?? a[0].width, a[0].naturalHeight ?? a[0].videoHeight ?? a[0].height, pad);
        break;
      }
      case "fillRect": case "strokeRect": {
        const m = g.getTransform();
        this.rect(this.box, m, a[0], a[1], a[2], a[3], (name === "strokeRect" ? g.lineWidth * Math.hypot(m.a, m.b) : 0) + (g.shadowBlur ? g.shadowBlur * 2 + 4 : 0));
        break;
      }
      case "fillText": case "strokeText": {
        const m = g.getTransform(), w = g.measureText(String(a[0])).width + 8, px = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 16);
        this.rect(this.box, m, a[1] - w, a[2] - px * 1.5, w * 2, px * 2.3, (g.lineWidth + (g.shadowBlur ? g.shadowBlur * 2 : 0)) * Math.hypot(m.a, m.b) + 2);
        break;
      }
      case "putImageData": this.rect(this.box, new DOMMatrix(), a[1], a[2], a[0].width, a[0].height); break;
      case "beginPath": this.path = [Infinity, Infinity, -Infinity, -Infinity]; break;
      case "moveTo": case "lineTo": this.add(this.path, g.getTransform(), a[0], a[1]); break;
      case "rect": case "roundRect": this.rect(this.path, g.getTransform(), a[0], a[1], a[2], a[3]); break;
      case "arc": this.rect(this.path, g.getTransform(), a[0] - a[2], a[1] - a[2], a[2] * 2, a[2] * 2); break;
      case "ellipse": { const r = Math.max(a[2], a[3]); this.rect(this.path, g.getTransform(), a[0] - r, a[1] - r, r * 2, r * 2); break; }
      case "arcTo": case "quadraticCurveTo": { const m = g.getTransform(); this.add(this.path, m, a[0], a[1]); this.add(this.path, m, a[2], a[3]); break; }
      case "bezierCurveTo": { const m = g.getTransform(); this.add(this.path, m, a[0], a[1]); this.add(this.path, m, a[2], a[3]); this.add(this.path, m, a[4], a[5]); break; }
      case "fill": case "stroke": {
        // (a path made elsewhere says nothing of where it is: the whole canvas is this piece)
        if (a[0] && typeof a[0] === "object") { this.wild = true; break; }
        if (this.path[2] < this.path[0]) break;
        const m = g.getTransform(), pad = (name === "stroke" ? g.lineWidth * Math.hypot(m.a, m.b) : 0) + (g.shadowBlur ? g.shadowBlur * 2 + 4 : 0) + 1;
        if (this.path[0] - pad < this.box[0]) this.box[0] = this.path[0] - pad;
        if (this.path[1] - pad < this.box[1]) this.box[1] = this.path[1] - pad;
        if (this.path[2] + pad > this.box[2]) this.box[2] = this.path[2] + pad;
        if (this.path[3] + pad > this.box[3]) this.box[3] = this.path[3] + pad;
        break;
      }
    }
  }
}
