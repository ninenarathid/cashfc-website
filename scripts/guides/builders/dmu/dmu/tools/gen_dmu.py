"""Builds scripts/guides/data/dmu.json: Dancing Mad (Ultimate), two plans: yan-flash.com's first (the tabs where the two differ,
scenes_yan.py) and kanatan.info's (everything else); Nukemaru's footage.

Run from the repo root: python3 scripts/guides/builders/dmu/dmu/tools/gen_dmu.py [allowmissing]
"""
import sys, json, os, re
sys.path.insert(0, os.path.dirname(__file__))
import scenes_p1 as S1
import scenes_p2 as S2
import scenes_p3 as S3
import scenes_p45 as S45
import scenes_yan as SY

W = "scripts/guides/.work/dmu"
OUT = "scripts/guides/data/dmu.json"
URLS = dict(l.split() for l in open(W + "/dl/imgs-indexed.txt", encoding="utf-8") if l.strip())
K = lambda name: [u for n, u in URLS.items() if n.split(".")[0] == name][0]   # kanatan picture p1-05 -> its URL
YURLS = dict(l.split() for l in open(W + "/yan/map.txt", encoding="utf-8") if l.strip())   # yan-flash picture 014 -> its URL
PIC = lambda name: YURLS[name[1:]] if re.match(r"y\d{3}$", name) else K(name)
YAN = ("แบบ yan-flash", "yan-flash")
KAN = ("แบบ kanatan", "kanatan")
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
CLEAR, EXPL = "ASx7Ig8_bRA", "5V5ZcTQss-U"
missing_refs = []


def FR(name, vid, t, say, say_en):
    return (f"frames/dmu/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{vid}?t={t}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None, plan=None):
    s = {"phase": phase, "mech": mech, "name": name, "note": note, "strict": strict}
    if plan:
        s["plan"] = plan[0]
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [PIC(pic)]
    if refs:
        keep = []
        for r in refs:
            if os.path.exists(os.path.join("scripts/guides/data", r[0])):
                keep.append(r)
            else:
                missing_refs.append(r[0])
        refs = keep
        if refs:
            s["refs"] = [{"src": r[0], "say": r[1], "by": r[3], "url": r[4]} for r in refs]
    if scene is not None:
        s["ring"] = 5
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase, "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    if plan:
        en["plan"] = plan[1]
    s["en"] = en
    steps.append(s)


ALL8 = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]
P1, P2, P3, P4, P5 = "P1 Kefka", "P2 God Kefka", "P3 Exdeath and Chaos", "P4 Kefka Says", "P5 Ultima Kefka"

# ======================================================================================= P1
step(P1, "Revolting Ruin III", "tank buster กรวย 2 ครั้ง", "Two tank cleaves",
     "กรวยแรงใส่ Tank 2 ครั้งติดกัน (น่าจะเป็นแบบ Tank 2 คนแชร์)\n"
     "ครั้งแรกมีร่าย ลงที่ aggro อันดับ 1 / ครั้งที่ 2 ไม่มีร่าย ลงที่ aggro อันดับ 2 ทันที\n\n"
     "แผนของ kanatan: ระหว่างร่าย Tank อีกคนใช้ Provoke ให้ทั้ง 2 ครั้งไปลงคนเดียวกัน แล้วรับด้วย invuln",
     "Two heavy tank cleaves in a row (probably meant to be shared by both tanks)\n"
     "The first is cast and hits enmity #1 / the second has no cast and hits enmity #2 right after\n\n"
     "kanatan's way: the other tank Provokes during the cast so both hits go to one tank, who takes them with an invuln",
     refs=[FR("ruin", CLEAR, 18, "Revolting Ruin III: กรวยแรงใส่ Tank 2 ครั้งติดกัน", "Revolting Ruin III: two heavy cleaves on the tanks in a row")])

step(P1, "Graven Image + Mystery Magic", "① สาย + ปริศนา: ดูวงสีบนตัวบอส", "① Tethers + the riddle: read the rings on the boss",
     "รูปปั้นเทพ (Graven Image) ทางเหนือโยงสายมาที่ 4 คน: DPS ทั้ง 4 หรือ Tank·Healer ทั้ง 4\n"
     "สักพักคนมีสายจะโดน knockback ออกจากรูปปั้นไปทางด้านหลัง\n\n"
     "พร้อมกัน Kefka ร่าย Mystery Magic: สัญลักษณ์ Blizzaga (กรวย 90° 2 อัน) กับ Firaga (stack ที่ Tank·Healer 1 คน + DPS 1 คน หรือ spread ทุกคน) ขึ้นพร้อมกัน\n\n"
     "อ่านจากวงรอบตัว Kefka: วงสีแดงด้านบน = Firaga / วงสีน้ำเงินด้านล่าง = Blizzaga\n"
     "มีลูกกลมวิ่งบนวง: ลูกสีน้ำเงิน = จริง (ลงตามที่เห็น) / ลูกสีแดงมี ? = กลับกัน\n"
     "Firaga จริง: stack หรือ spread ตามที่เห็น / มี ?: สลับ stack ↔ spread\n"
     "Blizzaga จริง: ที่ไม่มีสัญลักษณ์คือที่ปลอดภัย / มี ?: ที่มีสัญลักษณ์กรวยคือที่ปลอดภัย\n\n"
     "แล้ว stack หรือ spread ภายในโซนปลอดภัย ตามภาพ 2 ขั้นถัดไป",
     "The Graven Image to the north tethers 4 players: all 4 DPS or all 4 tanks/healers\n"
     "A little later the tethered players are knocked back away from the statue\n\n"
     "At the same time Kefka casts Mystery Magic: the Blizzaga telegraph (two 90° cones) and the Firaga one (a stack on one tank/healer + one DPS, or a spread on everyone) appear together\n\n"
     "Read the rings around Kefka: red ring on top = Firaga / blue ring below = Blizzaga\n"
     "An orb runs on each ring: blue orb = true (lands as shown) / red orb with ? = the opposite\n"
     "True Firaga: stack or spread as shown / with ?: stack ↔ spread swap\n"
     "True Blizzaga: the area without the telegraph is safe / with ?: the telegraphed cones are safe\n\n"
     "Then stack or spread inside the safe area, as in the next two pictures",
     refs=[FR("riddle-rings", CLEAR, 32, "Mystery Magic: วงแดงบน = Firaga / วงน้ำเงินล่าง = Blizzaga · ลูกน้ำเงิน = จริง, ลูกแดงมี ? = กลับกัน",
              "Mystery Magic: red ring on top = Firaga / blue ring below = Blizzaga · blue orb = true, red orb with ? = reversed")])

step(P1, "Graven Image + Mystery Magic", "Firaga เป็น stack: Tank·Healer ตะวันตก / DPS ตะวันออก", "Firaga as stacks: tanks/healers west / DPS east",
     "Tank·Healer อยู่ฝั่งตะวันตก DPS อยู่ฝั่งตะวันออกเสมอ\n"
     "stack กันในส่วนที่ปลอดภัยจาก Blizzaga ของฝั่งตัวเอง (ภาพวาดทั้ง 2 กรณี: ปลอดภัยด้านเหนือหรือด้านใต้)",
     "Tanks/healers always west, DPS always east\n"
     "Stack inside the part of your half that Blizzaga doesn't hit (both cases drawn: the north or the south part safe)",
     strict=["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], pic="p1-05", scene=S1.p1_05())
steps[-1]["strict"] = True

step(P1, "Graven Image + Mystery Magic", "Firaga เป็น spread: ที่ของแต่ละคน", "Firaga as spreads: everyone's spot",
     "spread ในส่วนที่ปลอดภัย ตามตำแหน่งในภาพ (มี 2 ชุด: ใช้ชุดที่อยู่ในส่วนปลอดภัย)\n"
     "Tank·Healer ฝั่งตะวันตก / DPS ฝั่งตะวันออก เหมือนเดิม",
     "Spread inside the safe parts, on the spots drawn (two sets: use the set that is in the safe part)\n"
     "Tanks/healers west / DPS east, as before",
     strict=True, pic="p1-06", scene=S1.p1_06())

step(P1, "Wave Cannon", "เข้าแถวรับลำแสงจากรูปปั้น", "Line up for the statue's beams",
     "สักพักรูปปั้นทางเหนือยิง Wave Cannon: ลำแสงเส้นตรงใส่ DPS 2 คน + Tank·Healer 2 คน\n"
     "มี debuff รับดาเมจเพิ่ม: โดนซ้อน 2 เส้น = ตายทันที\n\n"
     "เข้าแถวแนวตะวันตก–ตะวันออกตามภาพ (ตก → ออก): H2 > H1 > ST > MT > D1 > D2 > D3 > D4\n"
     "หลัง Firaga มีเวลาไม่มาก: Firaga ลงแล้วเข้าแถวทันที",
     "Soon the statue to the north fires Wave Cannon: a line AoE on 2 DPS + 2 tanks/healers\n"
     "It leaves a damage-taken-up debuff: two lines on one person = death\n\n"
     "Line up west to east as drawn: H2 > H1 > ST > MT > D1 > D2 > D3 > D4\n"
     "There is little time after Firaga: get in line as soon as it lands",
     strict=True, pic="p1-08", scene=S1.p1_08(),
     refs=[FR("wave-cannon", CLEAR, 48, "Wave Cannon: ลำแสงจากรูปปั้นใส่ 4 คน ซ้อนกัน = ตาย", "Wave Cannon: lines from the statue on 4 players; overlapping = death")])

step(P1, "Wave Cannon", "tower ที่เท้าคนโดนลำแสง + เช็ก debuff Trap", "Towers at the hit players' feet + check the Trap debuff",
     "tower ขึ้นที่เท้าคนที่โดน Wave Cannon\n"
     "4 คนที่ไม่โดนเข้า tower: เข้า tower ที่ role เดียวกันปล่อย (Melee เข้าของ Melee / Range เข้าของ Range) ถ้าเหลื่อมกันก็แค่ขยับเข้าไปเติม\n"
     "ภาพเป็นตัวอย่าง: ST MT D1 D3 โดนลำแสง\n\n"
     "ช่วงนี้ Kefka ร่าย Double-trouble Trap: DPS 1 คน + Tank·Healer 1 คน ได้ debuff สีม่วง: ดูว่าใครได้",
     "Towers appear at the feet of the players hit by Wave Cannon\n"
     "The 4 not hit soak them: the tower left by your own role (melee soak melee's / ranged soak ranged's); if it doesn't split evenly, just fill in\n"
     "The picture is an example: ST MT D1 D3 were hit\n\n"
     "Around here Kefka casts Double-trouble Trap: 1 DPS + 1 tank/healer get a purple debuff: note who",
     strict=False, pic="p1-09", scene=S1.p1_09())

step(P1, "Double-trouble Trap", "Trap ①: stack + knockback ฝั่งตก / ฝั่งออก", "Trap ①: stack + knockback, west and east",
     "ทำทันทีหลัง tower\n"
     "debuff หมดเวลา: stack วงกลมรอบคนถือ + knockback ออกจากคนถือ\n"
     "debuff ส่งต่อไปที่ 1 คนในคนที่เข้า stack\n\n"
     "Tank·Healer stack ฝั่งตะวันตก / DPS ฝั่งตะวันออก\n"
     "คนถือ debuff ยืนฝั่งขอบสนาม คนอื่นยืนฝั่งในเพื่อให้โดนกระเด็นเข้ากลางสนาม\n\n"
     "สำคัญ: debuff นี้ต้องอยู่จนเกือบจบ P1 ไม่งั้นไม่ได้ flag เข้า P3 และจะถูกเตะออกตอน P2\n"
     "ถ้าคนถือ debuff ตาย debuff หายไปด้วย",
     "Right after the towers\n"
     "When the debuff ends: a stack circle on the holder + a knockback away from the holder\n"
     "The debuff passes to one of the players in the stack\n\n"
     "Tanks/healers stack west / DPS east\n"
     "The holder stands on the arena-edge side, everyone else on the inner side, so they are knocked towards the middle\n\n"
     "Important: this debuff has to survive until near the end of P1, or the party won't get the flag for P3 and is thrown out during P2\n"
     "If the holder dies, the debuff is gone",
     strict=False, pic="p1-11", scene=S1.p1_11())

step(P1, "Mystery Magic", "② Blizzaga + Thundaga", "② Blizzaga + Thundaga",
     "ตอนโดนกระเด็นแล้ว Kefka ร่าย Mystery Magic อีกครั้ง: Blizzaga (กรวย) + Thundaga (เส้นตรง 2 เส้น)\n"
     "มีจริง / หลอกเหมือนเดิม: ? = หลอก ต้องเข้าไปยืนในสัญลักษณ์ AoE\n"
     "วงม่วงด้านบน = Thundaga / วงน้ำเงินด้านล่าง = Blizzaga: ดูวงทั้งสองแล้วไปยืนที่ปลอดภัย\n\n"
     "จบชุดนี้แล้ว Light of Judgment: raid-wide แรงพอสมควร",
     "As the knockback lands Kefka casts Mystery Magic again: Blizzaga (cones) + Thundaga (two lines)\n"
     "True / false as before: ? = false, you must stand inside that telegraph\n"
     "Purple ring on top = Thundaga / blue ring below = Blizzaga: read both and go to the safe spot\n\n"
     "After this set: Light of Judgment, a fairly heavy raid-wide",
     refs=[FR("riddle2", CLEAR, 56, "Mystery Magic ②: วงม่วง = Thundaga (เส้นตรง) / วงน้ำเงิน = Blizzaga (กรวย)",
              "Mystery Magic ②: purple ring = Thundaga (lines) / blue ring = Blizzaga (cones)")])

step(P1, "Hyperdrive", "tank buster 3 ครั้ง ไม่มีร่าย", "Three uncast tank hits",
     "ไม่มีร่าย: ฟาดลงที่ aggro อันดับ 1 3 ครั้ง\n"
     "ใช้ mitigate เยอะๆ (Revolting Ruin III รับด้วย invuln อยู่แล้ว)",
     "No cast: three hits on enmity #1\n"
     "Use plenty of mitigation (Revolting Ruin III is taken with an invuln anyway)",
     refs=[FR("hyperdrive", CLEAR, 73, "Hyperdrive: ลงที่ aggro อันดับ 1 3 ครั้ง ไม่มีร่าย", "Hyperdrive: three hits on enmity #1, no cast")])

step(P1, "Gravitas / Vitrophyre", "รูปปั้นครั้งที่ 2: สาย 2 แบบ", "Statue 2: two kinds of tether",
     "รูปปั้นโยงสาย: 4 เส้นจากด้านซ้ายบน / 4 เส้นจากด้านขวาล่าง (มองยาก)\n"
     "DPS กับ Tank·Healer ได้สายแบบเดียวกันทั้ง role: แยกกันยืนซ้าย–ขวาให้เห็นง่ายว่า role ไหนได้แบบไหน\n\n"
     "สายซ้ายบน = Gravitas: stack วงกลม ต้องมีคนแชร์อย่างน้อย 1 คน ไม่งั้นระเบิดใหญ่ ทั้งปาร์ตี้ตาย\n"
     "ที่ที่ stack ลงทิ้งพื้นดำไว้: ช่วงแรกมีไฟฟ้าสีขาว ถ้าคนแตะหรือ Vitrophyre โดน = ระเบิด ทั้งปาร์ตี้ตาย\n"
     "พอไฟฟ้าขาวหาย กลายเป็นพื้นดำแบบ stack: ต้องเข้าไปเหยียบรับทีหลัง ไม่งั้นไม่ได้ flag เข้า P3\n\n"
     "สายขวาล่าง = Vitrophyre: ลงหลัง Gravitas นิดหน่อย AoE วงกลมรอบคนถือสาย\n"
     "คนถือแทบไม่เป็นไร แต่คนอื่นโดนจะกระเด็นตาย / โดนพื้นดำของ Gravitas ก็ตาย\n"
     "สรุป: รับ Gravitas แล้ว 4 คนถือ Vitrophyre ต้อง spread ทิ้ง",
     "The statue tethers everyone: 4 lines from its upper left / 4 from its lower right (hard to see)\n"
     "DPS and tanks/healers each get one kind: split left and right so it's easy to see which role has which\n\n"
     "Upper-left line = Gravitas: a circle stack that needs at least one more person in it, or it blows up and wipes the party\n"
     "It leaves a black puddle: while it crackles white, a player touching it or a Vitrophyre hitting it = explosion and a wipe\n"
     "Once the white crackle is gone it becomes a stack-damage puddle: it must be stepped on later, or there's no flag for P3\n\n"
     "Lower-right line = Vitrophyre: lands a little after Gravitas, a circle on the tethered player\n"
     "Harmless to the holder, but anyone else hit is knocked back to death / hitting a Gravitas puddle kills too\n"
     "So: take Gravitas, then the 4 Vitrophyre holders spread to drop theirs",
     refs=[FR("statue2", CLEAR, 86, "รูปปั้นครั้งที่ 2: สายซ้ายบน = Gravitas (stack) / ขวาล่าง = Vitrophyre (spread)",
              "Statue 2: upper-left lines = Gravitas (stack) / lower-right = Vitrophyre (spread)")])

step(P1, "Gravitas / Vitrophyre", "① stack ทางใต้ + ดู Blizzard III Blowout", "① Stack south + read Blizzard III Blowout",
     "ดูว่าใครได้สายไหนแล้วไปรวมทางใต้รอรับ stack: ห่างแค่ระยะที่ Melee ยังตีบอสได้\n"
     "ตอนนี้บอสร่าย Blizzard III Blowout: ดูจริง / หลอก แล้วไป stack ในที่ที่ต้องเหยียบ (หรือไม่เหยียบ) ให้ถูก",
     "See who has which line, then gather south for the stack: close enough for melee to keep hitting the boss\n"
     "The boss casts Blizzard III Blowout now: read true / false and stack where you must (or must not) stand in it",
     strict=False, pic="p1-15", scene=S1.p1_15())

step(P1, "Gravitas / Vitrophyre", "② คนถือ Vitrophyre spread / กลุ่ม Gravitas หนีขึ้นเหนือ", "② Vitrophyre holders spread / the Gravitas group goes north",
     "Gravitas ลงแล้ว คนถือ Vitrophyre (ภาพ: DPS) spread ตามภาพ\n"
     "กลุ่ม Gravitas (ภาพ: Tank·Healer) ขึ้นไปทางเหนือให้พ้น Vitrophyre\n\n"
     "ที่ spread คู่กันตามคู่ (คนละรอบ): MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
     "ฝั่ง D ใช้กลุ่ม MT / ฝั่ง B ใช้กลุ่ม ST",
     "Once Gravitas lands the Vitrophyre holders (DPS here) spread as drawn\n"
     "The Gravitas group (tanks/healers here) moves north, out of the Vitrophyre\n\n"
     "The spread spots are shared by pairs (whoever has the rock that time): MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
     "The D side is the MT group's / the B side the ST group's",
     strict=True, pic="p1-16", scene=S1.p1_16(),
     says={"MT": "ที่ร่วม D1: ฝั่งตะวันตก", "D1": "ที่ร่วม MT: ฝั่งตะวันตก", "ST": "ที่ร่วม D2: ฝั่งตะวันออก", "D2": "ที่ร่วม ST: ฝั่งตะวันออก",
           "H1": "ที่ร่วม D3: ทแยงฝั่งตะวันตก ไกลจากจุด stack", "D3": "ที่ร่วม H1: ทแยงฝั่งตะวันตก ไกลจากจุด stack",
           "H2": "ที่ร่วม D4: ทแยงฝั่งตะวันออก ไกลจากจุด stack", "D4": "ที่ร่วม H2: ทแยงฝั่งตะวันออก ไกลจากจุด stack"},
     says_en={"MT": "Shared with D1: the west spot", "D1": "Shared with MT: the west spot", "ST": "Shared with D2: the east spot", "D2": "Shared with ST: the east spot",
              "H1": "Shared with D3: the west diagonal, far from the stack", "D3": "Shared with H1: the west diagonal, far from the stack",
              "H2": "Shared with D4: the east diagonal, far from the stack", "D4": "Shared with H2: the east diagonal, far from the stack"})

step(P1, "Revolting Ruin III", "Ruin + รูปปั้นฟันครึ่งสนาม", "Ruin + the statue's half-room cleave",
     "บอสใช้ Revolting Ruin III อีกครั้ง: Tank ที่ยังมี invuln รับ\n"
     "ราวๆ ก่อน Ruin ครั้งแรกลง รูปปั้นบอกฟันครึ่งสนามซ้ายหรือขวา: ฝั่งที่มีลูกกลมโดน\n"
     "ถ้าฝั่งซ้ายปลอดภัย ลูกกลมจะไปอยู่อีกฝั่งและเป็นสีน้ำตาล\n"
     "หลบโดยเดินผ่านหลังบอส หรือย้ายตอนระหว่าง Ruin ครั้งที่ 1 กับ 2",
     "The boss uses Revolting Ruin III again: the tank who still has an invuln takes it\n"
     "Around Ruin's first hit the statue marks a left or right half-room cleave: the side with the orb is hit\n"
     "When the left is safe the orb is on the other side and brown\n"
     "Dodge by walking behind the boss, or cross between Ruin's first and second hit",
     strict=["ST"], pic="p1-17", scene=S1.p1_17(),
     refs=[FR("half-room", CLEAR, 106, "รูปปั้นบอกฟันครึ่งสนาม: ฝั่งที่มีลูกกลมโดน", "The statue marks a half-room cleave: the side with the orb is hit")])

step(P1, "Gravitas / Vitrophyre", "③ stack ทางเหนือ + spread ชุดที่ 2", "③ Stack north + the second spread",
     "หลบครึ่งสนามแล้วไปรวมทางเหนือ ห่างแค่ระยะตีบอส\n"
     "รับ stack แบบเดิม แล้วคนถือ Vitrophyre spread (ภาพ: Tank·Healer)\n"
     "ที่ spread: MT·D1 / ST·D2 / H1·D3 / H2·D4 เหมือนเดิม ฝั่ง D กลุ่ม MT / ฝั่ง B กลุ่ม ST\n\n"
     "spread แล้วรูปปั้นฟันครึ่งสนามอีกครั้ง: หลบ",
     "After the half-room cleave gather north, within hitting range of the boss\n"
     "Take the stack as before, then the Vitrophyre holders spread (tanks/healers here)\n"
     "Spots: MT·D1 / ST·D2 / H1·D3 / H2·D4 as before, D side MT group / B side ST group\n\n"
     "After the spread the statue cleaves half the room again: dodge it",
     strict=["MT", "ST", "H1", "H2"], pic="p1-19", scene=S1.p1_19())

step(P1, "Double-trouble Trap", "Trap ②: Tank·Healer ตะวันตก / DPS ตะวันออก กระเด็นเข้าพื้นดำ", "Trap ②: tanks/healers west / DPS east, knocked into the puddles",
     "หลบครึ่งสนามแล้วต่อด้วย Trap: ส่ง debuff ต่อโดยแบ่ง Tank·Healer ตะวันตก / DPS ตะวันออก รับ stack + knockback\n"
     "ยืนตามภาพ (ภาพ: H1 กับ D3 ถือ debuff)\n"
     "ใช้ knockback นี้พาตัวไปเหยียบพื้นดำของ Gravitas: กลุ่ม Tank·Healer ไปพื้นดำทางเหนือ / กลุ่ม DPS ไปพื้นดำทางใต้",
     "Right after dodging the half-room cleave comes the Trap: pass the debuff with tanks/healers west / DPS east, taking the stack + knockback\n"
     "Stand as drawn (picture: H1 and D3 hold the debuff)\n"
     "Use the knockback to reach the Gravitas puddles: the tank/healer group to the north puddle / the DPS group to the south one",
     strict=False, pic="y014", scene=SY.y014(), plan=YAN)

step(P1, "Double-trouble Trap", "เหยียบพื้นดำ: Tank·Healer ทางเหนือ / DPS ทางใต้", "Puddle soak: tanks/healers north / DPS south",
     "กระเด็นแล้วเหยียบพื้นดำของ Gravitas: Tank·Healer 4 คนทางเหนือ / DPS 4 คนทางใต้\n"
     "คนที่ได้ debuff Trap ตามเข้าพื้นดำทีหลัง\n"
     "ตรงนี้ใช้ burst 2 นาที\n\n"
     "แล้ว Light of Judgment (raid-wide) → Hyperdrive ไม่มีร่าย (tank buster 3 ครั้ง)",
     "After the knockback step into the Gravitas puddles: the 4 tanks/healers north / the 4 DPS south\n"
     "Whoever got the Trap debuff follows into the puddle afterwards\n"
     "Use the 2-minute burst here\n\n"
     "Then Light of Judgment (raid-wide) → Hyperdrive without a cast (3 tank hits)",
     strict=True, pic="y015", scene=SY.y015(), plan=YAN,
     says={"MT": "พื้นดำทางเหนือ", "ST": "พื้นดำทางเหนือ", "H1": "พื้นดำทางเหนือ", "H2": "พื้นดำทางเหนือ",
           "D1": "พื้นดำทางใต้", "D2": "พื้นดำทางใต้", "D3": "พื้นดำทางใต้", "D4": "พื้นดำทางใต้"},
     says_en={"MT": "The north puddle", "ST": "The north puddle", "H1": "The north puddle", "H2": "The north puddle",
              "D1": "The south puddle", "D2": "The south puddle", "D3": "The south puddle", "D4": "The south puddle"},
     refs=[FR("puddles", CLEAR, 126, "พื้นดำของ Gravitas ไม่มีไฟฟ้าแล้ว: เข้าไปเหยียบรับ stack (ต้องทำเพื่อ flag เข้า P3)",
              "The Gravitas puddles no longer crackle: step in for the stack (needed for the P3 flag)")])

step(P1, "Double-trouble Trap", "Trap ②: แบ่งตก–ออก แล้วเดินไปเหยียบพื้นดำ", "Trap ②: west/east, then walk into the black puddles",
     "หลบครึ่งสนามแล้วต่อด้วย Trap ทันที\n"
     "แบ่งตะวันตก–ตะวันออกเหมือนครั้งแรก คนถือ debuff ยืนฝั่งนอก ทุกคนกระเด็นตรงๆ",
     "Right after dodging the half-room cleave comes the Trap\n"
     "Split west/east as the first time; the holders stand on the outside and everyone is knocked straight across",
     strict=False, pic="p1-20", scene=S1.p1_20(), plan=KAN)

step(P1, "Double-trouble Trap", "เหยียบพื้นดำ: Tank 2 คนทางเหนือ / อีก 6 คนทางใต้", "Puddle soak: 2 tanks north / the other 6 south",
     "โดนกระเด็นแล้วเดินไปที่พื้นดำของ Gravitas แล้วเหยียบรับ stack\n"
     "คนที่เพิ่งถือ debuff Trap รอสักจังหวะค่อยเดินไปจะพอดี\n"
     "Tank 2 คนแชร์พื้นดำทางเหนือ / อีก 6 คนเหยียบทางใต้\n"
     "Tank: Rampart + mitigate สั้นก็ดูเหลือ (อาจใช้แค่ mitigate สั้นได้ ขึ้นกับ mitigate ทั้งปาร์ตี้)\n\n"
     "แล้ว Hyperdrive อีกครั้ง (ไม่มีร่าย): รับด้วย mitigate",
     "After the knockback walk to the Gravitas puddles and step in to take the stack\n"
     "Whoever just held the Trap debuff should wait a beat before going\n"
     "The two tanks share the north puddle / the other 6 take the south one\n"
     "Tanks: Rampart + a short cooldown looks plenty (maybe just the short one, depending on party mitigation)\n\n"
     "Then Hyperdrive again (no cast): take it with mitigation",
     strict=["MT", "ST"], pic="p1-21", scene=S1.p1_21(), plan=KAN,
     says={"MT": "เหยียบพื้นดำทางเหนือกับ ST", "ST": "เหยียบพื้นดำทางเหนือกับ MT"},
     says_en={"MT": "The north puddle with ST", "ST": "The north puddle with MT"},
     refs=[FR("puddles", CLEAR, 126, "พื้นดำของ Gravitas ไม่มีไฟฟ้าแล้ว: เข้าไปเหยียบรับ stack (ต้องทำเพื่อ flag เข้า P3)",
              "The Gravitas puddles no longer crackle: step in for the stack (needed for the P3 flag)")])

step(P1, "Tele-trouncing", "Zubizuba Teleport: ลูกศร + สายนอนหลับ / สับสน", "Zubizuba Teleport: arrows + sleep / confusion tethers",
     "Kefka ร่าย Tele-trouncing: ทุกคนได้ debuff ลูกศรคนละ 2 อัน\n"
     "กลุ่มหนึ่ง 4 คน ได้ลูกศรทิศเดียวกัน 2 อัน (ทิศใดทิศหนึ่ง) / อีกกลุ่ม 4 คน ได้ลูกศร 2 อันไม่เหมือนกัน\n"
     "แบ่งกลุ่มตาม role: Tank·Healer กลุ่มหนึ่ง DPS อีกกลุ่ม\n\n"
     "debuff หมดเวลา: วางพื้นลูกศร (วงกลมมีลูกศรทิศเดียวกับ debuff) ตรงที่ยืน\n"
     "พื้นลูกศรวางใกล้กันเกินจะหายไปทั้งคู่\n"
     "คนเหยียบพื้นลูกศร: โดน bind แล้ววาร์ปไปตามทิศลูกศรระยะหนึ่ง\n\n"
     "วางครบแล้วรูปปั้นโยงสายทุกคน\n"
     "สายซ้ายบน 4 คน (role เดียวกัน): สักพักติด Confused วิ่งเร็วเข้าหาคนที่ใกล้ที่สุดแล้วตีตายในครั้งเดียว\n"
     "สายขวาล่าง 4 คน (role เดียวกัน): สักพักติด Sleep ขยับไม่ได้ ตอนหลับมี AoE วงกลมรอบตัว + debuff รับดาเมจเวทเพิ่ม 2 วิ: ซ้อนกัน = ตาย\n\n"
     "เป้าหมาย: ใช้พื้นลูกศรส่งคน Confused ออกไปไกลๆ ปกป้องคน Sleep\n"
     "ต้องใช้ลูกศรให้ครบทั้ง 16 อัน ไม่งั้นไม่ได้ flag เข้า P3",
     "Kefka casts Tele-trouncing: everyone gets two arrow debuffs\n"
     "One group of 4 gets the same arrow twice (one of four directions) / the other 4 get two different arrows\n"
     "The groups go by role: tanks/healers one, DPS the other\n\n"
     "When a debuff ends it leaves an arrow floor (a circle with that arrow) where you stand\n"
     "Arrow floors placed too close cancel each other out\n"
     "Stepping on one binds you and warps you a set distance in the arrow's direction\n\n"
     "Once all are placed the statue tethers everyone\n"
     "Upper-left lines, 4 of one role: later Confused, running fast at the nearest player and killing them in one hit\n"
     "Lower-right lines, 4 of one role: later Sleep, unable to act; as they fall asleep a circle hits each with a 2 s magic vulnerability: overlapping = death\n\n"
     "The idea: use the arrows to send the confused players far away and protect the sleepers\n"
     "All 16 arrows must be used, or there's no flag for P3",
     refs=[FR("arrows", CLEAR, 166, "Tele-trouncing: ได้ debuff ลูกศร 2 อัน หมดเวลาแล้ววางพื้นลูกศรตรงที่ยืน",
              "Tele-trouncing: two arrow debuffs; each leaves an arrow floor where you stand")])

step(P1, "Tele-trouncing", "วางพื้นลูกศรตามแบบ", "Place the arrows like this",
     "ได้ debuff แล้ววางลูกศรตามแบบในภาพ\n"
     "กรอบสีเดียวกัน = ลูกศร 2 อันของคนคนเดียว\n"
     "จำง่าย: ได้ขวา + ขึ้น = มุมตะวันออกเฉียงเหนือ / ได้ซ้าย + ลง = มุมตะวันตกเฉียงใต้\n\n"
     "ช่วงยังไม่ชิน: เปิดภาพนี้ไว้ดูได้เลย (จอที่สอง มือถือ อะไรก็ได้)\n"
     "kanatan ใช้ marker วางลูกศร แต่บอกว่าน่าจะเอาไปใช้ต่อไม่ได้ จึงไม่ได้ลงไว้",
     "Once you have the debuffs, place the arrows as drawn\n"
     "Same-colour box = one player's two arrows\n"
     "Easy to remember: right + up = the north-east corner / left + down = the south-west corner\n\n"
     "Until you're used to it, keep this picture open (a second screen, a phone, anything)\n"
     "kanatan's static placed extra markers for the arrows, but says that wouldn't help others, so it isn't shown",
     strict=False, pic="p1-25", scene=S1.p1_25())

step(P1, "Double-trouble Trap", "Trap ③: ตก / ออก แล้วระวังโดนกระเด็นไปโดนลูกศร", "Trap ③: west / east, and don't get knocked onto an arrow",
     "วางลูกศรเสร็จ ดูสาย แล้วทำ Trap: Tank·Healer ตะวันตก / DPS ตะวันออก เหมือนทุกครั้ง\n"
     "ครั้งนี้จากวางลูกศรอันที่ 2 ถึง Trap ลงมีแค่ 5 วิ: วางแล้วรีบไป stack ทันที (ใช้ Sprint ไว้ก่อนได้ ถ้าจะค้างถึงตอน Confused ให้ยกเลิกเอง)\n"
     "ระวัง: โดนกระเด็นเฉียงไปเหยียบลูกศร = ไม่ได้ flag: ยืนให้โดนกระเด็นตรงๆ กว่าทุกครั้ง",
     "With the arrows down, check your tether and do the Trap: tanks/healers west / DPS east, as every time\n"
     "This time there are only 5 s from your second arrow to the Trap: go to the stack right away (Sprint beforehand is fine; cancel it yourself if it would last into the confusion)\n"
     "Careful: a knockback at an angle onto an arrow loses the flag: line up for a straighter knockback than ever",
     strict=False, pic="p1-26", scene=S1.p1_26(),
     refs=[FR("trap3", CLEAR, 166, "Trap ③: มีเวลาแค่ 5 วิหลังวางลูกศร อย่าโดนกระเด็นไปเหยียบลูกศร",
              "Trap ③: only 5 s after the arrows; don't get knocked onto an arrow")])

step(P1, "Tele-trouncing", "ที่ยืน Sleep / Confused: Melee ด้านใน / Ranged ด้านนอก", "Sleep / Confused spots: melee inside / ranged outside",
     "โดนกระเด็นจาก Trap ③ แล้วเข้าที่\n"
     "ที่ยืนตายตัว ไม่ต้องดูสาย: Melee (MT ST D1 D2) ด้านใน / Ranged (H1 H2 D3 D4) ด้านนอก ระหว่างลูกศรของมุมตัวเอง\n"
     "Melee: MT ตะวันตกเฉียงเหนือ / ST ตะวันออกเฉียงเหนือ / D1 ตะวันตกเฉียงใต้ / D2 ตะวันออกเฉียงใต้\n"
     "Ranged: D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / H1 ตะวันตกเฉียงใต้ / H2 ตะวันออกเฉียงใต้\n"
     "Melee อยู่ด้านใน ทุกคนจึงตีบอสได้",
     "After Trap ③'s knockback go to your spot\n"
     "Fixed spots, no need to read the tethers: melee (MT ST D1 D2) inside / ranged (H1 H2 D3 D4) outside, between their corner's arrows\n"
     "Melee: MT north-west / ST north-east / D1 south-west / D2 south-east\n"
     "Ranged: D3 north-west / D4 north-east / H1 south-west / H2 south-east\n"
     "With the melee inside, everyone can keep hitting the boss",
     strict=True, pic="y019", scene=SY.y019(), plan=YAN,
     says={"MT": "ด้านใน มุมตะวันตกเฉียงเหนือ", "ST": "ด้านใน มุมตะวันออกเฉียงเหนือ", "D1": "ด้านใน มุมตะวันตกเฉียงใต้", "D2": "ด้านใน มุมตะวันออกเฉียงใต้",
           "D3": "ด้านนอก มุมตะวันตกเฉียงเหนือ", "D4": "ด้านนอก มุมตะวันออกเฉียงเหนือ", "H1": "ด้านนอก มุมตะวันตกเฉียงใต้", "H2": "ด้านนอก มุมตะวันออกเฉียงใต้"},
     says_en={"MT": "Inside, north-west corner", "ST": "Inside, north-east corner", "D1": "Inside, south-west corner", "D2": "Inside, south-east corner",
              "D3": "Outside, north-west corner", "D4": "Outside, north-east corner", "H1": "Outside, south-west corner", "H2": "Outside, south-east corner"},
     refs=[FR("sleep", CLEAR, 176, "สายจากรูปปั้น: ซ้ายบน = Confused วิ่งหาคนใกล้สุด / ขวาล่าง = Sleep + AoE วงกลม",
              "The statue's lines: upper left = Confused, runs at the nearest player / lower right = Sleep + a circle AoE")])

step(P1, "Tele-trouncing", "ที่ยืน Sleep / Confused", "Sleep / Confused spots",
     "โดนกระเด็นแล้วเข้าที่\n"
     "คน Confused (สายซ้ายบน) ไปยืนระหว่างลูกศรของทิศตัวเอง\n"
     "คน Sleep spread ระหว่างลูกศรของทิศตัวเอง ฝั่งใน (ภาพ: DPS เป็นคน Sleep อยู่ด้านใน)\n\n"
     "ถ้าสลับกัน (DPS เป็นคน Confused): MT↔D3 / ST↔D4 / H1↔D1 / H2↔D2 สลับที่กัน\n"
     "แค่นี้ก็โดนลูกศรพาไปเองตามที่ควร\n"
     "Melee ที่เป็นคน Confused อย่าตีบอสนาน: โดน AoE ของคน Sleep ตาย ไปเข้าที่เร็วๆ",
     "After the knockback go to your spot\n"
     "Confused players (upper-left line) stand between their own corner's arrows\n"
     "Sleepers spread between their corner's arrows, on the inner side (here the DPS sleep, inside)\n\n"
     "If it's the other way round (DPS confused): MT↔D3 / ST↔D4 / H1↔D1 / H2↔D2 swap\n"
     "That's enough for the arrows to carry everyone the right way\n"
     "A confused melee mustn't stay hitting the boss: the sleepers' circles will kill them; go early",
     strict=True, pic="p1-28", scene=S1.p1_28(), plan=KAN,
     says={"MT": "มุมตะวันตกเฉียงเหนือ (สลับกับ D3)", "D3": "มุมตะวันตกเฉียงเหนือ (สลับกับ MT)", "ST": "มุมตะวันออกเฉียงเหนือ (สลับกับ D4)",
           "D4": "มุมตะวันออกเฉียงเหนือ (สลับกับ ST)", "H1": "มุมตะวันตกเฉียงใต้ (สลับกับ D1)", "D1": "มุมตะวันตกเฉียงใต้ (สลับกับ H1)",
           "H2": "มุมตะวันออกเฉียงใต้ (สลับกับ D2)", "D2": "มุมตะวันออกเฉียงใต้ (สลับกับ H2)"},
     says_en={"MT": "North-west corner (swaps with D3)", "D3": "North-west corner (swaps with MT)", "ST": "North-east corner (swaps with D4)",
              "D4": "North-east corner (swaps with ST)", "H1": "South-west corner (swaps with D1)", "D1": "South-west corner (swaps with H1)",
              "H2": "South-east corner (swaps with D2)", "D2": "South-east corner (swaps with H2)"},
     refs=[FR("sleep", CLEAR, 176, "สายจากรูปปั้น: ซ้ายบน = Confused วิ่งหาคนใกล้สุด / ขวาล่าง = Sleep + AoE วงกลม",
              "The statue's lines: upper left = Confused, runs at the nearest player / lower right = Sleep + a circle AoE")])

step(P1, "Graven Image + Mystery Magic", "③ ตา + Thundaga + Firaga", "③ The eye + Thundaga + Firaga",
     "รูปปั้นทางเหนือเปิดตายักษ์\n"
     "ตาสีม่วง = ตอนหมดเวลาห้ามมองไปทางรูปปั้น / ตาสีเหลืองมี ? = ต้องมองรูปปั้น\n"
     "ตอนเป็นแบบต้องมอง เสียงจะดังเฉพาะตัวมาก ฟังก็รู้\n\n"
     "พร้อมกัน Mystery Magic: Thundaga + Firaga: เข้าหรือไม่เข้าเส้นตรง แล้ว stack หรือ spread\n"
     "ตาลงพร้อม Firaga (น่าจะ): มอง / ไม่มองตอน Firaga ลง\n"
     "ที่ยืน 2 แผนต่างกัน: ดูแท็บ\n\n"
     "จากนั้น auto-attack อีกหลายครั้งแล้วหมดเวลา: ถ้า HP บอสต่ำกว่า 15% เข้า P2",
     "The statue to the north opens a giant eye\n"
     "Purple eye = when it ends, don't look at the statue / yellow eye with ? = look at it\n"
     "The 'look' version has a very distinctive sound; you can tell by ear\n\n"
     "At the same time Mystery Magic: Thundaga + Firaga: in or out of the lines, then stack or spread\n"
     "The eye lands with Firaga (probably): look / don't look as Firaga lands\n"
     "The two plans stand differently: see the tabs\n\n"
     "Then a few auto-attacks and time runs out: below 15% boss HP the fight goes on to P2",
     refs=[FR("eye", CLEAR, 185, "ตายักษ์จากรูปปั้น: ม่วง = ห้ามมอง / เหลืองมี ? = ต้องมอง", "The statue's giant eye: purple = don't look / yellow with ? = look")])

step(P1, "Graven Image + Mystery Magic", "Firaga เป็น spread: Melee ที่ marker ตัวเลข / Ranged ที่ขอบ", "Firaga as spreads: melee on the number markers / ranged at the edge",
     "Melee: MT ที่ 4 / ST ที่ 3 / D1 ที่ 1 / D2 ที่ 2\n"
     "Ranged: H1 ใต้ / H2 ตะวันออก / D3 ตะวันตก / D4 เหนือ\n"
     "(ภาพวาง Ranged ไว้คนละ 2 จุด ข้างทิศของตัวเอง)",
     "Melee: MT at 4 / ST at 3 / D1 at 1 / D2 at 2\n"
     "Ranged: H1 south / H2 east / D3 west / D4 north\n"
     "(The picture gives each ranged two spots, either side of their direction)",
     strict=True, pic="y021", scene=SY.y021(), plan=YAN,
     says={"MT": "marker 4", "ST": "marker 3", "D1": "marker 1", "D2": "marker 2", "H1": "ขอบใต้", "H2": "ขอบตะวันออก", "D3": "ขอบตะวันตก", "D4": "ขอบเหนือ"},
     says_en={"MT": "Marker 4", "ST": "Marker 3", "D1": "Marker 1", "D2": "Marker 2", "H1": "South edge", "H2": "East edge", "D3": "West edge", "D4": "North edge"})

step(P1, "Graven Image + Mystery Magic", "Firaga เป็น stack: Tank·Healer ที่ 3 / DPS ที่ 1", "Firaga as stacks: tanks/healers at 3 / DPS at 1",
     "Tank·Healer stack ที่ marker 3 / DPS stack ที่ marker 1\n"
     "ระวัง: บางแบบตีบอสไม่ถึง",
     "Tanks/healers stack at marker 3 / DPS at marker 1\n"
     "Careful: some patterns leave you out of reach of the boss",
     strict=True, pic="y022", scene=SY.y022(), plan=YAN,
     says={"MT": "stack ที่ marker 3", "ST": "stack ที่ marker 3", "H1": "stack ที่ marker 3", "H2": "stack ที่ marker 3",
           "D1": "stack ที่ marker 1", "D2": "stack ที่ marker 1", "D3": "stack ที่ marker 1", "D4": "stack ที่ marker 1"},
     says_en={"MT": "Stack at marker 3", "ST": "Stack at marker 3", "H1": "Stack at marker 3", "H2": "Stack at marker 3",
              "D1": "Stack at marker 1", "D2": "Stack at marker 1", "D3": "Stack at marker 1", "D4": "Stack at marker 1"})

step(P1, "Graven Image + Mystery Magic", "ที่ยืน: ไม่ได้กำหนดตายตัว", "Spots: none fixed",
     "kanatan ไม่ได้ตั้งตำแหน่งตายตัว แนะนำแบบที่เห็นบ่อย: DPS ใต้ / Tank·Healer เหนือ\n"
     "ถ้าไม่มี VC คุยกัน ยึดตามที่ตกลงไว้ดีกว่า",
     "kanatan set no fixed spots; it suggests the common DPS south / tanks and healers north\n"
     "Without voice chat, stick to what you agreed",
     plan=KAN)

# ======================================================================================= P2
step(P2, "Ultimate Embrace", "tank buster แชร์ 2 คน", "Shared tank buster",
     "ท่าแรงใส่ aggro อันดับ 1 แบบ Tank 2 คนแชร์\n"
     "ใช้ mitigate แล้วรับ 2 คน",
     "A heavy hit on enmity #1, shared by the two tanks\n"
     "Both tanks take it together with mitigation",
     refs=[FR("embrace", CLEAR, 224, "Ultimate Embrace: Tank 2 คนแชร์ท่าแรง", "Ultimate Embrace: a heavy hit shared by both tanks")])

step(P2, "Forsaken", "ภาพรวม: Spells' Trouble + tower 8 รอบ", "Overview: Spells' Trouble + eight rounds of towers",
     "Mechanic ใหญ่กินเวลากว่า 90% ของ P2\n"
     "debuff + เข้า tower 8 รอบ / ตั้งแต่รอบ 2 มีล่อ Future's End / Past's End และ All Things Ending ของ Kefka ด้วย\n\n"
     "Kefka ร่าย Forsaken: tower 2 อันขึ้นมา และทุกคนได้ debuff Spells' Trouble 4 stack\n"
     "เข้า tower: การโจมตีตามสัญลักษณ์บนหัวจะออกจากตัวเรา แล้ว stack ลด 1\n"
     "สัญลักษณ์บนหัวหายไปสักพักก็มองไม่เห็น แต่ debuff จำไว้แล้ว เข้า tower เมื่อไรก็ออกตามนั้น\n"
     "stack ลดแล้วยังเหลือ: สัญลักษณ์ใหม่ขึ้นบนหัว\n\n"
     "จบ Forsaken บอสร่าย Light of Judgment: ใครยังเหลือ Spells' Trouble แม้ 1 stack = ตายทันที\n"
     "สรุป: เข้า tower ทำให้ Spells' Trouble ของทุกคนหมด ระหว่างทำอย่างอื่นไปด้วย",
     "The big mechanic, over 90% of P2\n"
     "Debuffs + towers, eight rounds / from round 2 Kefka's Future's End / Past's End and All Things Ending are baited too\n\n"
     "Kefka casts Forsaken: two towers appear and everyone gets Spells' Trouble at 4 stacks\n"
     "Soaking a tower fires the attack shown over your head from you, and a stack drops\n"
     "The overhead sign fades after a while, but the debuff remembers it and fires it whenever you soak\n"
     "If stacks remain, a new sign appears over your head\n\n"
     "At the end the boss casts Light of Judgment: anyone with even 1 stack left dies outright\n"
     "So: clear everyone's Spells' Trouble by soaking towers, while doing everything else")

step(P2, "Forsaken", "สัญลักษณ์ 3 แบบ + กติกา tower", "The three signs + the tower rules",
     "สัญลักษณ์มี 3 แบบ\n"
     "กรวย: ยิงกรวยไปที่คนที่ใกล้คนถือที่สุด 1 คน\n"
     "stack: วงกลมรอบคนถือ แชร์กัน 3 คน\n"
     "วงกลม: AoE วงกลมรอบคนถือ\n\n"
     "เริ่ม Forsaken ได้เสมอ: กรวย 3 / วงกลม 3 / stack 2\n"
     "กรวยลงใน role เดียวกันทั้ง 3 วงกลมก็เช่นกัน คนที่เหลือของแต่ละ role ได้ stack\n\n"
     "tower เข้า 2 คน ขึ้นครั้งละ 2 อัน ลงแล้วอันใหม่ขึ้น รวม 8 รอบ\n"
     "ไม่มีคนเข้า หรือเข้าคนเดียว = ระเบิด: ดาเมจทั้งปาร์ตี้ + ดาเมจที่ทำลด 90% ทุกคน (เท่ากับ wipe)\n\n"
     "เข้า tower แล้วสัญลักษณ์ใหม่ขึ้นตามรอบ\n"
     "รอบ 1 / 3 / 5: 4 คนที่เข้าได้ กรวย 2 + วงกลม 2\n"
     "รอบ 2 / 4 / 6: 4 คนที่เข้าได้ stack 2 + กรวย 1 + วงกลม 1\n"
     "รวมทั้งหมดมี stack 8 ครั้ง: ถ้าล้าง debuff ทุกคนให้หมดใน 4 รอบ รอบ 7 จะมี stack ขึ้น 4 อัน แก้ไม่ได้",
     "Three signs\n"
     "Cone: a cone at the player nearest the holder\n"
     "Stack: a circle on the holder, shared by 3\n"
     "Circle: a circle AoE on the holder\n\n"
     "Forsaken always starts with: 3 cones / 3 circles / 2 stacks\n"
     "The 3 cones go to one role group, the 3 circles to the other; the one left in each group gets a stack\n\n"
     "Towers take 2 players, two at a time; when they go off the next two appear, 8 rounds in all\n"
     "Nobody in it, or just one = explosion: raid damage + 90% damage down on everyone (a wipe)\n\n"
     "Soaking gives new signs by round\n"
     "Rounds 1 / 3 / 5: the 4 soakers get 2 cones + 2 circles\n"
     "Rounds 2 / 4 / 6: the 4 soakers get 2 stacks + 1 cone + 1 circle\n"
     "There are 8 stacks in all: clearing everyone within 4 rounds makes 4 stacks appear in round 7, which can't be done")

step(P2, "Forsaken", "Future's End / Past's End + All Things Ending", "Future's End / Past's End + All Things Ending",
     "ตอนเข้า tower รอบ 2 บอสร่าย Future's End หรือ Past's End\n"
     "AoE วงกลมใส่ 4 คนที่ใกล้ Kefka ที่สุด ลงพร้อม tower + Spells' Trouble\n"
     "คนถือกรวยกับคนว่าง (ไม่มีหน้าที่) ไม่โดนดาเมจจากตัวเอง: 4 คนนี้เป็นคนล่อ\n\n"
     "พร้อมกันมีร่างแยก 3 ตัวโผล่ สักพัก Kefka + ร่างแยก 3 ตัวร่าย All Things Ending\n"
     "เริ่มร่าย บอสหันไปหาคนแบบสุ่ม: ร่าย Future มาก่อน = ฟันครึ่งหน้า / Past มาก่อน = ฟันครึ่งหลัง\n"
     "ตอนนั้น tower รอบ 3 ขึ้นแล้ว และ All Things Ending ลงพร้อม tower รอบ 3\n"
     "ทุกคนจึงต้องไปรวมกันระหว่าง tower หรือฝั่งตรงข้าม เพื่อล่อให้ไม่ฟันโดนที่ทำ tower\n\n"
     "ชุดนี้วนไปตลอดหลังรอบ 2\n"
     "รอบ 1: เข้า tower ตามกติกา\n"
     "รอบคู่ (2 4 6 8): รับ Future / Past + เข้า tower + ปล่อย debuff\n"
     "รอบคี่ (3 5 7): ล่อ All Things Ending ไม่ให้โดน tower ก่อน แล้วรีบไปที่ tower\n"
     "ระหว่างนี้คนเข้า tower กับคนอยู่นอก tower สลับกันบางช่วง ตามจำนวน stack ที่เหลือ",
     "As the round-2 towers are soaked the boss casts Future's End or Past's End\n"
     "A circle on the 4 players nearest Kefka, landing with the towers + Spells' Trouble\n"
     "Cone holders and idle players take no damage from themselves: those 4 bait it\n\n"
     "Three clones appear with it; later Kefka + the 3 clones cast All Things Ending\n"
     "At the cast they turn to a random player: Future before = front half / Past before = back half\n"
     "The round-3 towers are already up, and All Things Ending lands with them\n"
     "So everyone gathers between the towers or on the opposite side, baiting it away from the towers\n\n"
     "This repeats from round 2 on\n"
     "Round 1: soak by the rules\n"
     "Even rounds (2 4 6 8): take Future / Past + soak + fire the debuffs\n"
     "Odd rounds (3 5 7): bait All Things Ending clear of the towers first, then hurry to the towers\n"
     "Soakers and idle players swap now and then, by the stacks left",
     refs=[FR("future-past", CLEAR, 259, "Future's End / Past's End: วงกลมใส่ 4 คนที่ใกล้ Kefka ที่สุด + ร่างแยก 3 ตัว",
              "Future's End / Past's End: circles on the 4 nearest Kefka + three clones"),
           FR("all-things", CLEAR, 271, "All Things Ending: Kefka + ร่างแยก หันหาคนสุ่มแล้วฟันครึ่งหน้า / หลัง",
              "All Things Ending: Kefka and clones turn to a random player and cleave front / back")])

step(P2, "Forsaken", "กติกา: คู่ตายตัว + ลำดับความสำคัญ", "The rules: fixed pairs + priority",
     "แบบลำดับความสำคัญ + ที่ยืนแบบ Pylene: ตั้งให้ H1 H2 D3 D4 ทำง่าย เพราะช่วงนี้ Healer heal หนักมาก\n"
     "ยากสุดของท่านี้คือทุกคนยืนตรงกันเป๊ะ\n\n"
     "คู่ตายตัว: MT·H1 / ST·H2 / D1·D3 / D2·D4 (ก่อน Forsaken แยก Tank·Healer ตะวันตก / DPS ตะวันออก ไว้ จะดูง่าย)\n"
     "คู่ที่มีคนได้ stack: เข้า tower รอบ 1 2 3 8 / อีก 2 คู่: รอบ 4 5 6 7\n"
     "รอบคี่: ล่างของ tower ซ้าย = กรวย / ล่างของ tower ขวา = วงกลม / คนถือ stack 2 คนแบ่งตามลำดับ Healer > Tank > Melee > Ranged\n"
     "รอบคู่: เรียงจากซ้ายตามลำดับ Healer > Tank > Melee > Ranged\n"
     "คู่ที่ไม่ได้เข้า tower ยืนที่ตายตัว: ซ้าย Tank·Healer / ขวา DPS\n"
     "ล่อร่าง Future / Past: คนถือกรวย 2 คน + Melee 2 คน\n\n"
     "หลังเข้า tower รอบ 3 ดู debuff ตัวเอง: ได้วงกลม → /mk stop <me> / ได้กรวย → /mk bind <me> (ดู macro)\n"
     "tower รอบ 8 ใช้เลขของ marker นี้: เลข 1 ซ้าย / เลข 2 ขวา",
     "Priority + Pylene's spots: built to make it easy for H1 H2 D3 D4, since healing here is very heavy\n"
     "The hardest part is everyone standing on exactly the same spots\n\n"
     "Fixed pairs: MT·H1 / ST·H2 / D1·D3 / D2·D4 (split tanks/healers west / DPS east before Forsaken; it's easier to read)\n"
     "The pairs with a stack: towers 1 2 3 8 / the other two pairs: 4 5 6 7\n"
     "Odd rounds: the left tower's lower spot = cone / the right tower's = circle / the two stacks split by healer > tank > melee > ranged\n"
     "Even rounds: from the left by healer > tank > melee > ranged\n"
     "The pairs not soaking stand on fixed spots: left tanks/healers / right DPS\n"
     "Future / Past clones are baited by the 2 cone holders + 2 melee\n\n"
     "After round 3 check your debuff: a circle → /mk stop <me> / a cone → /mk bind <me> (see the macro)\n"
     "Round 8 goes by these markers' numbers: 1 left / 2 right",
     plan=YAN)

step(P2, "Forsaken", "8 รอบ: ใครอยู่ตรงไหน (ตัวอย่าง)", "All 8 rounds: who stands where (an example)",
     "ตัวอย่างจากภาพของ yan-flash: คู่ MT·H1 กับ D2·D4 ได้ stack (เข้ารอบ 1 2 3 8)\n"
     "ป้ายแต่ละมุม = สัญลักษณ์ตอนนี้ → สัญลักษณ์ที่ได้หลังเข้า tower\n"
     "B1 B2 S1 S2 = marker bind / stop ที่ติดเองหลังรอบ 3\n"
     "ระหว่างรอบคี่ → คู่: ล่อ Future / Past / ระหว่างรอบคู่ → คี่: ล่อ All Things Ending",
     "An example from yan-flash's picture: the MT·H1 and D2·D4 pairs have the stacks (rounds 1 2 3 8)\n"
     "Each corner tag = the sign now → the sign after soaking\n"
     "B1 B2 S1 S2 = the bind / stop markers put on after round 3\n"
     "Between an odd and an even round: bait Future / Past / between an even and an odd: bait All Things Ending",
     strict=False, pic="y023", scene=SY.y023(), plan=YAN)

step(P2, "Forsaken", "รอบคี่: ที่ยืนละเอียด", "Odd rounds: exact spots",
     "tower 2 อันอยู่ใต้ Kefka: จุดแดง = 4 คนที่เข้า tower / จุดฟ้า = คนอื่น (ภาพ 8 รอบใช้ที่ยืนชุดนี้)\n\n"
     "มีรายงานว่าคนถือ stack ที่ tower ขวาโดน All Things Ending เฉพาะรอบคี่: ยืนด้านขวาของส่วนที่วงทับกัน (รูปลูกรักบี้) จะนิ่ง\n"
     "ล่อ All Things Ending: ยืนชิดวงเป้าบอสเกินไปมุมจะเอียงง่าย / ห่างออกมาสุดระยะ Melee ล่อมุมได้ง่ายกว่า",
     "The two towers south of Kefka: red = the 4 soaking / cyan = the others (the 8-round picture uses these spots)\n\n"
     "Some report the right tower's stack holder being hit by All Things Ending in odd rounds only: standing on the right of the overlap (the 'rugby ball') is steady\n"
     "Baiting All Things Ending: too close to the boss's target circle tilts the angle / at max melee range it's easier to aim",
     strict=False, pic="y024", scene=SY.y024(), plan=YAN)

step(P2, "Forsaken", "รอบคู่: ที่ยืนละเอียด", "Even rounds: exact spots",
     "จุดแดง = 4 คนที่เข้า tower: บน = คนถือกรวย / ล่าง = คนถือวงกลม\n"
     "จุดฟ้าบน 2 จุด = Melee ของคู่ที่ไม่ได้เข้า tower: ล่อ Future / Past ร่วมกับคนถือกรวย\n"
     "จุดฟ้าข้าง 2 จุด = อีก 2 คน: ซ้าย Tank·Healer / ขวา DPS",
     "Red = the 4 soaking: top = cone holders / bottom = circle holders\n"
     "The two upper cyan = the melee of the pairs not soaking: they bait Future / Past with the cone holders\n"
     "The two side cyan = the other two: left tank/healer / right DPS",
     strict=False, pic="y025", scene=SY.y025(), plan=YAN)

step(P2, "Forsaken", "Future's End / Past's End: รอตรงไหน", "Future's End / Past's End: where to wait",
     "Past's End: ลงแล้วรอระหว่าง tower จน All Things Ending เริ่มร่าย\n"
     "Future's End: ลงแล้วรอฝั่งตรงข้าม tower พอเห็นร่าย All Things Ending วิ่งเข้าฝั่ง tower\n"
     "Future / Past ครั้งที่ 4: รวมที่ A แล้วหลบ All Things Ending ตามที่ออก",
     "Past's End: once it lands, wait between the towers until All Things Ending starts casting\n"
     "Future's End: once it lands, wait opposite the towers; when you see All Things Ending's cast, run to the tower side\n"
     "The 4th Future / Past: gather at A and dodge All Things Ending as it comes",
     plan=YAN)

step(P2, "Forsaken", "① เรียงแถวตาม role (ลำดับความสำคัญ)", "① Line up by role (priority)",
     "Forsaken ลง: เรียงแถวตาม role\n"
     "แถวนี้คือลำดับความสำคัญ เรียงให้ดูง่าย\n"
     "มาก > น้อย: H1 > MT > ST > H2\n"
     "มาก > น้อย: D1 > D2 > D3 > D4",
     "When Forsaken lands, line up by role\n"
     "The line is the priority order, laid out to be easy to read\n"
     "High > low: H1 > MT > ST > H2\n"
     "High > low: D1 > D2 > D3 > D4",
     strict=True, pic="p2-08", scene=S2.p2_08(), plan=KAN)

step(P2, "Forsaken", "② ดูสัญลักษณ์บนหัว: กรวย หรือ วงกลม", "② Check your sign: cone or circle",
     "ดูบนหัวว่าได้กรวยหรือวงกลม (ภาพ: Tank·Healer ได้กรวย / DPS ได้วงกลม / H1 กับ D1 ได้ stack)\n"
     "แผนของ kanatan กำหนดลำดับความสำคัญในที่ยืน: เข้าที่ตามลำดับ\n\n"
     "tower: รอบ 1 2 3 8 ทีมหนึ่ง / รอบ 4 5 6 7 อีกทีม\n"
     "ฝั่งลำดับสูงได้ที่ยืนเริ่มจากลำดับ 1 / ฝั่งลำดับต่ำเริ่มจากลำดับ 3",
     "Check over your head: cone or circle (here tanks/healers have cones / DPS circles / H1 and D1 stacks)\n"
     "kanatan's plan ties each spot to a priority: go to yours by the order\n\n"
     "Towers: rounds 1 2 3 8 one team / rounds 4 5 6 7 the other\n"
     "The higher-priority side takes spots from priority 1, the lower side from priority 3",
     strict=True, pic="p2-09", scene=S2.p2_09(), plan=KAN)

step(P2, "Forsaken", "③ รอบคี่: tower ซ้ายกรวย / tower ขวาวงกลม", "③ Odd rounds: left tower cones / right tower circles",
     "ทุกรอบคี่ยืนแบบนี้: tower ซ้ายของคนถือกรวย / tower ขวาของคนถือวงกลม (มองจากกลางสนาม)\n\n"
     "คนถือ stack: ขอบ tower ด้าน 12 นาฬิกา (นับจากกลางสนาม)\n"
     "คนเข้า stack: ไม่เข้า tower แต่ยืนเกือบซ้อนกับคนถือ stack\n"
     "คนปล่อยกรวย (ลำดับ 2 ของคนถือกรวย): ราว 9:30 ของ tower / พอคล่องแล้วยืนลึกเข้าไปใน tower ดีกว่าขอบ จะโดน All Things Ending ยากขึ้น\n"
     "คนรับกรวย: ราว 8:30 ของ tower อยู่นอก tower ชิดขอบ\n"
     "คนปล่อยวงกลม: 6 นาฬิกาของ tower ในวง\n\n"
     "คนว่างตั้งแต่รอบ 3\n"
     "DPS 2 คน → เข้า stack ฝั่งขวา\n"
     "Tank·Healer ลำดับสูง → เข้า stack ฝั่งซ้าย\n"
     "Tank·Healer ลำดับต่ำ → รับกรวยฝั่งซ้าย",
     "Every odd round looks like this: the left tower for cone holders / the right one for circle holders (seen from the middle)\n\n"
     "Stack holder: the tower's 12 o'clock edge (counted from the arena centre)\n"
     "Stack takers: not in the tower, almost on top of the stack holder\n"
     "Cone out (cone holder with priority 2): about 9:30 on the tower / once comfortable, stand deeper inside rather than on the edge; All Things Ending hits less\n"
     "Cone taker: about 8:30, outside the tower on its rim\n"
     "Circle out: the tower's 6 o'clock, inside\n\n"
     "Idle players from round 3\n"
     "2 DPS → into the right stack\n"
     "Higher-priority tank/healer → into the left stack\n"
     "Lower-priority tank/healer → takes the left cone",
     strict=False, pic="p2-10", scene=S2.p2_10(), plan=KAN)

step(P2, "Forsaken", "④ รอบคู่: ปล่อยกรวย / รับกรวย / ล่อ Future / Past", "④ Even rounds: cone out / cone takers / Future-Past baiters",
     "ยืนแบบนี้ทุกรอบคู่\n"
     "คนปล่อยกรวย: ขอบ tower ราว 11:30 / 12:30\n"
     "คนรับกรวย: 9 นาฬิกาของ tower อยู่นอก tower ห่างออกมา 1 ก้าว\n"
     "คนปล่อยวงกลม: 6 นาฬิกาของ tower\n"
     "คนล่อ: ยืนบนวงเป้าของ Kefka ตรงข้ามแนว tower ตามลำดับความสำคัญ\n\n"
     "เข้า tower ใช้แบบปรับฝั่งใต้: ใน tower ไม่มี debuff ซ้ำกัน = ทำใน tower เดิม / ซ้ำกัน = คนฝั่งใต้ไปเข้าอีก tower\n"
     "คนว่าง: คนล่อ Future / Past คือ DPS ตายตัว / คนรับกรวย 2 คนคือ Tank·Healer ตายตัว\n"
     "หันจาก tower ไปหา Kefka: ซ้าย = ลำดับสูง / ขวา = ลำดับต่ำ\n"
     "รอบ 4 ที่คนเข้า tower กับคนว่างสลับกัน: tower ซ้าย = ลำดับสูง ขวา = ลำดับต่ำ ตามที่เรียงแถวตอนแรก",
     "Every even round looks like this\n"
     "Cone out: the tower's rim at about 11:30 / 12:30\n"
     "Cone takers: the tower's 9 o'clock, outside, one step off it\n"
     "Circle out: the tower's 6 o'clock\n"
     "Baiters: on Kefka's target circle, diagonal from the towers, by priority\n\n"
     "Towers use a south adjust: no repeated debuff inside your tower = resolve it there / a repeat = the southern one goes to the other tower\n"
     "Idle players: the Future / Past baiters are always DPS / the two cone takers always tanks/healers\n"
     "Facing Kefka from the towers: left = higher priority / right = lower\n"
     "In round 4, where soakers and idlers swap, soakers take left tower = higher / right = lower, by the first line-up",
     strict=False, pic="p2-11", scene=S2.p2_11(), plan=KAN)

step(P2, "Forsaken", "⑤ ล่อ All Things Ending ระหว่าง tower", "⑤ Bait All Things Ending between the towers",
     "จบรอบ 2 แล้วล่อ All Things Ending: ที่ยืนนับจาก tower ใหม่\n"
     "รีบไปรวมกันระหว่าง tower หรือฝั่งตรงข้ามของระหว่าง tower\n"
     "ยืนนอกวงเป้าของ Kefka เสมอ: ยิ่งใกล้ Kefka การฟันยิ่งเอียง แล้วจะไปโดนคนปล่อยกรวยในรอบคี่ถัดไป\n\n"
     "จากนี้วนรอบคี่ / คู่ไปเรื่อยๆ: อย่าลืมสลับตอนรอบ 4 และรอบ 8\n"
     "ที่ยืนแบบ 'ราวๆ กี่นาฬิกา' ต้องเป๊ะ: ไม่งั้นโดน All Things Ending / Future-Past หรือกรวยไปผิดคน",
     "After round 2, bait All Things Ending: the spots count from the new towers\n"
     "Hurry between the towers or to the opposite side of that gap\n"
     "Always outside Kefka's target circle: the closer to Kefka, the more the cleave tilts and hits the cone out in the next odd round\n\n"
     "From here odd and even rounds repeat: don't forget the swaps in rounds 4 and 8\n"
     "The 'about this o'clock' spots must be exact, or All Things Ending / Future-Past hits someone, or a cone goes to the wrong player",
     strict=False, pic="p2-12", scene=S2.p2_12(), plan=KAN)

step(P2, "Trine", "Trine + Wings of Destruction", "Trine + Wings of Destruction",
     "สามเหลี่ยมตกลงมาใน 7 จุด (ขอบสนาม 6 + กลาง 1) 3 ครั้ง\n"
     "ครั้ง 1: ขอบ 3 จุด / ครั้ง 2: ขอบ 1 จุด / ครั้ง 3: กลาง + ขอบที่เหลือ 2 จุด\n"
     "สามเหลี่ยมระเบิดตามลำดับที่ตก: AoE วงกลมที่มุมทั้ง 3\n\n"
     "ระหว่างนั้นบอสร่าย Wings of Destruction: ฟันครึ่งสนาม ฝั่งปีกที่ไม่เรืองแสงปลอดภัย\n"
     "พอสามเหลี่ยมชุดแรกระเบิด บอสร่าย Wings of Destruction อีกครั้ง: ท่าแรงใส่คนไกลบอสที่สุด 1 + ใกล้ที่สุด 1 ลงราวๆ พร้อมระเบิดชุด 3\n"
     "Tank 2 คนใช้ mitigate รับคนละอัน / กลางระเบิดชุด 3 เสมอ\n"
     "ที่ยืน 2 แผนต่างกัน: ดูแท็บ\n\n"
     "จากนั้น Ultimate Embrace แล้วหมดเวลา\n"
     "ต้องลด HP บอสลงถึง 0.1 และมี flag จาก P1 จึงเข้า P3",
     "Triangles drop on 7 spots (6 at the edge + the middle), three times\n"
     "Drop 1: 3 edge spots / drop 2: 1 edge spot / drop 3: the middle + the last 2 edge spots\n"
     "They explode in drop order: a circle at each corner\n\n"
     "Meanwhile the boss casts Wings of Destruction: a half-room cleave; the unlit wing's side is safe\n"
     "Around the first explosions it casts Wings of Destruction again: heavy hits on the farthest and nearest player, landing with the third explosions\n"
     "The tanks take one each with mitigation / the middle always explodes third\n"
     "The two plans stand differently: see the tabs\n\n"
     "Then Ultimate Embrace and time is up\n"
     "Boss to 0.1 + the P1 flag = on to P3",
     refs=[FR("trine", CLEAR, 361, "Trine: สามเหลี่ยมตกลงมา ระเบิดที่มุมทั้ง 3 ตามลำดับ", "Trine: triangles drop and explode at their corners in order")])

step(P2, "Trine", "สามเหลี่ยม 1: Healer·DPS ตามเข็มจาก A / Tank ทวนเข็มจากตะวันตกเฉียงเหนือ", "A '1' triangle: healers/DPS clockwise from A / tanks counter-clockwise from NW",
     "ดูสามเหลี่ยมที่ตกชุดแรก (เลข 1 ในภาพ) แล้วเข้าไปอยู่ในนั้น ระหว่างทางหลบ Wings of Destruction ที่ฟันครึ่งสนาม\n"
     "Wings รอบ 2 ยิงคนใกล้สุดกับไกลสุด: Tank กับคนอื่นแยกกันเข้าสามเหลี่ยม 1 คนละอัน\n"
     "Healer·DPS: นับตามเข็มจาก A (เหนือ) สามเหลี่ยม 1 อันแรก\n"
     "Tank: นับทวนเข็มจากตะวันตกเฉียงเหนือ สามเหลี่ยม 1 อันแรก\n\n"
     "MT เข้าใกล้บอส ระวังระเบิดของสามเหลี่ยม / ST ขอบนอกสุดเสมอ / Healer·DPS ค่อนไปขอบนอก แต่ไม่ถึงขอบสุด",
     "Watch the first drop (the 1s here) and get into one; on the way dodge Wings of Destruction's half-room cleave\n"
     "The second Wings hits the nearest and farthest: tanks and everyone else take different '1' triangles\n"
     "Healers/DPS: the first '1' clockwise from A (north)\n"
     "Tanks: the first '1' counter-clockwise from the north-west\n\n"
     "MT closes in on the boss, minding the triangles' blasts / ST always at the very edge / healers/DPS near the edge but not on it",
     strict=False, pic="y034", scene=SY.y034(), plan=YAN,
     says={"MT": "สามเหลี่ยม 1 ของ Tank: เข้าใกล้บอส", "ST": "สามเหลี่ยม 1 ของ Tank: ขอบนอกสุด"},
     says_en={"MT": "The tanks' '1': close to the boss", "ST": "The tanks' '1': the very edge"})

step(P2, "Trine", "ตัวอย่าง 2", "Example 2",
     "อีกแบบ ใช้กติกาเดียวกัน",
     "Another pattern, same rule",
     strict=False, pic="y035", scene=SY.y035(), plan=YAN)

step(P2, "Trine", "ตัวอย่าง 3: Tank ไปทางใต้", "Example 3: the tanks go south",
     "แบบนี้นับทวนเข็มจากตะวันตกเฉียงเหนือแล้ว สามเหลี่ยม 1 อันแรกของ Tank อยู่ทางใต้ / Healer·DPS ได้อันทางตะวันออก\n"
     "yan-flash ปรับกติกานี้เมื่อ 19 พ.ย.: ตัวอย่าง 1–2 ที่ยืนเหมือนเดิม สลับกันแค่แบบนี้",
     "Here the tanks' first '1' counter-clockwise from the north-west is to the south / healers/DPS get the east one\n"
     "yan-flash changed the rule on 19 Nov: examples 1–2 stand as before; only this kind swaps",
     strict=False, pic="y036", scene=SY.y036(), plan=YAN)

step(P2, "Trine", "Tank เรียกจุด + ST ขอบนอก", "Tanks call the spot + ST at the edge",
     "รอที่กลางก่อน\n"
     "Tank บอกจุดที่จะใช้ จากจุดที่ระเบิดชุดแรก / ไม่มี VC: จุดแรกนับตามเข็มจาก A คือที่ของ Tank คนอื่นหลบที่อื่น\n"
     "ST ไปไกลสุดชิดขอบเสมอ / คนอื่นเชื่อ ST ยืนในที่ปลอดภัย ห่างขอบเข้ามานิดหน่อย\n"
     "MT เข้าใกล้บอสที่สุดเท่าที่ทำได้ (แผนนี้ไม่ใช้ขอบสามเหลี่ยม Tank เข้าได้จำกัด) คนอื่นอย่าเข้าใกล้บอส",
     "Wait in the middle first\n"
     "Tanks call their spot among the first explosions / no voice chat: the first clockwise from A is theirs; others dodge elsewhere\n"
     "ST always goes to the very edge / everyone else trusts ST and stands in the safe area just inside the edge\n"
     "MT gets as close to the boss as possible (the plan doesn't use the triangles' edges, so only so close); others keep away from the boss",
     plan=KAN,
     says={"MT": "เข้าใกล้บอสที่สุดเท่าที่ทำได้ รับ Wings ใกล้สุด", "ST": "ไปไกลบอสที่สุด ชิดขอบ รับ Wings ไกลสุด"},
     says_en={"MT": "Get as close to the boss as you can; take the near Wings", "ST": "Go as far from the boss as you can, at the edge; take the far Wings"})

# ======================================================================================= P3
step(P3, "The Decisive Battle", "The Decisive Battle: α / β", "The Decisive Battle: α / β",
     "Chaos ตะวันตก / Exdeath ตะวันออก ร่าย The Decisive Battle\n"
     "ร่ายเสร็จได้ debuff α หรือ β: α ตีได้แค่ Chaos / β ตีได้แค่ Exdeath\n"
     "อยู่ใกล้ Chaos ได้ α / ใกล้ Exdeath ได้ β (จริงๆ ไม่ตรงซะทีเดียว แต่คิดแบบนี้ได้)\n"
     "The Decisive Battle มา 2 ครั้ง: ตอนเริ่ม และหลัง Ultima Blaster (กลุ่มเดิม)\n"
     "แบ่งกลุ่ม 2 แผนต่างกัน: ดูแท็บ",
     "Chaos (west) and Exdeath (east) cast The Decisive Battle\n"
     "When it ends you get α or β: α can only hit Chaos / β only Exdeath\n"
     "Close to Chaos gets α / close to Exdeath gets β (not exactly, but fine to think of it so)\n"
     "The Decisive Battle comes twice: at the start and after Ultima Blaster (same groups)\n"
     "The two plans split the groups differently: see the tabs",
     refs=[FR("decisive", CLEAR, 432, "The Decisive Battle: Chaos ตะวันตก / Exdeath ตะวันออก ได้ α / β ตามบอสที่อยู่ใกล้",
              "The Decisive Battle: Chaos west / Exdeath east; α / β by the boss you are near")])

step(P3, "The Decisive Battle", "กลุ่ม Chaos: ST H2 D1 D2 / กลุ่ม Exdeath: MT H1 D3 D4", "Chaos group: ST H2 D1 D2 / Exdeath group: MT H1 D3 D4",
     "กลุ่ม Chaos: ST H2 D1 D2\n"
     "กลุ่ม Exdeath: MT H1 D3 D4\n"
     "แบ่งแบบนี้เพราะเรื่อง invuln ของ Tank\n"
     "debuff แบ่งกลุ่มลงตามคนที่อยู่ใกล้บอสก่อน",
     "Chaos group: ST H2 D1 D2\n"
     "Exdeath group: MT H1 D3 D4\n"
     "Split this way because of the tanks' invulns\n"
     "The group debuffs go to whoever is nearest the bosses first",
     plan=YAN,
     says={"ST": "กลุ่ม Chaos", "H2": "กลุ่ม Chaos", "D1": "กลุ่ม Chaos", "D2": "กลุ่ม Chaos",
           "MT": "กลุ่ม Exdeath", "H1": "กลุ่ม Exdeath", "D3": "กลุ่ม Exdeath", "D4": "กลุ่ม Exdeath"},
     says_en={"ST": "Chaos group", "H2": "Chaos group", "D1": "Chaos group", "D2": "Chaos group",
              "MT": "Exdeath group", "H1": "Exdeath group", "D3": "Exdeath group", "D4": "Exdeath group"})

step(P3, "The Decisive Battle", "กลุ่ม Chaos: MT H1 D1 D2 / กลุ่ม Exdeath: ST H2 D3 D4", "Chaos group: MT H1 D1 D2 / Exdeath group: ST H2 D3 D4",
     "กลุ่ม Chaos: MT H1 D1 D2\n"
     "กลุ่ม Exdeath: ST H2 D3 D4",
     "Chaos group: MT H1 D1 D2\n"
     "Exdeath group: ST H2 D3 D4",
     plan=KAN,
     says={"MT": "กลุ่ม Chaos", "H1": "กลุ่ม Chaos", "D1": "กลุ่ม Chaos", "D2": "กลุ่ม Chaos",
           "ST": "กลุ่ม Exdeath", "H2": "กลุ่ม Exdeath", "D3": "กลุ่ม Exdeath", "D4": "กลุ่ม Exdeath"},
     says_en={"MT": "Chaos group", "H1": "Chaos group", "D1": "Chaos group", "D2": "Chaos group",
              "ST": "Exdeath group", "H2": "Exdeath group", "D3": "Exdeath group", "D4": "Exdeath group"})

step(P3, "Bowels of Agony", "debuff ไฟ / น้ำ + คริสตัล", "Fire / water debuffs + the crystals",
     "Chaos ร่าย Bowels of Agony: raid-wide + debuff ทุกคน\n\n"
     "ไฟ (Entropy): หมดเวลา AoE วงกลมเล็กรอบคนถือ + รับดาเมจเวทเพิ่ม 4 วิ / DPS 1 + Tank·Healer 1 / 46 วิ หรือ 19 วิ (ไฟ 2 คนเวลาเท่ากัน)\n"
     "ลงแล้วคริสตัลไฟทำงาน: donut ที่ 2 คนใกล้คริสตัลที่สุด\n"
     "น้ำ (Dynamic Fluid): หมดเวลา donut รอบคนถือ + รับดาเมจเวทเพิ่ม 4 วิ / DPS 1 + Tank·Healer 1 / 46 หรือ 19 วิ\n"
     "ลงแล้วคริสตัลน้ำทำงาน: วงกลมเล็กที่ 2 คนใกล้คริสตัลที่สุด\n"
     "ไฟกับน้ำแบ่งเป็นชุดเร็ว / ชุดช้า",
     "Chaos casts Bowels of Agony: raid damage + debuffs on everyone\n\n"
     "Fire (Entropy): at the end a small circle on the holder + a 4 s magic vulnerability / 1 DPS + 1 tank/healer / 46 s or 19 s (the two fires match)\n"
     "Then the fire crystal fires: a donut on the 2 players nearest it\n"
     "Water (Dynamic Fluid): at the end a donut on the holder + a 4 s magic vulnerability / 1 DPS + 1 tank/healer / 46 or 19 s\n"
     "Then the water crystal fires: a small circle on the 2 players nearest it\n"
     "Fire and water split into an early and a late set",
     refs=[FR("crystals", CLEAR, 459, "Bowels of Agony: คริสตัล 3 ธาตุโผล่ที่มุม marker ตัวเลข", "Bowels of Agony: the three element crystals at the number-marker corners")])

step(P3, "Bowels of Agony", "debuff ลม", "The wind debuff",
     "ลม (Headwind / Tailwind): ทุกคนได้ 1 ใน 2 แบบ ราว 70 วิ\n"
     "ล้างได้ด้วยการโดนการโจมตีจากทิศที่ถูก: ทิศถูก = กระเด็นครึ่งเดียว + ล้าง / ทิศผิด = กระเด็น 2 เท่า\n"
     "ล้างไม่ทันหมดเวลา = Cyclone ตายทันที\n"
     "ล้างแล้วคริสตัลลมทำงาน: stack 2 คนที่ 1 คนใกล้คริสตัลที่สุด + ลมรับเพิ่ม 2 วิ\n"
     "ล้างได้เฉพาะ: วงกลม / donut จากคริสตัลไฟ-น้ำ และ Vacuum Wave ของ Exdeath อย่างอื่นล้างไม่ได้\n"
     "ไอคอน: คนล้ม = รับด้านหน้า / คนยื่นก้น = รับด้านหลัง (ตายก็ล้างได้ ศพปลิวไปเลย)",
     "Wind (Headwind / Tailwind): everyone gets one of the two, about 70 s\n"
     "Cleansed by being hit from the right direction: right = half the knockback + cleansed / wrong = double knockback\n"
     "Not cleansed in time = Cyclone, instant death\n"
     "Each cleanse fires the wind crystal: a 2-person stack on the player nearest it + a 2 s wind vulnerability\n"
     "Only the fire/water crystals' circles/donuts and Exdeath's Vacuum Wave cleanse it; nothing else\n"
     "Icon: fallen figure = take it from the front / figure sticking its rear out = from behind (dying cleanses too: the body flies off)")

step(P3, "Bowels of Agony", "คริสตัล: ที่เกิด", "The crystals: where they appear",
     "พร้อม debuff คริสตัล 3 ธาตุโผล่ 3 จุดในสนาม: ที่ทิศของ marker ตัวเลขเสมอ (ตะวันตกเฉียงเหนือ / ออกเฉียงเหนือ / ตกเฉียงใต้ / ออกเฉียงใต้)\n"
     "น้ำกับไฟอยู่ทแยงกันเสมอ ลมจึงอยู่ติดกับน้ำและไฟ\n"
     "โดนทั้ง debuff ไฟ / น้ำ และการโจมตีของคริสตัล = ตาย (รับดาเมจเวทเพิ่ม)\n"
     "การโจมตีของคริสตัลไฟ / น้ำ ถ้ารับจากทิศถูก ล้างลมได้\n\n"
     "ทั้ง 2 แผนใช้ Tank LB3 แต่ยืนต่างกัน: ดูแท็บ\n"
     "yan-flash เรียกว่าแบบ TLB3 (มีแบบปกติด้วย หน้านี้ไม่ได้ลง) / kanatan ปรับมาจากแบบของทีม NOCCHH (แบบปกติยังไม่ได้เขียน)",
     "With the debuffs, three element crystals appear: always at the number-marker directions (NW / NE / SW / SE)\n"
     "Water and fire are always diagonal, so wind is always next to both\n"
     "Being hit by a fire/water debuff and a crystal = death (magic vulnerability)\n"
     "A fire/water crystal hit from the right direction cleanses wind\n\n"
     "Both plans use a tank LB3 but stand differently: see the tabs\n"
     "yan-flash calls it the TLB3 way (it also has a normal way, not shown here) / kanatan's is adapted from team NOCCHH's (its normal way was never written up)")

step(P3, "Bowels of Agony", "① TLB3: ยืนตามคริสตัลลม / น้ำ (ไฟชุดแรก)", "① TLB3: stand by the wind / water crystals (fire first)",
     "แบบ TLB3: แค่ยืนที่ตายตัว โดยดูคริสตัลลมกับน้ำเป็นหลัก\n"
     "ภาพ: ไฟชุดแรก (น้ำตะวันตกเฉียงเหนือ / ลมตะวันออกเฉียงเหนือ / ไฟตะวันออกเฉียงใต้) / ถ้าไฟกับน้ำสลับที่ ให้กลับด้านตาม\n"
     "ไฟระเบิดยังโดนดาเมจ: ใส่ barrier ไว้\n"
     "MT อย่าลืมล่อ Thunder III แบบแรง (AoE) ของ Exdeath\n"
     "คริสตัลลงแล้ว tank buster ตามมาทันที: รับด้วย invuln ใกล้ Exdeath อีกครั้ง\n"
     "แล้วพา Exdeath ไปหา Chaos",
     "TLB3: just stand on fixed spots, keyed off the wind and water crystals\n"
     "Picture: fire first (water NW / wind NE / fire SE) / if fire and water swap, mirror it\n"
     "The fire explosions still hit you: have a barrier up\n"
     "MT, don't forget to bait Exdeath's empowered Thunder III (an AoE)\n"
     "Right after the crystals comes a tank buster: take it with an invuln near Exdeath again\n"
     "Then bring Exdeath over to Chaos",
     strict=False, pic="y037", scene=SY.y037(), plan=YAN,
     says={"MT": "ล่อ Thunder III แบบแรงของ Exdeath"}, says_en={"MT": "Bait Exdeath's empowered Thunder III"},
     refs=[FR("thunder", CLEAR, 471, "Thunder III ของ Exdeath: ครั้งแรกวงใหญ่มองไม่เห็น / ต่อมาแรง 2 ครั้งใส่คนใกล้สุด",
              "Exdeath's Thunder III: first a big invisible circle / later two heavy hits on the nearest player")])

step(P3, "Bowels of Agony", "② Chaos ที่ขอบ หัน 45° + Implosion", "② Chaos at the edge, at 45° + Implosion",
     "วาง Chaos ไว้ขอบนอกสุดเท่าที่ทำได้ หันทำมุม 45° พอดี แล้วล่อ Implosion (Latitudinal / Longitudinal)",
     "Put Chaos as far out as it goes, turned exactly 45°, and bait the Implosion (Latitudinal / Longitudinal)",
     strict=False, pic="y038", scene=SY.y038(), plan=YAN,
     refs=[FR("implosion", CLEAR, 493, "Implosion: กรวย 90° 2 คู่ ซ้าย–ขวา แล้วหน้า–หลัง (หรือกลับกัน)", "Implosion: two pairs of 90° cones, sides then front/back (or the reverse)")])

step(P3, "Bowels of Agony", "③ ชุดหลัง (ภาพ: น้ำ): ทำแบบเดียวกัน", "③ The late set (water here): the same way",
     "ต่อด้วยไฟ / น้ำชุดหลัง (ภาพ: น้ำ): ทำแบบเดียวกับชุดแรก\n"
     "ภาพ: Exdeath กับ Chaos อยู่ด้วยกันที่คริสตัลลม",
     "Then the late fire / water (water here): the same way as the first set\n"
     "Picture: Exdeath and Chaos together on the wind crystal",
     strict=False, pic="y039", scene=SY.y039(), plan=YAN)

step(P3, "Bowels of Agony", "④ MT ลาก Exdeath ไปคริสตัลลม / D3 ล่อ Umbra Smash", "④ MT takes Exdeath to the wind crystal / D3 baits Umbra Smash",
     "MT ลาก Exdeath ไปที่คริสตัลลม\n"
     "D3 ล่อ Umbra Smash ของ Chaos (เห็นร่ายแล้วที่ตกถูกกำหนด)\n"
     "Umbra Smash แรงลดตามระยะ: คนอื่นอยู่ห่าง Chaos ไว้\n"
     "Tank ใช้ LB3 ตอนร่าย Vacuum Wave ไปราว 70%",
     "MT takes Exdeath to the wind crystal\n"
     "D3 baits Chaos's Umbra Smash (the landing is fixed once the cast shows)\n"
     "Umbra Smash falls off with distance: everyone else keeps away from Chaos\n"
     "A tank fires LB3 at about 70% of Vacuum Wave's cast",
     strict=["D3"], pic="y040", scene=SY.y040(), plan=YAN,
     says={"MT": "ลาก Exdeath ไปที่คริสตัลลม", "D3": "ล่อ Umbra Smash ของ Chaos"},
     says_en={"MT": "Take Exdeath to the wind crystal", "D3": "Bait Chaos's Umbra Smash"})

step(P3, "Bowels of Agony", "⑤ Vacuum Wave + Tank LB3: รวมกัน 8 คน", "⑤ Vacuum Wave + tank LB3: all eight together",
     "ร่าย Vacuum Wave ไปราว 70%: Tank ใช้ LB3 แล้วทุกคนรวมกันรับ ระวังทิศที่จะกระเด็น\n"
     "รับ 8 คนเจ็บพอควร: mitigate ให้ดี / Cyclone (ลม) รับผล debuff ที่ใส่ Chaos\n"
     "รับจากด้านหลัง: เอฟเฟกต์ลมอยู่ที่หลังตัวละคร / รับจากด้านหน้า: เอฟเฟกต์ลมอยู่ที่ท้อง",
     "At about 70% of Vacuum Wave's cast a tank fires LB3 and everyone takes it together, minding the knockback direction\n"
     "Eight together hurts a fair bit: mitigate well / Cyclone (wind) is affected by debuffs put on Chaos\n"
     "Take it from behind: the wind effect is on your back / from the front: the wind effect is on your belly",
     strict=False, pic="y041", scene=SY.y041(), plan=YAN,
     refs=[FR("vacuum", CLEAR, 511, "Vacuum Wave: หันให้ถูกแล้วโดนกระเด็นเพื่อล้างลม · Tank ใช้ LB3", "Vacuum Wave: face correctly and get knocked back to cleanse wind · a tank LB3")])

step(P3, "Bowels of Agony", "① เข้าที่ (แบบ Tank LB)", "① Positions (tank LB way)",
     "คริสตัลขึ้นแล้วเข้าที่\n"
     "MT ลาก Chaos ไปขอบสนามฝั่งคริสตัลลม ยืนนอกวงเป้า Chaos 1 ก้าว ด้านในสนาม\n"
     "ST ลาก Exdeath ไปฝั่งตรงข้าม\n"
     "Healer ยืนซ้อน MT ด้านในสนาม\n"
     "D1 / D2 ตี Chaos จากด้านขอบสนาม\n"
     "D3 / D4 ยืนประกบคริสตัลน้ำ: D3 ฝั่ง Exdeath / D4 ฝั่ง Chaos\n"
     "(ภาพ: ลม 1 / น้ำ 2 / ไฟ 4)",
     "Once the crystals are up, take your spots\n"
     "MT drags Chaos to the edge on the wind crystal's side and stands one step outside Chaos's target circle, on the inner side\n"
     "ST drags Exdeath to the opposite side\n"
     "Healers stack on MT, on the inner side\n"
     "D1 / D2 hit Chaos from the edge side\n"
     "D3 / D4 flank the water crystal: D3 on Exdeath's side / D4 on Chaos's\n"
     "(Picture: wind 1 / water 2 / fire 4)",
     strict=True, pic="p3-08", scene=S3.p3_08(), plan=KAN)

step(P3, "Bowels of Agony", "② Thunder III (วงกลมใหญ่มองไม่เห็น) + ชุดเร็วลง", "② Thunder III (a big invisible circle) + the early set",
     "Exdeath เริ่มร่าย Thunder III: ST ย้ายไปฝั่ง Chaos\n"
     "พร้อมกัน debuff The Decisive Battle หาย ตีบอสได้ทั้ง 2 ตัว\n"
     "Thunder III นี้เป็นวงกลมใหญ่ที่มองไม่เห็น: D3 ระวังอย่าโดน\n"
     "ไฟ / น้ำชุดเร็วลงพร้อม Thunder III: คนโดน HP ลด อย่าลืม heal",
     "Exdeath starts casting Thunder III: ST moves over to Chaos's side\n"
     "At the same time The Decisive Battle's debuff goes: both bosses can be hit\n"
     "This Thunder III is a big invisible circle: D3, don't get hit\n"
     "The early fire / water go off with it: those hit lose HP, heal them",
     strict=["ST", "D3"], pic="p3-09", scene=S3.p3_09(), plan=KAN,
     says={"ST": "Exdeath เริ่มร่าย Thunder III: ย้ายไปฝั่ง Chaos", "D3": "Thunder III มองไม่เห็น: อย่าอยู่ในวงใหญ่ของ Exdeath"},
     says_en={"ST": "When Exdeath starts Thunder III, move over to Chaos's side", "D3": "Thunder III is invisible: stay out of Exdeath's big circle"},
     refs=[FR("thunder", CLEAR, 471, "Thunder III ของ Exdeath: ครั้งแรกวงใหญ่มองไม่เห็น / ต่อมาแรง 2 ครั้งใส่คนใกล้สุด",
              "Exdeath's Thunder III: first a big invisible circle / later two heavy hits on the nearest player")])

step(P3, "Bowels of Agony", "③ ไฟ / น้ำชุดเร็วระเบิด", "③ The early fire / water go off",
     "ไฟ / น้ำชุดเร็วระเบิดที่ตัวคนถือ (ภาพ: ไฟที่ D1 กับ ST)",
     "The early fire / water go off on their holders (picture: fire on D1 and ST)",
     strict=False, pic="p3-10", scene=S3.p3_10(), plan=KAN)

step(P3, "Bowels of Agony", "④ donut จากคริสตัลไฟ + Thunder III 2 ครั้ง", "④ The fire crystal's donut + Thunder III twice",
     "ต่อด้วย donut จากคริสตัลไฟ: ทำงานเองแล้วไปลงเอง\n\n"
     "แล้ว Exdeath ร่าย Thunder III อีกครั้ง (ระหว่าง Thunder III Exdeath ไม่ขยับเลย)\n"
     "ชื่อเดียวกันแต่เป็นวงกลมแรง 2 ครั้งติด ลงที่คนใกล้ Exdeath ที่สุด 1 คน (ไม่ใช่ aggro)\n"
     "โดนแล้วได้ debuff สายฟ้ารับเพิ่ม: ปกติ Tank 2 คนใช้ mitigate รับคนละครั้ง\n"
     "แผนนี้: ST กลับไปใกล้ Exdeath แล้วใช้ invuln รับทั้ง 2 ครั้ง\n"
     "จบแล้ว ST กลับมาฝั่ง Chaos ให้ Exdeath กับ Chaos ซ้อนกัน",
     "Next, the fire crystal's donut: it fires and lands on its own\n\n"
     "Then Exdeath casts Thunder III again (it doesn't move a step between them)\n"
     "Same name, but two heavy circles in a row on the player nearest Exdeath (not enmity)\n"
     "It leaves a lightning vulnerability: normally the two tanks take one each with mitigation\n"
     "Here: ST goes back next to Exdeath and takes both with an invuln\n"
     "Then ST comes back to Chaos's side so Exdeath and Chaos stand together",
     strict=False, pic="p3-11", scene=S3.p3_11(), plan=KAN,
     says={"ST": "กลับไปใกล้ Exdeath รับ Thunder III ทั้ง 2 ครั้งด้วย invuln แล้วพา Exdeath มาซ้อน Chaos"},
     says_en={"ST": "Go back next to Exdeath, take both Thunder IIIs with an invuln, then bring Exdeath onto Chaos"})

step(P3, "Bowels of Agony", "⑤ Implosion: หลบกรวย 2 จังหวะ", "⑤ Implosion: dodge two pairs of cones",
     "จบ Thunder III Chaos ร่าย Latitudinal Implosion หรือ Longitudinal Implosion\n"
     "Latitudinal: กรวย 90° ซ้าย–ขวาของบอส → ต่อทันทีด้วยหน้า–หลัง\n"
     "Longitudinal: กรวย 90° หน้า–หลัง → ต่อทันทีด้วยซ้าย–ขวา\n"
     "หลบทั้ง 2 จังหวะ",
     "As Thunder III ends Chaos casts Latitudinal Implosion or Longitudinal Implosion\n"
     "Latitudinal: 90° cones left and right of the boss → straight after, front and back\n"
     "Longitudinal: front and back → straight after, left and right\n"
     "Dodge both",
     strict=False, pic="p3-12", scene=S3.p3_12(), plan=KAN,
     refs=[FR("implosion", CLEAR, 493, "Implosion: กรวย 90° 2 คู่ ซ้าย–ขวา แล้วหน้า–หลัง (หรือกลับกัน)", "Implosion: two pairs of 90° cones, sides then front/back (or the reverse)")])

step(P3, "Bowels of Agony", "⑥ ไฟ / น้ำชุดช้า: กลับที่เดิม", "⑥ The late fire / water: back to your spots",
     "หลบเสร็จอีกสักจังหวะ ไฟ / น้ำชุดช้าทำงาน: กลับไปที่ยืนแรกทันที\n"
     "ที่ตรงนั้น debuff ลง → คริสตัลทำงาน (ภาพ: คริสตัลน้ำลง D4 กับ D3) Healer heal HP ที่ลดคืน",
     "A beat after the dodge the late fire / water go off: go straight back to your first spots\n"
     "There the debuffs land → the crystals fire (picture: the water crystal hits D4 and D3); healers heal the HP back",
     strict=["D3", "D4"], pic="p3-13", scene=S3.p3_13(), plan=KAN)

step(P3, "Bowels of Agony", "⑦ D3 ล่อ Umbra Smash", "⑦ D3 baits Umbra Smash",
     "D4 ไปรวมกลุ่มฝั่ง Chaos / D3 ไปฝั่งตรงข้าม Chaos + Exdeath ล่อ Umbra Smash\n"
     "Umbra Smash: Chaos กระโดดไปที่ที่คนไกล Chaos ที่สุด 'ยืนอยู่ตอนเริ่มร่าย' แล้วโจมตีแรงลดตามระยะ\n"
     "หลังคริสตัลน้ำลง D3 ไปรอฝั่งตรงข้ามก่อน\n"
     "เริ่มร่ายแล้วที่ตกถูกกำหนดแล้ว: D3 รีบกลับมาฝั่ง Chaos + Exdeath",
     "D4 joins the Chaos side / D3 goes opposite Chaos + Exdeath to bait Umbra Smash\n"
     "Umbra Smash: Chaos jumps to where the player farthest from Chaos 'stood when the cast began' and hits with falloff\n"
     "After the water crystal, D3 waits on the far side first\n"
     "Once the cast starts the landing spot is locked: D3 hurries back to Chaos + Exdeath",
     strict=["D3"], pic="p3-14", scene=S3.p3_14(), plan=KAN,
     says={"D3": "ไปฝั่งตรงข้ามบอสล่อ Umbra Smash เริ่มร่ายแล้วรีบกลับ", "D4": "ไปรวมฝั่ง Chaos"},
     says_en={"D3": "Go to the far side to bait Umbra Smash; once the cast starts, hurry back", "D4": "Join the Chaos side"})

step(P3, "Bowels of Agony", "⑧ Vacuum Wave ล้างลม + Tank LB3", "⑧ Vacuum Wave cleanses wind + tank LB3",
     "Umbra Smash เริ่มร่าย Exdeath ก็ร่าย Vacuum Wave\n"
     "หันให้ถูกแล้วโดนกระเด็นเพื่อล้าง debuff ลม / หันผิด = ปลิวออกนอกสนามตาย: หันเทียบกับ Exdeath\n"
     "ล้างลมพร้อมกัน 8 คน = คริสตัลลมยิง stack คู่ 8 อัน: รับด้วย Tank LB3\n"
     "Tank ใช้ LB ตอนแถบร่าย Vacuum Wave ไปถึงราวต้นชื่อสกิล\n"
     "ที่รับ: กระเด็นแล้วเดินนิดหน่อยไปยืนเป็นคู่ตามภาพ (spread ก็ได้ ไม่ต้องคู่ก็ได้ แต่คู่ + Tank LB ดาเมจรวมน้อยสุด / ซ้อน 4 อันน่าจะตาย)\n\n"
     "Tank LB ไม่ทำให้ตัวหัน แต่ถ้าหันหลังรับแล้วล็อกเป้า Exdeath กดสกิลตอนติด LB คำสั่งที่กดค้างจะทำให้หันตัวแล้วตาย: อย่ากดอะไรจนกว่าจะกระเด็น\n"
     "Tank DRK: เอฟเฟกต์ LB บังจอมาก แนะนำให้ Tank อีกคนใช้\n\n"
     "ตอน Umbra / Vacuum เริ่มร่าย Kefka พุ่งหมุนจากขอบสนาม 8 ครั้ง: จำจุดเริ่มกับทิศหมุนไว้ (ใช้ขั้นถัดไป)",
     "As Umbra Smash starts, Exdeath casts Vacuum Wave\n"
     "Face the right way and get knocked back to cleanse wind / the wrong way = blown out of the arena: face relative to Exdeath\n"
     "All 8 cleansing at once = 8 pair stacks from the wind crystal: take them under a tank LB3\n"
     "The tank fires the LB as Vacuum Wave's cast bar reaches about the start of the skill name\n"
     "Where: after the knockback walk a little into pairs as drawn (spreading or not pairing is also fine, but pairs + tank LB take the least damage / four on one probably dies)\n\n"
     "The tank LB doesn't turn you, but if you face away and use a skill on Exdeath during the LB lock, the queued action turns you and you die: press nothing until you're knocked back\n"
     "A DRK's LB effect hides too much: let the other tank use it\n\n"
     "When Umbra / Vacuum start, Kefka dashes spinning from the edge 8 times: remember where he starts and which way he turns (next step)",
     strict=False, pic="p3-15", scene=S3.p3_15(), plan=KAN,
     refs=[FR("vacuum", CLEAR, 511, "Vacuum Wave: หันให้ถูกแล้วโดนกระเด็นเพื่อล้างลม · Tank ใช้ LB3 รับ stack คู่", "Vacuum Wave: face correctly and get knocked back to cleanse wind · a tank LB3 for the pair stacks")])

step(P3, "Ultima Blaster", "Ultima Blaster: Kefka พุ่ง 8 ครั้ง", "Ultima Blaster: Kefka's 8 dashes",
     "ระหว่างทำ Vacuum Wave Kefka หายไป\n"
     "แล้วโผล่จาก 1 ใน 8 ทิศที่ขอบสนาม พุ่งข้ามสนามเป็นเส้นตรงหนา แล้วหมุนตามเข็มหรือทวนเข็มไปเรื่อยๆ รวม 8 ครั้ง\n"
     "ไม่มีโทษโดนแต่หลบยาก: คิดว่าเป็น raid-wide ไปเลย เจ็บพอควร\n"
     "ไม่ต้องจำทั้ง 8 ครั้ง: จำแค่จุดที่ครั้งแรกพุ่งไปถึง (ภาพ: เริ่ม D พุ่งไป B) กับทิศหมุน (ที่ใช้จริงคือทิศตรงข้าม)",
     "During Vacuum Wave Kefka vanishes\n"
     "Then from one of 8 directions on the edge he dashes across in a thick line, turning clockwise or counter-clockwise, 8 times\n"
     "No penalty for being hit but hard to dodge: treat it as a raid-wide; it hurts a fair bit\n"
     "No need to track all 8: remember only where the first dash ends (picture: from D to B) and the direction of turn (you'll use the opposite)",
     strict=False, pic="p3-18", scene=S3.p3_18())

step(P3, "Ultima Blaster", "ลูกเต๋า 1–8: เรียงตามขอบสนาม", "Dice 1–8: line up round the edge",
     "หลังกระเด็นจาก Vacuum Wave ทุกคนได้ลูกเต๋า 1–8 บนหัว (ดูตอนรับ stack คู่ หรือหลังจากนั้นก็ทัน)\n"
     "สักพัก Kefka ยิงเส้นตรงจากจุดที่โผล่: Kefka ตัวแรก → ลูกเต๋า 1 / ลูกเต๋า 2–7 โดนจากตัวสุดท้ายย้อนกลับมา (เลข 1–8 โดนจากตัวที่ 1 8 7 6 5 4 3 2)\n"
     "ทุกเส้นลงพร้อมกัน + รับดาเมจเวทเพิ่ม: ต้อง spread ไม่ให้ซ้อน\n\n"
     "ที่ยืน: เริ่มจากฝั่งตรงข้ามจุดโผล่แรก (= จุดที่พุ่งไปถึงครั้งแรก ภาพ: B) แล้วไล่ทิศตรงข้ามกับที่ Kefka หมุน (ภาพ: ตามเข็ม) เลข 1–8 อยู่ระหว่าง marker ตามลำดับ\n"
     "คนเรียกบอกแค่ เช่น 'B ตามเข็ม'\n"
     "ท่านี้ช้ามาก: นับ 1 2 3 ไปหาที่ตัวเองได้สบาย เจอแล้วดูเลขคนข้างๆ ยืนยันอีกที",
     "After Vacuum Wave's knockback everyone gets a die 1–8 overhead (check during the pair stacks or after; there's time)\n"
     "Later the Kefkas fire lines from where they appeared: the first Kefka → die 1 / dice 2–7 are hit from the last one backwards (dice 1–8 hit by Kefka 1 8 7 6 5 4 3 2)\n"
     "All lines land at once with a magic vulnerability: spread so none overlap\n\n"
     "Spots: start opposite Kefka's first appearance (= where the first dash ended, B here) and go against Kefka's turn (clockwise here); 1–8 sit between the markers in order\n"
     "The caller only needs to say e.g. 'B clockwise'\n"
     "It's very slow: counting 1, 2, 3 to your spot is in time; then check your neighbours' numbers",
     strict=False, pic="p3-20", scene=S3.p3_20(),
     refs=[FR("dice", CLEAR, 528, "ลูกเต๋า 1–8 บนหัว: เรียงตามขอบสนามระหว่าง marker", "Dice 1–8 overhead: line up round the edge between the markers")])

step(P3, "Thunder III", "ครึ่งหลัง: Thunder III → The Decisive Battle → Thunder III", "Second half: Thunder III → The Decisive Battle → Thunder III",
     "หลัง Ultima Blaster: Thunder III (จากนี้ Thunder III เป็นท่าแรง 2 ครั้งใส่คนใกล้ที่สุดทั้งหมด) → The Decisive Battle → Thunder III\n"
     "ก่อน Decisive Battle ตีโดน 2 ตัวพร้อมกันได้ แต่อาจพลาดโดน Thunder III หรือได้ debuff ผิด: ไม่ต้องฝืนซ้อนบอส\n"
     "แบ่งกลุ่มเหมือนเดิม: Chaos: MT H1 D1 D2 / Exdeath: ST H2 D3 D4",
     "After Ultima Blaster: Thunder III (from here every Thunder III is two heavy hits on the nearest player) → The Decisive Battle → Thunder III\n"
     "Until the Decisive Battle you can cleave both, but Thunder III accidents or the wrong debuff happen: no need to force the bosses together\n"
     "Same groups: Chaos: MT H1 D1 D2 / Exdeath: ST H2 D3 D4")

step(P3, "Earthquake", "Max + Earthquake: HP 1 + debuff ดิน", "Max + Earthquake: HP 1 + earth debuffs",
     "Kefka ร่าย Max ตัวใหญ่ขึ้นแล้วไปอยู่ขอบสนาม / Chaos ร่าย Earthquake\n"
     "ทุกคน HP เหลือ 1 + ได้ Primordial Crust ทุกคน / DPS 1 + Healer 1 ได้ Accretion เพิ่ม\n"
     "คริสตัลดินโผล่กลางสนาม: แค่ยิง raid-wide\n\n"
     "Primordial Crust: โดนดาเมจที่ทำให้ HP ต่ำกว่า 0 จะไม่ตาย เหลือ HP 1 แล้ว debuff หาย\n"
     "debuff หาย = คริสตัลดินยิง raid-wide ใส่ทุกคนยกเว้นคนที่ทำ debuff หาย + ดินรับเพิ่ม 3 วิ: หายพร้อมกัน 2 คน = ตายหมด\n"
     "เวลาของ debuff: ยาว 2 คน / กลาง 3 คน / สั้น 3 คน พร้อมได้ First / Second / Third in Line (สั้น = First / กลาง = Second / ยาว = Third)\n\n"
     "Accretion: 15 วิ หมดเวลาน่าจะตาย / ล้างได้ด้วยการทำ HP ให้เต็ม\n"
     "ล้างแล้วคริสตัลดินก็ยิงเหมือนกัน: อย่าทำ HP 2 คนเต็มพร้อมกัน",
     "Kefka casts Max, grows and goes to the edge / Chaos casts Earthquake\n"
     "Everyone drops to 1 HP + Primordial Crust on all / 1 DPS + 1 healer also get Accretion\n"
     "An earth crystal appears in the middle: it only does raid damage\n\n"
     "Primordial Crust: damage that would take you below 0 leaves you at 1 HP instead, and the debuff goes\n"
     "When it goes the earth crystal hits everyone except whoever lost it + a 3 s earth vulnerability: two at once = everyone dies\n"
     "Durations: 2 long / 3 middle / 3 short, with First / Second / Third in Line (short = First / middle = Second / long = Third)\n\n"
     "Accretion: 15 s, probably lethal at the end / cleansed by healing to full\n"
     "That also fires the earth crystal: don't top both up at the same time",
     refs=[FR("earthquake", CLEAR, 569, "Earthquake: HP ทุกคนเหลือ 1 + คริสตัลดินกลางสนาม", "Earthquake: everyone at 1 HP + the earth crystal in the middle")])

step(P3, "Black Hole", "หลุมดำ: 2 แบบ", "Black holes: two layouts",
     "หลุมดำมีแค่ 2 แบบนี้ หมุนทีละ 90°\n"
     "หลุมดำวงนอกสุด 3 อันโยงสาย: ยิงเส้นตรงใส่คนถือสายเป็นระยะ ยิงครบแล้วหายไป\n"
     "หลุมดำวงในแตะได้: แตะ = ดาเมจ + ดาเมจที่ทำลด\n"
     "ระวังหลุมดำที่บังอยู่หลัง Exdeath หรือ Chaos (ผ้าคลุม Exdeath บังมิด): มี Exdeath ตรงไหน คิดว่ามีหลุมดำตรงนั้น\n"
     "ที่ที่ spread หรือ stack มักมีหลุมดำงอกขึ้น: ร่ายค้างจะโดน รีบหลบ\n\n"
     "หลุมดำวงนอกหมด → Kefka ตบพื้น ฯลฯ → หลุมดำหายแล้ววางใหม่ รวม 4 ชุด\n"
     "ชุด 1 กับ 4: หลุมดำวงนอกยิงอันละครั้ง (ชุด 1: 1 จุด แล้วอีก 2 / ชุด 4: 2 จุด แล้วอันสุดท้าย)\n"
     "ชุด 2 กับ 3: ยิงพร้อมกันทั้ง 3 อัน 3 ครั้ง\n\n"
     "โดนลำแสงได้ Unbecoming / 2 stack กลายเป็น Meanest Existence / โดนอีกตอนมี Meanest Existence = ตาย\n"
     "สรุป: ใช้ลำแสงหลุมดำตามลำดับที่ตกลง เพื่อทำให้ Primordial Crust หายทีละคน",
     "There are only these two layouts, turned by 90°\n"
     "The 3 outermost black holes tether: they fire a line at the tethered player at intervals, then vanish\n"
     "The inner ones can be touched: touch = damage + damage down\n"
     "Beware black holes hidden behind Exdeath or Chaos (Exdeath's cape covers them): where Exdeath is, assume a black hole\n"
     "Black holes often spawn where you just spread or stacked: don't keep casting, move\n\n"
     "When the outer ones are gone → Kefka's slam etc. → all vanish and are placed again, 4 sets\n"
     "Sets 1 and 4: the outer ones fire once each (set 1: one, then the other two / set 4: two, then the last)\n"
     "Sets 2 and 3: all three fire together, 3 times\n\n"
     "A beam gives Unbecoming / 2 stacks become Meanest Existence / another beam with Meanest Existence = death\n"
     "In short: take the black-hole beams in the agreed order to remove Primordial Crust one player at a time",
     strict=False, pic="p3-23", scene=S3.p3_23(),
     refs=[FR("blackholes", CLEAR, 586, "หลุมดำวงนอกโยงสายแล้วยิงลำแสงใส่คนถือสาย", "The outer black holes tether and fire beams at their holder")])

step(P3, "Black Hole", "หลุมดำ: แบบที่ 2", "Black holes: the second layout",
     "แบบที่ 2 (หมุนทีละ 90° ได้เหมือนกัน)",
     "The second layout (also turned by 90°)", strict=False, pic="p3-24", scene=S3.p3_24())

step(P3, "Black Hole", "กติกา + ใครรับลำแสงไหน", "The rules + who takes which beam",
     "ตลอดช่วงนี้: คนที่ไม่ได้รับสาย รวมกันกลางสนามเสมอ\n"
     "ปกติดึงสายไปตามเข็ม (ชุด 1 กับ 4 คนรับน้อย ตามสะดวก) / ไม่ใช่กฎตายตัว: ตอนที่ยังยืนไม่เรียบร้อยให้หันสายออกนอกสนาม เผื่อแผ่คนอื่น\n"
     "จำง่าย: มีท่าตบ / ฟันครึ่งสนาม / Look upon Me ลงดังตูม = คนรับสายเปลี่ยนเป็นชุดถัดไป\n\n"
     "ติด marker: First in Line 3 คน = Attack 1–3 / Second in Line 3 คน = Bind 1–3 / Third in Line 2 คน = Ignore 1–2 (ในคู่มือเขียน Stop 1–2)\n"
     "คนเดียวติดให้ทุกคน หรือแต่ละคนใช้ macro ติดเองก็ได้\n\n"
     "ใครถือสายในแต่ละลำแสง\n"
     "ชุด 1: ลำ 1 Attack 1 / ลำ 2 Attack 1 + 2 (ไม่มีใครถูกทำให้ HP 1)\n"
     "ชุด 2: Attack 1 2 3 → Bind 1 Attack 2 3 → Bind 1 2 Attack 3 / ลำละคน HP 1: Attack 1 > 2 > 3\n"
     "ชุด 3: Bind 1 2 3 → Stop 1 Bind 2 3 → Stop 1 2 Bind 3 / HP 1: Bind 1 > 2 > 3\n"
     "ชุด 4: Stop 1 + 2 → Stop 2 / HP 1: Stop 1 > 2\n\n"
     "Healer: Accretion ใช้ heal ทั้งปาร์ตี้ให้ HP ราวครึ่ง แล้ว heal เดี่ยวล้าง Accretion ของ Healer ก่อน แล้ว heal ทั้งปาร์ตี้ล้างของ DPS",
     "Throughout: anyone not taking a tether gathers in the middle\n"
     "Tethers are normally drawn clockwise (sets 1 and 4 have few takers: as you like) / not a hard rule: when spots aren't settled yet, aim the line outwards, be considerate\n"
     "Memory aid: a slap / a half-room hit / Look upon Me crashes down = the next set takes the tethers\n\n"
     "Markers: the 3 First in Line = Attack 1–3 / the 3 Second in Line = Bind 1–3 / the 2 Third in Line = Ignore 1–2 (called Stop 1–2 here)\n"
     "One person marks everyone, or each player uses a macro\n\n"
     "Who holds a tether at each beam\n"
     "Set 1: beam 1 Attack 1 / beam 2 Attack 1 + 2 (nobody is taken to 1 HP)\n"
     "Set 2: Attack 1 2 3 → Bind 1 Attack 2 3 → Bind 1 2 Attack 3 / one taken to 1 HP per beam: Attack 1 > 2 > 3\n"
     "Set 3: Bind 1 2 3 → Stop 1 Bind 2 3 → Stop 1 2 Bind 3 / 1 HP: Bind 1 > 2 > 3\n"
     "Set 4: Stop 1 + 2 → Stop 2 / 1 HP: Stop 1 > 2\n\n"
     "Healers, Accretion: party-heal to about half, single-heal the healer's Accretion off first, then party-heal the DPS one off")

step(P3, "Slap Happy", "Slap Happy: วงกลม 3 ลูกจากฝั่งมือที่ยก", "Slap Happy: three circles from the raised hand's side",
     "ไม่นานหลัง Earthquake Kefka ใช้ Slap Happy: ฟันครึ่งสนามแบบไม่เป๊ะ\n"
     "ครึ่งฝั่งที่ Kefka ยกมือ มีวงกลมลง 3 ครั้งไล่จากฝั่ง Kefka ออกไป (ขนาดประมาณในภาพ)\n"
     "ห่าง Kefka = วงลงช้า หลบง่าย",
     "Soon after Earthquake Kefka uses Slap Happy: a rough half-room hit\n"
     "On the half where Kefka raised his hand, three circles land one after another going out from Kefka (about this size)\n"
     "Far from Kefka = they reach you later, easier to dodge",
     strict=False, pic="p3-30", scene=S3.p3_30(),
     refs=[FR("slap", CLEAR, 576, "Slap Happy: ครึ่งฝั่งที่ Kefka ยกมือโดนวงกลม 3 ครั้ง", "Slap Happy: the half where Kefka raises his hand takes three circles")])

step(P3, "Slap Happy", "ต่อด้วย spread ตาม role หรือ stack", "Then a role spread or a stack",
     "วงกลม 3 ครั้งแล้วอีกจังหวะ: วงกลมกลางสนามที่มองเห็นขึ้น ลงพร้อมกับ\n"
     "ถ้าปลอดภัยฝั่ง 'ซ้ายเมื่อหันหน้าหา Kefka' = กรวยใส่ role ละ 1 คนแบบสุ่ม (spread ตาม role)\n"
     "ถ้าปลอดภัยฝั่ง 'ขวาเมื่อหันหน้าหา Kefka' = กรวย stack ใส่ 1 คนแบบสุ่ม\n\n"
     "ให้ Kefka = 12 นาฬิกา\n"
     "spread: Healer 9 / Tank 10:30 / DPS 7:30 (ที่ marker)\n"
     "(Kefka อยู่ A: Tank marker 1 / Healer D / DPS marker 4)\n"
     "stack: ทุกคน 3 นาฬิกา\n"
     "(ภาพรวมทั้ง 2 กรณี จริงๆ ครึ่งหนึ่งโดน Slap)",
     "A beat after the three circles a visible circle appears in the middle; with it\n"
     "If 'left, facing Kefka' is safe = a cone on one random player per role (role spread)\n"
     "If 'right, facing Kefka' is safe = a stack cone on one random player\n\n"
     "With Kefka at 12 o'clock\n"
     "Spread: healers 9 / tanks 10:30 / DPS 7:30 (on the markers)\n"
     "(Kefka at A: tanks marker 1 / healers D / DPS marker 4)\n"
     "Stack: everyone at 3 o'clock\n"
     "(Both cases in one picture; one half is really hit by the slap)",
     strict=True, pic="p3-31", scene=S3.p3_31())

step(P3, "Black Hole", "ชุด 1: ลำแสงแรก (Attack 1)", "Set 1: the first beam (Attack 1)",
     "จบ Slap แล้ว Attack 1 รับสายเส้นแรก ยิงไม่ให้โดนคนอื่น\n"
     "ไม่ผ่านกลางสนามรับตรงไหนก็ได้ / คล่องแล้วรับไปทางสายเส้นถัดไปของตัวเองจะง่าย\n"
     "Attack 2 รอฝั่งตรงข้ามหลุมดำของ Attack 1 จะง่ายตอนต่อไป (ภาพ: Attack 1 = H2 / Attack 2 = D3)",
     "After the slap Attack 1 takes the first tether and aims it away from everyone\n"
     "Anywhere not through the middle / once comfortable, take it towards your next tether\n"
     "Attack 2 waits opposite Attack 1's black hole for an easy next step (picture: Attack 1 = H2 / Attack 2 = D3)",
     strict=False, pic="p3-32", scene=S3.p3_32())

step(P3, "Black Hole", "ชุด 1: ลำแสงที่ 2", "Set 1: the second beam",
     "Attack 1 รับสายจากหลุมดำที่ห่างหลุมดำเดิม 90° ฝั่งใดฝั่งหนึ่ง (ปกติคือฝั่งที่ใกล้)\n"
     "Attack 2 รับสายของหลุมดำที่อยู่ตรงข้ามหลุมดำเดิมของ Attack 1\n"
     "อย่าหันผ่านกลาง ที่เหลือหันตามสะดวก (ขอบสนามว่างพอ ใครโดนคือคนนั้นผิด)\n\n"
     "ก่อนลำแสงนี้ลงนิดหน่อย Exdeath ร่าย Thunder III: อย่ารีบออก จะโดนลำแสงหรือหลุมดำ\n"
     "ดูลำแสงลงก่อนแล้วค่อยออกก็ทัน / Tank ที่เป็น Attack 1–2: รีบวิ่งกลับไปหา Exdeath (static ของ kanatan ใช้ invuln รับตรงนี้)",
     "Attack 1 takes the tether of a black hole 90° either way from theirs (normally the nearer)\n"
     "Attack 2 takes the one opposite Attack 1's old black hole\n"
     "Don't aim through the middle, otherwise as you like (there's room at the edge; whoever gets hit is at fault)\n\n"
     "Just before this beam Exdeath casts Thunder III: don't rush out into beams or black holes\n"
     "Leaving after the beam lands is in time / a tank who is Attack 1–2: dash back to Exdeath (kanatan's static used an invuln here)",
     strict=False, pic="p3-33", scene=S3.p3_33(),
     refs=[FR("bh-tether", CLEAR, 597, "รับสายหลุมดำ: หันลำแสงไม่ให้ผ่านกลางสนาม", "Taking a black-hole tether: aim the beam away from the middle")])

step(P3, "Damning Edict", "Damning Edict + Slap Happy", "Damning Edict + Slap Happy",
     "Chaos ร่าย Damning Edict: หันหาคนสุ่ม ฟัน 180° ด้านหน้า / ปลอดภัยหลังครึ่งวงเป้าของ Chaos\n"
     "ระหว่างร่าย Kefka ยกมือ Slap Happy: ครึ่งสนาม + stack หรือ spread ตาม role เหมือนเดิม\n"
     "Slap ลงหลัง Edict นิดหน่อย: ถึงจะเหมือนโดนทั้งสนาม ใจเย็น สัญลักษณ์ Edict หายแล้วเข้าไปตรงนั้นแล้วทำ Slap\n"
     "Slap มาจากฝั่ง Kefka: ยืนไกล Kefka ลงช้า หลบง่าย",
     "Chaos casts Damning Edict: turns to a random player and hits the front 180° / safe behind the back half of Chaos's target circle\n"
     "During it Kefka raises a hand for Slap Happy: a half-room + the stack or role spread as before\n"
     "The slap lands a little after the Edict: even if everything looks covered, stay calm, step in where the Edict was once its telegraph fades, then do the slap\n"
     "The slap comes from Kefka's side: far from Kefka it lands later and is easier",
     strict=False, pic="p3-36", scene=S3.p3_36(),
     refs=[FR("edict", CLEAR, 607, "Damning Edict: Chaos ฟันครึ่งหน้า 180° ใส่คนสุ่ม", "Damning Edict: Chaos hits the front 180° towards a random player")])

step(P3, "Black Hole", "ชุด 2: Attack 1–3 รับตามเข็มจาก Kefka", "Set 2: Attack 1–3 clockwise from Kefka",
     "หลัง Slap หลุมดำขึ้นทันที ชุด 2 เริ่ม\n"
     "Attack 1–3 ดูตำแหน่ง Kefka ไว้ตั้งแต่ตอน Slap\n"
     "นับจาก Kefka ตามเข็ม: Attack 1 = อันแรก / Attack 2 = อันที่ 2 / Attack 3 = อันที่ 3\n"
     "ต้นชุดสำคัญที่สุด: บางที่ต้องเดินไกล และต้องดูก่อนว่าสายไหนของตัวเอง ช้านิดเดียวก็ไม่ทัน\n"
     "คนอื่นรีบรวมกลางสนามแล้วอยู่นิ่งๆ: ขยับไปมา สายจะส่งต่อกันกลางสนาม กวนคนรับสาย",
     "Black holes appear right after the slap: set 2 begins\n"
     "Attack 1–3 note where Kefka is during the slap\n"
     "Counting clockwise from Kefka: Attack 1 = the first / Attack 2 = the second / Attack 3 = the third\n"
     "The start of each set matters most: some have far to go and must first see which tether is theirs; a little late is too late\n"
     "Everyone else gathers in the middle quickly and keeps still: wiggling passes tethers around and gets in the takers' way",
     strict=False, pic="p3-37", scene=S3.p3_37())

step(P3, "Black Hole", "ชุด 2: Bind 1 แทน Attack 1", "Set 2: Bind 1 takes over from Attack 1",
     "ลำแสงแรกลงแล้ว Bind 1 เข้าไปรับสายต่อจาก Attack 1\n"
     "ถ้าทั้งสองคนขยับอยู่ สายอาจหลุด: ตอนส่งต่อ คนส่งหยุดรอเมื่อคนรับเข้ามาใกล้\n"
     "จากนี้ลำแสงทุกครั้งทำให้ 1 คน HP 1 + raid-wide จาก Earthquake: Healer heal หนักๆ\n"
     "DPS ตอนตัวเอง HP 1: ใช้ Second Wind + Bloodbath ทุกครั้ง (Vercure / Clemency ก็ได้)",
     "After the first beam Bind 1 takes the tether over from Attack 1\n"
     "If both are moving the tether can slip through: when handing over, the giver stops once the taker is close\n"
     "From here each beam takes one player to 1 HP + an Earthquake raid-wide: healers, heal heavily\n"
     "DPS, when you hit 1 HP: always use Second Wind + Bloodbath (Vercure / Clemency are options)",
     strict=False, pic="p3-38", scene=S3.p3_38())

step(P3, "Black Hole", "ชุด 2: Bind 2 แทน Attack 2", "Set 2: Bind 2 takes over from Attack 2",
     "ลำแสงที่ 2 ลงแล้ว Bind 2 รับสายต่อจาก Attack 2",
     "After the second beam Bind 2 takes over from Attack 2",
     strict=False, pic="p3-39", scene=S3.p3_39())

step(P3, "Black Hole", "ชุด 2: ลำแสงที่ 3 + Kefka ย้าย", "Set 2: the third beam + Kefka moves",
     "ลำแสงที่ 3 ลง\n"
     "ระหว่างลำแสง 2 กับ 3 Kefka ย้ายที่แบบเงียบๆ: ต่อไปมี Look upon Me and Despair ต้องดูว่า Kefka ไปอยู่ไหน",
     "The third beam lands\n"
     "Between beams 2 and 3 Kefka quietly moves: Look upon Me and Despair is next, so check where he went",
     strict=False, pic="p3-40", scene=S3.p3_40())

step(P3, "Look upon Me and Despair", "Damning Edict + Look upon Me and Despair", "Damning Edict + Look upon Me and Despair",
     "Chaos ร่าย Damning Edict / เกือบพร้อมกัน Kefka ร่าย Look upon Me and Despair\n"
     "Look upon Me: เส้นตรงหน้า Kefka ไม่กว้างมาก แต่ลืมแล้วโดน\n"
     "ลง Edict ก่อน → Look upon Me (ห่างกันไม่ถึง 2 วิ)\n"
     "ถ้าทิศออกมาแบบภาพ H1 กับ D4 ตัดสินใจช้า = ไปไม่ทัน\n\n"
     "แล้ว Exdeath ร่าย Thunder III: Tank สลับกันรับ (Look upon Me ขวางมาก ระวัง)\n"
     "จบแล้วกลุ่ม Bind 3 คนต้องดูตำแหน่ง Kefka ไว้สำหรับชุด 3",
     "Chaos casts Damning Edict / almost together Kefka casts Look upon Me and Despair\n"
     "Look upon Me: a line in front of Kefka, not that wide, but it gets you if you forget it\n"
     "Edict lands first → Look upon Me (under 2 s later)\n"
     "Facing like the picture, H1 and D4 won't make it if they decide late\n\n"
     "Then Exdeath casts Thunder III: the tanks take turns (Look upon Me is very much in the way)\n"
     "After it the three Binds must check where Kefka is for set 3",
     strict=False, pic="p3-41", scene=S3.p3_41())

step(P3, "Black Hole", "ชุด 3: Bind 1–3 / Stop 1 แทน Bind 1", "Set 3: Bind 1–3 / Stop 1 takes over from Bind 1",
     "หลัง Edict + Look upon Me ชุด 3 เริ่ม\n"
     "Bind 1–3 รับสายตามเข็มจาก Kefka เหมือนเดิม\n"
     "ลำแสงแรกลงแล้ว Stop 1 เข้าไปรับต่อจาก Bind 1",
     "After Edict + Look upon Me set 3 begins\n"
     "Bind 1–3 take the tethers clockwise from Kefka, as before\n"
     "After the first beam Stop 1 takes over from Bind 1",
     strict=False, pic="p3-43", scene=S3.p3_43())

step(P3, "Black Hole", "ชุด 3: Stop 2 แทน Bind 2", "Set 3: Stop 2 takes over from Bind 2",
     "ลำแสงที่ 2 ลงแล้ว Stop 2 รับสายต่อจาก Bind 2",
     "After the second beam Stop 2 takes over from Bind 2",
     strict=False, pic="p3-44", scene=S3.p3_44())

step(P3, "Black Hole", "ชุด 3: ลำแสงที่ 3", "Set 3: the third beam",
     "ลำแสงที่ 3: ไม่มีสลับ แต่ต่อไปเป็นช่วง mechanic\n"
     "ระหว่างลำแสง 2 กับ 3 Kefka ย้ายที่: ดูให้ดีว่าไปไหน\n"
     "จบลำแสงที่ 3 Tank หัน Chaos ไปทาง marker ที่เยื้องจาก Kefka 45° (ภาพ: marker 1 หรือ 4)\n"
     "หันพลาดก็ยังทำได้ แต่หันถูก ช่วงต่อไปเดินง่าย",
     "Third beam: no swap, but a mechanic comes next\n"
     "Between beams 2 and 3 Kefka moves: watch where\n"
     "After the third beam the tank points Chaos at the marker 45° off Kefka (picture: marker 1 or 4)\n"
     "Getting it wrong is survivable, but right makes the next part easier to move through",
     strict=False, pic="p3-45", scene=S3.p3_45())

step(P3, "White Hole", "White Hole + Implosion + Slap Happy", "White Hole + Implosion + Slap Happy",
     "Chaos ร่าย Implosion (ซ้าย–ขวา → หน้า–หลัง หรือกลับกัน)\n"
     "Exdeath ร่าย White Hole: ร่ายเสร็จแล้วใคร HP ไม่เต็ม = กลายเป็นหิน ตาย\n"
     "ต้อง heal HP ที่ลดจากลำแสงกับ Earthquake ให้เต็มทุกคน\n"
     "Kefka ร่าย Slap Happy ด้วย: ฝั่งที่ไม่ยกมือปลอดภัย\n\n"
     "ลำดับ: White Hole → Implosion 1 → Implosion 2 + วงกลมแรกของ Slap\n"
     "หลบ Implosion 1 ฝั่งตรงข้าม Slap → หลบ Implosion 2 → ไป spread ตาม role หรือ stack ทันที\n"
     "ที่ stack อยู่ที่รอยต่อของกรวย: เดินง่าย / spread: role ที่มีที่ยืนฝั่ง Implosion 2 ต้องรีบ ไม่งั้นตาย\n"
     "ถ้าที่รอไม่ดีจนต้องหลบ Implosion ฝั่ง Slap: ถ้าไกล Kefka รีบเดินก็ยังทัน ใจเย็น",
     "Chaos casts Implosion (sides → front/back, or the reverse)\n"
     "Exdeath casts White Hole: anyone not at full HP when it ends is petrified and dies\n"
     "Heal everyone back to full from the beams and Earthquake\n"
     "Kefka casts Slap Happy as well: the side without the raised hand is safe\n\n"
     "Order: White Hole → Implosion 1 → Implosion 2 + the slap's first circle\n"
     "Dodge Implosion 1 on the side away from the slap → dodge Implosion 2 → straight to the role spread or the stack\n"
     "The stack spot sits on the cones' boundary: easy / spread: a role whose spot is on Implosion 2's side must hurry or die\n"
     "If a bad waiting spot makes you dodge Implosion on the slap side: far from Kefka, hurrying still makes it; stay calm",
     strict=False, pic="p3-46", scene=S3.p3_46(),
     refs=[FR("white-hole", CLEAR, 671, "White Hole: ร่ายเสร็จแล้วใคร HP ไม่เต็มกลายเป็นหิน", "White Hole: anyone not at full HP when it ends is petrified")])

step(P3, "Black Hole", "ชุด 4: Stop 1–2", "Set 4: Stop 1–2",
     "Stop 1 / 2 รับสาย: เลขน้อยก่อน ตามเข็ม\n"
     "ชุดนี้หลุมดำวงนอก 3 อันยิงอันละครั้งแบบชุด 1\n"
     "หลุมดำที่เหลือ 1 อันที่ยังไม่มีสาย = อันที่ Stop 2 ต้องรับสุดท้าย รู้ล่วงหน้าได้\n"
     "Stop 2 ขยับไปทางนั้นตั้งแต่ลำแสงแรกจะไหลลื่น\n"
     "ก่อนรับลำแสงนิดหน่อย Kefka ย้ายที่: ต่อไปมี Look upon Me ดูให้ดี",
     "Stop 1 / 2 take the tethers: lower number first, clockwise\n"
     "This set the 3 outer black holes fire once each, like set 1\n"
     "The one without a tether = the one Stop 2 takes last; you can tell in advance\n"
     "Stop 2 drifting that way from the first beam makes it smooth\n"
     "Just before the beam Kefka moves: Look upon Me is next, watch where",
     strict=False, pic="p3-48", scene=S3.p3_48())

step(P3, "Look upon Me and Despair", "ลำแสงสุดท้าย (Stop 2) + Look upon Me", "The last beam (Stop 2) + Look upon Me",
     "สุดท้าย Stop 2 รับลำแสง + Look upon Me and Despair\n"
     "หนี Look upon Me แต่อย่าไปส่งสายของ Stop 2 ต่อกันมั่ว ไม่งั้น Stop 2 รับสายไม่ได้ จบ\n"
     "เดินแบบคิดถึงคนอื่นด้วย",
     "Finally Stop 2 takes a beam + Look upon Me and Despair\n"
     "Flee Look upon Me, but don't pass Stop 2's tether around, or Stop 2 can't take it and it's over\n"
     "Move with others in mind",
     strict=["D2"], pic="p3-49", scene=S3.p3_49())

step(P3, "Stomp-a-Mole", "① จุดอ้างอิง + ทิ้ง Blizzard III เป็นคู่", "① The reference + drop Blizzard III in pairs",
     "Look upon Me จบ Kefka ย้ายไปอยู่เหนือสนาม (เห็นแค่เท้า)\n"
     "ช่วงต่อไปใช้ตำแหน่ง Kefka ตอน Look upon Me เป็นจุดอ้างอิง (ฝั่งส้นเท้า = ระหว่างเท้า 2 ข้าง)\n\n"
     "รวมกลางสนามก่อน: Blizzard III วาง AoE ใต้เท้า\n"
     "ให้จุดอ้างอิงเป็น 12 นาฬิกา: MT·H1 10:30 / ST·H2 1:30 / D1·D3 7:30 / D2·D4 4:30 แยกเป็นคู่\n"
     "(อ้างอิง A: MT·H1 ไป marker 1 / ST·H2 marker 2 / D1·D3 marker 4 / D2·D4 marker 3)\n"
     "AoE ใต้เท้าขึ้นอีกครั้ง: ถ้าขวางช่วงต่อไปจะจบ ไปทิ้งที่ marker ให้ถึง",
     "After Look upon Me Kefka moves above the arena (only his feet show)\n"
     "The next part uses Kefka's position during Look upon Me as the reference (heel side = between his feet)\n\n"
     "Gather in the middle first: Blizzard III drops a puddle under you\n"
     "With the reference at 12 o'clock: MT·H1 10:30 / ST·H2 1:30 / D1·D3 7:30 / D2·D4 4:30, in pairs\n"
     "(Reference A: MT·H1 to marker 1 / ST·H2 marker 2 / D1·D3 marker 4 / D2·D4 marker 3)\n"
     "A second puddle appears under you: in the way of the next part it ends the run, so drop it right at the marker",
     strict=True, pic="p3-50", scene=S3.p3_50(),
     refs=[FR("stomp", CLEAR, 706, "Stomp-a-Mole: Kefka อยู่เหนือสนาม เห็นแค่เท้า · tower ขึ้นใต้เท้าที่ยก", "Stomp-a-Mole: Kefka above the arena, only his feet · towers under the raised foot")])

step(P3, "Stomp-a-Mole", "② stack กลาง / role อื่นเข้า tower ใต้เท้า", "② Stack in the middle / the other role soaks under the feet",
     "ตอนนั้น 1 คนแบบสุ่มได้ stack\n"
     "คนได้ stack กับ role เดียวกัน (Tank·Healer หรือ DPS): ทิ้ง AoE ที่ marker แล้วไปรวมกลาง\n"
     "role ที่ไม่มี stack: ไปเข้า tower ใต้เท้า Kefka\n"
     "tower ขึ้นตรงที่ Kefka ยกเท้า ลงตอนวางเท้า: รอ tower ขึ้นก่อนค่อยไปไม่ทันแน่ ทิ้ง AoE แล้วไปใต้เท้าทันที\n"
     "tower ฝั่งทีม MT ลงก่อนฝั่งทีม ST: ทีม MT ช้านิดเดียวจะเหลือเข้า tower คนเดียวแล้วตาย",
     "Then a random player gets a stack\n"
     "The stack holder's role (tanks/healers or DPS): drop the puddle at the marker, then gather in the middle\n"
     "The role without the stack: soak the towers under Kefka's feet\n"
     "A tower appears where Kefka lifts a foot and goes off as he puts it down: waiting to see it is too late; go under the feet as soon as the puddle is down\n"
     "The MT team's tower lands before the ST team's: the MT team, a little late, ends up soaking alone and dying",
     strict=True, pic="p3-52", scene=S3.p3_52())

step(P3, "Stomp-a-Mole", "③ stack + tower", "③ Stack + towers",
     "stack กลางสนามให้ครบ เข้า tower ให้ครบ (ภาพ: Tank·Healer stack กลาง / DPS เข้า tower)",
     "Take the stack in the middle and soak the towers properly (picture: tanks/healers stack / DPS soak)",
     strict=True, pic="p3-53", scene=S3.p3_53())

step(P3, "Stomp-a-Mole", "④ สลับ + Big Bang / Blizzard III จนหมดเวลา", "④ Swap + Big Bang / Blizzard III to the time-out",
     "stack กับ tower จบแล้ว role ที่ไม่ได้ stack เมื่อกี้ได้ stack: สลับกัน\n\n"
     "แล้ว Exdeath ร่าย Blizzard III: ต้องขยับตลอดจนเอฟเฟกต์จบ ไม่งั้นแข็ง\n"
     "Chaos ร่าย Big Bang: วงกลมมองไม่เห็นตรงที่ stack เมื่อกี้ (กลางสนาม): อย่าเข้าใกล้\n"
     "แล้ว auto-attack ของ Chaos 3 ครั้ง บอสหายไป หมดเวลา\n"
     "ถ้าฆ่า Chaos ทันก่อนหมดเวลา Exdeath จะร่าย Meteor และยืดเวลาให้\n"
     "แผนนี้ Melee ตี Chaos: ตีจนถึง auto-attack ครั้งที่ 2 ของ Chaos แล้วฆ่า แล้วฆ่า Exdeath ต่อ",
     "After the stack and towers, the role that didn't have the stack gets one: swap\n\n"
     "Then Exdeath casts Blizzard III: keep moving until its effect ends, or you freeze\n"
     "Chaos casts Big Bang: an invisible circle where the stack just was (the middle): stay away\n"
     "Then three Chaos auto-attacks; the bosses leave, time is up\n"
     "Killing Chaos before that makes Exdeath cast Meteor and extends the time\n"
     "Melee are on Chaos here: push until Chaos's second auto-attack and kill it, then kill Exdeath",
     strict=True, pic="p3-54", scene=S3.p3_54())

# ======================================================================================= P4
step(P4, "Kefka Says", "ภาพรวม: Grand Cross + Tsunami / Inferno", "Overview: Grand Cross + Tsunami / Inferno",
     "phase นี้มีแค่: Grand Cross + Tsunami / Inferno + การโจมตีพื้นของ Kefka\n"
     "แผนนี้มาจากสไลด์ของ saki และอ้างอิงแผนของทีม Poikos\n\n"
     "Kefka ร่าย Kefka Says: Neo Exdeath กับ Chaos โผล่ที่ขอบสนาม\n"
     "ลำดับร่าย: Grand Cross → Tsunami หรือ Inferno → Grand Cross → Tsunami หรือ Inferno → Grand Cross\n"
     "ลงแล้วได้ debuff / รอบตัวคนร่ายมีลูกกลม: ลูกสีน้ำเงิน = ผลตามปกติ / ลูกแดงมี ? = ผลกลับกัน\n"
     "ดาเมจตอนลง 5 ครั้ง (Grand Cross 3 + Inferno / Tsunami 1 ครั้งละ) แรงมาก: mitigate ให้ครบไม่งั้นตาย\n"
     "(มี macro mitigate ของ kanatan ในช่อง macro ของคู่มือนี้)\n\n"
     "ระหว่าง Grand Cross 3 ครั้ง + Inferno / Tsunami: หลบการโจมตีพื้น 3 ครั้ง ช่วงยังไม่ชินดู debuff + กด mitigate จนเหยียบบ่อย",
     "This phase is just Grand Cross + Tsunami / Inferno + Kefka's floor attacks\n"
     "The plan comes from saki's slides, with team Poikos's plan as a reference\n\n"
     "Kefka casts Kefka Says: Neo Exdeath and Chaos appear at the edge\n"
     "Cast order: Grand Cross → Tsunami or Inferno → Grand Cross → Tsunami or Inferno → Grand Cross\n"
     "Each hit gives debuffs / orbs circle the caster: blue orb = the normal effect / red orb with ? = reversed\n"
     "The 5 hits (3 Grand Cross + one each of Inferno / Tsunami) are huge: full mitigation or you die\n"
     "(kanatan's mitigation macro is in this guide's macro box)\n\n"
     "During the 3 Grand Crosses + Inferno / Tsunami, dodge 3 floor attacks; new players often step in them while reading debuffs and pressing mitigation",
     refs=[FR("grand-cross", CLEAR, 761, "Grand Cross: ลูกกลมรอบคนร่าย น้ำเงิน = จริง / แดงมี ? = กลับกัน", "Grand Cross: orbs round the caster, blue = true / red with ? = reversed")])

step(P4, "Grand Cross", "debuff ทั้งหมด + จริง / หลอก", "Every debuff + true / false",
     "Acceleration Bomb: หมดเวลาต้องขยับ / ห้ามขยับ ผิด = ปลิวขึ้นฟ้า ตาย / จริง = ห้ามขยับ / ? = ต้องขยับ\n"
     "Compressed Water: จริง = stack / ? = AoE รับคนเดียว\n"
     "Forked Lightning: จริง = AoE รับคนเดียว / ? = stack\n"
     "(น้ำ / สายฟ้ามี Tank·Healer 1 + DPS 1 อย่างละชุดเร็ว ชุดช้า)\n"
     "ไฟ: หมดเวลาจองวงกลม (จริง) หรือ donut (?) ที่ที่ยืน แล้วลงตามมา: หลบออก / อยู่ที่เดิม\n"
     "น้ำ (ไอคอนคนสีฟ้า): จริง = donut / ? = วงกลม\n"
     "Cursed Shriek: จริง = มองแล้วกลายเป็นหิน (ห้ามมอง) / ? = ไม่มองแล้วกลายเป็นหิน (ต้องมอง)\n"
     "Black / White Wound: จริง = โดนสีเดียวกันตาย / ? = โดนสีต่างตาย\n"
     "Allagan Field: จริง = เก็บดาเมจที่โดนไว้ แล้วระเบิดใส่ทั้งปาร์ตี้ตามที่เก็บ / ? = ดีถ้าโดนเยอะ\n"
     "Beyond Death: จริง = หายเมื่อโดนดาเมจถึงตาย / ? = ดีถ้าไม่โดนดาเมจ\n\n"
     "ตารางคู่จริง–หลอก: Allagan Field จริง = Beyond Death หลอก (และกลับกัน) / Compressed Water จริง = Forked Lightning หลอก / White Wound จริง = Black Wound หลอก / ไฟจริง = น้ำหลอก",
     "Acceleration Bomb: when it ends you must move / must not move, wrong = launched into the sky, death / true = don't move / ? = move\n"
     "Compressed Water: true = stack / ? = a solo AoE\n"
     "Forked Lightning: true = a solo AoE / ? = stack\n"
     "(Water / lightning: one tank/healer + one DPS, each in an early and a late set)\n"
     "Fire: at the end a circle (true) or donut (?) is set where you stand, landing a beat later: step out / stay\n"
     "Water (blue figure icon): true = donut / ? = circle\n"
     "Cursed Shriek: true = looking petrifies (don't look) / ? = not looking petrifies (look)\n"
     "Black / White Wound: true = the same colour kills / ? = the other colour kills\n"
     "Allagan Field: true = stores damage taken and releases it on the party / ? = taking lots is good\n"
     "Beyond Death: true = removed by lethal damage / ? = taking no damage is good\n\n"
     "True–false pairs: true Allagan Field = false Beyond Death (and back) / true Compressed Water = false Forked Lightning / true White Wound = false Black Wound / true fire = false water")

step(P4, "Grand Cross", "ใครได้ debuff อะไร", "Who gets which debuff",
     "Grand Cross 1 กับ 2: Acceleration Bomb 4 คน / Forked Lightning Tank·Healer 1 + DPS 1 / Compressed Water Tank·Healer 1 + DPS 1 / Cursed Shriek Tank·Healer 1 + DPS 1\n"
     "คนละไม่เกิน 1 อันต่อชนิด (Bomb 1 / น้ำหรือสายฟ้า 1 / Shriek 1)\n"
     "debuff จาก Grand Cross 1 ไม่จำเป็นต้องลงก่อน / ธาตุต่างกันแยกเร็ว–ช้า: ดูเวลาตอนได้ว่าเป็นของชุด 1 หรือชุด 2\n"
     "Cursed Shriek: Grand Cross 1 = มองครั้งแรก / Grand Cross 2 = มองครั้งที่ 2 เสมอ\n"
     "Grand Cross 3: Allagan Field DPS 2 + Tank·Healer 2 / อีก 4 คน Beyond Death / ทุกคนได้ Black หรือ White Wound\n"
     "ระหว่าง Grand Cross มี Tsunami กับ Inferno: อันไหนมาก่อนสุ่ม แต่ลงเสมอ: ชุด 1 = debuff Inferno / ชุด 2 = Tsunami",
     "Grand Cross 1 and 2: Acceleration Bomb on 4 / Forked Lightning on 1 tank/healer + 1 DPS / Compressed Water on 1 tank/healer + 1 DPS / Cursed Shriek on 1 tank/healer + 1 DPS\n"
     "At most one of each kind per player (one Bomb / one water-or-lightning / one Shriek)\n"
     "Grand Cross 1's debuffs don't always go first / different elements split early and late: read the timer to know if it's set 1 or set 2\n"
     "Cursed Shriek: Grand Cross 1 = the first gaze / Grand Cross 2 = the second, always\n"
     "Grand Cross 3: Allagan Field on 2 DPS + 2 tanks/healers / Beyond Death on the other 4 / everyone gets Black or White Wound\n"
     "Tsunami and Inferno come between the Grand Crosses in random order, but resolve as: set 1 = Inferno's debuffs / set 2 = Tsunami's")

step(P4, "Grand Cross", "ลำดับ: ชุด 1 / ชุด 2", "The order: set 1 / set 2",
     "ชุด 1: Flood of Naught + Allagan / Beyond Death → spread 2 + stack 2 + Bomb 4 คน → Thundaga (พื้น) + มอง → วาง AoE ไฟ\n"
     "ชุด 2: Ultima → spread 2 + stack 2 + Bomb 4 คน + Blizzaga (พื้น) → มอง → วาง AoE น้ำ → Mana Release\n"
     "ที่ต้องระวังเป็นรายคน: Bomb / debuff spread (Forked Lightning จริง / Compressed Water หลอก) / Shriek\n"
     "Grand Cross 1 กับ 2 จริงหลอกเหมือนกัน: Bomb ทุกคนทำเหมือนกัน เรียกได้ (หลอกทั้งคู่ = ขยับทุกคน)",
     "Set 1: Flood of Naught + Allagan / Beyond Death → 2 spreads + 2 stacks + 4 Bombs → Thundaga (floor) + gaze → drop the fire puddles\n"
     "Set 2: Ultima → 2 spreads + 2 stacks + 4 Bombs + Blizzaga (floor) → gaze → drop the water puddles → Mana Release\n"
     "What to watch for yourself: Bomb / the spread debuff (true Forked Lightning / false Compressed Water) / Shriek\n"
     "If Grand Cross 1 and 2 have the same truth, all Bombs act alike and can be called (both false = everyone moves)")

step(P4, "Flood of Naught", "① Flood of Naught: ยืนลำแสงสีไหน", "① Flood of Naught: which colour beam",
     "หลัง Grand Cross 3 รับ Flood of Naught ก่อน\n"
     "หน้า Neo Exdeath ตายทันทีเสมอ ไม่ว่ามี debuff อะไร (Beyond Death ก็ไม่รอด)\n\n"
     "Allagan Field → ยืนลำแสงสีต่างจาก Wound / Beyond Death → ลำแสงสีเดียวกัน\n"
     "ถ้าลำแสงหลอก (มี ?): กลับกัน: Allagan Field → สีเดียวกัน / Beyond Death → สีต่าง\n"
     "โดนแล้วสักพัก debuff ทำงานเฉลย: ใครผิดตาย และ debuff ที่ถือระเบิดใส่คนอื่น wipe\n"
     "Beyond Death จริง / Allagan หลอก: โดนแล้ว HP 1: DPS ใช้ Second Wind ทุกครั้ง\n"
     "รับลำแสงแล้วไม่ต้องรอเฉลย รีบไปที่ยืนชุด 1",
     "After Grand Cross 3, take Flood of Naught first\n"
     "Neo Exdeath's front always kills, whatever your debuffs (even Beyond Death)\n\n"
     "Allagan Field → stand in the beam of the other colour from your Wound / Beyond Death → the same colour\n"
     "If the beam is false (?): reversed: Allagan Field → same colour / Beyond Death → other colour\n"
     "A little later the debuffs check: whoever is wrong dies and their debuffs blow up the party\n"
     "True Beyond Death / false Allagan: the hit leaves you at 1 HP: DPS, always Second Wind\n"
     "Don't wait for the check: head to your set-1 spot",
     strict=False, pic="p4-07", scene=S45.p4_07(),
     refs=[FR("flood-naught", CLEAR, 806, "Flood of Naught: ลำแสง 2 สีจาก Neo Exdeath หน้าบอสตายทันที", "Flood of Naught: two-colour beams from Neo Exdeath; its front kills")])

step(P4, "Grand Cross", "② ชุด 1: stack / spread รอบตำแหน่ง Neo Exdeath + Bomb", "② Set 1: stacks / spreads around Neo Exdeath's spot + Bombs",
     "ตัวอย่างต่อไป: Grand Cross 1 จริง (debuff เร็ว + มองครั้งแรก) / Grand Cross 2 หลอก (debuff ช้า + มองครั้งที่ 2)\n"
     "ชุด 1 ใช้ตำแหน่งที่ Neo Exdeath อยู่เป็น 12 นาฬิกา (ภาพ: Neo Exdeath ที่ marker 2)\n"
     "stack Tank·Healer 12 นาฬิกา / stack DPS 6 นาฬิกา\n"
     "spread Tank·Healer 10 หรือ 2 นาฬิกา / spread DPS 4 หรือ 8 นาฬิกา\n"
     "(แบ่งซ้าย–ขวาตามที่ที่ตัวเองรับลำแสง Neo Exdeath)\n"
     "ตอนนี้ Bomb ชุดเร็ว 4 คนทำงาน: ขยับ / ไม่ขยับ",
     "Example from here: Grand Cross 1 true (early debuffs + first gaze) / Grand Cross 2 false (late debuffs + second gaze)\n"
     "Set 1 takes Neo Exdeath's position as 12 o'clock (picture: Neo Exdeath at marker 2)\n"
     "Tank/healer stack at 12 / DPS stack at 6\n"
     "Tank/healer spread at 10 or 2 / DPS spread at 4 or 8\n"
     "(Left or right by where you took Neo Exdeath's beam)\n"
     "The 4 early Bombs go off now: move / don't move",
     strict=False, pic="p4-09", scene=S45.p4_09())

step(P4, "Cursed Shriek", "③ มอง + Thundaga", "③ Gaze + Thundaga",
     "คนมี Shriek ชุดเร็ว ไปกลางสนามไม่ว่าจริงหรือหลอก\n"
     "ตอนนี้ Kefka ร่าย Thundaga: จริง / หลอก แล้วไปที่ที่ถูก\n"
     "Thundaga นี้โดน Mana Charge เก็บไว้: จำว่าจริงหรือหลอก\n\n"
     "Shriek จริง: ทุกคนหันออกนอก / หลอก: ทุกคนหันเข้าใน\n"
     "ตอนหลอกระวัง 2 จุด: คนถือ Shriek ต้องมองอีกคนที่ถือด้วย: หันไปหาอีกคน\n"
     "อีก 6 คนต้องมองทั้ง 2 คน: ยืนจมในตัวบอสอาจมองไม่เห็นคนหนึ่ง\n"
     "พลาดมองจนเป็นหิน: หาย 2 วิ ไม่ตาย ทำต่อได้ อย่าเพิ่งท้อ",
     "The early Shriek holders go to the middle, true or false\n"
     "Kefka casts Thundaga now: read true / false and go to the right place\n"
     "This Thundaga is stored by Mana Charge: remember whether it was true\n\n"
     "True Shriek: everyone faces out / false: everyone faces in\n"
     "Two traps when false: each Shriek holder must look at the other: face them\n"
     "The other 6 must see both: standing inside the boss can hide one\n"
     "If you do get petrified it lasts 2 s and doesn't kill: carry on",
     strict=False, pic="p4-10", scene=S45.p4_10(),
     refs=[FR("shriek", CLEAR, 825, "Cursed Shriek: คนถือไปกลาง จริง = หันออก / หลอก = หันเข้า", "Cursed Shriek: holders in the middle; true = face out / false = face in")])

step(P4, "Inferno", "④ ไฟ: ขยับออกไปทางที่ต่อไป", "④ Fire: step out towards your next spot",
     "ไฟ (จริง = วงกลม): debuff หายแล้วขยับทันที หลบไปทางที่ stack / spread ถัดไป\n"
     "ขยับแล้ว Ultima ลง: อย่าไปไกลเกิน heal ไม่ถึงตาย\n"
     "donut: ก็ขยับเข้าไปทางที่ถัดไปในวง donut\n"
     "ฟื้น HP หลัง Ultima: ก่อน Bomb ชุดถัดไปมีเวลาไม่มาก Healer ยังไม่ชินอาจไม่ทัน: ใครเหลือ Second Wind ใช้ที่นี่ หรือ Bloodbath",
     "Fire (true = circle): move the moment the debuff ends, out towards your next stack / spread\n"
     "Ultima lands as you move: don't go too far or heals won't reach you\n"
     "A donut: also drift towards your next spot inside it\n"
     "Ultima recovery: there's little time before the next Bombs and new healers may not make it: use Second Wind here if you still have it, or Bloodbath",
     strict=False, pic="p4-11", scene=S45.p4_11())

step(P4, "Grand Cross", "⑤ ชุด 2: stack / spread + Blizzaga + Bomb", "⑤ Set 2: stacks / spreads + Blizzaga + Bombs",
     "ชุด 2: Blizzaga มาพร้อมกัน: ทำ stack / spread ในที่ปลอดภัยของ Blizzaga\n"
     "Bomb ก็มาพร้อม: ขยับ / ไม่ขยับ\n"
     "Blizzaga นี้ก็โดน Mana Charge เก็บไว้: จำไว้ (ภาพ: จริง)\n"
     "ตามภาพ: stack Tank·Healer เหนือ คน spread ไปตะวันตก / stack DPS ใต้ คน spread ไปตะวันออก\n"
     "ลังเลหลบ Blizzaga นาน Bomb จะเฉียดฉิว",
     "Set 2: Blizzaga comes with it: do the stacks / spreads in Blizzaga's safe area\n"
     "The Bombs come too: move / don't move\n"
     "This Blizzaga is also stored by Mana Charge: remember it (true in the picture)\n"
     "As drawn: tank/healer stack north, their spreader west / DPS stack south, their spreader east\n"
     "Hesitating over Blizzaga cuts the Bomb timing fine",
     strict=False, pic="p4-12", scene=S45.p4_12())

step(P4, "Cursed Shriek", "⑥ มองครั้งที่ 2", "⑥ The second gaze",
     "แค่ทำมองอย่างเดียว\n"
     "คนถือ Shriek ไปกลาง มอง / ไม่มอง",
     "Only the gaze\n"
     "Shriek holders to the middle, look / don't look",
     strict=False, pic="p4-13", scene=S45.p4_13())

step(P4, "Mana Release", "⑦ น้ำ + Mana Release", "⑦ Water + Mana Release",
     "รวมกลางสนามวาง AoE น้ำ: จริง = donut / หลอก = วงกลม\n"
     "บอสร่าย Mana Release: ปล่อย Blizzaga กับ Thundaga ที่เก็บไว้ตอน Mana Charge\n"
     "Mana Release ก็มีจริง / หลอก: เก็บหลอก + ปล่อยหลอก = จริง\n"
     "(ภาพ: เก็บจริงทั้งคู่ / ปล่อยหลอกทั้งคู่ = ต้องเหยียบทั้งสอง)\n\n"
     "จบแล้ว mechanic หมด หมดเวลาทันที\n"
     "HP บอสไม่ต่ำกว่า 25%: บอสหายไป หมดเวลา / ต่ำกว่า 25%: บอสร่าย Ultima Upsurge เข้า P5",
     "Gather in the middle to drop the water puddles: true = donut / false = circle\n"
     "The boss casts Mana Release: it lets out the Blizzaga and Thundaga stored by Mana Charge\n"
     "Mana Release has a truth too: stored false + released false = true\n"
     "(Picture: both stored true / both released false = stand in both)\n\n"
     "That ends the mechanics; time runs out right after\n"
     "Boss not under 25%: it goes untargetable, time out / under 25%: it casts Ultima Upsurge and P5 begins",
     strict=False, pic="p4-14", scene=S45.p4_14(),
     refs=[FR("mana-release", CLEAR, 853, "Mana Release: ปล่อย Blizzaga / Thundaga ที่เก็บไว้ ดูจริง / หลอก", "Mana Release: the stored Blizzaga / Thundaga come out; read true / false")])

# ======================================================================================= P5
step(P5, "Ultima Repeater", "raid-wide 4 ครั้งติด", "Four raid-wides in a row",
     "raid-wide แรงมาก 4 ครั้งเร็วมาก: ครั้งละราวแสนกว่า แต่ลง 4 ครั้งใน 2 วิ\n"
     "mitigate ให้ครบ",
     "Four very heavy raid-wides, very fast: a little over 100k each, 4 hits in 2 s\n"
     "Full mitigation",
     refs=[FR("ultima-repeater", CLEAR, 909, "Ultima Repeater: raid-wide 4 ครั้งใน 2 วิ", "Ultima Repeater: four raid-wides in 2 s")])

step(P5, "Fell Forces", "auto-attack: Tank A / Healer 4 / DPS 3", "Auto-attacks: tanks A / healers 4 / DPS 3",
     "auto-attack ลงที่ aggro อันดับ 1 + Healer สุ่ม 1 + DPS สุ่ม 1\n"
     "ของ aggro อันดับ 1 วงแคบกว่าแต่แรงมาก (Tank แชร์ 2 คนแล้วยังราว 440,000)\n"
     "ของ Healer = stack 2 คน / ของ DPS = stack 4 คน\n"
     "มีรับดาเมจเวทเพิ่ม: โดนเกิน 1 อัน = ตาย\n"
     "Tank ที่ A / Healer ที่ marker 4 (ตะวันตกเฉียงใต้) / DPS ที่ marker 3 (ตะวันออกเฉียงใต้)",
     "Auto-attacks hit enmity #1 + a random healer + a random DPS\n"
     "Enmity #1's is narrower but huge (about 440,000 even shared by both tanks)\n"
     "The healer's is a 2-person stack / the DPS one a 4-person stack\n"
     "Magic vulnerability: more than one = death\n"
     "Tanks at A / healers at marker 4 (SW) / DPS at marker 3 (SE)",
     says={"MT": "A คู่ ST", "ST": "A คู่ MT", "H1": "marker 4", "H2": "marker 4", "D1": "marker 3", "D2": "marker 3", "D3": "marker 3", "D4": "marker 3"},
     says_en={"MT": "A, with ST", "ST": "A, with MT", "H1": "Marker 4", "H2": "Marker 4", "D1": "Marker 3", "D2": "Marker 3", "D3": "Marker 3", "D4": "Marker 3"})

step(P5, "Flood", "Flood: 4 ชุดเส้นตรง", "Flood: four sets of lines",
     "สนามแบ่ง 4 แถวตั้ง 4 แถวนอน (เอียง)\n"
     "สัญลักษณ์เส้นตรงขึ้นเร็วมาก ครั้งละ 2 แถว เว้น 1 แถว: เช่น ตั้ง → ตั้ง → นอน → ตั้ง\n"
     "สัญลักษณ์แรกขึ้นราวๆ พร้อม auto-attack ครั้งที่ 3: ดูให้ดี\n"
     "ขึ้นครบ 4 ชุดแล้วสักพัก ลงตามลำดับที่ขึ้น",
     "The arena splits into 4 columns and 4 rows (diagonal)\n"
     "Line telegraphs appear very fast, 2 lanes at a time with one lane between: e.g. column → column → row → column\n"
     "The first appears about with the third auto-attack: watch closely\n"
     "After all 4 are shown they go off in the order they appeared",
     strict=False, pic="p5-03", scene=S45.p5_03(),
     refs=[FR("flood", CLEAR, 927, "Flood: สัญลักษณ์เส้นตรงขึ้น 4 ชุด แล้วลงตามลำดับ", "Flood: four sets of line telegraphs, then they fire in order")])

step(P5, "Flood", "หลบ: รอข้างแถว 1–2 แล้วเข้าแถวที่ลงแล้ว", "Dodge: wait beside lanes 1–2, then step into the spent lanes",
     "รอใกล้กลางสนาม ข้างแถวของสัญลักษณ์ 1 กับ 2\n"
     "ชุด 1 ลง → เข้าไปในแถวชุด 1 / ชุด 2 ลง → เข้าไปในแถวชุด 2 แค่นั้น ไม่ต้องเดินอีก\n"
     "ระหว่าง Flood ลงมี Chaotic Flood: stack 4 ครั้งติด\n"
     "ทั้ง 8 คนเริ่มจากที่ปลอดภัยใกล้กลางเดียวกัน แล้วเดินเหมือนกัน\n"
     "ที่รอเป็น 1 ใน 4 ทิศ: จำเป็น marker (ภาพ: D2 เริ่มที่ D)",
     "Wait near the middle beside the lanes of telegraphs 1 and 2\n"
     "Set 1 fires → step into set 1's lane / set 2 fires → step into set 2's lane; no more moving than that\n"
     "While Flood resolves Chaotic Flood hits: 4 stacks in a row\n"
     "All 8 start from the same safe spot near the middle and move together\n"
     "The waiting spot is one of four directions: remember it by marker (picture: D2 starts at D)",
     strict=False, pic="p5-04", scene=S45.p5_04())

step(P5, "Maddening Orchestra", "Maddening Orchestra: Flare / Holy", "Maddening Orchestra: Flare / Holy",
     "ไม่นานหลัง Flood บอสร่าย Maddening Orchestra\n"
     "ร่ายเสร็จ: ท่าแรงใส่ aggro อันดับ 1 และ 2 / อีก 6 คนสุ่ม 3 คนโดนวงกลม: ซ้อนกัน = ตาย (รับดาเมจเวทเพิ่ม)\n"
     "พร้อมกัน aggro 1 ได้ debuff Flare / aggro 2 ได้ debuff Holy (7 วิทั้งคู่)\n"
     "Flare: หมดเวลา ท่าแรงที่คนถือ + คนในระยะหนึ่งตายทันที (แรงลดตามระยะ)\n"
     "Holy: หมดเวลา stack 4 คน (ราว 320,000)\n"
     "ต่อด้วยวงกลมใส่ 3 คนที่ใกล้บอสที่สุด + ท่าแรงที่ Tank แชร์กัน\n\n"
     "ที่ spread กับ Tank คนไหนใช้ invuln 2 แผนต่างกัน: ดูแท็บ",
     "A beat after Flood the boss casts Maddening Orchestra\n"
     "When it ends: heavy hits on enmity #1 and #2 / 3 random of the other 6 take circles: overlapping = death (magic vulnerability)\n"
     "At once enmity #1 gets a Flare debuff / #2 a Holy debuff (7 s each)\n"
     "Flare: at the end a heavy hit on the holder + instant death within a range (falloff)\n"
     "Holy: at the end a 4-person stack (about 320,000)\n"
     "Then circles on the 3 nearest the boss + a heavy hit the tanks share\n\n"
     "The two plans differ in the spread and in which tank uses the invuln: see the tabs",
     refs=[FR("orchestra", CLEAR, 941, "Maddening Orchestra: spread แล้วรับ Flare / Holy", "Maddening Orchestra: spread, then Flare / Holy")])

step(P5, "Maddening Orchestra", "① spread", "① Spread",
     "spread ตามภาพ: MT ST เหนือ / D3 ตะวันตก D4 ตะวันออก / H1 ตะวันตก H2 ตะวันออก (ต่ำลงมา) / D1 D2 ใต้\n"
     "Tank 2 คนโดนท่าแรง / สุ่ม 3 คนโดนวงกลม (ภาพ: D3 H2 D2)",
     "Spread as drawn: MT ST north / D3 west D4 east / H1 west H2 east (lower) / D1 D2 south\n"
     "The two tanks take the heavy hits / 3 random take circles (picture: D3 H2 D2)",
     strict=True, pic="y125", scene=SY.y125(), plan=YAN,
     says={"MT": "เหนือ ซ้าย", "ST": "เหนือ ขวา", "D3": "ตะวันตก แถวบน", "D4": "ตะวันออก แถวบน", "H1": "ตะวันตก แถวล่าง", "H2": "ตะวันออก แถวล่าง",
           "D1": "ใต้ ซ้าย", "D2": "ใต้ ขวา"},
     says_en={"MT": "North, left", "ST": "North, right", "D3": "West, upper", "D4": "East, upper", "H1": "West, lower", "H2": "East, lower",
              "D1": "South, left", "D2": "South, right"})

step(P5, "Maddening Orchestra", "② Tank ซ้อนกันทางเหนือ / 3 คนที่ไม่โดนเข้าใกล้บอส", "② Tanks stack north / the 3 not hit step in",
     "Tank ซ้อนกันรับท่าแรงแชร์\n"
     "3 คนที่ไม่โดนวงกลมรอบแรก เข้าใกล้บอสล่อวงกลมรอบถัดไป (ภาพ: H1 D1 D4)",
     "The tanks stack and share the heavy hit\n"
     "The 3 not hit by the first circles step up to the boss to bait the next ones (picture: H1 D1 D4)",
     strict=["MT", "ST"], pic="y126", scene=SY.y126(), plan=YAN,
     says={"MT": "ซ้อน ST ทางเหนือ", "ST": "ซ้อน MT ทางเหนือ"}, says_en={"MT": "Stack with ST, north", "ST": "Stack with MT, north"})

step(P5, "Maddening Orchestra", "③ MT สลับแล้วรับ Holy ด้วย invuln / ST พา Flare ไปขอบ", "③ MT swaps and takes Holy with an invuln / ST takes Flare to the edge",
     "MT ใช้ Provoke สลับ aggro (บอสจะได้ไม่ขยับ) แล้วรับ Holy ด้วย invuln (เพราะทับกับ Flare)\n"
     "ST พา Flare ไปขอบนอกสุด\n"
     "(ภาพ: คนอื่นรอทางใต้)",
     "MT Provokes (so the boss doesn't move) and takes Holy with an invuln (as it overlaps Flare)\n"
     "ST takes Flare to the very edge\n"
     "(Picture: the others wait south)",
     strict=["MT", "ST"], pic="y127", scene=SY.y127(), plan=YAN,
     says={"MT": "Provoke แล้วรับ Holy ด้วย invuln", "ST": "พา Flare ไปขอบนอกสุด"},
     says_en={"MT": "Provoke, then take Holy with an invuln", "ST": "Take Flare to the very edge"})

step(P5, "Maddening Orchestra", "④ auto-attack 2 ครั้ง", "④ Two auto-attacks",
     "แล้ว auto-attack 2 ครั้ง (ภาพ: Tank เหนือ / Healer ตะวันตกเฉียงใต้ / DPS ตะวันออกเฉียงใต้)",
     "Then two auto-attacks (picture: tanks north / healers south-west / DPS south-east)",
     strict=True, pic="y128", scene=SY.y128(), plan=YAN)

step(P5, "Maddening Orchestra", "① spread", "① Spread",
     "spread ตามภาพ",
     "Spread as drawn",
     strict=True, pic="p5-05", scene=S45.p5_05(), plan=KAN)

step(P5, "Maddening Orchestra", "② วงกลมที่ Tank + 3 คน แล้วสลับ aggro", "② Circles on the tanks + 3 others, then swap",
     "ร่ายเสร็จ: Tank 2 คนโดนวงกลมแรง / อีก 3 คนโดนวงกลม\n"
     "รับครั้งแรกแล้วได้ debuff: Tank ใช้ Provoke สลับ aggro",
     "When it ends: the two tanks take heavy circles / 3 others take circles\n"
     "After the first hits, with the debuffs on: the tanks Provoke to swap",
     strict=False, pic="p5-06", scene=S45.p5_06(), plan=KAN)

step(P5, "Maddening Orchestra", "③ 3 คนใกล้บอส + Tank แชร์ทางเหนือ", "③ The 3 nearest the boss + the tanks share north",
     "ต่อจาก Flare / Holy / สลับ aggro: วงกลมใส่ 3 คนที่ใกล้บอสที่สุด + ท่าแรง stack 2 คนที่ aggro อันดับ 1 (น่าจะ)\n"
     "3 คนที่ไม่โดน Holy เมื่อกี้ เข้าไปในวงเป้าบอส รับวงกลมของ 3 คนใกล้สุด\n"
     "Tank ซ้อนกันทางเหนือ แชร์ท่าแรง\n"
     "Tank ห้ามเข้าวงเป้าบอสเด็ดขาด: จะกลายเป็น 1 ใน 3 คนใกล้สุด โดนทั้งท่าแรงทั้งวงกลม ตายได้",
     "After Flare / Holy / the swap: circles on the 3 nearest the boss + a 2-person heavy stack on enmity #1 (probably)\n"
     "The 3 not hit by Holy step inside the boss's target circle and take the 3 nearest circles\n"
     "The tanks stack north and share the heavy hit\n"
     "Tanks must never enter the target circle: they'd be one of the 3 nearest and take both, likely dying",
     strict=["MT", "ST"], pic="p5-08", scene=S45.p5_08(), plan=KAN,
     says={"MT": "ซ้อน ST ทางเหนือ นอกวงเป้าบอส", "ST": "ซ้อน MT ทางเหนือ นอกวงเป้าบอส"},
     says_en={"MT": "Stack with ST north, outside the target circle", "ST": "Stack with MT north, outside the target circle"})

step(P5, "Maddening Orchestra", "④ Flare ไปขอบเหนือ / Holy ใช้ invuln", "④ Flare to the north edge / Holy with an invuln",
     "3 คนใกล้สุด + stack จบแล้ว Tank ที่ถือ Flare รีบไปขอบเหนือ\n"
     "Tank ที่ถือ Holy อยู่หน้าบอสแล้วใช้ invuln (แชร์จริงเจ็บเกิน)\n"
     "ถ้าไม่ได้สลับ aggro เมื่อกี้ บอสจะเดินขึ้นเหนือ วุ่น\n"
     "อีก 6 คนรอทางใต้ ให้พ้นระยะ Flare จนลง\n\n"
     "ต่อด้วย auto-attack 2 ครั้งทันที: Healer กับ DPS ไปรอฝั่งที่จะรับ auto-attack ตั้งแต่ตอนรอทางใต้\n"
     "Tank: invuln จาก Holy ยังเหลือ ใช้รับ auto-attack (Living Dead รับได้ทั้ง 2 ครั้งถ้าเปิดก่อน debuff ทำงาน / invuln อื่นน่าจะได้ครั้งเดียว)\n"
     "auto-attack ของ Tank เจ็บมาก รับด้วย invuln ให้มากที่สุด\n"
     "หลังสลับแล้วปล่อย aggro ไว้แบบนั้น จนถึง Maddening Orchestra ครั้งถัดไปหลัง exaflare ค่อยสลับอีก",
     "After the 3-nearest and the stack, the Flare tank hurries to the north edge\n"
     "The Holy tank stays in front of the boss and uses an invuln (sharing it honestly hurts too much)\n"
     "Without the earlier swap the boss walks north and it gets messy\n"
     "The other 6 wait south, out of Flare's range, until it lands\n\n"
     "Two auto-attacks follow right away: healers and DPS already wait on their auto-attack side while south\n"
     "Tanks: the invuln from Holy is still up, use it for the autos (Living Dead can cover both if popped before the debuff goes / others probably one)\n"
     "The tank autos hurt a lot: take as many as possible under invuln\n"
     "Keep enmity as it is after the swap until the next Maddening Orchestra after the exaflares, then swap again",
     strict=["MT", "ST"], pic="p5-09", scene=S45.p5_09(), plan=KAN)

step(P5, "Celestriad", "Celestriad: tower 9 อัน 3 ธาตุ", "Celestriad: nine towers, three elements",
     "หลัง Orchestra → auto-attack 2 ครั้ง บอสร่าย Celestriad\n"
     "ร่ายเสร็จ tower 9 อันเป็นวง: น้ำแข็ง 3 / ไฟ 3 / สายฟ้า 3 (ธาตุละ 3 อันติดกัน วางธาตุสุ่ม)\n"
     "สีและไอคอนธาตุบน tower ดูง่าย\n"
     "สุ่ม 2 คนได้ Ice Resistance Down / 2 คน Fire / 2 คน Lightning (อีก 2 คนไม่ได้อะไร = คนว่าง)\n\n"
     "แต่ละรอบ tower สว่าง 4 อัน: ธาตุหนึ่ง 2 อัน + อีก 2 ธาตุอย่างละ 1\n"
     "tower สว่างแล้วสักพักทำงาน: stack 2 คน / ไม่มีคนเข้า = ระเบิด: ดาเมจ + ดาเมจที่ทำลดทุกคน",
     "After Orchestra → two auto-attacks the boss casts Celestriad\n"
     "Nine towers appear in a ring: 3 ice / 3 fire / 3 lightning (each element's three together, elements placed at random)\n"
     "Their colour and element icon make them easy to read\n"
     "2 random players get Ice Resistance Down / 2 Fire / 2 Lightning (the other 2 get nothing = idle)\n\n"
     "Each round 4 towers light: two of one element + one each of the other two\n"
     "A lit tower goes off a while later as a 2-person stack / nobody in it = explosion: damage + damage down on everyone",
     strict=False, pic="p5-11", scene=S45.p5_11(),
     refs=[FR("celestriad", CLEAR, 961, "Celestriad: tower 9 อัน ธาตุละ 3 สว่างรอบละ 4 อัน", "Celestriad: nine towers, three per element, four light each round")])

step(P5, "Celestriad", "รอบ 1: กติกาเข้า tower + Catastrophic Choice", "Round 1: the tower rule + Catastrophic Choice",
     "คนมี debuff: เข้า tower ของธาตุที่อยู่ถัดไปตามเข็มจากธาตุของ debuff ตัวเอง\n"
     "ถ้าธาตุนั้นสว่าง 2 อัน: เข้าอันแรกที่เจอเมื่อนับตามเข็ม\n"
     "คนว่าง: เข้า tower ของธาตุที่สว่าง 2 อัน อันฝั่งทวนเข็ม\n\n"
     "รอบ 1 บอสร่าย Catastrophic Choice ด้วย: บอสเรืองสีเขียว = donut / สีน้ำตาล = วงกลม\n"
     "ลงพร้อม tower รอบ 1: เขียว = ยืนด้านในของ tower / น้ำตาล = ยืนด้านนอกของ tower",
     "With a debuff: soak a tower of the element next clockwise from your debuff's element\n"
     "If that element has two lit: take the first one going clockwise\n"
     "Idle: take the counter-clockwise one of the element lit twice\n\n"
     "In round 1 the boss also casts Catastrophic Choice: glowing green = donut / brown = circle\n"
     "It lands with the round-1 towers: green = stand on the inner side of your tower / brown = the outer side",
     strict=False, pic="p5-12", scene=S45.p5_12(),
     refs=[FR("catastrophe", CLEAR, 974, "Catastrophic Choice: บอสสีเขียว = donut / สีน้ำตาล = วงกลม", "Catastrophic Choice: green boss = donut / brown = circle")])

step(P5, "Celestriad", "รอบ 1 แบบสีเขียว: ยืนด้านใน", "Round 1, green: the inner side",
     "ภาพเป็นแบบสีเขียว (donut): ทุกคนยืนด้านในของ tower ตัวเอง",
     "Drawn for green (donut): everyone on the inner side of their tower",
     strict=False, pic="p5-15", scene=S45.p5_15())

step(P5, "Celestriad", "รอบ 2", "Round 2",
     "ต่อทันที: ธาตุหนึ่งใน 2 ธาตุที่รอบ 1 สว่างอันเดียว สว่าง 2 อัน / อีก 2 ธาตุอย่างละ 1\n"
     "คนมี debuff: เข้า tower ของธาตุถัดไปตามเข็มจาก tower ที่เพิ่งเข้า\n"
     "ธาตุนั้นสว่าง 2 อัน: คนมี debuff เข้าอันฝั่งตามเข็ม\n"
     "คนว่าง: เข้าอันฝั่งทวนเข็มของธาตุที่สว่าง 2 อันอีกครั้ง\n"
     "รอบ 2 มีแค่ tower",
     "Straight after: one of the two elements lit once in round 1 now lights twice / the other two once each\n"
     "With a debuff: the element next clockwise from the tower you just took\n"
     "If that element has two lit: the debuffed player takes the clockwise one\n"
     "Idle: the counter-clockwise one of the double element, again\n"
     "Round 2 is towers only",
     strict=False, pic="p5-16", scene=S45.p5_16())

step(P5, "Celestriad", "รอบ 3 + Catastrophic Choice", "Round 3 + Catastrophic Choice",
     "รอบสุดท้าย: ธาตุที่ยังสว่างอันเดียวมาตลอด สว่าง 2 อัน / อีก 2 ธาตุอย่างละ 1 (เข้าแบบเดิม)\n"
     "บอสร่าย Catastrophic Choice อีกครั้ง: ดูสีแล้วยืนนอก / ในของ tower ให้ถูก\n"
     "สีของ 2 ครั้งไม่จำเป็นต้องต่างกัน (น้ำตาล–น้ำตาลก็มี)\n\n"
     "ต่อด้วย Ultima Repeater → auto-attack 2 ครั้ง: mitigate ให้ดี",
     "Last round: the element lit only once so far lights twice / the other two once each (same rules)\n"
     "The boss casts Catastrophic Choice again: read the colour and stand outside / inside your tower\n"
     "The two colours needn't differ (brown–brown happens)\n\n"
     "Then Ultima Repeater → two auto-attacks: mitigate well",
     strict=False, pic="p5-17", scene=S45.p5_17())

step(P5, "Stray Apocalypse", "exaflare: เริ่มจากตะวันตกเฉียงเหนือ", "Exaflares: from the north-west first",
     "exaflare เร็วมาก\n"
     "สัญลักษณ์ขึ้น 2 แถวใน 6 แถวจากตะวันตกเฉียงเหนือไปตะวันออกเฉียงใต้ (สัญลักษณ์ขึ้นที่ตะวันตกเฉียงเหนือ) แล้ววิ่งเข้ามาเร็วกว่าที่เคยเจอ\n"
     "ต่อด้วย 2 แถวใน 6 แถวจากตะวันออกเฉียงเหนือไปตะวันตกเฉียงใต้\n"
     "สลับตะวันตกเฉียงเหนือ ↔ ตะวันออกเฉียงเหนือ: จากแต่ละฝั่ง 3 ครั้ง รวม 6 ครั้ง\n"
     "2 แถวที่ขึ้นมีช่องว่าง 1 แถวระหว่างกันเสมอ",
     "Very fast exaflares\n"
     "Telegraphs appear on 2 of the 6 north-west → south-east lanes (shown at the north-west) and rush in faster than ever\n"
     "Then 2 of the 6 north-east → south-west lanes\n"
     "Alternating north-west ↔ north-east: 3 from each side, 6 in all\n"
     "The two lanes always have one lane's gap between them",
     strict=False, pic="p5-19", scene=S45.p5_19(),
     refs=[FR("exaflare", CLEAR, 1013, "Stray Apocalypse: exaflare 2 แถวต่อครั้ง สลับตะวันตก–ตะวันออกเฉียงเหนือ", "Stray Apocalypse: two exaflare lanes each time, alternating NW and NE")])

step(P5, "Stray Apocalypse", "หลบ: เลื่อนตามแกนที่ว่าง + Stray Entropy", "Dodge: slide along the empty lanes + Stray Entropy",
     "ยืนในแกนที่ไม่มี exaflare แล้วเลื่อนขนานไปยังแกนที่จะปลอดภัยรอบถัดไป\n"
     "แต่ละคนหลบไม่เหมือนกัน: หลบแบบเดินเข้าหา exaflare จะง่ายกว่า (ตาม kanatan)\n"
     "ถ้าวาง marker ไว้ ใช้ marker เป็นเส้นแกนช่วยไม่ให้เบี้ยวไปทางเฉียงจนโดน\n"
     "สุดท้ายเป็นเรื่องฝีมือ หลบแบบที่ถนัด\n\n"
     "ราวครั้งที่ 5 บอสร่าย Stray Entropy: วงกลมใส่ทุกคน (spread)\n"
     "ลงหลังหลบ exaflare ครบไม่นาน: spread แบบคิดว่าจะไปที่ spread ของ Maddening Orchestra (เป็นแค่ประมาณ ขอให้ห่างกันพอ)\n"
     "ตอนเริ่มร่าย exaflare ยังไม่จบ: รีบ spread จะโดน exaflare / หลบครบ 6 ครั้งก่อนแล้วค่อย spread",
     "Stand in a lane without exaflares and slide parallel to the lane that will be safe next\n"
     "Everyone dodges differently: moving towards the exaflares is easier (kanatan's view)\n"
     "If your markers allow, use them as lane guides so you don't drift diagonally into a hit\n"
     "In the end it's execution: dodge the way that suits you\n\n"
     "Around the 5th the boss casts Stray Entropy: a circle on everyone (spread)\n"
     "It lands shortly after the last exaflare: spread as if heading for your Maddening Orchestra spot (roughly; just keep apart)\n"
     "When the cast starts the exaflares aren't over: spreading early gets you hit / dodge all 6 first, then spread",
     strict=False, pic="p5-20", scene=S45.p5_20())

step(P5, "Maddening Orchestra", "ครั้งที่ 2: spread แบบเดิม / MT ถือ aggro อันดับ 1", "Second time: the same spread / MT holds enmity #1",
     "หลัง Stray Entropy: Maddening Orchestra อีกครั้ง ทำเหมือนครั้งแรก\n"
     "แต่ครั้งนี้ ST เป็นคนใช้ invuln: MT ถือ aggro อันดับ 1 ไว้ (จะได้ Flare)\n"
     "spread ตามภาพ (ภาพ: วงกลมสุ่มลง D4 D1 D2)",
     "After Stray Entropy: Maddening Orchestra again, done as the first\n"
     "But this time ST uses the invuln: MT keeps enmity #1 (to get Flare)\n"
     "Spread as drawn (picture: the random circles on D4 D1 D2)",
     strict=True, pic="y135", scene=SY.y135(), plan=YAN,
     says={"MT": "ถือ aggro อันดับ 1 ไว้", "ST": "aggro อันดับ 2: ครั้งนี้ใช้ invuln"},
     says_en={"MT": "Keep enmity #1", "ST": "Enmity #2: your invuln this time"})

step(P5, "Maddening Orchestra", "Tank ซ้อนกันทางเหนือ / 3 คนที่ไม่โดนเข้าใกล้บอส", "Tanks stack north / the 3 not hit step in",
     "เหมือนครั้งแรก (ภาพ: D3 H1 H2 เข้าใกล้บอส)",
     "As the first time (picture: D3 H1 H2 step in)",
     strict=["MT", "ST"], pic="y136", scene=SY.y136(), plan=YAN)

step(P5, "Maddening Orchestra", "ST รับ Holy ด้วย invuln / MT พา Flare ไปขอบ", "ST takes Holy with an invuln / MT takes Flare to the edge",
     "ครั้งนี้ ST รับ Holy ด้วย invuln / MT พา Flare ไปขอบนอกสุด\n"
     "(ภาพ: คนอื่นรอทางใต้)",
     "This time ST takes Holy with an invuln / MT takes Flare to the very edge\n"
     "(Picture: the others wait south)",
     strict=["MT", "ST"], pic="y137", scene=SY.y137(), plan=YAN,
     says={"MT": "พา Flare ไปขอบนอกสุด", "ST": "รับ Holy ด้วย invuln"},
     says_en={"MT": "Take Flare to the very edge", "ST": "Take Holy with an invuln"})

step(P5, "Maddening Orchestra", "auto-attack 3 ครั้ง", "Three auto-attacks",
     "แล้ว auto-attack 3 ครั้ง (ภาพ: Tank เหนือ / Healer ตะวันตกเฉียงใต้ / DPS ตะวันออกเฉียงใต้)",
     "Then three auto-attacks (picture: tanks north / healers south-west / DPS south-east)",
     strict=True, pic="y138", scene=SY.y138(), plan=YAN)

step(P5, "Maddening Orchestra", "Maddening Orchestra ครั้งที่ 2", "The second Maddening Orchestra",
     "หลัง Stray Entropy: Maddening Orchestra อีกครั้ง\n"
     "เหมือนครั้งแรก: ได้ debuff แล้วสลับ aggro / Holy ให้ Tank รับด้วย invuln\n"
     "หลัง Orchestra auto-attack 3 ครั้ง เจ็บมาก mitigate ให้ดี",
     "After Stray Entropy: Maddening Orchestra again\n"
     "As the first: swap once the debuffs are out / the Holy tank takes it with an invuln\n"
     "Three auto-attacks follow, very heavy: mitigate well",
     plan=KAN)

step(P5, "Forsaken Null", "Forsaken Null: raid-wide ไม่หยุด + หนีพื้น", "Forsaken Null: endless raid-wides + dodging puddles",
     "raid-wide แรงมาก ต่อเนื่อง\n"
     "ร่าย Forsaken เสร็จ raid-wide ราว 370,000–380,000 + ได้สัญลักษณ์ stack\n"
     "พื้นมี AoE วงกลมสีส้ม (มองเห็น) กับสัญลักษณ์วงกลมสีม่วง สักพัก stack กับ AoE ลงพร้อมกัน / stack ราว 300,000\n"
     "สีม่วงลงแล้วกลายเป็นหลุมดำสนิท: แตะ = ตายทันที + debuff ห้ามชุบ (ขอบม่วงรอบๆ อาจตายด้วย)\n"
     "สีส้มน่าจะสุ่มรอบๆ 8 ทิศที่คนยืนอยู่ (kanatan เดา)\n"
     "stack ลงแล้วสัญลักษณ์ stack ถัดไปขึ้นทันที / 3 วิหลัง stack มี Forsaken ไม่ร่าย (raid-wide เกือบ 300,000)\n"
     "สรุป: เดินหลบพื้นส้มไปพร้อมดาเมจราว 300,000 ทุก 3–4 วิ\n\n"
     "ตั้งกติกาเดินในปาร์ตี้ให้ชัด (yan-flash 1 แบบ / kanatan 2 แบบ: ดูแท็บ)\n"
     "หลุมดำที่ขอบสนามกับวงดำกลางสนามยังมีช่องให้ผ่าน แต่แคบ อันตราย\n"
     "และอย่าลืม mitigate: ขาดเมื่อไรตายทันที",
     "Heavy raid-wides, back to back\n"
     "Forsaken ends with a raid-wide of about 370,000–380,000 + a stack marker\n"
     "Visible orange circles and purple circle telegraphs appear on the floor; the stack and the AoEs land together / the stack is about 300,000\n"
     "A purple one becomes a pitch-black hole: touching it = instant death + a no-raise debuff (the purple rim may kill too)\n"
     "The orange ones seem to spawn around the 8 directions where players stand (kanatan's guess)\n"
     "As a stack lands the next stack marker appears at once / 3 s after each stack an uncast Forsaken hits (nearly 300,000)\n"
     "So: dodge orange puddles while about 300,000 lands every 3–4 s\n\n"
     "Set a clear movement rule in the party (yan-flash gives one, kanatan two: see the tabs)\n"
     "A hole at the edge still leaves a gap to the black circle in the middle, but it's narrow and risky\n"
     "And never forget mitigation: missing one is an instant wipe",
     refs=[FR("forsaken-null", CLEAR, 1098, "Forsaken Null: stack + พื้นส้ม / ม่วงกลายเป็นหลุมดำ แตะแล้วตาย", "Forsaken Null: stacks + orange puddles / purple turns into black holes that kill")])

step(P5, "Forsaken Null", "รอที่ marker 2 แล้วเลื่อนตามเข็มทีละ 90°", "Wait at marker 2, then move 90° clockwise each time",
     "รอที่ marker 2 (ตะวันออกเฉียงเหนือ)\n"
     "เห็นสัญลักษณ์ stack แล้วเลื่อนตามเข็ม 90° (ภาพ: 2 → 3)\n\n"
     "หลุมของ Forsaken Null: ครั้งแรกที่กลางสนามกับ marker ตัวเลข / ครั้งที่ 2 ที่ marker ตัวเลข 2 จุด / "
     "ครั้งที่ 3 ที่ marker ตัวเลข 1 จุด + ทิศหลัก 1 จุด / ครั้งที่ 4 เหลือที่ปลอดภัยแค่ทิศหลักเดียว",
     "Wait at marker 2 (north-east)\n"
     "When the stack marker shows, move 90° clockwise (picture: 2 → 3)\n\n"
     "Forsaken Null's holes: first at the centre and the number markers / second at two number markers / "
     "third at one number marker + one cardinal / fourth: only one cardinal is left safe",
     strict=False, pic="y139", scene=SY.y139(), plan=YAN)

step(P5, "Forsaken Null", "เลื่อนตามเข็ม 90° อีกครั้ง", "Another 90° clockwise",
     "เห็นสัญลักษณ์ stack แล้วเลื่อนตามเข็ม 90° อีกครั้ง (ภาพ: 3 → 4)",
     "When the stack marker shows, move 90° clockwise again (picture: 3 → 4)",
     strict=False, pic="y140", scene=SY.y140(), plan=YAN)

step(P5, "Forsaken Null", "อีกครั้ง: หลุมขึ้นขวางก็กระโดดข้ามไป", "Again: jump over a hole if one appears",
     "เห็นสัญลักษณ์ stack แล้วเลื่อนตามเข็ม 90° (ภาพ: 4 → 1)\n"
     "หลุมขึ้นขวางแล้วก็กระโดดข้ามไปได้",
     "When the stack marker shows, move 90° clockwise (picture: 4 → 1)\n"
     "Even if a hole forms in the way, jump over it",
     strict=False, pic="y141", scene=SY.y141(), plan=YAN)

step(P5, "Forsaken Null", "ครั้งสุดท้าย: วิ่งเข้าที่ที่ปลอดภัย", "The last: run into the safe spot",
     "เห็นสัญลักษณ์ stack ครั้งสุดท้าย: วิ่งเข้าที่ที่ยังปลอดภัย (ภาพ: 1 → 2)",
     "At the last stack marker run into the spot that is still safe (picture: 1 → 2)",
     strict=False, pic="y142", scene=SY.y142(), plan=YAN)

step(P5, "Forsaken Null", "ตัวเลข → ตัวอักษร", "Number → letter",
     "แบบที่ static ของ kanatan ใช้ เพื่อไม่ต้องเดินผ่านที่แคบ\n"
     "บอสเริ่มร่าย Forsaken: ทุกคนรวมที่ A\n"
     "แล้วไปที่ marker ตัวเลขที่ไม่มีสัญลักษณ์ม่วง\n"
     "stack ที่ตัวเลข แล้วไป marker ตัวอักษร\n"
     "พื้นส้มขึ้นใต้เท้า: ไปฝั่งที่ว่างกว้าง / พื้นส้มขึ้นที่อื่น: ไปฝั่งที่ไม่มีส้ม\n"
     "stack ที่ตัวเลข แล้วไปตัวอักษร ... วนแบบนี้\n\n"
     "หลักสำคัญ: ห้ามไปทางพื้นส้มที่ขึ้นที่ marker ตัวเลข\n"
     "stack ที่ตัวเลข → ไปตัวอักษร ให้ได้ทุกครั้ง: ไม่พลาด stack",
     "The way kanatan's static used, so nobody has to squeeze through narrow gaps\n"
     "When the boss starts casting Forsaken: everyone gathers at A\n"
     "Then go to a number marker with no purple telegraph\n"
     "Stack at the number, then move to a letter marker\n"
     "Orange under you: go to the wider side / orange elsewhere: go to the side without orange\n"
     "Stack at a number, then a letter ... and repeat\n\n"
     "The key: never head towards an orange puddle on a number marker\n"
     "Always stack on a number → move to a letter: no stack is missed",
     plan=("kanatan: ตัวเลข → ตัวอักษร", "kanatan: number → letter"))

step(P5, "Forsaken Null", "ตามเข็มตลอด", "Clockwise all the way",
     "บอสเริ่มร่าย Forsaken: ทุกคนรวมที่ A\n"
     "ถ้าไม่กลัวช่องแคบ: จากจุดเริ่มเดินตามเข็มไปเรื่อยๆ ก็ได้\n"
     "ใช้ได้ตราบที่สีม่วงที่ขึ้นในโซนกากบาทรอบที่ 3 ไม่ขวางทางที่จะเดินไป",
     "When the boss starts casting Forsaken: everyone gathers at A\n"
     "If narrow gaps don't bother you: from the start just keep going clockwise\n"
     "It works as long as the purple that appears in the cross area on the 3rd doesn't block your way",
     plan=("kanatan: ตามเข็มตลอด", "kanatan: clockwise"))

# ======================================================================================= guide
NOTE = ("มี 2 แผน: yan-flash.com เป็นแผนแรก / kanatan.info (บล็อกของ kanata) แผนที่ 2\n"
        "ท่าที่ทำต่างกันมีแท็บ (yan-flash ก่อน) / ไม่มีแท็บ = ทำเหมือนกัน\n"
        "คอมเมนต์ใน yan-flash บอกว่า PF ญี่ปุ่นส่วนใหญ่ใช้ yan-flash ใน P1–P3 และ kanatan ใน P4 (คำของคนคอมเมนต์ ไม่ได้ยืนยัน)\n"
        "kanatan: จากสไลด์ของ saki / P3 ครึ่งแรกปรับจากทีม NOCCHH / P4–P5 อ้างอิง Poikos\n"
        "Marker: A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก / 1 2 3 4 = ตะวันตกเฉียงเหนือ ไล่ตามเข็ม\n\n"
        "P1 (ทั้ง 2 แผน): Tank·Healer ตะวันตก / DPS ตะวันออก\n"
        "แถว Wave Cannon (ตก → ออก): H2 > H1 > ST > MT > D1 > D2 > D3 > D4\n"
        "ที่ spread Vitrophyre: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
        "ต้องได้ flag ของ Kefka ใน P1 (Trap / พื้นดำ / ลูกศร) ไม่งั้นไม่มี P3\n\n"
        "P2 Forsaken: yan-flash คู่ MT·H1 / ST·H2 / D1·D3 / D2·D4 ลำดับ Healer > Tank > Melee > Ranged · kanatan ลำดับ H1 > MT > ST > H2 / D1 > D2 > D3 > D4\n"
        "tower ทั้ง 2 แผน: 1 2 3 8 กับ 4 5 6 7\n\n"
        "P3 กลุ่ม Chaos / Exdeath: yan-flash ST H2 D1 D2 / MT H1 D3 D4 · kanatan MT H1 D1 D2 / ST H2 D3 D4\n\n"
        "P5 auto-attack: Tank A / Healer 4 / DPS 3")
NOTE_EN = ("Two plans: yan-flash.com first / kanatan.info (kanata's blog) second\n"
           "Tabs where they differ (yan-flash first) / no tabs = played the same\n"
           "Commenters on yan-flash say most Japanese PF runs yan-flash for P1–P3 and kanatan for P4 (their word, not confirmed)\n"
           "kanatan: from saki's slides / P3 first half adapted from team NOCCHH / P4–P5 after team Poikos\n"
           "Waymarks: A north / B east / C south / D west / 1 2 3 4 = north-west, then clockwise\n\n"
           "P1 (both plans): tanks/healers west / DPS east\n"
           "Wave Cannon line (west → east): H2 > H1 > ST > MT > D1 > D2 > D3 > D4\n"
           "Vitrophyre spots: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
           "Kefka's P1 flag (Trap / puddles / arrows) is needed for P3\n\n"
           "P2 Forsaken: yan-flash pairs MT·H1 / ST·H2 / D1·D3 / D2·D4, priority healer > tank > melee > ranged / kanatan priority H1 > MT > ST > H2 / D1 > D2 > D3 > D4\n"
           "Towers in both: 1 2 3 8 and 4 5 6 7\n\n"
           "P3 Chaos / Exdeath groups: yan-flash ST H2 D1 D2 / MT H1 D3 D4 · kanatan MT H1 D1 D2 / ST H2 D3 D4\n\n"
           "P5 auto-attacks: tanks A / healers 4 / DPS 3")

WEAPONS = [("Palazzo Diamond Sword", "PLD", "030000/030706"), ("Palazzo Diamond Shield", "PLD", "030000/030295"),
           ("Palazzo Diamond Axe", "WAR", "031000/031280"), ("Palazzo Diamond Greatsword", "DRK", "034000/034035"),
           ("Palazzo Diamond Bayonet", "GNB", "036000/036127"), ("Palazzo Diamond Cane", "WHM", "032000/032501"),
           ("Palazzo Diamond Codex", "SCH", "037000/037862"), ("Palazzo Diamond Sextant", "AST", "034000/034728"),
           ("Palazzo Diamond Wings", "SGE", "037000/037093"), ("Palazzo Diamond Knuckles", "MNK", "030000/030870"),
           ("Palazzo Diamond Halberd", "DRG", "031000/031682"), ("Palazzo Diamond Daggers", "NIN", "033000/033656"),
           ("Palazzo Diamond Katana", "SAM", "036000/036584"), ("Palazzo Diamond War Scythe", "RPR", "037000/037297"),
           ("Palazzo Diamond Saberfangs", "VPR", "037000/037460"), ("Palazzo Diamond Bow", "BRD", "032000/032070"),
           ("Palazzo Diamond Musketoon", "MCH", "034000/034529"), ("Palazzo Diamond Chakrams", "DNC", "036000/036326"),
           ("Palazzo Diamond Rod", "BLM", "032000/032916"), ("Palazzo Diamond Grimoire", "SMN", "037000/037863"),
           ("Palazzo Diamond Tuck", "RDM", "036000/036883"), ("Palazzo Diamond Fan Brush", "PCT", "037000/037670")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]
EXCH = {"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
        "say": "จุดแลก: Uah'shepya ใน Solution Nine (X: 8.7 Y: 13.5)", "say_en": "Where to exchange: Uah'shepya in Solution Nine (X: 8.7 Y: 13.5)"}

rewards = [
    {"kind": "token", "name": "Mad Harlequin's Totem", "icon_src": ICON("ui/icon/026000/026697_hr1.tex"),
     "say": "ได้ 1 ชิ้นทุกครั้งที่เคลียร์\n\nแลกที่ Uah'shepya ใน Solution Nine (X: 8.7 Y: 13.5)\nอาวุธ Palazzo Diamond IL795: 1 ชิ้น ต่ออาวุธ 1 ชิ้น (Paladin: ดาบกับโล่แยกกัน อย่างละ 1)",
     "say_en": "1 per clear\n\nExchange it with Uah'shepya in Solution Nine (X: 8.7 Y: 13.5)\nA Palazzo Diamond IL795 weapon: 1 each (Paladin: sword and shield are separate, 1 each)",
     "pics": [EXCH]},
    {"kind": "weapon", "name": "Palazzo Diamond Weapons", "ilvl": 795, "icon_src": ICON("ui/icon/030000/030706_hr1.tex"),
     "say": "อาวุธ IL795 แลกด้วย Mad Harlequin's Totem 1 ชิ้น ต่ออาวุธ 1 ชิ้น\nรูปทรงทำจาก Kefka (ชื่อ Palazzo มาจาก Kefka Palazzo)\nมีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "IL795 weapons, 1 Mad Harlequin's Totem each\nShaped after Kefka (Palazzo from Kefka Palazzo)\nOne for every job; tap an icon for the weapon's name",
     "pieces": pieces},
    {"kind": "other", "name": "Son of a...", "icon_src": ICON("ui/icon/000000/000317_hr1.tex"),
     "say": "achievement ตอนเคลียร์ ได้ title Cruel Legend", "say_en": "The clear achievement; it gives the title Cruel Legend"},
]

guide = {
    "slug": "dmu", "short": "DMU", "name": "Dancing Mad (Ultimate)",
    "category": "ultimate", "expansion": "Dawntrail", "patch": "7.51",
    "source_name": "yan-flash.com / kanatan.info", "source_url": "https://yan-flash.com/ultimate/yosei-ranbu",
    "content_key": "ult:Dancing Mad",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 100, "ilvl": 795, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ AAC Heavyweight M4 (Savage) ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก (เลเวล 100)\n"
                      "ปาร์ตี้ 8 คนจัดเอง / เข้าแล้วเลเวลกับ item level ถูก sync (item level 795 ไม่มีขั้นต่ำ)",
            "unlock_en": "Clear AAC Heavyweight M4 (Savage) first\n"
                         "then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it (level 100)\n"
                         "A pre-made party of 8 / level and item level are synced inside (item level 795, no minimum)",
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}]},
    # yan-flash's macros first, each under its own heading, then kanatan's P4 mitigation macro (the field stays <= 2000)
    "macro_ja": open(W + "/macro_yan.txt", encoding="utf-8").read().rstrip() + "\n\n【kanatan.info：P4 軽減】\n"
                + open(W + "/macro_ja.txt", encoding="utf-8").read().rstrip(),
    "xref_name": "kanatan.info", "xref_url": "https://kanatan.info/archives/41960996.html",
}

defaults = {"frame": [1, 1], "bg": "#f4f4f4", "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": "#3c4252", "lines": False},
            "waymarks": {}, "iconSize": 7.8, "markSize": 7.4, "bossSize": 10, "ring": 5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
if missing_refs and "allowmissing" not in sys.argv:
    raise SystemExit(f"missing frames: {missing_refs}")
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps),
      "missing refs", len(missing_refs))
