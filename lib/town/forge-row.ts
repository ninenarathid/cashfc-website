import { SMITH, TRIES } from "./forge";
import { BUILT, ELEMENTS, FORGE, GEMS, GEM_LEVELS, LEVELS, OPTIONS, OPTION_IDS, SMELTING, SMELTS, TOOL_KINDS, TOOL_LINES, WOODEN } from "./tools";

/**
 * The blacksmith as the database is to read him (its catalog's `forge` row): every number of lib/town/forge and of
 * lib/town/tools that its rules decide by, so that the database only looks a number up and has no rule of its own to
 * drift from the code's. Each part is named after what it is in the code:
 *
 * - `kinds`, `wooden`: the kinds of tool that are forged, and which of them take the wooden recipe; `lines`: the
 *   lines of work by the kinds of tool each is done with (`TOOL_LINES`: which kinds are fellows);
 * - `forge`: the top, the floor, the milestones and their pools, the sockets (`FORGE`, whole); `gemLevels`: how many
 *   levels a gem's element works at; `levels`: what each kind of tool is at each plus (`LEVELS`, whole);
 * - `tries`: the table (`TRIES`), a line a level: the odds in hundredths, the fee, and a metal tool's ore and timber;
 * - `smith`: his knobs (`SMITH`): the queue's places and what widening it takes, the bellows, a gem's mount and fee,
 *   a draw made again, how many options a draw lays out;
 * - `options`: every option in the registry's order (a document's keys keep none, and a draw picks by place), and of
 *   each its pool, the tools it is drawn for, its own numbers and its count; `built`: which of them, and which
 *   elements, each kind of tool has a use for yet: only those are drawn and set;
 * - `elements` in their order, and `gems`: each element's gem and the fragment it is smelted of;
 * - `smelting` (so many fragments and so much timber a piece), and `smelts`: every piece that comes out, in order,
 *   with the fragment it is of, its minutes and its fee.
 *
 * No names and no words: what an option or an element does is the games' own to read from the numbers.
 */
export function forgeRow() {
  return {
    kinds: [...TOOL_KINDS], wooden: [...WOODEN], lines: TOOL_LINES, forge: FORGE, gemLevels: GEM_LEVELS, levels: LEVELS, tries: TRIES, smith: SMITH,
    options: {
      order: [...OPTION_IDS],
      of: Object.fromEntries(OPTION_IDS.map((id) => { const o = OPTIONS[id] as { pool: 1 | 2; tools: readonly string[]; n: Readonly<Record<string, number>>; use?: { n: number; per: string } }; return [id, { pool: o.pool, tools: [...o.tools], n: o.n, ...(o.use ? { use: o.use } : {}) }]; })),
    },
    built: BUILT,
    elements: [...ELEMENTS], gems: Object.fromEntries(ELEMENTS.map((e) => [e, { gem: GEMS[e].gem, chip: GEMS[e].chip }])),
    smelting: { fragments: SMELTING.fragments, timber: SMELTING.timber }, smelts: { order: Object.keys(SMELTS), of: SMELTS },
  };
}
