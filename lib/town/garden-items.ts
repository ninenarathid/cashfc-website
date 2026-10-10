import type { Crop, Dish, Item, Make } from "./items";
const item = (kind: Item["kind"], th: string, en: string, lookTh: string, lookEn: string, pays: number, tier: Item["tier"] = 2): Item => ({ kind, tier, name: { th, en }, about: { th: lookTh, en: lookEn }, stack: kind === "tool" ? 1 : 20, pays });
/** Eight crops, seven preparations, six garden tools and four meals; seeds are companions. */
export const GARDEN_ITEMS = {
  bottleGourd: item("crop", "น้ำเต้าค้าง", "Trellis gourd", "ผลสีเขียวอ่อนเอวคอดสองพู", "A pale green gourd with two rounded lobes", 7),
  rowBean: item("crop", "ถั่วแถวคู่", "Paired-row bean", "ฝักแบนสีเขียวมีเมล็ดนูนเรียงแถว", "Flat green pods with a row of raised beans", 6),
  trellisBerry: item("crop", "เบอร์รีค้าง", "Trellis berry", "ผลสีม่วงแดงรวมกันเป็นพวง", "A cluster of deep red-purple berries", 10, 3),
  blueCorn: item("crop", "ข้าวโพดสีน้ำเงิน", "Blue corn", "ฝักสั้นเมล็ดสีน้ำเงินม่วงหุ้มใบเขียว", "A short ear of blue-purple kernels in green husks", 8, 3),
  teaBush: item("crop", "ยอดชาพุ่ม", "Garden tea tips", "ยอดใบชาสามใบสีเขียวเข้ม", "Three dark green tea leaves on a tender shoot", 8, 3),
  sunflowerPatch: item("crop", "เมล็ดทานตะวันสวน", "Garden sunflower seeds", "เมล็ดเปลือกดำขาวกองในหัวดอกแห้ง", "Striped seeds nestled in a dry flower head", 6),
  redOkra: item("crop", "กระเจี๊ยบแดงสวน", "Red garden okra", "ฝักยาวเป็นเหลี่ยมสีแดงม่วง", "Long ridged pods with a red-purple skin", 7),
  lotusRootBed: item("crop", "รากบัวสวน", "Garden lotus root", "รากสีครีมเป็นปล้องมีรูในหน้าตัด", "Cream-coloured root segments with hollow cross sections", 9),
  gourdCup: item("goods", "ถ้วยน้ำเต้า", "Gourd cup", "เปลือกน้ำเต้าขัดเป็นถ้วยสีน้ำตาลอ่อน", "A polished pale brown gourd shell cup", 10),
  beanPaste: item("staple", "ถั่วบดสวน", "Garden bean paste", "เนื้อถั่วบดสีเขียวในถ้วยไม้", "Green bean paste in a wooden cup", 8),
  berryJam: item("staple", "แยมเบอร์รีค้าง", "Trellis berry jam", "แยมสีแดงเข้มข้นในไหเล็ก", "Thick dark red jam in a small jar", 13, 3),
  blueCornFlour: item("staple", "แป้งข้าวโพดน้ำเงิน", "Blue corn flour", "ผงแป้งสีม่วงน้ำเงินในถุงผ้า", "Blue-purple flour in a cloth sack", 10, 3),
  driedTea: item("staple", "ชาสวนคั่ว", "Roasted garden tea", "ใบชาสีน้ำตาลเข้มม้วนเป็นเส้น", "Rolled dark brown roasted tea leaves", 12, 3),
  sunflowerOil: item("staple", "น้ำมันทานตะวัน", "Garden sunflower oil", "น้ำมันสีทองใสในขวดเล็ก", "Clear golden oil in a small bottle", 9),
  lotusStarch: item("staple", "แป้งรากบัว", "Lotus root starch", "แป้งสีขาวละเอียดในห่อใบไม้", "Fine white starch in a leaf parcel", 10),
  pollenBrush: item("tool", "พู่กันเกสร", "Pollen brush", "พู่กันขนนุ่มปลายเหลืองด้ามไม้", "A wooden brush with soft yellow-tipped bristles", 24),
  graftKnife: item("tool", "มีดทาบยอด", "Grafting knife", "มีดสั้นปลายโค้งด้ามไม้สีเข้ม", "A short curved knife with a dark wooden handle", 25),
  rootGuide: item("tool", "กรอบนำราก", "Root guide", "กรอบไม้สามช่องผูกเชือก", "A cord-bound wooden frame with three spaces", 20),
  soilScoop: item("tool", "ช้อนดินสวน", "Garden soil scoop", "ช้อนทองแดงปากกว้างด้ามสั้น", "A wide copper scoop with a short handle", 23),
  seedTray: item("tool", "ถาดคัดเมล็ด", "Seed sorting tray", "ถาดไม้แบ่งช่องมีเมล็ดสามกอง", "A divided wooden tray holding three piles of seeds", 22),
  gardenTwine: item("tool", "สายผูกค้าง", "Trellis ties", "เชือกเขียวม้วนมีหมุดไม้สองอัน", "Coiled green cord with two wooden pegs", 21),
  pollenRice: item("dish", "ข้าวชาวสวน", "Gardener's rice", "ข้าวสีครีมแต่งฝักถั่วเขียว", "Cream rice topped with green bean pods", 21),
  berryTea: item("dish", "ชาเบอร์รีสวน", "Garden berry tea", "ถ้วยชาสีแดงมีใบชาลอย", "A cup of red tea with floating leaves", 24, 3),
  blueCornCake: item("dish", "เค้กข้าวโพดน้ำเงิน", "Blue corn cake", "เค้กกลมสีม่วงน้ำเงินบนใบไม้", "A round blue-purple cake on a leaf", 25, 3),
  lotusGardenSoup: item("dish", "ซุปรากบัวชาวสวน", "Gardener's lotus soup", "ซุปใสมีรากบัวและฝักแดง", "Clear soup with lotus root and red pods", 23),
} as const;
export type GardenCropId = "bottleGourd" | "rowBean" | "trellisBerry" | "blueCorn" | "teaBush" | "sunflowerPatch" | "redOkra" | "lotusRootBed";
export type GardenDishId = "pollenRice" | "berryTea" | "blueCornCake" | "lotusGardenSoup";
export const GARDEN_TOOLS = ["pollenBrush", "graftKnife", "rootGuide", "soilScoop", "seedTray", "gardenTwine"] as const;
export const GARDEN_CROPS: Record<GardenCropId, Crop> = {
  bottleGourd: { seed: "seedBottleGourd", hours: 72, yield: [4, 6], again: 36, picks: 3 },
  rowBean: { seed: "seedRowBean", hours: 60, yield: [6, 8], again: 24, picks: 3 },
  trellisBerry: { seed: "seedTrellisBerry", hours: 192, yield: [6, 8], again: 48, picks: 5 },
  blueCorn: { seed: "seedBlueCorn", hours: 120, yield: [6, 8] },
  teaBush: { seed: "seedTeaBush", hours: 168, yield: [6, 8], again: 48, picks: 5 },
  sunflowerPatch: { seed: "seedSunflowerPatch", hours: 72, yield: [6, 10] },
  redOkra: { seed: "seedRedOkra", hours: 72, yield: [6, 8], again: 24, picks: 3 },
  lotusRootBed: { seed: "seedLotusRootBed", hours: 120, yield: [4, 6] },
};
export const GARDEN_SEED_ITEMS = Object.fromEntries(Object.entries(GARDEN_CROPS).map(([crop, rule]) => [rule.seed, item("seed", `เมล็ด${GARDEN_ITEMS[crop as GardenCropId].name.th}`, `${GARDEN_ITEMS[crop as GardenCropId].name.en} seeds`, "เมล็ดพันธุ์ในซองใบไม้", "Garden seeds in a folded leaf packet", 4, GARDEN_ITEMS[crop as GardenCropId].tier)])) as Record<`seed${Capitalize<GardenCropId>}`, Item>;
export const GARDEN_MAKES = {
  gourdCup: { needs: [["bottleGourd", 2]], in: ["cleaver"], gives: 2 },
  beanPaste: { needs: [["rowBean", 3]], in: ["mortar"], gives: 2 },
  berryJam: { needs: [["trellisBerry", 3], ["sugar", 1]], in: ["pot"], gives: 2 },
  blueCornFlour: { needs: [["blueCorn", 3]], in: ["mortar"], gives: 2 },
  driedTea: { needs: [["teaBush", 3]], in: ["pan"], gives: 2 },
  sunflowerOil: { needs: [["sunflowerPatch", 3]], in: ["mortar"], gives: 2 },
  lotusStarch: { needs: [["lotusRootBed", 3]], in: ["mortar"], gives: 2 },
} satisfies Record<string, Make>;
export const GARDEN_CRAFTS = {
  pollenBrush: [["feather", 3], ["splitPlank", 1]], graftKnife: [["steelPlate", 1], ["gourdCup", 1]],
  rootGuide: [["splitPlank", 2], ["rootTwine", 1]], soilScoop: [["copperBlank", 1], ["timber", 1]],
  seedTray: [["splitPlank", 2], ["pitchSeal", 1]], gardenTwine: [["rootTwine", 2], ["splitPlank", 1]],
  seedBottleGourd: [["pumpkin", 2], ["compost", 1]], seedRowBean: [["longBean", 2], ["compost", 1]],
  seedTrellisBerry: [["wildStrawberry", 2], ["compost", 1]], seedBlueCorn: [["corn", 2], ["compost", 1]],
  seedTeaBush: [["basil", 2], ["compost", 1]], seedSunflowerPatch: [["corn", 2], ["oil", 1]],
  seedRedOkra: [["chili", 2], ["compost", 1]], seedLotusRootBed: [["taro", 2], ["compost", 1]],
} as const;
export const GARDEN_DISHES: Record<GardenDishId, Dish> = {
  pollenRice: { stamina: 26, buff: "pollen", recipe: { needs: [["beanPaste", 1], ["rice", 2]], in: ["pot"], serves: 3, cooks: 1 } },
  berryTea: { stamina: 24, buff: "pollen", recipe: { needs: [["driedTea", 1], ["berryJam", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  blueCornCake: { stamina: 30, buff: "pollen", recipe: { needs: [["blueCornFlour", 2], ["sunflowerOil", 1], ["sugar", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  lotusGardenSoup: { stamina: 28, buff: "pollen", recipe: { needs: [["lotusStarch", 1], ["lotusRootBed", 2], ["redOkra", 2]], in: ["pot"], serves: 3, cooks: 1 } },
};
export const GARDEN_SCROLLS = { scrollPollenRice: "pollenRice", scrollBerryTea: "berryTea", scrollBlueCornCake: "blueCornCake", scrollLotusGardenSoup: "lotusGardenSoup" } as const;
export const GARDEN_SCROLL_ITEMS = Object.fromEntries(Object.entries(GARDEN_SCROLLS).map(([id, dish]) => [id, item("scroll", `ม้วนสูตร ${GARDEN_ITEMS[dish].name.th}`, `Recipe scroll: ${GARDEN_ITEMS[dish].name.en}`, "ม้วนกระดาษผูกเชือกแดง", "A parchment roll tied with red cord", 12, GARDEN_ITEMS[dish].tier)])) as Record<keyof typeof GARDEN_SCROLLS, Item>;
