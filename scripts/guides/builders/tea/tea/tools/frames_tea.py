"""Footage pictures for TEA from Nukemaru's 絶アレキ 濃厚解説 videos: wide crop that leaves out his mascot,
subtitle box and minimap drawing, every Japanese text and player name blurred, our own ring + Thai label.
Writes specs to ../specs, pictures to data/frames/tea, and the captions to frames.json (read by frames_list.py).
usage (repo root): python3 scripts/guides/builders/tea/tea/tools/frames_tea.py [name ...]"""
import sys, json, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
W = "scripts/guides/.work/tea"
OUT = "scripts/guides/data/frames/tea"
SPECS = os.path.join(HERE, "..", "specs")
os.makedirs(OUT, exist_ok=True)
os.makedirs(SPECS, exist_ok=True)
VIDS = {"ll": "AMdtMyvbPNs", "bj": "yuLjtpm2ti8", "ap": "3wtfeXognIY", "pa": "9YgDXyUWbiQ"}

# video frame is 1280x720; crop x0..x0+853, y 0..480 (16:9, above the mascot and subtitles, left of the minimap)
STD = [(160, 0, 115, 65), (785, 365, 235, 115), (465, 450, 350, 30), (405, 385, 100, 50), (700, 415, 90, 50)]
FOCUS = [(700, 228, 320, 122)]   # focus target, cast bar, target bar
NOFOCUS = {"ap-chastening": [], "ll-tethers": [(755, 236, 125, 30), (755, 322, 120, 16), (925, 320, 120, 20)]}
BOX = [(160, 60, 95, 250)]   # the creator's mitigation box, top left
RG = lambda x, y, r: {"t": "ring", "at": [x, y], "r": r}
AR = lambda a, b: {"t": "arrow", "from": a, "to": b}

# name: (video, second, crop x0, extra blur boxes (video coords), marks (video coords), label lines, Thai caption, English caption)
F = {
    "ll-hand": ("ll", 88, 100, [(640, 158, 110, 25), (600, 240, 70, 25), (500, 250, 220, 60), (660, 170, 200, 25), (340, 295, 130, 100), (590, 345, 80, 30), (700, 355, 110, 70),
                                (180, 190, 140, 25), (100, 195, 70, 25), (590, 380, 80, 30)],
                [RG(230, 285, 95), RG(830, 280, 110)], ["Hand of Pain: HP% ของ Living Liquid", "กับ Hand ต้องห่างกันไม่เกิน 5%"],
                "Hand of Pain: HP% ของ Living Liquid (ขวา) กับ Liquid Hand (ซ้าย) ต้องห่างกันไม่เกิน 5%",
                "Hand of Pain: keep Living Liquid (right) and the Liquid Hand (left) within 5% HP"),
    "ll-open": ("ll", 280, 160, [(400, 278, 80, 22), (560, 370, 70, 25), (460, 140, 70, 22), (160, 0, 180, 65), (320, 285, 50, 25), (590, 195, 100, 25), (410, 405, 60, 25), (700, 350, 120, 30), (440, 420, 60, 40)],
                [RG(410, 365, 85), RG(660, 290, 110)], ["Cascade: Hand โผล่ ST ลากออกห่าง", "Living Liquid → Hand เป็นมือแบ"],
                "Cascade ครั้งแรก: Liquid Hand โผล่ ST ลาก Hand ออกห่าง Living Liquid ให้เป็นมือแบ",
                "The first Cascade: the Liquid Hand appears; the ST pulls it away from Living Liquid for an open palm"),
    "ll-dolls": ("ll", 291, 160, [(500, 295, 80, 25), (400, 395, 100, 30), (350, 240, 60, 20), (160, 0, 180, 65), (305, 98, 45, 18), (465, 105, 90, 20), (345, 240, 90, 22), (775, 185, 60, 20),
                                   (515, 410, 100, 25), (690, 340, 40, 30), (200, 90, 130, 60)],
                 [RG(520, 140, 55), RG(370, 255, 55)], ["Jagd Doll: DPS รับ Doll ของตัวเอง", "HP ต่ำกว่า 25% แล้วค่อยป้อนให้บอส"],
                 "Jagd Doll โผล่: DPS รับ Doll ของตัวเอง ป้อนให้บอสเมื่อ HP ต่ำกว่า 25%",
                 "The Jagd Dolls appear: each DPS takes their own and feeds it to a boss under 25% HP"),
    "ll-tethers": ("ll", 424, 160, [(500, 255, 130, 65), (700, 210, 100, 25), (840, 280, 190, 50), (650, 105, 130, 25), (560, 330, 120, 20), (160, 0, 220, 65), (860, 205, 60, 80), (585, 115, 120, 25), (605, 230, 120, 35), (795, 295, 45, 40),
                                    (605, 375, 60, 25), (465, 460, 70, 20)],
                   [RG(900, 300, 100)], ["สายพายุโยงหาผู้เล่น 2 คน", "Tank รับสาย: จบด้วย AoE tankbuster"],
                   "สายพายุ (tether) จากแอ่งน้ำ: Tank เป็นคนรับสาย จบด้วย AoE tankbuster รอบตัว",
                   "The tornado tethers from the puddles: the tanks take them; they end in an AoE tank buster"),
    "ll-throttle": ("ll", 536, 160, [(560, 320, 85, 75), (160, 0, 220, 65), (585, 125, 120, 25), (645, 240, 50, 30), (735, 345, 50, 30), (675, 405, 90, 20), (395, 390, 80, 25)],
                    [RG(620, 300, 130)], ["Cascade ครั้งที่ 2: stack เหนือ / ใต้", "6 คนติด Throttle: Healer ใช้ Esuna"],
                    "Cascade ครั้งที่ 2: stack เหนือ / ใต้ และ 6 คนติด Throttle ที่ Healer ต้อง Esuna",
                    "The second Cascade: stacks north / south, and six Throttles for the healers to Esuna"),
    "lc-numbers": ("ll", 1555, 160, [(620, 395, 100, 25), (160, 0, 220, 70), (740, 125, 150, 30), (430, 415, 70, 25), (585, 400, 200, 80), (880, 355, 140, 125),
                                      (460, 465, 420, 15)],
                   [RG(440, 260, 70)], ["Limit Cut: ระเบิด Hawk Blaster ทีละคู่", "รับดาบของ Cruise Chaser ตามเลข"],
                   "Limit Cut (1211): ระเบิด Hawk Blaster ลงทีละคู่ ผู้เล่นรับดาบ Cruise Chaser ตามเลขบนหัว",
                   "Limit Cut (1211): the Hawk Blasters go off in pairs while players take Cruise Chaser by their number"),
    "bj-judgment": ("bj", 282, 160, [(585, 95, 120, 20), (595, 220, 100, 20), (750, 296, 165, 20), (695, 338, 100, 15), (535, 365, 70, 20)],
                    [RG(610, 330, 110)], ["Judgment Nisi: ได้ Nisi", "+ Compressed Water / Lightning"],
                    "Judgment Nisi: บอสตรงกลาง ทุกคนยืนใกล้กลาง ได้ Nisi + Water / Lightning",
                    "Judgment Nisi: bosses in the middle, everyone close in, Nisis + Water / Lightning go out"),
    "bj-chakram": ("bj", 318, 160, [(325, 145, 50, 20), (885, 145, 60, 20), (440, 145, 60, 20), (585, 95, 100, 20), (300, 205, 60, 20), (440, 200, 70, 20), (920, 165, 60, 20), (940, 250, 50, 20),
                                    (850, 315, 50, 20), (690, 350, 100, 30), (370, 195, 60, 25)],
                   [RG(310, 260, 90), RG(850, 210, 90)], ["Chakram พุ่ง + Optical Sight", "ออกขอบ แล้วกลับเข้ากลาง"],
                   "Chakram 2 ลูกพุ่ง + Optical Sight: ออกไปขอบให้พ้นแนว แล้วกลับเข้ากลาง",
                   "Two Chakrams + Optical Sight: go to the edge out of their path, then back to the middle"),
    "bj-photon": ("bj", 345, 160, [(440, 80, 120, 25), (420, 280, 90, 25), (585, 90, 120, 25), (575, 135, 70, 20), (295, 245, 60, 20), (325, 285, 70, 25), (555, 295, 90, 40),
                                   (575, 335, 60, 40), (295, 175, 80, 30), (440, 230, 80, 25)],
                  [RG(380, 300, 90)], ["หลัง Photon: ส่ง Nisi ครั้งที่ 1", "ST·D2 / H1·D3 / H2·D4"],
                  "หลัง Photon: ส่ง Nisi ครั้งที่ 1 (MT กับ D1 ยังไม่ส่ง)",
                  "After Photon: the first Nisi pass (MT and D1 wait)"),
    "bj-spin": ("bj", 354, 160, [(720, 108, 90, 25), (640, 350, 80, 25), (730, 405, 60, 25), (410, 455, 70, 25), (585, 85, 140, 30), (555, 235, 90, 50), (585, 295, 100, 40), (690, 345, 100, 30)],
                [RG(720, 180, 110)], ["Spin Crusher: กรวยหน้า Cruise Chaser", "ใส่ aggro อันดับ 1: หลบไปข้างหลัง"],
                "Spin Crusher: กรวยหน้า Cruise Chaser ใส่ aggro อันดับ 1 MT หลบไปข้างหลัง",
                "Spin Crusher: a frontal cone from Cruise Chaser at its top aggro; the MT dodges behind it"),
    "bj-water": ("bj", 372, 160, [(680, 115, 90, 25), (440, 305, 90, 30), (585, 90, 130, 25), (420, 280, 60, 20), (555, 245, 130, 20), (615, 335, 90, 20), (690, 345, 100, 30)],
                 [RG(450, 330, 100)], ["Water: stack แชร์ อย่างน้อย 3 คน", "Lightning: 2 คนพอดี"],
                 "Compressed Water (stack แชร์ อย่างน้อย 3 คน) + Compressed Lightning (2 คนพอดี)",
                 "Compressed Water (shared by at least three) + Compressed Lightning (exactly two)"),
    "bj-enumeration": ("bj", 570, 160, [(580, 95, 130, 30), (505, 200, 70, 20), (845, 335, 60, 20)],
                       [RG(560, 330, 110), RG(860, 320, 90)], ["Enumeration: วงสีเหลือง", "ตะวันตก H1 D3 D1 / ตะวันออก H2 D4 D2"],
                       "Enumeration: วงสีเหลืองแบ่งตะวันตก / ตะวันออก",
                       "Enumeration: the yellow circles, split west / east"),
    "bj-shield": ("bj", 845, 160, [(330, 228, 100, 25), (570, 400, 70, 25), (265, 95, 70, 20), (355, 220, 70, 25), (495, 230, 70, 25), (695, 310, 90, 20), (695, 350, 110, 30)],
                  [RG(330, 230, 140)], ["Plasma Shield: DPS ตีจากด้านหน้า", "แตกแล้วเดินผ่าน tollgate ส่ง Nisi"],
                  "Plasma Shield หน้า Cruise Chaser: DPS ตีจากด้านหน้า แตกแล้วเดินผ่าน tollgate ส่ง Nisi",
                  "The Plasma Shield in front of Cruise Chaser: the DPS hit it from the front, then pass Nisi through the tollgate"),
    "bj-nisi": ("bj", 1020, 160, [(435, 90, 70, 20), (435, 160, 50, 20), (475, 180, 70, 20), (585, 260, 70, 25), (595, 280, 70, 20), (695, 350, 90, 30)],
                [RG(620, 270, 110)], ["ส่ง Nisi หลัง Verdict", "ให้ตรงกับ Final Judgment ของตัวเอง"],
                "ส่ง Nisi หลัง Verdict: ทุกคนต้องถือ Nisi ตรงกับ Final Judgment ของตัวเองตอน Gavel",
                "Passing Nisi after Verdict: everyone must hold the Nisi matching their Final Judgment at Gavel"),
    "bj-jump": ("bj", 1056, 160, [(420, 80, 140, 25), (540, 385, 110, 30), (480, 145, 90, 30), (585, 90, 80, 20), (735, 170, 60, 20), (695, 345, 100, 30), (535, 380, 30, 25)],
                [RG(600, 320, 110)], ["Photon → Double Rocket Punch", "tankbuster แชร์ 2 คน"],
                "Photon ทำให้ Tank เหลือ HP 1 แล้วตามด้วย Double Rocket Punch (tankbuster แชร์ 2 คน)",
                "Photon drops the tanks to 1 HP, then Double Rocket Punch (a two-tank shared buster)"),
    "bj-ray": ("bj", 1082, 160, [(635, 90, 90, 20), (595, 285, 130, 20), (695, 345, 110, 30)],
               [RG(640, 330, 110)], ["หลัง Apocalyptic Ray", "Whirlwind 2 ครั้ง → enrage"],
               "หลัง Apocalyptic Ray: Cruise Chaser ใช้ Whirlwind 2 ครั้ง แล้วบอสทั้งสองร่าย enrage",
               "After Apocalyptic Ray: two Whirlwinds from Cruise Chaser, then both bosses cast their enrage"),
    "ts-blue": ("ap", 218, 160, [(160, 0, 110, 65), (515, 165, 50, 40), (525, 220, 130, 45), (695, 335, 110, 20), (785, 370, 140, 20)],
                [RG(620, 330, 90)], ["Temporal Stasis: ดูสีสายของตัวเอง", "น้ำเงิน / แดง-เขียว / ไม่มีสาย"],
                "Temporal Stasis: ดูว่าตัวเองได้สายสีอะไร (น้ำเงิน / แดง-เขียว) หรือไม่มี แล้วไปตามตำแหน่งของแผน",
                "Temporal Stasis: check which tether you have (blue / red-green) or none, then go to the plan's spot"),
    "ts-aggravated": ("ap", 262, 160, [(160, 0, 110, 65), (595, 245, 70, 30), (695, 315, 90, 35), (695, 345, 100, 40)],
                      [RG(620, 360, 90)], ["Aggravated Assault (ไอคอนบนหัว)", "ยืนห่างคนอื่น ไปขอบสนาม"],
                "Aggravated Assault: ไอคอนบนหัว ไปยืนขอบสนามห่างคนอื่น (แผนนี้: ฝั่ง Brute Justice)",
                "Aggravated Assault: the icon overhead; stand out at the edge away from others (this plan: Brute Justice's side)"),
    "ap-inception": ("ap", 548, 160, [(195, 255, 50, 20), (160, 0, 110, 65), (195, 280, 50, 20), (415, 405, 70, 40), (715, 425, 30, 20)],
                     [RG(230, 95, 110)], ["Inception: ลูกเขียวโยงสาย", "เดินไปทาง Alexander ให้สายไขว้"],
                     "Inception Formation: ลูกเขียวโยงสายมาที่ 4 คน เดินไปทาง Alexander ให้สายไขว้กัน",
                     "Inception Formation: green orbs tether four players; walk towards Alexander with the tethers crossed"),
    "ap-flare": ("ap", 636, 160, [(550, 290, 140, 80), (160, 0, 110, 65), (555, 315, 110, 30), (595, 350, 70, 20), (635, 235, 70, 40), (695, 325, 70, 30)],
                 [RG(610, 360, 110)], ["Flarethrower 3 ครั้ง", "Brute Justice ยิงใส่ 3 คนที่ใกล้สุด"],
                "Flarethrower: Brute Justice ยิงใส่ 3 คนที่ใกล้ที่สุด เริ่มจากคนใกล้สุด",
                "Flarethrower: Brute Justice fires at the three closest players, nearest first"),
    "wh-one": ("ap", 944, 160, [(160, 0, 110, 65), (585, 335, 120, 45), (595, 420, 100, 25)],
               [RG(640, 410, 80), RG(290, 230, 80)], ["Wormhole: ดูเลข Limit Cut บนหัว", "เลขคี่หันออกนอก + Arm's Length / Surecast"],
                "Wormhole Formation: ดูเลข Limit Cut บนหัว เลขคี่หันหน้าออกนอกสนามและใช้ Arm's Length / Surecast",
                "Wormhole Formation: read the Limit Cut number overhead; odd numbers face out and use Arm's Length / Surecast"),
    "wh-void": ("ap", 966, 160, [(640, 335, 60, 25), (160, 0, 110, 65), (515, 180, 110, 25), (555, 250, 50, 25), (615, 340, 50, 25), (695, 320, 110, 55), (495, 350, 70, 20)],
                [RG(560, 410, 90)], ["Wormhole: แอ่ง Void", "รับ 3 รอบ: 5+6 / 7+8 / 1+2"],
                "Wormhole Formation: แอ่ง Void ต้องรับ 3 รอบ (5+6 / 7+8 / 1+2) รับแต่ละครั้งแอ่งเล็กลง",
                "Wormhole Formation: the Void puddles are soaked three times (5+6 / 7+8 / 1+2), shrinking each time"),
    "wh-enum": ("ap", 1208, 160, [(160, 0, 110, 65), (425, 245, 80, 30), (495, 285, 70, 20), (555, 295, 110, 40), (635, 325, 90, 25), (695, 295, 70, 20)],
                [RG(430, 300, 90), RG(600, 370, 110)], ["Incinerating Heat แล้ว Enumeration", "วงสีเหลือง 2 วง"],
                "จบ Wormhole: stack Incinerating Heat แล้วต่อด้วย Enumeration (วงสีเหลือง)",
                "The end of Wormhole: the Incinerating Heat stack, then Enumeration (the yellow circles)"),
    "ap-megaholy": ("ap", 1243, 160, BOX + [(530, 275, 160, 35), (670, 225, 40, 60), (600, 5, 110, 25), (555, 50, 70, 20), (535, 275, 150, 20), (555, 295, 90, 70), (605, 195, 60, 25)],
                    [RG(600, 230, 150)], ["Mega Holy 2 ครั้งติดกัน", "mitigate ให้คลุมทั้ง 2 ครั้ง"],
                "Mega Holy 2 ครั้งติดกัน: กด mitigate ก่อนร่ายเสร็จให้คลุมทั้ง 2 ครั้ง",
                "Mega Holy twice in a row: mitigate just before the cast ends to cover both"),
    "ap-jwave": ("ap", 1274, 160, [(650, 280, 50, 25), (160, 60, 95, 210), (555, 60, 70, 20), (635, 275, 90, 30), (595, 355, 60, 20)],
                 [RG(590, 200, 140)], ["J Wave: raid-wide ทุก GCD", "ฆ่า Cruise Chaser → Brute Justice → Alexander"],
                 "J Wave: raid-wide ราวทุก GCD แรงขึ้นเรื่อยๆ ฆ่า Cruise Chaser → Brute Justice → Alexander Prime",
                 "J Waves: raid-wide about every GCD, getting stronger; kill Cruise Chaser → Brute Justice → Alexander Prime"),
    "ap-divine": ("ap", 1340, 160, [(650, 275, 90, 30), (620, 335, 60, 25), (535, 20, 90, 20), (635, 290, 70, 20), (675, 340, 50, 20), (615, 365, 80, 20)],
                  [RG(620, 180, 150)], ["Divine Judgment: นับถอยหลัง", "Tank LB3 ตอนเหลือราว 4 วินาที"],
                  "Divine Judgment: ฆ่า Alexander Prime แล้วเริ่มนับถอยหลัง Tank LB3 ตอนเหลือราว 4 วินาที",
                  "Divine Judgment: the countdown after Alexander Prime dies; tank LB3 at about 4 seconds"),
    "pa-stack": ("pa", 289, 160, [(755, 285, 190, 30), (625, 320, 40, 20)],
                 [RG(560, 290, 140)], ["หลัง Forced March: spread / stack", "ลำดับสุ่ม (ภาพนี้: spread มาก่อน)"],
                "หลัง Forced March: spread กับ stack ลำดับสุ่ม (ภาพนี้ spread มาก่อน)",
                "After the Forced March: a spread and a stack in random order (here the spread first)"),
    "pa-march": ("pa", 361, 160, [(755, 295, 170, 25), (715, 365, 90, 40)],
                 [RG(640, 310, 120)], ["Forced March: The Final Word ทำงาน", "Light เดินเข้าหา Light Beacon"],
                "Forced March: debuff ของ The Final Word ทำงาน คน Light ถูกพาเดินเข้าหา Light Beacon",
                "Forced March: The Final Word's debuffs resolve; Light players are marched towards the Light Beacon"),
    "pa-alpha": ("pa", 649, 160, [(310, 365, 50, 20), (415, 365, 50, 25), (555, 55, 70, 20), (470, 470, 330, 15)],
                 [RG(340, 420, 90)], ["Fate Calibration α เกิดจริง", "Aggravated Assault ไปขวา"],
                 "Fate Calibration α เกิดจริง: Aggravated Assault ไปฝั่งขวา (ตะวันออก)",
                 "Fate Calibration α resolving: Aggravated Assault goes right (east)"),
    "pa-ocp": ("pa", 1441, 160, [(555, 25, 90, 40), (735, 325, 70, 30)],
               [RG(560, 380, 110)], ["Ordained Capital Punishment", "tankbuster แล้วสลับ Tank"],
               "Ordained Capital Punishment: tankbuster ใส่ Tank แล้วสลับ Tank",
               "Ordained Capital Punishment: a tank buster, then a tank swap"),
    "pa-beta": ("pa", 793, 160, [(595, 215, 60, 25), (695, 325, 90, 25), (555, 295, 70, 30), (685, 135, 40, 30)],
                [RG(620, 330, 110)], ["Fate Calibration β เริ่ม", "ดูโคลนของตัวเอง: Light / Dark + สาย"],
                "Fate Calibration β เกิดจริง: ดูโคลนของตัวเองว่าเป็น Light / Dark และได้สายอะไร",
                "Fate Calibration β resolving: your clone shows whether you are Light / Dark and which tether"),
    "pa-beta-jump": ("pa", 1105, 160, [(575, 365, 70, 40), (715, 140, 110, 20), (725, 220, 110, 30), (465, 345, 100, 25), (160, 240, 60, 25)],
                     [RG(110 + 160, 215, 80)], ["β: Dark Beacon / Dark ไม่มีสาย", "ไปขอบล่อ Super Jump"],
                     "β: หลัง Forced March Dark Beacon กับ Dark ไม่มีสายไปขอบสนาม ล่อ Super Jump",
                     "β: after the march the Dark Beacon and the no-tether Dark go to the edge to bait Super Jump"),
    "pa-exatrine": ("pa", 1297, 160, [(575, 15, 110, 30), (635, 325, 50, 25)],
                    [RG(640, 330, 120)], ["Exatrine: รอที่จุดชุดที่ 3", "ชุดแรกลงแล้วเข้าไปจุดนั้น"],
                    "Exatrine: เริ่มที่จุดของชุดที่ 3 ที่ติดกับชุดแรก พอชุดแรกลงแล้วเข้าไปจุดนั้น",
                    "Exatrines: start on the third-set spot next to the first, step into the first spot once it lands"),
    "pa-grace": ("pa", 1465, 160, [(160, 0, 95, 300), (635, 335, 70, 20), (415, 380, 70, 25)],
                 [RG(560, 230, 150)], ["Irresistible Grace: stack 8 คน", "mitigate หนัก"],
                 "Irresistible Grace หลัง Exatrine: stack 8 คน ต้อง mitigate หนัก",
                 "Irresistible Grace after each Exatrine: an 8-player stack that needs heavy mitigation"),
    "pa-prison": ("pa", 1497, 160, [(755, 275, 150, 20), (395, 375, 90, 50), (395, 310, 40, 20), (515, 90, 70, 25), (970, 225, 45, 255)],
                  [RG(400, 210, 100), RG(640, 380, 110)], ["Temporal Prison: คุก 7 อัน", "เข้าตามลำดับ (enrage)"],
                  "Temporal Prison (hard enrage): คุก 7 อันเริ่มตะวันออกเฉียงเหนือ วนตามเข็มนาฬิกา เข้าตามลำดับ",
                  "Temporal Prison (the hard enrage): seven jails from the north-east, clockwise, filled in order"),
    "bj-optical": ("bj", 322, 160, [(915, 198, 55, 28), (395, 102, 100, 42), (600, 78, 90, 28), (805, 165, 70, 30), (240, 110, 100, 40), (440, 85, 80, 25), (835, 190, 60, 25), (285, 120, 50, 25), (395, 140, 60, 25), (520, 85, 90, 25), (520, 0, 160, 40), (640, 290, 90, 45), (800, 330, 120, 40), (560, 130, 120, 40), (380, 140, 60, 30)],
                   [RG(330, 270, 115)], ["Chakram พุ่ง + Optical Sight", "AoE ล็อกตำแหน่งที่ยืน: กลับเข้ากลาง"],
                   "Optical Sight: AoE วงใหญ่ล็อกตำแหน่งที่ทุกคนยืนตอน Chakram พุ่ง ทุกคนกลับเข้ากลาง",
                   "Optical Sight: big AoEs locked on everyone's spot as the Chakrams fly; everyone returns to the middle"),
    "bj-gavel": ("bj", 1036, 160, [(575, 330, 70, 35), (560, 330, 90, 40), (680, 315, 70, 25), (510, 95, 260, 80), (500, 262, 130, 36), (840, 300, 120, 40)],
                 [RG(580, 320, 150)], ["Gavel (หลัง Verdict)", "ทุกคนต้องถือ Nisi ตรงกับ Final Judgment"],
                 "Gavel: ตอนร่ายเสร็จทุกคนต้องถือ Nisi ตรงกับ Final Judgment ของตัวเอง แล้ว debuff ทั้งหมดหายไป",
                 "Gavel: when it finishes everyone must hold the Nisi matching their Final Judgment; then every debuff is removed"),
    "pa-ordained": ("pa", 60, 160, [(625, 280, 60, 28), (250, 118, 60, 32), (670, 280, 50, 25), (560, 380, 60, 30), (740, 300, 200, 40), (600, 320, 100, 30), (430, 380, 90, 40)],
                    [RG(420, 170, 110)], ["Ordained Motion / Stillness", "สัญลักษณ์ขึ้นที่ 3 คน แต่ใช้กับทั้งปาร์ตี้"],
                    "Ordained Motion / Stillness: สัญลักษณ์ขึ้นที่ 3 คน แต่ใช้กับทั้งปาร์ตี้",
                    "Ordained Motion / Stillness: three players get the indicator, but it applies to the whole party"),
    "ap-chastening": ("ap", 270, 250, [(335, 232, 115, 32), (800, 228, 110, 32), (345, 255, 95, 32), (805, 255, 90, 28), (220, 245, 130, 30), (620, 230, 100, 26), (520, 145, 240, 60), (270, 245, 80, 30), (540, 200, 260, 100), (700, 240, 120, 30), (680, 370, 240, 110), (560, 160, 190, 45), (560, 222, 240, 70), (690, 390, 230, 90), (880, 370, 230, 110), (250, 410, 100, 70),
                                       (330, 268, 100, 34), (780, 258, 140, 36)],
                      [RG(632, 267, 170)], ["Alexander Prime กลับมากลางสนาม", "Chastening Heat ใส่ Tank: ครั้งแรก ST invuln"],
                      "Alexander Prime โผล่กลางสนาม แล้วร่าย Chastening Heat ใส่ Tank (ครั้งแรก ST invuln)",
                      "Alexander Prime appears in the middle, then casts Chastening Heat on the tank (the first one: ST invuln)"),
}


# extra blur boxes read off the finished 1000 px picture (output pixels), for what the first pass missed
OUTBOX = {
    "bj-photon": [(450, 320, 140, 35)],
    "bj-shield": [(360, 230, 110, 32), (550, 400, 100, 28), (540, 365, 70, 25)],
    "bj-spin": [(395, 385, 110, 30), (650, 455, 100, 28), (680, 138, 120, 28)],
    "bj-water": [(700, 320, 110, 28), (790, 105, 120, 28)],
    "bj-jump": [(600, 430, 110, 28), (500, 75, 110, 25)],
    "bj-chakram": [(540, 50, 110, 30)],
    "bj-judgment": [(510, 238, 110, 28), (770, 240, 140, 28), (550, 78, 130, 25)],
    "bj-enumeration": [(450, 232, 120, 28)],
    "ll-throttle": [(590, 455, 90, 28), (540, 78, 130, 25)],
    "ll-tethers": [(590, 365, 100, 28), (520, 82, 130, 25), (480, 330, 150, 90)],
    "ll-open": [(540, 140, 130, 28), (490, 330, 80, 28), (560, 488, 80, 25)],
    "ll-hand": [(600, 200, 70, 25)],
    "lc-numbers": [(580, 440, 160, 30)],
    "ap-megaholy": [(430, 298, 140, 30)],
    "ap-jwave": [(570, 488, 70, 25)],
    "pa-stack": [(540, 400, 70, 25)],
}

# the label goes top left (over the blurred phase banner) unless that hides what is watched
LABEL_AT = {"ap-inception": [12, 372], "pa-beta-jump": [12, 372], "bj-chakram": [12, 372]}


def spec(name):
    v, t, x0, extra, marks, lines, say, say_en = F[name]
    src = f"{W}/cand/{VIDS[v]}-{t}.png"
    if not os.path.exists(src):
        subprocess.run(["python3", os.path.join(HERE, "grab.py"), VIDS[v], str(t)], check=True, capture_output=True)
    cw, ch = 853, 480
    boxes = []
    for (x, y, w, h) in STD + NOFOCUS.get(name, FOCUS) + list(extra):
        bx, by = x - x0, y
        if bx + w <= 0 or bx >= cw or by >= ch:
            continue
        if bx < 0:
            w, bx = w + bx, 0
        boxes.append([bx, by, min(w, cw - bx), min(h, ch - by)])
    k = 1000 / cw
    for (x, y, w, h) in OUTBOX.get(name, []):
        boxes.append([round(x / k), round(y / k), round(w / k), round(h / k)])
    mk = []
    for m in marks:
        if m["t"] == "ring":
            mk.append({"t": "ring", "at": [m["at"][0] - x0, m["at"][1]], "r": m["r"]})
        else:
            mk.append({"t": "arrow", "from": [m["from"][0] - x0, m["from"][1]], "to": [m["to"][0] - x0, m["to"][1]]})
    mk.append({"t": "label", "at": LABEL_AT.get(name, [12, 12]), "lines": lines, "size": 24})
    return {"src": src, "out": f"{OUT}/{name}.webp", "crop": [x0, 0, cw, ch], "blur": boxes, "marks": mk, "width": 1000}


if __name__ == "__main__":
    only = sys.argv[1:] or list(F)
    for name in only:
        s = spec(name)
        p = os.path.join(SPECS, f"{name}.json")
        json.dump(s, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        r = subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], capture_output=True, text=True)
        print(name, (r.stdout.strip() or r.stderr.strip()[:300])[-50:])
    caps = {n: {"v": F[n][0], "t": F[n][1], "say": F[n][6], "say_en": F[n][7]} for n in F}
    json.dump(caps, open(os.path.join(HERE, "frames.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
