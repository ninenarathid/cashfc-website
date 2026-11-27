"""The footage refs, attached to steps by phase and English step name (frames made by frames.py)."""
import os
from core import VIDS

V = {"mt": "3-5oIvVo6p4", "ur": "oKSHteslL2w", "ap": "4gWtS7GWiFQ", "p4": "nX2kfaMnCiU", "p5": "nzpOdfOyUNo"}
# (phase prefix, step en name, frame, video, t, Thai caption, English caption)
REFS = [
    ("P1", "Spread spots around the boss", "cyclonic-break", "mt", 6,
     "Cyclonic Break: มังกรวนรอบบอส ดูสี แดง = stack คู่ / น้ำเงิน = spread", "Cyclonic Break: the dragon around the boss; red = pair stacks / blue = spread"),
    ("P1", "Red and blue circles + lightning Burnt Strike + Prey", "utopian-circles", "mt", 70,
     "วงแดงและน้ำเงินรอบสนาม วงสีเดียวกับร่างแยกทางเหนือจะใหญ่กว่า", "Red and blue circles round the arena; those matching the north clone are larger"),
    ("P1", "Tether 1: just west of the boss", "fall-of-faith", "mt", 128,
     "Fall of Faith: บอสและร่างแยกโยงสายทีละคน สีของสายบอกไฟหรือสายฟ้า", "Fall of Faith: the boss and clones tether one player at a time; the colour says fire or lightning"),
    ("P1", "Three towers: the fixed players", "p1-towers", "mt", 152,
     "tower 3 อันที่ขอบสนาม นับ pip ของแต่ละอันแล้วเติมคนให้ครบ", "Three towers at the edge; count each one's pips and fill them"),
    ("P2", "Start spots + what to read", "diamond-dust", "mt", 176,
     "Diamond Dust: ดูว่าเป็น Axe Kick หรือ Scythe Kick และวงกลม 2 วงที่ขอบ", "Diamond Dust: read Axe Kick or Scythe Kick, and the two circles at the edge"),
    ("P2", "Three orbs + the stacks", "light-rampant", "mt", 304,
     "Light Rampant: ลูกแก้วขาว 3 ลูกบอก AoE หลบวงของลูกแก้ว", "Light Rampant: three white orbs telegraph AoEs; stay out of them"),
    ("P2", "First baits: skewed clockwise", "crystals", "mt", 392,
     "Endless Ice Age: Crystal of Light ยิง AoE วงกลมใส่คนที่ใกล้ที่สุด", "Endless Ice Age: the Crystals of Light drop circles on the nearest player"),
    ("P2", "Overview: four healer stacks", "sunbound-holy", "mt", 228,
     "Sunbound Holy: แอ่งที่แต่ละกลุ่มทิ้งไว้เรียงไปตามขอบสนามทั้ง 2 ฝั่ง", "Sunbound Holy: each group's puddles trail along the edge on both sides"),
    ("P2", "On to the red mirrors", "mirror", "mt", 274,
     "Mirror, Mirror: กระจกกรอบแดงที่ขอบสนาม ลอกท่าของบอสแต่ลงทีหลัง", "Mirror, Mirror: a red-framed mirror at the edge copies the boss's attack, later"),
    ("P3", "Hourglasses by tether", "ultimate-relativity", "ur", 75,
     "Ultimate Relativity: hourglass รอบสนาม สายเหลือง/ม่วงบอกจุดของแต่ละกลุ่ม", "Ultimate Relativity: hourglasses round the arena; yellow/purple tethers mark each group's spot"),
    ("P3", "AoE wave 1", "apocalypse", "ap", 690,
     "Apocalypse: AoE ลงตามจุดที่กะพริบไว้ หลบด้วยจุด spread ที่หาไว้", "Apocalypse: AoEs where the points flashed; dodge from the spread spots you found"),
    ("P3", "Stack in the middle, then the buster", "black-halo", "ap", 640,
     "Black Halo: cleave ท่า Tank ที่ Tank 2 คนแชร์กัน รับทางเหนือ", "Black Halo: a tank-buster cleave the two tanks share, taken north"),
    ("P4", "Phase start + the Fragment of Fate", "fragment", "p4", 22,
     "Fragment of Fate โผล่ทางเหนือ ห้ามให้ AoE ใดๆ โดนมัน", "The Fragment of Fate appears north; no AoE may touch it"),
    ("P4", "The boss transforms: move away", "akh-rhai", "p4", 35,
     "บอสแปลงร่างเป็นมังกร Akh Rhai ลงตรงที่ยืน: ขยับหนีทันที", "The boss turns into a dragon; Akh Rhai lands where you stand: move at once"),
    ("P4", "Towers + The Path of Light", "darklit", "p4", 340,
     "Darklit Dragonsong: คนมีสายเข้า tower คนอื่นเข้าใกล้บอสรับกรวย", "Darklit Dragonsong: the tethered take towers, the rest go close to take the fan"),
    ("P4", "A stack + the bosses' HP check", "morn-afah", "p4", 425,
     "Morn Afah: stack ทั้งปาร์ตี้ HP 2 บอสต้องห่างกันไม่เกิน 5%", "Morn Afah: a party stack; the two bosses must be within 5% HP"),
    ("P4", "Overview and debuffs", "crystallize-time", "p4", 460,
     "Crystallize Time: hourglass 6 อัน บางอันมีสายเหลือง/ม่วงจากบอส", "Crystallize Time: six hourglasses, some tethered yellow/purple by the boss"),
    ("P4", "Aeros take the heads + the first Tidal Light", "tidal-light", "p4", 740,
     "Tidal Light: ลูกศรบอกเส้น AoE ที่วิ่งข้ามสนาม จำฝั่งที่เส้นเริ่ม", "Tidal Light: arrows mark a line AoE sweeping across; note where it starts"),
    ("P5", "The six lines", "fulgent-blade", "p5", 50,
     "Fulgent Blade: เส้นบนพื้นระเบิดทีละคู่ หาข้าวหลามตัดที่ปลอดภัย", "Fulgent Blade: the floor lines go off a pair at a time; find the safe diamond"),
    ("P5", "Tower 2 + the light wing first", "paradise-regained", "mt", 904,
     "Wings Dark and Light: ปีกข้างหนึ่งเรืองก่อน บอกฝั่งปลอดภัยและที่ของ ST", "Wings Dark and Light: one wing glows first; it sets the safe side and the ST's spot"),
    ("P5", "Two lines SW and SE", "polarizing", "mt", 936,
     "Polarizing Strikes: เส้นแสง/มืดใส่ 2 แถว คนหน้าแถวรับแล้วสลับฝั่ง", "Polarizing Strikes: light/dark lines at the two lines; the front player swaps sides after"),
]


def attach(steps, data_dir):
    used = set()
    for ph, name, frame, vid, t, say, say_en in REFS:
        hit = [s for s in steps if s["en"]["phase"].startswith(ph) and s["en"]["name"] == name]
        if len(hit) != 1:
            raise SystemExit(f"ref target {ph} / {name}: {len(hit)} steps")
        s = hit[0]
        src = f"frames/fru/{frame}.webp"
        if not os.path.exists(os.path.join(data_dir, src)):
            raise SystemExit(f"missing {src}")
        s.setdefault("refs", []).append({"src": src, "say": say, "by": "Nukemaru", "url": f"https://youtu.be/{V[vid]}?t={t}"})
        s["en"].setdefault("refs", []).append(say_en)
        used.add(frame)
    return len(used)
