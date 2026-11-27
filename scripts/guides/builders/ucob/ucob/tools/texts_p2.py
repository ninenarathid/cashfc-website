"""P2 Nael deus Darnus (Tuufless 02_nael), in Thai and English."""
from refs import R

P2 = ("P2 Nael deus Darnus", "P2 Nael deus Darnus")
STEPS = []


def st(mech, name, note, img=None, scene=None, strict=False, says=None, refs=None):
    STEPS.append(dict(phase=P2, mech=mech, name=name, note=note, img=img, scene=scene, strict=strict, says=says, refs=refs))


st("Bahamut's Favor", ("ภาพรวม: จังหวะเร็ว 2 วงจรไม่ตรงกัน", "Overview: fast, and two loops out of step"),
   ("Nael มีคำพูด 3 ประโยคก่อนถึง Cauterize แต่มีวงจร Fire / Ice / Thunder ถึง 4 รอบ: สองวงจรนี้จึงไม่เดินพร้อมกัน\n"
    "จังหวะของ Nael เร็วกว่า Twintania และไฟต์ทั่วไปอย่างเห็นได้ชัด: ภาพในขั้นต่อๆ ไปเกิดต่อกันรวดเร็ว\n\n"
    "Nael บอกท่าที่จะใช้ล่วงหน้าด้วยประโยคที่พูด: คำสำคัญในประโยคบอกท่าและลำดับ (ดูขั้นถัดไป)",
    "Nael has three lines before Cauterize but four Fire / Ice / Thunder cycles, so the two loops don't move together\n"
    "Her tempo is noticeably faster than Twintania's or most fights: the pictures that follow resolve one after another quickly\n\n"
    "She telegraphs her attacks with a spoken line: its key words give the attacks and their order (next step)"))

st("Bahamut's Favor", ("คำพูดของ Nael ช่วงนี้", "Nael's quotes in this phase"),
   ("O hallowed moon, take fire and scorch my foes!\n→ Lunar Dynamo → Thermionic Beam (เข้าใน → stack)\n"
    "O hallowed moon, shine you the iron path!\n→ Lunar Dynamo → Iron Chariot (เข้าใน → ออกนอก)\n"
    "Take fire, O hallowed moon!\n→ Thermionic Beam → Lunar Dynamo (stack → เข้าใน)\n"
    "Blazing path, lead me to iron rule!\n→ Thermionic Beam → Iron Chariot (stack → ออกนอก)\n"
    "From on high I descend, the hallowed moon to call!\n→ Raven Dive → Lunar Dynamo (spread → เข้าใน)\n"
    "From on high I descend, the iron path to call! / ...to walk!\n→ Raven Dive → Iron Chariot (spread → ออกนอก)\n"
    "Fleeting light! 'Neath the red moon, scorch you the earth!\n→ Dalamud Dive → Thermionic Beam (tankbuster → stack)\n"
    "Fleeting light! Amid a rain of stars, exalt you the red moon!\n→ Meteor Stream → Dalamud Dive (spread → tankbuster)",
    "O hallowed moon, take fire and scorch my foes!\n→ Lunar Dynamo → Thermionic Beam (in → stack)\n"
    "O hallowed moon, shine you the iron path!\n→ Lunar Dynamo → Iron Chariot (in → out)\n"
    "Take fire, O hallowed moon!\n→ Thermionic Beam → Lunar Dynamo (stack → in)\n"
    "Blazing path, lead me to iron rule!\n→ Thermionic Beam → Iron Chariot (stack → out)\n"
    "From on high I descend, the hallowed moon to call!\n→ Raven Dive → Lunar Dynamo (spread → in)\n"
    "From on high I descend, the iron path to call! / ...to walk!\n→ Raven Dive → Iron Chariot (spread → out)\n"
    "Fleeting light! 'Neath the red moon, scorch you the earth!\n→ Dalamud Dive → Thermionic Beam (tankbuster → stack)\n"
    "Fleeting light! Amid a rain of stars, exalt you the red moon!\n→ Meteor Stream → Dalamud Dive (spread → tankbuster)"),
   refs=R("nael_quote"))

st("Bahamut's Favor", ("①: MT ดึง Nael กลางสนาม หันเหนือ", "①: the MT centres Nael facing north"),
   ("หลัง Bahamut's Claw จบ MT ใช้ Provoke ดึง Nael มาไว้กลางสนาม หันหน้าไปทางเหนือ",
    "After Bahamut's Claw ends, the MT Provokes Nael, centres her and faces her north"),
   img="02_nael_1_1", scene="na11", says={"MT": ("Provoke หลัง Bahamut's Claw แล้วดึง Nael ไว้กลาง หันเหนือ", "Provoke after Bahamut's Claw; centre her facing north")})

st("Bahamut's Favor", ("②: Bahamut's Favor: มังกร 5 ตัวรอบสนาม", "②: Bahamut's Favor: five dragons around the room"),
   ("Nael ร่าย Bahamut's Favor เรียกมังกร 5 ตัวมาอยู่รอบสนาม: Mechanic ส่วนใหญ่ต่อจากนี้มาจากมังกรพวกนี้\n\n"
    "Fire / Ice:\n"
    "มังกรตัวหนึ่งโยงสาย (tether) ไปหาผู้เล่นสุ่มเป็นระยะ แล้วยิง AoE ไฟใส่คนนั้น: ทุกคนในวงติด debuff Fire (Firescorched)\n"
    "มังกรอีกตัวไล่ใส่ debuff Ice (Icebitten) ทีละคนตามรายชื่อปาร์ตี้\n"
    "Fire กับ Ice หักล้างกัน / โดนธาตุเดิมซ้ำตอนยังติดอยู่ = ตาย\n\n"
    "Doom / Wings of Salvation:\n"
    "มังกรตัวหนึ่งใส่ Doom 2–3 คน หมดเวลาแล้วตาย หมดทีละคนที่ 6 / 11 / 16 วินาที\n"
    "อีกตัวยิง Wings of Salvation (AoE ขาว) ใส่ผู้เล่นสุ่ม 1 ครั้งต่อ Doom 1 อัน ทิ้งวงขาวเล็กไว้\n"
    "แก้ Doom ได้ทางเดียว: เดินเข้าวงขาวเล็กนั้น และต้องแก้ตามลำดับเวลา\n\n"
    "Thunderstruck: มังกรตัวสุดท้ายใส่ debuff Thunder ผู้เล่นสุ่ม 2 คนเป็นระยะ ระเบิดเป็นวงรอบตัว คนอื่นที่โดนจะชา (paralyze)",
    "Nael casts Bahamut's Favor, summoning five dragons around the room; they drive most of what follows\n\n"
    "Fire / Ice:\n"
    "One dragon tethers a random player now and then, then hits them with a fire AoE: everyone in it gets Fire (Firescorched)\n"
    "Another cycles through the party list giving Ice (Icebitten)\n"
    "Fire and Ice cancel / the same element again while you have it = death\n\n"
    "Doom / Wings of Salvation:\n"
    "One dragon Dooms 2–3 players; they die when it runs out, one by one at 6 / 11 / 16 seconds\n"
    "Another hits a random player with Wings of Salvation (a white AoE) once per Doom, leaving a small white puddle\n"
    "The only cure is stepping into that puddle, and the Dooms must be cleansed in order\n\n"
    "Thunderstruck: the last dragon gives two random players Thunder now and then; it goes off around them and paralyses anyone else hit"),
   img="02_nael_1_2", scene="na12", refs=R("dragons"))

# ------------------------------------------------------------------ first line
st("Lunar Dynamo", ("ประโยคที่ 1 ③: Lunar Dynamo + Thunder", "Line 1 ③: Lunar Dynamo + Thunder"),
   ("ลำดับประโยคที่ 1: Lunar Dynamo + Thunder > Iron Chariot หรือ Thermionic Beam > Wings of Salvation 1 + Fire (รับ) > Wings of Salvation 2 > Bahamut's Claw\n\n"
    "ประโยคแรกเป็น Lunar Dynamo → Iron Chariot หรือ Lunar Dynamo → Thermionic Beam\n"
    "ผู้เล่นสุ่ม 2 คนโดน debuff Thunder: แยกออกจากปาร์ตี้ แต่ยังอยู่ในวงปลอดภัยของ Lunar Dynamo (ใกล้ Nael)\n"
    "ลำดับซ้าย–ขวา: ซ้าย MT > ST > H1 > H2 > D1 > D2 > D3 > D4 ขวา (คนที่อยู่ก่อนในลำดับไปซ้าย)",
    "Line 1's order: Lunar Dynamo + Thunder > Iron Chariot or Thermionic Beam > Wings of Salvation 1 + Fire (taken) > Wings of Salvation 2 > Bahamut's Claw\n\n"
    "The first line is Lunar Dynamo → Iron Chariot or Lunar Dynamo → Thermionic Beam\n"
    "Two random players get Thunder: they leave the party but stay inside Lunar Dynamo's safe zone (close to Nael)\n"
    "Left–right priority: left MT > ST > H1 > H2 > D1 > D2 > D3 > D4 right (the earlier one goes left)"),
   img="02_nael_1_3", scene="na13", refs=R("lunar_dynamo"))

st("Thermionic Beam", ("④ ถ้าเป็น Thermionic Beam: stack", "④ If Thermionic Beam: stack"),
   ("หลัง Lunar Dynamo ถ้าเป็น Thermionic Beam: ทุกคน stack รวมกันรับ\nสาย Fire จากมังกรโยงมาที่ปาร์ตี้",
    "After Lunar Dynamo, if it's Thermionic Beam: everyone stacks to share it\nThe Fire dragon's tether reaches the party"),
   img="02_nael_1_4a", scene="na14a")

st("Iron Chariot", ("④ ถ้าเป็น Iron Chariot: ออกห่าง Nael", "④ If Iron Chariot: move away from Nael"),
   ("หลัง Lunar Dynamo ถ้าเป็น Iron Chariot: ทุกคนเดินออกห่าง Nael ให้พ้นวง",
    "After Lunar Dynamo, if it's Iron Chariot: everyone moves away from Nael, out of the circle"),
   img="02_nael_1_4b", scene="na14b", refs=R("iron_chariot"))

st("Wings of Salvation", ("⑤: หลบ AoE ขาวพร้อมกัน รับ Fire ทั้งปาร์ตี้", "⑤: dodge the white AoE together, all take the Fire"),
   ("หลบ AoE ขาว (Wings of Salvation) ไปพร้อมกันทั้งปาร์ตี้ในจังหวะเดียว ให้ทุกคนอยู่ในวง Fire (Fireball) ด้วยกัน",
    "Dodge the white AoE (Wings of Salvation) together in one movement, so the whole party is inside the Fire (Fireball)"),
   img="02_nael_1_5", scene="na15", refs=R("wings_fire"))

st("Wings of Salvation", ("⑥: หลบ AoE ขาวลูกที่ 2: Doom 6 วิแก้", "⑥: dodge the second white AoE: 6 s Doom cleanses"),
   ("หลบ AoE ขาวลูกที่ 2\nคนติด Doom 6 วินาที: เข้าวงขาวที่ลูกแรกทิ้งไว้ แก้ Doom",
    "Dodge the second white AoE\nThe 6 s Doom: step into the puddle the first one left to cleanse"),
   img="02_nael_1_6", scene="na16", refs=R("doom_cleanse"))

st("Wings of Salvation", ("⑦: Doom 10 วิแก้", "⑦: 10 s Doom cleanses"),
   ("Wings of Salvation ลูกที่ 2 ระเบิด ทิ้งวงขาววงที่ 2\nคนติด Doom 10 วินาที: เข้าวงนี้แก้ Doom",
    "The second Wings of Salvation goes off, leaving a second white puddle\nThe 10 s Doom: step into it to cleanse"),
   img="02_nael_1_7", scene="na17")

st("Bahamut's Claw", ("⑧: Bahamut's Claw ใส่ MT", "⑧: Bahamut's Claw on the MT"),
   ("Nael ใช้ Bahamut's Claw 5 hit ใส่ MT", "Nael does a five-hit Bahamut's Claw on the MT"),
   img="02_nael_1_8", scene="na18")

# ------------------------------------------------------------------ second line
st("Fireball", ("ประโยคที่ 2 ⑨: Fire รอบ 2: รับคนเดียว", "Line 2 ⑨: the second Fire: taken alone"),
   ("ลำดับประโยคที่ 2 (ช่วงที่วุ่นที่สุดของเฟสนี้): Fire (หลบ) > Thunder > Thermionic Beam > Lunar Dynamo หรือ Iron Chariot > Wings of Salvation 1 > 2 > 3 + Thunder > Fire (รับ) > Bahamut's Claw\n\n"
    "สาย Fire รอบที่ 2 โผล่\n"
    "คนโดน Fire รอบ 2: ออกห่างปาร์ตี้ รับ Fire คนเดียว\n"
    "คนอื่น: ถ้าติด Icebitten (พลาด Fire รอบแรก) ไปรับ Fire กับคนนี้เพื่อลบ Ice",
    "Line 2's order (the most hectic part of the phase): Fire (dodged) > Thunder > Thermionic Beam > Lunar Dynamo or Iron Chariot > Wings of Salvation 1 > 2 > 3 + Thunder > Fire (taken) > Bahamut's Claw\n\n"
    "The second Fire tether appears\n"
    "The second Fire: leave the party and take the Fireball alone\n"
    "Everyone else: if you have Icebitten (you missed the first Fire), share it with them to clear the Ice"),
   img="02_nael_1_9", scene="na19", refs=R("fire_solo"))

st("Thunderstruck", ("⑩: ประโยคที่ 2 + Thunder ระเบิด", "⑩: line 2 begins + the Thunders go off"),
   ("ประโยคที่ 2 เป็น Thermionic Beam → Lunar Dynamo หรือ Thermionic Beam → Iron Chariot\n"
    "พร้อมกันนั้น debuff Thunder 2 คนระเบิด\n"
    "คนติด Thunder: ออกห่างปาร์ตี้ และอย่ายืนทับกันเอง",
    "Line 2 is Thermionic Beam → Lunar Dynamo or Thermionic Beam → Iron Chariot\n"
    "At the same time the two Thunders go off\n"
    "Thunder: stand away from the party, and not on top of each other"),
   img="02_nael_2_1", scene="na21")

st("Thermionic Beam", ("⑪: Thermionic Beam: stack กลาง", "⑪: Thermionic Beam: stack in the middle"),
   ("ท่าแรกของประโยคที่ 2: stack กลางสนามรับ Thermionic Beam", "The first part of line 2: stack in the middle for Thermionic Beam"),
   img="02_nael_2_2", scene="na22", refs=R("thermionic"))

st("Lunar Dynamo", ("⑫ ถ้าเป็น Lunar Dynamo: อยู่ใน stack ต่อ", "⑫ If Lunar Dynamo: stay in, stacked"),
   ("ท่าที่สองของประโยคที่ 2 ถ้าเป็น Lunar Dynamo: อยู่ข้างใน stack กันต่อ", "Line 2's second part, if Lunar Dynamo: stay in and stacked"),
   img="02_nael_2_3a", scene="na23a")

st("Iron Chariot", ("⑫ ถ้าเป็น Iron Chariot: ถอยออก", "⑫ If Iron Chariot: move back"),
   ("ท่าที่สองของประโยคที่ 2 ถ้าเป็น Iron Chariot: ถอยออกห่าง Nael", "Line 2's second part, if Iron Chariot: move back from Nael"),
   img="02_nael_2_3b", scene="na23b")

st("Wings of Salvation", ("⑬: Wings of Salvation 1 + Doom 3 คน", "⑬: Wings of Salvation 1 + three Dooms"),
   ("Wings of Salvation ลูกแรกลง พร้อม Doom 3 คน: 6 / 10 / 14 วินาที",
    "The first Wings of Salvation resolves, with three Dooms: 6 / 10 / 14 seconds"),
   img="02_nael_2_4", scene="na24")

st("Wings of Salvation", ("⑭: Wings 2 + Thunder: Doom 6 วิแก้", "⑭: Wings 2 + Thunder: 6 s Doom cleanses"),
   ("Wings of Salvation ลูกที่ 2 ลง\nผู้เล่นสุ่ม 2 คนโดน Thunderstruck\nคนติด Doom 6 วินาที: เข้าวงขาวแก้ Doom",
    "The second Wings of Salvation resolves\nTwo random players get Thunderstruck\nThe 6 s Doom: cleanse in the white puddle"),
   img="02_nael_2_5", scene="na25")

st("Wings of Salvation", ("⑮: Wings 3 + Thunder ระเบิด + สาย Fire: Doom 10 วิแก้", "⑮: Wings 3 + Thunders + a Fire tether: 10 s Doom cleanses"),
   ("Wings of Salvation ลูกที่ 3 ลงพร้อม Thunder 2 คนระเบิด\nมังกรไฟโยงสาย Fireball ไปที่ผู้เล่นสุ่ม\nคนติด Doom 10 วินาที: เข้าวงขาวแก้ Doom",
    "The third Wings of Salvation resolves with the two Thunders\nThe Fire dragon tethers a random player for Fireball\nThe 10 s Doom: cleanse in the white puddle"),
   img="02_nael_2_6", scene="na26")

st("Wings of Salvation", ("⑯: Doom 14 วิแก้", "⑯: 14 s Doom cleanses"),
   ("คนติด Doom 14 วินาที: เข้าวงขาวแก้ Doom", "The 14 s Doom: cleanse in the white puddle"),
   img="02_nael_2_7", scene="na27")

st("Fireball", ("⑰: Fire รอบ 3: ทุกคนรับ ยกเว้นคน Fire รอบ 2", "⑰: the third Fire: all take it except the second Fire"),
   ("Fireball รอบที่ 3 ลง\nทุกคน stack รับเพื่อติด Firescorched ยกเว้นคนที่โดน Fire รอบที่ 2",
    "The third Fireball resolves\nEveryone stacks to get Firescorched, except the player who was the second Fire"),
   img="02_nael_2_8", scene="na28")

st("Bahamut's Claw", ("⑱: กระจายรอประโยคที่ 3 + Bahamut's Claw", "⑱: spread for line 3 + Bahamut's Claw"),
   ("กระจายตัวเตรียมรับประโยคที่ 3 ตามตำแหน่งใน macro (รอบ Nael):\n"
    "MT ST หน้า Nael / D1 D2 หลัง Nael\n"
    "Range (H1 H2 D3 D4) ดูกันเองแล้วกระจายให้เหมาะ\n\n"
    "Nael ใช้ Bahamut's Claw ใส่ MT\n\n"
    "ระวัง: ทุก Mechanic อาจลงคนเดียวกันพร้อมกันได้",
    "Spread for line 3 as in the macro (around Nael):\n"
    "MT ST in front of her / D1 D2 behind her\n"
    "Ranged (H1 H2 D3 D4) spread out as appropriate\n\n"
    "Nael Bahamut's Claws the MT\n\n"
    "Careful: every mechanic can land on the same player"),
   img="02_nael_2_9", scene="na29", strict=["MT", "ST", "D1", "D2"])

# ------------------------------------------------------------------ third line
st("Raven Dive", ("ประโยคที่ 3 ⑲: Raven Dive + สาย Fire", "Line 3 ⑲: Raven Dive + a Fire tether"),
   ("ลำดับประโยคที่ 3: spread > Lunar Dynamo หรือ Iron Chariot > Wings of Salvation 1 + Fire → Thunder > Wings 2 > Wings 3 > Ravensbeak\n\n"
    "ประโยคที่ 3 เป็น Raven Dive → Lunar Dynamo หรือ Raven Dive → Iron Chariot\n"
    "Nael พุ่งใส่ผู้เล่นสุ่ม 1 คน: คนอื่นที่โดนวงจะกระเด็นตกสนาม (ใช้ Arm's Length / Surecast กันไม่ได้)\n"
    "มังกรไฟโยงสายไปที่ผู้เล่นสุ่มด้วย",
    "Line 3's order: spread > Lunar Dynamo or Iron Chariot > Wings of Salvation 1 + Fire → Thunder > Wings 2 > Wings 3 > Ravensbeak\n\n"
    "Line 3 is Raven Dive → Lunar Dynamo or Raven Dive → Iron Chariot\n"
    "Nael dives on a random player: anyone else in the circle is knocked out of the arena (Arm's Length / Surecast don't work)\n"
    "The Fire dragon also tethers a random player"),
   img="02_nael_3_1", scene="na31", strict=["MT", "ST", "D1", "D2"], refs=R("raven_dive"))

st("Lunar Dynamo", ("⑳ ถ้าเป็น Lunar Dynamo: เข้าหา Nael", "⑳ If Lunar Dynamo: move close to Nael"),
   ("ท่าที่สองของประโยคที่ 3 ถ้าเป็น Lunar Dynamo: เข้าใกล้ Nael\nผู้เล่นสุ่ม 2 คนโดน Thunderstruck",
    "Line 3's second part, if Lunar Dynamo: move close to Nael\nTwo random players get Thunderstruck"),
   img="02_nael_3_2a", scene="na32a")

st("Iron Chariot", ("⑳ ถ้าเป็น Iron Chariot: ออกห่าง Nael", "⑳ If Iron Chariot: move away from Nael"),
   ("ท่าที่สองของประโยคที่ 3 ถ้าเป็น Iron Chariot: ออกห่าง Nael\nผู้เล่นสุ่ม 2 คนโดน Thunderstruck",
    "Line 3's second part, if Iron Chariot: move away from Nael\nTwo random players get Thunderstruck"),
   img="02_nael_3_2b", scene="na32b")

st("Fireball", ("㉑: Fire รอบ 4 + Wings ลูกแรกโผล่", "㉑: the fourth Fire + the first Wings appears"),
   ("Fire รอบที่ 4 ลงตอนที่ Wings of Salvation ลูกแรกโผล่", "The fourth Fire resolves as the first Wings of Salvation appears"),
   img="02_nael_3_3", scene="na33")

st("Wings of Salvation", ("㉒: ติด Fire แล้วหลบ Wings / คน Thunder ออกไกล", "㉒: get the Fire, then dodge Wings / Thunder go far"),
   ("อยู่ใน stack แค่พอให้ติด debuff Fire แล้วหลบ Wings of Salvation\n"
    "คนไม่มี Thunder: หลบเข้าหา Nael แต่หยุดตรงขอบนอกวง Wings\n"
    "คนมี Thunder: วิ่งออกไกลจาก Nael (และจากปาร์ตี้)",
    "Stay stacked just long enough to get the Fire debuff, then dodge Wings of Salvation\n"
    "No Thunder: dodge toward Nael, stopping just outside the Wings circle\n"
    "Thunder: move far away from Nael (and so from the party)"),
   img="02_nael_3_4", scene="na34")

st("Wings of Salvation", ("㉓: Wings 2: Doom 6 วิแก้", "㉓: Wings 2: 6 s Doom cleanses"),
   ("Wings of Salvation ลูกที่ 2 โผล่\nคนติด Doom 6 วินาที: แก้ Doom", "The second Wings of Salvation appears\nThe 6 s Doom: cleanse"),
   img="02_nael_3_5", scene="na35")

st("Wings of Salvation", ("㉔: Wings 3: Doom 10 วิแก้", "㉔: Wings 3: 10 s Doom cleanses"),
   ("Wings of Salvation ลูกที่ 3 โผล่\nคนติด Doom 10 วินาที: แก้ Doom", "The third Wings of Salvation appears\nThe 10 s Doom: cleanse"),
   img="02_nael_3_6", scene="na36")

st("Wings of Salvation", ("㉕: MT ดึง Nael กลับกลาง: Doom 14 วิแก้", "㉕: the MT recentres Nael: 14 s Doom cleanses"),
   ("MT ดึง Nael กลับมากลางสนาม หันเหนือ\nคนติด Doom 14 วินาที: แก้ Doom",
    "The MT recentres Nael, facing north\nThe 14 s Doom: cleanse"),
   img="02_nael_3_7", scene="na37", says={"MT": ("ดึง Nael กลับกลางสนาม หันเหนือ", "Recentre Nael, facing north")})

st("Ravensbeak", ("㉖: Ravensbeak: สลับ Tank", "㉖: Ravensbeak: tank swap"),
   ("Nael ใช้ Ravensbeak ใส่ MT: tankbuster เดี่ยวที่ทิ้ง Piercing Resistance Down II: ต้องสลับ Tank",
    "Nael Ravensbeaks the MT: a single-target tankbuster that leaves Piercing Resistance Down II, forcing a tank swap"),
   img="02_nael_3_8", scene="na38", says={"ST": ("Provoke ต่อหลัง Ravensbeak", "Provoke after Ravensbeak")}, refs=R("ravensbeak"))

# ------------------------------------------------------------------ fourth line: Cauterize
st("Cauterize", ("ประโยคที่ 4: หลักการล่อ divebomb", "Line 4: how the divebombs work"),
   ("ประโยคที่ 4 ทำพร้อม divebomb ของมังกร\n"
    "ผู้เล่นสุ่ม 3 คน (ไม่ใช่ Tank ที่ถือ aggro) ได้มาร์กสีเขียว\n"
    "ตอนมาร์กหายไป มังกรจะล็อกจุดที่คนนั้นยืนอยู่ในขณะนั้น แล้วพุ่ง (dive) ไปทางนั้น\n\n"
    "dive มี 3 ชุด เรียง 2-1-2:\n"
    "ชุด 1: มังกร 2 ตัวแรกนับตามเข็มจากเหนือ (นับตัวที่เหนือด้วย)\n"
    "ชุด 2: ตัวที่ 3\n"
    "ชุด 3: 2 ตัวสุดท้าย\n\n"
    "เป้าหมาย: พา dive ออกห่างกลางสนามที่ปาร์ตี้อยู่\n"
    "Nael ทิ้ง Hypernova (พื้นม่วง) ใส่คนล่อ 2 คนแรกด้วย",
    "Line 4 is done together with the dragons' divebombs\n"
    "Three random players (not the tank holding Nael) get a green marker\n"
    "When a marker disappears, the diving dragons lock onto where that player stood at that moment and dive there\n\n"
    "Three dives, 2-1-2:\n"
    "Set 1: the first two dragons clockwise from north (north included)\n"
    "Set 2: the third dragon\n"
    "Set 3: the last two dragons\n\n"
    "The aim: send the dives away from the centre where the party is\n"
    "Nael also drops Hypernova (purple puddles) on the first two baiters"),
   refs=R("cauterize"))

st("Cauterize", ("㉗: ประโยคที่ 4 + มาร์ก divebomb อันแรก", "㉗: line 4 + the first divebomb marker"),
   ("ประโยคที่ 4 เป็น Meteor Stream → Dalamud Dive หรือ Dalamud Dive → Thermionic Beam (ประโยคแรกที่ท่าแรกไม่ตายตัว)\n"
    "พร้อมกันนั้นมาร์ก divebomb อันแรกขึ้นบนผู้เล่นที่ไม่ใช่ ST (ST ถือ aggro อยู่): คนนั้นวิ่งออกไปทางมังกร 2 ตัวแรก",
    "Line 4 is Meteor Stream → Dalamud Dive or Dalamud Dive → Thermionic Beam (the first line whose first attack isn't fixed)\n"
    "At the same time the first divebomb marker appears on a player other than the ST (who holds Nael): they run out toward the first two dragons"),
   img="02_nael_4_1", scene="na41")

st("Cauterize", ("㉘: มาร์ก 1 หาย + Hypernova / มาร์ก 2 ขึ้น", "㉘: marker 1 gone + Hypernova / marker 2 up"),
   ("มาร์กอันแรกหาย: จุด dive ชุดแรกถูกล็อก และ Nael ทิ้ง AoE 2 ลูกใส่คนนั้น (คนล่อเดินกลับเข้ากลาง)\n"
    "มาร์กอันที่ 2 ขึ้นบนอีกคน: วิ่งออกไปทางมังกรตัวที่ 3",
    "The first marker disappears: the first dive is locked, and Nael hits that player with two AoEs (the baiter walks back in)\n"
    "The second marker appears on another player: they run toward the third dragon"),
   img="02_nael_4_2", scene="na42")

st("Cauterize", ("㉙: มาร์ก 2 หาย + Hypernova / มาร์ก 3 ขึ้น", "㉙: marker 2 gone + Hypernova / marker 3 up"),
   ("มาร์กอันที่ 2 หาย: จุด dive ชุดที่ 2 ถูกล็อก และ Nael ทิ้ง AoE 2 ลูกใส่คนนั้น\n"
    "มาร์กอันที่ 3 ขึ้นบนอีกคน: วิ่งออกไปทางมังกร 2 ตัวสุดท้าย",
    "The second marker disappears: the second dive is locked, and Nael hits that player with two AoEs\n"
    "The third marker appears on another player: they run toward the last two dragons"),
   img="02_nael_4_3", scene="na43")

st("Cauterize", ("㉚: Nael หายไป: dive ชุดแรกลง", "㉚: Nael vanishes: the first dives land"),
   ("Nael หายไป แล้ว dive ชุดแรกลง\nมาร์กอันที่ 3 หาย: จุด dive ชุดที่ 3 ถูกล็อก",
    "Nael disappears and the first divebombs resolve\nThe third marker disappears, locking the third dive"),
   img="02_nael_4_4", scene="na44", refs=R("divebomb"))

st("Dalamud Dive", ("㉛ ถ้า Dalamud Dive มาก่อน: stack กลาง ห่าง ST", "㉛ If Dalamud Dive comes first: stack in the middle, away from the ST"),
   ("ท่าแรกของประโยคที่ 4 มี 2 แบบ:\n"
    "แบบนี้ (Dalamud Dive → Thermionic Beam): Dalamud Dive ลงที่ ST / ปาร์ตี้ stack กลางสนามไว้แบ่ง Thermionic Beam ที่จะตามมา\n"
    "ปาร์ตี้ต้องอยู่ห่าง ST\n"
    "dive ชุดแรกลงไปแล้ว: พื้นที่ฝั่งนั้นใช้ยืนได้",
    "Line 4's first part has two forms:\n"
    "This one (Dalamud Dive → Thermionic Beam): Dalamud Dive lands on the ST / the party stacks in the middle to share the Thermionic Beam that follows\n"
    "The party keeps away from the ST\n"
    "The first dive has already gone off, so that area is generally safe"),
   img="02_nael_4_5a", scene="na45a")

st("Meteor Stream", ("㉛ ถ้า Meteor Stream มาก่อน: กระจาย", "㉛ If Meteor Stream comes first: spread"),
   ("แบบ Meteor Stream → Dalamud Dive: กระจายตัวรับ Meteor Stream\n"
    "พื้นที่ dive ชุดแรกลงไปแล้ว ใช้กระจายได้ / อยู่ห่าง ST",
    "Meteor Stream → Dalamud Dive: spread for Meteor Stream\n"
    "The first dive's area has already resolved, so spread around it / keep away from the ST"),
   img="02_nael_4_5b", scene="na45b")

st("Thermionic Beam", ("㉜ ถ้าท่าที่ 2 เป็น Thermionic Beam: ST เข้า stack ด้วย", "㉜ If the second part is Thermionic Beam: the ST joins"),
   ("ท่าที่ 2 ของประโยคที่ 4: ปาร์ตี้ stack กลางสนาม ซึ่งหลบได้ทั้ง 2 แบบ (Dalamud Dive ใส่ ST หรือ stack Thermionic Beam)\n"
    "ถ้า Thermionic Beam มาทีหลัง: ST เข้ามาช่วยแบ่งดาเมจได้\n"
    "dive ชุดที่ 3 ลงตอนนี้",
    "Line 4's second part: the party stacks in the middle, which handles both (Dalamud Dive on the ST, or a Thermionic Beam stack)\n"
    "If Thermionic Beam is second, the ST can join to share it\n"
    "The third set of divebombs resolves now"),
   img="02_nael_4_6a", scene="na46a")

st("Dalamud Dive", ("㉜ ถ้าท่าที่ 2 เป็น Dalamud Dive: ปาร์ตี้ stack กลาง", "㉜ If the second part is Dalamud Dive: the party stacks in the middle"),
   ("Dalamud Dive ลงที่ ST / ปาร์ตี้ stack กลางสนามห่างจาก ST\ndive ชุดที่ 3 ลงตอนนี้",
    "Dalamud Dive lands on the ST / the party stacks in the middle away from the ST\nThe third set of divebombs resolves now"),
   img="02_nael_4_6b", scene="na46b", says={"ST": ("รับ Dalamud Dive (mitigate)", "Take the Dalamud Dive (mitigate)")})

st("Bahamut's Claw", ("㉝: Bahamut's Claw ใส่ ST", "㉝: Bahamut's Claw on the ST"),
   ("Nael ใช้ Bahamut's Claw 5 hit ใส่ ST เหมือนตอนเริ่มเฟส", "Nael does the five-hit Bahamut's Claw on the ST, as at the start of the phase"),
   img="02_nael_4_7", scene="na47")

st("Megaflare", ("ประโยคที่ 5 และ 6 + Megaflare", "Lines 5 and 6 + Megaflare"),
   ("ลำดับต่อจากนี้: ประโยคที่ 5 > ประโยคที่ 6 > Ravensbeak (สลับ Tank) > Bahamut's Claw (tankbuster 5 hit) > Megaflare (enrage)\n\n"
    "ประโยคที่ 5 และ 6 สุ่มจากประโยคที่ 1–3 แบบไหนก็ได้\n"
    "ตอนนี้มังกรหายไปแล้ว: ไม่ต้องสนใจ Fire / Ice / Thunder / Doom อีก จึงง่ายลงมาก",
    "From here: line 5 > line 6 > Ravensbeak (tank swap) > Bahamut's Claw (five-hit tankbuster) > Megaflare (enrage)\n\n"
    "Lines 5 and 6 are any random mix of lines 1–3\n"
    "The dragons are gone now, so no more Fire / Ice / Thunder / Doom: much simpler"))

st("Seventh Umbral Era", ("ช่วงเปลี่ยนไป Bahamut: LB Tank", "Into Bahamut: Tank LB"),
   ("ตอนนี้ควรมี LB Tank ระดับ 2 หรือ 3 ขึ้นกับว่าทำ Twintania กับ Nael ได้ดีแค่ไหน\n"
    "stack กันที่ Neurolink ใต้ (จุดเดียวกับตอนเข้า Nael) เตรียมรับ knockback\n\n"
    "มี LB2: กด LB Tank ก่อน knockback\n"
    "มี LB3: กด LB Tank ตอน knockback\n\n"
    "ลูกไฟยักษ์ระเบิดเป็น raid-wide 4 ครั้ง: เบา 3 ครั้ง (Calamitous Flame) แล้วแรง 1 ครั้ง (Calamitous Blaze)",
    "By now you should have a tank LB2 or LB3, depending on how Twintania and Nael went\n"
    "Stack at the south Neurolink (where you stacked going into Nael) for a knockback\n\n"
    "With LB2: tank LB before the knockback\n"
    "With LB3: tank LB at the knockback\n\n"
    "The giant fireball pulses four raid-wides: three weak (Calamitous Flame), then one strong (Calamitous Blaze)"),
   refs=R("seventh_umbral"))

st("Seventh Umbral Era", ("เก็บ LB3 ต่อไปใช้ (สำหรับซ้อม Bahamut)", "Keeping LB3 (for practising Bahamut)"),
   ("ถ้ามี LB3 ตอนจบ Nael การโกง Seventh Umbral Era ให้เริ่ม Quickmarch Trio ด้วย LB3 (หรือเกือบเต็ม) ช่วยตอนซ้อม Bahamut: ใช้ LB3 Healer กู้รอบที่ควรจะ wipe ได้\n\n"
    "LB ขึ้นเมื่อมีคนโดนดาเมจถึงตายแต่รอดเพราะ barrier หรือ mitigate (ที่นี่คือ LB3 Tank) เหมือน stack Fireball 5 คนตอน Twintania\n"
    "ดาเมจ knockback ของ Seventh Umbral Era ขึ้นกับระยะจากกลางสนาม\n"
    "เป้า: ให้ HP ลงเหลือราว 4–6k ซึ่ง Calamitous Flame จะฆ่าได้ถ้าไม่มี LB3 Tank / ถ้าโดนน้อยไป ลองไม่ใส่ barrier หรือยืนใกล้ขึ้น\n"
    "มี LB3 Tank (ลด 80%): Calamitous Flame ครั้งละราว 1.3k / Calamitous Blaze เกือบ 5.5k\n"
    "Healer เริ่มร่าย heal ให้ทัน Blaze แต่ระวังคนที่ HP ต่ำกว่า 4k หลัง knockback อาจตายจาก Flame 3 ครั้ง",
    "If you have LB3 at the end of Nael, cheesing Seventh Umbral Era so Quickmarch Trio starts with LB3 (or close) helps while learning Bahamut: a healer LB3 can save runs that would wipe\n\n"
    "LB builds when someone takes lethal damage but survives through shields or mitigation (here, the tank LB3), like Twintania's five-man Fireball\n"
    "Seventh Umbral Era's knockback damage depends on how close to the centre you are\n"
    "The goal: drop to about 4–6k HP, which Calamitous Flame would kill without the tank LB3 / if you take too little, drop shields or stand closer\n"
    "With tank LB3 (80% mitigation) each Calamitous Flame hits about 1.3k and Calamitous Blaze a little under 5.5k\n"
    "Healers start a heal in time for the Blaze, but watch anyone under 4k after the knockback: the three Flames may kill them"))
