"""P4 Twintania and Nael (adds) + P5 Golden Bahamut (Tuufless 04_adds, 05_golden_bahamut), in Thai and English."""
from refs import R

P4 = ("P4 Twintania and Nael", "P4 Twintania and Nael")
P5 = ("P5 Golden Bahamut", "P5 Golden Bahamut")
STEPS = []


def st(phase, mech, name, note, img=None, scene=None, strict=False, says=None, refs=None):
    STEPS.append(dict(phase=phase, mech=mech, name=name, note=note, img=img, scene=scene, strict=strict, says=says, refs=refs))


st(P4, "Aethertrial Attunement", ("ภาพรวม: วงจรเดียวซ้ำ 2 รอบ", "Overview: one loop, done twice"),
   ("เฟสนี้ (เรียกกันว่าเฟส adds) ดูน่ากลัวแต่วุ่นน้อยกว่าเฟส Nael ช่วงต้นไฟต์\n"
    "เป็นวงจรเดียวทำซ้ำ 2 รอบ:\n"
    "Plummet / Bahamut's Claw\n"
    "Liquid Hell\n"
    "Hatch → Twister\n"
    "ประโยคของ Nael → Twister\n"
    "Megaflare → Death Sentence / Ravensbeak (รอบสองสลับลำดับ)\n\n"
    "เกจ Aethertrial Attunement ที่ขึ้นมาคือเวลา enrage: ไม่ต้องสนใจ มันจะเต็มเองหลังวงจรที่ 2 จบไปไม่กี่วินาที\n\n"
    "จาก macro: MT รับ Twintania / ST รับ Nael",
    "This phase (the adds phase) looks intimidating but is less chaotic than Nael's phase early on\n"
    "It's one loop done twice:\n"
    "Plummet / Bahamut's Claw\n"
    "Liquid Hell\n"
    "Hatch → Twister\n"
    "Nael's line → Twister\n"
    "Megaflare → Death Sentence / Ravensbeak (swapped on the second loop)\n\n"
    "The Aethertrial Attunement gauge that appears is the enrage timer: ignore it, it fills a few seconds after the second loop\n\n"
    "From the macro: MT takes Twintania / ST takes Nael"),
   refs=R("adds_start"))

st(P4, "Aethertrial Attunement", ("คำพูดของ Nael ช่วงนี้", "Nael's quotes in this phase"),
   ("ท่าแรกเป็น Lunar Dynamo หรือ Iron Chariot เสมอ และรอบที่สอง Nael จะเริ่มด้วยท่าตรงข้ามกับรอบแรกเสมอ\n\n"
    "From hallowed moon I descend, upon burning earth to tread!\n→ Lunar Dynamo → Raven Dive → Thermionic Beam (เข้าใน → spread → stack)\n"
    "From hallowed moon I bare iron, in my descent to wield!\n→ Lunar Dynamo → Iron Chariot → Raven Dive (เข้าใน → ออกนอก → spread)\n"
    "Unbending iron, take fire and descend!\n→ Iron Chariot → Thermionic Beam → Raven Dive (ออกนอก → stack → spread)\n"
    "Unbending iron, descend with fiery edge!\n→ Iron Chariot → Raven Dive → Thermionic Beam (ออกนอก → spread → stack)",
    "The first attack is always Lunar Dynamo or Iron Chariot, and on the second loop Nael always starts with the opposite one\n\n"
    "From hallowed moon I descend, upon burning earth to tread!\n→ Lunar Dynamo → Raven Dive → Thermionic Beam (in → spread → stack)\n"
    "From hallowed moon I bare iron, in my descent to wield!\n→ Lunar Dynamo → Iron Chariot → Raven Dive (in → out → spread)\n"
    "Unbending iron, take fire and descend!\n→ Iron Chariot → Thermionic Beam → Raven Dive (out → stack → spread)\n"
    "Unbending iron, descend with fiery edge!\n→ Iron Chariot → Raven Dive → Thermionic Beam (out → spread → stack)"))

st(P4, "Plummet", ("①: บอส 2 ตัวโผล่ทางเหนือ", "①: the two bosses spawn north"),
   ("บอส 2 ตัวโผล่ทางเหนือ: ดึงลงมา ให้ Twintania อยู่ใกล้ Neurolink 2 วงหน้า\n"
    "MT รับ Twintania / ST รับ Nael\n"
    "บอสเปิดด้วย tankbuster เล็ก Plummet กับ Bahamut's Claw\n"
    "หัน Plummet ของ Twintania ออกจากปาร์ตี้",
    "The two bosses spawn north: bring them down, keeping Twintania near the two front Neurolinks\n"
    "MT takes Twintania / ST takes Nael\n"
    "They open with their mini-tankbusters, Plummet and Bahamut's Claw\n"
    "Point Twintania's Plummet away from the party"),
   img="04_adds_01", scene="ad1", strict=["MT", "ST"],
   says={"MT": ("รับ Twintania หัน Plummet ออกจากปาร์ตี้", "Take Twintania, Plummet pointed away from the party"), "ST": ("รับ Nael", "Take Nael")})

st(P4, "Liquid Hell", ("②: Liquid Hell: D3 ล่อ", "②: Liquid Hell: D3 baits"),
   ("Twintania ร่าย Liquid Hell 5 ลูก ตกใส่ผู้เล่นสุ่มที่อยู่เกินระยะหนึ่ง\nD3 ล่อ / คนอื่นยืนใกล้ Twintania",
    "Twintania casts five Liquid Hells on a random player past a certain distance\nD3 baits / everyone else stays near Twintania"),
   img="04_adds_02", scene="ad2", says={"D3": ("ล่อ Liquid Hell 5 ลูก", "Bait the five Liquid Hells")}, refs=R("adds_lh"))

st(P4, "Hatch", ("③: Hatch 3 DPS: ตำแหน่งตั้งต้น", "③: Hatch on three DPS: base spots"),
   ("Twintania ติด Hatch ที่ DPS สุ่ม 3 คน\n"
    "ตำแหน่งตั้งต้น:\n"
    "D1: Neurolink ซ้ายบน\n"
    "D2: Neurolink ขวาบน\n"
    "D3: Neurolink ล่าง\n"
    "D4: ตัวสำรอง (เริ่มกลางสนาม)\n\n"
    "DPS 1 คนจะไม่โดน: D4 ปรับให้\n"
    "D4 ไม่โดน: D4 ไปขอบสนาม\n"
    "D4 โดน: หาคนที่ไม่โดน แล้วไปแทนที่ตำแหน่งคนนั้น / คนนั้นไปขอบสนาม\n"
    "ภาพ: D2 ไม่โดน D4 จึงไป Neurolink ขวาบน",
    "Twintania targets three random DPS with Hatch\n"
    "Base positions:\n"
    "D1: top-left Neurolink\n"
    "D2: top-right Neurolink\n"
    "D3: bottom Neurolink\n"
    "D4: flex (start in the centre)\n\n"
    "One DPS won't be targeted; D4 adjusts for them\n"
    "D4 not targeted: D4 goes to the edge\n"
    "D4 targeted: find the untargeted player and take their spot / that player goes to the edge\n"
    "Picture: D2 isn't targeted, so D4 takes the top-right Neurolink"),
   img="04_adds_03", scene="ad3", strict=["D1", "D3"],
   says={"D1": ("Neurolink ซ้ายบน", "Top-left Neurolink"), "D2": ("Neurolink ขวาบน", "Top-right Neurolink"),
         "D3": ("Neurolink ล่าง", "Bottom Neurolink"),
         "D4": ("เริ่มกลาง: ไม่โดน → ขอบสนาม / โดน → แทนที่คนที่ไม่โดน", "Start centre: not targeted → edge / targeted → take the untargeted player's spot")},
   refs=R("adds_hatch"))

st(P4, "Twister", ("④: Hatch วิ่งมา + Twister", "④: the orbs move + Twister"),
   ("ลูกบอลวิ่งหาผู้เล่น และ Twintania เริ่มร่าย Twister\n"
    "อยู่ Neurolink 2 วงหน้า: รับ Hatch ก่อน แล้วค่อยออกหลบ Twister\n"
    "อยู่ Neurolink หลัง: ล่อ Twister นอก Neurolink ก่อน แล้วค่อยรับ Hatch",
    "The orbs move to the players and Twintania starts casting Twister\n"
    "In a front Neurolink: resolve Hatch first, then move out for Twister\n"
    "In the back Neurolink: bait Twister outside first, then resolve Hatch"),
   img="04_adds_04", scene="ad4")

st(P4, "Twister", ("⑤: Twister ลง แล้วคนหลังเข้า Neurolink", "⑤: Twisters resolve, then the back player enters"),
   ("Twister ลง\nคนที่อยู่ Neurolink หลังเดินเข้า Neurolink รับ Hatch",
    "The Twisters resolve\nThe back player enters their Neurolink to resolve Hatch"),
   img="04_adds_05", scene="ad5")

NAEL_NOTE = ("Nael พูดประโยคสุ่ม 1 ประโยค ท่าแรกเป็น Lunar Dynamo หรือ Iron Chariot เสมอ\n"
             "ท่าในประโยคมี Lunar Dynamo / Iron Chariot / Raven Dive / Thermionic Beam\n"
             "Nael อยู่ขอบสนาม: Range ยืนนอกระยะ Lunar Dynamo ได้\n"
             "ระวังประโยคที่มี Raven Dive ต่อ Thermionic Beam: สาเหตุ wipe ที่พบบ่อยมากคือ stack กันไม่ทัน",
             "Nael does a random line; the first attack is always Lunar Dynamo or Iron Chariot\n"
             "Her lines mix Lunar Dynamo / Iron Chariot / Raven Dive / Thermionic Beam\n"
             "She's at the edge, so the ranged can outrange Lunar Dynamo\n"
             "Careful with Raven Dive into Thermionic Beam: a very common wipe is not everyone stacking in time")

st(P4, "Lunar Dynamo", ("⑥ Lunar Dynamo: เข้าใน หรือ Range ออกนอกระยะ", "⑥ Lunar Dynamo: in, or the ranged outrange it"),
   (NAEL_NOTE[0] + "\n\nLunar Dynamo: Melee และ Tank เข้าใต้ Nael / Range ยืนนอกระยะ", NAEL_NOTE[1] + "\n\nLunar Dynamo: melee and tanks go in under Nael / the ranged outrange it"),
   img="04_adds_06a", scene="ad6a", refs=R("adds_nael"))

st(P4, "Iron Chariot", ("⑥ Iron Chariot: ออกนอก", "⑥ Iron Chariot: out"),
   ("Iron Chariot: ออกนอกวงรอบ Nael", "Iron Chariot: get out of the circle around Nael"),
   img="04_adds_06b", scene="ad6b")

st(P4, "Raven Dive", ("⑥ Raven Dive: กระจาย", "⑥ Raven Dive: spread"),
   ("Raven Dive: กระจายตัว (Nael พุ่งใส่ผู้เล่นสุ่ม คนอื่นที่โดนวงกระเด็นออกสนาม)\nกระจายตามตำแหน่ง spread ของ macro (ดูขั้น ⑦)",
    "Raven Dive: spread (she dives a random player; anyone else in it is knocked out)\nSpread by the macro's spread spots (see step ⑦)"),
   img="04_adds_06c", scene="ad6c", strict=True)

st(P4, "Thermionic Beam", ("⑥ Thermionic Beam: stack", "⑥ Thermionic Beam: stack"),
   ("Thermionic Beam: ทุกคน stack รวม", "Thermionic Beam: everyone stacks"),
   img="04_adds_06d", scene="ad6d")

SPREAD_SAYS = {"MT": ("แถวหน้า ซ้าย", "Front row, left"), "ST": ("แถวหน้า ขวา", "Front row, right"),
               "D1": ("ซ้าย แถว 2", "Left, second row"), "D2": ("ขวา แถว 2", "Right, second row"),
               "H1": ("ซ้าย แถว 3", "Left, third row"), "H2": ("ขวา แถว 3", "Right, third row"),
               "D3": ("แถวท้าย ซ้าย", "Back row, left"), "D4": ("แถวท้าย ขวา", "Back row, right")}

st(P4, "Twister", ("⑦: Twister: กระจายทิศเดียวกับ Raven Dive", "⑦: Twister: spread the Raven Dive way"),
   ("หลังประโยคของ Nael จบ Twintania ร่าย Twister\nกระจายไปทิศเดียวกับตอน Raven Dive (macro):\nMT ST แถวหน้า / D1 D2 / H1 H2 / D3 D4 แถวท้าย",
    "After Nael's line, Twintania casts Twister\nSpread in the same directions as the Raven Dive spread (macro):\nMT ST front / D1 D2 / H1 H2 / D3 D4 back"),
   img="04_adds_07", scene="ad7", strict=True, says=SPREAD_SAYS)

st(P4, "Megaflare", ("⑧: รวมกลาง: Megaflare + tankbuster ใหญ่", "⑧: gather: Megaflare + the big tankbusters"),
   ("ค่อยๆ รวมกันกลางสนาม ระวัง Twister (โดยเฉพาะบน Neurolink)\n"
    "Nael ร่าย Megaflare แล้วตามด้วย tankbuster ใหญ่ของบอสทั้งสอง (Death Sentence กับ Ravensbeak)\n"
    "debuff จาก tankbuster บังคับสลับ Tank: Provoke แต่ห้าม Shirk\n"
    "สลับตำแหน่งที่ Tank แทน ไม่ต้องย้ายบอส (Twintania อยู่ฝั่งตะวันตก Nael อยู่ฝั่งตะวันออกเหมือนเดิม)",
    "Carefully gather back in the centre, watching for Twisters (especially on the Neurolinks)\n"
    "Nael casts Megaflare, then the two bosses' big tankbusters (Death Sentence and Ravensbeak)\n"
    "Their vulnerabilities force a tank swap: Provoke, but do not Shirk\n"
    "The tanks swap places rather than the bosses (Twintania stays west, Nael stays east)"),
   img="04_adds_08", scene="ad8", strict=["MT", "ST"],
   says={"MT": ("Provoke Nael (ห้าม Shirk) สลับที่กับ ST", "Provoke Nael (no Shirk), swap places with the ST"),
         "ST": ("Provoke Twintania (ห้าม Shirk) สลับที่กับ MT", "Provoke Twintania (no Shirk), swap places with the MT")})

st(P4, "Twin Fury", ("รอบที่ 2 และการฆ่าบอสพร้อมกัน", "The second loop, and killing both together"),
   ("วนกลับไปเริ่มที่ Plummet / Bahamut's Claw ใหม่ ต่างจากรอบแรก:\n"
    "Nael เริ่มด้วยท่าตรงข้ามกับรอบแรก (รอบแรก Lunar Dynamo → รอบนี้ Iron Chariot และกลับกัน)\n"
    "รอบแรก Megaflare มาก่อนสลับ Tank / รอบสองสลับ Tank ก่อน\n\n"
    "ต้องฆ่า Twintania กับ Nael พร้อมกัน: ถ้าตัวหนึ่งตาย อีกตัวร่าย Twin Fury / White Fury ทันที (enrage 3 วินาที เติม HP เต็ม)\n"
    "ใช้ LB caster หรือ LB range ตอนทั้งคู่เหลือ HP 1%\n"
    "HP% ตั้งต้นต่างกัน แต่ HP จริงพอๆ กัน: ไม่ต้องตีตัวไหนก่อน\n\n"
    "สำเร็จแล้ว Teraflare ของ Bahamut ฆ่าทั้งปาร์ตี้ แต่ Phoenix ชุบทุกคน HP/MP เต็ม (เหมือน LB3 Healer) และ LB เต็มระดับ 3\n"
    "Phoenix ลบ Weakness ด้วย: ถ้ามีคนตายใกล้จบเฟส อาจไม่ต้อง raise ให้ Phoenix ชุบแทน",
    "The loop restarts from Plummet / Bahamut's Claw, with differences:\n"
    "Nael starts with the opposite attack (Lunar Dynamo the first time → Iron Chariot now, and vice versa)\n"
    "Megaflare comes before the tank swap on the first loop / the tank swap comes first on the second\n\n"
    "Twintania and Nael must die together: if one dies, the other immediately casts Twin Fury / White Fury (a 3-second enrage that refills its HP)\n"
    "Use caster or ranged LB when both are at 1%\n"
    "Their starting HP% differ but their real HP is about the same: no need to prioritise one\n\n"
    "Then Bahamut's Teraflare wipes the party, but Phoenix revives everyone at full HP/MP (like a healer LB3) and fills the gauge to LB3\n"
    "Phoenix's raise also clears Weakness: if someone dies just before the end, it may be worth letting Phoenix raise them"),
   refs=R("teraflare"))

# ------------------------------------------------------------------ P5 Golden Bahamut
st(P5, "Morn Afah", ("ภาพรวม: Phoenix's Blessing + วงจร 3 ท่า", "Overview: Phoenix's Blessing + a three-attack loop"),
   ("เฟสสุดท้าย (เรียกกันว่ารอบเกียรติยศ) ง่ายที่สุดในไฟต์\n"
    "Phoenix ชุบทุกคน HP/MP เต็ม ได้ LB3 และบัฟ Phoenix's Blessing (ดาเมจที่ทำ x2)\n"
    "บัฟหายเมื่อตาย: ตายในเฟสนี้เสียหายมาก (โดยเฉพาะ DPS ที่ตายต้นเฟส)\n\n"
    "Bahamut กลับมาแปลงร่างเป็น Golden Bahamut\n"
    "ถ้าไม่ได้ลด Bahamut ให้ต่ำกว่า 60% ก่อน Grand Octet: บอสเริ่มเฟสด้วยบัฟดาเมจ x5 (Bahamut grows mightier still!) ปาร์ตี้ปกติเคลียร์ไม่ได้\n\n"
    "วงจร 3 ท่า วน 5 รอบ:\n"
    "Morn Afah (stack ทั้งปาร์ตี้)\n"
    "Akh Morn (tankbuster แบ่งดาเมจ)\n"
    "Exaflare\n"
    "รอบที่ 2 รอบเดียวที่ Morn Afah กับ Akh Morn สลับลำดับกัน",
    "The last phase (the victory lap) is the simplest in the fight\n"
    "Phoenix revives everyone at full HP/MP with an LB3 and Phoenix's Blessing (your damage x2)\n"
    "The buff is lost on death: dying here costs a lot (especially a DPS early on)\n\n"
    "Bahamut returns and becomes Golden Bahamut\n"
    "If Bahamut wasn't under 60% before Grand Octet, he starts with a 5x damage-up (Bahamut grows mightier still!) a standard party can't clear\n\n"
    "Three attacks on a loop, five times:\n"
    "Morn Afah (a full-party stack)\n"
    "Akh Morn (a shared tankbuster)\n"
    "Exaflare\n"
    "Only on the second loop are Morn Afah and Akh Morn swapped"),
   refs=R("golden"))

st(P5, "Morn Afah", ("แผน mitigate Morn Afah", "Morn Afah mitigation plan"),
   ("แผน mitigate พื้นฐาน (เวลาจากเริ่มเฟส):\n"
    "Morn Afah 1 (0:06): MT 90 วิ / ST Reprisal / barrier H2 / H2 30 วิ / D1 / D4\n"
    "Morn Afah 2 (1:01): ST 90 วิ / MT Reprisal / barrier H2 / H2 30 วิ / D3\n"
    "Morn Afah 3 (1:34): MT 90 วิ / ST Reprisal / barrier H2 / H2 30 วิ / D1 / D4\n"
    "Morn Afah 4 (2:25): MT Reprisal / ST 90 วิ / barrier H2 / H2 30 วิ / D2\n"
    "Morn Afah 5 (3:11): MT 90 วิ / ST Reprisal / barrier H2 / H2 30 วิ / D3 / D4\n\n"
    "DPS check ของ Golden Bahamut ผ่อนปรนมากแล้ว: ถ้ามีอะไรพลาด ใช้ LB Tank ช่วย mitigate Morn Afah\n"
    "(macro เขียนสั้นกว่า: ทุกครั้งใช้ barrier + mitigate ของ H2 และ 1. MT 90 วิ ST Reprisal D4 / 2. ST 90 วิ MT Reprisal D3 / 3. MT 90 วิ ST Reprisal D4 / 4. ST 90 วิ MT Reprisal / 5. MT 90 วิ ST Reprisal D3 D4)",
    "The recommended base mitigation (time from the phase start):\n"
    "Morn Afah 1 (0:06): MT 90s / ST Reprisal / H2 shields / H2 30s / D1 / D4\n"
    "Morn Afah 2 (1:01): ST 90s / MT Reprisal / H2 shields / H2 30s / D3\n"
    "Morn Afah 3 (1:34): MT 90s / ST Reprisal / H2 shields / H2 30s / D1 / D4\n"
    "Morn Afah 4 (2:25): MT Reprisal / ST 90s / H2 shields / H2 30s / D2\n"
    "Morn Afah 5 (3:11): MT 90s / ST Reprisal / H2 shields / H2 30s / D3 / D4\n\n"
    "Golden Bahamut's DPS check is very lenient now: consider tank LB for Morn Afah if anything goes wrong\n"
    "(The macro is shorter: always shields + H2 mitigation, and 1. MT 90s ST Reprisal D4 / 2. ST 90s MT Reprisal D3 / 3. MT 90s ST Reprisal D4 / 4. ST 90s MT Reprisal / 5. MT 90s ST Reprisal D3 D4)"),
   says={"MT": ("90 วิ: 1 / 3 / 5 · Reprisal: 2 / 4", "90s: 1 / 3 / 5 · Reprisal: 2 / 4"),
         "ST": ("90 วิ: 2 / 4 · Reprisal: 1 / 3 / 5", "90s: 2 / 4 · Reprisal: 1 / 3 / 5"),
         "H2": ("barrier + 30 วิ ทุก Morn Afah", "Shields + your 30s on every Morn Afah"),
         "D1": ("mitigate: Morn Afah 1 / 3", "Mitigate: Morn Afah 1 / 3"), "D2": ("mitigate: Morn Afah 4", "Mitigate: Morn Afah 4"),
         "D3": ("mitigate: Morn Afah 2 / 5", "Mitigate: Morn Afah 2 / 5"), "D4": ("mitigate: Morn Afah 1 / 3 / 5", "Mitigate: Morn Afah 1 / 3 / 5")})

st(P5, "Akh Morn", ("แผน cooldown Akh Morn ของ Tank", "The tanks' Akh Morn cooldowns"),
   ("Akh Morn 1: MT + ST stack แบ่งกัน / Rampart + 30% + สกิลสั้น\n"
    "Akh Morn 2: MT ใช้ invuln\n"
    "Akh Morn 3: ST ใช้ invuln\n"
    "Akh Morn 4: MT + ST stack แบ่งกัน / Rampart + 30% + สกิลสั้น\n\n"
    "macro: ปาร์ตี้อยู่ขอบสนาม Tank อยู่ฝั่งกลาง / ครั้งแรกรับที่ marker ใต้ ใช้บัฟเต็ม",
    "Akh Morn 1: MT + ST stack / Rampart + 30% + a short one\n"
    "Akh Morn 2: MT invuln\n"
    "Akh Morn 3: ST invuln\n"
    "Akh Morn 4: MT + ST stack / Rampart + 30% + a short one\n\n"
    "Macro: party at the edge, tanks toward the centre / the first one taken on the south marker with full buffs"),
   says={"MT": ("Akh Morn 1 / 4: stack กับ ST · 2: invuln", "Akh Morn 1 / 4: stack with the ST · 2: invuln"),
         "ST": ("Akh Morn 1 / 4: stack กับ MT · 3: invuln", "Akh Morn 1 / 4: stack with the MT · 3: invuln")})

st(P5, "Morn Afah", ("①: Morn Afah: stack 8 คน", "①: Morn Afah: an eight-player stack"),
   ("Golden Bahamut เริ่มด้วย Morn Afah ใส่ผู้เล่นสุ่ม: stack ทั้ง 8 คน ดาเมจสูงมาก",
    "Golden Bahamut opens with Morn Afah on a random player: a full eight-player stack for a huge amount of damage"),
   img="05_golden_bahamut_01", scene="gb1", refs=R("morn_afah"))

st(P5, "Akh Morn", ("②: Akh Morn แรก: Tank stack ที่ Neurolink ใต้เดิม", "②: the first Akh Morn: the tanks stack where the south Neurolink was"),
   ("Golden Bahamut เล็ง Tank ด้วย Akh Morn: Tank 2 คน stack แบ่งกันรับ\nครั้งแรกนี้ Tank ไป stack ตรงที่เคยเป็น Neurolink ใต้ (marker 3)",
    "Golden Bahamut targets the tank with Akh Morn: both tanks stack and share it\nFor this first one, the tanks stack where the south Neurolink was (marker 3)"),
   img="05_golden_bahamut_02", scene="gb2", strict=["MT", "ST"],
   says={"MT": ("stack กับ ST ที่ marker 3", "Stack with the ST on marker 3"), "ST": ("stack กับ MT ที่ marker 3", "Stack with the MT on marker 3")},
   refs=R("akh_morn"))

st(P5, "Exaflare", ("③: Exaflare ชุดแรก", "③: the first Exaflares"),
   ("Golden Bahamut ร่าย Exaflare\nExaflare ชุดแรกโผล่", "Golden Bahamut casts Exaflare\nThe first set appears"),
   img="05_golden_bahamut_03", scene="gb3", refs=R("exaflare"))

st(P5, "Exaflare", ("④: ชุดที่ 2: หาจังหวะหลบแบบ 3-to-1", "④: the second set: look for a 3-to-1 dodge"),
   ("Exaflare ชุดที่ 2 โผล่\nถ้าทำได้ หาจังหวะหลบแบบ 3-to-1 (บางครั้งไม่มีให้ทำ)",
    "The second set appears\nIf possible, take a 3-to-1 dodge (one isn't always available)"),
   img="05_golden_bahamut_04", scene="gb4")

st(P5, "Exaflare", ("⑤: ชุดที่ 3", "⑤: the third set"),
   ("Exaflare ชุดที่ 3 โผล่", "The third set appears"), img="05_golden_bahamut_05", scene="gb5")

st(P5, "Akh Morn", ("⑥: Akh Morn ใส่ MT: ปาร์ตี้ขอบ Tank ฝั่งกลาง", "⑥: Akh Morn on the MT: party at the edge, tanks toward the centre"),
   ("Golden Bahamut ใช้ Akh Morn ใส่ MT\nปาร์ตี้อยู่ขอบสนาม Tank อยู่ฝั่งกลางสนาม\nรอบต่อๆ ไป ตรงนี้จะเป็น Morn Afah",
    "Golden Bahamut casts Akh Morn on the MT\nThe party stays at the edge, the tank(s) toward the centre\nIn every later loop this slot is Morn Afah"),
   img="05_golden_bahamut_06", scene="gb6", strict=["MT"])

st(P5, "Morn Afah", ("⑦: Morn Afah ใส่ผู้เล่นที่ไม่ใช่ Tank", "⑦: Morn Afah on a non-tank"),
   ("Golden Bahamut เล็ง Morn Afah ใส่ผู้เล่นสุ่ม (ไม่ใช่ Tank)\nรอบต่อๆ ไป ตรงนี้จะเป็น Akh Morn",
    "Golden Bahamut targets a random non-tank with Morn Afah\nIn every later loop this slot is Akh Morn"),
   img="05_golden_bahamut_07", scene="gb7")

st(P5, "Morn Afah", ("Enrage", "Enrage"),
   ("วงจรนี้วนอีก 4 รอบ แล้ว Golden Bahamut ใช้ Morn Afah ครั้งสุดท้าย เล็งทีละคนเรียงตาม aggro จากมากไปน้อย: นี่คือ enrage",
    "The loop repeats four more times, then Golden Bahamut casts a final Morn Afah, targeting players one at a time in descending hate order: the hard enrage"),
   refs=R("enrage"))
