/**
 * A picture the live town has just drawn, laid over again as the 3D town lit it (lib/town-hd/engine's `renderLit`: its
 * sun's side, the shadows falling across it), through the picture's own outline: so the thing is still drawn in its
 * turn, back to front with the walkers, and wears the 3D town's light. Used by the editor's maps' art (town2-art's own
 * copy came first; the farm's is this).
 */
export interface Lit { /** The 3D town's picture of all that stands, covering the screen. */ pic: HTMLCanvasElement; /** Its pixels to one of the screen's. */ k: number }

let scratch: HTMLCanvasElement | null = null;
/** Lay `lit`'s part over the screen's box (x, y, w, h), through `outline` (drawn in the screen's own measure). */
export function relight(lit: Lit, ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, outline: (g: CanvasRenderingContext2D) => void) {
  const k = lit.k, x0 = Math.max(0, Math.floor(x * k)), y0 = Math.max(0, Math.floor(y * k)), x1 = Math.min(lit.pic.width, Math.ceil((x + w) * k)), y1 = Math.min(lit.pic.height, Math.ceil((y + h) * k));
  if (x1 <= x0 || y1 <= y0) return;
  const c = (scratch ??= document.createElement("canvas"));
  if (c.width < x1 - x0 || c.height < y1 - y0) { c.width = Math.max(c.width, x1 - x0, 256); c.height = Math.max(c.height, y1 - y0, 256); }
  const g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, x1 - x0, y1 - y0);
  g.imageSmoothingEnabled = false;
  g.setTransform(k, 0, 0, k, -x0, -y0);
  outline(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.drawImage(lit.pic, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  ctx.drawImage(c, 0, 0, x1 - x0, y1 - y0, x0 / k, y0 / k, (x1 - x0) / k, (y1 - y0) / k);
}
