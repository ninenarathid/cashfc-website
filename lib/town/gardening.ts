import { GARDEN_CROPS, type GardenCropId } from "./garden-items";
import { CROPS, type CropId, type ItemId } from "./items";
import { WILD, see, tend, type Bed, type FarmSky, type Plot } from "./farm";
import { held, handOf, no, put, roomFor, type Purse } from "./trade";
import { hasBuff } from "./stamina";
import { bedOf } from "./world";

export const GARDEN = {
  version: 1, boost: 3600000, extra: 1,
  shapes: {
    bottleGourd: [[0, 0], [1, 0], [1, 1]], rowBean: [[0, 0], [1, 0]],
    trellisBerry: [[0, 0], [0, 1], [0, 2]], blueCorn: [[0, 0], [1, 0], [2, 0]],
    teaBush: [[0, 0], [1, 0]], sunflowerPatch: [[0, 0], [1, 0], [0, 1]],
    redOkra: [[0, 0], [0, 1]], lotusRootBed: [[0, 0], [1, 0], [2, 0]],
  } satisfies Record<GardenCropId, number[][]>,
  crosses: [
    ["pumpkin", "cucumber", "bottleGourd"], ["longBean", "basil", "rowBean"],
    ["rowBean", "teaBush", "trellisBerry"], ["corn", "sunflowerPatch", "blueCorn"],
    ["basil", "lemongrass", "teaBush"], ["corn", "basil", "sunflowerPatch"],
    ["chili", "longBean", "redOkra"], ["taro", "kangkong", "lotusRootBed"],
  ] as Array<[CropId, CropId, GardenCropId]>,
};
export function gardenShape(key: string, crop: CropId, rotation = 0): string[] | null {
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 3) return null;
  const [x, y] = key.split(",").map(Number), shape = GARDEN.shapes[crop as GardenCropId];
  if (!Number.isInteger(x) || !Number.isInteger(y) || bedOf(x, y) < 0) return null;
  const offsets = (shape ?? [[0, 0]]).map(([u, v]) => {
    for (let r = 0; r < rotation; r++) [u, v] = [-v, u];
    return [u, v];
  });
  const cells = offsets.map(([u, v]) => `${x + u},${y + v}`);
  return cells.every(cell => { const [u, v] = cell.split(",").map(Number); return bedOf(u, v) === bedOf(x, y); }) ? cells : null;
}
export function gardenRoom(key: string, crop: CropId, plots: Readonly<Record<string, Plot>>, rotation = 0): string[] | null {
  const cells = gardenShape(key, crop, rotation);
  return cells?.every(k => plots[k]?.soil === "tilled" && !plots[k].plant) ? cells : null;
}
export function gardenMods(purse: Purse, now: number) {
  return { hint: hasBuff(purse, now, "pollen") || held(purse.bag, "pollenBrush") > 0,
    knife: held(purse.bag, "graftKnife") > 0, layout: held(purse.bag, "rootGuide") > 0,
    boost: held(purse.bag, "soilScoop") > 0, seed: held(purse.bag, "seedTray") > 0,
    extra: held(purse.bag, "gardenTwine") > 0 };
}
/** One root can record a cross only once, even when it bears again. */
export function gardenCross(key: string, plots: Readonly<Record<string, Plot>>, me: string, now: number, sky: FarmSky): GardenCropId | null {
  const root = plots[key]?.plant;
  if (!root || root.by !== me || root.crossed || !see(key, plots[key], now, sky).ripe) return null;
  const cells = root.footprint ?? [key];
  for (const [a, b, child] of GARDEN.crosses) {
    const other = root.crop === a ? b : root.crop === b ? a : null;
    if (!other) continue;
    for (const [k, plot] of Object.entries(plots)) {
      const p = plot.plant;
      if (!p || p.by !== me || p.crop !== other || (p.root && p.root !== k) || !see(k, plot, now, sky).ripe) continue;
      const theirs = p.footprint ?? [k];
      if (cells.some(c => { const [x, y] = c.split(",").map(Number); return theirs.some(d => { const [u, v] = d.split(",").map(Number); return bedOf(x, y) === bedOf(u, v) && Math.max(Math.abs(x - u), Math.abs(y - v)) === 1; }); })) return child;
    }
  }
  return null;
}
/** Copies of a sprawling plant reserve its space; every deed is paid at its root. */
export function syncGarden(plots: Record<string, Plot>): Record<string, Plot> {
  const out = { ...plots };
  for (const [key, plot] of Object.entries(out)) {
    const p = plot.plant;
    if (!p?.root || p.root === key) continue;
    const main = out[p.root];
    out[key] = main?.plant?.root === p.root && main.plant.footprint?.includes(key) ? { ...main, plant: { ...main.plant } } : { soil: "cleared", plant: null };
  }
  for (const [key, plot] of Object.entries(out)) if (plot.plant?.root === key) for (const cell of plot.plant.footprint ?? []) out[cell] = { ...plot, plant: { ...plot.plant } };
  return out;
}
/** Shared by hand picking and the sickle's row; no reward is paid at a satellite. */
export function gardenHarvest<T extends { purse: Purse; plot: Plot; got: Array<[ItemId, number]> }>(key: string, plots: Readonly<Record<string, Plot>>, before: Purse, did: T, me: string, now: number, sky: FarmSky) {
  const plant = plots[key]?.plant;
  if (!plant || (plant.root && plant.root !== key)) return did;
  const child = gardenCross(key, plots, me, now, sky), fx = gardenMods(before, now);
  let after = did.purse, updated = did.plot;
  const extras: Array<[ItemId, number]> = [];
  if (plant.root && fx.extra) extras.push([plant.crop, GARDEN.extra]);
  if (!updated.plant && plant.root && fx.seed) extras.push([CROPS[plant.crop].seed, 1]);
  if (child) extras.push([GARDEN_CROPS[child].seed, fx.knife ? 2 : 1]);
  for (const [id, n] of extras) { if (roomFor(after.bag, id) < n) return no("full"); after = { ...after, bag: put(after.bag, id, n) }; }
  if (child) {
    after = { ...after, gardenBook: [...new Set([...(after.gardenBook ?? []), child])] };
    if (updated.plant) updated = { ...updated, plant: { ...updated.plant, crossed: true } };
  }
  return { ...did, purse: after, plot: updated, got: [...did.got, ...extras], ...(child ? { cross: child } : {}) };
}
export function gardenTend(key: string, plots: Readonly<Record<string, Plot>>, bed: Bed | undefined, others: number, holds: number, purse: Purse, me: string, now: number, sky: FarmSky, sure = false, luck?: number, rotation = 0) {
  const plot = plots[key] ?? WILD, hand = handOf(purse), crop = Object.keys(GARDEN_CROPS).find(c => GARDEN_CROPS[c as GardenCropId].seed === hand) as GardenCropId | undefined;
  const cells = crop && !plot.plant ? gardenRoom(key, crop, plots, rotation) : undefined;
  if (crop && !plot.plant && !cells) return { ok: false as const, why: "soil" as const };
  const ownCells = (plot.plant?.footprint?.length ?? 1) - 1;
  const base = tend(key, plot, bed, Math.max(0, others - ownCells), holds, purse, me, now, sky, sure, luck);
  const did = base.ok && base.deed === "pick" ? gardenHarvest(key, plots, purse, base, me, now, sky) : base;
  if (!did.ok) return did;
  let updated = did.plot;
  const fx = gardenMods(purse, now);
  if (did.deed === "sow" && crop && cells && updated.plant) updated = { ...updated, plant: { ...updated.plant, root: key, footprint: cells, rotation, boost: updated.plant.boost + (fx.boost ? GARDEN.boost : 0) } };
  // Removing a root frees its whole footprint in the same successful deed.
  const next = { ...plots, [key]: updated };
  for (const cell of plot.plant?.footprint ?? []) if (cell !== key) next[cell] = updated;
  const synced = syncGarden(next), changed = Object.fromEntries(Object.keys(synced).filter(k => k === key || synced[k] !== plots[k]).map(k => [k, synced[k]]));
  return { ...did, plot: updated, plots: changed };
}
