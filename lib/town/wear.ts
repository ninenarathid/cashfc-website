/**
 * What a player can wear (DOLL2.md in the fc-cash-town skill's scripts/pixel; the owner, 2026-10-17: "ลองสร้าง ชุดใหม่
 * หมวก เครื่องประดับ ที่ผู้เล่นใส่ได้ มาอย่างละ 5 ชิ้น ขอของ basic หาได้ง่ายๆในเกมก่อน"): everyday things of the town's
 * lines, a trial of how wearing things works in the game. Their pictures are the atlas's (`outfits`, `wear`), built
 * from prompts/doll2/items.json by build-pixel-atlas.mjs --doll2: an id here is its id there.
 *
 * **Everything is had from the game** (the owner, 2026-10-17: "ขอแต่งกายได้มาจากในเกมทั้งหมด ชุดอาชีพหาได้จาก rank 3 ในเกม
 * ให้มาพร้อม เครื่องราง"): a line's outfit comes at its rank 3, with that rank's gift, and so does its hat. The rest, on
 * his word the same day: round glasses from the uncle's shop, sunglasses from the bat merchant (not built yet), the
 * flower clip a 0.1% chance with each helpers' point. `from`: where it comes from; the starter and nothing worn are
 * everybody's. What is bought or dropped is had once the database says so (not built yet: only the TEST switch has it).
 *
 * Forty-six more (v277; the owner, 2026-10-17: "ทำ 46 ชิ้นก่อน", of the list both AIs made): made at the workbench
 * (lib/town/wear-items), four more on the uncle's shelf, the sixth ranks of five lines, and chances with a line's
 * points narrowed by the deed, the thing, the hour or the rain (`Drop`). The rarest are before dawn (lib/town/bands,
 * the owner's rule of 2026-10-15): the mushroom cap and the beetle at 03–05, the sailor's stripes at 05–07. Everybody who
 * helped build the bridge has the builder's things already (v277 gives them from the deeds); the chances and the
 * prices are mine, not answered.
 *
 * A look writes each slot as an index into its list (lib/town/look), so only ever add at the end. The first of every
 * list but the outfits is nothing worn. Pure.
 */
import type { Named } from "./look";
import type { ItemId } from "./items";
import { rankOf, type LineId } from "./lines";
import { no, type Done, type Purse } from "./trade";
import { WEAR_BAG } from "./wear-items";

/** What gives a wearable thing: a rank on any of these lines, the uncle's shop, the bat merchant, the workbench, or a chance. */
export type Source =
  | { lines: LineId[]; rank: number }
  | { shop: "uncle" }
  | { merchant: "bat" }
  | { craft: true }
  | Drop;
/**
 * A chance at every count of a line's points that gives points (town.work_counted), narrowed by the deed (`what`, the
 * deed's own word, as lib/town/line-points reads it), the thing it was of, the Bangkok hour (`hours`, from and to), the
 * rain; `knob`: a knob of town_knobs that says the chance in ten-thousandths instead; `how`: what the wardrobe says of it.
 */
export interface Drop { drop: LineId; chance: number; what?: readonly string[]; things?: readonly string[]; hours?: readonly [number, number]; rain?: true; knob?: string; how?: { th: string; en: string } }
/** `top`: a hair thing worn on top of the head (ears, horns, a tiara, a crown, a big bow), which a hat would sit on. */
export type Wearable = Named & { from?: Source; top?: true };

const NONE: Wearable = { id: "none", th: "ไม่ใส่", en: "None" };
const at = (rank: number, ...lines: LineId[]): Source => ({ lines, rank });
const isRank = (s: Source): s is { lines: LineId[]; rank: number } => "lines" in s;
const CRAFT: Source = { craft: true }, UNCLE: Source = { shop: "uncle" };
const drop = (line: LineId, chance: number, more: Omit<Drop, "drop" | "chance"> = {}): Drop => ({ drop: line, chance, ...more });
const LAMPS = ["lamp_light", "lamp_hand"], STONES = ["stone_lay", "stone_hand"];
const LAMP_HOW = { th: "จุดตะเกียงด้วยกัน", en: "Lighting the lamps" }, BRIDGE_HOW = { th: "ช่วยสร้างสะพาน", en: "Building the bridge" };

/** Whole outfits: the starter, then one for each line. */
export const OUTFITS: Wearable[] = [
  { id: "starter", th: "ชุดเริ่มต้น", en: "Starter" },
  { id: "farmer", th: "ชุดชาวไร่", en: "Farmer", from: at(3, "farming") },
  { id: "fisher", th: "ชุดชาวประมง", en: "Fisher", from: at(3, "fishing") },
  { id: "cook", th: "ชุดพ่อครัว", en: "Cook", from: at(3, "kitchen") },
  { id: "forest", th: "ชุดนักสำรวจป่า", en: "Forest explorer", from: at(3, "forest") },
  { id: "mountain", th: "ชุดคนงานภูเขา", en: "Mountain worker", from: at(3, "mining", "felling") },
  { id: "insects", th: "ชุดนักจับแมลง", en: "Insect catcher", from: at(3, "insects") },
  { id: "well", th: "ชุดคนหาบน้ำ", en: "Water carrier", from: at(3, "well") },
  { id: "helpers", th: "ชุดผู้ช่วยเหลือ", en: "Helper", from: at(3, "helpers") },
  // (v277)
  { id: "smith", th: "ชุดช่างตีเหล็ก", en: "Smith", from: CRAFT },
  { id: "sailor", th: "ชุดกะลาสี", en: "Sailor", from: drop("fishing", 0.01, { hours: [5, 7] }) },
  { id: "lamplighter", th: "ชุดคนจุดตะเกียง", en: "Lamplighter", from: drop("helpers", 0.02, { what: LAMPS, how: LAMP_HOW }) },
  { id: "builder", th: "ชุดช่างสร้างสะพาน", en: "Bridge builder", from: drop("helpers", 0.02, { what: STONES, how: BRIDGE_HOW }) },
  { id: "raincoat", th: "เสื้อกันฝน", en: "Rain jacket", from: drop("forest", 0.01, { what: ["gather"], rain: true }) },
  { id: "tea", th: "ชุดเก็บใบชา", en: "Tea picker", from: at(6, "farming") },
  { id: "caver", th: "ชุดนักสำรวจถ้ำ", en: "Caver", from: at(6, "mining") },
  { id: "waiter", th: "ชุดบริกร", en: "Waiter", from: drop("kitchen", 0.01, { what: ["ladle"], how: { th: "มีคนตักจากหม้อเรา", en: "Others eating from my pot" } }) },
  { id: "weaver", th: "ชุดเสื้อกั๊กทอลาย", en: "Woven waistcoat", from: CRAFT },
];

export const HATS: Wearable[] = [
  NONE,
  { id: "straw", th: "หมวกฟาง", en: "Straw hat", from: at(3, "farming") },
  { id: "bucket", th: "หมวกบักเก็ต", en: "Bucket hat", from: at(3, "fishing") },
  { id: "chef", th: "หมวกเชฟ", en: "Chef's hat", from: at(3, "kitchen") },
  { id: "beanie", th: "หมวกไหมพรม", en: "Beanie", from: at(3, "forest") },
  { id: "hardhat", th: "หมวกนิรภัย", en: "Hard hat", from: at(3, "mining") },
  { id: "pith", th: "หมวกสำรวจ", en: "Pith helmet", from: at(3, "insects") },
  { id: "conical", th: "หมวกงอบ", en: "Conical hat", from: at(3, "well") },
  { id: "cap", th: "หมวกแก๊ปส้ม", en: "Orange cap", from: at(3, "helpers") },
  // (v277)
  { id: "witch", th: "หมวกแม่มด", en: "Witch's hat", from: CRAFT },
  { id: "sailorcap", th: "หมวกกะลาสี", en: "Sailor's cap", from: at(6, "fishing") },
  { id: "beret", th: "หมวกเบเรต์", en: "Beret", from: CRAFT },
  { id: "lampcap", th: "หมวกคนจุดตะเกียง", en: "Lamplighter's cap", from: drop("helpers", 0.02, { what: LAMPS, how: LAMP_HOW }) },
  { id: "mushroom", th: "หมวกเห็ด", en: "Mushroom cap", from: drop("forest", 0.01, { what: ["gather"], hours: [3, 5] }) },
  { id: "beekeeper", th: "หมวกคนเลี้ยงผึ้ง", en: "Beekeeper's hat", from: at(6, "helpers") },
  { id: "traveller", th: "หมวกนักเดินทาง", en: "Traveller's hat", from: CRAFT },
  { id: "pumpkin", th: "หมวกฟักทอง", en: "Pumpkin hat", from: CRAFT },
];

/** Worn on the face, over the eyes. */
export const FACE_WEAR: Wearable[] = [
  NONE,
  { id: "glasses", th: "แว่นกลม", en: "Round glasses", from: { shop: "uncle" } },
  { id: "sunglasses", th: "แว่นกันแดด", en: "Sunglasses", from: { merchant: "bat" } },
  // (v277)
  { id: "goggles", th: "แว่นว่ายน้ำ", en: "Swimming goggles", from: drop("fishing", 0.005) },
  { id: "smithgoggles", th: "แว่นช่างตีเหล็ก", en: "Smith's goggles", from: CRAFT },
  { id: "monocle", th: "แว่นตาข้างเดียว", en: "Monocle", from: UNCLE },
  { id: "square", th: "แว่นกรอบเหลี่ยม", en: "Square glasses", from: UNCLE },
  { id: "copper", th: "แว่นกรอบทองแดง", en: "Copper spectacles", from: CRAFT },
  { id: "crystal", th: "แว่นกรอบคริสตัล", en: "Crystal glasses", from: CRAFT },
  { id: "amber", th: "แว่นกรอบกระ", en: "Tortoiseshell glasses", from: CRAFT },
  { id: "hexagon", th: "แว่นหกเหลี่ยม", en: "Hexagonal glasses", from: CRAFT },
];

/** Worn at the neck. */
export const NECK_WEAR: Wearable[] = [
  NONE,
  { id: "kerchief", th: "ผ้าพันคอ", en: "Bandana", from: at(3, "felling") },
  { id: "shells", th: "สร้อยเปลือกหอย", en: "Shell necklace", from: at(2, "fishing") },
  // (v277)
  { id: "scarf", th: "ผ้าพันคอไหมพรม", en: "Knitted scarf", from: CRAFT },
  { id: "crystalpendant", th: "จี้คริสตัล", en: "Crystal pendant", from: drop("mining", 0.01, { what: ["crystal", "vein"] }) },
  { id: "bowtie", th: "โบว์ไท", en: "Bow tie", from: at(6, "kitchen") },
  { id: "lei", th: "พวงมาลัยดอกไม้", en: "Flower garland", from: CRAFT },
  { id: "medal", th: "เหรียญช่างสะพาน", en: "Bridge medal", from: drop("helpers", 0.02, { what: STONES, how: BRIDGE_HOW }) },
  { id: "bell", th: "โชคเกอร์กระดิ่ง", en: "Bell choker", from: at(6, "helpers") },
  { id: "beads", th: "สร้อยลูกปัดไม้", en: "Wooden beads", from: CRAFT },
  { id: "necktie", th: "เนกไท", en: "Necktie", from: UNCLE },
  { id: "beetle", th: "จี้ด้วงอัญมณี", en: "Jewel beetle pendant", from: drop("insects", 0.01, { what: ["net"], hours: [3, 5] }) },
  { id: "starpendant", th: "จี้ดาว", en: "Star pendant", from: drop("helpers", 0.03, { what: LAMPS, hours: [19, 23], how: LAMP_HOW }) },
];

/** Worn in the hair. */
export const HAIR_WEAR: Wearable[] = [
  NONE,
  { id: "flower", th: "กิ๊บดอกไม้", en: "Flower clip", from: drop("helpers", 0.001, { knob: "wear_flower_in_ten_thousand" }) },
  // (v277)
  { id: "ribbon", th: "โบผมใหญ่", en: "Big ribbon", from: UNCLE, top: true },
  { id: "leaf", th: "กิ๊บใบไม้", en: "Leaf clip", from: drop("forest", 0.005, { what: ["gather"] }) },
  { id: "tassel", th: "ปิ่นพู่ไหม", en: "Tassel hairpin", from: CRAFT },
  { id: "catears", th: "หูแมว", en: "Cat ears", from: CRAFT, top: true },
  { id: "bunnyears", th: "หูกระต่าย", en: "Rabbit ears", from: CRAFT, top: true },
  { id: "starclip", th: "กิ๊บดาว", en: "Star clip", from: drop("insects", 0.01, { what: ["net"], hours: [19, 23] }) },
  { id: "butterfly", th: "กิ๊บผีเสื้อ", en: "Butterfly clip", from: drop("insects", 0.02, { what: ["net"], things: ["butterflyWhite", "monarch", "morpho"], how: { th: "จับผีเสื้อ", en: "Catching a butterfly" } }) },
  { id: "featherpin", th: "ขนนกเหน็บผม", en: "Feather pin", from: drop("felling", 0.002, { what: ["fell"] }) },
  { id: "horns", th: "เขาปีศาจ", en: "Little horns", from: CRAFT, top: true },
  { id: "tiara", th: "มงกุฎเงินจิ๋ว", en: "Tiny tiara", from: CRAFT, top: true },
  { id: "crown", th: "มงกุฎดอกไม้", en: "Flower crown", from: CRAFT, top: true },
];

/** Whether a look's hair thing is worn on top of the head (where a hat goes). */
export const onTop = (hairWear: number | undefined): boolean => !!HAIR_WEAR[hairWear ?? 0]?.top;
/**
 * A change to a look in the wardrobe, with a hat and a thing on top of the head taking turns (one in place of the
 * other: a hat over cat ears or a tiara would squash them); a clip at the side stays with a hat.
 */
export function together<L extends { hat?: number; hairWear?: number }>(look: L, change: Partial<L>): Partial<L> {
  if (change.hat && onTop(look.hairWear)) return { ...change, hairWear: 0 };
  if (change.hairWear !== undefined && onTop(change.hairWear) && look.hat) return { ...change, hat: 0 };
  return change;
}

/** Whether a Bangkok hour is inside a drop's hours (from up to, but not, to). */
const inHours = (hour: number, [from, to]: readonly [number, number]) => (from <= to ? hour >= from && hour < to : hour >= from || hour < to);
const isDrop = (s: Source | undefined): s is Drop => !!s && "drop" in s;
const allWear = (): Wearable[] => [...OUTFITS, ...HATS, ...FACE_WEAR, ...NECK_WEAR, ...HAIR_WEAR];

/**
 * The things to wear a count of a line's points may drop (as town.work_counted rolls them): every drop of its line the
 * deed, its thing, the hour and the rain agree with, each rolled on its own; a count with no points drops nothing.
 * `roll` gives a number in [0, 1), `knobs` a knob's value where a drop names one.
 */
export function dropsFor(done: { what: string; thing?: string | null }, count: { line: LineId; raw: number }, hour: number, raining: boolean,
  roll: () => number, knobs: Readonly<Record<string, number>> = {}): string[] {
  if (!(count.raw > 0)) return [];
  return allWear().flatMap((w) => {
    const d = w.from;
    if (!isDrop(d) || d.drop !== count.line) return [];
    if (d.what && !d.what.includes(done.what)) return [];
    if (d.things && !d.things.includes(done.thing ?? "")) return [];
    if (d.hours && !inHours(hour, d.hours)) return [];
    if (d.rain && !raining) return [];
    const inTen = d.knob && typeof knobs[d.knob] === "number" ? knobs[d.knob] : Math.round(d.chance * 10000);
    return roll() * 10000 < inTen ? [w.id] : [];
  });
}

/** The catalog's row `wear_drops` (v277): every drop as town.work_counted reads it, the chance in ten-thousandths. */
export const wearDropsRow = () => allWear().flatMap((w) => {
  const d = w.from;
  if (!isDrop(d)) return [];
  return [{ wear: w.id, line: d.drop, in: Math.round(d.chance * 10000), ...(d.what ? { what: [...d.what] } : {}), ...(d.things ? { things: [...d.things] } : {}),
    ...(d.hours ? { from: d.hours[0], to: d.hours[1] } : {}), ...(d.rain ? { rain: true } : {}), ...(d.knob ? { knob: d.knob } : {}) }];
});

/**
 * Whether somebody has a thing to wear: by the points on their lines for what a rank gives, by `had` (the ids the
 * database says they have bought or found: not built yet, so empty) for the rest.
 */
export const owns = (item: Wearable | undefined, points: Partial<Record<LineId, number>>, had: ReadonlySet<string> = new Set()): boolean => {
  if (!item) return false;
  const from = item.from;
  if (!from) return true;
  return isRank(from) ? from.lines.some((line) => rankOf(line, points[line] ?? 0) >= from.rank) : had.has(item.id);
};

/** What a rank of a line gives to wear (the lines' page lists it: the owner, 2026-10-17, "เพิ่มข้อมูลของ ของแต่งตัวที่จะได้ ในหน้า อาชีพ ด้วย"). */
export const wearAt = (line: LineId, rank: number): Wearable[] =>
  [OUTFITS, HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR].flatMap((list) => list.filter((w) => !!w.from && isRank(w.from) && w.from.rank === rank && w.from.lines.includes(line)));

/** A look with whatever of it is not had taken off (to the starter, or to nothing worn), or the same look if all is had. */
export function onlyOwned<L extends { outfit?: number; hat?: number; faceWear?: number; neck?: number; hairWear?: number }>(look: L, points: Partial<Record<LineId, number>>, had: ReadonlySet<string> = new Set()): L {
  const slots: Array<[keyof L & string, Wearable[]]> = [["outfit", OUTFITS], ["hat", HATS], ["faceWear", FACE_WEAR], ["neck", NECK_WEAR], ["hairWear", HAIR_WEAR]];
  let out = look;
  for (const [k, list] of slots) { const i = look[k] as number | undefined; if (i && !owns(list[i], points, had)) out = { ...out, [k]: 0 }; }
  return out;
}

/**
 * (dev only) The TEST panel's switch that has every wearable thing had, on this browser alone (the owner, 2026-10-17:
 * "เพิ่มปุ่มใน TEST สำหรับ unlock ทุกของตกแต่งสำหรับlocal"). Never in a production build; it changes nobody's lines.
 */
export const WEAR_ALL_KEY = "cashTown:wearAll";
export const WEAR_ALL_EVENT = "cashTown:wearAll";
export function wearAllHere(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try { return localStorage.getItem(WEAR_ALL_KEY) === "1"; } catch { return false; }
}
export function setWearAllHere(on: boolean) {
  try { if (on) localStorage.setItem(WEAR_ALL_KEY, "1"); else localStorage.removeItem(WEAR_ALL_KEY); } catch { /* private window: the switch stays as it was */ }
  window.dispatchEvent(new Event(WEAR_ALL_EVENT));
}

/** (v276) The things of the bag that are worn into the wardrobe, and what each gives to wear (the catalog's row `dress`). */
export const DRESS_ITEMS: Partial<Record<ItemId, string>> = { wearGlasses: "glasses", ...WEAR_BAG };

/**
 * Wearing a thing of the bag (as the database's town.dress): the slot's thing, if it is one to wear and not had yet,
 * used up, and what it gives to wear had for good.
 */
export function dressFrom(purse: Purse, slot: number, had: readonly string[]): Done<{ purse: Purse; wearable: string; item: ItemId }> {
  const s = slot >= 0 ? purse.bag[slot] : null, w = s ? DRESS_ITEMS[s.item] : undefined;
  if (!s || !w) return no("none");
  if (had.includes(w)) return no("known");
  return { ok: true, wearable: w, item: s.item, purse: { ...purse, bag: purse.bag.map((b, i) => (i !== slot ? b : s.n <= 1 ? null : { ...s, n: s.n - 1 })) } };
}

/** The id worn in a slot, or null for nothing (or an index this page does not know). */
export const wornId = (list: readonly Named[], i: number | undefined): string | null => {
  const id = list[i ?? 0]?.id;
  return id && id !== "none" ? id : null;
};
