/**
 * What a Cash Town avatar looks like: a pixel character of one of the game's
 * races, chosen in the wardrobe and drawn by lib/town/pixeldoll.
 *
 * Every choice is an index into a fixed list, so a look travels as eight
 * characters ("5" and one base-36 digit per field) inside the moves the room
 * already sends, and a look from another browser can be checked field by field
 * before anything is drawn from it. Colours come from curated palettes rather
 * than a picker: each is kept in a lightness band where the art's shading
 * survives the recolour.
 *
 * Each race has its own hairstyles (the game's character creator's own, each
 * gender its own list, in the creator's order) and its own skins; the
 * Lalafell's are written here, the other races' come from races.json (built
 * by the fc-cash-town skill's scripts/pixel/race-data.mjs from the research
 * on each race). Looks written before races (version "4", and "3", "2", "1"
 * before that) are Lalafell, keeping their gender and colours, taking the
 * nearest hairstyle, the skin as drawn and round eyes.
 *
 * Pure, so it can be tested without a browser.
 */
import OTHER_RACES from "./races.json";

export type Named = { id: string; th: string; en: string };
export type Swatch = { hex: string; th: string; en: string };
/** A hairstyle, and which gender's list it is in (an index into GENDERS). */
export type Hair = Named & { g: number };

export const GENDERS: Named[] = [
  { id: "f", th: "หญิง", en: "Female" },
  { id: "m", th: "ชาย", en: "Male" },
];

/** The Lalafell's: the ids are the picture's heads (fc-cash-town scripts/pixel/build-pixel-atlas.mjs). Only ever add at the end. */
export const HAIRS: Hair[] = [
  { g: 0, id: "f01", th: "มวยสูงฟู", en: "Messy topknot" },
  { g: 0, id: "f02", th: "จุกบนหัว ถักเปียข้าง", en: "Sprout and braids" },
  { g: 0, id: "f03", th: "มวยข้าง ปอยลอน", en: "Side bun with curls" },
  { g: 0, id: "f04", th: "หางม้าต่ำ", en: "Low ponytail" },
  { g: 0, id: "f05", th: "ยาวแสกข้าง", en: "Long, side parting" },
  { g: 0, id: "f06", th: "บ็อบคาดผม", en: "Bob with hairband" },
  { g: 0, id: "f07", th: "เสยรวบหลัง", en: "Swept back" },
  { g: 0, id: "f08", th: "ประบ่า", en: "Shoulder length" },
  { g: 0, id: "f09", th: "ฟูคาดผม", en: "Fluffy with hairband" },
  { g: 0, id: "f10", th: "แกละโบว์ขาว", en: "Pigtails with ribbons" },
  { g: 0, id: "f11", th: "บ็อบแสกข้าง", en: "Side-parted bob" },
  { g: 0, id: "f12", th: "ยาวปัดไหล่", en: "Long, over one shoulder" },
  { g: 0, id: "f13", th: "ถักเปียข้าง", en: "Side braid" },
  { g: 0, id: "f14", th: "แกละลอนต่ำ", en: "Curly low pigtails" },
  { g: 1, id: "m01", th: "กะลาฟู", en: "Shaggy bowl cut" },
  { g: 1, id: "m02", th: "ยุ่งมีจุก", en: "Messy with a tiny tail" },
  { g: 1, id: "m03", th: "มวยจุก", en: "Topknot" },
  { g: 1, id: "m04", th: "ปัดปิดตา", en: "Long fringe" },
  { g: 1, id: "m05", th: "ควิฟฟ์", en: "Quiff" },
  { g: 1, id: "m06", th: "ยาวแสกกลาง", en: "Centre parting" },
  { g: 1, id: "m07", th: "เกรียน", en: "Buzz cut" },
  { g: 1, id: "m08", th: "กะลาหัวจุก", en: "Bowl cut with a tuft" },
  { g: 1, id: "m09", th: "เสยตั้ง", en: "Spiky, swept back" },
  { g: 1, id: "m10", th: "ยุ่งมีจอน", en: "Messy with sideburns" },
  { g: 1, id: "m11", th: "ถักแนบหัว", en: "Braided rows" },
  { g: 1, id: "m12", th: "ชี้กระจาย", en: "Wild spikes" },
  { g: 1, id: "m13", th: "ชี้ตั้งฟ้า", en: "Tall spikes" },
];

/** A gender's hairstyles in a race, as indices into that race's list (the Lalafell's by default). */
export const hairsFor = (gender: number, race = 0): number[] => hairsOf(race).flatMap((h, i) => (h.g === gender ? [i] : []));

const hairAt = (id: string) => HAIRS.findIndex((h) => h.id === id);

/**
 * The same place in the other gender's list, for switching gender in the
 * wardrobe: the first hairstyle stays the first.
 */
export function hairForGender(hair: number, gender: number, race = 0): number {
  const list = hairsOf(race);
  if (list[hair]?.g === gender) return hair;
  const from = hairsFor(list[hair]?.g ?? 0, race).indexOf(hair), to = hairsFor(gender, race);
  return to[Math.min(Math.max(0, from), to.length - 1)] ?? 0;
}

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
  { hex: "#8fd1b6", th: "มินต์", en: "Mint" },
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

/** Lalafell skin, Plainsfolk to Dunesfolk, each kept in a lightness band where the art's shading survives. */
export const SKINS: Swatch[] = [
  { hex: "#fbe3d4", th: "Plainsfolk ขาวอมชมพู", en: "Plainsfolk, rosy" },
  { hex: "#f6d2bb", th: "Plainsfolk ขาว", en: "Plainsfolk, fair" },
  { hex: "#f0c3a4", th: "Plainsfolk", en: "Plainsfolk" },
  { hex: "#eab08a", th: "Plainsfolk แทน", en: "Plainsfolk, tan" },
  { hex: "#e09a70", th: "Dunesfolk อ่อน", en: "Dunesfolk, light" },
  { hex: "#cc8257", th: "Dunesfolk", en: "Dunesfolk" },
  { hex: "#b06a43", th: "Dunesfolk เข้ม", en: "Dunesfolk, dark" },
  { hex: "#8c5334", th: "Dunesfolk เข้มมาก", en: "Dunesfolk, deep" },
];
/** The skin the art was drawn in, for looks written before skin could be picked. */
const ART_SKIN = 4;

/** Eye shapes: the ids are the picture's faces (fc-cash-town scripts/pixel). Only ever add at the end. */
export const EYES: Named[] = [
  { id: "round", th: "ตากลม", en: "Round" },
  { id: "big", th: "ตาวิ้ง", en: "Sparkly" },
  { id: "sharp", th: "ตาคม", en: "Sharp" },
  { id: "droopy", th: "ตาง่วง", en: "Droopy" },
  { id: "cat", th: "ตาแมว", en: "Cat" },
  { id: "small", th: "ตาดำเล็ก", en: "Small pupils" },
];

/** A race: its hairstyles (both genders, in one list), its skins, where its picture's map is, and how tall it stands against a Lalafell. */
export type Race = Named & { open: boolean; hairs: Hair[]; skins: Swatch[]; atlas: string; height?: Partial<Record<"f" | "m", number>> };

const LALAFELL: Race = { id: "lalafell", th: "Lalafell", en: "Lalafell", open: true, hairs: HAIRS, skins: SKINS, atlas: "/town/pixel.json" };
/** The races in the game's order; a race opens when its picture is built. Only ever add at the end. */
const ORDER = ["hyur", "elezen", "miqote", "roegadyn", "aura", "hrothgar", "viera"];
const NAMES: Record<string, string> = { hyur: "Hyur", elezen: "Elezen", miqote: "Miqo'te", roegadyn: "Roegadyn", aura: "Au Ra", hrothgar: "Hrothgar", viera: "Viera" };
export const RACES: Race[] = [LALAFELL, ...ORDER.map((id): Race => {
  const r = (OTHER_RACES as unknown as Array<Partial<Race> & { id: string }>).find((x) => x.id === id);
  return { id, th: NAMES[id], en: NAMES[id], open: !!r?.open && !!r.hairs?.length, hairs: r?.hairs ?? [], skins: r?.skins?.length ? r.skins : SKINS, atlas: `/town/pixel-${id}.json`, height: r?.height };
})];

/** A race's hairstyles and skins (any index outside the list is the Lalafell's). */
export const raceOf = (race: number): Race => RACES[race] ?? LALAFELL;
export const hairsOf = (race: number): Hair[] => raceOf(race).hairs;
export const skinsOf = (race: number): Swatch[] => raceOf(race).skins;

export interface Look {
  /** Indices into RACES, GENDERS, the race's hairs, HAIR_COLORS, EYE_COLORS, the race's skins, EYES. */
  race: number;
  gender: number;
  hair: number;
  hairColor: number;
  eyeColor: number;
  skin: number;
  eyes: number;
}

/** The fields in the order they are written, and how many choices each has (the race's own lists for hair and skin). */
const FIELDS = (race: number): Array<[keyof Look, number]> => [
  ["race", RACES.length], ["gender", GENDERS.length], ["hair", hairsOf(race).length], ["hairColor", HAIR_COLORS.length],
  ["eyeColor", EYE_COLORS.length], ["skin", skinsOf(race).length], ["eyes", EYES.length],
];

const VERSION = "5";
/** How long a written look is: the version and one digit per field. */
export const LOOK_LENGTH = 1 + FIELDS(0).length;

export function encodeLook(look: Look): string {
  return VERSION + FIELDS(look.race).map(([k]) => look[k].toString(36)).join("");
}

/** The same look as another race: the hairstyle at the same place in its list, a skin from its own. */
export function lookAsRace(look: Look, race: number): Look {
  if (race === look.race) return look;
  const from = hairsFor(look.gender, look.race).indexOf(look.hair), to = hairsFor(look.gender, race);
  const skins = skinsOf(race).length;
  return { ...look, race, hair: to[Math.min(Math.max(0, from), to.length - 1)] ?? 0, skin: Math.min(look.skin, skins - 1) };
}

const digit = (c: string | undefined, n: number): number | null => {
  if (!c || !/^[0-9a-z]$/.test(c)) return null;
  const v = parseInt(c, 36);
  return v < n ? v : null;
};

/** Earlier versions' hairstyles, by name, as the nearest of the creator's, for a girl and for a boy. */
const OLD_HAIRS: Record<string, [string, string]> = {
  twin: ["f10", "m02"], spiky: ["f01", "m12"], bun: ["f03", "m03"], bob: ["f06", "m01"],
  long: ["f05", "m06"], pony: ["f04", "m02"], bald: ["f06", "m07"],
};
const V1_HAIRS = ["twin", "spiky", "bald"];
const V2_HAIRS = ["twin", "spiky", "bun", "bob", "long", "pony", "bald"];
const oldHair = (name: string, gender: number) => hairAt(OLD_HAIRS[name][gender]);

/**
 * A look as written by encodeLook (or by versions 1 to 3), or null for
 * anything else (it may come from another browser). A hairstyle from the other
 * gender's list is moved to the same place in this gender's.
 */
export function decodeLook(code: unknown): Look | null {
  if (typeof code !== "string") return null;
  if (code.length === LOOK_LENGTH && code[0] === VERSION) {
    const race = digit(code[1], RACES.length);
    if (race === null) return null;
    const out: Partial<Look> = {};
    const fields = FIELDS(race);
    for (let i = 0; i < fields.length; i++) {
      const [k, n] = fields[i];
      const v = digit(code[i + 1], n);
      if (v === null) return null;
      out[k] = v;
    }
    const look = out as Look;
    return { ...look, hair: hairForGender(look.hair, look.gender, race) };
  }
  // Version 4: a Lalafell (gender, hair, hair colour, eye colour, skin, eyes).
  if (code.length === 7 && code[0] === "4") {
    const v = [...code.slice(1)].map((c, i) => digit(c, [GENDERS.length, HAIRS.length, HAIR_COLORS.length, EYE_COLORS.length, SKINS.length, EYES.length][i]));
    if (v.some((x) => x === null)) return null;
    const [gender, hair, hairColor, eyeColor, skin, eyes] = v as number[];
    return { race: 0, gender, hair: hairForGender(hair, gender), hairColor, eyeColor, skin, eyes };
  }
  // Version 3: gender, hair, hair colour, eye colour (the skin as drawn, round eyes).
  if (code.length === 5 && code[0] === "3") {
    const gender = digit(code[1], GENDERS.length), hair = digit(code[2], HAIRS.length);
    const hairColor = digit(code[3], HAIR_COLORS.length), eyeColor = digit(code[4], EYE_COLORS.length);
    if (gender === null || hair === null || hairColor === null || eyeColor === null) return null;
    return { race: 0, gender, hair: hairForGender(hair, gender), hairColor, eyeColor, skin: ART_SKIN, eyes: 0 };
  }
  // Version 2: gender, our first seven hairstyles, hair colour, eye colour.
  if (code.length === 5 && code[0] === "2") {
    const gender = digit(code[1], GENDERS.length), hair = digit(code[2], V2_HAIRS.length);
    const hairColor = digit(code[3], HAIR_COLORS.length), eyeColor = digit(code[4], EYE_COLORS.length);
    if (gender === null || hair === null || hairColor === null || eyeColor === null) return null;
    return { race: 0, gender, hair: oldHair(V2_HAIRS[hair], gender), hairColor, eyeColor, skin: ART_SKIN, eyes: 0 };
  }
  // Version 1: gender, hair, hair colour, eyes, eye colour, then six fields this version has no use for.
  if (code.length === 11 && code[0] === "1") {
    const gender = digit(code[1], GENDERS.length), hair = digit(code[2], V1_HAIRS.length);
    const hairColor = digit(code[3], HAIR_COLORS.length), eyeColor = digit(code[5], EYE_COLORS.length);
    if (gender === null || hair === null || hairColor === null || eyeColor === null || !/^[0-9a-z]{10}$/.test(code.slice(1))) return null;
    return { race: 0, gender, hair: oldHair(V1_HAIRS[hair], gender), hairColor, eyeColor, skin: ART_SKIN, eyes: 0 };
  }
  return null;
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

/** A look from a stream of numbers, of one of `races`: any hairstyle from the gender's own list. */
export function lookFrom(r: () => number, races: number[] = [0]): Look {
  const race = pick(r, races);
  const gender = r() < 0.5 ? 0 : 1;
  return {
    race,
    gender,
    hair: pick(r, hairsFor(gender, race)),
    hairColor: Math.floor(r() * HAIR_COLORS.length),
    eyeColor: Math.floor(r() * EYE_COLORS.length),
    skin: Math.floor(r() * skinsOf(race).length),
    eyes: Math.floor(r() * EYES.length),
  };
}

/** Somebody who has not been to the wardrobe: a Lalafell of their own, the same on every screen. */
export function defaultLook(id: string): Look {
  return lookFrom(seeded(hash(id)));
}

/** A new look at random, for the wardrobe's dice: of the race already worn. */
export function randomLook(race = 0): Look {
  return lookFrom(Math.random, [raceOf(race).open ? race : 0]);
}

/** The look a member chose on this device, if any. */
export function savedLook(id: string): Look | null {
  try { return decodeLook(localStorage.getItem(`cashTown:look:${id}`)); } catch { return null; }
}

export function saveLook(id: string, look: Look) {
  try { localStorage.setItem(`cashTown:look:${id}`, encodeLook(look)); } catch { /* storage blocked: this visit only */ }
}
