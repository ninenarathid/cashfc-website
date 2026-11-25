"""Builds scripts/guides/data/m10s.json (M10S, the Xtremes: game8's plan = Inumaru base, healers in the Watery Grave, fire A/C)."""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/m10s"
sys.path.insert(0, HERE + "/tools")
import scenes10 as S
import frames10 as FR

OUT = r"scripts/guides/data/m10s.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk.png
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"


def F(name, say, say_en):
    return (f"frames/m10s/{name}.webp", say, say_en, "Nukemaru", FR.url(name))


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1], "by": r[3], "url": r[4]} for r in refs]
    s["scene"] = scene
    if scene is not None:
        s["ring"] = 5.5
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วง Red Hot", "Red Hot")
P2 = ("ช่วง Deep Blue", "Deep Blue")
P3 = ("ช่วง 2 ตัว", "Both bosses")
P4 = ("ช่วง Watery Grave", "Watery Grave")
P5 = ("ช่วงแบ่งสนาม", "Split arena")
P6 = ("ช่วงท้าย", "Final part")

TANKS = {"MT": "ใช้ mitigate แล้วรับคู่กับ ST", "ST": "ใช้ mitigate แล้วรับคู่กับ MT"}
TANKS_EN = {"MT": "Mitigate, then take it together with ST", "ST": "Mitigate, then take it together with MT"}

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker ABCD + 1234", "Waymarks ABCD + 1234",
     "Marker A B C D บอกทิศ เหนือ ออก ใต้ ตก\n"
     "Marker 1 2 3 4 ใช้เป็นจุดยืนตอนช่วงแบ่งสนาม จึงต้องวางให้ครบ\n\n"
     "A เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\n"
     "1 2 3 4 อยู่ใกล้กลางสนาม (1 ตะวันตกเฉียงเหนือ วนตามเข็ม)",
     "Waymarks A B C D mark north, east, south and west\n"
     "Waymarks 1 2 3 4 are where people stand in the split-arena part, so they are required\n\n"
     "A north\nB east\nC south\nD west\n"
     "1 2 3 4 sit near the middle (1 north-west, then clockwise)",
     strict=False, pic=2, scene=S.waymarks())

# ------------------------------------------------------------------ Red Hot
step(P1, "Hot Impact", "tankbuster แบบ stack ที่ Tank 2 คน", "Shared tankbuster on both tanks",
     "tankbuster แบบ stack ใส่ Tank 2 คน\n"
     "Tank ใช้ mitigate แล้วรับด้วยกัน 2 คน\n"
     "เป็นดาเมจกายภาพ Feint ใช้ได้ผล",
     "A shared tankbuster on the two tanks\n"
     "Tanks mitigate and take it together\n"
     "It is physical damage, so Feint works",
     says=TANKS, says_en=TANKS_EN,
     refs=[F("hot-impact", "Hot Impact: tankbuster แบบ stack Tank 2 คนรับด้วยกัน", "Hot Impact: a shared tankbuster, both tanks take it together")])

FF = "Flame Floater + Alley-oop Inferno"
step(P1, FF, "① บอสย้ายทิศ = เหนือ", "① Where the boss goes = north",
     "Flame Floater: 4 คนได้ดีบัฟตัวเลขกับสาย บอสพุ่งใส่ทีละคนตามลำดับ ทางที่พุ่งเหลือพื้นไฟเป็นแนวตรง\n"
     "① ก่อนเริ่ม บอสย้ายไปทิศเหนือ ใต้ ออก หรือตก นับทิศที่บอสไปเป็นเหนือ\n\n"
     "วางแนวไฟเป็นรูปตัว Z กลับด้าน (macro: หันหาบอส สลับขวาบน / ซ้ายบน)\n"
     "Melee ที่ไม่ได้เป็นเป้าจะตีต่อได้ และที่ปลอดภัยของท่าถัดไปจะกว้างขึ้นมาก\n"
     "ภาพ: บอสไปทางตะวันตก ทุกภาพในหัวข้อนี้หมุนให้ทิศนั้นเป็นเหนือ",
     "Flame Floater: 4 players get number debuffs and tethers; the boss charges them one by one in order, leaving a straight line of fire floor on the way\n"
     "① First the boss moves to the north, south, east or west; count where it went as north\n\n"
     "Lay the lines as a mirrored Z (macro: facing the boss, alternate upper right / upper left)\n"
     "Melee who are not targeted can keep attacking, and the safe area for later mechanics becomes much bigger\n"
     "Picture: the boss went west; the following pictures turn that way to north",
     strict=False, pic=3, scene=S.ff1())
step(P1, FF, "② เลข 1 ไปตะวันออกเฉียงเหนือ", "② Number 1 to the north-east",
     "② คนดีบัฟเลข 1 (สายต่อกับบอส) ไปทางตะวันออกเฉียงเหนือ ล่อ AoE แนวตรง\n"
     "ภาพเป็นตัวอย่าง ใครได้เลขไหนสุ่ม",
     "② The number 1 debuff (tethered to the boss) moves north-east to bait the line AoE\n"
     "The picture is an example; who gets which number is random",
     strict=False, pic=4, scene=S.ff2(),
     refs=[F("flame-floater", "Flame Floater: บอสพุ่งใส่คนที่มีสาย ทางที่พุ่งเหลือพื้นไฟเป็นแนวตรง", "Flame Floater: the boss charges the tethered player, leaving a straight fire line")])
step(P1, FF, "③ เลข 2 ไปเหนือ", "③ Number 2 to the north",
     "③ คนเลข 2 (สายต่อกับคนเลข 1) ไปทางเหนือ ล่อ AoE แนวตรง",
     "③ Number 2 (tethered to number 1) moves north to bait the line AoE",
     strict=False, pic=5, scene=S.ff3())
step(P1, FF, "④ เลข 3 ไปตะวันออกเฉียงเหนือ", "④ Number 3 to the north-east",
     "④ คนเลข 3 (สายต่อกับคนเลข 2) ไปทางตะวันออกเฉียงเหนือ ล่อ AoE แนวตรง",
     "④ Number 3 (tethered to number 2) moves north-east to bait the line AoE",
     strict=False, pic=6, scene=S.ff4())
step(P1, FF, "⑤ เลข 4 ไปเหนือ", "⑤ Number 4 to the north",
     "⑤ คนเลข 4 (สายต่อกับคนเลข 3) ไปทางเหนือ ล่อ AoE แนวตรง",
     "⑤ Number 4 (tethered to number 3) moves north to bait the line AoE",
     strict=False, pic=7, scene=S.ff5())
step(P1, FF, "⑥ Alley-oop Inferno: ทิ้งวงกลมที่ขอบนอก", "⑥ Alley-oop Inferno: drop the circles at the edge",
     "⑥ หลัง Flame Floater บอสร่าย Alley-oop Inferno ทุกคนได้มาร์ก AoE วงกลมที่เหลือพื้นไฟ ทิ้งที่ขอบนอก\n"
     "ให้นึกไว้ว่า Melee อยู่แถวรอบบอส Range ทิ้งฝั่งขอบนอก\n\n"
     "ตามภาพ:\n"
     "แถวเหนือ จากตะวันตก: D3 > D1 > MT > D2 > ST > D4\n"
     "ขอบตะวันตก จากเหนือ: H2 > H1",
     "⑥ After Flame Floater the boss casts Alley-oop Inferno: everyone gets a circle AoE marker that leaves fire floor; drop it at the outer edge\n"
     "Keep in mind: melee around the boss, ranged drop theirs on the outer side\n\n"
     "As pictured:\n"
     "North row, from the west: D3 > D1 > MT > D2 > ST > D4\n"
     "West edge, from the north: H2 > H1",
     strict=True, pic=8, scene=S.ff6(),
     says={"D3": "แถวเหนือ คนแรกฝั่งตะวันตก", "D1": "แถวเหนือ คนที่ 2", "MT": "แถวเหนือ คนที่ 3", "D2": "แถวเหนือ คนที่ 4",
           "ST": "แถวเหนือ คนที่ 5", "D4": "แถวเหนือ คนสุดท้ายฝั่งตะวันออก", "H2": "ขอบตะวันตก บน", "H1": "ขอบตะวันตก ล่าง"},
     says_en={"D3": "North row, first from the west", "D1": "North row, 2nd", "MT": "North row, 3rd", "D2": "North row, 4th",
              "ST": "North row, 5th", "D4": "North row, last on the east", "H2": "West edge, upper", "H1": "West edge, lower"},
     refs=[F("alley-oop-inferno", "Alley-oop Inferno: AoE วงกลมทุกคน ที่ที่ระเบิดเหลือพื้นไฟ", "Alley-oop Inferno: a circle on everyone; each leaves fire floor")])

CB = "Cutback Blaze + Pyrotation"
step(P1, CB, "① MT ล่อบอสให้มีที่ว่าง", "① MT moves the boss to make room",
     "Cutback Blaze: กรวยประมาณ 330° ใส่คนที่อยู่ไกลที่สุด เกิดตอนพื้นไฟของ Flame Floater และ Alley-oop Inferno ยังอยู่\n"
     "① MT ล่อบอสไปตรงที่มีจุดล่อกรวย และให้เกิดที่ปลอดภัยกว้าง (ให้มีที่ว่างรอบบอส)",
     "Cutback Blaze: a cone of about 330° on the farthest player, while the Flame Floater and Alley-oop Inferno fire floors are still down\n"
     "① MT moves the boss so there is a spot to bait the cone and a wide safe area (room around the boss)",
     strict=False, pic=9, scene=S.cut1(),
     says={"MT": "ล่อบอสไปให้มีจุดล่อกรวย และที่ปลอดภัยกว้าง"}, says_en={"MT": "Move the boss so there is a bait spot and a wide safe area"})
step(P1, CB, "② ล่อกรวยที่ที่ปลอดภัยใกล้ขอบนอก", "② Bait the cone in the safe spot near the edge",
     "② ล่อ Cutback Blaze ที่ที่ปลอดภัยฝั่งใกล้ขอบนอก\nกรวยก็เหลือพื้นไฟเหมือนกัน",
     "② Bait Cutback Blaze in the safe spot near the outer edge\nThe cone leaves fire floor too",
     strict=False, pic=10, scene=S.cut2(),
     refs=[F("cutback-blaze", "Cutback Blaze: กรวย 330° เหลือพื้นไฟ ช่องที่ไม่โดนคือที่ปลอดภัยแคบ", "Cutback Blaze: a 330° cone that leaves fire floor; the gap is a narrow safe area")])
step(P1, CB, "③ stack ครั้งที่ 1", "③ First stack",
     "Pyrotation: stack 3 ครั้งติด แต่ละครั้งเหลือพื้นไฟ ต้องขยับไปในที่ปลอดภัยทุกครั้ง\n"
     "③ stack ครั้งที่ 1 ในที่ที่ไม่มีพื้นไฟ",
     "Pyrotation: three stacks in a row, each leaving fire floor, so keep moving within the safe area\n"
     "③ Take the first stack where there is no fire floor",
     strict=False, pic=11, scene=S.cut3(),
     refs=[F("pyrotation", "Pyrotation: stack 3 ครั้งติด แต่ละครั้งเหลือพื้นไฟ ต้องขยับทุกครั้ง", "Pyrotation: three stacks in a row, each leaves fire floor, so move every time")])
step(P1, CB, "④ ขยับ แล้ว stack ครั้งที่ 2", "④ Move, then the second stack",
     "④ พื้นไฟยังอยู่ ขยับไปพร้อมกัน แล้วรับ stack ครั้งที่ 2",
     "④ The fire floor stays, so move together and take the second stack",
     strict=False, pic=12, scene=S.cut4())
step(P1, CB, "⑤ ขยับต่อ stack ครั้งที่ 3", "⑤ Move again, third stack",
     "⑤ ขยับต่อ แล้วรับ stack ครั้งที่ 3",
     "⑤ Move on and take the third stack",
     strict=False, pic=13, scene=S.cut5())
step(P1, CB, "⑥ หลบไปที่ไม่มีพื้นไฟ", "⑥ Get out to clear floor",
     "⑥ หลบไปที่ที่ไม่มีพื้นไฟ",
     "⑥ Move away to where there is no fire floor",
     strict=False, pic=14, scene=S.cut6())

step(P1, "Divers' Dare", "raid-wide ล้างพื้นไฟ", "Raid-wide that clears the fire",
     "AoE เวททั้งปาร์ตี้ (raid-wide)\nพอโดนแล้วพื้นไฟทั้งหมดในสนามหายไป",
     "Magic raid-wide AoE\nWhen it lands, every fire floor on the field disappears",
     refs=[F("divers-dare", "Divers' Dare: raid-wide พื้นไฟทั้งหมดในสนามหายไป", "Divers' Dare: raid-wide; all fire floors on the field disappear")])

# ------------------------------------------------------------------ Deep Blue
SW = "Sick Swell + Sickest Take-off"
SW_SAYS = {"MT": "กลุ่ม MT ฝั่งซ้าย", "H1": "กลุ่ม MT ฝั่งซ้าย", "D1": "กลุ่ม MT ฝั่งซ้าย", "D3": "กลุ่ม MT ฝั่งซ้าย",
           "ST": "กลุ่ม ST ฝั่งขวา", "H2": "กลุ่ม ST ฝั่งขวา", "D2": "กลุ่ม ST ฝั่งขวา", "D4": "กลุ่ม ST ฝั่งขวา"}
SW_SAYS_EN = {k: ("MT group, left side" if v.startswith("กลุ่ม MT") else "ST group, right side") for k, v in SW_SAYS.items()}
step(P2, SW, "① เส้นต่อขอบนอก = เหนือ", "① The tethered edge = north",
     "knockback และ AoE แนวตรงจากขอบสนาม พร้อม stack หรือ spread\n"
     "① Sick Swell: บอสมีเส้นต่อกับขอบนอก นับทิศที่เส้นต่อเป็นเหนือ\n"
     "knockback จะมาจากขอบที่มีเส้นต่อ\n"
     "AoE แนวตรงมาจากที่ที่บอสอยู่ ในทิศที่ knockback มา\n\n"
     "หลังจบชุดนี้ บอสกลับมากลางสนามเสมอ Tank กับ Melee ชิดกลางไว้จะตีได้ทันที",
     "Knockback and line AoEs from the edge, plus a stack or a spread\n"
     "① Sick Swell: the boss tethers to the outer edge; count the tethered side as north\n"
     "The knockback comes from the tethered edge\n"
     "The line AoE comes from where the boss is, on the knockback side\n\n"
     "After this set the boss always comes back to the middle; tanks and melee who hug the middle can hit it at once",
     strict=False, pic=15, scene=S.sw1(),
     refs=[F("sick-swell", "Sick Swell: คลื่นที่ขอบนอก knockback มาจากทิศที่มีเส้นต่อ", "Sick Swell: a wave at the edge; the knockback comes from the tethered side")])
step(P2, SW, "②-1 ลูกบอล 8 ลูก = spread", "②-1 Eight orbs = spread",
     "ดูจำนวนลูกบอลรอบบอสตอนร่าย Sickest Take-off: 8 ลูก = spread / 2 ลูก = stack\n\n"
     "②-1 8 ลูก = spread: หลบ AoE แนวตรงจากขอบนอก แยกกลุ่ม MT ซ้าย กลุ่ม ST ขวา แล้ว spread ฝั่งเหนือ\n"
     "(macro, หันหาบอสที่เหนือ):\n"
     "D3 / MT | ST / D4\n"
     "H1 / D1 | D2 / H2",
     "Count the orbs around the boss as it casts Sickest Take-off: 8 = spread / 2 = stacks\n\n"
     "②-1 8 orbs = spread: dodge the line AoE from the edge, split MT group left and ST group right, and spread on the north side\n"
     "(macro, facing the boss in the north):\n"
     "D3 / MT | ST / D4\n"
     "H1 / D1 | D2 / H2",
     strict=True, pic=16, scene=S.sw2(), says=SW_SAYS, says_en=SW_SAYS_EN,
     refs=[F("take-off-orbs", "Sickest Take-off: ลูกบอลรอบบอส 8 ลูก = spread / 2 ลูก = stack", "Sickest Take-off: orbs around the boss, 8 = spread / 2 = stacks")])
step(P2, SW, "②-2 ลูกบอล 2 ลูก = stack 4:4", "②-2 Two orbs = 4:4 stacks",
     "②-2 2 ลูก = stack: หลบ AoE แนวตรงจากขอบนอก แยกกลุ่ม MT ซ้าย กลุ่ม ST ขวา แล้ว stack ฝั่งเหนือ\n"
     "กลุ่ม MT: MT H1 D1 D3\n"
     "กลุ่ม ST: ST H2 D2 D4",
     "②-2 2 orbs = stacks: dodge the line AoE from the edge, split MT group left and ST group right, and stack on the north side\n"
     "MT group: MT H1 D1 D3\n"
     "ST group: ST H2 D2 D4",
     strict=True, pic=17, scene=S.sw3(), says=SW_SAYS, says_en=SW_SAYS_EN)
step(P2, SW, "AoE แนวตรงอยู่ซ้าย", "Line AoE on the left",
     "ถ้า AoE แนวตรงขึ้นทางซ้าย ใช้ที่ปลอดภัยฝั่งที่กว้าง แบ่งกลุ่ม MT ซ้าย กลุ่ม ST ขวา ทำฝั่งเหนือเหมือนเดิม\n"
     "ภาพ: stack",
     "If the line AoE is on the left, use the wide safe side; MT group left, ST group right, on the north side as before\n"
     "Picture: stacks",
     strict=True, pic=18, scene=S.sw4(), says=SW_SAYS, says_en=SW_SAYS_EN,
     refs=[F("take-off-lanes", "AoE แนวตรงมาจากแถวที่บอสอยู่ กลุ่ม MT ใช้ฝั่งซ้าย กลุ่ม ST ใช้ฝั่งขวา", "The line AoE comes from the boss's lane; MT group uses the left, ST group the right")])
step(P2, SW, "AoE แนวตรงอยู่ขวา", "Line AoE on the right",
     "ถ้า AoE แนวตรงขึ้นทางขวาก็เหมือนกัน: ใช้ที่ปลอดภัยฝั่งที่กว้าง กลุ่ม MT ซ้าย กลุ่ม ST ขวา ทำฝั่งเหนือ\n"
     "ภาพ: spread",
     "Same if the line AoE is on the right: use the wide safe side, MT group left, ST group right, on the north side\n"
     "Picture: spread",
     strict=True, pic=19, scene=S.sw5(), says=SW_SAYS, says_en=SW_SAYS_EN)

AO = "Alley-oop Double-dip / Reverse Alley-oop"
SPREAD8 = {"MT": "spread เหนือ", "D4": "spread ตะวันออกเฉียงเหนือ", "H2": "spread ตะวันออก", "D2": "spread ตะวันออกเฉียงใต้",
           "ST": "spread ใต้", "D1": "spread ตะวันตกเฉียงใต้", "H1": "spread ตะวันตก", "D3": "spread ตะวันตกเฉียงเหนือ"}
SPREAD8_EN = {"MT": "Spread north", "D4": "Spread north-east", "H2": "Spread east", "D2": "Spread south-east",
              "ST": "Spread south", "D1": "Spread south-west", "H1": "Spread west", "D3": "Spread north-west"}
step(P2, AO, "Reverse ①: spread 8 ทิศตามทิศบอส", "Reverse ①: 8-way spread by the boss's facing",
     "กรวย 2 ครั้งติดจากบอส ดูชื่อร่าย:\n"
     "Reverse Alley-oop = กรวยที่ 2 ขึ้นเหลื่อมจากครั้งแรกเล็กน้อย ยืนที่จุด spread เฉยๆ ก็พ้น\n"
     "Alley-oop Double-dip = กรวยที่ 2 ขึ้นที่เดิมซ้ำ ต้องย้ายไปที่ที่กรวยแรกไม่ได้ลง\n\n"
     "① spread 8 ทิศ โดยยึดทิศที่บอสหัน (spread พื้นฐาน):\n"
     "D3 / MT / D4\nH1 / H2\nD1 / ST / D2",
     "Two cones in a row from the boss; read the cast:\n"
     "Reverse Alley-oop = the second set comes slightly offset from the first; just stand on your spread spot\n"
     "Alley-oop Double-dip = the second set lands in the same place; move to where the first set did not land\n\n"
     "① Spread in 8 directions by the boss's facing (basic spread):\n"
     "D3 / MT / D4\nH1 / H2\nD1 / ST / D2",
     strict=True, pic=22, scene=S.ao1(), says=SPREAD8, says_en=SPREAD8_EN,
     refs=[F("alley-oop", "Double / Reverse Alley-oop: กรวย 8 ทิศรอบบอส มา 2 ชุด", "Double / Reverse Alley-oop: eight cones around the boss, twice")])
step(P2, AO, "Reverse ②: ยืนที่เดิม", "Reverse ②: stay put",
     "② Reverse: ยืนที่เดิมตรงที่โดนกรวยแรก จะหลบกรวยที่ 2 ได้",
     "② Reverse: stay where the first cone hit you and the second one misses",
     strict=True, pic=23, scene=S.ao_rev(), says=SPREAD8, says_en=SPREAD8_EN)
step(P2, AO, "Double-dip ①: spread 8 ทิศเหมือนกัน", "Double-dip ①: the same 8-way spread",
     "① Double-dip ก็ spread 8 ทิศโดยยึดทิศที่บอสหันเหมือน Reverse ① (game8 ใช้ภาพเดียวกัน)",
     "① Double-dip starts with the same 8-way spread by the boss's facing as Reverse ① (game8 uses the same picture)",
     strict=False)
step(P2, AO, "Double-dip ②: ย้ายไปช่องที่กรวยแรกไม่ลง", "Double-dip ②: move into a gap",
     "② Double-dip: ย้ายไปที่ที่กรวยแรกไม่ได้ลง หลบกรวยที่ 2\n\n"
     "ช่วงท้ายมีจุดที่ต้องหลบ Double-dip ตามเข็มนาฬิกา จึงแนะนำให้หลบตามเข็มตั้งแต่ตอนนี้",
     "② Double-dip: move to where the first cones did not land to dodge the second\n\n"
     "Later in the fight Double-dip must be dodged clockwise, so get used to dodging clockwise from now on",
     strict=True, pic=25, scene=S.ao_double())

step(P2, "Deep Impact", "tankbuster + knockback ที่คนไกลสุด", "Tankbuster + knockback on the farthest",
     "ท่าแรงพร้อม knockback ใส่คนที่อยู่ไกลบอสที่สุด\n"
     "MT ใช้ mitigate แล้วถอยห่างจากบอส\n"
     "คนอื่นเข้าใกล้บอส อย่าไปล่อท่านี้\n"
     "knockback กันได้ด้วย Arm's Length ใช้ไว้จะปลอดภัยกว่า",
     "A heavy hit with knockback on the player farthest from the boss\n"
     "MT mitigates and moves away from the boss\n"
     "Everyone else stays close to the boss so they don't bait it\n"
     "Arm's Length stops the knockback; using it is safer",
     says={"MT": "ใช้ mitigate ถอยห่างบอสไปรับ (Arm's Length กัน knockback)"},
     says_en={"MT": "Mitigate and move away to take it (Arm's Length stops the knockback)"},
     refs=[F("deep-impact", "Deep Impact: tankbuster + knockback ใส่คนที่อยู่ไกลบอสที่สุด", "Deep Impact: tankbuster + knockback on the player farthest from the boss")])

# ------------------------------------------------------------------ both bosses
step(P3, "Xtreme Spectacular", "ไปรับที่ขอบฝั่ง C", "Take it at the C edge",
     "Deep Blue เรียก Red Hot มารวมเป็น 2 ตัว สักพักใช้ท่าใหญ่ Xtreme Spectacular\n"
     "ดาเมจลดตามระยะจากกลางสนาม ไปชิดขอบสนามฝั่ง Marker C แล้วรับ",
     "Deep Blue calls Red Hot in and the two fight together; a little later they use their big attack, Xtreme Spectacular\n"
     "Its damage falls off with distance from the middle, so move to the edge on the C waymark side and take it there",
     refs=[F("xtreme-spectacular", "Xtreme Spectacular: ดาเมจลดตามระยะจากกลาง ไปรับที่ขอบสนามฝั่ง C", "Xtreme Spectacular: damage falls off from the middle; take it at the C edge")])

IA = "Insane Air"
step(P3, IA, "กระดานหันขึ้น: Tank รับคนเดียว", "Board pointing up: one tank takes it",
     "Insane Air: กระดานขึ้นในสนาม ท่าออกที่ตำแหน่งกระดาน ชนิดท่ามี 3 แบบตามทิศของกระดาน\n"
     "ฝั่งน้ำ (Deep Blue) = กลุ่ม MT / ฝั่งไฟ (Red Hot) = กลุ่ม ST ทำพร้อมกัน\n"
     "ทุกท่าต้องหันออกขอบนอก อย่าให้โดนอีกฝั่ง\n"
     "ฝั่งไฟระวัง: ที่ที่ท่าลงจะเป็นพื้นที่ติด Burns\n\n"
     "กระดานหันขึ้น = AoE วงกลมเล็กแรงใส่คนที่ใกล้ที่สุด Tank เข้าไปรับคนเดียว คนอื่นอยู่ห่าง",
     "Insane Air: a board marker appears and the attack goes off where it is; its type depends on the board's angle (3 kinds)\n"
     "Water side (Deep Blue) = MT group / fire side (Red Hot) = ST group, at the same time\n"
     "Point every attack out at the edge so it never hits the other side\n"
     "Fire side beware: where the attack lands becomes ground that gives Burns\n\n"
     "Board pointing up = a small, heavy circle AoE on the nearest player; the tank goes in alone, everyone else stays away",
     strict=["MT"], pic=27, scene=S.ia_up(),
     says={"MT": "เข้าไปรับที่กระดานคนเดียว (ฝั่งน้ำ)", "ST": "เข้าไปรับที่กระดานคนเดียว (ฝั่งไฟ)"},
     says_en={"MT": "Go in and take it alone at the board (water side)", "ST": "Go in and take it alone at the board (fire side)"},
     refs=[F("insane-air-up", "Insane Air: กระดานหันขึ้น Tank รับคนเดียว คนอื่นอยู่ห่าง", "Insane Air: board pointing up, one tank takes it, everyone else away")])
step(P3, IA, "กระดานหันข้าง: stack 4 คน", "Board sideways: 4-player stack",
     "กระดานหันข้าง = กรวยแบบ stack ใส่คนที่ใกล้ที่สุด 4 คนรวมกันรับ หันกรวยออกขอบนอก",
     "Board sideways = a stackable cone on the nearest player; the 4 take it together, pointed out at the edge",
     strict=True, pic=29, scene=S.ia_side(),
     refs=[F("insane-air-side", "Insane Air: กระดานหันข้าง กรวย stack รวม 4 คน หันออกขอบนอก", "Insane Air: board sideways, a cone stack for the 4, pointed outward")])
step(P3, IA, "กระดานหันลง: spread 4 คน", "Board pointing down: 4-way spread",
     "กระดานหันลง = กรวยเล็กใส่ 4 คน spread รับ\n"
     "หันหน้าหากลางสนาม เรียงจากซ้าย: Range > Healer > Tank > Melee",
     "Board pointing down = small cones on 4 players; spread to take them\n"
     "Facing the middle, from the left: Range > Healer > Tank > Melee",
     strict=True, pic=31, scene=S.ia_down(),
     says={"D3": "ซ้ายสุด", "H1": "คนที่ 2 จากซ้าย", "MT": "คนที่ 3 จากซ้าย", "D1": "ขวาสุด",
           "D4": "ซ้ายสุด (ฝั่งไฟ)", "H2": "คนที่ 2 จากซ้าย (ฝั่งไฟ)", "ST": "คนที่ 3 จากซ้าย (ฝั่งไฟ)", "D2": "ขวาสุด (ฝั่งไฟ)"},
     says_en={"D3": "Leftmost", "H1": "2nd from the left", "MT": "3rd from the left", "D1": "Rightmost",
              "D4": "Leftmost (fire side)", "H2": "2nd from the left (fire side)", "ST": "3rd from the left (fire side)", "D2": "Rightmost (fire side)"},
     refs=[F("insane-air-down", "Insane Air: กระดานหันลง กรวย 4 อัน ยืนเรียงหันออกขอบนอก", "Insane Air: board pointing down, four cones, line up facing outward")])
step(P3, IA, "ทางเดินของท่า 4 ครั้ง", "The path of the 4 attacks",
     "ท่าออกทั้งหมด 4 ครั้ง เริ่มจากที่บอสอยู่ (ตะวันตกเฉียงเหนือ / ตะวันออกเฉียงใต้) แล้ววนตามเข็มนาฬิกา\n"
     "ครั้งที่ 4: สีหนึ่งออกกลางสนาม อีกสีออกแนวทแยง",
     "Four attacks in all, starting where each boss is (north-west / south-east) and going clockwise\n"
     "The 4th: one colour comes in the middle, the other on a diagonal",
     strict=False, pic=32, scene=S.ia_path())

SN = "Watersnaking / Firesnaking"
GROUP_SAYS = {"MT": "ใต้ Deep Blue (กลุ่ม MT)", "H1": "ใต้ Deep Blue (กลุ่ม MT)", "D1": "ใต้ Deep Blue (กลุ่ม MT)", "D3": "ใต้ Deep Blue (กลุ่ม MT)",
              "ST": "ใต้ Red Hot (กลุ่ม ST)", "H2": "ใต้ Red Hot (กลุ่ม ST)", "D2": "ใต้ Red Hot (กลุ่ม ST)", "D4": "ใต้ Red Hot (กลุ่ม ST)"}
GROUP_SAYS_EN = {k: ("Under Deep Blue (MT group)" if "MT" in v else "Under Red Hot (ST group)") for k, v in GROUP_SAYS.items()}
step(P3, SN, "ภาพรวม: กลุ่ม MT ใต้ Deep Blue / กลุ่ม ST ใต้ Red Hot", "Overview: MT group under Deep Blue / ST group under Red Hot",
     "ดีบัฟ Watersnaking (น้ำ) / Firesnaking (ไฟ): บอสสีเดียวกับดีบัฟจะเลือกโจมตีคนนี้ก่อน\n"
     "ติดดีบัฟสีไหนก็ตีบอสได้ทั้ง 2 ตัว\n\n"
     "ได้สีไหนสุ่ม แต่ล็อกเป็นกลุ่ม 4 คนได้ ให้ทำตามนี้ก่อนเสมอ:\n"
     "กลุ่ม MT ไปยืนใต้ Deep Blue\n"
     "กลุ่ม ST ไปยืนใต้ Red Hot\n\n"
     "จากนั้นลำดับท่าเปลี่ยนตามสีดีบัฟที่ได้ จึงต้องจำทั้ง 2 ฝั่ง\n"
     "ฝั่งน้ำ: Double/Reverse Alley-oop > Sick Swell > Deep Varial > Sickest Take-off\n"
     "ฝั่งไฟ: Alley-oop Inferno > Hot Impact > Alley-oop Inferno > Hot Aerial > Cutback Blaze",
     "Watersnaking (water) / Firesnaking (fire) debuff: the boss of that colour targets you first\n"
     "Either debuff can still damage both bosses\n\n"
     "Which colour you get is random, but it can be fixed per light party, so always do this first:\n"
     "MT group stands under Deep Blue\n"
     "ST group stands under Red Hot\n\n"
     "Then the mechanics follow the debuff colour, so learn both sides\n"
     "Water: Double/Reverse Alley-oop > Sick Swell > Deep Varial > Sickest Take-off\n"
     "Fire: Alley-oop Inferno > Hot Impact > Alley-oop Inferno > Hot Aerial > Cutback Blaze",
     strict=True, pic=33, scene=S.snaking(), says=GROUP_SAYS, says_en=GROUP_SAYS_EN,
     refs=[F("snaking", "Watersnaking / Firesnaking: กลุ่ม MT ใต้ Deep Blue / กลุ่ม ST ใต้ Red Hot", "Watersnaking / Firesnaking: MT group under Deep Blue / ST group under Red Hot")])

WB = SN
WB_EN = SN
step(P3, WB, "ฝั่งน้ำ ① Alley-oop: 3 คนฝั่งแคบ Healer ฝั่งกว้าง", "Water ① Alley-oop: three on the narrow side, healer on the wide side",
     "① ฝั่งน้ำ: Deep Blue ร่าย Double/Reverse Alley-oop\n"
     "ฝั่งแคบ: Tank Melee Range ไปล่อกรวย\n"
     "ฝั่งกว้าง: Healer\n"
     "กรวยที่ 2 ไม่ว่า Double หรือ Reverse ให้หลบไปด้านข้าง (เข้ากลาง)\n\n"
     "ภาพ: Deep Blue อาจอยู่เหนือหรือใต้ ขวามือคือฝั่งไฟที่ทิ้ง AoE ไฟชุดแรกพร้อมกัน",
     "① Water side: Deep Blue casts Double/Reverse Alley-oop\n"
     "Narrow side: tank, melee and ranged bait the cones\n"
     "Wide side: healer\n"
     "For the second cones, Double or Reverse, dodge to the side (into the middle)\n\n"
     "Picture: Deep Blue may be north or south; on the right, the fire side drops its first fire AoEs at the same time",
     strict=True, pic=36, scene=S.blue1(),
     says={"MT": "ฝั่งแคบ ล่อกรวย", "D1": "ฝั่งแคบ ล่อกรวย", "D3": "ฝั่งแคบ ล่อกรวย", "H1": "ฝั่งกว้าง"},
     says_en={"MT": "Narrow side, bait a cone", "D1": "Narrow side, bait a cone", "D3": "Narrow side, bait a cone", "H1": "Wide side"},
     mech_en=WB_EN,
     refs=[F("blue-alley-oop", "ฝั่งน้ำ: Double / Reverse Alley-oop จาก Deep Blue ที่ขอบตะวันตก", "Water side: Double / Reverse Alley-oop from Deep Blue at the west edge")])
step(P3, WB, "ฝั่งน้ำ ② Sick Swell + Tank รับ tankbuster ด้วยกัน", "Water ② Sick Swell + both tanks share the buster",
     "② Deep Blue ร่าย Sick Swell ขึ้นเครื่องหมายคลื่นพร้อม knockback\n"
     "จากนั้น Red Hot ใช้ tankbuster Tank ที่ถือ Deep Blue ก็เข้าไปรับด้วยกัน 2 คน",
     "② Deep Blue casts Sick Swell, showing the wave with its knockback\n"
     "Then Red Hot uses a tankbuster; the tank holding Deep Blue joins to take it with the other tank",
     strict=["MT", "ST"], pic=37, scene=S.blue2(), says=TANKS, says_en=TANKS_EN, mech_en=WB_EN)
step(P3, WB, "ฝั่งน้ำ ③ Deep Varial: ดูคลื่นว่า stack หรือ spread", "Water ③ Deep Varial: read stack or spread on the wave",
     "③ Deep Blue ร่าย Deep Varial กลางสนาม แล้วย้ายไปเหนือหรือใต้ ยิงกรวยใหญ่\n"
     "ตอนนี้คลื่นตรงที่กรวยออกจะบอกว่าเป็น stack หรือ spread ดูไว้\n"
     "คนดีบัฟน้ำทำฝั่งครึ่งสนามที่ไม่มีพื้นไฟ / คนดีบัฟไฟทำฝั่งที่มีพื้นไฟ\n"
     "ภาพ: ลูกน้ำ 1 ลูก = stack",
     "③ Deep Blue casts Deep Varial in the middle, then moves north or south and fires a huge cone\n"
     "At this point the wave where the cone comes from shows stack or spread; read it\n"
     "Water debuffs use the half without fire floor / fire debuffs the half with it\n"
     "Picture: 1 water orb = stack",
     strict=True, pic=38, scene=S.blue3(), mech_en=WB_EN,
     refs=[F("deep-varial", "Deep Varial: Deep Blue ย้ายไปเหนือหรือใต้ แล้วยิงกรวยใหญ่", "Deep Varial: Deep Blue moves north or south, then fires a huge cone")])
step(P3, WB, "ฝั่งน้ำ ③' ลูกน้ำ 4 ลูก = spread", "Water ③' Four water orbs = spread",
     "③' ถ้าคลื่นมีลูกน้ำ 4 ลูก = spread\n"
     "ลูกน้ำ 1 ลูก = stack / 4 ลูก = spread",
     "③' If the wave has 4 water orbs = spread\n"
     "1 orb = stack / 4 orbs = spread",
     strict=True, pic=39, scene=S.blue3b(), mech_en=WB_EN)
step(P3, WB, "ฝั่งน้ำ ④ หลังกรวย รับท่า (ภาพ: spread)", "Water ④ After the cone, resolve it (picture: spread)",
     "④ หลังกรวยใหญ่ รับ stack หรือ spread ที่เห็น (ภาพ: spread)",
     "④ After the big cone, resolve the stack or spread you saw (picture: spread)",
     strict=True, pic=40, scene=S.blue4(), mech_en=WB_EN)
step(P3, WB, "ฝั่งน้ำ ⑤ Sickest Take-off: นับลูกน้ำ", "Water ⑤ Sickest Take-off: count the orbs",
     "⑤ Tank ล่อบอสมากลาง บอสร่าย Sickest Take-off ดูว่ามีลูกน้ำกี่ลูก\n"
     "ภาพ: 1 ลูก = stack",
     "⑤ The tank brings the boss to the middle; it casts Sickest Take-off, so count the water orbs\n"
     "Picture: 1 orb = stack",
     strict=True, pic=41, scene=S.blue5(), mech_en=WB_EN,
     says={"MT": "ล่อ Deep Blue มากลางสนาม"}, says_en={"MT": "Bring Deep Blue to the middle"})
step(P3, WB, "ฝั่งน้ำ ⑦ คลื่น knockback แล้วท่าลง", "Water ⑦ The wave knocks back, then it lands",
     "⑦ คลื่นมาพร้อม knockback หลัง knockback บอสลงมาแล้ว stack หรือ spread ลง",
     "⑦ The wave comes with a knockback; after it the boss comes down and the stack or spread lands",
     strict=True, pic=42, scene=S.wave(), mech_en=WB_EN)
step(P3, WB, "ฝั่งน้ำ ⑧ Cutback Blaze + Deep Impact", "Water ⑧ Cutback Blaze + Deep Impact",
     "⑧ ทันทีหลังจากนั้น Red Hot ใช้ Cutback Blaze เกิดที่ปลอดภัยแคบ\n"
     "Deep Blue ร่าย Deep Impact: Tank ที่มีดีบัฟน้ำไปไกลเพื่อล่อแล้วรับ\n\n"
     "ฝั่งน้ำสรุป:\n"
     "ตอน Deep Varial ตั้งใจนับลูกน้ำบนคลื่น\n"
     "กรวยใหญ่ของ Deep Varial ไปหลบฝั่งที่ไม่มีพื้นไฟ\n"
     "Tank อย่าลืมล่อ Deep Impact ของ Deep Blue ตอนท้าย",
     "⑧ Straight after, Red Hot uses Cutback Blaze, leaving a narrow safe area\n"
     "Deep Blue casts Deep Impact: the tank with the water debuff goes far to bait it and takes it\n\n"
     "Water side in short:\n"
     "Count the water orbs on the wave during Deep Varial\n"
     "Dodge Deep Varial's huge cone on the side without fire floor\n"
     "Tank: don't forget to bait Deep Blue's Deep Impact at the end",
     strict=["MT"], pic=43, scene=S.cutback2(), mech_en=WB_EN,
     says={"MT": "ดีบัฟน้ำ: ไปไกลล่อ Deep Impact แล้วรับ"}, says_en={"MT": "Water debuff: go far, bait Deep Impact and take it"},
     refs=[F("deep-impact-blue", "Deep Impact ของ Deep Blue: Tank ที่มีดีบัฟน้ำไปไกล ล่อแล้วรับ", "Deep Blue's Deep Impact: the water-debuff tank goes far to bait and take it")])

RB = SN
RB_EN = SN
step(P3, RB, "ฝั่งไฟ ① Alley-oop Inferno: เรียงทิ้งรอบ B", "Fire ① Alley-oop Inferno: line up around B",
     "① ฝั่งไฟ: Red Hot ร่าย Alley-oop Inferno คนดีบัฟไฟไปฝั่ง B\n"
     "เรียง 4 คนรอบ Marker B ทิ้ง AoE ชิดกัน\n"
     "ถ้าทิ้งห่างๆ คนที่อยู่ปลาย (D4) จะลำบากทีหลัง\n\n"
     "ตามภาพ จากเหนือลงใต้: D4 > ST > D2 > H2",
     "① Fire side: Red Hot casts Alley-oop Inferno; the fire debuffs go to the B side\n"
     "Line up 4 around waymark B and drop the AoEs packed together\n"
     "Spread loosely and the one at the end (D4) suffers later\n\n"
     "As pictured, north to south: D4 > ST > D2 > H2",
     strict=True, pic=44, scene=S.red1(), mech_en=RB_EN,
     says={"D4": "เหนือสุดรอบ B", "ST": "คนที่ 2 รอบ B", "D2": "คนที่ 3 รอบ B", "H2": "ใต้สุดรอบ B"},
     says_en={"D4": "Northmost around B", "ST": "2nd around B", "D2": "3rd around B", "H2": "Southmost around B"},
     refs=[F("red-alley-oop", "ฝั่งไฟ: Alley-oop Inferno 4 คนเรียงทิ้งวงกลมชิดกันที่ขอบตะวันออก", "Fire side: Alley-oop Inferno, the four drop their circles packed along the east edge")])
step(P3, RB, "ฝั่งไฟ ② Tank รับ tankbuster ด้วยกัน", "Fire ② Both tanks share the buster",
     "② จากนั้น Red Hot ใช้ tankbuster รับด้วยกันกับ Tank ที่ถือ Deep Blue (game8 ใช้ภาพเดียวกับฝั่งน้ำ ②)",
     "② Then Red Hot's tankbuster: take it together with the tank holding Deep Blue (game8 uses the same picture as water side ②)",
     strict=False, says=TANKS, says_en=TANKS_EN, mech_en=RB_EN)
step(P3, RB, "ฝั่งไฟ ③ หลบ Deep Varial แล้วทิ้งเป็นรูปตัว L", "Fire ③ Dodge Deep Varial, then drop in an L",
     "③ Deep Blue ร่าย Deep Varial (กรวยใหญ่) หลบในที่ปลอดภัยฝั่งที่ทิ้ง AoE ไฟไว้\n"
     "แล้ว Alley-oop Inferno มาอีกครั้ง ทิ้งให้เป็นรูปตัว L กับชุดแรก\n"
     "macro (กลางสนาม > มุม): Tank > Melee > Healer > Range\n"
     "ถ้าปลาย (D4) ดูแคบ Tank กับ Melee หลบกรวยเสร็จแล้วขยับเปิดที่ให้",
     "③ Deep Blue casts Deep Varial (huge cone); dodge in the safe area on the side where you dropped the fire AoEs\n"
     "Then Alley-oop Inferno comes again; drop them to form an L with the first set\n"
     "Macro (middle > corner): Tank > Melee > Healer > Range\n"
     "If the end (D4) looks cramped, tank and melee make room once the cone is over",
     strict=True, pic=46, scene=S.red3(), mech_en=RB_EN,
     says={"ST": "ใกล้กลางสุด", "D2": "คนที่ 2", "H2": "คนที่ 3", "D4": "มุมสุด"},
     says_en={"ST": "Closest to the middle", "D2": "2nd", "H2": "3rd", "D4": "In the corner"})
HA_SAYS = {"ST": "ล่อคนที่ 1 ทางเหนือ", "H2": "ล่อคนที่ 2 ทางใต้", "D4": "ล่อคนที่ 3 ทางเหนือ", "D2": "ล่อคนที่ 4 ทางใต้"}
HA_SAYS_EN = {"ST": "Bait 1st, north", "H2": "Bait 2nd, south", "D4": "Bait 3rd, north", "D2": "Bait 4th, south"}
step(P3, RB, "ฝั่งไฟ ④ Hot Aerial: ลำดับล่อ", "Fire ④ Hot Aerial: the bait order",
     "④ ดึงบอสมากลาง ร่าย Hot Aerial ล่อจากทิศเหนือของแมพ\n"
     "Tank เหนือ > Healer ใต้ > Range เหนือ > Melee ใต้",
     "④ Bring the boss to the middle; it casts Hot Aerial. Bait from the map's north\n"
     "Tank north > Healer south > Range north > Melee south",
     strict=True, pic=47, scene=S.red4(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN,
     refs=[F("hot-aerial", "Hot Aerial: Red Hot กระโดดใส่ทีละคน ล่อตามลำดับ เหนือ / ใต้ สลับกัน", "Hot Aerial: Red Hot pounces on one player at a time; bait north / south in turn")])
step(P3, RB, "ฝั่งไฟ ⑤ ครั้งที่ 1: Tank ทางเหนือ", "Fire ⑤ First: the tank in the north",
     "⑤ ครั้งที่ 1: Tank ไปเหนือทันทีที่บอสเริ่มร่าย\nHealer คนที่ 2 (ล่อใต้) เตรียมตัว",
     "⑤ First: the tank goes north as soon as the cast starts\nThe healer, 2nd (south), gets ready",
     strict=["ST"], pic=48, scene=S.red5(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN)
step(P3, RB, "ฝั่งไฟ ⑥ ครั้งที่ 2: Healer ทางใต้", "Fire ⑥ Second: the healer in the south",
     "⑥ เห็นบอสกระโดดใส่ครั้งที่ 1 แล้ว Healer ไปทางใต้\nRange คนที่ 3 เตรียมตัว",
     "⑥ Once you see the first pounce, the healer goes south\nThe ranged, 3rd, gets ready",
     strict=["H2"], pic=49, scene=S.red6(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN)
step(P3, RB, "ฝั่งไฟ ⑦ ครั้งที่ 3: Range ทางเหนือ", "Fire ⑦ Third: the ranged in the north",
     "⑦ ครั้งที่ 2 ลง Range ไปตำแหน่งเหนือ\nMelee คนที่ 4 เตรียมตัว",
     "⑦ The second lands; the ranged moves to the north spot\nThe melee, 4th, gets ready",
     strict=["H2"], pic=50, scene=S.red7(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN)
step(P3, RB, "ฝั่งไฟ ⑧ ครั้งที่ 4: Melee ทางใต้", "Fire ⑧ Fourth: the melee in the south",
     "⑧ ครั้งที่ 3 ลง Melee ไปตำแหน่งรับทางใต้",
     "⑧ The third lands; the melee moves to the south spot",
     strict=["D4"], pic=51, scene=S.red8(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN)
step(P3, RB, "ฝั่งไฟ ⑨ ครั้งที่ 4 ลง แล้วดูคลื่น", "Fire ⑨ The fourth lands, then watch the wave",
     "⑨ ครั้งที่ 4 ลง จากนั้น Deep Blue สร้างคลื่น knockback จากเหนือหรือใต้\n"
     "ดูตำแหน่งที่ Deep Blue จะยิง AoE แนวตรงไว้ด้วย",
     "⑨ The fourth lands; then Deep Blue makes a knockback wave from the north or south\n"
     "Also note where Deep Blue will fire its line AoE",
     strict=["D2"], pic=52, scene=S.red9(), mech_en=RB_EN, says=HA_SAYS, says_en=HA_SAYS_EN)
step(P3, RB, "ฝั่งไฟ ⑩ คลื่น: กัน knockback แล้วหลบวงกลม", "Fire ⑩ The wave: stop the knockback, dodge the circles",
     "⑩ คลื่นของ Deep Blue มา ฝั่งไฟกัน knockback ด้วย Arm's Length / Surecast (game8 ใช้ภาพเดียวกับฝั่งน้ำ ⑦)\n"
     "เข้าหา Red Hot แต่จะมีวงกลมออกจากพื้นไฟ ไปที่ที่วงไม่โดน\n"
     "หลัง knockback ฝั่งน้ำโดน spread หรือ stack อย่าเข้าไปโดนด้วย",
     "⑩ Deep Blue's wave comes; the fire side stops the knockback with Arm's Length / Surecast (game8 uses the same picture as water side ⑦)\n"
     "Move towards Red Hot, but circles come out of the fire floor, so stand where they don't hit\n"
     "After the knockback the water side gets a spread or stack; don't get caught in it",
     strict=False, mech_en=RB_EN,
     refs=[F("wave-orbs", "คลื่นของ Deep Blue มาพร้อม knockback ฝั่งไฟกันด้วย Arm's Length / Surecast", "Deep Blue's wave comes with a knockback; the fire side uses Arm's Length / Surecast")])
step(P3, RB, "ฝั่งไฟ ⑪ Cutback Blaze: ยืนชิด Red Hot ฝั่งพื้นไฟ", "Fire ⑪ Cutback Blaze: hug Red Hot on the fire-floor side",
     "⑪ Red Hot ใช้ Cutback Blaze เกิดที่ปลอดภัยแคบ (game8 ใช้ภาพเดียวกับฝั่งน้ำ ⑧)\n"
     "Cutback Blaze เป็นกรวย 330° ใส่คนที่ไกล Red Hot ที่สุด\n"
     "ต้องการให้ที่ปลอดภัยไปออกฝั่งกว้าง คนดีบัฟไฟจึงต้องยืนชิด Red Hot ฝั่งที่ทิ้ง AoE ไฟไว้เสมอ\n\n"
     "ฝั่งไฟสรุป: จำลำดับล่อ Hot Aerial ให้แม่น (ซ้อมในหัว) และล่อจากทิศเหนือของแมพ",
     "⑪ Red Hot uses Cutback Blaze, leaving a narrow safe area (game8 uses the same picture as water side ⑧)\n"
     "Cutback Blaze is a 330° cone on the player farthest from Red Hot\n"
     "To put the safe area on the wide side, the fire debuffs always hug Red Hot on the side where they dropped their fire AoEs\n\n"
     "Fire side in short: know the Hot Aerial bait order cold, and bait from the map's north",
     strict=False, mech_en=RB_EN,
     refs=[F("cutback-red", "Cutback Blaze จาก Red Hot: ฝั่งไฟยืนชิด Red Hot ฝั่งที่ทิ้งพื้นไฟ", "Cutback Blaze from Red Hot: the fire side hugs Red Hot on the fire-floor side")])

# ------------------------------------------------------------------ Watery Grave
WG = "Deep Aerial (Watery Grave) + Xtreme Wave"
step(P4, WG, "① Healer เข้า tower / เส้นไฟ A·C เส้นน้ำเหนือ·ใต้", "① Healers in the tower / fire A·C, water north·south",
     "Red Hot ขึ้นได้แค่ตะวันออกเฉียงเหนือหรือตะวันออกเฉียงใต้ / Deep Blue ขึ้นได้แค่ตะวันตกเฉียงเหนือหรือตะวันตกเฉียงใต้\n"
     "กลางสนามมี tower 2 คน: Healer 2 คนเข้า (ถูกขังใน Watery Grave)\n"
     "คนที่เหลือล่อ AoE แนวตรงของบอส 2 ตัว (เส้น)\n\n"
     "เส้นไฟ (Red Hot): ล่อระหว่าง Marker A กับ C ไปกลับ / ครั้งแรกอย่าให้เส้นไขว้กัน\n"
     "เส้นน้ำ (Deep Blue): นับที่ที่ขึ้นเป็นเหนือ ยืดลงใต้ แล้วไปกลับ\n"
     "game8 เรียกแบบนี้ว่า AC ตายตัว (ต่างจากวิดีโอสรุปของ Inumaru)",
     "Red Hot only appears north-east or south-east / Deep Blue only north-west or south-west\n"
     "A 2-player tower appears in the middle: the two healers go in (shut in the Watery Grave)\n"
     "Everyone else baits the two bosses' line AoEs (the lines)\n\n"
     "Fire line (Red Hot): bait it back and forth between waymarks A and C / don't let the lines cross the first time\n"
     "Water line (Deep Blue): count where it appears as north, stretch it south, then back and forth\n"
     "game8 calls this fixed A/C (it differs from Inumaru's short video)",
     strict=["H1", "H2"], pic=55, scene=S.grave(),
     says={"H1": "เข้า tower กลาง (ถูกขังใน Watery Grave)", "H2": "เข้า tower กลาง (ถูกขังใน Watery Grave)"},
     says_en={"H1": "Take the middle tower (shut in the Watery Grave)", "H2": "Take the middle tower (shut in the Watery Grave)"},
     refs=[F("watery-grave", "Deep Aerial: Watery Grave กลางสนาม Healer 2 คนอยู่ข้างใน คนอื่นล่อเส้น", "Deep Aerial: the Watery Grave in the middle, healers inside, everyone else baits lines"),
           F("grave-tethers", "เส้นไฟของ Red Hot ต้องลากผ่าน Watery Grave / เส้นน้ำห้ามโดน", "Red Hot's fire line must cross the Watery Grave / the water line must not")])
step(P4, WG, "② ไฟต้องโดน Watery Grave / น้ำห้ามโดน", "② Fire must hit the Watery Grave / water must not",
     "ไฟต้องโดน Watery Grave เสมอ / น้ำห้ามโดน Watery Grave\n"
     "ถ้าน้ำโดน Watery Grave จะได้บัฟ mitigate ทำลายยากขึ้นมาก\n"
     "เส้นไฟโดนตรงๆ ลด HP ของ Watery Grave 15% ครบ 6 ครั้ง = 90% ด้วยไฟอย่างเดียว\n\n"
     "คนที่ตี ยืนตีในที่ปลอดภัยกว้างฝั่งเส้นไฟจะปลอดภัย\n"
     "AoE แนวตรงมา 6 ครั้ง แต่ละคนต้องล่อ 2 ครั้ง ระหว่างตีให้นึกภาพไว้ก่อนว่าถึงตาตัวเองจะขยับยังไง",
     "Fire always hits the Watery Grave / water never does\n"
     "If water hits it, the Watery Grave gets a mitigation buff and becomes much harder to break\n"
     "A direct fire line takes 15% of the Watery Grave's HP, so 6 hits = 90% from fire alone\n\n"
     "Attackers are safe in the wide safe area on the fire-line side\n"
     "There are 6 line AoEs and each person baits 2, so while attacking, picture how you will move when it's your turn",
     strict=False)
step(P4, WG, "เก็บ burst 2 นาทีไว้ไหม", "Hold the 2-minute burst?",
     "ระหว่างนี้บัฟ 2 นาทีกลับมา\n"
     "ไฟอย่างเดียวลด Watery Grave ได้ 90% จึงเก็บ burst ไว้ เริ่มตอนทำลาย Watery Grave แล้วบอส 2 ตัวมารวมกันได้\n"
     "ทำแบบนี้ burst 2 นาทีครั้งต่อๆ ไปจะตรงกับตอนบอส 2 ตัวอยู่ด้วยกันพอดี ผ่าน DPS check ง่ายขึ้น\n\n"
     "แต่ตอนฝึก Mechanic ที่ยังไม่นิ่ง ใช้ burst ไปเลยจะผ่านง่ายและได้ดูช่วงต่อไป\n"
     "ถ้าเป้าหมายคือเคลียร์ แนะนำให้เก็บ burst\n"
     "ถ้ามีคนตาย หรือน้ำโดน Watery Grave ให้ burst ตามสถานการณ์",
     "Your 2-minute buffs come back during this\n"
     "Fire alone takes 90% off the Watery Grave, so you can hold burst and start it when the grave breaks and the two bosses come together\n"
     "Then later 2-minute bursts also line up with the two bosses being together, which makes the DPS check easier\n\n"
     "While still learning unstable mechanics, though, just burst to get through and see what comes next\n"
     "If the goal is the clear, holding burst is recommended\n"
     "If someone dies or water hits the Watery Grave, adjust and burst",
     strict=False)

# ------------------------------------------------------------------ split arena
SP = "Flame Floater (split arena)"
SPLIT_SAYS = {"MT": "กลุ่ม MT ฝั่งตะวันตก", "H1": "กลุ่ม MT ฝั่งตะวันตก", "D1": "กลุ่ม MT ฝั่งตะวันตก", "D3": "กลุ่ม MT ฝั่งตะวันตก",
              "ST": "กลุ่ม ST ฝั่งตะวันออก", "H2": "กลุ่ม ST ฝั่งตะวันออก", "D2": "กลุ่ม ST ฝั่งตะวันออก", "D4": "กลุ่ม ST ฝั่งตะวันออก"}
SPLIT_SAYS_EN = {k: ("MT group, west" if "MT" in v else "ST group, east") for k, v in SPLIT_SAYS.items()}
step(P5, SP, "① กลุ่ม MT ตะวันตก / กลุ่ม ST ตะวันออก", "① MT group west / ST group east",
     "① ยึด Red Hot เป็นหลัก กลุ่ม MT ไปฝั่งตะวันตก กลุ่ม ST ไปฝั่งตะวันออก (แนวไฟแบ่งกลางสนาม)",
     "① Using Red Hot as the reference: MT group west, ST group east (a fire line splits the middle)",
     strict=True, pic=56, scene=S.split1(), says=SPLIT_SAYS, says_en=SPLIT_SAYS_EN,
     refs=[F("split-line", "Flame Floater: แนวไฟแบ่งสนามเป็น 2 ฝั่ง กลุ่ม MT ตะวันตก / กลุ่ม ST ตะวันออก", "Flame Floater: a fire line splits the arena; MT group west / ST group east")])
step(P5, SP, "② ทิ้งวงกลมที่ขอบ แล้วจ้อง Deep Blue", "② Drop the circles at the edge, watch Deep Blue",
     "② ทิ้ง AoE วงกลม (ที่เหลือพื้นไฟ) ที่จุดในภาพ แล้วจ้องดูร่ายของ Deep Blue\n"
     "ตะวันตก จากเหนือลงใต้: D3 > MT > D1 > H1\n"
     "ตะวันออก จากเหนือลงใต้: D4 > ST > D2 > H2\n\n"
     "Deep Blue จะไป Marker B หรือ D น่าจะสุ่ม\n"
     "Double/Reverse ที่ตามมา จำไว้ทั้งแบบกลุ่มที่ใกล้และกลุ่มที่ไกล",
     "② Drop the circle AoEs (they leave fire floor) on the pictured spots, then watch Deep Blue's cast\n"
     "West, north to south: D3 > MT > D1 > H1\n"
     "East, north to south: D4 > ST > D2 > H2\n\n"
     "Whether Deep Blue goes to waymark B or D is probably random\n"
     "For the Double/Reverse that follows, learn both the near-group and the far-group positions",
     strict=True, pic=57, scene=S.split2(),
     says={"D3": "ตะวันตก บนสุด", "MT": "ตะวันตก คนที่ 2", "D1": "ตะวันตก คนที่ 3", "H1": "ตะวันตก ล่างสุด",
           "D4": "ตะวันออก บนสุด", "ST": "ตะวันออก คนที่ 2", "D2": "ตะวันออก คนที่ 3", "H2": "ตะวันออก ล่างสุด"},
     says_en={"D3": "West, top", "MT": "West, 2nd", "D1": "West, 3rd", "H1": "West, bottom",
              "D4": "East, top", "ST": "East, 2nd", "D2": "East, 3rd", "H2": "East, bottom"},
     refs=[F("split-circles", "Alley-oop Inferno: ทิ้งวงกลมที่มุมสนาม แล้วดูว่า Deep Blue ไปฝั่งไหน", "Alley-oop Inferno: drop the circles in the corners, then see which side Deep Blue goes to")])
step(P5, SP, "③ Double / Reverse: กลุ่มไกลยืนบนเลข", "③ Double / Reverse: far group on the numbers",
     "③ Double หรือ Reverse ของ Deep Blue\n"
     "กลุ่มที่ไกล Deep Blue: Tank กับ Melee ยืนบน Marker ตัวเลข / สายระยะไกลไปที่ขอบ (ต้องทำให้ได้)\n"
     "กลุ่มที่ใกล้: เข้าหาบอสจากจุดที่ทิ้งวงกลมไว้ก็พอ\n"
     "ภาพ: Deep Blue อยู่ฝั่งตะวันตก กลุ่ม ST เป็นกลุ่มไกล",
     "③ Deep Blue's Double or Reverse\n"
     "Group far from Deep Blue: tank and melee stand on the number waymarks / ranged go to the edge (no exceptions)\n"
     "Group near Deep Blue: just move in from where you dropped your circle\n"
     "Picture: Deep Blue is west, so the ST group is the far group",
     strict=True, pic=58, scene=S.split3(),
     says={"ST": "กลุ่มไกล: ยืนบน Marker ตัวเลข", "D2": "กลุ่มไกล: ยืนบน Marker ตัวเลข", "D4": "กลุ่มไกล: ไปที่ขอบ", "H2": "กลุ่มไกล: ไปที่ขอบ",
           "MT": "กลุ่มใกล้: เข้าหาบอสจากจุดทิ้งวงกลม", "D1": "กลุ่มใกล้: เข้าหาบอสจากจุดทิ้งวงกลม", "D3": "กลุ่มใกล้: เข้าหาบอสจากจุดทิ้งวงกลม", "H1": "กลุ่มใกล้: เข้าหาบอสจากจุดทิ้งวงกลม"},
     says_en={"ST": "Far group: stand on a number waymark", "D2": "Far group: stand on a number waymark", "D4": "Far group: go to the edge", "H2": "Far group: go to the edge",
              "MT": "Near group: move in from your circle spot", "D1": "Near group: move in from your circle spot", "D3": "Near group: move in from your circle spot", "H1": "Near group: move in from your circle spot"})
step(P5, SP, "④ Reverse: Melee กลุ่มไกลเข้ากลาง", "④ Reverse: far group's melee move to the middle",
     "④ ถ้าเป็น Reverse: ที่ต้องดูคือ Melee ของกลุ่มไกล เข้าไปชิดกลางสนาม\n"
     "คนอื่นอยู่ที่เดิม",
     "④ If it's Reverse: watch the far group's melee, who move in towards the middle\n"
     "Everyone else stays put",
     strict=True, pic=59, scene=S.split4())
step(P5, SP, "⑤ Double: ทุกคนขยับ", "⑤ Double: everyone moves",
     "⑤ ถ้าเป็น Double: ทุกคนขยับ\n"
     "Melee ของกลุ่มไกลต้องขยับทั้ง Reverse และ Double จำไว้\n\n"
     "จุดที่พลาดบ่อยที่สุดคือ Double/Reverse ของ Deep Blue ตรงนี้ จำตำแหน่งให้แม่น",
     "⑤ If it's Double: everyone moves\n"
     "The far group's melee move for both Reverse and Double; remember that\n\n"
     "Deep Blue's Double/Reverse here is where most mistakes happen; learn the positions exactly",
     strict=True, pic=60, scene=S.split5())
step(P5, SP, "⑥ stack 2 คน หลบวงกลม", "⑥ Pair stacks, dodge the circles",
     "⑥ stack ทีละ 2 คน\n"
     "มีวงกลมออกจากเส้นกลาง และจากจุดที่ทิ้งวงกลมไว้ตอนแรก อย่าโดน\n"
     "อย่ายืนขวางเส้นกลาง\n\n"
     "ตามภาพ:\nMT·D3 ตะวันตกเฉียงเหนือ / ST·D4 ตะวันออกเฉียงเหนือ\nH1·D1 ตะวันตกเฉียงใต้ / H2·D2 ตะวันออกเฉียงใต้",
     "⑥ Stacks of 2\n"
     "Circles also come out of the middle line and from where you dropped your first circles; don't get hit\n"
     "Don't block the middle line\n\n"
     "As pictured:\nMT·D3 north-west / ST·D4 north-east\nH1·D1 south-west / H2·D2 south-east",
     strict=True, pic=61, scene=S.split6(),
     refs=[F("freaky-pyrotation", "stack คู่ (2 คน) ในฝั่งของตัวเอง วงกลมออกจากเส้นกลางและพื้นไฟที่ทิ้งไว้", "Pair stacks on your own side; circles come out of the middle line and the dropped fire")])
step(P5, SP, "⑦ Deep Blue มีลูกบอล 2 ลูก: knockback แล้ว stack 4:4", "⑦ Two orbs on Deep Blue: knockback, then 4:4",
     "⑦ ดู Deep Blue ที่ขอบนอก มีลูกบอล 2 ลูก = หลัง knockback รับ stack 4:4\n"
     "แนะนำ Arm's Length (ถ้าใช้ Arm's Length หรือ Surecast ไปตอน Watersnaking/Firesnaking ก็กลับมาทันแล้ว)\n\n"
     "ถ้า Deep Blue ที่ขอบนอกแบ่งกลางแล้วหลบแยกขึ้นบน / ลงล่าง ขอแค่ทั้ง 2 ฝั่งเข้าหากลางก็ทำ stack 4:4 ได้",
     "⑦ Look at Deep Blue at the edge: 2 orbs = after the knockback, take 4:4 stacks\n"
     "Arm's Length recommended (if you used Arm's Length or Surecast in Watersnaking/Firesnaking, it's back by now)\n\n"
     "If you split up and down to dodge as Deep Blue cuts across the middle, both halves just head to the middle and the 4:4 stacks still work",
     strict=True, pic=62, scene=S.split7(), says=SPLIT_SAYS, says_en=SPLIT_SAYS_EN)
step(P5, SP, "⑧ ก่อนรับ stack ระวังวงกลม", "⑧ Mind the circles before the stack",
     "⑧ ก่อนรับ stack 4:4 ระวังอย่าโดนวงกลม\n\n"
     "Mechanic นี้ซับซ้อน หลายคนโดนวงกลมที่ออกจากพื้นไฟแล้วตาย พอเข้าใจภาพรวมแล้วให้ระวังจุดนี้",
     "⑧ Before taking the 4:4 stacks, don't get hit by the circles\n\n"
     "This is complex, and many die to the circles coming out of the fire floor; once you know the outline, watch for this",
     strict=True, pic=63, scene=S.split8(), says=SPLIT_SAYS, says_en=SPLIT_SAYS_EN)

# ------------------------------------------------------------------ Xtreme snaking + Insane Air 2
XS = "Xtreme Watersnaking / Xtreme Firesnaking + Insane Air"
step(P6, XS, "① รวมกลุ่มเหมือนครั้งแรก", "① Group up as the first time",
     "① กลุ่ม MT ไป Deep Blue (น้ำ) / กลุ่ม ST ไป Red Hot (ไฟ) เหมือนครั้งแรก\n"
     "AoE ทั้งปาร์ตี้ตอนร่ายจบแรงมาก อย่าลืม mitigate\n"
     "ไม่ใช่ว่าจะได้สีของบอสที่อยู่ใกล้ (เช่นกลุ่ม ST = ไฟ) เสมอไป",
     "① MT group to Deep Blue (water) / ST group to Red Hot (fire), as the first time\n"
     "The raid-wide when the cast ends hits hard; don't forget to mitigate\n"
     "You won't always get the colour of the boss you're near (e.g. ST group = fire)",
     strict=False, says=GROUP_SAYS, says_en=GROUP_SAYS_EN,
     refs=[F("xtreme-snaking", "Xtreme Watersnaking / Firesnaking: กลุ่ม MT ไป Deep Blue / กลุ่ม ST ไป Red Hot", "Xtreme Watersnaking / Firesnaking: MT group to Deep Blue / ST group to Red Hot")])
step(P6, XS, "② ทำ Insane Air ฝั่งสีเดียวกับดีบัฟ", "② Do Insane Air on your debuff's side",
     "② ร่าย Xtreme Watersnaking / Xtreme Firesnaking จบแล้วได้ดีบัฟ\n"
     "ทำ Insane Air ฝั่งสีเดียวกับดีบัฟเป็นหลัก (ดีบัฟน้ำ = ฝั่งน้ำ / ดีบัฟไฟ = ฝั่งไฟ)\n"
     "หลักเหมือน Insane Air ครั้งแรก แต่ตอนท่าออก คนรับผิดชอบจะสลับฝั่งน้ำกับไฟ",
     "② When Xtreme Watersnaking / Xtreme Firesnaking finishes you get a debuff\n"
     "Do Insane Air on the side of your debuff's colour (water debuff = water side / fire debuff = fire side)\n"
     "It works like the first Insane Air, except that when each attack comes, the ones handling it swap between water and fire",
     strict=False)
step(P6, XS, "③ ตารางสลับฝั่ง", "③ Who swaps",
     "③ ตามชนิดท่า คนที่รับผิดชอบไปทำอีกฝั่ง:\n"
     "AoE วงกลมแรง (กระดานหันขึ้น): Tank สลับ\n"
     "stack (กระดานหันข้าง): Healer สลับ\n"
     "spread 4 คน (กระดานหันลง) ครั้งที่ 1: Melee สลับ\n"
     "spread 4 คน (กระดานหันลง) ครั้งที่ 2: Range สลับ\n\n"
     "โดนท่าของสีตรงข้าม ดีบัฟจะระเบิด (AoE วงกลม ห้ามโดนซ้ำ 2 ครั้ง) แต่ละฝั่งระเบิดทีละคน",
     "③ By attack type, the ones handling it go to the other side:\n"
     "Heavy circle (board up): tanks swap\n"
     "Stack (board sideways): healers swap\n"
     "4-way spread (board down), 1st: melee swap\n"
     "4-way spread (board down), 2nd: ranged swap\n\n"
     "Taking the opposite colour's attack sets off your debuff (a circle AoE that must not hit anyone twice); each side sets them off one at a time",
     strict=False,
     says={"MT": "AoE วงกลมแรง: สลับฝั่ง", "ST": "AoE วงกลมแรง: สลับฝั่ง", "H1": "stack: สลับฝั่ง", "H2": "stack: สลับฝั่ง",
           "D1": "spread ครั้งที่ 1: สลับฝั่ง", "D2": "spread ครั้งที่ 1: สลับฝั่ง", "D3": "spread ครั้งที่ 2: สลับฝั่ง", "D4": "spread ครั้งที่ 2: สลับฝั่ง"},
     says_en={"MT": "Heavy circle: swap sides", "ST": "Heavy circle: swap sides", "H1": "Stack: swap sides", "H2": "Stack: swap sides",
              "D1": "1st spread: swap sides", "D2": "1st spread: swap sides", "D3": "2nd spread: swap sides", "D4": "2nd spread: swap sides"},
     refs=[F("insane-air-2", "Insane Air ครั้งที่ 2: สลับฝั่งตามชนิดท่าของกระดาน", "Insane Air 2: swap sides by the board's attack type")])
step(P6, XS, "④ สลับแล้วไม่ต้องกลับ", "④ Once swapped, stay",
     "④ คนที่สลับแล้วทำต่อฝั่งนั้นเลย (ดีบัฟหายแล้ว จะรับฝั่งไหนก็ได้) ไม่ต้องกลับฝั่งเดิม\n\n"
     "ตัวอย่างของ game8: Healer ได้ดีบัฟน้ำ เริ่มทำฝั่งน้ำ พอ stack มาก็ไปฝั่งไฟ แล้วทำฝั่งไฟต่อจนจบ\n"
     "ระวัง: ตอน Tank สลับ อย่ายืนใกล้ (กลางสนาม) อาจโดนวงระเบิดของดีบัฟ Tank",
     "④ Once you've swapped, carry on on that side (your debuff is gone and either side is fine); no need to go back\n\n"
     "game8's example: a healer with the water debuff starts on the water side, goes to the fire side when the stack comes, and stays there to the end\n"
     "Careful: when the tanks swap, don't stand near them (in the middle); you may be caught in a tank's debuff explosion",
     strict=False)

AL = "Alley-oop Double-dip / Reverse Alley-oop + Pyrotation + Deep Impact"
step(P6, AL, "① spread พื้นฐาน", "① Basic spread",
     "หลัง Xtreme snaking ดูร่ายของ Deep Blue แล้ว spread พื้นฐานให้ได้ เป็นจุดสำคัญ ที่เหลือเหมือน Double/Reverse ครั้งแรก\n"
     "macro: Alley-oop ของ Deep Blue + Red Hot มาพร้อมกัน\n\n"
     "① spread พื้นฐาน 8 ทิศรอบนอก บอสน่าจะหันแค่ทาง A จะยึดบอสหรือยึด A (เหนือของแมพ) ก็ได้",
     "After Xtreme snaking, watch Deep Blue's cast and get to the basic spread; that's the key, and the rest is as in the first Double/Reverse\n"
     "Macro: Deep Blue's and Red Hot's Alley-oops come together\n\n"
     "① Basic 8-way spread on the outside. The boss probably only faces A, so go by the boss or by A (map north)",
     strict=True, pic=69, scene=S.end1(), says=SPREAD8, says_en=SPREAD8_EN,
     refs=[F("final-spread", "Double / Reverse Alley-oop: spread 8 ทิศรอบ Deep Blue", "Double / Reverse Alley-oop: 8-way spread around Deep Blue")])
step(P6, AL, "② Double = หลบตามเข็ม / Reverse = อยู่ที่เดิม", "② Double = dodge clockwise / Reverse = stay",
     "② Double = หลบตามเข็มนาฬิกา (macro: ยึดแมพ วนตามเข็มรอบนอกจากจุด spread พื้นฐาน)\n"
     "Reverse = อยู่ที่เดิม\n"
     "ภาพ: Double",
     "② Double = dodge clockwise (macro: by the map, clockwise around the outside from the basic spread spot)\n"
     "Reverse = stay put\n"
     "Picture: Double",
     strict=True, pic=70, scene=S.end2(),
     says={k: v + " แล้ว Double: วนตามเข็ม" for k, v in SPREAD8.items()},
     says_en={k: v + "; Double: rotate clockwise" for k, v in SPREAD8_EN.items()})
step(P6, AL, "③ Tank ถือ Deep Blue ถอยออก คนอื่นรวมใต้ Deep Blue", "③ Deep Blue's tank moves out, everyone else under Deep Blue",
     "③ Tank ที่ถือเป้า Deep Blue ถอยห่างเพื่อรับท่าแรง (knockback ระยะสั้น)\n"
     "คนอื่นรวมกันใต้ Deep Blue",
     "③ The tank holding Deep Blue moves away to take the heavy hit (short knockback)\n"
     "Everyone else gathers right under Deep Blue",
     strict=False, pic=71, scene=S.end3(),
     says={"MT": "ถ้าถือ Deep Blue: ถอยห่างไปรับท่าแรง"}, says_en={"MT": "If you hold Deep Blue: move away to take the heavy hit"},
     refs=[F("final-stack", "วงกลม (เหลือพื้นไฟ) ออกที่จุด spread แล้วรวมใต้ Deep Blue / Tank ถอยไปรับ", "Circles (fire floor) at the spread spots, then gather under Deep Blue / the tank moves out")])
step(P6, AL, "④ stack + ท่าแรงที่คนห่าง", "④ Stack + heavy hit on the one away",
     "④ stack และท่าแรงใส่คนที่ห่างมาพร้อมกัน\n"
     "ทุกคนรวมใต้ Deep Blue ท่าแรงจึงไปลง Tank ที่ถอยออกไปเอง",
     "④ The stack and the heavy hit on the player away come together\n"
     "Since everyone is under Deep Blue, the heavy hit naturally goes to the tank who moved out",
     strict=["MT"], pic=72, scene=S.end4(),
     says={"MT": "ถ้าถือ Deep Blue: รับท่าแรงตรงนี้ (ใช้ mitigate)"}, says_en={"MT": "If you hold Deep Blue: take the heavy hit here (mitigate)"})
step(P6, AL, "⑤ stack 3 ครั้ง ขยับไปทางกลาง", "⑤ Three stacks moving to the middle",
     "⑤ stack (Pyrotation): จากใต้ Deep Blue ขยับไปทางกลางสนาม รับ 3 ครั้ง",
     "⑤ Stacks (Pyrotation): from under Deep Blue, move towards the middle and take three",
     strict=False, pic=73, scene=S.end5())

step(P6, "Divers' Dare ×2 > Over the Falls", "raid-wide 2 ครั้ง แล้วหมดเวลา", "Two raid-wides, then time's up",
     "AoE ทั้งปาร์ตี้ 2 ครั้ง แล้วบอสใช้ Over the Falls = หมดเวลา (wipe)\n"
     "ต้องจบบอสก่อนถึงตรงนี้",
     "Two raid-wides, then the bosses use Over the Falls = time's up (wipe)\n"
     "The bosses must die before this",
     refs=[F("divers-dare-twice", "Divers' Dare 2 ครั้ง แล้วหมดเวลาที่ Over the Falls", "Divers' Dare twice, then time runs out at Over the Falls")])

# ------------------------------------------------------------------ the guide
NOTE = ("แผนตาม game8: แผนของ Inumaru เป็นหลัก ปรับบางจุด (Healer เข้า Watery Grave / เส้นไฟ A·C ตายตัว)\n"
        "Marker A B C D บอกทิศ / 1 2 3 4 ใช้ยืนช่วงแบ่งสนาม (ดูขั้นแรก)\n\n"
        "กลุ่ม 4:4\n"
        "กลุ่ม MT: MT H1 D1 D3\n"
        "กลุ่ม ST: ST H2 D2 D4\n\n"
        "ช่วง 2 ตัว: กลุ่ม MT ฝั่ง Deep Blue (น้ำ) / กลุ่ม ST ฝั่ง Red Hot (ไฟ)\n"
        "ช่วงแบ่งสนาม: กลุ่ม MT ตะวันตก / กลุ่ม ST ตะวันออก\n"
        "(วิดีโอของ Inumaru สลับ: กลุ่ม MT ฝั่งไฟ / กลุ่ม ST ฝั่งน้ำ)\n\n"
        "spread พื้นฐาน 8 ทิศ (หันหาบอส):\n"
        "D3 / MT / D4\n"
        "H1 / H2\n"
        "D1 / ST / D2\n\n"
        "ลำดับ: Red Hot > Deep Blue > 2 ตัว > Watery Grave > แบ่งสนาม > ช่วงท้าย > หมดเวลา")
NOTE_EN = ("Plan follows game8: Inumaru's strat as the base, with some changes (healers in the Watery Grave / fire lines fixed to A·C)\n"
           "Waymarks A B C D for directions / 1 2 3 4 for spots in the split arena (see the first step)\n\n"
           "4:4 groups\n"
           "MT group: MT H1 D1 D3\n"
           "ST group: ST H2 D2 D4\n\n"
           "Both bosses: MT group on Deep Blue (water) / ST group on Red Hot (fire)\n"
           "Split arena: MT group west / ST group east\n"
           "(Inumaru's video swaps them: MT group fire / ST group water)\n\n"
           "Basic 8-way spread (facing the boss):\n"
           "D3 / MT / D4\n"
           "H1 / H2\n"
           "D1 / ST / D2\n\n"
           "Order: Red Hot > Deep Blue > both > Watery Grave > split arena > final part > time out")

ROLES = [("Fending", "PLD WAR DRK GNB", ["Headgear", "Gloves", "Boots"]), ("Maiming", "DRG RPR", ["Headgear", "Gloves", "Boots"]),
         ("Striking", "MNK SAM BST", ["Goggles", "Gloves", "Sabatons"]), ("Scouting", "NIN VPR", ["Goggles", "Gloves", "Sabatons"]),
         ("Aiming", "BRD MCH DNC", ["Goggles", "Gloves", "Boots"]), ("Healing", "WHM SCH AST SGE", ["Headgear", "Gloves", "Sabatons"]),
         ("Casting", "BLM SMN RDM PCT", ["Headgear", "Gloves", "Sabatons"])]
ICONS = json.load(open(HERE + "/api/gear_icons.json", encoding="utf-8"))
pieces = []
for role, jobs, slots in ROLES:
    for slot in slots:
        name = f"Grand Champion's {slot} of {role}"
        pieces.append({"name": name, "job": jobs, "icon_src": ICON(ICONS[name])})

S9 = {"map": "x6t1/00", "size": 180}
rewards = [
    {"kind": "token", "name": "AAC Illustrated: HW Edition II",
     "icon_src": ICON("ui/icon/026000/026458_hr1.tex"),
     "say": "ได้ 1 เล่มทุกครั้งที่เคลียร์ (การันตี รับได้สัปดาห์ละครั้ง)\n\n"
            "แลกที่ Hhihwi (Arcadion Relic Exchange) ใน Solution Nine (X: 8.7 Y: 13.4)\n"
            "หัว / มือ / เท้า Grand Champion's IL790: 4 เล่ม ต่อชิ้น\n"
            "Thundersteeping Glaze: 3 เล่ม",
     "say_en": "Every clear gives 1 (guaranteed, once a week).\n\n"
               "Exchange them with Hhihwi (Arcadion Relic Exchange) in Solution Nine (X: 8.7 Y: 13.4)\n"
               "Grand Champion's head / hands / feet, IL790: 4 per piece\n"
               "Thundersteeping Glaze: 3",
     "pics": [{"map": {**S9, "x": 8.7, "y": 13.4, "label": "Hhihwi"},
               "say": "จุดแลก: Hhihwi ใน Solution Nine (X: 8.7 Y: 13.4)",
               "say_en": "Where to exchange: Hhihwi in Solution Nine (X: 8.7 Y: 13.4)"}]},
    {"kind": "other", "name": "Grand Champion's Head / Hand / Foot Gear Coffer (IL 790)", "ilvl": 790,
     "icon_src": ICON("ui/icon/026000/026558_hr1.tex"),
     "say": "หีบมีกล่องอุปกรณ์ หัว / มือ / เท้า อย่างละ 1 กล่อง (ทอยของ)\n"
            "เปิดแล้วได้ชิ้นของอาชีพตัวเอง IL790\n"
            "หรือแลกด้วย AAC Illustrated: HW Edition II 4 เล่ม ต่อชิ้น\n"
            "แตะไอคอนเพื่อดูชื่อชิ้น",
     "say_en": "The chest holds one head, one hand and one foot gear coffer (rolled for)\n"
               "Opening one gives your job's IL790 piece\n"
               "Or exchange 4 AAC Illustrated: HW Edition II per piece\n"
               "Tap an icon for the piece's name",
     "pieces": pieces},
    {"kind": "other", "name": "Universal Tomestone 3.0",
     "icon_src": ICON("ui/icon/026000/026685_hr1.tex"),
     "say": "หีบมี 1 ชิ้น (ทอยของ)\nใช้คู่กับ Allagan Tomestone of Mnemonics 500 แลกอาวุธ Bygone Brass IL780",
     "say_en": "The chest holds 1 (rolled for)\nWith 500 Allagan Tomestones of Mnemonics it buys a Bygone Brass weapon, IL780"},
    {"kind": "other", "name": "Thundersteeping Glaze",
     "icon_src": ICON("ui/icon/027000/027641_hr1.tex"),
     "say": "หีบมี 1 ชิ้น (ทอยของ) หรือแลกด้วย AAC Illustrated: HW Edition II 3 เล่ม\n"
            "ใช้อัปเกรด accessory Bygone Brass (IL780) เป็น Augmented Bygone Brass (IL790)",
     "say_en": "The chest holds 1 (rolled for), or exchange 3 AAC Illustrated: HW Edition II\n"
               "Upgrades Bygone Brass accessories (IL780) to Augmented Bygone Brass (IL790)"},
]

guide = {
    "slug": "m10s", "short": "M10S", "sort": 2,
    "name": "The Xtremes · AAC Heavyweight M2 (Savage)",
    "category": "savage", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/755672",
    "content_key": "sav:M10S",
    "note": NOTE, "en": {"note": NOTE_EN},
    "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
    "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/savage_raids/m10s/",
    "req": {
        "level": 100, "ilvl": 765, "party": 8, "minutes": 90,
        "unlock": "เคลียร์เควส Glory Incarnate (Arcadion รุ่น Heavyweight) ก่อน\n"
                  "แล้วคุยกับ Gabbro ที่ Solution Nine (X: 22.4 Y: 17.1) เพื่อปลดล็อก\n"
                  "Savage ของ Arcadion ทุกรุ่นปลดล็อกที่ NPC คนนี้",
        "unlock_en": "Finish the quest Glory Incarnate (the Arcadion, heavyweight) first\n"
                     "then talk to Gabbro in Solution Nine (X: 22.4 Y: 17.1) to unlock it\n"
                     "Every Arcadion Savage tier is unlocked from this NPC",
        "unlock_pics": [{"map": {**S9, "x": 22.4, "y": 17.1, "label": "Gabbro"},
                         "say": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro",
                         "say_en": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro"}],
    },
}

DEFAULTS = {"frame": [4, 3], "bg": "#5f6166",
            "arena": {"shape": "square", "at": [50, 50], "w": 68, "h": 68, "fill": "#b9babe", "lines": False, "edge": "#3a3b40"},
            "waymarks": {}, "iconSize": 5.8, "markSize": 4.8, "bossSize": 8.5, "ring": 5.5}

data = {"guide": guide, "defaults": DEFAULTS, "steps": steps, "rewards": rewards}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print(OUT, len(steps), "steps,", sum(1 for s in steps if s["scene"]), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs")
