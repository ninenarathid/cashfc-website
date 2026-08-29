import type { Guide } from "./types";

/**
 * M9S — Nosferatu.
 *
 * The mechanic list and their names come from the Game8 guide credited below.
 * The coordinates do not: Game8 describes what happens in words and pictures,
 * and this format needs numbers, so every position here is a reconstruction.
 * That is why the guide is marked as a draft — the shape of the fight is right,
 * the exact spot to stand is not yet checked against a pull.
 *
 * Fix a mechanic by editing its `safe` positions. Nothing else has to change:
 * the diagram, the step-through and the quiz all read the same numbers.
 */
export const m9s: Guide = {
  slug: "m9s",
  name: "M9S — AAC Heavyweight (Savage)",
  boss: "Nosferatu",
  short: "M9S",
  category: "savage",
  expansion: "Dawntrail",
  patch: "7.0",
  draft: true,
  source: { name: "Game8", url: "https://game8.jp/ff14/754895" },
  arena: {
    // Square, and visibly four tiles across — the grid is what a party calls
    // positions by, so the diagram draws it rather than making people hold it
    // in their heads.
    shape: "square",
    grid: 4,
    image: "/guides/m9s/arena.jpg",
    // Cardinals on the walls, corners on the grid intersections one tile in.
    // The eight-way set Game8 describes for Ether Letting needs the fan attacks
    // to meet the wall between marks, which is why these sit where they do.
    waymarks: {
      A: { x: 0, y: 8.6 }, B: { x: 8.6, y: 0 },
      C: { x: 0, y: -8.6 }, D: { x: -8.6, y: 0 },
      "1": { x: 5, y: 5 }, "2": { x: 5, y: -5 },
      "3": { x: -5, y: -5 }, "4": { x: -5, y: 5 },
    },
  },

  phases: [
    {
      id: "opening",
      name: "เปิดไฟต์",
      enter: "100%",
      note: "ท่าพื้นฐาน จำจังหวะ tank buster กับค้างคาวให้ได้ก่อน",
      mechanics: [
        {
          id: "killer-voice",
          name: "Killer Voice (キラーボイス)",
          at: "0:10",
          what: "ดาเมจลงทั้งสนาม ไม่ต้องหลบ — healer เตรียม AoE heal ไว้",
          dies: "ไม่มีใครตายท่านี้ แต่คนที่ยังไม่ heal เต็มจากท่าก่อนจะตายท่าถัดไป",
          variants: [
            {
              id: "only",
              tell: "บอสร่ายกลางสนาม ไม่มีวงบอกตำแหน่ง",
              danger: [],
              safe: {
                MT: { x: 0, y: 2 }, H1: { x: -2, y: -3 }, H2: { x: 2, y: -3 },
                D1: { x: 0, y: 0.5 }, D3: { x: -4, y: -5 }, D4: { x: 4, y: -5 },
                ST: { x: 1.2, y: 2.0 }, D2: { x: 1.2, y: -0.5 },
              },
              wrong: "ท่านี้ยืนตรงไหนก็โดนเท่ากัน — ยืนใกล้บอสไว้จะพร้อมท่าต่อไปกว่า",
            },
          ],
        },
        {
          id: "hardcore",
          name: "Hardcore (ハードコア)",
          at: "0:25",
          what: "Tank buster — รัศมีขยายตามจำนวน stack ที่บอสมี ที่ 0–4 stack วงเล็ก "
              + "แต่ 8 stack ขึ้นไปวงใหญ่มาก tank ต้องลากออกไปขอบสนาม",
          dies: "คนอื่นยืนใกล้ tank เกินไปตอนบอสมี stack เยอะ — วงมันใหญ่กว่าที่จำไว้จากรอบแรก",
          variants: [
            {
              id: "low-stack",
              tell: "บอสมี 0–4 stack — วงเล็ก",
              danger: [{ kind: "circle", at: { x: 0, y: 7 }, r: 4 }],
              safe: {
                MT: { x: 0, y: 7 }, H1: { x: -3, y: -2 }, H2: { x: 3, y: -2 },
                D1: { x: 0, y: -1 }, D3: { x: -5, y: -5 }, D4: { x: 5, y: -5 },
                ST: { x: 1.2, y: 7.0 }, D2: { x: 1.2, y: -2.0 },
              },
              wrong: "ยังอยู่ในวง — ท่านี้ทุกคนที่ไม่ใช่ tank ต้องออกจากวงให้หมด",
            },
            {
              id: "high-stack",
              tell: "บอสมี 8 stack ขึ้นไป — วงกินเกือบครึ่งสนาม",
              danger: [{ kind: "circle", at: { x: 0, y: 7 }, r: 7 }],
              safe: {
                MT: { x: 0, y: 7 }, H1: { x: -3, y: -7 }, H2: { x: 3, y: -7 },
                D1: { x: 0, y: -8 }, D3: { x: -6, y: -6 }, D4: { x: 6, y: -6 },
                ST: { x: 1.2, y: 7.0 }, D2: { x: 1.2, y: -9.0 },
              },
              wrong: "ระยะที่พอตอน stack น้อย ไม่พอตอน stack เยอะ — ต้องถอยไปสุดขอบฝั่งตรงข้าม",
            },
          ],
        },
        {
          id: "vamp-stomp",
          name: "Vamp Stomp → Brutal Rain (ヴァンプストンプ→ブルータルレイン)",
          at: "0:50",
          what: "ค้างคาวเกิดรอบสนาม แล้วบอสปล่อยวงแหวนสีขาวออกมา — วงแหวนเป็นดาเมจแชร์ "
              + "ต้องรับพร้อมกัน จบด้วยท่าทุบหัวใส่ healer",
          dies: "รับวงแหวนคนเดียวเพราะยืนแยกจากกลุ่ม — มันแชร์ ไม่ใช่หลบ",
          variants: [
            {
              id: "share",
              tell: "วงแหวนสีขาวแผ่ออกจากตัวบอส",
              danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 5 }],
              safe: {
                MT: { x: 0, y: 1.5 }, H1: { x: -1.5, y: -1 }, H2: { x: 1.5, y: -1 },
                D1: { x: 0, y: -2 }, D3: { x: -2.5, y: -2.5 }, D4: { x: 2.5, y: -2.5 },
                ST: { x: 1.2, y: 1.5 }, D2: { x: 1.2, y: -3.0 },
              },
              wrong: "ออกไปไกลเกิน — ท่านี้ต้องเข้ามารวมกลางเพื่อแชร์ดาเมจ ไม่ใช่หนี",
            },
          ],
        },
      ],
    },

    {
      id: "torches",
      name: "คบไฟ + Ether Letting",
      enter: "หลัง Brutal Rain",
      note: "ช่วงที่สนามเริ่มแคบลงเรื่อยๆ — จำ waymark ให้แม่น",
      mechanics: [
        {
          id: "screech-1",
          name: "Sadistic Screech 1 (サディスティック・スクリーチ)",
          at: "1:30",
          what: "วงล้อคบไฟยิงลำแสงเป็นสองระลอก พร้อมกับบอสกวาดครึ่งวงกลม "
              + "สนามจะแคบลงทุกครั้งที่จบระลอก",
          dies: "หลบระลอกแรกได้แล้วยืนค้างที่เดิม — ระลอกสองมาจากอีกทิศ",
          variants: [
            {
              id: "sweep-west",
              tell: "บอสหันไปทางตะวันตก ครึ่งซ้ายสว่าง",
              danger: [{ kind: "half", facing: 270 }],
              safe: {
                MT: { x: 5, y: 3 }, H1: { x: 6, y: -1 }, H2: { x: 4, y: -3 },
                D1: { x: 3, y: 1 }, D3: { x: 7, y: 2 }, D4: { x: 7, y: -3 },
                ST: { x: 3.8, y: 3.0 }, D2: { x: 4.2, y: 0.0 },
              },
              wrong: "ฝั่งนั้นคือฝั่งที่กวาด — ต้องข้ามไปครึ่งตรงข้ามทั้งตัว",
            },
            {
              id: "sweep-east",
              tell: "บอสหันไปทางตะวันออก ครึ่งขวาสว่าง",
              danger: [{ kind: "half", facing: 90 }],
              safe: {
                MT: { x: -5, y: 3 }, H1: { x: -6, y: -1 }, H2: { x: -4, y: -3 },
                D1: { x: -3, y: 1 }, D3: { x: -7, y: 2 }, D4: { x: -7, y: -3 },
                ST: { x: -3.8, y: 3.0 }, D2: { x: -1.8, y: 0.0 },
              },
              wrong: "ฝั่งนั้นคือฝั่งที่กวาด — ต้องข้ามไปครึ่งตรงข้ามทั้งตัว",
            },
          ],
        },
        {
          id: "ether-letting",
          name: "Ether Letting (エーテルレッティング)",
          at: "2:10",
          what: "ทุกคนได้มาร์คบอกทิศ เอาไปวางลำแสง 8 ทิศที่ waymark ที่กำหนด "
              + "วางเสร็จแล้วรวมกลางเพื่อรับดาเมจกลุ่ม",
          dies: "วางลำแสงทับกันเพราะไม่ดูมาร์คของคนอื่น หรือกลับกลางช้าไม่ทันกลุ่ม",
          variants: [
            {
              id: "cardinals",
              tell: "มาร์คชี้ไป 4 ทิศหลัก — วางที่ A B C D",
              danger: [
                { kind: "rect", at: { x: 0, y: 5 }, w: 2, h: 10, facing: 0 },
                { kind: "rect", at: { x: 5, y: 0 }, w: 2, h: 10, facing: 90 },
                { kind: "rect", at: { x: 0, y: -5 }, w: 2, h: 10, facing: 180 },
                { kind: "rect", at: { x: -5, y: 0 }, w: 2, h: 10, facing: 270 },
              ],
              safe: {
                MT: { x: 5, y: 5 }, H1: { x: -5, y: 5 },
                H2: { x: 5, y: -5 }, D1: { x: -5, y: -5 },
                D3: { x: 7.5, y: 7.5 }, D4: { x: -7.5, y: -7.5 },
                ST: { x: 3.1, y: 4.3 }, D2: { x: -3.1, y: -5.3 },
              },
              wrong: "ยืนบนเส้นลำแสง — ที่ปลอดภัยคือช่องว่างระหว่างสองเส้น ไม่ใช่บนตัว waymark",
            },
            {
              id: "intercards",
              tell: "มาร์คชี้ไป 4 มุมเฉียง — วางที่ 1 2 3 4",
              danger: [
                { kind: "rect", at: { x: 3.5, y: 3.5 }, w: 2, h: 10, facing: 45 },
                { kind: "rect", at: { x: 3.5, y: -3.5 }, w: 2, h: 10, facing: 135 },
                { kind: "rect", at: { x: -3.5, y: -3.5 }, w: 2, h: 10, facing: 225 },
                { kind: "rect", at: { x: -3.5, y: 3.5 }, w: 2, h: 10, facing: 315 },
              ],
              safe: {
                MT: { x: 0, y: 6 }, H1: { x: 6, y: 0 },
                H2: { x: 0, y: -6 }, D1: { x: -6, y: 0 },
                D3: { x: 0, y: 8.6 }, D4: { x: 0, y: -8.6 },
                ST: { x: 1.2, y: 6.0 }, D2: { x: -4.8, y: -1.0 },
              },
              wrong: "รอบนี้ลำแสงอยู่แนวเฉียง ที่ปลอดภัยเลยเป็น 4 ทิศหลักแทน",
            },
          ],
        },
      ],
    },

    {
      id: "towers",
      name: "หอคอย",
      enter: "หลัง Ether Letting",
      note: "สองท่าติดกันที่ต้องแบ่งคนล่วงหน้า ตกลงกันก่อนเข้าไฟต์",
      mechanics: [
        {
          id: "screech-2",
          name: "Sadistic Screech 2",
          at: "3:00",
          what: "ทำลายทรงกลมเหล็ก + หอคอย + ท่ากวาดพัด มาพร้อมกับดาเมจทั้งสนาม",
          dies: "ไปช่วยทุบทรงกลมจนลืมเหยียบหอคอย — หอคอยว่างคือคนทั้งปาร์ตี้กิน",
          variants: [
            {
              id: "north-tower",
              tell: "หอคอยขึ้นครึ่งเหนือ ทรงกลมอยู่ใต้",
              danger: [
                { kind: "cone", at: { x: 0, y: 0 }, facing: 180, angle: 120 },
              ],
              safe: {
                MT: { x: 0, y: 6 }, H1: { x: -4, y: 5 }, H2: { x: 4, y: 5 },
                D1: { x: 0, y: 3.5 }, D3: { x: -6.5, y: 3 }, D4: { x: 6.5, y: 3 },
                ST: { x: 1.2, y: 6.0 }, D2: { x: 1.2, y: 2.5 },
              },
              wrong: "อยู่ในพัดที่บอสกวาด — ขึ้นไปครึ่งเหนือที่มีหอคอย",
            },
            {
              id: "south-tower",
              tell: "หอคอยขึ้นครึ่งใต้ ทรงกลมอยู่เหนือ",
              danger: [
                { kind: "cone", at: { x: 0, y: 0 }, facing: 0, angle: 120 },
              ],
              safe: {
                MT: { x: 0, y: -6 }, H1: { x: -4, y: -5 }, H2: { x: 4, y: -5 },
                D1: { x: 0, y: -3.5 }, D3: { x: -6.5, y: -3 }, D4: { x: 6.5, y: -3 },
                ST: { x: 1.2, y: -6.0 }, D2: { x: 1.2, y: -4.5 },
              },
              wrong: "อยู่ในพัดที่บอสกวาด — ลงไปครึ่งใต้ที่มีหอคอย",
            },
          ],
        },
        {
          id: "hell-in-a-cell",
          name: "Hell in a Cell (ヘル・イン・ア・セル)",
          at: "3:40",
          what: "หอคอยสองชุด ชุดละ 4 ต้น ที่ 12/3/6/9 นาฬิกา — กลุ่ม MT เข้าก่อน "
              + "กลุ่ม ST ตามชุดที่สอง อีก 4 คนที่ไม่เหยียบจะได้ spread หรือ stack "
              + "และมีพัดใส่ tank ต้องเล็งตำแหน่งด้วย",
          dies: "เข้าผิดชุด — ชุดแรกเป็นของกลุ่ม MT เท่านั้น เข้าพร้อมกันหมดคือหอคอยชุดสองว่าง",
          variants: [
            {
              id: "first-set",
              tell: "หอคอยชุดแรกขึ้น — กลุ่ม MT (MT H1 D1 D3) เหยียบ",
              danger: [
                { kind: "circle", at: { x: 0, y: 0 }, r: 3.5 },
              ],
              safe: {
                // กลุ่ม MT เหยียบหอคอย 12/3/6/9 นาฬิกา
                MT: { x: 0, y: 7.5 }, H1: { x: 7.5, y: 0 },
                D1: { x: 0, y: -7.5 }, D3: { x: -7.5, y: 0 },
                // กลุ่ม ST รอชุดสอง ยืนเฉียงไว้ ไม่ทับหอคอย
                ST: { x: 5.5, y: 5.5 }, H2: { x: 5.5, y: -5.5 },
                D2: { x: -5.5, y: -5.5 }, D4: { x: -5.5, y: 5.5 },
              },
              wrong: "หอคอยอยู่ที่ 12/3/6/9 นาฬิกาบนขอบสนาม และชุดแรกเป็นของกลุ่ม MT เท่านั้น",
            },
            {
              id: "second-set",
              tell: "หอคอยชุดสองขึ้น — กลุ่ม ST (ST H2 D2 D4) เหยียบ",
              danger: [
                { kind: "circle", at: { x: 0, y: 0 }, r: 3.5 },
              ],
              safe: {
                ST: { x: 0, y: 7.5 }, H2: { x: 7.5, y: 0 },
                D2: { x: 0, y: -7.5 }, D4: { x: -7.5, y: 0 },
                MT: { x: 5.5, y: 5.5 }, H1: { x: 5.5, y: -5.5 },
                D1: { x: -5.5, y: -5.5 }, D3: { x: -5.5, y: 5.5 },
              },
              wrong: "ชุดนี้เป็นของกลุ่ม ST — กลุ่ม MT เหยียบไปแล้วรอบก่อน ออกมายืนเฉียง",
            },
          ],
        },
      ],
    },

    {
      id: "bats",
      name: "ค้างคาว + ปิดท้าย",
      enter: "หลังหอคอยชุดสอง",
      mechanics: [
        {
          id: "bat-deathmatch",
          name: "Bat Deathmatch (バット・デスマッチ)",
          at: "4:30",
          what: "โดนเชือกโยงกับค้างคาว ตามด้วยพัดกวาดติดกัน 5 ครั้ง "
              + "และดาวหางที่จะเป็นวงกลมหรือโดนัทอย่างใดอย่างหนึ่ง",
          dies: "อ่านดาวหางผิด — วงกลมต้องออก โดนัทต้องเข้า และมันสลับกันทุกรอบ",
          variants: [
            {
              id: "comet-circle",
              tell: "ดาวหางเป็นวงทึบตรงกลาง — ต้องออกไปขอบ",
              danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 6 }],
              safe: {
                MT: { x: 0, y: 8.5 }, H1: { x: -6, y: 6 }, H2: { x: 6, y: 6 },
                D1: { x: 0, y: -8.5 }, D3: { x: -8.5, y: 0 }, D4: { x: 8.5, y: 0 },
                ST: { x: 1.2, y: 8.5 }, D2: { x: 1.2, y: -9.5 },
              },
              wrong: "ตรงกลางคือวงระเบิด — ท่านี้ต้องออกไปให้ถึงขอบ",
            },
            {
              id: "comet-donut",
              tell: "ดาวหางเป็นวงแหวน กลางว่าง — ต้องเข้ากลาง",
              danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 4 }],
              safe: {
                MT: { x: 0, y: 1.5 }, H1: { x: -1.5, y: 0 }, H2: { x: 1.5, y: 0 },
                D1: { x: 0, y: -1.5 }, D3: { x: -2.5, y: 1.5 }, D4: { x: 2.5, y: 1.5 },
                ST: { x: 1.2, y: 1.5 }, D2: { x: 1.2, y: -2.5 },
              },
              wrong: "รอบนี้เป็นโดนัท — ที่ปลอดภัยคือตรงกลาง ไม่ใช่ขอบ",
            },
          ],
        },
        {
          id: "sanguine-scratch",
          name: "Sanguine Scratch (サングインスクラッチ)",
          at: "5:10",
          what: "หลบสลับซ้ายขวาต่อเนื่อง ไม่มีเส้นบังคับ อ่านจากตัวบอสอย่างเดียว",
          dies: "หลบล่วงหน้าเร็วไป — ท่านี้ต้องรอให้บอสเริ่มเหวี่ยงก่อนแล้วค่อยขยับ",
          variants: [
            {
              id: "left",
              tell: "บอสเหวี่ยงจากซ้าย",
              danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 315, angle: 150 }],
              safe: {
                MT: { x: 5, y: -4 }, H1: { x: 6, y: -2 }, H2: { x: 4, y: -6 },
                D1: { x: 3, y: -3 }, D3: { x: 7, y: -4 }, D4: { x: 5, y: -7 },
                ST: { x: 3.8, y: -4.0 }, D2: { x: 4.2, y: -4.0 },
              },
              wrong: "ยังอยู่ในพัด — ท่านี้ต้องไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง",
            },
            {
              id: "right",
              tell: "บอสเหวี่ยงจากขวา",
              danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 150 }],
              safe: {
                MT: { x: -5, y: -4 }, H1: { x: -6, y: -2 }, H2: { x: -4, y: -6 },
                D1: { x: -3, y: -3 }, D3: { x: -7, y: -4 }, D4: { x: -5, y: -7 },
                ST: { x: -3.8, y: -4.0 }, D2: { x: -1.8, y: -4.0 },
              },
              wrong: "ยังอยู่ในพัด — ท่านี้ต้องไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง",
            },
          ],
        },
        {
          id: "enrage",
          name: "Enrage",
          at: "6:00",
          what: "ดาเมจทั้งสนามสองครั้งก่อนหมดเวลา — ถ้าถึงตรงนี้แปลว่า DPS ไม่พอ",
          dies: "ไม่ใช่ท่าที่หลบได้ ไปเก็บดาเมจในช่วงก่อนหน้าแทน",
          variants: [
            {
              id: "only",
              tell: "บอสร่ายยาว ไม่มีวงบอกตำแหน่ง",
              danger: [],
              safe: {
                MT: { x: 0, y: 2 }, H1: { x: -2, y: -2 }, H2: { x: 2, y: -2 },
                D1: { x: 0, y: 0.5 }, D3: { x: -4, y: -4 }, D4: { x: 4, y: -4 },
                ST: { x: 1.2, y: 2.0 }, D2: { x: 1.2, y: -0.5 },
              },
            },
          ],
        },
      ],
    },
  ],
};
