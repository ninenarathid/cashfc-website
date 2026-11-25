"""The second trash pack and boss 2 (Lala): game8 573819."""
from core import step, FR
import sc2 as S2

PT2 = ("ทางเดิน 2: ก่อนบอส 2", "Trash 2: before boss 2")
PB2 = ("บอส 2: Lala", "Boss 2: Lala")


def build():
    step(PT2, "Kill order", "ฆ่าตัวที่มีเครื่องหมายดาบทีละตัว", "One sword-marked enemy at a time",
         "ฆ่าตัวที่มีเครื่องหมายดาบก่อน ทีละตัว:\n"
         "1. Aloalo Wood Golem ตัวตะวันออกเฉียงใต้: ล่อผ่านกลางสนาม ไปฆ่าที่ตะวันตกเฉียงเหนือ\n"
         "2. Aloalo Islekeeper ที่เดินผ่านกลางสนามมา: ฆ่าที่ตะวันตกเฉียงใต้\n"
         "3. Aloalo Wood Golem: ล่อจากตะวันออกเฉียงใต้ไปตะวันออกเฉียงเหนือแล้วฆ่า\n"
         "4. Aloalo Islekeeper\n\n"
         "ฆ่าได้ทีละตัว ศัตรูจะเดินเร็วขึ้นเรื่อยๆ\nถ้าฆ่าช้า ศัตรูใช้ท่าหมดเวลา",
         "Kill the sword-marked enemy first, one at a time:\n"
         "1. The south-east Aloalo Wood Golem: pull it through the middle and kill it in the north-west\n"
         "2. The Aloalo Islekeeper that comes through the middle: kill it in the south-west\n"
         "3. Aloalo Wood Golem: take it from the south-east to the north-east and kill it\n"
         "4. Aloalo Islekeeper\n\n"
         "With every kill the enemies move faster\nIf a kill takes too long, they use a time-out attack",
         refs=[FR("trash2-golem", "v2", 26, "ศัตรูชุดที่ 2: ฆ่าทีละตัว ตามเครื่องหมายดาบ", "The second pack: one at a time, by the sword marker")])
    step(PT2, "Aloalo Wood Golem", "ท่าของ Aloalo Wood Golem", "Aloalo Wood Golem's attacks",
         "Ancient Aero III: ขัดการร่าย (interrupt) ได้\n"
         "Tornado → Ovation: เลือก 1 คน ติด bind (Esuna แก้ได้) แล้วตบ AoE แนวตรงใส่คนที่ถูก bind",
         "Ancient Aero III: can be interrupted\n"
         "Tornado → Ovation: binds one player (Esuna removes it), then a line AoE at the bound player",
         refs=[FR("trash2-interrupt", "v2", 26, "Ancient Aero III ของ Wood Golem: ขัดการร่าย (interrupt) ได้", "The Wood Golem's Ancient Aero III: it can be interrupted")])
    step(PT2, "Aloalo Islekeeper", "ท่าของ Aloalo Islekeeper", "Aloalo Islekeeper's attacks",
         "Ancient Quaga: raid-wide + DoT Sludge\nGravity Force: stack\nIsle Drop: AoE วงกลมใต้เท้าผู้เล่นที่ถูกสุ่ม",
         "Ancient Quaga: a raid-wide + a Sludge DoT\nGravity Force: a stack\nIsle Drop: a circle under a random player",
         refs=[FR("trash2-keeper", "v2", 98, "Aloalo Islekeeper: ฆ่าที่ตะวันตกเฉียงใต้ ระวัง Ancient Quaga (raid-wide + DoT)", "Aloalo Islekeeper: killed in the south-west; watch Ancient Quaga (raid-wide + DoT)")])

    step(PB2, "Inferno Theorem", "raid-wide", "Raid-wide",
         "raid-wide ไม่มี DoT\nแต่ควรใช้ mitigate และ barrier", "A raid-wide with no DoT\nstill, use mitigation and barriers",
         refs=[FR("inferno-theorem", "v2", 782, "Inferno Theorem: raid-wide ใช้ mitigate + barrier", "Inferno Theorem: raid-wide; mitigate + barriers")])

    AB = "Angular Addition → Arcane Blight"
    step(PB2, AB, "ภาพรวม", "Overview",
         "Angular Addition: บอสได้ buff ที่เพิ่มจำนวนการหมุนของ Arcane Blight เป็น 3 เท่า (Times Three) หรือ 5 เท่า (Times Five)\n"
         "Arcane Blight หมุนทีละ 1/4 วง\n\n"
         "ภาพ: สีแดง = โดน Arcane Blight / ส่วนที่ไม่แดง = ปลอดภัย\nIII / V ข้างบอส = 3 เท่า / 5 เท่า\nลูกศรดำที่ตราเหนือบอส = ทิศที่หมุน",
         "Angular Addition: the boss gains a buff that makes Arcane Blight turn 3 times (Times Three) or 5 times (Times Five)\n"
         "Arcane Blight turns a quarter at a time\n\n"
         "Picture: red = hit by Arcane Blight / the part that isn't red = safe\nIII / V beside the boss = three / five times\nThe black arrow on the seal above the boss = the direction it turns",
         refs=[FR("angular-addition", "v2", 222, "Angular Addition: ดู III / V บนตราเหนือบอส และทิศที่หมุน", "Angular Addition: read III / V on the seal above the boss and its turn")])
    for i, (n, cw, s0, s1, pa, pb) in enumerate([(5, True, 270, 0, "b2-02", "b2-03"), (5, False, 270, 180, "b2-04", "b2-05"),
                                                  (3, True, 270, 180, "b2-06", "b2-07"), (3, False, 270, 0, "b2-08", "b2-09")]):
        th = f"{n} เท่า {'ตามเข็ม' if cw else 'ทวนเข็ม'}"
        en = f"×{n} {'clockwise' if cw else 'anticlockwise'}"
        step(PB2, AB, f"{th}: ตอนเริ่มร่าย", f"{en}: as the cast starts",
             f"{th}: ตอนเริ่มร่าย ช่องว่างอยู่ทิศตะวันตก", f"{en}: as the cast starts, the gap is to the west",
             strict=False, pic=pa, scene=S2.blight_pic(n, cw, s0))
        dirth = {0: "เหนือ", 180: "ใต้"}[s1]
        dire = {0: "north", 180: "south"}[s1]
        step(PB2, AB, f"{th}: ตอนยิง", f"{en}: when it fires",
             f"{th}: ตอนยิง ช่องว่างไปอยู่ทิศ{dirth}", f"{en}: when it fires, the gap has moved to the {dire}",
             strict=False, pic=pb, scene=S2.blight_pic(n, cw, s1))
    step(PB2, AB, "คิดง่ายๆ", "The easy way to think",
         "หมุนครั้งละ 1/4 วง\nหมุนตามเข็ม 5 ครั้ง = หมุนตามเข็ม 1 ครั้ง\nหมุน 3 ครั้ง = ย้อนกลับ 1 ครั้ง\n\n"
         "ดูแค่ 2 อย่าง: 3 เท่าหรือ 5 เท่า / ตามเข็มหรือทวนเข็ม\nแล้วจากช่องว่างแรก ขยับไปข้างหน้าหรือถอยกลับ 1 ช่อง",
         "Each turn is a quarter\nFive turns clockwise = one turn clockwise\nThree turns = one turn back\n\n"
         "Check only two things: three or five / clockwise or anticlockwise\nthen from the first gap move one forward or one back")

    AN = "Analysis → Arcane Array → Arcane Blight → Targeted Light"
    step(PB2, AN, "ภาพรวม: ลำดับ", "Overview: the order",
         "ลำดับ: ลูกแสงลูกที่ 1 → Arcane Blight ของบอส → ลูกแสงลูกที่ 2 → Targeted Light (Analysis)\nจำลำดับนี้ให้ขึ้นใจ\n\n"
         "Analysis: ทุกคนติด debuff ด้าน 'ยังไม่วิเคราะห์' (Front / Back / Left / Right Unseen)\n"
         "ต้องหันด้านนั้นใส่ลูกแสงขาว 2 ลูกในสนามด้วย\n\n"
         "Targeted Light สุดท้าย: ด้าน Unseen ก็ถูกคูณการหมุนด้วย\nต้องหันด้านที่เปลี่ยนแล้วเข้าหาบอส",
         "The order: orb 1 → the boss's Arcane Blight → orb 2 → Targeted Light (Analysis)\nLearn this order by heart\n\n"
         "Analysis: everyone gets an unseen side (Front / Back / Left / Right Unseen)\n"
         "Turn that side to the two white orbs on the field as well\n\n"
         "The last Targeted Light: the unseen side is turned by the multiplier too\nface the boss with the side after it has turned",
         refs=[FR("analysis", "v2", 793, "Analysis: ดู debuff ด้าน Unseen ของตัวเอง", "Analysis: check your own Unseen side"),
               FR("arcane-array", "v2", 222, "Arcane Array: ช่องสีฟ้าเลื่อนไป ลูกแสงขาวระเบิดเมื่อช่องมาถึง", "Arcane Array: the blue tiles move; a white orb bursts when they reach it")])
    step(PB2, AN, "① ติด Analysis", "① Analysis goes on", "ทุกคนติด Analysis", "Everyone gets Analysis",
         strict=False, pic="b2-10", scene=S2.ana1())
    step(PB2, AN, "② Arcane Array + ลูกแสงขาว", "② Arcane Array + white orbs",
         "Arcane Array และลูกแสงขาวโผล่\nลูกแสงขาวระเบิดเมื่อช่องของ Arcane Array ทับมัน",
         "Arcane Array and the white orbs appear\nAn orb goes off when an Arcane Array tile covers it",
         strict=False, pic="b2-11", scene=S2.ana2())
    step(PB2, AN, "③ ลูกแสงใต้ระเบิด: หันด้าน Unseen", "③ The south orb goes off: turn your unseen side",
         "ลูกแสงทางใต้ระเบิด: หันด้าน Unseen ใส่มัน", "The south orb goes off: turn your unseen side to it",
         strict=False, pic="b2-12", scene=S2.ana3())
    step(PB2, AN, "④ Arcane Blight เริ่ม", "④ Arcane Blight starts",
         "Arcane Blight ของบอสเริ่มร่าย\nภาพ: 5 เท่า ตามเข็ม", "The boss starts Arcane Blight\nPicture: ×5 clockwise",
         strict=False, pic="b2-13", scene=S2.ana4())
    step(PB2, AN, "⑤ Arcane Blight ลง: วิ่งเข้าช่องว่าง", "⑤ Arcane Blight fires: run into the gap",
         "Arcane Blight ลง: วิ่งเข้าช่องว่าง\nArcane Array ทำให้ที่ปลอดภัยแคบลง: ระวัง",
         "Arcane Blight fires: run into the gap\nArcane Array narrows the safe area: careful",
         strict=False, pic="b2-14", scene=S2.ana5())
    step(PB2, AN, "⑥ ลูกแสงลูกที่ 2: หันด้าน Unseen", "⑥ The second orb: turn your unseen side",
         "ลูกแสงขาวลูกที่ 2 ระเบิด: หันด้าน Unseen ใส่มัน", "The second white orb goes off: turn your unseen side to it",
         strict=False, pic="b2-15", scene=S2.ana6())
    step(PB2, AN, "⑦ Targeted Light: หันด้านที่เปลี่ยนแล้วเข้าหาบอส", "⑦ Targeted Light: face the boss with the turned side",
         "สุดท้ายบอสยิง Targeted Light\nด้าน Unseen เปลี่ยนตามจำนวนการหมุน: หันด้านที่เปลี่ยนแล้วเข้าหาบอส",
         "Last, the boss fires Targeted Light\nYour unseen side has turned by the multiplier: face the boss with the side after the turn",
         strict=False, pic="b2-16", scene=S2.ana7(),
         refs=[FR("targeted-light", "v2", 252, "Targeted Light: หันด้าน Unseen ที่เปลี่ยนแล้วเข้าหาบอส", "Targeted Light: face the boss with the unseen side after the turn")])
    step(PB2, "Strategic Strike", "tank buster", "Tank buster",
         "tank buster: Tank ใช้ mitigate ให้เต็มที่", "A tank buster: the tank uses mitigation fully",
         refs=[FR("strategic-strike", "v2", 482, "Strategic Strike: tank buster ใส่ Tank", "Strategic Strike: a tank buster on the tank")])

    PT = "Planar Tactics"
    step(PB2, PT, "debuff ของ Mechanic นี้", "The debuffs",
         "Forced March: หมดเวลาแล้วเดินไปทางที่หันอยู่\nโดนคูณด้วย 3 หรือ 5 ของ Angular Addition: ปรับทิศที่หันตาม (ส่วนใหญ่แค่หันขวาหรือซ้ายตามจำนวนเท่า)\n\n"
         "Subtractive Suppressor: เลขเท่าไร ต้องเหยียบ AoE ของช่องกลางให้ครบเท่านั้นจนเหลือ 0\n\n"
         "stack: บางทีตกที่ DPS 1 คน + TH 1 คน บางทีตก DPS ทั้งคู่ หรือ TH ทั้งคู่\nถ้าตกที่คนเลข 2 + คนเลข 1 หรือ 3: คนเลข 2 เป็นคนปรับที่ยืน",
         "Forced March: when it runs out you walk the way you face\nThe ×3 or ×5 of Angular Addition applies: adjust your facing (mostly just turn right or left by the multiplier)\n\n"
         "Subtractive Suppressor: step in the middle tiles' AoEs as many times as its number, down to 0\n\n"
         "The stacks: sometimes one DPS + one tank/healer, sometimes both DPS or both tank/healer\nIf they land on a 2 and a 1 or 3: the 2 adjusts",
         refs=[FR("planar-tactics", "v2", 306, "Planar Tactics: ช่องสีส้มคือ AoE ที่ต้องเหยียบให้เลขเหลือ 0", "Planar Tactics: the orange tiles are the AoEs to step in until your count is 0")])
    step(PB2, PT, "แบบของ Hamukatsu ①: รูปพื้นฐาน", "Hamukatsu's way ①: the base shape",
         "game8 ใช้แบบของ Hamukatsu\nรูปพื้นฐานเป็นแบบนี้\n\nภาพ: ไอคอนแดงมีเลข = Subtractive Suppressor / ไอคอนฟ้า 2 คน = stack",
         "game8 uses Hamukatsu's way\nThis is the base shape\n\nPicture: red icon with a number = Subtractive Suppressor / blue two-figure icon = stack",
         strict=False, pic="b2-17", scene=S2.planar())
    step(PB2, PT, "แบบของ Hamukatsu ②: เลข 2 ปรับ", "Hamukatsu's way ②: the 2 adjusts",
         "ถ้า stack ตกที่คนเลข 2 กับคนเลข 1 หรือ 3: คนเลข 2 เป็นคนปรับ", "If the stacks land on a 2 and a 1 or 3: the 2 adjusts",
         strict=False, pic="b2-18", scene=S2.planar(True))
    step(PB2, PT, "คิดตามเลขของตัวเอง", "By your own number",
         "เลข 3: stack กับเลข 2 ที่จุดระเบิดลูกที่ 3\n\n"
         "เลข 2: stack กับเลข 3\nเลข 2 คนที่อยู่ใกล้ช่องที่ขาดไป: stack กับเลข 1\nถ้า stack ตกที่เลข 2 กับเลข 1 หรือ 3: เลข 2 ที่ได้ stack เป็นคนปรับ\n\n"
         "เลข 1: stack กับเลข 2 ข้างๆ เลยยืนชิดไปทางเลข 2\nยืนฝั่งช่องที่ขาดไป",
         "3: stack with a 2 at the third blast\n\n"
         "2: stack with the 3\nThe 2 nearer the missing tile: stack with the 1\nIf the stacks land on a 2 and a 1 or 3: the 2 with the stack adjusts\n\n"
         "1: stack with the 2 next to you, so lean toward the 2\nStand on the missing tile's side")

    SP = "Spatial Tactics"
    step(PB2, SP, "ภาพรวม", "Overview",
         "ต้องทำ Subtractive Suppressor ให้เหลือ 0 เหมือนเดิม\n"
         "Arcane Array แตะก้อนสี่เหลี่ยมแดง: เกิด AoE กากบาท โดน AoE นี้แล้วเลขลดลง\n"
         "ลูกแสงระเบิด (หลบไม่ได้) ก็ลดเลข 1 ด้วย: คิดเป็นเลขของตัวเองลบ 1\n\n"
         "ถ้าเหลือเลข 1 ขึ้นไป: ล้มทั้งปาร์ตี้",
         "Subtractive Suppressor has to reach 0 again\n"
         "When Arcane Array touches a red cube, a cross AoE goes off; each one you take lowers your count\n"
         "The orb's blast (unavoidable) also lowers it by 1: think of it as your number minus 1\n\n"
         "Any count of 1 or more left: the party wipes",
         refs=[FR("spatial-tactics", "v2", 578, "Spatial Tactics: ก้อนสี่เหลี่ยมแดงระเบิดเป็นกากบาทเมื่อช่องฟ้ามาแตะ", "Spatial Tactics: a red cube bursts in a cross when the blue tiles touch it")])
    step(PB2, SP, "① ติดเลข + จุดเริ่ม", "① Your number + where to start",
         "ทุกคนติด Subtractive Suppressor\nยืนจุดเริ่มตามภาพจะทำง่าย", "Everyone gets Subtractive Suppressor\nStarting as in the picture makes it easy",
         strict=True, pic="b2-25", scene=S2.sp1())
    step(PB2, SP, "② ลูกแสง + กากบาทแรก", "② The orb + the first cross",
         "ลูกแสงและกากบาทแรกลง\nเลข 1: ลูกแสงลดให้เหลือ 0 แล้ว ที่เหลือแค่หลบกากบาท",
         "The orb and the first cross go off\nThe 1: the orb has taken you to 0, so just stay out of the crosses",
         strict=False, pic="b2-26", scene=S2.sp2())
    step(PB2, SP, "③ ลูกแสง + กากบาท", "③ The orb + a cross", "ลูกแสงและกากบาทลง", "The orb and a cross go off",
         strict=False, pic="b2-27", scene=S2.sp3())
    step(PB2, SP, "④ เลข 4 ต้องโดนกากบาท 3 ครั้ง", "④ The 4 needs three crosses",
         "เลข 4 ต้องโดนกากบาท 3 ครั้ง: ตั้งจุดเริ่มตรงที่ก้อนไฟอยู่หนาแน่น",
         "The 4 must take three crosses: start where the fire cubes are packed together",
         strict=False, pic="b2-28", scene=S2.sp4())
    step(PB2, SP, "⑤ กากบาทกลาง: เลข 2 รับ", "⑤ The middle cross: the 2 takes it",
         "กากบาทกลางลง: เลข 2 รับอันนี้", "The middle cross goes off: the 2 takes this one",
         strict=False, pic="b2-29", scene=S2.sp5())
    step(PB2, SP, "⑥ Arcane Blight ปิดท้าย", "⑥ Arcane Blight to finish",
         "สุดท้าย Arcane Blight: หลบให้ดี\nเลข 4 ถอยหลังจากจุดเริ่มไปรับกากบาทสุดท้าย",
         "Last comes Arcane Blight: dodge it\nThe 4 backs off from the start to take the last cross",
         strict=False, pic="b2-30", scene=S2.sp6())

    SS = "Symmetric Surge → Constructive Figure → Arcane Plot"
    step(PB2, SS, "ภาพรวม", "Overview",
         "AoE ใหญ่และ stack ในที่ปลอดภัยที่แคบลงเรื่อยๆ จาก Arcane Plot และ AoE ระเบิด",
         "A big AoE and stacks inside a safe area that keeps shrinking from Arcane Plot and the blasts",
         refs=[FR("symmetric-surge", "v2", 698, "Symmetric Surge: รับ stack ในร่องระหว่าง AoE 2 วง", "Symmetric Surge: take the stacks in the gap between two AoEs")])
    step(PB2, SS, "① ติด stack", "① The stacks go on", "ติด debuff stack", "The stack debuffs go on",
         strict=False, pic="b2-31", scene=S2.surge1())
    step(PB2, SS, "② ตุ๊กตาโผล่: แยกออก-ตก", "② Dolls appear: split east and west",
         "Arcane Plot และตุ๊กตาโผล่\nถือฝั่งตุ๊กตาเป็นเหนือ แล้วแยกไปตะวันออก-ตะวันตก\nถ้ามี macro ตำแหน่ง ทำตาม macro",
         "Arcane Plot and the dolls appear\nTake the dolls' side as north and spread east and west\nIf you have a positions macro, follow it",
         strict=False, pic="b2-32", scene=S2.surge2())
    step(PB2, SS, "③ หลบแนวตรง + รับ Arcane Point", "③ Dodge the lines + take Arcane Point",
         "ตุ๊กตายิง AoE แนวตรง: หลบ แล้วรับ Arcane Point\nตรงที่รับ Arcane Point จะเกิดตรา Arcane Plot",
         "The dolls fire line AoEs: dodge them and take Arcane Point\nAn Arcane Plot seal appears where you took it",
         strict=True, pic="b2-33", scene=S2.surge3())
    step(PB2, SS, "④ stack ตกไม่ดี: DPS สลับ", "④ Lopsided stacks: the DPS swap",
         "ถ้า stack ตกเอียงตั้งแต่แรก: DPS สลับกันแบบในภาพ", "If the stacks went on lopsided: the DPS swap as in the picture",
         strict=True, pic="b2-34", scene=S2.surge4())
    step(PB2, SS, "⑤ Explosive Theorem: รับที่มุม", "⑤ Explosive Theorem: take it in the corner",
         "Explosive Theorem ลง: รับที่มุมของที่ปลอดภัย\nให้ AoE 2 วงเว้นร่องปลอดภัยไว้ตรงกลาง",
         "Explosive Theorem goes off: take it at the corners of the safe area\nso the two AoEs leave a safe gap between them",
         strict=True, pic="b2-35", scene=S2.surge5())
    step(PB2, SS, "⑥ stack ในร่อง: จบ", "⑥ Stack in the gap: done",
         "รับ stack ในร่องปลอดภัย: จบ Mechanic", "Take the stacks in the safe gap: done",
         strict=False, pic="b2-36", scene=S2.surge6())
    step(PB2, SS, "⑦ แบบลำแสงขอบต่างไป", "⑦ When the edge beams differ",
         "ลำแสงจากขอบสนามบางแบบออกมาแบบในภาพ", "Depending on the edge beams it can also look like this",
         strict=True, pic="b2-37", scene=S2.surge7())
    step(PB2, SS, "⑧ หลบลำแสง เข้าที่ว่าง", "⑧ Dodge the beams, step into the cleared tiles",
         "หลบลำแสง แล้ววิ่งเข้าช่องที่เพิ่งโดนไป\nต่อจากนั้นทำเหมือน ⑤ ⑥", "Dodge the beams and run into the tiles just hit\nthen as in ⑤ and ⑥",
         strict=True, pic="b2-38", scene=S2.surge8())
