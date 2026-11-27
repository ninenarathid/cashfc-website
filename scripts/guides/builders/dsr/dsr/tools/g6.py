"""P6 Double Dragons (Tuufless: 06_double_dragons + mitigation)."""
from core import step, both, FR
import sc6 as S

P6 = ("P6 Double Dragons", "P6 Double Dragons")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))
MV = "Mortal Vow"

step(P6, "Double Dragons", "ภาพรวม P6 + เงื่อนไข enrage ของมังกร", "P6 overview + the dragons' enrage conditions",
     "ถึง P6 ครั้งแรก = ประมาณครึ่งทางของการ prog: Mechanic ไม่ยากมาก แต่พลาดแล้วไม่ให้อภัย\n"
     "ครึ่งแรก: Wyrmsbreath 1 → Akh Afah 1 → Hallowed Wings 1 → Wroth Flames\n"
     "ครึ่งหลัง: Akh Afah 2 → Hallowed Wings 2 → Wyrmsbreath 2 → Cauterize → Alternative End\n\n"
     "Tank: MT รับ Nidhogg / ST รับ Hraesvelgr\n"
     "มี HP check: กลุ่ม 1 (MT H1 D1 D3) ตี Nidhogg / กลุ่ม 2 (ST H2 D2 D4) ตี Hraesvelgr เป็นหลัก\n\n"
     "มังกรแต่ละตัวมีเงื่อนไข enrage: ผิดคำสาบานแล้วท่าของมังกรตัวนั้นฆ่าคนโดนทีเดียว (รวม Tank) และรับดาเมจน้อยลง\n"
     "Solemn Vow: Hraesvelgr enrage ถ้าฆ่าผู้เล่นได้แม้แต่คนเดียว\n"
     "Mortal Vow: Nidhogg enrage ถ้าไม่ส่งต่อ Mortal Vow\n"
     "มังกรตายก่อนไม่ได้: HP ค้างที่ 1 จนกว่าจะเริ่มร่าย enrage\n\n"
     "DRK แข็งแรงมากใน P6 (Dark Mind ใช้ได้ทั้ง Hallowed Wings 2 ครั้ง) แต่ DRK + SGE + SCH ระวัง Healer heal DRK ไม่ทันถ้าใช้ Living Dead ตอน Cauterize",
     "Reaching this phase the first time is roughly halfway through prog: the Mechanics aren't hard, but the phase is unforgiving\n"
     "First half: Wyrmsbreath 1 → Akh Afah 1 → Hallowed Wings 1 → Wroth Flames\n"
     "Second half: Akh Afah 2 → Hallowed Wings 2 → Wyrmsbreath 2 → Cauterize → Alternative End\n\n"
     "Tanks: MT → Nidhogg / ST → Hraesvelgr\n"
     "There are HP checks: group 1 (MT H1 D1 D3) prioritises Nidhogg / group 2 (ST H2 D2 D4) Hraesvelgr\n\n"
     "Each dragon has an enrage condition: break its vow and its attacks one-shot anyone hit (tanks included) and it takes less damage\n"
     "Solemn Vow: Hraesvelgr enrages if he kills any player\n"
     "Mortal Vow: Nidhogg enrages if Mortal Vow isn't passed\n"
     "Neither dragon can die early: each has a floor of 1 HP until it starts its enrage\n\n"
     "A DRK is very strong here (Dark Mind for both Hallowed Wings), but with DRK + SGE + SCH the healers struggle to top up a DRK who used Living Dead at Cauterize",
     strict=False)
step(P6, MV, "Mortal Vow: ส่งต่อแบบ DTTMR", "Mortal Vow: the DTTMR passes",
     "หลัง Wyrmsbreath 1 Nidhogg ให้ดีบัฟ Mortal Vow กับ DPS สุ่ม 1 คน:\n"
     "DoT เบาๆ และลดการ heal ที่ได้รับลงมาก\n"
     "หมดเวลาแล้วระเบิด AoE เล็ก: คนมีดีบัฟได้ Mortal Atonement (รับ Mortal Vow ซ้ำไม่ได้) และ Mortal Vow ส่งต่อไปคนสุ่มที่โดน AoE ที่ไม่มี Mortal Atonement\n"
     "คนอื่นที่โดนเพิ่มได้ Suppuration (HP สูงสุดเหลือครึ่ง): ส่งต่อต้อง stack แค่ 2 คนพอดี คือคนมีดีบัฟ กับคนรับ\n\n"
     "ส่ง 4 ครั้ง: หลัง Hallowed Wings 1 / หลัง Wroth Flames (เร็ว) / หลัง Hallowed Wings 2 / หลัง Cauterize → Touchdown\n"
     "ลำดับ DTTMR: DPS > MT > ST > D1/D2 > D3\n"
     "ส่งกลางสนามทุกครั้ง ยกเว้นครั้งสุดท้ายหลัง Touchdown (ส่งที่ขอบ)\n"
     "D3 ได้ Mortal Vow ตอนแรก ครั้งสุดท้ายก็ยังส่งให้ D3: Mortal Atonement หมดก่อนแล้ว",
     "After Wyrmsbreath 1, Nidhogg gives a random DPS Mortal Vow:\n"
     "a light DoT, and it greatly cuts the healing that player receives\n"
     "When it expires it explodes in a small AoE: the holder gets Mortal Atonement (can't take Mortal Vow again) and Mortal Vow passes to a random player hit who has no Mortal Atonement\n"
     "Anyone else hit gets Suppuration (max HP halved): a pass needs exactly two players stacked, the holder and the receiver\n\n"
     "Four passes: after Hallowed Wings 1 / after Wroth Flames (quick) / after Hallowed Wings 2 / after Cauterize → Touchdown\n"
     "DTTMR order: DPS > MT > ST > D1/D2 > D3\n"
     "Every pass is in the middle except the last, after Touchdown (done at the edge)\n"
     "If D3 started with Mortal Vow, the last pass still goes to D3: their Mortal Atonement has worn off",
     strict=False,
     refs=[FR("p6-mortal-vow", "wl89c94CE0Y", 60, "Mortal Vow: ส่งต่อด้วยการ stack 2 คนพอดี (คนมีดีบัฟ + คนรับ)", "Mortal Vow: pass it by stacking exactly two (holder + receiver)")])

WB = "Wyrmsbreath"
step(P6, WB, "#1 ①: ตั้งตำแหน่งสามเหลี่ยม", "#1 ①: the triangle set-up",
     "Wyrmsbreath: มังกรแต่ละตัวผูกสายกับคนที่ไม่ใช่ Tank 3 คน ต้องยืดสายให้ไกลพอ จะได้โดนเบาลง\n"
     "สายให้ดีบัฟไฟหรือน้ำแข็งที่หักล้างกัน: ทุกคนที่ไม่ใช่ Tank ต้องโดนสายจากมังกรทั้ง 2 ตัว ตัวละเส้น\n\n"
     "ยืนเตรียม:\nกลาง: D3, D4\nซ้ายล่าง: H1, D1\nขวาล่าง: H2, D2\n"
     "MT ฝั่ง Nidhogg (ตะวันตกเฉียงเหนือ) / ST ฝั่ง Hraesvelgr (ตะวันออกเฉียงเหนือ)\n\n"
     "ดีบัฟไฟ (Boiling → Pyretic): ล้างด้วยท่าน้ำแข็งของ Hraesvelgr / Pyretic โดนไฟทุกครั้งที่กดสกิล (รวม auto-attack) ราว 40–45k อยู่ 30 วินาที\n"
     "ดีบัฟน้ำแข็ง (Freezing → Deep Freeze): ล้างด้วยท่าไฟของ Nidhogg / Deep Freeze ขยับและกดอะไรไม่ได้ 30 วินาที (ขยับตอนหมดก็ไม่ช่วย)\n"
     "สกิลแบบ channel / emote ที่กำลังทำอยู่ไม่ทำให้ Pyretic ทำงาน แต่การเริ่ม channel นับ\n\n"
     "mitigate: Tank 30% + short / H2 90s (SGE: Kerachole หลัง GCD ที่ 2 จะกลับมาทัน Akh Afah)",
     "Wyrmsbreath: each dragon tethers three non-tanks, who must stretch the tethers far enough to lower the damage\n"
     "The tethers give fire or ice debuffs that cancel each other: every non-tank must be hit by one tether from each dragon\n\n"
     "Pre-position:\nCentre: D3, D4\nBottom-left: H1, D1\nBottom-right: H2, D2\n"
     "MT on Nidhogg's side (NW) / ST on Hraesvelgr's side (NE)\n\n"
     "Fire debuff (Boiling → Pyretic): cleansed by Hraesvelgr's ice damage / Pyretic deals 40-45k on every action (auto-attacks too) for 30 s\n"
     "Ice debuff (Freezing → Deep Freeze): cleansed by Nidhogg's fire damage / Deep Freeze: no moving or acting for 30 s (moving as it expires doesn't help)\n"
     "A channel or emote already running doesn't trigger Pyretic, but starting one does\n\n"
     "Mitigate: tanks 30% + short / H2 90s (a SGE's Kerachole right after the 2nd GCD is back for Akh Afah)",
     strict=True, pic="06/wyrmsbreath_01_01.jpg", scene=S.wb1(1),
     refs=[FR("p6-wyrmsbreath", "ELUNLCyfC1g", 382, "Wyrmsbreath: มังกรผูกสาย (เส้นสายฟ้า) กับคนที่ไม่ใช่ Tank ยืดสายให้ไกลพอ", "Wyrmsbreath: the dragons tether non-tanks (lightning lines); stretch them far enough")])
step(P6, WB, "#1 ②: จุดยืนของ H1 / H2 / D4", "#1 ②: the H1 / H2 / D4 anchors",
     "จุดยืนแน่นอนของคนยืนหลัก (H1, H2, D4): ไม่มีจุดไหนอยู่ในระยะ Melee\n"
     "ใช้ช่องพื้นสีขาวเป็นจุดอ้างอิงของตำแหน่งกลาง (D4)\n"
     "ภาพ: ขอบเขตกรวยของมังกรทั้ง 2 / X เขียว = จุดยืน",
     "The anchors' exact spots (H1, H2, D4): none of them are in melee range\n"
     "Use the white floor tile as the reference for the centre spot (D4)\n"
     "Picture: the two dragons' cone areas / green X = the spots",
     strict=False, pic="06/tethers_01.jpg", scene=S.wb1(2))
step(P6, WB, "#1 ③: สายขึ้น สลับถ้าสีซ้ำ", "#1 ③: tethers appear, swap if same colour",
     "สายไฟและน้ำแข็งขึ้น เป้าหมาย: โดนสายสีละเส้น เพื่อหักล้างดีบัฟ\n"
     "D1, D2, D3: ถ้าคู่ของเราได้สายสีเดียวกัน สลับกับคู่อื่นที่ได้สายสีตรงข้าม 2 เส้น\n"
     "H1, H2, D4: ไม่ขยับ\n(ภาพ: D1 กับ D3 สลับกัน)\n\n"
     "โดนดาเมจเพิ่มทั้งที่ไม่มีสาย: ดาเมจของมังกรทั้ง 2 ขึ้นกับระยะ แม้ไม่ได้ผูกสาย สายแค่บอกทิศของลมหายใจ",
     "Fire and ice tethers appear. The goal: one of each, cancelling the debuffs\n"
     "D1, D2, D3: if your pair has two tethers of one colour, swap with the other pair that has two of the other colour\n"
     "H1, H2, D4: don't move\n(Picture: D1 and D3 swap)\n\n"
     "Extra damage without a tether? Both dragons' damage depends on distance even untethered: the tethers only aim the breaths",
     strict=["H1", "H2", "D4", "MT", "ST"], pic="06/wyrmsbreath_01_02.jpg", scene=S.wb1(3))
step(P6, WB, "#1 ④: ปากเรืองแสง = Tank buster", "#1 ④: glowing mouths = tank busters",
     "ปากมังกรเรืองแสง:\nปากเรืองแสงตัวเดียว: ตัวที่ปากไม่เรืองแสงยิง AoE tank buster ใหญ่ใส่ Tank ที่ถือ hate ของมัน\n"
     "เรืองแสงทั้ง 2 ตัว: แต่ละตัวยิง tank buster ธาตุแสง/มืดที่หักล้างกัน: Tank ไป stack กันค่อนมากลางเพื่อแชร์\n"
     "(ภาพนี้: ปาก Nidhogg เรืองแสง Hraesvelgr ไม่: ST รับ tank buster คนเดียว)\n"
     "ปากเรืองแสงตัวเดียว: Tank ที่มังกรปากเรืองแสงให้ short mitigate กับ Tank อีกคน",
     "The dragons' mouths:\none glowing: the dragon whose mouth does NOT glow hits its tank with a big AoE tank buster\n"
     "both glowing: each fires a light / dark tank buster that cancel out: the tanks stack towards the middle to share\n"
     "(This picture: Nidhogg's mouth glows, Hraesvelgr's doesn't: the ST takes a single tank buster)\n"
     "Only one glowing: the tank whose dragon glows gives their short mitigation to the other",
     strict=["MT", "ST"], pic="06/wyrmsbreath_01_03a.jpg", scene=S.wb1(4))
step(P6, WB, "#1 ④: ปากเรืองแสงทั้ง 2 = Tank stack", "#1 ④: both mouths glowing = tanks stack",
     "ตัวอย่างที่ 2: ปากเรืองแสงทั้ง 2 ตัว Tank 2 คนไป stack กันค่อนมากลางสนาม แชร์ tank buster",
     "The second example: both mouths glow, so the tanks stack towards the middle to share the tank buster",
     strict=["MT", "ST"], pic="06/wyrmsbreath_01_03b.jpg", scene=S.wb1(5))
step(P6, MV, "⑤ DPS กระจาย: Mortal Vow แรก", "⑤ DPS spread: the first Mortal Vow",
     "DPS กระจายตัว: Nidhogg เลือก DPS สุ่ม 1 คนให้ Mortal Vow ครั้งแรก (AoE รอบตัวคนนั้น)",
     "DPS spread out: Nidhogg gives a random DPS the first Mortal Vow (an AoE around that player)",
     strict=False, pic="06/mortal_vow_01.jpg", scene=S.mv1())
step(P6, "Akh Afah", "#1: stack 4 คน 2 กลุ่ม + HP check", "#1: two 4-man stacks + the HP check",
     "AoE แชร์ 4 คน ที่ Healer 2 คน: กลุ่ม 1 (MT H1 D1 D3) / กลุ่ม 2 (ST H2 D2 D4)\n"
     "HP ของ Nidhogg และ Hraesvelgr ต้องห่างกันไม่เกิน 3% ไม่งั้น Akh Afah ฆ่าทุกคนใน stack\n"
     "ถ้า HP ห่างเกิน จะมีสายเชื่อมมังกร 2 ตัว:\nไม่มีสาย: HP ห่างไม่เกิน 3%\nสายม่วง: Nidhogg HP มากไป\nสายขาว: Hraesvelgr HP มากไป\n\n"
     "mitigate: MT Reprisal, H2 30s / MT ยืนกลางสนามให้ Reprisal โดนมังกรทั้ง 2 ตัว แล้วค่อยเข้า stack",
     "4-man shared AoEs on the two healers: group 1 (MT H1 D1 D3) / group 2 (ST H2 D2 D4)\n"
     "Nidhogg's and Hraesvelgr's HP must be within 3% of each other, or Akh Afah kills everyone in the stack\n"
     "If the gap is too large a tether links the two:\nno tether: within 3%\npurple tether: Nidhogg's HP is too high\nwhite tether: Hraesvelgr's HP is too high\n\n"
     "Mitigate: MT Reprisal, H2 30s / the MT stands mid-arena so Reprisal hits both dragons, then joins the stack",
     strict=False, pic="06/akh_afah.jpg", scene=S.akh_afah(),
     **SAYS({"MT": ("Reprisal จากกลางสนามให้โดนมังกรทั้ง 2 แล้วเข้า stack กลุ่ม 1", "Reprisal from mid-arena to hit both dragons, then join group 1's stack")}),
     refs=[FR("p6-akh-afah", "wl89c94CE0Y", 100, "Akh Afah: stack 4 คนที่ Healer 2 คน / ดูสายระหว่างมังกร = HP ห่างเกิน 3%", "Akh Afah: 4-man stacks on the healers / a tether between the dragons = HP gap over 3%")])
HW = "Hallowed Wings"
step(P6, HW, "#1: หัวขึ้น/ลง (ภาพ: หัวลง)", "#1: head up / down (picture: head down)",
     "3 อย่างลงพร้อมกัน:\n"
     "1. Nidhogg หายไปโผล่ที่ขอบเหนือหรือใต้ แล้ว Cauterize ลงฝั่งตะวันตกหรือตะวันออก ตัดสนามครึ่งหนึ่ง\n"
     "2. ปีกซ้ายหรือขวาของ Hraesvelgr เรืองแสง ฟันครึ่งเหนือหรือครึ่งใต้: เหลือช่องปลอดภัย 1 ใน 4\n"
     "3. Hraesvelgr เงยหัว (ยิงใส่ 2 คนที่ไกลสุด) หรือก้มหัว (2 คนที่ใกล้สุด) เป็น AoE tank buster ใหญ่\n\n"
     "หันหน้าหา Hraesvelgr หลบ Hallowed Wings และ Cauterize แล้วยืนตามหัว:\n"
     "หัวขึ้น: ปาร์ตี้ใกล้ / Tank ไกล\nหัวลง: Tank ใกล้ / ปาร์ตี้ไกล\n"
     "MT: ฝั่งขอบ (ขอบเหนือหรือใต้) / ST: ฝั่งกลาง (เส้นศูนย์สูตร)\n"
     "ตีต่อที่ Hraesvelgr ตลอด แม้ Nidhogg กลับมาแล้ว (เตรียม HP check ของ Akh Afah 2)\n\n"
     "mitigate: MT+ST Rampart + short / ST Reprisal (อาจไม่ได้ถ้า Tank ตีไม่ถึง) / DRK ใช้ Dark Mind เพิ่มหรือแทน Rampart",
     "Three things at once:\n"
     "1. Nidhogg disappears, reappears at the north or south edge and Cauterizes down the west or east, cutting off half the arena\n"
     "2. Hraesvelgr's left or right wing glows, cleaving the north or south half: one safe quadrant is left\n"
     "3. Hraesvelgr raises (the two furthest players) or lowers (the two closest) his head for a big AoE tank buster\n\n"
     "Face Hraesvelgr, avoid Hallowed Wings and Cauterize, then position by his head:\n"
     "head up: party near / tanks far\nhead down: tanks near / party far\n"
     "MT: edge (north or south edge) / ST: middle (towards the equator)\n"
     "Keep attacking Hraesvelgr throughout, even after Nidhogg returns (it sets up Akh Afah 2's HP check)\n\n"
     "Mitigate: MT+ST Rampart + short / ST Reprisal (may be lost to tank downtime) / a DRK adds or swaps in Dark Mind",
     strict=["MT", "ST"], pic="06/hallowed_wings_01_01.jpg", scene=S.hw1(1),
     **SAYS({"MT": ("ฝั่งขอบเหนือ/ใต้", "The north / south edge"), "ST": ("ฝั่งกลาง (เส้นศูนย์สูตร)", "The middle (equator) side")}),
     refs=[FR("p6-hallowed-wings", "3yJpWHmKjpg", 243, "Hallowed Wings: ปีกของ Hraesvelgr ฟันครึ่งสนาม ดูหัวเงย/ก้ม", "Hallowed Wings: Hraesvelgr's wing cleaves half the arena; read his head up / down")])
step(P6, MV, "ส่งครั้งที่ 1: DPS → MT", "Pass 1: DPS → MT",
     "DPS ที่ได้ Mortal Vow ส่งให้ MT กลางสนาม",
     "The DPS with Mortal Vow passes it to the MT in the middle",
     strict=False, pic="06/mortal_vow_02.jpg", scene=S.mv2())
step(P6, HW, "#1: ตะวันออกเฉียงเหนือปลอดภัย หัวขึ้น", "#1: NE safe, head up",
     "หัวขึ้น = Tank ไกล ปาร์ตี้ใกล้\nMT เอาตำแหน่งเหนือสุด",
     "Head up = tanks far, party near\nThe MT takes the northernmost spot",
     strict=["MT", "ST"], pic="06/hallowed_wings_01_02.jpg", scene=S.hw1(2))
step(P6, HW, "#1: ตะวันตกเฉียงใต้ปลอดภัย หัวลง", "#1: SW safe, head down",
     "หัวลง = Tank ใกล้ ปาร์ตี้ไกล\nMT เอาตำแหน่งใต้สุด",
     "Head down = tanks near, party far\nThe MT takes the southernmost spot",
     strict=["MT", "ST"], pic="06/hallowed_wings_01_03.jpg", scene=S.hw1(3))
step(P6, HW, "#1: ตะวันตกเฉียงใต้ปลอดภัย หัวขึ้น", "#1: SW safe, head up",
     "หัวขึ้น = Tank ไกล ปาร์ตี้ใกล้\nMT เอาตำแหน่งใต้สุด\n\nส่ง Mortal Vow เสร็จ Nidhogg ร่าย Wroth Flames และ Hraesvelgr ออกจากสนาม",
     "Head up = tanks far, party near\nThe MT takes the southernmost spot\n\nAfter the pass, Nidhogg casts Wroth Flames and Hraesvelgr leaves the arena",
     strict=["MT", "ST"], pic="06/hallowed_wings_01_04.jpg", scene=S.hw1(4))

WF = "Wroth Flames"
step(P6, WF, "ภาพรวม + ดีบัฟ", "Overview + the debuffs",
     "ครึ่งทางของ P6:\n"
     "Hraesvelgr เลือกเป้าไม่ได้ โผล่ 1 ใน 3 จุดที่ขอบเหนือหรือใต้ แล้ว Cauterize ครึ่งสนาม (โอกาส 2 ใน 3 ที่ Melee ตี Nidhogg ได้ตลอด)\n"
     "Nidhogg ร่าย Akh Morn: stack ทั้งปาร์ตี้ 4 ครั้ง แต่ละครั้งทิ้งบ่อเลือด ยืนในบ่อนานไปตาย\n"
     "Sable Price (ตา) 3 ชุดโผล่ตามลำดับ ระเบิดตามแถวและคอลัมน์ของตัวเอง: ชุดแรกอยู่กลางเสมอ อีก 2 ชุดอยู่มุมตรงข้ามกัน\n"
     "ท้ายสุด spread / stack จากดีบัฟ ลงพร้อม Hot Wing หรือ Hot Tail ของ Nidhogg\n\n"
     "mitigate (Akh Morn 4 ครั้ง): MT 90s, ST 90s, H1 120s, H2 120s, D3, D4 / เพิ่ม H2 30s ถ้าได้ (ช้าสุดตอนตาชุดที่ 2 โผล่ จะกลับมาทัน Akh Afah 2)\n"
     "WHM มักใช้ Liturgy of the Bell / SGE Panhaima / D1, D2 Feint ตรงนี้หรือ Hallowed Wings 2",
     "The halfway point of P6:\n"
     "Hraesvelgr becomes untargetable, reappears at one of three spots on the north or south edge and Cauterizes half the arena (a 2-in-3 chance of melee uptime on Nidhogg)\n"
     "Nidhogg casts Akh Morn: a party stack hitting four times, each leaving a bleed puddle that kills anyone staying in it too long\n"
     "Three sets of Sable Price eyes spawn in turn and explode along their row and column: the first set is always central, the other two on opposite corners\n"
     "Finally debuff spreads / stacks resolve with Nidhogg's Hot Wing or Hot Tail\n\n"
     "Mitigate (the four Akh Morns): MT 90s, ST 90s, H1 120s, H2 120s, D3, D4 / add H2 30s if you can (latest when the 2nd eyes spawn, to have it for Akh Afah 2)\n"
     "WHM usually Liturgy of the Bell / SGE Panhaima / D1, D2 Feint here or at Hallowed Wings 2",
     strict=False,
     refs=[FR("p6-wroth-flames", "3yJpWHmKjpg", 360, "Wroth Flames: Akh Morn stack ทั้งปาร์ตี้ 4 ครั้ง แต่ละครั้งทิ้งบ่อไฟ", "Wroth Flames: Akh Morn, a party stack four times, each leaving a fire puddle")])
step(P6, WF, "ดีบัฟ spread / stack", "The spread / stack debuffs",
     "Spreading Flames (4 คน): หมดเวลาหรือคนนั้นตาย = AoE รอบตัว ไม่โดนตัวเอง แต่โดน spread ของคนอื่น = Damage Down + knockback แรง\n"
     "Entangled Flames (2 คน, เหลือ 2 คนไม่มีดีบัฟ): stack 2 คน คนมีดีบัฟคู่กับคนไม่มีดีบัฟ / โดนแล้วได้ Fire Resistance Down II (stack ซ้อนห้าม)\n"
     "คนมี Entangled ตาย หรือคนไม่พอ: ระเบิด Entangled Pyre ใส่ทั้งปาร์ตี้ (Damage Down + Fire Resistance Down II) = wipe\n"
     "แจกดีบัฟแบบสุ่ม ไม่มีรูปแบบ",
     "Spreading Flames (4 players): on expiry or death, an AoE around them; harmless to them, but another's = Damage Down + a big knockback\n"
     "Entangled Flames (2 players; 2 have no debuff): a 2-man stack pairing a debuffed and an undebuffed player / it leaves Fire Resistance Down II (no overlapping stacks)\n"
     "If an Entangled player dies or there aren't enough players: Entangled Pyre hits the whole party (Damage Down + Fire Resistance Down II), a wipe\n"
     "The debuffs are random; there's no pattern",
     strict=False)
step(P6, WF, "ติดมาร์ก แบบ 1: automarker", "Markers option 1: automarkers",
     "ช่วยจัดตำแหน่ง spread / stack ตอนท้าย นิยมติดมาร์กให้ผู้เล่น มี 2 แบบ\n"
     "แบบ 1 (นิยมสุด): ใช้ automarker (third-party tool ใช้ด้วยความเสี่ยงของตัวเอง) มาร์กทุกคน\n"
     "คนมีมาร์กชนิดเดียวกัน stack คู่กัน: Bind 1 + Bind 2 / Ignore 1 + Ignore 2 (คู่ Ignore สีแดงอยู่ชิดกำแพงตะวันออก)\n"
     "spread: Attack 1–4",
     "To set the final spreads / stacks it's common to mark players; there are two schemes\n"
     "Option 1 (most popular): automarkers (third-party tools, use at your own risk) mark everyone\n"
     "Same marker type pairs up: Bind 1 + Bind 2 / Ignore 1 + Ignore 2 (the red Ignore pair against the east wall)\n"
     "Spreads: Attack 1-4",
     strict=False, pic="06/wroth_flames_am_markers.jpg", scene=S.markers(True))
step(P6, WF, "ติดมาร์ก แบบ 2: มาร์กเอง", "Markers option 2: manual",
     "ไม่ใช้ automarker:\n"
     "ให้ 2 คนช่วยมาร์ก: คนหนึ่งมาร์ก 2 คนที่มีดีบัฟสีขาว (Entangled) / อีกคนมาร์ก 2 คนที่ไม่มีดีบัฟ\n"
     "หรือให้แต่ละคนมาร์กตัวเอง: กำหนดสัญลักษณ์ 1 อันให้ 'ดีบัฟขาว' อีกอันให้ 'ไม่มีดีบัฟ'\n"
     "แบบนี้เลขเดียวกัน stack คู่กัน: Bind 1 + Ignore 1 / Bind 2 + Ignore 2 (คู่เลข 2 อยู่ชิดกำแพงตะวันออก)",
     "Without automarkers:\n"
     "two players mark: one marks the two with the white debuff (Entangled) / the other the two with no debuff\n"
     "or everyone marks themselves: one symbol for 'white debuff', one for 'no debuff'\n"
     "Here the same number pairs up: Bind 1 + Ignore 1 / Bind 2 + Ignore 2 (the 2s against the east wall)",
     strict=False, pic="06/wroth_flames_manual_markers.jpg", scene=S.markers(False))

WFN = [
    ("① หลบ Cauterize ไปตะวันตก/ตะวันออก", "① Dodge Cauterize east or west",
     "Hraesvelgr โผล่ขอบเหนือหรือใต้ พร้อมตาชุดแรก (กลางเสมอ)\nไปขอบตะวันตกหรือตะวันออก หลบ Cauterize ของ Hraesvelgr (2 ใน 3 ครั้งเป็นตะวันตก ข้าง Nidhogg)",
     "Hraesvelgr appears on the north or south edge with the first eyes (always central)\nGo to the west or east edge to avoid his Cauterize (2 times in 3 it's west, next to Nidhogg)"),
    ("② ไปมุมที่ไกลจากตาชุดที่ 2", "② Go to the corner away from the 2nd eyes",
     "ตาชุดที่ 2 โผล่: ไปทางมุมเหนือหรือใต้ ฝั่งที่ไกลจากตาชุดที่ 2 แต่อย่าไปจนสุดมุม",
     "The second eyes spawn: head to the north or south corner further from them, but not all the way into the corner"),
    ("③ stack + mitigate", "③ Stack + mitigate",
     "ตาชุดที่ 3 โผล่: รวม stack ใช้ mitigate เตรียมเดินไปพร้อมกัน",
     "The third eyes spawn: stack together, mitigate, and get ready to move as a group"),
    ("④ Cauterize ลง + Akh Morn ลูกแรก", "④ Cauterize + the first Akh Morn",
     "Cauterize ของ Hraesvelgr ลง ทิ้งบ่อ Akh Morn ลูกแรก\nเดินแรกของ Akh Morn เป็นแนวตะวันออก↔ตะวันตกเสมอ\nเดินที่ดีสุด: ตั้งฉากออกจากกำแพงเป็นเส้นตรง แล้วโค้งเข้าหลัง Akh Morn ลูกที่ 3",
     "Hraesvelgr's Cauterize resolves. Drop the first Akh Morn puddle\nThe first Akh Morn move is always east↔west\nThe most efficient path: straight out from the wall, then curve in after the third Akh Morn"),
    ("⑤ ตาชุดแรกระเบิด + Akh Morn ลูกที่ 2", "⑤ The first eyes explode + 2nd Akh Morn",
     "ตาชุดแรกระเบิด ทิ้งบ่อ Akh Morn ลูกที่ 2 โดยไม่โดน AoE ของตา",
     "The first eyes explode. Drop the second Akh Morn puddle without being hit"),
    ("⑥ Akh Morn ลูกที่ 3–4", "⑥ Akh Morns 3 and 4",
     "ทิ้งบ่อ Akh Morn ลูกที่ 3 และ 4", "Drop the third and fourth Akh Morn puddles"),
    ("⑦ เข้ากลาง ดู Hot Wing / Hot Tail", "⑦ To the middle, read Hot Wing / Hot Tail",
     "เข้ากลางสนาม ดูว่า Nidhogg ร่าย Hot Wing หรือ Hot Tail",
     "Move to the middle and see whether Nidhogg casts Hot Wing or Hot Tail"),
]
for i, (n, ne, t, te) in enumerate(WFN):
    step(P6, WF, "ตัวอย่าง 1 " + n, "Example 1 " + ne, t + ("\n(ภาพ: Cauterize ลงฝั่งตะวันออก ปาร์ตี้ไปตะวันตกข้าง Nidhogg)" if i == 0 else "")
         + ("\n(ภาพ: ตาชุดที่ 2 โผล่ตะวันออกเฉียงเหนือ ไปทางใต้ มุมตะวันตกเฉียงใต้)" if i == 1 else ""),
         te + ("\n(Picture: the Cauterize hits the east half, so the party goes west next to Nidhogg)" if i == 0 else "")
         + ("\n(Picture: the 2nd eyes spawn NE, so go south to the SW corner)" if i == 1 else ""),
         strict=False, pic=f"06/wroth_flames_ex_01_0{i + 1}.jpg", scene=S.wf(1, i + 1))
step(P6, WF, "⑧ spread ไปตะวันตก / stack ไปตะวันออก: Hot Wing", "⑧ Spreads west / stacks east: Hot Wing",
     "spread ไปทาง Nidhogg (ตะวันตก) / stack ไปทาง Hraesvelgr (ตะวันออก)\n"
     "ลำดับทั่วไป: (กลาง) MT ST H1 H2 D1 D2 D3 D4 (ขอบ)\n"
     "Hot Wing: ฟันฝั่งเหนือและใต้ ทุกคนอยู่แนวกลางตะวันออก–ตะวันตก",
     "Spreads go towards Nidhogg (west), stacks towards Hraesvelgr (east)\n"
     "A general order: (centre) MT ST H1 H2 D1 D2 D3 D4 (edge)\n"
     "Hot Wing: hits the north and south; everyone stays on the middle E/W line",
     strict=False, pic="06/wroth_flames_ex_01_08a.jpg", scene=S.wf_resolve(False))
step(P6, WF, "⑧ Hot Tail", "⑧ Hot Tail",
     "Hot Tail: ฟันแถบกลาง ทุกคนไปทางเหนือ (หรือใต้)\n"
     "spread 2 คนยืนเคียงกันได้ถ้าอยู่ริมของพื้นที่ปลอดภัย\n"
     "marker ด้านใน (inner) คือขอบของ Hot Tail: ยืนบน marker ปลอดภัย",
     "Hot Tail: hits the middle band; everyone goes north (or south)\n"
     "Two spreads can stand side by side if they're on the sides of the safe zone\n"
     "The inner markers mark Hot Tail's edge: the markers are safe",
     strict=False, pic="06/wroth_flames_ex_01_08b.jpg", scene=S.wf_resolve(True))
step(P6, MV, "ส่งครั้งที่ 2: MT → ST (เร็ว)", "Pass 2: MT → ST (quick)",
     "spread / stack ลงไม่นาน ส่ง Mortal Vow ครั้งถัดไป: MT ส่งให้ ST กลางสนาม\nครั้งนี้เร็ว: พยายามให้ Tank อยู่ใกล้กลางสนาม",
     "Shortly after the spreads / stacks, the next pass: MT to ST in the middle\nThis one is fast: keep the tanks near the middle if you can",
     strict=False, pic="06/mortal_vow_03.jpg", scene=S.mv3())
for ex, (lab, lab_en, n1, n1e, n2, n2e) in {
        2: ("Hraesvelgr ตรงกลาง (ตีได้)", "Hraesvelgr middle (uptime)", "Cauterize ลงแนวกลาง ปาร์ตี้ไปตะวันตกข้าง Nidhogg", "the Cauterize goes down the centre, so the party goes west next to Nidhogg",
            "ตาชุดที่ 2 ตะวันตกเฉียงใต้ ไปเหนือ มุมตะวันตกเฉียงเหนือ", "the 2nd eyes are SW, so go north to the NW corner"),
        3: ("Hraesvelgr ตะวันตก (ตีไม่ได้)", "Hraesvelgr west (forced downtime)", "Cauterize ลงครึ่งตะวันตก ปาร์ตี้ไปตะวันออกห่าง Nidhogg", "the Cauterize hits the west half, so the party goes east away from Nidhogg",
            "ตาชุดที่ 2 ตะวันออกเฉียงใต้ ไปเหนือ มุมตะวันออกเฉียงเหนือ", "the 2nd eyes are SE, so go north to the NE corner")}.items():
    for i, (n, ne, t, te) in enumerate(WFN):
        extra = f"\n(ภาพ: {n1})" if i == 0 else (f"\n(ภาพ: {n2})" if i == 1 else "")
        extra_e = f"\n(Picture: {n1e})" if i == 0 else (f"\n(Picture: {n2e})" if i == 1 else "")
        step(P6, WF, f"ตัวอย่าง {ex} {n}", f"Example {ex} {ne}",
             (f"ตัวอย่าง {ex}: {lab}\n" if i == 0 else "") + t + extra, (f"Example {ex}: {lab_en}\n" if i == 0 else "") + te + extra_e,
             strict=False, pic=f"06/wroth_flames_ex_0{ex}_0{i + 1}.jpg", scene=S.wf(ex, i + 1))

step(P6, "Akh Afah", "#2: HP check อีกครั้ง", "#2: the HP check again",
     "เหมือนครั้งแรก: HP มังกร 2 ตัวต้องห่างไม่เกิน 3%\n"
     "แต่ HP อาจเอียงไปตัวหนึ่ง ขึ้นกับว่าก่อนหน้านี้ตี Hraesvelgr หรือ Nidhogg ได้มากกว่า\n"
     "ส่วนใหญ่ Hraesvelgr เหลือ HP มากกว่า: Hallowed Wings 1 มีโอกาส 1 ใน 2 ที่ตี Hraesvelgr ไม่ได้ แต่ Wroth Flames ตี Nidhogg ไม่ได้แค่ 1 ใน 3 และ Wroth Flames ตรงกับสกิล 1 นาทีของปาร์ตี้\n\n"
     "mitigate: MT Reprisal (ยืนกลางให้โดนทั้ง 2 ตัว), H2 30s",
     "As before, the two dragons' HP must be within 3%\n"
     "But it may be skewed to one side, depending on which dragon the party had uptime on earlier\n"
     "Hraesvelgr is more likely to have more HP: Hallowed Wings 1 has a 1-in-2 chance of Hraesvelgr downtime, Wroth Flames only 1-in-3 for Nidhogg, and Wroth Flames lines up with the party's 1-minute abilities\n\n"
     "Mitigate: MT Reprisal (from the middle to hit both), H2 30s",
     strict=False, pic="06/akh_afah.jpg", scene=S.akh_afah())
step(P6, HW, "#2: Hot Wing หัวขึ้น", "#2: Hot Wing, head up",
     "รอบนี้ Hallowed Wings มาพร้อม Hot Wing หรือ Hot Tail ของ Nidhogg\n"
     "MT: ไปขอบ ตามหัว Hraesvelgr: หัวขึ้น = ขอบตะวันตก / หัวลง = ขอบตะวันออก\nST: อยู่กลาง\n\n"
     "Hot Wing: ทุกคนต้องอยู่แนวตะวันออก–ตะวันตก / หัวขึ้น: Tank ห่าง Hraesvelgr ปาร์ตี้ไปทาง Hraesvelgr / MT ตะวันตกสุด\n\n"
     "mitigate: MT+ST 3rd + short / ST Reprisal / DRK เพิ่ม Dark Mind\n"
     "ครั้งนี้เจ็บกว่าเพราะไม่มี Rampart และ MT อยู่ฝั่งตรงข้ามปาร์ตี้ (นอกระยะ heal): Healer ดู Tank ให้มาก (WHM/AST: Aquaveil / Exaltation ใส่ Tank ดีมาก)",
     "This time Hallowed Wings comes with Nidhogg's Hot Wing or Hot Tail\n"
     "MT: the edge, by Hraesvelgr's head: up = the west edge / down = the east edge\nST: the middle\n\n"
     "Hot Wing: everyone stays on the E/W line / head up: tanks away from Hraesvelgr, party towards him / MT westernmost\n\n"
     "Mitigate: MT+ST 3rd + short / ST Reprisal / a DRK adds Dark Mind\n"
     "This one hurts more: no Rampart, and the MT ends up opposite the party (out of heal range): healers watch the tanks (WHM/AST: Aquaveil / Exaltation on a tank is great)",
     strict=["MT", "ST"], pic="06/hallowed_wings_02_01.jpg", scene=S.hw2(False),
     **SAYS({"MT": ("หัวขึ้น = ขอบตะวันตก / หัวลง = ขอบตะวันออก", "Head up = west edge / head down = east edge"), "ST": ("อยู่กลาง", "Take the middle")}))
step(P6, MV, "ส่งครั้งที่ 3: ST → D1 (หรือ D2)", "Pass 3: ST → D1 (or D2)",
     "ST ส่งให้ D1 ยกเว้น D1 เป็นคนได้ Mortal Vow ครั้งแรก: ST ส่งให้ D2 แทน",
     "The ST passes to D1, unless D1 had the first Mortal Vow, in which case to D2",
     strict=False, pic="06/mortal_vow_04.jpg", scene=S.mv4())
step(P6, HW, "#2: Hot Tail หัวลง", "#2: Hot Tail, head down",
     "Hot Tail: ทุกคนไปเหนือหรือใต้ โดยไม่โดน Hallowed Wings\nหัวลง: Tank ไปทาง Hraesvelgr ปาร์ตี้ห่าง Hraesvelgr / MT ตะวันออกสุด",
     "Hot Tail: everyone goes north or south without being hit by Hallowed Wings\nHead down: tanks towards Hraesvelgr, party away / MT easternmost",
     strict=["MT", "ST"], pic="06/hallowed_wings_02_02.jpg", scene=S.hw2(True))
step(P6, WB, "#2 (5-1): D3 ใต้ / ที่เหลือขอบเหนือ", "#2 (5-1): D3 south / the rest on the north edge",
     "รอบนี้ห้าม stack สายสีตรงข้าม: ต้องเก็บดีบัฟไฟ/น้ำแข็งไว้รอด Cauterize\n"
     "D3 ไปใต้ ให้อีก 5 คน (ไม่ใช่ Tank) กระจายเต็มขอบเหนือ / Melee ยังตีมังกรได้ตลอด\n"
     "MT: ตะวันตกเฉียงใต้ถ้าปาก Nidhogg ไม่เรืองแสง (ในวง target ริมขอบ)\n"
     "ST: ตะวันออกเฉียงใต้ถ้าปาก Hraesvelgr ไม่เรืองแสง (ในวง target ริมขอบ)\n"
     "D3: ไปใต้ แล้วขยับไปทางมังกรที่ปากเรืองแสง\n"
     "คนอื่น: กระจายเต็มขอบเหนือ / ตำแหน่งเหนือสุดให้ Healer หรือ caster ในกลุ่มที่โดนสาย 3 เส้น\n"
     "(ภาพนี้: ปาก Hraesvelgr เรืองแสง Nidhogg ไม่ = MT รับ tank buster คนเดียว)\n\n"
     "mitigate: MT+ST Rampart + 30% (ใช้ถูกจังหวะจะครอบถึง Cauterize) / DRK ใช้ The Blackest Night ได้",
     "This time don't stack opposite tethers: the fire/ice debuffs are needed to survive Cauterize\n"
     "D3 goes south so the other five non-tanks can spread along the north edge / all melee keep uptime on a dragon\n"
     "MT: SW if Nidhogg's mouth isn't glowing (just inside the target circle by the edge)\n"
     "ST: SE if Hraesvelgr's mouth isn't glowing (just inside the target circle by the edge)\n"
     "D3: south, moving towards a dragon whose mouth glows\n"
     "Everyone else: spread along the north edge / the north spot goes to a healer or caster in the group with 3 tethers\n"
     "(This picture: Hraesvelgr's mouth glows, Nidhogg's doesn't = the MT takes a single tank buster)\n\n"
     "Mitigate: MT+ST Rampart + 30% (timed right, it lasts to Cauterize) / a DRK can use The Blackest Night",
     strict=["MT", "ST", "D3"], pic="06/wyrmsbreath_02_a.jpg", scene=S.wb2(False),
     **SAYS({"D3": ("ไปใต้ แล้วขยับไปทางมังกรที่ปากเรืองแสง", "Go south and move towards the dragon whose mouth glows")}),
     refs=[FR("p6-wyrmsbreath-2", "wl89c94CE0Y", 300, "Wyrmsbreath 2: 5 คนกระจายขอบเหนือ D3 อยู่ใต้ ดูปากมังกรเรืองแสง", "Wyrmsbreath 2: five spread on the north edge, D3 south; watch the mouths")])
step(P6, WB, "#2: ปากเรืองแสงทั้ง 2 = Tank stack", "#2: both mouths glowing = tanks stack",
     "ตัวอย่างที่ 2: ปากเรืองแสงทั้ง 2 ตัว Tank 2 คนไป stack กันกลางสนาม แชร์ tank buster",
     "The second example: both mouths glow, so the tanks stack in the middle to share the tank buster",
     strict=["MT", "ST", "D3"], pic="06/wyrmsbreath_02_b.jpg", scene=S.wb2(True))
step(P6, WB, "#2: ขอบซ้าย/ขวาสุดใช้ marker ด้านใน", "#2: the end players use the inner markers",
     "คนซ้ายสุดและขวาสุดที่ขอบเหนือ ใช้ marker ด้านใน (inner) เป็นแนว: ถ้าสายไม่ข้ามจุดกลางของ marker จะปลอดภัยจากกรวย",
     "The leftmost and rightmost players on the north edge can use the inner markers as a guide: as long as their tethers don't cross the markers' centres they're safe from the cones",
     strict=False, pic="06/wyrmsbreath_02_positions.jpg", scene=S.wb2_pos())
step(P6, "Cauterize", "ดีบัฟไฟ/น้ำแข็ง + Tank invuln", "Fire / ice debuffs + tank invulns",
     "Nidhogg และ Hraesvelgr โผล่ขอบเหนือ (ซ้าย/ขวาสุ่ม) แล้วพุ่งลงคนละครึ่งสนาม\n"
     "คนแรกที่โดนพุ่งแต่ละเส้นโดนดาเมจเพิ่ม: Tank รับด้วย invuln\n"
     "MT: ครึ่งตะวันตก ใกล้ขอบเหนือสุด\nST: ครึ่งตะวันออก ใกล้ขอบเหนือสุด\n"
     "มีดีบัฟไฟ: ยืนครึ่งหน้า Hraesvelgr ห้ามขยับ\n"
     "มีดีบัฟน้ำแข็ง: ยืนครึ่งหน้า Nidhogg ห้ามขยับ: ดีบัฟของ Nidhogg จะเป็น Pyretic ดาเมจจาก Pyretic ทำให้ Cauterize ของ Hraesvelgr ฆ่าเรา = Hraesvelgr enrage\n"
     "Cauterize กว้างครึ่งสนามพอดี (เอฟเฟกต์ดูใหญ่กว่า) / DoT ของ Cauterize (ราว 18k ต่อ tick) mitigate ไม่ได้\n"
     "DRK ใช้ Living Dead ตรงนี้: มังกรเลือกเป้าไม่ได้ จึงฟื้น HP สำหรับ Walking Dead ไม่ได้\n\n"
     "mitigate: Tank invuln (หรือ 30% + Rampart + short) / H2 30s / WAR ใช้ Holmgang (กลับมาทัน Akh Morn's Edge ครั้งที่ 3) / AST ใช้ Macrocosmos",
     "Nidhogg and Hraesvelgr appear on the north edge (sides random) and dive down one half each\n"
     "The first player hit by each dive takes extra damage: the tanks take it with invulns\n"
     "MT: the west half, closest to the north edge\nST: the east half, closest to the north edge\n"
     "Fire debuff: stand in the half in front of Hraesvelgr; don't move\n"
     "Ice debuff: stand in the half in front of Nidhogg; don't move: Nidhogg's debuff turns into Pyretic, whose damage lets Hraesvelgr's Cauterize kill you and enrages Hraesvelgr\n"
     "Each Cauterize is exactly half the arena (the effect looks larger) / its DoT (about 18k a tick) can't be mitigated\n"
     "A DRK using Living Dead here can't heal off the untargetable dragons for Walking Dead\n\n"
     "Mitigate: tank invulns (or 30% + Rampart + short) / H2 30s / a WAR Holmgangs (back for Akh Morn's Edge 3) / an AST uses Macrocosmos",
     strict=["MT", "ST"], pic="06/cauterize_01.jpg", scene=S.cauterize(),
     **SAYS({"MT": ("ครึ่งตะวันตก ใกล้ขอบเหนือสุด + invuln", "West half, nearest the north edge + invuln"),
             "ST": ("ครึ่งตะวันออก ใกล้ขอบเหนือสุด + invuln", "East half, nearest the north edge + invuln")}),
     refs=[FR("p6-cauterize", "3yJpWHmKjpg", 600, "Cauterize: Nidhogg (ซ้าย) และ Hraesvelgr (ขวา) พุ่งลงคนละครึ่งสนาม", "Cauterize: Nidhogg (left) and Hraesvelgr (right) dive down a half each")])
step(P6, MV, "ส่งครั้งที่ 4: หลัง Touchdown → D3", "Pass 4: after Touchdown → D3",
     "หลัง Cauterize ทุกคนรวมทางเหนือหลบ Touchdown ของ Nidhogg และ Hraesvelgr\n"
     "Touchdown ลงแล้ว ทุกคนเดินออกจากจุด stack ยกเว้น DPS ที่มี Mortal Vow กับ D3\n"
     "จากนั้นมังกร 2 ตัวร่าย Revenge of the Horde (enrage)",
     "After Cauterize everyone gathers north to avoid Nidhogg's and Hraesvelgr's Touchdown\n"
     "After Touchdown everyone moves off the stack except the DPS with Mortal Vow and D3\n"
     "Then both dragons cast their enrage, Revenge of the Horde",
     strict=False, pic="06/mortal_vow_05.jpg", scene=S.mv5())
step(P6, "Alternative End", "raid-wide เข้า P7", "The raid-wide into P7",
     "ฆ่ามังกร 2 ตัวแล้ว เหลือตามังกร 2 ลูก: raid-wide + bleed (Resentment) เหมือนเดิม\n"
     "ถ้าไว้ชีวิต Thordan ใน P5 เขาจะกระโดดลงมา raid-wide + bleed อีกครั้ง (Shockwave) แล้วเอาตาไปแปลงร่างเป็น Dragon-king Thordan\n"
     "bleed จาก Shockwave หมดแล้ว: ใส่ shield และ mitigate หนักๆ รับ Alternative End (raid-wide สุดท้ายก่อน P7, ตอนนี้ Thordan เลือกเป้าไม่ได้)\n"
     "bleed แต่ละ tick ราว 14k: ห้ามใส่ shield จนกว่า bleed หมดทั้งหมด\n\n"
     "mitigate: MT 90s, ST 90s, H2 30s, H2 120s, H2 90s, D3 (SCH ใช้ Fey Illumination แทน Expedient ได้)\n"
     "Tip: Thordan พูด \"Hahahaha! By the power of mine enemy's eyes...\" ก่อน bleed รอบ 2 / DNC เริ่ม Improvisation ตอนกล่องข้อความหายไป จะได้ shield เต็ม",
     "With both dragons down, their two eyes remain: a raid-wide with a bleed (Resentment) as before\n"
     "If Thordan was spared in P5, he jumps down for another raid-wide with a bleed (Shockwave), then takes the eyes and becomes Dragon-king Thordan\n"
     "When Shockwave's bleed wears off, shield and mitigate heavily for Alternative End (the last raid-wide before P7; Thordan isn't targetable)\n"
     "Each bleed tick is about 14k: no shields until the bleed is completely gone\n\n"
     "Mitigate: MT 90s, ST 90s, H2 30s, H2 120s, H2 90s, D3 (a SCH may use Fey Illumination instead of Expedient)\n"
     "Tip: Thordan says \"Hahahaha! By the power of mine enemy's eyes...\" before the second bleeds / a DNC starts Improvisation when the dialogue box disappears for the full shield",
     strict=False)
