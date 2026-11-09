import type { Dish, Item, Make } from "./items";
import { BREEDS, GRAPH, SPECIES_IDS, breedOf, scrollOf } from "./animals";
import { SPECIALS, type SpecialId } from "./specials";

/**
 * The pasture's things (lib/town/animals, docs/plans/animals/README.md): what the 32 breeds give, what is made of it,
 * what animals eat, the tools of the three games, the meadow's forage by the hour, the dishes and the breed scrolls.
 * Descriptions say what a thing looks like, never what it is for.
 */
const item = (kind: Item["kind"], th: string, en: string, shTh: string, shEn: string, pays: number, tier: 1 | 2 | 3 = 2, stack?: number): Item =>
  ({ kind, tier, name: { th, en }, about: { th: shTh, en: shEn }, stack: stack ?? (kind === "tool" ? 1 : 20), pays });
const goods = (th: string, en: string, shTh: string, shEn: string, pays: number, tier: 2 | 3 = 2) => item("goods", th, en, shTh, shEn, pays, tier);
const wild = (th: string, en: string, shTh: string, shEn: string, pays: number, tier: 2 | 3 = 2) => item("wild", th, en, shTh, shEn, pays, tier);
/** The barn's tools are of the first tier: the stall sells them, so that a tool of a later tier needs no craft path (lib/town/crafting). */
const tool = (th: string, en: string, shTh: string, shEn: string, pays: number) => item("tool", th, en, shTh, shEn, pays, 1);
const dish = (th: string, en: string, shTh: string, shEn: string, pays: number, tier: 2 | 3 = 2) => item("dish", th, en, shTh, shEn, pays, tier, 5);

/** What each breed gives (its family's thing of its own kind), what is made of it, and the barn's tools. */
export const ANIMAL_ITEMS = {
  // ── eggs (the family "egg": every one is an egg in a recipe that asks for one) ──
  farmEgg: goods("ไข่ไก่สดจากฟาร์ม", "Farm egg", "ไข่สีน้ำตาลอ่อน มีเศษฟางติดเปลือก", "A pale brown egg with a wisp of straw on its shell", 5),
  silkieEgg: goods("ไข่ไก่ซิลกี้", "Silkie egg", "ไข่ฟองเล็กสีครีมนวล", "A small, soft cream egg", 5),
  blueEgg: goods("ไข่เปลือกฟ้า", "Blue egg", "ไข่เปลือกสีฟ้าอ่อนเหมือนท้องฟ้าเช้า", "An egg with a shell the pale blue of a morning sky", 5),
  chocolateEgg: goods("ไข่เปลือกช็อกโกแลต", "Chocolate egg", "ไข่เปลือกสีน้ำตาลเข้มมีจุดกระ", "A dark brown egg with freckles", 5),
  lanternEgg: goods("ไข่โคมไฟ", "Lantern egg", "ไข่สีอำพันที่มีแสงอุ่นๆ เรืองอยู่ข้างใน", "An amber egg with a warm light glowing inside", 8, 3),
  cloudEgg: goods("ไข่เมฆ", "Cloud egg", "ไข่สีขาวนวลเบาหวิวจนเหมือนจะลอยได้", "A milk-white egg so light it seems about to float", 8, 3),
  goldenEgg: goods("ไข่ทองคำ", "Golden egg", "ไข่เปลือกสีทองเป็นเงาวาว", "An egg with a shining golden shell", 8, 3),
  emberEgg: goods("ไข่ถ่านแดง", "Ember egg", "ไข่สีแดงส้มอุ่นมือ มีประกายไฟวิบวับ", "A red-orange egg, warm in the hand, flickering with sparks", 10, 3),
  duckEgg: goods("ไข่เป็ด", "Duck egg", "ไข่ฟองใหญ่สีขาวอมฟ้าจางๆ", "A large egg, white with a hint of blue", 10),
  runnerEgg: goods("ไข่เป็ดวิ่ง", "Runner egg", "ไข่เรียวยาวสีขาวนวล", "A long, slim, creamy white egg", 10),
  cayugaEgg: goods("ไข่เป็ดคายูกา", "Cayuga egg", "ไข่เปลือกสีเทาเขียวเข้ม", "An egg with a dark grey-green shell", 10),
  mandarinEgg: goods("ไข่เป็ดแมนดาริน", "Mandarin egg", "ไข่สีครีมมีลายจุดส้มอ่อน", "A cream egg dotted with soft orange", 10),
  rainEgg: goods("ไข่หยดน้ำ", "Rain egg", "ไข่ใสเหมือนหยดน้ำ ข้างในมีน้ำกระเพื่อม", "An egg clear as a raindrop, water rippling inside", 15, 3),
  moonEgg: goods("ไข่จันทรา", "Moon egg", "ไข่สีขาวมุกเรืองแสงจางๆ เหมือนจันทร์เสี้ยว", "A pearl-white egg glowing faintly like a crescent moon", 15, 3),
  paperEgg: goods("ไข่กระดาษพับ", "Folded paper egg", "ไข่ที่เปลือกพับเป็นจีบเหมือนกระดาษ", "An egg whose shell is folded in pleats like paper", 15, 3),
  leviathanEgg: goods("ไข่เลวีอาธาน", "Leviathan egg", "ไข่สีน้ำทะเลลึก มีลายเกล็ดเหลือบ", "A deep-sea blue egg with a shimmer of scales", 20, 3),
  // ── wool (the family "wool") ──
  wool: goods("ขนแกะ", "Wool", "ก้อนขนแกะสีขาวนุ่มฟู", "A soft white tuft of fleece", 12),
  shetlandWool: goods("ขนแกะเช็ตแลนด์", "Shetland wool", "ขนแกะสีน้ำตาลเทาหลายเฉดในก้อนเดียว", "A tuft in many shades of brown and grey", 12),
  jacobWool: goods("ขนแกะจาค็อบ", "Jacob wool", "ขนแกะลายด่างขาวสลับดำ", "A tuft piebald black and white", 12),
  valaisWool: goods("ขนแกะวาเลส์", "Valais wool", "ขนแกะขาวเป็นลอนยาวฟูมาก", "A long, very fluffy white curl", 12),
  dandelionWool: goods("ขนแกะแดนดิไลออน", "Dandelion wool", "ขนฟูเป็นพู่เบาบางเหมือนเมล็ดแดนดิไลออน", "Light puffs of fluff like dandelion seeds", 18, 3),
  rainbowWool: goods("ขนแกะสายรุ้ง", "Rainbow wool", "ขนแกะเป็นริ้วเจ็ดสีไล่กัน", "A tuft banded in seven colours", 18, 3),
  starWool: goods("ขนแกะดาว", "Star wool", "ขนแกะสีน้ำเงินเข้มมีจุดเรืองแสง", "A deep-blue tuft with glowing specks", 18, 3),
  goldenWool: goods("ขนแกะทองคำ", "Golden wool", "ขนแกะเป็นลอนสีทองเปล่งประกาย", "A curl of fleece that shines like gold", 24, 3),
  // ── milk (the family "milk": every one is milk in a recipe that asks for it) ──
  farmMilk: goods("นมสดจากฟาร์ม", "Farm milk", "นมขาวข้นในขวดแก้วปากกว้าง ปิดผ้าขาวบาง", "Thick white milk in a wide glass bottle tied with muslin", 10),
  jerseyMilk: goods("นมวัวเจอร์ซีย์", "Jersey milk", "นมสีครีมเข้มมีชั้นไขมันลอยหน้า", "Rich cream-coloured milk with a layer floating on top", 10),
  highlandMilk: goods("นมวัวไฮแลนด์", "Highland milk", "นมขาวในกระติกไม้มีหูจับ", "White milk in a wooden pail with a handle", 10),
  swissMilk: goods("นมวัวบราวน์สวิส", "Brown Swiss milk", "นมขาวในขวดทรงสูงจุกสีน้ำตาล", "White milk in a tall bottle with a brown stopper", 10),
  strawberryMilk: goods("นมสตรอว์เบอร์รี่", "Strawberry milk", "นมสีชมพูอ่อนหอมกลิ่นผลไม้", "Pale pink milk with a fruity smell", 15, 3),
  cocoaMilk: goods("นมโกโก้", "Cocoa milk", "นมสีน้ำตาลเข้มหอมกรุ่น", "Dark brown milk with a warm smell", 15, 3),
  flowerMilk: goods("นมดอกไม้", "Flower milk", "นมสีขาวมีกลีบดอกไม้เล็กๆ ลอยอยู่", "White milk with tiny petals floating in it", 15, 3),
  starMilk: goods("นมดาว", "Star milk", "นมสีกรมท่าที่มีประกายเหมือนทางช้างเผือก", "Midnight-blue milk sparkling like the Milky Way", 20, 3),
  // ── what is made of them (kitchen preparations: they keep the lowest grade that went in) ──
  cream: goods("ครีมสด", "Fresh cream", "ครีมขาวข้นในถ้วยดินเผา", "Thick white cream in an earthenware cup", 27),
  butter: goods("เนยสด", "Butter", "ก้อนเนยสีเหลืองอ่อนห่อผ้าขาว", "A pale yellow block wrapped in cloth", 73),
  farmCheese: goods("ชีสฟาร์ม", "Farm cheese", "ชีสก้อนกลมเปลือกสีเหลืองนวล", "A round cheese with a pale yellow rind", 44),
  yarn: goods("ไหมพรม", "Yarn", "ไหมพรมขาวนุ่มม้วนเป็นกลุ่ม", "A soft white ball of yarn", 32),
  woolScarf: goods("ผ้าพันคอถัก", "Knitted scarf", "ผ้าพันคอถักลายเปียสีขาวนวล", "A cream scarf knitted in cables", 86),
  rainbowScarf: goods("ผ้าพันคอสายรุ้ง", "Rainbow scarf", "ผ้าพันคอถักเป็นริ้วเจ็ดสี", "A scarf knitted in seven-coloured stripes", 92, 3),
  starScarf: goods("ผ้าพันคอดาว", "Star scarf", "ผ้าพันคอสีน้ำเงินเข้มมีจุดเรืองแสงระยิบ", "A deep-blue scarf twinkling with glowing specks", 92, 3),
  goldenScarf: goods("ผ้าพันคอขนทองคำ", "Golden scarf", "ผ้าพันคอถักจากเส้นสีทองเปล่งประกาย", "A scarf knitted of shining golden thread", 120, 3),
  prism: goods("ปริซึมแสงรุ้ง", "Rainbow prism", "แท่งผลึกใสที่แตกแสงเป็นสีรุ้งบนพื้น", "A clear crystal bar that throws rainbows on the ground", 20, 3),
  // ── what they eat ──
  chickFeed: goods("อาหารไก่", "Chicken feed", "ถุงผ้าใส่เมล็ดธัญพืชผสมสีทอง", "A cloth bag of golden mixed grain", 2),
  duckFeed: goods("อาหารเป็ด", "Duck feed", "ถุงผ้าใส่เม็ดอาหารสีเขียวอ่อนผสมผักน้ำ", "A cloth bag of pale green pellets and waterweed", 3),
  sheepFeed: goods("หญ้าแห้งอัดก้อน", "Hay bale", "ก้อนหญ้าแห้งสีเหลืองมัดเชือกสองเส้น", "A yellow bale of hay tied with two strings", 4),
  cowFeed: goods("อาหารวัว", "Cattle feed", "กระสอบหญ้าแห้งผสมข้าวโพดบด", "A sack of hay mixed with cracked corn", 5),
  chickGrow: goods("อาหารเร่งโตลูกเจี๊ยบ", "Chick starter", "ถุงเล็กใส่เม็ดอาหารละเอียดสีเหลืองอ่อน", "A small bag of fine pale yellow crumbs", 5),
  duckGrow: goods("อาหารเร่งโตลูกเป็ด", "Duckling starter", "ถุงเล็กใส่เม็ดอาหารสีเขียวละเอียด", "A small bag of fine green crumbs", 7),
  lambGrow: goods("นมอุ่นลูกแกะ", "Lamb's warm milk", "ขวดนมแก้วมีจุกยางสีแดง", "A glass bottle with a red teat", 12),
  calfGrow: goods("นมอุ่นลูกวัว", "Calf's warm milk", "ขวดนมใบใหญ่มีจุกยางสีฟ้า", "A big bottle with a blue teat", 20),
  dewGrow: goods("อาหารเร่งโตโคลเวอร์น้ำค้าง", "Dew-clover mash", "ถ้วยดินใส่ใบโคลเวอร์บดที่ยังมีหยดน้ำค้างเกาะ", "An earthen cup of crushed clover still beaded with dew", 15, 3),
  packedRation: goods("อาหารอัดสามวัน", "Packed ration", "ก้อนอาหารอัดแน่นห่อใบไม้สีเงิน", "A dense block of fodder wrapped in silvery leaves", 12, 3),
  // (a name changed after the first: the owner, 2026-10-20, "ถ้าอยากเปลี่ยนชื่อต้อง ซื้อไอเทมเปลี่ยนชื่อจากลุงเลี้ยงสัตว์ ราคา 500")
  renameTag: goods("ป้ายเปลี่ยนชื่อสัตว์", "Rename tag", "ป้ายไม้เล็กผูกเชือกแดง หน้าป้ายยังว่างอยู่", "A small wooden tag on a red string, its face still blank", 0),
  // ── the games' tools and the makings' ──
  milker: tool("เครื่องรีดนมมือโยก", "Hand-pump milker", "ถังทองเหลืองมีคันโยกไม้สองข้างและสายยางสองเส้น", "A brass pail with two wooden pump handles and two hoses", 90),
  woolShears: tool("กรรไกรตัดขนแกะ", "Shears", "กรรไกรเหล็กใบโค้ง ด้ามไม้พันเชือก", "Curved steel shears with rope-wrapped handles", 30),
  eggBasket: tool("ตะกร้าบุนวมเก็บไข่", "Padded egg basket", "ตะกร้าหวายบุผ้านุ่มสีแดงลายตาราง", "A wicker basket lined with soft red gingham", 12),
  churn: tool("ถังปั่นเนย", "Wooden churn", "ถังไม้ทรงสูงมีด้ามไม้กระทุ้งตรงกลาง", "A tall wooden barrel with a dasher through its lid", 40),
  cheesePress: tool("เครื่องอัดชีส", "Cheese press", "กรอบไม้มีเกลียวหมุนกดแผ่นไม้ลงในพิมพ์กลม", "A wooden frame whose screw presses a board into a round mould", 50),
  spindle: tool("ไม้ปั่นด้าย", "Drop spindle", "แท่งไม้เรียวมีจานไม้กลมที่ปลาย", "A slim wooden rod with a round wooden whorl", 30),
  knittingNeedles: tool("ไม้ถักนิตติ้ง", "Knitting needles", "ไม้ถักสองอันปลายมน มีลูกปัดที่หัว", "Two round-tipped needles with beads at their heads", 30),
  // ── the meadow's forage: two a band, some of two bands (lib/town/meadow) ──
  mistVetch: wild("ถั่วหมอก", "Mist vetch", "ต้นถั่วเลื้อยดอกม่วงซีดมีหยดหมอกเกาะ", "A pale-purple vetch beaded with mist", 10, 3),
  ghostReed: wild("กกหมอกเงิน", "Ghost reed", "ต้นกกสีเงินโปร่งแสงอยู่ริมน้ำ", "A translucent silver reed from the water's edge", 10, 3),
  dewClover: wild("โคลเวอร์น้ำค้าง", "Dew clover", "ใบโคลเวอร์สามแฉกเกาะหยดน้ำค้างใสแจ๋ว", "Three-leaved clover covered in clear dew", 10, 3),
  dawnOats: wild("ข้าวโอ๊ตอรุณ", "Dawn oats", "รวงข้าวโอ๊ตสีชมพูทองยามเช้า", "Oat sprays tinged pink-gold with dawn", 10, 3),
  meadowOats: wild("ข้าวโอ๊ตทุ่ง", "Meadow oats", "รวงข้าวโอ๊ตสีฟางห้อยระย้า", "Drooping straw-coloured oat sprays", 3),
  sweetTimothy: wild("หญ้าทิมโมธีหวาน", "Sweet timothy", "หญ้าใบยาวช่อดอกเป็นแท่งสีเขียวนวล", "Long grass with soft green spikes", 3),
  sunAlfalfa: wild("อัลฟัลฟาแดด", "Sun alfalfa", "ใบอัลฟัลฟาเขียวสดกับดอกม่วงเล็กๆ", "Bright green alfalfa with little purple flowers", 4),
  pondMillet: wild("ข้าวฟ่างริมบ่อ", "Pond millet", "รวงข้าวฟ่างเมล็ดกลมสีครีม", "Heads of round cream millet", 4),
  copperSedge: wild("กกทองแดง", "Copper sedge", "ใบกกเรียวสีทองแดงแดดบ่าย", "Slim sedge leaves the copper of afternoon sun", 4),
  orchardPea: wild("ถั่วลันเตาสวน", "Orchard pea", "ฝักถั่วเขียวอ่อนพองๆ ห้อยเป็นพวง", "Plump pale green pods in a bunch", 4),
  amberClover: wild("โคลเวอร์อำพัน", "Amber clover", "ใบโคลเวอร์สีเขียวอมส้มยามเย็น", "Clover leaves gone orange-green at evening", 4),
  reedSeed: wild("เมล็ดกก", "Reed seed", "ช่อเมล็ดกกสีน้ำตาลฟูนุ่ม", "Soft brown plumes of reed seed", 3),
  lanternGrass: wild("หญ้าตะเกียง", "Lantern grass", "หญ้าช่อดอกกลมเรืองแสงสีเหลืองอ่อน", "Grass with round, softly glowing yellow heads", 5),
  velvetVetch: wild("ถั่วกำมะหยี่", "Velvet vetch", "ใบถั่วนุ่มเหมือนกำมะหยี่สีเขียวเข้ม", "Dark green vetch leaves soft as velvet", 5),
  moonOats: wild("ข้าวโอ๊ตจันทร์", "Moon oats", "รวงข้าวโอ๊ตสีเงินซีดใต้แสงจันทร์", "Pale silver oat sprays in moonlight", 5),
  nightDuckweed: wild("แหนราตรี", "Night duckweed", "แผ่นแหนเล็กๆ สีเขียวเข้มเกือบดำ", "Tiny dark, almost black-green duckweed", 4),
  // ── dishes ──
  custard: dish("คัสตาร์ดไข่", "Egg custard", "คัสตาร์ดสีเหลืองนวลในถ้วยกระเบื้อง ผิวเรียบเนียน", "A smooth pale yellow custard in a china cup", 18, 3),
  pancakes: dish("แพนเค้กเนยสด", "Butter pancakes", "แพนเค้กซ้อนสามชั้นมีเนยละลายด้านบน", "A stack of three pancakes with butter melting on top", 22, 3),
  cheesecake: dish("ชีสเค้ก", "Cheesecake", "ชีสเค้กเนื้อเนียนสีครีม ขอบสีทอง", "A smooth cream cheesecake with a golden edge", 40, 3),
  butterCookies: dish("คุกกี้เนยสด", "Butter cookies", "คุกกี้กลมสีทองเรียงในกล่องสังกะสี", "Round golden cookies in a tin", 26, 3),
  quiche: dish("คีชไข่และชีส", "Egg and cheese quiche", "พายแป้งกรอบไส้ไข่และชีสสีทอง", "A crisp tart filled with golden egg and cheese", 36, 3),
  lanternCustard: dish("พุดดิ้งโคมไฟ", "Lantern pudding", "พุดดิ้งสีอำพันที่มีแสงอุ่นๆ เรืองอยู่ตรงกลาง", "An amber pudding with a warm light glowing at its heart", 40, 3),
  cloudSouffle: dish("ซูเฟล่เมฆ", "Cloud souffle", "ซูเฟล่ฟูสูงขาวนวลเหมือนก้อนเมฆ", "A tall white souffle risen like a cloud", 44, 3),
  goldenOmelette: dish("ไข่เจียวทองคำ", "Golden omelette", "ไข่เจียวพับครึ่งสีทองประกายวาว", "A folded omelette of glittering gold", 46, 3),
  emberBakedEggs: dish("ไข่อบเปลวไฟ", "Ember-baked eggs", "ไข่อบในซอสมะเขือเทศที่ยังมีประกายไฟเล็กๆ", "Eggs baked in tomato with little sparks still dancing", 56, 3),
  rainBroth: dish("ซุปหยดฝน", "Raindrop broth", "ซุปใสมีผักน้ำและไข่ลอยเหมือนหยดฝน", "A clear soup of waterweed with an egg floating like a raindrop", 38, 3),
  moonPudding: dish("พุดดิ้งจันทรา", "Moon pudding", "พุดดิ้งสีขาวมุกทรงจันทร์เสี้ยว", "A pearl-white pudding shaped like a crescent", 40, 3),
  paperFish: dish("ปลาอบห่อกระดาษ", "Fish in paper", "ปลาอบในห่อกระดาษพับรูปเรือ", "Fish baked in a parcel folded like a boat", 38, 3),
  leviathanEggCup: dish("ไข่ตุ๋นทะเลลึก", "Deep-sea steamed egg", "ไข่ตุ๋นสีน้ำทะเลมีกุ้งอยู่ข้างบน", "A sea-blue steamed egg with a prawn on top", 58, 3),
  strawberryShake: dish("นมปั่นสตรอว์เบอร์รี่", "Strawberry shake", "แก้วสูงใส่นมปั่นสีชมพูมีหลอดลาย", "A tall glass of pink shake with a striped straw", 30, 3),
  hotCocoa: dish("โกโก้ร้อน", "Hot cocoa", "แก้วมัคโกโก้ร้อนมีมาร์ชเมลโล่ลอย", "A mug of hot cocoa with marshmallows floating", 30, 3),
  flowerLatte: dish("ลาเต้ดอกไม้", "Flower latte", "ถ้วยลาเต้มีฟองนมเป็นรูปดอกไม้", "A cup of latte with foam in the shape of a flower", 30, 3),
  starPudding: dish("พุดดิ้งทางช้างเผือก", "Milky Way pudding", "พุดดิ้งสีกรมท่าระยิบระยับเหมือนท้องฟ้ากลางคืน", "A midnight-blue pudding sparkling like the night sky", 60, 3),
} as const satisfies Record<string, Item>;
export type AnimalItemId = keyof typeof ANIMAL_ITEMS;

/**
 * The bred breeds' specials (lib/town/specials, the idea patch of 2026-11-09): one a breed, B to H. A special takes the
 * place of a unit of its breed's produce and fetches what that unit would (its `pays` and tier are the produce's, and it
 * carries a grade as the produce does). What each is used for is the next stage's (new dishes, buffs, the feast, the
 * tailor's wool): nothing reads them yet but the bag, a deal, the board, a stall and the uncle. Their words say what
 * each looks like, never what it is for.
 */
const SPECIAL_WORDS: Record<SpecialId, [th: string, en: string, lookTh: string, lookEn: string]> = {
  silkieTwinEgg: ["ไข่แดงคู่ซิลกี้", "Silkie twin-yolk egg", "ไข่สีครีมที่เห็นไข่แดงสีส้มนวลสองวงเรียงกันอยู่ข้างใน มีขนอ่อนสีขาวติดเปลือก", "A cream egg with two soft orange yolks showing side by side, a tuft of white down stuck to it"],
  dawnBlueEgg: ["ไข่ฟ้าอรุณ", "Dawn-blue egg", "ไข่สีฟ้าอ่อน มีแถบสีชมพูทองเหมือนฟ้ายามรุ่งที่ท้ายฟอง", "A pale sky-blue egg with a band of pink and gold dawn across its foot"],
  cocoaShellEgg: ["ไข่เปลือกโกโก้เข้ม", "Dark cocoa-shell egg", "ไข่เปลือกสีโกโก้เข้มเกือบดำ เงาวาวเรียบ", "A very dark cocoa-brown egg, smooth and glossy"],
  fireflyEgg: ["ไข่หิ่งห้อย", "Firefly egg", "ไข่สีอำพันที่มีจุดแสงเขียวเหลืองเล็กๆ ลอยวนอยู่ข้างใน", "An amber egg with tiny yellow-green lights drifting inside"],
  swirlCloudEgg: ["ไข่เมฆหมุน", "Swirling-cloud egg", "ไข่สีขาวนมที่มีเมฆก้อนเล็กสีเทาฟ้าหมุนวนอยู่ข้างใน", "A milk-white egg with a little grey-blue cloud curling inside"],
  luckySevenEgg: ["ไข่โชคเจ็ดจุด", "Seven-spot lucky egg", "ไข่เปลือกทองมีจุดกลมสีแดงเจ็ดจุดเหมือนเต่าทอง", "A gold-shelled egg with seven round red spots like a ladybird"],
  rebirthFlameEgg: ["ไข่ไฟคืนชีพ", "Rebirth flame egg", "ไข่สีแดงทองมีรอยแตกลายถ่านเรืองแสง เปลวไฟเล็กๆ ตั้งอยู่บนยอด", "A crimson and gold egg crackled like glowing embers, a small flame standing on its top"],
  windRunnerEgg: ["ไข่เปลือกบางวิ่งลม", "Wind-runner egg", "ไข่เปลือกบางสีขาว มีริ้วสีเทาฟ้าพาดเหมือนลมพัด", "A thin white egg with grey-blue streaks swept across it like wind"],
  emeraldShellEgg: ["ไข่เปลือกมรกต", "Emerald-shell egg", "ไข่สีเขียวเข้มเหลือบเงาเหมือนมรกตเปียกน้ำ", "A dark green egg with a wet emerald sheen"],
  brushPaintedEgg: ["ไข่ลายพู่กัน", "Brush-painted egg", "ไข่สีครีมมีรอยพู่กันสีส้มและสีเขียวน้ำทะเลปาดเป็นสองเส้น", "A cream egg painted with two bold strokes, one orange and one teal"],
  firstRainEgg: ["ไข่ฝนแรก", "First-rain egg", "ไข่สีฟ้าน้ำที่มีเมฆขาวก้อนเล็กกับหยดฝนสามเม็ดอยู่บนเปลือก", "A pale water-blue egg with a little white cloud and three raindrops on its shell"],
  moonShadowEgg: ["ไข่เงาจันทร์", "Moon-shadow egg", "ไข่เปลือกดำเงา มีเสี้ยวจันทร์สีเงินที่ดูเหมือนเลื่อนไปมา", "A glossy black egg with a silver crescent moon that seems to drift"],
  blankRecipePaper: ["กระดาษสูตรเปล่า", "Blank recipe paper", "กระดาษสีครีมแผ่นเล็กพับเป็นเรือ ขอบนุ่มเหมือนขนนก ยังไม่มีตัวหนังสือ", "A small cream paper folded like a boat, its edges soft as down, nothing written on it"],
  blackDeepPearlEgg: ["ไข่มุกดำทะเลลึก", "Black deep-sea pearl egg", "ไข่มุกสีดำเงาเหลือบเขียวน้ำทะเลลึก มีลายเกล็ดจางๆ", "A glossy black pearl of an egg with a deep-sea teal sheen and faint scales"],
  rareShadeLock: ["ปอยขนสีหายาก", "Rare-shade lock", "ปอยขนแกะที่ไล่สีชมพูหม่น น้ำตาลกุหลาบ และน้ำตาลมอคค่า", "A tuft of wool banded dusty rose, rose-brown and mocha"],
  spiralShedHorn: ["เขาเกลียวผลัด", "Shed spiral horn", "เขาแกะที่ผลัดหลุดออกมา ม้วนเป็นเกลียวแน่น สีงาช้างมีวงปีสีน้ำตาล", "A shed sheep's horn curled in a tight spiral, ivory with brown rings"],
  cloudFluffTuft: ["ปุยขนเมฆ", "Cloud-fluff tuft", "ปุยขนสีขาวบริสุทธิ์ฟูกลมเหมือนก้อนเมฆ", "A big round puff of pure white fleece, fluffy as a cloud"],
  goldenDandelionSeed: ["เมล็ดแดนดิไลออนทอง", "Golden dandelion seed", "ลูกกลมของเมล็ดแดนดิไลออนสีทอง มีเมล็ดร่มชูชีพเล็กๆ ลอยออกไป", "A round golden dandelion clock, two little seeds drifting off it"],
  rainbowArcLock: ["ปอยขนรุ้งกินน้ำ", "Rainbow-arc lock", "ปอยขนแกะสีขาวที่มีรุ้งเส้นโค้งพาดอยู่", "A white tuft of wool with a small rainbow arcing across it"],
  shootingStarLock: ["ปอยขนดาวตก", "Shooting-star lock", "ปอยขนสีน้ำเงินเข้มที่มีดาวตกสีเหลืองนวลพาดผ่าน", "A navy tuft of wool crossed by a pale yellow shooting star"],
  wholeGoldenFleece: ["ขนทองคำทั้งผืน", "Whole golden fleece", "ขนแกะสีทองทั้งผืนเหมือนหนังแกะที่แผ่ออก เต็มไปด้วยลอนทองเปล่งประกาย", "A whole golden pelt laid flat, covered in shining golden curls"],
  goldenCreamTop: ["ครีมหัวนมสีทอง", "Golden cream top", "ขวดแก้วใส่นมที่มีชั้นครีมสีเหลืองทองหนาลอยอยู่ด้านบน ปิดผ้า", "A glass jar of milk with a thick golden layer of cream on top, cloth-tied"],
  warmShaggyMilk: ["นมอุ่นขนยาว", "Warm shaggy milk", "กระป๋องนมห่อปลอกขนยาวสีขิง มีไอขาวลอยขึ้นจากฝา", "A small milk can in a shaggy ginger cosy, a curl of steam from its lid"],
  agedCheeseStarter: ["หัวเชื้อชีสบ่ม", "Aged cheese starter", "ห่อผ้าขาวบางผูกเชือกน้ำตาล ด้านหน้ามีครั่งสีแดงประทับ", "A bundle of cheesecloth tied with string, a red wax seal on its front"],
  wildBerryCream: ["ครีมเบอร์รี่ป่า", "Wild-berry cream", "หม้อดินเผาใบเล็กใส่ครีมสีชมพูข้น มีเบอร์รี่ป่าสีแดงม่วงอยู่ด้านบน", "A small clay pot of thick pink cream topped with red and purple wild berries"],
  cocoaCreamTop: ["ครีมโกโก้ลอยหน้า", "Cocoa cream top", "ถ้วยโกโก้สีเข้มที่มีฟองครีมโกโก้ลอยหนาอยู่ด้านบน", "A cup of dark cocoa with a thick crown of cocoa cream floating on top"],
  pollenCream: ["ครีมเกสรดอกไม้", "Pollen cream", "โถเซรามิกใบเตี้ยใส่ครีมสีเหลืองอ่อนโรยเกสรสีทอง มีดอกไม้ขาวเล็กๆ อยู่บนยอด", "A squat jar of pale yellow cream dusted with golden pollen, a tiny white flower on top"],
  cometMilkCrystal: ["ผลึกนมดาวหาง", "Comet milk crystal", "ผลึกสีขาวนมที่มีแกนสีกรมท่า ประกายเล็กๆ ลากหางออกไปเหมือนดาวหาง", "A milky-white crystal with a navy core, a trail of tiny sparkles streaming off like a comet"],
};
/** The specials as things of the bag: each with its breed's produce's tier and what it fetches. */
export const SPECIAL_ITEMS = Object.fromEntries(SPECIALS.map((x) => {
  const produce = ANIMAL_ITEMS[breedOf(x.breed)!.produce as AnimalItemId];
  const [th, en, lookTh, lookEn] = SPECIAL_WORDS[x.id];
  return [x.id, goods(th, en, lookTh, lookEn, produce.pays, produce.tier as 2 | 3)];
})) as Record<SpecialId, Item>;

/** The family a thing belongs to in a recipe that asks for the family's own (lib/town/cooking's madeOf, its second look). */
export const FAMILY: Readonly<Record<string, string>> = {
  ...Object.fromEntries(BREEDS.filter((b) => b.species === "chicken" || b.species === "duck").map((b) => [b.produce, "egg"])),
  ...Object.fromEntries(BREEDS.filter((b) => b.species === "cow").map((b) => [b.produce, "milk"])),
  ...Object.fromEntries(BREEDS.filter((b) => b.species === "sheep" && b.produce !== "wool").map((b) => [b.produce, "wool"])),
  farmCheese: "cheese",
  // (v325: the real breeds' specials stand in for an egg or milk in every recipe, and carry their breed's second buff into the
  // pot: lib/town/special-uses' CARRY. The fantasy and legend breeds' are their dishes' own, never an egg or milk of any recipe)
  ...Object.fromEntries(SPECIALS.filter((x) => x.tier === "real" && (x.family === "egg" || x.family === "milk")).map((x) => [x.id, x.family])),
};
/** What carries a grade among the pasture's things: everything an animal gives, and what is made of it; each pays by its grade when sold (lib/town/trade gradePays), and falls when oversold (lib/town/market). */
export const ANIMAL_GRADED: readonly string[] = [...BREEDS.map((b) => b.produce), "cream", "butter", "farmCheese", "yarn", "woolScarf", "rainbowScarf", "starScarf", "goldenScarf",
  // (v324: the specials, each of the grade of the unit it took the place of)
  ...SPECIALS.map((x) => x.id)];

export type AnimalDishId = "custard" | "pancakes" | "cheesecake" | "butterCookies" | "quiche" | "lanternCustard" | "cloudSouffle" | "goldenOmelette"
  | "emberBakedEggs" | "rainBroth" | "moonPudding" | "paperFish" | "leviathanEggCup" | "strawberryShake" | "hotCocoa" | "flowerLatte" | "starPudding";
export const ANIMAL_DISHES: Record<AnimalDishId, Dish> = {
  custard: { stamina: 30, buff: "calm", recipe: { needs: [["egg", 2], ["milk", 1], ["sugar", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  pancakes: { stamina: 32, buff: "green", recipe: { needs: [["flour", 1], ["egg", 1], ["milk", 1], ["butter", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  cheesecake: { stamina: 44, buff: "hearty", recipe: { needs: [["farmCheese", 1], ["cream", 1], ["egg", 1], ["sugar", 1]], in: ["oven"], serves: 6, cooks: 1 } },
  butterCookies: { stamina: 28, buff: "lucky", recipe: { needs: [["butter", 1], ["flour", 2], ["sugar", 1]], in: ["rollingPin", "oven"], serves: 6, cooks: 2 } },
  quiche: { stamina: 40, buff: "hearty", recipe: { needs: [["egg", 2], ["cream", 1], ["farmCheese", 1], ["flour", 1]], in: ["oven"], serves: 4, cooks: 1 } },
  lanternCustard: { stamina: 36, buff: "calm", recipe: { needs: [["lanternEgg", 2], ["milk", 1], ["sugar", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  cloudSouffle: { stamina: 38, buff: "lucky", recipe: { needs: [["cloudEgg", 2], ["butter", 1], ["sugar", 1]], in: ["oven"], serves: 2, cooks: 1 } },
  goldenOmelette: { stamina: 40, buff: "lucky", recipe: { needs: [["goldenEgg", 2], ["butter", 1], ["salt", 1]], in: ["pan"], serves: 2, cooks: 1 } },
  emberBakedEggs: { stamina: 50, buff: "hearty", recipe: { needs: [["emberEgg", 1], ["tomato", 2], ["butter", 1]], in: ["pan"], serves: 4, cooks: 1 } },
  rainBroth: { stamina: 34, buff: "green", recipe: { needs: [["rainEgg", 1], ["watercress", 2], ["salt", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  moonPudding: { stamina: 38, buff: "calm", recipe: { needs: [["moonEgg", 1], ["cream", 1], ["sugar", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  paperFish: { stamina: 36, buff: "lucky", recipe: { needs: [["paperEgg", 1], ["perch", 1], ["salt", 1]], in: ["oven"], serves: 2, cooks: 1 } },
  leviathanEggCup: { stamina: 50, buff: "lucky", recipe: { needs: [["leviathanEgg", 1], ["prawn", 2], ["salt", 1]], in: ["steamer"], serves: 4, cooks: 1 } },
  strawberryShake: { stamina: 26, buff: "green", recipe: { needs: [["strawberryMilk", 2], ["sugar", 1]], in: ["mortar"], serves: 3, cooks: 1 } },
  hotCocoa: { stamina: 26, buff: "calm", recipe: { needs: [["cocoaMilk", 2], ["sugar", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  flowerLatte: { stamina: 26, buff: "calm", recipe: { needs: [["flowerMilk", 2], ["sugar", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  starPudding: { stamina: 50, buff: "hearty", recipe: { needs: [["starMilk", 2], ["cream", 1], ["sugar", 1]], in: ["pot"], serves: 4, cooks: 1 } },
};
const scrollItem = (th: string, en: string, pays: number, tier: 2 | 3 = 2): Item =>
  ({ kind: "scroll", tier, name: { th: `ม้วนสูตร ${th}`, en: `Recipe scroll: ${en}` }, about: { th: "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", en: "A roll of paper tied with red string. Something is written inside." }, stack: 1, pays });
/** A scroll for every dish (Uncle Popoto's shelf), as every other dish has. */
export const ANIMAL_SCROLLS = Object.fromEntries((Object.keys(ANIMAL_DISHES) as AnimalDishId[]).map((d) => [`scroll${d[0].toUpperCase()}${d.slice(1)}`, d])) as Record<string, AnimalDishId>;
export const ANIMAL_SCROLL_ITEMS: Record<string, Item> = Object.fromEntries(Object.entries(ANIMAL_SCROLLS).map(([id, d]) => {
  const it = ANIMAL_ITEMS[d as AnimalItemId];
  return [id, scrollItem(it.name.th, it.name.en, Math.max(30, it.pays * 2), it.tier as 2 | 3)];
}));
/** A breed's recipe written out: what its step's offering is (lib/town/animals' scrollOf). */
export const BREED_SCROLL_ITEMS: Record<string, Item> = Object.fromEntries(SPECIES_IDS.flatMap((sp) => GRAPH.map((g) => {
  const breed = BREEDS.find((b) => b.species === sp && b.letter === g.child)!;
  return [scrollOf(sp, g.child), { ...scrollItem(`พันธุ์${breed.name.th.replace(/^(ไก่|เป็ด|แกะ|วัว)/, "")}`, breed.name.en, 12), name: { th: `ม้วนสูตรพันธุ์ ${breed.name.th}`, en: `Breed scroll: ${breed.name.en}` } }];
})));

/** What is made by hand at the barn's table, as the kitchen's preparations are. */
/**
 * The pasture's makings take only what an animal gave: cream and cheese ask for farm milk, and any breed's milk stands in
 * for it (lib/town/cooking's madeOf, its third look), never the uncle's own milk (he sells it at 9: a churn would turn it
 * into butter worth 73). A kitchen dish still takes any milk.
 */
export const FARM_FAMILY: Readonly<Record<string, string>> = {
  ...Object.fromEntries(BREEDS.filter((b) => b.species === "cow" && b.produce !== "farmMilk").map((b) => [b.produce, "farmMilk"])),
  // (v325: a real breed's milk special is a cow's milk for the barn's makings too)
  ...Object.fromEntries(SPECIALS.filter((x) => x.tier === "real" && x.family === "milk").map((x) => [x.id, "farmMilk"])),
};
export const ANIMAL_MAKES: Partial<Record<string, Make>> = {
  cream: { needs: [["farmMilk", 2]], in: ["churn"], gives: 1 },
  butter: { needs: [["cream", 2]], in: ["churn"], gives: 1 },
  farmCheese: { needs: [["farmMilk", 3], ["salt", 1]], in: ["cheesePress"], gives: 1 },
  yarn: { needs: [["wool", 2]], in: ["spindle"], gives: 1 },
  woolScarf: { needs: [["yarn", 2]], in: ["knittingNeedles"], gives: 1 },
  rainbowScarf: { needs: [["rainbowWool", 2], ["yarn", 1]], in: ["knittingNeedles"], gives: 1 },
  starScarf: { needs: [["starWool", 2], ["yarn", 1]], in: ["knittingNeedles"], gives: 1 },
  goldenScarf: { needs: [["goldenWool", 2], ["yarn", 1]], in: ["knittingNeedles"], gives: 1 },
  prism: { needs: [["crystalLens", 1], ["quartzCore", 1]], in: [], gives: 1 },
  dewGrow: { needs: [["dewClover", 2], ["chickFeed", 1]], in: [], gives: 1 },
  packedRation: { needs: [["mistVetch", 1], ["ghostReed", 1], ["sheepFeed", 1]], in: [], gives: 1 },
};
/** The meadow's forage by band (0 = 03-05 ... 7 = 23-03, lib/town/animals' BAND_EDGES): two a band, some of two. */
export const FORAGE_BANDS: Readonly<Record<string, readonly number[]>> = {
  mistVetch: [0], ghostReed: [0, 1], dewClover: [1], dawnOats: [1, 0],
  meadowOats: [2, 3], sweetTimothy: [2], sunAlfalfa: [3, 4], pondMillet: [3],
  copperSedge: [4], orchardPea: [4, 5], amberClover: [5], reedSeed: [5, 6],
  lanternGrass: [6], velvetVetch: [6, 7], moonOats: [7], nightDuckweed: [7, 0],
};
/** Uncle Popoto's shelf of scrolls: every pasture dish's, at what the stall asks of a scroll. */
export const POPOTO_SCROLL_PRICES: Record<string, number> = Object.fromEntries(Object.entries(ANIMAL_SCROLL_ITEMS).map(([id, it]) => [id, it.pays * 2]));
