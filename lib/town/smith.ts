import type { Line } from "./talk";

/**
 * What the blacksmith says (to come; the owner, 2026-10-08: a third popoto
 * keeping shop, who will smelt ore, forge tools and set gems). A tap on him
 * opens a talk like the uncle's and the banker's (lib/town/talk,
 * components/town/TownTalk): his large portrait, his name, a greeting for
 * the hour and the next of his three short conversations, in turn.
 *
 * His forge does nothing yet, so the lines say what he will do and that it is
 * not open. No numbers are said, and nothing is offered.
 *
 * Kept apart from lib/town/talk because he is in `next dev` only for now: a
 * production build asks for none of this. Pure, so the lines can be checked.
 */

/** Who is speaking: the name over the box, what he does, and his portrait in the scenery (quiet, then talking). */
export const SMITH_WHO: { name: Line; job: Line; art: [quiet: string, talking: string] } = {
  name: { th: "ช่างตีเหล็ก", en: "The Blacksmith" },
  job: { th: "หลอมแร่ ตีเครื่องมือ ฝังอัญมณี", en: "Ore, tools and gems" },
  art: ["tk_smith", "tk_smith_o"],
};

/** How he greets, by the hour in Bangkok: morning, afternoon, evening, late at night. */
const HELLO: [Line, Line, Line, Line] = [
  { th: "อ้าว มาแต่เช้าเลย! เตายังไม่ทันร้อนดีเลยนะ", en: "Oh, an early one! The furnace has hardly warmed up yet." },
  { th: "ว่าไง! ยืนห่างเตาหน่อยนะ บ่ายแบบนี้มันร้อน", en: "Hello there! Stand back from the furnace a bit. It's a hot one this afternoon." },
  { th: "เย็นแล้วเหรอ ไฟในเตากำลังสวยเลย มาดูก่อนสิ", en: "Evening already? The fire's at its prettiest now. Come and have a look." },
  { th: "ดึกป่านนี้แล้ว เสียงค้อนข้าทำให้นอนไม่หลับสินะ ขอโทษที", en: "Up this late? My hammer kept you awake, I suppose. Sorry about that." },
];
/** The greeting for an hour of the day (0–23, Bangkok). */
export function smithHello(hour: number): Line {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return HELLO[h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3];
}

/** His conversations, said in turn: smelting ore, forging tools, setting gems. Each ends with the forge not being open yet. */
export const SMITH_TALKS: Line[][] = [
  [
    { th: "แร่ที่ขุดได้จากเขาน่ะ เอามาให้ข้าได้เลย ข้าจะหลอมให้เป็นแท่งโลหะ", en: "Bring me the ore you dig out of the mountain. I'll smelt it down into bars." },
    { th: "หลอมแร่ต้องใช้ถ่านกับเวลา ใจร้อนไม่ได้นะ", en: "Smelting takes charcoal and time. There's no rushing it." },
    { th: "แต่เตาข้ายังไม่เปิดรับงาน รอให้ไฟแรงพอก่อน แล้วข้าจะบอก", en: "But my forge isn't open for work yet. I'll tell you when the fire is hot enough." },
  ],
  [
    { th: "ขวาน อีเต้อ จอบ ของพวกนี้ข้าตีให้ได้ ดีกว่าของที่วางขายทั่วไปด้วย", en: "Axes, pickaxes, hoes: I can forge them all, and better than what's on any shelf." },
    { th: "เอาแท่งโลหะกับไม้ดีๆ มา ข้าจะตีให้เป็นเครื่องมือที่ถนัดมือ", en: "Bring bars and good timber, and I'll hammer you a tool that fits your hand." },
    { th: "ตอนนี้ยังไม่เปิดรับงานนะ ทั่งเพิ่งตั้ง เตาเพิ่งก่อ ใจเย็นๆ", en: "Not open for orders yet, mind. The anvil's only just set and the furnace only just built." },
  ],
  [
    { th: "ในถ้ำลึกๆ มีอัญมณีฝังอยู่ในหิน ถ้าเจอก็เก็บมาเถอะ", en: "Deep in the cave there are gems in the rock. If you find one, bring it along." },
    { th: "ข้าฝังอัญมณีลงในเครื่องมือได้ ของธรรมดาจะกลายเป็นของวิเศษ", en: "I can set a gem into a tool. It turns a plain thing into something special." },
    { th: "งานละเอียดแบบนี้ต้องรอเตาเปิดก่อน ยังไม่เปิดนะ ไว้เปิดเมื่อไรจะตีระฆังเรียก", en: "Fine work like that waits for the forge to open. It isn't open yet: I'll ring the bell when it is." },
  ],
];

/** What he asks, where his forge is open: said before what one came for is chosen (as the uncle's and the banker's ASK). */
export const SMITH_ASK: Line = { th: "วันนี้จะให้ข้าทำอะไรให้ล่ะ", en: "What shall I do for you today?" };
/** The lines of a talk at an open forge: the greeting for the hour, then what he asks. */
export const smithAsk = (hour: number): Line[] => [smithHello(hour), SMITH_ASK];
/** What he says while whoever keeps the game has no smith for me (the database has not had his file, or his forge is not yet open): one line, whatever the hour, and no screen. */
export const SMITH_CLOSED: Line = { th: "ช่างยังจัดร้านไม่เสร็จ อีกไม่นานจะเปิดเตา", en: "The smith is still setting up shop. The forge opens soon." };

/** The lines of one talk: the greeting for the hour, then his conversation number `turn` (they go round). */
export function smithTalk(hour: number, turn: number): Line[] {
  const n = ((Math.floor(turn) % SMITH_TALKS.length) + SMITH_TALKS.length) % SMITH_TALKS.length;
  return [smithHello(hour), ...SMITH_TALKS[n]];
}
