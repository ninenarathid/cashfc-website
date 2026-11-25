"""Builds scripts/guides/data/ex6-doomtrain.json (EX6 Doomtrain, game8's plan: Nukemaru's strat + Arcane Revelation 2:6)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex6"
sys.path.insert(0, HERE + "/tools")
import scenes6 as S

OUT = r"scripts/guides/data/ex6-doomtrain.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk_*
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "SQBZG8iFN94"
FR = lambda name, t, say, say_en: (f"frames/ex6-doomtrain/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")
UP = ["↑", "↓", "↑", "↓"]

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = 6.5
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วง Turret Crossing", "Turret Crossing")
P3 = ("ช่วงต่างมิติ (Runaway Train)", "Other world (Runaway Train)")
P4 = ("ช่วงหลัง", "Second part")
P5 = ("ช่วงท้าย", "Last part")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "ทิศในคู่มือนี้ (ภาพของ game8 ไม่มี Marker)", "Directions in this guide (game8's pictures have no waymarks)",
     "game8 ไม่มีหัวข้อ Marker และภาพของ game8 ไม่ได้วาง Marker ไว้\n"
     "สนามเป็นตู้รถไฟยาว ทุกภาพวางหัวขบวน (บอส) ไว้ด้านบน = เหนือ\n"
     "ซ้ายบน = ตะวันตกเฉียงเหนือ / ขวาบน = ตะวันออกเฉียงเหนือ\n\n"
     "ช่วงต่างมิติ (Runaway Train) สนามเป็นวงกลม: นับจุดที่รถไฟวงในหยุดเป็นเหนือ",
     "game8 has no waymark section, and its pictures place no waymarks\n"
     "The arena is a long train car; every picture puts the front of the train (the boss) at the top = north\n"
     "Top-left = north-west / top-right = north-east\n\n"
     "In the other world (Runaway Train) the arena is round: where the inner train stops counts as north")

# ------------------------------------------------------------------ first part
SPREAD_SAYS = {"MT": "spread แถวหน้าสุด ฝั่งซ้าย", "ST": "spread แถวหน้าสุด ฝั่งขวา", "D1": "spread แถวที่ 2 ฝั่งซ้าย",
               "D2": "spread แถวที่ 2 ฝั่งขวา", "H1": "spread แถวที่ 3 ฝั่งซ้าย", "H2": "spread แถวที่ 3 ฝั่งขวา",
               "D3": "spread แถวหลังสุด ฝั่งซ้าย", "D4": "spread แถวหลังสุด ฝั่งขวา"}
SPREAD_SAYS_EN = {"MT": "Spread: front row, left", "ST": "Spread: front row, right", "D1": "Spread: 2nd row, left",
                  "D2": "Spread: 2nd row, right", "H1": "Spread: 3rd row, left", "H2": "Spread: 3rd row, right",
                  "D3": "Spread: back row, left", "D4": "Spread: back row, right"}
PAIR_SAYS = {"MT": "stack กับ D1 หน้าซ้าย", "D1": "stack กับ MT หน้าซ้าย", "ST": "stack กับ D2 หน้าขวา", "D2": "stack กับ ST หน้าขวา",
             "H1": "stack กับ D3 หลังซ้าย", "D3": "stack กับ H1 หลังซ้าย", "H2": "stack กับ D4 หลังขวา", "D4": "stack กับ H2 หลังขวา"}
PAIR_SAYS_EN = {"MT": "Stack with D1, front left", "D1": "Stack with MT, front left", "ST": "Stack with D2, front right",
                "D2": "Stack with ST, front right", "H1": "Stack with D3, back left", "D3": "Stack with H1, back left",
                "H2": "Stack with D4, back right", "D4": "Stack with H2, back right"}

step(P1, "Dead Man's Overdraught", "ลูกบอล 8 ลูก = spread", "8 orbs = spread",
     "ลูกบอลสายฟ้าลอยขึ้นรอบตัวบอส นับจำนวนลูกเพื่อรู้ว่าต้องรับคนเดียว (spread) หรือรับเป็นคู่ (stack คู่)\n"
     "8 ลูก = spread (ภาพนี้)\n"
     "4 ลูก = stack คู่ (ขั้นถัดไป)\n\n"
     "ยังไม่ระเบิดทันที: ระเบิดหลัง Dead Man's Express / Dead Man's Windpipe\n"
     "จากนี้ไป ทุกครั้งที่ Dead Man's Overdraught มา ให้จำไว้ว่า spread หรือ stack คู่\n\n"
     "จุด spread (ตาม macro) จากหน้าไปหลัง ซ้าย / ขวา:\n"
     "MT / ST\nD1 / D2\nH1 / H2\nD3 / D4",
     "Orbs of lightning float up around the boss; count them to know whether you take it alone (spread) or in pairs\n"
     "8 orbs = spread (this picture)\n"
     "4 orbs = pair stacks (next step)\n\n"
     "It doesn't go off at once: it resolves after Dead Man's Express / Dead Man's Windpipe\n"
     "From now on, whenever Dead Man's Overdraught comes, remember spread or pairs\n\n"
     "Spread spots (by the macro), front to back, left / right:\n"
     "MT / ST\nD1 / D2\nH1 / H2\nD3 / D4",
     strict=True, pic=4, scene=S.ob_spread(), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN,
     refs=[FR("overdraught-8-orbs", 108, "ลูกบอลสายฟ้า 8 ลูกรอบตัวบอส = spread", "Eight lightning orbs around the boss = spread")])

step(P1, "Dead Man's Overdraught", "ลูกบอล 4 ลูก = stack คู่", "4 orbs = pair stacks",
     "4 ลูก = stack คู่\n"
     "คู่ (ตาม macro): MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
     "MT·D1 หน้าซ้าย\nST·D2 หน้าขวา\nH1·D3 หลังซ้าย\nH2·D4 หลังขวา",
     "4 orbs = pair stacks\n"
     "Pairs (by the macro): MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
     "MT·D1 front left\nST·D2 front right\nH1·D3 back left\nH2·D4 back right",
     strict=True, pic=5, scene=S.ob_pairs(), says=PAIR_SAYS, says_en=PAIR_SAYS_EN,
     refs=[FR("overdraught-4-orbs", 28, "ลูกบอลสายฟ้า 4 ลูกรอบตัวบอส = stack คู่", "Four lightning orbs around the boss = pair stacks")])

MX = "Dead Man's Express + Dead Man's Overdraught"
step(P1, MX, "① วงสายฟ้า: ดูชั้นบน / ชั้นล่าง", "① The lightning rings: high or low",
     "Dead Man's Express: วงสายฟ้าขึ้นที่หน้าขบวน แล้วบอสพุ่งชน\n"
     "① ดูว่าแต่ละวงอยู่ชั้นบนหรือชั้นล่าง แล้วไปยืนในแนวที่ AoE ไม่โดน\n"
     "วงชั้นบนยิงแนวตรงที่ชั้นบน: ถ้ายืนอยู่ชั้นล่าง (บนพื้น) ต่อให้อยู่แนวเดียวกับวงชั้นบนก็ไม่โดน\n\n"
     "ในภาพ: ↑ = วงชั้นบน / ↓ = วงชั้นล่าง\n"
     "ภาพ: ยืนเป็นคู่ MT·D1 / ST·D2 / H1·D3 / H2·D4 ในแนวของวงชั้นบน",
     "Dead Man's Express: lightning rings appear at the front of the train, then the boss charges\n"
     "① See whether each ring is high or low, and stand in a line its AoE won't hit\n"
     "A high ring fires its line on the high level: on the low level (the floor) you are safe even in a high ring's line\n\n"
     "In the picture: ↑ = high ring / ↓ = low ring\n"
     "Picture: pairs MT·D1 / ST·D2 / H1·D3 / H2·D4 in the lines of the high rings",
     strict=True, pic=6, scene=S.ex1(UP),
     refs=[FR("express-rings", 48, "วงสายฟ้าของ Dead Man's Express มี 2 ชั้น: วงด้านหลัง = ชั้นบน / วงด้านหน้า = ชั้นล่าง",
              "Dead Man's Express rings on two levels: the back ones high / the front ones low")])
step(P1, MX, "② พุ่งชน: knockback", "② The charge: knockback",
     "② Dead Man's Express พุ่งชน ผลักทุกคนไปทางท้ายขบวน (knockback)\n"
     "กันได้ด้วย Arm's Length / Surecast",
     "② Dead Man's Express charges and knocks everyone back towards the rear\n"
     "Arm's Length / Surecast stop it",
     strict=True, pic=7, scene=S.ex2(UP))
step(P1, MX, "③ AoE แนวตรงจากวงสายฟ้า", "③ Line AoEs from the rings",
     "③ AoE แนวตรงยิงออกจากวงสายฟ้า\n"
     "แนวของวงชั้นล่างโดนคนที่ยืนบนพื้น / แนวของวงชั้นบนไม่โดน",
     "③ Line AoEs fire from the rings\n"
     "A low ring's line hits players on the floor / a high ring's line does not",
     strict=True, pic=8, scene=S.ex3(UP, deep=(1, 3)))
step(P1, MX, "④ Dead Man's Overdraught (ภาพ: spread)", "④ Dead Man's Overdraught (picture: spread)",
     "④ สุดท้าย Dead Man's Overdraught ระเบิดตามที่จำไว้\nภาพนี้: spread",
     "④ Last, Dead Man's Overdraught resolves as remembered\nThis picture: spread",
     strict=True, pic=4, scene=S.ob_spread(), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)

MW = "Dead Man's Windpipe + Dead Man's Overdraught"
step(P1, MW, "① หลบหลังสิ่งกีดขวาง", "① Behind the cover",
     "Dead Man's Windpipe: ดูดทุกคนไปทางหน้าขบวน\n"
     "① ใช้สิ่งกีดขวางเป็นกำแพง: ในสนามมีสิ่งกีดขวาง 2 จุด (บล็อกสีม่วง) หลบไปอยู่หลังมันจะไม่โดนดูดไปข้างหน้า",
     "Dead Man's Windpipe: pulls everyone towards the front of the train\n"
     "① Use the cover as a wall: there are 2 pieces of cover on the field (the purple blocks); behind them you are not pulled forward",
     strict=False, pic=9, scene=S.wp1(),
     refs=[FR("windpipe-pull", 84, "Dead Man's Windpipe: ลมหมุนที่หน้าขบวนดูดทุกคนไปข้างหน้า",
              "Dead Man's Windpipe: the swirl at the front pulls everyone forward")])
step(P1, MW, "② ดูด", "② The pull",
     "② ดูดไปทางหน้าขบวน",
     "② The pull towards the front",
     strict=False, pic=10, scene=S.wp2())
step(P1, MW, "③ AoE ฝั่งหน้าขบวน", "③ The AoE at the front",
     "③ AoE ระเบิดฝั่งหน้าขบวน\n"
     "การดูดกันได้ด้วย Arm's Length / Surecast (ภาพ: MT กับ D1 ใช้แล้ว)\n\n"
     "Dead Man's Express และ Windpipe กันด้วย Arm's Length / Surecast ได้ทั้งคู่\n"
     "แต่โดนดูดแก้ตัวยากกว่า จึงแนะนำให้ใช้กับ Windpipe และใช้กับ Windpipe ครั้งต่อๆ ไปก็ดี",
     "③ The AoE goes off at the front\n"
     "Arm's Length / Surecast stop the pull (picture: MT and D1 used one)\n\n"
     "Arm's Length / Surecast stop both Dead Man's Express and Windpipe\n"
     "A pull is harder to recover from, so they are best saved for Windpipe, this one and later ones",
     strict=False, pic=11, scene=S.wp3())
step(P1, MW, "④ Dead Man's Overdraught (ภาพ: stack คู่)", "④ Dead Man's Overdraught (picture: pairs)",
     "④ สุดท้าย Dead Man's Overdraught ระเบิดตามที่จำไว้\nภาพนี้: stack คู่",
     "④ Last, Dead Man's Overdraught resolves as remembered\nThis picture: pair stacks",
     strict=True, pic=12, scene=S.wp4(), says=PAIR_SAYS, says_en=PAIR_SAYS_EN)

step(P1, "Unlimited Express", "ทำลายตู้รถไฟ: raid-wide physical แรง", "Destroys the car: a heavy physical raid-wide",
     "ทำลายตู้รถไฟที่ผู้เล่นยืนอยู่\n"
     "ดาเมจ physical แรงมาก ทั้งปาร์ตี้\n"
     "ใช้ barrier และ mitigate\n"
     "Melee: Feint ได้ผลกับท่านี้ ใช้ด้วย",
     "Destroys the car the party is standing on\n"
     "Heavy physical damage to the whole party\n"
     "Use barriers and mitigation\n"
     "Melees: Feint works on it, use it")

# ------------------------------------------------------------------ Turret Crossing
MT2 = "Turret Crossing + Dead Man's Express / Windpipe"
step(P2, MT2, "ชุดที่ 1 ①: ป้อมปืนโผล่สองข้าง", "Set 1 ①: Turrets on both sides",
     "Turret Crossing: ป้อมปืน (kinematic turret) โผล่สองข้างสนาม ยิง AoE แนวตรง (Electray) ร่วมกับ Dead Man's Express / Windpipe ของบอส แล้วตามด้วย Dead Man's Overdraught\n"
     "ในสนามมีสิ่งกีดขวางที่บังลำแสงป้อมปืนได้ ทางตะวันออกเฉียงเหนือและตะวันตกเฉียงใต้ (กล่องขอบฟ้าในภาพ)\n"
     "ลำดับ: ป้อมปืนยิง > Express / Windpipe > Overdraught จำให้ขึ้นใจ\n\n"
     "① ป้อมปืนโผล่ ฝั่งที่เรืองแสงจะยิง AoE แนวตรง (ภาพ: ฝั่งขวา)\n"
     "ภาพ: กลุ่ม MT (MT D1 H1 D3) ซ้าย / กลุ่ม ST (ST D2 H2 D4) ขวา",
     "Turret Crossing: turrets (kinematic turrets) appear on both sides and fire line AoEs (Electray), together with the boss's Dead Man's Express / Windpipe, then Dead Man's Overdraught\n"
     "There is cover against the turrets' beams in the north-east and south-west (the blue-edged boxes in the picture)\n"
     "The order: turrets fire > Express / Windpipe > Overdraught; know it by heart\n\n"
     "① The turrets appear; the side that glows fires line AoEs (picture: the right)\n"
     "Picture: MT group (MT D1 H1 D3) left / ST group (ST D2 H2 D4) right",
     strict=True, pic=14, scene=S.tc1(),
     refs=[FR("turret-beams", 152, "ป้อมปืนฝั่งที่เรืองแสงยิงลำแสงข้ามสนาม หลบหลังบล็อก",
              "The glowing turrets fire across the arena; hide behind the blocks")])
step(P2, MT2, "ชุดที่ 1 ②: ป้อมปืนยิงก่อน", "Set 1 ②: The turrets fire first",
     "② บอสร่าย Dead Man's Express / Windpipe แต่ป้อมปืนยิงก่อน: ใช้บล็อกเป็นกำแพงหลบ",
     "② The boss casts Dead Man's Express / Windpipe, but the turrets fire first: use the blocks as walls",
     strict=True, pic=15, scene=S.tc2())
step(P2, MT2, "ชุดที่ 1 ③: Express / Windpipe ทันที (ภาพ: Express)", "Set 1 ③: Express / Windpipe at once (picture: Express)",
     "③ แล้วตามด้วย Dead Man's Express / Windpipe ทันที\nภาพนี้: Express (↑ = วงชั้นบน / ↓ = วงชั้นล่าง)",
     "③ Then Dead Man's Express / Windpipe straight away\nThis picture: Express (↑ = high ring / ↓ = low ring)",
     strict=True, pic=16, scene=S.tc3())
step(P2, MT2, "ชุดที่ 1 ④: AoE จากวงสายฟ้า", "Set 1 ④: The rings' AoEs",
     "④ AoE จากวงสายฟ้าทำงาน",
     "④ The rings' AoEs go off",
     strict=True, pic=17, scene=S.tc4())
step(P2, MT2, "ชุดที่ 1 ⑤: Overdraught (ภาพ: stack คู่)", "Set 1 ⑤: Overdraught (picture: pairs)",
     "⑤ แล้ว Dead Man's Overdraught\nภาพนี้: stack คู่",
     "⑤ Then Dead Man's Overdraught\nThis picture: pair stacks",
     strict=True, pic=18, scene=S.tc5(), says=PAIR_SAYS, says_en=PAIR_SAYS_EN)
step(P2, MT2, "ชุดที่ 1 ⑥: ถ้าเป็น spread", "Set 1 ⑥: If it is spread",
     "⑥ ถ้าเป็น spread ยืนแบบนี้",
     "⑥ If it is spread, stand like this",
     strict=True, pic=19, scene=S.tc6(), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P2, MT2, "ชุดที่ 2 ①: ป้อมปืนซ้ายเรืองแสง + มาร์กที่ Tank", "Set 2 ①: Left turrets glow + marks on the tanks",
     "ชุดที่ 2: ป้อมปืน + Express / Windpipe + Lightning Burst + Overdraught\n\n"
     "① บอสร่าย Dead Man's Overdraught ป้อมปืนฝั่งซ้ายเรืองแสง\n"
     "Lightning Burst: มาร์กที่ Tank ทั้ง 2 คน",
     "Set 2: turrets + Express / Windpipe + Lightning Burst + Overdraught\n\n"
     "① The boss casts Dead Man's Overdraught; the left turrets glow\n"
     "Lightning Burst: marks on both tanks",
     strict=True, pic=20, scene=S.tc7())
step(P2, MT2, "ชุดที่ 2 ②: ป้อมปืนยิงก่อน", "Set 2 ②: The turrets fire first",
     "② ป้อมปืนยิงก่อน",
     "② The turrets fire first",
     strict=True, pic=21, scene=S.tc8())
step(P2, MT2, "ชุดที่ 2 ③: Tank ไปข้างหน้ารับ Lightning Burst", "Set 2 ③: Tanks go forward for Lightning Burst",
     "③ หลบแนวยิงป้อมปืนเสร็จ Tank ออกไปข้างหน้า รับ AoE ของ Lightning Burst",
     "③ Once the turret beams are dodged, the tanks go forward and take Lightning Burst's AoE",
     strict=True, pic=22, scene=S.tc9(),
     says={"MT": "ไปหน้าซ้าย รับ Lightning Burst", "ST": "ไปหน้าขวา รับ Lightning Burst"},
     says_en={"MT": "Go front left and take Lightning Burst", "ST": "Go front right and take Lightning Burst"})
step(P2, MT2, "ชุดที่ 2 ④: ป้อมปืนเรืองแสงอีกรอบ", "Set 2 ④: The turrets glow again",
     "④ ป้อมปืนเรืองแสงอีกรอบ ไปยืนจุดที่บังแนวยิงของฝั่งที่เรืองแสง\n"
     "ตอนนี้บอสร่าย Express หรือ Windpipe อยู่ ดูไว้ให้ดี",
     "④ The turrets glow again; go where the glowing side's fire is blocked\n"
     "The boss is casting Express or Windpipe now; watch which",
     strict=True, pic=23, scene=S.tc10())
step(P2, MT2, "ชุดที่ 2 ⑤: Windpipe ใช้สิ่งกีดขวางกันดูด", "Set 2 ⑤: Windpipe, use the cover",
     "⑤ Dead Man's Windpipe: ใช้สิ่งกีดขวางกันการดูด",
     "⑤ Dead Man's Windpipe: use the cover against the pull",
     strict=True, pic=24, scene=S.tc11())
step(P2, MT2, "ชุดที่ 2 ⑥: AoE ฝั่งหน้าขบวน", "Set 2 ⑥: The AoE at the front",
     "⑥ AoE ระเบิดฝั่งหน้าขบวน",
     "⑥ The AoE goes off at the front",
     strict=True, pic=25, scene=S.tc12())
step(P2, MT2, "ชุดที่ 2 ⑦: Overdraught (ภาพ: stack คู่)", "Set 2 ⑦: Overdraught (picture: pairs)",
     "⑦ แล้ว Dead Man's Overdraught\nภาพนี้: stack คู่",
     "⑦ Then Dead Man's Overdraught\nThis picture: pair stacks",
     strict=True, pic=18, scene=S.tc5(), says=PAIR_SAYS, says_en=PAIR_SAYS_EN)
step(P2, MT2, "ชุดที่ 2 ⑧: ถ้าเป็น spread", "Set 2 ⑧: If it is spread",
     "⑧ ถ้าเป็น spread ยืนแบบนี้",
     "⑧ If it is spread, stand like this",
     strict=True, pic=19, scene=S.tc6(), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)

step(P2, "Lightning Burst", "Tank รับ tankbuster ที่หน้าซ้าย / ขวา", "Tanks take the tankbuster front left / right",
     "ระหว่างนั้นมี Lightning Burst แทรกมา: tankbuster ที่ Tank 2 คน\n"
     "Tank รอให้ลำแสงของป้อมปืนจบก่อน แล้วไปข้างหน้าฝั่งซ้าย / ขวา รับ",
     "Lightning Burst comes in the middle: a tankbuster on both tanks\n"
     "Tanks wait for the turret beams to end, then go front left / right to take it",
     says={"MT": "รอลำแสงป้อมปืนจบ แล้วไปหน้าซ้ายรับ", "ST": "รอลำแสงป้อมปืนจบ แล้วไปหน้าขวารับ"},
     says_en={"MT": "After the turret beams, go front left and take it", "ST": "After the turret beams, go front right and take it"},
     refs=[FR("lightning-burst", 192, "Lightning Burst: มาร์กสีแดงเหนือ Tank 2 คน", "Lightning Burst: red marks over both tanks")])

# ------------------------------------------------------------------ Runaway Train
RT = "Runaway Train"
step(P3, RT, "ตีลูกแก้ว aether ให้แตก", "Break the aether",
     "ถูกดึงเข้าต่างมิติ ลูกแก้ว (aether) กลางสนามตีได้แล้ว: ตีให้แตก\n"
     "ถ้าพลังเวท (magic) ของ Doomtrain ถึง 100 ก่อนลูกแก้วแตก = wipe\n\n"
     "ในต่างมิติ ร่างแยก (ghost train) วิ่งบนราง 2 วง: วงนอก (ชั้นบน) และวงใน (ชั้นล่าง)\n"
     "วงนอกยิงใส่คนที่ไม่ใช่ Tank / วงในยิง AoE กรวยใส่ Tank 2 คน (ขั้นถัดไป)",
     "You are dragged into another world; the aether in the middle can now be attacked: break it\n"
     "If Doomtrain's magic reaches 100 before it breaks = wipe\n\n"
     "Ghost trains run on two tracks: the outer (high) one and the inner (low) one\n"
     "The outer one fires at the non-tanks / the inner one fires cone AoEs at the 2 tanks (next steps)",
     refs=[FR("runaway-train-aether", 208, "ลูกแก้ว aether กลางสนามต่างมิติ ตีให้แตกก่อนเกจถึง 100",
              "The aether in the middle of the other world; break it before the gauge reaches 100")])

RT_SAYS = {"MT": "หน้าซ้าย (ตามรถไฟวงใน) ล่อกรวย ใช้ mitigate", "ST": "หน้าขวา (ตามรถไฟวงใน) ล่อกรวย ใช้ mitigate",
           "H1": "หน้ากลาง", "D1": "ข้างลูกแก้ว ฝั่งซ้าย", "D2": "ข้างลูกแก้ว ฝั่งขวา",
           "H2": "หลังลูกแก้ว ขยับเข้าหาลูกแก้วนิดหน่อย", "D3": "หลังสุด ฝั่งซ้าย", "D4": "หลังสุด ฝั่งขวา"}
RT_SAYS_EN = {"MT": "Front left (by the inner train); bait the cone, mitigate", "ST": "Front right (by the inner train); bait the cone, mitigate",
              "H1": "Front middle", "D1": "Beside the aether, left", "D2": "Beside the aether, right",
              "H2": "Behind the aether, a little towards it", "D3": "Back, left", "D4": "Back, right"}
step(P3, RT, "ยิง 3 นัด (Aetherosote) = spread", "3 shots (Aetherosote) = spread",
     "ร่างแยกวงนอกเป่าหวูด แล้วยิงจากปล่องควัน 2 หรือ 3 นัด: ฟังเสียงนับนัด หรือดูรถไฟวงนอกก็ได้\n"
     "3 นัด = AoE วงกลมใส่คนที่ไม่ใช่ Tank 3 คนแบบสุ่ม: spread (ภาพนี้)\n"
     "นับจุดที่รถไฟวงในหยุดเป็นเหนือ แล้ว spread ตาม macro:\n"
     "MT H1 ST / D1 ★ D2 / H2 / D3 D4 (★ = ลูกแก้ว)\n"
     "H2 อย่าลงไปข้างล่างมากเกินไป จะชนกับ D3 D4: ขยับเข้าหาลูกแก้วนิดหน่อย\n\n"
     "พร้อมกันนั้น รถไฟวงในยิง AoE กรวยใส่ Tank 2 คน\n"
     "Tank: แยกซ้ายขวาตามรถไฟวงในเพื่อล่อกรวย ใช้ mitigate ให้ดี\n"
     "Tank ไม่โดนการโจมตีของวงนอก ดูแค่รถไฟวงในพอ",
     "The outer ghost train whistles, then fires 2 or 3 shots from its chimney: count them by sound, or watch the outer train\n"
     "3 shots = circle AoEs on 3 random non-tanks: spread (this picture)\n"
     "Count where the inner train stopped as north and spread by the macro:\n"
     "MT H1 ST / D1 ★ D2 / H2 / D3 D4 (★ = the aether)\n"
     "H2: don't go too far back or you clash with D3 D4; lean a little towards the aether\n\n"
     "At the same time the inner train fires cone AoEs at the 2 tanks\n"
     "Tanks: split left and right by the inner train to bait the cones; use your mitigation\n"
     "The outer train never targets tanks, so tanks watch only the inner train",
     strict=True, pic=27, scene=S.rt_spread(), says=RT_SAYS, says_en=RT_SAYS_EN)
step(P3, RT, "ยิง 2 นัด (Aetherochar) = stack 3:3", "2 shots (Aetherochar) = 3:3 stacks",
     "2 นัด = stack 3:3 (ตาม macro: หวูด 2 ครั้ง = 3:3)\n"
     "H1 D1 D2 / H2 D3 D4\n"
     "Tank แยกซ้ายขวาล่อกรวยของรถไฟวงในเหมือนเดิม",
     "2 shots = 3:3 stacks (by the macro: 2 whistles = 3:3)\n"
     "H1 D1 D2 / H2 D3 D4\n"
     "Tanks split left and right for the inner train's cones as before",
     strict=True, pic=28, scene=S.rt_stack(),
     says={"MT": "หน้าซ้าย ล่อกรวย ใช้ mitigate", "ST": "หน้าขวา ล่อกรวย ใช้ mitigate", "H1": "stack กับ D1 D2", "D1": "stack ที่ H1",
           "D2": "stack ที่ H1", "H2": "stack กับ D3 D4", "D3": "stack ที่ H2", "D4": "stack ที่ H2"},
     says_en={"MT": "Front left; bait the cone, mitigate", "ST": "Front right; bait the cone, mitigate", "H1": "Stack with D1 D2",
              "D1": "Stack on H1", "D2": "Stack on H1", "H2": "Stack with D3 D4", "D3": "Stack on H2", "D4": "Stack on H2"})
step(P3, RT, "ลูกแก้วแตก: Runaway Train", "The aether breaks: Runaway Train",
     "ตีลูกแก้วแตกแล้ว Runaway Train มา: ดาเมจทั้งปาร์ตี้\n"
     "ใช้ mitigate และ barrier",
     "Once the aether breaks, Runaway Train comes: damage to the whole party\n"
     "Use mitigation and barriers")

# ------------------------------------------------------------------ second part
step(P4, "Shockwave + Lightning Burst", "raid-wide ไม่มีร่าย แล้ว tankbuster", "An uncast raid-wide, then tankbusters",
     "บอสงอกแขนออกมา แล้วใช้ raid-wide ทันทีโดยไม่มีร่าย (Shockwave) มักลืม และแรงพอสมควร\n"
     "แล้วต่อด้วย tankbuster ใส่อันดับ hate 1 และ 2 ทันที (Lightning Burst)",
     "Once the boss grows arms, it uses a raid-wide with no cast (Shockwave); easy to forget and fairly painful\n"
     "Straight after, tankbusters on the top 2 of the enmity list (Lightning Burst)",
     refs=[FR("shockwave-arms", 380, "บอสงอกแขนพลังงานสีฟ้า: Shockwave มาทันที", "The boss grows blue arms: Shockwave comes at once")])
step(P4, "Derailment Siege + Derail", "stack ต่อเนื่องใน tower แล้วขึ้น warp", "Repeated stacks in a tower, then the warp",
     "stack ต่อเนื่องหลายครั้งใน tower ที่โผล่หน้าบอส\n"
     "จะมาอีกหลายครั้ง: จบแล้วต้องไปขึ้น warp ท้ายสนามทุกครั้ง จำไว้\n\n"
     "ตาม macro: tower ครั้งที่ 2 MT ใช้ invuln / ครั้งที่ 3 ST ใช้ invuln",
     "Repeated stacks in a tower that appears in front of the boss\n"
     "It comes several more times: each time it ends, take the warp at the rear of the field\n\n"
     "By the macro: 2nd tower MT invulns / 3rd tower ST invulns",
     refs=[FR("derailment-siege-tower", 392, "Derailment Siege: tower หน้าบอส stack ต่อกันหลายครั้ง", "Derailment Siege: the tower in front of the boss, stacked several times")])

MA = "Third Rail + Arcane Revelation"
ARC_SAYS = {"MT": "ซ้ายบน กับ ST · mitigate ครั้งที่ 1 (กลุ่ม MT)", "ST": "ซ้ายบน กับ MT · mitigate ครั้งที่ 2 (กลุ่ม ST)",
            "H1": "ขวาบน · mitigate ครั้งที่ 1 (กลุ่ม MT)", "D1": "ขวาบน · mitigate ครั้งที่ 1 (กลุ่ม MT)",
            "D3": "ขวาบน · mitigate ครั้งที่ 1 (กลุ่ม MT)", "H2": "ขวาบน · mitigate ครั้งที่ 2 (กลุ่ม ST)",
            "D2": "ขวาบน · mitigate ครั้งที่ 2 (กลุ่ม ST)", "D4": "ขวาบน · mitigate ครั้งที่ 2 (กลุ่ม ST)"}
ARC_SAYS_EN = {"MT": "Top left with ST · mitigate on the 1st (MT group)", "ST": "Top left with MT · mitigate on the 2nd (ST group)",
               "H1": "Top right · mitigate on the 1st (MT group)", "D1": "Top right · mitigate on the 1st (MT group)",
               "D3": "Top right · mitigate on the 1st (MT group)", "H2": "Top right · mitigate on the 2nd (ST group)",
               "D2": "Top right · mitigate on the 2nd (ST group)", "D4": "Top right · mitigate on the 2nd (ST group)"}
step(P4, MA, "① รวมกัน ล่อ Third Rail", "① Together, bait Third Rail",
     "หลัง Third Rail และ Head-on Emission แล้วจะเป็น Arcane Revelation\n"
     "ตู้นี้มีบล็อกสีม่วงเป็นชั้นบน และเครื่องเทเลพอร์ต (วงสีฟ้า) ใช้ขึ้นลงระหว่างชั้น\n\n"
     "① ทุกคนรวมกัน ล่อ Third Rail ที่จะลงในขั้น ②",
     "After Third Rail and Head-on Emission comes Arcane Revelation\n"
     "This car has purple blocks as the high level, and teleporters (the blue rings) to go between levels\n\n"
     "① Everyone together, baiting the Third Rail that lands in ②",
     strict=False, pic=29, scene=S.ar1())
step(P4, MA, "② เสียง \"ปัง\" แล้วหลบ", "② On the \"bang\", move",
     "② ได้ยินเสียง \"ปัง\" แล้วตำแหน่ง Third Rail จะล็อก: ขยับหลบ",
     "② When you hear the \"bang\", Third Rail's spot is locked: move away",
     strict=False, pic=30, scene=S.ar2())
step(P4, MA, "③ Head-on Emission: ชั้นบน / ชั้นล่าง 2 ครั้ง", "③ Head-on Emission: high / low twice",
     "③ AoE ชั้นบน / ชั้นล่าง 2 ครั้งติด\n"
     "ปากบอสเรืองแสงสีฟ้า = ชั้นบนปลอดภัย\n"
     "หัวบอสเรืองแสงสีแดง = ชั้นล่างปลอดภัย\n"
     "จำลำดับที่เรืองแสง แล้วใช้เครื่องเทเลพอร์ตย้ายชั้น: บน → ล่าง หรือ ล่าง → บน\n\n"
     "จบแล้วไปฝั่งเหนือของสนาม เตรียม Arcane Revelation",
     "③ A high / low AoE twice in a row\n"
     "The boss's mouth glows blue = the high level is safe\n"
     "The boss's head glows red = the low level is safe\n"
     "Remember the order they glow, and use the teleporter to change level: high → low or low → high\n\n"
     "Then go to the north side of the field, ready for Arcane Revelation",
     strict=False, pic=31, scene=S.ar3())
step(P4, MA, "④ 2:6: Tank ซ้ายบน / อีก 6 คนขวาบน", "④ 2:6: tanks top left / the other six top right",
     "④ Tank 2 คนรวมที่ซ้ายบน (ตะวันตกเฉียงเหนือ) อีก 6 คนรวมที่ขวาบน (ตะวันออกเฉียงเหนือ)\n"
     "AoE วงกลม + stack ของ Arcane Revelation: ไม่หลบ รับด้วย mitigate\n"
     "มา 3 ครั้ง แบ่งกันใช้ mitigate:\n"
     "ครั้งที่ 1: กลุ่ม MT\n"
     "ครั้งที่ 2: กลุ่ม ST\n"
     "ครั้งที่ 3: Tank LB\n"
     "กลุ่ม MT = MT D1 D3 H1 / กลุ่ม ST = ST D2 D4 H2\n\n"
     "ตามที่ออกแบบมา AoE วงกลมจะเคลื่อนตามเส้นทางรูปข้าวหลามตัด แล้วระเบิดตรงที่บอสกำมือ พร้อม stack ที่ Tank 1 คนกับ Healer 1 คน ทำแบบนี้ 3 ครั้ง\n"
     "แผนนี้ (2:6) ไม่หลบตามนั้น แต่รับตรงๆ ด้วย mitigate และ Tank LB ระดับ 2",
     "④ The 2 tanks gather top left (north-west), the other six top right (north-east)\n"
     "Arcane Revelation's circle AoE + stacks: don't dodge, take them with mitigation\n"
     "It comes 3 times; share out the mitigation:\n"
     "1st: MT group\n"
     "2nd: ST group\n"
     "3rd: tank LB\n"
     "MT group = MT D1 D3 H1 / ST group = ST D2 D4 H2\n\n"
     "As designed, the circle AoE moves along a diamond-shaped route and goes off where the boss closes its hands, with stacks on 1 tank and 1 healer, 3 times\n"
     "This plan (2:6) doesn't dodge it: it takes it head-on with mitigation and a level 2 tank LB",
     strict=True, pic=32, scene=S.ar4(), says=ARC_SAYS, says_en=ARC_SAYS_EN,
     refs=[FR("arcane-revelation-hands", 457, "Arcane Revelation: AoE วงกลมใหญ่ระเบิดตรงที่บอสประกบมือ",
              "Arcane Revelation: the big circle AoE goes off where the boss brings its hands together")])
step(P4, MA, "⑤ Head-on Emission อีกครั้ง", "⑤ Head-on Emission again",
     "⑤ AoE ชั้นบน / ชั้นล่าง 2 ครั้งติดอีกครั้ง (เหมือน ③)\n"
     "ปากเรืองสีฟ้า = ชั้นบนปลอดภัย / หัวเรืองสีแดง = ชั้นล่างปลอดภัย\n"
     "จำลำดับ แล้วใช้เครื่องเทเลพอร์ตย้ายชั้น",
     "⑤ The high / low AoE twice in a row again (as in ③)\n"
     "Mouth glows blue = high is safe / head glows red = low is safe\n"
     "Remember the order and use the teleporter to change level",
     strict=False, pic=31, scene=S.ar3())
step(P4, MA, "⑥ รวมกัน ล่อ Third Rail", "⑥ Together, bait Third Rail",
     "⑥ ทุกคนรวมกัน ล่อ Third Rail ที่จะลงในขั้น ⑦",
     "⑥ Everyone together, baiting the Third Rail that lands in ⑦",
     strict=False, pic=29, scene=S.ar1())
step(P4, MA, "⑦ เสียง \"ปัง\" แล้วหลบ จากนั้น tankbuster", "⑦ On the \"bang\", move; then tankbusters",
     "⑦ เสียง \"ปัง\" แล้วหลบ Third Rail\n"
     "จากนั้น tankbuster ใส่ Tank 2 คน\n"
     "Tank มี debuff รับดาเมจเพิ่มติดอยู่: Healer ต้องดูแลด้วย",
     "⑦ On the \"bang\", move out of Third Rail\n"
     "Then tankbusters on both tanks\n"
     "The tanks carry a damage-taken-up debuff: healers must cover them",
     strict=False, pic=30, scene=S.ar2())
step(P4, MA, "⑧ tower: MT ใช้ invuln แล้วขึ้น warp", "⑧ The tower: MT invulns, then the warp",
     "⑧ stack ต่อเนื่องใน tower\n"
     "เพราะใช้ mitigate กับ Arcane Revelation ไปหมดแล้ว MT ใช้ invuln รับ\n"
     "จบแล้วไปท้ายสนามขึ้น warp\n"
     "ถ้าเป็น Dark Knight ดูแล Living Dead ให้ดี",
     "⑧ Repeated stacks in the tower\n"
     "The mitigation went into Arcane Revelation, so MT takes it with an invuln\n"
     "Then go to the rear of the field and take the warp\n"
     "A Dark Knight needs Living Dead covered properly",
     strict=["MT"], pic=33, scene=S.ar8(),
     says={"MT": "ใช้ invuln รับ tower"}, says_en={"MT": "Invuln and take the tower"})
step(P4, MA, "เคล็ด: mitigate 15–20 วินาทีครอบได้ 2 ครั้ง", "Tip: 15–20 s mitigation can cover two",
     "mitigate 15–20 วินาที ถ้าใช้ช้าหน่อยอาจครอบ Arcane Revelation ได้ 2 ครั้ง\n"
     "เช่น Expedient (Scholar) และ Holos (Sage) อยู่ 20 วินาที ถ้าจังหวะพอดีครอบ 2 ครั้งได้\n"
     "mitigate 15 วินาที ครอบ 2 ครั้งได้ถ้าวงกลมเคลื่อนไม่กี่ครั้ง\n\n"
     "หลัก: ใช้ mitigate ของตัวเองในรอบของกลุ่มตัวเอง ถ้าครอบรอบถัดไปด้วยก็ถือเป็นโบนัส\n"
     "ใช้หลังเสียงดัง \"บรื้นนน\" สักพัก",
     "15–20 s mitigation used a little late can cover two Arcane Revelations\n"
     "e.g. Expedient (Scholar) and Holos (Sage) last 20 s and can cover two if timed well\n"
     "15 s mitigation covers two if the circle moves only a few times\n\n"
     "The rule: use yours on your group's turn; if it also covers the next one, that's a bonus\n"
     "Use it a moment after the loud \"brrrr\" sound")
step(P4, MA, "Head-on Emission: วิธีดู", "Head-on Emission: how to read it",
     "Head-on Emission: AoE ชั้นบน / ชั้นล่าง\n"
     "AoE ชั้นล่าง: สายฟ้าสีฟ้าจากปากบอส → ขึ้นไปชั้นบน (ใช้เครื่องเทเลพอร์ต)\n"
     "AoE ชั้นบน: ไฟหน้า (ส่วนบนของบอส) เรืองแสงสีส้มแดง → ลงมาชั้นล่าง\n\n"
     "มา 2 ครั้งติดตามลำดับที่เรืองแสง: ต้องจำว่าสีไหนเรืองก่อน",
     "Head-on Emission: a high / low AoE\n"
     "Low-level AoE: blue lightning from the boss's mouth → go up (by the teleporter)\n"
     "High-level AoE: the headlight (the top of the boss) glows orange-red → go down\n\n"
     "It comes twice in the order they glow: remember which colour came first",
     refs=[FR("head-on-mouth-blue", 440, "สายฟ้าสีฟ้าจากปากบอส = AoE ชั้นล่าง ขึ้นไปชั้นบน", "Blue lightning from the mouth = low AoE; go up"),
           FR("head-on-head-orange", 444, "ไฟหน้าบอสเรืองสีส้มแดง = AoE ชั้นบน ลงมาชั้นล่าง", "The headlight glows orange-red = high AoE; go down")])

MP = "Psychokinesis"
step(P4, MP, "① แยกซ้ายขวา ล่อ Third Rail ที่ขอบ", "① Split left and right, bait Third Rail at the edges",
     "ตู้นี้เต็มไปด้วยบล็อก บล็อกบางส่วนจะหายไปเป็นช่อง (ช่องสีเทาในภาพ)\n"
     "ตาม macro: ทิ้ง AoE ที่ขอบนอกตามจุด spread แล้วกลางปลอดภัย\n\n"
     "① แยกไปซ้ายขวาตามสบาย คนที่ไม่มีมาร์ก AoE วงกลมก็ไปขอบซ้ายขวาด้วย เพื่อล่อ Third Rail",
     "This car is full of blocks; some of them drop away and leave hollows (the grey cells in the picture)\n"
     "By the macro: drop the AoEs at the outer edge by spread spot, then the middle is safe\n\n"
     "① Split loosely left and right; players without a circle marker go to the left / right edges too, to bait Third Rail",
     strict=False, pic=38, scene=S.ps1(),
     refs=[FR("psychokinesis-tiles", 600, "Psychokinesis: ตู้ที่มีบล็อกเต็ม บล็อกหายไปเป็นช่องให้ใช้ spread",
              "Psychokinesis: a car full of blocks; they drop away into hollows to spread in")])
step(P4, MP, "② เสียง \"ปัง\" แล้วเข้ากลาง", "② On the \"bang\", into the middle",
     "② เสียง \"ปัง\" แล้วเข้ากลางสนาม หลบ Third Rail",
     "② On the \"bang\", move into the middle out of Third Rail",
     strict=False, pic=39, scene=S.ps2())
step(P4, MP, "③ มาร์ก AoE วงกลม 3 คน", "③ Circle markers on 3",
     "③ มาร์ก AoE วงกลม 3 คน: spread โดยใช้ช่องที่เกิดใหม่ด้วย",
     "③ Circle markers on 3 players: spread, using the new hollows too",
     strict=False, pic=40, scene=S.ps3())
step(P4, MP, "④ tankbuster ใส่ Tank 2 คน", "④ Tankbusters on both tanks",
     "④ tankbuster ใส่ Tank 2 คน",
     "④ Tankbusters on both tanks",
     strict=["MT", "ST"], pic=41, scene=S.ps4())
step(P4, MP, "⑤ มาร์ก AoE วงกลม 5 คน", "⑤ Circle markers on 5",
     "⑤ มาร์ก AoE วงกลม 5 คน: spread โดยใช้ช่องที่เกิดขึ้น\nแล้วระวัง Third Rail ที่ตามมา",
     "⑤ Circle markers on 5 players: spread using the hollows\nThen watch for the Third Rail that follows",
     strict=False, pic=42, scene=S.ps5())
step(P4, MP, "⑥ เสียง \"ปัง\" แล้วหลบ Third Rail", "⑥ On the \"bang\", dodge Third Rail",
     "⑥ เสียง \"ปัง\" แล้วหลบ Third Rail",
     "⑥ On the \"bang\", dodge Third Rail",
     strict=False, pic=43, scene=S.ps6())
step(P4, MP, "⑦ tower: ST ใช้ invuln รับคนเดียว", "⑦ The tower: ST invulns alone",
     "⑦ tower + stack ต่อเนื่องกลางสนาม ST ใช้ invuln รับคนเดียว\n"
     "ตอนนี้ดูเส้นทางไปท้ายสนามไว้ก่อน",
     "⑦ The tower + repeated stacks in the middle; ST takes it alone with an invuln\n"
     "Meanwhile check the route to the rear",
     strict=["ST"], pic=44, scene=S.ps7(),
     says={"ST": "ใช้ invuln รับ tower คนเดียว"}, says_en={"ST": "Invuln and take the tower alone"})
step(P4, MP, "⑧ ไป warp ท้ายสนาม", "⑧ To the warp at the rear",
     "⑧ ไป warp ท้ายสนาม: เดินผิดเส้นทางจะตาย",
     "⑧ Head for the warp at the rear: take the wrong route and you die",
     strict=False, pic=45, scene=S.ps8())

# ------------------------------------------------------------------ last part
MO = "Dead Man's Overdraught + Turret Crossing"
step(P5, MO, "① จำ Overdraught: stack คู่ หรือ spread", "① Remember Overdraught: pairs or spread",
     "① จำ Dead Man's Overdraught ไว้ว่า stack คู่ หรือ spread",
     "① Remember whether Dead Man's Overdraught is pairs or spread",
     strict=False, pic=46, scene=S.t2a())
step(P5, MO, "② หลบแนวยิงป้อมปืนด้วยกำแพง", "② Dodge the turrets behind the walls",
     "② หลบ AoE แนวตรงของป้อมปืนซ้ายขวาโดยใช้กำแพง\n"
     "ป้อมปืนซ้ายล่าง (สีฟ้าในภาพ) ยิงที่สูง",
     "② Dodge the left and right turrets' line AoEs using the walls\n"
     "The lower-left turrets (blue in the picture) fire at the high place",
     strict=False, pic=47, scene=S.t2b())
step(P5, MO, "③ Head-on Emission: ใช้เครื่องเทเลพอร์ต", "③ Head-on Emission: use the teleporter",
     "③ Head-on Emission: AoE ชั้นบน / ชั้นล่าง 2 ครั้ง ใช้เครื่องเทเลพอร์ตหลบ",
     "③ Head-on Emission: high / low AoE twice; dodge with the teleporter",
     strict=False, pic=48, scene=S.t2c())
step(P5, MO, "④ ป้อมปืนรอบ 2: กำแพงขวาบนหายไป", "④ The turrets' 2nd round: the top-right wall is gone",
     "④ ป้อมปืนยิงรอบที่ 2\nระวัง: กำแพงขวาบนถูกเก็บไปแล้ว",
     "④ The turrets fire a 2nd time\nCareful: the top-right wall has been taken away",
     strict=False, pic=49, scene=S.t2d())
step(P5, MO, "⑤ AoE วงกลม 4 คน: เลี่ยงแถวเครื่องเทเลพอร์ต", "⑤ Circle AoEs on 4: avoid the teleporter",
     "⑤ AoE วงกลมที่ 4 คนแบบสุ่ม: spread โดยเลี่ยงแถวเครื่องเทเลพอร์ตจะดี",
     "⑤ Circle AoEs on 4 random players: best to spread away from the teleporter",
     strict=False, pic=50, scene=S.t2e())
step(P5, MO, "⑥ เสียง \"ปัง\" แล้วหลบ Third Rail", "⑥ On the \"bang\", dodge Third Rail",
     "⑥ เสียง \"ปัง\" แล้วหลบ Third Rail\nถ้าตอน ⑤ เลี่ยงแถวเครื่องเทเลพอร์ตแล้ว กลางสนามจะปลอดภัย",
     "⑥ On the \"bang\", dodge Third Rail\nIf ⑤ avoided the teleporter, the middle is safe",
     strict=False, pic=51, scene=S.t2f())
step(P5, MO, "⑦ ป้อมปืนรอบ 3 + แนวตรงจาก portal หน้าขบวน", "⑦ The turrets' 3rd round + the front portals' lines",
     "⑦ ป้อมปืนยิงรอบที่ 3 + ไปจุดปลอดภัยของ AoE แนวตรงจาก portal หน้าขบวน\n"
     "ในภาพ: ↑ = ชั้นบน / ↓ = ชั้นล่าง",
     "⑦ The turrets' 3rd round + go to the safe spot from the front portals' line AoEs\n"
     "In the picture: ↑ = high / ↓ = low",
     strict=False, pic=52, scene=S.t2g())
step(P5, MO, "⑧ Express knockback + แนวตรงจาก portal", "⑧ Express knockback + the portals' lines",
     "⑧ Dead Man's Express knockback + AoE แนวตรงจาก portal หน้าขบวน",
     "⑧ Dead Man's Express knockback + line AoEs from the front portals",
     strict=False, pic=53, scene=S.t2h())
step(P5, MO, "⑨ ค่อยทำ Overdraught ที่จำไว้ (ภาพ: stack คู่)", "⑨ Now the Overdraught from ① (picture: pairs)",
     "⑨ ตอนนี้ค่อยทำ Dead Man's Overdraught ที่จำไว้ตั้งแต่ ①\nภาพนี้: stack คู่",
     "⑨ Only now does the Dead Man's Overdraught from ① resolve\nThis picture: pair stacks",
     strict=True, pic=54, scene=S.t2i(), says=PAIR_SAYS, says_en=PAIR_SAYS_EN)
step(P5, MO, "⑩ tankbuster ใส่ Tank 2 คน", "⑩ Tankbusters on both tanks",
     "⑩ tankbuster ใส่ Tank 2 คน",
     "⑩ Tankbusters on both tanks",
     strict=["MT", "ST"], pic=55, scene=S.busters2())

MO2 = "Dead Man's Overdraught + Arcane Revelation"
step(P5, MO2, "① จำ Overdraught: stack คู่ หรือ spread", "① Remember Overdraught: pairs or spread",
     "① จำ Dead Man's Overdraught ไว้ว่า stack คู่ หรือ spread",
     "① Remember whether Dead Man's Overdraught is pairs or spread",
     strict=False, pic=56, scene=S.oa1())
step(P5, MO2, "② Arcane Revelation 2:6 อีกครั้ง (2 ครั้ง)", "② Arcane Revelation 2:6 again (twice)",
     "② Arcane Revelation: รับด้วย mitigate แบบเดียวกับครั้งก่อน\n"
     "Tank 2 คน ซ้ายบน / อีก 6 คน ขวาบน\n"
     "ครั้งนี้มาแค่ 2 ครั้ง",
     "② Arcane Revelation: take it with mitigation as before\n"
     "The 2 tanks top left / the other six top right\n"
     "This time it comes only twice",
     strict=True, pic=57, scene=S.oa2(),
     says={k: v.split(" · ")[0] for k, v in ARC_SAYS.items()}, says_en={k: v.split(" · ")[0] for k, v in ARC_SAYS_EN.items()})
step(P5, MO2, "③ เสียง \"ปัง\" แล้วหลบ Third Rail", "③ On the \"bang\", dodge Third Rail",
     "③ เสียง \"ปัง\" แล้วหลบ Third Rail",
     "③ On the \"bang\", dodge Third Rail",
     strict=False, pic=58, scene=S.oa3())
step(P5, MO2, "④ Windpipe: หลบหลังวัตถุ", "④ Windpipe: behind the object",
     "④ Dead Man's Windpipe ดูด: หลบไปหลังวัตถุ (กล่องสีเหลือง)",
     "④ Dead Man's Windpipe pulls: get behind the object (the yellow box)",
     strict=False, pic=59, scene=S.oa4())
step(P5, MO2, "⑤ Overdraught ระเบิด (ภาพ: spread)", "⑤ Overdraught goes off (picture: spread)",
     "⑤ AoE ของ Dead Man's Overdraught ระเบิด\nภาพนี้: spread",
     "⑤ Dead Man's Overdraught's AoEs go off\nThis picture: spread",
     strict=True, pic=60, scene=S.oa5(), says=SPREAD_SAYS, says_en=SPREAD_SAYS_EN)
step(P5, MO2, "⑥ Head-on Emission: ใช้เครื่องเทเลพอร์ต", "⑥ Head-on Emission: use the teleporter",
     "⑥ Head-on Emission: AoE ชั้นบน / ชั้นล่าง 2 ครั้ง ใช้เครื่องเทเลพอร์ตหลบ",
     "⑥ Head-on Emission: high / low AoE twice; dodge with the teleporter",
     strict=False, pic=61, scene=S.oa6())
step(P5, MO2, "⑦ tankbuster ใส่ Tank 2 คน", "⑦ Tankbusters on both tanks",
     "⑦ tankbuster ใส่ Tank 2 คน",
     "⑦ Tankbusters on both tanks",
     strict=["MT", "ST"], pic=62, scene=S.busters2())
step(P5, MO2, "⑧ เสียง \"ปัง\" แล้วหลบ Third Rail", "⑧ On the \"bang\", dodge Third Rail",
     "⑧ เสียง \"ปัง\" แล้วหลบ Third Rail",
     "⑧ On the \"bang\", dodge Third Rail",
     strict=False, pic=63, scene=S.oa8())
step(P5, MO2, "⑨ tower + stack ต่อเนื่อง", "⑨ The tower + repeated stacks",
     "⑨ tower + stack ต่อเนื่อง\nแล้วหมดเวลา (enrage)",
     "⑨ The tower + repeated stacks\nThen time runs out (enrage)",
     strict=False, pic=64, scene=S.oa9())

# ------------------------------------------------------------------ overview
NOTE = ("แผนตาม game8 (แผนและ macro ของ Nukemaru) Arcane Revelation ใช้แบบ 2:6 รับด้วย mitigate\n"
        "ภาพของ game8 ไม่มี Marker: หัวขบวน (บอส) = เหนือ (ดูขั้นแรก)\n\n"
        "spread จากหน้าไปหลัง: MT ST / D1 D2 / H1 H2 / D3 D4\n"
        "คู่ stack: MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
        "Runaway Train (รถไฟวงในหยุดตรงไหน = เหนือ):\n"
        "spread: MT H1 ST / D1 ★ D2 / H2 / D3 D4\n"
        "หวูด 2 ครั้ง = stack 3:3: H1 D1 D2 / H2 D3 D4\n\n"
        "Arcane Revelation 2:6: Tank ซ้ายบน / อีก 6 คน ขวาบน\n"
        "mitigate: กลุ่ม MT > กลุ่ม ST > Tank LB\n"
        "กลุ่ม MT: MT H1 D1 D3 / กลุ่ม ST: ST H2 D2 D4\n\n"
        "tower: ครั้งที่ 2 MT invuln / ครั้งที่ 3 ST invuln\n"
        "Psychokinesis: ทิ้ง AoE ที่ขอบนอกตามจุด spread แล้วกลางปลอดภัย")
NOTE_EN = ("Plan follows game8 (Nukemaru's strat and macro), with Arcane Revelation taken 2:6 under mitigation\n"
           "game8's pictures have no waymarks: the front of the train (the boss) = north (see the first step)\n\n"
           "Spread, front to back: MT ST / D1 D2 / H1 H2 / D3 D4\n"
           "Stack pairs: MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
           "Runaway Train (where the inner train stops = north):\n"
           "Spread: MT H1 ST / D1 ★ D2 / H2 / D3 D4\n"
           "2 whistles = 3:3 stacks: H1 D1 D2 / H2 D3 D4\n\n"
           "Arcane Revelation 2:6: tanks top left / the other six top right\n"
           "Mitigation: MT group > ST group > tank LB\n"
           "MT group: MT H1 D1 D3 / ST group: ST H2 D2 D4\n\n"
           "Towers: 2nd MT invuln / 3rd ST invuln\n"
           "Psychokinesis: drop the AoEs at the outer edge by spread spot, then the middle is safe")

WEAP = [("Runaway Shamshir", "PLD", "030000/030701"), ("Runaway Shield", "PLD", "030000/030290"),
        ("Runaway Knuckles", "MNK", "030000/030865"), ("Runaway War Axe", "WAR", "031000/031275"),
        ("Runaway Spear", "DRG", "031000/031677"), ("Runaway Bow", "BRD", "032000/032065"),
        ("Runaway Staff", "WHM", "032000/032496"), ("Runaway Rod", "BLM", "032000/032911"),
        ("Book of the Doomed", "SMN", "037000/037852"), ("Word of the Rail", "SCH", "037000/037853"),
        ("Runaway Cleavers", "NIN", "033000/033651"), ("Runaway Guillotine", "DRK", "034000/034030"),
        ("Runaway Handgonne", "MCH", "034000/034524"), ("Runaway Star Globe", "AST", "034000/034723"),
        ("Runaway Blade", "SAM", "036000/036579"), ("Runaway Foil", "RDM", "036000/036878"),
        ("Runaway Gunblade", "GNB", "036000/036121"), ("Runaway Chakrams", "DNC", "036000/036320"),
        ("Runaway War Scythe", "RPR", "037000/037291"), ("Runaway Wings", "SGE", "037000/037087"),
        ("Runaway Twinfangs", "VPR", "037000/037454"), ("Runaway Flat Brush", "PCT", "037000/037664")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAP]

fight = {
    "guide": {
        "slug": "ex6-doomtrain", "short": "EX6", "name": "Doomtrain · Hell on Rails (Extreme)",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.4",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/750586",
        "content_key": "ex:Doomtrain",
        "note": NOTE, "en": {"note": NOTE_EN},
        "req": {
            "level": 100, "ilvl": 760, "party": 8, "minutes": 60,
            "unlock": ("คุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                       "Extreme ของ Dawntrail (7.x) ปลดล็อกที่ NPC คนนี้ทั้งหมด"),
            "unlock_en": ("Talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                          "Every Dawntrail (7.x) Extreme is unlocked from this NPC"),
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"], "macro_ja": macros["ja"],
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/doomtrain/",
    },
    "defaults": {
        "frame": [4, 3], "bg": "#5f6166", "waymarks": {},
        "iconSize": 7.6, "markSize": 6, "bossSize": 9, "ring": 6.5,
    },
    "steps": steps,
    "rewards": [
        {"kind": "token", "name": "Runaway Totem", "icon_src": ICON("ui/icon/026000/026684_hr1.tex"),
         "say": ("ได้ 2 ชิ้นทุกครั้งที่เคลียร์ (การันตี)\n\n"
                 "แลกที่ Uah'shepya ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "อาวุธ IL775: 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "Wings of Mist: 99 ชิ้น"),
         "say_en": ("Every clear gives 2 (guaranteed).\n\n"
                    "Exchange them with Uah'shepya in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL775 weapon: 10 per weapon\n"
                    "Wings of Mist: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
                   "say": "จุดแลก: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "weapon", "name": "Runaway weapons", "ilvl": 775, "icon_src": ICON("ui/icon/030000/030701_hr1.tex"),
         "say": ("แลกด้วย Runaway Totem 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "PLD ได้ Runaway Shamshir กับ Runaway Shield คู่กันในการแลกครั้งเดียว\n"
                 "มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ"),
         "say_en": ("10 Runaway Totems per weapon\n"
                    "PLD gets the Runaway Shamshir and the Runaway Shield together in one exchange\n"
                    "One for every job; tap an icon for the weapon's name"),
         "pieces": pieces},
        {"kind": "mount", "name": "Wings of Mist", "icon_src": ICON("ui/icon/004000/004339_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก\nหรือแลกด้วย Runaway Totem 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate\nor 99 Runaway Totems",
         "pics": [{"src": ICON("ui/icon/068000/068339_hr1.tex"),
                   "say": "หน้าตา Wings of Mist (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of Mist, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs,",
      sum(1 for s in steps for r in s.get("refs", []) if r.get("by")), "from video,",
      len(dict.fromkeys(s["mech"] for s in steps)), "mechs,", len(dict.fromkeys(s["phase"] for s in steps)), "phases")
