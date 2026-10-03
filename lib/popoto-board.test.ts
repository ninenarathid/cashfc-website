import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOP_N, profileTotals, rank, type Totals } from "@/lib/popoto-board";

/**
 * The top of a popoto board.
 *
 * The page asks this while it is built and the browser asks it again a moment
 * later, and the two lists are drawn one over the other, so it has to come out
 * the same way every time: most potatoes first, then the one more people gave
 * to, and nobody on nothing.
 */

const totals = (rows: [number, number, number][]): Totals =>
  new Map(rows.map(([id, score, n]) => [id, { score, n }]));

describe("rank", () => {
  const names = { 1: { name: "Aqua Eleison", avatar: "a.png" } };

  it("puts the most potatoes first, and more givers first on a tie", () => {
    const got = rank(totals([[3, 5, 2], [1, 9, 4], [2, 5, 3]]), names);
    expect(got.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("leaves out anybody on zero", () => {
    expect(rank(totals([[1, 0, 0], [2, 1, 1]]), names).map((r) => r.id)).toEqual([2]);
  });

  it("names people from the roster, and a stranger by their id", () => {
    const [first, second] = rank(totals([[1, 2, 1], [77, 1, 1]]), names);
    expect(first).toEqual({ id: 1, name: "Aqua Eleison", avatar: "a.png", score: 2, n: 1 });
    expect(second).toEqual({ id: 77, name: "#77", avatar: null, score: 1, n: 1 });
  });

  it(`stops at ${TOP_N}`, () => {
    const many = totals(Array.from({ length: 25 }, (_, i) => [i + 1, 30 - i, 1]));
    expect(rank(many, names)).toHaveLength(TOP_N);
  });
});

/**
 * Who has how many: asked of the database (popoto_totals, v104).
 *
 * The board has to come out as it did when the page counted the rows itself,
 * down to who comes first on a tie. And an answer the database could not give
 * must never be read as nobody having any, nor as a reason to go and fetch
 * every row: until v104 had run the page did fall back to the rows, and that
 * way is gone.
 */

interface Kudo { id: number; receiver_character_id: number; sender_id: string; created_at: string }
interface Line { receiver_character_id: number; score: number; n: number; first_id: number }

const OCTOBER = "2026-10-01T00:00:00+07:00";

/** What popoto_totals answers for these rows, in no order the caller is owed. */
function totalsOf(kudos: Kudo[], since: string | null): Line[] {
  const by = new Map<number, { score: number; who: Set<string>; first_id: number }>();
  for (const k of kudos) {
    if (since && Date.parse(k.created_at) < Date.parse(since)) continue;
    const at = by.get(k.receiver_character_id)
      ?? { score: 0, who: new Set<string>(), first_id: k.id };
    at.score += 1;
    at.who.add(k.sender_id);
    at.first_id = Math.min(at.first_id, k.id);
    by.set(k.receiver_character_id, at);
  }
  return [...by.entries()]
    .map(([id, v]) => ({
      receiver_character_id: id, score: v.score, n: v.who.size, first_id: v.first_id,
    }))
    .sort((a, b) => a.receiver_character_id - b.receiver_character_id);
}

/**
 * Just enough of a Supabase client for profileTotals, over rows held here.
 *
 * `fn` is what the database says when asked for popoto_totals: "there" answers
 * as v104's function does, "missing" as PostgREST does when it knows no such
 * function, and anything else is handed back as the error. Answers and rows
 * are both cut a thousand at a time, the way PostgREST cuts them, and put in
 * an order only when one is asked for. Every request is written down, the
 * rows' too, though nothing should ask for them.
 */
function fake(
  kudos: Kudo[],
  fn: "there" | "missing" | { code: string; message: string } = "there",
) {
  const asked: string[] = [];
  const cut = <T,>(all: T[], a: number, b: number) =>
    ({ data: all.slice(a, Math.min(b, a + 999) + 1), error: null });
  const client = {
    rpc(name: string, args: { p_since?: string }, how?: { get?: boolean }) {
      let by = "";
      const q = {
        order(column: string) { by = column; return q; },
        range(a: number, b: number) {
          asked.push(`${how?.get ? "GET" : "POST"} ${name} ${JSON.stringify(args)} by ${by} ${a}-${b}`);
          if (fn === "missing") {
            return Promise.resolve({ data: null, error: {
              code: "PGRST202",
              message: "Could not find the function public.popoto_totals(p_since) in the schema cache",
            } });
          }
          if (fn !== "there") return Promise.resolve({ data: null, error: fn });
          const lines = totalsOf(kudos, args.p_since ?? null);
          if (by === "first_id") lines.sort((x, y) => x.first_id - y.first_id);
          return Promise.resolve(cut(lines, a, b));
        },
      };
      return q;
    },
    from(table: string) {
      let since: string | null = null;
      let by = "";
      const q = {
        select() { return q; },
        gte(_column: string, value: string) { since = value; return q; },
        order(column: string) { by = column; return q; },
        range(a: number, b: number) {
          asked.push(`rows of ${table} since ${since} by ${by} ${a}-${b}`);
          const rows = kudos
            .filter((k) => !since || Date.parse(k.created_at) >= Date.parse(since))
            .sort((x, y) => (by === "id" ? x.id - y.id : 0));
          return Promise.resolve(cut(rows, a, b));
        },
      };
      return q;
    },
  };
  return { supabase: client as unknown as SupabaseClient, asked };
}

const kudo = (id: number, to: number, from: string, at: string): Kudo =>
  ({ id, receiver_character_id: to, sender_id: from, created_at: `${at}+07:00` });

// Five people over the turn of a month. 50 and 40 end level, on one potato
// from one person each, and 50 was given theirs first.
const KUDOS: Kudo[] = [
  kudo(1, 50, "a", "2026-09-10T08:00:00"),
  kudo(2, 10, "a", "2026-09-28T10:00:00"),
  kudo(3, 10, "b", "2026-09-29T10:00:00"),
  kudo(4, 30, "a", "2026-09-30T23:59:59.999"),   // the last millisecond of September
  kudo(5, 20, "a", "2026-10-01T00:00:00"),       // October, to the instant
  kudo(6, 20, "b", "2026-10-01T09:00:00"),
  kudo(7, 10, "a", "2026-10-02T10:00:00"),       // the same giver, another day
  kudo(8, 30, "c", "2026-10-02T11:00:00"),
  kudo(9, 20, "c", "2026-10-02T12:00:00"),
  kudo(10, 40, "c", "2026-10-03T07:00:00"),
];

const ALL_TIME = [
  [50, { score: 1, n: 1 }], [10, { score: 3, n: 2 }], [30, { score: 2, n: 2 }],
  [20, { score: 3, n: 3 }], [40, { score: 1, n: 1 }],
];
const THIS_MONTH = [
  [20, { score: 3, n: 3 }], [10, { score: 1, n: 1 }], [30, { score: 1, n: 1 }],
  [40, { score: 1, n: 1 }],
];

/** Which rows or lines each request asked for, without the rest of it. */
const pages = (asked: string[]) => asked.map((a) => a.split(" ").at(-1));

describe("profileTotals", () => {
  it("asks the database, and keeps the order each was first given one", async () => {
    const { supabase, asked } = fake(KUDOS);
    expect([...await profileTotals(supabase, null)]).toEqual(ALL_TIME);
    expect([...await profileTotals(supabase, OCTOBER)]).toEqual(THIS_MONTH);
    // One request each, no date at all for all time, and never the rows.
    expect(asked).toEqual([
      "GET popoto_totals {} by first_id 0-999",
      `GET popoto_totals {"p_since":"${OCTOBER}"} by first_id 0-999`,
    ]);
  });

  it("draws the board as it was, a tie going to whoever was given theirs first", async () => {
    // 50 and 40 are level on one potato from one person each: 50 was given theirs first
    const all = rank(await profileTotals(fake(KUDOS).supabase, null), {});
    expect(all.map((r) => r.id)).toEqual([20, 10, 30, 50, 40]);
    const month = rank(await profileTotals(fake(KUDOS).supabase, OCTOBER), {});
    expect(month.map((r) => r.id)).toEqual([20, 10, 30, 40]);
  });

  it("asks again past a thousand people, and drops nobody", async () => {
    const crowd = Array.from({ length: 2500 }, (_, i) =>
      kudo(i + 1, 9000 + i, "a", "2026-10-02T10:00:00"));
    const { supabase, asked } = fake(crowd);
    const got = await profileTotals(supabase, null);
    expect(got.size).toBe(2500);
    expect([...got.keys()].slice(0, 2)).toEqual([9000, 9001]);
    expect([...got.keys()].at(-1)).toBe(11499);
    expect(pages(asked)).toEqual(["0-999", "1000-1999", "2000-2999"]);
  });

  it("says so when the database fails, and does not fetch every row instead", async () => {
    const { supabase, asked } = fake(KUDOS,
      { code: "57014", message: "canceling statement due to statement timeout" });
    await expect(profileTotals(supabase, null)).rejects.toThrow("statement timeout");
    expect(asked).toEqual(["GET popoto_totals {} by first_id 0-999"]);
  });

  it("says so when the function is not there, and does not count the rows instead", async () => {
    const { supabase, asked } = fake(KUDOS, "missing");
    await expect(profileTotals(supabase, null)).rejects.toThrow("Could not find the function");
    expect(asked).toEqual(["GET popoto_totals {} by first_id 0-999"]);
  });
});
