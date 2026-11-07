/**
 * Which farm this page has (the owner, 2026-11-07: the editor's farm "oatto-farmv2" to replace the farm, "เริ่มทำได้เลย",
 * with the old one kept to switch back to, as the town's is: lib/town/town-map): `classic`, the farm as it was laid out
 * since 2026-10-03 (its southern half 2026-10-19, its animal farm 2026-10-20), or `farm2`, the editor's (lib/town/farm2).
 * Both are in every build; the database says which is the farm now (`town_farm_map()`, set by an admin with
 * `town.apply_farm`, supabase v323), and a switch back is that one call.
 *
 * Picked once, when this module is first read, and kept for the page's life, as the town's is: every map's layout is
 * worked out from it at load (lib/town/world, lib/town/pasture). In order:
 * 1. `next dev`: the test link's `?farmMap=`;
 * 2. `globalThis.__cashTownFarm`, set by the town's page from the database before the town is loaded (or by a test);
 * 3. what the last page here was told (localStorage);
 * 4. `FARM_MAP` in the environment (scripts and tests);
 * 5. `classic`: a build changes nothing until the database says otherwise.
 * A page that finds the database saying other than what it was read with reloads once (components/town/TownGate).
 */
export type FarmMap = "classic" | "farm2";
export const FARM_MAPS: readonly FarmMap[] = ["classic", "farm2"];
/** Where the last word of the database is kept between pages. */
export const FARM_MAP_KEY = "cashtown:farm";

export const isFarmMap = (m: unknown): m is FarmMap => m === "classic" || m === "farm2";

function picked(): FarmMap {
  if (process.env.NODE_ENV !== "production" && typeof location !== "undefined") {
    const asked = new URLSearchParams(location.search).get("farmMap");
    if (isFarmMap(asked)) return asked;
  }
  const g = globalThis as { __cashTownFarm?: unknown };
  if (isFarmMap(g.__cashTownFarm)) return g.__cashTownFarm;
  try {
    const kept = typeof localStorage !== "undefined" ? localStorage.getItem(FARM_MAP_KEY) : null;
    if (isFarmMap(kept)) return kept;
  } catch { /* storage refused: the next way */ }
  const env = typeof process !== "undefined" ? process.env?.FARM_MAP : undefined;
  return isFarmMap(env) ? env : "classic";
}

/** This page's farm. */
export const FARM_MAP: FarmMap = picked();
/** Whether this page's farm is the editor's. */
export const F2 = FARM_MAP === "farm2";
(globalThis as { __cashTownFarmUsed?: FarmMap }).__cashTownFarmUsed = FARM_MAP;

/** Whether `next dev`'s test link says the farm: then the database's word changes nothing on this page (no reload, which would only read the link again). */
const ASKED = process.env.NODE_ENV !== "production" && typeof location !== "undefined" && isFarmMap(new URLSearchParams(location.search).get("farmMap"));

/** Remember what the database said, for the next page. Whether this page was read with something else (then it has to load again). */
export function heardFarmMap(m: string | null | undefined): boolean {
  if (!isFarmMap(m)) return false;
  try { localStorage.setItem(FARM_MAP_KEY, m); } catch { /* the next page asks again */ }
  return m !== FARM_MAP && !ASKED;
}
