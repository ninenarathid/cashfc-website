/**
 * Cash Town's ground: the map, where you can walk, how to get there, and how
 * loud somebody is from where you stand.
 *
 * Pure functions, so the rules of the town can be tested without a browser
 * and every client works them out the same way. A move is sent as one
 * destination, not a stream of positions (the Zheza way): each client finds
 * the same path on the same map and walks the avatar along it, which is why
 * the path has to come from here and not from whoever happens to be drawing.
 *
 * Coordinates are tiles, continuous: tile (i, j) covers [i, i+1) × [j, j+1)
 * and its centre is (i + 0.5, j + 0.5). x runs down to the right on screen,
 * y down to the left; the isometric diamond is 2:1.
 */

export const COLS = 18;
export const ROWS = 18;
/** One tile on screen, before the town is scaled to fit. */
export const TILE_W = 64;
export const TILE_H = 32;

/** Walking speed, tiles a second. */
export const SPEED = 3.5;

/**
 * Deliveries a second the whole room's steps may cost, at most: half the
 * project's realtime allowance (500 a second, shared with the party board and
 * the bell), even if everybody clicks as fast as they can.
 */
export const MOVE_BUDGET = 250;

/**
 * How often somebody's steps may be announced, ms, with `n` people in the
 * room. Every announcement is delivered to the n − 1 others, so a room of n
 * all clicking nonstop costs n × (n − 1) × 1000 / every deliveries a second.
 * A step after standing still goes at once; only a burst of taps waits, and
 * then sends the last one.
 */
export function moveEvery(n: number): number {
  return Math.max(300, Math.ceil((n * (n - 1) * 1000) / MOVE_BUDGET));
}

/**
 * Whether distance matters to the voice. Off for now (the owner's call on
 * 2026-10-01): one room where everybody in voice hears everybody at full
 * volume, while the FC finds out how many one room holds. On, a voice fades
 * with distance (NEAR, FAR) and lines open nearest first (pickLines), the way
 * Gather works; everything for that is kept below.
 */
export const PROXIMITY = false;

/**
 * Hearing, when PROXIMITY is on: full volume within NEAR tiles, fading to
 * nothing at FAR. Close enough to feel like walking up to somebody, far enough
 * that two people on either side of the plaza are not in each other's ear.
 */
export const NEAR = 3.5;
export const FAR = 7;

export type Vec = { x: number; y: number };

export interface Building {
  id: string;
  /** Where it leads: a page of the site, so the town is a front door to it. */
  href: string;
  name: { th: string; en: string };
  /** Footprint in tiles, top corner (x, y), size w × h. Not walkable. */
  x: number; y: number; w: number; h: number;
  /** Wall height in unscaled pixels. */
  height: number;
  /** Roof, right wall, left wall. */
  colors: [string, string, string];
  icon: string;
}

export const BUILDINGS: Building[] = [
  {
    id: "kitchen", href: "/members", icon: "🍳",
    name: { th: "ครัวของร้าน · สมาชิก", en: "The Kitchen · Members" },
    x: 2, y: 2, w: 3, h: 3, height: 70, colors: ["#e5cc80", "#b89b52", "#8f773c"],
  },
  {
    id: "studio", href: "/gallery", icon: "📸",
    name: { th: "สตูดิโอภาพ · แกลเลอรี", en: "Photo Studio · Gallery" },
    x: 13, y: 2, w: 3, h: 3, height: 62, colors: ["#7ea6c9", "#5a7e9f", "#44627d"],
  },
  {
    id: "party", href: "/party", icon: "⚔️",
    name: { th: "ลานปาร์ตี้", en: "Party Square" },
    x: 2, y: 13, w: 3, h: 3, height: 54, colors: ["#4fb8a8", "#378779", "#28675c"],
  },
  {
    id: "fame", href: "/leaderboards", icon: "🏆",
    name: { th: "หอเกียรติยศ · อันดับ", en: "Hall of Fame · Boards" },
    x: 13, y: 13, w: 3, h: 3, height: 78, colors: ["#c98a5b", "#9c6840", "#774e2f"],
  },
];

/** The fountain in the middle of the plaza: a landmark, and not walkable. */
export const FOUNTAIN = { x: 8, y: 8, w: 2, h: 2 };

/** Trees, one tile each, for shade and something to walk around. */
export const TREES: Vec[] = [
  { x: 6, y: 2 }, { x: 11, y: 3 }, { x: 2, y: 7 }, { x: 15, y: 10 },
  { x: 6, y: 15 }, { x: 11, y: 14 }, { x: 4, y: 10 }, { x: 13, y: 6 },
];

const inside = (px: number, py: number, r: { x: number; y: number; w: number; h: number }) =>
  px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;

/** What stands on a tile, if anything. */
export function thingAt(tx: number, ty: number): Building | "fountain" | "tree" | null {
  for (const b of BUILDINGS) if (inside(tx, ty, b)) return b;
  if (inside(tx, ty, FOUNTAIN)) return "fountain";
  if (TREES.some((t) => t.x === tx && t.y === ty)) return "tree";
  return null;
}

/** Can somebody stand on this tile? */
export function walkable(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return thingAt(tx, ty) === null;
}

/** The kind of ground, for drawing. */
export function groundAt(tx: number, ty: number): "plaza" | "road" | "grass" {
  if (tx >= 6 && tx <= 11 && ty >= 6 && ty <= 11) return "plaza";
  if (tx === 8 || tx === 9 || ty === 8 || ty === 9) return "road";
  return "grass";
}

/* ── projection ─────────────────────────────────────────────────────────── */

/** Tile coordinates to unscaled isometric pixels, origin at the map's top corner. */
export function toIso(x: number, y: number): Vec {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

/** The inverse: unscaled isometric pixels back to tile coordinates. */
export function fromIso(ix: number, iy: number): Vec {
  const a = ix / (TILE_W / 2);
  const b = iy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/* ── paths ──────────────────────────────────────────────────────────────── */

const DIRS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * A* across the tile grid, eight ways, never cutting a corner past something
 * solid. Returns the tile centres to walk through after the start, ending at
 * the goal's centre, or null when the goal cannot be reached. Deterministic:
 * the same start and goal give the same path on every client.
 */
export function findPath(from: Vec, to: Vec): Vec[] | null {
  const sx = Math.floor(from.x), sy = Math.floor(from.y);
  const gx = Math.floor(to.x), gy = Math.floor(to.y);
  if (!walkable(gx, gy)) return null;
  if (sx === gx && sy === gy) return [{ x: gx + 0.5, y: gy + 0.5 }];

  const key = (x: number, y: number) => y * COLS + x;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map<number, number>([[key(sx, sy), 0]]);
  const came = new Map<number, number>();
  // Small grid, so a sorted array is fast enough and keeps ties deterministic.
  const open: Array<{ x: number; y: number; f: number; n: number }> = [{ x: sx, y: sy, f: h(sx, sy), n: 0 }];
  const closed = new Set<number>();
  let order = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.n - b.n);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === gx && cur.y === gy) {
      const path: Vec[] = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(sx, sy)) {
        path.push({ x: (k % COLS) + 0.5, y: Math.floor(k / COLS) + 0.5 });
        k = came.get(k);
      }
      return path.reverse();
    }
    closed.add(ck);
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!walkable(nx, ny)) continue;
      // Diagonals only where both sides are open, so nobody clips a corner.
      if (dx && dy && (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cost = (g.get(ck) ?? 0) + (dx && dy ? Math.SQRT2 : 1);
      if (cost < (g.get(nk) ?? Infinity)) {
        g.set(nk, cost);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: cost + h(nx, ny), n: ++order });
      }
    }
  }
  return null;
}

/**
 * Walk `dist` tiles along a path. Returns where that leaves you and what is
 * left of the path; an empty path means you have arrived.
 */
export function stepAlong(pos: Vec, path: Vec[], dist: number): { pos: Vec; path: Vec[] } {
  let p = { ...pos };
  const rest = [...path];
  let left = dist;
  while (rest.length && left > 0) {
    const next = rest[0];
    const dx = next.x - p.x, dy = next.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      p = { ...next };
      rest.shift();
      left -= d;
    } else {
      p = { x: p.x + (dx / d) * left, y: p.y + (dy / d) * left };
      left = 0;
    }
  }
  return { pos: p, path: rest };
}

/* ── hearing ────────────────────────────────────────────────────────────── */

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Volume (0–1) of somebody `d` tiles away. */
export function hearing(d: number, proximity = PROXIMITY): number {
  if (!proximity) return 1;
  if (d <= NEAR) return 1;
  if (d >= FAR) return 0;
  return 1 - (d - NEAR) / (FAR - NEAR);
}

/* ── who to keep a voice line to ────────────────────────────────────────── */

/**
 * Lines open to people within FAR (where they become audible), and stay open
 * until they are past DROP: the gap stops a line flapping open and shut as
 * somebody walks along the edge, and covers the fraction of a tile by which
 * two screens may disagree about where somebody is.
 */
export const DROP = 9.5;

/**
 * At most this many lines are opened, nearest first. Each line uploads the
 * microphone once more, so the cap is what lets a crowded room work on a
 * phone: in a crowd you talk to the people around you, as in life.
 */
export const MAX_LINES = 8;

/**
 * Who to have a voice line to: everybody already connected and still within
 * DROP, plus the nearest within FAR up to MAX_LINES in all. Lines the other
 * side opened are kept the same way, so both ends agree without talking it
 * over.
 */
export function pickLines(
  me: Vec,
  others: Array<{ id: string; pos: Vec }>,
  connected: ReadonlySet<string>,
  proximity = PROXIMITY,
): Set<string> {
  // One room, everybody together: a line to everybody in voice.
  if (!proximity) return new Set(others.map((o) => o.id));
  const near = others
    .map((o) => ({ id: o.id, d: distance(me, o.pos) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  const keep = new Set<string>();
  for (const o of near) if (connected.has(o.id) && o.d <= DROP) keep.add(o.id);
  for (const o of near) {
    if (keep.size >= MAX_LINES) break;
    if (o.d <= FAR) keep.add(o.id);
  }
  return keep;
}

/* ── arriving ───────────────────────────────────────────────────────────── */

/** The tiles around the fountain where people appear. */
const SPAWNS: Vec[] = (() => {
  const out: Vec[] = [];
  for (let y = 6; y <= 11; y++) for (let x = 6; x <= 11; x++) {
    if (walkable(x, y) && (x <= 7 || x >= 10 || y <= 7 || y >= 10)) out.push({ x: x + 0.5, y: y + 0.5 });
  }
  return out;
})();

/** Where somebody appears, the same spot for the same person every time. */
export function spawnFor(id: string): Vec {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SPAWNS[Math.abs(hash) % SPAWNS.length];
}
