import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG_KEYS, catalogOf, seedFor } from "./catalog";
import { HINT_IDS } from "./hints";
import { ITEM_IDS } from "./items";
import { UNLOCKS, mayAsk, sourcesAt } from "./orders";
import { GOODS } from "./trade";

describe("what the database is told of the game", () => {
  const all = catalogOf();

  it("has every thing, every good and the shelf's order", () => {
    expect(Object.keys(all.items).sort()).toEqual([...ITEM_IDS].sort());
    expect(all.items.rod).toEqual({ kind: "tool", tier: 1, stack: 1, pays: 30 });
    expect(Object.keys(all.goods).length).toBe(Object.keys(GOODS).length);
    expect(all.shelf.basic.length + all.shelf.unlocks.length).toBe(Object.keys(GOODS).length);
    expect(all.rules).toEqual({ slots: 10, rounds: [7, 19], dawn: 5 });
    // it is a document of plain numbers, words and lists: what a jsonb column keeps as it is
    expect(JSON.parse(JSON.stringify(all))).toEqual(all);
  });

  it("keeps of the uncle's order only the stage each thing can first be asked for at: the list for a stage is the whole list, less what comes later", () => {
    for (const kind of ["fish", "crop", "made"] as const) {
      const whole = all.order.asks[kind];
      expect(whole.every(([, from]) => from >= 0)).toBe(true);
      for (let stage = 0; stage <= UNLOCKS.length; stage++) {
        expect(whole.filter(([, from]) => from <= stage).map(([id]) => id)).toEqual(mayAsk(stage)[kind]);
      }
    }
  });

  it("keeps of his hints the stage each can first be made at", () => {
    expect(all.hints.ids.map(([id]) => id)).toEqual(HINT_IDS);
    for (const [id, from] of all.hints.ids) {
      expect(from).toBeGreaterThanOrEqual(0);
      // (what he hints at counts what the forest gives; what he asks for does not)
      for (const stage of [0, 1, 6, 20, 41, UNLOCKS.length]) expect(sourcesAt(stage, true).has(id)).toBe(from <= stage);
    }
  });

  // A migration that has not run yet carries its seed between two marked lines. The seed is written from the code
  // (TOWN_WRITE=1 writes it), and must be what the code gives while the file is there.
  it("is what each pending migration seeds", () => {
    const dir = "supabase";
    for (const version of Object.keys(CATALOG_KEYS)) {
      const file = existsSync(dir) ? readdirSync(dir).find((f) => f.startsWith(`${version}_`) && f.endsWith(".sql")) : undefined;
      if (!file) continue; // it has run: the database keeps its catalog now
      const path = `${dir}/${file}`, text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
      const open = text.indexOf(`-- <catalog:${version}>`), close = text.indexOf(`-- </catalog:${version}>`);
      expect(open).toBeGreaterThanOrEqual(0);
      expect(close).toBeGreaterThan(open);
      const end = close + `-- </catalog:${version}>`.length, seed = seedFor(version);
      if (process.env.TOWN_WRITE) writeFileSync(path, text.slice(0, open) + seed + text.slice(end));
      else {
        // v174 is frozen. v175 changes only these paths and proves the resulting
        // full forge row against catalogOf in its database test.
        const later = version === "v174" && existsSync(".claude/skills/fc-cash-town/scripts/db/v175_draft.sql");
        const baseline = (block: string) => !later ? block : block.replace(/\('forge', \$town\$([\s\S]*?)\$town\$/g, (_, json: string) => {
          const row = JSON.parse(json);
          delete row.fire;
          row.tries = row.tries.map(({ take: _take, stay: _stay, down: _down, ...cost }: Record<string, unknown>) => cost);
          return `('forge', $town$${JSON.stringify(row)}$town$`;
        });
        expect(baseline(text.slice(open, end))).toBe(baseline(seed));
      }
    }
  });
});
