"""P2: Limit Cut (02a_limit_cut) and Brute Justice + Cruise Chaser (02b_bjcc), as Tuufless's Notes has them."""
import scenes_tea as S
from frames_list import FR

IMG = "https://ffxiv.tuufless.com/images/ultimates/tea/"
PH = ("P2 Limit Cut", "P2 Limit Cut")
LC = "Limit Cut"
T1, T1E = "1211 (แผนหลัก)", "1211 (the main plan)"
T2, T2E = "1256", "1256"

LC1211 = [
    ("① ระเบิดคู่แรก", "① First pair", "① ระเบิดคู่แรก: ทุกคนเดินไปหาระเบิดลูกที่อยู่ครึ่งเหนือ (ฝั่งตะวันตก)",
     "① First pair of explosions: everyone moves towards the one in the northern (west) half"),
    ("② ระเบิดคู่ที่ 2: 1, 2 เข้าที่", "② Second pair: 1 and 2 in place", "② ระเบิดคู่ที่ 2\n1, 2: เข้าตำแหน่ง และใช้ anti-knockback",
     "② Second pair of explosions\n1, 2: take your positions and use anti-knockback"),
    ("③ ระเบิดคู่ที่ 3", "③ Third pair", "③ ระเบิดคู่ที่ 3\nภาพ: 1 ออกนอกเยื้องไปข้างหน้า / 2 ออกนอกเยื้องไปข้างหลัง / ที่เหลือรอใกล้ๆ",
     "③ Third pair of explosions\nPicture: 1 out and forward / 2 out and back / the rest close by"),
    ("④ ระเบิดคู่ที่ 4: 3, 4 เข้าที่", "④ Fourth pair: 3 and 4 in place", "④ ระเบิดคู่ที่ 4: ทุกคนรอหลังเส้นที่ระเบิดเพิ่งลง\n3, 4: เข้าตำแหน่ง และใช้ anti-knockback\nภาพ: Cruise Chaser ฟัน 1 แล้วพุ่งใส่ 2",
     "④ Fourth pair: everyone waits behind the line where it went off\n3, 4: take your positions and use anti-knockback\nPicture: Cruise Chaser cleaves 1, then dashes at 2"),
    ("⑤ ระเบิดลูกที่ 5", "⑤ Fifth explosion", "⑤ ระเบิดลูกที่ 5 (กลางสนาม)", "⑤ Fifth explosion (the middle)"),
    ("⑥ ระเบิดคู่ที่ 6", "⑥ Sixth pair", "⑥ ระเบิดคู่ที่ 6\nภาพ: Cruise Chaser ฟัน 3 แล้วพุ่งใส่ 4", "⑥ Sixth pair of explosions\nPicture: Cruise Chaser cleaves 3, then dashes at 4"),
    ("⑦ ระเบิดคู่ที่ 7: 5, 6 เข้าที่", "⑦ Seventh pair: 5 and 6 in place", "⑦ ระเบิดคู่ที่ 7\n5, 6: เข้าตำแหน่ง และใช้ anti-knockback",
     "⑦ Seventh pair of explosions\n5, 6: take your positions and use anti-knockback"),
    ("⑧ ระเบิดคู่ที่ 8: 7, 8 เข้าที่", "⑧ Eighth pair: 7 and 8 in place", "⑧ ระเบิดคู่ที่ 8\n7, 8: เข้าตำแหน่ง และใช้ anti-knockback\nภาพ: Cruise Chaser ฟัน 5 แล้วพุ่งใส่ 6",
     "⑧ Eighth pair of explosions\n7, 8: take your positions and use anti-knockback\nPicture: Cruise Chaser cleaves 5, then dashes at 6"),
    ("⑨ ระเบิดคู่ที่ 9: อย่าเพิ่งเข้ากลาง", "⑨ Ninth pair: not the middle yet", "⑨ ระเบิดคู่ที่ 9: อย่าเพิ่งเข้ากลางสนาม",
     "⑨ Ninth pair of explosions: don't go into the middle yet"),
    ("⑩ ระเบิดลูกสุดท้าย", "⑩ The last explosion", "⑩ ระเบิดลูกที่ 10 (ลูกสุดท้าย)\nH1, H2: heal ทุกคนให้เต็ม เตรียมรับ J Kick\nภาพ: Cruise Chaser ฟัน 7 แล้วพุ่งใส่ 8",
     "⑩ The tenth (last) explosion\nH1, H2: heal everyone up for J Kick\nPicture: Cruise Chaser cleaves 7, then dashes at 8"),
]
LC1256 = [
    ("① ระเบิดคู่แรก: แยก 2 กลุ่ม", "① First pair: two groups", "① ระเบิดคู่แรก\n1, 2, 5, 6: ไปที่ระเบิดฝั่งเหนือ (ตะวันตก)\n3, 4, 7, 8: ไปที่ระเบิดฝั่งใต้ (ตะวันออก)",
     "① First pair of explosions\n1, 2, 5, 6: go to the north (west) explosion\n3, 4, 7, 8: go to the south (east) explosion"),
    ("② ระเบิดคู่ที่ 2", "② Second pair", "② ระเบิดคู่ที่ 2\n1: แนะนำให้ใช้ Sprint", "② Second pair of explosions\n1: Sprint is recommended"),
    ("③ ระเบิดคู่ที่ 3: 1, 2", "③ Third pair: 1 and 2", "③ ระเบิดคู่ที่ 3\n1: ไปยืนตรงที่ระเบิดลูกที่ 3 เพิ่งลง โดยไม่ข้ามเส้น\n2: ยืนหลัง 1 ใน 'ชิ้นพิซซ่า' เดียวกัน",
     "③ Third pair of explosions\n1: move to where the third explosion was without crossing the line\n2: stand behind 1 in the same 'pizza slice'"),
    ("④ ระเบิดคู่ที่ 4: 3, 4", "④ Fourth pair: 3 and 4", "④ ระเบิดคู่ที่ 4\n3: ไปยืนตรงที่ระเบิดลูกที่ 4 เพิ่งลง โดยไม่ข้ามเส้น\n4: ยืนหลัง 3 ในชิ้นเดียวกัน\nภาพ: Cruise Chaser ฟัน 1 แล้วพุ่งใส่ 2",
     "④ Fourth pair of explosions\n3: move to where the fourth explosion was without crossing the line\n4: stand behind 3 in the same slice\nPicture: Cruise Chaser cleaves 1, then dashes at 2"),
    ("⑤ ระเบิดลูกที่ 5", "⑤ Fifth explosion", "⑤ ระเบิดลูกที่ 5 (กลางสนาม)\nภาพ: คู่ด้านนอกกับคู่ด้านในสลับที่กันแล้ว", "⑤ Fifth explosion (the middle)\nPicture: the outer and inner pairs have swapped"),
    ("⑥ ระเบิดคู่ที่ 6", "⑥ Sixth pair", "⑥ ระเบิดคู่ที่ 6\nภาพ: Cruise Chaser ฟัน 3 แล้วพุ่งใส่ 4", "⑥ Sixth pair of explosions\nPicture: Cruise Chaser cleaves 3, then dashes at 4"),
    ("⑦ ระเบิดคู่ที่ 7: 5, 6", "⑦ Seventh pair: 5 and 6", "⑦ ระเบิดคู่ที่ 7\n5: ไปยืนตรงที่ระเบิดลูกที่ 7 เพิ่งลง โดยไม่ข้ามเส้น\n6: ยืนหลัง 5 ในชิ้นเดียวกัน",
     "⑦ Seventh pair of explosions\n5: move to where the seventh explosion was without crossing the line\n6: stand behind 5 in the same slice"),
    ("⑧ ระเบิดคู่ที่ 8: 7, 8", "⑧ Eighth pair: 7 and 8", "⑧ ระเบิดคู่ที่ 8\n7: ไปยืนตรงที่ระเบิดลูกที่ 8 เพิ่งลง โดยไม่ข้ามเส้น\n8: ยืนหลัง 7 ในชิ้นเดียวกัน\nภาพ: Cruise Chaser ฟัน 5 แล้วพุ่งใส่ 6",
     "⑧ Eighth pair of explosions\n7: move to where the eighth explosion was without crossing the line\n8: stand behind 7 in the same slice\nPicture: Cruise Chaser cleaves 5, then dashes at 6"),
    ("⑨ ระเบิดคู่ที่ 9", "⑨ Ninth pair", "⑨ ระเบิดคู่ที่ 9", "⑨ Ninth pair of explosions"),
    ("⑩ ระเบิดลูกสุดท้าย: เข้ากลาง", "⑩ The last explosion: come in", "⑩ ระเบิดลูกที่ 10 (ลูกสุดท้าย): ทุกคนเข้ากลางรับ heal เตรียม J Kick\n3, 4: ไม่จำเป็นต้องอยู่ฝั่งเดียวกับ 7, 8 ตรงนี้ เพราะระเบิดลูกสุดท้ายลงก่อน Cruise Chaser ฟัน 7\nภาพ: Cruise Chaser ฟัน 7 แล้วพุ่งใส่ 8",
     "⑩ The tenth (last) explosion: everyone comes to the middle for heals before J Kick\n3, 4: you don't have to be on 7 and 8's side here, as the last explosion goes off before Cruise Chaser cleaves 7\nPicture: Cruise Chaser cleaves 7, then dashes at 8"),
]


def p2(step):
    step(PH, LC, "ภาพรวม: ช่วงเปลี่ยน phase", "Overview: the transition",
         "ไม่ใช่ phase จริง แต่ช่วงเปลี่ยนไป Brute Justice + Cruise Chaser นี้ไม่ง่าย และน่าจะเป็นช่วงเปลี่ยน phase เดียวในบรรดา Ultimate ที่กินเวลาฝึกจริงจัง\n"
         "ต้องทำ Limit Cut ไปพร้อมกับหลบ Hawk Blaster (ระเบิดวงกลม) ทีละคู่ ที่ไล่ตามเข็มนาฬิการอบสนาม\n\n"
         "มี 2 แผนหลัก: 1211 กับ 1256 (เลือกได้ที่แท็บ)\n"
         "PF ของ Elemental ใช้ 1211 ตกลงกับปาร์ตี้ให้ชัดก่อนเริ่ม",
         "Not really a phase, but the transition to Brute Justice + Cruise Chaser isn't trivial, and is probably the only Ultimate transition that takes real prog time\n"
         "Limit Cut has to be resolved together with pairs of Hawk Blaster explosions that go clockwise around the arena\n\n"
         "There are two main strats: 1211 and 1256 (pick a tab)\n"
         "Elemental's PF uses 1211; agree on it before you start",
         strict=False, refs=[FR("lc-numbers")])
    step(PH, LC, "Limit Cut ทำงานยังไง", "How Limit Cut works",
         "ทุกคนได้เลข 1 ถึง 8 แล้วเกิดตามลำดับ\n"
         "1. Cruise Chaser โผล่ด้านหลังคนเลขคี่ (คนแรกคือ 1) ตามทิศที่คนนั้นหันหน้า\n"
         "2. Cruise Chaser ฟันกรวยใส่คนเลขคี่\n"
         "3. Cruise Chaser พุ่งเป็นแนวเส้นตรงใส่คนเลขถัดไป (เลขคู่)\n"
         "วนแบบนี้ (ฟันเลขคี่ พุ่งเลขคู่) จนครบ 8 ถ้าเลขไหนไม่อยู่ Cruise Chaser เลือกเป้าสุ่มแทน\n\n"
         "โดน Cruise Chaser ติด Magic Vulnerability Up: ห้ามโดนซ้ำ\n"
         "ถ้าไม่ได้หันหน้าหา Cruise Chaser ตอนโดนตี จะกระเด็นออกจาก Cruise Chaser\n"
         "Cruise Chaser โผล่หลังเลขคี่เสมอ: เลขคี่จะกระเด็นไปข้างหน้าเสมอ ถ้าไม่ใช้ Arm's Length / Surecast\n"
         "ภาพ: CC = Cruise Chaser หลัง 1 / ลูกศรเหลือง = 1 กระเด็นไปข้างหน้า",
         "Everyone gets a number from 1 to 8, then in order\n"
         "1. Cruise Chaser appears behind the odd player (1 first), by the way that player faces\n"
         "2. Cruise Chaser cleaves the odd player in a cone\n"
         "3. Cruise Chaser dashes at the next (even) player in a line AoE\n"
         "This repeats (cleave odd, dash even) through all eight; a missing number makes it pick a random target\n\n"
         "Being hit gives Magic Vulnerability Up, so nobody can be hit twice\n"
         "If you aren't facing Cruise Chaser when it hits you, you are knocked away from it\n"
         "As it always appears behind the odd players, they are always knocked forward unless they use Arm's Length / Surecast\n"
         "Picture: CC = Cruise Chaser behind 1 / the yellow arrow = 1 knocked forward",
         strict=False, pic=IMG + "02a/limit_cut.jpg", scene=S.lc_breakdown())

    step(PH, LC, "1211: ภาพรวม", "1211: overview",
         "แผน 1211 มาจาก Korean simulator\n"
         "ชื่อ 1211 มาจากจำนวนระเบิดที่เว้นก่อนแต่ละคู่ทำ Alpha Sword + Super Blassty Charge ของ Cruise Chaser\n"
         "ต่างจาก simulator: แผนนี้ให้ทั้งเลขคี่และเลขคู่หัน Cruise Chaser ออกนอกสนาม เยื้องไปหน้า / หลังตามแนวทแยง\n"
         "(simulator หัน Cruise Chaser ออกนอกตรงๆ และหันเข้าทะลุกลางสนาม)\n\n"
         "มาโคร: เริ่มจากระเบิดลูกแรกที่ออกระหว่างตะวันตกกับตะวันออกเฉียงเหนือ\n"
         "เลขคี่: ออกนอก + ไปข้างหน้า\n"
         "เลขคู่: ออกนอก + ถอยหลัง\n"
         "ภาพ: ครึ่งสีน้ำเงิน = ฝั่งที่เริ่ม / ตัวเลขบนลูกศร = ระเบิดที่เว้น 1, 2, 1, 1",
         "1211 is the strat the Korean simulator shows\n"
         "The name comes from the explosion intervals before each pair resolves Cruise Chaser's Alpha Sword + Super Blassty Charge\n"
         "Unlike the simulator, both odd and even players point Cruise Chaser outside, forward / back at diagonals\n"
         "(the simulator points it straight out, and straight in through the middle)\n\n"
         "Macro: start from the first explosion between W and NE\n"
         "Odds: out + forward\n"
         "Evens: out + back\n"
         "Picture: the blue half = where you start / the numbers on the arrows = the intervals 1, 2, 1, 1",
         strict=False, pic=IMG + "02a/limit_cut_1211_overview.jpg", scene=S.lc_overview_1211(), plan=T1, plan_en=T1E)
    for k, (n, ne, t, te) in enumerate(LC1211, 1):
        refs = None
        step(PH, LC, n, ne, t, te, strict=False, pic=f"{IMG}02a/limit_cut_1211_{k:02d}.jpg", scene=S.lc_1211(k), plan=T1, plan_en=T1E, refs=refs)

    step(PH, LC, "1256: ภาพรวม", "1256: overview",
         "แผนที่ Tuufless ชอบเอง: ลื่นไหลกว่า ไม่ต้องหันหน้าออกนอกสนามหรือใช้ anti-knockback และการแบ่ง 1256 / 3478 ตรงกับตอน Wormhole Formation ทีหลัง\n"
         "แต่เรียนยากกว่า โดยเฉพาะคนที่เพิ่งเริ่ม TEA\n\n"
         "ชื่อ 1256 มาจากเลขในกลุ่ม\n"
         "1 2 5 6: เริ่มที่ระเบิดฝั่งเหนือ (ตะวันตก)\n"
         "3 4 7 8: เริ่มที่ระเบิดฝั่งใต้ (ตะวันออก)\n"
         "Marker: กลุ่ม 1256 ไปฝั่งที่ไม่มี marker / กลุ่ม 3478 ไปฝั่งที่มี marker\n\n"
         "สรุป: Limit Cut ชุดแรกทำตอนระเบิดลูกที่ 3 และ 4 / ชุดที่ 2 ตอนระเบิดลูกที่ 7 และ 8\n"
         "แต่ละกลุ่มทำ Limit Cut ชุดแรกเสร็จ คู่ด้านนอก (ทำถัดไป) กับคู่ด้านใน (เพิ่งทำเสร็จ) สลับที่กัน",
         "Tuufless's own preference: more fluid, no facing outside or anti-knockback, and the 1256 / 3478 split mirrors Wormhole Formation later\n"
         "But it is harder to learn, especially for players new to TEA\n\n"
         "The name comes from the numbers in each group\n"
         "1 2 5 6: start from the northern (west) explosion\n"
         "3 4 7 8: start from the southern (east) explosion\n"
         "Waymarks: the 1256 group takes the side without markers / the 3478 group the side with them\n\n"
         "In short: the first Limit Cuts resolve at the 3rd and 4th explosions / the second set at the 7th and 8th\n"
         "After each group's first Limit Cut, the outer pair (next) and the inner pair (just done) swap places",
         strict=False, pic=IMG + "02a/limit_cut_1256_overview.jpg", scene=S.lc_overview_1256(), plan=T2, plan_en=T2E)
    for k, (n, ne, t, te) in enumerate(LC1256, 1):
        step(PH, LC, n, ne, t, te, strict=False, pic=f"{IMG}02a/limit_cut_1256_{k:02d}.jpg", scene=S.lc_1256(k), plan=T2, plan_en=T2E)

    # ---------------------------------------------------------------- BJCC
    B = "Brute Justice + Cruise Chaser"
    step(PH, B, "ภาพรวม: แผน Tollgate", "Overview: Tollgate",
         "แผน Tollgate ของ Tuufless คล้ายแผน MOOF ที่ stack บอสทั้งสองไว้กลางสนาม\n"
         "ชื่อ Tollgate มาจากการส่ง Nisi ครั้งที่ 3: Tank กับ Healer ยืนเรียงแถวให้ DPS เดินผ่านไปรับ/ส่ง Nisi เหมือนผ่านด่าน\n\n"
         "แผนนี้ทำให้การส่ง Water / Lightning และ Nisi ง่ายขึ้น แต่ Tank โดนดาเมจมากขึ้น: phase นี้ Healer ต้อง heal หนักอยู่แล้ว เตรียมให้พร้อม\n"
         "Tank: เก็บ cooldown เล็กไว้ใช้ตอนส่ง Lightning\n\n"
         "โดยรวม Tank คุมบอสทั้งสองไว้กลางสนาม Healer ขยับบ้าง DPS เดินมากที่สุด\n"
         "ภาพ: เลข 1 2 3 = จุด Water ครั้งที่ 1 / 2 / 3 (marker A / C / 3) และทิศที่ปาร์ตี้ไปตอน Plasma Shield และ Gavel",
         "Tuufless's Tollgate strat, very similar to MOOF's, which stacks both bosses in the middle\n"
         "The name comes from the third Nisi pass: the tanks and healers line up for the DPS to pass through, like a tollgate\n\n"
         "It simplifies the Water / Lightning and Nisi passes at the cost of more tank damage: the phase is already heal-heavy, so be ready\n"
         "Tanks: keep minor cooldowns for the Lightning passes\n\n"
         "Overall the tanks keep both bosses in the middle, the healers move a little, the DPS do most of the moving\n"
         "Picture: 1 2 3 = the 1st / 2nd / 3rd Water spots (markers A / C / 3), and where the party goes for Plasma Shield and Gavel",
         strict=False, pic=IMG + "02b/bjcc_overview.jpg", scene=S.bj_overview())
    step(PH, "Compressed Water / Compressed Lightning", "debuff วน ①: Water / Lightning", "Loop ①: Water / Lightning",
         "Brute Justice ร่าย Link-up: 2 คนได้ debuff 30 วินาที หมดเวลาระเบิดเป็น AoE แชร์ดาเมจรอบตัวคนนั้น (Crashing Wave / Crashing Thunder)\n"
         "คนถือ debuff ตาย: debuff ระเบิดตายทั้งปาร์ตี้\n"
         "ระเบิดแล้ว debuff ย้ายไปคนที่โดนแบบสุ่ม ถ้าไม่มีใครโดนด้วย ตายทั้งปาร์ตี้\n"
         "คนถือเดิมติด resistance down ของธาตุนั้น: รับธาตุเดิม 2 รอบติดไม่ได้\n\n"
         "Compressed Water: เริ่มที่ Healer สุ่ม 1 คน\n"
         "ยิ่งคนโดนเยอะ ดาเมจต่อคนยิ่งน้อย: ให้อย่างน้อย 3 คนแชร์\n"
         "เกิดน้ำพุ (waterspout) ตรงที่คนถือยืน: เข้าใกล้ตายทันที ต้องแช่แข็งด้วย Ice ของ Brute Justice หรือทำลายด้วย Flarethrower ไม่งั้นตายทั้งปาร์ตี้\n\n"
         "Compressed Lightning: เริ่มที่ DPS สุ่ม 1 คน\n"
         "ยิ่งคนโดนเยอะ ดาเมจต่อคนยิ่งมาก: Lightning ต้องมี 2 คนพอดี (คนถือ + คนที่จะรับต่อ)",
         "Brute Justice casts Link-up: two players get a 30 s debuff that ends in a shared AoE around them (Crashing Wave / Crashing Thunder)\n"
         "If the holder dies, it explodes and wipes the raid\n"
         "After it goes off it passes to a random player who was hit; if nobody else was hit, it wipes the raid\n"
         "The old holder gets that element's resistance down, so nobody takes the same element twice in a row\n\n"
         "Compressed Water: starts on a random healer\n"
         "More players hit means less damage each: share it with at least three\n"
         "It leaves a waterspout where the holder stood: going near it kills instantly; freeze it with Brute Justice's Ice or burn it with Flarethrower, or the raid wipes\n\n"
         "Compressed Lightning: starts on a random DPS\n"
         "More players hit means MORE damage each: exactly two in each Lightning (the holder + the next one)",
         strict=False, refs=[FR("bj-water")])
    step(PH, "Final Decree Nisi", "debuff วน ②: Nisi", "Loop ②: Nisi",
         "Brute Justice ร่าย Judgment Nisi: DoT ลงที่ DPS ทั้งหมด หรือ Tank + Healer ทั้งหมด (Final Decree Nisi α β γ δ)\n"
         "คนมี Nisi แตะคนไม่มี: คนไม่มีได้ Nisi นั้นไปด้วย\n"
         "คนมี Nisi ต่างสีแตะกัน: ตายทั้งคู่ทันที\n\n"
         "ต่อมา Brute Justice ร่าย Verdict: ทุกคนได้ Final Judgment Decree Nisi α β γ δ (สีละ 2 คน: Tank/Healer 1 + DPS 1)\n"
         "ตอน Gavel ร่ายเสร็จ ทั้ง 8 คนต้องมี Nisi ตรงกับ Final Judgment ของตัวเอง ไม่งั้นตายทั้งปาร์ตี้\n\n"
         "ต้องวนทั้ง 2 ลูป (Water, Lightning, Nisi) ไปจน Brute Justice ร่าย Gavel ซึ่งลบ debuff ทั้งหมด\n\n"
         "มาโคร: คู่ Nisi MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
         "หลัง Enumeration: MT กับ ST ส่ง Nisi กับ Melee ที่อยู่ใกล้กว่า\n"
         "ส่ง Nisi: 1. หลัง Photon 2. หลัง Enumeration 3. หลัง Plasma Shield",
         "Brute Justice casts Judgment Nisi: a DoT on all the DPS, or on all the tanks and healers (Final Decree Nisi α β γ δ)\n"
         "A player with Nisi touching one without passes them a fresh copy\n"
         "Two players with different Nisis touching both die instantly\n\n"
         "Later Brute Justice casts Verdict: everyone gets a Final Judgment Decree Nisi α β γ δ (each on two players: one tank/healer, one DPS)\n"
         "When Gavel finishes, all eight must hold the Nisi matching their Final Judgment, or the raid wipes\n\n"
         "Keep both loops going (Water, Lightning, Nisi) until Brute Justice casts Gavel, which removes every debuff\n\n"
         "Macro: Nisi pairs MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
         "After Enumeration the MT and ST pass with the closest melee\n"
         "Nisi passes: 1. after Photon 2. after Enumeration 3. after Plasma Shield",
         strict=False, refs=[FR("bj-nisi")])

    J = lambda n: f"{IMG}02b/bjcc_{n:02d}.jpg"
    step(PH, "Judgment Nisi", "① ตำแหน่งเริ่ม", "① Starting spots",
         "① MT: รับ Cruise Chaser / ST: รับ Brute Justice\n"
         "MT กับ ST สลับฝั่งจากปกติ: บอสที่ Tank แต่ละคนรับ โผล่ฝั่งที่ Tank คนนั้นยืนเริ่ม (ภาพ: Brute Justice ตะวันตก / Cruise Chaser ตะวันออก)\n"
         "Cruise Chaser ร่าย Whirlwind ส่วน Brute Justice ร่าย Judgment Nisi: ได้ Nisi, Compressed Water และ Compressed Lightning\n"
         "ยืนชิดกลางสนามให้มากที่สุด แต่อย่าแตะกันจนส่ง Nisi\n"
         "มาโคร: D3 D4 / H1 H2 / ST MT / D1 D2",
         "① MT: take Cruise Chaser / ST: take Brute Justice\n"
         "The MT and ST start on swapped sides from the usual: each tank's boss appears on that tank's starting side (picture: Brute Justice west / Cruise Chaser east)\n"
         "Cruise Chaser casts Whirlwind while Brute Justice casts Judgment Nisi: Nisis, Compressed Water and Compressed Lightning\n"
         "Stand as close to the middle as you can without passing Nisis\n"
         "Macro: D3 D4 / H1 H2 / ST MT / D1 D2",
         strict=True, pic=J(1), scene=S.bj_01(), refs=[FR("bj-judgment")],
         says={"MT": "ฝั่งตะวันออก รับ Cruise Chaser", "ST": "ฝั่งตะวันตก รับ Brute Justice"},
         says_en={"MT": "East: take Cruise Chaser", "ST": "West: take Brute Justice"})
    step(PH, "Chakrams", "② Chakram 2 ลูก: ไปขอบ", "② Two Chakrams: go to the edge",
         "② Chakram 2 ลูกโผล่ตรงข้ามกันที่มุมทแยงใดก็ได้ใน 8 มุม แล้วพุ่งไปที่ตำแหน่งผู้เล่นสุ่ม 1 คน\n"
         "ทุกคนออกไปขอบสนาม หลบแนวที่ Chakram พุ่ง",
         "② Two Chakrams appear directly opposite each other at any of the eight intercardinals and aim at a random player's spot\n"
         "Move to the edge to dodge their path",
         strict=False, pic=J(2), scene=S.bj_02(), refs=[FR("bj-chakram")])
    step(PH, "Optical Sight", "③ Optical Sight: กลับเข้ากลาง", "③ Optical Sight: back to the middle",
         "③ พอ Chakram ลง Cruise Chaser ร่าย Optical Sight: AoE วงใหญ่ล็อกตำแหน่งที่ทุกคนยืนอยู่\n"
         "ทุกคนกลับเข้ากลาง\n"
         "Tank สลับฝั่งกัน\n"
         "ST: เข้าวงในก่อน แต่หลีกทางให้ MT ผ่านไปได้",
         "③ When the Chakrams go off, Cruise Chaser casts Optical Sight: big AoEs baited on everyone's current spot\n"
         "Everyone moves back to the middle\n"
         "The tanks swap sides\n"
         "ST: enter the inner circle first, but make way for the MT to pass",
         strict=True, pic=J(3), scene=S.bj_03(), refs=[FR("bj-optical")])
    step(PH, "Photon", "④ Photon: เช็ค barrier", "④ Photon: a shield check",
         "④ Cruise Chaser หยุดร่าย Photon\n"
         "เช็ค barrier: Photon ลด HP ทุกคนเหลือ 1 ถ้าไม่มี barrier DoT ของ Nisi จะฆ่าทิ้ง\n"
         "MT: ข้ามไปฝั่งตะวันตก (Cruise Chaser ไม่ตามมา ระหว่างรอตี Brute Justice ไปก่อนได้ไม่กี่ GCD)",
         "④ Cruise Chaser stops to cast Photon\n"
         "A shield check: Photon brings everyone to 1 HP, and without a shield the Nisi DoT kills\n"
         "MT: cross to the west side (Cruise Chaser won't follow; you can spend a few GCDs on Brute Justice while waiting)",
         strict=True, pic=J(4), scene=S.bj_04())
    step(PH, "Photon", "⑤ จัดบอสกลาง + ส่ง Nisi ครั้งที่ 1", "⑤ Centre the bosses + Nisi pass 1",
         "⑤ Tank ใช้ช่วงนี้จัดบอสให้อยู่กลางสนาม โดยเฉพาะ ST ที่ถือ Brute Justice (ดูหัวลูกศรข้างวงเป้าของบอส)\n"
         "แนวเหนือ-ใต้ไม่ต้องกลางเป๊ะ แต่แนวตะวันออก-ตะวันตกต้องกลาง\n\n"
         "หลัง Photon: ส่ง Nisi ครั้งที่ 1\n"
         "MT, D1: ยังไม่ส่ง\n"
         "ST·D2 / H1·D3 / H2·D4: แตะส่ง Nisi กัน",
         "⑤ The tanks use this time to centre the bosses, the ST with Brute Justice above all (use the arrowheads on the bosses' target circles)\n"
         "They need not be centred north-south, but must be centred east-west\n\n"
         "After Photon: the first Nisi pass\n"
         "MT, D1: don't pass yet\n"
         "ST·D2 / H1·D3 / H2·D4: pass Nisi with each other",
         strict=True, pic=J(5), scene=S.bj_05(), refs=[FR("bj-photon")],
         says={"MT": "ยังไม่ส่ง Nisi", "D1": "ยังไม่ส่ง Nisi", "ST": "ส่ง Nisi กับ D2", "D2": "ส่ง Nisi กับ ST",
               "H1": "ส่ง Nisi กับ D3", "D3": "ส่ง Nisi กับ H1", "H2": "ส่ง Nisi กับ D4", "D4": "ส่ง Nisi กับ H2"},
         says_en={"MT": "Don't pass yet", "D1": "Don't pass yet", "ST": "Pass with D2", "D2": "Pass with the ST",
                  "H1": "Pass with D3", "D3": "Pass with H1", "H2": "Pass with D4", "D4": "Pass with H2"})
    step(PH, "Spin Crusher", "⑥ Spin Crusher", "⑥ Spin Crusher",
         "⑥ Cruise Chaser ร่าย Spin Crusher\n"
         "MT: หลบ Spin Crusher แล้วส่ง Nisi กับ D1\n"
         "Healer ที่มี Water: ไปจุด Water ครั้งที่ 1 (ภาพนี้คือ H1) / Healer ที่ไม่มี Water: ไปรอล่อ Fire กับ Hidden Mine\n"
         "D1: ไม่เคยอยู่ใน Water ครั้งแรก\n"
         "D3: ถ้าถือ Lightning ครั้งแรก ระวังเดินตัดทาง D2 ที่ไป Water",
         "⑥ Cruise Chaser casts Spin Crusher\n"
         "MT: dodge it and pass Nisi with D1\n"
         "The healer WITH Water: go to the 1st Water spot (H1 here) / the healer without: pre-position to bait Fire and the Hidden Mine\n"
         "D1: never in the first Water stack\n"
         "D3: careful if you hold the first Lightning, as your path may cross D2's to the Water",
         strict=True, pic=J(6), scene=S.bj_06(), refs=[FR("bj-spin")])
    W = "Compressed Water / Compressed Lightning"
    step(PH, W, "⑦ ส่ง Water / Lightning ครั้งที่ 1", "⑦ Water / Lightning pass 1",
         "⑦ Water (เหนือ, marker A): Healer + DPS อย่างน้อย 2 คนจาก D2 D3 D4 (ยกเว้นคนที่ถือ Lightning)\n"
         "Lightning (ตะวันออก): DPS → ST\n"
         "D1: อาจต้องหลบระเบิด Lightning ไปทาง MT\n\n"
         "เคล็ดลับ: Tank กด Rampart ก่อน Water / Lightning ครั้งแรกนิดหนึ่ง จะลดได้ทั้ง Lightning, auto-attack ของบอส, Hidden Mine ที่ตามมา (ถ้าเร็ว) และกลับมาทันใช้ตอน Double Rocket Punch ท้าย phase",
         "⑦ Water (north, marker A): the healer + at least two of D2, D3, D4 (not whoever had Lightning)\n"
         "Lightning (east): DPS → ST\n"
         "D1: you may need to dodge the Lightning by moving towards the MT\n\n"
         "Tip: a tank Rampart just before the first Water / Lightning covers the Lightning, the bosses' auto-attacks, the Hidden Mine after it (if quick), and is back for Double Rocket Punch at the end",
         strict=True, pic=J(7), scene=S.bj_07())
    HM = "Hidden Mine + Enumeration"
    step(PH, HM, "⑧ เตรียม Hidden Mine / Enumeration", "⑧ Set up for Hidden Mine / Enumeration",
         "⑧ Water ลงแล้ว Healer กับ DPS ขยับเตรียม Hidden Mine และ Enumeration\n"
         "D2: เข้าไปใต้บอส ระหว่าง Tank 2 คน\n"
         "D3: ไปหลัง MT\n"
         "D4: ไปหลัง ST\n"
         "DPS ทุกคนอยู่ในเขตเส้นประสีเขียว: จะได้ไม่ล่อ Hidden Mine โดยไม่ตั้งใจ และไม่โดน Hidden Mine ตอนระเบิดทีหลัง",
         "⑧ After the Water, healers and DPS move for Hidden Mines and Enumeration\n"
         "D2: under the bosses, between the two tanks\n"
         "D3: behind the MT\n"
         "D4: behind the ST\n"
         "All DPS stay inside the green dotted sector: so nobody baits a Hidden Mine by accident, or is hit when they explode later",
         strict=True, pic=J(8), scene=S.bj_08())
    step(PH, HM, "⑨ Ice / Fire / Hidden Mine / Enumeration", "⑨ Ice / Fire / Hidden Mine / Enumeration",
         "⑨ ขั้นที่ทุกคนมีงานมากที่สุด\n"
         "Tank: สุ่ม 1 คนได้ Ice\n"
         "เข้าใกล้น้ำพุเกินไป น้ำพุจะโยงสาย ผลักกระเด็นพร้อมดาเมจแรงมาก (ตายทันที)\n"
         "วาง Ice ให้เฉียดน้ำพุพอดี: Ice จะขยาย 1 ครั้งแล้วแช่แข็งน้ำพุ\n\n"
         "Healer: ล่อ Fire กับ Hidden Mine แล้วเข้ากลุ่ม Enumeration\n"
         "H1 Enumeration ตะวันตกเสมอ / H2 ตะวันออกเสมอ\n\n"
         "DPS: ทำ Enumeration กับ Healer\n"
         "D3 ตะวันตกเสมอ / D4 ตะวันออกเสมอ\n"
         "D1 ตะวันตก / D2 ตะวันออก ยกเว้นต้องสลับ\n"
         "ถ้าฝั่งเดียวมี Enumeration 2 อัน (หรือไม่มีเลย): D1 กับ D2 สลับฝั่ง\n\n"
         "ทุกคนยกเว้น Tank อยู่ในเขตเส้นประสีเขียว (กว้างขึ้นแล้วเพราะล่อ Hidden Mine ไปแล้ว)",
         "⑨ The busiest step for everyone\n"
         "Tanks: one, at random, gets Ice\n"
         "Get too close to the waterspout and it tethers you, knocking you back for huge damage (a one-shot)\n"
         "Drop the Ice so it just misses the waterspout: it expands once and freezes it\n\n"
         "Healers: bait Fire and the Hidden Mines, then join the Enumeration groups\n"
         "H1 always west / H2 always east\n\n"
         "DPS: resolve Enumeration with the healers\n"
         "D3 always west / D4 always east\n"
         "D1 west / D2 east unless a swap is needed\n"
         "If one side has both Enumerations (or none), D1 and D2 swap sides\n\n"
         "Everyone but the tanks stays inside the green dotted sector (wider now the Hidden Mines are baited)",
         strict=True, pic=J(9), scene=S.bj_09(), refs=[FR("bj-enumeration")],
         says={"H1": "ล่อ Fire + Hidden Mine ตะวันตก แล้วเข้า Enumeration ตะวันตก", "H2": "ล่อ Fire + Hidden Mine ตะวันออก แล้วเข้า Enumeration ตะวันออก",
               "D1": "Enumeration ตะวันตก (สลับกับ D2 ถ้าจำเป็น)", "D2": "Enumeration ตะวันออก (สลับกับ D1 ถ้าจำเป็น)",
               "D3": "Enumeration ตะวันตกเสมอ", "D4": "Enumeration ตะวันออกเสมอ",
               "MT": "ถ้าได้ Ice: วางให้เฉียดน้ำพุพอดี", "ST": "ถ้าได้ Ice: วางให้เฉียดน้ำพุพอดี"},
         says_en={"H1": "Bait Fire + the west Hidden Mine, then the west Enumeration", "H2": "Bait Fire + the east Hidden Mine, then the east Enumeration",
                  "D1": "West Enumeration (swap with D2 if needed)", "D2": "East Enumeration (swap with D1 if needed)",
                  "D3": "Always the west Enumeration", "D4": "Always the east Enumeration",
                  "MT": "If you have Ice: drop it just missing the waterspout", "ST": "If you have Ice: drop it just missing the waterspout"})
    step(PH, HM, "⑩ Tank รับ Hidden Mine", "⑩ The tanks take the Hidden Mines",
         "⑩ วาง Ice เสร็จ (ถ้าได้) Tank รอ Hidden Mine ตกลงก่อน แล้วค่อยเข้าไปรับ Hidden Mine ฝั่งตัวเอง: tankbuster AoE แรงมาก\n"
         "Healer กับ DPS อยู่ในเขตเส้นประสีเขียว จะได้ไม่โดน AoE ของ Hidden Mine",
         "⑩ After the Ice (if you had it), each tank waits for the Hidden Mine to drop, then takes the one on their side: a heavy AoE tank buster\n"
         "Healers and DPS stay inside the green dotted sector to avoid being clipped",
         strict=True, pic=J(10), scene=S.bj_10())
    N = "Final Decree Nisi"
    step(PH, N, "⑪ ส่ง Nisi ครั้งที่ 2", "⑪ Nisi pass 2",
         "⑪ Melee กับ Tank ระวัง Ice ขยาย\n"
         "MT, ST: ส่ง Nisi กับ Melee ที่ใกล้สุดฝั่งตัวเอง (อาจสลับฝั่งมาแล้ว)\n"
         "D1, D2: ส่ง Nisi กับ Tank ที่ใกล้สุดฝั่งตัวเอง\n"
         "H1·D3 / H2·D4: ส่ง Nisi กัน",
         "⑪ Melee and tanks, careful: the Ice expands\n"
         "MT, ST: pass Nisi with the nearest melee on your side (they may have swapped)\n"
         "D1, D2: pass Nisi with the nearest tank on your side\n"
         "H1·D3 / H2·D4: pass Nisi with each other",
         strict=True, pic=J(11), scene=S.bj_11())
    step(PH, "Verdict", "⑫ Water / Lightning ครั้งที่ 2 + Verdict", "⑫ Water / Lightning pass 2 + Verdict",
         "⑫ Water (ใต้, marker C): DPS ทั้งหมด\n"
         "Lightning (กลาง): ST → MT\n"
         "MT: รับ Lightning แล้วหัน Cruise Chaser ไปทางตะวันตก เตรียม Plasma Shield\n"
         "หลัง Lightning นี้ Cruise Chaser ตี auto-attack ใส่ MT\n\n"
         "Brute Justice ร่าย Verdict: ทุกคนได้ Final Judgment Decree Nisi ซึ่งกำหนดการส่ง Nisi อีก 2 ครั้งถัดไป",
         "⑫ Water (south, marker C): all DPS\n"
         "Lightning (middle): ST → MT\n"
         "MT: after taking Lightning, face Cruise Chaser west for the Plasma Shield\n"
         "Cruise Chaser auto-attacks the MT after this Lightning\n\n"
         "Brute Justice casts Verdict: everyone gets their Final Judgment Decree Nisi, which decides the next two passes",
         strict=True, pic=J(12), scene=S.bj_12(), refs=[FR("bj-gavel")])
    step(PH, "Plasma Shield", "⑬ Plasma Shield + Flarethrower", "⑬ Plasma Shield + Flarethrower",
         "⑬ Cruise Chaser ร่าย Limit Cut: Plasma Shield โผล่หน้า Cruise Chaser\n"
         "พร้อมกัน Brute Justice เตรียม Flarethrower: ใช้เผาน้ำพุของ Water ครั้งที่ 2\n"
         "MT: หัน Cruise Chaser ไปตะวันตกไว้จนมันเริ่มร่าย Limit Cut\n"
         "ST: อยู่ชิด Brute Justice แล้วหัน Brute Justice ไปทางใต้ ให้ Flarethrower โดนน้ำพุ\n"
         "DPS: ทำลาย Plasma Shield (ตีได้จากด้านหน้าเท่านั้น)\n"
         "Tank กับ Healer เข้าแถวเป็น 'tollgate' ระหว่าง DPS ตี Plasma Shield\n\n"
         "ทำไม DPS 4 คน: จริงๆ 3 คนพอ แต่กันพลาด (ตีผิดเป้า หรือยืนเฉียงจนตีไม่เข้า)\n"
         "MT ตายทันที: Plasma Shield แตกไม่ทัน Cruise Chaser ได้บัฟเพิ่มดาเมจ และ Whirlwind ก่อน Water ครั้งที่ 3 จะล้างปาร์ตี้",
         "⑬ Cruise Chaser casts Limit Cut, which spawns a Plasma Shield in front of it\n"
         "Meanwhile Brute Justice prepares Flarethrower, used to burn the 2nd Water's waterspout\n"
         "MT: face Cruise Chaser west until it starts casting Limit Cut\n"
         "ST: stay close to Brute Justice and point it south so Flarethrower hits the waterspout\n"
         "DPS: destroy the Plasma Shield (only damageable from the front)\n"
         "Tanks and healers line up as the 'tollgate' while the DPS break it\n\n"
         "Why four DPS: three is enough, but four insures against a wrong target or someone angled too far off the front\n"
         "MT one-shot: the shield wasn't broken in time, Cruise Chaser gained a damage up, and the Whirlwind before the 3rd Water will wipe",
         strict=True, pic=J(13), scene=S.bj_13(), refs=[FR("bj-shield")])
    step(PH, N, "⑭ ส่ง Nisi ครั้งที่ 3: tollgate", "⑭ Nisi pass 3: the tollgate",
         "⑭ ทำลาย Plasma Shield แล้ว DPS เดินผ่าน 'tollgate' ส่ง Nisi กับ Tank / Healer ที่ถูกคน แล้วไปรวมกันมุมตะวันออกเฉียงใต้ รอ Water ครั้งที่ 3\n"
         "DPS ที่เป็น Water ครั้งที่ 2: ส่ง Nisi กับคู่ แต่ไม่ข้าม tollgate กลับไปทางตะวันตกแทน\n"
         "ภาพ: แถวจากเหนือลงใต้ H1 > MT > ST > H2",
         "⑭ Once the Plasma Shield is down, the DPS pass through the 'tollgate', passing Nisi with the right tank / healer, then gather in the south-east for the 3rd Water\n"
         "The DPS who was the 2nd Water passes Nisi with their partner but does NOT cross; they go back west\n"
         "Picture: the line north to south H1 > MT > ST > H2",
         strict=["MT", "ST", "H1", "H2"], pic=J(14), scene=S.bj_14())
    step(PH, W, "⑮ Water / Lightning ครั้งที่ 3", "⑮ Water / Lightning pass 3",
         "⑮ Water (ตะวันออกเฉียงใต้, marker 3): DPS ทั้งหมด ยกเว้นคนที่เป็น Water ครั้งที่ 2 + H2\n"
         "Lightning (เหนือ): MT → H1\n"
         "ภาพ: D2 เป็น Water ครั้งที่ 2 จึงรออยู่ฝั่งตะวันตก",
         "⑮ Water (south-east, marker 3): all DPS except the 2nd Water + H2\n"
         "Lightning (north): MT → H1\n"
         "Picture: D2 was the 2nd Water, so waits on the west side",
         strict=True, pic=J(15), scene=S.bj_15())
    step(PH, N, "⑯ ส่ง Nisi ครั้งที่ 4", "⑯ Nisi pass 4",
         "⑯ Tank กับ Healer ยืนเรียงตายตัว จากตะวันออกไปตะวันตก MT > H1 > ST > H2 (ทางตะวันตกของก้อนน้ำแข็ง)\n"
         "DPS เดินไปส่ง Nisi กับ Tank / Healer ที่ถูกคน\n"
         "MT: ลาก Cruise Chaser ไปทางตะวันออกของก้อนน้ำแข็ง",
         "⑯ Tank and healer spots are fixed, east to west MT > H1 > ST > H2 (west of the Ice block)\n"
         "The DPS pass Nisi with the right tank or healer\n"
         "MT: pull Cruise Chaser to the east of the Ice block",
         strict=["MT", "ST", "H1", "H2"], pic=J(16), scene=S.bj_16())
    step(PH, "Propeller Wind", "⑰ Propeller Wind: หลบหลังน้ำแข็ง", "⑰ Propeller Wind: hide behind the Ice",
         "⑰ Cruise Chaser ร่าย Propeller Wind\n"
         "ทุกคนหลบหลังก้อนน้ำแข็ง ให้บังสายตาจาก Cruise Chaser ไม่งั้นติด confused วิ่งมั่วควบคุมไม่ได้\n"
         "MT: เข้าแถว Nisi ด้วย",
         "⑰ Cruise Chaser casts Propeller Wind\n"
         "Use the frozen Ice to block line of sight to Cruise Chaser, or be confused and run around uncontrollably\n"
         "MT: join the Nisi line-up",
         strict=["MT", "ST", "H1", "H2"], pic=J(17), scene=S.bj_17())
    step(PH, "Double Rocket Punch", "⑱ Photon + Double Rocket Punch", "⑱ Photon + Double Rocket Punch",
         "⑱ Cruise Chaser ร่าย Photon: Tank ทั้งสองเหลือ HP 1\n"
         "จากนั้น Brute Justice เตรียม Double Rocket Punch: tankbuster แชร์ 2 คน\n"
         "D3: ล่อ Super Jump ของ Brute Justice ไปทางใต้",
         "⑱ Cruise Chaser casts Photon, bringing both tanks to 1 HP\n"
         "Then Brute Justice prepares Double Rocket Punch: a two-player shared tank buster\n"
         "D3: bait Brute Justice's Super Jump to the south",
         strict=["MT", "ST", "D3"], pic=J(18), scene=S.bj_18(), refs=[FR("bj-jump")])
    step(PH, "Apocalyptic Ray", "⑲ Apocalyptic Ray → enrage", "⑲ Apocalyptic Ray → enrage",
         "⑲ Brute Justice หันไปคนที่ไกลที่สุด แล้วร่าย Apocalyptic Ray\n"
         "หลังจากนั้น Cruise Chaser ร่าย Whirlwind 2 ครั้งติดกัน แล้วบอสทั้งสองเริ่มร่าย enrage (Eternal Darkness / Final Sentence)\n"
         "ถ้าบอสตัวไหนตายก่อน อีกตัวเริ่มร่าย enrage ทันที\n\n"
         "ฆ่า Brute Justice ก่อน Gavel ไม่ได้: ถ้าตายก่อน Gavel ลง จะใช้ Final Sentence ทันทีตอนตาย ตายทั้งปาร์ตี้ แม้ยังไม่ได้รับ debuff จาก Verdict",
         "⑲ Brute Justice targets the furthest player and casts Apocalyptic Ray\n"
         "Then Cruise Chaser casts two Whirlwinds back to back, and both bosses start their enrages (Eternal Darkness / Final Sentence)\n"
         "If either boss dies, the other starts its enrage\n\n"
         "Brute Justice can't die before Gavel: if it does, it instant-casts Final Sentence on the way out and kills everyone, even before Verdict's debuffs are out",
         strict=["D3"], pic=J(19), scene=S.bj_19(), refs=[FR("bj-ray")])
    step(PH, N, "หลัง Verdict: ส่ง Nisi ยังไง", "After Verdict: how to pass Nisi",
         "ตอนส่ง Nisi ครั้งที่ 3 จะเป็นแบบใดแบบหนึ่ง\n"
         "Tank / Healer ถือ Nisi ทั้งหมด: DPS ต้องไปรับ Nisi สีที่ถูกมา\n"
         "DPS ถือ Nisi ทั้งหมด: DPS ต้องส่ง Nisi ให้ Tank / Healer ที่ถูกคน\n\n"
         "ตัวอย่างของแหล่ง (Tank / Healer ถือ Nisi)\n"
         "ครั้งที่ 3: DNC รับสีส้มจาก WHM / SAM รับสีม่วงจาก WAR / RPR รับสีเขียวจาก SGE / SMN รับสีน้ำเงินจาก DRK\n"
         "ครั้งที่ 4: DNC ส่งสีส้มให้ SGE / SAM ส่งสีม่วงให้ WAR / RPR ส่งสีเขียวให้ DRK / SMN ส่งสีน้ำเงินให้ WHM\n\n"
         "ตัวอย่างของแหล่ง (DPS ถือ Nisi)\n"
         "ครั้งที่ 3: RDM ส่งสีน้ำเงินให้ WHM / MNK ส่งสีม่วงให้ PLD / RPR ส่งสีเขียวให้ DRK / MCH ส่งสีส้มให้ SGE\n"
         "ครั้งที่ 4: RDM รับสีเขียวจาก DRK / MNK รับสีน้ำเงินจาก WHM / RPR รับสีม่วงจาก PLD / MCH รับสีส้มจาก SGE",
         "At the third pass it is one or the other\n"
         "The tanks and healers hold every Nisi: the DPS collect the right ones from them\n"
         "The DPS hold every Nisi: they pass them to the right tank or healer\n\n"
         "The source's example (tanks / healers hold Nisi)\n"
         "Pass 3: DNC collects orange from WHM / SAM purple from WAR / RPR green from SGE / SMN blue from DRK\n"
         "Pass 4: DNC passes orange to SGE / SAM purple to WAR / RPR green to DRK / SMN blue to WHM\n\n"
         "The source's example (DPS hold Nisi)\n"
         "Pass 3: RDM passes blue to WHM / MNK purple to PLD / RPR green to DRK / MCH orange to SGE\n"
         "Pass 4: RDM collects green from DRK / MNK blue from WHM / RPR purple from PLD / MCH orange from SGE",
         strict=False)
    step(PH, B, "คำถามที่พบบ่อย / แก้ปัญหา", "FAQ / troubleshooting",
         "ทำไม Tank เดินสวนกันแทน Provoke สลับบอส\n"
         "1. Tank ที่ตายตอน Limit Cut แล้วถูกชุบตอนต้น phase มักกด Provoke ทันที Provoke จะติด cooldown ใช้สลับบอสหลัง Chakram ไม่ได้\n"
         "2. Cruise Chaser หยุดร่าย Photon: ถ้าสลับด้วย Provoke คนที่ดึง Brute Justice ตีได้แค่ Cruise Chaser\n\n"
         "ทำไม H1 ล่อ Hidden Mine ตะวันตกแทน D3: ให้คนที่โดน Enumeration ทั้งสองเห็นกันชัดและอยู่ใกล้กัน\n"
         "ทำไมไม่ล่อ Hidden Mine ชิดขอบ: บอสต้องอยู่กลาง ถ้าล่อชิดขอบ MT ต้องลาก Cruise Chaser ไปใกล้ขอบ ไม่เหลือที่ให้ DPS ตี Plasma Shield\n\n"
         "Crashing Thunder แรงผิดปกติ: Lightning มีคนเกิน 2 คน\n"
         "Severe Contamination: raid-wide ต่อเนื่องเพราะน้ำพุไม่ถูกแช่แข็งหรือเผา\n"
         "Hidden Mine ลงที่ DPS: DPS ออกนอกเขตสีเขียว หรือ ST ไม่ได้จัด Brute Justice ไว้กลาง",
         "Why the tanks cross instead of Provoke-swapping\n"
         "1. A tank who died in Limit Cut and is raised at the start tends to Provoke at once, leaving Provoke on cooldown for the swap after the Chakrams\n"
         "2. Cruise Chaser stops to cast Photon: with a Provoke swap, whoever took Brute Justice can only hit Cruise Chaser\n\n"
         "Why H1, not D3, baits the west Hidden Mine: so both Enumeration targets are visible and close together\n"
         "Why not bait the Hidden Mines at the edge: the bosses stay central; a west mine at the edge drags Cruise Chaser outwards and leaves no room for the DPS at the Plasma Shield\n\n"
         "Crashing Thunder hit harder than usual: more than two in the Lightning\n"
         "Severe Contamination: pulsing raid-wide because a waterspout wasn't frozen or burned\n"
         "A Hidden Mine baited on a DPS: a DPS left the green sector, or the ST didn't centre Brute Justice",
         strict=False)
