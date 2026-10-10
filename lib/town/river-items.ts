import type { Dish, Fish, Item, Make } from "./items";

/** Twenty-five additions to fishing, with separate habitats and uses. */
const fish = (th: string, en: string, thLook: string, enLook: string, pays: number, tier: 1 | 2 | 3): Item =>
  ({ kind: "fish", tier, name: { th, en }, about: { th: thLook, en: enLook }, stack: 10, pays });
const goods = (th: string, en: string, thLook: string, enLook: string, pays: number, tier: 2 | 3 = 2): Item =>
  ({ kind: "goods", tier, name: { th, en }, about: { th: thLook, en: enLook }, stack: 20, pays });
const tool = (th: string, en: string, thLook: string, enLook: string, pays: number, tier: 2 | 3 = 2): Item =>
  ({ kind: "tool", tier, name: { th, en }, about: { th: thLook, en: enLook }, stack: 1, pays });
const dish = (th: string, en: string, thLook: string, enLook: string, pays: number, tier: 2 | 3 = 2): Item =>
  ({ kind: "dish", tier, name: { th, en }, about: { th: thLook, en: enLook }, stack: 5, pays });

export const RIVER_ITEMS = {
  creekDace: fish("ปลาซิวลำธาร", "Creek dace", "ปลาตัวเรียว หางใส อยู่รวมกันเหนือทราย", "Slender fish with clear tails, schooling above sand", 9, 1),
  torrentBarb: fish("ปลาตะเพียนน้ำเชี่ยว", "Torrent barb", "เกล็ดหนา ครีบแข็ง ลำตัวต้านน้ำ", "Thick scales and firm fins on a body braced against water", 18, 2),
  stoneLapper: fish("ปลาเลียหิน", "Stone lapper", "ปากแบนแนบก้อนหิน ท้องสีอ่อน", "A flat mouth pressed to rock, with a pale belly", 12, 1),
  glassGoby: fish("ปลาบู่แก้ว", "Glass goby", "ตัวเล็กโปร่งใส เห็นเงาก้างในตัว", "A tiny translucent body with its bones showing through", 17, 2),
  brookTrout: fish("ปลาเทราต์ลำธาร", "Brook trout", "หลังลายจุด ครีบมีขอบขาว ท้องอมส้ม", "A spotted back, white-edged fins and an orange belly", 28, 2),
  caveBlindfish: fish("ปลาถ้ำไร้ตา", "Cave blindfish", "ตัวสีงาช้าง ตาเป็นรอยบุ๋มเล็ก", "An ivory body with small hollows where eyes would be", 32, 3),
  uplandEel: fish("ปลาไหลต้นน้ำ", "Upland eel", "ลำตัวยาวนุ่ม ผิวมีเมือกใส ครีบเป็นริ้ว", "A long supple body, clear mucus and ribbon fins", 25, 2),
  springShrimp: fish("กุ้งน้ำพุ", "Spring shrimp", "กุ้งตัวใส หนวดยาว ใต้ท้องมีเม็ดไข่", "Clear shrimp with long antennae and eggs under the abdomen", 13, 1),
  riverLamprey: fish("ปลาแลมเพรย์", "River lamprey", "ตัวเรียวไร้เกล็ด ปากกลมเป็นวง", "A slender scaleless body and a circular mouth", 35, 3),
  marbleMahseer: fish("ปลาพลวงหินอ่อน", "Marble mahseer", "เกล็ดใหญ่เป็นลายหิน หนวดสั้นสองคู่", "Large marbled scales and two pairs of short barbels", 48, 3),
  torrentSleeper: fish("ปลาบู่น้ำตก", "Torrent sleeper", "หัวกว้าง ครีบอกแผ่เป็นพัด ท้องติดหิน", "A broad head, fan-shaped pectoral fins and a belly held to rock", 22, 2),
  waterfallSturgeon: fish("ปลาสเตอร์เจียนน้ำตก", "Waterfall sturgeon", "หลังมีกระดูกเรียงเป็นสัน จมูกยาว ปากอยู่ใต้หัว", "Bony ridges along its back, a long snout and an underslung mouth", 75, 3),
  brookFillet: goods("เนื้อปลาลำธาร", "Brook fillet", "ชิ้นเนื้อขาวบาง แยกก้างออกแล้ว", "Thin white fillets with the bones removed", 7),
  smokedTrout: goods("เทราต์รมควัน", "Smoked trout", "เนื้อสีส้มขอบน้ำตาล กลิ่นควันไม้", "Orange flesh with brown edges and a woodsmoke scent", 20),
  driedDace: goods("ปลาซิวตากแห้ง", "Dried dace", "ปลาตัวเล็กแห้งเรียงกัน เกล็ดยังแวว", "Small dried fish laid together, their scales still shining", 11),
  springStock: goods("น้ำสต๊อกต้นน้ำ", "Spring stock", "น้ำซุปใสสีทอง มีไอนุ่มลอยอยู่", "Clear golden stock with a soft rising steam", 14, 3),
  fishRoe: goods("ไข่ปลาพลวง", "Mahseer roe", "ไข่เม็ดกลมเล็กสีอำพัน อยู่ในเยื่อบาง", "Small amber eggs held in a thin membrane", 24, 3),
  flowFloat: tool("ทุ่นอ่านกระแส", "Flow float", "ทุ่นกระดูกกลวง มีหางไม้แบน", "A hollow bone float with a flat wooden tail", 35),
  springLeader: tool("สายหน้าต้นน้ำ", "Spring leader", "สายถักสั้น หุ้มหนังนุ่มตรงปลาย", "A short braided leader with supple hide at its tip", 45),
  torrentNet: tool("สวิงรับน้ำเชี่ยว", "Torrent landing net", "กรอบกระดูกโค้ง ขึงตาข่ายลึก", "A curved bone frame holding a deep net", 65, 3),
  shadeLure: { kind: "bait", tier: 3, name: { th: "เหยื่อเงาใส", en: "Glass lure" }, about: { th: "ตัวใสปลายหางเป็นพู่ สะท้อนแสงเมื่อพลิก", en: "A clear body with a tassel tail, flashing as it turns" }, stack: 5, pays: 18 } satisfies Item,
  creekBroth: dish("ซุปปลาลำธาร", "Creek broth", "ซุปใส มีชิ้นปลาขาวและใบหอม", "Clear broth with white fish and fragrant leaves", 25, 3),
  smokedBrookBowl: dish("ข้าวปลาเทราต์รมควัน", "Smoked trout rice", "ข้าวร้อนโปะเนื้อปลารมควันสีส้ม", "Hot rice topped with orange smoked trout", 28),
  torrentSkewer: dish("ปลาน้ำเชี่ยวเสียบไม้", "Torrent fish skewer", "ปลาย่างหุ้มใบสมุนไพรบนไม้เสียบ", "Grilled fish wrapped in herbs on a skewer", 24),
  springDumpling: dish("เกี๊ยวกุ้งน้ำพุ", "Spring shrimp dumpling", "แป้งจีบบาง เห็นกุ้งสีชมพูข้างใน", "Thin pleated pastry showing pink shrimp inside", 22),
} as const satisfies Record<string, Item>;
export type RiverItemId = keyof typeof RIVER_ITEMS;
export type RiverFishId = Extract<RiverItemId,
  "creekDace" | "torrentBarb" | "stoneLapper" | "glassGoby" | "brookTrout" | "caveBlindfish" | "uplandEel" | "springShrimp" | "riverLamprey" | "marbleMahseer" | "torrentSleeper" | "waterfallSturgeon">;
export type RiverDishId = "creekBroth" | "smokedBrookBowl" | "torrentSkewer" | "springDumpling";
/** Recipe scrolls accompany the 25 usable additions; they do not fill the profession's item quota. */
export const RIVER_SCROLLS = { scrollCreekBroth: "creekBroth", scrollSmokedBrookBowl: "smokedBrookBowl", scrollTorrentSkewer: "torrentSkewer", scrollSpringDumpling: "springDumpling" } as const;
export const RIVER_SCROLL_ITEMS = Object.fromEntries(Object.entries(RIVER_SCROLLS).map(([id, dish]) => [id, {
  kind: "scroll", tier: RIVER_ITEMS[dish].tier, stack: 1, pays: 12,
  name: { th: `ม้วนสูตร ${RIVER_ITEMS[dish].name.th}`, en: `Recipe scroll: ${RIVER_ITEMS[dish].name.en}` },
  about: { th: "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", en: "A roll of paper tied with red string, with writing inside" },
}])) as Record<keyof typeof RIVER_SCROLLS, Item>;
export type FishingHabitat = "town" | "creek" | "pool" | "headwater";
export type Current = "eddy" | "run" | "shelter";

const fight = (style: Fish["fight"]["style"], band: number, pull: number, surge: number, line: number, effort: number): Fish["fight"] =>
  ({ style, band, pull, surge, line, effort, every: [2.4, 4.5], sway: 0.2, pace: 0.12 });
export const RIVER_FISH: Record<RiverFishId, Fish> = {
  creekDace: { tier: "common", habitat: ["creek"], current: ["eddy","shelter"], baits: { worm: 1, dough: 0.5 }, hours: [[5,19]], rain: 1, wait: [4,20], size: [7,13], fight: fight("darter",0.21,0.12,0.25,0.6,2) },
  torrentBarb: { tier: "uncommon", habitat: ["creek","headwater"], current: ["run"], baits: { corn: 1, branBait: 1 }, hours: [[6,17]], rain: 1.4, wait: [8,35], size: [18,32], fight: fight("steady",0.17,0.27,0.42,1.1,5) },
  stoneLapper: { tier: "common", habitat: ["creek","headwater"], current: ["run","shelter"], baits: { dough: 1, worm: 0.4 }, hours: [[7,20]], rain: 0.8, wait: [5,25], size: [12,20], fight: fight("sleeper",0.2,0.13,0.38,0.8,3) },
  glassGoby: { tier: "uncommon", habitat: ["pool"], current: ["shelter"], baits: { worm: 1, shrimpLive: 0.6 }, hours: [[18,24],[0,6]], rain: 1, wait: [8,35], size: [5,10], fight: fight("slippery",0.17,0.12,0.37,0.8,4) },
  brookTrout: { tier: "uncommon", habitat: ["headwater"], current: ["run","eddy"], baits: { cricket: 1, worm: 0.6, shadeLure: 0.9 }, hours: [[5,10],[16,20]], rain: 1.5, wait: [10,40], size: [22,40], fight: fight("leaper",0.16,0.2,0.64,1.2,6) },
  caveBlindfish: { tier: "rare", habitat: ["pool"], current: ["shelter"], baits: { worm: 0.8, antEggs: 1 }, hours: [[20,24],[0,5]], rain: 2, wait: [16,65], size: [10,18], fight: fight("slippery",0.15,0.17,0.4,1.1,7) },
  uplandEel: { tier: "uncommon", habitat: ["headwater"], current: ["shelter"], baits: { worm: 1, minnow: 0.6 }, hours: [[18,24],[0,7]], rain: 2, wait: [10,45], size: [35,65], fight: fight("slippery",0.16,0.22,0.5,1.2,6) },
  springShrimp: { tier: "common", habitat: ["pool","headwater"], current: ["eddy","shelter"], baits: { dough: 1, branBait: 0.8 }, hours: [[0,24]], rain: 1, wait: [5,25], size: [3,7], fight: fight("darter",0.23,0.08,0.3,0.5,2) },
  riverLamprey: { tier: "rare", habitat: ["creek"], current: ["run"], baits: { loach: 1, shadeLure: 0.8 }, hours: [[19,24],[0,5]], rain: 1.8, wait: [18,65], size: [25,55], fight: fight("sleeper",0.15,0.25,0.56,1.3,8) },
  marbleMahseer: { tier: "rare", habitat: ["headwater"], current: ["run"], baits: { corn: 1, fermentedBait: 0.8 }, hours: [[5,8],[16,19]], rain: 1.3, wait: [20,70], size: [45,85], fight: fight("steady",0.15,0.34,0.46,1.5,9) },
  torrentSleeper: { tier: "uncommon", habitat: ["headwater"], current: ["shelter","run"], baits: { shrimpLive: 1, worm: 0.6 }, hours: [[6,18]], rain: 1.6, wait: [12,40], size: [15,27], fight: fight("sleeper",0.17,0.19,0.55,1,5) },
  waterfallSturgeon: { tier: "legend", habitat: ["pool"], current: ["eddy"], baits: { loach: 0.8, shadeLure: 1 }, hours: [[4,7]], rain: 1, needs: ["after"], wait: [30,100], size: [75,135], fight: fight("steady",0.15,0.35,0.66,1.8,12) },
};
export const RIVER_MAKES = {
  brookFillet: { needs: [["stoneLapper",1]], in: ["cleaver"], gives: 2 },
  smokedTrout: { needs: [["brookTrout",1],["salt",1],["timber",1]], in: ["grill"], gives: 2 },
  driedDace: { needs: [["creekDace",3],["salt",1]], in: ["grill"], gives: 2 },
  springStock: { needs: [["caveBlindfish",1],["mint",1],["salt",1]], in: ["pot"], gives: 3 },
  fishRoe: { needs: [["marbleMahseer",1]], in: ["cleaver"], gives: 2 },
  flowFloat: { needs: [["torrentSleeper",1],["bambooCane",1],["resin",1]], in: [], gives: 1 },
  springLeader: { needs: [["uplandEel",1],["silkCocoon",2],["vine",2]], in: [], gives: 1 },
  torrentNet: { needs: [["waterfallSturgeon",1],["bambooCane",4],["silkCocoon",4]], in: [], gives: 1 },
  shadeLure: { needs: [["glassGoby",1],["fishRoe",1],["resin",1]], in: [], gives: 2 },
} satisfies Record<string, Make>;
export const RIVER_DISHES: Record<RiverDishId, Dish> = {
  creekBroth: { stamina: 30, buff: "current", recipe: { needs: [["riverLamprey",1],["brookFillet",1],["springStock",1],["scallion",1]], in: ["pot"], serves: 4, cooks: 1 } },
  smokedBrookBowl: { stamina: 32, buff: "current", recipe: { needs: [["smokedTrout",1],["rice",2],["driedDace",1]], in: ["pot"], serves: 3, cooks: 1 } },
  torrentSkewer: { stamina: 28, buff: "calm", recipe: { needs: [["torrentBarb",1],["rosemary",1],["salt",1]], in: ["skewer"], serves: 2, cooks: 1 } },
  springDumpling: { stamina: 26, buff: "keen", recipe: { needs: [["springShrimp",2],["flour",2],["scallion",1]], in: ["steamer"], serves: 3, cooks: 1 } },
};
