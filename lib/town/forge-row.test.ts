import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { SMITH, TRIES } from "./forge";
import { forgeRow } from "./forge-row";
import { ITEMS, type ItemId } from "./items";
import { POINTS } from "./line-points";
import { BUILT, ELEMENTS, FORGE, GEMS, GEM_LEVELS, LEVELS, OPTIONS, OPTION_IDS, SIX, SMELTS, TOOL_KINDS, TOOL_LINES, WOODEN, drawable, isWooden, lineKinds, poolOf, samePool, settable, smeltedOf } from "./tools";

describe("what the database is told of the blacksmith", () => {
  const row = forgeRow();

  it("is a row of the catalog, and a document of plain numbers, words and lists", () => {
    expect(catalogOf().forge).toEqual(row);
    expect(JSON.parse(JSON.stringify(row))).toEqual(row);
  });

  it("has the table, the knobs and the kinds as the code has them", () => {
    expect(row.tries).toEqual(TRIES);
    expect(row.tries.map((t) => t.to)).toEqual(Array.from({ length: FORGE.top }, (_, i) => i + 1));
    for (const t of row.tries) expect(t.take + t.stay + t.down, `+${t.to}`).toBe(100);
    expect(row.smith).toEqual(SMITH);
    expect(row.forge).toEqual(FORGE);
    expect(row.kinds).toEqual([...TOOL_KINDS]);
    for (const k of TOOL_KINDS) expect(row.wooden.includes(k), k).toBe(isWooden(k));
    expect(row.wooden).toEqual([...WOODEN]);
    expect(row.gemLevels).toBe(GEM_LEVELS);
    expect(row.levels).toEqual(LEVELS);
    // (the lines, read as the database reads them: a kind's fellows are the kinds of the one line that has it; and two
    // kinds draw from one pool when the same options, in the registry's order, are drawn for both)
    expect(row.lines).toEqual(TOOL_LINES);
    const drawnFor = (k: string) => row.options.order.filter((id) => (row.options.of as Record<string, { tools: string[] }>)[id].tools.includes(k)).join(" ");
    for (const k of TOOL_KINDS) {
      const line = Object.values(row.lines as Record<string, readonly string[]>).filter((kinds) => kinds.includes(k));
      expect(line.length, k).toBe(1);
      expect(line[0], k).toEqual(lineKinds(k));
      for (const o of TOOL_KINDS) expect(k === o || drawnFor(k) === drawnFor(o), `${k} ${o}`).toBe(samePool(k, o));
    }
    // (every thing it names is a thing there is)
    for (const id of [...row.kinds, ...row.tries.map((t) => t.ore), row.smith.gem.mount, "timber"]) expect(id in ITEMS, id).toBe(true);
    // (what the bellows are worth is the helpers' line's own number, which the database counts by)
    expect(catalogOf().work.helpers.bellows).toBe(POINTS.helpers.bellows);
    expect(row.smith.bellows.points).toBe(POINTS.helpers.bellows);
  });

  it("has every option in the registry's order, and what is built: a pool read off it is the code's", () => {
    expect(row.options.order).toEqual(OPTION_IDS);
    expect(Object.keys(row.options.of).sort()).toEqual([...OPTION_IDS].sort());
    const of = row.options.of as Record<string, { pool: number; tools: string[]; n: Record<string, number>; use?: { n: number; per: string } }>;
    for (const id of OPTION_IDS) expect(of[id]).toEqual({ pool: OPTIONS[id].pool, tools: [...OPTIONS[id].tools], n: OPTIONS[id].n, ...("use" in OPTIONS[id] ? { use: (OPTIONS[id] as { use: unknown }).use } : {}), ...(SIX[id] ? { six: SIX[id] } : {}) });
    for (const kind of TOOL_KINDS) for (const pool of [1, 2] as const) {
      // (as the database reads it: the order, those of the pool, for the kind, that are built)
      const read = row.options.order.filter((id) => of[id].pool === pool && of[id].tools.includes(kind));
      expect(read, `${kind} ${pool}`).toEqual(poolOf(kind, pool));
      expect(read.filter((id) => (row.built[kind].opts as readonly string[]).includes(id)), `${kind} ${pool} built`).toEqual(drawable(kind, pool));
    }
    expect(row.built).toEqual(BUILT);
    for (const kind of TOOL_KINDS) for (const e of ELEMENTS) expect((row.built[kind].gems as readonly string[]).includes(e), `${kind} ${e}`).toBe(settable(kind, e));
  });

  it("has every element's gem and fragment, and every piece that is smelted, in order", () => {
    expect(row.elements).toEqual([...ELEMENTS]);
    for (const e of ELEMENTS) expect(row.gems[e]).toEqual({ gem: GEMS[e].gem, chip: GEMS[e].chip });
    expect(row.smelts.order).toEqual(Object.keys(SMELTS));
    expect(row.smelts.of).toEqual(SMELTS);
    for (const piece of row.smelts.order) {
      const rule = (row.smelts.of as Record<string, { of: ItemId; mins: number; fee: number }>)[piece];
      expect(smeltedOf(rule.of), piece).toBe(piece);
      expect(piece in ITEMS && rule.of in ITEMS && rule.mins > 0 && rule.fee >= 0, piece).toBe(true);
    }
    expect(row.smelting.fragments).toBeGreaterThan(0);
  });
});
