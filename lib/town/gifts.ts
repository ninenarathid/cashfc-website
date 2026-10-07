import { ALL_LINE_IDS, rankOf, type LineId } from "./lines";
import { dayOf, eased, mealOf } from "./stamina";
import type { Purse } from "./trade";

/**
 * What a rank of a line of work gives (the owner, 2026-10-06: "อยากทำให้มี progression และ ฉายา ได้ไอเทม เหมือนกับที่
 * ขนน้ำทำได้ด้วย"), and what somebody wears of it. Pure: no clock, no chance, no network.
 *
 * His rulings, of that day:
 * - a gift is **bound to whoever earned it** and is in no slot of the bag ("ผูกกับตัวทั้งหมด ไม่นับรวมใน ช่องเก็บของ");
 *   the well's yoke, cart and great yoke are the exception, things of the bag that are lent already, and stay the
 *   well's own book's to give (lib/town/well);
 * - **two charms at a time** ("ช่องเครื่องราง 2 ช่อง"), one familiar (none is built yet), changed as often as one
 *   likes ("อิสระ"). Twelve charms and two places: one chooses by what one is about to do;
 * - nothing says what a rank will give until it is reached: the page shows a gift only once it can be taken.
 *
 * The first round is the first rank of every line: six charms (the well's first is its yoke). The forest's was a
 * vine basket that made its games kinder until he asked for a light in its place (the basket's picture is still in
 * the icons' sheet, used by nothing). What each does is a
 * number of this file (`CHARMS`); where it is the database that judges (the strike's moment, the stamina of work in
 * somebody else's bed) the same number is in the catalog's row and the rule is written again there (v151).
 * **Every number here is mine, not the owner's.**
 */
export const CHARM_IDS = ["charmApron", "charmGloves", "charmFloat", "charmLamp", "charmNet", "charmHoe",
  // the later ranks' (the ladder laid out anew, 2026-10-07)
  "charmAnklet", "charmBell", "charmLine", "charmFirefly", "charmWind", "charmSickle", "charmRing", "charmCloak", "charmGuard"] as const;
export type CharmId = (typeof CHARM_IDS)[number] | (typeof MORE_CHARM_IDS)[number];
/**
 * The familiars: a creature that follows its member wherever they go, for everybody to see (the owner, 2026-10-06:
 * "ใส่ ภูติ หรือ สัตว์เดินตามได้ 1 ชนิด"; changed "อิสระ"). One at a time. It needs no hand: the hand stays free.
 */
export const FAMILIAR_IDS = ["famSquirrel", "famButterfly", "famGnome", "famOtter", "famPiglet", "famSprite", "famFrog", "famStag", "famMandrake"] as const;
export type FamiliarId = (typeof FAMILIAR_IDS)[number] | (typeof MORE_FAMILIAR_IDS)[number];
/**
 * The things: a gift that is neither worn nor follows. It takes no place: once had it works by itself, or is there to
 * be used (so many times to a day or a meal's hours, where it is counted: `USES`).
 */
export const THING_IDS = ["thingBasket", "thingSpoon", "thingSpice", "thingFlame", "thingRod", "thingOrb", "thingBait", "thingMap", "thingNectar", "thingFlute",
  "thingPouch", "thingHourglass", "thingDust", "thingFlask", "thingMoon"] as const;
export type ThingId = (typeof THING_IDS)[number] | (typeof MORE_THING_IDS)[number];
// ── gifts to come (woodcutting and mining, 2026-10-08) ── The lists above are the gifts every keeper of the game
// knows. A later line's gifts are in lists of their own, and are offered only where whoever keeps the game gives them
// (the keeper's `gives`), as every round of gifts has gone out.
export const MORE_CHARM_IDS = ["charmMinerLamp"] as const;
export const MORE_FAMILIAR_IDS = ["famBat"] as const;
export const MORE_THING_IDS = ["thingSack"] as const;
// ── end: gifts to come ──
export type GiftId = CharmId | FamiliarId | ThingId;
export type GiftKind = "charm" | "familiar" | "thing";

/** (`by`: a gift's number, where it has one and the two older tables below do not hold it: what it multiplies by, how many, how far) */
export interface Gift { id: GiftId; kind: GiftKind; line: LineId; rank: number; name: { th: string; en: string }; does: { th: string; en: string }; by?: number }

export const GIFTS: readonly Gift[] = [
  { id: "charmApron", kind: "charm", line: "kitchen", rank: 1, name: { th: "ผ้ากันเปื้อนต้องมนตร์", en: "Enchanted apron" },
    does: { th: "หม้อบอกเองว่าใส่ถูกไหม: ของที่ใส่เรืองเขียวถ้ายังไปเป็นสูตรจริงได้ เรืองแดงถ้าไม่มีสูตรไหนใช้แบบนี้", en: "The pot tells you: what you put in glows green while it can still become a real recipe, red when no recipe has it so" } },
  { id: "charmGloves", kind: "charm", line: "helpers", rank: 1, name: { th: "ถุงมือชาวสวนต้องมนตร์", en: "Enchanted gardener's gloves" },
    does: { th: "งานในแปลงของคนอื่นไม่เสียแรงเลย และรดน้ำแปลงคนอื่นได้ทั้งแถวด้วยการเทยาวครั้งเดียว เทพลาด ต้นท้ายแถวไม่ได้น้ำ", en: "Work in somebody else's bed takes no stamina at all; and a row of theirs is watered at one long pour: poured badly, the row's last plants get none" } },
  { id: "charmFloat", kind: "charm", line: "fishing", rank: 1, name: { th: "ทุ่นกระซิบ", en: "Whispering float" },
    does: { th: "พอลงเบ็ดจะรู้ว่าปลาอะไรกำลังมา มีวงนับถอยหลังถึงตอนกิน และทุ่นสว่างวาบตอนปลากินจริง", en: "Once the line is out you know what is coming, a ring runs down to the bite, and the float flashes at the true bite" } },
  { id: "charmLamp", kind: "charm", line: "forest", rank: 1, name: { th: "ตะเกียงผู้เดินป่า", en: "Forest walker's lamp" },
    does: { th: "ในป่าตอนมืด รอบตัวเราสว่างขึ้น และของที่เก็บได้ในวงแสงมีประกาย (เห็นเฉพาะจอเรา)", en: "In the forest's dark, a light about you, and what can be gathered in it glints (on your own screen)" } },
  { id: "charmNet", kind: "charm", line: "insects", rank: 1, name: { th: "สวิงใยเงิน", en: "Silver-web net" },
    does: { th: "เห็นแมลงทุกตัวที่ออกมาตอนนี้ทั้งแผนที่ มีประกายเงินบอกว่าอยู่ตรงไหน แม้ตัวที่ซ่อน (เห็นเฉพาะจอเรา)", en: "Every insect that is out on the map glints silver where it is, the hidden ones too (on your own screen)" } },
  { id: "charmHoe", kind: "charm", line: "farming", rank: 1, name: { th: "จอบต้องมนตร์", en: "Enchanted hoe" },
    does: { th: "จอบเดียวทั้งแถว: ถอนหญ้าหรือพรวนดินทั้งแถวของแปลงด้วยมินิเกมเดียว จังหวะไหนพลาด ช่องนั้นไม่เสร็จ", en: "A whole row at a swing: weed or till a bed's row in one game, a beat to a plot; a beat missed leaves its plot undone" } },
  // the second rank: the first familiars
  { id: "famSquirrel", kind: "familiar", line: "forest", rank: 2, name: { th: "กระรอกคู่ใจ", en: "A squirrel" },
    does: { th: "ของที่วางอยู่บนพื้นในป่า กระรอกวิ่งไปเก็บมาให้เองตอนเราเดินผ่าน ไม่เสียแรง มื้อละ 20 ครั้ง และตอนเขย่าต้นไม้ช่วยรับลูกไม้ที่เราพลาดให้ ต้นละ 2 ลูก", en: "It runs to fetch what lies on the forest's ground as you walk past, for no stamina, twenty times to a meal's hours; and when a tree is shaken it catches two of the fruit you miss" } },
  { id: "famButterfly", kind: "familiar", line: "insects", rank: 2, name: { th: "ผีเสื้อนำโชค", en: "A lucky butterfly" },
    does: { th: "แมลงรู้ตัวช้าลงมาก ระยะที่มันจะตกใจหนีเหลือครึ่งเดียว แต่ถ้าเข้าหาผิดวิธีมันก็ยังหนีอยู่ดี", en: "Insects are far slower to know of you: the distance at which one startles is halved; come at it the wrong way and it flees all the same" } },
  { id: "famGnome", kind: "familiar", line: "farming", rank: 2, name: { th: "โนมสวน", en: "A garden gnome" },
    does: { th: "โนมรดน้ำให้ทั้งแปลงของเราในครั้งเดียว ไม่ใช้น้ำในบัว ไม่เสียแรง แปลงละครั้งทุกชั่วโมงครึ่ง", en: "It waters a whole bed of yours at once, with no water out of the can and for no stamina, a bed once in an hour and a half" } },

  // ── The rest of ranks 1 to 6, as the ladder was laid out anew (the owner, 2026-10-07: nearly OP, each rank more than
  // the last, and no power that takes failing away). DECLARED HERE SO THAT EACH LINE CAN BE BUILT APART: a gift below
  // does nothing until its line's code reads it, and no member is offered it until the database's catalog has it
  // (the keeper's `gives`). What each is to do is in its words; the plan's page has the whole table. ──
  // the kitchen
  { id: "thingBasket", kind: "thing", line: "kitchen", rank: 2, by: 12, name: { th: "ตะกร้ามิติ", en: "Dimension basket" },
    does: { th: "กระเป๋าอาหารของเราเอง เก็บอาหารได้ 12 ที่ คละชนิดได้ ไม่กินช่องกระเป๋า และกินจากตะกร้าได้เลย", en: "A food pocket of your own: twelve helpings of any dishes, in no slot of the bag, and eaten straight from it" } },
  { id: "thingSpoon", kind: "thing", line: "kitchen", rank: 3, name: { th: "ช้อนกระซิบรส", en: "Whispering spoon" },
    does: { th: "บอกวัตถุดิบชิ้นลับของสูตรที่กำลังทำ วันละ 3 ครั้ง", en: "Tells the secret thing of the recipe you are making, three times a day" } },
  { id: "famSprite", kind: "familiar", line: "kitchen", rank: 4, by: 1, name: { th: "ภูตเตาไฟตัวน้อย", en: "A little hearth sprite" },
    does: { th: "สูตรที่เคยทำแล้ว ทำเสร็จทันทีไม่ต้องเล่นมินิเกม ได้เต็มจำนวนและเพิ่มอีก 1 ที่ มื้อละ 3 หม้อ", en: "A recipe you have made before is done at once with no game, its full helpings and one more, three pots to a meal's hours" } },
  { id: "thingSpice", kind: "thing", line: "kitchen", rank: 5, by: 4, name: { th: "เครื่องเทศดาวตก", en: "Stardust spice" },
    does: { th: "โรยบนถ้วยที่จะกิน บัฟของถ้วยนั้นขึ้นถึงขั้น 4 ทันที วันละครั้ง", en: "Sprinkled on a bowl you are about to eat: its buff goes to level 4 at once, once a day" } },
  { id: "thingFlame", kind: "thing", line: "kitchen", rank: 6, name: { th: "เปลวฟีนิกซ์ในขวด", en: "Phoenix flame in a bottle" },
    does: { th: "ตั้งเตาได้ทุกที่ และถ้าออกมาเป็นอาหารแปลก ได้วัตถุดิบคืนทั้งหมด วันละ 3 ครั้ง", en: "A stove anywhere; and an odd dish gives every ingredient back, three times a day" } },
  // the helpers
  { id: "charmAnklet", kind: "charm", line: "helpers", rank: 2, by: 2, name: { th: "กระพรวนภูตสวน", en: "Garden fae anklet" },
    does: { th: "ต้นของคนอื่นที่เรารดโตเพิ่ม 2 เท่าทันที รดต่อเนื่องครบ 20 ต้นเป็น 3 เท่า (เว้นเกิน 45 วินาทีนับใหม่ ไปเติมน้ำที่บ่อแล้วกลับมารดต่อได้)", en: "Another's plant you water grows twice as much at once; twenty in a row, three times (a gap over forty-five seconds begins again: time enough to fill the can at the well)" } },
  { id: "charmBell", kind: "charm", line: "helpers", rank: 3, by: 2, name: { th: "ระฆังคู่หู", en: "Duet bell" },
    does: { th: "รดน้ำแปลงเดียวกับเพื่อนห่างกันไม่เกิน 10 วินาที การรดของทั้งคู่นับ 2 เท่า และได้แรงคืนต้นละ 2", en: "Water the same bed as a friend within ten seconds of each other: both waterings count double, and each gets two stamina back a plant" } },
  { id: "charmRing", kind: "charm", line: "helpers", rank: 4, by: 30, name: { th: "แหวนแบ่งแรง", en: "Ring of shared strength" },
    does: { th: "ยกแรงให้เพื่อน 30 แต้ม ของเราลดแค่ครึ่งเดียว วันละ 3 ครั้ง", en: "Give a friend thirty stamina, yours falls by half of it, three times a day" } },
  { id: "thingDust", kind: "thing", line: "helpers", rank: 5, by: 12, name: { th: "ผงภูตสวน", en: "Garden fae dust" },
    does: { th: "โรยบนต้นของคนอื่นที่โดนแมลง หยุดนับเวลาตายไว้ 12 ชั่วโมง (ไม่ได้รักษา) วันละ 5 ครั้ง", en: "On another's plant with pests: its dying clock stops twelve hours (no cure), five times a day" } },
  { id: "charmGuard", kind: "charm", line: "helpers", rank: 6, by: 2, name: { th: "ผ้าคลุมผู้พิทักษ์", en: "Guardian's cloak" },
    does: { th: "ตอนหมดแรง งานในแปลงของคนอื่นไม่ยากขึ้นเลย และมินิเกมของงานช่วยกว้างขึ้น 2 เท่า", en: "With no stamina, work in another's bed is no harder at all, and its games are twice as wide" } },
  // the deck
  { id: "famOtter", kind: "familiar", line: "fishing", rank: 2, by: 1, name: { th: "นากคู่ใจ", en: "An otter" },
    does: { th: "ปลาหลุดเมื่อไหร่ นากต้อนกลับมาให้สู้ใหม่ทันทีอีกหนึ่งรอบ ไม่เสียเหยื่อ มื้อละ 10 ครั้ง", en: "A fish that gets away is driven back for one more fight at once, no bait lost, ten times to a meal's hours" } },
  { id: "thingRod", kind: "thing", line: "fishing", rank: 3, by: 0.75, name: { th: "คันเบ็ดสองสาย", en: "Rod of two lines" },
    does: { th: "ตกได้ทีละคู่: ปลาอีกตัวติดสายที่สองมาด้วย ต้องสู้สองตัวพร้อมกัน ช่วงปลอดภัยแคบลง (ใช้เหยื่อ 2 ชิ้น)", en: "A pair at a time: a second fish on the second line, two fought at once in a narrower stretch (two baits)" } },
  { id: "charmLine", kind: "charm", line: "fishing", rank: 4, by: 3, name: { th: "สายเบ็ดใยมังกร", en: "Dragon-silk line" },
    does: { th: "สายตึงเกินหรือหย่อนเกินยังไม่หลุดทันที มีเวลาแก้ 3 วินาที ตัวละครั้ง แก้ไม่ทันปลาหลุดตามเดิม", en: "Too taut or too slack does not lose the fish at once: three seconds to mend it, once to a fight; not mended, it is lost as ever" } },
  { id: "thingOrb", kind: "thing", line: "fishing", rank: 5, by: 2, name: { th: "ลูกแก้วฟ้าจำลอง", en: "Sky orb" },
    does: { th: "เลือกฟ้าเอง (กลางคืน ฝน หรือจันทร์เต็มดวง) 30 นาที และช่วงนั้นปลากินเบ็ดเร็วขึ้น 2 เท่า วันละครั้ง เฉพาะเรา", en: "Choose the sky (night, rain or a full moon) for thirty minutes, and bites come twice as soon then; once a day, for you alone" } },
  { id: "thingBait", kind: "thing", line: "fishing", rank: 6, name: { th: "เหยื่อดาวตก", en: "Stardust bait" },
    does: { th: "ปลาที่กินเหยื่อนี้เป็นปลาหายากขึ้นไปแน่นอน (ยังต้องสู้ให้ได้เอง) วันละ 3 ชิ้น", en: "What takes this bait is a rare fish or better (still to be fought), three a day" } },
  // the forest
  { id: "famPiglet", kind: "familiar", line: "forest", rank: 3, by: 1, name: { th: "หมูน้อยนักดม", en: "A truffle piglet" },
    does: { th: "ขุดได้โดยไม่ต้องถือจอบ ของไม่ช้ำแม้ขุดพลาด และได้เพิ่ม 1 ชิ้นทุกหลุม มื้อละ 10 หลุม", en: "Dig with no hoe in hand, nothing bruised though you dig badly, and one more from every hole, ten holes to a meal's hours" } },
  { id: "charmFirefly", kind: "charm", line: "forest", rank: 4, name: { th: "โคมหิ่งห้อย", en: "Firefly lantern" },
    does: { th: "เห็นของทุกจุดในป่าตลอดเวลา ทั้งกลางวันและกลางคืน และเห็นจุดลับในป่าลึกที่คนอื่นมองไม่เห็น", en: "Everything in the forest shows for you at all hours, and the secret places of the deep woods that nobody else sees" } },
  { id: "thingMap", kind: "thing", line: "forest", rank: 5, name: { th: "ลายแทงของภูตป่า", en: "A sprite's treasure map" },
    does: { th: "ลายแทงหีบของภูต ขุดเจอได้ของหายากเฉพาะวันหรือม้วนสูตร วันละ 3 ใบ", en: "A map to a sprite's chest: dug up, a rare thing of the day or a scroll; three maps a day" } },
  { id: "famStag", kind: "familiar", line: "forest", rank: 6, by: 2, name: { th: "กวางมอส", en: "A moss stag" },
    does: { th: "ขี่ได้ทุกแผนที่ เดินเร็วขึ้น 2 เท่า และเก็บของได้จากบนหลังกวางในระยะ 2 ช่อง", en: "Ridden on every map, twice as fast, and things are gathered from its back within two tiles" } },
  // the insects
  { id: "thingNectar", kind: "thing", line: "insects", rank: 3, name: { th: "หยดน้ำหวานล่อแมลง", en: "A drop of nectar" },
    does: { th: "หยดลงพื้นตรงที่ยืน ภายใน 10 วินาทีมีแมลงบินมาหา ชนิดตามที่และเวลานั้น วันละ 10 หยด (ปุ่มอยู่มุมจอตอนถือสวิง)", en: "Dropped on the ground where you stand: within ten seconds an insect flies to it, of that place and hour; ten drops a day (its button is at the screen's corner while you hold a net)" } },
  { id: "charmWind", kind: "charm", line: "insects", rank: 4, name: { th: "สวิงสายลม", en: "Wind net" },
    does: { th: "สวิงลงทันทีไม่ต้องรอจังหวะ กดค้างเพื่อเล็ง ปล่อยตรงไหนลงตรงนั้น ยังพลาดได้ถ้าเล็งไม่โดน (ตอนหมดแรงเป็นสวิงธรรมดา)", en: "The net falls at once: press to aim, and it comes down where you let go; it still misses when it is aimed badly (with no stamina it is a plain net)" } },
  { id: "thingFlute", kind: "thing", line: "insects", rank: 5, by: 15, name: { th: "ขลุ่ยกล่อมแมลง", en: "Lulling flute" },
    does: { th: "แมลงทุกตัวบนจอหลับ 15 วินาที ใช้ได้ 5 นาทีครั้ง (ปุ่มอยู่มุมจอตอนถือสวิง)", en: "Every insect on the screen sleeps fifteen seconds; once in five minutes (its button is at the screen's corner while you hold a net)" } },
  { id: "charmCloak", kind: "charm", line: "insects", rank: 6, by: 3, name: { th: "ผ้าคลุมปีกผีเสื้อ", en: "Butterfly-wing cloak" },
    does: { th: "จับได้ทีละคู่: แมลงที่จับได้มีอีกตัวตามมา ต้องสวิงให้ทันใน 3 วินาที และแมลงหายากเฉพาะวันออกมาให้เราเห็นทุกวัน", en: "A pair at a time: an insect caught has another following, to be netted within three seconds; and the rare insects of a day show for you every day" } },
  // the farm
  { id: "thingPouch", kind: "thing", line: "farming", rank: 3, by: 5, name: { th: "ถุงเมล็ดร่ายมนตร์", en: "Spellbound seed pouch" },
    does: { th: "หว่านทั้งแถว 7 ช่องในครั้งเดียว ใช้เมล็ดแค่ 5 เมล็ด", en: "Sows a row's seven plots at once, for five seeds" } },
  { id: "charmSickle", kind: "charm", line: "farming", rank: 4, by: 1, name: { th: "เคียวจันทร์เสี้ยว", en: "Crescent sickle" },
    does: { th: "เก็บผักที่สุกทั้งแถวในครั้งเดียวด้วยเกมตวัดเคียว ได้ผลเพิ่มต้นละ 1 ต้นไหนตวัดพลาดต้นนั้นไม่ได้เพิ่ม (เฉพาะแปลงของเรา)", en: "Picks a whole ripe row at once by a game of the sickle, one more a plant; a plant swung at badly gives no more (your own beds)" } },
  { id: "thingHourglass", kind: "thing", line: "farming", rank: 5, by: 3, name: { th: "นาฬิกาทรายแห่งฤดู", en: "Hourglass of seasons" },
    does: { th: "แปลงของเราหนึ่งแปลงโตเร็วขึ้น 3 เท่า 3 ชั่วโมง วันละครั้ง", en: "One bed of yours grows three times as fast for three hours, once a day" } },
  { id: "famMandrake", kind: "familiar", line: "farming", rank: 6, by: 1, name: { th: "ต้นกล้าแมนเดรก", en: "A mandrake sprout" },
    does: { th: "ร้องเพลงให้ต้นไม้: ต้นที่เก็บแล้วออกผลให้เก็บได้อีก 1 รอบ ทุกชนิด วันละ 7 ต้น", en: "It sings to a plant: one that was picked bears once more, any crop; seven plants a day" } },
  // the well (its first three ranks give things of the bag, lib/town/well's own)
  { id: "thingFlask", kind: "thing", line: "well", rank: 4, by: 30, name: { th: "กระติกน้ำพุแห่งชีวิต", en: "Flask of living water" },
    does: { th: "รินให้เพื่อนดื่ม เพื่อนได้แรง +30 และเราได้ +10 (คนหนึ่งดื่มได้มื้อละครั้ง)", en: "Pour a friend a drink: thirty stamina to them and ten to you (a drinker once to a meal's hours)" } },
  { id: "famFrog", kind: "familiar", line: "well", rank: 5, by: 45, name: { th: "กบพยากรณ์ฝน", en: "A rain-oracle frog" },
    does: { th: "เห็นอากาศล่วงหน้า 45 นาที และตอนฝนตก ถังที่เราหาบเต็มเองโดยไม่ต้องเดินไปแม่น้ำ", en: "You see the sky forty-five minutes ahead; and in rain the buckets you carry fill by themselves, with no walk to the river" } },
  { id: "thingMoon", kind: "thing", line: "well", rank: 6, by: 3, name: { th: "ขวดแก้วจันทรา", en: "Moon flask" },
    does: { th: "เก็บน้ำค้าง น้ำฝน หรือน้ำจันทร์ไว้ได้ 3 ถัง เทตอนไหนก็ได้ และออกฤทธิ์ในบ่อนาน 3 เท่า", en: "Keeps three bucketfuls of dew, rain or moon water to pour when you like, and it works three times as long in the well" } },
];

// ── gifts to come: mining ── (what each does is read by lib/town/mining and the map; the sack's slots are lib/town/pouches')
export const MORE_GIFTS: readonly Gift[] = [
  { id: "charmMinerLamp", kind: "charm", line: "mining", rank: 1, by: 4, name: { th: "ตะเกียงคนเหมือง", en: "Miner's lamp" },
    does: { th: "ในถ้ำ รอบตัวเราสว่าง 4 ช่อง และคนที่อยู่ใกล้ก็เห็นด้วยแสงนี้", en: "In the cave, four tiles of light about you, and those near see by it" } },
  { id: "famBat", kind: "familiar", line: "mining", rank: 2, by: 1, name: { th: "ค้างคาวนำทาง", en: "A guiding bat" },
    does: { th: "พอลงถึงชั้นไหน แผนที่ย่อของชั้นนั้นเปิดทั้งชั้นทันที: โถง อุโมงค์ และที่ที่มีหินตั้งอยู่", en: "On entering a floor its whole small map is known at once: chambers, tunnels, and where rocks stand" } },
  { id: "thingSack", kind: "thing", line: "mining", rank: 3, by: 5, name: { th: "กระสอบคนเหมือง", en: "Miner's sack" },
    does: { th: "ช่องเก็บของเพิ่ม 5 ช่อง ใส่ได้เฉพาะของจากเหมือง: หิน เศษแร่ เศษพลอย แร่ก้อน และพลอย", en: "Five more slots that hold only the mine's things: stone, ore fragments, gem fragments, big ore and gems" } },
];
// ── end: mining ──
/** (gifts to come) Every gift there is: the ones every keeper knows, and the later lines'. */
export const ALL_GIFTS: readonly Gift[] = [...GIFTS, ...MORE_GIFTS];

/**
 * How many charms are worn at once, and what each does: the apron, the net and the hoe widen their games so many
 * times; the float lengthens the strike's moment so many times; the gloves leave so much of the cost of work in
 * somebody else's bed (farm work costs a point or two, so the half is kept exact over time: `gloved`); the lamp
 * lights so many tiles about its wearer in the forest's dark, on their own screen (the owner, 2026-10-06, of an early
 * gift of the forest's: "ของที่ช่วยให้ป่าสว่างเวลากลางคืน เอาแค่พอให้ตัวเองเล่นง่ายขึ้น": it finds nothing more, it only shows).
 */
// ── gifts: helpers ── (the gloves' number is what is left to pay of the cost of work in somebody else's bed: nothing, since the ladder was laid out anew; it was a half)
export const CHARMS = { slots: 2, charmApron: 1, charmGloves: 0, charmFloat: 1, charmLamp: 5, charmNet: 1, charmHoe: 1 } as const;
/**
 * What each familiar does: the squirrel catches so many of the fruit one misses at a tree; the butterfly leaves so
 * much of the distance at which an insect startles (lib/town/insects' stealthOf: a half, since 2026-10-07; it was a
 * step of softness added to a meal's, lib/town/forest-eye's softStep); the gnome waters a whole bed of its member's
 * at once, and a bed rests so many minutes between two of its rounds (lib/town/farm's gnomeWater: the owner,
 * 2026-10-07, in place of the weeding it began with; ninety minutes, where it was built with sixty: he had it
 * eased a little the morning it went out, "โนมรดน้ำ เนิฟลงเล็กน้อยได้"). The first two are the page's own to read: their
 * games are played in the browser. The gnome's round is a deed, judged by whoever keeps the game.
 */
export const FAMILIARS = { famSquirrel: 2, famButterfly: 0.5, famGnome: 90 } as const;
/**
 * What a gift does only so many times: to a day (from dawn, as the stamina's day is) or to a meal's hours. Counted in
 * the purse (`gifts.used`) by whoever keeps the game, so that the count is the same on every device a member plays on.
 */
export type Per = "day" | "meal" | "span";
/** (`ms`: of a count to a span of time that is neither, how long the span is: once in five minutes is one to a span of 300,000) */
export interface Use { n: number; per: Per; ms?: number }
export const USES: Partial<Record<GiftId, Use>> = {
  // (the later ranks': each line's own to tune)
  thingSpoon: { n: 3, per: "day" }, famSprite: { n: 3, per: "meal" }, thingSpice: { n: 1, per: "day" }, thingFlame: { n: 3, per: "day" },
  charmRing: { n: 3, per: "day" }, thingDust: { n: 5, per: "day" },
  famOtter: { n: 10, per: "meal" }, thingOrb: { n: 1, per: "day" }, thingBait: { n: 3, per: "day" },
  // (the squirrel's fetching: uncounted when it went out, twenty to a meal's hours on the owner's word the same morning, 2026-10-07: "ขอ 20 พอ")
  famSquirrel: { n: 20, per: "meal" }, famPiglet: { n: 10, per: "meal" }, thingMap: { n: 3, per: "day" },
  thingNectar: { n: 10, per: "day" }, thingFlute: { n: 1, per: "span", ms: 300_000 },
  thingHourglass: { n: 1, per: "day" }, famMandrake: { n: 7, per: "day" },
};
/**
 * The stretch of time a count is of, as one number: the day, the day and which meal's hours of it, or which span of
 * so many milliseconds the moment is in (spans are counted from the clock's beginning, so one ends for everybody at
 * the same moment: a wait of up to a span, never more).
 */
export const stretchOf = (rule: Use, now: number): number =>
  (rule.per === "day" ? dayOf(now) : rule.per === "meal" ? dayOf(now) * 3 + mealOf(now) : Math.floor(now / Math.max(1, rule.ms ?? 1)));

/** What a member has of the gifts: those taken, the charms worn of them, the familiar that follows, and what part of a point the gloves' half has left owing (lib/town/stamina's eased). */
export interface Gifts { had: GiftId[]; charms: CharmId[]; owed: number; familiar: FamiliarId | null; used: Record<string, { k: number; n: number }> }
export type GiftRefusal = "none" | "rank" | "had" | "slots" | "spent";

const isGift = (id: unknown): id is GiftId => typeof id === "string" && ALL_GIFTS.some((g) => g.id === id);
export const giftOf = (id: string): Gift | null => ALL_GIFTS.find((g) => g.id === id) ?? null;
/** The gift of a rank of a line, if that rank gives one. */
export const giftAt = (line: string, rank: number): Gift | null => ALL_GIFTS.find((g) => g.line === line && g.rank === rank) ?? null;

/** A purse's gifts, made sound: only gifts there are, each once; the charms worn are ones had, each once, no more than the places for them. */
export function giftsOf(purse: Pick<Purse, "gifts">): Gifts {
  const kept = purse.gifts, had: GiftId[] = [];
  for (const id of Array.isArray(kept?.had) ? kept.had : []) if (isGift(id) && !had.includes(id)) had.push(id);
  const charms: CharmId[] = [];
  for (const id of Array.isArray(kept?.charms) ? kept.charms : []) {
    if (charms.length < CHARMS.slots && isGift(id) && had.includes(id) && giftOf(id)!.kind === "charm" && !charms.includes(id as CharmId)) charms.push(id as CharmId);
  }
  const fam = kept?.familiar, familiar = isGift(fam) && had.includes(fam) && giftOf(fam)!.kind === "familiar" ? (fam as FamiliarId) : null;
  const owed = typeof kept?.owed === "number" && kept.owed > 0 && kept.owed < 1 ? kept.owed : 0;
  // (what was used is kept as it is, and read by `usedOf`, which believes only a count of the stretch it is asked about)
  const used = kept?.used && typeof kept.used === "object" && !Array.isArray(kept.used) ? kept.used : {};
  return { had, charms, owed, familiar, used };
}
/** The familiar that follows somebody now, if one does; and what it does for them: its number, or what does nothing. */
export const familiarOf = (purse: Pick<Purse, "gifts">): FamiliarId | null => giftsOf(purse).familiar;
export const famBy = (purse: Pick<Purse, "gifts">, id: FamiliarId, else_ = 0): number => (giftsOf(purse).familiar === id ? numberOf(id) : else_);
/** Whether somebody has a thing (a gift that takes no place): it works for them from then on. */
export const hasThing = (purse: Pick<Purse, "gifts">, id: ThingId): boolean => giftsOf(purse).had.includes(id);
/** Have this familiar follow me and no other (null: none follows): one I have. */
export function wearFamiliar<P extends Pick<Purse, "gifts">>(purse: P, id: string | null): { ok: true; purse: P } | { ok: false; why: GiftRefusal } {
  const mine = giftsOf(purse);
  if (id !== null && !(isGift(id) && mine.had.includes(id) && giftOf(id)!.kind === "familiar")) return { ok: false, why: "none" };
  return { ok: true, purse: { ...purse, gifts: { ...mine, familiar: id as FamiliarId | null } } };
}
/** Whether a gift works for somebody now: one they have; and a charm is worn, a familiar follows. */
export function works(purse: Pick<Purse, "gifts">, id: string): boolean {
  const mine = giftsOf(purse), g = giftOf(id);
  return !!g && mine.had.includes(g.id) && (g.kind === "charm" ? mine.charms.includes(g.id as CharmId) : g.kind === "familiar" ? mine.familiar === g.id : true);
}
/** How many times a gift that is counted has been used in the stretch `now` is in (none, of a count kept wrongly or of another stretch). */
export function usedOf(purse: Pick<Purse, "gifts">, id: string, now: number): number {
  const rule = isGift(id) ? USES[id] : undefined, u = giftsOf(purse).used[id] as { k?: unknown; n?: unknown } | undefined;
  if (!rule || !u || typeof u !== "object" || u.k !== stretchOf(rule, now) || typeof u.n !== "number" || !Number.isFinite(u.n)) return 0;
  return Math.max(0, Math.floor(u.n));
}
/** How many times more it may be used in this stretch (none, of a gift that is not counted). */
export const usesLeft = (purse: Pick<Purse, "gifts">, id: string, now: number): number => {
  const rule = isGift(id) ? USES[id] : undefined;
  return rule ? Math.max(0, rule.n - usedOf(purse, id, now)) : 0;
};
/** Use a counted gift once: it has to work for me now, and to have a time left in this stretch. */
export function useGift<P extends Pick<Purse, "gifts">>(purse: P, id: string, now: number): { ok: true; purse: P; left: number } | { ok: false; why: GiftRefusal } {
  const rule = isGift(id) ? USES[id] : undefined;
  if (!rule || !works(purse, id)) return { ok: false, why: "none" };
  const n = usedOf(purse, id, now);
  if (n >= rule.n) return { ok: false, why: "spent" };
  const mine = giftsOf(purse);
  return { ok: true, left: rule.n - n - 1, purse: { ...purse, gifts: { ...mine, used: { ...mine.used, [id]: { k: stretchOf(rule, now), n: n + 1 } } } } };
}
/** Whether somebody wears a charm now. */
export const wearing = (purse: Pick<Purse, "gifts">, id: CharmId): boolean => giftsOf(purse).charms.includes(id);
/** What a charm does for whoever wears it: its number, or what does nothing (`else_`: 1 for something multiplied, 0 for something added). */
export const charmBy = (purse: Pick<Purse, "gifts">, id: CharmId, else_ = 1): number => (wearing(purse, id) ? numberOf(id) : else_);

/**
 * Work in somebody else's bed with the gardener's gloves on: the purse after it, with half its stamina given back
 * (kept exact from one piece of work to the next: `owed`). Without the gloves, the purse as it is.
 */
export function gloved<P extends Purse>(before: Purse, after: P, now: number): P {
  if (!wearing(before, "charmGloves")) return after;
  const mine = giftsOf(after), did = eased(before, after, now, CHARMS.charmGloves, mine.owed);
  return { ...did.purse, gifts: { ...mine, owed: did.owed } };
}

/** The gifts somebody may take now: of ranks they have reached, not taken yet, the lines in their order and the lowest rank first. */
export function dueOf(points: Partial<Record<LineId, number>>, purse: Pick<Purse, "gifts">): Gift[] {
  const had = giftsOf(purse).had;
  return ALL_LINE_IDS.flatMap((line) => ALL_GIFTS.filter((g) => g.line === line && g.rank <= rankOf(line, points[line] ?? 0) && !had.includes(g.id)).sort((a, b) => a.rank - b.rank));
}
/** How many gifts there are that somebody has not got: all the page says of them. */
export const leftOf = (purse: Pick<Purse, "gifts">): number => GIFTS.length - giftsOf(purse).had.filter((id) => GIFTS.some((g) => g.id === id)).length;

/** Take the gift of a rank one has reached: once. It goes into no bag. */
export function takeGift<P extends Pick<Purse, "gifts">>(purse: P, points: Partial<Record<LineId, number>>, line: string, rank: number):
  { ok: true; purse: P; gift: GiftId } | { ok: false; why: GiftRefusal } {
  const gift = giftAt(line, rank);
  if (!gift) return { ok: false, why: "none" };
  if (rankOf(gift.line, points[gift.line] ?? 0) < gift.rank) return { ok: false, why: "rank" };
  const mine = giftsOf(purse);
  if (mine.had.includes(gift.id)) return { ok: false, why: "had" };
  return { ok: true, gift: gift.id, purse: { ...purse, gifts: { ...mine, had: [...mine.had, gift.id] } } };
}
/** Wear these charms and no others (none: take them all off): ones had, each once, no more than the places for them. */
export function wearCharms<P extends Pick<Purse, "gifts">>(purse: P, ids: readonly string[]): { ok: true; purse: P } | { ok: false; why: GiftRefusal } {
  const mine = giftsOf(purse);
  if (ids.length > CHARMS.slots || new Set(ids).size !== ids.length) return { ok: false, why: "slots" };
  if (!ids.every((id) => isGift(id) && mine.had.includes(id) && giftOf(id)!.kind === "charm")) return { ok: false, why: "none" };
  return { ok: true, purse: { ...purse, gifts: { ...mine, charms: ids as CharmId[] } } };
}

/** A gift's number: its own (`by`), or the older tables' for the first charms and familiars, or 1, which does nothing where a rule multiplies by it. */
export const numberOf = (id: string): number => {
  const g = giftOf(id);
  return g?.by ?? (CHARMS as Record<string, number>)[id] ?? (FAMILIARS as Record<string, number>)[id] ?? 1;
};
/**
 * The better somebody is at a line, the harder its good things are for them (the owner, 2026-10-07: the gifts are
 * near to too strong, so the game grows with whoever has them): from the fourth rank of a line, whatever of that line
 * is uncommon or better is `by` harder a rank (a fish fights so much harder, an insect is so much quicker to know of
 * one, a patch so much quicker to go dim …; each game says what "harder" is for it, and multiplies or divides by
 * this). What is common is as it is for everybody. 1 below the fourth rank.
 */
export const HARDER = { from: 4, by: 0.08 } as const;
export const harderAt = (rank: number): number => (rank < HARDER.from ? 1 : 1 + HARDER.by * (Math.min(10, Math.floor(rank)) - HARDER.from + 1));
/** …for the points somebody has on a line. */
export const harderFor = (line: LineId, points: number): number => harderAt(rankOf(line, points));

/** The catalog's row: what the database needs of the gifts to give and to judge them (the places for charms; of each gift its kind, which rank of which line gives it, and its number; what is counted, so many times to what; and how much harder a line's good things are from which rank). */
export const giftsRow = () => ({
  slots: CHARMS.slots,
  uses: USES,
  harder: HARDER,
  gifts: Object.fromEntries(GIFTS.map((g) => [g.id, { kind: g.kind, line: g.line, rank: g.rank, by: numberOf(g.id) }])),
});
/** (gifts to come) The same row with the later lines' gifts in it: what a database that gives them keeps. */
export const giftsRowAll = () => ({ ...giftsRow(), gifts: Object.fromEntries(ALL_GIFTS.map((g) => [g.id, { kind: g.kind, line: g.line, rank: g.rank, by: numberOf(g.id) }])) });
