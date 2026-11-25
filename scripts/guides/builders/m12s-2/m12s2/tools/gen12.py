"""Builds scripts/guides/data/m12s-2.json (M12S part 2, Lindwurm: game8's plan, Nukemaru's video)."""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/m12s2"
sys.path.insert(0, HERE + "/tools")
import scenes12 as S

WT = r"."
OUT = WT + "/scripts/guides/data/m12s-2.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
URLS = [l.split(" ")[1] for l in open(HERE + "/dl/imgs-indexed.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk_*
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
VID = "YXxp8nrRw3o"
FR = lambda name, t, say, say_en: (f"frames/m12s-2/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        missing = [r[0] for r in refs if not os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        if missing and "allowmissing" not in sys.argv:
            raise SystemExit(f"missing frames: {missing}")
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
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วงกลาง", "Middle part")
P3 = ("ช่วง Idyllic Dream", "Idyllic Dream")
P4 = ("ช่วงท้าย", "Last part")

# ================================================================== setup
step(P0, "Waymarks", "Marker 8 ทิศมาตรฐาน", "Standard 8 waymarks",
     "Marker ตามภาพของ game8:\nA เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\n1 ตะวันตกเฉียงเหนือ\n2 ตะวันออกเฉียงเหนือ\n3 ตะวันออกเฉียงใต้\n4 ตะวันตกเฉียงใต้\n\n"
     "ไฟต์นี้ใช้ marker เป็นจุดยืนแทบทุก Mechanic: ต้องวางครบ 8 อัน",
     "Waymarks as game8 draws them:\nA north\nB east\nC south\nD west\n1 north-west\n2 north-east\n3 south-east\n4 south-west\n\n"
     "Nearly every Mechanic here uses the waymarks as spots: place all eight",
     strict=False, pic=3, scene=S.waymarks())

step(P0, "Macro: Idyllic Dream", "macro ติดมาร์ก + Command Panel", "Marker macros + Command Panel",
     "ครึ่งหลังใช้ macro ติดมาร์กให้ตัวเอง ใน Mechanic ใหญ่ช่วงท้าย Idyllic Dream\n"
     "game8 ให้ก๊อปชุดที่ Nukemaru แนะนำ (อยู่ในช่อง macro ของคู่มือนี้)\n"
     "มี 8 อัน: อันละตำแหน่ง กดอันของตำแหน่งที่ยืนอยู่ (ดูขั้น Idyllic Dream ⑤)\n\n"
     "macro เยอะ: วางตรงๆ บน hotbar จะเต็มถึง 8 ช่อง\n"
     "ใช้ Command Panel แทน: ใช้ hotbar แค่ 1 ช่องก็เรียก macro ได้ครบ (เหมาะกับ PS5 และคนเล่นจอย)\n"
     "ตั้งค่า: Actions & Traits → Extras → Command Panel\n\n"
     "เล่นจอย:\n"
     "กดปุ่ม Command Panel ให้แผงขึ้น\n"
     "ระหว่าง GCD หมุน กดปุ่มทิศทางเลือก macro\n"
     "กดเสร็จแผงหายไปเอง",
     "Part 2 uses macros that mark yourself, in the big late Mechanic, Idyllic Dream\n"
     "game8 points to the set Nukemaru recommends (in this guide's macro box)\n"
     "Eight of them, one per spot: press the one for where you stand (see Idyllic Dream ⑤)\n\n"
     "That many macros would fill 8 hotbar slots\n"
     "Use the Command Panel instead: one hotbar slot reaches every macro (good for PS5 and controller players)\n"
     "Set it up: Actions & Traits → Extras → Command Panel\n\n"
     "On a controller:\n"
     "Press the Command Panel button to open it\n"
     "While the GCD rolls, pick the macro with the D-pad\n"
     "The panel closes by itself when you're done",
     strict=False)

# ================================================================== first part
step(P1, "Arcadia Aflame", "raid-wide เวท", "Magic raid-wide",
     "raid-wide แบบเวท (magic)\nแรงมากเหมือนครึ่งแรก: ใช้ mitigate และ barrier ให้เต็มที่",
     "A magic raid-wide\nVery heavy, as in part 1: use mitigation and barriers fully to keep the damage down",
     strict=False,
     refs=[FR("arcadia-aflame", 30, "Arcadia Aflame: raid-wide เวทแรงมาก ใช้ mitigate + barrier", "Arcadia Aflame: a very heavy magic raid-wide; mitigate + barriers")])

REP = "Replication"
REP_SAYS = {"MT": "marker 1 คู่ D1: ยืนซ้าย (หันหน้าหาบอส)", "D1": "marker 1 คู่ MT: ยืนขวา (หันหน้าหาบอส)",
            "H2": "marker 2 คู่ D4: ยืนซ้าย", "D4": "marker 2 คู่ H2: ยืนขวา",
            "ST": "marker 3 คู่ D2: ยืนซ้าย", "D2": "marker 3 คู่ ST: ยืนขวา",
            "H1": "marker 4 คู่ D3: ยืนซ้าย", "D3": "marker 4 คู่ H1: ยืนขวา"}
REP_SAYS_EN = {"MT": "Marker 1 with D1: the left (facing the boss)", "D1": "Marker 1 with MT: the right (facing the boss)",
               "H2": "Marker 2 with D4: the left", "D4": "Marker 2 with H2: the right",
               "ST": "Marker 3 with D2: the left", "D2": "Marker 3 with ST: the right",
               "H1": "Marker 4 with D3: the left", "D3": "Marker 4 with H1: the right"}
step(P1, REP, "ภาพรวม: ร่างแยกโจมตี 2 รอบ", "Overview: the clones attack twice",
     "บอสเรียกร่างแยก (clone) ออกมา แล้วโจมตีผู้เล่นด้วย stack คู่ / AoE วงกลม / กรวย\n"
     "stack คู่เป็นธาตุไฟ: โดนแล้วติด debuff Fire Resistance Down\n"
     "AoE วงกลมเป็นธาตุมืด: โดนแล้วติด debuff Dark Resistance Down\n\n"
     "จากนั้นร่างแยกแบ่งตัวอีกรอบ แล้วโจมตีแบบเดิมอีกครั้ง\n"
     "คนที่ติด debuff ถ้าโดนธาตุเดิมซ้ำจะตาย: ต้องไปรับธาตุตรงข้าม\n\n"
     "สรุป: หลบกรวยของร่างแยก แล้วรับ stack และ AoE วงกลม 2 รอบ\n"
     "แผนของ game8: ยืนตำแหน่งตายตัว (ดูขั้นถัดไป)",
     "The boss summons clones that hit players with pair stacks, circle AoEs and cones\n"
     "The pair stack is fire: it leaves Fire Resistance Down\n"
     "The circle AoE is dark: it leaves Dark Resistance Down\n\n"
     "Then the clones split again and attack the same way once more\n"
     "Anyone with a debuff dies to the same element again: take the other one\n\n"
     "In short: dodge the clones' cones while taking a stack and a circle AoE twice\n"
     "game8's plan: fixed positions (next steps)",
     strict=False,
     refs=[FR("replication-clones", 58, "Replication: ร่างแยก 4 ตัวโผล่ที่ เหนือ / ใต้ / ออก / ตก แต่ละตัวโจมตีต่างกัน", "Replication: four clones at the cardinals, each with its own attack")])
step(P1, REP, "① ยืนเป็นคู่ที่ marker ตัวเลข", "① Pairs on the number markers",
     "① บอสเรียกร่างแยก 4 ตัว\n"
     "ยืนเป็นคู่ที่ marker ตัวเลข: หันหน้าหาบอส DPS อยู่ขวา / Tank·Healer อยู่ซ้าย\n"
     "เข้าที่ให้ทันก่อนร่างแยกร่ายเสร็จ\n\n"
     "คู่ตามภาพ (marker 1 / 2 / 3 / 4): MT·D1 / H2·D4 / ST·D2 / H1·D3",
     "① The boss summons four clones\n"
     "Stand in pairs on the number markers: facing the boss, DPS on the right / tank or healer on the left\n"
     "Be in place before the clones finish casting\n\n"
     "Pairs as drawn (markers 1 / 2 / 3 / 4): MT·D1 / H2·D4 / ST·D2 / H1·D3",
     strict=True, pic=4, scene=S.rep1(), says=REP_SAYS, says_en=REP_SAYS_EN)
step(P1, REP, "② ร่างแยกโจมตีรอบแรก", "② The clones' first attacks",
     "② ร่างแยกโจมตี: แต่ละคนได้ 1 ใน 3 แบบ\n"
     "ติด Fire Resistance Down (โดน stack ไฟ)\n"
     "ติด Dark Resistance Down (โดน AoE มืด)\n"
     "ไม่โดนอะไรเลย\n\n"
     "ภาพ: ร่างแยกตะวันออก (ไฟ) stack ใส่คู่ที่ marker 3 / ร่างแยกตะวันตก (มืด) AoE ใส่ D1 กับ H1 / ร่างแยกเหนือกับใต้ยิงกรวยไปตะวันออกและตะวันตก",
     "② The clones attack: everyone ends up with one of three\n"
     "Fire Resistance Down (hit by the fire stack)\n"
     "Dark Resistance Down (hit by a dark AoE)\n"
     "Nothing at all\n\n"
     "Picture: the east clone (fire) stacks on the pair at marker 3 / the west clone (dark) hits D1 and H1 / the north and south clones fire cones east and west",
     strict=True, pic=5, scene=S.rep2(), says=REP_SAYS, says_en=REP_SAYS_EN,
     refs=[FR("replication-fire-stack", 62, "ร่างแยกไฟ: stack คู่ธาตุไฟ (โดนแล้วติด Fire Resistance Down)", "The fire clone: a fire pair stack (it leaves Fire Resistance Down)")])
step(P1, REP, "③ Snaking Kick: ไปหลังบอส", "③ Snaking Kick: behind the boss",
     "③ บอสใช้ Snaking Kick: AoE เต็มครึ่งสนามด้านหน้าบอส\nทุกคนหนีไปด้านหลังบอส",
     "③ The boss uses Snaking Kick: the whole half in front of it\nEveryone goes behind the boss",
     strict=False, pic=6, scene=S.rep3_kick(),
     refs=[FR("snaking-kick", 147, "Snaking Kick: ครึ่งสนามด้านหน้าบอสโดนหมด หนีไปหลังบอส", "Snaking Kick: the whole front half; get behind the boss")])
step(P1, REP, "④ ร่างแยกแบ่งตัว", "④ The clones split",
     "④ ร่างแยกแบ่งตัวเพิ่ม (รวม 8 ตัว)\nภาพ: ทุกคนกลับมายืนเป็นคู่ที่ marker ตัวเลขเหมือนเดิม",
     "④ The clones split (eight in all)\nPicture: everyone is back in pairs on the number markers",
     strict=True, pic=7, scene=S.rep3_split(), says=REP_SAYS, says_en=REP_SAYS_EN)
step(P1, REP, "⑤ รอบที่ 2: รับธาตุตรงข้าม", "⑤ Round 2: take the other element",
     "⑤ ร่างแยกเรียงเป็นแนวทแยง แล้วโจมตีอีกรอบ\n"
     "คนที่ติด Fire Resistance Down และคนที่ไม่โดนอะไร → ไปรับ AoE มืด\n"
     "คนที่ติด Dark Resistance Down → ไปรับ stack ไฟ\n\n"
     "ภาพ: D1 กับ H1 โดนมืดรอบแรก จึงรับ stack ไฟพร้อมคู่ (MT·D1 / H1·D3) คนที่เหลือรับ AoE มืดคนละลูก\n"
     "จบ Replication",
     "⑤ The clones line up on a diagonal and attack again\n"
     "Fire Resistance Down, or nothing → take a dark AoE\n"
     "Dark Resistance Down → take the fire stack\n\n"
     "Picture: D1 and H1 took dark first, so they stack the fire with their partners (MT·D1 / H1·D3); everyone else takes a dark AoE each\n"
     "End of Replication",
     strict=False, pic=8, scene=S.rep4(),
     refs=[FR("replication-second", 186, "รอบที่ 2: ร่างแยกเรียงแนวทแยง ตามร่างแยกธาตุที่ต้องรับไป", "Round 2: the clones on a diagonal; follow the clone of the element you need")])
step(P1, REP, "จุดที่ต้องจำ", "What to remember",
     "หลังโจมตีรอบแรก ร่างแยกไฟอยู่ที่ marker ตัวเลข (ฝั่งตรงข้ามแนวทแยงคือร่างแยกมืด)\n"
     "รอบที่ 2 ร่างแยกไฟกับร่างแยกมืดเรียงสลับกันเสมอ\n"
     "รอบแรกไม่โดนอะไร → รอบที่ 2 ไปรับมืด",
     "After the first attacks the fire clone is on a number marker (the dark clone is diagonally opposite)\n"
     "In round 2 the fire and dark clones always alternate\n"
     "Nothing in round 1 → take dark in round 2",
     strict=False)
step(P1, REP, "แผนตำแหน่งตายตัว: จุดยืนทั้งหมด", "Fixed spots: every spot",
     "จุดยืนทั้งหมดของแผนตำแหน่งตายตัว\n"
     "เขียว: Range\nส้ม: Melee ที่รับไฟ\nชมพู: Melee ที่รับมืด\n\n"
     "วิธี: รับการโจมตีรอบแรกแล้ว พอร่างแยกรอบที่ 2 ย้ายที่ ให้ถือตำแหน่งร่างแยกมืดเป็นทิศเหนือ แล้วไปยืนตามภาพ\n"
     "ข้อดี: ไปยืนตามจุดก็จัดการ debuff ได้ และแทบไม่ต้องสนใจร่างแยกที่ยิงกรวย",
     "Every spot of the fixed-position plan\n"
     "Green: range\nOrange: melee taking fire\nPink: melee taking dark\n\n"
     "How: after round 1, when the clones move for round 2, treat the dark clone's position as north and go to your spot\n"
     "The gain: standing on the spot resolves the debuff, and the cone clones can be all but ignored",
     strict=False, pic=9, scene=S.rep_all())
step(P1, REP, "ตัวอย่าง: ร่างแยกมืดอยู่ตะวันออกเฉียงเหนือ", "Example: the dark clone north-east",
     "ตัวอย่าง: ร่างแยกมืดออกทางตะวันออกเฉียงเหนือ (ถือเป็นเหนือ)\n"
     "Range รับมืด: Healer เหนือ / DPS ตะวันออก\n"
     "Melee รับไฟ: ขอบช่องกลาง ฝั่งเหนือ\n"
     "Melee รับมืด: DPS ตะวันตก / Tank ใต้\n"
     "Range รับไฟ: ใต้",
     "Example: the dark clone appears north-east (it counts as north)\n"
     "Range taking dark: healer north / DPS east\n"
     "Melee taking fire: the middle tile's edge, north side\n"
     "Melee taking dark: DPS west / tank south\n"
     "Range taking fire: south",
     strict=False, pic=10, scene=S.rep_ne())
step(P1, REP, "แนว Melee", "Melee guide",
     "แนว Melee (เลข 1–4 = ร่างแยกมืดอยู่ตำแหน่ง 1–4 ในภาพ)\n"
     "Melee รับไฟ: กลางขอบของช่องสี่เหลี่ยมตรงกลาง ขอบด้านร่างแยกมืดที่เป็นเหนือ\n"
     "Melee รับมืด: กลางขอบช่องสี่เหลี่ยมทิศเหนือ / ใต้ / ออก / ตก บนแนวต่อจากขอบช่อง (ถือร่างแยกมืดเป็นเหนือ)\n\n"
     "คู่ที่รับไฟรอบแรก: ถือร่างแยกมืดตัวนอกสุดเป็นเหนือ แล้วรับมืด DPS ซ้าย / Tank ขวา",
     "Melee guide (1–4 = the dark clone at position 1–4 in the picture)\n"
     "Melee taking fire: the middle of the centre tile's edge, the edge towards the dark clone that is north\n"
     "Melee taking dark: the middle of the edges of the N / S / E / W tiles, on the line running on from the tile's edge (dark clone as north)\n\n"
     "The pair that took fire first: with the outermost dark clone as north, take dark with DPS left / tank right",
     strict=False, pic=11, scene=S.rep_melee())
step(P1, REP, "แนว Range", "Range guide",
     "แนว Range\n"
     "Range ยืนกลางช่องสี่เหลี่ยมทิศเหนือ / ใต้ / ออก / ตก เสมอ\n"
     "Range รับมืด: ช่องซ้ายและขวาของแนวที่ร่างแยกมืดอยู่\n"
     "Range รับไฟ: ถือร่างแยกมืดเป็นเหนือ แล้วไปช่องขวาล่าง\n\n"
     "ระวัง: บางครั้งกรวยของร่างแยกเฉียดจุดยืน Range เล็กน้อย ขยับนิดหน่อยให้พ้น",
     "Range guide\n"
     "Range always stand in the middle of the N / S / E / W tiles\n"
     "Range taking dark: the tiles left and right of the dark clone's line\n"
     "Range taking fire: with the dark clone as north, the lower-right tile\n\n"
     "Careful: a clone's cone can graze a range spot; shift a little to stay out",
     strict=False, pic=12, scene=S.rep_range())

SOB = "Double Sobat"
step(P1, SOB, "① ทุกคนยกเว้น MT ออกห่าง", "① Everyone but MT moves away",
     "① บอสโจมตีเต็มครึ่งหน้าไปทาง aggro อันดับ 1\nทุกคนยกเว้น MT ออกห่างจาก MT ไปฝั่งที่ปลอดภัยจากครั้งแรก",
     "① The boss hits the whole half in front, towards aggro #1\nEveryone but MT moves away from MT, to the side the first hit misses",
     strict=["MT"], pic=14, scene=S.sob1(), says={"MT": "ถือบอสไว้: ครั้งแรกมาที่ MT"}, says_en={"MT": "Hold the boss: the first hit comes to MT"},
     refs=[FR("double-sobat", 356, "Double Sobat: ครึ่งหน้าใส่ aggro อันดับ 1 คนอื่นออกห่างจาก MT", "Double Sobat: the front half at aggro #1; everyone else away from MT")])
step(P1, SOB, "② ครั้งแรกลง", "② The first hit",
     "② ครั้งแรกลง: AoE ครึ่งหน้าใส่ aggro อันดับ 1",
     "② The first hit: the front half at aggro #1",
     strict=["MT"], pic=15, scene=S.sob2(), says={"MT": "รับครั้งแรก (ใช้ invuln)"}, says_en={"MT": "Take the first hit (invuln)"})
step(P1, SOB, "③ บอสหันแล้วตีอีกครั้ง", "③ The boss turns and hits again",
     "③ บอสหันไปอีกทาง แล้วโจมตีครึ่งหน้าอีกครั้ง\nดูทิศที่บอสหัน แล้วหนีไปด้านหลังบอส",
     "③ The boss turns and hits the front half again\nWatch where it faces and get behind it",
     strict=False, pic=16, scene=S.sob3())
step(P1, SOB, "④ วงกลมใหญ่ใส่ Tank 2 คน", "④ Big circles on both tanks",
     "④ จบ 2 ครั้ง: วงกลมใหญ่ตกใส่ aggro อันดับ 1 และ 2\n"
     "MT กับ ST ไปฝั่งที่ครั้งที่ 2 เพิ่งลง แล้วแยกกันรับ: อย่าให้วงกลมซ้อนกัน\n"
     "ยืนฝั่งปลอดภัยของครั้งที่ 2 มองไปที่บอส ถือทิศนั้นเป็นเหนือ: MT ไปตะวันตกเฉียงเหนือ / ST ไปตะวันออกเฉียงเหนือ\n"
     "คนอื่นห้ามเข้าไปฝั่ง Tank",
     "④ After the two hits, big circles land on aggro #1 and #2\n"
     "MT and ST go to the side the second hit just struck and take them apart: don't overlap them\n"
     "From the second hit's safe side, look at the boss and call that north: MT north-west / ST north-east\n"
     "Everyone else stays away from the tanks' side",
     strict=["MT", "ST"], pic=17, scene=S.sob4(),
     says={"MT": "ฝั่งที่ครั้งที่ 2 ลง: 'ตะวันตกเฉียงเหนือ' (มองบอสจากฝั่งปลอดภัย) ภาพ: ล่างซ้าย", "ST": "ฝั่งที่ครั้งที่ 2 ลง: 'ตะวันออกเฉียงเหนือ' (มองบอสจากฝั่งปลอดภัย) ภาพ: บนซ้าย"},
     says_en={"MT": "The second hit's side: 'north-west' (looking at the boss from the safe side); picture: lower left",
              "ST": "The second hit's side: 'north-east' (looking at the boss from the safe side); picture: upper left"},
     refs=[FR("double-sobat-circles", 399, "จบ 2 ครั้ง: วงกลมใหญ่ใส่ Tank 2 คน แยกกันรับ คนอื่นห้ามเข้าใกล้", "After the two hits: big circles on both tanks, taken apart; nobody else near")])
step(P1, SOB, "invuln: MT > ST > MT", "Invulns: MT > ST > MT",
     "AoE ครึ่งหน้าใส่ aggro อันดับ 1 ตามทิศที่บอสหัน\n"
     "ครั้งแรกให้ MT รับด้วย invuln\n"
     "มีทั้งหมด 3 ครั้ง: แนะนำ invuln ครั้งที่ 1 MT / ครั้งที่ 2 ST / ครั้งที่ 3 MT\n"
     "ถ้ามี Paladin: ครั้งที่ 1 และ 3 ให้ Tank ที่ไม่ใช่ Paladin รับ / ครั้งที่ 2 ใช้ invuln ของ Paladin",
     "The front half at aggro #1, wherever the boss faces\n"
     "MT takes the first with an invuln\n"
     "It comes three times: invulns are best MT for the 1st / ST for the 2nd / MT for the 3rd\n"
     "With a Paladin: the other tank takes the 1st and 3rd / the Paladin's invuln takes the 2nd",
     strict=False)

STG = "Staging"
step(P1, STG, "ภาพรวม: รับสายแล้วร่างแยกทำซ้ำ", "Overview: take tethers, the clones repeat them",
     "ร่างแยกจาก 8 ทิศโยงสาย (tether) มาที่ผู้เล่น\n"
     "จากนั้นร่างแยกของบอสโผล่พร้อมสัญลักษณ์ stack / กรวย / วงกลมใหญ่ แล้วโยงสายเพิ่ม\n"
     "รับสายไหน ก็โดนการโจมตีแบบนั้น\n"
     "ต่อมาบอสใช้ Reenactment: ร่างแยกโจมตีแบบเดียวกับสายที่รับไว้อีกรอบ\n\n"
     "แผนของ game8: แผน Ushiko แบ่งหน้าที่ตามตำแหน่งที่ยืน ไม่ใช่ตาม role\n"
     "ถือ B เป็นทิศเหนือ (ภาพหมุนให้ B อยู่บน) และเรียกผู้เล่นด้วยชื่อ marker ของตำแหน่ง",
     "Clones from eight directions tether to the players\n"
     "Then the boss's clones appear showing a stack / cone / big circle, and tether as well\n"
     "Whatever tether you take, you get that attack\n"
     "Later the boss uses Reenactment: the clones repeat the same attacks as the tethers taken\n\n"
     "game8's plan: the Ushiko way, jobs by where you stand, not by role\n"
     "B counts as north (the pictures are turned with B at the top), and players go by their spot's waymark",
     strict=False,
     refs=[FR("staging-tethers", 432, "Staging: ร่างแยกของบอสโผล่ โยงสายมาที่ผู้เล่น รับสายไหนได้การโจมตีแบบนั้น", "Staging: the boss's clones appear and tether the players; the tether you take is the attack you get")])
step(P1, STG, "① ไปที่ตำแหน่งสายของตัวเอง", "① Go to your tether's spot",
     "① ถือ B เป็นเหนือ: เมื่อสายโยงมา ให้ไปที่ตำแหน่งของสายตัวเอง\n"
     "แล้วร่างแยกของบอสโผล่มา มีสัญลักษณ์ AoE อยู่เหนือหัว",
     "① B as north: when your tether appears, go to its spot\n"
     "Then the boss's clones appear with an AoE shown over their heads",
     strict=False, pic=18, scene=S.st1())
step(P1, STG, "② รับสายตามกฎ", "② Take tethers by the rule",
     "② ทุกคนรับสายตามกฎของแผน (ดูขั้นกฎการรับสาย)\nD ไม่รับสาย",
     "② Everyone takes a tether by the plan's rule (see the tether rule step)\nD takes none",
     strict=False, pic=19, scene=S.st2())
step(P1, STG, "③ Firefall Splash: แยกยืน", "③ Firefall Splash: spread out",
     "③ บอสร่าย Firefall Splash: แยกยืนตามภาพ\n"
     "B: ล่อบอสที่กลาง marker B ค่อนเข้ากลางสนาม (ห้ามชิดขอบ)\n"
     "คนรับวงกลมใหญ่: ไปขอบตะวันออก / ตะวันตก / ใต้ แล้วทิ้ง AoE\n"
     "ภาพ: คนรับ stack กับคนรับกรวย ยืนขอบฝั่ง B",
     "③ The boss casts Firefall Splash: spread as drawn\n"
     "B: bait the boss in the middle of the B marker, towards the middle of the arena (not by the edge)\n"
     "Big-circle takers: go to the east / west / south edges and drop the AoEs\n"
     "Picture: the stack and cone takers stand at the edge on the B side",
     strict=False, pic=20, scene=S.st3(),
     refs=[FR("firefall-splash", 440, "Firefall Splash: บอสพุ่งใส่คนรับสายบอส + วงกลมจากบอส + กรวย 4 ทิศ + วงกลมใหญ่ 3 ลูก", "Firefall Splash: the boss leaps at its tether holder + a circle from the boss + four-way cones + three big circles")])
step(P1, STG, "④ stack 2 กลุ่ม", "④ Two stacks",
     "④ ต่อด้วย stack\n"
     "กลุ่ม 2 / A / 1 / D: ฝั่งตะวันตก\n"
     "กลุ่ม 3 / C / 4 / B: ฝั่งตะวันออก\n"
     "คนรับกรวย (A, C) เข้าไปอยู่ในวง target ของบอส\n"
     "คนอื่นอยู่นอกวง target",
     "④ Then the stacks\n"
     "2 / A / 1 / D: the west side\n"
     "3 / C / 4 / B: the east side\n"
     "The cone takers (A, C) step inside the boss's target circle\n"
     "Everyone else stays outside it",
     strict=False, pic=21, scene=S.st4())
step(P1, STG, "⑤ กรวยออก แล้วไปฝั่ง B", "⑤ Cones, then to B",
     "⑤ กรวยจากคนรับกรวย (A / C) ยิงออก\nบอสร่าย Snaking Kick ต่อ: รีบไปด้านหลังบอส ฝั่ง B",
     "⑤ The cone takers (A / C) fire their cones\nThe boss casts Snaking Kick next: go behind it, to the B side, at once",
     strict=False, pic=22, scene=S.st5())
step(P1, STG, "⑥ Snaking Kick", "⑥ Snaking Kick",
     "⑥ Snaking Kick ลง\nหลังจากนี้มีล่อ Near / Far และการโจมตีของร่างแยกต่อเนื่องกัน",
     "⑥ Snaking Kick goes off\nNear / Far baits and the clones' attacks follow one after another",
     strict=False, pic=23, scene=S.st6())
step(P1, STG, "⑦ Netherwrath Near / Far", "⑦ Netherwrath Near / Far",
     "⑦ Netherwrath Near / Far ลง\n"
     "คนรับ stack: อยู่ในวง target เส้นเฉียด (ไม่ให้ stack ของอีกคนกับ AoE โดนกัน)\n"
     "คนรับกรวย: อยู่นอกวง target\n"
     "คนอื่น: ยืนบนเส้นวง target",
     "⑦ Netherwrath Near / Far goes off\n"
     "Stack takers: just inside the target circle (so one's stack and the other's AoE don't meet)\n"
     "Cone takers: outside the target circle\n"
     "Everyone else: on the target circle",
     strict=False, pic=24, scene=S.st7(),
     refs=[FR("netherwrath", 472, "Netherwrath Near / Far: ยืนตามหน้าที่ ในวง / นอกวง / บนเส้นวง target", "Netherwrath Near / Far: stand by your job, inside / outside / on the target circle")])
step(P1, STG, "⑧ stack แถว marker 2", "⑧ Stack around marker 2",
     "⑧ stack ใส่คนที่ไม่ได้ล่อ Near / Far: รับแถว marker 2\n"
     "คนรับ stack และคนรับกรวย: บอสยิงกรวยมาอีก กลับไปยืนแบบขั้น ③",
     "⑧ A stack on those who didn't bait Near / Far: take it around marker 2\n"
     "Stack and cone takers: the boss fires cones again; stand as in ③",
     strict=False, pic=25, scene=S.st8())
step(P1, STG, "⑨ กรวย + วงกลมจากบอส", "⑨ Cones + circle from the boss",
     "⑨ บอสยิงกรวย + AoE วงกลม\n"
     "คนที่ไม่ได้รับ stack / กรวย: อย่าเข้าวง target ของบอส ย้ายไป marker 3",
     "⑨ The boss fires cones + a circle\n"
     "Everyone who isn't a stack or cone taker: keep out of the boss's target circle and move to marker 3",
     strict=False, pic=26, scene=S.st9())
step(P1, STG, "⑩ stack สุดท้าย", "⑩ The last stack",
     "⑩ stack ใส่คนที่ไม่ได้รับ stack / กรวย อีกครั้ง\nวงกลมใหญ่ของร่างแยกลงด้วย\nจบ Staging",
     "⑩ Another stack on everyone who isn't a stack or cone taker\nA clone's big circle lands too\nEnd of Staging",
     strict=False, pic=27, scene=S.st10())
step(P1, STG, "ลำดับเหตุการณ์", "Timeline",
     "1. ถือ B เป็นเหนือ: สายโยงมาแล้วไปที่ตำแหน่งสายตัวเอง\n"
     "2. ร่างแยกของบอสโผล่: รับสายตามกฎ\n"
     "3. Firefall Splash ร่ายเสร็จ: บอสพุ่งใส่คนรับสายบอส + AoE วงกลมจากบอส + กรวย 4 ทิศ + วงกลมใหญ่ 3 ลูก\n"
     "4. stack ใส่คนรับ stack + กรวยออก\n"
     "5. Snaking Kick\n"
     "6. Reenactment\n"
     "7. Netherwrath Near / Far + กรวยของร่างแยก\n"
     "8. stack ของร่างแยก + วงกลมใหญ่ของร่างแยก\n"
     "9. กรวย 4 ทิศของบอส + วงกลมใหญ่ของร่างแยก\n"
     "10. stack ของร่างแยก + วงกลมใหญ่ของร่างแยก",
     "1. B as north: when your tether appears, go to its spot\n"
     "2. The boss's clones appear: take tethers by the rule\n"
     "3. Firefall Splash ends: the boss leaps at its tether holder + a circle from the boss + cones four ways + three big circles\n"
     "4. Stacks on the stack takers + the cones go off\n"
     "5. Snaking Kick\n"
     "6. Reenactment\n"
     "7. Netherwrath Near / Far + the clones' cones\n"
     "8. A clone's stack + a clone's big circle\n"
     "9. The boss's four-way cones + a clone's big circle\n"
     "10. A clone's stack + a clone's big circle",
     strict=False)
step(P1, STG, "หน้าที่ตาม marker (1): stack และกรวย", "Jobs by marker (1): stacks and cones",
     "marker 2 / 3: คนรับ stack\n"
     "รับสายร่างแยกที่ทำ stack\n"
     "ล่อกรวย 4 ทิศของบอส: ยืนวงใน\n"
     "Near / Far: อยู่ในวง target\n\n"
     "marker A / C: คนรับกรวย\n"
     "รับสายร่างแยกที่ทำกรวย\n"
     "stack ก่อน Snaking Kick: เข้าวง target แล้วยิงกรวย\n"
     "Near / Far: อยู่นอกวง target รับพร้อมคนรับ stack\n"
     "ล่อกรวย 4 ทิศของบอส: ยืนวงนอก",
     "Markers 2 / 3: stack takers\n"
     "Take a stack clone's tether\n"
     "The boss's four-way cones: stand on the inside\n"
     "Near / Far: inside the target circle\n\n"
     "Markers A / C: cone takers\n"
     "Take a cone clone's tether\n"
     "The stack before Snaking Kick: step into the target circle and fire the cone\n"
     "Near / Far: outside the target circle, taking it with the stack takers\n"
     "The boss's four-way cones: stand on the outside",
     strict=False, pic=28, scene=S.st_roles())
step(P1, STG, "หน้าที่ตาม marker (2): วงกลม / B / D", "Jobs by marker (2): circles / B / D",
     "marker 1 / 4: คนรับวงกลมใหญ่\n"
     "รับสายร่างแยกที่ทำวงกลม\n"
     "Firefall Splash: ไปขอบตะวันออก / ตะวันตก รับ AoE\n"
     "Near / Far: ยืนบนวง target หลัง Near / Far ไปรับ stack ที่ marker 2 แล้วรับ stack ที่ marker 3\n\n"
     "marker B: รับสายบอส\n"
     "ล่อ Firefall Splash ที่ marker B ค่อนเข้ากลางสนาม (ชิดขอบแล้ว วงกลมที่ออกพร้อมกรวย 4 ทิศอาจทำให้คนรับ stack หลบไม่พ้น)\n"
     "stack ถัดไป: รับกับกลุ่ม 3 / C / 4\n"
     "Near / Far: ทำแบบคน marker 1 / 4\n\n"
     "marker D: ไม่รับสาย\n"
     "Firefall Splash: ไปใต้สุด รับวงกลม\n"
     "stack ถัดไป: รับกับกลุ่ม 2 / A / 1\n"
     "Near / Far: ทำแบบคน marker 1 / 4",
     "Markers 1 / 4: big-circle takers\n"
     "Take a circle clone's tether\n"
     "Firefall Splash: go to the east / west edge for the AoE\n"
     "Near / Far: on the target circle; afterwards stack at marker 2, then at marker 3\n\n"
     "Marker B: the boss's tether\n"
     "Bait Firefall Splash on marker B, towards the middle (at the edge, the circle that comes with the four-way cones can trap a stack taker)\n"
     "The next stack: with 3 / C / 4\n"
     "Near / Far: as markers 1 / 4\n\n"
     "Marker D: no tether\n"
     "Firefall Splash: the far south, for a circle\n"
     "The next stack: with 2 / A / 1\n"
     "Near / Far: as markers 1 / 4",
     strict=False)
step(P1, STG, "กฎการรับสาย", "The tether rule",
     "marker 3 / C / 4: นับจาก B ตามเข็มนาฬิกา รับสายแรกที่ตรงกับหน้าที่ตัวเอง\n"
     "marker 2 / A / 1: นับจาก B ทวนเข็มนาฬิกา รับสายแรกที่ตรงกับหน้าที่ตัวเอง\n"
     "B: รับสายบอส / D: ไม่รับสาย\n\n"
     "ตัวอย่างที่สับสน: คน C ยืนที่ C ร่างแยกกรวยโผล่ที่ C และโยงมาที่ตัวเองพอดี แต่มีร่างแยกกรวยอีกตัวที่ 3\n"
     "คน C ต้องรับสายที่ 3\n"
     "สายที่ C ให้คน A รับ",
     "Markers 3 / C / 4: count clockwise from B and take the first tether of your job\n"
     "Markers 2 / A / 1: count counter-clockwise from B and take the first tether of your job\n"
     "B: the boss's tether / D: none\n\n"
     "A tricky case: C stands on C and a cone clone appears there, tethered to them, but another cone clone is at 3\n"
     "C takes the one at 3\n"
     "A takes the one at C",
     strict=False, pic=29, scene=S.st_rule())
step(P1, STG, "ระวัง: ทิ้งวงกลมตามตำแหน่งแรก", "Careful: drop circles by your first spot",
     "จุดแยกยืนหลัง Firefall Splash อิงตำแหน่งแรกที่ยืน ไม่ใช่ตำแหน่งหลังรับสาย\n"
     "ตัวอย่าง: ร่างแยกวงกลมโผล่ที่ 3 กับ C → คน 4 รับสายที่ 3 / คน 1 รับสายที่ C\n"
     "ตอนนั้นคน 1 อยู่ฝั่ง C: ถ้าทิ้งวงกลมฝั่ง C ไปเลยจะพลาด (ทีม game8 ก็เคยพลาดจุดนี้)",
     "Where you spread after Firefall Splash goes by your first spot, not where you ended up after the tethers\n"
     "Example: circle clones at 3 and C → 4 takes the one at 3 / 1 takes the one at C\n"
     "1 is then on the C side: dropping the circle there is the mistake (game8's own team made it)",
     strict=False)
step(P1, STG, "ตำแหน่งคนรับ stack ตอน Near", "Where the stack takers stand for Near",
     "ตำแหน่งของคนรับสาย stack ตอน Near สำคัญมาก พลาดง่าย\n"
     "ถ้าทุกคนยืนเป็นรูปตัว Y สวยๆ AoE ของคน Near ชนกันง่าย และ Near มักไปโดนคนที่อยู่ใต้บอสซึ่งไม่ได้ล่อ\n"
     "แนะนำ (ความเห็นผู้เขียน game8): กระจายให้รูปรวมอยู่ระหว่างตัว Y กับตัว T และคน Near ยืนเลยเส้นวง target วงในเข้าไปนิดเดียว",
     "Where the stack-tether players stand for Near matters a lot and goes wrong easily\n"
     "A neat Y shape lets the two Near AoEs collide, and Near tends to hit someone south of the boss who isn't baiting\n"
     "Suggested (game8's writer): spread so the shape is between a Y and a T, the Near players just a step inside the inner target circle",
     strict=False)

# ================================================================== middle part
MC = "Mutating Cells + Blood Mana"
step(P2, MC, "① ได้ debuff α หรือ β", "① α or β",
     "① Mutating Cells ร่ายเสร็จ: ทุกคนได้ debuff α หรือ β\nα = ห้ามโดนดาเมจ\nβ = ต้องโดนดาเมจ",
     "① Mutating Cells ends: everyone gets α or β\nα = must not take damage\nβ = must take damage",
     strict=False, pic=31, scene=S.mana1(),
     refs=[FR("mutating-cells", 1086, "Mutating Cells: ได้ α (ห้ามโดนดาเมจ) หรือ β (ต้องโดนดาเมจ)", "Mutating Cells: α (take no damage) or β (must take damage)")])
step(P2, MC, "② Tank ที่ได้ α: สลับ Tank", "② A tank with α: swap",
     "② ถ้า Tank ที่ถือบอสได้ α จะโดนแม้แต่ auto-attack ไม่ได้: สลับ Tank\nภาพ: ST ที่ได้ β ดึงบอสไป",
     "② If the tank holding the boss has α, even its auto-attacks are not allowed: swap\nPicture: ST, with β, takes the boss",
     strict=False, pic=32, scene=S.mana1(True))
step(P2, MC, "③ หา 2 รูปทรงที่อยู่ใกล้ลูกบอลขาว", "③ Find the two shapes near the white orb",
     "③ ฝั่งหนึ่งของสนามมีรูปทรงเรียงรอบลูกบอลขาว ห่างเท่ากันทุกตัว\n"
     "อีกฝั่งระยะไม่เท่ากัน\n"
     "ดูฝั่งที่ไม่เท่ากัน แล้วหา 2 รูปทรงที่อยู่ใกล้ลูกบอลขาว (ภาพ: ฝั่งตะวันออก สีเขียวกับสีส้ม)",
     "③ On one side the shapes sit evenly round a white orb\n"
     "On the other side their distances differ\n"
     "On the uneven side, find the two shapes nearest the white orb (picture: east, green and orange)",
     strict=False, pic=33, scene=S.mana3(),
     refs=[FR("blood-mana", 1190, "Blood Mana: ลูกบอลขาวตะวันออก / ตะวันตก มีรูปทรง 4 สีรอบๆ ดูว่าฝั่งไหนระยะไม่เท่ากัน", "Blood Mana: white orbs east and west with four shapes round each; find the uneven side")])
step(P2, MC, "④ β ไปชนรูปทรงฝั่งที่ห่างเท่ากัน", "④ β bump the same shapes on the even side",
     "④ ไปชนรูปทรง 2 แบบเดียวกันนั้น ที่ฝั่งเรียงห่างเท่ากัน\n"
     "เหนือ: Tank ที่ได้ β 1 คน\n"
     "ใต้: Healer β + DPS β รวม 3 คน\n"
     "ชนแล้วรูปทรงปล่อย AoE วงกลม: โดนแล้วถือว่าโดนดาเมจตามเงื่อนไข β\n"
     "ต้องชนก่อน β หมดเวลา: เวลาไม่มาก",
     "④ Bump those same two shapes on the even side\n"
     "North: the β tank alone\n"
     "South: the β healer + β DPS, three people\n"
     "A bumped shape lets off a circle AoE: that hit is the damage β needs\n"
     "Bump before β runs out: there's little time",
     strict=False, pic=34, scene=S.mana4(),
     refs=[FR("blood-mana-bump", 1194, "β ไปชนรูปทรงให้หยุด: รูปทรงปล่อย AoE วงกลมใส่คนชน", "β bump a shape to stop it: it lets off a circle on whoever bumps it")])
step(P2, MC, "⑤ ไปฝั่งที่เขียวกับส้มถูกดูดก่อน", "⑤ To the side where green and orange go first",
     "⑤ รูปทรงถูกดูดเข้าหาลูกบอลขาว\nไปฝั่งที่สีเขียวกับสีส้มถูกดูดเข้าก่อน (ภาพ: ตะวันออก)",
     "⑤ The shapes are drawn into the white orbs\nGo to the side where green and orange are drawn in first (picture: east)",
     strict=False, pic=35, scene=S.mana5())
step(P2, MC, "⑥ α / β กลับด้าน รอเหนือ-ใต้ของวัตถุ", "⑥ α / β flip; wait north or south of the object",
     "⑥ ผ่าน Mutating Cells (debuff) แล้วได้ α / β ใหม่: ได้ตรงข้ามกับครั้งแรกเสมอ\n"
     "Tank ที่ได้ β ถือบอส\n"
     "รอทางเหนือหรือใต้ของวัตถุที่ลูกบอลขาวกลายร่าง\n"
     "ลูกบอลขาวดูดรูปทรงครบแล้ว AoE จะลง",
     "⑥ After Mutating Cells (the debuff) you get α / β again: always the opposite of the first\n"
     "The β tank holds the boss\n"
     "Wait north or south of the object the white orb became\n"
     "The AoEs go off once the orb has drawn in every shape",
     strict=False, pic=36, scene=S.mana6(),
     refs=[FR("blood-mana-objects", 1208, "ลูกบอลขาวกลายเป็นวัตถุ: รอทางเหนือหรือใต้ของวัตถุฝั่งที่ถูกต้อง", "The orbs become objects: wait north or south of the right one")])
step(P2, MC, "⑦ ชุดแรกลง: เหนือ-ใต้ของวัตถุปลอดภัย", "⑦ First set: north / south of the object is safe",
     "⑦ AoE ของ 2 รูปทรงที่ถูกดูดก่อนลงทั้งฝั่งตะวันออกและตะวันตก\n"
     "ถ้าทำถูก ทางเหนือ / ใต้ของวัตถุจะปลอดภัยเสมอ (ภาพ: ส้ม + เขียว)",
     "⑦ The AoEs of the two shapes drawn in first go off, east and west\n"
     "Done right, north / south of the object is always safe (picture: orange + green)",
     strict=False, pic=37, scene=S.mana7(True))
step(P2, MC, "⑧ ย้ายไปอีกฝั่ง", "⑧ Cross to the other side",
     "⑧ ย้ายไปอีกฝั่งก่อนชุดที่ 2 ลง\nเช็ก α / β ของตัวเองอีกรอบตรงนี้",
     "⑧ Cross to the other side before the second set\nCheck your α / β again here",
     strict=False, pic=38, scene=S.mana7(False))
step(P2, MC, "⑨ Netherworld Far", "⑨ Netherworld Far",
     "⑨ ถ้าเป็น Netherworld Far: โจมตีคนที่อยู่ไกล\nβ ออกไปนอกวง target\nα อยู่ใต้บอส",
     "⑨ Netherworld Far hits the farthest\nβ outside the target circle\nα under the boss",
     strict=False, pic=39, scene=S.mana9(True))
step(P2, MC, "⑩ Netherworld Near", "⑩ Netherworld Near",
     "⑩ ถ้าเป็น Netherworld Near: โจมตีคนที่อยู่ใกล้\nβ เข้าใต้บอส\nα ออกไปนอกวง target\n\n"
     "หลัง Near / Far มี raid-wide ทันที: อย่าลืม mitigate\nต่อด้วยท่าแรง แล้ว raid-wide อีกครั้ง: แบ่ง mitigate ให้พอทั้งสองครั้ง",
     "⑩ Netherworld Near hits the nearest\nβ under the boss\nα outside the target circle\n\n"
     "A raid-wide follows Near / Far at once: don't forget to mitigate\nThen a heavy hit, then another raid-wide: spread your mitigation over both",
     strict=False, pic=40, scene=S.mana9(False))
step(P2, MC, "รูปทรงและ debuff", "Shapes and debuffs",
     "ลูกบอลขาว: ดูดรูปทรงเข้าไป (ดูดครบแล้วกลายเป็นวัตถุ)\n"
     "น้ำเงิน: AoE วงกลม\nเขียว: AoE donut\nส้ม: กรวยออกด้านข้าง\nม่วง: กรวยหน้า-หลัง\n\n"
     "Mutation α: ห้ามโดนดาเมจจนกว่า debuff หมด / Tank โดน auto-attack ของบอสก็ไม่ได้: ต้องสลับ\n"
     "Mutation β: ต้องโดนดาเมจก่อน debuff หมด\n"
     "พลาดทั้งสองแบบ: debuff หมดแล้วโดนดาเมจ + ดาเมจที่ทำลดลง\n"
     "Mutating Cells: ได้ตอน α / β หมด แล้วกลายเป็นแบบตรงข้ามกับครั้งแรก\n\n"
     "สรุป: คิดถึงเงื่อนไข α / β แล้วไปชนรูปทรงก่อนถูกดูด เพื่อหยุดบางรูปทรง ปรับ AoE ที่จะลงให้เกิดจุดปลอดภัย",
     "White orb: draws the shapes in (and becomes an object once full)\n"
     "Blue: circle AoE\nGreen: donut AoE\nOrange: side cones\nPurple: front / back cones\n\n"
     "Mutation α: take no damage until it ends / a tank can't even take the boss's auto-attacks: swap\n"
     "Mutation β: take damage before it ends\n"
     "Fail either: damage when it ends + damage dealt down\n"
     "Mutating Cells: given when α / β end, turning into the opposite of the first\n\n"
     "In short: mind α / β and bump shapes before they're drawn in, stopping some to shape the AoEs into a safe spot",
     strict=False)

# ================================================================== Idyllic Dream
ID = "Idyllic Dream"
step(P3, ID, "ภาพรวม", "Overview",
     "Mechanic ใหญ่ยาวกว่า 3 นาที ยากที่สุดของไฟต์\n"
     "บอสแสดงสัญลักษณ์การโจมตีไว้ก่อน แล้วการโจมตีจริงมาทีหลัง: ของที่จำตอนแรกสุดมาลงตอนท้ายสุด\n"
     "เข้าใจแล้ว สิ่งที่ต้องทำจริงไม่ซับซ้อน: จำลำดับและสิ่งที่ต้องทำให้ได้ก่อน\n\n"
     "แผนของ game8: แผน One Ace (ตามวิดีโอ Nukemaru) ใช้ macro ติดมาร์ก\n"
     "ภาพทั้งหมดเป็นแบบ: ร่างแยกแนวทแยง (X) โผล่ก่อน / A เป็น stack / ฝั่ง 3-4 ปลอดภัย",
     "A big Mechanic over three minutes long, the hardest of the fight\n"
     "Attacks are shown first and land later: what you memorise first comes last\n"
     "Once understood, what you do is simple: learn the order and your jobs first\n\n"
     "game8's plan: One Ace's (from Nukemaru's video), with marker macros\n"
     "Every picture shows: diagonal (X) clones first / A a stack / the 3-4 side safe",
     strict=False,
     refs=[FR("idyllic-dream", 1252, "Idyllic Dream: บอสร่าย แล้วเริ่ม Mechanic ยาวกว่า 3 นาที", "Idyllic Dream: the cast, then a Mechanic over three minutes long")])
step(P3, ID, "① ร่างแยกแนวทแยงโผล่ก่อน", "① Diagonal clones first",
     "① บอสร่าย Staging: ร่างแยกโผล่แนวทแยง (X) ก่อน\nจำไว้ว่าแนวไหนโผล่ก่อน (X หรือ +): ใช้ตอนท้าย",
     "① The boss casts Staging: clones appear on the diagonals (X) first\nRemember which came first (X or +): it matters at the end",
     strict=False, pic=50, scene=S.dr1(),
     refs=[FR("dream-player-clones", 1290, "Staging: ร่างแยก 4 ตัวโผล่ก่อน จำว่าแนวทแยงหรือแนวตรง", "Staging: four clones appear first; note diagonals or cardinals")])
step(P3, ID, "② ต่อด้วยร่างแยกแนวตรง", "② Then the cardinal clones",
     "② ต่อด้วยร่างแยกแนวตรง (+) อีก 4 ตัว",
     "② Then four more clones on the cardinals (+)",
     strict=False, pic=51, scene=S.dr2())
step(P3, ID, "③ ไปหน้าร่างแยกของตัวเอง", "③ To your own clone",
     "③ ร่างแยกโยงสายมาที่ทุกคน: ไปยืนหน้าร่างแยกของตัวเอง",
     "③ Each clone tethers a player: stand in front of yours",
     strict=False, pic=52, scene=S.dr3())
step(P3, ID, "④ สลับที่ 1 ⇔ B และ 4 ⇔ C", "④ Swap 1 ⇔ B and 4 ⇔ C",
     "④ คนที่อยู่ 1 กับ B สลับที่กัน / คนที่อยู่ 4 กับ C สลับที่กัน\n1 ⇔ B\n4 ⇔ C",
     "④ The players at 1 and B swap / the players at 4 and C swap\n1 ⇔ B\n4 ⇔ C",
     strict=False, pic=53, scene=S.dr4())
step(P3, ID, "⑤ กด macro ติดมาร์ก", "⑤ Press your marker macro",
     "⑤ สลับเสร็จแล้ว กด macro ของตำแหน่งที่ยืนอยู่ตอนนี้ เพื่อติดมาร์กให้ตัวเอง\n"
     "A: Attack 4 / 2: Attack 1 / B: Attack 3 / 3: Attack 2\n"
     "C: Bind 1 / 4: Ignore 1 / D: Bind 2 / 1: Ignore 2",
     "⑤ After swapping, press the macro for where you now stand to mark yourself\n"
     "A: Attack 4 / 2: Attack 1 / B: Attack 3 / 3: Attack 2\n"
     "C: Bind 1 / 4: Ignore 1 / D: Bind 2 / 1: Ignore 2",
     strict=False, pic=54, scene=S.dr5())
step(P3, ID, "⑥ ร่างแยก 3 ตัว: จำฝั่งปลอดภัย", "⑥ Three clones: remember the safe side",
     "⑥ Twisted Vision: สนามเปลี่ยนเป็นอีกโลก ร่างแยก 3 ตัวโผล่พร้อมสัญลักษณ์ AoE\nจำไว้: ภาพนี้ฝั่ง marker 3-4 ปลอดภัย",
     "⑥ Twisted Vision: the arena turns into another world; three clones appear showing their AoEs\nRemember: here the 3-4 marker side is safe",
     strict=False, pic=55, scene=S.dr6(),
     refs=[FR("dream-three-clones", 1348, "ร่างแยก 3 ตัวเรียงกลางสนาม: ยังไม่ลง จำว่าฝั่ง 1-2 หรือ 3-4 ปลอดภัย", "Three clones down the middle: not yet; note whether 1-2 or 3-4 is safe")])
step(P3, ID, "⑦ A เป็น stack: ยืนที่เดิม", "⑦ A a stack: stay",
     "⑦ Twisted Vision อีกครั้ง: กลับโลกจริง\n"
     "ร่างแยกโผล่ มีสัญลักษณ์เหนือหัว: stack หรือวงกลมใหญ่ (มี knockback)\n"
     "ร่างแยกที่ A กับ C เป็น stack: ยืนที่เดิม\n"
     "ภาพต่อจากนี้ใช้แบบที่ A กับ C เป็น stack",
     "⑦ Twisted Vision again: back to the real arena\n"
     "Clones appear showing a stack or a big circle with knockback over their heads\n"
     "The clones at A and C are stacks: stay where you are\n"
     "The pictures from here show A and C as stacks",
     strict=False, pic=56, scene=S.dr7a(),
     refs=[FR("dream-boss-clones", 1380, "ร่างแยกโผล่ มีสัญลักษณ์ stack หรือวงกลมใหญ่ ดูตัวที่ A", "Clones appear, each showing a stack or a big circle; check the one at A")])
step(P3, ID, "⑧ A เป็นวงกลม: สลับกับคนข้างๆ", "⑧ A a circle: swap with your neighbour",
     "⑧ ร่างแยกที่ A กับ C เป็นวงกลม: สลับที่กับคนข้างๆ\n"
     "เป้าหมาย: คนที่มีมาร์ก Attack 1 / Attack 2 / Ignore 1 / Ignore 2 ต้องได้สายวงกลม\n"
     "ในภาพไม่ได้วาดสาย แต่จริงๆ ต้องรับสายที่กำหนด",
     "⑧ The clones at A and C are circles: swap with your neighbour\n"
     "The aim: Attack 1 / Attack 2 / Ignore 1 / Ignore 2 must hold the circle tethers\n"
     "No tethers are drawn, but take the ones assigned",
     strict=False, pic=57, scene=S.dr7b())
step(P3, ID, "⑨ AoE ของขั้น ⑥ ลง: ไปฝั่ง 3-4", "⑨ ⑥'s AoEs land: to the 3-4 side",
     "⑨ Twisted Vision: สนามเปลี่ยนเป็นอีกโลก AoE ที่เห็นในขั้น ⑥ ลง: รีบหลบ\nขั้น ⑥ เป็นแบบ 3-4 ปลอดภัย: ไปฝั่ง 3-4",
     "⑨ Twisted Vision: another world; the AoEs shown in ⑥ land: move at once\n⑥ was 3-4 safe: go to the 3-4 side",
     strict=True, pic=58, scene=S.dr9(),
     says={s: "กลุ่ม MT: ฝั่ง 4 (ตะวันตก)" for s in ("MT", "H1", "D1", "D3")} | {s: "กลุ่ม ST: ฝั่ง 3 (ตะวันออก)" for s in ("ST", "H2", "D2", "D4")},
     says_en={s: "MT group: the 4 side (west)" for s in ("MT", "H1", "D1", "D3")} | {s: "ST group: the 3 side (east)" for s in ("ST", "H2", "D2", "D4")},
     refs=[FR("twisted-vision", 1416, "Twisted Vision ร่ายเสร็จ: AoE ที่เห็นก่อนหน้าลงจริง รีบไปฝั่งปลอดภัย", "Twisted Vision ends: the AoEs shown earlier land; move to the safe side")])
ISL_SAYS = {s: "เกาะ D (ตะวันตก)" for s in ("MT", "H1", "D1", "D3")} | {s: "เกาะ B (ตะวันออก)" for s in ("ST", "H2", "D2", "D4")}
ISL_SAYS_EN = {s: "The D island (west)" for s in ("MT", "H1", "D1", "D3")} | {s: "The B island (east)" for s in ("ST", "H2", "D2", "D4")}
step(P3, ID, "⑩ Lindwurm's Meteor: แยกเกาะ", "⑩ Lindwurm's Meteor: two islands",
     "⑩ บอสร่าย Lindwurm's Meteor (raid-wide แรงมาก) แล้วต่อด้วย Downfall: เหลือเกาะตะวันออกกับตะวันตก ที่เหลือพัง\n"
     "กลุ่ม MT ไปเกาะ D (ตะวันตก)\nกลุ่ม ST ไปเกาะ B (ตะวันออก)",
     "⑩ The boss casts Lindwurm's Meteor (a very heavy raid-wide), then Downfall: an east and a west island stay, the rest falls\n"
     "MT group to the D island (west)\nST group to the B island (east)",
     strict=True, pic=59, scene=S.dr10(), says=ISL_SAYS, says_en=ISL_SAYS_EN,
     refs=[FR("lindwurms-meteor", 1426, "Lindwurm's Meteor: raid-wide แรงมาก แล้วสนามเหลือ 2 เกาะ", "Lindwurm's Meteor: a very heavy raid-wide, then only two islands")])
TW_SAYS = {"H1": "เกาะ D: tower ขอบนอก แถวเหนือ (ภาพ: ดิน)", "MT": "เกาะ D: tower ฝั่งบอส แถวเหนือ (ภาพ: ลม)",
           "D3": "เกาะ D: tower ขอบนอก แถวใต้ (ภาพ: มืด)", "D1": "เกาะ D: tower ฝั่งบอส แถวใต้ (ภาพ: ไฟ)",
           "D2": "เกาะ B: tower ฝั่งบอส แถวเหนือ (ภาพ: ดิน)", "D4": "เกาะ B: tower ขอบนอก แถวเหนือ (ภาพ: ลม)",
           "ST": "เกาะ B: tower ฝั่งบอส แถวใต้ (ภาพ: มืด)", "H2": "เกาะ B: tower ขอบนอก แถวใต้ (ภาพ: ไฟ)"}
TW_SAYS_EN = {"H1": "D island: outer tower, north row (picture: earth)", "MT": "D island: boss-side tower, north row (picture: wind)",
              "D3": "D island: outer tower, south row (picture: dark)", "D1": "D island: boss-side tower, south row (picture: fire)",
              "D2": "B island: boss-side tower, north row (picture: earth)", "D4": "B island: outer tower, north row (picture: wind)",
              "ST": "B island: boss-side tower, south row (picture: dark)", "H2": "B island: outer tower, south row (picture: fire)"}
step(P3, ID, "⑪ tower 4 อันต่อเกาะ", "⑪ Four towers an island",
     "⑪ แต่ละเกาะมี tower 4 อัน พร้อมวัตถุธาตุ: ดิน / ไฟ / ลม (แสง) / มืด (แสง)\n"
     "Melee เข้า tower ฝั่งบอส / Range เข้า tower ขอบนอก\n"
     "หันหน้าหาบอส: ขวาเป็น DPS / ซ้ายเป็น Tank·Healer",
     "⑪ Each island has four towers with element objects: earth / fire / wind (light) / dark (light)\n"
     "Melee take the boss-side towers / range the outer ones\n"
     "Facing the boss: DPS on the right / tank and healer on the left",
     strict=True, pic=60, scene=S.dr11(), says=TW_SAYS, says_en=TW_SAYS_EN,
     refs=[FR("dream-towers", 1450, "tower ธาตุบนเกาะ: ดิน / ไฟ / ลม / มืด (ยังเป็นแค่สัญลักษณ์) จำ tower ของตัวเอง", "Element towers on the islands: earth / fire / wind / dark (still only shown); remember yours")])
step(P3, ID, "⑫ Arcadian Arcanum", "⑫ Arcadian Arcanum",
     "⑫ บอสร่าย Arcadian Arcanum: AoE ใส่ฝั่ง DPS หรือฝั่ง Tank·Healer\nคนที่โดนติด debuff Light Resistance Down",
     "⑫ The boss casts Arcadian Arcanum: AoEs on either the DPS or the tanks and healers\nThose hit get Light Resistance Down",
     strict=True, pic=61, scene=S.dr12(), says=TW_SAYS, says_en=TW_SAYS_EN)
step(P3, ID, "⑬ ติด Light Resistance Down: สลับ tower", "⑬ Light Resistance Down: swap towers",
     "⑬ ติด Light Resistance Down แล้วเข้า tower มืด (แสง) / ลม (แสง) ไม่ได้: สลับกับคนข้างๆ\n"
     "ติด debuff แต่ tower ของตัวเองไม่ใช่มืด / ลม: ไม่ต้องสลับ\n"
     "ตอนนี้ยังเป็นแค่สัญลักษณ์: จำตำแหน่ง tower ของตัวเองไว้พอ\n\n"
     "ภาพ: Tank·Healer โดน → MT สลับกับ D1 / ST สลับกับ D2",
     "⑬ With Light Resistance Down you can't take a dark (light) / wind (light) tower: swap with your neighbour\n"
     "Debuffed, but your tower isn't dark / wind: no swap\n"
     "It's still only shown: just remember your tower's spot\n\n"
     "Picture: tanks and healers hit → MT swaps with D1 / ST swaps with D2",
     strict=True, pic=62, scene=S.dr15(),
     says={"H1": "tower ขอบนอก แถวเหนือ (ดิน): ไม่ต้องสลับ", "D1": "สลับกับ MT: ไป tower ฝั่งบอส แถวเหนือ (ลม)",
           "D3": "tower ขอบนอก แถวใต้ (มืด)", "MT": "ติด debuff: สลับกับ D1 ไป tower ฝั่งบอส แถวใต้ (ไฟ)",
           "ST": "ติด debuff: สลับกับ D2 ไป tower ฝั่งบอส แถวเหนือ (ดิน)", "D4": "tower ขอบนอก แถวเหนือ (ลม)",
           "D2": "สลับกับ ST: ไป tower ฝั่งบอส แถวใต้ (มืด)", "H2": "tower ขอบนอก แถวใต้ (ไฟ): ไม่ต้องสลับ"},
     says_en={"H1": "Outer tower, north row (earth): no swap", "D1": "Swap with MT: the boss-side tower, north row (wind)",
              "D3": "Outer tower, south row (dark)", "MT": "Debuffed: swap with D1, to the boss-side tower, south row (fire)",
              "ST": "Debuffed: swap with D2, to the boss-side tower, north row (earth)", "D4": "Outer tower, north row (wind)",
              "D2": "Swap with ST: the boss-side tower, south row (dark)", "H2": "Outer tower, south row (fire): no swap"})
step(P3, ID, "⑭ กลับโลกจริง: Attack ตะวันออก / Ignore + Bind ตะวันตก", "⑭ Back to the real arena: Attack east / Ignore + Bind west",
     "⑭ Twisted Vision: กลับโลกจริง ต่อไปคือ stack กับวงกลมใหญ่สลับกัน (จากขั้น ⑦)\n"
     "ขั้น ⑦ ร่างแยก A เป็นวงกลม → เริ่มด้วยวงกลม / เป็น stack → เริ่มด้วย stack\n"
     "มาร์ก Ignore กับ Bind: ฝั่งตะวันตก\nมาร์ก Attack: ฝั่งตะวันออก\nทำตามนี้ทั้งหมด\n\n"
     "ภาพ: stack มาก่อน",
     "⑭ Twisted Vision: back to the real arena; next, stacks and big circles take turns (from ⑦)\n"
     "In ⑦ the A clone was a circle → circles first / a stack → stacks first\n"
     "Ignore and Bind markers: the west\nAttack markers: the east\nEverything resolves that way\n\n"
     "Picture: stacks first",
     strict=False, pic=63, scene=S.dr16(),
     refs=[FR("dream-stacks", 1503, "stack กับวงกลมใหญ่สลับกัน: มาร์ก Attack ฝั่งตะวันออก / Ignore + Bind ฝั่งตะวันตก", "Stacks and big circles in turn: Attack markers east / Ignore + Bind west")])
step(P3, ID, "⑮ stack ลง", "⑮ The stacks",
     "⑮ stack ลง\nต่อไป Attack 1 + Ignore 1 โดนวงกลมใหญ่มี knockback: เตรียมตัว",
     "⑮ The stacks go off\nNext, Attack 1 + Ignore 1 get big circles with knockback: get ready",
     strict=False, pic=64, scene=S.dr16(True))
step(P3, ID, "⑯ วงกลม: Attack 1 ไป 2 / Ignore 1 ไป 1", "⑯ Circles: Attack 1 to 2 / Ignore 1 to 1",
     "⑯ วงกลมลง: Attack 1 ไปทาง marker 2 / Ignore 1 ไปทาง marker 1 ออกห่างจากทุกคน\n"
     "คนอื่นอยู่ให้พ้นวงกลม\n"
     "ต่อด้วย stack → วงกลม (Attack 2 + Ignore 2) อีก 1 ชุด",
     "⑯ The circles: Attack 1 towards marker 2 / Ignore 1 towards marker 1, away from everyone\n"
     "Everyone else stays clear\n"
     "Then one more set: stack → circles (Attack 2 + Ignore 2)",
     strict=False, pic=65, scene=S.dr18(),
     refs=[FR("dream-circles", 1512, "วงกลมใหญ่มี knockback: Attack 1 / Ignore 1 ออกไปขอบเหนือ คนอื่นรอทางใต้", "Big knockback circles: Attack 1 / Ignore 1 out to the north edge; the rest wait south")])
TWR_SAYS = {"H1": "tower ดิน: รับแล้วออกห่างทันที", "D1": "tower ลม: ยืนฝั่งตรงข้าม (ตะวันออก) ให้กระเด็นไปเกาะ B",
            "D3": "tower มืด: ยืนฝั่งใต้ใน tower", "MT": "tower ไฟ: ห้ามขยับ",
            "ST": "tower ดิน: รับแล้วออกห่างทันที", "D4": "tower ลม: ยืนฝั่งตรงข้าม (ตะวันตก) ให้กระเด็นไปเกาะ D",
            "D2": "tower มืด: ยืนฝั่งใต้ใน tower", "H2": "tower ไฟ: ห้ามขยับ"}
TWR_SAYS_EN = {"H1": "Earth tower: step out right after", "D1": "Wind tower: stand on the far side (east) to fly to the B island",
               "D3": "Dark tower: stand on its south side", "MT": "Fire tower: don't move",
               "ST": "Earth tower: step out right after", "D4": "Wind tower: stand on the far side (west) to fly to the D island",
               "D2": "Dark tower: stand on its south side", "H2": "Fire tower: don't move"}
step(P3, ID, "⑰ tower ลง", "⑰ The towers",
     "⑰ Twisted Vision: สนามเปลี่ยน tower ที่เห็นในขั้น ⑩–⑬ ลง\n"
     "tower มืด: ยืนฝั่งใต้ใน tower ให้ลำแสงพุ่งออกขอบนอก\n"
     "tower ลม: ยืนฝั่งตรงข้ามใน tower ให้กระเด็นไปเกาะตรงข้าม",
     "⑰ Twisted Vision: the towers shown in ⑩–⑬ land\n"
     "Dark tower: stand on its south side so the beam goes out over the edge\n"
     "Wind tower: stand on the far side so you're thrown to the other island",
     strict=True, pic=66, scene=S.dr19(), says=TWR_SAYS, says_en=TWR_SAYS_EN,
     refs=[FR("towers-resolve", 1564, "tower ลงจริง: ลมพาข้ามเกาะ / มืดยิงลำแสง / ไฟห้ามขยับ / ดินออกห่าง", "The towers land: wind throws you across / dark fires a beam / fire: don't move / earth: step out")])
AFTER_SAYS = {"H1": "tower ดิน: ไม่มี debuff (ต่อไปล่อ Far)", "D4": "ได้ debuff Faraway Portent (Far)", "MT": "Hot-blooded: ห้ามขยับจนหมด",
              "D3": "ได้ Nearby Portent (Near) + Doom: รอ Esuna", "ST": "tower ดิน: ไม่มี debuff (ต่อไปล่อ Near)",
              "D1": "ได้ debuff Faraway Portent (Far)", "H2": "Hot-blooded: ห้ามขยับจนหมด", "D2": "ได้ Nearby Portent (Near) + Doom: รอ Esuna"}
AFTER_SAYS_EN = {"H1": "Earth tower: no debuff (bait Far next)", "D4": "Faraway Portent (Far)", "MT": "Hot-blooded: don't move till it ends",
                 "D3": "Nearby Portent (Near) + Doom: wait for Esuna", "ST": "Earth tower: no debuff (bait Near next)",
                 "D1": "Faraway Portent (Far)", "H2": "Hot-blooded: don't move till it ends", "D2": "Nearby Portent (Near) + Doom: wait for Esuna"}
step(P3, ID, "⑱ หลัง tower: debuff", "⑱ After the towers: debuffs",
     "⑱ คน tower ไฟ: ห้ามขยับจน debuff หมด (โจมตีได้)\n"
     "จุด tower ดิน: AoE ขึ้นจากพื้น (game8 เรียกว่าหน่อไม้) ออกห่าง\n"
     "คน tower มืด: ได้ debuff Near / คน tower ลม: ได้ debuff Far\n"
     "คน tower มืดติด Doom ด้วย: Healer ใช้ Esuna",
     "⑱ Fire tower: don't move until the debuff ends (attacking is fine)\n"
     "Where the earth tower was: an AoE bursts up from the floor (game8 calls them bamboo shoots); keep away\n"
     "Dark tower: a Near debuff / wind tower: a Far debuff\n"
     "The dark tower also gives Doom: healers, Esuna it",
     strict=True, pic=67, scene=S.dr20(), says=AFTER_SAYS, says_en=AFTER_SAYS_EN)
NF_SAYS = {"H1": "Range ไม่มีหน้าที่: ล่อ Far ทางเหนือ (ระวัง AoE ของ tower ดิน)", "H2": "Range ไม่มีหน้าที่: ล่อ Far ทางเหนือ (ระวัง AoE ของ tower ดิน)",
           "D4": "Far: ฝั่งใต้ บนเส้นวง target", "D1": "Far: ฝั่งใต้ บนเส้นวง target",
           "D3": "Near: มุม marker ตัวเลขฝั่งใต้", "D2": "Near: มุม marker ตัวเลขฝั่งใต้",
           "MT": "Melee ไม่มีหน้าที่: ล่อ Near ทางใต้", "ST": "Melee ไม่มีหน้าที่: ล่อ Near ทางใต้"}
NF_SAYS_EN = {"H1": "Free range: bait Far in the north (mind the earth tower's AoE)", "H2": "Free range: bait Far in the north (mind the earth tower's AoE)",
              "D4": "Far: south side, on the target circle", "D1": "Far: south side, on the target circle",
              "D3": "Near: the corner of the south number marker", "D2": "Near: the corner of the south number marker",
              "MT": "Free melee: bait Near in the south", "ST": "Free melee: bait Near in the south"}
step(P3, ID, "⑲ ล่อ Near / Far", "⑲ Bait Near / Far",
     "⑲ ล่อ Near / Far\n"
     "Far: ฝั่งใต้ ยืนบนเส้นวง target\n"
     "Near: มุม marker ตัวเลขฝั่งใต้\n"
     "Melee ที่ไม่มีหน้าที่: ล่อ Near ทางใต้\n"
     "Range ที่ไม่มีหน้าที่: ล่อ Far ทางเหนือของสนาม (ระวัง AoE ของ tower ดิน)",
     "⑲ Bait Near / Far\n"
     "Far: south side, on the target circle\n"
     "Near: the corner of the south number marker\n"
     "Free melee: bait Near in the south\n"
     "Free range: bait Far in the north of the arena (mind the earth tower's AoE)",
     strict=True, pic=68, scene=S.dr21(), says=NF_SAYS, says_en=NF_SAYS_EN,
     refs=[FR("near-far", 1584, "Near / Far: คนมี debuff ยิงกรวย คนไม่มีหน้าที่เป็นคนล่อ", "Near / Far: the debuffed fire the cones; the free players bait them")])
step(P3, ID, "⑳ Temporal Curtain: ร่างแยกถูกดูด", "⑳ Temporal Curtain: a clone is drawn in",
     "⑳ บอสร่าย Temporal Curtain: ร่างแยก 3 ตัวจากขั้น ⑥ โผล่อีกครั้ง\n"
     "ร่างแยกตัวเหนือหรือตัวใต้ถูกดูดเข้ารอยแยกมิติ (ภาพ: ตัวเหนือ)\n"
     "ขั้น ⑥ เป็นแบบ 3-4 ปลอดภัย → ตัวเหนือคือตัวที่ยิงกรวยด้านข้าง: จำไว้",
     "⑳ The boss casts Temporal Curtain: the three clones from ⑥ come back\n"
     "The north or south clone is drawn into a rift (picture: the north one)\n"
     "⑥ was 3-4 safe → the north clone is the side-cone one: remember it",
     strict=False, pic=69, scene=S.dr22(),
     refs=[FR("temporal-curtain", 1602, "Temporal Curtain: ร่างแยกตัวเหนือหรือใต้ถูกดูดเข้ารอยแยก จำว่าตัวไหน", "Temporal Curtain: the north or south clone is drawn into the rift; note which")])
step(P3, ID, "㉑ ร่างแยกย้ายไปเกาะ", "㉑ The clones move to the islands",
     "㉑ ร่างแยกตรงกลาง (วงกลม) กับตัวใต้ (กรวยหน้า-หลัง) ย้ายไปเกาะตะวันออก / ตะวันตก\n"
     "เกาะที่ร่างแยกวงกลมไป = ห้ามไป: ภาพนี้ห้ามไปเกาะ D จำไว้",
     "㉑ The middle clone (circle) and the south clone (front / back cones) move to the east / west islands\n"
     "Wherever the circle clone goes is off limits: here, not the D island; remember it",
     strict=False, pic=70, scene=S.dr23(),
     refs=[FR("clones-to-islands", 1617, "ร่างแยก 2 ตัวย้ายไปเกาะละตัว: เกาะที่ตัวกลาง (วงกลม) ไปคือห้ามไป", "Two clones go one to each island: the middle (circle) clone's island is off limits")])
GRP = lambda th_mt, th_st, en_mt, en_st: ({s: th_mt for s in ("MT", "H1", "D1", "D3")} | {s: th_st for s in ("ST", "H2", "D2", "D4")},
                                          {s: en_mt for s in ("MT", "H1", "D1", "D3")} | {s: en_st for s in ("ST", "H2", "D2", "D4")})
s22, e22 = GRP("กลุ่ม MT: stack นอก marker 1", "กลุ่ม ST: stack นอก marker 4", "MT group: stack outside marker 1", "ST group: stack outside marker 4")
step(P3, ID, "㉒ ร่างแยกแนว X: stack ที่ 1 / 4", "㉒ The X clones: stacks at 1 / 4",
     "㉒ Twisted Vision: ขั้น ① ร่างแยกโผล่แนว X ก่อน → stack ลงที่ฝั่ง 1-4 / วงกลมลงที่ฝั่ง 2-3\n"
     "หันหน้าเข้ากลางสนาม: กลุ่ม MT ซ้าย (แนว X = 1) / กลุ่ม ST ขวา (แนว X = 4) รับ stack\n"
     "stack ยิงจากร่างแยก: ยืนให้พ้น Mana Burst แต่ยังอยู่ใน stack ของร่างแยก",
     "㉒ Twisted Vision: in ① the X clones came first → stacks on the 1-4 side / circles on the 2-3 side\n"
     "Facing the middle: MT group on the left (X: 1) / ST group on the right (X: 4) take the stacks\n"
     "The stacks come from the clones: stay out of Mana Burst but inside the clone's stack",
     strict=True, pic=71, scene=S.dr24(), says=s22, says_en=e22,
     refs=[FR("clone-stacks", 1650, "ร่างแยกชุดแรกโจมตี: stack 2 กลุ่ม + Mana Burst (วงกลมใหญ่)", "The first clones attack: two group stacks + Mana Burst (big circles)")])
step(P3, ID, "㉓ ไปเกาะ B หลบกรวย", "㉓ To the B island, dodge the cones",
     "㉓ Twisted Vision: สนามเหลือเกาะตะวันออก-ตะวันตก ย้ายระหว่างที่บอสร่ายเพื่อไม่ให้ตก\n"
     "การโจมตีจากขั้น ⑳–㉑ ลง\n"
     "ร่างแยกวงกลมไปเกาะ D → ทุกคนไปเกาะ B\n"
     "เกาะ B มีร่างแยกกรวยหน้า-หลัง: ยืนตามภาพเพื่อหลบ",
     "㉓ Twisted Vision: only the east and west islands again; move during the cast so you don't fall\n"
     "The attacks from ⑳–㉑ land\n"
     "The circle clone went to the D island → everyone to the B island\n"
     "The B island has the front / back cone clone: stand as drawn to dodge",
     strict=False, pic=72, scene=S.dr25(),
     refs=[FR("island-cleave", 1664, "บนเกาะ: ร่างแยกกรวยยิงตามทิศที่เห็นตอนแรก อีกเกาะโดนวงกลมทั้งเกาะ", "On the islands: the cone clone fires as first shown; the other island is all one circle")])
s24, e24 = GRP("กลุ่ม MT: stack นอก marker A", "กลุ่ม ST: stack นอก marker D", "MT group: stack outside marker A", "ST group: stack outside marker D")
step(P3, ID, "㉔ ร่างแยกแนว +: stack ที่ A / D", "㉔ The + clones: stacks at A / D",
     "㉔ Twisted Vision: กลับโลกจริง ร่างแยกแนว X โจมตีจบแล้ว ต่อด้วยร่างแยกแนว +\n"
     "เหมือนขั้น ㉒: กลุ่ม MT ซ้าย (แนว + = A) / กลุ่ม ST ขวา (แนว + = D) รับ stack\n"
     "ยืนให้พ้น Mana Burst แต่ยังอยู่ใน stack ของร่างแยก",
     "㉔ Twisted Vision: back to the real arena; the X clones are done, the + clones follow\n"
     "As in ㉒: MT group left (+: A) / ST group right (+: D) take the stacks\n"
     "Stay out of Mana Burst but inside the clone's stack",
     strict=True, pic=73, scene=S.dr26(), says=s24, says_en=e24)
step(P3, ID, "㉕ ร่างแยกที่ถูกดูดกลับมา", "㉕ The drawn-in clone returns",
     "㉕ สุดท้าย ร่างแยกที่ถูกดูดในขั้น ⑳ โผล่ออกมาโจมตี: หลบ\n"
     "เป็นตัวเหนือของแบบ 3-4 ปลอดภัย → กรวยด้านข้าง: หนีไปฝั่ง 3-4 / ฝั่งใต้\n"
     "จบ Idyllic Dream",
     "㉕ Last, the clone drawn in at ⑳ comes out and attacks: dodge\n"
     "It's the north clone of a 3-4-safe pattern → side cones: go to the 3-4 side / the south\n"
     "End of Idyllic Dream",
     strict=False, pic=74, scene=S.dr27(),
     refs=[FR("last-clone", 1690, "ร่างแยกที่ถูกดูดกลับมาทางเหนือ ยิงกรวยตามทิศเดิม", "The drawn-in clone returns in the north and fires its cones as before")])
step(P3, ID, "ชนิดของ tower (1): มืด / ลม", "Towers (1): dark / wind",
     "tower มืด (แสง, ม่วง): ขึ้นทางใต้\n"
     "ได้ debuff: Nearby Portent (Near) + Doom\n"
     "คนที่ไม่ติด Light Resistance Down เป็นคนเข้า\n"
     "tower ลงแล้วยิงลำแสง: ยืนฝั่งขอบนอกใน tower ให้ลำแสงออกนอกสนาม\n"
     "ติด Doom: Healer ใช้ Esuna\n"
     "ได้ Near แล้วไปยืนมุม marker ตัวเลขฝั่งใต้ / ลำแสงของ Near: Melee ที่ไม่มีหน้าที่เป็นคนล่อ\n\n"
     "tower ลม (แสง, เขียว): ขึ้นทางเหนือ\n"
     "ได้ debuff: Faraway Portent (Far)\n"
     "คนที่ไม่ติด Light Resistance Down เป็นคนเข้า\n"
     "tower ลงแล้วกระเด็นไกล: ยืนฝั่งตรงข้ามใน tower ให้กระเด็นไปเกาะตรงข้าม\n"
     "ได้ Far แล้วไปยืนบนวง target ฝั่งใต้",
     "Dark tower (light, purple): appears in the south\n"
     "Gives: Nearby Portent (Near) + Doom\n"
     "Taken by someone without Light Resistance Down\n"
     "It fires a beam when it lands: stand on its outer side so the beam goes off the arena\n"
     "Doom: healers, Esuna it\n"
     "With Near, stand at the corner of the south number marker / the Near beam is baited by a free melee\n\n"
     "Wind tower (light, green): appears in the north\n"
     "Gives: Faraway Portent (Far)\n"
     "Taken by someone without Light Resistance Down\n"
     "It throws you far when it lands: stand on its far side to land on the other island\n"
     "With Far, stand on the target circle, south side",
     strict=False)
step(P3, ID, "ชนิดของ tower (2): ไฟ / ดิน", "Towers (2): fire / earth",
     "tower ไฟ: ขึ้นทางใต้\n"
     "ได้ debuff: Hot-blooded\n"
     "ขยับแล้วโดน: ดาเมจที่ทำลดลง + ดาเมจหนัก + ถูกดีดขึ้นตรงนั้น → tower ลงแล้วห้ามขยับ\n"
     "auto-attack / GCD ใช้ได้ แต่ห้ามใช้ Primal Rend หรือสกิลที่พาตัวเคลื่อนที่\n"
     "debuff หมดแล้วกลายเป็นคนไม่มีหน้าที่: Melee ล่อ Near / Range ล่อ Far\n"
     "ล่อ Near: ยืนใต้คน Near อีกที / ล่อ Far: ทางเหนือของสนาม (Range ระวัง AoE ของ tower ดิน)\n\n"
     "tower ดิน: ขึ้นทางเหนือ\n"
     "ไม่มี debuff (กลายเป็นคนไม่มีหน้าที่)\n"
     "tower ลงราว 5 วินาที AoE วงกลมขึ้นตรงจุด tower ดิน: แค่หลบ\n"
     "คน tower ดินล่อ Near / Far เหมือนคน tower ไฟ\n"
     "Range ที่ไปล่อ Far อาจติด AoE นี้: ระวัง",
     "Fire tower: appears in the south\n"
     "Gives: Hot-blooded\n"
     "Moving brings damage dealt down + heavy damage + a knock-up on the spot → don't move once it lands\n"
     "Auto-attacks / GCDs are fine, but no Primal Rend or any skill that moves you\n"
     "When it ends you're free: melee bait Near / range bait Far\n"
     "Near bait: south of the Near player / Far bait: the north of the arena (range, mind the earth tower's AoE)\n\n"
     "Earth tower: appears in the north\n"
     "No debuff (you're free afterwards)\n"
     "About 5 seconds after it lands, a circle AoE comes up where it stood: just dodge\n"
     "Earth tower players bait Near / Far like the fire tower ones\n"
     "Range heading to the Far bait can be caught by it: careful",
     strict=False)
step(P3, ID, "ลำดับ (1): 4 ส่วนที่ต้องทำ", "Flow (1): the four parts",
     "สิ่งที่ต้องทำจริง แบ่งเป็น 4 ส่วน\n"
     "P1: ร่างแยก 3 ตัว: ฝั่ง 1-2 หรือ 3-4 ปลอดภัย\n"
     "P2: วงกลมใหญ่ + stack ×2: อะไรมาก่อน / Attack + Ignore 1-2 เป็นคนทิ้งวงกลม\n"
     "P3: tower + ล่อ Near / Far: ทำหน้าที่ตาม tower\n"
     "P4: วงกลมใหญ่ + stack + กรวย / วงกลมของร่างแยก 3 ตัว: Staging แนว X หรือ + มาก่อน / ร่างแยกที่ย้ายตอน Temporal Curtain",
     "What you actually do, in four parts\n"
     "P1: the three clones: is 1-2 or 3-4 safe\n"
     "P2: big circles + stacks ×2: which comes first / Attack + Ignore 1-2 drop the circles\n"
     "P3: towers + Near / Far baits: do your tower's job\n"
     "P4: big circles + stacks + the three clones' cones / circle: X or + first at Staging / which clones moved at Temporal Curtain",
     strict=False)
step(P3, ID, "ลำดับ (2): ทีละขั้น", "Flow (2): step by step",
     "1. Staging (P4 แสดง): จำ X หรือ + / สลับ 1-B กับ 4-C (ให้วงกลมใหญ่ไปฝั่ง 2-B-3-C จัดการง่ายขึ้น)\n"
     "2. Twisted Vision → อีกโลก\n"
     "3. Replication (P1 แสดง): ร่างแยก 3 ตัว จำ 1-2 หรือ 3-4\n"
     "4. Twisted Vision → โลกจริง\n"
     "5. Replication (P2 แสดง): A เป็น stack หรือวงกลม (วงกลม: สลับกับคนข้างๆ)\n"
     "6. Twisted Vision → อีกโลก: P1 ลง\n"
     "7. Lindwurm's Meteor: raid-wide แรงมาก เหลือเกาะ B / D (กลุ่ม MT เกาะ D / กลุ่ม ST เกาะ B)\n"
     "8. Downfall + Arcadian Arcanum: P3 แสดง รู้ tower ของตัวเอง\n"
     "9. Twisted Vision → โลกจริง: P2 ลง (stack + วงกลม 2 ชุด)\n"
     "10. Twisted Vision → อีกโลก: P3 ลง (tower + Near / Far)\n"
     "11. Temporal Curtain: ร่างแยก 3 ตัวกลับมา ตัวหนึ่งถูกดูด อีก 2 ตัวไปเกาะ\n"
     "12. Twisted Vision + Reenactment → โลกจริง: P4 ชุดแรก (X หรือ +)\n"
     "13. Twisted Vision → อีกโลก: ร่างแยกวงกลม + ร่างแยกกรวยลง\n"
     "14. Twisted Vision → โลกจริง: P4 ชุดหลัง แล้วร่างแยกที่ถูกดูดโจมตี",
     "1. Staging (P4 shown): remember X or + / swap 1-B and 4-C (so the big circles go to the 2-B-3-C side)\n"
     "2. Twisted Vision → the other world\n"
     "3. Replication (P1 shown): three clones; remember 1-2 or 3-4\n"
     "4. Twisted Vision → the real arena\n"
     "5. Replication (P2 shown): A a stack or a circle (circle: swap with your neighbour)\n"
     "6. Twisted Vision → the other world: P1 lands\n"
     "7. Lindwurm's Meteor: a very heavy raid-wide; only the B / D islands stay (MT group D / ST group B)\n"
     "8. Downfall + Arcadian Arcanum: P3 shown; your tower is set\n"
     "9. Twisted Vision → the real arena: P2 lands (stacks + circles, two sets)\n"
     "10. Twisted Vision → the other world: P3 lands (towers + Near / Far)\n"
     "11. Temporal Curtain: the three clones return; one is drawn in, two go to the islands\n"
     "12. Twisted Vision + Reenactment → the real arena: P4's first set (X or +)\n"
     "13. Twisted Vision → the other world: the circle clone + the cone clone land\n"
     "14. Twisted Vision → the real arena: P4's second set, then the drawn-in clone",
     strict=False)
step(P3, ID, "จำง่าย: ในหรือนอกวง target", "Shortcut: inside or outside the target circle",
     "แบบ 1-2 ปลอดภัย: ตัวเหนือ = กรวยหน้า-หลัง / ตัวใต้ = กรวยด้านข้าง\n"
     "ตัวเหนือถูกดูด → นอกวง target ทั้ง 2 ครั้ง\n"
     "ตัวใต้ถูกดูด → ในวง target ทั้ง 2 ครั้ง\n\n"
     "แบบ 3-4 ปลอดภัย: ตัวเหนือ = กรวยด้านข้าง / ตัวใต้ = กรวยหน้า-หลัง\n"
     "ตัวเหนือถูกดูด → ในวง target ทั้ง 2 ครั้ง\n"
     "ตัวใต้ถูกดูด → นอกวง target ทั้ง 2 ครั้ง\n\n"
     "ครั้งที่ 1 = รอบแรกบนเกาะ / ครั้งที่ 2 = ร่างแยกที่ออกจากรอยแยกตอนท้าย\n"
     "รู้ว่าตัวไหนถูกดูด ก็รู้ทันทีว่าในหรือนอกวง target ที่เหลือแค่ดูว่าร่างแยกตรงกลางไปเกาะไหน\n"
     "หรือจำว่า: ตัวฝั่งปลอดภัยถูกดูด → นอกวง target / ตัวฝั่งตรงข้ามถูกดูด → ในวง target",
     "1-2 safe: north = front / back cones / south = side cones\n"
     "North drawn in → outside the target circle both times\n"
     "South drawn in → inside it both times\n\n"
     "3-4 safe: north = side cones / south = front / back cones\n"
     "North drawn in → inside the target circle both times\n"
     "South drawn in → outside it both times\n\n"
     "1st = the first round on the islands / 2nd = the clone coming out of the rift at the end\n"
     "Once you see which clone is drawn in, inside or outside is settled; then just watch which island the middle clone takes\n"
     "Or: the safe side's clone drawn in → outside / the other side's → inside",
     strict=False)
step(P3, ID, "ภาพ: ปลอดภัยนอกวง target", "Picture: safe outside the target circle",
     "ภาพซ้าย = ครั้งที่ 1 (บนเกาะ) / ภาพขวา = ครั้งที่ 2 (ร่างแยกตัวสุดท้าย)\nแบบนี้จุดปลอดภัยอยู่นอกวง target ของบอส",
     "Left = the 1st (on the island) / right = the 2nd (the last clone)\nHere the safe spot is outside the boss's target circle",
     strict=False, pic=83, scene=S.tc(True))
step(P3, ID, "ภาพ: ปลอดภัยในวง target", "Picture: safe inside the target circle",
     "ภาพซ้าย = ครั้งที่ 1 (บนเกาะ) / ภาพขวา = ครั้งที่ 2 (ร่างแยกตัวสุดท้าย)\nแบบนี้จุดปลอดภัยอยู่ในวง target ของบอส",
     "Left = the 1st (on the island) / right = the 2nd (the last clone)\nHere the safe spot is inside the boss's target circle",
     strict=False, pic=84, scene=S.tc(False))
step(P3, ID, "ระวังพลาด ①: การสลับที่", "Common mistake ①: the swap",
     "สลับ 1 ⇔ B และ 4 ⇔ C ก่อน แล้วค่อยกด macro ที่ตำแหน่งใหม่\n"
     "อย่ากด macro ตอนยังยืนที่เดิมก่อนสลับ\n"
     "เรียงจาก A ตามเข็มนาฬิกา: มาร์ก Attack 4 อัน แล้วตามด้วย Ignore และ Bind 4 อัน เสมอ",
     "Swap 1 ⇔ B and 4 ⇔ C first, then press the macro at your new spot\n"
     "Don't press it on your old spot before the swap\n"
     "Clockwise from A it always reads: four Attack markers, then four Ignore and Bind markers",
     strict=False)
step(P3, ID, "ระวังพลาด ②: วงกลมตอน 3-4 ปลอดภัย", "Common mistake ②: the circle when 3-4 is safe",
     "ตอนย้ายไปเกาะครั้งแรก ถ้าเป็นแบบ 3-4 ปลอดภัย วงกลมของร่างแยกตรงกลางเยื้องลงใต้ ทับจุด marker (แบบ 1-2 ไม่ทับ)\n"
     "แบบ 3-4: ออกไปให้เลย marker ไปทางขอบให้ชัด\n"
     "ตอนวงกลมนี้ พื้นยังไม่พัง: หลบวงกลมก่อนแล้วค่อยไปเกาะของตัวเองก็ได้",
     "On the first move to the islands, if 3-4 is safe, the middle clone's circle sits further south and covers the markers (not when 1-2 is safe)\n"
     "3-4 safe: go clearly past the markers towards the edge\n"
     "The floor hasn't fallen yet at this circle: dodge it first, then go to your island",
     strict=False)
step(P3, ID, "ระวังพลาด ③: ตำแหน่ง stack", "Common mistake ③: where to stack",
     "stack ให้เลย marker ออกไปนิด\n"
     "stack บน marker 3-4 พอดี: Range DPS / Healer ที่ไม่มีสกิลพุ่งหรือ Sprint เดินกลับจากทิ้งวงกลมไกลเกิน ไม่ทัน stack\n"
     "คนมีสกิลพุ่งจะไม่ค่อยรู้ตัว",
     "Stack a little past the markers\n"
     "Right on markers 3-4, range DPS / healers without a dash or Sprint have too far to come back from dropping a circle and miss the stack\n"
     "Players with dashes rarely notice",
     strict=False)
step(P3, ID, "ระวังพลาด ④: stack ช่วงท้าย", "Common mistake ④: the last stacks",
     "stack สุดท้าย (A-D และ 1-4): ฝึกรับนอก marker ให้ติดเป็นนิสัย\n"
     "พอได้ยิน 'stack ที่ A-D' มักไปยืนบน marker: ให้ยืนเลยไปทางขอบ ไม่เหยียบ marker\n"
     "แต่ stack ยิงจากร่างแยก: ยืนให้พ้น Mana Burst และยังอยู่ใน stack ของร่างแยก",
     "The last stacks (A-D and 1-4): make a habit of taking them outside the markers\n"
     "'Stack at A-D' tempts you onto the marker: stand past it towards the edge instead\n"
     "But the stacks come from the clones: stay out of Mana Burst and inside the clone's stack",
     strict=False)
step(P3, ID, "Healer: mitigate + heal ช่วง stack / วงกลม", "Healers: mitigation + heals for the stacks and circles",
     "'วงกลม → stack → วงกลม → stack' หรือ 'stack → วงกลม → stack → วงกลม' เจ็บมาก: ดูแลช่วงนี้เป็นหลัก\n"
     "ช่วงเจ็บจริงมีแค่ชุด stack + วงกลมนี้ กับ Lindwurm's Meteor ตอนแยกเกาะครั้งแรก นอกนั้นแค่ HP เต็มก็พอ\n"
     "อย่าทุ่มทรัพยากรกับ Lindwurm's Meteor มากเกิน\n"
     "Tank กับ Range ช่วยแบ่ง mitigate มาที่วงกลมและ stack ด้วยจะสบายขึ้น\n"
     "ช่วงเข้า tower: auto-attack ใส่ MT เจ็บมาก (ราว 7 ครั้ง): เตรียม Excogitation / Aetherpact / Haima ไว้ก่อน",
     "'Circle → stack → circle → stack' or 'stack → circle → stack → circle' hurts a lot: focus your care there\n"
     "Only that stack + circle run and Lindwurm's Meteor on the first island move really hurt; otherwise full HP is enough\n"
     "Don't pour too much into Lindwurm's Meteor\n"
     "Tanks and range sharing some mitigation for the circles and stacks makes it easier\n"
     "Around the towers MT's auto-attacks hurt (about 7): prepare Excogitation / Aetherpact / Haima beforehand",
     strict=False)

# ================================================================== last part
step(P4, "Double Sobat → Arcadian Hell", "จนถึง enrage", "On to the enrage",
     "หลัง Idyllic Dream: Double Sobat (ท่าแรงใส่ Tank) → Arcadian Hell (raid-wide) 2 ครั้ง → ร่าย enrage\n"
     "ก่อน raid-wide บอสใช้ Replication ที่แค่แบ่งร่าง: อย่าเผลอใช้ mitigate ตรงนั้น\n"
     "Arcadian Hell ครั้งที่ 2 เจ็บกว่าครั้งแรก",
     "After Idyllic Dream: Double Sobat (a tank buster) → Arcadian Hell (raid-wide) twice → the enrage cast\n"
     "Before the raid-wides the boss uses a Replication that only splits it: don't spend mitigation there\n"
     "The second Arcadian Hell hurts more than the first",
     strict=False,
     refs=[FR("arcadian-hell", 2044, "Arcadian Hell: raid-wide หลังบอสแบ่งร่าง ครั้งที่ 2 เจ็บกว่า", "Arcadian Hell: a raid-wide after the boss splits; the second hurts more")])

# ------------------------------------------------------------------ guide
NOTE = ("แผนตาม game8 (วิดีโอของ Nukemaru): Replication แผนตำแหน่งตายตัว / Staging แผน Ushiko / Idyllic Dream แผน One Ace\n"
        "Marker 8 ทิศมาตรฐาน (ดูขั้นแรก)\n"
        "Idyllic Dream ใช้ macro ติดมาร์กให้ตัวเอง 8 อัน (ดู macro)\n\n"
        "คู่ Replication (marker 1 / 2 / 3 / 4): MT·D1 / H2·D4 / ST·D2 / H1·D3\n"
        "หันหน้าหาบอส: DPS ขวา / Tank·Healer ซ้าย\n\n"
        "Double Sobat ใช้ invuln: MT > ST > MT\n\n"
        "Staging: หน้าที่ตามตำแหน่งที่ยืน ไม่ใช่ role (ถือ B เป็นเหนือ)\n\n"
        "กลุ่ม 4:4 (Idyllic Dream)\n"
        "กลุ่ม MT: MT H1 D1 D3 (เกาะ D ตะวันตก)\n"
        "กลุ่ม ST: ST H2 D2 D4 (เกาะ B ตะวันออก)")
NOTE_EN = ("Plan follows game8 (Nukemaru's video): Replication by fixed positions / Staging the Ushiko way / Idyllic Dream One Ace's way\n"
           "Standard 8 waymarks (see the first step)\n"
           "Idyllic Dream uses eight self-marking macros (see the macro)\n\n"
           "Replication pairs (markers 1 / 2 / 3 / 4): MT·D1 / H2·D4 / ST·D2 / H1·D3\n"
           "Facing the boss: DPS right / tank and healer left\n\n"
           "Double Sobat invulns: MT > ST > MT\n\n"
           "Staging: jobs by where you stand, not by role (B as north)\n\n"
           "4:4 groups (Idyllic Dream)\n"
           "MT group: MT H1 D1 D3 (the D island, west)\n"
           "ST group: ST H2 D2 D4 (the B island, east)")

WEAPONS = [("Grand Champion's Falchion", "PLD", "030000/030700"), ("Grand Champion's Kite Shield", "PLD", "030000/030289"),
           ("Grand Champion's War Axe", "WAR", "031000/031274"), ("Grand Champion's Guillotine", "DRK", "034000/034029"),
           ("Grand Champion's Sawback", "GNB", "036000/036120"), ("Grand Champion's Cane", "WHM", "032000/032495"),
           ("Grand Champion's Codex", "SCH", "037000/037851"), ("Grand Champion's Astrometer", "AST", "034000/034722"),
           ("Grand Champion's Syrinxi", "SGE", "037000/037086"), ("Grand Champion's Baghnakhs", "MNK", "030000/030864"),
           ("Grand Champion's Spear", "DRG", "031000/031676"), ("Grand Champion's Knives", "NIN", "033000/033650"),
           ("Grand Champion's Blade", "SAM", "036000/036578"), ("Grand Champion's War Scythe", "RPR", "037000/037290"),
           ("Grand Champion's Twinfangs", "VPR", "037000/037453"), ("Grand Champion's Longbow", "BRD", "032000/032064"),
           ("Grand Champion's Pistol", "MCH", "034000/034523"), ("Grand Champion's War Quoits", "DNC", "036000/036319"),
           ("Grand Champion's Rod", "BLM", "032000/032910"), ("Grand Champion's Index", "SMN", "037000/037850"),
           ("Grand Champion's Foil", "RDM", "036000/036877"), ("Grand Champion's Flat Brush", "PCT", "037000/037663")]
pieces = lambda rows: [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in rows]
HHIHWI = {"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.4, "label": "Hhihwi"},
          "say": "จุดแลก: Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)",
          "say_en": "Where to exchange: Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)"}

rewards = [
    {"kind": "token", "name": "AAC Illustrated: HW Edition IV", "icon_src": ICON("ui/icon/026000/026460_hr1.tex"),
     "say": "ได้ 1 เล่มต่อการเคลียร์ (การันตี)\n\nแลกที่ Hhihwi ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
            "อาวุธ IL795: 8 เล่ม ต่ออาวุธ 1 ชิ้น (Paladin ได้ดาบ + โล่)\n\n"
            "Edition IV 1 เล่ม แลกเป็น Edition I / II / III ได้ 1 เล่ม",
     "say_en": "Every clear gives 1 (guaranteed)\n\nExchange them with Hhihwi in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.4)\n"
               "IL795 weapon: 8 per weapon (a Paladin gets sword + shield)\n\n"
               "One Edition IV trades for one Edition I / II / III",
     "pics": [HHIHWI]},
    {"kind": "weapon", "name": "Grand Champion's Weapon Coffer (IL 795)", "ilvl": 795, "icon_src": ICON("ui/icon/026000/026557_hr1.tex"),
     "say": "หีบอาวุธ IL795 จากหีบรางวัล: เปิดแล้วได้อาวุธตามอาชีพที่ใช้อยู่ตอนเปิด (เปิดในดันเจี้ยน / raid ไม่ได้)\n"
            "หรือแลกด้วย Edition IV 8 เล่ม ต่ออาวุธ 1 ชิ้น\nมีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "An IL795 weapon coffer from the treasure: it opens into the weapon for the job you're on (not inside a dungeon or raid)\n"
               "Or 8 Edition IV per weapon\nOne for every job; tap an icon for the weapon's name",
     "pieces": pieces(WEAPONS)},
    {"kind": "mount", "name": "Lowrider T1RANT", "icon_src": ICON("ui/icon/004000/004334_hr1.tex"),
     "say": "จากหีบรางวัล: ไอเทม Lowrider T1RANT Identification Key ใช้แล้วได้ mount นี้",
     "say_en": "From the treasure: the Lowrider T1RANT Identification Key, which gives this mount",
     "pics": [{"src": ICON("ui/icon/068000/068334_hr1.tex"), "say": "หน้าตา Lowrider T1RANT (ภาพจาก Mount Guide ในเกม)",
               "say_en": "Lowrider T1RANT, as the in-game Mount Guide shows it"}]},
    {"kind": "minion", "name": "Grooving Green", "icon_src": ICON("ui/icon/059000/059977_hr1.tex"),
     "say": "minion จากหีบรางวัล", "say_en": "A minion from the treasure"},
    {"kind": "orchestrion", "name": "The Arcadion Orchestrion Roll", "icon_src": ICON("ui/icon/025000/025945_hr1.tex"),
     "say": "orchestrion roll จากหีบรางวัล (ขายได้)", "say_en": "An orchestrion roll from the treasure (tradable)"},
    {"kind": "other", "name": "Allagan Tomestone of Mnemonics", "icon_src": ICON("ui/icon/065000/065137_hr1.tex"),
     "say": "ได้ 30 ต่อการเคลียร์", "say_en": "30 per clear"},
]

guide = {
    "slug": "m12s-2", "short": "M12S-2", "sort": 5,
    "name": "Lindwurm · AAC Heavyweight M4 (Savage)",
    "category": "savage", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/757988",
    "content_key": "sav:M12S-2",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 100, "ilvl": 770, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ AAC Heavyweight (normal) ให้ครบก่อน: เควสต์สุดท้าย Glory Incarnate\n"
                      "แล้วคุยกับ Gabbro ที่ Solution Nine — Recreation Zone (X: 22.4 Y: 17.1) ใกล้ aethernet True Vue\n"
                      "Savage ของ Arcadion ทุกรุ่นปลดล็อกที่ NPC คนนี้\n"
                      "ครึ่งหลังอยู่ใน duty เดียวกับครึ่งแรก (AAC Heavyweight M4 (Savage)): ชนะครึ่งแรกแล้วสู้ต่อเป็นครึ่งหลัง",
            "unlock_en": "Finish AAC Heavyweight (normal) first: the last quest is Glory Incarnate\n"
                         "then talk to Gabbro in Solution Nine — Recreation Zone (X: 22.4 Y: 17.1), near the True Vue aethernet shard\n"
                         "Every Arcadion Savage tier is unlocked from this NPC\n"
                         "Part 2 is the same duty as part 1 (AAC Heavyweight M4 (Savage)): beat part 1 and the fight goes on into part 2",
            "unlock_pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 22.4, "y": 17.1, "label": "Gabbro"},
                             "say": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro", "say_en": "Solution Nine (X: 22.4 Y: 17.1) — Gabbro"}]},
    "macro_en": macros["macro_en"], "macro_ja": macros["macro_ja"],
    "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/savage_raids/m12s_2/",
}

defaults = {"frame": [4, 3], "bg": "#5b5c60", "arena": dict(S.GREY), "waymarks": {}, "iconSize": 6, "markSize": 5, "bossSize": 9, "ring": 5.5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
