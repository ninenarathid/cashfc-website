import { stretchOf } from "./gifts";
import { OPTIONS, has, isOption, type OptionId, type OptionUse } from "./tools";
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
export const powerRule = (id: string): OptionUse | null => (isOption(id) ? (OPTIONS[id] as { use?: OptionUse }).use ?? null : null);
/** How many times a counted option has been used in the stretch `now` is in (none, of a count kept wrongly or of another stretch). */
export function powerUsed(purse: Pick<Purse, "powers">, id: string, now: number): number {
  const rule = powerRule(id), kept = purse.powers && typeof purse.powers === "object" && !Array.isArray(purse.powers) ? purse.powers : {};
  const u = kept[id] as { k?: unknown; n?: unknown } | undefined;
  if (!rule || !u || typeof u !== "object" || u.k !== stretchOf(rule, now) || typeof u.n !== "number" || !Number.isFinite(u.n)) return 0;
  return Math.max(0, Math.floor(u.n));
}
/** How many times more it may be used in this stretch (none, of an option that is not counted). */
export const powerLeft = (purse: Pick<Purse, "powers">, id: string, now: number): number => {
  const rule = powerRule(id);
  return rule ? Math.max(0, rule.n - powerUsed(purse, id, now)) : 0;
};
/** Whether a tool's counted option can be used now: the tool has it, awake, and it has a time left in this stretch. */
export const mayPower = (purse: Pick<Purse, "powers">, tool: Stack | null | undefined, id: OptionId, now: number): boolean => has(tool, id) && powerLeft(purse, id, now) > 0;
/** Use a tool's counted option once: the tool has to have it, awake, and it has to have a time left in this stretch. */
export function usePower<P extends Pick<Purse, "powers">>(purse: P, tool: Stack | null | undefined, id: OptionId, now: number): { ok: true; purse: P; left: number } | { ok: false; why: PowerRefusal } {
  const rule = powerRule(id);
  if (!rule || !has(tool, id)) return { ok: false, why: "none" };
  const n = powerUsed(purse, id, now);
  if (n >= rule.n) return { ok: false, why: "spent" };
  const kept = purse.powers && typeof purse.powers === "object" && !Array.isArray(purse.powers) ? purse.powers : {};
  return { ok: true, left: rule.n - n - 1, purse: { ...purse, powers: { ...kept, [id]: { k: stretchOf(rule, now), n: n + 1 } } } };
}
