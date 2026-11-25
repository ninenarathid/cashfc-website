"""Builds scripts/guides/data/merchants-tale.json: Another Merchant's Tale (Dawntrail criterion, 7.45), game8's plan
(its series page 767197 and the three Another boss pages 768013 / 768592 / 768634), footage from the Idyllshire videos
that game8's pages point to (through the Idyllshire articles they link)."""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/merchant"
sys.path.insert(0, HERE + "/tools")
import sc_da, sc_sw, sc_pe

OUT = r"scripts/guides/data/merchants-tale.json"
FRAMES = r"scripts/guides/data/frames/merchants-tale"
IMGS = json.load(open(HERE + "/imgs.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
V1, V2, V3 = "9nQ9lQUhWYE", "DZdu1kVHHEM", "Gm3FkiiVIDY"
BY = "Idyllshire (idyll_lana)"
SCN = {}
for m in (sc_da, sc_sw, sc_pe):
    SCN.update({k[:2] + "-" + k[2:]: v for k, v in m.SCENES.items()})
SCN["da-setup"] = sc_da.setup
SCN["sw-setup"] = sc_sw.setup


def FR(name, vid, t, say, say_en):
    return (f"frames/merchants-tale/{name}.webp", say, say_en, BY, f"https://youtu.be/{vid}?t={t}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, says=None, says_en=None, refs=None, mech_en=None, cmp=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [IMGS[cmp or pic]]
    if refs:
        s["refs"] = []
        for r in refs:
            if not os.path.exists(FRAMES + "/" + r[0].split("/")[-1]):
                continue
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
        if not s["refs"]:
            del s["refs"]
    if pic:
        s["ring"] = 5
        s["scene"] = SCN[pic]()
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if s.get("refs"):
        keep = {r["src"] for r in s["refs"]}
        en["refs"] = [r[2] for r in refs if r[0] in keep]
    s["en"] = en
    steps.append(s)


P0 = ("ภาพรวม", "Overview")
P1 = ("บอส 1: Darya the Sea-maid", "Boss 1: Darya the Sea-maid")
P2 = ("บอส 2: Lone Swordmaster", "Boss 2: Lone Swordmaster")
P3 = ("บอส 3: Pari of Plenty", "Boss 3: Pari of Plenty")

# ================================================================== overview (game8's series page)
OV = "Another Merchant's Tale"
step(P0, OV, "บอส 3 ตัวติดกัน ไม่มีลูกกระจ๊อก", "Three bosses in a row, no trash",
     "Another Merchant's Tale คือเวอร์ชันยากที่สุดของ the Merchant's Tale\n"
     "ไม่มีลูกกระจ๊อก สู้บอส 3 ตัวติดกัน\n"
     "ลำดับ: Darya the Sea-maid > Lone Swordmaster > Pari of Plenty\n"
     "เคลียร์ถึง Pari of Plenty ได้รางวัล: 1 รอบได้ Corvosi Manuscript 4 เล่ม\n\n"
     "IL sync 795\n"
     "game8: ของที่เหมาะคือชุด Heavyweight (Savage) ครบชุด",
     "Another Merchant's Tale is the hardest version of the Merchant's Tale\n"
     "There is no trash: three bosses in a row\n"
     "Order: Darya the Sea-maid > Lone Swordmaster > Pari of Plenty\n"
     "Clearing through Pari of Plenty gives the reward: 4 Corvosi Manuscripts a run\n\n"
     "IL sync 795\n"
     "game8: the right gear is a full Heavyweight (Savage) set")
step(P0, OV, "ชุบได้แค่ Variant Raise II คนละ 1 ครั้ง", "Only Variant Raise II, once each",
     "ในดันเจี้ยนทุกคนติด debuff Resurrection Restricted\n"
     "เวทชุบและไอเท็มชุบปกติใช้ไม่ได้\n"
     "ชุบได้ด้วย Variant Raise II เท่านั้น (ทุกคนได้ติดตัวอัตโนมัติ)\n"
     "ใช้ได้คนละ 1 ครั้ง แล้วจะกลับมาใช้ได้อีกในจังหวะที่กำหนด",
     "Everyone carries the Resurrection Restricted debuff in the duty\n"
     "Ordinary raise spells and raise items don't work\n"
     "Only Variant Raise II can raise (everyone gets it automatically)\n"
     "Each player can use it once; it comes back at set points")

# ================================================================== boss 1: Darya the Sea-maid (game8 768013)
WMk = "Waymarks"
step(P1, WMk, "Marker ตามภาพของ game8", "game8's waymarks",
     "game8 วาง marker บนพื้นตาราง 5×5 ของบอส 1\n"
     "A ช่องกลางขอบเหนือ / B ช่องกลางขอบตะวันออก / C ช่องกลางขอบใต้ / D ช่องกลางขอบตะวันตก\n"
     "1 มุมตะวันตกเฉียงเหนือ / 2 มุมตะวันออกเฉียงเหนือ / 3 มุมตะวันออกเฉียงใต้ / 4 มุมตะวันตกเฉียงใต้\n\n"
     "(game8 ไม่ได้เขียนอธิบาย marker แยก ภาพนี้วาดจาก marker ในภาพของ game8)",
     "game8 places the waymarks on boss 1's 5×5 floor\n"
     "A middle tile of the north edge / B middle of the east edge / C middle of the south edge / D middle of the west edge\n"
     "1 north-west corner / 2 north-east corner / 3 south-east corner / 4 south-west corner\n\n"
     "(game8 doesn't explain its waymarks separately; this is drawn from the waymarks in its pictures)",
     pic="da-setup", cmp="da-02")

step(P1, "Piercing Plunge", "raid-wide ดาเมจเวทแรง", "A heavy magic raid-wide",
     "raid-wide ดาเมจเวท (magic) แรง\nใช้ mitigate และ heal ให้ดี",
     "A heavy magic raid-wide\nUse mitigation and heal it up")

M = "Familiar Call + Echoed Serenade + Surging Current"
step(P1, M, "ภาพรวม: สัตว์รอบนอก + กรวยของบอส", "Overview: creatures round the edge + the boss's cones",
     "Familiar Call: สัตว์ทะเลโผล่รอบขอบสนาม แล้วยิง AoE\n"
     "ดูตำแหน่งสัตว์ แล้วหลบตรงที่ไม่โดน\n"
     "สัตว์ยิงหมดแล้ว บอสปล่อย AoE กรวย 2 ทิศ (Surging Current) หลบอีกรอบก็จบ\n\n"
     "ปลาปักเป้า (pufferfish) = AoE วงกลมใหญ่มาก\n"
     "ลูกโชโกโบ (chocobo chick) = AoE กรวยใหญ่มาก\n"
     "ปู / เต่า / ม้าน้ำ = AoE แนวตรง\n\n"
     "game8: Echoed Serenade หลบใน 4 ช่องของตัวเองตามบทบาท\n"
     "จำไว้ว่าแนวตรงชุดที่ 2 หลบได้ในช่องที่ทแยงกับช่องที่หลบชุดที่ 1 จะง่ายขึ้นมาก",
     "Familiar Call: sea creatures appear round the edge of the floor and fire AoEs\n"
     "Look where the creatures are and dodge where they can't reach\n"
     "When they are done, the boss fires a two-way cone (Surging Current); dodge that too and it's over\n\n"
     "Pufferfish = a huge circle\n"
     "Chocobo chick = a huge cone\n"
     "Crab / turtle / seahorse = a line\n\n"
     "game8: for Echoed Serenade each role dodges within its own four tiles\n"
     "Remember that the second set of lines can be dodged in the tile diagonal to where you dodged the first",
     refs=[FR("da-family", V1, 500, "Familiar Call: สัตว์ทะเลรอบขอบสนาม ดูว่าตัวไหนอยู่ตรงไหน แล้วหลบตรงที่ไม่โดน",
              "Familiar Call: sea creatures round the edge; see where each one is and dodge where it can't reach")])
step(P1, M, "① ยืนใน 4 ช่องของตัวเอง", "① Stand in your own four tiles",
     "กระจายไปอยู่ 4 ช่อง (2×2) ของตัวเอง แล้วหลบ AoE ที่ตามมาในช่องนั้น\n\n"
     "MT: 4 ช่องมุมตะวันตกเฉียงเหนือ (marker 1)\n"
     "D1: 4 ช่องมุมตะวันออกเฉียงเหนือ (marker 2)\n"
     "D2: 4 ช่องมุมตะวันตกเฉียงใต้ (marker 4)\n"
     "H1: 4 ช่องมุมตะวันออกเฉียงใต้ (marker 3)\n\n"
     "สีในภาพ: ฟ้า = Tank / ส้ม = DPS / เขียว = Healer",
     "Spread to your own four tiles (2×2) and dodge everything that follows inside them\n\n"
     "MT: the four north-west tiles (waymark 1)\n"
     "D1: the four north-east tiles (waymark 2)\n"
     "D2: the four south-west tiles (waymark 4)\n"
     "H1: the four south-east tiles (waymark 3)\n\n"
     "Colours in the picture: blue = Tank / orange = DPS / green = Healer",
     strict=True, pic="da-02",
     says={"MT": "4 ช่องมุมตะวันตกเฉียงเหนือ (marker 1)", "D1": "4 ช่องมุมตะวันออกเฉียงเหนือ (marker 2)",
           "D2": "4 ช่องมุมตะวันตกเฉียงใต้ (marker 4)", "H1": "4 ช่องมุมตะวันออกเฉียงใต้ (marker 3)"},
     says_en={"MT": "The four north-west tiles (waymark 1)", "D1": "The four north-east tiles (waymark 2)",
              "D2": "The four south-west tiles (waymark 4)", "H1": "The four south-east tiles (waymark 3)"})
step(P1, M, "② บอสร้องเพลงบอกลำดับ", "② The boss sings the order",
     "สัตว์ทะเลโผล่รอบนอก และบอสร้องเพลง: จำลำดับไว้\n"
     "ภาพ: แดง = ปลาปักเป้า / น้ำเงิน = ลูกโชโกโบ / ตัวเล็กมีเลข = ปู / เต่า / ม้าน้ำ\n"
     "เลข 1 / 2 ในภาพ = แนวตรงชุดที่ 1 / ชุดที่ 2",
     "The sea creatures appear round the edge and the boss sings: remember the order\n"
     "Picture: red = pufferfish / blue = chocobo chick / small numbered ones = crab / turtle / seahorse\n"
     "1 / 2 in the picture = the first / second set of lines",
     strict=True, pic="da-03")
step(P1, M, "③ ปลาปักเป้า: AoE วงกลมใหญ่", "③ Pufferfish: huge circles",
     "ปลาปักเป้าปล่อย AoE วงกลมใหญ่\n"
     "ในภาพของ game8 มีวงกลมที่ตัวผู้เล่นทุกคนด้วย: ยืนแยกกันในช่องของตัวเองตามภาพ",
     "The pufferfish fire their huge circles\n"
     "game8's picture also has a circle on every player: stay apart in your own tiles as shown",
     strict=True, pic="da-04")
step(P1, M, "④ แนวตรงชุดที่ 1", "④ The first set of lines",
     "สัตว์ตัวเล็กเลข 1 ยิง AoE แนวตรงชุดแรก\nหลบไปช่องที่ว่างในช่องของตัวเอง",
     "The small creatures marked 1 fire the first lines\nDodge into the free tile among your own",
     strict=True, pic="da-05")
step(P1, M, "⑤ ลูกโชโกโบ: AoE กรวยใหญ่", "⑤ Chocobo chicks: huge cones",
     "ลูกโชโกโบปล่อย AoE กรวยใหญ่\n"
     "ในภาพมีวงกลมที่ตัวผู้เล่นทุกคนอีกครั้ง: ยืนแยกกันตามภาพ",
     "The chocobo chicks fire their huge cones\n"
     "The picture again has a circle on every player: stay apart as shown",
     strict=True, pic="da-06")
step(P1, M, "⑥ แนวตรงชุดที่ 2 + วงเตือนกรวยของบอส", "⑥ The second lines + the boss's cone telegraph",
     "AoE แนวตรงชุดที่ 2 (เลข 2)\n"
     "ช่องที่หลบได้ คือช่องที่ทแยงกับช่องที่หลบชุดที่ 1\n"
     "ตอนนี้บอสขึ้นวงเตือน AoE กรวย 2 ทิศแล้ว",
     "The second lines (marked 2)\n"
     "The safe tile is the one diagonal to where you dodged the first lines\n"
     "By now the boss shows its two-way cone telegraph",
     strict=True, pic="da-07")
step(P1, M, "⑦ กรวยของบอสครั้งที่ 1", "⑦ The boss's first cone",
     "บอสปล่อย AoE กรวย 2 ทิศครั้งแรก (เลข 1 ในภาพ)\n"
     "เลข 2 ในภาพ = ที่ที่กรวยครั้งที่ 2 จะลง",
     "The boss fires its first two-way cone (1 in the picture)\n"
     "2 in the picture = where the second cone will land",
     pic="da-08")
step(P1, M, "⑧ กรวยของบอสครั้งที่ 2", "⑧ The boss's second cone",
     "กรวยครั้งที่ 2 ลงอีก 2 ทิศ (เลข 2)\nย้ายเข้าฝั่งที่กรวยครั้งแรกลงไปแล้ว\nจบ Mechanic",
     "The second cone hits the other two ways (2)\nMove into where the first cone has already gone off\nThe mechanic is over",
     pic="da-09")

M = "Alluring Order + Swimming in the Air"
step(P1, M, "ภาพรวม + ลำดับ", "Overview + priority",
     "Alluring Order: ทุกคนได้ debuff เดินบังคับ (forced march)\n"
     "อีก 2 คนได้ debuff AoE (stack) ที่จะลงในอีกไม่กี่วินาที\n"
     "Swimming in the Air: บอสว่ายไปตามทาง วาง marker AoE วงกลมไว้ตามทาง\n"
     "มี 2 ที่ที่บอสไม่วาง marker = ที่ปลอดภัย 2 ที่\n"
     "แบ่งเป็นคู่ คู่ละที่ ให้เดินบังคับพาไปที่ปลอดภัยของคู่ตัวเอง\n\n"
     "ที่ปลอดภัยแรก > Tank + Healer\n"
     "ที่ปลอดภัยที่สอง > DPS\n"
     "ถ้า AoE (stack) ลงคู่เดียวกัน: H1 + D1 เป็นคนสลับ",
     "Alluring Order: everyone gets a forced march debuff\n"
     "Two players also get an AoE (stack) that lands a few seconds later\n"
     "Swimming in the Air: the boss swims a path and leaves circle AoE markers along it\n"
     "There are two places it leaves no marker = the two safe spots\n"
     "Split into pairs, one spot each, and let the forced march carry you to your pair's spot\n\n"
     "First safe spot > Tank + Healer\n"
     "Second safe spot > DPS\n"
     "If both stacks land on one pair: H1 + D1 are the ones who swap",
     refs=[FR("da-swim", V1, 180, "Swimming in the Air: บอสว่ายกลางอากาศ วาง marker AoE วงกลมตามทาง",
              "Swimming in the Air: the boss swims through the air leaving circle AoE markers on its path")])
step(P1, M, "① บอสวาง marker ตามลูกศร", "① The boss leaves markers along the arrows",
     "ลูกศรในภาพ = ทางที่บอสว่ายวาง marker\n"
     "ที่ไม่มี marker: ① = ที่ปลอดภัยแรก / ② = ที่ปลอดภัยที่สอง\n"
     "ภาพ: Tank กับ Healer ได้ AoE (stack) ทั้งคู่ → H1 กับ D1 ปรับที่ยืน",
     "The arrows in the picture = the path the boss swims, leaving markers\n"
     "No marker: ① = the first safe spot / ② = the second\n"
     "Picture: the Tank and the Healer both got the stack → H1 and D1 adjust",
     pic="da-11")
step(P1, M, "② ปรับคู่ แล้วยืนให้เดินบังคับพาไปที่ของคู่", "② Fix the pairs and stand so the march takes you there",
     "ยืนให้ทิศที่โดนเดินบังคับพาไปที่ปลอดภัยของคู่ตัวเอง\n"
     "ภาพ (หลังสลับ): MT·D1 ไป ① / H1·D2 ไป ②",
     "Stand so the forced march carries you to your pair's safe spot\n"
     "Picture (after the swap): MT·D1 go to ① / H1·D2 go to ②",
     strict=True, pic="da-12")
step(P1, M, "③ เดินบังคับทำงาน AoE ลงทั้งหมด", "③ The march resolves and everything goes off",
     "โดนเดินบังคับไปที่ปลอดภัย แล้ว AoE วงกลมจาก marker ลงทั้งหมด\nAoE (stack) ลงที่ทั้ง 2 คู่",
     "The forced march takes you to the safe spots, then every marker's circle goes off\nThe two stacks land on the two pairs",
     strict=True, pic="da-13")

M = "Ceaseless Current + Surging Current + Cross Current"
step(P1, M, "ภาพรวม: เรียงแนวทแยงแถวเดียว", "Overview: one diagonal line",
     "AoE แนวตรงที่เลื่อนมาจาก 2 ด้าน + AoE กรวย 2 ทิศของบอส\n"
     "ทุกคนได้ marker อีกไม่กี่วินาทีเกิด AoE กากบาท (+) จากตัวผู้เล่น\n\n"
     "game8: ถือจุดที่แนวคลื่น 2 ด้านตัดกันเป็น \"ทิศเหนือ\" แล้วเรียงแนวทแยงแถวเดียว",
     "Lines sweeping in from two sides + the boss's two-way cone\n"
     "Everyone gets a marker; a few seconds later a cross (+) AoE comes out of each player\n\n"
     "game8: take the corner where the two waves meet as \"north\" and line up on one diagonal",
     refs=[FR("da-current", V1, 290, "Ceaseless Current: คลื่นเลื่อนมาจาก 2 ด้าน จุดที่ 2 ด้านตัดกัน = ทิศเหนือของแผน",
              "Ceaseless Current: waves sweep in from two sides; where they meet is the plan's north")])
step(P1, M, "① เรียงแนวทแยง", "① Line up on the diagonal",
     "เรียงแนวทแยงตามภาพ\nจากจุดตัดของคลื่น: H1 > MT > (บอส) > D1 > D2\n"
     "คลื่นมาเร็ว Healer จึงรอในช่องก่อนหน้า 1 ช่องไว้ก่อน",
     "Line up diagonally as shown\nFrom the waves' corner: H1 > MT > (boss) > D1 > D2\n"
     "The waves come fast, so the Healer waits one tile ahead",
     strict=True, pic="da-14")
step(P1, M, "② คลื่นเลื่อนมา Healer เข้ามุม", "② The waves move; the Healer steps into the corner",
     "คลื่นเลื่อนเข้ามา Healer หลบเข้าช่องมุม",
     "The waves move in; the Healer steps into the corner tile",
     strict=True, pic="da-15")
step(P1, M, "③ กรวยของบอส + AoE กากบาทจากทุกคน", "③ The boss's cone + everyone's cross",
     "กรวยของบอสลง และ marker ของทุกคนระเบิดเป็น AoE กากบาท (+)\n"
     "ถ้ายืนแนวทแยงแถวเดียวตามภาพ กากบาทจะไม่ทับกัน",
     "The boss's cone goes off and every marker becomes a cross (+)\n"
     "Standing on one diagonal as shown, no one's cross hits anyone else",
     strict=True, pic="da-16")
step(P1, M, "④ กรวยของบอสครั้งที่ 2", "④ The boss's second cone",
     "กรวยครั้งที่ 2 ของบอส\nD1 ไปฝั่งที่ปลอดภัยจากกรวยครั้งที่ 2 และเดินหน้าไป 1 ช่อง",
     "The boss's second cone\nD1 moves to the side safe from it, one tile forward",
     strict=True, pic="da-17", says={"D1": "ไปฝั่งปลอดภัยของกรวยครั้งที่ 2 และเดินหน้าไป 1 ช่อง"},
     says_en={"D1": "Go to the second cone's safe side, one tile forward"})
step(P1, M, "⑤ D2 หลบคลื่นสุดท้าย", "⑤ D2 dodges the last wave",
     "สุดท้าย D2 หลบคลื่นที่เลื่อนมา\nจบ Mechanic",
     "Last, D2 dodges the incoming wave\nThe mechanic is over",
     strict=True, pic="da-18", says={"D2": "หลบคลื่นสุดท้าย"}, says_en={"D2": "Dodge the last wave"})

M = "Alluring Order + Sunken Treasure + Surging Current"
step(P1, M, "ภาพรวม + ลำดับ", "Overview + priority",
     "วัตถุน้ำ 2 ชุด แต่ละชุด = ลูกบอล 1 ลูก (AoE วงกลม) + donut 2 วง (AoE donut)\n"
     "วัตถุแต่ละอันปล่อย AoE ตามรูปของมัน + เดินบังคับ + กรวย 2 ทิศของบอส\n"
     "ต้น Mechanic วัตถุแข็งตัว แต่ลูกบอล 2 ลูกจะมี 1 ลูกที่ไม่แข็ง\n"
     "หลบใน donut ฝั่งลูกบอลที่ไม่แข็ง: ยืนให้เดินบังคับพาเข้า donut ฝั่งนั้น\n"
     "และต้องอยู่ใน donut ตรงที่กรวยของบอสไม่โดน\n\n"
     "ถือฝั่งลูกบอลที่ไม่แข็งเป็นทิศเหนือ\n"
     "ตะวันตก: Tank + Healer / ตะวันออก: DPS\n"
     "ถ้า AoE (stack) ลงคู่เดียวกัน: H1 + D1 เป็นคนสลับ",
     "Two sets of water objects, each = one ball (a circle) + two rings (donuts)\n"
     "Each object fires the AoE of its shape, plus a forced march and the boss's two-way cone\n"
     "Early on the objects freeze, but one of the two balls stays unfrozen\n"
     "Ride out the AoEs in a donut on the unfrozen ball's side: stand so the march carries you into it\n"
     "and stay inside the donut where the boss's cone can't reach\n\n"
     "Take the unfrozen ball's side as north\n"
     "West: Tank + Healer / East: DPS\n"
     "If both stacks land on one pair: H1 + D1 are the ones who swap",
     refs=[FR("da-sunken", V1, 372, "Sunken Treasure: วัตถุน้ำบนสนาม (ลูกบอล = วงกลม / วงแหวน = donut)",
              "Sunken Treasure: the water objects (ball = circle / ring = donut)")])
step(P1, M, "① วัตถุน้ำโผล่ + เดินบังคับ", "① Water objects + forced march",
     "วัตถุน้ำโผล่ และทุกคนได้ debuff เดินบังคับ",
     "The water objects appear and everyone gets a forced march",
     pic="da-19")
step(P1, M, "② AoE (stack) ลง 2 คน + วัตถุแข็ง เหลือ 1 ลูก", "② Two stacks + everything freezes but one ball",
     "AoE (stack) ลง 2 คน: ภาพลงที่ Tank กับ Healer → H1 กับ D1 สลับ\n"
     "วัตถุแข็งตัวทั้งหมด ยกเว้นลูกบอล 1 ลูก (ภาพ: ลูกฝั่งตะวันตก)",
     "Two stacks: in the picture on the Tank and the Healer → H1 and D1 swap\n"
     "Everything freezes except one ball (picture: the west one)",
     pic="da-20")
step(P1, M, "③ บอสขึ้นวงเตือนกรวย", "③ The boss shows its cone",
     "ก่อนเดินบังคับทำงาน บอสขึ้นวงเตือนกรวย\n"
     "ปรับที่ยืนให้ไม่อยู่ฝั่งกรวย และเดินบังคับพาเข้า donut ได้\n"
     "ภาพ: MT·D1 donut ตะวันตกเฉียงใต้ / H1·D2 donut ตะวันตกเฉียงเหนือ",
     "Just before the march, the boss shows its cone\n"
     "Adjust so you are off the cone's side and the march still carries you into a donut\n"
     "Picture: MT·D1 the south-west donut / H1·D2 the north-west donut",
     strict=True, pic="da-21")
step(P1, M, "④ AoE ลงทั้งหมด", "④ Everything goes off",
     "AoE จากวัตถุลงทั้งหมด: ยืนในรูของ donut\nต่อด้วยกรวยครั้งที่ 2 ของบอส",
     "Every object's AoE goes off: stand in the donut's hole\nThe boss's second cone follows",
     strict=True, pic="da-22")
step(P1, M, "⑤ กรวยครั้งที่ 2 + ลูกบอลที่เหลือแข็ง", "⑤ The second cone + the last ball freezes",
     "กรวยครั้งที่ 2 ของบอสลง\nสุดท้ายลูกบอลฝั่งที่ปลอดภัยแข็งตัว: รีบไปฝั่งตรงข้าม",
     "The boss's second cone\nLast, the ball on the safe side freezes: hurry to the far side",
     pic="da-23")
step(P1, M, "⑥ ลูกบอลสุดท้ายระเบิด", "⑥ The last ball goes off",
     "ลูกบอลที่เหลือระเบิดเป็น AoE วงกลมใหญ่",
     "The last ball goes off as a big circle",
     pic="da-24")

M = "Aqua Spear + Familiar Call + Surging Current"
step(P1, M, "ภาพรวม + ลำดับ", "Overview + order",
     "สนามมีโซน Dropsy (ช่องฟ้า) และลูกที่ลงที่ผู้เล่นก็สร้างโซน Dropsy เพิ่ม รวมแล้วเหลือช่องปลอดภัย 12 ช่อง\n"
     "หลบ AoE แนวตรงของสัตว์รอบนอก และรับ AoE กากบาทที่ตัวผู้เล่นด้วย\n\n"
     "Echoed Serenade รอบนี้ไม่มีปลาปักเป้าและลูกโชโกโบ แต่มา 2 รอบ\n"
     "ลำดับ: วาง marker เหลือง > Serenade รอบ 1 > วาง AoE 3 ครั้ง > marker กากบาท > Serenade รอบ 2 > กรวยของบอส\n"
     "รอบ 2 ร้องทำนองเดียวกับรอบ 1: อย่าลืมลำดับของรอบ 1",
     "The floor gets Dropsy zones (blue tiles), and the shots on players add more, leaving 12 safe tiles\n"
     "Dodge the edge creatures' lines and take the cross AoEs on players as well\n\n"
     "This Echoed Serenade has no pufferfish or chocobo chicks, but comes twice\n"
     "Order: drop the yellow markers > Serenade 1 > drop AoEs ×3 > cross markers > Serenade 2 > the boss's cone\n"
     "Serenade 2 sings the same tune as Serenade 1: don't forget the first one's order",
     refs=[FR("da-spear", V1, 460, "Aqua Spear: ช่องฟ้าที่เรืองบนพื้น = โซน Dropsy ห้ามยืน",
              "Aqua Spear: the glowing blue tiles = Dropsy zones; keep off them")])
step(P1, M, "① ที่วาง marker เหลือง", "① Where to drop the yellow markers",
     "วาง marker เหลืองตามภาพ\nช่องฟ้า = โซน Dropsy",
     "Drop the yellow markers as shown\nBlue tiles = Dropsy zones",
     strict=True, pic="da-25")
step(P1, M, "② ที่ยืนตอน marker กากบาท", "② Where to stand for the cross markers",
     "ยืนตามภาพตอนมี marker กากบาท\n"
     "สี่เหลี่ยมขอบขาว = โซน Dropsy จาก marker เหลือง / วงส้ม = AoE ที่วาง 3 ครั้ง",
     "Stand as shown for the cross markers\n"
     "White-framed squares = Dropsy from the yellow markers / orange circles = the three dropped AoEs",
     strict=True, pic="da-26")
step(P1, M, "③ หลบแนวตรงของสัตว์", "③ Dodging the creatures' lines",
     "game8: แต่ละคนหลบในช่องรูปตัว L ของตัวเอง\n"
     "Tank + Healer: วนทวนเข็มนาฬิกา (มองจากกลางสนาม)\n"
     "DPS: วนตามเข็มนาฬิกา (มองจากกลางสนาม)\n"
     "เริ่มจากช่องที่หลบแนวตรงครั้งแรก แล้วเดินไปทีละ 1 ช่อง",
     "game8: each player dodges within their own L of tiles\n"
     "Tank + Healer: anticlockwise (seen from the middle)\n"
     "DPS: clockwise (seen from the middle)\n"
     "Start from the tile safe from the first line, then move one tile at a time",
     strict=True, pic="da-27",
     says={"MT": "วนทวนเข็มนาฬิกา (มองจากกลางสนาม)", "H1": "วนทวนเข็มนาฬิกา (มองจากกลางสนาม)",
           "D1": "วนตามเข็มนาฬิกา (มองจากกลางสนาม)", "D2": "วนตามเข็มนาฬิกา (มองจากกลางสนาม)"},
     says_en={"MT": "Anticlockwise (seen from the middle)", "H1": "Anticlockwise (seen from the middle)",
              "D1": "Clockwise (seen from the middle)", "D2": "Clockwise (seen from the middle)"})

M = "Sea Shackles + Sunken Treasure"
step(P1, M, "ภาพรวม", "Overview",
     "Sea Shackles: ผูกโซ่คู่ละ 2 คน\n"
     "โซ่น้ำเงิน = ต้องอยู่ห่างกัน / โซ่เขียว = ต้องอยู่ใกล้กัน\n"
     "มี 3 แบบ: น้ำเงิน·น้ำเงิน / น้ำเงิน·เขียว / เขียว·เขียว\n"
     "อีก 2 คนได้ marker AoE วงกลม\n\n"
     "รักษาระยะของโซ่ ไม่ให้ AoE ทับกัน แล้วไปที่ปลอดภัยของ Sunken Treasure\n"
     "มี AoE ที่ต้องวางต่อกัน 3 ครั้งด้วย: วางให้ครบ 3 ครั้งโดยไม่ทับที่ปลอดภัย แล้วค่อยเข้าที่ปลอดภัย",
     "Sea Shackles: two pairs are chained together\n"
     "Blue chain = keep apart / green chain = stay close\n"
     "Three patterns: blue·blue / blue·green / green·green\n"
     "Two players also get a circle AoE marker\n\n"
     "Keep your chain's distance, don't overlap the AoEs, and reach Sunken Treasure's safe spot\n"
     "There are also three AoEs to drop in a row: drop all three away from the safe spot, then go in",
     refs=[FR("da-shackles", V1, 600, "Sea Shackles: โซ่ผูกคู่ เขียว = อยู่ใกล้กัน / น้ำเงิน = อยู่ห่างกัน",
              "Sea Shackles: chained pairs; green = stay close / blue = keep apart")])
step(P1, M, "① โซ่ (ภาพ: เขียว·เขียว)", "① The chains (picture: green·green)",
     "โซ่ผูกแล้ว: น้ำเงิน = ห่าง / เขียว = ใกล้\nภาพเป็นแบบ เขียว·เขียว",
     "The chains are on: blue = apart / green = close\nThe picture is green·green",
     pic="da-28")
step(P1, M, "② วัตถุแข็ง: วาง AoE 3 ครั้งแล้วเข้า donut", "② The objects freeze: drop three AoEs, then the donut",
     "วัตถุแข็งตัว ไป donut ฝั่งที่ปลอดภัย\nแต่ต้องวาง AoE 3 ครั้งก่อน: วางให้เสร็จแล้วค่อยเข้า donut",
     "The objects freeze; head for the donut on the safe side\nBut drop the three AoEs first, then step into the donut",
     pic="da-29")
step(P1, M, "③ AoE ลง", "③ The AoEs go off",
     "AoE จากวัตถุลง: ยืนในรูของ donut",
     "The objects' AoEs go off: stand in the donut's hole",
     pic="da-30")
step(P1, M, "④ ลูกบอลที่แข็งทีหลังระเบิด", "④ The late balls go off",
     "ลูกบอลที่แข็งช้ากว่าระเบิด: รีบไปฝั่งตรงข้ามเป็นคู่\nเดินโดยรักษาระยะของโซ่ไว้",
     "The balls that froze late go off: hurry across in pairs\nKeep your chain's distance as you move",
     pic="da-31")
step(P1, M, "⑤ แบบ เขียว·น้ำเงิน", "⑤ Green·blue",
     "โซ่แบบ ใกล้·ไกล (เขียว·น้ำเงิน)\nบางครั้ง donut ที่ปลอดภัยเกิดเป็นคู่ทแยงมุม",
     "Near·far chains (green·blue)\nThe safe donuts can also be diagonal to each other",
     pic="da-32")
step(P1, M, "⑥ แบบ น้ำเงิน·น้ำเงิน", "⑥ Blue·blue",
     "โซ่แบบ ไกล·ไกล (น้ำเงิน·น้ำเงิน)", "Far·far chains (blue·blue)",
     pic="da-33")

# ================================================================== boss 2: Lone Swordmaster (game8 768592)
step(P2, WMk, "Marker ตามภาพของ game8", "game8's waymarks",
     "A / B / C / D อยู่กลางสนาม:\nA เหนือ / B กลาง / C ใต้ / D ตะวันตกของ B\n"
     "1 / 2 / 3 / 4 อยู่มุมสนาม:\n1 ตะวันตกเฉียงเหนือ / 2 ตะวันออกเฉียงเหนือ / 3 ตะวันออกเฉียงใต้ / 4 ตะวันตกเฉียงใต้\n\n"
     "(game8 ไม่ได้เขียนอธิบาย marker แยก ภาพนี้วาดจาก marker ในภาพของ game8)",
     "A / B / C / D sit in the middle of the floor:\nA north / B centre / C south / D west of B\n"
     "1 / 2 / 3 / 4 are in the corners:\n1 north-west / 2 north-east / 3 south-east / 4 south-west\n\n"
     "(game8 doesn't explain its waymarks separately; this is drawn from the waymarks in its pictures)",
     pic="sw-setup", cmp="sw-06")

step(P2, "Near to Heaven / Far from Heaven", "ทำบน marker", "Played on the waymarks",
     "ทำบน marker เป็นหลัก\nทั้งแบบวงกลม (Near to Heaven) และแบบวงแหวน (Far from Heaven) ให้คนที่โดน AoE donut ยืนตรงกลาง\n"
     "ดาบรอบตัวบอส 1 เล่ม: คนที่มี marker รับคนเดียว\n"
     "ดาบ 2 เล่ม: คนที่มี marker + คนที่ไม่มีอะไร รับ 2 คน\n\n"
     "ที่ยืน (Near to Heaven / Far from Heaven):\n"
     "ลูกเต๋า 1: A / B\n"
     "ลูกเต๋า 2: B / A\n"
     "marker: C / C\n"
     "ไม่มีอะไร: ดาบ 1 เล่ม = D / ดาบ 2 เล่ม = C (ทั้งสองแบบ)\n\n"
     "ภาพ: ซ้าย Near to Heaven (ดาบ 1 เล่ม) / ขวา Far from Heaven (ดาบ 2 เล่ม) วงแดง = คนที่มี marker วงขาว = คนที่ไม่มีอะไร",
     "Played mostly on the waymarks\nFor both the circle (Near to Heaven) and the ring (Far from Heaven), the donut's target stands in the middle\n"
     "One sword round the boss: the marked player takes it alone\n"
     "Two swords: the marked player + the unmarked player take it together\n\n"
     "Where to stand (Near to Heaven / Far from Heaven):\n"
     "Dice 1: A / B\n"
     "Dice 2: B / A\n"
     "Marker: C / C\n"
     "Nothing: one sword = D / two swords = C (both versions)\n\n"
     "Picture: left Near to Heaven (one sword) / right Far from Heaven (two swords); red = the marked player, white ring = the unmarked one",
     pic="sw-02",
     refs=[FR("sw-dice", V2, 30, "Heavens' Confluence: ดูเลขลูกเต๋าเหนือหัว และจำนวนดาบรอบตัวบอส",
              "Heavens' Confluence: read the dice number over your head and the swords round the boss")])

M = "Malefic Quartering ①: Shifting Horizon + Malefic Portent"
step(P2, M, "ภาพรวม", "Overview",
     "หันด้านที่ไม่มี Malefic (สีแดง) เข้าหาบอส จะยืนเป็นคู่ 2 คนเอง\n"
     "รับสายจากบอส และแนวโจมตีจากขอบสนาม ไม่ให้โดนด้านที่มี Malefic\n"
     "โดนสายจากบอสพร้อมกับแนวจากขอบสนาม = ตาย\n"
     "คนที่ไม่โดนแนวจากขอบสนามเป็นคนรับสายจากบอส",
     "Line up with your side without Malefic (red) towards the boss; you end up in pairs\n"
     "Take the boss's tether and the edge's attack on sides without Malefic\n"
     "Taking the boss's tether and an edge attack together = death\n"
     "Whoever isn't connected to an edge attack takes the boss's tether",
     refs=[FR("sw-malefic", V2, 100, "Malefic Quartering: วงแดงรอบตัวผู้เล่น ด้านสีแดง = ด้านที่มี Malefic",
              "Malefic Quartering: the red wheel round each player; red sides = Malefic")])
step(P2, M, "① รับ Malefic แล้วหลบกรวย", "① Take Malefic, dodge the cones",
     "รับ Malefic แล้วหลบ AoE กรวยของ Shifting Horizon",
     "Take Malefic, then dodge Shifting Horizon's cones",
     pic="sw-03")
step(P2, M, "② หันด้านที่ไม่มี Malefic หาบอส", "② Face the boss with a clean side",
     "หันด้านที่ไม่มี Malefic หาบอส (จะเป็นคู่ 2 คนเอง)\nสายจากบอส และแนวจากขอบสนาม ต่อมาที่ผู้เล่น",
     "Face the boss with a side without Malefic (pairs form on their own)\nThe boss's tethers and the edge's slashes connect to players",
     pic="sw-04")
step(P2, M, "③ คนที่ไม่ต่อกับแนวจากขอบสนามรับสาย", "③ The one not on an edge attack takes the tether",
     "คนที่ไม่ได้ต่อกับแนวจากขอบสนามเป็นคนรับสายจากบอส\n"
     "คนที่แนวจากขอบสนามจะมาโดน ขยับให้โดนด้านที่ไม่มี Malefic",
     "Whoever isn't connected to an edge slash takes the boss's tether\n"
     "Whoever an edge slash will hit moves so it lands on a side without Malefic",
     pic="sw-05")

M = "Echoing Eight / Echoing Orbit + Waiting Wounds + Heavens' Confluence"
step(P2, M, "ภาพรวม", "Overview",
     "ทุกคนวาง AoE ที่ marker C\n"
     "(วางที่ C แล้ว ถึงจะเป็น 8 ทิศก็ยังตีบอสต่อได้)\n"
     "AoE วงกลม > แล้วตามด้วย donut (Echoing Orbit) หรือ 8 ทิศ (Echoing Eight)\n\n"
     "จากนั้น Waiting Wounds: AoE วงกลม 3 วงเรียงจากบอสออกไปเป็นแถว แถว 1 > 2 > 3\n"
     "หลบแบบ 3 > 1: ระเบิดถี่มาก ต้องเข้าที่ที่ระเบิดไปแล้วทันที\n"
     "จบด้วย Heavens' Confluence: ทำแบบครั้งแรก",
     "Everyone drops their AoE on waymark C\n"
     "(dropped on C, you can keep hitting the boss even if it's the eight-way)\n"
     "A circle > then a donut (Echoing Orbit) or eight lines (Echoing Eight)\n\n"
     "Then Waiting Wounds: three rows of circles going out from the boss, row 1 > 2 > 3\n"
     "Dodge 3 > 1: they go off quickly, so step into the spent spot at once\n"
     "It ends with Heavens' Confluence, played like the first one")
step(P2, M, "① ทุกคนรวมที่ C วาง AoE", "① Everyone drops on C",
     "ทุกคนรวมที่ marker C แล้ววาง AoE", "Everyone gathers on waymark C and drops the AoE",
     pic="sw-06")
step(P2, M, "② Echoing Orbit: donut", "② Echoing Orbit: a donut",
     "ถ้าเป็น Echoing Orbit: AoE ลงแล้วเกิด donut\nกลับเข้าไปที่ที่วาง AoE",
     "If it's Echoing Orbit: after the circle comes a donut\nGo back to where you dropped it",
     pic="sw-07")
step(P2, M, "③ Echoing Eight: 8 ทิศจาก C", "③ Echoing Eight: eight lines from C",
     "ถ้าเป็น Echoing Eight: AoE แนวตรง 8 ทิศออกมาจาก C",
     "If it's Echoing Eight: eight lines come out of C",
     pic="sw-08")
step(P2, M, "④ Waiting Wounds: หลบ 3 > 1", "④ Waiting Wounds: dodge 3 > 1",
     "หลังท่า Echoing ตามด้วย Waiting Wounds ทันที\n"
     "รอที่แถว 3 พอแถว 1 ระเบิด เข้าไปที่แถว 1 ทันที",
     "Waiting Wounds follows right after the Echoing attack\n"
     "Wait on row 3; as soon as row 1 goes off, step into row 1",
     pic="sw-09")
step(P2, M, "⑤ Heavens' Confluence", "⑤ Heavens' Confluence",
     "Waiting Wounds จบแล้วตามด้วย Heavens' Confluence\nทำแบบครั้งแรก (ดู Near to Heaven / Far from Heaven ด้านบน)",
     "After Waiting Wounds comes Heavens' Confluence\nPlay it like the first one (see Near to Heaven / Far from Heaven above)")

M = "Silent Eight + Maw of the Wolf"
step(P2, M, "① รีบไปวาง AoE ที่ marker เลข", "① Drop your AoE on your numbered waymark",
     "พอมีวงเตือน AoE ที่ตัว รีบไปวางที่ marker เลขของตัวเอง\n"
     "ตะวันตกเฉียงเหนือ (1): Tank\nตะวันออกเฉียงเหนือ (2): Melee\nตะวันตกเฉียงใต้ (4): Healer\nตะวันออกเฉียงใต้ (3): Range",
     "When the AoE telegraph appears on you, hurry to drop it on your numbered waymark\n"
     "North-west (1): Tank\nNorth-east (2): Melee\nSouth-west (4): Healer\nSouth-east (3): Range",
     strict=True, pic="sw-10",
     says={"MT": "marker 1 (ตะวันตกเฉียงเหนือ)", "D1": "marker 2 (ตะวันออกเฉียงเหนือ)", "H1": "marker 4 (ตะวันตกเฉียงใต้)", "D2": "marker 3 (ตะวันออกเฉียงใต้)"},
     says_en={"MT": "Waymark 1 (north-west)", "D1": "Waymark 2 (north-east)", "H1": "Waymark 4 (south-west)", "D2": "Waymark 3 (south-east)"})
step(P2, M, "② 8 ทิศจากที่วาง: เข้าที่ปลอดภัย", "② Eight lines from the drops: get to safety",
     "AoE 8 ทิศออกมาจากที่ที่วาง\nวงเตือนที่ตัวหายแล้วรีบเข้าที่ปลอดภัย",
     "Eight lines come out of the dropped AoEs\nAs soon as your telegraph is gone, get to a safe spot",
     pic="sw-11")
step(P2, M, "③ Maw of the Wolf: ครึ่งด้านหน้าบอส", "③ Maw of the Wolf: the boss's front half",
     "บอสตีครึ่งสนามด้านที่หันหน้าไป\nรีบไปหลังบอส",
     "The boss hits the half it faces\nGet behind it quickly",
     pic="sw-12",
     refs=[FR("sw-maw", V2, 260, "Maw of the Wolf: ครึ่งสนามด้านหน้าบอส ดูวงเป้าของบอสแล้วไปด้านหลัง",
              "Maw of the Wolf: the boss's front half; watch its target circle and go behind")])

step(P2, "Fangs of the Underworld + Steelsbreath Release", "stack 3 ครั้ง + raid-wide", "Three stacks + a raid-wide",
     "stack 3 ครั้งติดกัน ดาเมจกายภาพ (physical)\n"
     "stack จบแล้วตามด้วย raid-wide (Steelsbreath Release)\n"
     "ใช้ mitigate ให้ดี Healer heal ให้ไหว\n\n"
     "game8: ใช้ mitigate อย่าง Feint ช่วงใกล้ร่าย Fangs of the Underworld เสร็จ จะคลุมไปถึง Steelsbreath Release",
     "A physical stack, three hits in a row\n"
     "A raid-wide (Steelsbreath Release) follows the stacks\n"
     "Mitigate well; healers, keep up\n\n"
     "game8: mitigation like Feint put in near the end of Fangs of the Underworld's cast lasts through Steelsbreath Release",
     refs=[FR("sw-fangs", V2, 300, "Fangs of the Underworld: stack แนวตรง 3 ครั้งที่ Healer",
              "Fangs of the Underworld: a three-hit line stack on a healer")])

M = "Malefic Quartering ②: Steel Horizon + Silent Heat + Heavens' Confluence"
step(P2, M, "ภาพรวม: กากบาท Malefic", "Overview: the Malefic cross",
     "game8 ใช้วิธี \"กากบาท Malefic\" (Malefic Quartering ครั้งที่ 2 ต่างจากแผนของ Idyllshire)\n"
     "ยืนเป็นคู่ คร่อมบอสหันหน้าเข้าหากัน ให้ Malefic หันหาบอส\n"
     "ตอน Steel Horizon มา ปกติหลบที่ร่องทางซ้าย\n"
     "แต่คู่ที่มีเส้น AoE พาดผ่านใต้ตัวบอส ไปร่องทางขวา\n"
     "วาง Silent Heat แล้ว Heavens' Confluence ตามมา: ทำบน marker",
     "game8 plays it as \"the Malefic cross\" (the second Malefic Quartering differs from Idyllshire's plan)\n"
     "Pairs stand across the boss facing each other, Malefic towards the boss\n"
     "When Steel Horizon comes, dodge into the left notch as a rule\n"
     "but the pair with a line running under the boss goes to the right notch\n"
     "After dropping Silent Heat comes Heavens' Confluence, played on the waymarks",
     refs=[FR("sw-q2", V2, 330, "Malefic Quartering ครั้งที่ 2: วงแดงรอบตัว ด้านแดง = Malefic",
              "The second Malefic Quartering: the red wheels; red sides = Malefic")])
step(P2, M, "① Malefic ตะวันออก·ตะวันตก 2 คน / เหนือ·ใต้ 2 คน", "① Malefic east-west on two, north-south on two",
     "Malefic Quartering: 2 คนได้ Malefic ตะวันออก·ตะวันตก อีก 2 คนได้ เหนือ·ใต้\n"
     "ภาพนี้ของ game8 วาดผู้เล่นเป็นวงกลม 4 ส่วน ส่วนสีแดง = ด้านของ Malefic",
     "Malefic Quartering: two players get Malefic east-west, two get it north-south\n"
     "game8 draws players here as discs in four parts; red parts = Malefic sides",
     pic="sw-13")
step(P2, M, "② Steel Horizon ขึ้นวงเตือน", "② Steel Horizon's telegraph",
     "Steel Horizon ขึ้นวงเตือน ซ้าย·ขวา หรือ บน·ล่าง",
     "Steel Horizon shows either left·right or top·bottom",
     pic="sw-14")
step(P2, M, "③ รอที่ชุดหลัง แล้ววิ่งเข้าที่ชุดแรกลงไปแล้ว", "③ Wait in the later set, then run into the spent one",
     "รอในที่ที่ AoE ชุดหลังจะลง\nชุดแรกลงแล้ววิ่งเข้าที่ที่ลงไปแล้ว",
     "Wait where the later AoEs will land\nWhen the first set is done, run into where it went off",
     pic="sw-15")
step(P2, M, "④ แยกเป็นกากบาท", "④ Split into a cross",
     "ตอน ③: Malefic เหนือ·ใต้ ไปเหนือ·ใต้ / Malefic ตะวันออก·ตะวันตก ไปตะวันออก·ตะวันตก ยืนเป็นกากบาท\n"
     "Rule: มองบอส ถ้ามีเส้นแนวตรงจากตัวเองพาดบนตัวบอส = ร่องทางขวาของบอส / นอกนั้น = ร่องทางซ้ายของบอส",
     "During ③: north-south Malefic go north and south, east-west Malefic go east and west, in a cross\n"
     "Rule: looking at the boss, if a straight line from you runs over the boss = the notch on the boss's right / otherwise = the notch on its left",
     pic="sw-16")
step(P2, M, "⑤ เข้าร่องตาม Rule แล้วรับด้านที่ไม่มี Malefic", "⑤ Into the notch by the rule; take it on a clean side",
     "เข้าร่องตาม Rule แล้วรับ AoE ด้วยด้านที่ไม่มี Malefic",
     "Go into the notch by the rule and take the hit on a side without Malefic",
     pic="sw-17")
step(P2, M, "⑥ บอสส่ง AoE วงกลมที่ค้างไปที่ทุกคน", "⑥ The boss sends lingering circles to everyone",
     "บอสส่ง AoE วงกลมที่ค้างอยู่ (Silent Heat) ไปที่ผู้เล่นทุกคน",
     "The boss sends a lingering circle (Silent Heat) to every player",
     pic="sw-18")
step(P2, M, "⑦ Heavens' Confluence ทันที", "⑦ Heavens' Confluence at once",
     "ทำ Heavens' Confluence ทันที: แยกตามมาโครหรือกฎการกระจายตัว\n"
     "⑥–⑦ เจ็บมาก: นอกจาก mitigate ต้องวางแผน heal ให้ HP กลับมาก่อน Heavens' Confluence",
     "Heavens' Confluence comes straight away: spread by your macro or spread rule\n"
     "⑥–⑦ hurt a lot: besides mitigation, plan the heals so HP is back before Heavens' Confluence",
     pic="sw-19")
step(P2, M, "Rule ของ ④: ร่องซ้ายหรือขวา", "The rule for ④: left or right notch",
     "ตัวอย่างของคนที่ยืนทิศใต้\n"
     "มองบอส ถ้าเห็นเส้นแนวตรงจากตัวเองพาดบนตัวบอส = ร่องทางขวา\n"
     "นอกนั้น (ไม่มีเส้นบนตัวบอส หรือไม่มีเส้นแนวตรง) = ร่องทางซ้าย",
     "An example for the player standing south\n"
     "Looking at the boss, if you see a straight line from you running over the boss = the right notch\n"
     "Otherwise (no line over the boss, or no straight line) = the left notch",
     pic="sw-20")

M = "Malefic Quartering ③: Cardinal Horizons + Maw of the Wolf + Malefic Alignment"
step(P2, M, "ภาพรวม", "Overview",
     "โดน AoE จาก 2 ทิศที่มี Malefic = ตายทันที\n"
     "แนวโจมตีครั้งที่ 4 มี Malefic Portent มาก่อน (Malefic เพิ่ม 1 ด้าน)\n"
     "ครั้งสุดท้ายจึงต้องใช้ร่องของพื้นที่ทำดาเมจ รับ AoE ให้มาทางเดียว",
     "Taking AoEs from two Malefic sides = instant death\n"
     "Malefic Portent comes just before the fourth set (one more Malefic side)\n"
     "so the last one has to be taken from one direction only, using the notches of the damage floor",
     refs=[FR("sw-blades", V2, 510, "Cardinal Horizons: ใบมีดแดงที่ขอบสนาม = AoE ที่จะมาจากขอบ",
              "Cardinal Horizons: the red blades on the edge = the AoEs coming from the edge")])
step(P2, M, "① Malefic 2 ด้าน + กรวย 2 ชุด", "① Two Malefic sides + two sets of cones",
     "ทุกคนได้ Malefic 2 ด้าน\nCardinal Horizons: กรวย บน·ล่าง·ซ้าย·ขวา มา 2 ชุด",
     "Everyone gets Malefic on two sides\nCardinal Horizons: cones top·bottom·left·right, two sets",
     pic="sw-21")
step(P2, M, "② วงเตือนกรวยชุดที่ 2", "② The second set's telegraph", "วงเตือนกรวยชุดที่ 2", "The second set of cones shows",
     pic="sw-22")
step(P2, M, "③ ชุดแรกลง วิ่งเข้าที่ที่ลงไปแล้ว", "③ After the first set, run into it",
     "กรวยชุดแรกลงแล้ว วิ่งเข้าที่ที่ลงไปแล้ว", "When the first cones are done, run into where they went off",
     pic="sw-23")
step(P2, M, "④ Maw of the Wolf: ระวังครึ่งด้านหน้าบอส", "④ Maw of the Wolf: mind the boss's front half",
     "ครึ่งสนามด้านที่บอสหันไป ลืมง่ายมาก ต้องระวังให้ดี",
     "The half the boss faces: very easy to forget, so stay alert",
     pic="sw-24")
step(P2, M, "⑤ รับ AoE จากขอบ 2 ลูกด้วยด้านที่ไม่มี Malefic ×3", "⑤ Take two edge AoEs on clean sides ×3",
     "รับ AoE จากขอบสนาม 2 ลูกด้วยด้านที่ไม่มี Malefic ซ้ำ 3 ครั้ง\n"
     "ดูแค่ขอบสนามด้านที่ไม่มี Malefic ของตัวเองจะหลบง่าย",
     "Take two edge AoEs on sides without Malefic, three times\n"
     "Watching only the edge on your clean sides makes it easy",
     pic="sw-25")
step(P2, M, "⑥ ครั้งที่ 3: สายจากบอส = Malefic จะเพิ่ม 1 ด้าน", "⑥ The third time: tethers = one more Malefic side",
     "ครั้งที่ 3 บอสต่อสายกับทุกคน: Malefic จะเพิ่ม 1 ด้าน\n"
     "ตอนครั้งที่ 3 ต้องรู้แล้วว่าครั้งที่ 4 ต้องไปไหน\nทุกคนได้สาย จึงไม่ต้องแย่งสาย",
     "On the third set the boss tethers everyone: one more Malefic side is coming\n"
     "By the third set, know where you go for the fourth\nEveryone has a tether, so nobody has to take one",
     pic="sw-26")
step(P2, M, "⑦ ครั้งที่ 4: รับที่ร่องขอบสนาม", "⑦ The fourth: take it in an edge notch",
     "Malefic เพิ่ม 1 ด้าน: รับ AoE ครั้งที่ 4 ที่ขอบสนามที่รับได้\n"
     "ด้านในโดน AoE 2 ทิศ จึงต้องรับที่ร่องขอบสนาม",
     "One more Malefic side: take the fourth set at an edge where you can\n"
     "Inside you'd be hit from two ways, so it has to be an edge notch",
     pic="sw-27")
step(P2, M, "⑧ สุดท้าย: รับกรวยด้วยด้านที่ไม่มี Malefic", "⑧ Last: take the cones on your clean side",
     "สุดท้าย (Malefic Alignment) รับกรวยด้วยด้านที่ไม่มี Malefic ที่เหลือ",
     "Last (Malefic Alignment), take the cones on your remaining clean side",
     pic="sw-28")
step(P2, M, "หลังจากนี้ HP หนักมาก: เตรียมท่า heal แรงๆ", "HP is very tight after this: save strong heals",
     "รับ AoE 2 ทิศ 4 ครั้ง (⑤–⑦) > Malefic Alignment (⑧) > stack 3 ครั้ง > raid-wide\n"
     "แค่ AoE 4 ครั้งก็เจ็บมากแล้ว ยังมี stack และ raid-wide ตามมา\n"
     "ช่วงแรกที่ยังไม่ชิน Healer เน้น heal และเก็บท่า heal แรงๆ ไว้สำหรับช่วงนี้",
     "Four sets of two-way AoEs (⑤–⑦) > Malefic Alignment (⑧) > three stacks > a raid-wide\n"
     "The four sets alone hurt a lot, and the stacks and raid-wide come on top\n"
     "Until you're used to it, healers lean on healing and keep strong heals for this part")

M = "Falling Rock + Steelsbreath Bonds + Echoing Eight"
step(P2, M, "ภาพรวม", "Overview",
     "วงเตือน AoE ลดตามระยะ (ยิ่งไกลยิ่งเบา) + หินตกทั่วสนาม\n"
     "AoE ลดตามระยะลงแล้ว หินตกอีก 2 ก้อนกลางสนาม\n"
     "แล้วผู้เล่นโดนโซ่ และ AoE 8 ทิศเกิดที่เท้าผู้เล่น\n\n"
     "หิน 2 ก้อนกลางสนามต้องใช้ใน Malefic Quartering ครั้งที่ 4\n"
     "ห้ามให้ AoE 8 ทิศโดนหิน",
     "A distance-falloff AoE telegraph + rocks falling all over\n"
     "After the falloff AoE, two more rocks fall in the middle\n"
     "Then players are chained, and eight-way lines come out at their feet\n\n"
     "The two middle rocks are needed for the fourth Malefic Quartering\n"
     "Don't let the eight-way lines hit them",
     refs=[FR("sw-rocks", V2, 570, "Falling Rock: หินตก + AoE ลดตามระยะ ออกห่างจากจุดที่ตก",
              "Falling Rock: rocks fall + a falloff AoE; get away from where it lands")])
step(P2, M, "① หลบวงกลม แล้วออกห่างจาก AoE ลดตามระยะ", "① Dodge the circles, get away from the falloff",
     "หลบวงกลมที่ตกเป็นจุดๆ แล้วออกห่างจาก AoE ลดตามระยะ",
     "Dodge the scattered circles and move away from the falloff AoE",
     pic="sw-29")
step(P2, M, "② ไปกลางสนาม กระจายหลวมๆ", "② Middle of the floor, loosely spread",
     "ไปกลางสนามเพื่อทำโซ่ กระจายตัวหลวมๆ ไว้",
     "Go to the middle for the chains, loosely spread",
     pic="sw-30")
step(P2, M, "③ เดินเฉียงไปทางที่ไม่มีหินเพื่อตัดโซ่", "③ Move diagonally away from the rocks to break the chains",
     "เดินเฉียงไปทางที่ไม่มีหินเพื่อตัดโซ่\n"
     "Melee = ฝั่งเหนือ / Range = ฝั่งใต้\n"
     "ถ้าโซ่ผูก Melee·Tank และ Range·Healer: Melee กับ Healer ไปฝั่งตรงข้ามจากปกติ",
     "Move diagonally, away from the rocks, to break the chains\n"
     "Melee = north side / Range = south side\n"
     "If the chains are Melee·Tank and Range·Healer: the Melee and the Healer go to the opposite side from usual",
     pic="sw-31",
     says={"D1": "ฝั่งเหนือ (โซ่ Melee·Tank: ไปฝั่งตรงข้าม)", "D2": "ฝั่งใต้", "H1": "โซ่ Range·Healer: ไปฝั่งตรงข้ามจากปกติ"},
     says_en={"D1": "North side (chained to the Tank: the other side)", "D2": "South side", "H1": "Chained to the Range: the opposite side from usual"})
step(P2, M, "④ วาง Echoing Eight ที่มุมแล้วเข้าด้านใน", "④ Drop Echoing Eight in the corner, then come in",
     "วาง Echoing Eight ที่มุมขอบสนามที่ตัดโซ่ แล้วเข้าที่ปลอดภัยด้านใน\n"
     "ถ้า AoE โดนหิน หินจะแตก แล้ว Mechanic ต่อไปทำไม่ได้",
     "Drop Echoing Eight in the outer corner where you broke the chain, then come into the safe area\n"
     "If it hits a rock, the rock breaks and the next mechanic can't be done",
     pic="sw-32")

M = "Malefic Quartering ④: rocks + Cardinal Horizons"
step(P2, M, "① หลบกรวย ได้ Malefic 3 ด้าน", "① Dodge the cones; Malefic on three sides",
     "หลบกรวย 2 ชุดของ Cardinal Horizons\nทุกคนได้ Malefic 3 ด้าน: รับ AoE ได้แค่ทิศเดียว\n"
     "ใช้หินที่เหลือจากรอบก่อนบังไว้ 1 ทิศ",
     "Dodge Cardinal Horizons' two sets of cones\nEveryone gets Malefic on three sides: you can only take one direction\n"
     "Hide behind a rock left from before to block one direction",
     pic="sw-33")
step(P2, M, "② วงเตือนจากขอบสนาม", "② The edge telegraphs", "AoE จากขอบสนามขึ้นวงเตือน", "The edge AoEs show",
     pic="sw-34")
step(P2, M, "③ 1 ทิศหลบหลังหิน อีกทิศรับด้วยด้านที่ไม่มี Malefic ×4", "③ One behind the rock, one on the clean side ×4",
     "AoE จากขอบสนามมาเรื่อยๆ: 1 ทิศหลบหลังหิน อีก 1 ทิศรับด้วยด้านที่ไม่มี Malefic ซ้ำ 4 ครั้ง\n"
     "รอบหินเป็นพื้นที่ทำดาเมจ ห้ามยืน: เดินหลบหลังหินต้องระวังมาก\n\n"
     "หลังจากนี้: raid-wide > stack 3 ครั้ง > หมดเวลา",
     "Edge AoEs keep coming: block one with a rock and take one on a side without Malefic, four times\n"
     "The ground round each rock is a damage zone you can't stand in: move behind the rocks carefully\n\n"
     "After this: a raid-wide > three stacks > time runs out",
     pic="sw-35",
     refs=[FR("sw-rock4", V2, 640, "Malefic Quartering ครั้งที่ 4: ใช้หินบัง 1 ทิศ (รอบหินห้ามยืน)",
              "The fourth Malefic Quartering: block one direction with a rock (don't stand round it)")])

# ================================================================== boss 3: Pari of Plenty (game8 768634)
step(P3, "Heat Burst", "raid-wide ดาเมจเวท", "A magic raid-wide",
     "raid-wide ใช้ mitigate และ barrier ให้ดี\nต่างจากบอส 2 ตรงที่เป็นดาเมจเวท (magic) จึงลดได้ง่ายกว่า",
     "A raid-wide: use mitigation and barriers\nUnlike boss 2 it's magic, so it is easier to reduce")

M = "Fireflight by Pyrelight / Fireflight by Emberlight"
step(P3, M, "ภาพรวม", "Overview",
     "บอสไปทางเหนือ แล้วพุ่ง 3 ครั้ง ตีครึ่งสนามไปด้วยระหว่างพุ่ง\n"
     "พุ่งครบแล้วเกิด AoE donut รอบตัวบอส พร้อมกับ stack หรือ spread\n"
     "จำชื่อท่าตอนร่ายแรกไว้: Fireflight by Pyrelight = stack / Fireflight by Emberlight = spread\n"
     "แล้วไปทำ stack หรือ spread ที่จุดที่บอสพุ่งไปจบ\n"
     "วงเตือนเหมือนเวอร์ชัน Advanced และ normal",
     "The boss goes north, then charges three times, cleaving half the floor as it goes\n"
     "After the charges comes a donut round the boss together with a stack or a spread\n"
     "Remember the first cast: Fireflight by Pyrelight = stack / Fireflight by Emberlight = spread\n"
     "and do it where the boss ends up\n"
     "The telegraphs work as in Advanced and normal",
     refs=[FR("pe-path", V3, 50, "Fireflight: เส้นทางพุ่งของบอสขึ้นบนพื้น อ่านทางพุ่ง 3 ครั้งก่อน",
              "Fireflight: the boss's charge path shows on the floor; read all three charges first")])
step(P3, M, "① วงเตือนทางพุ่ง 1 > 2 > 3", "① The charge path 1 > 2 > 3",
     "บอสขึ้นวงเตือน 3 ครั้ง (เส้นทาง 1 > 2 > 3)\nดูชื่อท่าตอนร่ายว่าเป็น Pyrelight หรือ Emberlight",
     "The boss shows three charges (path 1 > 2 > 3)\nNote whether the cast is Pyrelight or Emberlight",
     pic="pe-02")
step(P3, M, "② พุ่งครั้งที่ 1", "② Charge 1", "พุ่งครั้งที่ 1", "The first charge", pic="pe-03")
step(P3, M, "③ พุ่งครั้งที่ 2", "③ Charge 2", "พุ่งครั้งที่ 2", "The second charge", pic="pe-04")
step(P3, M, "④ พุ่งครั้งที่ 3", "④ Charge 3", "พุ่งครั้งที่ 3", "The third charge", pic="pe-05")
step(P3, M, "⑤ Pyrelight: stack ที่จุดจบ", "⑤ Pyrelight: stack where it ends",
     "ที่จุดที่บอสพุ่งไปจบ ทำตามท่าที่ร่ายแรก\nFireflight by Pyrelight = stack ในรูของ donut",
     "Where the boss ends up, do what the first cast said\nFireflight by Pyrelight = stack in the donut's hole",
     pic="pe-06")
step(P3, M, "⑤ Emberlight: spread ที่จุดจบ", "⑤ Emberlight: spread where it ends",
     "Fireflight by Emberlight = spread\nหันหน้าหาบอสที่ขอบสนาม เรียงจากซ้ายไปขวา: MT > H1 > D2 > D1",
     "Fireflight by Emberlight = spread\nFacing the boss at the edge, left to right: MT > H1 > D2 > D1",
     strict=True, pic="pe-07")
step(P3, M, "แบบที่ 1 / แบบที่ 2", "Pattern 1 / pattern 2",
     "มี 2 แบบหลัก (นับว่าครั้งแรกตีซ้ายหรือขวาด้วยเป็น 4 แบบ)\n"
     "ดูวงเตือนครั้งที่ 2 ก็รู้ที่ปลอดภัย\n"
     "แบบที่ 1: วงเตือนครั้งที่ 2 อยู่ฝั่งที่ครั้งที่ 1 ตี (ภาพนี้)\n"
     "แบบที่ 2: วงเตือนครั้งที่ 2 อยู่ฝั่งปลอดภัยของครั้งที่ 1 (ภาพถัดไป)",
     "There are two main patterns (four, counting whether the first hits left or right)\n"
     "The second charge's telegraph tells you the safe spot\n"
     "Pattern 1: the second telegraph is on the side the first one hits (this picture)\n"
     "Pattern 2: the second telegraph is on the first one's safe side (next picture)",
     pic="pe-08")
step(P3, M, "แบบที่ 2", "Pattern 2", "วงเตือนครั้งที่ 2 อยู่ฝั่งปลอดภัยของครั้งที่ 1",
     "The second telegraph is on the first one's safe side", pic="pe-09")
step(P3, M, "แบบที่ 1: วิธีเดิน", "Pattern 1: how to move",
     "ครั้งที่ 2 เผากลางสนามกว้าง: ไปรอที่ขอบตะวันออกหรือตะวันตกฝั่งปลอดภัยไว้ก่อน\n"
     "เห็นครั้งที่ 2 พุ่งแล้วเดินหน้าไปรอครั้งที่ 3\nเป็นแบบที่ยุ่งกว่า\n"
     "ภาพ: ครั้งที่ 1 / 2 / 3 (วงกลมขาว = ผู้เล่นตัวอย่าง)",
     "The second charge burns a wide strip of the middle: wait at the east or west edge on the safe side\n"
     "After the second charge, move forward ready for the third\nThe fiddlier pattern\n"
     "Pictures: charge 1 / 2 / 3 (white disc = an example player)",
     pic="pe-10")
step(P3, M, "แบบที่ 1: ครั้งที่ 2", "Pattern 1: charge 2", "แบบที่ 1 ครั้งที่ 2", "Pattern 1, charge 2", pic="pe-11")
step(P3, M, "แบบที่ 1: ครั้งที่ 3", "Pattern 1: charge 3", "แบบที่ 1 ครั้งที่ 3", "Pattern 1, charge 3", pic="pe-12")
step(P3, M, "แบบที่ 2: วิธีเดิน", "Pattern 2: how to move",
     "แบบที่เห็นใน Advanced: ครั้งที่ 1 จบแล้วไปที่จุดจบของครั้งที่ 3 เลย ง่าย\n"
     "ภาพ: ครั้งที่ 1 / 2 / 3 (วงกลมขาว = ผู้เล่นตัวอย่าง)",
     "The one seen in Advanced too: after the first charge, go straight to where the third ends. Easy\n"
     "Pictures: charge 1 / 2 / 3 (white disc = an example player)",
     pic="pe-13")
step(P3, M, "แบบที่ 2: ครั้งที่ 2", "Pattern 2: charge 2", "แบบที่ 2 ครั้งที่ 2", "Pattern 2, charge 2", pic="pe-14")
step(P3, M, "แบบที่ 2: ครั้งที่ 3", "Pattern 2: charge 3", "แบบที่ 2 ครั้งที่ 3", "Pattern 2, charge 3", pic="pe-15")
step(P3, M, "ตัวอย่าง spread: ทางซ้าย", "A spread example: on the left",
     "ตัวอย่าง spread (Emberlight) เมื่อบอสไปจบทางซ้าย\nหันหน้าหาบอส จากซ้ายไปขวา: MT > H1 > D2 > D1",
     "A spread (Emberlight) example with the boss ending on the left\nFacing the boss, left to right: MT > H1 > D2 > D1",
     strict=True, pic="pe-16")
step(P3, M, "ตัวอย่าง spread: ทางขวา", "A spread example: on the right",
     "ตัวอย่าง spread เมื่อบอสไปจบทางขวา\nหันหน้าหาบอส จากซ้ายไปขวา: MT > H1 > D2 > D1",
     "A spread example with the boss ending on the right\nFacing the boss, left to right: MT > H1 > D2 > D1",
     strict=True, pic="pe-17")

M = "Wheel of Fableflight"
step(P3, M, "ภาพรวม", "Overview",
     "ร่างแยก 4 ตัวโผล่ที่ขอบนอก ตีครึ่งสนาม\nที่ปลอดภัยเหลือ 1 ช่องที่มุมใดมุมหนึ่งเสมอ\n"
     "ไปที่ช่องปลอดภัยแล้วรอเส้นแนวตรงบางๆ จากร่างแยกก่อน (เส้นที่เห็นตอนวงเตือน)\n"
     "เส้นจบแล้วรีบเข้ามุมของช่อง แล้วทำ Kindled Flame (stack คู่) หรือ Scattered Kindling (spread) ของบอสตรงกลาง\n"
     "โดยเฉพาะตอน spread: หลบเส้นแนวตรงก่อน แล้วค่อยไปมุมช่อง\n\n"
     "วิธีหาของ game8: หาที่ที่ ฟ้า > แดง เรียงตามเข็มนาฬิกา (เลือกฟ้าตัวไหนก็ได้ ตัวถัดไปตามเข็มเป็นแดง)\n"
     "ใน 2 ที่นั้น ไปมุมที่ยังไม่โดนตีทับ",
     "Four doubles appear at the edge and burn half the floor each\nThe safe spot is always a single corner tile\n"
     "Go to it and first wait out the doubles' thin lines (the ones shown in the telegraph)\n"
     "Then hurry to the tile's corner for the boss's Kindled Flame (pair stacks) or Scattered Kindling (spread)\n"
     "Especially for the spread: dodge the line first, then go to the tile's corner\n\n"
     "game8's way to find it: look for blue > red going clockwise (any blue whose clockwise neighbour is red)\n"
     "of those two, go to the corner no cleave covers",
     refs=[FR("pe-wheel", V3, 130, "Wheel of Fableflight: ร่างแยกที่ขอบนอก ดูทิศหมุนของแต่ละตัว",
              "Wheel of Fableflight: the doubles at the edge; read each one's turn")])
step(P3, M, "① ร่างแยกโผล่: วงเตือน + ทิศหมุน", "① Doubles: telegraphs + turning",
     "ร่างแยกโผล่ บอกวงเตือน (เส้นบาง) และทิศหมุน", "The doubles appear, showing their thin lines and which way they turn",
     pic="pe-18")
step(P3, M, "② ที่ปลอดภัย = 1 ใน 4 มุม", "② The safe spot: one corner",
     "ที่ปลอดภัยเหลือ 1 ใน 4 มุม: หาแล้ววิ่งเข้า", "One of the four corners is safe: find it and run in",
     pic="pe-19")
step(P3, M, "③ Scattered Kindling: spread", "③ Scattered Kindling: spread",
     "บอสตรงกลางร่าย Scattered Kindling: spread ในช่องปลอดภัย",
     "The boss in the middle casts Scattered Kindling: spread inside the safe tile",
     strict=True, pic="pe-20")
step(P3, M, "③ Kindled Flame: stack คู่", "③ Kindled Flame: pair stacks",
     "บอสตรงกลางร่าย Kindled Flame: stack เป็นคู่ในช่องปลอดภัย",
     "The boss in the middle casts Kindled Flame: pair stacks inside the safe tile",
     strict=True, pic="pe-21")
step(P3, M, "ตำแหน่ง spread (ทุกมุม)", "Spread spots (every corner)",
     "ตำแหน่ง spread ในช่องปลอดภัย ทั้ง 4 มุม", "The spread spots in the safe tile, for all four corners",
     strict=True, pic="pe-24")
step(P3, M, "ตำแหน่ง stack คู่ (ทุกมุม)", "Pair-stack spots (every corner)",
     "ตำแหน่ง stack คู่ในช่องปลอดภัย ทั้ง 4 มุม\nคู่: MT·D1 / H1·D2",
     "The pair-stack spots in the safe tile, for all four corners\nPairs: MT·D1 / H1·D2",
     strict=True, pic="pe-25")

step(P3, "Fireflight: Four Long Nights", "ครึ่งสนาม 4 ครั้ง + ล่อ ใกล้/ไกล", "Four cleaves + near/far baits",
     "ครึ่งสนาม 4 ครั้ง + 1 คนล่อ ใกล้/ไกล ต่อครั้ง + ที่เหลือ stack\n"
     "① ดูวงเตือน ใกล้/ไกล และทิศหมุน ทั้ง 4 ครั้ง\n"
     "② ไปที่ปลอดภัยของครึ่งสนามครั้งแรก 1 คนไปที่ล่อ อีก 3 คน stack บนวงเป้าของบอส\n"
     "③ คนล่อเปลี่ยนทุกครั้ง ที่เหลือ stack บนวงเป้า\n④ ทั้งหมด 4 ครั้ง\n\n"
     "ล่อใกล้: ครั้งที่ 1 MT / ครั้งที่ 2 D1\nล่อไกล: ครั้งที่ 1 H1 / ครั้งที่ 2 D2\n"
     "ที่ล่อ: ใกล้ = ใต้ตัวบอส / ไกล = นอกวงเป้า ตรงแนวแบ่งครึ่งสนาม\nใกล้และไกลห้ามโดนซ้ำคนเดิม\n\n"
     "Rule หมุน: หมุนคนละทางติดกัน = ไม่ต้องย้าย / ทางเดียวกันติดกัน = ย้ายไปอีกฝั่ง\n"
     "ใน 4 ครั้งมีครั้งเดียวที่ทิศหมุนกลับ: ครั้งนั้นอยู่ที่เดิม",
     "Four half-floor cleaves + one near/far bait each time + everyone else stacks\n"
     "① Read all four near/far and turning telegraphs\n"
     "② Go to the first cleave's safe side; one player baits, the other three stack on the boss's target circle\n"
     "③ The baiter changes every time; the rest stack on the circle\n④ Four times in all\n\n"
     "Near: 1st MT / 2nd D1\nFar: 1st H1 / 2nd D2\n"
     "Where: near = under the boss / far = outside the target circle, on the cleave's edge\nNeither may hit the same player twice\n\n"
     "Turning rule: two different turns in a row = don't move / the same turn twice = move to the other side\n"
     "Exactly once in the four the turn reverses: that time, stay put",
     says={"MT": "ล่อใกล้ครั้งที่ 1 (ใต้บอส)", "D1": "ล่อใกล้ครั้งที่ 2 (ใต้บอส)", "H1": "ล่อไกลครั้งที่ 1 (นอกวงเป้า)", "D2": "ล่อไกลครั้งที่ 2 (นอกวงเป้า)"},
     says_en={"MT": "Near bait 1 (under the boss)", "D1": "Near bait 2 (under the boss)", "H1": "Far bait 1 (outside the circle)", "D2": "Far bait 2 (outside the circle)"},
     refs=[FR("pe-four", V3, 300, "Fireflight: Four Long Nights: ดูทิศหมุนที่ตัวบอสทั้ง 4 ครั้ง",
              "Fireflight: Four Long Nights: read the boss's four turns")])

M = "Pari's Curse"
step(P3, M, "ภาพรวม + ลำดับ", "Overview + priority",
     "ได้ debuff Curse of Immolation (ส้ม: แก้ได้ด้วยธาตุน้ำแข็ง)\nและ Curse of Solitude / Curse of Companionship (ม่วง: spread / stack)\n"
     "อัญมณี (น้ำแข็ง) บนสนามถูกปิดแล้วสลับที่: ตามดูพรมที่วิ่ง\n"
     "คนมี Curse of Immolation: ยืนในที่ที่โดนแต่ AoE น้ำแข็ง (3 ที่) เพื่อแก้ debuff\n"
     "คนไม่มีอะไร: ยืนที่ที่ไม่โดนทั้งไฟและน้ำแข็ง\ndebuff สุ่ม จึงมีลำดับ\n\n"
     "ลำดับคนมี Curse of Immolation:\n"
     "2 คน (spread : spread): ไล่จากที่ 1 ไปที่ 3 ตามลำดับ MT > H1 > D1 > D2\n"
     "3 คน (spread : stack : ไม่มีสี): ไล่จากที่ 1 ไปที่ 3 spread > stack และคนไม่มีสี",
     "You get Curse of Immolation (orange: cleansed by ice)\nand Curse of Solitude / Curse of Companionship (purple: spread / stack)\n"
     "The (ice) gems on the floor are hidden and shuffled: follow the running carpet\n"
     "Curse of Immolation: stand where only an ice AoE hits (3 spots) to clear it\n"
     "No debuff: stand where neither fire nor ice hits\nThe debuffs are random, hence a priority\n\n"
     "Curse of Immolation priority:\n"
     "Two (spread : spread): from spot 1 to spot 3 in the order MT > H1 > D1 > D2\n"
     "Three (spread : stack : none): from spot 1 to spot 3, spread > stack and the colourless one",
     refs=[FR("pe-curse", V3, 380, "Pari's Curse: พรมวิ่งตามเส้น ตามดูว่าอัญมณีน้ำแข็งไปอยู่ไหน",
              "Pari's Curse: the carpet runs along the line; follow where the ice gems end up")])
step(P3, M, "① แบบที่ 1: ใช้ที่ 1 2 3", "① Pattern 1: spots 1 2 3",
     "แบบที่ 1: ใช้ที่ 1 / 2 / 3 ในภาพทำ stack และ spread\nช่องส้ม = โดนกากบาทของอัญมณีแดง",
     "Pattern 1: use spots 1 / 2 / 3 in the picture for the stack and the spreads\nOrange tiles = hit by a red gem's cross",
     pic="pe-30")
step(P3, M, "② แบบที่ 2", "② Pattern 2", "แบบที่ 2: ที่ 1 / 2 / 3 ตามภาพ", "Pattern 2: spots 1 / 2 / 3 as shown", pic="pe-31")
step(P3, M, "③ อัญมณีฟ้าถูกเฉลย", "③ The blue gems revealed",
     "ตำแหน่งอัญมณีฟ้าที่สลับแล้วถูกเฉลย: สุดท้าย AoE แดง (ไฟ) กับฟ้า (น้ำแข็ง) ปนกัน (ตำแหน่งฟ้าสุ่ม)\n"
     "ทำ stack / spread ในที่ที่ไม่โดนกากบาทของอัญมณีแดง\nคนมี Curse of Immolation ต้องโดน AoE ฟ้าด้วย",
     "The shuffled blue gems are revealed: in the end red (fire) and blue (ice) AoEs are mixed (blue is random)\n"
     "Do the stack / spreads where no red gem's cross reaches\nCurse of Immolation holders must also be hit by blue",
     pic="pe-32")

M = "Spurning Flames + Impassioned Sparks"
step(P3, M, "ภาพรวม", "Overview",
     "Impassioned Sparks ร่ายเสร็จ: AoE วงกลมที่ค่อยๆ ขยาย + AoE วงกลมใหญ่ที่ผู้เล่น (puddle) มาพร้อมกัน\n"
     "แล้ว debuff ของทุกคนกลายเป็นโซ่ คู่กันแยกห่างเพื่อตัดโซ่\n\n"
     "① หลังร่าย ดูทิศเหนือหรือใต้ ไปขอบนอกฝั่งที่ลูกไฟไม่ตกลงมา (เหนือตรงหรือใต้ตรง)\n"
     "② มองตะวันออก·ตะวันตก มี AoE ที่ตัวแล้ว ไปทางที่ลูกไฟระเบิด (เดินเฉียงทางลัดไปขอบตะวันออก/ตะวันตก ไม่ซิกแซก)\n"
     "③ แล้ววาง AoE ไล่ไปทิศใกล้ๆ (เหนือ/ใต้/ตะวันออก/ตะวันตก) ตามลำดับ\n"
     "④ วาง AoE ครบ 4 ครั้งแล้วรวมใต้บอส แล้วไปมุมตามบทบาทเพื่อตัดโซ่\n\n"
     "สรุป: ไปฝั่งตรงข้ามกับวงเตือนแรก (ที่เรียงเหนือ-ใต้) พอ puddle ขึ้นที่เท้า วิ่งเข้าที่ที่วงเตือนแรกระเบิดไปแล้ว ต่อจากนั้นวิ่งตามลำดับที่ระเบิด",
     "When Impassioned Sparks finishes: growing circle telegraphs + a big circle (puddle) on each player at the same time\n"
     "Then everyone's debuff becomes a chain; pairs break it by moving apart\n\n"
     "① After the cast, look north or south and go to the edge where no fireball fell (due north or due south)\n"
     "② Watching east·west, when your AoE appears, go towards the fireball that exploded (straight diagonally to the east/west edge, no zigzag)\n"
     "③ Then keep dropping the AoE at the nearby north/south/east/west spots in turn\n"
     "④ After four drops, gather under the boss and run to your role's corner to break the chain\n\n"
     "In short: go opposite the first telegraph (the north-south pair); when the puddle appears at your feet, run into where the first one exploded, then follow the order they explode",
     refs=[FR("pe-sparks", V3, 668, "Impassioned Sparks: วงกลมขยายบนพื้น + puddle ที่ผู้เล่น วิ่งตามลำดับที่ระเบิด",
              "Impassioned Sparks: growing circles + a puddle on each player; follow the order they explode")])
step(P3, M, "ตัดโซ่ที่มุมตามบทบาท", "Break the chains in your role's corner",
     "ตะวันตกเฉียงเหนือ: Tank / ตะวันออกเฉียงเหนือ: Healer / ตะวันตกเฉียงใต้: Melee / ตะวันออกเฉียงใต้: Range\n"
     "ตัดโซ่พร้อมวาง AoE วงกลมใหญ่\n"
     "บางทีโซ่ผูก H1·D2 หรือ MT·D1 (คู่ที่แยกแนวเหนือ-ใต้) ก็ตัดได้ไม่มีปัญหา\n"
     "ตามด้วย raid-wide: กลับกลางสนาม ใช้ mitigate และรับ heal",
     "North-west: Tank / north-east: Healer / south-west: Melee / south-east: Range\n"
     "Break the chain while dropping the big circle\n"
     "The chains may join H1·D2 or MT·D1 (pairs split north-south); that still breaks fine\n"
     "A raid-wide follows: come back to the middle for mitigation and heals",
     strict=True, pic="pe-37")

M = "Fableflight"
step(P3, M, "ภาพรวม", "Overview",
     "ล่อการพุ่งของร่างแยกที่มีสายต่อ แล้วเหยียบ tower ที่โผล่ตามลำดับ\n"
     "2 คนที่มี marker พรม (สายทำงานก่อน): เหยียบ tower ที่ทำให้ครึ่งสนามไม่ไปโดนคนอื่น ก่อนอย่างอื่น\n"
     "อีก 2 คน: เหยียบ tower ในฝั่งของตัวเองตามลำดับ\n"
     "ตอนที่ไม่ได้ล่อสาย tower อาจไกลจากที่ยืนแรก: เตรียมตัวเดินไว้ ไม่งั้นไม่ทัน",
     "Bait the charges of the tethered doubles and take the towers as they appear\n"
     "The two with the carpet marker (whose tether goes first) take, before anything else, the tower that keeps their cleave off the others\n"
     "The other two take the towers on their own side in order\n"
     "When you aren't the tether, your tower can be far from your start: be ready to move or you'll be late",
     refs=[FR("pe-towers", V3, 780, "Fableflight: tower บนพื้น + ร่างแยกที่ขอบนอก",
              "Fableflight: the towers on the floor + the doubles at the edge")])
step(P3, M, "① ยืนกากบาทก่อน Doubling ร่ายเสร็จ", "① In a cross before Doubling finishes",
     "ต้องยืนตามภาพให้เสร็จก่อน Doubling ร่ายจบ\nสายจะต่อกับคนที่ใกล้ร่างแยกที่ขอบนอก ยืนมั่วแล้ว Mechanic พัง\n"
     "เหนือ: MT / ตะวันตก: H1 / ตะวันออก: D1 / ใต้: D2",
     "Be in place as shown before Doubling finishes casting\nThe tethers go to whoever is nearest each double, so a sloppy spot breaks the mechanic\n"
     "North: MT / west: H1 / east: D1 / south: D2",
     strict=True, pic="pe-38",
     says={"MT": "เหนือ", "H1": "ตะวันตก", "D1": "ตะวันออก", "D2": "ใต้"},
     says_en={"MT": "North", "H1": "West", "D1": "East", "D2": "South"})
step(P3, M, "② tower 4 อัน + marker พรม", "② Four towers + carpet markers",
     "tower 4 อันโผล่ และคนที่ล่อครึ่งสนามของร่างแยกได้ marker พรมสีฟ้า",
     "Four towers appear, and the players baiting the doubles' cleaves get the blue carpet marker",
     strict=True, pic="pe-39")
step(P3, M, "③ คนมี marker พรมเหยียบ tower ก่อน", "③ Carpet markers take their tower",
     "คนมี marker พรมเหยียบ tower ที่ครึ่งสนามจากร่างแยก (ของสายตัวเอง) ไม่ไปเผา tower อื่น\n"
     "คนไม่มี marker พรมเหยียบ tower ที่เหลือตาม Rule",
     "The carpet-marked players take the tower where their double's cleave won't burn another tower\n"
     "The others take the remaining towers by the rule",
     pic="pe-40")
step(P3, M, "④ tower + ครึ่งสนามทำงาน", "④ Towers + cleaves go off",
     "tower และครึ่งสนามใส่คนมี marker พรมทำงาน\nคนมี marker พรมขยับนิดหน่อยไม่ให้โดนครึ่งสนาม",
     "The towers and the cleaves on the carpet-marked players go off\nCarpet-marked players shift a little to stay out of the cleave",
     pic="pe-41")
step(P3, M, "⑤ อีกรอบ", "⑤ Once more",
     "ทำแบบเดิมอีกรอบ: marker พรมไปอยู่กับอีก 2 คน และ tower โผล่ใหม่",
     "The same again: the carpet markers go to the other two, and new towers appear",
     pic="pe-42")
step(P3, M, "⑥ ครึ่งสนามทำงาน", "⑥ The cleaves go off",
     "ครึ่งสนามทำงาน\nคนไม่มี marker พรมต้องเดินไว ใช้ Sprint ด้วยจะปลอดภัยกว่า",
     "The cleaves go off\nThose without the carpet must be quick; using Sprint makes it safer",
     pic="pe-43")
step(P3, M, "Rule: tower ของคนที่ไม่มี marker พรม", "Rule: towers for those without the carpet",
     "แบ่งตะวันออก·ตะวันตกเป็นหลัก\nH1: tower ฝั่งตะวันตก / D1: tower ฝั่งตะวันออก\n"
     "MT กับ D2 (ยืนเหนือ·ใต้): tower ฝั่งที่ AoE ของร่างแยกหันไป\n"
     "คนมี marker พรม (คนที่ครึ่งสนามมาลง) ทำได้อย่างเดียวคือล่อครึ่งสนามให้ไม่โดน tower อื่น",
     "Split mainly east·west\nH1: the west towers / D1: the east towers\n"
     "MT and D2 (north·south): the tower on the side the double's AoE points to\n"
     "The carpet-marked players (whom the cleave hits) have no choice: bait the cleave away from the other towers",
     strict=True, pic="pe-44",
     says={"H1": "tower ฝั่งตะวันตก", "D1": "tower ฝั่งตะวันออก", "MT": "tower ฝั่งที่ AoE ของร่างแยกหันไป", "D2": "tower ฝั่งที่ AoE ของร่างแยกหันไป"},
     says_en={"H1": "The west towers", "D1": "The east towers", "MT": "The tower on the side the double's AoE points to", "D2": "The tower on the side the double's AoE points to"})

M = "Charming Baubles + Kindled Flame"
step(P3, M, "① stack คู่ในช่องกลาง", "① Pair stacks in the middle tiles",
     "อัญมณีแดงโผล่ เหลือที่ปลอดภัย 2 ช่อง อยู่ใน 4 ช่องกลางเสมอ\n"
     "ใช้ช่องด้านในทำ stack คู่ (Kindled Flame) ไม่ใช้ที่ปลอดภัยรอบนอก\n"
     "มุมใกล้บอส: Tank + Melee (MT·D1) / มุมตรงข้าม: Healer + Range (H1·D2)",
     "Red gems appear, leaving two safe tiles, always among the four in the middle\n"
     "Do the pair stacks (Kindled Flame) on an inner tile; the outer safe tile isn't used\n"
     "Corner by the boss: Tank + Melee (MT·D1) / the opposite corner: Healer + Range (H1·D2)",
     strict=True, pic="pe-45")
step(P3, M, "② ถ้า MT·D1 หรือ H1·D2 โดน stack ทั้งคู่", "② If both stacks land on MT·D1 or H1·D2",
     "ถ้า stack ลงทั้ง MT·D1 หรือทั้ง H1·D2: H1 กับ D1 สลับที่",
     "If both stacks land on MT·D1 or on H1·D2: H1 and D1 swap",
     strict=True, pic="pe-46")

step(P3, "Charméd Flight: Four Nights", "ครึ่งสนามหมุน 4 ครั้ง + กากบาทของอัญมณี", "Four turning cleaves + gem crosses",
     "วงเตือนแนวตรงฝั่งตะวันออกหรือตะวันตก แล้วครึ่งสนามหมุน 4 ครั้ง + กากบาทของอัญมณีที่ตกลงมา\n"
     "หลบครึ่งสนามตาม Rule หมุน อัญมณีเห็นแล้วค่อยหลบเข้าช่องว่าง\n"
     "อัญมณีแดงไม่ปิด 4 ช่องกลางทั้งหมด: รอที่รอยต่อของช่องตามการหมุน พอเห็นวงเตือน (ส้ม) ของอัญมณีก็สไลด์เข้าช่องที่ปลอดภัย\n\n"
     "Rule หมุน: หมุนคนละทางติดกัน = ไม่ต้องย้าย / ทางเดียวกันติดกัน = ย้ายไปอีกฝั่ง",
     "A line telegraph on the east or west side, then four turning half-floor cleaves + crosses from falling gems\n"
     "Dodge the cleaves by the turning rule; dodge the gems into the gaps once you see them\n"
     "The red gems never cover all four middle tiles: wait on the tile seams as the cleaves turn, and slide into a safe tile when the gems' (orange) telegraph shows\n\n"
     "Turning rule: two different turns in a row = don't move / the same turn twice = move to the other side",
     refs=[FR("pe-charmed", V3, 845, "Charméd Flight: Four Nights: ครึ่งสนามหมุน + อัญมณีตก",
              "Charméd Flight: Four Nights: turning cleaves + falling gems")])

# ================================================================== the overview, requirements, rewards
NOTE = ("แผนตาม game8: หน้าบอส Another ทั้ง 3 ตัว (แผนที่ปาร์ตี้ทั่วไปเล่นกัน อิงแผนของ Idyllshire)\n"
        "บอส 1: Ceaseless Current เรียงแนวทแยงแถวเดียว\n"
        "บอส 2: Malefic Quartering ครั้งที่ 2 ต่างจากแผนของ Idyllshire\n"
        "บอส 3: แผน Idyllshire ฉบับปรับปรุง (Impassioned Sparks ใช้วิธีของ Channu)\n\n"
        "ปาร์ตี้ 4 คน: MT = Tank (game8: T) / H1 = Healer (game8: H) / D1 = Melee (game8: D1) / D2 = Range (game8: D2)\n\n"
        "สลับเมื่อ stack ลงคู่เดียวกัน: H1 ⇔ D1 (ทั้ง 3 บอส)\n"
        "Pari: คู่ stack MT·D1 / H1·D2\n\n"
        "Marker: game8 วางเฉพาะบอส 1 และบอส 2 (ดูขั้นแรกของแต่ละบอส)\n"
        "บอส 3 ไม่มี marker: เลข 1 2 3 ในภาพบอส 3 เป็นป้ายกำกับ\n\n"
        "ชุบได้แค่ Variant Raise II คนละ 1 ครั้ง")
NOTE_EN = ("Plan follows game8: its Another page for each of the three bosses (the strat most parties play, based on Idyllshire's)\n"
           "Boss 1: Ceaseless Current on one diagonal line\n"
           "Boss 2: the second Malefic Quartering differs from Idyllshire's plan\n"
           "Boss 3: Idyllshire's revised plan (Impassioned Sparks by Channu's method)\n\n"
           "A party of four: MT = Tank (game8: T) / H1 = Healer (game8: H) / D1 = Melee (game8: D1) / D2 = Range (game8: D2)\n\n"
           "Swap when both stacks land on one pair: H1 ⇔ D1 (all three bosses)\n"
           "Pari: stack pairs MT·D1 / H1·D2\n\n"
           "Waymarks: game8 places them for bosses 1 and 2 only (see each boss's first step)\n"
           "Boss 3 has none: the 1 2 3 in boss 3's pictures are labels\n\n"
           "Only Variant Raise II can raise, once per player")

TRISASSANT = {"map": {"map": "k5t1/00", "size": 200, "x": 12.0, "y": 13.3, "label": "Trisassant"},
              "say": "จุดแลก: Trisassant ใน Old Sharlayan (X: 12.0 Y: 13.3)", "say_en": "Where to exchange: Trisassant in Old Sharlayan (X: 12.0 Y: 13.3)"}
OSMON = {"map": {"map": "k5t1/00", "size": 200, "x": 11.9, "y": 13.3, "label": "Osmon"},
         "say": "Old Sharlayan (X: 11.9 Y: 13.3) — Osmon (Shallow Moor X: 12.0 Y: 13.3 และ Memolivia X: 11.9 Y: 13.3 ยืนใกล้กัน)",
         "say_en": "Old Sharlayan (X: 11.9 Y: 13.3) — Osmon (Shallow Moor at X: 12.0 Y: 13.3 and Memolivia at X: 11.9 Y: 13.3 stand close by)"}

rewards = [
    {"kind": "token", "name": "Corvosi Manuscript", "icon_src": ICON("ui/icon/065000/065136_hr1.tex"),
     "say": "เหรียญของ Another Merchant's Tale (หน้ารวมของ game8)\nเคลียร์ถึง Pari of Plenty 1 รอบ = 4 เล่ม\n\n"
            "แลกที่ Trisassant ใน Old Sharlayan (X: 12.0 Y: 13.3)\n"
            "Genie Lamp (mount): 100\nThe Merchant's Tale Framer's Kit: 8\nWhat Moves the Heart Orchestrion Roll: 8\nElevated Ester: 20\nMateria XII: 4\nMateria XI: 2",
     "say_en": "Another Merchant's Tale's token (game8's series page)\nOne clear through Pari of Plenty = 4\n\n"
               "Exchange them with Trisassant in Old Sharlayan (X: 12.0 Y: 13.3)\n"
               "Genie Lamp (mount): 100\nThe Merchant's Tale Framer's Kit: 8\nWhat Moves the Heart Orchestrion Roll: 8\nElevated Ester: 20\nMateria XII: 4\nMateria XI: 2",
     "pics": [TRISASSANT]},
    {"kind": "mount", "name": "Genie Lamp", "icon_src": ICON("ui/icon/059000/059969_hr1.tex"),
     "say": "mount (genie of the lamp): แลกด้วย Corvosi Manuscript 100 เล่ม ที่ Trisassant",
     "say_en": "A mount (genie of the lamp): 100 Corvosi Manuscripts from Trisassant",
     "pics": [{"src": ICON("ui/icon/068000/068333_hr1.tex"), "say": "genie of the lamp (Mount Guide)", "say_en": "genie of the lamp (Mount Guide)"}]},
    {"kind": "orchestrion", "name": "What Moves the Heart Orchestrion Roll", "icon_src": ICON("ui/icon/025000/025945_hr1.tex"),
     "say": "orchestrion roll: แลกด้วย Corvosi Manuscript 8 เล่ม", "say_en": "An orchestrion roll: 8 Corvosi Manuscripts"},
    {"kind": "other", "name": "The Merchant's Tale Framer's Kit", "icon_src": ICON("ui/icon/026000/026625_hr1.tex"),
     "say": "ของตกแต่ง portrait และ adventurer plate: แลกด้วย Corvosi Manuscript 8 เล่ม",
     "say_en": "Portrait and adventurer plate decorations: 8 Corvosi Manuscripts"},
]

guide = {
    "slug": "merchants-tale", "short": "Merchant (C)", "sort": 1,
    "name": "Another Merchant's Tale",
    "category": "other", "expansion": "Dawntrail", "patch": "7.45",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/767197",
    "content_key": "cri:Another Merchant's Tale",
    "note": NOTE, "en": {"note": NOTE_EN},
    "macro_en": "", "macro_ja": "",
    "req": {"level": 100, "ilvl": 770, "party": 4, "minutes": 90,
            "unlock": "1. จบเมนเควสต์ Endwalker และคุยกับ Osmon ที่ Old Sharlayan (X: 11.9 Y: 13.3) หนึ่งครั้ง\n"
                      "2. รับเควสต์ A Spellbinding Read จาก Shallow Moor ที่ Old Sharlayan (X: 12.0 Y: 13.3) (Lv90) → ปลดล็อก the Merchant's Tale\n"
                      "3. จบ A Spellbinding Read และเอาชนะบอส 3 ตัวที่ท้ายเส้นทางของ the Merchant's Tale → ปลดล็อก the Merchant's Tale (Advanced) ที่ Memolivia (X: 11.9 Y: 13.3) (Lv100)\n"
                      "4. ชนะบอสทุกตัวในรอบเดียวใน the Merchant's Tale (Advanced) → ปลดล็อก Another Merchant's Tale ที่ Osmon (X: 11.9 Y: 13.3)\n"
                      "IL sync 795 (IL ขั้นต่ำ 770)",
            "unlock_en": "1. Finish the main scenario quest Endwalker and speak once to Osmon in Old Sharlayan (X: 11.9 Y: 13.3)\n"
                         "2. Take the quest A Spellbinding Read from Shallow Moor in Old Sharlayan (X: 12.0 Y: 13.3) (Lv90) → unlocks the Merchant's Tale\n"
                         "3. Finish A Spellbinding Read and defeat the three bosses at the ends of the Merchant's Tale's routes → unlocks the Merchant's Tale (Advanced) with Memolivia (X: 11.9 Y: 13.3) (Lv100)\n"
                         "4. Defeat every boss in one run of the Merchant's Tale (Advanced) → unlocks Another Merchant's Tale with Osmon (X: 11.9 Y: 13.3)\n"
                         "IL sync 795 (minimum IL 770)",
            "unlock_pics": [OSMON]},
}

defaults = {"frame": [4, 3], "bg": "#5c5e63", "waymarks": {}, "iconSize": 6.4, "markSize": 6, "bossSize": 10, "ring": 5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps),
      "phases", len(dict.fromkeys(s["phase"] for s in steps)), "mechs", len(dict.fromkeys((s["phase"], s["mech"]) for s in steps)))
