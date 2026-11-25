"""Builds scripts/guides/data/ex1-valigarmanda.json."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex1"
sys.path.insert(0, HERE + "/tools")
from scenes import *  # noqa

OUT = r"scripts/guides/data/ex1-valigarmanda.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"

P0, P0E = "เตรียมตัว", "Setup"
P1, P1E = "ช่วงแรก (ไฟ)", "First half (fire)"
P2, P2E = "ช่วงสายฟ้า", "Lightning phase"
P3, P3E = "ช่วงน้ำแข็ง", "Ice phase"
P4, P4E = "ช่วงสุดท้าย", "Final phase"

steps = []

def step(phase, phase_en, mech, name, name_en, note, note_en, strict=False, scene=None, game8=None,
         says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase, "mech": mech, "name": name, "note": note, "strict": strict}
    if says: s["says"] = says
    if game8: s["game8"] = [game8]
    if refs: s["refs"] = [{"src": r[0], "say": r[1]} for r in refs]
    if scene is not None: s["scene"] = scene
    en = {"phase": phase_en, "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en: en["says"] = says_en
    if refs: en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)

# ======================================================================= setup
step(P0, P0E, "Waymarks", "Marker", "Waymarks",
     "Marker แบบ Nukemaru (ไม่ใช่ 8 ทิศมาตรฐาน):\n"
     "A กับ 1 ฝั่งตะวันตกเฉียงเหนือ\n"
     "B กับ 2 ฝั่งตะวันออกเฉียงเหนือ\n"
     "4 ตะวันตกเฉียงใต้\n"
     "3 ตะวันออกเฉียงใต้\n"
     "D ขอบตะวันตก\n"
     "C ขอบตะวันออก\n\n"
     "1 2 3 4 = จุด stack คู่\n"
     "A B = จุดเริ่มของ Spikesicle และจุดปลอดภัยตอนลูกน้ำแข็งระเบิดในช่วงน้ำแข็ง",
     "Nukemaru's waymarks (not the standard 8 directions):\n"
     "A and 1 on the north-west side\n"
     "B and 2 on the north-east side\n"
     "4 south-west\n"
     "3 south-east\n"
     "D on the west edge\n"
     "C on the east edge\n\n"
     "1 2 3 4 = pair-stack spots\n"
     "A B = Spikesicle start spots, and the safe spots when the ice orbs burst in the ice phase",
     strict=False, scene=waymarks(), game8=G8(10207744, "71dc7dfa46f6ce8eb02be5802fe4d165.png"),
     refs=[("https://xivjpraids.com/images/7.0_dawntrail/valigarmanda/markers.jpg",
            "Marker ในเกม มองจากฝั่งใต้ไปทางเหนือ บอสอยู่หลังสนาม (ภาพจาก xivjpraids.com)",
            "The waymarks in game, looking north from the south side, the boss behind the arena (picture from xivjpraids.com)")])

# ======================================================================= fire phase
step(P1, P1E, "Spikesicle", "เส้นโค้ง แล้วน้ำแข็งระเบิด", "Curved lines, then the ice bursts",
     "มีเส้นโค้งเตือนขึ้นก่อน แล้ว AoE ออกตามเส้นโค้งนั้น\n"
     "จากนั้นน้ำแข็งถูกวางไว้ แล้วระเบิดเป็น AoE วงกลม\n\n"
     "จุดเริ่ม:\n"
     "เส้นเตือนขึ้นจากซ้ายไปขวา → เริ่มที่หน้า A\n"
     "เส้นเตือนขึ้นจากขวาไปซ้าย → เริ่มที่หน้า B\n\n"
     "จุดปลอดภัยจาก AoE วงกลม: ด้านในวงเป้า (target circle) ของบอส ตรงกลาง",
     "A curved telegraph appears first, then a curved AoE goes off along it\n"
     "Then ice is placed, and it bursts as circle AoEs\n\n"
     "Where to start:\n"
     "Telegraph appears left to right → start in front of A\n"
     "Telegraph appears right to left → start in front of B\n\n"
     "Safe from the circle AoEs: inside the boss's target circle, at its middle")

step(P1, P1E, "Skyruin", "raid-wide + เปลี่ยนธาตุ", "Raid-wide + element change",
     "AoE ทั้งปาร์ตี้ (raid-wide) แล้วเข้าช่วงธาตุใหม่\n"
     "ดูธาตุได้จาก effect ที่ขึ้นหน้าบอส: ไฟ / สายฟ้า / น้ำแข็ง\n\n"
     "ครั้งแรกเป็นช่วงไฟเสมอ\n"
     "จบช่วงไฟแล้ว Skyruin จะพาไปช่วงสายฟ้าหรือช่วงน้ำแข็ง",
     "Raid-wide, then a new element phase begins\n"
     "The effect in front of the boss shows which: fire / lightning / ice\n\n"
     "The first one is always fire\n"
     "After the fire phase, Skyruin takes you to the lightning or the ice phase")

step(P1, P1E, "Triscourge", "raid-wide + ดีบัฟทุกคน", "Raid-wide + a debuff on everyone",
     "AoE ทั้งปาร์ตี้ พร้อมติดดีบัฟให้ทุกคน\n"
     "ดีบัฟแต่ละธาตุทำงานต่างกันไปตามช่วง\n\n"
     "ช่วงไฟ:\n"
     "ดีบัฟไฟ = stack 3 ครั้งติด\n"
     "ดีบัฟสายฟ้า = spread\n"
     "ดีบัฟน้ำแข็ง = ขยับตัวตลอด",
     "Raid-wide that also puts a debuff on everyone\n"
     "What each element's debuff does changes with the phase\n\n"
     "Fire phase:\n"
     "Fire debuff = 3 stacks in a row\n"
     "Lightning debuff = spread\n"
     "Ice debuff = keep moving",
     refs=[(G8(10207531, "a42919357c9888bec90092c664af6a9b.png"), "เครื่องหมายสายฟ้าบนหัว (ดีบัฟสายฟ้า)", "Lightning marker over the head (lightning debuff)"),
           (G8(10205774, "2840eb915f41e54af2d8fefa5c7fe25e.png"), "เครื่องหมายน้ำแข็งบนหัว (ดีบัฟน้ำแข็ง)", "Ice marker over the head (ice debuff)")])

step(P1, P1E, "Volcanic Drop", "ภูเขาไฟระเบิด", "The volcano erupts",
     "ขึ้นข้อความว่าภูเขาไฟใกล้ระเบิด\n"
     "ภูเขาไฟฝั่งตะวันออกหรือตะวันตกของสนามระเบิดเป็น AoE วงกลมขนาดใหญ่ ออกห่างจากลูกที่ระเบิด\n\n"
     "หลังวงใหญ่ มี AoE วงกลมเล็กขึ้นใต้เท้าผู้เล่นแบบสุ่ม หลบด้วย",
     "A message says \"A volcanic eruption is imminent...\"\n"
     "The volcano on the east or the west side of the arena erupts as a huge circle AoE; get away from the one erupting\n\n"
     "After the big circle, small circle AoEs appear under random players; dodge those too")

BOSS_MECH = "Strangling Coil / Slithering Strike / Susurrant Breath"
INTRO = ("บอสใช้ AoE ตามท่าที่ทำ พร้อมกันนั้นมี stack 2 คน (Charring Cataclysm) ไปยืนเป็นคู่ตาม macro\n"
         "ครั้งแรกๆ มีข้อความขึ้นกลางจอ ครั้งหลังๆ ไม่มีข้อความแล้ว ต้องดูท่าบอสเอง\n\n")
INTRO_EN = ("The boss uses an AoE that matches its motion, and 2-person stacks (Charring Cataclysm) go off at the same time: stand in your macro pair\n"
            "The first times a message appears mid-screen; later ones have none, so read the boss's motion\n\n")
pair_says = lambda spot: {
    "MT": f"คู่กับ D1 {spot['MT']}", "D1": f"คู่กับ MT {spot['MT']}",
    "ST": f"คู่กับ D2 {spot['ST']}", "D2": f"คู่กับ ST {spot['ST']}",
    "H1": f"คู่กับ D3 {spot['H1']}", "D3": f"คู่กับ H1 {spot['H1']}",
    "H2": f"คู่กับ D4 {spot['H2']}", "D4": f"คู่กับ H2 {spot['H2']}"}
pair_says_en = lambda spot: {
    "MT": f"With D1 {spot['MT']}", "D1": f"With MT {spot['MT']}",
    "ST": f"With D2 {spot['ST']}", "D2": f"With ST {spot['ST']}",
    "H1": f"With D3 {spot['H1']}", "D3": f"With H1 {spot['H1']}",
    "H2": f"With D4 {spot['H2']}", "D4": f"With H2 {spot['H2']}"}

step(P1, P1E, BOSS_MECH, "แบบ 1: ลมรอบตัวบอส → donut", "Pattern 1: wind around the boss → donut",
     INTRO +
     "แบบ 1: บอสพันลมไว้รอบตัวแล้ววนไปรอบๆ (ข้อความ: ลมรวมตัวรอบบอส) → donut ปลอดภัยแค่วงกลางสนาม\n"
     "ยืนเป็นคู่ที่ Marker:\n"
     "MT·D1 → 1\n"
     "ST·D2 → 2\n"
     "H1·D3 → 4\n"
     "H2·D4 → 3",
     INTRO_EN +
     "Pattern 1: the boss wraps itself in wind and circles around (message: \"A tempestuous wind surrounds Valigarmanda...\") → donut; only the middle circle is safe\n"
     "Pairs on the waymarks:\n"
     "MT·D1 → 1\n"
     "ST·D2 → 2\n"
     "H1·D3 → 4\n"
     "H2·D4 → 3",
     strict=True, scene=coil_fire(), game8=G8(10207746, "e325184b10fa7318631377388768c519.png"),
     says=pair_says({"MT": "ที่ Marker 1 (ตะวันตกเฉียงเหนือ)", "ST": "ที่ Marker 2 (ตะวันออกเฉียงเหนือ)",
                     "H1": "ที่ Marker 4 (ตะวันตกเฉียงใต้)", "H2": "ที่ Marker 3 (ตะวันออกเฉียงใต้)"}),
     says_en=pair_says_en({"MT": "at waymark 1 (north-west)", "ST": "at waymark 2 (north-east)",
                           "H1": "at waymark 4 (south-west)", "H2": "at waymark 3 (south-east)"}))

step(P1, P1E, BOSS_MECH, "แบบ 2: แขนบอสเรือง → ครึ่งเหนือโดน", "Pattern 2: arms glow → north half hit",
     "บอสสะสมพลัง แขนทั้งสองข้างเรืองแสง (ข้อความ: บอสกำลังสะสมพลัง) → AoE วงกลมรอบตัวบอส กินครึ่งเหนือของสนาม\n\n"
     "ไปฝั่งใต้ ยืนเป็นคู่เรียงแถวจากตะวันตกไปตะวันออก:\n"
     "H1·D3 > MT·D1 > ST·D2 > H2·D4",
     "The boss gathers strength and both arms glow (message: \"Valigarmanda gathers its strength...\") → circle AoE around the boss covering the north half of the arena\n\n"
     "Go south and stand in pairs in a row, west to east:\n"
     "H1·D3 > MT·D1 > ST·D2 > H2·D4",
     strict=True, scene=strike_fire(), game8=G8(10207743, "4fbf2d12819f0573c084673971429e01.png"),
     says=pair_says({"MT": "แถวใต้ คู่ที่ 2 จากตะวันตก", "ST": "แถวใต้ คู่ที่ 3 จากตะวันตก",
                     "H1": "แถวใต้ คู่แรกฝั่งตะวันตกสุด", "H2": "แถวใต้ คู่สุดท้ายฝั่งตะวันออกสุด"}),
     says_en=pair_says_en({"MT": "south row, 2nd pair from the west", "ST": "south row, 3rd pair from the west",
                           "H1": "south row, westernmost pair", "H2": "south row, easternmost pair"}))

step(P1, P1E, BOSS_MECH, "แบบ 3: ปากบอสเรือง → กรวยกลางสนาม", "Pattern 3: beak glows → cone down the middle",
     "บอสอ้าปาก ปากเรืองแสง (ข้อความ: บอสอัดพลังเวทไว้ในปาก) → AoE กรวยกว้างจากบอส กินกลางสนามเกือบหมด\n\n"
     "หลบไปมุมเหนือ 2 ฝั่ง ยืนเป็นคู่เรียงตามขอบกรวย:\n"
     "ตะวันตกเฉียงเหนือ: MT·D1 ใกล้ยอดกรวย / H1·D3 ถัดออกไปตามขอบ\n"
     "ตะวันออกเฉียงเหนือ: ST·D2 ใกล้ยอดกรวย / H2·D4 ถัดออกไปตามขอบ",
     "The boss opens its beak and it glows (message: \"Blinding energies build within Valigarmanda's wide-open beak...\") → wide cone from the boss covering nearly all of the middle\n\n"
     "Dodge to the two north corners, in pairs along the cone's edges:\n"
     "North-west: MT·D1 near the cone's tip / H1·D3 further out along the edge\n"
     "North-east: ST·D2 near the cone's tip / H2·D4 further out along the edge",
     strict=True, scene=breath_fire(), game8=G8(10207745, "d44e4d12108c5cf3e21038e3f5f52b0c.png"),
     says=pair_says({"MT": "มุมตะวันตกเฉียงเหนือ ใกล้ยอดกรวย", "ST": "มุมตะวันออกเฉียงเหนือ ใกล้ยอดกรวย",
                     "H1": "มุมตะวันตกเฉียงเหนือ ถัดออกไปตามขอบกรวย", "H2": "มุมตะวันออกเฉียงเหนือ ถัดออกไปตามขอบกรวย"}),
     says_en=pair_says_en({"MT": "north-west corner, near the cone's tip", "ST": "north-east corner, near the cone's tip",
                           "H1": "north-west, further out along the cone's edge", "H2": "north-east, further out along the cone's edge"}))

step(P1, P1E, "Scourge of Ice", "ดีบัฟน้ำแข็ง: ขยับตัว", "Ice debuff: keep moving",
     "มีเครื่องหมายน้ำแข็งพร้อมตัวเลขนับถอยหลังขึ้นบนหัว\n"
     "ตอนเลขนับถึง 0 ต้องกำลังขยับตัวอยู่ ถึงจะหลบได้",
     "An ice marker with a countdown appears over the head\n"
     "Be moving when the count reaches 0 to avoid it")

MF_INTRO = ("บอสยิงท่าแรงใส่ tower 6 ครั้ง ด้านหลัง tower (ฝั่งตรงข้ามบอส) เป็นที่ปลอดภัย\n"
            "Tank เข้า tower พร้อมเปิดบัฟลดดาเมจ: ครั้งคี่ MT / ครั้งคู่ ST\n"
            "คนที่เหลือดูตำแหน่งบอส แล้วไปหลบด้านหลัง tower\n\n"
            "ดาเมจใน tower แรงมาก แบ่งบัฟลดดาเมจให้มีบัฟทุกครั้ง\n"
            "จากครั้งที่ 1 ถึงครั้งที่ 3 ใช้เวลาราว 15 วินาที เปิดบัฟลด 40% ตอนเกือบโดน จะคลุมได้ 2 ครั้ง\n\n")
MF_INTRO_EN = ("The boss hits the tower hard 6 times; behind the tower (away from the boss) is safe\n"
               "A tank takes the tower with a mitigation up: odd hits MT / even hits ST\n"
               "Everyone else checks where the boss is and hides behind the tower\n\n"
               "The tower hits are very heavy, so spread your mitigations so every hit has one\n"
               "Hits 1 to 3 take about 15 seconds, so a 40% mitigation used just before a hit covers 2 of them\n\n")
MF_G8 = {1: G8(10208123, "292d59a6369304f81d9bf6a79042c16b.png"), 2: G8(10208122, "a78dea8d027f4c3d66d239c1695c50b6.png"),
         3: G8(10208121, "2694844a15c9e6593eae1706de511f84.png"), 4: G8(10208664, "fae97e35ccdd3103ffe4a3ed72ab5d22.png")}
MF_BOSS = {1: ("ทางเหนือ", "north", "ทางใต้", "south"), 2: ("ตะวันตกเฉียงเหนือ", "north-west", "ตะวันออกเฉียงใต้", "south-east"),
           3: ("ตะวันออกเฉียงเหนือ", "north-east", "ตะวันตกเฉียงใต้", "south-west"), 4: ("ทางเหนือ", "north", "ทางใต้", "south")}
for n, pic in [(1, 1), (2, 2), (3, 3), (4, 4), (5, 3), (6, 2)]:
    tank = "MT" if n % 2 else "ST"
    other = "ST" if tank == "MT" else "MT"
    b = MF_BOSS[pic]
    extra_th = {5: "ครั้งที่ 5 game8 ใช้ภาพเดียวกับครั้งที่ 3\n", 6: "ครั้งที่ 6 game8 ใช้ภาพเดียวกับครั้งที่ 2\n"}.get(n, "")
    extra_en = {5: "For hit 5 game8 shows the same picture as hit 3\n", 6: "For hit 6 game8 shows the same picture as hit 2\n"}.get(n, "")
    step(P1, P1E, "Mountain Fire", f"ครั้งที่ {n}: {tank} เข้า tower", f"Hit {n}: {tank} takes the tower",
         (MF_INTRO if n == 1 else "") + extra_th +
         f"ครั้งที่ {n} ({'คี่' if n % 2 else 'คู่'}): {tank} เข้า tower\n"
         f"ภาพนี้บอสอยู่{b[0]} ที่ปลอดภัยจึงอยู่หลัง tower ไปทาง{b[2]}",
         (MF_INTRO_EN if n == 1 else "") + extra_en +
         f"Hit {n} ({'odd' if n % 2 else 'even'}): {tank} takes the tower\n"
         f"In this picture the boss is to the {b[1]}, so the safe spot is behind the tower, to the {b[3]}",
         strict=[tank], scene=mountain(*MF[pic]), game8=MF_G8[pic],
         says={tank: f"เข้า tower ครั้งที่ {n} พร้อมบัฟลดดาเมจ", other: f"ครั้งนี้หลบหลัง tower ({other} เข้าครั้ง{'คู่' if other == 'ST' else 'คี่'})"},
         says_en={tank: f"Take the tower on hit {n} with a mitigation up", other: f"Hide behind the tower this time ({other} takes the {'even' if other == 'ST' else 'odd'} hits)"})

FS_G8 = {1: G8(10208144, "40ad1c7d641321bade078be33619ec4d.png"), 2: G8(10208145, "cfe853c77527a0416bfe2cb2497abd3f.png"),
         3: G8(10208143, "95186f656d644b307bd659dd3cef6c8b.png"), 4: G8(10208141, "ebab6f2beaddfad319d810b05ec15210.png"),
         5: G8(10208142, "2c3be91fc96242cf682ec43964849a5c.png")}
grp = lambda th_w, th_e: {"MT": th_w, "H1": th_w, "D1": th_w, "D3": th_w, "ST": th_e, "H2": th_e, "D2": th_e, "D4": th_e}

step(P1, P1E, "Scourge of Fire", "① ไปจุดของกลุ่ม", "① Go to your group's spot",
     "stack 3 ครั้งติดที่ Healer\n"
     "ทุกครั้งที่ระเบิดจะทิ้ง AoE ไว้บนพื้น ต้อง stack ไปพลางเดินหน้าไปพลาง\n"
     "หลัง stack ครั้งที่ 3 ดีบัฟน้ำแข็งทำงาน คนที่โดนต้องขยับตัวตลอด\n\n"
     "① มีเครื่องหมายขึ้นบนหัว Healer ก่อนระเบิดให้ไปจุดของกลุ่มตาม macro:\n"
     "กลุ่มตะวันตก (MT H1 D1 D3) ที่ Marker 4\n"
     "กลุ่มตะวันออก (ST H2 D2 D4) ที่ Marker 3",
     "3 stacks in a row on the healers\n"
     "Each one leaves an AoE on the floor, so stack while walking forward\n"
     "After the 3rd stack the ice debuff goes off; whoever has it keeps moving\n\n"
     "① Markers appear over the healers' heads. Before they go off, go to your group's macro spot:\n"
     "West group (MT H1 D1 D3) at waymark 4\n"
     "East group (ST H2 D2 D4) at waymark 3",
     strict=True, scene=fire_stack(1), game8=FS_G8[1],
     says=grp("กลุ่มตะวันตก stack ที่ H1 เริ่มที่ Marker 4", "กลุ่มตะวันออก stack ที่ H2 เริ่มที่ Marker 3"),
     says_en=grp("West group, stack on H1, start at waymark 4", "East group, stack on H2, start at waymark 3"))

step(P1, P1E, "Scourge of Fire", "② stack ครั้งที่ 1 แล้วเดินหน้า", "② 1st stack, then walk forward",
     "stack ครั้งที่ 1 ระเบิด AoE ค้างบนพื้น ให้เดินหน้า (ขึ้นเหนือ) ไปด้วยกันทั้งกลุ่ม\n\n"
     "ท่านี้แรงมาก และต้องเดินไปด้วย เลย heal ยาก\n"
     "Reprisal และท่าลดดาเมจที่ใช้กับบอสไม่มีผล ใช้ท่าลดดาเมจทั้งปาร์ตี้ของ Tank และของ Range แทน\n"
     "ถ้าเปิดตอนช่วงต้นของการร่าย Skyruin ตอนเปิดไฟต์ บัฟลด 90 วินาทีจะกลับมาใช้ได้ตรงนี้พอดี",
     "The 1st stack goes off and leaves an AoE on the floor; walk forward (north) together as a group\n\n"
     "This hits very hard, and you are moving, so it is hard to heal\n"
     "Reprisal and other mitigations used on the boss do nothing here; use the tanks' and the Ranges' party mitigations instead\n"
     "Use them early in the opening Skyruin cast and the 90-second mitigations come back right in time for this",
     strict=True, scene=fire_stack(2), game8=FS_G8[2])

step(P1, P1E, "Scourge of Fire", "③ stack ครั้งที่ 2 เดินหน้าต่อ", "③ 2nd stack, keep walking",
     "stack ครั้งที่ 2 ระเบิด เดินหน้าต่อ\n"
     "AoE ของครั้งแรกยังค้างอยู่ด้านหลัง อย่าถอยกลับไป",
     "The 2nd stack goes off; keep walking forward\n"
     "The 1st AoE is still on the floor behind you; do not step back",
     strict=True, scene=fire_stack(3), game8=FS_G8[3])

step(P1, P1E, "Scourge of Fire", "④ stack ครั้งที่ 3 แล้วแยกซ้ายขวา", "④ 3rd stack, then split left and right",
     "stack ครั้งที่ 3 ระเบิด\n"
     "ระเบิดแล้วแยกออกด้านข้าง:\n"
     "กลุ่มตะวันตกไปทางตะวันตก\n"
     "กลุ่มตะวันออกไปทางตะวันออก",
     "The 3rd stack goes off\n"
     "Then move out to the sides:\n"
     "West group to the west\n"
     "East group to the east",
     strict=True, scene=fire_stack(4), game8=FS_G8[4])

step(P1, P1E, "Scourge of Fire", "⑤ ดีบัฟน้ำแข็ง: คนโดนขยับตัว", "⑤ Ice debuff: keep moving",
     "ดีบัฟน้ำแข็งทำงาน คนที่โดนขยับตัวไว้ตลอดเพื่อหลบ แล้วจบท่า\n"
     "ภาพนี้: D1 D2 D3 D4 โดนน้ำแข็ง",
     "The ice debuff goes off; whoever has it keeps moving to avoid it, and the mechanic ends\n"
     "In this picture: D1 D2 D3 D4 have the ice",
     strict=False, scene=fire_stack(5), game8=FS_G8[5])

step(P1, P1E, "Scourge of Thunder", "spread ตาม macro", "Spread by the macro",
     "ดีบัฟสายฟ้า: AoE วงกลมเล็กขึ้นที่ตัวคนโดน ไป spread ตาม macro ช่องละคน\n"
     "แถวบน (ตะวันตก → ตะวันออก): D1 > MT > ST > D2\n"
     "แถวกลาง (ตะวันตก → ตะวันออก): D3 > H1 > H2 > D4",
     "Lightning debuff: a small circle AoE on each target. Spread by the macro, one per tile\n"
     "Top row (west → east): D1 > MT > ST > D2\n"
     "Middle row (west → east): D3 > H1 > H2 > D4",
     strict=True, scene=thunder_fire(), game8=G8(10208181, "02142a4f3e32a41ce3883b06f74ad41b.png"),
     says={"D1": "แถวบน ช่องตะวันตกสุด", "MT": "แถวบน ช่องที่ 2 จากตะวันตก", "ST": "แถวบน ช่องที่ 3 จากตะวันตก", "D2": "แถวบน ช่องตะวันออกสุด",
           "D3": "แถวกลาง ช่องตะวันตกสุด", "H1": "แถวกลาง ช่องที่ 2 จากตะวันตก", "H2": "แถวกลาง ช่องที่ 3 จากตะวันตก", "D4": "แถวกลาง ช่องตะวันออกสุด"},
     says_en={"D1": "Top row, westernmost tile", "MT": "Top row, 2nd tile from the west", "ST": "Top row, 3rd tile from the west", "D2": "Top row, easternmost tile",
              "D3": "Middle row, westernmost tile", "H1": "Middle row, 2nd tile from the west", "H2": "Middle row, 3rd tile from the west", "D4": "Middle row, easternmost tile"})

DZ = ("AoE ทั้งปาร์ตี้ (raid-wide) และเป็นท่าที่จบช่วงธาตุนั้น", "Raid-wide, and the attack that ends the element phase")
step(P1, P1E, "Disaster Zone", "raid-wide จบช่วงไฟ", "Raid-wide, the fire phase ends", DZ[0], DZ[1])

RF_G8 = {1: G8(10208455, "5aa9b967c11b3310b6ca62bd904c62c1.png"), 2: G8(10208456, "6603490e4f95778d48a7890013505742.png"),
         3: G8(10208457, "7e4a52a5949f636dd3adb53b837f2bb0.png")}
step(P1, P1E, "Ruin Foretold", "① แยก 2 แถวตาม macro", "① Two lines by the macro",
     "แยก 4:4 หลบ AoE กรวยจากบอส ไปพลางรับ stack และทำลาย beacon 3 อัน\n"
     "Range ตี beacon สายฟ้าตรงกลาง (สีม่วง)\n"
     "Tank กับ Melee ตี beacon ไฟ (สีแดง ฝั่งตะวันตก) และ beacon น้ำแข็ง (สีฟ้า ฝั่งตะวันออก)\n\n"
     "① ไปยืนตาม macro เป็นแถว เรียงจากหัวแถว (ฝั่ง beacon):\n"
     "ตะวันตก: MT > D1 > D3 > H1\n"
     "ตะวันออก: ST > D2 > D4 > H2",
     "Split 4:4, dodge the boss's cones while taking stacks, and destroy the 3 beacons\n"
     "Ranges hit the thunderous beacon in the middle (purple)\n"
     "Tanks and Melees hit the flame-kissed beacon (red, west) and the glacial beacon (blue, east)\n\n"
     "① Stand in lines by the macro, front (beacon side) first:\n"
     "West: MT > D1 > D3 > H1\n"
     "East: ST > D2 > D4 > H2",
     strict=True, scene=ruin(1), game8=RF_G8[1],
     says={"MT": "หัวแถวตะวันตก ตี beacon ไฟ", "D1": "แถวตะวันตก คนที่ 2 ตี beacon ไฟ", "D3": "แถวตะวันตก คนที่ 3 ตี beacon สายฟ้าตรงกลาง", "H1": "ท้ายแถวตะวันตก",
           "ST": "หัวแถวตะวันออก ตี beacon น้ำแข็ง", "D2": "แถวตะวันออก คนที่ 2 ตี beacon น้ำแข็ง", "D4": "แถวตะวันออก คนที่ 3 ตี beacon สายฟ้าตรงกลาง", "H2": "ท้ายแถวตะวันออก"},
     says_en={"MT": "Front of the west line; hit the fire beacon", "D1": "West line, 2nd; hit the fire beacon", "D3": "West line, 3rd; hit the thunder beacon in the middle", "H1": "Back of the west line",
              "ST": "Front of the east line; hit the ice beacon", "D2": "East line, 2nd; hit the ice beacon", "D4": "East line, 3rd; hit the thunder beacon in the middle", "H2": "Back of the east line"})

step(P1, P1E, "Ruin Foretold", "② Tank หัวแถวรับ stack + ตี beacon", "② Tanks in front take the stacks while hitting the beacons",
     "stack มาเป็นแนวเส้น คนหัวแถวโดนแรงที่สุด Tank จึงยืนหน้าสุดรับ stack ไปพลางตี beacon ไปพลาง\n"
     "stack แรงขึ้นเรื่อยๆ ใช้ท่าลดดาเมจและ barrier ให้เต็มที่\n"
     "ทำลาย beacon ครบ 3 อันแล้ว stack จะหยุด",
     "The stacks come as lines and the front takes the most damage, so the tanks stand at the very front, taking the stack while hitting a beacon\n"
     "The stacks get stronger each time; use mitigations and barriers fully\n"
     "Once all 3 beacons are destroyed, the stacks stop",
     strict=True, scene=ruin(2), game8=RF_G8[2],
     says={"MT": "หัวแถวรับ stack ก่อน ใช้บัฟลดดาเมจ", "ST": "หัวแถวรับ stack ก่อน ใช้บัฟลดดาเมจ"},
     says_en={"MT": "Front of the line; take the stack first with a mitigation", "ST": "Front of the line; take the stack first with a mitigation"})

step(P1, P1E, "Ruin Foretold", "③ ขยับซ้ายขวาตามกรวย", "③ Shift left or right with the cones",
     "AoE กรวยจากบอสเปลี่ยนช่อง ขยับไปทางซ้ายหรือขวาเข้าช่องที่ปลอดภัย ทั้งแถวขยับไปด้วยกัน",
     "The boss's cones change lanes; shift left or right into a safe lane, the whole line together",
     strict=False, scene=ruin(3), game8=RF_G8[3])

step(P1, P1E, "Tulidisaster", "raid-wide 3 ธาตุ", "3 elemental raid-wides",
     "ร่ายนาน แล้วตามด้วย AoE ทั้งปาร์ตี้ 3 ครั้ง: น้ำแข็ง > สายฟ้า > ไฟ\n"
     "แรงมาก ลดดาเมจให้ดี\n\n"
     "ถ้าเปิดบัฟตอนเห็นการร่าย ครั้งสุดท้าย (ไฟ) จะไม่มีบัฟคลุม\n"
     "ดูแถบบัฟ ถ้าครั้งแรกลดไว้หนาแล้ว ให้เก็บไว้ลดครั้งที่ 2 และ 3",
     "A long cast, then 3 raid-wides: ice > lightning > fire\n"
     "Very heavy; mitigate well\n\n"
     "If you mitigate when you see the cast, the last one (fire) is left uncovered\n"
     "Watch the buff bar: if the first hit was well covered, save mitigation for the 2nd and 3rd")

# ======================================================================= lightning phase
step(P2, P2E, "Triscourge", "raid-wide + ดีบัฟทุกคน", "Raid-wide + a debuff on everyone",
     "เหมือนช่วงไฟ แต่ผลของดีบัฟเปลี่ยน\n\n"
     "ช่วงสายฟ้า:\n"
     "ดีบัฟไฟ = stack 4:4\n"
     "ดีบัฟสายฟ้า = spread\n"
     "ดีบัฟน้ำแข็ง = หลบโดยยืนบนพื้น Levitate (ช่องสีเขียวในภาพ)",
     "As in the fire phase, but the debuffs do something else\n\n"
     "Lightning phase:\n"
     "Fire debuff = 4:4 stacks\n"
     "Lightning debuff = spread\n"
     "Ice debuff = dodge it by standing on the Levitate floor (the green tiles in the pictures)")

step(P2, P2E, "Scourge of Fire", "stack 4:4 ซ้ายขวา", "4:4 stacks, left and right",
     "stack ที่ Healer แบ่ง 4:4 ซ้ายขวาตาม macro:\n"
     "กลุ่มตะวันตก (MT H1 D1 D3) แถวล่าง ช่องที่ 2 จากตะวันตก\n"
     "กลุ่มตะวันออก (ST H2 D2 D4) แถวล่าง ช่องที่ 3 จากตะวันตก",
     "Stacks on the healers; split 4:4 left and right by the macro:\n"
     "West group (MT H1 D1 D3) bottom row, 2nd tile from the west\n"
     "East group (ST H2 D2 D4) bottom row, 3rd tile from the west",
     strict=True, scene=lightning_fire(), game8=G8(10208477, "fca4804fff7dd56626b64de62b210f08.png"),
     says=grp("กลุ่มตะวันตก stack ที่ H1", "กลุ่มตะวันออก stack ที่ H2"),
     says_en=grp("West group, stack on H1", "East group, stack on H2"))

HOF_NOTE = ("บอสปล่อย AoE ลดตามระยะ (distance falloff) 6 ครั้ง ตกที่ไหนจะมีขน (feather of ruin) วางไว้ตรงนั้น\n"
            "ขนที่ต้องทำลายขึ้นกับว่าครั้งแรกตกตรงไหน\n"
            "ตอนตีขน ยืนให้ท่าแบบเส้นตรงโดนบอสด้วย จะได้ดาเมจเพิ่ม\n\n")
HOF_NOTE_EN = ("The boss drops 6 distance-falloff AoEs, and a feather of ruin is left where each one lands\n"
               "Which feather to break depends on where the first one lands\n"
               "When hitting the feather, stand where your line AoEs also reach the boss for more damage\n\n")
step(P2, P2E, "Hail of Feathers", "ครั้งแรกตกทางตะวันออก: เริ่มที่ D", "1st lands east: start at D",
     HOF_NOTE +
     "ครั้งแรกตกทางตะวันออก → ทั้งปาร์ตี้เริ่มที่ D\n"
     "แล้วไปทำลายขนของครั้งที่ 2 (แถวล่าง ช่องที่ 3 จากตะวันตก)",
     HOF_NOTE_EN +
     "1st lands east → the whole party starts at D\n"
     "then breaks the 2nd feather (bottom row, 3rd tile from the west)",
     strict=False, scene=feathers("east"), game8=G8(10208484, "6bc415e5e52db1ab206bbaab5abbb249.png"))

step(P2, P2E, "Hail of Feathers", "ครั้งแรกตกทางตะวันตก: เริ่มที่ C", "1st lands west: start at C",
     "ครั้งแรกตกทางตะวันตก → ทั้งปาร์ตี้เริ่มที่ C\n"
     "แล้วไปทำลายขนของครั้งที่ 2 (แถวล่าง ช่องที่ 2 จากตะวันตก)",
     "1st lands west → the whole party starts at C\n"
     "then breaks the 2nd feather (bottom row, 2nd tile from the west)",
     strict=False, scene=feathers("west"), game8=G8(10208485, "8ab8ab89fb8c47166c494a180d253fe3.png"))

step(P2, P2E, "Blighted Bolt", "ฟ้าผ่าที่ขน", "Lightning on the feathers",
     "ฟ้าผ่าลงที่ขน (feather of ruin)\n"
     "ไปรอที่ตำแหน่งขนที่ทำลายไปตอน Hail of Feathers",
     "Lightning strikes the feathers of ruin\n"
     "Wait where the feather you broke during Hail of Feathers was")

step(P2, P2E, "Scourge of Thunder + Scourge of Ice", "spread ตาม macro แล้วสลับกับคู่", "Spread by the macro, then swap with your pair",
     "ดีบัฟสายฟ้าและน้ำแข็งทำงานพร้อมกัน ไป spread ตาม macro\n"
     "วงสายฟ้ากว้าง ยืนกลางช่องจะไม่โดนคนอื่น\n\n"
     "ภาพนี้:\n"
     "สายฟ้า: MT ST แถวบน / H1 H2 แถวล่าง (2 ช่องกลาง)\n"
     "น้ำแข็ง: D1 D2 D3 D4 ที่ช่องมุมสีเขียว\n\n"
     "ครั้งที่ 2 ได้เครื่องหมายสลับกัน ให้สลับที่กับคู่ของตัวเอง:\n"
     "MT·D1 / ST·D2 / H1·D3 / H2·D4",
     "The lightning and ice debuffs go off together; spread by the macro\n"
     "The lightning circle is big; stand in the middle of your tile so it misses others\n\n"
     "In this picture:\n"
     "Lightning: MT ST top row / H1 H2 bottom row (the 2 middle tiles)\n"
     "Ice: D1 D2 D3 D4 on the green corner tiles\n\n"
     "The 2nd time the markers are the other way round; swap places with your pair:\n"
     "MT·D1 / ST·D2 / H1·D3 / H2·D4",
     strict=True, scene=lightning_thunder_ice(), game8=G8(10208493, "3d8932c66ea359f4215bda5eea732263.png"),
     says={"MT": "แถวบน ช่องที่ 2 จากตะวันตก ครั้งที่ 2 สลับกับ D1", "D1": "ช่องมุมตะวันตกเฉียงเหนือ ครั้งที่ 2 สลับกับ MT",
           "ST": "แถวบน ช่องที่ 3 จากตะวันตก ครั้งที่ 2 สลับกับ D2", "D2": "ช่องมุมตะวันออกเฉียงเหนือ ครั้งที่ 2 สลับกับ ST",
           "H1": "แถวล่าง ช่องที่ 2 จากตะวันตก ครั้งที่ 2 สลับกับ D3", "D3": "ช่องมุมตะวันตกเฉียงใต้ ครั้งที่ 2 สลับกับ H1",
           "H2": "แถวล่าง ช่องที่ 3 จากตะวันตก ครั้งที่ 2 สลับกับ D4", "D4": "ช่องมุมตะวันออกเฉียงใต้ ครั้งที่ 2 สลับกับ H2"},
     says_en={"MT": "Top row, 2nd tile from the west; swap with D1 the 2nd time", "D1": "North-west corner tile; swap with MT the 2nd time",
              "ST": "Top row, 3rd tile from the west; swap with D2 the 2nd time", "D2": "North-east corner tile; swap with ST the 2nd time",
              "H1": "Bottom row, 2nd tile from the west; swap with D3 the 2nd time", "D3": "South-west corner tile; swap with H1 the 2nd time",
              "H2": "Bottom row, 3rd tile from the west; swap with D4 the 2nd time", "D4": "South-east corner tile; swap with H2 the 2nd time"})

LB_INTRO = ("ท่าเดียวกับช่วงไฟ แต่รอบนี้ไม่มีข้อความ ต้องดูท่าบอส\n"
            "ช่วงสายฟ้ามี AoE วงกลมที่ทุกคนตามมาช้ากว่าเล็กน้อย หลบท่าบอสแล้วรีบขยับออกทันที\n\n")
LB_INTRO_EN = ("The same attacks as in the fire phase, but this time with no message: read the boss's motion\n"
               "In the lightning phase a circle AoE also drops on everyone a moment later, so move away right after dodging the boss\n\n")
step(P2, P2E, BOSS_MECH, "donut: รวมกลางสนาม", "Donut: gather in the middle",
     LB_INTRO + "donut (ลมรอบตัวบอส): ทุกคนรวมในวงกลางสนาม แล้วรีบกระจายออกหลบวงที่ตามมา",
     LB_INTRO_EN + "Donut (wind around the boss): everyone gathers in the middle circle, then spreads out quickly from the circles that follow",
     strict=False, scene=lightning_coil(), game8=G8(10208502, "eac952d99f1575a2c9777586908aabfa.png"))

step(P2, P2E, BOSS_MECH, "วงกลม: ไปฝั่งใต้ 2 กลุ่ม", "Circle: two groups in the south",
     "วงกลม (แขนบอสเรือง): ไปฝั่งใต้ แยก 2 กลุ่มบนช่องแถวล่างที่ไม่ใช่สีเขียว\n"
     "ตะวันตก: MT·D1 / H1·D3\n"
     "ตะวันออก: ST·D2 / H2·D4",
     "Circle (arms glow): go south, in two groups on the bottom-row tiles that are not green\n"
     "West: MT·D1 / H1·D3\n"
     "East: ST·D2 / H2·D4",
     strict=True, scene=lightning_strike(), game8=G8(10208501, "eff989d3c0fffdcd75b3521dddd2d7c1.png"),
     says=grp("แถวล่าง ช่องที่ 2 จากตะวันตก", "แถวล่าง ช่องที่ 3 จากตะวันตก"),
     says_en=grp("Bottom row, 2nd tile from the west", "Bottom row, 3rd tile from the west"))

step(P2, P2E, BOSS_MECH, "กรวย: มุมเหนือ 2 ฝั่ง", "Cone: the two north corners",
     "กรวย (ปากบอสเรือง): ไปมุมเหนือ 2 ฝั่ง\n"
     "ตะวันตกเฉียงเหนือ: MT·D1 / H1·D3\n"
     "ตะวันออกเฉียงเหนือ: ST·D2 / H2·D4",
     "Cone (beak glows): go to the two north corners\n"
     "North-west: MT·D1 / H1·D3\n"
     "North-east: ST·D2 / H2·D4",
     strict=True, scene=lightning_breath(), game8=G8(10208503, "3f0368b75adb5e5007b7f0fdfb161388.png"),
     says=grp("มุมตะวันตกเฉียงเหนือ", "มุมตะวันออกเฉียงเหนือ"),
     says_en=grp("North-west corner", "North-east corner"))

step(P2, P2E, "Thunderous Breath", "หลบเส้นตรง + ยืนบนพื้น Levitate", "Dodge the lines, stand on the Levitate floor",
     "ลูกสายฟ้าฝั่งซ้ายและขวายิง AoE เป็นเส้นตรง และบอสยิงกรวยกว้างทั่วทั้งสนาม\n"
     "ดูตำแหน่งลูกสายฟ้าซ้ายขวาแล้วหลบเส้นตรง\n"
     "หลบกรวยของบอสโดยยืนบนพื้น Levitate (ช่องสีเขียว)",
     "Thunder orbs on the left and right fire line AoEs, and the boss fires a wide cone over the whole arena\n"
     "Check where the left and right orbs are and dodge their lines\n"
     "Dodge the boss's cone by standing on the Levitate floor (green tiles)")

step(P2, P2E, "Disaster Zone", "raid-wide จบช่วงสายฟ้า", "Raid-wide, the lightning phase ends", DZ[0], DZ[1])

step(P2, P2E, "Ruinfall", "tower Tank 2 คน + knockback", "Tank tower for 2 + knockback",
     "tower สำหรับ Tank 2 คน stack กันขึ้นกลางสนาม แล้วตามด้วย knockback จากด้านหน้า\n"
     "จุดที่ถูกกระเด็นไปมี AoE วงกลมรออยู่ แนะนำใช้ Arm's Length หรือ Surecast กัน knockback",
     "A tower for the 2 tanks to share appears in the middle, followed by a knockback from the front\n"
     "There are circle AoEs where the knockback would send you, so Arm's Length or Surecast is recommended",
     says={"MT": "เข้า tower กลางสนามพร้อม ST", "ST": "เข้า tower กลางสนามพร้อม MT"},
     says_en={"MT": "Take the middle tower together with ST", "ST": "Take the middle tower together with MT"})

# ======================================================================= ice phase
step(P3, P3E, "Triscourge", "raid-wide + ดีบัฟทุกคน", "Raid-wide + a debuff on everyone",
     "เหมือนช่วงไฟ แต่ผลของดีบัฟเปลี่ยน\n\n"
     "ช่วงน้ำแข็ง:\n"
     "ดีบัฟไฟ = stack 3:3\n"
     "ดีบัฟสายฟ้า = spread\n"
     "ดีบัฟน้ำแข็ง = ท่าแรงใส่ Tank",
     "As in the fire phase, but the debuffs do something else\n\n"
     "Ice phase:\n"
     "Fire debuff = 3:3 stacks\n"
     "Lightning debuff = spread\n"
     "Ice debuff = heavy hits on the tanks")

step(P3, P3E, "Scourge of Fire + Scourge of Ice", "Tank ไปมุมเหนือ / stack 3:3", "Tanks to the north corners / 3:3 stacks",
     "ดีบัฟไฟและน้ำแข็งทำงานพร้อมกัน\n\n"
     "น้ำแข็งติดที่ Tank นับถอยหลังจบแล้วระเบิดเป็น AoE วงกลมใหญ่มาก\n"
     "Tank ไปมุมด้านหน้าสุดขอบ:\n"
     "MT ตะวันตกเฉียงเหนือ\n"
     "ST ตะวันออกเฉียงเหนือ\n\n"
     "ไฟติดที่ Healer เป็น stack แบ่ง 3:3 กับ DPS รับด้านหลัง:\n"
     "ตะวันตก: H1 D1 D3\n"
     "ตะวันออก: H2 D2 D4",
     "The fire and ice debuffs go off together\n\n"
     "The ice is on the tanks: when its count ends it bursts as a huge circle AoE\n"
     "Tanks go to the front corners, right at the edge:\n"
     "MT north-west\n"
     "ST north-east\n\n"
     "The fire is on the healers: stacks split 3:3 with the DPS, taken at the back:\n"
     "West: H1 D1 D3\n"
     "East: H2 D2 D4",
     strict=True, scene=ice_fire_ice(), game8=G8(10208704, "72e217880e262a06c0081c89802c582c.png"),
     says={"MT": "มุมตะวันตกเฉียงเหนือ สุดขอบ", "ST": "มุมตะวันออกเฉียงเหนือ สุดขอบ",
           "H1": "stack ฝั่งตะวันตก (H1 D1 D3)", "D1": "stack ฝั่งตะวันตกที่ H1", "D3": "stack ฝั่งตะวันตกที่ H1",
           "H2": "stack ฝั่งตะวันออก (H2 D2 D4)", "D2": "stack ฝั่งตะวันออกที่ H2", "D4": "stack ฝั่งตะวันออกที่ H2"},
     says_en={"MT": "North-west corner, right at the edge", "ST": "North-east corner, right at the edge",
              "H1": "West stack (H1 D1 D3)", "D1": "West stack on H1", "D3": "West stack on H1",
              "H2": "East stack (H2 D2 D4)", "D2": "East stack on H2", "D4": "East stack on H2"})

ICE_NOTE = ("ท่าเดียวกับช่วงไฟ แต่ไม่มีข้อความ ดูท่าบอสแล้วหลบ\n"
            "พร้อมกันนั้นมีหิมะถล่ม (avalanche) มาจากทิศที่ข้อความบอก วิ่งเข้าที่ที่ไม่โดนทั้ง AoE ของบอสและหิมะถล่ม\n\n"
            "ช่วงน้ำแข็งยังมีลูกน้ำแข็งหลายลูกในสนาม ระเบิดเป็นเส้นตรงรูปดาว เหลือแค่ A หรือ B ที่ปลอดภัย\n"
            "ดูตำแหน่งลูกน้ำแข็งแล้ววิ่งเข้าจุดนั้น\n\n")
ICE_NOTE_EN = ("The same boss attacks as in the fire phase, but with no message: read the boss's motion and dodge\n"
               "At the same time an avalanche comes from the direction the message names (\"A rumbling avalanche approaches from the ...\"); run to where neither the boss's AoE nor the avalanche hits\n\n"
               "The ice phase also has several ice orbs that burst in star-shaped lines, leaving only A or B safe\n"
               "Read where the orbs are and run there\n\n")
step(P3, P3E, "Northern Cross + Chilling Cataclysm", "A ปลอดภัย", "A is safe",
     ICE_NOTE + "ภาพนี้: A ปลอดภัย (สีฟ้า)",
     ICE_NOTE_EN + "This picture: A is safe (blue)",
     strict=False, scene=ice_safe("A"), game8=G8(10208845, "e4e1fea7334dc5462cda4e79886be6ac.png"))

step(P3, P3E, "Northern Cross + Chilling Cataclysm", "B ปลอดภัย", "B is safe",
     "ลูกน้ำแข็งวางกลับด้านจากภาพก่อน → B ปลอดภัย (สีฟ้า)",
     "The orbs are the mirror of the last picture → B is safe (blue)",
     strict=False, scene=ice_safe("B"), game8=G8(10208847, "6fe3891c0a8cb8bcd97ee37d365a8002.png"))

step(P3, P3E, "Scourge of Thunder", "Tank/Healer spread, DPS รอกลาง", "Tanks/Healers spread, DPS wait in the middle",
     "ดีบัฟสายฟ้า: AoE วงกลมที่ตัวคนโดน ไป spread ตาม macro\n"
     "คนที่ไม่โดนรอแถวกลางสนาม อย่าให้วงสายฟ้าโดน\n\n"
     "ภาพนี้ครั้งแรกโดน Tank กับ Healer:\n"
     "MT มุมตะวันตกเฉียงเหนือ\n"
     "ST มุมตะวันออกเฉียงเหนือ\n"
     "H1 ฝั่งตะวันตก\n"
     "H2 ฝั่งตะวันออก\n\n"
     "ครั้งที่ 2 คนที่โดนไปจุดของคู่ตัวเอง:\n"
     "D1 → จุด MT / D2 → จุด ST / D3 → จุด H1 / D4 → จุด H2",
     "Lightning debuff: a circle AoE on each target; spread by the macro\n"
     "Those without it wait near the middle, clear of the lightning circles\n\n"
     "In this picture the tanks and healers have it the first time:\n"
     "MT north-west corner\n"
     "ST north-east corner\n"
     "H1 west side\n"
     "H2 east side\n\n"
     "The 2nd time, the targets go to their pair's spot:\n"
     "D1 → MT's spot / D2 → ST's spot / D3 → H1's spot / D4 → H2's spot",
     strict=["MT", "ST", "H1", "H2"], scene=ice_thunder(), game8=G8(10208897, "ddaf7b98bed45ccbdceb502755075a7f.png"),
     says={"MT": "มุมตะวันตกเฉียงเหนือ", "ST": "มุมตะวันออกเฉียงเหนือ", "H1": "ฝั่งตะวันตก", "H2": "ฝั่งตะวันออก",
           "D1": "รอกลาง ครั้งที่ 2 ไปจุดของ MT", "D2": "รอกลาง ครั้งที่ 2 ไปจุดของ ST", "D3": "รอกลาง ครั้งที่ 2 ไปจุดของ H1", "D4": "รอกลาง ครั้งที่ 2 ไปจุดของ H2"},
     says_en={"MT": "North-west corner", "ST": "North-east corner", "H1": "West side", "H2": "East side",
              "D1": "Wait in the middle; the 2nd time go to MT's spot", "D2": "Wait in the middle; the 2nd time go to ST's spot",
              "D3": "Wait in the middle; the 2nd time go to H1's spot", "D4": "Wait in the middle; the 2nd time go to H2's spot"})

step(P3, P3E, "Spikesicle + Northern Cross", "เส้นโค้ง + หิมะถล่ม", "Curved lines + avalanche",
     "Spikesicle แบบตอนเปิดไฟต์ ผสมกับหิมะถล่ม\n"
     "หลบ Spikesicle ไปพลาง ดูว่าหิมะถล่มมาทางไหน แล้วไปจุดที่ไม่โดน\n\n"
     "ถ้ายืนอยู่จุดหลบวงกลมของ Spikesicle ตลอด จะโดนหิมะถล่ม ต้องขยับปรับที่ยืนนิดหน่อย",
     "The opening Spikesicle, combined with an avalanche\n"
     "Dodge Spikesicle while checking where the avalanche comes from, and move where it will not hit\n\n"
     "If you stay on the spot that dodges Spikesicle's circles the whole time, the avalanche hits you; adjust your position a little")

step(P3, P3E, "Freezing Dust", "ขยับตัวตลอด", "Keep moving",
     "ติดดีบัฟแช่แข็ง ดาเมจแทบไม่มี\n"
     "ขยับตัวไว้ตลอดก็หลบได้",
     "A freezing debuff; it does almost no damage\n"
     "Keep moving and you avoid it")

step(P3, P3E, "Disaster Zone", "raid-wide จบช่วงน้ำแข็ง", "Raid-wide, the ice phase ends", DZ[0], DZ[1])

step(P3, P3E, "Ice Talon", "ท่าแรงใส่อันดับ hate 1 และ 2", "Heavy hits on enmity 1st and 2nd",
     "ท่าแรงใส่อันดับ hate 1 และ 2 เลือกตาม hate ไม่ได้เลือก Tank\n"
     "ST ต้องเป็นอันดับ hate 2 ไว้ก่อนถึงท่านี้\n"
     "ST เปิด stance ตอนต้นไฟต์หลัง hate นิ่งแล้ว จะชัวร์ที่สุด",
     "Heavy hits on the 1st and 2nd in enmity; it picks by enmity, not by tank\n"
     "ST must be 2nd in enmity before this comes\n"
     "ST is safest turning on tank stance early in the fight, once enmity has settled",
     says={"MT": "ถือ hate อันดับ 1 รับท่าแรง", "ST": "เปิด stance ถือ hate อันดับ 2 รับท่าแรง"},
     says_en={"MT": "Hold 1st in enmity and take the hit", "ST": "Stance on, hold 2nd in enmity and take the hit"})

# ======================================================================= final phase
step(P4, P4E, "Wrath Unfurled", "raid-wide", "Raid-wide",
     "AoE ทั้งปาร์ตี้ธรรมดา ใช้ท่าลดดาเมจให้ดี",
     "A plain raid-wide; mitigate well")

step(P4, P4E, "Mountain Fire", "เหมือนช่วงไฟ (Tank บัฟเหลือน้อย)", "As in the fire phase (tanks are low on mitigation)",
     "เหมือน Mountain Fire ในช่วงไฟ: ครั้งคี่ MT / ครั้งคู่ ST คนอื่นหลบหลัง tower\n"
     "Ice Talon หรือ Ruinfall ก่อนหน้านี้ทำให้ Tank เหลือบัฟลดดาเมจน้อยกว่าตอนช่วงไฟ\n"
     "Healer คอยดู HP ของ Tank ให้ดี",
     "The same as Mountain Fire in the fire phase: odd hits MT / even hits ST, everyone else behind the tower\n"
     "The Ice Talon or Ruinfall just before leaves the tanks with fewer mitigations than in the fire phase\n"
     "Healers, watch the tanks' HP closely",
     says={"MT": "เข้า tower ครั้งคี่", "ST": "เข้า tower ครั้งคู่", "H1": "คอยดู HP ของ Tank", "H2": "คอยดู HP ของ Tank"},
     says_en={"MT": "Take the odd hits", "ST": "Take the even hits", "H1": "Watch the tanks' HP", "H2": "Watch the tanks' HP"})

step(P4, P4E, "Tulidisaster", "raid-wide 2 ครั้ง แล้ว enrage", "2 raid-wides, then the enrage",
     "AoE ทั้งปาร์ตี้ 2 ครั้งติด\n"
     "แล้วตามด้วย raid-wide หมดเวลา (enrage)",
     "2 raid-wides in a row\n"
     "then the time-up raid-wide (enrage)")

# ======================================================================= the guide
JOBS = [("PLD", "Skyruin Falchion", "030000/030685"), ("MNK", "Skyruin Baghnakhs", "030000/030849"),
        ("WAR", "Skyruin Bardiche", "031000/031258"), ("DRG", "Skyruin Glaive", "031000/031660"),
        ("BRD", "Skyruin Longbow", "032000/032048"), ("WHM", "Skyruin Cane", "032000/032478"),
        ("BLM", "Skyruin Staff", "032000/032894"), ("SMN", "Skyruin Index", "037000/037820"),
        ("SCH", "Skyruin Codex", "037000/037821"), ("NIN", "Skyruin Cleavers", "033000/033635"),
        ("DRK", "Skyruin Faussar", "034000/034014"), ("MCH", "Skyruin Musketoon", "034000/034507"),
        ("AST", "Skyruin Orrery", "034000/034707"), ("SAM", "Skyruin Blade", "036000/036561"),
        ("RDM", "Skyruin Rapier", "036000/036862"), ("GNB", "Skyruin Gunblade", "036000/036105"),
        ("DNC", "Skyruin War Quoits", "036000/036302"), ("RPR", "Skyruin War Scythe", "037000/037271"),
        ("SGE", "Skyruin Wings", "037000/037067"), ("VPR", "Skyruin Twinfangs", "037000/037428"),
        ("PCT", "Skyruin Round Brush", "037000/037634"), ("PLD", "Skyruin Shield", "030000/030274")]

fight = {
    "guide": {
        "slug": "ex1-valigarmanda", "short": "EX1", "name": "Valigarmanda · Worqor Lar Dor (Extreme)",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.0",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/622480",
        "content_key": "ex:Valigarmanda",
        "note": ("แผนตาม game8 (แผนของ Hamukatsu) ใช้ Marker แบบ Nukemaru\n"
                 "Marker: 1 2 3 4 = จุด stack คู่ / A B = Spikesicle และลูกน้ำแข็งช่วงน้ำแข็ง (ดูขั้นแรก)\n\n"
                 "คู่: MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
                 "กลุ่ม 4:4\n"
                 "ตะวันตก: MT H1 D1 D3\n"
                 "ตะวันออก: ST H2 D2 D4\n\n"
                 "Mountain Fire: ครั้งคี่ MT / ครั้งคู่ ST\n\n"
                 "ลำดับช่วง: ไฟ (เสมอ) > สายฟ้า หรือ น้ำแข็ง > อีกช่วงที่เหลือ > ช่วงสุดท้าย"),
        "en": {"note": ("Plan follows game8 (Hamukatsu's strat), with Nukemaru's waymarks\n"
                        "Waymarks: 1 2 3 4 = pair-stack spots / A B = Spikesicle and the ice orbs in the ice phase (see the first step)\n\n"
                        "Pairs: MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
                        "4:4 groups\n"
                        "West: MT H1 D1 D3\n"
                        "East: ST H2 D2 D4\n\n"
                        "Mountain Fire: odd hits MT / even hits ST\n\n"
                        "Phase order: fire (always first) > lightning or ice > the other one > final phase")},
        "req": {
            "level": 100, "ilvl": 690, "party": 8, "minutes": 60,
            "unlock": ("เคลียร์ Main Quest ของ Dawntrail (7.0) ให้จบก่อน\n"
                       "แล้วคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                       "Extreme ของ Dawntrail ปลดล็อกที่ NPC คนนี้ทั้งหมด"),
            "unlock_en": ("Finish the Dawntrail (7.0) main scenario first\n"
                          "then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                          "Every Dawntrail Extreme is unlocked from this NPC"),
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/valigarmanda/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166",
        "arena": {"shape": "square", "at": [50.2, 51.05], "w": 92.4, "h": 69.1, "fill": "#2f3033", "lines": False},
        "waymarks": {"A": [32.4, 33.9], "B": [67.7, 34.3], "C": [96.4, 51.4], "D": [4.0, 51.7],
                     "1": [38.6, 39.0], "2": [61.5, 39.8], "3": [61.7, 62.3], "4": [38.6, 62.3]},
        "iconSize": 5.6, "markSize": 7.4, "bossSize": 9, "ring": 5.5,
    },
    "steps": steps,
    "rewards": [
        {"kind": "token", "name": "Skyruin Totem", "icon_src": ICON("ui/icon/026000/026662_hr1.tex"),
         "say": ("ได้ 1 ชิ้นทุกครั้งที่เคลียร์\n\n"
                 "แลกที่ NPC แลกของ Extreme ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "อาวุธ IL710: 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "Wings of Ruin: 99 ชิ้น"),
         "say_en": ("Every clear gives 1.\n\n"
                    "Exchange them with the Extreme trial exchange NPC in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL710 weapon: 10 per weapon\n"
                    "Wings of Ruin: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Extreme exchange"},
                   "say": "จุดแลก: Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "weapon", "name": "Skyruin Weapons", "ilvl": 710, "icon_src": ICON("ui/icon/030000/030685_hr1.tex"),
         "say": "แลกด้วย Skyruin Totem 10 ชิ้น ต่ออาวุธ 1 ชิ้น\nมีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ",
         "say_en": "10 Skyruin Totems per weapon\nOne for every job; tap an icon for the weapon's name",
         "pieces": [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for j, n, p in JOBS]},
        {"kind": "mount", "name": "Wings of Ruin", "icon_src": ICON("ui/icon/004000/004283_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก และต้องชนะการ roll ด้วย\nหรือแลกด้วย Skyruin Totem 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate, and you must win the roll\nor 99 Skyruin Totems",
         "pics": [{"src": ICON("ui/icon/068000/068283_hr1.tex"),
                   "say": "หน้าตา Wings of Ruin (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of Ruin, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures")
