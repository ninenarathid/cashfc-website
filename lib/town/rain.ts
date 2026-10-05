/**
 * The rain over the town, drawn so that it costs next to nothing.
 *
 * It was drawn as it is described: every streak a line of its own, some hundreds of them gathered into three paths
 * (the far, the middle, the near) and stroked each frame, and the same for the rings where it lands. That is cheap
 * to say and dear to draw: a path of hundreds of pieces scattered over the whole screen is rasterised on the CPU,
 * as a mask the size of the screen, and sent to the GPU, six times a frame. Measured 2026-10-05 (the owner:
 * "คนใน cashtown เล่นแล้วใช้ CPU เยอะมาก"): in heavy rain the browser's GPU process took four times the CPU it took
 * on a fine day, and all but a little of that was these strokes.
 *
 * So the streaks are drawn once, onto three small sheets (a sheet to a depth), and each frame the sheets are laid
 * side by side over the screen, slid along the way the rain falls: a handful of pictures drawn instead of hundreds
 * of lines stroked. The look is kept: the far streaks short, faint and slow, the near ones long, bright and fast;
 * few and fine in a shower, many and long in a downpour; slanting with the wind. What is given up: within one depth
 * every streak now falls at that depth's speed, where each had a speed of its own (a sixth either way).
 *
 * The streaks of a sheet are the same ones whatever the rain: as it comes on a sheet has more of them, and the ones
 * it had stay where they were. A sheet is drawn again only when what it shows changes (how many, how long, how
 * slanted), which the weather does slowly.
 *
 * What the rain leaves on the ground is small pictures too, made for the zoom the map is at: the rings where it
 * lands (a ring at each age), the puddles (one to a size) and the rings in them. Each of those was a path of its own
 * every frame, an ellipse filled or stroked: a hundred or two of them cost the GPU process a twelfth of a core.
 */

/** One streak to this many square pixels of the screen, at the rain's hardest. */
const SPARSE = 2600;
/**
 * The three depths, far to near: the share of the streaks, how near they are (0 far to 1 near: their length and
 * speed come of it), how strong and how wide they are drawn, and their sheet's side in CSS pixels (each its own,
 * so that the three never repeat together).
 */
const DEPTHS = [
  { share: 0.4, z0: 0, z1: 0.4, alpha: 0.28, width: 1, side: 400 },
  { share: 0.35, z0: 0.4, z1: 0.75, alpha: 0.42, width: 1, side: 448 },
  { share: 0.25, z0: 0.75, z1: 1, alpha: 0.62, width: 1.4, side: 512 },
] as const;
/** A sheet is never more device pixels a side than this (a phone's dense screen: its sheets are smaller instead). */
const SIDE_MOST = 768;
/** The most streaks a sheet can hold: a sheet of the largest side at the rain's hardest, and some to spare. */
const MOST = 160;

/** A number from 0 to 1 for a streak of a depth: the same every time. */
function chance(depth: number, i: number, salt: number): number {
  let a = (depth * 73856093) ^ (i * 19349663) ^ (salt * 83492791);
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d);
  a = Math.imul(a ^ (a >>> 12), 0x297a2d39);
  return ((a ^ (a >>> 15)) >>> 0) / 4294967296;
}

interface Sheet { canvas: HTMLCanvasElement; shows: string; x: number; y: number }

export class Rain {
  private readonly sheets: Array<Sheet | null> = [null, null, null];
  /** How many streaks are in the air over the screen, as last drawn. */
  drops = 0;

  /** Nothing in the air: the sheets are kept (it will rain again), where they had slid to is not. */
  stop(): void {
    this.drops = 0;
  }

  /**
   * Draw the rain over a screen of `cw` × `ch` CSS pixels, `dpr` device pixels to one, `sec` seconds after it was
   * last drawn. `rain` is how hard it rains (0 to 1), `wind` how hard it blows (0 to 1). The context is taken to be
   * in CSS pixels from the screen's corner.
   */
  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, dpr: number, sec: number, rain: number, wind: number): void {
    this.drops = Math.round(rain * (cw * ch) / SPARSE);
    if (this.drops <= 0) return;
    const slant = 0.08 + 0.46 * wind;
    // a shower's are few and fine; a downpour's many, longer and faster
    const heavy = Math.min(1, Math.max(0, (rain - 0.35) / 0.65));
    const fast = 0.8 + 0.5 * heavy, long = 0.75 + 0.85 * heavy;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const [d, depth] of DEPTHS.entries()) {
      // whole device pixels a side, so that a sheet is laid pixel for pixel
      const px = Math.min(SIDE_MOST, Math.round(depth.side * dpr)), side = px / dpr;
      const n = Math.min(MOST, Math.round(rain * (side * side) / SPARSE * depth.share));
      if (n <= 0) continue;
      const shows = `${px}|${n}|${slant.toFixed(2)}|${long.toFixed(2)}`;
      let sheet = this.sheets[d];
      if (!sheet || sheet.canvas.width !== px) {
        const canvas = document.createElement("canvas");
        canvas.width = px; canvas.height = px;
        sheet = this.sheets[d] = { canvas, shows: "", x: 0, y: 0 };
      }
      if (sheet.shows !== shows) {
        sheet.shows = shows;
        const g = sheet.canvas.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, px, px);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.strokeStyle = "rgb(214,228,246)";
        g.lineWidth = depth.width;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const x = chance(d, i, 1) * side, y = chance(d, i, 2) * side, z = depth.z0 + chance(d, i, 3) * (depth.z1 - depth.z0);
          const len = (8 + 16 * z) * long;
          // (a streak that runs off the sheet's top or left comes in again at its bottom or right: the sheets are laid edge to edge)
          for (const dx of [0, side]) for (const dy of [0, side]) {
            g.moveTo(x + dx, y + dy);
            g.lineTo(x + dx - len * slant, y + dy - len);
          }
        }
        g.stroke();
      }
      // falling at a slant with the wind, each depth at the speed of the middle of it
      const v = (520 + 480 * (depth.z0 + depth.z1) / 2) * fast;
      sheet.y = (sheet.y + v * sec) % side;
      sheet.x = (sheet.x + v * slant * sec) % side;
      ctx.globalAlpha = depth.alpha * (0.8 + 0.2 * heavy);
      const snap = (at: number) => Math.round(at * dpr) / dpr;
      for (let y = snap(sheet.y - side); y < ch; y += side) {
        for (let x = snap(sheet.x - side); x < cw; x += side) ctx.drawImage(sheet.canvas, x, y, side, side);
      }
    }
    ctx.restore();
  }
}

/* ── what the rain leaves on the ground: small pictures, made once for a zoom ─────────────────────────────────── */

/**
 * Small pictures on one sheet, in rows of `cols`, each `w` × `h` CSS pixels (whole device pixels, so that one is cut
 * from the sheet and laid down pixel for pixel), made for `s` screen pixels to a pixel of the map.
 */
export interface Pictures { sheet: HTMLCanvasElement; made: string; s: number; dpr: number; w: number; h: number; cols: number }

/**
 * The zoom a sheet is made for: the map's own, to the nearest twentieth. A sheet is laid a hair larger or smaller
 * for a zoom between two, and is not made again at every frame of a pinch.
 */
const zoomOf = (s: number) => Math.max(0.05, Math.round(s * 20) / 20);

function pictures(kind: string, s: number, dpr: number, had: Pictures | null, w: number, h: number, cols: number, n: number,
  draw: (g: CanvasRenderingContext2D, i: number) => void): Pictures {
  const made = `${kind}|${s.toFixed(2)}|${dpr.toFixed(3)}`;
  if (had && had.made === made) return had;
  const wpx = Math.ceil(w * dpr), hpx = Math.ceil(h * dpr);
  const sheet = had?.sheet ?? document.createElement("canvas");
  sheet.width = wpx * cols; sheet.height = hpx * Math.ceil(n / cols);
  const g = sheet.getContext("2d")!;
  for (let i = 0; i < n; i++) {
    // (each drawn from its own middle, in CSS pixels)
    g.setTransform(dpr, 0, 0, dpr, (i % cols) * wpx + wpx / 2, Math.floor(i / cols) * hpx + hpx / 2);
    draw(g, i);
  }
  return { sheet, made, s, dpr, w: wpx / dpr, h: hpx / dpr, cols };
}

/** Lay the `i`th picture of a sheet with its middle at (x, y) in CSS pixels, at the zoom the map is at now. */
export function drawPicture(ctx: CanvasRenderingContext2D, pics: Pictures, i: number, x: number, y: number, s: number): void {
  const wpx = pics.w * pics.dpr, hpx = pics.h * pics.dpr, k = s / pics.s, w = pics.w * k, h = pics.h * k;
  const snap = (at: number) => Math.round(at * pics.dpr) / pics.dpr;
  ctx.drawImage(pics.sheet, (i % pics.cols) * wpx, Math.floor(i / pics.cols) * hpx, wpx, hpx, snap(x - w / 2), snap(y - h / 2), w, h);
}

/** How long a ring where the rain lands is seen, in ms, and how many pictures of it there are, one to an age. */
export const RING_MS = 260;
const AGES = 8;
/** Which picture a ring of an age (0 new to 1 gone) is. */
export const ageOf = (age: number) => Math.min(AGES - 1, Math.max(0, Math.floor(age * AGES)));

/**
 * The rings where the rain lands on the ground, as pictures: one for each of `AGES` ages, growing and fading. `had`
 * is what was made before: given back as it is when it still fits.
 */
export function ringsFor(zoom: number, dpr: number, had: Pictures | null): Pictures {
  const s = zoomOf(zoom), line = Math.max(1, s * 0.7), most = (1.2 + 3.2) * s;
  return pictures("rings", s, dpr, had, 2 * most + line + 2, 2 * most * 0.45 + line + 2, AGES, AGES, (g, i) => {
    const age = (i + 0.5) / AGES, r = (1.2 + 3.2 * age) * s;
    g.lineWidth = line;
    g.strokeStyle = `rgba(225,238,252,${age < 0.4 ? 0.5 : age < 0.75 ? 0.3 : 0.14})`;
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
    g.stroke();
  });
}

/** The puddles' sizes: how far across half of one is, in the map's pixels. A puddle is of the size its number gives. */
const PUDDLE_R = [10, 14, 18, 22];
export const PUDDLE_SIZES = PUDDLE_R.length;
/** How many pictures there are of the ring in a puddle, one to an age: it grows for a second, and more slowly. */
const POOL_AGES = 16;

/**
 * The puddles as pictures, one to a size: water that catches the light, and a glint on it. As strong as on wet
 * ground; laid fainter while the ground is still getting wet.
 */
export function puddlesFor(zoom: number, dpr: number, had: Pictures | null): Pictures {
  const s = zoomOf(zoom), most = PUDDLE_R[PUDDLE_R.length - 1] * s;
  return pictures("puddles", s, dpr, had, 2 * most + 2, 2 * most * 0.45 + 2, PUDDLE_SIZES, PUDDLE_SIZES, (g, i) => {
    const r = PUDDLE_R[i] * s;
    g.fillStyle = "rgba(150,185,220,0.3)";
    g.beginPath();
    g.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(235,245,255,0.35)";
    g.fillRect(-r * 0.4, -r * 0.12, r * 0.5, Math.max(1, s));
  });
}

/**
 * The rings where the rain lands in a puddle, as pictures: a row to a puddle's size, a ring at each age along it,
 * growing to most of the puddle and fading. As strong as in the hardest rain; laid fainter in less.
 */
export function puddleRingsFor(zoom: number, dpr: number, had: Pictures | null): Pictures {
  const s = zoomOf(zoom), line = Math.max(1, s * 0.8), most = PUDDLE_R[PUDDLE_R.length - 1] * s * 0.8;
  return pictures("puddle rings", s, dpr, had, 2 * most + line + 2, 2 * most * 0.45 + line + 2, POOL_AGES, POOL_AGES * PUDDLE_SIZES, (g, i) => {
    const k = ((i % POOL_AGES) + 0.5) / POOL_AGES, r = PUDDLE_R[Math.floor(i / POOL_AGES)] * s;
    g.lineWidth = line;
    g.strokeStyle = `rgba(225,240,255,${0.5 * (1 - k)})`;
    g.beginPath();
    g.ellipse(0, 0, r * 0.8 * k, r * 0.36 * k, 0, 0, Math.PI * 2);
    g.stroke();
  });
}

/** Which picture of `puddleRingsFor` the ring in a puddle of a size is, `k` of the way through its life (0 to 1). */
export const puddleRing = (size: number, k: number) => size * POOL_AGES + Math.min(POOL_AGES - 1, Math.max(0, Math.floor(k * POOL_AGES)));
