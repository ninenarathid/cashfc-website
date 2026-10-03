import type { Keeper } from "./world";

/**
 * What the town's shopkeepers say (the owner, 2026-10-03: "ทำให้ NPC คุยได้ด้วย ไป
 * gen ภาพ NPC ภาพใหญ่ตอนคุย พร้อมกับบทพูดมา"). A tap on one opens a talk: its large
 * portrait, its name, and a few lines, one at a time.
 *
 * The stall and the exchange are not built yet, so nothing here does anything:
 * the lines say what each of them will do, the way the owner has settled it,
 * and that it is not open. No numbers are said (rates and limits live in the
 * database and change there). Each talk is a greeting for the hour and the
 * next of that speaker's conversations, in turn, so tapping again says
 * something new.
 *
 * Pure, so the lines can be checked: both languages, short enough for the box.
 */

export type Speaker = Keeper["id"];
export interface Line { th: string; en: string }

/** As long as a line may be, in either language: three rows of the talk's box on a phone. */
export const LINE_MAX = 110;

/** Who is speaking: the name over the box, what they do, and their portrait in the scenery (quiet, then talking). */
export const WHO: Record<Speaker, { name: Line; job: Line; art: [quiet: string, talking: string] }> = {
  uncle: {
    name: { th: "ลุงขายของ", en: "The Uncle" },
    job: { th: "เครื่องมือ เมล็ดพันธุ์ เหยื่อ", en: "Tools, seeds and bait" },
    art: ["tk_uncle", "tk_uncle_o"],
  },
  banker: {
    name: { th: "นายธนาคาร", en: "The Banker" },
    job: { th: "ธนาคาร Popoto", en: "The Popoto Bank" },
    art: ["tk_banker", "tk_banker_o"],
  },
};

/** How each greets, by the hour in Bangkok: morning, afternoon, evening, late at night. */
const HELLO: Record<Speaker, [Line, Line, Line, Line]> = {
  uncle: [
    { th: "อ้าว หลาน! ตื่นเช้าดีนี่ มาๆ", en: "Well, well! Up early, are we? Come on over." },
    { th: "อ้าว หลาน! แดดร้อนนะ เข้ามาในร่มก่อน", en: "Ah, there you are! Hot out. Step into the shade." },
    { th: "อ้าว หลาน! เย็นแล้ว กินข้าวหรือยัง", en: "Ah, there you are! Evening already. Have you eaten?" },
    { th: "อ้าว ดึกป่านนี้ยังไม่นอนอีกเหรอหลาน", en: "Still up at this hour, kiddo?" },
  ],
  banker: [
    { th: "อรุณสวัสดิ์ครับ ยินดีต้อนรับสู่ธนาคาร Popoto", en: "Good morning. Welcome to the Popoto Bank." },
    { th: "สวัสดีตอนบ่ายครับ ยินดีต้อนรับสู่ธนาคาร Popoto", en: "Good afternoon. Welcome to the Popoto Bank." },
    { th: "สวัสดีตอนเย็นครับ ยินดีต้อนรับสู่ธนาคาร Popoto", en: "Good evening. Welcome to the Popoto Bank." },
    { th: "ดึกแล้วนะครับ แต่ธนาคาร Popoto ยินดีต้อนรับเสมอ", en: "It is late, but the Popoto Bank is always glad to see you." },
  ],
};

/** The greeting for an hour of the day (0–23, Bangkok). */
export function hello(who: Speaker, hour: number): Line {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return HELLO[who][h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3];
}

/** Each speaker's conversations, said in turn. */
export const TALKS: Record<Speaker, Line[][]> = {
  uncle: [
    [
      { th: "ร้าน Popoto Shop ข้างหลังยังสร้างไม่เสร็จ ลุงเลยมาตั้งแผงขายหน้าร้านไปก่อน", en: "The Popoto Shop behind me isn't finished, so I've set my stall up out front for now." },
      { th: "ลุงจะมีคันเบ็ด เหยื่อ จอบ บัวรดน้ำ เมล็ดผัก แล้วก็เครื่องครัวให้เลือก", en: "I'll have rods, bait, hoes, watering cans, seeds, and pots and pans." },
      { th: "แต่ตอนนี้ของยังมาไม่ถึงเลย ไว้ของมาแล้วลุงจะเรียกนะ", en: "Nothing has arrived yet, mind. I'll give you a shout when it does." },
    ],
    [
      { th: "บอกไว้ก่อนนะ ของลุงมีจำกัด เติมวันละสองรอบ หมดแล้วต้องรอรอบหน้า", en: "Fair warning: my stock is limited. It's topped up twice a day; when it's gone, wait for the next round." },
      { th: "ส่วนของที่หลานเอามาขาย ลุงรับฝากไว้ก่อน ญาติลุงจะมารับไปขายวันละสองรอบ", en: "What you bring me to sell, I keep for my relatives. They come by twice a day and take it to market." },
      { th: "ขายได้เมื่อไรค่อยได้เงิน ไม่ได้ทันทีนะ ใจเย็นๆ", en: "You're paid once it's sold, not on the spot. Patience!" },
      { th: "เพราะงั้นคิดดีๆ ว่าจะขาย หรือเก็บไว้ทำอย่างอื่น ปลาตัวเดียวไปได้ตั้งหลายทาง", en: "So think it over: sell it, or keep it for something else. One fish can go a good many ways." },
    ],
    [
      { th: "ลานตกปลาที่ริมน้ำกำลังสร้างอยู่ พวก popoto ช่างเร่งกันใหญ่เลย", en: "They're building the fishing deck down by the river. The popoto crew is in a real hurry." },
      { th: "แปลงผักจะอยู่ทางตะวันออก พ้นจุดที่ซ่อมทางอยู่นั่นแหละ ทางเสร็จเมื่อไรก็เดินไปได้", en: "The farm will be out east, past the road works. Once the road is mended, you can walk there." },
      { th: "ลานทำอาหารก็กำลังก่อเตากันอยู่ เครื่องครัวมาซื้อที่ลุงได้ เมื่อของมานะ", en: "And they're laying the stoves for the cooking yard. You'll get your cookware from me, once it comes in." },
    ],
    [
      { th: "ไว้แผงเปิดแล้ว ลุงจะมีของที่อยากได้วันละสามอย่าง", en: "Once the stall opens, I'll be wanting three things a day." },
      { th: "ทั้งหมู่บ้านช่วยกันหามาให้ครบ ลุงก็จะมีของใหม่มาขาย", en: "If the whole village brings them in between you, I'll have something new to sell." },
      { th: "ช่วยๆ กันนะหลาน หมู่บ้านเราจะได้โตไวๆ", en: "Pull together, kiddo. That's how this village grows." },
    ],
  ],
  banker: [
    [
      { th: "popoto ที่เพื่อนๆ ส่งให้บนโปรไฟล์และรูปของคุณ นำมาแลกเป็น Popoto coin ได้ที่นี่ครับ", en: "The popoto friends have sent to your profile and your pictures can be changed into Popoto coins here." },
      { th: "ช่วงแรกแลกได้ขาเดียวก่อนนะครับ จาก popoto เป็น coin", en: "At first it goes one way only: popoto into coins." },
      { th: "ส่วนขากลับจะเปิดทีหลัง คนละเรทกันครับ", en: "The way back opens later, at a rate of its own." },
      { th: "เคาน์เตอร์ยังไม่เปิดทำการครับ ผมกำลังนับเหรียญอยู่ อีกไม่นานเจอกัน", en: "The counter is not open yet. I am still counting the coins. See you soon." },
    ],
    [
      { th: "ขอเรียนให้ทราบก่อนตัดสินใจครับ แลกแล้วจำนวน popoto ของคุณจะลดลงจริง", en: "A word before you decide: what you exchange really does come off your popoto count." },
      { th: "แต่ประวัติว่าใครส่งให้คุณยังอยู่ครบ ไม่หายไปไหนครับ", en: "The record of who sent them stays, every one of them." },
      { th: "Popoto coin หาได้จากการเล่นในเมืองอยู่แล้ว การแลกเป็นเพียงทางลัดเล็กๆ ครับ", en: "Popoto coins are earned by playing in town anyway. The exchange is only a small shortcut." },
    ],
    [
      { th: "Popoto coin ใช้ได้ในเมืองนี้ครับ กับลุงที่แผงข้างๆ เป็นต้น", en: "Popoto coins are spent here in town: with the uncle at the stall beside me, for one." },
      { th: "ไม่เกี่ยวกับ gil ในกระเป๋าของเว็บนะครับ สองอย่างนี้แยกกัน แลกข้ามกันไม่ได้", en: "They are not the gil in your wallet on the site. The two are kept apart, and neither buys the other." },
      { th: "ผมจะจดทุกเหรียญลงสมุดอย่างเรียบร้อยครับ วางใจได้", en: "I shall write every coin down in my ledger. You may rely on it." },
    ],
  ],
};

/** The lines of one talk: the greeting for the hour, then that speaker's conversation number `turn` (they go round). */
export function talkFor(who: Speaker, hour: number, turn: number): Line[] {
  const all = TALKS[who], n = ((Math.floor(turn) % all.length) + all.length) % all.length;
  return [hello(who, hour), ...all[n]];
}
