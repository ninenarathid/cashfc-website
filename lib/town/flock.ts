/**
 * The cloud ram's flock (the owner, 2026-11-09): more than one passenger on a cloud ram was a bug the members liked, and
 * it stays: "แกะของเจ้าของตัวใหญ่ขึ้น คนที่มาขี่ ได้นั่งแกะตัวเล็กๆ พอมีคนนั่งเยอะๆ มันจะเป็นฝูงแกะ น่ารักๆ", and "บางคน สุ่ม จะได้นั่งบน
 * ก้อนเมฆแกะ เหมือนเป็นเวทมนของแกะวิเศษ". The owner rides a big ram; each passenger (lib/town/riding's ramSeat) rides a lamb
 * of their own that trails it, two by two, or now and then a floating sheep-shaped cloud.
 *
 * Nothing here is the game's: the seats are what each passenger tells the room (lib/town/room's `seat`, and `seatAt`, the
 * moment they got on by their own clock). From those two every page works out the same flock: who is where in the
 * line (by when they got on), each lamb's colour (by who rides it) and who rides a cloud (by who, on whose ram, and when
 * they got on: a new roll each time they get on, the same on every screen). Where the lambs walk is each page's own,
 * as it is for every walker: they follow the big ram's path as this page saw it.
 *
 * Positions are the map's isometric pixels, unscaled (lib/town/world's toIso): what a screen pixel is at zoom 1.
 */

/** At most this many ride with a cloud ram's owner (the owner, 2026-11-09: "8 คน"); a ninth that gets on at the same moment as an eighth gets down again. */
export const FLOCK_MAX = 8;
/** One boarding in this many is on the magic ram's cloud. */
export const CLOUD_ONE_IN = 5;
/** How long a lamb takes to puff out of the big ram's fleece, or to jump back into it. */
export const POP_MS = 560;
/** From which part of a pop the rider sits on the lamb (it has landed). */
export const POP_SEATED = 4 / 6;

export type Pt = { x: number; y: number };
export type LambColour = "w" | "c" | "p";

/** A number from a word, the same in every browser (FNV-1a, 32 bits). */
export function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** A passenger's lamb: white, cream or pink, by who rides it. */
export const lambColour = (rider: string): LambColour => (["w", "c", "p"] as const)[seedOf(`lamb:${rider}`) % 3];
/**
 * Whether a passenger rides the magic ram's cloud this time: one boarding in five, by the owner's id, theirs and the
 * moment they got on (what they told the room), so every page that hears the same seat rolls the same; a browser that
 * tells no moment rolls on the two ids alone.
 */
export const onCloud = (owner: string, rider: string, at?: number): boolean => seedOf(`cloud:${owner}>${rider}@${at ?? 0}`) % CLOUD_ONE_IN === 0;

/** Somebody on a ram's seat: their id, and when they got on (missing from a browser older than the flock). */
export interface Boarded { id: string; at?: number }
/** The line, in the order they got on (who told no moment after those who did; ties by id): the same on every page. */
export function flockOrder<T extends Boarded>(seated: readonly T[]): T[] {
  // (0 is what a page says when it tells no moment: it lines up with those who told none)
  const when = (b: Boarded) => (typeof b.at === "number" && Number.isFinite(b.at) && b.at > 0 ? b.at : Infinity);
  return [...seated].sort((a, b) => when(a) - when(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
/** Whether somebody is past the flock's last place (got on as the eighth did, and later by the line's order). */
export const pastFull = (order: readonly Boarded[], id: string): boolean => order.findIndex((b) => b.id === id) >= FLOCK_MAX;
/** Whether a flock of this many has room for one more. */
export const hasRoom = (n: number): boolean => n < FLOCK_MAX;

// ── where each lamb goes ──
/** A place in the flock against the big ram: how far behind it along its way, and how far to its right (map pixels). */
export interface Slot { back: number; across: number }
/**
 * The places, in the specials kit's flock-seats.json (round 3, after the owner's "อยากให้คนชิดกันกว่านี้"): eight walking and
 * eight at rest for each facing, as `u` along the way the big ram goes (minus: behind) and `v` across it (plus: to its
 * right), in map pixels from its feet. Walking, two by two right behind it, half a lamb's width apart; at rest, round it.
 * Each was pushed back or out from that pattern until nothing nearer covers more than 4 pixels of a farther rider's face,
 * whether the seat is a lamb or the cloud at its highest, every two a lamb's length and width apart and none in the big
 * ram's own footprint (the kit's ffb4fd00). SW and NW are SE and NE seen in a mirror: across, the other way.
 */
const SLOTS: Readonly<Record<"SE" | "NE", Record<"walk" | "rest", readonly (readonly [number, number])[]>>> = {
  SE: { walk: [[-52, -20], [-62, 26], [-100, 8], [-102, 72], [-150, -30], [-149, 43], [-193, 9], [-170, 80]],
        rest: [[-44, -26], [-50, 26], [-3, -43], [-4, 60], [39, -33], [30, 34], [-92, 2], [-96, 64]] },
  NE: { walk: [[-52, -20], [-53, 47], [-90, -6], [-88, 62], [-121, -23], [-130, 50], [-158, -6], [-170, 66]],
        rest: [[-44, -26], [-42, 38], [-6, -40], [1, 43], [36, -44], [37, 31], [-82, -4], [-83, 65]] },
};
function slotOf(kind: "walk" | "rest", i: number, back: boolean, right: boolean): Slot {
  const table = SLOTS[back ? "NE" : "SE"][kind];
  // (past the eighth, only for the moment a ninth takes to get down again: further back)
  const [u, v] = i < table.length ? table[i] : [table[table.length - 1][0] - 40 * (i - table.length + 1), table[i % 2][1]];
  return { back: -u, across: right ? v : -v };
}
/** Walking: the i-th of the line's place behind the big ram (two by two, as it faces). */
export const walkSlot = (i: number, back = false, right = true): Slot => slotOf("walk", i, back, right);
/** Standing: the i-th of the line's place round the big ram. */
export const restSlot = (i: number, back = false, right = true): Slot => slotOf("rest", i, back, right);
/** Which way the big ram goes, on the screen, as its picture faces: SE, SW, NE or NW. */
export const headingOf = (back: boolean, right: boolean): Pt => ({ x: (right ? 2 : -2) / Math.sqrt(5), y: (back ? -1 : 1) / Math.sqrt(5) });
const unit = (v: Pt): Pt => { const d = Math.hypot(v.x, v.y); return d > 1e-9 ? { x: v.x / d, y: v.y / d } : { x: 1, y: 0 }; };
/** A place against a point and the way it faces: `back` behind it, `across` to its right. */
export function placeAt(at: Pt, dir: Pt, s: Slot): Pt {
  const d = unit(dir);
  // (to the right of the way it goes, on a screen whose y goes down)
  return { x: at.x - d.x * s.back - d.y * s.across, y: at.y - d.y * s.back + d.x * s.across };
}

// ── the big ram's path ──
/** Where the big ram has been, the newest first (map pixels), and which way it last went. */
export interface Trail { pts: Pt[]; heading: Pt }
const STEP = 3, KEEP = 360;
export const newTrail = (at: Pt, heading: Pt): Trail => ({ pts: [{ ...at }], heading: unit(heading) });
/** The big ram is here now: a new point when it has gone a few pixels, the way it goes, and as much behind it as the flock needs. */
export function trailStep(t: Trail, at: Pt): void {
  const last = t.pts[0];
  if (!last || Math.hypot(at.x - last.x, at.y - last.y) > 220) { t.pts = [{ ...at }]; return; }
  const d = Math.hypot(at.x - last.x, at.y - last.y);
  if (d < STEP) return;
  t.heading = { x: (at.x - last.x) / d, y: (at.y - last.y) / d };
  t.pts.unshift({ ...at });
  let len = 0;
  for (let i = 1; i < t.pts.length; i++) { len += Math.hypot(t.pts[i].x - t.pts[i - 1].x, t.pts[i].y - t.pts[i - 1].y); if (len > KEEP) { t.pts.length = i + 1; break; } }
}
/** The point `dist` behind the big ram along where it went, and the way it was going there; past where it has been, straight on back. */
export function trailPoint(t: Trail, at: Pt, dist: number): { at: Pt; dir: Pt } {
  let left = dist, prev = at, dir = t.heading;
  for (const p of t.pts) {
    const L = Math.hypot(prev.x - p.x, prev.y - p.y);
    if (L < 1e-6) continue;
    dir = { x: (prev.x - p.x) / L, y: (prev.y - p.y) / L };
    if (left <= L) return { at: { x: prev.x - dir.x * left, y: prev.y - dir.y * left }, dir };
    left -= L; prev = p;
  }
  return { at: { x: prev.x - dir.x * left, y: prev.y - dir.y * left }, dir };
}
/** A walking place along the big ram's way: behind it on its path, round its turns, and across from that point. */
export function slotOnTrail(t: Trail, at: Pt, s: Slot): Pt {
  const p = trailPoint(t, at, s.back);
  return placeAt(p.at, p.dir, { back: 0, across: s.across });
}

// ── a lamb ──
export interface Lamb {
  owner: string; rider: string;
  at: Pt; back: boolean; right: boolean; moving: boolean;
  /** When it last stopped (ms, the page's clock). */
  still: number;
  cloud: boolean; colour: LambColour;
  /** When it puffed out of the fleece on this page (-Infinity: it was there when the page came). */
  popped: number;
  /** Its own beat: no two lambs step together. */
  beat: number;
}
/** A lamb going after its place: no faster than the big ram and a third, and on it once there; a long way off (a gate, a page come back), there at once. */
export function lambStep(l: Lamb, goal: Pt, dt: number, pace: number, now: number): void {
  const dx = goal.x - l.at.x, dy = goal.y - l.at.y, d = Math.hypot(dx, dy);
  if (d > 260) { l.at = { ...goal }; l.moving = false; l.still = now; return; }
  const most = (pace * 1.35 + 40) * dt, go = Math.min(d, most);
  const was = l.moving;
  l.moving = go > 0.25;
  if (l.moving) {
    l.at = { x: l.at.x + (dx / d) * go, y: l.at.y + (dy / d) * go };
    // (which way it looks: the way it goes, but not turned by a sideways sliver)
    if (Math.abs(dx) > 0.15 * d) l.right = dx > 0;
    if (Math.abs(dy) > 0.15 * d) l.back = dy < 0;
  } else if (was) l.still = now;
}
/** A lamb that has stood a while faces the way the big ram does, as a flock does. */
export const standFacing = (ram: { back: boolean; right: boolean }): { back: boolean; right: boolean } => ({ back: ram.back, right: ram.right });
/** Whether a standing lamb has its head down in the grass now: about a third of them, now and then, each on its own beat. */
export function grazing(l: Lamb, now: number): boolean {
  if (l.moving || l.cloud || now - l.still < 1500 || seedOf(l.rider) % 3 !== 0) return false;
  return (now + l.beat) % 6400 < 1700;
}

// ── the flock on a page ──
/** A ram ridden, as this page sees it now. */
export interface FlockIn { owner: string; at: Pt; moving: boolean; back: boolean; right: boolean; pace: number; riders: readonly Boarded[] }
/** A lamb going back into the fleece: where it was, where the big ram is, and how far through its jump. */
export interface Leaving { owner: string; rider: string; from: Pt; to: Pt; start: number; cloud: boolean; colour: LambColour; back: boolean; right: boolean }
/** How long the flock stands still before it crowds round the big ram (a stop between two taps is no stop). */
const SETTLE_MS = 700;

/**
 * Every flock this page draws: its trails, its lambs and the lambs going home. `tick` once a frame with the rams being
 * ridden and who is on them; `lamb(rider)` is where each passenger is drawn.
 */
export class Flocks {
  private readonly trails = new Map<string, { trail: Trail; still: number; seen: number; first: number; at: Pt; size: number }>();
  private readonly lambs = new Map<string, Lamb>();
  leaving: Leaving[] = [];

  lamb(rider: string): Lamb | undefined { return this.lambs.get(rider); }
  /** Where a big ram was last seen (for a lamb jumping home to it). */
  ramAt(owner: string): Pt | null { return this.trails.get(owner)?.at ?? null; }
  /** How many ride with somebody, as this page last worked it out. */
  size(owner: string): number { return this.trails.get(owner)?.size ?? 0; }
  /** Where in the big ram's fleece a lamb comes out of, or goes back into: its flank on the lamb's side, a little behind its middle. */
  fleece(owner: string, near: Pt): Pt | null {
    const r = this.trails.get(owner);
    return r ? placeAt(r.at, r.trail.heading, { back: 16, across: near.x < r.at.x === r.trail.heading.y > 0 ? 10 : -10 }) : null;
  }

  private last = -Infinity;
  tick(now: number, dt: number, flocks: readonly FlockIn[]): void {
    // (the time since the last tick as it was, not as a frame is capped to: a page drawing few frames, a tab coming back,
    // walks its big ram on by the time gone, and its lambs keep up with it)
    if (now - this.last > 0 && now - this.last < 2000) dt = (now - this.last) / 1000;
    this.last = now;
    const live = new Set<string>();
    for (const f of flocks) {
      let r = this.trails.get(f.owner);
      if (!r) { r = { trail: newTrail(f.at, headingOf(f.back, f.right)), still: f.moving ? Infinity : now - SETTLE_MS, seen: now, first: now, at: { ...f.at }, size: 0 }; this.trails.set(f.owner, r); }
      // (a ram that was not seen for a while, ridden again: its flock was there before this page saw it again)
      if (now - r.seen > 2000) r.first = now;
      r.seen = now; r.at = { ...f.at };
      trailStep(r.trail, f.at);
      if (f.moving) r.still = Infinity; else if (r.still === Infinity) r.still = now;
      const standing = !f.moving && now - r.still >= SETTLE_MS;
      const order = flockOrder(f.riders);
      r.size = order.length;
      order.forEach((b, i) => {
        live.add(b.id);
        // (at rest, round the big ram as its picture faces; walking, along where it went, as it faces)
        const goal = standing ? placeAt(f.at, headingOf(f.back, f.right), restSlot(i, f.back, f.right)) : slotOnTrail(r!.trail, f.at, walkSlot(i, f.back, f.right));
        let l = this.lambs.get(b.id);
        const cloud = onCloud(f.owner, b.id, b.at);
        if (l && (l.owner !== f.owner || l.cloud !== cloud)) { this.goHome(l, now); l = undefined; }
        if (!l) {
          // (a flock already about the ram when the page first saw it does not puff out again)
          l = { owner: f.owner, rider: b.id, at: { ...goal }, back: f.back, right: f.right, moving: false, still: now, cloud, colour: lambColour(b.id), popped: now - r!.first > 1200 ? now : -Infinity, beat: seedOf(b.id) % 997 };
          this.lambs.set(b.id, l);
        } else lambStep(l, goal, dt, f.pace, now);
        if (standing && !l.moving && now - l.still > 250) Object.assign(l, standFacing(f));
      });
    }
    for (const [id, l] of this.lambs) if (!live.has(id)) { this.goHome(l, now); this.lambs.delete(id); }
    this.leaving = this.leaving.filter((g) => now - g.start < POP_MS);
    for (const [owner, r] of this.trails) if (now - r.seen > 8000) this.trails.delete(owner);
  }
  private goHome(l: Lamb, now: number) {
    const to = this.fleece(l.owner, l.at) ?? { ...l.at };
    this.leaving.push({ owner: l.owner, rider: l.rider, from: { ...l.at }, to, start: now, cloud: l.cloud, colour: l.colour, back: l.back, right: l.right });
  }
}

/** How far through its puff out of the fleece a lamb is (1: landed, or never puffed on this page). */
export const popPart = (l: Lamb, now: number): number => (l.popped === -Infinity ? 1 : Math.min(1, Math.max(0, (now - l.popped) / POP_MS)));
/** Somewhere along a hop from one point to another, `a` 0..1 of the way: up and down again as it goes. */
export function hopAt(from: Pt, to: Pt, a: number): Pt {
  const k = Math.min(1, Math.max(0, a));
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(Math.PI * k) * 14 };
}
/** Where a lamb puffing out is drawn: in the fleece while it bursts out of it, then a hop out to its place, on which it lands (the pop's frames 1-3, 4, 5-6). */
export const popAt = (from: Pt, to: Pt, part: number): Pt => hopAt(from, to, (part - 0.5) / (POP_SEATED - 0.5));
/** Where a lamb going home is drawn: on its place while it turns, a hop to the fleece, then into it (the jump's frames 1-2, 3, 4-6). */
export const homeAt = (from: Pt, to: Pt, part: number): Pt => hopAt(from, to, (part - 2 / 6) * 6);
