import { ELEMENT_TRAINING, gemsOf, masteryOf, toolKindOf } from "./tools";
import type { Purse, Stack } from "./trade";

/** Called only after a validated, successful job. Updates exactly the used slot. */
export function trainElement<P extends Purse>(before: Purse, after: P, tool: Stack | null | undefined): P {
  if (!tool || !gemsOf(tool).length) return after;
  const slot = before.bag.indexOf(tool), kept = after.bag[slot];
  if (slot < 0 || !kept || kept.item !== tool.item || !toolKindOf(kept.item) || JSON.stringify(gemsOf(kept)) !== JSON.stringify(gemsOf(tool))) return after;
  const mastery = masteryOf(kept);
  for (const element of new Set(gemsOf(tool))) mastery[element] = Math.min(ELEMENT_TRAINING[3], (mastery[element] ?? 0) + 1);
  return { ...after, bag: after.bag.map((s, i) => i === slot ? { ...kept, mastery } : s) };
}
