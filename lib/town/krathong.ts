import type { ItemId } from "./items";
import type { Line } from "./talk";

/**
 * Loy Krathong's krathong: a floating raft a member puts together from parts, each part paid for with things
 * of the town's lines of work. The owner, 2026-11-22: "allow ให้ผู้เล่นทำกระทง custom เองจากของทุกๆสาย
 * มาประกอบเป็นกระทงประกวดกัน".
 *
 * - **Five places**: a base, a ring of leaves or petals, a light, a centrepiece, and up to three trims on the
 *   front rim. Every part is drawn art of its own (lib/town/krathong-art.json), never a bag icon pasted on.
 * - **Every part is paid** with one of a few choices of things (`pay`): what a member has decides the choice,
 *   never the look. Ten families of centrepiece and trim, one a line of work, so a krathong can carry every line.
 * - **Tried for free, paid once**: the builder shows any combination; pressing send takes the things and the
 *   krathong is final (its name may still change). One krathong a member an edition: made while the contest is
 *   open it is entered; made later (the float nights) it only floats.
 * - **No score from rarity or Quality** (Codex's point, taken: it would hand the contest to the richest): the
 *   members' popoto decide the popular places, and the judge picks one of their own.
 *
 * Pure. The database keeps the same catalog (v336's `<krathong-parts>` block, checked against this file by
 * krathong.test.ts) and the same rules.
 */

export type Slot = "base" | "ring" | "light" | "centre" | "trim";
export type Family = "farm" | "forest" | "fishing" | "insects" | "mining" | "wood" | "kitchen" | "animals" | "smith" | "river";

export interface Part {
  id: string;
  slot: Slot;
  /** The line of work it speaks of. */
  family: Family;
  name: Line;
  /** The ways to pay for it: any ONE of these, so many of that thing. */
  pay: Array<[ItemId, number]>;
}

const p = (id: string, slot: Slot, family: Family, th: string, en: string, pay: Array<[ItemId, number]>): Part =>
  ({ id, slot, family, name: { th, en }, pay });

const GEMS: ItemId[] = ["gemRuby", "gemSapphire", "gemEmerald", "gemAmber", "gemTopaz", "gemAquamarine", "gemOnyx", "gemDiamond"];

export const PARTS: Part[] = [
  // bases
  p("b_wood", "base", "wood", "ฐานไม้แกะ", "Carved wood raft", [["splitPlank", 3], ["carvingBlank", 2]]),
  p("b_leaf", "base", "forest", "ฐานใบไม้พับ", "Folded leaf tray", [["bananaLeaf", 3], ["fernTip", 4]]),
  p("b_bread", "base", "kitchen", "ฐานขนมปัง", "Bread raft", [["flour", 3], ["pineNutFlour", 3]]),
  // rings
  p("r_leaf", "ring", "forest", "กลีบใบไม้พับ", "Folded leaf crown", [["bananaLeaf", 4], ["fernTip", 5]]),
  p("r_lotus", "ring", "farm", "กลีบบัว", "Lotus petals", [["fragrantPetal", 4], ["wildflower", 6]]),
  p("r_marigold", "ring", "farm", "พวงดาวเรือง", "Marigold garland", [["marigold", 6]]),
  // lights
  p("l_candle", "light", "insects", "เทียนขี้ผึ้ง", "Beeswax candle", [["beeswax", 1]]),
  p("l_firefly", "light", "insects", "โหลหิ่งห้อย", "Firefly jar", [["firefly", 3]]),
  // centrepieces, one a line
  p("c_flower", "centre", "farm", "ช่อดอกไม้", "Flower bouquet", [["marigold", 4], ["wildflower", 4], ["wildOrchid", 1], ["moonflower", 1], ["goldenDandelion", 1]]),
  p("c_mushroom", "centre", "forest", "เห็ดกับเฟิร์น", "Mushrooms and fern", [["glowMushroom", 2], ["mushroomSpores", 3]]),
  p("c_shell", "centre", "fishing", "หอยกับไข่มุก", "Shell and pearl", [["snail", 3], ["pearl", 1]]),
  p("c_butterfly", "centre", "insects", "ผีเสื้อเกาะกิ่ง", "Butterfly on a twig", [["butterflyWhite", 2], ["monarch", 1], ["lunaMoth", 1], ["silkMoth", 1]]),
  p("c_crystal", "centre", "mining", "กลุ่มผลึก", "Crystal cluster", [["crystalLens", 2], ...GEMS.map((g): [ItemId, number] => [g, 1]), ["starShard", 1]]),
  p("c_carving", "centre", "wood", "นกไม้แกะ", "Carved wooden bird", [["carvingBlank", 2], ["lure", 1]]),
  p("c_sweets", "centre", "kitchen", "ผลไม้เชื่อม", "Candied fruit", [["sugar", 4], ["gardenHoney", 2], ["sweetGlaze", 1], ["candiedPumpkin", 1]]),
  p("c_feather", "centre", "animals", "พัดขนนก", "Feather fan", [["feather", 4], ["wool", 2], ["yarn", 1]]),
  p("c_bell", "centre", "smith", "กระดิ่งทองแดง", "Copper bell", [["copperBlank", 2], ["floatBell", 1]]),
  p("c_lily", "centre", "river", "บัวกับผักตบ", "Water lily", [["hyacinth", 4], ["lotusRootBed", 1]]),
  // trims, the same ten families, smaller and cheaper
  p("t_flower", "trim", "farm", "ดอกไม้", "Flower", [["marigold", 2], ["wildflower", 2], ["fragrantPetal", 1]]),
  p("t_mushroom", "trim", "forest", "เห็ด", "Mushroom", [["mushroomSpores", 1], ["glowMushroom", 1]]),
  p("t_shell", "trim", "fishing", "หอย", "Shell", [["snail", 1], ["pearl", 1]]),
  p("t_butterfly", "trim", "insects", "ผีเสื้อ", "Butterfly", [["butterflyWhite", 1], ["monarch", 1]]),
  p("t_crystal", "trim", "mining", "อัญมณี", "Gem", [["crystalLens", 1], ["chipAmber", 2], ...GEMS.map((g): [ItemId, number] => [g, 1])]),
  p("t_carving", "trim", "wood", "ปลาไม้แกะ", "Carved fish", [["splitPlank", 2], ["carvingBlank", 1]]),
  p("t_sweets", "trim", "kitchen", "ลูกอม", "Sweet", [["sugar", 2], ["gardenHoney", 1], ["sweetGlaze", 1]]),
  p("t_feather", "trim", "animals", "ขนนก", "Feather", [["feather", 2], ["wool", 1]]),
  p("t_bell", "trim", "smith", "กระดิ่งจิ๋ว", "Little bell", [["copperBlank", 1]]),
  p("t_lily", "trim", "river", "ผักตบ", "Hyacinth", [["hyacinth", 2]]),
];

export const PART = Object.fromEntries(PARTS.map((x) => [x.id, x])) as Record<string, Part>;
export const partsOf = (slot: Slot) => PARTS.filter((x) => x.slot === slot);

/** How many trims a krathong may carry. */
export const MAX_TRIMS = 3;
/** Popoto each member may give in a contest (one an entry, never their own), as the glamour contest. */
export const VOTES_EACH = 3;
/** How many places the popular award has; equal popoto share a place. */
export const PLACES = 3;
export const NAME_MAX = 24;
export const WISH_MAX = 140;

/** A part chosen and the choice of payment: [part id, index into its `pay`]. */
export type Pick = [string, number];
export interface Design { base: Pick; ring: Pick; light: Pick; centre: Pick; trims: Pick[] }

export type Refusal = "part" | "slot" | "pay" | "trims" | "name" | "wish";

/** The design as it must be: every part known, in its own place, with a real way to pay. */
export function check(d: Design): Refusal | null {
  const places: Array<[Pick, Slot]> = [[d.base, "base"], [d.ring, "ring"], [d.light, "light"], [d.centre, "centre"], ...d.trims.map((t): [Pick, Slot] => [t, "trim"])];
  if (!Array.isArray(d.trims) || d.trims.length > MAX_TRIMS) return "trims";
  for (const [pick, slot] of places) {
    if (!Array.isArray(pick) || pick.length !== 2) return "part";
    const part = PART[pick[0]];
    if (!part) return "part";
    if (part.slot !== slot) return "slot";
    if (!Number.isInteger(pick[1]) || pick[1] < 0 || pick[1] >= part.pay.length) return "pay";
  }
  return null;
}

/** What the design takes from the bag, summed over its parts. */
export function costOf(d: Design): Map<ItemId, number> {
  const need = new Map<ItemId, number>();
  for (const pick of [d.base, d.ring, d.light, d.centre, ...d.trims]) {
    const [item, n] = PART[pick[0]].pay[pick[1]];
    need.set(item, (need.get(item) ?? 0) + n);
  }
  return need;
}

/** What is short, given how many of each thing the bag holds. */
export function shortOf(d: Design, have: (id: ItemId) => number): Array<{ id: ItemId; need: number; have: number }> {
  const out: Array<{ id: ItemId; need: number; have: number }> = [];
  for (const [id, need] of costOf(d)) if (have(id) < need) out.push({ id, need, have: have(id) });
  return out;
}

/** The first way to pay for a part that the bag can meet (taking what the rest of the design already takes), else 0. */
export function bestPay(partId: string, have: (id: ItemId) => number, taken: Map<ItemId, number> = new Map()): number {
  const part = PART[partId];
  const i = part.pay.findIndex(([id, n]) => have(id) - (taken.get(id) ?? 0) >= n);
  return i < 0 ? 0 : i;
}

/** The lines of work a krathong carries (its parts' families, each once). */
export const familiesOf = (d: Design): Family[] =>
  [...new Set([d.base, d.ring, d.light, d.centre, ...d.trims].map((pk) => PART[pk[0]].family))];

/** A name as it is kept: one line, trimmed, at most NAME_MAX characters (by code point). */
export function cleanName(s: string): string | null {
  const t = [...s.replace(/\s+/g, " ").trim()].slice(0, NAME_MAX).join("");
  return t.length ? t : null;
}

export function cleanWish(s: string): string {
  return [...s.replace(/\s+/g, " ").trim()].slice(0, WISH_MAX).join("");
}

/** The first design the builder opens on. */
export const START: Design = { base: ["b_leaf", 0], ring: ["r_leaf", 0], light: ["l_candle", 0], centre: ["c_flower", 0], trims: [] };

export interface Entry { id: number; votes: number; made: number }
export type AwardKind = "popular" | "judge";
export interface Award { entry: number; kind: AwardKind; place: number }

/**
 * The year's outstanding krathongs: the PLACES most-voted (standard competition ranking: equal popoto share a
 * place and the next place is skipped, so 1, 1, 3), only krathongs with at least one popoto; and the judge's pick,
 * which may also hold a popular place.
 */
export function awardsOf(entries: Entry[], judge: number | null): Award[] {
  const voted = entries.filter((e) => e.votes > 0).sort((a, b) => b.votes - a.votes || a.made - b.made || a.id - b.id);
  const out: Award[] = [];
  let place = 0;
  voted.forEach((e, i) => {
    if (i === 0 || e.votes !== voted[i - 1].votes) place = i + 1;
    if (place <= PLACES) out.push({ entry: e.id, kind: "popular", place });
  });
  if (judge != null && entries.some((e) => e.id === judge)) out.push({ entry: judge, kind: "judge", place: 1 });
  return out;
}

/**
 * The order a member sees the entries in while names are hidden: shuffled the same way every time for the same
 * member (so the list does not jump) and differently for each member (so nobody's krathong is always first).
 */
export function shuffledFor<T extends { id: number }>(list: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const key = (id: number) => {
    let x = (h ^ Math.imul(id, 2654435761)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 2246822507) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  };
  return [...list].sort((a, b) => key(a.id) - key(b.id) || a.id - b.id);
}

/** The catalog as the database keeps it: part → its slot and ways to pay. */
export function catalogJson(): Record<string, { slot: Slot; pay: Array<[string, number]> }> {
  return Object.fromEntries(PARTS.map((x) => [x.id, { slot: x.slot, pay: x.pay.map(([i, n]) => [i, n] as [string, number]) }]));
}
