"""Footage pictures for Another Mount Rokkon (Savage) from Hamukatsu's three explanation videos:
crop wide, blur every Japanese text and player name, our own marks. Writes refs.py for gen.py.
usage: python -I frames.py [name ...]"""
import sys, json, subprocess, os
sys.stdout.reconfigure(encoding="utf-8")
M = r"scripts/guides/.work/rokkon"
WT = r"."
OUT = WT + "/scripts/guides/data/frames/rokkon-savage"
os.makedirs(OUT, exist_ok=True)

V = {"v1": "DnbENp5IE1Y", "v2": "0qIwmJYgkgY", "v3": "7wd6O9wtZDw"}
L = lambda x, y, lines, size=32: {"t": "label", "at": [x, y], "lines": lines, "size": size}
RG = lambda x, y, r: {"t": "ring", "at": [x, y], "r": r}
AR = lambda a, b: {"t": "arrow", "from": a, "to": b}
CROP = (410, 150, 1100, 600)
BOTTOM = (0, 505, 1100, 95)

# name: (video, t, [blur boxes in crop coords], [marks], step key, Thai caption, English caption)
F = {
    "t1-order": ("v1", 3, [(0, 0, 280, 45), (320, 88, 350, 38), (730, 84, 240, 38), (0, 140, 70, 260)],
                 [RG(560, 130, 120), L(20, 300, ["Kill order: ① → ② → ③", "ฆ่าทีละกลุ่ม / yuki เดินลาดตระเวน อย่าไปชน"], 30)],
                 "t1-order", "ลูกน้องก่อนบอส 1: ฆ่าตามลำดับ ① → ② → ③ / Shishu yuki เดินลาดตระเวน อย่าเข้าไปชน",
                 "Trash before boss 1: kill in the order ① → ② → ③ / the Shishu yuki patrols, don't walk into it"),
    "t1-raiko": ("v1", 15, [(50, 78, 225, 40), (0, 355, 185, 105), (628, 340, 135, 40), (628, 428, 175, 65)],
                 [RG(230, 250, 130), L(560, 30, ["Disciples of Levin: วงกลมรอบ raiko", "ออกห่างจาก raiko"], 30)],
                 "t1-raiko", "Disciples of Levin: AoE วงกลมรอบ Shishu raiko ออกห่างจากมัน",
                 "Disciples of Levin: a circle AoE around the Shishu raiko; get away from it"),
    "t1-fuko": ("v1", 105, [(300, 172, 195, 40), (658, 338, 115, 40), (0, 345, 125, 105), (448, 388, 295, 135)],
                [RG(360, 330, 170), L(600, 30, ["Crosswind: knockback จาก fuko", "ระวัง Tornado ของ penghou ด้วย"], 30)],
                "t1-fuko", "Crosswind: knockback มีดาเมจจาก Shishu fuko ระวัง Tornado ของ penghou ไปพร้อมกัน",
                "Crosswind: a damaging knockback from the Shishu fuko; watch the penghou's Tornado at the same time"),
    "t1-yuki": ("v1", 146, [(468, 290, 195, 40), (628, 340, 135, 40), (488, 388, 215, 150), (0, 305, 145, 65)],
                [RG(660, 330, 100), L(20, 30, ["Right / Left Swipe: ตีครึ่งสนาม", "ฝั่งที่ yuki ยกมือ: หลบไปอีกข้าง"], 30)],
                "t1-yuki", "Right Swipe / Left Swipe: Shishu yuki ตีครึ่งสนามฝั่งที่ยกมือ หลบไปอีกข้าง",
                "Right Swipe / Left Swipe: the Shishu yuki hits the half on its raised hand's side; dodge to the other"),
    "b1-enkyo": ("v1", 166, [(462, 8, 155, 45), (418, 322, 205, 110), (628, 412, 125, 40), (0, 178, 85, 45)],
                 [RG(540, 300, 160), L(20, 30, ["Enkyo: raid-wide", "ใช้ mitigate"], 32)],
                 "b1-enkyo", "Shishio: Enkyo = raid-wide ประจำ ใช้ mitigate",
                 "Shishio: Enkyo = the usual raid-wide; mitigate"),
    "b1-smoke": ("v1", 192, [(578, 22, 145, 40), (638, 340, 125, 40), (708, 202, 175, 65), (532, 375, 115, 35), (468, 442, 195, 40), (0, 228, 105, 185)],
                 [RG(700, 90, 75), L(20, 400, ["Stormcloud Summons: เมฆดำรอบสนาม", "Smokeater 1–3 ครั้ง = เส้นตรง 1–3 เส้น"], 30)],
                 "b1-smoke", "Stormcloud Summons: เมฆดำขึ้นรอบสนาม นับจำนวน Smokeater = จำนวนเส้นตรงของ Rokujo Revel",
                 "Stormcloud Summons: dark clouds around the arena; count the Smokeaters = Rokujo Revel's number of lines"),
    "b1-line1": ("v1", 226, [(448, 32, 165, 45), (398, 202, 235, 45), (638, 252, 155, 255), (508, 428, 115, 40), (0, 360, 105, 140)],
                 [RG(660, 200, 100), L(20, 400, ["Smokeater 1 ครั้ง: เส้นตรง 1 เส้น", "ยืนในเส้นช่วงที่ไม่มีเมฆดำ"], 30)],
                 "b1-line1", "Smokeater 1 ครั้ง: Rokujo Revel เส้นตรง 1 เส้น เข้าไปยืนในเส้นช่วงที่ไม่มีเมฆดำ",
                 "Smokeater once: one Rokujo Revel line; stand in the part of it with no dark cloud"),
    "b1-line2": ("v1", 296, [(458, 305, 245, 210)],
                 [RG(300, 150, 120), L(560, 400, ["Smokeater 2 ครั้ง: เส้นตรง 2 เส้น", "เส้นแรกลง: วิ่งเข้าที่เพิ่งระเบิด"], 30)],
                 "b1-line2", "Smokeater 2 ครั้ง: เส้นแรกลงแล้ววิ่งเข้าที่เพิ่งระเบิด แล้วรอเส้นที่ 2",
                 "Smokeater twice: when the first line goes off, run into its spot, then wait for the second"),
    "b1-cry": ("v1", 743, [(488, 0, 155, 45), (438, 138, 125, 40), (528, 192, 165, 40), (388, 228, 125, 40), (628, 402, 155, 105), (498, 432, 115, 35), (0, 360, 120, 140)],
               [RG(520, 270, 170), L(20, 30, ["Splitting Cry → Slither", "tank buster เส้นตรง แล้ว cone หลังบอส"], 30)],
               "b1-cry", "Splitting Cry: tank buster เส้นตรง ตามด้วย Slither: cone หลังบอส คนที่ตีด้านหลังไปยืนด้านข้าง",
               "Splitting Cry: a line tank buster, then Slither: a cone behind; anyone behind moves to the side"),
    "b1-noble": ("v1", 404, [(398, 122, 475, 42), (598, 332, 165, 45), (493, 428, 115, 35), (628, 448, 145, 65), (848, 398, 145, 45), (0, 120, 70, 200)],
                 [RG(300, 140, 150), L(20, 300, ["Noble Pursuit: วงแหวนหลายวง", "ดูวงแหวนฝั่งใต้ก่อน: ตะวันออกหรือตะวันตก"], 30)],
                 "b1-noble", "Noble Pursuit: วงแหวนหลายวง หันกล้องไปทางใต้ ดูว่าวงฝั่งใต้ขึ้นตะวันออกหรือตะวันตก",
                 "Noble Pursuit: many rings; turn the camera south and see whether the south ring is east or west"),
    "b1-yuki": ("v1", 514, [(468, 22, 165, 45), (458, 192, 155, 40), (308, 282, 175, 45), (628, 382, 195, 95), (438, 462, 195, 45), (0, 330, 90, 200)],
                [RG(170, 190, 110), L(560, 30, ["Haunting Cry: Shishu yuki ตีครึ่งสนาม", "ดู 2 ตัวที่หันเข้ากลาง"], 30)],
                "b1-yuki", "Haunting Cry: Shishu yuki ขึ้นรอบสนาม หาจุดปลอดภัยจาก 2 ตัวที่หันหน้าเข้ากลาง",
                "Haunting Cry: Shishu yuki appear around the arena; find the safe spot from the two facing the middle"),
    "b1-bolt": ("v1", 572, [(38, 398, 155, 145), (488, 418, 115, 35), (588, 462, 115, 40)],
                [RG(600, 240, 170), L(20, 30, ["Lightning Bolt: เส้นตรงต่อเนื่อง", "ดูรอยเตือนแล้วหลบ"], 30)],
                "b1-bolt", "Lightning Bolt: เส้นตรงลงต่อเนื่องแทบไม่หยุด ดูรอยเตือนแล้วหลบ",
                "Lightning Bolt: lines one after another almost without a break; watch the telegraphs and dodge"),
    "b1-vortex": ("v1", 640, [(468, 8, 165, 45), (578, 342, 175, 40), (318, 268, 135, 100), (448, 462, 325, 45), (0, 360, 70, 140)],
                  [RG(500, 330, 180), L(20, 30, ["Vortex of the Thunder Eye: donut ก่อน", "Eye of the Thunder Vortex: วงกลมก่อน"], 30)],
                  "b1-vortex", "Vortex of the Thunder Eye: donut ก่อน (ปลอดภัยด้านใน) / Eye of the Thunder Vortex: วงกลมก่อน",
                  "Vortex of the Thunder Eye: the donut first (safe inside) / Eye of the Thunder Vortex: the circle first"),
    "b1-souls": ("v1", 716, [(638, 342, 125, 40), (493, 428, 115, 35), (0, 298, 145, 245), (668, 32, 155, 45)],
                 [RG(860, 220, 110), L(20, 30, ["Vengeful Souls: tower 2 + Marker วงใหญ่ 2", "ไม่มี Marker: เข้า tower"], 30)],
                 "b1-souls", "Vengeful Souls: tower 2 อัน + Marker วงใหญ่ 2 คน คนไม่มี Marker เข้า tower",
                 "Vengeful Souls: two towers + two big-circle markers; the players without a marker take the towers"),
    "b1-tvortex": ("v1", 730, [(468, 22, 165, 45), (438, 238, 165, 40), (698, 338, 105, 40), (638, 438, 165, 55), (383, 222, 85, 35), (508, 432, 115, 35), (0, 358, 175, 115)],
                   [RG(520, 330, 185), L(20, 30, ["Thunder Vortex: donut รอบบอส", "เข้าใน target circle"], 30)],
                   "b1-tvortex", "Thunder Vortex: donut รอบบอส หลบเข้าใน target circle ของบอส",
                   "Thunder Vortex: a donut around the boss; get inside its target circle"),
    "b1-bolt2": ("v1", 798, [(658, 0, 155, 45), (628, 118, 145, 40), (838, 198, 145, 65), (343, 228, 95, 35), (0, 338, 185, 205), (503, 428, 115, 35), (628, 438, 155, 55)],
                 [RG(560, 300, 190), L(20, 30, ["Lightning Bolt ครั้งที่ 2: เส้นกว้างขึ้นมาก", "วิ่งหลบไปเรื่อยๆ"], 30)],
                 "b1-bolt2", "Lightning Bolt ครั้งที่ 2: เส้นตรงจากเมฆรอบนอกกว้างขึ้นมาก วิ่งหลบไปเรื่อยๆ",
                 "The second Lightning Bolt: the lines from the outer clouds are much wider; keep moving"),
    "t2-order": ("v2", 6, [(583, 22, 155, 40), (468, 368, 95, 35), (488, 402, 135, 40), (618, 442, 85, 35)],
                 [RG(650, 120, 90), L(20, 200, ["ลูกน้องก่อนบอส 2: ฆ่าทีละตัว", "① kotengu ใกล้ → ② onmitsugashira → ③ kotengu ไกล"], 30)],
                 "t2-order", "ลูกน้องก่อนบอส 2 บนสะพาน: ฆ่าทีละตัว ① kotengu ตัวใกล้ → ② onmitsugashira → ③ kotengu ตัวไกล",
                 "Trash before boss 2 on the bridge: one at a time, ① near kotengu → ② onmitsugashira → ③ far kotengu"),
    "t2-sprite": ("v2", 70, [(0, 362, 145, 40), (488, 382, 270, 95), (408, 492, 205, 45)],
                  [RG(240, 240, 120), L(560, 30, ["ภูตรอบขอบสนามยิงเส้นตรง", "Tank: ดึงลูกน้องไปขอบตะวันตก/ตะวันออก"], 30)],
                  "t2-sprite", "ภูตที่วิ่งรอบขอบสนามยิงเส้นตรงเข้ามา Tank ดึงลูกน้องไปขอบตะวันตกหรือตะวันออก แล้วหันกล้องไปฝั่งตรงข้าม",
                  "The spirits on the edge fire line AoEs; tank, pull to the west or east edge and point the camera across"),
    "t2-kotengu": ("v2", 26, [(428, 202, 195, 40), (438, 258, 165, 45), (623, 432, 155, 65), (418, 502, 245, 45), (0, 368, 145, 45)],
                   [RG(520, 330, 150), L(600, 30, ["Leftward Blows: cone ด้านหน้า", "แล้ว cone ทางซ้าย (ตามชื่อท่า)"], 30)],
                   "t2-kotengu", "Shishu kotengu: Backward / Leftward / Rightward Blows ตี cone ด้านหน้าก่อน แล้วตีไปทางที่ร่าย",
                   "Shishu kotengu: Backward / Leftward / Rightward Blows hit a front cone first, then the cast's direction"),
    "t2-onmitsu": ("v2", 100, [(468, 348, 235, 60), (658, 342, 115, 40), (508, 388, 275, 155), (0, 362, 185, 45)],
                   [RG(540, 360, 150), L(20, 30, ["Huton: Juji Shuriken 3 ครั้งติด", "เส้นตรงใส่ผู้เล่นแบบสุ่ม"], 30)],
                   "t2-onmitsu", "Shishu onmitsugashira: Huton = Juji Shuriken (เส้นตรงใส่ผู้เล่นสุ่ม) 3 ครั้งติดกัน",
                   "Shishu onmitsugashira: Huton = Juji Shuriken (a line at a random player) three times in a row"),
    "b2-seal": ("v2", 226, [(483, 38, 155, 40), (408, 176, 225, 38), (643, 340, 105, 40), (388, 398, 295, 135), (628, 428, 215, 75), (0, 358, 165, 55)],
                [RG(500, 260, 170), L(20, 30, ["Seal of Scurrying Sparks: pair stack 2 คน", "Flame and Sulphur: หิน + ไฟบนสนาม"], 30)],
                "b2-seal", "Gorai: Seal of Scurrying Sparks ให้ pair stack 2 คน และ Flame and Sulphur ขึ้นหินกับไฟบนสนาม",
                "Gorai: Seal of Scurrying Sparks puts pair stacks on two players, and Flame and Sulphur raises rocks and fire"),
    "b2-ballad-b": ("v2", 241, [(448, 28, 155, 45), (288, 132, 515, 65), (648, 340, 115, 40), (493, 432, 115, 35), (628, 448, 155, 60), (0, 458, 145, 55)],
                    [RG(470, 250, 95), L(20, 400, ["Brazen Ballad: สามเหลี่ยมสีฟ้า = แตกตัว", "หิน → donut / ไฟ → แตกออก เพิ่ม 2 เส้น"], 30)],
                    "b2-ballad", "Brazen Ballad: พิณสามเหลี่ยมสีฟ้ารอบบอส = แตกตัว (หินเป็น donut / ไฟแตกออกเพิ่ม 2 เส้น)",
                    "Brazen Ballad: a blue triangle lute around the boss = split (rocks become donuts / fire splits, two more)"),
    "b2-ballad-p": ("v2", 323, [(463, 32, 170, 40), (293, 150, 505, 55), (468, 202, 185, 40), (583, 348, 115, 40), (0, 368, 165, 50), (623, 452, 155, 70)],
                    [RG(390, 250, 110), L(600, 30, ["Brazen Ballad: วงกลมสีชมพู = ขยาย", "หินวงใหญ่ขึ้น / ไฟกว้างขึ้น"], 30)],
                    "b2-ballad", "Brazen Ballad: พิณวงกลมสีชมพูรอบบอส = ขยาย (หินวงใหญ่ขึ้น / ไฟกว้างขึ้น)",
                    "Brazen Ballad: a pink round lute around the boss = expand (rocks grow / fire widens)"),
    "b2-hammer": ("v2", 395, [(368, 268, 125, 80), (623, 418, 145, 55), (513, 428, 105, 40), (0, 238, 145, 305)],
                  [RG(180, 100, 90), L(560, 400, ["Humble Hammer + ลำแสงไปหา Healer", "Tank รับลำแสงด้วย / DPS หลบ"], 30)],
                  "b2-hammer", "Thundercall → Humble Hammer: Healer ทำลูกสายฟ้าที่มุมให้เล็ก / Tank รับลำแสงกับ Healer / DPS หลบ",
                  "Thundercall → Humble Hammer: the healer shrinks a corner orb / the tank shares the beam / DPS stay out"),
    "b2-orbs": ("v2", 363, [(448, 12, 175, 40), (488, 198, 155, 65), (628, 412, 195, 115), (488, 468, 155, 40), (0, 198, 105, 75)],
                [RG(140, 200, 65), RG(940, 140, 60), L(20, 400, ["Thundercall: ลูกสายฟ้า 6 ลูก", "ดูลูกกลาง 2 ลูก เยื้องไปมุมไหน"], 30)],
                "b2-orbs", "Thundercall: ลูกสายฟ้า 6 ลูก ดูว่า 2 ลูกกลางเยื้องไปมุมไหน แล้ว Humble Hammer ไปลูกมุมฝั่งตรงข้าม",
                "Thundercall: six levin orbs; see which corner the middle two lean to, and hammer the far corner's orb"),
    "b2-rousing": ("v2", 515, [(188, 68, 155, 40), (228, 212, 155, 40), (618, 268, 145, 70), (628, 388, 155, 60), (523, 436, 115, 35), (388, 488, 235, 55)],
                   [RG(840, 170, 95), L(20, 400, ["Rousing Reincarnation: tower แดง/น้ำเงิน", "เข้า tower สีของ debuff ตามเลข"], 30)],
                   "b2-rousing", "Rousing Reincarnation: tower แดง/น้ำเงินขึ้นทีละรอบ เข้า tower สีเดียวกับ debuff ตามเลขของตัวเอง",
                   "Rousing Reincarnation: red/blue towers a round at a time; take the tower of your debuff's colour in your round"),
    "b2-exa": ("v2", 580, [(403, 440, 135, 40), (518, 428, 115, 35), (643, 432, 135, 40), (683, 340, 75, 40), (0, 352, 145, 55), (848, 18, 115, 40)],
               [RG(500, 190, 210), L(20, 400, ["Cloud to Ground: exaflare", "หลบไปพร้อมกับรับ debuff"], 30)],
               "b2-exa", "Cloud to Ground: AoE วงกลมเดินตามลูกศรทีละช่อง (exaflare) หลบไปพร้อมกับรับ spread / pair stack",
               "Cloud to Ground: circles marching along their arrows (exaflares); dodge them while taking spread / pairs"),
    "b2-dice": ("v2", 690, [(508, 502, 155, 45), (568, 458, 95, 35), (0, 358, 145, 45)],
                [RG(565, 360, 65), L(20, 30, ["Fighting Spirits: ลูกเต๋าบนหัว (เลข 1–4)", "ไป Marker ตามเลข รับทีละคน"], 30)],
                "b2-dice", "Fighting Spirits: ลูกเต๋าบนหัวบอกเลข 1–4 ไปที่ Marker ตามเลขแล้วรับทีละคน",
                "Fighting Spirits: the dice over your head shows 1–4; go to that marker and take it in turn"),
    "b2-malformed": ("v2", 1030, [(463, 48, 155, 40), (0, 412, 125, 45), (518, 426, 115, 35), (443, 486, 175, 40)],
                     [RG(760, 300, 130), L(20, 30, ["Malformed Reincarnation: tower 3 ครั้ง", "tower จาก Prayer: วางในที่ว่าง"], 30)],
                     "b2-malformed", "Malformed Reincarnation: ทุกคนเข้า tower 3 ครั้ง วาง tower จาก Malformed Prayer ในที่ว่าง",
                     "Malformed Reincarnation: everyone takes three towers; drop the Malformed Prayer tower in an empty spot"),
    "b3-kenki": ("v3", 8, [(468, 230, 135, 40), (628, 326, 155, 80), (448, 396, 175, 40)],
                 [RG(520, 360, 160), L(20, 30, ["Kenki Release: raid-wide", "ใช้ mitigate"], 32)],
                 "b3-kenki", "Moko: Kenki Release = raid-wide ใช้ mitigate",
                 "Moko: Kenki Release = raid-wide; mitigate"),
    "b3-kasumi": ("v3", 80, [(473, 123, 155, 40), (453, 186, 85, 35), (663, 343, 100, 40), (548, 370, 95, 35), (0, 358, 175, 55), (513, 430, 105, 35)],
                  [RG(575, 225, 65), L(20, 400, ["Triple Kasumi-giri: สัญลักษณ์เหนือหัวบอส", "น้ำ = donut ใน target circle ปลอดภัย / ไฟ = ในวงโดน"], 28)],
                  "b3-kasumi", "Triple Kasumi-giri: สัญลักษณ์น้ำเหนือหัวบอส = donut 270° (ใน target circle ปลอดภัย) ไฟ = ในวงโดน",
                  "Triple Kasumi-giri: a water mark over the boss = a 270° donut (safe in the target circle); fire = inside is hit"),
    "b3-scarlet": ("v3", 128, [(488, 98, 155, 40), (448, 205, 155, 40), (283, 230, 95, 35), (388, 358, 235, 45), (523, 430, 115, 35), (0, 208, 65, 40)],
                   [RG(560, 250, 175), L(20, 400, ["Boundless Scarlet: รอยฟันกากบาท + แนวนอน", "AoE ขยายจากรอยฟัน เหลือมุมปลอดภัย"], 30)],
                   "b3-scarlet", "Boundless Scarlet: รอยฟันกากบาทกับแนวนอนบนพื้น AoE จะขยายออกจากรอยฟันจนเหลือมุมปลอดภัย",
                   "Boundless Scarlet: an X and horizontal slash marks; AoEs widen out of them until a corner is safe"),
    "b3-iai": ("v3", 188, [(523, 0, 155, 40), (603, 340, 175, 40), (0, 358, 180, 45), (518, 432, 115, 35)],
               [RG(600, 60, 60), L(20, 30, ["Fleeting Iai-giri: สายจากบอส", "270° ยึดทิศที่คนได้สายหัน"], 30)],
               "b3-iai", "Fleeting Iai-giri: สายจากบอสไปหาผู้เล่น 1 คน iai 270° ยึดทิศที่คนได้สายหันหน้าตอนสุดท้าย",
               "Fleeting Iai-giri: a tether from the boss to one player; the 270° iai goes by the way they face at the end"),
    "b3-twin": ("v3", 392, [(0, 328, 145, 125), (408, 492, 195, 40), (488, 418, 75, 45), (448, 338, 75, 35)],
                [RG(150, 240, 85), RG(1000, 250, 85), L(300, 30, ["Shadow-twin: เงา 2 ตัว iai 2 ครั้ง", "ลูกแรกปลอดภัยด้านหลังเสมอ"], 30)],
                "b3-twin", "Shadow-twin: เงาของบอส 2 ตัว iai 2 ครั้ง ลูกแรกปลอดภัยด้านล่าง (ด้านหลัง) เสมอ จำลูกที่ 2",
                "Shadow-twin: two shadows, two iai each; the first is always safe below (behind); remember the second"),
    "b3-azure": ("v3", 480, [(463, 90, 155, 40), (438, 125, 195, 40), (663, 348, 100, 40), (0, 363, 175, 50), (488, 416, 125, 75)],
                 [RG(540, 190, 75), L(600, 400, ["Azure Auspice → Triple Kasumi-giri", "หลบ AoE ของ Azure + ดูที่ปลอดภัย Kasumi"], 28)],
                 "b3-azure", "Boundless Azure: AoE ขึ้นทีละลูกจากรอยฟัน ระหว่างนั้นบอสตั้งท่า Triple Kasumi-giri ดูที่ปลอดภัยให้ทัน",
                 "Boundless Azure: AoEs go off one by one from the slash marks while the boss readies Triple Kasumi-giri"),
    "b3-soldiers": ("v3", 520, [(648, 194, 155, 40), (608, 348, 135, 40), (708, 366, 135, 65), (0, 343, 185, 55), (508, 466, 115, 35), (628, 512, 195, 35)],
                    [RG(170, 210, 80), L(560, 30, ["Soldiers of Death: ทหารผีที่ขอบสนาม", "หาตัวสีน้ำเงินก่อน ตัวแดงไม่ต้องสนใจ"], 30)],
                    "b3-soldiers", "Soldiers of Death: ทหารผีขึ้นที่ขอบสนาม หาตัวสีน้ำเงินก่อน ตัวสีแดงไม่ต้องสนใจ",
                    "Soldiers of Death: soldiers appear on the edge; find the blue one first and ignore the red ones"),
}


# second pass: what the first boxes missed, read off the contact sheets
EXTRA = {
    "t1-order": [(0, 50, 190, 40)],
    "t1-raiko": [(455, 385, 170, 40)],
    "t1-fuko": [(225, 160, 290, 50), (585, 330, 210, 50), (0, 330, 190, 130), (285, 435, 190, 45), (335, 500, 70, 35)],
    "t1-yuki": [(0, 360, 190, 40), (430, 375, 120, 40), (690, 485, 120, 45), (465, 420, 50, 35)],
    "b1-enkyo": [(465, 55, 160, 40), (370, 275, 190, 45), (640, 355, 80, 35), (0, 365, 90, 35), (740, 410, 50, 35)],
    "b1-smoke": [(700, 200, 220, 70), (780, 270, 150, 40), (625, 440, 100, 35)],
    "b1-line1": [(770, 400, 80, 45), (770, 440, 90, 30), (480, 270, 120, 45)],
    "b1-line2": [(0, 370, 90, 35)],
    "b1-cry": [(430, 85, 110, 40), (40, 175, 120, 45), (430, 195, 120, 35), (30, 260, 130, 50), (365, 320, 110, 35), (770, 485, 60, 30)],
    "b1-noble": [(360, 118, 520, 45), (455, 478, 90, 35), (0, 400, 70, 130)],
    "b1-yuki": [(480, 225, 170, 40), (800, 330, 100, 50), (340, 240, 70, 35), (500, 275, 110, 35), (820, 395, 80, 35)],
    "b1-bolt": [(0, 320, 90, 190), (520, 465, 110, 35), (1040, 150, 60, 50), (40, 365, 100, 35), (1030, 180, 70, 50), (950, 170, 80, 40)],
    "b1-vortex": [(40, 365, 150, 35), (520, 430, 70, 35)],
    "b1-souls": [(0, 170, 80, 180), (860, 50, 80, 35)],
    "b1-tvortex": [(490, 300, 150, 40), (725, 262, 70, 35), (680, 345, 40, 35)],
    "b1-bolt2": [(550, 75, 110, 40), (680, 210, 100, 40), (0, 270, 190, 270), (940, 250, 100, 35), (540, 130, 110, 35), (880, 250, 80, 35)],
    "t2-order": [(585, 85, 160, 35), (480, 435, 140, 40)],
    "t2-onmitsu": [(420, 400, 110, 70)],
    "b2-seal": [(585, 305, 80, 40), (640, 300, 60, 40), (640, 185, 110, 35), (660, 295, 110, 35), (650, 385, 90, 35)],
    "b2-ballad-b": [(0, 360, 160, 40), (405, 255, 60, 35), (330, 245, 60, 35), (320, 205, 60, 35)],
    "b2-ballad-p": [(370, 210, 110, 40), (580, 343, 180, 40), (780, 475, 80, 40), (505, 430, 80, 35)],
    "b2-hammer": [(60, 185, 120, 55), (670, 195, 80, 35)],
    "b2-orbs": [(440, 65, 210, 35), (440, 215, 70, 30), (420, 265, 220, 35), (430, 470, 230, 35), (0, 365, 100, 30), (520, 430, 90, 35)],
    "b2-rousing": [(0, 365, 90, 30)],
    "b2-malformed": [(0, 355, 100, 35), (570, 465, 70, 30)],
    "b3-kenki": [(620, 320, 200, 160), (440, 395, 200, 90), (0, 360, 90, 35)],
    "b3-scarlet": [(0, 360, 120, 35), (270, 275, 60, 35), (355, 305, 50, 30)],
    "b3-iai": [(620, 300, 90, 40), (420, 412, 80, 30), (720, 480, 60, 30)],
    "b3-soldiers": [(500, 435, 110, 35)],
    "t2-kotengu": [(510, 385, 70, 35)],
    "t2-sprite": [(740, 395, 50, 50)],
    "b2-exa": [(700, 260, 70, 30)],
    "b2-dice": [(355, 190, 60, 30), (505, 435, 70, 30)],
    "b3-azure": [(330, 270, 100, 60), (510, 290, 140, 35)],
}
MOVE = {"t2-sprite": (420, 30, 28), "b2-ballad-p": (430, 30, 28), "b2-hammer": (470, 420, 28), "b3-azure": (420, 400, 26)}

only = [a for a in sys.argv[1:]] or list(F)
for name in only:
    v, t, blur, marks, key, say, say_en = F[name]
    src = f"{M}/fr/{v}-{t}.png"
    if not os.path.exists(src):
        FF = r"scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe"
        subprocess.run([FF, "-loglevel", "error", "-y", "-ss", str(t), "-i", f"{M}/vid/{V[v]}.mp4", "-frames:v", "1", src])
    if name in MOVE:
        x, y, sz = MOVE[name]
        marks = [dict(m, at=[x, y], size=sz) if m["t"] == "label" else m for m in marks]
    spec = {"src": src, "out": f"{OUT}/{name}.webp", "crop": list(CROP), "blur": [list(b) for b in blur + EXTRA.get(name, []) + [BOTTOM]], "marks": marks, "width": 1000}
    p = f"{M}/specs/{name}.json"
    json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], cwd=WT, capture_output=True, text=True)
    print(name, (r.stdout.strip() or r.stderr.strip()[:300])[-50:])

# refs for gen.py: key -> [(src, say, say_en, by, url)]
refs = {}
for name, (v, t, blur, marks, key, say, say_en) in F.items():
    refs.setdefault(key, []).append((f"frames/rokkon-savage/{name}.webp", say, say_en, "Hamukatsu", f"https://youtu.be/{V[v]}?t={t}"))
open(f"{M}/tools/refs.py", "w", encoding="utf-8").write("REFS = " + json.dumps(refs, ensure_ascii=False, indent=1) + "\n")
print("refs", sum(len(x) for x in refs.values()))
