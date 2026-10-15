import type { Crop, Item } from "./items";
import { NEW_POLLINATOR_SKY } from "./band-species";

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
  | "marigold" | "nasturtium" | "garlicChives" | "mint" | "dill";

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
} as const satisfies Record<Exclude<HelperCropId, ForestHerb>, Item>;

const seedName = (id: HelperCropId) => `seed${id[0].toUpperCase()}${id.slice(1)}` as `seed${Capitalize<HelperCropId>}`;
const nameOf = (id: HelperCropId): [th: string, en: string] => (id in HERB_NAMES ? HERB_NAMES[id as ForestHerb] : [HELPER_ITEMS[id as Exclude<HelperCropId, ForestHerb>].name.th, HELPER_ITEMS[id as Exclude<HelperCropId, ForestHerb>].name.en]);
export const HELPER_IDS = [...Object.keys(HELPER_ITEMS), "mint", "chamomile", "lavender"] as HelperCropId[];
export const HELPER_SEED_ITEMS = Object.fromEntries(HELPER_IDS.map((id) => [seedName(id), item("seed",
  `เมล็ด${nameOf(id)[0]}`, `${nameOf(id)[1]} seeds`, "เมล็ดพืชช่วยในซองกระดาษ", "Helper plant seeds in a paper packet",
  // (the uncle's family buys back only the four he sells: the others are found by crossing, and kept or traded)
  HELPER_STARTERS.includes(id) ? 1 : 0)])) as Record<`seed${Capitalize<HelperCropId>}`, Item>;

const crop = (id: HelperCropId, hours: number, again: number | null, picks: number, n: number): Crop =>
  ({ seed: seedName(id), hours, yield: [n, n], ...(again ? { again, picks } : {}) });
/** Hours to the first bearing, the hours between bearings, how many bearings, how many a bearing (the design's table). */
export const HELPER_CROPS: Record<HelperCropId, Crop> = {
  runnerBean: crop("runnerBean", 48, 24, 3, 2), peanut: crop("peanut", 72, null, 1, 4), buckwheat: crop("buckwheat", 48, null, 1, 3),
  sesame: crop("sesame", 60, null, 1, 3), clover: crop("clover", 36, 24, 3, 2),
  gardenStrawberry: crop("gardenStrawberry", 48, 24, 3, 2), rhubarb: crop("rhubarb", 72, 36, 3, 2), watercress: crop("watercress", 24, 24, 3, 2),
  fig: crop("fig", 120, 48, 4, 4), chamomile: crop("chamomile", 48, 24, 3, 2),
  borage: crop("borage", 36, 24, 3, 2), lavender: crop("lavender", 72, 36, 3, 2), passionfruit: crop("passionfruit", 96, 36, 4, 2),
  milkweed: crop("milkweed", 48, 24, 3, 2), fennel: crop("fennel", 72, 36, 3, 2),
  marigold: crop("marigold", 36, 24, 3, 2), nasturtium: crop("nasturtium", 48, 24, 3, 2), garlicChives: crop("garlicChives", 36, 24, 3, 2),
  mint: crop("mint", 36, 24, 3, 2), dill: crop("dill", 48, 24, 3, 2),
};

/**
 * The eight crossings that give the helpers' seeds (the design's section 4): the two parents ripe beside each other,
 * and a pollinator let go on the one that is picked while it grew. The pollinator's sky (`POLLINATOR_SKY`) decides
 * the child: a day insect's ☀ the first, a night insect's 🌙 the second (the hour it was let go is not asked; the
 * pre-dawn insects' 🌫 child comes with them). The garden's own eight crossings (lib/town/gardening) are as they were.
 */
export const HELPER_CROSSES: ReadonlyArray<readonly [import("./items").CropId, import("./items").CropId, HelperCropId, HelperCropId]> = [
  ["corn", "longBean", "peanut", "lavender"],
  ["cabbage", "carrot", "buckwheat", "passionfruit"],
  ["corn", "chili", "sesame", "milkweed"],
  ["basil", "cabbage", "clover", "fennel"],
  ["gardenStrawberry", "tomato", "rhubarb", "nasturtium"],
  ["kangkong", "scallion", "watercress", "garlicChives"],
  ["pumpkin", "tomato", "fig", "mint"],
  ["borage", "lemongrass", "chamomile", "dill"],
];
/** Each pollinator's sky, fixed by its kind: the moths are the night's, the bees, flies, beetles and butterflies the day's. */
export const POLLINATOR_SKY: Readonly<Record<string, "sun" | "moon" | "mist">> = {
  honeyBee: "sun", carpenterBee: "sun", hoverfly: "sun", pollenMidge: "sun", orchardBeetle: "sun", butterflyWhite: "sun", monarch: "sun", morpho: "sun",
  silkMoth: "moon", moth: "moon", lunaMoth: "moon", hawkMoth: "moon",
  // (the time bands' newcomer pollinators, by their time icon: the two dawn bees are the mist's, whose crossing is piece 5's)
  ...NEW_POLLINATOR_SKY,
};

/**
 * The plots a helper stands on, for the garden's placing (lib/town/gardening's GARDEN.shapes): the fig on 2×2, and each
 * line helper on one plot, but turned (its line runs east–west or north–south, as it was turned at its sowing).
 */
export const HELPER_SHAPES: Partial<Record<HelperCropId, number[][]>> = {
  fig: [[0, 0], [1, 0], [0, 1], [1, 1]],
  sesame: [[0, 0]], watercress: [[0, 0]], borage: [[0, 0]], passionfruit: [[0, 0]], garlicChives: [[0, 0]],
};
