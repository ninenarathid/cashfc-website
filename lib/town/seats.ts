import { ANIMALS } from "./animals";
import type { WagonRun } from "./animal-act";
import { WAGON_STOPS } from "./pasture";
import { RAM, riderOf, runOf } from "./riding";
import { FARM, GATES, findPath, type Vec } from "./world";

/**
 * Seats that are no seat of one's own (lib/town/room's `seat`): behind a cloud ram's rider, and on the hay wagon.
 * Every page puts whoever sits there where the seat is: the ram's where its rider is, the wagon's where the wagon is
 * along its tour, which is worked out the same on every page from the run alone (lib/town/animal-act's WagonRun),
 * as the town's critters are from the clock.
 *
 * The wagon's tour: a leg on each map of its stops, in order (the farm's, then the town's, then the forest's). On
 * each it comes in by the map's gate from the last (the first map: it sets off from its stop), stands at its stop for
 * a while to be boarded, and rolls on to the gate of the next; on the last it stays at its stop. Whoever sits on it
 * is carried, from map to map.
 */

/** Of a leg: the part of it spent coming in from the gate, and the part it stands at its stop to be boarded, after which it rolls on. */
export const WAGON_LEG = { arrive: 0.15, stand: 0.45 } as const;
/** Where each map's stop is, and the gates it comes in by and goes out by (to the next map of the tour). */
const MAP_WAYS: Record<string, { in?: Vec; out?: Vec }> = {
  farm: { out: { x: FARM.x + 0.5, y: FARM.y + 21.5 } },
  town: { in: GATES[1].to, out: { x: GATES[2].tiles[0][0] + 0.5, y: GATES[2].tiles[0][1] + 0.5 } },
  forest: { in: GATES[2].to },
};
const routes = new Map<string, Vec[]>();
/** A map's way from one point to another (worked out once), as a list of points from the first to the last. */
function way(map: string, from: Vec, to: Vec, key: string): Vec[] {
  const k = `${map}:${key}`;
  let r = routes.get(k);
  if (!r) { r = [{ x: from.x, y: from.y }, ...(findPath(from, to) ?? [{ x: to.x, y: to.y }])]; routes.set(k, r); }
  return r;
}
/** A point a part of the way along a list of points (0 its first, 1 its last), and which way it is going across the screen. */
function along(pts: Vec[], f: number): { at: Vec; right: boolean } {
  if (pts.length < 2) return { at: pts[0] ?? { x: 0, y: 0 }, right: true };
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = lens.reduce((a, b) => a + b, 0) || 1;
  let left = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(1, left / lens[i]) : 1, a = pts[i], b = pts[i + 1];
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, right: b.x - b.y - (a.x - a.y) >= 0 };
    }
    left -= lens[i];
  }
  return { at: pts[pts.length - 1], right: true };
}

/** Where a wagon is at a moment: on which map, where, which way it faces, whether it stands at a stop to be boarded; null when its tour is over. */
export function wagonSpot(run: WagonRun, now: number): { map: string; at: Vec; right: boolean; standing: boolean; leg: number; part: number } | null {
  const legs = Math.max(1, run.stops.length), legMs = (ANIMALS.wagon.mins * 60_000) / legs, t = now - run.from;
  if (t < 0 || t >= legs * legMs) return null;
  const leg = Math.min(legs - 1, Math.floor(t / legMs)), part = (t - leg * legMs) / legMs, map = run.stops[leg], s = WAGON_STOPS[map];
  if (!s) return null;
  const stop = { x: s[0] + 0.5, y: s[1] + 0.5 }, ways = MAP_WAYS[map] ?? {};
  if (leg > 0 && ways.in && part < WAGON_LEG.arrive) { const r = along(way(map, ways.in, stop, "in"), part / WAGON_LEG.arrive); return { map, ...r, standing: false, leg, part }; }
  if (part < WAGON_LEG.stand || leg === legs - 1 || !ways.out) return { map, at: stop, right: true, standing: true, leg, part };
  const r = along(way(map, stop, ways.out, "out"), (part - WAGON_LEG.stand) / (1 - WAGON_LEG.stand));
  return { map, ...r, standing: false, leg, part };
}

/** The runs the page knows (the pasture's world, as last read): for the seats on the wagon. */
let RUNS: readonly WagonRun[] = [];
/** The clock the runs are told by (whoever keeps the game's: the trial's may have been put forward). */
let CLOCK: () => number = () => Date.now();
export function knowWagons(runs: readonly WagonRun[], clock: () => number) { RUNS = runs; CLOCK = clock; }
export const wagonRun = (id: string) => RUNS.find((r) => r.id === id) ?? null;

/** Somebody the room lists, as much of them as a seat asks: where they are, what follows them, whether they sit or have gone. */
interface Sitter { pos: Vec; info: { id?: string; pet?: string; sit?: number }; byeAt?: number }
/**
 * Where a seat is now: behind a ram's rider (a little behind their point, so that they are drawn first), or on the
 * wagon (a place of its bed by the order they got on); null when there is no such seat any more (the rider has gone,
 * got off or sat down; the wagon's tour is over, or this page does not know of it).
 */
export function seatSpot(seat: string, now: number, who: (id: string) => Sitter | undefined): Vec | null {
  const rider = riderOf(seat);
  if (rider) {
    const r = who(rider);
    if (!r || r.byeAt !== undefined || r.info.pet !== RAM || (r.info.sit ?? -1) !== -1) return null;
    return { x: r.pos.x - 0.04, y: r.pos.y - 0.04 };
  }
  void now;
  const id = runOf(seat), run = id ? wagonRun(id) : null, w = run ? wagonSpot(run, CLOCK()) : null;
  if (!w || !run) return null;
  return w.at;
}
/** Which place of the wagon's bed somebody sits in (by the order they got on; for drawing them side by side). */
export const wagonPlace = (run: WagonRun, who: string) => Math.max(0, run.riders.findIndex((r) => r.who === who));
