"""Setup and P1 Fatebreaker steps (Tuufless's Mana PF pages: overview, 01_fatebreaker, mitigation)."""
from core import step, TU, TU0, FR
import p1 as S
from base import board, text, ring, pol, C

P0 = ("เตรียมตัว", "Setup")
P1 = ("P1 Fatebreaker", "P1 Fatebreaker")
WM = {"A": [50, 26], "B": [74, 50], "C": [50, 74], "D": [26, 50],
      "1": [66.97, 33.03], "2": [66.97, 66.97], "3": [33.03, 66.97], "4": [33.03, 33.03]}

# ================================================================== setup
step(P0, "Waymarks", "Marker 8 ทิศ", "The 8 waymarks",
     "วาง marker ตามที่ Tuufless ให้ไว้:\nA เหนือ\nB ตะวันออก\nC ใต้\nD ตะวันตก\n1 ตะวันออกเฉียงเหนือ\n2 ตะวันออกเฉียงใต้\n3 ตะวันตกเฉียงใต้\n4 ตะวันตกเฉียงเหนือ\n\n"
     "ทุกอันห่างจากกลางสนาม 10 yalm (ครึ่งทางไปขอบ)\n"
     "สังเกต: เลข 1–4 เริ่มที่ตะวันออกเฉียงเหนือแล้ววนตามเข็ม\n\n"
     "ภาพแผนในคู่มือนี้วาดตามภาพของ Tuufless ซึ่งไม่ได้วาด marker ไว้: ใช้ทิศเหนือของสนามเป็นหลัก",
     "Waymarks as Tuufless gives them:\nA north\nB east\nC south\nD west\n1 north-east\n2 south-east\n3 south-west\n4 north-west\n\n"
     "All of them 10 yalms from the centre (halfway to the edge)\n"
     "Note: 1–4 start north-east and go clockwise\n\n"
     "This guide's pictures follow Tuufless's diagrams, which draw no waymarks: read them by the arena's north",
     strict=False, pic=TU("markers.jpg"),
     scene=board(waymarks=WM, markSize=7.5, shapes=[ring(C, 24, "#ffffff", 0.3, 0.5)]))

step(P0, "Macros", "macro ติดมาร์กให้ตัวเอง", "Self-marking macros",
     "แผนนี้ใช้มาร์กเหนือหัว (marker) บอกตำแหน่ง: ทุกคนต้องมี macro ติดมาร์กให้ตัวเอง (อยู่ในช่อง macro ของคู่มือนี้)\n\n"
     "ทุกคนต้องมี: macro มาร์ก Attack\n"
     "ใช้ใน P4 Crystallize Time (แบ่งว่าใครเก็บแอ่งไหน) และใช้ให้ DPS ที่ได้ Fire สั้นใน P3 Ultimate Relativity\n\n"
     "Tank กับ Healer ต้องมีเพิ่ม: macro มาร์ก Bind\n"
     "ใช้ให้ Tank/Healer ที่ได้ Fire ยาวใน P3 Ultimate Relativity\n\n"
     "macro อื่นในช่อง macro (แยกตาม debuff ของ Ultimate Relativity) ใช้แทนได้ถ้าอยากมี macro ครบทุกแบบ",
     "Overhead markers assign positions in this strat: everyone needs macros that mark themselves (in this guide's macro box)\n\n"
     "Everyone needs: the Attack marker macro\n"
     "Used for the puddles in P4 Crystallize Time, and for the DPS with short Fire in P3 Ultimate Relativity\n\n"
     "Tanks and healers also need: the Bind marker macro\n"
     "Used for the tank/healer with long Fire in P3 Ultimate Relativity\n\n"
     "The other macros in the box (one per Ultimate Relativity debuff) can be used instead, for a macro for every case",
     strict=False)

step(P0, "Damage Down", "Damage Down 2 แบบ", "Two kinds of Damage Down",
     "ไฟต์นี้มี debuff 2 แบบที่ทำให้ดาเมจที่เราตีออกไปหายไป 90% ทั้งคู่\n"
     "Damage Down: โดนท่าที่หลบได้\n"
     "Mark of Mortality: รับ stack โดยมีคนในวงไม่ครบตามที่ต้องการ\n\n"
     "เป็นคนละ debuff กัน จึงซ้อนกันได้: โดนทั้งคู่ = ดาเมจหายไป 99%",
     "This fight has two damage-down debuffs, each cutting your damage by 90%\n"
     "Damage Down: hit by an avoidable attack\n"
     "Mark of Mortality: a stack taken with fewer players than it needs\n\n"
     "They are separate debuffs and stack: both together = 99% less damage",
     strict=False)

step(P0, "Mitigation plan", "ตัวย่อในแผน mitigate", "The mitigation plan's shorthand",
     "แผน mitigate ในคู่มือนี้มาจากภาคผนวกของ Tuufless: เป็นโครงพื้นฐาน ไม่ใช่ทุกสกิล คือสิ่งที่คนในปาร์ตี้มักมองหา\n\n"
     "Tank 40%: Damnation / Guardian / Shadowed Vigil / Great Nebula\n"
     "Tank 3rd: Thrill of Battle / Bulwark / Oblation / Camouflage\n"
     "Tank 90s: Shake It Off / Dark Missionary / Heart of Light / Divine Veil\n"
     "H1 120s: Temperance หรือ Divine Grace / Neutral Sect หรือ Sunsign\n"
     "H1 180s: Liturgy of the Bell / Macrocosmos\n"
     "H2 30s: Sacred Soil / Kerachole\n"
     "H2 90s: Deployment Tactics / Zoe\n"
     "H2 120s: Expedient / Holos\n"
     "H2 180s: Seraphism / Philosophia\n"
     "D1–D4: mitigate ของ DPS คนนั้น\n\n"
     "HP: Tank 225k / DPS สาย physical 157k / สายเวท 142k\n"
     "barrier พื้นฐาน (Concitation, Eukrasian Prognosis II) กันได้ 20k",
     "The mitigation lines in this guide come from Tuufless's appendix: a bare-bones framework, not every cooldown — what the party looks for\n\n"
     "Tank 40%: Damnation / Guardian / Shadowed Vigil / Great Nebula\n"
     "Tank 3rd: Thrill of Battle / Bulwark / Oblation / Camouflage\n"
     "Tank 90s: Shake It Off / Dark Missionary / Heart of Light / Divine Veil\n"
     "H1 120s: Temperance or Divine Grace / Neutral Sect or Sunsign\n"
     "H1 180s: Liturgy of the Bell / Macrocosmos\n"
     "H2 30s: Sacred Soil / Kerachole\n"
     "H2 90s: Deployment Tactics / Zoe\n"
     "H2 120s: Expedient / Holos\n"
     "H2 180s: Seraphism / Philosophia\n"
     "D1–D4: that DPS's own mitigation\n\n"
     "HP: tanks 225k / physical DPS 157k / casters 142k\n"
     "Basic shields (Concitation, Eukrasian Prognosis II) absorb 20k",
     strict=False)

# ================================================================== P1
CB = "Cyclonic Break"
CB_SAYS = {}
step(P1, CB, "จุด spread รอบบอส", "Spread spots around the boss",
     "บอสเปิดไฟต์ด้วย Cyclonic Break (จะมาอีกครั้งกลาง Utopian Sky)\n"
     "ยืนจุด spread รอบบอสตามภาพ: MT เหนือ / ST ใต้ / H1 ตะวันตก / H2 ตะวันออก / D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / D1 ตะวันตกเฉียงใต้ / D2 ตะวันออกเฉียงใต้\n\n"
     "บอสจะมีมังกรสีแดงหรือสีน้ำเงินวนรอบตัว: จำสีไว้ เพราะบอกว่าขั้นต่อไปต้อง spread หรือ stack คู่",
     "The boss opens with Cyclonic Break (it comes back in the middle of Utopian Sky)\n"
     "Take the spread spots around the boss: MT north / ST south / H1 west / H2 east / D3 north-west / D4 north-east / D1 south-west / D2 south-east\n\n"
     "A red or blue dragon swirls around the boss: remember the colour — it says whether the next part is a spread or pair stacks",
     strict=True, pic=TU("01/cyclonic_break_01.jpg"), scene=S.cb01())
step(P1, CB, "cleave แรก", "The first cleaves",
     "บอสฟัน cleave ไปตรงที่แต่ละคนยืนอยู่",
     "The boss cleaves where each player is standing",
     strict=True, pic=TU("01/cyclonic_break_02.jpg"), scene=S.cb02())
step(P1, CB, "cleave ที่ 2: มังกรสีน้ำเงิน = spread", "Second cleaves: blue dragon = spread",
     "บอสฟันซ้ำตรงจุดที่ทุกคนเพิ่งยืน: หลบออกจากจุดเดิม พร้อมกับรับ spread (ถ้ามังกรสีน้ำเงิน)\n\n"
     "ทุกคนหมุนตามเข็ม\n"
     "H1 / H2 / ST / D3 / D4 ถอยออกไปทางขอบอีกนิด กัน AoE ทับกัน",
     "The boss cleaves again where everyone just stood: dodge off it while resolving the spread (blue dragon)\n\n"
     "Everybody rotates clockwise\n"
     "H1 / H2 / ST / D3 / D4 pull back towards the edge so the AoEs don't clip",
     strict=True, pic=TU("01/cyclonic_break_03a.jpg"), scene=S.cb03a())
step(P1, CB, "cleave ที่ 2: มังกรสีแดง = stack คู่", "Second cleaves: red dragon = pair stacks",
     "ถ้ามังกรสีแดง: หลบ cleave ไปพร้อมกับรับ stack คู่\n\n"
     "Tank กับ Healer หมุนทวนเข็ม\n"
     "DPS หมุนตามเข็ม\n\n"
     "คู่ตามภาพ: MT·D3 / H2·D4 / ST·D2 / H1·D1",
     "Red dragon: dodge the cleaves while resolving pair stacks\n\n"
     "Tanks and healers rotate anti-clockwise\n"
     "DPS rotate clockwise\n\n"
     "Pairs as drawn: MT·D3 / H2·D4 / ST·D2 / H1·D1",
     strict=True, pic=TU("01/cyclonic_break_03b.jpg"), scene=S.cb03b())
step(P1, CB, "cleave ที่ 3", "Third cleaves",
     "cleave แต่ละชุดจะลงตรงที่ทุกคนยืนตอน cleave ชุดก่อน\n"
     "จึงแค่สลับกลับไปกลับมาระหว่าง 2 จุด เพื่อหลบ cleave 2 ชุดสุดท้าย (ภาพ: กลับมาจุด spread เดิม)",
     "Each cleave lands where everyone stood for the one before\n"
     "So just alternate between the two spots to dodge the last two sets (picture: back on the original spread spots)",
     strict=True, pic=TU("01/cyclonic_break_04.jpg"), scene=S.cb04())
step(P1, CB, "cleave ที่ 4 + Powder Mark Trail", "Fourth cleaves + Powder Mark Trail",
     "cleave ชุดที่ 4: บอสเริ่มใช้ Powder Mark Trail ใส่ MT\n"
     "เป็นท่าแรงใส่ Tank คนเดียว ให้ debuff Physical Vulnerability Up และ debuff Powder Mark Trail\n"
     "ST: tank swap ดึง aggro บอสมา\n\n"
     "Powder Mark Trail: พอ debuff หมดเวลา (หรือคนนั้นตาย) จะระเบิด AoE ใหญ่ที่ตัวเขาและคนที่อยู่ใกล้ที่สุด\n\n"
     "Mitigate: MT Reprisal / D1 / D3 / D4\n"
     "MT: 40% + Rampart + short (กด Rampart ตอนท้ายแถบร่าย ให้คลุมถึง Burn Mark ด้วย)",
     "On the fourth cleave the boss starts Powder Mark Trail on the MT\n"
     "A single-target tank buster that leaves Physical Vulnerability Up and a Powder Mark Trail debuff\n"
     "ST: tank swap and take the boss\n\n"
     "Powder Mark Trail: when the debuff runs out (or the player dies), a large AoE goes off on that player and the closest one\n\n"
     "Mitigate: MT Reprisal / D1 / D3 / D4\n"
     "MT: 40% + Rampart + short (Rampart late in the cast, so it lasts to Burn Mark)",
     strict=True, pic=TU("01/cyclonic_break_05.jpg"), scene=S.cb05())

US = "Utopian Sky"
step(P1, US, "จุด spread แบบ Utopian Sky", "Utopian Sky spread spots",
     "บอสร่าย Utopian Sky และเรืองแสงสีแดงหรือสีน้ำเงิน: จำสีไว้\n"
     "ยืนจุด spread ที่ขอบสนามตามภาพ: ST กับ D4 สลับที่กับตอน Cyclonic Break (ST ตะวันออกเฉียงเหนือ / D4 ใต้)\n\n"
     "มีร่างแยก 8 ตัวรอบสนาม (ทิศหลักและทิศเฉียง) แต่จะมองเห็นเฉพาะคนที่อยู่ใกล้\n"
     "D3 ยืนห่าง MT ออกมา แต่ยังใกล้ทางตะวันตกเฉียงเหนือพอให้เห็นร่างแยกของตัวเอง",
     "The boss casts Utopian Sky and glows red or blue: remember the colour\n"
     "Take the spread spots at the edge: ST and D4 have swapped from Cyclonic Break (ST north-east / D4 south)\n\n"
     "Eight clones stand around the arena (cardinals and intercardinals), but only players near one can see it\n"
     "D3 stands away from the MT, but close enough to the north-west to see their clone",
     strict=True, pic=TU("01/utopian_sky_01.jpg"), scene=S.us01())
step(P1, US, "Burn Mark + ร่างแยกยกดาบ", "Burn Mark + the clones raise their blades",
     "Powder Mark Trail ของ MT ระเบิด: AoE ใหญ่แรงระดับท่า Tank ใส่ MT และคนที่ใกล้ที่สุด (ต้องเป็น ST)\n"
     "พร้อมกันนั้นร่างแยก 3 ตัวยก gunblade (ภาพ: วงสีแดง) จะยิง AoE เป็นแนวตรงผ่านกลางสนาม เหลือ 2 ช่องฝั่งตรงข้ามกันที่ปลอดภัย\n\n"
     "Mitigate Burn Mark:\n"
     "MT: Rampart + 3rd + short ที่ ST ให้\n"
     "ST: Rampart + 3rd + 40%",
     "The MT's Powder Mark Trail goes off: large tank-buster AoEs on the MT and the closest player (who should be the ST)\n"
     "At the same time three clones raise their gunblades (red in the picture) to fire a line AoE through the middle, leaving two opposite sectors safe\n\n"
     "Mitigate Burn Mark:\n"
     "MT: Rampart + 3rd + the ST's short\n"
     "ST: Rampart + 3rd + 40%",
     strict=True, pic=TU("01/utopian_sky_02.jpg"), scene=S.us02(),
     says={"ST": "ยืนใกล้ MT ที่สุด รับ Burn Mark คู่กับ MT"}, says_en={"ST": "Be the closest to the MT; take Burn Mark with them"})
step(P1, US, "ร่างแยกของเรายกดาบ: เดินเข้ากลาง", "Your clone raised its blade: walk in",
     "มีแค่คนที่อยู่ข้างร่างแยกที่เห็นว่าร่างแยกยก gunblade หรือไม่: ทั้งปาร์ตี้ต้องช่วยกันหาว่าช่องไหนปลอดภัย\n\n"
     "Rule 1: ร่างแยกของเรายก gunblade → เดินเข้าหากลางสนาม\n"
     "ภาพตัวอย่าง: ร่างแยกข้าง ST / H1 / D4 ยกดาบ\n\n"
     "ช่องของเราปลอดภัย: ยืนนิ่ง ห้ามกระโดด (ทุกคนมองการขยับเป็นสัญญาณว่า 'ช่องนี้ไม่ปลอดภัย')",
     "Only the player beside a clone can see whether it raised its gunblade: the party works out the safe sectors together\n\n"
     "Rule 1: your clone raised its gunblade → walk towards the centre\n"
     "Picture: the clones by ST / H1 / D4 raised theirs\n\n"
     "If your sector is safe: stand still, don't jump (everyone reads movement as 'this sector is unsafe')",
     strict=True, pic=TU("01/utopian_sky_03.jpg"), scene=S.us03())
step(P1, US, "คนฝั่งตรงข้ามเดินเข้า: เดินเข้าด้วย", "The player opposite walked in: walk in too",
     "คนที่เดินเข้ามาคือคนที่อยู่ในแนวยิงของร่างแยกที่ยกดาบ ดังนั้นฝั่งตรงข้ามเขาก็โดนด้วย\n\n"
     "Rule 2: คนฝั่งตรงข้ามเราเดินเข้ากลาง → เราเดินเข้ากลางด้วย\n\n"
     "จะมีคนอยู่กลางสนาม 6 คน: 2 คนที่ยังอยู่ขอบคือช่องปลอดภัย (อยู่ตรงข้ามกันเสมอ)\n"
     "ภาพตัวอย่าง: ST / H1 / D4 เดินเข้า → MT / D1 / H2 ที่อยู่ตรงข้ามเดินเข้าตาม → ช่องของ D2 กับ D3 ปลอดภัย",
     "Those who walked in are in a raised clone's line of fire, so the sector opposite each of them is hit too\n\n"
     "Rule 2: the player opposite you walked in → walk in too\n\n"
     "Six players end up in the middle: the two still at the edge mark the safe sectors (always opposite each other)\n"
     "Picture: ST / H1 / D4 walked in → MT / D1 / H2 opposite them follow → D2's and D3's sectors are safe",
     strict=True, pic=TU("01/utopian_sky_04.jpg"), scene=S.us04())
step(P1, US, "ไปช่องปลอดภัย: spread หรือ stack", "To the safe sectors: spread or stack",
     "ไปช่องปลอดภัยของกลุ่มตัวเอง\n"
     "กลุ่ม MT H1 D1 D3: ช่องปลอดภัยที่อยู่ระหว่างทิศเหนือ วนทวนเข็มไปถึงตะวันตกเฉียงใต้\n"
     "กลุ่ม ST H2 D2 D4: ช่องปลอดภัยที่อยู่ระหว่างทิศใต้ วนทวนเข็มไปถึงตะวันออกเฉียงเหนือ\n\n"
     "บอสเรืองสีน้ำเงินตอนต้น: spread ตามภาพ\n"
     "บอสเรืองสีแดง: stack รวมกันในกลุ่ม\n\n"
     "ตอน spread: DPS ยืนห่างจาก Tank ไป 3.5 ขีด (ขีดบอกระยะที่ขอบสนาม)",
     "Go to your group's safe sector\n"
     "MT H1 D1 D3: the safe sector from north round to south-west\n"
     "ST H2 D2 D4: the safe sector from south round to north-east\n\n"
     "Boss glowed blue earlier: spread as drawn\n"
     "Boss glowed red: stack together in your group\n\n"
     "When spreading: DPS stand 3.5 tick marks away from the tank (the tick marks on the arena's edge)",
     strict=True, pic=TU("01/utopian_sky_05.jpg"), scene=S.us05())
step(P1, US, "Cyclonic Break รอบ 2 + ร่างแยกทางเหนือ", "Cyclonic Break again + the north clone",
     "บอสกลับมาที่กลางสนาม (ตีไม่ได้) เรืองสีน้ำเงินหรือแดง แล้วใช้ Cyclonic Break อีกครั้ง\n"
     "กลับไปยืนจุด spread ของ Cyclonic Break เดิม แล้วเล่นเหมือนตอนเปิดไฟต์\n\n"
     "ตอน cleave ชุดแรกลง จะมีร่างแยกโผล่ทางเหนือ เรืองสีแดงหรือน้ำเงิน: จำสีนี้ไว้",
     "The boss reappears in the centre (untargetable), glows blue or red, and does Cyclonic Break again\n"
     "Go back to the original Cyclonic Break spread spots and resolve it as at the start\n\n"
     "As the first cleaves go off, a clone appears north and glows red or blue: remember this colour",
     strict=True, pic=TU("01/utopian_sky_06.jpg"), scene=S.us06())
step(P1, US, "วงกลมแดง/น้ำเงิน + Burnt Strike สายฟ้า + Prey", "Red and blue circles + lightning Burnt Strike + Prey",
     "มีวงกลมสีแดงและสีน้ำเงินขึ้นรอบสนาม ทุกวงจะระเบิด แต่วงสีเดียวกับร่างแยกทางเหนือจะใหญ่กว่า\n"
     "ร่างแยกโผล่มาใช้ Burnt Strike (สายฟ้า) แนวตะวันออก → ตะวันตก\n\n"
     "ผู้เล่นสุ่ม 2 คนได้มาร์ก Prey กับ debuff Fated Burn Mark: ถ้าคนนี้ตาย ทั้งปาร์ตี้ wipe",
     "Red and blue circles appear around the arena; all of them go off, but the ones matching the north clone's colour are larger\n"
     "A clone appears and does Burnt Strike (lightning) from east to west\n\n"
     "Two random players get a Prey marker and Fated Burn Mark: if that player dies, the party wipes",
     strict=False, pic=TU("01/utopian_sky_07.jpg"), scene=S.us07())
step(P1, US, "แบ่ง 4:4 เหนือ/ใต้ + Burnt Strike ไฟ", "4:4 north/south + fire Burnt Strike",
     "แบ่ง 2 กลุ่ม กลุ่มละ 4 คน ให้มี Prey กลุ่มละ 1 คน\n"
     "เหนือ: Tank + Healer\n"
     "ใต้: DPS\n\n"
     "Prey สุ่ม จึงอาจต้องสลับ:\n"
     "กลุ่มเรามี Prey 2 คน: ใช้ลำดับ เหนือ: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :ใต้\n"
     "กลุ่มเราไม่มี Prey: MT / D1 ย้ายไปอีกกลุ่ม\n\n"
     "stack รวมในกลุ่ม รอร่างแยกใช้ Burnt Strike ครั้งที่ 2 (ไฟ) แนวเหนือ → ใต้\n"
     "หลังโดนครั้งแรก ให้เดินเข้าไปให้ knockback กระเด็นไปทางขอบ (knockback นี้กันด้วย Arm's Length ไม่ได้)",
     "Split into two groups of four, one Prey in each\n"
     "North: tanks + healers\n"
     "South: DPS\n\n"
     "The Prey are random, so you may need to adjust:\n"
     "Your group has 2 Prey: use the priority North: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :South\n"
     "Your group has no Prey: MT / D1 swaps groups\n\n"
     "Stack in your north/south group and wait for the second Burnt Strike (fire) from north to south\n"
     "Move in after the first hit to get knocked back towards the edge (anti-knockback does not work on it)",
     strict=["MT", "H1", "D1", "D2"], pic=TU("01/utopian_sky_08.jpg"), scene=S.us08())
step(P1, US, "วงกลมระเบิด", "The circles go off",
     "วงกลมทั้งหมดระเบิด\n"
     "วงสีเดียวกับร่างแยกทางเหนือ (ภาพ: สีแดง) ระเบิดใหญ่กว่า",
     "All the circles go off\n"
     "The ones matching the north clone's colour (red in the picture) are larger",
     strict=False, pic=TU("01/utopian_sky_09.jpg"), scene=S.us09())
step(P1, US, "stack ของ Prey", "The Prey stacks",
     "สุดท้าย Prey ทั้ง 2 คนระเบิด stack ใส่กลุ่มของตัวเอง",
     "Finally the two Prey targets resolve their stacks",
     strict=False, pic=TU("01/utopian_sky_10.jpg"), scene=S.us10())
step(P1, "Burnished Glory", "raid-wide + DoT", "Raid-wide + DoT",
     "บอสกลับเข้าสนามพร้อม Burnished Glory: raid-wide แรง และติด DoT ทั้งปาร์ตี้\n"
     "จากนั้นไม่นานบอสเริ่มชุดท่าที่ 2\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / H2 30s / D2\n"
     "Healer 120s กดได้ทันทีหลัง knockback แล้วจะคลุมถึง Burnished Glory",
     "The boss returns with Burnished Glory: a heavy raid-wide that also leaves a DoT on the party\n"
     "Shortly after, it starts the second combo\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / H2 30s / D2\n"
     "The healers' 120s can go out right after the knockback and still last to Burnished Glory",
     strict=False)

FOF = "Fall of Faith"
step(P1, FOF, "เข้าแถว ตะวันตก → ตะวันออก", "Line up west to east",
     "เล่นแบบเข้าแถวตะวันตก → ตะวันออก เพื่อจัดลำดับ\n"
     "ยืนเรียงทางใต้ของบอส: ตะวันตก: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :ตะวันออก",
     "Played as a west-to-east conga line to sort out the order\n"
     "Line up on the boss's south side: West: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :East",
     strict=True, pic=TU("01/fall_of_faith_01.jpg"), scene=S.fof01())
step(P1, FOF, "สายที่ 1: ไปชิดฝั่งตะวันตกของบอส", "Tether 1: just west of the boss",
     "บอสเรืองสีแดงหรือน้ำเงิน แล้วโยงสาย (tether) ไปที่ผู้เล่นสุ่ม 1 คน สายจะเป็นสีเดียวกัน\n"
     "ได้สายเป็นคนที่ 1: ไปยืนชิดฝั่งตะวันตกของบอส\n"
     "ภาพตัวอย่าง: บอสและสายสีน้ำเงิน",
     "The boss glows red or blue and tethers a random player; the tether takes the same colour\n"
     "First tether: go just west of the boss\n"
     "Picture: the boss and tether are blue",
     strict=False, pic=TU("01/fall_of_faith_02.jpg"), scene=S.fof02())
step(P1, FOF, "สายที่ 2: ไปชิดฝั่งตะวันออกของบอส", "Tether 2: just east of the boss",
     "ร่างแยกโผล่ทางตะวันตกเฉียงเหนือ เรืองสีแดงหรือน้ำเงิน แล้วโยงสายไปที่ผู้เล่นสุ่ม\n"
     "ได้สายเป็นคนที่ 2: ไปยืนชิดฝั่งตะวันออกของบอส\n"
     "ภาพตัวอย่าง: ร่างแยกและสายสีน้ำเงิน",
     "A clone appears north-west, glows red or blue, and tethers a random player\n"
     "Second tether: go just east of the boss\n"
     "Picture: the clone and tether are blue",
     strict=False, pic=TU("01/fall_of_faith_03.jpg"), scene=S.fof03())
step(P1, FOF, "สายที่ 3: ตะวันตก เลยคนที่ 1 ไป", "Tether 3: west, past the first",
     "ร่างแยกโผล่ทางเหนือ เรืองสีแดงหรือน้ำเงิน แล้วโยงสาย\n"
     "ได้สายเป็นคนที่ 3: ไปฝั่งตะวันตกของบอส เลยคนที่ได้สายที่ 1 ออกไป\n"
     "ภาพตัวอย่าง: ร่างแยกและสายสีแดง",
     "A clone appears north, glows red or blue, and tethers a player\n"
     "Third tether: go west of the boss, past the first tethered player\n"
     "Picture: the clone and tether are red",
     strict=False, pic=TU("01/fall_of_faith_04.jpg"), scene=S.fof04())
step(P1, FOF, "สายที่ 4: ตะวันออก เลยคนที่ 2 ไป", "Tether 4: east, past the second",
     "ร่างแยกตัวสุดท้ายโผล่ทางตะวันออกเฉียงเหนือ แล้วโยงสาย\n"
     "ได้สายเป็นคนที่ 4: ไปฝั่งตะวันออกของบอส เลยคนที่ได้สายที่ 2 ออกไป\n"
     "ภาพตัวอย่าง: ร่างแยกและสายสีแดง",
     "The last clone appears north-east and tethers a player\n"
     "Fourth tether: go east of the boss, past the second tethered player\n"
     "Picture: the clone and tether are red",
     strict=False, pic=TU("01/fall_of_faith_05.jpg"), scene=S.fof05())
step(P1, FOF, "แบ่งคนที่ไม่ได้สาย", "Splitting the untethered",
     "เหลือ 4 คนที่ไม่ได้สาย: แบ่งให้ฝั่งตะวันตกและตะวันออกมีฝั่งละ 4 คน\n"
     "2 คนที่อยู่ทางตะวันตกสุดของแถว: เข้ากลุ่มตะวันตก\n"
     "2 คนที่อยู่ทางตะวันออกสุด: เข้ากลุ่มตะวันออก\n\n"
     "ถ้าสายเป็นสายฟ้า: ใช้ลำดับนี้ตัดสินว่าใครไปเหนือ ใครไปใต้\n"
     "เหนือ: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :ใต้",
     "Four players are left without a tether: split them so west and east have four each\n"
     "The two west-most of them: join the west group\n"
     "The two east-most: join the east group\n\n"
     "If the tether is lightning, this priority decides who goes north and who goes south\n"
     "North: H1 > H2 > MT > ST > D1 > D2 > D3 > D4 :South",
     strict=True, pic=TU("01/fall_of_faith_06.jpg"), scene=S.fof06())
step(P1, FOF, "สายที่ 1 ลง (สายฟ้า)", "Tether 1 resolves (lightning)",
     "สายสายฟ้า: ยิง cleave ใส่ 3 คนที่ใกล้ที่สุด\n"
     "อีก 3 คนในกลุ่มแยกไปยืนทางเหนือ / ใต้ / ตะวันตก ของคนที่ได้สาย (คนได้สายขยับไม่ได้)\n"
     "ภาพตัวอย่าง: สายฟ้า\n\n"
     "ลงแล้ว: คนสายที่ 1 กับคนสายที่ 3 สลับที่กัน",
     "A lightning tether fires cleaves at the three closest players\n"
     "The other three in the group spread north / south / west of the tethered player (who can't move)\n"
     "Picture: a lightning tether\n\n"
     "After it resolves, the first and third tethers swap places",
     strict=False, pic=TU("01/fall_of_faith_07.jpg"), scene=S.fof07())
step(P1, FOF, "สายที่ 2 ลง", "Tether 2 resolves",
     "สายที่ 2 ลง (ภาพตัวอย่าง: สายฟ้า)\n"
     "ลงแล้ว: คนสายที่ 2 กับคนสายที่ 4 สลับที่กัน",
     "The second tether resolves (picture: lightning)\n"
     "After it resolves, the second and fourth tethers swap places",
     strict=False, pic=TU("01/fall_of_faith_08.jpg"), scene=S.fof08())
step(P1, FOF, "สายที่ 3 ลง (ไฟ)", "Tether 3 resolves (fire)",
     "สายไฟ: cleave ใส่คนที่ใกล้ที่สุด 1 คน ให้ 3 คนในกลุ่มแชร์กัน\n"
     "ทุกคนในกลุ่ม stack รวมกันฝั่งตะวันตก/ตะวันออกของคนที่ได้สาย (ฝั่งขอบสนาม) คนได้สายขยับไม่ได้\n"
     "ภาพตัวอย่าง: สายไฟ",
     "A fire tether cleaves the closest player, shared by the other three\n"
     "Everyone stacks west/east of the tethered player (towards the edge); the tethered player can't move\n"
     "Picture: a fire tether",
     strict=False, pic=TU("01/fall_of_faith_09.jpg"), scene=S.fof09())
step(P1, FOF, "สายที่ 4 ลง", "Tether 4 resolves",
     "สายสุดท้ายลง (ภาพตัวอย่าง: สายไฟ)",
     "The fourth and last tether resolves (picture: fire)",
     strict=False, pic=TU("01/fall_of_faith_10.jpg"), scene=S.fof10())
step(P1, "Burnished Glory → Powder Mark Trail", "raid-wide แล้วท่า Tank: invuln", "Raid-wide, then the buster: invuln",
     "บอสใช้ Burnished Glory อีกครั้ง ตามด้วย Powder Mark Trail\n"
     "Powder Mark Trail ครั้งนี้ใช้ invuln รับ: PLD > ST\n\n"
     "ทำไม PLD ก่อน: ถ้า MT เป็น PLD ต้องใช้ Hallowed Ground ตรงนี้ จึงจะกลับมาทันใช้ที่ Darkest Dance ใน P3 แล้วจึงมีใช้ที่ Wings Dark and Light สุดท้ายใน P5 (ถ้าใช้ที่ Quadruple Slap ต้น P2 จะไม่ทัน)\n\n"
     "Mitigate Burnished Glory: ST Reprisal / MT 90s / ST 90s / H2 30s / D1 / D3 / D4\n"
     "mitigate 15 วินาที (Reprisal, Tactician, Heart of Light ฯลฯ) กดหลังสายที่ 2 ลง จะคลุมสายที่ 3–4 และ Burnished Glory\n"
     "barrier อย่าง Shake It Off กับ Divine Veil เก็บไว้ให้ Burnished Glory",
     "The boss does Burnished Glory again, followed by Powder Mark Trail\n"
     "This Powder Mark Trail is invulned: PLD > ST\n\n"
     "Why PLD first: a PLD MT must Hallowed Ground here to have it back for P3's Darkest Dance, and then for the final Wings Dark and Light in P5 (using it on Quadruple Slap at the start of P2 is too late)\n\n"
     "Mitigate Burnished Glory: ST Reprisal / MT 90s / ST 90s / H2 30s / D1 / D3 / D4\n"
     "15s mitigations (Reprisal, Tactician, Heart of Light, …) after the second tether resolves cover tethers 3–4 and Burnished Glory\n"
     "Save shields like Shake It Off and Divine Veil for Burnished Glory",
     strict=False)

TWR = "Towers"
step(P1, TWR, "tower 3 อัน: ล็อกคน", "Three towers: the fixed players",
     "Mechanic สุดท้ายของ phase\n"
     "tower 3 อันขึ้นที่ขอบฝั่งตะวันตกหรือตะวันออก มีจุด (pip) รวม 6 จุดแบ่งสุ่มใน 3 อัน = ต้องมีคนยืนเท่าจำนวน pip\n\n"
     "ล็อก 3 คนไว้:\n"
     "tower เหนือ: H1\n"
     "tower กลาง: H2\n"
     "tower ใต้: D4",
     "The last mechanic of the phase\n"
     "Three towers spawn along the west or east edge, with six pips split randomly between them (one player per pip)\n\n"
     "Three players are fixed:\n"
     "North tower: H1\n"
     "Middle tower: H2\n"
     "South tower: D4",
     strict=["H1", "H2", "D4"], pic=TU("01/towers_01.jpg"), scene=S.tw01())
step(P1, TWR, "D1 D2 D3 เติม pip ที่ขาด", "D1 D2 D3 fill the missing pips",
     "D1 / D2 / D3 เติมคนให้ครบตาม pip ที่ยังขาด\n"
     "ลำดับ: เหนือ: D1 > D2 > D3 :ใต้\n\n"
     "ภาพตัวอย่าง: tower เหนือ 1 pip / กลาง 3 pip / ใต้ 2 pip → D1 กับ D2 ไป tower กลาง / D3 ไป tower ใต้",
     "D1 / D2 / D3 fill the pips still missing\n"
     "Order: North: D1 > D2 > D3 :South\n\n"
     "Picture: north 1 pip / middle 3 / south 2 → D1 and D2 take the middle tower / D3 the south tower",
     strict=["H1", "H2", "D4"], pic=TU("01/towers_02.jpg"), scene=S.tw02())
step(P1, TWR, "บอสสีน้ำเงิน: เข้า tower เลย", "Blue boss: straight into the towers",
     "บอสเรืองสีแดงหรือน้ำเงิน แล้วเตรียมใช้ Burnt Strike\n"
     "สีน้ำเงิน: เข้า tower ของตัวเองได้เลย",
     "The boss glows red or blue and readies Burnt Strike\n"
     "Blue: go straight to your tower",
     strict=["H1", "H2", "D4"], pic=TU("01/towers_03a.jpg"), scene=S.tw03a())
step(P1, TWR, "บอสสีแดง: เข้าไปรับ knockback ลง tower", "Red boss: get knocked back into the towers",
     "สีแดง: เตรียมเดินเข้ากลาง ให้ knockback กระเด็นไปลง tower",
     "Red: get ready to move in and be knocked back into the towers",
     strict=False, pic=TU("01/towers_03b.jpg"), scene=S.tw03b())
step(P1, TWR, "Burn Mark ของ ST → tower ลง", "The ST's Burn Mark, then the towers",
     "Powder Mark Trail ของ ST ระเบิด แล้ว tower ลง\n"
     "จากนั้นบอสร่าย Burnished Glory เป็น enrage ของ phase\n\n"
     "เพื่อให้ cooldown ตรงจังหวะ (ทั้ง burst 2 นาทีและ mitigate) ควรฆ่าบอสให้ช้าที่สุด: ใกล้ร่าย enrage เสร็จ\n"
     "สกิล 1 นาที: กดหลัง Utopian Sky\n"
     "สกิล 2 นาที: จะกลับมาตอนจบ Fall of Faith ให้กดเลยโดยไม่ใช้คู่กับสกิล 1 นาที แล้วเก็บสกิล 1 นาทีไว้เปิด phase ถัดไป\n"
     "ฆ่าบอสตอนท้าย enrage แล้ว burst 2 นาทีจะตรงกับช่วงคริสตัลท้าย P2 ทำให้ผ่านเช็กดาเมจง่ายขึ้นมาก\n\n"
     "Mitigate Burn Mark ครั้งที่ 2:\n"
     "MT: Rampart + 40% + 3rd แล้วให้ short mitigate กับ ST\n"
     "ST: Rampart + 3rd + short",
     "The ST's Powder Mark Trail goes off, then the towers\n"
     "The boss then casts Burnished Glory as the phase's enrage\n\n"
     "To line up cooldowns (2-minute bursts and mitigation), kill the boss as late as possible: near the end of the enrage cast\n"
     "1-minute abilities: right after Utopian Sky\n"
     "2-minute abilities: back at the end of Fall of Faith; use them on cooldown without the 1-minute ones, and save the 1-minute ones for the next phase's opener\n"
     "Killing it late lines your 2-minute burst up with the crystals at the end of P2, making that check much easier\n\n"
     "Mitigate the second Burn Mark:\n"
     "MT: Rampart + 40% + 3rd, and give your short to the ST\n"
     "ST: Rampart + 3rd + short",
     strict=["H1", "H2", "D4"], pic=TU("01/towers_04.jpg"), scene=S.tw04())
