"""Footage pictures (Nukemaru, V7lYb6-1sys: a stream of UCoB clears; this is the clear at 27:22-45:35), keyed by the name
the step texts ask for (R(...)); the file is data/frames/ucob/<f>.webp, made by frames.py from picks.py."""
VID = "V7lYb6-1sys"
REFS = {}


def add(key, f, t, th, en, vid=VID):
    REFS[key] = {"f": f, "t": t, "vid": vid, "say": (th, en)}


def R(*names):
    return [REFS[n] for n in names if n in REFS]


# P1
add("fireball5", "fireball5", 1682, "Fireball: มาร์ก stack บนผู้เล่น · stack 5 คนหลังบอส (Tank กับ D3 ไม่เข้า)",
    "Fireball: a stack marker on a player · five stack behind her (tanks and D3 stay out)")
add("liquid_hell", "liquid_hell", 1812, "Liquid Hell: กองไฟตกเป็นแนวตามคนล่อ · D3 ล่อ คนอื่นยืนใกล้บอส",
    "Liquid Hell: fire puddles fall in a line behind the baiter · D3 baits, everyone else stays near her")
add("generate", "generate", 1714, "Generate: ลูกบอลดำเกิดใต้บอสแล้ววิ่งหาคนที่โดน Hatch · อย่ายืนขวางทาง",
    "Generate: the black orb spawns under her and moves to the Hatch target · keep out of its path")
add("hatch_neuro", "hatch_neuro", 1794, "Hatch: ให้ลูกบอลดำชนตอนยืนใน Neurolink · ลูกบอลระเบิดเป็นวงรอบตัว",
    "Hatch: take the black orb while inside a Neurolink · it explodes around itself")
add("heavensfall", "heavensfall", 1854, "Heavensfall: tower ตกกลางสนาม · ปาร์ตี้ stack ที่ marker ใต้ แล้วโดน knockback",
    "Heavensfall: the tower lands in the centre · the party stacks on the south marker and is knocked back")
add("meteor_stream", "meteor_stream", 1858, "กรวยยิงออกจาก tower: ยืนในช่องระหว่างกรวย · Meteor Stream 4 คน วงห้ามทับกัน",
    "Cones fire from the tower: stand in the gaps · Meteor Stream on four, circles must not overlap")
add("dalamud_dive", "dalamud_dive", 1866, "Dalamud Dive: Nael ลงมาใส่ ST · ST ใช้ invuln คนอื่นอยู่ห่าง",
    "Dalamud Dive: Nael lands on the ST · the ST invulns, everyone else keeps away")
# P2
add("nael_quote", "nael_quote", 1884, "Nael พูดประโยค (กล่องข้อความเหนือหัว) · คำในประโยคบอกท่าที่จะใช้และลำดับ",
    "Nael speaks her line (the box over her head) · its words give the attacks and their order")
add("iron_chariot", "iron_chariot", 1890, "Iron Chariot: AoE วงรอบ Nael · ทุกคนออกห่าง Nael",
    "Iron Chariot: a circle around Nael · everyone moves away from her")
add("wings_fire", "wings_fire", 1896, "Fire: ปาร์ตี้รับวงไฟด้วยกัน · หลบ Wings of Salvation ไปพร้อมกัน",
    "Fire: the party takes the fire circle together · dodging Wings of Salvation in one movement")
add("doom_cleanse", "doom_cleanse", 1930, "Wings of Salvation ทิ้งวงขาวไว้ · คนติด Doom เข้าวงขาวเพื่อแก้ ตามลำดับเวลา",
    "Wings of Salvation leaves a white puddle · a Doomed player steps in to cleanse, in timer order")
add("thermionic", "thermionic", 1922, "Thermionic Beam: stack ทั้งปาร์ตี้", "Thermionic Beam: the whole party stacks")
add("divebomb", "divebomb", 2002, "Cauterize: มังกรพุ่ง (dive) ไปยังจุดที่ล็อกไว้ · พา dive ออกห่างกลางสนาม",
    "Cauterize: a dragon dives at the locked spot · send the dives away from the centre")
add("seventh_umbral", "seventh_umbral", 2020, "Seventh Umbral Era: knockback + raid-wide 4 ครั้ง · LB Tank ก่อน (LB2) / ตอน (LB3) knockback",
    "Seventh Umbral Era: a knockback + four raid-wides · tank LB before (LB2) / at (LB3) the knockback")
# P3
add("flatten", "flatten", 2040, "Bahamut Prime: Flare Breath แล้ว Flatten ใส่ Tank · จากนั้นเริ่ม Trio",
    "Bahamut Prime: Flare Breath, then Flatten on the tank · then a Trio begins")
add("quickmarch", "quickmarch", 2062, "Quickmarch: กระจายตามขอบตะวันตก / ตะวันออก · เดินตามขอบหลบ Twister",
    "Quickmarch: spread along the west / east edges · move along the edge to dodge the Twisters")
add("blackfire", "blackfire", 2100, "Blackfire: dive ของ Bahamut ผ่านกลางสนาม · ปาร์ตี้ทยอยเดินไปทาง Nael",
    "Blackfire: Bahamut's dive through the centre · the party stagger-steps toward Nael")
add("fellruin", "fellruin", 2152, "Fellruin: กระจายหรือ stack รอบ Nael ตามประโยค · Tank ใกล้กลางสนามที่สุด",
    "Fellruin: spread or stack around Nael by her line · tanks nearest the centre")
add("hf_towers", "hf_towers", 2208, "Heavensfall Trio: tower กลางสนาม knockback · tower 8 ลูกรอบขอบ ยืนหน้า tower ตัวเอง",
    "Heavensfall Trio: the centre tower knocks back · eight towers at the edge, stand in front of yours")
add("tenstrike_hatch", "tenstrike_hatch", 2266, "Tenstrike: Twintania กลางสนาม + Hatch 3 คน · เข้า Neurolink ตามลำดับแถว",
    "Tenstrike: Twintania in the centre + Hatch on three · they take the Neurolinks by line order")
add("ts_giga", "ts_giga", 2287, "Earthshaker ชุดที่ 2 ลงแล้ว · Bahamut ร่าย Gigaflare", "The second Earthshakers have resolved · Bahamut casts Gigaflare")
add("grand_octet", "grand_octet", 2320, "Grand Octet: มังกร 5 ตัว + บอส 3 ตัวรอบสนาม · หา Bahamut ว่าอยู่ทิศหลักหรือทิศเฉียง",
    "Grand Octet: five dragons + three bosses around the arena · find whether Bahamut is cardinal or intercardinal")
add("octet_run", "octet_run", 2328, "Grand Octet: มาร์ก dive ขึ้นทีละคนระหว่างวิ่งวน · จำว่าตัวเองได้มาร์กแล้วหรือยัง",
    "Grand Octet: dive markers appear one by one as you run · note whether you've had one")
add("octet_red", "octet_red", 2340, "มาร์ก dive แดงของ Bahamut · ทุกคนวิ่งเข้ากลางสนาม", "Bahamut's red dive marker · everyone runs to the centre")
add("octet_towers", "octet_towers", 2344, "Twintania พุ่งลงพร้อม tower / Megaflare / Twister · แล้วรวมตัวเตรียมเข้าเฟส adds",
    "Twintania dives with the towers / Megaflare / Twisters · then gather for the adds phase")
# P4
add("adds_start", "adds_start", 2366, "Twintania + Nael โผล่พร้อมกันทางเหนือ · MT รับ Twintania / ST รับ Nael",
    "Twintania + Nael arrive together in the north · MT takes Twintania / ST takes Nael")
add("adds_hatch", "adds_hatch", 2392, "Hatch 3 DPS: ลูกบอลดำวิ่งหา · รับใน Neurolink ตามตำแหน่ง",
    "Hatch on three DPS: the black orbs move to them · taken in the Neurolinks by position")
# P5
add("golden", "golden", 2558, "Golden Bahamut (ทุกคนได้ Phoenix's Blessing) · วงจร Morn Afah / Akh Morn / Exaflare",
    "Golden Bahamut (everyone has Phoenix's Blessing) · the Morn Afah / Akh Morn / Exaflare loop")
add("morn_afah", "morn_afah", 2560, "Morn Afah: stack ทั้ง 8 คน · ใช้ mitigate ตามแผน", "Morn Afah: an eight-player stack · mitigate by the plan")
add("akh_morn", "akh_morn", 2568, "Akh Morn: tankbuster ที่ Tank 2 คนแบ่งรับ · ครั้งแรก stack ที่ marker 3",
    "Akh Morn: a tankbuster both tanks share · the first one stacked on marker 3")
add("exaflare", "exaflare", 2586, "Exaflare: วงระเบิดเดินต่อเป็นแถว · หาจังหวะหลบแบบ 3-to-1 ถ้าทำได้",
    "Exaflare: explosions travel in lines · take a 3-to-1 dodge if one is available")
add("megaflare_mark", "qm_tether", 2072, "Quickmarch: Bahamut โผล่กลางสนาม แล้วโยงสาย Tempest Wing ไปที่ผู้เล่น 2 คน",
    "Quickmarch: Bahamut appears in the centre and tethers two players for Tempest Wing")
add("earthshaker", "qm_es", 2078, "Earthshaker ลงแล้วทิ้งพื้นไฟสีส้มไว้ · Tank ยืนหน้า Healer ห้ามโดน 2 อัน",
    "The Earthshakers leave orange fire on the floor · tanks stand in front of the healers, never hit by two")
add("profusion", "fr_tether", 2156, "Fellruin: สาย Tempest Wing (เส้นเขียว) จาก Bahamut · Tank ต้องถือสายไว้ก่อน Aetherial Profusion",
    "Fellruin: a Tempest Wing tether (green) from Bahamut · the tanks hold them before Aetherial Profusion")
add("heavensfall_trio", "hf_trio", 2202, "Heavensfall Trio: มาร์ก dive ของ Bahamut (แดง) และของ Twintania (เขียว)",
    "Heavensfall Trio: the markers for Bahamut's dive (red) and Twintania's (green)")
add("hf_slices", "hf_slices", 2216, "tower กลางสนามยิง AoE เป็นช่อง (เส้นเหลือง) · หมุนตามเข็มหรือทวนเข็มครบรอบเดียว",
    "The centre tower fires its slices (yellow lines) · they go round once, clockwise or anti-clockwise")
add("tenstrike_es", "ts_es", 2276, "Tenstrike: มาร์ก Earthshaker เหนือหัว 4 คน · คนมีมาร์กกระจายไปฝั่งเหนือ",
    "Tenstrike: Earthshaker markers over four heads · the marked spread to the north")
add("tenstrike", "ts_start", 2262, "Tenstrike: Twintania โผล่กลางสนาม · Hatch (ลูกปัดม่วง) ที่ผู้เล่น 3 คน",
    "Tenstrike: Twintania appears in the centre · Hatch (purple beads) on three players")
