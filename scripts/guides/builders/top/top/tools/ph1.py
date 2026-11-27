"""Setup and P1 (Beetle Omega), from Tuufless's Notes: elemental/top/ and 01_omega/."""
from core import step, FR, P0, P1
from scenes_top import *

# ================================================================== setup
wm_shapes = []
for k, v in WM.items():
    wm_shapes.append(ring(v, 3.4, "#ffd23f", 0.45, 0.9))
step(P0, "Waymarks", "Marker ที่ใช้ทั้งไฟต์", "The waymarks for the whole fight",
     "วาง marker ห่างจากกลางสนาม 13 yalm (สนามรัศมี 20 yalm):\n"
     "A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก\n"
     "1 ตะวันออกเฉียงเหนือ / 2 ตะวันออกเฉียงใต้ / 3 ตะวันตกเฉียงใต้ / 4 ตะวันตกเฉียงเหนือ\n"
     "ระวัง: ตัวเลขไม่เหมือน Extreme ทั่วไป ที่นี่ 1 อยู่ตะวันออกเฉียงเหนือ แล้ววนตามเข็มนาฬิกา\n\n"
     "marker ใช้ทำอะไรบ้าง:\n"
     "P2: เป็นขอบ AoE ของ Omega-F ใน Party Synergy และขอบลำแสงของ Optical Unit (ตาใหญ่)\n"
     "P3: เป็นแนวยืนตอน Oversampled Wave Cannon\n"
     "P5 Delta: เป็นขอบลำแสงของ Optical Unit และจุดยืน Hello, World\n"
     "P5 Sigma: วงแหวนบนพื้นก่อนถึง marker 1 วง คือระยะใกล้สุดของ Remote Glitch และเป็นจุดยืน Hello, World\n"
     "P5 Omega: บอกระยะ ใกล้ / กลาง / ไกล สำหรับหลบ AoE ของ Omega-M+F\n"
     "P6: เป็นขอบระหว่าง AoE ของ Cosmo Arrow และเป็นจุดวิ่งไปตอนเริ่ม Unlimited Wave Cannon",
     "Waymarks 13 yalms from the centre (the arena has a 20-yalm radius):\n"
     "A north / B east / C south / D west\n"
     "1 north-east / 2 south-east / 3 south-west / 4 north-west\n"
     "Careful: the numbers differ from most Extremes; here 1 is north-east and they run clockwise\n\n"
     "What the waymarks are for:\n"
     "P2: the edge of Omega-F's AoE in Party Synergy and of the Optical Unit's (the giant eye) laser\n"
     "P3: guidelines for where to stand in Oversampled Wave Cannon\n"
     "P5 Delta: the edge of the Optical Unit's laser, and where to stand for Hello, World\n"
     "P5 Sigma: one floor ring in front of the waymarks is as close as Remote Glitch allows, and where Hello, World stands\n"
     "P5 Omega: near / middle / far for dodging Omega-M+F's AoEs\n"
     "P6: the boundary between Cosmo Arrow's AoEs, and where to run at the start of Unlimited Wave Cannon",
     strict=False, pic="markers.jpg", scene=board(wm_shapes, wm=True))

step(P0, "Overview", "แผนของ Elemental PF ทีละเฟส", "Elemental PF's plan, phase by phase",
     "แผนนี้คือแผน PF ของ Elemental DC ตาม Tuufless's Notes:\n"
     "P1 Beetle Omega: ลำดับ H1 > MT > ST > D1 > D2 > D3 > D4 > H2 / Pantokrator เริ่ม ตก.เฉียงเหนือ กับ ตอ.เฉียงใต้\n"
     "P2 Omega-M/F: เรียง 1234 (วงกลม กากบาท สามเหลี่ยม สี่เหลี่ยม) แล้ว 4231\n"
     "P3 Final Omega: monitor แบบ Astoh\n"
     "P4 Blue Screen: เรียง Tank > Range > Healer > Melee / Melee เป็นคนปรับ\n"
     "P5 Run: Dynamis: Delta แบบ Kinda Awk / Sigma tower ตาม marker / Omega\n"
     "P6 Alpha Omega: spread แบบหน้าปัดนาฬิกา / Wave Cannon stack ฝั่งตะวันออก\n\n"
     "ใน PF ของ Elemental นิยมใช้ automarker (ติดมาร์กอัตโนมัติ) ตอนเข้า P3 และจุดยืนใน Delta / Sigma / Omega ใช้เองตามความเสี่ยง\n\n"
     "เกียร์: ของ i760 ขึ้นไป substat ถูกจำกัดเท่ากันหมด / อาวุธ Relic substat สูงสุด 287 / ใช้อาหารและยาที่ดีที่สุดที่มี\n\n"
     "debuff Damage Down ในไฟต์นี้ทำให้ damage ที่เราทำหายไป 90% (แย่กว่า weakness 2 ชั้น)",
     "This is Elemental DC's PF plan, as Tuufless's Notes lays it out:\n"
     "P1 Beetle Omega: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 priority / Pantokrator starting NW and SE\n"
     "P2 Omega-M/F: 1234 (circle, cross, triangle, square), then 4231\n"
     "P3 Final Omega: Astoh's monitors\n"
     "P4 Blue Screen: Tank > Range > Healer > Melee, melee adjust\n"
     "P5 Run: Dynamis: Delta the Kinda Awk way / Sigma towers by waymark / Omega\n"
     "P6 Alpha Omega: clock spread / Wave Cannon stack east\n\n"
     "Elemental PF normally uses automarkers for the P3 transition and the positions in Delta / Sigma / Omega (use at your own risk)\n\n"
     "Gear: anything at or above i760 has its substats capped / relic weapons cap at 287 / use the best food and potions\n\n"
     "Damage Down in this fight cuts your damage by 90% (worse than double weakness)",
     strict=False)

step(P0, "Mitigation", "ชื่อย่อ mitigate ในคู่มือนี้", "The mitigation shorthand used here",
     "คู่มือนี้เรียก mitigate ตามที่ Tuufless ใช้:\n"
     "MT 90s / ST 90s: Shake It Off, Dark Missionary, Heart of Light, Divine Veil\n"
     "H1 120s: Temperance, Neutral Sect\n"
     "H1 180s: Liturgy of the Bell, Macrocosmos\n"
     "H2 30s: Sacred Soil, Kerachole\n"
     "H2 90s: Deployment Tactics, Zoe\n"
     "H2 120s: Expedient, Holos\n"
     "D1, D2: Feint\n"
     "D3: Troubadour, Tactician, Shield Samba\n"
     "D4: Addle\n"
     "Reprisal: ของ Tank คนนั้น\n\n"
     "mitigate ส่วนตัวของ Tank:\n"
     "30%: Vengeance, Shadow Wall, Nebula, Sentinel\n"
     "3rd: Thrill of Battle, Oblation, Camouflage, Bulwark\n"
     "short: Bloodwhetting / Nascent Flash, The Blackest Night, Heart of Corundum, Sheltron / Intervention\n\n"
     "ของเสริมที่ไม่ได้มีทุกปาร์ตี้: Passage of Arms, Fey Illumination, Collective Unconsciousness, Consolation, Panhaima, Dismantle, Improvisation, Magick Barrier\n"
     "แผนนี้เป็นโครงขั้นต่ำ Healer ควรเสริมด้วย mitigate อื่นที่มี",
     "This guide names mitigation the way Tuufless does:\n"
     "MT 90s / ST 90s: Shake It Off, Dark Missionary, Heart of Light, Divine Veil\n"
     "H1 120s: Temperance, Neutral Sect\n"
     "H1 180s: Liturgy of the Bell, Macrocosmos\n"
     "H2 30s: Sacred Soil, Kerachole\n"
     "H2 90s: Deployment Tactics, Zoe\n"
     "H2 120s: Expedient, Holos\n"
     "D1, D2: Feint\n"
     "D3: Troubadour, Tactician, Shield Samba\n"
     "D4: Addle\n"
     "Reprisal: that tank's own\n\n"
     "Tank personal mitigation:\n"
     "30%: Vengeance, Shadow Wall, Nebula, Sentinel\n"
     "3rd: Thrill of Battle, Oblation, Camouflage, Bulwark\n"
     "short: Bloodwhetting / Nascent Flash, The Blackest Night, Heart of Corundum, Sheltron / Intervention\n\n"
     "Extras not every party has: Passage of Arms, Fey Illumination, Collective Unconsciousness, Consolation, Panhaima, Dismantle, Improvisation, Magick Barrier\n"
     "This is a bare-bones framework; healers should add whatever else they have",
     strict=False)

# ================================================================== P1 Beetle Omega
BOSS = (50, 50)
TR_PL = target_ring(BOSS, 26.5, face=141, gap=95)   # program loop: Omega faced south-east-ish
PL = "Program Loop"

# the setup picture: eight tower spots and the priority circle
spots = [(42.5, 22.2), (57.5, 22.2), (22.5, 42.5), (22.5, 57.5), (77.5, 42.5), (77.5, 57.5), (42.5, 77.8), (57.5, 77.8)]
live = [True, False, False, True, True, False, False, True]
sh = []
for c, lv in zip(spots, live):
    sh += tower(c, 7.3, lv)
ga = [P_around(BOSS, a, 18.8) for a in range(330, 330 + 341, 12)]
for p, q in zip(ga, ga[1:]):
    sh.append(line(p, q, "#3df06a", 0.8, 0.95))
sh += [line((19.5, 19.5), BOSS, "#2fbf4f", 0.35, 0.9), arrow((37.2, 52.0), (35.6, 41.2), "#3df06a", 0.8)]
step(P1, PL, "ภาพรวม: tower 1>2>3>4 สาย 3>4>1>2", "Overview: towers 1>2>3>4, tethers 3>4>1>2",
     "ทุกคนได้ debuff ตัวเลข 1 / 2 / 3 / 4 เลขละ 2 คน\n"
     "ตัวเลขคือลำดับรับ tower: 1 > 2 > 3 > 4\n"
     "สาย (tether) รับห่างจาก tower 2 จังหวะ: 3 > 4 > 1 > 2\n\n"
     "สายระเบิดเป็น AoE ใหญ่ ติด Twice-come Ruin 1 stack และ HP Penalty (HP สูงสุดเหลือ 1%)\n"
     "HP Penalty หายภายใน 2 จังหวะ: เลข 3 กับ 4 ต้องได้ heal ให้เต็มก่อนเข้า tower\n\n"
     "tower มีจุดเกิด 8 จุด เกิดทีละ 2 อัน ห่างกัน 90 หรือ 180 องศา และไม่เกิดที่เดิมซ้ำติดกัน\n"
     "ลำดับเลือก tower และที่ว่างสำหรับพาสายไป: เริ่มทิศตะวันตกเฉียงเหนือ วนตามเข็มนาฬิกา\n"
     "H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n\n"
     "จำง่าย: สลับกัน 'ว่าง' กับ 'ทำงาน' (รับ tower หรือรับสาย)\n"
     "ลืมว่าตาตัวเองรับอะไร: ถ้า debuff ตัวเลขยังอยู่ = รับ tower\n"
     "หรือดู HP: HP เต็ม = เคยรับ tower แล้ว ตานี้รับสาย / HP ต่ำ = เคยรับสายแล้ว (HP Penalty เพิ่งหาย) ตานี้รับ tower",
     "Everyone gets a number debuff, 1 / 2 / 3 / 4, two players each\n"
     "The number is your tower order: 1 > 2 > 3 > 4\n"
     "Tethers are taken two steps after the towers: 3 > 4 > 1 > 2\n\n"
     "A tether explodes in a big AoE that leaves one stack of Twice-come Ruin and HP Penalty (max HP down to 1%)\n"
     "HP Penalty wears off within two steps: 3s and 4s must be healed to full before their towers\n\n"
     "Towers have 8 spawn points, two at a time, 90 or 180 degrees apart, never the same spot twice in a row\n"
     "Priority for picking a tower, or an empty spot to take a tether to: from north-west, clockwise\n"
     "H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n\n"
     "Rule of thumb: you alternate between 'nothing' and 'something' (a tower or a tether)\n"
     "Forgot which? If your number debuff is still there, it is a tower\n"
     "Or look at your HP: high = you took a tower, now a tether / low = you took a tether (HP Penalty just wore off), now a tower",
     strict=False, pic="01/program_loop_setup.jpg",
     scene=board(sh, wm=False, roles=roles(H1=(50.2, 36), MT=(58.6, 38.9), ST=(63.3, 46.7), D1=(62.5, 55.8), D2=(55.9, 62),
                                         D3=(46.9, 63.1), D4=(39.4, 58.4), H2=(36.3, 49.8))),
     refs=[FR("program-loop", "nin", 47, "Program Loop: วงใต้เท้าคือ tower / เส้นประจากบอสคือสาย", "Program Loop: the circle under your feet is a tower / the dashed line from the boss is a tether")])

step(P1, PL, "① ดึงบอสมากลาง เลข 3 ยืนหน้าสุด", "① Boss to the middle, 3s in front",
     "① ดึง Omega มากลางสนาม\n"
     "Tank บางคนหันบอสไปทางใต้ บางคนหันเฉียง 45 องศา (หันเฉียงทำให้ Melee ตีได้ทั้งด้านหลังและด้านข้างจาก tower ครึ่งหนึ่ง)\n\n"
     "Omega ร่าย Program Loop ให้ debuff ตัวเลขทุกคน\n"
     "เลข 3: ยืนหน้ากลุ่ม เพื่อรับสาย\n"
     "คนอื่น: ยืนรวมกัน ให้สายไปหาเลข 3 ได้ง่าย\n\n"
     "ตัวอย่างในภาพ: เลข 1 = H1, MT / เลข 2 = D2, D3 / เลข 3 = D1, H2 / เลข 4 = ST, D4",
     "① Pull Omega to the middle\n"
     "Some tanks face it south, some at 45 degrees (that lets melee get rear and flank from half the tower spots)\n\n"
     "Omega casts Program Loop: everyone gets a number\n"
     "3s: stand in front of the group to take the tethers\n"
     "Everyone else: stack together so the tethers are easy to get\n\n"
     "In the example: 1s = H1, MT / 2s = D2, D3 / 3s = D1, H2 / 4s = ST, D4",
     strict=False, pic="01/program_loop_01.jpg",
     scene=board(TR_PL, wm=False, boss=BOSS, roles=roles(D1=(47.5, 58.8), H2=(51.5, 57.8), H1=(51.5, 72), ST=(51.5, 75.5), D2=(49.0, 78.5),
                                                        D3=(53.5, 78.5), D4=(56.5, 75.5), MT=(73.5, 75.5))))

sh = TR_PL + tower((42.5, 22.2), 7.3, False) + tower((22.5, 57.5), 7.3, False) + [tether(BOSS, (51.5, 56.5)), tether(BOSS, (48, 57.5))]
step(P1, PL, "② tower ชุดแรก: เลข 1 รับ tower เลข 3 พาสาย", "② First towers: 1s tower, 3s take tethers",
     "② tower ชุดแรกเกิด\n"
     "เลข 3 ยืนอยู่หน้าสุดอยู่แล้ว จึงรับสายไว้ได้\n"
     "เลข 1: เข้า tower ตามลำดับ H1 > MT > ST > D1 > D2 > D3 > D4 > H2 (เริ่ม ตก.เฉียงเหนือ ตามเข็ม)\n"
     "เลข 3: พาสายไปจุดที่ว่าง ตามลำดับเดียวกัน",
     "② The first towers spawn\n"
     "The 3s are already in front, so they catch the tethers\n"
     "1s: take the towers by the priority H1 > MT > ST > D1 > D2 > D3 > D4 > H2 (from north-west, clockwise)\n"
     "3s: take the tethers to an empty spot, by the same priority",
     strict=False, pic="01/program_loop_02.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(D1=(48, 57.5), H2=(51.5, 56.5), H1=(51.5, 72), ST=(51.5, 75.5), D2=(49.0, 78.5),
                                                     D3=(53.5, 78.5), D4=(56.5, 75.5), MT=(73.5, 75.5))))

sh = (TR_PL + aoe((79, 43), 26, PINK, 0.3) + aoe((59, 83), 26, PINK, 0.3) + tower((42.5, 22.2), 7.3) + tower((22.5, 57.5), 7.3)
      + tower((22.5, 42.5), 7.3, False) + tower((77.5, 57.5), 7.3, False)
      + [tether(BOSS, (82, 43)), tether(BOSS, (59.5, 82)), arrow((32, 46), (55, 58)), arrow((30, 38), (55, 44))])
step(P1, PL, "③ ชุดแรกลง: เลข 4 ไปรับสาย", "③ First set goes off: 4s take tethers",
     "③ tower กับสายชุดแรกลง\n"
     "tower ชุดที่ 2 เกิด\n"
     "เลข 4: เข้าไปรับสายตามลำดับ (ดูลูกศร)",
     "③ The first towers and tethers resolve\n"
     "The second towers spawn\n"
     "4s: go and take the tethers, by the priority (the arrows)",
     strict=False, pic="01/program_loop_03.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(H1=(42.5, 22.2), MT=(22.5, 58), D1=(82, 43), H2=(59.5, 82), D2=(28.5, 39), D4=(31.5, 41.5),
                                                     ST=(36.5, 38.5), D3=(29, 36.5))))

sh = TR_PL + tower((22.5, 42.5), 7.3) + tower((77.5, 57.5), 7.3) + [tether(BOSS, (53, 15)), tether(BOSS, (41.5, 85))]
step(P1, PL, "④ tower ชุดที่ 2: เลข 2 รับ tower เลข 4 พาสาย", "④ Second towers: 2s tower, 4s tether",
     "④ เข้าที่สำหรับ tower ชุดที่ 2\n"
     "เลข 2: เข้า tower ตามลำดับ\n"
     "เลข 4: พาสายไปจุดที่ว่าง ตามลำดับ\n"
     "เลข 1 กับเลข 3 (มี HP Penalty) หลบออกห่าง",
     "④ Get set for the second towers\n"
     "2s: take the towers by the priority\n"
     "4s: take the tethers to an empty spot, by the priority\n"
     "1s and 3s (with HP Penalty) keep clear",
     strict=False, pic="01/program_loop_04.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(ST=(53, 15), D4=(41.5, 85), D3=(22.5, 42.5), D2=(77.5, 57.5), H2=(12, 33.5),
                                                     MT=(14, 49.5), D1=(82.5, 44.5), H1=(88, 50))))

sh = (TR_PL + aoe((57, 18), 26, PINK, 0.3) + aoe((42, 83), 26, PINK, 0.3) + tower((22.5, 42.5), 7.3) + tower((77.5, 57.5), 7.3)
      + tower((57.5, 22.2), 7.3, False) + tower((42.5, 77.8), 7.3, False)
      + [tether(BOSS, (53, 15)), tether(BOSS, (41.5, 85)), arrow((17, 52), (44, 58)), arrow((86, 52), (54, 42))])
step(P1, PL, "⑤ ชุดที่ 2 ลง: เลข 1 ไปรับสาย", "⑤ Second set goes off: 1s take tethers",
     "⑤ tower กับสายชุดที่ 2 ลง\n"
     "tower ชุดที่ 3 เกิด\n"
     "เลข 1: เข้าไปรับสายตามลำดับ\n"
     "HP Penalty ของเลข 3 หายแล้ว",
     "⑤ The second towers and tethers resolve\n"
     "The third towers spawn\n"
     "1s: take the tethers, by the priority\n"
     "The 3s' HP Penalty wears off",
     strict=False, pic="01/program_loop_05.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(ST=(53, 15), D4=(41.5, 85), D3=(22.5, 42.5), D2=(77.5, 57.5), H2=(12, 33.5),
                                                     MT=(14, 49.5), D1=(82.5, 44.5), H1=(88, 50))))

sh = TR_PL + tower((57.5, 22.2), 7.3) + tower((40.5, 77.8), 7.3) + [tether((15, 42.5), (83, 57.5))]
step(P1, PL, "⑥ tower ชุดที่ 3: เลข 3 รับ tower เลข 1 พาสาย", "⑥ Third towers: 3s tower, 1s tether",
     "⑥ เข้าที่สำหรับ tower ชุดที่ 3\n"
     "เลข 1: พาสายไปจุดที่ว่าง ตามลำดับ\n"
     "เลข 3: เข้า tower ตามลำดับ\n"
     "Healer: heal เลข 3 ให้เต็มก่อน tower ลง ไม่อย่างนั้นรอดไม่ได้",
     "⑥ Get set for the third towers\n"
     "1s: take the tethers to an empty spot, by the priority\n"
     "3s: take the towers by the priority\n"
     "Healers: heal the 3s up, or they won't survive their towers",
     strict=False, pic="01/program_loop_06.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(D1=(57.5, 22.2), H2=(40.5, 77.8), MT=(15, 42.5), H1=(83, 57.5), D2=(48, 18.5),
                                                     D3=(31, 86.5), D4=(37.5, 89), ST=(52.5, 83.5))))

sh = (TR_PL + aoe((23, 41), 27, PINK, 0.3) + aoe((79, 63), 27, PINK, 0.3) + tower((57.5, 22.2), 7.3) + tower((40.5, 77.8), 7.3)
      + tower((77.5, 42.5), 7.3, False) + tower((57.5, 77.8), 7.3, False)
      + [tether((15, 42.5), (83, 57.5)), arrow((51, 22), (65, 47)), arrow((30, 84), (37, 54))])
step(P1, PL, "⑦ ชุดที่ 3 ลง: เลข 2 ไปรับสาย", "⑦ Third set goes off: 2s take tethers",
     "⑦ tower กับสายชุดที่ 3 ลง\n"
     "tower ชุดสุดท้ายเกิด\n"
     "เลข 2: เข้าไปรับสายตามลำดับ\n"
     "HP Penalty ของเลข 4 หายแล้ว",
     "⑦ The third towers and tethers resolve\n"
     "The fourth towers spawn\n"
     "2s: take the tethers, by the priority\n"
     "The 4s' HP Penalty wears off",
     strict=False, pic="01/program_loop_07.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(D1=(57.5, 22.2), H2=(40.5, 77.8), MT=(15, 42.5), H1=(83, 57.5), D2=(48, 18.5),
                                                     D3=(31, 86.5), D4=(37.5, 89), ST=(52.5, 83.5))))

sh = TR_PL + tower((77.5, 42.5), 7.3) + tower((57.5, 77.8), 7.3) + [tether(BOSS, (41.5, 15)), tether(BOSS, (15, 58.5))]
step(P1, PL, "⑧ tower ชุดสุดท้าย: เลข 4 รับ tower เลข 2 พาสาย", "⑧ Last towers: 4s tower, 2s tether",
     "⑧ เข้าที่สำหรับ tower ชุดสุดท้าย\n"
     "เลข 2: พาสายไปจุดที่ว่าง ตามลำดับ\n"
     "เลข 4: เข้า tower ตามลำดับ\n"
     "Healer: heal เลข 4 ให้เต็มก่อน tower ลง",
     "⑧ Get set for the last towers\n"
     "2s: take the tethers to an empty spot, by the priority\n"
     "4s: take the towers by the priority\n"
     "Healers: heal the 4s up before the towers go off",
     strict=False, pic="01/program_loop_08.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(ST=(77.5, 42.5), D4=(57.5, 77.8), D2=(41.5, 15), D3=(15, 58.5), D1=(70.5, 57.5),
                                                     H1=(78, 56.5), H2=(65.5, 62.5), MT=(72.5, 64.5))))

sh = (TR_PL + aoe((41.5, 16), 27, PINK, 0.3) + aoe((15, 58.5), 27, PINK, 0.3) + tower((77.5, 42.5), 7.3) + tower((57.5, 77.8), 7.3)
      + [tether(BOSS, (41.5, 15)), tether(BOSS, (15, 58.5))])
step(P1, PL, "⑨ ชุดสุดท้ายลง", "⑨ The last set goes off",
     "⑨ tower กับสายชุดสุดท้ายลง\n"
     "หลัง tower ชุดที่ 4: พอ HP Penalty ชุดสุดท้ายหาย heal ทุกคนให้เต็ม เตรียมรับ Mechanic ถัดไปของ Omega",
     "⑨ The fourth towers and tethers resolve\n"
     "After the fourth towers, top the party up as the last HP Penalties wear off, ready for Omega's next mechanic",
     strict=False, pic="01/program_loop_09.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(ST=(77.5, 42.5), D4=(57.5, 77.8), D2=(41.5, 15), D3=(15, 58.5), D1=(70.5, 57.5),
                                                     H1=(78, 56.5), H2=(65.5, 62.5), MT=(72.5, 64.5))))

# ---------------------------------------------------------------- Pantokrator
PK = "Pantokrator"
TR_N = target_ring(BOSS, 28, face=0, gap=95)
step(P1, PK, "① หันบอสไปทางเหนือ", "① Face Omega north",
     "PF ใช้แผน Pantokrator ของ HaruGlory: ลำแสง (beam) รับด้านหลังกลุ่ม ขีปนาวุธ (missile) รับด้านหน้า\n\n"
     "① Tank หัน Omega ไปทางเหนือ\n"
     "คนอื่นยืนใกล้กลางสนาม พร้อมขยับ\n\n"
     "mitigate: ใช้ party mitigation ได้ตั้งแต่ Condensed Wave ลูกที่ 2 (แต่ละลูกห่าง 6 วินาที จึงคลุมได้อย่างน้อย 3 ลูก)\n"
     "MT Reprisal ที่ลูกที่ 1 (คลุมลูกที่ 2 ด้วย) / ST Reprisal ที่ลูกที่ 3 (คลุมลูกที่ 4)",
     "PF uses HaruGlory's Pantokrator: the beam is taken at the back, the missile in front\n\n"
     "① The tank faces Omega north\n"
     "Everyone else stays near the middle, ready to adjust\n\n"
     "Mitigation: party mitigation any time by the second Condensed Wave (6 seconds apart, so each covers at least three)\n"
     "MT Reprisal at the first (it covers the second) / ST Reprisal at the third (covers the fourth)",
     strict=["MT"], pic="01/pantokrator_01.jpg", says={"MT": "หัน Omega ไปทางเหนือ"}, says_en={"MT": "Face Omega north"},
     scene=board(TR_N, wm=False, boss=BOSS, roles=roles(MT=(50, 24.5), H1=(41, 42), D1=(44, 42.5), H2=(55, 51), ST=(57, 51.5))))

sh = [cone(BOSS, 60, 60, AR, PINK, 0.4), cone(BOSS, 240, 60, AR, PINK, 0.4)] + TR_N
sh += pl((34.5, 24.5), "3") + pl((36, 27.5), "4") + pl((33, 27.5), "2") + pl((45, 42), "1") + pl((55, 60), "1") + pl((63.5, 73.5), "2") + pl((66, 71.5), "4") + pl((64, 76), "3")
sh += [line(P(315, 21.5), P(135, 21.5), "#3df06a", 0.3, 0.9, dash=True)]
step(P1, PK, "② แบ่งกลุ่ม ตก.เฉียงเหนือ / ตอ.เฉียงใต้", "② Split NW / SE",
     "② ทุกคนได้ตัวเลข 1-4 อีกครั้ง เลขละ 2 คน\n"
     "แบ่งเป็น 2 กลุ่ม กลุ่มละ 4 คน: กลุ่มหนึ่งยึด ตก.เฉียงเหนือ อีกกลุ่มยึด ตอ.เฉียงใต้\n"
     "แต่ละกลุ่มต้องมีครบเลข 1-4 และมี Healer 1 คน\n\n"
     "ลำดับ: ตก.เฉียงเหนือ H1 > MT > ST > D1 > D2 > D3 > D4 > H2 ตอ.เฉียงใต้\n"
     "เลขเดียวกัน: คนที่มาก่อนในลำดับไป ตก.เฉียงเหนือ อีกคนไป ตอ.เฉียงใต้\n\n"
     "ทำไมใช้ทิศเฉียง: Flamethrower เป็นกรวย 60 องศา หมุนทีละ 30 องศา ตามทิศที่บอสหัน\n"
     "บอสหันเหนือแล้วยืนเฉียง 45 องศา จะไม่มีวันเจอกรณีที่กรวยกินครึ่งๆ กลางๆ จนไม่รู้ว่าโดนหรือไม่",
     "② Everyone is numbered 1-4 again, two each\n"
     "Split into two groups of four: one works from north-west, the other from south-east\n"
     "Each group needs one of each number and one healer\n\n"
     "Priority: NW H1 > MT > ST > D1 > D2 > D3 > D4 > H2 SE\n"
     "Same number: whoever comes first goes north-west, the other south-east\n\n"
     "Why the diagonals: the Flamethrowers are 60-degree cones moving in steps of 30, based on where Omega faces\n"
     "With Omega facing north and the groups 45 degrees off, a cone can never half-cover a group and leave it unclear",
     strict=False, pic="01/pantokrator_03.jpg", scene=board(sh, wm=False, boss=BOSS))

def grp(c, nums="1234", d=2.6):
    offs = [(-d / 2, -d / 2), (d / 2, -d / 2), (-d / 2, d / 2), (d / 2, d / 2)]
    out = []
    for (dx, dy), n in zip(offs, nums):
        out += pl((c[0] + dx * 1.6, c[1] + dy * 1.6), n, r=2.1, size=2.3)
    return out

sh = [cone(BOSS, 90, 60, AR, PINK, 0.4), cone(BOSS, 270, 60, AR, PINK, 0.4)] + TR_N + grp((32, 28)) + grp((68, 72))
sh += [line(P(315, 21.5), P(135, 21.5), "#3df06a", 0.3, 0.9, dash=True)]
step(P1, PK, "③ กรวยแรกไม่โดน: เริ่มที่ ตก.เฉียงเหนือ / ตอ.เฉียงใต้", "③ First cone misses: start NW / SE",
     "Flamethrower ชุดแรกแสดงทิศให้เห็น\n"
     "ถ้าไม่โดนจุด ตก.เฉียงเหนือ กับ ตอ.เฉียงใต้: เริ่มตรงนั้นเลย (ภาพ)\n"
     "ถ้าโดน: ทั้งสองกลุ่มหมุนตามเข็มนาฬิกาไปช่องปลอดภัยถัดไป (ขั้นถัดไป)\n"
     "ช่องที่ได้คือช่องเริ่มของแต่ละกลุ่ม",
     "The first Flamethrowers show their direction\n"
     "If they miss the north-west and south-east points, start there (the picture)\n"
     "If they hit them, both groups rotate clockwise to the next safe sector (next step)\n"
     "That is each group's starting sector",
     strict=False, pic="01/pantokrator_02a.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 300, 60, AR, PINK, 0.4), cone(BOSS, 120, 60, AR, PINK, 0.4)] + TR_N + grp((32, 28)) + grp((68, 72))
sh += [line(P(315, 21.5), P(135, 21.5), "#3df06a", 0.3, 0.9, dash=True), arrow((36, 22), (46, 18)), arrow((64, 80), (54, 83))]
step(P1, PK, "③ กรวยแรกโดน: หมุนตามเข็มไปช่องปลอดภัย", "③ First cone hits: rotate clockwise",
     "ตัวอย่าง: Flamethrower ชุดแรกโดนจุด ตก.เฉียงเหนือ กับ ตอ.เฉียงใต้\n"
     "ทั้งสองกลุ่มหมุนตามเข็มนาฬิกาจนถึงช่องที่ปลอดภัย แล้วเริ่มจากช่องนั้น",
     "Example: the first Flamethrowers hit the north-west and south-east points\n"
     "Both groups rotate clockwise until they reach a safe sector, and start from there",
     strict=False, pic="01/pantokrator_02b.jpg", scene=board(sh, wm=False, boss=BOSS))

# the missile player's path, drawn in the east sector
sh = [cone(BOSS, 20, 60, AR, PINK, 0.4)] + TR_N + [beam(BOSS, (61, 86), 9, "#cfe6ff", 0.35)]
sh += aoe((63.5, 74), 10, "#ffb38a", 0.5) + aoe((66.5, 31), 10, "#ff9f8f", 0.45) + grp((63.5, 74))
path = [(63.5, 74), (73.5, 61), (56.5, 52), (66.5, 31), (89, 37)]
for i, (p, q) in enumerate(zip(path, path[1:])):
    sh.append(arrow(towards(p, q, 0.12), towards(p, q, 0.86), "#ffe23a", 0.6))
for i, p in enumerate(path):
    sh += [dot(p, 2.6, "#2b2f36"), text(p, str(i + 1), 2.8, "#d9ffd0")]
step(P1, PK, "การเดินของคนรับ missile", "How the missile player moves",
     "แต่ละกลุ่มเดินสลับ (stagger-step) ไปข้างหน้า ส่วนคนที่จะรับ missile ลูกถัดไปแยกออกจากกลุ่ม\n"
     "ทางเดินของคนรับ missile ลูกถัดไป:\n"
     "1. Wave Cannon (beam) ลง\n"
     "2. ทุกคนเดินหน้าไปพร้อมกัน 1 AoE\n"
     "3. ทิ้ง AoE ถัดไปไว้กลางสนาม\n"
     "4. ทิ้ง AoE ถัดไปไว้ด้านหน้าช่อง (beam กับ missile รอบถัดไปลงตรงนี้)\n"
     "5. ทิ้ง AoE ถัดไปถอยหลังและออกด้านนอก\n"
     "6. กลับเข้ากลุ่ม มีเวลาอีก 1 AoE ก่อน beam กับ missile รอบถัดไปลง\n\n"
     "ทุกคนต้องเดินแบบเดียวกัน: แผนนี้อยู่กับกลุ่มอีก 1 AoE หลัง Wave Cannon แล้วค่อยแยกไปข้างหน้า (ทางช้า)\n"
     "มีทางเร็วที่แยกทันทีตอน Wave Cannon ลง ถ้าคนหนึ่งเดินทางช้าแล้วคนถัดไปเดินทางเร็ว AoE ของคนหน้ายังไม่ลงตอนคนถัดไปจะเข้าจุด จะโดน AoE ทิ้งใส่หน้า\n"
     "(กลุ่มของ HaruGlory เองก็เปลี่ยนมาใช้ทางช้า)",
     "Each light party stagger-steps forward while the next missile player breaks away\n"
     "The next missile player's path:\n"
     "1. Wave Cannon (the beam) hits\n"
     "2. Everybody moves forward for one AoE\n"
     "3. Drop the next AoE in the middle\n"
     "4. Drop the next AoE at the front (the next beam + missile resolve here)\n"
     "5. Drop the next AoE back and out\n"
     "6. Rejoin; you have one more AoE before the next beam + missile\n\n"
     "Everyone must move the same way: this plan stays with the group for one AoE after the Wave Cannon before breaking away (the slow path)\n"
     "There is a faster path that breaks away as the Wave Cannon hits; if one player goes slow and the next goes fast, the front AoE hasn't gone off when the next player arrives and someone gets an AoE dropped on them\n"
     "(HaruGlory's group also moved to the slow path)",
     strict=False, pic="01/pantokrator_movement.jpg", scene=board(sh, wm=False, boss=BOSS),
     refs=[FR("pantokrator", "nin", 80, "Pantokrator: กรวยไฟสีส้มหมุนรอบบอส อยู่ในช่องปลอดภัยของกลุ่มตัวเอง", "Pantokrator: the orange flame cones turn around Omega; stay in your group's safe sector")])

sh = [cone(BOSS, 60, 60, AR, PINK, 0.4), cone(BOSS, 240, 60, AR, PINK, 0.4)] + TR_N
sh += grp((34.5, 26), "2341") + pl((45, 42), "1") + pl((55, 60), "1") + grp((64, 74), "2341")
step(P1, PK, "④ ตัวเลขขึ้น: แยกกลุ่ม เลข 1 อยู่ใกล้กลาง", "④ Numbers up: split, 1s near the middle",
     "(ขั้นที่ 6 ของต้นทาง)\n"
     "ตัวเลขขึ้นพร้อมกรวยไฟชุดแรก\n"
     "แยกเป็น 2 กลุ่ม ไปกลางช่องที่ปลอดภัยของกลุ่มตัวเอง\n"
     "เลข 1: อยู่ใกล้กลางสนาม",
     "(Step 6 in the source)\n"
     "The numbers come up with the first flame telegraphs\n"
     "Split into the two groups and go to the middle of your safe sector\n"
     "1s: stay near the middle of the arena",
     strict=False, pic="01/pantokrator_03.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 30, 60, AR, PINK, 0.4), cone(BOSS, 210, 60, AR, PINK, 0.4)] + TR_N
sh += grp((41, 21), "2341") + pl((44, 38), "1") + pl((55, 58), "1") + grp((55, 76), "2341")
sh += [arrow((44, 42), (31, 57)), arrow((57, 56), (72, 41)), arrow((32, 30), (39, 24)), arrow((68, 70), (60, 74)),
       arrow((82, 30), (61, 15), "#ffc0c0", 0.9), arrow((22, 70), (40, 87), "#ffc0c0", 0.9)]
step(P1, PK, "⑤ กรวยเริ่มหมุน: เลข 1 ไปหน้าช่อง", "⑤ The cones turn: 1s to the front",
     "⑦ กรวยไฟเริ่มหมุน\n"
     "เลข 1: ไปด้านหน้าของช่อง (หลัง AoE ด้านหน้า)\n"
     "คนอื่นขยับไปอีกทาง ยืนให้อยู่หน้าแนว Flamethrower พอดี",
     "⑦ The flame telegraphs start turning\n"
     "1s: go to the front of the sector (behind the front AoE)\n"
     "Everyone else shifts the other way to stand just in front of the Flamethrower telegraph",
     strict=False, pic="01/pantokrator_04.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 0, 60, AR, PINK, 0.4), cone(BOSS, 180, 60, AR, PINK, 0.4)] + TR_N
for c in ((42.5, 23.5), (67.5, 30.5), (31, 68.5), (53, 75.5)):
    sh += aoe(c, 10, "#ffb38a", 0.5)
sh += grp((42.5, 23.5), "2341") + pl((67.5, 30.5), "1") + pl((31, 68.5), "1") + grp((53, 75.5), "2341")
sh += [arrow((69, 27), (72, 17)), arrow((38, 25), (28, 28)), arrow((30, 72), (28, 83)), arrow((57, 76), (69, 73))]
step(P1, PK, "⑥ AoE ชุดแรก: เลข 1 ทิ้งแล้วหลบข้าง", "⑥ First AoEs: 1s bait and step aside",
     "⑧ กรวยไฟชุดที่ 3\n"
     "AoE ชุดแรกขึ้นใต้เท้าทุกคน\n"
     "เลข 1: ทิ้ง AoE แล้วหลบไปด้านข้าง",
     "⑧ The third flame telegraphs\n"
     "The first AoEs appear under everyone\n"
     "1s: bait your AoE and dodge to the side",
     strict=False, pic="01/pantokrator_05.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 330, 60, AR, PINK, 0.4), cone(BOSS, 150, 60, AR, PINK, 0.4), beam((22, 22), (78, 78), 11, "#cfe6ff", 0.33)] + TR_N
sh += aoe((76, 18), 12.5, "#c8504a", 0.45) + aoe((27, 81), 12.5, "#c8504a", 0.45)
for c in ((32, 31), (70, 70), (60, 23), (40, 74)):
    sh += aoe(c, 10, "#ffb38a", 0.45)
sh += grp((30, 30), "2342") + pl((75, 18), "1") + pl((27, 80), "1") + grp((70, 71), "2343")
sh += [arrow((78, 22), (84, 31)), arrow((30, 36), (24, 45)), arrow((25, 78), (18, 70)), arrow((73, 67), (78, 58))]
step(P1, PK, "⑦ debuff หมด: เลข 1 รับ missile เลข 2-4 รับ beam", "⑦ Debuffs expire: 1s missile, 2-4 beam",
     "⑨ debuff ชุดแรกหมดเวลา\n"
     "เลข 1: รับ AoE Guided Missile Kyrios ที่ด้านหน้าช่อง แล้วหลบไปด้านข้างหรือถอยหลัง\n"
     "เลข 2, 3, 4: รับลำแสง Condensed Wave Cannon Kyrios ด้วยกันที่ด้านหลัง\n\n"
     "ทำไม beam อยู่หลัง: มีแค่คนรับ missile คู่แรกที่ต้องดูทิศหมุนของกรวยตอนต้น / มีคนเดียวอยู่หน้ากลุ่ม จึงต้องหลบ AoE แค่ลูกเดียว / AoE ชุดแรกทิ้งในกรวยไฟได้ มีที่ให้ทั้งกลุ่มมากขึ้น",
     "⑨ The first debuffs expire\n"
     "1s: take the Guided Missile Kyrios AoE at the front of the sector, then dodge to the side or back\n"
     "2s, 3s, 4s: share the Condensed Wave Cannon Kyrios beam at the back\n\n"
     "Why the beam at the back: only the first missile pair must watch which way the cones turn / with one player in front there is only one AoE to dodge / the first AoEs can be dropped inside the Flamethrower, leaving room",
     strict=False, pic="01/pantokrator_06.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 300, 60, AR, PINK, 0.4), cone(BOSS, 120, 60, AR, PINK, 0.4)] + TR_N
for c in ((20, 46), (76, 56), (82, 30), (14, 70)):
    sh += aoe(c, 10, "#ffb38a", 0.45)
sh += grp((18, 46), "4323") + pl((82, 30), "1") + pl((14, 70), "1") + grp((74, 56), "2342")
sh += [arrow((16, 66), (21, 52)), arrow((80, 34), (75, 49)), arrow((24, 47), (44, 52)), arrow((70, 54), (51, 48))]
step(P1, PK, "⑧ เลข 1 กลับกลุ่ม เลข 2 เข้ากลาง", "⑧ 1s rejoin, 2s to the middle",
     "⑩ AoE ชุดแรกหลัง beam + missile\n"
     "เลข 1: กลับเข้ากลุ่ม\n"
     "เลข 2: เข้ากลางสนาม เริ่มแยกจากกลุ่ม",
     "⑩ The first AoEs after the beam + missile\n"
     "1s: rejoin the party\n"
     "2s: move into the middle to start pulling away from the group",
     strict=False, pic="01/pantokrator_07.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 270, 60, AR, PINK, 0.4), cone(BOSS, 90, 60, AR, PINK, 0.4)] + TR_N
for c in ((70, 38), (29, 60), (53, 40), (47, 58)):
    sh += aoe(c, 10, "#ffb38a", 0.45)
sh += grp((70, 37), "3414") + grp((28, 60), "4131") + pl((52, 40), "2") + pl((47, 58), "2")
sh += [arrow((50, 38), (31, 39)), arrow((50, 60), (68, 64))]
step(P1, PK, "⑨ เลข 2 ไปหน้าช่อง", "⑨ 2s to the front",
     "⑪ AoE ชุดที่ 2 หลัง beam + missile\n"
     "เลข 2: ไปด้านหน้าของช่อง",
     "⑪ The second AoEs after the beam + missile\n"
     "2s: move to the front of the sector",
     strict=False, pic="01/pantokrator_08.jpg", scene=board(sh, wm=False, boss=BOSS))

sh = [cone(BOSS, 60, 60, AR, PINK, 0.4), cone(BOSS, 240, 60, AR, PINK, 0.4), beam((40, 85), (63, 13), 11, "#cfe6ff", 0.33)] + TR_N
sh += aoe((28, 40), 12.5, "#c8504a", 0.45) + aoe((70, 58), 12.5, "#c8504a", 0.45)
for c in ((55, 27), (42, 72)):
    sh += aoe(c, 10, "#ffb38a", 0.5)
sh += grp((55, 27), "3414") + grp((42, 72), "4131") + pl((28, 40), "2") + pl((70, 58), "2")
sh += [arrow((26, 37), (23, 28)), arrow((72, 61), (76, 71)), arrow((51, 24), (40, 22)), arrow((46, 75), (56, 77))]
step(P1, PK, "⑩ เลข 2 รับ missile แล้ววนซ้ำ", "⑩ 2s take the missile, then it repeats",
     "⑫ AoE ที่ทิ้งชุดที่ 3 / beam กับ missile ชุดถัดไปลง\n"
     "เลข 2: หลบ AoE ของตัวเองไปด้านข้าง เตรียมกลับเข้ากลุ่ม\n\n"
     "วนแบบนี้อีก 2 รอบ: เลข 3 แล้วเลข 4 ผลัดกันแยกออกมารับ missile",
     "⑫ The third baited AoEs / the next beams and missiles resolve\n"
     "2s: dodge your AoE to the side and get ready to rejoin\n\n"
     "The loop repeats twice more: the 3s, then the 4s, take their turn leaving the stack for the missile",
     strict=False, pic="01/pantokrator_09.jpg", scene=board(sh, wm=False, boss=BOSS))

# ---------------------------------------------------------------- Wave Cannons
WC = "Diffuse Wave Cannon Kyrios"
SP = dict(H1=(30, 50), H2=(70, 50), D1=(34, 61.5), D2=(66, 61.5), D3=(44, 69), D4=(56, 69))
sh = TR_N + redmark(SP["H1"]) + redmark(SP["D3"]) + redmark(SP["D4"])
step(P1, WC, "① Tank ยืนเหนือ คนอื่นกระจายครึ่งใต้", "① Tanks north, the rest spread south",
     "Omega เล็ง 2 คนที่อยู่ไกลที่สุดด้วยกรวยแท้งค์บัสเตอร์ 120 องศา (Diffuse Wave Cannon Kyrios): ให้ Tank รับ\n"
     "แล้วเล็ง 3 คนที่ไม่ใช่ Tank (มาร์กแดง) ด้วย Wave Cannon Kyrios\n\n"
     "⑯ Tank ทั้งสองยืนรวมกันทางเหนือ นอกวงเป้า (target circle) ของบอส\n"
     "คนอื่นกระจายตัวครึ่งใต้ของสนาม ในวงเป้าของบอส\n"
     "มาร์กกระพริบ 5 ครั้งก่อนลง: Tank ใช้ invuln ตอนกระพริบครั้งที่ 5\n"
     "mitigate: MT + ST ใช้ invuln",
     "Omega targets the two furthest players with 120-degree tankbuster cleaves (Diffuse Wave Cannon Kyrios): the tanks take them\n"
     "Then it marks three random non-tanks (red markers) for Wave Cannon Kyrios\n\n"
     "⑯ Both tanks stack north, outside Omega's targeting circle\n"
     "Everyone else spreads over the south half, inside the targeting circle\n"
     "The marks pulse five times before it goes off: tanks use their invulns on the fifth pulse\n"
     "Mitigation: MT + ST invuln",
     strict=True, pic="01/wave_cannons_01.jpg", says={"MT": "ยืนเหนือนอกวงเป้า invuln ตอนกระพริบครั้งที่ 5", "ST": "ยืนเหนือนอกวงเป้า invuln ตอนกระพริบครั้งที่ 5"},
     says_en={"MT": "North, outside the targeting circle; invuln on the fifth pulse", "ST": "North, outside the targeting circle; invuln on the fifth pulse"},
     scene=board(sh, wm=False, boss=BOSS, roles=roles(MT=(50, 13.5), ST=(50, 11), **SP)),
     refs=[FR("wave-cannon-kyrios", "nin", 119, "Wave Cannon Kyrios: มาร์กบนหัวคือคนที่จะโดนลำแสง", "Wave Cannon Kyrios: the marker over a head shows who the beam hits")])

sh = [cone(BOSS, 0, 120, AR, PINK, 0.42)] + TR_N + [beam(BOSS, (2.5, 50), 9, "#d8ecff", 0.45), beam(BOSS, P(200, 20), 9, "#d8ecff", 0.45),
                                                    beam(BOSS, P(160, 20), 9, "#d8ecff", 0.45)]
sh += redmark(SP["H2"]) + redmark(SP["D1"]) + redmark(SP["D2"])
step(P1, WC, "② Wave Cannon ชุดแรกลง", "② The first Wave Cannons go off",
     "⑰ Wave Cannon ชุดแรกลง\n"
     "อีก 3 คนที่เหลือโดนมาร์กสำหรับชุดที่ 2",
     "⑰ The first Wave Cannons resolve\n"
     "The other three get marked for the second set",
     strict=True, pic="01/wave_cannons_02.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(MT=(50, 13.5), ST=(50, 11), **SP)))

sh = [cone(BOSS, 0, 120, AR, PINK, 0.42)] + TR_N + [beam(BOSS, (97.5, 50), 9, "#d8ecff", 0.45), beam(BOSS, P(225, 21), 9, "#d8ecff", 0.45),
                                                    beam(BOSS, P(135, 21), 9, "#d8ecff", 0.45)]
step(P1, WC, "③ ชุดที่ 2 ลง แล้ว Atomic Ray", "③ The second set, then Atomic Ray",
     "⑰ Wave Cannon ชุดที่ 2 ลง\n"
     "จากนั้น Omega ร่าย Atomic Ray เป็น enrage ของเฟส\n\n"
     "Tank: ใช้ Rampart ตอน Omega หายตัว (จบเฟส) จะคลุม Solar Ray ต้น P2 และกลับมาทันสายใน Limitless Synergy",
     "⑰ The second Wave Cannons resolve\n"
     "Then Omega casts Atomic Ray, the phase's hard enrage\n\n"
     "Tanks: Rampart when Omega jumps away (end of phase) covers the Solar Ray at the start of P2 and is back for Limitless Synergy's tethers",
     strict=True, pic="01/wave_cannons_03.jpg",
     scene=board(sh, wm=False, boss=BOSS, roles=roles(MT=(50, 13.5), ST=(50, 11), **SP)))
