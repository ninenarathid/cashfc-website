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
  // bases (2026-11-24, the owner: "ช่วยปรับให้วัตถุดิบหาง่ายขึ้น": nobody held any base, light or most ring material on the
  // morning of the contest, so every count came down and every part gained ways to pay with what members do hold or the
  // town's shop sells: banana leaf, flour, dough, oil, sugar, eggs, seaweed, shrimp and crickets are on its shelf.
  // New ways are put after the old ones, so a pick made before keeps its meaning.)
  p("b_wood", "base", "wood", "ฐานไม้แกะ", "Carved wood raft", [["splitPlank", 2], ["carvingBlank", 1], ["log", 2], ["timber", 2], ["oil", 2]]),
  p("b_leaf", "base", "forest", "ฐานใบไม้พับ", "Folded leaf tray", [["bananaLeaf", 2], ["fernTip", 3]]),
  p("b_bread", "base", "kitchen", "ฐานขนมปัง", "Bread raft", [["flour", 2], ["pineNutFlour", 2], ["dough", 2]]),
  // (2026-11-24, the owner: "อยากให้มีแบบกระทงมากกว่านี้ เน้นความหลากหลาย แต่วัตถุดิบไม่ยากเกินไป คนที่เพิ่งเข้ามาก็หาได้":
  // sixteen more parts, each payable with something the town's shop sells, so a newcomer with a few coins can have any)
  p("b_trunk", "base", "farm", "ฐานกาบกล้วย", "Banana-trunk slice", [["bananaLeaf", 2], ["log", 1]]),
  p("b_coconut", "base", "kitchen", "ฐานกะลามะพร้าว", "Coconut shell", [["dough", 2], ["oil", 1], ["egg", 2]]),
  p("b_lilypad", "base", "river", "ฐานใบบัว", "Lily pad", [["seaweed", 2], ["hyacinth", 2], ["bananaLeaf", 2]]),
  // rings
  p("r_leaf", "ring", "forest", "กลีบใบไม้พับ", "Folded leaf crown", [["bananaLeaf", 1], ["fernTip", 2]]),
  p("r_lotus", "ring", "farm", "กลีบบัว", "Lotus petals", [["fragrantPetal", 3], ["wildflower", 4], ["sugar", 2]]),
  p("r_marigold", "ring", "farm", "พวงดาวเรือง", "Marigold garland", [["marigold", 4], ["sugar", 3]]),
  p("r_rose", "ring", "farm", "กลีบกุหลาบ", "Rose petals", [["sugar", 2], ["wildflower", 3], ["fragrantPetal", 2]]),
  p("r_pandan", "ring", "forest", "ใบเตยสาน", "Woven pandan", [["bananaLeaf", 1], ["fernTip", 2], ["scallion", 2]]),
  p("r_shell", "ring", "fishing", "สร้อยเปลือกหอย", "Scallop shells", [["shrimpLive", 2], ["snail", 2], ["pearl", 1]]),
  // lights
  p("l_candle", "light", "insects", "เทียนขี้ผึ้ง", "Beeswax candle", [["beeswax", 1], ["oil", 1]]),
  p("l_firefly", "light", "insects", "โหลหิ่งห้อย", "Firefly jar", [["firefly", 2], ["dragonfly", 1], ["cricket", 2]]),
  p("l_lantern", "light", "smith", "โคมกระดาษ", "Paper lantern", [["oil", 1], ["shardCopper", 1]]),
  p("l_incense", "light", "forest", "เทียนกับธูป", "Candle and incense", [["oil", 1], ["beeswax", 1]]),
  // centrepieces, one a line
  p("c_flower", "centre", "farm", "ช่อดอกไม้", "Flower bouquet", [["marigold", 3], ["wildflower", 3], ["wildOrchid", 1], ["moonflower", 1], ["goldenDandelion", 1], ["sugar", 2]]),
  p("c_mushroom", "centre", "forest", "เห็ดกับเฟิร์น", "Mushrooms and fern", [["glowMushroom", 1], ["mushroomSpores", 2], ["shiitake", 2], ["toadstool", 2], ["salt", 3]]),
  p("c_shell", "centre", "fishing", "หอยกับไข่มุก", "Shell and pearl", [["snail", 2], ["pearl", 1], ["shrimpLive", 2]]),
  p("c_butterfly", "centre", "insects", "ผีเสื้อเกาะกิ่ง", "Butterfly on a twig", [["butterflyWhite", 1], ["monarch", 1], ["lunaMoth", 1], ["silkMoth", 1], ["silkCocoon", 1], ["dragonfly", 1], ["cricket", 3]]),
  p("c_crystal", "centre", "mining", "กลุ่มผลึก", "Crystal cluster", [["crystalLens", 1], ...GEMS.map((g): [ItemId, number] => [g, 1]), ["starShard", 1], ["shardCopper", 3], ["shardSilver", 2], ["chipAquamarine", 2], ["salt", 4]]),
  p("c_carving", "centre", "wood", "นกไม้แกะ", "Carved wooden bird", [["carvingBlank", 1], ["lure", 1], ["log", 2], ["heartwood", 1]]),
  p("c_sweets", "centre", "kitchen", "ผลไม้เชื่อม", "Candied fruit", [["sugar", 3], ["gardenHoney", 1], ["sweetGlaze", 1], ["candiedPumpkin", 1], ["wildApple", 2]]),
  p("c_feather", "centre", "animals", "พัดขนนก", "Feather fan", [["feather", 3], ["wool", 2], ["yarn", 1], ["egg", 2]]),
  p("c_bell", "centre", "smith", "กระดิ่งทองแดง", "Copper bell", [["copperBlank", 1], ["floatBell", 1], ["shardCopper", 2], ["copperNodule", 1]]),
  p("c_lily", "centre", "river", "บัวกับผักตบ", "Water lily", [["hyacinth", 3], ["lotusRootBed", 1], ["seaweed", 2]]),
  p("c_lotusbud", "centre", "farm", "ดอกบัวตูม", "Lotus bud", [["sugar", 2], ["wildflower", 2], ["fragrantPetal", 2]]),
  p("c_star", "centre", "mining", "ดาวทอง", "Golden star", [["shardCopper", 2], ["starShard", 1], ["salt", 2]]),
  p("c_koi", "centre", "fishing", "ปลาคาร์ปกระโดด", "Leaping koi", [["shrimpLive", 2], ["worm", 3]]),
  p("c_rabbit", "centre", "animals", "กระต่ายบนดวงจันทร์", "Moon rabbit", [["stickyRice", 2], ["egg", 2], ["wool", 1]]),
  // trims, the same ten families, smaller and cheaper
  p("t_flower", "trim", "farm", "ดอกไม้", "Flower", [["marigold", 1], ["wildflower", 1], ["fragrantPetal", 1], ["sugar", 1]]),
  p("t_mushroom", "trim", "forest", "เห็ด", "Mushroom", [["mushroomSpores", 1], ["glowMushroom", 1], ["shiitake", 1], ["toadstool", 1], ["salt", 1]]),
  p("t_shell", "trim", "fishing", "หอย", "Shell", [["snail", 1], ["pearl", 1], ["shrimpLive", 1]]),
  p("t_butterfly", "trim", "insects", "ผีเสื้อ", "Butterfly", [["butterflyWhite", 1], ["monarch", 1], ["dragonfly", 1], ["cricket", 2]]),
  p("t_crystal", "trim", "mining", "อัญมณี", "Gem", [["crystalLens", 1], ["chipAmber", 1], ...GEMS.map((g): [ItemId, number] => [g, 1]), ["shardCopper", 1], ["chipAquamarine", 1], ["stone", 2], ["salt", 2]]),
  p("t_carving", "trim", "wood", "ปลาไม้แกะ", "Carved fish", [["splitPlank", 1], ["carvingBlank", 1], ["log", 1], ["timber", 1], ["oil", 1]]),
  p("t_sweets", "trim", "kitchen", "ลูกอม", "Sweet", [["sugar", 1], ["gardenHoney", 1], ["sweetGlaze", 1], ["wildApple", 1]]),
  p("t_feather", "trim", "animals", "ขนนก", "Feather", [["feather", 1], ["wool", 1], ["egg", 1]]),
  p("t_bell", "trim", "smith", "กระดิ่งจิ๋ว", "Little bell", [["copperBlank", 1], ["shardCopper", 1], ["oil", 1]]),
  p("t_lily", "trim", "river", "ผักตบ", "Hyacinth", [["hyacinth", 1], ["seaweed", 1]]),
  p("t_star", "trim", "mining", "ดาวจิ๋ว", "Little star", [["salt", 1], ["shardCopper", 1], ["stone", 1]]),
  p("t_bow", "trim", "animals", "โบว์แดง", "Red bow", [["egg", 1], ["wool", 1], ["yarn", 1]]),
  p("t_lantern", "trim", "smith", "โคมจิ๋ว", "Little lantern", [["oil", 1], ["shardCopper", 1]]),
  p("t_moon", "trim", "river", "พระจันทร์เสี้ยว", "Crescent moon", [["sugar", 1], ["seaweed", 1]]),
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

/**
 * A part chosen, the choice of payment and its colour: [part id, index into its `pay`, index into COLORS (0, or left
 * out, its own colours)]. The colour costs nothing (the owner, 2026-11-24: "เอาให้เปลี่ยนสีได้ด้วย ในแต่ละส่วนประกอบ",
 * so that the makers compete in what they make of it, not in what they own).
 */
export type Pick = [string, number] | [string, number, number];

/**
 * The colours a part may be dyed (lib/town/krathong-art recolours the part's own pixels: its outline and, for a light,
 * its flame stay as drawn). The database keeps only the index and allows any below COLOR_SLOTS, so colours may be added
 * here later without a migration; an index with no colour here is drawn as the part's own.
 */
export interface KrathongColor { id: string; th: string; en: string; swatch: string; mode: "own" | "hue" | "white" | "dark"; h?: number; s?: number }
export const COLORS: readonly KrathongColor[] = [
  { id: "own", th: "สีเดิม", en: "Own", swatch: "", mode: "own" },
  { id: "red", th: "แดง", en: "Red", swatch: "#d9443a", mode: "hue", h: 2, s: 0.72 },
  { id: "orange", th: "ส้ม", en: "Orange", swatch: "#e8842c", mode: "hue", h: 26, s: 0.8 },
  { id: "gold", th: "ทอง", en: "Gold", swatch: "#e7b93a", mode: "hue", h: 44, s: 0.8 },
  { id: "green", th: "เขียว", en: "Green", swatch: "#4fa64a", mode: "hue", h: 112, s: 0.5 },
  { id: "teal", th: "ฟ้าเขียว", en: "Teal", swatch: "#2fa5a0", mode: "hue", h: 176, s: 0.55 },
  { id: "blue", th: "น้ำเงิน", en: "Blue", swatch: "#3f72d6", mode: "hue", h: 218, s: 0.62 },
  { id: "purple", th: "ม่วง", en: "Purple", swatch: "#8a55c9", mode: "hue", h: 272, s: 0.5 },
  { id: "pink", th: "ชมพู", en: "Pink", swatch: "#e46aa6", mode: "hue", h: 330, s: 0.66 },
  { id: "white", th: "ขาว", en: "White", swatch: "#eeeae0", mode: "white" },
  { id: "dark", th: "เข้ม", en: "Dark", swatch: "#3b3446", mode: "dark" },
];
export const COLOR_SLOTS = 16;
/** A pick's colour (0, its own, when it has none). */
export const colorOf = (p: Pick): number => (p.length === 3 ? p[2] : 0);

/**
 * A krathong said in a few characters for the room, to be drawn in its maker's hands (the owner, 2026-11-24: "พอประกอบ
 * เสร็จอยากให้ได้มาเป็นไอเทม เดินถือโชว์ได้"): each part and its colour, "b_leaf.3|r_rose.8|l_candle.0|c_rabbit.0|t_star.2".
 * lib/town/room keeps the same shape (KT_CODE) for what it lets through.
 */
export const KT_CODE = /^(?:[a-z_]{3,16}\.\d{1,2}(?:\|[a-z_]{3,16}\.\d{1,2}){3,6})?$/;
export function designCode(d: Design): string {
  return [d.base, d.ring, d.light, d.centre, ...d.trims].map((p) => `${p[0]}.${colorOf(p)}`).join("|");
}
/** A carried krathong as it is drawn (each part paid by its first way: the drawing does not show the payment), or null. */
export function designFromCode(code: string | undefined | null): Design | null {
  if (!code || !KT_CODE.test(code)) return null;
  const picks = code.split("|").map((x) => { const [id, c] = x.split("."); const n = Number(c); return (n ? [id, 0, n] : [id, 0]) as Pick; });
  const d: Design = { base: picks[0], ring: picks[1], light: picks[2], centre: picks[3], trims: picks.slice(4) };
  return check(d) ? null : d;
}
export interface Design { base: Pick; ring: Pick; light: Pick; centre: Pick; trims: Pick[] }

export type Refusal = "part" | "slot" | "pay" | "trims" | "name" | "wish" | "color";

/** The design as it must be: every part known, in its own place, with a real way to pay. */
export function check(d: Design): Refusal | null {
  const places: Array<[Pick, Slot]> = [[d.base, "base"], [d.ring, "ring"], [d.light, "light"], [d.centre, "centre"], ...d.trims.map((t): [Pick, Slot] => [t, "trim"])];
  if (!Array.isArray(d.trims) || d.trims.length > MAX_TRIMS) return "trims";
  for (const [pick, slot] of places) {
    if (!Array.isArray(pick) || (pick.length !== 2 && pick.length !== 3)) return "part";
    if (pick.length === 3 && (!Number.isInteger(pick[2]) || pick[2] < 0 || pick[2] >= COLOR_SLOTS)) return "color";
    const part = PART[pick[0]];
    if (!part) return "part";
    if (part.slot !== slot) return "slot";
    if (!Number.isInteger(pick[1]) || pick[1] < 0 || pick[1] >= part.pay.length) return "pay";
  }
  return null;
}

/** A design's picks in order: base, ring, light, centre, then the trims. */
export const picksOf = (d: Design): Pick[] => [d.base, d.ring, d.light, d.centre, ...d.trims];

/** What some picks take from the bag, summed (an unknown part or payment counts nothing). */
export function costOfPicks(picks: Pick[]): Map<ItemId, number> {
  const need = new Map<ItemId, number>();
  for (const pick of picks) {
    const pay = PART[pick[0]]?.pay[pick[1]];
    if (!pay) continue;
    need.set(pay[0], (need.get(pay[0]) ?? 0) + pay[1]);
  }
  return need;
}

/** What the design takes from the bag, summed over its parts. */
export const costOf = (d: Design): Map<ItemId, number> => costOfPicks(picksOf(d));

/** What is short, given how many of each thing the bag holds. */
export function shortOf(d: Design, have: (id: ItemId) => number): Array<{ id: ItemId; need: number; have: number }> {
  const out: Array<{ id: ItemId; need: number; have: number }> = [];
  for (const [id, need] of costOf(d)) if (have(id) < need) out.push({ id, need, have: have(id) });
  return out;
}

/** The first way to pay for a part that the bag can meet (taking what the rest of the design already takes), else 0. */
export function bestPay(partId: string, have: (id: ItemId) => number, taken: Map<ItemId, number> = new Map(), buyable?: (id: ItemId) => boolean, usable?: (id: ItemId) => boolean): number {
  const part = PART[partId];
  const i = part.pay.findIndex(([id, n]) => have(id) - (taken.get(id) ?? 0) >= n);
  if (i >= 0) return i;
  // (none the bag can meet: a way the town's shop sells, so what is shown is what can be had today; never a thing the
  // village has not opened yet, the owner, 2026-11-24: "อย่าเอาของที่ยังไม่ปลดมาเป็นวัตถุดิบซิ")
  const b = buyable ? part.pay.findIndex(([id]) => buyable(id) && (!usable || usable(id))) : -1;
  if (b >= 0) return b;
  const u = usable ? part.pay.findIndex(([id]) => usable(id)) : -1;
  return u < 0 ? 0 : u;
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
// (every part of the first design can be had from the town shop: banana leaves, oil, sugar; 2026-11-24)
export const START: Design = { base: ["b_leaf", 0], ring: ["r_leaf", 0], light: ["l_candle", 0], centre: ["c_sweets", 0], trims: [] };

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

// ── what the stall is told (v336's public.town_krathong and its siblings; the trial keeps the same shapes) ──

export interface KrathongView {
  id: number; name: string; design: Design; entered: boolean; made: number; floated: number | null;
  /** (v341) How many times it has been changed since it was made, and everything paid for it so far. */
  edits?: number; paid?: Record<string, number>;
}

/**
 * (v341) An entry may be changed whole, design, colours and name, EDITS_MAX times while entries are open (the owner, 2026-11-24: "ช่วยทำให้คนส่งประกวดกระทงสามารถแก้ไข design ได้สูงสุด 3 ครั้ง เปลี่ยนได้หมด ดีไซน์ ชื่อ สี หาของใหม่ เพิ่มจากที่เคยส่งไปแล้วก็พอ"):
 * paid for with only what goes beyond everything already paid for it.
 */
export const EDITS_MAX = 3;
export function extraCost(d: Design, paid: Record<string, number> | undefined): Array<[ItemId, number]> {
  return [...costOf(d)].map(([id, n]) => [id, n - (paid?.[id] ?? 0)] as [ItemId, number]).filter(([, n]) => n > 0);
}
export interface Maker { name: string | null; character: number | null }
export interface GalleryEntry extends KrathongView { mine: boolean; fc: boolean; votes?: number; maker?: Maker }
/** (`votes`: the popoto counts are an admin's only, v339; a member is told the places, not the counts) */
export interface AwardView { entry: number; kind: AwardKind; place: number; votes: number | null; title: Line; krathong: KrathongView; maker: Maker | null; fc: boolean }
export interface KrathongState {
  now: number;
  festival: import("./festivals").Festival;
  mine: (KrathongView & { wish: string | null }) | null;
  entries: GalleryEntry[];
  voted: number[];
  votesEach: number;
  floated: number;
  judged: boolean;
  /** Null until the results are settled. */
  awards: AwardView[] | null;
  capsule: Array<{ year: number; name: string; design: Design; wish: string }>;
}
export interface RiverKrathong {
  id: number; design: Design; floated: number; mine: boolean;
  /** Its name and its maker's (v339: a tap on the river says whose it is; the owner, 2026-11-24). */
  name?: string; maker?: string | null;
  /** Its maker's wish, for everybody (the owner, 2026-11-24: "คำอวยพร เห็นได้ทุกคน คนอื่นก็เห็น ชื่อคนทำ ชื่อกระทง เห็นหมด"). */
  wish?: string | null;
  /** Where its maker set it on the water (tiles; v339), or none (it then comes down the festival's river). */
  x?: number | null; y?: number | null;
}
/**
 * The lucky draw's list, for the admins (v339; Aqua's event of 2026-11-24: a verified member who made a krathong and
 * floated it may be drawn): whoever floated, when, FC or not, and whether before `until` (the festival's `draw_until`).
 */
export interface DrawRow {
  id: number; name: string; design: Design; entered: boolean; maker: { name: string | null; character: number | null };
  verified: boolean; fc: boolean; made: number; floated: number; inTime: boolean;
}
export interface DrawList { until: number | null; list: DrawRow[] }
export type KrathongWhy = "none" | "closed" | "made" | "name" | "design" | "short" | "own" | "spent" | "denied" | "away" | "edits";
export type KrathongDid<T = object> = ({ ok: true; repeated?: boolean } & T) | { ok: false; why: KrathongWhy; item?: string; need?: number };
