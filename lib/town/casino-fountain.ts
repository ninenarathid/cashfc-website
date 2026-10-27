/**
 * Coins pouring out of a slot machine on a big win (the owner, 2026-10-27: "ทำเอฟเฟคเงินพุ่งๆออกมาจากเครื่อง ตอนได้รางวัลใหญ่
 * คนอื่นเห็นด้วย"), drawn by the room for everybody in it (lib/town/casino-room-art), from the moment the reels stop.
 * Coins burst up out of the cabinet's tray, turn over in the air, fall to the floor before the machine, knock once and
 * lie there, then fade. More coins and higher for a prize of Gil or a thing than for Casino Coins back above the price;
 * a little coin back keeps the cabinet's own spatter of chips. Each coin's flight comes from the spin's id, so every
 * page shows the same fountain. The light at the tray and the glints are the code's, as every light in the town is.
 */
import type { CasinoSpin } from "@/lib/casino";

/** How big a win is, for the fountain: none, coins back above the price, a prize of Gil or a thing. */
export function winSize(spin: Pick<CasinoSpin, "price" | "prize">): "none" | "big" | "grand" {
  if (!spin.prize) return "none";
  if (spin.prize.kind !== "coin") return "grand";
  return Number(spin.prize.amount) > spin.price ? "big" : "none";
}

const SIZES = { big: { coins: 42, emit: 1, speed: 1 }, grand: { coins: 76, emit: 1.6, speed: 1.2 } } as const;
/** Gravity, a coin's life, how it knocks on the floor: the machine's own pixels and seconds. */
const FALL = 380, LIFE = 3.2, KNOCK = .32;
/** How long a fountain lasts, from the reveal. */
export const FOUNTAIN_SECONDS = SIZES.grand.emit + LIFE;

const seedOf = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const randomOf = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** One coin at `sec` after the reveal, from the tray, in the machine's pixels: where, how far turned, whether it lies. */
export type Coin = { x: number; y: number; turn: number; lying: boolean; alpha: number };
export function coinsAt(spin: Pick<CasinoSpin, "id" | "price" | "prize">, sec: number): Coin[] {
  const size = winSize(spin);
  if (size === "none" || sec < 0 || sec > FOUNTAIN_SECONDS) return [];
  const { coins, emit, speed } = SIZES[size], roll = randomOf(seedOf(`${spin.id}:fountain`)), out: Coin[] = [];
  for (let j = 0; j < coins; j++) {
    const a = roll(), b = roll(), c = roll(), d = roll(), u = sec - (j / coins) * emit;
    if (u < 0 || u > LIFE) continue;
    // (up and out to either side, the middle the highest; the floor before the machine, a little nearer or farther)
    const angle = -Math.PI / 2 + (a * 2 - 1) * 1.1, v = (100 + 75 * b) * speed, vx = Math.cos(angle) * v, vy = Math.sin(angle) * v;
    const floor = 26 + 22 * c;
    // (the first fall to the floor, then one knock as high as KNOCK of its speed down, then it lies)
    const hit = (-vy + Math.sqrt(vy * vy + 2 * FALL * floor)) / FALL, down = vy + FALL * hit;
    let x: number, y: number, lying = false;
    if (u < hit) { x = vx * u; y = vy * u + FALL * u * u / 2; }
    else {
      const up = -down * KNOCK, back = -2 * up / FALL, w = u - hit, drift = vx * .45;
      if (w < back) { x = vx * hit + drift * w; y = floor + up * w + FALL * w * w / 2; }
      else { x = vx * hit + drift * back; y = floor; lying = true; }
    }
    out.push({ x, y, turn: lying ? 0 : u * (9 + 5 * d) + d * 6.28, lying, alpha: Math.min(1, (LIFE - u) / .5) });
  }
  return out;
}

/**
 * The fountain at the tray's point on the screen (`tx`, `ty`), `k` screen pixels to one of the machine's. Nothing
 * with motion reduced: the reels' result says the win.
 */
export function drawFountain(ctx: CanvasRenderingContext2D, spin: Pick<CasinoSpin, "id" | "price" | "prize">, sec: number, tx: number, ty: number, k: number, reduced: boolean) {
  if (reduced) return;
  const size = winSize(spin);
  if (size === "none" || sec < 0 || sec > FOUNTAIN_SECONDS) return;
  ctx.save();
  // the tray lights up as they burst out
  const flash = sec < .45 ? 1 - sec / .45 : 0;
  if (flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, (size === "grand" ? 34 : 24) * k);
    glow.addColorStop(0, `rgba(255,214,110,${.55 * flash})`); glow.addColorStop(1, "rgba(255,214,110,0)");
    ctx.fillStyle = glow; ctx.fillRect(tx - 40 * k, ty - 40 * k, 80 * k, 80 * k);
    ctx.globalCompositeOperation = "source-over";
  }
  const px = (n: number) => Math.max(1, Math.round(n * k));
  for (const c of coinsAt(spin, sec)) {
    // (a round coin row by row, in the machine's own pixels: its face as wide as it is turned to the eye, a flat oval
    // lying on the floor; a dark rim, the gold, a darker row at its foot and a glint at its upper left)
    const face = Math.abs(Math.cos(c.turn)), W = c.lying ? 9 : Math.max(2, Math.round(9 * face)), H = c.lying ? 4 : 9;
    const x = Math.round(tx + c.x * k), y0 = Math.round(ty + c.y * k - H * k / 2), row = px(1);
    ctx.globalAlpha = c.alpha;
    for (let i = 0; i < H; i++) {
      const v = (i + .5 - H / 2) / (H / 2), half = Math.max(.5, Math.round(W / 2 * Math.sqrt(Math.max(0, 1 - v * v)) * 2) / 2);
      const top = y0 + Math.round(i * k), left = Math.round(x - half * k), wide = Math.max(row, Math.round(half * 2 * k));
      ctx.fillStyle = "#6e430e"; ctx.fillRect(left, top, wide, row);
      if (i === 0 || i === H - 1 || half <= 1) continue;
      ctx.fillStyle = W <= 3 ? "#c8922a" : i === H - 2 ? "#d9a338" : "#f2c14e";
      ctx.fillRect(left + row, top, Math.max(0, wide - 2 * row), row);
    }
    if (W >= 5 && H >= 6) { ctx.fillStyle = "#fff1a6"; ctx.fillRect(Math.round(x - W / 4 * k), y0 + Math.round(2 * k), row, row); }
  }
  ctx.globalAlpha = 1;
  // glints over the falling gold, the grand one's more
  const glints = size === "grand" ? 7 : 3, roll = randomOf(seedOf(`${spin.id}:glint`));
  for (let g = 0; g < glints; g++) {
    const gx = (roll() * 2 - 1) * 46, gy = -20 - roll() * 40, at = roll() * 1.6, life = (sec - at) / .35;
    if (life < 0 || life > 1) continue;
    const arm = px(3 * Math.sin(Math.PI * life)), cx = Math.round(tx + gx * k), cy = Math.round(ty + gy * k);
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(cx - arm, cy, arm * 2 + px(1), px(1)); ctx.fillRect(cx, cy - arm, px(1), arm * 2 + px(1));
  }
  ctx.restore();
}
