// Adds Hamukatsu video frames as refs to EX2's data file, editing the text in
// place so the file's own (Python json, indent 1) layout survives; then checks
// the parsed result equals the original object with exactly these refs added.
// usage: node add-refs.cjs [--write]
const fs = require("fs");
const repo = ".";
const rel = "scripts/guides/data/ex2-zoraal-ja.json";
const VID = "2Yq4hrQQsNI";
const by = "Hamukatsu";
const yt = (t) => `https://youtu.be/${VID}?t=${t}`;
const f = (n) => `frames/ex2-zoraal-ja/${n}.webp`;

// step index -> refs (Thai) and en captions, same order
const add = {
  3: [{ src: f("half-glowing-sword"), t: 64,
    say: "ดาบ 2 เล่มของบอส: เล่มขวาในภาพเรืองแสงสีฟ้า เล่มซ้ายไม่เรือง / Forward Half ปลอดภัยหน้าบอสฝั่งดาบเรือง / Backward Half ปลอดภัยหลังบอสฝั่งดาบไม่เรือง",
    en: "The boss's 2 swords: the right one here glows blue, the left does not / Forward Half: safe in front, glowing side / Backward Half: safe behind, other side" }],
  6: [{ src: f("divide-x-tethers"), t: 88,
    say: "เส้นสีเหลืองบนพื้นที่ตัดกันเป็นตาราง = แนว X และรอยตัดของ Multidirectional Divide / เส้นประสีแดงจากบอส = สายของ Regicidal Rage ที่ Tank ต้องรับ",
    en: "The yellow lines crossing on the floor = Multidirectional Divide's X and its cuts / the red dashed lines from the boss = Regicidal Rage's tethers, for the tanks" }],
  10: [{ src: f("vollok-sync-floor"), t: 868,
    say: "พื้นรอบนอกที่ขอบเรืองสีฟ้า = พื้นที่ Sync เชื่อมกับพื้นกลาง / ช่องสีส้มที่มีดาบปัก = ช่องเดียวกันบนพื้นกลางโดน AoE ด้วย",
    en: "An outer floor with glowing blue edges = a Sync floor, linked to the middle one / each orange tile with a sword = the same tile on the middle floor is hit too" }],
  19: [{ src: f("gateway-red-lines"), t: 898,
    say: "เส้นแดง: เส้นที่ลุกเป็นไฟ เชื่อมพื้นกลางกับพื้นรอบนอก AoE ที่ไต่มาตามเส้นนี้จะขยายเป็น 3 แถว",
    en: "Red lines: the lines on fire, linking the middle floor to an outer one; an AoE that follows one widens to 3 rows" },
  { src: f("gateway-blue-lines"), t: 911,
    say: "เส้นฟ้า: เส้นพลังงานสีฟ้า มีลูกแก้วที่ปลาย ไขว้กันแบบจับฉลากลากเส้น ไล่ตามเส้นดูว่าไปออกแถวไหน",
    en: "Blue lines: blue energy lines with an orb at each end, crossing like a ladder lottery; follow each one to see which row it reaches" }],
  45: [{ src: f("aero-iii-wind"), t: 642,
    say: "Aero III: ลมหมุนสีเขียวบนพื้น เดินเข้าไปจะถูกพัดไปพื้นอีกฝั่ง",
    en: "Aero III: a green whirlwind on the floor; walking into it throws you to the other floor" }],
  49: [{ src: f("dutys-edge-marker"), t: 877,
    say: "Duty's Edge: ลูกศรสีส้มชี้ลงเรียงเป็นแนว = เครื่องหมาย line stack ทุกคนไปรวมกันในแนวเส้นนี้",
    en: "Duty's Edge: a column of orange arrows pointing down = the line stack marker; everyone gathers in its line" }],
  55: [{ src: f("half-circuit-far"), t: 712,
    say: "Half Circuit: ดาบสีฟ้าเล่มใหญ่ไปอยู่ห่างจากบอสถึงริมสนาม = นอกวงเป้าโดน (ถ้าดาบอยู่ใกล้บอส ในวงเป้าโดน)",
    en: "Half Circuit: the big blue blade lies far from the boss, out at the edge = outside the target circle is hit (blades close to the boss: inside is hit)" }],
};

const path = `${repo}/${rel}`;
const orig = fs.readFileSync(path, "utf8");
const data = JSON.parse(orig);
const jp = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;

// checks on the captions and files
for (const [i, list] of Object.entries(add)) {
  if ((data.steps[i].refs ?? []).length + list.length > 4) throw new Error(`step ${i}: more than 4 refs`);
  for (const r of list) {
    for (const s of [r.say, r.en]) {
      if (s.length > 160) throw new Error(`step ${i}: caption ${s.length} > 160: ${s}`);
      if (jp.test(s)) throw new Error(`step ${i}: Japanese in caption`);
    }
    if (!fs.existsSync(`${repo}/scripts/guides/data/${r.src}`)) throw new Error(`missing ${r.src}`);
  }
}

// intended object: refs right after game8, en.refs last in en
const want = JSON.parse(orig);
for (const [i, list] of Object.entries(add)) {
  const s = want.steps[i];
  const refs = list.map((r) => ({ src: r.src, say: r.say, by, url: yt(r.t) }));
  const out = {};
  for (const [k, v] of Object.entries(s)) { out[k] = v; if (k === "game8") out.refs = refs; }
  out.en = { ...s.en, refs: list.map((r) => r.en) };
  want.steps[i] = out;
}

// the text edit, steps from last to first so earlier offsets stay valid
let s = orig;
const stepStarts = [];
{ const re = /\n  \{\n   "phase": /g; const from = s.indexOf('\n "steps": ['); const to = s.indexOf('\n "rewards": ['); let m;
  while ((m = re.exec(s))) if (m.index > from && (to < 0 || m.index < to)) stepStarts.push(m.index); }
if (stepStarts.length !== data.steps.length) throw new Error(`found ${stepStarts.length} step starts, want ${data.steps.length}`);
const q = (x) => JSON.stringify(x);
for (const i of Object.keys(add).map(Number).sort((a, b) => b - a)) {
  const start = stepStarts[i], end = i + 1 < stepStarts.length ? stepStarts[i + 1] : s.indexOf('\n "rewards": [');
  let block = s.slice(start, end);
  if (!block.includes(`"name": ${q(data.steps[i].name)}`)) throw new Error(`step ${i}: name mismatch`);
  const g = block.indexOf('\n   "game8": [');
  const gEnd = block.indexOf("\n   ],", g) + "\n   ],".length;
  if (g < 0 || gEnd < g) throw new Error(`step ${i}: no game8`);
  const items = add[i].map((r) => `\n    {\n     "src": ${q(r.src)},\n     "say": ${q(r.say)},\n     "by": ${q(by)},\n     "url": ${q(yt(r.t))}\n    }`).join(",");
  block = block.slice(0, gEnd) + `\n   "refs": [${items}\n   ],` + block.slice(gEnd);
  const e = block.indexOf('\n   "en": {');
  const eEnd = block.indexOf("\n   }\n  }", e);
  if (e < 0 || eEnd < 0) throw new Error(`step ${i}: no en`);
  const enItems = add[i].map((r) => `\n     ${q(r.en)}`).join(",");
  block = block.slice(0, eEnd) + `,\n    "refs": [${enItems}\n    ]` + block.slice(eEnd);
  s = s.slice(0, start) + block + s.slice(end);
}

const got = JSON.parse(s);
if (JSON.stringify(got) !== JSON.stringify(want)) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  let k = 0; while (k < a.length && a[k] === b[k]) k++;
  throw new Error("differs at " + k + ":\n" + a.slice(k - 150, k + 150) + "\n---\n" + b.slice(k - 150, k + 150));
}
console.log("ok: parsed result equals the intended object;", Object.values(add).flat().length, "refs on steps", Object.keys(add).join(", "));
console.log("lines before", orig.split("\n").length, "after", s.split("\n").length);
if (process.argv.includes("--write")) { fs.writeFileSync(path, s); console.log("written", rel); }
