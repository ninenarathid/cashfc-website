"""P3 Nidhogg (Tuufless: 03_nidhogg + mitigation)."""
from core import step, both, FR
import sc3 as S

P3 = ("P3 Nidhogg", "P3 Nidhogg")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))

step(P3, "Final Chorus", "raid-wide แรงมาก (ยังตีบอสไม่ได้)", "A very heavy raid-wide (no target yet)",
     "P3 เปิดด้วย Final Chorus: raid-wide แรงมากอีกครั้ง\n"
     "ตอนนี้ Nidhogg ยังเลือกเป้าไม่ได้: ใช้ Reprisal / Addle กับครั้งนี้ไม่ได้\n\n"
     "mitigate: ST 90s, H2 30s, H2 90s, D3\n"
     "ถ้า H2 เป็น SGE ต้องมี mitigate เสริมอีก 1 อย่างถึงรอดแน่ (Collective Unconsciousness / Passage of Arms / Magick Barrier / Improvised Finish ฯลฯ)\n"
     "สกิลเพิ่ม heal (Physis II / Asylum / Nature's Minne / Mantra) ก็ช่วยได้",
     "P3 opens with Final Chorus, another very heavy raid-wide\n"
     "Nidhogg isn't targetable yet: Reprisal and Addle can't be used on it\n\n"
     "Mitigate: ST 90s, H2 30s, H2 90s, D3\n"
     "With a SGE as H2 it needs one extra mitigation to be sure (Collective Unconsciousness / Passage of Arms / Magick Barrier / Improvised Finish, etc.)\n"
     "Healing boosts (Physis II / Asylum / Nature's Minne / Mantra) help too",
     strict=False)

WH = "Wyrmhole (Easthogg)"
step(P3, WH, "ภาพรวม: ดีบัฟเลขกับลูกศร", "Overview: number and arrow debuffs",
     "ช่วงแรกของ Nidhogg เรียกว่า 'Wyrmhole' (คล้าย Wormhole Formation ใน TEA) แผนนี้ชื่อ 'Easthogg': กำหนดว่าดีบัฟไหนยืนตรงไหน และหันหน้าไปทางไหน\n"
     "ผู้เล่นแบ่งเป็น 3 กลุ่มตามดีบัฟเลข 1 / 2 / 3 (ลำดับที่โดน clone ของ Nidhogg กระโดดใส่)\n"
     "แต่ละกลุ่มอาจได้ดีบัฟลูกศรเพิ่ม: จะมีลูกศรแค่ 1 หรือ 2 คู่ (ภาพตัวอย่างให้ทุกกลุ่มมีลูกศร ซึ่งในเกมไม่เกิดขึ้นจริง)\n\n"
     "โดน clone กระโดดใส่แล้ว จะเกิด tower ให้อีกคนเหยียบ ตำแหน่ง tower ขึ้นกับลูกศร:\n"
     "ไม่มีลูกศร (High Jump Target): tower เกิดตรงที่ยืน\n"
     "ลูกศรขึ้น (Spineshatter Dive Target): tower เกิด 15 yalm ข้างหน้า ตามทิศที่หันตอน clone ลง\n"
     "ลูกศรลง (Elusive Jump Target): tower เกิด 15 yalm ข้างหลัง\n"
     "(15 yalm สั้นกว่าเส้นผ่านศูนย์กลางวง target ของ Nidhogg นิดหน่อย)\n\n"
     "ในภาพ: 1 / 2 / 3 = เลขดีบัฟ / ↑ = ลูกศรขึ้น / ↓ = ลูกศรลง / ไม่มีลูกศร = High Jump",
     "Nidhogg's first part is called 'Wyrmhole' (much like TEA's Wormhole Formation); this strat, 'Easthogg', sets where each debuff stands and which way to face\n"
     "Players split into three groups by their 1 / 2 / 3 debuff (the order the Nidhogg clones dive on them)\n"
     "Each group may also get arrow debuffs: only one or two pairs appear (the pictures give every group arrows, which never happens in game)\n\n"
     "When a clone dives on a player, a tower spawns soon after for someone else; where depends on the arrow:\n"
     "no arrow (High Jump Target): where the player stood\n"
     "up arrow (Spineshatter Dive Target): 15 yalms in front, by the way the player faced when the dive landed\n"
     "down arrow (Elusive Jump Target): 15 yalms behind\n"
     "(15 yalms is a little shorter than Nidhogg's target circle's diameter)\n\n"
     "In the pictures: 1 / 2 / 3 = the number debuff / ↑ = up arrow / ↓ = down arrow / no arrow = High Jump",
     strict=False,
     refs=[FR("p3-dive-icons", "JQr73hyralc", 36, "ไอคอนดีบัฟเหนือหัวผู้เล่น: เลขลำดับ (I / II / III) + ลูกศร", "The debuff icons over a player: the I / II / III number + the arrow")])
N = [
    ("① เลขขึ้น: จองตำแหน่ง", "① Numbers appear: claim spots",
     "ทุกคนจองตำแหน่งเริ่ม:\n1 และ 3: คู่ละทิศ ตะวันตก / ใต้ / ตะวันออก\n2: ตะวันตกเฉียงเหนือ 1 คน / ตะวันออกเฉียงเหนือ 1 คน\nนี่คือตำแหน่งสุดท้ายถ้ากลุ่มของเราไม่ได้ลูกศร",
     "Everyone claims a starting spot:\n1s and 3s: one pair each west / south / east\n2s: one north-west, one north-east\nThese are your spots if your group gets no arrows"),
    ("② ลูกศรขึ้น: ย้ายตามลูกศร", "② Arrows appear: move by arrow",
     "ถ้ากลุ่มของเรามีลูกศร (Elusive / Spineshatter) ลูกศรมาก่อนตำแหน่งที่จองไว้:\nลูกศรขึ้น (Spineshatter Dive Target): ตะวันตก\nไม่มีลูกศร (High Jump Target): ใต้\nลูกศรลง (Elusive Jump Target): ตะวันออก\nนี่คือตำแหน่งสุดท้ายของ Wyrmhole",
     "If your group has arrows (Elusive / Spineshatter), the arrows override the claimed spots:\nUp arrow (Spineshatter Dive Target): west\nNo arrow (High Jump Target): south\nDown arrow (Elusive Jump Target): east\nThese are the final spots for Wyrmhole"),
    ("③ รอบแรก: 1 วาง tower / ที่เหลือ stack เหนือ", "③ Loop 1: the 1s place towers / the rest stack north",
     "Nidhogg ร่าย Gnash and Lash หรือ Lash and Gnash = ลำดับท่าที่ตามมา (Lash = เข้าใน / Gnash = ออกนอก)\n"
     "ร่ายจบ clone ลงใส่คนเลข 1 ทุกคน และคนสุ่ม 1 คนหน้า Nidhogg โดน stack (Eye of the Tyrant)\n"
     "1: วาง tower (มีลูกศรให้หันหน้าไปตะวันออก!)\n2: stack เหนือ\n3: stack เหนือ\n\n"
     "mitigate (Eye of the Tyrant ครั้งที่ 1): ST Reprisal, H2 30s หรือ H2 120s (SCH ใช้ Seraph ครอบได้ทั้ง 2 ครั้ง)",
     "Nidhogg casts Gnash and Lash or Lash and Gnash, setting the order of what follows (Lash = move in / Gnash = move out)\n"
     "When it resolves, clones land on all the 1s, and a random player in front of Nidhogg is targeted by a stack (Eye of the Tyrant)\n"
     "1s: place towers (face east if you have an arrow!)\n2s: stack north\n3s: stack north\n\n"
     "Mitigate (Eye of the Tyrant 1): ST Reprisal, H2 30s or H2 120s (a SCH's Seraph can cover both)"),
    ("④ in/out ครั้งที่ 1: 3 เหยียบ tower", "④ First in/out: the 3s take towers",
     "หลัง clone ลง ส่วนแรกของ Lash and Gnash / Gnash and Lash ลง\n1: ไปทางเหนือ\n3: เหยียบ tower พร้อมหลบ in/out\n(ภาพเป็น Gnash and Lash: ช่วงแรกจึงอยู่นอก)",
     "After the clones land, the first half of Lash and Gnash / Gnash and Lash resolves\n1s: move north\n3s: take the towers while dodging the in/out\n(The picture is Gnash and Lash, so stay out first)"),
    ("⑤ in/out ครั้งที่ 2", "⑤ Second in/out",
     "ส่วนที่ 2 ของ Lash and Gnash / Gnash and Lash ลง\n1: ไปทางเหนือ\n3: เหยียบ tower พร้อมหลบ in/out\n(ภาพเป็น Gnash and Lash: รอบนี้จึงเข้าใน)",
     "The second half resolves\n1s: move north\n3s: take the towers while dodging the in/out\n(The picture is Gnash and Lash, so move in now)"),
    ("⑥ tower ชุดที่ 2: 2 วาง / 3 ล่อ Geirskogul", "⑥ Second towers: the 2s place / the 3s bait Geirskogul",
     "2: วาง tower ที่ตะวันตกเฉียงเหนือและตะวันออกเฉียงเหนือ (มีลูกศรให้หันหน้าไปตะวันออก!)\n3: ออกไปล่อ Geirskogul ข้างนอก",
     "2s: place towers north-west and north-east (face east if you have an arrow!)\n3s: bait the Geirskoguls outside"),
    ("⑦ 1 เหยียบ tower / 3 หลบ Geirskogul", "⑦ The 1s take towers / the 3s dodge Geirskogul",
     "Nidhogg เริ่มร่าย Lash and Gnash / Gnash and Lash อีกครั้ง มาพร้อม tower ชุดที่ 3\n1 (มีลูกศร): เหยียบ tower\n2: กลับเข้า stack เหนือ\n3: หลบ Geirskogul",
     "Nidhogg starts another Lash and Gnash / Gnash and Lash, which comes with the third towers\n1s (with arrows): take the towers\n2s: return to the stack north\n3s: dodge the Geirskoguls"),
    ("⑧ 1 ล่อ Geirskogul", "⑧ The 1s bait Geirskogul",
     "1: ออกไปล่อ Geirskogul ข้างนอก", "1s: bait the Geirskoguls outside"),
    ("⑨ 3 วาง tower + stack ครั้งที่ 2", "⑨ The 3s place towers + the second stack",
     "Lash and Gnash / Gnash and Lash ครั้งที่ 2 ร่ายจบ: วาง tower ชุดที่ 3 พร้อม Eye of the Tyrant อีกครั้ง\n"
     "1: ล่อ Geirskogul แล้วรีบกลับเข้า stack เหนือ\n3: วาง tower (มีลูกศรให้หันหน้าไปตะวันออก!)\n\n"
     "mitigate (Eye of the Tyrant ครั้งที่ 2): MT Reprisal, D2, H2 30s หรือ H2 120s\n(D2 ใช้ Feint ครั้งนี้แทนครั้งแรก เพราะมี 2 คนโดนดาเมจ tower เพิ่ม)",
     "The second Lash and Gnash / Gnash and Lash finishes: the third towers drop with another Eye of the Tyrant\n"
     "1s: after baiting Geirskogul, quickly join the stack north\n3s: place towers (face east if you have an arrow!)\n\n"
     "Mitigate (Eye of the Tyrant 2): MT Reprisal, D2, H2 30s or H2 120s\n(D2's Feint goes here rather than the first, as two players also take tower damage)"),
    ("⑩ in/out: 2 และ 1 (ไม่มีลูกศร) เหยียบ tower", "⑩ In/out: the 2s and the arrowless 1 take towers",
     "หลัง clone ลง ส่วนแรกของ in/out ลง\n1 (ไม่มีลูกศร): เหยียบ tower ใต้ พร้อมหลบ in/out\n2: เหยียบ tower ตะวันออก/ตะวันตก พร้อมหลบ in/out\n3: ไปทางเหนือ\n(ภาพเป็น Lash and Gnash: ช่วงแรกจึงเข้าใน)",
     "After the clones land, the first half resolves\n1 (no arrow): take the south tower while dodging the in/out\n2s: take the east/west towers while dodging the in/out\n3s: move north\n(The picture is Lash and Gnash, so move in first)"),
    ("⑪ in/out ครั้งที่ 2", "⑪ Second in/out",
     "ส่วนที่ 2 ลง\n1 (ไม่มีลูกศร): tower ใต้\n2: tower ตะวันออก/ตะวันตก\n3: ไปทางเหนือ\n(ภาพเป็น Lash and Gnash: รอบนี้จึงออกนอก)",
     "The second half resolves\n1 (no arrow): the south tower\n2s: the east/west towers\n3s: move north\n(The picture is Lash and Gnash, so move out now)"),
    ("⑫ Geirskogul ชุดที่ 3", "⑫ The third Geirskoguls",
     "ล่อ Geirskogul ชุดที่ 3\n1 (ไม่มีลูกศร): ล่อ Geirskogul ใต้ข้างนอก\n2: ล่อ Geirskogul ตะวันออก/ตะวันตกข้างนอก",
     "Bait the third Geirskoguls\n1 (no arrow): the south one, outside\n2s: the east/west ones, outside"),
    ("⑬ หลบ Geirskogul + MT หันบอส", "⑬ Dodge Geirskogul + the MT turns the boss",
     "Nidhogg กลับมา auto-attack MT: ถ้า MT อยู่ใน stack ให้หัน Nidhogg ออกจากปาร์ตี้\n1 (ไม่มีลูกศร): หลบ Geirskogul\n2: หลบ Geirskogul",
     "Nidhogg resumes auto-attacking the MT: if the MT was in the stack, point Nidhogg away from the party\n1 (no arrow): dodge Geirskogul\n2s: dodge Geirskogul"),
    ("⑭ Drachenlance", "⑭ Drachenlance",
     "auto-attack 2 ครั้ง แล้ว Nidhogg หันไปหาคนสุ่ม 1 คนแล้วร่าย Drachenlance (กรวย): หลบหรือออกนอกระยะ แล้วเตรียม 4x Towers",
     "After two auto-attacks, Nidhogg turns to a random player and casts Drachenlance (cone): dodge or outrange it, and get ready for 4x Towers"),
]
REFS = {2: [FR("p3-dives", "JQr73hyralc", 40, "clone ของ Nidhogg กระโดดใส่คนเลข 1 + stack Eye of the Tyrant ทางเหนือ", "Nidhogg's clones dive on the 1s + the Eye of the Tyrant stack north")],
        3: [FR("p3-gnash-lash", "JQr73hyralc", 45, "Gnash and Lash / Lash and Gnash: in / out ตามลำดับชื่อร่าย", "Gnash and Lash / Lash and Gnash: in / out in the order of the name")],
        5: [FR("p3-geirskogul", "JQr73hyralc", 72, "Geirskogul: clone ตรงที่เคยเป็น tower ยิงเส้นตรงใส่คนใกล้สุด", "Geirskogul: a clone where a tower was fires a line at the nearest player")],
        13: [FR("p3-drachenlance", "JQr73hyralc", 100, "Drachenlance: Nidhogg หันไปหาคนสุ่มแล้วยิงกรวย", "Drachenlance: Nidhogg turns to a random player and fires a cone")]}
for i, (n, ne, t, te) in enumerate(N):
    step(P3, WH, n, ne, t, te, strict=False, pic=f"03/nidhogg_{i + 1:02d}.jpg", scene=S.nid(i + 1), refs=REFS.get(i),
         **(SAYS({"MT": ("หัน Nidhogg ออกจากปาร์ตี้", "Point Nidhogg away from the party")}) if i == 12 else {}))

T4 = "4x Towers"
step(P3, T4, "จุดเริ่ม: ยืนเป็นคู่ที่ tower", "Starting spots: pairs at the towers",
     "tower 4 อันเกิดที่ marker เฉียง (1–4) แต่ละอันต้องการ 1–4 คน (สุ่ม) รวม 8 คน\nง่ายสุดคือยืนรอเป็นคู่ที่ tower:\n"
     "MT·D3: ตะวันตกเฉียงเหนือ (4)\nST·D4: ตะวันออกเฉียงเหนือ (1)\nH1·D1: ตะวันตกเฉียงใต้ (3)\nH2·D2: ตะวันออกเฉียงใต้ (2)\n\n"
     "Healer และ Range อยู่ tower ของตัวเองเสมอ (ล่อ Geirskogul)\nTank และ Melee ปรับตาม (ขั้นถัดไป)",
     "Four towers spawn on the intercardinal markers (1-4); each needs 1-4 players (random), 8 in total\nThe easiest way is to wait in pairs at the towers:\n"
     "MT·D3: north-west (4)\nST·D4: north-east (1)\nH1·D1: south-west (3)\nH2·D2: south-east (2)\n\n"
     "Healers and ranged always stay in their tower (they bait Geirskogul)\nTanks and melee adjust (next steps)",
     strict=True, pic="03/4x_towers_example_starting_positions.jpg", scene=S.t4(0),
     refs=[FR("p3-4x-towers", "dbN5wpqMuLQ", 20, "4x Towers: จำนวนจุดบน tower = จำนวนคนที่ต้องเหยียบ", "4x Towers: the pips on each tower = how many players it needs")])
step(P3, T4, "กฎ Tank / Melee + ตัวอย่าง 1", "Tank / melee rule + example 1",
     "Tank / Melee:\ntower ของเราต้องการ 2 คนขึ้นไป: อยู่ที่เดิม\nไม่งั้น: ย้ายไป tower แรกที่ต้องการมากกว่า 2 คน ตามลำดับ ตามเข็ม > ทวนเข็ม > ฝั่งตรงข้าม\nทำถูกต้องจะมีคนย้ายไม่เกิน 2 คน\n\n"
     "ตัวอย่าง 1:\nMT: tower ตะวันตกเฉียงเหนือ 1 จุด → ย้าย / tower ตามเข็มมากกว่า 2 → ไปตามเข็ม\nST: tower ตะวันออกเฉียงเหนือ 2 จุดขึ้นไป → อยู่\nD1: tower ตะวันตกเฉียงใต้ 2 จุดขึ้นไป → อยู่\nD2: tower ตะวันออกเฉียงใต้ 1 จุด → ย้าย / tower ตามเข็มมากกว่า 2 → ไปตามเข็ม",
     "Tanks / melee:\nyour tower needs 2 or more: stay\notherwise: move to the first tower needing more than 2, by cw > ccw > across\nDone right, at most two players move\n\n"
     "Example 1:\nMT: the NW tower has 1 pip → move / cw has more than 2 → go cw\nST: the NE tower has 2 or more → stay\nD1: the SW tower has 2 or more → stay\nD2: the SE tower has 1 pip → move / cw has more than 2 → go cw",
     strict=True, pic="03/4x_towers_example_01.jpg", scene=S.t4(1))
step(P3, T4, "ตัวอย่าง 2", "Example 2",
     "MT: tower ตะวันตกเฉียงเหนือ 1 จุด → ย้าย / ตามเข็มมากกว่า 2 → ไปตามเข็ม\nST: 2 จุดขึ้นไป → อยู่\nD1: 2 จุดขึ้นไป → อยู่\nD2: tower ตะวันออกเฉียงใต้ 1 จุด → ย้าย / ตามเข็มมี 2 → ไม่ไป / ทวนเข็มมากกว่า 2 → ไปทวนเข็ม",
     "MT: the NW tower has 1 pip → move / cw has more than 2 → go cw\nST: 2 or more → stay\nD1: 2 or more → stay\nD2: the SE tower has 1 pip → move / cw has 2 → not cw / ccw has more than 2 → go ccw",
     strict=True, pic="03/4x_towers_example_02.jpg", scene=S.t4(2))
step(P3, T4, "ตัวอย่าง 3", "Example 3",
     "MT: tower ของตัวเอง 2 จุดขึ้นไป → อยู่\nST: 2 จุดขึ้นไป → อยู่\nD1: 2 จุดขึ้นไป → อยู่\nD2: tower ตะวันออกเฉียงใต้ 1 จุด → ย้าย / ตามเข็มมี 2 → ไม่ไป / ทวนเข็มมี 2 → ไม่ไป / ไปฝั่งตรงข้ามแนวทแยง",
     "MT: own tower has 2 or more → stay\nST: 2 or more → stay\nD1: 2 or more → stay\nD2: the SE tower has 1 pip → move / cw has 2 → no / ccw has 2 → no / go diagonally across",
     strict=True, pic="03/4x_towers_example_03.jpg", scene=S.t4(3))
ST_ = "Soul Tether"
step(P3, ST_, "① clone โผล่: สาย + Geirskogul", "① The clones appear: a tether + Geirskoguls",
     "clone ของ Nidhogg โผล่ตรงที่ tower ลง (เหมือนเดิม):\nclone 1 ตัวผูกสายกับคนสุ่ม (ไม่ใช่ Tank)\nอีก 3 ตัวยิง Geirskogul ใส่คนใกล้สุด (Healer และ Range ล่อ)\n\nมีสายไม่ได้แปลว่าไม่ได้ล่อ Geirskogul: สายอาจมาจาก clone ตัวอื่น\n(ภาพ: Nidhogg ผูกสายกับ D2 / clone ตะวันตกเฉียงเหนือผูกสายกับ D4)",
     "As before, Nidhogg clones appear where the towers resolved:\none clone tethers a random non-tank\nthe other three fire Geirskogul at the closest player (baited by the healers and ranged)\n\nHaving a tether doesn't mean you aren't baiting Geirskogul: the tether may come from another clone\n(Picture: Nidhogg tethers D2 / the north-west clone tethers D4)",
     strict=False, pic="03/soul_tethers_01.jpg", scene=S.soul(1))
step(P3, ST_, "② Tank รับสายใต้บอส + invuln", "② Tanks take the tethers under the boss + invuln",
     "Tank รับสาย 2 เส้น stack ใต้ Nidhogg แล้วใช้ invuln\nMT: รับสายจาก Nidhogg\nST: รับสายจาก clone\nทุกคนหลบ Geirskogul\n\n"
     "ถ้าโดน clone ของตัวเองผูกสาย ST จะหาและรับสายยาก: เราไม่ได้ล่อ Geirskogul อยู่แล้ว ให้เดินออกข้างยืดสายให้ ST เห็นง่าย\n\n"
     "จากนั้น Nidhogg auto-attack MT 5 ครั้ง แล้ว Drachenlance ครั้งสุดท้าย (ชี้ใต้เสมอ) แล้วร่าย Revenge of the Horde (enrage)",
     "The tanks take the two tethers, stack under Nidhogg and invuln\nMT: the tether from Nidhogg\nST: the tether from the clone\nEveryone dodges the Geirskoguls\n\n"
     "Tethered by your own clone? The ST will struggle to find and take it: you aren't baiting Geirskogul, so step to the side to stretch it for them\n\n"
     "Then Nidhogg auto-attacks the MT five times, a final Drachenlance (always pointing south), and casts Revenge of the Horde (enrage)",
     strict=["MT", "ST"], pic="03/soul_tethers_02.jpg", scene=S.soul(2),
     **SAYS({"MT": ("รับสายจาก Nidhogg ใต้บอส + invuln", "Take Nidhogg's tether under the boss + invuln"),
             "ST": ("รับสายจาก clone ใต้บอส + invuln", "Take the clone's tether under the boss + invuln")}),
     refs=[FR("p3-soul-tethers", "dbN5wpqMuLQ", 60, "Soul Tether: Tank 2 คนรับสายใต้ Nidhogg แล้วใช้ invuln", "Soul Tether: both tanks take the tethers under Nidhogg and invuln")])
