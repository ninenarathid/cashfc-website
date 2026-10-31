/**
 * What is said over a head, as the page's own text over the map (the owner, 2026-10-31: "ตอนพูด toast ขึ้นบนหัว อ่านยาก
 * ไม่ชัด ในหน้าจอใหญ่"). The map's canvas holds only so many pixels (./rendering) and a larger window stretches it, which
 * twelve pixels of Thai do not survive. Text on the page is drawn at the screen's own pixels, whatever the canvas is.
 * Each bubble is a layer of its own: as its owner walks it is moved, not painted again.
 */
const PAPER = "rgba(232,236,242,0.97)", INK = "#0f1319", EDGE = "drop-shadow(0 0 1px rgba(15,19,25,0.75)) drop-shadow(0 1px 2px rgba(15,19,25,0.35))";

/** A window of a phone keeps its twelve pixels; a desk's screen is read from further away. */
export function saidType(windowWidth: number) {
  return windowWidth < 640 ? { size: 12, line: 16, wrap: 168 } : { size: 14, line: 19, wrap: 196 };
}

/** A bubble's box round its lines. Its width is even, so that its middle falls on a whole pixel. */
export function saidBox(widths: number[], type: { line: number }) {
  return { w: Math.ceil((Math.max(...widths) + 18) / 2) * 2, h: widths.length * type.line + 10 };
}

/** A place on the screen's own pixels: text in a layer between two of them is blurred. */
export function snapped(n: number, ratio: number) {
  const r = ratio || 1;
  return Math.round(n * r) / r;
}

type Kept = { el: HTMLElement; dots: HTMLElement[]; key: string; w: number; h: number; x: number; y: number; alpha: number; order: number; seen: boolean };

export class SaidLayer {
  private kept = new Map<string, Kept>();
  private order = 0;
  private ruler: CanvasRenderingContext2D | null = null;

  constructor(private root: HTMLElement) {}

  /** Before a frame's bubbles. */
  begin() {
    this.order = 0;
    for (const k of this.kept.values()) k.seen = false;
  }

  /** After them: whoever has nothing to say any more. */
  end() {
    for (const [id, k] of this.kept) {
      if (k.seen) continue;
      k.el.remove();
      this.kept.delete(id);
    }
  }

  /** What somebody said. `bottom` is where the tail ends, over their head. */
  said(id: string, text: string, x: number, bottom: number, alpha: number, font: string, wrap: (text: string, width: number, measure: (t: string) => number) => string[], windowWidth: number) {
    const type = saidType(windowWidth), key = `said|${type.size}|${font}|${text}`;
    let k = this.kept.get(id);
    if (!k || k.key !== key) {
      const spec = `500 ${type.size}px ${font}`;
      const ruler = (this.ruler ??= document.createElement("canvas").getContext("2d")!);
      ruler.font = spec;
      const lines = wrap(text, type.wrap, (t) => ruler.measureText(t).width);
      const { w, h } = saidBox(lines.map((l) => ruler.measureText(l).width), type);
      k = this.fresh(id, key, w, h, 12, 6);
      const body = k.el.firstElementChild as HTMLElement;
      body.style.cssText += `font:${spec};line-height:${type.line}px;color:${INK};padding:5px 0;text-align:center;white-space:pre;`;
      body.textContent = lines.join("\n");
    }
    this.place(k, x, bottom, alpha);
  }

  /** "…" over somebody typing: its three dots rising one after another. */
  typing(id: string, x: number, bottom: number, lift: (i: number) => number) {
    let k = this.kept.get(id);
    if (!k || k.key !== "typing") {
      k = this.fresh(id, "typing", 38, 20, 10, 5);
      const body = k.el.firstElementChild as HTMLElement;
      body.style.cssText += "display:flex;align-items:center;justify-content:center;gap:4px;";
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${INK};`;
        body.append(dot);
        k.dots.push(dot);
      }
    }
    k.dots.forEach((dot, i) => { dot.style.transform = `translateY(${-lift(i).toFixed(1)}px)`; });
    this.place(k, x, bottom, 1);
  }

  private fresh(id: string, key: string, w: number, h: number, tailW: number, tailH: number): Kept {
    this.kept.get(id)?.el.remove();
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h + tailH}px;will-change:transform,opacity;filter:${EDGE};`;
    const body = document.createElement("div");
    body.style.cssText = `width:${w}px;height:${h}px;background:${PAPER};border-radius:10px;`;
    const tail = document.createElement("div");
    tail.style.cssText = `position:absolute;left:${(w - tailW) / 2}px;top:${h - 1}px;width:${tailW}px;height:${tailH + 1}px;background:${PAPER};clip-path:polygon(0 0,100% 0,50% 100%);`;
    el.append(body, tail);
    this.root.append(el);
    const k: Kept = { el, dots: [], key, w, h: h + tailH, x: NaN, y: NaN, alpha: NaN, order: -1, seen: true };
    this.kept.set(id, k);
    return k;
  }

  private place(k: Kept, x: number, bottom: number, alpha: number) {
    k.seen = true;
    const ratio = window.devicePixelRatio, px = snapped(x - k.w / 2, ratio), py = snapped(bottom - k.h, ratio), a = Math.round(alpha * 100) / 100;
    if (px !== k.x || py !== k.y) { k.el.style.transform = `translate(${px}px,${py}px)`; k.x = px; k.y = py; }
    if (a !== k.alpha) { k.el.style.opacity = String(a); k.alpha = a; }
    // (back to front, as the map draws them)
    const order = this.order++;
    if (order !== k.order) { k.el.style.zIndex = String(order); k.order = order; }
  }
}
