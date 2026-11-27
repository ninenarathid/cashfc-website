"""Footage pictures for the FRU guide from Nukemaru's videos (ぬけまるG):
3-5oIvVo6p4 (MT clear, 1920x804), oKSHteslL2w (P3-1), 4gWtS7GWiFQ (P3-2), nX2kfaMnCiU (P4), nzpOdfOyUNo (P5) — all 1080p.
Wide crop, every Japanese text, name, the creator's mascot and subtitle box cut or blurred, our own marks.
usage (repo root): python3 frames.py [name ...]"""
import sys, json, subprocess, os
M = "scripts/guides/.work/fru"
OUT = "scripts/guides/data/frames/fru"
SPECS = "scripts/guides/builders/fru/fru/specs"
os.makedirs(OUT, exist_ok=True)
os.makedirs(SPECS, exist_ok=True)

L = lambda x, y, lines, size=30: {"t": "label", "at": [x, y], "lines": lines, "size": size}
RG = lambda x, y, r: {"t": "ring", "at": [x, y], "r": r}
AR = lambda a, b: {"t": "arrow", "from": a, "to": b}

# MT clear (1920x804): crop [150, 0, 1150, 640]; chat, top bars, the player's own floating texts, hotbars
MTC = [150, 0, 1150, 640]
MTB = [(0, 360, 360, 280), (430, 0, 720, 145), (540, 370, 470, 230), (230, 560, 820, 80), (1120, 300, 30, 340)]
# commentary (1920x1080): crop [0, 0, 1200, 690]; the mascot's head, hotbars, top bars
CMC = [0, 0, 1200, 690]
CMB = [(0, 590, 380, 100), (360, 585, 840, 105), (650, 0, 550, 120), (500, 420, 700, 170)]

F = {
    "cyclonic-break": ("mt-6", MTC, MTB + [(250, 90, 300, 90), (600, 140, 440, 80)],
                       [RG(560, 330, 170), L(20, 150, ["Cyclonic Break: มังกรวนรอบบอส", "จำสี: แดง = stack คู่ / น้ำเงิน = spread"])]),
    "utopian-circles": ("mt-70", MTC, MTB,
                        [RG(220, 170, 140), RG(860, 170, 140), L(300, 20, ["วงแดง/น้ำเงินรอบสนาม", "สีเดียวกับร่างแยกเหนือ = วงใหญ่กว่า"])]),
    "fall-of-faith": ("mt-128", MTC, MTB + [(600, 150, 300, 150), (560, 190, 240, 140)],
                      [RG(560, 200, 170), L(20, 20, ["Fall of Faith: บอส + ร่างแยกโยงสาย", "สี (แดง/น้ำเงิน) บอกไฟหรือสายฟ้า"])]),
    "p1-towers": ("mt-152", MTC, MTB + [(380, 150, 250, 130), (700, 90, 280, 150)],
                  [RG(330, 380, 230), L(560, 20, ["tower 3 อันที่ขอบ", "นับ pip ของแต่ละอัน"])]),
    "diamond-dust": ("mt-176", MTC, MTB + [(450, 110, 250, 120), (680, 140, 300, 140)],
                     [RG(560, 380, 200), L(20, 20, ["Diamond Dust: ดู Axe Kick / Scythe Kick", "+ วงกลม 2 วงที่ขอบ"])]),
    "light-rampant": ("mt-304", MTC, MTB + [(130, 240, 240, 100)],
                      [RG(170, 230, 120), RG(930, 220, 110), L(300, 20, ["Light Rampant: ลูกแก้วขาว 3 ลูก", "หลบวงของลูกแก้ว"])]),
    "crystals": ("mt-392", MTC, MTB + [(300, 150, 400, 200), (880, 280, 270, 180)],
                 [RG(280, 300, 150), L(560, 20, ["Endless Ice Age: คริสตัล", "AoE วงกลมใส่คนใกล้สุด"])]),
    "ultimate-relativity": ("ur-75", CMC, CMB + [(520, 380, 220, 300), (820, 300, 260, 160), (880, 90, 320, 90)],
                            [RG(420, 220, 160), RG(1060, 170, 120), L(20, 20, ["Ultimate Relativity: hourglass รอบสนาม", "สายเหลือง/ม่วงบอกจุดของแต่ละคน"])]),
    "apocalypse": ("ap-690", CMC, CMB + [(560, 260, 400, 200), (180, 300, 260, 140), (640, 460, 320, 120)],
                   [RG(600, 380, 270), L(20, 20, ["Apocalypse: AoE ลงตามจุดที่กะพริบ", "หลบตามจุด spread ที่หาไว้"])]),
    "sunbound-holy": ("mt-228", MTC, MTB + [(780, 230, 370, 180)],
                      [RG(270, 330, 170), L(480, 160, ["Sunbound Holy: แอ่งที่แต่ละกลุ่มทิ้งไว้", "ไล่ไปตามขอบสนามทั้ง 2 ฝั่ง"])]),
    "mirror": ("mt-274", MTC, MTB + [(680, 290, 470, 250)],
               [RG(680, 200, 170), L(20, 160, ["กระจกกรอบแดงที่ขอบสนาม", "ลอกท่าของบอส แต่ลงทีหลัง"])]),
    "black-halo": ("ap-640", CMC, CMB + [(880, 120, 320, 180)],
                   [RG(770, 300, 210), L(20, 20, ["Black Halo: cleave ท่า Tank", "Tank 2 คนแชร์กันทางเหนือ"])]),
    "fragment": ("p4-22", CMC, CMB + [(780, 100, 420, 180), (500, 480, 300, 110), (480, 0, 720, 300)],
                 [RG(560, 270, 150), L(20, 20, ["Fragment of Fate ทางเหนือ", "ห้ามให้ AoE โดนมัน"])]),
    "akh-rhai": ("p4-35", CMC, CMB + [(500, 120, 700, 200), (300, 480, 350, 110), (460, 390, 320, 130)],
                 [RG(330, 520, 150), L(20, 20, ["บอสแปลงร่างเป็นมังกร", "Akh Rhai ลงตรงที่ยืน: ขยับหนี"])]),
    "darklit": ("p4-340", CMC, CMB + [(560, 100, 640, 280), (250, 230, 400, 150), (500, 380, 700, 210)],
                [RG(440, 360, 150), L(20, 20, ["Darklit Dragonsong: คนมีสายเข้า tower", "คนอื่นเข้าใกล้บอสรับกรวย"])]),
    "morn-afah": ("p4-425", CMC, CMB + [(500, 100, 700, 260), (400, 380, 300, 150), (880, 380, 320, 230)],
                  [RG(560, 350, 200), L(20, 20, ["Morn Afah: stack + เช็ก HP 2 บอส", "ห่างกันเกิน 5% = โยงสาย"])]),
    "crystallize-time": ("p4-460", CMC, CMB + [(520, 430, 260, 260), (800, 120, 400, 160), (960, 480, 240, 210)],
                         [RG(820, 60, 110), RG(770, 610, 110), L(20, 20, ["Crystallize Time: hourglass 6 อัน", "บางอันมีสายเหลือง/ม่วงจากบอส"])]),
    "tidal-light": ("p4-740", CMC, CMB + [(520, 440, 260, 250), (900, 0, 300, 140)],
                    [AR((150, 520), (480, 430)), L(20, 20, ["Tidal Light: เส้นลูกศรวิ่งข้ามสนาม", "จำฝั่งที่เส้นเริ่ม"])]),
    "fulgent-blade": ("p5-50", CMC, CMB + [(560, 300, 420, 200)],
                      [RG(600, 300, 260), L(20, 20, ["Fulgent Blade: เส้นบนพื้นระเบิดทีละคู่", "หาข้าวหลามตัดที่ปลอดภัย"])]),
    "paradise-regained": ("mt-904", MTC, MTB + [(380, 120, 400, 220), (760, 140, 340, 100)],
                          [RG(560, 230, 180), L(20, 20, ["Wings Dark and Light: ปีกข้างหนึ่งเรือง", "ดูว่าปีกไหนเรืองก่อน"])]),
    "polarizing": ("mt-936", MTC, MTB + [(450, 100, 300, 200), (1030, 400, 120, 240)],
                   [RG(560, 400, 200), L(20, 20, ["Polarizing Strikes: เส้นแสง/มืด", "คนหน้าแถวรับแล้วสลับฝั่ง"])]),
}

only = sys.argv[1:] or list(F)
for name in only:
    src, crop, blur, marks = F[name]
    spec = {"src": f"{M}/cand/{src}.jpg", "out": f"{OUT}/{name}.webp", "crop": crop,
            "blur": [list(b) for b in blur], "marks": marks, "width": 1000}
    p = f"{SPECS}/{name}.json"
    json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], capture_output=True, text=True)
    print(name, (r.stdout.strip() or r.stderr.strip()[:300])[-70:])
