"""P3 (Omega Reconfigured), from Tuufless's Notes: elemental/top/03_omega_reconfigured/ (+ mitigation/)."""
from core import step, FR, P3
from scenes_top import *

TS = "Transition"
SN = "#a45bd6"     # Sniper Cannon Fodder (purple)
HP = "#8fd0ff"     # High-powered Sniper Cannon Fodder
NO = "#cdb68a"     # no debuff
CY = "#38d6d6"


def tok(c, col, s=""):
    return pl(c, s, col, 2.3, "#1d1d1d", 2.2)


def arms(angles, r=14.5):
    out = []
    for a in angles:
        p = P(a, r)
        out += [dot(p, 2.0, "#d7dbe3"), ring(p, 2.0, "#4b5563", 0.3)]
    return out


ARM1, ARM2 = (305, 55, 180), (0, 120, 240)
NP = [(33, 9), (36, 10.5), (64, 9), (67, 10.5)]
PU = [(5, 50), (95, 50), (22, 87), (78, 87)]


def players(np=NP, pu=PU):
    out = []
    for i, c in enumerate(np):
        out += tok(c, HP if i % 2 == 0 else NO)
    for c in pu:
        out += tok(c, SN)
    return out


L0 = roles(MT=(15.5, 50), ST=(25.5, 50), H1=(34.5, 50), H2=(44.5, 50), D1=(54, 50), D2=(63.5, 50), D3=(72.5, 50), D4=(82, 50))
step(P3, TS, "① เรียงแถวแนวนอน ทุกคนต้องมี barrier", "① Line up across; everyone needs a shield",
     "เฟสเดียวในไฟต์ที่มี Mechanic ช่วงเปลี่ยนเฟส (transition)\n\n"
     "debuff:\n"
     "Sniper Cannon Fodder (4 คน): หมดเวลา เกิด AoE วงกลมรอบตัว / ถ้าตายก่อน AoE ไปลงคนสุ่มทันที\n"
     "High-powered Sniper Cannon Fodder (2 คน): หมดเวลาหรือตาย เกิด stack 2 คนรอบตัว ให้จับคู่กับคนไม่มี debuff (มี 2 คน)\n"
     "โดน stack แล้วติด Magic Vulnerability Up: stack ห้ามซ้อนกัน\n\n"
     "① ยืนเรียงแถวแนวนอน\n"
     "ทุกคนต้องมี barrier (shield) จึงจะรอดช่วงนี้",
     "The only phase with a transition mechanic\n\n"
     "The debuffs:\n"
     "Sniper Cannon Fodder (four players): when it runs out, a circle AoE goes off on you / die early and it hits a random player at once\n"
     "High-powered Sniper Cannon Fodder (two players): when it runs out or you die, a two-player stack goes off on you; pair with a player who has no debuff (there are two)\n"
     "The stack leaves Magic Vulnerability Up, so stacks must not overlap\n\n"
     "① Line up horizontally\n"
     "Everyone needs a shield to survive the transition",
     strict=False, pic="03/transition_01.jpg", scene=board(wm=False, roles=L0))

sh = aoe((50, 50), 13, "#ff9d7a", 0.45) + players()
for c in NP[::2] + PU:
    sh.append(arrow(towards((50, 50), c, 0.3), towards((50, 50), c, 0.85), "#ffffff", 0.4))
step(P3, TS, "② debuff ขึ้น: คู่ stack ไปเหนือ Sniper กระจายครึ่งใต้", "② Debuffs: stack pairs north, Snipers spread south",
     "② debuff ขึ้น\n"
     "High-powered Sniper Cannon Fodder: จับคู่กับคนไม่มี debuff แล้วไปทางเหนือ\n"
     "คนไม่มี debuff: จับคู่กับ High-powered แล้วไปทางเหนือ\n"
     "Sniper Cannon Fodder: กระจายตัวครึ่งใต้\n\n"
     "macro: เรียงลำดับ H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n"
     "คู่ stack (High-powered + ไม่มี debuff): จุด 1 ตก.เฉียงเหนือ / จุด 2 ตอ.เฉียงเหนือ\n"
     "Sniper (ม่วง): จุด 1 ตะวันตก / จุด 2 ตก.เฉียงใต้ / จุด 3 ตอ.เฉียงใต้ / จุด 4 ตะวันออก\n\n"
     "ภาพ: จุดฟ้า = High-powered / จุดครีม = ไม่มี debuff / จุดม่วง = Sniper",
     "② The debuffs appear\n"
     "High-powered Sniper Cannon Fodder: pair with a player with no debuff, go north\n"
     "No debuff: pair with a High-powered player, go north\n"
     "Sniper Cannon Fodder: spread over the south half\n\n"
     "Macro: priority H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n"
     "Stack pairs (High-powered + no debuff): spot 1 north-west / spot 2 north-east\n"
     "Snipers (purple): spot 1 west / 2 south-west / 3 south-east / 4 east\n\n"
     "Picture: light blue = High-powered / cream = no debuff / purple = Sniper",
     strict=False, pic="03/transition_02.jpg", scene=board(sh, wm=False),
     refs=[FR("transition", "nin", 302, "Transition: Wave Repeater ขยายจากกลาง แขนรอบสนามโผล่ทีละชุด", "Transition: Wave Repeater grows from the middle; the arms appear a set at a time")])

sh = aoe((50, 50), 13, CY, 0.4) + arms(ARM1) + players()
step(P3, TS, "③ คลื่นลูกแรก: จำตำแหน่งแขนชุดแรก", "③ First pulse: note the first arms",
     "③ Wave Repeater (AoE ขยายจากกลาง) ลูกแรกลง\n"
     "แขน 3 อันโผล่รอบสนาม ห่างกัน 120 องศา\n"
     "จำตำแหน่งแขนชุดแรกนี้ไว้",
     "③ The first pulse of the expanding Wave Repeater goes off\n"
     "Three arms appear around the arena, 120 degrees apart\n"
     "Note where this first set of arms is",
     strict=False, pic="03/transition_03.jpg", scene=board(sh, wm=False))

sh = [donut((50, 50), 30, 13, CY, 0.4)] + [ring((50, 50), 30, CY, 0.35)] + arms(ARM1) + arms(ARM2) + players()
step(P3, TS, "④ คลื่นลูกที่ 2: แขนชุดที่ 2", "④ Second pulse: the second arms",
     "④ คลื่นลูกที่ 2 ลง (วงแหวนขยายออก)\n"
     "แขนชุดที่ 2 โผล่รอบสนาม",
     "④ The second pulse goes off (the ring grows)\n"
     "The second set of arms appears",
     strict=False, pic="03/transition_04.jpg", scene=board(sh, wm=False))

NP5 = [(36, 17), (38.5, 18.5), (62, 17), (64.5, 18.5)]
PU5 = [(19, 50), (81, 50), (28, 76), (72, 76)]
sh = [donut((50, 50), 44, 30, CY, 0.4)] + arms(ARM1) + arms(ARM2) + players(NP5, PU5)
for a, b in zip(NP[::2] + PU, NP5[::2] + PU5):
    sh.append(arrow(a, towards(a, b, 0.85), "#ffffff", 0.4))
step(P3, TS, "⑤ คลื่นลูกที่ 3: หลบเข้าด้านใน", "⑤ Third pulse: step in",
     "⑤ คลื่นลูกที่ 3 ลง: ขยับเข้าด้านในให้พ้นวงแหวน\n"
     "ระวัง: ขอบ AoE ของ Wave Repeater ไม่ตรงกับวงบนพื้น",
     "⑤ The third pulse goes off: move in, clear of the ring\n"
     "Note: Wave Repeater's edges do not follow the rings on the floor",
     strict=False, pic="03/transition_05.jpg", scene=board(sh, wm=False))

sh = [donut((50, 50), 49, 44, CY, 0.4)] + arms(ARM1) + arms(ARM2) + aoe((50, 50), 13, CY, 0.0) + players(NP5, PU5)
step(P3, TS, "⑥ คลื่นลูกที่ 4: เข้าที่รอรอบ 2", "⑥ Fourth pulse: set for the second wave",
     "⑥ คลื่นลูกที่ 4 ลง (วงนอกสุด)\n"
     "ตอนนี้ทุกคนควรอยู่ในจุดสำหรับคลื่นรอบที่ 2 แล้ว",
     "⑥ The fourth pulse goes off (the outermost ring)\n"
     "Everyone should now be in place for the second wave",
     strict=False, pic="03/transition_06.jpg", scene=board(sh, wm=False))

sh = aoe((50, 50), 13, CY, 0.4) + arms(ARM1) + arms(ARM2) + players()
step(P3, TS, "⑦ รอบที่ 2: คลื่นลูกแรก", "⑦ Second wave: first pulse",
     "⑦ คลื่นลูกแรกของรอบที่ 2 ลง\n"
     "กลับไปยืนจุดเดิมที่ขอบสนาม",
     "⑦ The first pulse of the second wave goes off\n"
     "Back to your spot at the edge",
     strict=False, pic="03/transition_07.jpg", scene=board(sh, wm=False))

sh = [donut((50, 50), 30, 13, CY, 0.4)] + [ring((50, 50), 30, CY, 0.35)]
for a in ARM1:
    sh += aoe(P(a, 14.5), 20, "#e9a57d", 0.38)
sh += arms(ARM1) + arms(ARM2) + players()
step(P3, TS, "⑧ แขนชุดแรกแสดง AoE", "⑧ The first arms telegraph",
     "⑧ คลื่นลูกที่ 2 ของรอบที่ 2 ลง\n"
     "แขนชุดแรกแสดงวง AoE รอบตัว",
     "⑧ The second pulse of the second wave goes off\n"
     "The first set of arms telegraphs an AoE around them",
     strict=False, pic="03/transition_08.jpg", scene=board(sh, wm=False))

NP9 = [(30, 22), (32.5, 23.5), (70, 22), (72.5, 23.5)]
PU9 = [(6, 42), (94, 42), (38, 90), (62, 90)]
sh = [donut((50, 50), 44, 30, CY, 0.4)]
for a in ARM1:
    sh += aoe(P(a, 14.5), 20, "#8a5a44", 0.45)
for a in ARM2:
    sh += aoe(P(a, 14.5), 20, CY, 0.3)
sh += arms(ARM1) + arms(ARM2) + players(NP9, PU9)
for a, b in zip(NP[::2] + PU, NP9[::2] + PU9):
    sh.append(arrow(a, towards(a, b, 0.8), "#ffffff", 0.4))
step(P3, TS, "⑨ เข้าจุดตัดของคลื่นกับวงแขนชุดแรก", "⑨ Into where the pulse meets the first arms' AoE",
     "⑨ คลื่นลูกที่ 3 ของรอบที่ 2 ลง\n"
     "แขนชุดแรกระเบิด ขณะที่แขนชุดที่ 2 แสดงวงของตัวเอง\n"
     "เดินเข้าไปยืนในจุดที่คลื่นกับวง AoE ของแขนชุดแรกซ้อนกัน (ลงไปแล้ว) จะไม่โดนแขนชุดที่ 2",
     "⑨ The third pulse of the second wave goes off\n"
     "The first arms explode while the second arms telegraph theirs\n"
     "Move into where the expanding pulse and the first arms' AoE overlap (already gone off), so the second arms miss you",
     strict=False, pic="03/transition_09.jpg", scene=board(sh, wm=False))

sh = [donut((50, 50), 49, 44, CY, 0.4)]
for a in ARM2:
    sh += aoe(P(a, 14.5), 20, CY, 0.42)
for c in PU9:
    sh += aoe(c, 9, "#c08af0", 0.4)
sh += aoe((31.5, 23), 6.5, "#ffffff", 0.3) + aoe((71.5, 23), 6.5, "#ffffff", 0.3) + arms(ARM2) + players(NP9, PU9)
step(P3, TS, "⑩ debuff ลงพร้อมแขนชุดที่ 2", "⑩ Debuffs go off with the second arms",
     "⑩ debuff ของผู้เล่นลงพร้อม AoE ของแขนชุดที่ 2\n"
     "คู่ stack แชร์กันคู่ละ 1 วง / Sniper ยืนห่างกันไม่ให้วงทับคนอื่น",
     "⑩ The players' debuffs go off with the second arms' AoEs\n"
     "Each stack pair shares one / Snipers stay apart so no circle catches anyone else",
     strict=False, pic="03/transition_10.jpg", scene=board(sh, wm=False))

# ---------------------------------------------------------------- Hello, World
HW = "Hello, World"
RT, BT = "#b42e2e", "#2c3db3"
GT = "#57d16a"


def towers(red, blue, r=15):
    out = []
    for c in red:
        out += [circle(c, r, RT, 0.6, 0.01), ring(c, r, "#e6a0a0", 0.3, 0.8), dot(c, 2.4, "#ffffff", 0.9)]
    for c in blue:
        out += [circle(c, r, BT, 0.6, 0.01), ring(c, r, "#a0a8e6", 0.3, 0.8), dot(c, 2.4, "#ffffff", 0.9)]
    return out


def tag(c, kind):
    """A small debuff mark beside a player: 'def' Defamation (pink target), 'stk' stack (orange), 'rn' red Nisi, 'bn' blue Nisi."""
    x, y = c[0] + 3.6, c[1] - 3.6
    if kind == "def":
        return [dot((x, y), 1.5, "#ff5fa8"), ring((x, y), 1.5, "#ffe2f0", 0.25)]
    if kind == "stk":
        return [dot((x, y), 1.5, "#ffb24d"), ring((x, y), 1.5, "#fff0d0", 0.25)]
    if kind == "rn":
        return [dot((x + 3.2, y), 1.3, "#ff3b3b")]
    if kind == "bn":
        return [dot((x + 3.2, y), 1.3, "#4d7bff")]
    return []


step(P3, HW, "debuff ของ Hello, World ① (สาย / tower)", "The Hello, World debuffs ① (tethers / towers)",
     "Hello, World: raid-wide และให้ debuff ทุกคนจำนวนมาก\n\n"
     "Latent Synchronization Bug: 70 วินาที หมดเวลาตาย / ล้างได้ด้วยการโดน Critical Synchronization Bug\n"
     "Local Code Smell → Local Regression (สายแดง-เขียว): หมดเวลาสายจริงขึ้น ต้องเดินเข้าหากันให้สายขาด (raid-wide + Magic Vulnerability Up + Thrice-come Ruin 1 วินาที) / ไม่ขาดก่อนหมดเวลา = wipe\n"
     "Remote Code Smell → Remote Regression (สายฟ้า): ต้องเดินออกห่างกันให้สายขาด / ไม่ขาด = wipe\n"
     "Cascading Latent Defect (tower แดง) / Latent Performance Defect (tower ฟ้า): หมดเวลา wipe / ล้างตอน Nisi สีเดียวกันของคนนั้นหมดเวลาขณะยังรอด จึงต้องมี Nisi สีนั้นก่อนเข้า tower",
     "Hello, World: a raid-wide that gives everyone a lot of debuffs\n\n"
     "Latent Synchronization Bug: 70 s, kills you when it expires / cleansed by taking a Critical Synchronization Bug\n"
     "Local Code Smell → Local Regression (red/green tether): when it activates, move together to break it (raid-wide + Magic Vulnerability Up + a 1 s Thrice-come Ruin) / not broken in time = wipe\n"
     "Remote Code Smell → Remote Regression (blue tether): move apart to break it / not broken = wipe\n"
     "Cascading Latent Defect (red tower) / Latent Performance Defect (blue tower): wipe when they expire / cleansed when that player's same-colour Nisi expires while alive, so you need that Nisi before the tower",
     strict=False,
     refs=[FR("hello-world", "nin", 330, "Hello, World: tower สีขึ้นรอบสนาม ดูว่า Defamation คู่กับ Nisi สีไหน", "Hello, World: coloured towers around the arena; check which Nisi colour the Defamations have")])

step(P3, HW, "debuff ของ Hello, World ② (Bug)", "The Hello, World debuffs ② (the Bugs)",
     "Critical Overflow Bug ('Defamation'): AoE ใหญ่เกือบเท่าสนาม คนโดนได้ Overflow ต่อ / จบแล้วได้ Overflow Debugger กันได้ 1 ครั้ง\n"
     "Critical Synchronization Bug: AoE ขนาด tower หารดาเมจ ให้แชร์กับอีก 1 คน / จบแล้วได้ Synchronization Debugger\n"
     "Critical Underflow Bug (Nisi แดง) / Critical Performance Bug (Nisi ฟ้า): 27 วินาที ส่งต่อได้ด้วยการเดินชน (ทับ Nisi อีกสีได้ ถ้าคนรับไม่มี Debugger สีนั้น) / หมดเวลาเกิด AoE ขนาด tower ฆ่าคนอื่นที่โดน และได้ Debugger\n"
     "debuff ชื่อ Code Smell (Overflow / Synchronization / Underflow / Performance) คือช่วงรอ 3 วินาที ก่อนกลายเป็น Bug",
     "Critical Overflow Bug ('Defamation'): a huge AoE about the arena's size; anyone hit gets a fresh one / then Overflow Debugger blocks the next one\n"
     "Critical Synchronization Bug: a tower-sized shared AoE, share it with one other player / then Synchronization Debugger\n"
     "Critical Underflow Bug (red Nisi) / Critical Performance Bug (blue Nisi): 27 s, passed by touching (overwrites the other colour unless the receiver has that Debugger) / when it expires, a tower-sized AoE kills anyone else hit, and you get the Debugger\n"
     "Each 'Code Smell' debuff is a 3 s grace period before it becomes the Bug",
     strict=False)

FORM = [("ฟ้าคือ Defamation", "\"Blue is Defamation\"", "03/hello_world_0_0a.jpg",
         dict(D4=(34, 21), D1=(44, 24), MT=(55, 24), D3=(66, 21), H1=(17, 55), D2=(83, 55), ST=(20, 84), H2=(80, 84)),
         [(25, 33), (75, 33)], [(25, 79), (75, 79)], "Critical Overflow คู่กับ Critical Performance (Nisi ฟ้า)", "Critical Overflow has Critical Performance (blue Nisi)"),
        ("แดงคือ Defamation", "\"Red is Defamation\"", "03/hello_world_0_0b.jpg",
         dict(ST=(20, 20), H2=(80, 20), H1=(17, 42), D2=(83, 42), D4=(34, 79), D1=(44, 76), MT=(55, 76), D3=(66, 79)),
         [(25, 25), (75, 25)], [(25, 71), (75, 71)], "Critical Overflow คู่กับ Critical Underflow (Nisi แดง)", "Critical Overflow has Critical Underflow (red Nisi)")]
for i, (th, en, pic, pos, red, blue, wth, wen) in enumerate(FORM):
    sh = towers(red, blue) + [line(pos["H1"], pos["D2"], GT, 0.7, 0.8), line(pos["H1"], pos["D2"], "#ff5a5a", 0.25, 0.9),
                              line(pos["D1"], pos["MT"], BLUE_T, 0.6, 0.9)]
    for k in ("ST", "H2"):
        sh += tag(pos[k], "def") + tag(pos[k], "bn" if i == 0 else "rn")
    for k in ("D4", "D3"):
        sh += tag(pos[k], "stk") + tag(pos[k], "rn" if i == 0 else "bn")
    note = ("สิ่งที่ต้องดูมีแค่ 2 อย่าง:\n"
            "Rule 1: Nisi สีไหน (Performance / Underflow) คู่กับ Critical Overflow และ Critical Synchronization: รู้ตอน debuff ขึ้น และเหมือนเดิมทั้งเฟส\n"
            "Rule 2: ตอนนี้เราถือ debuff อะไรในวงจร (สาย Local / Remote Regression หรือ Nisi ตัว Overflow / Synchronization)\n\n"
            "ไปที่ไหนในแต่ละรอบ:\n"
            "Critical Overflow (Defamation): เข้า tower สีของตัวเองเสมอ ยืนค่อนไปด้านนอก\n"
            "Critical Synchronization: เข้า tower สีของตัวเองเสมอ ยืนค่อนเข้าด้านใน\n"
            "สายแดง-เขียว: ดึงสายให้ตึง ยืนข้าง Critical Overflow\n"
            "สายฟ้า: ยืนระหว่างคน Critical Synchronization\n\n"
            f"ภาพนี้: '{th}' = {wth} (ฟ้า/แดงคือ tower ที่ Defamation เข้า)")
    note_en = ("Only two things matter:\n"
               "Rule 1: which Nisi colour (Performance / Underflow) goes with Critical Overflow and with Critical Synchronization: set when the debuffs appear, fixed for the whole phase\n"
               "Rule 2: which debuff you hold right now in the cycle (a Local / Remote Regression tether, or an Overflow / Synchronization Nisi)\n\n"
               "Where everyone goes each loop:\n"
               "Critical Overflow (Defamation): always your coloured tower, towards the outside\n"
               "Critical Synchronization: always your coloured tower, towards the inside\n"
               "Red/green tether: stretch it and stand beside the Critical Overflows\n"
               "Blue tether: stand between the Critical Synchronizations\n\n"
               f"This picture: {en} = {wen}")
    step(P3, HW, f"รูปแบบ: {th}", f"Formation: {en}", note, note_en, strict=False, pic=pic, scene=board(sh, wm=False, roles=roles(**pos)))

CYCLE = board([text((27, 24), "Local Regression", 3.6, "#9be8a8"), arrow((44, 24), (56, 24)), text((73, 24), "Critical Overflow", 3.6, "#ffb1d8"),
               arrow((73, 32), (73, 66)), text((73, 76), "Remote Regression", 3.6, "#9ccaff"), arrow((56, 76), (44, 76)),
               text((27, 76), "Critical Sync", 3.6, "#ffd0a0"), arrow((27, 66), (27, 32))], wm=False, tick=0, arena=None)
step(P3, HW, "ลำดับในแต่ละรอบ", "Each loop's sequence",
     "ลำดับ Hello, World:\n"
     "1. หันตาม tower สี\n"
     "2. จับคู่: Critical Overflow คู่กับสายแดง-เขียว (Local Regression) / Critical Synchronization คู่กับสายฟ้า (Remote Regression)\n"
     "3. Critical Overflow และ Critical Synchronization ลง (ทุกคนโดนดาเมจ)\n"
     "4. ส่ง Nisi แดง (Underflow) และ Nisi ฟ้า (Performance) ภายใน 3 วินาทีถัดมา: คนถือสายเดินไปหาคนถือ Nisi\n"
     "5. ทำสายฟ้าขาด (เดินออกห่าง: ขาดเองตอนไปรับ Nisi)\n"
     "6. ทำสายแดง-เขียวขาด (เดินเข้าหากัน)\n"
     "7. วนซ้ำด้วย debuff ถัดไปในวงจร\n"
     "วงจรของแต่ละคน (ภาพ): สายแดง-เขียว > Critical Overflow > สายฟ้า > Critical Synchronization > วนกลับ\n"
     "วน 4 รอบ ทุกคนได้ทำทุกหน้าที่ / รอบสุดท้ายต่างนิดหน่อย (ดูขั้นรอบที่ 4)\n\n"
     "ส่ง Nisi ช้าเกินช่อง 3-4 วินาทีหลัง tower ลง Nisi จะหมดไม่ทันล้าง Defect ของ tower ถัดไป (tower ลง T+0 / tower ถัดไป T+21 / Defect ระเบิด T+31 / Nisi 27 วินาที)",
     "The Hello, World sequence:\n"
     "1. Orient to the coloured towers\n"
     "2. Pair up: Critical Overflow with the red/green tether (Local Regression) / Critical Synchronization with the blue tether (Remote Regression)\n"
     "3. Critical Overflow and Critical Synchronization resolve (everyone takes damage)\n"
     "4. Pass the red Nisi (Underflow) and blue Nisi (Performance) within the next 3 seconds: tether players walk to the Nisi holders\n"
     "5. Break the blue tethers (move apart; it breaks naturally when picking up a Nisi)\n"
     "6. Break the red/green tethers (move together)\n"
     "7. Repeat with the next debuff in the cycle\n"
     "Each player's cycle (the picture): red/green tether > Critical Overflow > blue tether > Critical Synchronization > back again\n"
     "Four loops, so everyone does every role / the last loop is slightly different (see the fourth loop)\n\n"
     "Pass a Nisi later than 3-4 s after the towers and it won't expire in time to cleanse the next tower's Defect (towers T+0 / next towers T+21 / Defects T+31 / Nisi lasts 27 s)",
     strict=False, pic="03/hello_world_cycle.jpg", scene=CYCLE)

step(P3, HW, "mitigate ของ Hello, World", "Hello, World mitigation",
     "mitigate: ต่อรอบต้องมี 3 อย่าง (barrier นับ) จึงรอดโดยไม่ต้อง heal ระหว่างทาง:\n"
     "Hello, World: MT Reprisal, D1, D4\n"
     "รอบที่ 1: MT 90s, ST Reprisal (WAR / PLD ใช้ 90s เร็วได้ เพื่อได้อีกครั้งที่ Critical Error)\n"
     "รอบที่ 2: H1 120s, H2 120s\n"
     "รอบที่ 3: MT Reprisal, ST 90s\n"
     "รอบที่ 4: ST Reprisal, D3\n"
     "Critical Error: D1, D4 + H2 30s หรือ H2 90s\n"
     "ทุกรอบ heal ให้เต็ม + Healer เสริมอีกอย่าง (Succor / Eukrasian Prognosis, Sacred Soil / Kerachole, Liturgy of the Bell / Macrocosmos)\n"
     "Tank mitigate auto-attack ระหว่างรอบ / สลับ Tank ช่วง tower ชุดที่ 3 เพื่อหมุนคูลดาวน์",
     "Mitigation: each loop needs three pieces (shields count) to survive without healing in between:\n"
     "Hello, World: MT Reprisal, D1, D4\n"
     "Loop 1: MT 90s, ST Reprisal (a WAR / PLD can use it early to get another at Critical Error)\n"
     "Loop 2: H1 120s, H2 120s\n"
     "Loop 3: MT Reprisal, ST 90s\n"
     "Loop 4: ST Reprisal, D3\n"
     "Critical Error: D1, D4 + H2 30s or H2 90s\n"
     "Top the party each loop + one more healer tool (Succor / Eukrasian Prognosis, Sacred Soil / Kerachole, Liturgy of the Bell / Macrocosmos)\n"
     "Tanks mitigate the auto-attacks between loops / swap tanks around the third towers to cycle cooldowns",
     strict=False)

TRB = target_ring((50, 50), 29, face=0, gap=80)
P01 = dict(MT=(48, 23), D3=(27, 35), D4=(72, 35), H1=(22, 50), H2=(78, 47), D1=(27, 67), D2=(70, 67), ST=(48, 80))
sh = TRB + [line(P01["D3"], P01["D4"], GT, 0.7, 0.8), line(P01["H2"], P01["ST"], BLUE_T, 0.6, 0.9)]
sh += tag(P01["H1"], "def") + tag(P01["H1"], "bn") + tag(P01["D2"], "def") + tag(P01["D2"], "bn") + tag(P01["MT"], "stk") + tag(P01["MT"], "rn") + tag(P01["D1"], "stk") + tag(P01["D1"], "rn")
step(P3, HW, "① กระจายตัว ดูว่าสีไหนคู่กับอะไร", "① Spread; check which colour goes with what",
     "① กระจายตัวตอน Omega ร่าย Hello, World แจก debuff\n"
     "ดูว่า debuff สีไหนอยู่กับ Critical Overflow Bug และ Critical Synchronization Bug\n\n"
     "ตัวอย่างในภาพ:\n"
     "Critical Overflow (H1, D2) เริ่มด้วย Nisi ฟ้า: ไป tower ฟ้า / สายแดง-เขียว (D3, D4) ตาม Critical Overflow ไป tower ฟ้า\n"
     "Critical Synchronization (MT, D1) เริ่มด้วย Nisi แดง: ไป tower แดง / สายฟ้า (H2, ST) ตามไป tower แดง",
     "① Spread while Omega casts Hello, World and hands out the debuffs\n"
     "Check which colour goes with Critical Overflow Bug and with Critical Synchronization Bug\n\n"
     "In the example:\n"
     "Critical Overflow (H1, D2) starts with the blue Nisi: blue towers / the red/green tethers (D3, D4) follow them to the blue towers\n"
     "Critical Synchronization (MT, D1) starts with the red Nisi: red towers / the blue tethers (H2, ST) follow them to the red towers",
     strict=False, pic="03/hello_world_0_1.jpg", scene=board(sh, wm=False, boss=(50, 50), roles=roles(**P01)))

P02 = dict(MT=(53, 26), D3=(43, 40), D4=(56, 40), ST=(43, 53), H2=(56, 53), D1=(24, 39), H1=(39, 70), D2=(66, 62))
sh = TRB + [line(P02["D3"], P02["D4"], GT, 0.7, 0.8), line(P02["H2"], P02["ST"], BLUE_T, 0.6, 0.9)]
step(P3, HW, "② เตรียมตัว: สายเข้าใน คน Nisi อยู่นอก", "② Preposition: tethers in, Nisis out",
     "② เตรียมตัวก่อน tower ชุดแรก\n"
     "คนถือสาย: เข้าไปใน hitbox ของ Omega\n"
     "คนถือ Nisi (Underflow / Performance): เดินรอบนอก hitbox หาคู่ของตัวเองแล้วยืนข้างกัน",
     "② Preposition for the first towers\n"
     "Tether players: move inside Omega's hitbox\n"
     "Nisi players (Underflow / Performance): go around the outside of the hitbox, find your partner and stand beside them",
     strict=False, pic="03/hello_world_0_2.jpg", scene=board(sh, wm=False, boss=(50, 50), roles=roles(**P02)))

P03 = dict(D2=(50, 11), H1=(10, 50), MT=(86, 55), D1=(62, 80), D4=(52, 37), D3=(38, 47), ST=(62, 47), H2=(49, 59))
sh = towers([(85, 50), (50, 88)], [(50, 15), (15, 50)]) + TRB + [line(P03["D3"], P03["D4"], GT, 0.7, 0.8), line(P03["H2"], P03["ST"], BLUE_T, 0.6, 0.9),
                                                                  arrow((54, 34), (66, 15), "#c8ffb0", 0.4), arrow((36, 51), (18, 68), "#c8ffb0", 0.4),
                                                                  arrow((65, 50), (80, 65), "#c8e8ff", 0.4), arrow((52, 62), (62, 72), "#c8e8ff", 0.4)]
step(P3, HW, "③ tower ขึ้น: คน Nisi ไปก่อน คนถือสายรอ", "③ Towers up: Nisis go first, tethers wait",
     "③ tower ขึ้น: คนถือ Critical Overflow และคนถือ Nisi เดินรอบนอกไป tower ของตัวเอง\n"
     "คนถือสายยังอยู่ในวงเป้าของ Omega หันตัวเตรียมออก\n"
     "คนถือสายรอให้คน Nisi เข้าที่ก่อน แล้วค่อยออก",
     "③ When the towers appear, the Critical Overflow and Nisi players go around the outside to their towers\n"
     "Tether players stay inside Omega's targeting circle, facing the way they will go\n"
     "Tether players wait for the Nisis to be in place before moving out",
     strict=False, pic="03/hello_world_0_3.jpg", scene=board(sh, wm=False, boss=(50, 50), roles=roles(**P03)))

TRB2 = target_ring((50, 50), 29, face=90, gap=80)
RED1, BLUE1 = [(85, 50), (50, 85)], [(50, 15), (15, 50)]
P11 = dict(D2=(48, 9), H1=(8, 52), D4=(67, 13), D3=(10, 72), MT=(81, 62), D1=(60, 79), ST=(78, 71), H2=(68, 83))
sh = towers(RED1, BLUE1) + TRB2 + [line(P11["D4"], P11["D3"], GT, 0.7, 0.8), line(P11["D4"], P11["D3"], "#ff5a5a", 0.25, 0.9),
                                   line(P11["ST"], P11["H2"], BLUE_T, 0.6, 0.9)]
step(P3, HW, "รอบ 1-3 ④: จับคู่แล้วเข้า tower", "Loops 1-3 ④: pair up and take the towers",
     "รอบที่ 1, 2, 3 ทำเหมือนกัน แค่ผลัดกันถือ debuff (ภาพแสดงรอบแรก และแสดงเฉพาะ debuff ที่ใช้)\n\n"
     "④ จับคู่แล้วไป tower\n"
     "Critical Overflow + สายแดง-เขียว ไป tower ของตัวเอง (ภาพ: ฟ้า)\n"
     "Critical Synchronization + สายฟ้า ไป tower ของตัวเอง (ภาพ: แดง)\n\n"
     "สังเกต:\n"
     "สายแดง-เขียวอยู่ด้านนอกของ tower สีของตัวเอง\n"
     "สายฟ้าอยู่ระหว่าง tower สีของตัวเอง\n"
     "Critical Overflow ยืนเลยจุดขาวกลาง tower ออกไปด้านนอกนิดเดียว",
     "Loops 1, 2 and 3 are the same, with everyone taking turns at the debuffs (shown for the first loop, relevant debuffs only)\n\n"
     "④ Pair up and go to your towers\n"
     "Critical Overflow + red/green tether to their towers (blue here)\n"
     "Critical Synchronization + blue tether to their towers (red here)\n\n"
     "Note:\n"
     "The red/green tethers are on the outside of their coloured towers\n"
     "The blue tethers are between their coloured towers\n"
     "The Critical Overflows stand just outside the white centre of their towers",
     strict=False, pic="03/hello_world_1_1.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P11)))

sh = towers(RED1, BLUE1) + TRB2 + aoe(P11["D2"], 40, "#d79ad7", 0.3) + aoe(P11["H1"], 40, "#d79ad7", 0.3) + aoe((79, 66), 11, "#f0e0b0", 0.35) + aoe((63, 81), 11, "#f0e0b0", 0.35)
sh += [line(P11["D4"], P11["D3"], GT, 0.7, 0.9), line(P11["D4"], P11["D3"], "#ff5a5a", 0.3, 0.95), line(P11["ST"], P11["H2"], BLUE_T, 0.7, 0.95)]
step(P3, HW, "⑤ สายจริงขึ้น / tower กับ Bug ลง", "⑤ Tethers activate / towers and Bugs resolve",
     "⑤ สายชุดแรกกลายเป็นสายจริง\n"
     "tower, Critical Overflow และ Critical Synchronization ลง\n"
     "Critical Overflow ส่งต่อไปที่คนถือสายแดง-เขียว\n"
     "Critical Synchronization ส่งต่อไปที่คนถือสายฟ้า",
     "⑤ The first tethers become real\n"
     "The towers, Critical Overflows and Critical Synchronizations resolve\n"
     "Critical Overflow passes to the red/green tether players\n"
     "Critical Synchronization passes to the blue tether players",
     strict=False, pic="03/hello_world_1_2.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P11)))

P13 = dict(D2=(50, 18), D4=(48, 22), H1=(19, 51), D3=(22, 54), ST=(85, 38), MT=(84, 62), D1=(64, 83), H2=(40, 91))
sh = TRB2 + [line(P13["D4"], P13["D3"], GT, 0.7, 0.9), line(P13["D4"], P13["D3"], "#ff5a5a", 0.3, 0.95),
             arrow((80, 62), (84, 44), "#ffffff", 0.4), arrow((63, 82), (45, 90), "#ffffff", 0.4)]
step(P3, HW, "⑥ ส่ง Nisi ที่ marker / สายฟ้าขาด", "⑥ Pass the Nisis at the waymarks / blue tethers break",
     "⑥ รอแป๊บหนึ่ง แล้วส่ง Critical Underflow และ Critical Performance (Nisi)\n"
     "คนที่อยู่ tower ของ Critical Overflow (ภาพ: ฟ้า) ส่ง Nisi กันที่ marker\n"
     "คนถือสายฟ้าเดินออกห่างกันไปรับ Nisi สายฟ้าจึงขาดไปด้วย",
     "⑥ Wait a split second, then pass the Critical Underflow and Critical Performance (Nisis)\n"
     "The players at the Critical Overflow towers (blue here) pass their Nisis at the waymarks\n"
     "The blue-tethered players break their tether as they go",
     strict=False, pic="03/hello_world_1_3.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P13)))

P14 = dict(D2=(47, 16), D4=(34, 33), D3=(36, 37), H1=(15, 52), MT=(73, 56), D1=(58, 77), ST=(80, 30), H2=(46, 92))
sh = TRB2 + aoe(P14["D2"], 12, CY, 0.4) + aoe(P14["H1"], 12, CY, 0.4) + aoe(P14["MT"], 12, "#e39ad0", 0.4) + aoe(P14["D1"], 12, "#e39ad0", 0.4)
sh += [arrow((47, 16), (37, 29), "#ffffff", 0.4), arrow((15, 52), (32, 38), "#ffffff", 0.4)]
step(P3, HW, "⑦ สายแดง-เขียวเดินเข้าหากัน หลบ Nisi ระเบิด", "⑦ Red/green tethers meet; dodge the Nisi blasts",
     "⑦ คนถือสายแดง-เขียวเดินเข้าหากันให้สายขาด\n"
     "หลบวงระเบิดของ Critical Underflow และ Critical Performance\n\n"
     "ทุกคนเปลี่ยนหน้าที่ไปตามวงจร แล้ววนซ้ำ",
     "⑦ The red/green tether players move together to break it\n"
     "Avoid the Critical Underflow and Critical Performance explosions\n\n"
     "Everyone moves on to their next role and the loop repeats",
     strict=False, pic="03/hello_world_1_4.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P14)))

RED4, BLUE4 = [(25, 25), (75, 25)], [(25, 75), (75, 75)]
P41 = dict(D4=(35, 20), D3=(65, 21), D1=(41, 11), MT=(58, 11), H1=(44, 14), D2=(55, 14), ST=(18, 80), H2=(82, 80))
sh = towers(RED4, BLUE4) + target_ring((50, 50), 29, face=180, gap=80) + [line(P41["D1"], P41["MT"], BLUE_T, 0.6, 0.9),
                                                                          line(P41["H1"], P41["D2"], GT, 0.7, 0.8), line(P41["H1"], P41["D2"], "#ff5a5a", 0.25, 0.9)]
step(P3, HW, "รอบที่ 4 ⑧: สายแดง-เขียวไปกับ Synchronization", "Loop 4 ⑧: red/green tethers go with Synchronization",
     "รอบสุดท้ายต่าง 2 อย่าง:\n"
     "Rule 1: คนถือ Local Regression (สายแดง-เขียว) ไปรวมกับ Critical Synchronization แทนการโดน Critical Overflow และทำสายขาดก่อน\n"
     "Rule 2: ไม่ส่ง Critical Underflow / Critical Performance (Nisi) แล้ว\n"
     "ทุกคนมี Debugger ครบแล้ว รับ Nisi ซ้ำไม่ได้: รอบนี้เดินชนกันได้อิสระ\n\n"
     "เหตุผล: Critical Error ตอนจบให้ Critical Overflow ทุกคนใหม่ และ Overflow Debugger กันไว้\n"
     "คนถือสายแดง-เขียวรอบนี้คือคนที่ได้ Critical Overflow ตั้งแต่ tower แรก มี Debugger อยู่แล้ว\n"
     "ถ้าไปยืนกับ Critical Overflow อีก Debugger จะหมดไปตรงนี้ แล้วโดน Critical Overflow จาก Critical Error ซึ่งลงพร้อม Oversampled Wave Cannon จนแก้ไม่ได้\n\n"
     "⑧ จับคู่แล้วไป tower: Critical Synchronization + สายฟ้า + สายแดง-เขียว รวมกันไป tower ของตัวเอง",
     "The last loop has two differences:\n"
     "Rule 1: the Local Regression players (red/green tethers) join the Critical Synchronizations instead of taking Critical Overflow, and break first\n"
     "Rule 2: the Critical Underflow / Critical Performance (Nisis) are not passed\n"
     "Everyone already has every Debugger and can't take a Nisi again: movement is free this time\n\n"
     "Why: Critical Error at the end gives everyone a new Critical Overflow, blocked by Overflow Debugger\n"
     "This loop's red/green players are the ones who had Critical Overflow at the first towers and already hold the Debugger\n"
     "Standing with the Critical Overflows again would use it up here, and Critical Error's Overflow would then go off with Oversampled Wave Cannon and make it impossible\n\n"
     "⑧ Pair up and go: Critical Synchronization + blue tethers + red/green tethers together to their towers",
     strict=False, pic="03/hello_world_4_1.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P41)))

sh = towers(RED4, BLUE4) + target_ring((50, 50), 29, face=180, gap=80) + aoe(P41["ST"], 40, "#d79ad7", 0.28) + aoe(P41["H2"], 40, "#d79ad7", 0.28)
sh += aoe((38, 17), 11, "#f0e0b0", 0.35) + aoe((62, 17), 11, "#f0e0b0", 0.35) + [line(P41["D1"], P41["MT"], BLUE_T, 0.7, 0.95)]
step(P3, HW, "⑨ ชุดสุดท้ายลง สายแดง-เขียวขาดทันที", "⑨ The last set resolves; red/green tethers break at once",
     "⑨ สายชุดสุดท้ายกลายเป็นสายจริง\n"
     "Latent Defect, tower, Critical Overflow และ Critical Synchronization ลง\n"
     "สายแดง-เขียวควรขาดทันที: ถ้ายังไม่ขาด เดินเข้าหากันให้ขาด",
     "⑨ The last tethers become real\n"
     "Latent Defect, the towers, Critical Overflows and Critical Synchronizations resolve\n"
     "The red/green tethers should break at once; break them if they haven't",
     strict=False, pic="03/hello_world_4_2.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P41)))

P43 = dict(D4=(31, 19), D3=(69, 19), H1=(45, 42), D2=(54, 42), D1=(31, 47), MT=(69, 47), ST=(14, 82), H2=(86, 82))
sh = target_ring((50, 50), 29, face=90, gap=80) + [arrow((41, 14), (33, 40), "#ffffff", 0.4), arrow((50, 14), (50, 38), "#ffffff", 0.4), arrow((58, 14), (66, 40), "#ffffff", 0.4)]
step(P3, HW, "⑩ ห้ามส่ง Nisi / สายฟ้าขาด", "⑩ Don't pass the Nisis / break the blue tethers",
     "⑩ ห้ามส่ง Critical Underflow และ Critical Performance (Nisi)\n"
     "คนถือสายฟ้าเดินออกห่างกันให้สายขาด",
     "⑩ Do not pass Critical Underflow and Critical Performance (the Nisis)\n"
     "The blue-tethered players break their tether",
     strict=False, pic="03/hello_world_4_3.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P43)))

sh = target_ring((50, 50), 29, face=90, gap=80) + aoe(P43["D4"], 12, "#e39ad0", 0.4) + aoe(P43["D3"], 12, "#e39ad0", 0.4) + aoe(P43["ST"], 12, CY, 0.4) + aoe(P43["H2"], 12, CY, 0.4)
step(P3, HW, "⑪ หลบระเบิด Nisi", "⑪ Dodge the Nisi blasts",
     "⑪ หลบวงระเบิดของ Critical Underflow และ Critical Performance",
     "⑪ Avoid the Critical Underflow and Critical Performance explosions",
     strict=False, pic="03/hello_world_4_4.jpg", scene=board(sh, wm=True, boss=(50, 50), roles=roles(**P43)))

step(P3, "Critical Error", "Critical Error: raid-wide หนัก", "Critical Error: a heavy raid-wide",
     "⑫ ทุกคนแก้ debuff ครบ ไม่มี Bug เหลือ\n"
     "Omega ร่าย Critical Error: raid-wide หนัก และให้ Critical Overflow Bug ทุกคนใหม่ ซึ่ง Overflow Debugger ของทุกคนกันไว้\n"
     "mitigate: D1, D4 + H2 30s หรือ H2 90s / mitigate เสริม (Magick Barrier, Passage of Arms ฯลฯ) ใช้ตรงนี้\n\n"
     "ระวัง: ใครตายแล้วถูกชุบ จะเสีย Overflow Debugger ได้ Critical Overflow ใหม่จาก Critical Error ซึ่งระเบิดพร้อม Oversampled Wave Cannon 21 วินาทีถัดมา",
     "⑫ Everyone has resolved their debuffs; no Bugs left\n"
     "Omega casts Critical Error: a heavy raid-wide that also gives everyone a fresh Critical Overflow Bug, blocked by everyone's Overflow Debugger\n"
     "Mitigation: D1, D4 + H2 30s or H2 90s / extras (Magick Barrier, Passage of Arms...) go here\n\n"
     "Careful: anyone who died and was raised has lost the Debugger and gets a fresh Critical Overflow, which goes off with Oversampled Wave Cannon 21 seconds later",
     strict=False, pic="03/hello_world_4_5.jpg",
     scene=board(target_ring((50, 50), 29, face=0, gap=80), wm=True, boss=(50, 50),
                 roles=roles(MT=(50, 36), H1=(44, 46), H2=(56, 44), ST=(51, 50), D1=(46, 55), D2=(51, 56), D3=(47, 60), D4=(52, 61))))

# ---------------------------------------------------------------- Oversampled Wave Cannon
OW = "Oversampled Wave Cannon"
TRM = target_ring((50, 50), 29, face=0, gap=80)
LM = roles(H1=(50, 12), H2=(50, 25), MT=(50, 37), ST=(50, 50), D1=(50, 63), D2=(50, 75), D3=(50, 87.5), D4=(50, 96))
step(P3, OW, "① เรียงแถวเหนือลงใต้", "① Line up north to south",
     "Omega วาร์ปมากลางแล้วหันเหนือ\n"
     "monitor ขึ้นที่ข้างซ้ายหรือขวาของ Omega และของผู้เล่น 3 คนแบบสุ่ม\n"
     "monitor แต่ละอัน (Omega + ผู้เล่น 3 คน) ยิงใส่ 2 คนแบบสุ่มที่อยู่ฝั่ง monitor ถ้าฝั่งนั้นมีคนไม่ถึง 2 จะสุ่มคนจากที่ไหนก็ได้แทน\n"
     "ต้องจัดให้ทุก monitor โดนพอดีอันละ 2 คน\n\n"
     "PF ใช้แผนของ Astoh แต่เรียงคนต่างไป\n"
     "① เรียงแถวจากเหนือลงใต้: H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
     "(Healer อยู่เหนือสุด: ปกติปลายทั้ง 2 ข้างจะเป็นสาย Range ยืนถึงขอบสนามได้ เผื่อที่ให้คนอื่น / แย่สุด Melee อาจต้องห่างบอส แต่โอกาสน้อย)",
     "Omega teleports to the middle and faces north\n"
     "Monitors appear on Omega's left or right side, and on three random players'\n"
     "Each monitor (Omega + three players) hits two random players on its side; with fewer than two there, a random player anywhere is picked instead\n"
     "Arrange the party so every monitor hits exactly two\n\n"
     "PF uses Astoh's strat with a different line-up\n"
     "① Line up north to south: H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
     "(Healers north: usually both ends are ranged, who can go right to the edge and give everyone room / at worst a melee loses uptime, but that's rare)",
     strict=True, pic="03/monitors_01.jpg", scene=board(TRM, wm=True, boss=(50, 50), roles=LM))


def mon_scene(west):
    s = -1 if west else 1
    NM = [(50, 14), (50 + s * 6, 50), (50 + s * 34, 50), (50, 72), (50, 90)]
    MO = [(50 - s * 22, 21), (50 - s * 33, 38), (50 - s * 33, 62)]
    sh = TRM + [beam((50, 50), (50 + s * 47, 50), 13, CY, 0.33)]
    sh += aoe(NM[0], 9, "#7fd67f", 0.3) + aoe(MO[0], 9, "#7fd67f", 0.3) + aoe(MO[1], 9, "#ef8f8f", 0.3) + aoe(MO[2], 9, "#ef8f8f", 0.3)
    sh += aoe(NM[3], 9, "#b48fe0", 0.3) + aoe(NM[4], 9, "#b48fe0", 0.3) + aoe(NM[1], 9, CY, 0.25) + aoe(NM[2], 9, CY, 0.25)
    sh += [arrow(MO[0], (MO[0][0] - s * 11, MO[0][1]), "#ef8f8f", 1.0), arrow(MO[1], (MO[1][0], MO[1][1] - 10), "#7fd67f", 1.0),
           arrow(MO[2], (MO[2][0], MO[2][1] + 10), "#b48fe0", 1.0)]
    for i, c in enumerate(NM):
        sh += pl(c, str(i + 1), "#f0c040", 2.6, "#1d1d1d", 2.8)
    for i, c in enumerate(MO):
        sh += pl(c, str(i + 1), "#c48ef0", 2.6, "#1d1d1d", 2.8)
    return sh


for west, pic, th, en in ((True, "03/monitors_02a.jpg", "monitor ของ Omega หันตะวันตก", "Omega's monitors face west"),
                          (False, "03/monitors_02b.jpg", "monitor ของ Omega หันตะวันออก", "Omega's monitors face east")):
    step(P3, OW, f"② {th}", f"② {en}",
         "② Omega เตรียม Oversampled Wave Cannon หันไปตะวันออกหรือตะวันตกตรงๆ / ผู้เล่น 3 คนได้ monitor ของตัวเอง\n"
         "คนมี monitor ทั้ง 3 ไปอยู่ฝั่งตรงข้ามกับ monitor ของ Omega\n"
         "เลข (จุดม่วง) = คนมี monitor 1-3 / เลข (จุดเหลือง) = คนไม่มี monitor 1-5 นับจากเหนือตามแถว\n"
         "macro: ภาพ monitor ของ Omega หันตะวันออก ถ้าหันตะวันตก กลับซ้ายขวา\n\n"
         "จุดยืนไม่ต้องเป๊ะ ขอแค่:\n"
         "ยืนห่างกันพอไม่โดนของคนอื่น\n"
         "ทุก monitor โดนถูก 2 คน: คนมี monitor ต้องมองเห็น 2 คนที่ต้องยิงใส่\n\n"
         "พลาดบ่อย: ยิงโดนคนไม่มี monitor เลข 3\n"
         "คนมี monitor เลข 2 กับ 3 หันเฉียงขึ้น / ลงเล็กน้อย (ไม่หันแนวนอนตรงๆ)\n"
         "คนไม่มี monitor เลข 2 ยืนเยื้องจากกลางเล็กน้อย\n"
         "คนไม่มี monitor เลข 3 ยิ่งใกล้กลางได้ ยิ่งไม่ค่อยโดนลูกหลง\n"
         "คนไม่มี monitor ขยับตามคนมี monitor ง่ายกว่า\n\n"
         "จากนั้น Omega ร่าย Ion Efflux เป็น enrage ของเฟส",
         "② Omega readies Oversampled Wave Cannon facing straight east or west / three players get their own monitors\n"
         "All three monitor players go to the side opposite Omega's monitors\n"
         "Purple numbers = monitor players 1-3 / yellow = non-monitor players 1-5, counted from the north of the line\n"
         "Macro: drawn with Omega's monitors facing east; flip it if they face west\n\n"
         "Positions aren't strict, as long as:\n"
         "Everyone is spread enough not to clip each other\n"
         "Each monitor hits the right two: a monitor player should be able to see the two they must hit\n\n"
         "A common error is clipping non-monitor 3\n"
         "Monitor players 2 and 3 angle slightly up / down (not straight across)\n"
         "Non-monitor 2 stands slightly off the centre\n"
         "The closer non-monitor 3 can be to the centre, the less chance they get clipped\n"
         "It's far easier for the non-monitor players to adjust to the monitor players\n\n"
         "Then Omega casts Ion Efflux, the phase's hard enrage",
         strict=False, pic=pic, scene=board(mon_scene(west), wm=True, boss=(50, 50)),
         refs=[FR("oversampled", "nin", 445, "Oversampled Wave Cannon: monitor ข้างตัวบอกว่าจะยิงไปฝั่งไหน", "Oversampled Wave Cannon: the monitor at the side shows which way it fires")] if west else None)
