import type { Outcome } from "./forge";
import { dayOf } from "./stamina";
import { BANGKOK, DAY, HOUR, type Purse } from "./trade";

/** The daily right belongs to a member, shared by all their tools and devices. */
export const GREAT_FIRE = { daily: true, dawn: 5, tries: 1 } as const;
export type Half = "flint" | "tinder";
export interface Finder { id: string; name: string; at: number }
export interface Waiting { id: string; name: string; since: number }
/** Legacy fields are retained only to read old trial saves and the village's history. */
export interface GreatFire {
  due: number; flint: Finder | null; tinder: Finder | null; row: Waiting[]; topped: string[];
  used?: Record<string, number>;
}
export const newGreatFire = (): GreatFire => ({ due: 0, flint: null, tinder: null, row: [], topped: [], used: {} });
export function soundGreatFire(kept: unknown): GreatFire {
  const k = (kept && typeof kept === "object" ? kept : {}) as Partial<GreatFire>;
  const used = k.used && typeof k.used === "object" && !Array.isArray(k.used) ? Object.fromEntries(Object.entries(k.used).filter(([id, day]) => id.length > 0 && id.length <= 100 && Number.isSafeInteger(day))) : {};
  return { ...newGreatFire(), topped: [...new Set((Array.isArray(k.topped) ? k.topped : []).filter((id): id is string => typeof id === "string" && !!id))], used };
}
export const fireFromPurse = (purse: Pick<Purse, "forgeDay">, id: string): GreatFire => ({ ...newGreatFire(), used: Number.isSafeInteger(purse.forgeDay) ? { [id]: purse.forgeDay! } : {} });
export const fireResetAt = (now: number): number => (dayOf(now) + 1) * DAY - BANGKOK + GREAT_FIRE.dawn * HOUR;
/** Compatibility helpers: daily fire is always lit and nobody waits for a finder or a queue. */
export const litAt = (_f: GreatFire): number => 0;
export const openTo = (f: GreatFire, _now: number): number => f.row.length;
export const halfFound = (f: GreatFire, _half: Half, _who: { id: string; name: string }, _now: number) => ({ fire: f, found: false, lit: false });
export type FireRefusal = "daily" | "level" | "none" | "fire" | "row" | "turn" | "topped" | "twice" | "places";
type Did = { ok: true; fire: GreatFire } | { ok: false; why: FireRefusal };
export function fireWhy(f: GreatFire, id: string, now: number): FireRefusal | null {
  return f.used?.[id] === dayOf(now) ? "daily" : null;
}
export function joinRow(f: GreatFire, who: { id: string; name: string }, ready: boolean, now: number): Did {
  if (!ready) return { ok: false, why: "level" };
  const why = fireWhy(f, who.id, now);
  return why ? { ok: false, why } : { ok: true, fire: f };
}
export const leaveRow = (_f: GreatFire, _id: string): Did => ({ ok: false, why: "none" });
export function fireSpent(f: GreatFire, who: { id: string; name: string }, out: Outcome, now: number, _chance = 0): GreatFire {
  return { ...f, used: { ...f.used, [who.id]: dayOf(now) }, topped: out === "taken" && !f.topped.includes(who.id) ? [...f.topped, who.id] : f.topped };
}
export interface FireTold {
  flint: { name: string } | null; tinder: { name: string } | null; lit: boolean;
  row: Array<{ id: string; name: string }>; open: number; mine: number; topped: boolean;
  /** Absent while the database still has the earlier file. */
  daily?: { day: number; used: boolean; resetAt: number };
}
export function fireTold(f: GreatFire, me: string, now: number): FireTold {
  const used = fireWhy(f, me, now) === "daily";
  return { flint: null, tinder: null, lit: true, row: [], open: used ? 0 : 1, mine: used ? -1 : 0, topped: false, daily: { day: dayOf(now), used, resetAt: fireResetAt(now) } };
}
