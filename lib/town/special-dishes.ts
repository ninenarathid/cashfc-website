import type { Dish, Item } from "./items";

/**
 * The ten dishes of the specials (the idea patch's stage 3, 2026-11-10; the owner, 2026-11-09: "ทำทั้งหมดได้เลย", and the
 * coordinator's rules for the recipes): each a fantasy or legend breed's special as its secret, last thing, which a found
 * recipe never names (lib/town/hints); two of them want specials of two animals (the cloud hen's egg with the cocoa cow's
 * cream, the moon duck's eggs with the Milky Way cow's crystal), so that they are traded for. The seven are each the one
 * way to a buff of the specials' five (lib/town/special-uses); the legend three are the village feast's centrepieces, four
 * cooks and twenty helpings, eaten together at the table.
 *
 * Their pays sit with their peers' (the pasture's dishes; khantoke and the giant catfish laab for the feasts), the feasts'
 * lowered by Codex's read (100 / 110 / 120 to 70 / 80 / 90: twenty helpings and more with good cookware would otherwise
 * sell for some 3,000 coins a pot). Their scrolls are never sold, never found in what the river brings up: only a cook who
 * has made the dish writes one, on a blank recipe paper (the paperboat duck's special).
 */
export type SpecialDishId = "fireflyCustard" | "cloudPancake" | "luckyFriedRice" | "moonSesamePudding" | "berryCreamScones" | "cocoaMousse" | "pollenTart"
  | "phoenixBake" | "pearlBroth" | "milkyWayCake";

const dish = (th: string, en: string, shTh: string, shEn: string, pays: number): Item =>
  ({ kind: "dish", tier: 3, name: { th, en }, about: { th: shTh, en: shEn }, stack: 5, pays });
/** The ten as things of the bag: what each looks like (never what it is for), and what the uncle's relatives pay for a helping. */
export const SPECIAL_DISH_ITEMS: Record<SpecialDishId, Item> = {
  fireflyCustard: dish("ไข่ตุ๋นหิ่งห้อย", "Firefly custard", "ไข่ตุ๋นเนื้อเนียนสีเหลืองนวลในถ้วยดิน มีจุดแสงเล็กๆ เรืองอยู่บนผิว", "A smooth pale yellow steamed custard in a clay cup, tiny lights glowing on its top", 40),
  cloudPancake: dish("แพนเค้กเมฆลอย", "Cloud pancake", "แพนเค้กสูงฟูนุ่มสีทอง ตั้งอยู่บนปุยเมฆขาวแทนจาน มีเนยก้อนเล็กอยู่บนยอด", "A tall, wobbly golden pancake standing on a little white cloud, a pat of butter on top", 44),
  luckyFriedRice: dish("ข้าวผัดไข่โชคดี", "Lucky fried rice", "ข้าวผัดไข่สีทองกองบนจานขอบแดง มีพริกกลมสีแดงเจ็ดเม็ดโรยอยู่", "Golden egg fried rice heaped on a red-rimmed plate, seven round red peppers on it", 44),
  moonSesamePudding: dish("พุดดิ้งงาดำเสี้ยวจันทร์", "Moon sesame pudding", "พุดดิ้งงาดำทรงจันทร์เสี้ยวบนจานครีม โรยผงสีเงินอยู่ด้านบน", "A black sesame pudding shaped like a crescent on a cream plate, dusted with silver", 44),
  berryCreamScones: dish("สโคนครีมเบอร์รี่", "Berry cream scones", "สโคนสีทองสองชิ้นผ่าครึ่ง ไส้ครีมสีชมพูกับเบอร์รี่สีแดงม่วง", "Two golden scones split open, filled with pink cream and red and purple berries", 38),
  cocoaMousse: dish("มูสโกโก้", "Cocoa mousse", "มูสโกโก้สีน้ำตาลเข้มในแก้วเล็ก มีครีมสีอ่อนวนอยู่ด้านบน", "Dark cocoa mousse in a small glass, a swirl of pale cream on top", 42),
  pollenTart: dish("ทาร์ตครีมเกสร", "Pollen tart", "ทาร์ตขอบหยักสีทอง ไส้ครีมเหลืองอ่อนโรยเกสร มีดอกไม้ขาวดอกเล็กตรงกลาง", "A crimped golden tart of pale yellow cream dusted with pollen, a tiny white flower in the middle", 38),
  phoenixBake: dish("ไข่อบเตาฟีนิกซ์", "Phoenix bake", "ถาดเหล็กหล่อใบใหญ่ ไข่อบในซอสครีมสีทอง มีแผงขนนกสีแดงทองตั้งอยู่ด้านหลัง ประกายไฟลอยอยู่", "A great cast-iron platter of eggs baked in golden sauce, a fan of red-gold feathers at its back and sparks above", 70),
  pearlBroth: dish("ซุปทะเลลึกมุกดำ", "Black pearl broth", "หม้อดินสีน้ำทะเลใบใหญ่ น้ำซุปสีเขียวเข้มกับสาหร่าย มีไข่มุกดำเม็ดโตอยู่ตรงกลาง", "A great sea-blue tureen of dark teal broth with seaweed, a large black pearl gleaming in its middle", 80),
  milkyWayCake: dish("เค้กทางช้างเผือก", "Milky Way cake", "เค้กสามชั้นสีกรมท่าบนขาตั้ง มีครีมขาววนเป็นเกลียวโรยดาวสีเหลืองนวล", "A tall three-layer navy cake on a stand, a spiral of white cream dotted with pale stars winding round it", 90),
};

/** What each gives and its recipe (the special last, so that a found recipe hides it). */
export const SPECIAL_DISHES: Record<SpecialDishId, Dish> = {
  fireflyCustard: { stamina: 36, buff: "moonSight", recipe: { needs: [["milk", 1], ["sugar", 1], ["fireflyEgg", 1]], in: ["steamer"], serves: 3, cooks: 1 } },
  cloudPancake: { stamina: 38, buff: "featherlight", recipe: { needs: [["flour", 1], ["milk", 1], ["butter", 1], ["swirlCloudEgg", 1]], in: ["panBrass"], serves: 3, cooks: 1 } },
  luckyFriedRice: { stamina: 40, buff: "lucky", recipe: { needs: [["rice", 3], ["chili", 1], ["oil", 1], ["luckySevenEgg", 1]], in: ["wok"], serves: 3, cooks: 1 } },
  moonSesamePudding: { stamina: 38, buff: "luckyMatch", recipe: { needs: [["sesame", 2], ["cream", 1], ["sugar", 1], ["moonShadowEgg", 1]], in: ["steamer"], serves: 3, cooks: 1 } },
  berryCreamScones: { stamina: 36, buff: "gentle", recipe: { needs: [["flour", 2], ["butter", 1], ["sugar", 1], ["wildBerryCream", 1]], in: ["rollingPin", "oven"], serves: 6, cooks: 2 } },
  cocoaMousse: { stamina: 36, buff: "aroma", recipe: { needs: [["swirlCloudEgg", 1], ["sugar", 1], ["cocoaCreamTop", 1]], in: ["pot", "stoneBowl"], serves: 4, cooks: 2 } },
  pollenTart: { stamina: 36, buff: "scent", recipe: { needs: [["flour", 1], ["butter", 1], ["gardenHoney", 1], ["pollenCream", 1]], in: ["rollingPin", "oven"], serves: 6, cooks: 2 } },
  phoenixBake: { stamina: 48, buff: "hearty", recipe: { needs: [["egg", 6], ["cream", 2], ["chili", 2], ["rebirthFlameEgg", 1]], in: ["oven", "cleaver", "panBrass", "pot"], serves: 20, cooks: 4 } },
  pearlBroth: { stamina: 48, buff: "lucky", recipe: { needs: [["fishStock", 2], ["seaweed", 3], ["prawn", 2], ["ginger", 1], ["blackDeepPearlEgg", 1]], in: ["hotpot", "cleaver", "mortar", "steamer"], serves: 20, cooks: 4 } },
  milkyWayCake: { stamina: 50, buff: "featherlight", recipe: { needs: [["flour", 3], ["butter", 2], ["sugar", 2], ["moonShadowEgg", 2], ["cometMilkCrystal", 1]], in: ["oven", "stoneBowl", "rollingPin", "pot"], serves: 20, cooks: 4 } },
};
export const SPECIAL_DISH_IDS = Object.keys(SPECIAL_DISHES) as SpecialDishId[];
/** The village feast's three, of the legend specials: twenty helpings, and eaten together at the table each a level more (lib/town/special-uses). */
export const LEGEND_DISHES: readonly SpecialDishId[] = ["phoenixBake", "pearlBroth", "milkyWayCake"];

/** A scroll for each, as every dish has; written only, on a blank recipe paper (lib/town/special-uses' `writeScroll`). */
export const SPECIAL_DISH_SCROLLS = Object.fromEntries(SPECIAL_DISH_IDS.map((d) => [`scroll${d[0].toUpperCase()}${d.slice(1)}`, d])) as Record<string, SpecialDishId>;
/** What a written scroll fetches: the paper's own price (a paper written is worth no more coins than the paper was). */
export const WRITTEN_PAYS = 15;
export const SPECIAL_DISH_SCROLL_ITEMS: Record<string, Item> = Object.fromEntries(Object.entries(SPECIAL_DISH_SCROLLS).map(([id, d]) => {
  const it = SPECIAL_DISH_ITEMS[d];
  return [id, { kind: "scroll", tier: 3, name: { th: `ม้วนสูตร ${it.name.th}`, en: `Recipe scroll: ${it.name.en}` }, about: { th: "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", en: "A roll of paper tied with red string. Something is written inside." }, stack: 1, pays: WRITTEN_PAYS } satisfies Item];
}));
