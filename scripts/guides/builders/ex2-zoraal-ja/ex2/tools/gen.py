"""Builds scripts/guides/data/ex2-zoraal-ja.json."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex2"
sys.path.insert(0, HERE + "/tools")
from scenes import *  # noqa

OUT = r"scripts/guides/data/ex2-zoraal-ja.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
XJ = "https://xivjpraids.com/images/7.0_dawntrail/zoraal_ja/"

P0, P0E = "เตรียมตัว", "Setup"
P1, P1E = "ช่วงแรก (สนามใหญ่)", "First phase (full arena)"
P2, P2E = "สนามแยก ครั้งที่ 1", "Split floors 1"
P3, P3E = "สนามใหญ่ ครั้งที่ 2", "Full arena 2"
P4, P4E = "สนามแยก ครั้งที่ 2", "Split floors 2"
P5, P5E = "สนามใหญ่ ครั้งที่ 3", "Full arena 3"
P6, P6E = "สนามแยก ครั้งที่ 3", "Split floors 3"
P7, P7E = "ช่วงสุดท้าย", "Final phase"

steps = []


def step(phase, phase_en, mech, name, name_en, note, note_en, strict=False, scene=None, game8=None,
         says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase, "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if game8:
        s["game8"] = [game8]
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1]} for r in refs]
    if scene is not None:
        s["scene"] = scene
        s["ring"] = round(max(4.0, scene.get("iconSize", 4.4) + 0.9), 1)
    en = {"phase": phase_en, "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


def all_say(th, en):
    return ({k: th for k in EVERY}, {k: en for k in EVERY})


# ======================================================================= setup
step(P0, P0E, "Waymarks", "Marker", "Waymarks",
     "ไฟต์นี้แทบไม่ต้องใช้ Marker\n"
     "วางแค่ A ไว้ทางเหนือเพื่อบอกทิศก็พอ\n"
     "ทิศเหนือคือฝั่งที่เส้นของ Projection of Turmoil เริ่ม\n\n"
     "แผนนี้บอกทิศโดยยึดบอสเป็นหลัก\n"
     "Drum of Vollok และการ spread ของ Vollok ครั้งที่ 2 ให้ถือว่าบอสอยู่ทางเหนือ",
     "This fight hardly needs waymarks\n"
     "Just put A at north to mark the direction\n"
     "North is the side where Projection of Turmoil's line starts\n\n"
     "The plan reads directions from the boss\n"
     "For Drum of Vollok and the 2nd Vollok spread, treat the boss as north",
     refs=[(XJ + "markers.jpg", "Marker A ทางเหนือในเกม (ภาพจาก xivjpraids.com)",
            "Waymark A at north in game (picture from xivjpraids.com)")])

# ======================================================================= first phase
step(P1, P1E, "Actualize", "raid-wide", "Raid-wide",
     "AoE เวททั้งปาร์ตี้ (raid-wide)\n"
     "ใช้ท่าลดดาเมจและ barrier ลดดาเมจไว้",
     "A magic raid-wide\n"
     "Use mitigation and barriers to soften it")

MDH = "Multidirectional Divide + Forward Half / Backward Half"
step(P1, P1E, MDH, "① X ขึ้น แล้วมีรอยตัด", "① The X, then the cuts",
     "ท่าผสม 2 อย่าง:\n"
     "AoE รูปตัว X (Multidirectional Divide)\n"
     "AoE ครึ่งหน้าหรือครึ่งหลังของบอส + ครึ่งด้านข้างอีกฝั่งหนึ่งตามดาบของบอส (Forward Half / Backward Half)\n\n"
     "① AoE รูปตัว X ขึ้นก่อน แล้วมีรอยตัดขึ้นตามแนว X อีกหลายจุด\n"
     "รอยตัดก็ยิง AoE เป็นเส้นตรงออกไปด้วย ระวังให้ดี",
     "Two attacks at once:\n"
     "an X-shaped AoE (Multidirectional Divide)\n"
     "the boss's front or back half + one side half, set by its sword (Forward Half / Backward Half)\n\n"
     "① The X appears first, then cuts appear at several points along it\n"
     "The cuts fire straight line AoEs too, so watch them",
     scene=md1(), game8=G8(10205672, "2bbd4bc6e0a1b86f3549bf45008e2cbb.png"))

step(P1, P1E, MDH, "② เริ่มร่าย Half: ดูดาบที่เรือง", "② The Half cast starts: read the glowing sword",
     "② บอสเริ่มร่าย Forward Half หรือ Backward Half ที่ปลอดภัยเปลี่ยนตามชื่อท่า\n"
     "สามเหลี่ยมสีฟ้าในภาพ = ฝั่งดาบที่เรือง\n"
     "วงสีแดง = วงเป้า (target circle) ของบอส\n\n"
     "Forward Half: ที่ปลอดภัยอยู่หน้าบอส ฝั่งดาบที่เรือง\n"
     "Backward Half: ที่ปลอดภัยอยู่หลังบอส ฝั่งดาบที่ไม่เรือง",
     "② The boss starts casting Forward Half or Backward Half; the safe spot depends on which\n"
     "The blue triangle in the picture = the side of the sword that glows\n"
     "The red ring = the boss's target circle\n\n"
     "Forward Half: safe in front of the boss, on the glowing sword's side\n"
     "Backward Half: safe behind the boss, on the side of the sword that does not glow",
     scene=md2(), game8=G8(10205675, "1eadb7847225ee0842b2ad6dd8902116.png"))

step(P1, P1E, MDH, "③ ถ้าเป็น Backward Half", "③ If it is Backward Half",
     "③ Backward Half\n"
     "ภาพนี้บอสหันไปทางเหนือ ดาบที่เรืองอยู่ฝั่งตะวันออก\n"
     "ที่ปลอดภัยจึงอยู่หลังบอส ฝั่งตะวันตก (ตะวันตกเฉียงใต้)\n"
     "ยืนในช่องที่เส้นของ X ไม่ผ่าน",
     "③ Backward Half\n"
     "In this picture the boss faces north and its glowing sword is on the east\n"
     "So safe is behind the boss on the west side (south-west)\n"
     "Stand in a gap the X's lines do not cross",
     scene=md_back(), game8=G8(10205674, "4347099ff13facaf964b46ef78be4c14.png"))

step(P1, P1E, MDH, "④ ถ้าเป็น Forward Half", "④ If it is Forward Half",
     "④ Forward Half\n"
     "ภาพนี้บอสหันไปทางเหนือ ดาบที่เรืองอยู่ฝั่งตะวันออก\n"
     "ที่ปลอดภัยจึงอยู่หน้าบอส ฝั่งตะวันออก (ตะวันออกเฉียงเหนือ)\n"
     "ยืนในช่องที่เส้นของ X ไม่ผ่าน",
     "④ Forward Half\n"
     "In this picture the boss faces north and its glowing sword is on the east\n"
     "So safe is in front of the boss on the east side (north-east)\n"
     "Stand in a gap the X's lines do not cross",
     scene=md_fwd(), game8=G8(10205673, "ae52c2d29950c6dae82bef6dbc4a4b45.png"))

MDR = "Multidirectional Divide + Regicidal Rage"
step(P1, P1E, MDR, "① Tank รับสายจากบอส", "① The tanks take the tethers",
     "① X ของ Multidirectional Divide ขึ้น และมีสาย 2 เส้นจากบอสมาที่ผู้เล่น\n"
     "MT กับ ST รับสายคนละเส้น",
     "① The X of Multidirectional Divide appears, and 2 tethers run from the boss to players\n"
     "MT and ST take one tether each",
     says={"MT": "รับสาย 1 เส้น", "ST": "รับสาย 1 เส้น"},
     says_en={"MT": "Take one tether", "ST": "Take one tether"},
     scene=regi1(), game8=G8(10205693, "7240d30e6e96d0581cb32760435b925f.png"))

step(P1, P1E, MDR, "② รับท่าตรงที่ไม่ทับใคร", "② Take the hit away from everyone",
     "② Tank ที่ถือสายไปรับ AoE วงกลมแรงๆ ตรงที่ไม่โดนคนอื่น (ฝั่งหน้าบอส) และไม่อยู่บนเส้นของ X\n"
     "อย่าลืมเปิดบัฟลดดาเมจ\n"
     "คนที่เหลือหลบเส้นของ X อยู่ห่างจาก Tank",
     "② The tethered tanks take heavy circle AoEs where they hit nobody else (the boss's front side), clear of the X's lines\n"
     "Remember a mitigation\n"
     "Everyone else dodges the X's lines, away from the tanks",
     says={"MT": "พาสายไปฝั่งหน้าบอส ห่างคนอื่น เปิดบัฟลดดาเมจ", "ST": "พาสายไปฝั่งหน้าบอส ห่างคนอื่น เปิดบัฟลดดาเมจ"},
     says_en={"MT": "Take the tether to the boss's front, away from others, with a mitigation",
              "ST": "Take the tether to the boss's front, away from others, with a mitigation"},
     scene=regi2(), game8=G8(10205680, "e2e0753f55c3cec673806ffe0fcb5bc4.png"))

# ======================================================================= split floors 1
step(P2, P2E, "Dawn of an Age", "raid-wide + สนามแยก", "Raid-wide + the floor splits",
     "AoE เวทแรงมากทั้งปาร์ตี้ ใช้ barrier และท่าลดดาเมจให้เต็มที่\n"
     "จากนั้นสนามเปลี่ยนเป็นพื้นแยกขนาด 4×4 ช่อง",
     "A very heavy magic raid-wide; use barriers and mitigation fully\n"
     "Then the arena turns into separate floors of 4×4 tiles")

VSH = "Vollok + Sync + Half Full"
step(P2, P2E, VSH, "① พื้นรอบนอก 4 พื้นโผล่", "① Four outer floors appear",
     "① มีพื้นโผล่ขึ้นรอบนอก 4 พื้น\n"
     "ทั้งปาร์ตี้อยู่บนพื้นกลางกับบอส",
     "① Four floors appear around the outside\n"
     "The whole party is on the middle floor with the boss",
     scene=vollok1(), game8=G8(10205696, "6aad2ac26d579c1b06fcf1008168bccc.png"))

step(P2, P2E, VSH, "② ดาบปักพื้น + Sync เลือก 2 พื้น", "② Swords land, Sync links 2 floors",
     "② Blade Warp: ดาบปักลงบนพื้นรอบนอกทุกพื้น\n"
     "Sync: พื้นรอบนอก 2 พื้นเรืองสีฟ้า (ขอบสีฟ้าในภาพ) และเชื่อมกับพื้นกลาง\n\n"
     "ช่องที่มีดาบบนพื้นสีฟ้า จะมี AoE ออกที่ช่องเดียวกันบนพื้นกลางด้วย",
     "② Blade Warp: swords stick into every outer floor\n"
     "Sync: 2 outer floors glow blue (the blue edges in the picture) and link to the middle floor\n\n"
     "Every tile with a sword on a blue floor gets an AoE on the same tile of the middle floor too",
     scene=vollok2(), game8=G8(10205705, "fcdf617a13b375ee848eabc6269e876f.jpeg"))

step(P2, P2E, VSH, "③ ร่าย Half Full", "③ Half Full is cast",
     "③ บอสร่าย Half Full\n"
     "ครึ่งสนามฝั่งที่ดาบของบอสโผล่ออกมา (สามเหลี่ยมสีฟ้าในภาพ) จะโดน",
     "③ The boss casts Half Full\n"
     "The half on the side where its sword is out (the blue triangle in the picture) will be hit",
     scene=vollok3(), game8=G8(10205697, "ee22cb66e892bc03d6203580485bd355.png"))

step(P2, P2E, VSH, "④ AoE ของ Vollok ออก", "④ Vollok's AoEs go off",
     "④ AoE ของ Vollok ออกบนพื้นกลาง ตรงช่องเดียวกับดาบบนพื้นสีฟ้าทั้ง 2 พื้น\n"
     "ไปยืนในช่องที่ไม่โดน",
     "④ Vollok's AoEs go off on the middle floor, on the same tiles as the swords on both blue floors\n"
     "Stand in a tile that is not hit",
     scene=vollok4(), game8=G8(10205698, "e5aeb0f2f1714cb18f41af7e50fb9116.png"))

step(P2, P2E, VSH, "⑤ Half Full ออก: ชิดฝั่งที่ไม่มีดาบ", "⑤ Half Full: lean away from the sword",
     "⑤ Half Full ออกพร้อมกัน\n"
     "จากช่องที่ปลอดภัย ขยับไปชิดฝั่งที่ไม่มีดาบ (ฝั่งตรงข้ามสามเหลี่ยมสีฟ้า)\n"
     "แล้วจบท่า",
     "⑤ Half Full goes off at the same time\n"
     "From the safe tile, lean to the side without the sword (away from the blue triangle)\n"
     "and it ends",
     scene=vollok5(), game8=G8(10205699, "85bed7d62ab58f21b2681210cf40e5c0.png"))

PATTERNS = [
    (1, 10206857, "4c002ad8e59b0de41370e37e7840a5d9.png",
     "มุมใต้ไม่โดน → มุมใต้ปลอดภัย", "South corner not hit → the south corner is safe"),
    (2, 10206856, "859cbbe3a723eedba2ab1899512eca6d.png",
     "มุมใต้โดน แต่ช่องก่อนหน้าไม่โดน → ช่องก่อนหน้าปลอดภัย", "South corner hit, the tile before it not → that tile is safe"),
    (3, 10206855, "b44a5c6d5822d5e554e8637f31575577.png",
     "มุมใต้และช่องก่อนหน้าโดนทั้งคู่ → ช่องซ้ายหรือขวาของมุมใต้ (เลือกตาม Half Full)",
     "South corner and the tile before both hit → the tile left or right of the south corner (by Half Full)"),
    (4, 10206854, "d2c658d7a5b78f8401f5f6ac63c8a53f.png",
     "มุมใต้ไม่โดน → มุมใต้ปลอดภัย", "South corner not hit → the south corner is safe"),
]
for n, gid, gh, th, en in PATTERNS:
    step(P2, P2E, "Sync", f"แบบที่ {n}", f"Pattern {n}",
         ("ช่องที่ Sync ทำให้โดนบนพื้นกลางมี 4 แบบ ช่องสีส้มคือช่องที่โดน\n"
          "มุมใต้ = ช่องล่างสุดของพื้นกลาง / ช่องก่อนหน้า = ช่องเหนือมุมใต้\n\n" if n == 1 else "")
         + f"แบบที่ {n}: {th}",
         ("Sync hits the middle floor in 4 patterns; orange tiles are hit\n"
          "South corner = the bottom tile of the middle floor / the tile before = the one just north of it\n\n" if n == 1 else "")
         + f"Pattern {n}: {en}",
         scene=globals()[f"sync{n}"](), game8=G8(gid, gh))

step(P2, P2E, "Sync", "วิธีหาช่องที่ปลอดภัย", "How to find the safe tile",
     "ดูช่องมุมใต้ของพื้นสีฟ้าทั้ง 2 พื้น (วงแดงบนพื้นสีฟ้า)\n"
     "ไม่มีดาบทั้งคู่ → มุมใต้ของพื้นกลางปลอดภัย (วงแดงล่าง)\n"
     "มีดาบ → ดูช่องก่อนหน้า คือช่องเหนือมุมใต้ (วงแดงบน)\n\n"
     "บางครั้งโดนทั้งมุมใต้และช่องก่อนหน้า\n"
     "ให้ดูขอบเขตของ Half Full แล้ววิ่งเข้าช่องซ้ายหรือขวาของมุมใต้ (วงเขียว)\n\n"
     "Half Full หลบได้โดยชิดซ้ายหรือขวาในช่องที่ปลอดภัย\n"
     "ในภาพ A คือทิศเหนือ C คือทิศใต้",
     "Look at the south-corner tile of both blue floors (the red rings on the blue floors)\n"
     "Neither has a sword → the middle floor's south corner is safe (the lower red ring)\n"
     "A sword there → look at the tile before it, just north of the south corner (the upper red ring)\n\n"
     "Sometimes the south corner and the tile before are both hit\n"
     "Then read Half Full's area and run into the tile left or right of the south corner (the green rings)\n\n"
     "Half Full is dodged by leaning left or right within the safe tile\n"
     "In the picture A is north and C is south",
     scene=sync_safe(), game8=G8(10206916, "98032df778a6b46556cb075386e5fa89.jpeg"))

GGC = "Greater Gateway + Forged Track + Chasm of Vollok"
step(P2, P2E, GGC, "① เส้นเชื่อมพื้นรอบนอกกับพื้นกลาง", "① Lines link the outer floors to the middle",
     "① มีเส้นเชื่อมระหว่างพื้นรอบนอกกับพื้นกลาง\n"
     "เส้นมี 3 สี: แดง เขียว และฟ้า",
     "① Lines link the outer floors to the middle floor\n"
     "They come in 3 colours: red, green and blue",
     scene=gate1(), game8=G8(10205726, "a5c818bc662a72bbdc6ff57f4dd41297.png"))

step(P2, P2E, GGC, "② ดาบโผล่: ดูสีของเส้น", "② Blades appear: read the line colour",
     "② Blade Warp: ดาบโผล่บนพื้นรอบนอก\n"
     "พื้นที่มีเส้นแดงกับพื้นที่มีเส้นเขียว จะมีดาบอยู่พื้นใดพื้นหนึ่ง\n"
     "ดูให้ออกว่าดาบอยู่บนพื้นที่เชื่อมด้วยเส้นสีไหน",
     "② Blade Warp: blades appear on the outer floors\n"
     "One of the two floors with the red and the green lines gets a blade\n"
     "Work out which colour of line joins that blade's floor",
     scene=gate2(), game8=G8(10205725, "01fd66b4e647a1e1609604a7c547aac5.png"))

step(P2, P2E, GGC, "③ เส้นแดงกิน 3 แถว เส้นฟ้ากิน 1 แถว", "③ Red line: 3 rows / blue line: 1 row",
     "③ ดาบยิง AoE เป็นแถวตรงบนพื้นรอบนอก\n"
     "แล้ว AoE ไต่ตามเส้นที่ไขว้กัน (แบบจับฉลากลากเส้น) ไปออกที่แถวที่เส้นพาไปบนพื้นกลาง\n\n"
     "เส้นแดง: AoE ออกที่แถวปลายทาง แล้วขยายไปข้างละ 1 แถว รวม 3 แถว\n"
     "เส้นฟ้า: AoE ออกแถวเดียวตรงปลายทาง",
     "③ Each blade fires a straight row AoE across its outer floor\n"
     "Then the AoE follows the crossing lines, like a ladder lottery, to the row they lead to on the middle floor\n\n"
     "Red line: an AoE on the row it reaches, widened by 1 row on each side, 3 rows in all\n"
     "Blue line: an AoE on just the one row it reaches",
     scene=gate3(), game8=G8(10205728, "e0ce34a2307975dd7a62d4cb2bd56411.png"))

step(P2, P2E, GGC, "④ Chasm of Vollok: spread คนละช่อง", "④ Chasm of Vollok: one tile each",
     "④ จากนั้นทุกคนได้เครื่องหมายสีเหลือง (Chasm of Vollok)\n"
     "แล้วมี AoE ออกตรงช่องที่แต่ละคนยืน ช่องละ 1 ช่อง\n"
     "spread คนละช่อง อย่าทับใคร\n\n"
     "ให้ Tank, Melee และ Range ซึ่งขยับง่ายกว่า ไปช่องที่ไกลออกไป",
     "④ Then everyone gets a yellow marker (Chasm of Vollok)\n"
     "and an AoE hits the 1 tile each person stands on\n"
     "Spread one per tile, overlapping nobody\n\n"
     "Tanks, Melees and Ranges move more easily, so they take the far tiles",
     scene=gate4(), game8=G8(10205727, "e36b4563fc9030ad61f653d65da23d53.png"))

step(P2, P2E, GGC, "⑤ ถ้าดาบอยู่ฝั่งเส้นเขียว", "⑤ If the blade is on the green line's floor",
     "⑤ ดาบอยู่บนพื้นที่เชื่อมด้วยเส้นเขียว\n"
     "AoE ไต่ตามเส้นไปออกที่แถวปลายทางบนพื้นกลาง แล้วผลักกระเด็น (knockback) ด้วย",
     "⑤ The blade is on the floor joined by the green line\n"
     "The AoE follows the line to its row on the middle floor, and it also knocks back",
     scene=gate5(), game8=G8(10205723, "a4cec4c346589b9f4e9e37c7e6d1ef8f.png"))

step(P2, P2E, GGC, "⑥ knockback: ไปฝั่งที่ว่าง 2 แถว", "⑥ Knockback: go to the side with 2 free rows",
     "⑥ เกิด knockback ผลักออกไปด้านข้างของแถว\n"
     "ไปยืนฝั่งที่มีที่ปลอดภัย 2 แถว แล้วรับ knockback\n"
     "หรือใช้ Arm's Length / Surecast กัน knockback",
     "⑥ A knockback pushes out to the sides of the row\n"
     "Stand on the side with 2 safe rows and take it\n"
     "or use Arm's Length / Surecast to ignore it",
     scene=gate6(), game8=G8(10205729, "2c15d9eb0dc334635389aa5070956604.png"))

step(P2, P2E, "Greater Gateway + Forged Track", "หลบเส้นแดงและเส้นเขียว", "Dodging the red and the green line",
     "เส้นแดง: AoE ขยายไปข้างละแถว กิน 3 แถว เหลือแถวที่ปลอดภัยแค่ 1 แถว ไปที่แถวนั้น\n\n"
     "เส้นเขียว: AoE ที่ปลายทางผลักกระเด็นไกล ไปฝั่งที่มีที่ปลอดภัย 2 แถวแล้วรับ knockback\n"
     "knockback ของเส้นเขียวกันได้ด้วย Arm's Length / Surecast แนะนำให้ใช้\n\n"
     "ลำดับคิด:\n"
     "ดูก่อนว่าดาบอยู่พื้นเส้นแดงหรือเส้นเขียว แล้วไปที่ปลอดภัยของเส้นนั้น\n"
     "จากนั้นค่อยหาที่ปลอดภัยจากเส้นฟ้า",
     "Red line: the AoE widens a row on each side, 3 rows, leaving just 1 safe row; go to it\n\n"
     "Green line: the AoE at its end knocks you far; go to the side with 2 safe rows and take it\n"
     "Arm's Length / Surecast stop the green line's knockback, and are recommended\n\n"
     "In this order:\n"
     "first see whether the blade is on the red or the green line's floor, and go to that line's safe spot\n"
     "then find the spot safe from the blue lines")

step(P2, P2E, "Actualize", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "AoE เวททั้งปาร์ตี้\n"
     "แล้วสนามกลับเป็นพื้นใหญ่แบบเดิม",
     "A magic raid-wide\n"
     "Then the arena returns to the one big floor")

# ======================================================================= full arena 2
PTH = "Projection of Triumph + Forward Half / Backward Half"
step(P3, P3E, PTH, "① เส้นโผล่ 2 ฝั่ง + ดาบ 16 เล่ม", "① Lines on 2 sides + 16 swords",
     "① มีเส้นโผล่ที่ขอบสนาม 2 ฝั่งตรงข้ามกัน และมีดาบปักพื้น 16 เล่ม\n"
     "เส้นนี้ชนดาบเมื่อไหร่ เกิด AoE ทุกครั้ง\n"
     "ดูชนิดของเส้นที่เข้ามา แล้วหลบให้ถูก",
     "① Lines appear on 2 opposite edges, and 16 swords stand in the floor\n"
     "Every time a line touches a sword, an AoE goes off\n"
     "Read which kind of line is coming and dodge accordingly",
     scene=proj1(), game8=G8(10205742, "0a5b0725f6fb1daa7b99d15da6912ac6.png"))

step(P3, P3E, PTH, "② เส้นเคลื่อนเข้าหากัน", "② The lines move towards each other",
     "② เส้นทั้ง 2 ฝั่งเคลื่อนเข้าหากัน",
     "② The two lines move towards each other",
     scene=proj2(), game8=G8(10205747, "b6e68543b0dd6e00f3f83ab90ef7ab91.png"))

step(P3, P3E, PTH, "③ ชนดาบ: AoE มี 2 แบบ", "③ Touching a sword: 2 kinds of AoE",
     "③ เส้นชนดาบแล้วเกิด AoE มี 2 แบบ: donut กับวงกลมเล็ก\n"
     "donut ยืนตรงดาบ / วงกลมเล็ก ยืนระหว่างดาบ (ดูขั้น \"ชนิดของเส้น\")",
     "③ When a line touches a sword an AoE goes off, of 2 kinds: a donut or a small circle\n"
     "Donut: stand on the sword / small circle: stand between swords (see \"The two kinds of line\")",
     scene=proj3(), game8=G8(10205743, "2497150352fe09ee90f7460ed5385e0f.png"))

step(P3, P3E, PTH, "④ เกิด AoE ทุกครั้งที่ชนดาบ", "④ An AoE at every sword",
     "④ เส้นเคลื่อนต่อ และเกิด AoE ทุกครั้งที่ชนดาบ\n"
     "ภาพนี้: ทุกคนยืนตรงดาบ ในรูของ donut",
     "④ The lines keep moving, with an AoE at every sword they touch\n"
     "In this picture everyone stands on a sword, inside a donut's hole",
     scene=proj4(), game8=G8(10205746, "2b3fcadf07a227886e79750f81335d1a.png"))

step(P3, P3E, PTH, "⑤ เส้นที่ 2 โผล่", "⑤ The 2nd lines appear",
     "⑤ เส้นที่ 2 โผล่จากขอบสนามตามมา\n\n"
     "เส้นฝั่งเดียวกันอาจมา donut 2 เส้นติด หรือเส้นแรก donut แล้วเส้นที่ 2 เป็นวงกลมเล็กก็ได้\n"
     "ดูให้ดีทุกเส้น",
     "⑤ The 2nd lines appear from the edges behind them\n\n"
     "One side can bring 2 donut lines in a row, or a donut line then a small-circle line\n"
     "Check every line",
     scene=proj5(), game8=G8(10205748, "c0c7e39524dada880b441b1990be4e51.png"))

step(P3, P3E, PTH, "⑥ เส้นแรกเคลื่อนจนสุด", "⑥ The 1st lines finish",
     "⑥ เส้นแรกเคลื่อนจนสุดขอบ",
     "⑥ The 1st lines reach the far edge",
     scene=proj6(), game8=G8(10205745, "46797df481c063276c0972bd1ea117d7.png"))

step(P3, P3E, PTH, "⑦ บอสร่าย Forward Half", "⑦ The boss casts Forward Half",
     "⑦ พร้อมกันนั้นบอสร่าย Forward Half (หรือ Backward Half)\n"
     "ไปหลบที่ดาบในฝั่งที่ปลอดภัยของ Half\n\n"
     "ภาพนี้: Forward Half บอสหันไปทางเหนือ ดาบที่เรืองอยู่ฝั่งตะวันออก\n"
     "ที่ปลอดภัยคือหน้าบอส ฝั่งตะวันออก (ตะวันออกเฉียงเหนือ)",
     "⑦ At the same time the boss casts Forward Half (or Backward Half)\n"
     "Wait it out by a sword on the Half's safe side\n\n"
     "In this picture: Forward Half, the boss faces north, its glowing sword on the east\n"
     "Safe is in front of the boss on the east side (north-east)",
     scene=proj7(), game8=G8(10205741, "7ce228da8fe3d817f14437c0c1f79328.png"))

step(P3, P3E, PTH, "⑧ ถ้าเป็น Backward Half", "⑧ If it is Backward Half",
     "⑧ Backward Half: ที่ปลอดภัยคือหลังบอส ฝั่งดาบที่ไม่เรือง\n"
     "ภาพนี้คือฝั่งตะวันตก (ตะวันตกเฉียงใต้)",
     "⑧ Backward Half: safe is behind the boss, on the side of the sword that does not glow\n"
     "In this picture that is the west side (south-west)",
     scene=proj8(), game8=G8(10205744, "a48e7f29d8b272bc2a482f0ccc4b79eb.png"))

step(P3, P3E, PTH, "⑨ เส้นที่ 2 ชนดาบต่อทันที", "⑨ The 2nd lines hit swords right after",
     "⑨ Half ออกแล้ว เส้นที่ 2 ชนดาบต่อทันที อย่าเพิ่งวางใจ หลบ AoE ต่อ\n"
     "game8 ใช้ภาพเดียวกับ ④",
     "⑨ Right after the Half, the 2nd lines touch swords; stay alert and keep dodging\n"
     "game8 shows the same picture as ④",
     scene=proj4(), game8=G8(10205746, "2b3fcadf07a227886e79750f81335d1a.png"))

step(P3, P3E, PTH, "⑩ เส้นที่ 2 เคลื่อนจนสุด", "⑩ The 2nd lines finish",
     "⑩ เส้นที่ 2 เคลื่อนจนสุด จบท่า\n"
     "game8 ใช้ภาพเดียวกับ ③",
     "⑩ The 2nd lines reach the far edge, and it ends\n"
     "game8 shows the same picture as ③",
     scene=proj3(), game8=G8(10205743, "2497150352fe09ee90f7460ed5385e0f.png"))

step(P3, P3E, "Projection of Triumph", "ชนิดของเส้น", "The two kinds of line",
     "donut: เส้นที่มีลูกวงแหวนสีชมพู ชนดาบแล้วเกิด AoE donut\n"
     "ตอนชน ที่ปลอดภัยคือตรงที่ดาบปักอยู่\n\n"
     "วงกลมเล็ก: เส้นที่มีลูกไฟสีเข้ม ชนดาบแล้วเกิด AoE วงกลมเล็ก\n"
     "ตอนชน ที่ปลอดภัยคือระหว่างดาบกับดาบ",
     "Donut: the line with pink ring orbs; touching a sword makes a donut AoE\n"
     "When it touches, the safe spot is right on the sword\n\n"
     "Small circle: the line with dark fiery orbs; touching a sword makes a small circle AoE\n"
     "When it touches, the safe spot is between swords",
     refs=[(G8(10206556, "9be1920d118bb83ee810eb339cf8d76a.jpeg"), "เส้น donut: ลูกวงแหวนสีชมพู ตรงกลางสีฟ้า", "Donut line: a pink ring with a teal centre"),
           (G8(10206557, "0560964f9df3f12233bb1f2301e191ae.jpeg"), "เส้นวงกลมเล็ก: ลูกไฟสีเข้ม", "Small-circle line: a dark fiery ball")])

TURMOIL = ["H1", "H2", "D4", "D3", "D2", "D1", "ST", "MT"]
t_says = {s: f"แตะเส้นเป็นคนที่ {i + 1}" for i, s in enumerate(TURMOIL)}
t_says_en = {s: f"Touch the line {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][i]}" for i, s in enumerate(TURMOIL)}
t_says["MT"] = "แตะเส้นคนที่ 8 ไม่ต้องฝืนเข้า stack ของคนอื่น / ลากบอสไปที่เส้น ไม่ไกลจน Melee ตีไม่ถึง"
t_says_en["MT"] = "Touch the line 8th; no need to force into the others' stacks / pull the boss to the line, not so far the Melees cannot reach"
step(P3, P3E, "Projection of Turmoil", "stack ทีละคนตามลำดับ (แบบ Hamukatsu)", "Stacks one at a time (Hamukatsu's order)",
     "มีเส้นเคลื่อนเข้ามาจากขอบสนาม และทุกคนติดดีบัฟ: แตะเส้นเมื่อไหร่เกิด stack ที่ตัวเรา\n"
     "ดีบัฟหายเมื่อแตะเส้นแล้วรับ stack ไป\n"
     "ผลัดกันไปแตะเส้นทีละคน ทั้งปาร์ตี้รับ stack ด้วยกันจนครบ 8 คน\n\n"
     "ลำดับ: H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n"
     "MT ไม่จำเป็นต้องฝืนเข้า stack\n\n"
     "รับ stack แล้วจะติดดีบัฟรับดาเมจเวทเพิ่ม 2 วินาที\n"
     "หลักสำคัญ: รอให้ดีบัฟนั้นหายก่อน คนต่อไปค่อยแตะเส้น\n\n"
     "เริ่มท่าแล้ว MT ลากบอสไปที่เส้น ให้ทุกคนตีบอสได้ระหว่าง stack\n"
     "MT อย่าลากไปไกล ให้กลุ่มที่ stack (Melee) ยังตีบอสถึง\n\n"
     "stack ของตัวเองเสร็จ ดีบัฟจะหาย หลังจากนั้นแตะเส้นก็ไม่เกิดอะไร เดินได้สบายขึ้น\n"
     "ดาเมจ stack มาจากบอส ท่าลดดาเมจที่ใส่บอส (Reprisal, Addle, Feint, Dismantle) ช่วยได้ (ข้อมูลจาก xivjpraids.com)",
     "A line sweeps in from the edge, and everyone gets a debuff: touching the line sets off a stack on you\n"
     "The debuff is gone once you touch the line and take the stack\n"
     "Take turns touching the line, one at a time, the whole party sharing each stack, 8 in all\n\n"
     "Order: H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n"
     "MT need not force a stack\n\n"
     "Each stack leaves a 2-second magic vulnerability\n"
     "The key rule: wait until it wears off before the next person touches the line\n\n"
     "Once it starts, MT pulls the boss to the line so everyone can hit it between stacks\n"
     "MT, don't pull it far: the stacking group (the Melees) must still reach the boss\n\n"
     "After your own stack your debuff is gone, and touching the line does nothing, so moving gets easier\n"
     "The stack damage comes from the boss, so mitigation on the boss (Reprisal, Addle, Feint, Dismantle) helps (from xivjpraids.com)",
     says=t_says, says_en=t_says_en)

step(P3, P3E, "Bitter Whirlwind", "Tank buster 3 ครั้ง: ใช้ invuln", "3-hit tank buster: invuln it",
     "ช่วงท้ายของ Projection of Turmoil มีท่าแรงใส่ Tank 3 ครั้งติด\n"
     "โดนแต่ละครั้งติดดีบัฟรับดาเมจเวทเพิ่ม จึงรับด้วยท่า invuln (ท่ากันตาย) ของ Tank\n"
     "ถ้าจะ invuln ทั้ง 3 ครั้ง ให้กดตอนแถบร่ายใกล้จบที่สุด",
     "Near the end of Projection of Turmoil comes a 3-hit tank buster\n"
     "Each hit adds a magic vulnerability, so take it with a tank invulnerability\n"
     "To invuln all 3, press it as late in the cast as you can",
     says={"MT": "รับ 3 ครั้งด้วย invuln กดตอนร่ายใกล้จบ"},
     says_en={"MT": "Take all 3 with an invuln, pressed late in the cast"})

# ======================================================================= split floors 2
step(P4, P4E, "Dawn of an Age", "raid-wide + สนามแยก 2 พื้น", "Raid-wide + two floors",
     "AoE เวททั้งปาร์ตี้ และสนามเปลี่ยนอีกครั้ง ใช้ท่าลดดาเมจและ barrier\n"
     "รอบนี้มีพื้นรอบนอกแค่ 1 พื้น\n"
     "ท่าต่อจากนี้ใช้ 2 พื้น: พื้นรอบนอก 1 พื้น กับพื้นเดิม",
     "A magic raid-wide that changes the arena again; use mitigation and barriers\n"
     "This time there is only 1 outer floor\n"
     "What follows uses 2 floors: that outer floor and the first one")

DVC = "Drum of Vollok + Sync + Chasm of Vollok"
DRUM_SPOT = {"H1": "คู่แรกฝั่งตะวันตก", "MT": "คู่ที่ 2 จากตะวันตก", "ST": "คู่ที่ 3 จากตะวันตก", "H2": "คู่สุดท้ายฝั่งตะวันออก"}
DRUM_SPOT_EN = {"H1": "westernmost pair", "MT": "2nd pair from the west", "ST": "3rd pair from the west", "H2": "easternmost pair"}
DRUM_PAIR = {"H1": "D3", "MT": "D1", "ST": "D2", "H2": "D4"}
d_says, d_says_en = {}, {}
for th, dps in DRUM_PAIR.items():
    d_says[th] = f"คู่กับ {dps} {DRUM_SPOT[th]} (บอสเป็นทิศเหนือ)"
    d_says[dps] = f"คู่กับ {th} {DRUM_SPOT[th]} (บอสเป็นทิศเหนือ)"
    d_says_en[th] = f"With {dps}, {DRUM_SPOT_EN[th]} (boss as north)"
    d_says_en[dps] = f"With {th}, {DRUM_SPOT_EN[th]} (boss as north)"
step(P4, P4E, DVC, "① stack คู่: อีกกลุ่มต่อหลัง", "① Pair stacks: the other group lines up behind",
     "① เครื่องหมาย stack 2 คน (วงสีขาว) ติดที่กลุ่ม Tank/Healer หรือกลุ่ม DPS\n"
     "กลุ่มที่ไม่ได้เครื่องหมาย ไปยืนต่อหลังคู่ของตัวเอง\n\n"
     "ยืนเป็นคู่ตาม macro เรียงจากตะวันตกไปตะวันออก ถือว่าบอสอยู่ทางเหนือ:\n"
     "H1·D3 > MT·D1 > ST·D2 > H2·D4",
     "① 2-person stack markers (white rings) land on the tanks/healers or on the DPS\n"
     "The unmarked group lines up behind their partner\n\n"
     "Pairs by the macro, west to east, treating the boss as north:\n"
     "H1·D3 > MT·D1 > ST·D2 > H2·D4",
     strict=True, says=d_says, says_en=d_says_en,
     scene=drum1(), game8=G8(10205767, "820c1f2dec33cf6a603896446b4bdb26.png"))

step(P4, P4E, DVC, "② stack ออก: คนไม่มีเครื่องหมายกระเด็นไปอีกพื้น", "② The stacks go off: the unmarked fly across",
     "② stack ออก คนที่ไม่มีเครื่องหมายจะกระเด็นไกลไปพื้นอีกฝั่ง\n"
     "ยืนให้ตกลงบนพื้นข้างๆ ได้พอดี อย่าตกขอบ\n\n"
     "ภาพนี้: Tank/Healer มีเครื่องหมาย อยู่ที่เดิม / DPS กระเด็นไปพื้นตะวันออกเฉียงเหนือ",
     "② The stacks go off and whoever has no marker is thrown far, onto the other floor\n"
     "Stand so you land on the next floor, not off the edge\n\n"
     "In this picture: the tanks/healers have the markers and stay / the DPS fly to the north-east floor",
     strict=["MT", "ST", "H1", "H2"],
     refs=[(XJ + "jump_faq_1.jpg",
            "ถ้าวงขาวไม่ได้อยู่ที่ตัวเรา เราจะกระเด็นออกจากจุดที่คู่ (เจ้าของวง) ยืน (ภาพจาก xivjpraids.com)",
            "If the white ring is not on you, you are thrown away from where your partner (its owner) stands (picture from xivjpraids.com)")],
     scene=drum2(), game8=G8(10205765, "d0b39432e7e684434ee67c8f531d2d1c.png"))

step(P4, P4E, DVC, "③ ดาบใหญ่ปักทั้ง 2 พื้น", "③ Big swords land on both floors",
     "③ Blade Warp: ดาบใหญ่ปักลงทั้ง 2 พื้น\n"
     "แต่ละเล่มกิน 4 ช่อง (2 × 2)",
     "③ Blade Warp: big swords land on both floors\n"
     "Each covers 4 tiles (2 × 2)",
     scene=drum3(), game8=G8(10205766, "9be98f513ef87748b0c71404f4714a7f.png"))

SP_TH = {"MT": "หน้าซ้าย", "ST": "หน้าขวา", "H1": "หลังซ้าย", "H2": "หลังขวา"}
SP_EN = {"MT": "front-left", "ST": "front-right", "H1": "back-left", "H2": "back-right"}
sp_says, sp_says_en = {}, {}
for th, dps in DRUM_PAIR.items():
    sp_says[th] = f"{SP_TH[th]} (หันหน้าหาบอส) บนพื้นของกลุ่มตัวเอง"
    sp_says[dps] = f"{SP_TH[th]} (หันหน้าหาบอส) บนพื้นของกลุ่มตัวเอง"
    sp_says_en[th] = f"{SP_EN[th].capitalize()} (facing the boss) on your group's floor"
    sp_says_en[dps] = f"{SP_EN[th].capitalize()} (facing the boss) on your group's floor"
step(P4, P4E, DVC, "④ Sync + เครื่องหมายเหลือง: spread ตาม macro", "④ Sync + yellow markers: spread by the macro",
     "④ Sync: ทั้ง 2 พื้นโดน AoE ตรงที่เดียวกับที่ดาบปัก (ช่องสีส้ม)\n"
     "พร้อมกันนั้นทุกคนได้เครื่องหมายเหลือง (Chasm of Vollok)\n"
     "spread คนละช่อง ในช่องที่ปลอดภัย ไม่โดนดาบใหญ่\n\n"
     "ตาม macro หันหน้าเข้าหาบอส (ถือว่าบอสอยู่ทางเหนือ):\n"
     "หน้าซ้าย MT·D1 / หน้าขวา ST·D2\n"
     "หลังซ้าย H1·D3 / หลังขวา H2·D4\n"
     "Tank/Healer อยู่พื้นหนึ่ง DPS อยู่อีกพื้น",
     "④ Sync: both floors are hit where the swords stand (the orange tiles)\n"
     "At the same time everyone gets a yellow marker (Chasm of Vollok)\n"
     "Spread one per tile, on safe tiles clear of the big swords\n\n"
     "By the macro, facing the boss (the boss as north):\n"
     "front-left MT·D1 / front-right ST·D2\n"
     "back-left H1·D3 / back-right H2·D4\n"
     "Tanks/healers on one floor, DPS on the other",
     strict=True, says=sp_says, says_en=sp_says_en,
     scene=drum4(), game8=G8(10205764, "dada881c7ad7d425af245d9a6e201169.png"))

HDB = "Forward Half / Backward Half + Duty's Edge + Burning Chains"
step(P4, P4E, HDB, "① Aero III: ลมขึ้นบน 2 พื้น", "① Aero III: wind on both floors",
     "① Aero III: มีลมสีเขียวขึ้นบนพื้นทั้ง 2 พื้น\n"
     "เข้าไปในลมจะถูกพัดกระเด็นไปพื้นอีกฝั่ง",
     "① Aero III: green wind appears on both floors\n"
     "Stepping into it throws you to the other floor",
     scene=chains1(), game8=G8(10206288, "0b92cb2847115d73c632fa02d4b9cad0.png"))

step(P4, P4E, HDB, "② Forward Half: กลุ่มที่ไม่เหลือที่ปลอดภัยเข้าลม", "② Forward Half: the group left without safe ground takes the wind",
     "② บอสร่าย Forward Half (หรือ Backward Half)\n"
     "กลุ่มที่อยู่บนพื้นที่จะโดนทั้งพื้น (Tank/Healer หรือ DPS) เข้าลมไปพื้นอีกฝั่ง\n\n"
     "ภาพนี้: Forward Half พื้นฝั่ง DPS จะโดน DPS จึงเข้าลมไปพื้นของ Tank/Healer",
     "② The boss casts Forward Half (or Backward Half)\n"
     "The group on the floor that will be hit (tanks/healers or DPS) takes the wind to the other floor\n\n"
     "In this picture: Forward Half hits the DPS floor, so the DPS take the wind to the tanks/healers' floor",
     scene=chains2(), game8=G8(10206293, "d07b3ecf59b3cf3eb120ed955c98b1d8.png"))

step(P4, P4E, HDB, "③ Half ออก", "③ The Half goes off",
     "③ Forward Half ออก\n"
     "ทั้งปาร์ตี้อยู่ด้วยกันในที่ปลอดภัย",
     "③ Forward Half goes off\n"
     "The whole party is together in the safe area",
     scene=chains3(), game8=G8(10206291, "cc39fc4f9e8450db2ced554c2dd42527.png"))

step(P4, P4E, HDB, "④ ถ้าเป็น Backward Half", "④ If it is Backward Half",
     "④ Backward Half\n"
     "ภาพนี้ที่ปลอดภัยอยู่บนพื้นฝั่ง DPS กลุ่ม Tank/Healer จึงเป็นฝ่ายเข้าลมไปอีกพื้น",
     "④ Backward Half\n"
     "In this picture the safe area is on the DPS floor, so the tanks/healers are the ones who take the wind",
     scene=chains4(), game8=G8(10206295, "7b9f03afb8c621d014d8d7de0f4a5f3d.png"))

step(P4, P4E, HDB, "⑤ Duty's Edge: line stack 4 ครั้ง", "⑤ Duty's Edge: 4 line stacks",
     "⑤ Duty's Edge: stack เป็นแนวเส้น (line stack) ใส่ทั้งปาร์ตี้ 4 ครั้งติด\n"
     "ทุกคนรวมกันในแนวเส้น",
     "⑤ Duty's Edge: 4 line stacks on the whole party in a row\n"
     "Everyone gathers in the line",
     scene=chains5(), game8=G8(10206294, "fca5b660b07f0151331cfd3de9a2b9ad.png"))

step(P4, P4E, HDB, "⑥ Burning Chains: โซ่โยง Tank/Healer กับ DPS", "⑥ Burning Chains: tanks/healers chained to DPS",
     "⑥ Burning Chains: Tank/Healer กับ DPS ถูกโยงด้วยโซ่ไฟเป็นคู่",
     "⑥ Burning Chains: tanks/healers and DPS are chained together in pairs",
     scene=chains6(), game8=G8(10206292, "d64ab82ae1ce7c8cd8303f85928bd725.png"))

step(P4, P4E, HDB, "⑦ คนที่ยังไม่ได้บิน เข้าลม", "⑦ Whoever has not flown takes the wind",
     "⑦ โซ่จะขาดก็ต่อเมื่อคู่อยู่คนละพื้น จึงต้องเข้าลมบินไปอีกพื้น\n"
     "คนที่บินมาแล้วตอน Half ติดดีบัฟ ถ้าเข้าลมอีกจะตาย\n"
     "กลุ่มที่ไม่ได้บินตอน Half จึงเป็นคนบิน (ภาพนี้คือ Tank/Healer)\n\n"
     "เคล็ดลับ: เข้าลมผิดมุมอาจถูกพัดไปผิดทางแล้วตกขอบ\n"
     "ระวังทิศที่เดินเข้า ให้ถูกพัดไปพื้นอีกฝั่ง\n"
     "ยืนที่ขอบลม ไม่ใช่ตรงกลาง จะนิ่งกว่า",
     "⑦ A chain only breaks with the pair on different floors, so someone must take the wind across\n"
     "Those who flew during the Half carry a debuff: entering the wind again kills them\n"
     "So the group that did not fly during the Half is the one that flies (in this picture, the tanks/healers)\n\n"
     "Tip: entering the wind at the wrong angle can throw you the wrong way and off the edge\n"
     "Mind the direction you walk in, so it throws you to the other floor\n"
     "Standing on the wind's edge, not its centre, is steadier",
     refs=[(XJ + "jump_faq_2.jpg", "ลมพัดเราออกจากจุดกลางของลม (ภาพจาก xivjpraids.com)",
            "The wind throws you away from its centre (picture from xivjpraids.com)")],
     scene=chains7(), game8=G8(10206289, "9858772007cdd839c3d4a5ee71b9cda3.png"))

step(P4, P4E, HDB, "⑧ บินแล้ววิ่งไปสุดขอบให้โซ่ขาด", "⑧ Fly, then run to the far edge to break it",
     "⑧ บินไปแล้ววิ่งต่อไปทางสุดขอบพื้น ให้โซ่ขาด",
     "⑧ After flying, keep running to the far edge of the floor so the chain breaks",
     scene=chains8(), game8=G8(10206290, "bdc02ac37506d775402eddfb540d3280.png"))

step(P4, P4E, "Actualize", "raid-wide + ลอยขึ้นฟ้า", "Raid-wide + knocked up",
     "AoE เวททั้งปาร์ตี้ ใช้ท่าลดดาเมจและ barrier\n"
     "โดนแล้วถูกดีดลอยขึ้นฟ้า สกิลที่กำลังร่ายจะสะดุดชั่วครู่ ระวังด้วย",
     "A magic raid-wide; use mitigation and barriers\n"
     "It knocks you up into the air, briefly interrupting what you are casting")

# ======================================================================= full arena 3
PHR = "Projection of Triumph + Half Circuit + Regicidal Rage"
step(P5, P5E, PHR, "①–④ เหมือนครั้งแรก", "①–④ As the first time",
     "Projection of Triumph ครั้งที่ 2 รอบนี้มี Half Circuit แทรกกลางท่า\n"
     "ต้องดูทั้งซ้ายขวาของบอส และในหรือนอกวงเป้า (target circle) ไปพร้อมกับหลบเส้น\n\n"
     "①–④ เหมือนครั้งแรก: เส้นโผล่ 2 ฝั่ง ดาบ 16 เล่ม เส้นเคลื่อนเข้าหากัน และเกิด AoE ทุกครั้งที่ชนดาบ\n"
     "game8 ใช้ภาพเดียวกับครั้งแรก (ดูสนามใหญ่ ครั้งที่ 2)",
     "Projection of Triumph a second time, now with Half Circuit in the middle\n"
     "Read the boss's left or right side, and inside or outside its target circle, while dodging the lines\n\n"
     "①–④ as the first time: lines on 2 sides, 16 swords, the lines move in, and an AoE at every sword they touch\n"
     "game8 shows the same pictures as the first time (see Full arena 2)")

step(P5, P5E, PHR, "⑤ Half Circuit: นอกวง + ครึ่งขวา", "⑤ Half Circuit: outside + the right half",
     "⑤ เส้นที่ 2 โผล่ และบอสร่าย Half Circuit\n"
     "Half Circuit = ครึ่งซ้ายหรือขวาของบอส + ในวงเป้า หรือนอกวงเป้า\n\n"
     "ภาพนี้: นอกวงเป้าและครึ่งขวา (ฝั่งสามเหลี่ยมสีฟ้า) จะโดน\n"
     "สังเกตในภาพ: ดาบสีฟ้า 2 เล่มอยู่ห่างจากบอส",
     "⑤ The 2nd lines appear and the boss casts Half Circuit\n"
     "Half Circuit = the boss's left or right half + inside or outside its target circle\n\n"
     "In this picture: outside the circle and the right half (the blue triangle's side) will be hit\n"
     "Note in the picture: the 2 blue blades are far from the boss",
     scene=circ5(), game8=G8(10206346, "4dc2b42b7d08edb14df43ab68a4bec2b.png"))

step(P5, P5E, PHR, "⑥ เข้าในวงเป้า ไปครึ่งซ้าย", "⑥ Into the circle, on the left half",
     "⑥ เข้าไปในวงเป้า แล้วหลบไปครึ่งซ้าย (ตะวันตก)",
     "⑥ Go inside the target circle, on the left (west) half",
     scene=circ6(), game8=G8(10206347, "1d0dfea48d57501ff235aa22865fa6cc.png"))

step(P5, P5E, PHR, "⑤' ถ้าในวงเป้าโดน", "⑤' If inside the circle is hit",
     "⑤' อีกแบบ: ในวงเป้าจะโดน\n"
     "สังเกตในภาพ: ดาบสีฟ้าอยู่ใกล้บอส",
     "⑤' The other version: inside the target circle will be hit\n"
     "Note in the picture: the blue blades are close to the boss",
     scene=circ5b(), game8=G8(10206345, "a1cbf9e4169fb3ffd22b30dc1e1bd2ec.png"))

step(P5, P5E, PHR, "⑥' ออกนอกวง ไปครึ่งซ้าย", "⑥' Outside the circle, on the left half",
     "⑥' Half Circuit ออก\n"
     "ภาพนี้ในวงเป้าและครึ่งขวาโดน ไปยืนนอกวงเป้า ฝั่งครึ่งซ้าย",
     "⑥' Half Circuit goes off\n"
     "Here inside the circle and the right half are hit; stand outside the circle on the left half",
     scene=circ6b(), game8=G8(10206344, "da94d7fc48de63f6f73f7fa5f3c7cdb5.png"))

step(P5, P5E, PHR, "⑦ เส้นที่ 2 ชนดาบต่อ + ร่าย Regicidal Rage", "⑦ The 2nd lines go on + Regicidal Rage",
     "⑦ หลัง Half Circuit เส้นที่ 2 ชนดาบต่อทันที อย่าเพิ่งวางใจ หลบ AoE ต่อ\n"
     "บอสร่าย Regicidal Rage\n"
     "game8 ใช้ภาพเดียวกับ ④ ของครั้งแรก",
     "⑦ Right after Half Circuit the 2nd lines touch swords; stay alert and keep dodging\n"
     "The boss casts Regicidal Rage\n"
     "game8 shows the same picture as ④ of the first time",
     scene=proj4(), game8=G8(10205746, "2b3fcadf07a227886e79750f81335d1a.png"))

step(P5, P5E, PHR, "⑧ เส้นจบ + Regicidal Rage ลง Tank", "⑧ The lines end + Regicidal Rage hits the tanks",
     "⑧ เส้นที่ 2 เคลื่อนจนสุด\n"
     "Regicidal Rage ลงที่ Tank ที่ถือสาย\n"
     "game8 ใช้ภาพเดียวกับ ③ ของครั้งแรก",
     "⑧ The 2nd lines reach the far edge\n"
     "Regicidal Rage lands on the tanks holding the tethers\n"
     "game8 shows the same picture as ③ of the first time",
     scene=proj3(), game8=G8(10205743, "2497150352fe09ee90f7460ed5385e0f.png"))

step(P5, P5E, "Regicidal Rage", "Tank ถือสาย รับตรงที่ไม่มีใคร", "Tanks take the tethers, away from everyone",
     "มีสายจากบอส Tank 2 คนรับสาย แล้วไปรับท่าตรงที่ไม่มีคนอื่น\n"
     "คนอื่นยืนให้ไม่ขวาง Tank\n"
     "ถ้าเส้นของ Projection of Triumph ยังผ่านไม่หมด ระวัง AoE ที่ออกตรงขอบสนามด้วย",
     "Tethers run from the boss; the 2 tanks take them and take the hits where nobody else is\n"
     "Everyone else stays out of the tanks' way\n"
     "If Projection of Triumph's lines have not all passed yet, watch the AoEs going off at the edge too",
     says={"MT": "รับสาย 1 เส้น ไปที่ที่ไม่มีใคร", "ST": "รับสาย 1 เส้น ไปที่ที่ไม่มีใคร"},
     says_en={"MT": "Take a tether, go where nobody is", "ST": "Take a tether, go where nobody is"})

step(P5, P5E, "Projection of Turmoil + Half Full", "stack ทีละคน + Half Full 3 ครั้ง", "Stacks one at a time + 3 Half Fulls",
     "เหมือนครั้งแรก: stack ทีละคนครบ 8 ครั้ง ตามลำดับ\n"
     "H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n\n"
     "รอบนี้มี Half Full แทรกระหว่างนั้น 3 ครั้ง\n"
     "ดูว่าครึ่งซ้ายหรือครึ่งขวาจะโดน ขยับไปฝั่งที่ปลอดภัย แล้ว stack ต่อ",
     "As the first time: 8 stacks one at a time, in order\n"
     "H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n\n"
     "This time Half Full comes 3 times in between\n"
     "See whether the left or the right half will be hit, move to the safe side, and carry on stacking",
     says=t_says, says_en=t_says_en)

step(P5, P5E, "Bitter Whirlwind", "ครั้งที่ 2: WAR invuln ได้อีก / อาชีพอื่นสลับ Tank", "2nd: WAR invulns again / others swap",
     "ใกล้จบ stack มีท่าแรงใส่ Tank 3 ครั้งติดอีกรอบ รับด้วย invuln\n"
     "ครั้งที่ 2 มาหลังครั้งแรกราว 240 วินาที\n\n"
     "WAR: Holmgang กลับมาทัน invuln รับได้เลย\n"
     "Tank อาชีพอื่น: invuln ยังไม่กลับมา ให้สลับ Tank ก่อนท่าออก แล้วอีกคนรับด้วย invuln ของตัวเอง",
     "Near the end of the stacks the 3-hit tank buster comes again; take it with an invuln\n"
     "The 2nd comes about 240 seconds after the 1st\n\n"
     "WAR: Holmgang is back in time, so just invuln it\n"
     "Other tanks: the invuln is not back yet, so tank swap just before, and the other tank takes it with their own invuln",
     says={"MT": "WAR: invuln อีกครั้ง / อาชีพอื่น: สลับให้ ST ก่อนท่าออก",
           "ST": "ถ้า MT ไม่ใช่ WAR: รับบอสก่อนท่าออก แล้ว invuln"},
     says_en={"MT": "WAR: invuln again / other jobs: swap to ST just before",
              "ST": "If MT is not a WAR: take the boss just before, then invuln"})

# ======================================================================= split floors 3
step(P6, P6E, "Dawn of an Age", "raid-wide + สนามแบบครั้งแรก", "Raid-wide + the first layout again",
     "AoE เวททั้งปาร์ตี้\n"
     "สนามเปลี่ยนเป็นแบบเดียวกับครั้งแรก: พื้นกลาง + พื้นรอบนอก 4 พื้น",
     "A magic raid-wide\n"
     "The arena takes the first layout again: the middle floor + 4 outer floors")

VCD = "Vollok + Sync + Chasm of Vollok + Duty's Edge"
step(P6, P6E, VCD, "①–② เหมือนครั้งแรก", "①–② As the first time",
     "Vollok ครั้งที่ 2 ส่วนใหญ่เหมือนครั้งแรก\n"
     "แต่แทนที่ Half Full จะเป็น Chasm of Vollok (เครื่องหมายเหลือง) spread คนละช่อง อย่าทับใคร\n\n"
     "① พื้นรอบนอก 4 พื้นโผล่\n"
     "② Blade Warp ปักดาบ แล้ว Sync เลือกพื้นที่เชื่อมกับพื้นกลาง\n"
     "game8 ใช้ภาพเดียวกับครั้งแรก",
     "The 2nd Vollok is mostly the same as the first\n"
     "but Chasm of Vollok (yellow markers) comes instead of Half Full: spread one per tile, overlapping nobody\n\n"
     "① Four outer floors appear\n"
     "② Blade Warp places the swords, then Sync picks the floors linked to the middle\n"
     "game8 shows the same pictures as the first time")

step(P6, P6E, VCD, "③ AoE ของดาบบนพื้นที่เชื่อมออก", "③ The linked swords' AoEs go off",
     "③ AoE ออกบนพื้นกลาง ตรงช่องเดียวกับดาบบนพื้นที่เชื่อม\n"
     "ยืนในช่องที่ไม่โดน",
     "③ AoEs go off on the middle floor, on the tiles matching the swords on the linked floors\n"
     "Stand in a tile that is not hit",
     scene=vollokb3(), game8=G8(10206381, "24c47bcb1bb1e77a46d5ebdc0fe17cd9.png"))

step(P6, P6E, VCD, "④ Chasm of Vollok: spread คนละช่อง", "④ Chasm of Vollok: one tile each",
     "④ AoE ของ Chasm of Vollok ออก\n"
     "ทุกคนแยกกันคนละช่อง อย่าทับใคร",
     "④ Chasm of Vollok's AoEs go off\n"
     "Everyone on their own tile, overlapping nobody",
     scene=vollokb4(), game8=G8(10206380, "2705831687ce5da9b34b5ea9bde68788.png"))

step(P6, P6E, VCD, "⑤ Duty's Edge: รวมกันรับ stack", "⑤ Duty's Edge: gather for the stack",
     "⑤ Duty's Edge: stack ใส่ทั้งปาร์ตี้ ทุกคนมารวมกัน\n"
     "แล้วจบท่า",
     "⑤ Duty's Edge: a stack on the whole party; everyone gathers\n"
     "and it ends",
     scene=vollokb5(), game8=G8(10206382, "75a94b63ceec5fd2af0dc401a1f22e70.png"))

step(P6, P6E, GGC, "เหมือนครั้งแรก", "As the first time",
     "Greater Gateway ครั้งที่ 2 เหมือนครั้งแรกทุกอย่าง (ดูสนามแยก ครั้งที่ 1)\n"
     "ไปที่ปลอดภัยของเส้นแดงหรือเส้นเขียวก่อน แล้วค่อยหาที่ปลอดภัยจากเส้นฟ้า\n"
     "จากนั้น spread ของ Chasm of Vollok คนละช่อง อย่าทับใคร",
     "The 2nd Greater Gateway is exactly as the first (see Split floors 1)\n"
     "Go to the red or green line's safe spot first, then find the spot safe from the blue lines\n"
     "Then spread for Chasm of Vollok, one per tile, overlapping nobody")

step(P6, P6E, "Actualize", "raid-wide + สนามกลับแบบเดิม", "Raid-wide + the arena returns",
     "AoE เวททั้งปาร์ตี้\n"
     "แล้วสนามกลับเป็นพื้นใหญ่แบบเดิม",
     "A magic raid-wide\n"
     "Then the arena returns to the one big floor")

# ======================================================================= final phase
step(P7, P7E, MDH, "เหมือนท่าแรกของไฟต์", "As at the start of the fight",
     "เหมือนท่าแรกของไฟต์ทุกอย่าง (ดูช่วงแรก)\n"
     "ไปยืนตรงที่ปลอดภัยทั้งจาก Half และจากเส้นของ X",
     "Exactly as at the start of the fight (see First phase)\n"
     "Stand where both the Half and the X's lines miss")

step(P7, P7E, "Actualize", "raid-wide หมดเวลา (enrage)", "Time-up raid-wide (enrage)",
     "หมดเวลา (enrage)\n"
     "ตีบอสให้ตายให้ทันก่อนร่ายจบ",
     "Time is up (enrage)\n"
     "Burn the boss down before the cast finishes")

# ======================================================================= the guide
ACC = [("Earring", "055000/055542"), ("Choker", "055000/055094"), ("Bracelet", "055000/055893"), ("Ring", "054000/054744")]
ROLES = ["Fending", "Slaying", "Aiming", "Healing", "Casting"]
pieces = [{"name": f"Resilient {slot} of {role}", "job": role, "icon_src": ICON(f"ui/icon/{path}_hr1.tex")}
          for slot, path in ACC for role in ROLES]

fight = {
    "guide": {
        "slug": "ex2-zoraal-ja", "short": "EX2", "name": "Zoraal Ja · Everkeep (Extreme)",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.0",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/622454",
        "content_key": "ex:Zoraal Ja",
        "note": ("แผนตาม game8 (แผนของ Hamukatsu)\n"
                 "ไฟต์นี้แทบไม่ใช้ Marker: วาง A ไว้ทางเหนือเพื่อบอกทิศก็พอ (ดูขั้นแรก)\n\n"
                 "Projection of Turmoil (stack ทีละคน):\n"
                 "H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n\n"
                 "Drum of Vollok (stack คู่) จากตะวันตกไปตะวันออก ถือว่าบอสอยู่ทางเหนือ:\n"
                 "H1·D3 > MT·D1 > ST·D2 > H2·D4\n\n"
                 "Vollok + Aero III (spread) หันหน้าเข้าหาบอส:\n"
                 "หน้าซ้าย MT·D1 / หน้าขวา ST·D2\n"
                 "หลังซ้าย H1·D3 / หลังขวา H2·D4\n\n"
                 "Bitter Whirlwind (Tank buster 3 ครั้ง) มา 2 รอบ รับด้วย invuln\n"
                 "มีแค่ WAR ที่ invuln ได้ทั้ง 2 รอบ อาชีพอื่นสลับ Tank"),
        "en": {"note": ("Plan follows game8 (Hamukatsu's strat)\n"
                        "This fight hardly uses waymarks: just A at north to mark the direction (see the first step)\n\n"
                        "Projection of Turmoil (stacks one at a time):\n"
                        "H1 > H2 > D4 > D3 > D2 > D1 > ST > MT\n\n"
                        "Drum of Vollok (pair stacks), west to east, the boss as north:\n"
                        "H1·D3 > MT·D1 > ST·D2 > H2·D4\n\n"
                        "Vollok + Aero III (spread), facing the boss:\n"
                        "front-left MT·D1 / front-right ST·D2\n"
                        "back-left H1·D3 / back-right H2·D4\n\n"
                        "Bitter Whirlwind (a 3-hit tank buster) comes twice; take it with an invuln\n"
                        "Only WAR can invuln both; other tanks swap")},
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
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/zoraal_ja/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166", "waymarks": {},
        "iconSize": 4.4, "markSize": 6.5, "bossSize": 8.6, "ring": 5,
    },
    "steps": steps,
    "rewards": [
        {"kind": "token", "name": "Resilient Totem", "icon_src": ICON("ui/icon/026000/026663_hr1.tex"),
         "say": ("ได้ 1 ชิ้นทุกครั้งที่เคลียร์ (การันตี)\n\n"
                 "แลกที่ NPC แลกของ Extreme ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "เครื่องประดับ IL710: 5 ชิ้น ต่อ 1 ชิ้น\n"
                 "Wings of Resolve: 99 ชิ้น"),
         "say_en": ("Every clear gives 1 (guaranteed).\n\n"
                    "Exchange them with the Extreme trial exchange NPC in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL710 accessory: 5 per piece\n"
                    "Wings of Resolve: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Extreme exchange"},
                   "say": "จุดแลก: Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "accessory", "name": "Resilient Accessories", "ilvl": 710, "icon_src": ICON("ui/icon/055000/055542_hr1.tex"),
         "say": ("แลกด้วย Resilient Totem 5 ชิ้น ต่อ 1 ชิ้น\n"
                 "ต่างหู สร้อยคอ กำไล แหวน อย่างละ 5 แบบตามสายอาชีพ\n\n"
                 "Fending = Tank\n"
                 "Slaying = MNK DRG SAM RPR\n"
                 "Aiming = BRD MCH DNC NIN VPR\n"
                 "Healing = Healer\n"
                 "Casting = BLM SMN RDM PCT\n\n"
                 "แตะไอคอนเพื่อดูชื่อ"),
         "say_en": ("5 Resilient Totems per piece\n"
                    "Earring, choker, bracelet and ring, 5 kinds each by role\n\n"
                    "Fending = tanks\n"
                    "Slaying = MNK DRG SAM RPR\n"
                    "Aiming = BRD MCH DNC NIN VPR\n"
                    "Healing = healers\n"
                    "Casting = BLM SMN RDM PCT\n\n"
                    "Tap an icon for its name"),
         "pieces": pieces},
        {"kind": "mount", "name": "Wings of Resolve", "icon_src": ICON("ui/icon/004000/004284_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก\nหรือแลกด้วย Resilient Totem 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate\nor 99 Resilient Totems",
         "pics": [{"src": ICON("ui/icon/068000/068284_hr1.tex"),
                   "say": "หน้าตา Wings of Resolve (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of Resolve, as the in-game Mount Guide shows it"}]},
        {"kind": "other", "name": "Resilient Armor", "icon_src": ICON("ui/icon/026000/026502_hr1.tex"),
         "say": ("ดรอปจากหีบ ใช้เป็นวัตถุดิบ craft\n"
                 "เช่น Resilient Sword Stand (ของแต่งบ้าน) และ Electrope Barding (ชุดเกราะ Chocobo)"),
         "say_en": ("Drops from the chest; a crafting material\n"
                    "for example for the Resilient Sword Stand (furnishing) and Electrope Barding (chocobo barding)")},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs")
