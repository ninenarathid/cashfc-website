import { BOARD, COLS, ROWS, SHOP, TOWN, findPath, groundAt, onDeck, onYard, walkable, type Vec } from "./world";

/**
 * Popoto out and about (the owner's call, 2026-10-02: "นานๆทีจะมี popoto ออกมา
 * เดินเล่นแบบสุ่ม โดยขึ้นอยู่กับเวลาด้วย"): now and then a popoto comes out, doing
 * what fits the hour in Bangkok.
 *
 *   · morning: late for something, running across town with toast in its mouth;
 *   · noon: lunch, a bowl of rice on a picnic cloth on the grass;
 *   · evening: two playing football, or badminton;
 *   · late at night: an office popoto trudging home, tie loose, briefcase low.
 *
 * Nothing is sent or stored: an outing comes from the clock alone, the same
 * sum on every screen, so everybody in town sees the same popoto at the same
 * moment (give or take their clocks). Time is cut into slots; a slot's number
 * decides whether a popoto comes out in it, what it does and where.
 */

export type Activity = "rush" | "lunch" | "football" | "badminton" | "tired";

/** Which hours (Bangkok minutes of the day, from–to) each activity belongs to. */
const HOURS: Array<[from: number, to: number, what: Activity[]]> = [
  [6 * 60, 9 * 60 + 30, ["rush"]],
  [11 * 60, 13 * 60 + 30, ["lunch"]],
  [16 * 60, 18 * 60 + 45, ["football", "badminton"]],
  [21 * 60, 24 * 60, ["tired"]],
  [0, 2 * 60, ["tired"]],
];
/** A slot of time, and the chance a popoto comes out in it: about one every nine minutes, in its hours. */
export const SLOT_MS = 4 * 60_000;
/** With the dev switch, one comes out every half a minute. */
const FORCED_SLOT_MS = 30_000;
const slotOf = (force?: Activity) => (force ? FORCED_SLOT_MS : SLOT_MS);
const CHANCE = 0.45;

/** Tiles a second. */
const SPEED: Partial<Record<Activity, number>> = { rush: 3.8, tired: 0.75 };
/** How long a popoto that stays in one place stays. */
const STAY_MS: Partial<Record<Activity, number>> = { lunch: 100_000, football: 110_000, badminton: 110_000 };
/** How long a popoto takes to appear and to go. */
export const FADE_MS = 1200;

export interface Outing {
  activity: Activity;
  /** When it begins and ends (ms since 1970). */
  start: number;
  end: number;
  /** Where it walks (rush, tired), or where the one or two of them stay. */
  route?: Vec[];
  spots?: Vec[];
}

/** A small seeded random number source (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The Bangkok minute of the day at a moment. */
function bangkok(ms: number): number {
  return (((ms / 60_000 + 7 * 60) % 1440) + 1440) % 1440;
}

/** What fits the hour, if anything. */
export function activitiesAt(minute: number): Activity[] {
  for (const [from, to, what] of HOURS) if (minute >= from && minute < to) return what;
  return [];
}

/** Grass tiles in town with room round them, for a picnic or a game: worked out once. */
let open: Vec[] | null = null;
function openGrass(): Vec[] {
  if (open) return open;
  open = [];
  // (grass that is open ground: the fishing deck's boards are over grass too, and no picnic is laid on them)
  const clear = (x: number, y: number) => walkable(x, y) && groundAt(x, y) === "grass" && !onDeck(x, y) && !onYard(x, y);
  // the board and the shop are big pictures: keep well away from them
  const far = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
    x < r.x - 3 || x > r.x + r.w + 2 || y < r.y - 3 || y > r.y + r.h + 2;
  for (let y = TOWN.y + 2; y < TOWN.y + TOWN.h - 2; y++) for (let x = TOWN.x + 1; x < TOWN.x + TOWN.w - 6; x++) {
    let ok = true;
    // a strip five tiles long, all open grass with a tile of it beside it and past each end (a tree's
    // leaves reach over the next tile): room for two to play
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 5 && ok; dx++) ok = clear(x + dx, y + dy) && far(x + dx, y + dy, BOARD) && far(x + dx, y + dy, SHOP);
    if (ok) open.push({ x, y });
  }
  return open;
}

/** Where each path leaves town (the middle of its path tiles there), for a popoto passing through. */
let ends: Vec[] | null = null;
function pathEnds(): Vec[] {
  if (ends) return ends;
  const mid = (tiles: number[]) => tiles.length ? tiles[Math.floor(tiles.length / 2)] : 32;
  const span = [...Array(COLS).keys()];
  const n = TOWN.y - 1, s = TOWN.y + TOWN.h, w = TOWN.x - 1, e = TOWN.x + TOWN.w;
  ends = [
    { x: mid(span.filter((x) => groundAt(x, n) === "road")), y: n },
    { x: mid(span.filter((x) => groundAt(x, s) === "road")), y: s },
    { x: w, y: mid(span.filter((y) => groundAt(w, y) === "road")) },
    { x: e, y: mid(span.filter((y) => groundAt(e, y) === "road")) },
  ];
  return ends;
}
/** A walkable tile at or near a point. */
function near(p: Vec): Vec | null {
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = p.x + dx, y = p.y + dy;
    if (x >= 0 && y >= 0 && x < COLS && y < ROWS && walkable(x, y)) return { x, y };
  }
  return null;
}

/** The route's length in tiles. */
function lengthOf(route: Vec[]): number {
  let d = 0;
  for (let i = 1; i < route.length; i++) d += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return d;
}

/**
 * The outing of the slot a moment falls in, if a popoto comes out then.
 * `force` (a dev tool) makes one of that activity come out in this slot.
 */
export function outingAt(ms: number, force?: Activity): Outing | null {
  const slot = Math.floor(ms / slotOf(force)), key = `${slot}:${force ?? ""}`;
  if (cache.has(key)) return cache.get(key)!;
  const o = plan(slot, force);
  cache.set(key, o);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return o;
}
/** Outings already worked out, by slot (a route is a path search: once, not every frame). */
const cache = new Map<string, Outing | null>();

function plan(slot: number, force?: Activity): Outing | null {
  const rnd = seeded(slot * 2654435761);
  const roll = rnd(), when = rnd();
  const fits = force ? [force] : activitiesAt(bangkok(slot * SLOT_MS));
  if (!fits.length || (!force && roll >= CHANCE)) return null;
  const activity = fits[Math.floor(rnd() * fits.length)];
  const start = slot * slotOf(force) + (force ? 0 : Math.floor(when * 40_000));
  const speed = SPEED[activity];
  if (speed) {
    // across town from one path's end to another's (rush), or from the plaza out of town (tired)
    const E = pathEnds();
    const a = Math.floor(rnd() * E.length), b = (a + 1 + Math.floor(rnd() * (E.length - 1))) % E.length;
    const from = activity === "rush" ? near(E[a]) : near({ x: 29 + Math.floor(rnd() * 6), y: 29 + Math.floor(rnd() * 6) });
    const to = near(E[b]);
    const path = from && to ? findPath({ x: from.x + 0.5, y: from.y + 0.5 }, { x: to.x + 0.5, y: to.y + 0.5 }) : null;
    if (!from || !path) return null;
    const route = [{ x: from.x + 0.5, y: from.y + 0.5 }, ...path];
    return { activity, start, end: start + (lengthOf(route) / speed) * 1000 + FADE_MS, route };
  }
  const places = openGrass();
  if (!places.length) return null;
  const p = places[Math.floor(rnd() * places.length)];
  const spots = activity === "lunch" ? [{ x: p.x + 2.5, y: p.y + 0.5 }] : [{ x: p.x + 0.5, y: p.y + 0.5 }, { x: p.x + 4.5, y: p.y + 0.5 }];
  return { activity, start, end: start + (force ? FORCED_SLOT_MS : STAY_MS[activity]!), spots };
}

/** The outings to draw at a moment: this slot's, and the last one's if it is still going. */
export function outingsNow(ms: number, force?: Activity): Outing[] {
  const out: Outing[] = [];
  for (const t of [ms - slotOf(force), ms]) {
    const o = outingAt(t, force);
    if (o && ms >= o.start && ms < o.end) out.push(o);
  }
  return out;
}

/** Where a walking popoto is along its route, and which way it is heading. */
export function alongRoute(o: Outing, ms: number): { pos: Vec; dir: Vec } | null {
  const route = o.route;
  const speed = SPEED[o.activity];
  if (!route || !speed) return null;
  let d = Math.max(0, ((ms - o.start) / 1000) * speed);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg || i === route.length - 1) {
      const k = seg ? Math.min(1, d / seg) : 1;
      return { pos: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: { x: b.x - a.x, y: b.y - a.y } };
    }
    d -= seg;
  }
  return null;
}

/** 0 → 1 as it appears, 1 while it is out, 1 → 0 as it goes. */
export function presence(o: Outing, ms: number): number {
  return Math.max(0, Math.min(1, (ms - o.start) / FADE_MS, (o.end - ms) / FADE_MS));
}
