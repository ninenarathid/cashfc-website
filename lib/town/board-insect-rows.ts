import type { Bug } from "./insects";
import type { Item } from "./items";
import type { Place } from "./world";

/**
 * The twenty-one insects of the two new boards (lib/town/board-insects has the boards, their spots and their rules): what
 * lib/town/items, lib/town/insects and the families' lists take of them, kept apart so that those may import it with
 * nothing of the maps' coming with it.
 */
type Family = "pollinator" | "predator" | "decomposer";
export type Tree = "cherry" | "cedar" | "oak";
export interface Row {
  id: string; th: string; en: string; family: Family; board: "roll" | "shake";
  place?: Place; trees?: Tree[]; hours: Array<[number, number]>; rare?: boolean; pays: number;
  /** The time icon of its card and its pollinator's sky. */
  time: "sun" | "moon" | "mist";
  look: [string, string];
}
const R = <const T extends string>(r: Omit<Row, "id"> & { id: T }) => r;
/** The twenty-one, the rolls' twelve by place and the shake's nine, in the order of the day. */
export const BOARD_ROWS = [
  R({ id: "crimsonRollerWeevil", th: "ด้วงม้วนใบแดงชาด", en: "Crimson roller weevil", family: "decomposer", board: "roll", place: "town", hours: [[5, 13]], pays: 3, time: "sun", look: ["ด้วงงวงตัวกลมสีแดงสดเป็นมัน จมูกสั้นสีดำ", "A round glossy crimson weevil with a short black snout"] }),
  R({ id: "giraffeNeckWeevil", th: "ด้วงคอยีราฟ", en: "Giraffe-neck weevil", family: "decomposer", board: "roll", place: "forest", hours: [[7, 16]], pays: 5, time: "sun", look: ["ด้วงงวงคอยาวเรียวสีดำ ปีกแข็งสีแดงสด", "A weevil with a very long thin black neck and bright red wing cases"] }),
  R({ id: "jadeRollerWeevil", th: "ด้วงม้วนใบหยก", en: "Jade roller weevil", family: "decomposer", board: "roll", place: "town", hours: [[11, 19]], pays: 3, time: "sun", look: ["ด้วงงวงตัวเล็กสีเขียวหยกเป็นมัน มีเส้นทองพาดหลัง", "A small glossy jade-green weevil with a golden line down its back"] }),
  R({ id: "hazelCigarWeevil", th: "ด้วงงวงซิการ์", en: "Hazel cigar weevil", family: "decomposer", board: "roll", place: "forest", hours: [[13, 19]], pays: 4, time: "sun", look: ["ด้วงงวงสีน้ำตาลหม่น งวงยาวโค้งเท่าลำตัว", "A dull brown weevil whose curved snout is as long as its body"] }),
  R({ id: "amberLeafroller", th: "มอธม้วนใบอำพัน", en: "Amber leafroller", family: "pollinator", board: "roll", place: "town", hours: [[16, 23]], pays: 3, time: "moon", look: ["มอธตัวเล็กสีส้มอำพัน มีแถบน้ำตาลพาดปีก", "A small amber moth with two brown bands across its wings"] }),
  R({ id: "rosefoldMoth", th: "มอธพับกุหลาบ", en: "Rosefold moth", family: "pollinator", board: "roll", place: "town", hours: [[16, 23]], pays: 4, time: "moon", look: ["มอธปีกสีชมพูกุหลาบขอบครีม ตัวฟูสีครีม", "A rose-pink moth with cream-edged wings and a fluffy cream body"] }),
  R({ id: "silverfoldMoth", th: "มอธพับเงิน", en: "Silverfold moth", family: "pollinator", board: "roll", place: "town", hours: [[19, 24], [0, 3]], pays: 3, time: "moon", look: ["มอธปีกสีเทาเงิน มีลายเส้นคลื่นจาง", "A silver-grey moth marked with pale wavy lines"] }),
  R({ id: "copperfoldMoth", th: "มอธพับทองแดง", en: "Copperfold moth", family: "pollinator", board: "roll", place: "forest", hours: [[19, 24], [0, 3]], pays: 4, time: "moon", look: ["มอธปีกสีทองแดงเป็นเงา มีจุดเข้มบนปีกหน้า", "A shiny copper moth with a dark spot on each forewing"] }),
  R({ id: "inkspotLeaftier", th: "มอธผูกใบจุดหมึก", en: "Inkspot leaftier", family: "pollinator", board: "roll", place: "town", hours: [[23, 24], [0, 5]], pays: 5, time: "moon", look: ["มอธสีขาวครีม มีจุดดำเหมือนหยดหมึกทั่วปีก", "A cream-white moth scattered with ink-black spots"] }),
  R({ id: "lanternfoldMoth", th: "มอธพับโคมไฟ", en: "Lanternfold moth", family: "pollinator", board: "roll", place: "forest", hours: [[23, 24], [0, 7]], pays: 5, time: "moon", look: ["มอธปีกน้ำตาลเข้ม มีจุดกลมสีเหลืองนวลบนปีกหลังเหมือนโคม", "A deep brown moth with a round pale yellow spot on each hind wing like a lantern"] }),
  R({ id: "dewfoldMoth", th: "มอธพับน้ำค้าง", en: "Dewfold moth", family: "pollinator", board: "roll", place: "town", hours: [[3, 7]], rare: true, pays: 8, time: "mist", look: ["มอธปีกขาวเหมือนน้ำค้าง มีจุดฟ้าอ่อนเล็กๆ เหมือนหยดน้ำ", "A dew-white moth with tiny pale blue spots like drops of water"] }),
  R({ id: "mistrollWeevil", th: "ด้วงม้วนหมอก", en: "Mistroll weevil", family: "decomposer", board: "roll", place: "forest", hours: [[3, 7]], rare: true, pays: 8, time: "mist", look: ["ด้วงงวงสีเทาอ่อน มีผงขาวเกาะเหมือนหมอก", "A pale grey weevil dusted white like mist"] }),
  R({ id: "checkeredBarkBeetle", th: "ด้วงเปลือกไม้ลายตาราง", en: "Checkered bark beetle", family: "decomposer", board: "shake", hours: [[16, 21]], pays: 4, time: "sun", look: ["ด้วงตัวเล็กลายตารางขาวดำ", "A small bark beetle checkered black and white"] }),
  R({ id: "twigLacewing", th: "แมลงช้างกิ่งไม้", en: "Twig lacewing", family: "predator", board: "shake", hours: [[16, 21]], pays: 4, time: "sun", look: ["แมลงช้างตัวเรียวสีเขียวอ่อน ปีกใหญ่ลายเส้นเขียว ตาสีทอง", "A slim pale green lacewing with big green-veined wings and gold eyes"] }),
  R({ id: "blossomChafer", th: "ด้วงดอกซากุระ", en: "Blossom chafer", family: "pollinator", board: "shake", trees: ["cherry"], hours: [[16, 19]], pays: 5, time: "sun", look: ["ด้วงตัวกลมสีชมพูเงากับเขียวอ่อน มีกลีบซากุระติดหลัง", "A round shiny pink and pale green chafer with cherry petals on its back"] }),
  R({ id: "thornTreehopper", th: "เพลี้ยหนาม", en: "Thorn treehopper", family: "pollinator", board: "shake", hours: [[16, 23]], pays: 4, time: "sun", look: ["เพลี้ยตัวเล็กสีน้ำตาล หลังยกเป็นหนามแหลม", "A small brown treehopper whose back rises into a pointed thorn"] }),
  R({ id: "cedarLonghorn", th: "ด้วงหนวดยาวซีดาร์", en: "Cedar longhorn", family: "decomposer", board: "shake", trees: ["cedar"], hours: [[16, 23]], pays: 5, time: "sun", look: ["ด้วงตัวยาวสีน้ำตาลแดง หนวดยาวเป็นปล้องโค้งข้ามตัว", "A long red-brown beetle with long banded feelers curving over its body"] }),
  R({ id: "barkAssassinBug", th: "มวนเพชฌฆาตเปลือกไม้", en: "Bark assassin bug", family: "predator", board: "shake", hours: [[19, 24], [0, 1]], pays: 5, time: "moon", look: ["มวนสีน้ำตาลเข้ม หัวเรียว ปากงอโค้ง ขามีแถบส้ม", "A dark brown assassin bug with a narrow head, a curved beak and orange-banded legs"] }),
  R({ id: "mossStickInsect", th: "ตั๊กแตนกิ่งไม้มอส", en: "Moss stick insect", family: "decomposer", board: "shake", hours: [[19, 24], [0, 3]], pays: 5, time: "moon", look: ["ตั๊กแตนกิ่งไม้ตัวยาวเรียว มีมอสสีเขียวเกาะเป็นหย่อม", "A long thin stick insect patched with green moss"] }),
  R({ id: "lanternWeevil", th: "ด้วงงวงโคมไฟ", en: "Lantern weevil", family: "decomposer", board: "shake", hours: [[21, 24], [0, 3]], pays: 5, time: "moon", look: ["ด้วงงวงสีเข้ม มีจุดกลมสีเหลืองนวลบนหลังเหมือนโคม", "A dark weevil with a round pale yellow spot on its back like a lantern"] }),
  R({ id: "ghostBarkMantis", th: "ตั๊กแตนตำข้าวเปลือกไม้ผี", en: "Ghost bark mantis", family: "predator", board: "shake", hours: [[23, 24], [0, 3]], rare: true, pays: 6, time: "moon", look: ["ตั๊กแตนตำข้าวสีเทาซีด ลายเหมือนเปลือกไม้มีไลเคน", "A pale grey mantis patterned like lichen-covered bark"] }),
] as const;
export type BoardInsectId = (typeof BOARD_ROWS)[number]["id"];
export const ROWS = BOARD_ROWS as readonly Row[];
export const BOARD_IDS = ROWS.map((r) => r.id) as BoardInsectId[];
/** How a common one weighs beside a rare one out at the same hour. */
export const WEIGHT = { common: 3, rare: 1 };

/** As lib/town/insects has its insects: never at a haunt (no `at`), their hours for the book; one stamina at the take, never refused for want of it (lib/town/board-insects). */
export const BOARD_BUGS = Object.fromEntries(ROWS.map((r): [string, Bug] => [r.id, { habit: "look", at: [], weight: 0, n: [1, 1], cost: 1, size: 0.7, hours: r.hours }])) as Record<BoardInsectId, Bug>;
export const BOARD_INSECT_ITEMS = Object.fromEntries(ROWS.map((r): [string, Item] => [r.id, {
  kind: "bug", tier: r.rare ? 3 : 2, name: { th: r.th, en: r.en }, about: { th: r.look[0], en: r.look[1] }, stack: r.rare ? 10 : 20, pays: r.pays,
}])) as Record<BoardInsectId, Item>;
/** The families, as the garden, the insect house and the crossings read them. */
export const BOARD_FAMILY = (family: Family) => ROWS.filter((r) => r.family === family).map((r) => r.id as BoardInsectId);
export const BOARD_POLLINATOR_SKY = Object.fromEntries(ROWS.filter((r) => r.family === "pollinator").map((r) => [r.id, r.time])) as Record<string, "sun" | "moon" | "mist">;
export const boardRow = (id: string): Row | undefined => ROWS.find((r) => r.id === id);
