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
 * A look writes each slot as an index into its list (lib/town/look), so only ever add at the end. The first of every
 * list but the outfits is nothing worn. Pure.
 */
import type { Named } from "./look";
import type { ItemId } from "./items";
import { rankOf, type LineId } from "./lines";
import { no, type Done, type Purse } from "./trade";

/** What gives a wearable thing: a rank on any of these lines, the uncle's shop, the bat merchant, or a chance with a line's points. */
export type Source =
  | { lines: LineId[]; rank: number }
  | { shop: "uncle" }
  | { merchant: "bat" }
  | { drop: LineId; chance: number };
export type Wearable = Named & { from?: Source };

const NONE: Wearable = { id: "none", th: "ไม่ใส่", en: "None" };
const at = (rank: number, ...lines: LineId[]): Source => ({ lines, rank });
const isRank = (s: Source): s is { lines: LineId[]; rank: number } => "lines" in s;

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
];

/** Worn on the face, over the eyes. */
export const FACE_WEAR: Wearable[] = [
  NONE,
  { id: "glasses", th: "แว่นกลม", en: "Round glasses", from: { shop: "uncle" } },
  { id: "sunglasses", th: "แว่นกันแดด", en: "Sunglasses", from: { merchant: "bat" } },
];

/** Worn at the neck. */
export const NECK_WEAR: Wearable[] = [
  NONE,
  { id: "kerchief", th: "ผ้าพันคอ", en: "Bandana", from: at(3, "felling") },
  { id: "shells", th: "สร้อยเปลือกหอย", en: "Shell necklace", from: at(2, "fishing") },
];

/** Worn in the hair. */
export const HAIR_WEAR: Wearable[] = [
  NONE,
  { id: "flower", th: "กิ๊บดอกไม้", en: "Flower clip", from: { drop: "helpers", chance: 0.001 } },
];

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
export const DRESS_ITEMS: Partial<Record<ItemId, string>> = { wearGlasses: "glasses" };

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
