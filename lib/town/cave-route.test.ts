import { afterEach, describe, expect, it, vi } from "vitest";

/** The cave's day route, with the database played by a script: what it writes, and what it says when there is no table. */
const calls: Array<{ op: string; args: unknown[] }> = [];
let table: "missing" | "there";
let have = 0;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (name: string) => ({
      select: () => ({ eq: async () => (table === "missing" ? { error: { code: "42P01" }, count: null } : { error: null, count: have }) }),
      upsert: async (rows: unknown[], options: unknown) => { calls.push({ op: `upsert ${name}`, args: [rows, options] }); have = (rows as unknown[]).length; return { error: null }; },
      insert: async () => { calls.push({ op: "insert", args: [] }); return { error: null }; },
      update: async () => { calls.push({ op: "update", args: [] }); return { error: null }; },
      delete: async () => { calls.push({ op: "delete", args: [] }); return { error: null }; },
    }),
  }),
}));
vi.mock("@/lib/supabase/config", () => ({ SUPABASE_URL: "http://db.test" }));

afterEach(() => { calls.length = 0; have = 0; vi.unstubAllEnvs(); vi.resetModules(); });

describe("the cave's day route", () => {
  it("lays the thirty floors with the game's own generator, insert only, and says how many are there", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    table = "there";
    const { GET } = await import("../../app/api/town/cave/route");
    const { caveLayout } = await import("@/lib/town/mining-row");
    const body = await (await GET()).json();
    expect(body.laid).toBe(30);
    expect(typeof body.day).toBe("number");
    expect(calls.map((c) => c.op)).toEqual(["upsert town_cave_days"]);
    const [rows, options] = calls[0].args as [Array<{ day: number; floor: number; layout: unknown }>, { onConflict: string; ignoreDuplicates: boolean }];
    expect(options).toEqual({ onConflict: "day,floor", ignoreDuplicates: true });
    expect(rows.map((r) => r.floor)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(rows.every((r) => r.day === body.day && Object.keys(r).sort().join() === "day,floor,layout")).toBe(true);
    expect(rows[4].layout).toEqual(caveLayout(5, body.day));
    // laid already: nothing is written again
    calls.length = 0;
    expect((await (await GET()).json()).laid).toBe(30);
    expect(calls).toEqual([]);
  });

  it("answers that none is laid, quietly, where there is no table yet or no key to write with", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
    table = "missing";
    let { GET } = await import("../../app/api/town/cave/route");
    let res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).laid).toBe(0);
    expect(calls).toEqual([]);
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules();
    ({ GET } = await import("../../app/api/town/cave/route"));
    res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).laid).toBe(0);
    expect(calls).toEqual([]);
  });
});
