"""Builds scripts/guides/data/ex5-necron.json (EX5 Necron, game8's plan: Lucrezia's strat and macro)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex5"
sys.path.insert(0, HERE + "/tools")
import scenes as S

OUT = r"scripts/guides/data/ex5-necron.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 2]          # game8 picture k-1 of dl/img (k counts the page header as 1)
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "-YhoKrmlZmM"
FR = lambda name, t, say, say_en: (f"frames/ex5-necron/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = 6
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


def seats(groups):
    out = {}
    for t, ss in groups.items():
        for k in ss.split():
            out[k] = t
    return out


P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วง Grand Cross", "Grand Cross")
P3 = ("ช่วง Add", "Adds phase")
P4 = ("ช่วงหลัง", "Second part")
P5 = ("ช่วงท้าย", "Last part")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker (จาก xivjpraids.com)", "Waymarks (from xivjpraids.com)",
     "game8 ไม่มีหัวข้อ Marker ชุดนี้มาจาก xivjpraids.com\n"
     "วางเป็นแถวด้านเหนือ ใกล้บอส จากตะวันตกไปตะวันออก: 1 2 A B C D 3 4\n\n"
     "ตามที่ xivjpraids.com อธิบาย:\n"
     "A B C D = จุดยืนของคู่ ตอน safe ด้านใน (เข้าใกล้บอส) ใน Relentless Reaping\n"
     "1 2 3 4 = จุดยืนของคู่ ตอน safe ด้านนอก (ถอยห่างบอส) ใน Relentless Reaping\n\n"
     "ภาพของ game8 ในคู่มือนี้วาด marker อีกชุด ใช้ดูทิศเท่านั้น:\n"
     "A กลางด้านเหนือ มี 3 กับ 4 อยู่สองข้าง\n"
     "1 ตะวันตกเฉียงเหนือ / 2 ตะวันออกเฉียงเหนือ\n"
     "D ตะวันตก / B ตะวันออก / C ใต้",
     "game8 has no waymark section; this set is from xivjpraids.com\n"
     "A row along the north, near the boss, west to east: 1 2 A B C D 3 4\n\n"
     "As xivjpraids.com explains them:\n"
     "A B C D = the pairs' spots for the \"in\" safe spots in Relentless Reaping\n"
     "1 2 3 4 = the pairs' spots for the \"out\" safe spots in Relentless Reaping\n\n"
     "game8's pictures in this guide draw a different set, for orientation only:\n"
     "A north of the middle, with 3 and 4 beside it\n"
     "1 north-west / 2 north-east\n"
     "D west / B east / C south",
     refs=[("https://xivjpraids.com/images/7.0_dawntrail/necron/markers.jpg",
            "Marker ในเกม มองจากทางใต้: 1 2 A B C D 3 4 (ภาพจาก xivjpraids.com)",
            "The waymarks in game, seen from the south: 1 2 A B C D 3 4 (picture from xivjpraids.com)")])

# ------------------------------------------------------------------ first part
step(P1, "Blue Shockwave", "tankbuster cone 2 ครั้ง", "Two tankbuster cones",
     "tankbuster เป็น cone กว้าง ใส่คนที่ hate อันดับ 1\n"
     "cone กว้าง: Tank ไปขอบสนามมุมตะวันตกเฉียงเหนือ / ตะวันออกเฉียงเหนือ แล้วเอียง cone ออกไปทางขอบนอก ไม่ให้โดนคนอื่น\n"
     "มา 2 ครั้งติดกัน: ST ใช้ mitigate แล้ว Tank swap รับครั้งที่ 2\n\n"
     "คนอื่นที่ไม่ใช่ Tank อยู่กลางสนาม",
     "A wide cone tankbuster on the top of the enmity list\n"
     "It is wide: tanks go to the north-west / north-east corner and angle the cone out over the edge, away from everyone\n"
     "It comes twice in a row: ST uses mitigation and tank swaps for the 2nd\n\n"
     "Everyone but the tanks stays in the middle",
     says={"MT": "ไปมุมตะวันตกเฉียงเหนือหรือตะวันออกเฉียงเหนือ เอียง cone ออกนอกสนาม",
           "ST": "ใช้ mitigate แล้ว Tank swap รับครั้งที่ 2 ที่มุมสนาม เอียง cone ออกนอกสนาม"},
     says_en={"MT": "Go to the north-west or north-east corner; angle the cone out of the arena",
              "ST": "Mitigate and tank swap for the 2nd, in a corner; angle the cone out of the arena"},
     refs=[FR("blue-shockwave", 42, "cone สีแดงของ Blue Shockwave พุ่งไปที่ Tank ที่มุมสนาม ปลาย cone ชี้ออกนอกสนาม",
              "Blue Shockwave's red cone on the tank in the corner, pointing out of the arena")])

FOD_NOTE = ("AoE เวททั้งปาร์ตี้ (raid-wide) แล้วมีบ่อโคลนเล็ก 8 บ่อบนพื้น โคลนตกลงมาที่บ่อ แล้ว Icy Hands โผล่ออกมา\n"
            "มือยิง AoE แนวตรงใส่คนที่อยู่ใกล้ที่สุด: แต่ละคนล่อมือของตัวเอง ไม่ให้แนวยิงโดนคนอื่น\n\n")
FOD_NOTE_EN = ("A magic raid-wide, then 8 small mud puddles on the floor; mud falls on them and Icy Hands rise out\n"
               "Each hand fires a line AoE at the nearest player: everyone baits their own hand so the line hits nobody else\n\n")
step(P1, "Fear of Death", "① กระจายตัวรอ", "① Spread loosely",
     FOD_NOTE +
     "① หลัง raid-wide กระจายตัวเบาๆ ไปแถวมือที่ตัวเองรับผิดชอบ\n"
     "ตั้งแต่มือโผล่จนยิงมีเวลาน้อยมาก ต้องไปรอแถวจุดของตัวเองก่อน\n"
     "จุดที่มือโผล่ไม่มีดาเมจ เดินผ่านได้\n"
     "แต่ถ้ายืนในบ่อก่อนมือโผล่ จะโดนดาเมจจากโคลนที่ตกลงมา",
     FOD_NOTE_EN +
     "① After the raid-wide, spread loosely near the hand you are assigned\n"
     "There is very little time between a hand rising and its line: be near your spot beforehand\n"
     "Where a hand rises does no damage; you can walk through it\n"
     "But standing in a puddle before the hand rises gets you hit by the falling mud",
     strict=False, pic=3, scene=S.fod_spread(),
     refs=[FR("fear-of-death-hands", 69, "Icy Hands โผล่ขึ้นจากบ่อบนพื้น", "Icy Hands rising from the puddles")])

BAIT_RULE = ("ทุกเส้นชี้ออกนอกสนาม:\n"
             "D1 D2 ล่อขึ้นเหนือ / D3 D4 ล่อลงใต้\n"
             "MT H1 ล่อไปตะวันตก / ST H2 ล่อไปตะวันออก")
BAIT_RULE_EN = ("Every line points out of the arena:\n"
                "D1 D2 bait north / D3 D4 bait south\n"
                "MT H1 bait west / ST H2 bait east")
VERT_SAYS = {"D1": "บ่อแถว 1 ฝั่งตะวันตก: ยืนทางเหนือของบ่อ ล่อขึ้นเหนือ",
             "ST": "บ่อแถว 1 ฝั่งตะวันออก: ยืนทางตะวันออกของบ่อ ล่อไปตะวันออก",
             "MT": "บ่อแถว 2 ฝั่งตะวันตก: ยืนทางตะวันตกของบ่อ ล่อไปตะวันตก",
             "D2": "บ่อแถว 2 ฝั่งตะวันออก: ยืนทางเหนือของบ่อ ล่อขึ้นเหนือ",
             "D3": "บ่อแถว 3 ฝั่งตะวันตก: ยืนทางใต้ของบ่อ ล่อลงใต้",
             "H2": "บ่อแถว 3 ฝั่งตะวันออก: ยืนทางตะวันออกของบ่อ ล่อไปตะวันออก",
             "H1": "บ่อแถว 4 ฝั่งตะวันตก: ยืนทางตะวันตกของบ่อ ล่อไปตะวันตก",
             "D4": "บ่อแถว 4 ฝั่งตะวันออก: ยืนทางใต้ของบ่อ ล่อลงใต้"}
VERT_SAYS_EN = {"D1": "Row 1 west puddle: stand north of it, bait north",
                "ST": "Row 1 east puddle: stand east of it, bait east",
                "MT": "Row 2 west puddle: stand west of it, bait west",
                "D2": "Row 2 east puddle: stand north of it, bait north",
                "D3": "Row 3 west puddle: stand south of it, bait south",
                "H2": "Row 3 east puddle: stand east of it, bait east",
                "H1": "Row 4 west puddle: stand west of it, bait west",
                "D4": "Row 4 east puddle: stand south of it, bait south"}
HORZ_SAYS = {"MT": "คอลัมน์ 1 (ตะวันตกสุด) บ่อบน: ยืนทางตะวันตกของบ่อ ล่อไปตะวันตก",
             "H1": "คอลัมน์ 1 (ตะวันตกสุด) บ่อล่าง: ยืนทางตะวันตกของบ่อ ล่อไปตะวันตก",
             "D1": "คอลัมน์ 2 บ่อบน: ยืนทางเหนือของบ่อ ล่อขึ้นเหนือ",
             "D3": "คอลัมน์ 2 บ่อล่าง: ยืนทางใต้ของบ่อ ล่อลงใต้",
             "D2": "คอลัมน์ 3 บ่อบน: ยืนทางเหนือของบ่อ ล่อขึ้นเหนือ",
             "D4": "คอลัมน์ 3 บ่อล่าง: ยืนทางใต้ของบ่อ ล่อลงใต้",
             "ST": "คอลัมน์ 4 (ตะวันออกสุด) บ่อบน: ยืนทางตะวันออกของบ่อ ล่อไปตะวันออก",
             "H2": "คอลัมน์ 4 (ตะวันออกสุด) บ่อล่าง: ยืนทางตะวันออกของบ่อ ล่อไปตะวันออก"}
HORZ_SAYS_EN = {"MT": "Column 1 (westmost), upper puddle: stand west of it, bait west",
                "H1": "Column 1 (westmost), lower puddle: stand west of it, bait west",
                "D1": "Column 2, upper puddle: stand north of it, bait north",
                "D3": "Column 2, lower puddle: stand south of it, bait south",
                "D2": "Column 3, upper puddle: stand north of it, bait north",
                "D4": "Column 3, lower puddle: stand south of it, bait south",
                "ST": "Column 4 (eastmost), upper puddle: stand east of it, bait east",
                "H2": "Column 4 (eastmost), lower puddle: stand east of it, bait east"}

step(P1, "Fear of Death", "② ล่อมือ: บ่อแนวตั้ง", "② Bait your hand: puddles in columns",
     "② ล่อแนวยิงของมือตามจุดที่กำหนด ให้ไม่โดนคนอื่น\n"
     "บ่อมี 2 แบบ: เรียงแนวตั้ง (ภาพนี้) หรือแนวนอน (ขั้นถัดไป)\n\n" + BAIT_RULE,
     "② Bait your hand's line from your set spot, away from everyone\n"
     "The puddles come two ways: in columns (this picture) or in rows (next step)\n\n" + BAIT_RULE_EN,
     strict=True, pic=4, scene=S.fod_vert(), says=VERT_SAYS, says_en=VERT_SAYS_EN)

step(P1, "Fear of Death", "② ล่อมือ: บ่อแนวนอน", "② Bait your hand: puddles in rows",
     "บ่อเรียงแนวนอน: ทิศที่ล่อเหมือนเดิม\n\n" + BAIT_RULE,
     "Puddles in rows: the directions stay the same\n\n" + BAIT_RULE_EN,
     strict=True, pic=5, scene=S.fod_horz(), says=HORZ_SAYS, says_en=HORZ_SAYS_EN)

step(P1, "Cold Grip", "AoE สองข้าง แล้วฝั่งแขนดำขยาย", "Both sides, then the dark arm's side grows",
     "AoE แนวตรงทั้งสองข้างของสนาม: safe คือแนวกลาง\n"
     "แขนบอสข้างที่เรืองแสงสีดำ: AoE ฝั่งนั้นจะขยายกว้างกว่าครึ่งสนาม\n\n"
     "หลบ AoE สองข้างที่แนวกลางก่อน\n"
     "แล้วรีบไปฝั่งแขนที่ไม่ได้เรืองแสงสีดำทันที",
     "Line AoEs down both sides of the arena: the middle line is safe\n"
     "The side of the boss's arm that glows black: that side's AoE grows past half the arena\n\n"
     "Dodge both sides in the middle first\n"
     "then move at once to the side whose arm is not glowing black")

MM = "Memento Mori + Smite of Gloom"
MM_LAYOUT = ("ไม่ว่ามือดำ/ขาวอยู่ฝั่งไหน ยืนตามมาโคร ไม่กลับซ้ายขวา แค่เลื่อนไปทั้งชุด:\n"
             "ฝั่งมือขาว (บนลงล่าง): D1 D2 / H1 H2 / D3 D4\n"
             "ฝั่งมือดำ: MT ST\n"
             "D1 H1 D3 และ MT อยู่ด้านตะวันตกของคู่ตัวเองเสมอ")
MM_LAYOUT_EN = ("Whichever side the dark and light hands are on, stand as the macro has it; do not mirror, just slide over:\n"
                "Light side (top to bottom): D1 D2 / H1 H2 / D3 D4\n"
                "Dark side: MT ST\n"
                "D1 H1 D3 and MT are always the western one of their pair")
step(P1, MM, "① แยกฝั่งตามสีมือของบอส", "① Split by the colour of the boss's hands",
     "บอสยิง AoE แนวตรงลงกลางสนาม\n"
     "ระหว่างร่าย มือบอสเรืองแสง ข้างหนึ่งสีดำ อีกข้างสีขาว\n"
     "Tank 2 คน ไปฝั่งมือสีดำ / DPS กับ Healer 6 คน ไปฝั่งมือสีขาว\n"
     "ภาพนี้: มือสีดำอยู่ตะวันออก\n\n" + MM_LAYOUT,
     "The boss fires a line AoE down the middle\n"
     "While it casts, its hands glow: one dark, one light\n"
     "The 2 tanks go to the dark hand's side / the 6 DPS and healers to the light hand's side\n"
     "In this picture the dark hand is east\n\n" + MM_LAYOUT_EN,
     strict=True, pic=6, scene=S.mm1(),
     says={"D1": "ฝั่งมือขาว แถวบน ด้านตะวันตก", "D2": "ฝั่งมือขาว แถวบน ด้านตะวันออก",
           "H1": "ฝั่งมือขาว แถวกลาง ด้านตะวันตก", "H2": "ฝั่งมือขาว แถวกลาง ด้านตะวันออก",
           "D3": "ฝั่งมือขาว แถวล่าง ด้านตะวันตก", "D4": "ฝั่งมือขาว แถวล่าง ด้านตะวันออก",
           "MT": "ฝั่งมือดำ ด้านตะวันตก", "ST": "ฝั่งมือดำ ด้านตะวันออก"},
     says_en={"D1": "Light side, top row, west", "D2": "Light side, top row, east",
              "H1": "Light side, middle row, west", "H2": "Light side, middle row, east",
              "D3": "Light side, bottom row, west", "D4": "Light side, bottom row, east",
              "MT": "Dark side, west", "ST": "Dark side, east"})

MM2_SAYS = {"D1": "มุมตะวันตกเฉียงเหนือ", "D2": "ขอบเหนือ ติดแนวสีม่วง",
            "H1": "ชิดขอบตะวันตก เหนือแนวยิง", "H2": "ติดแนวสีม่วง เหนือแนวยิง",
            "D3": "มุมตะวันตกเฉียงใต้", "D4": "ขอบใต้ ติดแนวสีม่วง",
            "MT": "ฝั่งตะวันออก ช่องว่างกลาง ด้านใน", "ST": "ฝั่งตะวันออก ช่องว่างกลาง ชิดขอบ"}
MM2_SAYS_EN = {"D1": "North-west corner", "D2": "North edge, next to the purple strip",
               "H1": "At the west edge, above the line", "H2": "Next to the purple strip, above the line",
               "D3": "South-west corner", "D4": "South edge, next to the purple strip",
               "MT": "East side, the middle gap, inner", "ST": "East side, the middle gap, at the edge"}
step(P1, MM, "② หลบแนวยิงของมือจากกลางสนาม", "② Dodge the hands' lines from the middle",
     "มือโผล่ขึ้นในแนว AoE กลางสนาม แล้วยิง AoE แนวตรงออกด้านข้าง\n"
     "ย้ายไปยืนใน safe zone\n\n"
     "ภาพนี้: มือ 4 ตัวยิงไปตะวันออก / มือ 1 ตัวยิงไปตะวันตกตรงแถวกลาง\n"
     "ฝั่งตะวันตก: D1 D2 ขึ้นขอบเหนือ / H1 H2 เหนือแนวยิง / D3 D4 ลงขอบใต้\n"
     "ฝั่งตะวันออก: MT ST ช่องว่างกลางฝั่ง",
     "Hands rise in the middle strip and fire line AoEs out to the sides\n"
     "Move into the safe spots\n\n"
     "In this picture: 4 hands fire east / 1 hand fires west across the middle row\n"
     "West side: D1 D2 up to the north edge / H1 H2 above the line / D3 D4 down to the south edge\n"
     "East side: MT ST in the gap in the middle",
     strict=True, pic=7, scene=S.mm2(), says=MM2_SAYS, says_en=MM2_SAYS_EN)

step(P1, MM, "③ Smite of Gloom: AoE วงใหญ่ทุกคน", "③ Smite of Gloom: a huge circle on everyone",
     "Smite of Gloom: ทุกคนได้ AoE วงกลมขนาดใหญ่\n"
     "ต้องหลบแนวยิงของมือ และวางวงใหญ่ใน safe zone ที่แคบ: ไปยืนตามจุดที่กำหนด\n\n"
     "Healer: ดูแนวยิงของมือ แล้วเลือกว่าจะขยับขึ้นเหนือหรือลงใต้",
     "Smite of Gloom: everyone gets a huge circle AoE\n"
     "Dodge the hands' lines and drop the huge circles in the narrow safe spots: stand on your set spot\n\n"
     "Healers: read the hands' lines, then choose to move up north or down south",
     strict=True, pic=8, scene=S.mm3(),
     says=dict(MM2_SAYS, H1="ดูแนวยิงของมือ แล้วขยับขึ้นเหนือหรือลงใต้", H2="ดูแนวยิงของมือ แล้วขยับขึ้นเหนือหรือลงใต้"),
     says_en=dict(MM2_SAYS_EN, H1="Read the hands' lines, then move up north or down south", H2="Read the hands' lines, then move up north or down south"),
     refs=[FR("memento-mori-smite", 110, "Smite of Gloom: วงสีชมพูขนาดใหญ่บนทุกคน และมือสีดำในแนวกลาง",
              "Smite of Gloom: huge pink circles on everyone, and the dark hands in the middle strip")])

SR = "Soul Reaping + Twofold / Fourfold Blight"
step(P1, SR, "① ดูว่าบอสเตรียม AoE แบบไหน", "① See which AoE the boss prepares",
     "Soul Reaping: บอสเตรียม AoE ไว้ 1 แบบ: แนวตรงกลางสนาม หรือแนวตรงสองข้าง\n"
     "จากนั้น Twofold Blight หรือ Fourfold Blight ปล่อย AoE นั้นพร้อม stack:\n"
     "Twofold Blight = stack 4 คน (4:4)\n"
     "Fourfold Blight = stack 2 คน (คู่)\n"
     "ยืนใน safe zone ของ AoE ที่เตรียมไว้ แล้วรับ stack\n\n"
     "ท่านี้มา 2 ครั้ง: ครั้งที่ 2 ปล่อยหลัง Fear of Death + The End's Embrace และ Blue Shockwave จำแบบไว้ให้ดี\n"
     "ภาพนี้: เตรียมแนวตรงกลางสนาม",
     "Soul Reaping: the boss prepares one AoE: a line down the middle, or lines down both sides\n"
     "Then Twofold Blight or Fourfold Blight releases it together with stacks:\n"
     "Twofold Blight = stacks of 4 (4:4)\n"
     "Fourfold Blight = stacks of 2 (pairs)\n"
     "Stand in the prepared AoE's safe spot and take the stack\n\n"
     "It comes twice: the 2nd one goes off after Fear of Death + The End's Embrace and Blue Shockwave, so remember its shape\n"
     "In this picture: a line down the middle is prepared",
     strict=False, pic=9, scene=S.sr_icon(),
     refs=[FR("soul-reaping-line", 188, "Soul Reaping: ในวงของบอสมีแท่งสีฟ้าแนวตั้งตรงกลาง เหมือนไอคอนในภาพ = แนวตรงกลางสนาม",
              "Soul Reaping: a vertical blue bar in the boss's ring, like the icon in the picture = a line down the middle")])

G_W, G_E = "MT D1 H1 D3", "ST D2 H2 D4"
step(P1, SR, "แนวกลาง + Twofold Blight: 4:4 สองข้าง", "Middle line + Twofold Blight: 4:4 on both sides",
     "AoE แนวตรงกลางสนาม: safe สองข้าง\n"
     "stack 4 คนที่ safe สองข้าง:\n"
     "กลุ่มตะวันตก: MT D1 H1 D3\n"
     "กลุ่มตะวันออก: ST D2 H2 D4",
     "A line down the middle: both sides are safe\n"
     "Stack in 4s on the two sides:\n"
     "West group: MT D1 H1 D3\n"
     "East group: ST D2 H2 D4",
     strict=True, pic=10, scene=S.sr_centre44(),
     says=seats({"stack กลุ่มตะวันตก": G_W, "stack กลุ่มตะวันออก": G_E}),
     says_en=seats({"Stack with the west group": G_W, "Stack with the east group": G_E}))

step(P1, SR, "แนวกลาง + Fourfold Blight: คู่สองข้าง", "Middle line + Fourfold Blight: pairs on both sides",
     "stack 2 คนที่ safe สองข้าง:\n"
     "ตะวันตก: MT·D1 ด้านนอก / H1·D3 ด้านใน\n"
     "ตะวันออก: ST·D2 ด้านนอก / H2·D4 ด้านใน",
     "Stack in pairs on the two sides:\n"
     "West: MT·D1 outer / H1·D3 inner\n"
     "East: ST·D2 outer / H2·D4 inner",
     strict=True, pic=11, scene=S.sr_centrepr(),
     says=seats({"คู่ด้านนอก ฝั่งตะวันตก": "MT D1", "คู่ด้านใน ฝั่งตะวันตก": "H1 D3", "คู่ด้านนอก ฝั่งตะวันออก": "ST D2", "คู่ด้านใน ฝั่งตะวันออก": "H2 D4"}),
     says_en=seats({"Outer pair, west": "MT D1", "Inner pair, west": "H1 D3", "Outer pair, east": "ST D2", "Inner pair, east": "H2 D4"}))

step(P1, SR, "แนวตรงสองข้าง + Twofold Blight: 4:4 ตรงกลาง", "Side lines + Twofold Blight: 4:4 in the middle",
     "AoE แนวตรงสองข้าง: safe แนวกลาง\n"
     "stack 4 คนที่แนวกลาง ด้านเหนือใกล้บอส:\n"
     "กลุ่ม MT D1 H1 D3 ฝั่งตะวันตก\n"
     "กลุ่ม ST D2 H2 D4 ฝั่งตะวันออก",
     "Lines down both sides: the middle is safe\n"
     "Stack in 4s in the middle, north, near the boss:\n"
     "MT D1 H1 D3 on the west half\n"
     "ST D2 H2 D4 on the east half",
     strict=True, pic=12, scene=S.sr_sides44(),
     says=seats({"stack กลุ่มตะวันตก ด้านเหนือ": G_W, "stack กลุ่มตะวันออก ด้านเหนือ": G_E}),
     says_en=seats({"Stack with the west group, north": G_W, "Stack with the east group, north": G_E}),
     refs=[FR("blight-beams", 178, "Twofold Blight เมื่อแนวกลาง safe: ลำแสงสีฟ้าพุ่งไปหาแต่ละกลุ่ม 4 คน",
              "Twofold Blight with the middle safe: blue beams shoot at each group of 4")])

step(P1, SR, "แนวตรงสองข้าง + Fourfold Blight: คู่ตรงกลาง", "Side lines + Fourfold Blight: pairs in the middle",
     "stack 2 คนที่แนวกลาง ด้านเหนือ:\n"
     "ตะวันตก: MT·D1 ด้านเหนือ / H1·D3 ถัดลงมาใกล้กลาง\n"
     "ตะวันออก: ST·D2 ด้านเหนือ / H2·D4 ถัดลงมาใกล้กลาง",
     "Stack in pairs in the middle, north:\n"
     "West: MT·D1 further north / H1·D3 below them, nearer the middle\n"
     "East: ST·D2 further north / H2·D4 below them, nearer the middle",
     strict=True, pic=13, scene=S.sr_sidespr(),
     says=seats({"คู่ด้านเหนือ ฝั่งตะวันตก": "MT D1", "คู่ใกล้กลาง ฝั่งตะวันตก": "H1 D3", "คู่ด้านเหนือ ฝั่งตะวันออก": "ST D2", "คู่ใกล้กลาง ฝั่งตะวันออก": "H2 D4"}),
     says_en=seats({"North pair, west": "MT D1", "Pair nearer the middle, west": "H1 D3", "North pair, east": "ST D2", "Pair nearer the middle, east": "H2 D4"}))

FE = "Fear of Death + The End's Embrace"
step(P1, FE, "① กระจายตัวรอ", "① Spread loosely",
     "AoE เวททั้งปาร์ตี้ แล้วบ่อกับมือโผล่เหมือน Fear of Death\n"
     "① กระจายตัวเบาๆ\n"
     "ภาพนี้: บ่อแนวนอน\n\n"
     "โดนดาเมจติดกันหลายครั้ง: ล่อมือของ Fear of Death แล้ว ขยับเข้ากลางให้ Healer heal ก่อน ค่อยทำ The End's Embrace",
     "A magic raid-wide, then puddles and hands as in Fear of Death\n"
     "① Spread loosely\n"
     "In this picture: puddles in rows\n\n"
     "The damage keeps coming: after baiting the Fear of Death hands, move in to the middle and get healed before The End's Embrace",
     strict=False, pic=14, scene=S.fe_spread())

step(P1, FE, "② ล่อมือเหมือน Fear of Death", "② Bait your hand as in Fear of Death",
     "② ล่อแนวยิงของมือที่จุดเดิมของ Fear of Death (ดูขั้น Fear of Death บ่อแนวนอน)\n\n" + BAIT_RULE,
     "② Bait your hand's line from your Fear of Death spot (see Fear of Death, puddles in rows)\n\n" + BAIT_RULE_EN,
     strict=True, pic=5, scene=S.fod_horz(), says=HORZ_SAYS, says_en=HORZ_SAYS_EN)

step(P1, FE, "③ The End's Embrace: วาง AoE บนบ่อ", "③ The End's Embrace: drop the AoE on your puddle",
     "The End's Embrace: ทุกคนได้ AoE วงกลม\n"
     "วาง AoE บนบ่อที่ตัวเองยืน (บ่อเดียวกับที่ล่อมือ)\n"
     "มือโผล่ใหม่จากจุดที่ AoE ตก แล้วต้องล่ออีกรอบ",
     "The End's Embrace: everyone gets a circle AoE\n"
     "Drop it on the puddle you are standing at (the one you baited from)\n"
     "New hands rise where the AoEs land, and are baited again",
     strict=True, pic=15, scene=S.fe_drop())

step(P1, FE, "④ ล่อแนวยิงแล้วหลบ", "④ Bait the lines, then dodge",
     "④ ล่อแนวยิงของมือที่โผล่ใหม่ แล้วหลบออกจากแนวยิง\n\n"
     "ต่อด้วย Blue Shockwave ทันที: Tank ไปมุมตะวันตกเฉียงเหนือ / ตะวันออกเฉียงเหนือ คนอื่นอยู่กลางสนาม\n"
     "จากนั้น AoE ที่ Soul Reaping เตรียมไว้ก่อน Fear of Death จะมาพร้อม Twofold หรือ Fourfold Blight (ดู Soul Reaping)",
     "④ Bait the new hands' lines, then step out of them\n\n"
     "Blue Shockwave follows at once: tanks to the north-west / north-east corners, everyone else in the middle\n"
     "Then the AoE Soul Reaping prepared before Fear of Death goes off with Twofold or Fourfold Blight (see Soul Reaping)",
     strict=True, pic=16, scene=S.fe_dodge(),
     says={"MT": "ไปมุมตะวันตกเฉียงเหนือ รอ Blue Shockwave", "ST": "ไปมุมตะวันออกเฉียงเหนือ รอ Blue Shockwave"},
     says_en={"MT": "To the north-west corner for Blue Shockwave", "ST": "To the north-east corner for Blue Shockwave"})

# ------------------------------------------------------------------ Grand Cross
step(P2, "Grand Cross", "① จุดยืนพื้นฐาน", "① Base spots",
     "AoE เวททั้งปาร์ตี้ แล้วสนามเปลี่ยนเป็นวงกลม: ทุกคนรวมกลางสนามก่อน\n"
     "AoE วงกลมมาที่บางคนแบบสุ่ม: วางลูกแรกที่กลาง แล้วเดินไปแนวทิศหลัก (+) วางลูกที่ 2\n"
     "จากนั้นทำ marker กับ tower 2 รอบ ระหว่างนั้นหลบ AoE วงกลมที่มาที่ผู้เล่น และ AoE แนวตรงที่หมุนรอบขอบสนาม\n"
     "แล้ววาง AoE วงกลมอีก 2 ลูก และรับ AoE แนวตรงที่แรงน้อยลงตามระยะ\n\n"
     "① วาง AoE เสร็จ ไปยืนกระจายตามภาพ\n"
     "คู่พื้นฐานยืนแนวทแยง (X) เลื่อนตามเข็มนาฬิกา แต่ละคู่ทำ tower กับ marker ในพื้นที่ตัวเอง:\n"
     "MT·D1 เหนือ/ตะวันตกเฉียงเหนือ / ST·D2 ตะวันออกเฉียงเหนือ/ตะวันออก / H2·D4 ตะวันออกเฉียงใต้/ใต้ / H1·D3 ตะวันตกเฉียงใต้/ตะวันตก\n\n"
     "เคล็ดหลบแนวตรงที่หมุน: ก่อน tower ครั้งแรก อยู่แถวแนวทแยง (X) / ก่อน tower ครั้งที่ 2 อยู่แถวแนวทิศหลัก (+)",
     "A magic raid-wide that changes the arena to a circle: everyone gathers in the middle first\n"
     "Circle AoEs land on random players: drop the 1st in the middle, then walk out on a cardinal (+) to drop the 2nd\n"
     "Then do markers and towers twice, while dodging circle AoEs on players and line AoEs that turn around the edge\n"
     "Then drop 2 more circle AoEs and take a line AoE that weakens with distance\n\n"
     "① Once the AoEs are dropped, spread as in the picture\n"
     "The base pairs stand on the diagonals (X), shifted clockwise; each pair does its tower and marker in its own area:\n"
     "MT·D1 north/north-west / ST·D2 north-east/east / H2·D4 south-east/south / H1·D3 south-west/west\n\n"
     "Dodging the turning lines: before the 1st towers stay near the diagonals (X) / before the 2nd towers near the cardinals (+)",
     strict=True, pic=17, scene=S.gc_basic(),
     says=seats({"พื้นที่ MT·D1: เหนือ/ตะวันตกเฉียงเหนือ": "MT D1", "พื้นที่ ST·D2: ตะวันออกเฉียงเหนือ/ตะวันออก": "ST D2",
                 "พื้นที่ H2·D4: ตะวันออกเฉียงใต้/ใต้": "H2 D4", "พื้นที่ H1·D3: ตะวันตกเฉียงใต้/ตะวันตก": "H1 D3"}),
     says_en=seats({"MT·D1 area: north/north-west": "MT D1", "ST·D2 area: north-east/east": "ST D2",
                    "H2·D4 area: south-east/south": "H2 D4", "H1·D3 area: south-west/west": "H1 D3"}),
     refs=[FR("grand-cross", 290, "Grand Cross: สนามเป็นวงกลม มีลูกแก้วสีฟ้าอยู่รอบขอบสนาม",
              "Grand Cross: the arena turns round, with blue orbs around its edge")])

step(P2, "Grand Cross", "tower แนวทแยง (X): Tank/Healer ได้ marker", "Towers on the diagonals (X): tanks and healers have markers",
     "tower โผล่แนวทแยง (X) / Tank กับ Healer ได้ marker / DPS ไม่มี marker: เข้า tower\n\n"
     "marker วางที่ขอบด้านทิศหลักของพื้นที่ตัวเอง:\n"
     "MT เหนือ / ST ตะวันออก / H2 ใต้ / H1 ตะวันตก\n"
     "tower:\n"
     "D1 ตะวันตกเฉียงเหนือ / D2 ตะวันออกเฉียงเหนือ / D4 ตะวันออกเฉียงใต้ / D3 ตะวันตกเฉียงใต้",
     "Towers on the diagonals (X) / tanks and healers have markers / the DPS have none: they take the towers\n\n"
     "Markers go to the edge on your area's cardinal:\n"
     "MT north / ST east / H2 south / H1 west\n"
     "Towers:\n"
     "D1 north-west / D2 north-east / D4 south-east / D3 south-west",
     strict=True, pic=18, scene=S.gc_x(),
     says={"MT": "marker: ขอบเหนือ", "ST": "marker: ขอบตะวันออก", "H2": "marker: ขอบใต้", "H1": "marker: ขอบตะวันตก",
           "D1": "tower ตะวันตกเฉียงเหนือ", "D2": "tower ตะวันออกเฉียงเหนือ", "D4": "tower ตะวันออกเฉียงใต้", "D3": "tower ตะวันตกเฉียงใต้"},
     says_en={"MT": "Marker: north edge", "ST": "Marker: east edge", "H2": "Marker: south edge", "H1": "Marker: west edge",
              "D1": "North-west tower", "D2": "North-east tower", "D4": "South-east tower", "D3": "South-west tower"})

step(P2, "Grand Cross", "tower แนวทิศหลัก (+): DPS ได้ marker", "Towers on the cardinals (+): the DPS have markers",
     "tower โผล่แนวทิศหลัก (+) / DPS ได้ marker / Tank กับ Healer ไม่มี marker: เข้า tower\n\n"
     "tower:\n"
     "MT เหนือ / ST ตะวันออก / H2 ใต้ / H1 ตะวันตก\n"
     "marker:\n"
     "D1 ตะวันตกเฉียงเหนือ / D2 ตะวันออกเฉียงเหนือ / D4 ตะวันออกเฉียงใต้ / D3 ตะวันตกเฉียงใต้",
     "Towers on the cardinals (+) / the DPS have markers / tanks and healers have none: they take the towers\n\n"
     "Towers:\n"
     "MT north / ST east / H2 south / H1 west\n"
     "Markers:\n"
     "D1 north-west / D2 north-east / D4 south-east / D3 south-west",
     strict=True, pic=19, scene=S.gc_plus(),
     says={"MT": "tower เหนือ", "ST": "tower ตะวันออก", "H2": "tower ใต้", "H1": "tower ตะวันตก",
           "D1": "marker: ตะวันตกเฉียงเหนือ", "D2": "marker: ตะวันออกเฉียงเหนือ", "D4": "marker: ตะวันออกเฉียงใต้", "D3": "marker: ตะวันตกเฉียงใต้"},
     says_en={"MT": "North tower", "ST": "East tower", "H2": "South tower", "H1": "West tower",
              "D1": "Marker: north-west", "D2": "Marker: north-east", "D4": "Marker: south-east", "D3": "Marker: south-west"})

step(P2, "Neutron Ring", "raid-wide สนามกลับเป็นปกติ", "Raid-wide; the arena returns",
     "AoE เวททั้งปาร์ตี้ (raid-wide)\n"
     "พอโดนแล้ว สนามที่เปลี่ยนตอน Grand Cross กลับเป็นสนามปกติ",
     "A magic raid-wide\n"
     "Once it lands, the arena Grand Cross changed goes back to normal")

# ------------------------------------------------------------------ adds
step(P3, "Icy Hands + Beckoning Hands", "ฆ่า Add ให้หมดก่อนเกจเต็ม", "Kill the adds before the gauge fills",
     "ช่วง Add: ฆ่า Icy Hands กับ Beckoning Hands ที่โผล่หลายตัวบนสนาม\n"
     "Beckoning Hands (มือใหญ่) ใช้ tankbuster ใส่คนที่ hate อันดับ 1: Tank ดึง hate แล้วหัน AoE ออกไปทางขอบสนาม\n"
     "เกจบนจอขึ้นถึง 100 = wipe: ฆ่า Add ให้หมดก่อนเกจเต็ม\n\n"
     "ถ้า DPS ดึง hate มือใหญ่ไปแล้วโดน tankbuster: ไม่ต้องตกใจ ใช้ mitigate ก็รับไหว แล้วหัน AoE ออกไปทางขอบสนาม",
     "Adds phase: kill the many Icy Hands and Beckoning Hands on the field\n"
     "The Beckoning Hands (the big ones) tankbust the top of their enmity list: tanks take them and turn the AoE out to the edge\n"
     "When the gauge on screen reaches 100 it is a wipe: kill every add before it fills\n\n"
     "If a DPS pulls a big hand and gets the tankbuster: don't panic; with mitigation it can be survived; turn the AoE out to the edge",
     says={"MT": "ดึง hate Beckoning Hands แล้วหัน AoE ออกไปทางขอบสนาม", "ST": "ดึง hate Beckoning Hands แล้วหัน AoE ออกไปทางขอบสนาม"},
     says_en={"MT": "Take the Beckoning Hands and turn their AoE out to the edge", "ST": "Take the Beckoning Hands and turn their AoE out to the edge"},
     refs=[FR("adds-beckoning-hand", 346, "Beckoning Hands: มือขนาดใหญ่ที่ Tank ต้องดึง hate", "Beckoning Hands: the big hands the tanks must take")])

DPS4 = "D1 D2 D3 D4"
step(P3, "Darkness of Eternity", "สู้ Add คนเดียว แล้วกลับสนาม", "Fight your own add, then come back",
     "AoE เวททั้งปาร์ตี้ แล้วแต่ละคนถูกย้ายไปอีกสนาม ฆ่า Add คนเดียว\n"
     "ฆ่าเสร็จแล้ว ขึ้นไปยืนบนพื้นวงกลมที่กระโดดได้ เพื่อกลับสนามปกติ\n"
     "Add ทำท่าต่างกันเล็กน้อยตามบทบาท (ดูของแต่ละคน)\n\n"
     "buff 2 นาทีกลับมาพอดีช่วงนี้ แต่ใช้ตอนนี้แล้วตีได้ไม่นาน: เก็บไว้ก่อน\n"
     "ใช้ buff 2 นาทีตอนทุกคนกลับมาแล้ว ราวๆ Specter of Death กำลังดี",
     "A magic raid-wide, then each player is moved to an arena of their own to kill an add alone\n"
     "Once it is dead, step onto the round jump floor to go back to the arena\n"
     "The add acts a little differently for each role (see your line)\n\n"
     "Your 2-minute buffs come back right here, but used now you cannot hit for long: hold them\n"
     "Use them once everyone is back, around Specter of Death",
     says={"MT": "ใช้ silence (Interject) ตัด Spreading Fear / ใช้ mitigate ตอน tankbuster แล้วฆ่า Add",
           "ST": "ใช้ silence (Interject) ตัด Spreading Fear / ใช้ mitigate ตอน tankbuster แล้วฆ่า Add",
           "H1": "ติด Slow เมื่อไหร่ ใช้ Esuna กับตัวเอง / heal ตัวเองไปด้วยระหว่างฆ่า Add",
           "H2": "ติด Slow เมื่อไหร่ ใช้ Esuna กับตัวเอง / heal ตัวเองไปด้วยระหว่างฆ่า Add",
           **seats({"หลบ AoE ของ Add 2 ตัว แล้วฆ่า": DPS4})},
     says_en={"MT": "Silence Spreading Fear (Interject) / mitigate the tankbuster and kill the add",
              "ST": "Silence Spreading Fear (Interject) / mitigate the tankbuster and kill the add",
              "H1": "When you get Slow, Esuna yourself / heal yourself while killing the add",
              "H2": "When you get Slow, Esuna yourself / heal yourself while killing the add",
              **seats({"Dodge the two adds' AoEs and kill them": DPS4})},
     refs=[FR("eternity-jump-pad", 470, "พื้นวงกลมที่กระโดดได้: ฆ่า Add เสร็จแล้วขึ้นไปยืน เพื่อกลับสนามปกติ",
              "The round jump floor: step on it after your add dies to go back to the arena")])

# ------------------------------------------------------------------ second part
SP = "Specter of Death + The End's Embrace"
step(P4, SP, "① สายจากบอสไปขอบสนาม", "① Tethers from the boss to the edge",
     "Specter of Death: บอสโยงสาย (tether) ไปที่ขอบสนาม 2 จุด\n"
     "มือยักษ์ 2 ข้างโผล่ที่ปลายสาย แล้วยิง AoE แนวตรงจากตรงนั้น\n"
     "ภาพนี้: มือยักษ์ที่ขอบตะวันตกด้านล่าง กับขอบตะวันออกด้านบน",
     "Specter of Death: the boss tethers two spots on the edge\n"
     "Two giant hands rise at the tethers' ends and fire line AoEs from there\n"
     "In this picture: hands at the west edge, low, and the east edge, high",
     strict=False, pic=20, scene=S.sp_tether(),
     refs=[FR("specter-of-death", 492, "Specter of Death: มือยักษ์โผล่ที่ขอบสนาม มีสายโยงมาจากบอส",
              "Specter of Death: a giant hand rises at the edge, tethered to the boss")])

step(P4, SP, "② วาง The End's Embrace ใน safe zone", "② Drop The End's Embrace in the safe strip",
     "AoE แนวตรงจากมือยักษ์ 2 ข้าง: safe คือแถบกลางสนาม\n"
     "ทุกคนได้ AoE วงกลมของ The End's Embrace: วางที่จุดของตัวเองใน safe zone\n"
     "ตะวันตก: MT·D1 แถวบน / H1·D3 แถวล่าง\n"
     "ตะวันออก: ST·D2 แถวบน / H2·D4 แถวล่าง\n"
     "Tank กับ Healer อยู่ริมนอก D1 D2 D3 D4 อยู่ด้านใน\n\n"
     "Tank กับ Healer ที่ริมต้องเดินไกล: ถ้าไม่ทัน ใช้ Sprint",
     "The giant hands' lines: the middle strip is safe\n"
     "Everyone gets a circle AoE from The End's Embrace: drop it on your spot in the strip\n"
     "West: MT·D1 top row / H1·D3 bottom row\n"
     "East: ST·D2 top row / H2·D4 bottom row\n"
     "Tanks and healers on the outside, D1 D2 D3 D4 on the inside\n\n"
     "Tanks and healers at the edges have far to go: use Sprint if it is tight",
     strict=True, pic=21, scene=S.sp_drop(),
     says={"MT": "ฝั่งตะวันตก แถวบน ด้านนอก", "D1": "ฝั่งตะวันตก แถวบน ด้านใน", "H1": "ฝั่งตะวันตก แถวล่าง ด้านนอก", "D3": "ฝั่งตะวันตก แถวล่าง ด้านใน",
           "ST": "ฝั่งตะวันออก แถวบน ด้านนอก", "D2": "ฝั่งตะวันออก แถวบน ด้านใน", "H2": "ฝั่งตะวันออก แถวล่าง ด้านนอก", "D4": "ฝั่งตะวันออก แถวล่าง ด้านใน"},
     says_en={"MT": "West, top row, outer", "D1": "West, top row, inner", "H1": "West, bottom row, outer", "D3": "West, bottom row, inner",
              "ST": "East, top row, outer", "D2": "East, top row, inner", "H2": "East, bottom row, outer", "D4": "East, bottom row, inner"})

step(P4, SP, "③ รวมกลาง ล่อมือ แล้วหลบขึ้นหรือลง", "③ Gather, bait the hands, then dodge up or down",
     "③ ทุกคนรวมกลางสนาม ล่อแนวยิงของมือที่โผล่จากจุด AoE แล้วหลบขึ้นเหนือหรือลงใต้\n"
     "ป้าย TDH ในภาพ = ทุกคน\n\n"
     "ทันทีหลังล่อ บอสร่าย Cold Grip: ดูแขนที่เรืองแสงสีดำ แล้วหลบ AoE สีดำที่ขยายให้พ้น",
     "③ Everyone gathers in the middle, baits the lines of the hands rising from the AoE spots, then dodges north or south\n"
     "The TDH badge in the picture = everyone\n\n"
     "Right after the bait the boss casts Cold Grip: find the arm glowing black and keep out of its widened AoE",
     strict=False, pic=22, scene=S.sp_bait())

RR = "Relentless Reaping + Crop Rotation + The Second / Fourth Season"
step(P4, RR, "① จำ AoE 4 แบบตามลำดับ", "① Remember 4 AoEs in order",
     "Relentless Reaping: บอสเตรียม AoE 4 แบบไว้ตามลำดับ\n"
     "Crop Rotation: เปลี่ยนลำดับ\n"
     "The Second Season หรือ The Fourth Season: ปล่อย AoE ที่เตรียมไว้ตามลำดับ และ stack ตอนท้าย\n\n"
     "AoE ทั้ง 4 แบบหลบได้ด้วยการเข้าใน (ใกล้บอส) หรือออกนอก (ห่างบอส):\n"
     "ใน: donut / แนวตรงสองข้าง\n"
     "นอก: แนวตรงกลางสนาม / วงกลมรอบบอส\n"
     "จำเป็น ใน/นอก จะง่ายกว่า\n\n"
     "ภาพนี้: 1 แนวตรงกลาง / 2 donut / 3 วงกลมรอบบอส / 4 แนวตรงสองข้าง",
     "Relentless Reaping: the boss prepares 4 AoEs in order\n"
     "Crop Rotation: changes the order\n"
     "The Second Season or The Fourth Season: releases them in order, with stacks at the end\n\n"
     "Every one of the 4 is dodged by going in (close to the boss) or out (away from it):\n"
     "In: donut / lines down both sides\n"
     "Out: a line down the middle / a circle around the boss\n"
     "It is easier to remember them as in/out\n\n"
     "In this picture: 1 middle line / 2 donut / 3 circle around the boss / 4 side lines",
     strict=False, pic=23, scene=S.rr_souls())

step(P4, RR, "② Crop Rotation: เปลี่ยนจุดเริ่ม", "② Crop Rotation: a new starting point",
     "Crop Rotation เปลี่ยนลำดับของ AoE\n"
     "ไม่ได้สลับมั่วทั้งหมด (1234 ไม่กลายเป็น 4231): แค่เปลี่ยนว่าเริ่มที่ AoE ไหน แล้ววนตามลำดับเดิม\n"
     "เช่น เริ่มที่ 3: 3 > 4 > 1 > 2\n\n"
     "ตัวอย่างของ game8:\n"
     "ก่อน: 1 ใน > 2 นอก > 3 นอก > 4 ใน\n"
     "หลัง Crop Rotation: 3 นอก > 4 ใน > 1 ใน > 2 นอก\n\n"
     "ทีมงาน game8 แนะนำสำหรับคนจำไม่เก่ง: ทำมาโคร 2 อัน /echo IN (เข้าใกล้) กับ /echo OUT (ถอยห่าง) แล้วกดตามลำดับที่บอสแสดง ข้อความจะค้างในแชท\n"
     "เปลี่ยน /echo เป็น /p ให้ขึ้นในแชทปาร์ตี้ได้ แต่ให้กดคนเดียว หลายคนกดจะสับสน",
     "Crop Rotation changes the order of the AoEs\n"
     "It does not shuffle them (1234 never becomes 4231): it only changes which AoE goes first, then the same order wraps round\n"
     "Starting at 3, say: 3 > 4 > 1 > 2\n\n"
     "game8's example:\n"
     "Before: 1 in > 2 out > 3 out > 4 in\n"
     "After Crop Rotation: 3 out > 4 in > 1 in > 2 out\n\n"
     "game8's team suggests, if remembering is hard: make two macros, /echo IN (go close) and /echo OUT (go away), and press them in the order the boss shows; the text stays in your chat\n"
     "Change /echo to /p to put it in party chat, but only one person should do it, or it gets confusing",
     strict=False, pic=24, scene=S.rr_rotate(),
     refs=[FR("crop-rotation", 582, "หลัง Crop Rotation: วงรอบบอสแต่ละวงมีเครื่องหมายสีฟ้า 1–4 อัน เหมือนในภาพ",
              "After Crop Rotation: each ring around the boss carries 1–4 blue marks, as in the picture")])

IN44 = seats({"กลุ่มตะวันตก (MT D1 H1 D3)": G_W, "กลุ่มตะวันออก (ST D2 H2 D4)": G_E})
IN44_EN = seats({"West group (MT D1 H1 D3)": G_W, "East group (ST D2 H2 D4)": G_E})
step(P4, RR, "③ AoE แรก: แนวตรงสองข้าง (ใน)", "③ 1st AoE: side lines (in)",
     "AoE เริ่มจากเลขที่เรืองแสงใต้ marker ตรงหน้าบอส แล้ววนตามเข็มนาฬิกา\n"
     "ภาพนี้: AoE แรกเป็นแนวตรงสองข้าง: เข้าใน ใกล้บอส\n"
     "กลุ่มตะวันตก: MT D1 H1 D3 / กลุ่มตะวันออก: ST D2 H2 D4",
     "The AoEs start from the glowing number under the marker in front of the boss and go round clockwise\n"
     "In this picture the 1st is the side lines: go in, close to the boss\n"
     "West group: MT D1 H1 D3 / east group: ST D2 H2 D4",
     strict=True, pic=25, scene=S.rr_step1(), says=IN44, says_en=IN44_EN)

step(P4, RR, "④ AoE ที่ 2: วงกลมรอบบอส (นอก)", "④ 2nd AoE: circle around the boss (out)",
     "ภาพนี้: AoE ที่ 2 เป็นวงกลมรอบบอส: ออกนอก ห่างบอส\n"
     "กลุ่มตะวันตก: MT D1 H1 D3 / กลุ่มตะวันออก: ST D2 H2 D4",
     "In this picture the 2nd is a circle around the boss: go out, away from it\n"
     "West group: MT D1 H1 D3 / east group: ST D2 H2 D4",
     strict=True, pic=26, scene=S.rr_step2(), says=IN44, says_en=IN44_EN)

step(P4, RR, "⑤ AoE ที่ 3: donut (ใน)", "⑤ 3rd AoE: donut (in)",
     "ภาพนี้: AoE ที่ 3 เป็น donut: เข้าใน ใกล้บอส\n"
     "กลุ่มตะวันตก: MT D1 H1 D3 / กลุ่มตะวันออก: ST D2 H2 D4",
     "In this picture the 3rd is a donut: go in, close to the boss\n"
     "West group: MT D1 H1 D3 / east group: ST D2 H2 D4",
     strict=True, pic=27, scene=S.rr_step3(), says=IN44, says_en=IN44_EN)

step(P4, RR, "⑥ AoE ที่ 4 + stack", "⑥ 4th AoE + stacks",
     "AoE ที่ 4 มาพร้อม stack ของ The Second Season (4:4) หรือ The Fourth Season (คู่)\n"
     "stack ใน safe zone สุดท้ายตามจุดที่กำหนด (ดูจุด stack ในขั้นถัดไป)\n"
     "ภาพนี้: แนวตรงกลาง + 4:4",
     "The 4th AoE comes with the stacks of The Second Season (4:4) or The Fourth Season (pairs)\n"
     "Stack in the last safe spot, on your set spot (the next steps show them)\n"
     "In this picture: middle line + 4:4",
     strict=True, pic=28, scene=S.sr_centre44(False), says=IN44, says_en=IN44_EN)

for pic, scene, name, name_en, note, note_en in (
        (29, S.st44_circle(), "จุด stack 4:4: วงกลมรอบบอส", "4:4 stacks: circle around the boss",
         "The Second Season (4:4)\nวงกลมรอบบอส: ออกนอก stack สองข้างนอกวง", "The Second Season (4:4)\nCircle around the boss: go out, stack on both sides outside it"),
        (30, S.st44_donut(), "จุด stack 4:4: donut", "4:4 stacks: donut",
         "The Second Season (4:4)\ndonut: เข้าใน stack ชิดบอส สองข้าง", "The Second Season (4:4)\nDonut: go in, stack close to the boss on both halves"),
        (31, S.sr_centre44(False), "จุด stack 4:4: แนวตรงกลาง", "4:4 stacks: middle line",
         "The Second Season (4:4)\nแนวตรงกลาง: stack สองข้างของแนว", "The Second Season (4:4)\nMiddle line: stack on both sides of it"),
        (32, S.sr_sides44(False), "จุด stack 4:4: แนวตรงสองข้าง (safe กลาง)", "4:4 stacks: side lines (middle safe)",
         "The Second Season (4:4)\nแนวตรงสองข้าง: stack ในแนวกลาง ด้านเหนือ", "The Second Season (4:4)\nSide lines: stack in the middle, north")):
    step(P4, RR, name, name_en, note + "\nกลุ่มตะวันตก: MT D1 H1 D3 / กลุ่มตะวันออก: ST D2 H2 D4",
         note_en + "\nWest group: MT D1 H1 D3 / east group: ST D2 H2 D4",
         strict=True, pic=pic, scene=scene, says=IN44, says_en=IN44_EN)

PRS = seats({"คู่ MT·D1 ฝั่งตะวันตก ด้านนอก": "MT D1", "คู่ H1·D3 ฝั่งตะวันตก ด้านใน": "H1 D3", "คู่ ST·D2 ฝั่งตะวันออก ด้านนอก": "ST D2", "คู่ H2·D4 ฝั่งตะวันออก ด้านใน": "H2 D4"})
PRS_EN = seats({"Pair MT·D1, west, outer": "MT D1", "Pair H1·D3, west, inner": "H1 D3", "Pair ST·D2, east, outer": "ST D2", "Pair H2·D4, east, inner": "H2 D4"})
for pic, scene, name, name_en, note, note_en in (
        (33, S.stpr_circle(), "จุด stack คู่: วงกลมรอบบอส", "Pair stacks: circle around the boss",
         "The Fourth Season (คู่)\nวงกลมรอบบอส: ออกนอก stack คู่นอกวง", "The Fourth Season (pairs)\nCircle around the boss: go out, pairs outside it"),
        (34, S.stpr_donut(), "จุด stack คู่: donut", "Pair stacks: donut",
         "The Fourth Season (คู่)\ndonut: เข้าใน stack คู่ชิดบอส", "The Fourth Season (pairs)\nDonut: go in, pairs close to the boss"),
        (35, S.sr_centrepr(False), "จุด stack คู่: แนวตรงกลาง", "Pair stacks: middle line",
         "The Fourth Season (คู่)\nแนวตรงกลาง: stack คู่สองข้างของแนว", "The Fourth Season (pairs)\nMiddle line: pairs on both sides of it"),
        (36, S.sr_sidespr(False), "จุด stack คู่: แนวตรงสองข้าง (safe กลาง)", "Pair stacks: side lines (middle safe)",
         "The Fourth Season (คู่)\nแนวตรงสองข้าง: stack คู่ในแนวกลาง ด้านเหนือ", "The Fourth Season (pairs)\nSide lines: pairs in the middle, north")):
    step(P4, RR, name, name_en, note + "\nMT·D1 / H1·D3 ฝั่งตะวันตก / ST·D2 / H2·D4 ฝั่งตะวันออก",
         note_en + "\nMT·D1 / H1·D3 west / ST·D2 / H2·D4 east",
         strict=True, pic=pic, scene=scene, says=PRS, says_en=PRS_EN)

CL = "Circle of Lives + Specter of Death + Soul Reaping + Twofold / Fourfold Blight"
step(P4, CL, "① ลูกแก้ว 5 ลูก", "① Five orbs",
     "Circle of Lives: ลูกแก้ว 5 ลูกโผล่บนสนาม แต่ละลูกปล่อย donut ทีละลูกตามลำดับ\n"
     "ระหว่างหลบ donut บอสร่าย Specter of Death และ Soul Reaping + Twofold/Fourfold Blight ด้วย: หลบไปทำไป",
     "Circle of Lives: five orbs appear, and each releases a donut, one after another\n"
     "While you dodge the donuts the boss also casts Specter of Death and Soul Reaping + Twofold/Fourfold Blight: do them as you go",
     strict=False, pic=38, scene=S.col1(),
     refs=[FR("circle-of-lives", 621, "Circle of Lives: ลูกแก้วสีฟ้าบนสนาม มีวงล้อมรอบ แต่ละลูกปล่อย donut",
              "Circle of Lives: blue orbs on the field, ringed; each releases a donut")])

for pic, scene, name, name_en, note, note_en in (
        (39, S.col_pop("SE", ("NW", "NE", "C", "SW")), "② donut ลูกที่ 1", "② 1st donut",
         "หลบ donut: เข้าไปยืนใกล้ลูกที่ระเบิด (ในรูของ donut)\nป้าย TDH = ทุกคน\nภาพนี้: ลูกตะวันออกเฉียงใต้",
         "Dodge a donut by standing close to the orb going off (in its hole)\nThe TDH badge = everyone\nIn this picture: the south-east orb"),
        (40, S.col_pop("NE", ("NW", "C", "SW")), "③ donut ลูกที่ 2", "③ 2nd donut",
         "ภาพนี้: ลูกตะวันออกเฉียงเหนือ", "In this picture: the north-east orb"),
        (41, S.col_hand(), "④ Specter of Death ระหว่างนั้น", "④ Specter of Death meanwhile",
         "Specter of Death มาระหว่างนี้: ดูตำแหน่งมือยักษ์แล้วหลบแนวยิง\nภาพนี้: มือยักษ์ทางตะวันออกยิงแถบกลางสนาม ทุกคนไปยืนเหนือแถบ",
         "Specter of Death comes in the middle of this: find the giant hand and dodge its line\nIn this picture the east hand fires across the middle: everyone stands north of the strip"),
        (42, S.col_pop("C", ("NW", "SW"), hand=False, soul=True, who=(51, 50)), "⑤ donut ลูกที่ 3 + ดู Soul Reaping", "⑤ 3rd donut + read Soul Reaping",
         "หลบ donut ลูกที่ 3 (ลูกกลาง)\nตอนนี้บอสร่าย Soul Reaping: ดูว่าเตรียม AoE แบบไหน (ภาพนี้: donut)\nทีมงาน game8 เตือน: ร่ายเงียบๆ ระหว่างหลบ donut ดูบอสทุกครั้ง ลืมง่าย",
         "Dodge the 3rd donut (the middle orb)\nThe boss casts Soul Reaping now: see which AoE it prepares (here: a donut)\ngame8's team warns: it is cast quietly while you dodge donuts; always look at the boss, it is easy to miss"),
        (43, S.col_pop("SW", ("NW",), hand=False, soul=True), "⑥ donut ลูกที่ 4", "⑥ 4th donut",
         "ภาพนี้: ลูกตะวันตกเฉียงใต้", "In this picture: the south-west orb"),
        (44, S.col_pop("NW", (), hand=False, soul=True), "⑦ donut ลูกที่ 5", "⑦ 5th donut",
         "ภาพนี้: ลูกตะวันตกเฉียงเหนือ", "In this picture: the north-west orb")):
    step(P4, CL, name, name_en, note, note_en, strict=False, pic=pic, scene=scene)

step(P4, CL, "⑧ stack ใน safe ของ Soul Reaping", "⑧ Stack in Soul Reaping's safe spot",
     "ทำ Twofold/Fourfold Blight ใน safe zone ของ AoE ที่ Soul Reaping เตรียมไว้\n"
     "ภาพนี้: donut + Fourfold Blight (คู่)\n"
     "MT·D1 / H1·D3 ฝั่งตะวันตก / ST·D2 / H2·D4 ฝั่งตะวันออก",
     "Take Twofold/Fourfold Blight in the safe spot of the AoE Soul Reaping prepared\n"
     "In this picture: donut + Fourfold Blight (pairs)\n"
     "MT·D1 / H1·D3 west / ST·D2 / H2·D4 east",
     strict=True, pic=34, scene=S.stpr_donut(), says=PRS, says_en=PRS_EN)

MAC = "Mass Macabre"
step(P4, MAC, "เริ่ม: tower 10 อัน 3 แบบ", "Start: 10 towers of 3 kinds",
     "Mass Macabre: tower 10 อัน 3 แบบ: 4 คน / 3 คน / 2 คน\n"
     "เข้าทีละอันตามลำดับ: เข้า tower แล้วติด debuff สั้นๆ รอ debuff หายก่อนค่อยเข้าอันถัดไป\n"
     "ลำดับ: tower 4 คน > 2 คน > 3 คน > 3 คน\n\n"
     "เลข tower ตามมาโคร:\n"
     "① เหนือกลาง / ② ใต้กลาง (4 คน)\n"
     "③ ⑤ ขอบตะวันตก บน/ล่าง / ④ ⑥ ขอบตะวันออก บน/ล่าง (2 คน)\n"
     "⑨ ตะวันตกเฉียงเหนือ / ⑦ ตะวันออกเฉียงเหนือ / ⑧ ตะวันตกเฉียงใต้ / ⑩ ตะวันออกเฉียงใต้ (3 คน)\n\n"
     "ลำดับแต่ละคน:\n"
     "MT: ① > ⑤ > tankbuster / ST: ① > ⑥ > tankbuster\n"
     "H1: ② > ⑤ > ⑧ > ⑩ / H2: ② > ⑥ > ⑦ > ⑨\n"
     "D1 D2: ① > ④ > ⑦ > ⑨ / D3 D4: ② > ③ > ⑧ > ⑩",
     "Mass Macabre: 10 towers of 3 kinds: for 4 / for 3 / for 2\n"
     "Take them one at a time: a tower gives a short debuff; wait for it to wear off before the next\n"
     "Order: towers for 4 > 2 > 3 > 3\n\n"
     "Tower numbers, as in the macro:\n"
     "① north of the middle / ② south of the middle (for 4)\n"
     "③ ⑤ west edge, upper/lower / ④ ⑥ east edge, upper/lower (for 2)\n"
     "⑨ north-west / ⑦ north-east / ⑧ south-west / ⑩ south-east (for 3)\n\n"
     "Each player's order:\n"
     "MT: ① > ⑤ > tankbuster / ST: ① > ⑥ > tankbuster\n"
     "H1: ② > ⑤ > ⑧ > ⑩ / H2: ② > ⑥ > ⑦ > ⑨\n"
     "D1 D2: ① > ④ > ⑦ > ⑨ / D3 D4: ② > ③ > ⑧ > ⑩",
     strict=False, pic=45, scene=S.mac1(),
     says={"MT": "① > ⑤ > tankbuster", "ST": "① > ⑥ > tankbuster", "H1": "② > ⑤ > ⑧ > ⑩", "H2": "② > ⑥ > ⑦ > ⑨",
           "D1": "① > ④ > ⑦ > ⑨", "D2": "① > ④ > ⑦ > ⑨", "D3": "② > ③ > ⑧ > ⑩", "D4": "② > ③ > ⑧ > ⑩"},
     says_en={"MT": "① > ⑤ > tankbuster", "ST": "① > ⑥ > tankbuster", "H1": "② > ⑤ > ⑧ > ⑩", "H2": "② > ⑥ > ⑦ > ⑨",
              "D1": "① > ④ > ⑦ > ⑨", "D2": "① > ④ > ⑦ > ⑨", "D3": "② > ③ > ⑧ > ⑩", "D4": "② > ③ > ⑧ > ⑩"},
     refs=[FR("mass-macabre-towers", 709, "Mass Macabre: tower สีชมพูหลายอันบนพื้น", "Mass Macabre: pink towers on the floor")])

step(P4, MAC, "tower 4 คน: กลุ่มตีใกล้กับกลุ่มตีไกล", "Towers for 4: the close group and the far group",
     "แยกเป็นกลุ่มตีใกล้กับกลุ่มตีไกล แล้วเข้า tower 4 คน:\n"
     "① เหนือ: MT ST D1 D2\n"
     "② ใต้: D3 D4 H1 H2",
     "Split into the close-range group and the long-range group and take the towers for 4:\n"
     "① north: MT ST D1 D2\n"
     "② south: D3 D4 H1 H2",
     strict=True, pic=46, scene=S.mac2(),
     says=seats({"tower ① (เหนือ)": "MT ST D1 D2", "tower ② (ใต้)": "D3 D4 H1 H2"}),
     says_en=seats({"Tower ① (north)": "MT ST D1 D2", "Tower ② (south)": "D3 D4 H1 H2"}))

step(P4, MAC, "tower 2 คน", "Towers for 2",
     "debuff หายแล้ว เข้า tower 2 คน:\n"
     "③ ตะวันตกบน: D3 D4 / ⑤ ตะวันตกล่าง: MT H1\n"
     "④ ตะวันออกบน: D1 D2 / ⑥ ตะวันออกล่าง: ST H2\n"
     "ภาพนี้มี AoE แนวตรงลงกลางสนามด้วย",
     "Once the debuff is gone, take the towers for 2:\n"
     "③ west upper: D3 D4 / ⑤ west lower: MT H1\n"
     "④ east upper: D1 D2 / ⑥ east lower: ST H2\n"
     "This picture also shows a line AoE down the middle",
     strict=True, pic=47, scene=S.mac3(),
     says=seats({"tower ③ ตะวันตกบน": "D3 D4", "tower ⑤ ตะวันตกล่าง": "MT H1", "tower ④ ตะวันออกบน": "D1 D2", "tower ⑥ ตะวันออกล่าง": "ST H2"}),
     says_en=seats({"Tower ③ west upper": "D3 D4", "Tower ⑤ west lower": "MT H1", "Tower ④ east upper": "D1 D2", "Tower ⑥ east lower": "ST H2"}))

step(P4, MAC, "หลบแนวยิงจากกลางสนาม", "Dodge the lines from the middle",
     "มือที่กลางสนามยิง AoE แนวตรง: หลบไปยืนใน safe zone\n"
     "ภาพนี้: MT ไปรอที่ขอบตะวันตกด้านบน / D3 D4 H1 ฝั่งตะวันตกด้านล่าง / D1 D2 ST H2 ฝั่งตะวันออกช่องกลาง",
     "Hands in the middle fire line AoEs: move into the safe spots\n"
     "In this picture: MT waits at the west edge, high / D3 D4 H1 west, low / D1 D2 ST H2 east, in the middle gap",
     strict=True, pic=48, scene=S.mac4(),
     says={"MT": "ขอบตะวันตกด้านบน", **seats({"ฝั่งตะวันตกด้านล่าง": "D3 D4 H1", "ฝั่งตะวันออกช่องกลาง": "D1 D2 ST H2"})},
     says_en={"MT": "West edge, high", **seats({"West side, low": "D3 D4 H1", "East side, the middle gap": "D1 D2 ST H2"})})

step(P4, MAC, "tower 3 คน + tankbuster ใส่ MT", "Towers for 3 + the tankbuster on MT",
     "tankbuster ใส่ MT: คนอื่นที่ไม่ใช่ Tank เข้า tower 3 คน\n"
     "⑦ ตะวันออกเฉียงเหนือ: D1 D2 H2\n"
     "⑧ ตะวันตกเฉียงใต้: D3 D4 H1\n"
     "MT รับที่มุมตะวันตกเฉียงเหนือ / ST รอที่มุมตะวันออกเฉียงเหนือ",
     "The tankbuster on MT: everyone but the tanks takes a tower for 3\n"
     "⑦ north-east: D1 D2 H2\n"
     "⑧ south-west: D3 D4 H1\n"
     "MT takes it in the north-west corner / ST waits in the north-east corner",
     strict=True, pic=49, scene=S.mac5(),
     says={"MT": "รับ tankbuster ที่มุมตะวันตกเฉียงเหนือ", "ST": "รอที่มุมตะวันออกเฉียงเหนือ",
           **seats({"tower ⑦ ตะวันออกเฉียงเหนือ": "D1 D2 H2", "tower ⑧ ตะวันตกเฉียงใต้": "D3 D4 H1"})},
     says_en={"MT": "Take the tankbuster in the north-west corner", "ST": "Wait in the north-east corner",
              **seats({"Tower ⑦ north-east": "D1 D2 H2", "Tower ⑧ south-west": "D3 D4 H1"})})

step(P4, MAC, "tower 3 คน + tankbuster ใส่ ST", "Towers for 3 + the tankbuster on ST",
     "tankbuster ใส่ ST: คนอื่นที่ไม่ใช่ Tank เข้า tower 3 คน\n"
     "⑨ ตะวันตกเฉียงเหนือ: D1 D2 H2\n"
     "⑩ ตะวันออกเฉียงใต้: D3 D4 H1\n"
     "ST รับที่มุมตะวันออกเฉียงเหนือ",
     "The tankbuster on ST: everyone but the tanks takes a tower for 3\n"
     "⑨ north-west: D1 D2 H2\n"
     "⑩ south-east: D3 D4 H1\n"
     "ST takes it in the north-east corner",
     strict=True, pic=50, scene=S.mac6(),
     says={"ST": "รับ tankbuster ที่มุมตะวันออกเฉียงเหนือ",
           **seats({"tower ⑨ ตะวันตกเฉียงเหนือ": "D1 D2 H2", "tower ⑩ ตะวันออกเฉียงใต้": "D3 D4 H1"})},
     says_en={"ST": "Take the tankbuster in the north-east corner",
              **seats({"Tower ⑨ north-west": "D1 D2 H2", "Tower ⑩ south-east": "D3 D4 H1"})})

# ------------------------------------------------------------------ last part (game8's timeline: what comes again)
def again(mech, name, name_en, note, note_en):
    step(P5, mech, name, name_en, note, note_en)


again("Cold Grip", "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Cold Grip มาอีกครั้งหลัง Mass Macabre\n"
      "ทำเหมือนเดิม (ดู Cold Grip ช่วงแรก): หลบสองข้างที่แนวกลาง แล้วไปฝั่งแขนที่ไม่เรืองแสงสีดำ",
      "By game8's timeline Cold Grip comes again after Mass Macabre\n"
      "Same as before (see Cold Grip, first part): dodge both sides in the middle, then go to the side whose arm is not glowing black")
again(RR, "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Relentless Reaping > Crop Rotation > The Fourth Season มาอีกครั้ง\n"
      "ทำเหมือนเดิม (ดู Relentless Reaping ช่วงหลัง): จำ ใน/นอก ตามลำดับ แล้ว stack ใน safe zone สุดท้าย\n"
      "ใน timeline ของ game8 ครั้งนี้เป็น The Fourth Season: stack คู่",
      "By game8's timeline Relentless Reaping > Crop Rotation > The Fourth Season comes again\n"
      "Same as before (see Relentless Reaping, second part): remember in/out in order, then stack in the last safe spot\n"
      "In game8's timeline this one is The Fourth Season: pair stacks")
again("Fear of Death", "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Fear of Death มาอีกครั้ง\n"
      "ทำเหมือนครั้งแรก (ดู Fear of Death ช่วงแรก): กระจายตัวรอ แล้วล่อมือของตัวเองออกนอกสนาม",
      "By game8's timeline Fear of Death comes again\n"
      "Same as the first (see Fear of Death, first part): spread loosely, then bait your own hand out of the arena")
step(P5, "Circle of Lives + Specter of Death ×2", "donut จากลูกแก้ว + แนวตรงจากมือยักษ์", "Orb donuts + the giant hands' lines",
     "Circle of Lives: ลูกแก้วโผล่บนสนามแล้วปล่อย donut\n"
     "ระหว่างนั้น Specter of Death ยิง AoE แนวตรง\n"
     "หลบแนวตรงของมือยักษ์ ภายใน safe zone ของ donut",
     "Circle of Lives: orbs appear and release donuts\n"
     "Meanwhile Specter of Death fires its line AoEs\n"
     "Dodge the giant hands' lines inside the donuts' safe spots")
again(MM, "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Memento Mori + Smite of Gloom มาอีกครั้ง\n"
      "ทำเหมือนครั้งแรก (ดู Memento Mori ช่วงแรก): แยกฝั่งตามสีมือ / หลบแนวยิงของมือ / วาง AoE วงใหญ่ตามจุด",
      "By game8's timeline Memento Mori + Smite of Gloom comes again\n"
      "Same as the first (see Memento Mori, first part): split by the hands' colour / dodge the hands' lines / drop the huge circles on your spots")
again("Cold Grip", "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Cold Grip มาอีกครั้งหลัง Memento Mori\n"
      "ทำเหมือนเดิม (ดู Cold Grip ช่วงแรก)",
      "By game8's timeline Cold Grip comes again after Memento Mori\n"
      "Same as before (see Cold Grip, first part)")
again("Grand Cross", "มาอีกครั้ง: เหมือนเดิม", "Again: as before",
      "ตาม timeline ของ game8: Grand Cross มาอีกครั้ง\n"
      "ทำเหมือนเดิม (ดู ช่วง Grand Cross): คู่พื้นฐานในพื้นที่ตัวเอง ทำ tower กับ marker",
      "By game8's timeline Grand Cross comes again\n"
      "Same as before (see the Grand Cross part): base pairs in their own areas, towers and markers")
again("Darkness of Eternity", "อีกครั้งใน timeline", "Again in the timeline",
      "ตาม timeline ของ game8: Darkness of Eternity มาอีกครั้งที่ 11:17 เป็นรายการสุดท้ายของ timeline\n"
      "ครั้งแรกดูที่ ช่วง Add",
      "By game8's timeline Darkness of Eternity comes again at 11:17, the last entry in its timeline\n"
      "For the first one, see the adds phase")

# ------------------------------------------------------------------ the guide
NOTE = ("แผนตาม game8 (แผนและมาโครของ Lucrezia)\n"
        "Marker: game8 ไม่มีหัวข้อ ใช้ชุดของ xivjpraids.com (ดูขั้นแรก)\n\n"
        "คู่พื้นฐาน: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
        "กลุ่ม 4:4: MT D1 H1 D3 ฝั่งตะวันตก / ST D2 H2 D4 ฝั่งตะวันออก\n\n"
        "Memento Mori: Tank ไปฝั่งมือบอสสีดำ / DPS กับ Healer ไปฝั่งมือสีขาว\n"
        "ไม่กลับซ้ายขวา เลื่อนไปทั้งชุด: MT ST / D1 D2 / H1 H2 / D3 D4\n\n"
        "Grand Cross: คู่พื้นฐานยืนแนวทแยง เลื่อนตามเข็มนาฬิกา\n"
        "MT·D1 เหนือ/ตะวันตกเฉียงเหนือ / ST·D2 ตะวันออกเฉียงเหนือ/ตะวันออก / H2·D4 ตะวันออกเฉียงใต้/ใต้ / H1·D3 ตะวันตกเฉียงใต้/ตะวันตก\n\n"
        "Mass Macabre: tower 4 > 2 > 3 > 3 คน\n"
        "MT: ① > ⑤ > tankbuster / ST: ① > ⑥ > tankbuster\n"
        "H1: ② > ⑤ > ⑧ > ⑩ / H2: ② > ⑥ > ⑦ > ⑨\n"
        "D1 D2: ① > ④ > ⑦ > ⑨ / D3 D4: ② > ③ > ⑧ > ⑩")
NOTE_EN = ("Plan follows game8 (Lucrezia's strat and macro)\n"
           "Waymarks: game8 has none; the set is xivjpraids.com's (see the first step)\n\n"
           "Base pairs: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
           "4:4 groups: MT D1 H1 D3 west / ST D2 H2 D4 east\n\n"
           "Memento Mori: tanks to the boss's dark hand side / DPS and healers to the light hand side\n"
           "No mirroring, just slide over: MT ST / D1 D2 / H1 H2 / D3 D4\n\n"
           "Grand Cross: base pairs on the diagonals, shifted clockwise\n"
           "MT·D1 north/north-west / ST·D2 north-east/east / H2·D4 south-east/south / H1·D3 south-west/west\n\n"
           "Mass Macabre: towers for 4 > 2 > 3 > 3\n"
           "MT: ① > ⑤ > tankbuster / ST: ① > ⑥ > tankbuster\n"
           "H1: ② > ⑤ > ⑧ > ⑩ / H2: ② > ⑥ > ⑦ > ⑨\n"
           "D1 D2: ① > ④ > ⑦ > ⑨ / D3 D4: ② > ③ > ⑧ > ⑩")

WEAP = [(46984, "Ageless Longsword", "PLD", "030000/030698"), (47005, "Ageless Kite Shield", "PLD", "030000/030287"),
        (46985, "Ageless Jamadhars", "MNK", "030000/030862"), (46986, "Ageless War Axe", "WAR", "031000/031272"),
        (46987, "Ageless Spear", "DRG", "031000/031674"), (46988, "Ageless Bow", "BRD", "032000/032062"),
        (46989, "Ageless Cane", "WHM", "032000/032493"), (46990, "Ageless Staff", "BLM", "032000/032908"),
        (46991, "Ageless Index", "SMN", "037000/037846"), (46992, "Ageless Codex", "SCH", "037000/037847"),
        (46993, "Ageless Knives", "NIN", "033000/033648"), (46994, "Ageless Guillotine", "DRK", "034000/034027"),
        (46995, "Ageless Revolver", "MCH", "034000/034521"), (46996, "Ageless Star Globe", "AST", "034000/034720"),
        (46997, "Ageless Blade", "SAM", "036000/036576"), (46998, "Ageless Rapier", "RDM", "036000/036875"),
        (46999, "Ageless Bayonet", "GNB", "036000/036118"), (47000, "Ageless War Quoits", "DNC", "036000/036317"),
        (47001, "Ageless War Scythe", "RPR", "037000/037288"), (47002, "Ageless Milpreves", "SGE", "037000/037084"),
        (47003, "Ageless Twinfangs", "VPR", "037000/037451"), (47004, "Ageless Paintbrush", "PCT", "037000/037661")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for _, n, j, p in WEAP]

fight = {
    "guide": {
        "slug": "ex5-necron", "short": "EX5", "name": "Necron · Necron's Embrace",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.3",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/709448",
        "content_key": "ex:Necron",
        "note": NOTE, "en": {"note": NOTE_EN},
        "req": {
            "level": 100, "ilvl": 740, "party": 8, "minutes": 60,
            "unlock": ("คุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                       "Extreme ของ Dawntrail (7.x) ปลดล็อกที่ NPC คนนี้ทั้งหมด"),
            "unlock_en": ("Talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                          "Every Dawntrail (7.x) Extreme is unlocked from this NPC"),
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/necron/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166", "waymarks": {},
        "iconSize": 6.2, "markSize": 6.8, "bossSize": 9, "ring": 6,
    },
    "steps": steps,
    "rewards": [
        {"kind": "token", "name": "Grave Totem", "icon_src": ICON("ui/icon/026000/026682_hr1.tex"),
         "say": ("ได้ทุกครั้งที่เคลียร์ (การันตี)\n\n"
                 "แลกที่ Uah'shepya ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "อาวุธ IL755: 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "Wings of Death: 99 ชิ้น"),
         "say_en": ("Every clear gives it (guaranteed).\n\n"
                    "Exchange them with Uah'shepya in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL755 weapon: 10 per weapon\n"
                    "Wings of Death: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
                   "say": "จุดแลก: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "weapon", "name": "Ageless weapons", "ilvl": 755, "icon_src": ICON("ui/icon/030000/030698_hr1.tex"),
         "say": ("แลกด้วย Grave Totem 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "PLD ได้ Ageless Longsword กับ Ageless Kite Shield คู่กันในการแลกครั้งเดียว\n"
                 "มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ"),
         "say_en": ("10 Grave Totems per weapon\n"
                    "PLD gets the Ageless Longsword and the Ageless Kite Shield together in one exchange\n"
                    "One for every job; tap an icon for the weapon's name"),
         "pieces": pieces},
        {"kind": "mount", "name": "Wings of Death", "icon_src": ICON("ui/icon/004000/004328_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก\nหรือแลกด้วย Grave Totem 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate\nor 99 Grave Totems",
         "pics": [{"src": ICON("ui/icon/068000/068328_hr1.tex"),
                   "say": "หน้าตา Wings of Death (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of Death, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs,",
      sum(1 for s in steps for r in s.get("refs", []) if r.get("by")), "from video,",
      len(dict.fromkeys(s["mech"] for s in steps)), "mechs,", len(dict.fromkeys(s["phase"] for s in steps)), "phases")
