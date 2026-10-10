import type { Dish, Item, Make } from "./items";

const appearance: Record<string,[string,string]> = {
  "Spring pool sample": ["ขวดเล็กใส่น้ำสีฟ้าใส มีตะกอนบางๆ ที่ก้น", "A small bottle of pale blue water with a little sediment."],
  "Running stream sample": ["ขวดน้ำสีฟ้าเข้ม มีฟองเล็กตามขอบ", "Deep blue water with tiny bubbles around the bottle."],
  "Stream grit": ["กรวดกลมเล็กสีเทาและน้ำตาล ผิวเปียกมัน", "Small rounded grey and brown pebbles with wet surfaces."],
  "Mineral spring sand": ["ทรายสีทองอ่อนปนเม็ดแร่สีเข้ม", "Pale golden sand flecked with dark grains."],
  "Spring bank moss": ["มอสเขียวเป็นแผ่นนุ่ม หยดน้ำค้างอยู่ตามใบ", "A soft green moss pad beaded with water."],
  "Stream clay": ["ก้อนดินสีน้ำตาลแดง เนื้อเรียบชื้น", "Smooth damp reddish brown clay."],
  "Reed pith": ["แกนกกสีครีมเป็นท่อน มีเปลือกเขียวบางๆ", "Cream reed cores inside a thin green skin."],
  "Water mint": ["ใบเขียวหยักเล็กๆ ติดก้านสีอ่อน", "Small serrated green leaves on pale stems."],
  "Filtered spring water": ["น้ำใสในขวดปากแคบ ไม่มีตะกอน", "Clear water in a narrow bottle without sediment."],
  "Herbal spring water": ["น้ำสีเขียวอ่อน มีใบเล็กลอยอยู่", "Pale green water with a small floating leaf."],
  "Prepared mineral water": ["น้ำสีฟ้าหม่นในขวด มีประกายเม็ดแร่", "Muted blue water with tiny mineral glints."],
  "Dawn blend": ["น้ำสีอำพันอ่อนอยู่ในขวดคอสั้น", "Pale amber water in a short necked bottle."],
  "Rain blend": ["น้ำสีฟ้าอ่อนใส หยดน้ำเกาะขวด", "Light blue water in a bottle beaded with droplets."],
  "Moon blend": ["น้ำสีม่วงอ่อนมีประกายเงิน", "Pale violet water with silvery flecks."],
  "Spring salt": ["ผลึกสีขาวเล็กๆ อยู่ในถ้วยดิน", "Small white crystals in a clay bowl."],
  "Water sampler": ["กระบอกดินคอยาว มีเชือกคล้องปาก", "A long necked clay tube with a cord around its rim."],
  "Sluice handle": ["มือหมุนเหล็กติดด้ามไม้ มีแกนสั้นตรงกลาง", "An iron crank with a wooden grip and short central axle."],
  "Filter frame": ["กรอบไม้ขึงตาข่าย มีมอสเขียวรองด้านใน", "A wooden mesh frame lined with green moss."],
  "Water mixing jug": ["เหยือกดินมีหูจับ และลายสีจางที่ขอบ", "A clay jug with a handle and faded decoration at the rim."],
  "Sealed water flask": ["ขวดดินปิดจุกแน่น ผูกเชือกไขว้รอบคอ", "A stoppered clay flask with crossed cords at the neck."],
  "Flow gauge": ["ไม้เรียวยาวมีขีดวัด และห่วงทองแดง", "A slim marked rod with a copper ring."],
  "Spring rice": ["ข้าวขาวเป็นเม็ดอยู่ในชาม มีน้ำใสข้างขอบ", "White rice grains in a bowl with clear broth at the edge."],
  "Water mint broth": ["น้ำซุปสีเขียวอ่อน มีใบและแครอตชิ้นเล็ก", "Light green broth with leaves and small carrot pieces."],
  "Mineral congee": ["ข้าวต้มข้นสีครีม โรยใบแห้งสีน้ำตาล", "Cream coloured congee topped with brown dried leaves."],
  "Moon tea rice": ["ข้าวสีน้ำตาลอ่อนในชาสีม่วง มีใบเขียวด้านบน", "Light brown rice in violet tea, topped with green leaves."],
};
const item = (kind: Item["kind"], th: string, en: string, pays: number, tier: 1 | 2 | 3 = 2): Item => ({
  kind, tier, name: { th, en }, about: { th: appearance[en]?.[0] ?? "ม้วนกระดาษผูกเชือก มีภาพหม้อและตัวเขียนเล็กๆ", en: appearance[en]?.[1] ?? "A tied paper scroll with a pot drawing and small writing." }, stack: kind === "tool" ? 1 : 20, pays,
});
/** Mountain water has its own gathering and preparation, separate from the fish living in it. */
export const STREAM_ITEMS = {
  springSample: item("goods", "น้ำจากแอ่งต้นน้ำ", "Spring pool sample", 4),
  rushingSample: item("goods", "น้ำจากร่องไหล", "Running stream sample", 4),
  riverGrit: item("mineral", "กรวดลำธาร", "Stream grit", 5),
  mineralSand: item("mineral", "ทรายแร่ต้นน้ำ", "Mineral spring sand", 9),
  mossFilter: item("wild", "มอสริมต้นน้ำ", "Spring bank moss", 5),
  wetClay: item("mineral", "ดินเหนียวริมน้ำ", "Stream clay", 6),
  reedPith: item("wild", "แกนกกริมน้ำ", "Reed pith", 7),
  waterMint: item("wild", "สะระแหน่น้ำ", "Water mint", 8),
  clearSpring: item("staple", "น้ำต้นน้ำกรองใส", "Filtered spring water", 12),
  herbalWater: item("staple", "น้ำสมุนไพรต้นน้ำ", "Herbal spring water", 18),
  mineralWater: item("staple", "น้ำแร่กลั่น", "Prepared mineral water", 21),
  dawnBlend: item("staple", "น้ำผสมสีอรุณ", "Dawn blend", 25, 3),
  rainBlend: item("staple", "น้ำผสมหยาดฝน", "Rain blend", 23, 3),
  moonBlend: item("staple", "น้ำผสมแสงจันทร์", "Moon blend", 28, 3),
  springSalt: item("staple", "เกลือต้นน้ำ", "Spring salt", 19),
  waterSampler: item("tool", "กระบอกเก็บน้ำ", "Water sampler", 30),
  sluiceKey: item("tool", "มือหมุนประตูน้ำ", "Sluice handle", 33),
  filterFrame: item("tool", "กรอบกรองน้ำ", "Filter frame", 35),
  mixingJug: item("tool", "เหยือกผสมน้ำ", "Water mixing jug", 32),
  sealedFlask: item("tool", "ขวดรักษาคุณน้ำ", "Sealed water flask", 38, 3),
  flowGauge: item("tool", "ไม้เทียบระดับน้ำ", "Flow gauge", 29),
  springRice: item("dish", "ข้าวน้ำต้นน้ำ", "Spring rice", 26),
  mintBroth: item("dish", "ซุปสะระแหน่น้ำ", "Water mint broth", 29),
  mineralCongee: item("dish", "โจ๊กน้ำแร่", "Mineral congee", 31, 3),
  moonTeaRice: item("dish", "ข้าวชาน้ำจันทร์", "Moon tea rice", 35, 3),
} as const;
export const STREAM_RAW = ["springSample", "rushingSample", "riverGrit", "mineralSand", "mossFilter", "wetClay", "reedPith", "waterMint"] as const;
export const STREAM_TOOLS = ["waterSampler", "sluiceKey", "filterFrame", "mixingJug", "sealedFlask", "flowGauge"] as const;
export const STREAM_MAKES = {
  clearSpring: { needs: [["springSample", 2], ["charcoal", 1]], in: ["jar"], gives: 2 },
  herbalWater: { needs: [["clearSpring", 1], ["waterMint", 2]], in: ["pot"], gives: 2 },
  mineralWater: { needs: [["rushingSample", 2], ["mineralSand", 1]], in: ["pot"], gives: 2 },
  dawnBlend: { needs: [["mineralWater", 1], ["herbalWater", 1]], in: ["jar"], gives: 1 },
  rainBlend: { needs: [["clearSpring", 1], ["herbalWater", 1]], in: ["jar"], gives: 1 },
  moonBlend: { needs: [["dawnBlend", 1], ["clearSpring", 1], ["lichenSalt", 1]], in: ["jar"], gives: 1 },
  springSalt: { needs: [["mineralSand", 2], ["clearSpring", 1]], in: ["pan"], gives: 2 },
} satisfies Record<string, Make>;
export const STREAM_CRAFTS = {
  waterSampler: [["wetClay", 3], ["beeswax", 1]],
  sluiceKey: [["oreIron", 3], ["heartwood", 1], ["riverGrit", 2]],
  filterFrame: [["reedPith", 3], ["mossFilter", 2], ["silkenCord", 1]],
  mixingJug: [["wetClay", 4], ["petalDye", 1]],
  sealedFlask: [["wetClay", 3], ["beeswax", 2], ["rootTwine", 1]],
  flowGauge: [["reedPith", 2], ["splitPlank", 1], ["oreCopper", 1]],
} as const;
export type StreamDishId = "springRice" | "mintBroth" | "mineralCongee" | "moonTeaRice";
export const STREAM_DISHES: Record<StreamDishId, Dish> = {
  springRice: { stamina: 30, buff: "waterProperty", recipe: { needs: [["clearSpring", 1], ["rice", 2], ["springSalt", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  mintBroth: { stamina: 32, buff: "waterProperty", recipe: { needs: [["herbalWater", 1], ["carrot", 2], ["springSalt", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  mineralCongee: { stamina: 34, buff: "waterProperty", recipe: { needs: [["mineralWater", 1], ["rice", 2], ["driedFern", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  moonTeaRice: { stamina: 38, buff: "waterProperty", recipe: { needs: [["moonBlend", 1], ["rice", 2], ["waterMint", 1]], in: ["pot"], serves: 3, cooks: 1 } },
};
export const STREAM_SCROLLS = { scrollSpringRice: "springRice", scrollMintBroth: "mintBroth", scrollMineralCongee: "mineralCongee", scrollMoonTeaRice: "moonTeaRice" } as const;
export const STREAM_SCROLL_ITEMS = Object.fromEntries(Object.entries(STREAM_SCROLLS).map(([id, dish]) => [id,
  item("scroll", `ม้วนสูตร ${STREAM_ITEMS[dish].name.th}`, `Recipe scroll: ${STREAM_ITEMS[dish].name.en}`, 12, STREAM_ITEMS[dish].tier),
])) as Record<keyof typeof STREAM_SCROLLS, Item>;
