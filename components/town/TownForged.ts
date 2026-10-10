import { drawForgeCrack, drawForgeEffects, drawForgePlate } from "@/lib/town/forge-effects";
import { KNOCKS_MS, SHOW, grandeur, isTop, levelAfter, showAt, type ForgeShow } from "@/lib/town/forge-show";
import { iconOf } from "@/lib/town/items";
import { drawIcon, type IconName } from "./TownIcon";

/** The forge's shared spectacle. Pictures are prepared once; decorations never build paths per frame. */
export function drawForged(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, show: ForgeShow, x: number, bottom: number, wall: number,
  how: { reduced: boolean; font: string; th: boolean }): number {
  const at = showAt(show, wall); if (!at) return bottom;
  const result = at.phase === "result", out = result ? show.out : null;
  const top10 = result && isTop(show), g = grandeur(show), ms = result ? at.ms : 0, alpha = result ? at.alpha : 1;
  const ink = out === "taken" ? "#fff0b3" : out === "down" ? "#ffb39c" : "#e0e7ef";
  const big = top10 ? 1.6 : out === "taken" ? 1 + .25 * g : 1;
  const words: Array<[string, string, number]> = !result
    ? [[`+${show.from}`, "#d9c39b", 600], ["›", "#c9a877", 600], [`+${show.from + 1}`, "#fff0c7", 700]]
    : out === "taken" ? [[`+${levelAfter(show)}`, ink, 800]]
      : out === "stays" ? [[`+${show.from}`, ink, 700], [how.th ? "คงเดิม" : "unchanged", "#aeb8ca", 500]]
        : [[`+${show.from}`, "#b98a80", 600], ["›", "#ff735d", 700], [`+${levelAfter(show)}`, ink, 800]];
  ctx.save(); ctx.globalAlpha = alpha; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const size = Math.round(15 * big), gap = 5, icon = Math.round(24 * big);
  const widths = words.map(([text, , weight]) => { ctx.font = `${weight} ${size}px ${how.font}`; return ctx.measureText(text).width; });
  const w = Math.round(9 + icon + 7 + widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1) + (out === "down" ? 23 : 12));
  const h = Math.round(33 * big);
  const hit = !result && !at.held && !how.reduced && at.into >= .72 && at.into < .9 ? 1 + at.beat : 0;
  const shake = out === "down" && !how.reduced && ms < 300 ? Math.round(Math.sin(ms / 26) * 4 * (1 - ms / 300)) : 0;
  const leap = out === "taken" && !how.reduced && ms < 320 ? -Math.round(Math.sin(ms / 320 * Math.PI) * (4 + 8 * g)) : 0;
  const left = Math.round(x - w / 2) + shake, top = Math.round(bottom - 7 - h) + hit + leap, cy = top + h / 2;
  drawForgeEffects(ctx, show, x, cy, wall, how.reduced);
  drawForgePlate(ctx, out === "taken" ? "gold" : out === "down" ? "red" : out === "stays" ? "grey" : "heat", left, top, w, h);
  ctx.globalAlpha = alpha * (out === "stays" ? .75 : 1);
  drawIcon(ctx, img, iconOf(show.item) as IconName, left + 9 + icon / 2, cy, icon);
  ctx.globalAlpha = alpha;
  let tx = left + 9 + icon + 7;
  words.forEach(([text, color, weight], i) => {
    ctx.font = `${weight} ${size}px ${how.font}`; ctx.fillStyle = "#140f0b"; ctx.fillText(text, tx + 1, cy + 2);
    ctx.fillStyle = color; ctx.fillText(text, tx, cy + 1); tx += widths[i] + gap;
  });
  if (out === "down") drawForgeCrack(ctx, left + w - 19, top + 2, h - 4);
  if (!result) {
    const swing = how.reduced || at.held ? -.5 : at.into < .55 ? -1 : at.into < .78 ? -1 + (at.into - .55) / .23 * 1.2 : .2 - (at.into - .78) / .22 * .7;
    ctx.save(); ctx.translate(left + w + 8, top - 3); ctx.rotate(swing);
    drawIcon(ctx, img, "hammer", -7, -11, 26 + at.beat * 2); ctx.restore();
  }
  ctx.restore(); return top - (top10 ? 8 : 2);
}

export const FORGED_BEATS = { knocks: Array.from({ length: SHOW.knocks }, (_, i) => Math.round((i + .78) * SHOW.knock)), result: KNOCKS_MS };
