"""Builds scripts/guides/data/m11s.json (M11S, the Tyrant: game8's plan, Nukemaru's video)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/m11s"
sys.path.insert(0, HERE + "/tools")
import scenes11 as S

OUT = r"scripts/guides/data/m11s.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk_*
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "9fMy4yJRNTM"
FR = lambda name, t, say, say_en: (f"frames/m11s/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")
FRV = lambda name, t, say, say_en: (f"frames/m11s/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/VKkMzakWT18?t={t}")


def sc(fn, square=False):
    S.F.k = 1.0 if square else 0.75
    return fn()


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = 5.5
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


P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วงกลาง", "Middle part")
P3 = ("ช่วงแยกสนาม", "Split arena")
P4 = ("ช่วงท้าย", "Last part")
P5 = ("ผ่าน DPS check", "Beating the DPS check")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker 8 ทิศ (1234 ต้องมี)", "8 waymarks (1234 are a must)",
     "Marker ตามภาพของ game8:\nA เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\n1 ตะวันตกเฉียงเหนือ\n2 ตะวันออกเฉียงเหนือ\n3 ตะวันออกเฉียงใต้\n4 ตะวันตกเฉียงใต้\n\n"
     "ABCD ใช้บอกทิศเหนือ ใต้ ออก ตก\n1234 ใช้เป็นจุดยืนตอน Majestic Meteor: ต้องวางทุกครั้ง",
     "Waymarks as game8 draws them:\nA north\nB east\nC south\nD west\n1 north-west\n2 north-east\n3 south-east\n4 south-west\n\n"
     "ABCD give north, south, east and west\n1234 are the standing spots for Majestic Meteor: always place them",
     strict=False, pic=1, scene=sc(S.waymarks, True))

# ------------------------------------------------------------------ first part
step(P1, "Crown of Arcadia", "raid-wide กายภาพ", "Physical raid-wide",
     "raid-wide แบบกายภาพ (physical)\nFeint ได้ผลมาก เพราะเป็นดาเมจกายภาพ\nAddle / Dark Missionary ก็ยัง mitigate ได้ 5% อย่าลืมกด\n\n"
     "ไฟต์นี้บอสใช้ท่ากายภาพเยอะ ไม่ใช่แค่ Crown of Arcadia: Melee ใช้ Feint ทุกครั้งที่ใช้ได้",
     "A physical raid-wide\nFeint works very well, since the damage is physical\nAddle / Dark Missionary still mitigate 5%: don't forget them\n\n"
     "The boss uses many physical attacks, not only Crown of Arcadia: Melee, use Feint wherever you can",
     strict=False,
     refs=[FR("crown-of-arcadia", 35, "Crown of Arcadia: raid-wide กายภาพทั้งสนาม ใช้ Feint + mitigate", "Crown of Arcadia: a physical raid-wide over the whole arena; Feint + mitigate")])

RAW = "Raw Steel Trophy + Raw Steel"
AXE_SAYS = {"MT": "รับท่าแรงด้วยกันกับ ST หน้าบอส", "ST": "รับท่าแรงด้วยกันกับ MT หน้าบอส (เปิด Tank Stance)",
            "H1": "ซ้ายของบอส", "H2": "ขวาของบอส", "D1": "หลังบอส ฝั่งซ้าย (ใกล้)", "D2": "หลังบอส ฝั่งขวา (ใกล้)",
            "D3": "หลังบอส ฝั่งซ้าย (ไกล)", "D4": "หลังบอส ฝั่งขวา (ไกล)"}
AXE_SAYS_EN = {"MT": "Take the heavy hit together with ST in front of the boss", "ST": "Take the heavy hit together with MT in front of the boss (tank stance on)",
               "H1": "Left of the boss", "H2": "Right of the boss", "D1": "Behind the boss, left (near)", "D2": "Behind the boss, right (near)",
               "D3": "Behind the boss, left (far)", "D4": "Behind the boss, right (far)"}
step(P1, RAW, "แบบขวาน (Axe)", "Axe pattern",
     "บอสสร้างอาวุธ แล้วรูปแบบ AoE เปลี่ยนไปตามอาวุธ: มี 2 แบบ คือขวาน (Axe) กับเคียว (Scythe)\n"
     "ทั้งสองแบบมีท่าแรงใส่ Tank 2 คนเสมอ\n"
     "ท่าแรงเลือกเป้าเป็น aggro อันดับ 1 และ 2: ST ต้องเปิด Tank Stance ไว้ ให้อยู่ aggro อันดับ 2\n\n"
     "ภาพ (ขวาน): Tank 2 คนอยู่ด้วยกันหน้าบอส คนอื่นแยกกันตามจุดในภาพ ทุกคนโดน AoE วงกลม",
     "The boss makes a weapon, and the AoEs depend on the weapon: two kinds, the axe and the scythe\n"
     "Both always come with a heavy hit on the two tanks\n"
     "The heavy hit targets aggro #1 and #2: ST must keep tank stance on to stay #2\n\n"
     "Picture (axe): the two tanks together in front of the boss, everyone else apart at the spots shown; everyone takes a circle AoE",
     strict=True, pic=2, scene=sc(S.raw_axe), says=AXE_SAYS, says_en=AXE_SAYS_EN,
     refs=[FR("raw-steel-trophy", 47, "Raw Steel Trophy: บอสสร้างอาวุธ (ขวาน หรือ เคียว) รูปแบบ AoE เปลี่ยนตามอาวุธ", "Raw Steel Trophy: the boss makes a weapon (axe or scythe); the AoEs depend on it")])
step(P1, RAW, "แบบเคียว (Scythe)", "Scythe pattern",
     "ภาพ (เคียว): Tank 2 คนอยู่หน้าบอส ห่างกันเล็กน้อย คนอื่นรวมกันหลังบอส\n"
     "ในภาพมี AoE กรวยกว้างด้านหน้า (ฝั่ง Tank) และกรวยแคบด้านหลัง (ฝั่งที่ทุกคนรวมกัน)\n\n"
     "อย่าลืม: ST เปิด Tank Stance ค้างไว้",
     "Picture (scythe): the two tanks in front of the boss, a little apart; everyone else together behind the boss\n"
     "The picture has a wide cone in front (the tanks' side) and a narrow cone behind (where everyone gathers)\n\n"
     "Remember: ST keeps tank stance on",
     strict=["MT", "ST"], pic=3, scene=sc(S.raw_scythe),
     says={"MT": "หน้าบอส ฝั่งซ้าย", "ST": "หน้าบอส ฝั่งขวา (เปิด Tank Stance)"},
     says_en={"MT": "In front of the boss, left", "ST": "In front of the boss, right (tank stance on)"},
     refs=[FR("raw-steel-scythe", 248, "แบบเคียว: บอสถือเคียว Tank 2 คนรับหน้าบอส คนอื่นอยู่หลังบอส", "Scythe pattern: the boss holds a scythe; the two tanks in front, everyone else behind")])

TW = "Trophy Weapons + Assault Evolved"
SPREAD_SAYS = {"MT": "หน้าบอส", "D3": "หน้าซ้าย", "D4": "หน้าขวา", "H1": "ซ้าย", "H2": "ขวา", "D1": "หลังซ้าย", "ST": "หลังบอส", "D2": "หลังขวา"}
SPREAD_SAYS_EN = {"MT": "Boss's front", "D3": "Front-left", "D4": "Front-right", "H1": "Left", "H2": "Right", "D1": "Back-left", "ST": "Boss's back", "D2": "Back-right"}
SPREAD_SAYS = {k: "spread ชิดบอส: " + v + " (อิงทิศที่บอสหัน)" for k, v in SPREAD_SAYS.items()}
SPREAD_SAYS_EN = {k: "Spread close to the boss: " + v + " (by where the boss faces)" for k, v in SPREAD_SAYS_EN.items()}
GROUP_SAYS = {s: "กลุ่ม MT: ฝั่งซ้าย" for s in ("MT", "H1", "D1", "D3")}
GROUP_SAYS.update({s: "กลุ่ม ST: ฝั่งขวา" for s in ("ST", "H2", "D2", "D4")})
GROUP_SAYS_EN = {s: "MT group: the left side" for s in ("MT", "H1", "D1", "D3")}
GROUP_SAYS_EN.update({s: "ST group: the right side" for s in ("ST", "H2", "D2", "D4")})

step(P1, TW, "กฎอาวุธ 3 แบบ", "The three weapons",
     "Trophy Weapons: บอสวางอาวุธ 3 ชิ้นบนสนาม (ดาบ / เคียว / ขวาน)\n"
     "Assault Evolved: บอสพุ่งไปใช้อาวุธทีละชิ้น\n"
     "ลำดับ: เริ่มจากอาวุธที่บอสหันหน้าไปหา แล้ววนตามเข็มนาฬิกา\n\n"
     "เคียว (Scythe) = AoE donut + กรวยใส่ทุกคน → เข้าชิดบอส spread 8 ทิศ อิงทิศที่บอสหัน\n"
     "ดาบ (Sword) = AoE กากบาท (+) + line stack 2 สาย → stack 4:4 กลุ่ม MT ซ้าย / กลุ่ม ST ขวา\n"
     "ขวาน (Axe) = AoE วงกลม + stack → หลบวงกลม แล้ว stack 8 คนตรงกลาง\n\n"
     "บอสหันหน้าใหม่ทุกครั้งที่ย้ายไปอาวุธชิ้นถัดไป: ดูทิศที่บอสหันตลอด",
     "Trophy Weapons: the boss places three weapons on the field (sword / scythe / axe)\n"
     "Assault Evolved: the boss charges to each weapon in turn and uses it\n"
     "Order: the weapon the boss faces first, then clockwise\n\n"
     "Scythe = donut + a cone at everyone → get close to the boss and spread in 8 directions, by where the boss faces\n"
     "Sword = cross (+) AoE + 2 line stacks → 4:4 stacks, MT group left / ST group right\n"
     "Axe = circle AoE + a stack → out of the circle, all 8 stack in the middle\n\n"
     "The boss turns every time it moves to the next weapon: keep watching where it faces",
     strict=False,
     refs=[FR("trophy-weapons", 70, "Trophy Weapons: อาวุธปักอยู่บนสนาม บอสพุ่งไปหาชิ้นที่หันหน้าไปก่อน", "Trophy Weapons: weapons stand on the field; the boss charges to the one it faces first")])
step(P1, TW, "① วางอาวุธ 3 ชิ้น", "① Three weapons appear",
     "① บอสวางดาบ เคียว ขวาน บนสนาม\nภาพ: เคียวทางตะวันตก / ดาบทางตะวันออกเฉียงเหนือ / ขวานทางใต้",
     "① The boss places a sword, a scythe and an axe on the field\nPicture: scythe west / sword north-east / axe south",
     strict=False, pic=4, scene=sc(S.tw1))
step(P1, TW, "② บอสหันไปหาอาวุธชิ้นแรก", "② The boss faces the first weapon",
     "② บอสหันหน้าไปหาอาวุธที่จะใช้ก่อน (ภาพ: เคียว)",
     "② The boss turns to face the weapon it uses first (picture: the scythe)",
     strict=False, pic=5, scene=sc(S.tw2))
step(P1, TW, "③ ชิ้นที่ 1: เคียว → spread 8 ทิศ", "③ Weapon 1: scythe → 8-way spread",
     "③ อาวุธชิ้นแรก (ภาพ: เคียว): หลบ AoE donut โดยเข้าไปชิดบอส แล้ว spread 8 ทิศรอบบอส อิงทิศที่บอสหันหน้า\n\n"
     "จุด spread (ตาม macro, บอสหันขึ้น):\nแถวหน้า: D3 / MT / D4\nกลาง: H1 / H2\nแถวหลัง: D1 / ST / D2",
     "③ The first weapon (picture: the scythe): dodge the donut by getting close to the boss, then spread in 8 directions around it, by where the boss faces\n\n"
     "Spread spots (by the macro, boss facing up):\nFront row: D3 / MT / D4\nMiddle: H1 / H2\nBack row: D1 / ST / D2",
     strict=True, pic=6, scene=sc(S.tw3), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P1, TW, "④ ชิ้นที่ 2: ดาบ → stack 4:4", "④ Weapon 2: sword → 4:4 stacks",
     "④ ชิ้นถัดไปตามเข็มนาฬิกา (ภาพ: ดาบ): หลบ AoE กากบาทจากบอส แล้วแบ่ง 4:4\n"
     "กลุ่ม MT ทางซ้าย / กลุ่ม ST ทางขวา\n\nกลุ่ม MT: MT H1 D1 D3\nกลุ่ม ST: ST H2 D2 D4",
     "④ The next weapon clockwise (picture: the sword): dodge the cross from the boss, then split 4:4\n"
     "MT group on the left / ST group on the right\n\nMT group: MT H1 D1 D3\nST group: ST H2 D2 D4",
     strict=True, pic=7, scene=sc(S.tw4), says=GROUP_SAYS, says_en=GROUP_SAYS_EN,
     refs=[FR("sword-cross", 84, "ดาบ: AoE กากบาท (+) จากบอส แบ่ง 4:4 stack ในช่องว่างระหว่างแขนกากบาท", "Sword: a cross (+) from the boss; split 4:4 and stack in the gaps between its arms")])
step(P1, TW, "⑤ ชิ้นที่ 3: ขวาน → stack 8 คน", "⑤ Weapon 3: axe → stack all 8",
     "⑤ ชิ้นถัดไปตามเข็มนาฬิกา (ภาพ: ขวาน): หลบ AoE วงกลมรอบบอส แล้ว stack 8 คนตรงกลางสนาม",
     "⑤ The next weapon clockwise (picture: the axe): dodge the circle around the boss, then all 8 stack in the middle of the arena",
     strict=False, pic=8, scene=sc(S.tw5))

VS = "Void Stardust"
VS_SAYS = {"MT": "หน้าบอส ฝั่งซ้าย (ใกล้)", "ST": "หน้าบอส ฝั่งขวา (ใกล้)", "H1": "ซ้ายของบอส (ไกล)", "H2": "ขวาของบอส (ไกล)",
           "D1": "หลังบอส ฝั่งซ้าย (ใกล้)", "D2": "หลังบอส ฝั่งขวา (ใกล้)", "D3": "หลังบอส ฝั่งซ้าย (ไกลสุด)", "D4": "หลังบอส ฝั่งขวา (ไกลสุด)"}
VS_SAYS_EN = {"MT": "Boss's front, left (near)", "ST": "Boss's front, right (near)", "H1": "Left of the boss (far)", "H2": "Right of the boss (far)",
              "D1": "Boss's back, left (near)", "D2": "Boss's back, right (near)", "D3": "Boss's back, left (farthest)", "D4": "Boss's back, right (farthest)"}
VS_SAYS = {k: "spread: " + v for k, v in VS_SAYS.items()}
VS_SAYS_EN = {k: "Spread: " + v for k, v in VS_SAYS_EN.items()}
step(P1, VS, "① รวมหลังบอส ทิ้ง AoE ลูกแรก", "① Gather behind the boss, drop the first AoE",
     "Void Stardust: AoE วงกลมขึ้นใต้เท้าทุกคน 3 ครั้งติดกัน แล้วได้มาร์ก stack หรือมาร์ก spread\n"
     "ทุกคนทิ้ง AoE ด้วยกัน แล้วรวมกันหรือแยกกันตามมาร์ก\n\n"
     "① รวมกันหลังบอส ทิ้ง AoE ลูกแรก\nPF ส่วนใหญ่ ครั้งแรกรวมกันทางใต้ (ฝั่ง Marker C)",
     "Void Stardust: circle AoEs appear under everyone 3 times in a row, then stack or spread markers\n"
     "Everyone drops the AoEs together, then gathers or spreads by the markers\n\n"
     "① Gather behind the boss and drop the first AoE\nIn PF the first one is usually dropped south (the C side)",
     strict=False, pic=9, scene=sc(S.vs1),
     refs=[FRV("void-stardust", 88, "Void Stardust: AoE วงกลมใต้เท้าทุกคน 3 ครั้ง ทิ้งด้วยกันวนรอบบอส", "Void Stardust: circles under everyone 3 times; drop them together around the boss")])
step(P1, VS, "② ทิ้ง 3 ลูกวนตามเข็ม", "② Three drops, clockwise",
     "② เริ่มจากหลังบอส ทิ้ง AoE 3 ลูกวนตามเข็มนาฬิกา",
     "② Starting behind the boss, drop the three AoEs going clockwise",
     strict=False, pic=10, scene=sc(S.vs2))
step(P1, VS, "③ มาร์ก spread: ไปจุด spread", "③ Spread markers: go to your spot",
     "③ ได้มาร์ก spread: แยกไปจุดของตัวเองตามภาพ",
     "③ Spread markers: go to your own spot as shown",
     strict=True, pic=11, scene=sc(S.vs_spread), says=VS_SAYS, says_en=VS_SAYS_EN,
     refs=[FR("void-stardust-spread", 166, "มาร์กบนหัว: spread (ภาพนี้) หรือ stack ครั้งที่ 2 จะได้อีกแบบเสมอ", "The head markers: spread (here) or stack; the second time always brings the other one")])
step(P1, VS, "③ มาร์ก stack: stack ข้างบอส", "③ Stack markers: stack beside the boss",
     "③ ได้มาร์ก stack: รวมกัน stack ข้างบอส",
     "③ Stack markers: stack together beside the boss",
     strict=False, pic=12, scene=sc(S.vs_stack))
step(P1, VS, "④ Trophy Weapons + Assault Evolved อีกครั้ง", "④ Trophy Weapons + Assault Evolved again",
     "④ ทำ Trophy Weapons + Assault Evolved ทั้งชุดอีกครั้ง\ngame8 ใช้ภาพนี้แทนตอนจัดการอาวุธชิ้นที่ 3 เสร็จแล้ว",
     "④ The whole Trophy Weapons + Assault Evolved again\ngame8 uses this picture for the moment the third weapon is done",
     strict=True, pic=13, scene=sc(S.tw3), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P1, VS, "⑤ ครั้งที่ 2: ทิ้ง AoE ลูกแรกหลังบอส", "⑤ The second time: first AoE behind the boss",
     "⑤ Void Stardust มาอีกครั้งทันทีโดยไม่มีร่าย: รวมกันหลังบอส ทิ้ง AoE\nRange ไม่ต้องรวมหลังบอสก็ได้ ไปทิ้งทางขอบสนามแทนได้",
     "⑤ Void Stardust comes again at once, with no cast: gather behind the boss and drop the AoE\nRange may skip the gathering and drop theirs towards the edge instead",
     strict=False, pic=14, scene=sc(S.vs5))
step(P1, VS, "⑥ Melee ทิ้ง 3 ลูกวนตามเข็ม", "⑥ Melee drop three, clockwise",
     "⑥ กลุ่ม Melee ทิ้ง AoE 3 ลูกวนตามเข็มนาฬิกา โดยอิงตำแหน่งบอส",
     "⑥ The melee group drops its three AoEs clockwise, placed by the boss",
     strict=False, pic=15, scene=sc(S.vs6))
step(P1, VS, "⑦ ครั้งแรก spread → ครั้งนี้ stack", "⑦ First was spread → now stack",
     "ครั้งที่ 2 ได้มาร์กแบบที่ครั้งแรกไม่ได้เสมอ\n\n⑦ ครั้งแรกเป็น spread: ครั้งนี้ stack รวมกันข้างบอส",
     "The second time always brings the marker the first one didn't\n\n⑦ First was spread: now stack together beside the boss",
     strict=False, pic=16, scene=sc(S.vs_stack2))
step(P1, VS, "⑦ ครั้งแรก stack → ครั้งนี้ spread", "⑦ First was stack → now spread",
     "⑦ ครั้งแรกเป็น stack: ครั้งนี้ spread ไปจุดของตัวเอง อิงทิศที่บอสหันหน้า",
     "⑦ First was stack: now spread to your own spot, by where the boss faces",
     strict=True, pic=17, scene=sc(S.vs_spread2), says=VS_SAYS, says_en=VS_SAYS_EN)

DOM = "Dance of Domination Trophy"
DOM_SAYS = {"H1": "stack คู่กับ D3: แถวริมขอบ ฝั่งซ้าย", "D3": "stack คู่กับ H1: แถวริมขอบ ฝั่งซ้าย",
            "H2": "stack คู่กับ D4: แถวริมขอบ ฝั่งขวา", "D4": "stack คู่กับ H2: แถวริมขอบ ฝั่งขวา",
            "MT": "stack คู่กับ D1: แถวข้างบอส ฝั่งซ้าย", "D1": "stack คู่กับ MT: แถวข้างบอส ฝั่งซ้าย",
            "ST": "stack คู่กับ D2: แถวข้างบอส ฝั่งขวา", "D2": "stack คู่กับ ST: แถวข้างบอส ฝั่งขวา"}
DOM_SAYS_EN = {"H1": "Pair stack with D3: edge row, left", "D3": "Pair stack with H1: edge row, left",
               "H2": "Pair stack with D4: edge row, right", "D4": "Pair stack with H2: edge row, right",
               "MT": "Pair stack with D1: boss row, left", "D1": "Pair stack with MT: boss row, left",
               "ST": "Pair stack with D2: boss row, right", "D2": "Pair stack with ST: boss row, right"}
step(P1, DOM, "① raid-wide หลายครั้ง + บอสฟันรอยลงสนาม", "① Several raid-wides while the boss cuts the floor",
     "① raid-wide แบบกายภาพหลายครั้ง พร้อมกับบอสฟันรอยลงบนสนาม: ใช้ mitigate ให้พอ\n"
     "จากนั้นเกิด AoE แนวตรง 6 เส้นตามรอยฟัน และ 4 คนได้มาร์ก stack\n"
     "AoE แนวตรงเว้นจุดปลอดภัยไว้ 4 จุด: ให้จุดปลอดภัยฝั่งริมขอบสนามเป็น 'เหนือ'\n"
     "(ภาพ: วงชมพู = จุดปลอดภัยริมขอบ)",
     "① Several physical raid-wides while the boss cuts lines into the floor: mitigate enough\n"
     "Then 6 line AoEs along the cuts, and stack markers on 4 players\n"
     "The lines leave 4 safe spots: treat the safe spots at the arena's edge as 'north'\n"
     "(Picture: pink rings = the safe spots at the edge)",
     strict=False, pic=18, scene=sc(S.dom1),
     refs=[FR("domination-lines", 224, "Dance of Domination Trophy: รอยฟันบนพื้นกลายเป็น AoE แนวตรง หาจุดปลอดภัยริมขอบ", "Dance of Domination Trophy: the cuts on the floor become line AoEs; find the safe spots at the edge")])
step(P1, DOM, "② stack คู่ที่จุดปลอดภัย 4 จุด", "② Pair stacks in the 4 safe spots",
     "② ถือจุดปลอดภัยริมขอบเป็นเหนือ แล้วแยกไปจุดปลอดภัยละ 2 คน รับ stack เป็นคู่\n\n"
     "คู่ (ตาม macro, เหนือ = ริมขอบ):\nแถวริมขอบ: H1·D3 ซ้าย / H2·D4 ขวา\nแถวข้างบอส: MT·D1 ซ้าย / ST·D2 ขวา",
     "② With the edge safe spots as north, go 2 to each safe spot and take the stacks in pairs\n\n"
     "Pairs (by the macro, north = the edge):\nEdge row: H1·D3 left / H2·D4 right\nBoss row: MT·D1 left / ST·D2 right",
     strict=True, pic=19, scene=sc(S.dom2), says=DOM_SAYS, says_en=DOM_SAYS_EN)

step(P1, "Charybdistopia", "HP ทุกคนเหลือ 1", "Everyone's HP to 1",
     "ท่านี้ทำให้ HP ทุกคนเหลือ 1\nรวมกันแถวกลางสนาม เพื่อให้ Healer heal ได้ทั่ว ไม่หลุดใคร\n\n"
     "ก่อนหน้านี้มี Raw Steel Trophy ครั้งที่ 2: รับแล้วไม่ต้อง heal เพราะ HP จะถูกบังคับให้เหลือ 1 อยู่ดี",
     "This sets everyone's HP to 1\nGather near the middle so the healers miss nobody\n\n"
     "Just before it comes the second Raw Steel Trophy: no need to heal after it, since HP is forced to 1 anyway",
     strict=False)

UTW = "Ultimate Trophy Weapons + Assault Apex"
TORN_SAYS = {"D3": "tornado เหนือ: ฝั่งซ้าย", "MT": "tornado เหนือ: ฝั่งขวา", "H1": "tornado ตะวันตก: ฝั่งบน", "D1": "tornado ตะวันตก: ฝั่งล่าง",
             "D4": "tornado ตะวันออก: ฝั่งบน", "H2": "tornado ตะวันออก: ฝั่งล่าง", "ST": "tornado ใต้: ฝั่งซ้าย", "D2": "tornado ใต้: ฝั่งขวา"}
TORN_SAYS_EN = {"D3": "North tornado: left side", "MT": "North tornado: right side", "H1": "West tornado: upper side", "D1": "West tornado: lower side",
                "D4": "East tornado: upper side", "H2": "East tornado: lower side", "ST": "South tornado: left side", "D2": "South tornado: right side"}
TORN_SAYS = {k: "ล่อกรวย " + v for k, v in TORN_SAYS.items()}
TORN_SAYS_EN = {k: "Bait the cone, " + v for k, v in TORN_SAYS_EN.items()}
step(P1, UTW, "① อาวุธชิ้นที่ 1 (ภาพ: ขวาน)", "① Weapon 1 (picture: the axe)",
     "Ultimate Trophy Weapons: บอสวางอาวุธบนสนาม แล้วโจมตีแบบเดียวกับ Trophy Weapons + Assault Evolved (ดาบ / เคียว / ขวาน เหมือนเดิม)\n"
     "ต่างกันตรงลำดับ: ใช้อาวุธตามลำดับที่วาง\n"
     "โจมตีอาวุธละ 2 ครั้ง รวม 6 ครั้ง แล้วล่อกรวยจากพายุหมุน (tornado)\n\n"
     "① วางอาวุธชิ้นที่ 1: ครั้งแรกบอสโจมตีจากอาวุธที่วาง",
     "Ultimate Trophy Weapons: the boss places weapons and attacks as in Trophy Weapons + Assault Evolved (same sword / scythe / axe)\n"
     "What differs is the order: the weapons are used in the order they were placed\n"
     "Each weapon attacks twice, 6 in all, then the tornado cones are baited\n\n"
     "① Weapon 1 appears: the first attack comes from the weapon placed",
     strict=False, pic=20, scene=sc(S.utw1))
step(P1, UTW, "② จัดการชิ้นที่ 1 + ดูชิ้นที่ 2", "② Handle weapon 1, watch weapon 2",
     "② จัดการอาวุธชิ้นที่ 1 (ภาพ: ขวาน → stack 8 คน นอกวงกลม)\n"
     "ตอนนี้อาวุธชิ้นที่ 2 ถูกวางแล้ว: ดูไว้\n"
     "มี 2 แบบ: วางวนตามเข็มนาฬิกา หรือวนทวนเข็มนาฬิกา",
     "② Handle weapon 1 (picture: the axe → all 8 stack outside the circle)\n"
     "Weapon 2 has been placed by now: look for it\n"
     "Two patterns: placed going clockwise, or counter-clockwise",
     strict=False, pic=21, scene=sc(S.utw2))
step(P1, UTW, "③ จัดการชิ้นที่ 2 + ดูชิ้นที่ 3", "③ Handle weapon 2, watch weapon 3",
     "③ จัดการอาวุธชิ้นที่ 2 (ภาพ: เคียว → เข้าชิดบอส spread 8 ทิศ)\nชิ้นที่ 3 ถูกวางที่ทิศหลัก (ทิศใดทิศหนึ่งของกากบาท +): ดูไว้",
     "③ Handle weapon 2 (picture: the scythe → close to the boss, 8-way spread)\nWeapon 3 is placed on a cardinal (one arm of a +): look for it",
     strict=True, pic=22, scene=sc(S.utw3), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P1, UTW, "④ จัดการชิ้นที่ 3 + ดูชิ้นที่ 4", "④ Handle weapon 3, watch weapon 4",
     "④ จัดการอาวุธชิ้นที่ 3 (ภาพ: ดาบ → stack 4:4 กลุ่ม MT / กลุ่ม ST)\nชิ้นที่ 4 ถูกวางที่ทิศหลัก: ดูไว้\n\n"
     "ตั้งแต่ชิ้นที่ 3 เป็นต้นไป จุดที่อาวุธเคยอยู่จะมีพายุหมุน (tornado) ค้างไว้: ห้ามแตะ\n"
     "แตะแล้วโดน knockback + ดาเมจ + debuff Damage Down",
     "④ Handle weapon 3 (picture: the sword → 4:4 stacks, MT group / ST group)\nWeapon 4 is placed on a cardinal: look for it\n\n"
     "From weapon 3 on, a tornado stays where each weapon was: don't touch it\n"
     "Touching one means knockback + damage + a Damage Down debuff",
     strict=True, pic=23, scene=sc(S.utw4), says=GROUP_SAYS, says_en=GROUP_SAYS_EN,
     refs=[FR("tornadoes", 306, "tornado ค้างตรงจุดที่อาวุธเคยอยู่ ห้ามแตะ (knockback + Damage Down)", "Tornadoes stay where the weapons were: don't touch (knockback + Damage Down)")])
step(P1, UTW, "⑤ จัดการชิ้นที่ 4 + ดูชิ้นที่ 5", "⑤ Handle weapon 4, watch weapon 5",
     "⑤ จัดการอาวุธชิ้นที่ 4 (ภาพ: ขวาน → stack 8 คน นอกวงกลม)\nชิ้นที่ 5 ถูกวางที่ทิศหลัก: ดูไว้",
     "⑤ Handle weapon 4 (picture: the axe → all 8 stack outside the circle)\nWeapon 5 is placed on a cardinal: look for it",
     strict=False, pic=24, scene=sc(S.utw5))
step(P1, UTW, "⑥ จัดการชิ้นที่ 5 + ดูชิ้นที่ 6", "⑥ Handle weapon 5, watch weapon 6",
     "⑥ จัดการอาวุธชิ้นที่ 5 (ภาพ: เคียว → เข้าชิดบอส spread 8 ทิศ)\nชิ้นที่ 6 ถูกวางที่ทิศหลัก: ดูไว้",
     "⑥ Handle weapon 5 (picture: the scythe → close to the boss, 8-way spread)\nWeapon 6 is placed on a cardinal: look for it",
     strict=True, pic=25, scene=sc(S.utw6), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P1, UTW, "⑦ ชิ้นที่ 6: ใช้ที่ฝั่ง A เสมอ", "⑦ Weapon 6: always on the A side",
     "⑦ จัดการอาวุธชิ้นที่ 6 (ภาพ: ดาบ → stack 4:4)\nอาวุธชิ้นที่ 6 ใช้ที่ฝั่ง A (เหนือ) เสมอ",
     "⑦ Handle weapon 6 (picture: the sword → 4:4 stacks)\nWeapon 6 is always used on the A side (north)",
     strict=True, pic=26, scene=sc(S.utw7), says=GROUP_SAYS, says_en=GROUP_SAYS_EN)
step(P1, UTW, "⑧ ล่อกรวยจาก tornado 4 ทิศ", "⑧ Bait the cones from the four tornadoes",
     "⑧ ใช้อาวุธครบ 6 ครั้งแล้ว บอสกลับไปกลางสนาม แล้ว tornado ทั้ง 4 ทิศยิงกรวย (cone) ใส่คนที่ใกล้ที่สุด\n"
     "เข้าไปใกล้ tornado ยืนที่จุดของตัวเอง ล่อกรวยไม่ให้โดนคนอื่น\n\n"
     "จุดล่อ (ตาม macro):\nเหนือ: D3 / MT\nตะวันตก: H1 / D1\nตะวันออก: D4 / H2\nใต้: ST / D2\n\n"
     "อย่ายืนมุมตื้นเพื่อจะได้ตีบอสเร็วขึ้น: กรวยอาจไปโดนคนข้างๆ ยืนลึกเข้าไปให้แน่ใจว่าไม่โดนใคร",
     "⑧ After the 6 attacks the boss returns to the middle, and the four tornadoes fire a cone at whoever is nearest\n"
     "Go close to your tornado at your own spot and bait its cone away from everyone else\n\n"
     "Bait spots (by the macro):\nNorth: D3 / MT\nWest: H1 / D1\nEast: D4 / H2\nSouth: ST / D2\n\n"
     "Don't stand at a shallow angle to reach the boss sooner: the cone can hit your neighbour. Stand deep so it hits nobody",
     strict=True, pic=27, scene=sc(S.utw8), says=TORN_SAYS, says_en=TORN_SAYS_EN)

# ------------------------------------------------------------------ middle part
step(P2, "Great Wall of Fire", "line stack แรง 2 ครั้ง ใส่ Tank", "Heavy line stack, twice, on a tank",
     "line stack ท่าแรง 2 ครั้งติดกัน ใส่ aggro อันดับ 1\n"
     "Tank ที่ยืนหัวแถวรับครั้งแรกจะได้ debuff: ครั้งที่ 2 ให้ Tank ที่ไม่มี debuff ยืนหัวแถวรับแทน\n"
     "จุดที่โดนมี AoE แนวตรงค้างอยู่: รับแล้วรีบขยับออกด้านข้างทันที\n\n"
     "PF ส่วนใหญ่:\nครั้งที่ 1 (ก่อน Meteorain): MT ใช้ invuln\nครั้งที่ 2 (หลัง Majestic Meteor): รับแบบ stack\n\n"
     "ถ้าจะใช้ invuln อย่าใช้ของ PLD: invuln ของ PLD จะคูลดาวน์ไม่ทันใช้ตอน Heartbreak Kick",
     "A heavy line stack, two hits in a row, on aggro #1\n"
     "The tank at the front for the first hit gets a debuff: for the second, the tank without it stands at the front\n"
     "A line AoE stays where it lands: step sideways out of it right after\n\n"
     "In most PFs:\n1st (before Meteorain): MT invulns it\n2nd (after Majestic Meteor): taken as a stack\n\n"
     "If you invuln, don't use PLD's: it won't be back in time for Heartbreak Kick",
     strict=False,
     refs=[FR("great-wall-of-fire", 352, "Great Wall of Fire: line stack จากบอส จุดที่โดนมีไฟค้าง รีบขยับออกด้านข้าง", "Great Wall of Fire: a line stack from the boss; fire stays where it lands, step sideways")])

ORB = "Orbital Omen + Fire and Fury"
step(P2, ORB, "① Tank ล็อกบอสหันเหนือ", "① Tanks fix the boss facing north",
     "Orbital Omen: รูบนขอบสนามโผล่เป็นคู่ แล้วยิง AoE แนวตรงจากรูนั้น\n"
     "Fire and Fury: AoE กรวยหน้า-หลังบอส มาพร้อม Orbital Omen ลูกแรก\n\n"
     "วิธีของ game8 (แบบที่ PF ส่วนใหญ่ใช้): ล็อกบอสหันเหนือ / รอข้างบอสตรงจุดตัดของเส้นลูกที่ 2 / Fire and Fury ลงปุ๊บหลบเข้าช่องทแยงช่องแรก / แล้วกลับที่เดิมตอนเส้นลูกที่ 2 ลง\n"
     "ทำได้เพราะเส้นลูกที่ 2 ตัดกันใน 4 ช่องกลางเสมอ\n\n"
     "① Tank ล็อกให้บอสหันหน้าไปทางเหนือ: ด้านข้างบอสจะปลอดภัยจาก Fire and Fury",
     "Orbital Omen: holes appear in pairs at the arena's edge and fire line AoEs from there\n"
     "Fire and Fury: cones in front of and behind the boss, together with the first Orbital Omen\n\n"
     "game8's way (what most PFs do): boss fixed facing north / wait beside the boss where the second lines cross / when Fire and Fury lands, step into the first diagonal cell / then go back as the second lines land\n"
     "It works because the second lines always cross in the middle 4 cells\n\n"
     "① Tanks keep the boss facing north: its sides are safe from Fire and Fury",
     strict=False, pic=28, scene=sc(S.orb1),
     refs=[FR("orbital-omen", 466, "Orbital Omen: เส้นจากรูที่ขอบสนามพาดผ่านพื้น ดูว่าเส้นลูกที่ 2 ตัดกันตรงไหน", "Orbital Omen: lines from the edge holes cross the floor; see where the second ones cross")])
step(P2, ORB, "② ดูลูกที่ 2 แล้วรอข้างบอส", "② Find the second ones, wait beside the boss",
     "② รูโผล่บนขอบสนาม: ดูว่าลูกที่ 2 อยู่ตรงไหน\nไปรอที่ข้างบอส ตรงจุดตัดของเส้นลูกที่ 2\n(ภาพ: เลข 1 / 2 บนขอบ = ลำดับที่ยิง / หมุดม่วง = ตัวเรา)",
     "② Holes appear at the edge: see where the second ones are\nWait beside the boss where the second lines cross\n(Picture: 1 / 2 at the edge = firing order / purple pin = you)",
     strict=False, pic=29, scene=sc(S.orb2))
step(P2, ORB, "③ ลูกที่ 1 ยิง: เข้าช่องที่โดนไปแล้ว", "③ First lines fire: step into where they hit",
     "③ เส้นลูกที่ 1 ยิง (พร้อม Fire and Fury): วิ่งเข้าไปในช่องที่เพิ่งโดนทันที (ช่องทแยงข้างบอส)",
     "③ The first lines fire (with Fire and Fury): run straight into the cell they just hit (the diagonal cell by the boss)",
     strict=False, pic=30, scene=sc(S.orb3))
step(P2, ORB, "④ ลูกที่ 2 ยิง: กลับที่เดิม", "④ Second lines fire: go back",
     "④ เส้นลูกที่ 2 ยิง: กลับไปที่เดิมทันที",
     "④ The second lines fire: go straight back to where you were",
     strict=False, pic=31, scene=sc(S.orb4))
step(P2, ORB, "⑤ รอจนเส้นจากขอบจบ", "⑤ Wait until the edge lines are done",
     "⑤ รออยู่ตรงนั้นจนเส้นจากขอบสนามยิงครบ\n\n"
     "จังหวะค่อนข้างเป๊ะ: รอชิดเท้าบอสให้มากที่สุด พอ Fire and Fury ลงแล้วไปช่องทแยงทันที แล้วกลับทันที\n"
     "ใช้ Sprint จะนิ่งขึ้น แนะนำให้ใช้",
     "⑤ Stay there until the lines from the edge are all done\n\n"
     "The timing is tight: wait as close to the boss's feet as you can, go diagonal right after Fire and Fury, and come straight back\n"
     "Sprint makes it steadier; use it",
     strict=False, pic=32, scene=sc(S.orb5))

MR = "Meteorain"
step(P2, MR, "ภาพรวม + หน้าที่แต่ละ role", "Overview and each role's job",
     "Meteorain: line stack จากบอส (Fearsome Fireball) + มาร์กวางอุกกาบาตที่ 2 คน + อุกกาบาตจากขอบสนาม\n"
     "แต่ละ role มีหน้าที่และลำดับต่างกัน: จำตำแหน่งของตัวเองให้ดี\n\n"
     "มาร์ก: เลือก 2 คนที่ใกล้บอสที่สุด มา 3 รอบ\nรอบ 1 Healer / รอบ 2 Range / รอบ 3 Melee\n"
     "อุกกาบาตฝั่ง Marker 4 เก็บไว้บังท่าสุดท้าย Triple Tyrannhilation\n\n"
     "Tank: รับ Fearsome Fireball (stack) ครั้งแรกโดยยืนหัวแถว จากนั้นรับเส้นท่าแรงจากขอบสนามตามลำดับ ไม่เข้า stack อื่นอีก",
     "Meteorain: a line stack from the boss (Fearsome Fireball) + meteor markers on 2 players + meteors from the edge\n"
     "Each role has its own job and order: learn your spot well\n\n"
     "Markers: on the 2 closest to the boss, 3 rounds\nRound 1 healers / round 2 ranged / round 3 melee\n"
     "The meteor on the 4 side is kept to block the last Triple Tyrannhilation\n\n"
     "Tanks: take the first Fearsome Fireball (stack) at the front, then the heavy tethers from the edge in order; no other stacks",
     strict=False,
     says={"MT": "รับ stack ครั้งแรกหัวแถว แล้วรับเส้นจากขอบ (หินฝั่ง Marker 2, 3)", "ST": "รับ stack ครั้งแรกหัวแถว แล้วรับเส้นจากขอบ (หินฝั่ง Marker 4)",
           "H1": "รอบ 1: วางอุกกาบาตตะวันตกเฉียงใต้ ไกลสุด", "H2": "รอบ 1: วางอุกกาบาตตะวันออกเฉียงเหนือ บนวงเป้าบอส",
           "D3": "รอบ 2: วางอุกกาบาตตะวันตกเฉียงใต้ ระยะกลาง", "D4": "รอบ 2: วางอุกกาบาตตะวันออกเฉียงใต้ บนวงเป้าบอส",
           "D1": "รอบ 3: วางอุกกาบาตตะวันตกเฉียงใต้ บนวงเป้าบอส", "D2": "รอบ 3: วางอุกกาบาตตะวันออกเฉียงเหนือ บนวงเป้าบอส"},
     says_en={"MT": "First stack at the front, then the edge tethers (rocks on the 2, 3 side)", "ST": "First stack at the front, then the edge tethers (rocks on the 4 side)",
              "H1": "Round 1: meteor south-west, farthest", "H2": "Round 1: meteor north-east, on the boss's target circle",
              "D3": "Round 2: meteor south-west, middle", "D4": "Round 2: meteor south-east, on the boss's target circle",
              "D1": "Round 3: meteor south-west, on the boss's target circle", "D2": "Round 3: meteor north-east, on the boss's target circle"},
     refs=[FR("meteorain-rocks", 586, "Meteorain: line stack จากบอส + เส้นท่าแรงจากรูที่ขอบสนาม (Tank เป็นคนรับ)", "Meteorain: the boss's line stack + the heavy tether from an edge hole (a tank takes it)")])
step(P2, MR, "① Healer เข้าใกล้บอส คนอื่นรอ stack", "① Healers close in, the rest wait to stack",
     "① Healer 2 คนเข้าไปใกล้บอส (ให้ได้มาร์ก)\nคนอื่นรอทางตะวันออกเฉียงใต้ เตรียมรับ stack",
     "① The two healers go close to the boss (to take the markers)\nEveryone else waits south-east, ready to stack",
     strict=False, pic=33, scene=sc(S.mr1))
step(P2, MR, "② Healer วางอุกกาบาต / Tank นำ stack", "② Healers place meteors / tank leads the stack",
     "② Healer วางอุกกาบาตที่จุดของตัวเอง:\nH1 ตะวันตกเฉียงใต้ ไกลสุด\nH2 ตะวันออกเฉียงเหนือ บนวงเป้าบอส (target circle)\n\n"
     "Tank + Melee รับ stack โดยมี Tank ยืนหัวแถว\nรับแล้ว Range เข้าใกล้บอส (รอบ 2 เป็นของ Range)",
     "② The healers place their meteors at their spots:\nH1 south-west, farthest\nH2 north-east, on the boss's target circle\n\n"
     "Tanks + melee take the stack with a tank at the front\nAfter it, the ranged go close to the boss (round 2 is theirs)",
     strict=["H1", "H2"], pic=34, scene=sc(S.mr2),
     says={"H1": "วางอุกกาบาตตะวันตกเฉียงใต้ ไกลสุด", "H2": "วางอุกกาบาตตะวันออกเฉียงเหนือ บนวงเป้าบอส"},
     says_en={"H1": "Meteor south-west, farthest", "H2": "Meteor north-east, on the boss's target circle"})
step(P2, MR, "③ Range วางอุกกาบาต / stack หลังหินตะวันออกเฉียงเหนือ", "③ Ranged place meteors / stack behind the north-east rock",
     "③ Range วางอุกกาบาตที่จุดของตัวเอง:\nD3 ตะวันตกเฉียงใต้ ระยะกลาง\nD4 ตะวันออกเฉียงใต้ บนวงเป้าบอส\n\n"
     "คนอื่นใช้อุกกาบาตทางตะวันออกเฉียงเหนือเป็นโล่ แล้วรับ stack\nMelee เข้าใกล้บอส (รอบ 3 เป็นของ Melee)",
     "③ The ranged place their meteors at their spots:\nD3 south-west, middle\nD4 south-east, on the boss's target circle\n\n"
     "Everyone else uses the north-east meteor as a shield and takes the stack\nThe melee go close to the boss (round 3 is theirs)",
     strict=["D3", "D4"], pic=35, scene=sc(S.mr3),
     says={"D3": "วางอุกกาบาตตะวันตกเฉียงใต้ ระยะกลาง", "D4": "วางอุกกาบาตตะวันออกเฉียงใต้ บนวงเป้าบอส"},
     says_en={"D3": "Meteor south-west, middle", "D4": "Meteor south-east, on the boss's target circle"})
step(P2, MR, "④ Melee วางอุกกาบาต / stack หลังหินตะวันออกเฉียงใต้", "④ Melee place meteors / stack behind the south-east rock",
     "④ Melee วางอุกกาบาตที่จุดของตัวเอง:\nD1 ตะวันตกเฉียงใต้ บนวงเป้าบอส\nD2 ตะวันออกเฉียงเหนือ บนวงเป้าบอส\n\n"
     "คนอื่นใช้อุกกาบาตทางตะวันออกเฉียงใต้เป็นโล่ แล้วรับ stack",
     "④ The melee place their meteors at their spots:\nD1 south-west, on the boss's target circle\nD2 north-east, on the boss's target circle\n\n"
     "Everyone else uses the south-east meteor as a shield and takes the stack",
     strict=["D1", "D2"], pic=36, scene=sc(S.mr4),
     says={"D1": "วางอุกกาบาตตะวันตกเฉียงใต้ บนวงเป้าบอส", "D2": "วางอุกกาบาตตะวันออกเฉียงเหนือ บนวงเป้าบอส"},
     says_en={"D1": "Meteor south-west, on the boss's target circle", "D2": "Meteor north-east, on the boss's target circle"})
step(P2, MR, "⑤ stack หลังหินตะวันออกเฉียงเหนือ แล้วไปหินไกลสุด", "⑤ Stack behind the north-east rock, then the farthest rock",
     "⑤ ทุกคนยกเว้น Tank ใช้หินทางตะวันออกเฉียงเหนือบัง แล้วรับ stack\nสุดท้ายไปที่หินก้อนที่ไกลที่สุดทางตะวันตกเฉียงใต้",
     "⑤ Everyone but the tanks shields behind the north-east rock and takes the stack\nLast, head for the farthest rock in the south-west",
     strict=False, pic=37, scene=sc(S.mr5))
step(P2, MR, "⑥ Triple Tyrannhilation: หลบหลังหินไกลสุด", "⑥ Triple Tyrannhilation: hide behind the farthest rock",
     "⑥ Triple Tyrannhilation ยังไม่ลงจนกว่าจะร่ายเสร็จ: ตีบอสต่อได้\nก่อนร่ายเสร็จ ไปหลบหลังหินก้อนที่ไกลที่สุด",
     "⑥ Triple Tyrannhilation doesn't hit until its cast ends: keep attacking\nBefore the cast ends, hide behind the farthest rock",
     strict=False, pic=38, scene=sc(S.mr6))
step(P2, MR, "Tank: แบ่งรับเส้นตามหิน", "Tanks: the tethers by rock",
     "เส้นท่าแรงจากขอบสนามลงที่หิน (อุกกาบาต): Tank แบ่งกันรับตามหิน (ตามฝั่ง Marker)\n"
     "MT: หินฝั่ง Marker 2, 3\nST: หินฝั่ง Marker 4",
     "The heavy tethers from the edge go to the rocks (meteors): the tanks split them by rock (by waymark side)\n"
     "MT: rocks on the 2, 3 side\nST: rocks on the 4 side",
     strict=["MT", "ST"], pic=39, scene=sc(S.mr_tanks),
     says={"MT": "รับเส้นที่หินฝั่ง Marker 2, 3 (กรอบน้ำเงิน)", "ST": "รับเส้นที่หินฝั่ง Marker 4 (กรอบเขียว)"},
     says_en={"MT": "Tethers on the rocks on the 2, 3 side (blue box)", "ST": "Tethers on the rocks on the 4 side (green box)"})

# ------------------------------------------------------------------ the split arena
MM = "Flatliner + Majestic Meteor + Arcadion Avalanche"
GRP_SAYS = {s: "กลุ่ม MT: ฝั่งตะวันตก" for s in ("MT", "H1", "D1", "D3")}
GRP_SAYS.update({s: "กลุ่ม ST: ฝั่งตะวันออก" for s in ("ST", "H2", "D2", "D4")})
GRP_SAYS_EN = {s: "MT group: the west side" for s in ("MT", "H1", "D1", "D3")}
GRP_SAYS_EN.update({s: "ST group: the east side" for s in ("ST", "H2", "D2", "D4")})
TOWER_SAYS = {"MT": "tower ตะวันตกเฉียงเหนือ คู่กับ D3", "D3": "tower ตะวันตกเฉียงเหนือ คู่กับ MT", "H1": "tower ตะวันตกเฉียงใต้ คู่กับ D1",
              "D1": "tower ตะวันตกเฉียงใต้ คู่กับ H1", "H2": "tower ตะวันออกเฉียงเหนือ คู่กับ D4", "D4": "tower ตะวันออกเฉียงเหนือ คู่กับ H2",
              "ST": "tower ตะวันออกเฉียงใต้ คู่กับ D2", "D2": "tower ตะวันออกเฉียงใต้ คู่กับ ST"}
TOWER_SAYS_EN = {"MT": "North-west tower with D3", "D3": "North-west tower with MT", "H1": "South-west tower with D1", "D1": "South-west tower with H1",
                 "H2": "North-east tower with D4", "D4": "North-east tower with H2", "ST": "South-east tower with D2", "D2": "South-east tower with ST"}
step(P3, MM, "① Flatliner: แบ่งกลุ่ม MT ตะวันตก / กลุ่ม ST ตะวันออก", "① Flatliner: MT group west / ST group east",
     "Mechanic รวม: บอสผ่าสนามแยกเป็น 2 เกาะ แล้วมี Fire Breath จากบอส กับ Majestic Meteowrath จากขอบสนาม\nจุดยืนสำคัญมาก: จำให้แม่น\n\n"
     "① Flatliner ร่าย: แบ่ง 2 กลุ่ม\nกลุ่ม MT (MT H1 D1 D3) ไปตะวันตก\nกลุ่ม ST (ST H2 D2 D4) ไปตะวันออก\n"
     "ยืนบนเส้นเตือน AoE ได้ ไม่เป็นไร\nหลังจากนี้สนามจะแยกเป็น 2 เกาะ",
     "Combined mechanic: the boss splits the arena into two islands, with Fire Breath from the boss and Majestic Meteowrath from the edge\nPositions matter a lot: learn them well\n\n"
     "① Flatliner cast: split into 2 groups\nMT group (MT H1 D1 D3) west\nST group (ST H2 D2 D4) east\n"
     "Standing on the AoE telegraph is fine\nAfter this the arena splits into two islands",
     strict=True, pic=40, scene=sc(S.fl1, True), says=GRP_SAYS, says_en=GRP_SAYS_EN,
     refs=[FR("flatliner", 610, "Flatliner: เส้นเตือนกลางสนาม + knockback แบ่ง 4:4 ไปตะวันตก / ตะวันออก", "Flatliner: the telegraph down the middle + knockback; split 4:4 west / east")])
step(P3, MM, "② tower เกาะละ 2 + สายจากขอบ", "② Two towers per island + tethers from the edge",
     "② แต่ละเกาะมี tower 2 อัน\nบางคนโดนสาย (tether) จากรูที่ขอบสนาม บางคนไม่มีอะไร",
     "② Each island gets 2 towers\nSome players are tethered from holes at the arena's edge, some get nothing",
     strict=False, pic=41, scene=sc(S.fl2, True),
     refs=[FR("majestic-meteor-towers", 634, "Majestic Meteor: tower บนเกาะ + สายจากรูที่ขอบสนาม", "Majestic Meteor: towers on the islands + tethers from the edge holes")])
step(P3, MM, "③ เข้า tower ตามคู่ → tower ผลักกระเด็น", "③ Pairs into towers → the towers knock back",
     "③ เข้า tower ตามคู่ (ตาม macro):\nตะวันตกเฉียงเหนือ: MT·D3\nตะวันตกเฉียงใต้: H1·D1\nตะวันออกเฉียงเหนือ: H2·D4\nตะวันออกเฉียงใต้: ST·D2\n\n"
     "tower ผลักกระเด็น (knockback):\nคนไม่มีสาย และคนที่สายมาจากฝั่งเกาะตรงข้าม → กระเด็นออกด้านข้าง ให้ยังอยู่บนเกาะเดิม\n"
     "คนที่สายมาจากฝั่งเกาะของตัวเอง → กระเด็นข้ามไปเกาะตรงข้าม",
     "③ Pairs into the towers (by the macro):\nNorth-west: MT·D3\nSouth-west: H1·D1\nNorth-east: H2·D4\nSouth-east: ST·D2\n\n"
     "The towers knock back:\nNo tether, or a tether from the other island's side → be knocked sideways and stay on your island\n"
     "A tether from your own island's side → be knocked across to the other island",
     strict=True, pic=42, scene=sc(S.fl3, True), says=TOWER_SAYS, says_en=TOWER_SAYS_EN)
step(P3, MM, "④ ลงแล้ว: คนไม่มีสายเข้าหาบอสทันที", "④ Landed: the untethered rush to the boss",
     "④ ลงพื้นแล้ว คนไม่มีสายเข้าหาบอสทันที (เข้าในวงเป้า target circle)\nคนมีสายเข้าใกล้บอส แต่อย่าเข้าในวงเป้า",
     "④ After landing, the untethered go to the boss at once (inside its target circle)\nThe tethered come close too, but stay outside the target circle",
     strict=False, pic=43, scene=sc(S.fl4, True))
step(P3, MM, "⑤ มาร์กขึ้น: คนมีสายเข้าไปทิ้ง AoE ด้วยกัน", "⑤ Markers up: the tethered join to drop AoEs",
     "⑤ เห็นคนไม่มีสายได้มาร์กแล้ว คนมีสายก็เข้าไปที่เท้าบอส แล้วทิ้ง AoE ไปด้วยกัน",
     "⑤ Once the untethered have their markers, the tethered also go to the boss's feet and drop the AoEs together",
     strict=False, pic=44, scene=sc(S.fl5, True))
step(P3, MM, "⑥ ทิ้ง AoE 3 ลูกตามขอบเกาะ แล้วไปจุดสุดท้าย", "⑥ Drop 3 AoEs along the island edge, then the final spot",
     "⑥ AoE มีทั้งหมด 3 ลูก: ทิ้งเลียบขอบเกาะ (ตาม macro: จากใต้บอส ไล่ตามรอยแยกไปทางเหนือ / ใต้)\n"
     "ทิ้งเสร็จแล้วไปยืนจุดสุดท้าย โดยใช้ Marker ตัวเลข (1 2 3 4) เป็นหลัก",
     "⑥ There are 3 AoEs: drop them along the island's edge (by the macro: from under the boss, along the crack to the north / south)\n"
     "Then go to the final spot, using the number waymarks (1 2 3 4) as the guide",
     strict=False, pic=45, scene=sc(S.fl6, True),
     refs=[FR("majestic-meteor-drops", 760, "AoE ที่ทิ้งเรียงตามแนวรอยแยกกลางสนาม", "The AoEs dropped in a row along the crack in the middle")])
step(P3, MM, "⑦ ท่าลง: ยืนถูกที่ = รอดทุกคน", "⑦ It goes off: right spots = everyone lives",
     "⑦ ท่าลง: ถ้าทุกคนยืนถูกที่ รอดทุกคน",
     "⑦ It goes off: if everyone is in the right spot, everyone lives",
     strict=False, pic=46, scene=sc(S.fl7, True))
step(P3, MM, "⑧ ทำ ②–⑦ อีกรอบ", "⑧ ②–⑦ once more",
     "⑧ ทำขั้น ②–⑦ อีกหนึ่งรอบ\ntower รอบ 2: เข้าเป็นคู่ที่จัดการท่าสุดท้ายของรอบ 1 ด้วยกัน (ตาม macro: คู่เดิม เข้า tower ใกล้จุดที่จัดการรอบ 1)",
     "⑧ Do ②–⑦ once more\nSecond towers: taken by the pairs that handled the last attack of round 1 together (by the macro: same pair, the tower near where you finished round 1)",
     strict=True, pic=47, scene=sc(S.fl8, True), says=TOWER_SAYS, says_en=TOWER_SAYS_EN)
step(P3, MM, "⑨ Massive Meteor: stack แยกเกาะ", "⑨ Massive Meteor: stack per island",
     "⑨ จบ Majestic Meteor 2 รอบแล้ว Massive Meteor (stack หลายจุด) ตามมาทันที\nรวมกันเกาะละกลุ่ม แล้วรับด้วยกัน",
     "⑨ Right after the two Majestic Meteors comes Massive Meteor (several stacks)\nGather per island and take it together",
     strict=False, pic=48, scene=sc(S.fl9, True))
step(P3, MM, "⑩ Arcadion Avalanche: tower + เกาะที่บอสหันจะพัง", "⑩ Arcadion Avalanche: towers + the island the boss faces breaks",
     "⑩ tower ของ Arcadion Avalanche: เข้าเป็นคู่ที่จัดการท่าสุดท้ายของ Majestic Meteor รอบ 2\n"
     "เกาะฝั่งที่บอสหันหน้าไปหาจะพัง: คนที่อยู่ฝั่งนั้นให้กระเด็นข้ามไปเกาะตรงข้าม",
     "⑩ Arcadion Avalanche's towers: taken by the pairs that handled the last attack of the second Majestic Meteor\n"
     "The island the boss faces is destroyed: whoever is on that side gets knocked across to the other island",
     strict=False,
     refs=[FR("arcadion-avalanche", 794, "Arcadion Avalanche: บอสยกสนามขึ้น เกาะฝั่งที่บอสหันไปจะพัง", "Arcadion Avalanche: the boss lifts the arena; the island it faces is destroyed")])
step(P3, MM, "รายละเอียด: คนที่มีสาย", "Details: the tethered",
     "ดูว่าสายมาจากฝั่งเกาะตรงข้าม หรือฝั่งเกาะของตัวเอง: ตัดสินว่า tower จะผลักไปทางไหน\n"
     "สายมาจากฝั่งตรงข้าม → tower ผลักออกด้านข้าง (อยู่เกาะเดิม)\nสายมาจากฝั่งตัวเอง → tower ผลักข้ามไปเกาะตรงข้าม\n\n"
     "กระเด็นแล้วเข้าใกล้วงเป้าบอส (แต่อย่าเข้าในวง)\n"
     "พอเห็นคนไม่มีสายได้มาร์ก รีบเข้าในวงเป้า แล้วทิ้ง AoE ไปฝั่งที่จะดึงสายไปทางทแยง\n"
     "สุดท้ายรับท่าจากสายในจุดที่เส้นจากขอบสนามไม่โดน",
     "Whether your tether comes from the other island's side or your own decides where the tower throws you\n"
     "From the other side → knocked sideways (stay on your island)\nFrom your own side → knocked across to the other island\n\n"
     "After the jump, come close to the boss's target circle (but don't step inside)\n"
     "As soon as the untethered have markers, get inside the circle and drop the AoEs towards the side you'll stretch the tether diagonally\n"
     "Last, take the tether's hit at a spot the beams from the edge don't burn",
     strict=False)
step(P3, MM, "รายละเอียด: คนไม่มีสาย (ได้มาร์ก)", "Details: the untethered (marker takers)",
     "หลังกระเด็น คนที่ใกล้บอสที่สุดจะได้มาร์ก: กระเด็นแล้วรีบเข้าหาบอสทันทีเพื่อรับมาร์ก\n"
     "แต่ละเกาะมีคนได้มาร์ก 2 คน: แสดงให้เห็นว่าจะไปซ้ายหรือขวา (ทั้งสองคนขยับออกไปทางนั้นนิดหนึ่ง) แล้วทิ้ง AoE ไปทางนั้น\n"
     "tower: กระเด็นออกด้านข้าง ให้ยังอยู่บนเกาะเดิม",
     "After the jump, the players nearest the boss get the markers: rush to the boss right after landing to take one\n"
     "Each island has 2 marked players: show which way you're going (each steps a little left or right) and drop the AoEs that way\n"
     "Tower: be knocked sideways so you stay on your island",
     strict=False)
step(P3, MM, "จุดยืนสุดท้าย", "The final spot",
     "ใช้ Marker ตัวเลขเป็นหลัก\nเส้นจากขอบสนามยิงมาด้วย: ต้องปรับเล็กน้อยว่ายืนมุมด้านใน หรือมุมด้านนอกของ Marker\n"
     "ยืนที่มุมของ Marker ตัวเลข ฝั่งที่เส้นจากขอบสนามไม่ทับ",
     "The number waymarks are the guide\nBeams also come from the edge: adjust slightly between the inner and outer corner of the waymark\n"
     "Stand at the corner of the number waymark that the edge beam doesn't cover",
     strict=False)
step(P3, MM, "Arcadion Avalanche: ดูฝั่งปลอดภัย", "Arcadion Avalanche: reading the safe side",
     "มีหลายวิธีจำ เลือกแบบที่ตัวเองดูง่าย เช่น\n"
     "บอสยกสนามขึ้นแล้วหันกลับมาด้านหน้า: ฝั่งที่อยู่ด้านหลังบอสปลอดภัย\n"
     "บอสยกสนาม: ฝั่งตรงข้ามกับทิศที่เข่าบอสชี้ไปปลอดภัย",
     "There are several ways to read it; pick whichever is easiest for you, for example\n"
     "The boss lifts the arena and turns to face front: the side at its back is safe\n"
     "When the boss lifts the arena: the side opposite where its knee points is safe",
     strict=False)

# ------------------------------------------------------------------ last part
step(P4, "Great Wall of Fire", "ครั้งที่ 2: รับแบบ stack", "Second time: taken as a stack",
     "Great Wall of Fire มาอีกครั้งหลัง Majestic Meteor\nPF ส่วนใหญ่รับครั้งนี้แบบ stack (กติกาเหมือนครั้งแรก: Tank ที่มี debuff ห้ามยืนหัวแถวครั้งที่ 2 / รับแล้วขยับออกด้านข้าง)",
     "Great Wall of Fire comes again after Majestic Meteor\nMost PFs take this one as a stack (same rules as the first: the tank with the debuff doesn't lead the second hit / step sideways after)",
     strict=False)

ES = "Ecliptic Stampede"
ES1_SAYS = {"MT": "ใต้บอส", "ST": "ใต้บอส", "D1": "ใต้บอส", "D2": "ใต้บอส", "H1": "ทางเหนือ นอกวงเป้าบอส", "D3": "ทางเหนือ นอกวงเป้าบอส",
            "H2": "ทางใต้ นอกวงเป้าบอส", "D4": "ทางใต้ นอกวงเป้าบอส"}
ES1_SAYS_EN = {"MT": "Under the boss", "ST": "Under the boss", "D1": "Under the boss", "D2": "Under the boss", "H1": "North, outside the boss's target circle",
               "D3": "North, outside the boss's target circle", "H2": "South, outside the boss's target circle", "D4": "South, outside the boss's target circle"}
step(P4, ES, "① ก่อนร่ายเสร็จ: แบ่ง 3 จุด", "① Before the cast ends: three spots",
     "Ecliptic Stampede (แผน DXA): Mechanic รวม: AoE ระยะ (ยิ่งใกล้ยิ่งแรง) / พื้นอันตราย + ทิ้ง AoE / tower / สาย / stack คู่ หรือ stack 4 คน\n"
     "มาร์กแรกลงที่คนไกล: ตอนร่าย Tank + Melee อยู่ใต้บอส / Healer + Range อยู่ห่างบอส\n\n"
     "① ก่อนร่ายเสร็จ:\nTank + Melee ใต้บอส\nH1·D3 ทางเหนือ\nH2·D4 ทางใต้",
     "Ecliptic Stampede (the DXA strat): combined mechanic: proximity AoEs (stronger the closer) / hazard floor + AoE drops / towers / tethers / pair or 4-player stacks\n"
     "The first markers go to far players: during the cast, tanks + melee under the boss / healers + ranged away from it\n\n"
     "① Before the cast ends:\nTanks + melee under the boss\nH1·D3 north\nH2·D4 south",
     strict=True, pic=50, scene=sc(S.es1), says=ES1_SAYS, says_en=ES1_SAYS_EN)
step(P4, ES, "② ร่ายเสร็จ: AoE ระยะ + มาร์กที่ Healer / Range", "② Cast ends: proximity AoEs + markers on healers / ranged",
     "② ร่ายเสร็จ: AoE ระยะ (ยิ่งใกล้ยิ่งแรง) ขึ้นบนสนาม และกลุ่ม Healer + Range 2 คนได้มาร์ก\n(ภาพ: AoE ระยะที่มุมตะวันออกเฉียงเหนือ / ตะวันตกเฉียงใต้, มาร์กที่ D3 กับ H2)",
     "② Cast ends: proximity AoEs (stronger the closer) appear, and 2 of the healers + ranged get markers\n(Picture: proximity AoEs in the north-east / south-west corners, markers on D3 and H2)",
     strict=False, pic=51, scene=sc(S.es2))
step(P4, ES, "③ คนได้มาร์กไปขอบ / คนไม่ได้มาร์กเข้าใต้บอส", "③ Marked to the edge / unmarked under the boss",
     "③ Healer / Range ที่ไม่ได้มาร์กเข้าไปรวมใต้บอส\nคนได้มาร์กเดินห่างจาก AoE ระยะ ไปที่ขอบสนาม: ห้ามไปที่มุมสนาม\n"
     "(ตาม macro: ทางเหนือ H1 D3 / ทางใต้ H2 D4 ถ้าได้มาร์กทั้งคู่ DPS เป็นคนปรับ)",
     "③ The unmarked healers / ranged join under the boss\nThe marked keep away from the proximity AoEs and go to the edge: never into a corner\n"
     "(By the macro: north H1 D3 / south H2 D4; if both of a pair are marked, the DPS adjusts)",
     strict=False, pic=52, scene=sc(S.es3))
step(P4, ES, "④ ทิ้ง AoE: กลุ่มกลาง 6 คน / คนได้มาร์ก", "④ The drops: the middle six / the marked",
     "④ กลุ่มกลาง 6 คน: ทิ้ง AoE ลูกที่ 2 ไปทางเหนือ แล้วทิ้งอีก 4 ลูกวนตามเข็มนาฬิกา (ตาม macro: ใต้บอส → A → วนตามเข็ม)\n"
     "คนได้มาร์ก: ทิ้ง 4 ลูกเลียบขอบสนาม แล้วอีก 2 ลูกเข้ามาด้านใน (พื้นอันตราย)",
     "④ The middle six: drop the 2nd AoE north, then 4 more going clockwise (by the macro: under the boss → A → clockwise)\n"
     "The marked: drop 4 along the edge, then the last 2 further in (hazard floor)",
     strict=False, pic=53, scene=sc(S.es4))
step(P4, ES, "⑤ tower 4 อันรอบบอส", "⑤ Four towers around the boss",
     "⑤ tower ขึ้น 4 ทิศรอบบอส\n"
     "นับจาก tower ตะวันตกเฉียงเหนือ วนตามเข็ม: tank tower = MT / tower ปกติ = D1·D2\n"
     "นับจาก tower ตะวันตกเฉียงใต้ วนทวนเข็ม: tank tower = ST / tower ปกติ = Healer / Range ที่ไม่ได้มาร์ก (ตามลำดับ priority)",
     "⑤ Towers appear on four sides of the boss\n"
     "Counting clockwise from the north-west tower: tank tower = MT / normal tower = D1·D2\n"
     "Counting counter-clockwise from the south-west tower: tank tower = ST / normal tower = the unmarked healer / ranged (by priority)",
     strict=False, pic=54, scene=sc(S.es5),
     says={"MT": "tank tower: นับจากตะวันตกเฉียงเหนือ วนตามเข็ม", "D1": "tower ปกติ: นับจากตะวันตกเฉียงเหนือ วนตามเข็ม (กับ D2)",
           "D2": "tower ปกติ: นับจากตะวันตกเฉียงเหนือ วนตามเข็ม (กับ D1)", "ST": "tank tower: นับจากตะวันตกเฉียงใต้ วนทวนเข็ม"},
     says_en={"MT": "Tank tower: count clockwise from the north-west", "D1": "Normal tower: count clockwise from the north-west (with D2)",
              "D2": "Normal tower: count clockwise from the north-west (with D1)", "ST": "Tank tower: count counter-clockwise from the south-west"},
     refs=[FR("stampede-towers", 926, "tower 4 อันขึ้นรอบบอสหลังทิ้ง AoE ครบ", "Four towers appear around the boss once the AoEs are all dropped")])
step(P4, ES, "⑥ สายจากขอบ: ดึงไปทาง 'ตะวันตกเฉียงใต้'", "⑥ Edge tethers: stretch to 'south-west'",
     "⑥ เหยียบ tower แล้ว คนที่เหยียบจะโดนสายจากขอบสนาม\n"
     "ถือขอบที่สายต่อมาเป็น 'เหนือ' แล้วดึงสายไปทาง 'ตะวันตกเฉียงใต้' (ตาม macro: หันหลังให้รู แล้วดึงไปด้านหน้าขวา)\n"
     "คนไม่มีสายอยู่ที่เท้าบอส ระวังอย่าโดนไฟจากสาย",
     "⑥ After the towers, each tower taker gets a tether from the arena's edge\n"
     "Treat the edge your tether comes from as 'north' and stretch it to 'south-west' (by the macro: back to the hole, stretch to your front-right)\n"
     "The untethered stay at the boss's feet, clear of the tethers' fire",
     strict=False, pic=55, scene=sc(S.es6))
step(P4, ES, "⑦ Four-way Fireball: stack คู่ 4 มุม", "⑦ Four-way Fireball: pair stacks on 4 diagonals",
     "⑦ Four-way Fireball: stack 2 คน 4 ทาง เลือกเป้าเป็นคนที่ใกล้บอส\nคนที่ไม่มีสายออกไปข้างหน้า เป็นคนล่อ\n"
     "คนดึงสายถ้าไปล่อหน้าสุดจะโดนดาเมจหนัก: ให้คนที่ไม่ได้ดึงสายเป็นคนล่อ\n\n"
     "คนล่อด้านใน:\nตะวันตกเฉียงเหนือ: Range ที่ทิ้งพื้นทางเหนือ (มาร์กแดง)\nตะวันออกเฉียงเหนือ: Melee ที่เหยียบ tower แล้วไม่มีสาย\n"
     "ตะวันออกเฉียงใต้: Range ที่ทิ้งพื้นทางใต้\nตะวันตกเฉียงใต้: Range ที่เหยียบ tower แล้วไม่มีสาย",
     "⑦ Four-way Fireball: 2-player stacks in 4 directions, on the players nearest the boss\nThe untethered step forward and bait\n"
     "A tethered player at the front takes huge damage: the untethered bait\n\n"
     "Inner baiters:\nNorth-west: the ranged who dropped the north puddles (red marker)\nNorth-east: the melee who took a tower and got no tether\n"
     "South-east: the ranged who dropped the south puddles\nSouth-west: the ranged who took a tower and got no tether",
     strict=False, pic=56, scene=sc(S.es7),
     refs=[FR("four-way-fireball", 962, "Four-way Fireball: ลำแสง stack คู่ 4 ทางจากบอส คนไม่มีสายเป็นคนล่อ", "Four-way Fireball: pair-stack beams in 4 directions from the boss; the untethered bait")])
step(P4, ES, "⑦ Two-way Fireball: stack 4:4 ตะวันออก / ตะวันตก", "⑦ Two-way Fireball: 4:4 stacks east / west",
     "⑦ Two-way Fireball: stack 4 คน 2 ฝั่ง เลือกเป้าเป็นคนที่ใกล้บอส\n"
     "คนล่อฝั่งตะวันตก: Range ที่เหยียบ tower แล้วไม่มีสาย (คนที่นับ tower จาก Marker 4 วนทวนเข็ม)\n"
     "คนล่อฝั่งตะวันออก: Melee ที่เหยียบ tower แล้วไม่มีสาย (คนที่นับ tower จาก Marker 1 วนตามเข็ม)",
     "⑦ Two-way Fireball: 4-player stacks on two sides, on the players nearest the boss\n"
     "West baiter: the ranged who took a tower and got no tether (counting towers counter-clockwise from 4)\n"
     "East baiter: the melee who took a tower and got no tether (counting towers clockwise from 1)",
     strict=False, pic=57, scene=sc(S.es8))
step(P4, ES, "ตารางล่อ: Four-way Fireball", "Bait chart: Four-way Fireball",
     "Marker 1 (ตะวันตกเฉียงเหนือ): Range ที่ทิ้งพื้นทางเหนือ (มาร์กแดง)\nMarker 2 (ตะวันออกเฉียงเหนือ): Melee ที่เหยียบ tower ฝั่งตามเข็ม แล้วไม่มีสาย\n"
     "Marker 4 (ตะวันตกเฉียงใต้): Range ที่เหยียบ tower ฝั่งทวนเข็ม แล้วไม่มีสาย\nMarker 3 (ตะวันออกเฉียงใต้): Range ที่ทิ้งพื้นทางใต้\n\n"
     "คนมีสาย: รับที่มุมฝั่งที่ตัวเองดึงสายไป อยู่ด้านหลังคนล่อที่อยู่ใกล้บอส\n(ภาพ: W = ตะวันตก / E = ตะวันออก)",
     "1 (north-west): the ranged who dropped the north puddles (red marker)\n2 (north-east): the melee who took a clockwise tower and got no tether\n"
     "4 (south-west): the ranged who took a counter-clockwise tower and got no tether\n3 (south-east): the ranged who dropped the south puddles\n\n"
     "The tethered: take it at the corner you stretched to, behind the baiter near the boss\n(Picture: W = west / E = east)",
     strict=False, pic=58, scene=sc(S.es_four_table))
step(P4, ES, "ตารางล่อ: Two-way Fireball", "Bait chart: Two-way Fireball",
     "Marker D (ตะวันตก): Range ที่เหยียบ tower ฝั่งทวนเข็ม แล้วไม่มีสาย\nMarker B (ตะวันออก): Melee ที่เหยียบ tower ฝั่งตามเข็ม แล้วไม่มีสาย\n\n"
     "คนทิ้งพื้น: อยู่หลังคนเหยียบ tower\nคนมีสาย: อยู่หลังคนเหยียบ tower + คนทิ้งพื้น\n(ภาพ: W = ตะวันตก / E = ตะวันออก / ลูกศรฟ้า = ไปฝั่งตะวันตก / ลูกศรแดง = ไปฝั่งตะวันออก)",
     "D (west): the ranged who took a counter-clockwise tower and got no tether\nB (east): the melee who took a clockwise tower and got no tether\n\n"
     "Puddle droppers: behind the tower takers\nThe tethered: behind the tower takers + puddle droppers\n(Picture: W = west / E = east / blue arrows = to the west / red arrows = to the east)",
     strict=False, pic=59, scene=sc(S.es_two_table))
step(P4, ES, "หน้าที่: Tank", "Each role: tanks",
     "① รวมที่เท้าบอส ล่อ AoE วงกลม 6 ลูก\n"
     "② เข้า tank tower: MT นับจากตะวันตกเฉียงเหนือ (Marker 1) วนตามเข็ม / ST นับจาก Marker 4 วนทวนเข็ม\n"
     "③ ดึงสาย\n④ ทั้ง Four-way และ Two-way Tank ไม่ได้เป็นคนล่อ: รับด้านหลังคนล่อ\n\n"
     "Healer กับ Range คิดเยอะ: Tank กับ Melee ที่คิดน้อยกว่าพยายามอย่าพลาด",
     "① Gather at the boss's feet and bait the 6 circle AoEs\n"
     "② Tank towers: MT counts clockwise from the north-west (1) / ST counts counter-clockwise from 4\n"
     "③ Stretch your tether\n④ In both Four-way and Two-way the tanks don't bait: take it behind the baiter\n\n"
     "Healers and ranged have the most to think about: tanks and melee, with less, try not to slip",
     strict=False)
step(P4, ES, "หน้าที่: Healer + Range", "Each role: healers + ranged",
     "① รอนอกวงเป้าบอส: ทางเหนือ (H1·D3) / ทางใต้ (H2·D4)\n"
     "② ได้มาร์ก: ทิ้งพื้นอันตรายที่ขอบเหนือ / ใต้ (ได้มาร์กทั้งคู่ DPS เป็นคนปรับ)\n"
     "③ ไม่ได้มาร์ก: เข้ากลุ่มที่เท้าบอส ทิ้ง AoE วงกลม\n"
     "④ เข้า tower: นับจากตะวันตกเฉียงใต้ (Marker 4) วนทวนเข็ม\n"
     "⑤ มีสาย: ดึงสาย\n"
     "⑥ Four-way: ไม่มีสาย = ล่อตะวันตกเฉียงใต้ / ทิ้งพื้นใต้ = ล่อตะวันออกเฉียงใต้\n"
     "⑦ Two-way: ไม่มีสาย = ล่อฝั่งตะวันตก\n\n"
     "คนทิ้งพื้นคิดแค่: ทิ้งพื้น → Four-way เป็นคนล่อ / Two-way รับด้านหลังคนล่อ",
     "① Wait outside the boss's target circle: north (H1·D3) / south (H2·D4)\n"
     "② Marked: drop the hazard puddles at the north / south edge (if both of a pair are marked, the DPS adjusts)\n"
     "③ Unmarked: join the group at the boss's feet and drop circles\n"
     "④ Towers: count counter-clockwise from the south-west (4)\n"
     "⑤ Tethered: stretch it\n"
     "⑥ Four-way: no tether = bait south-west / south puddles = bait south-east\n"
     "⑦ Two-way: no tether = bait the west\n\n"
     "Puddle droppers only need: puddles → bait in Four-way / behind the baiter in Two-way",
     strict=False)
step(P4, ES, "หน้าที่: Melee", "Each role: melee",
     "① รวมที่เท้าบอส ล่อ AoE วงกลม 6 ลูก\n"
     "② เข้า tower 2 คน: นับจากตะวันตกเฉียงเหนือ (Marker 1) วนตามเข็ม\n"
     "③ มีสาย: ดึงสาย\n④ ไม่มีสาย: ล่อ Four-way มุมตะวันออกเฉียงเหนือ\n⑤ ไม่มีสาย: ล่อ Two-way ฝั่งตะวันออกด้วย",
     "① Gather at the boss's feet and bait the 6 circle AoEs\n"
     "② The 2-player tower: count clockwise from the north-west (1)\n"
     "③ Tethered: stretch it\n④ No tether: bait Four-way at the north-east\n⑤ No tether: also bait Two-way on the east",
     strict=False)

step(P4, "Heartbreak Kick", "stack แบบเวท โดนหลายครั้ง 3 รอบ", "Multi-hit magic stack, 3 times",
     "stack แบบเวท โดนหลายครั้งติดกัน มา 3 รอบ แต่ละรอบจำนวนครั้งและดาเมจเพิ่มขึ้น\n"
     "ตั้งแต่รอบ 2 invuln ของ Tank คนเดียวรับไม่ไหว: ถ้าจะใช้ invuln ต้องใช้ 2 คน สลับกันกลางทาง\n"
     "ถ้า Tank ยังมี mitigate เหลือ Tank 2 คนเปิด mitigate เต็มที่ก็รับได้\n\n"
     "รอบ 1: 8 คนเข้า tower รับด้วยกัน\nรอบ 2: MT รับก่อน ตามด้วย ST ทั้งคู่ใช้ invuln: สลับคนก่อน invuln หมด\nรอบ 3: Tank 2 คนเปิด mitigate เต็มที่รับ",
     "A magic stack that hits many times in a row, 3 rounds, each with more hits and more damage\n"
     "From round 2 one tank's invuln can't take it all: invuln with both tanks, swapping midway\n"
     "With mitigation still up, both tanks fully mitigated can take it too\n\n"
     "Round 1: all 8 in the tower\nRound 2: MT first, then ST, both with invulns: swap before the invuln runs out\nRound 3: both tanks, fully mitigated",
     strict=False,
     refs=[FR("heartbreak-kick", 1028, "Heartbreak Kick รอบ 1: tower ที่บอส 8 คนเข้ารับด้วยกัน", "Heartbreak Kick, round 1: the tower at the boss; all 8 take it together")])
step(P4, "Heartbreaker", "enrage", "Enrage",
     "ร่ายหมดเวลา (enrage): ฆ่าบอสให้ได้ก่อนร่ายเสร็จ",
     "The enrage cast: kill the boss before it finishes",
     strict=False)

# ------------------------------------------------------------------ DPS check
step(P5, "Limit Break", "ใช้ LB3 สองครั้ง", "Two LB3s",
     "ไฟต์นี้ใช้ LB3 ได้ 2 ครั้ง: ถ้า DPS check แน่น แนะนำให้เล็งไว้ (บางครั้งเกจไม่ถึง ครั้งที่ 2 เป็น LB2)\n\n"
     "ครั้งที่ 1: กด LB3 ก่อน Triple Tyrannhilation เริ่มร่าย (ช่วงท้าย Meteorain) จะมีโอกาสได้ LB3 อีกครั้งก่อน Heartbreak Kick ครั้งสุดท้าย\n"
     "แต่เฉียดมาก: กดแล้วรีบวิ่งไปหลบหลังหิน\n\n"
     "ถ้า LB3 → LB2 ก็พอ: กดครั้งแรกก่อน Flatliner จะใช้ช่วงลอยตัวจาก Flatliner กลบช่วงค้างหลังกด LB ได้",
     "This fight allows two LB3s: worth aiming for if the DPS check is tight (sometimes the bar falls short and the second is an LB2)\n\n"
     "First: fire LB3 just before Triple Tyrannhilation's cast (late in Meteorain) and another LB3 may be ready before the last Heartbreak Kick\n"
     "It's close: fire it, then run behind a rock at once\n\n"
     "If LB3 → LB2 is enough: fire the first just before Flatliner, and its knock-up hides the LB's lock",
     strict=False)
step(P5, "Potions", "ใช้ยา (potion) 3 ครั้ง", "Three potions",
     "ไฟต์นี้ใช้ยาได้ 3 ครั้ง\nยาครั้งที่ 2: กดก่อนโดน Flatliner ดีดลอยขึ้น ยาจะกลับมาราว Heartbreak Kick ครั้งที่ 2 แล้วกดครั้งที่ 3 ตอนนั้น\n"
     "เลื่อน burst สุดท้ายให้ตรงกับยาครั้งที่ 3",
     "This fight allows three potions\nSecond potion: just before Flatliner throws you up; it comes back around the second Heartbreak Kick, and the third goes there\n"
     "Shift your last burst to line up with the third potion",
     strict=False)

# ------------------------------------------------------------------ guide
NOTE = ("แผนตาม game8 (วิดีโอของ Nukemaru): แผนหลัก Lucrezia / Dance of Domination ถือจุดปลอดภัยริมขอบเป็นเหนือ / Orbital Omen ล็อกบอสหันเหนือ / "
        "Meteorain วางอุกกาบาตตามลำดับ Healer > Range > Melee / Majestic Meteor แผน ZizieZip / Ecliptic Stampede แผน DXA\n"
        "Marker 8 ทิศ: 1234 ต้องมี ใช้ตอน Majestic Meteor (ดูขั้นแรก)\n\n"
        "กลุ่ม 4:4\nกลุ่ม MT: MT H1 D1 D3\nกลุ่ม ST: ST H2 D2 D4\n\n"
        "spread พื้นฐาน (อิงทิศที่บอสหัน):\nแถวหน้า: D3 / MT / D4\nกลาง: H1 / H2\nแถวหลัง: D1 / ST / D2\n\n"
        "คู่ Dance of Domination: H1·D3 / H2·D4 / MT·D1 / ST·D2\n"
        "คู่ tower Majestic Meteor: MT·D3 / H1·D1 / H2·D4 / ST·D2")
NOTE_EN = ("Plan follows game8 (Nukemaru's video): Lucrezia as the base / Dance of Domination with the edge safe spot as north / Orbital Omen with the boss fixed facing north / "
           "Meteorain meteors in the order healers > ranged > melee / Majestic Meteor by ZizieZip / Ecliptic Stampede by DXA\n"
           "8 waymarks: 1234 are a must, used in Majestic Meteor (see the first step)\n\n"
           "4:4 groups\nMT group: MT H1 D1 D3\nST group: ST H2 D2 D4\n\n"
           "Basic spread (by where the boss faces):\nFront row: D3 / MT / D4\nMiddle: H1 / H2\nBack row: D1 / ST / D2\n\n"
           "Dance of Domination pairs: H1·D3 / H2·D4 / MT·D1 / ST·D2\n"
           "Majestic Meteor tower pairs: MT·D3 / H1·D1 / H2·D4 / ST·D2")

BODY = [("Grand Champion's Jacket of Fending", "Fending", "057000/057328"), ("Grand Champion's Jacket of Maiming", "Maiming", "057000/057329"),
        ("Grand Champion's Coat of Striking", "Striking", "057000/057334"), ("Grand Champion's Coat of Scouting", "Scouting", "057000/057333"),
        ("Grand Champion's Coat of Aiming", "Aiming", "057000/057332"), ("Grand Champion's Coat of Casting", "Casting", "057000/057331"),
        ("Grand Champion's Bliaud of Healing", "Healing", "057000/057330")]
LEGS = [("Grand Champion's Breeches of Fending", "Fending", "057000/057430"), ("Grand Champion's Breeches of Maiming", "Maiming", "057000/057431"),
        ("Grand Champion's Hose of Striking", "Striking", "057000/057436"), ("Grand Champion's Hose of Scouting", "Scouting", "057000/057435"),
        ("Grand Champion's Hose of Aiming", "Aiming", "057000/057434"), ("Grand Champion's Breeches of Casting", "Casting", "057000/057433"),
        ("Grand Champion's Breeches of Healing", "Healing", "057000/057432")]
pieces = lambda rows: [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in rows]
HHIHWI = {"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.4, "label": "Hhihwi"},
          "say": "จุดแลก: Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)",
          "say_en": "Where to exchange: Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)"}

rewards = [
    {"kind": "token", "name": "AAC Illustrated: HW Edition III", "icon_src": ICON("ui/icon/026000/026459_hr1.tex"),
     "say": "ได้ 1 เล่มทุกครั้งที่เคลียร์ (การันตี) รับได้สัปดาห์ละครั้ง\n\nแลกที่ Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
            "เสื้อ (Body) IL790: 6 เล่ม\nกางเกง (Legs) IL790: 6 เล่ม\nThundersteeped Twine: 4 เล่ม\nThundersteeped Solvent: 4 เล่ม\n\n"
            "AAC Illustrated: HW Edition IV 1 เล่ม แลกเป็น Edition III ได้ 1 เล่ม",
     "say_en": "Every clear gives 1 (guaranteed), once a week\n\nExchange them with Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
               "Body IL790: 6\nLegs IL790: 6\nThundersteeped Twine: 4\nThundersteeped Solvent: 4\n\n"
               "One AAC Illustrated: HW Edition IV trades for one Edition III",
     "pics": [HHIHWI]},
    {"kind": "other", "name": "Grand Champion's Chest Gear Coffer (IL 790)", "ilvl": 790, "icon_src": ICON("ui/icon/026000/026559_hr1.tex"),
     "say": "หีบเสื้อ (Body) IL790 จากหีบรางวัล: เปิดแล้วได้เสื้อตามอาชีพที่ใช้อยู่ตอนเปิด (เปิดในดันเจี้ยนไม่ได้)\nแตะไอคอนเพื่อดูชื่อแต่ละแบบ",
     "say_en": "A body-gear coffer, IL790, from the treasure: it opens into the body for the job you're on when you open it (not inside a duty)\nTap an icon for each one's name",
     "pieces": pieces(BODY)},
    {"kind": "other", "name": "Grand Champion's Leg Gear Coffer (IL 790)", "ilvl": 790, "icon_src": ICON("ui/icon/026000/026561_hr1.tex"),
     "say": "หีบกางเกง (Legs) IL790 จากหีบรางวัล: เปิดแล้วได้กางเกงตามอาชีพที่ใช้อยู่ตอนเปิด\nแตะไอคอนเพื่อดูชื่อแต่ละแบบ",
     "say_en": "A leg-gear coffer, IL790, from the treasure: it opens into the legs for the job you're on when you open it\nTap an icon for each one's name",
     "pieces": pieces(LEGS)},
    {"kind": "other", "name": "Thundersteeped Twine", "icon_src": ICON("ui/icon/021000/021693_hr1.tex"),
     "say": "ได้จากหีบรางวัล หรือแลกด้วย Edition III 4 เล่ม\nใช้อัปเกรดชุด Bygone Brass (ชุด tomestone) ส่วนเสื้อผ้า เป็น Augmented",
     "say_en": "From the treasure, or 4 Edition III\nUpgrades Bygone Brass (tomestone) armour to Augmented"},
    {"kind": "other", "name": "Thundersteeped Solvent", "icon_src": ICON("ui/icon/027000/027640_hr1.tex"),
     "say": "ได้จากหีบรางวัล หรือแลกด้วย Edition III 4 เล่ม\nใช้อัปเกรดอาวุธ Bygone Brass (อาวุธ tomestone) เป็น Augmented",
     "say_en": "From the treasure, or 4 Edition III\nUpgrades the Bygone Brass (tomestone) weapon to Augmented"},
    {"kind": "other", "name": "Allagan Tomestone of Mnemonics", "icon_src": ICON("ui/icon/065000/065137_hr1.tex"),
     "say": "ได้ 30 ต่อการเคลียร์", "say_en": "30 per clear"},
]

guide = {
    "slug": "m11s", "short": "M11S", "sort": 3,
    "name": "The Tyrant · AAC Heavyweight M3 (Savage)",
    "category": "savage", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/755154",
    "content_key": "sav:M11S",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 100, "ilvl": 770, "party": 8, "minutes": 90,
            "unlock": "เคลียร์ AAC Heavyweight (normal) ให้ครบก่อน: เควสต์สุดท้าย Glory Incarnate\n"
                      "แล้วคุยกับ Gabbro ที่ Solution Nine — Recreation Zone (X: 22.4 Y: 17.1) ใกล้ aethernet True Vue\n"
                      "Savage ของ Arcadion ทุกรุ่นปลดล็อกที่ NPC คนนี้",
            "unlock_en": "Finish AAC Heavyweight (normal) first: the last quest is Glory Incarnate\n"
                         "then talk to Gabbro in Solution Nine — Recreation Zone (X: 22.4 Y: 17.1), near the True Vue aethernet shard\n"
                         "Every Arcadion Savage tier is unlocked from this NPC",
            "unlock_pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 22.4, "y": 17.1, "label": "Gabbro"},
                             "say": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro", "say_en": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro"}]},
    "macro_en": macros["macro_en"], "macro_ja": macros["macro_ja"],
    "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/savage_raids/m11s/",
}

defaults = {"frame": [4, 3], "bg": "#5b5c60", "arena": dict(S.BOARD), "waymarks": {}, "iconSize": 6, "markSize": 5, "bossSize": 9, "ring": 5.5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
