"""Footage pictures: one spec per frame, rendered with annotate-frame.cjs (crop 1100x600 at x540 y205 of Hamukatsu's 1920x1080 frames)."""
import json, os, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
SP = r"scripts/guides/.work"
WT = r"."
PICK = SP + "/aloalo/fr/pick"
OUTD = WT + "/scripts/guides/data/frames/aloalo-savage"
SPECS = SP + "/aloalo/specs"
os.makedirs(OUTD, exist_ok=True)
os.makedirs(SPECS, exist_ok=True)

BAND = (0, 448, 1100, 152)      # target bar, hotbars, chat: always blurred
TIP = (995, 425, 105, 175)      # a skill tooltip at the bottom right
TOPR = (1040, 30, 60, 60)       # the content-info edge at the top right


def ring(x, y, r):
    return {"t": "ring", "at": [x, y], "r": r}


def arrow(a, b):
    return {"t": "arrow", "from": list(a), "to": list(b)}


def label(l1, l2, at=(20, 470)):
    return {"t": "label", "at": list(at), "lines": [l1, l2], "size": 32}


F = {
    # ---------------------------------------------------------------- trash 1 + boss 1
    "trash1-pack": ("trash1-pack", [(0, 80, 30, 100), (260, 40, 420, 165), (290, 365, 340, 80), TIP],
                    [ring(470, 300, 160), label("Trash pack 1", "ศัตรูชุดแรก: ฆ่าตามลำดับในคู่มือ")]),
    "trash1-tornado": ("trash1-tornado", [(0, 280, 145, 80), (275, 225, 380, 225)],
                       [ring(980, 165, 130), ring(70, 125, 95), label("Tornado", "โดนแล้วดาเมจแรง + knockback")]),
    "trash1-monk": ("trash1-monk", [(420, 150, 180, 85), (0, 285, 150, 40), (340, 300, 290, 45), (740, 380, 130, 60), TIP],
                    [ring(530, 280, 165), label("Aloalo Monk", "ฆ่าเป็นตัวสุดท้าย ระวัง Cross Attack")]),
    "tidal-roar": ("tidal-roar", [(200, 170, 280, 140), (0, 265, 80, 40)],
                   [ring(360, 260, 190), label("Tidal Roar", "raid-wide + DoT: ใช้ mitigate + barrier")]),
    "fluke-gale": ("fluke-gale", [(170, 100, 170, 50), (0, 285, 95, 125), (510, 395, 125, 50)],
                   [ring(287, 225, 95), ring(740, 147, 80), label("Fluke Gale", "ลมพัดคริสตัลและคนที่อยู่ในฟองเลื่อนไป")]),
    "bubble-net": ("bubble-net", [(330, 180, 170, 50), (0, 285, 95, 125), (160, 300, 230, 80), (500, 345, 140, 85), (340, 415, 250, 45), TIP],
                   [ring(556, 190, 90), label("Bubble Net", "ทุกคนติดฟอง (Bubble Weave) หรือตรึง (Foamy Fetters)")]),
    "blowing-bubbles": ("blowing-bubbles", [(550, 85, 170, 90), (0, 290, 90, 35), (330, 420, 100, 40)],
                        [ring(250, 160, 120), arrow((420, 80), (330, 120)), label("Blowing Bubbles", "ฟองลอยเป็นแนวตรงจากขอบ โดนแล้วถูกตรึง")]),
    "twintides-round": ("twintides-round", [(440, 65, 160, 60), (0, 290, 80, 35), (380, 385, 300, 65)],
                        [ring(300, 240, 170), label("Twintides", "กระแสน้ำจากขอบ + วงกลม / donut รอบบอส")]),
    "roar-adds": ("roar-adds", [(410, 145, 170, 45), (560, 290, 180, 60), (0, 285, 95, 170)],
                  [ring(175, 307, 75), ring(907, 400, 75), label("Roar", "ศัตรู 4 ตัวรอบบอส: ล่อการโจมตีออกนอกสนาม")]),
    "angry-seas": ("angry-seas", [(480, 110, 170, 40), (180, 195, 260, 85), (0, 290, 150, 35), (340, 305, 290, 40),
                                  (500, 350, 180, 65), (860, 200, 140, 50), (640, 195, 130, 80)],
                   [ring(820, 250, 150), label("Angry Seas", "knockback ออกซ้าย-ขวาจากแถบน้ำกลางสนาม")]),
    "fluke-typhoon": ("fluke-typhoon", [(220, 100, 160, 45), (0, 285, 95, 120), (300, 350, 160, 35), (395, 325, 100, 30), (505, 365, 85, 30)],
                      [ring(840, 180, 110), label("Fluke Typhoon", "ฟองถูกลมพัดข้ามไปอีกฝั่ง")]),
    # ---------------------------------------------------------------- trash 2 + boss 2
    "trash2-golem": ("trash2-golem", [(130, 165, 240, 40), (150, 265, 200, 40), (500, 350, 140, 60), (0, 285, 120, 30), (150, 385, 70, 25), (330, 425, 130, 30), (355, 250, 270, 45), TIP],
                     [ring(260, 300, 150), label("Aloalo Wood Golem", "ฆ่าทีละตัวตามเครื่องหมายดาบ")]),
    "trash2-keeper": ("trash2-keeper", [(80, 90, 180, 40), (0, 285, 120, 30), (760, 300, 240, 35), (505, 380, 125, 35), (300, 430, 170, 30)],
                      [ring(180, 207, 100), label("Aloalo Islekeeper", "ฆ่าที่ตะวันตกเฉียงใต้ ระวัง Ancient Quaga")]),
    "inferno-theorem": ("inferno-theorem", [(330, 80, 130, 40), (280, 225, 270, 95), (530, 310, 100, 35), (0, 290, 150, 35), (500, 380, 200, 70), TIP],
                        [ring(420, 300, 190), label("Inferno Theorem", "raid-wide: ใช้ mitigate + barrier")]),
    "angular-addition": ("arcane-array", [(360, 80, 140, 40), (320, 200, 170, 35), (400, 285, 230, 35), (540, 310, 90, 35), (0, 290, 105, 70), (340, 345, 440, 60)],
                         [ring(430, 180, 85), label("Angular Addition", "ตราเหนือบอส: III / V และทิศที่หมุน")]),
    "analysis": ("analysis", [(260, 55, 130, 40), (320, 260, 140, 45), (510, 305, 110, 35), (520, 345, 130, 60), (455, 415, 210, 80), (0, 290, 150, 35)],
                 [ring(390, 395, 100), label("Analysis", "ดูด้าน Unseen ของตัวเอง")]),
    "arcane-array": ("arcane-array", [(360, 80, 140, 40), (320, 200, 170, 35), (400, 285, 230, 35), (540, 310, 90, 35), (0, 290, 105, 70), (340, 345, 440, 60)],
                     [ring(850, 200, 115), label("Arcane Array", "ช่องสีฟ้าเลื่อนไป ลูกแสงขาวระเบิดเมื่อช่องมาถึง")]),
    "targeted-light": ("targeted-light", [(330, 80, 110, 40), (500, 305, 125, 35), (0, 285, 160, 70)],
                       [ring(400, 293, 75), label("Targeted Light", "หันด้าน Unseen ที่เปลี่ยนแล้วเข้าหาบอส")]),
    "strategic-strike": ("strategic-strike", [(345, 45, 120, 40), (260, 190, 160, 35), (330, 215, 150, 45), (0, 290, 80, 35), (300, 415, 160, 35), (500, 428, 170, 60), TIP],
                         [ring(480, 330, 130), label("Strategic Strike", "tank buster ใส่ Tank")]),
    "planar-tactics": ("planar-tactics", [(330, 45, 130, 40), (0, 290, 160, 35), (520, 310, 100, 35), (500, 440, 180, 80)],
                       [ring(180, 300, 150), label("Planar Tactics", "ช่องสีส้ม = AoE ที่ต้องเหยียบให้เลขเหลือ 0")]),
    "spatial-tactics": ("spatial-tactics", [(300, 115, 160, 45), (395, 262, 140, 65), (500, 350, 120, 35), (280, 435, 170, 30), (0, 285, 70, 180)],
                        [ring(200, 187, 75), ring(743, 287, 85), label("Spatial Tactics", "ก้อนสี่เหลี่ยมแดงระเบิดเป็นกากบาทเมื่อช่องฟ้ามาแตะ")]),
    "symmetric-surge": ("symmetric-surge", [(640, 50, 120, 40), (540, 165, 200, 40), (660, 215, 240, 40), (530, 310, 100, 35), (270, 345, 190, 35),
                                            (510, 362, 140, 35), (0, 290, 150, 35)],
                        [ring(400, 393, 130), label("Symmetric Surge", "รับ stack ในร่องระหว่าง AoE 2 วง")]),
    # ---------------------------------------------------------------- boss 3
    "aero-iv": ("aero-iv", [(320, 108, 170, 40), (400, 172, 135, 35), (510, 300, 320, 100), (0, 290, 150, 35), (300, 430, 330, 30)],
                [ring(400, 330, 160), label("Aero IV", "raid-wide: ใช้ mitigate + barrier")]),
    "trick-reload": ("trick-reload", [(170, 105, 500, 55), (210, 148, 160, 35), (155, 290, 170, 40), (460, 310, 170, 35), (0, 290, 160, 35)],
                     [ring(330, 280, 110), label("Trick Reload", "ดูว่านัดไหนบรรจุพลาด")]),
    "trigger-happy": ("trigger-happy", [(170, 105, 500, 50), (530, 212, 160, 35), (0, 290, 150, 35), (460, 305, 170, 35), (290, 338, 170, 35),
                                        (520, 350, 90, 30), (420, 375, 80, 30)],
                      [ring(613, 193, 50), ring(820, 157, 70), label("Trigger Happy", "สนามแบ่ง 6 ส่วนตามลูกเต๋า ส่วนเดียวที่ปลอดภัย")]),
    "trapshooting": ("trapshooting", [(290, 120, 170, 40), (270, 200, 210, 40), (495, 292, 135, 45), (270, 355, 150, 40), (0, 290, 90, 35), (495, 425, 140, 30)],
                     [ring(440, 350, 110), label("Trapshooting", "stack หรือ spread ตามนัดที่ 1 / 8")]),
    "ring-a-ring": ("ring-a-ring", [(545, 115, 150, 40), (485, 182, 140, 35), (980, 205, 120, 60), (0, 290, 150, 35), (410, 305, 220, 35),
                                    (265, 390, 190, 35), (500, 395, 170, 65), (840, 375, 110, 30), TIP],
                    [ring(697, 70, 50), ring(533, 147, 55), label("Ring a Ring o' Explosions", "ลูกส้มเรืองแสง ลูกที่โยงสายกับมันระเบิดตาม")]),
    "dartboard": ("dartboard", [(260, 5, 170, 40), (510, 362, 80, 30), (0, 290, 90, 35), (340, 170, 100, 30)],
                  [ring(743, 103, 55), ring(420, 330, 120), label("Dartboard of Dancing Explosives", "เหยียบสีตาม role: Tank ฟ้า / Healer เหลือง / DPS แดง")]),
    "surprise-balloon": ("surprise-balloon", [(300, 195, 170, 40), (0, 290, 150, 35), (460, 305, 170, 35), (425, 345, 240, 65)],
                         [ring(880, 200, 190), label("Surprise Balloon", "ลูกโป่งแตกแล้ว knockback")]),
    "beguiling-glitter": ("beguiling-glitter", [(170, 105, 500, 50), (410, 240, 100, 70), (0, 290, 150, 35), (495, 305, 130, 35), (300, 348, 215, 40), (510, 370, 80, 40)],
                          [ring(370, 370, 120), label("Beguiling Glitter", "ติด Forced March: ดูทิศของตัวเอง")]),
    "present-box": ("present-box", [(0, 290, 70, 35), (735, 248, 110, 35), (385, 330, 105, 30), (505, 385, 100, 30), (800, 400, 100, 30), (300, 415, 450, 40)],
                    [ring(573, 347, 60), ring(500, 110, 55), label("Present Box", "วิ่งเข้าที่ปลอดภัยที่ระเบิดเหลือไว้")]),
    "shocking-abandon": ("shocking-abandon", [(205, 190, 170, 40), (190, 245, 175, 35), (0, 290, 150, 35), (295, 330, 75, 30), (450, 305, 175, 35),
                                              (500, 360, 120, 35), (275, 388, 180, 35)],
                         [ring(440, 330, 110), label("Shocking Abandon", "tank buster ใส่ Tank")]),
    "pinwheeling": ("pinwheeling", [(330, 108, 170, 40), (295, 172, 120, 35), (385, 268, 190, 65), (505, 398, 135, 50), (0, 290, 85, 45), TIP],
                    [ring(353, 253, 110), label("Pinwheeling Dartboard", "กระดานปาเป้า + กำแพงไฟหมุน")]),
    "final-bombs": ("fb714", [(0, 280, 130, 110), (320, 140, 220, 40), (100, 400, 180, 50), (490, 395, 170, 40), (500, 355, 160, 35)],
                    [ring(600, 200, 150), label("Present Box", "ครั้งสุดท้าย: วงฟ้า = AoE ของ Present Box หาช่องปลอดภัย")]),
    "trash1-kiwakin": ("v1_20", [(340, 140, 200, 35), (0, 270, 150, 35), (440, 288, 190, 35), (325, 318, 130, 35), (500, 328, 140, 60),
                                 (300, 415, 110, 35), (505, 415, 100, 35)],
                       [ring(400, 320, 140), label("Aloalo Kiwakin", "Lead Hook / Sharp Strike = tank buster")]),
    "trash1-snipper": ("v1_40", [(80, 0, 240, 30), (0, 265, 110, 45), (560, 250, 210, 35), (400, 385, 230, 35), (470, 355, 130, 35)],
                       [ring(663, 312, 120), label("Aloalo Snipper", "Water III = stack / กรวยหน้า + กรวยหลัง")]),
    "trash1-ray": ("v1_56", [(390, 205, 240, 40), (550, 180, 230, 105), (0, 268, 150, 45), (340, 288, 290, 35)],
                   [ring(430, 330, 150), label("Aloalo Ray", "แนวตรง / วงกลมรอบตัว / donut")]),
    "tidal-roar-enrage": ("v1_920", [(215, 145, 165, 35), (0, 268, 80, 35), (210, 250, 100, 35), (500, 395, 130, 45)],
                          [ring(330, 260, 190), label("Tidal Roar", "ครั้งสุดท้าย = หมดเวลา (enrage)")]),
    "trash2-interrupt": ("trash2-golem", [(130, 165, 240, 40), (150, 265, 200, 40), (500, 350, 140, 60), (0, 285, 120, 30), (150, 385, 70, 25),
                                          (330, 425, 130, 30), (355, 250, 270, 45), TIP],
                         [ring(260, 300, 150), label("Ancient Aero III", "ร่ายนี้ขัด (interrupt) ได้")]),
}


def pad(b, p=14):
    """Every text box a little larger, so no stroke of a letter survives at its edge."""
    x, y, w, h = b
    x0, y0 = max(0, x - p), max(0, y - p)
    return [x0, y0, min(1100, x + w + p) - x0, min(600, y + h + p) - y0]


def build(only=None):
    for name, (src, blur, marks) in F.items():
        if only and name not in only:
            continue
        spec = {"src": f"{PICK}/{src}.png", "out": f"{OUTD}/{name}.webp", "crop": [540, 205, 1100, 600],
                "blur": [pad(b) for b in blur] + [list(BAND), list(TOPR)], "marks": marks, "width": 1000}
        p = f"{SPECS}/{name}.json"
        json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], cwd=WT, check=True, capture_output=True)
    print("ok")


if __name__ == "__main__":
    build(sys.argv[1:] or None)
