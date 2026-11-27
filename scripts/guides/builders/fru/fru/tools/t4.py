"""P4 steps (04_gaia_and_shiva, mitigation). Tuufless calls this phase 'Gaia and Shiva'; lib/phases.ts names it Enter the Dragon."""
from core import step, TU, TU0
import p4 as S

P4 = ("P4 Enter the Dragon", "P4 Enter the Dragon")
T = lambda n: TU(f"04/{n}.jpg")

step(P4, "Materialization", "เริ่ม phase + Fragment of Fate", "Phase start + the Fragment of Fate",
     "ตั้งแต่ phase นี้ Mana PF ใช้แผนของ Nukemaru (Tuufless ชื่อ phase นี้ว่า Gaia and Shiva)\n\n"
     "Usurper of Frost เกิดใหม่ทางเหนือหรือใต้ ฝั่งที่ไกลจากจุดที่ Oracle of Darkness ตาย\n"
     "Tank 2 คนต้องเป็น aggro อันดับ 1 และ 2 ของ Usurper of Frost: auto-attack ตี 2 อันดับแรก\n\n"
     "Usurper of Frost ร่าย Materialization: เรียก Fragment of Fate ทางเหนือ\n"
     "Fragment of Fate จะโดนดาเมจไปตลอด phase และรอดแบบ HP เหลือน้อยมาก ถ้าไม่มีใครทำ AoE โดนมัน\n"
     "ถ้ามันโดนดาเมจเพิ่ม (AoE ของบอสที่เล็งผู้เล่นแล้วโดนมัน) phase นี้จะเคลียร์ไม่ได้ (แต่ยังซ้อมต่อได้)",
     "From this phase on Mana PF follows Nukemaru's strat (Tuufless calls this phase Gaia and Shiva)\n\n"
     "The Usurper of Frost respawns north or south, whichever is further from where the Oracle of Darkness died\n"
     "Both tanks must be first and second in aggro on her: her auto-attacks hit the top two\n\n"
     "She casts Materialization, spawning the Fragment of Fate north\n"
     "It takes damage through the phase and survives with barely any HP if no player hits it with an AoE\n"
     "Any extra damage (an enemy AoE aimed at a player that clips it) makes the phase impossible to clear (you can still practise)",
     strict=False)
step(P4, "Akh Rhai", "stack ที่ marker ทิศเฉียง", "Stack on the intercardinal markers",
     "stack ที่ marker ทิศเฉียง 2 อันฝั่งที่ Usurper of Frost เกิด (ภาพ: ฝั่งเหนือ marker 4 และ 1)",
     "Stack on the two intercardinal markers on the side where the Usurper of Frost spawned (picture: north, markers 4 and 1)",
     strict=False, pic=T("akh_rhai_00"), scene=S.ar00())
step(P4, "Akh Rhai", "บอสแปลงร่าง: ขยับหนี", "The boss transforms: move away",
     "Usurper of Frost แปลงร่างเป็นมังกร (พูด \"Come to me, Hraesvelgr!\")\n"
     "ตอนแปลงร่าง จะล่อ Akh Rhai (AoE) ลงตรงที่แต่ละคนยืน: แปลงร่างแล้วขยับหนีเลย\n\n"
     "จากนั้น Oracle of Darkness เกิดใหม่ (ทุกคนเปลี่ยนเป้าไปตีเธอ) ให้ ST รับ แล้วไม่นานจะเริ่มท่าร่วมกันครั้งแรก",
     "The Usurper of Frost transforms into its dragon form (\"Come to me, Hraesvelgr!\")\n"
     "On the transformation it baits Akh Rhai AoEs where everyone stands: move away as it transforms\n\n"
     "The Oracle of Darkness then respawns (everyone switches to her); the ST takes her, and shortly their first joint mechanic begins",
     strict=False, pic=T("akh_rhai_01"), scene=S.ar01())

DD = "Darklit Dragonsong"
step(P4, DD, "เข้าแถว + debuff", "Line up + the debuffs",
     "ทั้ง 2 บอสร่าย Darklit Dragonsong: Usurper of Frost ทำ raid-wide / Oracle of Darkness ใส่สายและ Dark Water III\n"
     "เข้าแถว: Healer และ Tank ทางเหนือ / DPS ทางใต้ (ตามภาพ)\n\n"
     "debuff 2 ชุด:\n"
     "Tank 1 / Healer 1 / DPS 2 ได้สาย Refulgent Chain\n"
     "สุ่ม 2 คนได้ Dark Water III (จะมี 1 คนที่ได้ทั้งสายและ Water)\n\n"
     "สายนี้ต่างจาก Light Rampant: Refulgent Fate ขาดได้ทั้งตอนสั้นเกิน (ราว 8 yalm) และยาวเกิน (ราว 26 yalm)\n\n"
     "Mitigate: MT Reprisal / MT 90s / ST 90s / D2 / D3 (debuff ใส่ Usurper of Frost: ดาเมจมาจากเธอ)",
     "Both bosses cast Darklit Dragonsong: the Usurper of Frost deals a raid-wide / the Oracle of Darkness hands out tethers and Dark Water III\n"
     "Line up: healers and tanks north / DPS south (as drawn)\n\n"
     "Two sets of debuffs:\n"
     "One tank, one healer and two DPS get Refulgent Chain tethers\n"
     "Two random players get Dark Water III (one player will have both)\n\n"
     "Unlike Light Rampant, Refulgent Fate breaks when too short (about 8 yalms) or too long (about 26 yalms)\n\n"
     "Mitigate: MT Reprisal / MT 90s / ST 90s / D2 / D3 (debuffs on the Usurper of Frost: the damage is hers)",
     strict=True, pic=T("darklit_01"), scene=S.dl01())
DLR = ("แก้สายด้วยรูป 'โบว์ไท' (เหมือน Light Rampant ใน Eden's Verse: Refulgence)\n"
       "Healer ที่ได้สายไปเหนือเสมอ\n"
       "Rule 1: สายโยงกับ Healer → ไปใต้\n"
       "Rule 2: มีสายแต่ไม่ได้โยงกับ Healer → ไปเหนือ")
DLR_EN = ("Solve the tethers as a 'bowtie' (as in Eden's Verse: Refulgence's Light Rampant)\n"
          "The tethered healer always goes north\n"
          "Rule 1: tethered to the healer → go south\n"
          "Rule 2: tethered, but not to the healer → go north")
step(P4, DD, "สายเป็นโบว์ไทอยู่แล้ว", "Already a bowtie",
     DLR + "\n\nแบบดีที่สุด: สายเป็นโบว์ไทอยู่แล้ว ไม่ต้องปรับ\nคนมีสายที่อยู่เหนือสุด 2 คนไป tower เหนือ / ใต้สุด 2 คนไป tower ใต้",
     DLR_EN + "\n\nBest case: the tethers already make a bowtie, no adjustments\nThe two north-most tethered players take the north tower / the two south-most the south tower",
     strict=False, pic=T("darklit_02a"), scene=S.dl02("a"))
step(P4, DD, "สายเป็นสี่เหลี่ยม: Tank สลับกับ DPS ตะวันออก", "A box: the tank swaps with the east DPS",
     "สายเป็นรูปสี่เหลี่ยม: Tank กับ DPS ที่มีสายฝั่งตะวันออกสุด สลับที่กัน (ภาพ: ST ⇔ D2)",
     "The tethers make a box: the tank and the east-most tethered DPS swap (picture: ST ⇔ D2)",
     strict=False, pic=T("darklit_02b"), scene=S.dl02("b"))
step(P4, DD, "สายเป็นนาฬิกาทราย: Tank สลับกับ DPS ตะวันตก", "An hourglass: the tank swaps with the west DPS",
     "สายเป็นรูปนาฬิกาทราย: Tank กับ DPS ที่มีสายฝั่งตะวันตกสุด สลับที่กัน (ภาพ: ST ⇔ D1)",
     "The tethers make an hourglass: the tank and the west-most tethered DPS swap (picture: ST ⇔ D1)",
     strict=False, pic=T("darklit_02c"), scene=S.dl02("c"))
step(P4, DD, "ตำแหน่ง: คนไม่มีสายอยู่ระหว่าง tower", "Formation: the untethered between the towers",
     "แก้สายแล้ว ทุกคนเข้าตำแหน่งตามภาพ: คนไม่มีสายยืนระหว่าง tower 2 อัน\n"
     "ถ้าสายเริ่มที่ฝั่งตะวันออก/ตะวันตกเดียวกันทั้งคู่: D2 กับ D3 สลับฝั่ง (ภาพ: สายอยู่ที่ D1+D2 → D2 ไปตะวันออก D3 ไปตะวันตก)",
     "With the tethers sorted, take this formation: the untethered players between the two towers\n"
     "If both tethers started on the same east/west side: D2 and D3 swap sides (picture: tethers on D1+D2 → D2 goes east, D3 west)",
     strict=True, pic=T("darklit_03a"), scene=S.dl03())
step(P4, DD, "แยก Water: คน Water กับคู่สลับ", "Separate the Waters: the Water and partner swap",
     "ต่อไปแยก Dark Water III 2 อัน\n"
     "Water อยู่คนละฝั่ง (เหนือ/ใต้): ไม่ต้องปรับ\n"
     "Water อยู่ฝั่งเดียวกัน: คนมี Water (ที่ไม่มีสาย) สลับฝั่งกับคู่ของตัวเอง ทำก่อน tower ลง\n"
     "ภาพ: Water ทั้งคู่อยู่กลุ่มเหนือ → H2 (Water ไม่มีสาย) กับคู่ D3 สลับกัน",
     "Next, separate the two Dark Water III\n"
     "On different sides (north/south): no change\n"
     "Both on one side: the (untethered) Water player and their partner swap sides, before the towers resolve\n"
     "Picture: both Waters in the north group → H2 (untethered Water) and partner D3 swap",
     strict=True, pic=T("darklit_03b"), scene=S.dl03(True))
step(P4, DD, "tower + The Path of Light", "Towers + The Path of Light",
     "คนมีสายเข้า tower 2 อัน\n"
     "Usurper of Frost เตรียม The Path of Light: cleave ใส่ 4 คนที่ใกล้ที่สุด = 4 คนที่ไม่มีสาย (นี่คือ 'stack น้ำปรับก่อนกรวย' ของแผน)",
     "The tethered players take the two towers\n"
     "The Usurper of Frost readies The Path of Light, cleaving the four closest = the four untethered (this is the strat's 'water before the fan')",
     strict=True, pic=T("darklit_04"), scene=S.dl04())
step(P4, DD, "spread รอบ 2 บอส", "Spread around both bosses",
     "ขยับลงใต้นิด แล้ว spread รอบทั้ง 2 บอสตามภาพ\n"
     "อย่า spread ใกล้ Fragment of Fate (เขตอันตรายสีแดงเข้ม)",
     "Move a little south and spread around both bosses as drawn\n"
     "Don't spread too close to the Fragment of Fate (the danger zone in dark red)",
     strict=True, pic=T("darklit_05"), scene=S.dl05())
step(P4, DD, "Spirit Taker", "Spirit Taker",
     "Oracle of Darkness ใช้ Spirit Taker ใส่ผู้เล่นสุ่ม\n"
     "ถ้าเป็นไปได้ เธอไม่ควรขยับมาก",
     "The Oracle of Darkness targets a random player with Spirit Taker\n"
     "Ideally she shouldn't move much",
     strict=True, pic=T("darklit_06"), scene=S.dl05(True))
step(P4, DD, "Hallowed Wings + Water", "Hallowed Wings + the Waters",
     "Usurper of Frost ใช้ Hallowed Wings: cleave ครึ่งสนามฝั่งตะวันตกหรือตะวันออก\n"
     "Water ลงพร้อมกัน: stack ที่ marker ทิศเฉียง 2 อันฝั่งที่ปลอดภัย (ภาพ: ตะวันออกโดน → stack ที่ 4 และ 3)\n"
     "ระยะนี้ไกลพอไม่ให้สายขาด และพ้น Fragment of Fate\n"
     "กลุ่มใต้ขยับเข้าใกล้ marker ทิศใต้ได้ เพื่อเผื่อระยะ",
     "The Usurper of Frost uses Hallowed Wings, cleaving the west or east half\n"
     "The Waters resolve about then: stack on the two intercardinal markers on the safe half (picture: east is hit → stack on 4 and 3)\n"
     "Far enough not to trigger the tethers, and clear of the Fragment of Fate\n"
     "The south group can move closer to the south marker for extra margin",
     strict=False, pic=T("darklit_07"), scene=S.dl07())
step(P4, DD, "Somber Dance: MT invuln", "Somber Dance: MT invulns",
     "Oracle of Darkness ใช้ Somber Dance ใส่คนที่ไกลที่สุด: MT ล่อ (ถ้า MT เป็น PLD ให้ ST ล่อแทน)\n"
     "ขึ้นกับว่า Spirit Taker ลงตรงไหน อาจไม่ใช่ฝั่งที่ปลอดภัยของ Hallowed Wings\n"
     "เป็นท่า Tank 2 ครั้ง: ครั้งแรกใส่คนที่ไกลสุด ครั้งที่ 2 ใส่คนที่ใกล้สุด\n"
     "ต่างจาก Savage: คนเดียวรับได้ทั้ง 2 ครั้ง → ใช้ invuln รับ\n"
     "AoE ใหญ่กว่าวงเป้าของบอสนิดหน่อย: หลังครั้งแรก คนอื่นถอยออกจากบอส\n\n"
     "MT: กด Rampart ตอนบอสกระโดด จะคลุมถึง Akh Morn ครั้งแรก และกลับมาทันครั้งที่ 2 ถ้า ST ตาย\n"
     "WAR: ใช้ Holmgang แบบไม่เลือกเป้า (ถ้าเลือกเป้าแล้วห่างเกิน 6.5 yalm Holmgang จะไม่ทำงาน)",
     "The Oracle of Darkness targets the furthest player with Somber Dance: the MT baits it (the ST if the MT is a PLD)\n"
     "Depending on where Spirit Taker landed, this is not necessarily the safe half\n"
     "A two-hit buster: first the furthest player, then the closest\n"
     "Unlike Savage, one player can take both → do it with an invuln\n"
     "Its AoE is slightly larger than her hitbox: everyone else backs off after the first hit\n\n"
     "MT: Rampart as she jumps covers Akh Morn #1 and is back for #2 if the ST dies\n"
     "WAR: use Holmgang untargeted (targeted and more than 6.5 yalms away, it won't go off)",
     strict=["MT"], pic=T("darklit_08"), scene=S.dl08())

step(P4, "Akh Morn", "ครั้งที่ 1: 7:1 (MT รับคนเดียว)", "#1: 7:1 (MT alone)",
     "2 บอสวาร์ปไปข้างกลางสนาม ฝั่งตะวันตกและตะวันออก แล้วใช้ Akh Morn 4 ครั้ง ใส่คนที่ถือ aggro (Tank ของแต่ละตัว)\n"
     "ทุกคนยกเว้น MT stack กลางสนาม แชร์ Akh Morn ของ ST\n"
     "MT รับ Akh Morn คนเดียวด้วย mitigate: ครั้งละราว 175k\n"
     "MT ห้ามใช้ mitigate 40% (ต้องเก็บไว้ Crystallize Time): ให้ Tank อีกคนและ Healer ช่วย mitigate ใส่\n\n"
     "Akh Morn / Morn Afah ทะลุ invuln ทุกแบบ (รวม invuln ตอนฟื้น)\n"
     "ถ้า 2 Akh Morn ไปลงที่ Tank คนเดียว = ตายทั้งคู่: เกิดจากเสีย aggro (Provoke ผิดตัว / Tank ตาย / ตีบอสอีกตัวแรงเกินขณะเปิด tank stance)\n\n"
     "Mitigate: ST Reprisal / H2 30s / MT Rampart + 3rd + short",
     "The bosses teleport a bit west and east of the centre and use a 4-hit Akh Morn on whoever holds their aggro (their tanks)\n"
     "Everyone but the MT stacks in the middle to share the ST's Akh Morn\n"
     "The MT takes theirs alone with mitigation: about 175k a hit\n"
     "The MT can't use their 40% (needed for Crystallize Time): the co-tank and healers mitigate them\n\n"
     "Akh Morn / Morn Afah go through every invuln (the raise invuln too)\n"
     "Both Akh Morns on one tank = a one-shot: caused by lost aggro (wrong Provoke / a tank death / hitting the other boss too much in tank stance)\n\n"
     "Mitigate: ST Reprisal / H2 30s / MT Rampart + 3rd + short",
     strict=["MT"], pic=T("akh_morn_01"), scene=S.am01())
step(P4, "Morn Afah", "stack + เช็ก HP 2 บอส", "A stack + the bosses' HP check",
     "Usurper of Frost ใช้ Morn Afah ใส่ aggro อันดับ 1 (MT): stack ทั้งปาร์ตี้\n"
     "เป็นเช็ก HP ด้วย: HP 2 บอสต้องห่างกันไม่เกิน 5% ไม่งั้น Morn Afah แรงจนตาย\n"
     "ถ้าเกิน 5% บอสจะโยงสายกัน สีบอกว่าตัวไหน HP มากไป: สายขาว = Usurper of Frost / สายม่วง = Oracle of Darkness\n\n"
     "เคล็ดลับ: ปรับ HP ไม่ทัน MT รับ Morn Afah คนเดียวเพื่อช่วยปาร์ตี้ได้ แล้วต้องฟื้นและ Provoke Usurper of Frost ก่อนบอสหายไปตอน Crystallize Time\n\n"
     "Mitigate: ST Reprisal + H2 30s จาก Akh Morn คลุมถึง / debuff ใส่ Usurper of Frost / mitigate เสริมใช้ตรงนี้",
     "The Usurper of Frost targets top aggro (the MT) with Morn Afah: a party stack\n"
     "It's also an HP check: the bosses must be within 5% of each other, or it's lethal\n"
     "If not, they tether together and the colour shows who has too much: white = Usurper of Frost / purple = Oracle of Darkness\n\n"
     "Tip: if the HP can't be balanced in time, the MT can take Morn Afah alone to save the party; they must then be raised and Provoke the Usurper of Frost before the bosses vanish for Crystallize Time\n\n"
     "Mitigate: covered by ST Reprisal + H2 30s from Akh Morn / debuffs on the Usurper of Frost / any extra mitigation here",
     strict=False, pic=TU0("04/morn_afah.jpg"), scene=S.morn())

CT = "Crystallize Time"
step(P4, CT, "ภาพรวมและ debuff", "Overview and debuffs",
     "Mechanic ที่ยากที่สุดของไฟต์\n"
     "hourglass 6 อันขึ้น / Usurper of Frost ใส่ debuff / Oracle of Darkness ทำ raid-wide และโยงสายไป hourglass 4 อัน (เหนือกับใต้สายเหลือง อีกคู่ตรงข้ามกันสายม่วง)\n"
     "หัวมังกร 2 หัวเกิดทางเหนือ วนรอบสนาม ตามเข็ม 1 หัว ทวนเข็ม 1 หัว\n\n"
     "Wyrmclaw (แดง) / Wyrmfang (น้ำเงิน): แบ่งปาร์ตี้ 4:4 แบบสุ่ม หมดเวลา = ตาย\n"
     "แดง: วิ่งชนหัวมังกร = ล้าง debuff + ระเบิด AoE ใหญ่ 12 yalm + ทิ้งแอ่งเล็ก / หัวมังกรออกไปหลังกินแดงคนที่ 2 / ถ้ากินแดงไม่ครบ 2 ก่อนวนจบ = wipe (Joyless Dragonsong)\n"
     "น้ำเงิน: ยืนบนแอ่งที่หัวมังกรทิ้งไว้เพื่อล้าง debuff\n\n"
     "Dark Aero III: AoE ใหญ่รอบตัว คนอื่นที่โดนถูก knockback ข้ามสนาม\n"
     "Quietus (3 คน, 30 วิ): raid-wide\n\n"
     "Mitigate: MT Reprisal / D1 / D4 (debuff ใส่ Oracle of Darkness: ดาเมจมาจากเธอ)",
     "The hardest part of the fight\n"
     "Six hourglasses spawn / the Usurper of Frost hands out debuffs / the Oracle of Darkness deals a raid-wide and tethers four hourglasses (north and south yellow, an opposite pair purple)\n"
     "Two dragon heads spawn north and circle the arena, one clockwise, one anti-clockwise\n\n"
     "Wyrmclaw (red) / Wyrmfang (blue): split the party 4:4 at random; at 0 = KO\n"
     "Red: run into a dragon head = cleanse + a large 12-yalm AoE + a small puddle / the head leaves after the second red / fewer than two reds before its loop ends = wipe (Joyless Dragonsong)\n"
     "Blue: stand on a puddle left by a head to cleanse\n\n"
     "Dark Aero III: a large point-blank AoE that knocks anyone else hit across the arena\n"
     "Quietus (3 players, 30s): a raid-wide\n\n"
     "Mitigate: MT Reprisal / D1 / D4 (debuffs on the Oracle of Darkness: the damage is hers)",
     strict=False)
step(P4, CT, "แดง: Ice ตะวันออก/ตะวันตก · Aero ใต้", "Red: Ices east/west · Aeros south",
     "แดง 4 คน: 2 คนได้ Dark Blizzard III / 2 คนได้ Dark Aero III\n\n"
     "Blizzard ยืนตะวันออกและตะวันตก ระหว่าง hourglass\n"
     "ตะวันตก: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 :ตะวันออก\n"
     "Blizzard ดูว่ามีคนอยู่ทางเหนือตรงตัวเองไหม: ถ้าไม่มี ยืนเหนือกลางนิดหน่อย (แนวเดียวกับขอบบนของ marker) แล้วเตรียม Sprint\n\n"
     "Aero ยืนตะวันตกเฉียงใต้และตะวันออกเฉียงใต้ ที่ขีดทิศเฉียง\n"
     "ตะวันตกเฉียงใต้: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 :ตะวันออกเฉียงใต้",
     "Four reds: two with Dark Blizzard III / two with Dark Aero III\n\n"
     "The Blizzards stand east and west, between the hourglasses\n"
     "West: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 :East\n"
     "Each Blizzard checks for a player directly north of them: if none, stand a little north of centre (in line with the top of the waymark) and get ready to Sprint\n\n"
     "The Aeros stand south-west and south-east, on the intercardinal tick\n"
     "South-west: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 :South-east",
     strict=False, pic=T("crystallize_time_01a"), scene=S.ct01a())
step(P4, CT, "น้ำเงิน: Eruption ไปช่องเฉียงเหนือ", "Blue: Eruption to a north cubby",
     "น้ำเงิน 4 คน: Dark Eruption / Dark Water III / Dark Blizzard III / Unholy Darkness อย่างละ 1\n"
     "ภายหลังต้องติดมาร์ก 1–4 ให้ตัวเอง\n\n"
     "หาสายสีม่วง\n"
     "ทุกคนยกเว้น Eruption: ไปรวมกับ Aero แดง ตะวันตกเฉียงใต้หรือตะวันออกเฉียงใต้ (ฝั่งที่มีสายม่วง)\n"
     "Eruption: ไปตะวันตกเฉียงเหนือหรือตะวันออกเฉียงเหนือ (ฝั่งที่มีสายม่วง) เข้าไปให้สุด 'ซอก' ที่ขอบ (สีเขียวในภาพ)\n\n"
     "ภาพ: สายม่วงจากตะวันตกเฉียงเหนือถึงตะวันออกเฉียงใต้ → Eruption ไปตะวันตกเฉียงเหนือ / น้ำเงินคนอื่นไปตะวันออกเฉียงใต้",
     "Four blues: one each of Dark Eruption / Dark Water III / Dark Blizzard III / Unholy Darkness\n"
     "They'll need to mark themselves 1–4 later\n\n"
     "Find the purple tether\n"
     "Everyone but the Eruption: join the red Aero SW or SE (whichever has the purple tether)\n"
     "Eruption: go NW or NE (whichever has the purple tether), all the way into the 'cubby hole' at the edge (green in the picture)\n\n"
     "Picture: purple NW to SE → Eruption NW / the other blues SE",
     strict=False, pic=T("crystallize_time_01b"), scene=S.ct01b())
step(P4, CT, "hourglass เหนือ-ใต้ (Maelstrom)", "The north/south hourglasses (Maelstrom)",
     "hourglass สายเหลือง (เหนือ ใต้) ระเบิด (Maelstrom)\n"
     "Aero แดง 2 คน + น้ำเงินฝั่งใต้ทั้งหมด เดินเข้า AoE ตอนระเบิด ไปยืนที่ปลาย 'กลีบดอกไม้' บนพื้น\n"
     "น้ำเงินฝั่งใต้กับ Aero แดงยืนชิดกัน ให้ Aero แดงอยู่ใกล้ขอบสนามที่สุด",
     "The yellow-tethered hourglasses (north and south) resolve (Maelstrom)\n"
     "The two red Aeros and all south-side blues move into the AoEs as they resolve and stand at the tip of the 'flower petal' on the floor\n"
     "The south-side blues and the red Aero stack tightly, the red Aero closest to the edge",
     strict=False, pic=T("crystallize_time_02"), scene=S.ct02())
step(P4, CT, "หัวมังกรถึง Ice: Ice แดงวิ่งขึ้นเหนือ", "The heads reach the Ices: red Ices run north",
     "หัวมังกรถึง Ice แดงตะวันออก/ตะวันตกพร้อม debuff ลง แล้วระเบิด (Longing of the Lost)\n"
     "Eruption น้ำเงิน: ขยับลงนิดหน่อย (เผื่อ Ice ที่ใกล้มาช้า)\n"
     "Ice แดงที่ใกล้ Eruption: เดินขึ้นเหนือไปรวม\n"
     "Ice แดงที่ไกล Eruption: Sprint วิ่งขึ้นเหนือ (ออกเร็วไปหัวมังกรจะระเบิดเร็วและโดน Fragment of Fate)\n"
     "น้ำเงินฝั่งใต้: ถูก knockback ข้ามไปอีกฝั่ง\n"
     "Aero แดง 2 คน: ก้าวออกจากกลีบดอกไม้ลงไปช่องใต้",
     "The dragon heads reach the E/W red Ices as the debuffs resolve and explode (Longing of the Lost)\n"
     "Blue Eruption: move down slightly (in case the nearer Ice is late)\n"
     "The red Ice nearer the Eruption: move north to join them\n"
     "The red Ice further away: Sprint north (too early and the head pops early and hits the Fragment of Fate)\n"
     "South-side blues: get knocked across the arena\n"
     "The two red Aeros: step off the petal into the south sector",
     strict=False, pic=T("crystallize_time_03"), scene=S.ct03())
step(P4, CT, "hourglass ชุด 2 + Unholy Darkness", "Second hourglasses + Unholy Darkness",
     "hourglass ชุด 2 ระเบิดพร้อม Unholy Darkness ของน้ำเงิน\n"
     "ห้ามโดน Fragment of Fate: อยู่บนเส้นทิศเฉียงเป็นอย่างน้อย (ดีที่สุดคือเลยไปอีกฝั่ง) ใช้ marker ทิศเฉียงเป็นแนว\n"
     "stack ลงแล้ว ทุกคนใน stack ขึ้นไปช่องเหนือ\n"
     "Aero แดง 2 คน: หลัง hourglass ระเบิด ไปตะวันตกเฉียงใต้และตะวันออกเฉียงใต้ เตรียมดักหัวมังกร\n"
     "Ice แดงที่ไม่ได้อยู่ใน stack: ข้ามกลีบดอกไม้ตะวันออก/ตะวันตกไปฝั่งเหนือหลัง hourglass ระเบิด",
     "The second hourglasses explode with the blue Unholy Darkness\n"
     "Don't hit the Fragment of Fate: be at least on the intercardinal line (ideally past it); use the intercardinal waymark as a guide\n"
     "Once the stack resolves, everyone in it moves to the north sector\n"
     "The two red Aeros: after the hourglasses, move SW and SE to intercept the dragon heads\n"
     "The red Ice not in the stack: cross the E/W petal to the north side after the hourglass explodes",
     strict=False, pic=T("crystallize_time_04"), scene=S.ct04())
step(P4, CT, "Aero ดักหัวมังกร + Tidal Light แรก", "Aeros take the heads + the first Tidal Light",
     "Aero แดงดักหัวมังกร: debuff แดงหมดครบแล้ว\n"
     "Aero แดงกลับไปช่องใต้หลังชนหัวมังกร\n\n"
     "เส้นบอกแนว AoE ที่เคลื่อนที่ (Tidal Light) ขึ้นฝั่งตะวันตกหรือตะวันออก ตรงที่ Ice แดงคนเดียวอาจยืนอยู่\n"
     "ถ้าขึ้นฝั่งเดียวกับ Ice แดง: ไม่ต้องตกใจ เตรียมหลบเข้าไปตอนมันลง\n"
     "จำว่าเส้นแรกเริ่มฝั่งไหน (ตะวันออก/ตะวันตก)",
     "The red Aeros intercept the dragon heads: every red debuff is now resolved\n"
     "The red Aeros go back to the south sector after their heads\n\n"
     "A travelling line telegraph (Tidal Light) appears along the west or east side, where the lone red Ice may be\n"
     "On the red Ice's side: don't panic, just be ready to dodge into it when it goes off\n"
     "Note which side it started on (east or west)",
     strict=False, pic=T("crystallize_time_05"), scene=S.ct05())
step(P4, CT, "hourglass ชุด 3 + Tidal Light ลง", "Third hourglasses + the first line",
     "hourglass ชุด 3 ระเบิดพร้อม AoE เส้นแรก\n"
     "ตามตำแหน่งที่ยืน หลบเข้าไปในเส้นแรกหรือเส้นที่ 2 (มีเส้นบอกทั้งคู่)\n"
     "เป้าหมาย: ไปจบฝั่งที่เส้นเริ่ม",
     "The third hourglasses explode with the first line AoE\n"
     "Depending on where you are, dodge into the first or second line (both are telegraphed)\n"
     "The goal: end on the side the line came from",
     strict=False, pic=T("crystallize_time_06"), scene=S.ct06())
step(P4, CT, "น้ำเงินเก็บแอ่ง 1–4", "Blues take puddles 1–4",
     "hourglass ระเบิดครบแล้ว: น้ำเงินออกไปยืนบนแอ่งเพื่อล้าง debuff\n"
     "น้ำเงินต้องติดมาร์ก 1–4 แล้ว: 1 เก็บแอ่งตะวันออกสุด ... 4 เก็บแอ่งตะวันตกสุด",
     "All three hourglass pairs are done: the blues go out to the puddles to cleanse\n"
     "Each blue should have marked themselves 1–4 by now: 1 takes the east-most puddle … 4 the west-most",
     strict=False, pic=T("crystallize_time_07"), scene=S.ct07())
step(P4, CT, "Tidal Light เส้นที่ 2 (เหนือ/ใต้)", "The second Tidal Light (north/south)",
     "เส้นบอกแนวที่ 2 ขึ้น ทางเหนือหรือใต้\n"
     "จำว่าเริ่มฝั่งไหน: ภายหลังปาร์ตี้จะ spread โดยถือฝั่งนี้เป็นทิศเหนือ\n"
     "ถ้าเส้นที่ 2 เริ่มทางเหนือ น้ำเงินต้องรีบล้าง debuff เพื่อกลับมาทัน",
     "A second line telegraph appears, north or south\n"
     "Note which side it starts on: the party spreads later with this side as relative north\n"
     "If it starts north, the blues must cleanse quickly to make it back in time",
     strict=False, pic=T("crystallize_time_08"), scene=S.ct08())
step(P4, CT, "เตรียมหลบเส้นที่ 2", "Ready to dodge the second line",
     "เข้าตำแหน่งหลบเส้นที่ 2: น้ำเงินทุกคนควรล้าง debuff แล้ว\n"
     "ถ้าเส้นเริ่มทางเหนือ (ภาพ) นี่คือโอกาสสุดท้ายที่จะไปฝั่งปลอดภัยทัน",
     "Get in position for the second line: every blue should be cleansed now\n"
     "If it started north (as drawn), this is your last chance to reach the safe side",
     strict=False, pic=T("crystallize_time_09"), scene=S.ct09())
step(P4, CT, "หลบเส้นแนวนอน + Quietus", "Dodge the horizontal line + Quietus",
     "หลบเส้นแนวนอนที่ 2 แล้วเดินเข้าหากลางสนาม\n"
     "Quietus ลงในไม่ช้า: raid-wide",
     "Dodge the second horizontal line and move towards the centre\n"
     "Quietus resolves shortly: a raid-wide",
     strict=False, pic=T("crystallize_time_10"), scene=S.ct10())
step(P4, CT, "บันทึกตำแหน่งรูป Y", "Record in a Y",
     "ยืนเป็นรูป Y ใกล้กลางสนาม เยื้องไปทางฝั่งที่เส้นที่ 2 เริ่ม\n"
     "MT: บนซ้าย (ถือฝั่งนั้นเป็นเหนือ)\n"
     "ST: บนขวา\n"
     "คนอื่น: stack ใกล้กลาง\n"
     "ทุกคนบันทึกตำแหน่งในรูปนี้",
     "Make a Y near the centre, towards where the second line came from\n"
     "MT: relative top-left\n"
     "ST: relative top-right\n"
     "Everyone else: stack near the centre\n"
     "Everyone records their position in this formation",
     strict=["MT", "ST"], pic=T("crystallize_time_12"), scene=S.ct12())
step(P4, CT, "spread รอ Spirit Taker", "Spread for Spirit Taker",
     "บันทึกแล้ว spread รอ Spirit Taker ใส่ผู้เล่นสุ่ม (ถือฝั่งที่เส้นที่ 2 เริ่มเป็นเหนือ)\n"
     "MT: ตะวันตกเฉียงเหนือไกลๆ\n"
     "ST: ตะวันออกเฉียงเหนือไกลๆ\n"
     "คนอื่นยืนบน marker ตามทิศ: H1/H2 ตะวันตก/ตะวันออก / D1/D2 ตะวันตกเฉียงใต้/ตะวันออกเฉียงใต้ / D3/D4 ตะวันตกเฉียงเหนือ/ตะวันออกเฉียงเหนือ\n"
     "อย่าอยู่ใกล้ Fragment of Fate\n\n"
     "DPS ยืนบน marker: ไกล Fragment of Fate พอให้ Spirit Taker ไม่โดน แต่ยังอยู่ในระยะ mitigate ของ Tank (30 yalm)\n"
     "เลย marker ออกไป = D1/D2 หลุดระยะ mitigate ของ Tank",
     "After recording, spread for Spirit Taker on a random player (the second line's side as north)\n"
     "MT: far north-west\n"
     "ST: far north-east\n"
     "Everyone else on the marker in their direction: H1/H2 W/E / D1/D2 SW/SE / D3/D4 NW/NE\n"
     "Don't be near the Fragment of Fate!\n\n"
     "The DPS on the waymarks: far enough from the Fragment that Spirit Taker misses it, still in range of the tanks' party mitigation (30 yalms)\n"
     "Past the waymarks = D1/D2 out of the tanks' mitigation",
     strict=True, pic=T("crystallize_time_13"), scene=S.ct13())
step(P4, CT, "Spirit Taker: mitigate หนัก + Arm's Length", "Spirit Taker: heavy mitigation + Arm's Length",
     "Oracle of Darkness กระโดดใส่ผู้เล่นสุ่ม (Spirit Taker): เตรียม mitigate หนัก\n"
     "Tank: ใช้ mitigate 40% ของตัวเอง\n"
     "ปาร์ตี้ต้องมี mitigate ทั้งปาร์ตี้ 10% อย่างน้อย 3 อันเพิ่ม\n"
     "ทุกคนกด Arm's Length / Surecast\n\n"
     "Mitigate Hallowed Wings: MT 90s / ST 90s / H1 120s / H2 120s / D3 / MT 40% / ST 40%\n"
     "mitigate 15 วินาที กดตอน Spirit Taker ก่อน rewind พอดี\n"
     "แผนนี้ mitigate เกินที่ Hallowed Wings: ให้ Tank 1 คน (โดยเฉพาะ WAR/PLD) ย้าย 90s ไปคลุม Memory's End → Morn Afah ครั้งแรกแทนได้",
     "The Oracle of Darkness jumps on a random player (Spirit Taker): prepare heavy mitigation\n"
     "Tanks: your 40% personal\n"
     "The party needs at least 3 more 10% party mitigations\n"
     "Everyone uses Arm's Length / Surecast\n\n"
     "Mitigate Hallowed Wings: MT 90s / ST 90s / H1 120s / H2 120s / D3 / MT 40% / ST 40%\n"
     "15s mitigations right at the Spirit Taker before the rewind\n"
     "This plan over-mitigates Hallowed Wings: one tank (especially WAR/PLD) can move their 90s to cover Memory's End → Morn Afah #1 instead",
     strict=True, pic=T("crystallize_time_14"), scene=S.ct13(True))
step(P4, CT, "rewind + Hallowed Wings ครั้งที่ 1", "Rewind + the first Hallowed Wings",
     "rewind ลง Usurper of Frost ใช้ Hallowed Wings จากฝั่งที่เส้นแรกมา\n"
     "ปาร์ตี้ถูก knockback ครึ่งสนาม: Arm's Length / Surecast กันไว้\n"
     "4 คนแรกที่โดนติด Magic Vulnerability Up\n"
     "คนแรกที่โดนเจ็บที่สุด (ควรเป็น Tank) คนหลังๆ เจ็บน้อยลง\n\n"
     "ดาเมจพื้นฐานโดยประมาณ: 160k / 70k / 55k / 55k / 40k / 15k / 10k / 10k (คนที่ 1–8)\n"
     "Magic Vulnerability Up ทำให้รับ 400%: คนที่ 5 ที่มี vuln โดนพอๆ กับคนแรก\n"
     "Tank คูณราว 0.64 / caster และ Healer คูณราว 0.94\n\n"
     "ทำไมใช้ Arm's Length: บันทึกใกล้กลางได้ → น้ำเงินมีเวลาเก็บแอ่งมากขึ้น และ spread รอ Spirit Taker ใช้จุดตามเข็มนาฬิกาปกติได้",
     "The rewind resolves and the Usurper of Frost casts Hallowed Wings from the side the first line came from\n"
     "The party is knocked back half the arena: blocked by Arm's Length / Surecast\n"
     "The first four hit get Magic Vulnerability Up\n"
     "The first player hit takes the most (should be a tank); those behind take less\n\n"
     "Base damage roughly: 160k / 70k / 55k / 55k / 40k / 15k / 10k / 10k (players 1–8)\n"
     "The vuln makes it 400%: a fifth player with vuln takes about as much as the first without\n"
     "Tanks ×0.64 / casters and healers ×0.94 roughly\n\n"
     "Why Arm's Length: you record nearer the centre → the blues get more time for their puddles, and the Spirit Taker spread can use the standard clock spots",
     strict=["MT", "ST"], pic=T("crystallize_time_15"), scene=S.ct15())
step(P4, CT, "Hallowed Wings ครั้งที่ 2", "The second Hallowed Wings",
     "Hallowed Wings ครั้งที่ 2 มาจากเหนือหรือใต้ (ฝั่งที่เส้นที่ 2 มา)\n"
     "ปาร์ตี้ถูก knockback ครึ่งสนาม",
     "The second Hallowed Wings comes from north or south (wherever the second line came from)\n"
     "The party is knocked back half the arena",
     strict=["MT", "ST"], pic=T("crystallize_time_16"), scene=S.ct16())
step(P4, "Akh Morn", "ครั้งที่ 2: 7:1 (ST รับคนเดียว)", "#2: 7:1 (ST alone)",
     "2 บอสกลับมาใกล้กลางสนาม แล้วใช้ Akh Morn 4 ครั้ง → Morn Afah ทันที\n"
     "ครั้งนี้ทุกคนยกเว้น ST stack กลางแชร์ Akh Morn ของ MT\n"
     "ST รับคนเดียวด้วย mitigate ห่างจากปาร์ตี้\n\n"
     "Mitigate: ST Reprisal / H2 30s / ST Rampart + 3rd + short (MT ให้ short mitigate กับ ST)",
     "The bosses reappear near the centre and go straight into another 4-hit Akh Morn → Morn Afah\n"
     "This time everyone but the ST stacks in the middle to share the MT's Akh Morn\n"
     "The ST takes theirs alone with mitigation, away from the party\n\n"
     "Mitigate: ST Reprisal / H2 30s / ST Rampart + 3rd + short (the MT gives their short to the ST)",
     strict=["ST"], pic=T("akh_morn_02"), scene=S.am02())
step(P4, "Morn Afah", "ครั้งที่ 2 → enrage", "#2 → the enrage",
     "Morn Afah ใส่ MT อีกครั้ง: เหมือนครั้งแรก (HP 2 บอสต้องห่างไม่เกิน 5%)\n"
     "ครั้งนี้ Fragment of Fate ใช้ Edge of Oblivion (raid-wide) ครั้งสุดท้ายก่อน Morn Afah ลง: barrier ต้องใส่ใหม่\n\n"
     "จากนั้น 2 บอสร่าย enrage (Absolute Zero และ Memory's End)\n"
     "ฆ่าทั้งคู่แล้ว ทุกคนโดน stun ลากไปทางใต้ เข้าสนามถัดไป\n"
     "ถ้า Fragment of Fate ไม่อยู่: Eden's Promise ออกมา wipe / ถ้ายังอยู่: ไป phase สุดท้าย\n"
     "(ถ้าเคยทำลาย Crystal of Darkness: Fragment ยังเกิด แต่ raid-wide จะชื่อ Depths of Oblivion แทน แรงเท่ากัน)\n\n"
     "Mitigate: ST Reprisal + H2 30s จาก Akh Morn คลุมถึง / debuff ใส่ Usurper of Frost",
     "Morn Afah on the MT again: as before (the bosses within 5% HP)\n"
     "This time the Fragment of Fate pulses one last Edge of Oblivion (raid-wide) just before Morn Afah: reapply shields\n\n"
     "Both bosses then cast their enrages (Absolute Zero and Memory's End)\n"
     "With both down, everyone is stunned and dragged south into the next arena\n"
     "No Fragment of Fate: Eden's Promise spawns and wipes / Fragment alive: on to the final phase\n"
     "(If a Crystal of Darkness was destroyed, the Fragment still spawns, but its raid-wide is named Depths of Oblivion; same damage)\n\n"
     "Mitigate: covered by ST Reprisal + H2 30s from Akh Morn / debuffs on the Usurper of Frost",
     strict=False)
