"""P3 Oracle of Darkness steps (03_oracle_of_darkness, mitigation)."""
from core import step, TU
import p3 as S

P3 = ("P3 Oracle of Darkness", "P3 Oracle of Darkness")
T = lambda n: TU(f"03/{n}.jpg")

step(P3, "Hell's Judgment", "HP เหลือ 1 + LB3", "Down to 1 HP + LB3",
     "Oracle of Darkness เริ่มทางใต้ แล้วใช้ Hell's Judgment ทันที: HP ทุกคนเหลือ 1\n"
     "จากนั้นวาร์ปไปกลางสนาม เตรียม Mechanic ใหญ่แรกพร้อม raid-wide แรง\n\n"
     "ถ้ามี LB3: Melee ใช้ LB3 ใส่บอสตรงนี้ (ตกลงกันตอนเริ่ม อาจเปลี่ยนถ้ามี DNC)\n"
     "ลำดับตัวอย่าง: DRG > NIN > MNK > SAM > VPR > RPR\n\n"
     "ตายจาก Hell's Judgment: มีเอฟเฟกต์เพิ่ม HP สูงสุดที่หมดไปพอดี เช่น อาหาร / Greater Nebula (GNB) / Protraction (SCH) / Thrill of Battle (WAR)",
     "The Oracle of Darkness starts south and immediately opens with Hell's Judgment: everyone to 1 HP\n"
     "She then teleports to the middle and prepares her first big mechanic with a heavy raid-wide\n\n"
     "With LB3 up: a melee LB3s her here (agreed at the start; may change with a DNC)\n"
     "Example priority: DRG > NIN > MNK > SAM > VPR > RPR\n\n"
     "Died to Hell's Judgment: an effect raising your max HP wore off, e.g. food / Greater Nebula (GNB) / Protraction (SCH) / Thrill of Battle (WAR)",
     strict=False)

UR = "Ultimate Relativity"
step(P3, UR, "debuff ที่ต้องดู", "The debuffs to read",
     "debuff เยอะ แต่ดูแค่บางตัวพอ\n\n"
     "ลงก่อน Return:\n"
     "Dark Fire III (7 คน): AoE รอบตัว 8 yalm / 10 วิ (Fire สั้น: DPS 2 + Tank/Healer 1) / 20 วิ (Fire กลาง: Tank/Healer 1 + DPS 1) / 30 วิ (Fire ยาว: Tank/Healer 2 + DPS 1)\n"
     "Dark Blizzard III (1 คน, 20 วิ): donut รอบตัว แทน Fire ของ Tank/Healer สั้น หรือ DPS ยาว\n"
     "Unholy Darkness (3 คน, 10/20/30 วิ): stack 6 yalm ต้องมี 5 คนขึ้นไป\n"
     "Spell-in-Waiting: Return: บันทึกตำแหน่ง แล้วกลายเป็น Return (รวม 39 วิ): stun แล้วดึงกลับตำแหน่งที่บันทึก / หันหน้าไม่ถูกบันทึก หันไว้ยังไงก่อน Return ก็อยู่แบบนั้น\n\n"
     "ลงหลัง Return (42 วิ) = ตัวกำหนดว่าจะบันทึกตรงไหน:\n"
     "Dark Eruption (4 คน: Fire สั้น 3 รวม Blizzard ของ Tank/Healer + Tank/Healer Fire กลาง): AoE 6 yalm / บันทึกหลัง hourglass ของตัวเอง (ฝั่งกลางสนาม)\n"
     "Dark Water III (DPS Fire กลาง): stack 4 คนขึ้นไป / บันทึกเยื้องกลางสนามไปทาง hourglass 1 ก้าว\n"
     "Shadoweye (Fire ยาว 3 คน รวม Blizzard ของ DPS): ใครมองคนนี้ติด Doom / บันทึกเยื้องกลางไปทาง hourglass 1 ก้าว",
     "Many debuffs; only a few matter\n\n"
     "Before Return:\n"
     "Dark Fire III (7 players): an 8-yalm point-blank AoE / 10s (short: 2 DPS + 1 tank/healer) / 20s (mid: 1 tank/healer + 1 DPS) / 30s (long: 2 tanks/healers + 1 DPS)\n"
     "Dark Blizzard III (1 player, 20s): a donut, replacing the short tank/healer Fire or the long DPS Fire\n"
     "Unholy Darkness (3 players, 10/20/30s): a 6-yalm stack needing 5+\n"
     "Spell-in-Waiting: Return: records your spot, then becomes Return (39s in all): stun and back to it / facing isn't recorded: you keep the one you had just before\n\n"
     "After Return (42s) = where you record:\n"
     "Dark Eruption (4: the three short Fires incl. a tank/healer Blizzard + the tank/healer mid Fire): a 6-yalm AoE / record just behind your hourglass (centre side)\n"
     "Dark Water III (the DPS mid Fire): a stack needing 4+ / record one step off the centre towards your hourglass\n"
     "Shadoweye (the three long Fires incl. a DPS Blizzard): anyone looking at them gets Doom / record one step off the centre towards your hourglass",
     strict=False)
step(P3, UR, "แบ่ง hourglass ตามสาย", "Hourglasses by tether",
     "แบ่ง 3 กลุ่มตามความยาว Dark Fire III: สั้น 3 คน / กลาง 2 คน / ยาว 3 คน\n\n"
     "Rule 1: Fire สั้น ไป hourglass ที่ว่าง (ไม่มีสาย)\n"
     "Rule 2: Fire กลาง ไป hourglass สายสีม่วง\n"
     "Rule 3: Fire ยาว ไป hourglass สายสีเหลือง\n\n"
     "สายเรียงเป็นรูปคนยืนกางแขนกางขา (รูปตัวอักษรจีนที่แปลว่า \'ใหญ่\') มีสายเหลืองเส้นเดียวชี้ขึ้นเป็นหัว: หารูปนี้ แล้วถือสายเหลืองเส้นเดียวนั้นเป็นทิศเหนือ (กลับหัวกับแผน Y ของ DC อื่น)\n\n"
     "ตามภาพ: DPS สั้น ตะวันตกเฉียงเหนือ/ตะวันออกเฉียงเหนือ / Tank/Healer สั้น ใต้ / Tank/Healer กลาง ตะวันตก / DPS กลาง ตะวันออก / Tank/Healer ยาว ตะวันตกเฉียงใต้/ตะวันออกเฉียงใต้ / DPS ยาว เหนือ\n\n"
     "ติดมาร์ก: Tank/Healer ที่ได้ Fire ยาว ใช้ macro Bind / DPS ที่ได้ Fire สั้น ใช้ macro Attack (ภาพ: มาร์กของ macro ทีละ debuff)\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / D1 / D4 (Healer 120s ใช้ตรงนี้ เพื่อให้กลับมาทัน Shockwave Pulsar → Memory's End)",
     "Three groups by Dark Fire III length: 3 short / 2 mid / 3 long\n\n"
     "Rule 1: short Fires go to the empty (untethered) spots\n"
     "Rule 2: mid Fires go to the purple-tethered spots\n"
     "Rule 3: long Fires go to the yellow-tethered spots\n\n"
     "The tethers make a figure standing with arms and legs spread (the Chinese character for 'big'), one yellow tether pointing up as its head: find it and treat that single yellow tether as north (upside-down from other DCs' Y strat)\n\n"
     "As drawn: short DPS NW/NE / short tank/healer S / mid tank/healer W / mid DPS E / long tanks/healers SW/SE / long DPS N\n\n"
     "Markers: a tank/healer with long Fire uses the Bind macro / a DPS with short Fire uses the Attack macro (picture: each debuff's macro marker)\n\n"
     "Mitigate: MT Reprisal / H1 120s / H2 120s / D1 / D4 (the healers' 120s go here to be back for Shockwave Pulsar → Memory's End)",
     strict=False, pic=T("ultimate_relativity_01"), scene=S.ur01())
step(P3, UR, "วิธีเล่นโดยรวม", "How it plays",
     "ได้ hourglass แล้ว: อยู่กลางสนามเป็นหลัก ออกไปเฉพาะตอนต้องจัดการ debuff\n"
     "ถึงคิว Dark Fire III: ออกไปลงข้างนอก\n"
     "ถึงคิวบันทึก: Fire สั้นกับกลาง บันทึกหลัง hourglass / Fire ยาว บันทึกที่กลางเยื้องไปทาง hourglass\n"
     "hourglass ของเราเริ่มหมุน: ไปล่อลำแสง (laser)\n\n"
     "เคล็ดลับล่อลำแสง: หันกล้องออกนอกสนาม แล้วยืนให้กรอบ hourglass บังจุดดำกลางไอคอน Spell-in-Waiting เหนือหัวตัวเอง\n\n"
     "ทุก 5 วินาทีจะมีอะไรเกิดขึ้น: ถ้า debuff เราไม่ได้ใกล้ลงและ hourglass ไม่หมุน ให้ stack กลางสนาม\n"
     "จะดู macro /echo หรืออ่านจาก debuff ที่ใกล้หมดก็ได้",
     "Once you have your hourglass, stay in the middle and only step out for your own debuffs\n"
     "Your Dark Fire III: resolve it outside\n"
     "Your record: short and mid Fires just behind their hourglass / long Fires in the centre, towards their hourglass\n"
     "Your hourglass starts spinning: go bait its laser\n\n"
     "Laser trick: with the camera facing out, stand so the hourglass frame covers the black dot in the middle of the Spell-in-Waiting icon over your head\n\n"
     "Something happens every 5 seconds: if no debuff of yours is about to go and your hourglass isn't spinning, stack in the middle\n"
     "Use the /echo macros or just read the next debuff to expire",
     strict=False)
step(P3, UR, "Fire ชุด 1 + Unholy Darkness", "Fire set 1 + Unholy Darkness",
     "Fire สั้น: ออกไปลง Dark Fire III ข้างนอก\n"
     "Tank/Healer Blizzard / Fire กลาง / Fire ยาว: stack กลางรับ Unholy Darkness\n\n"
     "ภาพ: แบบ Blizzard ช้า (DPS ได้ Dark Blizzard III)",
     "Short Fires: resolve Dark Fire III outside\n"
     "Tank/healer Blizzard / mid / long Fires: stack in the middle for Unholy Darkness\n\n"
     "Picture: the slow Blizzard case (a DPS has Dark Blizzard III)",
     strict=False, pic=T("ultimate_relativity_02"), scene=S.ur02())
step(P3, UR, "บันทึก + ล่อลำแสง ชุด 1", "Records + lasers, set 1",
     "Sinbound Meltdown ชุดแรก\n"
     "Fire สั้น: บันทึกตำแหน่งหลัง hourglass ของตัวเอง (สำหรับ Dark Eruption)\n"
     "Fire กลาง: Tank/Healer บันทึกหลัง hourglass / DPS บันทึกกลางสนาม (เยื้องไปทาง hourglass นิดหน่อย)\n"
     "Fire ยาว: ล่อลำแสงของ hourglass ตัวเอง",
     "The first Sinbound Meltdown\n"
     "Short Fires: record just behind your hourglass (for Dark Eruption)\n"
     "Mid Fires: tank/healer records just behind the hourglass / DPS records in the centre (a little towards the hourglass)\n"
     "Long Fires: bait your hourglass's laser",
     strict=False, pic=T("ultimate_relativity_03"), scene=S.ur03())
step(P3, UR, "Fire ชุด 2 + Blizzard", "Fire set 2 + Blizzard",
     "Fire สั้น: stack กลางรับ Unholy Darkness\n"
     "Fire กลาง: ออกไปลง Dark Fire III ข้างนอก\n"
     "Fire ยาว: stack กลางรับ Unholy Darkness\n"
     "Dark Blizzard III ลงชุดนี้ด้วย",
     "Short Fires: stack in the middle for Unholy Darkness\n"
     "Mid Fires: resolve Dark Fire III outside\n"
     "Long Fires: stack in the middle for Unholy Darkness\n"
     "Dark Blizzard III resolves here too",
     strict=False, pic=T("ultimate_relativity_04"), scene=S.ur04())
step(P3, UR, "บันทึก + ล่อลำแสง ชุด 2", "Records + lasers, set 2",
     "Fire สั้น: ล่อลำแสงของ hourglass ตัวเอง\n"
     "Fire กลาง: เดินเข้ากลาง\n"
     "Fire ยาว: กลางสนาม เยื้องไปทาง hourglass นิดหน่อย (สำหรับ Shadoweye)\n"
     "บันทึกตำแหน่งที่จุดของตัวเองตามเข็มนาฬิกา ห่างจากกลางสนามนิดหน่อย",
     "Short Fires: bait your hourglass's laser\n"
     "Mid Fires: move inside\n"
     "Long Fires: centre, a little towards your hourglass (for Shadoweye)\n"
     "Record on your own clock spot, a little away from the centre",
     strict=False, pic=T("ultimate_relativity_05"), scene=S.ur05())
step(P3, UR, "Fire ชุด 3", "Fire set 3",
     "Fire สั้น / Fire กลาง / DPS Blizzard: stack กลางรับ Unholy Darkness\n"
     "Fire ยาว: ออกไปลง Dark Fire III ข้างนอก\n\n"
     "ภาพ: แบบ Blizzard เร็ว (Tank/Healer ได้ Dark Blizzard III)\n\n"
     "Mitigate Fire/Unholy Darkness: ชุด 1 = Healer 120s ที่ใช้ตอนต้น / ชุด 2 = MT 90s + ST 90s / ชุด 3 = D3",
     "Short Fires / mid Fires / DPS Blizzard: stack in the middle for Unholy Darkness\n"
     "Long Fires: resolve Dark Fire III outside\n\n"
     "Picture: the fast Blizzard case (a tank/healer has Dark Blizzard III)\n\n"
     "Mitigate Fire/Unholy Darkness: set 1 = the healers' 120s from the start / set 2 = MT 90s + ST 90s / set 3 = D3",
     strict=False, pic=T("ultimate_relativity_06"), scene=S.ur06())
step(P3, UR, "ล่อลำแสง ชุด 3", "Lasers, set 3",
     "ชุดนี้ไม่มีการบันทึก\n"
     "Fire สั้น: อยู่ข้างใน\n"
     "Fire กลาง: ล่อลำแสงของ hourglass ตัวเอง\n"
     "Fire ยาว: เดินเข้าข้างใน",
     "No records this time\n"
     "Short Fires: stay inside\n"
     "Mid Fires: bait your hourglass's laser\n"
     "Long Fires: move inside",
     strict=False, pic=T("ultimate_relativity_07"), scene=S.ur07())
step(P3, UR, "ก่อน Rewind: หันหน้าออกนอกสนาม", "Before the Rewind: face outwards",
     "Rewind ทำงานก่อน debuff 42 วินาทีจะลง\n"
     "ตำแหน่งถูกบันทึกไว้แล้ว แต่ทิศที่หันไม่ถูกบันทึก: ทิศที่หันอยู่ก่อน Rewind จะค้างไว้ตลอด\n"
     "จึงต้องหันตัวละครออกนอกสนามก่อน Rewind (ยืนจุดตะวันตกเฉียงเหนือ = หันไปตะวันตกเฉียงเหนือ)",
     "The Rewind triggers just before the 42s debuffs\n"
     "Your position was recorded but not your facing: the facing you have just before the Rewind is locked throughout\n"
     "So face your character out of the arena before it (on the NW spot, face north-west)",
     strict=False, pic=T("ultimate_relativity_08"), scene=S.ur07(True))
step(P3, UR, "Rewind ลง: Eruption / Water / Shadoweye", "The Rewind: Eruption / Water / Shadoweye",
     "ทุกคนถูกดึงกลับไปตำแหน่งที่บันทึก ซึ่งควรอยู่ในแนวจุดของตัวเอง\n"
     "คนมี Dark Eruption (Fire สั้นทั้งหมด + Tank/Healer Fire กลาง): บันทึกไว้ข้างนอก\n"
     "คนมี Dark Water III (DPS Fire กลาง): บันทึกไว้ข้างใน\n"
     "คนมี Shadoweye (Fire ยาว): บันทึกไว้ข้างใน\n\n"
     "ถ้าถูกต้อง: Dark Eruption ไม่โดนใคร / คน Shadoweye แชร์ stack Dark Water III / ทุกคนหันออกนอก ไม่โดนท่ามอง",
     "Everyone is taken back to their recorded spots, which should be along their clock positions\n"
     "Dark Eruption (all short Fires + the tank/healer mid Fire): recorded outside\n"
     "Dark Water III (the DPS mid Fire): recorded inside\n"
     "Shadoweye (the long Fires): recorded inside\n\n"
     "Done right: no Dark Eruption hits anyone else / the Shadoweye players share the Dark Water III stack / everyone faces out and dodges the gaze",
     strict=False, pic=T("ultimate_relativity_09"), scene=S.ur09())
step(P3, "Shell Crusher → Black Halo", "stack กลาง แล้วท่าแรงใส่ Tank", "Stack in the middle, then the buster",
     "ควบคุมตัวได้แล้ว: stack กลางสนามแชร์ Shell Crusher\n"
     "hourglass หายไป บอสใช้ Shockwave Pulsar (raid-wide)\n"
     "จากนั้น Black Halo ใส่ aggro อันดับ 1: cleave ท่า Tank แชร์ 2 คน: รับทางเหนือ\n"
     "Black Halo รับคนเดียวได้ถ้าใช้ mitigate หนัก (แต่ไม่จำเป็น)\n\n"
     "Mitigate Shell Crusher → Shockwave Pulsar: ST Reprisal / H2 30s / D2\n"
     "Mitigate Black Halo: MT + ST ใช้ Rampart + 40% + 3rd + short",
     "Once you can move: stack in the middle to share Shell Crusher\n"
     "The hourglasses vanish and the boss casts Shockwave Pulsar (raid-wide)\n"
     "Then Black Halo on the top-aggro player: a tank-buster cleave shared by two: take it north\n"
     "One tank can take Black Halo alone with heavy mitigation (no need to)\n\n"
     "Mitigate Shell Crusher → Shockwave Pulsar: ST Reprisal / H2 30s / D2\n"
     "Mitigate Black Halo: MT + ST Rampart + 40% + 3rd + short",
     strict=False)

AP = "Apocalypse"
step(P3, AP, "ภาพรวม: แบ่งกลุ่มครั้งเดียวตลอด Mechanic", "Overview: swap once, keep the groups",
     "ช่วงนี้ตีบอสได้ตลอด\n"
     "ก่อนร่าย บอสใช้ Spell-in-Waiting Refrain: Dark Water III 3 คู่ ใส่ 6 คน ลงระหว่าง Apocalypse\n"
     "จึงมี 4 คู่ (รวม 2 คนที่ไม่ได้ Water): ต้องแบ่ง 2 กลุ่ม กลุ่มละ 4 ให้แต่ละกลุ่มมี debuff ครบ (ไม่มี / 10 วิ / 29 วิ / 38 วิ)\n"
     "อาจต้องสลับ 1–2 คู่\n\n"
     "แผนนี้ปรับกลุ่มแค่ครั้งเดียวตอนเริ่ม แล้วใช้กลุ่มนั้นจนจบ\n"
     "แลกกับ: ทุกคน (ยกเว้น H2 กับ D4) ต้องหลบ Apocalypse จากหลายตำแหน่งได้ และ Melee อาจตีบอสไม่ถึงบ้าง (แก้ได้ด้วยการให้ Tank ไปแทน)",
     "The boss is targetable throughout\n"
     "Before the cast she uses Spell-in-Waiting Refrain: three pairs of Dark Water III on six players, resolved during Apocalypse\n"
     "That makes four pairs (counting the two without Water): split into two groups of four, each with one of each (none / 10s / 29s / 38s)\n"
     "One or two pairs may need to swap\n\n"
     "This version adjusts once at the start and keeps the groups to the end\n"
     "In exchange: everyone (except H2 and D4) must be able to dodge Apocalypse from different spots, and melee may lose some uptime (a tank there helps)",
     strict=False)
step(P3, AP, "กล่อง 2 กลุ่ม + สลับคนซ้ำ", "Two boxes + swapping duplicates",
     "จับกลุ่มเป็นกล่อง: Tank/Healer ทางเหนือค่อนตะวันตก (NNW) / DPS ทางใต้ค่อนตะวันออก (SSE)\n"
     "Water ออกแล้ว ดูว่าในกลุ่มมี debuff ซ้ำไหม (ไม่มี / 10 / 29 / 38)\n"
     "ถ้าซ้ำ: คนที่ลำดับสูงกว่าย้ายไปอีกกลุ่ม\n"
     "ย้าย: MT > ST > H1 > H2 :อยู่\n"
     "ย้าย: D1 > D2 > D3 > D4 :อยู่\n\n"
     "ภาพตัวอย่าง: H1 + H2 ได้ Water 10 วิ และ D1 + D2 ไม่มี debuff → H1 กับ D1 สลับกลุ่ม\n\n"
     "โอกาส: ไม่ต้องสลับ 8/35 / สลับ 1 คู่ 24/35 / สลับ 2 คู่ 3/35 (เช่น ไม่มี: MT ST / สั้น: H1 H2 / กลาง: D1 D3 / ยาว: D2 D4 → MT H1 D1 D2 ย้าย)",
     "Form boxes: tanks/healers NNW / DPS SSE\n"
     "When the Water debuffs come out, look for duplicates in your group (none / 10 / 29 / 38)\n"
     "Duplicates: the higher-priority player swaps to the other group\n"
     "Swap: MT > ST > H1 > H2 :Stay\n"
     "Swap: D1 > D2 > D3 > D4 :Stay\n\n"
     "Picture: H1 + H2 have the 10s Water and D1 + D2 have none → H1 and D1 swap\n\n"
     "Odds: no swap 8/35 / one pair 24/35 / two pairs 3/35 (e.g. none: MT ST / short: H1 H2 / mid: D1 D3 / long: D2 D4 → MT H1 D1 D2 swap)",
     strict=True, pic=T("apocalypse_00"), scene=S.ap00())
step(P3, AP, "ตำแหน่งในกล่อง: ตัว Z", "Box spots: the Z",
     "ได้กลุ่มแล้วใช้กลุ่มนี้จนจบ Mechanic\n"
     "ในกล่องยืนเรียงตามรูปตัว Z (ภาพ: เส้นสีเหลือง)\n"
     "บนซ้าย: D1 > D2 > MT > ST > D3 > H1 > D4 > H2 :ล่างขวา\n\n"
     "ภาพ: หลัง H1 กับ D1 สลับ กลุ่มเหนือ = D1 MT ST H2 / กลุ่มใต้ = D2 D3 H1 D4",
     "These are your groups until the mechanic ends\n"
     "In the box, follow the letter Z (yellow lines in the picture)\n"
     "Top-left: D1 > D2 > MT > ST > D3 > H1 > D4 > H2 :Bottom-right\n\n"
     "Picture: after H1 and D1 swap, north group = D1 MT ST H2 / south group = D2 D3 H1 D4",
     strict=True, pic=T("apocalypse_01"), scene=S.ap01())
step(P3, AP, "Apocalypse + Water ชุด 1", "Apocalypse + the first Water",
     "บอสร่าย Apocalypse: สนามเปลี่ยนนิดหน่อย และ Dark Water III คู่แรกลง\n"
     "3 จุดบนสนามกะพริบสีขาว: กลางสนาม 1 จุด และ 2 จุดตรงข้ามกันที่ทิศหลัก/ทิศเฉียง = จุดที่ AoE จะลงทีหลัง\n"
     "แต่ละจุดมีแสงสีขาวพุ่งไปตามเส้นวงรอบสนาม ตามเข็มหรือทวนเข็ม",
     "The boss casts Apocalypse: the arena changes slightly and the first pair of Dark Water III stacks resolves\n"
     "Three points flash white: the centre and two opposite cardinals/intercardinals = where the AoEs will appear later\n"
     "A white streak leaves each point and follows the line round the arena, clockwise or anti-clockwise",
     strict=False, pic=T("apocalypse_02"), scene=S.ap02())
step(P3, AP, "แสงอ้างอิงของแต่ละกลุ่ม", "Each group's reference light",
     "ระหว่างรับ Water ให้หาจุดปลอดภัยล่วงหน้า\n"
     "ดูแสง 2 จุดรอบนอก: เป็นจุดอ้างอิงของแต่ละกลุ่มในครึ่งสนามของตัวเอง\n"
     "ตะวันตก ถึง ตะวันออกเฉียงเหนือ: กลุ่ม Tank/Healer (หลังสลับแล้ว)\n"
     "ตะวันตกเฉียงใต้ ถึง ตะวันออก: กลุ่ม DPS (หลังสลับแล้ว)\n\n"
     "ตำแหน่ง spread สุดท้ายไม่จำเป็นต้องอยู่ในครึ่งนี้",
     "While the Water stacks resolve, work out your future safe spots\n"
     "Look at the two outer lights: each group's reference in its half of the arena\n"
     "West round to north-east: the tank/healer group (after swaps)\n"
     "South-west round to east: the DPS group (after swaps)\n\n"
     "Your final spread spot is not necessarily in this half",
     strict=False, pic=T("apocalypse_02b"), scene=S.ap02b())
step(P3, AP, "หมุน 45° สวนทางแสง: 4 จุด", "45° against the lights: four spots",
     "จากแสงอ้างอิงของกลุ่ม มองไป 45° ทางตรงข้ามกับทิศที่แสงวิ่ง\n"
     "จากจุดนั้นมี 4 ตำแหน่ง (ลูกศรสีเหลือง) = จุด spread ภายหลัง\n"
     "1: จุดใกล้ (ไปทางกลางสนาม)\n"
     "2: จุดใกล้ ถัดไปอีก 45°\n"
     "3: 2 จุดไกลที่ขอบ ห่างขีดทิศไปทั้ง 2 ข้าง ข้างละ 2.5 ขีด\n\n"
     "Tank ที่จะล่อ Darkest Dance: จำจุด 2 ที่ใกล้ที่สุดไว้ ใช้ล่อ Darkest Dance ทีหลัง\n\n"
     "ภาพตัวอย่าง: แสงเริ่มตะวันตกและตะวันออก วิ่งตามเข็ม → Tank/Healer อ้างตะวันตก หมุนไปตะวันตกเฉียงใต้ / DPS อ้างตะวันออก หมุนไปตะวันออกเฉียงเหนือ / Darkest Dance ล่อทางเหนือหรือใต้",
     "From your group's light, look 45° in the opposite direction to the lights' travel\n"
     "From there are four positions (yellow arrows) = your spread spots later\n"
     "1: the near spot (towards the centre)\n"
     "2: the near spot another 45° on\n"
     "3: the two far spots at the edge, 2.5 tick marks either side of the cardinal/intercardinal\n\n"
     "The tank who will bait Darkest Dance: note the nearest spot 2; that's where you bait it later\n\n"
     "Picture: lights start W and E going clockwise → tanks/healers reference W and turn to SW / DPS reference E and turn to NE / Darkest Dance is baited north or south",
     strict=False, pic=T("apocalypse_02c"), scene=S.ap02c())
EXN = [("ex1a", "แสงเหนือ-ใต้ วิ่งทวนเข็ม", "Lights N–S, anti-clockwise"), ("ex1b", "แสงเหนือ-ใต้ วิ่งตามเข็ม", "Lights N–S, clockwise"),
       ("ex2a", "แสงตะวันออกเฉียงเหนือ-ตะวันตกเฉียงใต้ ทวนเข็ม", "Lights NE–SW, anti-clockwise"),
       ("ex2b", "แสงตะวันออกเฉียงเหนือ-ตะวันตกเฉียงใต้ ตามเข็ม", "Lights NE–SW, clockwise"),
       ("ex3a", "แสงตะวันตก-ตะวันออก ทวนเข็ม", "Lights W–E, anti-clockwise"), ("ex3b", "แสงตะวันตก-ตะวันออก ตามเข็ม", "Lights W–E, clockwise"),
       ("ex4a", "แสงตะวันตกเฉียงเหนือ-ตะวันออกเฉียงใต้ ทวนเข็ม", "Lights NW–SE, anti-clockwise"),
       ("ex4b", "แสงตะวันตกเฉียงเหนือ-ตะวันออกเฉียงใต้ ตามเข็ม", "Lights NW–SE, clockwise")]
for k, (key, th, en) in enumerate(EXN):
    step(P3, AP, f"ครบ 8 แบบ ({k + 1}/8): {th}", f"All eight ({k + 1}/8): {en}",
         ("ภาพครบทั้ง 8 แบบ: แสงเริ่มต้น ทิศที่วิ่ง และจุด spread พื้นฐานของทุกคน (ยังไม่สลับใคร)\n"
          "หัวแสงสีขาวชี้ทางที่แสงวิ่ง / เส้นประแดงแบ่งครึ่งสนามของ 2 กลุ่ม\n\n" if k == 0 else "") +
         f"แบบนี้: {th}",
         ("All eight cases: the first lights, their direction, and everyone's base spread spot (no swaps)\n"
          "The white streak points the way the lights travel / the red dashes split the two groups' halves\n\n" if k == 0 else "") +
         f"This case: {en}",
         strict=True, pic=T("apocalypse_" + key), scene=S.exscene(key))
step(P3, AP, "Spirit Taker: spread แบบกล่อง", "Spirit Taker: spread from the box",
     "ระหว่าง Water ลง บอสเตรียม Spirit Taker: กระโดดใส่เป้าสุ่ม AoE ที่ทำให้คนอื่นที่โดนกระเด็นออกนอกสนาม\n"
     "Water ลงแล้ว: รีบ spread ตามรูปกล่องเดิม",
     "While the Water stacks resolve the boss readies Spirit Taker: a jump on a random target whose AoE knocks anyone else hit out of the arena\n"
     "After the Water: quickly spread out in the same box formation",
     strict=True, pic=T("apocalypse_03"), scene=S.ap03())
step(P3, AP, "Spirit Taker ลง", "Spirit Taker resolves",
     "Spirit Taker ลง (ภาพ: บอสกระโดดใส่ D2)",
     "Spirit Taker resolves (picture: the boss jumps on D2)",
     strict=False, pic=T("apocalypse_04"), scene=S.ap04())
step(P3, AP, "spread ไปจุดที่หาไว้", "Spread to the spots you found",
     "บอสกลับกลางสนาม\n"
     "แสงวิ่งต่อจนครบ 6 จุด (= AoE 6 ชุด) แล้วไปอยู่ตามภาพ เทียบกับแสงชุดแรก\n"
     "ทุกคนได้มาร์ก spread: กระจายตามรูปกล่องเดิม ไปยังจุดที่หาไว้ในขั้น 'หมุน 45°'\n"
     "มีวงกลมสีขาวใหญ่บนพื้น: คนตำแหน่งหน้า (จุดใกล้) ยืนบนขอบวงนี้ จะพ้น Apocalypse ตรงกลาง",
     "The boss returns to the centre\n"
     "The trails run on for six pulses in all (= six waves of AoEs) and end like this, relative to the first lights\n"
     "Everyone gets a spread marker: spread in your box formation to the spots from the '45°' step\n"
     "There is a large white circle on the floor: the front (near) spots stand on its edge to avoid the centre Apocalypse",
     strict=True, pic=T("apocalypse_05"), scene=S.ap05())
step(P3, AP, "AoE ชุด 1", "AoE wave 1",
     "AoE ลงจริง ตรงจุดที่กะพริบไว้ ทั้งหมด 6 ชุด (ภาพ: ชุดแรก กลางสนาม + ตะวันตก + ตะวันออก)",
     "The AoEs go off for real where the points flashed, six waves in all (picture: wave 1, centre + west + east)",
     strict=True, pic=T("apocalypse_06"), scene=S.ap06())
step(P3, AP, "AoE ชุด 2 + spread ลง", "Wave 2 + the spreads",
     "AoE ชุด 2 ลงพร้อมมาร์ก spread\n"
     "spread ลงแล้วขยับทันที",
     "Wave 2 resolves together with the spread markers\n"
     "Move as soon as the spreads go off",
     strict=True, pic=T("apocalypse_07"), scene=S.ap07())
step(P3, AP, "AoE ชุด 3: เข้ากลาง", "Wave 3: into the middle",
     "รีบเข้ากลางสนามโดยหลบ AoE ชุด 3\n"
     "คนที่อยู่ใกล้กลาง: เดินเข้าได้เลย\n"
     "คนที่อยู่ขอบ: เดินเข้าตามทางแคบที่ปลอดภัยไปถึงกลาง",
     "Quickly move to the centre while dodging wave 3\n"
     "Players near the centre: just walk in\n"
     "Players at the edge: come in along the narrow safe path to the middle",
     strict=False, pic=T("apocalypse_08"), scene=S.ap08())
step(P3, AP, "AoE ชุด 4: ใช้วงขาวกลางสนาม", "Wave 4: use the white circle",
     "มีวงกลมสีขาวกลางสนาม\n"
     "ใช้เป็นแนว: ไม่ให้โดน Apocalypse และยืน 2 กลุ่มห่างกันพอไม่ให้ stack Dark Water III ทับกัน",
     "There's a white circle in the centre\n"
     "Use it as a guide: stay out of the Apocalypse AoEs, and keep the two groups far enough apart that the Dark Water III stacks don't overlap",
     strict=False, pic=T("apocalypse_09"), scene=S.ap09())
step(P3, AP, "Water ชุด 2 + AoE ชุด 5", "Water 2 + wave 5",
     "Dark Water III ชุด 2 ลงพร้อม AoE ชุด 5\n"
     "Tank ที่ล่อ Darkest Dance: ออกไปทางที่ห่างจากแสงชุดแรก 90° (จุด 2 ที่จำไว้)\n"
     "Tank ที่ล่อ: PLD > ST",
     "The second Dark Water III resolves with wave 5\n"
     "The tank baiting Darkest Dance moves out 90° from where the first lights flashed (the spot 2 you noted)\n"
     "Who baits: PLD > ST",
     strict=False, pic=T("apocalypse_10"), scene=S.ap10())
step(P3, AP, "Darkest Dance", "Darkest Dance",
     "Darkest Dance: AoE ท่า Tank ใส่คนที่ไกลที่สุด: ใช้ invuln รับ (PLD > ST)\n\n"
     "invuln กับทั้งไฟต์:\n"
     "WAR / DRK: invuln ตรงนี้แล้วกลับมาทัน Wings Dark and Light ครั้งแรกใน P5\n"
     "GNB / PLD: invuln ตรงนี้แล้วไม่ทันครั้งแรกใน P5 (ทันครั้งที่ 2)\n"
     "PLD เป็น Tank เดียวที่ถ้าใช้ที่ Somber Dance ใน P4 จะไม่ทัน Wings Dark and Light ใน P5 เลย: ให้ PLD ล่อ Darkest Dance ด้วย Hallowed Ground",
     "Darkest Dance: a tank-buster AoE on the furthest player: invuln it (PLD > ST)\n\n"
     "Invulns across the fight:\n"
     "WAR / DRK: invuln here and have it back for the first Wings Dark and Light in P5\n"
     "GNB / PLD: invuln here and miss the first in P5 (back for the second)\n"
     "PLD is the only tank that can't invuln P4's Somber Dance and still have it for either Wings Dark and Light in P5: let the PLD bait Darkest Dance with Hallowed Ground",
     strict=["ST"], pic=T("apocalypse_11"), scene=S.ap11())
step(P3, AP, "เตรียม knockback ด้านหลังบอส", "Ready for the knockback behind the boss",
     "Tank ที่ล่อกลับเข้ากลุ่ม\n"
     "ทุกคนเดินเข้าหาบอส ยืนตามกลุ่มรอ knockback\n"
     "ด้านหลังฝั่งซ้ายของบอส: กลุ่ม Tank/Healer เดิม\n"
     "ด้านหลังฝั่งขวาของบอส: กลุ่ม DPS เดิม",
     "The baiting tank rejoins their group\n"
     "Everyone moves to the boss and lines up for a knockback in their groups\n"
     "Boss's back-left: the base tank/healer group\n"
     "Boss's back-right: the base DPS group",
     strict=False, pic=T("apocalypse_12"), scene=S.ap12())
step(P3, AP, "knockback", "The knockback",
     "บอส knockback\n"
     "ยืนทำมุมแคบๆ (เกือบตรงหลังบอส) จะได้ไม่กระเด็นออกด้านข้างสนาม",
     "The boss knocks everyone back\n"
     "Use a shallow angle (close to straight behind) so you aren't knocked out of the side of the arena",
     strict=False, pic=T("apocalypse_13"), scene=S.ap13())
step(P3, AP, "Water ชุด 3 ใกล้บอส → Memory's End", "Water 3 near the boss → Memory's End",
     "Dark Water III ชุด 3: รับใกล้บอส\n"
     "Melee ใช้สกิลพุ่งเข้าได้ แต่ต้องถอยออกมานิดให้ตรงกับ Healer และ Range\n"
     "กลุ่ม Tank/Healer เดิม: ด้านหลังซ้ายของบอส / กลุ่ม DPS เดิม: ด้านหลังขวาของบอส\n\n"
     "บอสจบด้วย Shockwave Pulsar อีกครั้ง แล้วร่าย Memory's End เป็น enrage: ต้องตีบอสให้ต่ำกว่า 20.0% จึงไปต่อได้\n\n"
     "Mitigate Shockwave Pulsar: H1 120s / H2 120s (mitigate 20 วินาที กดก่อนร่ายเสร็จ จะคลุม Memory's End ด้วย)\n"
     "Mitigate Memory's End: H2 30s / D1",
     "The third Dark Water III: resolve it near the boss\n"
     "Melee can use gap closers but must back out a little to meet the healers and range\n"
     "Base tank/healer group: boss's back-left / base DPS group: boss's back-right\n\n"
     "The boss ends with another Shockwave Pulsar, then casts Memory's End as the enrage: she must be under 20.0% to advance\n\n"
     "Mitigate Shockwave Pulsar: H1 120s / H2 120s (20s mitigation just before the cast also covers Memory's End)\n"
     "Mitigate Memory's End: H2 30s / D1",
     strict=False, pic=T("apocalypse_14"), scene=S.ap14())
