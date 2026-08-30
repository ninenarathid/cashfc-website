import type { Guide } from "./types";

/**
 * M9S — Vamp Fatale.
 *
 * The timeline is the fight's own: every cast, its resolve, and every repeat,
 * taken from the Exia rotation sheet rather than summarised from a written
 * guide. Cast and resolve are kept apart because a raid calls both — one is when
 * to press mitigation, the other when to already be standing somewhere.
 *
 * Almost every skill here is a stub, and deliberately so. It carries its name,
 * its time and what it does, and says plainly that nobody has written the
 * strategy yet. Only Blast Beat has one, because it is the only mechanic that
 * has been explained by somebody who has stood in it.
 *
 * To fill one in, give it `variants` with the beats and the eight positions.
 * Nothing else has to change: the diagram, the step-through and the quiz all
 * read the same numbers.
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

  phases: [
    {
      id: "p1",
      name: { th: "เฟส 1 — เหมือน A10 อีกแล้ว", en: "Phase 1 — It's A10 Again" },
      enter: "0:05",
      mechanics: [
        {
          id: "killer-voice-1",
          name: "Killer Voice",
          cast: "0:05",
          at: "0:10",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้",
            en: "Raid damage.",
          },
        },
        {
          id: "hardcore-2",
          name: "Hardcore",
          cast: "0:15",
          at: "0:20",
          tags: ["tank"],
          what: {
            th: "Tank buster ลง tank ทั้งสองคน เป็นวง AoE",
            en: "Buster AoE on both tanks.",
          },
        },
        {
          id: "vamp-stomp-3",
          name: "Vamp Stomp",
          cast: "0:25",
          at: "0:30",
          tags: ["pattern"],
          what: {
            th: "วง AoE ที่ปล่อยวงแหวนขยายออกมา",
            en: "Circle AoE that spawns an expanding ring.",
          },
        },
        {
          id: "blast-beat-start-4",
          name: "Blast Beat Start",
          at: "0:34",
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
          id: "blast-beat-end-5",
          name: "Blast Beat End",
          at: "0:42",
          tags: ["targeted"],
          what: {
            th: "คนที่ติด debuff จะมีวง AoE ติดตัว วงแหวนที่ขยายออกมาจะล้าง debuff ให้ และค้างคาวก็ระเบิดเป็น AoE เมื่อวงแหวนวิ่งไปโดน",
            en: "AoE on players with the debuff, cleansed by the expanding ring. Bats also explode in an AoE when the ring reaches them.",
          },
        },
        {
          id: "brutal-rain-6",
          name: "Brutal Rain",
          cast: "0:42",
          at: "0:46",
          tags: ["shared"],
          what: {
            th: "ดาเมจแชร์หลายครั้งติดกัน",
            en: "Multi-hit shared damage AoE.",
          },
        },
        {
          id: "sadistic-screech-7",
          name: "Sadistic Screech",
          cast: "0:55",
          at: "1:01",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และเปลี่ยนรูปสนาม",
            en: "Raid damage. Changes the arena.",
          },
        },
        {
          id: "dead-wake-coffinmaker-8",
          name: "Dead Wake + Coffinmaker",
          at: "1:08",
          tags: ["adds"],
          what: {
            th: "มอนใบเลื่อยที่เลื่อนไปข้างหน้าเป็นระยะพร้อมกับ Dead Wake",
            en: "Sawblade add that pushes forward periodically with Dead Wake.",
          },
        },
        {
          id: "half-moon-coffinfiller-1-9",
          name: "Half Moon + Coffinfiller #1",
          cast: "1:10",
          at: "1:15",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-coffinfiller-2-10",
          name: "Half Moon + Coffinfiller #2",
          at: "1:18",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "dead-wake-11",
          name: "Dead Wake",
          cast: "1:21",
          at: "1:26",
          tags: ["adds"],
          what: {
            th: "จังหวะที่ Coffinmaker เลื่อนตัวไปข้างหน้า",
            en: "The push that moves Coffinmaker forward.",
          },
        },
        {
          id: "half-moon-coffinfiller-1-12",
          name: "Half Moon + Coffinfiller #1",
          cast: "1:28",
          at: "1:33",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-coffinfiller-2-13",
          name: "Half Moon + Coffinfiller #2",
          at: "1:36",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "dead-wake-14",
          name: "Dead Wake",
          cast: "1:38",
          at: "1:43",
          tags: ["adds"],
          what: {
            th: "จังหวะที่ Coffinmaker เลื่อนตัวไปข้างหน้า",
            en: "The push that moves Coffinmaker forward.",
          },
        },
        {
          id: "half-moon-coffinfiller-1-15",
          name: "Half Moon + Coffinfiller #1",
          cast: "1:45",
          at: "1:50",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-coffinfiller-2-16",
          name: "Half Moon + Coffinfiller #2",
          at: "1:53",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-coffinfiller-1-17",
          name: "Half Moon + Coffinfiller #1",
          cast: "1:56",
          at: "2:01",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-coffinfiller-2-18",
          name: "Half Moon + Coffinfiller #2",
          at: "2:04",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "dead-wake-19",
          name: "Dead Wake?",
          cast: "2:06",
          at: "2:11",
          tags: ["adds"],
          what: {
            th: "จังหวะที่ Coffinmaker เลื่อนตัวไปข้างหน้า",
            en: "The push that moves Coffinmaker forward.",
          },
        },
        {
          id: "sadistic-screech-20",
          name: "Sadistic Screech",
          cast: "2:13",
          at: "2:18",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และเปลี่ยนรูปสนาม",
            en: "Raid damage. Changes the arena.",
          },
        },
      ],
    },
    {
      id: "p2",
      name: { th: "เฟส 2 — ใบเลื่อยเพิ่มอีก", en: "Phase 2 — More buzz saws" },
      enter: "2:27",
      mechanics: [
        {
          id: "crowd-kill-21",
          name: "Crowd Kill",
          cast: "2:27",
          at: "2:33",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และบอสได้ stack เพิ่ม",
            en: "Raid damage. The boss gains stacks.",
          },
        },
        {
          id: "finale-fatale-22",
          name: "Finale Fatale",
          cast: "2:46",
          at: "2:51",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ สร้างกำแพงตาย และวง AoE บนพื้น",
            en: "Raid damage, creates a death wall and circle floor AoEs.",
          },
        },
        {
          id: "pulping-pulse-23",
          name: "Pulping Pulse",
          at: "2:57",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "aetherletting-cones-start-24",
          name: "Aetherletting Cones Start",
          cast: "2:58",
          at: "3:10",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-spreads-1-25",
          name: "Aetherletting Spreads #1",
          at: "3:13",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-spreads-2-26",
          name: "Aetherletting Spreads #2",
          at: "3:15",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-spreads-3-27",
          name: "Aetherletting Spreads #3",
          at: "3:17",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-cones-end-28",
          name: "Aetherletting Cones End",
          at: "3:17",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-spreads-4-29",
          name: "Aetherletting Spreads #4",
          at: "3:19",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-x-start-30",
          name: "Aetherletting +/x Start",
          at: "3:27",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "aetherletting-x-end-31",
          name: "Aetherletting +/x End",
          at: "3:33",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE บนพื้น มีวง AoE ลงคนที่ติดมาร์ค ทิ้งรอยไหม้ไว้บนพื้น แล้วรอยไหม้จะยิง AoE เป็นรูป + หรือ x",
            en: "Cone floor AoEs, with circle AoEs on marked players that leave burns on the floor. The burns then fire + or x AoEs.",
          },
        },
        {
          id: "hardcore-32",
          name: "Hardcore",
          cast: "3:35",
          at: "3:40",
          tags: ["tank"],
          what: {
            th: "Tank buster ลง tank ทั้งสองคน เป็นวง AoE",
            en: "Buster AoE on both tanks.",
          },
        },
        {
          id: "pulping-pulse-33",
          name: "Pulping Pulse",
          at: "3:45",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "vamp-stomp-34",
          name: "Vamp Stomp",
          cast: "3:46",
          at: "3:51",
          tags: ["pattern"],
          what: {
            th: "วง AoE ที่ปล่อยวงแหวนขยายออกมา",
            en: "Circle AoE that spawns an expanding ring.",
          },
        },
        {
          id: "blast-beat-start-35",
          name: "Blast Beat Start",
          at: "3:53",
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
          id: "blast-beat-end-36",
          name: "Blast Beat End",
          at: "4:02",
          tags: ["targeted"],
          what: {
            th: "คนที่ติด debuff จะมีวง AoE ติดตัว วงแหวนที่ขยายออกมาจะล้าง debuff ให้ และค้างคาวก็ระเบิดเป็น AoE เมื่อวงแหวนวิ่งไปโดน",
            en: "AoE on players with the debuff, cleansed by the expanding ring. Bats also explode in an AoE when the ring reaches them.",
          },
        },
        {
          id: "half-moon-1-37",
          name: "Half Moon #1",
          cast: "4:02",
          at: "4:07",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-2-38",
          name: "Half Moon #2",
          at: "4:10",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "brutal-rain-39",
          name: "Brutal Rain",
          cast: "4:12",
          at: "4:17",
          tags: ["shared"],
          what: {
            th: "ดาเมจแชร์หลายครั้งติดกัน",
            en: "Multi-hit shared damage AoE.",
          },
        },
        {
          id: "insatiable-thirst-40",
          name: "Insatiable Thirst",
          cast: "4:25",
          at: "4:31",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้",
            en: "Raid damage.",
          },
        },
        {
          id: "sadistic-screech-41",
          name: "Sadistic Screech",
          cast: "4:38",
          at: "4:44",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และเปลี่ยนรูปสนาม",
            en: "Raid damage. Changes the arena.",
          },
        },
        {
          id: "gravegrazer-start-42",
          name: "Gravegrazer Start",
          at: "4:48",
          tags: ["adds"],
          what: {
            th: "ใบเลื่อยที่เคลื่อนที่ไปทั่วสนาม",
            en: "Sawblades moving throughout the arena.",
          },
        },
        {
          id: "plummet-x2-deadly-doornail-43",
          name: "Plummet x2 + Deadly Doornail",
          at: "4:56",
          tags: ["pattern"],
          what: {
            th: "หอคอยของ tank และวง AoE บนพื้น หอคอยที่ถูกเหยียบจะเกิด Fatal Flail",
            en: "Tank towers and puddle AoEs. Towers spawn Fatal Flail when soaked.",
          },
        },
        {
          id: "killer-voice-44",
          name: "Killer Voice",
          cast: "5:00",
          at: "5:05",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้",
            en: "Raid damage.",
          },
        },
        {
          id: "plummet-x2-deadly-doornail-45",
          name: "Plummet x2 + Deadly Doornail",
          at: "5:15",
          tags: ["pattern"],
          what: {
            th: "หอคอยของ tank และวง AoE บนพื้น หอคอยที่ถูกเหยียบจะเกิด Fatal Flail",
            en: "Tank towers and puddle AoEs. Towers spawn Fatal Flail when soaked.",
          },
        },
        {
          id: "killer-voice-46",
          name: "Killer Voice",
          cast: "5:19",
          at: "5:24",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้",
            en: "Raid damage.",
          },
        },
        {
          id: "plummet-x2-deadly-doornail-47",
          name: "Plummet x2 + Deadly Doornail",
          at: "5:33",
          tags: ["pattern"],
          what: {
            th: "หอคอยของ tank และวง AoE บนพื้น หอคอยที่ถูกเหยียบจะเกิด Fatal Flail",
            en: "Tank towers and puddle AoEs. Towers spawn Fatal Flail when soaked.",
          },
        },
        {
          id: "sadistic-screech-48",
          name: "Sadistic Screech",
          cast: "5:51",
          at: "5:57",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และเปลี่ยนรูปสนาม",
            en: "Raid damage. Changes the arena.",
          },
        },
      ],
    },
    {
      id: "p3",
      name: { th: "เฟส 3 — Hell in a Cell", en: "Phase 3 — Hell in a Cell" },
      enter: "6:05",
      mechanics: [
        {
          id: "crowd-kill-49",
          name: "Crowd Kill",
          cast: "6:05",
          at: "6:11",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และบอสได้ stack เพิ่ม",
            en: "Raid damage. The boss gains stacks.",
          },
        },
        {
          id: "finale-fatale-50",
          name: "Finale Fatale",
          cast: "6:24",
          at: "6:29",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ สร้างกำแพงตาย และวง AoE บนพื้น",
            en: "Raid damage, creates a death wall and circle floor AoEs.",
          },
        },
        {
          id: "pulping-pulse-51",
          name: "Pulping Pulse",
          at: "6:35",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "hell-in-a-cell-52",
          name: "Hell in a Cell",
          cast: "6:36",
          at: "6:41",
          tags: ["pattern"],
          what: {
            th: "หอคอย 4 ต้นที่ต้องเหยียบ และจะเกิด Charnel Cell",
            en: "Four tower soaks. Spawns Charnel Cell.",
          },
        },
        {
          id: "ultrasonic-spread-amp-53",
          name: "Ultrasonic Spread / Amp",
          cast: "6:43",
          at: "6:49",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE ลงคนละ 1 คนของแต่ละ role",
            en: "Cone AoEs on one player of each role.",
          },
        },
        {
          id: "ultrasonic-spread-amp-54",
          name: "Ultrasonic Spread / Amp",
          cast: "6:50",
          at: "6:56",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE ลงคนละ 1 คนของแต่ละ role",
            en: "Cone AoEs on one player of each role.",
          },
        },
        {
          id: "hell-in-a-cell-55",
          name: "Hell in a Cell",
          cast: "6:58",
          at: "7:03",
          tags: ["pattern"],
          what: {
            th: "หอคอย 4 ต้นที่ต้องเหยียบ และจะเกิด Charnel Cell",
            en: "Four tower soaks. Spawns Charnel Cell.",
          },
        },
        {
          id: "ultrasonic-spread-amp-56",
          name: "Ultrasonic Spread / Amp",
          cast: "7:06",
          at: "7:11",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE ลงคนละ 1 คนของแต่ละ role",
            en: "Cone AoEs on one player of each role.",
          },
        },
        {
          id: "ultrasonic-spread-amp-57",
          name: "Ultrasonic Spread / Amp",
          cast: "7:13",
          at: "7:18",
          tags: ["targeted"],
          what: {
            th: "กรวย AoE ลงคนละ 1 คนของแต่ละ role",
            en: "Cone AoEs on one player of each role.",
          },
        },
        {
          id: "pulping-pulse-58",
          name: "Pulping Pulse",
          at: "7:24",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "pulping-pulse-59",
          name: "Pulping Pulse",
          at: "7:28",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "undead-deathmatch-60",
          name: "Undead Deathmatch",
          cast: "7:29",
          at: "7:34",
          tags: ["pattern"],
          what: {
            th: "หอคอยแชร์ดาเมจ 2 ต้น และจะเกิดค้างคาวที่โยงเชือกกับคนที่เหยียบ",
            en: "Two shared-damage tower soaks. Spawns bats tethering to the soaking players.",
          },
        },
        {
          id: "sanguine-scratch-start-61",
          name: "Sanguine Scratch Start",
          cast: "7:38",
          at: "7:41",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "sanguine-scratch-end-62",
          name: "Sanguine Scratch End",
          at: "7:51",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "beat-drop-63",
          name: "Beat / Drop",
          at: "7:54",
          tags: ["shared"],
          what: {
            th: "AoE บนค้างคาว เป็นโดนัทหรือวงกลม",
            en: "Donut or circle AoE on a bat.",
          },
        },
        {
          id: "sanguine-scratch-start-64",
          name: "Sanguine Scratch Start",
          cast: "7:56",
          at: "7:59",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "sanguine-scratch-end-65",
          name: "Sanguine Scratch End",
          at: "8:09",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "beat-drop-66",
          name: "Beat / Drop",
          at: "8:12",
          tags: ["shared"],
          what: {
            th: "AoE บนค้างคาว เป็นโดนัทหรือวงกลม",
            en: "Donut or circle AoE on a bat.",
          },
        },
        {
          id: "brutal-rain-67",
          name: "Brutal Rain",
          cast: "8:14",
          at: "8:19",
          tags: ["shared"],
          what: {
            th: "ดาเมจแชร์หลายครั้งติดกัน",
            en: "Multi-hit shared damage AoE.",
          },
        },
        {
          id: "vamp-stomp-68",
          name: "Vamp Stomp",
          cast: "8:27",
          at: "8:32",
          tags: ["pattern"],
          what: {
            th: "วง AoE ที่ปล่อยวงแหวนขยายออกมา",
            en: "Circle AoE that spawns an expanding ring.",
          },
        },
        {
          id: "blast-beat-start-69",
          name: "Blast Beat Start",
          at: "8:34",
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
          id: "blast-beat-end-70",
          name: "Blast Beat End",
          at: "8:43",
          tags: ["targeted"],
          what: {
            th: "คนที่ติด debuff จะมีวง AoE ติดตัว วงแหวนที่ขยายออกมาจะล้าง debuff ให้ และค้างคาวก็ระเบิดเป็น AoE เมื่อวงแหวนวิ่งไปโดน",
            en: "AoE on players with the debuff, cleansed by the expanding ring. Bats also explode in an AoE when the ring reaches them.",
          },
        },
        {
          id: "half-moon-1-71",
          name: "Half Moon #1",
          cast: "8:43",
          at: "8:48",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "half-moon-2-72",
          name: "Half Moon #2",
          at: "8:51",
          tags: ["pattern"],
          what: {
            th: "กวาดครึ่งห้องจากซ้ายหรือขวาของบอส แล้วตามด้วยการกวาดอีกครึ่งที่เหลือ",
            en: "Half-room cleave from the boss's left or right, following up by cleaving her other side.",
          },
        },
        {
          id: "hardcore-73",
          name: "Hardcore",
          cast: "8:53",
          at: "8:58",
          tags: ["tank"],
          what: {
            th: "Tank buster ลง tank ทั้งสองคน เป็นวง AoE",
            en: "Buster AoE on both tanks.",
          },
        },
        {
          id: "pulping-pulse-74",
          name: "Pulping Pulse",
          at: "9:03",
          tags: ["pattern"],
          what: {
            th: "วง AoE บนพื้น",
            en: "Circle floor AoEs.",
          },
        },
        {
          id: "sanguine-scratch-start-75",
          name: "Sanguine Scratch Start",
          cast: "9:08",
          at: "9:11",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "sanguine-scratch-end-76",
          name: "Sanguine Scratch End",
          at: "9:20",
          tags: ["pattern"],
          what: {
            th: "กรวย AoE สลับซ้ายขวา",
            en: "Alternating cone AoEs.",
          },
        },
        {
          id: "insatiable-thirst-77",
          name: "Insatiable Thirst",
          cast: "9:25",
          at: "9:31",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้",
            en: "Raid damage.",
          },
        },
        {
          id: "crowd-kill-78",
          name: "Crowd Kill",
          cast: "9:39",
          at: "9:45",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ และบอสได้ stack เพิ่ม",
            en: "Raid damage. The boss gains stacks.",
          },
        },
        {
          id: "finale-fatale-79",
          name: "Finale Fatale",
          cast: "9:54",
          at: "10:05",
          tags: ["raid"],
          what: {
            th: "ดาเมจทั้งปาร์ตี้ สร้างกำแพงตาย และวง AoE บนพื้น",
            en: "Raid damage, creates a death wall and circle floor AoEs.",
          },
        },
      ],
    },
  ],
};
