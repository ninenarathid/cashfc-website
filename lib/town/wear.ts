/**
 * What a player can wear (DOLL2.md in the fc-cash-town skill's scripts/pixel; the owner, 2026-10-17: "ลองสร้าง ชุดใหม่
 * หมวก เครื่องประดับ ที่ผู้เล่นใส่ได้ มาอย่างละ 5 ชิ้น ขอของ basic หาได้ง่ายๆในเกมก่อน"): everyday things of the town's
 * lines, a trial of how wearing things works in the game. Their pictures are the atlas's (`outfits`, `wear`), built
 * from prompts/doll2/items.json by build-pixel-atlas.mjs --doll2: an id here is its id there.
 *
 * A look writes each slot as an index into its list (lib/town/look), so only ever add at the end. The first of every
 * list but the outfits is nothing worn. Pure, and with nothing brought in.
 */
import type { Named } from "./look";

const NONE: Named = { id: "none", th: "ไม่ใส่", en: "None" };

/** Whole outfits: the starter, then one for each line. */
export const OUTFITS: Named[] = [
  { id: "starter", th: "ชุดเริ่มต้น", en: "Starter" },
  { id: "farmer", th: "ชุดชาวไร่", en: "Farmer" },
  { id: "fisher", th: "ชุดชาวประมง", en: "Fisher" },
  { id: "cook", th: "ชุดพ่อครัว", en: "Cook" },
  { id: "forest", th: "ชุดนักสำรวจป่า", en: "Forest explorer" },
  { id: "mountain", th: "ชุดคนงานภูเขา", en: "Mountain worker" },
];

export const HATS: Named[] = [
  NONE,
  { id: "straw", th: "หมวกฟาง", en: "Straw hat" },
  { id: "bucket", th: "หมวกบักเก็ต", en: "Bucket hat" },
  { id: "chef", th: "หมวกเชฟ", en: "Chef's hat" },
  { id: "beanie", th: "หมวกไหมพรม", en: "Beanie" },
  { id: "hardhat", th: "หมวกนิรภัย", en: "Hard hat" },
];

/** Worn on the face, over the eyes. */
export const FACE_WEAR: Named[] = [
  NONE,
  { id: "glasses", th: "แว่นกลม", en: "Round glasses" },
  { id: "sunglasses", th: "แว่นกันแดด", en: "Sunglasses" },
];

/** Worn at the neck. */
export const NECK_WEAR: Named[] = [
  NONE,
  { id: "kerchief", th: "ผ้าพันคอ", en: "Neckerchief" },
  { id: "shells", th: "สร้อยเปลือกหอย", en: "Shell necklace" },
];

/** Worn in the hair. */
export const HAIR_WEAR: Named[] = [
  NONE,
  { id: "flower", th: "กิ๊บดอกไม้", en: "Flower clip" },
];

/** The id worn in a slot, or null for nothing (or an index this page does not know). */
export const wornId = (list: Named[], i: number | undefined): string | null => {
  const id = list[i ?? 0]?.id;
  return id && id !== "none" ? id : null;
};
