/**
 * The HD-2D trial's own surfaces (the owner, 2026-11-17: a rough mock "โดยไม่มี model 3d", made by code): small pixel
 * pictures painted on a canvas at the town's own measure (32 pixels a tile), for the blocks its buildings are made of.
 * Nothing here is a player-facing icon or sprite of the game; it is the stand-in skin of a trial's stand-in shapes.
 */
import * as THREE from "three";

const PX = 32;

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
function shade(c: number, k: number): string {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * k))), g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * k))),
    b = Math.min(255, Math.max(0, Math.round((c & 255) * k)));
  return `rgb(${r},${g},${b})`;
}
function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}
function tex(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
/** Every pixel a little off its colour, as hand-laid pixels are. */
function speckle(g: CanvasRenderingContext2D, w: number, h: number, base: number, amount: number, seed: number) {
  const r = rnd(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    g.fillStyle = shade(base, 1 + (r() - 0.5) * amount);
    g.fillRect(x, y, 1, 1);
  }
}

/** Roof tiles in rows (kawara), a tile wide and a tile down the slope. */
export function roofTiles(base: number): THREE.Texture {
  const [c, g] = canvas(PX, PX);
  speckle(g, PX, PX, base, 0.12, 11);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    g.fillStyle = shade(base, 1.28); g.fillRect(0, y, PX, 1);
    g.fillStyle = shade(base, 0.62); g.fillRect(0, y + 7, PX, 1);
    for (let x = (row % 2) * 4; x < PX; x += 8) {
      g.fillStyle = shade(base, 0.7); g.fillRect(x, y + 1, 1, 6);
      g.fillStyle = shade(base, 1.16); g.fillRect(x + 1, y + 1, 1, 6);
    }
  }
  return tex(c);
}

/** Thatch: straw laid down the slope. */
export function thatch(base: number): THREE.Texture {
  const [c, g] = canvas(PX, PX);
  speckle(g, PX, PX, base, 0.2, 23);
  const r = rnd(5);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * PX), y = Math.floor(r() * PX), len = 3 + Math.floor(r() * 6);
    g.fillStyle = shade(base, r() < 0.5 ? 0.72 : 1.22);
    g.fillRect(x, y, 1, len);
  }
  for (let y = 7; y < PX; y += 8) { g.fillStyle = shade(base, 0.66); g.fillRect(0, y, PX, 1); }
  return tex(c);
}

/** Boards laid side by side: decks, floors, counters. */
export function planks(base: number, seed = 3): THREE.Texture {
  const [c, g] = canvas(PX, PX);
  const r = rnd(seed);
  for (let b = 0; b < 4; b++) {
    const k = 0.9 + r() * 0.22;
    for (let y = 0; y < 8; y++) for (let x = 0; x < PX; x++) {
      g.fillStyle = shade(base, k * (1 + (r() - 0.5) * 0.1));
      g.fillRect(x, b * 8 + y, 1, 1);
    }
    g.fillStyle = shade(base, 0.6); g.fillRect(0, b * 8 + 7, PX, 1);
    const cut = Math.floor(r() * PX);
    g.fillRect(cut, b * 8, 1, 7);
  }
  return tex(c);
}

/** Dressed stone in courses. */
export function stone(base: number): THREE.Texture {
  const [c, g] = canvas(PX, PX);
  speckle(g, PX, PX, base, 0.16, 41);
  for (let row = 0; row < 4; row++) {
    g.fillStyle = shade(base, 0.6); g.fillRect(0, row * 8 + 7, PX, 1);
    for (let x = (row % 2) * 8; x < PX; x += 16) g.fillRect(x, row * 8, 1, 7);
    g.fillStyle = shade(base, 1.2); g.fillRect(0, row * 8, PX, 1);
  }
  return tex(c);
}

/** One plain colour with a grain, for posts, cloth, plaster. */
export function plain(base: number, amount = 0.1): THREE.Texture {
  const [c, g] = canvas(16, 16);
  speckle(g, 16, 16, base, amount, 57);
  return tex(c);
}

export interface WallSkin { map: THREE.Texture; glow: THREE.Texture }
/**
 * A wall, a tile wide and a storey tall (32 × 64): a timber frame about a panel, a papered window in every other
 * panel. `glow` is the same wall with only its windows, for the light inside them at night.
 */
export function wall(kind: "plaster" | "wood" | "white" | "red"): WallSkin {
  const W = PX * 2, H = 64;
  const [c, g] = canvas(W, H), [e, eg] = canvas(W, H);
  const panel = { plaster: 0xe6d9bd, wood: 0x6b4630, white: 0xf0ebe0, red: 0x8a3a2c }[kind];
  const frame = { plaster: 0x4a3324, wood: 0x3a251a, white: 0x2f2f36, red: 0x4a2018 }[kind];
  const r = rnd(71);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    g.fillStyle = shade(panel, 1 + (r() - 0.5) * 0.08 - (y / H) * 0.06);
    g.fillRect(x, y, 1, 1);
  }
  if (kind === "wood" || kind === "red") for (let x = 0; x < W; x += 4) { g.fillStyle = shade(panel, 0.78); g.fillRect(x, 0, 1, H); }
  // the foot of the wall: boards on a plaster wall, dark tiles laid cornerwise on a storehouse's
  if (kind === "plaster") {
    for (let y = 44; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = shade(0x6b4630, 0.9 + ((x >> 2) % 2) * 0.14 + (r() - 0.5) * 0.08); g.fillRect(x, y, 1, 1); }
  } else if (kind === "white") {
    for (let y = 44; y < H; y++) for (let x = 0; x < W; x++) {
      const d = (x + y) % 8 === 0 || (x - y + 64) % 8 === 0;
      g.fillStyle = d ? "#d8d4cc" : shade(0x33343c, 1 + (r() - 0.5) * 0.1);
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = hex(frame);
  g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3); g.fillRect(0, 42, W, 2);
  for (const x of [0, PX - 1, PX, W - 1]) g.fillRect(x, 0, 1, H);
  g.fillRect(PX - 2, 0, 2, H);
  // the window, in the first panel: paper behind a lattice
  eg.fillStyle = "#000"; eg.fillRect(0, 0, W, H);
  const wx = 8, wy = 12, ww = 15, wh = 22;
  g.fillStyle = hex(frame); g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
  g.fillStyle = "#f4ead0"; g.fillRect(wx, wy, ww, wh);
  eg.fillStyle = "#fff"; eg.fillRect(wx, wy, ww, wh);
  g.fillStyle = hex(frame); eg.fillStyle = "#000";
  for (let x = wx + 3; x < wx + ww; x += 4) { g.fillRect(x, wy, 1, wh); eg.fillRect(x, wy, 1, wh); }
  for (let y = wy + 5; y < wy + wh; y += 6) { g.fillRect(wx, y, ww, 1); eg.fillRect(wx, y, ww, 1); }
  return { map: tex(c), glow: tex(e) };
}

/** A sliding door with its short curtain, one picture (not repeated). */
export function door(cloth: number): THREE.Texture {
  const [c, g] = canvas(32, 48);
  speckle(g, 32, 48, 0x3a251a, 0.12, 83);
  g.fillStyle = "#1c1410"; g.fillRect(3, 6, 26, 42);
  g.fillStyle = "#f0e2c0"; g.fillRect(5, 20, 10, 26); g.fillRect(17, 20, 10, 26);
  g.fillStyle = "#3a251a";
  for (let y = 25; y < 46; y += 5) g.fillRect(5, y, 22, 1);
  g.fillRect(9, 20, 1, 26); g.fillRect(21, 20, 1, 26);
  for (let i = 0; i < 3; i++) { g.fillStyle = shade(cloth, 1 - i * 0.06); g.fillRect(3 + i * 9, 6, 8, 13); }
  g.fillStyle = "#f4f0e6"; g.fillRect(14, 10, 4, 4);
  return tex(c, false);
}

/** A water wheel's face: rim and spokes, clear between them. */
export function wheel(): THREE.Texture {
  const [c, g] = canvas(64, 64);
  g.clearRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const dx = x - 31.5, dy = y - 31.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const spoke = Math.abs(Math.sin(a * 4)) < 0.16 && d < 30;
    if ((d > 25 && d < 31) || d < 5 || spoke || (d > 13 && d < 15.5)) {
      g.fillStyle = shade(0x6b4630, d > 28 || d < 2 ? 0.7 : 1 + ((x * 7 + y * 3) % 5) * 0.03);
      g.fillRect(x, y, 1, 1);
    }
  }
  return tex(c, false);
}

/** A notice board's paper: slips pinned to a pale board. */
export function notices(): THREE.Texture {
  const [c, g] = canvas(48, 32);
  speckle(g, 48, 32, 0x8a6a48, 0.1, 97);
  const r = rnd(9);
  for (let i = 0; i < 9; i++) {
    const x = 3 + (i % 5) * 9, y = 3 + Math.floor(i / 5) * 14 + Math.floor(r() * 3);
    g.fillStyle = r() < 0.3 ? "#f0d9a0" : "#f4eede"; g.fillRect(x, y, 7, 10);
    g.fillStyle = "#6a5a4a"; g.fillRect(x + 1, y + 2, 5, 1); g.fillRect(x + 1, y + 5, 4, 1);
    g.fillStyle = "#c0392b"; g.fillRect(x + 3, y, 1, 1);
  }
  return tex(c, false);
}

/** A soft round light, for a lantern's glow and its pool on the ground. */
export function glow(): THREE.Texture {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,214,150,1)");
  grad.addColorStop(0.35, "rgba(255,170,90,0.45)");
  grad.addColorStop(1, "rgba(255,140,60,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
