import type { Dish, Item, Make } from "./items";
const EN_DETAILS: Record<string,string> = {
  "Layered slate":"Thin stacked dark grey stone layers", "Pocket clay":"A moist reddish-brown lump of fine clay", "Quartz core":"A clear pointed crystal with a white streak", "Pyrite cluster":"A cluster of dull golden cubic crystals", "Copper nodule":"A brown nodule with green and red flecks", "Iron nodule":"A heavy dark stone with rusty red marks", "Silver nodule":"A dark stone crossed by bright silver veins", "Rock-layer salt":"Angular white and pink salt crystals", "Intact geode":"A rough round stone with violet crystals in its opening",
  "Stone tile":"A smooth rectangular grey stone tile", "Crystal lens":"A polished round clear crystal", "Spark powder":"Fine dull golden powder in a paper packet", "Copper blank":"A thin rectangular red-gold metal sheet", "Steel plate":"A thick angular dark grey metal plate", "Geode display":"An open violet geode on a wooden stand",
  "Echo hammer":"A small copper hammer with a long wooden handle", "Cavity lens":"A large clear lens in a copper frame", "Crystal wrap":"A thick folded cloth tied with two cords", "Ore sieve":"A round wooden sieve with fine metal mesh", "Seam chisel":"A grooved steel chisel with a flat tip", "Survey cord":"A marked cord with a copper plumb weight",
  "Miner's salt rice":"Leaf-wrapped rice sprinkled with pink salt", "Cave stew":"Dark stew with mushroom and yam pieces", "Rock-salt roast":"A salt-crusted grilled fish on a leaf", "Surveyor's rice cake":"Two cream-coloured rice cakes on a wooden plate",
};
const part = (kind: Item["kind"], th: string, en: string, shape: string, pays: number, tier: 2 | 3 = 2): Item => ({ kind, tier, name: { th, en }, about: { th: shape, en: EN_DETAILS[en] ?? "A rolled recipe tied with cord" }, stack: kind === "tool" ? 1 : 20, pays });
/** Nine geological finds, six preparations, six surveying tools and four meals. */
export const GEOLOGY_ITEMS = {
  slateLayer: part("mineral", "หินชนวนเป็นชั้น", "Layered slate", "แผ่นหินสีเทาเข้มเรียงซ้อนบางๆ", 3),
  clayPocket: part("mineral", "ดินเหนียวใต้หิน", "Pocket clay", "ก้อนดินสีน้ำตาลแดงชื้นเนื้อละเอียด", 3),
  quartzCore: part("mineral", "แกนควอตซ์", "Quartz core", "ผลึกใสปลายแหลมมีรอยขาวอยู่กลางแกน", 6),
  pyriteCluster: part("mineral", "กลุ่มไพไรต์", "Pyrite cluster", "ผลึกเหลี่ยมสีทองหม่นรวมกันเป็นกลุ่ม", 5),
  copperNodule: part("mineral", "ปุ่มแร่ทองแดง", "Copper nodule", "ก้อนกลมสีน้ำตาลมีจุดเขียวและแดง", 7),
  ironNodule: part("mineral", "ปุ่มแร่เหล็ก", "Iron nodule", "ก้อนหนักสีเทาดำมีรอยสนิมแดง", 8),
  silverNodule: part("mineral", "ปุ่มแร่เงิน", "Silver nodule", "ก้อนสีเทาเข้มมีเส้นเงินสว่าง", 12, 3),
  mineralSalt: part("staple", "เกลือชั้นหิน", "Rock-layer salt", "เม็ดผลึกสีขาวอมชมพูขอบเหลี่ยม", 4),
  wholeGeode: part("mineral", "จีโอดสมบูรณ์", "Intact geode", "ก้อนหินกลมผิวหยาบมีผลึกม่วงอยู่ในช่องเล็ก", 15, 3),
  stoneTile: part("goods", "แผ่นหินปู", "Stone tile", "แผ่นหินสีเทาหน้าสี่เหลี่ยมผิวเรียบ", 6),
  crystalLens: part("goods", "เลนส์ผลึก", "Crystal lens", "ผลึกใสขัดเป็นวงกลมขอบมน", 8),
  sparkPowder: part("goods", "ผงจุดประกาย", "Spark powder", "ผงสีทองหม่นละเอียดในห่อกระดาษ", 6),
  copperBlank: part("goods", "แผ่นทองแดงเปล่า", "Copper blank", "แผ่นโลหะสีแดงทองบางหน้าสี่เหลี่ยม", 9),
  steelPlate: part("goods", "แผ่นเหล็กกล้า", "Steel plate", "แผ่นโลหะสีเทาเข้มหนาขอบเป็นมุม", 10),
  geodeDisplay: part("goods", "จีโอดตั้งแสดง", "Geode display", "ผลึกม่วงเปิดหน้าตั้งบนแท่นไม้", 22, 3),
  echoHammer: part("tool", "ค้อนฟังเสียงหิน", "Echo hammer", "ค้อนหัวทองแดงเล็กด้ามไม้ยาว", 25),
  cavityLens: part("tool", "เลนส์ช่องโพรง", "Cavity lens", "เลนส์ใสวงใหญ่ในกรอบทองแดง", 28),
  crystalWrap: part("tool", "ผ้าหุ้มผลึก", "Crystal wrap", "แผ่นผ้าพับหนาผูกเชือกสองเส้น", 22),
  oreSieve: part("tool", "ตะแกรงแร่", "Ore sieve", "วงไม้กลมขึงตาข่ายโลหะถี่", 26),
  seamChisel: part("tool", "สิ่วตามชั้นแร่", "Seam chisel", "สิ่วเหล็กปลายแบนผิวเป็นร่อง", 27),
  surveyCord: part("tool", "สายสำรวจชั้นหิน", "Survey cord", "เชือกยาวมีลูกตุ้มทองแดงและขีดระยะ", 24),
  minerRice: part("dish", "ข้าวเกลือชั้นหิน", "Miner's salt rice", "ข้าวในห่อใบไม้โรยเม็ดเกลือสีชมพู", 18),
  caveStew: part("dish", "สตูว์ก่อนลงถ้ำ", "Cave stew", "ซุปสีน้ำตาลเข้มมีเห็ดและมันเป็นชิ้น", 22),
  saltRoast: part("dish", "ปลาย่างเกลือหิน", "Rock-salt roast", "ปลาย่างผิวเกลือสีขาววางบนใบไม้", 24),
  seamCake: part("dish", "เค้กข้าวของนักสำรวจ", "Surveyor's rice cake", "เค้กข้าวสีครีมซ้อนสองแผ่นบนจานไม้", 20),
} as const;
export type GeologyDishId = "minerRice" | "caveStew" | "saltRoast" | "seamCake";
export const GEOLOGY_RAW = ["slateLayer", "clayPocket", "quartzCore", "pyriteCluster", "copperNodule", "ironNodule", "silverNodule", "mineralSalt", "wholeGeode"] as const;
export const GEOLOGY_TOOLS = ["echoHammer", "cavityLens", "crystalWrap", "oreSieve", "seamChisel", "surveyCord"] as const;
export const GEOLOGY_MAKES = {
  stoneTile: { needs: [["slateLayer", 2], ["clayPocket", 1]], in: [], gives: 2 },
  crystalLens: { needs: [["quartzCore", 2]], in: ["mortar"], gives: 1 },
  sparkPowder: { needs: [["pyriteCluster", 2]], in: ["mortar"], gives: 3 },
  copperBlank: { needs: [["copperNodule", 2], ["charcoal", 1]], in: ["grill"], gives: 2 },
  steelPlate: { needs: [["ironNodule", 2], ["charcoal", 2]], in: ["grill"], gives: 2 },
  geodeDisplay: { needs: [["wholeGeode", 1], ["silverNodule", 1], ["carvingBlank", 1]], in: [], gives: 1 },
} satisfies Record<string, Make>;
export const GEOLOGY_CRAFTS = {
  echoHammer: [["copperBlank", 2], ["timber", 1]],
  cavityLens: [["crystalLens", 1], ["copperBlank", 1]],
  crystalWrap: [["silkCocoon", 4], ["rootTwine", 1]],
  oreSieve: [["steelPlate", 2], ["rootTwine", 1]],
  seamChisel: [["steelPlate", 2], ["sparkPowder", 1]],
  surveyCord: [["rootTwine", 2], ["copperBlank", 1]],
} as const;
export const GEOLOGY_DISHES: Record<GeologyDishId, Dish> = {
  minerRice: { stamina: 24, buff: "layers", recipe: { needs: [["mineralSalt", 1], ["rice", 2]], in: ["pot"], serves: 3, cooks: 1 } },
  caveStew: { stamina: 30, buff: "layers", recipe: { needs: [["mineralSalt", 1], ["shiitake", 2], ["wildYam", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  saltRoast: { stamina: 28, buff: "hearty", recipe: { needs: [["mineralSalt", 2], ["creekDace", 2]], in: ["grill"], serves: 3, cooks: 1 } },
  seamCake: { stamina: 24, buff: "layers", recipe: { needs: [["mineralSalt", 1], ["flour", 2], ["egg", 1]], in: ["pan"], serves: 3, cooks: 1 } },
};
export const GEOLOGY_SCROLLS = { scrollMinerRice: "minerRice", scrollCaveStew: "caveStew", scrollSaltRoast: "saltRoast", scrollSeamCake: "seamCake" } as const;
export const GEOLOGY_SCROLL_ITEMS = Object.fromEntries(Object.entries(GEOLOGY_SCROLLS).map(([id, dish]) => [id, { kind: "scroll", tier: GEOLOGY_ITEMS[dish].tier, stack: 1, pays: 12, name: { th: `ม้วนสูตร ${GEOLOGY_ITEMS[dish].name.th}`, en: `Recipe scroll: ${GEOLOGY_ITEMS[dish].name.en}` }, about: { th: "ม้วนกระดาษผูกเชือกแดง", en: "A parchment roll tied with red cord" } }])) as Record<keyof typeof GEOLOGY_SCROLLS, Item>;
