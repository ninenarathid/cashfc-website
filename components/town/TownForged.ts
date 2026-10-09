import { KNOCKS_MS, SHOW, grandeur, isTop, levelAfter, showAt, type ForgeShow } from "@/lib/town/forge-show";
import { iconOf } from "@/lib/town/items";
import { drawIcon, type IconName } from "./TownIcon";

/**
 * A try at the forge, drawn over the forger's head on the map (lib/town/forge-show): an iron plate with the tool and
 * the level tried for, the hammer's three knocks, and then what came of it. Taken: gold, with a ring and sparks as
 * large as the level is high, rays from the seventh level on, and at the top a dusk about the forger, a pillar of
 * light, a larger plate and a longer while: nobody in sight of it takes it for another try. The level kept: grey, a
 * puff. A level lost: red, a crack at the plate's end. With the town's motion off the plate stands still and says
 * the same in its colours and its numbers.
 *
 * `x` is the middle of the head and `bottom` where the plate's tail ends; it answers where its top is, so that
 * whatever else is over the head (what they typed) goes above it.
 */
export function drawForged(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, show: ForgeShow, x: number, bottom: number, wall: number,
  how: { reduced: boolean; font: string; th: boolean }): number {
  const at = showAt(show, wall);
  if (!at) return bottom;
  const result = at.phase === "result", out = result ? show.out : null, top10 = result && isTop(show), g = grandeur(show);
  const ms = result ? at.ms : 0, alpha = result ? at.alpha : 1, still = how.reduced;
  const ink = out === "taken" ? "#ffe08a" : out === "stays" ? "#b9c0cb" : out === "down" ? "#ff9d8a" : "#f3e3c3";
  const edge = out === "taken" ? "#f0c46a" : out === "stays" ? "#7d8490" : out === "down" ? "#c9432f" : "#16181c";

  // ── what the plate says ──
  // (taken, it comes up larger than it was struck, the more the higher the level; at the top half as large again, with a beat to it)
  const beat = top10 && !still ? 1 + 0.05 * Math.sin(ms / 190) : 1;
  const big = top10 ? 1.5 * beat : out === "taken" ? 1 + 0.2 * g : 1;
  const words: Array<[text: string, color: string, weight: number]> = !result
    ? [[`+${show.from}`, "#d9c39b", 600], ["›", "#a88d5e", 600], [`+${show.from + 1}`, "#f3e3c3", 700]]
    : out === "taken" ? [[`+${levelAfter(show)}`, ink, 800]]
      : out === "stays" ? [[`+${show.from}`, ink, 700], [how.th ? "ไม่ขึ้น" : "no luck", "#9aa1ad", 500]]
        : [[`+${show.from}`, "#b98a80", 600], ["›", "#c9432f", 700], [`+${levelAfter(show)}`, ink, 800]];
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const size = Math.round(15 * big), gap = 5;
  const widths = words.map(([text, , weight]) => { ctx.font = `${weight} ${size}px ${how.font}`; return ctx.measureText(text).width; });
  // (a level lost: room at the plate's end for the crack, clear of what it says)
  const icon = Math.round(24 * big), tail = out === "down" ? 22 : 11;
  const w = Math.round(9 + icon + 7 + widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1) + tail), h = Math.round(31 * big);
  // (a knock sets the plate down a pixel; a level lost shakes it for a moment)
  const hit = !result && !at.held && !still && at.into > 0.55 && at.into < 0.8 ? 1 : 0;
  const shake = out === "down" && !still && ms < 360 ? Math.round(Math.sin(ms / 22) * 3 * (1 - ms / 360)) : 0;
  // (taken: it comes up with a small leap)
  const leap = out === "taken" && !still && ms < 260 ? -Math.round(Math.sin((ms / 260) * Math.PI) * (3 + 6 * g)) : 0;
  const left = Math.round(x - w / 2) + shake, top = Math.round(bottom - 7 - h) + hit + leap, cy = top + h / 2;
  ctx.globalAlpha = alpha;

  if (out === "taken") {
    const rise = still ? 1 : Math.min(1, ms / 420);
    // ── the top: a dusk about the forger, so that its gold is seen at noon as well as at night ──
    if (top10) {
      const dusk = ctx.createRadialGradient(x, cy + 34, 26, x, cy + 34, 190);
      dusk.addColorStop(0, `rgba(14,10,26,${0.58 * rise})`); dusk.addColorStop(0.55, `rgba(14,10,26,${0.34 * rise})`); dusk.addColorStop(1, "rgba(14,10,26,0)");
      ctx.fillStyle = dusk;
      ctx.fillRect(x - 190, cy - 156, 380, 380);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // ── the top: a pillar of light down over the forger ──
    if (top10) {
      const wide = 26 + 10 * rise, y0 = top - 150, y1 = bottom + 70;
      const pillar = ctx.createLinearGradient(0, y0, 0, y1);
      pillar.addColorStop(0, "rgba(255,214,110,0)"); pillar.addColorStop(0.35, `rgba(255,220,130,${0.5 * rise})`); pillar.addColorStop(0.8, `rgba(255,236,170,${0.62 * rise})`); pillar.addColorStop(1, "rgba(255,214,110,0)");
      ctx.fillStyle = pillar;
      ctx.fillRect(x - wide, y0, wide * 2, y1 - y0);
      ctx.fillStyle = `rgba(255,248,214,${0.5 * rise})`;
      ctx.fillRect(x - wide * 0.34, y0 + 40, wide * 0.68, y1 - y0 - 60);
    }
    // ── rays about the plate, from the seventh level on: longer and more the higher, and turning at the top ──
    if (g >= 0.7) {
      const n = top10 ? 16 : 8, reach = (top10 ? 118 : 34 + 70 * (g - 0.7)) * rise, turn = still ? 0.2 : ms / (top10 ? 2400 : 5200);
      for (let i = 0; i < n; i++) {
        const a = turn + (i * Math.PI * 2) / n, wide = i % 2 ? 0.05 : 0.085, far = reach * (i % 2 ? 0.66 : 1);
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + Math.cos(a - wide) * far, cy + Math.sin(a - wide) * far);
        ctx.lineTo(x + Math.cos(a + wide) * far, cy + Math.sin(a + wide) * far);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,214,110,${(top10 ? 0.44 : 0.26) + (still ? 0 : 0.08 * Math.sin(ms / 240 + i))})`;
        ctx.fill();
      }
    }
    const far = 22 + 44 * g + (top10 ? 30 : 0), halo = ctx.createRadialGradient(x, cy, 2, x, cy, far);
    halo.addColorStop(0, `rgba(255,220,130,${0.25 + 0.5 * g})`); halo.addColorStop(1, "rgba(255,220,130,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - far, cy - far, far * 2, far * 2);
    ctx.restore();
    // ── a ring that opens, and sparks thrown out that fall: as many and as far as the level is high (behind the plate: what it says stays clear) ──
    if (!still) {
      const ringMs = 520 + 380 * g, rings = top10 ? 3 : 1;
      for (let r = 0; r < rings; r++) {
        const ring = (ms - r * 260) / ringMs;
        if (ring < 0 || ring >= 1) continue;
        ctx.strokeStyle = `rgba(255,224,138,${(1 - ring) * 0.95})`;
        ctx.lineWidth = 1.5 + 3 * g;
        ctx.beginPath(); ctx.arc(x, cy, 12 + (18 + 62 * g) * ring, 0, Math.PI * 2); ctx.stroke();
      }
      const n = Math.round(5 + 19 * g * g), life = 700 + 800 * g, bursts = top10 ? Math.min(5, Math.floor(ms / 800) + 1) : 1;
      for (let b = 0; b < bursts; b++) {
        const t = (ms - b * 800) / life;
        if (t < 0 || t >= 1) continue;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + b * 0.5 + (i % 3) * 0.21, v = (26 + 58 * g) * (0.6 + ((i * 7) % 5) / 8);
          const sx = x + Math.cos(a) * v * t, sy = cy + Math.sin(a) * v * t * 0.8 + 30 * t * t, sq = (i % 3 === 0 ? 3 : 2) + (top10 ? 1 : 0);
          ctx.fillStyle = i % 4 === 0 ? `rgba(255,250,224,${1 - t})` : `rgba(255,206,92,${1 - t})`;
          ctx.fillRect(Math.round(sx), Math.round(sy), sq, sq);
        }
      }
    }
  }

  // ── the plate: iron, riveted, with a tail to the head ──
  const plate = ctx.createLinearGradient(0, top, 0, top + h);
  if (out === "taken") { plate.addColorStop(0, "#6a4d1f"); plate.addColorStop(1, "#33240f"); }
  else if (out === "down") { plate.addColorStop(0, "#4a2620"); plate.addColorStop(1, "#2b1512"); }
  else { plate.addColorStop(0, "#565b63"); plate.addColorStop(1, "#33373d"); }
  ctx.fillStyle = plate;
  ctx.strokeStyle = edge;
  ctx.lineWidth = top10 ? 3 : 2;
  round(ctx, left, top, w, h, 7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, top + h); ctx.lineTo(x, top + h + 6); ctx.lineTo(x + 5, top + h);
  ctx.closePath();
  ctx.fillStyle = out === "taken" ? "#33240f" : out === "down" ? "#2b1512" : "#33373d";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (const [rx, ry] of [[left + 4, top + 4], [left + w - 5, top + 4], [left + 4, top + h - 5], [left + w - 5, top + h - 5]]) ctx.fillRect(rx, ry, 1.5, 1.5);

  // ── the tool, and what the plate says ──
  if (out === "stays") ctx.globalAlpha = alpha * 0.7;
  drawIcon(ctx, img, iconOf(show.item) as IconName, left + 9 + icon / 2, cy, icon);
  ctx.globalAlpha = alpha;
  let tx = left + 9 + icon + 7;
  words.forEach(([text, color, weight], i) => {
    ctx.font = `${weight} ${size}px ${how.font}`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(text, tx + 1, cy + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, tx, cy + 1);
    tx += widths[i] + gap;
  });
  // a level lost: a crack down the plate's end
  if (out === "down") {
    const grow = still ? 1 : Math.min(1, ms / 140), cx = left + w - 11;
    const pts = [[2, 0], [-3, 0.28], [3, 0.5], [-2, 0.74], [1, 1]];
    ctx.beginPath();
    pts.slice(0, Math.max(2, Math.ceil(pts.length * grow))).forEach(([dx, fy], i) => (i ? ctx.lineTo(cx + dx, top + h * fy) : ctx.moveTo(cx + dx, top + h * fy)));
    ctx.strokeStyle = "#150806"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "#ff6a4d"; ctx.lineWidth = 1; ctx.stroke();
  }

  // ── the knocks: the hammer over the plate's right end, and sparks where it lands ──
  if (!result) {
    const hx = left + w - 2, hy = top + 1;
    // (raised, then down fast, then a small rebound: components/town/TownSmith's own swing)
    const swing = still || at.held ? -0.5 : at.into < 0.55 ? -1.0 : at.into < 0.78 ? -1.0 + ((at.into - 0.55) / 0.23) * 1.15 : 0.15 - ((at.into - 0.78) / 0.22) * 0.55;
    ctx.save();
    ctx.translate(hx + 10, hy - 3);
    ctx.rotate(swing);
    drawIcon(ctx, img, "hammer", -7, -11, 24);
    ctx.restore();
    if (!still && !at.held && at.into >= 0.78) {
      const fly = (at.into - 0.78) / 0.22;
      ctx.fillStyle = `rgba(255,214,110,${1 - fly})`;
      for (const [sx, sy] of [[-11, -9], [8, -12], [-3, -15], [13, -5]]) ctx.fillRect(Math.round(hx - 4 + sx * fly), Math.round(hy + 2 + sy * fly), 2, 2);
    }
  }

  // ── what came of it, over the plate ──
  // the top: stars that keep rising up the pillar while it lasts
  if (top10 && !still) {
    for (let i = 0; i < 9; i++) {
      const t = ((ms / 1500 + i / 9) % 1), sx = x + Math.sin(i * 2.4 + ms / 700) * (22 + (i % 3) * 9), sy = bottom + 40 - t * 190;
      ctx.globalAlpha = alpha * Math.sin(t * Math.PI) * 0.95;
      drawIcon(ctx, img, (`fxSpark${(i % 4) + 1}`) as IconName, sx, sy, 11 + (i % 3) * 3);
    }
    ctx.globalAlpha = alpha;
  }
  if (out === "stays" && !still && ms < 700) {
    // a puff of smoke off the plate
    const t = ms / 700;
    ctx.fillStyle = `rgba(170,176,186,${0.5 * (1 - t)})`;
    for (const [px, r] of [[-12, 5], [2, 6.5], [14, 4.5]]) { ctx.beginPath(); ctx.arc(x + px + px * 0.4 * t, top - 2 - 14 * t, r + 3 * t, 0, Math.PI * 2); ctx.fill(); }
  }
  if (out === "down" && !still && ms < 600) {
    // chips off the crack
    const t = ms / 600, cx = left + w - 11;
    ctx.fillStyle = `rgba(255,120,92,${1 - t})`;
    for (const [dx, dy] of [[-12, -10], [10, -14], [-6, 12], [12, 8], [2, -18]]) ctx.fillRect(Math.round(cx + dx * t), Math.round(cy + dy * t + 14 * t * t), 2, 2);
  }
  ctx.restore();
  return top - (top10 ? 8 : 2);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** When the knocks of a show are heard and when what came of it is, from its beginning: for whoever makes its sounds. */
export const FORGED_BEATS = { knocks: Array.from({ length: SHOW.knocks }, (_, i) => Math.round((i + 0.78) * SHOW.knock)), result: KNOCKS_MS };
