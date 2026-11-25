const fs = require("fs");
const F = "scripts/guides/data/ex5-necron.json";
const raw = fs.readFileSync(F, "utf8");
const d = JSON.parse(raw);
if (JSON.stringify(d, null, 1) !== raw) throw new Error("layout differs from JSON.stringify(d,null,1)");
const U = (t) => `https://youtu.be/-YhoKrmlZmM?t=${t}`;
const R = (src, t, say, en) => ({ src: `frames/ex5-necron/${src}.webp`, say, by: "Nukemaru", url: U(t), en });
const plan = {
  1: [R("blue-shockwave", 42, "Blue Shockwave: cone สีแดงพุ่งไปที่ Tank ที่มุมสนาม (วงสีทอง) ปลาย cone ชี้ออกนอกสนาม", "Blue Shockwave: the red cone on the tank in the corner (gold ring), pointing out of the arena")],
  2: [R("fear-of-death-hands", 68, "Fear of Death: Icy Hands โผล่ขึ้นจากบ่อสีม่วงบนพื้น (วงสีทอง) แต่ละคนล่อแนวยิงของมือตัวเองออกนอกสนาม", "Fear of Death: Icy Hands rise from the purple puddles (gold rings); each player baits their own hand's line out of the arena")],
  5: [R("cold-grip-dark-arm", 79, "ก่อน Cold Grip: แขนบอสข้างที่เรืองแสงสีดำ (วงสีทอง) = AoE ฝั่งนั้นกว้างกว่าครึ่งสนาม หลบสองข้างที่แนวกลาง แล้วไปอีกฝั่ง", "Before Cold Grip: the boss arm glowing black (gold ring) = that side's AoE covers more than half; dodge the sides in the middle, then go to the other side")],
  6: [R("memento-mori-hands", 116, "Memento Mori: มือบอสข้างหนึ่งเรืองแสงสีขาว อีกข้างสีดำ ฝั่งมือดำ: Tank / ฝั่งมือขาว: DPS กับ Healer", "Memento Mori: one boss hand glows white, the other black. Black side: tanks / white side: DPS and healers")],
  8: [R("memento-mori-smite", 109, "Smite of Gloom: วง AoE สีชมพูขนาดใหญ่บนทุกคน และมือสีดำในแนวกลาง หลบแนวยิงของมือ แล้ววางวงตามจุด", "Smite of Gloom: huge pink circles on everyone and the dark hands in the middle strip; dodge the hands' lines and drop your circle on your spot")],
  9: [R("soul-reaping-line", 188, "Soul Reaping: ในวงของบอสมีแท่งสีฟ้าแนวตั้งตรงกลาง = AoE แนวตรงกลางสนาม: จำว่า out", "Soul Reaping: one blue bar down the middle of the boss's ring = a line down the middle: remember out"),
      R("soul-reaping-sides", 148, "Soul Reaping: แท่งสีฟ้าสองข้างของวงบอส ตรงกลางมืด = AoE แนวตรงสองข้าง: จำว่า in", "Soul Reaping: blue bars on both sides of the boss's ring, dark in the middle = lines on both sides: remember in")],
  12: [R("blight-beams", 180, "Twofold Blight ตอน AoE สองข้าง (in): ลำแสงสีฟ้าพุ่งไปหาสองกลุ่มที่ stack 4:4 ในแนวกลาง (วงสีทอง)", "Twofold Blight with lines on both sides (in): blue beams hit the two groups stacked 4:4 in the middle strip (gold rings)")],
  18: [R("grand-cross", 274, "Grand Cross: สนามกลายเป็นวงกลม มีลูกแก้วสีฟ้ารอบขอบ (วงสีทอง) หลบ AoE แนวตรงที่หมุนรอบขอบสนาม", "Grand Cross: the arena turns round, with blue orbs around the edge (gold rings); dodge the lines sweeping round the edge")],
  21: [R("neutron-ring", 328, "Neutron Ring: โดมสีฟ้าคลุมทั้งสนาม = AoE ทั้งปาร์ตี้ (raid-wide) โดนแล้วสนามกลับเป็นสนามปกติ", "Neutron Ring: a blue dome over the whole arena = raid-wide; afterwards the arena goes back to normal")],
  22: [R("adds-beckoning-hand", 350, "Beckoning Hands: มือใหญ่ (วงสีทอง) ใช้ tankbuster ใส่คนที่ hate อันดับ 1: Tank ต้องดึง hate ไว้", "Beckoning Hands: the big hand (gold ring) tankbusters whoever is first on hate: the tanks must hold it")],
  23: [R("eternity-jump-pad", 470, "Darkness of Eternity: ฆ่า Add เสร็จแล้ว ขึ้นไปยืนบนพื้นวงกลมนี้ (วงสีทอง) เพื่อกลับสนามปกติ", "Darkness of Eternity: after your add dies, step onto this round floor (gold ring) to go back to the arena")],
  24: [R("specter-of-death", 490, "Specter of Death: บอสโยงสายไปขอบสนาม มือยักษ์โผล่ที่ปลายสาย (วงสีทอง) แล้วยิง AoE แนวตรงจากตรงนั้น", "Specter of Death: the boss tethers to the arena edge; a giant hand rises at the tether's end (gold ring) and fires a line from there")],
  25: [R("ends-embrace-circles", 498, "The End's Embrace: วง AoE สีส้มใต้ทุกคน วางที่จุดของตัวเองใน safe zone", "The End's Embrace: an orange circle under everyone; drop it on your own spot in the safe zone")],
  27: [R("relentless-reaping-souls", 765, "Relentless Reaping: AoE แต่ละแบบโผล่ในวงบอสทีละแบบ แล้วไปเป็นวงเล็กรอบบอส (วงสีทอง) จำนวนเครื่องหมายสีฟ้า = ลำดับ", "Relentless Reaping: each AoE shows in the boss's ring one at a time, then becomes a small ring round the boss (gold rings); its number of blue marks = its order")],
  28: [R("crop-rotation", 576, "หลัง Crop Rotation: เริ่มที่วงใต้ marker ตรงหน้าบอส (วงสีทอง ภาพนี้ 2 เครื่องหมาย = เริ่มที่ 2) แล้ววนตามเข็มนาฬิกา", "After Crop Rotation: start from the ring under the marker in front of the boss (gold ring; 2 marks here = start at 2), then go clockwise")],
  41: [R("circle-of-lives", 621, "Circle of Lives: ลูกแก้วสีฟ้าบนสนาม (วงสีทอง) แต่ละลูกปล่อย donut ทีละลูกตามลำดับ", "Circle of Lives: blue orbs on the field (gold rings); each releases a donut, one after another")],
  49: [R("mass-macabre-towers", 704, "Mass Macabre: tower สีชมพูบนพื้น (วงสีทอง) เข้าแล้วติด debuff สั้นๆ รอ debuff หายก่อนเข้าอันถัดไป", "Mass Macabre: pink towers on the floor (gold rings); a tower leaves a short debuff, wait for it to end before the next one")],
  53: [R("mass-macabre-tankbuster", 716, "tankbuster ระหว่าง Mass Macabre: cone สีแดงใส่ MT ที่มุมสนาม (วงสีทอง) คนอื่นที่ไม่ใช่ Tank เข้า tower 3 คน", "The tankbuster during Mass Macabre: a red cone on the MT in the corner (gold ring); everyone but the tanks takes the 3-person towers")],
};
const before = d.steps.map((s) => (s.refs || []).map((r) => r.src).join(","));
d.steps.forEach((s, i) => {
  const p = plan[i];
  if (!p) { if (s.refs) throw new Error(`step ${i} has refs not in plan: ${JSON.stringify(s.refs)}`); return; }
  if (p.length > 4) throw new Error("too many");
  for (const r of p) { if (r.say.length > 160 || r.en.length > 160) throw new Error(`long caption step ${i}: ${r.say.length}/${r.en.length}`); }
  const refs = p.map(({ en, ...r }) => r), enRefs = p.map((r) => r.en);
  // put refs where the other steps keep them: before ring / scene / en
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "refs") continue;
    if (!("refs" in out) && ["ring", "scene", "en"].includes(k)) out.refs = refs;
    out[k] = v;
  }
  if (!("refs" in out)) out.refs = refs;
  const en = { ...(out.en || {}) }; delete en.refs; en.refs = enRefs; out.en = en;
  d.steps[i] = out;
});
fs.writeFileSync(F, JSON.stringify(d, null, 1));
d.steps.forEach((s, i) => { const now = (s.refs || []).map((r) => r.src).join(","); if (now !== before[i]) console.log(i, before[i] || "-", "=>", now); });
