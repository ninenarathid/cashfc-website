"""P5 (Run: Dynamis: Delta, Sigma, Omega), from Tuufless's Notes: 05_run_dynamis_delta/, _sigma/, _omega/ (+ mitigation/).
The GMT Delta page (run_dynamis_delta_gmt/) is left out: the source says it is not done in PF."""
from core import step, FR, P5
from scenes_top import *
from ph2 import f_blades, f_staff, m_sword, m_shield

CY = "#38d6d6"
GT = "#57d16a"


def tok(c, s, col="#cdb68a", tc="#1d1d1d"):
    return pl(c, s, col, 2.4, tc, 2.4)


def bossmark(c, label):
    return [dot(c, 4.2, "#b9c2d0"), ring(c, 4.2, "#3a4250", 0.4), text(c, label, 2.2, "#1d1d1d")]


step(P5, "Hello, World", "ภาพรวม P5 + Hello, World", "P5 overview + Hello, World",
     "P5 แบ่งเป็น 3 ช่วง: Delta, Sigma, Omega\n"
     "แต่ละช่วงมี Mechanic ชุดหนึ่ง แล้วจบด้วย debuff Hello, World ที่ให้ stack ของ Dynamis\n"
     "เป้าหมาย: ทุกคนเข้าเฟสสุดท้ายด้วย Dynamis 3 stack (มี Hello, World ทั้งหมด 4 ชุด)\n\n"
     "Hello, Near World: AoE ใหญ่รอบตัวคนมี debuff แล้วกระโดดไปคนที่ใกล้ที่สุด (AoE เล็กลง) แล้วกระโดดไปคนที่ใกล้คนที่ 2 ที่สุดอีกครั้ง\n"
     "Hello, Distant World: แบบเดียวกัน แต่กระโดดไปคนที่ไกลที่สุด\n"
     "ทั้ง 3 คนที่โดนได้ Dynamis 1 stack (สูงสุด 3 stack)\n"
     "ถ้า AoE โดน 2 คนพร้อมกัน หรือคนมี debuff ตาย = wipe / กระโดดกลับไปคนแรกได้ (คนแรกตาย)\n\n"
     "PF ใช้ Delta แบบ 'Kinda Awk' (จับคู่สายสีเดียวกัน)",
     "P5 has three parts: Delta, Sigma and Omega\n"
     "Each runs a set of mechanics and ends with Hello, World debuffs that give stacks of Dynamis\n"
     "Goal: everyone enters the last phase with 3 stacks of Dynamis (there are four sets of Hello, World)\n\n"
     "Hello, Near World: a big AoE on the debuffed player, then it jumps to the closest player (smaller AoE), then once more to whoever is closest to them\n"
     "Hello, Distant World: the same, but it jumps to the furthest player\n"
     "All three players hit gain one stack of Dynamis (capped at 3)\n"
     "An AoE hitting two players at once, or the debuffed player dying, wipes / it can bounce back to the first player (who dies)\n\n"
     "PF does Delta the 'Kinda Awk' way (like tethers paired together)",
     strict=False, pic="05a/hello_near_world.jpg",
     scene=board([circle((20, 50), 16, "#4f7a3c", 0.6), arrow((32, 50), (52, 50), GT, 0.7), circle((60, 50), 8, "#4f7a3c", 0.6),
                  arrow((68, 50), (76, 50), GT, 0.7), circle((84, 50), 8, "#4f7a3c", 0.6)] + tok((20, 50), "N") + tok((60, 50), "") + tok((84, 50), ""),
                 wm=False, tick=0, arena=None, bg="#111318"))

step(P5, "Solar Ray", "Solar Ray: แท้งค์บัสเตอร์ 4 ครั้งในเฟส", "Solar Ray: four tankbusters this phase",
     "Solar Ray มี 4 ครั้งในเฟสนี้: แท้งค์บัสเตอร์ 2 ฮิต + Magic Vulnerability ต้องสลับ Tank หรือใช้ invuln\n"
     "แรงมาก (ดาเมจพื้นฐานเกือบ 3 เท่าของ HP Tank)\n"
     "2 ครั้งรับด้วย invuln อีก 2 ครั้งด้วย mitigate ขึ้นกับ Tank ในปาร์ตี้ (ลำดับตามอาชีพ ไม่ใช่ MT / ST)\n\n"
     "มี WAR:\n"
     "ก่อน Delta: Hallowed Ground > Superbolide > สลับ Tank + mitigate เต็ม\n"
     "ก่อน Sigma: Living Dead > สลับ Tank + mitigate เต็ม\n"
     "ก่อน Omega: Holmgang\n"
     "ก่อน Blind Faith: สลับ Tank + mitigate เต็ม\n\n"
     "ไม่มี WAR:\n"
     "ก่อน Delta: Hallowed Ground > Superbolide > Living Dead\n"
     "ก่อน Sigma: Superbolide > Living Dead\n"
     "ก่อน Omega: สลับ Tank / MT Rampart + Healer mitigate / ST Rampart + 30% (กด Rampart ตอนเลเซอร์แขนลงตอนจบ Sigma)\n"
     "ก่อน Blind Faith: สลับ Tank / MT Rampart + 30% / ST Rampart + Healer mitigate\n\n"
     "ถ้าเวลาฆ่าเร็ว Hallowed Ground อาจยังไม่กลับมา / WAR + PLD และ Hallowed Ground ไม่ทันครั้งแรก: ใช้ Holmgang ครั้งที่ 2 (กลับไปใช้แผนไม่มี WAR)\n"
     "MT Reprisal ใน Solar Ray ที่ mitigate (ST Reprisal ไว้ Run: Dynamis)",
     "There are four Solar Rays this phase: two-hit tankbusters with Magic Vulnerability, forcing a tank swap or an invuln\n"
     "Base damage is a little under three times a tank's max HP\n"
     "Two are invulned, two mitigated, depending on your tanks (the order follows the jobs, not MT / ST)\n\n"
     "With a WAR:\n"
     "Before Delta: Hallowed Ground > Superbolide > swap + full mitigation\n"
     "Before Sigma: Living Dead > swap + full mitigation\n"
     "Before Omega: Holmgang\n"
     "Before Blind Faith: swap + full mitigation\n\n"
     "Without a WAR:\n"
     "Before Delta: Hallowed Ground > Superbolide > Living Dead\n"
     "Before Sigma: Superbolide > Living Dead\n"
     "Before Omega: swap / MT Rampart + healer mitigation / ST Rampart + 30% (Rampart when the arm lasers go off at the end of Sigma)\n"
     "Before Blind Faith: swap / MT Rampart + 30% / ST Rampart + healer mitigation\n\n"
     "Fast kills: Hallowed Ground may not be back / WAR + PLD with no Hallowed Ground for the first: Holmgang the second (the no-WAR plan)\n"
     "MT Reprisals the mitigated Solar Rays (ST keeps Reprisal for Run: Dynamis)",
     strict=False)

step(P5, "Run: ****mi* (Delta Version)", "Run: Dynamis (Delta): raid-wide หนักมาก", "Run: Dynamis (Delta): a very heavy raid-wide",
     "หลัง Solar Ray, Omega-M ร่าย Run: ****mi* (Delta Version): raid-wide แรงมาก\n\n"
     "mitigate: MT 90s, ST Reprisal, ST 90s, H2 30s, D1, D3\n"
     "MT 90s, ST 90s และ D3 กดตอน Solar Ray ฮิตที่ 2 จะคลุมท้าย Run: Dynamis (Delta) และกลับมาทัน Run: Dynamis (Sigma) (ห่างกันราว 1:22)\n"
     "Healer party mitigation อยู่ 20 วินาที กดให้ดีคลุมได้ทั้ง Solar Ray 2 ฮิตและ Run: Dynamis\n"
     "Run: Dynamis แต่ละครั้งต้องมี Tank 90s ทั้งคู่, H2 30s, D3, Reprisal, Feint และ barrier (Feint สลับ D1 / D2)",
     "After the Solar Ray, Omega-M casts Run: ****mi* (Delta Version), a very hard-hitting raid-wide\n\n"
     "Mitigation: MT 90s, ST Reprisal, ST 90s, H2 30s, D1, D3\n"
     "MT 90s, ST 90s and D3 used on the second Solar Ray hit catch the tail of Run: Dynamis (Delta) and are back for Run: Dynamis (Sigma) (about 1:22 apart)\n"
     "Healer party mitigation lasts 20 seconds and can cover both Solar Ray hits and Run: Dynamis if timed well\n"
     "Each Run: Dynamis needs both tank 90s, H2 30s, D3, Reprisal, Feint and shields (Feint alternates D1 / D2)",
     strict=False)

# ---------------------------------------------------------------- Delta
DL = "Run: ****mi* (Delta Version)"
BEE, FIN = (50, 2.5), (50, 97.5)
BOSSES = bossmark(BEE, "Beetle") + bossmark(FIN, "Final")
D1P = dict(D3=(29, 15), ST=(70, 15), H2=(40, 29), D2=(59, 29), MT=(29, 68), D1=(70, 68), H1=(29, 82), D4=(70, 82))


def fist(c, col):
    return [dot(c, 2.2, "#4d7bff" if col == "b" else "#e6b422"), ring(c, 2.2, "#1d1d1d", 0.25)]


def dteth(pos):
    out = blue_tether(pos["D3"], pos["ST"]) + blue_tether(pos["H2"], pos["D2"])
    out += rg_tether(pos["MT"], pos["D1"]) + rg_tether(pos["H1"], pos["D4"])
    return out


step(P5, DL, "① แยกจุดเริ่ม: สายฟ้าฝั่ง Beetle สายแดง-เขียวฝั่ง Final", "① Start: blue tethers by Beetle, red/green by Final",
     "Delta มี 3 ส่วน: Rocket Punch / Oversampled Wave Cannon + Pile Pitch / Hello, World\n\n"
     "สายขึ้น แบ่งปาร์ตี้เป็น 2 กลุ่ม:\n"
     "สายแดง-เขียว 4 คน / สายฟ้า 4 คน (Hello, Near World และ Hello, Distant World อยู่กับ 2 คนในสายฟ้า)\n\n"
     "① แยกไปจุดเริ่ม\n"
     "สายฟ้า: ยืนเป็น 2 แถวที่ Omega ร่าง Beetle แถวหนึ่งยาว แถวหนึ่งสั้น / แถวยาวต้องยาวพอให้สายขาดทันทีตอนสายทำงาน (กลุ่มส่วนใหญ่ใช้ขาของ Beetle เป็นตัววัด)\n"
     "สายแดง-เขียว: ยืนเป็น 2 แถวที่ Final Omega (Reconstructed) ดึงสายไว้แต่ไม่ให้ขาด\n"
     "สายฟ้าอยู่ฝั่งตรงข้าม Final Omega เพื่อมองเห็น Oversampled Wave Cannon ของ Final Omega ชัดที่สุด",
     "Delta has three parts: Rocket Punches / Oversampled Wave Cannon + Pile Pitch / Hello, World\n\n"
     "Tethers appear and split the party:\n"
     "four red/green tethers / four blue tethers (Hello, Near World and Hello, Distant World are on two blue-tethered players)\n\n"
     "① Split into your starting spots\n"
     "Blue tethers: two lines by Beetle Omega, one long, one short / the long one must be long enough to break as soon as the tethers activate (groups use Beetle's legs as the guide)\n"
     "Red/green tethers: two lines by the Reconstructed (Final) Omega, stretched but not broken\n"
     "The blue tethers go opposite Final Omega for the best view of its Oversampled Wave Cannon",
     strict=True, pic="05a/run_dynamis_delta_01.jpg", scene=board(BOSSES + dteth(D1P), wm=False, roles=roles(**D1P)),
     refs=[FR("delta-tethers", "nin", 606, "Delta: สายแดง-เขียว (เส้นลายแดงเขียว) ดึงให้ตึงแต่ไม่ให้ขาด", "Delta: the red/green tether (the striped line); stretch it without breaking it")])

sh = BOSSES + dteth(D1P) + fist((20, 15), "b") + fist((79, 15), "y") + fist((31, 29), "b") + fist((68, 29), "y")
sh += fist((20, 68), "b") + fist((79, 68), "b") + fist((20, 82), "y") + fist((79, 82), "y")
sh += [arrow((42, 26), (58, 17), "#c8e8ff", 0.4), arrow((57, 26), (42, 17), "#c8e8ff", 0.4), arrow((29, 71), (29, 78), "#c8ffb0", 0.4), arrow((70, 71), (70, 78), "#c8ffb0", 0.4)]
step(P5, DL, "② กำปั้นขึ้น: คู่ในเข้าแนวคู่นอก / สีซ้ำ สลับฝั่ง", "② Fists: inner pair lines up; same colour, swap",
     "② กำปั้นสีฟ้ากับเหลืองขึ้นบนหัวทุกคน\n"
     "คู่นอกยืนที่เดิม คู่ในขยับมาอยู่แนวเดียวกับคู่นอก\n"
     "คู่ในปรับถ้าจำเป็น:\n"
     "1. ดูว่าเรากับคนข้างๆ (จากอีกสาย) มีกำปั้นสีเดียวกันไหม\n"
     "2. ถ้าสีเดียวกัน: สลับฝั่งกับคู่สายของตัวเอง\n"
     "สลับมากสุดคู่เดียว\n\n"
     "ตัวอย่าง 1 (ภาพ): สายฟ้ามีสีซ้ำ คู่ใน (H2, D2) สลับฝั่ง / สายเขียวไม่ซ้ำ คู่ใน (MT, D1) ไป stack กับคู่กำปั้น (H1, D4)\n"
     "ตัวอย่าง 2 (ภาพถัดไป): สายเขียวสีซ้ำ คู่ใน (MT, D1) สลับฝั่ง / สายฟ้าไม่ซ้ำ คู่ใน (H2, D2) ขึ้นไปแนวเดียวกับคู่ (D3, ST)\n\n"
     "macro: กำปั้นสีซ้ำ คู่ใน (เลข 2 ของสายแดง-เขียว / เลข 1 ของสายฟ้า) เป็นคนปรับ\n"
     "กำปั้นจะมี AoE ก็ต่อเมื่อกำปั้นฟ้าคู่กับเหลืองถูกต้อง ถ้าหาย = โดน Unmitigated Explosion",
     "② Blue and yellow fists appear over everyone\n"
     "The outer pair stays put; the inner pair moves in line with them\n"
     "The inner pair adjusts if needed:\n"
     "1. Check whether you and the player beside you (from the other tether) have the same colour fist\n"
     "2. If so, swap sides with your tether partner\n"
     "At most one pair ever swaps\n\n"
     "Example 1 (this picture): the blue tethers have matching fists, so the inner pair (H2, D2) swaps / no swap for green; the inner pair (MT, D1) stacks on their fist partners (H1, D4)\n"
     "Example 2 (next picture): the green tethers match, so the inner pair (MT, D1) swaps / no swap for blue; the inner pair (H2, D2) moves in line with (D3, ST)\n\n"
     "Macro: on matching fists, the inner players adjust\n"
     "Fist AoEs only appear when a blue fist is correctly stacked with a yellow one; missing = Unmitigated Explosion",
     strict=True, pic="05a/run_dynamis_delta_02a.jpg", scene=board(sh, wm=False, roles=roles(**D1P)))

sh = BOSSES + dteth(D1P) + fist((20, 15), "y") + fist((79, 15), "y") + fist((31, 29), "b") + fist((68, 29), "b")
sh += fist((20, 68), "y") + fist((79, 68), "b") + fist((20, 82), "y") + fist((79, 82), "b")
sh += [arrow((40, 26), (40, 18), "#c8e8ff", 0.4), arrow((59, 26), (59, 18), "#c8e8ff", 0.4), arrow((32, 70), (66, 80), "#c8ffb0", 0.4), arrow((67, 70), (33, 80), "#c8ffb0", 0.4)]
step(P5, DL, "② ตัวอย่าง 2: สายเขียวสีซ้ำ", "② Example 2: the green tethers match",
     "ตัวอย่าง 2: MT กับ H1 ได้กำปั้นเหลืองทั้งคู่ จึงให้คู่ใน (MT, D1) สลับฝั่ง ไป stack กับคนกำปั้นคนละสี\n"
     "สายฟ้าไม่ซ้ำ: คู่ใน (H2, D2) ขึ้นไปอยู่แนวเดียวกับ D3 กับ ST",
     "Example 2: MT and H1 both have yellow fists, so the inner pair (MT, D1) swaps sides to stack on the other colour\n"
     "No swap for blue: the inner pair (H2, D2) moves up in line with D3 and ST",
     strict=True, pic="05a/run_dynamis_delta_02b.jpg", scene=board(sh, wm=False, roles=roles(**D1P)))

D3P = dict(D3=(29, 15), D2=(37, 15), H2=(62, 15), ST=(70, 15), MT=(31, 80), H1=(28, 83.5), D1=(69, 80), D4=(72, 83.5))
ARMS = [((22, 7), "#38d6d6"), ((78, 7), "#ff9a3a"), ((3, 50), "#38d6d6"), ((97, 50), "#ff9a3a"), ((22, 93), "#ff9a3a"), ((78, 93), "#38d6d6")]


def armsd():
    out = []
    for c, col in ARMS:
        out += [dot(c, 2.6, "#d7dbe3"), ring(c, 4.2, col, 0.6, 0.9)]
    return out


sh = BOSSES + armsd() + blue_tether(D3P["D3"], D3P["ST"]) + blue_tether(D3P["D2"], D3P["H2"]) + rg_tether(D3P["MT"], D3P["D1"]) + rg_tether(D3P["H1"], D3P["D4"])
step(P5, DL, "③ แขนรอบสนามบอกทิศหมุน", "③ The arms show their spin",
     "③ แขนโผล่รอบนอกสนาม และแสดงว่าจะหมุนไปทางไหน",
     "③ Arms appear around the outside of the arena and telegraph which way they will spin",
     strict=True, pic="05a/run_dynamis_delta_03.jpg", scene=board(sh, wm=False, roles=roles(**D3P)))

D4P = dict(D3=(35, 15), D2=(39, 17), H2=(60, 17), ST=(64, 15), MT=(31, 80), H1=(28, 83.5), D1=(69, 80), D4=(72, 83.5))
sh = BOSSES + armsd() + blue_tether(D4P["D2"], D4P["H2"]) + rg_tether(D4P["MT"], D4P["D1"]) + rg_tether(D4P["H1"], D4P["D4"]) + [arrow((29, 15), (34, 15)), arrow((70, 15), (65, 15))]
step(P5, DL, "④ สายทำงาน: สายฟ้าเส้นนอกขาด เข้า stack คู่ใน", "④ Tethers activate: the outer blue breaks; stack on the inner pair",
     "④ สายทำงาน: สายฟ้าเส้นนอกขาดทันที\n"
     "คนสายฟ้าเส้นนอกเดินเข้าไป stack กับคนสายฟ้าเส้นใน\n\n"
     "macro (เวลาทำสายขาด):\n"
     "สายฟ้าเส้นยาว: ขาดทันที\n"
     "สายฟ้าเส้นสั้น: ตัดหลัง AoE ของกำปั้น\n"
     "สายแดง-เขียวฝั่ง Beetle: ตัดตอน debuff เหลือ 15 วินาที\n"
     "สายแดง-เขียวอีกคู่: ตัดตอน debuff เหลือ 2 วินาที",
     "④ The tethers activate: the outer blue tether breaks at once\n"
     "The outer blue players move in to stack with the inner blue players\n\n"
     "Macro (when each tether breaks):\n"
     "Long blue: immediately\n"
     "Short blue: after the fist AoEs\n"
     "Red/green on Beetle's side: at 15 s left on the debuff\n"
     "The other red/green pair: at 2 s left",
     strict=True, pic="05a/run_dynamis_delta_04.jpg", scene=board(sh, wm=False, roles=roles(**D4P)))

D5P = dict(D3=(36, 14), D2=(38.5, 16.5), H2=(61.5, 16.5), ST=(64, 14), MT=(31, 80), H1=(28, 83.5), D1=(69, 80), D4=(72, 83.5))
sh = BOSSES + armsd() + [rect((50, 50), 100, 40, 0, "#c05a5a", 0.35)] + aoe((37, 15), 6, "#ffc9a8", 0.4) + aoe((63, 15), 6, "#ffc9a8", 0.4)
sh += aoe((29.5, 82), 6, "#ffc9a8", 0.4) + aoe((70.5, 82), 6, "#ffc9a8", 0.4) + rg_tether(D5P["MT"], D5P["D1"]) + rg_tether(D5P["H1"], D5P["D4"])
sh += [arrow((35, 12), (25, 9)), arrow((65, 12), (75, 9)), arrow((39, 19), (45, 40)), arrow((61, 19), (55, 40)),
       arrow((29, 78), (6, 52)), arrow((71, 78), (94, 52)), arrow((27, 86), (22, 91)), arrow((73, 86), (78, 91))]
step(P5, DL, "⑤ ไปล่อแขนที่ได้รับ", "⑤ To your assigned arm",
     "⑤ วง AoE ของกำปั้นขึ้นพร้อมลำแสงของตาใหญ่\n"
     "Final Omega แสดง monitor ข้างหนึ่ง / คนสายฟ้า 1 คนได้ monitor ด้วย\n"
     "ไปที่แขนที่หมุนตามหน้าที่:\n"
     "คู่สายฟ้าด้านนอก: ล่อแขนฝั่ง Beetle\n"
     "คู่สายฟ้าด้านใน: ตัดสาย แล้วเข้ากลางไปล่อ Beyond Defense\n"
     "คู่สายเขียวที่ใกล้กลางกว่า: ล่อแขนด้านข้าง\n"
     "คู่สายเขียวที่ขอบ: ล่อแขนฝั่ง Final Omega\n"
     "macro: ตอนล่อกำปั้น ถ้าสีกำปั้นชนกัน สายเส้นในเป็นคนปรับ",
     "⑤ The fist AoEs appear with the eye's beam\n"
     "Final Omega telegraphs monitors on one side / one blue-tethered player also gets monitors\n"
     "Go to your assigned spinning arm:\n"
     "Outer blue pair: bait the arms on Beetle's side\n"
     "Inner blue pair: break your tether, then go to the middle to bait Beyond Defense\n"
     "Green pair nearer the centre: bait the side arms\n"
     "Green pair at the edge: bait the arms on Final Omega's side\n"
     "Macro: for the Rocket Punch bait, the inner tethers adjust",
     strict=True, pic="05a/run_dynamis_delta_05.jpg", scene=board(sh, wm=False, roles=roles(**D5P)))

D6P = dict(D3=(30, 11), ST=(64, 11), H2=(35, 38), D2=(66, 37), MT=(5, 46), D1=(95, 46), H1=(32, 94), D4=(63, 94))
sh = BOSSES + mf((50, 47), "M") + [beam((22, 7), (30, 11), 12, "#ffc9a8", 0.35), beam((78, 7), (64, 11), 12, "#ffc9a8", 0.35),
                                   beam((3, 50), (5, 46), 12, "#ffc9a8", 0.35), beam((97, 50), (95, 46), 12, "#ffc9a8", 0.35),
                                   beam((22, 93), (32, 94), 12, "#ffc9a8", 0.35), beam((78, 93), (63, 94), 12, "#ffc9a8", 0.35)]
sh += aoe(D6P["H2"], 12, "#ffc9a8", 0.35) + rg_tether(D6P["MT"], D6P["D1"]) + rg_tether(D6P["H1"], D6P["D4"])
step(P5, DL, "⑥ แขนล็อกคนใกล้สุด / Beyond Defense", "⑥ Arms lock the closest / Beyond Defense",
     "หลังล่อเลเซอร์แขนด้านนอก แบ่งหน้าที่ตามสี:\n"
     "สายแดง-เขียว: รับ monitor\n"
     "สายฟ้า: จัดการ Pile Pitch\n\n"
     "⑥ แขนด้านนอกแสดง AoE ใส่คนที่ใกล้ที่สุด\n"
     "ร่างแยก Omega-M ใช้ Beyond Defense ใส่ 1 ใน 2 คนที่ใกล้ที่สุด",
     "After baiting the outer arm lasers, the tether colours split the jobs:\n"
     "Red/green tethers: take the monitor hits\n"
     "Blue tethers: handle Pile Pitch\n\n"
     "⑥ The outer arms telegraph AoEs on the closest player\n"
     "The Omega-M clone hits one of the two closest players with Beyond Defense",
     strict=True, pic="05a/run_dynamis_delta_06.jpg", scene=board(sh, wm=False, roles=roles(**D6P)))

D7P = dict(MT=(5, 33), H1=(5, 67), D1=(95, 33), D4=(95, 67), H2=(56, 25), ST=(55, 45), D2=(55, 51), D3=(60, 48))
sh = BOSSES + [rect((25, 50), 50, 100, 0, "#5fa8d6", 0.25), rect((75, 50), 50, 100, 0, "#a77fd6", 0.25)]
sh += aoe((5, 33), 11, "#a8e0f0", 0.35) + aoe((5, 67), 11, "#a8e0f0", 0.35) + aoe((95, 33), 11, "#d6b8f0", 0.35) + aoe((95, 67), 11, "#d6b8f0", 0.35)
sh += aoe((57, 48), 9, "#ffc9a8", 0.45) + rg_tether(D7P["MT"], D7P["D1"]) + rg_tether(D7P["H1"], D7P["D4"])
step(P5, DL, "⑦ monitor หันสวน Final Omega / stack Pile Pitch", "⑦ Monitors opposite Final Omega's / stack Pile Pitch",
     "⑦ คนที่มี Oversampled Wave Cannon Loading หัน monitor ไปทางตรงข้ามกับ Oversampled Wave Cannon ของ Final Omega\n"
     "จะเกิดทางเดินปลอดภัยตรงกลาง ให้คนสายฟ้า 3 คนที่ไม่โดน Beyond Defense stack แชร์ Pile Pitch\n"
     "stack Pile Pitch อาจมีหรือไม่มีคนถือ monitor ก็ได้\n"
     "คนที่โดน Beyond Defense ยืนในทางเดินนั้น ห่างจาก stack Pile Pitch\n"
     "สายแดง-เขียว 4 คนอยู่ริมสองข้าง รับ monitor ข้างละ 2 คน",
     "⑦ The player with Oversampled Wave Cannon Loading points their monitors the other way from Final Omega's Oversampled Wave Cannon\n"
     "That leaves a safe corridor for the three blue-tethered players not hit by Beyond Defense to share Pile Pitch\n"
     "The Pile Pitch stack may or may not include the monitor player\n"
     "The player hit by Beyond Defense stands in the corridor, away from the stack\n"
     "The four red/green players are on the two sides, two per monitor",
     strict=True, pic="05a/run_dynamis_delta_07.jpg", scene=board(sh, wm=False, roles=roles(**D7P)),
     refs=[FR("delta-monitor", "nin", 596, "Delta: Final Omega (สีทอง) กับ monitor: จอสีฟ้าข้างตัวบอกฝั่งที่ยิง", "Delta: Final Omega (gold) and its monitors; the blue screens show which side it fires")])

BEE8 = (47, 4)
D8P = dict(D4=(47, 7), MT=(17, 16), D1=(26, 28), D2=(33, 52), D3=(5, 52), H2=(13, 77), ST=(15, 74), H1=(25, 89))
sh = bossmark(BEE8, "Beetle")
sh += [{"t": "cone", "at": [47, 4], "dir": 95, "spread": 180, "len": 140, "c": "#c08050", "o": 0.4, "wd": 0.01}]
sh += rg_tether(D8P["D4"], D8P["H1"]) + notch_marks(222, 236) + [text((20, 93), "3", 2.6, "#1d1d1d"), text((10, 84), "3", 2.6, "#1d1d1d")]
step(P5, DL, "⑧ Hello, World: Beetle ฟันครึ่งสนาม", "⑧ Hello, World: Beetle cleaves half the arena",
     "Omega-M กับ Final Omega หายไป: สัญญาณส่วนสุดท้าย Hello, Near World และ Hello, Distant World\n\n"
     "⑧ Omega ร่าง Beetle เรืองแสง ฟันครึ่งสนาม: เข้าฝั่งที่ปลอดภัย\n"
     "คู่สายเขียวฝั่งใกล้ Beetle: ตัดสายตอน debuff ของสายเหลือ 15 วินาที แล้วรับ Hello, Near World:\n"
     "คนฝั่งปลอดภัยไปที่ขอบ ทิศเฉียงฝั่ง Beetle / คนฝั่งไม่ปลอดภัยไปยืนที่ marker ทิศเฉียงนั้น\n"
     "คู่สายเขียวฝั่งไกล Beetle: รับ Hello, Distant World:\n"
     "คนฝั่งไม่ปลอดภัยหมุนขึ้นไปที่ตัว Beetle / คนฝั่งปลอดภัยไปขีดทิศเฉียงฝั่งไกล Beetle แล้วถอยอีก 3 ขีด (ออกห่าง Beetle)\n"
     "Hello, Near World: ยืนวงที่ 3 นับจากกลาง บนทิศหลักระหว่างบอส 2 ตัว\n"
     "Hello, Distant World: ยืนขอบสนาม บนทิศหลักระหว่างบอส 2 ตัว\n"
     "สายฟ้า 2 คนที่ไม่มี debuff: ไปขอบสนามที่ขีดทิศเฉียงฝั่งไกล Beetle แล้วขยับเข้าหา Beetle 3 ขีด (รอบนี้ไม่ได้ Dynamis)\n\n"
     "ทุกคนเข้าที่แล้ว การฟันลงพร้อม Hello, Near World และ Hello, Distant World",
     "Omega-M and Final Omega vanish: the cue for the last part, Hello, Near World and Hello, Distant World\n\n"
     "⑧ Beetle Omega lights up to cleave half the arena: move to the safe side\n"
     "Green pair towards Beetle: break the tether at 15 s left on the debuff, then take Hello, Near World:\n"
     "the one on the safe side goes to the edge at the intercardinal towards Beetle / the one on the unsafe side to that intercardinal's waymark\n"
     "Green pair away from Beetle: take Hello, Distant World:\n"
     "the one on the unsafe side rotates up to Beetle / the one on the safe side goes to the intercardinal mark away from Beetle, then three more notches away\n"
     "Hello, Near World: three rings from the centre, on the cardinal between the two bosses\n"
     "Hello, Distant World: at the edge, on the cardinal between the two bosses\n"
     "The two blue tethers with no debuff: the edge at the intercardinal mark away from Beetle, then three notches towards Beetle (no Dynamis this round)\n\n"
     "Then the cleave goes off with both Hello, Worlds",
     strict=True, pic="05a/run_dynamis_delta_08.jpg", scene=board(sh, wm=True, roles=roles(**D8P)),
     refs=None)

sh = bossmark(BEE8, "Beetle") + [{"t": "cone", "at": [47, 4], "dir": 95, "spread": 180, "len": 140, "c": "#c08050", "o": 0.4, "wd": 0.01}]
sh += aoe((33, 52), 16, "#9fd87f", 0.35) + aoe(D8P["D1"], 8, "#9fd87f", 0.35) + aoe(D8P["MT"], 8, "#9fd87f", 0.35)
sh += aoe(D8P["D3"], 16, "#7fb0e0", 0.35) + aoe(D8P["D4"], 8, "#7fb0e0", 0.35) + aoe(D8P["H1"], 8, "#7fb0e0", 0.35) + rg_tether(D8P["D4"], D8P["H1"])
sh += [arrow((33, 50), (27, 32), GT, 0.5), arrow((25, 27), (19, 19), GT, 0.5), arrow((7, 50), (44, 9), "#5fb4ff", 0.5), arrow((45, 9), (26, 86), "#5fb4ff", 0.5)]
step(P5, DL, "⑨ ตัดสายแดง-เขียวเส้นสุดท้ายตอนเหลือ 2 วินาที", "⑨ Break the last red/green tether at 2 s",
     "⑨ ทำสายแดง-เขียวเส้นสุดท้ายขาด ตอน debuff ของสายเหลือ 2 วินาที",
     "⑨ Break the final red/green tether when its debuff timer reaches 2 seconds",
     strict=True, pic="05a/run_dynamis_delta_09.jpg", scene=board(sh, wm=True, roles=roles(**D8P)))

# ---------------------------------------------------------------- Sigma
SG = "Run: ****mi* (Sigma Version)"
OM = (50, 5)
SYMS = ["o", "x", "t", "s"]
S1L = dict(D3=(41, 55), ST=(41, 62), H1=(41, 69), D2=(41, 76))
S1R = dict(D1=(59, 55), MT=(59, 62), D4=(59, 69), H2=(59, 76))
sh = mf(OM, "M") + [dot((31, 66), 2.6, "#d7dbe3"), dot((69, 66), 2.6, "#d7dbe3")]
for (k1, a), (k2, b), s in zip(S1L.items(), S1R.items(), SYMS):
    sh += [line(a, b, "#d9d9d9", 0.3, 0.7)] + sym((a[0] - 5, a[1]), s, 2.6) + sym((b[0] + 5, b[1]), s, 2.6)
step(P5, SG, "① 2 แถวระหว่างแขน เรียงตามสัญลักษณ์", "① Two columns between the arms, by symbol",
     "Sigma มี 3 ส่วน: Wave Cannon + เลเซอร์ / Mid-Remote Glitch + tower knockback / Hello, World\n\n"
     "① แขน 2 อันโผล่ ตามด้วย Omega-M\n"
     "แขนอยู่ทิศ ตก.เฉียงใต้ และ ตอ.เฉียงใต้ ของ Omega-M เสมอ: ส่วนนี้ใช้ Omega-M เป็นทิศเหนือ\n"
     "ยืนเป็น 2 แถว แถวละ 4 คน ระหว่างแขนทั้งสอง\n"
     "บนลงล่าง: วงกลม > กากบาท > สามเหลี่ยม > สี่เหลี่ยม (สายทุกเส้นต้องเป็นแนวนอน)",
     "Sigma has three parts: Wave Cannons + lasers / Mid-Remote Glitch + knockback towers / Hello, World\n\n"
     "① Two arms appear, then Omega-M\n"
     "The arms are always south-west and south-east of Omega-M, who is north for this part\n"
     "Line up in two columns of four between the arms\n"
     "Top to bottom: circle > cross > triangle > square (every tether horizontal)",
     strict=False, pic="05b/run_dynamis_sigma_01.jpg", scene=board(sh, wm=False, roles=roles(**S1L, **S1R)),
     refs=[FR("sigma-lineup", "nin", 651, "Sigma: สัญลักษณ์บนหัวบอกคู่ ยืน 2 แถวตามสัญลักษณ์", "Sigma: the symbols show the pairs; two columns by symbol")])

sh = mf(OM, "M") + [dot((31, 66), 2.6, "#d7dbe3"), dot((69, 66), 2.6, "#d7dbe3")]
for (k1, a), (k2, b) in zip(S1L.items(), S1R.items()):
    sh.append(line(a, b, "#d9d9d9", 0.3, 0.7))
for k in ("D3", "ST", "MT", "H1", "D2", "H2"):
    sh += redmark({**S1L, **S1R}[k])
step(P5, SG, "② มาร์ก 6 คน: ดูว่าคู่เรามีมาร์ก 1 หรือ 2", "② Six markers: does your pair have one or two?",
     "② 6 คนโดนมาร์กแบบสุ่ม ทุกคู่ได้อย่างน้อย 1\n"
     "จึงมี 2 คู่ที่มีมาร์ก 2 อัน และ 2 คู่ที่มีมาร์ก 1 อัน\n"
     "ดูว่าคู่ของเรามีมาร์ก 1 หรือ 2 และเป็นคู่บนหรือคู่ล่าง (เทียบกับอีกคู่ที่มีมาร์กเท่ากัน)\n\n"
     "ตัวอย่าง:\n"
     "มาร์ก 2 อัน: ST กับ MT เป็นคู่บน / D2 กับ H2 เป็นคู่ล่าง\n"
     "มาร์ก 1 อัน: D3 กับ D1 เป็นคู่บน / H1 กับ D4 เป็นคู่ล่าง",
     "② Six random players get marked; every tether pair has at least one\n"
     "So two pairs have two markers, two pairs have one\n"
     "Note whether your pair has one or two, and whether it's the top or bottom pair (against the other pair with the same count)\n\n"
     "Example:\n"
     "Two markers: ST and MT are the top pair / D2 and H2 the bottom pair\n"
     "One marker: D3 and D1 are the top pair / H1 and D4 the bottom pair",
     strict=False, pic="05b/run_dynamis_sigma_02.jpg", scene=board(sh, wm=False, roles=roles(**S1L, **S1R)))

S3P = dict(ST=P(0, 13.2), D4=P(45, 13.2), H2=P(90, 13.2), D3=P(135, 13.2), MT=P(180, 13.2), H1=P(225, 13.2), D2=P(270, 13.2), D1=P(315, 13.2))
sh = mf(OM, "M") + [ring((50, 50), 31.4, "#3df06a", 0.3, 0.8)]
for a, b in (("ST", "MT"), ("D4", "H1"), ("H2", "D2"), ("D3", "D1")):
    sh.append(line(S3P[a], S3P[b], "#d9d9d9", 0.3, 0.6))
for k in ("ST", "MT", "H2", "D2", "D3", "H1"):
    sh += redmark(S3P[k])
step(P5, SG, "③ กระจาย 8 ทิศตามคู่ / Mid ที่ marker Remote ที่ขอบ", "③ Spread to 8 spots by pair / Mid at the waymarks, Remote at the edge",
     "③ กระจายตามตำแหน่ง:\n"
     "คู่มาร์ก 2 อัน: คู่บนไป เหนือ / ใต้ (คนแถวซ้ายไปเหนือ) / คู่ล่างไป ตะวันออก / ตะวันตก (คนแถวซ้ายไปตะวันตก)\n"
     "คู่มาร์ก 1 อัน: คู่บนไป ตก.เฉียงเหนือ / ตอ.เฉียงใต้ (คนไม่มีมาร์กไป ตก.เฉียงเหนือ) / คู่ล่างไป ตอ.เฉียงเหนือ / ตก.เฉียงใต้ (คนไม่มีมาร์กไป ตอ.เฉียงเหนือ)\n\n"
     "ถอยให้ได้ระยะของ Glitch:\n"
     "Mid Glitch: ยืนบนเส้นที่ marker (ภาพ)\n"
     "Remote Glitch: ไปขอบสนาม",
     "③ Spread out by position:\n"
     "Two-marker pairs: the top pair goes N / S (left column player N) / the bottom pair E / W (left column player W)\n"
     "One-marker pairs: the top pair goes NW / SE (the unmarked player NW) / the bottom pair NE / SW (the unmarked player NE)\n\n"
     "Spread to satisfy your Glitch:\n"
     "Mid Glitch: on the line at the waymarks (the picture)\n"
     "Remote Glitch: to the edge of the arena",
     strict=True, pic="05b/run_dynamis_sigma_03.jpg", scene=board(sh, wm=False, roles=roles(**S3P)))

sh = mf(OM, "M")
for k in ("ST", "MT", "H2", "D2", "D3", "H1"):
    sh.append(beam((50, 50), P(ang((50, 50), S3P[k]), 21), 9, "#a8e0f0", 0.35))
sh += [beam((31, 66), (75, 22), 10, "#e8f0ff", 0.35), beam((69, 66), (25, 22), 10, "#e8f0ff", 0.35)]
step(P5, SG, "④ เลเซอร์กับ Wave Cannon ลง: จำ marker ข้างตัว", "④ Lasers and Wave Cannons: note your waymark",
     "④ เลเซอร์และ Wave Cannon ลง\n"
     "จำไว้ว่ายืนอยู่ข้าง marker ไหน: ใช้เลือก tower ในขั้นถัดไป",
     "④ The lasers and Wave Cannons resolve\n"
     "Note which waymark you are standing beside: it picks your tower next",
     strict=True, pic="05b/run_dynamis_sigma_04.jpg", scene=board(sh, wm=True, roles=roles(**S3P)))


def tw(c, labels):
    out = tower(c, 7.2)
    out.append(text(c, labels, 3.6, "#1d1d1d"))
    return out


MIDT = [((32, 12), "1"), ((68, 12), "2"), ((13, 65), "A 3"), ((87, 65), "D 4"), ((32, 90), "B"), ((68, 90), "C")]
REMT = [((50, 8), "2 1"), ((10, 47), "A"), ((90, 47), "D"), ((22, 82), "B 3"), ((78, 82), "C 4")]
for which, lst, pic, th, en in (("mid", MIDT, "05b/run_dynamis_sigma_05b.jpg", "Mid Glitch: tower 6 อัน", "Mid Glitch: six towers"),
                                ("remote", REMT, "05b/run_dynamis_sigma_05a.jpg", "Remote Glitch: tower 5 อัน", "Remote Glitch: five towers")):
    sh = mf((50, 50), "F")
    for c, l in lst:
        sh += tw(c, l)
    note = ("⑤ tower โผล่ที่ขอบสนาม: Remote Glitch 5 อัน / Mid Glitch 6 อัน\n"
            "tower เกิดเป็นรูปแบบตายตัว หันไปทางที่ Omega-M ยืนก่อนหน้า หรือตรงข้าม\n"
            "เลือก tower ตาม marker ที่ยืนข้างตอนจบส่วนก่อน (ตัวอักษร/ตัวเลขบน tower ในภาพ)\n"
            "จำง่าย (ให้ปลายแฉกดาวเป็นเหนือ หรือฝั่งที่มี tower 4 อันเป็นใต้):\n"
            "ABCD เรียงซ้ายไปขวาฝั่งที่มี tower 4 อัน / เลขคี่อยู่ซ้าย เลขคู่อยู่ขวา / 3 กับ 4 เปลี่ยนที่ตาม Mid หรือ Remote\n\n"
            "⑥ เดินเข้ากลางมายืนหน้า tower ของตัวเอง แล้ว Omega-F โผล่กลางสนาม knockback ทุกคนไปที่ขอบ\n"
            "Mid Glitch: ยืนกลาง tower\n"
            "Remote Glitch: ไขว้สายกัน และยืนที่ขอบของ tower\n"
            "(บางคนโพสต์ผังนี้ใน /echo หรือ /party ช่วยจำ)",
            "⑤ Towers spawn at the edge: five for Remote Glitch / six for Mid Glitch\n"
            "They come in a fixed layout, facing where Omega-M stood before, or directly opposite\n"
            "Your tower is set by the waymark you stood beside at the end of the last part (the letters/numbers on the towers)\n"
            "To remember (the star's point as north, or the four-tower side as south):\n"
            "ABCD go left to right on the four-tower side / odd numbers left, even right / 3 and 4 move with Mid or Remote\n\n"
            "⑥ Move in and stand in front of your tower; Omega-F appears in the middle and knocks everyone back to the edge\n"
            "Mid Glitch: stand in the centre of the towers\n"
            "Remote Glitch: criss-cross the tethers and stand at the edge of the towers\n"
            "(Some post this layout in /echo or /party to help)")
    step(P5, SG, f"⑤ {th}", f"⑤ {en}", note[0], note[1], strict=False, pic=pic, scene=board(sh, wm=False),
         refs=[FR("sigma-towers", "nin", 676, "Sigma: tower (วงบนพื้น) ที่ขอบสนาม เลือก tower ตาม marker ที่ยืนข้าง", "Sigma: towers (floor circles) at the edge; your tower follows the waymark you stood by")] if which == "mid" else None)

OF = (50, 20)
ARMU = [(14, 85), (86, 85)]
S7G = dict(D1=(22, 17), MT=(25, 14.5), H1=(28, 12))
S7O = dict(ST=(67, 74), H2=(67, 85), D3=(73, 82), D2=(76, 78), D4=(78, 84))
sh = mf(OF, "F") + [beam((50, 5), (50, 95), 30, PINK, 0.35)] + [dot(c, 2.6, "#d7dbe3") for c in ARMU]
step(P5, SG, "⑦ Hello, World (Sigma): 3 คนไปหา Omega-F", "⑦ Hello, World (Sigma): three to Omega-F",
     "⑦ Omega-F โผล่ที่ทิศหลักหรือทิศเฉียงใดก็ได้ / Right Arm Unit 2 อันอยู่ฝั่งตรงข้าม / Rear Power Unit ของ Omega อยู่กลาง\n"
     "ใช้ Omega-F เป็นทิศเหนือ และดูว่า Omega-F อยู่ในท่าขาใบมีดหรือไม่\n"
     "เลือก 3 คนไปหา Omega-F ตามลำดับ: (ฝั่ง Omega-F) H1 > MT > ST > D1 > D2 > D3 > D4 > H2 (ฝั่งตรงข้าม)\n"
     "ใน 3 คนนี้ อย่างน้อย 2 คนต้องมี Dynamis 1 stack / ห้ามมีใครถือ debuff Hello, World\n"
     "อีก 5 คนไปฝั่งตรงข้าม Omega-F\n\n"
     "ทำไม: ไม่อยากให้ Tank เป็นคนรับสายของ Beetle ตอนท้าย Omega (HP สูงสุดลดแล้วต้อง heal ให้เต็มก่อน Solar Ray)\n"
     "Tank ที่ไปหา Omega-F แปลว่ามี Dynamis จาก Delta แล้ว จึงควรพลาด Dynamis ของ Sigma (ไปล่อเลเซอร์แขน)",
     "⑦ Omega-F spawns at any cardinal or intercardinal / two Right Arm Units opposite / Omega's Rear Power Unit in the middle\n"
     "Use Omega-F as north and note whether she is in her blade-legs stance\n"
     "Pick three players to go to Omega-F by: (Omega-F) H1 > MT > ST > D1 > D2 > D3 > D4 > H2 (opposite)\n"
     "At least two of the three must have one Dynamis stack / none may hold a Hello, World debuff\n"
     "The other five go opposite Omega-F\n\n"
     "Why: to keep tanks off Beetle's tethers at the end of Omega (their max HP debuff wears off and they need topping before Solar Ray)\n"
     "A tank going to Omega-F already has Delta's Dynamis, so should miss Sigma's (baiting the arm lasers)",
     strict=False, pic="05b/run_dynamis_sigma_07.jpg", scene=board(sh, wm=False, roles=roles(**S7G, **S7O)),
     refs=[FR("sigma-hello", "nin", 691, "Sigma: Rear Power Unit กลางสนามยิงลำแสงแล้วหมุนช้าๆ", "Sigma: the Rear Power Unit in the middle fires its laser and slowly turns")])

sh = mf(OF, "F") + f_staff(OF, 180) + [beam(P(30, 30), P(210, 30), 22, PINK, 0.33)] + [dot(c, 2.6, "#d7dbe3") for c in ARMU]
step(P5, SG, "⑧ Omega-F ไม่ใช่ท่าขาใบมีด: รออยู่ด้านนอก", "⑧ Omega-F not in blade-legs: wait outside",
     "⑧ Rear Power Unit เริ่มยิงลำแสงเส้นตรงพร้อมหมุนช้าๆ\n"
     "ขึ้นกับท่าของ Omega-F: รออยู่ด้านนอก หรือเดินตามลำแสงของ Rear Power Unit\n"
     "ภาพนี้: Omega-F ไม่ได้อยู่ท่าขาใบมีด ทั้ง 2 กลุ่มรออยู่ที่ขอบ",
     "⑧ The Rear Power Unit starts firing a straight-line AoE while slowly turning\n"
     "Depending on Omega-F's stance, wait outside or follow the Rear Power Unit's AoE\n"
     "This picture: Omega-F is not in blade-legs; both groups wait at the edge",
     strict=False, pic="05b/run_dynamis_sigma_08b.jpg", scene=board(sh, wm=False, roles=roles(D1=(31, 12), MT=(34, 10), H1=(37, 9), **S7O)))

S8A = dict(D3=(48, 6), D4=(45, 9), MT=(50, 9.5), D1=(52, 83), ST=(50, 87), D2=(48, 92), H2=(53, 90), H1=(55, 86))
sh = mf((50, 18), "F") + f_blades((50, 18), 180, 13) + [beam(P(30, 30), P(210, 30), 22, PINK, 0.3)] + [dot(c, 2.6, "#d7dbe3") for c in ARMU]
step(P5, SG, "⑧ Omega-F ท่าขาใบมีด: เดินตามลำแสง", "⑧ Omega-F in blade-legs: follow the laser",
     "ภาพนี้: Omega-F อยู่ท่าขาใบมีด โดนทั้งสนามยกเว้นแนวที่ผ่านตัว Omega-F\n"
     "ทั้ง 2 กลุ่มเข้าแนวนั้น แล้วเดินตามลำแสงของ Rear Power Unit\n"
     "คนที่ติดมาร์ก '1' (automarker) มักเป็นคนเดินตามลำแสง / คนล่อแขน 2 คนมักบอกก่อนว่าจะไปทางไหนก่อนลำแสงเริ่มหมุน",
     "This picture: Omega-F is in blade-legs; everything is hit except the band through her\n"
     "Both groups get into that band and follow the Rear Power Unit's laser\n"
     "The players marked '1' (automarkers) usually follow the laser / the two arm baiters usually say which way they'll go before it starts turning",
     strict=False, pic="05b/run_dynamis_sigma_08a.jpg", scene=board(sh, wm=False, roles=roles(**S8A)))

S9P = dict(H1=(50, 5), D1=(25, 13), MT=(78, 18), H2=(12, 58), ST=(23, 63), D3=(13, 70), D2=(45, 80), D4=(48, 95))
sh = mf((50, 18), "F") + [beam(P(290, 30), P(110, 30), 22, PINK, 0.35)] + [dot(c, 2.6, "#d7dbe3") for c in ARMU]
step(P5, SG, "⑨ ลำแสงสุดท้าย: เข้าจุด Hello, World", "⑨ The last laser: into Hello, World spots",
     "⑨ หลังหมุนยิง 14 ครั้ง Rear Power Unit ยิงลำแสงสุดท้ายในแนวนี้\n"
     "ใช้ช่วงนี้เดินเข้าจุดแก้ Hello, World",
     "⑨ After turning and firing fourteen times, the Rear Power Unit fires its last laser in this line\n"
     "Use the time to get into position for Hello, World",
     strict=False, pic="05b/run_dynamis_sigma_09.jpg", scene=board(sh, wm=False, roles=roles(**S9P)))

S10 = dict(H1=(50, 5), D1=(20, 17), MT=(80, 17), H2=(3, 50), D3=(8, 62), ST=(25, 49), D2=(50, 75), D4=(50, 96))
sh = [beam((14, 85), (86, 15), 15, "#e8f0ff", 0.33), beam((86, 85), (14, 15), 15, "#e8f0ff", 0.33)] + [dot(c, 2.6, "#d7dbe3") for c in ARMU]
sh += aoe((25, 49), 16, "#9fd87f", 0.33) + aoe(S10["H2"], 8, "#9fd87f", 0.35) + aoe(S10["D3"], 8, "#9fd87f", 0.35)
sh += aoe((50, 75), 16, "#7fb0e0", 0.33) + aoe(S10["H1"], 8, "#7fb0e0", 0.35) + aoe(S10["D4"], 8, "#7fb0e0", 0.35)
sh += [arrow((22, 49), (6, 50), GT, 0.5), arrow((4, 53), (7, 59), GT, 0.5), arrow((50, 71), (50, 9), "#5fb4ff", 0.5), arrow((50, 79), (50, 92), "#5fb4ff", 0.5)]
step(P5, SG, "⑩ Hello, World ลงพร้อมเลเซอร์แขน", "⑩ Hello, World with the arm lasers",
     "⑩ debuff Hello, World ลงพร้อมเลเซอร์ของ Right Arm Unit\n"
     "คนถือ Hello, Near World และ Hello, Distant World: ยืนห่าง marker เข้าไปทางกลาง 1 วง\n"
     "คนแรกที่รับ Hello, Near World: หยุดที่ขีดทิศหลัก / ทิศเฉียงที่ขอบสนาม / คนที่ 2 อยู่ถัดไปข้างหลัง 4 ขีด\n"
     "ถ้ามี Tank ที่มี Dynamis 1 stack และเริ่มฝั่ง Omega-F: ให้ไปล่อเลเซอร์แขน\n\n"
     "ทำถูก: ตอนนี้ 4 คนมี Dynamis 1 stack และ 4 คนมี 2 stack",
     "⑩ The Hello, World debuffs resolve with the Right Arm Units' lasers\n"
     "Hello, Near World and Hello, Distant World holders: one ring in front of the waymarks (towards the middle)\n"
     "The first Hello, Near World receiver stops at the (inter)cardinal mark at the edge / the second four notches behind\n"
     "A tank with one Dynamis stack who started by Omega-F ideally baits the arm lasers\n\n"
     "Done right: four players have one Dynamis stack and four have two",
     strict=False, pic="05b/run_dynamis_sigma_10.jpg", scene=board(sh, wm=True, roles=roles(**S10)))


def am_tok(c, kind, n=""):
    if kind == "atk":
        return pl(c, n, "#f0c040", 2.6, "#1d1d1d", 2.6)
    if kind == "ign":
        return [ring(c, 2.4, "#ff5a7a", 0.5), line((c[0] - 1.6, c[1] + 1.6), (c[0] + 1.6, c[1] - 1.6), "#ff5a7a", 0.45), text((c[0] + 3, c[1] - 2.4), n, 2.2, "#ff9ab0")]
    if kind == "bind":
        return pl(c, n, "#d78af0", 2.6, "#1d1d1d", 2.6)
    if kind == "tri":
        x, y = c
        return [line((x, y - 2.4), (x - 2.4, y + 1.8), "#6fd6ff", 0.5), line((x - 2.4, y + 1.8), (x + 2.4, y + 1.8), "#6fd6ff", 0.5), line((x + 2.4, y + 1.8), (x, y - 2.4), "#6fd6ff", 0.5)]
    if kind == "cross":
        x, y = c
        return [line((x - 2.4, y), (x + 2.4, y), "#6fd6ff", 0.7), line((x, y - 2.4), (x, y + 2.4), "#6fd6ff", 0.7)]


AMNOTE = ("ภาพ automarker: เหลือง 1 / 2 = Attack 1 / 2 / วงแดงขีด = Ignore 1 / 2 / ม่วง 1 / 2 = Bind 1 / 2 / สามเหลี่ยม = Triangle / บวก = Cross",
          "Automarker picture: yellow 1 / 2 = Attack 1 / 2 / red slashed ring = Ignore 1 / 2 / purple 1 / 2 = Bind 1 / 2 / triangle = Triangle / plus = Cross")
sh = [beam((14, 85), (86, 15), 15, "#e8f0ff", 0.3), beam((86, 85), (14, 15), 15, "#e8f0ff", 0.3)] + aoe((25, 49), 16, "#9fd87f", 0.3) + aoe((50, 75), 16, "#7fb0e0", 0.3)
sh += am_tok((50, 5), "ign", "1") + am_tok((50, 96), "ign", "2") + am_tok((20, 17), "atk", "2") + am_tok((80, 17), "atk", "1")
sh += am_tok((25, 49), "tri") + am_tok((3, 50), "bind", "1") + am_tok((8, 62), "bind", "2") + am_tok((50, 75), "cross")
step(P5, SG, "automarker ของ Sigma", "Sigma automarkers",
     "Elemental DC นิยมใช้ automarker กำหนดจุดยืนของ Hello, Near World และ Hello, Distant World\n"
     "ผังที่ใช้กันทั่วไปตามภาพ\n"
     "คนที่ติดมาร์ก '1' มักเป็นคนเดินตามลำแสงที่หมุน แต่คนล่อแขน 2 คนมักบอกก่อนว่าจะไปทางไหนก่อนลำแสงเริ่มหมุน\n\n" + AMNOTE[0],
     "Elemental DC normally uses automarkers to assign Hello, Near World and Hello, Distant World positions\n"
     "This is the usual layout\n"
     "The players marked '1' usually follow the turning laser, though the two arm baiters commonly say which way they want to go before it starts\n\n" + AMNOTE[1],
     strict=False, pic="05b/run_dynamis_sigma_am.jpg", scene=board(sh, wm=True))

# ---------------------------------------------------------------- Omega
OG = "Run: ****mi* (Omega Version)"
FO = (50, 50)
TRF = target_ring(FO, 13, face=180, gap=60)
step(P5, OG, "mitigate ของ Sigma / Omega", "Sigma / Omega mitigation",
     "Run: Dynamis (Sigma): MT 90s, ST Reprisal, ST 90s, H2 30s, D2, D3\n"
     "Solar Ray ครั้งที่ 3 (ก่อน Omega): Holmgang > mitigate + สลับ / ไม่มี WAR: MT Rampart + 3rd + short / ST 30% + Rampart + short / MT Reprisal (ถ้าไม่ใช้ Holmgang Tank ทั้งคู่กด Rampart ตอนเลเซอร์แขนลง / Healer ช่วย MT)\n"
     "Run: Dynamis (Omega): MT 90s, ST Reprisal, ST 90s, H2 30s, D1, D3\n"
     "Solar Ray ครั้งที่ 4: mitigate + สลับ / ไม่มี WAR: MT 30% + Rampart + short / ST Rampart + 3rd + short / MT Reprisal (Healer ช่วย ST / H1 120s ตรงนี้กลับมาทัน Cosmo Dive ใน P6)\n"
     "Healer mitigate กับ Addle ของ D4 ใช้ตรงไหนก็ได้ที่เหมาะ",
     "Run: Dynamis (Sigma): MT 90s, ST Reprisal, ST 90s, H2 30s, D2, D3\n"
     "Solar Ray #3 (before Omega): Holmgang > mitigate + swap / no WAR: MT Rampart + 3rd + short / ST 30% + Rampart + short / MT Reprisal (without Holmgang both tanks Rampart as the arm lasers go off / healers help the MT)\n"
     "Run: Dynamis (Omega): MT 90s, ST Reprisal, ST 90s, H2 30s, D1, D3\n"
     "Solar Ray #4: mitigate + swap / no WAR: MT 30% + Rampart + short / ST Rampart + 3rd + short / MT Reprisal (healers help the ST / H1 120s here is back for Cosmo Dive in P6)\n"
     "Healer mitigation and D4's Addle go wherever they fit",
     strict=False)

MP, FP = (33, 30), (67, 70)
AXO = ang(MP, FP)
ORULE = ("กฎหาจุดปลอดภัย: จะมีจุดปลอดภัยบนทิศหลักเสมอ ที่ระยะ ใกล้ / กลาง / ไกล จากกลาง\n"
         "ดู Omega-F: ขาใบมีด = จุดปลอดภัยอยู่บนทิศหลัก ใกล้กลางเสมอ / Omega-M ถือดาบ: ไปทางที่ห่าง Omega-M / ถือโล่: ไปทาง Omega-M\n"
         "Omega-F ถือคทา = จุดปลอดภัยอยู่บนทิศหลักฝั่ง Omega-M เสมอ / Omega-M ถือดาบ: ไปไกล / ถือโล่: ไประยะกลาง",
         "Finding the safe spot: there is always one on a cardinal, near, middle or far from the centre\n"
         "Look at Omega-F: blade-legs = always on a cardinal near the centre / Omega-M with a sword: away from Omega-M / with a shield: towards Omega-M\n"
         "Omega-F with a staff = always on a cardinal towards Omega-M / Omega-M with a sword: go far / with a shield: go mid-way")
OCOMBO = [("M ถือดาบ + F ขาใบมีด (ห่าง M, ใกล้)", "M sword + F blade-legs (away from M, near)", "05c/run_dynamis_omega_03d.jpg", "sword", "blades", (50, 59)),
          ("M ถือโล่ + F ขาใบมีด (เข้าหา M, ใกล้)", "M shield + F blade-legs (towards M, near)", "05c/run_dynamis_omega_03a.jpg", "shield", "blades", (50, 41)),
          ("M ถือดาบ + F ถือคทา (เข้าหา M, ไกล)", "M sword + F staff (towards M, far)", "05c/run_dynamis_omega_03c.jpg", "sword", "staff", (50, 8)),
          ("M ถือโล่ + F ถือคทา (เข้าหา M, กลาง)", "M shield + F staff (towards M, middle)", "05c/run_dynamis_omega_03b.jpg", "shield", "staff", (50, 24))]
for th, en, pic, m, f, safe in OCOMBO:
    sh = (m_sword(MP) if m == "sword" else m_shield(MP)) + (f_blades(FP, AXO) if f == "blades" else f_staff(FP, AXO)) + TRF + mf(MP, "M") + mf(FP, "F")
    sh += [line((safe[0] - 2.6, safe[1] - 2.6), (safe[0] + 2.6, safe[1] + 2.6), "#3df06a", 0.6), line((safe[0] - 2.6, safe[1] + 2.6), (safe[0] + 2.6, safe[1] - 2.6), "#3df06a", 0.6)]
    step(P5, OG, th, en, ORULE[0] + "\n\nภาพ: " + th + " / กากบาทเขียว = จุดปลอดภัย",
         ORULE[1] + "\n\nPicture: " + en + " / green cross = the safe spot",
         strict=False, pic=pic, scene=board(sh, wm=True, boss=FO))

sh = TRF + mf(MP, "M") + mf(FP, "F")
step(P5, OG, "① Final Omega กลาง + คู่ M/F คู่แรก", "① Final Omega in the middle + the first M/F pair",
     "ไม่เหมือน Delta / Sigma: Omega-F อยู่ในสนามตลอดช่วงนี้\n"
     "ต้องหลบ AoE รวมของ Omega-M/F 2 ชุด (แบบ Party Synergy ใน P2) พร้อม Diffuse Wave Cannon ของ Omega Reconfigured ตรงกลาง\n\n"
     "① Final Omega โผล่กลางสนาม / คู่ Omega-M/F โผล่ที่ทิศเฉียงฝั่งตรงข้ามกัน ถืออาวุธแบบสุ่ม\n"
     "ชุดแรกจะเหลือจุดปลอดภัยให้เลือก 2 จุด (ตัวอย่าง: ใกล้กลาง ทิศเหนือหรือตะวันตก)\n"
     "ระวัง MT: Omega-F ตี auto-attack ตลอด แต่ Tank ใช้คูลดาวน์ใหญ่ไม่ได้ เพราะ Solar Ray กำลังมา",
     "Unlike Delta and Sigma, Omega-F stays on the arena for this part\n"
     "Dodge two Omega-M/F AoE combos (like Party Synergy in P2) together with Omega Reconfigured's Diffuse Wave Cannon in the middle\n\n"
     "① Final Omega appears in the middle / an Omega-M/F pair appears at opposite intercardinals with random weapons\n"
     "The first set leaves two possible safe spots (example: near the middle, north or west)\n"
     "Watch the MT: Omega-F auto-attacks throughout and tanks can't use big cooldowns because of the coming Solar Ray",
     strict=False, pic="05c/run_dynamis_omega_01.jpg", scene=board(sh, wm=True, boss=FO),
     refs=[FR("omega-lights", "nin", 776, "Omega: Final Omega กลางสนามเรืองแสง ยิงไป 2 ทิศหลัก ตัดจุดปลอดภัยทิ้ง", "Omega: Final Omega glows in the middle and fires at two cardinals, ruling out a safe spot")])

sh = TRF + mf(MP, "M") + mf(FP, "F") + mf((67, 30), "M") + mf((33, 70), "F")
step(P5, OG, "② คู่ M/F คู่ที่ 2", "② The second M/F pair",
     "② คู่ Omega-M/F คู่ที่ 2 โผล่ที่ทิศเฉียงที่เหลือ ถืออาวุธแบบสุ่มอีกเช่นกัน",
     "② A second Omega-M/F pair appears at the remaining intercardinals, again with random weapons",
     strict=False, pic="05c/run_dynamis_omega_02.jpg", scene=board(sh, wm=True, boss=FO))

sh = m_shield(MP) + f_blades(FP, AXO) + [beam((50, 50), (2, 50), 26, "#e8f0ff", 0.4), beam((50, 50), (98, 50), 26, "#e8f0ff", 0.4)] + TRF + mf(MP, "M") + mf(FP, "F") + mf((67, 30), "M") + mf((33, 70), "F")
step(P5, OG, "③ ลำแสงตัดทิศหนึ่งทิ้ง: เหลือทิศเดียว", "③ The lights rule out one direction",
     "③ Omega Reconfigured ยิง Diffuse Wave Cannon ('ไฟ') ไป 2 ทิศหลักฝั่งตรงข้ามกัน ตัดจุดปลอดภัยไป 1 ใน 2 จุด\n"
     "ต้องหลบพร้อม AoE ของคู่ M/F คู่แรก\n"
     "ใช้ช่วงนี้หาจุดปลอดภัยถัดไป: จุดของชุดที่ 2 อยู่ห่างจากจุดแรก 90 องศาเสมอ (ดูว่าหมุนตามหรือทวนเข็ม และ ใกล้ / กลาง / ไกล)\n"
     "ตัวอย่าง: ลำแสงตัดทิศตะวันตก เหลือทิศเหนือใกล้กลาง",
     "③ Omega Reconfigured channels Diffuse Wave Cannon ('lights') at two opposite cardinals, ruling out one of the two safe directions\n"
     "This resolves with the first M/F pair's AoEs\n"
     "Use the time to find the next spot: the second set's safe spot is always 90 degrees from the first (decide clockwise or counter-clockwise, and near, mid or far)\n"
     "Example: the lights rule out west, leaving north near the middle",
     strict=["MT"], pic="05c/run_dynamis_omega_03.jpg", scene=board(sh, wm=True, boss=FO, roles=roles(MT=(50, 37))))

sh = m_sword((67, 30)) + f_staff((33, 70), ang((67, 30), (33, 70))) + [beam((50, 50), (50, 2), 26, "#e8f0ff", 0.4), beam((50, 50), (50, 98), 26, "#e8f0ff", 0.4)]
sh += TRF + mf((67, 30), "M") + mf((33, 70), "F") + [arrow((52, 37), (88, 46))]
step(P5, OG, "④ ชุดที่ 2: หมุน 90 องศา (ตัวอย่าง: ตามเข็ม ไปไกล)", "④ Second set: 90 degrees on (example: clockwise, far)",
     "④ Omega Reconfigured ยิงซ้ำที่อีก 2 ทิศหลัก ต้องหลบพร้อม AoE ของคู่ M/F คู่ที่ 2\n"
     "แนะนำ Sprint ถ้าต้องวิ่งออกจากหรือวิ่งไปจุดไกล\n"
     "ตัวอย่าง: ปาร์ตี้หมุนตามเข็ม 90 องศา ไปไกลจากกลาง",
     "④ Omega Reconfigured repeats this at the other two cardinals, resolving with the second M/F pair's AoEs\n"
     "Sprint is highly recommended when running from or to a far spot\n"
     "Example: the party rotates 90 degrees clockwise and goes far from the centre",
     strict=["MT"], pic="05c/run_dynamis_omega_04.jpg", scene=board(sh, wm=True, boss=FO, roles=roles(MT=(93, 48))))

O5 = dict(D1=(50, 4), H2=(50, 96), D2=(82, 33), D4=(82, 68), MT=(50, 73), H1=(38, 46), D3=(4, 40), ST=(4, 60))
sh = [rect((76, 50), 48, 100, 0, "#5fa8d6", 0.18)] + mf(FO, "M", "#c0c8d6")
step(P5, OG, "⑤ Hello, World ชุดแรก + monitor ของ Omega", "⑤ First Hello, World + Omega's monitors",
     "⑤ Omega แสดง monitor ชุดเดียว ฝั่งตะวันตกหรือตะวันออก ลงพร้อม Hello, World ชุดแรก\n"
     "monitor ของ Omega ให้ 2 คนที่มี Dynamis 2 stack รับ แต่:\n"
     "คนมี 2 stack และถือ Second in Line ต้องรับ monitor\n"
     "คนถือ First in Line รับ monitor ไม่ได้ (ต้องไปแก้ Hello, World ของตัวเอง)\n"
     "อีก 6 คนแก้ Hello, World\n\n"
     "ตัวอย่าง: H1, D2, D3, D4 มี 2 stack / D2 ถือ Second in Line ต้องรับ monitor / H1 ถือ First in Line รับไม่ได้ / D3 หรือ D4 คนใดคนหนึ่งรับเป็นคนที่ 2\n\n"
     "เข้าที่ครบแล้ว คนถือ Hello, Near World ขยับห่างคนถือ Hello, Distant World อีกนิด ให้กระโดดไปถูกคน\n"
     "เหมือนเดิม 2 คนนี้ยืนห่าง marker เข้าไปทางกลาง 1 วง",
     "⑤ Omega presents a single monitor set either west or east, resolved with the first Hello, World debuffs\n"
     "Omega's monitors are taken by two players with two Dynamis stacks, but:\n"
     "A player with two stacks and Second in Line must take them\n"
     "A player with First in Line cannot (they resolve their Hello, World instead)\n"
     "The other six resolve the Hello, World debuffs\n\n"
     "Example: H1, D2, D3 and D4 have two stacks / D2 has Second in Line and must take a monitor / H1 has First in Line and can't / either D3 or D4 takes the second\n\n"
     "Once everyone is set, the Hello, Near World player can step a little away from the Hello, Distant World player so Near World jumps correctly\n"
     "As before, these two stand one ring in front of the waymarks (towards the middle)",
     strict=False, pic="05c/run_dynamis_omega_05.jpg", scene=board(sh, wm=True, roles=roles(**O5)),
     refs=None)

sh = mf(FO, "M", "#c0c8d6") + aoe(O5["D2"], 11, "#e39ad0", 0.35) + aoe(O5["D4"], 11, "#e39ad0", 0.35)
sh += aoe(O5["H1"], 16, "#9fd87f", 0.33) + aoe(O5["D3"], 8, "#9fd87f", 0.35) + aoe(O5["ST"], 8, "#9fd87f", 0.35)
sh += aoe(O5["MT"], 16, "#7fb0e0", 0.33) + aoe(O5["D1"], 8, "#7fb0e0", 0.35) + aoe(O5["H2"], 8, "#7fb0e0", 0.35)
sh += [arrow((35, 45), (8, 41), GT, 0.5), arrow((5, 44), (5, 56), GT, 0.5), arrow((50, 69), (50, 8), "#5fb4ff", 0.5), arrow((50, 77), (50, 92), "#5fb4ff", 0.5)]
step(P5, OG, "⑥ Hello, World ลงพร้อม monitor", "⑥ Hello, World with the monitors",
     "⑥ Hello, World ลงพร้อม Oversampled Wave Cannon\n"
     "ทำถูกจะได้:\n"
     "2 คนมี Dynamis 3 stack (2 คนนี้ต้องไม่มี Hello, World ชุดที่ 2)\n"
     "อีก 6 คนมี 2 stack",
     "⑥ The Hello, World debuffs resolve with Oversampled Wave Cannon\n"
     "Done right:\n"
     "Two players have three Dynamis stacks (they should not have the second Hello, World debuffs)\n"
     "The other six all have two",
     strict=False, pic="05c/run_dynamis_omega_06.jpg", scene=board(sh, wm=True, roles=roles(**O5)))

BEO = (50, 1.5)
O7 = dict(H1=(27, 9), D3=(73, 9), MT=(3, 50), H2=(97, 50), ST=(70, 49), D2=(50, 73), D1=(43, 96), D4=(57, 96))
sh = bossmark(BEO, "Beetle") + [tether(BEO, O7["H1"]), tether(BEO, O7["D3"]), arrow((47, 73), (40, 73))]
step(P5, OG, "⑦ Hello, World ชุดที่ 2 + สายจาก Beetle", "⑦ Second Hello, World + Beetle's tethers",
     "⑦ Omega (Beetle) โผล่ที่ทิศหลักแบบสุ่ม โยงสาย 2 คน (สายแบบเดียวกับ P1)\n"
     "คนมี 3 stack: รับสาย ยืนข้าง Omega\n"
     "คนอื่น: แก้ Hello, World\n"
     "คนถือ Hello, Near World ขยับห่างคนถือ Hello, Distant World ได้ เพื่อให้กระโดดถูก\n"
     "คนถือ Hello, World ทั้ง 2 ยืนห่าง marker เข้าไปทางกลาง 1 วง",
     "⑦ Omega (Beetle) spawns at a random cardinal and tethers two players (the P1 tethers)\n"
     "Players with 3 stacks: take the tethers and stand beside Omega\n"
     "Everyone else: resolve Hello, World\n"
     "Again the Hello, Near World player can move away from the Hello, Distant World player so it jumps correctly\n"
     "Both Hello, World players stand one ring in front of the waymarks (towards the middle)",
     strict=False, pic="05c/run_dynamis_omega_07.jpg", scene=board(sh, wm=True, roles=roles(**O7)),
     refs=None)

sh = bossmark(BEO, "Beetle") + aoe(O7["H1"], 26, PINK, 0.3) + aoe(O7["D3"], 26, PINK, 0.3) + notch_marks(315, 330) + notch_marks(30, 45)
sh += [arrow((27, 12), (31, 21)), arrow((73, 12), (69, 21)), arrow((70, 52), (64, 56))]
step(P5, OG, "⑧ สายลง", "⑧ The tethers resolve",
     "⑧ สาย 2 เส้นลง\n"
     "คนถือสายกับคนถือ Hello, Distant World ขยับนิดหน่อยหลังสายลง ให้ Hello, Distant World กระโดดถูกคน",
     "⑧ The two tethers resolve\n"
     "The tether players and the Hello, Distant World player can adjust a little afterwards to be sure Distant World resolves correctly",
     strict=False, pic="05c/run_dynamis_omega_08.jpg", scene=board(sh, wm=True, roles=roles(**O7)))

O9 = dict(H1=(28, 18), D3=(72, 18), MT=(3, 52), H2=(97, 52), ST=(72, 51), D2=(42, 70), D1=(42, 96), D4=(58, 96))
sh = bossmark(BEO, "Beetle") + aoe(O9["ST"], 16, "#7fb0e0", 0.33) + aoe(O9["MT"], 8, "#7fb0e0", 0.35) + aoe(O9["H2"], 8, "#7fb0e0", 0.35)
sh += aoe(O9["D2"], 16, "#9fd87f", 0.33) + aoe(O9["D1"], 8, "#9fd87f", 0.35) + aoe(O9["D4"], 8, "#9fd87f", 0.35)
sh += [arrow((68, 51), (7, 52), "#5fb4ff", 0.5), arrow((6, 55), (93, 55), "#5fb4ff", 0.5), arrow((42, 74), (42, 91), GT, 0.5), arrow((45, 96), (55, 96), GT, 0.5)]
step(P5, OG, "⑨ Hello, World ลง: ทุกคนได้ 3 stack", "⑨ Hello, World resolves: everyone at 3 stacks",
     "⑨ ไม่นาน Hello, World ลง\n"
     "ตอนนี้ทุกคนควรมี Dynamis 3 stack\n\n"
     "จากนั้น Omega-F ใช้ Solar Ray อีกชุด แล้วร่าย Blind Faith\n"
     "เหมือน Blue Screen: ต้องตี Omega-F ให้ต่ำกว่า 20% ก่อน Blind Faith ร่ายเสร็จ จึงไปเฟสสุดท้ายได้",
     "⑨ Shortly after, the Hello, World debuffs resolve\n"
     "Everyone should now have three Dynamis stacks\n\n"
     "Omega-F then does one more set of Solar Ray tankbusters before casting Blind Faith\n"
     "Like Blue Screen, Omega-F must be under 20% by the end of Blind Faith's cast to reach the final phase",
     strict=False, pic="05c/run_dynamis_omega_09.jpg", scene=board(sh, wm=True, roles=roles(**O9)))

for west, pic, th, en in ((True, "05c/run_dynamis_omega_am1.jpg", "monitor หันตะวันตก", "monitors face west"),
                          (False, "05c/run_dynamis_omega_am2.jpg", "monitor หันตะวันออก", "monitors face east")):
    s = -1 if west else 1
    sh = [rect((50 + s * 26, 50), 48, 100, 0, "#5fa8d6", 0.15)] + mf(FO, "M", "#c0c8d6")
    sh += am_tok((50, 5), "ign", "1") + am_tok((50, 95), "ign", "2") + am_tok((50 + s * 30, 34), "atk", "1") + am_tok((50 + s * 30, 66), "atk", "2")
    sh += am_tok((50 - s * 21, 42), "tri") + am_tok((50 - s * 47, 42), "bind", "1") + am_tok((50 - s * 47, 58), "bind", "2") + am_tok((50 - s * 5, 72), "cross")
    sh += aoe((50 - s * 21, 42), 16, "#9fd87f", 0.25) + aoe((50 - s * 5, 72), 16, "#7fb0e0", 0.25)
    step(P5, OG, f"automarker ชุดแรก: {th}", f"First-set automarkers: {en}",
         "เหมือน Sigma: Elemental DC นิยมใช้ automarker กำหนดจุดของ Hello, Near World และ Hello, Distant World\n"
         "ชุดแรก (ตอน monitor) ยืนตามภาพ ตามทิศที่ monitor ของ Omega หัน\n"
         "ปกติคนติดมาร์ก '1' อยู่ฝั่งเหนือ แต่มีผลจริงแค่กับ 2 คนที่ยืนเหนือสุดและใต้สุด\n\n" + AMNOTE[0],
         "Like Sigma, Elemental DC normally uses automarkers for the Hello, Near World and Hello, Distant World positions\n"
         "First set (during monitors): stand as drawn, by which way Omega's monitors face\n"
         "Usually the players marked '1' are on the north side, but that only really matters for the two at the far north and south\n\n" + AMNOTE[1],
         strict=False, pic=pic, scene=board(sh, wm=True))

sh = bossmark(BEO, "Beetle") + aoe((28, 18), 26, PINK, 0.22) + aoe((72, 18), 26, PINK, 0.22)
sh += am_tok((28, 12), "atk", "1") + am_tok((72, 12), "atk", "2") + am_tok((5, 52), "ign", "1") + am_tok((95, 52), "ign", "2")
sh += am_tok((68, 52), "cross") + am_tok((38, 72), "tri") + am_tok((44, 95), "bind", "1") + am_tok((56, 95), "bind", "2")
sh += aoe((68, 52), 16, "#7fb0e0", 0.25) + aoe((38, 72), 16, "#9fd87f", 0.25) + notch_marks(315, 330) + notch_marks(30, 45)
step(P5, OG, "automarker ชุดที่ 2: ตอนสาย", "Second-set automarkers: the tethers",
     "ใช้ automarker อีกครั้งสำหรับ Hello, Near World และ Hello, Distant World ชุดสุดท้าย\n"
     "ชุดที่ 2 (ตอนสาย) ยืนตามภาพ ใครไปฝั่งตะวันออกหรือตะวันตกของตัวเองไม่สำคัญ\n\n" + AMNOTE[0],
     "Automarkers are used again for the last Hello, Near World and Hello, Distant World\n"
     "Second set (during the tethers): stand as drawn; who takes relative east or west doesn't matter\n\n" + AMNOTE[1],
     strict=False, pic="05c/run_dynamis_omega_am3.jpg", scene=board(sh, wm=True))
