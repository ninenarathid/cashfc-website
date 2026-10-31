/**
 * The title a limited outfit's winner wears under the name (the owner, 2026-10-31: "มีฉายาเท่ๆ เด่นๆให้ด้วยก็ได้ ฉายา animation
 * สวยๆ จัดเต็ม แตกต่างกันในแต่ละชุด"). Each design has a plate and a motion of its own, in the colours of the dye worn:
 *
 * - the count: bat-wing ends, a slow crimson sweep, a bat flapping at either end, drops falling from the plate;
 * - the pumpkin: a row of ghost fire burning along its top edge, a spirit at its head, sparks going up, the words flickering;
 * - the moon keeper: a moon at its head going through its phases, stars twinkling round it, a gold sweep;
 * - the maple: leaf-point ends, leaves blown across it from left to right, a warm sweep.
 *
 * The plate's body is a picture made once for its size, as title-plate's are; a frame adds only the moving light, the
 * words and a few squares. Nothing moves for whoever asks the page for less motion.
 */
import type { LimitedDye, LimitedKind } from "@/lib/town/limited";
import { limitedSprite } from "./limited-aura";

export type LimitedTitle = {
  text: string;
  /** Its copy number, as "#1/3". */
  number: string;
  kind: LimitedKind;
  dye: LimitedDye;
  x: number;
  y: number;
  now: number;
  seed: number;
  font: string;
  reduced: boolean;
};

const H = 22, HEAD = 22, END = 13, PAD = 16;
const frac = (v: number) => v - Math.floor(v);

function outlineOf(ctx: CanvasRenderingContext2D, kind: LimitedKind, w: number) {
  const m = H / 2, r = w - 0;
  ctx.beginPath();
  if (kind === "bats") {
    // (bat wings: three scallops running to a point at each end)
    ctx.moveTo(END, 0);
    ctx.lineTo(r - END, 0);
    ctx.lineTo(r, m - 5); ctx.lineTo(r - 5, m - 2); ctx.lineTo(r - 1, m + 2); ctx.lineTo(r - 7, m + 2); ctx.lineTo(r - 5, H - 2); ctx.lineTo(r - END, H);
    ctx.lineTo(END, H);
    ctx.lineTo(5, H - 2); ctx.lineTo(7, m + 2); ctx.lineTo(1, m + 2); ctx.lineTo(5, m - 2); ctx.lineTo(0, m - 5);
  } else if (kind === "leaves") {
    // (leaf points)
    ctx.moveTo(END, 0);
    ctx.lineTo(r - END, 0);
    ctx.lineTo(r - 5, 3); ctx.lineTo(r - 7, 6); ctx.lineTo(r, m); ctx.lineTo(r - 7, H - 6); ctx.lineTo(r - 5, H - 3); ctx.lineTo(r - END, H);
    ctx.lineTo(END, H);
    ctx.lineTo(5, H - 3); ctx.lineTo(7, H - 6); ctx.lineTo(0, m); ctx.lineTo(7, 6); ctx.lineTo(5, 3);
  } else if (kind === "spirits") {
    // (ends licked into flames)
    ctx.moveTo(END, 0);
    ctx.lineTo(r - END, 0);
    ctx.quadraticCurveTo(r - 6, 3, r, 1);
    ctx.quadraticCurveTo(r - 2, 7, r - 5, m);
    ctx.quadraticCurveTo(r - 1, m + 5, r - END, H);
    ctx.lineTo(END, H);
    ctx.quadraticCurveTo(1, m + 5, 5, m);
    ctx.quadraticCurveTo(2, 7, 0, 1);
    ctx.quadraticCurveTo(6, 3, END, 0);
  } else {
    // (the moon's: a long plate with round ends)
    ctx.moveTo(m, 0);
    ctx.lineTo(r - m, 0);
    ctx.arc(r - m, m, m, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(m, H);
    ctx.arc(m, m, m, Math.PI / 2, -Math.PI / 2);
  }
  ctx.closePath();
}

const bodies = new Map<string, HTMLCanvasElement>();
/** The plate at its size and colours, made once. */
function body(kind: LimitedKind, dye: LimitedDye, w: number, k: number): HTMLCanvasElement {
  const key = `${kind}|${dye.en}|${Math.round(w)}|${k}`;
  const known = bodies.get(key);
  if (known) return known;
  const c = document.createElement("canvas");
  c.width = Math.ceil((w + PAD * 2) * k); c.height = Math.ceil((H + PAD * 2) * k);
  const ctx = c.getContext("2d")!;
  ctx.scale(k, k);
  ctx.translate(PAD, PAD);
  const ramp = dye.aura;
  outlineOf(ctx, kind, w);
  const fill = ctx.createLinearGradient(0, 0, 0, H);
  fill.addColorStop(0, ramp[1]); fill.addColorStop(0.18, ramp[0]); fill.addColorStop(0.75, "#0b0a10"); fill.addColorStop(1, ramp[0]);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(6,4,8,0.9)"; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = ramp[2]; ctx.stroke();
  ctx.save();
  outlineOf(ctx, kind, w); ctx.clip();
  ctx.lineWidth = 1; ctx.strokeStyle = ramp[3]; ctx.globalAlpha = 0.65;
  ctx.beginPath(); ctx.moveTo(END - 2, 1.75); ctx.lineTo(w - END + 2, 1.75); ctx.stroke();
  ctx.globalAlpha = 0.45; ctx.strokeStyle = ramp[1];
  ctx.beginPath(); ctx.moveTo(END - 2, H - 2); ctx.lineTo(w - END + 2, H - 2); ctx.stroke();
  ctx.restore();
  // (the ring of its medallion at the head of the plate)
  ctx.beginPath(); ctx.arc(HEAD - 3, H / 2, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#0b0a10"; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = ramp[2]; ctx.stroke();
  bodies.set(key, c);
  return c;
}

function square(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const n = Math.max(1, Math.round(size));
  ctx.fillRect(Math.round(x - n / 2), Math.round(y - n / 2), n, n);
}

/** The moon's phases: a pale disc with the dark slid across it. */
function moonPhase(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number, ramp: readonly string[]) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = ramp[3]; ctx.fillRect(x - 7, y - 7, 14, 14);
  ctx.fillStyle = "#0b0a10";
  const slide = Math.cos(phase * Math.PI * 2) * 14;
  ctx.beginPath(); ctx.arc(x + slide, y, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawLimitedTitle(ctx: CanvasRenderingContext2D, a: LimitedTitle) {
  const ramp = a.dye.aura;
  ctx.save();
  ctx.font = `700 11.5px ${a.font}`;
  const words = ctx.measureText(a.text).width;
  ctx.font = `700 9.5px ${a.font}`;
  const num = ctx.measureText(a.number).width;
  const w = Math.round(words + num + HEAD + 26), k = Math.max(1, Math.round(ctx.getTransform().a * 100) / 100);
  const left = Math.round(a.x - w / 2), top = Math.round(a.y - H / 2) + (a.kind === "spirits" ? 6 : 3), mid = top + H / 2;
  const t = a.reduced ? 0 : a.now + (a.seed % 9973);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a.reduced ? 0.3 : 0.28 + 0.1 * Math.sin(t / 700);
  const halo = ctx.createRadialGradient(a.x, mid, 2, a.x, mid, w * 0.62);
  halo.addColorStop(0, ramp[2]); halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(left - 24, top - 16, w + 48, H + 32);
  ctx.restore();

  // what burns along the pumpkin's top goes behind its plate
  if (a.kind === "spirits" && !a.reduced) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const n = Math.floor((w - 16) / 5);
    for (let i = 0; i <= n; i++) {
      const fx = left + 8 + i * 5, tall = 2 + Math.round((Math.sin(t * 0.009 + i * 1.7) + Math.sin(t * 0.017 + i * 0.6) + 2) * 0.75);
      for (let j = 0; j < tall; j++) {
        ctx.fillStyle = ramp[Math.min(3, Math.floor((j / tall) * 3.4))];
        square(ctx, fx + Math.sin(j + i + t * 0.006) * 0.8, top + 1 - j * 1.6, j < tall / 2 ? 3 : 2);
      }
    }
    ctx.restore();
  }

  ctx.drawImage(body(a.kind, a.dye, w, k), left - PAD, top - PAD, w + PAD * 2, H + PAD * 2);

  // the light across the plate
  if (!a.reduced) {
    const every = a.kind === "spirits" ? 2600 : 3600, u = (t % every) / 1100;
    if (u < 1) {
      ctx.save();
      ctx.translate(left, top); outlineOf(ctx, a.kind, w); ctx.clip();
      const at = -30 + (w + 60) * u, sheen = ctx.createLinearGradient(at - 18, 0, at + 18, 0);
      sheen.addColorStop(0, "rgba(255,255,255,0)"); sheen.addColorStop(0.5, "rgba(255,255,255,0.5)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(at - 18, 0, 36, H);
      ctx.restore();
    }
  }

  // the head of the plate
  const hx = left + HEAD - 3;
  if (a.kind === "moon") moonPhase(ctx, hx, mid, a.reduced ? 0.15 : frac(t / 9000), ramp);
  else if (a.kind === "spirits") limitedSprite(ctx, Math.sin(t * 0.009) + Math.sin(t * 0.023) > 0 ? "auraPumpkinA" : "auraPumpkinB", a.dye, hx, mid, 0.66);
  else if (a.kind === "bats") limitedSprite(ctx, Math.floor(t / 130) % 2 ? "auraBatA" : "auraBatB", a.dye, hx, mid, 0.55);
  else limitedSprite(ctx, Math.floor(t / 420) % 2 ? "auraLeafA" : "auraLeafB", a.dye, hx, mid, 0.55);

  // the words, a light running through them; edged dark so that they read on anything
  const tx = left + HEAD + 9;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = `700 11.5px ${a.font}`;
  const shift = a.reduced ? 0.5 : frac(t / (a.kind === "spirits" ? 1500 : 2600));
  const ink = ctx.createLinearGradient(tx, 0, tx + words, 0);
  const at = (v: number) => Math.max(0, Math.min(1, v));
  ink.addColorStop(0, ramp[3]);
  ink.addColorStop(at(shift - 0.12), ramp[3]);
  ink.addColorStop(at(shift), "#ffffff");
  ink.addColorStop(at(shift + 0.12), ramp[3]);
  ink.addColorStop(1, ramp[3]);
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(6,4,8,0.95)";
  ctx.strokeText(a.text, tx, mid + 0.5);
  ctx.fillStyle = ink;
  ctx.fillText(a.text, tx, mid + 0.5);
  ctx.font = `700 9.5px ${a.font}`;
  ctx.strokeText(a.number, tx + words + 5, mid + 0.5);
  ctx.fillStyle = ramp[2];
  ctx.fillText(a.number, tx + words + 5, mid + 0.5);

  // what is its own
  if (!a.reduced) {
    if (a.kind === "spirits") {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 8; i++) {
        const u = frac(t / 1300 + i / 8);
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = ramp[3];
        square(ctx, (i % 2 ? left - 6 - u * 6 : left + w + 6 + u * 6) + Math.sin(u * 7 + i) * 2, mid + 8 - u * 22, u < 0.5 ? 2 : 1);
      }
    } else if (a.kind === "bats") {
      // a bat at each end of the plate, and drops falling from it
      limitedSprite(ctx, Math.floor(t / 120) % 2 ? "auraBatA" : "auraBatB", a.dye, left - 8 + Math.sin(t / 620) * 3, top - 4 + Math.sin(t / 410) * 3, 0.42);
      limitedSprite(ctx, Math.floor(t / 110) % 2 ? "auraBatB" : "auraBatA", a.dye, left + w + 8 + Math.sin(t / 540) * 3, top - 2 + Math.cos(t / 470) * 3, 0.42);
      for (let i = 0; i < 4; i++) {
        const u = frac(t / 1900 + i / 4);
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = ramp[2];
        square(ctx, left + 18 + (i * 67 + 13) % (w - 36), top + H + u * 12, 2);
      }
    } else if (a.kind === "moon") {
      // stars twinkling round it, each a little cross
      for (let i = 0; i < 7; i++) {
        const u = frac(t / 2100 + i / 7), b = Math.sin(u * Math.PI);
        if (b < 0.25) continue;
        const sx = left + 4 + ((i * 61 + 29) % (w - 8)), sy = top + H + 3 + (i % 3) * 2;
        ctx.globalAlpha = b;
        ctx.fillStyle = ramp[3];
        square(ctx, sx, sy, 2);
        if (b > 0.7) { square(ctx, sx - 2, sy, 1); square(ctx, sx + 2, sy, 1); square(ctx, sx, sy - 2, 1); square(ctx, sx, sy + 2, 1); }
      }
    } else {
      // leaves blown across it
      for (let i = 0; i < 3; i++) {
        const u = frac(t / 3200 + i / 3);
        limitedSprite(ctx, Math.floor(u * 10 + i) % 2 ? "auraLeafA" : "auraLeafB", a.dye, left - 8 + u * (w + 16), top + H - 2 + Math.sin(u * Math.PI * 3 + i) * 3 + u * 6, 0.3, u < 0.1 ? u * 10 : u > 0.85 ? (1 - u) / 0.15 : 1);
      }
    }
  }
  ctx.restore();
}
