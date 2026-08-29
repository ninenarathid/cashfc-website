import type { Guide } from "./types";

/**
 * M9S — Nosferatu.
 *
 * The mechanic list, their order, and how each one is resolved come from the
 * Game8 guide credited below: which group takes which side, who breaks the ball,
 * who steps the tower, the order tanks and DPS enter them in. The coordinates do
 * not. Game8 says "MT group north"; a diagram needs a number, so every position
 * here is a reconstruction of a described intent.
 *
 * That is why the guide is marked as a draft. The strategy is right, the exact
 * spot is not yet checked against a pull.
 *
 * Fix a position by editing its `safe` entry. Nothing else has to change: the
 * diagram, the step-through and the quiz all read the same numbers.
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
    // Square, four tiles across. The grid is what a party calls positions by.
    shape: "square",
    grid: 4,
    image: "/guides/m9s/arena.jpg",
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
      note: "ท่าพื้นฐาน จัดตำแหน่งยืนประจำให้ติดก่อน",
      mechanics: [
        {
          id: "killer-voice",
          name: "Killer Voice (キラーボイス)",
          at: "0:10",
          tags: ["aoe"],
          what: "AoE ทั้งสนาม มาบ่อยมากตลอดไฟต์ ไม่ต้องหลบแต่ห้ามกินเปล่า "
              + "ต้องมี mitigation ทุกครั้ง",
          dies: "กินเปล่าเพราะคิดว่าแรงน้อย แล้วเลือดไม่พอรับท่าถัดไปที่มาติดกัน",
          variants: [
            {
              id: "only",
              tell: "บอสร่ายกลางสนาม ไม่มีวงบอกตำแหน่ง",
              steps: [
                {
                  id: "cast",
                  label: "รับ",
                  say: "ยืนตำแหน่งประจำ ไม่ต้องขยับ — ใส่ mitigation ให้ตรงจังหวะร่าย",
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: -1.5, y: 2.5 },
                    H1: { x: -3, y: -3 }, H2: { x: 3, y: -3 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: -6, y: -5 }, D4: { x: 6, y: -5 },
                  },
                  per: {
                    MT: "ถือบอสไว้กลาง หันหน้าออกจากปาร์ตี้",
                    ST: "เตรียม mitigation กลุ่ม สลับกับ MT",
                    H1: "AoE heal หลังท่าจบ",
                    H2: "โล่ก่อนร่ายจบ",
                  },
                },
              ],
            },
          ],
        },

        {
          id: "hardcore",
          name: "Hardcore (ハードコア)",
          at: "0:25",
          tags: ["tankbuster"],
          what: "Tank buster ใส่เป้าเดียว รัศมีขยายตาม stack ที่บอสสะสม "
              + "0–4 stack วงเล็ก แต่ 8 stack ขึ้นไปกินกว้างถึง 4 ช่อง "
              + "ทั้งสอง tank ถือ aggro ไว้ (ST ยืนที่ 2)",
          dies: "คนอื่นยืนใกล้ tank ด้วยระยะที่เคยพอตอน stack น้อย — พอ stack เยอะวงมันโตกว่านั้นมาก",
          variants: [
            {
              id: "low-stack",
              tell: "บอสมี 0–4 stack — วงเล็ก ประมาณ 1 ช่อง",
              steps: [
                {
                  id: "spread",
                  label: "แยก",
                  say: "tank ที่โดนลากออกไปขอบ คนอื่นถอยพ้นวง",
                  danger: [{ kind: "circle", at: { x: 0, y: 7.5 }, r: 3.5 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, ST: { x: -2.5, y: 5 },
                    H1: { x: -3, y: -1 }, H2: { x: 3, y: -1 },
                    D1: { x: -1.5, y: 1 }, D2: { x: 1.5, y: 1 },
                    D3: { x: -6, y: -3 }, D4: { x: 6, y: -3 },
                  },
                  per: {
                    MT: "รับเอง ลากไปขอบเหนือ กด cooldown ป้องกัน",
                    ST: "ยืนที่ 2 ถือ aggro ไว้ พร้อมสลับถ้า debuff ซ้อน",
                    H1: "heal MT ให้เต็มก่อนร่ายจบ",
                    H2: "โล่ MT",
                  },
                  wrong: "ยังอยู่ในวง — ทุกคนที่ไม่ใช่ tank ต้องออกให้พ้น",
                },
              ],
            },
            {
              id: "high-stack",
              tell: "บอสมี 8 stack ขึ้นไป — วงกินกว้างราว 4 ช่อง",
              steps: [
                {
                  id: "spread",
                  label: "แยกให้ไกล",
                  say: "วงใหญ่กว่าเดิมมาก tank ไปสุดขอบ ทุกคนไปครึ่งตรงข้าม",
                  danger: [{ kind: "circle", at: { x: 0, y: 7.5 }, r: 7 }],
                  safe: {
                    MT: { x: 0, y: 8.5 }, ST: { x: -3, y: -6 },
                    H1: { x: -6, y: -7.5 }, H2: { x: 6, y: -7.5 },
                    D1: { x: -1.5, y: -8 }, D2: { x: 1.5, y: -8 },
                    D3: { x: -8, y: -5 }, D4: { x: 8, y: -5 },
                  },
                  per: {
                    MT: "ไปสุดขอบเหนือ กด invuln ถ้า stack เต็ม",
                    ST: "ลงมาครึ่งใต้กับปาร์ตี้ ไม่ต้องเข้าใกล้",
                  },
                  wrong: "ระยะที่พอตอน stack น้อยไม่พอตอน stack เยอะ — ต้องถอยไปสุดครึ่งตรงข้าม",
                },
              ],
            },
          ],
        },

        {
          id: "vamp-stomp",
          name: "Vamp Stomp → Brutal Rain (ヴァンプストンプ→ブルータルレイン)",
          at: "0:50",
          tags: ["adds", "spread", "stack", "memo"],
          what: {
            th: "ค้างคาวเกิดในช่องกลางเป็นหนึ่งใน 4 แพทเทิร์น แล้ววงแหวนสีขาวแผ่ออกจากบอส "
              + "โดนค้างคาวก็เกิดวงระเบิด โดนคนก็ติดวงไปกับตัว "
              + "melee เข้ากลางหลังค้างคาวรอบแรก ranged เข้าหลังรอบสอง ปิดท้ายด้วย Brutal Rain",
            en: "Bats spawn on the inner tiles in one of four patterns, then a white ring "
              + "spreads from the boss: it makes a circle where it touches a bat, and puts one "
              + "on any player it touches. Melee come to the centre after the first bat wave, "
              + "ranged after the second, and Brutal Rain closes it.",
          },
          dies: {
            th: "วงที่ติดตัวไปทับกับของคนอื่น — ตายทันที ไม่ใช่แค่เจ็บ "
              + "สาเหตุที่พบบ่อยสุดคือ melee กด gap close เข้ากลาง เลยไปโผล่ทับคนอื่น",
            en: "Two players' circles overlapping, which is an instant kill rather than damage. "
              + "The usual cause is a melee using a gap closer to get to the centre and "
              + "arriving on top of somebody.",
          },
          variants: [
            {
              id: "vertical",
              tell: { th: "ค้างคาวสองตัวเรียงแนวตั้ง เหนือ–ใต้", en: "The two bats line up vertically, north and south" },
              steps: [
                {
                  id: "set",
                  label: { th: "1 — เข้าที่", en: "1 — take position" },
                  say: {
                    th: "melee ยืนกากบาทสี่ทิศในช่องกลาง ranged ยืนกากบาทเฉียงที่สี่มุม "
                      + "ตำแหน่งคงที่ทุกรอบ ไม่ขึ้นกับว่าค้างคาวออกแพทเทิร์นไหน",
                    en: "Melee take the four cardinal inner tiles, ranged the four corners. "
                      + "The spots are the same every time — the bat pattern does not move them.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: 0, y: -2.5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: 2.5, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "ช่องกลางทิศเหนือ", en: "Inner tile, north." },
                    ST: { th: "ช่องกลางทิศใต้", en: "Inner tile, south." },
                    D1: { th: "ช่องกลางทิศตะวันตก", en: "Inner tile, west." },
                    D2: { th: "ช่องกลางทิศตะวันออก", en: "Inner tile, east." },
                    D3: { th: "มุมซ้ายบน (ตะวันตกเฉียงเหนือ)", en: "Top-left corner, north-west." },
                    D4: { th: "มุมขวาบน (ตะวันออกเฉียงเหนือ)", en: "Top-right corner, north-east." },
                    H1: { th: "มุมซ้ายล่าง (ตะวันตกเฉียงใต้)", en: "Bottom-left corner, south-west." },
                    H2: { th: "มุมขวาล่าง (ตะวันออกเฉียงใต้)", en: "Bottom-right corner, south-east." },
                  },
                  wrong: {
                    th: "melee กากบาทสี่ทิศในช่องกลาง (MT เหนือ ST ใต้ D1 ตะวันตก D2 ตะวันออก) "
                      + "ranged กากบาทเฉียงที่มุม (D3 ซ้ายบน D4 ขวาบน H1 ซ้ายล่าง H2 ขวาล่าง)",
                    en: "Melee on the cardinal inner tiles — MT north, ST south, D1 west, "
                      + "D2 east — and ranged on the corners: D3 top-left, D4 top-right, "
                      + "H1 bottom-left, H2 bottom-right.",
                  },
                },
                {
                  id: "melee-in",
                  label: { th: "2 — หลบค้างคาวรอบแรก แล้ว melee เข้ากลาง",
                           en: "2 — dodge the first bat wave, melee come in" },
                  say: {
                    th: "วงแหวนสีขาวโดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                      + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                    en: "The white ring reaches the bats and their first circles go off. "
                      + "Melee dodge those, then run to the centre — on foot, no gap closer.",
                  },
                  danger: [
                    { kind: "circle", at: { x: 0, y: 2.5 }, r: 3.2 },
                    { kind: "circle", at: { x: 0, y: -2.5 }, r: 3.2 },
                  ],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "วิ่งเข้ากลางด้วยเท้า ห้ามกด gap close เด็ดขาด — "
                             + "มันจะพาไปไกลเกินและวางวงผิดที่",
                          en: "Walk in. No gap closer: it overshoots and puts your circle in "
                             + "the wrong place." },
                    ST: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D1: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D2: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D3: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                    H1: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                  },
                  wrong: {
                    th: "หลบวงค้างคาวแล้วต้องเข้ากลาง ไม่ใช่ค้างอยู่ช่องเดิม",
                    en: "Dodge the bat circle and come to the centre, do not stay on your tile.",
                  },
                },
                {
                  id: "ranged-in",
                  label: { th: "3 — หลังค้างคาวรอบสอง ranged เข้ากลาง",
                           en: "3 — after the second bat wave, ranged come in" },
                  say: {
                    th: "ค้างคาวออกวงรอบสอง ranged รอให้จบก่อนแล้วค่อยเข้ากลาง "
                      + "ระวังอย่าเข้าเร็วจนวงตัวเองไปทับ melee ที่อยู่กลางแล้ว",
                    en: "The bats put out a second set of circles. Ranged wait for those, then "
                      + "come in — not so early that their own circle lands on the melee who "
                      + "are already there.",
                  },
                  danger: [
                    { kind: "circle", at: { x: 0, y: 2.5 }, r: 2.6 },
                    { kind: "circle", at: { x: 0, y: -2.5 }, r: 2.6 },
                  ],
                  safe: {
                    D3: { x: -1.5, y: 1.5 }, D4: { x: 1.5, y: 1.5 },
                    H1: { x: -1.5, y: -1.5 }, H2: { x: 1.5, y: -1.5 },
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                  },
                  per: {
                    D3: { th: "รอวงรอบสองจบ แล้วเข้ากลางฝั่งของตัวเอง",
                          en: "Wait out the second set, then come in on your own side." },
                    D4: { th: "รอวงรอบสองจบ แล้วเข้ากลาง",
                          en: "Wait out the second set, then come in." },
                    H1: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียม heal ต่อทันที",
                          en: "Wait it out, come in, and be ready to heal straight away." },
                    H2: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียมโล่",
                          en: "Wait it out, come in, shields up." },
                    MT: { th: "อยู่กลางแล้ว เว้นที่ให้ ranged เข้ามา",
                          en: "Already in. Leave room for the ranged." },
                  },
                  wrong: {
                    th: "ranged เข้ากลางหลังวงค้างคาวรอบสองจบ ไม่ใช่พร้อม melee",
                    en: "Ranged come in after the second bat wave, not together with the melee.",
                  },
                },
                {
                  id: "stack",
                  label: { th: "4 — Brutal Rain รวมรับ", en: "4 — stack for Brutal Rain" },
                  say: {
                    th: "Brutal Rain สุ่มเป้า แล้วแชร์ดาเมจทั้งปาร์ตี้ — ต้องรวมกันครบ 8 คน "
                      + "จำนวนครั้งเพิ่มขึ้นทีละ 1 ทุกครั้งที่บอสร่ายซ้ำ (Game8 ว่ารอบแรก 3 ครั้ง) "
                      + "เพราะฉะนั้นรอบหลังๆ ต้องใส่ mitigation หนักขึ้นเรื่อยๆ",
                    en: "Brutal Rain picks a random target and is shared by the whole party, so "
                      + "all eight gather. It gains a hit every time the boss casts it again — "
                      + "Game8 gives three for the first — so later ones need steadily more "
                      + "mitigation than the first.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  per: {
                    MT: { th: "mitigation กลุ่ม รอบหลังๆ ต้องใส่หนักกว่ารอบแรก",
                          en: "Group mitigation, and more of it each time round." },
                    ST: { th: "แบ่ง mitigation กับ MT ให้ครอบคลุมรอบถัดๆ ไปด้วย",
                          en: "Split cooldowns with MT so the later casts are covered too." },
                    H1: { th: "เป้าสุ่ม ไม่ใช่ healer เสมอ — heal ทั้งตี้ไว้ก่อน",
                          en: "The target is random, so heal the party rather than one person." },
                    H2: { th: "โล่ก่อนร่ายจบ", en: "Shields before the cast lands." },
                  },
                  wrong: {
                    th: "ท่านี้แชร์ ต้องรวมกันครบ 8 คน ไม่ใช่หลบ",
                    en: "This one is shared — all eight together, not dodged.",
                  },
                },
              ],
            },
            {
              id: "horizontal",
              tell: { th: "ค้างคาวสองตัวเรียงแนวนอน ตะวันตก–ตะวันออก", en: "The two bats line up horizontally, west and east" },
              steps: [
                {
                  id: "set",
                  label: { th: "1 — เข้าที่", en: "1 — take position" },
                  say: {
                    th: "melee ยืนกากบาทสี่ทิศในช่องกลาง ranged ยืนกากบาทเฉียงที่สี่มุม "
                      + "ตำแหน่งคงที่ทุกรอบ ไม่ขึ้นกับว่าค้างคาวออกแพทเทิร์นไหน",
                    en: "Melee take the four cardinal inner tiles, ranged the four corners. "
                      + "The spots are the same every time — the bat pattern does not move them.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: 0, y: -2.5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: 2.5, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "ช่องกลางทิศเหนือ", en: "Inner tile, north." },
                    ST: { th: "ช่องกลางทิศใต้", en: "Inner tile, south." },
                    D1: { th: "ช่องกลางทิศตะวันตก", en: "Inner tile, west." },
                    D2: { th: "ช่องกลางทิศตะวันออก", en: "Inner tile, east." },
                    D3: { th: "มุมซ้ายบน (ตะวันตกเฉียงเหนือ)", en: "Top-left corner, north-west." },
                    D4: { th: "มุมขวาบน (ตะวันออกเฉียงเหนือ)", en: "Top-right corner, north-east." },
                    H1: { th: "มุมซ้ายล่าง (ตะวันตกเฉียงใต้)", en: "Bottom-left corner, south-west." },
                    H2: { th: "มุมขวาล่าง (ตะวันออกเฉียงใต้)", en: "Bottom-right corner, south-east." },
                  },
                  wrong: {
                    th: "melee กากบาทสี่ทิศในช่องกลาง (MT เหนือ ST ใต้ D1 ตะวันตก D2 ตะวันออก) "
                      + "ranged กากบาทเฉียงที่มุม (D3 ซ้ายบน D4 ขวาบน H1 ซ้ายล่าง H2 ขวาล่าง)",
                    en: "Melee on the cardinal inner tiles — MT north, ST south, D1 west, "
                      + "D2 east — and ranged on the corners: D3 top-left, D4 top-right, "
                      + "H1 bottom-left, H2 bottom-right.",
                  },
                },
                {
                  id: "melee-in",
                  label: { th: "2 — หลบค้างคาวรอบแรก แล้ว melee เข้ากลาง",
                           en: "2 — dodge the first bat wave, melee come in" },
                  say: {
                    th: "วงแหวนสีขาวโดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                      + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                    en: "The white ring reaches the bats and their first circles go off. "
                      + "Melee dodge those, then run to the centre — on foot, no gap closer.",
                  },
                  danger: [
                    { kind: "circle", at: { x: -2.5, y: 0 }, r: 3.2 },
                    { kind: "circle", at: { x: 2.5, y: 0 }, r: 3.2 },
                  ],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "วิ่งเข้ากลางด้วยเท้า ห้ามกด gap close เด็ดขาด — "
                             + "มันจะพาไปไกลเกินและวางวงผิดที่",
                          en: "Walk in. No gap closer: it overshoots and puts your circle in "
                             + "the wrong place." },
                    ST: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D1: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D2: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D3: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                    H1: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                  },
                  wrong: {
                    th: "หลบวงค้างคาวแล้วต้องเข้ากลาง ไม่ใช่ค้างอยู่ช่องเดิม",
                    en: "Dodge the bat circle and come to the centre, do not stay on your tile.",
                  },
                },
                {
                  id: "ranged-in",
                  label: { th: "3 — หลังค้างคาวรอบสอง ranged เข้ากลาง",
                           en: "3 — after the second bat wave, ranged come in" },
                  say: {
                    th: "ค้างคาวออกวงรอบสอง ranged รอให้จบก่อนแล้วค่อยเข้ากลาง "
                      + "ระวังอย่าเข้าเร็วจนวงตัวเองไปทับ melee ที่อยู่กลางแล้ว",
                    en: "The bats put out a second set of circles. Ranged wait for those, then "
                      + "come in — not so early that their own circle lands on the melee who "
                      + "are already there.",
                  },
                  danger: [
                    { kind: "circle", at: { x: -2.5, y: 0 }, r: 2.6 },
                    { kind: "circle", at: { x: 2.5, y: 0 }, r: 2.6 },
                  ],
                  safe: {
                    D3: { x: -1.5, y: 1.5 }, D4: { x: 1.5, y: 1.5 },
                    H1: { x: -1.5, y: -1.5 }, H2: { x: 1.5, y: -1.5 },
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                  },
                  per: {
                    D3: { th: "รอวงรอบสองจบ แล้วเข้ากลางฝั่งของตัวเอง",
                          en: "Wait out the second set, then come in on your own side." },
                    D4: { th: "รอวงรอบสองจบ แล้วเข้ากลาง",
                          en: "Wait out the second set, then come in." },
                    H1: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียม heal ต่อทันที",
                          en: "Wait it out, come in, and be ready to heal straight away." },
                    H2: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียมโล่",
                          en: "Wait it out, come in, shields up." },
                    MT: { th: "อยู่กลางแล้ว เว้นที่ให้ ranged เข้ามา",
                          en: "Already in. Leave room for the ranged." },
                  },
                  wrong: {
                    th: "ranged เข้ากลางหลังวงค้างคาวรอบสองจบ ไม่ใช่พร้อม melee",
                    en: "Ranged come in after the second bat wave, not together with the melee.",
                  },
                },
                {
                  id: "stack",
                  label: { th: "4 — Brutal Rain รวมรับ", en: "4 — stack for Brutal Rain" },
                  say: {
                    th: "Brutal Rain สุ่มเป้า แล้วแชร์ดาเมจทั้งปาร์ตี้ — ต้องรวมกันครบ 8 คน "
                      + "จำนวนครั้งเพิ่มขึ้นทีละ 1 ทุกครั้งที่บอสร่ายซ้ำ (Game8 ว่ารอบแรก 3 ครั้ง) "
                      + "เพราะฉะนั้นรอบหลังๆ ต้องใส่ mitigation หนักขึ้นเรื่อยๆ",
                    en: "Brutal Rain picks a random target and is shared by the whole party, so "
                      + "all eight gather. It gains a hit every time the boss casts it again — "
                      + "Game8 gives three for the first — so later ones need steadily more "
                      + "mitigation than the first.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  per: {
                    MT: { th: "mitigation กลุ่ม รอบหลังๆ ต้องใส่หนักกว่ารอบแรก",
                          en: "Group mitigation, and more of it each time round." },
                    ST: { th: "แบ่ง mitigation กับ MT ให้ครอบคลุมรอบถัดๆ ไปด้วย",
                          en: "Split cooldowns with MT so the later casts are covered too." },
                    H1: { th: "เป้าสุ่ม ไม่ใช่ healer เสมอ — heal ทั้งตี้ไว้ก่อน",
                          en: "The target is random, so heal the party rather than one person." },
                    H2: { th: "โล่ก่อนร่ายจบ", en: "Shields before the cast lands." },
                  },
                  wrong: {
                    th: "ท่านี้แชร์ ต้องรวมกันครบ 8 คน ไม่ใช่หลบ",
                    en: "This one is shared — all eight together, not dodged.",
                  },
                },
              ],
            },
            {
              id: "diag-a",
              tell: { th: "ค้างคาวเรียงเฉียง ตะวันตกเฉียงเหนือ กับ ตะวันออกเฉียงใต้", en: "The bats sit on a diagonal, north-west and south-east" },
              steps: [
                {
                  id: "set",
                  label: { th: "1 — เข้าที่", en: "1 — take position" },
                  say: {
                    th: "melee ยืนกากบาทสี่ทิศในช่องกลาง ranged ยืนกากบาทเฉียงที่สี่มุม "
                      + "ตำแหน่งคงที่ทุกรอบ ไม่ขึ้นกับว่าค้างคาวออกแพทเทิร์นไหน",
                    en: "Melee take the four cardinal inner tiles, ranged the four corners. "
                      + "The spots are the same every time — the bat pattern does not move them.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: 0, y: -2.5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: 2.5, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "ช่องกลางทิศเหนือ", en: "Inner tile, north." },
                    ST: { th: "ช่องกลางทิศใต้", en: "Inner tile, south." },
                    D1: { th: "ช่องกลางทิศตะวันตก", en: "Inner tile, west." },
                    D2: { th: "ช่องกลางทิศตะวันออก", en: "Inner tile, east." },
                    D3: { th: "มุมซ้ายบน (ตะวันตกเฉียงเหนือ)", en: "Top-left corner, north-west." },
                    D4: { th: "มุมขวาบน (ตะวันออกเฉียงเหนือ)", en: "Top-right corner, north-east." },
                    H1: { th: "มุมซ้ายล่าง (ตะวันตกเฉียงใต้)", en: "Bottom-left corner, south-west." },
                    H2: { th: "มุมขวาล่าง (ตะวันออกเฉียงใต้)", en: "Bottom-right corner, south-east." },
                  },
                  wrong: {
                    th: "melee กากบาทสี่ทิศในช่องกลาง (MT เหนือ ST ใต้ D1 ตะวันตก D2 ตะวันออก) "
                      + "ranged กากบาทเฉียงที่มุม (D3 ซ้ายบน D4 ขวาบน H1 ซ้ายล่าง H2 ขวาล่าง)",
                    en: "Melee on the cardinal inner tiles — MT north, ST south, D1 west, "
                      + "D2 east — and ranged on the corners: D3 top-left, D4 top-right, "
                      + "H1 bottom-left, H2 bottom-right.",
                  },
                },
                {
                  id: "melee-in",
                  label: { th: "2 — หลบค้างคาวรอบแรก แล้ว melee เข้ากลาง",
                           en: "2 — dodge the first bat wave, melee come in" },
                  say: {
                    th: "วงแหวนสีขาวโดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                      + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                    en: "The white ring reaches the bats and their first circles go off. "
                      + "Melee dodge those, then run to the centre — on foot, no gap closer.",
                  },
                  danger: [
                    { kind: "circle", at: { x: -2.5, y: 2.5 }, r: 3.2 },
                    { kind: "circle", at: { x: 2.5, y: -2.5 }, r: 3.2 },
                  ],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "วิ่งเข้ากลางด้วยเท้า ห้ามกด gap close เด็ดขาด — "
                             + "มันจะพาไปไกลเกินและวางวงผิดที่",
                          en: "Walk in. No gap closer: it overshoots and puts your circle in "
                             + "the wrong place." },
                    ST: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D1: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D2: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D3: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                    H1: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                  },
                  wrong: {
                    th: "หลบวงค้างคาวแล้วต้องเข้ากลาง ไม่ใช่ค้างอยู่ช่องเดิม",
                    en: "Dodge the bat circle and come to the centre, do not stay on your tile.",
                  },
                },
                {
                  id: "ranged-in",
                  label: { th: "3 — หลังค้างคาวรอบสอง ranged เข้ากลาง",
                           en: "3 — after the second bat wave, ranged come in" },
                  say: {
                    th: "ค้างคาวออกวงรอบสอง ranged รอให้จบก่อนแล้วค่อยเข้ากลาง "
                      + "ระวังอย่าเข้าเร็วจนวงตัวเองไปทับ melee ที่อยู่กลางแล้ว",
                    en: "The bats put out a second set of circles. Ranged wait for those, then "
                      + "come in — not so early that their own circle lands on the melee who "
                      + "are already there.",
                  },
                  danger: [
                    { kind: "circle", at: { x: -2.5, y: 2.5 }, r: 2.6 },
                    { kind: "circle", at: { x: 2.5, y: -2.5 }, r: 2.6 },
                  ],
                  safe: {
                    D3: { x: -1.5, y: 1.5 }, D4: { x: 1.5, y: 1.5 },
                    H1: { x: -1.5, y: -1.5 }, H2: { x: 1.5, y: -1.5 },
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                  },
                  per: {
                    D3: { th: "รอวงรอบสองจบ แล้วเข้ากลางฝั่งของตัวเอง",
                          en: "Wait out the second set, then come in on your own side." },
                    D4: { th: "รอวงรอบสองจบ แล้วเข้ากลาง",
                          en: "Wait out the second set, then come in." },
                    H1: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียม heal ต่อทันที",
                          en: "Wait it out, come in, and be ready to heal straight away." },
                    H2: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียมโล่",
                          en: "Wait it out, come in, shields up." },
                    MT: { th: "อยู่กลางแล้ว เว้นที่ให้ ranged เข้ามา",
                          en: "Already in. Leave room for the ranged." },
                  },
                  wrong: {
                    th: "ranged เข้ากลางหลังวงค้างคาวรอบสองจบ ไม่ใช่พร้อม melee",
                    en: "Ranged come in after the second bat wave, not together with the melee.",
                  },
                },
                {
                  id: "stack",
                  label: { th: "4 — Brutal Rain รวมรับ", en: "4 — stack for Brutal Rain" },
                  say: {
                    th: "Brutal Rain สุ่มเป้า แล้วแชร์ดาเมจทั้งปาร์ตี้ — ต้องรวมกันครบ 8 คน "
                      + "จำนวนครั้งเพิ่มขึ้นทีละ 1 ทุกครั้งที่บอสร่ายซ้ำ (Game8 ว่ารอบแรก 3 ครั้ง) "
                      + "เพราะฉะนั้นรอบหลังๆ ต้องใส่ mitigation หนักขึ้นเรื่อยๆ",
                    en: "Brutal Rain picks a random target and is shared by the whole party, so "
                      + "all eight gather. It gains a hit every time the boss casts it again — "
                      + "Game8 gives three for the first — so later ones need steadily more "
                      + "mitigation than the first.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  per: {
                    MT: { th: "mitigation กลุ่ม รอบหลังๆ ต้องใส่หนักกว่ารอบแรก",
                          en: "Group mitigation, and more of it each time round." },
                    ST: { th: "แบ่ง mitigation กับ MT ให้ครอบคลุมรอบถัดๆ ไปด้วย",
                          en: "Split cooldowns with MT so the later casts are covered too." },
                    H1: { th: "เป้าสุ่ม ไม่ใช่ healer เสมอ — heal ทั้งตี้ไว้ก่อน",
                          en: "The target is random, so heal the party rather than one person." },
                    H2: { th: "โล่ก่อนร่ายจบ", en: "Shields before the cast lands." },
                  },
                  wrong: {
                    th: "ท่านี้แชร์ ต้องรวมกันครบ 8 คน ไม่ใช่หลบ",
                    en: "This one is shared — all eight together, not dodged.",
                  },
                },
              ],
            },
            {
              id: "diag-b",
              tell: { th: "ค้างคาวเรียงเฉียง ตะวันออกเฉียงเหนือ กับ ตะวันตกเฉียงใต้", en: "The bats sit on a diagonal, north-east and south-west" },
              steps: [
                {
                  id: "set",
                  label: { th: "1 — เข้าที่", en: "1 — take position" },
                  say: {
                    th: "melee ยืนกากบาทสี่ทิศในช่องกลาง ranged ยืนกากบาทเฉียงที่สี่มุม "
                      + "ตำแหน่งคงที่ทุกรอบ ไม่ขึ้นกับว่าค้างคาวออกแพทเทิร์นไหน",
                    en: "Melee take the four cardinal inner tiles, ranged the four corners. "
                      + "The spots are the same every time — the bat pattern does not move them.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: 0, y: -2.5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: 2.5, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "ช่องกลางทิศเหนือ", en: "Inner tile, north." },
                    ST: { th: "ช่องกลางทิศใต้", en: "Inner tile, south." },
                    D1: { th: "ช่องกลางทิศตะวันตก", en: "Inner tile, west." },
                    D2: { th: "ช่องกลางทิศตะวันออก", en: "Inner tile, east." },
                    D3: { th: "มุมซ้ายบน (ตะวันตกเฉียงเหนือ)", en: "Top-left corner, north-west." },
                    D4: { th: "มุมขวาบน (ตะวันออกเฉียงเหนือ)", en: "Top-right corner, north-east." },
                    H1: { th: "มุมซ้ายล่าง (ตะวันตกเฉียงใต้)", en: "Bottom-left corner, south-west." },
                    H2: { th: "มุมขวาล่าง (ตะวันออกเฉียงใต้)", en: "Bottom-right corner, south-east." },
                  },
                  wrong: {
                    th: "melee กากบาทสี่ทิศในช่องกลาง (MT เหนือ ST ใต้ D1 ตะวันตก D2 ตะวันออก) "
                      + "ranged กากบาทเฉียงที่มุม (D3 ซ้ายบน D4 ขวาบน H1 ซ้ายล่าง H2 ขวาล่าง)",
                    en: "Melee on the cardinal inner tiles — MT north, ST south, D1 west, "
                      + "D2 east — and ranged on the corners: D3 top-left, D4 top-right, "
                      + "H1 bottom-left, H2 bottom-right.",
                  },
                },
                {
                  id: "melee-in",
                  label: { th: "2 — หลบค้างคาวรอบแรก แล้ว melee เข้ากลาง",
                           en: "2 — dodge the first bat wave, melee come in" },
                  say: {
                    th: "วงแหวนสีขาวโดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                      + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                    en: "The white ring reaches the bats and their first circles go off. "
                      + "Melee dodge those, then run to the centre — on foot, no gap closer.",
                  },
                  danger: [
                    { kind: "circle", at: { x: 2.5, y: 2.5 }, r: 3.2 },
                    { kind: "circle", at: { x: -2.5, y: -2.5 }, r: 3.2 },
                  ],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                    H1: { x: -7.5, y: -7.5 }, H2: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "วิ่งเข้ากลางด้วยเท้า ห้ามกด gap close เด็ดขาด — "
                             + "มันจะพาไปไกลเกินและวางวงผิดที่",
                          en: "Walk in. No gap closer: it overshoots and puts your circle in "
                             + "the wrong place." },
                    ST: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D1: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D2: { th: "วิ่งเข้ากลาง ห้าม gap close", en: "Walk in. No gap closer." },
                    D3: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                    H1: { th: "ยังอยู่มุม ยังไม่ถึงตา", en: "Stay in your corner; not yet." },
                  },
                  wrong: {
                    th: "หลบวงค้างคาวแล้วต้องเข้ากลาง ไม่ใช่ค้างอยู่ช่องเดิม",
                    en: "Dodge the bat circle and come to the centre, do not stay on your tile.",
                  },
                },
                {
                  id: "ranged-in",
                  label: { th: "3 — หลังค้างคาวรอบสอง ranged เข้ากลาง",
                           en: "3 — after the second bat wave, ranged come in" },
                  say: {
                    th: "ค้างคาวออกวงรอบสอง ranged รอให้จบก่อนแล้วค่อยเข้ากลาง "
                      + "ระวังอย่าเข้าเร็วจนวงตัวเองไปทับ melee ที่อยู่กลางแล้ว",
                    en: "The bats put out a second set of circles. Ranged wait for those, then "
                      + "come in — not so early that their own circle lands on the melee who "
                      + "are already there.",
                  },
                  danger: [
                    { kind: "circle", at: { x: 2.5, y: 2.5 }, r: 2.6 },
                    { kind: "circle", at: { x: -2.5, y: -2.5 }, r: 2.6 },
                  ],
                  safe: {
                    D3: { x: -1.5, y: 1.5 }, D4: { x: 1.5, y: 1.5 },
                    H1: { x: -1.5, y: -1.5 }, H2: { x: 1.5, y: -1.5 },
                    MT: { x: 0, y: 1 }, ST: { x: 0, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                  },
                  per: {
                    D3: { th: "รอวงรอบสองจบ แล้วเข้ากลางฝั่งของตัวเอง",
                          en: "Wait out the second set, then come in on your own side." },
                    D4: { th: "รอวงรอบสองจบ แล้วเข้ากลาง",
                          en: "Wait out the second set, then come in." },
                    H1: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียม heal ต่อทันที",
                          en: "Wait it out, come in, and be ready to heal straight away." },
                    H2: { th: "รอวงรอบสองจบ แล้วเข้ากลาง เตรียมโล่",
                          en: "Wait it out, come in, shields up." },
                    MT: { th: "อยู่กลางแล้ว เว้นที่ให้ ranged เข้ามา",
                          en: "Already in. Leave room for the ranged." },
                  },
                  wrong: {
                    th: "ranged เข้ากลางหลังวงค้างคาวรอบสองจบ ไม่ใช่พร้อม melee",
                    en: "Ranged come in after the second bat wave, not together with the melee.",
                  },
                },
                {
                  id: "stack",
                  label: { th: "4 — Brutal Rain รวมรับ", en: "4 — stack for Brutal Rain" },
                  say: {
                    th: "Brutal Rain สุ่มเป้า แล้วแชร์ดาเมจทั้งปาร์ตี้ — ต้องรวมกันครบ 8 คน "
                      + "จำนวนครั้งเพิ่มขึ้นทีละ 1 ทุกครั้งที่บอสร่ายซ้ำ (Game8 ว่ารอบแรก 3 ครั้ง) "
                      + "เพราะฉะนั้นรอบหลังๆ ต้องใส่ mitigation หนักขึ้นเรื่อยๆ",
                    en: "Brutal Rain picks a random target and is shared by the whole party, so "
                      + "all eight gather. It gains a hit every time the boss casts it again — "
                      + "Game8 gives three for the first — so later ones need steadily more "
                      + "mitigation than the first.",
                  },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  per: {
                    MT: { th: "mitigation กลุ่ม รอบหลังๆ ต้องใส่หนักกว่ารอบแรก",
                          en: "Group mitigation, and more of it each time round." },
                    ST: { th: "แบ่ง mitigation กับ MT ให้ครอบคลุมรอบถัดๆ ไปด้วย",
                          en: "Split cooldowns with MT so the later casts are covered too." },
                    H1: { th: "เป้าสุ่ม ไม่ใช่ healer เสมอ — heal ทั้งตี้ไว้ก่อน",
                          en: "The target is random, so heal the party rather than one person." },
                    H2: { th: "โล่ก่อนร่ายจบ", en: "Shields before the cast lands." },
                  },
                  wrong: {
                    th: "ท่านี้แชร์ ต้องรวมกันครบ 8 คน ไม่ใช่หลบ",
                    en: "This one is shared — all eight together, not dodged.",
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "torches",
      name: "คบไฟ + Ether Letting",
      enter: "หลัง Brutal Rain",
      note: "สนามแคบลงเรื่อยๆ และ Ether Letting ต้องจำ waymark ของตัวเอง",
      mechanics: [
        {
          id: "screech-1",
          name: "Sadistic Screech 1 (サディスティック・スクリーチ)",
          at: "1:30",
          tags: ["cleave", "memo"],
          what: "วงล้อคบไฟยิงลำแสงเป็นคู่ สองระลอกติดกัน พร้อมกับบอสกวาดครึ่งวงกลม "
              + "ท่านี้มา 3 รอบ: รอบแรกฝั่งตะวันออก รอบสองฝั่งตะวันตก รอบสามด้านหลัง "
              + "หลังรอบสามต้องทำลายวงล้อ",
          dies: "ทำลายวงล้อได้แล้วลืมว่าครึ่งวงกลมของบอสยังมาอยู่ — มันไม่ได้หายไปกับวงล้อ",
          variants: [
            {
              id: "east",
              tell: "รอบแรก — ลำแสงมาจากฝั่งตะวันออก",
              steps: [
                {
                  id: "dodge",
                  label: "หลบ",
                  say: "ข้ามไปครึ่งตะวันตกทั้งปาร์ตี้ แล้วดูครึ่งวงกลมของบอสด้วย",
                  danger: [{ kind: "half", facing: 90 }],
                  safe: {
                    MT: { x: -5, y: 2.5 }, ST: { x: -7.5, y: 2.5 },
                    H1: { x: -7.5, y: -2.5 }, H2: { x: -5, y: -5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: -5, y: 0 },
                    D3: { x: -7.5, y: 5 }, D4: { x: -7.5, y: -5 },
                  },
                  per: { MT: "ลากบอสไปฝั่งตะวันตกก่อนลำแสงลง" },
                  wrong: "ฝั่งนั้นคือฝั่งที่ลำแสงลง — ต้องข้ามไปครึ่งตรงข้ามทั้งตัว",
                },
              ],
            },
            {
              id: "west",
              tell: "รอบสอง — ลำแสงมาจากฝั่งตะวันตก",
              steps: [
                {
                  id: "dodge",
                  label: "หลบ",
                  say: "ข้ามไปครึ่งตะวันออกทั้งปาร์ตี้",
                  danger: [{ kind: "half", facing: 270 }],
                  safe: {
                    MT: { x: 5, y: 2.5 }, ST: { x: 7.5, y: 2.5 },
                    H1: { x: 7.5, y: -2.5 }, H2: { x: 5, y: -5 },
                    D1: { x: 2.5, y: 0 }, D2: { x: 5, y: 0 },
                    D3: { x: 7.5, y: 5 }, D4: { x: 7.5, y: -5 },
                  },
                  per: { MT: "ลากบอสไปฝั่งตะวันออก" },
                  wrong: "ฝั่งนั้นคือฝั่งที่ลำแสงลง — ต้องข้ามไปครึ่งตรงข้าม",
                },
              ],
            },
            {
              id: "rear",
              tell: "รอบสาม — ลำแสงมาจากด้านหลัง (ใต้)",
              steps: [
                {
                  id: "dodge",
                  label: "หลบ",
                  say: "ขึ้นครึ่งเหนือ แล้วทำลายวงล้อหลังจบระลอกนี้",
                  danger: [{ kind: "half", facing: 180 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, ST: { x: -2.5, y: 5 },
                    H1: { x: -5, y: 5 }, H2: { x: 5, y: 5 },
                    D1: { x: -2.5, y: 2.5 }, D2: { x: 2.5, y: 2.5 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                  },
                  wrong: "ครึ่งใต้คือฝั่งที่ลำแสงลง — ขึ้นเหนือ",
                },
              ],
            },
          ],
        },

        {
          id: "ether-letting",
          name: "Ether Letting (エーテルレッティング)",
          at: "2:10",
          tags: ["spread", "stack", "memo"],
          what: "ทุกคนได้มาร์คบอกทิศ ต้องเอาไปวางที่จุดตัดระหว่างช่องว่างของพัดกับขอบสนาม "
              + "ระวังพัดที่กำลังขยาย วางครบแล้วกลางสนามจะปลอดภัยถาวร แล้วทุกคนรวมกลาง",
          dies: "วางไม่ตรงจุด ทำให้ลำแสงทับกันแล้วมีช่องโหว่ หรือกลับกลางช้าไม่ทันดาเมจกลุ่ม",
          variants: [
            {
              id: "cardinals",
              tell: "ช่องว่างของพัดอยู่ที่ 4 ทิศหลัก — วางที่ A B C D",
              steps: [
                {
                  id: "place",
                  label: "1 — วางที่ขอบ",
                  say: "แต่ละคนพามาร์คไป waymark ของตัวเองที่ขอบสนาม อย่าเดินผ่านพัด",
                  danger: [
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 135, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 225, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 315, angle: 60 },
                  ],
                  safe: {
                    MT: { x: 0, y: 8.6 }, ST: { x: 8.6, y: 0 },
                    H1: { x: 0, y: -8.6 }, H2: { x: -8.6, y: 0 },
                    D1: { x: 0, y: 6.5 }, D2: { x: 6.5, y: 0 },
                    D3: { x: 0, y: -6.5 }, D4: { x: -6.5, y: 0 },
                  },
                  per: {
                    MT: "ไป A (เหนือ) วางแล้วรีบกลับ",
                    ST: "ไป B (ตะวันออก)",
                    H1: "ไป C (ใต้)",
                    H2: "ไป D (ตะวันตก)",
                    D1: "ตามหลัง MT ที่ทิศเหนือ อย่าทับกัน",
                    D2: "ตามหลัง ST ที่ทิศตะวันออก",
                    D3: "ตามหลัง H1 ที่ทิศใต้",
                    D4: "ตามหลัง H2 ที่ทิศตะวันตก",
                  },
                  wrong: "อยู่ในพัด — ที่ปลอดภัยคือช่องว่างระหว่างพัด ตรงกับ waymark พอดี",
                },
                {
                  id: "regroup",
                  label: "2 — รวมกลาง",
                  say: "วางครบแล้วกลางสนามปลอดภัยถาวร ทุกคนกลับมารวมรับดาเมจกลุ่ม",
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  wrong: "วางเสร็จแล้วต้องกลับกลาง ไม่ใช่ค้างที่ขอบ",
                },
              ],
            },
            {
              id: "intercards",
              tell: "ช่องว่างของพัดอยู่ที่ 4 มุมเฉียง — วางที่ 1 2 3 4",
              steps: [
                {
                  id: "place",
                  label: "1 — วางที่มุม",
                  say: "รอบนี้ช่องว่างอยู่แนวเฉียง วางที่มาร์คตัวเลขแทน",
                  danger: [
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 0, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 90, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 180, angle: 60 },
                    { kind: "cone", at: { x: 0, y: 0 }, facing: 270, angle: 60 },
                  ],
                  safe: {
                    MT: { x: 5, y: 5 }, ST: { x: 5, y: -5 },
                    H1: { x: -5, y: -5 }, H2: { x: -5, y: 5 },
                    D1: { x: 7, y: 7 }, D2: { x: 7, y: -7 },
                    D3: { x: -7, y: -7 }, D4: { x: -7, y: 7 },
                  },
                  per: {
                    MT: "ไปมาร์ค 1 (มุมตะวันออกเฉียงเหนือ)",
                    ST: "ไปมาร์ค 2 (มุมตะวันออกเฉียงใต้)",
                    H1: "ไปมาร์ค 3 (มุมตะวันตกเฉียงใต้)",
                    H2: "ไปมาร์ค 4 (มุมตะวันตกเฉียงเหนือ)",
                  },
                  wrong: "รอบนี้พัดอยู่ 4 ทิศหลัก ที่ปลอดภัยเลยเป็นมุมเฉียง",
                },
                {
                  id: "regroup",
                  label: "2 — รวมกลาง",
                  say: "วางครบแล้วกลับมารวมกลาง",
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  wrong: "วางเสร็จแล้วต้องกลับกลาง",
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "towers",
      name: "หอคอย",
      enter: "หลัง Ether Letting",
      note: "สองท่าที่ต้องแบ่งหน้าที่ล่วงหน้า — ตกลงกันก่อนเข้าไฟต์",
      mechanics: [
        {
          id: "screech-2",
          name: "Sadistic Screech 2",
          at: "3:00",
          tags: ["tower", "adds", "aoe"],
          what: "แบ่งงานตามกลุ่ม: กลุ่ม MT (MT H1 D1 D3) รับฝั่งเหนือ "
              + "กลุ่ม ST (ST H2 D2 D4) รับฝั่งใต้ — melee ทุบลูกบอล tank เหยียบหอคอย "
              + "ranged จัดการเป้าระยะไกล พร้อมกับเลื่อยที่หมุนไล่ตลอด",
          dies: "โดนเลื่อยบาดพร้อมกับ AoE ทั้งสนามลงพอดี เลือดหายเร็วเกินกว่าจะ heal ตาม",
          variants: [
            {
              id: "split",
              tell: "ลูกบอล หอคอย และเป้าระยะไกล เกิดพร้อมกันทั้งสองฝั่ง",
              steps: [
                {
                  id: "assign",
                  label: "แยกงาน",
                  say: "กลุ่ม MT ขึ้นเหนือ กลุ่ม ST ลงใต้ แต่ละกลุ่มมี tank เหยียบหอคอย "
                     + "melee ทุบลูกบอล ranged เก็บเป้าไกล — และหลบเลื่อยตลอดเวลา",
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, H1: { x: -5, y: 5 },
                    D1: { x: -2.5, y: 5 }, D3: { x: -7.5, y: 7.5 },
                    ST: { x: 0, y: -7.5 }, H2: { x: 5, y: -5 },
                    D2: { x: 2.5, y: -5 }, D4: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: "ขึ้นเหนือ เหยียบหอคอยฝั่งเหนือ",
                    ST: "ลงใต้ เหยียบหอคอยฝั่งใต้",
                    D1: "ขึ้นเหนือ ทุบลูกบอลให้แตกก่อนร่ายจบ",
                    D2: "ลงใต้ ทุบลูกบอลฝั่งใต้",
                    D3: "ขึ้นเหนือ ยิงเป้าระยะไกล ระวังเลื่อย",
                    D4: "ลงใต้ ยิงเป้าระยะไกล",
                    H1: "ขึ้นเหนือ เตรียม heal หนัก ตอน AoE ซ้อนเลื่อย",
                    H2: "ลงใต้ เตรียมโล่กลุ่ม",
                  },
                  wrong: "ผิดฝั่ง — กลุ่ม MT (MT H1 D1 D3) เหนือ กลุ่ม ST (ST H2 D2 D4) ใต้",
                },
              ],
            },
          ],
        },

        {
          id: "hell-in-a-cell",
          name: "Hell in a Cell (ヘル・イン・ア・セル)",
          at: "3:40",
          tags: ["tower", "spread", "stack", "tankbuster"],
          what: "หอคอยสองชุด ชุดละ 4 ต้น — กลุ่ม MT เข้าชุดแรก กลุ่ม ST ตามชุดสอง "
              + "เข้าจากตำแหน่ง 12 นาฬิกาไล่ตามเข็ม ลำดับ T → melee → ranged → healer "
              + "อีก 4 คนที่ไม่เหยียบ ชุดแรกโดนแยก ชุดสองโดนรวม "
              + "และมีพัดใส่ tank ต้องยืนที่ช่องปลอดภัยกว้างที่สุด",
          dies: "เข้าหอคอยพร้อมกันทั้ง 8 คน — ชุดแรกเป็นของกลุ่ม MT เท่านั้น ชุดสองเลยว่าง",
          variants: [
            {
              id: "first",
              tell: "หอคอยชุดแรกขึ้น — กลุ่ม MT เหยียบ อีก 4 คนโดนแยก",
              steps: [
                {
                  id: "towers",
                  label: "1 — ชุดแรก + แยก",
                  say: "กลุ่ม MT เข้าหอคอยที่ 12/3/6/9 นาฬิกา ไล่ตามเข็มจาก 12 "
                     + "กลุ่ม ST แยกออกไปรับวงเดี่ยวที่มุม",
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, H1: { x: 7.5, y: 0 },
                    D1: { x: 0, y: -7.5 }, D3: { x: -7.5, y: 0 },
                    ST: { x: 5.5, y: 5.5 }, H2: { x: 5.5, y: -5.5 },
                    D2: { x: -5.5, y: -5.5 }, D4: { x: -5.5, y: 5.5 },
                  },
                  per: {
                    MT: "เข้าหอคอย 12 นาฬิกา — คนแรกของลำดับ",
                    D1: "เข้าหอคอยถัดไปตามเข็ม (melee ตาม tank)",
                    D3: "เข้าหอคอยถัดจาก melee",
                    H1: "เข้าหอคอยสุดท้ายของชุด",
                    ST: "ไม่เหยียบ — ออกไปมุมรับวงเดี่ยว เตรียม cooldown รับพัด",
                    H2: "ไม่เหยียบ — แยกไปมุม อย่ายืนติดใคร",
                    D2: "ไม่เหยียบ — แยกไปมุม",
                    D4: "ไม่เหยียบ — แยกไปมุม",
                  },
                  wrong: "หอคอยอยู่ที่ 12/3/6/9 นาฬิกาบนขอบ และชุดแรกเป็นของกลุ่ม MT",
                },
              ],
            },
            {
              id: "second",
              tell: "หอคอยชุดสองขึ้น — กลุ่ม ST เหยียบ อีก 4 คนโดนรวม",
              steps: [
                {
                  id: "towers",
                  label: "2 — ชุดสอง + รวม",
                  say: "กลุ่ม ST เข้าหอคอยชุดสอง กลุ่ม MT รวมกันรับดาเมจแชร์",
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    ST: { x: 0, y: 7.5 }, H2: { x: 7.5, y: 0 },
                    D2: { x: 0, y: -7.5 }, D4: { x: -7.5, y: 0 },
                    MT: { x: -5, y: 5 }, H1: { x: -6, y: 5 },
                    D1: { x: -5, y: 4 }, D3: { x: -6, y: 4 },
                  },
                  per: {
                    ST: "เข้าหอคอย 12 นาฬิกา ไล่ตามเข็มเหมือนชุดแรก",
                    D2: "เข้าหอคอยถัดไปตามเข็ม",
                    D4: "เข้าหอคอยถัดจาก melee",
                    H2: "เข้าหอคอยสุดท้าย",
                    MT: "รวมกับกลุ่ม MT รับดาเมจแชร์ กด mitigation",
                    H1: "รวมกับกลุ่ม MT heal ทันทีหลังรับ",
                  },
                  wrong: "ชุดนี้เป็นของกลุ่ม ST ส่วนกลุ่ม MT ต้องรวมกันรับแชร์",
                },
              ],
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
          tags: ["memo", "cleave", "adds"],
          what: "MT เข้าหอคอยมุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้ "
              + "ทุกคนถือเชือกไว้อย่าให้ยืดเกิน แล้วหลบพัด 5 ระลอกด้วยแพทเทิร์น "
              + "\"ที่ปลอดภัยข้างๆ → เว้นไปสองช่อง\" ระลอกที่ 4 ติดมาร์ควงกลม/โดนัท "
              + "ระลอกที่ 5 คือตอนระเบิด",
          dies: "อ่านมาร์ครอบ 4 ผิด — วงกลมต้องเข้าหาบอส โดนัทต้องออกไปหาค้างคาว",
          variants: [
            {
              id: "circle",
              tell: "ระลอก 4 ติดมาร์ควงกลม — ต้องเข้าใกล้บอส",
              steps: [
                {
                  id: "tether",
                  label: "1 — เข้าหอคอย ถือเชือก",
                  say: "MT เข้ามุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้ "
                     + "caster ยืนใกล้ต้นเชือกจะได้ไม่ต้องวิ่งไกล",
                  danger: [],
                  safe: {
                    MT: { x: -7.5, y: 7.5 }, ST: { x: 7.5, y: -7.5 },
                    H1: { x: -5, y: 2.5 }, H2: { x: 5, y: -2.5 },
                    D1: { x: -2.5, y: 5 }, D2: { x: 2.5, y: -5 },
                    D3: { x: -5, y: 5 }, D4: { x: 5, y: -5 },
                  },
                  per: {
                    MT: "หอคอยมุมตะวันตกเฉียงเหนือ",
                    ST: "หอคอยมุมตะวันออกเฉียงใต้",
                    D4: "ยืนใกล้ต้นเชือก ลดระยะวิ่งตอนหลบพัด",
                  },
                },
                {
                  id: "fans",
                  label: "2 — หลบพัด 5 ระลอก",
                  say: "แพทเทิร์นคงที่: ไปที่ปลอดภัยข้างๆ ก่อน แล้วเว้นไปสองช่อง สลับไปเรื่อยๆ",
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 90 }],
                  safe: {
                    MT: { x: -5, y: 5 }, ST: { x: -5, y: -5 },
                    H1: { x: -7, y: 3 }, H2: { x: -7, y: -3 },
                    D1: { x: -3, y: 3 }, D2: { x: -3, y: -3 },
                    D3: { x: -8, y: 0 }, D4: { x: -5.5, y: 0 },
                  },
                  wrong: "ยังอยู่ในพัด — ขยับไปช่องปลอดภัยที่อยู่ติดกันก่อน",
                },
                {
                  id: "resolve",
                  label: "3 — วงกลม: เข้าหาบอส",
                  say: "ระลอกที่ 5 มาพร้อมมาร์คระเบิด — วงกลมแปลว่าต้องเข้าใกล้บอส",
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 4 }],
                  safe: {
                    MT: { x: 0, y: 1.5 }, ST: { x: -1.5, y: 1 },
                    H1: { x: -1.5, y: -1 }, H2: { x: 1.5, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: 0, y: -2 }, D4: { x: 1.5, y: 1 },
                  },
                  wrong: "วงกลมคือต้องเข้าใกล้บอส ไม่ใช่ออกไปขอบ",
                },
              ],
            },
            {
              id: "donut",
              tell: "ระลอก 4 ติดมาร์คโดนัท — ต้องออกไปหาค้างคาว",
              steps: [
                {
                  id: "tether",
                  label: "1 — เข้าหอคอย ถือเชือก",
                  say: "เหมือนเดิม MT มุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้",
                  danger: [],
                  safe: {
                    MT: { x: -7.5, y: 7.5 }, ST: { x: 7.5, y: -7.5 },
                    H1: { x: -5, y: 2.5 }, H2: { x: 5, y: -2.5 },
                    D1: { x: -2.5, y: 5 }, D2: { x: 2.5, y: -5 },
                    D3: { x: -5, y: 5 }, D4: { x: 5, y: -5 },
                  },
                },
                {
                  id: "fans",
                  label: "2 — หลบพัด 5 ระลอก",
                  say: "แพทเทิร์นเดิม: ข้างๆ ก่อน แล้วเว้นสองช่อง",
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 225, angle: 90 }],
                  safe: {
                    MT: { x: 5, y: -5 }, ST: { x: 5, y: 5 },
                    H1: { x: 7, y: -3 }, H2: { x: 7, y: 3 },
                    D1: { x: 3, y: -3 }, D2: { x: 3, y: 3 },
                    D3: { x: 8, y: 0 }, D4: { x: 5.5, y: 0 },
                  },
                  wrong: "ยังอยู่ในพัด — ไปช่องปลอดภัยที่ติดกันก่อน",
                },
                {
                  id: "resolve",
                  label: "3 — โดนัท: ออกไปหาค้างคาว",
                  say: "โดนัทแปลว่ากลางไม่ปลอดภัย ต้องออกไประยะ melee ของค้างคาว",
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 5.5 }],
                  safe: {
                    MT: { x: -7.5, y: 7.5 }, ST: { x: 7.5, y: -7.5 },
                    H1: { x: -7.5, y: 0 }, H2: { x: 7.5, y: 0 },
                    D1: { x: 0, y: 7.5 }, D2: { x: 0, y: -7.5 },
                    D3: { x: -7.5, y: -7.5 }, D4: { x: 7.5, y: 7.5 },
                  },
                  wrong: "โดนัทคือกลางอันตราย ต้องออกไปขอบหาค้างคาว",
                },
              ],
            },
          ],
        },

        {
          id: "sanguine-scratch",
          name: "Sanguine Scratch (サングインスクラッチ)",
          at: "5:10",
          tags: ["cleave"],
          what: "ไม่มีเชือกเหมือนท่าก่อน เป็นการหลบสลับซ้ายขวาล้วนๆ อ่านจากตัวบอสอย่างเดียว",
          dies: "ขยับก่อนบอสเริ่มเหวี่ยง — ท่านี้ต้องรอให้เห็นทิศก่อนแล้วค่อยไป",
          variants: [
            {
              id: "left",
              tell: "บอสเหวี่ยงจากซ้าย",
              steps: [
                {
                  id: "dodge",
                  label: "หลบขวา",
                  say: "ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง แล้วรอระลอกถัดไป",
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 315, angle: 150 }],
                  safe: {
                    MT: { x: 5, y: -4 }, ST: { x: 6.5, y: -3 },
                    H1: { x: 6, y: -6 }, H2: { x: 4, y: -6.5 },
                    D1: { x: 3, y: -3 }, D2: { x: 4.5, y: -2 },
                    D3: { x: 7.5, y: -4.5 }, D4: { x: 5.5, y: -7.5 },
                  },
                  wrong: "ยังอยู่ในพัด — ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง",
                },
              ],
            },
            {
              id: "right",
              tell: "บอสเหวี่ยงจากขวา",
              steps: [
                {
                  id: "dodge",
                  label: "หลบซ้าย",
                  say: "ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง",
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 150 }],
                  safe: {
                    MT: { x: -5, y: -4 }, ST: { x: -6.5, y: -3 },
                    H1: { x: -6, y: -6 }, H2: { x: -4, y: -6.5 },
                    D1: { x: -3, y: -3 }, D2: { x: -4.5, y: -2 },
                    D3: { x: -7.5, y: -4.5 }, D4: { x: -5.5, y: -7.5 },
                  },
                  wrong: "ยังอยู่ในพัด — ไปฝั่งตรงข้าม",
                },
              ],
            },
          ],
        },

        {
          id: "enrage",
          name: "Enrage",
          at: "6:00",
          tags: ["enrage", "aoe"],
          what: "AoE ทั้งสนามสองครั้งก่อนหมดเวลา — ถ้ามาถึงตรงนี้แปลว่า DPS ไม่พอ",
          dies: "ไม่ใช่ท่าที่หลบได้ ต้องไปแก้ที่ดาเมจในช่วงก่อนหน้า",
          variants: [
            {
              id: "only",
              tell: "บอสร่ายยาว ไม่มีวงบอกตำแหน่ง",
              steps: [
                {
                  id: "cast",
                  label: "รับ",
                  say: "กด cooldown ที่เหลือทั้งหมด แล้วดันดาเมจให้สุด",
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2 }, ST: { x: -1.5, y: 2 },
                    H1: { x: -2, y: -2 }, H2: { x: 2, y: -2 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: -4, y: -4 }, D4: { x: 4, y: -4 },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
