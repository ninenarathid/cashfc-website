"""P1 The Holy See (Tuufless: 01_the_holy_see)."""
from core import step, both, FR
import sc1 as S

P1 = ("P1 The Holy See", "P1 The Holy See")
HM = "Hamukatsu"

step(P1, "Waymarks", "Marker ชุดที่ 1 (ใช้เฉพาะ P1)", "Waymark set 1 (P1 only)",
     "DSR ใช้ marker 2 ชุด: ชุดนี้ใช้เฉพาะ P1 แล้วเปลี่ยนเป็นชุดที่ 2 ตอนเข้า P2 (ดูขั้นแรกของ P2)\n"
     "marker ทั้ง 8 อันใช้ล่อ Hyperdimensional Slash (ลูกบอลดำ)\n"
     "ฝั่งเหนือ (ตะวันตก → ตะวันออก): 4 / A / 1 / B\n"
     "ฝั่งใต้ (ตะวันตก → ตะวันออก): D / 3 / C / 2\n\n"
     "P1 เป็น door boss: ผ่านแล้ว wipe ทีหลังก็ไม่ต้องกลับมาทำใหม่ แต่ Mechanic หลายอย่างใน P1 จะกลับมาอีกในช่วงหลังของไฟต์\n\n"
     "ไม่ใช้ marker แบบชิดกลาง (uptime): ต้องยืนแม่นกว่า เสี่ยงโดน AoE กันเอง และวาง void ผิดที่จนระเบิดพร้อมลูกบอลขาวง่ายขึ้น P1 แทบไม่มี DPS check จึงไม่คุ้ม",
     "DSR uses two waymark sets: this one for P1 only, then the second set from P2 (see P2's first step)\n"
     "All eight are for baiting Hyperdimensional Slash (black orbs)\n"
     "North side (west → east): 4 / A / 1 / B\n"
     "South side (west → east): D / 3 / C / 2\n\n"
     "P1 is a door boss: once cleared, a wipe never sends you back to it, but many of its Mechanics return later in the fight\n\n"
     "No uptime (closer-in) markers: they need more precise positioning, players clip each other more and void puddles land where the white orbs set them off. P1 has next to no DPS check, so it isn't worth it",
     strict=False, pic="markers_1.jpg", scene=S.waymarks())

step(P1, "Opener", "เปิดไฟต์: Tank แยกรับบอส 2 ตัว", "Opener: the tanks take a boss each",
     "Tank 2 คนดึงบอส 2 ตัวมารวมกันกลางสนาม\n"
     "MT: Ser Grinnaux (ตัวตะวันออก)\n"
     "ST: Ser Adelphel (ตัวตะวันตก)\n"
     "ให้ Adelphel อยู่เหนือ Grinnaux นิดหน่อย จะได้มีที่ว่างสำหรับชุดท่าที่ตามมา\n\n"
     "Adelphel ผูกสาย (tether) กับคนสุ่ม 1 คน: MT รับสายนี้ แล้วใช้ invuln (Holy Bladedance)\n"
     "Grinnaux ใช้ Empty Dimension = AoE donut: อยู่ชิดบอส\n"
     "Ser Charibert ยิง Heavensflame ใส่คนที่อยู่ไกลจากทิศเหนือที่สุด = stack รวม (ภาพ: ทุกคนรวมกับ ST ทางใต้)\n\n"
     "ปาร์ตี้ตี Adelphel ก่อน เพราะอีกไม่นาน Adelphel จะหายไป และ Grinnaux จะวาร์ปไปกลางสนาม",
     "The two tanks take the two bosses and stack them in the middle\n"
     "MT: Ser Grinnaux (the east boss)\n"
     "ST: Ser Adelphel (the west boss)\n"
     "Keep Adelphel a little north of Grinnaux to leave room for the combination that follows\n\n"
     "Adelphel tethers a random player: the MT takes the tether and invulns (Holy Bladedance)\n"
     "Grinnaux uses Empty Dimension, a donut AoE: stay close to the boss\n"
     "Ser Charibert targets the player furthest from north with Heavensflame, a shared stack (picture: everyone with the ST, south)\n\n"
     "Focus Adelphel: he disappears shortly, and Grinnaux teleports to the middle",
     strict=["MT", "ST"], pic="01/adelphel_grinnaux_01.jpg", scene=S.opener(),
     **dict(zip(("says", "says_en"), both({
         "MT": ("รับ Grinnaux (ตะวันออก) + รับสายของ Adelphel แล้วใช้ invuln", "Take Grinnaux (east) + Adelphel's tether, and invuln"),
         "ST": ("รับ Adelphel (ตะวันตก) ให้อยู่เหนือ Grinnaux นิดหน่อย", "Take Adelphel (west), a little north of Grinnaux")}))),
     refs=[FR("p1-opener", "JN7sg1lOgtE", 36, "เปิดไฟต์: Adelphel ผูกสายกับคนสุ่ม MT ไปรับสายแล้วใช้ invuln", "The opener: Adelphel tethers a random player; the MT takes it and invulns")])

HS = "Hyperdimensional Slash"
step(P1, HS, "① คนโดนมาร์กไปใต้ / ที่เหลือ stack เหนือ", "① Marked south / the rest stack north",
     "4 คนสุ่มโดนมาร์ก (▼ สีแดงบนหัว)\n"
     "คนโดนมาร์ก: กระจายฝั่งใต้ บน marker D / 3 / C / 2\n"
     "แต่ละคนโดน Hyperdimensional Slash เป็น AoE เส้นตรง ที่ทิ้ง void (บ่อดำ) ไว้ตรงจุดที่ชนกำแพง\n\n"
     "อีก 4 คนที่ไม่โดนมาร์ก: stack รวมกันทางเหนือ แชร์ Hyperdimensional Slash แบบกรวย (cleave)",
     "Four random players get marked (a red ▼ overhead)\n"
     "Marked: spread along the south side, on markers D / 3 / C / 2\n"
     "Each is hit by a Hyperdimensional Slash line AoE that leaves a void puddle where it hits the wall\n\n"
     "The other four (unmarked): stack north to share a Hyperdimensional Slash cleave",
     strict=False, pic="01/hyperdimensional_slash_01.jpg", scene=S.hyper(1),
     refs=[FR("p1-hyper-marks", "II-N13_CG_g", 60, "Hyperdimensional Slash: มาร์ก ▼ บนหัว 4 คน กระจายฝั่งใต้ อีก 4 คน stack เหนือ", "Hyperdimensional Slash: four ▼ marks spread south; the other four stack north")])
step(P1, HS, "② สลับ: มาร์กไปเหนือ / stack ใต้", "② Swap: marked north / stack south",
     "ทุกคนสลับหน้าที่: คนที่ไม่โดนมาร์กรอบแรกโดนมาร์กรอบนี้ และกลับกัน\n"
     "คนโดนมาร์ก: กระจายฝั่งเหนือ บน marker 4 / A / 1 / B รับ AoE เส้นตรง\n"
     "คนไม่โดนมาร์ก: stack รวมกันทางใต้ แชร์กรวย",
     "Everyone swaps: the players unmarked last time are marked now, and the other way round\n"
     "Marked: spread along the north side, on markers 4 / A / 1 / B, for the line AoEs\n"
     "Unmarked: stack south to share the cleave",
     strict=False, pic="01/hyperdimensional_slash_02.jpg", scene=S.hyper(2))
step(P1, HS, "③ Faith Unmoving + Adelphel พุ่ง", "③ Faith Unmoving + Adelphel's dash",
     "Ser Adelphel โผล่ที่ขอบสนามทิศหลักแบบสุ่ม แล้วร่าย Holiest of Holy อีกครั้ง\n"
     "Ser Grinnaux ร่าย Faith Unmoving = knockback กันได้ด้วย Arm's Length / Surecast: อย่าโดนกระแทกเข้า void ริมกำแพง\n\n"
     "จากนั้น Adelphel พุ่งไปซ้ายหรือขวา ไปกำแพงทิศหลักที่อยู่ติดกัน\n"
     "ปาร์ตี้ขยับไปฝั่งที่ Adelphel พุ่งไปก่อน\n"
     "(ภาพ: Adelphel พุ่งไปทางซ้าย ไปกำแพงตะวันตก ปาร์ตี้จึงไปฝั่งตะวันตก)",
     "Ser Adelphel reappears at a random cardinal edge and casts another Holiest of Holy\n"
     "Ser Grinnaux casts Faith Unmoving, a knockback that Arm's Length / Surecast cancels: don't get knocked into the void puddles along the wall\n\n"
     "Adelphel then dashes left or right to an adjacent cardinal wall\n"
     "The party moves to whichever side Adelphel dashes to first\n"
     "(Picture: Adelphel dashes left, to the west wall, so the party goes west)",
     strict=False, pic="01/hyperdimensional_slash_03.jpg", scene=S.hyper3(),
     refs=[FR("p1-adelphel-dash", "II-N13_CG_g", 100, "Adelphel โผล่ที่ขอบสนาม แล้วพุ่งไปกำแพงข้างๆ ปาร์ตี้ไปฝั่งที่พุ่งไปก่อน", "Adelphel at an edge dashes to the next wall; the party goes to the side he dashes to first")])
step(P1, HS, "④ AoE ตามเส้นทางที่พุ่ง", "④ AoEs along the dash path",
     "AoE ชุดใหญ่ลงตามเส้นทางที่ Adelphel พุ่งผ่าน\n"
     "ปลาย 'ซี่' ของลายบนพื้นปลอดภัยจาก AoE ชุดนี้เสมอ",
     "A whole series of AoEs goes off along Adelphel's path\n"
     "The tips of the spokes on the floor pattern are always safe from them",
     strict=False, pic="01/hyperdimensional_slash_04.jpg", scene=S.hyper4())
step(P1, HS, "⑤ ST รับ Adelphel + interrupt", "⑤ The ST takes Adelphel + interrupts",
     "ST ออกไปยืนหน้าปาร์ตี้ เพราะ Adelphel จะลงใส่ ST (Execution) กระแทกและฆ่าคนอื่นที่โดนด้วย\n"
     "ST ใช้ invuln รับครั้งนี้ได้\n\n"
     "จากนั้น Adelphel ร่าย Holiest Hallowing: ST ต้อง interrupt ไม่งั้น Adelphel และ Grinnaux ฟื้น HP คนละ 50%",
     "The ST moves ahead of the party: Adelphel lands on that player (Execution), knocking back and killing anyone else hit\n"
     "The ST can invuln this hit\n\n"
     "Adelphel then casts Holiest Hallowing: the ST must interrupt it, or Adelphel and Grinnaux each recover 50% HP",
     strict=["ST"], pic="01/hyperdimensional_slash_05.jpg", scene=S.hyper5(),
     **dict(zip(("says", "says_en"), both({"ST": ("ออกไปหน้าปาร์ตี้ รับ Adelphel (invuln ได้) แล้ว interrupt Holiest Hallowing", "Go ahead of the party, take Adelphel (invuln is fine), then interrupt Holiest Hallowing")}))))

PS = "Playstation"
step(P1, PS, "① จับคู่ตามสัญลักษณ์", "① Pair up by symbol",
     "MT ดึง Grinnaux กลับมากลางสนาม\n"
     "ทุกคนถูกจับคู่ด้วยสัญลักษณ์ Playstation:\n"
     "○ = DPS 2 คน\n× = Tank + Healer\n▽ = Healer + DPS\n□ = Tank + DPS\n\n"
     "ยืนเป็นตาราง 3×3 รอบบอส ตามภาพ (เหมือน macro):\n"
     "แถวเหนือ: D▽ / T× / T□\n"
     "แถวกลาง: D○ (ตะวันตก) / D○ (ตะวันออก)\n"
     "แถวใต้: D□ / H× / H▽\n\n"
     "คู่ ○ (DPS 2 คน) ใช้ลำดับ: West D1 > D2 > D3 > D4 East (คนลำดับก่อนไปตะวันตก)",
     "The MT recentres Grinnaux\n"
     "Players are paired by Playstation symbols:\n"
     "○ = two DPS\n× = a tank and a healer\n▽ = a healer and a DPS\n□ = a tank and a DPS\n\n"
     "Stand in a 3×3 grid around the boss as drawn (the macro's layout):\n"
     "North row: D▽ / T× / T□\n"
     "Middle row: D○ (west) / D○ (east)\n"
     "South row: D□ / H× / H▽\n\n"
     "The ○ pair (two DPS) goes by: West D1 > D2 > D3 > D4 East (the earlier one goes west)",
     strict=False, pic="01/playstation_01.jpg", scene=S.ps1(),
     refs=[FR("p1-playstation", "JN7sg1lOgtE", 250, "Playstation: สัญลักษณ์ ○ × ▽ □ บนหัว คู่เดียวกันมีโซ่ผูก", "Playstation: ○ × ▽ □ overhead; each pair is chained together")])
step(P1, PS, "② knockback ให้โซ่ขาด", "② The knockback breaks the chains",
     "Grinnaux ร่าย Faith Unmoving อีกครั้ง: knockback ทุกคนออกจากบอส\n"
     "แรงกระแทกดึงโซ่ของแต่ละคู่จนขาด แล้วทุกคนได้ AoE Heavensflame รอบตัว\n"
     "รอบนี้ห้ามใช้ Arm's Length / Surecast: ต้องใช้ knockback ดึงโซ่ให้ขาด\n\n"
     "ถ้าโซ่ไม่ขาด:\n"
     "ระยะ knockback อย่างเดียวไม่พอ: หลังโดนกระแทก ทุกคนเดินออกไปทางขอบอีกนิด\n"
     "โซ่ขาดเมื่อยืดเกินความยาวเดิมระดับหนึ่ง: ถ้าเริ่มยืนห่างกัน ต้องยืดไกลขึ้น จึงอย่าเริ่มไกลแล้วค่อยเดินเข้าหาบอสก่อน knockback",
     "Grinnaux casts Faith Unmoving again, knocking everyone back from him\n"
     "That breaks each pair's chain, and every player gets a Heavensflame AoE around them\n"
     "No Arm's Length / Surecast here: the knockback is what breaks the chains\n\n"
     "If the chains don't break:\n"
     "The knockback alone isn't enough: after it, everyone moves a bit further out towards the edges\n"
     "A chain breaks when stretched a set distance past its original length: start far apart and it must stretch further, so starting out wide and walking in before the knockback doesn't work",
     strict=False, pic="01/playstation_02.jpg", scene=S.ps2())
step(P1, "Holiest Hallowing", "ช่วงท้าย P1: interrupt + raid-wide", "The rest of P1: interrupts + raid-wides",
     "ต่อจากนี้ Mechanic ตรงไปตรงมา:\n"
     "Adelphel ร่าย Holiest Hallowing ครั้งที่ 2: รอบนี้ D3 interrupt\n"
     "Adelphel ร่าย Holiest of Holy (raid-wide) พร้อมกับที่ Grinnaux ใช้ Empty Dimension (donut: เข้าชิดบอส) หรือ Full Dimension (AoE รอบตัวบอส: ออกห่าง)\n"
     "Holiest Hallowing ครั้งที่ 3: interrupt อีกครั้ง แล้วตามด้วย Holiest of Holy (raid-wide)\n\n"
     "ลำดับ interrupt (macro): ST → D3 → ST\n\n"
     "ถึงตรงนี้ถ้าบอสยังอยู่ทั้ง 2 ตัวจะเริ่ม enrage: ถ้าตัวใดตัวหนึ่งตาย อีกตัวจะเริ่มร่าย enrage",
     "From here the Mechanics are straightforward:\n"
     "Adelphel casts a second Holiest Hallowing: D3 interrupts this one\n"
     "Adelphel casts Holiest of Holy (raid-wide) while Grinnaux uses Empty Dimension (donut: get close) or Full Dimension (point-blank AoE: get away)\n"
     "A third Holiest Hallowing needs another interrupt, then another Holiest of Holy (raid-wide)\n\n"
     "Interrupt order (macro): ST → D3 → ST\n\n"
     "If both bosses are still alive here they begin their enrage; if either one dies, the other starts casting its enrage",
     strict=False,
     **dict(zip(("says", "says_en"), both({"ST": ("interrupt Holiest Hallowing ครั้งที่ 1 และ 3", "Interrupt Holiest Hallowing 1 and 3"),
                                           "D3": ("interrupt Holiest Hallowing ครั้งที่ 2", "Interrupt Holiest Hallowing 2")}))),
     refs=[FR("p1-holiest-hallowing", "JN7sg1lOgtE", 240, "Holiest Hallowing: ไอคอนเงียบเหนือ Adelphel ต้อง interrupt (ST → D3 → ST)", "Holiest Hallowing: the silence icon over Adelphel; interrupt it (ST → D3 → ST)")])

POH = "Pure of Heart"
step(P1, POH, "ภาพรวม: ลำดับ HMRT", "Overview: the HMRT order",
     "Ser Charibert โผล่ทางตะวันตก แล้วดึงปาร์ตี้เข้าไปในวง\n"
     "แก้การโจมตีของ Charibert ตามลำดับ HMRT: Healer → Melee → Range → Tank\n"
     "แต่ละกลุ่มล่อ Brightwing (กรวย) ก่อน แล้วรอบถัดไปออกไปล่อ Light Puddle (บ่อขาว) แล้วกลับเข้า stack\n"
     "Range กับ Melee สลับฝั่งกันตอนทิ้ง Light Puddle\n"
     "Tank ไปท้ายสุด: Healer ไม่ต้องรีบ heal ปาร์ตี้ให้เต็มก่อน Pure of Heart ลง\n\n"
     "วิธีนี้ Melee ตีได้ตลอด แทบไม่ต้องขยับ",
     "Ser Charibert appears west and pulls the party into a ring\n"
     "Resolve Charibert's attacks in the order HMRT: Healer → Melee → Ranged → Tank\n"
     "Each group baits Brightwing (cones) first, then on the next set goes out to bait the Light Puddles, then rejoins the stack\n"
     "Ranged and melee alternate sides when dropping the Light Puddles\n"
     "Tanks go last, so the healers aren't rushing to top the party up before Pure of Heart resolves\n\n"
     "This gives the melee full uptime with minimal movement",
     strict=False,
     refs=[FR("p1-pure-of-heart", "JN7sg1lOgtE", 318, "Pure of Heart: Charibert ดึงปาร์ตี้เข้าวงสีม่วง แก้ตามลำดับ HMRT", "Pure of Heart: Charibert pulls the party into the purple ring; resolve it HMRT")])
step(P1, POH, "① Healer ล่อ Brightwing", "① Healers bait Brightwing",
     "ชุดแรก: Healer 2 คนล่อ Brightwing ทางใต้ของ Charibert\nคนอื่นรวม stack เหนือ Charibert",
     "First set: the two healers bait Brightwing, south of Charibert\nEveryone else stacks north of Charibert",
     strict=["H1", "H2"], pic="01/haurchefant_01.jpg", scene=S.poh(1),
     **dict(zip(("says", "says_en"), both({"H1": ("ล่อ Brightwing ชุดแรก", "Bait the first Brightwing"), "H2": ("ล่อ Brightwing ชุดแรก", "Bait the first Brightwing")}))))
step(P1, POH, "② Melee ล่อ Brightwing / Healer ล่อ puddle", "② Melee bait Brightwing / healers bait puddles",
     "Healer: ไปหน้า Charibert (ฝั่งตะวันออก) ล่อ puddle\nMelee: ล่อ Brightwing ชุดที่ 2",
     "Healers: move in front of Charibert (east) to bait the puddles\nMelee: bait the second Brightwing",
     strict=["D1", "D2", "H1", "H2"], pic="01/haurchefant_02.jpg", scene=S.poh(2))
step(P1, POH, "③ Range ล่อ Brightwing / Melee ล่อ puddle", "③ Ranged bait Brightwing / melee bait puddles",
     "Healer: กลับเข้า stack หลบ puddle\nMelee: ไปหลัง Charibert (ฝั่งตะวันตก) ล่อ puddle\nRange: ล่อ Brightwing ชุดที่ 3",
     "Healers: rejoin the stack to dodge the puddles\nMelee: move behind Charibert (west) to bait the puddles\nRanged: bait the third Brightwing",
     strict=["D1", "D2", "D3", "D4"], pic="01/haurchefant_03.jpg", scene=S.poh(3))
step(P1, POH, "④ Tank ล่อ Brightwing / Range ล่อ puddle", "④ Tanks bait Brightwing / ranged bait puddles",
     "Melee: กลับเข้า stack หลบ puddle\nRange: ไปหน้า Charibert (ฝั่งตะวันออก) ล่อ puddle\nTank: ล่อ Brightwing ชุดที่ 4",
     "Melee: rejoin the stack to dodge the puddles\nRanged: move in front of Charibert (east) to bait the puddles\nTanks: bait the fourth Brightwing",
     strict=["MT", "ST", "D3", "D4"], pic="01/haurchefant_04.jpg", scene=S.poh(4))
step(P1, POH, "⑤ Tank ล่อ puddle", "⑤ Tanks bait puddles",
     "ชุดสุดท้ายก่อน Pure of Heart ลง\n"
     "Range: กลับเข้า stack หลบ puddle\n"
     "Tank: ออกไปล่อ puddle (ภาพ: ฝั่งตะวันตก สลับฝั่งกับ puddle ของ Range)",
     "The last movement before Pure of Heart resolves\n"
     "Ranged: rejoin the stack to dodge the puddles\n"
     "Tanks: go out to bait the puddles (picture: the west side, opposite the ranged puddles)",
     strict=["MT", "ST"], pic="01/haurchefant_05.jpg", scene=S.poh(5))
step(P1, POH, "⑥ Pure of Heart ลง", "⑥ Pure of Heart resolves",
     "Pure of Heart ลง: ตายทั้งปาร์ตี้ถ้า Charibert HP ยังไม่ต่ำกว่า 30%\n"
     "Tank: กลับเข้า stack หลบ puddle\n\n"
     "จากนั้นสนามเปลี่ยน และ Thordan โผล่: ต้องมีคนในปาร์ตี้ตี Thordan ไม่งั้นจะเริ่มใหม่ที่ P1",
     "Pure of Heart resolves: lethal unless Charibert is under 30% HP\n"
     "Tanks: rejoin the stack to dodge the puddles\n\n"
     "The arena then changes and Thordan appears: someone must attack Thordan, or you restart from P1",
     strict=False, pic="01/haurchefant_06.jpg", scene=S.poh(6))
