"""P4 Eyes + Saving Haurchefant (Tuufless: 04_eyes + mitigation)."""
from core import step, both, FR
import sc4 as S

P4 = ("P4 Eyes", "P4 Eyes")
P4b = ("P4 Saving Haurchefant", "P4 Saving Haurchefant")
SAYS = lambda d: dict(zip(("says", "says_en"), both(d)))
E = "Mirage Dive"
H = "Hatebound"

step(P4, H, "ภาพรวม: T/H สายแดง DPS สายน้ำเงิน", "Overview: T/H red, DPS blue",
     "Eyes มีหลายแผน: ที่นี่ใช้แผนตาม macro (T/H แดง DPS น้ำเงิน) คล้ายช่วง Fang and Claw ของ Nidhogg EX\n"
     "คนมีสายน้ำเงินโดนดาเมจ: ตาน้ำเงินได้ heal\n"
     "คนมีสายแดงโดนดาเมจ: ตาแดงโดนดาเมจไปด้วย\n"
     "คนสายต่างสี 2 คนแตะกัน: สลับสายกัน และได้ดีบัฟ Bound and Determined 3 วินาที (สลับซ้ำไม่ได้ระหว่างนั้น)\n\n"
     "mitigate ช่วยไม่ได้: ตาจะโดนดาเมจ/ได้ heal แค่ตามว่าโดน Mechanic หรือไม่\n"
     "ตาแดงจะโดนดาเมจรวม 40% ของ HP ระหว่าง Mirage Dive: ไม่ต้องตีตาแดงเกินจุดนั้นตอนช่วงลูกบอล\n"
     "ตาน้ำเงินไม่ฟื้น HP จาก auto-attack ใส่ Tank สายน้ำเงิน (ต่างจาก Nidhogg EX)",
     "There are many Eyes strats; this is the macro's (T/H red, DPS blue), echoing Fang and Claw from Nidhogg EX\n"
     "A blue-tethered player taking damage heals the blue eye\n"
     "A red-tethered player taking damage damages the red eye too\n"
     "Two players with different colours touching swap tethers and get a 3-second Bound and Determined debuff (no swapping again meanwhile)\n\n"
     "Mitigation makes no difference: it's only whether you were hit by the Mechanic\n"
     "The red eye takes 40% of its HP in total during the Mirage Dives: no need to hit it past that in the orbs part\n"
     "The blue eye doesn't heal from auto-attacks on a blue-tethered tank (unlike Nidhogg EX)",
     strict=False,
     refs=[FR("p4-eyes", "jwEHtHYDgp0", 21, "Eyes: ตาของ Nidhogg ผูกสายแดง/น้ำเงินกับผู้เล่น ดูว่าตัวเองได้สีไหน", "Eyes: Nidhogg's eyes tether players red / blue; check which colour you got")])
step(P4, H, "① รับบัฟจาก Haurchefant + Ysayle", "① Get Haurchefant's and Ysayle's buffs",
     "วิญญาณ Haurchefant กับ Ysayle โผล่: Haurchefant ผูกสายกับคนสุ่ม / Ysayle ผูกสายกับ Alphinaud\n"
     "ทุกคน stack ที่ Alphinaud (ยืนทางใต้ของกลาง) เพื่อรับบัฟ 2 อันที่ทำให้ตีตาทั้ง 2 ได้\n"
     "คนตายแล้วถูกชุบ จะเสียบัฟนี้ และตีตาไม่ได้อีก",
     "The ghosts of Haurchefant and Ysayle appear: Haurchefant tethers a random player / Ysayle tethers Alphinaud\n"
     "Everyone stacks on Alphinaud (south of centre) to get the two buffs that let you attack the eyes\n"
     "A player who dies and is raised loses these buffs and can't damage the eyes",
     strict=False, pic="04/eyes_01.jpg", scene=S.eye(1))
step(P4, H, "② กระจายไปจุดเริ่ม", "② Spread to the starting spots",
     "ได้บัฟ Soul of Friendship และ Soul of Devotion แล้ว กระจายไปจุดเริ่ม:\n"
     "ฝั่งตาน้ำเงิน (ตะวันตก) เรียงเหนือ → ใต้: D1 / MT / H1 / D2\n"
     "ฝั่งตาแดง (ตะวันออก) เรียงเหนือ → ใต้: D4 / ST / H2 / D3",
     "With Soul of Friendship and Soul of Devotion, spread to the starting spots:\n"
     "Blue-eye side (west), north → south: D1 / MT / H1 / D2\n"
     "Red-eye side (east), north → south: D4 / ST / H2 / D3",
     strict=True, pic="04/eyes_02.jpg", scene=S.eye(2))
step(P4, H, "③ สายขึ้น: สีผิดไปสลับที่ Estinien", "③ Tethers appear: wrong colour, swap at Estinien",
     "ตาร่าย Hatebound: สายน้ำเงินและแดงผูกกับคนสุ่มสีละ 4 คน\n"
     "Tank, Healer: ต้องการสายแดง\nDPS: ต้องการสายน้ำเงิน\n"
     "ได้สี (สาย/ดีบัฟ) ผิด: ไป stack ทับ Estinien กลางสนาม เพื่อสลับกับอีกคนที่สีผิดเหมือนกัน\n\n"
     "mitigate (Hatebound): MT 90s, D3 (ช่วย heal เพราะไม่มีจุดอื่นให้ใช้)",
     "The eyes cast Hatebound: blue and red tethers attach to four random players each\n"
     "Tanks, healers: want red\nDPS: want blue\n"
     "Wrong colour (tether / debuff)? Stack on Estinien in the middle to swap with someone else who also has the wrong one\n\n"
     "Mitigate (Hatebound): MT 90s, D3 (to help the healing; there's no better place)",
     strict=True, pic="04/eyes_03.jpg", scene=S.eye(3))
step(P4, H, "④ T/H แตกลูกบอลเหลือง", "④ T/H pop the yellow orbs",
     "ลูกบอลเหลืองโตครั้งที่ 2: Tank และ Healer ไปแตกลูกบอลเหลืองด้วยกัน (แชร์ดาเมจ)",
     "When the yellow orbs grow for the second time, tanks and healers pop them together (shared damage)",
     strict=True, pic="04/eyes_04.jpg", scene=S.eye(4))
step(P4, H, "⑤ DPS ไปสลับสายกับ T/H", "⑤ DPS swap tethers with T/H",
     "แตกลูกบอลเหลืองแล้ว: DPS ไปหา Tank และ Healer เพื่อสลับสาย (ให้น้ำเงิน รับแดงมา)",
     "After the yellow orbs pop, the DPS go to the tanks and healers to swap tethers (giving blue, taking red)",
     strict=True, pic="04/eyes_05.jpg", scene=S.eye(5))
step(P4, H, "⑥ DPS แตกลูกบอลน้ำเงิน", "⑥ DPS pop the blue orbs",
     "ลูกบอลน้ำเงินโตครั้งที่ 2: DPS แตกคนละลูก",
     "When the blue orbs grow for the second time, the DPS pop them, one each",
     strict=True, pic="04/eyes_06.jpg", scene=S.eye(6),
     refs=[FR("p4-orbs", "jwEHtHYDgp0", 24, "ลูกบอลเหลือง (T/H แตกด้วยกัน) และลูกบอลน้ำเงิน (DPS แตกคนละลูก)", "Yellow orbs (T/H pop them together) and blue orbs (DPS pop one each)")])
step(P4, E, "⑦ รวมฝั่งตะวันตก", "⑦ Gather west",
     "ทุกคนรวมฝั่งตะวันตกเตรียม Mirage Dive\n"
     "ตอนนี้ DPS ทุกคนต้องมีสายแดง และกระจายรอบตาตะวันตก / Tank และ Healer มีสายน้ำเงิน stack บนตา\n"
     "ตาแดงลงถึง 40% HP: ทุกคนเปลี่ยนไปตีตาน้ำเงิน",
     "Everyone gathers west for the Mirage Dives\n"
     "All DPS should now have red tethers and be spread round the west eye / tanks and healers have blue and stack on top of it\n"
     "Once the red eye is down to 40% HP, everyone switches to the blue eye",
     strict=["D1", "D2", "D3", "D4"], pic="04/eyes_07.jpg", scene=S.eye(7))
step(P4, E, "⑧ Dive คู่แรก: Healer สลับ", "⑧ First dives: healers swap",
     "clone ของ Nidhogg 2 ตัว Mirage Dive ใส่ 2 คนที่มีสายแดง (ได้ดีบัฟ Piercing Resistance Down)\n"
     "Healer สลับกับ 2 คนที่โดน: ทวนเข็มจากเหนือ H1 > H2 ตามเข็มจากเหนือ\n"
     "จำไว้ว่า DPS 2 คนไหนโดนรอบนี้: 2 คนนี้จะเป็นคนสลับหลัง dive คู่ที่ 3",
     "Two Nidhogg clones Mirage Dive two red-tethered players (giving Piercing Resistance Down)\n"
     "The healers swap with the two targets: ccw from N: H1 > H2 :cw from N\n"
     "Remember which two DPS were hit: they are the ones swapping after the third dives",
     strict=True, pic="04/eyes_08.jpg", scene=S.eye(8),
     refs=[FR("p4-mirage-dive", "jwEHtHYDgp0", 100, "Mirage Dive: clone 2 ตัวกระโดดใส่คนสายแดง 2 คน แล้วสลับสายกับคนที่ stack", "Mirage Dive: two clones dive two red-tethered players, who swap with the stack")])
step(P4, E, "⑨ Dive คู่ที่ 2: Tank สลับ", "⑨ Second dives: tanks swap",
     "dive คู่ที่ 2 ใส่คนสายแดงอีก\nTank สลับกับ 2 คนที่โดน: ทวนเข็มจากเหนือ MT > ST ตามเข็มจากเหนือ",
     "The second dives, again on red tethers\nThe tanks swap with the two targets: ccw from N: MT > ST :cw from N",
     strict=True, pic="04/eyes_09.jpg", scene=S.eye(9))
step(P4, E, "⑩ Dive คู่ที่ 3: DPS 2 คนจากรอบแรกสลับ", "⑩ Third dives: the two DPS hit first swap",
     "DPS 2 คนที่โดน dive รอบแรก (⑧) สลับกับ 2 คนที่โดนรอบนี้: ทวนเข็มจากเหนือ D1 > D2 > D3 > D4 ตามเข็มจากเหนือ\n"
     "(ภาพ: D1 กับ D3 โดนรอบแรก)",
     "The two DPS hit in ⑧ swap with this pair's targets: ccw from N: D1 > D2 > D3 > D4 :cw from N\n"
     "(Picture: D1 and D3 were hit first)",
     strict=True, pic="04/eyes_10.jpg", scene=S.eye(10))
step(P4, E, "⑪ Dive คู่สุดท้าย + Steep in Rage", "⑪ Last dives + Steep in Rage",
     "dive คู่ที่ 4 (สุดท้าย) แล้วตาทั้ง 2 เริ่มร่าย Steep in Rage\n"
     "ต้องฆ่าตาให้ได้อย่างน้อย 1 ตัวก่อน Steep in Rage ลง ไม่งั้นดาเมจที่ออกมาจะ wipe\n"
     "จากนั้นมีเวลาจนแถบ Nidhogg's Influence เต็ม 100 เพื่อฆ่าตาทั้ง 2 ไม่ทัน Estinien จะกลายเป็น Nidhogg = enrage\n\n"
     "mitigate (Steep in Rage): MT Reprisal / H2 30s",
     "The fourth (last) dives, then both eyes start casting Steep in Rage\n"
     "At least one eye must die before Steep in Rage resolves, or the damage wipes the party\n"
     "The party then has until the Nidhogg's Influence gauge reaches 100 to kill both eyes; if not, Estinien becomes Nidhogg (enrage)\n\n"
     "Mitigate (Steep in Rage): MT Reprisal / H2 30s",
     strict=True, pic="04/eyes_11.jpg", scene=S.eye(11))

HF = "Pure of Heart"
step(P4b, HF, "ย้อนเวลา: Tank LB3 ช่วย Haurchefant", "Time rewinds: Tank LB3 saves Haurchefant",
     "ฆ่าตาได้แล้ว เวลาย้อนกลับไปตอนจบ P1: ต่างตรงที่ตอนนี้ปาร์ตี้มี Tank LB3 ไว้ช่วย Haurchefant\n"
     "Pure of Heart ทำเหมือน P1 ทุกอย่าง (HMRT)\n"
     "Tank LB3 ต้องใช้หลัง Haurchefant โผล่ในสนาม แต่ก่อนเขาโดน Spear of the Fury: ทำให้เขาโดนเบาลง และทำให้ heal เขาได้\n"
     "LB3 ครอบ Brightwing 2 ครั้งแรก (ที่ Healer)\n\n"
     "mitigate:\n"
     "Brightwing ครั้งที่ 1: Tank LB3 (ใช้ H2 90s ทันทีที่ถูกดึงเข้า จะกลับมาทัน Wrath of the Heavens)\n"
     "Brightwing ครั้งที่ 2: MT ให้ short กับ D1 / ST ให้ short กับ D2 / ST Reprisal, H1 120s, H2 120s, D3\n"
     "Brightwing ครั้งที่ 3: ครอบด้วยชุดเดิม (ST Reprisal, H1 120s, H2 120s, D3)\n"
     "Brightwing ครั้งที่ 4: MT Reprisal, D4\n"
     "Pure of Heart: ครอบด้วย MT Reprisal, H1 120s, H2 120s, D4",
     "Once the eyes die, time rewinds to the end of P1; the difference is that the party now has a Tank LB3 to save Haurchefant\n"
     "Pure of Heart is done exactly as in P1 (HMRT)\n"
     "Use the Tank LB3 after Haurchefant appears in the arena but before the Spear of the Fury hits him: it cuts his damage taken and lets him be healed\n"
     "The LB3 covers the first two Brightwing hits on the healers\n\n"
     "Mitigate:\n"
     "Brightwing 1: the Tank LB3 (H2 90s used right after being pulled in is back for Wrath of the Heavens)\n"
     "Brightwing 2: MT short → D1 / ST short → D2 / ST Reprisal, H1 120s, H2 120s, D3\n"
     "Brightwing 3: covered by the same (ST Reprisal, H1 120s, H2 120s, D3)\n"
     "Brightwing 4: MT Reprisal, D4\n"
     "Pure of Heart: covered by MT Reprisal, H1 120s, H2 120s, D4",
     strict=False,
     refs=[FR("p1-pure-of-heart", "JN7sg1lOgtE", 318, "Pure of Heart ทำแบบเดียวกับ P1 (ภาพจาก P1): ลำดับ HMRT", "Pure of Heart works exactly as in P1 (picture from P1): HMRT")])
step(P4b, HF, "Spear of the Fury: ทำลายก่อน Pierce", "Spear of the Fury: destroy it before Pierce",
     "Pure of Heart ลงแล้ว Spear of the Fury เลือกเป้าได้ และร่าย Pierce: ต้องทำลาย Spear ก่อน Pierce ลง ไม่งั้น Haurchefant ตาย\n"
     "Haurchefant ตายในช่วงนี้: ไฟต์วนกลับไปที่ Thordan ใน P2\n\n"
     "ต่างจาก P1: ดาเมจเป็นจังหวะจาก Spear ไม่หยุดเร็ว (เพราะ Haurchefant ยังอยู่) ไปจนถึง Pure of Heart\n"
     "Haurchefant โดน Pure of Heart แรง: ต้องมี HP ประมาณ 65% ถึงรอด\n"
     "Benediction ใช้กับ Haurchefant ได้\n"
     "สกิลที่ใช้กับเขาได้ tooltip จะไม่จำกัดเป้า (เช่น 'a target's HP') / ใช้ไม่ได้ถ้าเขียนว่า 'self or target party member' (เช่น Haima)",
     "After Pure of Heart, the Spear of the Fury becomes targetable and casts Pierce: destroy the Spear before Pierce resolves, or Haurchefant dies\n"
     "If Haurchefant dies here, the fight loops back to Thordan in P2\n\n"
     "Unlike P1, the Spear's pulsing damage doesn't end early (Haurchefant stays alive), so it continues until Pure of Heart\n"
     "Haurchefant takes heavy damage from Pure of Heart: he needs roughly 65% HP to survive\n"
     "Benediction works on Haurchefant\n"
     "Abilities that work on him don't restrict the target in their tooltip ('a target's HP') / those saying 'self or target party member' (e.g. Haima) don't",
     strict=False,
     refs=[FR("p4-spear", "3M8dUee9b8Q", 60, "Spear of the Fury ร่าย Pierce: ทำลายให้ทันก่อน Pierce ลง", "Spear of the Fury casts Pierce: destroy it before Pierce resolves")])
