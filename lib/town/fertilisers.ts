/**
 * The farm's fertilisers for Quality (piece 3 of the rework; the owner's design, 2026-10-15: "ปุ๋ย 27 แบบ จากทุกสาย").
 * A plant has two slots. **Base** (รองพื้น) covers from when it is put on to the plant's first picking; **top**
 * (แต่งหน้า) covers for its hours from when it is put on. A packet fills ONE bar whole or TWO bars by half; there is no
 * four-bar dust and none changes yield or growth (the growth fertiliser stays as it was). The best source of a bar
 * counts, never added (lib/town/quality's accrue). The two three-day packets also raise the floor (the `packet`
 * narrowing) while they last: convenience, which planning gives as much.
 *
 * Mine where the design was silent (told to the owner): base is put on one's own plant in its first round, not on bare
 * ground (weighted by growing, put on just after sowing it covers nearly the whole round); a top is put on a growing
 * plant with no live top, never over one. Each is made by hand like the old fertilisers (lib/town/items' MAKES, no
 * cookware), from every line's things; where the design named a thing the game does not have, or one a recipe
 * cannot hide (no two made things take the same things), the nearest that is: rotted leaves and compost for the
 * forest's humus, wet clay for the lotus pond's silt, knotted wood for the wood scraps, the pond snail for the stream's
 * snail, creek dace for "small fish", straight-grained wood for the logs (no log goes in, the owner's rule), silk cocoons for the silk moth, chamomile for the wild flowers, pyrite roasted
 * with charcoal for sulphur. The leaf mulch is the design's base "leaf fertiliser" (its
 * growth use goes; the growth fertiliser is the growth one), and mineral water is its top "mineral water", kept for the
 * well and the kitchen as well.
 */
import type { Item, ItemId, Make } from "./items";
import type { Role } from "./quality";

export type FertSlot = "base" | "top";
export interface Fert {
  slot: FertSlot;
  /** The bars it fills: one whole (1) or two by half (0.5). */
  bars: Partial<Record<Role, 0.5 | 1>>;
  /** A top's hours. */
  hours?: number;
  /** Whether it raises the floor while it lasts (the three-day packets). */
  narrows?: true;
}

const base = (bars: Fert["bars"]): Fert => ({ slot: "base", bars });
const top = (bars: Fert["bars"], hours: number, narrows?: true): Fert => ({ slot: "top", bars, hours, ...(narrows ? { narrows } : {}) });

/** Every fertiliser of Quality, by its item. */
export const FERTS = {
  // base: one bar whole
  slatePowder: base({ soil: 1 }), biochar: base({ water: 1 }), mineralClay: base({ water: 1 }), chitinPowder: base({ guard: 1 }),
  // base: two bars by half
  forestHumus: base({ soil: 0.5, water: 0.5 }), silkFrass: base({ soil: 0.5, pollen: 0.5 }), woodAsh: base({ soil: 0.5, guard: 0.5 }),
  lotusSilt: base({ water: 0.5, pollen: 0.5 }), mulch: base({ water: 0.5, guard: 0.5 }), herbPowder: base({ pollen: 0.5, guard: 0.5 }),
  // top: one bar whole
  fishEmulsion: top({ soil: 1 }, 12), kitchenFerment: top({ soil: 1 }, 12), mineralWater: top({ water: 1 }, 24),
  nectarLure: top({ pollen: 1 }, 24), sulphurPowder: top({ guard: 1 }, 24), resinWash: top({ guard: 1 }, 24),
  // top: two bars by half
  sawdustMulch: top({ soil: 0.5, water: 0.5 }, 48), shellMeal: top({ soil: 0.5, guard: 0.5 }, 24), shreddedBark: top({ water: 0.5, guard: 0.5 }, 48),
} as const satisfies Record<string, Fert>;
export type FertId = keyof typeof FERTS;
export const isFert = (id: unknown): id is FertId => typeof id === "string" && Object.hasOwn(FERTS, id);

const item = (th: string, en: string, lookTh: string, lookEn: string, pays: number): Item =>
  ({ kind: "goods", tier: 2, name: { th, en }, about: { th: lookTh, en: lookEn }, stack: 20, pays });

/** The new fertilisers as things (the leaf mulch and mineral water are already things). */
export const FERT_ITEMS = {
  slatePowder: item("ผงหินชนวน", "Slate powder", "ผงสีเทาเข้มละเอียดในถุงผ้า", "A fine dark grey powder in a cloth bag", 3),
  biochar: item("ถ่านชีวภาพ", "Biochar", "ถ่านก้อนเล็กสีดำพรุนในถุงผ้า", "Small porous lumps of black char in a cloth bag", 2),
  mineralClay: item("ดินเหนียวแร่", "Mineral clay", "ดินเหนียวสีส้มอมเทาปั้นเป็นก้อนเล็ก", "Little lumps of grey-orange clay", 2),
  chitinPowder: item("ผงไคติน", "Chitin powder", "ผงสีอำพันวาวบดจากเปลือกแมลง", "A glinting amber powder ground from insect shell", 10),
  forestHumus: item("ฮิวมัสป่า", "Forest humus", "ดินร่วนสีดำชื้น กลิ่นป่า", "Damp, black, crumbly earth that smells of the forest", 3),
  silkFrass: item("มูลหนอนไหม", "Silkworm frass", "เม็ดเล็กสีเขียวเข้มแห้งในถุงผ้า", "Tiny dry dark green pellets in a cloth bag", 8),
  woodAsh: item("ขี้เถ้าไม้", "Wood ash", "ผงเถ้าสีเทาอ่อนเบาฟุ้งในถุงผ้า", "A light, pale grey ash in a cloth bag", 5),
  lotusSilt: item("ตะกอนบึงบัว", "Lotus silt", "โคลนตะกอนสีน้ำตาลเทาเนื้อเนียน", "Smooth grey-brown silt", 6),
  herbPowder: item("ผงสมุนไพรป่า", "Wild herb powder", "ผงสีเขียวอมเหลือง กลิ่นหอมดอกไม้", "A yellow-green powder that smells of flowers", 4),
  fishEmulsion: item("น้ำหมักปลา", "Fish emulsion", "น้ำสีน้ำตาลขุ่นในขวดปิดจุก กลิ่นแรง", "Cloudy brown liquid in a corked bottle; it smells strong", 11),
  kitchenFerment: item("น้ำหมักเศษครัว", "Kitchen ferment", "น้ำหมักสีอำพันขุ่นในโถดินเล็ก", "A cloudy amber brew in a small crock", 2),
  nectarLure: item("น้ำหวานล่อผึ้ง", "Nectar lure", "น้ำหวานสีทองในขวดโปรยเล็ก", "Golden nectar in a small sprinkling bottle", 9),
  sulphurPowder: item("ผงกำมะถัน", "Sulphur powder", "ผงสีเหลืองสดในถุงกระดาษ", "A bright yellow powder in a paper bag", 3),
  resinWash: item("น้ำยางไม้", "Resin wash", "น้ำยางสีเหลืองใสในขวดแก้ว", "A clear yellow resin wash in a glass bottle", 3),
  sawdustMulch: item("ขี้เลื่อยคลุมดิน", "Sawdust mulch", "ขี้เลื่อยสีน้ำตาลอ่อนฟูในกระสอบเล็ก", "Fluffy pale sawdust in a small sack", 4),
  shellMeal: item("ป่นเปลือกหอย", "Shell meal", "ผงสีขาวนวลมีเกล็ดเปลือกหอย", "An off-white powder flecked with shell", 2),
  shreddedBark: item("เปลือกไม้สับ", "Shredded bark", "เปลือกสนสับเป็นชิ้นเล็กสีน้ำตาลแดง", "Red-brown pine bark in small shreds", 3),
} as const satisfies Partial<Record<FertId, Item>>;

/** How each new one is made: by hand, no cookware, as the old fertilisers are (the last thing named is the one the recipe hides, lib/town/clues). */
export const FERT_MAKES: Partial<Record<FertId, Make>> = {
  slatePowder: { needs: [["slateLayer", 2]], in: [], gives: 2 },
  biochar: { needs: [["timber", 3]], in: [], gives: 2 },
  mineralClay: { needs: [["clay", 2]], in: [], gives: 2 },
  chitinPowder: { needs: [["chitinPlate", 1]], in: [], gives: 2 },
  forestHumus: { needs: [["compost", 1], ["leafMould", 2]], in: [], gives: 2 },
  silkFrass: { needs: [["silkCocoon", 2]], in: [], gives: 2 },
  woodAsh: { needs: [["straightWood", 3]], in: [], gives: 3 },
  lotusSilt: { needs: [["wetClay", 2]], in: [], gives: 2 },
  herbPowder: { needs: [["chamomile", 3]], in: [], gives: 2 },
  fishEmulsion: { needs: [["compost", 1], ["creekDace", 2]], in: [], gives: 2 },
  kitchenFerment: { needs: [["oddDish", 1], ["salt", 1]], in: [], gives: 2 },
  nectarLure: { needs: [["nectarSyrup", 1]], in: [], gives: 2 },
  sulphurPowder: { needs: [["charcoal", 1], ["pyriteCluster", 1]], in: [], gives: 3 },
  resinWash: { needs: [["resin", 2]], in: [], gives: 2 },
  sawdustMulch: { needs: [["knottedWood", 3]], in: [], gives: 2 },
  shellMeal: { needs: [["snail", 2]], in: [], gives: 2 },
  shreddedBark: { needs: [["pineBark", 3]], in: [], gives: 2 },
};

/** A fertiliser put on a plant: which, from when, and (a top) until when. */
export interface FertOn { item: FertId; at: number; until?: number }
