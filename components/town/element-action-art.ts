import type { ElementAction } from '@/lib/town/element-action';

export const ACTION_LIFE = 1050;
export const ACTION_LIMIT = 8;
export interface ElementBurst { look: ElementAction; born: number; seed: number; x: number; y: number; soft: boolean }
/** Bounded, short-lived effects. A burst owns its loadout and impact point. */
export class ElementBursts {
  private bursts: ElementBurst[] = [];
  private seed = 0;
  add(look: ElementAction, now: number, x: number, y: number, soft = false) {
    this.alive(now);
    if (this.bursts.length >= ACTION_LIMIT) this.bursts.shift();
    this.bursts.push({ look: { ...look, elements: [...look.elements] }, born: now, seed: ++this.seed, x, y, soft });
  }
  alive(now: number) { this.bursts = this.bursts.filter(b => now >= b.born && now - b.born < ACTION_LIFE); return this.bursts; }
  clear() { this.bursts = []; }
}

/** Tiny paths and facets inherit the game's scale; no illustrative sprite is
 * pasted over an action. Each material evolves continuously from the impact. */
function beam(ctx: CanvasRenderingContext2D, hue: string, width: number, alpha: number, core = '#fffbe0') {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hue; ctx.lineWidth = width * 5; ctx.globalAlpha = alpha * .09; ctx.stroke();
  ctx.lineWidth = width * 2.2; ctx.globalAlpha = alpha * .38; ctx.stroke();
  ctx.strokeStyle = core; ctx.lineWidth = width * .65; ctx.globalAlpha = alpha * .85; ctx.stroke();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: string, alpha: number) {
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
  beam(ctx, hue, .7, alpha);
}
function random(seed: number, i: number) {
  let h = Math.imul(seed ^ (i + 1), 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fill(ctx: CanvasRenderingContext2D, color: string | CanvasGradient, alpha: number) {
  ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill();
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); fill(ctx, gradient, alpha);
}
/** Closed, tapered flame: a broad foot, a folding shoulder and a living tip.
 * It is material, rather than a stroked line or an illustrative fire icon. */
function flame(ctx: CanvasRenderingContext2D, x: number, foot: number, width: number, height: number, curl: number) {
  ctx.beginPath(); ctx.moveTo(x - width, foot);
  ctx.bezierCurveTo(x - width * 1.3, foot - height * .3, x + curl - width * .7, foot - height * .58, x + curl, foot - height);
  ctx.bezierCurveTo(x + curl + width * .3, foot - height * .54, x + width * 1.2, foot - height * .35, x + width, foot);
  ctx.quadraticCurveTo(x, foot + width * .4, x - width, foot); ctx.closePath();
}

/** World and minigame share the same bounded, procedural elemental motion.
 * Mixed sockets retain two materials; matching sockets intensify that material. */
export function paintElementAction(ctx: CanvasRenderingContext2D, b: ElementBurst, now: number, scale: number, still = false) {
  const t = still ? .3 : Math.max(0, Math.min(1, (now - b.born) / ACTION_LIFE));
  const fade = Math.min(1, t / .07, (1 - t) / .4) * (b.soft ? .3 : .85) * (still ? .65 : 1);
  const growth = 1 - (1 - t) ** 3;
  const power = b.soft ? .58 : b.look.doubled ? 1.12 : 1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(scale * power, scale * power);
  ctx.globalCompositeOperation = 'lighter';
  for (let slot = 0; slot < b.look.elements.length; slot++) {
    const element = b.look.elements[slot];
    const direction = slot ? -1 : 1;
    const twin = b.look.doubled && !b.soft;
    ctx.save();
    if (b.look.mix) ctx.translate(direction * (5 + growth * 5), 0);
    const r = 7 + growth * 19, spin = t * 2 + b.seed * .6 + slot * Math.PI;
    switch (element) {
      case 'fire': {
        const heat = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** .4;
        glow(ctx, 0, -4, 23, '#ff7325', fade * .32 * heat);
        const body = ctx.createLinearGradient(0, 8, 0, -32);
        body.addColorStop(0, '#ffb52b00'); body.addColorStop(.16, '#ffb52b'); body.addColorStop(.5, '#ff7722'); body.addColorStop(1, '#d93a21');
        const heart = ctx.createLinearGradient(0, 8, 0, -20);
        heart.addColorStop(0, '#ffd24f00'); heart.addColorStop(.2, '#ffd24f'); heart.addColorStop(1, '#ffb83c');
        // A cohesive flame grows from the contact, then tears into rising embers.
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < (twin ? 5 : 3); i++) {
          const wave = Math.sin(t * 23 + b.seed + i * 1.7);
          const x = (i - (twin ? 2 : 1)) * 4.1 + Math.sin(t * 15 + i * 2) * 1.4;
          const height = (19 + (i % 2 ? 12 : 5) + wave * 3) * heat;
          const width = (4.3 + (i % 2) + wave * .7) * heat;
          const curl = wave * 5 + Math.sin(t * 12 + i) * 3;
          const foot = 6 + Math.sin(t * 18 + i) * 1.2;
          flame(ctx, x, foot, width, height, curl); fill(ctx, body, fade * .75);
          flame(ctx, x, foot - 1, width * .62, height * .75, curl * .7); fill(ctx, heart, fade * .8);
          flame(ctx, x, foot - 2, width * .24, height * .4, curl * .3); fill(ctx, '#fff1b2', fade * .65);
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (twin ? 8 : 5); i++) {
          const u = (t * 1.4 + i * .19) % 1, x = (random(b.seed, i) - .5) * 23 + Math.sin(u * 8 + i) * 3;
          const y = 1 - u * 35, size = (1 - u) * 1.25;
          flame(ctx, x, y, size * .6, size * 3, Math.sin(u * 6) * size); fill(ctx, '#ffb94d', fade * (1 - u));
        }
        break;
      }
      case 'water': {
        const splash = Math.sin(Math.PI * Math.min(.98, t + .06));
        for (let i = 0; i < (twin ? 2 : 1); i++) {
          const dir = i ? -direction : direction;
          ctx.save(); ctx.scale(dir, 1); ctx.translate(i * 3, i * -4);
          // A curling, translucent crest spreads sideways and falls under gravity.
          ctx.beginPath(); ctx.moveTo(-18 * growth, 7);
          ctx.bezierCurveTo(-9, 8, -5, -splash * 18, 7, -splash * 20);
          ctx.bezierCurveTo(17, -splash * 23, 20, -splash * 10, 10, -splash * 9);
          ctx.bezierCurveTo(15, -splash * 17, 8, -splash * 18, 5, -splash * 10);
          ctx.bezierCurveTo(1, 3, 12, 8, 20 * growth, 8);
          ctx.quadraticCurveTo(0, 13, -18 * growth, 7); ctx.closePath();
          ctx.globalCompositeOperation = 'source-over'; fill(ctx, '#268fb9', fade * .55);
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.moveTo(-14 * growth, 6);
          ctx.bezierCurveTo(-5, 4, -5, -splash * 18, 7, -splash * 20);
          ctx.bezierCurveTo(15, -splash * 22, 19, -splash * 13, 11, -splash * 10);
          beam(ctx, '#49c9ee', 1.1, fade * .85, '#c9f7ff'); ctx.restore();
        }
        const drops = twin ? 9 : 6;
        for (let i = 0; i < drops; i++) {
          const u = Math.min(1, t * 1.2 + i * .025), vx = (i - (drops - 1) / 2) * (twin ? 5 : 8);
          const x = vx * u, y = 5 - Math.sin(u * Math.PI) * (16 + i % 3 * 6);
          ctx.save(); ctx.translate(x, y); ctx.rotate(vx * .02);
          ctx.beginPath(); ctx.moveTo(0, -3); ctx.bezierCurveTo(3, 0, 2, 2, 0, 2); ctx.bezierCurveTo(-2, 2, -3, 0, 0, -3);
          fill(ctx, '#58cff4', fade * (1 - u * .6));
          ctx.beginPath(); ctx.ellipse(-.5, 0, .5, 1, 0, 0, Math.PI * 2); fill(ctx, '#d2faff', fade * .7); ctx.restore();
        }
        ctx.beginPath(); ctx.ellipse(0, 9, r, r * .23, 0, .2, Math.PI * 1.6);
        beam(ctx, '#69d5ee', .7, fade * .45, '#c9f7ff');
        break;
      }
      case 'ice':
        // Crystals thrust out, hold their angular facets, then shed small chips.
        for (let i = 0; i < (twin ? 7 : 5); i++) {
          const a = (i - (twin ? 3 : 2)) * .32;
          const sprout = Math.min(1, t * 5), drift = Math.max(0, t - .45) * 13;
          const length = (14 + (i % 3) * 5) * sprout, width = 2.3 + i % 2;
          ctx.save(); ctx.translate(Math.sin(a) * (5 + drift), 7 + drift * .3); ctx.rotate(a);
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath(); ctx.moveTo(-width, 0); ctx.lineTo(-width, -length * .6); ctx.lineTo(0, -length); ctx.lineTo(width, -length * .72); ctx.lineTo(width, -1); ctx.closePath(); fill(ctx, '#5cbbdf', fade * .8);
          ctx.beginPath(); ctx.moveTo(0, -length); ctx.lineTo(width, -length * .72); ctx.lineTo(width, -1); ctx.lineTo(0, -length * .2); ctx.closePath(); fill(ctx, '#c4f7ff', fade * .8);
          ctx.beginPath(); ctx.moveTo(-width, -length * .6); ctx.lineTo(0, -length * .48); ctx.lineTo(0, -length * .2); ctx.lineTo(-width, 0); ctx.closePath(); fill(ctx, '#2779b2', fade * .8);
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.moveTo(0, -length); ctx.lineTo(0, -length * .2); beam(ctx, '#82e6ff', .45, fade * .7, '#e0fcff');
          ctx.restore();
        }
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, d = 5 + growth * 21;
          const x = Math.cos(a) * d, y = Math.sin(a) * d * .65;
          ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + 1.5, y); ctx.lineTo(x, y + 1); ctx.lineTo(x - 1, y); ctx.closePath(); fill(ctx, '#b2f1ff', fade * .65);
        }
        break;
      case 'earth':
        // Opaque, weighted stone and low dust distinguish earth from magic light.
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < (twin ? 9 : 6); i++) {
          const a = i * 1.8 + b.seed, distance = (5 + growth * 19) * (.5 + random(b.seed, i) * .5);
          const x = Math.cos(a) * distance, y = 7 + Math.sin(a) * distance * .25 - Math.sin(t * Math.PI) * (12 + i % 3 * 4);
          ctx.beginPath(); ctx.ellipse(x, 10 + Math.sin(a) * distance * .25, 4, 1.2, 0, 0, Math.PI * 2); fill(ctx, '#342b20', fade * .22);
          ctx.save(); ctx.translate(x, y); ctx.rotate(a + t * 1.8);
          ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-2, -4); ctx.lineTo(3, -3); ctx.lineTo(4, 2); ctx.lineTo(0, 4); ctx.closePath(); fill(ctx, '#765235', fade);
          ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(3, -3); ctx.lineTo(1, 0); ctx.lineTo(-4, 1); ctx.closePath(); fill(ctx, '#c4a072', fade);
          ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(4, 2); ctx.lineTo(0, 4); ctx.lineTo(-4, 1); ctx.closePath(); fill(ctx, '#4f3827', fade);
          ctx.restore();
        }
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4, d = growth * 27, x = Math.cos(a) * d, y = 9 + Math.sin(a) * d * .25;
          ctx.beginPath(); ctx.ellipse(x, y, 1.5 + t * 3, .8 + t, 0, 0, Math.PI * 2); fill(ctx, '#bc9564', fade * .22);
        }
        break;
      case 'lightning': {
        const tick = Math.floor(t * 14), flash = .22 + .78 * (1 - (t * 14 % 1)) ** 2;
        glow(ctx, 0, 0, 13, '#ffd447', fade * flash * .32);
        for (let bolt = 0; bolt < (twin ? 5 : 3); bolt++) {
          const a = bolt * 2.1 + b.seed * .7 + random(tick + b.seed, bolt) * .6;
          const dx = Math.cos(a), dy = Math.sin(a) * .8, length = 14 + growth * 13;
          ctx.beginPath(); ctx.moveTo(0, 0);
          for (let i = 1; i <= 5; i++) {
            const distance = i * length / 5, bend = (i % 2 ? 1 : -1) * (2 + random(tick + bolt, i) * 3);
            ctx.lineTo(dx * distance - dy * bend, dy * distance + dx * bend);
          }
          beam(ctx, '#ffca39', 1, fade * flash, '#fff9d9');
          ctx.beginPath(); ctx.moveTo(dx * length * .5, dy * length * .5);
          ctx.lineTo(dx * length * .65 - dy * 7, dy * length * .65 + dx * 7);
          ctx.lineTo(dx * length * .8 - dy * 4, dy * length * .8 + dx * 4);
          beam(ctx, '#e9b232', .55, fade * flash * .8, '#fff5b7');
        }
        break;
      }
      case 'wind':
        // Long, tapering airflow sweeps through; leaves tumble with that flow.
        for (let strand = 0; strand < (twin ? 4 : 3); strand++) {
          ctx.beginPath();
          for (let j = 0; j <= 18; j++) {
            const u = j / 18, a = spin * 2 * direction + strand * 2.1 + u * 2.6;
            const radius = 8 + growth * 16, x = Math.cos(a) * radius, y = Math.sin(a) * radius * .4 - strand * 3;
            if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          beam(ctx, '#8bd8b6', strand ? .55 : 1, fade * (strand ? .35 : .65), '#e1f9e8');
        }
        for (let i = 0; i < 4; i++) {
          const a = spin * 3 + i * 1.57, radius = 10 + growth * 13;
          ctx.save(); ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius * .45 - 3); ctx.rotate(a + .6);
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(0, -3, 3, 0); ctx.quadraticCurveTo(0, 2, -3, 0); fill(ctx, '#87bd74', fade * .8);
          ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.strokeStyle = '#d2edac'; ctx.lineWidth = .5; ctx.globalAlpha = fade * .7; ctx.stroke(); ctx.restore();
        }
        break;
      case 'light': {
        glow(ctx, 0, -3, 22, '#ffe9a8', fade * .28);
        for (let i = 0; i < (twin ? 10 : 6); i++) {
          const a = i * Math.PI * 2 / (twin ? 10 : 6) + .2, reach = 7 + growth * 18;
          ctx.save(); ctx.translate(0, -3); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(-1.3, -3); ctx.lineTo(0, -reach); ctx.lineTo(1.3, -3); ctx.closePath(); fill(ctx, '#fff0bc', fade * .3);
          ctx.restore();
        }
        star(ctx, 0, -3, 5 + Math.sin(t * Math.PI) * 2, '#ffe9a3', fade * .85);
        for (let i = 0; i < (twin ? 8 : 5); i++) {
          const u = (t + i * .19) % 1, x = (random(b.seed, i) - .5) * 35, y = 7 - u * 34;
          star(ctx, x, y, Math.sin(u * Math.PI) * (i % 2 ? 2.5 : 1.4), '#fff2c8', fade * .8);
        }
        break;
      }
      case 'dark': {
        // Shadow is a dim, translucent volume with violet edges, drawn inward.
        ctx.globalCompositeOperation = 'source-over';
        glow(ctx, 0, -3, 17, '#291739', fade * .65);
        for (let i = 0; i < (twin ? 5 : 3); i++) {
          const a = -spin * 1.5 + i * 2.1, radius = 23 * (1 - t * .55);
          ctx.save(); ctx.translate(0, -3); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(radius, 3);
          ctx.bezierCurveTo(radius + 4, -11, 1, -14, -5, -2);
          ctx.bezierCurveTo(3, -8, radius * .8, -7, radius, 3); ctx.closePath(); fill(ctx, '#453064', fade * .62);
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath(); ctx.moveTo(radius, 3); ctx.bezierCurveTo(radius + 2, -8, 3, -12, -5, -2);
          beam(ctx, '#9660d5', .55, fade * .55, '#bd8fe8'); ctx.restore();
        }
        for (let i = 0; i < 6; i++) {
          const u = (t + i * .15) % 1, a = i * 2.4 - t * 3, distance = 26 * (1 - u);
          const x = Math.cos(a) * distance, y = Math.sin(a) * distance * .65 - 3;
          ctx.beginPath(); ctx.moveTo(x, y - 1.8); ctx.lineTo(x + 1, y); ctx.lineTo(x, y + 1.8); ctx.lineTo(x - 1, y); ctx.closePath(); fill(ctx, '#bd81e4', fade * Math.sin(u * Math.PI) * .8);
        }
        break;
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
