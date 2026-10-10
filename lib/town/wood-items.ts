import type { Dish, Item, Make } from "./items";

const item = (kind: Item["kind"], th: string, en: string, shapeTh: string, shapeEn: string, pays: number, tier: 2 | 3 = 2): Item =>
  ({ kind, tier, name: { th, en }, about: { th: shapeTh, en: shapeEn }, stack: kind === "tool" ? 1 : 20, pays });
const wood = (th: string, en: string, thShape: string, enShape: string, pays: number, tier: 2 | 3 = 2) => item("wood", th, en, thShape, enShape, pays, tier);
const goods = (th: string, en: string, thShape: string, enShape: string, pays: number) => item("goods", th, en, thShape, enShape, pays);
const tool = (th: string, en: string, thShape: string, enShape: string, pays: number) => item("tool", th, en, thShape, enShape, pays);
const dish = (th: string, en: string, thShape: string, enShape: string, pays: number) => item("dish", th, en, thShape, enShape, pays);

/** Eight harvested parts, seven preparations, six field tools and four meals. */
export const WOOD_ITEMS = {
  knottedWood: wood("ไม้ติดปม", "Knotted wood", "ท่อนไม้สีน้ำผึ้ง มีปมกลมเข้ม", "Honey-colored wood with dark round knots", 3),
  straightWood: wood("ไม้เสี้ยนตรง", "Straight-grained wood", "ชิ้นไม้เรียวยาว ลายเสี้ยนเรียงขนาน", "A long piece with parallel grain", 5),
  heartwood: wood("แก่นไม้", "Heartwood", "แก่นไม้สีอำพัน วงปีแน่นละเอียด", "Amber wood with close fine rings", 8, 3),
  pineBark: wood("เปลือกสน", "Pine bark", "แผ่นเปลือกสีน้ำตาลแดง ขอบขรุขระ", "Rough-edged plates of red-brown bark", 2),
  pinePitch: wood("ชันสนสด", "Fresh pine pitch", "หยดชันสีเหลืองใส เหนียวเป็นสาย", "Clear yellow pitch drawn into sticky threads", 4),
  pineNut: wood("เมล็ดสน", "Pine nuts", "เมล็ดรีสีงาช้าง หุ้มเปลือกบาง", "Ivory oval kernels in thin skins", 4),
  rootFiber: wood("ใยรากไม้", "Root fiber", "เส้นใยยาวสีน้ำตาลอ่อนพันเป็นวง", "Long tan fibers wound in a loop", 3),
  cedarSliver: wood("ชิ้นซีดาร์เก่าแก่", "Ancient cedar sliver", "ชิ้นไม้สีแดงเข้ม มีวงปีถี่และกลิ่นหอม", "Deep red wood with close rings and a fragrant scent", 12, 3),
  splitPlank: goods("แผ่นไม้ผ่า", "Split plank", "แผ่นไม้บางขอบตรง ลายเสี้ยนตลอดแนว", "A thin straight-edged board with long grain", 5),
  carvingBlank: goods("ชิ้นไม้สำหรับแกะ", "Carving blank", "แท่งไม้หน้าตัดสี่เหลี่ยม ขอบมน", "A square-cut wooden block with rounded edges", 7),
  pitchSeal: goods("ชันอุดรอยต่อ", "Pitch seal", "ชันสีน้ำตาลเข้มในห่อใบไม้", "Dark pitch wrapped in a leaf", 6),
  sapSyrup: goods("น้ำเชื่อมสน", "Pine syrup", "น้ำเชื่อมสีทองข้นในถ้วยดิน", "Thick golden syrup in an earthen cup", 6),
  pineNutFlour: goods("แป้งเมล็ดสน", "Pine nut flour", "ผงสีครีมละเอียดในถุงผ้า", "Fine cream powder in a cloth bag", 5),
  rootTwine: goods("เชือกใยราก", "Root twine", "เชือกสีน้ำตาลถักแน่นม้วนกลม", "A round coil of tightly braided brown cord", 6),
  woodOil: goods("น้ำมันรักษาไม้", "Wood oil", "น้ำมันสีอำพันในขวดเล็กปิดจุก", "Amber oil in a small corked bottle", 8),
  notchGauge: tool("เกจวัดรอยบาก", "Notch gauge", "ไม้บรรทัดสั้นมีปากวัดทองเหลือง", "A short ruler with brass jaws", 24),
  grainLens: tool("เลนส์ลายไม้", "Grain lens", "เลนส์กลมกรอบไม้สีแดง", "A round lens in a red wooden frame", 40),
  fellingWedge: tool("ลิ่มโค่นไม้", "Felling wedge", "ลิ่มเหล็กสามเหลี่ยม ปลายบางคม", "A triangular steel wedge with a thin tip", 26),
  barkKnife: tool("มีดลอกเปลือก", "Bark knife", "ใบมีดโค้งสองด้าม มีปลอกหนัง", "A curved two-handled blade in a leather sheath", 25),
  sapTap: tool("ปากรองชัน", "Pitch tap", "ท่อทองแดงสั้นกับถ้วยเล็ก", "A short copper spout with a little cup", 25),
  braceStake: tool("หลักประคองต้น", "Bracing stake", "หลักไม้ปลายแหลมพันเชือกใยราก", "A pointed wooden stake bound with root twine", 30),
  pineNutRice: dish("ข้าวเมล็ดสน", "Pine nut rice", "ข้าวอุ่นโรยเมล็ดสนสีน้ำตาลทอง", "Warm rice scattered with golden pine nuts", 18),
  cedarBroth: { ...dish("ซุปควันซีดาร์", "Cedar-smoked broth", "ซุปใสมีปลาและใบหอม ควันกรุ่น", "Clear fish broth with herbs and a wisp of smoke", 24), tier: 3 },
  pineNutCake: dish("เค้กเมล็ดสน", "Pine nut cake", "เค้กแผ่นเล็กสีครีมมีขอบกรอบ", "A small cream cake with a crisp edge", 20),
  sapGlazedFish: dish("ปลาย่างเคลือบน้ำเชื่อม", "Syrup-glazed fish", "ปลาย่างผิวสีทองมันวาวบนใบไม้", "Glossy golden grilled fish on a leaf", 22),
} as const satisfies Record<string, Item>;
export type WoodItemId = keyof typeof WOOD_ITEMS;
export type WoodDishId = "pineNutRice" | "cedarBroth" | "pineNutCake" | "sapGlazedFish";
export const WOOD_SCROLLS = { scrollPineNutRice: "pineNutRice", scrollCedarBroth: "cedarBroth", scrollPineNutCake: "pineNutCake", scrollSapGlazedFish: "sapGlazedFish" } as const;
export const WOOD_SCROLL_ITEMS = Object.fromEntries(Object.entries(WOOD_SCROLLS).map(([id, dish]) => [id, {
  kind: "scroll", tier: WOOD_ITEMS[dish].tier, stack: 1, pays: 12,
  name: { th: `ม้วนสูตร ${WOOD_ITEMS[dish].name.th}`, en: `Recipe scroll: ${WOOD_ITEMS[dish].name.en}` },
  about: { th: "กระดาษม้วนผูกเชือกแดง มีลายมือเขียนอยู่ข้างใน", en: "A roll tied with red string, with handwriting inside" },
}])) as Record<keyof typeof WOOD_SCROLLS, Item>;
export const WOOD_RAW = ["knottedWood", "straightWood", "heartwood", "pineBark", "pinePitch", "pineNut", "rootFiber", "cedarSliver"] as const;
export const WOOD_TOOL_IDS = ["notchGauge", "grainLens", "fellingWedge", "barkKnife", "sapTap", "braceStake"] as const;
export const WOOD_MAKES = {
  splitPlank: { needs: [["straightWood", 1]], in: ["cleaver"], gives: 2 },
  carvingBlank: { needs: [["heartwood", 1], ["woodOil", 1]], in: ["cleaver"], gives: 2 },
  pitchSeal: { needs: [["pinePitch", 2], ["charcoal", 1]], in: ["pot"], gives: 3 },
  sapSyrup: { needs: [["pineNut", 1], ["sugar", 2]], in: ["pot"], gives: 2 },
  pineNutFlour: { needs: [["pineNut", 3]], in: ["mortar"], gives: 2 },
  rootTwine: { needs: [["rootFiber", 3]], in: [], gives: 2 },
  woodOil: { needs: [["pineNut", 2], ["oil", 1], ["pineBark", 1]], in: ["mortar"], gives: 2 },
} satisfies Record<string, Make>;
export const WOOD_CRAFTS = {
  notchGauge: [["splitPlank", 2], ["oreCopper", 1]],
  grainLens: [["carvingBlank", 2], ["oreSilver", 2], ["cedarSliver", 1]],
  fellingWedge: [["oreIron", 2], ["knottedWood", 2], ["pitchSeal", 1]],
  barkKnife: [["oreIron", 2], ["splitPlank", 1], ["rootTwine", 1]],
  sapTap: [["oreCopper", 2], ["pineBark", 2], ["pitchSeal", 1]],
  braceStake: [["carvingBlank", 2], ["rootTwine", 2]],
} as const;
export const WOOD_DISHES: Record<WoodDishId, Dish> = {
  pineNutRice: { stamina: 24, buff: "grain", recipe: { needs: [["pineNut", 2], ["rice", 2], ["salt", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  cedarBroth: { stamina: 34, buff: "grain", recipe: { needs: [["cedarSliver", 1], ["brookFillet", 1], ["rosemary", 1], ["salt", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  pineNutCake: { stamina: 28, buff: "grain", recipe: { needs: [["pineNutFlour", 2], ["egg", 1], ["sapSyrup", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  sapGlazedFish: { stamina: 30, buff: "hearty", recipe: { needs: [["sapSyrup", 1], ["creekDace", 2], ["salt", 1]], in: ["grill"], serves: 2, cooks: 1 } },
};
