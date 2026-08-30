import type { Guide } from "./types";

/**
 * M9S — Vamp Fatale.
 *
 * Two lists, and the split is the point. `mechanics` is every skill in the
 * fight explained once; `phases` is when each of them happens. Killer Voice is
 * cast three times and is the same skill each time, so it is written once and
 * pointed at three times — which is also why clicking the third one opens the
 * page you already read rather than a third copy of it to keep in sync.
 *
 * The times are the fight's own, from the Exia rotation sheet: cast, resolve,
 * and for anything that runs, an end. What that sheet listed as a Start row and
 * an End row is one entry that lasts, because the middle is where the mechanic
 * actually is.
 *
 * Almost every skill is a stub on purpose — a name, a time, what it does, and
 * a line saying nobody has written the strategy yet. That is more honest than
 * an invented one and it is the order the knowledge arrives in. Filling one in
 * means giving it `variants`; nothing else changes, because the diagram, the
 * step-through and the quiz all read the same numbers.
 */
export const m9s: Guide = {
  slug: "m9s",
  name: "M9S — AAC Heavyweight (Savage)",
  boss: "Vamp Fatale",
  short: "M9S",
  category: "savage",
  expansion: "Dawntrail",
  patch: "7.0",
  draft: true,
  source: { name: "Game8", url: "https://game8.jp/ff14/754895" },
  arena: {
    shape: "square",
    grid: 4,
    image: "/guides/m9s/arena.jpg",
    // Half the floor in the game's own units, which is the only number needed
    // to read a preset. Everything below is pasted straight from the game.
    radius: 20,
    plans: [
      {
        id: "standard",
        name: { th: "แผนมาตรฐาน", en: "Standard" },
        note: { th: "มาร์คแบบหมุน 8 ทิศ", en: "The rotated eight" },
        preset: {
          Name: "M9S",
          MapID: 1069,
          A: { X: 92.538, Y: 0.0, Z: 81.984, ID: 0, Active: true },
          B: { X: 118.016, Y: 0.0, Z: 92.538, ID: 1, Active: true },
          C: { X: 107.462, Y: 0.0, Z: 118.016, ID: 2, Active: true },
          D: { X: 81.984, Y: 0.0, Z: 107.462, ID: 3, Active: true },
          One: { X: 107.462, Y: 0.0, Z: 81.984, ID: 5, Active: true },
          Two: { X: 118.016, Y: 0.0, Z: 107.462, ID: 6, Active: true },
          Three: { X: 92.538, Y: 0.0, Z: 118.016, ID: 7, Active: true },
          Four: { X: 81.984, Y: 0.0, Z: 92.538, ID: 4, Active: true },
        },
      },
    ],
  },

  // ── Every skill, once ──────────────────────────────────────────────────
  mechanics: [
    {
      id: "killer-voice",
      name: "Killer Voice",
      tags: ["raid"],
      what: {
        th: "ดาเมจทั้งปาร์ตี้",
        en: "Raid damage.",
      },
    },
    {
      id: "hardcore",
      name: "Hardcore",
      tags: ["tank"],
      what: {
        th: "Tank buster ลง tank ทั้งสองคน เป็นวง AoE",
        en: "Buster AoE on both tanks.",
      },
    },
    {
      id: "vamp-stomp",
      name: "Vamp Stomp",
      tags: ["pattern"],
      what: {
        th: "วง AoE ที่ปล่อยวงแหวนขยายออกมา วงแหวนนี้คือตัวที่ไปล้าง debuff ของ Blast Beat และไปจุดระเบิดค้างคาว",
        en: "Circle AoE that spawns an expanding ring. That ring is what cleanses the Blast Beat debuff and what sets the bats off.",
      },
    },
    {
      id: "blast-beat",
      name: "Blast Beat",
      tags: ["targeted"],
      what: {
        th: "คนที่ติด debuff จะมีวง AoE ติดตัว วงแหวนที่ขยายออกมาจะล้าง debuff ให้ และค้างคาวก็ระเบิดเป็น AoE เมื่อวงแหวนวิ่งไปโดน",
        en: "AoE on players with the debuff, cleansed by the expanding ring. Bats also explode in an AoE when the ring reaches them.",
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
                th: "วงแหวนที่แผ่จาก Vamp Stomp โดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                  + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                en: "The ring from Vamp Stomp reaches the bats and their first circles go "
                  + "off. Melee dodge those, then run to the centre — on foot, no gap closer.",
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
                th: "วงแหวนที่แผ่จาก Vamp Stomp โดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                  + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                en: "The ring from Vamp Stomp reaches the bats and their first circles go "
                  + "off. Melee dodge those, then run to the centre — on foot, no gap closer.",
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
                th: "วงแหวนที่แผ่จาก Vamp Stomp โดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                  + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                en: "The ring from Vamp Stomp reaches the bats and their first circles go "
                  + "off. Melee dodge those, then run to the centre — on foot, no gap closer.",
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
                th: "วงแหวนที่แผ่จาก Vamp Stomp โดนค้างคาว ทำให้เกิดวงระเบิดรอบแรก "
                  + "melee หลบวงนั้นก่อน แล้ววิ่งเข้ากลาง — ห้ามใช้ gap close",
                en: "The ring from Vamp Stomp reaches the bats and their first circles go "
                  + "off. Melee dodge those, then run to the centre — on foot, no gap closer.",
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
          ],
        },
      ],
    },
    {
      id: "brutal-rain",
      name: "Brutal Rain",
      tags: ["shared"],
      what: {
        th: "ดาเมจแชร์ สุ่มลงที่ใครก็ได้ รับทั้งปาร์ตี้ ทุกครั้งที่บอสร่ายซ้ำ จำนวนครั้งจะเพิ่มขึ้นอีก 1 เสมอ",
        en: "Shared damage on a random player, taken by the whole party. Every time the boss casts it again it lands one more time than before.",
      },
    },
    {
      id: "sadistic-screech",
      name: "Sadistic Screech",
      tags: ["raid"],
      what: {
        th: "ดาเมจทั้งปาร์ตี้ และเปลี่ยนรูปสนาม",
        en: "Raid damage. Changes the arena.",
      },
    },
    {
      id: "coffinmaker",
      name: "Coffinmaker",
      tags: ["adds"],
      what: {
        th: "มอนใบเลื่อยที่เลื่อนไปข้างหน้าเป็นระยะพร้อมกับ Dead Wake",
        en: "Sawblade add that pushes forward periodically with Dead Wake.",
      },
    },
    {
      id: "dead-wake",
      name: "Dead Wake",
      tags: ["adds"],
      what: {
        th: "จังหวะที่ Coffinmaker เลื่อนตัวไปข้างหน้า",
        en: "The push that moves Coffinmaker forward.",
      },
    },
    {
      id: "coffinfiller",
      name: "Coffinfiller",
      tags: ["pattern"],
      what: {
        th: "AoE เป็นเส้นออกจากใบเลื่อย",
        en: "Line AoE from the sawblades.",
      },
    },
    {
      id: "half-moon",
      name: "Half Moon",
      tags: ["pattern"],
      what: {
        th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ เวลาบนไทม์ไลน์ลากจากการกวาดครั้งแรกไปครั้งที่สอง",
        en: "Half-room cleave from the boss's left or right, following up by cleaving her other side. The bar runs from the first cleave to the second.",
      },
    },
    {
      id: "crowd-kill",
      name: "Crowd Kill",
      tags: ["raid"],
      what: {
        th: "ดาเมจทั้งปาร์ตี้ และบอสได้ stack เพิ่ม",
        en: "Raid damage. The boss gains stacks.",
      },
    },
    {
      id: "finale-fatale",
      name: "Finale Fatale",
      tags: ["raid"],
      what: {
        th: "ดาเมจทั้งปาร์ตี้ สร้างกำแพงตาย และวง AoE บนพื้น",
        en: "Raid damage, creates a death wall and circle floor AoEs.",
      },
    },
    {
      id: "pulping-pulse",
      name: "Pulping Pulse",
      tags: ["pattern"],
      what: {
        th: "วง AoE บนพื้น",
        en: "Circle floor AoEs.",
      },
    },
    {
      id: "aetherletting",
      name: "Aetherletting",
      tags: ["targeted"],
      what: {
        th: "ลำดับยาว กรวย AoE บนพื้นก่อน แล้ววง AoE ลงคนที่ติดมาร์คทีละคน ทิ้งรอยไหม้ไว้ จากนั้นรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
        en: "One long sequence: cone AoEs on the floor, then circle AoEs on marked players one at a time, each leaving a burn behind. The burns then fire + or x AoEs.",
      },
    },
    {
      id: "insatiable-thirst",
      name: "Insatiable Thirst",
      tags: ["raid"],
      what: {
        th: "ดาเมจทั้งปาร์ตี้",
        en: "Raid damage.",
      },
    },
    {
      id: "gravegrazer",
      name: "Gravegrazer",
      tags: ["adds"],
      what: {
        th: "ใบเลื่อยที่เคลื่อนที่ไปทั่วสนาม",
        en: "Sawblades moving throughout the arena.",
      },
    },
    {
      id: "plummet",
      name: "Plummet",
      tags: ["pattern"],
      what: {
        th: "หอคอยของ tank และวง AoE บนพื้น หอคอยที่ถูกเหยียบจะเกิด Fatal Flail ซึ่งเป็นมอนลูกตุ้มหนาม ต้องฆ่าให้ทันก่อน enrage",
        en: "Tank towers and puddle AoEs. A soaked tower spawns a Fatal Flail — a spike ball add that has to die before it enrages.",
      },
    },
    {
      id: "deadly-doornail",
      name: "Deadly Doornail",
      tags: ["adds"],
      what: {
        th: "วง AoE บนพื้นที่ใหญ่ขึ้นเรื่อยๆ ตราบใดที่มอนตัวนี้ยังไม่ตาย",
        en: "Puddle AoE that gets progressively larger the longer this add is alive.",
      },
    },
    {
      id: "hell-in-a-cell",
      name: "Hell in a Cell",
      tags: ["pattern"],
      what: {
        th: "หอคอย 4 ต้นที่ต้องเหยียบ และจะเกิด Charnel Cell คนที่เหยียบจะออกจากห้องขังไม่ได้ จนกว่าจะฆ่ามอนตัวนั้น",
        en: "Four tower soaks, each spawning a Charnel Cell. Whoever soaked cannot leave the cell until that add is dead.",
      },
    },
    {
      id: "ultrasonic",
      name: "Ultrasonic Spread / Amp",
      tags: ["targeted"],
      what: {
        th: "กรวย AoE ลงคนละ 1 คนของแต่ละ role (Spread) และกรวย AoE แบบแชร์ดาเมจ (Amp)",
        en: "Cone AoEs on one player of each role (Spread), and a shared damage cone AoE (Amp).",
      },
    },
    {
      id: "undead-deathmatch",
      name: "Undead Deathmatch",
      tags: ["pattern"],
      what: {
        th: "หอคอยแชร์ดาเมจ 2 ต้น และจะเกิดค้างคาวที่โยงเชือกกับคนที่เหยียบ",
        en: "Two shared-damage tower soaks. Spawns bats tethering to the soaking players.",
      },
    },
    {
      id: "sanguine-scratch",
      name: "Sanguine Scratch",
      tags: ["pattern"],
      what: {
        th: "กรวย AoE สลับซ้ายขวาต่อเนื่องกัน เวลาบนไทม์ไลน์คือช่วงที่มันร่ายทั้งชุด",
        en: "Alternating cone AoEs, one after another. The bar is the whole set.",
      },
    },
    {
      id: "beat-drop",
      name: "Beat / Drop",
      tags: ["shared"],
      what: {
        th: "AoE บนค้างคาว เป็นโดนัทหรือวงกลม",
        en: "Donut or circle AoE on a bat.",
      },
    },
  ],

  // ── When each of them happens ──────────────────────────────────────────
  phases: [
    {
      id: "p1",
      name: { th: "เฟส 1 — เหมือน A10 อีกแล้ว", en: "Phase 1 — It's A10 Again" },
      enter: "0:05",
      cues: [
        { of: "killer-voice", cast: "0:05", at: "0:10" },
        { of: "hardcore", cast: "0:15", at: "0:20" },
        { of: "vamp-stomp", cast: "0:25", at: "0:30" },
        { of: "blast-beat", at: "0:34", until: "0:42" },
        { of: "brutal-rain", cast: "0:42", at: "0:46" },
        { of: "sadistic-screech", cast: "0:55", at: "1:01" },
        { of: "coffinmaker", at: "1:08",
          note: { th: "ใบเลื่อยโผล่พร้อม Dead Wake ครั้งแรก", en: "Appears with the first Dead Wake" } },
        { of: "dead-wake", at: "1:08" },
        { of: "half-moon", cast: "1:10", at: "1:15", until: "1:18" },
        { of: "coffinfiller", at: "1:15", until: "1:18" },
        { of: "dead-wake", cast: "1:21", at: "1:26" },
        { of: "half-moon", cast: "1:28", at: "1:33", until: "1:36" },
        { of: "coffinfiller", at: "1:33", until: "1:36" },
        { of: "dead-wake", cast: "1:38", at: "1:43" },
        { of: "half-moon", cast: "1:45", at: "1:50", until: "1:53" },
        { of: "coffinfiller", at: "1:50", until: "1:53" },
        { of: "half-moon", cast: "1:56", at: "2:01", until: "2:04" },
        { of: "coffinfiller", at: "2:01", until: "2:04" },
        { of: "dead-wake", cast: "2:06", at: "2:11",
          note: { th: "ยังไม่ยืนยัน", en: "Not confirmed" } },
        { of: "sadistic-screech", cast: "2:13", at: "2:18" },
      ],
    },
    {
      id: "p2",
      name: { th: "เฟส 2 — ใบเลื่อยเพิ่มอีก", en: "Phase 2 — More buzz saws" },
      enter: "2:27",
      cues: [
        { of: "crowd-kill", cast: "2:27", at: "2:33" },
        { of: "finale-fatale", cast: "2:46", at: "2:51" },
        { of: "pulping-pulse", at: "2:57" },
        { of: "aetherletting", cast: "2:58", at: "3:10", until: "3:33",
          note: { th: "กรวย 3:10–3:17 · วงลงคนที่มาร์ค 3:13, 3:15, 3:17, 3:19 · +/x 3:27–3:33", en: "Cones 3:10–3:17 · spreads at 3:13, 3:15, 3:17, 3:19 · +/x 3:27–3:33" } },
        { of: "hardcore", cast: "3:35", at: "3:40" },
        { of: "pulping-pulse", at: "3:45" },
        { of: "vamp-stomp", cast: "3:46", at: "3:51" },
        { of: "blast-beat", at: "3:53", until: "4:02" },
        { of: "half-moon", cast: "4:02", at: "4:07", until: "4:10" },
        { of: "brutal-rain", cast: "4:12", at: "4:17" },
        { of: "insatiable-thirst", cast: "4:25", at: "4:31" },
        { of: "sadistic-screech", cast: "4:38", at: "4:44" },
        { of: "gravegrazer", at: "4:48",
          note: { th: "เริ่มตรงนี้ แล้ววิ่งยาวไปตลอดช่วง add", en: "Starts here and runs through the add phase" } },
        { of: "plummet", at: "4:56" },
        { of: "deadly-doornail", at: "4:56" },
        { of: "killer-voice", cast: "5:00", at: "5:05" },
        { of: "plummet", at: "5:15" },
        { of: "deadly-doornail", at: "5:15" },
        { of: "killer-voice", cast: "5:19", at: "5:24" },
        { of: "plummet", at: "5:33" },
        { of: "deadly-doornail", at: "5:33" },
        { of: "sadistic-screech", cast: "5:51", at: "5:57" },
      ],
    },
    {
      id: "p3",
      name: { th: "เฟส 3 — Hell in a Cell", en: "Phase 3 — Hell in a Cell" },
      enter: "6:05",
      cues: [
        { of: "crowd-kill", cast: "6:05", at: "6:11" },
        { of: "finale-fatale", cast: "6:24", at: "6:29" },
        { of: "pulping-pulse", at: "6:35" },
        { of: "hell-in-a-cell", cast: "6:36", at: "6:41" },
        { of: "ultrasonic", cast: "6:43", at: "6:49" },
        { of: "ultrasonic", cast: "6:50", at: "6:56" },
        { of: "hell-in-a-cell", cast: "6:58", at: "7:03" },
        { of: "ultrasonic", cast: "7:06", at: "7:11" },
        { of: "ultrasonic", cast: "7:13", at: "7:18" },
        { of: "pulping-pulse", at: "7:24" },
        { of: "pulping-pulse", at: "7:28" },
        { of: "undead-deathmatch", cast: "7:29", at: "7:34" },
        { of: "sanguine-scratch", cast: "7:38", at: "7:41", until: "7:51" },
        { of: "beat-drop", at: "7:54" },
        { of: "sanguine-scratch", cast: "7:56", at: "7:59", until: "8:09" },
        { of: "beat-drop", at: "8:12" },
        { of: "brutal-rain", cast: "8:14", at: "8:19" },
        { of: "vamp-stomp", cast: "8:27", at: "8:32" },
        { of: "blast-beat", at: "8:34", until: "8:43" },
        { of: "half-moon", cast: "8:43", at: "8:48", until: "8:51" },
        { of: "hardcore", cast: "8:53", at: "8:58" },
        { of: "pulping-pulse", at: "9:03" },
        { of: "sanguine-scratch", cast: "9:08", at: "9:11", until: "9:20" },
        { of: "insatiable-thirst", cast: "9:25", at: "9:31" },
        { of: "crowd-kill", cast: "9:39", at: "9:45" },
        { of: "finale-fatale", cast: "9:54", at: "10:05" },
      ],
    },
  ],
};
