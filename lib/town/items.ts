import type { Line } from "./talk";

/**
 * Everything that can be in a bag in Cash Town (the owner, 2026-10-03:
 * "ช่วย generate item ในเกมขึ้นมาทั้งหมด ทั้งปลา อาหาร สูตรอาหาร ผักทั้งหมด"), and what
 * each kind is for: fish and how they are caught, vegetables and how they
 * grow, dishes and what goes into them.
 *
 * It is one web, as he asked ("ของเกือบทุกชิ้นจะเอาไปทำอย่างอื่นได้ … เชื่อมกันเยอะ
 * เท่าที่เป็นไปได้"): a fish is sold, cooked, used as bait or (later) composted;
 * a vegetable is sold, cooked or used as bait; a dish is eaten or shared.
 * Nothing but fishing, buying, selling and eating is built yet: the rest is
 * here so that every thing has its picture, its name and its numbers, and the
 * numbers are all knobs that will live in the database.
 *
 * An item's id is also its picture's name (components/town/TownIcon).
 */

export type ItemKind =
  | "tool"    // one to a slot: a rod, a hoe, cookware
  | "bait"
  | "staple"  // rice and salt, from the uncle
  | "seed"
  | "crop"
  | "fish"
  | "catch"   // what else comes up on a line
  | "goods"   // things made from other things
  | "dish"
  | "scroll"; // a recipe written out, to be read

export interface Item {
  kind: ItemKind;
  /**
   * How far into the game it belongs: 1 the early game (the first seventy-two things), 2 and 3 what comes after
   * (the owner, 2026-10-03: "ไอเทมที่ ทำมาแล้วถือว่าเป้นไอเทมต้นเกม ช่วยสร้างไอเทม next tier มาอีก จำนวน 2 เท่าของที่มีอยู่ตอนนี้").
   */
  tier: 1 | 2 | 3;
  name: Line;
  /**
   * What it looks like, in a line: never what it is for (the owner, 2026-10-03:
   * "บอกก็พอว่าไอเทมมีลักษณ์ยังไง ไม่ต้องบอกว่าใช้ทำอะไร ให้ผู้เล่นไปงมกันเอง").
   * What a thing does is for whoever holds it to find out.
   */
  about: Line;
  /** How many fit in one slot of a bag. */
  stack: number;
  /** What the uncle's relatives pay for one, in Popoto coins; 0 when they do not take it. */
  pays: number;
}

const it = (kind: ItemKind, th: string, en: string, aboutTh: string, aboutEn: string, stack: number, pays: number, tier: 1 | 2 | 3 = 1): Item =>
  ({ kind, tier, name: { th, en }, about: { th: aboutTh, en: aboutEn }, stack, pays });

export const ITEMS = {
  // tools: one to a slot (the owner: a tool takes a slot like anything else)
  rod: it("tool", "คันเบ็ดไม้ไผ่", "Bamboo rod", "ลำไม้ไผ่เรียวยาว ปลายผูกสายกับตะขอเล็กๆ", "A long, slender bamboo cane, with a line and a small hook tied to its tip", 1, 30),
  hoe: it("tool", "จอบ", "Hoe", "ด้ามไม้ยาว ปลายติดหัวเหล็กแบนคม", "A long wooden handle with a flat iron blade at its end", 1, 25),
  can: it("tool", "บัวรดน้ำ", "Watering can", "ถังสังกะสีมีหูจับ ปากยาว ปลายเป็นฝักบัว", "A tin can with a handle and a long spout that ends in a rose", 1, 20),
  pot: it("tool", "หม้อดิน", "Clay pot", "หม้อดินเผาสีน้ำตาลแดง ก้นกลม มีฝาปิด", "A round-bottomed pot of red-brown clay, with a lid", 1, 40),
  pan: it("tool", "กระทะ", "Frying pan", "กระทะเหล็กสีดำ ก้นลึก มีด้ามจับ", "A deep, black iron pan with a handle", 1, 35),
  grill: it("tool", "เตาปิ้ง", "Grill", "เตาดินเผาใบเล็ก มีตะแกรงเหล็กวางอยู่ข้างบน", "A small clay stove with an iron grate on top", 1, 30),

  // a pot with what was cooked in it (lib/town/cooking), and a bucket for carrying water to the farm's well (lib/town/farm)
  potFull: it("tool", "หม้ออาหาร", "Pot of food", "หม้อดินใบใหญ่ มีอาหารอยู่ข้างใน ควันกรุ่น", "A big clay pot with food in it, steaming", 1, 0),
  bucket: it("tool", "ถังไม้", "Wooden bucket", "ถังไม้คาดเหล็ก มีเชือกหิ้ว", "A wooden bucket with iron hoops and a rope handle", 1, 8),

  // bait
  worm: it("bait", "ไส้เดือน", "Worm", "ตัวยาวสีชมพูอมน้ำตาล เปื้อนดิน ยังดิ้นอยู่", "Long, pinkish brown and earthy, and still wriggling", 20, 1),
  dough: it("bait", "เหยื่อแป้ง", "Dough bait", "ก้อนแป้งนุ่มสีขาวนวล ปั้นเป็นลูกกลม กลิ่นหอมอ่อนๆ", "Soft, pale balls of dough with a faint sweet smell", 20, 1),

  // staples
  rice: it("staple", "ข้าวสาร", "Rice", "เมล็ดเล็กสีขาวขุ่น เต็มถุงผ้าใบเล็ก", "Small white grains, a little cloth bag full", 20, 1),
  salt: it("staple", "เกลือ", "Salt", "เกล็ดละเอียดสีขาว รสเค็ม", "Fine white crystals. Salty.", 20, 1),

  // seeds
  seedKangkong: it("seed", "เมล็ดผักบุ้ง", "Morning glory seeds", "เมล็ดสีน้ำตาลเข้ม เป็นเหลี่ยมเล็กๆ", "Small, dark brown, angular seeds", 10, 2),
  seedScallion: it("seed", "เมล็ดต้นหอม", "Spring onion seeds", "เมล็ดสีดำเม็ดจิ๋ว เป็นเหลี่ยม", "Tiny black, angular seeds", 10, 2),
  seedCabbage: it("seed", "เมล็ดผักกาดขาว", "Cabbage seeds", "เมล็ดกลมเล็กสีน้ำตาลแดง", "Small, round, red-brown seeds", 10, 4),
  seedCarrot: it("seed", "เมล็ดแครอท", "Carrot seeds", "เมล็ดแบนเล็กสีน้ำตาลอ่อน มีขนบางๆ", "Small, flat, tan seeds with fine bristles", 10, 4),
  seedDaikon: it("seed", "เมล็ดหัวไชเท้า", "Daikon seeds", "เมล็ดกลมรีสีน้ำตาลอมเหลือง", "Oval, yellowish brown seeds", 10, 5),
  seedCorn: it("seed", "เมล็ดข้าวโพด", "Corn seeds", "เมล็ดแห้งแข็งสีเหลืองทอง", "Hard, dry, golden kernels", 10, 6),
  seedChili: it("seed", "เมล็ดพริก", "Chilli seeds", "เมล็ดแบนกลมสีเหลืองอ่อน", "Flat, round, pale yellow seeds", 10, 5),
  seedTomato: it("seed", "เมล็ดมะเขือเทศ", "Tomato seeds", "เมล็ดแบนเล็กสีครีม มีขนนุ่ม", "Small, flat, cream seeds, a little fuzzy", 10, 7),
  seedBasil: it("seed", "เมล็ดกะเพรา", "Holy basil seeds", "เมล็ดสีดำ เล็กเท่าเม็ดทราย", "Black seeds, as small as grains of sand", 10, 4),
  seedSweetPotato: it("seed", "เถามันเทศ", "Sweet potato slips", "ท่อนเถาสีเขียวอมม่วง มีใบติดอยู่สองสามใบ", "A cut length of green and purple vine with a few leaves on it", 10, 7),
  seedGarlic: it("seed", "กลีบกระเทียม", "Garlic cloves", "กลีบสีขาวนวล หุ้มเปลือกบางเหมือนกระดาษ", "Pale cloves in a papery skin", 10, 5),
  seedPumpkin: it("seed", "เมล็ดฟักทอง", "Pumpkin seeds", "เมล็ดแบนใหญ่สีขาวครีม", "Large, flat, cream seeds", 10, 12),

  // crops
  kangkong: it("crop", "ผักบุ้ง", "Morning glory", "ก้านกลวงสีเขียวอ่อน ใบเรียวยาว", "Hollow, pale green stems with long, narrow leaves", 20, 3),
  scallion: it("crop", "ต้นหอม", "Spring onion", "ต้นเรียวยาว โคนขาว ใบเขียวเป็นหลอด", "Slender stalks, white at the root, with hollow green leaves", 20, 3),
  cabbage: it("crop", "ผักกาดขาว", "Napa cabbage", "หัวยาวรี ใบซ้อนกันแน่น สีเขียวอ่อนอมขาว", "A long head of tightly packed, pale green leaves", 10, 20),
  carrot: it("crop", "แครอท", "Carrot", "หัวเรียวยาวสีส้ม มีใบฝอยสีเขียว", "A long orange root with feathery green tops", 20, 8),
  daikon: it("crop", "หัวไชเท้า", "Daikon", "หัวอวบยาวสีขาว มีใบเขียวที่ขั้ว", "A long, plump white root with green leaves at its crown", 10, 18),
  corn: it("crop", "ข้าวโพด", "Corn", "ฝักสีเหลืองทอง เมล็ดเรียงแน่น หุ้มเปลือกเขียว", "A golden ear of tightly packed kernels in a green husk", 20, 14),
  chili: it("crop", "พริก", "Chilli", "เม็ดเรียวเล็กสีแดงสด ผิวมัน", "Small, slender, glossy red pods", 20, 5),
  tomato: it("crop", "มะเขือเทศ", "Tomato", "ลูกกลมสีแดง ผิวตึงมัน", "Round, red and taut", 20, 8),
  basil: it("crop", "กะเพรา", "Holy basil", "ใบเขียวขอบหยัก ก้านอมม่วง กลิ่นฉุน", "Green leaves with toothed edges on purplish stems, sharply scented", 20, 4),
  sweetPotato: it("crop", "มันเทศ", "Sweet potato", "หัวยาวรี เปลือกสีม่วงแดง", "A long tuber with red-purple skin", 20, 12),
  garlic: it("crop", "กระเทียม", "Garlic", "หัวกลมสีขาว แบ่งเป็นกลีบ กลิ่นแรง", "A round white bulb of cloves, strong-smelling", 20, 10),
  pumpkin: it("crop", "ฟักทอง", "Pumpkin", "ลูกใหญ่ เปลือกแข็งสีส้มอมเขียว มีร่องรอบลูก หนักมาก", "Large and very heavy, with a hard, ribbed, orange and green rind", 5, 110),

  // fish (and the river's prawn)
  minnow: it("fish", "ปลาซิว", "Minnow", "ปลาตัวเล็กเท่านิ้ว เกล็ดสีเงินวาว", "A fish no longer than a finger, with bright silver scales", 20, 3),
  barb: it("fish", "ปลาตะเพียน", "Silver barb", "ลำตัวแบนกว้าง เกล็ดสีเงิน ครีบอมแดง", "Deep and flat-sided, silver-scaled, with reddish fins", 10, 8),
  tilapia: it("fish", "ปลานิล", "Tilapia", "ลำตัวแบนสีเทาอมเขียว มีลายพาดขวาง", "Flat and grey-green, with faint bars across its sides", 10, 10),
  perch: it("fish", "ปลาหมอ", "Climbing perch", "ตัวเล็กป้อม สีน้ำตาลอมเขียว เกล็ดแข็ง ครีบมีหนาม", "Small and stout, olive brown, with hard scales and spiny fins", 10, 9),
  catfish: it("fish", "ปลาดุก", "Catfish", "ลำตัวยาวลื่นสีดำ ไม่มีเกล็ด หนวดยาว", "Long, black and scaleless, with long whiskers", 10, 12),
  pangasius: it("fish", "ปลาสวาย", "River catfish", "ตัวใหญ่ หลังสีเทา ท้องขาว หนวดสั้น", "Big, grey-backed and white-bellied, with short whiskers", 5, 22),
  snakehead: it("fish", "ปลาช่อน", "Snakehead", "ลำตัวกลมยาว หัวเหมือนงู ลายสีน้ำตาลเข้ม", "Long and round-bodied, with a head like a snake's and dark brown markings", 5, 30),
  eel: it("fish", "ปลาไหล", "Eel", "ตัวยาวเหมือนงู ผิวลื่นสีน้ำตาลอมเหลือง", "As long as a snake, with slippery yellow-brown skin", 5, 28),
  prawn: it("fish", "กุ้งแม่น้ำ", "River prawn", "เปลือกใสอมฟ้า ก้ามยาวสีน้ำเงิน", "A translucent, bluish shell and long blue claws", 10, 35),
  featherback: it("fish", "ปลากราย", "Featherback", "ลำตัวแบนยาวสีเงิน หลังโก่ง มีจุดดำเรียงที่โคนหาง", "Long, flat and silver, hump-backed, with a row of black spots near its tail", 5, 40),
  goby: it("fish", "ปลาบู่", "Marble goby", "ตัวป้อมสีน้ำตาลลายหินอ่อน หัวโต ปากกว้าง", "Stout and marbled brown, with a big head and a wide mouth", 5, 60),
  koi: it("fish", "ปลาคาร์ปทอง", "Golden koi", "ตัวใหญ่ เกล็ดสีทองอร่ามทั้งตัว หนวดสั้นสองคู่", "Large, golden-scaled all over, with two pairs of short barbels", 1, 300),

  // What else comes up. Each fetches a little from the uncle's relatives (the owner, 2026-10-04: "ช่วยทำให้ ขยะจากการ
  // ตกปลา สามารถขายมีราคาได้ด้วย แต่ไม่เวอร์เกินไป"): an old boot and an old chest fetched nothing, and could not be left
  // with him at all. A boot now fetches what a minnow does, a chest (further on) a little less than the scroll that
  // is in it would: so opening either is still the better guess, and selling it the sure thing. On the early baits
  // one bite in a hundred is a boot, so a bite is worth a third of a hundredth more than it was.
  hyacinth: it("catch", "ผักตบชวา", "Water hyacinth", "กอพืชน้ำใบเขียวมัน ก้านพองเป็นทุ่น รากยาวเป็นฝอย", "A clump of glossy green leaves on swollen stalks, trailing long roots", 20, 2),
  boot: it("catch", "รองเท้าบูทเก่า", "Old boot", "รองเท้าบูทยางข้างเดียว เปื่อย มีตะไคร่เกาะ", "A single rubber boot, rotting and green with algae", 5, 3),

  // goods made from other things
  fishSauce: it("goods", "น้ำปลา", "Fish sauce", "น้ำใสสีอำพันในขวดแก้ว กลิ่นแรง รสเค็ม", "A clear amber liquid in a glass bottle. Pungent and salty.", 10, 12),
  compost: it("goods", "ปุ๋ยหมัก", "Compost", "เนื้อร่วนสีดำ กลิ่นเหมือนดินหลังฝน", "Dark and crumbly, smelling of earth after rain", 20, 4),
  growFert: it("goods", "ปุ๋ยเร่งโต", "Growth fertiliser", "ผงสีเขียวอ่อนในถุงผ้า", "A pale green powder in a cloth bag", 20, 10),
  guardFert: it("goods", "ปุ๋ยกันแมลง", "Pest-proof fertiliser", "ผงสีน้ำตาลแดงในถุงผ้า กลิ่นฉุน", "A red-brown powder in a cloth bag. It smells sharp.", 20, 12),
  pestCure: it("goods", "ยาไล่แมลง", "Pest cure", "น้ำสีเขียวเข้มในขวดเล็ก กลิ่นสมุนไพรฉุนจัด", "A dark green liquid in a small bottle, smelling of bitter herbs", 10, 10),
  basket: it("goods", "ตะกร้าสาน", "Woven basket", "ตะกร้าสานจากก้านพืชแห้งสีน้ำตาลอ่อน มีหูหิ้ว", "A basket woven of dried, pale brown stalks, with a handle", 1, 0),

  // dishes
  riceBox: it("dish", "ข้าวห่อใบตอง", "Rice parcel", "ข้าวสวยห่อด้วยใบตองสีเขียว มัดด้วยตอก", "Plain rice wrapped in a green banana leaf and tied with a strip of bamboo", 5, 3),
  oddDish: it("dish", "อาหารแปลกๆ", "Odd dish", "น้ำข้นสีคล้ำ มีของหลายอย่างลอยปนกัน กลิ่นบอกไม่ถูกว่าเป็นอะไร", "Something dark and thick with all sorts floating in it, and a smell hard to put a name to", 5, 0),
  friedMinnow: it("dish", "ปลาซิวทอด", "Fried minnows", "ปลาตัวเล็กทอดจนเหลืองกรอบ กองอยู่เต็มจาน", "Small fish fried golden and crisp, heaped on a plate", 5, 12),
  grilledFish: it("dish", "ปลาเผาเกลือ", "Salt-grilled fish", "ปลาทั้งตัวพอกเกลือหนา ย่างจนเปลือกเกลือเกรียม", "A whole fish in a thick crust of salt, grilled until the crust chars", 5, 16),
  grilledCorn: it("dish", "ข้าวโพดปิ้ง", "Grilled corn", "ข้าวโพดทั้งฝักย่างจนมีรอยไหม้ เมล็ดเงาวาว", "A whole ear, charred in places, its kernels glistening", 5, 18),
  roastSweetPotato: it("dish", "มันเทศเผา", "Roast sweet potato", "เปลือกไหม้ดำ ผ่าครึ่งเห็นเนื้อสีเหลืองทอง ควันกรุ่น", "Black-skinned, split to show golden flesh, and still steaming", 5, 16),
  stirKangkong: it("dish", "ผัดผักบุ้งไฟแดง", "Stir-fried morning glory", "ผักก้านเขียวผัดกับพริกแดงและกระเทียม น้ำขลุกขลิก", "Green stems fried with red chilli and garlic in a little sauce", 5, 12),
  basilCatfish: it("dish", "ผัดกะเพราปลาดุก", "Basil catfish", "เนื้อปลาชิ้นผัดกับใบกะเพราและพริก ราดบนข้าวสวย", "Pieces of fish fried with basil leaves and chilli, over rice", 5, 18),
  tomYum: it("dish", "ต้มยำปลาช่อน", "Snakehead tom yum", "น้ำแกงใสสีส้มแดง มีเนื้อปลา มะเขือเทศ และพริกลอยอยู่ ควันขึ้น", "A clear, red-orange broth with fish, tomato and chillies afloat, steaming", 5, 22),
  sourCurry: it("dish", "แกงส้มปลาตะเพียน", "Sour curry", "แกงน้ำข้นสีส้ม มีเนื้อปลาและผักหั่นชิ้น", "A thick orange curry with fish and chunks of vegetables", 5, 20),
  friedPerch: it("dish", "ปลาหมอทอดกระเทียม", "Garlic fried perch", "ปลาทอดทั้งตัวสีเหลืองทอง โรยกระเทียมเจียว", "A whole fish fried golden, under crisp fried garlic", 5, 22),
  fishCake: it("dish", "ทอดมันปลากราย", "Fish cakes", "แผ่นกลมแบนสีน้ำตาลทอง ทอดจนขอบกรอบ", "Flat, round, golden-brown cakes, fried crisp at the edges", 5, 22),
  spicyEel: it("dish", "ผัดเผ็ดปลาไหล", "Spicy eel", "เนื้อปลาชิ้นยาวผัดกับพริกแกงสีแดงเข้ม มีใบกะเพรากรอบ", "Long pieces of fish in a deep red paste, with crisp basil leaves", 5, 26),
  grilledPrawn: it("dish", "กุ้งเผา", "Grilled prawns", "กุ้งตัวใหญ่ย่างจนเปลือกสีส้มแดง มันกุ้งเยิ้ม", "Big prawns grilled until their shells turn orange-red, their heads rich", 5, 44),
  steamedGoby: it("dish", "ปลาบู่นึ่งซีอิ๊ว", "Soy-steamed goby", "ปลานึ่งทั้งตัว ราดน้ำสีน้ำตาลใส โรยต้นหอมซอย", "A whole steamed fish in a clear brown sauce, strewn with sliced spring onion", 5, 38),
  pumpkinSoup: it("dish", "ซุปฟักทอง", "Pumpkin soup", "ซุปข้นสีส้มทอง เนื้อเนียน", "A thick, smooth, golden-orange soup", 5, 30),
  shabu: it("dish", "ชาบูหม้อใหญ่", "The big shabu pot", "หม้อใบใหญ่ น้ำซุปเดือดปุดๆ ผักและเนื้อปลาลอยเต็มหม้อ", "A big pot of bubbling broth, crowded with vegetables and fish", 10, 30),

  // recipes written out: the two simplest, from the uncle (the rest are hinted at about the town, and found)
  scrollFriedMinnow: it("scroll", "ม้วนสูตร ปลาซิวทอด", "Recipe scroll: fried minnows", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0),
  scrollGrilledFish: it("scroll", "ม้วนสูตร ปลาเผาเกลือ", "Recipe scroll: salt-grilled fish", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0),
  // and how the cure for pests is made: the one scroll that is of no dish (the owner, 2026-10-04: "ช่วยเพิ่มสูตรทำยาฆ่าแมลงในร้านค้าให้ด้วย")
  scrollPestCure: it("scroll", "ม้วนสูตร ยาไล่แมลง", "Recipe scroll: pest cure", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0),
  // the scrolls nobody sells: of every other dish of this tier, to be found in what the river brings up (lib/town/scrolls)
  scrollGrilledCorn: it("scroll", "ม้วนสูตร ข้าวโพดปิ้ง", "Recipe scroll: grilled corn", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollRoastSweetPotato: it("scroll", "ม้วนสูตร มันเทศเผา", "Recipe scroll: roast sweet potato", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollStirKangkong: it("scroll", "ม้วนสูตร ผัดผักบุ้งไฟแดง", "Recipe scroll: stir-fried morning glory", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollBasilCatfish: it("scroll", "ม้วนสูตร ผัดกะเพราปลาดุก", "Recipe scroll: basil catfish", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollTomYum: it("scroll", "ม้วนสูตร ต้มยำปลาช่อน", "Recipe scroll: snakehead tom yum", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollSourCurry: it("scroll", "ม้วนสูตร แกงส้มปลาตะเพียน", "Recipe scroll: sour curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollFriedPerch: it("scroll", "ม้วนสูตร ปลาหมอทอดกระเทียม", "Recipe scroll: garlic fried perch", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollFishCake: it("scroll", "ม้วนสูตร ทอดมันปลากราย", "Recipe scroll: fish cakes", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollSpicyEel: it("scroll", "ม้วนสูตร ผัดเผ็ดปลาไหล", "Recipe scroll: spicy eel", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollGrilledPrawn: it("scroll", "ม้วนสูตร กุ้งเผา", "Recipe scroll: grilled prawns", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollSteamedGoby: it("scroll", "ม้วนสูตร ปลาบู่นึ่งซีอิ๊ว", "Recipe scroll: soy-steamed goby", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollPumpkinSoup: it("scroll", "ม้วนสูตร ซุปฟักทอง", "Recipe scroll: pumpkin soup", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollShabu: it("scroll", "ม้วนสูตร ชาบูหม้อใหญ่", "Recipe scroll: the big shabu pot", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),

  // Twenty more of the early game's water (the owner, 2026-10-05: "ช่วยเพิ่มปลาขั้นแรก ไปอีก 20 แบบ ไม่จำเป้นต้องเป็นปลาไทย เป้นปลา
  // ประเทศอื่น หรือ แฟนตาซี หน่อยก็ได้", then "แต่ละปลามีเงื่อนไขในการเจอ และ วัตถุประสงค์ในการใช้งาน ที่แตกต่างกันด้วย"): fish of other
  // rivers and four that are of no river at all, each found its own way (FISH) and each good for something of its
  // own. A line says what one looks like and, here and there, how it behaves: that is all anybody is told of when
  // it bites. Off the bank:
  loach: it("fish", "ปลาโดโจ", "Dojo loach", "ตัวเรียวยาวสีน้ำตาลเหลือง มีหนวดสั้นรอบปาก ลื่นมือ ดิ้นแรงเมื่ออากาศอึมครึม", "Long, slim and yellow-brown, with short whiskers round its mouth; slippery, and restless when the air turns heavy", 20, 3),
  mosquitofish: it("fish", "ปลากินยุง", "Mosquitofish", "ปลาตัวจิ๋วสีเทาใส ท้องป่อง ปากเชิดขึ้นคอยงับแมลงที่ผิวน้ำ", "A tiny, clear grey fish with a round belly and an upturned mouth, snapping at insects on the water", 20, 2),
  mussel: it("fish", "หอยกาบ", "River mussel", "หอยสองฝาสีน้ำตาลเขียว เปลือกหนา ด้านในเป็นมันวาว", "A thick two-part shell, brown-green outside and glossy within", 20, 2),
  crayfish: it("fish", "กุ้งเครย์ฟิช", "Crayfish", "กุ้งตัวป้อมสีแดงเข้ม เปลือกแข็ง ก้ามใหญ่สองข้าง ชอบซุกตัวตามโคลน", "A stout, dark red crustacean in hard armour, with two big claws; it hides in the mud", 10, 9),
  goldfish: it("fish", "ปลาทอง", "Goldfish", "ตัวกลมป้อมสีส้มทอง หางบานเป็นแพร ว่ายอวดโฉมเหมือนอยู่ในงานวัด", "Round and orange-gold with a tail like a silk fan, parading as if at a fair", 5, 35),
  // off the deck, and one from anywhere
  carp: it("fish", "ปลาไน", "Common carp", "ลำตัวหนาสีน้ำตาลทอง เกล็ดใหญ่ มีหนวดสั้นที่มุมปาก", "Thick-bodied and golden brown, with big scales and short barbels at the corners of its mouth", 10, 10),
  piranha: it("fish", "ปลาปิรันยา", "Piranha", "ตัวแบนกลมสีเงิน ท้องแดง ฟันแหลมคมเรียงเต็มปาก", "Round, flat and silver with a red belly, its mouth full of sharp teeth", 10, 11),
  herring: it("fish", "ปลาเฮอร์ริง", "Herring", "ตัวเรียวสีเงินวาว หลังอมฟ้า ว่ายเป็นฝูงตอนฟ้าเริ่มสาง", "Slender and bright silver, blue along the back; it runs in shoals as the sky begins to pale", 10, 8),
  archerfish: it("fish", "ปลาเสือพ่นน้ำ", "Archerfish", "ตัวแบนสีเงิน มีแถบดำพาดลงมาจากหลัง ตาโต ปากแหลมเชิด เล็งขึ้นฟ้า", "Flat and silver with black bars down from its back, big-eyed, its pointed mouth aimed at the sky", 10, 14),
  pacu: it("fish", "ปลาเปคู", "Pacu", "ตัวกลมแบนสีเทาเข้ม ท้องอมส้ม ฟันเป็นซี่เหมือนฟันคน ท้องตุงแน่น", "Round, flat and dark grey with an orange belly, teeth like a person's, and a tight, full stomach", 5, 20),
  pike: it("fish", "ปลาไพค์", "Pike", "ตัวยาวสีเขียวมะกอก ลายจุดสีอ่อน ปากแบนยาวเหมือนปากเป็ด ฟันคม", "Long and olive green with pale spots, a flat snout like a duck's bill, and sharp teeth", 5, 28),
  nilePerch: it("fish", "ปลากะพงไนล์", "Nile perch", "ตัวใหญ่สีเงินอมเทา หลังโหนก ตาสีเหลืองเรืองๆ ชอบแดดจัด", "Big and silver-grey, hump-backed, with eyes that glow yellow; fond of strong sun", 5, 32),
  salmon: it("fish", "ปลาแซลมอน", "Salmon", "ตัวเพรียวสีเงิน หลังอมเขียว เนื้อสีส้ม ว่ายทวนน้ำเมื่อน้ำหลาก", "Sleek and silver, green along the back, orange-fleshed; it swims upstream when the water runs high", 5, 26),
  wels: it("fish", "ปลาเวลส์", "Wels catfish", "ตัวยาวใหญ่สีเขียวคล้ำ ลื่น ไม่มีเกล็ด ปากกว้างเท่าหัว ท้องนูนเป็นก้อนแข็ง", "Long, big and dark green, smooth and scaleless, with a mouth as wide as its head and something hard bulging in its belly", 5, 45),
  gar: it("fish", "ปลาการ์จระเข้", "Alligator gar", "ตัวยาวทรงกระบอก ปากยาวเหมือนจระเข้ เกล็ดแข็งเป็นแผ่นเงาเหมือนเกราะ", "Long and round-bodied, with jaws like a crocodile's and hard, glossy scales like plates of armour", 5, 42),
  arapaima: it("fish", "ปลาช่อนอะเมซอน", "Arapaima", "ตัวมหึมายาวกว่าคน หัวแบนสีเขียวคล้ำ เกล็ดใหญ่ขอบแดงไล่ไปถึงหาง", "Enormous, longer than a person, with a flat dark green head and big scales edged in red down to the tail", 1, 320),
  // the four of no river. Two of them are eaten as they are, and so are dishes among the things (a dish is what is
  // sat down to: lib/town/stamina), though they come up on a line like any fish
  dozyFish: it("dish", "ปลาขี้เซา", "Dozy fish", "ตัวกลมนุ่มสีฟ้าอ่อน ตาปรือ หาวอยู่ตลอด เนื้อใสหวานทั้งที่ยังสด", "Round, soft and pale blue, heavy-lidded and always yawning; its flesh is clear and sweet as it is", 5, 2),
  popotoFish: it("fish", "ปลาโปโปโต้", "Popoto fish", "ตัวป้อมสีน้ำตาลอ่อนเหมือนหัวมัน มีตาเล็กๆ กับครีบจิ๋ว ชอบอยู่ที่คนเยอะๆ", "Stubby and light brown like a potato, with tiny eyes and tiny fins; it likes a crowd", 10, 10),
  rainbowFish: it("dish", "ปลาสายรุ้ง", "Rainbow fish", "ตัวเล็กเกล็ดเหลือบเจ็ดสี วาวขึ้นเมื่อแดดออกหลังฝน เนื้อใสกินสดได้", "Small, its scales shot with seven colours, brightest when the sun comes out after rain; clear-fleshed, good as it is", 5, 6),
  moonFish: it("fish", "ปลาจันทรา", "Moonfish", "ตัวกลมแบนสีเงินนวล เกล็ดเรืองแสงอ่อนๆ เหมือนพระจันทร์เต็มดวง", "Round, flat and pale silver, its scales faintly glowing like a full moon", 5, 50),
  // what two of them are made into (lib/town/gear)
  hookScale: it("tool", "เบ็ดเกล็ดปลา", "Scale hook", "ตะขอสีเทาเงาเหลือบ ฝนจากเกล็ดแผ่นหนาแข็ง", "A hook with a grey sheen, ground out of one thick, hard scale", 1, 20),
  floatGlow: it("tool", "ทุ่นเรืองแสง", "Glowing float", "ทุ่นใสสีฟ้าอมเขียว เปล่งแสงนวลในที่มืด", "A clear blue-green float that gives off a soft light in the dark", 1, 25),
  // and what eight of them are cooked into: dishes of the countries they are from
  fishChips: it("dish", "ฟิชแอนด์ชิปส์", "Fish and chips", "ชิ้นปลาชุบแป้งทอดสีเหลืองทอง วางคู่กับแท่งมันทอด ห่อด้วยกระดาษ", "Golden battered fish beside a heap of fried potato sticks, wrapped in paper", 5, 8),
  ukha: it("dish", "อูฮา", "Ukha", "น้ำซุปใสสีทองอ่อน มีชิ้นปลาขาว แครอทหั่นแว่น และใบสีเขียวลอยอยู่", "A clear, pale golden broth with white pieces of fish, rounds of carrot and green leaves afloat", 5, 17),
  thieboudienne: it("dish", "เจบูเจน", "Thieboudienne", "ข้าวสีส้มแดงในถาดกลมใหญ่ มีปลาชิ้นโตวางกลาง ล้อมด้วยผักชิ้นใหญ่", "Red-orange rice on a big round tray, a large piece of fish in the middle, ringed with big chunks of vegetables", 5, 18),
  piranhaSoup: it("dish", "ซุปปิรันยา", "Piranha soup", "น้ำซุปข้นสีส้ม มีหัวปลาฟันแหลมโผล่ขึ้นมา", "A thick orange soup with a sharp-toothed fish head sticking out of it", 5, 16),
  crawfishBoil: it("dish", "เครย์ฟิชต้มเครื่องเทศ", "Crawfish boil", "กองกุ้งก้ามแดงสดบนกระดาษ ปนกับฝักข้าวโพดสีเหลืองหั่นท่อน", "A heap of bright red clawed things on paper, among lengths of yellow corn", 10, 15),
  masgouf: it("dish", "มัสกูฟ", "Masgouf", "ปลาผ่าแผ่แบนเป็นวงกลม ย่างจนเนื้อสีน้ำตาลทอง ขอบเกรียม", "A fish split and spread flat into a round, grilled golden brown and charred at the edge", 5, 9),
  salmonSteak: it("dish", "สเต็กแซลมอน", "Salmon steak", "ชิ้นปลาหนาสีส้มอมชมพู ผิวเกรียมเป็นลายตาราง", "A thick, pink-orange slice of fish, seared in a criss-cross", 5, 26),
  arapaimaRoast: it("dish", "ปลายักษ์ย่างทั้งตัว", "Whole roast giant", "ปลาตัวยาวเท่าคนย่างบนไม้เสียบ หนังเกรียมสีน้ำตาลแดง", "A fish as long as a person, roasted on a spit, its skin charred red-brown", 10, 45),
  scrollFishChips: it("scroll", "ม้วนสูตร ฟิชแอนด์ชิปส์", "Recipe scroll: fish and chips", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollUkha: it("scroll", "ม้วนสูตร อูฮา", "Recipe scroll: ukha", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollThieboudienne: it("scroll", "ม้วนสูตร เจบูเจน", "Recipe scroll: thieboudienne", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollPiranhaSoup: it("scroll", "ม้วนสูตร ซุปปิรันยา", "Recipe scroll: piranha soup", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollCrawfishBoil: it("scroll", "ม้วนสูตร เครย์ฟิชต้มเครื่องเทศ", "Recipe scroll: crawfish boil", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollMasgouf: it("scroll", "ม้วนสูตร มัสกูฟ", "Recipe scroll: masgouf", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollSalmonSteak: it("scroll", "ม้วนสูตร สเต็กแซลมอน", "Recipe scroll: salmon steak", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),
  scrollArapaimaRoast: it("scroll", "ม้วนสูตร ปลายักษ์ย่างทั้งตัว", "Recipe scroll: whole roast giant", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 10),

  /* ── the second tier: iron and hardwood. The village has grown a little: more to catch, more to grow, cookware of
        more kinds, and dishes that take two cooks, each at a tool of their own. ── */
  // better gear for the river, the plots and the kitchen (lib/town/gear says what each is better at)
  rodTeak: it("tool", "คันเบ็ดไม้สัก", "Teak rod", "คันไม้สักขัดมัน มีรอกไม้เล็กๆ ติดที่ด้าม", "A polished teak rod with a small wooden reel at its grip", 1, 90, 2),
  floatQuill: it("tool", "ทุ่นขนนก", "Quill float", "ก้านขนนกสีขาว ปลายทาสีแดง เบาหวิว", "A white quill tipped with red paint, light as air", 1, 40, 2),
  hookSteel: it("tool", "เบ็ดเหล็กกล้า", "Steel hook", "ตะขอเหล็กสีเทาเงา ปลายแหลมคม มีเงี่ยง", "A bright grey steel hook, needle-sharp, with a barb", 1, 40, 2),
  lineBraid: it("tool", "สายเอ็นถัก", "Braided line", "ด้ายสีน้ำตาลถักเป็นเกลียวแน่น ม้วนอยู่บนแกนไม้", "Tightly braided brown thread wound on a wooden spool", 1, 40, 2),
  netSmall: it("tool", "สวิงตักปลา", "Landing net", "ห่วงไม้ไผ่ขึงตาข่าย มีด้ามสั้น", "A bamboo hoop strung with mesh, on a short handle", 1, 45, 2),
  hoeIron: it("tool", "จอบเหล็ก", "Iron hoe", "ด้ามไม้ยาว หัวเหล็กหนาสีเทาเข้ม", "A long wooden handle with a thick, dark grey iron blade", 1, 75, 2),
  canCopper: it("tool", "บัวรดน้ำทองแดง", "Copper watering can", "ถังทองแดงสีส้มแดงใบใหญ่ ปากยาว", "A big can of red-orange copper with a long spout", 1, 60, 2),
  sickle: it("tool", "เคียว", "Sickle", "ใบมีดโค้งเหมือนจันทร์เสี้ยว ด้ามไม้สั้น", "A blade curved like a crescent moon, on a short wooden handle", 1, 50, 2),
  krabung: it("tool", "กระบุง", "Carrying basket", "ตะกร้าสานใบใหญ่ ปากกว้าง ก้นเหลี่ยม", "A big woven basket, wide at the mouth and square at the bottom", 1, 0, 2),
  mortar: it("tool", "ครกหิน", "Stone mortar", "ครกหินสีเทา ปากกว้าง มีสากหินวางพาดอยู่", "A grey stone mortar with a stone pestle resting in it", 1, 55, 2),
  steamer: it("tool", "ซึ้งนึ่ง", "Steamer", "หม้อโลหะสองชั้น ชั้นบนเจาะรู มีฝาโค้ง", "A two-tier metal pot, its upper tier pierced with holes, under a domed lid", 1, 70, 2),
  cleaver: it("tool", "มีดอีโต้กับเขียง", "Cleaver and board", "มีดใบกว้างหนัก วางบนเขียงไม้แผ่นกลมหนา", "A heavy, broad-bladed knife on a thick round wooden board", 1, 55, 2),
  jar: it("tool", "ไหดิน", "Clay jar", "ไหดินเผาสีน้ำตาลเข้ม คอแคบ มีฝาปิด", "A dark brown clay jar, narrow at the neck, with a lid", 1, 45, 2),
  wok: it("tool", "กระทะใบบัว", "Big wok", "กระทะเหล็กใบใหญ่ ก้นลึก มีหูสองข้าง", "A big, deep iron wok with two handles", 1, 80, 2),
  // what the dishes of other countries are made with (the owner, 2026-10-03: "จะเพิ่ม อุปกรณ์ด้วยก็ได้")
  rollingPin: it("tool", "ไม้นวดแป้ง", "Rolling pin", "ท่อนไม้กลมยาว ผิวเรียบ มีด้ามจับสองข้าง", "A long, smooth wooden roller with a handle at each end", 1, 45, 2),
  sushiMat: it("tool", "มู่ลี่ไม้ไผ่", "Bamboo mat", "ซี่ไม้ไผ่เล็กๆ ร้อยด้วยเชือกเป็นแผ่น ม้วนได้", "Thin bamboo slats strung together into a mat that rolls up", 1, 50, 2),
  stoneBowl: it("tool", "ชามหิน", "Stone bowl", "ชามหินสีดำหนาหนัก ผิวด้าน มีฐานไม้รอง", "A thick, heavy bowl of dull black stone on a wooden stand", 1, 70, 2),
  // for a pot of food set down for others: a helping is ladled into a bowl, which leaves the bag with it and is back when it has been eaten (the owner, 2026-10-04)
  bowl: it("tool", "ถ้วย", "Bowl", "ถ้วยเคลือบสีขาวนวล ขอบสีน้ำเงิน", "A glazed, cream-white bowl with a blue rim", 1, 3),
  // a bigger pail for the water, and something to cook in
  bucketIron: it("tool", "ถังสังกะสี", "Tin pail", "ถังสังกะสีใบใหญ่สีเทาเงา มีหูหิ้วเหล็ก", "A big, shiny grey tin pail with an iron handle", 1, 30, 2),
  apron: it("tool", "ผ้ากันเปื้อน", "Apron", "ผ้าผืนสีขาวมีสายผูกเอว เปื้อนคราบเล็กน้อย", "A white cloth with ties at the waist, a little stained", 1, 40, 2),
  // bait
  cricket: it("bait", "จิ้งหรีด", "Cricket", "แมลงตัวสีน้ำตาลเข้ม ขาหลังยาว กระโดดไปมา", "A dark brown insect with long hind legs, hopping about", 20, 2, 2),
  branBait: it("bait", "ก้อนรำ", "Bran ball", "ก้อนรำข้าวสีน้ำตาลอ่อน ปั้นแน่น กลิ่นหอมมัน", "A firm ball of pale brown rice bran, with a rich, nutty smell", 20, 2, 2),
  shrimpLive: it("bait", "กุ้งฝอย", "Small shrimp", "กุ้งตัวจิ๋วใสแจ๋ว ดีดตัวอยู่ในกระป๋องน้ำ", "Tiny, clear shrimp flicking about in a tin of water", 20, 3, 2),
  // staples
  sugar: it("staple", "น้ำตาลปึก", "Palm sugar", "ก้อนกลมแบนสีน้ำตาลทอง เนื้อเนียน หวานหอม", "A flat, round, golden-brown cake, smooth, sweet and fragrant", 20, 3, 2),
  oil: it("staple", "น้ำมันพืช", "Cooking oil", "น้ำสีเหลืองใสในขวดแก้ว", "A clear yellow liquid in a glass bottle", 20, 3, 2),
  tamarind: it("staple", "มะขามเปียก", "Tamarind pulp", "ก้อนเนื้อสีน้ำตาลเข้มเหนียวหนืด รสเปรี้ยวจัด", "A sticky, dark brown lump, sharply sour", 20, 2, 2),
  egg: it("staple", "ไข่ไก่", "Egg", "ฟองรีสีน้ำตาลอ่อน เปลือกบาง", "Oval, pale brown and thin-shelled", 20, 3, 2),
  flour: it("staple", "แป้ง", "Flour", "ผงสีขาวละเอียด เนียนมือ", "A fine white powder, silky to the touch", 20, 3, 2),
  seaweed: it("staple", "สาหร่ายแผ่น", "Seaweed sheets", "แผ่นบางสีเขียวเข้มเกือบดำ กรอบ มีกลิ่นทะเล", "Thin sheets of a green so dark it is almost black, crisp, smelling of the sea", 20, 3, 2),
  tofu: it("staple", "เต้าหู้", "Tofu", "ก้อนสี่เหลี่ยมสีขาวนวล เนื้อนิ่ม สั่นเมื่อขยับ", "A soft, creamy white block that wobbles when it is moved", 20, 3, 2),
  // seeds
  seedEggplant: it("seed", "เมล็ดมะเขือยาว", "Eggplant seeds", "เมล็ดแบนเล็กสีน้ำตาลอ่อน", "Small, flat, light brown seeds", 10, 8, 2),
  seedCucumber: it("seed", "เมล็ดแตงกวา", "Cucumber seeds", "เมล็ดแบนรีสีขาวครีม", "Flat, oval, cream-white seeds", 10, 7, 2),
  seedLongBean: it("seed", "เมล็ดถั่วฝักยาว", "Long bean seeds", "เมล็ดรูปไตสีน้ำตาลแดง", "Kidney-shaped, red-brown seeds", 10, 7, 2),
  seedLemongrass: it("seed", "เหง้าตะไคร้", "Lemongrass roots", "ต้นอ่อนสีเขียวซีด โคนขาว มีรากฝอย", "A pale green shoot, white at the base, with fine roots", 10, 9, 2),
  seedGalangal: it("seed", "แง่งข่า", "Galangal root", "แง่งสีชมพูอมน้ำตาล มีตาสีเขียวเล็กๆ", "A pinkish brown knob with small green buds", 10, 12, 2),
  seedLime: it("seed", "กิ่งตอนมะนาว", "Lime cutting", "กิ่งเล็กใบเขียวมัน โคนหุ้มด้วยตุ้มดิน", "A small branch with glossy leaves, its foot wrapped in a ball of earth", 5, 30, 2),
  seedPapaya: it("seed", "เมล็ดมะละกอ", "Papaya seeds", "เมล็ดกลมเล็กสีดำ ผิวย่น", "Small, round, wrinkled black seeds", 10, 14, 2),
  // crops
  eggplant: it("crop", "มะเขือยาว", "Eggplant", "ผลยาวสีม่วงมัน ขั้วสีเขียว", "A long, glossy purple fruit with a green cap", 20, 14, 2),
  cucumber: it("crop", "แตงกวา", "Cucumber", "ผลยาวสีเขียว ผิวมีตุ่มเล็กๆ", "A long green fruit with small bumps on its skin", 20, 10, 2),
  longBean: it("crop", "ถั่วฝักยาว", "Long beans", "ฝักสีเขียวยาวเป็นศอก", "Green pods as long as a forearm", 20, 9, 2),
  lemongrass: it("crop", "ตะไคร้", "Lemongrass", "ต้นเรียวสีเขียวซีด โคนขาวอมม่วง กลิ่นหอมสดชื่น", "Slender, pale green stalks, white and purplish at the base, with a fresh scent", 20, 12, 2),
  galangal: it("crop", "ข่า", "Galangal", "แง่งสีขาวอมชมพู เนื้อแข็ง กลิ่นฉุนเย็น", "A pinkish white knob, hard-fleshed, with a cool, sharp smell", 20, 22, 2),
  lime: it("crop", "มะนาว", "Lime", "ลูกกลมเล็กสีเขียว เปลือกบาง", "Small, round and green, with a thin rind", 20, 10, 2),
  papaya: it("crop", "มะละกอ", "Papaya", "ผลยาวรีสีเขียวอมเหลือง หนักมือ", "A long, heavy fruit, green turning yellow", 10, 26, 2),
  // fish, and what else lives in the water
  gourami: it("fish", "ปลาสลิด", "Snakeskin gourami", "ลำตัวแบนรีสีเทาอมเขียว มีลายเฉียงสีคล้ำ ครีบท้องยาวเป็นเส้น", "Flat, oval and grey-green, with dark slanting stripes and a belly fin like a long thread", 10, 12, 2),
  crab: it("fish", "ปูนา", "Rice-field crab", "กระดองสีน้ำตาลอมม่วง ก้ามใหญ่ เดินตะแคง", "A brown-purple shell and big claws; it walks sideways", 10, 10, 2),
  snail: it("fish", "หอยขม", "Pond snail", "เปลือกเกลียวปลายแหลมสีเขียวคล้ำ", "A dark green spiral shell, pointed at its tip", 20, 2, 2),
  hampala: it("fish", "ปลากระสูบ", "Hampala barb", "ลำตัวเพรียวสีเงิน หางสีส้มแดง มีแถบดำพาดกลางตัว", "Sleek and silver, with a red-orange tail and a black band across its middle", 5, 34, 2),
  sheatfish: it("fish", "ปลาเนื้ออ่อน", "Sheatfish", "ลำตัวเรียวยาวใสจนเกือบเห็นก้าง หนวดยาวบาง", "Long, slender and so clear its bones nearly show, with long thin whiskers", 5, 42, 2),
  bagrid: it("fish", "ปลากด", "Bagrid catfish", "หัวแบนกว้าง หนวดยาวมาก ตัวสีน้ำตาลอมเหลือง", "A broad flat head, very long whiskers and a yellowish brown body", 5, 36, 2),
  giantGourami: it("fish", "ปลาแรด", "Giant gourami", "ตัวใหญ่หนา ปากหนา หน้าผากโหนก สีเทาอมชมพู", "Big and thick, with thick lips and a bulging forehead, pinkish grey", 5, 44, 2),
  frog: it("fish", "กบนา", "Field frog", "ตัวสีเขียวอมน้ำตาล ผิวชื้น ขาหลังยาว", "Green-brown and damp-skinned, with long hind legs", 10, 20, 2),
  tigerfish: it("fish", "ปลาเสือตอ", "Siamese tigerfish", "ลำตัวแบนสูงสีเหลืองทอง มีลายดำพาดขวางเหมือนเสือ", "Deep-bodied and golden yellow, with black bars like a tiger's", 5, 90, 2),
  wallago: it("fish", "ปลาเค้า", "Wallago", "ตัวยาวมาก ปากกว้างเต็มหัว ครีบท้องยาวตลอดลำตัว", "Very long, with a mouth as wide as its head and a fin running the length of its belly", 5, 110, 2),
  driftwood: it("catch", "ไม้ลอยน้ำ", "Driftwood", "ท่อนไม้สีเทาซีด ผิวเรียบเพราะน้ำเซาะ", "A pale grey length of wood, worn smooth by the water", 10, 3, 2),
  bottle: it("catch", "ขวดแก้วเก่า", "Old bottle", "ขวดแก้วสีเขียวใบเก่า มีโคลนเกาะ", "An old green glass bottle with mud on it", 10, 2, 2),
  // goods made from other things
  driedFish: it("goods", "ปลาแห้ง", "Dried fish", "ปลาตัวเล็กตากจนแห้งแข็ง เสียบไม้เรียงกัน", "Small fish dried stiff, threaded in a row on a stick", 10, 14, 2),
  saltedFish: it("goods", "ปลาเค็ม", "Salted fish", "ปลาผ่าซีกสีซีด มีเกล็ดเกลือเกาะ", "A pale, split fish crusted with salt", 10, 18, 2),
  curryPaste: it("goods", "พริกแกง", "Curry paste", "เนื้อข้นสีแดงเข้ม กลิ่นเครื่องเทศแรง", "A thick, deep red paste with a strong smell of spice", 10, 20, 2),
  pickle: it("goods", "ผักดอง", "Pickled greens", "ใบผักสีเขียวคล้ำแช่น้ำสีเหลืองในขวดโหล", "Dark green leaves in yellow brine, in a glass jar", 10, 16, 2),
  charcoal: it("goods", "ถ่านไม้", "Charcoal", "ท่อนสีดำสนิท เบา เปื้อนมือ", "Jet-black sticks, light, that blacken the hands", 20, 4, 2),
  rope: it("goods", "เชือกปอ", "Rope", "เส้นใยสีน้ำตาลฟั่นเป็นเกลียว ขดเป็นวง", "Brown fibres twisted into a cord and coiled", 10, 8, 2),
  manure: it("goods", "ปุ๋ยคอก", "Manure", "ก้อนสีน้ำตาลเข้มปนฟาง กลิ่นแรง", "Dark brown lumps mixed with straw, strong-smelling", 20, 5, 2),
  noodle: it("goods", "เส้นสด", "Fresh noodles", "เส้นยาวสีเหลืองนวล ขดเป็นก้อนกลม โรยแป้งขาว", "Long pale yellow strands coiled into a nest, dusted with flour", 20, 6, 2),
  // dishes
  somTam: it("dish", "ส้มตำ", "Papaya salad", "เส้นมะละกอดิบสีขาวอมเขียว คลุกพริกแดง มะเขือเทศ และถั่วฝักยาว", "Shreds of green papaya tossed with red chilli, tomato and long beans", 5, 24, 2),
  grilledEggplant: it("dish", "มะเขือยาวเผา", "Grilled eggplant", "มะเขือยาวเผาจนผิวไหม้ ผ่ากลางเห็นเนื้อนิ่ม", "An eggplant charred black and split to show its soft flesh", 5, 20, 2),
  tomKha: it("dish", "ต้มข่าปลา", "Galangal fish soup", "น้ำแกงสีขาวข้น มีชิ้นปลา ตะไคร้ และพริกแดงลอยอยู่", "A thick white soup with pieces of fish, lemongrass and red chilli afloat", 5, 40, 2),
  friedGourami: it("dish", "ปลาสลิดทอด", "Fried gourami", "ปลาตัวแบนทอดจนเหลืองกรอบ สองตัววางคู่กัน", "Two flat fish fried golden and crisp, side by side", 5, 26, 2),
  crabCurry: it("dish", "แกงปูนา", "Crab curry", "แกงน้ำข้นสีส้มแดง มีปูตัวเล็กวางอยู่ข้างบน", "A thick orange-red curry with a small crab on top", 5, 44, 2),
  steamedSheatfish: it("dish", "ปลาเนื้ออ่อนนึ่งมะนาว", "Lime-steamed sheatfish", "ปลาตัวเรียวนึ่งในถาดรูปปลา มีมะนาวฝานและพริกเขียว", "A slender fish steamed in a fish-shaped dish, with sliced lime and green chilli", 5, 46, 2),
  friedFrog: it("dish", "กบทอดกระเทียม", "Garlic fried frog", "ขากบทอดสีเหลืองทอง โรยกระเทียมเจียว", "Frog's legs fried golden, under fried garlic", 5, 34, 2),
  laab: it("dish", "ลาบปลา", "Fish laab", "เนื้อปลาสับคลุกสมุนไพรสีเขียว โรยพริกป่น มีมะนาวซีกหนึ่ง", "Minced fish tossed with green herbs and chilli flakes, with a wedge of lime", 5, 42, 2),
  omelette: it("dish", "ไข่เจียว", "Omelette", "แผ่นไข่กลมฟูสีเหลืองทอง ขอบกรอบ", "A round, puffy, golden sheet of egg, crisp at its edge", 5, 14, 2),
  snailCurry: it("dish", "แกงคั่วหอยขม", "Snail curry", "แกงน้ำข้นสีเหลืองส้ม มีหอยเปลือกดำเล็กๆ อยู่เต็มชาม", "A thick yellow-orange curry, the bowl full of small dark shells", 5, 36, 2),
  candiedPumpkin: it("dish", "ฟักทองเชื่อม", "Candied pumpkin", "ชิ้นฟักทองสีส้มใสเป็นเงา แช่ในน้ำเชื่อม", "Glossy, translucent orange pieces of pumpkin in syrup", 5, 30, 2),
  friedRice: it("dish", "ข้าวผัด", "Fried rice", "ข้าวผัดสีเหลืองนวล มีไข่และต้นหอมซอย", "Pale golden fried rice with egg and chopped spring onion", 5, 26, 2),
  // dishes of other countries (the owner, 2026-10-03: "ตอนนี้มีแต่สูตรอาหารไทย ช่วยเอาอาหารประเทศอื่นที่ดังๆ มาด้วย ซัก 5 ประเทศ ประเทสละ 5 menu"):
  // Japan, Korea, China, Italy and India; those of them the second tier's things are enough for
  sushi: it("dish", "ซูชิ", "Sushi", "ข้าวปั้นก้อนเล็กเรียงเป็นแถว มีเนื้อปลาสีขาวอมชมพูวางบน บางคำพันแถบสีเขียวเข้ม", "Small pressed rice blocks in a row, each topped with a pale pink slice of fish, some belted with a dark green strip", 5, 34, 2),
  tempura: it("dish", "เทมปุระกุ้ง", "Prawn tempura", "กุ้งชุบแป้งทอดสีเหลืองทอง ฟูเป็นเกล็ด หางสีส้มโผล่ออกมา", "Prawns in a puffy, flaky golden batter, their orange tails sticking out", 5, 32, 2),
  okonomiyaki: it("dish", "โอโคโนมิยากิ", "Okonomiyaki", "แผ่นแป้งกลมหนา ราดซอสสีน้ำตาลเป็นเส้นตาราง โรยผงสีเขียว", "A thick round pancake under a lattice of brown sauce, dusted with green flakes", 5, 34, 2),
  kimchi: it("dish", "กิมจิ", "Kimchi", "ใบผักสีขาวคลุกน้ำสีแดงสด กองซ้อนกันในถ้วย", "White leaves heaped in a bowl, coated in bright red", 5, 18, 2),
  bibimbap: it("dish", "บิบิมบับ", "Bibimbap", "ชามหินสีดำ ข้าวอยู่ข้างใต้ ผักหลากสีเรียงเป็นกองรอบไข่ดาวตรงกลาง", "A black stone bowl of rice under little heaps of coloured vegetables, a fried egg in the middle", 5, 44, 2),
  kimbap: it("dish", "คิมบับ", "Kimbap", "แว่นกลมห่อด้วยแผ่นสีเขียวเข้ม ข้างในเป็นข้าวกับไส้สีเหลือง ส้ม และเขียว", "Round slices wrapped in dark green, rice inside round a yellow, orange and green middle", 5, 30, 2),
  pajeon: it("dish", "พาจอน", "Scallion pancake", "แผ่นแป้งทอดบางสีเหลืองทอง มีเส้นสีเขียวยาวฝังอยู่ทั่วแผ่น", "A thin golden fried pancake with long green stalks set all through it", 5, 26, 2),
  harGow: it("dish", "ฮะเก๋า", "Prawn dumplings", "ก้อนแป้งใสจีบเป็นริ้ว เห็นไส้สีชมพูอยู่ข้างใน วางในเข่งไม้ไผ่", "Pleated translucent parcels with something pink showing through, in a bamboo basket", 5, 34, 2),
  springRoll: it("dish", "ปอเปี๊ยะทอด", "Spring rolls", "แท่งแป้งม้วนทอดสีน้ำตาลทอง ผิวพองเป็นฟอง", "Rolled pastry fried golden brown, its skin blistered", 5, 24, 2),
  congee: it("dish", "โจ๊กปลา", "Fish congee", "ข้าวต้มเนื้อข้นสีขาว มีชิ้นปลา ไข่ และต้นหอมซอยลอยหน้า", "A thick white rice porridge with pieces of fish, egg and chopped spring onion on top", 5, 30, 2),
  spaghetti: it("dish", "สปาเกตตีทะเล", "Seafood spaghetti", "เส้นยาวสีเหลืองคลุกซอสสีแดง มีกุ้งสีส้มวางอยู่ข้างบน", "Long yellow strands in a red sauce, orange prawns on top", 5, 40, 2),
  minestrone: it("dish", "ซุปมิเนสโตรเน", "Minestrone", "น้ำซุปสีแดงใส มีผักหั่นเต๋าหลากสีและเส้นสั้นๆ", "A clear red broth full of diced vegetables of many colours and short lengths of noodle", 5, 28, 2),
  samosa: it("dish", "ซาโมซ่า", "Samosa", "แป้งทอดทรงสามเหลี่ยมสีน้ำตาลทอง ผิวกรอบเป็นฟอง", "Fried golden-brown triangles of pastry, crisp and blistered", 5, 26, 2),
  scrollSomTam: it("scroll", "ม้วนสูตร ส้มตำ", "Recipe scroll: papaya salad", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0, 2),
  scrollOmelette: it("scroll", "ม้วนสูตร ไข่เจียว", "Recipe scroll: omelette", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0, 2),
  // the scrolls nobody sells: of every other dish of this tier, to be found in what the river brings up (lib/town/scrolls)
  scrollGrilledEggplant: it("scroll", "ม้วนสูตร มะเขือยาวเผา", "Recipe scroll: grilled eggplant", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollTomKha: it("scroll", "ม้วนสูตร ต้มข่าปลา", "Recipe scroll: galangal fish soup", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollFriedGourami: it("scroll", "ม้วนสูตร ปลาสลิดทอด", "Recipe scroll: fried gourami", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollCrabCurry: it("scroll", "ม้วนสูตร แกงปูนา", "Recipe scroll: crab curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSteamedSheatfish: it("scroll", "ม้วนสูตร ปลาเนื้ออ่อนนึ่งมะนาว", "Recipe scroll: lime-steamed sheatfish", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollFriedFrog: it("scroll", "ม้วนสูตร กบทอดกระเทียม", "Recipe scroll: garlic fried frog", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollLaab: it("scroll", "ม้วนสูตร ลาบปลา", "Recipe scroll: fish laab", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSnailCurry: it("scroll", "ม้วนสูตร แกงคั่วหอยขม", "Recipe scroll: snail curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollCandiedPumpkin: it("scroll", "ม้วนสูตร ฟักทองเชื่อม", "Recipe scroll: candied pumpkin", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollFriedRice: it("scroll", "ม้วนสูตร ข้าวผัด", "Recipe scroll: fried rice", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSushi: it("scroll", "ม้วนสูตร ซูชิ", "Recipe scroll: sushi", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollTempura: it("scroll", "ม้วนสูตร เทมปุระกุ้ง", "Recipe scroll: prawn tempura", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollOkonomiyaki: it("scroll", "ม้วนสูตร โอโคโนมิยากิ", "Recipe scroll: okonomiyaki", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollKimchi: it("scroll", "ม้วนสูตร กิมจิ", "Recipe scroll: kimchi", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollBibimbap: it("scroll", "ม้วนสูตร บิบิมบับ", "Recipe scroll: bibimbap", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollKimbap: it("scroll", "ม้วนสูตร คิมบับ", "Recipe scroll: kimbap", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollPajeon: it("scroll", "ม้วนสูตร พาจอน", "Recipe scroll: scallion pancake", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollHarGow: it("scroll", "ม้วนสูตร ฮะเก๋า", "Recipe scroll: prawn dumplings", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSpringRoll: it("scroll", "ม้วนสูตร ปอเปี๊ยะทอด", "Recipe scroll: spring rolls", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollCongee: it("scroll", "ม้วนสูตร โจ๊กปลา", "Recipe scroll: fish congee", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSpaghetti: it("scroll", "ม้วนสูตร สปาเกตตีทะเล", "Recipe scroll: seafood spaghetti", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollMinestrone: it("scroll", "ม้วนสูตร ซุปมิเนสโตรเน", "Recipe scroll: minestrone", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),
  scrollSamosa: it("scroll", "ม้วนสูตร ซาโมซ่า", "Recipe scroll: samosa", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 20, 2),

  /* ── the third tier: brass and silk. The best gear, the river's great fish, trees that take a week and bear for a
        season, and feasts that three or four cook together for the whole village. ── */
  // the best gear there is
  rodMaster: it("tool", "คันเบ็ดช่างหลวง", "Master's rod", "คันไม้ดำขลับ พันด้ายแดงสลับทอง รอกทองเหลืองเงาวาว", "A jet-black rod bound in red and gold thread, with a gleaming brass reel", 1, 220, 3),
  floatBell: it("tool", "ทุ่นกระดิ่ง", "Bell float", "ทุ่นไม้ทาสีแดงขาว มีกระดิ่งทองเหลืองใบจิ๋วผูกอยู่บนยอด", "A red and white wooden float with a tiny brass bell tied to its top", 1, 90, 3),
  hookTwin: it("tool", "เบ็ดสองเงี่ยง", "Twin-barbed hook", "ตะขอเหล็กสีดำ มีเงี่ยงซ้อนกันสองชั้น", "A black iron hook with two barbs, one above the other", 1, 90, 3),
  lineSilk: it("tool", "สายไหม", "Silk line", "เส้นไหมสีขาวนวลเป็นมัน ม้วนอยู่บนแกนทองเหลือง", "A lustrous, cream-white silk thread wound on a brass spool", 1, 90, 3),
  netLong: it("tool", "สวิงด้ามยาว", "Long-handled net", "ห่วงเหล็กขึงตาข่ายลึก ด้ามไม้ยาวเท่าตัวคน", "An iron hoop with a deep mesh, on a handle as long as a person", 1, 100, 3),
  hoeSteel: it("tool", "จอบเหล็กกล้า", "Steel hoe", "ด้ามไม้ยาว หัวเหล็กกล้าขัดจนเงาวาว", "A long wooden handle with a steel blade polished bright", 1, 160, 3),
  canBrass: it("tool", "บัวรดน้ำทองเหลือง", "Brass watering can", "ถังทองเหลืองสีทองเงาวาว ปากยาว", "A can of gleaming golden brass with a long spout", 1, 140, 3),
  shears: it("tool", "กรรไกรตัดกิ่ง", "Pruning shears", "กรรไกรใบสั้นหนา ด้ามไม้สีแดง มีสปริง", "Short, thick-bladed shears with red wooden handles and a spring", 1, 110, 3),
  yoke: it("tool", "หาบ", "Carrying pole", "คานไม้ไผ่ ปลายสองข้างแขวนกระจาดสาน", "A bamboo pole with a woven tray hung from each end", 1, 0, 3),
  potBrass: it("tool", "หม้อทองเหลือง", "Brass pot", "หม้อใบใหญ่สีทองเงาวาว มีหูสองข้าง", "A big, gleaming golden pot with two handles", 1, 180, 3),
  stoveBig: it("tool", "เตาอั้งโล่", "Charcoal stove", "เตาดินเผาใบใหญ่หุ้มถังสังกะสี ข้างในแดงฉาน", "A big clay stove in a tin bucket, glowing red inside", 1, 150, 3),
  panBrass: it("tool", "กระทะทองเหลือง", "Brass pan", "กระทะปากกว้างก้นตื้นสีทอง มีหูสองข้าง", "A wide, shallow golden pan with two handles", 1, 170, 3),
  steamerBamboo: it("tool", "เข่งไม้ไผ่", "Bamboo steamer", "เข่งสานทรงกลมซ้อนกันสามชั้น มีฝาสาน", "Three round woven baskets stacked one on another, under a woven lid", 1, 130, 3),
  hotpot: it("tool", "หม้อไฟ", "Steamboat", "หม้อโลหะมีปล่องตรงกลาง ตั้งบนขาเล็กๆ", "A metal pot with a chimney up its middle, on a little stand", 1, 200, 3),
  oven: it("tool", "เตาอบดิน", "Clay oven", "โดมดินเผาสีน้ำตาลแดง มีช่องโค้งด้านหน้า ข้างในดำเป็นเขม่า", "A dome of red-brown fired clay with an arched mouth, black with soot inside", 1, 240, 3),
  ladle: it("tool", "กระบวย", "Ladle", "กะลามะพร้าวผ่าครึ่ง ต่อด้ามไม้ยาว", "Half a coconut shell on a long wooden handle", 1, 20, 3),
  tok: it("tool", "โตก", "Rattan table", "ถาดหวายกลมมีขาเตี้ย", "A round rattan tray on short legs", 1, 60, 3),
  // bait
  antEggs: it("bait", "ไข่มดแดง", "Red ant eggs", "เม็ดสีขาวขุ่นเล็กๆ นุ่ม กองอยู่บนใบตอง", "Small, soft, milky-white grains heaped on a banana leaf", 20, 6, 3),
  lure: it("bait", "ปลาไม้แกะ", "Carved fish", "ปลาตัวจิ๋วแกะจากไม้ ทาสีเงินสลับแดง มีตะขอห้อยที่ท้อง", "A tiny fish carved of wood, painted silver and red, with a hook under its belly", 5, 30, 3),
  fermentedBait: it("bait", "ก้อนหมัก", "Fermented ball", "ก้อนสีน้ำตาลคล้ำ กลิ่นแรงจนต้องเบือนหน้า", "A dark brown lump with a smell that turns the head away", 20, 5, 3),
  // staples
  stickyRice: it("staple", "ข้าวเหนียว", "Sticky rice", "เมล็ดสั้นป้อมสีขาวขุ่นทึบ", "Short, plump, opaque white grains", 20, 3, 3),
  soy: it("staple", "ซีอิ๊ว", "Soy sauce", "น้ำสีน้ำตาลเข้มเกือบดำในขวดแก้ว", "A dark brown, almost black liquid in a glass bottle", 20, 5, 3),
  pepper: it("staple", "พริกไทย", "Peppercorns", "เม็ดกลมเล็กสีดำ ผิวย่น กลิ่นฉุนร้อน", "Small, round, wrinkled black grains with a hot, sharp smell", 20, 6, 3),
  cheese: it("staple", "ชีส", "Cheese", "ก้อนสามเหลี่ยมสีเหลือง มีรูกลมๆ กลิ่นแรง", "A yellow wedge with round holes in it, and a strong smell", 20, 6, 3),
  milk: it("staple", "นมสด", "Milk", "ของเหลวสีขาวในขวดแก้วทรงสูง ปิดจุกไม้", "Something white in a tall glass bottle with a wooden stopper", 20, 4, 3),
  // seeds
  seedMango: it("seed", "กิ่งทาบมะม่วง", "Mango graft", "ต้นอ่อนใบเรียวยาว โคนหุ้มด้วยตุ้มดิน", "A sapling with long narrow leaves, its foot wrapped in a ball of earth", 5, 40, 3),
  seedBanana: it("seed", "หน่อกล้วย", "Banana shoot", "หน่ออวบสีเขียวอ่อน มีใบม้วนอยู่สองใบ", "A plump, pale green shoot with two furled leaves", 5, 25, 3),
  seedCoconut: it("seed", "หน่อมะพร้าว", "Coconut sprout", "ลูกมะพร้าวแห้งมีหน่อเขียวแทงออกมา", "A dry coconut with a green sprout pushing out of it", 5, 45, 3),
  seedGinger: it("seed", "แง่งขิง", "Ginger root", "แง่งสีน้ำตาลอ่อนเป็นปุ่มปม มีตาสีเขียว", "A knobbly, light brown root with green buds", 10, 16, 3),
  seedTurmeric: it("seed", "แง่งขมิ้น", "Turmeric root", "แง่งเล็กสีน้ำตาลอมส้ม มีตาสีเขียว", "A small orange-brown root with green buds", 10, 16, 3),
  seedTaro: it("seed", "หัวพันธุ์เผือก", "Taro corm", "หัวกลมเล็กสีน้ำตาล มีขน มีตาสีชมพู", "A small, round, hairy brown corm with a pink bud", 10, 18, 3),
  seedWatermelon: it("seed", "เมล็ดแตงโม", "Watermelon seeds", "เมล็ดแบนรีสีดำมัน", "Flat, oval, glossy black seeds", 10, 20, 3),
  // crops
  mango: it("crop", "มะม่วง", "Mango", "ผลรีสีเหลืองทอง ผิวเนียน กลิ่นหอมหวาน", "An oval, golden fruit with smooth skin and a sweet scent", 20, 30, 3),
  banana: it("crop", "กล้วย", "Bananas", "หวีสีเหลือง ผลโค้งเรียงกัน", "A yellow hand of curved fruits in a row", 20, 16, 3),
  coconut: it("crop", "มะพร้าว", "Coconut", "ลูกกลมเปลือกแข็งสีน้ำตาล มีใยหุ้ม เขย่าแล้วมีเสียงน้ำ", "Round, hard-shelled and brown, wrapped in fibre; shaken, it sloshes", 10, 34, 3),
  ginger: it("crop", "ขิง", "Ginger", "แง่งสีน้ำตาลอ่อนเป็นปุ่มปม เนื้อเหลืองซีด กลิ่นเผ็ดร้อน", "A knobbly, light brown root with pale yellow flesh and a hot smell", 20, 26, 3),
  turmeric: it("crop", "ขมิ้น", "Turmeric", "แง่งเล็ก เนื้อในสีส้มสด ติดมือ", "A small root, bright orange inside; the colour comes off on the hands", 20, 26, 3),
  taro: it("crop", "เผือก", "Taro", "หัวกลมรีสีน้ำตาลมีขน เนื้อขาวประม่วง", "An oval, hairy brown root with white flesh flecked purple", 10, 30, 3),
  watermelon: it("crop", "แตงโม", "Watermelon", "ลูกกลมโตสีเขียวลายเข้ม หนักมาก", "Big, round and very heavy, green with dark stripes", 5, 60, 3),
  // fish
  croaker: it("fish", "ปลาม้า", "Soldier croaker", "ลำตัวสีเงินอมเทา จมูกมน หางยาวแหลม", "Silver-grey, with a blunt snout and a long pointed tail", 5, 70, 3),
  blackEar: it("fish", "ปลาเทโพ", "Black-eared catfish", "ตัวใหญ่สีเทาอมฟ้า มีจุดดำหลังเหงือก ครีบหลังสูง", "Big and blue-grey, with a black spot behind its gill and a tall back fin", 5, 80, 3),
  spinyEel: it("fish", "ปลาหลด", "Spiny eel", "ตัวเรียวยาวสีน้ำตาล จมูกแหลม มีจุดสีซีดเรียงข้างตัว", "Long, thin and brown, with a pointed snout and pale spots along its side", 5, 60, 3),
  puffer: it("fish", "ปลาปักเป้า", "Pufferfish", "ตัวกลมป้อมสีเหลืองอมเขียว มีจุดดำ พองลมได้", "Round and stubby, yellow-green with dark spots; it puffs itself up", 10, 25, 3),
  goldenCarp: it("fish", "ปลายี่สก", "Golden carp", "ตัวใหญ่ เกล็ดโตสีทองอมน้ำตาล ครีบอมแดง", "Large, with big golden-bronze scales and reddish fins", 5, 180, 3),
  giantSnakehead: it("fish", "ปลาชะโด", "Giant snakehead", "ตัวใหญ่ยาวสีดำอมน้ำเงิน หัวกว้าง มีแถบส้มแดงข้างตัว", "Long, big and blue-black, broad-headed, with an orange-red stripe along its side", 5, 200, 3),
  royalFeatherback: it("fish", "ปลาตองลาย", "Royal featherback", "ลำตัวแบนสีเงิน หลังโก่ง มีลายเส้นดำหยักที่ท้อง", "Flat, silver and hump-backed, with wavy black lines low on its body", 5, 190, 3),
  arowana: it("fish", "ปลาตะพัด", "Arowana", "ตัวยาวสีทอง เกล็ดใหญ่วาวทั้งตัว ปากเชิดขึ้น มีหนวดสั้นคู่หนึ่ง", "Long and golden, every big scale shining, with an upturned mouth and a pair of short barbels", 1, 600, 3),
  stingray: it("fish", "ปลากระเบนราหู", "Giant stingray", "ตัวแบนกลมกว้างเท่ากระด้ง สีน้ำตาล หางยาวเรียว", "Flat, round and as wide as a winnowing tray, brown, with a long thin tail", 1, 700, 3),
  megaCatfish: it("fish", "ปลาบึก", "Giant catfish", "ตัวมหึมาสีเทาซีด ท้องขาว ไม่มีหนวด ตาอยู่ต่ำ", "Enormous and pale grey, white-bellied, without whiskers, its eyes set low", 1, 800, 3),
  pearl: it("catch", "ไข่มุกน้ำจืด", "River pearl", "เม็ดกลมสีขาวนวลเป็นเงาเหลือบ อยู่ในฝาหอย", "A round, cream-white bead with a shifting sheen, in a mussel's shell", 10, 150, 3),
  chest: it("catch", "หีบไม้เก่า", "Old chest", "หีบไม้ใบเล็กคาดเหล็กขึ้นสนิม เปียกโคลน", "A small wooden chest bound with rusty iron, wet with mud", 1, 20, 3),
  // goods made from other things
  coconutMilk: it("goods", "กะทิ", "Coconut milk", "น้ำสีขาวข้นมัน กลิ่นหอม", "A thick, rich white liquid with a sweet smell", 10, 22, 3),
  fermentedFish: it("goods", "ปลาร้า", "Fermented fish", "เนื้อปลาสีเทาอมน้ำตาลในไห กลิ่นแรงมาก", "Grey-brown fish in a jar, with a very strong smell", 10, 26, 3),
  shrimpPaste: it("goods", "กะปิ", "Shrimp paste", "ก้อนเนื้อละเอียดสีม่วงคล้ำ กลิ่นแรง เค็ม", "A fine-grained, dark purple block, strong-smelling and salty", 10, 28, 3),
  driedChili: it("goods", "พริกแห้ง", "Dried chillies", "เม็ดยาวสีแดงคล้ำ แห้งย่น", "Long, dark red pods, dry and wrinkled", 20, 8, 3),
  riceNoodle: it("goods", "ขนมจีน", "Rice noodles", "เส้นแป้งสีขาวเล็กๆ จับเป็นหัวกลม", "Thin white noodles gathered into small round nests", 10, 18, 3),
  bananaLeaf: it("goods", "ใบตอง", "Banana leaf", "ใบใหญ่สีเขียวสด พับซ้อนกัน", "Big, fresh green leaves, folded one on another", 20, 2, 3),
  toastedRice: it("goods", "ข้าวคั่ว", "Toasted rice", "ผงหยาบสีน้ำตาลทอง กลิ่นหอมไหม้อ่อนๆ", "A coarse, golden-brown powder with a faint toasted smell", 10, 10, 3),
  // dishes
  greenCurry: it("dish", "แกงเขียวหวาน", "Green curry", "แกงน้ำข้นสีเขียวอ่อน มีลูกชิ้นปลา มะเขือ และพริกแดงฝาน", "A thick, pale green curry with fish balls, eggplant and slices of red chilli", 5, 60, 3),
  khanomJeen: it("dish", "ขนมจีนน้ำยา", "Noodles in fish curry", "เส้นขนมจีนสีขาว ราดน้ำแกงสีส้มเหลืองข้น มีถั่วฝักยาววางข้าง", "White noodles under a thick orange-yellow sauce, with long beans beside them", 5, 70, 3),
  hoMok: it("dish", "ห่อหมกปลา", "Steamed fish custard", "กระทงใบตองใส่เนื้อปลานึ่งสีส้ม ราดกะทิขาว โรยพริกแดง", "A banana-leaf cup of steamed orange fish, topped with white cream and a strip of red chilli", 5, 56, 3),
  mangoStickyRice: it("dish", "ข้าวเหนียวมะม่วง", "Mango sticky rice", "มะม่วงสีเหลืองฝานเป็นชิ้น วางข้างข้าวเหนียวขาวราดกะทิ", "Sliced yellow mango beside white sticky rice under a white cream", 5, 50, 3),
  bananaInCoconut: it("dish", "กล้วยบวชชี", "Bananas in coconut milk", "ชิ้นกล้วยในน้ำกะทิสีขาว", "Pieces of banana in a white coconut milk", 5, 34, 3),
  taroPudding: it("dish", "ตะโก้เผือก", "Taro pudding", "กระทงใบตองสี่เหลี่ยม หน้าขาว เนื้อในประม่วง", "Square banana-leaf cups, white on top and flecked purple within", 5, 44, 3),
  steamedCroaker: it("dish", "ปลาม้านึ่งซีอิ๊ว", "Soy-steamed croaker", "ปลานึ่งทั้งตัวในน้ำสีน้ำตาลเข้ม โรยขิงซอยและต้นหอม", "A whole steamed fish in a dark brown sauce, strewn with shredded ginger and spring onion", 5, 56, 3),
  gingerFish: it("dish", "ปลาผัดขิง", "Ginger fish", "ชิ้นปลาผัดกับขิงซอยสีเหลือง น้ำขลุกขลิกสีเข้ม", "Pieces of fish fried with shreds of yellow ginger in a little dark sauce", 5, 54, 3),
  turmericFish: it("dish", "ปลาทอดขมิ้น", "Turmeric fried fish", "ปลาทอดสีเหลืองทอง โรยกระเทียมเจียวกรอบ", "Fish fried golden yellow, under crisp fried garlic", 5, 50, 3),
  jungleCurry: it("dish", "แกงป่า", "Jungle curry", "แกงน้ำใสสีแดงคล้ำ มีชิ้นปลา ถั่วฝักยาว และใบสมุนไพร", "A thin, dark red curry with fish, long beans and herbs", 5, 66, 3),
  megaLaab: it("dish", "ลาบปลาบึก", "Giant catfish laab", "ถาดใหญ่เนื้อปลาสับคลุกสมุนไพร พริกป่น และมะนาว กองพูนเท่าภูเขาลูกย่อม", "A great platter of minced fish with herbs, chilli and lime, heaped like a small hill", 20, 90, 3),
  watermelonSlices: it("dish", "แตงโมผ่าซีก", "Watermelon slices", "แตงโมสีแดงฝานเป็นรูปสามเหลี่ยม สามชิ้นบนจาน", "Three triangles of red watermelon on a plate", 10, 20, 3),
  khantoke: it("dish", "ขันโตก", "The khantoke feast", "โตกหวายกลม วางถ้วยกับข้าวเล็กๆ รายรอบ มีกระติบข้าวเหนียว", "A round rattan table ringed with small bowls of food, and a basket of sticky rice", 20, 120, 3),
  naamPrik: it("dish", "น้ำพริกปลาร้า", "Chilli dip", "ถ้วยน้ำพริกสีน้ำตาลเข้ม ล้อมด้วยแตงกวาและถั่วฝักยาว", "A bowl of dark brown dip ringed with cucumber and long beans", 5, 36, 3),
  // dishes of other countries that take the third tier's things
  ramen: it("dish", "ราเมง", "Ramen", "ชามใหญ่ น้ำซุปสีน้ำตาลใส เส้นเหลืองขดอยู่ข้างใต้ มีไข่ผ่าซีกและต้นหอมซอย", "A big bowl of clear brown broth over coiled yellow noodles, with half an egg and chopped spring onion", 5, 44, 3),
  unadon: it("dish", "ข้าวหน้าปลาไหล", "Grilled eel on rice", "ชิ้นปลาย่างสีน้ำตาลเข้มเป็นเงา วางเรียงบนข้าวขาวในกล่องสี่เหลี่ยม", "Glossy dark brown strips of grilled fish laid over white rice in a square box", 5, 48, 3),
  tteokbokki: it("dish", "ต็อกบกกี", "Tteokbokki", "แท่งแป้งสีขาวทรงกระบอก คลุกซอสสีแดงข้น เงาวาว", "White cylinders in a thick, glossy red sauce", 5, 36, 3),
  chowMein: it("dish", "บะหมี่ผัด", "Chow mein", "เส้นสีน้ำตาลทองผัดกับผักเส้นสีส้มและสีเขียว มันเงา", "Golden-brown noodles tossed with shreds of orange and green, glistening", 5, 40, 3),
  mapoTofu: it("dish", "มาโผวโต้วฟู", "Mapo tofu", "ก้อนสี่เหลี่ยมสีขาวในซอสสีแดงเข้ม มีน้ำมันสีแดงลอยหน้า", "White cubes in a dark red sauce, red oil pooling on top", 5, 40, 3),
  pizza: it("dish", "พิซซ่า", "Pizza", "แผ่นแป้งกลมขอบพอง หน้าสีแดง มีวงสีขาวละลายและใบสีเขียว", "A round flatbread with a puffed rim, red on top with melted white rounds and green leaves", 5, 46, 3),
  risotto: it("dish", "ริซอตโตฟักทอง", "Pumpkin risotto", "ข้าวเนื้อข้นสีส้มทอง เม็ดข้าวติดกันเป็นครีม", "Creamy golden-orange rice, its grains clinging together", 5, 40, 3),
  lasagna: it("dish", "ลาซานญา", "Lasagne", "ชิ้นสี่เหลี่ยมเป็นชั้นๆ สีแดงสลับสีเหลือง หน้าเกรียมเป็นจุดสีน้ำตาล", "A square slice in red and yellow layers, browned in spots on top", 5, 50, 3),
  fishCurry: it("dish", "แกงกะหรี่ปลา", "Fish curry", "แกงน้ำข้นสีเหลืองส้ม มีชิ้นปลาและพริกแดงลอยอยู่", "A thick yellow-orange curry with pieces of fish and red chilli in it", 5, 46, 3),
  naan: it("dish", "นาน", "Naan", "แผ่นแป้งรูปหยดน้ำ มีรอยเกรียมเป็นจุดสีน้ำตาล ผิวมันเงา", "A teardrop of flatbread, blistered brown in spots, its top glistening", 5, 26, 3),
  biryani: it("dish", "ข้าวหมกบริยานี", "Biryani", "ข้าวเมล็ดยาวสีเหลืองสลับขาว มีชิ้นปลาซ่อนอยู่ข้างใต้", "Long grains of yellow and white rice, with pieces of fish buried under them", 5, 46, 3),
  lassi: it("dish", "มะม่วงลาสซี่", "Mango lassi", "แก้วทรงสูง น้ำข้นสีเหลืองนวล มีฟองขาวอยู่ข้างบน", "A tall glass of something thick and pale yellow, with white froth on top", 5, 24, 3),
  scrollGreenCurry: it("scroll", "ม้วนสูตร แกงเขียวหวาน", "Recipe scroll: green curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0, 3),
  scrollHoMok: it("scroll", "ม้วนสูตร ห่อหมกปลา", "Recipe scroll: steamed fish custard", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 0, 3),
  // the scrolls nobody sells: of every other dish of this tier, to be found in what the river brings up (lib/town/scrolls)
  scrollKhanomJeen: it("scroll", "ม้วนสูตร ขนมจีนน้ำยา", "Recipe scroll: noodles in fish curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollMangoStickyRice: it("scroll", "ม้วนสูตร ข้าวเหนียวมะม่วง", "Recipe scroll: mango sticky rice", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollBananaInCoconut: it("scroll", "ม้วนสูตร กล้วยบวชชี", "Recipe scroll: bananas in coconut milk", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollTaroPudding: it("scroll", "ม้วนสูตร ตะโก้เผือก", "Recipe scroll: taro pudding", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollSteamedCroaker: it("scroll", "ม้วนสูตร ปลาม้านึ่งซีอิ๊ว", "Recipe scroll: soy-steamed croaker", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollGingerFish: it("scroll", "ม้วนสูตร ปลาผัดขิง", "Recipe scroll: ginger fish", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollTurmericFish: it("scroll", "ม้วนสูตร ปลาทอดขมิ้น", "Recipe scroll: turmeric fried fish", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollJungleCurry: it("scroll", "ม้วนสูตร แกงป่า", "Recipe scroll: jungle curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollMegaLaab: it("scroll", "ม้วนสูตร ลาบปลาบึก", "Recipe scroll: giant catfish laab", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollWatermelonSlices: it("scroll", "ม้วนสูตร แตงโมผ่าซีก", "Recipe scroll: watermelon slices", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollKhantoke: it("scroll", "ม้วนสูตร ขันโตก", "Recipe scroll: the khantoke feast", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollNaamPrik: it("scroll", "ม้วนสูตร น้ำพริกปลาร้า", "Recipe scroll: chilli dip", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollRamen: it("scroll", "ม้วนสูตร ราเมง", "Recipe scroll: ramen", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollUnadon: it("scroll", "ม้วนสูตร ข้าวหน้าปลาไหล", "Recipe scroll: grilled eel on rice", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollTteokbokki: it("scroll", "ม้วนสูตร ต็อกบกกี", "Recipe scroll: tteokbokki", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollChowMein: it("scroll", "ม้วนสูตร บะหมี่ผัด", "Recipe scroll: chow mein", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollMapoTofu: it("scroll", "ม้วนสูตร มาโผวโต้วฟู", "Recipe scroll: mapo tofu", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollPizza: it("scroll", "ม้วนสูตร พิซซ่า", "Recipe scroll: pizza", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollRisotto: it("scroll", "ม้วนสูตร ริซอตโตฟักทอง", "Recipe scroll: pumpkin risotto", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollLasagna: it("scroll", "ม้วนสูตร ลาซานญา", "Recipe scroll: lasagne", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollFishCurry: it("scroll", "ม้วนสูตร แกงกะหรี่ปลา", "Recipe scroll: fish curry", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollNaan: it("scroll", "ม้วนสูตร นาน", "Recipe scroll: naan", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollBiryani: it("scroll", "ม้วนสูตร ข้าวหมกบริยานี", "Recipe scroll: biryani", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
  scrollLassi: it("scroll", "ม้วนสูตร มะม่วงลาสซี่", "Recipe scroll: mango lassi", "กระดาษม้วนผูกเชือกแดง มีตัวหนังสือเขียนอยู่ข้างใน", "A roll of paper tied with red string. Something is written inside.", 1, 35, 3),
} satisfies Record<string, Item>;

export type ItemId = keyof typeof ITEMS;
export const itemOf = (id: ItemId): Item => ITEMS[id];
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
/**
 * The recipe each scroll has written on it: one for every dish that has a recipe (the owner, 2026-10-03: "อาหารมีหลาย
 * อย่างมาก ทำไมม้วนสูตรมีแค่ 6 อัน"). The uncle sells six, the two simplest of each tier; the rest are found in what
 * the river brings up (lib/town/scrolls), and change hands like anything else.
 *
 * And one that is of no dish: how the cure for pests is made (the owner, the day after the game opened: "ช่วยเพิ่มสูตร
 * ทำยาฆ่าแมลงในร้านค้าให้ด้วย"). A pest kills a plant in six hours, the cure is made and not sold, and what is made is
 * found by guessing: nobody had found it, and nobody could have (see MAKES). The uncle sells it from the first day.
 */
export const SCROLLS: Partial<Record<ItemId, ItemId>> = {
  scrollPestCure: "pestCure",
  scrollFriedMinnow: "friedMinnow", scrollGrilledFish: "grilledFish", scrollGrilledCorn: "grilledCorn", scrollRoastSweetPotato: "roastSweetPotato", scrollStirKangkong: "stirKangkong", scrollBasilCatfish: "basilCatfish",
  scrollTomYum: "tomYum", scrollSourCurry: "sourCurry", scrollFriedPerch: "friedPerch", scrollFishCake: "fishCake", scrollSpicyEel: "spicyEel", scrollGrilledPrawn: "grilledPrawn",
  scrollSteamedGoby: "steamedGoby", scrollPumpkinSoup: "pumpkinSoup", scrollShabu: "shabu", scrollSomTam: "somTam", scrollGrilledEggplant: "grilledEggplant", scrollTomKha: "tomKha",
  scrollFriedGourami: "friedGourami", scrollCrabCurry: "crabCurry", scrollSteamedSheatfish: "steamedSheatfish", scrollFriedFrog: "friedFrog", scrollLaab: "laab", scrollOmelette: "omelette",
  scrollSnailCurry: "snailCurry", scrollCandiedPumpkin: "candiedPumpkin", scrollFriedRice: "friedRice", scrollSushi: "sushi", scrollTempura: "tempura", scrollOkonomiyaki: "okonomiyaki",
  scrollKimchi: "kimchi", scrollBibimbap: "bibimbap", scrollKimbap: "kimbap", scrollPajeon: "pajeon", scrollHarGow: "harGow", scrollSpringRoll: "springRoll",
  scrollCongee: "congee", scrollSpaghetti: "spaghetti", scrollMinestrone: "minestrone", scrollSamosa: "samosa", scrollGreenCurry: "greenCurry", scrollKhanomJeen: "khanomJeen",
  scrollHoMok: "hoMok", scrollMangoStickyRice: "mangoStickyRice", scrollBananaInCoconut: "bananaInCoconut", scrollTaroPudding: "taroPudding", scrollSteamedCroaker: "steamedCroaker", scrollGingerFish: "gingerFish",
  scrollTurmericFish: "turmericFish", scrollJungleCurry: "jungleCurry", scrollMegaLaab: "megaLaab", scrollWatermelonSlices: "watermelonSlices", scrollKhantoke: "khantoke", scrollNaamPrik: "naamPrik",
  scrollRamen: "ramen", scrollUnadon: "unadon", scrollTteokbokki: "tteokbokki", scrollChowMein: "chowMein", scrollMapoTofu: "mapoTofu", scrollPizza: "pizza",
  scrollRisotto: "risotto", scrollLasagna: "lasagna", scrollFishCurry: "fishCurry", scrollNaan: "naan", scrollBiryani: "biryani", scrollLassi: "lassi",
  // the dishes of the twenty fish that came later (2026-10-05): none of them sold, all of the early game
  scrollFishChips: "fishChips", scrollUkha: "ukha", scrollThieboudienne: "thieboudienne", scrollPiranhaSoup: "piranhaSoup",
  scrollCrawfishBoil: "crawfishBoil", scrollMasgouf: "masgouf", scrollSalmonSteak: "salmonSteak", scrollArapaimaRoast: "arapaimaRoast",
};
/** The name of an item's picture: its own id, but every scroll looks the same. */
export const iconOf = (id: ItemId): string => (id in SCROLLS ? "scroll" : id);
/** The name of the picture of a dish's pot (the owner, 2026-10-03: a dish comes as a big pot of it, each with its own picture). */
export const potIconOf = (dish: DishId): string => `pot${dish[0].toUpperCase()}${dish.slice(1)}`;

/* ── fish ───────────────────────────────────────────────────────────────── */

/**
 * What goes on a hook: the two baits, a minnow for the hunters, corn, and a loach alive for the biggest of them (it
 * came with the twenty fish of 2026-10-05); then the next tiers' (a cricket, a ball of bran, small shrimp; red ant
 * eggs, a carved fish, a fermented ball). The fish of a later tier take only that tier's baits or later ones, so
 * the early game's water has only the early game's fish in it.
 */
export type BaitId = "worm" | "dough" | "minnow" | "corn" | "loach" | "cricket" | "branBait" | "shrimpLive" | "antEggs" | "lure" | "fermentedBait";
export const BAITS: BaitId[] = ["worm", "dough", "minnow", "corn", "loach", "cricket", "branBait", "shrimpLive", "antEggs", "lure", "fermentedBait"];
/** Baits that are not eaten: they come back with the line, and are lost only when the line snaps. */
export const KEPT_BAITS: BaitId[] = ["lure"];
export type FishId =
  | "minnow" | "barb" | "tilapia" | "perch" | "catfish" | "pangasius" | "snakehead" | "eel" | "prawn" | "featherback" | "goby" | "koi"
  | "gourami" | "crab" | "snail" | "hampala" | "sheatfish" | "bagrid" | "giantGourami" | "frog" | "tigerfish" | "wallago"
  | "croaker" | "blackEar" | "spinyEel" | "puffer" | "goldenCarp" | "giantSnakehead" | "royalFeatherback" | "arowana" | "stingray" | "megaCatfish"
  | "loach" | "mosquitofish" | "mussel" | "crayfish" | "goldfish" | "carp" | "piranha" | "herring" | "archerfish" | "pacu"
  | "pike" | "nilePerch" | "salmon" | "wels" | "gar" | "arapaima" | "dozyFish" | "popotoFish" | "rainbowFish" | "moonFish";
/** What comes up that is no fish. */
export type FlotsamId = "hyacinth" | "boot" | "driftwood" | "bottle" | "pearl" | "chest";
/** What a line can bring up: a fish, or one of the things that are not. */
export type CatchId = FishId | FlotsamId;
export type Tier = "common" | "uncommon" | "rare" | "legend";
/**
 * What may have to hold for a fish to bite at all (lib/town/fishing's `signsOf` says when each does): whoever
 * fishes has no stamina left; others have lines in the water too; it is the weekend; the rain has only just
 * stopped; the moon is full.
 */
export type Sign = "tired" | "crowd" | "weekend" | "after" | "full";

/** How it fights: steady and heavy, in quick darts, in rare great leaps, by slipping (the safe part of the line wanders), or lying still and then bolting. */
export type FightStyle = "steady" | "darter" | "leaper" | "slippery" | "sleeper";

export interface Fish {
  tier: Tier;
  /** How readily it takes each bait: 1 is its favourite, and one it is not listed for it never takes. */
  baits: Partial<Record<BaitId, number>>;
  /** The hours it bites, in Bangkok, as [from, to) pairs; one that runs past midnight is two pairs. */
  hours: Array<[number, number]>;
  /** How many times as often it bites in the rain (1 when it does not care; 0 for one that never bites in it). */
  rain: number;
  /** How many times as often it bites while it does not rain: 1 when left out, 0 for one that bites only in the rain. */
  dry?: number;
  /**
   * Where it is caught from: only off the bank, or only off the deck. Left out, a common fish comes to both and any
   * other only to the deck's deep water (as it was before a fish could say).
   */
  water?: "bank" | "deck";
  /** What has to hold for it to bite at all: every one of these. Nothing tells them; a fish's line may hint at one. */
  needs?: Sign[];
  /**
   * Seconds before it bites, least and most: anywhere between, by chance. Half what they were at first, and a
   * wider spread (the owner, 2026-10-03: "ช่วยทำให้การรอปลา ลดลง 2 เท่าด้วย ตอนนี้มันนานเกินไป", "ทำให้เวลาการรอปลา เป็นค่า random
   * ด้วย"): the longest halved, the shortest quartered, so a bite may come almost at once or keep one waiting.
   * And halved again, least and most (the owner, the game's second night, 2026-10-04: "ช่วยทำให้รอปลาติดเบ็ด เร็วขึ้น
   * ด้วยตอนนี้นานไป"): the members had waited 32 s for a bite, taking one with another (205 bites), and 15 s in the
   * fight that followed, so two thirds of fishing was waiting. A common fish takes at most half a minute now, and
   * the rarest two minutes; what is no fish (FLOTSAM) comes in half the time too.
   */
  wait: [number, number];
  /** Its length in centimetres, least and most. */
  size: [number, number];
  /**
   * The fight (lib/town/fishing): the share of the tension gauge that is safe, how hard it pulls and surges, how
   * often it surges (seconds, least and most), how much line there is to win, and the stamina it costs; and how
   * the safe stretch moves (the owner, 2026-10-03: "อยากให้แถบสีเขียว ขยับไปมา ตามความยากของปลา"): how far it goes
   * at a time from where it is (`sway`), and how fast, in gauge-lengths a second (`pace`). The harder the
   * fish, the further and the faster. Move by move it may end anywhere on the gauge. (Every share here is of the gauge as it is now, twice as long as it was
   * at first: "เพิ่มหลอด ตกปลาให้กว้างกว่านี้ 2 เท่า".)
   */
  fight: { style: FightStyle; band: number; pull: number; surge: number; every: [number, number]; line: number; effort: number; sway: number; pace: number };
}

const NIGHT: Array<[number, number]> = [[19, 24], [0, 5]];
export const FISH: Record<FishId, Fish> = {
  minnow: { tier: "common", baits: { worm: 1, dough: 1 }, hours: [[5, 22]], rain: 1, wait: [3, 15], size: [4, 8],
    fight: { style: "darter", band: 0.22, pull: 0.08, surge: 0.22, every: [2.6, 4.5], line: 0.5, effort: 2, sway: 0.12, pace: 0.11 } },
  barb: { tier: "common", baits: { dough: 1, corn: 1, worm: 0.6 }, hours: [[6, 18]], rain: 1, wait: [5, 25], size: [12, 22],
    fight: { style: "steady", band: 0.2, pull: 0.14, surge: 0.32, every: [2.6, 4.6], line: 0.8, effort: 3, sway: 0.15, pace: 0.08 } },
  tilapia: { tier: "common", baits: { dough: 1, corn: 0.8 }, hours: [[7, 17]], rain: 1, wait: [5, 28], size: [18, 32],
    fight: { style: "steady", band: 0.19, pull: 0.17, surge: 0.36, every: [2.4, 4.4], line: 0.9, effort: 4, sway: 0.17, pace: 0.09 } },
  perch: { tier: "common", baits: { worm: 1 }, hours: [[5, 20]], rain: 1.3, wait: [5, 25], size: [10, 18],
    fight: { style: "darter", band: 0.18, pull: 0.12, surge: 0.42, every: [1.5, 2.8], line: 0.8, effort: 4, sway: 0.17, pace: 0.15 } },
  // (it takes a loach as it takes a minnow: the bait came on 2026-10-05, and without the catfish a loach dropped at
  // night would bring up a rare fish two bites in five, there being nothing else for it to be)
  catfish: { tier: "common", baits: { worm: 1, minnow: 0.5, loach: 0.5, dough: 0.3 }, hours: [[18, 24], [0, 6]], rain: 2, wait: [8, 35], size: [25, 45],
    fight: { style: "steady", band: 0.18, pull: 0.24, surge: 0.3, every: [3, 6], line: 1, effort: 5, sway: 0.2, pace: 0.1 } },
  pangasius: { tier: "uncommon", baits: { dough: 1, corn: 1 }, hours: [[8, 17]], rain: 1, wait: [10, 50], size: [50, 90],
    fight: { style: "steady", band: 0.165, pull: 0.3, surge: 0.34, every: [2.8, 5], line: 1.3, effort: 7, sway: 0.24, pace: 0.12 } },
  snakehead: { tier: "uncommon", baits: { minnow: 1, worm: 0.3 }, hours: [[5, 8], [17, 20]], rain: 1.2, wait: [13, 55], size: [35, 70],
    fight: { style: "leaper", band: 0.155, pull: 0.18, surge: 0.7, every: [2.6, 4.2], line: 1.1, effort: 7, sway: 0.26, pace: 0.14 } },
  eel: { tier: "uncommon", baits: { worm: 1 }, hours: NIGHT, rain: 2.5, wait: [13, 55], size: [40, 80],
    fight: { style: "slippery", band: 0.155, pull: 0.16, surge: 0.4, every: [2.2, 4], line: 1, effort: 6, sway: 0.28, pace: 0.15 } },
  prawn: { tier: "uncommon", baits: { worm: 0.8, dough: 0.6 }, hours: [[17, 24]], rain: 1, wait: [10, 45], size: [14, 28],
    fight: { style: "darter", band: 0.155, pull: 0.1, surge: 0.46, every: [1.3, 2.4], line: 0.7, effort: 4, sway: 0.24, pace: 0.16 } },
  featherback: { tier: "rare", baits: { minnow: 1 }, hours: NIGHT, rain: 1, wait: [18, 75], size: [45, 85],
    fight: { style: "leaper", band: 0.14, pull: 0.22, surge: 0.62, every: [2.4, 4], line: 1.2, effort: 8, sway: 0.3, pace: 0.14 } },
  goby: { tier: "rare", baits: { minnow: 1, worm: 0.7 }, hours: [[20, 24], [0, 4]], rain: 1, wait: [23, 90], size: [25, 50],
    fight: { style: "sleeper", band: 0.14, pull: 0.1, surge: 0.8, every: [4, 7], line: 1.1, effort: 8, sway: 0.3, pace: 0.15 } },
  // ── the second tier: on a cricket, a ball of bran or small shrimp ──
  gourami: { tier: "common", baits: { branBait: 1, cricket: 0.6 }, hours: [[6, 18]], rain: 1, wait: [5, 25], size: [12, 20],
    fight: { style: "steady", band: 0.19, pull: 0.14, surge: 0.32, every: [2.6, 4.6], line: 0.8, effort: 3, sway: 0.17, pace: 0.09 } },
  crab: { tier: "common", baits: { shrimpLive: 1, branBait: 0.5 }, hours: [[17, 24], [0, 6]], rain: 1.5, wait: [5, 25], size: [5, 9],
    fight: { style: "darter", band: 0.19, pull: 0.1, surge: 0.3, every: [1.6, 3], line: 0.5, effort: 2, sway: 0.15, pace: 0.13 } },
  snail: { tier: "common", baits: { branBait: 1 }, hours: [[0, 24]], rain: 1.2, wait: [4, 20], size: [2, 4],
    fight: { style: "sleeper", band: 0.22, pull: 0.05, surge: 0.12, every: [4, 7], line: 0.4, effort: 1, sway: 0.1, pace: 0.06 } },
  hampala: { tier: "uncommon", baits: { cricket: 1, shrimpLive: 0.8 }, hours: [[5, 9], [16, 19]], rain: 1, wait: [10, 45], size: [25, 50],
    fight: { style: "darter", band: 0.155, pull: 0.14, surge: 0.48, every: [1.3, 2.4], line: 0.9, effort: 6, sway: 0.26, pace: 0.16 } },
  sheatfish: { tier: "uncommon", baits: { shrimpLive: 1 }, hours: NIGHT, rain: 1.5, wait: [13, 55], size: [25, 45],
    fight: { style: "slippery", band: 0.15, pull: 0.14, surge: 0.4, every: [2.2, 4], line: 1, effort: 6, sway: 0.28, pace: 0.15 } },
  bagrid: { tier: "uncommon", baits: { cricket: 1, branBait: 0.4 }, hours: [[18, 24], [0, 5]], rain: 2, wait: [13, 55], size: [30, 60],
    fight: { style: "steady", band: 0.16, pull: 0.28, surge: 0.36, every: [2.8, 5], line: 1.2, effort: 7, sway: 0.24, pace: 0.12 } },
  giantGourami: { tier: "uncommon", baits: { branBait: 1 }, hours: [[8, 17]], rain: 1, wait: [13, 55], size: [35, 60],
    fight: { style: "steady", band: 0.16, pull: 0.32, surge: 0.34, every: [3, 5.5], line: 1.4, effort: 8, sway: 0.22, pace: 0.11 } },
  frog: { tier: "uncommon", baits: { cricket: 1 }, hours: [[18, 24], [0, 6]], rain: 3, wait: [10, 45], size: [8, 14],
    fight: { style: "leaper", band: 0.155, pull: 0.08, surge: 0.7, every: [1.6, 3], line: 0.6, effort: 4, sway: 0.26, pace: 0.15 } },
  tigerfish: { tier: "rare", baits: { shrimpLive: 1 }, hours: [[5, 8], [17, 20]], rain: 1, wait: [23, 90], size: [20, 40],
    fight: { style: "sleeper", band: 0.135, pull: 0.12, surge: 0.85, every: [3.5, 6.5], line: 1.1, effort: 9, sway: 0.3, pace: 0.16 } },
  wallago: { tier: "rare", baits: { shrimpLive: 1, cricket: 0.5 }, hours: NIGHT, rain: 1.5, wait: [23, 90], size: [60, 120],
    fight: { style: "leaper", band: 0.135, pull: 0.26, surge: 0.6, every: [2.4, 4], line: 1.5, effort: 10, sway: 0.3, pace: 0.15 } },
  // ── the third tier: on red ant eggs, a carved fish or a fermented ball ──
  croaker: { tier: "uncommon", baits: { antEggs: 1 }, hours: [[19, 24], [0, 5]], rain: 1, wait: [13, 55], size: [20, 35],
    fight: { style: "steady", band: 0.15, pull: 0.22, surge: 0.4, every: [2.4, 4.4], line: 1.1, effort: 7, sway: 0.26, pace: 0.13 } },
  blackEar: { tier: "uncommon", baits: { fermentedBait: 1 }, hours: [[6, 18]], rain: 1, wait: [13, 55], size: [50, 90],
    fight: { style: "steady", band: 0.15, pull: 0.34, surge: 0.38, every: [2.8, 5], line: 1.5, effort: 9, sway: 0.26, pace: 0.13 } },
  spinyEel: { tier: "uncommon", baits: { antEggs: 1 }, hours: NIGHT, rain: 2, wait: [13, 55], size: [25, 45],
    fight: { style: "slippery", band: 0.145, pull: 0.12, surge: 0.42, every: [2, 3.6], line: 0.9, effort: 6, sway: 0.3, pace: 0.16 } },
  puffer: { tier: "uncommon", baits: { antEggs: 0.8, lure: 0.5 }, hours: [[9, 16]], rain: 1, wait: [10, 45], size: [8, 15],
    fight: { style: "darter", band: 0.15, pull: 0.08, surge: 0.5, every: [1.2, 2.2], line: 0.6, effort: 4, sway: 0.26, pace: 0.18 } },
  goldenCarp: { tier: "rare", baits: { fermentedBait: 1 }, hours: [[5, 8], [16, 19]], rain: 1, wait: [23, 90], size: [50, 90],
    fight: { style: "steady", band: 0.135, pull: 0.36, surge: 0.44, every: [2.6, 4.6], line: 1.6, effort: 10, sway: 0.3, pace: 0.15 } },
  giantSnakehead: { tier: "rare", baits: { lure: 1 }, hours: [[5, 9], [16, 20]], rain: 1.2, wait: [23, 90], size: [60, 110],
    fight: { style: "leaper", band: 0.13, pull: 0.24, surge: 0.85, every: [2, 3.6], line: 1.5, effort: 11, sway: 0.32, pace: 0.16 } },
  royalFeatherback: { tier: "rare", baits: { lure: 1 }, hours: NIGHT, rain: 1, wait: [23, 90], size: [50, 90],
    fight: { style: "leaper", band: 0.13, pull: 0.24, surge: 0.7, every: [2.2, 3.8], line: 1.4, effort: 10, sway: 0.32, pace: 0.16 } },
  arowana: { tier: "legend", baits: { lure: 1 }, hours: [[5, 7], [17, 19]], rain: 1, wait: [30, 120], size: [50, 90],
    fight: { style: "leaper", band: 0.14, pull: 0.24, surge: 0.78, every: [1.8, 3.2], line: 1.6, effort: 13, sway: 0.36, pace: 0.16 } },
  stingray: { tier: "legend", baits: { fermentedBait: 1 }, hours: [[21, 24], [0, 4]], rain: 1, wait: [30, 120], size: [100, 220],
    fight: { style: "sleeper", band: 0.14, pull: 0.36, surge: 0.72, every: [3, 5.5], line: 2, effort: 14, sway: 0.36, pace: 0.13 } },
  megaCatfish: { tier: "legend", baits: { fermentedBait: 0.7, antEggs: 0.5 }, hours: [[4, 7], [18, 21]], rain: 1, wait: [30, 120], size: [120, 270],
    fight: { style: "steady", band: 0.14, pull: 0.4, surge: 0.46, every: [2.6, 4.6], line: 2.2, effort: 15, sway: 0.34, pace: 0.12 } },
  koi: { tier: "legend", baits: { dough: 1, corn: 0.7 }, hours: [[5, 7], [17, 19]], rain: 1, wait: [30, 120], size: [60, 100],
    fight: { style: "leaper", band: 0.16, pull: 0.24, surge: 0.85, every: [1.8, 3.2], line: 1.5, effort: 12, sway: 0.34, pace: 0.15 } },
  // ── twenty more of the first tier (the owner, 2026-10-05), each found its own way: by where the line is dropped
  //    (`water`), by the hour, the bait, the sky (`rain`, `dry`) and, a few of them, by something else that has to
  //    hold (`needs`). They come after everything else, so that the fish there were are weighed in the order they
  //    always were. ──
  // off the bank only: the shallows have fish of their own now
  loach: { tier: "common", baits: { worm: 1, dough: 0.5 }, hours: [[0, 24]], rain: 3, water: "bank", wait: [4, 20], size: [8, 15],
    fight: { style: "slippery", band: 0.21, pull: 0.06, surge: 0.25, every: [1.8, 3.2], line: 0.5, effort: 2, sway: 0.14, pace: 0.12 } },
  mosquitofish: { tier: "common", baits: { dough: 1, worm: 0.5 }, hours: [[6, 18]], rain: 1, water: "bank", wait: [3, 15], size: [3, 6],
    fight: { style: "darter", band: 0.23, pull: 0.05, surge: 0.18, every: [2.6, 4.5], line: 0.4, effort: 1, sway: 0.1, pace: 0.1 } },
  mussel: { tier: "common", baits: { dough: 1 }, hours: [[0, 24]], rain: 1, water: "bank", wait: [5, 25], size: [6, 12],
    fight: { style: "sleeper", band: 0.23, pull: 0.04, surge: 0.1, every: [4, 7], line: 0.4, effort: 1, sway: 0.08, pace: 0.05 } },
  crayfish: { tier: "common", baits: { worm: 1, minnow: 0.5 }, hours: [[18, 24], [0, 5]], rain: 1.5, water: "bank", wait: [5, 25], size: [7, 13],
    fight: { style: "darter", band: 0.19, pull: 0.1, surge: 0.34, every: [1.5, 2.8], line: 0.6, effort: 3, sway: 0.16, pace: 0.14 } },
  goldfish: { tier: "common", baits: { dough: 1 }, hours: [[8, 18]], rain: 1, water: "bank", needs: ["weekend"], wait: [5, 25], size: [6, 14],
    fight: { style: "darter", band: 0.2, pull: 0.07, surge: 0.3, every: [1.6, 3], line: 0.5, effort: 2, sway: 0.16, pace: 0.13 } },
  // from anywhere, by day
  carp: { tier: "common", baits: { corn: 1, dough: 0.7 }, hours: [[6, 18]], rain: 1, wait: [6, 28], size: [25, 50],
    fight: { style: "steady", band: 0.185, pull: 0.2, surge: 0.34, every: [2.6, 4.8], line: 1, effort: 5, sway: 0.18, pace: 0.09 } },
  // off the deck: on a fish for bait, mostly
  piranha: { tier: "common", baits: { minnow: 1, loach: 1, worm: 0.4 }, hours: [[9, 17]], rain: 1, water: "deck", wait: [4, 20], size: [15, 30],
    fight: { style: "darter", band: 0.18, pull: 0.14, surge: 0.48, every: [1.2, 2.2], line: 0.8, effort: 4, sway: 0.2, pace: 0.16 } },
  herring: { tier: "uncommon", baits: { worm: 1, dough: 0.6 }, hours: [[4, 8]], rain: 1, wait: [8, 40], size: [18, 32],
    fight: { style: "darter", band: 0.16, pull: 0.1, surge: 0.44, every: [1.4, 2.6], line: 0.8, effort: 4, sway: 0.24, pace: 0.15 } },
  archerfish: { tier: "uncommon", baits: { worm: 1 }, hours: [[8, 18]], rain: 0, wait: [10, 45], size: [10, 20],
    fight: { style: "leaper", band: 0.16, pull: 0.08, surge: 0.6, every: [1.8, 3.2], line: 0.7, effort: 4, sway: 0.25, pace: 0.15 } },
  pacu: { tier: "uncommon", baits: { dough: 1, corn: 1 }, hours: [[9, 16]], rain: 1, wait: [10, 50], size: [30, 60],
    fight: { style: "steady", band: 0.16, pull: 0.28, surge: 0.36, every: [2.8, 5], line: 1.2, effort: 7, sway: 0.24, pace: 0.12 } },
  pike: { tier: "uncommon", baits: { minnow: 1, loach: 1 }, hours: [[5, 9], [16, 19]], rain: 1, wait: [13, 55], size: [40, 90],
    fight: { style: "leaper", band: 0.155, pull: 0.2, surge: 0.68, every: [2.4, 4], line: 1.2, effort: 7, sway: 0.26, pace: 0.14 } },
  nilePerch: { tier: "uncommon", baits: { loach: 1, minnow: 0.6 }, hours: [[10, 16]], rain: 0, wait: [13, 55], size: [50, 110],
    fight: { style: "steady", band: 0.155, pull: 0.32, surge: 0.4, every: [2.6, 4.6], line: 1.4, effort: 8, sway: 0.25, pace: 0.12 } },
  // (only in the rain, and then as readily as a common fish: four times an uncommon one's share)
  salmon: { tier: "uncommon", baits: { loach: 1, worm: 0.6 }, hours: [[0, 24]], rain: 4, dry: 0, wait: [10, 45], size: [45, 85],
    fight: { style: "leaper", band: 0.155, pull: 0.22, surge: 0.7, every: [2.2, 3.8], line: 1.2, effort: 7, sway: 0.26, pace: 0.14 } },
  wels: { tier: "rare", baits: { minnow: 1, loach: 1 }, hours: [[21, 24], [0, 4]], rain: 2, wait: [18, 75], size: [80, 180],
    fight: { style: "steady", band: 0.145, pull: 0.34, surge: 0.42, every: [3, 5.5], line: 1.5, effort: 9, sway: 0.28, pace: 0.12 } },
  gar: { tier: "rare", baits: { loach: 1, minnow: 0.6 }, hours: [[17, 21]], rain: 1, wait: [18, 75], size: [70, 150],
    fight: { style: "leaper", band: 0.14, pull: 0.24, surge: 0.75, every: [2.2, 3.8], line: 1.4, effort: 9, sway: 0.3, pace: 0.15 } },
  // (a loach is not much to it: beside the pike it is a bite or two in a hundred, as the koi is on dough)
  arapaima: { tier: "legend", baits: { loach: 0.3 }, hours: [[5, 7], [17, 19]], rain: 1, wait: [30, 120], size: [120, 250],
    fight: { style: "leaper", band: 0.15, pull: 0.34, surge: 0.8, every: [2, 3.4], line: 1.9, effort: 13, sway: 0.34, pace: 0.14 } },
  // the four of no river: each bites only when something holds (and then as a common fish does; the moon's is rare
  // even under a full moon)
  dozyFish: { tier: "common", baits: { worm: 1, dough: 1 }, hours: [[0, 24]], rain: 1, needs: ["tired"], wait: [4, 20], size: [12, 24],
    fight: { style: "sleeper", band: 0.25, pull: 0.04, surge: 0.1, every: [5, 8], line: 0.4, effort: 1, sway: 0.08, pace: 0.05 } },
  popotoFish: { tier: "common", baits: { worm: 1, dough: 1 }, hours: [[0, 24]], rain: 1, needs: ["crowd"], wait: [5, 25], size: [10, 20],
    fight: { style: "steady", band: 0.2, pull: 0.12, surge: 0.28, every: [2.6, 4.6], line: 0.7, effort: 3, sway: 0.15, pace: 0.09 } },
  rainbowFish: { tier: "common", baits: { dough: 1, worm: 1 }, hours: [[6, 18]], rain: 1, needs: ["after"], wait: [5, 25], size: [8, 14],
    fight: { style: "darter", band: 0.19, pull: 0.08, surge: 0.36, every: [1.4, 2.6], line: 0.6, effort: 3, sway: 0.18, pace: 0.15 } },
  moonFish: { tier: "rare", baits: { dough: 1, worm: 0.6 }, hours: [[19, 24], [0, 5]], rain: 1, needs: ["full"], wait: [18, 75], size: [20, 40],
    fight: { style: "slippery", band: 0.145, pull: 0.12, surge: 0.5, every: [2, 3.6], line: 1, effort: 7, sway: 0.3, pace: 0.16 } },
};
export const FISH_IDS = Object.keys(FISH) as FishId[];
/** How often each tier bites beside the others, before the bait, the hour and the rain are counted. */
export const TIER_WEIGHT: Record<Tier, number> = { common: 100, uncommon: 26, rare: 7, legend: 2.5 };
/**
 * What comes up that is no fish, at any hour: how often beside the fish, and how long it takes. The first two come
 * on any bait; those of a later tier only on that tier's baits (`on`), like its fish.
 */
export const FLOTSAM: Record<FlotsamId, { weight: number; wait: [number, number]; on?: BaitId[] }> = {
  hyacinth: { weight: 9, wait: [4, 23] },
  boot: { weight: 2, wait: [5, 30] },
  driftwood: { weight: 6, wait: [4, 23], on: ["cricket", "branBait", "shrimpLive"] },
  bottle: { weight: 3, wait: [5, 30], on: ["cricket", "branBait", "shrimpLive"] },
  pearl: { weight: 0.6, wait: [15, 60], on: ["antEggs", "lure", "fermentedBait"] },
  chest: { weight: 0.3, wait: [20, 75], on: ["antEggs", "lure", "fermentedBait"] },
};
export const FLOTSAM_IDS = Object.keys(FLOTSAM) as FlotsamId[];

/* ── vegetables ─────────────────────────────────────────────────────────── */

export type CropId =
  | "kangkong" | "scallion" | "cabbage" | "carrot" | "daikon" | "corn" | "chili" | "tomato" | "basil" | "sweetPotato" | "garlic" | "pumpkin"
  | "eggplant" | "cucumber" | "longBean" | "lemongrass" | "galangal" | "lime" | "papaya"
  | "mango" | "banana" | "coconut" | "ginger" | "turmeric" | "taro" | "watermelon";

/**
 * How a vegetable grows (the owner, 2026-10-03): through five stages. What was
 * sown lies in the ground first, with nothing of the plant to see ("ให้ state
 * แรก เป็นแค่ seed ก่อน state ต่อไปค่อยเป้นต้นอ่อน"); then a sprout, a seedling, the
 * plant half grown, and the last of them ripe. Some bear again: once picked they go back to the stage before
 * the last, and are ripe again after `again` hours ("เปลี่ยนจาก state สุดท้ายมา
 * เป็นรองสุดท้ายแล้วรออีก 1-2 วันเก็บได้ใหม่"), so many times in all (`picks`); then
 * the plant is spent and the plot is free.
 */
export interface Crop {
  seed: ItemId;
  /** Hours from sowing to ripe. */
  hours: number;
  /**
   * How many are picked at a time, least and most. Twice what they were at first (the owner, 2026-10-04, the morning
   * after the game opened: a vegetable waited hours for fetched no more than a fish caught at once, and asked which
   * way to mend it he chose this one, "1 + 2 ครับ ทำเลย": every crop gives twice as many, at the price it had, so that
   * no dish's worth moves; and the hoe costs half, lib/town/farm).
   */
  yield: [number, number];
  /** For one that bears again: the hours until it is ripe again, and how many times it is picked in all. */
  again?: number;
  picks?: number;
}
export const CROPS: Record<CropId, Crop> = {
  kangkong: { seed: "seedKangkong", hours: 6, yield: [4, 6], again: 12, picks: 3 },
  scallion: { seed: "seedScallion", hours: 8, yield: [4, 6], again: 12, picks: 3 },
  cabbage: { seed: "seedCabbage", hours: 24, yield: [2, 2] },
  carrot: { seed: "seedCarrot", hours: 24, yield: [4, 6] },
  daikon: { seed: "seedDaikon", hours: 36, yield: [2, 4] },
  corn: { seed: "seedCorn", hours: 48, yield: [4, 6] },
  chili: { seed: "seedChili", hours: 48, yield: [6, 10], again: 24, picks: 4 },
  tomato: { seed: "seedTomato", hours: 72, yield: [6, 8], again: 36, picks: 3 },
  basil: { seed: "seedBasil", hours: 36, yield: [6, 8], again: 24, picks: 4 },
  sweetPotato: { seed: "seedSweetPotato", hours: 72, yield: [4, 8] },
  garlic: { seed: "seedGarlic", hours: 60, yield: [4, 6] },
  pumpkin: { seed: "seedPumpkin", hours: 144, yield: [2, 2] },
  // the second tier: two to seven days, and most of them bear again
  eggplant: { seed: "seedEggplant", hours: 60, yield: [4, 6], again: 30, picks: 3 },
  cucumber: { seed: "seedCucumber", hours: 40, yield: [4, 8], again: 20, picks: 3 },
  longBean: { seed: "seedLongBean", hours: 48, yield: [6, 10], again: 24, picks: 4 },
  lemongrass: { seed: "seedLemongrass", hours: 72, yield: [4, 6], again: 36, picks: 5 },
  galangal: { seed: "seedGalangal", hours: 96, yield: [2, 4] },
  lime: { seed: "seedLime", hours: 168, yield: [6, 10], again: 48, picks: 8 },
  papaya: { seed: "seedPapaya", hours: 144, yield: [2, 4], again: 48, picks: 5 },
  // the third tier: trees that take a week and more, and bear for a season
  mango: { seed: "seedMango", hours: 240, yield: [4, 6], again: 48, picks: 8 },
  banana: { seed: "seedBanana", hours: 192, yield: [6, 8], again: 48, picks: 4 },
  coconut: { seed: "seedCoconut", hours: 288, yield: [2, 4], again: 48, picks: 10 },
  ginger: { seed: "seedGinger", hours: 120, yield: [2, 4] },
  turmeric: { seed: "seedTurmeric", hours: 120, yield: [2, 4] },
  taro: { seed: "seedTaro", hours: 168, yield: [2, 4] },
  watermelon: { seed: "seedWatermelon", hours: 144, yield: [2, 2] },
};
export const CROP_IDS = Object.keys(CROPS) as CropId[];
export const STAGES = 5;
/**
 * How far through its hours a plant is when each stage begins: what was sown
 * shows for the first tenth of them, the sprout until three tenths, the
 * seedling until six, and the plant half grown until it is ripe.
 */
export const STAGE_AT = [0, 0.1, 0.3, 0.6, 1];

/**
 * Where a plant is, so many hours after it was sown, having been picked so
 * many times: its stage (1 what was sown, 2 a sprout, 3 a seedling, 4 half
 * grown, 5 ripe), whether it can be picked, and whether it is spent. `since`
 * is the hours since it was last picked, for one that bears again.
 */
export function growth(id: CropId, hours: number, picked = 0, since = 0): { stage: 1 | 2 | 3 | 4 | 5; ripe: boolean; spent: boolean } {
  const c = CROPS[id], picks = c.picks ?? 1;
  if (picked >= picks) return { stage: 5, ripe: false, spent: true };
  if (picked > 0) {
    const ripe = since >= (c.again ?? Infinity);
    return { stage: ripe ? 5 : 4, ripe, spent: false };
  }
  if (hours >= c.hours) return { stage: 5, ripe: true, spent: false };
  const part = Math.max(0, hours) / c.hours;
  return { stage: part < STAGE_AT[1] ? 1 : part < STAGE_AT[2] ? 2 : part < STAGE_AT[3] ? 3 : 4, ripe: false, spent: false };
}

/** What goes into the ground for each vegetable when it is not small seeds: big seeds, a bulb, a root, a cutting, a nut. It is what its plot shows first. */
const SOWN: Partial<Record<CropId, "SeedsBig" | "Bulb" | "Root" | "Cutting" | "Nut">> = {
  corn: "SeedsBig", pumpkin: "SeedsBig", cucumber: "SeedsBig", longBean: "SeedsBig", watermelon: "SeedsBig",
  scallion: "Bulb", garlic: "Bulb",
  sweetPotato: "Root", galangal: "Root", ginger: "Root", turmeric: "Root", taro: "Root",
  lemongrass: "Cutting", banana: "Cutting",
  mango: "Nut", coconut: "Nut",
};
/** The name of the picture of a plant at a stage of its growing: the first three are shared (what was sown, a sprout, a seedling), the last two are the vegetable's own. */
export const growIconOf = (crop: CropId, stage: number): string =>
  (stage <= 1 ? `plot${SOWN[crop] ?? "Seeds"}` : stage === 2 ? "plotSprout" : stage === 3 ? "plotSeedling" : `grow${crop[0].toUpperCase()}${crop.slice(1)}${stage === 4 ? "A" : "B"}`);

/* ── dishes ─────────────────────────────────────────────────────────────── */

export type BuffId = "calm" | "keen" | "lucky" | "hearty" | "green";
/**
 * What a meal leaves behind for a while (the owner: "อาหารยังเพิ่ม buff แล้วแต่
 * ชนิดอาหาร"): one at a time, the last eaten. `by` is how much, as each rule
 * that reads it understands it.
 */
export const BUFFS: Record<BuffId, { name: Line; about: Line; icon: string; by: number }> = {
  calm: { name: { th: "มือนิ่ง", en: "Steady hands" }, about: { th: "ช่วงปลอดภัยของสายเบ็ดกว้างขึ้น", en: "The safe stretch of the line is wider" }, icon: "buffCalm", by: 0.2 },
  keen: { name: { th: "ตาไว", en: "Keen eye" }, about: { th: "ตวัดเบ็ดได้จังหวะง่ายขึ้น", en: "The strike is easier to time" }, icon: "buffKeen", by: 0.5 },
  lucky: { name: { th: "โชคดี", en: "Lucky" }, about: { th: "ปลาหายากกินเบ็ดบ่อยขึ้น", en: "Rare fish bite more often" }, icon: "buffLucky", by: 0.5 },
  hearty: { name: { th: "อิ่มทน", en: "Hearty" }, about: { th: "ใช้ stamina น้อยลง", en: "Everything costs less stamina" }, icon: "buffHearty", by: 0.3 },
  green: { name: { th: "มือเย็น", en: "Green fingers" }, about: { th: "รดน้ำแล้วผักโตไวขึ้นอีก", en: "Watering speeds a plant more" }, icon: "buffGreen", by: 0.5 },
};
/** How long a meal's buff lasts, in hours. */
export const BUFF_HOURS = 3;

export type DishId =
  | "riceBox" | "oddDish" | "friedMinnow" | "grilledFish" | "grilledCorn" | "roastSweetPotato" | "stirKangkong" | "basilCatfish" | "tomYum" | "sourCurry" | "friedPerch" | "fishCake" | "spicyEel" | "grilledPrawn" | "steamedGoby" | "pumpkinSoup" | "shabu"
  | "somTam" | "grilledEggplant" | "tomKha" | "friedGourami" | "crabCurry" | "steamedSheatfish" | "friedFrog" | "laab" | "omelette" | "snailCurry" | "candiedPumpkin" | "friedRice"
  | "greenCurry" | "khanomJeen" | "hoMok" | "mangoStickyRice" | "bananaInCoconut" | "taroPudding" | "steamedCroaker" | "gingerFish" | "turmericFish" | "jungleCurry" | "megaLaab" | "watermelonSlices" | "khantoke" | "naamPrik"
  | "sushi" | "ramen" | "tempura" | "unadon" | "okonomiyaki" | "kimchi" | "bibimbap" | "tteokbokki" | "kimbap" | "pajeon" | "harGow" | "chowMein" | "springRoll" | "congee" | "mapoTofu"
  | "pizza" | "spaghetti" | "risotto" | "lasagna" | "minestrone" | "fishCurry" | "naan" | "biryani" | "samosa" | "lassi"
  | "dozyFish" | "rainbowFish" | "fishChips" | "ukha" | "thieboudienne" | "piranhaSoup" | "crawfishBoil" | "masgouf" | "salmonSteak" | "arapaimaRoast";
/** What a dish is cooked in: the first three, and the cookware of the later tiers. */
export type Cookware = "pot" | "pan" | "grill" | "mortar" | "steamer" | "cleaver" | "jar" | "wok" | "potBrass" | "stoveBig" | "panBrass" | "steamerBamboo" | "hotpot"
  | "rollingPin" | "sushiMat" | "stoneBowl" | "oven";

/**
 * A dish: the stamina a helping gives and the buff it leaves, and its recipe
 * (what goes in, in what, how many helpings come out, and how many cooks it
 * takes). The recipes are secrets the members find for themselves, one find
 * opening it for everybody ("เจอ 1 คน เท่ากับ ทุกคนรู้สูตร"), though only as a found
 * recipe is ever told: all of it but its last thing, which is told by its kind
 * (lib/town/hints); the uncle sells hints that tell as much. A dish with no
 * recipe is not cooked from one: the uncle sells the rice parcel, and the odd
 * dish is what comes of things that make nothing (lib/town/cooking).
 *
 * A dish of a later tier may need more than one piece of cookware (the owner,
 * 2026-10-03: "สูตรอาหารที่ต้องใช้มากกว่า 1 เครื่องมือ (ใช้หลายคนช่วยกันทำ)"): `in` lists
 * them all, each worked by a cook of its own, so `cooks` is never fewer than
 * they are.
 */
export interface Dish {
  stamina: number;
  buff?: BuffId;
  recipe?: { needs: Array<[ItemId, number]>; in: Cookware[]; serves: number; cooks: number };
}
export const DISHES: Record<DishId, Dish> = {
  riceBox: { stamina: 15 },
  oddDish: { stamina: 6 },
  friedMinnow: { stamina: 20, buff: "keen", recipe: { needs: [["minnow", 3], ["salt", 1]], in: ["pan"], serves: 2, cooks: 1 } },
  grilledFish: { stamina: 25, buff: "calm", recipe: { needs: [["tilapia", 1], ["salt", 2]], in: ["grill"], serves: 2, cooks: 1 } },
  grilledCorn: { stamina: 15, recipe: { needs: [["corn", 2]], in: ["grill"], serves: 2, cooks: 1 } },
  roastSweetPotato: { stamina: 18, recipe: { needs: [["sweetPotato", 2]], in: ["grill"], serves: 2, cooks: 1 } },
  stirKangkong: { stamina: 22, buff: "green", recipe: { needs: [["kangkong", 3], ["chili", 1], ["garlic", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  basilCatfish: { stamina: 35, buff: "hearty", recipe: { needs: [["catfish", 1], ["basil", 2], ["chili", 1], ["garlic", 1], ["rice", 2]], in: ["pan"], serves: 3, cooks: 1 } },
  tomYum: { stamina: 40, buff: "hearty", recipe: { needs: [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  sourCurry: { stamina: 32, buff: "calm", recipe: { needs: [["barb", 2], ["daikon", 1], ["cabbage", 1], ["chili", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  friedPerch: { stamina: 28, buff: "keen", recipe: { needs: [["perch", 2], ["garlic", 2], ["salt", 1]], in: ["pan"], serves: 2, cooks: 1 } },
  fishCake: { stamina: 38, buff: "calm", recipe: { needs: [["featherback", 1], ["basil", 1], ["chili", 1], ["salt", 1]], in: ["pan"], serves: 4, cooks: 1 } },
  spicyEel: { stamina: 40, buff: "hearty", recipe: { needs: [["eel", 1], ["basil", 2], ["chili", 2], ["garlic", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  grilledPrawn: { stamina: 30, buff: "lucky", recipe: { needs: [["prawn", 2], ["salt", 1]], in: ["grill"], serves: 2, cooks: 1 } },
  steamedGoby: { stamina: 45, buff: "lucky", recipe: { needs: [["goby", 1], ["scallion", 2], ["fishSauce", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  pumpkinSoup: { stamina: 28, buff: "green", recipe: { needs: [["pumpkin", 1], ["scallion", 1], ["salt", 1]], in: ["pot"], serves: 5, cooks: 1 } },
  shabu: { stamina: 50, buff: "lucky", recipe: { needs: [["cabbage", 1], ["carrot", 2], ["daikon", 1], ["corn", 1], ["scallion", 2], ["prawn", 2], ["pangasius", 1]], in: ["pot"], serves: 10, cooks: 3 } },
  // the second tier: new cookware, and the first dishes two cook together
  somTam: { stamina: 30, buff: "keen", recipe: { needs: [["papaya", 1], ["lime", 1], ["chili", 2], ["longBean", 1], ["tomato", 1], ["sugar", 1]], in: ["mortar"], serves: 3, cooks: 1 } },
  grilledEggplant: { stamina: 22, buff: "calm", recipe: { needs: [["eggplant", 2], ["fishSauce", 1]], in: ["grill"], serves: 2, cooks: 1 } },
  tomKha: { stamina: 42, buff: "hearty", recipe: { needs: [["sheatfish", 1], ["galangal", 1], ["lemongrass", 1], ["lime", 1], ["chili", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  friedGourami: { stamina: 26, recipe: { needs: [["gourami", 2], ["oil", 1], ["salt", 1]], in: ["wok"], serves: 2, cooks: 1 } },
  crabCurry: { stamina: 46, buff: "lucky", recipe: { needs: [["crab", 3], ["curryPaste", 1], ["longBean", 1], ["eggplant", 1]], in: ["mortar", "pot"], serves: 4, cooks: 2 } },
  steamedSheatfish: { stamina: 40, buff: "calm", recipe: { needs: [["sheatfish", 1], ["lime", 2], ["chili", 1], ["garlic", 1]], in: ["steamer"], serves: 3, cooks: 1 } },
  friedFrog: { stamina: 36, buff: "keen", recipe: { needs: [["frog", 2], ["garlic", 2], ["oil", 1]], in: ["wok"], serves: 2, cooks: 1 } },
  laab: { stamina: 44, buff: "hearty", recipe: { needs: [["bagrid", 1], ["lime", 1], ["chili", 1], ["scallion", 1], ["rice", 1]], in: ["cleaver", "mortar"], serves: 4, cooks: 2 } },
  omelette: { stamina: 20, recipe: { needs: [["egg", 2], ["oil", 1]], in: ["pan"], serves: 2, cooks: 1 } },
  snailCurry: { stamina: 40, buff: "green", recipe: { needs: [["snail", 6], ["curryPaste", 1], ["lemongrass", 1]], in: ["mortar", "pot"], serves: 4, cooks: 2 } },
  candiedPumpkin: { stamina: 28, buff: "green", recipe: { needs: [["pumpkin", 1], ["sugar", 2]], in: ["pot"], serves: 5, cooks: 1 } },
  friedRice: { stamina: 34, recipe: { needs: [["rice", 3], ["egg", 1], ["scallion", 1], ["oil", 1]], in: ["wok"], serves: 3, cooks: 1 } },
  // the third tier: three and four at their tools together, for the whole village
  greenCurry: { stamina: 48, buff: "calm", recipe: { needs: [["featherback", 1], ["curryPaste", 1], ["coconutMilk", 1], ["eggplant", 2], ["basil", 1]], in: ["mortar", "pot"], serves: 5, cooks: 2 } },
  khanomJeen: { stamina: 50, buff: "hearty", recipe: { needs: [["riceNoodle", 3], ["croaker", 1], ["curryPaste", 1], ["coconutMilk", 1], ["longBean", 1]], in: ["mortar", "pot", "steamer"], serves: 6, cooks: 3 } },
  hoMok: { stamina: 48, buff: "lucky", recipe: { needs: [["blackEar", 1], ["curryPaste", 1], ["coconutMilk", 1], ["bananaLeaf", 2], ["basil", 1]], in: ["mortar", "steamerBamboo"], serves: 4, cooks: 2 } },
  mangoStickyRice: { stamina: 44, buff: "green", recipe: { needs: [["mango", 2], ["stickyRice", 2], ["coconutMilk", 1], ["sugar", 1]], in: ["steamerBamboo", "pot"], serves: 4, cooks: 2 } },
  bananaInCoconut: { stamina: 32, buff: "calm", recipe: { needs: [["banana", 3], ["coconutMilk", 1], ["sugar", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  taroPudding: { stamina: 40, buff: "keen", recipe: { needs: [["taro", 1], ["flour", 1], ["coconutMilk", 1], ["sugar", 1]], in: ["panBrass", "pot"], serves: 6, cooks: 2 } },
  steamedCroaker: { stamina: 46, buff: "keen", recipe: { needs: [["croaker", 1], ["soy", 1], ["ginger", 1], ["scallion", 1]], in: ["steamer"], serves: 3, cooks: 1 } },
  gingerFish: { stamina: 45, buff: "hearty", recipe: { needs: [["blackEar", 1], ["ginger", 2], ["soy", 1], ["oil", 1]], in: ["wok"], serves: 4, cooks: 1 } },
  turmericFish: { stamina: 44, buff: "calm", recipe: { needs: [["spinyEel", 2], ["turmeric", 1], ["garlic", 2], ["oil", 1]], in: ["wok"], serves: 3, cooks: 1 } },
  jungleCurry: { stamina: 50, buff: "lucky", recipe: { needs: [["giantSnakehead", 1], ["curryPaste", 1], ["galangal", 1], ["lemongrass", 1], ["eggplant", 1], ["longBean", 1]], in: ["mortar", "potBrass"], serves: 6, cooks: 2 } },
  megaLaab: { stamina: 50, buff: "hearty", recipe: { needs: [["megaCatfish", 1], ["toastedRice", 1], ["lime", 3], ["chili", 3], ["scallion", 2]], in: ["cleaver", "mortar", "wok"], serves: 20, cooks: 3 } },
  watermelonSlices: { stamina: 24, recipe: { needs: [["watermelon", 1]], in: ["cleaver"], serves: 6, cooks: 1 } },
  khantoke: { stamina: 50, buff: "lucky", recipe: { needs: [["stickyRice", 3], ["goldenCarp", 1], ["curryPaste", 1], ["coconutMilk", 1], ["cucumber", 2], ["longBean", 2], ["pepper", 1]], in: ["hotpot", "steamerBamboo", "wok", "mortar"], serves: 20, cooks: 4 } },
  naamPrik: { stamina: 38, buff: "green", recipe: { needs: [["fermentedFish", 1], ["chili", 3], ["garlic", 1], ["lime", 1], ["cucumber", 1]], in: ["mortar"], serves: 4, cooks: 1 } },
  // Dishes of other countries (the owner, 2026-10-03: "ตอนนี้มีแต่สูตรอาหารไทย ช่วยเอาอาหารประเทศอื่นที่ดังๆ มาด้วย ซัก 5 ประเทศ ประเทสละ 5 menu จะเพิ่ม
  // อุปกรณ์ด้วยก็ได้"), made of what the village has: its fish, its vegetables, and four things more from the uncle
  // (seaweed, tofu, cheese, milk). Nearly half of them take two at their tools ("หลายๆเกมต้องใช้หลายคนในการเล่น"). The last
  // thing of each is the one a found recipe does not name (lib/town/hints).
  // Japan
  sushi: { stamina: 38, buff: "keen", recipe: { needs: [["tilapia", 1], ["rice", 2], ["sugar", 1], ["seaweed", 1]], in: ["cleaver", "sushiMat"], serves: 4, cooks: 2 } },
  ramen: { stamina: 46, buff: "hearty", recipe: { needs: [["noodle", 2], ["egg", 1], ["scallion", 1], ["soy", 1], ["driedFish", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  tempura: { stamina: 34, buff: "lucky", recipe: { needs: [["prawn", 2], ["flour", 1], ["oil", 1], ["egg", 1]], in: ["wok"], serves: 2, cooks: 1 } },
  unadon: { stamina: 48, buff: "hearty", recipe: { needs: [["eel", 1], ["rice", 2], ["sugar", 1], ["soy", 1]], in: ["grill"], serves: 2, cooks: 1 } },
  okonomiyaki: { stamina: 36, buff: "green", recipe: { needs: [["flour", 1], ["egg", 1], ["cabbage", 1], ["scallion", 1], ["prawn", 1]], in: ["pan"], serves: 3, cooks: 1 } },
  // Korea
  kimchi: { stamina: 20, buff: "hearty", recipe: { needs: [["cabbage", 2], ["chili", 2], ["garlic", 1], ["fishSauce", 1]], in: ["jar"], serves: 4, cooks: 1 } },
  bibimbap: { stamina: 44, buff: "hearty", recipe: { needs: [["rice", 2], ["egg", 1], ["carrot", 1], ["cucumber", 1], ["kangkong", 1], ["chili", 1]], in: ["wok", "stoneBowl"], serves: 4, cooks: 2 } },
  tteokbokki: { stamina: 36, buff: "keen", recipe: { needs: [["stickyRice", 2], ["chili", 2], ["scallion", 1], ["sugar", 1]], in: ["mortar", "pan"], serves: 3, cooks: 2 } },
  kimbap: { stamina: 32, buff: "calm", recipe: { needs: [["rice", 2], ["seaweed", 1], ["carrot", 1], ["cucumber", 1], ["egg", 1]], in: ["sushiMat"], serves: 3, cooks: 1 } },
  pajeon: { stamina: 28, recipe: { needs: [["flour", 1], ["egg", 1], ["oil", 1], ["scallion", 3]], in: ["pan"], serves: 2, cooks: 1 } },
  // China
  harGow: { stamina: 34, buff: "lucky", recipe: { needs: [["flour", 2], ["scallion", 1], ["prawn", 2]], in: ["rollingPin", "steamer"], serves: 4, cooks: 2 } },
  chowMein: { stamina: 40, buff: "keen", recipe: { needs: [["noodle", 2], ["cabbage", 1], ["carrot", 1], ["oil", 1], ["soy", 1]], in: ["wok"], serves: 3, cooks: 1 } },
  springRoll: { stamina: 26, recipe: { needs: [["flour", 1], ["cabbage", 1], ["oil", 1], ["carrot", 1]], in: ["rollingPin", "wok"], serves: 4, cooks: 2 } },
  congee: { stamina: 30, buff: "calm", recipe: { needs: [["rice", 2], ["egg", 1], ["scallion", 1], ["perch", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  mapoTofu: { stamina: 40, buff: "hearty", recipe: { needs: [["chili", 2], ["garlic", 1], ["scallion", 1], ["soy", 1], ["tofu", 2]], in: ["wok"], serves: 3, cooks: 1 } },
  // Italy
  pizza: { stamina: 46, buff: "lucky", recipe: { needs: [["flour", 2], ["tomato", 2], ["basil", 1], ["cheese", 1]], in: ["rollingPin", "oven"], serves: 6, cooks: 2 } },
  spaghetti: { stamina: 40, buff: "keen", recipe: { needs: [["noodle", 2], ["tomato", 2], ["oil", 1], ["prawn", 1], ["garlic", 1]], in: ["pot", "pan"], serves: 3, cooks: 2 } },
  risotto: { stamina: 38, buff: "calm", recipe: { needs: [["rice", 2], ["pumpkin", 1], ["garlic", 1], ["cheese", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  lasagna: { stamina: 48, buff: "hearty", recipe: { needs: [["noodle", 2], ["tomato", 2], ["cheese", 2], ["eggplant", 1]], in: ["oven", "pot"], serves: 6, cooks: 2 } },
  minestrone: { stamina: 30, buff: "green", recipe: { needs: [["tomato", 2], ["carrot", 1], ["cabbage", 1], ["longBean", 1], ["noodle", 1]], in: ["pot"], serves: 5, cooks: 1 } },
  // India
  fishCurry: { stamina: 46, buff: "hearty", recipe: { needs: [["catfish", 1], ["chili", 2], ["ginger", 1], ["turmeric", 1], ["coconutMilk", 1]], in: ["mortar", "pot"], serves: 4, cooks: 2 } },
  naan: { stamina: 26, recipe: { needs: [["flour", 2], ["garlic", 1], ["milk", 1]], in: ["rollingPin", "oven"], serves: 4, cooks: 2 } },
  biryani: { stamina: 44, buff: "calm", recipe: { needs: [["rice", 3], ["turmeric", 1], ["milk", 1], ["pepper", 1], ["pangasius", 1]], in: ["pot"], serves: 5, cooks: 1 } },
  samosa: { stamina: 28, buff: "green", recipe: { needs: [["flour", 1], ["chili", 1], ["oil", 1], ["sweetPotato", 1]], in: ["rollingPin", "wok"], serves: 4, cooks: 2 } },
  lassi: { stamina: 24, buff: "lucky", recipe: { needs: [["mango", 1], ["sugar", 1], ["milk", 1]], in: ["mortar"], serves: 3, cooks: 1 } },
  // What the twenty fish of 2026-10-05 are eaten as. Two are eaten as they come up, with no recipe (like the rice
  // parcel, they are in no bowl): the one that bites for the tired gives a little stamina back, and the one that
  // comes after the rain leaves its luck.
  dozyFish: { stamina: 12 },
  rainbowFish: { stamina: 5, buff: "lucky" },
  // Eight are cooked, each the dish of the country its fish is from, in the early game's own cookware. Where the
  // dish's name does not give the fish away, the fish is its last thing: the one a found recipe does not name.
  fishChips: { stamina: 30, buff: "hearty", recipe: { needs: [["salt", 1], ["popotoFish", 2]], in: ["pan"], serves: 4, cooks: 1 } },
  ukha: { stamina: 32, buff: "calm", recipe: { needs: [["carrot", 2], ["scallion", 1], ["salt", 1], ["pike", 1]], in: ["pot"], serves: 4, cooks: 1 } },
  thieboudienne: { stamina: 36, buff: "green", recipe: { needs: [["rice", 3], ["cabbage", 1], ["carrot", 1], ["nilePerch", 1]], in: ["pot"], serves: 5, cooks: 1 } },
  piranhaSoup: { stamina: 30, buff: "keen", recipe: { needs: [["piranha", 2], ["chili", 2], ["scallion", 1]], in: ["pot"], serves: 3, cooks: 1 } },
  crawfishBoil: { stamina: 36, buff: "lucky", recipe: { needs: [["crayfish", 5], ["salt", 2], ["chili", 2], ["corn", 2]], in: ["pot"], serves: 8, cooks: 2 } },
  masgouf: { stamina: 28, buff: "calm", recipe: { needs: [["salt", 2], ["scallion", 2], ["carp", 1]], in: ["grill"], serves: 3, cooks: 1 } },
  salmonSteak: { stamina: 34, buff: "keen", recipe: { needs: [["salmon", 1], ["salt", 1], ["garlic", 1]], in: ["pan"], serves: 2, cooks: 1 } },
  arapaimaRoast: { stamina: 45, buff: "hearty", recipe: { needs: [["arapaima", 1], ["salt", 3], ["chili", 2]], in: ["grill"], serves: 10, cooks: 3 } },
};
export const DISH_IDS = Object.keys(DISHES) as DishId[];
export const isDish = (id: ItemId): id is DishId => id in DISHES;
/** What a helping is ladled into: it leaves the bag with the helping, and is back when the helping has been eaten (lib/town/cooking, lib/town/stamina). */
export const BOWL: ItemId = "bowl";
/** Whether a dish is eaten from a bowl: everything that comes out of a pot (what is cooked, and the odd dish). What the uncle sells ready comes wrapped. */
export const inBowl = (id: DishId): boolean => id === "oddDish" || !!DISHES[id].recipe;

/**
 * Things made from other things, at the cooking yard like a dish
 * (lib/town/cooking): what goes in, in what (nothing, for what is put together
 * by hand at a worktable), and how many come of it. They are found as recipes
 * are: nothing tells them. Among them is what the later dishes need that no
 * line of work brings on its own (a paste, a milk, a sauce), and what makes a
 * bag bigger. Like a dish, each needs nothing of a later tier than its own.
 */
export interface Make { needs: Array<[ItemId, number]>; in: Cookware[]; gives: number }
export const MAKES: Partial<Record<ItemId, Make>> = {
  // the early game: in a pot, or by hand
  fishSauce: { needs: [["minnow", 4], ["salt", 2]], in: ["pot"], gives: 2 },
  compost: { needs: [["hyacinth", 3]], in: [], gives: 2 },
  growFert: { needs: [["compost", 2], ["minnow", 2]], in: [], gives: 2 },
  guardFert: { needs: [["compost", 2], ["chili", 2], ["garlic", 1]], in: [], gives: 2 },
  // (of what the first day's shelf grows: it took garlic and basil at first, whose seeds the uncle has only once two
  // of his orders are filled, and a pest waits for nobody. The owner asked for its recipe to be sold, 2026-10-04,
  // with no order filled yet and forty-two plants in the ground.)
  pestCure: { needs: [["chili", 2], ["scallion", 2], ["salt", 1]], in: ["pot"], gives: 2 },
  basket: { needs: [["hyacinth", 6]], in: [], gives: 1 },
  // of three of the twenty fish of 2026-10-05, by hand: a hook of a gar's scale, a float of a moonfish's, and a bowl
  // of a mussel's shells (the uncle sells bowls too, five a round)
  hookScale: { needs: [["gar", 1]], in: [], gives: 1 },
  floatGlow: { needs: [["moonFish", 1]], in: [], gives: 1 },
  bowl: { needs: [["mussel", 2]], in: [], gives: 1 },
  // the second tier
  driedFish: { needs: [["barb", 2], ["salt", 1]], in: ["grill"], gives: 2 },
  saltedFish: { needs: [["tilapia", 1], ["salt", 3]], in: ["jar"], gives: 2 },
  curryPaste: { needs: [["chili", 3], ["garlic", 2], ["lemongrass", 1], ["galangal", 1]], in: ["mortar"], gives: 2 },
  pickle: { needs: [["cabbage", 1], ["salt", 2]], in: ["jar"], gives: 2 },
  charcoal: { needs: [["driftwood", 2]], in: ["grill"], gives: 4 },
  rope: { needs: [["hyacinth", 4]], in: [], gives: 1 },
  krabung: { needs: [["hyacinth", 8], ["rope", 1]], in: [], gives: 1 },
  noodle: { needs: [["flour", 2], ["egg", 1]], in: ["rollingPin"], gives: 3 },
  // the third tier
  coconutMilk: { needs: [["coconut", 1]], in: ["mortar"], gives: 2 },
  fermentedFish: { needs: [["gourami", 2], ["salt", 2], ["toastedRice", 1]], in: ["jar"], gives: 2 },
  shrimpPaste: { needs: [["shrimpLive", 5], ["salt", 2]], in: ["jar"], gives: 1 },
  driedChili: { needs: [["chili", 4]], in: ["grill"], gives: 3 },
  riceNoodle: { needs: [["flour", 2]], in: ["pot"], gives: 3 },
  toastedRice: { needs: [["rice", 2]], in: ["wok"], gives: 2 },
  yoke: { needs: [["driftwood", 2], ["rope", 2], ["basket", 2]], in: [], gives: 1 },
};
export const MAKE_IDS = Object.keys(MAKES) as ItemId[];
/**
 * What is cooked or made of the twenty fish that came on 2026-10-05, after the game had opened. Two things are kept
 * as they were for the rest: the uncle's hints of these are sold after the others of their tier (lib/town/hints),
 * and he does not ask for them in an order (lib/town/orders).
 */
export const LATER_MADE: ItemId[] = ["fishChips", "ukha", "thieboudienne", "piranhaSoup", "crawfishBoil", "masgouf", "salmonSteak", "arapaimaRoast", "hookScale", "floatGlow", "bowl"];
