"""P1 Living Liquid, as Tuufless's Notes has it (01_living_liquid)."""
import scenes_tea as S
from frames_list import FR

IMG = "https://ffxiv.tuufless.com/images/ultimates/tea/"
L = lambda n: f"{IMG}01/living_liquid_{n:02d}.jpg"
PH = ("P1 Living Liquid", "P1 Living Liquid")


def p1(step):
    step(PH, "Waymarks", "Marker ของแผนนี้", "This plan's waymarks",
         "Marker ตาม Tuufless (ภาพวาดตามตำแหน่ง WaymarkPresetPlugin ของแหล่ง)\n"
         "A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก: ไว้บอกทิศ\n"
         "1 ตะวันตกเฉียงใต้ / 2 ใต้ / 3 ตะวันออกเฉียงใต้ / 4 ตะวันออก: วงในใกล้กลางสนาม\n\n"
         "ใช้ทำอะไรในแต่ละช่วง\n"
         "Limit Cut: 1234 แบ่งสนามเป็น 2 ฝั่ง\n"
         "แผน 1211: เริ่มจากระเบิดลูกแรกฝั่งที่ไม่มี marker\n"
         "แผน 1256: กลุ่ม 1256 ไปฝั่งที่ไม่มี marker / กลุ่ม 3478 ไปฝั่งที่มี marker\n\n"
         "Brute Justice + Cruise Chaser: A = Water ครั้งที่ 1 / C = Water ครั้งที่ 2 / 3 = Water ครั้งที่ 3\n"
         "Alexander Prime: 4 = จุด stack ของปาร์ตี้ตอน Inception Formation (ยกเว้น ST, Healer และ DPS สายน้ำเงิน)\n"
         "Perfect Alexander: B = Dark Beacon (Forced March, Fate Calibration β) / 1234 = จุดหลบ Exatrine",
         "Tuufless's waymarks (drawn from the source's WaymarkPresetPlugin positions)\n"
         "A north / B east / C south / D west: for orientation\n"
         "1 south-west / 2 south / 3 south-east / 4 east: an inner ring near the middle\n\n"
         "What each is for\n"
         "Limit Cut: 1234 split the arena in two\n"
         "1211: start from the first explosion on the side without markers\n"
         "1256: the 1256 group takes the side without markers / the 3478 group the side with them\n\n"
         "Brute Justice + Cruise Chaser: A = 1st Water / C = 2nd Water / 3 = 3rd Water\n"
         "Alexander Prime: 4 = the party stack for Inception Formation (except the ST, healers and the blue-tether DPS)\n"
         "Perfect Alexander: B = the Dark Beacon (Forced March, Fate Calibration β) / 1234 = the Exatrine spots",
         strict=False, pic=IMG + "markers.jpg", scene=S.waymarks())

    HAND = "Hand of Parting / Hand of Pain"
    step(PH, HAND, "Liquid Hand: 2 ท่าที่ต้องรู้", "Liquid Hand: its two mechanics",
         "Liquid Hand เป็น add ที่โผล่ตอน Living Liquid ร่าย Cascade ครั้งแรก\n\n"
         "Hand of Parting\n"
         "Hand เรืองแสงสีฟ้าเป็นมือแบ หรือกำหมัด แล้วตบพื้น: raid-wide แรงตามระยะห่างจาก Living Liquid\n"
         "มือแบ: ให้ Hand ซ้อนทับบน Living Liquid\n"
         "กำหมัด: ให้ Hand กับ Living Liquid อยู่ห่างกัน\n"
         "ล่อได้: ตอนเรืองแสง ถ้าทั้งสองอยู่ห่างกันจะเป็นมือแบ / ถ้าอยู่ใกล้กันจะเป็นกำหมัด\n"
         "แผนนี้ทำให้เป็นมือแบเสมอ\n\n"
         "Hand of Pain\n"
         "ตบพื้น raid-wide แรงตามส่วนต่าง HP% ของ Living Liquid กับ Hand\n"
         "HP% ต้องห่างกันไม่เกิน 5% ไม่งั้นแรงจนตาย\n"
         "ท่านี้ทะลุ invuln ของ Tank: MT invuln รับ Fluid Swing แล้วยังตาย มักเป็นเพราะ Hand of Pain ที่ตามมา\n\n"
         "ไม่ต้องฆ่า Hand ก็ผ่าน phase ได้ แต่ต้องคุม HP ให้ใกล้ Living Liquid ตลอด",
         "The Liquid Hand is an add that appears when Living Liquid casts its first Cascade\n\n"
         "Hand of Parting\n"
         "The Hand glows blue as an open palm or a closed fist, then slams: raid-wide damage by its distance to Living Liquid\n"
         "Open palm: stack the Hand on top of Living Liquid\n"
         "Closed fist: keep the Hand and Living Liquid apart\n"
         "It can be baited: apart when it glows gives an open palm / close together gives a closed fist\n"
         "This plan always makes it an open palm\n\n"
         "Hand of Pain\n"
         "A slam for raid-wide damage by the HP% gap between Living Liquid and the Hand\n"
         "Keep the two within 5% or it is lethal\n"
         "It ignores tank invulns: an MT who invulns Fluid Swing and still dies usually died to the Hand of Pain right after\n\n"
         "The Hand need not die to clear the phase, but its HP must stay close to Living Liquid's",
         strict=False, refs=[FR("ll-hand")])

    C = "Cascade"
    step(PH, C, "① ดึงบอสกลาง แยก Hand ออก", "① Pull to the middle, pull the Hand away",
         "① ดึง Living Liquid ไปกลางสนาม\n"
         "บอสตี auto-attack 3 ครั้ง แล้วใช้ Fluid Swing (กรวย) ใส่ MT\n"
         "จากนั้นร่าย Cascade ครั้งแรก: Liquid Hand กับแอ่งน้ำ 3 จุดโผล่ ทุกคนถือแอ่งน้ำ 3 จุดเป็นตัวบอกทิศ\n"
         "MT, ST: แยก Living Liquid กับ Hand ออกจากกัน ให้ Hand เป็นมือแบ\n"
         "เคล็ดลับ: ถ้า ST ดึง aggro Hand จาก MT ไม่ได้ ให้ MT ปิด tank stance ชั่วครู่ตอน Hand โผล่\n\n"
         "แบ่งปาร์ตี้คร่าวๆ\n"
         "ตี Living Liquid: MT H1 D1 D3\n"
         "ตี Liquid Hand: ST H2 D2 D4",
         "① Pull Living Liquid to the middle\n"
         "It auto-attacks three times, then cleaves the MT with Fluid Swing\n"
         "Then the first Cascade: the Liquid Hand and three water puddles appear; orient yourselves by the three puddles\n"
         "MT, ST: separate Living Liquid and the Hand so the Hand turns to an open palm\n"
         "Tip: if the ST can't take the Hand from the MT, the MT can drop tank stance for a moment when the Hand appears\n\n"
         "A rough split\n"
         "On Living Liquid: MT H1 D1 D3\n"
         "On the Liquid Hand: ST H2 D2 D4",
         strict=["MT", "ST"], pic=L(1), scene=S.p1_01(), refs=[FR("ll-open")],
         says={"MT": "ถือ Living Liquid (LL) แยกออกจาก Hand", "ST": "ดึง Liquid Hand ออกห่างจาก Living Liquid"},
         says_en={"MT": "Hold Living Liquid (LL) away from the Hand", "ST": "Pull the Liquid Hand away from Living Liquid"})
    step(PH, C, "② Hand เป็นมือแบ: MT ดึงมาซ้อน", "② Open palm: the MT stacks the Hand",
         "② ถ้าแยกห่างพอ Hand จะเรืองแสงเป็นมือแบ\n"
         "MT: Provoke ดึง Liquid Hand มาซ้อนบน Living Liquid\n"
         "MT, H1, H2: ล่อ Protean Wave ชุดแรกจากแอ่งน้ำ (มีเส้นบอก: กรวยสีเขียวในภาพ)\n"
         "มาโคร: MT แอ่งเหนือ / H1 แอ่งตะวันตก / H2 แอ่งตะวันออก",
         "② Far enough apart, the Hand glows as an open palm\n"
         "MT: Provoke the Liquid Hand and stack it on Living Liquid\n"
         "MT, H1, H2: bait the first telegraphed Protean Waves from the puddles (the green cones)\n"
         "Macro: MT the north puddle / H1 the west / H2 the east",
         strict=["MT", "H1", "H2"], pic=L(2), scene=S.p1_02(),
         says={"MT": "Provoke Hand มาซ้อน Living Liquid + ล่อกรวยแอ่งเหนือ", "H1": "ล่อกรวยแอ่งตะวันตก", "H2": "ล่อกรวยแอ่งตะวันออก"},
         says_en={"MT": "Provoke the Hand onto Living Liquid + bait the north puddle", "H1": "Bait the west puddle", "H2": "Bait the east puddle"})

    J = "Jagd Dolls"
    step(PH, J, "Jagd Doll คืออะไร", "What the Jagd Dolls do",
         "Jagd Doll เป็น add มาชุดเดียว\n"
         "ผูกสาย (tether) และล็อกเป้าคนแรกที่ทำอะไรใส่มัน (รวม auto-attack)\n"
         "ปล่อย Exhaust เป็นระยะ: AoE รอบตัว ใครโดนติด Luminous Aetheroplasm ซ้อนได้ ใครโดน 2 ลูกระเบิดตายทั้งปาร์ตี้\n\n"
         "ฆ่าด้วยดาเมจไม่ได้: ถ้า HP เหลือ 0% ระเบิดตายทั้งปาร์ตี้\n"
         "ต้องลากไปใกล้ Living Liquid หรือ Hand: Doll โยงสายกับบอสแล้วหายไป เกิด raid-wide (Reducible Complexity) แรงตาม HP ที่เหลือ\n"
         "HP Doll ต้องต่ำกว่า 25% ก่อนป้อน ไม่งั้น raid-wide แรงจนตาย\n\n"
         "Protean Wave จากแอ่งน้ำ (เริ่มในช่วงนี้)\n"
         "1. แอ่งน้ำแต่ละจุดเล็งกรวยมีเส้นบอกใส่คนที่ใกล้ที่สุด\n"
         "2. เส้นบอกหาย: กรวยยิงตามเส้น และ knockback คนที่โดน (กันด้วย Arm's Length / Surecast ได้)\n"
         "3. ตามด้วยกรวยไม่มีเส้นบอก ใส่คนที่ใกล้ที่สุด: หลบไม่ได้ แต่ไม่ knockback\n"
         "Protean Wave ทุกลูกติด Water Resistance Down II 5 วินาที: คนเดียวห้ามโดน 2 ลูก",
         "The Jagd Dolls are a one-time add\n"
         "They tether to and lock onto the first player who does anything to them (auto-attacks included)\n"
         "They pulse Exhaust: a point-blank AoE that stacks Luminous Aetheroplasm; anyone hit twice explodes and wipes the raid\n\n"
         "Damage can't destroy them: at 0% HP they explode and wipe the raid\n"
         "Drag one near Living Liquid or the Hand: it tethers to the boss and is destroyed, for raid-wide damage (Reducible Complexity) by its HP left\n"
         "A Doll must be under 25% HP, or that damage is lethal\n\n"
         "The puddles' Protean Waves (introduced here)\n"
         "1. Each puddle aims a telegraphed cone at the closest player\n"
         "2. When it fades the cone fires there and knocks back whoever it hits (Arm's Length / Surecast stop it)\n"
         "3. Then an untelegraphed cone at the closest player: unavoidable, no knockback\n"
         "Every Protean Wave leaves a 5 s Water Resistance Down II: nobody can take two",
         strict=False, refs=[FR("ll-dolls")])
    step(PH, J, "③ Doll โผล่ + กรวยชุดแรก", "③ The Dolls + the first cones",
         "③ Jagd Doll โผล่ และกรวยไม่มีเส้นบอกชุดแรกลง\n"
         "MT: invuln รับ Fluid Swing ของ Living Liquid และ Fluid Strike ของ Hand\n"
         "MT, H1, H2: ล่อกรวยมีเส้นบอกจากแอ่งน้ำ\n"
         "DPS: รับ Doll ของตัวเอง (ภาพ: Doll ของ D1 กับ D2 อยู่ทางเหนือ / D3 กับ D4 ทางใต้)\n"
         "ตรงนี้ Hand ใช้ Hand of Parting: ควรเป็นมือแบ ถ้า Hand ไม่ได้ซ้อนบน Living Liquid ตายทั้งปาร์ตี้",
         "③ The Jagd Dolls appear and the first untelegraphed cones go off\n"
         "MT: invuln Living Liquid's Fluid Swing and the Hand's Fluid Strike\n"
         "MT, H1, H2: bait the telegraphed cones from the puddles\n"
         "DPS: take your own Doll (picture: D1's and D2's Dolls north / D3's and D4's south)\n"
         "The Hand uses Hand of Parting here: it should be an open palm, and it wipes the raid unless the Hand is stacked on Living Liquid",
         strict=["MT", "H1", "H2"], pic=L(3), scene=S.p1_03(),
         says={"MT": "invuln รับ Fluid Swing + Fluid Strike + ล่อกรวยแอ่งเหนือ"}, says_en={"MT": "Invuln Fluid Swing + Fluid Strike + bait the north puddle"})
    step(PH, J, "④ กรวยชุดที่ 2 + Doll ปล่อย AoE", "④ The second cones + the Doll AoEs",
         "④ กรวยไม่มีเส้นบอกชุดที่ 2 ลง\n"
         "D1, D2: ยืนทับบน Doll ของตัวเอง จะได้ไม่โดน AoE ของ Doll 2 ลูก ระวังอย่าแย่งกรวยไปจาก MT\n"
         "ตรงนี้ Hand ใช้ Hand of Pain: HP% ของ Living Liquid กับ Hand ต้องห่างกันไม่เกิน 5%",
         "④ The second untelegraphed cones go off\n"
         "D1, D2: stand on top of your Doll so you aren't hit by two Doll AoEs; don't steal the cone from the MT\n"
         "The Hand uses Hand of Pain here: keep Living Liquid's and the Hand's HP within 5%",
         strict=["D1", "D2"], pic=L(4), scene=S.p1_04(),
         says={"D1": "ยืนทับ Doll ของตัวเอง", "D2": "ยืนทับ Doll ของตัวเอง"}, says_en={"D1": "Stand on your Doll", "D2": "Stand on your Doll"})
    step(PH, J, "⑤ Embolus 2 ลูก", "⑤ Two Embolus orbs",
         "⑤ Hand ร่าย Hand of Pain และ Embolus 2 ลูกโผล่ ค่อยๆ ลอยไปหาบอส\n"
         "MT: พอ HP Doll ของ D1 ต่ำกว่า 25% ย้ายไปกลางสนาม",
         "⑤ The Hand casts Hand of Pain; two Embolus orbs appear and drift towards the bosses\n"
         "MT: once D1's Doll is under 25% HP, move to the middle",
         strict=["MT"], pic=L(5), scene=S.p1_05())
    step(PH, J, "⑥ Doll ของ D3 / D4 ปล่อย AoE อีกครั้ง", "⑥ D3's and D4's Dolls pulse again",
         "⑥ Doll ของ D3 และ D4 ปล่อย AoE อีก 1 ครั้ง\n"
         "MT, ST: ไปยืนตะวันตกเฉียงเหนือ และตะวันออกเฉียงเหนือ เตรียมรับ Fluid Swing\n"
         "D2: ป้อน Doll ให้บอสตัวไหนก็ได้ เมื่อ HP ต่ำกว่า 25%",
         "⑥ D3's and D4's Dolls pulse once more\n"
         "MT, ST: stand north-west and north-east, ready for Fluid Swing\n"
         "D2: feed your Doll to either boss once it is under 25% HP",
         strict=["MT", "ST"], pic=L(6), scene=S.p1_06())
    step(PH, J, "⑦ Fluid Swing / Fluid Strike", "⑦ Fluid Swing / Fluid Strike",
         "⑦ Living Liquid กับ Hand ตีกรวยใส่ Tank ของตัวเอง (Fluid Swing / Fluid Strike)\n"
         "D3, D4: ป้อน Doll ให้บอสเมื่อ HP ต่ำกว่า 25% จะรอ Fluid Swing ลงก่อนก็ได้\n\n"
         "เคล็ดลับ: จากนี้ ST มักโดนดาเมจมากกว่า MT เพราะ Hand ตี auto-attack มากกว่าไปจนจบ phase",
         "⑦ Living Liquid and the Hand cleave their tanks (Fluid Swing / Fluid Strike)\n"
         "D3, D4: feed your Dolls to the bosses under 25% HP; you may wait for Fluid Swing first\n\n"
         "Tip: from here the ST usually takes more damage than the MT, as the Hand auto-attacks more for the rest of the phase",
         strict=["MT", "ST"], pic=L(7), scene=S.p1_07())

    PW = "Protean Wave #1"
    step(PH, PW, "Protean Wave ของ Living Liquid", "Living Liquid's Protean Waves",
         "คล้ายของแอ่งน้ำ แต่ต่างกันบ้าง\n"
         "1. Living Liquid เล็งกรวยมีเส้นบอกใส่ทุกคน\n"
         "2. เส้นบอกหาย: กรวยยิงตามเส้น และ knockback คนที่โดน (กันด้วย Arm's Length / Surecast ได้)\n"
         "3. ตามด้วยกรวยไม่มีเส้นบอก 2 ชุดติดกัน ชุดละ 5 ลูก: 4 ลูกใส่ 4 คนที่ใกล้ Living Liquid ที่สุด + 1 ลูกยิงตรงไปทางที่ Living Liquid หันหน้า\n"
         "ชุดหลังนี้หลบไม่ได้ แต่ไม่ knockback\n\n"
         "ทุกลูกติด Water Resistance Down II 5 วินาที: คนเดียวห้ามโดน 2 ลูก\n\n"
         "มาโคร: ตำแหน่ง MT ST / D1 D2 / D3 D4 / H1 H2\n"
         "1. stack เหนือ / ใต้ 2. Melee เข้า Range ออก 3. Range เข้า Melee ออก",
         "Like the puddles' but with a few differences\n"
         "1. Living Liquid aims a telegraphed cone at every player\n"
         "2. When they fade the cones fire and knock back whoever they hit (Arm's Length / Surecast stop it)\n"
         "3. Then two sets of five untelegraphed cones back to back: the four players closest to Living Liquid + one straight ahead where it faces\n"
         "Those can't be avoided but don't knock back\n\n"
         "Each leaves a 5 s Water Resistance Down II: nobody can take two\n\n"
         "Macro: spots MT ST / D1 D2 / D3 D4 / H1 H2\n"
         "1. Stack N/S 2. Melee in, ranged out 3. Ranged in, melee out",
         strict=False)
    step(PH, PW, "⑧ stack เหนือ / ใต้ ล่อกรวยมีเส้นบอก", "⑧ Stack north / south for the telegraphed cones",
         "⑧ ทั้งปาร์ตี้ stack เป็น 2 จุด เหนือ / ใต้ ของบอส ล่อกรวยมีเส้นบอกชุดแรกจาก Living Liquid\n"
         "ภาพ: MT ฝั่งเหนือ คนที่เหลือ stack ฝั่งใต้",
         "⑧ The party stacks north and south of the boss to bait Living Liquid's first telegraphed cones\n"
         "Picture: the MT north, everyone else stacked south",
         strict=["MT"], pic=L(8), scene=S.p1_08())
    step(PH, PW, "⑨ กรวยไม่มีเส้นบอกชุดแรก", "⑨ The first untelegraphed cones",
         "⑨ MT, ST, D1, D2: อยู่ใกล้บอส รับกรวยชุดนี้\n"
         "H1, H2, D3, D4: ออกไปล่อ AoE (วงสีเหลือง) ให้ไกลจากบอส",
         "⑨ MT, ST, D1, D2: stay close and take these cones\n"
         "H1, H2, D3, D4: bait the AoEs (yellow circles) away from the bosses",
         strict=True, pic=L(9), scene=S.p1_09(),
         says={"MT": "ชิดบอส รับกรวย", "ST": "ชิดบอส รับกรวย", "D1": "ชิดบอส รับกรวย", "D2": "ชิดบอส รับกรวย",
               "H1": "ออกไปล่อ AoE ห่างบอส", "H2": "ออกไปล่อ AoE ห่างบอส", "D3": "ออกไปล่อ AoE ห่างบอส", "D4": "ออกไปล่อ AoE ห่างบอส"},
         says_en={"MT": "Close: take a cone", "ST": "Close: take a cone", "D1": "Close: take a cone", "D2": "Close: take a cone",
                  "H1": "Out: bait an AoE away", "H2": "Out: bait an AoE away", "D3": "Out: bait an AoE away", "D4": "Out: bait an AoE away"})
    step(PH, PW, "⑩ กรวยไม่มีเส้นบอกชุดที่ 2", "⑩ The second untelegraphed cones",
         "⑩ MT, ST, D1, D2: ถอยไปยืนระยะ max-melee จะได้ไม่ล่อกรวยชุดนี้\n"
         "H1, H2, D3, D4: กางเป็นพัดใต้วงเป้าของ Living Liquid เพื่อล่อกรวย",
         "⑩ MT, ST, D1, D2: back off to max melee so you don't bait these\n"
         "H1, H2, D3, D4: fan out under Living Liquid's target circle to bait them",
         strict=True, pic=L(10), scene=S.p1_10(),
         says={"MT": "ถอยไป max-melee", "ST": "ถอยไป max-melee", "D1": "ถอยไป max-melee", "D2": "ถอยไป max-melee",
               "H1": "เข้าใต้วงเป้าบอส กางพัด", "H2": "เข้าใต้วงเป้าบอส กางพัด", "D3": "เข้าใต้วงเป้าบอส กางพัด", "D4": "เข้าใต้วงเป้าบอส กางพัด"},
         says_en={"MT": "Back to max melee", "ST": "Back to max melee", "D1": "Back to max melee", "D2": "Back to max melee",
                  "H1": "In under the target circle, fanned out", "H2": "In under the target circle, fanned out",
                  "D3": "In under the target circle, fanned out", "D4": "In under the target circle, fanned out"})
    step(PH, PW, "⑪ Splash 6 ครั้ง + สายพายุ", "⑪ Six Splashes + the tornado tethers",
         "⑪ Living Liquid ใช้ Splash 6 ครั้ง\n"
         "พายุ 2 ลูกโยงสาย (tether) มาหาผู้เล่น 2 คน: ให้ Tank เป็นคนรับสาย จบด้วย AoE tankbuster วงกลมรอบตัวคนที่ติดสาย\n"
         "Melee ต้องหลบ AoE ของสาย Hand จึงหลุดระยะตีง่าย: Healer กับ Range เปลี่ยนไปตี Hand ได้ เพื่อคุม HP ให้ทัน Hand of Pain",
         "⑪ Living Liquid uses Splash six times\n"
         "Two tornadoes tether two players: the tanks take the tethers, which end in an AoE tank buster around the tethered player\n"
         "The melee avoid the tether AoEs, so the Hand easily ends up out of reach: healers and ranged can switch to the Hand to keep the HP in range for Hand of Pain",
         strict=["MT", "ST"], pic=L(11), scene=S.p1_11(), refs=[FR("ll-tethers")])

    PW2 = "Protean Wave #2"
    step(PH, PW2, "⑫ Cascade ครั้งที่ 2 + Throttle", "⑫ The second Cascade + Throttle",
         "⑫ Cascade ครั้งที่ 2 และ Hand ใช้ Hand of Pain\n"
         "ทุกคนหันตามแอ่งน้ำชุดใหม่\n"
         "MT, ST, D3, D4: stack รวมกันฝั่งเหนือ\n"
         "H1, H2, D1, D2: stack รวมกันฝั่งใต้\n\n"
         "สุ่ม 6 คนติด debuff Throttle: ต้องลบด้วย Esuna (หรือ Warden's Paean)\n"
         "H1, H2: Esuna คนที่ติด Throttle\n"
         "แบ่งกันแบบไหนก็ได้ ขอแค่ตกลงกัน แผนนี้ใช้ลำดับ\n"
         "H1 → MT ST H1 H2 D1 D2 D3 D4 ← H2\n"
         "(H1 ไล่จากซ้าย / H2 ไล่จากขวา)",
         "⑫ The second Cascade, and the Hand uses Hand of Pain\n"
         "Reorient to the new puddles\n"
         "MT, ST, D3, D4: stack together north\n"
         "H1, H2, D1, D2: stack together south\n\n"
         "Six random players get Throttle: it must be removed with Esuna (or Warden's Paean)\n"
         "H1, H2: Esuna the Throttled players\n"
         "Any split works as long as the healers agree; this plan's priority\n"
         "H1 → MT ST H1 H2 D1 D2 D3 D4 ← H2\n"
         "(H1 from the left / H2 from the right)",
         strict=True, pic=L(12), scene=S.p1_12(), refs=[FR("ll-throttle")])
    step(PH, PW2, "⑬ เริ่ม Protean Wave รอบ 2", "⑬ Protean Waves, round 2",
         "⑬ เหมือนรอบแรก: เริ่มด้วยกรวยมีเส้นบอก ล่อไปเหนือกับใต้ของ Living Liquid\n"
         "เคล็ดลับ: ถ้าตอนนี้ HP ทั้ง Living Liquid และ Hand เหลือราว 10–11% ทั้งปาร์ตี้เปลี่ยนไปตี Living Liquid ฆ่าให้ตายก่อน Hand of Pain ครั้งถัดไปได้",
         "⑬ As in round one: it starts with telegraphed cones baited north and south of Living Liquid\n"
         "Tip: if both Living Liquid and the Hand are around 10–11% HP here, the whole party can switch to Living Liquid and kill it before the next Hand of Pain",
         strict=True, pic=L(13), scene=S.p1_13())
    step(PH, PW2, "⑭ กรวยไม่มีเส้นบอกชุดแรกของ Living Liquid", "⑭ Living Liquid's first untelegraphed cones",
         "⑭ Living Liquid ยิงกรวยไม่มีเส้นบอกชุดแรก และ Hand ใช้ Hand of Pain ตรงนี้ด้วย\n"
         "H1, H2, D3, D4: ไปล่อ AoE ข้างแอ่งน้ำที่ได้รับมอบหมาย\n"
         "ถ้าจะใช้สกิลพุ่ง ให้รอเห็นกรวยมีเส้นบอกจากแอ่งน้ำก่อน เพราะเยื้องไปนิดหน่อย\n"
         "มาโคร: กลุ่ม ① MT ST D3 D4 / กลุ่ม ② H1 H2 D1 D2",
         "⑭ Living Liquid's first untelegraphed cones, and the Hand uses Hand of Pain here too\n"
         "H1, H2, D3, D4: bait the AoEs next to your assigned puddles\n"
         "If you plan to use a gap-closer, wait to see the puddles' telegraphed cones, as they are slightly offset\n"
         "Macro: group ① MT ST D3 D4 / group ② H1 H2 D1 D2",
         strict=["H1", "H2", "D3", "D4"], pic=L(14), scene=S.p1_14())
    step(PH, PW2, "⑮ กรวยมีเส้นบอกจากแอ่งน้ำชุดแรก", "⑮ The puddles' first telegraphed cones",
         "⑮ D1, D2: เตรียมล่อแอ่งน้ำฝั่งตะวันตก และฝั่งตะวันออก\n"
         "H1, H2, D3, D4: พอเส้นบอกของแอ่งน้ำขึ้นแล้ว เดินเข้าไปล่อกรวยของ Living Liquid\n"
         "แอ่งน้ำฝั่งตะวันออก H2 หรือ D4 ล่อก็ได้",
         "⑮ D1, D2: get ready to bait the west and east puddles\n"
         "H1, H2, D3, D4: once the puddles' telegraphs appear, move in to bait Living Liquid's cones\n"
         "The east puddle's cone can be baited by either H2 or D4",
         strict=True, pic=L(15), scene=S.p1_15(),
         says={"D1": "เตรียมล่อแอ่งตะวันตก", "D2": "เตรียมล่อแอ่งตะวันออก"}, says_en={"D1": "Ready for the west puddle", "D2": "Ready for the east puddle"})
    step(PH, PW2, "⑯ กรวยไม่มีเส้นบอกชุดที่ 2 ของ Living Liquid", "⑯ Living Liquid's second untelegraphed cones",
         "⑯ Living Liquid ยิงกรวยไม่มีเส้นบอกชุดที่ 2\n"
         "ภาพ: H1, H2, D3, D4 ชิดบอสรับกรวย / D1, D2 รอข้างแอ่งตะวันตกและตะวันออก",
         "⑯ Living Liquid's second untelegraphed cones\n"
         "Picture: H1, H2, D3, D4 close to the boss taking them / D1, D2 waiting by the west and east puddles",
         strict=True, pic=L(16), scene=S.p1_16())
    step(PH, PW2, "⑰ กรวยไม่มีเส้นบอกจากแอ่งน้ำชุดที่ 2", "⑰ The puddles' second untelegraphed cones",
         "⑰ แอ่งน้ำยิงกรวยไม่มีเส้นบอกชุดที่ 2\n"
         "ภาพ: MT พา Living Liquid ไปตะวันตกเฉียงเหนือ รับกรวยแอ่งเหนือ / D1 รับแอ่งตะวันตก / D2 รับแอ่งตะวันออก / ST พา Hand ไปตะวันออกเฉียงเหนือ\n"
         "ST: ถ้ามั่นใจ DPS ของปาร์ตี้ จะพา Hand ไปทางใต้แทนก็ได้ แต่ถ้า DPS ต่ำ Embolus อาจลอยผ่านกลางสนาม",
         "⑰ The puddles' second untelegraphed cones\n"
         "Picture: the MT takes Living Liquid north-west and the north puddle's cone / D1 the west puddle / D2 the east / the ST takes the Hand north-east\n"
         "ST: if you trust the party's DPS you can bring the Hand south instead, but with low DPS an Embolus may cross the middle",
         strict=["MT", "ST", "D1", "D2"], pic=L(17), scene=S.p1_17())
    step(PH, PW2, "⑱ Embolus โผล่: รวมบอส", "⑱ Embolus: stack the bosses",
         "⑱ Embolus โผล่อีกครั้ง\n"
         "MT, ST: พอ Hand เรืองแสงเป็นมือแบ พา Living Liquid กับ Hand มาซ้อนกันรับ Hand of Parting",
         "⑱ The Embolus orbs appear\n"
         "MT, ST: once the Hand glows as an open palm, stack Living Liquid and the Hand together for Hand of Parting",
         strict=["MT", "ST"], pic=L(18), scene=S.p1_18())
    step(PH, PW2, "⑲ Hand of Pain สุดท้าย → enrage", "⑲ The last Hand of Pain → enrage",
         "⑲ Hand ใช้ Hand of Pain ครั้งสุดท้าย: ถ้าปาร์ตี้ทุ่มตี Living Liquid ไปแล้ว ต้องฆ่าให้ตายก่อนท่านี้ลง\n"
         "หลังจากนั้น Living Liquid ใช้ Splash 6 ครั้ง แล้ว Fluid Swing ใส่ MT\n"
         "สุดท้ายร่าย Cascade อีกครั้ง = enrage ของ phase",
         "⑲ The Hand's last Hand of Pain: if the party went all in on Living Liquid, it must die before this resolves\n"
         "After it, Living Liquid uses Splash six times, then Fluid Swing on the MT\n"
         "Then one final Cascade: the phase's enrage",
         strict=["MT"], pic=L(19), scene=S.p1_19())
