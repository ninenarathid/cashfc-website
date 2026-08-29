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
      name: { th: "เปิดไฟต์", en: "Opening" },
      enter: "100%",
      note: { th: "ท่าพื้นฐาน จัดตำแหน่งยืนประจำให้ติดก่อน", en: "The basics. Get everybody used to their standing spot before anything else." },
      mechanics: [
        {
          id: "killer-voice",
          name: "Killer Voice (キラーボイス)",
          at: "0:10",
          tags: ["aoe"],
          what: { th: "AoE ทั้งสนาม มาบ่อยมากตลอดไฟต์ ไม่ต้องหลบแต่ห้ามกินเปล่า "
              + "ต้องมี mitigation ทุกครั้ง", en: "Raidwide, and it comes round often. Nothing to dodge, but never take it bare — it wants mitigation every single time." },
          dies: { th: "กินเปล่าเพราะคิดว่าแรงน้อย แล้วเลือดไม่พอรับท่าถัดไปที่มาติดกัน", en: "Taking it bare because it looks small, then not having the health left for whatever lands immediately after it." },
          variants: [
            {
              id: "only",
              tell: { th: "บอสร่ายกลางสนาม ไม่มีวงบอกตำแหน่ง", en: "The boss casts in the middle with no markers on the floor" },
              steps: [
                {
                  id: "cast",
                  label: { th: "รับ", en: "Take it" },
                  say: { th: "ยืนตำแหน่งประจำ ไม่ต้องขยับ — ใส่ mitigation ให้ตรงจังหวะร่าย", en: "Stay where you are. Time the mitigation to the cast." },
                  danger: [],
                  safe: {
                    MT: { x: 0, y: 2.5 }, ST: { x: -1.5, y: 2.5 },
                    H1: { x: -3, y: -3 }, H2: { x: 3, y: -3 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: -6, y: -5 }, D4: { x: 6, y: -5 },
                  },
                  per: {
                    MT: { th: "ถือบอสไว้กลาง หันหน้าออกจากปาร์ตี้", en: "Hold the boss centre, facing away from the party." },
                    ST: { th: "เตรียม mitigation กลุ่ม สลับกับ MT", en: "Group mitigation, alternating with MT." },
                    H1: { th: "AoE heal หลังท่าจบ", en: "Raid heal once it lands." },
                    H2: { th: "โล่ก่อนร่ายจบ", en: "Shields before the cast finishes." },
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
          what: { th: "Tank buster ใส่เป้าเดียว รัศมีขยายตาม stack ที่บอสสะสม "
              + "0–4 stack วงเล็ก แต่ 8 stack ขึ้นไปกินกว้างถึง 4 ช่อง "
              + "ทั้งสอง tank ถือ aggro ไว้ (ST ยืนที่ 2)", en: "A single-target tank buster whose radius grows with the boss's stacks. At 0–4 the circle is small; at 8 or more it covers about four tiles. Both tanks keep aggro, with ST second on the list." },
          dies: { th: "คนอื่นยืนใกล้ tank ด้วยระยะที่เคยพอตอน stack น้อย — พอ stack เยอะวงมันโตกว่านั้นมาก", en: "Standing the distance from the tank that was fine at low stacks. At high stacks the circle is far bigger than the one you remember." },
          variants: [
            {
              id: "low-stack",
              tell: { th: "บอสมี 0–4 stack — วงเล็ก ประมาณ 1 ช่อง", en: "The boss has 0–4 stacks — a small circle, about one tile" },
              steps: [
                {
                  id: "spread",
                  label: { th: "แยก", en: "Spread" },
                  say: { th: "tank ที่โดนลากออกไปขอบ คนอื่นถอยพ้นวง", en: "The tank being hit drags it to the edge; everybody else backs out of the circle." },
                  danger: [{ kind: "circle", at: { x: 0, y: 7.5 }, r: 3.5 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, ST: { x: -2.5, y: 5 },
                    H1: { x: -3, y: -1 }, H2: { x: 3, y: -1 },
                    D1: { x: -1.5, y: 1 }, D2: { x: 1.5, y: 1 },
                    D3: { x: -6, y: -3 }, D4: { x: 6, y: -3 },
                  },
                  per: {
                    MT: { th: "รับเอง ลากไปขอบเหนือ กด cooldown ป้องกัน", en: "Take it yourself, drag it to the north edge, personal cooldown." },
                    ST: { th: "ยืนที่ 2 ถือ aggro ไว้ พร้อมสลับถ้า debuff ซ้อน", en: "Second on aggro, ready to swap if the debuff would stack." },
                    H1: { th: "heal MT ให้เต็มก่อนร่ายจบ", en: "MT topped up before the cast finishes." },
                    H2: { th: "โล่ MT", en: "Shield the MT." },
                  },
                  wrong: { th: "ยังอยู่ในวง — ทุกคนที่ไม่ใช่ tank ต้องออกให้พ้น", en: "Still inside the circle. Everybody who is not the tank has to be clear of it." },
                },
              ],
            },
            {
              id: "high-stack",
              tell: { th: "บอสมี 8 stack ขึ้นไป — วงกินกว้างราว 4 ช่อง", en: "The boss has 8 or more stacks — the circle covers about four tiles" },
              steps: [
                {
                  id: "spread",
                  label: { th: "แยกให้ไกล", en: "Spread wide" },
                  say: { th: "วงใหญ่กว่าเดิมมาก tank ไปสุดขอบ ทุกคนไปครึ่งตรงข้าม", en: "Much bigger than before: the tank goes to the far edge and everybody else takes the opposite half." },
                  danger: [{ kind: "circle", at: { x: 0, y: 7.5 }, r: 7 }],
                  safe: {
                    MT: { x: 0, y: 8.5 }, ST: { x: -3, y: -6 },
                    H1: { x: -6, y: -7.5 }, H2: { x: 6, y: -7.5 },
                    D1: { x: -1.5, y: -8 }, D2: { x: 1.5, y: -8 },
                    D3: { x: -8, y: -5 }, D4: { x: 8, y: -5 },
                  },
                  per: {
                    MT: { th: "ไปสุดขอบเหนือ กด invuln ถ้า stack เต็ม", en: "All the way to the north edge, and invuln if the stacks are full." },
                    ST: { th: "ลงมาครึ่งใต้กับปาร์ตี้ ไม่ต้องเข้าใกล้", en: "Come down to the south half with the party; no need to be near it." },
                  },
                  wrong: { th: "ระยะที่พอตอน stack น้อยไม่พอตอน stack เยอะ — ต้องถอยไปสุดครึ่งตรงข้าม", en: "The distance that was enough at low stacks is not enough now. Go all the way to the opposite half." },
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
      name: { th: "คบไฟ + Ether Letting", en: "Torches and Ether Letting" },
      enter: { th: "หลัง Brutal Rain", en: "After Brutal Rain" },
      note: { th: "สนามแคบลงเรื่อยๆ และ Ether Letting ต้องจำ waymark ของตัวเอง", en: "The arena keeps narrowing, and Ether Letting asks everybody to know their own waymark." },
      mechanics: [
        {
          id: "screech-1",
          name: "Sadistic Screech 1 (サディスティック・スクリーチ)",
          at: "1:30",
          tags: ["cleave", "memo"],
          what: { th: "วงล้อคบไฟยิงลำแสงเป็นคู่ สองระลอกติดกัน พร้อมกับบอสกวาดครึ่งวงกลม "
              + "ท่านี้มา 3 รอบ: รอบแรกฝั่งตะวันออก รอบสองฝั่งตะวันตก รอบสามด้านหลัง "
              + "หลังรอบสามต้องทำลายวงล้อ", en: "The torch wheels fire beams in pairs, two waves back to back, while the boss sweeps a half-circle. It comes three times: east first, then west, then from behind. After the third the wheels have to be destroyed." },
          dies: { th: "ทำลายวงล้อได้แล้วลืมว่าครึ่งวงกลมของบอสยังมาอยู่ — มันไม่ได้หายไปกับวงล้อ", en: "Destroying the wheels and forgetting the boss's half-circle is still coming. It does not go away with them." },
          variants: [
            {
              id: "east",
              tell: { th: "รอบแรก — ลำแสงมาจากฝั่งตะวันออก", en: "First set — the beams come from the east" },
              steps: [
                {
                  id: "dodge",
                  label: { th: "หลบ", en: "Dodge" },
                  say: { th: "ข้ามไปครึ่งตะวันตกทั้งปาร์ตี้ แล้วดูครึ่งวงกลมของบอสด้วย", en: "The whole party crosses to the west half — and watch the boss's half-circle as well." },
                  danger: [{ kind: "half", facing: 90 }],
                  safe: {
                    MT: { x: -5, y: 2.5 }, ST: { x: -7.5, y: 2.5 },
                    H1: { x: -7.5, y: -2.5 }, H2: { x: -5, y: -5 },
                    D1: { x: -2.5, y: 0 }, D2: { x: -5, y: 0 },
                    D3: { x: -7.5, y: 5 }, D4: { x: -7.5, y: -5 },
                  },
                  per: { MT: { th: "ลากบอสไปฝั่งตะวันตกก่อนลำแสงลง", en: "Drag the boss west before the beams land." } },
                  wrong: { th: "ฝั่งนั้นคือฝั่งที่ลำแสงลง — ต้องข้ามไปครึ่งตรงข้ามทั้งตัว", en: "That is the side the beams land on. Cross fully to the other half." },
                },
              ],
            },
            {
              id: "west",
              tell: { th: "รอบสอง — ลำแสงมาจากฝั่งตะวันตก", en: "Second set — the beams come from the west" },
              steps: [
                {
                  id: "dodge",
                  label: { th: "หลบ", en: "Dodge" },
                  say: { th: "ข้ามไปครึ่งตะวันออกทั้งปาร์ตี้", en: "The whole party crosses to the east half." },
                  danger: [{ kind: "half", facing: 270 }],
                  safe: {
                    MT: { x: 5, y: 2.5 }, ST: { x: 7.5, y: 2.5 },
                    H1: { x: 7.5, y: -2.5 }, H2: { x: 5, y: -5 },
                    D1: { x: 2.5, y: 0 }, D2: { x: 5, y: 0 },
                    D3: { x: 7.5, y: 5 }, D4: { x: 7.5, y: -5 },
                  },
                  per: { MT: { th: "ลากบอสไปฝั่งตะวันออก", en: "Drag the boss east." } },
                  wrong: { th: "ฝั่งนั้นคือฝั่งที่ลำแสงลง — ต้องข้ามไปครึ่งตรงข้าม", en: "That is the side the beams land on. Cross to the other half." },
                },
              ],
            },
            {
              id: "rear",
              tell: { th: "รอบสาม — ลำแสงมาจากด้านหลัง (ใต้)", en: "Third set — the beams come from behind, the south" },
              steps: [
                {
                  id: "dodge",
                  label: { th: "หลบ", en: "Dodge" },
                  say: { th: "ขึ้นครึ่งเหนือ แล้วทำลายวงล้อหลังจบระลอกนี้", en: "Move to the north half, and destroy the wheels once this set is done." },
                  danger: [{ kind: "half", facing: 180 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, ST: { x: -2.5, y: 5 },
                    H1: { x: -5, y: 5 }, H2: { x: 5, y: 5 },
                    D1: { x: -2.5, y: 2.5 }, D2: { x: 2.5, y: 2.5 },
                    D3: { x: -7.5, y: 7.5 }, D4: { x: 7.5, y: 7.5 },
                  },
                  wrong: { th: "ครึ่งใต้คือฝั่งที่ลำแสงลง — ขึ้นเหนือ", en: "The south half is where the beams land. Go north." },
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
          what: { th: "ทุกคนได้มาร์คบอกทิศ ต้องเอาไปวางที่จุดตัดระหว่างช่องว่างของพัดกับขอบสนาม "
              + "ระวังพัดที่กำลังขยาย วางครบแล้วกลางสนามจะปลอดภัยถาวร แล้วทุกคนรวมกลาง", en: "Everybody gets a directional marker to carry to where the gap between the fans meets the outer wall, keeping clear of the fans as they widen. Once all eight are placed the centre is safe for good, and the party gathers there." },
          dies: { th: "วางไม่ตรงจุด ทำให้ลำแสงทับกันแล้วมีช่องโหว่ หรือกลับกลางช้าไม่ทันดาเมจกลุ่ม", en: "Placing off the mark, so two beams overlap and leave a hole — or getting back to the centre too late for the shared damage." },
          variants: [
            {
              id: "cardinals",
              tell: { th: "ช่องว่างของพัดอยู่ที่ 4 ทิศหลัก — วางที่ A B C D", en: "The gaps are on the four cardinals — place at A, B, C and D" },
              steps: [
                {
                  id: "place",
                  label: { th: "1 — วางที่ขอบ", en: "1 — place at the edge" },
                  say: { th: "แต่ละคนพามาร์คไป waymark ของตัวเองที่ขอบสนาม อย่าเดินผ่านพัด", en: "Each person carries their marker to their own waymark on the wall, without walking through a fan." },
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
                    MT: { th: "ไป A (เหนือ) วางแล้วรีบกลับ", en: "Take A, north. Place it and come straight back." },
                    ST: { th: "ไป B (ตะวันออก)", en: "Take B, east." },
                    H1: { th: "ไป C (ใต้)", en: "Take C, south." },
                    H2: { th: "ไป D (ตะวันตก)", en: "Take D, west." },
                    D1: { th: "ตามหลัง MT ที่ทิศเหนือ อย่าทับกัน", en: "Follow MT north, without landing on them." },
                    D2: { th: "ตามหลัง ST ที่ทิศตะวันออก", en: "Follow ST east." },
                    D3: { th: "ตามหลัง H1 ที่ทิศใต้", en: "Follow H1 south." },
                    D4: { th: "ตามหลัง H2 ที่ทิศตะวันตก", en: "Follow H2 west." },
                  },
                  wrong: { th: "อยู่ในพัด — ที่ปลอดภัยคือช่องว่างระหว่างพัด ตรงกับ waymark พอดี", en: "That is inside a fan. The safe line is the gap between them, which is exactly where the waymark sits." },
                },
                {
                  id: "regroup",
                  label: { th: "2 — รวมกลาง", en: "2 — regroup in the middle" },
                  say: { th: "วางครบแล้วกลางสนามปลอดภัยถาวร ทุกคนกลับมารวมรับดาเมจกลุ่ม", en: "With all eight placed the centre is permanently safe. Everybody comes back for the shared damage." },
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  wrong: { th: "วางเสร็จแล้วต้องกลับกลาง ไม่ใช่ค้างที่ขอบ", en: "Once it is placed, come back to the middle — do not stay out on the wall." },
                },
              ],
            },
            {
              id: "intercards",
              tell: { th: "ช่องว่างของพัดอยู่ที่ 4 มุมเฉียง — วางที่ 1 2 3 4", en: "The gaps are on the diagonals — place at 1, 2, 3 and 4" },
              steps: [
                {
                  id: "place",
                  label: { th: "1 — วางที่มุม", en: "1 — place at the corners" },
                  say: { th: "รอบนี้ช่องว่างอยู่แนวเฉียง วางที่มาร์คตัวเลขแทน", en: "This time the gaps are diagonal, so the numbered marks are the ones to use." },
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
                    MT: { th: "ไปมาร์ค 1 (มุมตะวันออกเฉียงเหนือ)", en: "Take mark 1, north-east." },
                    ST: { th: "ไปมาร์ค 2 (มุมตะวันออกเฉียงใต้)", en: "Take mark 2, south-east." },
                    H1: { th: "ไปมาร์ค 3 (มุมตะวันตกเฉียงใต้)", en: "Take mark 3, south-west." },
                    H2: { th: "ไปมาร์ค 4 (มุมตะวันตกเฉียงเหนือ)", en: "Take mark 4, north-west." },
                  },
                  wrong: { th: "รอบนี้พัดอยู่ 4 ทิศหลัก ที่ปลอดภัยเลยเป็นมุมเฉียง", en: "This time the fans are on the cardinals, so the safe lines are the diagonals." },
                },
                {
                  id: "regroup",
                  label: { th: "2 — รวมกลาง", en: "2 — regroup in the middle" },
                  say: { th: "วางครบแล้วกลับมารวมกลาง", en: "With all eight placed, gather in the middle." },
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 1 }, ST: { x: -1, y: 1 },
                    H1: { x: -1, y: -1 }, H2: { x: 1, y: -1 },
                    D1: { x: -1.5, y: 0 }, D2: { x: 1.5, y: 0 },
                    D3: { x: 0, y: -1.5 }, D4: { x: 1, y: 1 },
                  },
                  wrong: { th: "วางเสร็จแล้วต้องกลับกลาง", en: "Once it is placed, come back to the middle." },
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "towers",
      name: { th: "หอคอย", en: "Towers" },
      enter: { th: "หลัง Ether Letting", en: "After Ether Letting" },
      note: { th: "สองท่าที่ต้องแบ่งหน้าที่ล่วงหน้า — ตกลงกันก่อนเข้าไฟต์", en: "Two mechanics that need jobs assigned in advance. Settle them before you pull." },
      mechanics: [
        {
          id: "screech-2",
          name: "Sadistic Screech 2",
          at: "3:00",
          tags: ["tower", "adds", "aoe"],
          what: { th: "แบ่งงานตามกลุ่ม: กลุ่ม MT (MT H1 D1 D3) รับฝั่งเหนือ "
              + "กลุ่ม ST (ST H2 D2 D4) รับฝั่งใต้ — melee ทุบลูกบอล tank เหยียบหอคอย "
              + "ranged จัดการเป้าระยะไกล พร้อมกับเลื่อยที่หมุนไล่ตลอด", en: "Split by group: MT group — MT, H1, D1, D3 — takes the north, ST group — ST, H2, D2, D4 — the south. Within each, the melee break the ball, the tank steps the tower and the ranged handle the far target, all while a saw keeps circling." },
          dies: { th: "โดนเลื่อยบาดพร้อมกับ AoE ทั้งสนามลงพอดี เลือดหายเร็วเกินกว่าจะ heal ตาม", en: "Catching the saw at the same moment the raidwide lands. Health goes faster than a healer can answer." },
          variants: [
            {
              id: "split",
              tell: { th: "ลูกบอล หอคอย และเป้าระยะไกล เกิดพร้อมกันทั้งสองฝั่ง", en: "Ball, tower and far target appear on both sides at once" },
              steps: [
                {
                  id: "assign",
                  label: { th: "แยกงาน", en: "Split the jobs" },
                  say: { th: "กลุ่ม MT ขึ้นเหนือ กลุ่ม ST ลงใต้ แต่ละกลุ่มมี tank เหยียบหอคอย "
                     + "melee ทุบลูกบอล ranged เก็บเป้าไกล — และหลบเลื่อยตลอดเวลา", en: "MT group north, ST group south. In each: tank on the tower, melee on the ball, ranged on the far target — and everybody keeping out of the saw the whole time." },
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, H1: { x: -5, y: 5 },
                    D1: { x: -2.5, y: 5 }, D3: { x: -7.5, y: 7.5 },
                    ST: { x: 0, y: -7.5 }, H2: { x: 5, y: -5 },
                    D2: { x: 2.5, y: -5 }, D4: { x: 7.5, y: -7.5 },
                  },
                  per: {
                    MT: { th: "ขึ้นเหนือ เหยียบหอคอยฝั่งเหนือ", en: "Go north and step the north tower." },
                    ST: { th: "ลงใต้ เหยียบหอคอยฝั่งใต้", en: "Go south and step the south tower." },
                    D1: { th: "ขึ้นเหนือ ทุบลูกบอลให้แตกก่อนร่ายจบ", en: "Go north and break the ball before the cast finishes." },
                    D2: { th: "ลงใต้ ทุบลูกบอลฝั่งใต้", en: "Go south and break the south ball." },
                    D3: { th: "ขึ้นเหนือ ยิงเป้าระยะไกล ระวังเลื่อย", en: "Go north for the far target, watching the saw." },
                    D4: { th: "ลงใต้ ยิงเป้าระยะไกล", en: "Go south for the far target." },
                    H1: { th: "ขึ้นเหนือ เตรียม heal หนัก ตอน AoE ซ้อนเลื่อย", en: "Go north, and have the heavy heals ready for the raidwide landing on top of the saw." },
                    H2: { th: "ลงใต้ เตรียมโล่กลุ่ม", en: "Go south, group shields ready." },
                  },
                  wrong: { th: "ผิดฝั่ง — กลุ่ม MT (MT H1 D1 D3) เหนือ กลุ่ม ST (ST H2 D2 D4) ใต้", en: "Wrong side. MT group — MT, H1, D1, D3 — north; ST group — ST, H2, D2, D4 — south." },
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
          what: { th: "หอคอยสองชุด ชุดละ 4 ต้น — กลุ่ม MT เข้าชุดแรก กลุ่ม ST ตามชุดสอง "
              + "เข้าจากตำแหน่ง 12 นาฬิกาไล่ตามเข็ม ลำดับ T → melee → ranged → healer "
              + "อีก 4 คนที่ไม่เหยียบ ชุดแรกโดนแยก ชุดสองโดนรวม "
              + "และมีพัดใส่ tank ต้องยืนที่ช่องปลอดภัยกว้างที่สุด", en: "Two sets of four towers. MT group takes the first, ST group the second, entering clockwise from twelve o'clock in the order tank, melee, ranged, healer. The four not stepping get spreads on the first set and a stack on the second, and a fan goes out at the tank, who wants the widest safe arc." },
          dies: { th: "เข้าหอคอยพร้อมกันทั้ง 8 คน — ชุดแรกเป็นของกลุ่ม MT เท่านั้น ชุดสองเลยว่าง", en: "All eight going for the towers at once. The first set belongs to MT group alone, so the second is left empty." },
          variants: [
            {
              id: "first",
              tell: { th: "หอคอยชุดแรกขึ้น — กลุ่ม MT เหยียบ อีก 4 คนโดนแยก", en: "First set of towers — MT group steps them, the other four are spread" },
              steps: [
                {
                  id: "towers",
                  label: { th: "1 — ชุดแรก + แยก", en: "1 — first set, and spreads" },
                  say: { th: "กลุ่ม MT เข้าหอคอยที่ 12/3/6/9 นาฬิกา ไล่ตามเข็มจาก 12 "
                     + "กลุ่ม ST แยกออกไปรับวงเดี่ยวที่มุม", en: "MT group takes the towers at 12, 3, 6 and 9, entering clockwise from twelve. ST group spreads to the corners for their own circles." },
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    MT: { x: 0, y: 7.5 }, H1: { x: 7.5, y: 0 },
                    D1: { x: 0, y: -7.5 }, D3: { x: -7.5, y: 0 },
                    ST: { x: 5.5, y: 5.5 }, H2: { x: 5.5, y: -5.5 },
                    D2: { x: -5.5, y: -5.5 }, D4: { x: -5.5, y: 5.5 },
                  },
                  per: {
                    MT: { th: "เข้าหอคอย 12 นาฬิกา — คนแรกของลำดับ", en: "Twelve o'clock tower — first in the order." },
                    D1: { th: "เข้าหอคอยถัดไปตามเข็ม (melee ตาม tank)", en: "Next tower clockwise — melee follow the tank." },
                    D3: { th: "เข้าหอคอยถัดจาก melee", en: "The tower after the melee." },
                    H1: { th: "เข้าหอคอยสุดท้ายของชุด", en: "Last tower of the set." },
                    ST: { th: "ไม่เหยียบ — ออกไปมุมรับวงเดี่ยว เตรียม cooldown รับพัด", en: "Not stepping. Out to a corner for your own circle, with a cooldown ready for the fan." },
                    H2: { th: "ไม่เหยียบ — แยกไปมุม อย่ายืนติดใคร", en: "Not stepping. Spread to a corner and stay off everybody." },
                    D2: { th: "ไม่เหยียบ — แยกไปมุม", en: "Not stepping. Spread to a corner." },
                    D4: { th: "ไม่เหยียบ — แยกไปมุม", en: "Not stepping. Spread to a corner." },
                  },
                  wrong: { th: "หอคอยอยู่ที่ 12/3/6/9 นาฬิกาบนขอบ และชุดแรกเป็นของกลุ่ม MT", en: "The towers are at 12, 3, 6 and 9 on the edge — and the first set is MT group's." },
                },
              ],
            },
            {
              id: "second",
              tell: { th: "หอคอยชุดสองขึ้น — กลุ่ม ST เหยียบ อีก 4 คนโดนรวม", en: "Second set of towers — ST group steps them, the other four stack" },
              steps: [
                {
                  id: "towers",
                  label: { th: "2 — ชุดสอง + รวม", en: "2 — second set, and the stack" },
                  say: { th: "กลุ่ม ST เข้าหอคอยชุดสอง กลุ่ม MT รวมกันรับดาเมจแชร์", en: "ST group takes the second set while MT group gathers for the shared damage." },
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 3 }],
                  safe: {
                    ST: { x: 0, y: 7.5 }, H2: { x: 7.5, y: 0 },
                    D2: { x: 0, y: -7.5 }, D4: { x: -7.5, y: 0 },
                    MT: { x: -5, y: 5 }, H1: { x: -6, y: 5 },
                    D1: { x: -5, y: 4 }, D3: { x: -6, y: 4 },
                  },
                  per: {
                    ST: { th: "เข้าหอคอย 12 นาฬิกา ไล่ตามเข็มเหมือนชุดแรก", en: "Twelve o'clock tower, clockwise as before." },
                    D2: { th: "เข้าหอคอยถัดไปตามเข็ม", en: "Next tower clockwise." },
                    D4: { th: "เข้าหอคอยถัดจาก melee", en: "The tower after the melee." },
                    H2: { th: "เข้าหอคอยสุดท้าย", en: "Last tower." },
                    MT: { th: "รวมกับกลุ่ม MT รับดาเมจแชร์ กด mitigation", en: "Stack with MT group for the shared hit, with mitigation." },
                    H1: { th: "รวมกับกลุ่ม MT heal ทันทีหลังรับ", en: "Stack with MT group and heal straight after." },
                  },
                  wrong: { th: "ชุดนี้เป็นของกลุ่ม ST ส่วนกลุ่ม MT ต้องรวมกันรับแชร์", en: "This set is ST group's; MT group is stacking for the shared hit." },
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: "bats",
      name: { th: "ค้างคาว + ปิดท้าย", en: "Bats and the finish" },
      enter: { th: "หลังหอคอยชุดสอง", en: "After the second set of towers" },
      mechanics: [
        {
          id: "bat-deathmatch",
          name: "Bat Deathmatch (バット・デスマッチ)",
          at: "4:30",
          tags: ["memo", "cleave", "adds"],
          what: { th: "MT เข้าหอคอยมุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้ "
              + "ทุกคนถือเชือกไว้อย่าให้ยืดเกิน แล้วหลบพัด 5 ระลอกด้วยแพทเทิร์น "
              + "\"ที่ปลอดภัยข้างๆ → เว้นไปสองช่อง\" ระลอกที่ 4 ติดมาร์ควงกลม/โดนัท "
              + "ระลอกที่ 5 คือตอนระเบิด", en: "MT takes the north-west tower and ST the south-east. Everybody holds their tether without stretching it, then reads five waves of fans with the pattern \"the safe spot next to you, then skip two\". The fourth applies a circle or donut marker; the fifth is when it resolves." },
          dies: { th: "อ่านมาร์ครอบ 4 ผิด — วงกลมต้องเข้าหาบอส โดนัทต้องออกไปหาค้างคาว", en: "Misreading the marker on the fourth. A circle means get close to the boss; a donut means get out to the bats." },
          variants: [
            {
              id: "circle",
              tell: { th: "ระลอก 4 ติดมาร์ควงกลม — ต้องเข้าใกล้บอส", en: "The fourth wave leaves a circle marker — get close to the boss" },
              steps: [
                {
                  id: "tether",
                  label: { th: "1 — เข้าหอคอย ถือเชือก", en: "1 — towers and tethers" },
                  say: { th: "MT เข้ามุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้ "
                     + "caster ยืนใกล้ต้นเชือกจะได้ไม่ต้องวิ่งไกล", en: "MT to the north-west corner, ST to the south-east. Casters stand near the source of their tether so they have less ground to cover." },
                  danger: [],
                  safe: {
                    MT: { x: -7.5, y: 7.5 }, ST: { x: 7.5, y: -7.5 },
                    H1: { x: -5, y: 2.5 }, H2: { x: 5, y: -2.5 },
                    D1: { x: -2.5, y: 5 }, D2: { x: 2.5, y: -5 },
                    D3: { x: -5, y: 5 }, D4: { x: 5, y: -5 },
                  },
                  per: {
                    MT: { th: "หอคอยมุมตะวันตกเฉียงเหนือ", en: "North-west tower." },
                    ST: { th: "หอคอยมุมตะวันออกเฉียงใต้", en: "South-east tower." },
                    D4: { th: "ยืนใกล้ต้นเชือก ลดระยะวิ่งตอนหลบพัด", en: "Stand near your tether's source; it is less running between fans." },
                  },
                },
                {
                  id: "fans",
                  label: { th: "2 — หลบพัด 5 ระลอก", en: "2 — five waves of fans" },
                  say: { th: "แพทเทิร์นคงที่: ไปที่ปลอดภัยข้างๆ ก่อน แล้วเว้นไปสองช่อง สลับไปเรื่อยๆ", en: "The pattern is fixed: take the safe spot next to you, then skip two, and alternate." },
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 90 }],
                  safe: {
                    MT: { x: -5, y: 5 }, ST: { x: -5, y: -5 },
                    H1: { x: -7, y: 3 }, H2: { x: -7, y: -3 },
                    D1: { x: -3, y: 3 }, D2: { x: -3, y: -3 },
                    D3: { x: -8, y: 0 }, D4: { x: -5.5, y: 0 },
                  },
                  wrong: { th: "ยังอยู่ในพัด — ขยับไปช่องปลอดภัยที่อยู่ติดกันก่อน", en: "Still in a fan. Move to the safe spot next to you first." },
                },
                {
                  id: "resolve",
                  label: { th: "3 — วงกลม: เข้าหาบอส", en: "3 — circle: in to the boss" },
                  say: { th: "ระลอกที่ 5 มาพร้อมมาร์คระเบิด — วงกลมแปลว่าต้องเข้าใกล้บอส", en: "The fifth wave resolves the marker. A circle means being close to the boss." },
                  danger: [{ kind: "donut", at: { x: 0, y: 0 }, r: 4 }],
                  safe: {
                    MT: { x: 0, y: 1.5 }, ST: { x: -1.5, y: 1 },
                    H1: { x: -1.5, y: -1 }, H2: { x: 1.5, y: -1 },
                    D1: { x: -1, y: 0 }, D2: { x: 1, y: 0 },
                    D3: { x: 0, y: -2 }, D4: { x: 1.5, y: 1 },
                  },
                  wrong: { th: "วงกลมคือต้องเข้าใกล้บอส ไม่ใช่ออกไปขอบ", en: "A circle means in to the boss, not out to the wall." },
                },
              ],
            },
            {
              id: "donut",
              tell: { th: "ระลอก 4 ติดมาร์คโดนัท — ต้องออกไปหาค้างคาว", en: "The fourth wave leaves a donut marker — get out to the bats" },
              steps: [
                {
                  id: "tether",
                  label: { th: "1 — เข้าหอคอย ถือเชือก", en: "1 — towers and tethers" },
                  say: { th: "เหมือนเดิม MT มุมตะวันตกเฉียงเหนือ ST มุมตะวันออกเฉียงใต้", en: "As before: MT north-west, ST south-east." },
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
                  label: { th: "2 — หลบพัด 5 ระลอก", en: "2 — five waves of fans" },
                  say: { th: "แพทเทิร์นเดิม: ข้างๆ ก่อน แล้วเว้นสองช่อง", en: "Same pattern: next to you first, then skip two." },
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 225, angle: 90 }],
                  safe: {
                    MT: { x: 5, y: -5 }, ST: { x: 5, y: 5 },
                    H1: { x: 7, y: -3 }, H2: { x: 7, y: 3 },
                    D1: { x: 3, y: -3 }, D2: { x: 3, y: 3 },
                    D3: { x: 8, y: 0 }, D4: { x: 5.5, y: 0 },
                  },
                  wrong: { th: "ยังอยู่ในพัด — ไปช่องปลอดภัยที่ติดกันก่อน", en: "Still in a fan. Take the safe spot next to you first." },
                },
                {
                  id: "resolve",
                  label: { th: "3 — โดนัท: ออกไปหาค้างคาว", en: "3 — donut: out to the bats" },
                  say: { th: "โดนัทแปลว่ากลางไม่ปลอดภัย ต้องออกไประยะ melee ของค้างคาว", en: "A donut means the middle is not safe: get out to melee range of the bats." },
                  danger: [{ kind: "circle", at: { x: 0, y: 0 }, r: 5.5 }],
                  safe: {
                    MT: { x: -7.5, y: 7.5 }, ST: { x: 7.5, y: -7.5 },
                    H1: { x: -7.5, y: 0 }, H2: { x: 7.5, y: 0 },
                    D1: { x: 0, y: 7.5 }, D2: { x: 0, y: -7.5 },
                    D3: { x: -7.5, y: -7.5 }, D4: { x: 7.5, y: 7.5 },
                  },
                  wrong: { th: "โดนัทคือกลางอันตราย ต้องออกไปขอบหาค้างคาว", en: "A donut makes the middle the dangerous part. Out to the bats." },
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
          what: { th: "ไม่มีเชือกเหมือนท่าก่อน เป็นการหลบสลับซ้ายขวาล้วนๆ อ่านจากตัวบอสอย่างเดียว", en: "No tethers this time. It is pure alternating dodges, read off the boss and nothing else." },
          dies: { th: "ขยับก่อนบอสเริ่มเหวี่ยง — ท่านี้ต้องรอให้เห็นทิศก่อนแล้วค่อยไป", en: "Moving before the boss starts the swing. This one waits until the direction is visible." },
          variants: [
            {
              id: "left",
              tell: { th: "บอสเหวี่ยงจากซ้าย", en: "The boss swings from the left" },
              steps: [
                {
                  id: "dodge",
                  label: { th: "หลบขวา", en: "Dodge right" },
                  say: { th: "ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง แล้วรอระลอกถัดไป", en: "Go opposite the swing and wait for the next one." },
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 315, angle: 150 }],
                  safe: {
                    MT: { x: 5, y: -4 }, ST: { x: 6.5, y: -3 },
                    H1: { x: 6, y: -6 }, H2: { x: 4, y: -6.5 },
                    D1: { x: 3, y: -3 }, D2: { x: 4.5, y: -2 },
                    D3: { x: 7.5, y: -4.5 }, D4: { x: 5.5, y: -7.5 },
                  },
                  wrong: { th: "ยังอยู่ในพัด — ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง", en: "Still in the fan. Go opposite the swing." },
                },
              ],
            },
            {
              id: "right",
              tell: { th: "บอสเหวี่ยงจากขวา", en: "The boss swings from the right" },
              steps: [
                {
                  id: "dodge",
                  label: { th: "หลบซ้าย", en: "Dodge left" },
                  say: { th: "ไปฝั่งตรงข้ามกับทางที่บอสเหวี่ยง", en: "Go opposite the swing." },
                  danger: [{ kind: "cone", at: { x: 0, y: 0 }, facing: 45, angle: 150 }],
                  safe: {
                    MT: { x: -5, y: -4 }, ST: { x: -6.5, y: -3 },
                    H1: { x: -6, y: -6 }, H2: { x: -4, y: -6.5 },
                    D1: { x: -3, y: -3 }, D2: { x: -4.5, y: -2 },
                    D3: { x: -7.5, y: -4.5 }, D4: { x: -5.5, y: -7.5 },
                  },
                  wrong: { th: "ยังอยู่ในพัด — ไปฝั่งตรงข้าม", en: "Still in the fan. Go to the other side." },
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
          what: { th: "AoE ทั้งสนามสองครั้งก่อนหมดเวลา — ถ้ามาถึงตรงนี้แปลว่า DPS ไม่พอ", en: "Two raidwides and then time is up. Reaching this means the damage was not there." },
          dies: { th: "ไม่ใช่ท่าที่หลบได้ ต้องไปแก้ที่ดาเมจในช่วงก่อนหน้า", en: "Nothing to dodge here. The fix is damage earlier in the fight." },
          variants: [
            {
              id: "only",
              tell: { th: "บอสร่ายยาว ไม่มีวงบอกตำแหน่ง",
                     en: "A long cast, with nothing marked on the floor" },
              steps: [
                {
                  id: "cast",
                  label: { th: "รับ", en: "Take it" },
                  say: { th: "กด cooldown ที่เหลือทั้งหมด แล้วดันดาเมจให้สุด", en: "Everything left on cooldown, and push." },
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
