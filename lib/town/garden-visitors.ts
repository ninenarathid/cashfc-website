import { see, type FarmSky, type Plot } from "./farm";
import { GOOD_GARDEN, type GardenNow, type Haunt } from "./insects";
import { COMPANIONS } from "./quality";
import { bedOf } from "./world";

/**
 * A bed as a good garden sees it (lib/town/insects' GOOD_GARDEN; the owner, 2026-10-16): how many living pollen helpers in
 * it are grown to their own picture (stage 4 on: a regrowing one counts), counted by their roots, and whether a grown
 * milkweed is among them. Whoever planted them: a bed is a garden for everybody who comes to it. The database asks the
 * same of its plots (town.garden_now).
 */
export function gardenNow(bed: number, plots: Readonly<Record<string, Plot>>, now: number, sky?: FarmSky): GardenNow {
  let n = 0, milkweed = false;
  for (const [key, plot] of Object.entries(plots)) {
    const p = plot?.plant;
    if (!p || (p.root && p.root !== key) || COMPANIONS[p.crop as keyof typeof COMPANIONS]?.role !== "pollen") continue;
    const [x, y] = key.split(",").map(Number);
    if (bedOf(x, y) !== bed) continue;
    const s = see(key, plot, now, sky);
    if (s.dead || s.stage < 4) continue;
    n++;
    if (p.crop === "milkweed") milkweed = true;
  }
  return { good: n >= GOOD_GARDEN.least, milkweed };
}

/** Each garden haunt's bed as it is now (the bed its perches stand in), for lib/town/insects' swarms. */
export const gardensOf = (plots: Readonly<Record<string, Plot>>, now: number, sky?: FarmSky) => {
  const seen = new Map<number, GardenNow>();
  return (h: Haunt): GardenNow | null => {
    if (h.kind !== "garden") return null;
    const bed = bedOf(Math.floor(h.perches[0].x), Math.floor(h.perches[0].y));
    if (!seen.has(bed)) seen.set(bed, gardenNow(bed, plots, now, sky));
    return seen.get(bed)!;
  };
};
