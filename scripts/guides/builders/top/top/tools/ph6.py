"""P6 (Alpha Omega), from Tuufless's Notes: elemental/top/06_alpha_omega/ (+ mitigation/)."""
from core import step, FR, P6
from scenes_top import *

B0 = (50, 50)
TRA = target_ring(B0, 29, face=0, gap=80)
CY = "#38d6d6"
U = 12.0   # one Cosmo Arrow line, % of the frame


def bands(idx, col=PINK, o=0.34):
    """Cosmo Arrow lines: for each band index k, the four lines |x-50| and |y-50| in [kU, (k+1)U]."""
    out = []
    for k in idx:
        a, b = k * U, (k + 1) * U
        m = (a + b) / 2
        for s in (1, -1):
            out.append(rect((50 + s * m, 50), U, 100, 0, col, o))
            out.append(rect((50, 50 + s * m), 100, U, 0, col, o))
    return out


def trio(d, extra=None):
    p = dict(MT=(50 - d, 50 - d), H1=(50 - d, 50 + d), ST=(50 + d, 50 + d))
    if extra:
        p.update(extra)
    return p


def moves(d0, d1):
    a, b = trio(d0), trio(d1)
    return [arrow(a[k], towards(a[k], b[k], 0.85), "#ffffff", 0.45) for k in a]


SEQ_IN = ["In", "Wait", "Out", "Wait", "Out (spread)", "In"]
SEQ_OUT = ["Out", "Wait", "In", "Out (spread)", "In"]
TH = {"In": "เข้าใน", "Wait": "รอ", "Out": "ออกนอก", "Out (spread)": "ออกนอก (spread)"}


def seqtxt(seq, cur):
    th = " > ".join(("[" + TH[x] + "]" if i == cur else TH[x]) for i, x in enumerate(seq))
    en = " > ".join(("[" + x + "]" if i == cur else x) for i, x in enumerate(seq))
    return th, en


# ---------------------------------------------------------------- setup
step(P6, "Mitigation", "แผน mitigate ทั้งเฟส", "The phase's mitigation plan",
     "เฟสนี้ต้องวางแผน mitigate ล่วงหน้า (แผนขั้นต่ำ):\n"
     "Cosmo Memory: Tank LB3 (ลำดับ WAR > PLD > DRK > GNB) / ใส่ MT 90s, ST Reprisal, H2 30s, D1 ได้ เพื่อให้ติดคูลดาวน์\n"
     "Cosmo Dive 1: MT Reprisal, H1 120s, H2 30s, D4 / Tank: Rampart, 3rd, short\n"
     "Wave Cannon 1 spread: H2 30s, D3 / stack: + ST Reprisal, ST 90s, D2 (ST เป็น GNB / DRK ใช้ 90s คลุม spread) / Tank: MT mitigate, ST invuln (30%, short, short ของอีกคน)\n"
     "Wave Cannon 2 spread: H2 30s, H2 120s / stack: + MT Reprisal, MT 90s, D1 (MT เป็น GNB / DRK ใช้ 90s คลุม spread) / Tank: MT invuln, ST mitigate\n"
     "Cosmo Dive 2: ST Reprisal, H2 30s, D4 / Tank: Rampart, 3rd, short\n"
     "Cosmo Meteor (Meteor): MT Reprisal, ST 90s, H1 120s, H2 30s, D3 / (Flare): H2 90s, D2",
     "This phase needs mitigation planned ahead (a bare-bones plan):\n"
     "Cosmo Memory: tank LB3 (WAR > PLD > DRK > GNB) / MT 90s, ST Reprisal, H2 30s, D1 can go in to put them on cooldown\n"
     "Cosmo Dive #1: MT Reprisal, H1 120s, H2 30s, D4 / tanks: Rampart, 3rd, short\n"
     "Wave Cannon #1 spread: H2 30s, D3 / stack: + ST Reprisal, ST 90s, D2 (a GNB / DRK ST uses the 90s on the spread) / tanks: MT mitigates, ST invulns (30%, short, co-tank's short)\n"
     "Wave Cannon #2 spread: H2 30s, H2 120s / stack: + MT Reprisal, MT 90s, D1 (a GNB / DRK MT uses the 90s on the spread) / tanks: MT invulns, ST mitigates\n"
     "Cosmo Dive #2: ST Reprisal, H2 30s, D4 / tanks: Rampart, 3rd, short\n"
     "Cosmo Meteor (Meteors): MT Reprisal, ST 90s, H1 120s, H2 30s, D3 / (Flares): H2 90s, D2",
     strict=False)

step(P6, "Mitigation", "ข้อควรรู้ของแผน mitigate", "Notes on the mitigation plan",
     "แผนนี้ไม่นับ mitigate ที่ไม่ได้มีทุกปาร์ตี้ (Passage of Arms, Collective Unconsciousness, Dismantle, Magick Barrier) และ mitigate อื่นของ Healer (Divine Benison, Aquaveil / Exaltation, Consolation / Panhaima, Fey Illumination): Healer ใส่เสริมเพื่อความสบาย\n"
     "กรณีพิเศษ: MT เป็น PLD ที่ใช้ Hallowed Ground ที่ Solar Ray แรกใน P5 และ ST เป็น GNB ที่ใช้ Superbolide ครั้งที่ 2: สลับ invuln / mitigate ของ Wave Cannon (PLD MT invuln ก่อน)\n"
     "ห้ามลง debuff ที่บอส (Addle, Dismantle, Feint, Reprisal) ตอน spread ของ Wave Cannon เกิน 1 อย่าง: ดาเมจจะไม่ถึงตายจน LB ไม่ขึ้น แล้วจะได้แค่ LB2 ตอน Cosmo Dive 2",
     "It leaves out mitigation not every party has (Passage of Arms, Collective Unconsciousness, Dismantle, Magick Barrier) and other healer tools (Divine Benison, Aquaveil / Exaltation, Consolation / Panhaima, Fey Illumination): healers add those for comfort\n"
     "Edge case: a PLD MT who Hallowed Grounded the first P5 Solar Ray with a GNB ST who Superbolided the second: swap the Wave Cannon invuln / mitigation (PLD MT invulns first)\n"
     "No more than one boss debuff (Addle, Dismantle, Feint, Reprisal) during Wave Cannon's spread: the hit stops being lethal, no LB is generated, and you only have LB2 at Cosmo Dive #2",
     strict=False)

step(P6, "Preparation", "ตกลงก่อนเข้าเฟส", "Decide before the phase",
     "ตกลงกันตั้งแต่ต้นไฟต์ หรือระหว่างคัตซีนก่อนเฟส:\n"
     "ลำดับ Tank LB3\n"
     "ลำดับ Melee LB3\n"
     "Healer คนไหนเข้ากลางตอน Cosmo Meteor\n\n"
     "แนะนำให้ D3 และ D4 ทำ macro LB ยิงใส่เป้าที่เลือก จะไม่ต้องเล็งเอง:\n"
     "/macroicon \"limit break\"\n"
     "/ac \"limit break\" <t>\n\n"
     "Cosmo Memory ต้องใช้ Tank LB3 และ barrier ด้วย ปาร์ตี้จึงรอด\n"
     "Cosmo Memory เปลี่ยนคนที่มี Quickening Dynamis 3 stack เป็น Brilliant Dynamis:\n"
     "คนมี Brilliant Dynamis ใช้ LB: กลายเป็น Spark of Dynamis และเกจ LB เติมกลับตามระดับที่ใช้ (ใช้ LB2 ได้คืน 2 ช่อง)\n"
     "ทั้ง Brilliant และ Spark mitigate ดาเมจจาก Omega ได้มาก / ตายแล้วหาย จะตายกับทุก Mechanic หลังจากนั้น",
     "Agree at the start of the fight or during the cutscene before the phase:\n"
     "The tank LB3 order\n"
     "The melee LB3 order\n"
     "Which healer goes to the middle for Cosmo Meteor\n\n"
     "D3 and D4 should prepare a Limit Break macro on their target so there's no aiming:\n"
     "/macroicon \"limit break\"\n"
     "/ac \"limit break\" <t>\n\n"
     "Cosmo Memory is a tank LB3 check; the party also needs shields\n"
     "It turns everyone's three stacks of Quickening Dynamis into Brilliant Dynamis:\n"
     "Using a Limit Break with Brilliant Dynamis turns it into Spark of Dynamis and refills the gauge by the level used (an LB2 refills two bars)\n"
     "Both mitigate a large part of Omega's damage / they're lost on death, and that player dies to every mechanic after",
     strict=False,
     refs=[FR("cosmo-memory", "nin", 886, "Alpha Omega เปิดเฟสด้วย Cosmo Memory: ใช้ Tank LB3 + barrier", "Alpha Omega opens with Cosmo Memory: tank LB3 + shields")])

sh = TRA + aoe((48, 33), 10, PINK, 0.4) + aoe((82, 37), 10, PINK, 0.4)
step(P6, "Auto-attack", "auto-attack: ST ยืนไกลสุดนอกวงเป้า", "Auto-attacks: the ST furthest, outside the circle",
     "ก่อนเริ่ม Mechanic แต่ละชุด Alpha Omega ตี auto-attack 2 ครั้ง\n"
     "auto-attack โดน 2 คน: คนถือ aggro (MT) และคนที่อยู่ไกลที่สุด\n"
     "ให้ ST เป็นคนไกลที่สุด: ST ยืนนอกวงเป้า คนอื่นอยู่ในวง\n"
     "auto-attack ไม่สน invuln ของ Tank: Tank ที่ invuln เหลือ HP 1 ต้องได้ heal ให้รอด auto-attack",
     "Before each mechanic combo Alpha Omega auto-attacks twice\n"
     "It hits two players: whoever holds aggro (the MT) and the furthest player\n"
     "Make the ST the furthest: the ST stands outside the targeting circle, the party inside\n"
     "These auto-attacks ignore tank invulns: a tank left at 1 HP by an invuln must be healed to survive them",
     strict=["MT", "ST"], pic="06/alpha_omega_aa.jpg",
     scene=board(sh, wm=False, boss=B0, roles=roles(MT=(48, 33), ST=(82, 37), H1=(59, 57), H2=(56, 61), D1=(61, 62), D2=(64, 59), D3=(60, 66), D4=(65, 64))))

# ---------------------------------------------------------------- Cosmo Arrow -> Cosmo Dive
CA = "Cosmo Arrow"
step(P6, CA, "ภาพรวม: Cosmo Arrow แล้ว Cosmo Dive", "Overview: Cosmo Arrow, then Cosmo Dive",
     "ชุดแรกคือ LB ของ BRD กับ DRG ในแบบของ Alpha Omega\n"
     "Cosmo Arrow: ยิงเส้น AoE 2 ชุด แต่ละเส้นเลื่อนออกด้านข้างทุกครั้งที่ลง / วิธีหลบขึ้นกับว่าชุดไหนขึ้นก่อน (ด้านใน หรือ ด้านนอก)\n"
     "ด้านในก่อน: เข้าใน > รอ > ออกนอก > รอ > ออกนอก (spread) > เข้าใน\n"
     "ด้านนอกก่อน: ออกนอก > รอ > เข้าใน > ออกนอก (spread) > เข้าใน\n"
     "marker คือขอบระหว่าง AoE ของ Cosmo Arrow\n\n"
     "Cosmo Dive: AoE แรงใส่ 2 คนที่ใกล้ที่สุด (ให้ Tank รับ) และ stack ใส่คนที่ไกลที่สุด (คนที่เหลือรับ)\n"
     "ในภาพ: MT / ST คือ Tank / H1 คือทั้งกลุ่มที่เหลือ",
     "The first combo is Alpha Omega's take on the BRD and DRG LBs\n"
     "Cosmo Arrow fires two sets of line AoEs that step sideways with each hit / how to dodge depends on which set appears first (inside or outside)\n"
     "Inside first: In > Wait > Out > Wait > Out (spread) > In\n"
     "Outside first: Out > Wait > In > Out (spread) > In\n"
     "The waymarks mark the boundary between Cosmo Arrow's AoEs\n\n"
     "Cosmo Dive hits the two closest players with a heavy AoE (the tanks) and the furthest with a stack (the rest)\n"
     "In the pictures: MT / ST are the tanks / H1 is the rest of the party",
     strict=False,
     refs=[FR("cosmo-arrow", "nin", 906, "Cosmo Arrow: เส้น AoE เป็นตาราง เลื่อนออกด้านข้างทุกครั้งที่ลง", "Cosmo Arrow: grid-like line AoEs that step sideways each hit")])

DIVE = dict(MT=(45, 33), ST=(62, 46), H1=(30, 74))
# (n, hit bands, telegraph bands, trio distance, next distance or None, sequence index or None)
CA_IN = [(1, [], [0], 20, None, None), (2, [], [0, 3], 20, None, None), (3, [0], [3], 20, 3, 0), (4, [1, 2, 3], [], 3, None, 1),
         (5, [0, 3], [], 3, 18, 2), (6, [0, 2, 3], [], 18, None, 3), (7, [0], [], 18, 35, 4), (8, [3], [], 35, 18, 5),
         (9, [1, 2], [], None, None, None), (10, [3], [], None, None, None)]
CA_OUT = [(1, [], [3], 20, None, None), (2, [], [0, 3], 20, None, None), (3, [3], [0], 20, 35, 0), (4, [0, 1, 2], [], 35, None, 1),
          (5, [3], [], 35, 18, 2), (6, [0, 3], [], 18, 35, 3), (7, [0, 1], [], 35, 18, 4), (8, [3], [], 18, None, 4),
          (9, [0, 3], [], None, None, None), (10, [], [], None, None, None)]
SAY = {1: ("telegraph ชุดแรกขึ้น", "The first telegraphs appear"), 2: ("telegraph ชุดที่ 2 ขึ้น", "The second telegraphs appear"),
       9: ("AoE สุดท้าย / เข้าจุด Cosmo Dive", "Last AoEs / take Cosmo Dive positions"), 10: ("Cosmo Dive ลง", "Cosmo Dive resolves")}


def ca_steps(mech, rows, seq, first_th, first_en, pics, dive=DIVE, extra_note=("", ""), mapstep=None):
    for n, hit, tele, d, nd, si in rows:
        sh = TRA + bands(tele, "#ffcf9a", 0.3) + bands(hit, PINK, 0.34)
        if d is None:
            pos = dict(dive)
            if n == 10 or (mapstep and n == mapstep):
                for k in ("MT", "ST", "H1"):
                    sh += aoe(pos[k], 11, CY, 0.35)
        else:
            pos = trio(d)
            if nd is not None:
                sh += moves(d, nd)
        th, en = SAY.get(n, ("หลบ AoE", "Dodge the AoEs"))
        if n == 3:
            th, en = (f"AoE {first_th} ลง", f"{first_en} AoEs resolve")
        if si is not None:
            sth, sen = seqtxt(seq, si)
            th_note, en_note = f"{n}. {th}\nลำดับ: {sth}", f"{n}. {en}\nSequence: {sen}"
        else:
            th_note, en_note = f"{n}. {th}", f"{n}. {en}"
        if extra_note[0] and n == 7:
            th_note += "\n" + extra_note[0]
            en_note += "\n" + extra_note[1]
        step(P6, mech, f"{first_th}ก่อน {n}: {th}", f"{first_en} first {n}: {en}", th_note, en_note,
             strict=False, pic=pics(n), scene=board(sh, wm=True, boss=B0, roles=roles(**pos)))


ca_steps(CA, CA_IN, SEQ_IN, "ด้านใน", "Inside", lambda n: f"06/alpha_omega_1_{n:02d}b.jpg",
         extra_note=("Alpha Omega เริ่มร่าย Cosmo Dive", "Alpha Omega starts casting Cosmo Dive"))
ca_steps(CA, CA_OUT, SEQ_OUT, "ด้านนอก", "Outside", lambda n: f"06/alpha_omega_1_{n:02d}a.jpg",
         extra_note=("Alpha Omega เริ่มร่าย Cosmo Dive", "Alpha Omega starts casting Cosmo Dive"))

step(P6, "Cosmo Dive", "Cosmo Dive 1: Tank ใกล้สุด ปาร์ตี้ stack ไกลสุด", "Cosmo Dive #1: tanks closest, party stack furthest",
     "Cosmo Dive: Tank 2 คนเป็นคนใกล้บอสที่สุดรับ AoE แรง / คนที่เหลือ stack กันเป็นคนไกลที่สุด\n"
     "mitigate: MT Reprisal, H1 120s, H2 30s, D4 / Tank: Rampart, 3rd, short",
     "Cosmo Dive: the two tanks, closest to the boss, take the heavy AoEs / the rest stack as the furthest\n"
     "Mitigation: MT Reprisal, H1 120s, H2 30s, D4 / tanks: Rampart, 3rd, short",
     strict=False,
     refs=None)

# ---------------------------------------------------------------- Unlimited Wave Cannon -> Wave Cannon
UW = "Unlimited Wave Cannon"
CLOCK = dict(MT=P(315, 15), D3=P(0, 15), D4=P(45, 15), H1=P(270, 15), H2=P(90, 15), D1=P(225, 15), ST=P(180, 15), D2=P(135, 15))


def exa(nums):
    out = []
    for a, n in nums:
        p = P(a, 22)
        out += aoe(p, 9, "#ff9d7a", 0.3) + [text(P(a, 15.5), str(n), 3.8, "#ff3b3b")]
    return out


PARTY0 = dict(MT=(48, 52), ST=(51, 52), H1=(47, 55), H2=(50, 55), D1=(53, 55), D2=(48, 58), D3=(51, 58), D4=(54, 58))
sh = TRA + aoe((50, 53), 9, "#ffb38a", 0.4) + exa([(315, 1), (0, 2), (45, 3), (90, 4)]) + [arrow((47, 56), (17, 66))]
step(P6, UW, "① stack กลางล่อ AoE แล้วออก 1.5 marker ก่อน Exaflare ลูกแรก", "① Stack in the middle, then out 1.5 markers before the first Exaflare",
     "Unlimited Wave Cannon: Exaflare 4 ลูกเรียงเป็นแนวโค้งนอกสนาม (โผล่ทีละลูก) + AoE ใหญ่ใต้เท้า 6 ครั้ง\n"
     "แก้โดย stack กลางสนาม ดูว่าแนว Exaflare เริ่มที่ไหน แล้วเดินออกไป 1.5 marker (67 องศา) ก่อนจุดของ Exaflare ลูกแรก\n"
     "พอเดินไปถึง Exaflare ลูกแรกผ่านไปแล้ว\n\n"
     "① Exaflare 4 ลูกแสดงทีละลูกนอกสนาม / ลูกแรกขึ้นก่อนแถบร่ายเสร็จนิดเดียว (ตอนแถบร่ายถึงตัว 'nn' ท้ายชื่อ)\n"
     "stack กลางล่อ AoE ก่อน แล้วออกไป 1.5 marker ก่อนจุดของ Exaflare ลูกแรก\n"
     "หาจุดเริ่มไม่เจอ: หมุนกล้องจนเห็นวงหนึ่ง ดูช่องว่างข้างๆ ถ้าไม่มีวงขึ้นที่ช่องนั้น นั่นคือจุดเริ่ม / ถ้ามีวงขึ้น แปลว่ากำลังดูปลายทาง จุดเริ่มอยู่อีกปลาย\n"
     "หรือรอหลัง auto-attack ครั้งที่ 2 แล้วออกไปดูที่ขอบแว้บหนึ่งก่อนกลับมารวมกลาง",
     "Unlimited Wave Cannon: four staggered Exaflares along an arc outside the arena + six large baited AoEs under each player\n"
     "Stack in the middle, see where the Exaflare arc begins, and move 1.5 waymarks (67 degrees) before the first Exaflare\n"
     "By the time you get there the first Exaflare has passed\n\n"
     "① Four Exaflare telegraphs appear one by one outside the arena / the first just before the cast bar finishes (at the 'nn' of its name)\n"
     "Stack in the middle to bait, then move out to 1.5 markers before the first Exaflare\n"
     "Can't find the start? Turn the camera until you see one, then watch the empty spot beside it: nothing appears there = that's the start / something appears = you're looking downstream, the start is the other end\n"
     "Or wait until after the boss's second auto-attack to step out to the edge for a look, then rejoin in the middle",
     strict=False, pic="06/alpha_omega_2_1.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**PARTY0)),
     refs=None)

sh = TRA + exa([(0, 2), (45, 3), (90, 4)])
for i, c in enumerate([(42, 54), (32, 56), (22, 56)]):
    sh += aoe(c, 9, "#ffb38a", 0.35) + [text(c, str(i + 1), 4, "#ffe0c8")]
sh += [arrow((22, 52), (20, 44))]
step(P6, UW, "② เดินสลับออกไป แล้วเลี้ยวตามทิศ Exaflare", "② Stagger out, then turn the way the Exaflares go",
     "② ระหว่างเดินออกให้เดินสลับ (stagger-step)\n"
     "พอ AoE ลูกที่ 3 ขึ้น Exaflare ลูกแรกผ่านไปแล้ว และเราควรอยู่นอกวงเป้าของบอสพอดี\n"
     "เลี้ยวแล้วล่อ AoE ต่อไปในทิศเดียวกับที่ Exaflare เกิด",
     "② Stagger-step on your way out\n"
     "By the third baited AoE the first Exaflare has passed and you should be just outside the boss's targeting circle\n"
     "Turn and keep baiting in the same direction the Exaflares spawned",
     strict=False, pic="06/alpha_omega_2_2.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(MT=(20, 44))))

sh = list(TRA)
for i, c in enumerate([(22, 56), (20, 44), (26, 32), (36, 22)]):
    sh += aoe(c, 9, "#ffb38a", 0.35) + [text(c, str(i + 3), 4, "#ffe0c8")]
sh += [arrow((38, 20), (52, 15))]
step(P6, UW, "③ AoE ใต้เท้ามีทั้งหมด 6 ครั้ง", "③ Six baited AoEs in all",
     "③ AoE ที่ล่อมีทั้งหมด 6 ครั้ง\n"
     "mitigate: H2 ใช้ 30s ตอน Exaflare ลูกที่ 4 ขึ้น (ตอนเลี้ยว) จะคลุม Cosmo Dive 2 และกลับมาทัน Cosmo Meteor (ในชุดที่ 4)",
     "③ There are six baited AoEs in total\n"
     "Mitigation: H2 using the 30s as the fourth Exaflare appears (as you turn) covers Cosmo Dive #2 and is back for Cosmo Meteor (in the fourth combo)",
     strict=False, pic="06/alpha_omega_2_3.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(MT=(53, 14))))

WCAN = "Wave Cannon"
sh = TRA + [beam(B0, P(ang(B0, CLOCK[k]), 24), 10, "#7fd0e0", 0.35) for k in ("MT", "H2", "D1", "ST")]
for k in ("MT", "H2", "D1", "ST"):
    sh += redmark(CLOCK[k])
step(P6, WCAN, "④ spread แบบหน้าปัดนาฬิกา: ลำแสงชุดแรก", "④ Clock spread: the first beams",
     "Wave Cannon: Mechanic ที่แรงที่สุดของชุดนี้ spread รับลำแสง 2 ชุด ชุดละ 4 แล้ว stack รับลำแสงใหญ่ 1 ลูก (2 คนหน้าสุดโดนแรงกว่า: ให้ Tank)\n\n"
     "④ กระจายตัวตอน Alpha Omega ร่าย Wave Cannon ยิง 4 คนแบบสุ่ม\n"
     "จุด spread (macro): MT ตก.เฉียงเหนือ / D3 เหนือ / D4 ตอ.เฉียงเหนือ / H1 ตะวันตก / H2 ตะวันออก / D1 ตก.เฉียงใต้ / ST ใต้ / D2 ตอ.เฉียงใต้",
     "Wave Cannon is this combo's heavy hitter: spread for two sets of four beams, then stack for one big beam (extra damage to the front two: the tanks)\n\n"
     "④ Spread out as Alpha Omega casts Wave Cannon at four random players\n"
     "Spread spots (macro): MT NW / D3 N / D4 NE / H1 W / H2 E / D1 SW / ST S / D2 SE",
     strict=True, pic="06/alpha_omega_2_4.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**CLOCK)),
     refs=None)

sh = TRA + [beam(B0, P(ang(B0, CLOCK[k]), 24), 10, "#7fd0e0", 0.35) for k in ("D3", "D4", "H1", "D2")]
step(P6, WCAN, "⑤ ลำแสงชุดที่ 2 อีก 4 คน", "⑤ The second beams, the other four",
     "⑤ Wave Cannon ชุดที่ 2 ยิงอีก 4 คนที่เหลือ",
     "⑤ Alpha Omega's second set of beams hits the other four",
     strict=True, pic="06/alpha_omega_2_5.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**CLOCK)))

STK = dict(ST=(61, 46), MT=(61, 53), H1=(72, 49), H2=(74, 51), D1=(70, 52), D2=(73, 46), D3=(76, 48), D4=(75, 54))
sh = TRA + [beam(B0, (98, 50), 15, "#e8f0ff", 0.4)]
step(P6, WCAN, "⑥ stack ทิศตะวันออก Tank อยู่หน้า (ST invuln)", "⑥ Stack east, tanks in front (ST invuln)",
     "⑥ stack รวมกันทิศตะวันออก Tank ทั้งสองยืนหน้าสุดรับลำแสงใหญ่\n"
     "แท้งค์บัสเตอร์แรงมาก:\n"
     "MT: mitigate หนัก\n"
     "ST: invuln\n"
     "(ใครอยู่หน้าไม่สำคัญ 2 คนหน้าโดนเท่ากัน / PLD ที่ใช้ Passage of Arms ให้อยู่หน้า)\n"
     "ทำไม ST invuln ก่อน: รองรับ GNB MT + PLD ST (PLD ต้อง Hallowed Ground ที่ Solar Ray แรกใน P5 / GNB จึงใช้ Superbolide ครั้งที่ 2 และกลับมาไม่ทัน Wave Cannon ลูกแรก)",
     "⑥ Stack together east, with both tanks in front to take the final shared beam\n"
     "An extremely hard-hitting tankbuster:\n"
     "MT: heavy mitigation\n"
     "ST: invuln\n"
     "(Who is in front doesn't matter, the front two take the same / a PLD using Passage of Arms goes in front)\n"
     "Why the ST invulns first: it fits GNB MT + PLD ST (the PLD must Hallowed Ground the first P5 Solar Ray, so the GNB Superbolides the second and isn't back for the first Wave Cannon)",
     strict=["MT", "ST"], pic="06/alpha_omega_2_6.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**STK)),
     refs=[FR("wave-cannon", "nin", 941, "Wave Cannon: ลำแสงสุดท้ายยิงใส่กลุ่มที่ stack Tank ยืนหน้าสุด", "Wave Cannon: the last beam hits the stacked group; tanks in front")],
     says={"MT": "หน้าสุด mitigate หนัก", "ST": "หน้าสุด invuln"}, says_en={"MT": "In front, heavy mitigation", "ST": "In front, invuln"})

# ---------------------------------------------------------------- Cosmo Arrow -> Wave Cannon
CA3 = "Cosmo Arrow"


def quad(d):
    return dict(MT=(50 - d, 50 - d), H2=(50 + d, 50 - d), H1=(50 - d, 50 + d), ST=(50 + d, 50 + d))


def qmoves(d0, d1):
    a, b = quad(d0), quad(d1)
    return [arrow(a[k], towards(a[k], b[k], 0.85), "#ffffff", 0.45) for k in a]


WCIN = dict(MT=P(315, 11), D3=P(0, 11), D4=P(45, 11), H1=P(270, 11), H2=P(90, 11), D1=P(225, 11), ST=P(180, 11), D2=P(135, 11))
WCOUT = dict(MT=P(315, 18), D3=P(0, 17), D4=P(45, 18), H1=P(270, 17), H2=P(90, 17), D1=P(225, 18), ST=P(180, 17), D2=P(135, 18))
step(P6, CA3, "ชุดที่ 3: Cosmo Arrow + Wave Cannon พร้อมกัน", "Third combo: Cosmo Arrow with Wave Cannon",
     "Alpha Omega ตี auto-attack 2 ครั้งก่อนเริ่มชุดที่ 3\n"
     "Cosmo Arrow รอบนี้ไม่เกี่ยวกับรอบแรก (ไม่จำเป็นต้องเป็นแบบตรงข้าม)\n"
     "ที่ยากคือ Wave Cannon ตรงกลาง: ต้อง spread รับลำแสง 2 ชุด ชุดละ 4 พร้อมหลบ Cosmo Arrow ไปด้วย\n"
     "stack ของ Wave Cannon ลงหลัง Cosmo Arrow จบไม่นาน\n\n"
     "H2 120s มีระยะ 30 yalm: แบบด้านนอกก่อน อีกฝั่งสนาม (H1, D1) จะอยู่นอกระยะ\n"
     "วงเป้าของบอสกว้าง 24 yalm: H2 ใช้ 120s ตอนปาร์ตี้หลบเข้าใน (ทุกคนอยู่ในวงเป้า) จะโดนทุกคน / ตรงนั้นก่อน stack 14 วินาที ใช้ได้ทั้ง H2 30s และ H2 120s",
     "Alpha Omega auto-attacks twice before the third combo\n"
     "This Cosmo Arrow is independent of the first one (not necessarily the opposite)\n"
     "The catch is the Wave Cannon in the middle: spread for two sets of four beams while dodging Cosmo Arrow\n"
     "The Wave Cannon stack goes off shortly after Cosmo Arrow ends\n\n"
     "The H2 120s has a 30-yalm range: with the outside-first pattern the far side (H1, D1) is out of range\n"
     "The targeting circle is 24 yalms across: H2 using the 120s as the party dodges in (everyone inside the circle) catches everyone / that is 14 s before the stack, so both H2 30s and H2 120s fit",
     strict=False, pic="06/alpha_omega_3_04a_faq.jpg",
     scene=board(TRA + bands([1, 2, 3], PINK, 0.3) + [ring((50, 50), 31, "#3df06a", 0.3, 0.8), arrow((22, 50), (78, 50), "#ffffff", 0.4), arrow((78, 50), (22, 50), "#ffffff", 0.4), text((50, 46), "30", 3.6)],
                 wm=True, boss=B0, roles=roles(MT=(24, 24), H2=(76, 24), H1=(24, 76), ST=(76, 76))))

CA3_IN = [(1, [], [0], 20, None, None, None), (3, [0], [3], 20, 4, 0, None), (5, [0, 3], [], 4, 18, 2, None), (6, [0, 2, 3], [], 18, None, 3, None),
          (7, [0], [], 18, 34, 4, None), (8, [1, 2], [], None, None, 5, "in"), (9, [1, 2], [], None, None, 5, "in"), (10, [3], [], None, None, None, "stack")]
CA3_OUT = [(6, [0, 3], [], 18, 34, 3, None), (8, [3], [], None, None, 4, "out"), (9, [0, 3], [], None, None, None, "in"), (10, [], [], None, None, None, "stack")]
TXT3 = {1: ("telegraph ด้านในขึ้น (ตามด้วยด้านนอก)", "The inside telegraphs appear (then the outside)"),
        3: ("AoE ด้านในลง", "The inside AoEs resolve"), 5: ("หลบ AoE", "Dodge the AoEs"),
        6: ("หลบ AoE / Alpha Omega เริ่มร่าย Wave Cannon", "Dodge / Alpha Omega starts casting Wave Cannon"),
        7: ("หลบ AoE", "Dodge the AoEs"), 8: ("หลบ AoE / ลำแสง Wave Cannon ชุดแรกลง", "Dodge / the first Wave Cannon beams resolve"),
        9: ("หลบ AoE / ลำแสงชุดที่ 2 ลง", "Dodge / the second beams resolve"), 10: ("AoE สุดท้าย / ไปเตรียม stack", "Last AoEs / move for the stack")}


def ca3(rows, seq, first_th, first_en, suffix):
    for n, hit, tele, d, nd, si, wc in rows:
        sh = TRA + bands(tele, "#ffcf9a", 0.3) + bands(hit, PINK, 0.34)
        if wc == "in":
            pos = WCIN
            sh += [beam(B0, P(ang(B0, WCIN[k]), 24), 9, "#7fd0e0", 0.35) for k in (("MT", "H2", "D1", "ST") if n == 8 else ("D3", "D4", "H1", "D2"))]
        elif wc == "out":
            pos = WCOUT
            sh += [beam(B0, P(ang(B0, WCOUT[k]), 24), 9, "#7fd0e0", 0.35) for k in ("MT", "H2", "D1", "ST")]
        elif wc == "stack":
            pos = STK
        else:
            pos = quad(d)
            if nd is not None:
                sh += qmoves(d, nd)
        th, en = TXT3[n]
        if suffix == "a" and n == 6:
            th, en = ("หลบ AoE (ออกนอก spread) / เริ่มร่าย Wave Cannon", "Dodge (out, spread) / Wave Cannon cast starts")
        if suffix == "a" and n == 9:
            th, en = ("AoE สุดท้าย / ลำแสงชุดที่ 2 ลง", "Last AoEs / the second beams resolve")
        if suffix == "a" and n == 10:
            th, en = ("ไปเตรียม stack", "Move for the stack")
        if si is not None:
            sth, sen = seqtxt(seq, si)
            nt, ne = f"{n}. {th}\nลำดับ: {sth}", f"{n}. {en}\nSequence: {sen}"
        else:
            nt, ne = f"{n}. {th}", f"{n}. {en}"
        if wc in ("in", "out"):
            nt += "\nspread แบบหน้าปัดนาฬิกา (MT D3 D4 / H1 H2 / D1 ST D2) ขณะหลบ Cosmo Arrow"
            ne += "\nClock spread (MT D3 D4 / H1 H2 / D1 ST D2) while dodging Cosmo Arrow"
        step(P6, CA3, f"รอบ 3 {first_th}ก่อน {n}: {th}", f"Combo 3, {first_en} first {n}: {en}", nt, ne,
             strict=bool(wc in ("in", "out", "stack")) and (["MT", "ST"] if wc == "stack" else True),
             pic=f"06/alpha_omega_3_{n:02d}{suffix}.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**pos)))


ca3(CA3_IN, SEQ_IN, "ด้านใน", "Inside", "b")
ca3(CA3_OUT, SEQ_OUT, "ด้านนอก", "Outside", "a")

sh = TRA + [beam(B0, (98, 50), 15, "#e8f0ff", 0.4)]
step(P6, WCAN, "⑪ stack ตะวันออก Tank อยู่หน้า (MT invuln)", "⑪ Stack east, tanks in front (MT invuln)",
     "⑪ stack รวมกันทิศตะวันออก (Tank อยู่หน้า) รับ Wave Cannon\n"
     "MT: invuln\n"
     "ST: mitigate หนัก\n"
     "เวลาใช้ยา (buff window 2): ทันทีหลัง Wave Cannon ลูกที่ 2",
     "⑪ Stack together east (tanks in front) for Wave Cannon\n"
     "MT: invuln\n"
     "ST: heavy mitigation\n"
     "Potion window 2: right after Wave Cannon #2",
     strict=["MT", "ST"], pic="06/alpha_omega_3_11.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**STK)),
     says={"MT": "หน้าสุด invuln", "ST": "หน้าสุด mitigate หนัก"}, says_en={"MT": "In front, invuln", "ST": "In front, heavy mitigation"})

# ---------------------------------------------------------------- Unlimited Wave Cannon -> Cosmo Dive
sh = TRA + aoe((50, 53), 9, "#ffb38a", 0.4) + exa([(0, 1), (315, 2), (270, 3), (225, 4)]) + [arrow((53, 50), (80, 37))]
step(P6, UW, "รอบ 4 ①: Exaflare อีกครั้ง", "Fourth combo ①: Exaflares again",
     "Alpha Omega ตี auto-attack 2 ครั้งก่อนชุดที่ 4 (ชุดที่ง่ายที่สุด)\n"
     "หลบ Unlimited Wave Cannon แบบเดิม แต่รอบนี้หลังล่อ AoE ลูกที่ 6 แล้วอยู่ที่เดิมเลย เพื่อแชร์ stack ของ Cosmo Dive\n\n"
     "① Exaflare 4 ลูกขึ้นนอกสนามเหมือนเดิม ลูกแรกขึ้นก่อนแถบร่ายเสร็จนิดเดียว\n"
     "stack กลางล่อ AoE แล้วออกไป 1.5 marker ก่อนจุดของ Exaflare ลูกแรก",
     "Alpha Omega auto-attacks twice before the fourth combo (the simplest)\n"
     "Dodge Unlimited Wave Cannon as before, but this time stay where you are after the sixth AoE to share the Cosmo Dive stack\n\n"
     "① Four Exaflare telegraphs appear outside the arena as before; the first just before the cast finishes\n"
     "Stack in the middle to bait, then move out to 1.5 markers before the first Exaflare",
     strict=False, pic="06/alpha_omega_4_1.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**PARTY0)))

sh = TRA + exa([(315, 2), (270, 3), (225, 4)])
for i, c in enumerate([(58, 46), (66, 40), (74, 32)]):
    sh += aoe(c, 9, "#ffb38a", 0.35) + [text(c, str(i + 1), 4, "#ffe0c8")]
step(P6, UW, "รอบ 4 ②: เดินสลับออกไป แล้วเลี้ยว", "Fourth combo ②: stagger out, then turn",
     "② เดินสลับ (stagger-step) ออกไป\n"
     "AoE ลูกที่ 3 ขึ้นตอน Exaflare ลูกแรกผ่านไปแล้ว และเราอยู่นอกวงเป้าพอดี\n"
     "เลี้ยวแล้วล่อ AoE ต่อในทิศเดียวกับที่ Exaflare เกิด",
     "② Stagger-step on your way out\n"
     "By the third AoE the first Exaflare has passed and you should be just outside the targeting circle\n"
     "Turn and keep baiting in the direction the Exaflares spawned",
     strict=False, pic="06/alpha_omega_4_2.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(MT=(74, 26))))

sh = list(TRA)
for i, c in enumerate([(74, 32), (66, 22), (56, 15), (44, 15)]):
    sh += aoe(c, 9, "#ffb38a", 0.35) + [text(c, str(i + 3), 4, "#ffe0c8")]
step(P6, UW, "รอบ 4 ③: AoE 6 ครั้ง", "Fourth combo ③: six AoEs",
     "③ AoE ที่ล่อมีทั้งหมด 6 ครั้ง",
     "③ There are six baited AoEs in total",
     strict=False, pic="06/alpha_omega_4_3.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(MT=(26, 22))))

D4P = dict(MT=(59, 41), ST=(54, 60), H1=(25, 25), H2=(28, 25), D1=(25, 28), D2=(28, 28), D3=(26.5, 22), D4=(22, 26.5))
sh = TRA + aoe(D4P["MT"], 11, CY, 0.35) + aoe(D4P["ST"], 11, CY, 0.35) + aoe((26, 26), 11, CY, 0.35) + [arrow((30, 30), (55, 39)), arrow((30, 31), (51, 56))]
step(P6, "Cosmo Dive", "รอบ 4 ④: Cosmo Dive 2: MT หน้าซ้าย ST หน้าขวา", "Fourth combo ④: Cosmo Dive #2, MT front-left, ST front-right",
     "④ ปาร์ตี้อยู่ที่เดิมนอกวงเป้าของบอส แชร์ AoE หนึ่งของ Cosmo Dive / MT กับ ST เดินหน้าเข้าไปรับอีก 2 ลูก\n"
     "MT: ไปข้างหน้าแล้วเยื้องซ้าย\n"
     "ST: ไปข้างหน้าแล้วเยื้องขวา\n"
     "mitigate: ST Reprisal, H2 30s, D4 / Tank: Rampart, 3rd, short\n\n"
     "ถึงตรงนี้ปาร์ตี้ควรได้ LB3 กลับมาแล้ว (ตั้งแต่ต้นเฟส): Melee 2 คนผลัดกัน LB3 ก่อน Mechanic ใหญ่สุดท้าย / LB3 ครั้งที่ 3 ของ Melee ใช้ตอน enrage",
     "④ The party stays outside the boss's targeting circle to share one Cosmo Dive AoE / MT and ST step forward to take the other two\n"
     "MT: go forward and to the left\n"
     "ST: go forward and to the right\n"
     "Mitigation: ST Reprisal, H2 30s, D4 / tanks: Rampart, 3rd, short\n\n"
     "By now the party should have rebuilt LB3 from the start of the phase: the two melee take turns LB3ing before the last big mechanic / the third melee LB3 comes during the enrage cast",
     strict=["MT", "ST"], pic="06/alpha_omega_4_4.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**D4P)),
     says={"MT": "เดินหน้าเยื้องซ้าย รับ Cosmo Dive", "ST": "เดินหน้าเยื้องขวา รับ Cosmo Dive"},
     says_en={"MT": "Forward and left for Cosmo Dive", "ST": "Forward and right for Cosmo Dive"})

step(P6, "Limit Break", "ลำดับ LB3 ของ Melee", "The melee LB3 order",
     "ลำดับ LB3 ของ DPS โดยทั่วไป (Melee 2 คนต้องตกลงกันเองตอนต้นไฟต์หรือระหว่างคัตซีนก่อน P6 / ถ้า Melee คนไหนคู่กับ DNC คนทำ LB3 ตอน enrage อาจเปลี่ยน):\n"
     "DRG + MNK: MNK > DRG > DRG\n"
     "DRG + NIN: NIN > DRG > NIN\n"
     "DRG + RPR: RPR > DRG > DRG\n"
     "DRG + SAM: SAM > DRG > DRG\n"
     "MNK + NIN: MNK > NIN > NIN\n"
     "MNK + RPR: MNK > RPR > MNK\n"
     "MNK + SAM: SAM > MNK > MNK\n"
     "NIN + RPR: NIN > RPR > NIN\n"
     "NIN + SAM: NIN > SAM > SAM\n"
     "RPR + SAM: SAM > RPR > SAM",
     "The general DPS LB3 order (the two melee should confirm it at the start or during the cutscene before P6 / a melee partnered with a DNC changes who does the enrage LB3):\n"
     "DRG + MNK: MNK > DRG > DRG\n"
     "DRG + NIN: NIN > DRG > NIN\n"
     "DRG + RPR: RPR > DRG > DRG\n"
     "DRG + SAM: SAM > DRG > DRG\n"
     "MNK + NIN: MNK > NIN > NIN\n"
     "MNK + RPR: MNK > RPR > MNK\n"
     "MNK + SAM: SAM > MNK > MNK\n"
     "NIN + RPR: NIN > RPR > NIN\n"
     "NIN + SAM: NIN > SAM > SAM\n"
     "RPR + SAM: SAM > RPR > SAM",
     strict=False)

# ---------------------------------------------------------------- Cosmo Meteor
CM = "Cosmo Meteor"
SPOT = dict(D3=P(0, 13.2), MT=P(315, 13.2), D4=P(45, 13.2), H1=P(270, 13.2), H2=P(90, 13.2), D1=P(225, 13.2), ST=P(180, 13.2), D2=P(135, 13.2))
STACKC = dict(MT=(49, 47), ST=(51, 47), H1=(48, 50), H2=(52, 50), D1=(49, 53), D2=(51, 53), D3=(48, 56), D4=(52, 56))
sh = TRA + aoe((50, 50), 13, "#ffb38a", 0.4)
step(P6, CM, "① stack กลางล่อ AoE", "① Stack in the middle to bait",
     "Healer 1 คนกลับมากลางเพื่อ heal ปาร์ตี้ (มีดาเมจหลายระลอก) / ปกติตกลงกันก่อน\n"
     "ลำดับ Healer เข้ากลาง: AST > SGE / SCH > WHM\n\n"
     "Alpha Omega ตี auto-attack 2 ครั้ง แล้วหันเหนือร่าย Cosmo Meteor\n"
     "① stack กลางสนามล่อ AoE",
     "One healer returns to the middle to top the party (several waves of damage) / usually agreed beforehand\n"
     "Healer mid priority: AST > SGE / SCH > WHM\n\n"
     "Alpha Omega auto-attacks twice, then faces north and casts Cosmo Meteor\n"
     "① Stack in the centre to bait the AoE",
     strict=False, pic="06/alpha_omega_5_1.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**STACKC)),
     refs=[FR("cosmo-meteor", "nin", 1061, "Cosmo Meteor: AoE ใหญ่กลางสนาม หลบออกไปจุดของตัวเองตาม marker", "Cosmo Meteor: the big AoE in the middle; dodge out to your waymark spot")])

sh = [circle((50, 50), 33, "#3fae9a", 0.3, 0.01)] + TRA + aoe((50, 50), 20, "#ffb38a", 0.45)
for k in SPOT:
    sh.append(arrow(towards(B0, SPOT[k], 0.2), towards(B0, SPOT[k], 0.8), "#ffffff", 0.4))
step(P6, CM, "② กระจายไปจุดตาม marker / Caster LB3 กลาง", "② Spread to your marker spots / caster LB3 the middle",
     "② พอ AoE ขึ้น กระจายไปจุดของตัวเองตาม marker แล้ว Caster LB3 ยิงกลางสนามหลังหลบ AoE แล้ว\n"
     "จุด (macro): MT ตก.เฉียงเหนือ / D3 เหนือ / D4 ตอ.เฉียงเหนือ / H1 ตะวันตก / H2 ตะวันออก / D1 ตก.เฉียงใต้ / ST ใต้ / D2 ตอ.เฉียงใต้",
     "② When the telegraph appears, spread to your waymarked spot; a caster LB3s the centre after dodging\n"
     "Spots (macro): MT NW / D3 N / D4 NE / H1 W / H2 E / D1 SW / ST S / D2 SE",
     strict=True, pic="06/alpha_omega_5_2.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SPOT)))

MET = [(50, 34), (50, 66)]


def meteors():
    out = []
    for c in MET:
        out += [dot(c, 3.0, "#3e6b74"), ring(c, 3.0, "#9fe0e8", 0.3)]
    for a in (30, 100, 170, 240, 310):
        p = P(a, 12.5)
        out += [dot(p, 1.4, "#ff6b3d")]
    return out


SP3 = dict(SPOT)
SP3["H2"] = (50, 50)
sh = TRA + meteors()
for k in ("D3", "MT", "ST", "D2"):
    sh += aoe(SP3[k], 9, PINK, 0.4)
sh += [arrow((84, 50), (56, 50))]
step(P6, CM, "③ Meteor + Comet / AoE 4 คน / Healer เข้ากลาง", "③ Meteors + Comets / four AoEs / a healer to the middle",
     "③ Cosmo Meteor ใหญ่ 2 ลูกโผล่เหนือกับใต้ / Cosmo Comet เล็ก 5 ลูกรอบขอบ hitbox ของบอส\n"
     "Caster LB3 ทำลาย Comet ทั้งหมดและทำดาเมจ Meteor\n"
     "ช่วงนี้ห้ามตี Comet กับ Meteor: ตี Alpha Omega อย่างเดียว\n"
     "4 คนแบบสุ่มโดน AoE ที่ไม่มีวงเตือน\n"
     "หลัง AoE กลางลง: Healer 1 คนเข้ากลางสนาม heal ปาร์ตี้รับดาเมจที่กำลังมา\n"
     "mitigate (Meteor): MT Reprisal, ST 90s, H1 120s, H2 30s, D3 (H2 30s อาจยังไม่กลับมาทันระลอกแรก ST 90s ช่วยระลอกแรกไว้)",
     "③ Two large Cosmo Meteors spawn north and south / five small Cosmo Comets around the edge of the boss's hitbox\n"
     "The caster LB3 destroys all the Comets and damages the Meteors\n"
     "Don't attack the Comets or Meteors now: focus Alpha Omega\n"
     "Four random players get an untelegraphed AoE\n"
     "After the centre AoE resolves, one healer goes to the middle to top the party for what's coming\n"
     "Mitigation (Meteors): MT Reprisal, ST 90s, H1 120s, H2 30s, D3 (H2 30s may not be back for the first wave; the ST 90s covers it)",
     strict=True, pic="06/alpha_omega_5_3.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SP3)))

sh = TRA + meteors()
for k in ("D4", "H1", "D1", "D2"):
    sh += aoe(SP3[k], 9, PINK, 0.4)
step(P6, CM, "④ อีก 4 คนโดน", "④ The other four are hit",
     "④ อีก 4 คนที่ยังไม่โดน AoE ที่ไม่มีวงเตือน ตอนนี้โดน",
     "④ The four players not hit by the untelegraphed AoEs are hit now",
     strict=True, pic="06/alpha_omega_5_4.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SP3)))

sh = TRA + [dot(c, 3.0, "#3e6b74") for c in MET]
for k in ("D3", "D4", "H2", "D1"):
    sh += aoe(SP3[k], 9, PINK, 0.4)
step(P6, CM, "⑤ AoE ระลอกที่ 2 (4 คน)", "⑤ The second wave (four players)",
     "⑤ หลัง Caster LB3 ลง ปาร์ตี้โดน Cosmo Meteor ชุดที่ 2 ทีละ 4 คน",
     "⑤ After the caster LB3, the party takes a second set of Cosmo Meteor AoEs, four at a time",
     strict=True, pic="06/alpha_omega_5_5.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SP3)))

sh = TRA + [dot(c, 3.0, "#3e6b74") for c in MET]
for k in ("MT", "H1", "ST", "D2"):
    sh += aoe(SP3[k], 9, PINK, 0.4)
step(P6, CM, "⑥ อีก 4 คนที่เหลือ", "⑥ The other four",
     "⑥ เหมือนเดิม: 4 คนที่ยังไม่โดน ตอนนี้โดน",
     "⑥ As before, the four not hit yet are hit now",
     strict=True, pic="06/alpha_omega_5_6.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SP3)))

sh = TRA + [dot(c, 3.0, "#3e6b74") for c in MET] + [beam((50, 15), (50, 95), 12, "#7fe0c0", 0.35)] + flare(SP3["D3"]) + flare(SP3["MT"]) + flare(SP3["D1"])
step(P6, CM, "⑦ Range LB3 ทำลาย Meteor / Flare 3 คน", "⑦ Ranged LB3 on the Meteors / three Flares",
     "⑦ พอเกจ LB เต็ม: Range LB3 จากทิศเหนือ (หรือใต้) ปิด Cosmo Meteor ทั้ง 2 ลูก\n"
     "ช่วงเดียวกัน มาร์ก Flare ขึ้น 3 คนแบบสุ่ม\n"
     "D3 กำลังใช้ LB3 ขยับไม่ได้: ปาร์ตี้ปรับตาม D3 ว่ามี Flare หรือไม่",
     "⑦ When the gauge refills, a ranged LB3 from north (or south) finishes both Cosmo Meteors\n"
     "Around then, Flare markers go on three random players\n"
     "D3 is mid-LB3 and can't move: the party adjusts around whether D3 has a Flare",
     strict=["D3"], pic="06/alpha_omega_5_7.jpg", scene=board(sh, wm=True, boss=B0, roles=roles(**SP3)))

FA = dict(D3=P(0, 13.2), MT=P(270, 16.5), D1=P(90, 16.5), H1=(50, 79), H2=(52, 80), ST=(48, 81), D2=(50, 83), D4=(53, 82))
FB = dict(D1=P(180, 16.5), MT=P(270, 16.5), H2=P(90, 16.5), H1=(50, 20), D3=(52, 19), ST=(48, 21), D2=(50, 23), D4=(53, 22))
for which, pos, pic, th, en, st in (("a", FA, "06/alpha_omega_5_8a.jpg", "D3 มี Flare: Flare ไป เหนือ (D3) ตก ออก / ปาร์ตี้ stack ใต้", "D3 has a Flare: Flares N (D3), W, E / party stacks S", (50, 81)),
                                     ("b", FB, "06/alpha_omega_5_8b.jpg", "D3 ไม่มี Flare: Flare ไป ใต้ ตก ออก / ปาร์ตี้ stack เหนือ", "D3 has no Flare: Flares S, W, E / party stacks N", (50, 21))):
    flares = [k for k in ("D3", "MT", "D1") if k in pos and which == "a"] or ["D1", "MT", "H2"]
    sh = TRA + aoe(st, 11, PINK, 0.4)
    for k in flares:
        sh += flare(pos[k])
    step(P6, CM, "⑧ " + th, "⑧ " + en,
         "⑧ คนมี Flare 3 คนไปทิศหลัก / อีก 5 คนที่เหลือ 1 คนโดน AoE แชร์ดาเมจที่ไม่มีวงเตือน (stack)\n"
         "D3 มี Flare: Flare ไป เหนือ (D3), ตะวันตก, ตะวันออก / ปาร์ตี้ stack ใต้\n"
         "D3 ไม่มี Flare: Flare ไป ใต้, ตะวันตก, ตะวันออก / ปาร์ตี้ stack เหนือ\n"
         "mitigate (Flare): H2 90s, D2",
         "⑧ The three Flares go to cardinals / one of the other five is targeted for an untelegraphed shared AoE (a stack)\n"
         "D3 has a Flare: Flares N (D3), W and E / the party stacks S\n"
         "D3 has no Flare: Flares S, W and E / the party stacks N\n"
         "Mitigation (Flares): H2 90s, D2",
         strict=False, pic=pic, scene=board(sh, wm=True, boss=B0, roles=roles(**pos)))

# ---------------------------------------------------------------- Magic Number + enrage
step(P6, "Magic Number", "Magic Number: Tank LB3 แล้ว Healer LB3", "Magic Number: tank LB3, then healer LB3",
     "Alpha Omega ร่าย Magic Number: ต้อง mitigate ด้วย Tank LB3\n"
     "Magic Number ติด debuff ชื่อเดียวกันทุกคน: 6 วินาทีแล้วตาย ลบได้ด้วย Healer LB3 เท่านั้น\n"
     "มี Magic Number 2 ครั้ง (Tank LB3 แล้ว Healer LB3 ทั้ง 2 ครั้ง) แล้วร่าย Run: ****mi* (ร่าย 30 วินาที) เป็น enrage ของไฟต์\n\n"
     "ลำดับปกติ 'กลุ่ม MT' > 'กลุ่ม ST' (เปลี่ยนได้ถ้า DRK ทำ suicide strat):\n"
     "Tank: DRK > MT > ST\n"
     "Healer: H1 > H2\n"
     "หลัง Healer LB3 ครั้งที่ 2 เกจ LB เติมเต็ม: Melee LB3 ครั้งสุดท้ายตอนร่าย enrage\n\n"
     "DRK suicide strat: DRK ยกเลิก Tank LB3 ของตัวเองตอน Magic Number ตายแล้วถูก Healer LB3 ชุบพร้อม MP เต็ม (DPS เพิ่มนิดหน่อย ถ้าใช้ MP หมดก่อน)\n"
     "ทำได้ทั้ง 2 ครั้ง / DRK ต้อง LB3 ก่อน เพราะตายแล้ว Brilliant Dynamis ที่เติมเกจ LB จะหาย\n"
     "ใช้ macro แทนการยกเลิกเองได้: /merror off แล้ว /statusoff \"Dark Force\", \"Gunmetal Soul\", \"Land Waker\", \"Last Bastion\"",
     "Alpha Omega casts Magic Number, which must be mitigated with a tank LB3\n"
     "It also puts a Magic Number debuff on everyone: it kills in 6 s and only a healer LB3 removes it\n"
     "There are two Magic Numbers (tank LB3 then healer LB3 each time), then Run: ****mi* (a 30-second cast) as the fight's hard enrage\n\n"
     "Usual order 'MT group' > 'ST group' (changes if a DRK does the suicide strat):\n"
     "Tanks: DRK > MT > ST\n"
     "Healers: H1 > H2\n"
     "After the second healer LB3 the gauge refills for one last melee LB3 during the enrage cast\n\n"
     "DRK suicide strat: the DRK cancels their own tank LB3 at Magic Number, dies and is raised by the healer LB3 with full MP (a slight DPS gain if they emptied MP first)\n"
     "It works for both / the DRK must LB3 first, since dying removes the Brilliant Dynamis that refills the gauge\n"
     "A macro can do the cancelling: /merror off, then /statusoff \"Dark Force\", \"Gunmetal Soul\", \"Land Waker\", \"Last Bastion\"",
     strict=False,
     refs=[FR("magic-number", "nin", 1101, "Magic Number: Tank LB3 รับ แล้ว Healer LB3 ลบ debuff", "Magic Number: a tank LB3 takes it, then a healer LB3 clears the debuff")])

step(P6, "Run: ****mi*", "buff window และ enrage", "Buff windows and the enrage",
     "P6 มี buff window 3 ครั้ง ใช้ยาได้คนละ 1 ครั้ง / บางคนไม่ใช้ยาบางช่วงเพราะต้องผลัดกัน LB3\n"
     "1. เปิดเฟส: Tank ที่ LB3 ไม่ควรใช้ยาตรงนี้ / ถ้าไม่ได้ใช้ยาทันทีตอนจบ Delta ยาจะยังไม่กลับมาตรงนี้\n"
     "2. ทันทีหลัง Wave Cannon ลูกที่ 2: ถ้า buff 2 นาทีเลื่อนช้าตรงนี้ รอบถัดไปจะโดน enrage ตัด / Healer กับ Caster ไม่ควรใช้ยาตรงนี้ (ต้องเดินเยอะ) / Melee ใช้ได้ แต่ต้อง LB3 ทั้งสองคนหลังหลบ Exaflare และให้เสร็จก่อน Cosmo Meteor เริ่ม\n"
     "3. ครึ่งทางของการร่าย enrage: Melee ที่จะ LB3 หลัง Healer LB3 ไม่ควรใช้ยาตรงนี้ / ใช้ยาทันทีหลัง Healer LB3 ครั้งที่ 2 (ตอน Run: ****mi* เริ่ม) / buff 2 นาทีขึ้นครึ่งทางของยา อาจโดน enrage ตัด\n\n"
     "Death Wall (ขอบสนามตาย): ทำงานหลัง 5 วินาที ไม่ขึ้นกับการกดสกิล",
     "P6 has three buff windows and everyone can potion once / some skip certain windows because of the LB3 turns\n"
     "1. Opener: the tank who LB3s shouldn't potion here / if you didn't potion right at the end of Delta it won't be back here\n"
     "2. Right after Wave Cannon #2: delaying 2-minute buffs here gets the next window cut by the enrage / healers and casters shouldn't potion here (movement) / melee can, but both must LB3 after the Exaflares and finish before Cosmo Meteor\n"
     "3. Halfway into the enrage cast: the melee who LB3s after the healer LB3 shouldn't potion here / potion right after the second healer LB3 (as Run: ****mi* starts) / 2-minute buffs come up halfway through the potion and may be cut by the enrage\n\n"
     "The Death Wall activates after five seconds and isn't based on what you press",
     strict=False)
