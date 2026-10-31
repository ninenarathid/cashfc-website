/**
 * What sets Granny Twilla's limited outfits apart (the owner, 2026-10-31: "เปลี่ยนสีได้หลายเวอร์ชั่น เลือกได้ซัก 5 แบบ / มีออร่า
 * vfx ตอนยืนเฉยๆ กับเดิน / ปรับให้ชุดแรกด้วย ให้คนที่ประมูลไปเซอร์ไพร้", and of the pumpkin "ช่วยทำให้เกินความคาดหมายผู้เล่น"):
 * five colours a design, the first as drawn, and an aura of the design's own (components/town/limited-aura).
 *
 * A colour is no picture of its own: the doll's pieces are moved hue by hue when they are made ready (lib/town/pixeldoll),
 * and the shading stays as drawn. Skin never moves. Pure.
 */
export type HueBand = {
  /** The hues it takes, in degrees; from > to runs through red. */
  from: number;
  to: number;
  /** The hue they become. */
  h: number;
  /** Saturation times this, lightness plus this. */
  s?: number;
  l?: number;
  /** Greyer than this is left alone (a cravat, a black coat). */
  minS?: number;
};
/** The aura's colours, darkest to brightest. */
export type AuraRamp = readonly [string, string, string, string];
export type LimitedDye = { th: string; en: string; bands: readonly HueBand[]; aura: AuraRamp; swatch: string };
export type LimitedKind = "bats" | "spirits" | "moon" | "leaves";
export type LimitedLook = { kind: LimitedKind; title: { th: string; en: string }; dyes: readonly [LimitedDye, LimitedDye, LimitedDye, LimitedDye, LimitedDye] };

const CRIMSON = { from: 335, to: 15, minS: 0.18 };
const VIOLET = { from: 245, to: 310, minS: 0.12 };
const ORANGE = { from: 12, to: 48, minS: 0.3 };
const TEAL = { from: 150, to: 200, minS: 0.15 };
const INDIGO = { from: 205, to: 275, minS: 0.1 };
const AMBER = { from: 22, to: 52, minS: 0.3 };
const LEAF = { from: 4, to: 62, minS: 0.22 };
const BURGUNDY = { from: 330, to: 4, minS: 0.2 };

/** The base outfits, by id. */
export const LIMITED_LOOKS: Record<string, LimitedLook> = {
  count: {
    kind: "bats",
    title: { th: "เคานต์แห่งรัตติกาล", en: "Count of the Midnight" },
    dyes: [
      { th: "โลหิต", en: "Blood", swatch: "#8e1228", bands: [], aura: ["#3d0614", "#8e1228", "#d6304a", "#ff8a8a"] },
      { th: "ไพลิน", en: "Sapphire", swatch: "#1f4fb8", bands: [{ ...CRIMSON, h: 222, s: 1.05, l: 0.03 }], aura: ["#0b1d52", "#1f4fb8", "#4f8bf0", "#b6d8ff"] },
      { th: "มรกต", en: "Emerald", swatch: "#0f8a5a", bands: [{ ...CRIMSON, h: 158, s: 1, l: 0.01 }], aura: ["#06362a", "#0f8a5a", "#38cf8f", "#b4f7d6"] },
      { th: "อเมทิสต์", en: "Amethyst", swatch: "#6f2fb8", bands: [{ ...CRIMSON, h: 276, s: 1, l: 0.03 }], aura: ["#260d4d", "#6f2fb8", "#a765ee", "#e2c6ff"] },
      { th: "ทองคำ", en: "Gold", swatch: "#c79322", bands: [{ ...CRIMSON, h: 42, s: 1, l: 0.14 }], aura: ["#4d3206", "#c79322", "#f3c84d", "#fff0b3"] },
    ],
  },
  pumpkinmonarch: {
    kind: "spirits",
    title: { th: "ราชันย์ไฟผี", en: "Ghostfire Sovereign" },
    dyes: [
      { th: "ไฟผี", en: "Ghost fire", swatch: "#2fd6b8", bands: [], aura: ["#07443f", "#14a593", "#3fe6cb", "#c9fff0"] },
      { th: "เพลิงม่วง", en: "Violet flame", swatch: "#a35cff", bands: [{ ...ORANGE, h: 288, s: 0.85, l: -0.04 }, { ...TEAL, h: 275 }, { ...VIOLET, h: 228, l: -0.02 }], aura: ["#2a0d55", "#7a35d6", "#b77bff", "#ecd9ff"] },
      { th: "จันทร์เลือด", en: "Blood moon", swatch: "#e0364a", bands: [{ ...ORANGE, h: 352, s: 0.95, l: -0.08 }, { ...TEAL, h: 354 }, { ...VIOLET, h: 345, s: 0.85, l: -0.1 }], aura: ["#4d0712", "#b81d32", "#f0525f", "#ffc4c0"] },
      { th: "ราตรีน้ำแข็ง", en: "Frost night", swatch: "#5cc4ff", bands: [{ ...TEAL, h: 202 }, { ...VIOLET, h: 212, s: 0.9 }, { ...ORANGE, h: 192, s: 0.8, l: 0.06 }], aura: ["#0b2f55", "#2a7fd0", "#6ccaff", "#dff4ff"] },
      { th: "เก็บเกี่ยวทอง", en: "Golden harvest", swatch: "#f0c040", bands: [{ ...TEAL, h: 46 }, { ...VIOLET, h: 150, s: 0.7, l: -0.05 }, { ...ORANGE, h: 44, l: 0.05 }], aura: ["#4d3206", "#c98f16", "#f7cf4f", "#fff4bf"] },
    ],
  },
  moonkeeper: {
    kind: "moon",
    title: { th: "ผู้เฝ้าโคมจันทรา", en: "Keeper of the Moon Lantern" },
    dyes: [
      { th: "คืนคราม", en: "Indigo night", swatch: "#232a63", bands: [], aura: ["#6d4410", "#d99a2b", "#ffd777", "#fff6d1"] },
      { th: "ไวน์", en: "Wine", swatch: "#6d1838", bands: [{ ...INDIGO, h: 340, s: 1.1 }], aura: ["#6d2310", "#e0703a", "#ffb074", "#ffe9c9"] },
      { th: "ป่าลึก", en: "Deep forest", swatch: "#14503f", bands: [{ ...INDIGO, h: 160, s: 1.1 }], aura: ["#20531f", "#8ec24a", "#d6ec7f", "#f7ffd0"] },
      { th: "สีเงิน", en: "Silver", swatch: "#8d96ad", bands: [{ ...INDIGO, h: 222, s: 0.45, l: 0.3 }, { ...AMBER, h: 212, s: 0.3, l: 0.1 }], aura: ["#3f4a66", "#8e9cc0", "#cfd8ee", "#ffffff"] },
      { th: "สุริยคราส", en: "Eclipse", swatch: "#15131f", bands: [{ ...INDIGO, h: 262, s: 0.45, l: -0.07 }], aura: ["#5b1f6d", "#bc58d6", "#ed9cff", "#fbe6ff"] },
    ],
  },
  mapleregent: {
    kind: "leaves",
    title: { th: "ผู้ครองใบไม้ร่วง", en: "Regent of Falling Leaves" },
    dyes: [
      { th: "ปลายใบไม้ร่วง", en: "Autumn", swatch: "#d9651e", bands: [], aura: ["#5e230c", "#c9531a", "#ef8f2c", "#ffd479"] },
      { th: "ซากุระ", en: "Spring blossom", swatch: "#f08bb0", bands: [{ ...LEAF, h: 338, s: 0.8, l: 0.1 }, { ...BURGUNDY, h: 325, s: 0.7, l: 0.02 }], aura: ["#7a2750", "#df6c9c", "#f9a8c8", "#ffe3ee"] },
      { th: "ใบไม้เขียว", en: "Summer leaf", swatch: "#4da63c", bands: [{ ...LEAF, h: 108, s: 0.85 }, { ...BURGUNDY, h: 150, s: 0.7, l: -0.02 }], aura: ["#1d4a18", "#4da63c", "#8ed655", "#dcf7a8"] },
      { th: "ใบน้ำค้างแข็ง", en: "Frost leaf", swatch: "#6cbce8", bands: [{ ...LEAF, h: 200, s: 0.75, l: 0.1 }, { ...BURGUNDY, h: 222, s: 0.8, l: 0.02 }], aura: ["#143e6b", "#3f8fd0", "#8ad0f5", "#e4f7ff"] },
      { th: "ใบทอง", en: "Gilded", swatch: "#e8bb3a", bands: [{ ...AMBER, h: 46, s: 1, l: 0.06 }, { ...BURGUNDY, h: 32, s: 0.8, l: -0.04 }], aura: ["#5c3d08", "#c98f16", "#f2c944", "#fff2b0"] },
    ],
  },
};

/** The look a dyed outfit is of, by its base's id; undefined for what is not limited. */
export const limitedLook = (base: string | null | undefined): LimitedLook | undefined => (base ? LIMITED_LOOKS[base] : undefined);

const inBand = (h: number, b: HueBand) => (b.from <= b.to ? h >= b.from && h <= b.to : h >= b.from || h <= b.to);

/** Where one colour goes under a dye (hue in degrees, saturation and lightness 0 to 1), or null when it stays as drawn. */
export function dyedHsl(h: number, s: number, l: number, bands: readonly HueBand[]): [number, number, number] | null {
  for (const b of bands) {
    if (s < (b.minS ?? 0) || !inBand(h, b)) continue;
    return [b.h, Math.min(1, s * (b.s ?? 1)), Math.max(0, Math.min(1, l + (b.l ?? 0)))];
  }
  return null;
}
