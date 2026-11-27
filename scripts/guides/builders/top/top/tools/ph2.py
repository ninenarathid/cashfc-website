"""P2 (Omega-M and Omega-F), from Tuufless's Notes: elemental/top/02_omega_mf/ (+ mitigation/)."""
import math
from core import step, FR, P2
from scenes_top import *

FW = "Firewall"
M0, F0 = (40, 44), (58.5, 44)
TR_MF = target_ring(M0, 9, face=180, gap=60) + target_ring(F0, 9, face=180, gap=60)
POS_FW = roles(MT=(34, 37.5), ST=(63, 37.5), H1=(27.5, 58), D1=(34, 54), D3=(34, 61), D2=(61.5, 54), H2=(69.5, 58), D4=(61.5, 61))
step(P2, FW, "Firewall: กลุ่ม MT ไป Omega-M กลุ่ม ST ไป Omega-F", "Firewall: MT group on Omega-M, ST group on Omega-F",
     "① Omega-M กับ Omega-F โผล่มา\n"
     "ตี GCD ได้ 2 ครั้งก่อนทั้งคู่ร่าย Firewall: 4 คนที่อยู่ใกล้ตัวไหนที่สุดจะติด debuff ตีได้แค่ตัวนั้น\n"
     "ยืนใกล้บอสของกลุ่มตัวเอง และอย่าเข้าไปกลางสนาม จะได้ debuff ถูกตัว\n"
     "กลุ่ม MT (MT H1 D1 D3): Omega-M ฝั่งซ้าย\n"
     "กลุ่ม ST (ST H2 D2 D4): Omega-F ฝั่งขวา\n\n"
     "ได้ debuff ผิดตัว: เช็กว่าอยู่ฝั่งบอสตัวเองจริง และไม่ไกลเกิน (Melee อย่าอยู่กลางสนามจนใกล้อีกตัว / Range กับ Healer อย่าอยู่ห่างบอสตัวเองเกิน)\n"
     "ไม่ต้องลง DoT ใส่อีกตัวก่อน Firewall: หลัง Firewall DoT นั้นดาเมจเป็น 0 (Reprisal ก็ใช้กับอีกตัวไม่ได้)",
     "① Omega-M and Omega-F appear\n"
     "You get two GCDs before both cast Firewall: the four players closest to each get a debuff that lets them hit only that one\n"
     "Stay near your own boss and away from the middle so you get the right debuff\n"
     "MT group (MT H1 D1 D3): Omega-M, the left\n"
     "ST group (ST H2 D2 D4): Omega-F, the right\n\n"
     "Wrong debuff? Check everyone is on their boss's side and not too far (melee not in the middle near the other boss / ranged and healers not too far from theirs)\n"
     "Don't DoT the other boss before Firewall: afterwards that DoT does 0 damage (Reprisal on it is blocked too)",
     strict=True, pic="02/omega_mf_01.jpg",
     scene=board(TR_MF + mf(M0, "M") + mf(F0, "F"), wm=False, roles=POS_FW),
     refs=[FR("firewall", "nin", 134, "Omega-M กับ Omega-F: แต่ละกลุ่มยืนใกล้บอสของตัวเอง", "Omega-M and Omega-F: each group stays by its own boss")])

step(P2, "Solar Ray", "Solar Ray: แท้งค์บัสเตอร์วงกลมใส่ Tank", "Solar Ray: a circle tankbuster on each tank",
     "② Omega-M และ Omega-F ยิง Solar Ray ใส่ Tank ของตัวเอง เป็นแท้งค์บัสเตอร์วงกลม\n"
     "คนอื่นออกห่างจาก Tank\n\n"
     "mitigate: Rampart + short (DRK ใช้ Dark Mind ด้วย)\n"
     "เคล็ดลับ: ถ้า Tank กด Rampart ตอน Omega กระโดดหายตอนจบ P1 จะคลุม Solar Ray นี้ และกลับมาทันสายใน Limitless Synergy\n\n"
     "สักพัก ทั้งคู่ร่าย Party Synergy: Mechanic ใหญ่แรกของเฟส",
     "② Omega-M and Omega-F each hit their tank with Solar Ray, a circle tankbuster\n"
     "Everyone else stays clear of the tanks\n\n"
     "Mitigation: Rampart + short (a DRK adds Dark Mind)\n"
     "Tip: Rampart used as Omega jumps away at the end of P1 covers this Solar Ray and is back for the tethers in Limitless Synergy\n\n"
     "After a while both cast Party Synergy, the phase's first big mechanic",
     strict=True, pic="02/omega_mf_02.jpg",
     scene=board(TR_MF + aoe((36, 37.5), 11, PINK, 0.42) + aoe((63, 37.5), 11, PINK, 0.42) + mf(M0, "M") + mf(F0, "F"), wm=False, roles=POS_FW))

# ---------------------------------------------------------------- Party Synergy
PS = "Party Synergy"
L1 = roles(H1=(35, 23), MT=(35, 34), D1=(35, 45), D3=(35, 57), H2=(65, 23), ST=(65, 34), D2=(65, 45), D4=(65, 57))
step(P2, PS, "① เรียงแถว 2 แถว เหนือลงใต้", "① Two lines, north to south",
     "ทุกคนโดนสายโยงเป็นคู่ คู่ดูจากสัญลักษณ์ PlayStation (วงกลม / กากบาท / สามเหลี่ยม / สี่เหลี่ยม)\n"
     "ทั้งปาร์ตี้ได้ Mid Glitch หรือ Remote Glitch อย่างใดอย่างหนึ่ง:\n"
     "Mid Glitch: คู่ต้องห่างกัน 20-26 yalm (ยืนบน marker ยังใกล้ไป)\n"
     "Remote Glitch: คู่ต้องห่างกันอย่างน้อย 35 yalm\n"
     "ไม่ได้ระยะ คู่นั้นติด Vulnerability Up มีจังหวะต้องได้ระยะ 2 ครั้ง ไม่อย่างนั้นตาย\n"
     "Optical Unit (ตาใหญ่) โผล่นอกสนาม ที่ทิศหลักหรือทิศเฉียงทิศใดทิศหนึ่ง\n\n"
     "① ยืนเป็น 2 แถวตามกลุ่ม light party เรียงจากเหนือลงใต้:\n"
     "Healer > Tank > Melee > Range\n\n"
     "Party Synergy เป็นหนึ่งใน Mechanic ที่ยากที่สุดในเกม ต้องซ้อมเยอะ",
     "All players are tethered in pairs, shown by PlayStation symbols (circle / cross / triangle / square)\n"
     "The party gets either Mid Glitch or Remote Glitch:\n"
     "Mid Glitch: partners must be 20-26 yalms apart (standing on the waymarks is too close)\n"
     "Remote Glitch: partners must be at least 35 yalms apart\n"
     "Miss it and the pair gets Vulnerability Up; it must be met twice or someone dies\n"
     "An Optical Unit (the giant eye) appears outside the arena at a random cardinal or intercardinal\n\n"
     "① Line up in your light parties, north to south:\n"
     "Healer > Tank > Melee > Range\n\n"
     "Party Synergy is one of the hardest mechanics in the game and takes a lot of practice",
     strict=True, pic="02/party_synergy_01.jpg",
     scene=board(TR_MF + mf(M0, "M") + mf(F0, "F"), wm=False, roles=L1),
     refs=[FR("party-synergy", "nin", 166, "Party Synergy: สัญลักษณ์บนหัวบอกคู่ คู่ที่สัญลักษณ์เหมือนกันโดนสายโยงกัน", "Party Synergy: the symbol over your head is your pair; matching symbols are tethered")])

sh = []
SYM2 = {"H1": "t", "MT": "t", "D1": "x", "D3": "s", "H2": "o", "ST": "s", "D2": "x", "D4": "o"}
P2P = dict(H1=(35, 33), MT=(35, 43), D1=(35, 53.5), D3=(35, 64), H2=(65, 33), ST=(65, 43), D2=(65, 53.5), D4=(65, 64))
for k, v in P2P.items():
    sh += sym((v[0], v[1] - 6), SYM2[k], 3.6)
sh += [line(P2P["H1"], P2P["H2"], "#c8c8c8", 0.3, 0.6), line(P2P["D1"], P2P["D2"], "#c8c8c8", 0.3, 0.6),
       line(P2P["MT"], P2P["D3"], "#c8c8c8", 0.3, 0.0), line(P2P["MT"], P2P["D4"], "#c8c8c8", 0.3, 0.6), line(P2P["ST"], P2P["D3"], "#c8c8c8", 0.3, 0.6),
       arrow((38, 45), (62, 62), "#ff3b3b", 0.45), arrow((62, 62), (38, 45), "#ff3b3b", 0.45)]
step(P2, PS, "② สัญลักษณ์ขึ้น: ซ้ำกันในแถว คนล่างย้ายฝั่ง", "② Symbols up: a duplicate in your line, the lower one swaps",
     "② สัญลักษณ์ PlayStation ขึ้นบนหัว\n"
     "ถ้าแถวของเรามีสัญลักษณ์ซ้ำกัน 2 คน: คนที่อยู่ล่างกว่าย้ายไปอีกแถว\n"
     "ตัวอย่าง: แถวซ้ายมีสามเหลี่ยม 2 คน (H1, MT) แถวขวามีวงกลม 2 คน (H2, D4) จึงสลับ MT กับ D4\n"
     "แถวละ 1 คู่ซ้ำได้มากสุด 2 คู่ (เกิดน้อย 3/35) กฎเดิม: คนล่างย้าย\n\n"
     "จำสัญลักษณ์และฝั่งของตัวเองไว้ใช้ทีหลัง แล้วสัญลักษณ์จะหายไป",
     "② PlayStation symbols appear over everyone\n"
     "If your line has two of the same symbol, the lower player swaps to the other line\n"
     "Example: the left line has two triangles (H1, MT), the right two circles (H2, D4), so MT and D4 swap\n"
     "Rarely (3/35) a side has two duplicates; same rule, the lower ones swap\n\n"
     "Remember your symbol and your side for later; then the symbols vanish",
     strict=True, pic="02/party_synergy_02.jpg",
     scene=board(sh, wm=False, roles=roles(**P2P)))


def f_blades(F, axis, w=13):
    """Omega-F with blade-legs: everything except a band through her along `axis`."""
    out = []
    t = math.radians(axis + 90)
    for s in (1, -1):
        c = (F[0] + math.sin(t) * (w / 2 + 60) * s, F[1] - math.cos(t) * (w / 2 + 60) * s)
        out.append(rect(c, 120, 260, axis, PINK, 0.42))
    return out


def f_staff(F, axis, w=13):
    """Omega-F with a staff: a cross of two bands through her."""
    return [rect(F, w, 260, axis, PINK, 0.42), rect(F, w, 260, axis + 90, PINK, 0.42)]


def m_sword(M, r=22.5):
    return aoe(M, r, PINK, 0.42)


def m_shield(M, r=22.5):
    return [donut(M, 140, r, PINK, 0.42), ring(M, r, PINK, 0.3, 0.8)]


MR, FR_ = (40, 27), (60, 74)
AX = ang(MR, FR_)
sh = m_shield(MR) + f_staff(FR_, AX) + mf((49, 55), "M", "#7d8798") + mf((34, 76), "F", "#b48aa0") + mf(MR, "M") + mf(FR_, "F")
step(P2, PS, "③ หาคู่ M/F ตัวจริง แล้วหลบ AoE", "③ Find the real M/F pair, dodge its AoEs",
     "③ Omega-M 2 ตัว และ Omega-F 2 ตัวโผล่มา\n"
     "หาคู่ M/F ตัวจริง:\n"
     "Omega-M อยู่ทางด้านนอก\n"
     "Omega-F อยู่ฝั่งตรงข้ามพอดี\n"
     "แต่ละตัวยืนระหว่าง marker 2 อัน\n\n"
     "หลบ AoE รวมของคู่นั้น (ตอนนี้ยังไม่ต้องสนใจระยะของสาย Mid / Remote Glitch)\n"
     "ภาพ: Omega-M ถือโล่ + Omega-F ถือคทา",
     "③ Two Omega-Ms and two Omega-Fs appear\n"
     "Find the real M/F pair:\n"
     "Omega-M towards the outside\n"
     "Omega-F directly opposite\n"
     "Each stands between two waymarks\n\n"
     "Dodge that pair's combined AoEs (ignore the Mid / Remote Glitch distance for now)\n"
     "Picture: Omega-M with a shield + Omega-F with a staff",
     strict=False, pic="02/party_synergy_03.jpg",
     scene=board(sh, wm=True, roles=roles(H1=(27.5, 35), D4=(29, 39), D1=(26, 38), D3=(28.5, 41.5),
                                         MT=(53, 18), ST=(55.5, 20), H2=(53, 21.5), D2=(56, 17))))

COMBOS = [("Omega-M ถือดาบ + Omega-F ขาใบมีด", "M sword + F blade-legs", "02/party_synergy_03d.jpg", "sword", "blades"),
          ("Omega-M ถือโล่ + Omega-F ขาใบมีด", "M shield + F blade-legs", "02/party_synergy_03a.jpg", "shield", "blades"),
          ("Omega-M ถือดาบ + Omega-F ถือคทา", "M sword + F staff", "02/party_synergy_03c.jpg", "sword", "staff"),
          ("Omega-M ถือโล่ + Omega-F ถือคทา", "M shield + F staff", "02/party_synergy_03b.jpg", "shield", "staff")]
WHAT = {"sword": ("ดาบ: AoE วงกลมรอบ Omega-M", "Sword: a circle AoE around Omega-M"),
        "shield": ("โล่: donut รอบ Omega-M ปลอดภัยแค่ใกล้ตัว", "Shield: a donut around Omega-M, safe only close in"),
        "blades": ("ขาใบมีด: โดนทั้งสนาม ยกเว้นแนวตรงที่ผ่านตัว Omega-F", "Blade-legs: everything except a straight band through Omega-F"),
        "staff": ("คทา: กากบาท 2 แนวผ่านตัว Omega-F", "Staff: a cross of two bands through Omega-F")}
for th, en, pic, m, f in COMBOS:
    MR2, FR2 = (39, 28), (62, 73)
    ax = ang(MR2, FR2)
    sh = (m_sword(MR2) if m == "sword" else m_shield(MR2)) + (f_blades(FR2, ax) if f == "blades" else f_staff(FR2, ax)) + mf(MR2, "M") + mf(FR2, "F")
    step(P2, PS, "AoE ของคู่จริง: " + th, "The real pair's AoEs: " + en,
         "AoE ขึ้นกับอาวุธที่คู่ M/F ตัวจริงถือ\n"
         + WHAT[m][0] + "\n" + WHAT[f][0] + "\n\n"
         "สังเกต: marker คือขอบของ AoE จาก Omega-F พอดี",
         "The AoEs depend on what the real M/F pair hold\n"
         + WHAT[m][1] + "\n" + WHAT[f][1] + "\n\n"
         "Note how the waymarks mark the edge of Omega-F's AoE",
         strict=False, pic=pic, scene=board(sh, wm=True))

# 4a / 4b
EYE = (50, 2.5)
def eye():
    return [dot(EYE, 3.2, "#e8e8f0"), ring(EYE, 3.2, "#1d2a44", 0.4), dot(EYE, 1.3, "#3b5bdb")]

SYM4 = {"D4": "o", "D1": "x", "H1": "t", "D3": "s", "H2": "o", "D2": "x", "MT": "t", "ST": "s"}
P4A = dict(D4=(22, 12.5), D1=(22, 34.5), H1=(22, 57), D3=(22, 79), H2=(78, 12.5), D2=(78, 34.5), MT=(78, 57), ST=(78, 79))
P4B = dict(D4=(22, 12.5), D1=(8, 35), H1=(8, 57), D3=(22, 82), ST=(78, 12.5), D2=(92, 35), MT=(92, 57), H2=(78, 82))
for key, P4X, pic, th, en in (("mid", P4A, "02/party_synergy_04a.jpg", "Mid Glitch", "Mid Glitch"), ("remote", P4B, "02/party_synergy_04b.jpg", "Remote Glitch", "Remote Glitch")):
    sh = eye()
    for k, v in P4X.items():
        sh += aoe(v, 12, "#ffc9a8", 0.3)
    for a, b in (("D4", "H2"), ("D1", "D2"), ("H1", "MT"), ("D3", "ST")) if key == "mid" else (("D4", "H2"), ("D1", "D2"), ("H1", "MT"), ("D3", "ST")):
        sh.append(line(P4X[a], P4X[b], "#d9d9d9", 0.3, 0.7))
    for k, v in P4X.items():
        sh += sym((v[0] + 4.2, v[1] - 4.2), SYM4[k], 3.0)
    if key == "mid":
        note = ("④ ใช้ตาใหญ่เป็นทิศเหนือ แยกเป็น 2 กลุ่ม (ซ้าย / ขวา) กลุ่มละ 4 คน\n"
                "Mid Glitch: ทั้งสองแถวเรียงจากบนลงล่าง วงกลม > กากบาท > สามเหลี่ยม > สี่เหลี่ยม (นับจำนวนเส้นที่ใช้วาด 1 > 2 > 3 > 4)\n"
                "ยืนเลย marker ออกไปเล็กน้อย ให้คู่ห่างกัน 20-26 yalm\n\n"
                "Omega-M 4 ตัวโผล่ที่ทิศหลักทั้ง 4 หรือทิศเฉียงทั้ง 4",
                "④ Using the eye as north, split into your two groups (left / right) of four\n"
                "Mid Glitch: both lines, top to bottom, circle > cross > triangle > square (the number of strokes, 1 > 2 > 3 > 4)\n"
                "Stand a little past the waymarks so partners are 20-26 yalms apart\n\n"
                "Four Omega-M clones appear on all the cardinals or all the intercardinals")
    else:
        note = ("④ Remote Glitch: เหมือน Mid แต่แถวขวาสลับวงกลมกับสี่เหลี่ยม (แถวขวาเป็น สี่เหลี่ยม > กากบาท > สามเหลี่ยม > วงกลม)\n"
                "สายจึงไขว้กัน และคู่ยืนถึงขอบสนาม ห่างกันอย่างน้อย 35 yalm\n\n"
                "macro: Mid ซ้ายไปตะวันตก ขวาไปใต้ / Remote ซ้ายไปตะวันตก ขวาไปตะวันออก (ใช้ในขั้น ⑥)",
                "④ Remote Glitch: as Mid, but the right line swaps circle and square (right line square > cross > triangle > circle)\n"
                "So the tethers cross, and partners stand at the edge, at least 35 yalms apart\n\n"
                "Macro: Mid left west, right south / Remote left west, right east (used in ⑥)")
    step(P2, PS, f"④ {th}: ใช้ตาเป็นเหนือ เรียงตามสัญลักษณ์", f"④ {en}: eye as north, line up by symbol",
         note[0], note[1], strict=True, pic=pic, scene=board(sh, wm=False, roles=roles(**P4X)))

P5_ = dict(D4=(33, 22), D1=(22, 38), H1=(22, 58), D3=(35, 78), ST=(63, 24), D2=(77, 38), MT=(77, 58), H2=(66, 74))
sh = mf((50, 6.5), "M", "#ffffff")
for c in ((25, 28), (75, 28), (25, 72), (75, 72)):
    sh += mf(c, "M", "#8f9aab", 2.4, 2.4)
for a, b in (("D4", "H2"), ("D1", "D2"), ("H1", "MT"), ("D3", "ST")):
    sh.append(line(P5_[a], P5_[b], "#d9d9d9", 0.3, 0.7))
for k, v in P5_.items():
    sh += sym((v[0] + 4.2, v[1] - 4.2), {"D4": "o", "D1": "x", "H1": "t", "D3": "s", "ST": "s", "D2": "x", "MT": "t", "H2": "o"}[k], 3.0)
sh += stackmark(P5_["D1"], 4.4) + stackmark(P5_["D3"], 4.4) + [arrow((38, 75), (61, 28), "#ff3b3b", 0.45), arrow((61, 28), (38, 75), "#ff3b3b", 0.45)]
step(P2, PS, "⑤ M ตัวใหม่เป็นเหนือ / stack ซ้ำฝั่ง คนไกลตาสลับ", "⑤ The new M is north / both stacks on a side: the one further from the eye swaps",
     "⑤ คู่ M/F อีกคู่สลับเพศ: Omega-F กลายเป็น Omega-M (กระพริบขาวแว้บหนึ่ง) ได้ Omega-M 3 ตัวเรียงกัน\n"
     "ใช้ Omega-M ตัวใหม่นี้เป็นทิศเหนือใหม่\n\n"
     "กลับมากลางสนาม ระหว่างนั้น 2 คนโดนมาร์ก stack\n"
     "ถ้าฝั่งเดียวมีมาร์ก stack ทั้ง 2 อัน: คนที่อยู่ไกลตาใหญ่กว่า สลับฝั่งกับคู่ของตัวเอง\n"
     "ตัวอย่าง: ฝั่งซ้าย กากบาท (D1) กับ สี่เหลี่ยม (D3) โดน stack ทั้งคู่ สี่เหลี่ยมไกลตากว่า จึงสลับคู่สี่เหลี่ยม (D3 กับ ST)",
     "⑤ The other M/F pair swaps genders: Omega-F turns into Omega-M (a brief white flash), making three Omega-Ms in a row\n"
     "Use this new Omega-M as the new north\n\n"
     "Come back to the middle; meanwhile two players get stack markers\n"
     "If one side has both stacks, the one further from the eye swaps with their partner\n"
     "Example: on the left, cross (D1) and square (D3) both have stacks; square is further from the eye, so the squares (D3 and ST) swap",
     strict=True, pic="02/party_synergy_05.jpg", scene=board(sh, wm=False, roles=roles(**P5_)))

KB = lambda: [arrow((44, 50), (14, 50), "#ffffff", 0.5)]
for key, pic, th, en in (("mid", "02/party_synergy_06a.jpg", "Mid: ซ้ายไปตะวันตก ขวาไปใต้", "Mid: left west, right south"),
                         ("remote", "02/party_synergy_06b.jpg", "Remote: ซ้ายไปตะวันตก ขวาไปตะวันออก", "Remote: left west, right east")):
    sh = []
    for c in ((25, 25), (75, 25), (25, 75), (75, 75)):
        sh += aoe(c, 25, PINK, 0.32) + mf(c, "M", "#8f9aab", 2.4, 2.4)
    sh += mf((50, 6.5), "M", "#ffffff") + mf((50, 50), "F")
    W_ = dict(D4=(6, 45), H1=(9.5, 50), D1=(6, 54), ST=(10, 42))
    if key == "mid":
        R_ = dict(D3=(50, 91), MT=(46, 94), H2=(54, 94), D2=(50, 96))
        sh += stackmark((8, 48), 4.4) + stackmark((50, 93), 4.4) + [arrow((44, 50), (15, 48)), arrow((50, 56), (50, 85))]
    else:
        R_ = dict(D3=(91, 45), MT=(94, 50), H2=(91, 54), D2=(90, 41))
        sh += stackmark((8, 48), 4.4) + stackmark((92, 48), 4.4) + [arrow((44, 50), (15, 48)), arrow((56, 50), (85, 48))]
    step(P2, PS, f"⑥ knockback: {th}", f"⑥ Knockback: {en}",
         "⑥ Omega-F (ตัวใหม่) ทำ knockback จากกลางสนาม\n"
         "ทั้งปาร์ตี้ต้องโดนกระเด็นไปจุดปลอดภัย 2 จุด ตาม debuff ของปาร์ตี้ (Omega-M 3 ตัวเรียงกันคือเหนือ)\n"
         "กลุ่มซ้าย: กระเด็นไปตะวันตกเสมอ\n"
         "กลุ่มขวา: Mid Glitch กระเด็นไปใต้ / Remote Glitch กระเด็นไปตะวันออก\n\n"
         "หลังจากนี้: เพราะ M กับ F สลับเพศ Tank ที่เคยถือ Omega-M ตอนนี้ถือ Omega-F (สลับกัน)\n"
         "Tank ทั้งสอง Provoke เป้าของตัวเอง ก่อน Party Synergy หรือทันทีหลังจบ (ตอน Packet Filter ยังอยู่)",
         "⑥ The (new) Omega-F knocks back from the middle\n"
         "The party must be knocked into two safe spots, by the party's debuff (the three Omega-Ms in a row are north)\n"
         "Left group: always knocked west\n"
         "Right group: Mid Glitch knocked south / Remote Glitch knocked east\n\n"
         "After this: because M and F swapped genders, the tank who held Omega-M now holds Omega-F, and vice versa\n"
         "Both tanks Provoke their target, before Party Synergy or right after while Packet Filter is still up",
         strict=True, pic=pic, scene=board(sh, wm=False, roles=roles(**W_, **R_)))

# ---------------------------------------------------------------- Limitless Synergy
LS = "Limitless Synergy"
MC = (50, 45)
TR_LS = target_ring(MC, 13, face=180, gap=60)
CL = [((13, 9), "M"), ((50, 10), "F"), ((88, 20), "M"), ((10, 76), "M"), ((45, 90), "F"), ((89, 85), "F")]
def clones(skip=()):
    out = []
    for c, k in CL:
        if c in skip:
            continue
        out += mf(c, k, "#9aa6b8" if k == "M" else "#d8a9c0", 2.6, 2.6)
    return out

step(P2, LS, "เตรียมตัว: auto-attack ของ Omega-F", "Before it: Omega-F's auto-attacks",
     "หลัง auto-attack ไม่กี่ครั้ง ร่างทั้งสองร่าย Limitless Synergy: Packet Filter หายไป มีเวลา 1 GCD ตีได้ทั้งสองตัว\n\n"
     "Omega-M หยุด auto-attack ไปร่าย Synthetic Shield ช่วงนี้ ST (ที่ถือ Omega-F) จึงโดนตีหนักกว่า\n"
     "auto-attack ของ Omega-F เป็นเวท: ใช้ Addle ตรงนี้ได้ดี (ใน Limitless Synergy จะไม่ใช้ mitigate แบบลงที่บอส)",
     "After a few auto-attacks both cast Limitless Synergy: Packet Filter drops and the party gets one GCD to hit both\n\n"
     "Omega-M stops auto-attacking to cast Synthetic Shield, so the ST (holding Omega-F) takes more damage here\n"
     "Omega-F's auto-attacks are magic: a good place for Addle (targeted debuffs aren't used in Limitless Synergy)",
     strict=False)

sh = TR_LS + mf(MC, "M") + clones() + [tether((13, 9), (49, 60)), tether((89, 85), (51, 61))]
step(P2, LS, "① stack ทิศใต้นอกวงเป้า", "① Stack true south outside the targeting circle",
     "Omega-F วาร์ปไปเหนือแล้วร่าย Laser Shower / Omega-M วาร์ปมากลางสนาม และป้องกัน Omega-F (ตี Omega-F ไม่เข้าจนกว่า Omega-M ตาย)\n"
     "ร่างแยก M/F อีก 5 ตัวนอกสนามปล่อย Mechanic มาให้แก้\n\n"
     "⑦ ทุกคน stack รวมกันนอกวงเป้า ที่ทิศใต้พอดี (ปลายแหลมของวงเป้า Omega-M)\n"
     "ร่างแยก 2 ตัวที่ทิศเฉียงฝั่งตรงข้ามกันโยงสาย (tether) มาที่คนที่ไม่ใช่ Tank แบบสุ่ม",
     "Omega-F teleports north and starts Laser Shower / Omega-M teleports to the middle and shields Omega-F (she can't be damaged until Omega-M dies)\n"
     "Five more M/F clones outside the arena throw mechanics at the party\n\n"
     "⑦ Everyone stacks outside the targeting circle at true south (the tip of Omega-M's targeting circle)\n"
     "Two clones at opposite intercardinals each tether a random non-tank",
     strict=False, pic="02/limitless_synergy_01.jpg",
     scene=board(sh, wm=False, roles=roles(H1=(48.5, 61), H2=(51.5, 61), D1=(47, 64), D2=(53, 64), D3=(48.5, 67), D4=(51.5, 67), MT=(46, 58.5), ST=(54, 58.5))))

sh = TR_LS + mf(MC, "M") + clones() + [tether((13, 9), (30, 6)), tether((89, 85), (62, 91)), beam((0, 98), (100, 32), 12, PINK, 0.35),
                                       arrow((49, 56), (46, 47))]
step(P2, LS, "② Tank รับสาย ดึงไปตามเข็มนาฬิกา", "② Tanks take the tethers, clockwise",
     "⑧ Tank ทั้งสองแย่งสายมา แล้วดึงไปทางตามเข็มนาฬิกา\n"
     "MT: รับสายฝั่งเหนือ\n"
     "ST: รับสายฝั่งใต้\n"
     "ดึงสายออกไปราว 5 ขีดจากร่างแยก (ขีดนอกขอบสนามขีดละ 5 องศา) ให้กรวยชี้ออกนอกสุดโดยไม่ออกนอกสนาม ทางเดินกลางจะกว้างที่สุด\n\n"
     "mitigate (สายนี้คือ Optimized Bladedance): Rampart + 30% + 3rd + short (Dark Mind ใช้ไม่ได้ ดาเมจกายภาพ)\n"
     "Healer 120s ช่วย Tank ที่ไม่มี Rampart ได้ และกลับมาทัน tower ชุดที่ 2 ใน P3 แต่จะไม่คลุม Cosmo Memory\n\n"
     "⑨ พอเห็นเส้น Sagittarius Arrow: หลบเข้าไปในวงเป้าของบอส",
     "⑧ The two tanks take the tethers and point them clockwise\n"
     "MT: the north tether\n"
     "ST: the south tether\n"
     "Stretch them about five tick marks from the clones (5 degrees per tick) so the cones point as far out as they can without leaving the arena; that makes the safe corridor widest\n\n"
     "Mitigation (the tethers are Optimized Bladedance): Rampart + 30% + 3rd + short (Dark Mind doesn't work, it's physical)\n"
     "Healer 120s can help a tank without Rampart and are back for the second towers in P3, but won't cover Cosmo Memory\n\n"
     "⑨ When Sagittarius Arrow's line appears, dodge into the boss's targeting circle",
     strict=["MT", "ST"], pic="02/limitless_synergy_02.jpg",
     says={"MT": "รับสายทิศเหนือ ดึงไปตามเข็มราว 5 ขีด", "ST": "รับสายทิศใต้ ดึงไปตามเข็มราว 5 ขีด"},
     says_en={"MT": "Take the north tether, pull it about five ticks clockwise", "ST": "Take the south tether, pull it about five ticks clockwise"},
     scene=board(sh, wm=False, roles=roles(MT=(30, 6), ST=(62, 91), H1=(48.5, 57), H2=(51.5, 57), D1=(47, 60), D2=(53, 60), D3=(48.5, 63), D4=(51.5, 63))),
     refs=[FR("limitless-synergy", "nin", 262, "Limitless Synergy: ร่างแยกรอบนอกสนามปล่อย Mechanic มาทีละอย่าง", "Limitless Synergy: the clones outside the arena throw mechanics one after another")])

sh = (TR_LS + mf(MC, "M") + clones() + [tether((13, 9), (30, 6)), tether((89, 85), (62, 91))]
      + [cone((13, 9), 113, 34, 95, PINK, 0.33), cone((89, 85), 293, 34, 95, PINK, 0.33), beam((0, 98), (100, 32), 12, PINK, 0.42)])
step(P2, LS, "③ หลบ Sagittarius Arrow เข้าวงเป้า", "③ Dodge Sagittarius Arrow into the circle",
     "⑨ หลบเส้น Sagittarius Arrow โดยเข้าไปในวงเป้าของบอส\n"
     "กรวยจากสายของ Tank ลงด้านนอก ทางเดินกลางจึงปลอดภัย",
     "⑨ Dodge Sagittarius Arrow by moving into the boss's targeting circle\n"
     "The tanks' tether cones land outside, so the middle corridor is safe",
     strict=["MT", "ST"], pic="02/limitless_synergy_03.jpg",
     scene=board(sh, wm=False, roles=roles(MT=(30, 6), ST=(62, 91), H1=(45, 41), H2=(47.5, 43), D1=(43, 44), D2=(47, 39), D3=(44.5, 46), D4=(49, 46))))

sh = TR_LS + mf(MC, "M") + clones() + [ring((10, 76), 9, RED, 0.6)]
PARTY_C = dict(H1=(48.5, 43), H2=(51.5, 43), D1=(47, 46), D2=(53, 46), D3=(48.5, 49), D4=(51.5, 49))
step(P2, LS, "④ Tank ออกไปทางร่างแยกโล่ คนอื่นกลางวง", "④ Tanks out towards the shield clone, the rest in the middle",
     "⑩ หาร่างแยก Omega-M ด้านนอกที่ถือโล่ (ในภาพ: วงแดง)\n"
     "Tank: แยกกันยืนนอก hitbox ของบอส ไปทางร่างแยกโล่\n"
     "คนอื่น: ยืนกลาง hitbox ของบอส",
     "⑩ Find the Omega-M clone outside with the shield (the red ring)\n"
     "Tanks: spread outside the boss's hitbox towards the shield clone\n"
     "Everyone else: stand in the middle of the boss's hitbox",
     strict=["MT", "ST"], pic="02/limitless_synergy_04.jpg",
     scene=board(sh, wm=False, roles=roles(MT=(32, 45), ST=(43, 62), **PARTY_C)))

sh = (TR_LS + mf(MC, "M") + clones() + aoe((22, 50), 10, "#ffc9a8", 0.45)
      + [arrow((22, 44), (31, 32), "#5fe0c8", 0.5), arrow((33, 30), (60, 30), "#5fe0c8", 0.5)]
      + flare((50, 46), 4.2) + flare((44, 64), 4.2) + flare((52.5, 47.5), 4.2))
step(P2, LS, "⑤ Beyond Defense: Tank ที่โดนวิ่งอ้อมไปอีกฝั่ง", "⑤ Beyond Defense: the hit tank runs around",
     "⑪ ร่างแยกโล่ร่าย Beyond Defense พุ่งใส่ 1 ใน 2 คนที่ใกล้ที่สุดแบบสุ่ม (ควรเป็น Tank)\n"
     "Tank ที่โดน: วิ่งอ้อมรอบวงเป้าของบอสไปอีกฝั่ง\n"
     "Tank ที่ไม่โดน: เข้า stack กับปาร์ตี้ตรงกลาง\n\n"
     "พร้อมกัน ร่างแยก Omega-F ร่าย Optimised Meteor: มาร์ก Flare 3 คนแบบสุ่ม\n"
     "ไม่ต้องสนใจ Flare: stack รวมกันตรงกลาง",
     "⑪ The shield clone casts Beyond Defense and charges one of the two closest players at random (should be a tank)\n"
     "The tank that was hit: run around the boss's targeting circle to the other side\n"
     "The tank that wasn't: stack with the party in the middle\n\n"
     "Meanwhile an Omega-F clone casts Optimised Meteor: Flare markers on three random players\n"
     "Ignore the Flares and stack together in the middle",
     strict=False, pic="02/limitless_synergy_05.jpg",
     scene=board(sh, wm=False, roles=roles(MT=(22, 50), ST=(44, 64), **PARTY_C)))

sh = TR_LS + mf(MC, "M") + clones() + aoe((50, 49), 12, PINK, 0.42) + flare((50, 46), 4.2) + flare((53, 50), 4.2) + flare((47.5, 50), 4.2)
step(P2, LS, "⑥ Pile Pitch + Meteor: stack กลาง mitigate หนัก", "⑥ Pile Pitch + Meteors: stack in the middle, heavy mitigation",
     "⑫ ร่างแยกโล่ร่าย Pile Pitch ใส่ 1 ใน 2 คนที่ใกล้ที่สุดแบบสุ่ม (ต้องไม่ใช่ Tank ที่โดน Beyond Defense) พร้อม Optimised Meteor\n"
     "ต้อง mitigate หนักมาก\n"
     "mitigate: MT 90s, ST 90s, H1 120s, H2 120s, H2 30s, D3\n"
     "(ใช้ Healer 120s เร็วสุดตอนมาร์ก Flare ขึ้น ถ้าอยากให้คลุม Cosmo Memory ด้วย)\n"
     "WAR / PLD ใช้ 90s ได้ตั้งแต่ Packet Filter หายตอนเริ่ม Limitless Synergy / GNB / DRK รอ Beyond Defense เตะก่อน จะคลุม Cosmo Memory ด้วย\n\n"
     "หลัง Pile Pitch: ตาใหญ่ร่าย Cosmo Memory เป็น raid-wide อีกครั้ง\n"
     "เพราะตาใหญ่เลือกเป้าไม่ได้ Addle / Dismantle / Feint / Reprisal ใช้กับดาเมจนี้ไม่ได้\n"
     "H2 30s กับ D3 จาก Pile Pitch ยังคลุมอยู่ / mitigate เสริม (Magick Barrier, Passage of Arms ฯลฯ) ใช้ตรงนี้\n\n"
     "ไม่มี Mechanic เหลือ: ตี Omega-M ก่อน แล้วค่อย Omega-F ให้ตายก่อน Laser Shower ของ Omega-F ลง (enrage)",
     "⑫ The shield clone casts Pile Pitch on one of the two closest players at random (neither should be the tank hit by Beyond Defense), together with Optimised Meteor\n"
     "It needs heavy mitigation\n"
     "Mitigation: MT 90s, ST 90s, H1 120s, H2 120s, H2 30s, D3\n"
     "(The earliest healer 120s can go and still catch Cosmo Memory is when the Flare markers appear)\n"
     "WAR / PLD can use their 90s as early as when Packet Filter drops at the start / GNB / DRK wait for Beyond Defense's kick to also cover Cosmo Memory\n\n"
     "After Pile Pitch the eye casts Cosmo Memory, another raid-wide\n"
     "The eye can't be targeted, so Addle / Dismantle / Feint / Reprisal don't reduce it\n"
     "H2 30s and D3 from Pile Pitch still cover it / extra mitigation (Magick Barrier, Passage of Arms...) goes here\n\n"
     "Nothing else is left: kill Omega-M, then Omega-F, in that order, before her Laser Shower goes off (the enrage)",
     strict=False, pic="02/limitless_synergy_06.jpg",
     scene=board(sh, wm=False, roles=roles(MT=(64, 32), ST=(50, 52), **PARTY_C)),
     refs=None)
