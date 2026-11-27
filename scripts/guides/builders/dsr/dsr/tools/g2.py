"""P2 King Thordan (Tuufless: 02_thordan + mitigation)."""
from core import step, both, FR
import sc2 as S

P2 = ("P2 King Thordan", "P2 King Thordan")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))

step(P2, "Waymarks", "Marker ชุดที่ 2 (inner markers) ใช้ถึงจบไฟต์", "Waymark set 2 (inner markers), to the end",
     "ตั้งแต่ P2 PF ใช้ marker ชุด 'inner' (ใกล้กลาง) ชุดนี้ไปจนจบไฟต์ (macro อันที่ 2)\n"
     "A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก\n"
     "1 ตะวันออกเฉียงเหนือ / 2 ตะวันออกเฉียงใต้ / 3 ตะวันตกเฉียงใต้ / 4 ตะวันตกเฉียงเหนือ\n\n"
     "marker ทุกอันบอกขอบเขตของ:\n"
     "ท่าพุ่ง (charge) ตอนเริ่ม Strength of the Ward\n"
     "Drachenlance ของ Nidhogg\n\n"
     "marker ตัวเลข (เฉียง) ยังบอก:\n"
     "จุดยืนล่อ tower ใน P3 Nidhogg\n"
     "ขอบเขตของ Hot Tail ใน P6 Double Dragons",
     "From P2 the PF uses the 'inner' waymarks, kept to the end of the fight (the second macro)\n"
     "A north / B east / C south / D west\n"
     "1 north-east / 2 south-east / 3 south-west / 4 north-west\n\n"
     "Every marker shows the edge of:\n"
     "the charges at the start of Strength of the Ward\n"
     "Nidhogg's Drachenlance\n\n"
     "The numbered (intercardinal) markers also show:\n"
     "where to stand to bait the towers in P3 Nidhogg\n"
     "the edge of Hot Tail in P6 Double Dragons",
     strict=False, pic="markers_2.jpg", scene=S.waymarks())

step(P2, "Mitigation", "ชื่อย่อ mitigate ที่ใช้ในคู่มือนี้", "The mitigation shorthand used here",
     "แผน mitigate นี้เป็นโครงพื้นฐาน ไม่ใช่ทุก cooldown: เป็นสิ่งที่คนในปาร์ตี้มักมองหาเวลา mitigate ขาด\n\n"
     "Tank 30%: Vengeance / Sentinel / Shadow Wall / Nebula\n"
     "Tank 3rd: Thrill of Battle / Bulwark / Oblation / Camouflage\n"
     "Tank 90s (MT 90s / ST 90s): Shake It Off / Dark Missionary / Heart of Light / Divine Veil\n"
     "H1 120s: Temperance / Neutral Sect\n"
     "H1 180s: Liturgy of the Bell / Macrocosmos\n"
     "H2 30s: Sacred Soil / Kerachole\n"
     "H2 90s: Deployment Tactics / Zoe\n"
     "H2 120s: Expedient / Holos\n"
     "D1, D2: Feint\n"
     "D3: Troubadour / Tactician / Shield Samba\n"
     "D4: Addle\n\n"
     "ถือว่า H1 เป็น WHM หรือ AST: ถ้าปาร์ตี้มี barrier healer 2 คน ให้ปรับตาม",
     "This plan is a bare-bones framework, not every cooldown: it's what people look for when mitigation is missing\n\n"
     "Tank 30%: Vengeance / Sentinel / Shadow Wall / Nebula\n"
     "Tank 3rd: Thrill of Battle / Bulwark / Oblation / Camouflage\n"
     "Tank 90s (MT 90s / ST 90s): Shake It Off / Dark Missionary / Heart of Light / Divine Veil\n"
     "H1 120s: Temperance / Neutral Sect\n"
     "H1 180s: Liturgy of the Bell / Macrocosmos\n"
     "H2 30s: Sacred Soil / Kerachole\n"
     "H2 90s: Deployment Tactics / Zoe\n"
     "H2 120s: Expedient / Holos\n"
     "D1, D2: Feint\n"
     "D3: Troubadour / Tactician / Shield Samba\n"
     "D4: Addle\n\n"
     "H1 is assumed to be a WHM or AST: adapt it if the party has two barrier healers",
     strict=False)

step(P2, "Ascalon's Mercy Concealed", "เปิด P2: กรวยใส่ทุกคน + Ascalon's Might 3 ครั้ง", "P2 opener: cones on everyone + Ascalon's Might x3",
     "จุดเริ่มจริงของไฟต์: wipe หลังจากนี้กลับมาเริ่มที่ P2\n"
     "Thordan เริ่มด้วย auto-attack 2 ครั้ง แต่ละครั้งเป็น cleave เล็ก: หันบอสออกจากปาร์ตี้\n\n"
     "Ascalon's Mercy Concealed: ยิงกรวยแรงถึงตายใส่ทุกคน\n"
     "ทุกคน (ยกเว้น MT) stack ด้านหลัง Thordan เพื่อล่อ แล้วหลบออกด้านข้างตอนร่ายจบ\n\n"
     "จากนั้น Ascalon's Might (cleave ใหญ่) ใส่ MT 3 ครั้ง ก่อนเข้า Mechanic ใหญ่แรก\n"
     "Tip: WAR ใช้ Holmgang รับ Ascalon's Might ชุดนี้ แล้ว Holmgang จะกลับมาทันใช้ต่อ\n\n"
     "mitigate (Ascalon's Might x3): MT short / ST Reprisal, D1",
     "The real start of the fight: a wipe from here restarts at P2\n"
     "Thordan opens with two auto-attacks, each a small cleave: point him away from the party\n\n"
     "Ascalon's Mercy Concealed fires a lethal cone at every player\n"
     "Everyone except the MT stacks behind Thordan to bait them, and dodges to the side when the cast finishes\n\n"
     "Then three Ascalon's Might (large cleaves) on the MT before the first big Mechanic\n"
     "Tip: a WAR can Holmgang this set and have Holmgang back in time\n\n"
     "Mitigate (Ascalon's Might x3): MT short / ST Reprisal, D1",
     strict=False, **SAYS({"MT": ("หันบอสออกจากปาร์ตี้ รับ Ascalon's Might 3 ครั้ง (mitigate short)", "Point Thordan away; take the three Ascalon's Might (short mitigation)")}),
     refs=[FR("p2-mercy-concealed", "Fbb3L-aPJ3A", 60, "Ascalon's Mercy Concealed: ทุกคน (ยกเว้น MT) stack หลัง Thordan แล้วหลบออกข้างตอนร่ายจบ", "Ascalon's Mercy Concealed: all but the MT stack behind Thordan, then sidestep as the cast ends")])

SW = "Strength of the Ward"
step(P2, SW, "① แบ่ง 2 กลุ่มในช่องปลอดภัย", "① Two groups in the two safe sectors",
     "อัศวิน 3 ตัวโผล่นอกสนามแบบสุ่ม (ทิศหลัก/ทิศเฉียง) แต่ละตัวเตรียม Spiral Thrust พุ่งข้ามสนาม\n"
     "เส้นพุ่งไม่ทับกันเลย จึงเหลือช่องปลอดภัย 2 ช่องอยู่ตรงข้ามกัน\n"
     "ปาร์ตี้กระจายในช่องปลอดภัยทั้ง 2 เพราะ Thordan ยิง Lightning Storm (AoE รอบตัว) ใส่ทุกคน\n"
     "กลุ่ม MT: ช่องจากตะวันตกถึงตะวันออกเฉียงเหนือ\n"
     "กลุ่ม ST: ช่องจากตะวันตกเฉียงใต้ถึงตะวันออก\n"
     "Healer ยืนแถวหน้า (ใกล้กลาง): หลบเข้า Heavy Impact ได้ก่อน แล้ว heal GCD ใส่ทั้ง 2 กลุ่มได้อีกครั้งโดยไม่ใช้ Swiftcast\n\n"
     "Ser Guerrique (WAR) โผล่ห่างกลางสนามเล็กน้อยแบบสุ่ม แล้วเตรียม Heavy Impact\n"
     "จำไว้ว่า Guerrique อยู่ตรงไหนเทียบกับตัวเอง\n\n"
     "หาช่องปลอดภัยไม่ทัน: ตอน Thordan กระโดดออกไป ให้ไปยืนริมสนาม จะมองเห็นทั้งสนามง่ายกว่ายืนกลาง",
     "Three knights appear at random (inter)cardinals outside the arena, each preparing a Spiral Thrust dash across it\n"
     "The lines never overlap, leaving two safe sectors opposite each other\n"
     "Spread inside the two sectors: Thordan targets everyone with Lightning Storm (point-blank AoE)\n"
     "MT group: the sector from west to north-east\n"
     "ST group: the sector from south-west to east\n"
     "Healers in front (nearer the middle): they dodge into Heavy Impact early and get an extra GCD heal on both groups without Swiftcast\n\n"
     "Ser Guerrique (WAR) spawns a little off centre at a random (inter)cardinal and prepares Heavy Impact\n"
     "Note where Guerrique is relative to you\n\n"
     "Can't spot the safe sectors fast enough? When Thordan jumps away, go to the edge: it's far easier to see the whole arena from there",
     strict=True, pic="02/strength_of_the_ward_1_1.jpg", scene=S.sw1(1),
     **SAYS({"MT": ("กลุ่ม MT ช่องฝั่งเหนือ (ตะวันตก → ตะวันออกเฉียงเหนือ)", "MT group: the northern sector (west → north-east)"),
             "H1": ("แถวหน้าของกลุ่ม MT", "Front of the MT group"), "H2": ("แถวหน้าของกลุ่ม ST", "Front of the ST group"),
             "ST": ("กลุ่ม ST ช่องฝั่งใต้ (ตะวันตกเฉียงใต้ → ตะวันออก)", "ST group: the southern sector (south-west → east)")}),
     refs=[FR("p2-spiral-thrust", "obcSv6lApD4", 9, "อัศวิน 3 ตัวนอกสนามเตรียม Spiral Thrust: หาช่องปลอดภัย 2 ช่อง + จุดที่ Guerrique ยืน", "Three knights outside ready Spiral Thrust: find the two safe sectors + where Guerrique stands")])
step(P2, SW, "② Heavy Impact ลูกแรก", "② Heavy Impact, first hit",
     "Heavy Impact ลูกแรกลงพร้อม Spiral Thrust ทั้ง 3 และ Lightning Storm\n"
     "AoE ของ Heavy Impact จะกระจายเป็นวงออกไปเรื่อยๆ (ดูภาพถัดไป)\n"
     "เป้าหมาย: เข้าไปกลางสนาม พร้อมหลบวง Heavy Impact",
     "Heavy Impact's first hit goes off with the three Spiral Thrusts and Lightning Storm\n"
     "Heavy Impact keeps rippling outwards (next pictures)\n"
     "The goal: get to the middle of the arena while dodging it",
     strict=False, pic="02/strength_of_the_ward_1_2.jpg", scene=S.sw1(2))
step(P2, SW, "③ วงที่ 2 + อัศวิน 2 ตัวใกล้กลาง", "③ Second ring + two knights near the middle",
     "Heavy Impact วงที่ 2 ตอนนี้อัศวินโผล่อีก 4 ตัว\n"
     "สำคัญ: อัศวิน 2 ตัวโผล่ค่อนมาทางกลางสนาม ห่างกัน 90 องศา (ดาวแดงในภาพ)\n"
     "จำตำแหน่ง 2 ตัวนี้ไว้ ใช้หาทิศในส่วนที่ 2\n"
     "อัศวินตัวอื่นไม่ต้องสนใจ",
     "Heavy Impact's second hit. Four more knights appear now\n"
     "Key: two of them appear towards the middle, 90 degrees apart (the red stars)\n"
     "Remember where these two are: they orient part 2\n"
     "Ignore the other knights",
     strict=False, pic="02/strength_of_the_ward_1_3.jpg", scene=S.sw1(3),
     refs=[FR("p2-two-knights", "obcSv6lApD4", 12, "อัศวิน 2 ตัวโผล่ใกล้กลาง ห่างกัน 90 องศา: จำไว้ใช้หาทิศส่วนที่ 2", "Two knights near the middle, 90 degrees apart: remember them for part 2")])
step(P2, SW, "④ วงที่ 3 + stack 2 กลุ่ม", "④ Third ring + stack in two groups",
     "Heavy Impact วงที่ 3\n"
     "ตอนนี้ปาร์ตี้ควรอยู่ใกล้กลางแล้ว: stack เป็น 2 กลุ่ม ตรงข้ามกัน เพื่อล่อ Ascalon's Mercy Concealed จาก Thordan ที่กลางสนาม",
     "Heavy Impact's third hit\n"
     "The party should be near the middle now: stack in two groups opposite each other to bait Ascalon's Mercy Concealed from Thordan in the middle",
     strict=["MT", "ST"], pic="02/strength_of_the_ward_1_4.jpg", scene=S.sw1(4))
step(P2, SW, "⑤ วงที่ 4 + กรวย", "⑤ Fourth ring + the cones",
     "Heavy Impact วงที่ 4 ลงพร้อม Ascalon's Mercy Concealed: หลบกรวยออกด้านข้าง",
     "Heavy Impact's fourth hit goes off with Ascalon's Mercy Concealed: sidestep the cones",
     strict=False, pic="02/strength_of_the_ward_1_5.jpg", scene=S.sw1(5))
step(P2, SW, "ขอบเขต Heavy Impact แต่ละวง", "Each Heavy Impact ring's edge",
     "ส่วนที่ 1 ต้องฝึกหน่อย เพราะมีเรื่องให้ดูเยอะ\n"
     "ภาพนี้คือขอบเขตของ Heavy Impact แต่ละวง (1 = วงแรก ถึง 5) เมื่อ Guerrique อยู่ตำแหน่งนี้\n"
     "คนแถวหลังหลบ Heavy Impact ได้ด้วยการวิ่งตรงไปข้างหน้าเฉยๆ ตราบใดที่ Guerrique ไม่ได้อยู่ใน 3 ตำแหน่งที่ใกล้",
     "Part 1 takes some practice: there's a lot to take in\n"
     "This shows the edge of each Heavy Impact hit (1 = the first, to 5) for this Guerrique position\n"
     "Players on the back row can dodge Heavy Impact just by running forward, as long as Guerrique isn't on one of the three close positions",
     strict=False, pic="02/strength_of_the_ward_heavy_impact.jpg", scene=S.sw_hi())
step(P2, SW, "ส่วนที่ 2: หาทิศจากอัศวิน 2 ตัว", "Part 2: orient by the two knights",
     "อัศวิน 2 ตัวที่โผล่ใกล้กลางใน ③ ใช้กำหนดทิศของส่วนที่ 2: ถือว่า 2 ตัวนี้คือ 'ตะวันตกเฉียงใต้' และ 'ตะวันออกเฉียงใต้'\n"
     "เพราะ Thordan จะวาร์ปไปที่ 'ทิศเหนือ' ของอัศวิน 2 ตัวนี้\n"
     "ภาพต่อจากนี้หมุนให้ Thordan อยู่ด้านบน (Thordan = เหนือ)",
     "The two knights that appeared near the middle in ③ orient part 2: treat them as 'south-west' and 'south-east'\n"
     "Thordan teleports to 'north' relative to them\n"
     "The next pictures are turned so Thordan is at the top (Thordan = north)",
     strict=False,
     refs=[FR("p2-thordan-north", "obcSv6lApD4", 20, "Thordan วาร์ปไป 'ทิศเหนือ' ของอัศวิน 2 ตัวกลางสนาม: ใช้ Thordan เป็นเหนือ", "Thordan teleports to 'north' of the two middle knights: use him as north")])
step(P2, SW, "⑥ Skyward Leap + สาย Tank", "⑥ Skyward Leap + the tank tethers",
     "ใช้ Thordan เป็นทิศเหนือ:\n"
     "3 คนสุ่ม (ไม่ใช่ Tank) โดนมาร์ก Skyward Leap สีน้ำเงิน: ไปตะวันตก / ตะวันออก / ใต้\n"
     "คนมาร์กที่ตะวันตกและตะวันออก: ยืนห่างจาก Thordan ออกมานิด (ประมาณ 1–2 ขีด)\n\n"
     "อีก 3 คน (ไม่ใช่ Tank) ไปทางเหนือหา Thordan:\n"
     "2 คนในนี้จะโดนอัศวิน 2 ตัวผูกสาย\n"
     "คนสุดท้ายจะโดน stack (The Dragon's Rage)\n\n"
     "Tank 2 คนรับสาย 2 เส้น แล้วไขว้สาย: Holy Shield Bash แรงน้อยลงเมื่อสายยาวขึ้น ไขว้แล้วดาเมจน้อยสุด\n"
     "Tank วิ่งไม่ทัน: ไม่ต้องไปยืนข้างอัศวิน ให้รอทางเหนือ คนที่โดนสายเดินเอาสายมาให้เอง (เพราะเขาไม่โดน Skyward Leap จึงไปทางเหนืออยู่แล้ว)",
     "Using Thordan as north:\n"
     "Three random non-tanks get a blue Skyward Leap marker: they go west / east / south\n"
     "The marked players west and east stand slightly away from Thordan (about 1-2 notches)\n\n"
     "The other three non-tanks go north to Thordan:\n"
     "two of them will be tethered by the two knights\n"
     "the last one gets the stack (The Dragon's Rage)\n\n"
     "The two tanks take the two tethers and cross them: Holy Shield Bash does less damage the longer the tether, so crossing minimises it\n"
     "Tanks short on time: don't stand by the knights; wait north and let the tethered players bring the tethers (not being Skyward Leap targets, they head north anyway)",
     strict=["MT", "ST"], pic="02/strength_of_the_ward_2_1.jpg", scene=S.sw2(1),
     **SAYS({"MT": ("รับสายจากอัศวิน แล้วไขว้กับ ST", "Take a knight's tether and cross it with the ST"),
             "ST": ("รับสายจากอัศวิน แล้วไขว้กับ MT", "Take a knight's tether and cross it with the MT")}))
step(P2, SW, "⑦ บอก tower แล้วรวม stack", "⑦ Show your tower, then stack",
     "3 คน (ไม่ใช่ Tank) ที่อยู่กับ Thordan กระจายออกไปทาง tower ที่ตัวเองจะเหยียบสั้นๆ ให้คนอื่นเห็นว่าใครไป tower ไหน\n"
     "แล้วค่อยรวมกันตรงกลางเพื่อ stack",
     "The three non-tanks at Thordan briefly spread towards the tower each will take, so everyone sees who takes which\n"
     "then collapse together in the middle for the stack",
     strict=False)
step(P2, SW, "⑧ AoE ลง", "⑧ The AoEs go off",
     "คนมาร์กน้ำเงิน 3 คน: Skyward Leap วงใหญ่มากรอบตัว\n"
     "The Dragon's Rage (stack) ลง: แชร์กัน 3 คนที่ไม่โดนมาร์ก + Tank 2 คน\n"
     "Tank 2 คนโดน Holy Shield Bash คนละครั้ง\n\n"
     "mitigate: MT+ST 30% + short / MT 90s, D3 (รับสายและ Skyward Leap)",
     "The three blue-marked players: a huge Skyward Leap AoE around each\n"
     "The Dragon's Rage (stack): shared by the three unmarked players and the two tanks\n"
     "Each tank is hit by Holy Shield Bash\n\n"
     "Mitigate: MT+ST 30% + short / MT 90s, D3 (for the tethers and Skyward Leaps)",
     strict=["MT", "ST"], pic="02/strength_of_the_ward_2_2.jpg", scene=S.sw2(2))
step(P2, SW, "⑨ Tank โดน stun / ทุกคนเข้า tower", "⑨ The tanks are stunned / everyone takes a tower",
     "Tank 2 คนโดน stun แล้วโดน Holy Bladedance\nคนอื่นทั้งหมดเข้า tower ของตัวเอง",
     "The two tanks are stunned and hit by Holy Bladedance\nEveryone else enters their tower",
     strict=False, pic="02/strength_of_the_ward_2_3.jpg", scene=S.sw2(3),
     refs=[FR("p2-strength-towers", "obcSv6lApD4", 29, "tower 6 ลูก (เสาแสงในวงสีส้ม): ทุกคนที่ไม่ใช่ Tank เข้า tower ของตัวเอง", "Six towers (light pillars in orange rings): every non-tank takes their own")])
step(P2, "Ancient Quaga", "Ancient Quaga → Heavenly Heel → Ascalon's Might x3", "Ancient Quaga → Heavenly Heel → Ascalon's Might x3",
     "Thordan กลับมากลางสนามแล้วร่าย Ancient Quaga (raid-wide)\n"
     "mitigate: MT Reprisal, ST 90s, H2 30s, D4\n"
     "(ช้าสุดที่ Tank ใช้ 90s ได้แล้วยังกลับมาทัน Ultimate End และ Final Chorus)\n\n"
     "แล้ว Heavenly Heel (สลับ Tank: MT → ST) + Ascalon's Might 3 ครั้ง แล้ว Thordan ร่าย Sanctity of the Ward\n"
     "mitigate: MT+ST Rampart + 3rd / ST Reprisal, D2\n"
     "short ของ MT อาจยังไม่กลับมาตอน Heavenly Heel แต่ short ของ ST กลับมาทัน Ascalon's Might",
     "Thordan reappears in the middle and casts Ancient Quaga (raid-wide)\n"
     "Mitigate: MT Reprisal, ST 90s, H2 30s, D4\n"
     "(the latest the tanks can use their 90s and still have them for Ultimate End and Final Chorus)\n\n"
     "Then Heavenly Heel (tank swap: MT → ST) + three Ascalon's Might, then Thordan casts Sanctity of the Ward\n"
     "Mitigate: MT+ST Rampart + 3rd / ST Reprisal, D2\n"
     "The MT's short may not be back for Heavenly Heel, but the ST's short is back for Ascalon's Might",
     strict=False)

SS = "Sanctity of the Ward: Sacred Sever"
step(P2, SS, "กฎ: DRK-relative + role adjust", "Rules: DRK-relative, role adjust",
     "อัศวิน (PLD) 2 ตัวโผล่ทางตะวันออกและตะวันตกของกลางสนาม หันตามเข็มหรือทวนเข็มนาฬิกา\n"
     "Ser Zephirin (DRK) โผล่ค่อนออกนอก ที่ทิศเฉียง\n"
     "Thordan และ Dragon Eye โผล่ 2 จุดสุ่ม ห่างกัน 90 / 135 / 180 องศา (gaze)\n"
     "2 คนสุ่มได้เลข 1 และ 2 (จำนวนดาบบนหัว): Zephirin กระโดดใส่สลับ 1 กับ 2 รวม 4 ครั้ง ดาเมจแชร์กันในวง ยิ่งกระโดดไกลยิ่งเบา\n\n"
     "กลุ่ม 1 (MT H1 D1 D3): ฝั่งตรงข้าม DRK\n"
     "กลุ่ม 2 (ST H2 D2 D4): ฝั่งเดียวกับ DRK\n"
     "Rule 1: ถ้ามีดาบบนหัว ไปกลุ่มของเลขนั้น\n"
     "Rule 2: ถ้าไม่มี และคู่ role ของเรา (role เดียวกันอีกกลุ่ม) ได้ดาบของกลุ่มเรา ให้สลับกลุ่มกับเขา\n"
     "(เช่น D3 ได้ดาบ 2 → D4 สลับไปกลุ่ม 1)\n"
     "สลับ role เพื่อให้ทุกกลุ่มมี Healer 1 คนและมี 4 คน: ดาเมจต่อกลุ่มน้อยสุด และ heal ได้ทันระหว่าง 2 ครั้ง",
     "Two knights (PLDs) spawn a little east and west of the middle, facing clockwise or anti-clockwise\n"
     "Ser Zephirin (DRK) spawns towards the outside at an intercardinal\n"
     "Thordan and a Dragon Eye appear at two random spots 90, 135 or 180 degrees apart (gazes)\n"
     "Two random players get '1' and '2' (swords overhead): Zephirin jumps four times, alternating 1 and 2; the damage is shared and falls as the jump gets longer\n\n"
     "Group 1 (MT H1 D1 D3): opposite the DRK\n"
     "Group 2 (ST H2 D2 D4): the DRK's side\n"
     "Rule 1: a sword overhead → go to that group\n"
     "Rule 2: no sword, but your role partner (same role, other group) has your group's sword → swap groups with them\n"
     "(e.g. D3 gets the 2 sword → D4 swaps to group 1)\n"
     "The swap keeps one healer and four players in each group: least damage per group, with time to heal between its two hits",
     strict=False,
     refs=[FR("p2-sacred-sever", "GK96pk2c1Nc", 7, "Sacred Sever: อัศวิน 2 ตัวกลางสนาม (ดูทิศที่หัน) + DRK ที่ทิศเฉียง + ดาบบนหัว 2 คน", "Sacred Sever: two middle knights (note the facing) + the DRK at an intercardinal + two sword markers")])
for cw in (True, False):
    w = "ตามเข็ม" if cw else "ทวนเข็ม"
    we = "clockwise" if cw else "anti-clockwise"
    pre = "sanctity_drk_relative_" + ("cw" if cw else "ccw")
    step(P2, SS, f"อัศวินหัน{w} ①: เริ่ม 3–4 ขีด", f"Knights {we} ①: start 3-4 notches over",
         f"จัดกลุ่มตามดาบให้เสร็จ แล้วยืนห่างจากทิศเฉียง 3–4 ขีด ไปทางเดียวกับที่อัศวิน 2 ตัวกลางสนามหัน\n"
         f"หันหลังให้ทั้ง Thordan และ Dragon Eye\n\n"
         f"ตัวอย่าง: DRK อยู่ตะวันออกเฉียงใต้ อัศวินหัน{w}\n"
         f"กลุ่ม 1 เริ่ม{w} 3–4 ขีดจากทิศตรงข้าม (ตะวันตกเฉียงเหนือ)\n"
         f"กลุ่ม 2 เริ่ม{w} 3–4 ขีดจากทิศหลัง DRK (ตะวันออกเฉียงใต้)\n\n"
         + ("Tip: กลุ่มเริ่มเยื้องจากทิศเฉียง: แค่หันหน้าออกนอกสนามตรงๆ ก็หลบ gaze ได้ทั้ง 2 ตัว" if cw else
            "Tip: แค่หันหน้าออกนอกสนามตรงๆ จากจุดเริ่ม ก็หลบ gaze ได้ทั้ง 2 ตัว"),
         f"Sort out the swords, then start 3-4 notches from the intercardinals in the direction the two inner knights face\n"
         f"Look away from both Thordan and the Dragon Eye\n\n"
         f"Example: the DRK is SE and the knights face {we}\n"
         f"Group 1 starts 3-4 notches {we} of the opposite mark (NW)\n"
         f"Group 2 starts 3-4 notches {we} of the mark behind the DRK (SE)\n\n"
         + ("Tip: starting offset from the intercardinals, simply facing straight out dodges both gazes" if cw else
            "Tip: from the starting spots, simply facing straight out dodges both gazes"),
         strict=False, pic=f"02/{pre}_01.jpg", scene=S.sac(cw, 1))
    step(P2, SS, f"อัศวินหัน{w} ②: gaze + DRK กระโดด", f"Knights {we} ②: gazes + the DRK's jumps",
         "gaze 2 อันลง\nอัศวิน 2 ตัวเริ่มพุ่ง ทิ้งลูกบอลขาวและ AoE ตามทาง\nพร้อมกัน Ser Zephirin (DRK) กระโดดรวม 4 ครั้ง สลับคนดาบ 1 กับดาบ 2",
         "The two gazes resolve\nThe two knights start their dashes, dropping white balls and AoEs along the way\nAt the same time Ser Zephirin (DRK) jumps four times, alternating the 1-sword and 2-sword players",
         strict=False, pic=f"02/{pre}_02.jpg", scene=S.sac(cw, 2))
    step(P2, SS, f"อัศวินหัน{w} ③: เดินตามทิศอัศวิน", f"Knights {we} ③: move the way the knights faced",
         f"เดินไปทางเดียวกับที่อัศวินกลางสนามหัน ({w})\n"
         "รอให้ AoE ข้างหน้าระเบิดก่อน แล้วค่อยเดิน\n"
         + ("จังหวะเดินขึ้นกับว่าเดินไปทางเหนือ/ใต้ หรือตะวันออก/ตะวันตก แต่หลักเหมือนกัน" if cw else
            "รอบนี้ปาร์ตี้เดินไปทางตะวันออก/ตะวันตก จังหวะเดินจึงต่างจากแบบตามเข็ม"),
         f"Move the same way the inner knights faced ({we})\n"
         "Wait for the explosion in front of you to go off first, then move\n"
         + ("When to move depends on heading N/S or E/W, but the principle is the same" if cw else
            "Here the party heads E/W, so the timing differs from the clockwise example"),
         strict=False, pic=f"02/{pre}_03.jpg", scene=S.sac(cw, 3))
    step(P2, SS, f"อัศวินหัน{w} ④: หยุดก่อนเครื่องหมายขอบ 3 ขีด", f"Knights {we} ④: stop 3 notches short of the next shuriken",
         ("" if cw else "เมื่อลูกบอลข้างหน้าระเบิด เดินต่อ\n") + "หยุดห่างจากเครื่องหมาย 'shuriken' ถัดไปที่ขอบสนาม 3 ขีด",
         ("" if cw else "When the orbs in front explode, move on\n") + "Stop three notches short of the next 'shuriken' mark at the edge",
         strict=False, pic=f"02/{pre}_04.jpg", scene=S.sac(cw, 4))

MT_ = "Sanctity of the Ward: Meteors"
step(P2, MT_, "① แยกเป็นคู่ + สลับให้มาร์กอยู่เหนือ/ใต้", "① Split into pairs + swap so the marks are N/S",
     "แยกไปคู่ที่กำหนด: MT·D3 เหนือ / H1·D1 ตะวันตก / H2·D2 ตะวันออก / ST·D4 ใต้\n"
     "ตอนมาร์ก Meteor ขึ้น 2 คน:\n"
     "ดูว่าโดน Tank/Healer 2 คน หรือ DPS 2 คน: role นั้นเรียกว่า 'Meteor role' อีก role คือ 'Non-meteor'\n"
     "สลับคนให้ 2 คนที่โดนมาร์กอยู่เหนือและใต้\n"
     "ถ้าคนโดนอยู่ตะวันออกและตะวันตก: ตะวันตกสลับกับเหนือ / ตะวันออกสลับกับใต้\n"
     "(ภาพ: H1 สลับกับ MT)",
     "Split into the set pairs: MT·D3 north / H1·D1 west / H2·D2 east / ST·D4 south\n"
     "When the two Meteor markers appear:\n"
     "check whether they're on two tanks/healers or two DPS: that role is the 'Meteor role', the other the 'Non-meteor' role\n"
     "swap players so the two marked players are north and south\n"
     "if they're east and west: west swaps with north, east swaps with south\n"
     "(Picture: H1 and MT swap)",
     strict=True, pic="02/meteors_01_01.jpg", scene=S.met(1, 1),
     refs=[FR("p2-meteor-marks", "GK96pk2c1Nc", 60, "มาร์ก Meteor 2 คน: ดูว่าเป็น T/H หรือ DPS แล้วสลับให้อยู่เหนือ/ใต้", "Two Meteor markers: T/H or DPS? Swap so they're north and south")])
step(P2, MT_, "② ทิ้งน้ำแข็ง แล้วไป tower", "② Drop the ice, then take towers",
     "แต่ละคู่โดนวงน้ำแข็ง (ice puddle) แล้วแยกไป tower ของตัวเอง\n\n"
     "Meteor role:\n"
     "เหยียบ tower วงนอกเสมอ\n"
     "ถ้าอยู่เหนือหรือใต้: สำคัญสุดคือเลี่ยงแบบ 'cursed' ที่คน Meteor 2 คนเริ่มฝั่งตะวันตกหรือตะวันออกเดียวกัน\n"
     "นอกนั้น ถ้าวงนอกมี tower มากกว่า 1: เอาอันแรกตามลำดับ กลาง > ทวนเข็ม > ตามเข็ม\n"
     "เหยียบ tower ให้ชิดเส้นเหนือ–ใต้ที่สุด (ดูตำแหน่ง H1 ในภาพ)\n\n"
     "Non-meteor role:\n"
     "ส่วนของเรามี tower วงนอก 2 อัน: ออกไปเอาอันที่ 2 (ลำดับเดียวกัน)\n"
     "ส่วนของเรามี tower วงนอกแค่ 1 อัน: เข้าไปข้างใน\n"
     "ข้างในมี tower ถัดไปตามเข็มจากวงน้ำแข็งของเรา: เอาอันนั้น\n"
     "ไม่มี: ปรับไปเอา tower ข้างในที่เหลือ\n\n"
     "ก่อนรวม stack เป็นคู่ เดินไปทาง tower ที่จะเอาสักนิดเพื่อบอกคนอื่น โดยเฉพาะคู่เหนือ/ใต้ ช่วยกันเลี่ยงแบบ cursed",
     "Each pair gets an ice puddle, then everyone splits to their towers\n\n"
     "Meteor role:\n"
     "always take an outside tower\n"
     "north or south: first avoid a 'cursed' set-up where both Meteor players start on the same west or east side\n"
     "otherwise, if the outside has more than one tower, take the first by: centre > ccw > cw\n"
     "take your tower as close to the N/S line as you can (see H1)\n\n"
     "Non-meteor role:\n"
     "two outside towers in your quarter: go out and take the second (same priority)\n"
     "only one outside tower: go in\n"
     "a tower immediately clockwise of your ice puddle: take it\n"
     "none: adjust to take any inside tower left\n\n"
     "Before stacking in pairs, drift towards the tower you'll take to show the others, especially N/S, to avoid a cursed set-up",
     strict=True, pic="02/meteors_01_03.jpg", scene=S.met(1, 2),
     refs=[FR("p2-sanctity-towers", "GK96pk2c1Nc", 30, "tower ชุดแรก: วงนอก 5–6 อัน + วงใน", "The first towers: five or six outside + some inside")])
step(P2, MT_, "③ Meteor ตกตามเข็ม / tower ชุดแรก", "③ Meteors clockwise / the first towers",
     "tower ชุดแรกลง Meteor 7 ลูกตกทีละลูกใส่ 2 คนที่โดนมาร์ก: Meteor 2 ลูกห้ามตกใกล้กัน ไม่งั้น wipe\n"
     "พร้อมกัน tower 8 อันโผล่วงนอก ทั้ง 8 ทิศ\n\n"
     "คนโดน Meteor: วิ่งวนตามเข็มรอบสนามทิ้ง Meteor\n"
     "Meteor role อีก 2 คน (ไม่ได้โดน Meteor): เอา tower ตะวันออก / ตะวันตก\n"
     "Non-meteor: เอา tower เฉียงที่อยู่ถัดไปตามเข็มจากวงน้ำแข็งของตัวเอง\n"
     "ถ้าอยู่ข้างใน: ยืนให้ knockback ดันเข้า tower นั้นพอดี",
     "The first towers resolve. Seven Meteors drop one by one on the two marked players: two Meteors near each other wipes the raid\n"
     "Meanwhile eight towers spawn outside, one in each of the eight directions\n\n"
     "Meteor players: run clockwise round the arena dropping Meteors\n"
     "The other two Meteor-role players: take the east / west towers\n"
     "Non-meteor players: take the intercardinal tower clockwise of your ice puddle\n"
     "Inside? line up to be knocked back into that tower",
     strict=True, pic="02/meteors_01_04.jpg", scene=S.met(1, 3))
step(P2, MT_, "④ Meteor ลูกที่ 5: knockback", "④ The fifth Meteor: knockback",
     "Meteor ลูกที่ 5 ตก:\n"
     "คนวงนอก: ใช้ Arm's Length / Surecast กัน knockback\n"
     "คนข้างใน: ปล่อยให้ knockback ดันไป tower เฉียงของตัวเอง",
     "When the fifth Meteor lands:\n"
     "outside players use anti-knockback (Arm's Length / Surecast)\n"
     "inside players get knocked back into their intercardinal towers",
     strict=True, pic="02/meteors_01_05.jpg", scene=S.met(1, 5))
for ex, (who, swap, swap_en) in {2: ("D1, D2", "D1 (ตะวันตก) สลับกับ D3 (เหนือ)\nD2 (ตะวันออก) สลับกับ D4 (ใต้)", "D1 (west) swaps with D3 (north)\nD2 (east) swaps with D4 (south)"),
                                  3: ("D1, D3", "D1 (ตะวันตก) สลับกับ D4 (ใต้)", "D1 (west) swaps with D4 (south)")}.items():
    p = f"02/meteors_0{ex}_0"
    step(P2, MT_, f"ตัวอย่าง {ex} ({who} โดน Meteor) ①: สลับคู่", f"Example {ex} ({who} Meteors) ①: the swap",
         f"แยกไปคู่ที่กำหนด {who} โดนมาร์ก:\n{swap}\nDPS เป็น Meteor role / T·H เป็น Non-meteor",
         f"Split into the pairs; {who} are marked:\n{swap_en}\nDPS are the Meteor role, T/H the Non-meteors",
         strict=True, pic=p + "1.jpg", scene=S.met(ex, 1))
    step(P2, MT_, f"ตัวอย่าง {ex} ②: วงน้ำแข็ง", f"Example {ex} ②: the ice puddles",
         "สลับคนเสร็จ วงน้ำแข็งลงที่แต่ละคู่", "After the swaps, the ice puddles drop on each pair",
         strict=True, pic=p + "2.jpg", scene=S.met(ex, 2))
    if ex == 2:
        n3 = ("เหนือ: Meteor (D1) เอา tower กลางตามลำดับ / Non-meteor (MT) เอา tower วงนอกที่เหลือ\n"
              "ใต้: Meteor (D2) เอา tower วงนอกอันเดียว / Non-meteor (ST) เข้าข้างใน เอา tower ถัดไปตามเข็ม (ตะวันตกเฉียงใต้)\n"
              "ตะวันออก: Meteor (D4) เอา tower วงนอกอันเดียว / Non-meteor (H2) เข้าข้างใน เอา tower ถัดไปตามเข็ม (ตะวันออกเฉียงใต้)\n"
              "ตะวันตก: Meteor (D3) เอา tower วงนอกอันเดียว / Non-meteor (H1) เข้าข้างใน: ไม่มี tower ถัดไปตามเข็ม H1 จึงปรับไปอันที่เหลือ (ตะวันออกเฉียงเหนือ)")
        n3e = ("North: Meteor (D1) takes the centre tower by priority / Non-meteor (MT) takes the other outside tower\n"
               "South: Meteor (D2) takes the lone outside tower / Non-meteor (ST) goes in to the next tower clockwise (SW)\n"
               "East: Meteor (D4) takes the lone outside tower / Non-meteor (H2) goes in to the next tower clockwise (SE)\n"
               "West: Meteor (D3) takes the lone outside tower / Non-meteor (H1) goes in: no tower clockwise, so H1 flexes (NE)")
        n4 = ("D1 และ D2 วิ่งทิ้ง Meteor ตามเข็ม\nD3 และ D4 เอา tower ตะวันออก/ตะวันตก\n"
              "MT ไป tower เฉียงถัดไปตามเข็มจากวงน้ำแข็ง (ตะวันออกเฉียงเหนือ)\nST และ H2 อยู่ตำแหน่งแล้ว\n"
              "H1 ยืนให้ knockback ดันไป tower ถัดไปตามเข็มจากวงน้ำแข็งเดิม (ตะวันตกเฉียงเหนือ)")
        n4e = ("D1 and D2 drop Meteors clockwise\nD3 and D4 take the east / west towers\n"
               "MT takes the intercardinal tower clockwise of their ice puddle (NE)\nST and H2 are already in place\n"
               "H1 lines up to be knocked back to the tower clockwise of their original ice puddle (NW)")
    else:
        n3 = ("แบบนี้ทำตามลำดับเป๊ะๆ แล้วยากขึ้น: D1 เหลือแค่ tower ตามเข็ม ดังนั้น (ถ้าทำได้) D3 ควรเอา tower ตามเข็มด้วย แม้ผิดลำดับ\n"
              "MT กับ D3 คุยกันก่อน stack คู่\nเหยียบ tower ชิดเส้นเหนือ–ใต้ ช่วยให้มีที่ว่างที่สุดแม้เป็นแบบ cursed\n\n"
              "เหนือ: Meteor (D3) เอา tower ทวนเข็ม (ถ้าทำตามลำดับเป๊ะ) / Non-meteor (MT) เอา tower วงนอกที่เหลือ\n"
              "ใต้: Meteor (D1) เอา tower วงนอกอันเดียว / Non-meteor (ST) เข้าข้างใน: ไม่มี tower ถัดไปตามเข็ม จึงปรับ\n"
              "ตะวันออก: Meteor (D2) เอา tower ทวนเข็มตามลำดับ / Non-meteor (H2) เอา tower วงนอกอีกอัน\n"
              "ตะวันตก: Meteor (D4) เอา tower วงนอกอันเดียว / Non-meteor (H1) เข้าข้างใน: ไม่มี tower ถัดไปตามเข็ม จึงปรับ")
        n3e = ("Here following the priority blindly makes things harder: D1 only has the CW tower, so ideally D3 also takes their CW tower, breaking the priority\n"
               "MT and D3 sort it out just before stacking\nTowers taken close to the N/S line leave the most room, even when cursed\n\n"
               "North: Meteor (D3) takes the ccw tower (following the priority blindly) / Non-meteor (MT) takes the other outside tower\n"
               "South: Meteor (D1) takes the lone outside tower / Non-meteor (ST) goes in: no tower clockwise, so ST flexes\n"
               "East: Meteor (D2) takes the ccw outside tower by priority / Non-meteor (H2) takes the other outside tower\n"
               "West: Meteor (D4) takes the lone outside tower / Non-meteor (H1) goes in: no tower clockwise, so H1 flexes")
        n4 = ("D1 และ D3 วิ่งทิ้ง Meteor ตามเข็ม\nD2 และ D4 เอา tower ตะวันออก/ตะวันตก\n"
              "MT และ H2 ไป tower เฉียงถัดไปตามเข็มจากวงน้ำแข็ง (ตะวันออกเฉียงเหนือ / ตะวันออกเฉียงใต้)\n"
              "ST และ H1 ยืนให้ knockback ดันไป tower ถัดไปตามเข็มจากวงน้ำแข็งเดิม (ตะวันตกเฉียงใต้ / ตะวันตกเฉียงเหนือ)")
        n4e = ("D1 and D3 drop Meteors clockwise\nD2 and D4 take the east / west towers\n"
               "MT and H2 take the intercardinal tower clockwise of their ice puddle (NE and SE)\n"
               "ST and H1 line up to be knocked back to the tower clockwise of their original ice puddle (SW and NW)")
    step(P2, MT_, f"ตัวอย่าง {ex} ③: แยกไป tower", f"Example {ex} ③: to the towers", n3, n3e,
         strict=True, pic=p + "3.jpg", scene=S.met(ex, 3))
    step(P2, MT_, f"ตัวอย่าง {ex} ④: Meteor + tower ชุดแรก", f"Example {ex} ④: Meteors + the first towers", n4, n4e,
         strict=True, pic=p + "4.jpg", scene=S.met(ex, 4))
    step(P2, MT_, f"ตัวอย่าง {ex} ⑤: knockback", f"Example {ex} ⑤: the knockback",
         "Meteor ลูกที่ 5: คนวงนอกกัน knockback / คนข้างในโดนดันเข้า tower เฉียง",
         "Fifth Meteor: outside players use anti-knockback / inside players are knocked into the intercardinal towers",
         strict=True, pic=p + "5.jpg", scene=S.met(ex, 5))
step(P2, MT_, "แบบ cursed: ทำยังไง", "Cursed towers: what to do",
     "วงนอกมี tower อย่างน้อย 5 อันเสมอ จึงมีคู่ตำแหน่งที่ไม่ cursed เสมอ แต่ไม่จำเป็นต้องเป็นเหนือ/ใต้\n"
     "มี voice: บอกให้คู่ Meteor ไปตะวันออก/ตะวันตกแทนได้ (แต่ไม่ค่อยมีใครทำ)\n"
     "โอกาสโดน cursed เหนือ/ใต้แบบบังคับ: 1 ใน 15 (ประมาณ 6.67%)\n\n"
     "รอบสนามมี 90 ขีด: ถ้าเจอ cursed (120 องศา) มี 30 ขีดสำหรับช่องว่าง 7 ช่องระหว่าง Meteor = ช่องละ 4 ขีดนิดๆ",
     "There are always at least five outside towers, so there is always a non-cursed pair of positions, though not necessarily N/S\n"
     "With voice comms you can send the Meteor pairs east/west instead (rarely done)\n"
     "The chance of a forced N/S cursed pattern: 1 in 15 (about 6.67%)\n\n"
     "The arena has 90 notches: in the cursed (120-degree) pattern you have 30 notches for seven gaps between Meteors, just over four notches each",
     strict=False)
step(P2, "Ultimate End", "Ultimate End → Broad Swing → enrage", "Ultimate End → Broad Swing → enrage",
     "หลัง Sanctity of the Ward Thordan กลับมาทางเหนือแล้วร่าย Ultimate End (ไม่มี cast bar ให้เห็น)\n"
     "raid-wide แรงมาก ต้อง mitigate: MT Reprisal, MT 90s, H2 30s, D1, D4\n"
     "(H2 90s ใช้ไปตอน Sanctity of the Ward: ใช้ก่อน Ascalon's Might ครั้งที่ 3 จะกลับมาทัน Final Chorus)\n\n"
     "แล้ว Thordan เหวี่ยง Broad Swing 2 ชุด: แต่ละชุด ปาร์ตี้หลบจากหลัง Thordan ไปด้านหน้าซ้ายหรือหน้าขวา แล้วแต่ว่าฟันข้างไหนก่อน\n"
     "ครบ 2 ชุด Thordan ร่าย Aetheric Burst = enrage ของ P2",
     "After Sanctity of the Ward, Thordan reappears north and casts Ultimate End (no visible cast bar)\n"
     "A very heavy raid-wide that must be mitigated: MT Reprisal, MT 90s, H2 30s, D1, D4\n"
     "(H2 90s went on Sanctity of the Ward: use it before the third Ascalon's Might so it's back for Final Chorus)\n\n"
     "Thordan then does two sets of Broad Swing: each time, dodge from behind Thordan to his front-left or front-right, depending on which side he cleaves first\n"
     "After both, Thordan casts Aetheric Burst, P2's hard enrage",
     strict=False)
