import { stretchOf } from "./gifts";
import { OPTIONS, SIX, strongOf, drawnOf, has, isOption, optN, type OptionId, type OptionUse } from "./tools";
import type { Purse, Stack } from "./trade";

/**
 * What a tool's option does only so many times: to a day (from dawn, as the stamina's day is) or to a meal's hours
 * (lib/town/tools' `use`). Counted as the gifts' counts are (lib/town/gifts' `USES`, `useGift`), by whoever keeps the
 * game, in the purse (`powers`, never among the gifts): so the count is the same on every device a member plays on.
 * A count is the member's, by the option: two tools with the same option share it.
 *
 * Pure: every function is given the moment it is asked at, and gives back a new purse.
 */
export type PowerRefusal = "none" | "spent";

/** An option's count, if it is counted. */
export const powerRule = (id: string, tool?: Stack | null): OptionUse | null =>
  isOption(id) ? (tool && strongOf(tool) === id ? SIX[id]?.use : undefined) ?? OPTIONS[id].use ?? null : null;
/** How many times a counted option has been used in the stretch `now` is in (none, of a count kept wrongly or of another stretch). */
export function powerUsed(purse: Pick<Purse, "powers">, id: string, now: number): number {
  const rule = powerRule(id), kept = purse.powers && typeof purse.powers === "object" && !Array.isArray(purse.powers) ? purse.powers : {};
  const u = kept[id] as { k?: unknown; n?: unknown } | undefined;
  if (!rule || !u || typeof u !== "object" || u.k !== stretchOf(rule, now) || typeof u.n !== "number" || !Number.isFinite(u.n)) return 0;
  return Math.max(0, Math.floor(u.n));
}
/** How many times more it may be used in this stretch (none, of an option that is not counted). */
export const powerLeft = (purse: Pick<Purse, "powers">, id: string, now: number, tool?: Stack | null): number => {
  const rule = powerRule(id, tool);
  return rule ? Math.max(0, rule.n - powerUsed(purse, id, now)) : 0;
};
/** Whether a tool's counted option can be used now: the tool has it, and it has a time left in this stretch. */
export const mayPower = (purse: Pick<Purse, "powers">, tool: Stack | null | undefined, id: OptionId, now: number): boolean => has(tool, id) && powerLeft(purse, id, now, tool) > 0;
/** Use a tool's counted option once: the tool has to have it, and it has to have a time left in this stretch. */
export function usePower<P extends Pick<Purse, "powers">>(purse: P, tool: Stack | null | undefined, id: OptionId, now: number): { ok: true; purse: P; left: number } | { ok: false; why: PowerRefusal } {
  const rule = powerRule(id, tool);
  if (!rule || !has(tool, id)) return { ok: false, why: "none" };
  const n = powerUsed(purse, id, now);
  if (n >= rule.n) return { ok: false, why: "spent" };
  const kept = purse.powers && typeof purse.powers === "object" && !Array.isArray(purse.powers) ? purse.powers : {};
  return { ok: true, left: rule.n - n - 1, purse: { ...purse, powers: { ...kept, [id]: { k: stretchOf(rule, now), n: n + 1 } },
    ...(id === "ntWide" ? { netSweep: { until: now + 10_000, left: optN(id, "catches", tool) } } : {}) } };
}

/**
 * The options whose doing, once begun, goes on for a while: each with where the purse keeps the moment it is over
 * (lib/town/farm's `canFullNow`, lib/town/fishing's `lullNow`). One line an option, each its builder's to add.
 */
export const TIMED: Partial<Record<OptionId, "canFull" | "rodStill">> = { cnFull: "canFull", rdStill: "rodStill" };
/**
 * The options a tool carries whose doing is going on now: begun, and not yet over. While one is, what the smith put
 * into the tool is not moved to another (lib/town/forge's `moveForging`): the minutes are the member's, and would go
 * on with whatever tool came to hand.
 */
export function running(purse: Pick<Purse, "canFull" | "rodStill">, tool: Stack | null | undefined, now: number): OptionId[] {
  return drawnOf(tool).filter((id): id is OptionId => {
    const key = id ? TIMED[id] : undefined, till = key ? purse[key] : undefined;
    return typeof till === "number" && till > now;
  });
}
