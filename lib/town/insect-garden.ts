import { see, type FarmSky, type Plot } from "./farm";
import { buffBy, hasBuff } from "./stamina";
import { held, take, type Purse } from "./trade";
import type { ItemId } from "./items";
import { INSECT_SPECIES } from "./insect-items";

export const INSECT_GARDEN = {
  visitors: Object.keys(INSECT_SPECIES),
  boost: 30 * 60000, fanBoost: 45 * 60000, pollenMinutes: 60, cageMinutes: 90, guardMinutes: 120, satchel: 0.85,
  pollinators: ["honeyBee", "carpenterBee", "hoverfly", "pollenMidge", "silkMoth", "orchardBeetle", "butterflyWhite", "monarch", "morpho", "moth", "lunaMoth", "hawkMoth"] as ItemId[],
  predators: ["lacewing", "goldenAnt", "mantis", "ladybird", "orchidMantis"] as ItemId[],
};
export type InsectCare = "pollinate" | "guard";
export function scentMods(purse: Purse, now: number) {
  return { route: held(purse.bag, "routeLens") > 0 || hasBuff(purse, now, "scent"),
    soft: Math.min(held(purse.bag, "scentSatchel") > 0 ? INSECT_GARDEN.satchel : 1, 1 - buffBy(purse, now, "scent")) };
}
export function insectCareMode(item: ItemId | null): InsectCare | null {
  return item && INSECT_GARDEN.pollinators.includes(item) ? "pollinate" : item && INSECT_GARDEN.predators.includes(item) ? "guard" : null;
}
/** A captured insect is either kept or released. A pollination pays once per bearing. */
export function insectCare(key: string, plot: Plot, purse: Purse, slot: number, mode: InsectCare, me: string, now: number, sky: FarmSky) {
  const stack = Number.isInteger(slot) && slot >= 0 ? purse.bag[slot] : null, p = plot.plant;
  if (!stack || stack.n < 1 || insectCareMode(stack.item) !== mode) return { ok: false as const, why: "none" as const };
  if (!p || (p.root && p.root !== key)) return { ok: false as const, why: "soil" as const };
  const seen = see(key, plot, now, sky);
  if (seen.dead) return { ok: false as const, why: "soil" as const };
  if (mode === "pollinate" && p.by !== me) return { ok: false as const, why: "theirs" as const };
  if (mode === "pollinate" && (seen.ripe || p.pollenRound === p.picked)) return { ok: false as const, why: "wet" as const };
  if (mode === "guard" && !seen.pest) return { ok: false as const, why: "soil" as const };
  const plant = mode === "pollinate" ? { ...p, pollenRound: p.picked, pollenUntil: now + (held(purse.bag, "releaseCage") > 0 ? INSECT_GARDEN.cageMinutes : INSECT_GARDEN.pollenMinutes) * 60000,
    boost: p.boost + (held(purse.bag, "pollenFan") > 0 ? INSECT_GARDEN.fanBoost : INSECT_GARDEN.boost) }
    : { ...p, cured: now, guard: Math.max(p.guard, held(purse.bag, "pestWhistle") > 0 ? now + INSECT_GARDEN.guardMinutes * 60000 : 0) };
  const entry = `${stack.item}:${p.crop}:${mode}`;
  return { ok: true as const, plot: { ...plot, plant }, purse: { ...purse, bag: take(purse.bag, stack.item, 1), insectGardenBook: [...new Set([...(purse.insectGardenBook ?? []), entry])] }, mode };
}
