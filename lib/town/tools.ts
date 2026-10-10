import type { ItemId } from "./items";
import type { Stack } from "./trade";

/**
 * Forging: what a tool carries of its own, and what that does (2026-10-08, with woodcutting and mining).
 *
 * A tool of the first tier can be forged (the pick and the axe, and the seven there were: rod, hoe, watering can,
 * insect net, pot, pan, grill). What it gains rides on its own slot of the bag (lib/town/trade's `Stack`): a `plus`
 * (0 to 10), the options drawn for it at its milestones (`opts`), the gems set in it (`gems`). Forging never changes
 * a tool's tier (the owner), and a plus buys time and ease: never more things a go, never less stamina.
 *
 * What the smith put into a tool (its plus, its options, its gems, its makers' names) may be traded with another tool
 * of its line (`TOOL_LINES`; lib/town/forge's `moveForging`). The cookware draws from one pool, so there an option is
 * at home in all three; a hoe's options in a watering can, and a can's in a hoe, sleep until they are back in a kind
 * of their own pool (`originOf`, `awayOf`). That is the only way an option sleeps.
 *
 * This file is the registry and the readers. It keeps nothing, reads no clock, and imports nothing but types, so
 * that lib/town/gear (which lib/town/trade stands on) may read it. The smith's own rules (smelting, a try, a draw)
 * are lib/town/forge's; what is counted by the day or the meal is lib/town/powers'. Nothing here is told to the
 * players: what a thing does is theirs to find, and the smith's screen says only what the owner allowed it to.
 * Every number is a knob, and they are all here.
 */

/* ── which tools ────────────────────────────────────────────────────────── */

/** The kinds of tool that can be forged: the first-tier things of these ids. */
export const TOOL_KINDS = ["pick", "axe", "rod", "hoe", "can", "bugNet", "pot", "pan", "grill"] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];
/** The wooden ones: a try takes half the ore of a metal tool's (rounded up) and twice the timber (lib/town/forge). */
export const WOODEN: readonly ToolKind[] = ["axe", "rod", "bugNet"];
export const isWooden = (kind: ToolKind): boolean => WOODEN.includes(kind);
/** The kind of tool a thing is forged as: null for everything else, the better tools of later tiers among it. */
export const toolKindOf = (item: string | null | undefined): ToolKind | null =>
  (typeof item === "string" && (TOOL_KINDS as readonly string[]).includes(item) ? (item as ToolKind) : null);
/**
 * The lines of work, by the kinds of tool each is done with (the owner, 2026-10-09: a line with several tools, like
 * cooking's pot, pan and grill, may move a tool's plus and gems to another of its tools). The table itself, and
 * nothing worked out from elsewhere: every kind that is forged is in one line and in no other. Two tools of one line
 * may trade what the smith put into them (lib/town/forge's `moveForging`), and the more kinds a line has the less it
 * pays; a kind alone in its line has nothing to trade with. A line is called as lib/town/lines calls it (cooking is
 * "kitchen" there), though nothing is read from there.
 */
export const TOOL_LINES = {
  kitchen: ["pot", "pan", "grill"],
  farming: ["hoe", "can"],
  fishing: ["rod"],
  insects: ["bugNet"],
  mining: ["pick"],
  felling: ["axe"],
} as const satisfies Record<string, readonly ToolKind[]>;
export type ToolLine = keyof typeof TOOL_LINES;
export const TOOL_LINE_IDS = Object.keys(TOOL_LINES) as ToolLine[];
/** The line a kind of tool is of. */
export const toolLineOf = (kind: ToolKind): ToolLine | null => TOOL_LINE_IDS.find((l) => (TOOL_LINES[l] as readonly ToolKind[]).includes(kind)) ?? null;
/** The kinds of a kind's line, in the table's order, itself among them (itself alone, of a kind in no line). */
export const lineKinds = (kind: ToolKind): readonly ToolKind[] => { const l = toolLineOf(kind); return l ? TOOL_LINES[l] : [kind]; };

export const FORGE = {
  /** The highest plus. */
  top: 10,
  /** A try that fails never leaves a tool under this, once it has been there. */
  floor: 4,
  /** The levels an option is drawn at, and the pool each is drawn from. */
  milestones: [3, 6, 10] as readonly number[],
  pools: [1, 1, 2] as ReadonlyArray<1 | 2>,
  /** Two gem sockets, opened at +7 and +10. */
  sockets: 2,
  socketAt: [7, 10] as readonly number[],
  /** A tool in the hand glows from this plus, and fully at the top. */
  glow: { from: 7, full: 10 },
  /** At the top every gem in the tool is so many levels stronger. */
  gemAtTop: 1,
  /** All of ease together (a plus, an option, a gem, a meal's buff, a gift) is never more than so many times the plain tool. */
  cap: 3,
  /** A maker's name on a tool is so many characters at the most. */
  maker: 24,
};
/** Ease, capped: so many times as easy, and a pace or a wait so many times as slow or short, never past the cap. */
export const capEase = (times: number): number => Math.min(FORGE.cap, Math.max(1 / FORGE.cap, times));

/* ── elements, gems and ore ─────────────────────────────────────────────── */

export const ELEMENTS = ["fire", "water", "ice", "earth", "lightning", "wind", "light", "dark"] as const;
export type Element = (typeof ELEMENTS)[number];
/** Each element's gem and the fragments it is smelted of, its name, and the colour a tool that carries it glows in. */
export const GEMS: Record<Element, { gem: ItemId; chip: ItemId; name: { th: string; en: string }; hue: string }> = {
  fire: { gem: "gemRuby", chip: "chipRuby", name: { th: "ไฟ", en: "Fire" }, hue: "#ff6a3d" },
  water: { gem: "gemSapphire", chip: "chipSapphire", name: { th: "น้ำ", en: "Water" }, hue: "#4f8dff" },
  ice: { gem: "gemAquamarine", chip: "chipAquamarine", name: { th: "น้ำแข็ง", en: "Ice" }, hue: "#8fe6ff" },
  earth: { gem: "gemAmber", chip: "chipAmber", name: { th: "ดิน", en: "Earth" }, hue: "#d99a3a" },
  lightning: { gem: "gemTopaz", chip: "chipTopaz", name: { th: "สายฟ้า", en: "Lightning" }, hue: "#ffe14d" },
  wind: { gem: "gemEmerald", chip: "chipEmerald", name: { th: "ลม", en: "Wind" }, hue: "#5fe08a" },
  light: { gem: "gemDiamond", chip: "chipDiamond", name: { th: "แสง", en: "Light" }, hue: "#fff6d8" },
  dark: { gem: "gemOnyx", chip: "chipOnyx", name: { th: "ความมืด", en: "Dark" }, hue: "#a47bff" },
};
export const isElement = (e: unknown): e is Element => typeof e === "string" && (ELEMENTS as readonly string[]).includes(e);
/** The element a gem is of (null for anything that is no gem), and the element a gem's fragment is of. */
export const elementOfGem = (item: string | null | undefined): Element | null => ELEMENTS.find((e) => GEMS[e].gem === item) ?? null;
export const elementOfChip = (item: string | null | undefined): Element | null => ELEMENTS.find((e) => GEMS[e].chip === item) ?? null;
/** The colour of a plain glow: a tool with no gem in it. */
export const PLAIN_HUE = "#ffd98a";

/** The ores, by their tier: the fragments a rock leaves and the big ore they are smelted into; how long a piece smelts (minutes) and what the smith asks for it. */
export const ORES = [
  { tier: 1, shard: "shardCopper", ore: "oreCopper", mins: 5, fee: 5 },
  { tier: 2, shard: "shardIron", ore: "oreIron", mins: 8, fee: 10 },
  { tier: 3, shard: "shardSilver", ore: "oreSilver", mins: 11, fee: 15 },
] as const satisfies ReadonlyArray<{ tier: number; shard: ItemId; ore: ItemId; mins: number; fee: number }>;
/** Smelting (the smith's: lib/town/forge): so many fragments and so much fine timber a piece; and a gem's minutes and fee. */
export const SMELTING = { fragments: 10, timber: 1, gem: { mins: 10, fee: 20 } };
/** What is smelted: each piece that comes out, with the fragment it is of, its minutes and its fee. */
export interface Smelt { of: ItemId; mins: number; fee: number }
export const SMELTS: Partial<Record<ItemId, Smelt>> = Object.fromEntries([
  ...ORES.map((o): [ItemId, Smelt] => [o.ore, { of: o.shard, mins: o.mins, fee: o.fee }]),
  ...ELEMENTS.map((e): [ItemId, Smelt] => [GEMS[e].gem, { of: GEMS[e].chip, mins: SMELTING.gem.mins, fee: SMELTING.gem.fee }]),
]);
/** What a fragment is smelted into (null for what is no fragment). */
export const smeltedOf = (fragment: string | null | undefined): ItemId | null => (Object.keys(SMELTS) as ItemId[]).find((id) => SMELTS[id]!.of === fragment) ?? null;

/**
 * What the two new tools bring home, by the thing: an axe what a felled tree leaves, a pick what a broken rock
 * leaves. How often and how many is the lines' own (lib/town/felling, lib/town/mining); this is only which things,
 * for lib/town/uses, which says where everything in the game comes from.
 */
export const FELLED: readonly ItemId[] = ["log", "timber"];
export const MINED: readonly ItemId[] = ["stone", ...ORES.map((o) => o.shard), ...ELEMENTS.map((e) => GEMS[e].chip)];

/* ── what a plus gives ──────────────────────────────────────────────────── */

/**
 * A number at each plus, 0 to 10, from its values at +0, +4, +7 and +10: evenly between them, so that most of it
 * comes near the top.
 */
export function ramp(at0: number, at4: number, at7: number, at10: number, digits = 3): number[] {
  const k = 10 ** digits, out: number[] = [];
  for (let l = 0; l <= 10; l++) {
    const v = l <= 4 ? at0 + ((at4 - at0) * l) / 4 : l <= 7 ? at4 + ((at7 - at4) * (l - 4)) / 3 : at7 + ((at10 - at7) * (l - 7)) / 3;
    out.push(Math.round(v * k) / k);
  }
  return out;
}
/** The stretch to hit so many times as wide, and what moves so much slower (a fraction): the same climb for every tool that has one. */
const WIDER = ramp(1, 1.1, 1.25, 1.5), SLOWER = ramp(0, 0.05, 0.15, 0.3);
/**
 * What each kind of tool is at each plus (index 0 is the tool as it is bought).
 * - pick: what a swing takes off a rock's hardness; the strikes of a vein.
 * - axe: the chops a tree takes; how many segments ahead a branch is seen; how much slower the time bar runs.
 * - rod: the fight's safe stretch; how much slower the fish moves; the strike's moment, in seconds.
 * - hoe: the tilling's stretch; how much slower its marker and the weeding's gusts are.
 * - can: the waterings in a filling; how wide the tired pour's marks are.
 * - bugNet: the ring, in tiles; how long after the swing it lands, in milliseconds.
 * - pot, pan, grill: the stirring's and the roast's good stretch.
 *
 * **No level leaves a tool as the level before left it** (the owner, 2026-10-08): of the numbers a tool's own card
 * shows (lib/town/tool-words' `cardOf`: a rock's swings at each depth, a tree's chops, a filling's waterings, each a
 * whole number), one at the least is another at every plus. So the first plus of an axe is a chop fewer, and of a
 * can a watering more. The tool as it is bought (+0) and the top (+10) are as they were approved.
 */
export const LEVELS = {
  pick: { power: [3, 3.45, 3.65, 3.7, 4, 4.5, 5, 6, 7, 8.5, 12], strikes: [6, 6, 6, 7, 7, 7, 7, 8, 9, 9, 10] },
  axe: { chops: [12, 11, 11, 10, 10, 9, 8, 7, 7, 6, 4], ahead: [3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5], slow: [0, 0, 0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5] },
  rod: { band: WIDER, slow: SLOWER, strike: ramp(1.6, 1.7, 1.9, 2.2) },
  hoe: { band: WIDER, slow: SLOWER },
  can: { waterings: [8, 9, 9, 10, 10, 11, 11, 12, 13, 14, 16], marks: WIDER },
  bugNet: { ring: ramp(0.6, 0.66, 0.75, 0.9), lands: ramp(300, 270, 225, 150, 0) },
  pot: { band: WIDER }, pan: { band: WIDER }, grill: { band: WIDER },
} as const satisfies Record<ToolKind, Record<string, readonly number[]>>;
/**
 * How hard a rock is at the cave's three depths (the shallowest is the mountain's foot's too): what a pick's card
 * counts its swings by. The one table of it: the rocks themselves are lib/town/mining's, whose `MINING.hardness.depth`
 * reads this.
 */
export const ROCKS: readonly number[] = [12, 18, 24];

/* ── options ────────────────────────────────────────────────────────────── */

/** How many times an option does what it does: to a day (from dawn) or to a meal's hours (lib/town/powers counts them, as the gifts' are counted). */
export interface OptionUse { n: number; per: "day" | "meal" }
/** An option: the pool it is drawn from, the tools it is drawn for, its name, its own numbers, and its count if it is counted. */
export interface Option { pool: 1 | 2; tools: readonly ToolKind[]; name: { th: string; en: string }; n: Readonly<Record<string, number>>; use?: OptionUse }
const COOK: readonly ToolKind[] = ["pot", "pan", "grill"];
const opt = (pool: 1 | 2, tools: readonly ToolKind[], th: string, en: string, n: Record<string, number> = {}, use?: OptionUse): Option => ({ pool, tools, name: { th, en }, n, ...(use ? { use } : {}) });
const meal = (n: number): OptionUse => ({ n, per: "meal" }), day = (n: number): OptionUse => ({ n, per: "day" });
/**
 * Every option there is. Pool 1 is drawn at the first two milestones, pool 2 at the top. What each does is read by
 * the game it belongs to, from the numbers here (`n`) and its count (`use`).
 *
 * Every one of them is built (`BUILT`), so every tool draws two from several at each milestone; and where one of a
 * pool was plainly the worse of its fellows its number was mended (2026-10-08), so that each can be argued for.
 */
export const OPTIONS = {
  // ── pool 1 ──
  pkPeek: opt(1, ["pick"], "ตาเห็นเนื้อหิน", "Stone-sight"),
  pkCrumb: opt(1, ["pick"], "เศษติดปลายอีเต้อ", "Crumb-finder", { every: 5, more: 1 }),
  pkSteady: opt(1, ["pick"], "มือนิ่ง", "Steady hand", { strikes: 2 }),
  pkLoose: opt(1, ["pick"], "หินคลอน", "Loosened stone", { fewer: 1 }),
  pkFresh: opt(1, ["pick"], "แรงคนเหมือง", "Miner's wind", {}, meal(10)),
  pkCutter: opt(1, ["pick"], "ตาช่างพลอย", "Gem-cutter's eye", { more: 1 }),
  axGrain: opt(1, ["axe"], "อ่านลายไม้", "Grain-reader", { ahead: 2 }),
  axDust: opt(1, ["axe"], "ไม้แถม", "Offcut", { every: 5, more: 1 }),
  axKeen: opt(1, ["axe"], "คมกริบ", "Keen edge", { chops: 2 }),
  axResin: opt(1, ["axe"], "กลิ่นยางสน", "Resin-scent", { in: 4 }),
  axFresh: opt(1, ["axe"], "แรงคนตัดไม้", "Woodcutter's wind", {}, meal(5)),
  axDry: opt(1, ["axe"], "ไม้แห้งสนิท", "Seasoned wood", { pieces: 2 }),
  rdBait: opt(1, ["rod"], "เหยื่อเกาะแน่น", "Fast bait"),
  rdCalm: opt(1, ["rod"], "น้ำนิ่ง", "Still water", { secs: 2 }),
  rdFresh: opt(1, ["rod"], "แรงนักตกปลา", "Angler's wind", {}, meal(5)),
  rdQuick: opt(1, ["rod"], "ปลาใจร้อน", "Eager fish", { shorter: 0.15 }),
  hoClear: opt(1, ["hoe"], "ดินร่วน", "Loose earth", { stones: 2 }),
  hoFirst: opt(1, ["hoe"], "เผื่อพลาด", "Slips spared", { misses: 1 }),
  hoFresh: opt(1, ["hoe"], "แรงชาวไร่", "Farmer's wind", {}, meal(10)),
  hoLight: opt(1, ["hoe"], "จอบเบามือ", "Light hoe"),
  cnDrop: opt(1, ["can"], "หยดสุดท้าย", "The last drop", { more: 3 }),
  cnThrift: opt(1, ["can"], "ตักน้อยได้มาก", "Thrifty fill", { takes: 1 }),
  cnFresh: opt(1, ["can"], "แรงคนรดน้ำ", "Waterer's wind", {}, meal(10)),
  cnKind: opt(1, ["can"], "น้ำใจ", "Kind hands", { points: 1 }),
  ntAgain: opt(1, ["bugNet"], "ตวัดซ้ำ", "Quick return", { by: 0.5 }),
  ntMesh: opt(1, ["bugNet"], "ตาข่ายถี่", "Fine mesh", { misses: 2 }),
  ntFresh: opt(1, ["bugNet"], "แรงนักจับแมลง", "Catcher's wind", {}, meal(10)),
  ntLong: opt(1, ["bugNet"], "ด้ามยาว", "Long handle", { reach: 1 }),
  ckFire: opt(1, COOK, "ไฟนิ่ง", "Even flame", { steady: 2 }),
  ckBase: opt(1, COOK, "ก้นหนา", "Thick base", { misses: 1 }),
  ckFresh: opt(1, COOK, "แรงคนครัว", "Cook's wind", {}, meal(3)),
  ckBrisk: opt(1, COOK, "ไฟแรง", "Brisk fire", { shorter: 0.25 }),
  // ── pool 2 ──
  pkQuake: opt(2, ["pick"], "แผ่นดินสะเทือน", "Earthshaker", { reach: 2 }, day(10)),
  pkTwin: opt(2, ["pick"], "สายแร่แฝด", "Twin vein", { times: 2 }, day(10)),
  pkDrill: opt(2, ["pick"], "เจาะทะลุพื้น", "Floor-breaker", {}, day(10)),
  pkGleam: opt(2, ["pick"], "ประกายผลึก", "Crystal-gleam", { by: 1.5 }),
  axOne: opt(2, ["axe"], "ฟันเดียวล้ม", "One stroke", {}, day(30)),
  axDouble: opt(2, ["axe"], "ไม้สองเท่า", "Double haul", { by: 2 }, day(10)),
  axRoot: opt(2, ["axe"], "รากคืนชีพ", "Quickening root", { reach: 3, trees: 5 }, day(3)),
  axElder: opt(2, ["axe"], "สหายไม้เฒ่า", "Elder's friend", { by: 1.5 }),
  rdGold: opt(2, ["rod"], "จังหวะทอง", "Golden moment", { secs: 5 }, day(30)),
  rdStill: opt(2, ["rod"], "สายน้ำหลับ", "Sleeping water", { by: 0.35, mins: 30 }, day(2)),
  rdCall: opt(2, ["rod"], "เสียงเรียกปลา", "Fish-call", {}, day(500)),
  hoBoth: opt(2, ["hoe"], "จอบเดียวจบ", "One go, both", { plots: 5 }, day(10)),
  hoGrip: opt(2, ["hoe"], "กำแน่น", "Iron grip", {}, day(20)),
  hoWet: opt(2, ["hoe"], "ดินชุ่ม", "Damp furrow", {}, day(10)),
  cnRain: opt(2, ["can"], "ฝนของฉัน", "A rain of one's own", {}, day(3)),
  cnFull: opt(2, ["can"], "บัวไม่รู้แห้ง", "Bottomless can", { mins: 360 }, day(1)),
  cnTwice: opt(2, ["can"], "น้ำสองเท่า", "Double watering", {}, day(10)),
  ntWide: opt(2, ["bugNet"], "สวิงกวาด", "Sweeping net", { reach: 5, catches: 5 }, day(20)),
  ntFreeze: opt(2, ["bugNet"], "นิ่งไว้ก่อน", "Hold still", { secs: 10 }, day(20)),
  ntNest: opt(2, ["bugNet"], "รู้รัง", "Nest-wise"),
  ckBig: opt(2, COOK, "หม้อใหญ่", "Big pot", { more: 6, batches: 3 }, day(3)),
  ckWarm: opt(2, COOK, "อุ่นนาน", "Long warmth", { hours: 6 }, day(3)),
  ckScent: opt(2, COOK, "หอมทั้งลาน", "Scent of the yard", { stamina: 100 }, day(3)),
} as const satisfies Record<string, Option>;
export type OptionId = keyof typeof OPTIONS;
export const OPTION_IDS = Object.keys(OPTIONS) as OptionId[];
export const isOption = (id: unknown): id is OptionId => typeof id === "string" && Object.prototype.hasOwnProperty.call(OPTIONS, id);
export const optionOf = (id: string): Option | null => (isOption(id) ? OPTIONS[id] : null);
/** A second milestone carries the stronger version, even after a failed try lowers its plus. */
export interface OptionSix { n?: Readonly<Record<string, number>>; use?: OptionUse }
export const SIX: Partial<Record<OptionId, OptionSix>> = {
  pkPeek: { n: { strikes: 2 } }, pkCrumb: { n: { every: 3, more: 2 } }, pkSteady: { n: { strikes: 4 } },
  pkLoose: { n: { fewer: 2 } }, pkFresh: { use: meal(20) }, pkCutter: { n: { more: 2 } },
  axGrain: { n: { ahead: 4 } }, axDust: { n: { every: 3, more: 2 } }, axKeen: { n: { chops: 4 } },
  axResin: { n: { in: 2 } }, axFresh: { use: meal(10) }, axDry: { n: { pieces: 3 } },
  rdBait: { n: { strike: 0.5 } }, rdCalm: { n: { secs: 4 } }, rdFresh: { use: meal(10) }, rdQuick: { n: { shorter: 0.35 } },
  hoClear: { n: { stones: 4 } }, hoFirst: { n: { misses: 2 } }, hoFresh: { use: meal(20) }, hoLight: { n: { band: 1.3 } },
  cnDrop: { n: { more: 6 } }, cnThrift: { n: { takes: 1, more: 6 } }, cnFresh: { use: meal(20) }, cnKind: { n: { points: 2 } },
  ntAgain: { n: { by: 0.25 } }, ntMesh: { n: { misses: 4 } }, ntFresh: { use: meal(20) }, ntLong: { n: { reach: 2 } },
  ckFire: { n: { steady: 4 } }, ckBase: { n: { misses: 2 } }, ckFresh: { use: meal(6) }, ckBrisk: { n: { shorter: 0.4 } },
};
export const strongOf = (stack: Stack | null | undefined): OptionId | null => awayOf(stack) ? null : drawnOf(stack)[1];
/** The options of a pool that are drawn for a kind of tool, in the registry's order. */
export const poolOf = (kind: ToolKind, pool: 1 | 2): OptionId[] => OPTION_IDS.filter((id) => OPTIONS[id].pool === pool && (OPTIONS[id].tools as readonly ToolKind[]).includes(kind));
/** One of an option's own numbers (nothing, of a number it has not). */
export const optN = (id: OptionId, key: string, stack?: Stack | null): number =>
  (stack && strongOf(stack) === id ? SIX[id]?.n?.[key] : undefined) ?? (OPTIONS[id].n as Readonly<Record<string, number>>)[key] ?? 0;
/** Every option a kind of tool is drawn, as one word: two kinds with the same word draw from one pool. */
const POOL_WORD = Object.fromEntries(TOOL_KINDS.map((k) => [k, OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly ToolKind[]).includes(k)).join(" ")])) as Record<ToolKind, string>;
/**
 * Whether two kinds of tool draw their options from one pool, as the pot, the pan and the grill do: an option drawn
 * for one is then an option of the other, and works in it. Read from the registry: nothing is listed twice.
 */
export const samePool = (a: ToolKind, b: ToolKind): boolean => a === b || POOL_WORD[a] === POOL_WORD[b];

/**
 * What is built: the options and the elements whose doing a game really reads, by the kind of tool. The smith draws
 * only an option that is here, and sets only a gem whose element is here for that tool: nothing is offered that does
 * nothing. One line a kind, each its builder's to fill (so that branches come together cleanly). Since 2026-10-08
 * every option of the registry and every element is here for every kind: a line that leaves one out again is a
 * thing not built, and says so by leaving it out.
 */
export const BUILT: Record<ToolKind, { opts: readonly OptionId[]; gems: readonly Element[] }> = {
  pick: { opts: ["pkPeek", "pkCrumb", "pkSteady", "pkLoose", "pkFresh", "pkCutter", "pkQuake", "pkTwin", "pkDrill", "pkGleam"], gems: ELEMENTS },
  axe: { opts: ["axGrain", "axDust", "axKeen", "axResin", "axFresh", "axDry", "axOne", "axDouble", "axRoot", "axElder"], gems: ELEMENTS },
  rod: { opts: ["rdBait", "rdCalm", "rdFresh", "rdQuick", "rdGold", "rdStill", "rdCall"], gems: ELEMENTS },
  hoe: { opts: ["hoClear", "hoFirst", "hoFresh", "hoLight", "hoBoth", "hoGrip", "hoWet"], gems: ELEMENTS },
  can: { opts: ["cnDrop", "cnThrift", "cnFresh", "cnKind", "cnRain", "cnFull", "cnTwice"], gems: ELEMENTS },
  bugNet: { opts: ["ntAgain", "ntMesh", "ntFresh", "ntLong", "ntWide", "ntFreeze", "ntNest"], gems: ELEMENTS },
  pot: { opts: ["ckFire", "ckBase", "ckFresh", "ckBrisk", "ckBig", "ckWarm", "ckScent"], gems: ELEMENTS },
  pan: { opts: ["ckFire", "ckBase", "ckFresh", "ckBrisk", "ckBig", "ckWarm", "ckScent"], gems: ELEMENTS },
  grill: { opts: ["ckFire", "ckBase", "ckFresh", "ckBrisk", "ckBig", "ckWarm", "ckScent"], gems: ELEMENTS },
};
/** The options of a pool that may be drawn for a kind of tool now: those of its pool that are built. */
export const drawable = (kind: ToolKind, pool: 1 | 2): OptionId[] => poolOf(kind, pool).filter((id) => BUILT[kind].opts.includes(id));
/** Whether a gem of an element may be set in a kind of tool now: its doing is built. */
export const settable = (kind: ToolKind, element: Element): boolean => BUILT[kind].gems.includes(element);

/* ── what a gem does ────────────────────────────────────────────────────── */

/** The levels a gem's element works at: a tool of the first tier reaches the first, and the second at the top. */
export const GEM_LEVELS = 4;
/**
 * What each element does for the two new tools, at its levels 1 to 4 (the lines' own rules read these). A number
 * that stands for "all of it" (the whole floor, the whole map) is `ALL`.
 * - fire: so much fewer swings, or chops.
 * - water: so many strikes that hit a knot given back; so many branches hit that are no miss.
 * - ice: so many knots a crack may cross; the time bar so much slower.
 * - earth: so much less stamina a rock, or a tree.
 * - lightning: how likely a touching rock breaks too, or a neighbouring tree is half cut.
 * - wind: so much faster a walk, with the tool held.
 * - light: within so many tiles a vein's rock, or a grown tree, glints.
 * - dark: veins so many times as often and harder rocks a swing more; how likely one more log, and the bar so much faster.
 */
export const ALL = 999;
const SHARE = [0.15, 0.25, 0.35, 0.45], COUNT = [1, 2, 3, 4], CHANCE = [0.1, 0.2, 0.3, 0.4], WALK = [0.1, 0.15, 0.2, 0.25];
export const GEM_FX = {
  fire: { pick: { fewer: SHARE }, axe: { fewer: SHARE } },
  water: { pick: { back: COUNT }, axe: { spared: COUNT } },
  ice: { pick: { cross: COUNT }, axe: { slow: SHARE } },
  earth: { pick: { stamina: SHARE }, axe: { stamina: SHARE } },
  lightning: { pick: { chain: CHANCE }, axe: { chain: CHANCE } },
  wind: { pick: { walk: WALK }, axe: { walk: WALK } },
  light: { pick: { glint: [4, 7, 10, ALL] }, axe: { glint: [10, 20, 30, ALL] } },
  dark: { pick: { veins: [1.3, 1.6, 1.9, 2.2], swings: [1, 1, 1, 1] }, axe: { log: CHANCE, faster: [0.15, 0.15, 0.15, 0.15] } },
} as const satisfies Record<Element, { pick: Record<string, readonly number[]>; axe: Record<string, readonly number[]> }>;

/* ── the readers ────────────────────────────────────────────────────────── */

/** What a tool carries, made sound and read as it works now. */
export interface ToolMods {
  /** The kind of tool it is forged as: null for a thing that is not forged (then everything below is nothing). */
  kind: ToolKind | null;
  /** Its plus, 0 to 10. */
  level: number;
  /**
   * The options it has that work, in the order of their milestones. An option once drawn is the tool's for good and
   * works whatever the level has since fallen to (the owner, 2026-10-08: a failed try takes a level, never a choice
   * made).
   */
  opts: OptionId[];
  /**
   * The options it carries that sleep: those of a forging that sits in a kind of tool of another pool than the one
   * they were drawn for (a hoe's in a watering can, a can's in a hoe: `awayOf`). They do nothing there, and work
   * again when the forging is back in a kind of their own pool. Nothing else puts an option to sleep.
   */
  asleep: OptionId[];
  strong: OptionId | null;
  /** The level each element works at, of the gems set in it (one more at the top). */
  gems: Partial<Record<Element, number>>;
  /** Whether it glows in the hand: 0 not, 1 from +7, 2 fully at the top; and in what colour. */
  glow: 0 | 1 | 2;
  hue: string;
}
const NOTHING: ToolMods = { kind: null, level: 0, opts: [], asleep: [], strong: null, gems: {}, glow: 0, hue: PLAIN_HUE };
/** A tool's plus, made sound: a whole number from 0 to the top; 0 for a thing that is not forged. */
export function levelOf(stack: Stack | null | undefined): number {
  if (!stack || !toolKindOf(stack.item)) return 0;
  const p = stack.plus;
  return typeof p === "number" && Number.isFinite(p) ? Math.max(0, Math.min(FORGE.top, Math.floor(p))) : 0;
}
/** What is kept as a tool's options, read as the options of a kind of tool: by the milestone, each of that kind's and that milestone's pool, each once. */
const optsFor = (kept: readonly unknown[], kind: ToolKind): Array<OptionId | null> =>
  FORGE.milestones.map((_, i) => {
    const id = kept[i];
    return isOption(id) && OPTIONS[id].pool === FORGE.pools[i] && (OPTIONS[id].tools as readonly ToolKind[]).includes(kind) && kept.indexOf(id) === i ? id : null;
  });
/**
 * A tool's options and the kind of tool they were drawn for, made sound. They are the tool's own kind's, but for a
 * forging that came out of a fellow of its line (`origin` on the stack: lib/town/forge's `moveForging` writes it)
 * and has an option of that kind's: then they are that kind's. A forging with no option yet is of no pool, and so of
 * the kind it sits in, wherever it began.
 */
function carriedOf(stack: Stack | null | undefined): { origin: ToolKind | null; opts: Array<OptionId | null> } {
  const kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return { origin: null, opts: FORGE.milestones.map(() => null) };
  const kept: readonly unknown[] = Array.isArray(stack.opts) ? stack.opts : [], from = toolKindOf(stack.origin);
  if (from && from !== kind && lineKinds(kind).includes(from)) {
    const theirs = optsFor(kept, from);
    if (theirs.some(Boolean)) return { origin: from, opts: theirs };
  }
  return { origin: kind, opts: optsFor(kept, kind) };
}
/**
 * The options a tool carries, by the milestone each was drawn at (null where none was drawn, or what is kept there is
 * no option of the kind they were drawn for and that milestone's pool): made sound. Carried, awake or asleep: which
 * of the two is `awayOf`'s to say, and `modsOf` has them apart.
 */
export const drawnOf = (stack: Stack | null | undefined): Array<OptionId | null> => carriedOf(stack).opts;
/**
 * The kind of tool a tool's options were drawn for: its own, but for a forging moved into it out of a fellow of its
 * line. Null for a thing that is not forged. (A tool forged before anything could be moved has no such field, and is
 * its own kind.)
 */
export const originOf = (stack: Stack | null | undefined): ToolKind | null => carriedOf(stack).origin;
/**
 * Whether a tool's forging is away from home: it sits in a kind of tool that draws from another pool than its
 * options were drawn from. Its options sleep there, and it is neither forged further nor drawn for again until it is
 * back (lib/town/forge). Never, among the pot, the pan and the grill: they draw from one pool.
 */
export function awayOf(stack: Stack | null | undefined): boolean {
  const kind = stack ? toolKindOf(stack.item) : null, from = carriedOf(stack).origin;
  return !!kind && !!from && !samePool(from, kind);
}
/** The elements of the gems set in a tool, one for each socket filled: made sound. */
export function gemsOf(stack: Stack | null | undefined): Element[] {
  if (!stack || !toolKindOf(stack.item) || !Array.isArray(stack.gems)) return [];
  return stack.gems.filter(isElement).slice(0, FORGE.sockets);
}
/** Fitted gems survive a downgrade; an empty socket needs its unlock level. */
export const socketOpen = (stack: Stack | null | undefined, socket: number): boolean =>
  !!stack && !!toolKindOf(stack.item) && Number.isInteger(socket) && socket >= 0 && socket < FORGE.sockets &&
  (levelOf(stack) >= FORGE.socketAt[socket] || socket < gemsOf(stack).length);
/** A name as it is written on a tool: one line, no longer than a maker's name may be. Nothing, of what is no name. */
export const makerName = (name: unknown): string => (typeof name === "string" ? Array.from(name.replace(/\s+/g, " ").trim()).slice(0, FORGE.maker).join("").trim() : "");
/**
 * Who forged a tool to each of its milestones, by the milestone (null where nobody is written): made sound. A tool
 * remembers the first to bring it to each (the owner, 2026-10-08: a maker's history), and the names stay on it
 * wherever it goes: a deal carries them with everything else the tool carries.
 */
export function makersOf(stack: Stack | null | undefined): Array<string | null> {
  const kind = stack ? toolKindOf(stack.item) : null, kept = stack && Array.isArray(stack.makers) ? stack.makers : [];
  return FORGE.milestones.map((_, i) => (kind ? makerName(kept[i]) || null : null));
}
/** Everything a tool carries, as it works now. */
export function modsOf(stack: Stack | null | undefined): ToolMods {
  const kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return NOTHING;
  const level = levelOf(stack), drawn = drawnOf(stack).filter((id): id is OptionId => !!id), away = awayOf(stack);
  const set = gemsOf(stack), gems: Partial<Record<Element, number>> = {};
  for (const e of set) gems[e] = Math.min(GEM_LEVELS, gems[e] === undefined ? worksAt(level) : gems[e]! + 1);
  return { kind, level, opts: away ? [] : drawn, asleep: away ? drawn : [], strong: strongOf(stack), gems, glow: level >= FORGE.glow.full ? 2 : level >= FORGE.glow.from ? 1 : 0, hue: set.length ? GEMS[set[0]].hue : PLAIN_HUE };
}
/** Whether a tool has an option that works: drawn at one of its milestones, whatever its level is now, and not asleep. */
export const has = (stack: Stack | null | undefined, id: OptionId): boolean => modsOf(stack).opts.includes(id);
/** The level an element works at: one extra tier for a matching second gem. */
export const gemLevel = (stack: Stack | null | undefined, element: Element): number => modsOf(stack).gems[element] ?? 0;
/** What an element gives a tool, from the steps of its four levels: `else_` with no gem of it set. */
export const gemBy = (stack: Stack | null | undefined, element: Element, steps: readonly number[], else_ = 0): number => {
  const l = gemLevel(stack, element);
  return l >= 1 ? steps[Math.min(steps.length, l) - 1] : else_;
};
const at = (table: readonly number[], stack: Stack | null | undefined): number => table[levelOf(stack)];

/** What one swing of a pick takes off a rock's hardness. */
export const pickPower = (stack: Stack | null | undefined): number => at(LEVELS.pick.power, stack);
/**
 * How many swings a pick takes to break a rock of some hardness, the pick's own all told: its power; its fire, so
 * much fewer (rounded down when fire is active); dark adds a swing only to harder rocks. Never under one.
 */
export function pickSwings(stack: Stack | null | undefined, hardness: number): number {
  const plain = Math.ceil(hardness / pickPower(stack));
  const fire = gemBy(stack, "fire", GEM_FX.fire.pick.fewer);
  return Math.max(1, (fire > 0 ? Math.floor(plain * (1 - fire)) : plain) + (plain > 2 ? gemBy(stack, "dark", GEM_FX.dark.pick.swings) : 0));
}
/** The strikes a pick has at a vein: its level's, and its steady hand's. */
export const veinStrikes = (stack: Stack | null | undefined): number => at(LEVELS.pick.strikes, stack) + (has(stack, "pkSteady") ? optN("pkSteady", "strikes", stack) : 0) + (has(stack, "pkPeek") ? optN("pkPeek", "strikes", stack) : 0);
/**
 * The chops an axe takes to fell a tree, the axe's own all told: its level's, less its keen edge's, and its fire's so
 * much fewer (rounded up). Never under one. `base`: for a tree that takes more than a plain one (the plain tree's is
 * the table's +0), the same share of that.
 */
export function axeChops(stack: Stack | null | undefined, base: number = LEVELS.axe.chops[0]): number {
  const level = (at(LEVELS.axe.chops, stack) * base) / LEVELS.axe.chops[0] - (has(stack, "axKeen") ? optN("axKeen", "chops", stack) : 0);
  return Math.max(1, Math.ceil(Math.ceil(level) * (1 - gemBy(stack, "fire", GEM_FX.fire.axe.fewer))));
}
/** How many segments ahead an axe shows a branch: its level's, and its grain-reader's. */
export const axeAhead = (stack: Stack | null | undefined): number => at(LEVELS.axe.ahead, stack) + (has(stack, "axGrain") ? optN("axGrain", "ahead", stack) : 0);
/**
 * How fast the felling's time bar runs with an axe, as so many times its plain pace, the axe's own all told: its
 * level's slowing, its ice's, and its dark's quickening. Never slower than the cap allows.
 */
export function axeBarPace(stack: Stack | null | undefined): number {
  const pace = (1 - at(LEVELS.axe.slow, stack)) * (1 - gemBy(stack, "ice", GEM_FX.ice.axe.slow)) * (1 + gemBy(stack, "dark", GEM_FX.dark.axe.faster));
  return Math.max(1 / FORGE.cap, pace);
}
/** How much slower the time bar runs with an axe, as a share of its plain pace (under nothing, with an axe that quickens it): one less `axeBarPace`. */
export const axeBarSlow = (stack: Stack | null | undefined): number => 1 - axeBarPace(stack);

/** Each element's letter, for what the room is told of the tool in a hand. */
const LETTER: Record<Element, string> = { fire: "f", water: "w", ice: "i", earth: "e", lightning: "z", wind: "a", light: "l", dark: "d" };
/** The level a gem works at in a tool of some plus: the first, and one more at the top. */
const worksAt = (level: number): number => Math.min(GEM_LEVELS, 1 + (level >= FORGE.top ? FORGE.gemAtTop : 0));
/** The dev preview can still show three gems; gameplay uses at most two. */
export const GEMS_SHOWN = 3;
/**
 * The gems set in a tool as they are SHOWN on it in the hand, one for each that is set, in their sockets' order:
 * every one of them, so many at the most. In the game they are `gemsOf`'s (nothing is set where there is no socket);
 * the dev Test window can show historical three-gem concepts beyond the two gameplay sockets.
 * The rules never read this.
 */
export function gemsShown(stack: Stack | null | undefined): Element[] {
  if (!stack || !toolKindOf(stack.item) || !Array.isArray(stack.gems)) return [];
  return stack.gems.filter(isElement).slice(0, GEMS_SHOWN);
}
/**
 * What the room is told of the tool in somebody's hand (lib/town/room's `Doing.tool`): how it glows (0 to 2), and,
 * of a tool with gems, a letter for each gem in its sockets' order and the level a gem works at. `1` a plain tool at
 * +7, `0i1` one gem of ice, `2ffw2` two of fire and one of water at the top. Nothing, of a tool with nothing to tell
 * (no glow, no gem) and of a thing that is no tool. It is what every page draws the glow and the gems' elements
 * from, and what every page walks its holder by: a pace has to be the same on every page.
 *
 * A newly set gem retains the legacy three-character word. Trained gems append their visual stages after `~`.
 * Every viewer needs the matching client release to draw this suffix. Historical third gems are not broadcast.
 */
/** Visual milestones only: successful jobs, never extra drops or socket changes. */
export const ELEMENT_TRAINING = [0, 20, 100, 300] as const;
export const masteryOf = (stack: Stack | null | undefined): Partial<Record<Element, number>> =>
  Object.fromEntries(ELEMENTS.flatMap((e) => {
    const n = stack?.mastery?.[e];
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? [[e, Math.min(ELEMENT_TRAINING[3], Math.floor(n))]] : [];
  }));
export const elementStage = (stack: Stack | null | undefined, element: Element): number => {
  const points = masteryOf(stack)[element] ?? 0;
  return ELEMENT_TRAINING.reduce<number>((stage, threshold, i) => points >= threshold ? i : stage, 0);
};
export function toolWord(stack: Stack | null | undefined): string {
  const m = modsOf(stack), set = gemsOf(stack);
  if (!m.glow && !set.length) return "";
  const stages = set.map((e) => elementStage(stack, e));
  return `${m.glow}${set.length ? `${set.map((e) => LETTER[e]).join("")}${worksAt(m.level)}` : ""}${stages.some(Boolean) ? `~${stages.join("")}` : ""}`;
}
export const TOOL_WORD = /^[0-2](?:[a-z]{1,8}[1-4](?:~[0-3]{1,3})?)?$/;
/** What a word tells of a tool: how it glows; its gems as they are shown, in their order; the first of them and the level a gem works at; and the colour of its glow. */
export interface ToolLook { glow: 0 | 1 | 2; gems: Element[]; element: Element | null; level: number; hue: string; stages?: number[] }
/** The word read back. Null for no word, or one that says nothing. */
export function readToolWord(word: unknown): ToolLook | null {
  if (typeof word !== "string" || !TOOL_WORD.test(word)) return null;
  const [base, trained = ""] = word.split("~");
  const gems = [...base.slice(1, -1)].map((c) => ELEMENTS.find((x) => LETTER[x] === c)).filter((e): e is Element => !!e).slice(0, GEMS_SHOWN);
  const e = gems[0] ?? null;
  return { glow: Number(base[0]) as 0 | 1 | 2, gems, element: e, level: e ? Number(base[base.length - 1]) : 0, hue: e ? GEMS[e].hue : PLAIN_HUE, ...(trained ? { stages: gems.map((_, i) => Number(trained[i] ?? 0)) } : {}) };
}
/**
 * How strongly gems show in the hand, 1 to 4: training increases light and matching gems concentrate it.
 * Appearance only (components/town/held); no gameplay rule reads it.
 */
export const gemShow = (look: ToolLook | null): number => {
  if (!look?.gems.length) return 0;
  return Math.min(4,1+Math.max(0,...(look.stages ?? []))+(look.gems[0]===look.gems[1] ? 1 : 0));
};
/** The glow a word tells of: how strong, and in what colour (null for no word, and for a tool that does not glow). */
export function glowOf(word: unknown): { glow: 1 | 2; hue: string } | null {
  const t = readToolWord(word);
  return t && t.glow ? { glow: t.glow, hue: t.hue } : null;
}
/** How fast the wind in a tool walks its holder, at its levels: so much faster (the same for every kind of tool). */
export const WIND_WALK = WALK;
/**
 * How many times as fast somebody walks for the tool in their hand, from what the room is told of it: faster with
 * the wind in it, as anybody otherwise. One rule for every page (lib/town/session's step).
 */
export function walkPace(word: unknown): number {
  const t = readToolWord(word);
  // (the gems that work are those a socket holds: the first so many of what is shown)
  const winds = t?.gems.slice(0, FORGE.sockets).filter((e) => e === "wind").length ?? 0;
  return t && t.level >= 1 && winds ? 1 + WIND_WALK[Math.min(WIND_WALK.length, t.level + winds - 1) - 1] : 1;
}
