/**
 * Which main town this page has (the owner, 2026-10-22: the editor's town "oatto2-cash80x80v2" replaces the town, "เปลี่ยน
 * ทั้งเมือง", and "ยังมี backup เมืองเดิมพร้อมสลับใช้เมื่อฉุกเฉินเสมอ"): `classic`, the town as it was laid out since
 * 2026-10-02, or `town2`, the editor's (lib/town/town2). Both are in every build; the database says which is the town now
 * (`town_map()`, set by an admin with `town_set_map`, supabase v295), and a switch back is that one call.
 *
 * Picked once, when this module is first read, and kept for the page's life: every map's layout is worked out from it at
 * load (lib/town/world), so a page never changes town under anybody's feet. In order:
 * 1. `globalThis.__cashTownMap`, set by the town's page from the database before the town is loaded (or by a test);
 * 2. what the last page here was told (localStorage), for a page that resumes the town before asking (the dock);
 * 3. `TOWN_MAP` in the environment (scripts and tests);
 * 4. `classic`: a build changes nothing until the database says otherwise.
 * A page that finds the database saying other than what it was read with reloads once (components/town/TownGate).
 */
export type TownMap = "classic" | "town2";
export const TOWN_MAPS: readonly TownMap[] = ["classic", "town2"];
/** Where the last word of the database is kept between pages. */
export const TOWN_MAP_KEY = "cashtown:map";

const isMap = (m: unknown): m is TownMap => m === "classic" || m === "town2";

function picked(): TownMap {
  // (`next dev`: the test link's `?townMap=` before anything else, whatever this browser kept or whoever read the town
  // first: the owner's look at the shop on his own machine came up in the old town, 2026-10-25)
  if (process.env.NODE_ENV !== "production" && typeof location !== "undefined") {
    const asked = new URLSearchParams(location.search).get("townMap");
    if (isMap(asked)) return asked;
  }
  const g = globalThis as { __cashTownMap?: unknown };
  if (isMap(g.__cashTownMap)) return g.__cashTownMap;
  try {
    const kept = typeof localStorage !== "undefined" ? localStorage.getItem(TOWN_MAP_KEY) : null;
    if (isMap(kept)) return kept;
  } catch { /* storage refused: the next way */ }
  const env = typeof process !== "undefined" ? process.env?.TOWN_MAP : undefined;
  return isMap(env) ? env : "classic";
}

/** This page's town. */
export const TOWN_MAP: TownMap = picked();
/** Whether this page's town is the editor's. */
export const T2 = TOWN_MAP === "town2";
(globalThis as { __cashTownMapUsed?: TownMap }).__cashTownMapUsed = TOWN_MAP;

/** Remember what the database said, for the next page. Whether this page was read with something else (then it has to load again). */
export function heardTownMap(m: string | null | undefined): boolean {
  if (!isMap(m)) return false;
  try { localStorage.setItem(TOWN_MAP_KEY, m); } catch { /* the next page asks again */ }
  return m !== TOWN_MAP;
}
