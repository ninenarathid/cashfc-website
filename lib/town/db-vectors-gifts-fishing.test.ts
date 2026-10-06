import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { driveBack } from "./fishing";
import { stretchOf, USES } from "./gifts";
import { dayOf } from "./stamina";
import { newPurse, type Purse } from "./trade";

/**
 * The cases the database's rules of the fishing deck's gifts are held to (v153's fishing part;
 * lib/town/db-vectors-gifts.test.ts says how such a file works). Each is a function of the schema `town` with its
 * arguments and what the code answers:
 *
 * - `drive_back`: the otter following, had and not following, not had; with every count kept of this meal's hours
 *   and of others; a line snapped, a hook slipped, and every other end; a line whose fish was driven back already.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-fishing.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOW = at("2026-10-06T12:00:00");

export function vectorsFishing(): Vector[] {
  const out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const purse = (gifts: Purse["gifts"] | undefined, more: Partial<Purse> = {}): Purse => {
    const p = { ...newPurse(), stamina: { day: dayOf(NOW), left: 100 }, ...more } as Purse;
    return gifts === undefined ? p : ({ ...p, gifts } as Purse);
  };

  // the otter: following, had and at rest, another following, none had; every count of it; every end of a fight
  const meal = stretchOf(USES.famOtter!, NOW);
  for (const gifts of [undefined, { had: ["famOtter"], charms: [], familiar: "famOtter" }, { had: ["famOtter"], charms: [], familiar: null }, { had: ["famOtter", "famGnome"], charms: [], familiar: "famGnome" }, { had: ["charmFloat"], charms: ["charmFloat"] }] as Array<Purse["gifts"] | undefined>) {
    for (const used of [undefined, 0, 1, 9, 10, 11]) for (const dk of [0, -1]) {
      const g = gifts && used !== undefined ? { ...gifts, used: { famOtter: { k: meal + dk, n: used }, famGnome: { k: meal, n: 3 } } } : gifts;
      for (const how of ["snapped", "slipped", "landed", "left", "early", null]) for (const again of [false, true, null]) for (const when of [NOW, NOW + 7 * 3_600_000]) {
        add("drive_back", [purse(g), how, again, when], driveBack(purse(g), how as string, !!again, when));
      }
    }
  }
  return out;
}

describe("the cases the database's rules of the fishing deck's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsFishing();
    expect(JSON.stringify(vectorsFishing())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    // the otter: a fish driven back with times left and with its last, refused as spent, and refused as nothing to do
    const drove = of("drive_back").map((v) => v.want as { ok: boolean; why?: string; left?: number });
    expect(drove.some((d) => d.ok && d.left === 9) && drove.some((d) => d.ok && d.left === 0) && drove.some((d) => !d.ok && d.why === "spent") && drove.some((d) => !d.ok && d.why === "none")).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-fishing.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
