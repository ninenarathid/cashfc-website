// Sets EX2's Hamukatsu footage refs (new wide pictures), editing the data file's
// text in place so its Python indent-1 layout survives; then checks the parsed
// result equals the original object with exactly these refs set.
// usage: node apply-refs.cjs [--write]
const fs = require("fs");
const repo = ".";
const rel = "scripts/guides/data/ex2-zoraal-ja.json";
const VID = "2Yq4hrQQsNI", by = "Hamukatsu";
const yt = (t) => `https://youtu.be/${VID}?t=${t}`;
const f = (n) => `frames/ex2-zoraal-ja/${n}.webp`;

const set = {
  2: [
    { src: f("divide-x"), t: 27,
      say: "Multidirectional Divide: แถบสีส้มรูปตัว X บนพื้น = AoE ที่ขึ้นก่อน",
      en: "Multidirectional Divide: the orange X-shaped bands on the floor = the AoE that comes first" },
    { src: f("divide-cuts"), t: 33,
      say: "จากนั้นมีเส้นเหลืองขึ้นตามแนว X = รอยตัด ซึ่งยิง AoE เป็นเส้นตรงออกไปด้วย",
      en: "Then yellow lines appear along the X = the cuts, which fire straight line AoEs too" }],
  3: [{ src: f("half-glowing-sword"), t: 44,
    say: "ดาบ 2 เล่มของบอส: เล่มขวาในภาพเรืองแสงสีฟ้า (วงทอง) เล่มซ้ายไม่เรือง / Forward Half ปลอดภัยหน้าบอสฝั่งดาบเรือง / Backward Half หลังบอสฝั่งดาบไม่เรือง",
    en: "The boss's 2 swords: the right one glows blue (gold ring), the left does not / Forward Half: safe in front, glowing side / Backward Half: behind, other side" }],
  6: [{ src: f("divide-x-tethers"), t: 84,
    say: "เส้นแดง 2 เส้นจากบอส = สายของ Regicidal Rage ที่ MT กับ ST รับคนละเส้น / เส้นเหลืองบนพื้น = แนว X และรอยตัดของ Multidirectional Divide",
    en: "The 2 red lines from the boss = Regicidal Rage's tethers, one each for MT and ST / the yellow lines on the floor = Multidirectional Divide's X and cuts" }],
  10: [{ src: f("vollok-sync-floor"), t: 131,
    say: "พื้นรอบนอกที่ขอบเรืองสีฟ้า = พื้นที่ Sync เชื่อมกับพื้นกลาง / ช่องสีส้มที่มีดาบปัก (วงทอง) = ช่องเดียวกันบนพื้นกลางโดน AoE ด้วย",
    en: "Outer floors with glowing blue edges = Sync floors, linked to the middle / each orange tile with a sword (gold rings) = that tile of the middle floor is hit too" }],
  11: [{ src: f("half-full-sword"), t: 144,
    say: "Half Full: ดาบของบอสโผล่ยาวออกไปทางขวาในภาพ (แสงสีฟ้า) = ครึ่งสนามฝั่งนั้นจะโดน",
    en: "Half Full: the boss's sword reaches out to the right here (blue light) = that half of the arena will be hit" }],
  19: [
    { src: f("gateway-red-green-lines"), t: 162,
      say: "เส้นแดง: เส้นที่ลุกเป็นไฟ (วงทอง) AoE ตามเส้นนี้ขยายเป็น 3 แถว / เส้นเขียว: เส้นสีเขียวอมฟ้าบางๆ (ลูกศร) AoE ตามเส้นนี้ผลักกระเด็น",
      en: "Red lines: the lines on fire (gold rings); an AoE along one widens to 3 rows / Green lines: the thin teal-green lines (arrow); an AoE along one knocks back" },
    { src: f("gateway-blue-lines"), t: 158,
      say: "เส้นฟ้า: เส้นพลังงานสีฟ้า มีลูกแก้วที่ปลาย ไขว้กันแบบจับฉลากลากเส้น (วงทอง) ไล่ตามเส้นดูว่าไปออกแถวไหน",
      en: "Blue lines: blue energy lines with an orb at each end, crossing like a ladder lottery (gold ring); follow each one to see which row it reaches" }],
  22: [{ src: f("chasm-markers"), t: 870,
    say: "Chasm of Vollok: สามเหลี่ยมสีเหลืองบนหัวทุกคน = AoE ลงช่องที่ยืน spread คนละช่อง อย่าทับใคร (ภาพจากรอบที่ 3)",
    en: "Chasm of Vollok: a yellow triangle over everyone = an AoE on the tile you stand on; spread one per tile, overlap nobody (from the 3rd time)" }],
  27: [{ src: f("triumph-lines-swords"), t: 347,
    say: "Projection of Triumph: เส้นที่ขอบสนาม (ลูกศรซ้าย) กับดาบที่ปักพื้น (วงทอง) เส้นชนดาบเมื่อไหร่ เกิด AoE ทุกครั้ง",
    en: "Projection of Triumph: the line at the arena's edge (left arrow) and the swords in the floor (gold ring); every time the line touches a sword, an AoE goes off" }],
  38: [{ src: f("turmoil-line"), t: 452,
    say: "Projection of Turmoil: เส้นที่มีลูกไฟสีส้มเคลื่อนเข้ามาจากขอบสนาม แตะเส้นเมื่อไหร่เกิด stack ที่ตัวเรา ผลัดกันแตะทีละคน",
    en: "Projection of Turmoil: the line of orange fire orbs sweeping in from the edge; touching it sets off a stack on you, so take turns one at a time" }],
  41: [{ src: f("drum-stack-rings"), t: 531,
    say: "Drum of Vollok: วงขาวบนพื้น = เครื่องหมาย stack 2 คน คนที่ไม่มีเครื่องหมายไปยืนต่อหลังคู่ของตัวเอง",
    en: "Drum of Vollok: the white rings on the floor = 2-person stack markers; whoever has none lines up behind their partner" }],
  45: [{ src: f("aero-iii-wind"), t: 638,
    say: "Aero III: ลมหมุนสีเขียวบนพื้น (วงทอง) เดินเข้าไปจะถูกพัดไปพื้นอีกฝั่ง",
    en: "Aero III: the green whirlwind on the floor (gold ring); walking into it throws you to the other floor" }],
  49: [{ src: f("dutys-edge-marker"), t: 622,
    say: "Duty's Edge: ลูกศรสีส้มชี้ลงเรียงจากบอส (วงทอง) = เครื่องหมาย line stack ทุกคนไปรวมกันในแนวเส้นนี้",
    en: "Duty's Edge: the column of orange arrows from the boss (gold ring) = the line stack marker; everyone gathers in its line" }],
  50: [{ src: f("burning-chains"), t: 647,
    say: "Burning Chains: เส้นโซ่ไฟสีส้ม (วงทอง) โยง Tank/Healer กับ DPS เป็นคู่",
    en: "Burning Chains: the orange fiery chains (gold ring) tie tanks/healers to DPS in pairs" }],
  55: [{ src: f("half-circuit-far"), t: 702,
    say: "Half Circuit: ดาบสีฟ้าเล่มใหญ่ไปอยู่ห่างจากบอสถึงริมสนาม (วงทอง) = นอกวงเป้าโดน (ถ้าดาบอยู่ใกล้บอส ในวงเป้าโดน)",
    en: "Half Circuit: the big blue blade lies far from the boss, at the edge (gold ring) = outside the target circle is hit (blades close to the boss: inside is hit)" }],
};

const path = `${repo}/${rel}`;
const orig = fs.readFileSync(path, "utf8");
const data = JSON.parse(orig);
const jp = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;
const isVideo = (r) => typeof r.src === "string" && r.src.startsWith("frames/ex2-zoraal-ja/");

for (const [i, list] of Object.entries(set)) {
  const st = data.steps[i];
  if ((st.refs ?? []).some((r) => !isVideo(r))) throw new Error(`step ${i}: has non-video refs; handle by hand`);
  if (list.length > 4) throw new Error(`step ${i}: more than 4 refs`);
  for (const r of list) {
    for (const t of [r.say, r.en]) {
      if (t.length > 160) throw new Error(`step ${i}: caption ${t.length} > 160: ${t}`);
      if (jp.test(t)) throw new Error(`step ${i}: Japanese in caption`);
    }
    if (!fs.existsSync(`${repo}/scripts/guides/data/${r.src}`)) throw new Error(`missing ${r.src}`);
  }
}

// intended object
const want = JSON.parse(orig);
for (const [i, list] of Object.entries(set)) {
  const st = want.steps[i];
  const refs = list.map((r) => ({ src: r.src, say: r.say, by, url: yt(r.t) }));
  if (st.refs) st.refs = refs;
  else {
    const out = {};
    const after = "game8" in st ? "game8" : null;
    for (const [k, v] of Object.entries(st)) { if (!after && k === "en") out.refs = refs; out[k] = v; if (k === after) out.refs = refs; }
    if (!out.refs) throw new Error(`step ${i}: no game8 to insert after`);
    want.steps[i] = out;
  }
  want.steps[i].en.refs = list.map((r) => r.en);
}

let s = orig;
const stepStarts = [];
{ const re = /\n  \{\n   "phase": /g; const from = s.indexOf('\n "steps": ['); const to = s.indexOf('\n "rewards": ['); let m;
  while ((m = re.exec(s))) if (m.index > from && (to < 0 || m.index < to)) stepStarts.push(m.index); }
if (stepStarts.length !== data.steps.length) throw new Error(`found ${stepStarts.length} step starts, want ${data.steps.length}`);
const q = (x) => JSON.stringify(x);
for (const i of Object.keys(set).map(Number).sort((a, b) => b - a)) {
  const start = stepStarts[i], end = i + 1 < stepStarts.length ? stepStarts[i + 1] : s.indexOf('\n "rewards": [');
  let block = s.slice(start, end);
  if (!block.includes(`"name": ${q(data.steps[i].name)}`)) throw new Error(`step ${i}: name mismatch`);
  const items = set[i].map((r) => `\n    {\n     "src": ${q(r.src)},\n     "say": ${q(r.say)},\n     "by": ${q(by)},\n     "url": ${q(yt(r.t))}\n    }`).join(",");
  const newRefs = `\n   "refs": [${items}\n   ],`;
  const r0 = block.indexOf('\n   "refs": [');
  if (r0 >= 0) {
    const r1 = block.indexOf("\n   ],", r0) + "\n   ],".length;
    block = block.slice(0, r0) + newRefs + block.slice(r1);
  } else {
    const g = block.indexOf('\n   "game8": [');
    // after game8, or (no game8) just before en
    const gEnd = g >= 0 ? block.indexOf("\n   ],", g) + "\n   ],".length : block.indexOf('\n   "en": {');
    if (gEnd < 0) throw new Error(`step ${i}: nowhere to insert`);
    block = block.slice(0, gEnd) + newRefs + block.slice(gEnd);
  }
  const e = block.indexOf('\n   "en": {');
  if (e < 0) throw new Error(`step ${i}: no en`);
  const enItems = set[i].map((r) => `\n     ${q(r.en)}`).join(",");
  const er0 = block.indexOf('\n    "refs": [', e);
  if (er0 >= 0) {
    const er1 = block.indexOf("\n    ]", er0) + "\n    ]".length;
    block = block.slice(0, er0) + `\n    "refs": [${enItems}\n    ]` + block.slice(er1);
  } else {
    const eEnd = block.indexOf("\n   }\n  }", e);
    if (eEnd < 0) throw new Error(`step ${i}: en end`);
    block = block.slice(0, eEnd) + `,\n    "refs": [${enItems}\n    ]` + block.slice(eEnd);
  }
  s = s.slice(0, start) + block + s.slice(end);
}

const got = JSON.parse(s);
if (JSON.stringify(got) !== JSON.stringify(want)) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  let k = 0; while (k < a.length && a[k] === b[k]) k++;
  throw new Error("differs at " + k + ":\n" + a.slice(k - 150, k + 150) + "\n---\n" + b.slice(k - 150, k + 150));
}
console.log("ok: parsed result equals the intended object;", Object.values(set).flat().length, "refs on steps", Object.keys(set).join(", "));
console.log("lines before", orig.split("\n").length, "after", s.split("\n").length);
if (process.argv.includes("--write")) { fs.writeFileSync(path, s); console.log("written", rel); }
