"""P5 Alternate Timeline Thordan (Tuufless: 05_alternate_thordan + mitigation)."""
from core import step, both, FR
import sc5 as S

P5 = ("P5 Alternate Timeline Thordan", "P5 Alternate Timeline Thordan")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))

step(P5, "Incarnation", "เปิด P5: MT ใต้ / ปาร์ตี้เหนือ", "P5 opener: MT south / party north",
     "Thordan โผล่กลางสนาม หันไปทางใต้ แล้วร่าย Incarnation (ชุบมังกรที่นอนอยู่รอบสนาม) และ The Dragon's Eye (บัฟเพิ่มดาเมจ)\n"
     "ระหว่างร่าย 2 อันนี้ Thordan ไม่ขยับไม่หัน: MT เริ่มทางใต้ ปาร์ตี้อยู่ทางเหนือ\n"
     "Thordan auto-attack MT 2 ครั้ง (เป็นกรวย!) แล้วกระโดดไปกลางสนาม เริ่ม Wrath of the Heavens\n\n"
     "Tank ไม่ใช้ 30% ใน P5: เก็บไว้ให้ Wyrmsbreath ของ P6 ที่แรงกว่าและพลาดแล้วเสียหายกว่า (P5 สั้น ใช้ตอน Heavenly Heel ครั้งแรกอาจกลับมาไม่ทัน)",
     "Thordan appears in the middle facing south and casts Incarnation (revives the dragons around the arena) and The Dragon's Eye (a damage-up buff)\n"
     "He doesn't move or turn during these: the MT starts south, the party north\n"
     "Thordan auto-attacks the MT twice (cones!), then jumps to the middle for Wrath of the Heavens\n\n"
     "Tanks don't use their 30% in P5: keep it for P6's Wyrmsbreaths, which hit harder and punish a tank death more (P5 is short; a 30% used at the first Heavenly Heel may not be back)",
     strict=False, **SAYS({"MT": ("เริ่มทางใต้ของ Thordan", "Start south of Thordan")}))

W = "Wrath of the Heavens"
step(P5, W, "① มังกรขาว = เหนือ: เข้าตำแหน่ง", "① White dragon = north: get in place",
     "มังกรขาวกับอัศวิน 2 ตัวโผล่ที่ขอบทิศหลักแบบสุ่ม: ใช้มังกรขาวเป็นทิศเหนือ\n"
     "คนมาร์ก Skyward Leap (น้ำเงิน) 1 คน: ไปตะวันตกเฉียงเหนือ (ห่าง shuriken 4 ขีด)\n"
     "คนโดนสาย Spiral Thrust 2 คน: ไขว้สาย แล้วยืนทางใต้ (ห่างจากตะวันตกเฉียงใต้และตะวันออกเฉียงใต้ 4 ขีด)\n"
     "คนที่เหลือ: เรียงแถวฝั่งตะวันออก (ภายใน 4 ขีดจาก shuriken ตะวันออกเฉียงเหนือและตะวันออกเฉียงใต้)\n"
     "เรียงหลวมๆ ได้ เช่น Tank/Healer ใกล้มังกร DPS ห่างออกไป แต่ไม่สำคัญ\n\n"
     "mitigate: H2 90s / shield แรงๆ ช่วยได้เพราะปาร์ตี้กระจาย\n"
     "PF ใช้ automarker มาร์กคนโดนสายฟ้า (ใช้ด้วยความเสี่ยงของตัวเอง)",
     "A white dragon with two knights appears at a random cardinal edge: use the white dragon as north\n"
     "The blue Skyward Leap player: go north-west (4 notches from the shuriken)\n"
     "The two Spiral Thrust tethers: cross them and stand south (4 notches from SW and SE)\n"
     "Everyone else: line up along the east side (within 4 notches of the NE and SE shurikens)\n"
     "A loose order works (tanks/healers towards the dragons, DPS away) but it isn't important\n\n"
     "Mitigate: H2 90s / strong shields help because the party is spread\n"
     "PF uses automarkers to mark the Thunder players (use at your own risk)",
     strict=False, pic="05/wrath_of_the_heavens_01.jpg", scene=S.wrath(1),
     refs=[FR("p5-spiral-tethers", "biN5YkjijIs", 165, "สาย Spiral Thrust 2 เส้น (เส้นสายฟ้าสีเหลือง): คนโดนสายไขว้กันแล้วยืนทางใต้", "The two Spiral Thrust tethers (yellow lightning lines): cross them and stand south")])
step(P5, W, "② ดูว่าตัวไหน WAR ตัวไหน BLM", "② Spot the WAR and the BLM",
     "Ser Grinnaux (WAR) และ Ser Charibert (BLM) โผล่ในสนาม ตัวหนึ่งเหนือ อีกตัวใต้ แบบสุ่ม\n"
     "ดูให้ออกว่าตัวไหน Grinnaux (WAR) ตัวไหน Charibert (BLM)\n"
     "2 คนได้ดีบัฟ Thunderstruck (ลงทีหลัง)",
     "Ser Grinnaux (WAR) and Ser Charibert (BLM) appear in the arena, one north and one south, at random\n"
     "Work out which is Grinnaux (WAR) and which is Charibert (BLM)\n"
     "Two players get a Thunderstruck debuff, which resolves later",
     strict=False, pic="05/wrath_of_the_heavens_02.jpg", scene=S.wrath(2),
     refs=[FR("p5-wrath-knights", "3M8dUee9b8Q", 330, "Ser Grinnaux (WAR) และ Ser Charibert (BLM) ในสนาม: ดูให้ออกว่าตัวไหนเป็นตัวไหน", "Ser Grinnaux (WAR) and Ser Charibert (BLM) in the arena: tell which is which")])
step(P5, W, "③ AoE ลง + มาร์ก divebomb", "③ The AoEs + the divebomb mark",
     "Skyward Leap และ Spiral Thrust ลง (คนโดนได้ Magic Vulnerability Up)\n"
     "1 ใน 5 คนฝั่งตะวันออกได้มาร์ก divebomb สีเขียว\n"
     "ทุกคนขยับหลบ Twister",
     "Skyward Leap and Spiral Thrust resolve (their targets get Magic Vulnerability Up)\n"
     "One of the five on the east gets a green divebomb mark\n"
     "Everyone moves to dodge the Twisters",
     strict=False, pic="05/wrath_of_the_heavens_03.jpg", scene=S.wrath(3),
     refs=[FR("p5-twister", "biN5YkjijIs", 15, "Twister ใต้เท้า: ขยับหลบทันที แล้วกระจายรอบสนาม", "A Twister underfoot: move off it at once, then spread round the arena")])
step(P5, W, "④ หลบ Twister + กระจาย", "④ Dodge the Twisters + spread",
     "ระหว่างหลบ Twister ทุกคนกระจายรอบสนาม:\n"
     "3 คนที่โดน Skyward Leap และ Spiral Thrust 2 เส้น: หลบไปตามเข็มเสมอ\n"
     "คนมาร์ก divebomb: ไปขอบสนามด้านหลัง Ser Charibert (BLM)\n"
     "อีก 4 คน: กระจายฝั่งตะวันออก\n"
     "เว้นอย่างน้อย 2 ช่องพื้นระหว่างคน\n"
     "อย่ายืนใกล้ Ser Grinnaux (WAR) เกินไป จะทำให้ AoE ที่ตามมาตัดทางเข้าที่ปลอดภัย",
     "While dodging the Twisters, everyone spreads round the arena:\n"
     "the three who had Skyward Leap and the two Spiral Thrusts always dodge clockwise\n"
     "the divebomb mark goes to the edge behind Ser Charibert (BLM)\n"
     "the other four spread along the east side\n"
     "keep at least two floor tiles between players\n"
     "don't stand too close to Ser Grinnaux (WAR), or the incoming AoEs may cut off the safe area",
     strict=False, pic="05/wrath_of_the_heavens_04.jpg", scene=S.wrath(4))
step(P5, W, "⑤ Ascalon's Mercy Revealed + มาร์กล่อ AoE", "⑤ Ascalon's Mercy Revealed + the baited AoEs",
     "Thordan ใช้ Ascalon's Mercy Revealed (กรวยใส่ทุกคน) แล้ว AoE ให้ล่อขึ้นที่ 2 คน:\n"
     "1 คนจากกลุ่ม Skyward Leap / Spiral Thrust / divebomb: Altar Pyre 4 ลูก\n"
     "1 ใน 4 คนที่เหลือ: Liquid Heaven 5 ลูก\n"
     "คนมี Thunderstruck จะไม่โดน Altar Pyre หรือ Liquid Heaven",
     "Thordan resolves Ascalon's Mercy Revealed (a cone on everyone), then baited AoEs appear on two players:\n"
     "one of the Skyward Leap / Spiral Thrust / divebomb players gets four Altar Pyres\n"
     "one of the other four gets five Liquid Heavens\n"
     "A Thunderstruck player is never targeted by Altar Pyre or Liquid Heaven",
     strict=False, pic="05/wrath_of_the_heavens_05.jpg", scene=S.wrath(5))
step(P5, W, "⑥ ล่อ AoE แล้วไปหา Grinnaux", "⑥ Bait the AoEs, then go to Grinnaux",
     "ล่อ Altar Pyre และ Liquid Heaven แล้วเดินไปหา Ser Grinnaux (WAR)\n"
     "คน Thunderstruck 2 คน: อยู่ฝั่งนอก\n"
     "คนอื่น: stack กันฝั่งกลางสนาม\n"
     "คนฝั่งตะวันออกที่โดน Liquid Heaven: เข้าจุดปลอดภัยจากด้านข้าง เพราะคนฝั่งตะวันตกโดน Liquid Heaven ทีเดียวตาย (ติด Magic Vulnerability Up)",
     "Bait Altar Pyre and Liquid Heaven, then move towards Ser Grinnaux (WAR)\n"
     "The two Thunderstruck players: towards the outside\n"
     "Everyone else: stack towards the middle\n"
     "The east player with Liquid Heaven should enter the safe spot from the side: a west player hit by it dies (Magic Vulnerability Up)",
     strict=False, pic="05/wrath_of_the_heavens_06.jpg", scene=S.wrath(6))
step(P5, W, "⑦ Empty Dimension + Thunderstruck + divebomb", "⑦ Empty Dimension + Thunderstruck + divebombs",
     "Empty Dimension ของ Grinnaux ลงพร้อม Thunderstruck 2 ลูก และ divebomb 2 เส้น\nheal แล้วเตรียม Ancient Quaga",
     "Grinnaux's Empty Dimension resolves with the two Thunderstrucks and the two divebombs\nHeal up and get ready for Ancient Quaga",
     strict=False, pic="05/wrath_of_the_heavens_07.jpg", scene=S.wrath(7))
step(P5, "Ancient Quaga", "Ancient Quaga → Heavenly Heel → Ascalon's Might x3", "Ancient Quaga → Heavenly Heel → Ascalon's Might x3",
     "Ancient Quaga ครั้งที่ 1: MT Reprisal, MT 90s, H2 30s, D1, D3 (Addle เกินจำเป็นตรงนี้ เก็บไว้ครั้งที่ 2)\n\n"
     "Thordan auto-attack MT 1 ครั้ง แล้ว Heavenly Heel → Ascalon's Might 3 ครั้ง\n"
     "Tip: WAR ใช้ Holmgang รับชุดนี้ แล้ว Holmgang กลับมาทัน Cauterize ตอนท้าย P6\n"
     "mitigate: MT+ST Rampart + short / ST Reprisal, D2 / ถ้าไม่ได้ Holmgang ให้สลับ Tank\n"
     "จากนั้น Thordan เริ่ม Death of the Heavens",
     "Ancient Quaga 1: MT Reprisal, MT 90s, H2 30s, D1, D3 (Addle is overkill here; save it for the second)\n\n"
     "Thordan auto-attacks the MT once, then Heavenly Heel → three Ascalon's Might\n"
     "Tip: a WAR can Holmgang this combo and have Holmgang back for Cauterize at the end of P6\n"
     "Mitigate: MT+ST Rampart + short / ST Reprisal, D2 / tank swap if it wasn't taken with Holmgang\n"
     "Thordan then starts Death of the Heavens",
     strict=False)

D = "Death of the Heavens"
step(P5, D, "แผน: Komazou กลับหัว (Doom 2-2 ทางเหนือ)", "The strat: upside-down Komazou (2-2 Dooms north)",
     "ใช้ Komazou แบบกลับหัว: แบ่ง Doom 2-2\n"
     "สัญลักษณ์ Playstation ไม่ได้สุ่มทั้งหมด: วงกลม (○) จะไปที่คน Doom 2 คนที่ยืนห่างกันที่สุด\n"
     "Doom ไปทาง 'เหนือ' (หา Guerrique) เพื่อให้คน Doom ผูกกับตำแหน่งเหนือ/ใต้ หลบได้ง่าย: Doom หลบทันที / ไม่มี Doom หลบรอบถัดไป\n\n"
     "mitigate: H1 120s, H2 120s (ไม่ถึงตาย แต่ช่วยให้ Healer โฟกัส Mechanic ได้)\n"
     "ในภาพ: เลขแดง = คนมี Doom / เลขน้ำเงิน = ไม่มี Doom",
     "An upside-down Komazou: the Dooms split 2-2\n"
     "The Playstation symbols aren't fully random: the circles (○) go to the two Doomed players furthest apart\n"
     "Dooms go 'north' (towards Guerrique), tying Doom to the N/S positions so the dodges are simple: Dooms dodge at once / non-Dooms on the next\n\n"
     "Mitigate: H1 120s, H2 120s (not lethal, but it lets the healers focus on the Mechanic)\n"
     "In the pictures: red numbers = Doomed / blue numbers = no Doom",
     strict=False,
     refs=[FR("p5-death-doom", "gSS91H4wYiE", 20, "Death of the Heavens: Doom บนหัว 4 คน + Guerrique (WAR) = ทิศเหนือ", "Death of the Heavens: four Dooms + Guerrique (WAR) = north")])
step(P5, D, "① เรียงแถวตะวันตก → ตะวันออก", "① Line up west to east",
     "Ser Guerrique (WAR) โผล่ที่ทิศหลัก 1 ใน 4: ใช้ Guerrique เป็นทิศเหนือจนจบ Mechanic\n"
     "เรียงแถวจากตะวันตกไปตะวันออก: West MT ST H1 H2 D1 D2 D3 D4 East\n"
     "Thordan และ Dragon Eye โผล่ 2 จุด (ทิศหลัก/เฉียง) ห่างกัน 135 หรือ 180 องศา",
     "Ser Guerrique (WAR) spawns on one of the four cardinals: use him as north for the whole Mechanic\n"
     "Line up west to east: West MT ST H1 H2 D1 D2 D3 D4 East\n"
     "Thordan and the Dragon Eye appear at two (inter)cardinals, 135 or 180 degrees apart",
     strict=True, pic="05/death_of_the_heavens_01.jpg", scene=S.death(1))
step(P5, D, "② Doom ก้าวหน้า / ไม่มี Doom ก้าวหลัง", "② Dooms step forward / the rest step back",
     "4 คนสุ่มโดน Doom\n"
     "คนมี Doom: ก้าวไปทาง Guerrique เป็นแถว 4 คน\n"
     "คนไม่มี Doom: ถอยห่าง Guerrique เป็นแถว 4 คน\n"
     "การก้าวนี้ช่วยให้คนกลางแถวรู้ลำดับของตัวเองในกลุ่ม Doom / ไม่มี Doom",
     "Four random players get Doom\n"
     "Doomed: step towards Guerrique, making a line of four\n"
     "Not Doomed: step away from Guerrique, making a line of four\n"
     "This helps the players in the middle see their place within their group",
     strict=False, pic="05/death_of_the_heavens_02.jpg", scene=S.death(2))
step(P5, D, "③ กระจายไปตำแหน่ง", "③ Spread to your spots",
     "ซ้ายสุด/ขวาสุดของแต่ละแถว: ไปด้านข้าง (ตะวันตก/ตะวันออก)\n"
     "2 คนกลางแถว: ไปทิศเฉียง (ไม่ได้อยู่ตรงหน้า shuriken พอดี)\n"
     "ตอนนี้เป็นจังหวะดีที่จะหาว่า Thordan และ Dragon Eye อยู่ไหน",
     "The leftmost/rightmost of each line take the sides (west / east)\n"
     "The middle two take the intercardinals (not directly in front of the shuriken)\n"
     "A good moment to find Thordan and the Dragon Eye",
     strict=False, pic="05/death_of_the_heavens_03.jpg", scene=S.death(3))
step(P5, D, "④ Heavy Impact: Doom หลบก่อน", "④ Heavy Impact: Dooms dodge first",
     "Heavy Impact วงที่ 2 ลงพร้อม AoE ทั้งหมด และ Twister ขึ้นใต้คนสุ่ม\n"
     "มี Doom: หลบเข้าไปในวง Heavy Impact (ที่เพิ่งลง) ตรงๆ\n"
     "ไม่มี Doom: หลบเข้าวง Heavy Impact ถัดไป",
     "Heavy Impact's second hit resolves with all the AoEs, and Twisters appear under random players\n"
     "Doomed: dodge straight into the Heavy Impact that just went off\n"
     "Not Doomed: dodge into the next Heavy Impact",
     strict=False, pic="05/death_of_the_heavens_04.jpg", scene=S.death(4))
step(P5, D, "⑤ เตรียมรับสัญลักษณ์", "⑤ Set up for the symbols",
     "มี Doom:\nDoom ตะวันออก/ตะวันตก: ล่อวงกลม (○) ด้วยการเป็น 2 คน Doom ที่ห่างกันที่สุด\nDoom ตะวันตกเฉียงเหนือ → ไปทางตะวันตกเฉียงใต้ / Doom ตะวันออกเฉียงเหนือ → ไปทางตะวันออกเฉียงใต้\n\n"
     "ไม่มี Doom: เรียงแถวตะวันตก → ตะวันออก ค่อนไปทางเหนือของกลางนิดหน่อย",
     "Doomed:\nthe east/west Dooms bait the circles (○) by being the two Doomed players furthest apart\nthe NW Doom moves towards the SW / the NE Doom towards the SE\n\n"
     "Not Doomed: line up west to east a little north of centre",
     strict=False, pic="05/death_of_the_heavens_05.jpg", scene=S.death(5))
step(P5, D, "⑥ สัญลักษณ์ขึ้น", "⑥ The symbols appear",
     "มี Doom:\n2 คนวงกลม: ล่อวงกลมแล้วขยับเข้ากลาง\nอีก 2 คน (□ และ ▽): ไม่ขยับ\n\n"
     "ไม่มี Doom:\n× ซ้าย: ไปทางเหนือ\n× ขวา: ไปทางใต้\n□ และ ▽: ไปฝั่งตรงข้ามคน Doom ที่สัญลักษณ์เดียวกัน",
     "Doomed:\nthe two circles move in towards the middle after baiting\nthe other two (□ and ▽) do not move\n\n"
     "Not Doomed:\nthe left × takes north\nthe right × takes south\n□ and ▽ go opposite the Doomed player with the same symbol",
     strict=False, pic="05/death_of_the_heavens_06.jpg", scene=S.death(6),
     refs=[FR("p5-death-symbols", "gSS91H4wYiE", 30, "สัญลักษณ์ Playstation บนหัว: คู่เดียวกันโดนโซ่ผูก", "Playstation symbols overhead: each pair is chained")])
step(P5, D, "⑦ จัดตำแหน่ง + หันหลังให้ gaze", "⑦ Line up + look away from the gazes",
     "ปรับตำแหน่ง ใช้ marker / shuriken รอบนอกช่วยจัดแนว แล้วหันหลังให้ทั้ง Thordan และ Dragon's Eye\n"
     "เหมือน P1: คู่ Playstation โดนโซ่ผูก ยืนใกล้กลางให้โซ่สั้น จะขาดง่ายขึ้น",
     "Adjust, use the markers / outer shurikens to line up, and look away from both Thordan and the Dragon's Eye\n"
     "As in P1 the Playstation pairs are chained: stay close to the middle to keep the chains short so they break easily",
     strict=False, pic="05/death_of_the_heavens_07.jpg", scene=S.death(7))
step(P5, D, "⑧ gaze + knockback + Heavensflame", "⑧ Gazes + knockback + Heavensflame",
     "gaze ลง ตามด้วย Faith Unmoving (knockback) และ Heavensflame ที่ทุกคน\n"
     "มี Doom: เดินเข้าบ่อขาวที่เหลืออยู่เพื่อล้าง Doom\n"
     "ทุกคนเดินออกไปทางขอบอีกนิดให้โซ่ขาดแน่\n\n"
     "Heavensflame โดนกันทั้งที่ knockback ถูก: ยืนใกล้กันเกินไป วงจริง 10 yalm ใหญ่กว่าที่เห็น (ขนาดในภาพถูกต้อง)",
     "The gazes resolve, then straight away Faith Unmoving (knockback) and a Heavensflame on every player\n"
     "Doomed: step into the white puddle left behind to cleanse Doom\n"
     "Everyone moves further to the edge so the chains break\n\n"
     "Clipped by Heavensflame despite a good knockback? You were too close: its radius is 10 yalms, larger than it looks (the picture's size is right)",
     strict=False, pic="05/death_of_the_heavens_08.jpg", scene=S.death(8),
     refs=[FR("p5-death-knockback", "gSS91H4wYiE", 80, "knockback + Heavensflame: คน Doom เข้าบ่อขาวล้าง Doom", "Knockback + Heavensflame: the Dooms step into the white puddles")])
step(P5, "Meteor Circle", "Meteor + ช่วงท้าย P5: ห้ามฆ่า Thordan", "Meteors + the end of P5: don't kill Thordan",
     "หลัง Death of the Heavens: Meteor Circle 8 ลูกโผล่ ต้องรีบทำลาย\n"
     "caster LB2 ทำลายได้ 3 ลูก (เลือก 1 ลูก โดนลูกข้างๆ 2 ลูกด้วย) ถ้าไม่มี caster ใช้ ranged LB2 แทนได้ แต่ต้องเล็งให้โดน 3 ลูก\n"
     "macro: caster LB2 เล็งตรงทิศเหนือจริง\n\n"
     "Meteor หมดแล้ว Thordan กลับมากลางสนาม ร่าย Ancient Quaga ครั้งที่ 2: MT Reprisal, ST 90s, H2 30s, D4\n"
     "แล้ว Heavenly Heel → Ascalon's Might 3 ครั้ง: 3rd + short / ST Reprisal, D1, D3 / สลับ Tank / Healer ช่วย Tank เพราะใช้ mitigate แรงไม่ได้ (DRK ใช้ Rampart ได้ถ้ามี)\n"
     "auto-attack อีก 1 ครั้ง แล้ว Aetheric Burst = enrage\n\n"
     "HP Thordan ต่ำกว่า 3.0%: Thordan เซ ยอมแพ้ และขอชีวิต ห้ามฆ่า Thordan!\n"
     "ถ้าฆ่า: ท้าย P6 จะไม่มี Thordan มารับตา ปาร์ตี้ต้องทำ Eyes ซ้ำโดยไม่มีบัฟของ Haurchefant (ยังไม่ตาย) ตีตาน้ำเงินไม่ได้ จึง wipe ตอนแถบเต็ม",
     "After Death of the Heavens, eight Meteor Circles spawn and must be destroyed quickly\n"
     "A caster LB2 destroys three (target one, it hits the two beside it); with no caster alive a ranged LB2 also works, but must be aimed to hit three\n"
     "Macro: caster LB2, centred on true north\n\n"
     "With the Meteors gone, Thordan returns to the middle and casts Ancient Quaga 2: MT Reprisal, ST 90s, H2 30s, D4\n"
     "Then Heavenly Heel → three Ascalon's Might: 3rd + short / ST Reprisal, D1, D3 / tank swap / healers help the tanks, who can't use their stronger mitigation (a DRK can Rampart if it's up)\n"
     "One more auto-attack, then Aetheric Burst (enrage)\n\n"
     "Below 3.0% HP Thordan stumbles, yields and begs for mercy: do NOT kill him!\n"
     "If you do, nobody takes the eyes at the end of P6: the party repeats Eyes without Haurchefant's buff (he's alive now), can't damage the blue eye, and wipes when the gauge fills",
     strict=False,
     refs=[FR("p5-meteor-circles", "gSS91H4wYiE", 42, "Meteor Circle 8 ลูกรอบสนาม: caster LB2 ทำลายได้ 3 ลูก", "Eight Meteor Circles round the arena: a caster LB2 destroys three")])
