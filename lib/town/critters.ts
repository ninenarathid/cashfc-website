import { PROPS, TOWN, findPath, groundAt, onDeck, onYard, walkable, type Vec } from "./world";

/**
 * Life about town (the owner's call, 2026-10-02: "มีแมวหมาวิ่งเล่น ผีเสื้อออกมาบิน
 * (แต่จะไม่มีตอนฝนตก) นกกระจิบ บินไปบินมา หรือเกาะตามต้นไม้"):
 *
 *   · little birds, each at home in a few trees: perched for a while (looking
 *     round, pecking), then a short flight to another tree;
 *   · butterflies round the flowers in town;
 *   · now and then a dog chasing a cat across town, or one of them out for a
 *     run, then sitting down for a while.
 *
 * Like the popoto outings (lib/town/popotos) everything comes from the clock
 * alone, so everybody sees the same bird on the same branch. When they show
 * (daytime, no rain) is the town's to decide, from its sky and its weather.
 */

function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (...n: number[]) => seeded(n.reduce((h, x) => Math.imul(h ^ (x | 0), 2654435761), 0x9e3779b9))();

/* ── birds ───────────────────────────────────────────────────────────────── */

/** The trees in and around town a bird may sit in, and how high up (tiles of lift, for drawing). */
const TREES: Array<Vec & { lift: number }> = PROPS
  .filter((p) => (p.kind === "tree" || p.kind === "pine") && p.x >= TOWN.x - 4 && p.x < TOWN.x + TOWN.w + 4 && p.y >= TOWN.y - 4 && p.y < TOWN.y + TOWN.h + 4)
  .map((p) => ({ x: p.x + 0.5, y: p.y + 0.62, lift: p.kind === "pine" ? 1 : 0.85 }));

export const BIRDS = 7;
/** How long a bird stays on one branch, give or take, and how fast it flies (tiles a second). */
const PERCH_MS = 26_000;
const FLY_SPEED = 6;

export interface BirdNow {
  /** Where it is on the ground plan, and how high above it (0 on the ground, 1 a tree's top). */
  pos: Vec;
  lift: number;
  flying: boolean;
  /** Heading right on the screen. */
  right: boolean;
  /** Perched: what it is doing (0 still, 1 looking back, 2 pecking). */
  pose: 0 | 1 | 2;
}

/** Bird i's trees: the few nearest a home of its own. */
function homeTrees(i: number): Array<Vec & { lift: number }> {
  if (!TREES.length) return [];
  const home = TREES[Math.floor(hash(i, 1) * TREES.length)];
  return [...TREES].sort((a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y)).slice(0, 5);
}
const homes = Array.from({ length: BIRDS }, (_, i) => homeTrees(i));

/** Where bird i is at a moment. */
export function birdAt(i: number, ms: number): BirdNow | null {
  const trees = homes[i];
  if (!trees?.length) return null;
  const span = PERCH_MS + i * 1700, k = Math.floor((ms + i * 9_000) / span), into = (ms + i * 9_000) - k * span;
  const tree = (n: number) => trees[Math.floor(hash(i, n, 7) * trees.length)];
  const from = tree(k), to = tree(k + 1);
  const d = Math.hypot(to.x - from.x, to.y - from.y), flight = d < 0.1 ? 0 : (d / FLY_SPEED) * 1000 + 400;
  const sitting = span - flight;
  if (into < sitting || !flight) {
    // a little shuffle along the branch, now and then a look round or a peck
    const beat = Math.floor(into / 1400), r = hash(i, k, beat);
    return { pos: { x: from.x + (hash(i, k, 3) - 0.5) * 0.5, y: from.y }, lift: from.lift, flying: false, right: hash(i, k, beat >> 2) < 0.5, pose: r < 0.6 ? 0 : r < 0.8 ? 1 : 2 };
  }
  const f = (into - sitting) / flight;
  const pos = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
  return { pos, lift: from.lift + (to.lift - from.lift) * f + Math.sin(Math.PI * f) * 0.6, flying: true, right: (to.x - to.y) - (from.x - from.y) >= 0, pose: 0 };
}

/* ── butterflies ─────────────────────────────────────────────────────────── */

/** Flower patches in town a butterfly keeps to. */
const PATCHES: Vec[] = (() => {
  const flowers = PROPS.filter((p) => (p.kind === "flowers" || p.kind === "flowerbed") && p.x >= TOWN.x && p.x < TOWN.x + TOWN.w && p.y >= TOWN.y && p.y < TOWN.y + TOWN.h);
  const out: Vec[] = [];
  for (let n = 0; n < flowers.length && out.length < 9; n++) {
    const p = flowers[Math.floor(hash(n, 31) * flowers.length)];
    if (!out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 4)) out.push({ x: p.x + 0.5, y: p.y + 0.5 });
  }
  return out;
})();
export const BUTTERFLIES = PATCHES.length;

/** Where butterfly i is: wandering round its patch, never still. */
export function butterflyAt(i: number, ms: number): { pos: Vec; height: number; yellow: boolean } | null {
  const p = PATCHES[i];
  if (!p) return null;
  const t = ms / 1000 + i * 7.3, r = 1.1 + 0.4 * Math.sin(t * 0.21 + i);
  return {
    pos: { x: p.x + r * Math.sin(t * 0.47 + i) * Math.cos(t * 0.13), y: p.y + r * Math.sin(t * 0.31 + i * 2) },
    height: 16 + 9 * Math.sin(t * 1.7 + i) + 5 * Math.sin(t * 3.1),
    yellow: i % 3 !== 1,
  };
}

/* ── cats and dogs ───────────────────────────────────────────────────────── */

export type Pet = "cat" | "dog";
/** A slot of time, and the chance something happens in it. */
const PET_SLOT_MS = 3 * 60_000;
const PET_CHANCE = 0.55;
const RUN: Record<Pet, number> = { cat: 3.2, dog: 3 };

export interface Romp {
  kind: "chase" | "cat" | "dog";
  start: number;
  end: number;
  /** The leader's route (the cat, in a chase), from one grass tile to another. */
  route: Vec[];
}

/** Open grass in town, worked out once. */
let grass: Vec[] | null = null;
function openGrass(): Vec[] {
  if (grass) return grass;
  grass = [];
  for (let y = TOWN.y + 1; y < TOWN.y + TOWN.h - 1; y++) for (let x = TOWN.x + 1; x < TOWN.x + TOWN.w - 1; x++) {
    if (walkable(x, y) && groundAt(x, y) === "grass" && !onDeck(x, y) && !onYard(x, y)) grass.push({ x, y });
  }
  return grass;
}

const romps = new Map<number, Romp | null>();
/** The romp of the slot a moment falls in, if any. */
export function rompAt(ms: number): Romp | null {
  const slot = Math.floor(ms / PET_SLOT_MS);
  if (romps.has(slot)) return romps.get(slot)!;
  const rnd = seeded(slot * 40503 + 17);
  let out: Romp | null = null;
  if (rnd() < PET_CHANCE) {
    const g = openGrass(), a = g[Math.floor(rnd() * g.length)], b = g[Math.floor(rnd() * g.length)];
    const path = a && b ? findPath({ x: a.x + 0.5, y: a.y + 0.5 }, { x: b.x + 0.5, y: b.y + 0.5 }) : null;
    if (path && path.length > 6) {
      const r = rnd(), kind = r < 0.45 ? "chase" : r < 0.75 ? "cat" : "dog";
      const start = slot * PET_SLOT_MS + Math.floor(rnd() * 30_000);
      out = { kind, start, end: start + 75_000, route: [{ x: a.x + 0.5, y: a.y + 0.5 }, ...path] };
    }
  }
  romps.set(slot, out);
  if (romps.size > 6) romps.delete(romps.keys().next().value!);
  return out;
}

/** The romps going on now. */
export function rompsNow(ms: number): Romp[] {
  return [rompAt(ms - PET_SLOT_MS), rompAt(ms)].filter((r): r is Romp => !!r && ms >= r.start && ms < r.end);
}

/** A point some way along a route, and the way it heads. */
function along(route: Vec[], d: number): { pos: Vec; dir: Vec; done: boolean } {
  let left = Math.max(0, d);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg) { const k = seg ? left / seg : 1; return { pos: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: { x: b.x - a.x, y: b.y - a.y }, done: false }; }
    left -= seg;
  }
  const n = route.length;
  return { pos: route[n - 1], dir: n > 1 ? { x: route[n - 1].x - route[n - 2].x, y: route[n - 1].y - route[n - 2].y } : { x: 1, y: 0 }, done: true };
}

export interface PetNow { pet: Pet; pos: Vec; running: boolean; right: boolean; alpha: number }

/** Who is out in a romp at a moment, and where. */
export function petsOf(r: Romp, ms: number): PetNow[] {
  const t = (ms - r.start) / 1000, alpha = Math.max(0, Math.min(1, t / 1.2, (r.end - ms) / 1200));
  const one = (pet: Pet, lag: number): PetNow => {
    const at = along(r.route, (t - lag) * RUN[pet]);
    return { pet, pos: at.pos, running: !at.done && t > lag, right: at.dir.x - at.dir.y >= 0, alpha };
  };
  if (r.kind === "chase") {
    // the dog a moment behind; at the end they sit side by side
    const cat = one("cat", 0), dog = one("dog", 0.6);
    if (!dog.running && t > 1) dog.pos = { x: dog.pos.x - 0.7, y: dog.pos.y + 0.3 };
    return [cat, dog];
  }
  return [one(r.kind, 0)];
}
