import type { Bug } from "./insects";
import type { Dish, Item, Make } from "./items";

const TH_DETAILS: Record<string, string> = {
  "Honey bee": "ลายแถบสีน้ำตาลทองและปีกใส", "Carpenter bee": "ผึ้งตัวกลมสีม่วงเข้ม", "Green lacewing": "ปีกสีเขียวอ่อนมีเส้นละเอียด", "Hoverfly": "ลายเหลืองดำและปีกใสสั้น",
  "Silk moth": "ผีเสื้อสีครีมขนฟูและปีกกว้าง", "Golden ant": "มดหกขาสีน้ำตาลทอง", "Orchard beetle": "ด้วงตัวรีสีน้ำตาลแดง", "Pollen midge": "แมลงตัวเล็กสีอ่อนมีปีกบาง",
  "Honeycomb": "รวงสีทองมีช่องหกเหลี่ยม", "Garden honey": "น้ำผึ้งสีทองใสในขวด", "Garden beeswax": "ก้อนไขสีทองอ่อนสองก้อน", "Twisted silk": "เส้นไหมสีครีมม้วนในใบไม้", "Garden silk cord": "เชือกไหมสีอ่อนพันแกนไม้", "Chitin plate": "แผ่นเปลือกสีน้ำตาลเข้มขัดเรียบ", "Flower nectar syrup": "น้ำหวานสีทองในขวดคอแคบ",
  "Flight route lens": "เลนส์กลมติดด้ามไม้", "Leaf scent satchel": "ถุงใบไม้สีเขียวผูกเชือกไหม", "Nectar lure vial": "หลอดน้ำหวานติดด้ามไม้", "Insect release cage": "กรงไม้ไผ่เบามีหลังคาใบไม้", "Pollen fan": "พัดสีเหลืองโครงไม้", "Garden guardian whistle": "นกหวีดไม้มีรูสองช่อง",
  "Flower nectar rice": "ข้าวราดน้ำผึ้งสีทองกับกลีบดอกไม้", "Honey herb tea": "ชาน้ำผึ้งกับใบสมุนไพรสีเขียว", "Garden flower cake": "เค้กสีทองวางบนใบไม้", "Orchard soup": "ซุปใสกับเบอร์รีและรากบัวหั่น",
};
const item = (kind: Item["kind"], th: string, en: string, shape: string, pays: number, tier: Item["tier"] = 2): Item => ({ kind, tier, name: { th, en }, about: { th: TH_DETAILS[en] ?? "ม้วนสูตรผูกด้วยเชือก", en: shape }, stack: kind === "tool" ? 1 : 20, pays });
/** Eight visitors, seven preparations, six field tools and four meals. */
export const INSECT_ITEMS = {
  honeyBee: item("bug", "ผึ้งน้ำหวาน", "Honey bee", "Amber stripes and clear wings", 6),
  carpenterBee: item("bug", "ผึ้งช่างไม้", "Carpenter bee", "A round dark violet bee", 12),
  lacewing: item("bug", "แมลงช้างปีกใส", "Green lacewing", "Fine mint-green veined wings", 9),
  hoverfly: item("bug", "แมลงวันดอกไม้", "Hoverfly", "Yellow and black bands with short clear wings", 7),
  silkMoth: item("bug", "ผีเสื้อไหม", "Silk moth", "A fuzzy ivory moth with broad wings", 16, 3),
  goldenAnt: item("bug", "มดทอง", "Golden ant", "Six-legged golden brown ant", 8),
  orchardBeetle: item("bug", "ด้วงสวนผลไม้", "Orchard beetle", "An oval red-brown beetle", 14, 3),
  pollenMidge: item("bug", "ริ้นเกสร", "Pollen midge", "A tiny pale insect with delicate wings", 10),
  honeycomb: item("staple", "รวงน้ำหวาน", "Honeycomb", "An amber hexagonal honeycomb", 16),
  gardenHoney: item("staple", "น้ำผึ้งสวน", "Garden honey", "A jar of clear golden honey", 13),
  beeswax: item("goods", "ไขผึ้งสวน", "Garden beeswax", "Two pale golden wax blocks", 19),
  silkTwist: item("goods", "ไหมบิดเกลียว", "Twisted silk", "Glossy ivory silk wound in a leaf", 21, 3),
  silkenCord: item("goods", "เชือกไหมสวน", "Garden silk cord", "A pale silk cord on a wooden spool", 34, 3),
  chitinPlate: item("goods", "แผ่นไคติน", "Chitin plate", "A dark brown polished shell plate", 21, 3),
  nectarSyrup: item("staple", "น้ำหวานดอกไม้เคี่ยว", "Flower nectar syrup", "Golden syrup in a narrow bottle", 19),
  routeLens: item("tool", "แว่นอ่านทางบิน", "Flight route lens", "A round lens in a wooden handle", 28),
  scentSatchel: item("tool", "ถุงกลิ่นใบไม้", "Leaf scent satchel", "A green sachet tied with silken cord", 27),
  nectarVial: item("tool", "หลอดล่อดอกไม้", "Nectar lure vial", "A nectar vial on a wooden handle", 26),
  releaseCage: item("tool", "กรงปล่อยแมลง", "Insect release cage", "A light bamboo cage with a leaf roof", 29),
  pollenFan: item("tool", "พัดพาเกสร", "Pollen fan", "A yellow fan with wooden ribs", 25),
  pestWhistle: item("tool", "นกหวีดเรียกผู้พิทักษ์สวน", "Garden guardian whistle", "A wooden whistle with two holes", 30),
  nectarRice: item("dish", "ข้าวน้ำหวานดอกไม้", "Flower nectar rice", "Rice with golden honey and petals", 24),
  honeyHerbTea: item("dish", "ชาสมุนไพรน้ำผึ้ง", "Honey herb tea", "Honey tea with green leaves", 23),
  pollenCake: item("dish", "เค้กดอกไม้สวน", "Garden flower cake", "A golden cake on a green leaf", 26),
  orchardSoup: item("dish", "ซุปสวนผลไม้", "Orchard soup", "Clear soup with berry and lotus slices", 27, 3),
} as const;
export type InsectSpeciesId = "honeyBee" | "carpenterBee" | "lacewing" | "hoverfly" | "silkMoth" | "goldenAnt" | "orchardBeetle" | "pollenMidge";
export type InsectDishId = "nectarRice" | "honeyHerbTea" | "pollenCake" | "orchardSoup";
export const INSECT_SPECIES: Record<InsectSpeciesId, Bug> = {
  honeyBee: { habit: "path", at: ["blooms", "field"], hours: [[6, 17]], dry: true, weight: 8, n: [1, 1], cost: 3, size: 0.75 },
  carpenterBee: { habit: "behind", at: ["tree", "glade"], hours: [[8, 17]], dry: true, weight: 5, n: [1, 1], cost: 5, size: 0.8, tracks: true },
  lacewing: { habit: "lamp", at: ["lamp", "blooms"], hours: [[18, 24], [0, 5]], weight: 8, n: [1, 1], cost: 4, size: 0.65 },
  hoverfly: { habit: "spot", at: ["blooms", "field"], hours: [[7, 18]], dry: true, weight: 8, n: [1, 1], cost: 4, size: 0.6, quick: 1.3 },
  silkMoth: { habit: "lamp", at: ["tree", "lamp"], hours: [[19, 24], [0, 4]], day: 0.5, weight: 4, n: [1, 1], cost: 6, size: 0.85 },
  goldenAnt: { habit: "crawl", at: ["litter", "field"], hours: [[6, 19]], weight: 8, n: [1, 2], cost: 5, size: 0.65 },
  orchardBeetle: { habit: "lure", at: ["tree", "glade"], hours: [[6, 18]], weight: 5, n: [1, 1], cost: 6, size: 0.8 },
  pollenMidge: { habit: "spot", at: ["blooms", "water"], hours: [[5, 10], [16, 19]], dry: true, weight: 6, n: [1, 2], cost: 6, size: 0.55 },
};
export const INSECT_TOOLS = ["routeLens", "scentSatchel", "nectarVial", "releaseCage", "pollenFan", "pestWhistle"] as const;
export const INSECT_MAKES = {
  honeycomb: { needs: [["honeyBee", 2], ["sugar", 1]], in: ["pot"], gives: 1 },
  gardenHoney: { needs: [["honeycomb", 2]], in: ["pot"], gives: 3 },
  beeswax: { needs: [["honeycomb", 2], ["pinePitch", 1]], in: ["pan"], gives: 2 },
  silkTwist: { needs: [["silkMoth", 1], ["silkCocoon", 2]], in: ["mortar"], gives: 2 },
  silkenCord: { needs: [["silkTwist", 3]], in: ["mortar"], gives: 2 },
  chitinPlate: { needs: [["orchardBeetle", 2], ["pitchSeal", 1]], in: ["pan"], gives: 2 },
  nectarSyrup: { needs: [["gardenHoney", 2], ["basil", 2]], in: ["pot"], gives: 2 },
} satisfies Record<string, Make>;
export const INSECT_CRAFTS = {
  routeLens: [["crystalLens", 1], ["splitPlank", 1]], scentSatchel: [["silkenCord", 1], ["basil", 3]],
  nectarVial: [["nectarSyrup", 1], ["beeswax", 1]], releaseCage: [["bambooShoot", 3], ["silkenCord", 1]],
  pollenFan: [["chitinPlate", 1], ["rootTwine", 1]], pestWhistle: [["carvingBlank", 1], ["beeswax", 1]],
} as const;
export const INSECT_DISHES: Record<InsectDishId, Dish> = {
  nectarRice: { stamina: 28, buff: "scent", recipe: { needs: [["gardenHoney", 1], ["rice", 2]], in: ["pot"], serves: 3, cooks: 1 } },
  honeyHerbTea: { stamina: 24, buff: "scent", recipe: { needs: [["gardenHoney", 1], ["basil", 2]], in: ["pot"], serves: 3, cooks: 1 } },
  pollenCake: { stamina: 30, buff: "scent", recipe: { needs: [["nectarSyrup", 1], ["flour", 2]], in: ["pan"], serves: 3, cooks: 1 } },
  orchardSoup: { stamina: 32, buff: "scent", recipe: { needs: [["gardenHoney", 1], ["trellisBerry", 1], ["lotusRootBed", 2]], in: ["pot"], serves: 3, cooks: 1 } },
};
export const INSECT_SCROLLS = { scrollNectarRice: "nectarRice", scrollHoneyHerbTea: "honeyHerbTea", scrollPollenCake: "pollenCake", scrollOrchardSoup: "orchardSoup" } as const;
export const INSECT_SCROLL_ITEMS = Object.fromEntries(Object.entries(INSECT_SCROLLS).map(([id, dish]) => [id, item("scroll", `ม้วนสูตร ${INSECT_ITEMS[dish].name.th}`, `Recipe scroll: ${INSECT_ITEMS[dish].name.en}`, "A rolled recipe tied with cord", 12, INSECT_ITEMS[dish].tier)])) as Record<keyof typeof INSECT_SCROLLS, Item>;
