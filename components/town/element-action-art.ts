import { GEMS, type Element } from "@/lib/town/tools";
import type { ElementAction } from "@/lib/town/element-action";

export const ACTION_LIFE = 1050;
export const ACTION_LIMIT = 8;
export interface ElementBurst { look: ElementAction; born: number; seed: number; x: number; y: number; soft: boolean }
/** At most eight short bursts; each owns its loadout and impact point. */
export class ElementBursts {
  private bursts: ElementBurst[] = [];
  private seed = 0;
  add(look: ElementAction, now: number, x: number, y: number, soft = false) {
    this.alive(now);
    if (this.bursts.length >= ACTION_LIMIT) this.bursts.shift();
    this.bursts.push({ look: { ...look, elements: [...look.elements] }, born: now, seed: ++this.seed, x, y, soft });
  }
  alive(now: number) { this.bursts = this.bursts.filter((b) => now - b.born < ACTION_LIFE); return this.bursts; }
  clear() { this.bursts = []; }
}
function random(seed: number, i: number) {
  let h = Math.imul(seed ^ (i + 1), 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Square pixels, no glow filters or allocations per particle. Coordinates are CSS pixels. */
export function paintElementAction(ctx: CanvasRenderingContext2D, b: ElementBurst, now: number, scale: number, still = false) {
  const t = still ? 0.28 : Math.max(0, Math.min(1, (now - b.born) / ACTION_LIFE));
  const fade = still ? 0.55 : Math.min(1, (1 - t) * 2.5) * (b.soft ? 0.4 : 0.82);
  const radius = (b.soft ? 15 : b.look.doubled ? 34 : 27) * Math.sin(t * Math.PI / 2);
  const px = Math.max(1, Math.round(scale * 1.6));
  const dot = (x: number, y: number, colour: string, size = 1, alpha = 1) => {
    ctx.globalAlpha = fade * alpha; ctx.fillStyle = colour;
    ctx.fillRect(Math.round(b.x + x * scale), Math.round(b.y + y * scale), px * size, px * size);
  };
  const cross = (x: number, y: number, colour: string) => {
    dot(x, y, colour); dot(x - 2, y, colour); dot(x + 2, y, colour); dot(x, y - 2, colour); dot(x, y + 2, colour);
  };
  const motif = (element: Element, slot: number) => {
    const colour = GEMS[element].hue;
    for (let i = 0; i < (b.soft ? 5 : 8); i++) {
      const a = i * Math.PI / 4 + slot * 0.4 + random(b.seed, i) * 0.4;
      const r = radius * (0.55 + random(b.seed, i + 8) * 0.45);
      let x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5;
      switch (element) {
        case "fire": y -= t * 24; dot(x, y, colour, 2); dot(x, y - 3, "#ffce65"); break;
        case "water": y += t * t * 15 - 8 * Math.sin(t * Math.PI); dot(x, y, colour); dot(x, y + 2, "#c0efff"); break;
        case "ice": cross(x, y - t * 6, colour); break;
        case "earth": y += t * t * 19; dot(x, y, colour, 2); dot(x - 1, y - 2, "#ffe0a0"); break;
        case "lightning": for (let j = 0; j < 4; j++) dot(x + (j % 2 ? 2 : -1), y - j * 3, j % 2 ? colour : "#fff8bf"); break;
        case "wind": for (let j = 0; j < 4; j++) dot(Math.cos(a + t * 3 + j * 0.12) * r, Math.sin(a + t * 3 + j * 0.12) * r * 0.5, colour, 1, 1 - j * 0.2); break;
        case "light": cross(x, y - t * 10, i % 2 ? colour : "#ffffff"); break;
        case "dark": dot(x, y + t * 4, "#483064", 2); dot(x - 2, y - 2, colour); break;
      }
    }
  };
  ctx.save();
  b.look.elements.forEach(motif);
  if (b.look.mix) {
    const [a, c] = b.look.elements.map((e) => GEMS[e].hue);
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8, colour = i % 2 ? a : c;
      switch (b.look.mix) {
        case "steam": dot(Math.sin(i * 1.7 + t * 4) * (8 + t * 8), -i * 2 - t * 18, i % 3 ? colour : "#e9eaff", 2, 0.55); break;
        case "crystal": { const q = angle + Math.PI / 4; dot(Math.cos(q) * radius, Math.sin(q) * radius, colour); if (i % 4 === 0) cross(Math.cos(q) * radius, Math.sin(q) * radius, colour); break; }
        case "magma": dot((i - 8) * radius / 8, Math.sin(i * 2) * 3 + t * 5, colour, 2); break;
        case "storm": dot(Math.cos(angle) * radius + (i % 2 ? 3 : -3), Math.sin(angle) * radius * 0.65, colour, 2); break;
        case "vortex": dot(Math.cos(angle + t * 5) * radius, Math.sin(angle + t * 5) * radius * 0.5 - t * 9, colour); break;
        case "halo": dot(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.45 - 5, colour); if (i % 4 === 0) cross(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.45 - 5, colour); break;
        case "eclipse": dot(Math.cos(angle + t) * radius, Math.sin(angle + t) * radius * 0.75, i < 8 ? a : c, 2); break;
      }
    }
  }
  ctx.restore();
}
