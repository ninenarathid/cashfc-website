"""P5 Pandora steps (05_pandora, mitigation)."""
from core import step, TU
import p5 as S

P5 = ("P5 Pandora", "P5 Pandora")
T = lambda n: TU(f"05/{n}.jpg")
FB = "Fulgent Blade"
STD = ("หลบแบบปกติ", "Standard dodge")
DIAG = ("หลบทแยกเข้ามุม", "Diagonal dodge")

step(P5, FB, "เส้น 6 เส้น", "The six lines",
     "Mana PF ใช้วิดีโอของ Nukemaru สำหรับ phase นี้ด้วย\n"
     "หลังคัตซีน Pandora เริ่ม Mechanic แรกทันที\n\n"
     "Fulgent Blade เริ่มด้วย raid-wide / บอสตีธรรมดาระหว่างนี้ (ก่อนร่าย Akh Morn): auto-attack ตี 2 คนที่ aggro สูงสุด (Tank ทั้งคู่)\n"
     "มีเส้น 6 เส้นบนพื้นประมาณตามภาพ\n\n"
     "Mitigate: MT Reprisal / MT 90s / D1\n"
     "Tank: ใช้ mitigate สั้นระหว่างหลบ เพื่อรับ auto-attack (ใช้ mitigate 25 วินาทีได้ช้าสุดราวการหลบครั้งที่ 2 ถึงจะกลับมาทัน Wings Dark and Light)",
     "Mana PF also uses Nukemaru's video for this phase\n"
     "After the cutscene, Pandora opens with her first mechanic straight away\n\n"
     "Fulgent Blade starts with a raid-wide / she auto-attacks through it (before Akh Morn): the top two in aggro (both tanks)\n"
     "Six lines are drawn on the floor, roughly as shown\n\n"
     "Mitigate: MT Reprisal / MT 90s / D1\n"
     "Tanks: use short cooldowns during the dodges for the autos (25s ones no later than about the second dodge to have them back for Wings Dark and Light)",
     strict=False, pic=T("fulgent_blade_01"), scene=S.fb01())
step(P5, FB, "หา 'มงกุฎ' แล้วหันกล้องเข้าหา", "Find the crown, face it",
     "หาสามเหลี่ยมมุมฉาก 4 อันที่เรียงเป็น 'มงกุฎ' (สีเขียว) แล้วหันกล้องเข้าหามัน",
     "Find the four right-angled triangles that make a 'crown' (green) and turn your camera to face them",
     strict=False, pic=T("fulgent_blade_02"), scene=S.fb02())
step(P5, FB, "เส้นคู่ซ้ายหรือขวาเรืองก่อน", "The left or right pair glows first",
     "เส้น 2 เส้นซ้ายสุดหรือขวาสุดจะเรืองแสง\n"
     "คู่ที่เรืองก่อนบอกลำดับของเส้นคู่ถัดไปที่วนรอบมงกุฎ\n"
     "ภาพ: 2 เส้นขวาสุดเรืองก่อน → ปาร์ตี้หลบไปทางขวาในขั้นที่ 5 และ 7",
     "Either the two left-most or the two right-most lines glow\n"
     "Which pair glows first gives the order of the next pairs as they go round the crown\n"
     "Picture: the two right-most glow first → the party dodges right later (steps 5 and 7)",
     strict=False, pic=T("fulgent_blade_03"), scene=S.fb03())
step(P5, FB, "เส้นชุดแรกลง: ดูสี่เหลี่ยมข้าวหลามตัด", "The first lines: watch the diamond",
     "AoE เส้นชุดแรกลง ตัดกันเป็นรูปข้าวหลามตัด (สีเขียว): จับตาไว้\n"
     "ยืนห่างจากข้าวหลามตัดนิดหน่อย เตรียมเดินเข้า",
     "The first line AoEs resolve and cross in a diamond (green): watch it\n"
     "Stand a little away from the diamond, ready to move in",
     strict=["MT"], pic=T("fulgent_blade_04"), scene=S.fb04())
step(P5, FB, "หลบเข้าข้าวหลามตัด", "Dodge into the diamond",
     "หลบเข้าข้าวหลามตัด (สีเขียว) แล้วเตรียมหลบซ้ายหรือขวา (ตามฝั่งที่เรืองก่อน)\n"
     "MT: ดูมุมด้านในของข้าวหลามตัด (สีฟ้า) อยู่ใกล้มุมนี้ไว้",
     "Dodge into the diamond (green), then get ready to dodge left or right (the side that glowed first)\n"
     "MT: note the diamond's inner corner (light blue) and stay close to it",
     strict=["MT"], pic=T("fulgent_blade_05"), scene=S.fb05(), plan=STD)
step(P5, FB, "หลบซ้าย/ขวา", "Dodge left/right",
     "ขยับซ้ายหรือขวา (ฝั่งที่เรืองก่อน) ตอนเส้นชุดถัดไปลง\n"
     "ภาพ: ขวาเรืองก่อน → หลบไปขวา\n"
     "MT: อยู่ใกล้มุมด้านใน",
     "Move left or right (the side that glowed first) as the next lines go off\n"
     "Picture: right glowed first → dodge right\n"
     "MT: stay near the inner corner",
     strict=["MT"], pic=T("fulgent_blade_06"), scene=S.fb06(), plan=STD)
step(P5, FB, "เข้าข้าวหลามตัดอีกครั้ง", "Into the diamond again",
     "สลับระหว่างหลบเข้าข้าวหลามตัด กับหลบซ้าย/ขวา\n"
     "ตอนนี้หลบเข้าข้าวหลามตัด (สีเขียว) แล้วเตรียมหลบซ้าย/ขวา\n"
     "MT: อยู่ใกล้มุมด้านใน\n"
     "ระหว่างหลบรอบนี้ บอสเลิกตาม MT และเริ่มร่าย Akh Morn",
     "Alternate between dodging into the diamond and dodging left/right\n"
     "Now dodge into the diamond (green), ready to go left/right\n"
     "MT: stay near the inner corner\n"
     "During this dodge the boss stops following the MT and starts casting Akh Morn",
     strict=["MT"], pic=T("fulgent_blade_07"), scene=S.fb07(), plan=STD)
step(P5, FB, "หลบซ้าย/ขวาอีกครั้ง", "Left/right once more",
     "หลบซ้ายหรือขวาอีกครั้ง\n"
     "MT: อยู่ใกล้มุมด้านใน",
     "Dodge left or right once more\n"
     "MT: stay near the inner corner",
     strict=["MT"], pic=T("fulgent_blade_08"), scene=S.fb08(), plan=STD)
step(P5, FB, "หลบทแยกเข้ามุมข้าวหลามตัด", "Diagonally into the diamond's corner",
     "อีกวิธี: หลบทแยกเข้ามุมซ้ายหรือขวาของข้าวหลามตัด (ตามฝั่งที่เรืองก่อน) แทนการเข้าแล้วหลบซ้าย/ขวา\n"
     "หลบทแยกแล้ว ตอนเส้นชุดถัดไปลงให้ยืนอยู่ที่เดิม",
     "The other way: dodge diagonally into the diamond's left or right corner (the side that glowed first) instead of in-then-sideways\n"
     "After a diagonal dodge, stay put when the next lines go off",
     strict=["MT"], pic=T("fulgent_blade_single_dodge_05"), scene=S.sd05(), plan=DIAG)
step(P5, FB, "หลบทแยกครั้งที่ 2", "The second diagonal dodge",
     "หลบทแยกเข้ามุมอีกครั้ง แล้วยืนที่เดิมตอนเส้นชุดถัดไป\n\n"
     "ระวัง: MT ที่หลบทแยกมักเผลอไปทางฝั่งข้าวหลามตัดที่เส้นมา → บอสหมุนเอียงมาก ทำให้แบ่งซ้าย/ขวาตอน Akh Morn ยาก",
     "Dodge diagonally into the corner again, and stay put for the next lines\n\n"
     "Careful: an MT dodging diagonally tends to drift to the side the lines came from → the boss turns a lot and the Akh Morn left/right split gets hard",
     strict=False, pic=T("fulgent_blade_single_dodge_07"), scene=S.sd07(), plan=DIAG)
step(P5, FB, "เข้าข้าวหลามตัดครั้งสุดท้าย", "The last dodge into the diamond",
     "เข้าข้าวหลามตัดครั้งที่ 3 (ครั้งสุดท้าย)\n"
     "ครั้งนี้ไม่ต้องสนใจฝั่ง (MT หลบตรงไหนในข้าวหลามตัดก็ได้)",
     "The third and last dodge into the diamond\n"
     "No need to track sides this time (the MT may dodge anywhere in it)",
     strict=False, pic=T("fulgent_blade_09"), scene=S.fb09())
step(P5, FB, "รอเส้นอีกชุด", "One more set of lines",
     "รอเส้นอีก 1 ชุดลง",
     "Wait for one more set of line AoEs",
     strict=False, pic=T("fulgent_blade_10"), scene=S.fb10())
step(P5, "Akh Morn", "stack 4:4 ซ้าย/ขวาของบอส", "4:4 stacks on the boss's left/right",
     "stack 2 กลุ่ม กลุ่มละ 4 คน ต้องอยู่ซ้าย/ขวาของ Pandora\n"
     "ซ้าย (หันหน้าหาบอส): MT H1 D1 D3\n"
     "ขวา (หันหน้าหาบอส): ST H2 D2 D4\n\n"
     "ทำไม MT ต้องอยู่ใกล้มุมด้านใน: เพื่อให้บอสหันตรง ตอนเริ่มร่าย Akh Morn ทิศบอสจะล็อก ยิ่ง MT หลบไปฝั่งที่เส้นมา บอสยิ่งหมุนเอียง กลุ่มอาจไปอีกฝั่งของบอสไม่ทัน",
     "Stack in two light parties of four, on Pandora's left/right\n"
     "Left (facing the boss): MT H1 D1 D3\n"
     "Right (facing the boss): ST H2 D2 D4\n\n"
     "Why the MT hugs the inner corner: to keep the boss straight; its facing locks when Akh Morn starts, and the more the MT drifts to the side the lines came from, the more it turns, until a group can't reach its side in time",
     strict=False, pic=T("fulgent_blade_11"), scene=S.fb11())
step(P5, "Akh Morn", "stack ลง", "The stacks",
     "Akh Morn ลงพร้อมเส้นชุดถัดไป: เล็งคนสุ่ม 1 คนในแต่ละฝั่ง (ซ้าย/ขวา) เป็น stack\n"
     "หลัง Akh Morn Pandora เข้า Mechanic ถัดไปทันที\n\n"
     "Mitigate: ST Reprisal / ST 90s / D2 / D4",
     "Akh Morn resolves with the next lines: a stack on a random player on each side (left/right)\n"
     "After Akh Morn Pandora goes straight into the next mechanic\n\n"
     "Mitigate: ST Reprisal / ST 90s / D2 / D4",
     strict=False, pic=T("fulgent_blade_12"), scene=S.fb12())
step(P5, FB, "บอสเอียง: ดู MT", "A slanted boss: check the MT",
     "บอสเอียงจนกลุ่มหนึ่งไปอีกฝั่งไม่ทัน: ดูวิธีหลบของ MT\n"
     "ยิ่ง MT หลบไปฝั่งข้าวหลามตัดที่เส้นมา (เขตสีแดง) บอสยิ่งหมุนตอนเริ่ม Akh Morn\n"
     "เห็นชัดเมื่อ MT หลบทแยก: MT จึงควรอยู่ใกล้มุมด้านในตอนหลบ 2 ครั้งแรก",
     "The boss is slanted and a group can't reach its side: check how the MT dodges\n"
     "The more the MT dodges towards the side the lines came from (the red area), the more the boss turns when Akh Morn starts\n"
     "Most obvious with diagonal dodges: so the MT stays near the inner corner for the first two dodges",
     strict=False, pic=T("fulgent_blade_faq_01"), scene=S.faq())

PR = "Paradise Regained"
step(P5, PR, "tower แรก = ทิศใต้", "The first tower is south",
     "Mechanic ที่ซับซ้อนที่สุดของ phase\n"
     "หา tower แรก แล้วถือ tower นี้เป็นทิศใต้\n"
     "MT: หมุนบอสไปทาง 'เหนือ' ใหม่\n"
     "H1 / H2: เข้าไปรอใน tower แรก",
     "The phase's most complex mechanic\n"
     "Find the first tower and treat it as south\n"
     "MT: turn the boss to the new 'north'\n"
     "H1 / H2: pre-position in the first tower",
     strict=["MT", "H1", "H2"], pic=T("paradise_regained_01"), scene=S.pr01())
PR2 = ("tower ที่ 2 ขึ้น 'ตะวันตกเฉียงเหนือ' หรือ 'ตะวันออกเฉียงเหนือ'\n"
       "บอสร่าย Wings Dark and Light ปีกข้างหนึ่งเรืองแสง\n"
       "MT + ST: tank swap ระหว่างบอสร่าย\n"
       "คนอื่นไปข้างบอสตามปีกที่เรืองก่อน / DPS ไปซ้ายหรือขวาเตรียมเข้า tower ถัดไป\n"
       "ปีกแสง (ซ้าย) เรือง: ฝั่งขวาปลอดภัย / ปีกมืด (ขวา) เรือง: ฝั่งซ้ายปลอดภัย\n\n"
       "มีสายขึ้นมา ต้องไปอยู่ที่ ST: ส่งต่อไม่ได้ แต่จะโยงไปหาคนที่ใกล้หรือไกลที่สุดที่ไม่ได้ถือ aggro เอง (ตามปีก)\n"
       "ปีกแสงเรือง: ST ต้องไกลที่สุด / ปีกมืดเรือง: ST ต้องใกล้ที่สุด")
PR2_EN = ("The second tower appears 'north-west' or 'north-east'\n"
          "The boss casts Wings Dark and Light and one wing glows\n"
          "MT + ST: tank swap during the cast\n"
          "Everyone else moves beside the boss by the first wing / the DPS go left or right ready for the next towers\n"
          "Light (left) wing glows: the right is safe / Dark (right) wing glows: the left is safe\n\n"
          "A tether appears and must go to the ST: it can't be passed, but goes to the nearest or furthest non-aggro player (by the wing)\n"
          "Light wing: the ST must be furthest / Dark wing: the ST must be nearest")
step(P5, PR, "tower 2 + ปีกแสงเรืองก่อน", "Tower 2 + the light wing first",
     PR2 + "\n\nภาพ: ปีกแสง (ซ้าย) เรืองก่อน", PR2_EN + "\n\nPicture: the light (left) wing first",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_02a"), scene=S.pr02(True))
step(P5, PR, "tower 2 + ปีกมืดเรืองก่อน", "Tower 2 + the dark wing first",
     "ภาพ: ปีกมืด (ขวา) เรืองก่อน → ไปฝั่งซ้าย / ST อยู่ใกล้บอสที่สุด",
     "Picture: the dark (right) wing first → the left side / the ST nearest the boss",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_02b"), scene=S.pr02(False))
step(P5, PR, "tower 3 + ปีกอีกข้าง (แสงก่อน)", "Tower 3 + the other wing (light first)",
     "tower ที่ 3 ขึ้นตะวันตกเฉียงเหนือหรือตะวันออกเฉียงเหนือ (ฝั่งที่ tower 2 ไม่ได้อยู่) และปีกอีกข้างเรือง\n"
     "ภาพ: แบบปีกแสงเรืองก่อน (ST ออกไปไกล)",
     "The third tower appears NW or NE (wherever the second isn't) and the other wing glows\n"
     "Picture: the light-first case (the ST goes far)",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_03a"), scene=S.pr03(True))
step(P5, PR, "tower 3 + ปีกอีกข้าง (มืดก่อน)", "Tower 3 + the other wing (dark first)",
     "ภาพ: แบบปีกมืดเรืองก่อน (ST อยู่ใกล้บอส)",
     "Picture: the dark-first case (the ST stays close)",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_03b"), scene=S.pr03(False))
PR4 = ("บอส cleave ใส่ MT (180° + 45°) และใส่คนที่มีสาย (ST) ด้วย AoE ท่า Tank: ใช้ mitigate Tank เต็มที่และ/หรือ invuln\n"
       "cleave แรกลงพร้อม tower แรก (H1 และ H2 รับ)\n"
       "MT: cleave แรกเป็นมืด → ออกไปนอก / เป็นแสง → เข้ามาใน\n"
       "H1, H2: เข้า tower เสร็จแล้วขึ้นเหนือ\n"
       "D1, D2: ไป tower ฝั่งไกลที่เพิ่งโดน cleave\n"
       "D3, D4: เข้า tower ฝั่งใกล้")
PR4_EN = ("The boss cleaves the MT (180° + 45°) and hits the tethered player (the ST) with a tank-buster AoE: full tank mitigation and/or invulns\n"
          "The first cleave resolves with the first tower (H1 and H2)\n"
          "MT: dark first cleave → move out / light → move in\n"
          "H1, H2: go north after your tower\n"
          "D1, D2: to the far-side tower that was just cleaved\n"
          "D3, D4: into the near-side tower")
step(P5, PR, "cleave 1 + tower 1 (แสงก่อน)", "Cleave 1 + tower 1 (light first)",
     PR4 + "\n\nภาพ: แบบแสงก่อน\n\nMitigate Wings Dark and Light ครั้งที่ 1: MT และ ST ใช้ 40% + Rampart + short + 3rd\n"
     "Wings Dark and Light ครั้งที่ 2: MT + ST ใช้ invuln",
     PR4_EN + "\n\nPicture: the light-first case\n\nMitigate Wings Dark and Light #1: MT and ST 40% + Rampart + short + 3rd\n"
     "Wings Dark and Light #2: MT + ST invuln",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_04a"), scene=S.pr04(True))
step(P5, PR, "cleave 1 + tower 1 (มืดก่อน)", "Cleave 1 + tower 1 (dark first)",
     "ภาพ: แบบมืดก่อน (MT ออกไปนอก)",
     "Picture: the dark-first case (the MT moves out)",
     strict=["MT", "ST", "H1"], pic=T("paradise_regained_04b"), scene=S.pr04(False))
step(P5, PR, "cleave 2 + tower 2 (แสงก่อน)", "Cleave 2 + tower 2 (light first)",
     "บอส cleave ใส่ ST แล้วใส่คนมีสาย (ตอนนี้คือ MT) ด้วย AoE ท่า Tank\n"
     "cleave นี้ลงพร้อม tower 2 (Melee 2 คน หรือ Range 2 คน แล้วแต่ฝั่งที่ tower 2 ขึ้น)\n\n"
     "ภาพ: แบบแสงก่อน",
     "The boss cleaves the ST and hits the tethered player (now the MT) with a tank-buster AoE\n"
     "This second cleave resolves with the second tower (the two melee or the two range, by where it spawned)\n\n"
     "Picture: the light-first case",
     strict=["MT", "ST"], pic=T("paradise_regained_05a"), scene=S.pr05(True))
step(P5, PR, "cleave 2 + tower 2 (มืดก่อน)", "Cleave 2 + tower 2 (dark first)",
     "ภาพ: แบบมืดก่อน",
     "Picture: the dark-first case",
     strict=["MT", "ST"], pic=T("paradise_regained_05b"), scene=S.pr05(False))
step(P5, PR, "tower 3", "Tower 3",
     "DPS 2 คนที่เหลือ (Melee หรือ Range คู่เดียวกัน) ยืนรอ tower 3\n"
     "จากนั้น MT ใช้ Provoke ดึงบอสกลับ หันบอสไปทางเหนือ เตรียม Mechanic สุดท้ายของรอบ",
     "The two remaining DPS (both melee or both range) stay put for the third tower\n"
     "The MT then Provokes to take the boss back and faces it north for the last mechanic of the loop",
     strict=False, pic=T("paradise_regained_06"), scene=S.pr06())

PS = "Polarizing Strikes"
step(P5, PS, "2 แถวตะวันตกเฉียงใต้/ตะวันออกเฉียงใต้", "Two lines SW and SE",
     "Mechanic ที่ง่ายที่สุดของ phase: stack 4 รอบ\n"
     "ต่อแถว 2 แถวทางตะวันตกเฉียงใต้และตะวันออกเฉียงใต้ ให้ Tank อยู่หน้า\n"
     "บอสยิง AoE เส้นแสงใส่แถวซ้าย และเส้นมืดใส่แถวขวา\n"
     "ทั้ง 2 เส้นทิ้ง AoE ค้างที่จะระเบิดอีกครั้งในไม่ช้า\n"
     "คนหน้าแถว (Tank) ได้ Light Resistance Down หรือ Dark Resistance Down ตามเส้นที่โดน\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / D3",
     "The phase's simplest mechanic: four rounds of stack damage\n"
     "Form two lines SW and SE with the tanks in front\n"
     "The boss fires a light line AoE at the left line and a dark one at the right\n"
     "Both leave a residual AoE that explodes again shortly\n"
     "The front player of each line (the tanks) gets Light or Dark Resistance Down\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / D3",
     strict=["MT", "ST"], pic=T("polarizing_strikes_01"), scene=S.ps01())
step(P5, PS, "คนหน้าแถวสลับฝั่ง", "The front players swap sides",
     "เส้นลงแล้ว กลับไปต่อแถวเดิม\n"
     "คนหน้าแถวติด Resistance Down จึงกลับแถวเดิมไม่ได้: 2 คนนี้สลับฝั่งกัน",
     "After the lines, return to the two lines\n"
     "The front players have a Resistance Down and can't rejoin their own line: they switch sides",
     strict=False, pic=T("polarizing_strikes_02"), scene=S.ps02())
step(P5, PS, "ทำซ้ำ 4 รอบ", "Four rounds in all",
     "ทำซ้ำ 4 รอบ เปลี่ยนคนหน้าแถวทุกรอบ\n"
     "ลำดับคนหน้าแถว: Tank > Melee > Range > Healer\n"
     "ภาพ: รอบ 2 (Melee อยู่หน้า)",
     "It repeats four times with a new front player each round\n"
     "Front order: Tank > Melee > Range > Healer\n"
     "Picture: round 2 (melee in front)",
     strict=False, pic=T("polarizing_strikes_03"), scene=S.ps03())
step(P5, "Pandora's Box → Paradise Lost", "LB3 Tank + วนซ้ำ + enrage", "Tank LB3, the loop and the enrage",
     "Pandora ร่าย Pandora's Box: เช็ก LB3 ของ Tank\n"
     "mitigate 15 วินาที กดช้าหน่อย (ราวตัว 'B' ใน 'Box') จะคลุมทั้ง Pandora's Box และ Fulgent Blade\n\n"
     "จากนั้นวน Mechanic ซ้ำอีกรอบตั้งแต่ Fulgent Blade แล้วจบด้วย Fulgent Blade รอบที่ 3 → Akh Morn\n"
     "แล้ว Pandora ร่าย Paradise Lost: enrage\n"
     "ระหว่างร่าย (แถบร่ายถึงตัว 'r' ใน 'Paradise') Ryne พูด \"You can weather this! I know you can!\" แล้วให้ Limit Break 1.5 ขีด ถึง LB3: กด LB3 ทันที ไม่งั้นไม่ทันก่อน enrage\n"
     "ลำดับตัวอย่าง (ตกลงกันตอนเริ่มหรือตอนคัตซีน อาจเปลี่ยนถ้ามี DNC): MNK > DRG > NIN > SAM > VPR > RPR\n"
     "เสียง \"Yaaaaaargh!\" ของ Ryne กับ Gaia ไม่ได้แปลว่าชนะแน่: ตีต่อไป\n\n"
     "Mitigate รอบ 2: Fulgent Blade = ST Reprisal / MT 90s / D1 · Akh Morn = MT Reprisal / ST 90s / D2 / D4 · Wings Dark and Light = MT + ST invuln · Polarizing Strikes = ST Reprisal / H1 180s / H2 30s / H2 180s\n"
     "รอบ 3: Fulgent Blade = MT 90s / H1 120s / H2 120s (H2 30s ยังไม่กลับ) · Akh Morn = MT Reprisal / ST 90s / H2 30s / D2 / D4",
     "Pandora casts Pandora's Box: a tank LB3 check\n"
     "15s mitigation used late (around the 'B' in 'Box') covers both Pandora's Box and Fulgent Blade\n\n"
     "The mechanics then repeat from Fulgent Blade, ending with a third Fulgent Blade → Akh Morn\n"
     "Then Pandora casts Paradise Lost: the enrage\n"
     "During it (when the cast bar reaches the 'r' in 'Paradise') Ryne says \"You can weather this! I know you can!\" and gives 1.5 bars of Limit Break, enough for LB3: LB3 immediately or it won't land before the enrage\n"
     "Example priority (agreed beforehand; may change with a DNC): MNK > DRG > NIN > SAM > VPR > RPR\n"
     "Ryne and Gaia's \"Yaaaaaargh!\" isn't a sure kill: keep hitting\n\n"
     "Mitigate loop 2: Fulgent Blade = ST Reprisal / MT 90s / D1 · Akh Morn = MT Reprisal / ST 90s / D2 / D4 · Wings Dark and Light = MT + ST invuln · Polarizing Strikes = ST Reprisal / H1 180s / H2 30s / H2 180s\n"
     "Loop 3: Fulgent Blade = MT 90s / H1 120s / H2 120s (H2 30s not back) · Akh Morn = MT Reprisal / ST 90s / H2 30s / D2 / D4",
     strict=False)
