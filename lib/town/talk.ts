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
      { th: "แปลงผักอยู่ทางตะวันออก เดินไปสุดทางก็ถึง แต่ยังไม่มีเครื่องมือก็ทำอะไรไม่ได้นะ", en: "The farm is out east, at the end of the path. Without tools there's nothing to do there yet, mind." },
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

/**
 * When the stall and the counter are open: what each asks after its greeting,
 * before what there is to choose from; what the uncle says instead when money
 * is waiting with him; and what each says to somebody who only stops to chat,
 * in turn. (Open today only as the browser's trial of them, in `next dev`:
 * lib/town/trial.)
 */
export const ASK: Record<Speaker, Line> = {
  uncle: { th: "ของมาถึงแล้วนะ วันนี้รับอะไรดีล่ะหลาน", en: "The goods are in. What'll it be today, kiddo?" },
  banker: { th: "วันนี้ให้ผมช่วยเรื่องอะไรดีครับ", en: "How may I help you today?" },
};
export const PAID: Line = { th: "ญาติลุงเอาเงินค่าของที่ฝากไว้มาให้แล้วนะ มารับไปได้เลย", en: "My relatives brought the money for what you left. Come and take it." };
export const CHATS: Record<Speaker, Line[][]> = {
  uncle: [
    [
      { th: "บอกไว้ก่อนนะ ของลุงมีจำกัด เติมวันละสองรอบ หมดแล้วต้องรอรอบหน้า", en: "Fair warning: my stock is limited. It's topped up twice a day; when it's gone, wait for the next round." },
      { th: "แล้วก็ซื้อได้คนละไม่กี่ชิ้นต่อรอบนะ จะได้เหลือถึงคนอื่นด้วย", en: "And only so many each, a round. That way there's some left for the others." },
      { th: "ของที่หลานเอามาขาย ลุงรับฝากไว้ก่อน ญาติลุงจะมารับไปขายวันละสองรอบ", en: "What you bring me to sell, I keep for my relatives. They come by twice a day and take it to market." },
      { th: "ญาติมารับไปเมื่อไร เงินจะมารออยู่ที่ลุง หลานค่อยแวะมารับ ไม่หายไปไหนหรอก", en: "Once they've been, your money waits here with me. Drop by whenever; it won't go anywhere." },
    ],
    [
      { th: "กระเป๋าหลานมีไม่กี่ช่องนะ เครื่องมือก็กินช่องเหมือนกัน", en: "Your bag has only a few slots, mind, and a tool takes one like anything else." },
      { th: "คิดดีๆ ว่าวันนี้จะพกอะไร ของชนิดเดียวกันซ้อนในช่องเดียวได้", en: "Think what to carry today. Things of a kind stack in one slot." },
      { th: "ไว้สานตะกร้าเป็นเมื่อไร ค่อยใส่ของได้เยอะขึ้น", en: "Once you can weave a basket, you'll carry more." },
    ],
    [
      { th: "ลานตกปลาที่ริมน้ำกำลังสร้างอยู่ พวก popoto ช่างเร่งกันใหญ่เลย", en: "They're building the fishing deck down by the river. The popoto crew is in a real hurry." },
      { th: "แปลงผักอยู่ทางตะวันออก เดินไปสุดทางก็ถึง", en: "The farm is out east, at the end of the path." },
      { th: "ลานทำอาหารก็กำลังก่อเตากันอยู่ เครื่องครัวซื้อที่ลุงได้เลย", en: "And they're laying the stoves for the cooking yard. You'll find your cookware right here." },
    ],
    [
      { th: "ลุงมีของที่อยากได้วันละสามอย่าง เอามาให้ได้ที่ฝากขายนะ", en: "I want three things a day. Bring them to me where you leave things to sell." },
      { th: "ทั้งหมู่บ้านช่วยกันหามาให้ครบ ลุงก็จะมีของใหม่มาขาย", en: "If the whole village brings them in between you, I'll have something new to sell." },
      { th: "ช่วยๆ กันนะหลาน หมู่บ้านเราจะได้โตไวๆ", en: "Pull together, kiddo. That's how this village grows." },
    ],
    // Hearsay about the fish that came on 2026-10-05, each of which bites in its own way (lib/town/items' FISH).
    // Nothing on the screen tells how; the owner's rule is that what is kept secret can still be felt for ("ยังต้อง
    // ทำให้ ผู้เล่นยังพอ คลำทางไปเจอ"), so the uncle has heard things: that there are such fish, never which or how.
    [
      { th: "ช่วงนี้แม่น้ำแปลกไปนะหลาน มีปลาหน้าตาไม่คุ้นว่ายมาจากต่างแดนเต็มไปหมด", en: "The river's changed of late, kiddo. Fish I don't know by sight, come up from far-off waters." },
      { th: "ริมตลิ่งน้ำตื้นก็มีพวกตัวเล็กของมันเอง ที่บนลานไม่เคยเห็น", en: "The shallows by the bank have little ones of their own, never seen off the deck." },
      { th: "ส่วนตัวใหญ่ๆ บางตัวไม่แลไส้เดือนเลย ต้องเอาปลาเป็นๆ ไปล่อ", en: "And some of the big ones won't look at a worm. It takes a live fish to tempt them." },
    ],
    [
      { th: "คนเก่าคนแก่เล่าว่า คืนพระจันทร์เต็มดวงมีปลาเกล็ดเรืองแสงขึ้นมาเล่นน้ำ", en: "The old folk say that on a full-moon night a fish with glowing scales comes up to play." },
      { th: "บางตัวรอให้ฝนซาก่อนถึงจะออกมา บางตัวชอบวันหยุด บางตัวชอบตอนคนมาตกปลากันหลายๆ คน", en: "Some wait for the rain to ease. Some like a day off. Some like it when a good few are fishing together." },
      { th: "แล้วก็มีตัวหนึ่ง ชอบมาหาแต่คนที่หมดแรงแล้ว ลุงก็ไม่รู้ว่าทำไม", en: "And there's one that only comes to somebody who's worn out. Don't ask me why." },
      { th: "จริงเท็จแค่ไหนลุงไม่รู้นะ ลองถามคนที่ตกปลาบ่อยๆ ดูสิ", en: "How much of it is true, I couldn't say. Ask whoever fishes a lot." },
    ],
    // That water can be handed from one bucket to the next (lib/town/line). Nothing said so, and on its first day
    // nobody found it (the owner, 2026-10-05: "การส่งน้ำ ต้องทำยังไง ทำไมใช้ยากจังเลย"). The uncle says how it is
    // done and that the way is long; how many it takes he leaves to them.
    [
      { th: "สมัยก่อนคนหาบน้ำเขาไม่เดินเองทั้งทางหรอกหลาน ยืนต่อกันเป็นทอดๆ ส่งน้ำต่อมือกันไป", en: "In the old days nobody carried water the whole way, kiddo. They stood in a line and handed it on." },
      { th: "คนรับแค่ถือถังเปล่าไว้ในมือ ยืนนิ่งๆ ให้คนส่งเห็น เดี๋ยวน้ำก็มาอยู่ในถังเอง", en: "Whoever takes it only holds an empty bucket and stands still in sight. The water comes to them." },
      { th: "จากแม่น้ำถึงบ่อที่แปลงผักมันไกลอยู่นะ ส่งกันทอดเดียวไม่ถึงหรอก ต้องมีคนกลางช่วยรับช่วงต่อ", en: "It's a long way from the river to the farm's well. One hand-over won't do: it takes somebody in between." },
      { th: "น้ำผ่านมือใคร สมุดที่บ่อก็จดให้คนนั้นด้วย ไม่มีใครเหนื่อยเปล่าหรอก", en: "And the book at the well writes down every hand the water went through. Nobody works for nothing." },
    ],
  ],
  banker: [
    [
      { th: "ขอเรียนให้ทราบก่อนตัดสินใจครับ แลกแล้วจำนวน popoto ของคุณจะลดลงจริง", en: "A word before you decide: what you exchange really does come off your popoto count." },
      { th: "แต่ประวัติว่าใครส่งให้คุณยังอยู่ครบ ไม่หายไปไหนครับ", en: "The record of who sent them stays, every one of them." },
      { th: "Popoto coin หาได้จากการเล่นในเมืองอยู่แล้ว การแลกเป็นเพียงทางลัดเล็กๆ ครับ", en: "Popoto coins are earned by playing in town anyway. The exchange is only a small shortcut." },
    ],
    [
      { th: "ตอนนี้แลกได้ขาเดียวก่อนนะครับ จาก popoto เป็น coin", en: "For now it goes one way only: popoto into coins." },
      { th: "ส่วนขากลับจะเปิดทีหลัง คนละเรทกันครับ", en: "The way back opens later, at a rate of its own." },
      { th: "แต่ละสัปดาห์แลกได้จำนวนหนึ่งเท่านั้นครับ ครบแล้วรอวันจันทร์ถัดไป", en: "Only so many may be exchanged in a week. After that, please wait for Monday." },
    ],
    [
      { th: "Popoto coin ใช้ได้ในเมืองนี้ครับ กับลุงที่แผงข้างๆ เป็นต้น", en: "Popoto coins are spent here in town: with the uncle at the stall beside me, for one." },
      { th: "ไม่เกี่ยวกับ gil ในกระเป๋าของเว็บนะครับ สองอย่างนี้แยกกัน แลกข้ามกันไม่ได้", en: "They are not the gil in your wallet on the site. The two are kept apart, and neither buys the other." },
      { th: "ผมจะจดทุกเหรียญลงสมุดอย่างเรียบร้อยครับ วางใจได้", en: "I shall write every coin down in my ledger. You may rely on it." },
    ],
  ],
};
/** What an open stall or counter says first: the greeting for the hour, then what it asks (or, the uncle, that money is waiting). */
export function askFor(who: Speaker, hour: number, paid = false): Line[] {
  return [hello(who, hour), who === "uncle" && paid ? PAID : ASK[who]];
}
/** The lines of a chat at an open stall or counter: that speaker's chat number `turn` (they go round). */
export function chatFor(who: Speaker, turn: number): Line[] {
  const all = CHATS[who];
  return all[((Math.floor(turn) % all.length) + all.length) % all.length];
}
