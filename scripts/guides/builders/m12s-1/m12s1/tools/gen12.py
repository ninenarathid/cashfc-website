"""Builds scripts/guides/data/m12s-1.json (M12S part 1, Lindwurm: game8's plan, Nukemaru's video)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/m12s1"
sys.path.insert(0, HERE + "/tools")
import scenes12 as S

OUT = r"scripts/guides/data/m12s-1.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/dl/all_imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk_*
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "Tmfv_bbDqQ8"
FR = lambda name, t, say, say_en: (f"frames/m12s-1/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")

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
        s["ring"] = 5.2
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


def sc(fn):
    return fn()


P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วงกลาง", "Middle part")
P3 = ("ช่วงท้าย", "Last part")

MT_GROUP = ("MT", "H1", "D1", "D3")
ST_GROUP = ("ST", "H2", "D2", "D4")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker ตามภาพของ game8", "Waymarks as game8 draws them",
     "Marker ตามภาพของ game8 (สนามเป็นสี่เหลี่ยมผืนผ้า กว้างกว่ายาว):\n"
     "A เหนือ\nC ใต้\nD ตะวันตก\nB ตะวันออก\n"
     "ABCD วางใกล้กลางสนาม ไม่ได้อยู่ริมขอบ\n\n"
     "1 ตะวันตกเฉียงเหนือ\n2 ตะวันออกเฉียงเหนือ\n3 ตะวันออกเฉียงใต้\n4 ตะวันตกเฉียงใต้\n\n"
     "Mortal Slayer: กลุ่ม MT ฝั่ง D (ตะวันตก) / กลุ่ม ST ฝั่ง B (ตะวันออก)\n"
     "Slaughtershed: ระหว่างร่าย TH ไปรอที่ A",
     "Waymarks as game8 draws them (the arena is a rectangle, wider than it is deep):\n"
     "A north\nC south\nD west\nB east\n"
     "ABCD sit near the middle, not at the edge\n\n"
     "1 north-west\n2 north-east\n3 south-east\n4 south-west\n\n"
     "Mortal Slayer: MT group on the D side (west) / ST group on the B side (east)\n"
     "Slaughtershed: during the cast, TH wait at A",
     strict=False, pic=1, scene=sc(S.waymarks))

# ------------------------------------------------------------------ first part
step(P1, "The Fixer", "raid-wide เวท แรงมาก", "A very heavy magic raid-wide",
     "raid-wide แบบเวท (magic) แรงมาก\n"
     "ชั้นนี้ไม่เหมือน 3 ชั้นก่อน: ถ้าไม่ mitigate คนตายได้\n"
     "ทุกอาชีพต้องตั้งใจ mitigate\n\n"
     "Healer: SCH วาง Sacred Soil / SGE วาง Kerachole ตอน GCD ที่ 2 หลังเริ่มไฟต์\n"
     "จะคลุมไปถึง Mortal Slayer ที่ตามมาด้วย ช่วยให้ทนขึ้นมาก",
     "A magic raid-wide, very heavy\n"
     "Unlike the first three floors, people can die to it without mitigation\n"
     "Every job must mitigate\n\n"
     "Healers: SCH's Sacred Soil / SGE's Kerachole placed on the 2nd GCD of the pull\n"
     "also covers the Mortal Slayer that follows, which makes the party much sturdier",
     strict=False,
     refs=[FR("the-fixer", 40, "The Fixer: raid-wide เวททั้งสนาม แรงมาก ทุกคนต้อง mitigate", "The Fixer: a magic raid-wide over the whole arena, very heavy; everyone mitigates")])

MS = "Mortal Slayer"
GROUP_SAYS = {s: "กลุ่ม MT: ฝั่งตะวันตก (D)" for s in MT_GROUP}
GROUP_SAYS.update({s: "กลุ่ม ST: ฝั่งตะวันออก (B)" for s in ST_GROUP})
GROUP_SAYS_EN = {s: "MT group: the west side (D)" for s in MT_GROUP}
GROUP_SAYS_EN.update({s: "ST group: the east side (B)" for s in ST_GROUP})
step(P1, MS, "① แบ่ง 4:4 ซ้าย-ขวา", "① Split 4:4, west and east",
     "Mortal Slayer: ลูกเขียวกับลูกม่วงขึ้นข้างซ้ายและขวาของบอส แล้วพุ่งใส่คนทีละรอบ รวม 4 รอบ\n"
     "ลูกพุ่งใส่คนที่อยู่ใกล้ลูกฝั่งนั้น ไม่ใช่คนที่ใกล้บอส: ต้องแยกซ้าย-ขวาให้ชัด\n\n"
     "① แบ่ง 4:4 ซ้าย-ขวาไว้ก่อน\n"
     "กลุ่ม MT ฝั่งตะวันตก (D): MT H1 D1 D3\n"
     "กลุ่ม ST ฝั่งตะวันออก (B): ST H2 D2 D4\n\n"
     "ลำดับคนรับลูกเขียว: Healer > Melee > Range > Range ที่สลับฝั่งมา\n"
     "ลูกม่วง: Tank > Tank ที่สลับฝั่งมา",
     "Mortal Slayer: green and purple orbs appear on the boss's left and right, then fly at people a round at a time, 4 rounds\n"
     "An orb goes for whoever is nearest to it on its side, not whoever is nearest the boss: keep west and east clearly apart\n\n"
     "① Split 4:4, west and east, first\n"
     "MT group west (D): MT H1 D1 D3\n"
     "ST group east (B): ST H2 D2 D4\n\n"
     "Green orbs are taken in the order: Healer > Melee > Range > the Range who swapped sides\n"
     "Purple orbs: Tank > the Tank who swapped sides",
     strict=True, pic=2, scene=sc(S.ms1), says=GROUP_SAYS, says_en=GROUP_SAYS_EN,
     refs=[FR("mortal-slayer-orbs", 676, "Mortal Slayer: ลูกเขียว/ม่วงขึ้นข้างซ้าย-ขวาของบอส พุ่งใส่คนที่ใกล้ลูกฝั่งนั้น", "Mortal Slayer: green and purple orbs on the boss's left and right; each flies at the nearest player on its side")])
step(P1, MS, "② จำตำแหน่งลูก", "② Note where the orbs are",
     "② จำตำแหน่งลูกเขียวและลูกม่วงที่ขึ้นข้างซ้าย-ขวาของบอส\n"
     "ตัวเลขข้างลูกในภาพ = รอบที่ลูกนั้นพุ่งมา\n\n"
     "ภาพ:\nฝั่งตะวันตก: เขียว 1, 1, 2, 4\nฝั่งตะวันออก: ม่วง 2, เขียว 3, 3, ม่วง 4",
     "② Note where the green and purple orbs appear on the boss's left and right\n"
     "The number beside each orb in the picture = the round it flies\n\n"
     "Picture:\nWest: green 1, 1, 2, 4\nEast: purple 2, green 3, 3, purple 4",
     strict=True, pic=3, scene=sc(S.ms2), says=GROUP_SAYS, says_en=GROUP_SAYS_EN)
step(P1, MS, "③ ม่วง 2 ลูกฝั่งเดียว: Tank สลับกับ Range", "③ Both purples on one side: a tank and a ranged swap",
     "③ ลูกม่วงขึ้นฝั่งเดียวกัน 2 ลูกเสมอ: Tank กับ Range สลับฝั่งกัน\n"
     "Tank อีกฝั่งย้ายมาฝั่งที่มีม่วง 2 ลูก / Range ฝั่งนั้นย้ายไปแทน\n\n"
     "ภาพ: ม่วงอยู่ตะวันออกทั้ง 2 ลูก → MT ย้ายไปตะวันออก / D4 ย้ายไปตะวันตก",
     "③ The two purple orbs always appear on the same side: a tank and a ranged swap sides\n"
     "The other side's tank moves to the side with both purples / that side's ranged takes their place\n\n"
     "Picture: both purples are east → MT moves east / D4 moves west",
     strict=True, pic=4, scene=sc(S.ms3),
     says={"MT": "ภาพ: ม่วงตะวันออก → ย้ายไปตะวันออก รับม่วงลูกที่ 2", "D4": "ภาพ: ม่วงตะวันออก → ย้ายไปตะวันตก รับเขียวลูกสุดท้าย",
           "H1": "กลุ่ม MT: ฝั่งตะวันตก", "D1": "กลุ่ม MT: ฝั่งตะวันตก", "D3": "กลุ่ม MT: ฝั่งตะวันตก",
           "ST": "กลุ่ม ST: ฝั่งตะวันออก", "H2": "กลุ่ม ST: ฝั่งตะวันออก", "D2": "กลุ่ม ST: ฝั่งตะวันออก"},
     says_en={"MT": "Picture: purples east → move east, take the second purple", "D4": "Picture: purples east → move west, take the last green",
              "H1": "MT group: the west side", "D1": "MT group: the west side", "D3": "MT group: the west side",
              "ST": "ST group: the east side", "H2": "ST group: the east side", "D2": "ST group: the east side"})
step(P1, MS, "④ รอบ 1: เข้าใกล้บอส ล่อลูก", "④ Round 1: close in and bait",
     "④ เข้าใกล้บอส ล่อลูกรอบที่ 1\n"
     "ลำดับคนรับลูกเขียว: Healer > Melee > Range > Range ที่สลับมา\n"
     "ภาพ: รอบ 1 เป็นเขียว 2 ลูกฝั่งตะวันตก → H1 กับ D1\n\n"
     "ถ้าฝั่งเดียวกันมี 2 ลูก: คนลำดับก่อนยืนหน้าซ้าย / คนลำดับหลังยืนหลังขวา\n"
     "รับแล้วหลบออกทางตะวันออกหรือตะวันตกเสมอ: คนถัดไปจะเข้ามาข้างหน้า ถ้าถอยไปข้างหลังจะโดนลูกของเขาด้วย",
     "④ Close in on the boss and bait round 1\n"
     "Green orbs in the order: Healer > Melee > Range > the swapped Range\n"
     "Picture: round 1 is two greens on the west → H1 and D1\n\n"
     "Two orbs on one side: the earlier one stands front-left / the later one back-right\n"
     "Once hit, always leave to the east or west: the next person comes forward, and backing away puts you in their orb",
     strict=["H1", "D1"], pic=5, scene=sc(S.ms4),
     says={"H1": "ภาพ: รับเขียวรอบ 1 (หน้าซ้าย)", "D1": "ภาพ: รับเขียวรอบ 1 (หลังขวา)"},
     says_en={"H1": "Picture: green, round 1 (front-left)", "D1": "Picture: green, round 1 (back-right)"})
step(P1, MS, "⑤ รอบ 2: ลูกม่วงให้ Tank", "⑤ Round 2: a tank takes the purple",
     "⑤ เข้าใกล้บอส ล่อลูกรอบที่ 2\n"
     "ลูกม่วงให้ Tank รับพร้อมเปิด mitigate ของตัวเอง: ลูกม่วงแรงมาก\n\n"
     "ภาพ: เขียวฝั่งตะวันตก → D3 / ม่วงฝั่งตะวันออก → ST\n"
     "H1 กับ D1 ที่รับไปแล้วหลบไปทางตะวันตก",
     "⑤ Close in on the boss and bait round 2\n"
     "The purple orb goes to a tank, with their own mitigation up: purple hits very hard\n\n"
     "Picture: green west → D3 / purple east → ST\n"
     "H1 and D1, already hit, have moved away west",
     strict=["D3", "ST"], pic=6, scene=sc(S.ms5),
     says={"D3": "ภาพ: รับเขียวรอบ 2", "ST": "ภาพ: รับม่วงรอบ 2 + mitigate"},
     says_en={"D3": "Picture: green, round 2", "ST": "Picture: purple, round 2 + mitigate"})
step(P1, MS, "⑥ รอบ 3", "⑥ Round 3",
     "⑥ เข้าใกล้บอส ล่อลูกรอบที่ 3\n"
     "ภาพ: เขียว 2 ลูกฝั่งตะวันออก → H2 (หน้าซ้าย) กับ D2 (หลังขวา)",
     "⑥ Close in on the boss and bait round 3\n"
     "Picture: two greens east → H2 (front-left) and D2 (back-right)",
     strict=["H2", "D2"], pic=7, scene=sc(S.ms6),
     says={"H2": "ภาพ: รับเขียวรอบ 3 (หน้าซ้าย)", "D2": "ภาพ: รับเขียวรอบ 3 (หลังขวา)"},
     says_en={"H2": "Picture: green, round 3 (front-left)", "D2": "Picture: green, round 3 (back-right)"})
step(P1, MS, "⑦ รอบ 4: คนที่สลับฝั่งรับ", "⑦ Round 4: the swapped pair",
     "⑦ เข้าใกล้บอส ล่อลูกรอบที่ 4\n"
     "ลูกม่วงลูกที่ 2 กับลูกเขียวลูกสุดท้าย: Tank กับ Range ที่สลับฝั่งเป็นคนรับ\n\n"
     "ภาพ: เขียวฝั่งตะวันตก → D4 / ม่วงฝั่งตะวันออก → MT",
     "⑦ Close in on the boss and bait round 4\n"
     "The second purple and the last green: the tank and the ranged who swapped sides take them\n\n"
     "Picture: green west → D4 / purple east → MT",
     strict=["D4", "MT"], pic=8, scene=sc(S.ms7),
     says={"D4": "ภาพ: รับเขียวรอบ 4 (ลูกสุดท้าย)", "MT": "ภาพ: รับม่วงรอบ 4 + mitigate"},
     says_en={"D4": "Picture: green, round 4 (the last)", "MT": "Picture: purple, round 4 + mitigate"})
step(P1, MS, "แบบม่วงคู่เขียว (เจอไม่บ่อย)", "Purple paired with green (rare)",
     "บางครั้งลูกม่วงกับลูกเขียวขึ้นเป็นคู่ในรอบเดียวกัน (ม่วงบน เขียวล่าง)\n"
     "ลูกม่วงดูเหมือนจะพุ่งใส่คนที่ใกล้กลางตัวบอส\n"
     "แบบนี้ Tank ขยับไปชิดด้านกลางบอส (ฝั่งกลางสนาม) แล้วรับ",
     "Rarely, a purple and a green come as a pair in the same round (purple above, green below)\n"
     "The purple seems to go for whoever is nearest the middle of the boss\n"
     "In that case the tank moves towards the middle of the boss (the arena's centre) and takes it",
     strict=False)

# ------------------------------------------------------------------ Act 1
A1 = "Grotesquerie: Act 1"
step(P2, A1, "① ได้ debuff: spread เบาๆ ไว้ก่อน", "① Debuffs: spread loosely first",
     "Grotesquerie: Act 1: ร่ายเสร็จได้ debuff 3 แบบ แยกให้กลุ่ม Tank+Healer กับกลุ่ม DPS\n"
     "หลบ AoE ไปพร้อมกัน หันกรวยของตัวเองไม่ให้โดนใคร ทำ spread กับ stack แล้วต่อด้วยท่าแรงใส่ Tank + stack\n\n"
     "Bursting Grotesquerie (วงกลม): ติด TH 4 คน หรือ DPS 4 คน หมดเวลาแล้วระเบิดวงกลมจากตัว: ต้อง spread ไม่ชิดใคร\n"
     "Directed Grotesquerie: ติดทั้ง 8 คน หมดเวลาแล้วยิงกรวยออกจากเซลล์ที่เกาะตัว (หน้า หลัง ซ้าย หรือขวา): หันกรวยไปทางที่ไม่มีคน\n"
     "Shared Grotesquerie (stack): ติด 1 คนในกลุ่มที่ไม่ได้วงกลม: 4 คนที่ไม่มีวงกลมรวมกันรับ\n\n"
     "① ก่อนร่ายเสร็จ spread เบาๆ ไว้ก่อน (macro: ที่ขอบวงเป้าบอส ด้านหน้าซ้าย)",
     "Grotesquerie: Act 1: when the cast ends, three kinds of debuff go out, split between the Tank+Healer group and the DPS group\n"
     "Dodge AoEs together, point your own cone away from everyone, do the spread and the stack, then a tankbuster + stack\n\n"
     "Bursting Grotesquerie (circle): on the 4 TH or the 4 DPS; when it runs out, a circle goes off from you: spread, touch nobody\n"
     "Directed Grotesquerie: on all 8; when it runs out, a cone fires from the cell stuck to you (front, back, left or right): point it where nobody is\n"
     "Shared Grotesquerie (stack): on one of the group without circles: the 4 without circles take it together\n\n"
     "① Before the cast ends, spread loosely (macro: at the edge of the boss's target circle, front-left)",
     strict=False, pic=9, scene=sc(S.a1_spread))
step(P2, A1, "② รวมกันที่ขอบวงบอส ทิ้ง AoE ลูกแรก", "② Gather at the boss's circle, drop the first AoE",
     "② ได้ debuff แล้ว ดูว่าเซลล์เกาะตัวเราทางไหน\n"
     "แล้วรวมกันที่ขอบวงเป้าบอส ฝั่งตะวันตกเฉียงเหนือ ล่อ AoE ลูกแรก",
     "② Once the debuffs are out, check which side the cell is stuck to you\n"
     "then gather on the boss's target circle, north-west, and bait the first AoE",
     strict=False, pic=10, scene=sc(S.a1_first))
step(P2, A1, "③ ทิ้ง AoE 4 ลูกตามขอบวง + ดูแขน", "③ Four AoEs along the circle + watch the arm",
     "③ ทิ้ง AoE 4 ลูกไปตามขอบวงเป้าบอส\n"
     "ช่วงนี้แขนบอสยื่นออกมา แล้วจะยิงกรวยทีหลัง: ดูว่าแขนอยู่ทางไหน\n"
     "(ภาพ: ไอคอนแดง = แขน)",
     "③ Drop the four AoEs along the boss's target circle\n"
     "Meanwhile the boss's arm stretches out and will fire a cone later: note where the arm is\n"
     "(Picture: the red icon = the arm)",
     strict=False, pic=11, scene=sc(S.a1_drops),
     refs=[FR("act1-arm", 233, "Act 1: ทิ้ง AoE ตามขอบวงบอส ระหว่างนั้นแขน (หัวมังกร) ยื่นออกมา ดูว่าอยู่ทางไหน", "Act 1: AoEs dropped along the boss's circle while the arm (a dragon head) stretches out; note its side")])

ACT1_TH_STACK = {"MT": "stack ที่มุม: แถวบน (ภาพ: ตะวันออก MT ST H1)", "ST": "stack ที่มุม: แถวบน กลาง", "H1": "stack ที่มุม: แถวบน ริมขอบ",
                 "H2": "stack ที่มุม: ใต้ H1", "D1": "spread: ที่ 1 จากเหนือ", "D2": "spread: ที่ 2 จากเหนือ", "D3": "spread: ที่ 3 จากเหนือ",
                 "D4": "spread: ที่ 4 จากเหนือ"}
ACT1_TH_STACK_EN = {"MT": "Corner stack: top row (picture: east, MT ST H1)", "ST": "Corner stack: top row, middle", "H1": "Corner stack: top row, at the edge",
                    "H2": "Corner stack: below H1", "D1": "Spread: 1st from the north", "D2": "Spread: 2nd from the north", "D3": "Spread: 3rd from the north",
                    "D4": "Spread: 4th from the north"}
step(P2, A1, "④-1 ไปฝั่งแขน: stack ที่มุม / spread ตามขอบ", "④-1 To the arm's side: corner stack / spread down the edge",
     "④-1 ไปฝั่งเดียวกับแขนที่จะยิงกรวย แล้วทำ spread กับ stack\n"
     "กรวยจากเซลล์ของตัวเองจะยิงออกมาด้วย: อย่าให้โดนคนอื่น (macro: หันกรวยออกนอกสนาม)\n\n"
     "ภาพ (stack เป็นของ TH): TH stack ที่มุม / DPS spread เรียงลงมาตามขอบ\n"
     "stack ที่มุมฝั่งตะวันออก: MT ST H1 เรียงแถว / H2 ใต้ H1\n"
     "(ฝั่งตะวันตก: H1 ST MT / H2 ใต้ H1)\n\n"
     "spread จากเหนือลงใต้: MT·D1 > ST·D2 > H1·D3 > H2·D4\n"
     "(ภาพนี้คนที่ spread คือ DPS: D1 > D2 > D3 > D4)",
     "④-1 Go to the side of the arm that will fire the cone, then do the spread and the stack\n"
     "The cones from your own cell fire too: keep them off everyone (macro: point the cones out of the arena)\n\n"
     "Picture (the stack is on TH): TH stack in the corner / DPS spread in a line down the edge\n"
     "East corner stack: MT ST H1 in a row / H2 below H1\n"
     "(West: H1 ST MT / H2 below H1)\n\n"
     "Spread, north to south: MT·D1 > ST·D2 > H1·D3 > H2·D4\n"
     "(Here the DPS spread: D1 > D2 > D3 > D4)",
     strict=True, pic=12, scene=sc(S.a1_east), says=ACT1_TH_STACK, says_en=ACT1_TH_STACK_EN)
step(P2, A1, "④-2 หัวมังกรไปอีกฝั่ง: กลับข้าง", "④-2 The dragon head on the other side: mirrored",
     "④-2 ถ้าหัวมังกรไปอีกฝั่ง: ทำแบบเดียวกันที่ฝั่งตะวันตก\n"
     "stack ที่มุมฝั่งตะวันตก: H1 ST MT เรียงแถว / H2 ใต้ H1\n"
     "spread จากเหนือลงใต้เหมือนเดิม: D1 > D2 > D3 > D4",
     "④-2 If the dragon head goes the other way: the same on the west side\n"
     "West corner stack: H1 ST MT in a row / H2 below H1\n"
     "Spread north to south as before: D1 > D2 > D3 > D4",
     strict=True, pic=13, scene=sc(S.a1_west),
     says={"H1": "stack ที่มุม: แถวบน ริมขอบ", "ST": "stack ที่มุม: แถวบน กลาง", "MT": "stack ที่มุม: แถวบน ฝั่งใน", "H2": "stack ที่มุม: ใต้ H1",
           "D1": "spread: ที่ 1 จากเหนือ", "D2": "spread: ที่ 2 จากเหนือ", "D3": "spread: ที่ 3 จากเหนือ", "D4": "spread: ที่ 4 จากเหนือ"},
     says_en={"H1": "Corner stack: top row, at the edge", "ST": "Corner stack: top row, middle", "MT": "Corner stack: top row, inner end", "H2": "Corner stack: below H1",
              "D1": "Spread: 1st from the north", "D2": "Spread: 2nd from the north", "D3": "Spread: 3rd from the north", "D4": "Spread: 4th from the north"})
step(P2, A1, "④-3 stack เป็นของ DPS", "④-3 When the stack is on the DPS",
     "④-3 ถ้า stack เป็นของ DPS: DPS stack ที่มุม / TH spread ตามขอบ\n"
     "stack ที่มุมฝั่งตะวันออก: D1 D2 D3 เรียงแถว / D4 ใต้ D3\n"
     "(ฝั่งตะวันตก: D3 D2 D1 / D4 ใต้ D3)\n"
     "spread จากเหนือลงใต้: MT > ST > H1 > H2",
     "④-3 When the stack is on the DPS: DPS stack in the corner / TH spread down the edge\n"
     "East corner stack: D1 D2 D3 in a row / D4 below D3\n"
     "(West: D3 D2 D1 / D4 below D3)\n"
     "Spread north to south: MT > ST > H1 > H2",
     strict=True, pic=14, scene=sc(S.a1_dps_stack),
     says={"D1": "stack ที่มุม: แถวบน (ภาพ: ตะวันออก D1 D2 D3)", "D2": "stack ที่มุม: แถวบน กลาง", "D3": "stack ที่มุม: แถวบน ริมขอบ", "D4": "stack ที่มุม: ใต้ D3",
           "MT": "spread: ที่ 1 จากเหนือ", "ST": "spread: ที่ 2 จากเหนือ", "H1": "spread: ที่ 3 จากเหนือ", "H2": "spread: ที่ 4 จากเหนือ"},
     says_en={"D1": "Corner stack: top row (picture: east, D1 D2 D3)", "D2": "Corner stack: top row, middle", "D3": "Corner stack: top row, at the edge", "D4": "Corner stack: below D3",
              "MT": "Spread: 1st from the north", "ST": "Spread: 2nd from the north", "H1": "Spread: 3rd from the north", "H2": "Spread: 4th from the north"})
LAST_SAYS = {s: "stack ที่จุดเดิมที่ปลอดภัยจากกรวย" for s in ("H1", "H2", "D1", "D2", "D3", "D4")}
LAST_SAYS.update({"MT": "ท่าแรงที่จุดปลอดภัยอีกฝั่ง: ทางเหนือ", "ST": "ท่าแรงที่จุดปลอดภัยอีกฝั่ง: ทางใต้"})
LAST_SAYS_EN = {s: "Stack where the cone's safe spot was" for s in ("H1", "H2", "D1", "D2", "D3", "D4")}
LAST_SAYS_EN.update({"MT": "Tankbuster in the other safe spot: the north end", "ST": "Tankbuster in the other safe spot: the south end"})
step(P2, A1, "⑤ AoE ใหญ่ + ท่าแรงใส่ Tank + stack", "⑤ Huge AoEs + tankbusters + stack",
     "⑤ AoE ใหญ่ขึ้นบนสนาม พร้อมท่าแรงใส่ Tank และ stack\n"
     "Tank: รับท่าแรงที่จุดปลอดภัยอีกฝั่ง (macro: MT เหนือ / ST ใต้)\n"
     "คนที่เหลือ: stack ที่จุดที่เคยปลอดภัยจากกรวย\n\n"
     "ต่อด้วย raid-wide Splattershed: mitigate ให้พอ",
     "⑤ Huge AoEs appear on the field, with tankbusters and a stack\n"
     "Tanks: take the tankbusters in the other safe spot (macro: MT north / ST south)\n"
     "Everyone else: stack where the cone's safe spot was\n\n"
     "The raid-wide Splattershed follows: mitigate well",
     strict=True, pic=15, scene=sc(S.a1_last), says=LAST_SAYS, says_en=LAST_SAYS_EN,
     refs=[FR("act1-explosions", 266, "Act 1 ⑤: AoE ใหญ่ระเบิดพร้อมกัน เหลือจุดปลอดภัย 2 ฝั่ง: Tank ฝั่งหนึ่ง คนที่เหลือ stack อีกฝั่ง", "Act 1 ⑤: the huge AoEs go off together, leaving two safe spots: tanks on one side, the rest stack on the other")])

# ------------------------------------------------------------------ Act 2
A2 = "Grotesquerie: Act 2"
step(P2, A2, "ภาพรวม: debuff α / β และลำดับ", "Overview: the α / β debuffs and the orders",
     "Grotesquerie: Act 2: ร่ายเสร็จทุกคนได้ debuff แล้วทำ tower กับตัดสาย\n"
     "จังหวะตัดสายและเข้า tower ขึ้นกับ debuff: จำหน้าที่ของ debuff ตัวเองให้ดี\n\n"
     "Bonds of Flesh α: นับถึง 0 แล้วเปลี่ยนเป็น Unbreakable Flesh α และมีสายต่อกับ β เลขเดียวกัน\n"
     "ตัดสายแล้วเกิดระเบิดวงเล็กรอบตัว และ debuff หายไป\n"
     "Bonds of Flesh β: เหมือนกัน และตรงจุดที่ β ตัดสาย (ระเบิด) จะเกิด tower\n\n"
     "ลำดับ\n"
     "ตัดสาย: 1 > 2 > 3 > 4\n"
     "เข้า tower: 3 > 4 > 1 > 2\n"
     "ตอน debuff นับถึง 0 และเปลี่ยนเป็น Unbreakable = ถึงตาตัดสายของตัวเอง",
     "Grotesquerie: Act 2: when the cast ends, everyone gets a debuff, then towers and tether breaks\n"
     "When you break a tether and when you take a tower depend on your debuff: know your debuff's job\n\n"
     "Bonds of Flesh α: at 0 it turns into Unbreakable Flesh α, tethered to the β with the same number\n"
     "Breaking the tether sets off a small circle around you, and the debuff is gone\n"
     "Bonds of Flesh β: the same, and a tower appears where the β broke its tether (the explosion)\n\n"
     "Orders\n"
     "Tether breaks: 1 > 2 > 3 > 4\n"
     "Towers: 3 > 4 > 1 > 2\n"
     "When your debuff hits 0 and turns into Unbreakable = your turn to break the tether",
     strict=False)
step(P2, A2, "หน้าที่ของแต่ละเลข", "What each number does",
     "α (ออกไปตัดสายด้านนอก + เข้า tower บนสนาม)\n"
     "α1: ตัดสายคนแรก แล้วเข้า tower บนสนามลูกที่ 3\n"
     "α3: เข้า tower บนสนามลูกที่ 1 แล้วตัดสายคนที่ 3\n"
     "α2: ตัดสายคนที่ 2 แล้วเข้า tower บนสนามลูกที่ 4\n"
     "α4: เข้า tower บนสนามลูกที่ 2 แล้วตัดสายคนที่ 4\n\n"
     "β (ตัดสายด้านใน + เข้า tower ที่เกิดจากการตัดสายของ β)\n"
     "β1: ตัดสายคนแรก แล้วเข้า tower ที่เกิดจากการตัดสายครั้งที่ 3\n"
     "β3: เข้า tower ที่เกิดจากการตัดสายครั้งแรก แล้วตัดสายคนที่ 3\n"
     "β2: ตัดสายคนที่ 2 แล้วเข้า tower ที่เกิดจากการตัดสายครั้งที่ 4\n"
     "β4: เข้า tower ที่เกิดจากการตัดสายครั้งที่ 2 แล้วตัดสายคนที่ 4",
     "α (break the tether outside + take the towers on the field)\n"
     "α1: break first, then take the 3rd field tower\n"
     "α3: take the 1st field tower, then break third\n"
     "α2: break second, then take the 4th field tower\n"
     "α4: take the 2nd field tower, then break fourth\n\n"
     "β (break the tether inside + take the towers the β breaks leave)\n"
     "β1: break first, then take the tower left by the 3rd break\n"
     "β3: take the tower left by the 1st break, then break third\n"
     "β2: break second, then take the tower left by the 4th break\n"
     "β4: take the tower left by the 2nd break, then break fourth",
     strict=False)
step(P2, A2, "① AoE 4 ลูกตกทีละลูก: จำลำดับ", "① Four AoEs land one by one: remember the order",
     "① ทุกคนได้ debuff แล้ว AoE 4 ลูกตกลงบนสนามทีละลูก\n"
     "tower จะขึ้นตรงจุดที่ AoE ตก ตามลำดับเดียวกัน: จำลำดับไว้",
     "① Everyone has a debuff, and four AoEs land on the field one by one\n"
     "Towers will appear where they landed, in the same order: remember it",
     strict=False, pic=19, scene=sc(S.a2_drops),
     refs=[FR("act2-cells", 414, "Act 2 ①: AoE ตกลงบนสนามทีละลูก ตรงที่ตกจะขึ้น tower ตามลำดับเดียวกัน จำลำดับไว้", "Act 2 ①: AoEs land on the field one by one; towers will rise where they landed, in the same order: remember it")])
step(P2, A2, "② บอสม้วนตัวรอบกลางสนาม", "② The boss coils around the middle",
     "② บอสย้ายมากลางสนาม ทุกคนถูกดึงเข้ามาตรงกลาง\n"
     "ตัวบอสล้อมเป็นวง มีทางออกทางเดียว (เหนือ ใต้ ออก หรือตก) แต่ยังโดน bind ออกไม่ได้\n"
     "(ภาพ: วงส้ม = ตัวบอส / ช่องว่าง = ทางออก / ไอคอนแดง = จุดที่ AoE ตก)",
     "② The boss moves to the middle and everyone is pulled in to the centre\n"
     "Its body rings the middle with one exit (north, south, east or west), but you're bound and can't leave yet\n"
     "(Picture: orange ring = the boss's body / the gap = the exit / red marks = where the AoEs landed)",
     strict=False, pic=20, scene=sc(S.a2_pull))
step(P2, A2, "③ บอสหมุน 90°: ยังรอกลางวง", "③ The boss turns 90°: still wait in the middle",
     "③ บอสหมุน 90 องศา ทางออกย้ายตาม\n"
     "bind หายแล้ว เดินได้ แต่ยังรออยู่กลางวง",
     "③ The boss turns 90° and the exit moves with it\n"
     "The bind is gone and you can move, but stay in the middle for now",
     strict=False, pic=21, scene=sc(S.a2_turn))
step(P2, A2, "④ สายคู่ที่ 1: α1 ออก / β1 ตรงข้าม", "④ Tether 1: α1 out / β1 opposite",
     "④ บอสหมุน 90 องศา: debuff ของ α1 กับ β1 ทำงาน มีสายต่อกัน\n"
     "α1: เดินออกทางออกไปข้างนอก เพื่อตัดสาย\n"
     "β1: วิ่งไปฝั่งตรงข้ามในวง เพื่อตัดสาย\n\n"
     "ภาพเป็นตัวอย่างหนึ่ง: ทำตามเลข α / β บน debuff ของตัวเอง",
     "④ The boss turns 90°: α1's and β1's debuffs go off and tether them\n"
     "α1: walk out through the exit to break the tether\n"
     "β1: run to the opposite side inside the ring to break it\n\n"
     "The picture is one example: go by the α / β number on your own debuff",
     strict=False, pic=22, scene=sc(S.a2_t1),
     refs=[FR("act2-tethers", 444, "Act 2: ตัวบอสล้อมวงกลางสนาม เส้นแดง = สายคู่ α-β ที่ต้องตัด (α ออกไปตัดข้างนอก / β ไปฝั่งตรงข้ามในวง)", "Act 2: the boss's body rings the middle; the red line = an α-β tether to break (α outside / β to the far side inside)")])
step(P2, A2, "⑤ สายคู่ที่ 2 + tower ชุดแรก", "⑤ Tether 2 + the first towers",
     "⑤ บอสหมุน 90 องศา: α2 กับ β2 มีสาย ตัดแบบเดียวกัน (α2 ออกทางออก / β2 ฝั่งตรงข้าม)\n"
     "พร้อมกันนั้น tower ขึ้นที่จุด AoE ลูกที่ 1 และที่จุดที่ β1 ตัดสาย\n"
     "tower จุด AoE → α3 / tower ของ β1 → β3",
     "⑤ The boss turns 90°: α2 and β2 are tethered and break the same way (α2 out of the exit / β2 to the far side)\n"
     "At the same time towers appear on the 1st AoE spot and where β1 broke its tether\n"
     "AoE tower → α3 / β1's tower → β3",
     strict=False, pic=23, scene=sc(S.a2_t2))
step(P2, A2, "⑥ สายคู่ที่ 3 + tower ชุดที่ 2", "⑥ Tether 3 + the second towers",
     "⑥ บอสหมุน 90 องศา: α3 กับ β3 ตัดสาย\n"
     "tower ขึ้นที่จุด AoE ลูกที่ 2 และที่จุดที่ β2 ตัดสาย\n"
     "tower จุด AoE → α4 / tower ของ β2 → β4",
     "⑥ The boss turns 90°: α3 and β3 break\n"
     "Towers appear on the 2nd AoE spot and where β2 broke\n"
     "AoE tower → α4 / β2's tower → β4",
     strict=False, pic=24, scene=sc(S.a2_t3))
step(P2, A2, "⑦ สายคู่ที่ 4 + tower ชุดที่ 3", "⑦ Tether 4 + the third towers",
     "⑦ บอสหมุน 90 องศา: α4 กับ β4 ตัดสาย\n"
     "tower ขึ้นที่จุด AoE ลูกที่ 3 และที่จุดที่ β3 ตัดสาย\n"
     "tower จุด AoE → α1 / tower ของ β3 → β1",
     "⑦ The boss turns 90°: α4 and β4 break\n"
     "Towers appear on the 3rd AoE spot and where β3 broke\n"
     "AoE tower → α1 / β3's tower → β1",
     strict=False, pic=25, scene=sc(S.a2_t4))
step(P2, A2, "⑧ tower ชุดสุดท้าย", "⑧ The last towers",
     "⑧ บอสหมุน 90 องศา: tower ขึ้นที่จุด AoE ลูกที่ 4 และที่จุดที่ β4 ตัดสาย\n"
     "tower จุด AoE → α2 / tower ของ β4 → β2",
     "⑧ The boss turns 90°: towers appear on the 4th AoE spot and where β4 broke\n"
     "AoE tower → α2 / β4's tower → β2",
     strict=False, pic=26, scene=sc(S.a2_t5))
step(P2, A2, "⑨ จบ: β ออกทางออก", "⑨ Done: β leave by the exit",
     "⑨ บอสหมุน 90 องศา: สายและ tower จบหมดแล้ว\n"
     "β ที่อยู่ในวงเดินออกทางออกไปข้างนอก\n\n"
     "คนที่ทำเสร็จแล้วรออยู่ข้างนอก: อย่ายืนฝั่งทางออก อาจโดนระเบิดเซลล์ของ α",
     "⑨ The boss turns 90°: the tethers and towers are all done\n"
     "The β players inside walk out through the exit\n\n"
     "Those already done and waiting outside: don't stand on the exit side, or α's cell explosion may catch you",
     strict=False, pic=27, scene=sc(S.a2_out))
step(P2, A2, "กฎของ tower บนสนาม + เคล็ดลับ", "The field towers' rule + a tip",
     "tower บนสนาม: ลูกคี่ (1, 3) ขึ้นฝั่งเดียวกัน ลูกคู่ (2, 4) ขึ้นฝั่งเดียวกัน\n"
     "ลูกที่ 3 ขึ้นฝั่งที่ลูกที่ 1 ขึ้น / ลูกที่ 4 ขึ้นฝั่งที่ลูกที่ 2 ขึ้น\n"
     "ดูแค่ลูก 1 กับ 2 ก็รู้ทันทีว่าลูก 3 กับ 4 จะขึ้นเหนือหรือใต้\n"
     "(ภาพ: เส้นแดงแบ่งเหนือ-ใต้ / ลูกคู่ 2 · 4 ทางเหนือ / ลูกคี่ 1 · 3 ทางใต้)\n\n"
     "เคล็ดลับประหยัดสมอง (game8):\n"
     "debuff นับถึง 0 = ถึงตาตัดสายของตัวเอง\n"
     "ตอนแรกลืมเรื่องสายไปก่อน จำแค่ตำแหน่งและลำดับ tower 3412\n"
     "จังหวะตัดสายกับการดูทางออก รอให้เวลา debuff เหลือน้อยก่อนค่อยดูก็ทัน",
     "Field towers: the odd ones (1, 3) appear on one side, the even ones (2, 4) on one side\n"
     "The 3rd appears on the 1st's side / the 4th on the 2nd's side\n"
     "So towers 1 and 2 alone tell you at once whether 3 and 4 come north or south\n"
     "(Picture: the red line splits north and south / even 2 · 4 north / odd 1 · 3 south)\n\n"
     "A tip to save thinking (game8):\n"
     "Your debuff hitting 0 = your turn to break\n"
     "At first forget the tethers; keep only the tower spots and the order 3412 in mind\n"
     "The break timing and the exit can wait until your debuff is nearly out; there is time",
     strict=False, pic=30, scene=sc(S.a2_rule))

# ------------------------------------------------------------------ Act 3
A3 = "Grotesquerie: Act 3"
X_ISLAND_SAYS = {s: "DPS: มุมขวาบนของเกาะ" for s in ("D1", "D2", "D3", "D4")}
X_ISLAND_SAYS.update({s: "TH: มุมซ้ายล่างของเกาะ" for s in ("MT", "ST", "H1", "H2")})
X_ISLAND_SAYS_EN = {s: "DPS: the island's top-right corner" for s in ("D1", "D2", "D3", "D4")}
X_ISLAND_SAYS_EN.update({s: "TH: the island's bottom-left corner" for s in ("MT", "ST", "H1", "H2")})
step(P2, A3, "แบบ X ①: เซลล์หันเข้ากลาง", "X pattern ①: cells face the middle",
     "Grotesquerie: Act 3: ทุกคนได้ debuff แล้วเข้า tower และล่อ AoE\n"
     "Mitotic Phase: นับถึง 0 แล้ว tower ขึ้นตามทิศที่เซลล์เกาะตัว: ถ้าไม่มีใครเข้า tower จะระเบิด เกือบ wipe\n"
     "จุด spread เปลี่ยนตามทิศของเซลล์ และตามรูปที่พื้นพัง\n"
     "หลัง tower: หัวมังกรขึ้นทางตะวันตกและตะวันออก Tank ใช้ invuln เข้าไปล่อท่าแรง แล้ววงกลมตกใส่คนที่ไกล ต้อง spread\n\n"
     "① spread ให้เซลล์ของตัวเองหันเข้ากลางสนาม (ไม่ต้องเรียงเป๊ะเหมือนภาพ)\n"
     "ถ้าไม่มี AoE ขึ้นที่มุมตะวันตกเฉียงเหนือ: พื้นจะเหลือเป็นรูป X (เกาะ 4 มุม) ที่เหลือพังหมด",
     "Grotesquerie: Act 3: everyone gets a debuff, then towers and AoE baits\n"
     "Mitotic Phase: at 0 a tower appears in the direction of the cell stuck to you; an empty tower explodes, nearly a wipe\n"
     "Your spread spot depends on your cell's side and on how the floor breaks\n"
     "After the towers: dragon heads appear west and east; the tanks bait their heavy hits with invulns, then circles drop on the far players: spread\n\n"
     "① Spread so your cell faces the middle (you needn't line up exactly as drawn)\n"
     "No AoE at the north-west corner: the floor will be left as an X (four corner islands) and the rest falls away",
     strict=False, pic=31, scene=sc(S.a3_x1),
     refs=[FR("act3-cells", 494, "Act 3: เซลล์สีแดงเกาะตัวทุกคน spread ให้เซลล์หันเข้ากลางสนาม", "Act 3: a red cell clings to everyone; spread so it faces the middle")])
step(P2, A3, "แบบ X ②: ตามเข็มไปเกาะมุม", "X pattern ②: clockwise to the corner islands",
     "② แบบ X: จากจุดที่ยืนใน ① เดินตามเข็มนาฬิกาไปเกาะของตัวเอง แล้วเข้า tower\n"
     "บนเกาะ: DPS มุมขวาบน / TH มุมซ้ายล่าง\n"
     "(ภาพ: ลูกศร = ทิศที่เซลล์หัน)",
     "② X pattern: from your spot in ①, go clockwise to your island and take the tower\n"
     "On the island: DPS top-right / TH bottom-left\n"
     "(Picture: arrows = where each cell faces)",
     strict=False, pic=32, scene=sc(S.a3_x2), says=X_ISLAND_SAYS, says_en=X_ISLAND_SAYS_EN)
DRAGON_SAYS = {"MT": "หัวมังกรตะวันตก: ล่อลำแสงด้วย invuln", "ST": "หัวมังกรตะวันออก: ล่อลำแสงด้วย invuln"}
DRAGON_SAYS_EN = {"MT": "West dragon head: bait its line with an invuln", "ST": "East dragon head: bait its line with an invuln"}
step(P2, A3, "แบบ X ③: หัวมังกร: Tank ล่อด้วย invuln", "X pattern ③: dragon heads: tanks bait with invulns",
     "③ พื้นกลับมาบางส่วน และหัวมังกรขึ้น 2 จุด\n"
     "หัวมังกรยิงลำแสงแนวตรง: Tank ใช้ invuln ล่อ\n"
     "หัวตะวันตก → MT / หัวตะวันออก → ST\n"
     "คนที่เหลือรอกลางสนาม",
     "③ Part of the floor comes back and two dragon heads appear\n"
     "They fire line AoEs: the tanks bait them with invulns\n"
     "West head → MT / east head → ST\n"
     "Everyone else waits in the middle",
     strict=["MT", "ST"], pic=33, scene=sc(S.a3_x3), says=DRAGON_SAYS, says_en=DRAGON_SAYS_EN,
     refs=[FR("act3-dragons", 556, "Act 3 ③: หัวมังกร 2 หัวขึ้นทางตะวันตก/ตะวันออก Tank ใช้ invuln ล่อลำแสง", "Act 3 ③: two dragon heads, west and east; the tanks bait their lines with invulns")])
SPREAD3 = {"MT": "แถวบน ฝั่งตะวันตก", "ST": "แถวบน ฝั่งตะวันออก", "D1": "แถวกลาง ฝั่งตะวันตก", "D2": "แถวกลาง ฝั่งตะวันออก",
           "H1": "กลางสนาม", "H2": "กลางสนาม", "D3": "แถวล่าง ฝั่งตะวันตก", "D4": "แถวล่าง ฝั่งตะวันออก"}
SPREAD3_EN = {"MT": "Top row, west", "ST": "Top row, east", "D1": "Middle row, west", "D2": "Middle row, east",
              "H1": "The middle", "H2": "The middle", "D3": "Bottom row, west", "D4": "Bottom row, east"}
SPREAD3 = {k: "spread ตามภาพ: " + v for k, v in SPREAD3.items()}
SPREAD3_EN = {k: "Spread as drawn: " + v for k, v in SPREAD3_EN.items()}
step(P2, A3, "แบบ X ④: วงกลมใส่คนที่ไกลหัวมังกร", "X pattern ④: circles on those far from the heads",
     "④ จากนั้นวงกลมตกใส่ 3 คนที่ไกลหัวมังกร: spread ตามภาพแล้วรับ จบ\n\n"
     "macro:\nแถวบน: MT / ST\nแถวกลาง: D1 / H1 H2 / D2\nแถวล่าง: D3 / D4",
     "④ Then circles drop on the 3 players farthest from the dragon heads: spread as drawn and take them; done\n\n"
     "Macro:\nTop row: MT / ST\nMiddle row: D1 / H1 H2 / D2\nBottom row: D3 / D4",
     strict=True, pic=34, scene=sc(S.a3_x4), says=SPREAD3, says_en=SPREAD3_EN)
C_ISLAND_SAYS = {s: "DPS: เกาะเหนือ/ใต้ มุมซ้ายบน · เกาะออก/ตก มุมขวาบน" for s in ("D1", "D2", "D3", "D4")}
C_ISLAND_SAYS.update({s: "TH: เกาะเหนือ/ใต้ มุมขวาล่าง · เกาะออก/ตก มุมซ้ายล่าง" for s in ("MT", "ST", "H1", "H2")})
C_ISLAND_SAYS_EN = {s: "DPS: N/S islands top-left · E/W islands top-right" for s in ("D1", "D2", "D3", "D4")}
C_ISLAND_SAYS_EN.update({s: "TH: N/S islands bottom-right · E/W islands bottom-left" for s in ("MT", "ST", "H1", "H2")})
step(P2, A3, "แบบกากบาท ①: AoE ที่มุมตะวันตกเฉียงเหนือ", "Cross pattern ①: an AoE at the north-west corner",
     "① spread แบบเดียวกัน: เซลล์ของตัวเองหันเข้ากลางสนาม\n"
     "ถ้ามี AoE ขึ้นที่มุมตะวันตกเฉียงเหนือ: พื้นจะเหลือเป็นรูปกากบาท (เกาะเหนือ ใต้ ออก ตก)",
     "① Spread the same way: your cell faces the middle\n"
     "An AoE at the north-west corner: the floor will be left as a cross (islands north, south, east and west)",
     strict=False, pic=35, scene=sc(S.a3_c1))
step(P2, A3, "แบบกากบาท ②: เกาะเหนือ-ใต้กลับข้าง", "Cross pattern ②: the north and south islands are mirrored",
     "② แบบกากบาท: DPS กับ TH ไปตามจุดในภาพแล้วเข้า tower\n"
     "เกาะเหนือกับใต้เท่านั้นที่กลับข้าง: DPS มุมซ้ายบน / TH มุมขวาล่าง\n"
     "เกาะออกกับตก เหมือนแบบ X: DPS มุมขวาบน / TH มุมซ้ายล่าง",
     "② Cross pattern: DPS and TH go to the spots shown and take the towers\n"
     "Only the north and south islands are mirrored: DPS top-left / TH bottom-right\n"
     "The east and west islands are as in the X pattern: DPS top-right / TH bottom-left",
     strict=False, pic=36, scene=sc(S.a3_c2), says=C_ISLAND_SAYS, says_en=C_ISLAND_SAYS_EN)
step(P2, A3, "แบบกากบาท ③: หัวมังกร: Tank ล่อด้วย invuln", "Cross pattern ③: dragon heads: tanks bait with invulns",
     "③ พื้นกลับมาบางส่วน หัวมังกรขึ้น 2 จุด\n"
     "Tank ใช้ invuln ล่อลำแสงแนวตรง: หัวตะวันตก → MT / หัวตะวันออก → ST\n"
     "คนที่เหลือรอกลางสนาม",
     "③ Part of the floor returns and two dragon heads appear\n"
     "The tanks bait the line AoEs with invulns: west head → MT / east head → ST\n"
     "Everyone else waits in the middle",
     strict=["MT", "ST"], pic=37, scene=sc(S.a3_c3), says=DRAGON_SAYS, says_en=DRAGON_SAYS_EN)
step(P2, A3, "แบบกากบาท ④: วงกลมใส่คนที่ไกลหัวมังกร", "Cross pattern ④: circles on those far from the heads",
     "④ วงกลมตกใส่ 3 คนที่ไกลหัวมังกร: spread ตามภาพแล้วรับ จบ\n"
     "จุดเรียงแบบเดียวกับแบบ X (macro): MT / ST บน / D1 · H1 H2 · D2 กลาง / D3 / D4 ล่าง",
     "④ Circles drop on the 3 players farthest from the dragon heads: spread as drawn and take them; done\n"
     "The same layout as the X pattern (macro): MT / ST top / D1 · H1 H2 · D2 middle / D3 / D4 bottom",
     strict=True, pic=38, scene=sc(S.a3_c4), says=SPREAD3, says_en=SPREAD3_EN)

# ------------------------------------------------------------------ Curtain Call
CC = "Grotesquerie: Curtain Call"
REACH_DPS = {s: "debuff ม่วง: ยืนในกรวยของแขน (ภาพนี้)" for s in ("D1", "D2", "D3", "D4")}
REACH_DPS.update({s: "debuff เหลือง: spread ฝั่งที่ไม่โดนกรวย (ภาพนี้)" for s in ("MT", "ST", "H1", "H2")})
REACH_DPS_EN = {s: "Purple debuff: stand in the arm's cone (this picture)" for s in ("D1", "D2", "D3", "D4")}
REACH_DPS_EN.update({s: "Yellow debuff: spread on the side the cone misses (this picture)" for s in ("MT", "ST", "H1", "H2")})
REACH_TH = {s: "debuff ม่วง: ยืนในกรวยของแขน (ภาพนี้)" for s in ("MT", "ST", "H1", "H2")}
REACH_TH.update({s: "debuff เหลือง: spread ฝั่งที่ไม่โดนกรวย (ภาพนี้)" for s in ("D1", "D2", "D3", "D4")})
REACH_TH_EN = {s: "Purple debuff: stand in the arm's cone (this picture)" for s in ("MT", "ST", "H1", "H2")}
REACH_TH_EN.update({s: "Yellow debuff: spread on the side the cone misses (this picture)" for s in ("D1", "D2", "D3", "D4")})
step(P2, CC, "พื้นกากบาท ①: ทิ้ง AoE 5 ลูกจากตะวันตกเฉียงเหนือ", "Cross floor ①: five AoEs from the north-west",
     "Grotesquerie: Curtain Call: ทุกคนได้ debuff แล้วล่อ AoE, spread และตัดสาย (ระหว่างร่ายไปรวมกันทางตะวันตกเฉียงเหนือ)\n"
     "Bursting Grotesquerie (เหลือง): เหมือน Act 1: หมดเวลาแล้วระเบิดวงกลมจากตัว\n"
     "Rotting Flesh (ม่วง): ต้องโดนกรวยที่ออกจากแขนบอสเพื่อลบ debuff ตอน debuff หายมีวงเล็กระเบิดรอบตัว: ต้อง spread\n"
     "Bonds of Flesh α: เหมือน Act 2: debuff หมดแล้วมีสาย ตัดสายแล้วมีวงเล็กระเบิด\n\n"
     "พื้นเป็นรูปเดียวกับที่เหลือจาก Act 3 (ภาพนี้: กากบาท)\n"
     "① ร่ายเสร็จได้ debuff แล้วทิ้ง AoE 5 ลูก เริ่มจากตะวันตกเฉียงเหนือ (macro: เริ่มซ้ายบน ทิ้งตามขอบ)\n"
     "ขั้น ② แรงผิดปกติ: เตรียม barrier + mitigate ไว้",
     "Grotesquerie: Curtain Call: everyone gets a debuff, then AoE baits, spreads and tether breaks (during the cast, gather north-west)\n"
     "Bursting Grotesquerie (yellow): as in Act 1, a circle goes off from you when it runs out\n"
     "Rotting Flesh (purple): get hit by the cone from the boss's arm to clear it; a small circle goes off around you as it clears: spread\n"
     "Bonds of Flesh α: as in Act 2: when it runs out you're tethered; breaking it sets off a small circle\n\n"
     "The floor keeps the shape Act 3 left (this picture: the cross)\n"
     "① As the cast ends and the debuffs go out, drop five AoEs starting from the north-west (macro: from the top-left, along the edge)\n"
     "Step ② hits unusually hard: have barriers + mitigation ready",
     strict=False, pic=40, scene=sc(S.cc_c1))
step(P2, CC, "พื้นกากบาท ②: แขนยื่น: ม่วงเข้ากรวย / เหลืองหลบ", "Cross floor ②: the arm reaches: purple in the cone / yellow out",
     "② ดูแขนที่ยื่นออกมาของ Ravenous Reach\n"
     "debuff ม่วง: ไปยืนในกรวยให้โดน\n"
     "debuff เหลือง: ไปฝั่งที่ไม่โดน\n"
     "ทั้งสองแบบมีวงกลมระเบิด: spread\n\n"
     "ภาพ: DPS ม่วงยืนในกรวย / TH เหลือง spread อีกฝั่ง\n"
     "เรียงจากเหนือลงใต้: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     "② Watch where Ravenous Reach's arm stretches\n"
     "Purple debuff: stand in the cone and get hit\n"
     "Yellow debuff: go to the side it misses\n"
     "Both bring a circle: spread\n\n"
     "Picture: the purple DPS stand in the cone / the yellow TH spread on the other side\n"
     "North to south: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     strict=True, pic=41, scene=sc(S.cc_c2), says=REACH_DPS, says_en=REACH_DPS_EN,
     refs=[FR("curtain-call-reach", 616, "Curtain Call ②: แขนบอสยื่นยาวข้ามสนาม (Ravenous Reach) ม่วงเข้ากรวย เหลืองหลบ", "Curtain Call ②: the boss's arm reaches across the arena (Ravenous Reach); purple in the cone, yellow out")])
step(P2, CC, "พื้น X ①: ทิ้ง AoE ยังเริ่มจากตะวันตกเฉียงเหนือ", "X floor ①: the AoEs still start north-west",
     "① ถ้า Act 3 จบเป็นรูป X: ทิ้ง AoE ตามภาพ\n"
     "ยังไงก็เริ่มทิ้งจากตะวันตกเฉียงเหนือ",
     "① If Act 3 ended as an X: drop the AoEs as drawn\n"
     "Either way, start dropping from the north-west",
     strict=False, pic=42, scene=sc(S.cc_x1))
step(P2, CC, "พื้น X ②: ม่วงรับกรวย", "X floor ②: purple takes the cone",
     "② debuff ม่วงไปรับกรวยของแขน\n"
     "ระหว่างทิ้ง AoE ใน ① ดู debuff ของตัวเองไว้ก่อนจะง่ายขึ้น\n\n"
     "ภาพ: TH ม่วงยืนในกรวย / DPS เหลือง spread อีกฝั่ง\n"
     "เรียงจากเหนือลงใต้: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     "② The purple debuffs take the arm's cone\n"
     "It helps to check your debuff while dropping the AoEs in ①\n\n"
     "Picture: the purple TH stand in the cone / the yellow DPS spread on the other side\n"
     "North to south: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     strict=True, pic=43, scene=sc(S.cc_x2), says=REACH_TH, says_en=REACH_TH_EN)
step(P2, CC, "③ รวมกลางสนาม รอสาย", "③ Gather in the middle, wait for the tethers",
     "③ (ต่อจากทั้งสองแบบ) รวมกันกลางสนามแล้วรอ: debuff α หมดเมื่อไหร่ สายขึ้น\n"
     "มาร์กบนหัวหายแล้ว รอจังหวะนึงก่อนค่อยวิ่งออกก็ได้\n"
     "(ภาพ: วงน้ำตาล = เซลล์บนสนาม)",
     "③ (Both patterns continue here) gather in the middle and wait: the tethers come when the α debuff runs out\n"
     "Once the head marker is gone, you may wait a beat before running out\n"
     "(Picture: brown rings = the cells on the field)",
     strict=False, pic=44, scene=sc(S.cc_gather),
     refs=[FR("curtain-call-gather", 628, "Curtain Call ③: รวมกันกลางสนามรอสาย ก้อนแดง = เซลล์บนสนาม", "Curtain Call ③: gather in the middle and wait for the tethers; the red lumps = the cells on the field")])
TETHER_SAYS = {"MT": "ตะวันตก ที่ 1 จากเหนือ", "ST": "ตะวันตก ที่ 2 จากเหนือ", "H1": "ตะวันตก ที่ 3 จากเหนือ", "H2": "ตะวันตก ที่ 4 จากเหนือ",
               "D1": "ตะวันออก ที่ 1 จากเหนือ", "D2": "ตะวันออก ที่ 2 จากเหนือ", "D3": "ตะวันออก ที่ 3 จากเหนือ", "D4": "ตะวันออก ที่ 4 จากเหนือ"}
TETHER_SAYS_EN = {"MT": "West, 1st from the north", "ST": "West, 2nd from the north", "H1": "West, 3rd from the north", "H2": "West, 4th from the north",
                  "D1": "East, 1st from the north", "D2": "East, 2nd from the north", "D3": "East, 3rd from the north", "D4": "East, 4th from the north"}
TETHER_SAYS = {k: "ตัดสาย: " + v for k, v in TETHER_SAYS.items()}
TETHER_SAYS_EN = {k: "Break the tether: " + v for k, v in TETHER_SAYS_EN.items()}
step(P2, CC, "④ ตัดสาย: TH ตะวันตก / DPS ตะวันออก", "④ Break the tethers: TH west / DPS east",
     "④ ตัดสาย: Tank + Healer ไปตะวันตก / DPS ไปตะวันออก\n"
     "ตัดสายแล้วมีวงเล็กระเบิดเหมือน Act 2: อย่าให้โดนคนอื่น\n"
     "เรียงจากเหนือลงใต้: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     "④ Break the tethers: tanks + healers go west / DPS go east\n"
     "A small circle goes off as you break, as in Act 2: keep it off others\n"
     "North to south: MT·D1 > ST·D2 > H1·D3 > H2·D4",
     strict=True, pic=45, scene=sc(S.cc_tethers), says=TETHER_SAYS, says_en=TETHER_SAYS_EN)
step(P2, CC, "⑤ แบบที่ 1: ตัดแล้ววิ่งเข้าจุดปลอดภัย", "⑤ Pattern 1: break, then run to the safe spot",
     "⑤ ตัดสายแล้วรีบไปจุดปลอดภัย: ใช้ Sprint จะปลอดภัย\n"
     "ตอนตัดสายควรนึกภาพจุดปลอดภัยไว้แล้ว\n"
     "(ภาพ: วงส้มใหญ่ = ระเบิดของเซลล์ / ช่องที่ไม่มีวง = จุดปลอดภัย)",
     "⑤ After breaking, get to the safe spot quickly: Sprint makes it safe\n"
     "Have the safe spot pictured by the time you break\n"
     "(Picture: big orange circles = the cells' explosions / the gaps = safe spots)",
     strict=False, pic=46, scene=sc(S.cc_safe_a))
step(P2, CC, "⑤ แบบที่ 2: จุดปลอดภัยอีกแบบ + LB3", "⑤ Pattern 2: the other safe spots + LB3",
     "⑤ จุดปลอดภัยอีกแบบหนึ่ง\n"
     "ใช้ LB3 ตรงนี้",
     "⑤ The other set of safe spots\n"
     "Use LB3 here",
     strict=False, pic=47, scene=sc(S.cc_safe_b))

# ------------------------------------------------------------------ Slaughtershed
SL = "Slaughtershed"
WAIT_SAYS = {s: "TH: รอฝั่งเหนือ (macro: ที่ A)" for s in ("MT", "ST", "H1", "H2")}
WAIT_SAYS.update({s: "DPS: รอฝั่งใต้ (macro: ปลายวงเป้าบอส)" for s in ("D1", "D2", "D3", "D4")})
WAIT_SAYS_EN = {s: "TH: wait north (macro: at A)" for s in ("MT", "ST", "H1", "H2")}
WAIT_SAYS_EN.update({s: "DPS: wait south (macro: at the tip of the boss's target circle)" for s in ("D1", "D2", "D3", "D4")})
step(P3, SL, "① หลัง raid-wide: TH เหนือ / DPS ใต้", "① After the raid-wide: TH north / DPS south",
     "Slaughtershed: หลบ AoE ใหญ่ ทำ stack กับ spread แล้วรับท่าจากแขนบอส (AoE ครึ่งสนาม หรือ knockback)\n"
     "stack กับ spread ติดตามกลุ่ม (role): stack ที่จุดปลอดภัยด้านแคบ / spread ที่ด้านกว้าง\n"
     "ระหว่างนั้นแขนบอสงอกออกมา 2 แบบ: แขนหนา (มือเป็นหัวมังกร) = AoE ครึ่งสนาม / มือธรรมดา = knockback\n"
     "ท่าจากแขนมาตามลำดับที่แขนงอก: ดูลำดับและชนิดของแขน\n\n"
     "① หลัง raid-wide (Slaughtershed): TH รอฝั่งเหนือ / DPS รอฝั่งใต้\n"
     "แยกกันไว้เพื่อให้เห็นวง stack กับวงกลมชัด\n"
     "macro: ระหว่างร่าย TH ไปที่ A / DPS ไปปลายวงเป้าบอส",
     "Slaughtershed: dodge the huge AoEs, do the stack and the spread, then take the boss's arm attacks (a half-arena AoE or a knockback)\n"
     "The stack and the spread go by group (role): stack in the narrow safe spot / spread in the wide one\n"
     "Meanwhile the boss grows arms of two kinds: a thick arm (a dragon-head hand) = half-arena AoE / a normal hand = knockback\n"
     "The arm attacks come in the order the arms grew: watch the order and the kind\n\n"
     "① After the raid-wide (Slaughtershed): TH wait on the north side / DPS on the south side\n"
     "Apart, so the stack and the circles are easy to read\n"
     "Macro: during the cast, TH go to A / DPS to the tip of the boss's target circle",
     strict=True, pic=51, scene=sc(S.sl_gather), says=WAIT_SAYS, says_en=WAIT_SAYS_EN,
     refs=[FR("slaughtershed-cells", 698, "Slaughtershed: หลัง raid-wide เซลล์ตกลงบนสนาม แล้วระเบิดเป็น AoE ใหญ่", "Slaughtershed: after the raid-wide, cells fall on the field and later burst into huge AoEs")])
SPREAD_SL = {"D1": "spread (ภาพ: ตะวันออกเฉียงเหนือ): แถวบน ฝั่งใน", "D3": "spread (ภาพ): แถวบน ริมขอบ", "D2": "spread (ภาพ): แถวล่าง ฝั่งใน", "D4": "spread (ภาพ): แถวล่าง ริมขอบ",
             "MT": "stack (ภาพ: ด้านแคบ ตะวันตกเฉียงเหนือ)", "ST": "stack (ภาพ: ด้านแคบ)", "H1": "stack (ภาพ: ด้านแคบ)", "H2": "stack (ภาพ: ด้านแคบ)"}
SPREAD_SL_EN = {"D1": "Spread (picture: north-east): top row, inner", "D3": "Spread (picture): top row, at the edge", "D2": "Spread (picture): bottom row, inner",
                "D4": "Spread (picture): bottom row, at the edge", "MT": "Stack (picture: the narrow side, north-west)", "ST": "Stack (picture: the narrow side)",
                "H1": "Stack (picture: the narrow side)", "H2": "Stack (picture: the narrow side)"}
step(P3, SL, "② stack ด้านแคบ / spread ด้านกว้าง + ดูแขน", "② Stack on the narrow side / spread on the wide side + watch the arms",
     "② ตะวันออกเฉียงเหนือกับตะวันตกเฉียงเหนือ: stack ที่ด้านแคบ / spread ที่ด้านกว้าง\n"
     "ด้านแคบกับด้านกว้างสลับซ้าย-ขวาได้\n"
     "ตอนนี้ดูลำดับที่แขนบอสงอกออกมา และดูว่าแขนหนาหรือบาง\n\n"
     "จุด spread (macro):\n"
     "ฝั่งตะวันตก: H1 MT / H2 ST หรือ D3 D1 / D4 D2\n"
     "ฝั่งตะวันออก: MT H1 / ST H2 หรือ D1 D3 / D2 D4\n"
     "(ภาพ: TH stack ด้านแคบ ตะวันตกเฉียงเหนือ / DPS spread ด้านกว้าง ตะวันออกเฉียงเหนือ)",
     "② North-east and north-west: stack on the narrow side / spread on the wide side\n"
     "Which side is narrow and which wide can swap left and right\n"
     "Now watch the order the boss's arms grow, and whether they are thick or thin\n\n"
     "Spread spots (macro):\n"
     "West: H1 MT / H2 ST or D3 D1 / D4 D2\n"
     "East: MT H1 / ST H2 or D1 D3 / D2 D4\n"
     "(Picture: TH stack on the narrow north-west side / DPS spread on the wide north-east side)",
     strict=True, pic=52, scene=sc(S.sl_resolve), says=SPREAD_SL, says_en=SPREAD_SL_EN)
step(P3, SL, "③ แขนหนา: AoE ครึ่งสนาม (แขนแรก)", "③ Thick arms: half-arena AoE (the first arm)",
     "③ ถ้าแขนบอสหนา: AoE ครึ่งสนาม เริ่มจากฝั่งที่แขนงอกก่อน\n"
     "(ภาพ: ซูมใกล้บอส / ส้ม = ครึ่งที่โดน)",
     "③ If the boss's arms are thick: a half-arena AoE, first from the side whose arm grew first\n"
     "(Picture: zoomed near the boss / orange = the half that is hit)",
     strict=False, pic=53, scene=S.sl_half("west"),
     refs=[FR("slaughtershed-arms", 752, "Slaughtershed: แขนบอสงอกทีละข้าง แขนหนา = AoE ครึ่งสนาม มาตามลำดับที่งอก", "Slaughtershed: the boss grows an arm on each side in turn; thick = a half-arena AoE, in the order they grew")])
step(P3, SL, "④ แขนหนา: อีกครึ่ง (แขนที่ 2)", "④ Thick arms: the other half (the second arm)",
     "④ ต่อด้วย AoE ครึ่งสนามจากแขนหนาที่งอกทีหลัง",
     "④ Then the half-arena AoE from the thick arm that grew second",
     strict=False, pic=54, scene=S.sl_half("east"))
step(P3, SL, "③ แขนบาง: knockback (แขนแรก)", "③ Thin arms: knockback (the first arm)",
     "③ ถ้าแขนบอสบาง (มือธรรมดา): knockback จากทิศที่แขนงอกก่อน",
     "③ If the boss's arms are thin (normal hands): a knockback from the side whose arm grew first",
     strict=False, pic=55, scene=S.sl_kb("east"),
     refs=[FR("slaughtershed-knockback", 790, "Slaughtershed: มือธรรมดา = knockback ใช้ลายกระเบื้องบนพื้นกะจุดที่จะปลิวไป", "Slaughtershed: a normal hand = a knockback; use the floor tiles to judge where you will land")])
step(P3, SL, "④ แขนบาง: knockback (แขนที่ 2)", "④ Thin arms: knockback (the second arm)",
     "④ ต่อด้วย knockback จากแขนบางที่งอกทีหลัง\n"
     "ใช้ Arm's Length หรือ Surecast ได้",
     "④ Then the knockback from the thin arm that grew second\n"
     "Arm's Length or Surecast work",
     strict=False, pic=56, scene=S.sl_kb("west"))
step(P3, SL, "ลำดับ 1 รอบ: ทำซ้ำ 3 รอบ", "One round: repeated 3 times",
     "ลำดับ 1 รอบ: raid-wide → stack และ spread → ท่าจากแขน\n"
     "ทำซ้ำแบบนี้ 3 รอบ\n\n"
     "knockback: ใช้ลายกระเบื้องบนพื้นเป็นตัวกะว่าจะปลิวไปตรงไหน\n"
     "Melee: ถ้าปลิวไปด้านข้างได้ จะไม่เสีย DPS\n\n"
     "ทุกอย่างมาเร็วมาก ถ้ารับเปล่าๆ: stack / spread ราว 150,000–160,000 / knockback ครั้งละราว 35,000\n"
     "ถ้าไม่ทำอะไรเลยตาย: ตั้งใจเติม HP กลับให้ทัน\n"
     "raid-wide Slaughtershed แรงที่สุด: อย่าลืม mitigate",
     "One round: raid-wide → stack and spread → the arm attacks\n"
     "It repeats like this 3 times\n\n"
     "Knockback: judge where you will land by the floor tiles\n"
     "Melee: if you can be knocked sideways, you lose no DPS\n\n"
     "It all comes very fast. Unmitigated: stack / spread about 150,000–160,000 / each knockback about 35,000\n"
     "Doing nothing kills you: make a point of topping HP back up\n"
     "The Slaughtershed raid-wide hurts most: don't forget to mitigate",
     strict=False)
step(P3, "Refreshing Overkill", "enrage: ลด HP บอสให้ถึง 0.1%", "Enrage: bring the boss to 0.1%",
     "Refreshing Overkill: ร่ายทันทีหลัง Slaughtershed ครบ 3 รอบ\n"
     "ลด HP บอสไม่ถึง 0.1% = wipe\n"
     "ถึงลดได้ถึง 0.1% แล้ว ก็ยังมีดาเมจตอนท้าย: ระวังไว้",
     "Refreshing Overkill: cast right after the third Slaughtershed round\n"
     "If the boss isn't down to 0.1% HP = wipe\n"
     "Even at 0.1%, there is still damage at the end: be ready for it",
     strict=False,
     refs=[FR("refreshing-overkill", 840, "Refreshing Overkill: ร่ายหลัง Slaughtershed รอบที่ 3 ต้องลด HP บอสให้ถึง 0.1% ก่อน", "Refreshing Overkill: cast after the third Slaughtershed; get the boss to 0.1% before it ends")])

# ------------------------------------------------------------------ guide
NOTE = ("แผนตาม game8: วิดีโอของ Nukemaru (game8 บอกว่าเกือบทั้งหมดตามแผน Idyllshire)\n"
        "Marker ตามภาพของ game8 (ดูขั้นแรก): ABCD วางใกล้กลางสนาม\n\n"
        "กลุ่ม 4:4 (Mortal Slayer)\n"
        "กลุ่ม MT: MT H1 D1 D3 (ฝั่ง D ตะวันตก)\n"
        "กลุ่ม ST: ST H2 D2 D4 (ฝั่ง B ตะวันออก)\n\n"
        "ลำดับจากเหนือลงใต้ (spread ของ Act 1 / Curtain Call และการตัดสาย): MT·D1 > ST·D2 > H1·D3 > H2·D4\n\n"
        "Act 2: ตัดสาย 1 > 2 > 3 > 4 / เข้า tower 3 > 4 > 1 > 2\n"
        "Act 3 บนเกาะ: DPS มุมขวาบน / TH มุมซ้ายล่าง (พื้นกากบาท: เกาะเหนือ-ใต้กลับข้าง)\n"
        "หัวมังกร: ตะวันตก MT / ตะวันออก ST\n\n"
        "จบ (Refreshing Overkill) หลัง Slaughtershed 3 รอบ")
NOTE_EN = ("Plan follows game8: Nukemaru's video (which, game8 says, follows Idyllshire's strat almost throughout)\n"
           "Waymarks as game8 draws them (see the first step): ABCD sit near the middle\n\n"
           "4:4 groups (Mortal Slayer)\n"
           "MT group: MT H1 D1 D3 (the D side, west)\n"
           "ST group: ST H2 D2 D4 (the B side, east)\n\n"
           "North-to-south order (Act 1 / Curtain Call spreads and the tether breaks): MT·D1 > ST·D2 > H1·D3 > H2·D4\n\n"
           "Act 2: tethers 1 > 2 > 3 > 4 / towers 3 > 4 > 1 > 2\n"
           "Act 3 on the islands: DPS top-right / TH bottom-left (cross floor: the north and south islands mirrored)\n"
           "Dragon heads: west MT / east ST\n\n"
           "The end (Refreshing Overkill) after three Slaughershed rounds").replace("Slaughershed", "Slaughtershed")

WEAPONS = [("Grand Champion's Falchion", "PLD", "030000/030700"), ("Grand Champion's Kite Shield", "PLD", "030000/030289"),
           ("Grand Champion's War Axe", "WAR", "031000/031274"), ("Grand Champion's Guillotine", "DRK", "034000/034029"),
           ("Grand Champion's Sawback", "GNB", "036000/036120"), ("Grand Champion's Cane", "WHM", "032000/032495"),
           ("Grand Champion's Codex", "SCH", "037000/037851"), ("Grand Champion's Astrometer", "AST", "034000/034722"),
           ("Grand Champion's Syrinxi", "SGE", "037000/037086"), ("Grand Champion's Baghnakhs", "MNK", "030000/030864"),
           ("Grand Champion's Spear", "DRG", "031000/031676"), ("Grand Champion's Knives", "NIN", "033000/033650"),
           ("Grand Champion's Blade", "SAM", "036000/036578"), ("Grand Champion's War Scythe", "RPR", "037000/037290"),
           ("Grand Champion's Twinfangs", "VPR", "037000/037453"), ("Grand Champion's Longbow", "BRD", "032000/032064"),
           ("Grand Champion's Pistol", "MCH", "034000/034523"), ("Grand Champion's War Quoits", "DNC", "036000/036319"),
           ("Grand Champion's Rod", "BLM", "032000/032910"), ("Grand Champion's Index", "SMN", "037000/037850"),
           ("Grand Champion's Foil", "RDM", "036000/036877"), ("Grand Champion's Flat Brush", "PCT", "037000/037663")]
pieces = lambda rows: [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in rows]
HHIHWI = {"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.4, "label": "Hhihwi"},
          "say": "จุดแลก: Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)",
          "say_en": "Where to exchange: Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)"}

rewards = [
    {"kind": "token", "name": "AAC Illustrated: HW Edition IV", "icon_src": ICON("ui/icon/026000/026460_hr1.tex"),
     "say": "ได้ 1 เล่ม (การันตี) ทุกครั้งที่เคลียร์ทั้งดันเจี้ยน คือจบครึ่งหลังด้วย\n"
            "ตั้งแต่ patch 7.56 ไม่จำกัดจำนวนต่อสัปดาห์แล้ว\n\n"
            "แลกที่ Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
            "อาวุธ IL795: 8 เล่ม ต่ออาวุธ 1 ชิ้น\n"
            "AAC Illustrated: HW Edition I / II / III: 1 เล่ม ต่อ 1 เล่ม",
     "say_en": "1 (guaranteed) every time you clear the whole duty, the second half included\n"
               "Since patch 7.56 there is no weekly limit\n\n"
               "Exchange them with Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
               "IL795 weapon: 8 per weapon\n"
               "AAC Illustrated: HW Edition I / II / III: 1 for 1",
     "pics": [HHIHWI]},
    {"kind": "weapon", "name": "Grand Champion's Weapons", "ilvl": 795, "icon_src": ICON("ui/icon/030000/030700_hr1.tex"),
     "say": "แลกด้วย AAC Illustrated: HW Edition IV 8 เล่ม ต่ออาวุธ 1 ชิ้น\n"
            "หรือได้จากหีบรางวัล: Grand Champion's Weapon Coffer (IL 795) 1 ใบ และอาวุธสุ่มอีก 1 ชิ้น\n"
            "มีครบทุกอาชีพ (PLD ได้ดาบ + โล่) แตะไอคอนเพื่อดูชื่อ",
     "say_en": "8 AAC Illustrated: HW Edition IV per weapon\n"
               "or from the treasure: one Grand Champion's Weapon Coffer (IL 795) and one random weapon besides\n"
               "One for every job (PLD gets a sword + shield); tap an icon for its name",
     "pieces": pieces(WEAPONS)},
    {"kind": "other", "name": "Grand Champion's Weapon Coffer (IL 795)", "ilvl": 795, "icon_src": ICON("ui/icon/026000/026557_hr1.tex"),
     "say": "หีบอาวุธ IL795 จากหีบรางวัล: เปิดแล้วได้อาวุธของอาชีพที่ใช้อยู่ตอนเปิด (เปิดในดันเจี้ยนไม่ได้)",
     "say_en": "An IL795 weapon coffer from the treasure: it opens into the weapon for the job you're on when you open it (not inside a duty)"},
    {"kind": "mount", "name": "Lowrider T1RANT", "icon_src": ICON("ui/icon/004000/004334_hr1.tex"),
     "say": "ดรอปจากหีบรางวัลเป็นไอเทม Lowrider T1RANT Identification Key: ใช้แล้วได้ mount นี้\nแลกด้วย Edition IV ไม่ได้",
     "say_en": "Drops from the treasure as the Lowrider T1RANT Identification Key: use it to get this mount\nIt can't be bought with Edition IV",
     "pics": [{"src": ICON("ui/icon/068000/068334_hr1.tex"), "say": "หน้าตา Lowrider T1RANT (ภาพจาก Mount Guide ในเกม)",
               "say_en": "Lowrider T1RANT, as the in-game Mount Guide shows it"}]},
    {"kind": "minion", "name": "Grooving Green", "icon_src": ICON("ui/icon/059000/059977_hr1.tex"),
     "say": "minion ดรอปจากหีบรางวัล (M4 แบบ normal ก็ดรอป)", "say_en": "A minion from the treasure (the normal M4 drops it too)"},
    {"kind": "orchestrion", "name": "The Arcadion Orchestrion Roll", "icon_src": ICON("ui/icon/025000/025945_hr1.tex"),
     "say": "orchestrion roll ดรอปจากหีบรางวัล", "say_en": "An orchestrion roll from the treasure"},
    {"kind": "other", "name": "Allagan Tomestone of Mnemonics", "icon_src": ICON("ui/icon/065000/065137_hr1.tex"),
     "say": "ได้ 30 ต่อการเคลียร์", "say_en": "30 per clear"},
]

guide = {
    "slug": "m12s-1", "short": "M12S-1", "sort": 4,
    "name": "Lindwurm · AAC Heavyweight M4 (Savage)",
    "category": "savage", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/756439",
    "content_key": "sav:M12S-1",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 100, "ilvl": 770, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ AAC Heavyweight (normal) ให้ครบก่อน: เควสต์สุดท้าย Glory Incarnate\n"
                      "แล้วคุยกับ Gabbro ที่ Solution Nine — Recreation Zone (X: 22.4 Y: 17.1) ใกล้ aethernet True Vue\n"
                      "Savage ของ Arcadion ทุกรุ่นปลดล็อกที่ NPC คนนี้\n"
                      "ไฟต์นี้คือครึ่งแรกของ M4 (Savage): ดันเจี้ยนเดียวกับครึ่งหลัง เวลารวม 120 นาที",
            "unlock_en": "Finish AAC Heavyweight (normal) first: the last quest is Glory Incarnate\n"
                         "then talk to Gabbro in Solution Nine — Recreation Zone (X: 22.4 Y: 17.1), near the True Vue aethernet shard\n"
                         "Every Arcadion Savage tier is unlocked from this NPC\n"
                         "This fight is the first half of M4 (Savage): one duty with the second half, 120 minutes in all",
            "unlock_pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 22.4, "y": 17.1, "label": "Gabbro"},
                             "say": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro", "say_en": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro"}]},
    "macro_en": macros["macro_en"], "macro_ja": macros["macro_ja"],
    "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/savage_raids/m12s_1/",
}

defaults = {"frame": [4, 3], "bg": S.BG, "arena": dict(S.BOARD), "waymarks": {}, "iconSize": 5.8, "markSize": 5, "bossSize": 22.5, "ring": 5.2}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
