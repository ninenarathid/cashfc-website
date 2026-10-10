import { grandeur, isTop, showAt, type ForgeShow } from "./forge-show";

type Palette = "heat" | "gold" | "grey" | "red";
type Pictures = { halo: HTMLCanvasElement; ray: HTMLCanvasElement; ring: HTMLCanvasElement; spark: HTMLCanvasElement; smoke: HTMLCanvasElement; beam: HTMLCanvasElement; plate: HTMLCanvasElement; crack: HTMLCanvasElement };
const cache = new Map<Palette, Pictures>();
const COLORS: Record<Palette, [string, string, string]> = {
  heat: ["#ffb44d", "#fff3be", "#382313"], gold: ["#ffd36c", "#fff6cf", "#493014"],
  grey: ["#aeb8ca", "#e2e8ef", "#303640"], red: ["#ff735d", "#ffd0af", "#421c1a"],
};

/** Small pictures made once on first use. Every animated decoration below is a drawImage. */
function pictures(palette: Palette): Pictures {
  const kept = cache.get(palette);
  if (kept) return kept;
  const [color, light, dark] = COLORS[palette];
  const make = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!; paint(ctx); return canvas;
  };
  const halo = make(128, 128, (ctx) => {
    const glow = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    glow.addColorStop(0, light); glow.addColorStop(.18, `${color}cc`); glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
  });
  const ray = make(192, 192, (ctx) => {
    ctx.fillStyle = `${color}88`;
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6, reach = i % 2 ? 70 : 95;
      ctx.beginPath(); ctx.moveTo(96, 96);
      ctx.lineTo(96 + Math.cos(angle - .045) * reach, 96 + Math.sin(angle - .045) * reach);
      ctx.lineTo(96 + Math.cos(angle + .045) * reach, 96 + Math.sin(angle + .045) * reach);
      ctx.closePath(); ctx.fill();
    }
  });
  const ring = make(128, 128, (ctx) => {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(64, 64, 59, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.stroke();
  });
  const spark = make(16, 16, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(6, 0, 4, 16); ctx.fillRect(0, 6, 16, 4);
    ctx.fillStyle = light; ctx.fillRect(5, 5, 6, 6);
  });
  const smoke = make(64, 64, (ctx) => {
    const glow = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    glow.addColorStop(0, `${color}99`); glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  });
  const beam = make(64, 256, (ctx) => {
    const glow = ctx.createLinearGradient(0, 0, 64, 0);
    glow.addColorStop(0, `${color}00`); glow.addColorStop(.4, `${color}66`);
    glow.addColorStop(.5, `${light}bb`); glow.addColorStop(.6, `${color}66`); glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 256);
    ctx.globalCompositeOperation = "destination-in";
    const ends = ctx.createLinearGradient(0, 0, 0, 256);
    ends.addColorStop(0, "transparent"); ends.addColorStop(.2, "#fff"); ends.addColorStop(.8, "#fff"); ends.addColorStop(1, "transparent");
    ctx.fillStyle = ends; ctx.fillRect(0, 0, 64, 256);
  });
  const plate = make(64, 40, (ctx) => {
    ctx.fillStyle = dark; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(1, 1, 62, 32, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(27, 32); ctx.lineTo(32, 39); ctx.lineTo(37, 32); ctx.fill();
    ctx.fillStyle = `${light}99`; for (const x of [5, 58]) for (const y of [5, 28]) ctx.fillRect(x, y, 2, 2);
  });
  const crack = make(20, 48, (ctx) => {
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, 12); ctx.lineTo(15, 23); ctx.lineTo(7, 35); ctx.lineTo(10, 48);
    ctx.strokeStyle = "#170907"; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  });
  const made = { halo, ray, ring, spark, smoke, beam, plate, crack }; cache.set(palette, made); return made;
}

function stamp(ctx: CanvasRenderingContext2D, picture: HTMLCanvasElement, x: number, y: number, w: number, h = w) {
  ctx.drawImage(picture, x - w / 2, y - h / 2, w, h);
}

/** Bounded bursts; late frames reconstruct their positions without allocating particles. */
export function drawForgeEffects(ctx: CanvasRenderingContext2D, show: ForgeShow, x: number, y: number, wall: number, reduced: boolean) {
  const at = showAt(show, wall); if (!at) return;
  const g = grandeur(show), top = isTop(show), result = at.phase === "result";
  const palette: Palette = !result ? "heat" : show.out === "taken" ? "gold" : show.out === "down" ? "red" : "grey";
  const art = pictures(palette);
  ctx.save();
  if (!result) {
    const charge = (at.beat + at.into) / 3;
    ctx.globalAlpha = reduced ? .28 : .12 + charge * .36;
    stamp(ctx, art.halo, x, y, 54 + 80 * charge);
    if (!reduced && !at.held && at.into >= .72) {
      const t = (at.into - .72) / .28, n = 5 + at.beat * 3;
      ctx.globalAlpha = 1 - t;
      for (let i = 0; i < n; i++) {
        const a = i * 2.399, reach = (18 + at.beat * 14) * t;
        stamp(ctx, art.spark, x + Math.cos(a) * reach, y + Math.sin(a) * reach - 12 * t, 4 + at.beat * 2);
      }
    }
    ctx.restore(); return;
  }
  const ms = at.ms, alpha = at.alpha;
  ctx.globalAlpha = alpha;
  if (show.out === "taken") {
    const rise = reduced ? 1 : Math.min(1, ms / 170);
    ctx.globalAlpha = alpha * (reduced ? .34 : .64);
    stamp(ctx, art.halo, x, y, (100 + 115 * g) * rise);
    if (g >= .6) {
      ctx.save(); ctx.translate(x, y); if (!reduced) ctx.rotate(ms / 5000);
      ctx.globalAlpha = alpha * (top ? .8 : .45); stamp(ctx, art.ray, 0, 0, (110 + 105 * g) * rise); ctx.restore();
    }
    if (top) { ctx.globalAlpha = alpha * (reduced ? .35 : .9); stamp(ctx, art.beam, x, y - 25, 100 * rise, 320); }
    if (!reduced) {
      for (let i = 0; i < (top ? 3 : 1); i++) {
        const t = (ms - i * 220) / 780; if (t < 0 || t >= 1) continue;
        ctx.globalAlpha = alpha * (1 - t); stamp(ctx, art.ring, x, y, 22 + (100 + 60 * g) * t);
      }
      // At most two overlapping bursts, twelve sparks each, plus six rising stars at +10.
      for (let b = 0; b < (top ? 3 : 1); b++) {
        const t = (ms - b * 1000) / 1300; if (t < 0 || t >= 1) continue;
        const n = top ? 12 : Math.round(5 + 7 * g);
        ctx.globalAlpha = alpha * (1 - t);
        for (let i = 0; i < n; i++) {
          const a = i * 2.399 + b, reach = (38 + 85 * g) * t * (.6 + i % 3 * .2);
          stamp(ctx, art.spark, x + Math.cos(a) * reach, y + Math.sin(a) * reach * .65 + 48 * t * t, (top ? 11 : 5 + 4 * g) * (1 - t * .5));
        }
      }
      if (top) for (let i = 0; i < 6; i++) {
        const t = (ms / 1900 + i / 6) % 1;
        ctx.globalAlpha = alpha * Math.sin(t * Math.PI);
        stamp(ctx, art.spark, x + Math.sin(i * 2.4 + ms / 850) * 32, y + 45 - t * 205, 8 + i % 3 * 3);
      }
    }
  } else if (show.out === "stays") {
    ctx.globalAlpha = alpha * .22; stamp(ctx, art.halo, x, y, 95);
    if (!reduced && ms < 1000) for (let i = 0; i < 3; i++) {
      const t = ms / 1000; ctx.globalAlpha = alpha * (1 - t) * .6;
      stamp(ctx, art.smoke, x + (i - 1) * (18 + 12 * t), y - 10 - 35 * t, 28 + 28 * t);
    }
  } else {
    ctx.globalAlpha = alpha * (reduced ? .22 : Math.max(.12, .62 * (1 - ms / 650)));
    stamp(ctx, art.halo, x, y, 140);
    if (!reduced && ms < 800) {
      const t = ms / 800; ctx.globalAlpha = alpha * (1 - t);
      for (let i = 0; i < 8; i++) {
        const a = i * 2.399; stamp(ctx, art.spark, x + Math.cos(a) * 65 * t, y + Math.sin(a) * 34 * t + 52 * t * t, 5);
      }
    }
  }
  ctx.restore();
}

export function drawForgePlate(ctx: CanvasRenderingContext2D, palette: Palette, x: number, y: number, w: number, h: number) {
  ctx.drawImage(pictures(palette).plate, x, y, w, h + 7);
}
export function drawForgeCrack(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.drawImage(pictures("red").crack, x, y, 14, h);
}
