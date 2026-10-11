import { GEM_BALANCE } from "./gem-balance";
import { dayOf } from "./stamina";
import { gemBy } from "./tools";
import { put, roomFor, type Purse, type Stack } from "./trade";

/** Called only after a successful till (including a paid hoBoth clear). No room consumes no allowance. */
export function darkSoil(purse: Purse, tool: Stack | null | undefined, now: number): { purse: Purse; n: number } {
  const wanted = gemBy(tool, "dark", GEM_BALANCE.darkSoil);
  if (!wanted) return { purse, n: 0 };
  const day = dayOf(now), kept = purse.darkSoil;
  const used = kept?.day === day && Number.isInteger(kept.n) ? Math.max(0, Math.min(GEM_BALANCE.darkSoilDaily, kept.n)) : 0;
  const n = Math.min(wanted, GEM_BALANCE.darkSoilDaily - used, roomFor(purse.bag, "compost"));
  if (n <= 0) return { purse, n: 0 };
  return { purse: { ...purse, bag: put(purse.bag, "compost", n), darkSoil: { day, n: used + n } }, n };
}
