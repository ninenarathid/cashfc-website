"""P3 Bahamut Prime (Tuufless 03_bahamut), in Thai and English."""
from refs import R

P3 = ("P3 Bahamut Prime", "P3 Bahamut Prime")
STEPS = []


def st(mech, name, note, img=None, scene=None, strict=False, says=None, refs=None):
    STEPS.append(dict(phase=P3, mech=mech, name=name, note=note, img=img, scene=scene, strict=strict, says=says, refs=refs))


# ------------------------------------------------------------------ Quickmarch Trio
QM_SAYS = {"MT": ("กลุ่มตะวันตก ใกล้ 3 บอสที่สุด", "West group, nearest the three bosses"),
           "ST": ("กลุ่มตะวันออก ใกล้ 3 บอสที่สุด", "East group, nearest the three bosses"),
           "H1": ("กลุ่มตะวันตก ถัดจาก MT", "West group, after the MT"), "H2": ("กลุ่มตะวันออก ถัดจาก ST", "East group, after the ST"),
           "D1": ("กลุ่มตะวันตก ถัดจาก H1", "West group, after H1"), "D2": ("กลุ่มตะวันออก ถัดจาก H2", "East group, after H2"),
           "D3": ("กลุ่มตะวันตก ไกลบอสที่สุด", "West group, furthest from the bosses"),
           "D4": ("กลุ่มตะวันออก ไกลบอสที่สุด", "East group, furthest from the bosses")}

st("Quickmarch Trio", ("ภาพรวม: Trio คืออะไร", "Overview: what a Trio is"),
   ("เฟส Bahamut เป็นชุด Mechanic ชื่อ Trio ต่อกันหลายชุด: แต่ละชุดรวม Mechanic ของ 3 บอส (Twintania, Nael, Bahamut) มาทำพร้อมกัน\n"
    "Bahamut เปิดด้วย Flare Breath ต่อด้วย Flatten (และตีปกติ 1 ครั้ง) ก่อนเริ่ม Trio ชุดแรก",
    "Bahamut's phase is a gauntlet of Trios: each puts mechanics from all three bosses (Twintania, Nael, Bahamut) together\n"
    "Bahamut opens with Flare Breath into Flatten (and an auto-attack) before the first Trio"),
   refs=R("flatten"))

st("Quickmarch Trio", ("Quickmarch ①: แบ่งตะวันตก / ตะวันออก", "Quickmarch ①: split west / east"),
   ("ถือจุดที่บอส 3 ตัวโผล่เป็นทิศเหนือ แล้วกระจายตามขอบสนามฝั่งตะวันตกและตะวันออก\n"
    "กลุ่ม MT: ตะวันตก / กลุ่ม ST: ตะวันออก\n"
    "เรียงจากฝั่งบอส: Tank > Healer > Melee > Range\n\n"
    "ช่องว่างระหว่างคู่ตรงกลางกับหัว–ท้ายแถวสำคัญ: Tank กับ Range (โดยเฉพาะ Range) อาจกะขอบ dive ยาก ไม่ต้องยืนชิดขอบ dive แค่เว้นที่ให้ Healer กับ Melee หลบตามขอบได้",
    "Treat where the three bosses appear as north, and spread along the west and east sides\n"
    "MT group: west / ST group: east\n"
    "From the bosses: Tank > Healer > Melee > Ranged\n\n"
    "Mind the gap between the middle pair and the ends: the tanks and especially the ranged may find the dive's edge hard to judge; they needn't hug it, the healers and melee just need room to dodge along the edge"),
   img="03_quickmarch_01", scene="qm1", strict=True, says=QM_SAYS, refs=R("quickmarch"))

st("Quickmarch Trio", ("②: Megaflare Dive แล้ววิ่งตามขอบหลบ Twister", "②: Megaflare Dive, then along the edge for Twisters"),
   ("Bahamut ร่าย Megaflare Dive เสร็จ: ทุกคนเดินตามขอบสนามหลบ Twister\n"
    "การหลบตามขอบทำให้ปาร์ตี้ยังกระจายตัว (Megaflare แบบไม่มีวงไม่ทับกัน) และกลางสนามโล่งจาก Megaflare วงใหญ่ ให้ Healer เข้าไป heal กลุ่ม DPS ได้",
    "When Bahamut finishes Megaflare Dive, everyone moves along the edge to dodge the Twisters\n"
    "Dodging along the edge keeps the party spread (so the untelegraphed Megaflares don't overlap) and keeps the centre clear of the big Megaflares, so the healers can get in to heal the DPS stack"),
   img="03_quickmarch_02", scene="qm2", strict=True)

st("Quickmarch Trio", ("③: Megaflare 2 แบบ", "③: two kinds of Megaflare"),
   ("ผู้เล่นสุ่ม 4 คนโดน Megaflare วงใหญ่ใต้เท้า (มีวงให้เห็น)\n"
    "ผู้เล่นสุ่มอีก 4 คนโดน Megaflare ไม่มีวงยิงใส่ (คนเดียวโดนทั้งสองแบบได้)",
    "Four random players get a big Megaflare placed under them (telegraphed)\n"
    "Four random players are also hit by an untelegraphed Megaflare (you can get both)"),
   img="03_quickmarch_03", scene="qm3")

st("Quickmarch Trio", ("④: สาย Tempest Wing + มาร์ก Megaflare", "④: Tempest Wing tethers + Megaflare markers"),
   ("Bahamut โผล่ โยงสายไปที่ผู้เล่นสุ่ม 2 คน (ไม่ใช่ Tank)\n"
    "DPS 3 คนได้มาร์กวงขาว Megaflare\n"
    "ได้มาร์ก: ไป stack ทางใต้ / ไม่ได้มาร์ก: ไปทางเหนือ\n"
    "Megaflare แบบมีวงระเบิด: Healer เติม HP กลุ่ม DPS ที่อาจโดน Megaflare ขั้นก่อน",
    "Bahamut appears and tethers two random non-tanks\n"
    "Three DPS get a white Megaflare ring marker\n"
    "Marked: stack south / unmarked: go north\n"
    "The telegraphed Megaflares go off: healers top up the DPS, who may have been hit by the last step's Megaflares"),
   img="03_quickmarch_04", scene="qm4", refs=R("megaflare_mark"))

st("Quickmarch Trio", ("⑤: Earthshaker + stack Megaflare + Tank รับสาย", "⑤: Earthshakers + the Megaflare stack + tanks take the tethers"),
   ("มาร์ก Earthshaker ขึ้นที่ Healer 2 คน กับ DPS ที่ไม่ได้มาร์ก Megaflare\n"
    "stack Megaflare ลงที่ 1 ใน 3 คนที่มีมาร์ก: DPS 3 คนแบ่งกันรับ\n"
    "Tank รับสาย Tempest Wing มาก่อนหรือทันทีหลัง stack นี้\n\n"
    "จุดยืน (ถือบอสเป็นเหนือ): (H1) MT ★ ST (H2) / D3 ทางเหนือ / DPS stack ทางใต้",
    "Earthshaker markers appear on both healers and the DPS without a Megaflare marker\n"
    "A Megaflare stack hits one of the three marked players: the three DPS share it\n"
    "The tanks take the Tempest Wing tethers before or right after this stack\n\n"
    "Spots (bosses as north): (H1) MT ★ ST (H2) / D3 north / the DPS stack south"),
   img="03_quickmarch_05", scene="qm5", strict=True,
   says={"MT": ("รับสาย Tempest Wing ยืนหน้า H1", "Take a Tempest Wing tether, in front of H1"),
         "ST": ("รับสาย Tempest Wing ยืนหน้า H2", "Take a Tempest Wing tether, in front of H2")})

st("Earthshaker", ("⑥: Earthshaker ลง", "⑥: Earthshakers resolve"),
   ("Earthshaker ลง (กรวยจากกลางไปหาคนมีมาร์ก)\nTank ยืนหน้า Healer: โดน Earthshaker แค่นิดเดียว ตราบใดที่ไม่โดน 2 อัน",
    "The Earthshakers resolve (cones from the centre at each marked player)\nThe tanks stand in front of the healers: they take little from an Earthshaker as long as they aren't hit by two"),
   img="03_quickmarch_06", scene="qm6", strict=True, refs=R("earthshaker"))

st("Tempest Wing", ("⑦: Tempest Wing ลง", "⑦: Tempest Wings resolve"),
   ("Tempest Wing ลงที่ Tank 2 คนที่ถือสาย", "The Tempest Wings resolve on the two tanks holding the tethers"),
   img="03_quickmarch_07", scene="qm7")

# ------------------------------------------------------------------ Blackfire Trio
st("Blackfire Trio", ("Blackfire ①: stack กลาง หา Nael", "Blackfire ①: stack centre, find Nael"),
   ("หลัง Quickmarch Trio บอสใช้ Flare Breath ต่อ Flatten อีกครั้ง แล้วเริ่ม Trio ที่สอง\n\n"
    "stack กลางสนาม (marker 4) แล้วหาว่า Nael อยู่ไหน\n"
    "ผู้เล่น 1 คนได้มาร์ก dive ของ Bahamut\n"
    "ทริค: Nael อยู่ตามเข็มจาก Bahamut และทวนเข็มจาก Twintania เสมอ",
    "After Quickmarch Trio, Bahamut does Flare Breath into Flatten again, then the second Trio\n\n"
    "Stack in the centre (marker 4) and locate Nael\n"
    "One player is marked for Bahamut's dive\n"
    "Tip: Nael is always clockwise from Bahamut and anti-clockwise from Twintania"),
   img="03_blackfire_01", scene="bf1")

st("Liquid Hell", ("②: เดินทีละก้าวไปหา Nael ล่อ Liquid Hell", "②: stagger-step to Nael, baiting Liquid Hell"),
   ("ทั้งปาร์ตี้เดินทีละช่วงจากกลางไปหา Nael ทิ้ง Liquid Hell ของ Twintania ไว้ตามทาง\nราว Liquid Hell ลูกที่ 3 Nael ร่าย Thermionic Beam ใส่ผู้เล่นสุ่ม (stack)",
    "The party stagger-steps from the centre toward Nael, baiting Twintania's Liquid Hells along the way\nAround the third Liquid Hell, Nael casts Thermionic Beam on a random player (a stack)"),
   img="03_blackfire_02", scene="bf2")

st("Megaflare Dive", ("③: dive ของ Bahamut ผ่านกลางสนาม", "③: Bahamut's dive through the centre"),
   ("ราว Liquid Hell ลูกที่ 5 dive ของ Bahamut ลง: ต้องล่อให้แนว dive ผ่านกลางสนาม",
    "Around the fifth Liquid Hell, Bahamut's divebomb resolves; it should have been baited through the centre"),
   img="03_blackfire_03", scene="bf3", refs=R("blackfire"))

st("Megaflare", ("④: tower 4 ลูก + stack Megaflare", "④: four towers + the Megaflare stack"),
   ("tower 4 ลูกโผล่ตามตำแหน่ง Nael (ถือ Nael เป็นเหนือ)\n"
    "แยก 2 กลุ่มที่ขอบสนาม: Tank กับ Healer เลี้ยวซ้าย / DPS เลี้ยวขวา\n\n"
    "Tank 1 / Healer 1 / DPS 2 คนได้มาร์กวง Megaflare: ไป stack ระหว่าง tower 2 ลูกฝั่งตรงข้าม Nael\n"
    "คนที่ไม่มีมาร์ก ยืนข้าง tower ของตัวเอง (ยังไม่เข้า):\n"
    "Tank → tower ตะวันตกเฉียงเหนือ\n"
    "Healer → tower ตะวันตกเฉียงใต้\n"
    "DPS → ตะวันออกเฉียงเหนือ D1 > D2 > D3 > D4 ตะวันออกเฉียงใต้ (คนที่อยู่ก่อนในลำดับเอา tower เหนือ)\n\n"
    "PF ต่างจากแผนของ Clees: Tank กับ Healer สลับ tower กัน (Healer เอา tower ที่ใกล้ stack Megaflare)",
    "Four towers appear relative to Nael (Nael as north)\n"
    "The party splits at the edge: tanks and healers turn left / DPS turn right\n\n"
    "One tank, one healer and two DPS get the Megaflare ring: they stack between the two towers opposite Nael\n"
    "Those without it stand beside (not in!) their tower:\n"
    "Tank → north-west tower\n"
    "Healer → south-west tower\n"
    "DPS → north-east D1 > D2 > D3 > D4 south-east (the earlier one takes the north tower)\n\n"
    "PF differs from Clees' plan here: the tank and healer towers are flipped (the healer takes the tower nearer the Megaflare stack)"),
   img="03_blackfire_04", scene="bf4", strict=["MT", "H1", "D1", "D4"],
   says={"MT": ("ไม่มีมาร์ก: tower ตะวันตกเฉียงเหนือ / มีมาร์ก: stack ตรงข้าม Nael", "No marker: the north-west tower / marker: the stack opposite Nael"),
         "ST": ("ไม่มีมาร์ก: tower ตะวันตกเฉียงเหนือ / มีมาร์ก: stack ตรงข้าม Nael", "No marker: the north-west tower / marker: the stack opposite Nael"),
         "H1": ("ไม่มีมาร์ก: tower ตะวันตกเฉียงใต้ / มีมาร์ก: stack", "No marker: the south-west tower / marker: the stack"),
         "H2": ("ไม่มีมาร์ก: tower ตะวันตกเฉียงใต้ / มีมาร์ก: stack", "No marker: the south-west tower / marker: the stack"),
         "D1": ("ไม่มีมาร์ก: DPS คนแรกในลำดับ D1 > D4 เอา tower ตะวันออกเฉียงเหนือ", "No marker: the first DPS in D1 > D4 takes north-east"),
         "D2": ("ไม่มีมาร์ก: ไล่ลำดับ D1 > D2 > D3 > D4 (เหนือก่อน)", "No marker: by D1 > D2 > D3 > D4 (north first)"),
         "D3": ("ไม่มีมาร์ก: ไล่ลำดับ D1 > D2 > D3 > D4 (เหนือก่อน)", "No marker: by D1 > D2 > D3 > D4 (north first)"),
         "D4": ("ไม่มีมาร์ก: DPS คนหลังในลำดับเอา tower ตะวันออกเฉียงใต้", "No marker: the later DPS takes south-east")},
   refs=R("blackfire_towers"))

st("Hypernova", ("⑤: Hypernova ลูกที่ 2: เข้า tower + stack ลง", "⑤: on the second Hypernova: into the towers + the stack goes off"),
   ("Nael ทิ้ง Hypernova ใส่ผู้เล่นสุ่ม\nตอน Hypernova ลูกที่ 2: stack Megaflare ลง และทุกคนที่ไม่มีมาร์กก้าวเข้า tower ของตัวเอง",
    "Nael drops Hypernovas on random players\nOn the second Hypernova the Megaflare stack resolves and everyone without a marker steps into their tower"),
   img="03_blackfire_05", scene="bf5", strict=["MT", "H1", "D1", "D4"])

st("Gigaflare", ("⑥: Gigaflare: รวมกันหลัง Bahamut", "⑥: Gigaflare: gather behind Bahamut"),
   ("Bahamut โผล่กลางสนามร่าย Gigaflare ขณะที่ Nael ทิ้ง Hypernova ลูกที่ 3 และ 4\nรวมกันกลางสนามด้านหลัง Bahamut (ระวัง Hypernova)",
    "Bahamut reappears in the centre casting Gigaflare while Nael places her third and fourth Hypernovas\nGather in the centre behind Bahamut (mind the Hypernovas)"),
   img="03_blackfire_06", scene="bf6", refs=R("gigaflare"))

# ------------------------------------------------------------------ Fellruin Trio
st("Fellruin Trio", ("Fellruin: คำพูดของ Nael (บอก 3 ท่า)", "Fellruin: Nael's quotes (three attacks)"),
   ("หลัง Blackfire Trio บอสใช้ Flare Breath 3 ครั้ง แล้วเริ่ม Fellruin Trio\n"
    "รอบนี้ประโยคของ Nael บอก 3 ท่า:\n\n"
    "From on high I descend, the moon and stars to bring!\n→ Raven Dive → Lunar Dynamo → Meteor Stream (spread → เข้าใน → Neurolink → spread)\n\n"
    "From hallowed moon I descend, a rain of stars to bring!\n→ Lunar Dynamo → Raven Dive → Meteor Stream (เข้าใน → spread → Neurolink → spread)",
    "After Blackfire Trio, Bahamut uses Flare Breath three times, then Fellruin Trio\n"
    "Nael's lines now give three attacks:\n\n"
    "From on high I descend, the moon and stars to bring!\n→ Raven Dive → Lunar Dynamo → Meteor Stream (spread → in → Neurolinks → spread)\n\n"
    "From hallowed moon I descend, a rain of stars to bring!\n→ Lunar Dynamo → Raven Dive → Meteor Stream (in → spread → Neurolinks → spread)"))

FR_SAYS = {"MT": ("รอบ Nael: ฝั่งขวา ใกล้กลางสนาม / ตอน Profusion → Neurolink ฝั่ง Bahamut", "Around Nael: right side, nearest the centre / for Profusion → the Neurolink by Bahamut"),
           "ST": ("รอบ Nael: ฝั่งซ้าย ใกล้กลางสนาม / ตอน Profusion → Neurolink ฝั่ง Twintania", "Around Nael: left side, nearest the centre / for Profusion → the Neurolink by Twintania"),
           "H2": ("รอบ Nael: ระหว่าง Tank 2 คน", "Around Nael: between the tanks"),
           "H1": ("รอบ Nael: กลางแถวที่ 2 / ตอน Profusion → Neurolink ใต้", "Around Nael: middle of the second row / for Profusion → the south Neurolink"),
           "D1": ("รอบ Nael: แถว 2 ซ้าย", "Around Nael: second row, left"), "D2": ("รอบ Nael: แถว 2 ขวา", "Around Nael: second row, right"),
           "D3": ("รอบ Nael: แถว 3 ซ้าย", "Around Nael: third row, left"), "D4": ("รอบ Nael: แถว 3 ขวา", "Around Nael: third row, right")}

st("Fellruin Trio", ("① ถ้าเป็น Lunar Dynamo ก่อน: stack ที่ Nael", "① If Lunar Dynamo first: stack on Nael"),
   ("หา Nael แล้ว stack หรือกระจายรอบ Nael ตามประโยค\nแบบ hallowed moon (Lunar Dynamo ก่อน): stack ชิด Nael\nTank ยืนใกล้กลางสนามที่สุด",
    "Find Nael, then stack or spread around her by her line\nhallowed moon (Lunar Dynamo first): stack close to Nael\nThe tanks stand nearest the centre of the arena"),
   img="03_fellruin_01a", scene="fr1a", strict=["MT", "ST"], says={k: FR_SAYS[k] for k in ("MT", "ST")})

st("Fellruin Trio", ("① ถ้าเป็น Raven Dive ก่อน: กระจายรอบ Nael", "① If Raven Dive first: spread around Nael"),
   ("แบบ on high I descend (Raven Dive ก่อน): กระจายรอบ Nael ตาม macro:\n"
    "แถว 1: Tank / H2 / Tank (Tank ใกล้กลางสนามที่สุด)\n"
    "แถว 2: D1 / H1 / D2\n"
    "แถว 3: D3 / D4",
    "on high I descend (Raven Dive first): spread around Nael as in the macro:\n"
    "Row 1: tank / H2 / tank (the tanks nearest the centre)\n"
    "Row 2: D1 / H1 / D2\n"
    "Row 3: D3 / D4"),
   img="03_fellruin_01b", scene="fr1b", strict=True, says=FR_SAYS, refs=R("fellruin"))

st("Lunar Dynamo", ("② ท่าแรกลง (Lunar Dynamo) + สาย Tempest Wing", "② The first attack (Lunar Dynamo) + Tempest Wing tethers"),
   ("ท่าแรกของประโยคลง\nสาย Tempest Wing ออกจาก Bahamut ไปหาผู้เล่นสุ่ม 2 คน (ไม่ใช่ Tank)",
    "The first attack of the line resolves\nTempest Wing tethers come from Bahamut to two random players other than the tanks"),
   img="03_fellruin_02a", scene="fr2a")

st("Raven Dive", ("② ท่าแรกลง (Raven Dive) + สาย Tempest Wing", "② The first attack (Raven Dive) + Tempest Wing tethers"),
   ("ท่าแรกของประโยคลง\nสาย Tempest Wing ออกจาก Bahamut ไปหาผู้เล่นสุ่ม 2 คน (ไม่ใช่ Tank)",
    "The first attack of the line resolves\nTempest Wing tethers come from Bahamut to two random players other than the tanks"),
   img="03_fellruin_02b", scene="fr2b", strict=True, says=FR_SAYS)

st("Raven Dive", ("③ ท่าที่สอง (ตรงข้ามท่าแรก): Raven Dive", "③ The second attack (always the opposite): Raven Dive"),
   ("ท่าที่สองของประโยคลง: เป็นท่าตรงข้ามกับท่าแรกเสมอ\nตอนนี้ Tank ต้องถือสาย Tempest Wing ไว้แล้ว",
    "The second attack resolves (always the opposite one)\nThe tanks should hold the Tempest Wing tethers by now"),
   img="03_fellruin_03a", scene="fr3a", strict=True, says=FR_SAYS)

st("Lunar Dynamo", ("③ ท่าที่สอง (ตรงข้ามท่าแรก): Lunar Dynamo", "③ The second attack (always the opposite): Lunar Dynamo"),
   ("ท่าที่สองของประโยคลง: เป็นท่าตรงข้ามกับท่าแรกเสมอ\nตอนนี้ Tank ต้องถือสาย Tempest Wing ไว้แล้ว\n\n"
    "ถ้าแบบ Raven Dive → Lunar Dynamo แล้ว Nael พุ่งใส่คนที่อยู่ลึกไปทางขอบ Tank อาจไปถึง Neurolink ไม่ทัน Aetherial Profusion: Tank เก็บ Sprint ไว้ใช้ตรงนี้",
    "The second attack resolves (always the opposite one)\nThe tanks should hold the Tempest Wing tethers by now\n\n"
    "With Raven Dive → Lunar Dynamo, if she dives a player too far toward the edge, the tanks may not reach the Neurolinks for Aetherial Profusion: tanks can save Sprint for this"),
   img="03_fellruin_03b", scene="fr3b")

st("Aetherial Profusion", ("④: Aetherial Profusion: ทุกคนต้องอยู่ใน Neurolink", "④: Aetherial Profusion: everyone in a Neurolink"),
   ("Aetherial Profusion ของ Twintania ลงพร้อม Tempest Wing ของ Bahamut\nทุกคนต้องอยู่ใน Neurolink\n"
    "จาก macro: H1 → Neurolink ใต้ (กับปาร์ตี้) / MT → Neurolink ฝั่ง Bahamut / ST → Neurolink ฝั่ง Twintania",
    "Twintania's Aetherial Profusion resolves together with Bahamut's Tempest Wing\nEvery player must be in a Neurolink\n"
    "From the macro: H1 → the south Neurolink (with the party) / MT → the Neurolink by Bahamut / ST → the one by Twintania"),
   img="03_fellruin_04", scene="fr4", strict=["MT", "ST"], says={k: FR_SAYS[k] for k in ("MT", "ST", "H1")}, refs=R("profusion"))

st("Meteor Stream", ("⑤: Meteor Stream: กระจายรอบ Neurolink", "⑤: Meteor Stream: spread around the Neurolink"),
   ("ท่าที่ 3 ของประโยคเป็น Meteor Stream เสมอ (AoE ใส่ผู้เล่นสุ่ม 4 คน)\nกระจายรอบ Neurolink ตามภาพ",
    "The third attack is always Meteor Stream (AoEs on four random players)\nSpread around the Neurolink as shown"),
   img="03_fellruin_05", scene="fr5", strict=True)

# ------------------------------------------------------------------ Heavensfall Trio
st("Heavensfall Trio", ("Heavensfall ①: stack กลาง หา 3 บอส", "Heavensfall ①: stack centre, find the three bosses"),
   ("Bahamut หันไปใช้ Flare Breath ใส่ Tank ทันที แล้ว Flatten ต่อ Flare Breath ก่อนเริ่ม Heavensfall Trio (ครึ่งทางของไฟต์)\n\n"
    "stack กลางสนาม แล้วหาบอสทั้ง 3\n"
    "ผู้เล่น 1 คนได้มาร์ก dive ของ Bahamut และอีก 1 คนได้มาร์ก dive ของ Twintania",
    "Bahamut immediately turns to Flare Breath the tank, then Flatten into Flare Breath, before Heavensfall Trio (the fight's halfway point)\n\n"
    "Stack in the centre and locate the three bosses\n"
    "One player is marked for Bahamut's dive and another for Twintania's"),
   img="03_heavensfall_01", scene="hf1", refs=R("heavensfall_trio"))

HF_SAYS = {"MT": ("ไปทาง Nael", "Toward Nael"), "ST": ("ไปทาง Nael", "Toward Nael"),
           "H1": ("ซ้ายของ 3 บอส", "Left of the three bosses"), "D1": ("ซ้ายของ 3 บอส", "Left of the three bosses"),
           "H2": ("ขวาของ 3 บอส", "Right of the three bosses"), "D2": ("ขวาของ 3 บอส", "Right of the three bosses"),
           "D3": ("ตรงข้าม Nael", "Opposite Nael"), "D4": ("ตรงข้าม Nael", "Opposite Nael")}
HF_NOTE = ("กระจายตามนี้:\nMT ST: ไปทาง Nael\nH1 D1: ซ้ายของ 3 บอส\nH2 D2: ขวาของ 3 บอส\nD3 D4: ตรงข้าม Nael\n\n"
           "PF ต่างจากแผนของ Clees: Tank ไปทาง Nael เสมอ และ D3 D4 ไปตรงข้าม Nael เสมอ\n"
           "ช่องเล็กๆ ระหว่างแนว dive มีจริง แต่อย่าใช้",
           "Spread as follows:\nMT ST: toward Nael\nH1 D1: left of the three bosses\nH2 D2: right of the three bosses\nD3 D4: opposite Nael\n\n"
           "PF differs from Clees' plan: both tanks always go toward Nael, and D3 D4 always opposite her\n"
           "There really are small gaps between the dive bands; don't use them")

st("Heavensfall Trio", ("② Nael ซ้าย", "② Nael left"),
   ("ภาพนี้: Nael อยู่ซ้าย (ตะวันตกเฉียงเหนือ)\n\n" + HF_NOTE[0], "This picture: Nael on the left (north-west)\n\n" + HF_NOTE[1]),
   img="03_heavensfall_02a", scene="hf2a", strict=True, says=HF_SAYS)

st("Heavensfall Trio", ("② Nael กลาง", "② Nael middle"),
   ("ภาพนี้: Nael อยู่กลาง (เหนือ)\n\n" + HF_NOTE[0], "This picture: Nael in the middle (north)\n\n" + HF_NOTE[1]),
   img="03_heavensfall_02b", scene="hf2b", strict=True, says=HF_SAYS)

st("Heavensfall Trio", ("② Nael ขวา", "② Nael right"),
   ("ภาพนี้: Nael อยู่ขวา (ตะวันออกเฉียงเหนือ)\n\n" + HF_NOTE[0], "This picture: Nael on the right (north-east)\n\n" + HF_NOTE[1]),
   img="03_heavensfall_02c", scene="hf2c", strict=True, says=HF_SAYS)

st("Heavensfall Trio", ("ช่องระหว่างแนว dive: อย่าใช้", "The gaps between the dives: don't use them"),
   ("ช่องเล็กๆ ระหว่างแนว dive (วงแดงในภาพ) มีจริง แต่อย่าใช้หลบ", "The small gaps between the dive bands (red circles) are real, but don't use them"),
   img="03_heavensfall_faq", scene="hffaq")

st("Megaflare", ("③: dive ลง แล้ววิ่งตามขอบ ล่อ Megaflare", "③: the dives go off, then along the edge baiting Megaflares"),
   ("Twintania กับ Bahamut พุ่ง (dive) แล้วเหลือ Nael ไว้\nเดินตามขอบหลบ Twister และล่อ Megaflare ไว้รอบนอกสนาม เหมือน Quickmarch Trio",
    "Twintania and Bahamut dive, leaving Nael behind\nMove along the edge to dodge the Twisters and bait the Megaflares around the outside, just like Quickmarch Trio"),
   img="03_heavensfall_03", scene="hf3", strict=True)

HF4_SAYS = {"MT": ("tower แรกทวนเข็มจาก Nael (ไม่นับที่ Nael)", "First tower anti-clockwise of Nael (Nael's not counted)"),
            "H1": ("tower ที่ 2 ทวนเข็มจาก Nael", "Second tower anti-clockwise of Nael"),
            "D1": ("tower ที่ 3 ทวนเข็มจาก Nael", "Third tower anti-clockwise of Nael"),
            "D3": ("tower ที่ 4 ทวนเข็มจาก Nael", "Fourth tower anti-clockwise of Nael"),
            "ST": ("tower ที่ Nael (ถ้ามี) แล้วนับตามเข็ม", "The tower at Nael (if any), counting clockwise"),
            "H2": ("tower ที่ 2 ตามเข็ม (นับที่ Nael)", "Second tower clockwise (Nael's counted)"),
            "D2": ("tower ที่ 3 ตามเข็ม (นับที่ Nael)", "Third tower clockwise (Nael's counted)"),
            "D4": ("tower ที่ 4 ตามเข็ม (นับที่ Nael)", "Fourth tower clockwise (Nael's counted)")}

st("Heavensfall", ("④: tower 8 ลูก: ยืนหน้า tower ของตัวเอง", "④: eight towers: stand in front of yours"),
   ("tower 8 ลูกเกิดรอบขอบสนาม: ถือ Nael เป็นจุดอ้างอิง หา tower ของตัวเองแล้วยืนข้างหน้า (ฝั่งกลางสนาม)\n"
    "ทวนเข็ม (ไม่นับ tower ที่ Nael): MT > H1 > D1 > D3\n"
    "ตามเข็ม (นับ tower ที่ Nael): ST > H2 > D2 > D4\n"
    "อาจมี tower เกิดตรงตำแหน่ง Nael: ถ้ามี ST เอา tower นั้น\n\n"
    "ใช้ Neurolink กะระยะคร่าวๆ ว่าควรยืนห่างกลางแค่ไหน\n"
    "โดน knockback ชนกำแพง = ตายทันที: ยืนค่อนเข้ากลางไว้ก่อน",
    "Eight towers spawn around the edge: using Nael as the reference, find your tower and stand in front of it (on the centre side)\n"
    "Anti-clockwise (excluding Nael's): MT > H1 > D1 > D3\n"
    "Clockwise (including Nael's): ST > H2 > D2 > D4\n"
    "A tower may spawn at Nael's position: if so, the ST takes it\n\n"
    "Use the Neurolinks as a rough guide to how far from the centre to stand\n"
    "Being knocked into the wall is instant death: err toward the centre"),
   img="03_heavensfall_04", scene="hf4", strict=True, says=HF4_SAYS, refs=R("hf_towers"))

st("Heavensfall", ("⑤: tower กลางตก: knockback เข้า tower", "⑤: the centre tower drops: knocked into the towers"),
   ("tower Heavensfall ตกกลางสนาม knockback ทุกคนไปทางขอบเข้า tower ของตัวเอง (ปรับตัวได้ราวครึ่งวินาที)\n"
    "ทริค: LB3 Tank ทำให้พลาด tower ได้ไม่เกิน 2 ลูก ใช้ตอนซ้อมได้ แต่จะไม่เหลือไว้ใช้ใน Grand Octet",
    "The Heavensfall tower drops in the centre, knocking everyone toward the edge into their towers (about half a second to adjust)\n"
    "Tip: a tank LB3 lets the party miss at most two towers; fine for practice, but it won't be there for Grand Octet"),
   img="03_heavensfall_05", scene="hf5", strict=True, says=HF4_SAYS)

st("Heavensfall", ("⑥: AoE ช่องแรกของ tower", "⑥: the tower's first slices"),
   ("AoE ช่องจาก tower Heavensfall โผล่\nต่างจากตอนเข้า Nael: รอบนี้ไล่วนรอบเดียวครบวง ตามเข็มหรือทวนเข็ม",
    "The Heavensfall tower's AoE slices appear\nUnlike the move into Nael, these simply go round a full circle, clockwise or anti-clockwise"),
   img="03_heavensfall_06", scene="hf6")

st("Heavensfall", ("⑦: ช่องที่ 2 บอกทิศการหมุน", "⑦: the second slices give the direction"),
   ("ช่องชุดที่ 2 โผล่ บอกว่า AoE หมุนตามเข็มหรือทวนเข็ม\n"
    "ทริค: ระหว่างช่องที่ 1 กับ 2 เว้นนานกว่าช่องต่อๆ ไปมาก: ถ้าอยู่ใกล้ ใช้จังหวะนี้หลบเข้าตรงที่ช่องแรกเพิ่งระเบิด",
    "The second slices appear, showing whether the AoEs travel clockwise or anti-clockwise\n"
    "Tip: the gap between the first and second slices is much longer than the later ones: if you're nearby, use it to dodge into where the first slice exploded"),
   img="03_heavensfall_07", scene="hf7", refs=R("hf_slices"))

st("Hypernova", ("⑧: วนเข้ากลาง + Hypernova", "⑧: spiral in + Hypernovas"),
   ("หมุนวนเข้าหากลางสนาม ขณะที่ Nael ทิ้ง Hypernova 4 ลูกใส่ผู้เล่นสุ่ม\nอย่าล่อ Hypernova ไว้กลางสนาม",
    "Spiral in toward the centre while Nael drops four Hypernovas on random players\nDon't bait a Hypernova in the centre"),
   img="03_heavensfall_08", scene="hf8")

st("Fireball", ("⑨: มาร์ก Fireball", "⑨: the Fireball marker"),
   ("ผู้เล่นสุ่ม 1 คนได้มาร์ก Fireball ของ Twintania", "A random player is marked for Twintania's Fireball"),
   img="03_heavensfall_09", scene="hf9")

st("Fireball", ("⑩: stack Fireball กลาง + Gigaflare", "⑩: the Fireball stack in the middle + Gigaflare"),
   ("stack กลางสนาม (marker 4) แบ่งดาเมจ Fireball\nBahamut โผล่ร่าย Gigaflare\n"
    "ทริค: ถ้ามีคนตายไปหลายคนแล้ว ยอมให้เป้า Fireball รับคนเดียวห่างปาร์ตี้แทน",
    "Stack in the middle (marker 4) to share the Fireball\nBahamut appears and casts Gigaflare\n"
    "Tip: if accidents have left people dead, consider sacrificing the Fireball target: they take it alone, away from the party"),
   img="03_heavensfall_10", scene="hf10")

# ------------------------------------------------------------------ Tenstrike Trio
st("Tenstrike Trio", ("Tenstrike ①: เข้าแถวตะวันตก → ตะวันออก", "Tenstrike ①: line up west to east"),
   ("เหมือนหลัง Blackfire Trio: Bahamut ใช้ Flare Breath 3 ครั้ง แล้วเริ่ม Tenstrike Trio\n\n"
    "เข้าแถวจากตะวันตกไปตะวันออก: D3 > H1 > D1 > MT > ST > D2 > H2 > D4\n"
    "PF ทำ Tenstrike แบบจุดปลอดภัยจุดเดียว (marker ใต้) แทน 2 จุด",
    "As after Blackfire Trio, Bahamut Flare Breaths three times, then Tenstrike Trio\n\n"
    "Line up west to east: D3 > H1 > D1 > MT > ST > D2 > H2 > D4\n"
    "PF does Tenstrike with one safe spot (the south marker) instead of two"),
   img="03_tenstrike_01", scene="ts1", strict=True, refs=R("tenstrike"))

st("Hatch", ("②: Twintania กลาง + Hatch 3 คน", "②: Twintania in the centre + Hatch on three"),
   ("Twintania โผล่กลางสนาม และผู้เล่นสุ่ม 3 คน (รวม Tank และ Healer ได้) โดน Hatch",
    "Twintania appears in the centre, and three random players (tanks and healers included) are targeted for Hatch"),
   img="03_tenstrike_02", scene="ts2")

st("Hatch", ("③: 3 คนแรกเข้า Neurolink ตามลำดับซ้าย → ขวา", "③: the three take the Neurolinks left to right"),
   ("3 คนที่โดน Hatch เรียงตามแถวจากซ้ายไปขวา เข้า Neurolink: ตะวันตกเฉียงเหนือ > ใต้ > ตะวันออกเฉียงเหนือ\n"
    "คนที่ไม่โดน: กระจายตัว และห้ามยืนด้านหลังคนที่มี Hatch\n\n"
    "Hatch ชุดที่ 2: คนที่ไม่โดน 3 คนแรกตามแถวซ้าย → ขวา (ตาม macro) รับ\n"
    "ส่วนใหญ่กระโดดบอกว่าจะรับ Neurolink ใกล้ตัว\n"
    "คนรับชุดที่ 2 ยืนข้าง Neurolink รอ",
    "The three Hatch targets, by their place in the line left to right, take the north-west > south > north-east Neurolinks\n"
    "Everyone else spreads out, and never stands behind a Hatch player\n\n"
    "Second Hatches: the first three untargeted players in the line, left to right (from the macro)\n"
    "Players usually jump to show they'll cover the nearby Neurolink\n"
    "The second-set players stand beside the Neurolink"),
   img="03_tenstrike_03", scene="ts3", refs=R("tenstrike_hatch"))

st("Meteor Stream", ("④: Hatch ชุดแรกลง + Meteor Stream ทีละคน", "④: the first Hatches + Meteor Streams one at a time"),
   ("Hatch ชุดแรกถึงตัว 3 คนแล้วระเบิด\nระหว่างนั้น Meteor Stream ลงทีละคน: DPS ก่อน แล้ว Healer แล้ว Tank (ภาพแสดง 4 คนแรก)",
    "The first Hatches reach the three and resolve\nMeanwhile Meteor Streams hit each player one at a time: DPS first, then healers, then tanks (the first four shown)"),
   img="03_tenstrike_04", scene="ts4")

st("Hatch", ("⑤: ชุดแรกเดินออกตรงๆ / ชุดสองเข้า", "⑤: the first set walks straight out / the second walks in"),
   ("Hatch ชุดแรกลงแล้ว: 3 คนนั้นเดินเป็นเส้นตรงออกไปขอบสนาม\n"
    "3 คนที่รับชุดที่ 2 เดินเข้า Neurolink\n"
    "เส้นทางคนเข้ากับคนออกห้ามตัดกัน\n\n"
    "Neurolink ใต้มักทำให้ลูกบอลวิ่งโค้งอ้อม (เบี่ยงไปทางตะวันออก)\n"
    "ลูกบอลเล็งที่หลังตัวละคร: เดินตรงๆ หมุนตัวให้น้อยที่สุด / Healer ระวังเป็นพิเศษ (วิ่งออกแล้วหันไป healคนอื่น)",
    "Once the first Hatches resolve, those three walk in a straight line to the edge\n"
    "The three taking the second set walk into the Neurolinks\n"
    "The paths in and out must not cross\n\n"
    "The south Neurolink is finicky: the orb tends to curve around it (a bit east) instead of going straight\n"
    "The orbs aim for your character's back: move straight with minimal turns / healers especially (running out, then turning to heal)"),
   img="03_tenstrike_05", scene="ts5")

st("Earthshaker", ("⑥: Twintania หาย + Earthshaker 4 คน", "⑥: Twintania leaves + Earthshakers on four"),
   ("Hatch ชุดที่ 2 ลงแล้ว Twintania หายไป\nผู้เล่นสุ่ม 4 คนได้มาร์ก Earthshaker",
    "After the second Hatches, Twintania disappears and four random players are marked for Earthshakers"),
   img="03_tenstrike_06", scene="ts6")

st("Earthshaker", ("⑦: มีมาร์กกระจายฝั่งเหนือ / ไม่มีเข้าสี่เหลี่ยมใต้", "⑦: marked spread north / unmarked in a square south"),
   ("4 คนที่มีมาร์กกระจายไปฝั่งเหนือของสนาม ล่อ Earthshaker (marker A B C D)\n"
    "4 คนที่ไม่มีมาร์กยืนเป็นสี่เหลี่ยมที่ Neurolink ใต้ (marker 3)\n"
    "มุมสี่เหลี่ยมบอกทิศที่ 4 คนนี้จะกระจายไปในรอบถัดไป: ถ้า marker 3 เป็นสี่เหลี่ยม ใช้ 4 มุมของมันได้เลย",
    "The four marked players spread along the north of the arena to bait Earthshakers (markers A B C D)\n"
    "The four unmarked stand in a square at the south Neurolink (marker 3)\n"
    "The square shows which way each will spread next: with a square marker on 3, use its four corners"),
   img="03_tenstrike_07", scene="ts7", refs=R("tenstrike_es"))

st("Earthshaker", ("⑧: Earthshaker ชุดแรกลง / อีก 4 คนได้มาร์ก", "⑧: the first Earthshakers / the other four get marked"),
   ("Earthshaker ชุดแรกลง\n4 คนที่ยืนสี่เหลี่ยมได้มาร์ก Earthshaker ต่อ",
    "The first Earthshakers resolve\nThe four in the square are now marked"),
   img="03_tenstrike_08", scene="ts8")

st("Earthshaker", ("⑨: 2 กลุ่มสลับที่", "⑨: the two groups swap"),
   ("2 กลุ่มสลับที่กัน: กลุ่มใหม่ออกไปตามมุมสี่เหลี่ยม / กลุ่มแรกเข้ามาที่ Neurolink ใต้",
    "The two groups swap: the new four go out by their square corners / the first four come in to the south Neurolink"),
   img="03_tenstrike_09", scene="ts9")

st("Gigaflare", ("⑩: Earthshaker ชุดสอง + Gigaflare", "⑩: the second Earthshakers + Gigaflare"),
   ("Earthshaker ชุดที่ 2 ลง\nBahamut เริ่มร่าย Gigaflare", "The second Earthshakers resolve\nBahamut starts casting Gigaflare"),
   img="03_tenstrike_10", scene="ts10", refs=R("ts_giga"))

# ------------------------------------------------------------------ Grand Octet
st("Grand Octet", ("Grand Octet ①: HP Bahamut ต้องต่ำกว่า 60%", "Grand Octet ①: Bahamut must be under 60%"),
   ("หลัง Tenstrike บอสใช้ Flatten กับ Flare Breath แล้วเริ่ม Grand Octet\n"
    "Bahamut ต้องเหลือ HP ต่ำกว่า 60% ตอนหายไปทำ Grand Octet ไม่อย่างนั้นใน Golden Bahamut บอสได้บัฟดาเมจเพิ่ม (ราว 5 เท่า) จนปาร์ตี้ปกติเคลียร์ไม่ได้ (ยังซ้อมเฟส adds ได้) ปัจจุบันแทบไม่มีปัญหา\n\n"
    "ตอนร่าย Grand Octet มังกร 5 ตัวโผล่รอบนอกสนาม: หันกล้องดูช่องว่างที่เหลือ เตรียมรับ Mechanic ถัดไป",
    "After Tenstrike, Bahamut Flattens and Flare Breaths, then Grand Octet\n"
    "Bahamut must be below 60% HP when he leaves for Grand Octet, or Golden Bahamut gets a damage-up buff (about 5x) that a standard party can't clear (you can still practise the adds phase); this really shouldn't be a problem nowadays\n\n"
    "As he casts Grand Octet five dragons appear around the outside: turn your camera to the empty spaces"),
   img="03_grand_octet_01", scene="go1", refs=R("grand_octet"))

st("Grand Octet", ("②: หา Bahamut: ทิศหลักหรือทิศเฉียง", "②: find Bahamut: cardinal or intercardinal"),
   ("Twintania, Nael, Bahamut โผล่ในช่องว่าง 3 ช่องที่เหลือ\n"
    "หา Bahamut แล้วดูว่าอยู่ทิศหลักหรือทิศเฉียง:\n"
    "ทิศหลัก (เหนือ ใต้ ออก ตก): ปาร์ตี้วิ่งทวนเข็ม\n"
    "ทิศเฉียง: ปาร์ตี้วิ่งตามเข็ม\n"
    "ดูด้วยว่า Nael อยู่ตรงข้าม Bahamut หรือไม่\n\n"
    "ทริค: ใช้ marker สี่เหลี่ยมกลางสนาม (marker 4) ช่วย: Bahamut ตรงกับด้านของสี่เหลี่ยม = ทิศหลัก / ตรงกับมุม = ทิศเฉียง",
    "Twintania, Nael and Bahamut spawn in the three remaining spaces\n"
    "Find Bahamut and see whether he's on a cardinal or an intercardinal:\n"
    "Cardinal (N S E W): the party runs anti-clockwise\n"
    "Intercardinal: the party runs clockwise\n"
    "Also check whether Nael is directly opposite Bahamut\n\n"
    "Tip: a square marker in the middle (marker 4) helps: Bahamut in line with a square's edge = cardinal / with a corner = intercardinal"),
   img="03_grand_octet_02", scene="go2")

st("Grand Octet", ("③ Nael ไม่ตรงข้าม: วิ่งไปตรงข้าม Bahamut", "③ Nael not opposite: run opposite Bahamut"),
   ("ผู้เล่น 2 คนได้มาร์ก divebomb: 1 คนของ Nael (มาร์กเหลือง) / 1 คนของมังกร 1 ใน 5 ตัว\n"
    "พอมาร์กขึ้น: ทั้งปาร์ตี้วิ่งไปฝั่งตรงข้าม Bahamut\n"
    "ภาพ: Bahamut ตะวันตกเฉียงเหนือ → ปาร์ตี้ไปตะวันออกเฉียงใต้",
    "Two players get divebomb markers: one for Nael (the yellow one) / one for one of the five dragons\n"
    "When the markers appear, the party runs opposite Bahamut\n"
    "Picture: Bahamut north-west → the party goes south-east"),
   img="03_grand_octet_03a", scene="go3a")

st("Grand Octet", ("③ Nael ตรงข้าม Bahamut: เลื่อนไป 1 ช่อง", "③ Nael opposite Bahamut: one spot over"),
   ("ถ้า Nael อยู่ตรงข้าม Bahamut: วิ่งไปตรงข้าม Bahamut แล้วเลื่อนไปอีก 1 ช่องตามทิศที่จะวิ่ง\n"
    "ภาพ: Nael ตะวันออกเฉียงใต้ ตรงข้าม Bahamut ตะวันตกเฉียงเหนือ: Bahamut อยู่ทิศเฉียง (วิ่งตามเข็ม) ปาร์ตี้จึงไปช่องถัดจาก Nael ตามเข็ม (ใต้)",
    "If Nael is opposite Bahamut: run opposite Bahamut and one spot over in the direction you'll be running\n"
    "Picture: Nael south-east, opposite Bahamut north-west; Bahamut is intercardinal (clockwise), so the party goes one spot clockwise from Nael (south)"),
   img="03_grand_octet_03b", scene="go3b")

st("Grand Octet", ("④: Nael dive แล้ววิ่งวน", "④: Nael dives, then run round"),
   ("Nael พุ่งลง\nปาร์ตี้วิ่งวนตามเข็มหรือทวนเข็มตามตำแหน่ง Bahamut\nมังกรอีก 4 ตัวเล็งผู้เล่นทีละคน: จำไว้ว่าตัวเองได้มาร์ก divebomb หรือยังระหว่างวิ่ง",
    "Nael dives\nThe party runs clockwise or anti-clockwise by Bahamut's position\nOne by one, players are targeted for the other four dragons' dives: note whether you get a divebomb marker as you run"),
   img="03_grand_octet_04", scene="go4", refs=R("octet_run"))

st("Grand Octet", ("⑤: ใกล้ Bahamut: ใช้ Sprint", "⑤: approaching Bahamut: Sprint"),
   ("พอปาร์ตี้วิ่งเข้าใกล้ Bahamut ควรกด Sprint ให้นำหน้า divebomb ไว้",
    "As the party approaches Bahamut, Sprint to stay ahead of the divebombs"),
   img="03_grand_octet_05", scene="go5")

st("Grand Octet", ("⑥: มาร์กแดงของ Bahamut: วิ่งเข้ากลาง", "⑥: Bahamut's red marker: run to the centre"),
   ("หลังมังกร 5 ตัวเล็งครบ Bahamut เล็ง 1 ใน 2 คนที่ยังไม่ได้มาร์ก\n"
    "พอมาร์กแดงของ Bahamut ขึ้น: ทุกคนวิ่งเข้ากลางสนาม\n"
    "ตอนนี้จะเหลือ 1 คนที่ไม่เคยได้มาร์ก: คนนั้นเตรียมล่อ dive ของ Twintania",
    "After the five dragons have their targets, Bahamut targets one of the two players without a divebomb\n"
    "When the red divebomb marker appears, run to the centre\n"
    "Only one player hasn't had a divebomb now: they get ready to bait Twintania's dive"),
   img="03_grand_octet_06", scene="go6", refs=R("octet_red"))

st("Grand Octet", ("⑦: Bahamut dive: หา Twintania", "⑦: Bahamut dives: find Twintania"),
   ("Bahamut พุ่งลง\nหา Twintania ให้เจอ", "Bahamut dives\nFind Twintania"),
   img="03_grand_octet_07", scene="go7")

st("Grand Octet", ("⑧ (มี LB3 Tank): tower 4 ลูก: กด LB3", "⑧ (with tank LB3): four towers: LB3"),
   ("ผู้เล่นสุ่ม 4 คนได้มาร์ก Megaflare และ tower 4 ลูกโผล่\n"
    "tower โผล่: Tank กด LB3\n"
    "คนที่ไม่เคยได้มาร์ก divebomb: ไปยืนซ้าย (ทวนเข็ม) ของ Twintania / ถ้าคนนั้นเป็น Tank อีกคนกด LB3 แทน\n"
    "ที่เหลือกระจายตัว 4 คนเข้า tower 4 ลูก\n"
    "ไม่ต้องสนใจมาร์ก Megaflare",
    "Four random players get the Megaflare marker and four towers appear\n"
    "When the towers appear: tank LB3\n"
    "The player who never had a divebomb: go to Twintania's left (anti-clockwise) / if that's a tank, the other tank uses LB3\n"
    "The rest spread, four of them taking the four towers\n"
    "Ignore the Megaflare markers"),
   img="03_grand_octet_08", scene="go8", says={"MT": ("ถ้า MT ต้องล่อ Twintania: ST กด LB3 แทน", "If the MT baits Twintania: the ST uses LB3")},
   )

st("Grand Octet", ("⑨: มาร์กเขียว Twintania: หลบไปอีกฝั่ง", "⑨: Twintania's green marker: dodge to her other side"),
   ("มาร์ก divebomb สีเขียวของ Twintania ขึ้น: คนนั้นหลบไปอีกฝั่งของ Twintania",
    "When Twintania's green divebomb marker appears, that player dodges to her other side"),
   img="03_grand_octet_09", scene="go9")

st("Grand Octet", ("⑩: ทุกอย่างลงพร้อมกัน แล้วรวมตัว", "⑩: everything resolves, then gather"),
   ("Twintania พุ่งพร้อม tower, Megaflare และ Twister ลง\nระวัง Twister แล้วรวมตัวเตรียมเข้าเฟส adds",
    "Twintania dives as the towers, the Megaflare stack and the Twisters resolve\nWatch for Twisters, then gather for the adds phase"),
   img="03_grand_octet_10", scene="go10", refs=R("octet_towers"))

st("Grand Octet", ("ไม่มี LB3 Tank: หน้าที่ตายตัว", "Without tank LB3: fixed roles"),
   ("ถ้าไม่มี LB3 Tank Grand Octet ยากขึ้นมาก: ช่วงสุดท้ายเหมือนเดิม แต่หน้าที่ตายตัว\n"
    "คนล่อ Twintania: ยังไปซ้ายของ Twintania\n"
    "คนมีมาร์ก Megaflare: stack ขวาของ Twintania\n"
    "คนไม่มีมาร์ก Megaflare: เข้า tower\n"
    "คนล่อ Twintania อาจอยู่กลุ่ม Megaflare หรือกลุ่ม tower ก็ได้ (2 ขั้นถัดไป)\n\n"
    "macro (ภาษาอังกฤษ) เขียนไว้: ไม่มี LB3 Tank ให้ stack Megaflare",
    "Without a tank LB3, Grand Octet is much harder: the last part is the same, but roles are fixed\n"
    "The Twintania player still goes to her left\n"
    "Megaflare players stack on Twintania's right\n"
    "Non-Megaflare players take towers\n"
    "The Twintania player may be in either group (next two steps)\n\n"
    "The (English) macro says: no tank LB3, stack the Megaflares"))

st("Grand Octet", ("ไม่มี LB3 ก: คนล่อ Twintania ไม่มี Megaflare", "No LB3 a: the Twintania player has no Megaflare"),
   ("อีก 3 คนที่ไม่มี Megaflare เข้า tower 3 ใน 4 ลูก เว้น tower ที่ใกล้ Twintania ที่สุดไว้\n"
    "4 คนที่มี Megaflare stack หลวมๆ ทางขวาของ Twintania\n"
    "พอมาร์กเขียวของ Twintania ขึ้น: คนล่อ Twintania ไปเข้า tower ที่ว่างไว้",
    "The other three without Megaflare take three of the four towers, leaving the one nearest Twintania empty\n"
    "The four with Megaflare loosely stack on Twintania's right\n"
    "When Twintania's divebomb marker appears, the Twintania player goes to the empty tower"),
   img="03_grand_octet_09a", scene="go9a")

st("Grand Octet", ("ไม่มี LB3 ข: คนล่อ Twintania มี Megaflare", "No LB3 b: the Twintania player has Megaflare"),
   ("4 คนที่ไม่มี Megaflare เข้า tower ครบ 4 ลูก\n"
    "อีก 3 คนที่มี Megaflare stack หลวมๆ ทางขวาของ Twintania เว้นที่ให้คนล่อ Twintania\n"
    "พอมาร์กเขียวของ Twintania ขึ้น: คนล่อ Twintania ไปรวม stack Megaflare",
    "All four without Megaflare take the four towers\n"
    "The other three Megaflare players loosely stack on Twintania's right, leaving room for the Twintania player\n"
    "When Twintania's divebomb marker appears, the Twintania player joins the Megaflare stack"),
   img="03_grand_octet_09b", scene="go9b")

st("Quickmarch Trio", ("FAQ: ทำไมหลบ Twister ตามขอบ", "FAQ: why dodge Twisters along the edge"),
   ("ภาพนี้คือถ้าหลบเข้าด้านใน: Megaflare วงใหญ่กองกลางสนาม และ Megaflare ไม่มีวงทับกันง่าย\n"
    "หลบตามขอบ: ปาร์ตี้ยังกระจาย และกลางสนามโล่งให้ Healer เข้าไป heal กลุ่ม DPS stack",
    "This picture is dodging inward: the big Megaflares pile into the centre and the untelegraphed ones overlap easily\n"
    "Dodging along the edge keeps the party spread and the centre clear for the healers to heal the DPS stack"),
   img="03_quickmarch_faq", scene="qmfaq")
