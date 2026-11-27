"""P2 Usurper of Frost steps (02_usurper_of_frost, mitigation)."""
from core import step, TU, FR
import p2 as S

P2 = ("P2 Usurper of Frost", "P2 Usurper of Frost")
T = lambda n: TU(f"02/{n}.jpg")

step(P2, "Quadruple Slap", "ท่าแรงใส่ Tank เปิด phase", "The opening tank buster",
     "Tank ที่เปิด phase นี้ = Tank ที่ไม่ได้ใช้ invuln รับ Powder Mark Trail ครั้งที่ 2 ท้าย P1 (ส่วนใหญ่คือ MT)\n\n"
     "บอสเปิดด้วย Quadruple Slap ใส่ Tank: ชื่อแบบนี้แต่จริงๆ โดน 2 ครั้ง\n"
     "ครั้งแรกให้ debuff Physical Vulnerability Up (Esuna ได้) / invuln ได้ทั้ง 2 ครั้ง\n"
     "หลังจากนั้นบอสตีธรรมดา 2 ครั้ง แรงขึ้นเพราะ debuff: Esuna ทิ้ง หรือ mitigate รับ หรือให้ ST ใช้ Provoke รับแทน\n\n"
     "Mitigate: MT invuln (PLD ห้ามใช้ Hallowed Ground ตรงนี้ ไม่งั้นทั้งไฟต์จะเสีย 1 ครั้ง ที่ P3 และ P5)\n\n"
     "จากนั้นบอสวาร์ปไปใต้กลางสนามนิดหน่อย ใช้ Mirror Image เรียก Oracle's Reflection (ตีไม่ได้) แล้วร่าย Diamond Dust: raid-wide แรง",
     "The tank who opens this phase is the one who did not invuln the second Powder Mark Trail late in P1 (usually the MT)\n\n"
     "The boss opens with Quadruple Slap on the tank: despite the name, it hits twice\n"
     "The first hit leaves Physical Vulnerability Up (Esuna removes it) / both hits can be invulned\n"
     "The boss then auto-attacks twice, harder with the debuff: Esuna it, mitigate through, or have the ST Provoke and take them\n\n"
     "Mitigate: MT invuln (a PLD can't Hallowed Ground this, or loses a use over the fight, at P3 and P5)\n\n"
     "The boss then teleports a little south of the centre, casts Mirror Image to summon an (untargetable) Oracle's Reflection, then Diamond Dust: a heavy raid-wide",
     strict=False)

DD = "Diamond Dust"
step(P2, DD, "จุดเริ่ม + สิ่งที่ต้องดู", "Start spots + what to read",
     "เล่นคล้าย Diamond Frost ใน Eden's Verse: Refulgence (Savage)\n"
     "ยืนจุด spread เดียวกับ P1\n\n"
     "มีสัญญาณ 2 อย่างพร้อมกัน:\n"
     "Oracle's Reflection เตรียม Axe Kick (พูด \"Cleave!\": AoE วงกลมใหญ่รอบตัว) หรือ Scythe Kick (พูด \"Reap!\": donut)\n"
     "วงกลม 2 วงขึ้นตรงข้ามกันที่ทิศหลักหรือทิศเฉียง (ภาพ: ทิศหลัก)\n\n"
     "Mitigate Diamond Dust: MT Reprisal / H2 30s / H2 120s / D2 / D4",
     "Resolved much like Diamond Frost in Eden's Verse: Refulgence (Savage)\n"
     "Take the spread spots from P1\n\n"
     "Two tells start together:\n"
     "The Oracle's Reflection readies Axe Kick (\"Cleave!\": a large point-blank AoE) or Scythe Kick (\"Reap!\": a donut)\n"
     "Two circles appear opposite each other on a cardinal or intercardinal pair (picture: cardinals)\n\n"
     "Mitigate Diamond Dust: MT Reprisal / H2 30s / H2 120s / D2 / D4",
     strict=True, pic=T("diamond_dust_00"), scene=S.dd00())
step(P2, DD, "Axe Kick: ใช้วงนอก", "Axe Kick: use the outer ring",
     "ดูก่อนว่าเป็น Axe Kick หรือ Scythe Kick เพราะบอกพื้นที่ที่ยืนได้\n"
     "Axe Kick: ยืนบนวงแหวนรอบนอกของพื้น",
     "First read Axe Kick or Scythe Kick: it decides the usable space\n"
     "Axe Kick: use the outer ring on the floor",
     strict=False, pic=T("diamond_dust_axe"), scene=S.ddaxe())
step(P2, DD, "Scythe Kick: ใช้ตรงกลาง", "Scythe Kick: use the middle",
     "Scythe Kick: ยืนในรูปดาวตรงกลางพื้น",
     "Scythe Kick: use the star in the centre of the floor",
     strict=False, pic=T("diamond_dust_scythe"), scene=S.ddscythe())
DD_RULE = ("จากนั้นฝั่ง Tank/Healer หรือฝั่ง DPS จะได้ AoE ไปทิ้ง\n"
           "คนที่มี AoE: ยืนทำมุม 45° กับวงกลมสีขาว\n"
           "คนที่ไม่มี AoE: ยืนทำมุม 0° หรือ 90° กับวงกลมสีขาว\n"
           "อาจต้องหมุนทั้งปาร์ตี้ 45° ตามเข็มจากจุด spread (หมุนเมื่อ AoE ไปตรงกับวงกลมสีขาววงแรก)")
DD_RULE_EN = ("Then either the tanks/healers or the DPS get AoEs to drop\n"
              "With an AoE: stand at 45° to a white circle\n"
              "Without: stand at 0° or 90° to a white circle\n"
              "The whole party may need to rotate 45° clockwise from the spread spots (rotate if the AoEs land on the first white circles)")
step(P2, DD, "Tank/Healer มี AoE · วงกลมทิศหลัก", "Tanks/healers have AoEs · circles on cardinals",
     DD_RULE + "\n\nภาพ: Tank/Healer มี AoE และวงกลมอยู่ทิศหลัก → ทุกคนหมุน 45° ตามเข็ม",
     DD_RULE_EN + "\n\nPicture: tanks/healers have the AoEs, circles on cardinals → everyone rotates 45° clockwise",
     strict=True, pic=T("diamond_dust_01a"), scene=S.dd01a())
step(P2, DD, "DPS มี AoE · วงกลมทิศหลัก", "DPS have AoEs · circles on cardinals",
     "ภาพ: DPS มี AoE และวงกลมอยู่ทิศหลัก → ยืนจุด spread เดิม ไม่ต้องหมุน",
     "Picture: the DPS have the AoEs, circles on cardinals → stay on the spread spots, no rotation",
     strict=True, pic=T("diamond_dust_01b"), scene=S.dd01b())
step(P2, DD, "Tank/Healer มี AoE · วงกลมทิศเฉียง", "Tanks/healers have AoEs · circles on intercardinals",
     "ภาพ: Tank/Healer มี AoE และวงกลมอยู่ทิศเฉียง → ยืนจุด spread เดิม ไม่ต้องหมุน",
     "Picture: tanks/healers have the AoEs, circles on intercardinals → stay on the spread spots, no rotation",
     strict=True, pic=T("diamond_dust_01c"), scene=S.dd01c())
step(P2, DD, "DPS มี AoE · วงกลมทิศเฉียง", "DPS have AoEs · circles on intercardinals",
     "ภาพ: DPS มี AoE และวงกลมอยู่ทิศเฉียง → ทุกคนหมุน 45° ตามเข็ม",
     "Picture: the DPS have the AoEs, circles on intercardinals → everyone rotates 45° clockwise",
     strict=True, pic=T("diamond_dust_01d"), scene=S.dd01d())
step(P2, DD, "กรวยใส่ 4 คนที่ใกล้สุด: Axe Kick", "Cones at the four closest: Axe Kick",
     "Axe Kick / Scythe Kick ยิงกรวยใส่ 4 คนที่อยู่ใกล้บอสที่สุดด้วย\n"
     "ไม่มี AoE: เป็นหนึ่งในคนที่ใกล้บอสที่สุด\n"
     "มี AoE: เป็นหนึ่งในคนที่ไกลบอสที่สุด\n\n"
     "ภาพ: Axe Kick (ทุกคนอยู่วงนอก)",
     "Axe Kick / Scythe Kick also fires cones at the four players closest to the boss\n"
     "Without an AoE: be one of the closest\n"
     "With an AoE: be one of the furthest\n\n"
     "Picture: Axe Kick (everyone on the outer ring)",
     strict=True, pic=T("diamond_dust_02a"), scene=S.dd02a())
step(P2, DD, "กรวยใส่ 4 คนที่ใกล้สุด: Scythe Kick", "Cones at the four closest: Scythe Kick",
     "ภาพ: Scythe Kick (ทุกคนอยู่ตรงกลาง คนมี AoE อยู่ด้านนอกของกลุ่ม)",
     "Picture: Scythe Kick (everyone in the middle, the AoE players on the outside of the group)",
     strict=False, pic=T("diamond_dust_02b"), scene=S.dd02b())
step(P2, DD, "หลังเตะ: Axe Kick → หลบวงกลมแรก", "After the kick: Axe Kick → dodge the first circles",
     "ทันทีที่แถบร่าย Axe Kick / Scythe Kick จบ ให้ขยับเลย (ขั้นนี้เร็วมาก)\n"
     "Axe Kick: หลบวงกลมชุดแรก",
     "As soon as the Axe/Scythe Kick cast bar finishes, move (this step is very quick)\n"
     "Axe Kick: dodge the first circles",
     strict=False, pic=T("diamond_dust_03a"), scene=S.dd03a())
step(P2, DD, "หลังเตะ: Scythe Kick → ทิ้ง AoE ที่ขอบ", "After the kick: Scythe Kick → drop the AoEs at the edge",
     "Scythe Kick: คนที่มี AoE อยู่ที่ขอบเพื่อทิ้ง AoE (ภาพ: ออกไปทางทิศเฉียง)",
     "Scythe Kick: stay at the edge to drop your AoEs (picture: out to the intercardinals)",
     strict=False, pic=T("diamond_dust_03b"), scene=S.dd03b())
DD4 = ("ทุกคนกลับเข้ามา stack เตรียมรับ knockback ไปทางที่วงกลมชุดแรกเคยอยู่\n"
       "กลุ่ม MT H1 D1 D3: วงกลมฝั่งตะวันตกถึงตะวันออกเฉียงเหนือ\n"
       "กลุ่ม ST H2 D2 D4: วงกลมฝั่งตะวันตกเฉียงใต้ถึงตะวันออก\n\n"
       "ตรงที่ทิ้ง AoE ไว้จะขึ้นสัญลักษณ์รูปดาว (Frigid Needle)\n"
       "Oracle's Reflection วาร์ปไปทิศหลักหรือทิศเฉียงแบบสุ่ม")
DD4_EN = ("Everyone comes in and stacks for a knockback towards where the first circles were\n"
          "MT H1 D1 D3: the circle from west round to north-east\n"
          "ST H2 D2 D4: the circle from south-west round to east\n\n"
          "Star-shaped telegraphs (Frigid Needle) appear where the AoEs were dropped\n"
          "The Oracle's Reflection teleports to a random cardinal or intercardinal")
step(P2, DD, "stack รอ knockback (Axe Kick)", "Stack for the knockback (Axe Kick)",
     DD4 + "\n\nภาพ: แบบ Axe Kick", DD4_EN + "\n\nPicture: the Axe Kick case",
     strict=True, pic=T("diamond_dust_04a"), scene=S.dd04(True))
step(P2, DD, "stack รอ knockback (Scythe Kick)", "Stack for the knockback (Scythe Kick)",
     DD4 + "\n\nภาพ: แบบ Scythe Kick", DD4_EN + "\n\nPicture: the Scythe Kick case",
     strict=True, pic=T("diamond_dust_04b"), scene=S.dd04(False))
step(P2, DD, "knockback ไปที่วงกลมชุดแรก (Axe Kick)", "Knocked back to the first circles (Axe Kick)",
     "knockback จากกลางสนามไปตรงที่วงกลมชุดแรกเคยอยู่ วงกลมชุดที่ 2 ระเบิดพร้อมกัน\n"
     "รออยู่ตรงนี้จน AoE รูปดาวลง\n\nภาพ: แบบ Axe Kick",
     "Knocked back from the centre to where the first circles were; the second circles go off too\n"
     "Wait here for the star AoEs\n\nPicture: the Axe Kick case",
     strict=True, pic=T("diamond_dust_05a"), scene=S.dd05(True))
step(P2, DD, "knockback ไปที่วงกลมชุดแรก (Scythe Kick)", "Knocked back to the first circles (Scythe Kick)",
     "ภาพ: แบบ Scythe Kick", "Picture: the Scythe Kick case",
     strict=True, pic=T("diamond_dust_05b"), scene=S.dd05(False))
step(P2, DD, "AoE รูปดาวลง (Axe Kick)", "The star AoEs go off (Axe Kick)",
     "AoE รูปดาวลง\n"
     "ดูว่า Oracle's Reflection อยู่ตรงไหน: เป็นตัวบอกว่าขั้นต่อไปต้องเดินยังไง\n\nภาพ: แบบ Axe Kick",
     "The star AoEs go off\n"
     "Note where the Oracle's Reflection is: it decides how you move next\n\nPicture: the Axe Kick case",
     strict=True, pic=T("diamond_dust_06a"), scene=S.dd06(True))
step(P2, DD, "AoE รูปดาวลง (Scythe Kick)", "The star AoEs go off (Scythe Kick)",
     "ภาพ: แบบ Scythe Kick", "Picture: the Scythe Kick case",
     strict=True, pic=T("diamond_dust_06b"), scene=S.dd06(False))

SH = "Sunbound Holy"
step(P2, SH, "ภาพรวม: stack ของ Healer 4 ครั้ง", "Overview: four healer stacks",
     "Oracle's Reflection ร่าย Sunbound Holy: เล็ง Healer ทั้ง 2 คน คนละ 4 ครั้ง เป็น stack 4 คนที่ทิ้งแอ่ง (puddle) ไว้\n"
     "แต่ละกลุ่มต้องทิ้งแอ่งให้หมด แล้วไปจบที่ด้านหลังบอสพอดี หรือห่างจากบอสอย่างน้อย 135°\n\n"
     "Usurper of Frost วาร์ปไปทิศหลักหรือทิศเฉียงแบบสุ่ม จึงมี 4 กรณี\n"
     "สรุป: ห้ามทิ้งแอ่งตรงด้านหลัง Usurper of Frost (ยกเว้นแอ่งแรก)\n\n"
     "Mitigate: H1 120s / MT 90s / ST 90s",
     "The Oracle's Reflection casts Sunbound Holy: each healer is targeted four times with a 4-player stack that leaves a puddle\n"
     "Each group drops its puddles and ends directly behind the boss, or at least 135° away from it\n\n"
     "The Usurper of Frost teleports to a random cardinal or intercardinal, so there are four cases\n"
     "In short: never drop a puddle directly behind the Usurper of Frost (except the first)\n\n"
     "Mitigate: H1 120s / MT 90s / ST 90s",
     strict=False)
step(P2, SH, "กรณี 1: บอสอยู่ตรงกลุ่มใดกลุ่มหนึ่ง", "Case 1: the boss on a group",
     "Usurper of Frost อยู่ตำแหน่งเดียวกับกลุ่มใดกลุ่มหนึ่ง\n"
     "ขยับทันทีที่ AoE รูปดาวลง\n"
     "แอ่งแรกทิ้งด้านหลังบอสได้ (มันจะหายไป) แต่แอ่งที่ 2 ห้าม\n"
     "รีบวิ่งตามเข็ม 180° รอบสนาม: ต้องทิ้งให้ครบ 4 แอ่งแล้วไปถึงอีกฝั่งให้ทัน\n"
     "พอพื้นกลายเป็นน้ำแข็ง ให้ไถลไปอยู่ด้านหน้า Usurper of Frost",
     "The Usurper of Frost is where one of the groups is\n"
     "Move as soon as the star AoEs go off\n"
     "The first puddle can go behind the boss (it disappears), the second can't\n"
     "Run clockwise 180° round the arena quickly: drop all four puddles and still reach the other side\n"
     "When the floor turns to ice, slide so you're in front of the Usurper of Frost",
     strict=["MT", "ST"], pic=T("diamond_dust_07d"), scene=S.dd07d())
step(P2, SH, "กรณี 2: บอสห่าง 90° จากทั้ง 2 กลุ่ม", "Case 2: the boss 90° from both groups",
     "ทั้ง 2 กลุ่มเดินตามเข็มช้าๆ แล้วไปจบตรงหน้าและตรงหลัง Usurper of Frost พอดี",
     "Both groups move clockwise slowly and end directly in front of and behind the Usurper of Frost",
     strict=["MT", "ST"], pic=T("diamond_dust_07a"), scene=S.dd07a())
step(P2, SH, "กรณี 3: บอสอยู่ทวนเข็ม 45° จากกลุ่มหนึ่ง", "Case 3: the boss 45° anti-clockwise of a group",
     "ทั้ง 2 กลุ่มเดินตามเข็มเร็วๆ แล้วไปจบตรงหน้าและตรงหลัง Usurper of Frost พอดี",
     "Both groups move clockwise quickly and end directly in front of and behind the Usurper of Frost",
     strict=["MT", "ST"], pic=T("diamond_dust_07b"), scene=S.dd07b())
step(P2, SH, "กรณี 4: บอสอยู่ตามเข็ม 45° จากกลุ่มหนึ่ง", "Case 4: the boss 45° clockwise of a group",
     "กลุ่มที่ใกล้บอสทิ้งแอ่งตรงหลังบอสไม่ได้: เดินทวนเข็มช้าๆ\n"
     "กลุ่มที่ไกลบอส: เดินตามเข็มช้าๆ\n"
     "ทั้ง 2 กลุ่มไปเจอกันที่ห่างบอส 135° และการขยับรอบถัดไปจะเป็นแนวเฉียง",
     "The group nearer the boss can't drop its puddles directly behind it: it goes slowly anti-clockwise\n"
     "The group further away goes slowly clockwise\n"
     "Both meet 135° from the boss, and the next move is slanted",
     strict=False, pic=T("diamond_dust_aa_07b"), scene=S.dd07c())
step(P2, SH, "สลับร่าง: พื้นน้ำแข็ง + ท่ามอง (gaze)", "The forms swap: ice floor + a gaze",
     "ทั้ง 2 กลุ่มต้องอยู่ด้านหลัง Oracle's Reflection หรือห่างอย่างน้อย 135° เพื่อเตรียม Mechanic ถัดไป\n\n"
     "Oracle's Reflection กับ Usurper of Frost สลับร่างกัน\n"
     "พื้นกลายเป็นน้ำแข็ง\n"
     "มีท่ามอง (gaze): หันหลังให้ Usurper of Frost\n\n"
     "ถ้าตอนนี้ยังไม่อยู่ตรงหลัง Oracle's Reflection ให้ไถลข้ามสนามไปฝั่งตรงข้ามโดยประมาณ (โดยเฉพาะถ้าตอนแรกยืนตรงข้ามบอสพอดี)",
     "Both groups need to be behind the Oracle's Reflection, or at least 135° from it, for the next mechanic\n\n"
     "The Oracle's Reflection and the Usurper of Frost swap forms\n"
     "The floor turns to ice\n"
     "A gaze: look away from the Usurper of Frost\n\n"
     "If you're not directly behind the Oracle's Reflection now, slide across to roughly opposite (especially if you started directly opposite the boss)",
     strict=False, pic=T("diamond_dust_07"), scene=S.dd07())
step(P2, SH, "Twin Silence: ไถลไปด้านหน้า", "Twin Silence: slide in front",
     "Oracle's Reflection เตรียม Twin Silence หรือ Twin Stillness\n"
     "Twin Silence (พูด \"Sink into Silence!\"): ไถลไปด้านหน้า Oracle's Reflection",
     "The Oracle's Reflection readies Twin Silence or Twin Stillness\n"
     "Twin Silence (\"Sink into Silence!\"): slide in front of it",
     strict=False, pic=T("diamond_dust_08a"), scene=S.dd08a())
step(P2, SH, "Twin Stillness: ไถลไปด้านหลัง", "Twin Stillness: slide behind",
     "Twin Stillness (พูด \"In stillness freeze!\"): ไถลไปด้านหลัง Oracle's Reflection\n"
     "บอสจะตามด้วยท่าตรงข้ามทันที: ไถลเข้า/ออกอีกครั้งตามนั้น\n\n"
     "เล่นจอยแล้วเล็งทางไถลยาก: ทำ macro นี้ไว้ กดแล้วตัวละครก้าวไปข้างหน้าตรงตามกล้อง 1 ก้าว\n"
     "/automove on\n/automove off",
     "Twin Stillness (\"In stillness freeze!\"): slide behind the Oracle's Reflection\n"
     "It quickly follows with the opposite attack: slide again as needed\n\n"
     "Aiming the slide on a controller is hard: this macro takes one tiny step exactly where the camera faces\n"
     "/automove on\n/automove off",
     strict=False, pic=T("diamond_dust_08b"), scene=S.dd08b())
step(P2, "Hallowed Ray", "stack แนวตรง", "Line stack",
     "Usurper of Frost กลับมากลางสนาม ใช้ Hallowed Ray ใส่ปาร์ตี้: stack แนวตรงที่แรงมาก แล้วเริ่มชุดท่าถัดไป\n\n"
     "Mitigate: ST Reprisal / H2 30s / D1\n"
     "mitigate เสริม (Magick Barrier, Passage of Arms ฯลฯ) ใช้ตรงนี้",
     "The Usurper of Frost returns to the centre and casts Hallowed Ray on the party: a heavy line stack, then starts the next set\n\n"
     "Mitigate: ST Reprisal / H2 30s / D1\n"
     "Any extra mitigation (Magick Barrier, Passage of Arms, …) goes here",
     strict=False)

MM = "Mirror, Mirror"
step(P2, MM, "หากระจกสีน้ำเงิน", "Find the blue mirror",
     "ช่วงนี้ตี Usurper of Frost ได้\n"
     "กระจกแดง 2 บาน และน้ำเงิน 1 บาน ขึ้นที่ขอบสนาม (ทิศหลัก/ทิศเฉียง)\n"
     "กระจกน้ำเงิน: ลอกท่าของบอส ลงพร้อมบอส\n"
     "กระจกแดง: ลอกท่าของบอส แต่ลงทีหลัง\n"
     "กระจกแดง 2 บานห่างกัน 90° เสมอ\n\n"
     "Tank + Melee: ลากบอสไปฝั่งตรงข้ามกระจกน้ำเงินพอดี\n"
     "Healer + Range: ไปที่กระจกน้ำเงิน\n\n"
     "MT: ใช้ Rampart / 40% สลับกันรับ auto-attack",
     "The Usurper of Frost is targetable here\n"
     "Two red mirrors and one blue mirror appear at the edge (cardinals/intercardinals)\n"
     "Blue: copies the boss's attack and resolves with it\n"
     "Red: copies the attack but resolves later\n"
     "The two red mirrors are always 90° apart\n\n"
     "Tanks + melee: bring the boss directly opposite the blue mirror\n"
     "Healers + range: go to the blue mirror\n\n"
     "MT: cycle Rampart / 40% for the auto-attacks",
     strict=True, pic=T("mirror_mirror_01"), scene=S.mm01())
step(P2, MM, "Scythe Kick + กรวย: spread 2 กลุ่ม", "Scythe Kick + cones: two spreads",
     "บอสเตรียม Scythe Kick พร้อมยิงกรวย 4 อันใส่ 4 คนที่ใกล้ที่สุด กระจกทุกบานบันทึกท่านี้ และกระจกน้ำเงินลงพร้อมบอส\n"
     "spread รอบบอสและรอบกระจก ให้พ้นทั้ง Scythe Kick และกรวย\n\n"
     "Tank + Melee: spread ด้านหน้าบอส แบ่งซ้าย/ขวาตามบอส\n"
     "Healer + Range: spread ข้างกระจกน้ำเงิน แบ่งซ้าย/ขวาตามกระจก (หันหน้าเข้ากลาง) ระวังกรวยของเราไปโดนอีกกลุ่ม\n"
     "Tank/Healer อยู่ริม DPS อยู่ตรงกลาง\n\n"
     "หลบ Scythe Kick: ยืนในวงเป้า (hitbox) ของบอส หรือห่างจากขีดทิศของกระจก 2 ขีด",
     "The boss readies Scythe Kick and fires four cones at the four closest players; every mirror records it, and the blue one resolves with the boss\n"
     "Spread around the boss and the mirror to avoid both\n\n"
     "Tanks + melee: spread in front of the boss, left/right of the boss\n"
     "Healers + range: spread beside the blue mirror, left/right facing in; don't hit the other group with your cones\n"
     "Tanks/healers on the outside, DPS in between\n\n"
     "To avoid Scythe Kick: be inside the boss's hitbox, or 2 pips away from the mirror's tick mark",
     strict=True, pic=T("mirror_mirror_02"), scene=S.mm02())
step(P2, MM, "ย้ายไปกระจกแดง", "On to the red mirrors",
     "ลากบอสไปกระจกแดงบานที่ใกล้ที่สุด (ถ้าห่างเท่ากันให้หมุนตามเข็ม)\n"
     "Healer + Range ไปกระจกแดงอีกบาน\n"
     "spread ข้างกระจกแดง ระวังกรวยโดนอีกกลุ่ม",
     "Bring the boss to the nearest red mirror (equal: go clockwise)\n"
     "Healers + range go to the other red mirror\n"
     "Spread beside the red mirrors without hitting the other group with your cones",
     strict=True, pic=T("mirror_mirror_03"), scene=S.mm03())
BAN = ("บอสร่าย Banish III: spread ทั้งปาร์ตี้ หรือ stack คู่ ดูจากจำนวนลูกแก้วเหนือหัวบอส\n"
       "Healer เดินเข้าไปทางกลางสนาม / Tank อยู่ที่ขอบ / DPS ปรับตาม Tank กับ Healer")
BAN_EN = ("The boss casts Banish III: a party spread or pair stacks, by the number of orbs above its head\n"
          "Healers move towards the centre / tanks stay at the edge / DPS adjust to them")
step(P2, MM, "Banish III: ลูกแก้ว 1 ลูก = stack คู่", "Banish III: one orb = pair stacks",
     BAN + "\n\nลูกแก้ว 1 ลูก: stack คู่ MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
     "MT: Reprisal ตอนท้ายแถบร่าย จะคลุมถึง Light Rampant / ให้ short mitigate กับ D1",
     BAN_EN + "\n\nOne orb: pair stacks MT·D1 / ST·D2 / H1·D3 / H2·D4\n\n"
     "MT: Reprisal late in the cast also covers Light Rampant / give your short to D1",
     strict=True, pic=T("mirror_mirror_04b"), scene=S.mm04b())
step(P2, MM, "Banish III: ลูกแก้ว 4 ลูก = spread", "Banish III: four orbs = spread",
     "ลูกแก้ว 4 ลูก: spread ทั้งปาร์ตี้\n"
     "จากนั้นบอสวาร์ปไปกลางสนามแล้วเริ่ม Mechanic หลักถัดไป",
     "Four orbs: party spread\n"
     "The boss then teleports to the middle and starts its next signature mechanic",
     strict=True, pic=T("mirror_mirror_04a"), scene=S.mm04a())

LR = "Light Rampant"
step(P2, LR, "debuff ของ Light Rampant", "Light Rampant's debuffs",
     "สุ่ม 2 คนทิ้งแอ่ง AoE / อีก 6 คนโดนโซ่โยงกัน (Chains of Everlasting Light)\n"
     "10 วินาทีต่อมา โซ่กลายเป็น Curse of Everlasting Light: ถ้าสายสั้นเกินหรือคนตาย สายขาด = wipe (Refulgent Fate)\n"
     "แต่ละคนโยงกับอีก 2 คน\n\n"
     "2 คนที่โยงกันได้ The Weight of Light (16 วินาที): หมดเวลาระเบิดเป็น stack 4 คน (Powerful Light) +1 Lightsteeped / คนไม่ถึง 4 ได้ Mark of Mortality\n\n"
     "Lightsteeped รวม 6 stack กระจายในปาร์ตี้ (ไม่มีใครเริ่มเกิน 2) / บาง Mechanic เพิ่ม stack / ครบ 5 = wipe\n\n"
     "Mitigate: MT Reprisal / H2 30s / D2 / D4 (mitigate 15 วินาทีคลุมทั้ง Banish III และ Light Rampant ได้)",
     "Two random players drop AoE puddles / the other six are chained together (Chains of Everlasting Light)\n"
     "10 seconds later the chains become Curse of Everlasting Light: a tether too short, or a death, breaks it = wipe (Refulgent Fate)\n"
     "Each player is tethered to two others\n\n"
     "Two connected players get The Weight of Light (16s): a 4-player stack (Powerful Light) that adds a Lightsteeped / fewer than four get Mark of Mortality\n\n"
     "Six Lightsteeped stacks are spread over the party (nobody starts with more than 2) / some mechanics add one / 5 stacks = wipe\n\n"
     "Mitigate: MT Reprisal / H2 30s / D2 / D4 (15s mitigation can cover both Banish III and Light Rampant)",
     strict=False)
step(P2, LR, "ยืนเป็นวงรอบบอส", "A ring around the boss",
     "ยืนระหว่าง marker เป็นวงรอบบอส: Tank กับ Healer ฝั่งเหนือ / DPS ฝั่งใต้",
     "Stand between the waymarks in a ring around the boss: tanks and healers north / DPS south",
     strict=True, pic=T("light_rampant_01"), scene=S.lr01())
step(P2, LR, "แอ่ง 2 คน + โซ่ 6 คน + tower 6 อัน", "Two puddles + six chained + six towers",
     "สุ่ม 2 คนได้แอ่ง / Lightsteeped 6 stack กระจาย (ไม่เกินคนละ 2)\n"
     "อีก 6 คนโดนโซ่: มักโยงกับคนที่ใกล้ที่สุด ถ้าปกติจะต่อกันเป็นวง\n"
     "tower 6 อันขึ้นรอบสนาม\n\n"
     "ภาพตัวอย่าง: MT กับ H1 ได้แอ่ง / D2 กับ D3 ได้ The Weight of Light",
     "Two random players get puddles / six Lightsteeped stacks are spread (no more than two each)\n"
     "The other six are chained, usually to the nearest player, making a ring if all goes well\n"
     "Six towers spawn around the arena\n\n"
     "Picture: MT and H1 have the puddles / D2 and D3 have The Weight of Light",
     strict=False, pic=T("light_rampant_02"), scene=S.lr02())
step(P2, LR, "คนทิ้งแอ่ง: ไปข้างกลางสนาม", "Puddle players: beside the centre",
     "คนทิ้งแอ่ง 2 คนไปยืนติดกลางสนาม ฝั่งตะวันตกเฉียงใต้ 1 คน ตะวันออกเฉียงเหนือ 1 คน แล้วเตรียมทิ้งแอ่ง 5 อันต่อกัน",
     "The two puddle players go just south-west and north-east of the centre and get ready to drop five puddles in a row",
     strict=False, pic=T("light_rampant_03"), scene=S.lr03())
step(P2, LR, "นับคนติดโซ่", "Counting the chained",
     "พร้อมกันนั้นจัดการโซ่: เริ่มนับคนติดโซ่จาก H1 วนตามเข็ม\n"
     "DPS นับง่ายกว่าถ้าเริ่มจาก D1 วนทวนเข็ม",
     "Meanwhile sort the chains: count the chained players clockwise starting from H1\n"
     "DPS will find it easier counting anti-clockwise from D1",
     strict=False, pic=T("light_rampant_04"), scene=S.lr04())
step(P2, LR, "แบ่ง tower ตามลำดับ", "Towers by place in the count",
     "คนติดโซ่ลำดับที่:\n1: tower ตะวันตกเฉียงเหนือ\n2: tower ใต้\n3: tower ตะวันออกเฉียงเหนือ\n4: tower ตะวันตกเฉียงใต้\n5: tower เหนือ\n6: tower ตะวันออกเฉียงใต้\n\n"
     "ยืนใน tower ฝั่งขอบสนาม กันโดนแอ่งของ 2 คนที่ทิ้งอยู่กลางสนาม",
     "Chained player number:\n1: north-west tower\n2: south tower\n3: north-east tower\n4: south-west tower\n5: north tower\n6: south-east tower\n\n"
     "Take your tower on its outer side, so the two puddle players in the middle can't clip you",
     strict=False, pic=T("light_rampant_05"), scene=S.lr05())
step(P2, LR, "สรุป tower ของแต่ละคน", "Each seat's tower at a glance",
     "นับว่ามีคนทิ้งแอ่งอยู่ก่อนเรากี่คน (Tank/Healer ดู H1 → H2 → MT / DPS ดู D1 → D2 → D3) แล้วไป tower ตามนี้\n"
     "H1: 0 คน = ตะวันตกเฉียงเหนือ\n"
     "H2: 0 = ใต้ / 1 = ตะวันตกเฉียงเหนือ\n"
     "MT: 0 = ตะวันออกเฉียงเหนือ / 1 = ใต้ / 2 = ตะวันตกเฉียงเหนือ\n"
     "ST: 0 = ตะวันตกเฉียงใต้ / 1 = ตะวันออกเฉียงเหนือ / 2 = ใต้\n"
     "D1: 0 = ตะวันออกเฉียงใต้\n"
     "D2: 0 = เหนือ / 1 = ตะวันออกเฉียงใต้\n"
     "D3: 0 = ตะวันตกเฉียงใต้ / 1 = เหนือ / 2 = ตะวันออกเฉียงใต้\n"
     "D4: 0 = ตะวันออกเฉียงเหนือ / 1 = ตะวันตกเฉียงใต้ / 2 = เหนือ",
     "Count the puddle players before you (tanks/healers look at H1 → H2 → MT / DPS at D1 → D2 → D3) and take this tower\n"
     "H1: 0 = north-west\n"
     "H2: 0 = south / 1 = north-west\n"
     "MT: 0 = north-east / 1 = south / 2 = north-west\n"
     "ST: 0 = south-west / 1 = north-east / 2 = south\n"
     "D1: 0 = south-east\n"
     "D2: 0 = north / 1 = south-east\n"
     "D3: 0 = south-west / 1 = north / 2 = south-east\n"
     "D4: 0 = north-east / 1 = south-west / 2 = north",
     strict=False)
step(P2, LR, "ทิ้งแอ่ง 5 อัน + tower ลง", "Five puddles + the towers",
     "คนทิ้งแอ่ง: ทิ้งอันแรกออกไปทางนอก แล้ววนตามเข็มทิ้งจนครบ 5 อัน แล้วไปรวมกลุ่มที่ทิศเหนือค่อนตะวันออก (NNE) และใต้ค่อนตะวันตก (SSW)\n"
     "คนติดโซ่: รอ tower ลง (Bright Hunger) แล้วค่อยเข้าไปรวมกลุ่ม",
     "Puddle players: drop the first towards the outside, then rotate clockwise for five in all, then join your group NNE and SSW\n"
     "Chained players: wait for your tower to resolve (Bright Hunger), then collapse onto your group",
     strict=False, pic=T("light_rampant_06"), scene=S.lr06())
step(P2, LR, "ลูกแก้ว 3 ลูก + stack", "Three orbs + the stacks",
     "ลูกแก้วสีขาว 3 ลูกขึ้นเป็นสามเหลี่ยมด้านเท่า บอก AoE ไว้: หลบ\n"
     "The Weight of Light หมดเวลา: stack 4 คน (Powerful Light)\n"
     "รอรับ stack อยู่ที่เดิม: AoE ของลูกแก้วยังไม่ลง",
     "Three white orbs spawn in an equilateral triangle and telegraph AoEs: avoid them\n"
     "The Weight of Light runs out: 4-player stacks (Powerful Light)\n"
     "Stay put for the stack: the orb AoEs haven't gone off yet",
     strict=False, pic=T("light_rampant_07"), scene=S.lr07())
step(P2, LR, "เข้าไปตรงที่ลูกแก้วชุดแรกระเบิด", "Into the first orb blasts",
     "โซ่หายไป\n"
     "เดินเข้าไปตรงที่ลูกแก้วชุดแรกเพิ่งระเบิด: ลูกแก้วอีก 3 ลูกจะขึ้นตรงช่องที่ว่าง แค่หลบ\n"
     "tower 4 คนขึ้นกลางสนาม",
     "The chains disappear\n"
     "Move into the first orb blasts: three more orbs spawn in the empty spots; just avoid them\n"
     "A 4-player tower spawns in the middle",
     strict=False, pic=T("light_rampant_08"), scene=S.lr08())
step(P2, LR, "ลูกแก้วชุด 2 ระเบิด", "The second orbs go off",
     "ลูกแก้วชุดที่ 2 ระเบิด\n"
     "เช็กว่าตัวเองมี Lightsteeped กี่ stack",
     "The second set of orbs explodes\n"
     "Check how many Lightsteeped stacks you have",
     strict=False, pic=T("light_rampant_09"), scene=S.lr09())
step(P2, LR, "tower กลาง: คนมี 2 stack เข้า", "The middle tower: those with 2 stacks",
     "tower 4 คนกลางสนาม\n"
     "คนที่มี Lightsteeped 2 stack ตอนนี้: เข้า tower\n"
     "คนอื่น: ยืนจุดตามเข็มนาฬิกาปกติรอบ tower",
     "The 4-player tower in the middle\n"
     "Players with 2 Lightsteeped stacks now: enter the tower\n"
     "Everyone else: your standard clock spot around it",
     strict=False, pic=T("light_rampant_10"), scene=S.lr10())
step(P2, LR, "Banish III อีกครั้ง", "Banish III again",
     "บอสร่าย Banish III อีกครั้ง ดูลูกแก้วเหนือหัวบอสเหมือนเดิม\n"
     "ลูกแก้ว 1 ลูก: stack คู่ MT·D3 / ST·D2 / H1·D1 / H2·D4\n"
     "ลูกแก้ว 4 ลูก: spread (ยืนจุดตามเข็มนาฬิกาเดิม)\n\n"
     "ภาพตัวอย่าง: stack คู่",
     "The boss casts Banish III again; read the orbs over its head as before\n"
     "One orb: pair stacks MT·D3 / ST·D2 / H1·D1 / H2·D4\n"
     "Four orbs: spread (stay on your clock spots)\n\n"
     "Picture: pair stacks",
     strict=True, pic=T("light_rampant_11"), scene=S.lr11())
step(P2, LR, "The House of Light → Absolute Zero", "The House of Light → Absolute Zero",
     "บอสตีได้อีกครั้ง แล้วร่าย The House of Light: cleave ใส่ทุกคน +1 Lightsteeped\n"
     "spread ยืนจุดตามเข็มนาฬิกาปกติ\n\n"
     "อีกไม่กี่วินาที บอสร่าย Absolute Zero: เป็น enrage ถ้าบอสยังไม่ต่ำกว่า 20.0%\n"
     "ถ้าผ่านเช็กดาเมจ Absolute Zero เป็น raid-wide + knockback: อยู่ใกล้กลางสนาม\n\n"
     "Mitigate The House of Light: ST Reprisal / MT 90s / H2 120s\n"
     "Mitigate Absolute Zero: MT Reprisal / ST 90s / H1 120s / H2 30s",
     "The boss is targetable again and casts The House of Light: cleaves on everyone, +1 Lightsteeped\n"
     "Spread on your standard clock spots\n\n"
     "A few seconds later it casts Absolute Zero: the enrage, unless the boss is under 20.0%\n"
     "If the DPS check is met, Absolute Zero is a raid-wide + knockback instead: stay near the middle\n\n"
     "Mitigate The House of Light: ST Reprisal / MT 90s / H2 120s\n"
     "Mitigate Absolute Zero: MT Reprisal / ST 90s / H1 120s / H2 30s",
     strict=True, pic=T("light_rampant_12"), scene=S.lr12())
step(P2, LR, "ถ้าโซ่พันกัน", "If the chains tangle",
     "โซ่พันกันเกิดไม่บ่อย (ต่ำกว่า 2 ใน 21) และกันไม่ได้ เพราะเกมแจก debuff แบบนี้:\n"
     "สุ่ม 2 คนได้แอ่ง → สุ่มคนเริ่มโซ่ → ต่อไปหาคนที่ใกล้ที่สุดที่ยังไม่มีแอ่งหรือโซ่ ทำซ้ำจนครบ\n"
     "จะพันกันได้ถ้า: คนแอ่ง 2 คนยืนติดกัน / โซ่เริ่มห่างจากคนแอ่ง 2 คน / โซ่ต่อไปทางคนแอ่งก่อน\n\n"
     "ภาพ: MT กับ ST ได้แอ่ง / H1 เริ่มโซ่ → ต่อไป H2 → H2 ต่อไป D1 (ไม่ใช่ D4) = พันกัน\n"
     "ถ้าพัน สายจะไขว้กัน: ให้ 2 คนนั้นสลับที่ (ภาพ: H1 กับ H2)\n\n"
     "stack 2 อันไม่มีวันอยู่ฝั่งเดียวกัน: 2 คนนี้โยงกันเสมอ และคนที่โยงกันจะสลับเหนือ/ใต้\n"
     "ไม่เข้า tower = Inescapable Illumination (raid-wide + Damage Down)",
     "Tangled chains are uncommon (under 2 in 21) and can't be prevented, because of how the game hands them out:\n"
     "two random puddles → a random player starts the chain → it connects to the closest player without a puddle or chain, again and again\n"
     "It can tangle if: the two puddle players are next to each other / the chain starts two players from a puddle / it first connects towards a puddle\n\n"
     "Picture: MT and ST have puddles / H1 starts → H2 → H2 to D1 (not D4) = tangled\n"
     "Tangled tethers cross: the two players swap (picture: H1 and H2)\n\n"
     "The two stacks are never on the same side: those two are always tethered, and tethered players alternate north/south\n"
     "Missing a tower = Inescapable Illumination (raid-wide + Damage Down)",
     strict=False, pic=T("light_rampant_tether_faq"), scene=S.lrfaq())

EIA = "Endless Ice Age"
step(P2, EIA, "เตรียมรับ knockback ของ Absolute Zero", "Ready for Absolute Zero's knockback",
     "ช่วงเปลี่ยนผ่านสั้นๆ\n"
     "ยืนเตรียมรับ knockback ของ Absolute Zero: จุด spread ตรงนี้ไม่เหมือนจุดอื่น\n\n"
     "เคล็ดลับ: ใช้ LB3 ของ caster ใส่คริสตัลทั้งหมดเพื่อข้ามช่วงนี้ไปซ้อม P3 ได้ แต่จะผ่าน P4 ไม่ได้\n"
     "ถ้าใช้ LB3 ให้ตี Crystal of Light ไปด้วยระหว่างรอ: LB3 อย่างเดียวทำลาย Crystal of Light ไม่หมด",
     "The short transition\n"
     "Pre-position for Absolute Zero's knockback: these spread spots are different\n\n"
     "Tip: a caster LB3 on all the crystals skips this to practise P3, but you then can't get past P4\n"
     "If you LB3, keep hitting the Crystals of Light while it resolves: the LB3 alone won't destroy them",
     strict=True, pic=T("crystals_01"), scene=S.cr01())
step(P2, EIA, "คริสตัลแสง 4 + คริสตัลมืด 4", "Four light + four dark crystals",
     "Crystal of Light 4 อัน กับ Crystal of Darkness 4 อัน ขึ้นตามภาพ\n"
     "เป้าหมาย: ทำลาย Ice Veil ตรงกลาง (ที่ร่าย Endless Ice Age) โดยห้ามทำลาย Crystal of Darkness\n"
     "Ice Veil ตีได้ แต่ไม่รับดาเมจตราบที่ยังมี Crystal of Light เหลือ\n\n"
     "Healer / Range: ช่วยคู่ Tank/Melee ทำลาย Crystal of Light ในช่องของตัวเองก่อน",
     "Four Crystals of Light and four Crystals of Darkness appear as drawn\n"
     "The goal: destroy the Ice Veil in the middle (casting Endless Ice Age) without destroying a Crystal of Darkness\n"
     "The Ice Veil is targetable but immune while any Crystal of Light remains\n\n"
     "Healers / range: help your tank/melee partner destroy the Crystal of Light in your sector first",
     strict=True, pic=T("crystals_02"), scene=S.cr02())
step(P2, EIA, "ล่อ AoE ชุดแรก: เยื้องตามเข็ม", "First baits: skewed clockwise",
     "Tank + Melee ดูแล Crystal of Light:\n"
     "ยิง AoE วงกลมใส่คนที่ใกล้ที่สุดเป็นระยะ / ต่อมาโยงสายใส่คนที่ใกล้ที่สุด แล้วคนนั้นจะทิ้งแอ่งที่ค้างอยู่\n\n"
     "Healer + Range ดูแล Crystal of Darkness:\n"
     "เล็งกรวยใส่คนที่ใกล้ที่สุดเป็นระยะ / ถ้ากรวยโดนคริสตัล คริสตัลจะได้บัฟที่ทำให้รับดาเมจน้อยลง: หันกรวยออก\n\n"
     "ไม่ให้โดนกัน: ล่อ AoE ชุดแรกเยื้องตามเข็ม (ไปทางซ้ายเมื่อหันหน้าเข้ากลาง) แล้วสลับซ้าย/ขวาไปเรื่อยๆ",
     "Tanks + melee handle the Crystals of Light:\n"
     "they periodically drop a circle AoE on the nearest player / later they tether the nearest player, who then drops lasting puddles\n\n"
     "Healers + range handle the Crystals of Darkness:\n"
     "they periodically aim a cone at the nearest player / a cone hitting a crystal gives it a damage-taken reduction: aim away\n\n"
     "To avoid hitting each other: bait the first set skewed clockwise (to the left, facing in), then alternate left and right",
     strict=True, pic=T("crystals_03"), scene=S.cr03())
step(P2, EIA, "ล่อชุดที่ 2: เยื้องทวนเข็ม", "Second baits: skewed anti-clockwise",
     "ล่อ AoE ชุดที่ 2 เยื้องทวนเข็ม (ไปทางขวาเมื่อหันหน้าเข้ากลาง)",
     "Bait the second set skewed anti-clockwise (to the right, facing in)",
     strict=True, pic=T("crystals_04"), scene=S.cr04())
step(P2, EIA, "ชุดที่ 3: คริสตัลแสงโยงสาย", "Third set: the light crystals tether",
     "AoE ชุดที่ 3: Crystal of Light โยงสายใส่คนที่ใกล้ที่สุด",
     "On the third set of AoEs, the Crystals of Light tether the nearest player",
     strict=True, pic=T("crystals_05"), scene=S.cr05())
step(P2, EIA, "ชุดที่ 4: คนรับสายทิ้งแอ่ง", "Fourth set: the tethered drop puddles",
     "AoE ชุดที่ 4: คนที่รับสายเริ่มทิ้งแอ่งที่ค้างบนพื้น\n"
     "เหยียบแอ่งนี้ = ติด Bleed ที่ถึงตาย",
     "On the fourth set the tethered players start dropping puddles that stay\n"
     "Stepping in one inflicts a lethal Bleed",
     strict=True, pic=T("crystals_06"), scene=S.cr06())
step(P2, EIA, "ทิ้งแอ่งวนรอบคริสตัล", "Puddles around the crystal",
     "ล่อแอ่งวนรอบ Crystal of Light ของตัวเอง\n"
     "ถึง Crystal of Light แตกหมดแล้ว Crystal of Darkness ยังอยู่: ยังต้องล่อกรวยให้ถูกต่อไป",
     "Bait the puddles around your Crystal of Light\n"
     "Even after the Crystals of Light are gone the Crystals of Darkness remain: keep baiting their cones properly",
     strict=True, pic=T("crystals_07"), scene=S.cr07())
step(P2, EIA, "Ice Veil + เช็กดาเมจ → P3", "The Ice Veil + the DPS check → P3",
     "Crystal of Light แตกครบ 4 (Crystal of Darkness ยังอยู่ครบ): Gaia พูด \"My power surges!\" แล้ว Ice Veil ไม่อมตะอีก\n"
     "ถ้า Crystal of Darkness ยังอยู่ครบ Gaia จะทำดาเมจ 50.0% ใส่ Ice Veil ก่อน Endless Ice Age ลง = เช็กดาเมจคือตี Ice Veil ให้ต่ำกว่า 50.0%\n"
     "ถ้าทุกอย่างถูกต้อง สร้อยน้ำแข็งจะโผล่บนพื้นข้าง Usurper of Frost แล้วถูกดูดหายไป\n\n"
     "stack ทางใต้เตรียม phase ถัดไป: Usurper of Frost ใช้ raid-wide (Junction) แล้วเผยตัวเป็น Mitron สิง Gaia กลายเป็น Oracle of Darkness\n\n"
     "ถ้าทำลาย Crystal of Darkness: ยังเล่นต่อได้ถึงท้าย P4 แต่จะเป็น bad ending (Eden's Promise ออกมา wipe) และ Ice Veil จะอมตะจนกว่า Crystal of Darkness จะแตกหมด\n"
     "Gaia พูด \"Is my Darkness not enough!?\" = มีอะไรผิด\n\n"
     "ผ่านเช็กดาเมจไม่ได้: ฆ่า Fatebreaker ช้าๆ ตอนท้าย enrage ให้ burst 2 นาทีตรงกับช่วงนี้ และกินยาครั้งที่ 2 ให้เร็วที่สุดในช่วงคริสตัล จะได้กลับมาทันใน P4",
     "Once all four Crystals of Light are destroyed (all four dark ones alive), Gaia exclaims \"My power surges!\" and the Ice Veil loses its invulnerability\n"
     "With every Crystal of Darkness alive, Gaia deals 50.0% to the Ice Veil just before Endless Ice Age resolves = the check is to get the Ice Veil below 50.0%\n"
     "If all goes well, an ice necklace appears by the Usurper of Frost and is absorbed\n\n"
     "Stack south for the next phase: the Usurper of Frost does a raid-wide (Junction), reveals herself as Mitron and possesses Gaia, who becomes the Oracle of Darkness\n\n"
     "Destroying a Crystal of Darkness: you can still play to the end of P4, but it is the bad ending (Eden's Promise spawns and wipes), and the Ice Veil stays invulnerable until every dark crystal is gone\n"
     "Gaia saying \"Is my Darkness not enough!?\" = something went wrong\n\n"
     "Can't meet the check: kill Fatebreaker late in its enrage so your 2-minute burst lines up here, and pot early in the crystals so it's back for P4",
     strict=False)
