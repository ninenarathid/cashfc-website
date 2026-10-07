import { slowPartOf } from "./forged";
import { usePower } from "./powers";
import { buffBy, dayOf, eased, staminaOf } from "./stamina";
import type { OptionId } from "./tools";
import type { Purse, Stack } from "./trade";

/**
 * What whoever keeps the game does for a forged tool of the old seven (lib/town/forged has what each carries): the
 * stamina a deed done with it costs. Kept apart from lib/town/forged because it reads the stamina and the counts,
 * which that file may not (lib/town/gear stands on it).
 *
 * Two things lighten a deed's stamina, and no plus does:
 * - an option that makes **the first few deeds of a meal's hours free**: counted in the purse by lib/town/powers, a
 *   deed that cost nothing anyway is not counted;
 * - a gem that takes **a share off every deed**. Stamina is whole points and most deeds cost one or two, so the share
 *   is owed forward as the gardener's gloves' was (lib/town/stamina's `eased`): what is left to pay is paid in whole
 *   points, and the rest of a point is owed to the next deed (`toolOwed` in the purse, under one; never among the
 *   gifts). With a hearty meal the two together never leave less than one part in the cap of the plain cost.
 */

/** What part of a point a tool's share has left owing (nothing, of what is kept wrongly). */
export const toolOwed = (purse: Pick<Purse, "toolOwed">): number => {
  const o = purse.toolOwed;
  return typeof o === "number" && o > 0 && o < 1 ? o : 0;
};

/**
 * A purse after a deed done with a tool, with what the tool's forging takes off its stamina given back. `before` is
 * the purse as the deed found it, `after` as the deed left it; `fx` what the tool carries (its reader's `stamina` and
 * `fresh`), and `fresh` the option that counts its free deeds. With a plain tool, the purse as the deed left it.
 */
export function toolPaid<P extends Purse>(before: Purse, after: P, now: number, tool: Stack | null | undefined, fx: { stamina: number; fresh: boolean }, fresh: OptionId): P {
  const cost = staminaOf(before, now) - staminaOf(after, now);
  if (!(cost > 0) || (!fx.fresh && !(fx.stamina > 0))) return after;
  if (fx.fresh) {
    const used = usePower(after, tool, fresh, now);
    if (used.ok) return { ...used.purse, stamina: { day: dayOf(now), left: staminaOf(before, now) } };
  }
  if (!(fx.stamina > 0)) return after;
  // (what is left to pay: one less the share, with whatever a hearty meal took off already, never under the cap's part)
  const hearty = 1 - buffBy(before, now, "hearty"), part = slowPartOf(hearty, 1 - fx.stamina);
  const did = eased(before, after, now, part, toolOwed(after));
  return { ...did.purse, toolOwed: did.owed };
}
