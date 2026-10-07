import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { WATER, chore } from "./farm";
import type { ItemId } from "./items";
import { newPurse, type Purse } from "./trade";

/**
 * The cases the database's rule of the well's chores is held to (lib/town/farm's chore), since a can's filling takes
 * two of the well's bucketfuls and the well holds a hundred (the owner, 2026-10-07): each is the rule's name, what it
 * was asked and what this code answers; a dry run puts each to the SQL of the same name.
 *
 *   TOWN_VECTORS=<a folder> npx vitest run lib/town/db-vectors-gifts-water.test.ts
 *
 * - `chore`: every can, empty, part full and full, at a well with nothing, one, two, three and many bucketfuls and at
 *   its brim; every bucket empty and full at the river and at the well, a well with room for all, for some and for
 *   none; a thing in the hand that is neither, and nothing in the hand.
 */
interface Vector { fn: string; args: unknown[]; want: unknown }
const NOW = Date.parse("2026-10-07T12:00:00+07:00");

function cases(): Vector[] {
  const out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push(JSON.parse(JSON.stringify({ fn, args, want })));
  const holding = (item: ItemId | null, water?: number): Purse => {
    const p = newPurse();
    return { ...p, stamina: { day: 0, left: 50 }, hand: item, bag: p.bag.map((s, i) => (i === 1 && item ? { item, n: 1, ...(water ? { water } : {}) } : i === 3 ? { item: "worm" as ItemId, n: 4 } : s)) } as Purse;
  };
  const wells = [0, 1, 2, 3, 7, 40, WATER.well - 3, WATER.well - 1, WATER.well];
  for (const [can, cap] of Object.entries(WATER.cans) as Array<[ItemId, number]>) for (const had of [0, 1, cap / 2, cap - 1, cap]) for (const well of wells) for (const where of ["well", "river", null] as const) {
    const p = holding(can, had);
    add("chore", [p, where, well, NOW], chore(p, where, well, NOW));
  }
  for (const [bucket, cap] of Object.entries(WATER.buckets) as Array<[ItemId, number]>) for (const had of [0, 1, cap]) for (const well of wells) for (const where of ["well", "river", null] as const) {
    const p = holding(bucket, had);
    add("chore", [p, where, well, NOW], chore(p, where, well, NOW));
  }
  for (const well of [0, 5]) for (const where of ["well", "river"] as const) { add("chore", [holding("hoe"), where, well, NOW], chore(holding("hoe"), where, well, NOW)); add("chore", [holding(null), where, well, NOW], chore(holding(null), where, well, NOW)); }
  return out;
}

describe("the cases the database's rule of the well's chores is held to", () => {
  it("are made the same every time, and reach every answer the rule can give", () => {
    const all = cases();
    expect(JSON.stringify(cases())).toBe(JSON.stringify(all));
    const did = all.map((v) => ({ args: v.args as [Purse, string | null, number, number], want: v.want as { ok: boolean; why?: string; chore?: string; well?: number; purse?: Purse } }));
    for (const what of ["draw", "pour", "fill"]) expect(did.some((d) => d.want.ok && d.want.chore === what), what).toBe(true);
    for (const why of ["none", "dry"]) expect(did.some((d) => !d.want.ok && d.want.why === why), why).toBe(true);
    const fills = did.filter((d) => d.want.ok && d.want.chore === "fill");
    const waterOf = (p: Purse) => p.bag[1]!.water ?? 0;
    // a filling that takes two and fills the can; one that takes the one there is and gives half; one that would go over the brim and does not
    expect(fills.some((d) => d.args[2] - d.want.well! === 2 && waterOf(d.want.purse!) === WATER.cans[d.args[0].hand as ItemId])).toBe(true);
    expect(fills.some((d) => d.args[2] === 1 && d.want.well === 0 && waterOf(d.want.purse!) === waterOf(d.args[0]) + WATER.cans[d.args[0].hand as ItemId]! / 2)).toBe(true);
    expect(fills.some((d) => d.args[2] === 1 && waterOf(d.want.purse!) === WATER.cans[d.args[0].hand as ItemId] && waterOf(d.args[0]) > WATER.cans[d.args[0].hand as ItemId]! / 2)).toBe(true);
    // a pour into a well with room for all of it, for some of it; and no pour at the brim
    const pours = did.filter((d) => d.want.ok && d.want.chore === "pour");
    expect(pours.some((d) => d.want.well === WATER.well && waterOf(d.want.purse!) > 0) && pours.some((d) => waterOf(d.want.purse!) === 0)).toBe(true);
    expect(did.some((d) => d.args[2] === WATER.well && d.args[1] === "well" && !d.want.ok)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-water.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
