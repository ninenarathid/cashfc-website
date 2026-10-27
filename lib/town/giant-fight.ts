import { seeded } from "./fishing";
import { GIANT } from "./giant-fish";

/**
 * The giant's fight as the two pages play it (lib/town/giant-fish has its rules and its count), on the board's own
 * picture: 200 across, 133 down, the water above the deck (`BOARD`), seen from above.
 *
 * - The fish pulls away upstream in **runs**, each shown `GIANT.cue` before it comes, and between them is drawn in
 *   towards the deck; it follows the rod tip sideways, so the angler steers it with the tip (`steer`, less when tired).
 * - Brought to the net's line it stays a moment (`pass`) and turns away again. The netter must have the hoop under it
 *   and held open for `scoopOpen` while it is there: that is a scoop. A scooped fish thrashes off in a run.
 * - The line runs from the rod tip to the fish's mouth: where it lies across a rock long enough (`rub`), it frays.
 *
 * Seeded by the hook (its rocks and its runs), so both pages see the same water. The angler's page moves the fish and
 * says where it is; the netter's page draws it from that and judges its own scoops.
 */
export const BOARD = { w: 200, h: 133, top: 14, left: 22, right: 178, net: 96, deck: 112, tip: 118 } as const;
export const FIGHT_FEEL = {
  /** How fast the fish is drawn in, and how fast a run takes it away (board px a second). */
  reel: 14, away: 30, side: 40,
  /** A run lasts so long; the next comes so long after the last ends. */
  runFor: 1.4, gap: [4.5, 7.5] as [number, number],
  /** How hard the fish follows the rod tip sideways (a second), and how it wanders of itself. */
  steer: 0.9, wander: 8,
  /** How long it stays at the net's line before it turns away. */
  pass: 1.4,
  /** How hard it swerves along the net's line while it is there (board px a second). */
  sway: 60,
  /** The net: how near the fish's mouth it must be, and how long held open. */
  reach: 11, scoopOpen: 0.25,
  /** A net held open falls shut after so long, and is lifted again only after so long. */
  openFor: 0.9, lift: 0.8,
  /** The line on a rock: so long rubbing is a fray. */
  rub: 0.75,
  /** How fast the hoop is moved by the keys or held open (board px a second). */
  hoop: 90, hoopOpen: 45,
} as const;

export interface Rock { x: number; y: number; r: number; kind: 0 | 1 }
export interface Run { at: number; dx: -1 | 1 }
export interface FishState {
  x: number; y: number; vx: number; vy: number;
  /** The run under way (its start), the next run's start, when it reached the net's line, when it was scooped. */
  run: Run | null; next: Run; pass: number | null; runs: number;
  rubbing: number; lastFray: number;
}

/** The rocks of a hook's water: three or four, in the middle of the water, never on the net's line; a boulder (`kind` 0) or two flat stones (1), each as wide as its picture (catch-art's gfBoulder, gfStones) at the board's scale. */
export function rocksOf(seed: number): Rock[] {
  const r = seeded(seed ^ 0x5bd1e995), n = 3 + (r() < 0.5 ? 1 : 0), out: Rock[] = [];
  for (let i = 0; i < 40 && out.length < n; i++) {
    const kind: 0 | 1 = r() < 0.6 ? 0 : 1, x = BOARD.left + 14 + r() * (BOARD.right - BOARD.left - 28), y = 28 + r() * 40, rad = kind ? 10 : 13;
    if (out.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + rad + 18)) out.push({ x: Math.round(x), y: Math.round(y), r: rad, kind });
  }
  return out;
}
/** The k-th run's start and its way (seconds from the fight's start). */
export function runOf(seed: number, k: number): Run {
  const r = seeded((seed ^ 0x27d4eb2d) + k * 7919);
  let at = 3;
  for (let i = 0; i <= k; i++) { const g = seeded((seed ^ 0x27d4eb2d) + i * 7919); at += FIGHT_FEEL.gap[0] + g() * (FIGHT_FEEL.gap[1] - FIGHT_FEEL.gap[0]) + (i ? FIGHT_FEEL.runFor : 0); }
  return { at, dx: r() < 0.5 ? -1 : 1 };
}
export function startFish(seed: number): FishState {
  const r = seeded(seed ^ 0x165667b1);
  return { x: BOARD.left + 30 + r() * (BOARD.right - BOARD.left - 60), y: 34, vx: 0, vy: 0, run: null, next: runOf(seed, 0), pass: null, runs: 0, rubbing: 0, lastFray: -99 };
}
/** Whether the next run is close enough to be shown. */
export const cueing = (f: FishState, t: number) => !f.run && t >= f.next.at - GIANT.cue / 1000 && t < f.next.at;
/** The fish's mouth is at the net's line. */
export const atNet = (f: FishState) => f.y >= BOARD.net - 8;

/** Distance from a point to the line from the rod tip to the fish's mouth. */
export function lineGap(tip: number, f: { x: number; y: number }, p: { x: number; y: number }): number {
  const ax = tip, ay = BOARD.tip, dx = f.x - ax, dy = f.y - ay, len = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len));
  return Math.hypot(ax + u * dx - p.x, ay + u * dy - p.y);
}

/**
 * The fish a moment on (`dt` seconds to `t`), led by the rod tip (`tip`, board px), the angler tired or not. `frayed`
 * when this moment's rubbing made a fray (the angler's page reports it); `scooped`, on the angler's page, when the
 * netter's word of a scoop came (the fish thrashes away).
 */
export function stepFish(f: FishState, t: number, dt: number, tip: number, tired: boolean, seed: number, rocks: readonly Rock[], scooped = false): { fish: FishState; frayed: boolean } {
  let { x, y, vx, vy, run, next, pass, runs, rubbing, lastFray } = f;
  const r = seeded(Math.floor(t * 10) ^ seed);
  if (scooped) { run = { at: t, dx: x < (BOARD.left + BOARD.right) / 2 ? 1 : -1 }; pass = null; }
  if (!run && t >= next.at) { run = next; runs += 1; next = runOf(seed, runs); pass = null; }
  // (it turns away of itself after a while at the net's line)
  if (!run && pass != null && t - pass >= FIGHT_FEEL.pass) { run = { at: t, dx: r() < 0.5 ? -1 : 1 }; pass = null; }
  if (run && t - run.at >= FIGHT_FEEL.runFor) run = null;
  const steer = FIGHT_FEEL.steer * (tired ? GIANT.tired : 1);
  let tx: number, ty: number;
  if (run) { tx = run.dx * FIGHT_FEEL.side; ty = -FIGHT_FEEL.away; }
  else if (pass != null) { tx = (tip - x) * steer * 0.5 + Math.sin((t - pass) * 3.2 + seed) * FIGHT_FEEL.sway; ty = 0; }
  else { tx = (tip - x) * steer + Math.sin(t * 1.3 + seed) * FIGHT_FEEL.wander; ty = FIGHT_FEEL.reel; }
  const k = Math.min(1, dt * 4);
  vx += (tx - vx) * k; vy += (ty - vy) * k;
  x = Math.max(BOARD.left, Math.min(BOARD.right, x + vx * dt));
  y = Math.max(BOARD.top + 16, Math.min(BOARD.net, y + vy * dt));
  if (!run && pass == null && y >= BOARD.net - 8) pass = t;
  // the line across a rock
  let frayed = false;
  const on = rocks.some((o) => lineGap(tip, { x, y }, o) < o.r);
  rubbing = on ? rubbing + dt : Math.max(0, rubbing - dt * 3);
  if (rubbing >= FIGHT_FEEL.rub && t - lastFray >= GIANT.frayGap / 1000) { frayed = true; lastFray = t; rubbing = 0; }
  return { fish: { x, y, vx, vy, run, next, pass, runs, rubbing, lastFray }, frayed };
}

/** The netter's hoop: where it is, since when it is held open (null shut), and when it was last let fall (a heavy net is lifted again only after `lift`). */
export interface Hoop { x: number; open: number | null; fell?: number }
/** The hoop held open (a press): not before it can be lifted again. Held longer than `openFor`, it falls shut of itself (`hoopNow`). */
export const openHoop = (h: Hoop, t: number): Hoop => (h.open != null || t - (h.fell ?? -99) < FIGHT_FEEL.lift ? h : { ...h, open: t });
export const shutHoop = (h: Hoop, t: number): Hoop => (h.open == null ? h : { ...h, open: null, fell: t });
export const hoopNow = (h: Hoop, t: number): Hoop => (h.open != null && t - h.open > FIGHT_FEEL.openFor ? shutHoop(h, t) : h);
/** Whether the hoop takes the fish now: under its mouth at the net's line, held open long enough. */
export const scoops = (h: Hoop, fish: { x: number; y: number }, t: number) =>
  h.open != null && t - h.open >= FIGHT_FEEL.scoopOpen && t - h.open <= FIGHT_FEEL.openFor && fish.y >= BOARD.net - 8 && Math.abs(h.x - fish.x) <= FIGHT_FEEL.reach;
/** The hoop moved by the keys (`dir` −1, 0, 1) for `dt`, slower held open. */
export const moveHoop = (h: Hoop, dir: number, dt: number): Hoop =>
  ({ ...h, x: Math.max(BOARD.left, Math.min(BOARD.right, h.x + dir * (h.open != null ? FIGHT_FEEL.hoopOpen : FIGHT_FEEL.hoop) * dt)) });
