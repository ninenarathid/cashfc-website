import type { Crop, Item } from "./items";
import { NEW_POLLINATOR_SKY } from "./band-species";
import { BOARD_POLLINATOR_SKY } from "./board-insect-rows";

/**
 * The twenty helper plants of the farm's Quality (the owner took the design, 2026-10-15; the artifact
 * https://claude.ai/artifact/6jR6hbg7pHtGmfa3vQHFJC, section 3): five a role, each covering the plants of its bed by its
 * shape (lib/town/quality's COMPANIONS). They are crops too, with a small harvest of their own: they earn less a plot
 * than a main crop, for their worth is the Quality of the plants beside them. The uncle sells the seeds of four (one a
 * role); the other sixteen are found by crossing, and their seeds are neither sold nor bought by the uncle's family.
 */
const item = (kind: Item["kind"], th: string, en: string, lookTh: string, lookEn: string, pays: number, tier: Item["tier"] = 1): Item =>
  ({ kind, tier, name: { th, en }, about: { th: lookTh, en: lookEn }, stack: kind === "seed" ? 10 : 20, pays });

export type HelperCropId =
  | "runnerBean" | "peanut" | "buckwheat" | "sesame" | "clover"
  | "gardenStrawberry" | "rhubarb" | "watercress" | "fig" | "chamomile"
  | "borage" | "lavender" | "passionfruit" | "milkweed" | "fennel"
  | "marigold" | "nasturtium" | "garlicChives" | "mint" | "dill"
  // (the eight mist children of the crossings, piece 5: each the sun child's rare form, giving a rare produce)
  | MistCropId;
export type MistCropId = "pearlNut" | "silverGrain" | "dewSesame" | "glassFlower" | "opalStalk" | "crystalLeaf" | "dewFig" | "silkPollen";
/** The mist child's plant, by its name (its produce is the rare thing the design named: ถั่วลิสงหมอก gives เมล็ดมุก). */
export const MIST_PLANTS: Record<MistCropId, [th: string, en: string]> = {
  pearlNut: ["ถั่วลิสงหมอก", "Mist peanut"], silverGrain: ["บัควีตหมอก", "Mist buckwheat"], dewSesame: ["งาหมอก", "Mist sesame"],
  glassFlower: ["โคลเวอร์หมอก", "Mist clover"], opalStalk: ["รูบาร์บหมอก", "Mist rhubarb"], crystalLeaf: ["วอเตอร์เครสหมอก", "Mist watercress"],
  dewFig: ["มะเดื่อหมอก", "Mist fig"], silkPollen: ["คาโมมายล์หมอก", "Mist chamomile"],
};

/**
 * Three helpers grow what the forest's edge already gives (lib/town/items' wild herbs, lib/town/forest): mint,
 * chamomile and lavender are the same things, for the same dishes, whether picked at the forest's edge or grown.
 */
export type ForestHerb = "mint" | "chamomile" | "lavender";
const HERB_NAMES: Record<ForestHerb, [th: string, en: string]> = { mint: ["มินต์", "Mint"], chamomile: ["คาโมมายล์", "Chamomile"], lavender: ["ลาเวนเดอร์", "Lavender"] };

/** The four whose seeds the uncle sells. */
export const HELPER_STARTERS: readonly HelperCropId[] = ["runnerBean", "gardenStrawberry", "borage", "marigold"];

export const HELPER_ITEMS = {
  runnerBean: item("crop", "ถั่วรันเนอร์", "Runner bean", "ฝักยาวสีเขียวมีลายม่วงจาง", "Long green pods faintly streaked with purple", 3),
  peanut: item("crop", "ถั่วลิสง", "Peanut", "ฝักเปลือกย่นสีครีมมีดินติด", "Wrinkled cream shells with soil still on them", 4),
  buckwheat: item("crop", "บัควีต", "Buckwheat", "เมล็ดสามเหลี่ยมสีน้ำตาลเป็นช่อ", "A spray of small three-sided brown seeds", 3),
  sesame: item("crop", "งา", "Sesame", "ฝักเรียวแตกออกเห็นเมล็ดขาวเล็ก", "Slender split pods full of tiny white seeds", 4),
  clover: item("crop", "โคลเวอร์", "Clover", "ใบสามแฉกกับดอกกลมสีชมพูขาว", "Three-part leaves and a round pink-white flower", 2),
  gardenStrawberry: item("crop", "สตรอว์เบอร์รีสวน", "Garden strawberry", "ผลสีแดงสดมีเมล็ดจุดบนผิว", "A bright red berry dotted with seeds", 4),
  rhubarb: item("crop", "รูบาร์บ", "Rhubarb", "ก้านอวบสีแดงชมพูใบกว้าง", "Thick pink-red stalks under wide leaves", 4),
  watercress: item("crop", "วอเตอร์เครส", "Watercress", "ใบกลมเล็กสีเขียวเข้มบนก้านกรอบ", "Small round dark leaves on crisp stems", 2),
  fig: item("crop", "มะเดื่อ", "Fig", "ผลรูปหยดน้ำสีม่วงอมเขียว", "A tear-shaped green-purple fruit", 6),
  borage: item("crop", "โบราจ", "Borage", "ดอกรูปดาวสีฟ้าอมม่วง", "Star-shaped blue-violet flowers", 2),
  passionfruit: item("crop", "เสาวรส", "Passionfruit", "ผลกลมเปลือกม่วงเข้มผิวย่น", "A round fruit with a wrinkled deep purple rind", 5),
  milkweed: item("crop", "มิลค์วีด", "Milkweed", "ฝักอวบมีปุยขาวโผล่ออกมา", "A plump pod with white silk spilling out", 3),
  fennel: item("crop", "เฟนเนล", "Fennel", "หัวขาวอวบกับใบฝอยกลิ่นยี่หร่า", "A plump white bulb under feathery, anise-scented fronds", 8),
  marigold: item("crop", "ดาวเรือง", "Marigold", "ดอกกลมกลีบซ้อนสีส้มทอง", "A round flower of layered orange-gold petals", 2),
  nasturtium: item("crop", "แนสเทอร์ฌัม", "Nasturtium", "ดอกสีส้มแดงกับใบกลมเหมือนบัว", "Orange-red flowers among round, lily-pad leaves", 3),
  garlicChives: item("crop", "กุยช่าย", "Garlic chives", "ใบแบนยาวสีเขียวมีดอกขาวเล็ก", "Long flat green leaves with small white flowers", 3),
  dill: item("crop", "ผักชีลาว", "Dill", "ใบฝอยเส้นเล็กกับดอกเหลืองเป็นร่ม", "Thread-fine leaves and yellow flower umbrellas", 3),
  // (the mist children's rare produce: four times what the sun child's is worth, of the third tier)
  pearlNut: item("crop", "เมล็ดมุก", "Pearl nuts", "ถั่วเม็ดกลมสีขาวมุกวาว", "Round nuts with a pearly sheen", 16, 3),
  silverGrain: item("crop", "เมล็ดเงิน", "Silver grain", "เมล็ดสามเหลี่ยมสีเงินเป็นประกาย", "Three-sided grains that shine like silver", 12, 3),
  dewSesame: item("crop", "งาน้ำค้าง", "Dew sesame", "เมล็ดงาใสเหมือนหยดน้ำค้าง", "Sesame seeds clear as drops of dew", 16, 3),
  glassFlower: item("crop", "ดอกแก้ว", "Glass flower", "ดอกโคลเวอร์ใสราวแก้ว", "A clover flower clear as glass", 8, 3),
  opalStalk: item("crop", "ก้านโอปอล", "Opal stalks", "ก้านอวบสีรุ้งแบบโอปอล", "Plump stalks shot with opal colours", 16, 3),
  crystalLeaf: item("crop", "ใบผลึก", "Crystal leaves", "ใบเล็กใสเป็นผลึก", "Small leaves gone clear as crystal", 8, 3),
  dewFig: item("crop", "ผลน้ำค้าง", "Dew figs", "ผลมะเดื่อมีหยดน้ำค้างเกาะ", "Figs beaded with dew", 24, 3),
  silkPollen: item("crop", "เกสรแพร", "Silk pollen", "เกสรสีทองนุ่มเหมือนแพรไหม", "Golden pollen soft as silk", 12, 3),
} as const satisfies Record<Exclude<HelperCropId, ForestHerb>, Item>;

/**
 * The farm's Quality's own gear: the insect house (lib/town/insect-house), set on a plot of one's bed with two rooms
 * for caught insects. Made at the workshop of the woodworkers' things (piece 4a: "สายตัดไม้คราฟต์บ้านแมลงแล้วขายได้").
 */
export const QUALITY_GEAR = {
  insectHouse: item("tool", "บ้านแมลง", "Insect house", "บ้านไม้หลังคาจั่ว มีสองห้องของกระบอกไม้ไผ่และไม้เจาะรู", "A gabled wooden house with two rooms of bamboo tubes and drilled wood", 30, 2),
} as const satisfies Record<string, Item>;
export const QUALITY_CRAFTS = {
  insectHouse: [["splitPlank", 3], ["carvingBlank", 1], ["pitchSeal", 1]],
} as const;

const seedName = (id: HelperCropId) => `seed${id[0].toUpperCase()}${id.slice(1)}` as `seed${Capitalize<HelperCropId>}`;
const nameOf = (id: HelperCropId): [th: string, en: string] => (id in HERB_NAMES ? HERB_NAMES[id as ForestHerb] : id in MIST_PLANTS ? MIST_PLANTS[id as MistCropId] : [HELPER_ITEMS[id as Exclude<HelperCropId, ForestHerb>].name.th, HELPER_ITEMS[id as Exclude<HelperCropId, ForestHerb>].name.en]);
export const HELPER_IDS = [...Object.keys(HELPER_ITEMS), "mint", "chamomile", "lavender"] as HelperCropId[];
export const HELPER_SEED_ITEMS = Object.fromEntries(HELPER_IDS.map((id) => [seedName(id), item("seed",
  `เมล็ด${nameOf(id)[0]}`, `${nameOf(id)[1]} seeds`,
  id in MIST_PLANTS ? "เมล็ดในซองกระดาษสีเทาหมอก" : "เมล็ดพืชช่วยในซองกระดาษ", id in MIST_PLANTS ? "Seeds in a paper packet the grey of mist" : "Helper plant seeds in a paper packet",
  // (the uncle's family buys back only the four he sells: the others are found by crossing, and kept or traded; a
  // mist child's seed is of its produce's tier)
  HELPER_STARTERS.includes(id) ? 1 : 0, id in MIST_PLANTS ? 3 : 1)])) as Record<`seed${Capitalize<HelperCropId>}`, Item>;

const crop = (id: HelperCropId, hours: number, again: number | null, picks: number, n: number): Crop =>
  ({ seed: seedName(id), hours, yield: [n, n], ...(again ? { again, picks } : {}) });
/** Hours to the first bearing, the hours between bearings, how many bearings, how many a bearing (the design's table). */
export const HELPER_CROPS: Record<HelperCropId, Crop> = {
  runnerBean: crop("runnerBean", 48, 24, 3, 2), peanut: crop("peanut", 72, null, 1, 4), buckwheat: crop("buckwheat", 48, null, 1, 3),
  sesame: crop("sesame", 60, null, 1, 3), clover: crop("clover", 36, 24, 3, 2),
  gardenStrawberry: crop("gardenStrawberry", 48, 24, 3, 2), rhubarb: crop("rhubarb", 72, 36, 3, 2), watercress: crop("watercress", 24, 24, 3, 2),
  fig: crop("fig", 120, 48, 4, 1), chamomile: crop("chamomile", 48, 24, 3, 2),
  borage: crop("borage", 36, 24, 3, 2), lavender: crop("lavender", 72, 36, 3, 2), passionfruit: crop("passionfruit", 96, 36, 4, 2),
  milkweed: crop("milkweed", 48, 24, 3, 2), fennel: crop("fennel", 72, 36, 3, 2),
  marigold: crop("marigold", 36, 24, 3, 2), nasturtium: crop("nasturtium", 48, 24, 3, 2), garlicChives: crop("garlicChives", 36, 24, 3, 2),
  mint: crop("mint", 36, 24, 3, 2), dill: crop("dill", 48, 24, 3, 2),
  // (each mist child grows as its sun child does)
  pearlNut: crop("pearlNut", 72, null, 1, 4), silverGrain: crop("silverGrain", 48, null, 1, 3), dewSesame: crop("dewSesame", 60, null, 1, 3),
  glassFlower: crop("glassFlower", 36, 24, 3, 2), opalStalk: crop("opalStalk", 72, 36, 3, 2), crystalLeaf: crop("crystalLeaf", 24, 24, 3, 2),
  dewFig: crop("dewFig", 120, 48, 4, 1), silkPollen: crop("silkPollen", 48, 24, 3, 2),
};

/**
 * The eight crossings that give the helpers' seeds (the design's section 4): the two parents ripe beside each other,
 * and a pollinator let go on the one that is picked while it grew. The pollinator's sky (`POLLINATOR_SKY`) decides
 * the child: a day insect's ☀ the first, a night insect's 🌙 the second, a pre-dawn insect's 🌫 the third: the sun
 * child's rare form, of the same role and shape, whose produce is worth four times its own (piece 5; the hour it was
 * let go is not asked). The garden's own eight crossings (lib/town/gardening) are as they were.
 */
export const HELPER_CROSSES: ReadonlyArray<readonly [import("./items").CropId, import("./items").CropId, HelperCropId, HelperCropId, MistCropId]> = [
  ["corn", "longBean", "peanut", "lavender", "pearlNut"],
  ["cabbage", "carrot", "buckwheat", "passionfruit", "silverGrain"],
  ["corn", "chili", "sesame", "milkweed", "dewSesame"],
  ["basil", "cabbage", "clover", "fennel", "glassFlower"],
  ["gardenStrawberry", "tomato", "rhubarb", "nasturtium", "opalStalk"],
  ["kangkong", "scallion", "watercress", "garlicChives", "crystalLeaf"],
  ["pumpkin", "tomato", "fig", "mint", "dewFig"],
  ["borage", "lemongrass", "chamomile", "dill", "silkPollen"],
];
/** Each pollinator's sky, fixed by its kind: the moths are the night's, the bees, flies, beetles and butterflies the day's. */
export const POLLINATOR_SKY: Readonly<Record<string, "sun" | "moon" | "mist">> = {
  honeyBee: "sun", carpenterBee: "sun", hoverfly: "sun", pollenMidge: "sun", orchardBeetle: "sun", butterflyWhite: "sun", monarch: "sun", morpho: "sun",
  silkMoth: "moon", moth: "moon", lunaMoth: "moon", hawkMoth: "moon",
  // (the time bands' newcomer pollinators, by their time icon: the two dawn bees are the mist's, whose crossing is piece 5's)
  ...NEW_POLLINATOR_SKY,
  // (the leaf roll's and the shaken branch's pollinators, lib/town/board-insects)
  ...BOARD_POLLINATOR_SKY,
};

/**
 * The plots a helper stands on, for the garden's placing (lib/town/gardening's GARDEN.shapes): each on one plot (the fig
 * too since 2026-10-16, its four a picking cut to one), a line helper turned (its line runs east–west or north–south, as
 * it was turned at its sowing).
 */
export const HELPER_SHAPES: Partial<Record<HelperCropId, number[][]>> = {
  fig: [[0, 0]], dewFig: [[0, 0]],
  sesame: [[0, 0]], watercress: [[0, 0]], borage: [[0, 0]], passionfruit: [[0, 0]], garlicChives: [[0, 0]],
  dewSesame: [[0, 0]], crystalLeaf: [[0, 0]],
};
