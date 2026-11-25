import sys
sys.stdout.reconfigure(encoding="utf-8")
p = 'frames.py'; s = open(p, encoding='utf-8').read()
add = '''    "trash1-kiwakin": ("v1_20", [(340, 140, 200, 35), (0, 270, 150, 35), (440, 288, 190, 35), (325, 318, 130, 35), (500, 328, 140, 60),
                                 (300, 415, 110, 35), (505, 415, 100, 35)],
                       [ring(400, 320, 140), label("Aloalo Kiwakin", "Lead Hook / Sharp Strike = tank buster")]),
    "trash1-snipper": ("v1_40", [(80, 0, 240, 30), (0, 265, 110, 45), (560, 250, 210, 35), (400, 385, 230, 35), (470, 355, 130, 35)],
                       [ring(663, 312, 120), label("Aloalo Snipper", "Water III = stack / กรวยหน้า + กรวยหลัง")]),
    "trash1-ray": ("v1_56", [(390, 205, 240, 40), (550, 180, 230, 105), (0, 268, 150, 45), (340, 288, 290, 35)],
                   [ring(430, 330, 150), label("Aloalo Ray", "แนวตรง / วงกลมรอบตัว / donut")]),
    "tidal-roar-enrage": ("v1_920", [(215, 145, 165, 35), (0, 268, 80, 35), (210, 250, 100, 35), (500, 395, 130, 45)],
                          [ring(330, 260, 190), label("Tidal Roar", "ครั้งสุดท้าย = หมดเวลา (enrage)")]),
    "trash2-interrupt": ("trash2-golem", [(130, 165, 240, 40), (150, 265, 200, 40), (500, 350, 140, 60), (0, 285, 120, 30), (150, 385, 70, 25),
                                          (330, 425, 130, 30), (588, 284, 34, 32), TIP],
                         [ring(470, 300, 75), arrow((330, 200), (420, 280)), label("Ancient Aero III", "ขัดการร่ายได้: ขึ้น INTERRUPTED")]),
'''
if '"trash1-kiwakin"' not in s:
    i = s.rindex('\n}\n')
    s = s[:i + 1] + add + s[i + 1:]
    open(p, 'w', encoding='utf-8').write(s)


def addref(path, anchor, ref):
    s = open(path, encoding='utf-8').read()
    if ref.split('"')[1] in s:
        return
    i = s.index(anchor); j = s.index(')\n', i)
    s = s[:j] + ',\n         refs=[' + ref + ']' + s[j:]
    open(path, 'w', encoding='utf-8').write(s)


addref('st1.py', 'step(PT1, "Aloalo Kiwakin"', 'FR("trash1-kiwakin", "v1", 20, "Aloalo Kiwakin: Sharp Strike = tank buster ใส่ Tank", "Aloalo Kiwakin: Sharp Strike, a tank buster on the tank")')
addref('st1.py', 'step(PT1, "Aloalo Snipper"', 'FR("trash1-snipper", "v1", 40, "Aloalo Snipper: Water III = stack / Bubble Shower กรวยหน้า / Crab Dribble กรวยหลัง", "Aloalo Snipper: Water III stack / Bubble Shower front cone / Crab Dribble back cone")')
addref('st1.py', 'step(PT1, "Aloalo Ray"', 'FR("trash1-ray", "v1", 56, "Aloalo Ray: Electric Whorl = AoE donut รอบตัว", "Aloalo Ray: Electric Whorl, a donut around it")')
addref('st1.py', 'step(PB1, "Spring Crystals → Strewn Bubbles → Tidal Roar"', 'FR("tidal-roar-enrage", "v1", 920, "Tidal Roar ครั้งสุดท้าย: หมดเวลา (enrage)", "The last Tidal Roar: time is up (enrage)")')
addref('st2.py', 'step(PT2, "Aloalo Wood Golem"', 'FR("trash2-interrupt", "v2", 26, "Ancient Aero III: ขัดการร่ายได้ (ขึ้น INTERRUPTED)", "Ancient Aero III: it can be interrupted (INTERRUPTED shows)")')
print("patched")
