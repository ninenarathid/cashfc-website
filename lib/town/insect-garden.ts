import {works} from "./gifts";
import { carriedBag } from "./passive-equipment";
import { see, type FarmSky, type Plot } from "./farm";
import { buffBy, hasBuff } from "./stamina";
import { held, take, type Purse } from "./trade";
import type { ItemId } from "./items";
import { INSECT_SPECIES } from "./insect-items";
import { POLLINATOR_SKY } from "./helper-items";
import { NEW_INSECTS } from "./band-species";
import { BOARD_FAMILY, BOARD_IDS } from "./board-insect-rows";

/** The time bands' newcomers by family (lib/town/band-species): the pollinators and the hunters join the garden's helpers. */
const newOf = (family: string) => NEW_INSECTS.filter((r) => r.family === family).map((r) => r.id as ItemId);

export const INSECT_GARDEN = {
  // (every newcomer too: they are the garden's, and the farm's pests do not count them, lib/town/insects' farmBugs)
  visitors: [...Object.keys(INSECT_SPECIES), ...NEW_INSECTS.map((r) => r.id), ...BOARD_IDS],
  boost: 30 * 60000, fanBoost: 45 * 60000, pollenMinutes: 60, cageMinutes: 90, guardMinutes: 120, satchel: 0.85,
  pollinators: [...["honeyBee", "carpenterBee", "hoverfly", "pollenMidge", "silkMoth", "orchardBeetle", "butterflyWhite", "monarch", "morpho", "moth", "lunaMoth", "hawkMoth"] as ItemId[], ...newOf("pollinator"), ...BOARD_FAMILY("pollinator")],
  predators: [...["lacewing", "goldenAnt", "mantis", "ladybird", "orchidMantis"] as ItemId[], ...newOf("predator"), ...BOARD_FAMILY("predator")],
};
export type InsectCare = "pollinate" | "guard" | "grow" | "cross";
export function scentMods(purse: Purse, now: number) {
  return { route: held(carriedBag(purse), "routeLens") > 0 || hasBuff(purse, now, "scent"),
    soft: Math.min(held(carriedBag(purse), "scentSatchel") > 0 ? INSECT_GARDEN.satchel : 1, 1 - buffBy(purse, now, "scent")) };
}
export function insectCareMode(item: ItemId | null): InsectCare | null {
  return item && INSECT_GARDEN.pollinators.includes(item) ? "pollinate" : item && INSECT_GARDEN.predators.includes(item) ? "guard" : null;
}
/** A captured insect is either kept or released. A pollination pays once per bearing. */
export function insectCare(key: string, plot: Plot, purse: Purse, slot: number, mode: InsectCare, me: string, now: number, sky: FarmSky) {
  if(!["pollinate","guard","grow","cross"].includes(mode))return {ok:false as const,why:"none" as const};
  const pollen=mode!=="guard";
  if((mode==="grow"||mode==="cross")&&!works(purse,"charmPollenGuardian"))return {ok:false as const,why:"none" as const};
  const stack = Number.isInteger(slot) && slot >= 0 ? purse.bag[slot] : null, p = plot.plant;
  if (!stack || stack.n < 1 || insectCareMode(stack.item) !== (pollen?"pollinate":"guard")) return { ok: false as const, why: "none" as const };
  if (!p || (p.root && p.root !== key)) return { ok: false as const, why: "soil" as const };
  const seen = see(key, plot, now, sky);
  if (seen.dead) return { ok: false as const, why: "soil" as const };
  if (pollen && p.by !== me) return { ok: false as const, why: "theirs" as const };
  if (pollen && (seen.ripe || p.pollenRound === p.picked)) return { ok: false as const, why: "wet" as const };
  if (mode === "guard" && !seen.pest) return { ok: false as const, why: "soil" as const };
  const plant = pollen ? { ...p, pollenRound: p.picked, pollenSky: POLLINATOR_SKY[stack.item] ?? "sun", pollenUntil: now + (held(carriedBag(purse), "releaseCage") > 0 ? INSECT_GARDEN.cageMinutes : INSECT_GARDEN.pollenMinutes) * 60000,
    ...(mode==="cross"?{insectCrossRound:p.picked}:{}),
    boost: p.boost + (mode==="cross"?0:mode==="grow"?60*60000:(held(carriedBag(purse), "pollenFan") > 0 ? INSECT_GARDEN.fanBoost : INSECT_GARDEN.boost)) }
    : { ...p, cured: now, guard: Math.max(p.guard, held(carriedBag(purse), "pestWhistle") > 0 ? now + INSECT_GARDEN.guardMinutes * 60000 : 0) };
  const entry = `${stack.item}:${p.crop}:${mode}`;
  return { ok: true as const, plot: { ...plot, plant }, purse: { ...purse, bag: take(purse.bag, stack.item, 1), insectGardenBook: [...new Set([...(purse.insectGardenBook ?? []), entry])] }, mode };
}
