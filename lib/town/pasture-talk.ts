import type { Line } from "./talk";

/**
 * What Uncle Popoto says (docs/plans/animals/README.md: "การซื้อสัตว์มาเลี้ยงจะมี NPC ตัวใหม่ชื่อ ลุง popoto ขายสัตว์"): a
 * popoto in a farmer's straw hat at his stall by the pasture's gate. Like the uncle in town he greets by the hour, asks
 * what one came for, and chats in turn; his chats tell how the pasture works, never its numbers (they are the
 * stall's and the cards' to show). Pure, so the lines can be checked: both languages, short enough for the box.
 */
export const POPOTO_WHO = {
  name: { th: "ลุง Popoto", en: "Uncle Popoto" },
  job: { th: "ลูกสัตว์ อาหาร เครื่องมือ", en: "Young animals, feed and tools" },
} as const;

const HELLO: [Line, Line, Line, Line] = [
  { th: "อ้าว หลาน! ไก่ขันแล้ว มาดูลูกเจี๊ยบเกิดใหม่ไหม", en: "Morning, kiddo! The rooster's up. Come and see the new chicks?" },
  { th: "แดดแรงนะหลาน วัวยังหลบไปนอนใต้ร่มเลย", en: "Hot one, kiddo. Even the cows have gone to lie in the shade." },
  { th: "เย็นแล้ว ได้เวลาต้อนสัตว์เข้าคอกล่ะ", en: "Evening already. Time to bring them all in." },
  { th: "ชู่ว เบาๆ หน่อยหลาน สัตว์หลับกันหมดแล้ว", en: "Shh, quietly now, kiddo. They're all asleep." },
];
export function popotoHello(hour: number): Line {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return HELLO[h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3];
}
export const POPOTO_ASK: Line = { th: "วันนี้มาหาลุงเรื่องอะไรดี จะรับลูกสัตว์ หรือมาดูแลตัวที่มีอยู่", en: "What brings you, kiddo? A young one to take home, or the ones you have?" };
/** Asked by one who has no barn yet: a barn comes first. */
export const POPOTO_BARN: Line = { th: "อยากเลี้ยงสัตว์ต้องมีโรงก่อนนะหลาน มีโรงว่างให้เลือกอยู่ คนละหนึ่งโรง", en: "Animals need a barn first, kiddo. Pick a free one: one each." };
/** Said while no pasture is kept for me yet (whoever keeps the game has none): he is getting ready. */
export const POPOTO_SOON: Line[] = [
  { th: "ลุงกำลังสร้างโรงเลี้ยงสัตว์อยู่ อีกไม่นานเปิดให้เลี้ยงสัตว์ได้", en: "I'm still building the barns. You can keep animals here soon." },
  { th: "ไว้เปิดแล้ว มารับลูกเจี๊ยบไปเลี้ยงสักตัวนะหลาน", en: "When it opens, come and take a chick home." },
];
export const POPOTO_CHATS: Line[][] = [
  [
    { th: "จำไว้สามข้อนะหลาน ข้อแรก อาหารคือนาฬิกา รางว่างเมื่อไหร่ ทุกอย่างหยุดรอ", en: "Three things, kiddo. First: food is the clock. When the trough's empty, everything waits." },
    { th: "ข้อสอง ยิ่งสนิท ของยิ่งดี หัวใจเต็มสิบ เกรดก็ไปได้สุด", en: "Second: the closer you are, the better it gives. Ten hearts, and the grade goes right up." },
    { th: "ข้อสาม ฝีมือคือจำนวน รีดนม เก็บไข่ ตัดขน ทำพลาดก็ได้น้อยลง ไม่มีวันได้ศูนย์", en: "Third: your hands make the amount. Fumble the milking and you get less, never nothing." },
  ],
  [
    { th: "สัตว์ของหลาน หลานเก็บผลผลิตได้คนเดียวนะ", en: "Only you can collect from your own animals." },
    { th: "แต่เพื่อนที่หลานอนุญาต ช่วยให้อาหาร ลูบหัว ให้ขนมได้ แถมเขาได้แต้มผู้ช่วยด้วย", en: "But friends you allow can feed them, pet them and give treats, and they earn helpers' points for it." },
  ],
  [
    { th: "เช้าๆ ลองเปิดประตูโรงดูสิ สัตว์จะเดินออกไปกินหญ้า เดินเล่นถึงสวนผักเลย", en: "Open your barn door of a morning. They'll trot out to graze, right down to the vegetable garden." },
    { th: "ออกไปเที่ยวแล้วกินอาหารช้าลง แถมบางทีคาบของแปลกๆ กลับมาด้วยนะ", en: "Out there they eat slower, and now and then they bring back something odd." },
    { th: "ไก่กับเป็ดบางทีก็ไข่ทิ้งไว้ในทุ่ง ใครเห็นก็ได้ แต่เก็บได้แค่เจ้าของ", en: "Hens and ducks sometimes lay out in the grass. Anybody can see the eggs; only the owner can pick them up." },
  ],
  [
    { th: "รังผสมพันธุ์อยู่ในโรงของหลานเอง ตัวผู้กับตัวเมียชนิดเดียวกันกับของเซ่นหนึ่งอย่าง วางลงรัง", en: "The breeding nest is in your own barn: a male and a female of one kind and one offering, laid in it." },
    { th: "ของเซ่นแต่ละขั้นเป็นของคนละชนิด เมล็ดบ้าง แร่บ้าง ดอกไม้บ้าง ต้องลองเอาเอง", en: "Each step wants a different kind: a seed, a mineral, a flower. You find out by trying." },
    { th: "ได้ยินว่ามีพันธุ์แปลกๆ แบบในนิทานด้วยนะ ไก่เรืองแสง แกะสีรุ้ง ใครเจอก่อนได้จารึกชื่อในสมุด", en: "They say there are breeds out of the old stories: glowing hens, rainbow sheep. Whoever breeds one first has their name in the book." },
  ],
  [
    { th: "ของบางอย่างในทุ่งขึ้นเฉพาะตอนตีสามถึงเจ็ดโมงเช้านะ ใครตื่นเช้าได้เปรียบ", en: "Some things in the meadow only come up between three and seven in the morning. Early risers do well." },
    { th: "แต่ไม่ต้องห่วง ของเช้ามืดแค่ช่วยให้สะดวก ไม่มีอะไรต้องพึ่งมันอย่างเดียว", en: "Don't fret, though: the dawn things only make it easier. Nothing hangs on them alone." },
  ],
];
/** The lines of a chat at his stall: his chat number `turn` (they go round). */
export function popotoChat(turn: number): Line[] {
  return POPOTO_CHATS[((Math.floor(turn) % POPOTO_CHATS.length) + POPOTO_CHATS.length) % POPOTO_CHATS.length];
}
