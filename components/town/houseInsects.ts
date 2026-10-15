import type { Vec } from "@/lib/town/world";

/**
 * The insects of an insect house about its bed (the owner, 2026-10-15: "ช่วยทำ effect ที่แมลงบินไปบินมาในแปลงเมื่อใช้
 * บ้านแมลงด้วย โดยต้องเกี่ยวข้องกับแมลงที่แสดง effect อยู่"): each lived-in room sends two of its own insect out over the
 * plants the house reaches. Where each is at a moment is worked out from the clock alone, so nothing is kept: from
 * stop to stop (the house, then the plants, in an order its seed decides), a while settled at each, then off to the
 * next. A pollinator flies high and settles on the flowers, a hunter flies low and settles on the leaves, a soil-worker
 * crawls the ground between the plants.
 */
export type HouseFlight = "fly" | "hunt" | "crawl";
export interface InsectPose { at: Vec; lift: number; right: boolean; moving: boolean; settled: number }

const PACE: Record<HouseFlight, { leg: number; rest: number; perch: number; arc: number }> = {
  fly: { leg: 2400, rest: 1700, perch: 0.62, arc: 0.85 },
  hunt: { leg: 1900, rest: 2600, perch: 0.42, arc: 0.45 },
  crawl: { leg: 5200, rest: 2200, perch: 0, arc: 0 },
};
const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

/** Where one of a house's insects is at a moment `t` (ms): `home` the house, `stops` the plants it reaches. */
export function insectPose(home: Vec, stops: readonly Vec[], seed: number, t: number, how: HouseFlight): InsectPose {
  const p = PACE[how], per = p.leg + p.rest, clock = t + (seed % 997) * 37;
  const route = stops.length ? [home, ...stops] : [0, 1, 2, 3].map((k) => ({ x: home.x + Math.cos(k * 1.57) * 0.9, y: home.y + Math.sin(k * 1.57) * 0.9 }));
  const stop = (n: number) => (n % 5 === 0 ? route[0] : route[1 + (hash(seed, n) % Math.max(1, route.length - 1))] ?? route[0]);
  const n = Math.floor(clock / per), u = clock - n * per, a = stop(n), b = stop(n + 1);
  // (settled on a plant's top, or by its foot for one that crawls; a little off the middle, each insect its own way)
  const off = (k: number) => ({ x: ((hash(seed, k) % 100) / 100 - 0.5) * 0.35, y: ((hash(seed + 7, k) % 100) / 100 - 0.5) * 0.35 });
  const oa = off(n), ob = off(n + 1);
  if (u < p.rest) return { at: { x: a.x + oa.x, y: a.y + oa.y }, lift: p.perch, right: hash(seed, n) % 2 === 0, moving: false, settled: u };
  const e = (u - p.rest) / p.leg, k = e * e * (3 - 2 * e);
  const dx = b.x + ob.x - (a.x + oa.x), dy = b.y + ob.y - (a.y + oa.y), len = Math.hypot(dx, dy) || 1;
  // (a fly's way is never straight: it weaves a little across its line, a crawler's not at all)
  const weave = how === "crawl" ? 0 : Math.sin(e * Math.PI * 3 + seed) * 0.18 * Math.sin(e * Math.PI);
  const at = { x: a.x + oa.x + dx * k - (dy / len) * weave, y: a.y + oa.y + dy * k + (dx / len) * weave };
  return { at, lift: p.perch + Math.sin(e * Math.PI) * p.arc, right: dx - dy >= 0, moving: true, settled: -1 };
}
