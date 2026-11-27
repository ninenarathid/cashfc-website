"""Footage pictures for the UWU guide from Nukemaru's NIN PoV clear (https://youtu.be/ZjunafyrdRs, 1080p60):
a wide crop, every Japanese text and player name blurred, our gold ring/arrow and Thai label.
Boxes are in FULL-FRAME pixels (1920x1080) and moved into crop coordinates here.
usage (repo root): python3 scripts/guides/builders/uwu/uwu/tools/frames_uwu.py [name ...]
Frames: scripts/guides/.work/uwu/cand/t<sec>.png, cut with ffmpeg -ss <sec> -frames:v 1."""
import sys, json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
SPECS = os.path.join(HERE, "..", "specs")
CAND = "scripts/guides/.work/uwu/cand"
OUT = "scripts/guides/data/frames/uwu"
VID = "ZjunafyrdRs"
os.makedirs(OUT, exist_ok=True)
os.makedirs(SPECS, exist_ok=True)

CROP = (60, 40, 1580, 890)  # x, y, w, h: the arena above the hotbars, left of the minimap
# UI that sits in the same place in every frame (full-frame px)
FIXED = [(860, 40, 520, 70),      # limit break bar + timers
         (740, 170, 480, 60),     # system message line
         (0, 560, 560, 400),      # duty list / enmity list / target names on the left
         (1180, 680, 520, 260),   # target bar, buffs, party list
         (600, 700, 700, 230)]    # own cast bar, buff names, combat text under the player

RG = lambda x, y, r: {"t": "ring", "at": [x, y], "r": r}
AR = lambda a, b: {"t": "arrow", "from": a, "to": b}
L = lambda x, y, lines, size=34: {"t": "label", "at": [x, y], "lines": lines, "size": size}

# name: (time, extra blur boxes, marks) — marks in full-frame px too
F = {
    "friction": (85.8, [(760, 440, 600, 260), (770, 290, 560, 150)],
                 [RG(1080, 650, 170),
                  L(80, 60, ["Friction: AoE เล็กใส่ผู้เล่นสุ่ม", "คนที่โดนได้ Thermal Low 1 stack"])]),
    "sisters-mistral-song": (113.2, [(860, 360, 740, 200), (520, 500, 620, 330), (1320, 255, 210, 55), (1200, 585, 340, 110)],
                             [RG(1430, 500, 330), RG(400, 290, 110),
                              L(80, 60, ["Mistral Song ของสองพี่น้อง: กรวยใหญ่", "MT / ST วิ่งไปขวางรับแทน"])]),
    "mesohigh-tethers": (137.2, [(600, 300, 760, 420), (280, 600, 260, 80), (1320, 595, 150, 50)],
                         [RG(300, 650, 150), RG(1580, 660, 130),
                          L(80, 60, ["Mesohigh: สายเขียวจาก Chirada / Suparna", "ST รับฝั่งตะวันตก / D4 ฝั่งตะวันออก"])]),
    "wicked-tornado": (146.6, [(560, 300, 900, 420), (300, 640, 320, 260)],
                       [RG(1020, 580, 330),
                        L(80, 60, ["Garuda ตื่นแล้ว: Wicked Wheel + donut ตามทันที", "เดินเข้าวงในทันทีที่ Wicked Wheel ลง"], 32)]),
    "ifrit-entry": (168.8, [(700, 520, 520, 380)],
                    [RG(900, 640, 330),
                     L(80, 60, ["Ifrit พุ่งผ่านสนาม + Eruption เต็มพื้น", "จุดปลอดภัยมีจุดเดียว: 90 องศาจาก Ifrit"])]),
    "infernal-nails": (204.0, [(750, 635, 120, 60), (820, 340, 900, 420), (300, 420, 560, 120), (1340, 340, 360, 120)],
                       [RG(500, 470, 110), RG(1530, 480, 110), RG(1200, 320, 90),
                        L(80, 60, ["Infernal Nails: Nail ไฟรอบ Ifrit", "ให้โดน Eruption 2 ครั้งแล้วค่อยทำลาย"])]),
    "ifrit-blue": (282.2, [(560, 178, 150, 44), (560, 300, 600, 160), (740, 420, 420, 300), (960, 470, 180, 80)],
                   [RG(1370, 220, 150), RG(560, 170, 120),
                    L(80, 700, ["Crimson Cyclone: Ifrit พุ่งข้ามสนาม", "ตัวจริงเรืองแสงสีฟ้า: มี AoE กากบาทตามหลัง"])]),
    "titan-boulders": (360.0, [(930, 495, 120, 55), (1060, 80, 560, 140), (700, 560, 700, 300), (1380, 600, 300, 160)],
                       [RG(1030, 420, 380),
                        L(80, 60, ["หินเรียงฝั่งตรงข้าม มีช่องซ้ายหรือขวา", "ยืนเยื้องข้าง Titan ให้ knockback เข้าช่อง"])]),
    "landslide": (362.6, [(1320, 590, 260, 100), (1330, 580, 220, 55), (895, 635, 120, 60), (780, 40, 400, 200), (780, 400, 360, 120), (1100, 760, 500, 100), (860, 840, 300, 90)],
                  [RG(980, 300, 160),
                   L(80, 60, ["Landslide: เส้นตรงจาก Titan", "คนที่ติด Gaol ต้องหลบชุดนี้"])]),
    "weight-of-the-land": (451.0, [(565, 450, 170, 65), (745, 610, 240, 100), (440, 60, 360, 260), (700, 380, 480, 260), (1220, 680, 300, 120)],
                           [RG(560, 540, 170), RG(1150, 470, 160),
                            L(760, 60, ["Weight of the Land 3 ชุด", "Tank+Melee ทวนเข็ม / Healer+Range ตามเข็ม"], 32)]),
    "magitek-bits": (526.9, [(700, 560, 700, 340), (300, 600, 260, 60)],
                     [RG(720, 260, 200), RG(1100, 260, 200),
                      L(80, 660, ["ช่วง Lahabrea: Magitek Bits ลงพื้น", "เริ่ม LB3 ต่อกัน: Caster > Healer > Melee > Tank"], 32)]),
    "annihilation-cast": (664.0, [(1050, 235, 160, 70), (680, 300, 140, 45), (780, 430, 110, 45), (1355, 395, 170, 45), (1355, 620, 175, 45), (1190, 650, 270, 50), (950, 160, 260, 90), (1230, 340, 180, 60), (760, 390, 140, 50), (850, 540, 340, 160), (1220, 580, 320, 60), (300, 260, 200, 50)],
                          [RG(1060, 300, 300),
                           L(80, 60, ["Ultima Weapon ร่าย Ultimate Annihilation", "ระหว่างนี้ยังตี Ultima ได้"])]),
    "edge-runes": (754.9, [(340, 248, 230, 50), (545, 590, 60, 110), (320, 280, 600, 260), (880, 40, 560, 220), (1100, 520, 600, 200), (900, 600, 300, 120)],
                   [RG(330, 760, 210),
                    L(760, 300, ["รูนรอบขอบสนาม", "Ultimate Predation: ยืนระหว่างรูน (ทิศหลัก)"], 32)]),
    "enrage": (912.0, [(670, 285, 160, 75), (510, 460, 100, 60), (570, 495, 240, 70), (30, 510, 320, 70), (1280, 580, 140, 70), (690, 262, 120, 45), (515, 430, 245, 45), (560, 470, 200, 50), (40, 420, 290, 120), (1280, 515, 130, 80), (40, 270, 300, 220), (600, 255, 230, 45), (800, 160, 220, 40), (480, 335, 240, 130), (1230, 420, 160, 120)],
               [RG(960, 260, 260),
                L(80, 60, ["ช่วงสุดท้าย: Ultima Weapon เติมเกจ Ultima Aether", "ถึง 100 = enrage: ตีให้จบก่อน"], 32)]),
}


def to_crop(b):
    x, y, w, h = b
    cx, cy, cw, ch = CROP
    X0, Y0 = max(0, x - cx), max(0, y - cy)
    X1, Y1 = min(cw, x - cx + w), min(ch, y - cy + h)
    return None if X1 <= X0 or Y1 <= Y0 else [X0, Y0, X1 - X0, Y1 - Y0]


def mark(m):
    cx, cy = CROP[0], CROP[1]
    m = dict(m)
    if "at" in m:
        m["at"] = [max(0, m["at"][0] - cx), max(0, m["at"][1] - cy)] if m["t"] != "label" else [m["at"][0], m["at"][1]]
    if "from" in m:
        m["from"] = [m["from"][0] - cx, m["from"][1] - cy]
        m["to"] = [m["to"][0] - cx, m["to"][1] - cy]
    return m


done = {}
only = sys.argv[1:] or list(F)
for name in only:
    t, extra, marks = F[name]
    src = f"{CAND}/t{t}.png"
    if not os.path.exists(src):
        ff = subprocess.run(["node", "-e", 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())'], capture_output=True, text=True).stdout.strip()
        subprocess.run([ff, "-loglevel", "error", "-y", "-ss", str(t), "-i", "scripts/guides/.work/uwu/vid/nuke-clear.mp4", "-frames:v", "1", src], check=True)
    blur = [b for b in (to_crop(b) for b in FIXED + extra) if b]
    spec = {"src": src, "out": f"{OUT}/{name}.webp", "crop": list(CROP), "blur": blur,
            "marks": [mark(m) for m in marks if not (m["t"] == "ring" and m["r"] == 0)], "width": 1000}
    p = os.path.join(SPECS, f"{name}.json")
    json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], capture_output=True, text=True)
    print(name, (r.stdout.strip() or r.stderr.strip()[:300])[-70:])

all_done = {n: {"video": VID, "t": int(F[n][0])} for n in F if os.path.exists(f"{OUT}/{n}.webp")}
json.dump(all_done, open(os.path.join(HERE, "footage.json"), "w"), indent=1)
print(len(all_done), "pictures")
