"""Builds scripts/guides/data/arkveld.json (Guardian Arkveld EX, game8's plan: Nukemaru's strat and macro)."""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ark"
sys.path.insert(0, HERE + "/tools")
import scenes as S
import cheat as CS

DATA = r"scripts/guides/data"
OUT = DATA + "/arkveld.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k of dl/img (01.webp = 1)
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "nmdYU_3REik"
missing = []


def FR(name, t, say, say_en):
    src = f"frames/arkveld/{name}.webp"
    if not os.path.exists(os.path.join(DATA, src)):
        missing.append(name)
    return (src, say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    refs = [r for r in (refs or []) if r[1] is not None and os.path.exists(os.path.join(DATA, r[0]))]
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = 5.5
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
P1 = ("ช่วงแรก", "First half")
P2 = ("ช่วงหลัง", "Second half")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker 4 ทิศ", "4-direction waymarks",
     "game8: วาง Marker ให้รู้ทิศ ตะวันออก ตะวันตก เหนือ ใต้ ก็พอ\n"
     "A เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\n\n"
     "ใช้บอกทิศตลอดไฟต์ และเป็นจุดยืนของหมายเลขใน Clamorous Chase (ช่วงหลัง)",
     "game8: waymarks that show north, south, east and west are enough\n"
     "A north\nB east\nC south\nD west\n\n"
     "Used to call directions for the whole fight, and as the number spots in Clamorous Chase (second half)",
     strict=False, pic=2, scene=S.waymarks())

step(P0, "Mega Potion", "Mega Potion ใช้ได้ 10 ครั้ง", "Mega Potion, 10 uses",
     "ไฟต์นี้มี Mega Potion ให้ใช้ 10 ครั้ง: ฟื้น HP เต็มหลอดทันที\n"
     "ใช้เมื่อ HP ลดมากจากการพลาด / ตอน Healer ตาย / หลังเพิ่งถูกชุบ\n\n"
     "หลังใช้จะค้างเล็กน้อย GCD ต่อไม่ทัน แต่ยังเดินได้\n"
     "ถ้าใกล้ตายให้ใช้ไว้ก่อน ปลอดภัยที่สุด",
     "This fight gives you a Mega Potion with 10 uses: it restores all your HP at once\n"
     "Use it when a mistake takes a lot of HP / when a healer is down / right after a raise\n\n"
     "Using it locks you briefly and delays your GCD, but you can still move\n"
     "If you are about to die, use it: that is the safe choice")

# ------------------------------------------------------------------ first half
step(P1, "Chainblade Blow", "ฟันครึ่งสนาม 2 ครั้ง ซ้าย-ขวา", "Two half-room cleaves, side to side",
     "มีใน Normal ด้วย\n"
     "บอสยกใบมีดโซ่ขึ้น แล้วฟาด AoE ครึ่งสนามขนาดใหญ่ลงฝั่งนั้น\n"
     "มา 2 ครั้ง: ซ้าย > ขวา หรือ ขวา > ซ้าย ครั้งที่ 2 ตามมาทันทีหลังครั้งแรก\n"
     "หลบครั้งแรกแล้วไปจุดปลอดภัยของครั้งที่ 2 ทันที\n\n"
     "จุดปลอดภัย: ฝั่งตรงข้ามกับมือที่ยก และอยู่นอก target circle ของบอส",
     "Also in the normal mode\n"
     "The boss raises its chainblade and slams a huge half-room AoE on that side\n"
     "It comes twice: left > right or right > left, the 2nd right after the 1st\n"
     "Dodge the 1st, then go straight to the 2nd's safe side\n\n"
     "Safe spot: the side opposite the raised arm, outside the boss's target circle",
     refs=[FR("chainblade-blow", 40, "บอสยกใบมีดโซ่ข้างหนึ่งขึ้น (ในวงกลม) แล้วฟาด AoE ครึ่งสนามลงฝั่งนั้น", "The boss raises one chainblade (circled), then slams a half-room AoE on that side")])

SIEGE = ("บอสพุ่งข้ามสนาม แล้วเกิด AoE ตามสีของรอยแยกที่เห็นก่อนบอสพุ่ง\n"
         "ดูสีรอยแยกก่อนพุ่ง เพื่อรู้จุดปลอดภัยหลังพุ่ง\n"
         "พร้อมกันมี stack 4:4\n\n")
SIEGE_EN = ("The boss dashes across the arena, then an AoE goes off by the colour of the crack shown before the dash\n"
            "Read the crack's colour before the dash to know the safe spot after it\n"
            "4:4 stacks come at the same time\n\n")
GROUPS = ("กลุ่ม MT: MT H1 D1 D2 ฝั่งบอสหลังพุ่ง (เหนือ)\n"
          "กลุ่ม ST: ST H2 D3 D4 ด้านหลัง (ใต้)")
GROUPS_EN = ("MT group: MT H1 D1 D2 on the boss's side after the dash (north)\n"
             "ST group: ST H2 D3 D4 behind (south)")
step(P1, "Guardian Siegeflight / Wyvern's Siegeflight", "สีขาว: AoE แนวกลางสนาม", "White: a line AoE down the middle",
     SIEGE + "สีขาว (Guardian Siegeflight): AoE แนวตรงกลางสนาม ยืนนอกแนว\n\n" + GROUPS,
     SIEGE_EN + "White (Guardian Siegeflight): a line AoE down the middle; stand outside it\n\n" + GROUPS_EN,
     strict=True, pic=4, scene=S.dash_white(),
     refs=[FR("siegeflight-white", 117, "รอยแยกสีขาว (ในวงกลม) = Guardian Siegeflight: แนวกลางโดน AoE ยืนนอกแนว", "A white crack (circled) = Guardian Siegeflight: the middle line is hit; stand outside it")])

step(P1, "Guardian Siegeflight / Wyvern's Siegeflight", "สีแดง: AoE 2 แนวนอก กลางปลอดภัย", "Red: two outer AoEs, the middle is safe",
     "สีแดง (Wyvern's Siegeflight): AoE 2 แนวด้านนอก ตรงกลางปลอดภัย\n"
     "ทั้ง 2 กลุ่มยืนในแนวกลาง\n\n" + GROUPS,
     "Red (Wyvern's Siegeflight): two AoEs along the outside; the middle is safe\n"
     "Both groups stand in the middle line\n\n" + GROUPS_EN,
     strict=True, pic=5, scene=S.dash_red())

step(P1, "Guardian Siegeflight / Wyvern's Siegeflight", "ตัวอย่างสีขาว ①: ก่อนพุ่ง รอทางซ้ายของบอส", "White example ①: before the dash, wait on the boss's left",
     "ตัวอย่างการหลบตอนสีขาว\n"
     "① บอสเตรียมพุ่ง: มองไปที่บอส แล้วไปรอทางซ้ายมือ\n"
     "ในภาพบอสอยู่ใต้ ทุกคนรอฝั่งตะวันออกของแนวพุ่ง\n"
     "กลุ่ม MT อยู่ฝั่งใกล้บอส / กลุ่ม ST อยู่ฝั่งเหนือ",
     "One way to dodge the white dash\n"
     "① The boss gets ready to dash: face the boss and wait on your left\n"
     "In the picture the boss is south, so everyone waits east of the dash line\n"
     "MT group on the boss's side / ST group to the north",
     strict=True, pic=6, scene=S.dash_ex1())

step(P1, "Guardian Siegeflight / Wyvern's Siegeflight", "ตัวอย่างสีขาว ②: บอสพุ่งแล้ว กลุ่ม MT ไปฝั่งบอส", "White example ②: after the dash, the MT group goes to the boss",
     "② บอสพุ่งไปอีกฝั่ง: กลุ่ม MT (MT H1 D1 D2) ไปฝั่งบอส\n"
     "กลุ่ม ST (ST H2 D3 D4) อยู่ด้านหลัง\n"
     "แล้วรับ stack 4:4\n\n"
     "คำแนะนำจาก game8:\n"
     "ST อยู่กลุ่มหลัง แต่ stack นี้ 3 คนก็รับไหว ST จะไปรวมกลุ่มหน้าก็ได้\n"
     "ถ้าจะทำแบบนั้น ตกลงกับปาร์ตี้ก่อน",
     "② The boss dashes to the far side: the MT group (MT H1 D1 D2) goes to the boss's side\n"
     "The ST group (ST H2 D3 D4) stays behind\n"
     "Then take the 4:4 stacks\n\n"
     "game8's tip:\n"
     "ST belongs to the back group, but 3 players can take that stack, so ST may join the front group\n"
     "If you do, agree on it with the party first",
     strict=True, pic=7, scene=S.dash_ex2(),
     says={"ST": "อยู่กลุ่มหลัง (ไปกลุ่มหน้าได้ ถ้าตกลงกับปาร์ตี้ไว้ก่อน)"},
     says_en={"ST": "Back group (or the front group, if the party agreed on it first)"})

step(P1, "Wyvern's Rattle", "หลังพุ่ง: AoE วงกลม 2 ครั้ง + AoE แนวตรงเคลื่อนที่", "After the dash: two circle AoEs + a moving line AoE",
     "หลังบอสพุ่งเสร็จ: AoE วงกลมเกิดที่เท้าทุกคน 2 ครั้ง\n"
     "พร้อมกัน AoE แนวตรงเคลื่อนที่มาจากฝั่งบอส\n"
     "วาง AoE วงกลมของตัวเองไปพร้อมกับหลบ AoE แนวตรง",
     "After the dash: circle AoEs under every player, twice\n"
     "At the same time, a line AoE moves in from the boss's side\n"
     "Drop your circles while dodging the line",
     refs=[FR("wyverns-rattle", 98, "AoE แนวตรงเคลื่อนที่มาจากฝั่งบอส กับ AoE วงกลมใต้เท้าทุกคน (ในวงกลม)", "A line AoE moving in from the boss's side, and circle AoEs under every player (circled)")])

step(P1, "Rush + Wyvern's Radiance", "พุ่ง 3 จุด + AoE วงกลมกับ donut", "Three dashes + circle and donut AoEs",
     "บอสพุ่งไป 3 จุด แต่ละจุดเกิด AoE วงกลม แล้วขยายเป็น donut\n\n"
     "วิธีหลบ: รออยู่ที่ AoE ของจุดที่ 3\n"
     "พอบอสพุ่งไปจุดที่ 3 แล้ว วิ่งเข้าจุดนั้น ไปยืนแถวเท้าบอส",
     "The boss dashes to 3 spots; each spot goes off as a circle AoE, then spreads out as a donut\n\n"
     "To dodge: wait at the 3rd spot's AoE\n"
     "Once the boss has dashed to the 3rd spot, run into it and stand near the boss's feet",
     refs=[FR("rush-radiance", 143, "เส้นพุ่งสีแดงกับวงกลมของจุดที่บอสจะพุ่งไป (ในวงกลม)", "The red dash path and the circle where the boss will land (circled)")])

step(P1, "Wyvern's Ouroblade", "ฟันครึ่งสนาม: ฝั่งหางปลอดภัย", "Half-room cleave: the tail side is safe",
     "AoE ครึ่งสนาม ดูจากท่าบอสยาก\n"
     "ฝั่งหางของบอสปลอดภัย: ใช้หางเป็นจุดสังเกตแล้ววิ่งไป\n"
     "คนที่เข้าฝั่งปลอดภัยได้ก่อน ให้ขยับลึกเข้าไป ทุกคนจะได้เข้ามาทัน\n\n"
     "ท่านี้ฟันครึ่งขวาหรือครึ่งซ้ายของ target circle: ดูครึ่งของ target circle ฝั่งหางด้วย",
     "A half-room AoE that is hard to read from the boss's pose\n"
     "The boss's tail side is safe: use the tail as your landmark\n"
     "Whoever reaches the safe side first, move in deep so everyone fits\n\n"
     "It hits the right or left half of the target circle: watch the tail side's half of the target circle too",
     refs=[FR("ouroblade-tail", 169, "หางของบอส (ในวงกลม) อยู่ฝั่งที่ปลอดภัย", "The boss's tail (circled) is on the safe side")])

step(P1, "Steeltail Thrust", "ยกหาง: โจมตีด้วยหาง", "Raised tail: a tail attack",
     "เมื่อบอสยกหางขึ้น จะโจมตีด้วยหาง\n"
     "อย่ายืนใกล้หาง",
     "When the boss raises its tail, a tail attack follows\n"
     "Stay away from the tail",
     refs=[FR("steeltail-thrust", 191, "บอสยกหางขึ้น (ในวงกลม) แล้วหางจะโจมตี", "The boss raises its tail (circled); a tail attack follows")])

step(P1, "Chainblade Charge + Chainblade Blow", "stack หน้าบอส แล้วฟันครึ่งสนาม 2 ครั้ง", "Stack in front, then two half-room cleaves",
     "stack: ทุกคนรวมกันหน้าบอส รับ stack\n"
     "จากนั้น Chainblade Blow แบบเดียวกับตอนต้นไฟต์: หลบ 2 ครั้ง",
     "A stack: everyone gathers in front of the boss and takes it together\n"
     "Then Chainblade Blow as at the start of the fight: dodge both",
     refs=[FR("chainblade-charge", 201, "มาร์ก stack หน้าบอส (ในวงกลม): ทุกคนรวมกันรับ", "The stack marker in front of the boss (circled): everyone takes it together")])

TW_RULE = ("Tower ใหญ่ 2 อัน (สีชมพู) สำหรับ Tank / tower เล็ก 4 อัน (สีส้ม) สำหรับคนอื่น\n"
           "MT: tower ใหญ่ที่เกิดทางเหนือหรือตะวันตก\n"
           "ST: tower ใหญ่ที่เกิดทางใต้หรือตะวันออก\n"
           "คนอื่น: เหยียบ tower เล็กตามจุด spread พื้นฐาน ยึดทิศแผนที่\n"
           "macro: DPS เข้า tower ที่จุด spread พื้นฐาน หรือถัดไปตามเข็ม / Healer ช่วยเติม tower ที่ขาด\n\n"
           "ก่อนเข้า tower: AoE วงกลมเกิดที่เท้าทุกคน 3 ครั้ง วางตามลำดับในขั้นถัดไป\n\n")
TW_RULE_EN = ("2 big towers (pink) for the tanks / 4 small towers (orange) for everyone else\n"
              "MT: the big tower that spawns north or west\n"
              "ST: the big tower that spawns south or east\n"
              "Everyone else: small towers by the basic spread spots, true north\n"
              "Macro: DPS take the tower at their basic spread spot or the next one clockwise / healers back them up\n\n"
              "Before the towers: circle AoEs under every player, 3 times; drop them in the order of the next steps\n\n")
step(P1, "Aetheric Resonance", "Tower แบบที่ 1: tower ใหญ่ ตะวันตก / ตะวันออก", "Towers, layout 1: big towers west / east",
     TW_RULE + "แบบที่ 1 (ภาพนี้): tower ใหญ่อยู่ตะวันตก กับ ตะวันออก\nMT ตะวันตก / ST ตะวันออก",
     TW_RULE_EN + "Layout 1 (this picture): the big towers are west and east\nMT west / ST east",
     strict=False, pic=9, scene=S.tw_pattern(S.T1),
     refs=[FR("towers-spawn", 227, "tower ลายแดงดำ = tower ใหญ่ของ Tank / วงส้ม = tower เล็ก (ในวงกลม)", "Red-and-black stripes = a big tank tower / orange ring = a small tower (circled)")])

step(P1, "Aetheric Resonance", "Tower แบบที่ 2: tower ใหญ่ เหนือ / ใต้", "Towers, layout 2: big towers north / south",
     "แบบที่ 2: tower ใหญ่อยู่เหนือ กับ ใต้\nMT เหนือ / ST ใต้\n\nภาพในขั้นต่อไปเป็นแบบที่ 2",
     "Layout 2: the big towers are north and south\nMT north / ST south\n\nThe next pictures show layout 2",
     strict=False, pic=10, scene=S.tw_pattern(S.T2))

MELEE = ("กลุ่ม Tank + Melee (MT ST D1 D2) วาง AoE: กลาง > นอก > กลาง > เข้า tower\n")
MELEE_EN = ("Tanks + melee (MT ST D1 D2) drop their AoEs: middle > out > middle > into the towers\n")
RANGED = ("กลุ่ม Range (D3 D4 H1 H2) วาง AoE: กลาง > นอก > ขอบนอกสุด > tower\n")
RANGED_EN = ("Ranged group (D3 D4 H1 H2) drop their AoEs: middle > out > the very edge > towers\n")
step(P1, "Aetheric Resonance", "Tank + Melee ①: วาง AoE กลางสนาม", "Tanks + melee ①: drop in the middle",
     MELEE + "\n① วางครั้งแรกที่กลางสนาม",
     MELEE_EN + "\n① Drop the 1st set in the middle",
     strict=True, pic=11, scene=S.tw_melee1())
step(P1, "Aetheric Resonance", "Tank + Melee ②: วาง AoE ด้านนอก", "Tanks + melee ②: drop outside",
     MELEE + "\n② ออกไปวางด้านนอก\nMT ตะวันตกเฉียงเหนือ / ST ตะวันออกเฉียงเหนือ / D2 ตะวันตกเฉียงใต้ / D1 ตะวันออกเฉียงใต้ (ตามภาพ)",
     MELEE_EN + "\n② Drop the 2nd set outside\nMT north-west / ST north-east / D2 south-west / D1 south-east (as pictured)",
     strict=True, pic=12, scene=S.tw_melee2())
step(P1, "Aetheric Resonance", "Tank + Melee ③: กลับมาวางกลางสนาม", "Tanks + melee ③: the middle again",
     MELEE + "\n③ กลับมาวางที่กลางสนามอีกครั้ง (เหมือนภาพ ①)",
     MELEE_EN + "\n③ Drop the 3rd set in the middle again (as in picture ①)")
step(P1, "Aetheric Resonance", "Tank + Melee ④: เข้า tower", "Tanks + melee ④: into the towers",
     MELEE + "\n④ สุดท้ายเข้า tower\nภาพนี้คือแบบที่ 2: MT tower ใหญ่เหนือ / ST tower ใหญ่ใต้\n"
     "D1 tower เล็กตะวันตกเฉียงใต้ / D2 tower เล็กตะวันออกเฉียงใต้\n"
     "AoE วงกลมใหญ่ 4 มุมคือของกลุ่ม Range ที่วางขอบนอกสุด",
     MELEE_EN + "\n④ Last, step into the towers\nThis is layout 2: MT the north big tower / ST the south big tower\n"
     "D1 the south-west small tower / D2 the south-east small tower\n"
     "The 4 big circles at the corners are the ranged group's drops at the edge",
     strict=["MT", "ST", "D1", "D2", "D3", "D4"], pic=13, scene=S.tw_final())
step(P1, "Aetheric Resonance", "Range ①: วาง AoE กลางสนาม", "Ranged ①: drop in the middle",
     RANGED + "\n① วางครั้งแรกที่กลางสนาม",
     RANGED_EN + "\n① Drop the 1st set in the middle",
     strict=True, pic=14, scene=S.tw_ranged1())
step(P1, "Aetheric Resonance", "Range ②: วาง AoE ด้านนอก", "Ranged ②: drop outside",
     RANGED + "\n② ออกไปวางด้านนอก\nD3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / H1 ตะวันตกเฉียงใต้ / H2 ตะวันออกเฉียงใต้ (ตามภาพ)",
     RANGED_EN + "\n② Drop the 2nd set outside\nD3 north-west / D4 north-east / H1 south-west / H2 south-east (as pictured)",
     strict=True, pic=15, scene=S.tw_ranged2())
step(P1, "Aetheric Resonance", "Range ③: วาง AoE ขอบนอกสุด", "Ranged ③: drop at the very edge",
     RANGED + "\n③ วางที่ขอบนอกสุดของสนาม",
     RANGED_EN + "\n③ Drop the 3rd set at the very edge of the arena",
     strict=True, pic=16, scene=S.tw_ranged3())
step(P1, "Aetheric Resonance", "Range ④: เข้า tower (Healer เข้าหรือไม่ก็ได้)", "Ranged ④: towers (healers optional)",
     RANGED + "\n④ D3 D4 เข้า tower เล็กของตัวเอง (เหมือนภาพ ④ ของกลุ่ม Tank + Melee: D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออก)\n"
     "Healer ไม่ต้องเข้า tower ก็ได้ แต่จะเข้าก็ได้\n\n"
     "tower เล็กเข้า 2 คนก็ได้\n"
     "ขาด tower เล็กไป 1 อันไม่ wipe: ถ้าพลาดให้ใช้ Mega Potion ฟื้น HP",
     RANGED_EN + "\n④ D3 D4 step into their small towers (as in the tanks + melee picture ④: D3 north-west / D4 east)\n"
     "Healers need not take a tower, but may\n\n"
     "Two players in a small tower is fine\n"
     "Missing one small tower does not wipe the party: if it happens, heal up with a Mega Potion")

step(P1, "Forged Fury", "ท่าไม้ตาย: raid-wide 3 ครั้ง", "The big attack: three raid-wides",
     "ท่าไม้ตายของบอส โจมตี 3 ครั้ง: ตี 2 ครั้งติดกัน แล้วครั้งสุดท้ายแรง\n"
     "ใช้ mitigate และ barrier ให้ครบ\n\n"
     "คำแนะนำจาก game8:\n"
     "ระหว่างตี 2 ครั้งแรก บอสจะไปทางเหนือของสนาม\n"
     "Melee ที่อยากตีต่อเนื่อง ให้ไปรอฝั่งเหนือ",
     "The boss's big attack, 3 hits: 2 in a row, then a heavy last one\n"
     "Use your mitigation and barriers\n\n"
     "game8's tip:\n"
     "During the first 2 hits the boss moves to the north of the arena\n"
     "Melee who want to keep hitting it can wait on the north side",
     refs=[FR("forged-fury", 322, "บอสใช้ Forged Fury (ในวงกลม): ตีทั้งปาร์ตี้ 3 ครั้ง", "The boss uses Forged Fury (circled): 3 party-wide hits")])

# ------------------------------------------------------------------ second half
CC = ("Mechanic ที่ยากที่สุดของไฟต์ (game8)\n"
      "ทุกคนได้หมายเลข 1–8 บอสพุ่งใส่ตามลำดับหมายเลข แล้วฟัน AoE ครึ่งสนาม รวม 8 ครั้ง\n"
      "ดูท่าบอสตอนเริ่ม:\nง้างมือซ้าย = ตามเข็ม\nง้างมือขวา = ทวนเข็ม\n\n")
CC_EN = ("The fight's hardest mechanic (game8)\n"
         "Everyone gets a number, 1–8. The boss dashes at each in order, then cleaves half the room: 8 times in all\n"
         "Read the boss at the start:\nleft hand drawn back = clockwise\nright hand drawn back = anticlockwise\n\n")
step(P2, "Clamorous Chase", "ง้างมือซ้าย: ตามเข็ม 1 ที่ B", "Left hand drawn back: clockwise, 1 at B",
     CC + "ภาพนี้: ง้างมือซ้าย (มือที่ลูกศรฟ้าชี้ขึ้น)\n1 ไป B (ตะวันออก) > 2 ไป C > 3 ไป D > 4 ไป A\nคนอื่นรอกลางสนาม",
     CC_EN + "This picture: left hand drawn back (the hand with the blue up arrow)\n1 to B (east) > 2 to C > 3 to D > 4 to A\nEveryone else waits in the middle",
     strict=False, pic=17, scene=S.cc_start(True))
step(P2, "Clamorous Chase", "ง้างมือขวา: ทวนเข็ม 1 ที่ D", "Right hand drawn back: anticlockwise, 1 at D",
     "ง้างมือขวา (มือที่ลูกศรฟ้าชี้ขึ้น): ทวนเข็ม\n1 ไป D (ตะวันตก) > 2 ไป C > 3 ไป B > 4 ไป A\nคนอื่นรอกลางสนาม\n\n"
     "เลขคู่ไป A กับ C เหมือนกันทั้ง 2 แบบ",
     "Right hand drawn back (the hand with the blue up arrow): anticlockwise\n1 to D (west) > 2 to C > 3 to B > 4 to A\nEveryone else waits in the middle\n\n"
     "Even numbers go to A and C either way",
     strict=False, pic=18, scene=S.cc_start(False))
CC_STEPS = [
    (19, "① 1 ไป B", "① 1 to B",
     "ต่อจากนี้อธิบายด้วยแบบตามเข็ม\n① ได้หมายเลขแล้วไปจุดของตัวเอง: แบบตามเข็ม 1 ไป B\nบอสพุ่งใส่ 1 แล้วฟันครึ่งสนาม: 1 รีบเข้ากลาง",
     "From here on, the clockwise case\n① Go to your spot once you have your number: clockwise, 1 goes to B\nThe boss dashes at 1 and cleaves half the room: 1 moves into the middle at once"),
    (20, "② 2 ที่ C", "② 2 at C",
     "② ต่อด้วยหมายเลข 2 (C)\n1 กลับเข้ากลางได้แล้ว\n5 ไปแทนที่ 1 ที่ B",
     "② Next, number 2 (C)\n1 can go back to the middle now\n5 takes 1's place at B"),
    (21, "③ 3 ที่ D", "③ 3 at D",
     "③ บอสพุ่งใส่หมายเลข 3 (D)\n6 ไปแทนที่ 2 ที่ C",
     "③ The boss dashes at number 3 (D)\n6 takes 2's place at C"),
    (22, "④ 4 ที่ A", "④ 4 at A",
     "④ บอสพุ่งใส่หมายเลข 4 (A)\nเลขคู่ไป A หรือ C เสมอ ไม่ว่าตามเข็มหรือทวนเข็ม\n7 ไปแทนที่ 3 ที่ D",
     "④ The boss dashes at number 4 (A)\nEven numbers always go to A or C, clockwise or not\n7 takes 3's place at D"),
    (23, "⑤ 5 เป็นต้นไป: ทำแบบเดิม", "⑤ 5 onwards: the same",
     "⑤ หมายเลข 5 เป็นต้นไปทำแบบเดิม: ไปยืนจุดของตัวเองแล้วรับการพุ่ง\n1/5 2/6 3/7 4/8 ใช้จุดเดียวกัน: รับแล้วสลับกัน",
     "⑤ From number 5 on, the same: stand on your spot and take the dash\n1/5, 2/6, 3/7, 4/8 share a spot: swap once it has hit"),
]
for k, (pic, nm, nm_en, nt, nt_en) in enumerate(CC_STEPS):
    step(P2, "Clamorous Chase", nm, nm_en, nt, nt_en, strict=False, pic=pic, scene=S.cc_step(k + 1),
         refs=[FR("chase-dash", 410, "บอสพุ่งใส่คนที่ถึงคิวบน waymark (ในวงกลม) แล้วฟันครึ่งสนาม", "The boss dashes at the player whose turn it is, on the waymark (circled), then cleaves half the room")] if k == 0 else None)
step(P2, "Clamorous Chase", "จุดของแต่ละหมายเลข", "Where each number goes",
     "ง้างมือซ้าย = ตามเข็ม\n1/5: B\n3/7: D (ตรงข้ามกับ 1)\nเลขคู่: A กับ C (4/8 ที่ A / 2/6 ที่ C)\n\n"
     "ง้างมือขวา = ทวนเข็ม\n1/5: D\n3/7: B (ตรงข้ามกับ 1)\nเลขคู่: A กับ C (4/8 ที่ A / 2/6 ที่ C)\n\n"
     "คนที่ยังไม่ถึงคิว: รอกลางสนาม (กลางปลอดภัยตลอด) ถึงคิวแล้วค่อยไปจุด\n\n"
     "คำแนะนำจาก game8:\n"
     "รับการพุ่งแล้วรีบเข้ากลางทันที ถ้าอยู่ที่เดิมจะโดน AoE ครึ่งสนามตาย\n"
     "ช่วงนี้ตรงกับ burst 2 นาที แต่เก็บไว้ใช้หลัง Mechanic นี้จะปลอดภัยกว่า",
     "Left hand drawn back = clockwise\n1/5: B\n3/7: D (opposite 1)\nEven: A and C (4/8 at A / 2/6 at C)\n\n"
     "Right hand drawn back = anticlockwise\n1/5: D\n3/7: B (opposite 1)\nEven: A and C (4/8 at A / 2/6 at C)\n\n"
     "Not your turn yet: wait in the middle (the middle is always safe), go to your spot when your turn comes\n\n"
     "game8's tips:\n"
     "Once the dash hits you, move to the middle at once; staying put gets you killed by the cleave\n"
     "Your 2-minute burst lands here, but holding it until after the mechanic is the safe choice")

BEAM = ("หลัง tower จะมี 1 คนได้มาร์กบนหัว บอสยิง beam กวาดไปยังจุดของคนนั้น รวม 3 ครั้ง\n"
        "ล่อ beam: ตะวันออก > ตะวันตก > ตะวันออก\n"
        "ผลึกขาวที่เกิดจาก tower จะระเบิด แต่ถ้ายืนตามภาพจะไม่ค่อยโดน\n\n")
BEAM_EN = ("After the towers, one player gets a marker over their head and the boss sweeps a beam to where they stand, 3 times\n"
           "Bait the beams: east > west > east\n"
           "The white crystals the towers leave explode, but standing as pictured keeps you clear of them\n\n")
step(P2, "Aetheric Resonance + Wyvern's Weal", "① คนได้มาร์กไปตะวันออก ใกล้บอส", "① The marked player goes east, near the boss",
     BEAM + "① คนที่ได้มาร์กไปทางตะวันออก ยืนค่อนไปทางบอส มุม beam จะได้ไม่แคบเกินไป\nคนอื่นรอฝั่งตะวันตก",
     BEAM_EN + "① The marked player goes east, keeping toward the boss so the beam's angle is not too tight\nEveryone else waits west",
     strict=False, pic=26, scene=S.beam1(),
     refs=[FR("beam-marker", 451, "มาร์กบนหัวของคนล่อ beam (ในวงกลม)", "The beam marker over a player's head (circled)"), FR("towers-crystals", 274, "ผลึกขาวที่ tower ทิ้งไว้ (ในวงกลม) ระเบิดเมื่อโดน beam หรือ exaflare", "White crystals the towers leave (circled) explode when a beam or an exaflare reaches them")])
step(P2, "Aetheric Resonance + Wyvern's Weal", "② ล่อแล้ว ไปรอฝั่งตะวันตก", "② Baited: wait west with everyone",
     "② ล่อ beam แล้ว คนที่ได้มาร์กไปรอฝั่งตะวันตกกับทุกคน",
     "② Once the beam is baited, the marked player joins everyone in the west",
     strict=False, pic=27, scene=S.beam2(),
     refs=[FR("beam-sweep", 461, "beam สีแดงกวาดตามคนได้มาร์ก ผลึกขาวที่โดน beam ระเบิด (ในวงกลม)", "The red beam sweeps after the marked player; a crystal it reaches explodes (circled)")])
step(P2, "Aetheric Resonance + Wyvern's Weal", "③ beam ยิง ผลึกระเบิด", "③ The beam fires; the crystals explode",
     "③ beam ยิง ผลึกขาวจาก tower ระเบิด\n"
     "คนที่ได้มาร์กครั้งต่อไป ยืนลึกไปทางตะวันตกให้มากที่สุด เพื่อล่อ beam ครั้งที่ 2",
     "③ The beam fires and the towers' white crystals explode\n"
     "The next marked player stands as far west as they can to bait the 2nd beam",
     strict=False, pic=28, scene=S.beam3())
step(P2, "Aetheric Resonance + Wyvern's Weal", "④ สัญญาณ stack: กลุ่ม MT ฝั่งบอส", "④ Stack markers: MT group by the boss",
     "④ จากนั้นมีสัญญาณ stack\n" + "กลุ่ม MT (MT H1 D1 D2) ฝั่งบอส\nกลุ่ม ST (ST H2 D3 D4) ฝั่งไกลบอส",
     "④ Then the stack markers come\n" + "MT group (MT H1 D1 D2) on the boss's side\nST group (ST H2 D3 D4) on the side away from the boss",
     strict=True, pic=29, scene=S.beam4())
step(P2, "Aetheric Resonance + Wyvern's Weal", "⑤ stack ลง แล้วคนได้มาร์กครั้งที่ 3 ไปฝั่งบอส", "⑤ The stacks go off; the 3rd marked player goes to the boss",
     "⑤ stack ลงหลัง beam ครั้งที่ 2 จบ\n"
     "คนที่ได้มาร์กครั้งที่ 3: หลัง stack ยังมีเวลาเล็กน้อย ไปฝั่งบอสเพื่อล่อ beam",
     "⑤ The stacks go off after the 2nd beam ends\n"
     "The 3rd marked player: there is a little time after the stack; go to the boss's side to bait",
     strict=True, pic=30, scene=S.beam5())
step(P2, "Aetheric Resonance + Wyvern's Weal", "⑥ ทุกคนไปตะวันตก beam ครั้งที่ 3", "⑥ Everyone west; the 3rd beam",
     "⑥ ทุกคนไปฝั่งตะวันตก beam ครั้งที่ 3 ยิง\n"
     "ตอนนี้ทุกคนได้ AoE วงกลม",
     "⑥ Everyone goes west; the 3rd beam fires\n"
     "Now every player gets a circle AoE",
     strict=False, pic=31, scene=S.beam6())
step(P2, "Aetheric Resonance + Wyvern's Weal", "⑦ beam จบ กระจายรับ AoE", "⑦ Beam over: spread for the AoEs",
     "⑦ beam จบแล้ว กระจายตามภาพ รับ AoE แล้วจบ Mechanic นี้",
     "⑦ When the beam ends, spread as pictured and take your AoE; that ends the mechanic",
     strict=True, pic=32, scene=S.beam7(),
     refs=[FR("beam-spread", 503, "หลัง beam ครั้งที่ 3 ทุกคนมี AoE วงกลม: กระจายตามจุด", "After the 3rd beam every player has a circle AoE: spread to your spot")])

step(P2, "Wrathful Rattle", "AoE แนวตั้ง + แนวนอน เคลื่อนที่ไปกลับ", "Moving line AoEs across and down, there and back",
     "AoE แนวตรงเคลื่อนที่มาจากแนวตั้งและแนวนอน ต่อเนื่องไม่หยุด\n"
     "ไปถึงขอบสนามแล้วจะย้อนกลับมาอีก อย่าประมาท\n\n"
     "พร้อมกันบอสใช้ Chainblade Blow: หลบ AoE แนวตรงไปด้วย หลบการฟัน 2 ครั้งไปด้วย",
     "Line AoEs keep coming across and down the arena, one after another\n"
     "They reach the edge and come back, so stay alert\n\n"
     "Meanwhile the boss uses Chainblade Blow: dodge both cleaves while dodging the lines",
     refs=[FR("wrathful-rattle", 517, "AoE แนวตั้งและแนวนอน (ลูกศรบอกทางที่เคลื่อนที่)", "Line AoEs across and down (the arrows show where they travel)")])

step(P2, "Chainblade Charge + Chainblade Blow", "stack แล้ว AoE วงกลมใหญ่ + ฟัน 2 ครั้ง", "Stack, then a big circle AoE + two cleaves",
     "รับ stack แถวหน้าบอส\n"
     "ทันทีหลัง stack มี AoE วงกลมใหญ่เกิดขึ้น: รับ stack แล้วรีบออกให้พ้น\n"
     "จากนั้น Chainblade Blow 2 ครั้งตามมาทันที หลบแบบเดิม",
     "Take the stack around the front of the boss\n"
     "A huge circle AoE appears right after the stack: take it, then get out\n"
     "Then two Chainblade Blows follow at once; dodge them as before",
     refs=[FR("charge-circle", 588, "ขอบ AoE วงกลมใหญ่ที่ตามมาหลัง stack (ลูกศร)", "The edge of the huge circle that follows the stack (arrows)")])

step(P2, "Aetheric Resonance + exaflares", "tower แล้ว exaflare จากตะวันออก", "Towers, then exaflares from the east",
     "หลัง tower มี exaflare (AoE วงกลมเคลื่อนที่) มาจากทางตะวันออก แต่ละแถวเริ่มไม่พร้อมกัน\n"
     "โดยหลัก วิ่งเข้าไปในจุดที่ exaflare เพิ่งระเบิดผ่านไป\n"
     "แต่ผลึกขาวจาก tower ถ้าโดน exaflare จะระเบิดเป็น AoE วงกลม ต้องดูทั้ง 2 อย่าง\n\n"
     "โดน exaflare กับผลึกระเบิดซ้อนกัน 2 ครั้งจะตาย: พยายามอย่าโดน 2 อย่างพร้อมกัน",
     "After the towers, exaflares (moving circle AoEs) come from the east, each row starting at a different time\n"
     "Mostly, step into where an exaflare has just gone off\n"
     "But a tower's white crystal explodes in a circle AoE when an exaflare reaches it, so watch both\n\n"
     "An exaflare and a crystal together will kill you: try never to take both",
     refs=[FR("exaflares", 630, "exaflare ที่ขอบสนาม (วงบน) กับผลึกขาวจาก tower (วงล่าง)", "Exaflares at the arena's edge (upper circle) and a tower's white crystal (lower circle)")])

# ------------------------------------------------------------------ the guide
NOTE = ("แผนตาม game8 (แผนและ macro ของ Nukemaru)\n"
        "Marker 4 ทิศ: A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก (ดูขั้นแรก)\n"
        "มี Mega Potion ให้ใช้ 10 ครั้ง\n\n"
        "stack 4:4 (หลังบอสพุ่ง ยึดตำแหน่งบอส)\n"
        "กลุ่ม MT: MT H1 D1 D2 (ฝั่งบอส)\n"
        "กลุ่ม ST: ST H2 D3 D4 (ฝั่งไกลบอส)\n\n"
        "Tower (ยึดทิศแผนที่)\n"
        "MT: tower ใหญ่ เหนือ / ตะวันตก\n"
        "ST: tower ใหญ่ ใต้ / ตะวันออก\n"
        "จุด spread พื้นฐาน: D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / D1 ตะวันตกเฉียงใต้ / D2 ตะวันออกเฉียงใต้\n"
        "DPS: tower เล็กที่จุด spread พื้นฐาน หรือถัดไปตามเข็ม / Healer ช่วยเติม\n\n"
        "Clamorous Chase\n"
        "ง้างมือซ้าย: ตามเข็ม 1 ไป B / ง้างมือขวา: ทวนเข็ม 1 ไป D\n"
        "2/6 ที่ C / 4/8 ที่ A / 1/5 2/6 3/7 4/8 รับแล้วสลับ\n\n"
        "ล่อ beam: ตะวันออก > ตะวันตก > ตะวันออก")
NOTE_EN = ("Plan follows game8 (Nukemaru's strat and macro)\n"
           "4 waymarks: A north / B east / C south / D west (see the first step)\n"
           "A Mega Potion with 10 uses\n\n"
           "4:4 stacks (after the dash, boss-relative)\n"
           "MT group: MT H1 D1 D2 (boss side)\n"
           "ST group: ST H2 D3 D4 (away from the boss)\n\n"
           "Towers (true north)\n"
           "MT: big tower north / west\n"
           "ST: big tower south / east\n"
           "Basic spread: D3 north-west / D4 north-east / D1 south-west / D2 south-east\n"
           "DPS: the small tower at your basic spread spot or the next one clockwise / healers back up\n\n"
           "Clamorous Chase\n"
           "Left hand drawn back: clockwise, 1 to B / right hand drawn back: anticlockwise, 1 to D\n"
           "2/6 at C / 4/8 at A / 1/5, 2/6, 3/7, 4/8 swap after the hit\n\n"
           "Beam baits: east > west > east")

WEAP = [(47072, "Veldian Sword", "PLD", "030000/030695"), (47093, "Veldian Shield", "PLD", "030000/030284"),
        (47073, "Veldian Knuckles", "MNK", "030000/030859"), (47074, "Veldian Axe", "WAR", "031000/031269"),
        (47075, "Veldian Spear", "DRG", "031000/031671"), (47076, "Veldian Bow", "BRD", "032000/032059"),
        (47077, "Veldian Cane", "WHM", "032000/032490"), (47078, "Veldian Rod", "BLM", "032000/032905"),
        (47079, "Veldian Index", "SMN", "037000/037841"), (47080, "Veldian Codex", "SCH", "037000/037840"),
        (47081, "Veldian Knives", "NIN", "033000/033645"), (47082, "Veldian Guillotine", "DRK", "034000/034024"),
        (47083, "Veldian Culverin", "MCH", "034000/034518"), (47084, "Veldian Star Globe", "AST", "034000/034717"),
        (47085, "Veldian Blade", "SAM", "036000/036573"), (47086, "Veldian Rapier", "RDM", "036000/036872"),
        (47087, "Veldian Bayonet", "GNB", "036000/036115"), (47088, "Veldian Tathlums", "DNC", "036000/036314"),
        (47089, "Veldian Scythe", "RPR", "037000/037285"), (47090, "Veldian Wings", "SGE", "037000/037081"),
        (47091, "Veldian Twinfangs", "VPR", "037000/037448"), (47092, "Veldian Round Brush", "PCT", "037000/037658")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for _, n, j, p in WEAP]

SMITHY = {"map": {"map": "y6t1/00", "size": 180, "x": 13.3, "y": 13.1, "label": "smithy"},
          "say": "จุดแลก: smithy, Tuliyollal (X: 13.3 Y: 13.1) ใกล้ Dawn Hunt tracker",
          "say_en": "Where to exchange: the smithy, Tuliyollal (X: 13.3 Y: 13.1), beside the Dawn Hunt tracker"}

panels = [
    {"title": "พุ่ง + stack 4:4: สีแดง", "title_en": "Dash + 4:4 stacks: red", "strict": True, "scene": CS.p_dash_red(),
     "lines": ["แดง: แนวกลางปลอดภัย", "ยึดบอสหลังพุ่ง: กลุ่ม MT ฝั่งบอส"],
     "lines_en": ["Red: the middle line is safe", "Boss after dash: MT group its side"]},
    {"title": "พุ่ง + stack 4:4: สีขาว", "title_en": "Dash + 4:4 stacks: white", "strict": True, "scene": CS.p_dash_white(),
     "lines": ["ขาว: นอกแนวกลางปลอดภัย", "กลุ่ม MT ฝั่งบอส / กลุ่ม ST หลัง"],
     "lines_en": ["White: outside the middle is safe", "MT group boss side / ST group back"]},
    {"title": "Clamorous Chase: ง้างมือซ้าย", "title_en": "Clamorous Chase: left hand", "strict": False, "scene": CS.p_chase(True),
     "lines": ["เริ่มตะวันออก ตามเข็ม / คนอื่นรอกลาง"],
     "lines_en": ["Start east, clockwise / others: middle"]},
    {"title": "Clamorous Chase: ง้างมือขวา", "title_en": "Clamorous Chase: right hand", "strict": False, "scene": CS.p_chase(False),
     "lines": ["เริ่มตะวันตก ทวนเข็ม / คนอื่นรอกลาง"],
     "lines_en": ["Start west, anticlockwise / rest: middle"]},
    {"title": "Tower: MT ที่ D / ST ที่ B", "title_en": "Towers: MT at D / ST at B", "strict": True, "scene": CS.p_towers(1),
     "lines": ["MT เหนือ (A) หรือ ตะวันตก (D)", "ST ใต้ (C) หรือ ตะวันออก (B)"],
     "lines_en": ["MT north (A) or west (D)", "ST south (C) or east (B)"]},
    {"title": "Tower: MT ที่ A / ST ที่ C", "title_en": "Towers: MT at A / ST at C", "strict": True, "scene": CS.p_towers(2),
     "lines": ["DPS Healer ยึดทิศแผนที่", "spread พื้นฐาน หรือถัดตามเข็ม"],
     "lines_en": ["DPS and healers: true north", "Basic spread, or one clockwise"]},
    {"title": "Beam ครั้งที่ 2 (ครั้งแรกเริ่มตะวันออก)", "title_en": "Beam 2 (when the 1st starts east)", "strict": True, "scene": CS.p_beam2(),
     "lines": ["stack 4:4 กลุ่ม MT ฝั่งบอส"],
     "lines_en": ["4:4 stacks, MT group by the boss"]},
    {"title": "หลัง beam ครั้งที่ 3: กระจาย", "title_en": "After beam 3: spread", "strict": True, "scene": CS.p_beam3(),
     "lines": ["ทุกคนได้ AoE วงกลม"],
     "lines_en": ["Everyone gets a circle AoE"]},
]

fight = {
    "guide": {
        "slug": "arkveld", "short": "Arkveld", "name": "Guardian Arkveld · The Windward Wilds (Extreme)",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.35",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/728013",
        "content_key": "ex:Guardian Arkveld",
        "note": NOTE, "en": {"note": NOTE_EN},
        "req": {
            "level": 100, "ilvl": 740, "party": 8, "minutes": 60,
            "unlock": ("เควส Collab: The White Wanderer รับจาก Dawn Hunt tracker ที่ Tuliyollal (X: 13.4 Y: 13.1)\n"
                       "รับเควสนี้ได้หลังเคลียร์ Main Quest 'Dawntrail'\n"
                       "เควสนี้ปลดล็อก The Windward Wilds (Normal)\n"
                       "จากนั้นคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก Extreme"),
            "unlock_en": ("Collaboration quest: The White Wanderer, from the Dawn Hunt tracker in Tuliyollal (X: 13.4 Y: 13.1)\n"
                          "It opens once the main scenario quest 'Dawntrail' is done\n"
                          "The quest unlocks The Windward Wilds (normal)\n"
                          "Then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock the Extreme"),
            "unlock_pics": [
                {"map": {"map": "y6t1/00", "size": 180, "x": 13.4, "y": 13.1, "label": "Dawn Hunt tracker"},
                 "say": "Tuliyollal (X: 13.4 Y: 13.1) — Dawn Hunt tracker (เควส The White Wanderer)",
                 "say_en": "Tuliyollal (X: 13.4 Y: 13.1) — the Dawn Hunt tracker (The White Wanderer)"},
                {"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                 "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                 "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/arkveld/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166", "arena": S.ARENA,
        "waymarks": {"A": [51.5, 14], "B": [89, 52], "C": [51.5, 89.5], "D": [12.5, 51.5]},
        "iconSize": 7.2, "markSize": 5.2, "bossSize": 10, "ring": 5.5,
    },
    "cheatsheet": {
        "title": "Guardian Arkveld (Extreme) — Cheatsheet", "title_en": "Guardian Arkveld (Extreme) — Cheatsheet",
        "columns": 4, "panels": panels,
        "footer": "กลุ่ม MT: MT H1 D1 D2 / กลุ่ม ST: ST H2 D3 D4 · ล่อ beam: ตะวันออก > ตะวันตก > ตะวันออก",
        "footer_en": "MT group: MT H1 D1 D2 / ST group: ST H2 D3 D4 · Beam baits: east > west > east",
        "credit": "อ้างอิง cheatsheet จาก xivjpraids.com (ภาพโดย Nukemaru) · แปลและวาดใหม่โดย Cafe And SHabu",
        "credit_en": "Cheatsheet after xivjpraids.com (picture by Nukemaru) · translated and redrawn by Cafe And SHabu",
    },
    "steps": steps,
    "rewards": [
        {"kind": "weapon", "name": "Veldian Weapon Coffer (IL 745)", "ilvl": 745, "icon_src": ICON("ui/icon/026000/026557_hr1.tex"),
         "say": ("ได้ 1 กล่องทุกครั้งที่เคลียร์ เก็บซ้อนกันได้หลายกล่อง\n"
                 "ข้างในเป็นอาวุธ Veldian IL745 มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ\n"
                 "PLD: Veldian Sword กับ Veldian Shield"),
         "say_en": ("Every clear gives one; they stack\n"
                    "Inside is a Veldian weapon, IL745, for every job; tap an icon for the weapon's name\n"
                    "PLD: the Veldian Sword and the Veldian Shield"),
         "pieces": pieces},
        {"kind": "token", "name": "Guardian Arkveld Certificate", "icon_src": ICON("ui/icon/026000/026462_hr1.tex"),
         "say": ("ได้ 2 ใบทุกครั้งที่เคลียร์\n\n"
                 "แลกที่ smithy ใน Tuliyollal (X: 13.3 Y: 13.1)\n"
                 "อาวุธ Veldian + 5 ใบ = Augmented Veldian (IL760)\n"
                 "PLD: Sword กับ Shield ใช้ 5 ใบในการแลกครั้งเดียว\n"
                 "Felyne Support Team Cart Horn: 99 ใบ"),
         "say_en": ("Every clear gives 2\n\n"
                    "Exchange them with the smithy in Tuliyollal (X: 13.3 Y: 13.1)\n"
                    "A Veldian weapon + 5 = its Augmented Veldian version (IL760)\n"
                    "PLD: the sword and shield together take 5 in one exchange\n"
                    "Felyne Support Team Cart Horn: 99"),
         "pics": [SMITHY]},
        {"kind": "weapon", "name": "Augmented Veldian weapons", "ilvl": 760, "icon_src": ICON("ui/icon/030000/030695_hr1.tex"),
         "say": "อัปเกรดอาวุธ Veldian (IL745) เป็น IL760: อาวุธเดิม + Guardian Arkveld Certificate 5 ใบ ที่ smithy",
         "say_en": "Upgrade a Veldian weapon (IL745) to IL760: the weapon + 5 Guardian Arkveld Certificates, at the smithy"},
        {"kind": "mount", "name": "Felyne Support Team Cart Horn", "icon_src": ICON("ui/icon/004000/004323_hr1.tex"),
         "say": ("หีบของ rare เกิดหลังเคลียร์ด้วยโอกาสต่ำ ชนะ roll จึงได้\n"
                 "หรือแลกด้วย Guardian Arkveld Certificate 99 ใบ\n"
                 "ใช้แล้วได้ mount Felyne support team cart"),
         "say_en": ("A rare coffer appears after a clear at a low chance; win the roll to get it\n"
                    "or 99 Guardian Arkveld Certificates\n"
                    "Using it gives the Felyne support team cart mount"),
         "pics": [{"src": ICON("ui/icon/068000/068323_hr1.tex"),
                   "say": "หน้าตา Felyne support team cart (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "The Felyne support team cart, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs,",
      len(dict.fromkeys(s["mech"] for s in steps)), "mechs,", len(dict.fromkeys(s["phase"] for s in steps)), "phases;",
      "missing frames:", sorted(set(missing)))
