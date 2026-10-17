import type { Item } from "./items";

/**
 * Things to wear that are kept in the bag (v277; the owner, 2026-10-17: "ทำ 46 ชิ้นก่อน", of the list both AIs made):
 * twenty made at the workbench from what the town already gives, and four on the uncle's shelf. Each is kept, sold,
 * traded and dropped like any thing until it is worn once ("ใส่" in the bag, town_dress), and then it is in the
 * wardrobe for good (lib/town/wear's DRESS_ITEMS says which is which). The round glasses of v276 are lib/town/items'
 * own `wearGlasses`. A made thing's bench fee is what the uncle's family pays for it (lib/town/crafting's craftFee), so
 * making and selling one mints nothing.
 */
const item = (th: string, en: string, aboutTh: string, aboutEn: string, pays: number, tier: Item["tier"] = 2): Item =>
  ({ kind: "goods", tier, name: { th, en }, about: { th: aboutTh, en: aboutEn }, stack: 5, pays });
const WORN = { th: " กด \"ใส่\" ในกระเป๋าแล้วจะอยู่ในตู้แต่งตัวตลอดไป", en: " Wear it from the bag and it is in your wardrobe for good." };
// (a made thing, of the second tier, says only what it looks like, as every later thing does: lib/town/tiers.test; the
// bag's "ใส่" says the rest)
const made = (th: string, en: string, aboutTh: string, aboutEn: string, pays: number) => item(th, en, aboutTh, aboutEn, pays);
const sold = (th: string, en: string, aboutTh: string, aboutEn: string, pays: number) => item(th, en, aboutTh + WORN.th, aboutEn + WORN.en, pays, 1);

export const WEAR_ITEMS = {
  // ── made at the workbench ──
  wearSmith: made("ผ้ากันเปื้อนช่างตีเหล็ก", "Smith's apron", "ผ้ากันเปื้อนหนังผืนหนา มีกระเป๋าใหญ่ด้านหน้า", "A heavy leather apron with a big front pocket.", 160),
  wearWeaver: made("เสื้อกั๊กทอลาย", "Woven waistcoat", "เสื้อกั๊กขนสัตว์ทอลายฟันปลาสีแดง เหลือง เขียวหัวเป็ด", "A wool waistcoat woven in red, yellow and teal zigzags.", 160),
  wearWitch: made("หมวกแม่มด", "Witch's hat", "หมวกปลายแหลมสีดำ ปลายพับลงข้างหนึ่ง", "A tall pointed black hat with its tip bent over.", 120),
  wearBeret: made("หมวกเบเรต์", "Beret", "หมวกผ้านุ่มสีแดง สวมเอียงนิดๆ", "A soft red beret, worn at a tilt.", 80),
  wearTraveller: made("หมวกนักเดินทาง", "Traveller's hat", "หมวกสักหลาดสีน้ำตาลเหน็บขนนกสีฟ้าขาว", "A brown felt hat with a blue-and-white feather in its band.", 120),
  wearPumpkin: made("หมวกฟักทอง", "Pumpkin hat", "หมวกฟักทองลูกกลม มีขั้วกับใบเล็กๆ ข้างบน", "A round ribbed pumpkin with its stem and a leaf on top.", 80),
  wearSmithGoggles: made("แว่นช่างตีเหล็ก", "Smith's goggles", "แว่นครอบขอบทองเหลือง เลนส์เขียวควัน", "Brass-rimmed goggles with smoky green lenses.", 120),
  wearCopper: made("แว่นกรอบทองแดง", "Copper spectacles", "แว่นทรงรี กรอบทองแดงหนาวาว", "Oval spectacles with a thick shiny copper frame.", 80),
  wearCrystal: made("แว่นกรอบคริสตัล", "Crystal glasses", "แว่นกรอบผลึกสีม่วงอ่อน มีเหลี่ยมผลึกที่มุม", "Glasses framed in pale lilac crystal, a point at each corner.", 180),
  wearAmber: made("แว่นกรอบกระ", "Tortoiseshell glasses", "แว่นกลมกรอบหนาลายกระสีอำพัน", "Round glasses with a thick amber tortoiseshell frame.", 120),
  wearHexagon: made("แว่นหกเหลี่ยม", "Hexagonal glasses", "แว่นลวดทองบาง เลนส์หกเหลี่ยม", "Thin gold wire glasses with six-sided lenses.", 120),
  wearScarf: made("ผ้าพันคอไหมพรม", "Knitted scarf", "ผ้าพันคอถักสีเหลืองมัสตาร์ดลายแดง", "A chunky mustard-yellow scarf with red stripes.", 80),
  wearLei: made("พวงมาลัยดอกไม้", "Flower garland", "พวงมาลัยดอกไม้เล็กสีชมพู ขาว เหลือง", "A thick garland of small pink, white and yellow flowers.", 60),
  wearBeads: made("สร้อยลูกปัดไม้", "Wooden beads", "สร้อยลูกปัดไม้กลมสองสีบนเชือกเข้ม", "Big round wooden beads in two browns on a dark cord.", 80),
  wearTassel: made("ปิ่นพู่ไหม", "Tassel hairpin", "ปิ่นทองห้อยพู่ไหมสีแดง", "A gold hairpin with a red silk tassel.", 120),
  wearCatEars: made("ที่คาดผมหูแมว", "Cat ears", "ที่คาดผมสีดำมีหูแมวด้านในสีชมพู", "A black hairband with pink-lined cat ears.", 80),
  wearBunnyEars: made("ที่คาดผมหูกระต่าย", "Rabbit ears", "ที่คาดผมสีขาวมีหูกระต่ายยาว พับปลายข้างหนึ่ง", "A white hairband with long rabbit ears, one bent over.", 80),
  wearHorns: made("เขาปีศาจ", "Little horns", "เขาโค้งเล็กๆ สีแดงเข้มคู่หนึ่ง", "A pair of small curved dark red horns.", 120),
  wearTiara: made("มงกุฎเงินจิ๋ว", "Tiny tiara", "มงกุฎเงินเล็กๆ ประดับพลอยสีฟ้าเม็ดเดียว", "A small silver tiara with one pale-blue gem.", 180),
  wearCrown: made("มงกุฎดอกไม้", "Flower crown", "วงดอกไม้เล็กกับใบไม้สีเขียวสวมรอบศีรษะ", "A ring of small flowers and leaves around the head.", 60),
  // ── on the uncle's shelf ──
  wearMonocle: sold("แว่นตาข้างเดียว", "Monocle", "เลนส์กลมขอบทองข้างเดียว มีสายโซ่ห้อย", "A single gold-rimmed lens on a thin chain.", 300),
  wearSquare: sold("แว่นกรอบเหลี่ยม", "Square glasses", "แว่นกรอบดำหนาทรงสี่เหลี่ยม", "Thick black square-framed glasses.", 75),
  wearNecktie: sold("เนกไท", "Necktie", "เนกไทสีกรมท่าลายทางทองเฉียง", "A navy necktie with thin diagonal gold stripes.", 120),
  wearRibbon: sold("โบผมใหญ่", "Big ribbon", "โบผ้าซาตินสีแดงใหญ่ สวมบนศีรษะ", "A big red satin bow, worn on top of the head.", 45),
} as const satisfies Record<string, Item>;
export type WearItemId = keyof typeof WEAR_ITEMS;

/** Which thing to wear each of the bag's things is (lib/town/wear: an outfit, a hat, or a face, neck or hair thing). */
export const WEAR_BAG: Record<WearItemId, string> = {
  wearSmith: "smith", wearWeaver: "weaver", wearWitch: "witch", wearBeret: "beret", wearTraveller: "traveller", wearPumpkin: "pumpkin",
  wearSmithGoggles: "smithgoggles", wearCopper: "copper", wearCrystal: "crystal", wearAmber: "amber", wearHexagon: "hexagon",
  wearScarf: "scarf", wearLei: "lei", wearBeads: "beads", wearTassel: "tassel", wearCatEars: "catears", wearBunnyEars: "bunnyears",
  wearHorns: "horns", wearTiara: "tiara", wearCrown: "crown",
  wearMonocle: "monocle", wearSquare: "square", wearNecktie: "necktie", wearRibbon: "ribbon",
};

/** What each is made of at the workbench (lib/town/crafting): only what the town's lines already give. */
export const WEAR_CRAFTS = {
  wearSmith: [["steelPlate", 2], ["silkenCord", 2], ["charcoal", 2]],
  wearWeaver: [["silkTwist", 4], ["wildflower", 3], ["rope", 1]],
  wearWitch: [["silkTwist", 3], ["charcoal", 2], ["moonflower", 1]],
  wearBeret: [["silkTwist", 3], ["raspberry", 2]],
  wearTraveller: [["feather", 6], ["silkTwist", 2], ["resin", 1]],
  wearPumpkin: [["pumpkin", 1], ["vine", 3]],
  wearSmithGoggles: [["crystalLens", 2], ["copperBlank", 1], ["silkenCord", 1]],
  wearCopper: [["copperBlank", 2], ["crystalLens", 1]],
  wearCrystal: [["crystalLens", 2], ["quartzCore", 1]],
  wearAmber: [["crystalLens", 1], ["amber", 2], ["chitinPlate", 1]],
  wearHexagon: [["crystalLens", 2], ["chipTopaz", 1]],
  wearScarf: [["silkTwist", 4], ["wildflower", 2]],
  wearLei: [["wildflower", 6], ["vine", 2]],
  wearBeads: [["heartwood", 2], ["rootTwine", 2]],
  wearTassel: [["silverNodule", 1], ["silkenCord", 1]],
  wearCatEars: [["silkTwist", 2], ["charcoal", 1], ["wildflower", 1]],
  wearBunnyEars: [["silkCocoon", 4], ["wildflower", 1]],
  wearHorns: [["chipRuby", 1], ["carvingBlank", 1]],
  wearTiara: [["silverNodule", 2], ["chipSapphire", 1]],
  wearCrown: [["wildflower", 4], ["vine", 2]],
} as const;

/** The uncle's four: [price, how many for the village a round, how many each] as lib/town/trade's goods. */
export const WEAR_GOODS = {
  wearMonocle: [2000, 3, 1], wearSquare: [500, 6, 1], wearNecktie: [800, 4, 1], wearRibbon: [300, 6, 1],
} as const satisfies Partial<Record<WearItemId, readonly [number, number, number]>>;
