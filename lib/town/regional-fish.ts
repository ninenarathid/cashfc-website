import type { Dish, Fish, Item, ItemId } from "./items";
import type { Current, FishingHabitat } from "./river-items";

/** Additional single-habitat species. Existing shared species stay shared. */
const species = <const T extends readonly (readonly [string, string, string, number, string])[]>(rows: T) => rows;
export const REGIONAL_SPECIES = {
  creek: species([
    ["reedMinnow", "ปลาซิวกออ้อ", "Reed minnow", 0, "หางแฉกเล็ก มีแถบข้างตัวใต้หลังสีมะกอก"],
    ["ribbonRasbora", "ปลาซิวริบบิ้น", "Ribbon rasbora", 1, "ลำตัวเรียวยาว มีแถบดำยาวจรดหาง"],
    ["pebbleLoach", "ปลาอีดกรวด", "Pebble loach", 2, "ท้องแบน หนวดสั้น ลายขวางคล้ายกรวด"],
    ["willowShiner", "ปลาซิวใบหลิว", "Willow shiner", 3, "ตัวแบนรูปใบหลิว เกล็ดเงินและหางใส"],
    ["sandGudgeon", "ปลาบู่ทรายลำธาร", "Sand gudgeon", 4, "หัวกลมใหญ่ หลังมีแต้มสีน้ำตาลทราย"],
    ["amberChub", "ปลาพลวงอำพัน", "Amber chub", 5, "ลำตัวอวบสีอำพัน ครีบสั้นปลายแดง"],
    ["fernBarbel", "ปลาหนวดเฟิร์น", "Fern barbel", 6, "หนวดสองคู่ ครีบหลังสูงมีลายใบเฟิร์น"],
    ["redfinDace", "ปลาซิวครีบแดง", "Redfin dace", 0, "เกล็ดเงิน หางแฉกลึกและครีบแดงเล็ก"],
    ["stripedSpinyLoach", "ปลาหมูหนามลาย", "Striped spiny loach", 2, "ลำตัวยาวมีลายตั้งและครีบหลังเป็นหนาม"],
    ["leafPerch", "ปลาหมอใบไม้", "Leaf perch", 3, "ลำตัวสูงรูปใบไม้ ครีบหลังหยักสีน้ำตาล"],
    ["copperBream", "ปลาตะเพียนทองแดง", "Copper bream", 5, "ตัวแบนสูง เกล็ดสีทองแดงและหางง่าม"],
    ["needleHalfbeak", "ปลาเข็มลำธาร", "Creek halfbeak", 7, "ปากล่างเรียวยาว ลำตัวบางและครีบใกล้หาง"],
    ["spottedCreekCatfish", "ปลาดุกดาวลำธาร", "Spotted creek catfish", 6, "หัวแบนมีหนวดยาว หลังแต้มจุดสีครีม"],
    ["saffronLoach", "ปลาหมูหญ้าฝรั่น", "Saffron loach", 2, "ตัวโค้งยาวมีแถบส้มเข้มและหางมน"],
    ["longfinCreekCarp", "ปลาไนครีบยาวลำธาร", "Longfin creek carp", 5, "ลำตัวหนา ครีบยาวเป็นชายและเกล็ดใหญ่"],
    ["orchidSnakehead", "ปลาช่อนกล้วยไม้", "Orchid snakehead", 8, "หัวกว้าง ลำตัวมีปื้นม่วงและครีบหลังยาว"],
    ["creekDragonfish", "ปลามังกรลำธาร", "Creek dragonfish", 7, "ตัวเรียว ปากเชิด หนวดปลายทองและเกล็ดเป็นสัน"],
    ["ancientCreekBarbel", "ปลาหนวดเฒ่าลำธาร", "Ancient creek barbel", 6, "หนวดยาวโค้ง ครีบหลังสูงและเกล็ดสีหินเก่า"],
  ]),
  headwater: species([
    ["silverSpringDace", "ปลาซิวเงินต้นน้ำ", "Silver spring dace", 0, "ตัวเล็กเกล็ดเงิน หางแฉกและเส้นข้างตัวสีฟ้า"],
    ["rockSculpin", "ปลาหัวโตหิน", "Rock sculpin", 4, "หัวใหญ่มีสัน ครีบอกแผ่แนบพื้นหิน"],
    ["mossLoach", "ปลาหมูมอส", "Moss loach", 2, "ตัวเรียวยาวมีลายด่างสีมอสและหนวดสั้น"],
    ["swiftGrayling", "ปลาเกรย์ลิงน้ำไหล", "Swift grayling", 1, "ครีบหลังเป็นพัดสูง ลำตัวเรียวสีเงิน"],
    ["bluefinTrout", "ปลาเทราต์ครีบฟ้า", "Bluefin trout", 1, "หลังลายจุด ครีบสามเหลี่ยมสีฟ้าและหางเว้า"],
    ["mountainWhitefish", "ปลาขาวภูเขา", "Mountain whitefish", 3, "ท้องสีขาว หลังเงินครีบเล็กและหางง่าม"],
    ["cascadeChar", "ปลาชาร์น้ำลดหลั่น", "Cascade char", 1, "ท้องสีส้ม หลังแต้มจุดและครีบอกขอบขาว"],
    ["graniteGoby", "ปลาบู่หินแกรนิต", "Granite goby", 4, "หัวกลม ครีบหลังสองตอนและแต้มสีหิน"],
    ["windfinMahseer", "ปลาพลวงครีบลม", "Windfin mahseer", 5, "เกล็ดใหญ่ หางแฉกกว้างและครีบยาวปลายใส"],
    ["crimsonHillBarb", "ปลาตะเพียนแดงดอย", "Crimson hill barb", 5, "ตัวสูงเกล็ดแดง มีแถบดำที่โคนหาง"],
    ["snowlineTrout", "ปลาเทราต์ยอดดอย", "Snowline trout", 1, "ลำตัวเรียวแต้มขาว หลังสีฟ้าเข้ม"],
    ["ridgePike", "ปลาไพก์สันเขา", "Ridge pike", 7, "ปากยาวแบน ลำตัวทรงหอกมีลายตั้ง"],
    ["mistSalmon", "ปลาแซลมอนม่านหมอก", "Mist salmon", 1, "หลังสูงเป็นโค้ง ครีบสั้นและเกล็ดเงินอมม่วง"],
    ["blackstoneEel", "ปลาไหลหินดำ", "Blackstone eel", 8, "ตัวยาวโค้งสีดำ ครีบหลังต่อถึงปลายหาง"],
    ["cloudCrownMahseer", "ปลาพลวงมงกุฎเมฆ", "Cloud-crown mahseer", 6, "เกล็ดหนาสีฟ้า ครีบหลังสูงคล้ายมงกุฎ"],
    ["thunderbackSturgeon", "ปลาสเตอร์เจียนหลังสายฟ้า", "Thunderback sturgeon", 7, "จมูกยาว หลังมีสันกระดูกสลับฟ้าและทอง"],
  ]),
  pool: species([
    ["poolMedaka", "ปลาซิวแอ่งใส", "Pool medaka", 0, "ตัวเล็กใส ดวงตากลมและครีบหลังค่อนไปทางหาง"],
    ["lilyGourami", "ปลากระดี่ใบบัว", "Lily gourami", 3, "ตัวแบนสูง มีครีบท้องเป็นเส้นยาวสองเส้น"],
    ["moonspotGoby", "ปลาบู่จุดจันทร์", "Moonspot goby", 4, "หัวโตสั้น มีจุดสีขาวกลมเหนือครีบอก"],
    ["mossfinPerch", "ปลาหมอครีบมอส", "Mossfin perch", 3, "ครีบหลังหยักสูง ลายเขียวเข้มพาดตัว"],
    ["roundtailBetta", "ปลากัดหางกลมแอ่งน้ำ", "Roundtail pool betta", 5, "ตัวสั้นมีครีบหางกลมใหญ่และครีบท้องเรียว"],
    ["duskFeatherfin", "ปลาครีบขนนกพลบค่ำ", "Dusk featherfin", 1, "ครีบยาวแยกเป็นริ้ว ลำตัวสีม่วงหม่น"],
    ["petalKillifish", "ปลาซิวครีบกลีบ", "Petal killifish", 0, "ตัวสั้นมีครีบหางแผ่เป็นกลีบสีส้ม"],
    ["caveGlassPerch", "ปลาหมอแก้วถ้ำ", "Cave glass perch", 3, "ลำตัวใสทรงข้าวหลามตัด มีสันครีบสูง"],
    ["spottedPoolCatfish", "ปลาดุกดาวแอ่งลึก", "Spotted pool catfish", 6, "หัวแบนใหญ่มีหนวด ลำตัวแต้มจุดสีทอง"],
    ["ivoryKnifefish", "ปลากรายงาช้าง", "Ivory knifefish", 8, "ตัวโค้งคล้ายใบมีด ครีบท้องยาวต่อถึงหาง"],
    ["jadeSleeper", "ปลาบู่นอนหยก", "Jade sleeper", 4, "หัวกว้าง ครีบอกกลมใหญ่และเกล็ดเขียวหยก"],
    ["caveRibbonEel", "ปลาไหลริบบิ้นถ้ำ", "Cave ribbon eel", 8, "ตัวบางยาวเป็นริบบิ้น มีครีบขอบฟ้าอ่อน"],
    ["violetCaveChar", "ปลาชาร์ม่วงถ้ำ", "Violet cave char", 1, "หลังม่วงลายจุด ครีบอกเล็กขอบสีครีม"],
    ["mirrorPoolCarp", "ปลาไนกระจกแอ่งน้ำ", "Mirror pool carp", 5, "ตัวหนามีเกล็ดใหญ่เพียงบางแถวคล้ายกระจก"],
    ["starfinBichir", "ปลาครีบดาวแอ่งลึก", "Starfin bichir", 7, "ตัวทรงกระบอก มีครีบหลังแยกเป็นยอดหลายอัน"],
    ["moonveilArowana", "ปลาอะโรวานาม่านจันทร์", "Moonveil arowana", 7, "ปากเชิด เกล็ดใหญ่และครีบยาวขอบสีเงิน"],
    ["crystalCaveDragon", "ปลามังกรถ้ำผลึก", "Crystal cave dragon", 6, "หนวดยาว หลังเป็นสันผลึกและหางแฉกสีฟ้า"],
  ]),
} as const;
export type RegionalHabitat = keyof typeof REGIONAL_SPECIES;
export type RegionalFishId = (typeof REGIONAL_SPECIES)[RegionalHabitat][number][0];
const entries = Object.entries(REGIONAL_SPECIES).flatMap(([habitat, rows]) => rows.map((row, index) => ({ habitat: habitat as RegionalHabitat, row, index, count: rows.length })));
const rank = (index: number, count: number): Fish["tier"] => index >= count - 2 ? "legend" : index >= 12 ? "rare" : index >= 6 ? "uncommon" : "common";
const stage = (tier: Fish["tier"]): Item["tier"] => tier === "common" ? 1 : tier === "uncommon" ? 2 : 3;
export const REGIONAL_FISH_ITEMS = Object.fromEntries(entries.map(({ row: [id, th, en, , look], index, count }) => {
  const tier = rank(index, count), pays = ({ common: 10, uncommon: 20, rare: 38, legend: 70 })[tier] + index % 3 * 2;
  return [id, { kind: "fish", tier: stage(tier), name: { th, en }, about: { th: look, en: `${en}, with a distinctive body, fins and markings.` }, stack: 10, pays } satisfies Item];
})) as Record<RegionalFishId, Item>;
export const REGIONAL_FISH = Object.fromEntries(entries.map(({ habitat, row: [id, , , shape], index, count }) => {
  const tier = rank(index, count), difficulty = ({ common: 0, uncommon: 1, rare: 2, legend: 3 })[tier];
  const primary = (["worm", "dough", "corn", "cricket", "branBait", "shrimpLive", "minnow", "antEggs", "fermentedBait", "shadeLure", "loach"] as const)[index % 11];
  const pockets: Current[] = habitat === "pool" ? index % 2 ? ["shelter"] : ["eddy"] : index % 3 === 0 ? ["eddy", "shelter"] : index % 3 === 1 ? ["run"] : ["shelter", "run"];
  const windows: Array<Array<[number, number]>> = [[[5, 19]], [[17, 24], [0, 6]], [[5, 9], [16, 20]], [[8, 17]]];
  const hours: Array<[number, number]> = index < 3 ? [[0, 24]] : windows[index % 4];
  const styles: Fish["fight"]["style"][] = ["darter", "leaper", "sleeper", "slippery", "steady"];
  return [id, { tier, habitat: [habitat], current: pockets, baits: { [primary]: 1, ...(primary !== "worm" && difficulty < 2 ? { worm: 0.45 } : {}) }, hours,
    rain: 0.8 + index % 4 * 0.3, wait: [5 + difficulty * 5, 24 + difficulty * 18], size: [8 + difficulty * 15 + shape, 18 + difficulty * 25 + shape * 2],
    ...(tier === "legend" && index === count - 1 ? { needs: ["after" as const] } : {}),
    fight: { style: styles[(shape + index) % styles.length], band: 0.24 - difficulty * 0.025, pull: 0.1 + difficulty * 0.07 + index % 3 * 0.02, surge: 0.3 + difficulty * 0.11,
      line: 0.65 + difficulty * 0.3, effort: 2 + difficulty * 3, every: [2.6 - difficulty * 0.2, 5 - difficulty * 0.3], sway: 0.16 + index % 3 * 0.035, pace: 0.09 + difficulty * 0.014 } } satisfies Fish];
})) as Record<RegionalFishId, Fish>;

// Six discoverable meals per habitat. Every added fish is an actual ingredient.
const menus = {
  creek: [
    ["reedFishCongee", "โจ๊กปลาริมกออ้อ", "Reed-bank fish congee", "pot", "calm"],
    ["sandbankSkillet", "ปลากระทะหาดทราย", "Sandbank fish skillet", "pan", "keen"],
    ["fernBarbelStew", "หม้อปลาหนวดใบเฟิร์น", "Fern barbel stew", "pot", "current"],
    ["creekHerbGrill", "ปลาลำธารย่างสมุนไพร", "Creek herb grill", "grill", "traces"],
    ["orchidFishHotpot", "หม้อปลากล้วยไม้", "Orchid fish hotpot", "pot", "hearty"],
    ["ancientCreekFeast", "สำรับมังกรลำธาร", "Ancient creek feast", "grill", "current"],
  ],
  headwater: [
    ["springFishCongee", "โจ๊กปลาต้นน้ำ", "Spring fish congee", "pot", "calm"],
    ["bluefinMountainPan", "ปลาครีบฟ้ากระทะดอย", "Bluefin mountain skillet", "pan", "keen"],
    ["cascadeHerbStew", "แกงปลาน้ำลดหลั่น", "Cascade herb stew", "pot", "layers"],
    ["ridgeFishGrill", "ปลาสันเขาย่าง", "Ridge fish grill", "grill", "grain"],
    ["mistFishBroth", "ซุปปลาม่านหมอก", "Mist fish broth", "pot", "waterProperty"],
    ["cloudCrownFeast", "สำรับมงกุฎเมฆ", "Cloud-crown feast", "grill", "current"],
  ],
  pool: [
    ["lilyPoolCongee", "โจ๊กปลาแอ่งใบบัว", "Lily-pool fish congee", "pot", "green"],
    ["duskFishSkillet", "ปลาพลบค่ำกระทะหอม", "Dusk fish skillet", "pan", "scent"],
    ["glassCaveSoup", "ซุปปลาแก้วถ้ำ", "Glass cave fish soup", "pot", "calm"],
    ["jadeFishGrill", "ปลาหยกย่าง", "Jade fish grill", "grill", "pollen"],
    ["mirrorPoolStew", "หม้อปลากระจกแอ่งลึก", "Mirror-pool stew", "pot", "seasoning"],
    ["moonveilFeast", "สำรับม่านจันทร์", "Moonveil feast", "grill", "campPreparation"],
  ],
} as const;
export type RegionalDishId = (typeof menus)[RegionalHabitat][number][0];
export const REGIONAL_DISH_ITEMS = Object.fromEntries(Object.values(menus).flatMap(rows => rows.map(([id, th, en], i) => [id,
  { kind: "dish", tier: i < 2 ? 2 : 3, name: { th, en }, about: { th: "เนื้อปลาหลายชิ้นเรียงกับข้าวและใบสมุนไพร", en: "Several pieces of fish with rice and herbs." }, stack: 5, pays: 18 + i * 4 } satisfies Item
]))) as Record<RegionalDishId, Item>;
export const REGIONAL_DISHES = Object.fromEntries(Object.entries(menus).flatMap(([habitat, rows]) => {
  const fish = REGIONAL_SPECIES[habitat as RegionalHabitat], count = fish.length;
  return rows.map(([id, , , cookware, buff], i) => {
    const start = Math.floor(i * count / 6), end = Math.floor((i + 1) * count / 6);
    const needs: Array<[ItemId, number]> = [...fish.slice(start, end).map(row => [row[0], 1] as [ItemId, number]), ["rice", 2], [i % 2 ? "lemongrass" : "scallion", 1]];
    return [id, { stamina: 26 + i * 3, buff, recipe: { needs, in: [cookware], serves: 3 + Math.floor(i / 2), cooks: 1 } } satisfies Dish];
  });
})) as Record<RegionalDishId, Dish>;
export const REGIONAL_ITEMS = { ...REGIONAL_FISH_ITEMS, ...REGIONAL_DISH_ITEMS };
export type RegionalScrollId = `scroll${Capitalize<RegionalDishId>}`;
export const REGIONAL_SCROLLS = Object.fromEntries(Object.keys(REGIONAL_DISHES).map(id => [`scroll${id[0].toUpperCase()}${id.slice(1)}`, id])) as Record<RegionalScrollId, RegionalDishId>;
export const REGIONAL_SCROLL_ITEMS = Object.fromEntries(Object.entries(REGIONAL_SCROLLS).map(([id,dish]) => [id, {
  kind: "scroll", tier: REGIONAL_DISH_ITEMS[dish].tier, name: { th: `ม้วนสูตร ${REGIONAL_DISH_ITEMS[dish].name.th}`, en: `Recipe scroll: ${REGIONAL_DISH_ITEMS[dish].name.en}` },
  about: { th: "กระดาษม้วนมีภาพปลาและชาม เขียนด้วยหมึกสีน้ำตาล", en: "A paper scroll with a fish and bowl sketch in brown ink." }, stack: 5, pays: REGIONAL_DISH_ITEMS[dish].tier === 2 ? 22 : 28,
} satisfies Item])) as Record<RegionalScrollId, Item>;
export const REGIONAL_HABITATS: FishingHabitat[] = ["creek", "headwater", "pool"];
