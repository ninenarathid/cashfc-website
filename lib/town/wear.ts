/**
 * What a player can wear (DOLL2.md in the fc-cash-town skill's scripts/pixel; the owner, 2026-10-17: "ลองสร้าง ชุดใหม่
 * หมวก เครื่องประดับ ที่ผู้เล่นใส่ได้ มาอย่างละ 5 ชิ้น ขอของ basic หาได้ง่ายๆในเกมก่อน"): everyday things of the town's
 * lines, a trial of how wearing things works in the game. Their pictures are the atlas's (`outfits`, `wear`), built
 * from prompts/doll2/items.json by build-pixel-atlas.mjs --doll2: an id here is its id there.
 *
 * **Everything is had from the game** (the owner, 2026-10-17: "ขอแต่งกายได้มาจากในเกมทั้งหมด ชุดอาชีพหาได้จาก rank 3 ในเกม
 * ให้มาพร้อม เครื่องราง"): a line's outfit comes at its rank 3, with that rank's gift, and so does its hat; every line has
 * something of its own at rank 3. `from`: the lines (any one of them) and the rank that give it; the starter and
 * nothing worn are everybody's. Which line gives which accessory is Claude's proposal, not yet answered.
 *
 * A look writes each slot as an index into its list (lib/town/look), so only ever add at the end. The first of every
 * list but the outfits is nothing worn. Pure.
 */
import type { Named } from "./look";
import { rankOf, type LineId } from "./lines";

/** What gives a wearable thing: a rank on any of these lines. */
export type Source = { lines: LineId[]; rank: number };
export type Wearable = Named & { from?: Source };

const NONE: Wearable = { id: "none", th: "ไม่ใส่", en: "None" };
const at = (rank: number, ...lines: LineId[]): Source => ({ lines, rank });

/** Whole outfits: the starter, then one for each line. */
export const OUTFITS: Wearable[] = [
  { id: "starter", th: "ชุดเริ่มต้น", en: "Starter" },
  { id: "farmer", th: "ชุดชาวไร่", en: "Farmer", from: at(3, "farming") },
  { id: "fisher", th: "ชุดชาวประมง", en: "Fisher", from: at(3, "fishing") },
  { id: "cook", th: "ชุดพ่อครัว", en: "Cook", from: at(3, "kitchen") },
  { id: "forest", th: "ชุดนักสำรวจป่า", en: "Forest explorer", from: at(3, "forest") },
  { id: "mountain", th: "ชุดคนงานภูเขา", en: "Mountain worker", from: at(3, "mining", "felling") },
];

export const HATS: Wearable[] = [
  NONE,
  { id: "straw", th: "หมวกฟาง", en: "Straw hat", from: at(3, "farming") },
  { id: "bucket", th: "หมวกบักเก็ต", en: "Bucket hat", from: at(3, "fishing") },
  { id: "chef", th: "หมวกเชฟ", en: "Chef's hat", from: at(3, "kitchen") },
  { id: "beanie", th: "หมวกไหมพรม", en: "Beanie", from: at(3, "forest") },
  { id: "hardhat", th: "หมวกนิรภัย", en: "Hard hat", from: at(3, "mining") },
];

/** Worn on the face, over the eyes. */
export const FACE_WEAR: Wearable[] = [
  NONE,
  { id: "glasses", th: "แว่นกลม", en: "Round glasses", from: at(3, "insects") },
  { id: "sunglasses", th: "แว่นกันแดด", en: "Sunglasses", from: at(3, "well") },
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
  { id: "flower", th: "กิ๊บดอกไม้", en: "Flower clip", from: at(3, "helpers") },
];

/** Whether somebody with these points on their lines has a thing to wear. */
export const owns = (item: Wearable | undefined, points: Partial<Record<LineId, number>>): boolean =>
  !!item && (!item.from || item.from.lines.some((line) => rankOf(line, points[line] ?? 0) >= item.from!.rank));

/** A look with whatever of it is not had taken off (to the starter, or to nothing worn), or the same look if all is had. */
export function onlyOwned<L extends { outfit?: number; hat?: number; faceWear?: number; neck?: number; hairWear?: number }>(look: L, points: Partial<Record<LineId, number>>): L {
  const slots: Array<[keyof L & string, Wearable[]]> = [["outfit", OUTFITS], ["hat", HATS], ["faceWear", FACE_WEAR], ["neck", NECK_WEAR], ["hairWear", HAIR_WEAR]];
  let out = look;
  for (const [k, list] of slots) { const i = look[k] as number | undefined; if (i && !owns(list[i], points)) out = { ...out, [k]: 0 }; }
  return out;
}

/** The id worn in a slot, or null for nothing (or an index this page does not know). */
export const wornId = (list: readonly Named[], i: number | undefined): string | null => {
  const id = list[i ?? 0]?.id;
  return id && id !== "none" ? id : null;
};
