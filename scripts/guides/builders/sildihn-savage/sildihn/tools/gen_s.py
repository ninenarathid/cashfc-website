"""Builds scripts/guides/data/sildihn-savage.json: Another Sil'dihn Subterrane (Savage), game8's plan
(the Savage page + the Another (normal) pages of each boss, which the Savage page points to), Hamukatsu's videos."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/sildihn"
sys.path.insert(0, HERE + "/tools")
import sc as S

OUT = r"scripts/guides/data/sildihn-savage.json"
IMGS = json.load(open(HERE + "/imgs.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
V1, V2, V3 = "CYh4B-XUgWA", "TDlhDJhSC2M", "SqXvHJ9c3hI"


def FR(name, vid, t, say, say_en):
    return (f"frames/sildihn-savage/{name}.webp", say, say_en, "Hamukatsu", f"https://youtu.be/{vid}?t={t}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, says=None, says_en=None, refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [IMGS[pic]]
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if pic:
        s["ring"] = 5
        s["scene"] = S.SCENES[pic]()
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


P0 = ("ภาพรวม Savage", "Savage overview")
P1 = ("ลูกกระจ๊อกก่อนบอส 1", "Trash before boss 1")
P2 = ("บอส 1: Silkie", "Boss 1: Silkie")
P3 = ("ลูกกระจ๊อกก่อนบอส 2", "Trash before boss 2")
P4 = ("บอส 2: Gladiator of Sil'dih", "Boss 2: Gladiator of Sil'dih")
P5 = ("บอส 3: Shadowcaster Zeless Gah", "Boss 3: Shadowcaster Zeless Gah")

# ================================================================== overview (game8's Savage page)
SV = "Savage rules"
step(P0, SV, "ท่าเหมือน normal แต่แรงขึ้น", "Same mechanics as normal, more damage",
     "ท่าของบอสทั้ง 3 ตัวใน Savage เหมือน Another Sil'dihn Subterrane (normal) ทุกอย่าง\n"
     "ต่างกันที่ดาเมจ: raid-wide และ AoE บางท่าแรงขึ้นมาก\n"
     "ต้องใช้ mitigate ให้มากกว่าตอน normal\n\n"
     "game8: ถ้าเคลียร์ normal ได้แล้ว ก็มาลอง Savage ได้เลย\n"
     "ท่าไม่เปลี่ยน ให้ไปเก็บเรื่อง mitigate ทั้งตอนบอสและตอนลูกกระจ๊อก\n\n"
     "ท่าของบอสในคู่มือนี้จึงตามหน้า Another (normal) ของ game8 แต่ละบอส",
     "All three bosses in Savage have exactly the same mechanics as Another Sil'dihn Subterrane (normal)\n"
     "The difference is damage: raid-wides and some AoEs hit much harder\n"
     "Use more mitigation than in normal\n\n"
     "game8: once you can clear normal, you can go straight into Savage\n"
     "The mechanics don't change; work on mitigation, for the bosses and for the trash\n\n"
     "So the boss mechanics in this guide follow game8's Another (normal) page for each boss")
step(P0, SV, "ท่าที่ต้องระวังกว่า normal", "Attacks to respect more than in normal",
     "บอส 1 Total Wash: ดาเมจตอนโดนและ DoT แรงขึ้น\n"
     "บางครั้งมาซ้อนกับ Slippery Soap และ DoT: ใช้ mitigate ให้ทุก Total Wash\n\n"
     "บอส 2 Sculptor's Passion: line stack หลัง Specter of Might แรงขึ้นมาก\n"
     "ใช้ mitigate ทั้งปาร์ตี้อย่างน้อย 1 อย่าง\n\n"
     "บอส 3 Show of Strength: raid-wide\n"
     "ใช้ mitigate อย่างน้อย 2 อย่างต่อครั้ง ไม่อย่างนั้นหนักมาก",
     "Boss 1 Total Wash: both the hit and the DoT are stronger\n"
     "It sometimes lines up with Slippery Soap and the DoT: mitigate every Total Wash\n\n"
     "Boss 2 Sculptor's Passion: the line stack after Specter of Might hits much harder\n"
     "Use at least one party mitigation\n\n"
     "Boss 3 Show of Strength: a raid-wide\n"
     "At least two mitigations on each one, or it is very rough")
step(P0, SV, "ตายหมู่ = เริ่มใหม่ตั้งแต่ต้น", "A wipe sends you back to the start",
     "ถ้าตายหมู่ ต้องเริ่มใหม่ตั้งแต่ต้นดันเจี้ยน\n"
     "แม้จะตายหมู่ที่บอส 3 ก็ต้องเริ่มใหม่ตั้งแต่ต้น\n"
     "ตั้งแต่ลูกกระจ๊อกแรกจนถึงบอส 3 ต้องไม่ตายหมู่เลยสักครั้ง",
     "A wipe sends you back to the very start of the dungeon\n"
     "Even a wipe at boss 3 starts you over from the beginning\n"
     "From the first trash pull to boss 3 you must not wipe even once")
step(P0, SV, "เวลาจำกัด 24 นาที", "A 24-minute limit",
     "นับจากตอนเริ่มสู้ลูกกระจ๊อกตัวแรก ต้องฆ่าบอส 3 ให้ได้ภายใน 24 นาที\n"
     "ถ้าไม่ทัน ศัตรูจะแรงขึ้น เท่ากับตายหมู่\n"
     "ตั้งแต่ลูกกระจ๊อกถึงบอสต้องเดินต่อเนื่อง ไม่หยุดนาน",
     "From the moment you engage the first trash, boss 3 must die within 24 minutes\n"
     "If not, the enemies get stronger, which is as good as a wipe\n"
     "Keep moving from the trash to the bosses without long stops")

# ================================================================== trash before Silkie
TR = "Trash pulls"
step(P1, TR, "ลำดับการตี", "Pull order",
     "game8 (หน้า normal): ตีตามลำดับนี้\n"
     "1. Aqueduct Belladonna (ดึงมาตัวเดียว)\n"
     "2. Aqueduct Kaluk (ดึงมาตัวเดียว)\n"
     "3. Aqueduct Dryad + Aqueduct Odqan 2 ตัว หรือ Aqueduct Udumbara + Aqueduct Sapria 2 ตัว\n"
     "กลุ่ม Dryad กับกลุ่ม Udumbara ตีกลุ่มไหนก่อนก็ได้\n\n"
     "Savage: ลูกกระจ๊อกก่อนบอส 1 ตีแรงมาก และ AoE ของลูกกระจ๊อกมองไม่เห็นวงเตือนเลย\n"
     "ใช้บัฟป้องกันและ mitigate ให้ดี และวางแผนการเดินไว้ก่อน\n"
     "(วิดีโอลูกกระจ๊อกของ game8 เป็นของ normal ยกเว้น Udumbara กับ Evil Armor: ใน Savage ไม่มีวงเตือน)",
     "game8 (normal page): pull in this order\n"
     "1. Aqueduct Belladonna (pulled alone)\n"
     "2. Aqueduct Kaluk (pulled alone)\n"
     "3. Aqueduct Dryad + 2 Aqueduct Odqan, or Aqueduct Udumbara + 2 Aqueduct Sapria\n"
     "The Dryad pack and the Udumbara pack can go in either order\n\n"
     "Savage: the trash before boss 1 hits extremely hard, and none of its AoEs show a telegraph\n"
     "Use defensives and mitigation well, and plan your movement beforehand\n"
     "(game8's trash videos are from normal except the Udumbara and the Evil Armor: in Savage there are no telegraphs)")
step(P1, "Atropine Spore + Deracinator + Frond Affront", "Aqueduct Belladonna", "Aqueduct Belladonna",
     "Atropine Spore: AoE donut → รวมกันใกล้ใต้ตัวมัน\n"
     "Deracinator: ท่าแรงใส่ aggro อันดับ 1 (ไม่ใช่ AoE)\n"
     "ต้องใช้บัฟป้องกันทุกอย่างยกเว้นท่าอมตะ ถึงจะรอด\n"
     "Frond Affront: ท่าจ้อง (gaze) หันหน้าเข้าหามัน = ตาย ร่ายเร็ว หันหลังให้เร็ว\n\n"
     "auto-attack ถ้าไม่ใช้ mitigate ประมาณ 40,000\n"
     "ดึงมาที่ทางเข้า อย่าให้ศัตรูที่เดินลาดตระเวนจับได้\n"
     "ท่าแรงเจ็บมาก: ใช้ท่าอมตะ หรือบัฟป้องกันเต็มที่\n\n"
     "ลำดับท่า: auto-attack 3 ครั้ง → Atropine Spore → Deracinator → auto-attack 3 ครั้ง → Frond Affront",
     "Atropine Spore: a donut AoE → gather close under it\n"
     "Deracinator: a heavy hit on the top aggro (not an AoE)\n"
     "It takes every defensive short of an invulnerability to survive\n"
     "Frond Affront: a gaze; facing it kills you. The cast is quick, so turn away early\n\n"
     "Its unmitigated auto-attack is about 40,000\n"
     "Pull it to the entrance without the patrols catching you\n"
     "The heavy hit hurts a lot: take it with an invulnerability or full defensives\n\n"
     "Its rotation: 3 auto-attacks → Atropine Spore → Deracinator → 3 auto-attacks → Frond Affront",
     says={"MT": "ดึงมาที่ทางเข้า / Deracinator: ท่าอมตะ หรือบัฟป้องกันเต็มที่"},
     says_en={"MT": "Pull it to the entrance / Deracinator: an invulnerability or full defensives"},
     refs=[FR("belladonna", V1, 15, "Aqueduct Belladonna: Atropine Spore เป็น AoE donut รวมกันใกล้ใต้ตัวมัน",
              "Aqueduct Belladonna: Atropine Spore is a donut; gather close under it")])
step(P1, "Left Sweep / Right Sweep + Creeping Ivy", "Aqueduct Kaluk", "Aqueduct Kaluk",
     "Left Sweep / Right Sweep: AoE กว้างครึ่งซ้ายหรือครึ่งขวา\n"
     "ดูชื่อท่าตอนร่าย แล้วรวมกันอีกฝั่ง\n"
     "Creeping Ivy: AoE กรวยด้านหน้า ไปอยู่หลังมัน\n"
     "ระวัง: มันหันหน้าเปลี่ยนทิศ\n\n"
     "auto-attack ถ้าไม่ใช้ mitigate ประมาณ 38,000\n"
     "แค่ระวังทิศของ Creeping Ivy ก็พอ\n"
     "มันใช้ auto-attack → Sweep → Creeping Ivy สลับกันไป\n"
     "ท่าดูเหมือนต่อกันไม่มีช่อง แต่บางครั้งมี auto-attack แทรกระหว่างท่า",
     "Left Sweep / Right Sweep: a wide AoE over the left or the right half\n"
     "Read the cast and gather on the other side\n"
     "Creeping Ivy: a frontal cone; get behind it\n"
     "Careful: it changes the way it faces\n\n"
     "Its unmitigated auto-attack is about 38,000\n"
     "Just watch where Creeping Ivy points\n"
     "It alternates auto-attack → Sweep → Creeping Ivy\n"
     "The moves look seamless, but sometimes an auto-attack slips in between")
step(P1, "Uproot + Acorn Bomb + Arboreal Storm", "Aqueduct Dryad + Aqueduct Odqan 2 ตัว", "Aqueduct Dryad + 2 Aqueduct Odqan",
     "Uproot: AoE วงกลมจาก Aqueduct Odqan (ตัวเล็ก)\n"
     "Acorn Bomb: AoE วงกลมจาก Aqueduct Dryad (ต้นไม้) เยื้องไปทางที่มันหันเล็กน้อย\n"
     "Arboreal Storm: AoE วงกลมใหญ่จาก Aqueduct Dryad ต้องออกห่างเสมอ\n\n"
     "ตี Aqueduct Dryad เป็นเป้าหลัก\n"
     "เห็นมันเริ่มร่าย Arboreal Storm ก็ออกห่าง\n"
     "Healer: ระหว่างหลบ AoE วงกลม ดู HP ของ Tank ให้ดี อย่าให้ Tank ตาย",
     "Uproot: a circle AoE from an Aqueduct Odqan (the small ones)\n"
     "Acorn Bomb: a circle AoE from the Aqueduct Dryad (the tree), shifted a little the way it faces\n"
     "Arboreal Storm: a big circle AoE from the Aqueduct Dryad; always get out\n\n"
     "Focus the Aqueduct Dryad\n"
     "When it starts casting Arboreal Storm, get away\n"
     "Healer: while dodging the circles, keep a close eye on the Tank so they don't drop",
     says={"H1": "ระหว่างหลบ AoE ดู HP ของ Tank ตลอด"}, says_en={"H1": "Keep watching the Tank's HP while dodging"},
     refs=[FR("dryad", V1, 58, "Aqueduct Dryad (ต้นไม้): ตีตัวนี้ก่อน เห็นร่าย Arboreal Storm ให้ออกห่าง",
              "Aqueduct Dryad (the tree): focus it; get away when it casts Arboreal Storm")])
step(P1, "Honeyed Front / Right / Left + Bloody Caress", "Aqueduct Udumbara + Aqueduct Sapria 2 ตัว", "Aqueduct Udumbara + 2 Aqueduct Sapria",
     "Honeyed Front / Honeyed Right / Honeyed Left: AoE ใหญ่มากจาก Aqueduct Udumbara (ตัวใหญ่)\n"
     "ทุกคนรวมกันหน้า Udumbara แล้วย้ายไปหลังมันเฉพาะตอนร่าย Honeyed Front\n"
     "(game8 หน้า normal: Honeyed Left โดนฝั่งมือซ้ายของ Udumbara → ไปฝั่งมือขวา)\n"
     "Bloody Caress: AoE กรวยจาก Aqueduct Sapria (ตัวเล็ก) ยิงไปทางที่มันหัน\n\n"
     "ยืนหน้า Udumbara ไว้ หลบได้ทุกท่ายกเว้น Honeyed Front\n"
     "ท่าของตัวเล็กมาซ้อนกัน: ถอยไกล ๆ หรือดูลำดับท่าแล้วหลบ\n"
     "โดนรุม 3 ตัว auto-attack เจ็บมาก (Udumbara ประมาณ 27,000 / Sapria ประมาณ 10,000 กว่า)\n"
     "ใช้บัฟป้องกันทีละอย่าง ให้มีบัฟติดตัวนานที่สุด",
     "Honeyed Front / Honeyed Right / Honeyed Left: a huge AoE from the Aqueduct Udumbara (the big one)\n"
     "Everyone gathers in front of the Udumbara and moves behind it only for Honeyed Front\n"
     "(game8's normal page: Honeyed Left hits the Udumbara's left-hand side → go to its right-hand side)\n"
     "Bloody Caress: a cone from an Aqueduct Sapria (the small ones), the way it faces\n\n"
     "Standing in front of the Udumbara dodges everything except Honeyed Front\n"
     "When the small ones' attacks overlap: back right off, or dodge them in order\n"
     "Surrounded by three, the auto-attacks hurt a lot (Udumbara about 27,000 / Sapria a little over 10,000)\n"
     "Use defensives one at a time to stay covered as long as possible",
     refs=[FR("udumbara", V1, 82, "Aqueduct Udumbara: Honeyed Left โดนฝั่งมือซ้ายของมัน ไปฝั่งมือขวา",
              "Aqueduct Udumbara: Honeyed Left hits its left-hand side; go to its right-hand side")])

# ================================================================== boss 1: Silkie
SU = "Soap's Up"
EL_TH = ("Soap's Up: ลูก puff ระเบิดเป็น AoE ตามธาตุของลูก puff ของ Silkie\n"
         "จำรูป AoE ของแต่ละธาตุ แล้วหลบไปจุดปลอดภัย\n"
         "Soap's Up ครั้งแรกเป็น Fizzling เสมอ\n\n"
         "ธาตุมี 3 แบบ:\n"
         "Fizzling (สายฟ้า) = AoE รูป X จากตัว Silkie หรือลูก puff\n"
         "Bracing (ลม) = AoE donut\n"
         "Chilling (น้ำแข็ง) = AoE กากบาท (+)\n"
         "สีในภาพ: เหลือง = สายฟ้า / เขียว = ลม / ฟ้า = น้ำแข็ง\n\n")
EL_EN = ("Soap's Up: the puffs go off as AoEs set by the element of Silkie's own puff\n"
         "Learn each element's AoE and get to the safe spot\n"
         "The first Soap's Up is always Fizzling\n\n"
         "Three elements:\n"
         "Fizzling (thunder) = an X from Silkie or a puff\n"
         "Bracing (wind) = a donut\n"
         "Chilling (ice) = a cross (+)\n"
         "Colours in the pictures: yellow = thunder / green = wind / blue = ice\n\n")
step(P2, SU, "Fizzling (สายฟ้า): AoE รูป X", "Fizzling (thunder): an X",
     EL_TH + "ภาพ: Fizzling จากตัว Silkie", EL_EN + "Picture: Fizzling from Silkie", pic="b1-02",
     refs=[FR("soaps-up", V1, 127, "Soap's Up (Fizzling): AoE รูป X จาก Silkie หลบเข้าช่องระหว่างแนว X",
              "Soap's Up (Fizzling): an X from Silkie; dodge into the gaps between its arms")])
step(P2, SU, "Bracing (ลม): AoE donut", "Bracing (wind): a donut",
     "Bracing: AoE donut จากตัว Silkie หรือลูก puff\nภาพ: donut จากตัว Silkie (วงเล็กข้างในไม่โดน)",
     "Bracing: a donut from Silkie or a puff\nPicture: the donut from Silkie (the small circle inside is safe)", pic="b1-03")
step(P2, SU, "Chilling (น้ำแข็ง): AoE กากบาท (+)", "Chilling (ice): a cross (+)",
     "Chilling: AoE กากบาท (+) จากตัว Silkie หรือลูก puff\nภาพ: กากบาทจากตัว Silkie",
     "Chilling: a cross (+) from Silkie or a puff\nPicture: the cross from Silkie", pic="b1-04")
step(P2, "Soaping Spree", "ลูก puff ทุกลูกระเบิดพร้อมกัน", "Every puff goes off at once",
     "Soaping Spree: ลูก puff ของ Silkie และลูก puff ที่ออกมาบนสนามพร้อมกัน ระเบิดพร้อมกันหมด\n"
     "แต่ละลูกเป็น AoE ตามธาตุของลูกนั้น",
     "Soaping Spree: Silkie's own puff and the puffs that appeared on the field go off together\n"
     "Each one is the AoE of its own element")

SL = "Slippery Soap"
step(P2, SL, "Fizzling ①: เลือกเป้า → ทุกคน stack", "Fizzling ①: a target is chosen → everyone stacks",
     "Slippery Soap: stack (หารดาเมจ) และ Silkie พุ่งไปที่ตัวคนเป้า\n"
     "แต่ละธาตุมีผลเพิ่มก่อน / หลังพุ่ง ต้องจำให้ได้\n\n"
     "Fizzling ①: เลือกคนเป้า ทุกคน stack ด้วยกัน",
     "Slippery Soap: a stack (shared damage), and Silkie slides to the target\n"
     "Each element adds an extra effect before or after the slide; learn them\n\n"
     "Fizzling ①: the target is chosen; everyone stacks together", pic="b1-05")
step(P2, SL, "Fizzling ②: พุ่งถึง → X + AoE เล็กใส่ทุกคน → spread", "Fizzling ②: after the slide → an X + small AoEs on everyone → spread",
     "Silkie พุ่งถึงคนเป้า แล้วยิง AoE รูป X จากตัว\n"
     "และมี AoE วงเล็กใส่ผู้เล่นทุกคน\n"
     "แยกกันยืน:\n"
     "DPS ช่องซ้าย / ขวาของบอส\n"
     "Tank หน้าบอส\n"
     "Healer หลังบอส",
     "Silkie lands on the target and fires an X from herself\n"
     "and a small circle AoE on every player\n"
     "Spread out:\n"
     "DPS in the gaps to the boss's left / right\n"
     "Tank in front of the boss\n"
     "Healer behind the boss",
     strict=True, pic="b1-06",
     says={"MT": "หน้าบอส", "H1": "หลังบอส", "D1": "ซ้ายหรือขวาของบอส (DPS คนละฝั่ง)", "D2": "ซ้ายหรือขวาของบอส (DPS คนละฝั่ง)"},
     says_en={"MT": "In front of the boss", "H1": "Behind the boss", "D1": "Boss's left or right (one DPS each side)", "D2": "Boss's left or right (one DPS each side)"})
step(P2, SL, "Bracing ①: มี knockback → รับเฉียงไปทางมุมสนาม", "Bracing ①: a knockback → take it diagonally towards a corner",
     "Bracing: เลือกคนเป้า และมี knockback\nstack ด้วยกัน โดยยืนให้โดนผลักเฉียงไปทางมุมสนาม",
     "Bracing: the target is chosen, and it knocks back\nStack together, placed so the knockback sends you diagonally towards a corner", pic="b1-07")
step(P2, SL, "Bracing ②: พุ่งถึง → AoE donut", "Bracing ②: after the slide → a donut",
     "พุ่งถึงแล้ว ตามด้วย AoE donut\nอยู่วงในใกล้ Silkie",
     "After the landing comes a donut\nStay inside, close to Silkie", pic="b1-08")
step(P2, SL, "Chilling ①: ตอนโดนต้องกำลังเดินอยู่", "Chilling ①: be moving when it lands",
     "Chilling: ตอนพุ่งถึง คนที่ยืนนิ่งจะถูกแช่แข็ง\nรับ stack ขณะที่ยังเดินอยู่",
     "Chilling: anyone standing still when it lands is frozen\nTake the stack while moving", pic="b1-09")
step(P2, SL, "Chilling ②: พุ่งถึง → AoE กากบาท → หลบเฉียง", "Chilling ②: after the slide → a cross → dodge diagonally",
     "พุ่งถึงแล้ว มี AoE กากบาท\nหลบไปจุดปลอดภัยแนวเฉียง",
     "After the landing comes a cross\nDodge to the diagonal safe spots", pic="b1-10")
step(P2, "Dust Bluster", "knockback จากจุดกลางระเบิด", "A knockback from the blast point",
     "knockback จากจุดกลางของระเบิด\n"
     "กันได้ด้วย Arm's Length / Surecast\n"
     "มา 2 ครั้งต่อไฟต์ Arm's Length / Surecast คูลดาวน์ทันแน่นอน ใช้ได้เลย",
     "A knockback from the centre of the blast\n"
     "Arm's Length / Surecast stop it\n"
     "It comes twice a fight, and Arm's Length / Surecast are always back in time: use them")

F1 = "Fresh Puff + Squeaky Clean + Slippery Soap"
step(P2, F1, "① Squeaky Clean: ตัวอย่าง Silkie กลิ้งไปขวาก่อน", "① Squeaky Clean: e.g. Silkie rolls right first",
     "ลูก puff 3 ลูกออกมาบนสนาม\n"
     "Squeaky Clean ของ Silkie ทำให้ลูก puff 2 ใน 3 ลูก เป็นธาตุเดียวกับลูกของ Silkie (ลม)\n"
     "แล้ว Slippery Soap เปลี่ยนธาตุของ Silkie และใช้ Slippery Soap ทาสีทับลูก puff ลม 1 ใน 2 ลูก\n"
     "จากนั้น Carpet Beater: ท่าแรงใส่ aggro อันดับ 1\n"
     "Tank ไปที่ลูก puff ลมที่เหลือ แล้วดึง Silkie ไปตรงนั้น\n"
     "ตอน Soaping Spree ทุกคนรวมที่ลูก puff ลม หลบอยู่ในวงของ donut\n\n"
     "ภาพ: ครั้งแรก Silkie กลิ้งไปทางขวา",
     "Three puffs appear on the field\n"
     "Silkie's Squeaky Clean turns 2 of the 3 puffs into her own element (wind)\n"
     "Then Slippery Soap changes Silkie's element, and the Slippery Soap repaints one of the two wind puffs\n"
     "Then Carpet Beater: a heavy hit on the top aggro\n"
     "The Tank goes to the remaining wind puff and brings Silkie there\n"
     "For Soaping Spree everyone gathers at the wind puff, inside its donut\n\n"
     "Picture: Silkie first rolls to the right", pic="b1-11",
     refs=[FR("fresh-puff-1", V1, 248, "Fresh Puff: ลูก puff บนสนาม สีของลูกบอกธาตุ (เขียว = ลม / ฟ้า = น้ำแข็ง)",
              "Fresh Puff: puffs on the field; the colour gives the element (green = wind / blue = ice)")])
step(P2, F1, "② ฝั่งขวาปลอดภัย: รวมกันฝั่งขวา", "② The right side is safe: gather on the right",
     "ฝั่งขวาเป็นจุดปลอดภัย ทุกคนรวมกันฝั่งขวา", "The right side is safe; everyone gathers on the right", pic="b1-12")
step(P2, F1, "③ ลูก puff ลมกลายเป็น 2 ลูก", "③ Two puffs are now wind",
     "ลูก puff ลมกลายเป็น 2 ลูก", "Two puffs are now wind", pic="b1-13")
step(P2, F1, "④ ลูกของ Silkie เปลี่ยนเป็นน้ำแข็ง", "④ Silkie's puff turns to ice",
     "ลูก puff ของ Silkie เปลี่ยนเป็นน้ำแข็ง", "Silkie's own puff turns to ice", pic="b1-14")
step(P2, F1, "⑤ Slippery Soap: เป้าไปที่ลูก puff ลม 1 ลูก", "⑤ Slippery Soap: the target goes to one wind puff",
     "Slippery Soap: คนเป้าไปยืนที่ลูก puff ลม 1 ใน 2 ลูก\nเพื่อล่อให้ Slippery Soap ทาลูกนั้นเป็นน้ำแข็ง\nคนอื่น stack ด้วยกัน",
     "Slippery Soap: the target goes to one of the two wind puffs\nso the Slippery Soap repaints it as ice\nEveryone else stacks with them", pic="b1-15")
step(P2, F1, "⑥ พุ่งถึง: รับขณะเดิน (น้ำแข็ง)", "⑥ The landing: take it while moving (ice)",
     "Slippery Soap พุ่งถึง เป็นน้ำแข็ง: รับขณะที่ยังเดินอยู่\nลูก puff ลมลูกนั้นกลายเป็นน้ำแข็ง",
     "The Slippery Soap lands as ice: take it while moving\nThat wind puff becomes ice", pic="b1-16")
step(P2, F1, "⑦ AoE กากบาทจาก Silkie: หลบเฉียง", "⑦ A cross from Silkie: dodge diagonally",
     "พุ่งถึงแล้วมี AoE กากบาทจากตัว Silkie ทันที\nหลบไปจุดปลอดภัยแนวเฉียง",
     "Right after the landing Silkie fires a cross\nDodge to the diagonal safe spots", pic="b1-17")
step(P2, F1, "⑧ Carpet Beater: Tank รับที่ลูก puff ลมที่เหลือ", "⑧ Carpet Beater: the Tank takes it at the remaining wind puff",
     "Carpet Beater: Tank ไปรับที่ลูก puff ลมที่เหลือ\n"
     "Melee: ถ้ามีท่าพุ่งเข้าหา ตีต่อได้จน Silkie ย้าย (ย้ายแล้วค่อยตามไป)",
     "Carpet Beater: the Tank takes it at the remaining wind puff\n"
     "Melee: with a gap closer you can keep hitting until Silkie moves (follow her once she does)",
     strict=["MT"], pic="b1-18",
     says={"MT": "ไปรับ Carpet Beater ที่ลูก puff ลม"}, says_en={"MT": "Take Carpet Beater at the wind puff"})
step(P2, F1, "⑨ Soaping Spree: หลบในวง donut ของลูก puff ลม", "⑨ Soaping Spree: hide inside the wind puff's donut",
     "Soaping Spree: ทุกคนอยู่ในวง donut ของลูก puff ลม ปลอดภัย จบ",
     "Soaping Spree: everyone inside the wind puff's donut is safe; done", pic="b1-19")
step(P2, F1, "ถ้าลูกสายฟ้าเหลือ: ทาสีทับลูกด้านบน", "If the thunder puff is left: repaint the top puff",
     "ถ้าตอนเริ่ม ลูก puff อยู่แบบในภาพ (ลูกสายฟ้าเหลืออยู่)\nต้องทาสีทับลูกด้านบนแทน",
     "If the puffs start out as in this picture (a thunder puff is left)\nrepaint the top puff instead", pic="b1-20")

step(P2, "Total Wash", "raid-wide แรง", "A heavy raid-wide",
     "raid-wide ค่อนข้างแรง ใช้ mitigate ให้ดี\n\n"
     "Savage: ดาเมจตอนโดนและ DoT แรงขึ้น\n"
     "บางครั้งมาซ้อนกับ Slippery Soap และ DoT: ใช้ mitigate ให้ทุก Total Wash",
     "A fairly heavy raid-wide; mitigate it well\n\n"
     "Savage: the hit and the DoT are stronger\n"
     "It sometimes lines up with Slippery Soap and the DoT: mitigate every Total Wash",
     refs=[FR("total-wash", V1, 360, "Total Wash: raid-wide แรง ใช้ mitigate ทุกครั้ง", "Total Wash: a heavy raid-wide; mitigate every one")])

F2 = "Fresh Puff"
F2_INTRO = ("ลูก puff 4 ลูกออกมา และมีสายโยงกับผู้เล่น 4 คน\n"
            "ลากลูก puff ไปทิศที่ถูก เพื่อเปิดจุดปลอดภัยของ AoE\n"
            "ใครลากลูกไหนขึ้นกับสาย: ลากตามทิศในภาพ\n\n")
F2_INTRO_EN = ("Four puffs appear, tethered to the four players\n"
               "Drag the puffs the right way to open a safe spot\n"
               "Who drags which depends on the tethers: drag the way the picture shows\n\n")
step(P2, F2, "Silkie ลม ①: ลูกเป็นรูป X → ลากตามภาพ", "Wind Silkie ①: puffs in an X → drag as shown",
     F2_INTRO + "Silkie ธาตุลม: อย่าให้ลูกทับจุดปลอดภัยตรงกลาง\n① ลูกออกเป็นรูป X: ลากแต่ละลูกตามภาพ",
     F2_INTRO_EN + "Wind Silkie: keep the puffs off the safe middle\n① Puffs in an X: drag each as shown", pic="b1-22",
     refs=[FR("fresh-puff-2", V1, 482, "Fresh Puff: ลูก puff มีสายโยงกับผู้เล่น ลากลูกไปตามแผน",
              "Fresh Puff: each puff is tethered to a player; drag it as planned")])
step(P2, F2, "Silkie ลม ②: Soap's Up → ตรงกลางปลอดภัย", "Wind Silkie ②: Soap's Up → the middle is safe",
     "Soap's Up: ตรงกลางเป็นจุดปลอดภัย", "Soap's Up: the middle is safe", pic="b1-23")
step(P2, F2, "Silkie ลม ③: ลูกเป็นรูป + → ลากตามภาพ", "Wind Silkie ③: puffs in a + → drag as shown",
     "ลูกออกเป็นรูป +: ลากตามภาพ", "Puffs in a +: drag as shown", pic="b1-24")
step(P2, F2, "Silkie ลม ④: Soap's Up → ตรงกลางปลอดภัย", "Wind Silkie ④: Soap's Up → the middle is safe",
     "Soap's Up: ตรงกลางเป็นจุดปลอดภัย", "Soap's Up: the middle is safe", pic="b1-25")
step(P2, F2, "Silkie ลม ⑤: รูป + และสายฟ้าอยู่ซ้าย / ขวา", "Wind Silkie ⑤: a + with thunder left and right",
     "ลูกเป็นรูป + และลูกสายฟ้าอยู่ซ้าย / ขวา\nเหมือนแบบอื่น: สายฟ้าลากออกไปขอบตรง ๆ\nน้ำแข็งลากวนตามเข็มนาฬิกา",
     "Puffs in a + with the thunder ones left and right\nAs in the other layouts: drag the thunder puffs straight out to the edge\nDrag the ice puffs clockwise", pic="b1-26")
step(P2, F2, "Silkie ลม ⑥: Soap's Up → แค่ให้ตรงกลางว่าง", "Wind Silkie ⑥: Soap's Up → just keep the middle open",
     "Soap's Up\nSilkie ลมอยู่ตรงกลาง: สุดท้ายแค่ลากให้ตรงกลางว่างก็พอ",
     "Soap's Up\nWith the wind Silkie in the middle, in the end you only need to keep the middle open", pic="b1-27")
step(P2, F2, "Silkie น้ำแข็ง ①: รูป X → ลากทั้ง 4 ลูกไปมุม", "Ice Silkie ①: an X → drag all four to the corners",
     "Silkie ธาตุน้ำแข็ง: จะมีจุดปลอดภัย 2 จุด\n① ลูกออกเป็นรูป X: ลากทั้ง 4 ลูกไปที่มุม",
     "Ice Silkie: there are two safe spots\n① Puffs in an X: drag all four to the corners", pic="b1-28")
step(P2, F2, "Silkie น้ำแข็ง ②: Soap's Up → ฝั่งสายฟ้าปลอดภัย", "Ice Silkie ②: Soap's Up → the thunder side is safe",
     "Soap's Up: ฝั่งลูกสายฟ้าเป็นจุดปลอดภัยตามภาพ", "Soap's Up: the thunder side is safe, as shown", pic="b1-29")
step(P2, F2, "Silkie น้ำแข็ง ③: รูป + → น้ำแข็งออกขอบ / สายฟ้าตามเข็ม", "Ice Silkie ③: a + → ice to the edge / thunder clockwise",
     "ลูกออกเป็นรูป +\nน้ำแข็ง: ลากออกแนวนอนไปจนแตะขอบสนาม\nสายฟ้า: ลากตามเข็มนาฬิกา ไปด้านข้างแนวนอน ตามภาพ",
     "Puffs in a +\nIce: drag straight out sideways until it touches the edge\nThunder: drag clockwise, sideways, as shown", pic="b1-30")
step(P2, F2, "Silkie น้ำแข็ง ④: Soap's Up → จุดปลอดภัยตามภาพ", "Ice Silkie ④: Soap's Up → the safe spots shown",
     "Soap's Up: จุดปลอดภัยตามภาพ", "Soap's Up: the safe spots are as shown", pic="b1-31")
step(P2, F2, "Silkie น้ำแข็ง ⑤: รูป + และสายฟ้าอยู่ซ้าย / ขวา", "Ice Silkie ⑤: a + with thunder left and right",
     "ลูกเป็นรูป + และลูกสายฟ้าอยู่ซ้าย / ขวา\nสายฟ้าลากตามเข็มนาฬิกาเหมือน ③\nระวัง: จุดปลอดภัยใน ⑥ ต่างไป",
     "Puffs in a + with the thunder ones left and right\nDrag the thunder puffs clockwise, as in ③\nCareful: the safe spots in ⑥ are different", pic="b1-32")
step(P2, F2, "Silkie น้ำแข็ง ⑥: Soap's Up → จุดปลอดภัยตามภาพ", "Ice Silkie ⑥: Soap's Up → the safe spots shown",
     "Soap's Up: จุดปลอดภัยตามภาพ", "Soap's Up: the safe spots are as shown", pic="b1-33")
step(P2, F2, "สรุป 6 แบบ (ภาพเดิมด้านบน)", "The six layouts (the pictures above)",
     "game8 รวมภาพเริ่มของแต่ละแบบไว้ดูเร็ว (ภาพเดียวกับด้านบน):\n"
     "ลม + รูป X: Silkie ลม ①\nลม + รูป +: Silkie ลม ③\nลม + รูป + สายฟ้าซ้าย / ขวา: Silkie ลม ⑤\n"
     "น้ำแข็ง + รูป X: Silkie น้ำแข็ง ①\nน้ำแข็ง + รูป +: Silkie น้ำแข็ง ③\nน้ำแข็ง + รูป + สายฟ้าซ้าย / ขวา: Silkie น้ำแข็ง ⑤",
     "game8 gathers the starting picture of each layout for a quick look (the same pictures as above):\n"
     "Wind + X: Wind Silkie ①\nWind + +: Wind Silkie ③\nWind + + with thunder left / right: Wind Silkie ⑤\n"
     "Ice + X: Ice Silkie ①\nIce + +: Ice Silkie ③\nIce + + with thunder left / right: Ice Silkie ⑤")

F3 = "Fresh Puff + Eastern Ewers"
step(P2, F3, "① ลูก puff 8 ลูก", "① Eight puffs",
     "ลูก puff ออกมา 2 แถว 8 ลูก\n"
     "แล้วมีน้ำไหลตรงจากเหนือ 3 สาย สุดท้ายเหลือลูกที่มีธาตุแค่ 2 ลูก\n"
     "ดูธาตุของ 2 ลูกที่เหลือ แล้วหลบไปจุดปลอดภัย",
     "Eight puffs appear in two rows\n"
     "Then three streams of water run straight down from the north, leaving only two puffs with an element\n"
     "Read the elements of the two that are left and get to the safe spot", pic="b1-34")
step(P2, F3, "② Eastern Ewers: น้ำไหลจากเหนือลงใต้", "② Eastern Ewers: water runs north to south",
     "Eastern Ewers: น้ำไหลตรงจากเหนือลงใต้\nลูก puff ที่น้ำไหลผ่านจะหมดธาตุ",
     "Eastern Ewers: water runs straight from north to south\nAny puff it passes loses its element", pic="b1-35",
     refs=[FR("eastern-ewers", V1, 544, "Eastern Ewers: น้ำไหลจากเหนือลงใต้ ลูก puff ที่น้ำผ่านจะหมดธาตุ",
              "Eastern Ewers: water runs north to south; puffs it passes lose their element")])
step(P2, F3, "③ ลูกที่เหลือ 2 ลูกระเบิด: ภาพนี้ข้างสายฟ้าปลอดภัย", "③ The two left go off: here, beside the thunder is safe",
     "ลูกที่มีธาตุเหลือ 2 ลูกระเบิด\nในภาพนี้ ข้างลูกสายฟ้าเป็นจุดปลอดภัย",
     "The two puffs with an element go off\nIn this layout, beside the thunder puff is safe", pic="b1-36")
step(P2, F3, "④ Slippery Soap (Chilling): ล่อให้โดนลูกที่เหลือทุกลูก", "④ Slippery Soap (Chilling): bait it through every puff left",
     "Silkie เป็นธาตุน้ำแข็ง แล้วใช้ Slippery Soap\n"
     "คนเป้าไปยืนไกลสุด ให้ Slippery Soap พุ่งผ่านลูก puff ที่เหลือทั้ง 6 ลูก (กลายเป็นน้ำแข็ง)\n"
     "พุ่งถึงแล้วมี AoE กากบาท: อย่าลืมหลบเฉียง",
     "Silkie turns to ice, then Slippery Soap\n"
     "The target goes all the way to the far side so the slide passes all six puffs left (they turn to ice)\n"
     "A cross follows the landing: don't forget to dodge diagonally", pic="b1-37")
step(P2, F3, "⑤ ลูกของ Silkie เป็นลม: Tank ดึงไปที่ 2 จุดที่ลูกหายไป", "⑤ Silkie's puff turns to wind: the Tank brings her to the two empty spots",
     "ลูกของ Silkie เปลี่ยนเป็น Bracing (ลม)\n"
     "Tank: Slippery Soap จบแล้ว ดึง Silkie ไปที่ตำแหน่งของ 2 ลูกที่ระเบิดไปแล้วตอน Eastern Ewers ทันที",
     "Silkie's puff turns to Bracing (wind)\n"
     "Tank: once the Slippery Soap is over, bring Silkie straight to where the two puffs that went off with Eastern Ewers were",
     strict=["MT"], pic="b1-38", says={"MT": "ดึง Silkie ไปที่ 2 จุดที่ลูกหายไป"}, says_en={"MT": "Bring Silkie to the two empty puff spots"})
step(P2, F3, "⑥ Soap's Up: 2 จุดนั้นไม่โดนกากบาท + อยู่ใน donut ของ Silkie", "⑥ Soap's Up: no cross reaches those spots + stay in Silkie's donut",
     "Soap's Up: ที่ 2 จุดของลูกที่หายไป กากบาทไม่โดน\nและเข้าไปอยู่ในวงของ donut จาก Silkie (ลม) จบ",
     "Soap's Up: no cross reaches the two empty puff spots\nand you stand inside the donut from Silkie (wind); done", pic="b1-39")

F4 = "Fresh Puff + Squeaky Clean"
step(P2, F4, "① knockback ไปทางขอบเหนือ: Arm's Length / Surecast", "① A knockback towards the north edge: Arm's Length / Surecast",
     "Silkie เป็นธาตุลม และลูก puff น้ำแข็ง 4 ลูกออกทางใต้ พร้อมสายโยงกับผู้เล่น 4 คน\n"
     "Silkie (ทางเหนือ) ใช้ Squeaky Clean: ลากลูกน้ำแข็งไปฝั่งปลอดภัยของ Squeaky Clean\n"
     "แล้วกลับมาที่ Silkie อยู่ในวงของ donut ลม จบ\n\n"
     "① มี knockback ไปทางขอบเหนือ: ต่างคนต่างใช้ Arm's Length / Surecast",
     "Silkie turns to wind, and four ice puffs appear in the south, tethered to the four players\n"
     "Silkie (in the north) uses Squeaky Clean: drag the ice puffs to Squeaky Clean's safe side\n"
     "then come back to Silkie and stand inside the wind donut; done\n\n"
     "① A knockback towards the north edge: everyone uses Arm's Length / Surecast", pic="b1-40",
     refs=[FR("fresh-puff-4", V1, 636, "Fresh Puff: ลูก puff น้ำแข็ง 4 ลูกทางใต้ มีสายโยง ลากไปฝั่งปลอดภัย",
              "Fresh Puff: four ice puffs in the south, tethered; drag them to the safe side")])
step(P2, F4, "② Silkie เป็นลม + Squeaky Clean: ลูกน้ำแข็ง 4 ลูกทางใต้", "② Silkie turns to wind + Squeaky Clean: four ice puffs in the south",
     "Bracing: Silkie เป็นธาตุลม แล้วตามด้วย Squeaky Clean\nภาพ: ครั้งแรกกลิ้งไปขวา = ฝั่งขวาปลอดภัย\nลูก puff น้ำแข็ง 4 ลูกออกทางใต้",
     "Bracing: Silkie takes the wind element, then Squeaky Clean\nPicture: she rolls right first = the right side is safe\nFour ice puffs appear in the south", pic="b1-41")
step(P2, F4, "③ ลากลูกไปฝั่งปลอดภัยของ Squeaky Clean", "③ Drag the puffs to Squeaky Clean's safe side",
     "ลูก puff ทางใต้มีสายโยงกับผู้เล่น: ลากไปฝั่งปลอดภัยของ Squeaky Clean\nภาพ: ขวาปลอดภัย → ลากไปทางขวา\nระหว่างลาก อย่าให้ลูกทับตำแหน่งกัน",
     "The southern puffs are tethered to the players: drag them to Squeaky Clean's safe side\nPicture: right is safe → drag them right\nWhile dragging, don't let two puffs end up on the same spot", pic="b1-42")
step(P2, F4, "④ Squeaky Clean ครึ่งสนาม + ลูกเคลื่อนตามที่ลาก", "④ Squeaky Clean hits half the room + the puffs move",
     "Squeaky Clean โดนครึ่งสนาม พร้อมกับลูกที่ลากเคลื่อนไป",
     "Squeaky Clean hits half the room while the dragged puffs move", pic="b1-43")
step(P2, F4, "⑤ ต่อด้วย Soap's Up: กลับไปที่ Silkie", "⑤ Soap's Up follows: go back to Silkie",
     "ต่อด้วย Soap's Up ทันที: กลับไปที่ตัว Silkie", "Soap's Up comes right after: go back to Silkie", pic="b1-44")
step(P2, F4, "⑥ รวมกันใน donut ของ Silkie ทางเหนือ", "⑥ Gather inside Silkie's donut in the north",
     "Soap's Up: รวมกันในวงของ donut จาก Silkie (ลม) ทางเหนือ จบ",
     "Soap's Up: gather inside the donut from Silkie (wind) in the north; done", pic="b1-45")

# ================================================================== trash before Gladiator
T2 = "Trash pulls"
step(P3, T2, "ห้องนี้: ฆ่าให้หมดก่อนไปบอส 2", "This room: clear it to reach boss 2",
     "game8 (หน้า normal): ต้องฆ่าศัตรูทุกตัวในห้องนี้ ทางไปบอส 2 ถึงจะเปิด\n"
     "ศัตรูแต่ละตัวแรง: ฆ่าทีละตัวเสมอ\n"
     "มี Evil Armor 2 ตัว + Dullahan 2 ตัว รวม 4 ตัว\n"
     "ศัตรูเดินวนตามเข็มนาฬิกาในห้อง เป็นคู่ Evil Armor + Dullahan\n"
     "คู่หนึ่งเดินไปสุดฝั่งตะวันตก อีกคู่เดินไปสุดฝั่งตะวันออก\n\n"
     "Savage: ศัตรูชุดเดียวกับ normal แต่ต้องไม่ให้ Dullahan ใช้ Infernal Pain ได้ 2 ครั้ง\n"
     "ใส่ burst ที่ Dullahan แล้วฆ่าให้เร็ว",
     "game8 (normal page): every enemy in this room must die before the way to boss 2 opens\n"
     "Each one is strong: always kill them one at a time\n"
     "There are 2 Evil Armor + 2 Dullahan, 4 in all\n"
     "They walk clockwise round the room in Evil Armor + Dullahan pairs\n"
     "One pair walks to the far west, the other to the far east\n\n"
     "Savage: the same enemies as normal, but don't let a Dullahan use Infernal Pain twice\n"
     "Burst the Dullahan down fast")
step(P3, T2, "วิธีของ game8: Evil Armor → Dullahan สองรอบ", "game8's way: Evil Armor → Dullahan, twice",
     "หลังข้ามแผนที่เข้าห้อง Evil Armor จะมาทางตะวันตกเฉียงเหนือ\n"
     "ดึงมันไปฝั่งตะวันตกให้เร็ว (ตอนสู้มันแทบไม่ขยับ การดึงครั้งแรกจึงสำคัญ)\n"
     "ตีตามลำดับ Evil Armor → Dullahan แล้วทำซ้ำอีกรอบ\n\n"
     "ไม่ใช้ LB กับบอส 1 (Silkie)\n"
     "ใส่ burst เต็มที่กับ Dullahan ตัวแรก\n"
     "ใช้ LB กับ Dullahan ตัวที่ 2",
     "After the map change, an Evil Armor comes from the north-west\n"
     "Pull it to the west quickly (it hardly moves once fighting, so the first pull matters)\n"
     "Kill Evil Armor → Dullahan, then the same again\n\n"
     "No LB on boss 1 (Silkie)\n"
     "Full burst on the first Dullahan\n"
     "LB on the second Dullahan",
     says={"MT": "ดึง Evil Armor ตัวแรกไปฝั่งตะวันตกให้เร็ว"}, says_en={"MT": "Pull the first Evil Armor to the west quickly"})
step(P3, "Hells' Nebula + Infernal Weight + Dominion Slash", "Evil Armor", "Evil Armor",
     "Hells' Nebula: HP ผู้เล่นเหลือ 1\n"
     "อันตรายถ้ามี Bleeding ของ Dullahan ติดอยู่: ถ้า Bleeding ยังเหลือเวลา ต้องดูให้แน่ใจว่าหมดแล้วก่อน\n"
     "Infernal Weight: ดาเมจทั้งปาร์ตี้ + Heavy\n"
     "Dominion Slash: AoE กรวยด้านหน้า มาแน่นอนหลังติด Heavy\n\n"
     "หลัง Infernal Weight ทุกคนรอหน้าศัตรู ทิศของ Dominion Slash จะแน่นอน\n"
     "ลดการพลาด แนะนำ",
     "Hells' Nebula: drops players to 1 HP\n"
     "Dangerous with a Dullahan's Bleeding on you: if Bleeding still has time left, make sure it has run out first\n"
     "Infernal Weight: party-wide damage + Heavy\n"
     "Dominion Slash: a frontal cone; it always follows the Heavy\n\n"
     "After Infernal Weight, everyone waits in front of the enemy so Dominion Slash's direction is set\n"
     "Fewer accidents: recommended")
step(P3, "Infernal Pain + Blighted Gloom + King's Will", "Dullahan", "Dullahan",
     "Infernal Pain: ดาเมจทั้งปาร์ตี้ + Bleeding\n"
     "Blighted Gloom: AoE วงกลมใหญ่รอบตัวมัน ต้องออกห่าง\n"
     "King's Will: auto-attack ของมันแรงขึ้น Tank ใช้บัฟป้องกันให้ดี\n\n"
     "Infernal Pain: ใช้ Reprisal และ mitigate อื่น\n"
     "หลัง King's Will โดน auto-attack ที่แรงขึ้น + DoT จาก Infernal Pain\n"
     "Tank: วางบัฟป้องกันโดยคิดไว้เสมอว่าต้องรับ 2 ตัว",
     "Infernal Pain: party-wide damage + Bleeding\n"
     "Blighted Gloom: a big circle around it; always get out\n"
     "King's Will: its auto-attacks get stronger; Tank, use defensives well\n\n"
     "Infernal Pain: lower it with Reprisal and other mitigation\n"
     "After King's Will come stronger auto-attacks + the Infernal Pain DoT\n"
     "Tank: plan defensives knowing you are always holding two",
     says={"MT": "รับ 2 ตัวตลอด: วางบัฟป้องกันให้พอ"}, says_en={"MT": "You hold two at all times: plan defensives for it"})

# ================================================================== boss 2: Gladiator of Sil'dih
step(P4, "Flash of Steel", "raid-wide", "A raid-wide",
     "raid-wide ใช้ mitigate ให้ดี", "A raid-wide; mitigate it well")
RM = "Specter of Might + Rush of Might + Sculptor's Passion"
step(P4, RM, "① ร่ายเริ่ม: ดูว่าร่างแยกชาร์จกี่ครั้ง", "① The cast starts: count each mirage's charges",
     "ร่างแยก 2 ตัวออกที่ตะวันออกเฉียงเหนือ / ตะวันตกเฉียงเหนือ (หรือตะวันออกเฉียงใต้ / ตะวันตกเฉียงใต้)\n"
     "ทั้ง 2 ตัวใช้ Rush of Might พร้อมกัน: 2 จังหวะ ครึ่งหน้า แล้วครึ่งหลัง\n"
     "ไม่มีเกจบอกจำนวนชาร์จ (ต่างจาก Variant): นับจากเอฟเฟกต์\n"
     "บนเส้นทางพุ่งมีขีด: จำนวนชาร์จบอกว่าพุ่งไปถึงขีดไหน\n"
     "แบบชาร์จมีแค่ 3 แบบ: 1·2 / 1·3 / 2·3\n"
     "เฉพาะ 2·3: จุดปลอดภัยครั้งที่ 2 อยู่ต่ำ ต้องหลบครั้งแรกใกล้ร่องระหว่าง AoE\n\n"
     "① ร่ายเริ่ม: ดูเอฟเฟกต์ชาร์จของร่างแยกแต่ละตัว",
     "Two mirages appear north-east / north-west (or south-east / south-west)\n"
     "Both use Rush of Might at once: two hits, the front half then the back half\n"
     "There is no charge gauge (unlike the Variant): count from the effect\n"
     "The charge line has marks: the number of charges tells which mark it reaches\n"
     "Only three patterns: 1·2 / 1·3 / 2·3\n"
     "Only in 2·3 is the second safe spot low: dodge the first hit near the valley between the AoEs\n\n"
     "① The cast starts: watch each mirage's charge effect", pic="b2-02",
     refs=[FR("rush-of-might", V2, 196, "Specter of Might: ร่างแยก 2 ตัวพุ่งมาที่ขอบ ดูเอฟเฟกต์ว่าชาร์จกี่ครั้ง",
              "Specter of Might: two mirages at the edges; watch the effect to count the charges")])
step(P4, RM, "② แบบ 1·2 ครั้งแรก", "② Pattern 1·2, first hit",
     "หลบที่ขีดที่ 2 ของฝั่งที่ชาร์จ 2 ครั้ง\nและอยู่ฝั่งที่ AoE ของตัวที่ชาร์จ 1 ครั้งไม่โดน",
     "Dodge at the second mark on the side charged twice\non the side the once-charged mirage's AoE doesn't reach", pic="b2-03")
step(P4, RM, "③ แบบ 1·2 ครั้งที่ 2", "③ Pattern 1·2, second hit",
     "เห็นครั้งแรกแล้ว ไปจุดปลอดภัยด้านล่างทันที\nจุดปลอดภัยมักอยู่แถวที่ AoE ครั้งแรกของ 2 ตัวตัดกัน",
     "Once the first hit is seen, go straight to the lower safe spot\nIt is usually around where the two first hits crossed", pic="b2-04")
step(P4, RM, "④ แบบ 1·3 ครั้งแรก", "④ Pattern 1·3, first hit",
     "แบบ 1·3 ครั้งแรก: หลบตามภาพ", "Pattern 1·3, first hit: dodge as shown", pic="b2-05")
step(P4, RM, "⑤ แบบ 1·3 ครั้งที่ 2", "⑤ Pattern 1·3, second hit",
     "จุดปลอดภัยแคบกว่าแบบ 1·2 เล็กน้อย", "The safe spot is a little narrower than in 1·2", pic="b2-06")
step(P4, RM, "⑥ แบบ 2·3 ครั้งแรก: หลบใกล้ร่อง", "⑥ Pattern 2·3, first hit: near the valley",
     "เฉพาะแบบนี้: หลบครั้งแรกแถวร่องระหว่าง AoE\nไม่อย่างนั้นมักไปจุดปลอดภัยครั้งที่ 2 ไม่ทัน",
     "Only in this pattern: dodge the first hit near the valley between the AoEs\nOtherwise you often can't reach the second safe spot in time", pic="b2-07")
step(P4, RM, "⑦ แบบ 2·3 ครั้งที่ 2: แคบมาก", "⑦ Pattern 2·3, second hit: very narrow",
     "จุดปลอดภัยแคบมาก ระวัง", "The safe spot is very narrow; careful", pic="b2-08")
step(P4, RM, "⑧ Sculptor's Passion: line stack ใส่ Healer", "⑧ Sculptor's Passion: a line stack on the Healer",
     "พุ่งเสร็จ มี line stack ใส่ Healer ทันที\nให้ Tank ยืนหน้าสุด แล้วรับด้วยกัน\n\nSavage: แรงขึ้นมาก ใช้ mitigate ทั้งปาร์ตี้อย่างน้อย 1 อย่าง",
     "Right after the charges comes a line stack on the Healer\nPut the Tank at the front and take it together\n\nSavage: it hits much harder; use at least one party mitigation",
     strict=["MT"], pic="b2-09", says={"MT": "ยืนหน้าสุดของแนว"}, says_en={"MT": "Stand at the front of the line"})
step(P4, "Mighty Smite", "ท่าแรงใส่ aggro อันดับ 1", "A heavy hit on the top aggro",
     "ท่าแรงใส่ aggro อันดับ 1\nTank ใช้บัฟป้องกันให้ดี",
     "A heavy hit on the top aggro\nTank, use your defensives well", says={"MT": "ใช้บัฟป้องกัน"}, says_en={"MT": "Use defensives"})

CF = "Curse of the Fallen + Ring of Might"
step(P4, CF, "debuff 3 แบบ + stack ก่อนหรือหลัง", "Three debuffs + stack first or last",
     "Curse of the Fallen: ทุกคนได้ debuff\n"
     "Ring of Might: AoE วงกลมรอบบอสขนาดตามจำนวนชาร์จ + AoE donut ที่ช่องปลอดภัยกว้างแคบตามจำนวนชาร์จ\n"
     "ดูจำนวนชาร์จเพื่อหาจุดปลอดภัย พร้อมกับทำ debuff\n\n"
     "Echo of the Fallen: ทุกคน / หมดเวลา → AoE วงกลม / 17 วิ หรือ 14 วิ / ช่วยรับ stack ได้\n"
     "Lingering Echoes: 1 คน / หมดเวลา → เกิดพื้นที่ดาเมจหลายครั้งตรงนั้น / ไม่รับ stack\n"
     "Thunderous Echo: 1 คน / stack / ระเบิดตอนหมดเวลา\n\n"
     "Echo of the Fallen เหลือ 17 วิ → ทำ stack ก่อน\n"
     "เหลือ 14 วิ → ทำ stack ทีหลัง\n"
     "ถ้าทำ stack ก่อน: ตกลงจุด stack ไว้ล่วงหน้า\n"
     "game8: stack ที่ฝั่งตะวันตก / spread เป็นรูป + (4 ทิศ)\n\n"
     "จุดสีบนหัวในภาพ: ฟ้า = Echo of the Fallen / ม่วง = Thunderous Echo / แดง = Lingering Echoes",
     "Curse of the Fallen: everyone gets debuffs\n"
     "Ring of Might: a circle round the boss sized by its charges + a donut whose safe band depends on the charges\n"
     "Read the charges for the safe spot while handling the debuffs\n\n"
     "Echo of the Fallen: everyone / a circle AoE when it runs out / 17 s or 14 s / joins the stack\n"
     "Lingering Echoes: one player / leaves a damage zone that hits repeatedly where it runs out / does not join the stack\n"
     "Thunderous Echo: one player / a stack / goes off when it runs out\n\n"
     "Echo of the Fallen at 17 s → do the stack first\n"
     "At 14 s → do the stack last\n"
     "If the stack is first, agree on its spot beforehand\n"
     "game8: stack in the west / spread in a + (four directions)\n\n"
     "Dots above heads in the pictures: light blue = Echo of the Fallen / purple = Thunderous Echo / red = Lingering Echoes",
     refs=[FR("curse-of-the-fallen", V2, 418, "Curse of the Fallen: debuff บนหัวทุกคน / Ring of Might: วงรอบบอส แล้วตามด้วย donut",
              "Curse of the Fallen: debuffs over every head / Ring of Might: a circle round the boss, then a donut")])
step(P4, CF, "stack ทีหลัง ①: ได้ debuff", "Stack last ①: the debuffs land",
     "ตัวอย่าง: Echo ระเบิดก่อน แล้วทำ stack ทีหลัง\n① Curse of the Fallen: ต่างคนได้ debuff",
     "Example: the Echoes go off first, the stack comes last\n① Curse of the Fallen: everyone gets their debuffs", pic="b2-13")
step(P4, CF, "stack ทีหลัง ②: Ring of Might เริ่มร่าย", "Stack last ②: Ring of Might begins",
     "Ring of Might เริ่มร่าย: ดูจำนวนชาร์จ แล้วหาจุดปลอดภัย\nตอนนี้ดู debuff แล้วไปยืนตำแหน่งไว้",
     "Ring of Might begins: count the charges and find the safe spot\nRead your debuff now and take your position", pic="b2-14")
step(P4, CF, "stack ทีหลัง ③: Echo ระเบิด + วงรอบบอส", "Stack last ③: the Echoes + the circle",
     "Echo of the Fallen ระเบิด พร้อมกับวงรอบบอสของ Ring of Might", "The Echoes go off together with Ring of Might's circle", pic="b2-15")
step(P4, CF, "stack ทีหลัง ④: donut ตามมา → เข้าวงปลอดภัย", "Stack last ④: the donut follows → into its safe circle",
     "donut ของ Ring of Might ตามมาทันที: เข้าไปในวงปลอดภัย", "Ring of Might's donut follows at once: get into its safe circle", pic="b2-16")
step(P4, CF, "stack ทีหลัง ⑤: ทำ stack / Lingering ไปตะวันออก", "Stack last ⑤: the stack / Lingering goes east",
     "ทำ stack\nคนที่มี Lingering Echoes ไปฝั่งตะวันออก จบ",
     "Take the stack\nThe Lingering Echoes player goes east; done", pic="b2-17")
step(P4, CF, "stack ก่อน ①: รวมฝั่งตะวันตก", "Stack first ①: gather in the west",
     "ดู debuff แล้วรวมกันที่ฝั่งตะวันตกไว้\nภาพ: บอสชาร์จ 2 ครั้ง AoE มาถึงเส้นสีส้ม",
     "Read your debuff and gather in the west\nPicture: the boss charged twice, so its AoE reaches the orange line", pic="b2-18")
step(P4, CF, "stack ก่อน ②: stack + Lingering + วงรอบบอส", "Stack first ②: the stack + Lingering + the circle",
     "stack, Lingering Echoes และวงรอบบอสมาพร้อมกัน", "The stack, Lingering Echoes and the circle all go off", pic="b2-19")
step(P4, CF, "stack ก่อน ③: เข้า donut แล้ว spread ทำ Echo", "Stack first ③: into the donut, spread for the Echoes",
     "เข้าวงปลอดภัยของ donut ทันที แล้ว spread ทำ Echo of the Fallen จบ",
     "Get straight into the donut's safe band and spread for Echo of the Fallen; done", pic="b2-20")

HV = "Hateful Visage + Wrath of Ruin + Nothing beside Remains"
step(P4, HV, "① รูปปั้นทอง / เงิน + ลูกแสงที่ขอบ", "① Gold / silver statues + orbs at the edge",
     "รูปปั้นทองและเงินหลายตัวออกมา ยิง AoE แนวตรง\n"
     "ลูกแสงที่ขอบสนามก็ยิง AoE แนวตรง\n"
     "บางรูปปั้นไม่ยิง: หาจุดที่ไม่โดนทั้งรูปปั้นและลูกที่ขอบ\n"
     "สุดท้าย AoE วงเล็กขึ้นใต้เท้าทุกคน\n\n"
     "แบ่งสนามเป็น 4 ส่วน คนละส่วน จะพลาดน้อย\n\n"
     "① รูปปั้นออกมา และมีลูกแสงที่ขอบด้วย",
     "Several gold and silver statues appear and fire line AoEs\n"
     "Orbs at the edge fire line AoEs too\n"
     "Some statues don't fire: find a spot hit by neither the statues nor the edge orbs\n"
     "Last, a small AoE comes up under every player\n\n"
     "Split the field in four, one quarter each, for fewer accidents\n\n"
     "① The statues appear, with orbs at the edge", pic="b2-21",
     refs=[FR("hateful-visage", V2, 460, "Hateful Visage: รูปปั้นทอง / เงิน ยิงลำแสงเป็นแนวตรง", "Hateful Visage: gold / silver statues fire straight beams")])
step(P4, HV, "② หาจุดที่ลำแสงไม่โดน", "② Find a spot no beam reaches",
     "หลบไปที่ที่ลำแสงจากขอบและจากรูปปั้นไม่โดน", "Get where neither the edge beams nor the statues' beams reach", pic="b2-22")
step(P4, HV, "③ Nothing beside Remains: AoE ใต้เท้า อย่ายืนทับกัน", "③ Nothing beside Remains: AoEs underfoot; don't overlap",
     "ใกล้หลบลำแสงเสร็จ AoE ขึ้นใต้เท้า: อย่ายืนทับกับเพื่อน จบ",
     "As the beams finish, AoEs rise underfoot: don't overlap anyone; done", pic="b2-23")

AV = "Accursed Visage + Wrath of Ruin + Nothing beside Remains"
step(P4, AV, "debuff ทอง / เงิน และลำดับ", "The gold / silver curses and the priority",
     "ครั้งนี้ผู้เล่นได้ debuff พิเศษ ต้องทำพร้อมกับท่าแบบครั้งก่อน\n"
     "ต้องโดนลำแสงสีตรงข้ามกับ debuff ของตัวเองเพื่อลบ debuff\n\n"
     "Gilded Fate 1 + Silvered Fate 1: 2 คน / ลบที่จุดที่ลำแสงทองกับเงินตัดกัน / มี 2 จุด\n"
     "Silvered Fate ×2: 1 คน / ลบที่จุดที่ลำแสงทอง 2 เส้นตัดกัน / มี 1 จุด\n"
     "Gilded Fate ×2: 1 คน / ลบที่จุดที่ลำแสงเงิน 2 เส้นตัดกัน / มี 1 จุด\n\n"
     "ทอง 1 + เงิน 1 มีจุดลบ 2 จุด ถ้าไปจุดเดียวกัน หลังลบจะมี AoE ใต้เท้าขึ้น อาจพลาด\n"
     "game8 จึงแบ่งสนาม 4 ส่วน แล้วเรียงลำดับ 2 คนนี้:\n"
     "เหนือ MT > D1 > D2 > H1 ใต้",
     "This time the players get special debuffs, handled alongside the previous mechanic\n"
     "Get hit by the beam of the opposite colour to clear your curse\n\n"
     "Gilded Fate 1 + Silvered Fate 1: two players / cleared where a gold and a silver beam cross / two such spots\n"
     "Silvered Fate ×2: one player / cleared where two gold beams cross / one spot\n"
     "Gilded Fate ×2: one player / cleared where two silver beams cross / one spot\n\n"
     "Gold 1 + silver 1 has two spots; if both go to the same one, the AoE that rises after clearing can cause accidents\n"
     "So game8 splits the field in four and orders those two:\n"
     "North MT > D1 > D2 > H1 South",
     refs=[FR("accursed-visage", V2, 646, "Accursed Visage: debuff ทอง / เงินบนหัว ลบด้วยลำแสงสีตรงข้าม",
              "Accursed Visage: gold / silver curses over heads; clear them with the opposite colour's beam")])
step(P4, AV, "① ต่างคนไปจุดลบ debuff ของตัวเอง", "① Everyone goes to their own clearing spot",
     "Accursed Visage เริ่ม: ดู debuff แล้วไปจุดลบของตัวเอง\nคนที่ได้ทอง 1 + เงิน 1 ใช้จุดฝั่งเหนือ / ใต้ ตามลำดับ\nจุดทองและเงินบนหัวในภาพ: เลขคือจำนวน",
     "Accursed Visage starts: read your debuff and go to your clearing spot\nThe two with gold 1 + silver 1 take the north / south spot by the priority\nThe gold and silver marks over heads in the picture: the number is the count",
     pic="b2-27")
step(P4, AV, "② ลำแสงจากขอบ ครั้งที่ 1", "② The edge beams, first",
     "ลำแสงจากขอบสนาม ครั้งที่ 1", "The edge beams fire, first set", pic="b2-28")
step(P4, AV, "③ ลำแสงจากขอบ ครั้งที่ 2 + AoE ใต้เท้า", "③ The edge beams, second + AoEs underfoot",
     "ลำแสงจากขอบ ครั้งที่ 2 พร้อม AoE ใต้เท้า จบ", "The edge beams fire again, with the AoEs underfoot; done", pic="b2-29")
OTHER = ("แบบอื่น (game8): แบ่ง 4 ส่วน ใช้ส่วนละคน\nทอง 1 + เงิน 1 จะมีจุดฝั่งเหนือ 1 จุด และฝั่งใต้ 1 จุดเสมอ\n"
         "ป้ายในภาพ: G1+S1 = จุดของทอง 1 + เงิน 1 / S2 = จุดของเงิน ×2 / G2 = จุดของทอง ×2")
OTHER_EN = ("Other layouts (game8): split in four, one quarter each\nGold 1 + silver 1 always gets one spot in the north and one in the south\n"
            "Labels: G1+S1 = the gold 1 + silver 1 spot / S2 = the silver ×2 spot / G2 = the gold ×2 spot")
for k, pic in enumerate(("b2-30", "b2-31", "b2-32", "b2-33"), 1):
    step(P4, AV, f"แบบอื่น {k}", f"Other layout {k}", OTHER, OTHER_EN, pic=pic)

CM = "Curse of the Monument"
step(P4, CM, "debuff ของ Curse of the Monument", "The Curse of the Monument debuffs",
     "เริ่มแล้วได้ debuff ตามนี้ แล้วมี AoE 9 จุดบนพื้น\n"
     "จากนั้น tower 2 อันขึ้น 2 รอบ ที่ ตะวันออก-ตะวันตก หรือ เหนือ-ใต้\n"
     "ทำ tower และ debuff ไปพร้อมกัน\n\n"
     "เลขบนหัว (I / II): ลำดับที่ Scream of the Fallen ระเบิด / ระเบิดตอนทำ tower\n"
     "เลข II: เข้า tower รอบแรก\n"
     "เลข I: เข้า tower รอบที่ 2\n"
     "Scream of the Fallen: หมดเวลา → AoE วงกลมใหญ่มาก / ไปทำที่ขอบฝั่งที่ไม่มี tower\n"
     "Chains of Resentment: สายโยง Tank กับ Healer และ DPS กับ DPS / ตัดช้า = ดาเมจแรง + debuff damage down (ทำดาเมจได้น้อยลง)\n\n"
     "ลำดับเข้า tower:\n"
     "เหนือ / ตะวันออก MT > D1 > D2 > H1 ใต้ / ตะวันตก",
     "It starts with these debuffs, then 9 AoEs on the floor\n"
     "Then two towers come up twice, east-west or north-south\n"
     "Do the towers and the debuffs together\n\n"
     "Number over the head (I / II): the order Scream of the Fallen goes off / it goes off at tower time\n"
     "II: takes the first towers\n"
     "I: takes the second towers\n"
     "Scream of the Fallen: a huge circle when it runs out / take it at the edge on the side with no tower\n"
     "Chains of Resentment: Tank-Healer and DPS-DPS tethers / slow to break = heavy damage + a damage-down\n\n"
     "Tower priority:\n"
     "North / East MT > D1 > D2 > H1 South / West",
     refs=[FR("curse-of-the-monument", V2, 690, "Curse of the Monument: AoE วงกลม 9 จุด และ debuff เลข I / II บอกลำดับ",
              "Curse of the Monument: nine circle AoEs, and the I / II number gives the order")])
step(P4, CM, "① รวมกันตรงกลาง", "① Gather in the middle",
     "Curse of the Monument เริ่ม: รวมกันตรงกลางไว้", "Curse of the Monument starts: gather in the middle", pic="b2-38")
step(P4, CM, "② ได้ debuff + สาย: MT·D1 ตะวันออก / H1·D2 ตะวันตก", "② Debuffs + chains: MT·D1 east / H1·D2 west",
     "ได้ debuff และสายแล้ว แยกออกไปตัดสาย\nMT·D1 ไปฝั่งตะวันออก\nH1·D2 ไปฝั่งตะวันตก",
     "Once the debuffs and chains are out, split to break the chains\nMT·D1 go east\nH1·D2 go west",
     strict=True, pic="b2-39",
     says={"MT": "ฝั่งตะวันออก (กับ D1)", "D1": "ฝั่งตะวันออก (กับ MT)", "H1": "ฝั่งตะวันตก (กับ D2)", "D2": "ฝั่งตะวันตก (กับ H1)"},
     says_en={"MT": "East (with D1)", "D1": "East (with MT)", "H1": "West (with D2)", "D2": "West (with H1)"})
step(P4, CM, "③ ตัดสายแล้ว ไปที่วงเตือนลูกที่ 5 เพื่อหลบ", "③ Chains broken, go to the fifth telegraph to dodge",
     "ตัดสายแล้ว ไปยืนที่วงเตือนของ AoE ลูกที่ 5 เพื่อหลบ AoE",
     "With the chains broken, stand in the fifth AoE's telegraph to dodge the AoEs",
     strict=True, pic="b2-40",
     says={"MT": "ตะวันออกเฉียงเหนือ (กับ D1)", "D1": "ตะวันออกเฉียงเหนือ (กับ MT)", "H1": "ตะวันตกเฉียงใต้ (กับ D2)", "D2": "ตะวันตกเฉียงใต้ (กับ H1)"},
     says_en={"MT": "North-east (with D1)", "D1": "North-east (with MT)", "H1": "South-west (with D2)", "D2": "South-west (with H1)"})
step(P4, CM, "③ รอที่ตะวันตก / ตะวันออก: เลข II เตรียมเข้า tower", "③ Wait west / east: II gets ready for the towers",
     "ทั้งสองคู่รออยู่ฝั่งตะวันตก / ตะวันออก\nต่อไป tower จะขึ้น: คนเลข II เตรียมเข้า",
     "Both pairs wait in the west / east\nThe towers come next: the II players get ready to take them",
     strict=True, pic="b2-41",
     says={"MT": "ฝั่งตะวันออก (กับ D1)", "D1": "ฝั่งตะวันออก (กับ MT)", "H1": "ฝั่งตะวันตก (กับ D2)", "D2": "ฝั่งตะวันตก (กับ H1)"},
     says_en={"MT": "East (with D1)", "D1": "East (with MT)", "H1": "West (with D2)", "D2": "West (with H1)"})
step(P4, CM, "④ tower ขึ้น: เลข II เข้า tower / เลข I ระเบิดที่ขอบ", "④ Towers: II takes them / I explodes at the edge",
     "tower ขึ้น: คนเลข II เข้า tower\nคนเลข I มี Scream of the Fallen ระเบิด: ไปทำที่ขอบฝั่งที่ไม่มี tower\nใครอยู่ฝั่งไหน ใช้ลำดับ MT > D1 > D2 > H1\nภาพ: MT กับ H1 ได้ II / D1 กับ D2 ได้ I",
     "The towers come up: the II players take them\nThe I players' Scream of the Fallen goes off: take it at the edge on the side with no tower\nWho goes which side follows MT > D1 > D2 > H1\nPicture: MT and H1 have II / D1 and D2 have I", pic="b2-42")
step(P4, CM, "⑤ tower รอบ 2: คนที่ระเบิดแล้วเข้า tower", "⑤ Second towers: the ones who exploded take them",
     "tower รอบที่ 2: คนที่ระเบิดเสร็จแล้วเข้า tower ต่อเลย\nคนเลข II ไประเบิดที่ขอบ จบ",
     "Second towers: those who just exploded step straight into them\nThe II players go to the edge to explode; done", pic="b2-43")

# ================================================================== boss 3: Shadowcaster Zeless Gah
step(P5, "Waymarks", "Marker ของ game8 (ใช้ตอน Infern Brand ครั้งที่ 3)", "game8's waymarks (for the third Infern Brand)",
     "game8 วาง marker สำหรับ Infern Brand ครั้งที่ 3\nmarker บอกจุดที่ต้องไปยืนล่อไม้เท้า\n\n"
     "A ขอบเหนือ ตรงกลาง\nB ฝั่งตะวันออก ค่อนไปทางเหนือ\nD ฝั่งตะวันตก ค่อนไปทางใต้\nC ขอบใต้ ตรงกลาง",
     "game8's waymarks are for the third Infern Brand\nThey mark where to stand to bait the staves\n\n"
     "A north edge, centre\nB east side, towards the north\nD west side, towards the south\nC south edge, centre", pic="b3-02")
step(P5, "Show of Strength", "raid-wide", "A raid-wide",
     "raid-wide ที่มาประจำ ใช้ mitigate ให้ดี\n\nSavage: ต่อครั้งต้องมี mitigate อย่างน้อย 2 อย่าง ไม่อย่างนั้นหนักมาก",
     "The usual raid-wide; mitigate it well\n\nSavage: at least two mitigations on each one, or it is very rough",
     refs=[FR("show-of-strength", V3, 10, "Show of Strength: raid-wide ใช้ mitigate อย่างน้อย 2 อย่าง", "Show of Strength: a raid-wide; at least two mitigations")])
IB1 = "Infern Brand + Firesteel Strike + Blessed Beacon"
step(P5, IB1, "ครั้งที่ 1 ①: ร่ายเริ่ม แยกไปจุด spread", "First ①: the cast starts, go to your spread spot",
     "ไม้เท้ากับลูกไฟที่โยงกันด้วย Cryptic Portal ออกมาทางเหนือ 2 ชุด ใต้ 2 ชุด\n"
     "หมุนตามทิศลูกศร หมุนเสร็จแล้วไม้เท้ากับลูกไฟสลับที่กัน แล้วระเบิด\n"
     "เดาว่าลูกไฟจะไปอยู่ตรงไหน หลบไปจุดปลอดภัย แล้วรับ Firesteel Strike ของบอส 2 ครั้งในจุดนั้น\n"
     "Firesteel Strike: ถ้าคนที่ไม่ใช่เป้าโดน AoE จะโดน knockback ไกล ต้องยืนห่างกันพอสมควร\n"
     "Blessed Beacon: คนที่ไม่โดน Firesteel Strike ไปยืนหน้าคนที่โดน แล้วรับแทน\n\n"
     "① ร่ายเริ่ม: ทางเหนือและใต้มีวงบอกการหมุน แยกไปจุด spread",
     "Staves and fireballs linked by Cryptic Portal appear, two sets north and two south\n"
     "They turn the way the arrows show; after turning, staff and fireball swap places and explode\n"
     "Predict where the fireballs end up, get to the safe area, and take the boss's two Firesteel Strikes there\n"
     "Firesteel Strike: anyone but the target caught in it is knocked far back, so keep some distance\n"
     "Blessed Beacon: the two not hit by Firesteel Strike stand in front of the two who were and take it\n\n"
     "① The cast starts: rotation markers appear north and south; take your spread spots", pic="b3-03",
     refs=[FR("infern-brand-1", V3, 32, "Infern Brand ครั้งที่ 1: ไม้เท้า + ลูกไฟโยงกัน หมุน แล้วสลับที่ ลูกไฟระเบิด",
              "First Infern Brand: staves and fireballs linked; they turn, swap and the fireballs explode")])
step(P5, IB1, "② หมุน: บอสร่าย Firesteel Strike", "② The turn: the boss casts Firesteel Strike",
     "เริ่มหมุน ตอนนี้บอสกำลังร่าย Firesteel Strike", "The turning starts; the boss is casting Firesteel Strike", pic="b3-04")
step(P5, IB1, "③ ลูกไฟระเบิด + Firesteel Strike คนแรก", "③ The fireballs explode + the first Firesteel Strike",
     "ลูกไฟระเบิด พร้อมกัน Firesteel Strike ใส่ 2 ใน 4 คน\nลงคนแรก",
     "The fireballs explode, and Firesteel Strike goes at 2 of the 4 players\nThe first one lands", pic="b3-05")
step(P5, IB1, "④ Firesteel Strike คนที่ 2", "④ The second Firesteel Strike",
     "ลงคนที่ 2\nคนที่โดนได้ debuff รับดาเมจเพิ่ม: ถ้ารับท่าต่อไปคนเดียวจะตาย",
     "The second one lands\nThose hit get a damage-taken-up debuff: taking the next attack alone kills them", pic="b3-06")
step(P5, IB1, "⑤ Blessed Beacon: 2 คนที่ไม่โดน ยืนบังหน้า", "⑤ Blessed Beacon: the two not hit stand in front",
     "Blessed Beacon: 2 คนที่ไม่โดน Firesteel Strike ไปยืนหน้าคนที่โดน แล้วรับแทน",
     "Blessed Beacon: the two not hit by Firesteel Strike stand in front of those who were and take it", pic="b3-07",
     refs=[FR("blessed-beacon", V3, 124, "Blessed Beacon: AoE แนวตรงจากบอส คนที่ไม่โดน Firesteel Strike ยืนบังหน้า",
              "Blessed Beacon: a line from the boss; those not hit by Firesteel Strike stand in front")])
step(P5, IB1, "⑥ Blessed Beacon ครั้งที่ 2", "⑥ The second Blessed Beacon",
     "Blessed Beacon ครั้งที่ 2 จบ", "The second Blessed Beacon; done", pic="b3-08")
POS1 = "ตำแหน่งยืนตามแบบ (สีของวงหมุน): ภาพนี้ D คือ Melee / H คือคนยืนไกล\n"
POS1_EN = "Where to stand by pattern (the rotation markers' colours): here D is the Melee / H the one far away\n"
step(P5, IB1, "แบบ น้ำเงิน-น้ำเงิน (1)", "Blue-blue (1)",
     POS1 + "ยืนข้างสีน้ำเงินที่อยู่ขวาสุด\nแบบนี้ Melee ยืนระหว่างลูกได้", POS1_EN + "Next to the rightmost blue\nIn this one the Melee can stand between the orbs", pic="b3-09")
step(P5, IB1, "แบบ น้ำเงิน-น้ำเงิน (2)", "Blue-blue (2)",
     POS1 + "ยืนข้างสีน้ำเงินที่อยู่ขวาสุด\nแบบนี้ให้นึกว่ายืนข้างลูกที่หมุน\nระวัง: ถ้าไปอยู่ระหว่างลูกไฟกับลูกที่หมุนจะโดน",
     POS1_EN + "Next to the rightmost blue\nIn this one, think of standing beside the turning orb\nCareful: between the fireball and the turning orb you get hit", pic="b3-10")
step(P5, IB1, "แบบ แดง-แดง (2)", "Red-red (2)",
     POS1 + "ยืนข้างสีแดงที่อยู่ซ้ายสุด\nแบบนี้ให้นึกว่ายืนข้างลูกที่หมุน\nระวัง: ถ้าไปอยู่ระหว่างลูกไฟกับลูกที่หมุนจะโดน",
     POS1_EN + "Next to the leftmost red\nIn this one, think of standing beside the turning orb\nCareful: between the fireball and the turning orb you get hit", pic="b3-11")
step(P5, IB1, "แบบ แดง-แดง (1)", "Red-red (1)",
     POS1 + "ยืนข้างสีแดงที่อยู่ซ้ายสุด\nแบบนี้ Melee ยืนระหว่างลูกได้", POS1_EN + "Next to the leftmost red\nIn this one the Melee can stand between the orbs", pic="b3-12")
step(P5, IB1, "แบบ น้ำเงิน-แดง (1)", "Blue-red (1)",
     POS1 + "แบบสีต่างกัน: Melee ยืนระหว่างลูกได้", POS1_EN + "Mixed colours: the Melee can stand between the orbs", pic="b3-13")
step(P5, IB1, "แบบ น้ำเงิน-แดง (2)", "Blue-red (2)",
     POS1 + "แบบสีต่างกัน: Melee ยืนระหว่างลูกได้", POS1_EN + "Mixed colours: the Melee can stand between the orbs", pic="b3-14")

IB2 = "Infern Brand + Cast Shadow"
step(P5, IB2, "ครั้งที่ 2 ①: เส้นน้ำเงิน / แดงขึ้น + ทุกคนได้เลข", "Second ①: blue / red lines + everyone gets a number",
     "วงเวท 3 มิติขึ้นที่ขอบ และมีเส้นสีน้ำเงิน / แดงที่มีไอคอนเลข 1–4\n"
     "ผู้เล่นทุกคนได้ debuff เลข (First Flame ถึง Fourth Flame)\n"
     "วงเวทยิง AoE แนวตรงจากจุดของมัน\n"
     "debuff หมดเวลา หรือเก็บเส้นเลขไม่ตรง = ระเบิด ตายหมู่\n\n"
     "วิธีทำ: เริ่มจากเส้นที่ติดกับประตูไฟ (วงเวท) อันแรก เก็บเส้นเลขเดียวกับ debuff ของตัวเอง\n"
     "ลำดับ: เก็บเส้น → หลบประตูไฟ → หลบ Cast Shadow → เก็บเส้น → หลบประตูไฟ\n\n"
     "เลขโรมันบนหัวในภาพ = เลขของ debuff",
     "Magic circles appear at the edge, with blue / red lines carrying number icons 1–4\n"
     "Every player gets a number debuff (First Flame to Fourth Flame)\n"
     "The circles fire line AoEs from where they stand\n"
     "If a debuff runs out, or you take a line of the wrong number, it explodes: a wipe\n\n"
     "The way: start with the lines touching the first fire door (circle); take the line of your own number\n"
     "Order: take a line → dodge the fire door → dodge Cast Shadow → take a line → dodge the fire door\n\n"
     "The Roman numeral over a head in the pictures = that player's number", pic="b3-16",
     refs=[FR("infern-brand-2", V3, 240, "Infern Brand ครั้งที่ 2: เส้นแดง / น้ำเงินมีเลข เลขบนหัว = เลขเส้นที่ต้องเก็บ",
              "Second Infern Brand: red / blue numbered lines; the number over your head is the line to take")])
step(P5, IB2, "② วงเวทอันแรก: เริ่มจากเส้นที่ติดกับมัน (ภาพ: น้ำเงิน)", "② The first circle: start with the lines touching it (here: blue)",
     "วงเวทอันแรกขึ้น: เริ่มจากเส้นที่ติดกับมัน (ภาพนี้ = น้ำเงิน)\nเก็บน้ำเงินเลข 1 → 4 ตามลำดับ\nแต่ต้องเก็บแดงตามลำดับด้วย: ไปยืนจุดที่เก็บได้ทั้งน้ำเงินและแดงตามลำดับ",
     "The first circle appears: start with the lines touching it (here = blue)\nTake blue 1 → 4 in order\nRed must also be taken in order later: stand where you can take both blue and red in order", pic="b3-17")
step(P5, IB2, "③ วงเวทอันที่ 2: เลข 1 เก็บน้ำเงิน", "③ The second circle: number 1 takes blue",
     "วงเวทอันที่ 2 ขึ้น: เลข 1 เก็บน้ำเงิน\nคนเลข 1 รอบนเส้นเลข 1 ไว้ก่อน จะเร็ว",
     "The second circle appears: number 1 takes blue\nNumber 1 waiting on line 1 makes it smooth", pic="b3-18")
step(P5, IB2, "④ เลข 2 เก็บน้ำเงิน", "④ Number 2 takes blue", "เลข 2 เก็บน้ำเงิน", "Number 2 takes blue", pic="b3-19")
step(P5, IB2, "⑤ เลข 3 เก็บน้ำเงิน", "⑤ Number 3 takes blue", "เลข 3 เก็บน้ำเงิน", "Number 3 takes blue", pic="b3-20")
step(P5, IB2, "⑥ เลข 4 เก็บน้ำเงิน แล้วออกจากแนววงเวทอันแรก", "⑥ Number 4 takes blue, then out of the first circle's line",
     "เลข 4 เก็บน้ำเงิน\nใกล้เก็บเสร็จ วงเวทอันแรกยิง AoE แนวตรง: ออกทันที",
     "Number 4 takes blue\nAs it finishes, the first circle fires its line: get out at once", pic="b3-21")
step(P5, IB2, "⑦ AoE จากวงเวท + Cast Shadow ครั้งที่ 1", "⑦ The circle's line + the first Cast Shadow",
     "วงเวทยิง AoE แนวตรง พร้อม Cast Shadow ครั้งที่ 1 จากบอส", "The circle fires its line, with the boss's first Cast Shadow", pic="b3-22",
     refs=[FR("cast-shadow", V3, 286, "Cast Shadow: AoE รูปพัดรอบบอส มา 2 ครั้ง หลบเข้าช่องว่าง",
              "Cast Shadow: fan-shaped AoEs round the boss, twice; dodge into the gaps")])
step(P5, IB2, "⑧ Cast Shadow ครั้งที่ 2: เลข 1 ไปเก็บแดง", "⑧ The second Cast Shadow: number 1 heads for red",
     "Cast Shadow ครั้งที่ 2: เลข 1 ไปเก็บเส้นแดง\nเก็บเส้นได้เมื่อ debuff รับดาเมจเวทเพิ่ม (จากการเก็บเส้น) หมด จึงเก็บระหว่าง Cast Shadow ก็ได้",
     "The second Cast Shadow: number 1 heads for the red line\nA line can be taken when the magic-damage-up debuff from the last one ends, so taking it during Cast Shadow is fine", pic="b3-23")
step(P5, IB2, "⑨ เลข 1 เก็บแดง", "⑨ Number 1 takes red", "เลข 1 เก็บแดง", "Number 1 takes red", pic="b3-24")
step(P5, IB2, "⑩ เลข 2 เก็บแดง", "⑩ Number 2 takes red", "เลข 2 เก็บแดง", "Number 2 takes red", pic="b3-25")
step(P5, IB2, "⑪ เลข 3 เก็บแดง", "⑪ Number 3 takes red", "เลข 3 เก็บแดง", "Number 3 takes red", pic="b3-26")
step(P5, IB2, "⑫ เลข 4 เก็บแดง แล้วออกจากแนววงเวท", "⑫ Number 4 takes red, then out of the circle's line",
     "เลข 4 เก็บแดง\nวงเวทยิง AoE แนวตรง: ออกจากแนวของมัน", "Number 4 takes red\nThe circle fires its line: get out of it", pic="b3-27")
step(P5, IB2, "⑬ AoE จากวงเวท + Firesteel Fracture", "⑬ The circle's line + Firesteel Fracture",
     "วงเวทยิง AoE แนวตรง จบ\nต่อด้วย Firesteel Fracture: ท่าแรงรูปกรวยใส่ aggro อันดับ 1\nTank: ย้ายไปจุดที่กรวยไม่โดนคนอื่น",
     "The circle fires its line; done\nNext comes Firesteel Fracture: a heavy cone on the top aggro\nTank: move where the cone hits nobody else", pic="b3-28",
     says={"MT": "Firesteel Fracture: หันกรวยไปทางที่ไม่มีคนอื่น"}, says_en={"MT": "Firesteel Fracture: point the cone away from everyone"})
step(P5, IB2, "วิธีคิดของแต่ละเลข", "How each number thinks",
     "เลข 1: จะมีจุดที่เส้นแดงกับน้ำเงินอยู่ติดกันเสมอ ไปหาจุดนั้น\n"
     "เลข 2: จุดที่เส้นแดงกับน้ำเงินติดกัน ถ้าไม่มี ไปจุดที่ทั้งแดงและน้ำเงินเรียง 1 → 2\n"
     "เลข 3: จุดที่เส้นแดงกับน้ำเงินติดกัน ถ้าไม่มี ไปจุดที่ทั้งแดงและน้ำเงินเรียง 2 → 3\n"
     "เลข 4: เก็บคนสุดท้าย ไม่มีจุดที่ติด สบายที่สุด อยู่ตรงไหนก็ได้\n\n"
     "ตัวอย่างของ game8: ถ้าเป็นเลข 3 และไม่มีจุดที่แดงกับน้ำเงินติดกันแบบเลข 1\n"
     "ให้หาจุดที่ทั้งแดงและน้ำเงินเรียง 2 → 3 นั่นคือจุดรอที่ถูกต้อง",
     "Number 1: there is always a place where a red and a blue line sit side by side; find it\n"
     "Number 2: where red and blue sit side by side; if there is none, where both red and blue run 1 → 2\n"
     "Number 3: where red and blue sit side by side; if there is none, where both red and blue run 2 → 3\n"
     "Number 4: takes last, nothing can trap you, the easiest; anywhere\n\n"
     "game8's example: as number 3, with no place where red and blue sit side by side as for 1\n"
     "look for where both red and blue run 2 → 3: that is the right place to wait")

IB3 = "Infern Brand"
step(P5, IB3, "ครั้งที่ 3 ①: เริ่ม (วิธี eis)", "Third ①: it starts (the eis method)",
     "ไม้เท้ายิง AoE พัดใส่คนที่ใกล้ที่สุด: เหนือ 2 ใต้ 2\n"
     "ไม้เท้าที่ย้ายที่ได้: เหนือ 2 ใต้ 2\n"
     "ผู้เล่นก็ได้เครื่องหมายย้ายที่ด้วย\n"
     "ไม้เท้า AoE พัดยิงตามลำดับที่เรืองแสง\n"
     "ลำแสงแดงจากขอบขวางการเดิน\n"
     "ใช้การย้ายที่ของไม้เท้าและของผู้เล่น ล่อ AoE พัดไม่ให้โดนเพื่อน\n\n"
     "game8 ใช้วิธี eis (คิดน้อย กำลังนิยม)\n"
     "① Infern Brand ครั้งที่ 3 เริ่ม",
     "Staves that fire a fan AoE at the nearest player: two north, two south\n"
     "Staves that teleport: two north, two south\n"
     "Players get teleport marks too\n"
     "The fan staves fire in the order they light up\n"
     "Red beams from the edge block your movement\n"
     "Use the staves' and the players' teleports to bait the fans away from everyone\n\n"
     "game8 uses the eis method (little to think about, the popular one)\n"
     "① The third Infern Brand starts", pic="b3-34",
     refs=[FR("infern-brand-3", V3, 344, "Infern Brand ครั้งที่ 3: ไม้เท้าย้ายที่ ผู้เล่นย้ายที่ ล่อ AoE พัด",
              "Third Infern Brand: staves teleport, players teleport; bait the fans")])
step(P5, IB3, "② ผู้เล่นได้เครื่องหมายย้ายที่", "② Players get teleport marks",
     "ผู้เล่นแต่ละคนได้เครื่องหมายย้ายที่", "Each player gets a teleport mark", pic="b3-35")
step(P5, IB3, "③ กลุ่มส้มไปเหนือ / กลุ่มน้ำเงินไปใต้", "③ Orange group north / blue group south",
     "กลุ่มสีส้มไปเหนือ กลุ่มสีน้ำเงินไปใต้\n"
     "เครื่องหมายย้ายอยู่ด้านซ้าย = ไปด้านนอก (ขอบเหนือสุด / ใต้สุด)\n"
     "เครื่องหมายย้ายอยู่ด้านขวา = ไปด้านใน\n"
     "จากเหนือลงใต้ต้องเป็น ซ้าย ขวา ขวา ซ้าย",
     "Orange group north, blue group south\n"
     "Teleport shown to the left = go outside (the far north / far south edge)\n"
     "Teleport shown to the right = go inside\n"
     "From north to south it should read left, right, right, left", pic="b3-36")
step(P5, IB3, "④ ไม้เท้าเริ่มย้าย: ยืนให้ทุกคนย้ายได้", "④ The staves teleport: stand so everyone can",
     "ไม้เท้าเริ่มย้ายที่: ทุกคนยืนตำแหน่งที่ย้ายได้", "The staves start teleporting: everyone takes a spot that lets them teleport too", pic="b3-37")
step(P5, IB3, "⑤ ล่อ: ด้านในยืนซ้ายของไม้เท้า / ด้านนอกยืนใต้ไม้เท้าตรง ๆ", "⑤ Bait: inside to the staff's left / outside straight south of it",
     "ย้ายแล้ว: คนด้านในยืนซ้ายของไม้เท้า คนด้านนอกยืนใต้ไม้เท้าตรง ๆ แล้วล่อ\nถ้ามี marker เฉพาะ ไปยืนที่ marker ก็พอ",
     "After the teleport: inside players stand to the staff's left, outside players straight south of it, and bait\nWith the dedicated waymarks, just stand on them", pic="b3-38")
step(P5, IB3, "⑥ ผู้เล่นย้ายที่: ด้านใน / ด้านนอกสลับกัน", "⑥ The players teleport: inside and outside swap",
     "เครื่องหมายย้ายของผู้เล่นทำงาน: ด้านในกับด้านนอกสลับกัน", "The players' teleports go off: inside and outside swap", pic="b3-39")
step(P5, IB3, "⑦ ล่อแบบเดียวกับครั้งแรก", "⑦ Bait the same way as the first time",
     "ไปยืนแบบเดียวกับตอนล่อครั้งแรก จบ", "Take the same spots as for the first bait; done", pic="b3-40")

IB4 = "Infern Brand + Firesteel Strike + Blessed Beacon"
step(P5, IB4, "ครั้งที่ 4 ①: แบ่ง 2 คู่ รอหน้าวงเวทตะวันออก / ตะวันตก", "Fourth ①: two pairs wait at the east / west circles",
     "วงเวทที่ย้ายที่ได้ 3 วง: ขอบตะวันออก 1 ขอบตะวันตก 1 ตรงกลาง 1\n"
     "หาจุดปลอดภัยหลังย้าย แล้วรับ Firesteel Strike ของบอส\n"
     "ต้องไปจุดปลอดภัยให้เร็ว และยืนไม่ให้ Firesteel Strike โดนคนอื่น\n"
     "game8 ใช้วิธีของ Omochi (เข้าใจง่าย)\n\n"
     "① แบ่ง 2 คู่ รอหน้าวงเวทที่ขึ้นทางตะวันออก / ตะวันตก\n"
     "ภาพ: คู่ Tank (MT + DPS 1 คน) ตะวันออก / คู่ Healer (H1 + DPS 1 คน) ตะวันตก",
     "Three teleporting magic circles: one at the east edge, one at the west edge, one in the middle\n"
     "Find the safe spot after the teleport and take the boss's Firesteel Strike\n"
     "Get to the safe spot fast and stand so Firesteel Strike catches nobody else\n"
     "game8 uses Omochi's method (easy to follow)\n\n"
     "① Split into two pairs and wait in front of the east / west circles\n"
     "Picture: the Tank pair (MT + one DPS) east / the Healer pair (H1 + one DPS) west",
     strict=True, pic="b3-41",
     says={"MT": "คู่ Tank: ตะวันออก", "H1": "คู่ Healer: ตะวันตก", "D1": "DPS คนละคู่: คู่ Tank (ตะวันออก) หรือคู่ Healer (ตะวันตก)", "D2": "DPS คนละคู่: คู่ Tank (ตะวันออก) หรือคู่ Healer (ตะวันตก)"},
     says_en={"MT": "Tank pair: east", "H1": "Healer pair: west", "D1": "One DPS per pair: the Tank pair (east) or the Healer pair (west)", "D2": "One DPS per pair: the Tank pair (east) or the Healer pair (west)"},
     refs=[FR("infern-brand-4", V3, 522, "Infern Brand ครั้งที่ 4: วงเวทย้ายที่ 3 วง หาจุดปลอดภัยหลังย้าย",
              "Fourth Infern Brand: three teleporting circles; find the safe spot after they move")])
step(P5, IB4, "② ขยับ 1 ช่องไปทางที่วงเวทไม่ย้ายไป + ดูวงกลาง", "② Step one tile away from where your circle moves + read the middle one",
     "แต่ละคู่ขยับ 1 ช่อง ไปทางที่วงเวทตะวันออก / ตะวันตกไม่ย้ายไป\nดูว่าวงเวทกลางหมุนไปทางไหน (ภาพ: แถวซ้าย 1 แถวจะโดน)",
     "Each pair steps one tile towards the side its east / west circle won't move to\nRead which way the middle circle turns (picture: the left column gets hit)", strict=True, pic="b3-42",
     says={"MT": "คู่ Tank", "H1": "คู่ Healer", "D1": "อยู่กับคู่ของตัวเอง", "D2": "อยู่กับคู่ของตัวเอง"},
     says_en={"MT": "Tank pair", "H1": "Healer pair", "D1": "Stay with your pair", "D2": "Stay with your pair"})
step(P5, IB4, "③ พ้นจุดที่วงกลางทับ: คนที่ต้องไปด้านลึกไป", "③ Clear of the middle one: the pair's 'back' player moves back",
     "พ้นจุดที่วงเวทกลางจะทับแล้ว คนในคู่ที่มีหน้าที่ไปด้านลึก ย้ายไปด้านลึก\nภาพ: คู่ Tank = Tank ไป / คู่ Healer = DPS ไป",
     "Once clear of the middle circle, the player in each pair whose job is to go back moves back\nPicture: Tank pair = the Tank / Healer pair = the DPS", pic="b3-43")
step(P5, IB4, "④ วงเวททำงาน + Firesteel Strike ครั้งที่ 1", "④ The circles go off + the first Firesteel Strike",
     "วงเวททำงาน และ Firesteel Strike ครั้งที่ 1\nพื้นที่ของ Firesteel Strike เป็นแบบในภาพ ยืนแบบนี้จะไม่ทับกัน",
     "The circles go off, with the first Firesteel Strike\nFiresteel Strike's area is as drawn; standing like this, they don't overlap", pic="b3-44")
step(P5, IB4, "⑤ Firesteel Strike ครั้งที่ 2", "⑤ The second Firesteel Strike", "Firesteel Strike ครั้งที่ 2", "The second Firesteel Strike", pic="b3-45")
step(P5, IB4, "⑥ Blessed Beacon ครั้งที่ 1: 2 คนที่ไม่โดน ยืนบังหน้า", "⑥ The first Blessed Beacon: the two not hit stand in front",
     "Blessed Beacon ครั้งที่ 1: 2 คนที่ไม่โดน Firesteel Strike ไปยืนหน้าคนที่โดน แล้วรับแทน",
     "The first Blessed Beacon: the two not hit by Firesteel Strike stand in front of those who were and take it", pic="b3-46")
step(P5, IB4, "⑦ Blessed Beacon ครั้งที่ 2: รับแบบเดียวกัน", "⑦ The second Blessed Beacon: the same again",
     "Blessed Beacon ครั้งที่ 2: รับแบบเดียวกับครั้งแรก จบ", "The second Blessed Beacon: take it the same way; done", pic="b3-47")

IB5 = "Infern Brand + Cast Shadow + Pure Fire"
step(P5, IB5, "ครั้งที่ 5: เลข 1 · 2 ทำอะไร", "Fifth: what numbers 1 · 2 do",
     "ท่าใหญ่สุดท้าย: เส้นแดง / น้ำเงินขึ้น และไม้เท้า AoE พัด 4 อัน\n"
     "เก็บเส้นที่ขวางทาง ล่อ AoE พัดของไม้เท้าทีละอันจนครบ\n"
     "ดูยาก แต่ถ้ารู้วิธีแล้วผ่านได้\n\n"
     "เลข 1 · 2:\n"
     "1. เริ่มแล้วอยู่ตรงกลาง\n"
     "2. เก็บเส้นได้แล้ว: เก็บเส้นเลข 1, 2 ฝั่งไม้เท้าที่ยิงก่อน เปิดทางให้เลข 3, 4\n"
     "3. เลข 3, 4 เก็บเส้นแล้ว: ยืนประกบไม้เท้าอันที่ 2 ล่อ AoE พัด\n"
     "4. หลังไม้เท้าอันที่ 2: วาง AoE ของ Pure Fire\n"
     "5. เก็บเส้นเลข 1, 2 ที่เหลือ\n"
     "6. เลข 3, 4 เก็บเส้นแล้ว: ล่อไม้เท้าอันสุดท้าย",
     "The last big mechanic: red / blue lines appear, with four fan staves\n"
     "Take the lines that block the way and bait the staves' fans one by one\n"
     "It looks hard, but once you know how it is beatable\n\n"
     "Numbers 1 · 2:\n"
     "1. Start in the middle\n"
     "2. When lines can be taken: take lines 1 and 2 on the first staff's side, opening the way for 3 and 4\n"
     "3. Once 3 and 4 have taken theirs: stand on either side of the second staff and bait its fan\n"
     "4. After the second staff: drop the Pure Fire AoEs\n"
     "5. Take the remaining lines 1 and 2\n"
     "6. Once 3 and 4 have taken theirs: bait the last staff",
     refs=[FR("infern-brand-5", V3, 752, "Infern Brand ครั้งที่ 5: เส้นแดง / น้ำเงิน ไม้เท้า 4 อัน ล่อ AoE พัดทีละอัน",
              "Fifth Infern Brand: red / blue lines and four staves; bait the fans one at a time")])
step(P5, IB5, "ครั้งที่ 5: เลข 3 · 4 ทำอะไร", "Fifth: what numbers 3 · 4 do",
     "เลข 3 · 4:\n"
     "1. ไปที่ไม้เท้าที่เรืองแสงก่อน ยืนประกบไม้เท้า ล่อ AoE พัด\n"
     "2. ล่อเสร็จและเลข 1, 2 เก็บเส้นแล้ว: เก็บเส้นเลข 3, 4 ฝั่งไม้เท้าอันที่ 2\n"
     "3. หลังไม้เท้าอันที่ 2: วาง AoE ของ Pure Fire\n"
     "4. เลข 1, 2 เก็บเส้นแล้ว: ล่อไม้เท้าอันที่ 3\n"
     "5. หลบ AoE ของ Cast Shadow ระหว่างไปเก็บเส้นเลข 3, 4 ที่เหลือ\n\n"
     "เลขโรมันบนหัวในภาพ = เลขของ debuff",
     "Numbers 3 · 4:\n"
     "1. Go to the staff that lit up first; stand on either side of it and bait its fan\n"
     "2. When that's done and 1 and 2 have taken theirs: take lines 3 and 4 on the second staff's side\n"
     "3. After the second staff: drop the Pure Fire AoEs\n"
     "4. Once 1 and 2 have taken theirs: bait the third staff\n"
     "5. Dodge Cast Shadow while taking the remaining lines 3 and 4\n\n"
     "The Roman numeral over a head in the pictures = that player's number")
STEPS5 = [
    ("b3-48", "① เลข 1, 2 รอตรงกลาง / เลข 3, 4 ไปฝั่งไม้เท้าที่ยิงก่อน", "① 1, 2 wait in the middle / 3, 4 go to the first staff's side"),
    ("b3-49", "② ไม้เท้าอันแรก: ยืนประกบไม้เท้า ล่อ AoE", "② The first staff: stand either side of it and bait"),
    ("b3-50", "③ เลข 1, 2 เก็บเส้นเลข 1, 2 ฝั่งไม้เท้าอันแรก", "③ 1 and 2 take lines 1 and 2 on the first staff's side"),
    ("b3-51", "④ ทางเปิด: เลข 3 เก็บเส้นเลข 3 ฝั่งไม้เท้าอันที่ 2", "④ The way opens: 3 takes line 3 on the second staff's side"),
    ("b3-52", "⑤ เลข 4 เก็บเส้นเลข 4", "⑤ 4 takes line 4"),
    ("b3-53", "⑥ เลข 1, 2 ล่อไม้เท้าอันที่ 2", "⑥ 1 and 2 bait the second staff"),
    ("b3-54", "⑦ Pure Fire: แต่ละกลุ่มวาง AoE โดยเว้นตรงกลาง", "⑦ Pure Fire: each group drops its AoEs, leaving the middle open"),
    ("b3-55", "⑧ เลข 1, 2 เก็บเส้นเลข 1, 2 ที่เหลือ", "⑧ 1 and 2 take the remaining lines 1 and 2"),
    ("b3-56", "⑨ เลข 2 เก็บเส้นเลข 2 เปิดทาง", "⑨ 2 takes line 2, opening the way"),
    ("b3-57", "⑩ เลข 3, 4 ล่อไม้เท้า", "⑩ 3 and 4 bait the staff"),
    ("b3-58", "⑪ Cast Shadow ครั้งที่ 1", "⑪ The first Cast Shadow"),
    ("b3-59", "⑫ Cast Shadow ครั้งที่ 2: เลข 3, 4 หลบเข้าใกล้เส้นเลข 3, 4", "⑫ The second Cast Shadow: 3 and 4 dodge towards lines 3 and 4"),
    ("b3-60", "⑬ เลข 3 เก็บเส้นเลข 3 ทันที", "⑬ 3 takes line 3 at once"),
    ("b3-61", "⑭ เลข 4 เก็บเส้นเลข 4 ทันที", "⑭ 4 takes line 4 at once"),
    ("b3-62", "⑮ เลข 1, 2 ล่อไม้เท้าอันสุดท้าย", "⑮ 1 and 2 bait the last staff"),
]
NOTE5 = {"b3-48": ("เริ่ม: เลข 1, 2 รอตรงกลาง\nเลข 3, 4 ไปฝั่งไม้เท้าที่จะยิงก่อน", "It starts: 1 and 2 wait in the middle\n3 and 4 go to the side of the staff that fires first"),
         "b3-54": ("Pure Fire: แต่ละกลุ่มวาง AoE โดยเว้นตรงกลางไว้", "Pure Fire: each group drops its AoEs, keeping the middle open"),
         "b3-62": ("เลข 1, 2 ล่อไม้เท้าอันสุดท้าย จบ", "1 and 2 bait the last staff; done")}
for pic, th, en in STEPS5:
    n = NOTE5.get(pic, (th[2:], en[2:]))
    step(P5, IB5, th, en, n[0], n[1], pic=pic)

# ================================================================== the overview, requirements, rewards
NOTE = ("แผนตาม game8: หน้า Savage และหน้า Another (normal) ของบอสแต่ละตัว (ท่าบอสใน Savage เหมือน normal ทุกอย่าง แค่แรงขึ้น)\n"
        "ปาร์ตี้ 4 คน: MT = Tank (game8: T) / H1 = Healer (game8: H) / D1, D2 = DPS ตามที่ game8 เรียก D1 / D2\n"
        "game8 ไม่ได้บอกว่า D1 / D2 เป็น Melee หรือ Range: ในภาพของ game8 DPS ทั้งสองเป็น D เหมือนกัน\n\n"
        "คู่ที่ game8 ใช้ (Curse of the Monument): MT·D1 ฝั่งตะวันออก / H1·D2 ฝั่งตะวันตก\n"
        "ลำดับ (Accursed Visage, Curse of the Monument): MT > D1 > D2 > H1\n\n"
        "Marker: game8 วางเฉพาะบอส 3 สำหรับ Infern Brand ครั้งที่ 3 (ดูขั้นแรกของบอส 3)\n"
        "บอส 3: Infern Brand ครั้งที่ 3 ใช้วิธี eis / ครั้งที่ 4 ใช้วิธีของ Omochi\n\n"
        "ตายหมู่ = เริ่มใหม่ตั้งแต่ต้นดันเจี้ยน\n"
        "ต้องฆ่าบอส 3 ภายใน 24 นาทีหลังเริ่มตีลูกกระจ๊อกตัวแรก")
NOTE_EN = ("Plan follows game8: its Savage page and the Another (normal) page of each boss (Savage bosses have exactly the normal mechanics, only harder hitting)\n"
           "A party of four: MT = Tank (game8: T) / H1 = Healer (game8: H) / D1, D2 = the DPS as game8 calls them, D1 / D2\n"
           "game8 doesn't say whether D1 / D2 is Melee or Range: in its pictures both DPS are just D\n\n"
           "game8's pairs (Curse of the Monument): MT·D1 east / H1·D2 west\n"
           "Priority (Accursed Visage, Curse of the Monument): MT > D1 > D2 > H1\n\n"
           "Waymarks: game8 places them only for boss 3, for the third Infern Brand (see boss 3's first step)\n"
           "Boss 3: the third Infern Brand by the eis method / the fourth by Omochi's method\n\n"
           "A wipe sends you back to the start of the dungeon\n"
           "Boss 3 must die within 24 minutes of engaging the first trash")

OSMON = {"map": {"map": "k5t1/00", "size": 200, "x": 11.9, "y": 13.3, "label": "Osmon"},
         "say": "Old Sharlayan (X: 11.9 Y: 13.3) — Osmon (Shallow Moor ยืนใกล้กันที่ X: 12.0 Y: 13.3)",
         "say_en": "Old Sharlayan (X: 11.9 Y: 13.3) — Osmon (Shallow Moor stands close by at X: 12.0 Y: 13.3)"}
TRISASSANT = {"map": {"map": "k5t1/00", "size": 200, "x": 11.9, "y": 13.3, "label": "Trisassant"},
              "say": "จุดแลก: Trisassant ใน Old Sharlayan (X: 11.9 Y: 13.3)", "say_en": "Where to exchange: Trisassant in Old Sharlayan (X: 11.9 Y: 13.3)"}

rewards = [
    {"kind": "token", "name": "Sil'dihn Silver", "icon_src": ICON("ui/icon/065000/065098_hr1.tex"),
     "say": "เหรียญของซีรีส์ Sil'dihn (หน้ารวมของ game8)\n\nแลกที่ Trisassant ใน Old Sharlayan (X: 11.9 Y: 13.3)\n"
            "Sil'dihn Throne (mount): 100 เหรียญ\nSil'dih Survey Framer's Kit: 8 เหรียญ\nMateria X: 4 เหรียญ\nMateria IX: 2 เหรียญ",
     "say_en": "The Sil'dihn series' coin (game8's series page)\n\nExchange it with Trisassant in Old Sharlayan (X: 11.9 Y: 13.3)\n"
               "Sil'dihn Throne (mount): 100\nSil'dih Survey Framer's Kit: 8\nMateria X: 4\nMateria IX: 2",
     "pics": [TRISASSANT]},
    {"kind": "mount", "name": "Sil'dihn Throne", "icon_src": ICON("ui/icon/026000/026121_hr1.tex"),
     "say": "mount: แลกด้วย Sil'dihn Silver 100 เหรียญ ที่ Trisassant", "say_en": "A mount: 100 Sil'dihn Silver from Trisassant",
     "pics": [{"src": ICON("ui/icon/068000/068243_hr1.tex"), "say": "Sil'dihn Throne (Mount Guide)", "say_en": "Sil'dihn Throne (Mount Guide)"}]},
    {"kind": "other", "name": "Sil'dih Survey Framer's Kit", "icon_src": ICON("ui/icon/026000/026625_hr1.tex"),
     "say": "ของตกแต่ง portrait และ adventurer plate: แลกด้วย Sil'dihn Silver 8 เหรียญ", "say_en": "Portrait and adventurer plate decorations: 8 Sil'dihn Silver"},
]

guide = {
    "slug": "sildihn-savage", "short": "Sil'dihn (S)", "sort": 1,
    "name": "Another Sil'dihn Subterrane (Savage)",
    "category": "savage", "expansion": "Endwalker", "patch": "6.25",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/488640",
    "content_key": "cri:Another Sil'dihn Subterrane (Savage)",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 90, "party": 4, "minutes": 120,
            "unlock": "1. จบเมนเควสต์ Endwalker และคุยกับ Osmon ที่ Old Sharlayan (X: 11.9 Y: 13.3) หนึ่งครั้ง\n"
                      "2. รับเควสต์ A Key to the Past จาก Shallow Moor ที่ Old Sharlayan (X: 12.0 Y: 13.3) (Lv90) → ปลดล็อก the Sil'dihn Subterrane\n"
                      "3. เคลียร์ the Sil'dihn Subterrane (normal) แล้วคุยกับ Osmon (X: 11.9 Y: 13.3) → ปลดล็อก Another Sil'dihn Subterrane\n"
                      "IL sync 635: ของที่ IL เกิน 635 จะถูกปรับลงเป็น 635 (ไม่มี IL ขั้นต่ำ)",
            "unlock_en": "1. Finish the main scenario quest Endwalker and speak once to Osmon in Old Sharlayan (X: 11.9 Y: 13.3)\n"
                         "2. Take the quest A Key to the Past from Shallow Moor in Old Sharlayan (X: 12.0 Y: 13.3) (Lv90) → unlocks the Sil'dihn Subterrane\n"
                         "3. Clear the Sil'dihn Subterrane (normal) and speak to Osmon (X: 11.9 Y: 13.3) → unlocks Another Sil'dihn Subterrane\n"
                         "IL sync 635: gear above IL635 is scaled down to 635 (no minimum IL)",
            "unlock_pics": [OSMON]},
}

defaults = {"frame": [1, 1], "bg": S.BG, "arena": dict(S.A8), "waymarks": {}, "iconSize": 6.4, "markSize": 6, "bossSize": 10, "ring": 5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps),
      "phases", len(dict.fromkeys(s["phase"] for s in steps)), "mechs", len(dict.fromkeys((s["phase"], s["mech"]) for s in steps)))
