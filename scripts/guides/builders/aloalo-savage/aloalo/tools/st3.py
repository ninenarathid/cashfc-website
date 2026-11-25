"""Boss 3 (Statice): game8 574133."""
from core import step, FR
import sc3 as S3

PB3 = ("บอส 3: Statice", "Boss 3: Statice")
DNOTE = "ภาพของ game8 บอสนี้เขียน DPS แค่ D: ในภาพ D1 / D2 สลับกันได้"
DNOTE_EN = "game8's pictures for this boss mark DPS only as D: D1 / D2 in the pictures are interchangeable"


def build():
    step(PB3, "Aero IV", "raid-wide", "Raid-wide",
         "raid-wide: ใช้ mitigate และ barrier\n\n" + DNOTE, "A raid-wide: use mitigation and barriers\n\n" + DNOTE_EN,
         refs=[FR("aero-iv", "v3", 662, "Aero IV: raid-wide ใช้ mitigate + barrier", "Aero IV: raid-wide; mitigate + barriers")])

    TR = "Trick Reload → Trapshooting → Trigger Happy"
    step(PB3, TR, "Trick Reload: อ่านกระสุน 8 นัด", "Trick Reload: read the eight shots",
         "Statice บรรจุกระสุน 8 นัด แต่ละนัดบรรจุสำเร็จหรือพลาด เปลี่ยนวิธีโจมตี\n\n"
         "นัดที่ 1 และ 8: ใช้กับ Trapshooting\nบรรจุพลาด = stack / บรรจุสำเร็จ = spread\nนัดที่ 1 สำเร็จ นัดที่ 8 จะพลาดเสมอ (และกลับกัน)\n\n"
         "นัดที่ 2–7: ใช้กับ Trigger Happy\nTrigger Happy: สนามแบ่ง 6 ส่วน มีลูกเต๋า 1–6\nลูกเต๋าเลขเท่ากับนัดที่บรรจุพลาด = ปลอดภัย\n"
         "นับเฉพาะนัดที่ 2–7: นับนัดที่ 2 เป็นนัดแรก",
         "Statice loads eight shots; whether each one loads or misfires changes the attack\n\n"
         "Shots 1 and 8: for Trapshooting\nMisfire = stack / loaded = spread\nIf shot 1 loads, shot 8 always misfires (and the other way round)\n\n"
         "Shots 2–7: for Trigger Happy\nTrigger Happy: the arena splits into 6 parts with dice 1–6\nThe die matching the misfired shot is safe\n"
         "Count only shots 2–7: count shot 2 as the first",
         refs=[FR("trick-reload", "v3", 74, "Trick Reload: ดูว่านัดไหนบรรจุพลาด", "Trick Reload: watch which shot misfires"),
               FR("trigger-happy", "v3", 97, "Trigger Happy: สนามแบ่ง 6 ส่วนตามลูกเต๋า ส่วนเดียวที่ปลอดภัย", "Trigger Happy: six parts by die; only one is safe")])
    step(PB3, TR, "① นัดที่ 1 สำเร็จ: spread", "① Shot 1 loads: spread",
         "นัดที่ 1 บรรจุสำเร็จ: Trapshooting เป็น spread", "Shot 1 loads: Trapshooting is a spread",
         strict=False, pic="b3-02", scene=S3.tr_spread(),
         refs=[FR("trapshooting", "v3", 86, "Trapshooting: stack หรือ spread ตามนัดที่ 1 / 8", "Trapshooting: stack or spread by shot 1 / 8")])
    step(PB3, TR, "② นัดที่ 1 พลาด: stack", "② Shot 1 misfires: stack",
         "นัดที่ 1 บรรจุพลาด: Trapshooting เป็น stack", "Shot 1 misfires: Trapshooting is a stack",
         strict=False, pic="b3-03", scene=S3.tr_stack())
    step(PB3, TR, "③ Trigger Happy: ไปลูกเต๋าของตัวเอง", "③ Trigger Happy: go to your die",
         "Trigger Happy ลง: ไปที่ลูกเต๋าเลขเดียวกับนัดที่บรรจุพลาด (ในนัดที่ 2–7)",
         "Trigger Happy goes off: go to the die that matches the misfired shot (among shots 2–7)",
         strict=False, pic="b3-04", scene=S3.th_dice())
    step(PB3, TR, "④ ตัวอย่าง: นัดที่ 6 พลาด", "④ Example: shot 6 misfires",
         "ภาพ: นัดที่ 6 บรรจุพลาด → ไปลูกเต๋า 6 ก็หลบได้", "Picture: shot 6 misfires → go to die 6 and you're clear",
         strict=False, pic="b3-05", scene=S3.th_safe6())

    RR = "Ring a Ring o' Explosions → Trapshooting"
    step(PB3, RR, "ภาพรวม", "Overview",
         "สนามมีระเบิด 2 ชุด ชุดละ 3 ลูก โยงสายกัน\nใน 6 ลูก 1 ลูกเรืองแสง: ลูกที่โยงสายกับมันระเบิดตามด้วย (ระเบิดรวม 3 ลูก)\n"
         "พร้อมกันนั้นต้องรับ Trapshooting จากนัดที่ 8 ของ Trick Reload\n\nภาพ: ลูกส้ม = ระเบิด / ลูกดำ = ไม่ระเบิด",
         "Two sets of three bombs appear, tethered together\nOne of the six lights up, and the bombs tethered to it go off too (three blasts in all)\n"
         "At the same time, take Trapshooting from shot 8 of Trick Reload\n\nPicture: orange bomb = goes off / black bomb = doesn't",
         refs=[FR("ring-a-ring", "v3", 126, "Ring a Ring o' Explosions: ระเบิด 2 ชุดโยงสายกัน ดูว่าชุดไหนระเบิด", "Ring a Ring o' Explosions: two tethered sets; see which set goes off")])
    for i, (p, pk) in enumerate([(S3.P1, "b3-06"), (S3.P2, "b3-07"), (S3.P3, "b3-08"), (S3.P4, "b3-09")]):
        step(PB3, RR, f"แบบระเบิดที่ {i + 1}", f"Blast pattern {i + 1}", f"ระเบิดแบบที่ {i + 1}", f"Blast pattern {i + 1}",
             strict=False, pic=pk, scene=S3.rr(p))
    step(PB3, RR, "แบบที่ 1 + spread", "Pattern 1 + spread", "แบบระเบิดที่ 1 + Trapshooting เป็น spread", "Blast pattern 1 + Trapshooting as a spread",
         strict=False, pic="b3-10", scene=S3.rr_spread())
    step(PB3, RR, "แบบที่ 1 + stack", "Pattern 1 + stack", "แบบระเบิดที่ 1 + Trapshooting เป็น stack", "Blast pattern 1 + Trapshooting as a stack",
         strict=False, pic="b3-11", scene=S3.rr_stack())

    DD = "Ring a Ring o' Explosions 2 → Dartboard of Dancing Explosives"
    step(PB3, DD, "ภาพรวม + สีที่ต้องเหยียบ", "Overview + your colour",
         "ระเบิดเหมือนรอบก่อน แต่ชุดระเบิด 3×2 ลูกหมุนไปด้วย\nสนามกลายเป็นกระดานปาเป้า (dart)\n"
         "4 คนมี 3 คนติด debuff dart: 3 คนนี้ต้องเหยียบสีแดง เหลือง ฟ้า คนละสี\n"
         "หาที่ปลอดภัยจากระเบิดที่หมุน เหยียบ 3 สีในที่ปลอดภัย และรับ Trapshooting\n\n"
         "สีที่ต้องเหยียบเมื่อติด dart:\nTank: ฟ้า\nHealer: เหลือง\nDPS: แดง\n\n"
         "ถ้า Tank หรือ Healer ไม่ได้ dart: DPS ปรับ (D1 ปรับ) ไปเหยียบสีของคนนั้นแทน",
         "The bombs work as before, but the 3×2 sets turn\nThe arena becomes a dartboard\n"
         "Three of the four get a dart debuff: those three must stand on red, yellow and blue, one each\n"
         "Find the safe area from the turning bombs, cover the three colours in it, and take Trapshooting\n\n"
         "Your colour if you have a dart:\nTank: blue\nHealer: yellow\nDPS: red\n\n"
         "If the tank or healer has no dart: a DPS adjusts (D1 adjusts) and takes their colour",
         strict=False, says={"MT": "dart: เหยียบฟ้า", "H1": "dart: เหยียบเหลือง", "D1": "dart: เหยียบแดง / ถ้า Tank หรือ Healer ไม่ได้ dart คุณไปแทน", "D2": "dart: เหยียบแดง"},
         says_en={"MT": "Dart: stand on blue", "H1": "Dart: stand on yellow", "D1": "Dart: stand on red / if the tank or healer has none, you take theirs", "D2": "Dart: stand on red"},
         refs=[FR("dartboard", "v3", 194, "Dartboard of Dancing Explosives: กระดานสีแดง เหลือง ฟ้า + ระเบิดที่หมุน", "Dartboard of Dancing Explosives: red, yellow and blue board + turning bombs")])
    step(PB3, DD, "① ระเบิด + กระดาน: จำชุดที่จะระเบิด", "① Bombs + board: note the set that blows",
         "ระเบิดโผล่ และสนามเปลี่ยนเป็นกระดานปาเป้า\nดูว่าลูกไหนเรืองแสง และชุดที่โยงสายกับมัน",
         "The bombs appear and the arena turns into a dartboard\nSee which bomb lights up and which set is tethered to it",
         strict=False, pic="b3-12", scene=S3.darts1())
    step(PB3, DD, "② ระเบิดหมุน: หมุนกล้องตาม", "② The bombs turn: turn your camera with them",
         "ระเบิดเริ่มหมุน: หมุนกล้องตามไปด้วย ตามดูชุดที่จะระเบิดตลอด",
         "The bombs start turning: turn your camera along and keep track of the set that will blow",
         strict=False, pic="b3-13", scene=S3.darts2())
    step(PB3, DD, "③ ระเบิดลง: ยังไม่ต้องเหยียบสี", "③ The blasts: no colours yet",
         "ระเบิดลง\ndart ตัดสินหลังระเบิด: ตอนนี้ยังไม่ต้องเหยียบ 3 สี",
         "The bombs go off\nThe darts are judged after the blasts: no need to be on the colours yet",
         strict=False, pic="b3-14", scene=S3.darts3())
    step(PB3, DD, "④ Trapshooting เป็น stack", "④ Trapshooting as a stack",
         "หลังระเบิดทันที Trapshooting ลงด้วย\nภาพ: แบบ stack", "Right after the blasts, Trapshooting goes off\nPicture: the stack",
         strict=False, pic="b3-15", scene=S3.darts4())
    step(PB3, DD, "⑤ Trapshooting เป็น spread", "⑤ Trapshooting as a spread",
         "ภาพ: แบบ spread", "Picture: the spread",
         strict=False, pic="b3-16", scene=S3.darts5())

    SB = "Surprise Balloon → Beguiling Glitter → Trigger Happy → Trapshooting"
    step(PB3, SB, "ภาพรวม", "Overview",
         "ลูกโป่งใหญ่ 2 ลูกโผล่: แตกแล้ว knockback\nBeguiling Glitter: ติด debuff Forced March และต่อด้วย Trigger Happy → Trapshooting\n\n"
         "Forced March ทำงานก่อน Trapshooting\nถ้าเป็น stack: ปรับทิศให้เดินไปรวมกันที่ใต้เท้าบอส",
         "Two big balloons appear: they knock back when they pop\nBeguiling Glitter: Forced March goes on, then Trigger Happy → Trapshooting\n\n"
         "Forced March goes off before Trapshooting\nIf it's a stack: face so that you walk together to the boss's feet",
         refs=[FR("surprise-balloon", "v3", 266, "Surprise Balloon: ลูกโป่งแตกแล้ว knockback", "Surprise Balloon: a balloon knocks back when it pops"),
               FR("beguiling-glitter", "v3", 254, "Beguiling Glitter: ติด Forced March ดูทิศของตัวเอง", "Beguiling Glitter: Forced March goes on; check your direction")])
    step(PB3, SB, "① กัน knockback ไว้ก่อน", "① Prepare for the knockback",
         "ภาพ: นัดที่ 4 บรรจุพลาด\nพอลูกเต๋าโผล่ ใช้ Arm's Length / Surecast: กัน knockback ของลูกโป่งได้",
         "Picture: shot 4 misfires\nRight after the dice appear, use Arm's Length / Surecast: it stops the balloons' knockback",
         strict=False, pic="b3-17", scene=S3.bal1())
    step(PB3, SB, "② Trigger Happy + ลูกโป่งลูกแรกแตก", "② Trigger Happy + the first balloon pops",
         "Trigger Happy ลง: 4 ปลอดภัย จึงยืนที่ 4\nลูกโป่งลูกแรกแตกพร้อมกัน", "Trigger Happy: 4 is safe, so stand on 4\nThe first balloon pops at the same time",
         strict=False, pic="b3-18", scene=S3.bal2())
    step(PB3, SB, "③ ลูกโป่งลูกที่ 2: เช็กทิศ Forced March", "③ The second balloon: check your Forced March",
         "ลูกโป่งลูกที่ 2 แตก\nต่อด้วย Trapshooting ทันที: ดูทิศ Forced March ของตัวเองไว้", "The second balloon pops\nTrapshooting comes right after: check your Forced March direction",
         strict=False, pic="b3-19", scene=S3.bal3())
    step(PB3, SB, "④ Trapshooting เป็น stack", "④ Trapshooting as a stack",
         "ถ้าเป็น stack: รวมที่ใต้เท้าบอส\nยืนห่างจากบอสแล้วปรับทิศให้เดินเข้าไปที่ใต้เท้าบอส",
         "If it's a stack: gather at the boss's feet\nStand away from the boss and face so you walk into its feet",
         strict=False, pic="b3-20", scene=S3.bal4())
    step(PB3, SB, "⑤ Trapshooting เป็น spread", "⑤ Trapshooting as a spread",
         "ถ้าเป็น spread: ปรับทิศให้เดินแยกไป 4 ทิศ", "If it's a spread: face so the four of you walk off four ways",
         strict=False, pic="b3-21", scene=S3.bal5())

    PB = "Ring a Ring o' Explosions 3 → Present Box"
    step(PB3, PB, "ภาพรวม + กฎ", "Overview + the rules",
         "บอสเลือกเป้าหมายไม่ได้\nระเบิดออกได้ 2 แบบ / 2 คนเป็นมิสไซล์ (มีสายโซ่ไฟ) / 2 คนเป็น Death by Claw\n"
         "วิ่งเข้าที่ปลอดภัยที่ระเบิดเหลือไว้\nDeath by Claw: ถ้าแตะแล้วถูกตรึง (bind) ขยับไม่ได้: ระวัง\n\n"
         "กฎ:\nRule 1: ถือระเบิดที่จะระเบิดซึ่งหันหน้าเข้าหา marker ตัวเลข เป็นทิศเหนือ\n"
         "Rule 2: คนมิสไซล์วิ่งไป marker ตัวเลขตะวันออก-ตะวันตก ไปทางที่ดึงสายให้ยืด\nRule 3: คน Death by Claw ไปทางใต้\n\n"
         "game8 อ้างวิธีนี้จากที่ผู้เล่นคนหนึ่งเผยแพร่บน X",
         "The boss can't be targeted\nThe bombs come in two layouts / two players are missiles (with fire chains) / two have Death by Claw\n"
         "Run into the safe area the bombs leave\nDeath by Claw: touching it binds you in place: careful\n\n"
         "The rules:\nRule 1: treat the exploding bomb that faces a number waymark as north\n"
         "Rule 2: missiles run to the east / west number waymarks, the way that stretches the tether\nRule 3: Death by Claw goes south\n\n"
         "game8 credits this way to a player who shared it on X",
         refs=[FR("present-box", "v3", 398, "Present Box: มิสไซล์และ Death by Claw วิ่งเข้าที่ปลอดภัยของระเบิด", "Present Box: missiles and Death by Claw run into the bombs' safe area")])
    step(PB3, PB, "แบบดาว", "The star layout",
         "ภาพ:\nRule 1: marker 2 เป็นเหนือ\nRule 2: มิสไซล์ไป marker 1 และ 3\nRule 3: Death by Claw ไปใต้ (marker 4)\n\nวงฟ้า = AoE ของ Present Box / วงเข้มรอบ 2 คน = Death by Claw",
         "Picture:\nRule 1: waymark 2 is north\nRule 2: missiles to waymarks 1 and 3\nRule 3: Death by Claw goes south (waymark 4)\n\nBlue circles = Present Box's AoEs / dark ring around two players = Death by Claw",
         strict=False, pic="b3-22", scene=S3.present_star())
    step(PB3, PB, "แบบสามเหลี่ยม 2 อัน", "The two-triangle layout",
         "ภาพ:\nRule 1: marker 1 เป็นเหนือ\nRule 2: มิสไซล์ไป marker 2 และ 4\nRule 3: Death by Claw ไปใต้ (marker 3)",
         "Picture:\nRule 1: waymark 1 is north\nRule 2: missiles to waymarks 2 and 4\nRule 3: Death by Claw goes south (waymark 3)",
         strict=False, pic="b3-23", scene=S3.present_tri())
    step(PB3, "Shocking Abandon", "tank buster", "Tank buster",
         "tank buster: ใช้ buff ป้องกันให้เต็มที่", "A tank buster: use your defensive buffs fully",
         refs=[FR("shocking-abandon", "v3", 482, "Shocking Abandon: tank buster ใส่ Tank", "Shocking Abandon: a tank buster on the tank")])

    PW = "Pinwheeling Dartboard"
    step(PB3, PW, "ภาพรวม", "Overview",
         "ทำพร้อมกัน: สายโซ่ไฟ + dart + stack คู่ที่มีเวลานับถอยหลัง\nกำแพงไฟหมุนตามเข็มหรือทวนเข็ม: อย่าให้โดน\n"
         "dart: 3 สีถูกปิด 1 สี เหยียบ 2 สีที่เหลือ แบ่ง 2 กลุ่ม",
         "All at once: fire chains + darts + a countdown pair stack\nA wall of fire turns clockwise or anticlockwise: stay out of it\n"
         "Darts: one of the three colours is shut, so cover the other two in two groups",
         refs=[FR("pinwheeling", "v3", 614, "Pinwheeling Dartboard: กระดานปาเป้า + กำแพงไฟหมุน", "Pinwheeling Dartboard: the dartboard + a turning wall of fire")])
    step(PB3, PW, "วิธีของ spell: หาทิศเหนือ", "spell's way: find north",
         "game8 ใช้วิธีของ spell (เผยแพร่บน X)\nลูกศรฟ้าโผล่ที่ใดที่หนึ่งในสนาม: สีตรงลูกศรฟ้า = สีที่ห้ามเหยียบ\n"
         "รับ dart / นับถอยหลัง / สายโซ่ บนอีก 2 สีที่เหลือ\n\n"
         "ถือจุดที่ 2 สีที่เหลืออยู่ติดกัน เป็นทิศเหนือของการแยก\nแคปซูลไฟที่ขึ้น 3 อัน = ผู้สมัครทิศเหนือ\n\n"
         "ภาพ: แคปซูลบน = เหนือเมื่อสีฟ้าถูกปิด / ซ้ายล่าง = เมื่อเหลืองถูกปิด / ขวาล่าง = เมื่อแดงถูกปิด\n"
         "ลำดับ: 1. ดูว่าลูกศรฟ้าปิดสีไหน 2. หาเหนือ 3. คน dart กับคนไม่มี dart เข้าแถว",
         "game8 follows spell's way (shared on X)\nA blue arrow appears somewhere: the colour under it is the one you must not stand on\n"
         "Handle the darts, the countdown and the chains on the other two colours\n\n"
         "Take the spot where the two remaining colours sit side by side as north for the split\nThe three fire capsules = the candidates for north\n\n"
         "Picture: top capsule = north when blue is shut / lower left = when yellow is / lower right = when red is\n"
         "Order: 1. see which colour the blue arrow shuts 2. find north 3. dart and no-dart players line up",
         strict=False, pic="b3-24", scene=S3.pw_legend())
    step(PB3, PW, "① เข้าจุดเริ่ม", "① Take your starting spot",
         "ทุกคนเข้าจุดเริ่ม\nจากนั้นได้นับถอยหลังหรือสายโซ่: แยกทำตาม debuff",
         "Everyone takes their starting spot\nThen the countdown or the chains go on: split by debuff",
         strict=False, pic="b3-25", scene=S3.pw1())
    step(PB3, PW, "② คนสายโซ่ไปกลาง / ที่เหลือไปเหนือ", "② Chains to the middle / the rest to north",
         "คนสายโซ่ไปกลางสนาม\nคนไม่มีสายโซ่และคนนับถอยหลังไปทางเหนือ",
         "Chained players go to the middle\nEveryone without a chain, and the countdown players, head north",
         strict=False, pic="b3-26", scene=S3.pw2())
    step(PB3, PW, "③ ดึงสายโซ่ไปด้านข้าง", "③ Pull the chain sideways",
         "คนสายโซ่ดึงไปด้านข้างตรงๆ ให้สายขาด\nแบ่งวงเป็นครึ่งบน-ล่าง แล้วไปยืนครึ่งบน: 2 คนสายโซ่จะได้เหยียบคนละสีเอง",
         "The chained pair pull straight sideways to break it\nSplit the circle into upper and lower halves and stand in the upper half: the two chained players land on different colours",
         strict=False, pic="b3-27", scene=S3.pw3())
    step(PB3, PW, "④ อีกแบบ: dart กับคนไม่มี dart ได้สายโซ่", "④ Another case: a dart and a no-dart player are chained",
         "อีกแบบ: คน dart กับคนไม่มี dart ได้สายโซ่\nคน dart และคนไม่มี dart ที่เหลือ ทำนับถอยหลัง",
         "Another case: a dart player and a no-dart player get the chain\nThe other dart and no-dart players take the countdown",
         strict=False, pic="b3-28", scene=S3.pw4())
    step(PB3, PW, "⑤ อีกแบบ: คน dart 2 คนได้สายโซ่", "⑤ Another case: two dart players chained",
         "อีกแบบ: คน dart 2 คนได้สายโซ่ / คนไม่มี dart ทำนับถอยหลัง\nจบ dart และสายโซ่แล้ว AoE ไฟยังเหลือ: หนีไฟต่อ อย่าประมาท",
         "Another case: two dart players are chained / the no-dart player takes the countdown\nAfter the darts and chains the fire AoE is still there: keep running from it",
         strict=False, pic="b3-29", scene=S3.pw5())

    FN = "Beguiling Glitter → Ring a Ring o' Explosions 4 → Trapshooting"
    step(PB3, FN, "ภาพรวม + เวลา Forced March", "Overview + Forced March timing",
         "Beguiling Glitter: ติด Forced March (เวลาสั้นหรือยาว)\nต่อด้วยหาที่ปลอดภัยของ Present Box และรับ Trapshooting ในที่ปลอดภัยของระเบิด\n\n"
         "Forced March เวลาสั้น (40 วินาที): ทำงานตอน Trigger Happy + Present Box\nปรับทิศให้ไปถึงที่ปลอดภัยของ Trigger Happy ที่อยู่ในช่อง donut ปลอดภัยของ Present Box ด้วย\n\n"
         "Forced March เวลายาว (50 วินาที): ทำงานตอนระเบิด\nรับ Trapshooting ในที่ปลอดภัยของระเบิด\nถ้าเป็น stack: ไปหา 2 คนที่ Forced March ไม่ทำงาน",
         "Beguiling Glitter: Forced March goes on (short or long)\nThen find Present Box's safe spot and take Trapshooting in the bombs' safe area\n\n"
         "Short Forced March (40 s): goes off during Trigger Happy + Present Box\nFace so you reach Trigger Happy's safe part that is also in Present Box's safe donut gap\n\n"
         "Long Forced March (50 s): goes off during the bombs\nTake Trapshooting in the bombs' safe area\nIf it's a stack: go to the two whose Forced March doesn't go off",
         refs=[FR("final-bombs", "v3", 714, "Present Box ครั้งสุดท้าย: วงฟ้า = AoE ของ Present Box หาช่องปลอดภัย", "The last Present Box: blue circles = its AoEs; find the safe gap")])
    step(PB3, FN, "① Trapshooting ลงก่อน", "① Trapshooting first", "Trapshooting ลงก่อน\nภาพ: นัดที่บรรจุสำเร็จ (spread)",
         "Trapshooting goes off first\nPicture: the shot loaded (spread)", strict=False, pic="b3-30", scene=S3.fin1())
    step(PB3, FN, "② Present Box + Trigger Happy: Forced March สั้น", "② Present Box + Trigger Happy: the short Forced March",
         "Present Box และ Trigger Happy ทำงาน + Forced March เวลาสั้นทำงาน\nปรับทิศให้ไปถึงที่ปลอดภัยของ Trigger Happy ที่อยู่ในช่อง donut ปลอดภัยด้วย",
         "Present Box and Trigger Happy go off + the short Forced March goes off\nFace so you reach Trigger Happy's safe part inside the safe donut gap",
         strict=False, pic="b3-31", scene=S3.fin2())
    step(PB3, FN, "③ Trigger Happy ลง: ต่อด้วยระเบิด", "③ Trigger Happy goes off: the bombs are next",
         "Trigger Happy ลง จากนั้นระเบิดทำงาน", "Trigger Happy goes off, then the bombs",
         strict=False, pic="b3-32", scene=S3.fin3())
    step(PB3, FN, "④ Trapshooting + Forced March ยาว", "④ Trapshooting + the long Forced March",
         "Trapshooting ลงพร้อมระเบิด (ภาพ: stack)\nForced March เวลายาวทำงานตอนนี้: ปรับทิศ",
         "Trapshooting comes with the bombs (picture: stack)\nThe long Forced March goes off now: set your facing",
         strict=False, pic="b3-33", scene=S3.fin4())
    step(PB3, FN, "⑤ stack ในที่ปลอดภัย: จบ", "⑤ Stack in the safe area: done",
         "รับ stack ในที่ปลอดภัย: จบ Mechanic", "Take the stack in the safe area: done",
         strict=False, pic="b3-34", scene=S3.fin5())
