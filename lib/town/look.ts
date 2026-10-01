/**
 * What a Cash Town avatar looks like: a Lalafell paper doll, chosen in the
 * wardrobe and drawn by lib/town/doll.
 *
 * Every choice is an index into a fixed list, so a look travels as eleven
 * characters ("1" and one base-36 digit per field) inside the moves the room
 * already sends, and a look from another browser can be checked field by field
 * before anything is drawn from it. Colours come from curated palettes rather
 * than a picker: each is kept in a lightness band where the art's shading
 * survives the recolour (the dressing room's lists, 2026-10-01).
 *
 * Pure, so it can be tested without a browser.
 */

export type Named = { id: string; th: string; en: string };
export type Swatch = { hex: string; th: string; en: string };

export const GENDERS: Named[] = [
  { id: "f", th: "หญิง", en: "Female" },
  { id: "m", th: "ชาย", en: "Male" },
];

export const HAIRS: Named[] = [
  { id: "twin", th: "แฝดผูกโบว์", en: "Twin tails" },
  { id: "spiky", th: "สั้นชี้ฟู", en: "Short and spiky" },
  { id: "bald", th: "ไม่มีผม", en: "Bald" },
];

export const EYES: Named[] = [
  { id: "sparkle", th: "ตาโตวิ้ง", en: "Sparkly" },
  { id: "round", th: "ตากลม", en: "Round" },
  { id: "sharp", th: "ตาคม", en: "Sharp" },
  { id: "sleepy", th: "ตาง่วง", en: "Sleepy" },
  { id: "cat", th: "ตาแมว", en: "Cat" },
  { id: "determined", th: "มุ่งมั่น", en: "Determined" },
  { id: "happy", th: "ยิ้มหยี", en: "Smiling" },
  { id: "closed", th: "หลับตา", en: "Closed" },
  { id: "wink", th: "ขยิบตา", en: "Wink" },
  { id: "surprised", th: "ตกใจ", en: "Surprised" },
  { id: "teary", th: "น้ำตาคลอ", en: "Teary" },
];

export const BROWS: Named[] = [
  { id: "none", th: "ซ่อนใต้ผม", en: "Hidden" },
  { id: "soft", th: "บาง", en: "Soft" },
  { id: "thick", th: "หนา", en: "Thick" },
  { id: "angry", th: "โกรธ", en: "Cross" },
  { id: "worried", th: "กังวล", en: "Worried" },
];

export const MOUTHS: Named[] = [
  { id: "smile", th: "ยิ้ม", en: "Smile" },
  { id: "happy", th: "ยิ้มกว้าง", en: "Big smile" },
  { id: "grin", th: "ยิ้มเขี้ยว", en: "Fang grin" },
  { id: "flat", th: "เฉยๆ", en: "Flat" },
  { id: "o", th: "อ้าปาก", en: "Open" },
  { id: "pout", th: "ปากจู๋", en: "Pout" },
  { id: "frown", th: "เศร้า", en: "Sad" },
  { id: "laugh", th: "หัวเราะ", en: "Laugh" },
];

export const HAIR_COLORS: Swatch[] = [
  { hex: "#1f1c24", th: "ดำ", en: "Black" },
  { hex: "#3a2b28", th: "น้ำตาลเข้ม", en: "Dark brown" },
  { hex: "#5a3a2a", th: "ช็อกโกแลต", en: "Chocolate" },
  { hex: "#7a4a2e", th: "เกาลัด", en: "Chestnut" },
  { hex: "#a8572f", th: "ทองแดง", en: "Copper" },
  { hex: "#c97a3d", th: "ส้มอิฐ", en: "Ginger" },
  { hex: "#d9a05b", th: "คาราเมล", en: "Caramel" },
  { hex: "#e8c071", th: "บลอนด์ทอง", en: "Golden blonde" },
  { hex: "#f2dca0", th: "บลอนด์อ่อน", en: "Light blonde" },
  { hex: "#f5ecd7", th: "บลอนด์ขาว", en: "Platinum" },
  { hex: "#9e2b34", th: "แดงไวน์", en: "Wine red" },
  { hex: "#c8434e", th: "แดงทับทิม", en: "Ruby" },
  { hex: "#e07a8b", th: "ชมพูกุหลาบ", en: "Rose" },
  { hex: "#f3a6c4", th: "ชมพูซากุระ", en: "Sakura pink" },
  { hex: "#5b3f8c", th: "ม่วงเข้ม", en: "Deep purple" },
  { hex: "#8a6ad0", th: "ลาเวนเดอร์", en: "Lavender" },
  { hex: "#c3a6e8", th: "ม่วงพาสเทล", en: "Pastel purple" },
  { hex: "#2f4a7a", th: "น้ำเงินเข้ม", en: "Navy" },
  { hex: "#4f7fc4", th: "ฟ้าคราม", en: "Cornflower" },
  { hex: "#8fb0e0", th: "ฟ้าพาสเทล", en: "Pastel blue" },
  { hex: "#2f6b5a", th: "เขียวป่า", en: "Forest" },
  { hex: "#4fa88a", th: "เขียวหยก", en: "Jade" },
  { hex: "#8fd1b6", th: "มิ้นต์", en: "Mint" },
  { hex: "#6e6a75", th: "เทาควัน", en: "Smoke" },
  { hex: "#b9b6c3", th: "เงิน", en: "Silver" },
  { hex: "#e8e6ef", th: "ขาวหิมะ", en: "Snow" },
];

export const EYE_COLORS: Swatch[] = [
  { hex: "#2f5fb3", th: "น้ำเงิน", en: "Blue" },
  { hex: "#4a8fe7", th: "ฟ้า", en: "Sky" },
  { hex: "#7fb8f0", th: "ฟ้าใส", en: "Light blue" },
  { hex: "#2fa3a8", th: "ฟ้าอมเขียว", en: "Teal" },
  { hex: "#3fb27f", th: "เขียว", en: "Green" },
  { hex: "#8fbf4a", th: "เขียวมะกอก", en: "Olive" },
  { hex: "#d4a017", th: "ทองอำพัน", en: "Amber" },
  { hex: "#e8b84a", th: "ทองอ่อน", en: "Light gold" },
  { hex: "#b5652b", th: "อำพันส้ม", en: "Copper" },
  { hex: "#8b4c2b", th: "น้ำตาล", en: "Brown" },
  { hex: "#5a3a2a", th: "น้ำตาลเข้ม", en: "Dark brown" },
  { hex: "#d8424f", th: "แดง", en: "Red" },
  { hex: "#e0709a", th: "ชมพู", en: "Pink" },
  { hex: "#8a5cd8", th: "ม่วง", en: "Violet" },
  { hex: "#5b3f8c", th: "ม่วงเข้ม", en: "Deep violet" },
  { hex: "#9aa2ae", th: "เทา", en: "Grey" },
  { hex: "#c0c7d4", th: "เงิน", en: "Silver" },
  { hex: "#3a3540", th: "ดำ", en: "Black" },
];

export const SKINS: Swatch[] = [
  { hex: "#fbe7da", th: "Plainsfolk ขาวอมชมพู", en: "Plainsfolk, rosy" },
  { hex: "#f8dccb", th: "Plainsfolk ขาว", en: "Plainsfolk, fair" },
  { hex: "#f2cdb5", th: "Plainsfolk", en: "Plainsfolk" },
  { hex: "#ecbd9f", th: "Plainsfolk แทน", en: "Plainsfolk, tan" },
  { hex: "#e5b48a", th: "Dunesfolk อ่อน", en: "Dunesfolk, light" },
  { hex: "#d39c6f", th: "Dunesfolk", en: "Dunesfolk" },
  { hex: "#bd8358", th: "Dunesfolk เข้ม", en: "Dunesfolk, dark" },
  { hex: "#9c6640", th: "Dunesfolk เข้มมาก", en: "Dunesfolk, deep" },
];

export const OUTFITS: Swatch[] = [
  { hex: "#6aa9e0", th: "ฟ้า", en: "Sky" },
  { hex: "#3d6fb0", th: "น้ำเงิน", en: "Blue" },
  { hex: "#3fae8f", th: "เขียวหยก", en: "Jade" },
  { hex: "#5e8a4a", th: "เขียวมะกอก", en: "Olive" },
  { hex: "#d8b65a", th: "ทอง", en: "Gold" },
  { hex: "#c98a5b", th: "ทองแดง", en: "Copper" },
  { hex: "#c4473a", th: "แดง", en: "Red" },
  { hex: "#b0527a", th: "บานเย็น", en: "Magenta" },
  { hex: "#7e6bc4", th: "ม่วง", en: "Purple" },
  { hex: "#3f4756", th: "เทาเข้ม", en: "Charcoal" },
  { hex: "#8b8f99", th: "เทา", en: "Grey" },
  { hex: "#e9e6df", th: "ขาว", en: "White" },
];

export interface Look {
  /** Indices into GENDERS, HAIRS, HAIR_COLORS, EYES, EYE_COLORS, BROWS, MOUTHS, SKINS, OUTFITS. */
  gender: number;
  hair: number;
  hairColor: number;
  eyes: number;
  eyeColor: number;
  brow: number;
  mouth: number;
  skin: number;
  outfit: number;
  blush: boolean;
}

/** The fields in the order they are written, and how many choices each has. */
const FIELDS: Array<[keyof Look, number]> = [
  ["gender", GENDERS.length], ["hair", HAIRS.length], ["hairColor", HAIR_COLORS.length],
  ["eyes", EYES.length], ["eyeColor", EYE_COLORS.length], ["brow", BROWS.length],
  ["mouth", MOUTHS.length], ["skin", SKINS.length], ["outfit", OUTFITS.length], ["blush", 2],
];

const VERSION = "1";
/** How long a written look is: the version and one digit per field. */
export const LOOK_LENGTH = 1 + FIELDS.length;

export function encodeLook(look: Look): string {
  return VERSION + FIELDS.map(([k]) => {
    const v = look[k];
    return (typeof v === "boolean" ? (v ? 1 : 0) : v).toString(36);
  }).join("");
}

/** A look as written by encodeLook, or null for anything else (it may come from another browser). */
export function decodeLook(code: unknown): Look | null {
  if (typeof code !== "string" || code.length !== LOOK_LENGTH || code[0] !== VERSION) return null;
  const out: Record<string, number | boolean> = {};
  for (let i = 0; i < FIELDS.length; i++) {
    const [k, n] = FIELDS[i];
    const c = code[i + 1];
    if (!/^[0-9a-z]$/.test(c)) return null;
    const v = parseInt(c, 36);
    if (v >= n) return null;
    out[k] = k === "blush" ? v === 1 : v;
  }
  return out as unknown as Look;
}

/** A small, fixed hash of a string: the same number for the same id everywhere. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Numbers from a seed, the same sequence every time. */
function seeded(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];

/**
 * A look from a stream of numbers, kept among the friendlier choices: open
 * eyes, a smile, soft or hidden brows. The wardrobe has the rest.
 */
export function lookFrom(r: () => number): Look {
  const gender = r() < 0.5 ? 0 : 1;
  return {
    gender,
    // Twin tails read as a girl's and spiky as a boy's, but either may have either.
    hair: r() < 0.75 ? gender : 1 - gender,
    hairColor: Math.floor(r() * HAIR_COLORS.length),
    eyes: pick(r, [0, 1, 2, 4, 5]),
    eyeColor: Math.floor(r() * EYE_COLORS.length),
    brow: pick(r, [0, 1, 1, 2]),
    mouth: pick(r, [0, 0, 1, 2]),
    skin: Math.floor(r() * SKINS.length),
    outfit: Math.floor(r() * OUTFITS.length),
    blush: r() < 0.6,
  };
}

/** Somebody who has not been to the wardrobe: a look of their own, the same on every screen. */
export function defaultLook(id: string): Look {
  return lookFrom(seeded(hash(id)));
}

/** A new look at random, for the wardrobe's dice. */
export function randomLook(): Look {
  return lookFrom(Math.random);
}

/** The look a member chose on this device, if any. */
export function savedLook(id: string): Look | null {
  try { return decodeLook(localStorage.getItem(`cashTown:look:${id}`)); } catch { return null; }
}

export function saveLook(id: string, look: Look) {
  try { localStorage.setItem(`cashTown:look:${id}`, encodeLook(look)); } catch { /* storage blocked: this visit only */ }
}
