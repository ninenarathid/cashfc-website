import { carriedBag } from "./passive-equipment";
import { isRod } from "./gear";
import { no, type Done, type Purse } from "./trade";

export const HOOK_IDS = ["hookScale", "hookSteel", "hookTwin"] as const;
export type HookId = typeof HOOK_IDS[number];
export const isHook = (id: unknown): id is HookId => typeof id === "string" && (HOOK_IDS as readonly string[]).includes(id);

/** Hooks stay in the bag or equipment: this slot chooses which one the fishing rig uses. */
export function hookOf(purse: Purse): HookId | null {
  const id = purse.fishingHook;
  return isHook(id) && carriedBag(purse).some(s => s?.item === id && s.n >= 1) ? id : null;
}

/** A free, repeatable selection; neither fitting nor removal consumes anything. */
export function fitHook(purse: Purse, id: string | null): Done<{ purse: Purse }> {
  if (id !== null && (!isHook(id) || !carriedBag(purse).some(s => s && isRod(s.item) && s.n >= 1) || !carriedBag(purse).some(s => s?.item === id && s.n >= 1))) return no("none");
  return { ok: true, purse: { ...purse, fishingHook: id as HookId | null } };
}
