"""Setup + P1 Twintania (Tuufless: overview, markers, 01_twintania), in Thai and English."""
from refs import R

P0 = ("เตรียมตัว", "Setup")
P1 = ("P1 Twintania", "P1 Twintania")
STEPS = []


def st(phase, mech, name, note, img=None, scene=None, strict=False, says=None, refs=None, plan=None):
    STEPS.append(dict(phase=phase, mech=mech, name=name, note=note, img=img, scene=scene, strict=strict, says=says,
                      refs=refs, plan=plan))


# ------------------------------------------------------------------ setup
st(P0, "Waymarks", ("Marker ของ PF (Elemental)", "The PF waymarks (Elemental)"),
   ("ตำแหน่งตามชุด marker ของ Tuufless (ใช้ได้กับ WaymarkPresetPlugin):\n"
    "1 / 2 / 3 = จุดวาง Neurolink: 1 ตะวันตกเฉียงเหนือ / 2 ตะวันออกเฉียงเหนือ / 3 ใต้ (สามเหลี่ยมคว่ำ: PF ต่างจากแผนของ Clees ตรงนี้)\n"
    "4 = กลางสนาม\n"
    "A / B / C / D = ขอบสนามฝั่งเหนือ ไว้ล่อ Earthshaker ใน Tenstrike Trio\n\n"
    "Twintania: 1 2 3 คือ Neurolink / 3 คือจุด stack ก่อนเข้า Nael\n"
    "Nael: 3 คือจุด stack ก่อนเข้า Bahamut / 4 คือจุด stack รับ Thermionic Beam และสาย Fire\n"
    "Bahamut Prime: 1 2 3 คือจุดที่บอสโผล่ใน Fellruin Trio และเป็นเส้นบอกระยะ knockback ใน Heavensfall Trio\n"
    "3 คือจุดปลอดภัยของ Tenstrike Trio (ควรเป็น marker สี่เหลี่ยม ให้ 4 คนใช้ 4 มุมบอกทิศ Earthshaker รอบสอง)\n"
    "4 คือจุด stack ตอนเริ่ม Blackfire Trio และตอนจบ Heavensfall Trio และใช้ดูว่า Bahamut อยู่ทิศหลักหรือทิศเฉียงใน Grand Octet (ด้านของสี่เหลี่ยม = ทิศหลัก มุม = ทิศเฉียง)\n"
    "Golden Bahamut: 3 คือจุดที่ Tank stack รับ Akh Morn ครั้งแรก",
    "Positions from Tuufless's marker set (works with WaymarkPresetPlugin):\n"
    "1 / 2 / 3 = the Neurolink spots: 1 north-west / 2 north-east / 3 south (an inverted triangle: here PF differs from Clees' plan)\n"
    "4 = the centre\n"
    "A / B / C / D = the north edge, for baiting Earthshakers in Tenstrike Trio\n\n"
    "Twintania: 1 2 3 are the Neurolinks / 3 is the stack spot before Nael\n"
    "Nael: 3 is the stack spot before Bahamut / 4 is the stack spot for Thermionic Beam and the Fire tethers\n"
    "Bahamut Prime: 1 2 3 are where the bosses spawn in Fellruin Trio, and the knockback boundary in Heavensfall Trio\n"
    "3 is Tenstrike Trio's safe spot (best as a square marker, so four players use its corners to call their second Earthshaker)\n"
    "4 is the stack spot at the start of Blackfire Trio and the end of Heavensfall Trio, and tells whether Bahamut is on a cardinal or an intercardinal in Grand Octet (square's edge = cardinal, corner = intercardinal)\n"
    "Golden Bahamut: 3 is where the tanks stack for the first Akh Morn"),
   img="markers", scene="waymarks")

st(P0, "Gear and potions", ("เตรียมของก่อนเข้า", "Before you go in"),
   ("ไฟต์นี้ sync ไอเทมเลเวลที่ IL345\n"
    "ชุดที่ IL470 ขึ้นไป ค่าสถานะรองจะเต็มเพดานแล้ว\n"
    "อาวุธ relic ค่าสถานะรองตันที่ 127\n"
    "ยาที่ต่ำสุดแต่ยังได้ผลเต็ม: HQ Grade 3 Tincture\n\n"
    "debuff Damage Down ของไฟต์นี้ (โดนเมื่อทำ Mechanic พลาด ซึ่งมีไม่กี่อัน) ทำให้ดาเมจที่เราทำลดลง 50%",
    "The fight syncs item level to IL345\n"
    "Gear at IL470 or above has its substats capped\n"
    "Relic weapons have their substats capped at 127\n"
    "The lowest potions that still give the full effect: HQ Grade 3 Tinctures\n\n"
    "This fight's Damage Down (from the few mechanics that give it on a failure) lowers your damage by 50%"))

# ------------------------------------------------------------------ P1 part 1
st(P1, "Plummet", ("ช่วงที่ 1 (HP 100–75%) ①: ดึงบอสไป marker ตะวันตกเฉียงเหนือ", "Part 1 (100–75% HP) ①: pull to the north-west marker"),
   ("Twintania ช่วงนี้แบ่งเป็น 3 ช่วงย่อยตาม HP ของบอส ช่วงแรกจบเมื่อ HP ต่ำกว่า 75%\n\n"
    "MT ดึงบอสไปไว้บน marker ตะวันตกเฉียงเหนือ แล้วหันหัวบอสออกจากปาร์ตี้ ให้ Plummet (กรวยหน้าบอส) โดนแค่ Tank\n"
    "คนอื่นยืนกระจาย แต่ทุกคนยกเว้น Tank ต้องมีทางเดินโล่งไปหลังบอสได้ (ใช้ stack Fireball)",
    "Twintania splits into three parts by her HP; the first lasts until she drops below 75%\n\n"
    "The MT pulls her onto the north-west marker and points her away from the party, so Plummet (the frontal cone) hits only a tank\n"
    "Everyone else spreads out, but every non-tank needs a clear path to her rear (for the Fireball stack)"),
   img="01_twintania_1_1", scene="tw11", says={"MT": ("ดึงบอสไป marker ตะวันตกเฉียงเหนือ หันหัวออกจากปาร์ตี้", "Pull her to the north-west marker, facing away from the party")},
   refs=R("plummet"))

st(P1, "Fireball", ("②: Twister + Fireball stack 5 คน", "②: Twister + a five-man Fireball stack"),
   ("บอสติดมาร์ก Fireball ที่ผู้เล่น 1 คน (ไม่ใช่ Tank) แล้วร่าย Twister\n"
    "ทุกคนล่อ Twister ตรงที่ยืนอยู่ แล้วระหว่างนั้นทุกคนยกเว้น Tank กับ D3 ไป stack กันหลังบอส: แบ่งดาเมจ Fireball 5 คน\n\n"
    "D3 ไม่เข้า stack (ยกเว้น D3 เป็นเป้า Fireball เอง)\n"
    "D4 เข้า stack (ยกเว้นเป้าคือ D3 ซึ่งต้องเข้าเอง)\n\n"
    "ต้อง mitigate ถึงจะรอด: barrier / Sacred Soil หรือ Kerachole / Troubadour Tactician Shield Samba\n"
    "ห้ามใช้ debuff ใส่บอส (Reprisal, Feint, Addle): stack 5 คนตั้งใจให้ดาเมจถึงตาย แล้วรอดด้วย barrier กับ mitigate เพื่อเก็บ LB ถ้าใส่ debuff ดาเมจจะไม่ถึงตายและไม่ได้ LB\n"
    "ต้องมี LB Tank อย่างน้อยระดับ 2 ตอนเปลี่ยนจาก Nael เป็น Bahamut",
    "She marks one random non-tank for Fireball and casts Twister\n"
    "Everyone baits a Twister where they stand; meanwhile everyone but the tanks and D3 stacks behind her: five share the Fireball\n\n"
    "D3 stays out of the stack (unless D3 is the Fireball target)\n"
    "D4 joins the stack (unless the target is D3, who then goes in)\n\n"
    "It needs mitigation to survive: shields / Sacred Soil or Kerachole / Troubadour, Tactician, Shield Samba\n"
    "No debuffs on the boss (Reprisal, Feint, Addle): the five-man stack is meant to be lethal and survived through shields and mitigation, which builds LB; debuffs make it non-lethal and no LB comes\n"
    "The move from Nael to Bahamut needs at least a tank LB2"),
   img="01_twintania_1_2", scene="tw12",
   says={"D3": ("อยู่นอก stack (ถนอม HP ไว้ล่อ Liquid Hell) ยกเว้นเป็นเป้า Fireball", "Stay out (keep your HP for baiting Liquid Hell) unless you're the target"),
         "D4": ("เข้า stack ยกเว้นเป้าคือ D3", "Join the stack unless D3 is the target"),
         "MT": ("ไม่เข้า stack", "Stay out of the stack"), "ST": ("ไม่เข้า stack", "Stay out of the stack")},
   refs=R("twister", "fireball5"))

st(P1, "Death Sentence", ("③: Death Sentence แล้วสลับ Tank", "③: Death Sentence, then swap tanks"),
   ("Death Sentence: tankbuster เดี่ยว ทิ้ง debuff ที่ทำให้รับดาเมจฟันเพิ่ม: ต้องสลับ Tank\n"
    "แล้ววนกลับไปเริ่มที่ Plummet ใหม่ (MT กับ ST สลับหน้าที่กัน)\n"
    "ส่วนใหญ่ปาร์ตี้จะดัน HP บอสเข้าช่วงที่ 2 ก่อนได้เห็น Fireball รอบสอง",
    "Death Sentence: a single-target tankbuster that leaves a slashing vulnerability, so the tanks swap\n"
    "The loop then starts again from Plummet (MT and ST swapped)\n"
    "Most parties push her into part 2 before the second Fireball"),
   img="01_twintania_1_3", scene="tw13", says={"ST": ("Provoke ต่อจาก MT หลัง Death Sentence", "Provoke off the MT after Death Sentence")},
   refs=R("death_sentence"))

# ------------------------------------------------------------------ P1 part 2
st(P1, "Liquid Hell", ("ช่วงที่ 2 (HP 74–45%) ④: ดึงบอสไป marker ถัดไป", "Part 2 (74–45% HP) ④: pull to the next marker"),
   ("ช่วงที่ 2 เพิ่ม Liquid Hell กับ Hatch เข้ามา จบเมื่อ HP บอสต่ำกว่า 45%\n"
    "ดึงบอสไป marker ถัดไปตามเข็มนาฬิกา\n"
    "บอสทิ้ง Neurolink (วงม่วงบนพื้น) ไว้ที่จุดเดิม",
    "Part 2 adds Liquid Hell and Hatch, and ends when she drops below 45%\n"
    "Pull her clockwise to the next marker\n"
    "She leaves a Neurolink (the purple floor circle) where she was"),
   img="01_twintania_2_1", scene="tw21", says={"MT": ("ดึงบอสไป marker ถัดไปตามเข็ม", "Pull her clockwise to the next marker")})

st(P1, "Liquid Hell", ("⑤: Liquid Hell 5 ลูก: D3 ล่อ", "⑤: five Liquid Hells: D3 baits"),
   ("บอสร่าย Liquid Hell 5 ลูก ตกใส่ผู้เล่นสุ่มที่อยู่ห่างบอสเกิน 15 yalm (ถ้าไม่มีใครห่างเกิน จะสุ่มใครก็ได้)\n"
    "D3 ออกไปล่อ: เดินวนตามขอบสนาม ทิ้งกองไฟเป็นแนว\n"
    "คนอื่นยืนใกล้บอสไว้ จะได้ไม่โดน Liquid Hell เอง",
    "She casts five Liquid Hells, dropped on a random player more than 15 yalms away (if nobody is, a random player)\n"
    "D3 goes out to bait them, walking along the edge to lay the fire puddles in a line\n"
    "Everyone else stays near her so they don't take one"),
   img="01_twintania_2_2", scene="tw22", says={"D3": ("ล่อ Liquid Hell 5 ลูก เดินตามขอบสนาม", "Bait the five Liquid Hells along the edge")},
   refs=R("liquid_hell"))

st(P1, "Generate", ("⑥: Generate: ลูกบอลดำวิ่งหา DPS", "⑥: Generate: a black orb chases a DPS"),
   ("บอสร่าย Generate ติดมาร์ก (Hatch) ที่ DPS สุ่ม 1 คน\n"
    "ลูกบอลดำเกิดใต้บอสแล้ววิ่งไปหาคนที่โดนมาร์ก\n"
    "ทุกคนอย่าไปยืนในแนวระหว่างบอสกับ Neurolink: ลูกบอลชนใครก็ระเบิด",
    "She casts Generate, marking a random DPS (Hatch)\n"
    "A black orb spawns under her and moves to the marked player\n"
    "Keep clear of the line between her and the Neurolink, or the orb hits you"),
   img="01_twintania_2_3", scene="tw23", refs=R("generate"))

st(P1, "Hatch", ("⑦: รับลูกบอลใน Neurolink + Liquid Hell รอบสอง", "⑦: take the orb in the Neurolink + more Liquid Hells"),
   ("คนที่โดนมาร์กต้องให้ลูกบอลดำชนตอนยืนอยู่ใน Neurolink ที่บอสทิ้งไว้ ไม่อย่างนั้นปาร์ตี้ตาย\n"
    "ลูกบอลระเบิดเป็นวงรอบตัว: คนอื่นอยู่ห่างๆ\n"
    "คนที่โดนจะติด debuff Mana Hypersensitivity: รับลูกบอลลูกที่สองไม่ได้ (ยังไม่มีผลตอนนี้ แต่สำคัญในช่วงหลัง)\n\n"
    "ระหว่างนั้นบอสร่าย Liquid Hell อีก 5 ลูก: D3 ล่อเหมือนเดิม\n"
    "ถ้า D3 โดน Hatch เอง: H2 หรือ D4 ล่อ Liquid Hell ชุดนี้แทน (macro เขียนลำดับ D3 > H2)\n\n"
    "ถ้าลูกบอลวิ่งมาช้าจนต้องยืนในกองไฟ: คนรับอย่าเดินอ้อมให้ลูกบอลวิ่งโค้ง หรือ marker วาง Neurolink ห่างบอสเกินไป",
    "The marked player must be hit by the orb while standing in the Neurolink she left, or the raid wipes\n"
    "The orb explodes around itself: everyone else keeps away\n"
    "It gives Mana Hypersensitivity: that player can't take a second orb (nothing now, but it matters later)\n\n"
    "Meanwhile she casts five more Liquid Hells: D3 baits again\n"
    "If D3 has the Hatch: H2 or D4 baits this set instead (the macro writes D3 > H2)\n\n"
    "If the orb is so slow you end up in a fire puddle: the target is curving it too much, or the markers put the Neurolinks too far from her"),
   img="01_twintania_2_4", scene="tw24",
   says={"D3": ("ล่อ Liquid Hell ชุดที่สอง", "Bait the second set of Liquid Hells"),
         "H2": ("ถ้า D3 โดน Hatch: ล่อ Liquid Hell แทน (หรือ D4)", "If D3 has Hatch: bait the Liquid Hells instead (or D4)"),
         "D4": ("ถ้า D3 โดน Hatch: ล่อ Liquid Hell แทน (หรือ H2)", "If D3 has Hatch: bait the Liquid Hells instead (or H2)")},
   refs=R("hatch_neuro"))

st(P1, "Death Sentence", ("⑧: Death Sentence: สลับ Tank", "⑧: Death Sentence: swap tanks"),
   ("บอสใช้ Death Sentence ใส่ Tank ที่ถือ aggro อยู่\nMT กับ ST สลับ Tank",
    "She uses Death Sentence on the tank holding her\nThe MT and ST swap"),
   img="01_twintania_2_5", scene="tw25")

st(P1, "Hatch", ("⑨: Hatch ใส่ DPS: รอนอก Neurolink", "⑨: Hatch on a DPS: wait outside the Neurolink"),
   ("บอสติด Hatch ที่ DPS สุ่ม 1 คน\nรอบนี้ DPS คนนั้นต้องไปรอข้างนอก Neurolink ก่อน (ยังไม่เข้า)",
    "She targets a random DPS with Hatch\nThis time that DPS prepositions outside the Neurolink (not in it yet)"),
   img="01_twintania_2_6", scene="tw26")

st(P1, "Twister", ("⑩: Twister: ล่อนอกวงก่อน แล้วค่อยเข้า Neurolink", "⑩: Twister: bait it outside, then enter the Neurolink"),
   ("บอสร่าย Twister: ทุกคนขยับหลบ\n"
    "DPS ที่โดน Hatch ล่อ Twister ของตัวเองนอก Neurolink ก่อน แล้วค่อยเดินเข้า Neurolink ไปรับลูกบอล\n\n"
    "ถ้าดาเมจปาร์ตี้สูง อาจข้าม Twister ชุดนี้ไปเลย: DPS ที่โดน Hatch ดู HP บอสเองว่า Twister ถูกข้ามหรือไม่",
    "She casts Twister: everyone moves to dodge\n"
    "The Hatch DPS baits their Twister outside the Neurolink first, then steps in to take the orb\n\n"
    "With high party DPS this set of Twisters may be skipped: the Hatch DPS watches her HP to know"),
   img="01_twintania_2_7", scene="tw27", says={})

st(P1, "Plummet", ("⑪: Plummet แล้ววนใหม่", "⑪: Plummet, then the loop again"),
   ("บอสใช้ Plummet แล้ววนกลับไปเริ่มที่ Liquid Hell ชุดแรกใหม่",
    "She Plummets, then the loop starts again from the first baited Liquid Hells"),
   img="01_twintania_2_8", scene="tw28")

# ------------------------------------------------------------------ P1 part 3
st(P1, "Liquid Hell", ("ช่วงที่ 3 (HP 44–0%) ⑪: ดึงบอสไป marker ถัดไป", "Part 3 (44–0% HP) ⑪: pull to the next marker"),
   ("ช่วงสุดท้ายของ Twintania รวมทุก Mechanic ที่ผ่านมา\nดึงบอสไป marker ถัดไปตามเข็มนาฬิกา",
    "The last part puts every mechanic so far together\nPull her clockwise to the next marker"),
   img="01_twintania_3_1", scene="tw31", says={"MT": ("ดึงบอสไป marker ถัดไปตามเข็ม", "Pull her clockwise to the next marker")})

st(P1, "Liquid Hell", ("⑫: Liquid Hell 5 ลูก: D3 ล่อ", "⑫: five Liquid Hells: D3 baits"),
   ("บอสร่าย Liquid Hell 5 ลูกแบบล่อได้\nD3 ล่อ / คนอื่นยืนใกล้บอสไว้",
    "She casts five baited Liquid Hells\nD3 baits / everyone else stays near her"),
   img="01_twintania_3_2", scene="tw32", says={"D3": ("ล่อ Liquid Hell 5 ลูก", "Bait the five Liquid Hells")})

st(P1, "Generate", ("⑬: Generate 2 คน: ห้ามเข้าสามเหลี่ยม", "⑬: Generate on two: stay out of the triangle"),
   ("รอบนี้ Generate ติดมาร์ก DPS สุ่ม 2 คน และมีลูกบอลดำ 2 ลูกวิ่งไปหา\n"
    "ทุกคนอยู่นอกสามเหลี่ยมที่เกิดจากบอสกับ Neurolink 2 วง จะได้ไม่ชนลูกบอล",
    "This Generate marks two random DPS, and two black orbs move to them\n"
    "Everyone stays outside the triangle made by her and the two Neurolinks, so nobody bumps an orb"),
   img="01_twintania_3_3", scene="tw33")

st(P1, "Hatch", ("⑭: 2 คนแยกกันเข้า Neurolink คนละวง", "⑭: the two take separate Neurolinks"),
   ("ลูกบอลทิ้ง debuff Mana Hypersensitivity: DPS 2 คนที่โดนมาร์กต้องแยกกันเข้า Neurolink คนละวง",
    "The orb leaves Mana Hypersensitivity, so the two marked DPS must go into separate Neurolinks"),
   img="01_twintania_3_4", scene="tw34")

st(P1, "Fireball", ("⑮: Fireball + Liquid Hell แบบสุ่มเป้า", "⑮: Fireball + Liquid Hells on a random target"),
   ("บอสติด Fireball (stack) ที่ผู้เล่นสุ่ม และเตรียม Liquid Hell อีก 5 ลูก\n"
    "Liquid Hell ชุดนี้ล่อไม่ได้: ตกใส่ผู้เล่นสุ่ม 1 คน (ไม่ใช่ Tank ที่ถือ aggro)\n"
    "stack Fireball หลังบอส (ช่วงนี้ stack ครบทั้งปาร์ตี้) / คนโดน Liquid Hell ระวังอย่าทิ้งกองไฟตรงจุด stack\n\n"
    "เป้า Hatch, Fireball, Liquid Hell สุ่มแยกกัน: คนเดียวอาจโดนครบทั้ง 3 อย่าง\n"
    "Rule: ทำ Hatch ก่อน\n"
    "คนโดน Liquid Hell เสีย HP ทุกลูก: อยู่นอก stack Fireball (ยกเว้นเป็นเป้า Fireball เองด้วย)",
    "She marks a random player for Fireball (a stack) and readies five more Liquid Hells\n"
    "These Liquid Hells aren't baited: they follow one random player (not the tank holding her)\n"
    "Take the Fireball stack behind her (the whole party now) / the Liquid Hell target keeps puddles off the stack spot\n\n"
    "Hatch, Fireball and Liquid Hell targets are independent: one player can have all three\n"
    "Rule: resolve Hatch first\n"
    "The Liquid Hell target takes damage from each one, so stays out of the Fireball stack (unless also the Fireball target)"),
   img="01_twintania_3_5", scene="tw35", refs=R("fireball_full"))

st(P1, "Death Sentence", ("⑯: Death Sentence: สลับ Tank", "⑯: Death Sentence: swap tanks"),
   ("บอสร่าย Death Sentence ใส่ Tank ที่ถือ aggro\nMT กับ ST สลับ Tank",
    "She readies Death Sentence on the tank holding her\nThe MT and ST swap"),
   img="01_twintania_3_6", scene="tw36")

st(P1, "Plummet", ("⑰: Plummet ใส่ Tank คนใหม่", "⑰: Plummet on the new tank"),
   ("บอสใช้ Plummet ใส่ Tank คนใหม่\nTank คนเก่ารีบออกจากหน้าบอส จะได้ไม่รับดาเมจฟรี",
    "She Plummets the new tank\nThe old tank gets out of the way quickly to avoid needless damage"),
   img="01_twintania_3_7", scene="tw37")

st(P1, "Hatch", ("⑱: Hatch 2 คน: รอข้าง Neurolink", "⑱: Hatch on two: wait beside the Neurolinks"),
   ("บอสร่าย Generate ติด Hatch ที่ DPS สุ่ม 2 คน\nเหมือนช่วงที่ 2: 2 คนนั้นยืนข้าง Neurolink ของตัวเอง ยังไม่เข้า",
    "She casts Generate, putting Hatch on two random DPS\nAs in part 2, they stand beside their Neurolinks without entering"),
   img="01_twintania_3_8", scene="tw38")

st(P1, "Twister", ("⑲: Twister แล้วเข้า Neurolink", "⑲: Twister, then into the Neurolinks"),
   ("บอสร่าย Twister: ทุกคนหลบ\nDPS 2 คนที่โดน Hatch ล่อ Twister ข้างนอกก่อน แล้วค่อยเข้า Neurolink ของตัวเองไปรับลูกบอล",
    "She casts Twister: everyone dodges\nThe two Hatch DPS bait their Twisters outside first, then enter their Neurolinks for the orbs"),
   img="01_twintania_3_9", scene="tw39")

st(P1, "Plummet", ("⑳: Plummet แล้ววนใหม่", "⑳: Plummet, then the loop again"),
   ("บอสใช้ Plummet ใส่ Tank ที่ถือ aggro แล้ววนกลับไปเริ่มที่ Liquid Hell แบบล่อได้\nปัจจุบันปาร์ตี้มักฆ่า Twintania ได้ราวๆ Hatch ชุดถัดไป",
    "She Plummets the current tank, then the loop restarts from the baited Liquid Hells\nNowadays parties kill her around the next set of Hatches"),
   img="01_twintania_3_10", scene="tw310")

# ------------------------------------------------------------------ Heavensfall (transition)
st(P1, "Heavensfall", ("ช่วงเปลี่ยนไป Nael ①: stack ที่ marker ใต้", "Into Nael ①: stack on the south marker"),
   ("Twintania ทิ้ง Neurolink วงที่ 3 (วงสุดท้าย) ไว้แล้วหายไป\n"
    "ปาร์ตี้ stack กันบน marker ใต้ (3)\n"
    "Tank จะไปยืนฝั่งเหนือแทนก็ได้",
    "Twintania leaves the third and last Neurolink and disappears\n"
    "The party stacks on the south marker (3)\n"
    "The tanks may stand on the north side instead"),
   img="01_transition_01", scene="tr1", refs=R("heavensfall"))

st(P1, "Heavensfall", ("②: tower ตกกลางสนาม: knockback", "②: the tower lands: knockback"),
   ("tower Heavensfall ตกกลางสนาม: ดาเมจตามระยะ (ใกล้แรงกว่า) ใส่ทุกคน แล้ว knockback ทุกคนไปทางขอบสนาม",
    "A Heavensfall tower drops in the centre: proximity damage on everyone, then a knockback toward the edge"),
   img="01_transition_02", scene="tr2")

st(P1, "Meteor Stream", ("③: กระจายระหว่างกรวย + Meteor Stream", "③: spread between the cones + Meteor Stream"),
   ("กระจายตัวออกเป็นพัด ยืนในช่องระหว่าง AoE กรวยที่ยิงออกจาก tower\n"
    "Meteor Stream ลงใส่ผู้เล่นสุ่ม 4 คน: วงห้ามทับกัน",
    "Fan out and spread in the gaps between the cones fired from the tower\n"
    "Meteor Stream hits four random players: keep the circles from overlapping"),
   img="01_transition_03", scene="tr3", refs=R("meteor_stream"))

st(P1, "Meteor Stream", ("④: กรวยชุดสอง + Meteor Stream อีก 4 คน", "④: the second cones + Meteor Stream on the other four"),
   ("กรวยชุดที่สองยิงช่องที่เคยปลอดภัย พร้อม Meteor Stream ชุดที่สองใส่ 4 คนที่เหลือ\n"
    "หมุนตามเข็มหรือทวนเข็มตามที่เหมาะ ขยับออกจากฝั่งใต้ จะได้ไม่หลบเข้าช่องเดิมของชุดนี้",
    "The second cones hit the slices that were safe, with Meteor Stream on the remaining four\n"
    "Rotate clockwise or anti-clockwise as it suits, moving away from the south, so you don't dodge into the same slices"),
   img="01_transition_04", scene="tr4")

st(P1, "Dalamud Dive", ("⑤: Nael มาพร้อม Dalamud Dive", "⑤: Nael arrives with Dalamud Dive"),
   ("Nael ลงมาด้วย Dalamud Dive ใส่ Tank ที่ถือ aggro ตอนจบ Twintania (ส่วนใหญ่คือ ST) แล้วต่อด้วย Bahamut's Claw 5 hit ทันที\n"
    "Dalamud Dive เป็น tankbuster แบบวงกลม: คนอื่นอยู่ห่างจาก ST",
    "Nael lands with Dalamud Dive on the tank who held Twintania at the end (usually the ST), then a five-hit Bahamut's Claw straight after\n"
    "Dalamud Dive is an AoE tankbuster: everyone else keeps away from the ST"),
   img="01_transition_05", scene="tr5", says={"ST": ("ใช้ invuln รับ Dalamud Dive", "Invuln the Dalamud Dive")},
   refs=R("dalamud_dive"))
