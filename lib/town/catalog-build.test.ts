import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * What the database keeps a copy of has to come out of the code the same wherever the code runs. A page in a
 * production build begins with the fishing deck and the cooking yard as building sites (lib/town/world's `setBuilt`),
 * and the insects' haunts were once laid out as the page stood then: on the site 91 of the 94 lay somewhere else than
 * the database's row, 87 of them out of a net's reach of it, so that a catch was refused as too far away. No test saw
 * it, because none ran as a production build does. This one does.
 */
describe("the catalog, in a production build and out of one", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  /** Every row as the code makes it where `NODE_ENV` is so, and whether the deck and the yard are finished there. */
  const madeAs = async (env: string) => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", env);
    const { catalogOf } = await import("./catalog");
    const { isBuilt } = await import("./world");
    const { HAUNTS } = await import("./insects");
    const all = catalogOf() as unknown as Record<string, unknown>;
    return { built: isBuilt(), haunts: HAUNTS.length, rows: Object.fromEntries(Object.keys(all).map((key) => [key, JSON.stringify(all[key])])) };
  };

  it("is the same, row for row", async () => {
    const here = await madeAs("test"), there = await madeAs("production");
    // (the two do begin otherwise: finished here, building sites there; and are left as they were found)
    expect(here.built).toBe(true);
    expect(there.built).toBe(false);
    expect(Object.keys(there.rows)).toEqual(Object.keys(here.rows));
    expect(Object.keys(here.rows).filter((key) => here.rows[key] !== there.rows[key])).toEqual([]);
    expect(there.haunts).toBe(here.haunts);
    expect(here.haunts).toBeGreaterThan(80);
  });
});
