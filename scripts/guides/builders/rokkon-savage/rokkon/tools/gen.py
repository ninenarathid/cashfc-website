"""Builds scripts/guides/data/rokkon-savage.json (Another Mount Rokkon (Savage): game8's plan, Hamukatsu's videos)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/rokkon"
sys.path.insert(0, HERE + "/tools")
import sc, sc2, sc3
from refs import REFS

OUT = r"scripts/guides/data/rokkon-savage.json"
IMGS = json.load(open(HERE + "/imgs.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None, ref=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [IMGS[pic]]
    refs = REFS.get(ref) if ref else None
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1], "by": r[3], "url": r[4]} for r in refs]
    if scene is not None:
        s["ring"] = 5.5
        s["scene"] = scene()
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


def seats(th, dps, th_en, dps_en):
    """says for a TH / DPS split."""
    return ({"MT": th, "H1": th, "D1": dps, "D2": dps}, {"MT": th_en, "H1": th_en, "D1": dps_en, "D2": dps_en})


P0 = ("เตรียมตัว", "Setup")
P1 = ("ลูกน้องก่อนบอส 1", "Trash before boss 1")
P2 = ("บอส 1: Shishio", "Boss 1: Shishio")
P3 = ("ลูกน้องก่อนบอส 2", "Trash before boss 2")
P4 = ("บอส 2: Gorai the Uncaged", "Boss 2: Gorai the Uncaged")
P5 = ("บอส 3: Moko the Restless", "Boss 3: Moko the Restless")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker ตามภาพของ game8", "Waymarks as game8 draws them",
     "game8 วาด Marker ไว้แค่ที่บอส 2 (ทอยลูกเต๋า Fighting Spirits แบบ Spell):\n"
     "D ตะวันตก\nB ตะวันออก\n"
     "4 / 2 / 1 / 3 เรียงเป็นแถวเลียบขอบใต้ จากตะวันตกไปตะวันออก\n\n"
     "บอส 1 (Noble Pursuit): game8 พูดถึง B ว่าเป็นฝั่งตะวันออก\n"
     "บอสอื่น game8 ไม่ได้วาด Marker",
     "game8 only draws waymarks for boss 2 (the Fighting Spirits dice, Spell's way):\n"
     "D west\nB east\n"
     "4 / 2 / 1 / 3 in a row along the south edge, west to east\n\n"
     "Boss 1 (Noble Pursuit): game8 refers to B as the east side\n"
     "For the other bosses game8 draws no waymarks",
     strict=False, pic="b2-27", scene=sc2.waymarks)

# ------------------------------------------------------------------ trash before boss 1
step(P1, "Kill order", "ลำดับการฆ่า", "Kill order",
     "ฆ่าตามลำดับนี้:\n"
     "① ตะวันออกเฉียงใต้: Shishu raiko กับ Shishu furutsubaki\n"
     "② ตะวันตกเฉียงเหนือ: Shishu fuko กับ red Shishu penghou\n"
     "③ Shishu yuki\n\n"
     "Shishu yuki เดินลาดตระเวนไปมา: อย่าเดินไปชนจนมันเข้ามาตี\n\n"
     "Savage: game8 บอกว่าลูกน้องตีแรงผิดปกติ และ wipe แล้วต้องเริ่มใหม่จากต้นดันเจี้ยน",
     "Kill them in this order:\n"
     "① South-east: Shishu raiko and Shishu furutsubaki\n"
     "② North-west: Shishu fuko and red Shishu penghou\n"
     "③ Shishu yuki\n\n"
     "The Shishu yuki patrols: don't walk into it and pull it\n\n"
     "Savage: game8 says the trash hits abnormally hard, and a wipe sends you back to the start of the dungeon",
     strict=False, ref="t1-order", mech_en="Kill order")
step(P1, "Shishu raiko · Shishu furutsubaki", "กลุ่ม ①", "Pack ①",
     "Disciples of Levin: AoE วงกลมรอบ raiko: ออกห่างจาก raiko\n"
     "Barreling Smash: raiko พุ่งชนผู้เล่น 1 คนแบบสุ่ม HP เหลือ 1\n"
     "ตามด้วย raid-wide: Healer เติม HP คนที่เหลือ 1 ให้ทัน\n"
     "Howl: raid-wide\n"
     "Master of Levin: donut ปลอดภัยใน target circle ของ raiko\n"
     "Bloody Caress: furutsubaki ตี cone ไปทางที่หันหน้าอยู่",
     "Disciples of Levin: a circle AoE around the raiko: get away from it\n"
     "Barreling Smash: the raiko charges one random player and leaves them at 1 HP\n"
     "A raid-wide follows: healers, top up the 1-HP player in time\n"
     "Howl: raid-wide\n"
     "Master of Levin: a donut, safe inside the raiko's target circle\n"
     "Bloody Caress: the furutsubaki's cone, the way it faces",
     strict=False, ref="t1-raiko",
     says={"H1": "Barreling Smash: เติม HP คนที่เหลือ 1 ก่อน raid-wide"}, says_en={"H1": "Barreling Smash: heal the 1-HP player before the raid-wide"})
step(P1, "Shishu fuko · red Shishu penghou", "กลุ่ม ②", "Pack ②",
     "Scythe Tail: AoE วงกลมรอบ fuko: ออกห่าง\n"
     "Tornado: penghou ร่าย AoE วงกลมลงผู้เล่น 1 คนแบบสุ่ม\n"
     "Twister: stack: มารวมกันรับ\n"
     "Crosswind: knockback มีดาเมจจาก fuko\n"
     "ระวัง Tornado ของ penghou ที่ร่ายพร้อมกันด้วย",
     "Scythe Tail: a circle AoE around the fuko: get away\n"
     "Tornado: the penghou casts a circle AoE on one random player\n"
     "Twister: stack: gather and take it together\n"
     "Crosswind: a knockback with damage from the fuko\n"
     "Watch for the penghou's Tornado at the same time",
     strict=False, ref="t1-fuko")
step(P1, "Shishu yuki", "กลุ่ม ③", "Pack ③",
     "Shishu yuki เป็นอมตะจนกว่าลูกน้องตัวอื่นจะตายหมด: อย่าเพิ่งไปตีมัน\n"
     "Right Swipe / Left Swipe: ตีครึ่งสนามฝั่งที่ yuki ยกมือ: หลบไปอีกข้าง",
     "The Shishu yuki is invulnerable until all the other trash is dead: leave it alone until then\n"
     "Right Swipe / Left Swipe: a half-arena hit on the side of the hand it raises: dodge to the other side",
     strict=False, ref="t1-yuki")
step(P1, "Shishu yuki", "เส้นทางเดิน: รอบแรก", "Its walk: the first lap",
     "รอบแรก yuki เริ่มจากทางเหนือแล้วเดินวนรอบสนามไปเรื่อยๆ\n"
     "(ภาพ: เส้นแดง = ทางเดิน)",
     "On its first lap the yuki starts from the north and walks round the whole field\n"
     "(Picture: red line = its path)",
     strict=False, pic="b1-03", scene=sc.yuki_route1)
step(P1, "Shishu yuki", "เส้นทางเดิน: หลังจากนั้น", "Its walk: after that",
     "หลังจากนั้นพอเดินมาถึงครึ่งสนาม yuki จะเดินย้อนกลับ\n"
     "ทุกคนคอยดู yuki ไปด้วยขณะเก็บลูกน้อง",
     "After that, when it reaches the half of the field it turns back\n"
     "Everyone keeps an eye on the yuki while clearing the trash",
     strict=False, pic="b1-04", scene=sc.yuki_route2)

# ------------------------------------------------------------------ boss 1: Shishio
step(P2, "Enkyo", "raid-wide", "Raid-wide",
     "raid-wide ประจำ: ใช้ mitigate ให้ครบ",
     "The usual raid-wide: use your mitigation",
     strict=False, ref="b1-enkyo")
SE = "Stormcloud Summons · Rokujo Revel"
step(P2, SE, "จำนวน Smokeater = จำนวนเส้น", "Smokeater count = number of lines",
     "บอสร่าย Stormcloud Summons แล้วดูดเมฆ (Smokeater)\n"
     "จำนวนครั้งที่ Smokeater ทำให้ AoE ของ Rokujo Revel เปลี่ยน:\n"
     "1 ครั้ง = เส้นตรง 1 เส้น\n2 ครั้ง = 2 เส้น\n3 ครั้ง = 3 เส้น\n\n"
     "ในภาพ: วงม่วง = เมฆดำ / แถบส้ม = เส้นตรง Rokujo Revel / วงส้มใหญ่ = เมฆระเบิด",
     "The boss casts Stormcloud Summons and eats clouds (Smokeater)\n"
     "How many times it uses Smokeater changes Rokujo Revel:\n"
     "Once = 1 line\nTwice = 2 lines\nThree times = 3 lines\n\n"
     "In the pictures: purple circles = dark clouds / orange bar = the Rokujo Revel line / big orange circle = a cloud exploding",
     strict=False, ref="b1-smoke")
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 1) ①", "Smokeater once (pattern 1) ①",
     "① Smokeater 1 ครั้ง: Rokujo Revel ขึ้นเส้นตรง 1 เส้น",
     "① Smokeater once: Rokujo Revel telegraphs one line",
     strict=False, pic="b1-05", scene=sc.se1_tell, ref="b1-line1")
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 1) ②", "Smokeater once (pattern 1) ②",
     "② เข้าไปยืนในส่วนของเส้นที่ไม่มีเมฆดำ\n"
     "(ภาพ: MT ปลายฝั่งตะวันตก / H1 D1 D2 ปลายฝั่งตะวันออก)",
     "② Go to the part of the line with no dark cloud in it\n"
     "(Picture: MT at the west end / H1 D1 D2 at the east end)",
     strict=False, pic="b1-06", scene=sc.se1_start)
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 1) ③", "Smokeater once (pattern 1) ③",
     "③ จากนั้นเมฆดำระเบิดต่อกันเป็นทอดๆ\n"
     "หลบโดยวิ่งเข้าหากลางบอส\n"
     "จบ Mechanic",
     "③ Then the dark clouds set each other off\n"
     "Dodge by heading in towards the boss's centre\n"
     "Mechanic over",
     strict=False, pic="b1-07", scene=sc.se1_end)
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 2) ①", "Smokeater once (pattern 2) ①",
     "① Smokeater 1 ครั้ง: เส้นตรง 1 เส้น",
     "① Smokeater once: one line",
     strict=False, pic="b1-08", scene=sc.se1b_tell)
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 2) ②", "Smokeater once (pattern 2) ②",
     "② เข้าไปยืนในส่วนของเส้นที่ไม่มีเมฆดำ\n"
     "แบบนี้เริ่มที่ฝั่งกลางสนามกับฝั่งตะวันตกเฉียงใต้",
     "② Go to the part of the line with no dark cloud in it\n"
     "In this pattern you start on the middle side and the south-west side",
     strict=False, pic="b1-09", scene=sc.se1b_start)
step(P2, SE, "Smokeater 1 ครั้ง (แบบ 2) ③", "Smokeater once (pattern 2) ③",
     "③ เมฆดำระเบิดต่อกัน: วิ่งเข้าหากลางบอสเพื่อหลบ\n"
     "จบ Mechanic",
     "③ The dark clouds set each other off: head in towards the boss's centre to dodge\n"
     "Mechanic over",
     strict=False, pic="b1-10", scene=sc.se1b_end)
step(P2, SE, "Smokeater 2 ครั้ง ①", "Smokeater twice ①",
     "① Smokeater 2 ครั้ง: Rokujo Revel ขึ้นเส้นตรง 2 เส้น",
     "① Smokeater twice: Rokujo Revel telegraphs two lines",
     strict=False, pic="b1-11", scene=sc.se2_tell, ref="b1-line2")
step(P2, SE, "Smokeater 2 ครั้ง ②", "Smokeater twice ②",
     "② เริ่มจากในเส้นแรก ฝั่งที่ไม่มีเมฆดำ",
     "② Start inside the first line, on the side with no dark cloud",
     strict=False, pic="b1-12", scene=sc.se2_first)
step(P2, SE, "Smokeater 2 ครั้ง ③", "Smokeater twice ③",
     "③ พอเส้นแรกระเบิด วิ่งเข้าไปยืนตรงที่เพิ่งระเบิด\n"
     "รอเส้นที่ 2 ระเบิด แล้ววิ่งเข้าที่เพิ่งระเบิดแบบเดียวกัน\n"
     "จบ Mechanic",
     "③ When the first line goes off, run into where it just hit\n"
     "Wait for the second to go off and run into its spot the same way\n"
     "Mechanic over",
     strict=False, pic="b1-13", scene=sc.se2_second)
step(P2, SE, "Smokeater 3 ครั้ง ①", "Smokeater three times ①",
     "① Smokeater 3 ครั้ง: Rokujo Revel ขึ้นเส้นตรง 3 เส้น",
     "① Smokeater three times: Rokujo Revel telegraphs three lines",
     strict=False, pic="b1-14", scene=sc.se3_tell, ref="b1-line3")
step(P2, SE, "Smokeater 3 ครั้ง ②", "Smokeater three times ②",
     "② เริ่มที่จุดปลอดภัยตรงที่เส้นที่ 2 กับ 3 ไขว้กัน ฝั่งเมฆดำที่เส้นแรกไม่ทับ\n"
     "หันมองบอส: เมฆดำฝั่งขวาระเบิดเป็นวงกลมใหญ่ก่อน",
     "② Start at the safe spot where lines 2 and 3 cross, on the dark-cloud side the first line doesn't cover\n"
     "Facing the boss: the dark cloud on the right explodes first, as a big circle",
     strict=False, pic="b1-15", scene=sc.se3_start)
step(P2, SE, "Smokeater 3 ครั้ง ③", "Smokeater three times ③",
     "③ พอลูกแรกระเบิด ใช้ Sprint วิ่งเข้าไปตรงที่เพิ่งระเบิด\n"
     "แล้วเลียบไปทางขอบสนามเพื่อหลบลูกที่ 2",
     "③ When the first goes off, Sprint into where it just hit\n"
     "then hug the outer edge to dodge the second explosion",
     strict=False, pic="b1-16", scene=sc.se3_second)
step(P2, SE, "Smokeater 3 ครั้ง ④", "Smokeater three times ④",
     "④ จบ Mechanic",
     "④ Mechanic over",
     strict=False, pic="b1-17", scene=sc.se3_end)
step(P2, "Splitting Cry → Slither", "Tank buster เส้นตรง แล้ว cone หลังบอส", "A line tank buster, then a cone behind",
     "Splitting Cry: tank buster เส้นตรงใส่ hate อันดับ 1\n"
     "ตามด้วย Slither ทันที: cone ด้านหลังบอส\n\n"
     "คนที่ตีอยู่ด้านหลัง: ไปยืนด้านข้างบอส\n"
     "เส้นตรงของ tank buster ค่อนข้างกว้าง: อย่ายืนล้ำเข้าไปด้านหน้า",
     "Splitting Cry: a line tank buster on the top-enmity player\n"
     "Slither follows at once: a cone behind the boss\n\n"
     "Anyone hitting from behind: stand at the boss's side\n"
     "The tank buster's line is fairly wide: don't drift into the front",
     strict=False, ref="b1-cry",
     says={"MT": "Splitting Cry ใส่คุณ: ใช้ mitigate"}, says_en={"MT": "Splitting Cry is on you: mitigate"})
step(P2, "Noble Pursuit → Enkyo", "ดูวงแหวนฝั่งใต้ก่อน", "Look at the ring on the south first",
     "Mechanic เดียวกับใน Variant แบบปกติ แต่วงแหวนมากกว่า: ดูจุดปลอดภัยยากขึ้น\n\n"
     "วิธีดู: วงแหวนฝั่งใต้ (ฝั่งตรงข้ามบอส) จะขึ้นทางตะวันออกหรือตะวันตก\n"
     "หันกล้องไปทางใต้ดูก่อน\n"
     "ภาพของ game8: วงแหวนขึ้นทางตะวันออก ฝั่ง Marker B จึงปลอดภัย\n\n"
     "ต่อด้วย Enkyo: raid-wide",
     "The same Mechanic as in the normal Variant, but with more rings: the safe spot is harder to read\n\n"
     "How to read it: the ring on the south side (opposite the boss) appears either east or west\n"
     "Turn your camera south first\n"
     "In game8's picture the ring was east, so the B marker side was safe\n\n"
     "Enkyo follows: raid-wide",
     strict=False, ref="b1-noble")
HC = "Unnatural Wail → Haunting Cry"
step(P2, HC, "Debuff: spread / pair stack", "Debuffs: spread / pair stack",
     "Unnatural Wail: ทั้ง 4 คนได้ debuff แบบใดแบบหนึ่ง:\n"
     "spread: ติดทั้ง 4 คน ครบเวลาแล้ว AoE วงกลมลง: กระจายกันรับ\n"
     "pair stack: ติด TH 1 คน และ DPS 1 คน: จับคู่ TH คู่หนึ่ง DPS คู่หนึ่ง แยกกันรับ\n\n"
     "Haunting Cry: เรียก Shishu yuki 4 ตัว\n"
     "หาจุดปลอดภัย แล้วรับ debuff ที่จุดนั้น",
     "Unnatural Wail: all four get one kind of debuff:\n"
     "spread: on all four; when it runs out a circle lands: spread out\n"
     "pair stack: on one TH and one DPS: TH pair up and DPS pair up, apart\n\n"
     "Haunting Cry: summons four Shishu yuki\n"
     "Find the safe spot and take the debuff there",
     strict=False, ref="b1-wail")
step(P2, HC, "① สองตัวที่หันเข้ากลาง", "① The two facing the middle",
     "① yuki ขึ้น 4 ตัว\n"
     "ฝั่งทแยงตรงข้ามกับ 2 ตัวที่หันหน้าเข้ากลางสนาม = จุดปลอดภัย\n"
     "(ภาพ: วงทอง = 2 ตัวที่หันเข้ากลาง / วงเขียว = จุดปลอดภัย)",
     "① Four yuki appear\n"
     "The diagonal opposite the two that face the middle = the safe spot\n"
     "(Picture: gold rings = the two facing the middle / green ring = safe)",
     strict=False, pic="b1-21", scene=sc.hc_find, ref="b1-yuki")
step(P2, HC, "② เรียกเพิ่มอีก 4 ตัว", "② Four more",
     "② yuki ขึ้นเพิ่มอีก 4 ตัว\n"
     "(ภาพ: ตัวสีจาง = ชุดที่ 2)",
     "② Four more yuki are summoned\n"
     "(Picture: faded = the second set)",
     strict=False, pic="b1-22", scene=sc.hc_both)
step(P2, HC, "③ รับ debuff ครั้งที่ 1", "③ The first debuff",
     "③ ชุดแรกตีพร้อมกับ debuff ครั้งที่ 1\n"
     "AoE ของชุดที่ 2 ตามมาเร็ว: หา yuki ชุดที่ 2 อีก 2 ตัวที่หันเข้ากลางไว้เลย\n\n"
     "ภาพนี้คือ spread\n"
     "ที่ยืน spread: ยึดตามมองบอสจากจุด spread\n"
     "จะยืนตรงไหน game8 ให้ทำตาม macro หรือคุยกันใน 4 คน (ภาพเป็นตัวอย่าง)",
     "③ The first set hits together with the first debuff\n"
     "The second set's AoE comes soon after: already look for the two second-set yuki facing the middle\n\n"
     "This picture is the spread\n"
     "Spread spots: taken looking at the boss from where you spread\n"
     "Who goes where: game8 says follow your macro or agree among the four (the picture is an example)",
     strict=False, pic="b1-23", scene=sc.hc_first)
step(P2, HC, "④ รับ debuff ครั้งที่ 2", "④ The second debuff",
     "④ ชุดที่ 2: รับ debuff ครั้งที่ 2\n"
     "ภาพนี้คือ pair stack: คู่ TH (MT·H1) / คู่ DPS (D1·D2)",
     "④ The second set: take the second debuff\n"
     "This picture is the pair stack: TH pair (MT·H1) / DPS pair (D1·D2)",
     strict=True, pic="b1-24", scene=sc.hc_second,
     says=seats("คู่ TH: MT·H1", "คู่ DPS: D1·D2", "TH pair: MT·H1", "DPS pair: D1·D2")[0],
     says_en=seats("คู่ TH: MT·H1", "คู่ DPS: D1·D2", "TH pair: MT·H1", "DPS pair: D1·D2")[1])
step(P2, "Stormcloud Summons → Lightning Bolt", "เส้นตรงต่อเนื่อง", "Lines one after another",
     "AoE เส้นตรงต่อเนื่องแบบที่มีใน Variant แบบปกติ\n"
     "ขึ้นรอยเตือนแทบไม่หยุด: ดูให้ดีแล้วหลบ",
     "The chain of line AoEs from the normal Variant\n"
     "Telegraphs keep coming almost without a break: watch and dodge",
     strict=False, ref="b1-bolt")
VX = "Unnatural Wail → Eye of the Thunder Vortex / Vortex of the Thunder Eye"
VX_EN = VX
step(P2, VX, "อ่านลำดับ: debuff กับวงกลม / donut", "Read the order: debuff, and circle or donut",
     "Unnatural Wail ให้ debuff แบบเดียวกับก่อนหน้า แล้วบอสตีวงกลมกับ donut:\n"
     "Eye of the Thunder Vortex: วงกลมรอบบอสก่อน (ปลอดภัยด้านนอก)\n"
     "Vortex of the Thunder Eye: donut ก่อน (ปลอดภัยด้านใน)\n\n"
     "อ่าน 2 อย่าง:\n"
     "pair stack กับ spread อันไหนมาก่อน\n"
     "บอสตี donut หรือวงกลมก่อน",
     "Unnatural Wail gives the same debuffs as before, then the boss hits a circle and a donut:\n"
     "Eye of the Thunder Vortex: the circle around the boss first (safe outside)\n"
     "Vortex of the Thunder Eye: the donut first (safe inside)\n\n"
     "Read two things:\n"
     "pair stack or spread, which comes first\n"
     "the donut or the circle, which comes first",
     strict=False, ref="b1-vortex")
step(P2, VX, "① donut ก่อน + pair stack ก่อน", "① Donut first + pair stack first",
     "① รอบแรก: donut (ปลอดภัยด้านใน) มาก่อน และ debuff เป็น pair stack ก่อน\n"
     "เข้าใน target circle แล้วจับคู่ TH / DPS\n"
     "(ภาพ: TH ฝั่งตะวันตก / DPS ฝั่งตะวันออก)",
     "① First: the donut (safe inside) comes first, and the debuff is pair stack first\n"
     "Get inside the target circle and pair up TH / DPS\n"
     "(Picture: TH on the west side / DPS on the east side)",
     strict=True, pic="b1-25", scene=sc.vx_donut_pairs,
     says=seats("คู่ TH: MT·H1 ใน target circle", "คู่ DPS: D1·D2 ใน target circle", "TH pair: MT·H1, inside the target circle", "DPS pair: D1·D2, inside the target circle")[0],
     says_en=seats("x", "x", "TH pair: MT·H1, inside the target circle", "DPS pair: D1·D2, inside the target circle")[1])
step(P2, VX, "② วงกลม + spread", "② Circle + spread",
     "② รอบที่ 2: วงกลม (ปลอดภัยด้านนอก) และ spread\n"
     "ออกนอกวงแล้วกระจายกัน\n"
     "(ภาพเป็นตัวอย่าง: MT เหนือ / H1 ตะวันตก / D1 ตะวันออก / D2 ใต้)",
     "② Second: the circle (safe outside) and spread\n"
     "Get out of the circle and spread\n"
     "(The picture is an example: MT north / H1 west / D1 east / D2 south)",
     strict=False, pic="b1-26", scene=sc.vx_circle_spread)
step(P2, VX, "①' วงกลมก่อน + pair stack ก่อน", "①' Circle first + pair stack first",
     "①' รอบแรก: วงกลม (ปลอดภัยด้านนอก) มาก่อน และ debuff เป็น pair stack ก่อน\n"
     "คู่ TH ฝั่งเหนือ / คู่ DPS ฝั่งใต้",
     "①' First: the circle (safe outside) comes first, and the debuff is pair stack first\n"
     "TH pair on the north side / DPS pair on the south side",
     strict=True, pic="b1-27", scene=sc.vx_circle_pairs,
     says=seats("คู่ TH: ฝั่งเหนือ นอกวง", "คู่ DPS: ฝั่งใต้ นอกวง", "x", "x")[0],
     says_en=seats("x", "x", "TH pair: north side, outside the circle", "DPS pair: south side, outside the circle")[1])
step(P2, VX, "②' donut + spread ใน target circle", "②' Donut + spread inside the target circle",
     "②' รอบที่ 2: donut (ปลอดภัยด้านใน)\n"
     "เข้าใน target circle แล้ว spread กันในนั้น\n"
     "(ภาพเป็นตัวอย่าง)",
     "②' Second: the donut (safe inside)\n"
     "Get inside the target circle and spread within it\n"
     "(The picture is an example)",
     strict=False, pic="b1-28", scene=sc.vx_donut_spread)
step(P2, "Haunting Cry → Vengeful Souls", "ผี + สาย / Marker วงใหญ่ + tower", "Ghosts and tethers / big markers + towers",
     "ผู้เล่น 4 คนได้ผี (ตี AoE วงกลม 8 ครั้ง) พร้อมสาย (tether)\n"
     "Vengeful Souls: 2 คนได้ Marker AoE วงใหญ่ และมี tower ขึ้น 2 อัน\n\n"
     "พอได้สาย: ดึงสายออกไปทางทแยง อย่าให้โดนตัวเองและคนอื่น\n"
     "คนที่ไม่ได้ Marker: เข้า tower\n"
     "2 คนที่ได้ Marker: เอา AoE วงใหญ่ไปลงให้ห่างคนอื่น\n\n"
     "ช่วงนี้ Melee อาจตีบอสไม่ได้: อดทนไว้",
     "Four players get a ghost (it fires 8 circle AoEs) and a tether\n"
     "Vengeful Souls: two players get a big-circle marker, and two towers appear\n\n"
     "With your tether: stretch it out diagonally, hitting neither yourself nor anyone else\n"
     "Players without a marker: take the towers\n"
     "The two with markers: drop the big AoE away from everyone\n\n"
     "Melee may not be able to hit the boss here: bear with it",
     strict=False, ref="b1-souls")
step(P2, "Thunder Vortex", "donut รอบบอส", "A donut around the boss",
     "donut รอบบอส: หลบเข้าใน target circle ของบอส",
     "A donut around the boss: get inside its target circle",
     strict=False, ref="b1-tvortex")
step(P2, "Stormcloud Summons", "ครั้งที่ 3: เหมือนครั้งแรก", "The third time: as the first",
     "เหมือนครั้งแรก: นับให้ดีว่าบอสดูดเมฆ (Smokeater) กี่ครั้ง แล้วดูแบบของจำนวนนั้นด้านบน",
     "As the first time: count carefully how many times the boss eats clouds (Smokeater), then play that count as above",
     strict=False)
step(P2, "Stormcloud Summons → Lightning Bolt", "ครั้งที่ 2: เส้นกว้างขึ้นมาก", "The second time: much wider lines",
     "รอบนี้เส้นตรงจากเมฆรอบนอกกว้างขึ้นมาก\n"
     "วิ่งหลบไปเรื่อยๆ อย่าให้โดน",
     "This time the lines from the outer clouds are much wider\n"
     "Keep moving and don't get hit",
     strict=False, ref="b1-bolt2")

# ------------------------------------------------------------------ trash before boss 2
step(P3, "Kill order", "ลำดับการฆ่า", "Kill order",
     "ฆ่าตามลำดับนี้ ทีละตัว:\n"
     "① Shishu kotengu ตัวใกล้\n"
     "② Shishu onmitsugashira\n"
     "③ Shishu kotengu ตัวไกล",
     "Kill them in this order, one at a time:\n"
     "① the near Shishu kotengu\n"
     "② the Shishu onmitsugashira\n"
     "③ the far Shishu kotengu",
     strict=False, ref="t2-order")
step(P3, "Line AoEs from the edge", "ภูตวิ่งรอบขอบสนาม ยิงเส้นตรง", "Spirits running round the edge fire lines",
     "ในสนามนี้มีภูตหลายตัววิ่งไปมารอบขอบสนาม แล้วยิง AoE เส้นตรงเข้ามา\n"
     "ตีลูกน้องไปพร้อมกับระวังเส้นจากภูตรอบขอบ\n\n"
     "Tank: ดึงลูกน้องแล้วพาไปที่ขอบฝั่งตะวันตกหรือตะวันออก\n"
     "หันกล้องไปฝั่งตรงข้าม จะเห็นทั้งภูตฝั่งเราและฝั่งตรงข้ามในจอ",
     "In this field several spirits run around the edge and fire line AoEs inwards\n"
     "Hit the trash while watching for the lines from the edge\n\n"
     "Tank: pull the trash to the west or east edge\n"
     "and point your camera across, so both your side's and the far side's spirits are on screen",
     strict=False, ref="t2-sprite", mech_en="Line AoEs from the edge",
     says={"MT": "ดึงลูกน้องไปขอบตะวันตกหรือตะวันออก หันกล้องไปฝั่งตรงข้าม"}, says_en={"MT": "Pull to the west or east edge and point the camera across"})
step(P3, "Shishu kotengu", "กลุ่ม ① และ ③", "Packs ① and ③",
     "Backward Blows / Leftward Blows / Rightward Blows: ครั้งแรกตี cone ด้านหน้า\n"
     "ครั้งที่ 2 ตี cone ไปทางที่ร่าย (หลัง / ซ้าย / ขวา)\n"
     "Wrath of the Tengu: raid-wide มีดาเมจต่อเนื่อง (DoT)\n\n"
     "kotengu ตัวที่ 2 (③) ใช้ท่าเหมือนตัวแรก",
     "Backward Blows / Leftward Blows / Rightward Blows: first a cone to the front\n"
     "then a second cone the way the cast says (behind / left / right)\n"
     "Wrath of the Tengu: raid-wide with damage over time\n\n"
     "The second kotengu (③) uses the same moves as the first",
     strict=False, ref="t2-kotengu")
step(P3, "Shishu onmitsugashira", "กลุ่ม ②", "Pack ②",
     "Juji Shuriken: เล็งผู้เล่น 1 คนแบบสุ่ม ยิงเส้นตรง\n"
     "Huton: ใช้ Juji Shuriken 3 ครั้งติดกัน",
     "Juji Shuriken: a line AoE at one random player\n"
     "Huton: Juji Shuriken three times in a row",
     strict=False, ref="t2-onmitsu")

# ------------------------------------------------------------------ boss 2: Gorai
BB = "Seal of Scurrying Sparks · Flame and Sulphur → Brazen Ballad"
step(P4, BB, "pair stack + หินกับไฟ", "Pair stacks + rocks and fire",
     "Seal of Scurrying Sparks: 2 ใน 4 คนได้ debuff pair stack\n"
     "Flame and Sulphur: หิน (AoE วงกลม) กับไฟ (AoE เส้นตรง) ขึ้นบนสนาม\n"
     "Brazen Ballad จะเปลี่ยนรูป AoE ของหินและไฟ\n\n"
     "pair stack: บางครั้งลงเอียง เช่น TH ได้ทั้งสองอัน\n"
     "ถ้าเอียง: แบ่งเป็น MT·D1 (Tank/Melee) กับ H1·D2 (Healer/Range)",
     "Seal of Scurrying Sparks: two of the four get a pair-stack debuff\n"
     "Flame and Sulphur: rocks (circle AoEs) and fire (line AoEs) appear on the floor\n"
     "Brazen Ballad changes the shape of the rock and fire AoEs\n\n"
     "Pair stacks: sometimes lopsided, e.g. both on TH\n"
     "If so: split as MT·D1 (Tank/Melee) and H1·D2 (Healer/Range)",
     strict=False, ref="b2-seal")
step(P4, BB, "อ่าน Brazen Ballad จากสีของพิณ", "Read Brazen Ballad by the lute",
     "ดูจากเอฟเฟกต์พิณ (biwa) ที่หมุนรอบตัวบอส: สีและรูปร่าง\n\n"
     "ขยาย (วงกลมสีชมพู):\n"
     "หินวงกลม → วงใหญ่ขึ้น\n"
     "ไฟเส้นตรง → กว้างขึ้นทางข้าง\n\n"
     "แตกตัว (สามเหลี่ยมสีฟ้า):\n"
     "หินวงกลม → กลายเป็น donut\n"
     "ไฟเส้นตรง → แตกออกจากในไปนอก เพิ่มอีก 2 เส้น",
     "Read the lute (biwa) effect circling the boss: its colour and shape\n\n"
     "Expand (pink, round):\n"
     "rock circles → bigger\n"
     "fire lines → wider\n\n"
     "Split (blue, triangle):\n"
     "rock circles → donuts\n"
     "fire lines → split, moving from the inside out, two more of them",
     strict=False, ref="b2-ballad")
TH_DPS = seats("คู่ TH: MT·H1", "คู่ DPS: D1·D2", "TH pair: MT·H1", "DPS pair: D1·D2")
step(P4, BB, "แตกตัว: ตอนขึ้น", "Split: as it appears",
     "แตกตัว: จากตำแหน่งตอนแรก ตรงที่เส้นไฟผ่านหิน = จุดปลอดภัย\n"
     "(ภาพ: คู่ TH หินตะวันออก / คู่ DPS หินตะวันตก)",
     "Split: in the starting layout, where a fire line runs through a rock = the safe spot\n"
     "(Picture: TH pair at an east rock / DPS pair at a west rock)",
     strict=True, pic="b2-06", scene=sc2.bb_split_tell, says=TH_DPS[0], says_en=TH_DPS[1])
step(P4, BB, "แตกตัว: ตอนระเบิด", "Split: as it goes off",
     "หินกลายเป็น donut (กลางหินปลอดภัย) และเส้นไฟแตกออกไปข้างๆ\n"
     "ยืนกลางหินที่เส้นไฟเคยผ่าน แล้วรับ pair stack",
     "The rocks become donuts (the rock's centre is safe) and the fire lines split away\n"
     "Stand in the middle of a rock the fire used to cross, and take your pair stack",
     strict=True, pic="b2-07", scene=sc2.bb_split_go, says=TH_DPS[0], says_en=TH_DPS[1])
step(P4, BB, "ขยาย: ตอนขึ้น", "Expand: as it appears",
     "ขยาย: จากตำแหน่งตอนแรก ที่โล่งกว้างไม่มี AoE = จุดปลอดภัยสุดท้าย\n"
     "(ภาพ: คู่ TH มุมตะวันตกเฉียงเหนือ / คู่ DPS มุมตะวันออกเฉียงใต้)",
     "Expand: in the starting layout, the wide place with no AoE = the final safe spot\n"
     "(Picture: TH pair in the north-west corner / DPS pair in the south-east corner)",
     strict=True, pic="b2-08", scene=sc2.bb_grow_tell, says=TH_DPS[0], says_en=TH_DPS[1])
step(P4, BB, "ขยาย: ตอนระเบิด", "Expand: as it goes off",
     "หินวงใหญ่ขึ้น เส้นไฟกว้างขึ้น: เหลือที่ว่างตามภาพ\n\n"
     "ทั้ง 2 แบบ: บางครั้งตำแหน่งหินและไฟไม่เหมือนในภาพ ระวังด้วย",
     "The rocks grow and the fire lines widen: what's left is as pictured\n\n"
     "Both patterns: the rocks and fire are sometimes laid out differently from the pictures, take care",
     strict=True, pic="b2-09", scene=sc2.bb_grow_go, says=TH_DPS[0], says_en=TH_DPS[1])
step(P4, "Impure Purgation", "cone 2 ครั้ง", "Two cones",
     "cone ลงตรงที่ผู้เล่นยืน แล้วลง cone ซ้ำที่ตำแหน่งครั้งแรกอีกรอบ\n"
     "ครั้งแรก: รับ cone\n"
     "ครั้งที่ 2: ย้ายไปที่ที่ cone ไม่มา",
     "Cones at where the players stand, then cones again at those first spots\n"
     "First: take your cone\n"
     "Second: move to where the cones don't come",
     strict=False, ref="b2-purg")
step(P4, "Thundercall → Humble Hammer", "ลูกสายฟ้า 6 ลูก + ค้อนที่ Healer", "Six levin orbs + the hammer on the healer",
     "สายฟ้า 6 ลูกขึ้นบนสนาม และ Humble Hammer: AoE วงเล็กใส่ Healer ทำให้ตัวเล็ก (Minimum)\n"
     "ตอนลูกสายฟ้าระเบิด บอสยิงลำแสงจากตัวบอสไปหา Healer\n\n"
     "Healer: ไปรับ Humble Hammer ที่ลูกสายฟ้าตรงมุม เพื่อทำให้ลูกเล็กลงแล้วเกิดที่ปลอดภัย\n"
     "Tank: ออกไปยืนหน้า Healer รับลำแสงด้วยกัน (TH รับ)\n"
     "DPS: โดนลำแสงแล้วตาย: ไปยืนให้พ้นแนว",
     "Six levin orbs appear, and Humble Hammer: a small circle on the healer that shrinks them (Minimum)\n"
     "When the orbs explode, the boss fires a beam from itself at the healer\n\n"
     "Healer: take the Humble Hammer at a corner orb to shrink it and make a safe spot\n"
     "Tank: step in front of the healer and take the beam together (TH take it)\n"
     "DPS: the beam kills you: stand out of its line",
     strict=False, ref="b2-hammer",
     says={"MT": "ยืนหน้า Healer รับลำแสงด้วยกัน", "H1": "รับ Humble Hammer ที่ลูกสายฟ้าตรงมุม", "D1": "หลบออกนอกแนวลำแสง", "D2": "หลบออกนอกแนวลำแสง"},
     says_en={"MT": "Stand in front of the healer and share the beam", "H1": "Take Humble Hammer at the corner orb", "D1": "Stay out of the beam's line", "D2": "Stay out of the beam's line"})
step(P4, "Thundercall → Humble Hammer", "ลูกไหนที่ต้องตีค้อน", "Which orb gets the hammer",
     "ลูกสายฟ้า 4 ลูกขึ้นเชื่อมกลางสนามตามแนวทแยง เป็นเส้นโค้งเบาๆ\n"
     "2 ลูกด้านในจะขึ้นเยื้องไปทางมุมใดมุมหนึ่ง\n"
     "ลูกสายฟ้าที่มุม ฝั่งที่ 2 ลูกกลางไม่ได้เยื้องเข้าไป = ลูกที่ต้องให้ Humble Hammer ตี",
     "Four orbs appear across the middle along the diagonal, in a gentle curve\n"
     "The inner two sit off towards one of the corners\n"
     "The corner orb on the side the middle two do not lean towards = the one the Humble Hammer must hit",
     strict=False, ref="b2-orbs")
step(P4, "Torching Torment", "Tank buster", "Tank buster",
     "tank buster แรงใส่ Tank พร้อมดาเมจต่อเนื่องแบบไฟไหม้: ใช้ mitigate",
     "A heavy tank buster with a burn over time: mitigate",
     strict=False, says={"MT": "ใช้ mitigate"}, says_en={"MT": "Mitigate"})
RR = "Rousing Reincarnation · Malformed Prayer · Pointed Purgation"
step(P4, RR, "ภาพรวม + debuff", "Overview + debuffs",
     "ทั้ง 4 คนได้ Odder Incarnation (น้ำเงิน) หรือ Rodential Rebirth (แดง)\n"
     "tower แดงกับน้ำเงินขึ้น 4 รอบ ระหว่างนั้นบอสตี cone 2 อัน (Pointed Purgation) ไปทางคนที่ได้สาย\n\n"
     "debuff: เลข I–IV = เข้า tower รอบที่เท่าไร\n"
     "แบ่งเป็นกลุ่มคี่ 1/3 กับกลุ่มคู่ 2/4 เสมอ\n"
     "สีแดง/น้ำเงิน = สีของ tower: เข้า tower สีเดียวกัน\n\n"
     "ในภาพ: ผู้เล่นวาดเป็นแถบ debuff (เลข + สี) แทนไอคอน role เพราะใครได้อะไรสุ่ม",
     "All four get Odder Incarnation (blue) or Rodential Rebirth (red)\n"
     "Red and blue towers appear four times, and in between the boss fires two cones (Pointed Purgation) at the tethered players\n\n"
     "The debuff: numerals I–IV = which round of towers you take\n"
     "Always split into the odd group 1/3 and the even group 2/4\n"
     "Red/blue = the tower's colour: take the tower of your colour\n\n"
     "In the pictures: players are drawn as their debuff strip (number + colour), not a role badge, because who gets what is random",
     strict=False, ref="b2-rousing")
step(P4, RR, "①", "①",
     "① debuff ติด: รวมกันทางใต้\n"
     "กลุ่ม 1/3 รอนอก target circle\n"
     "กลุ่ม 2/4 ออกไปข้างหน้ารับสาย",
     "① The debuffs land: gather south\n"
     "Group 1/3 waits outside the target circle\n"
     "Group 2/4 steps forward to take the tethers",
     strict=False, pic="b2-12", scene=sc2.rr_gather)
step(P4, RR, "②", "②",
     "② พอสายขึ้น: กลุ่ม 1 (1/3) เข้า tower สีของตัวเอง\n"
     "คนถือสาย: ขยับให้ cone ไม่โดนกลุ่มที่อยู่ใน tower",
     "② When the tethers appear: group 1 (1/3) takes the tower of its colour\n"
     "Tether holders: adjust so the cones miss the tower group",
     strict=False, pic="b2-13", scene=sc2.rr_1)
step(P4, RR, "③", "③",
     "③ tower กับ cone รอบที่ 1 ลง\n"
     "1/3 ที่เข้า tower แล้ว: ไปรับสายต่อจาก 2/4\n"
     "2/4: ไป tower ของตัวเอง",
     "③ The first towers and cones go off\n"
     "1/3, done with their towers: go take the tethers from 2/4\n"
     "2/4: go to your towers",
     strict=False, pic="b2-14", scene=sc2.rr_2)
step(P4, RR, "④", "④",
     "④ tower กับ cone รอบที่ 2 ลง\n"
     "2/4 ที่เข้า tower แล้ว: ไปรับสายต่อจาก 1/3\n"
     "1/3: ไป tower ของตัวเอง",
     "④ The second towers and cones go off\n"
     "2/4, done with their towers: go take the tethers from 1/3\n"
     "1/3: go to your towers",
     strict=False, pic="b2-15", scene=sc2.rr_3)
step(P4, RR, "⑤", "⑤",
     "⑤ tower กับ cone รอบที่ 3 ลง\n"
     "1/3 ที่เข้า tower แล้ว: ไปรับสายต่อจาก 2/4\n"
     "2/4: ไป tower ของตัวเอง",
     "⑤ The third towers and cones go off\n"
     "1/3, done with their towers: go take the tethers from 2/4\n"
     "2/4: go to your towers",
     strict=False, pic="b2-16", scene=sc2.rr_4)
step(P4, RR, "⑥ จบ", "⑥ Done",
     "⑥ tower กับ cone รอบที่ 4 ลง\n"
     "จบ Mechanic",
     "⑥ The fourth towers and cones go off\n"
     "Mechanic over",
     strict=False, pic="b2-17", scene=sc2.rr_5)
step(P4, RR, "คำแนะนำจากทีม game8", "game8's tip",
     "2/4 ที่รับสายรอบแรก: พอ tower ที่ 2 ของตัวเองขึ้น ให้เข้าไปยืนใน tower เลย\n"
     "จากนั้น 1/3 รับสาย แล้วพอ tower ที่ 3 ขึ้นก็เข้าไปรับ\n"
     "2/4 ที่เข้า tower เสร็จ: รับสายแล้วไปรอตรงที่ tower ที่ 4 จะขึ้น\n\n"
     "แบบนี้ลดอุบัติเหตุไปไม่ทันแล้ว tower ระเบิด\n"
     "ถ้าสถานการณ์ทำได้ ทำแบบนี้ดี",
     "2/4 who took the first tethers: as soon as your second tower appears, go stand in it\n"
     "Then 1/3 take the tethers, and stand in the third tower when it appears\n"
     "2/4, done with their towers: take the tethers and wait where the fourth tower will appear\n\n"
     "This cuts the accidents where someone is late and a tower explodes\n"
     "Do it this way when the situation allows",
     strict=False)
SS = "Seal of Scurrying Sparks · Cloud to Ground"
step(P4, SS, "spread + pair stack + exaflare", "Spread + pair stacks + exaflares",
     "Seal of Scurrying Sparks: ทั้ง 4 คนได้ debuff AoE วงกลม (spread) และ 2 คนได้ pair stack\n"
     "Cloud to Ground: AoE วงกลมเดินไปตามลูกศรทีละช่อง (exaflare)\n"
     "หลบ exaflare ไปพร้อมกับรับ debuff\n\n"
     "pair stack: ถ้าลงเอียง (เช่น TH ได้ทั้งคู่) แบ่งเป็น MT·D1 / H1·D2\n"
     "spread: ติดทั้ง 4 คน: กระจายกันรับ",
     "Seal of Scurrying Sparks: all four get a circle debuff (spread) and two get a pair stack\n"
     "Cloud to Ground: circle AoEs that march along their arrows a step at a time (exaflares)\n"
     "Dodge the exaflares while taking the debuffs\n\n"
     "Pair stacks: if lopsided (e.g. both on TH), split as MT·D1 / H1·D2\n"
     "Spread: on all four: spread out",
     strict=False, ref="b2-exa")
step(P4, SS, "spread ก่อน ①", "Spread first ①",
     "① รอยเตือนขึ้น",
     "① The telegraphs appear",
     strict=False, pic="b2-20", scene=sc2.ex_tell)
step(P4, SS, "spread ก่อน ②", "Spread first ②",
     "② spread ก่อน: กระจายกันไว้",
     "② Spread first: spread out",
     strict=False, pic="b2-21", scene=sc2.ex_spread_wait)
step(P4, SS, "spread ก่อน ③", "Spread first ③",
     "③ exaflare ลง และ AoE วงกลมลงที่ผู้เล่น\n"
     "จากนั้น pair stack ตามมา",
     "③ The exaflares go off and the circles land on the players\n"
     "Then the pair stacks follow",
     strict=False, pic="b2-22", scene=sc2.ex_spread_hit)
P_MD = ({"MT": "คู่ MT·D1", "D1": "คู่ MT·D1", "H1": "คู่ H1·D2", "D2": "คู่ H1·D2"},
        {"MT": "Pair MT·D1", "D1": "Pair MT·D1", "H1": "Pair H1·D2", "D2": "Pair H1·D2"})
step(P4, SS, "spread ก่อน ④ pair stack", "Spread first ④ pair stacks",
     "④ pair stack ลง\n"
     "exaflare วิ่งแนวเหนือ-ใต้: รับแถวเหนือกับใต้\n"
     "exaflare วิ่งแนวตะวันออก-ตะวันตก: รับแถวตะวันออกกับตะวันตก\n"
     "(ภาพ: MT·D1 / H1·D2)",
     "④ The pair stacks go off\n"
     "Exaflares running north-south: take them around north and south\n"
     "Exaflares running east-west: around east and west\n"
     "(Picture: MT·D1 / H1·D2)",
     strict=True, pic="b2-23", scene=sc2.ex_spread_pairs, says=P_MD[0], says_en=P_MD[1])
step(P4, SS, "pair stack ก่อน ①", "Pair stack first ①",
     "① รอยเตือนขึ้นแบบเดียวกับด้านบน\n"
     "ดูทิศของ exaflare รอบนอกไว้",
     "① The same telegraphs as above\n"
     "Note which way the outer exaflares run",
     strict=False)
step(P4, SS, "pair stack ก่อน ②", "Pair stack first ②",
     "② pair stack ก่อน: อยู่รวมกันเป็นคู่",
     "② Pair stack first: stay together in your pairs",
     strict=True, pic="b2-24", scene=sc2.ex_stack_wait, says=P_MD[0], says_en=P_MD[1])
step(P4, SS, "pair stack ก่อน ③", "Pair stack first ③",
     "③ pair stack ลง\n"
     "ต่อด้วย spread: แยกห่างกัน ไปที่ที่ exaflare ไม่โดน",
     "③ The pair stacks go off\n"
     "Spread follows: move apart, to where the exaflares don't hit",
     strict=True, pic="b2-25", scene=sc2.ex_stack_hit, says=P_MD[0], says_en=P_MD[1])
step(P4, SS, "pair stack ก่อน ④", "Pair stack first ④",
     "④ AoE วงกลมลงที่ผู้เล่น",
     "④ The circles land on the players",
     strict=False, pic="b2-26", scene=sc2.ex_stack_spread)
FS = "Fighting Spirits"
step(P4, FS, "ลูกเต๋า 1–4: แบบ Spell", "Dice 1–4: Spell's way",
     "ผู้เล่น 4 คนได้ลูกเต๋าเลข 1–4\n"
     "บอสกระโดดใส่ผู้เล่นตามลำดับเลข แล้วตี AoE รูปกากบาทใหญ่จากจุดที่ลง\n\n"
     "game8 ใช้วิธีของ Spell ที่นิยมใน PF: เรียงแถวแนวนอน\n"
     "Marker: D ตะวันตก / B ตะวันออก / 4 / 2 / 1 / 3 ตามขอบใต้ (ดูขั้นแรก)\n"
     "ใครได้เลขไหนสุ่ม: ในภาพไม่มีวงตำแหน่ง",
     "Four players get dice 1–4\n"
     "The boss jumps on them in number order and hits a giant cross AoE from where it lands\n\n"
     "game8 uses Spell's way, popular in PF: line up across the arena\n"
     "Waymarks: D west / B east / 4 / 2 / 1 / 3 along the south edge (see the first step)\n"
     "Who gets which number is random: no spot rings in these pictures",
     strict=False, ref="b2-dice")
step(P4, FS, "① ไปที่ Marker เลขของตัวเอง", "① To your number's marker",
     "① ลูกเต๋าติด: ไปที่ Marker เลขของตัวเอง\n"
     "ใช้ Arm's Length หรือ Surecast กันกระเด็น",
     "① The dice land: go to the marker of your number\n"
     "Use Arm's Length or Surecast against the knockback",
     strict=False, pic="b2-27", scene=sc2.dice_get)
step(P4, FS, "② เลข 1 รอบนแนว B–D", "② Number 1 waits on the B–D line",
     "② เลข 1: รอตรงแนวตรงขึ้นไปจาก Marker 1 และอยู่บนแนว B–D",
     "② Number 1: wait straight up from marker 1, on the B–D line",
     strict=False, pic="b2-28", scene=sc2.dice_1wait)
step(P4, FS, "③ ลง", "③ It hits",
     "③ บอสตีลง\n"
     "เลข 1 รับเสร็จแล้วกลับไปที่ Marker 1",
     "③ The boss hits\n"
     "Number 1, once hit, goes back to marker 1",
     strict=False, pic="b2-29", scene=sc2.dice_1hit)
step(P4, FS, "④ เลข 2", "④ Number 2",
     "④ เลข 2: พอของเลข 1 ลงเสร็จ ออกไปข้างหน้ารับทันที",
     "④ Number 2: as soon as number 1's hit is done, step forward and take it",
     strict=False, pic="b2-30", scene=sc2.dice_2)
step(P4, FS, "⑤ เลข 3", "⑤ Number 3",
     "⑤ เลข 3: พอของเลข 2 ลงเสร็จ ออกไปข้างหน้ารับทันที",
     "⑤ Number 3: as soon as number 2's hit is done, step forward and take it",
     strict=False, pic="b2-31", scene=sc2.dice_3)
step(P4, FS, "⑥ เลข 4", "⑥ Number 4",
     "⑥ เลข 4: พอของเลข 3 ลงเสร็จ ออกไปข้างหน้ารับทันที",
     "⑥ Number 4: as soon as number 3's hit is done, step forward and take it",
     strict=False, pic="b2-32", scene=sc2.dice_4)
step(P4, FS, "⑦ ตีกลางสนาม: หลบไปตะวันตกเฉียงใต้กับตะวันออกเฉียงใต้", "⑦ The middle: to the south-west and south-east",
     "⑦ สุดท้ายบอสตีกลางสนาม\n"
     "ทุกคนหลบไปทางตะวันตกเฉียงใต้กับตะวันออกเฉียงใต้\n"
     "จบ Mechanic",
     "⑦ Last, the boss hits the middle\n"
     "Everyone moves to the south-west and south-east\n"
     "Mechanic over",
     strict=False, pic="b2-33", scene=sc2.dice_last)
MR = "Malformed Reincarnation"
step(P4, MR, "ภาพรวม: tower 3 ครั้ง + Malformed Prayer", "Overview: three towers each + Malformed Prayer",
     "รอบนี้ทุกคนต้องเข้า tower สีตาม debuff 3 ครั้ง\n"
     "และได้ debuff ใหม่ Malformed Prayer: ใช้มันแก้ Mechanic\n\n"
     "game8 ใช้วิธีของ Posiume ที่นิยมใน PF\n\n"
     "ในภาพ: ผู้เล่นวาดเป็นแถบ 4 ช่อง\n"
     "ช่องแรก = Malformed Prayer (แดง / เขียวอมฟ้า = น้ำเงิน)\n"
     "ช่อง I II III = สีของ tower ที่ต้องเข้า รอบที่ 1 2 3",
     "This time everyone must take three towers of their debuff colours\n"
     "and gets a new debuff, Malformed Prayer: it is how you solve the Mechanic\n\n"
     "game8 uses Posiume's way, popular in PF\n\n"
     "In the pictures: each player is a four-cell strip\n"
     "first cell = Malformed Prayer (red / teal = blue)\n"
     "cells I II III = the colour of the tower to take in rounds 1, 2, 3",
     strict=False, ref="b2-malformed")
step(P4, MR, "debuff: ทุกคนสีไม่ซ้ำ / มีสีเดียวกันทั้งแถบ", "Debuffs: mixed colours / one colour throughout",
     "ทุกคนสีผสม: เลข I–III = เข้า tower สีไหนรอบที่เท่าไร\n"
     "ไปฝั่งสีตรงข้ามกับสีของ I วาง tower แล้วข้ามไปเข้า tower ฝั่งตรงข้าม\n\n"
     "มีสีเดียวกันทั้งแถบ: 2 คนได้น้ำเงินล้วนหรือแดงล้วน\n"
     "มีคนต้องเข้า tower สีเดียวกัน 3 ครั้ง: ต้องวาง Malformed Prayer ให้ถูกที่\n"
     "ไปฝั่งสีตรงข้ามกับ I แต่วาง Prayer แดงทางซ้าย / น้ำเงินทางขวา แล้วข้ามไปเข้า tower\n\n"
     "Malformed Prayer: หมดเวลาแล้ว tower สีเดียวกับ Prayer ขึ้นตรงที่เรายืน\n"
     "tower บนสนามมีแค่ 8 อัน: ต้องใช้ tower จาก Prayer ถึงจะเข้าครบ 3 ครั้ง\n"
     "วางทับ tower ที่มีอยู่ = ระเบิด wipe: วางในที่ว่าง\n\n"
     "Prayer สีอะไร: แถบสีผสม (เช่น น้ำเงิน น้ำเงิน แดง) = สีเดียวกับ I เสมอ\n"
     "แถบสีเดียว (น้ำเงิน น้ำเงิน น้ำเงิน) = สีตรงข้ามกับ I เสมอ",
     "Mixed colours: numerals I–III = which colour of tower in which round\n"
     "Go to the side of the colour opposite your I, drop your tower, then cross to the far side's towers\n\n"
     "One colour throughout: two players get all blue or all red\n"
     "Someone has to take the same colour three times, so where the Malformed Prayer goes matters\n"
     "Go to the side opposite your I, but drop a red Prayer on the left / a blue one on the right, then cross to the towers\n\n"
     "Malformed Prayer: when it runs out, a tower of its colour appears where you stand\n"
     "There are only 8 towers on the field: you need the Prayer towers to take three each\n"
     "Dropping it on an existing tower = it explodes, wipe: drop it in an empty spot\n\n"
     "The Prayer's colour: a mixed strip (e.g. blue blue red) = always the same as I\n"
     "a one-colour strip (blue blue blue) = always the opposite of I",
     strict=False)
step(P4, MR, "แบบมีสีเดียวกันทั้งแถบ: แดงซ้าย น้ำเงินขวา", "One-colour pattern: red left, blue right",
     "แบบมีสีเดียวกันทั้งแถบ: วาง tower แดงทางซ้าย น้ำเงินทางขวา เสมอ\n"
     "(ภาพ: B = วาง Prayer น้ำเงิน / R = วาง Prayer แดง / ลูกศร = ทางเดิน)",
     "One-colour pattern: always red tower on the left, blue on the right\n"
     "(Picture: B = drop the blue Prayer / R = drop the red Prayer / arrows = the route)",
     strict=False, pic="b2-38", scene=sc2.mr_rule)
step(P4, MR, "①", "①",
     "① tower ขึ้น debuff ติด",
     "① The towers appear, the debuffs land",
     strict=False, pic="b2-39", scene=sc2.mr_1)
step(P4, MR, "②", "②",
     "② ไปฝั่งของสีตรงข้ามกับสีของ I\n"
     "(ภาพ: I น้ำเงิน → ฝั่ง tower แดง (เหนือ) / I แดง → ฝั่ง tower น้ำเงิน (ใต้))",
     "② Go to the side of the colour opposite your I\n"
     "(Picture: I blue → the red-tower side (north) / I red → the blue-tower side (south))",
     strict=False, pic="b2-40", scene=sc2.mr_2)
step(P4, MR, "③ วาง Prayer", "③ Drop the Prayer",
     "③ แบบมีสีเดียวกันทั้งแถบ: วาง tower ซ้าย (ตะวันตก) แดง / ขวา (ตะวันออก) น้ำเงิน\n"
     "(ภาพ: ฝั่งใต้ แดงตะวันตก น้ำเงินตะวันออก / ฝั่งเหนือ น้ำเงินตะวันตก แดงตะวันออก)",
     "③ One-colour pattern: drop red on the left (west) / blue on the right (east)\n"
     "(Picture: south side red west, blue east / north side blue west, red east)",
     strict=False, pic="b2-41", scene=sc2.mr_3)
step(P4, MR, "④ ข้ามไปฝั่งตรงข้าม", "④ Cross straight over",
     "④ วาง tower จาก Prayer แล้วเดินตรงไปฝั่งตรงข้าม ไปที่ tower สีที่ต้องเข้า\n"
     "มี Sprint ให้ใช้",
     "④ Once the Prayer tower is down, walk straight across to the tower of the colour you need\n"
     "Use Sprint if you have it",
     strict=False, pic="b2-42", scene=sc2.mr_4)
step(P4, MR, "⑤ ไป tower มุม", "⑤ To the corner towers",
     "⑤ เข้า tower กลาง 4 อันเสร็จ: ไปเข้า tower ที่มุมทันที\n"
     "ตอนนี้ AoE ลายตาข่ายขึ้น แต่ยังไม่ลง: ไม่ต้องสนใจ",
     "⑤ Done with the middle four towers: go straight to the corner towers\n"
     "A criss-cross (mesh) AoE appears now, but it doesn't fire yet: ignore it",
     strict=False, pic="b2-43", scene=sc2.mr_5)
step(P4, MR, "⑥ เข้า tower จาก Prayer", "⑥ The Prayer tower",
     "⑥ สุดท้ายเข้า tower ที่วางไว้จาก Prayer\n"
     "tower ที่ 3 จบพร้อมกับตาข่ายลูกแรกลง: รอในรอยเตือนของลูกที่ 2",
     "⑥ Last, take the tower you dropped with your Prayer\n"
     "The first mesh fires as the third towers end: wait in the second one's telegraph",
     strict=False, pic="b2-44", scene=sc2.mr_6)
step(P4, MR, "⑦ ตาข่ายลูกแรก", "⑦ The first mesh",
     "⑦ ตาข่ายลูกแรกลง",
     "⑦ The first mesh fires",
     strict=False, pic="b2-45", scene=sc2.mr_7)
step(P4, MR, "⑧ ตาข่ายลูกที่ 2", "⑧ The second mesh",
     "⑧ ตาข่ายลูกที่ 2 ลง\n"
     "จบ Mechanic",
     "⑧ The second mesh fires\n"
     "Mechanic over",
     strict=False, pic="b2-46", scene=sc2.mr_8)
step(P4, MR, "แบบทุกคนสีผสม", "The mixed-colour pattern",
     "ทั้ง 2 แบบ: ไปฝั่ง tower สีตรงข้ามกับสีของ I เหมือนกัน: จำไว้ให้ดี\n"
     "แบบทุกคนสีผสม: ไม่มีกฎว่าต้องวางซ้ายหรือขวา วางที่ไหนก็ได้\n"
     "(ฝั่ง tower แดงจะเป็นคนน้ำเงิน น้ำเงิน / ฝั่ง tower น้ำเงินเป็นคนแดง แดง)",
     "Both patterns: going to the side of the colour opposite your I is the same: remember it\n"
     "Mixed-colour pattern: no left/right rule for the drop, put it anywhere\n"
     "(the red-tower side gets the blue-blue players / the blue side the red-red)",
     strict=False)

# ------------------------------------------------------------------ boss 3: Moko
step(P5, "Kenki Release", "raid-wide", "Raid-wide",
     "raid-wide: ใช้ mitigate",
     "Raid-wide: mitigate",
     strict=False, ref="b3-kenki")
step(P5, "Triple Kasumi-giri", "270° สามครั้ง: ไฟ / น้ำ", "270° three times: fire / water",
     "Kasumi-giri 270° ติดกัน 3 ครั้ง\n"
     "ต่างจากใน Variant: รอยเตือนเหนือหัวบอสมีธาตุไฟหรือน้ำ\n"
     "ต้องเข้า-ออก target circle ไปพร้อมกับไปช่องปลอดภัย\n\n"
     "น้ำ: donut 270° รอบบอส: ใน target circle ปลอดภัย\n"
     "ไฟ: 270° + วงกลมทับ target circle: ใน target circle ไม่ปลอดภัย",
     "Kasumi-giri, 270°, three in a row\n"
     "Unlike the Variant, the telegraph over the boss's head has fire or water\n"
     "Move in or out of the target circle as well as into the safe slice\n\n"
     "Water: a 270° donut around the boss: inside the target circle is safe\n"
     "Fire: 270° plus a circle over the target circle: inside it is not safe",
     strict=False, ref="b3-kasumi")
step(P5, "Triple Kasumi-giri", "วิธีหลบ", "How to dodge it",
     "อย่าจำทั้ง 3 ลูกพร้อมกัน จะลืม\n"
     "พอลูกแรกขึ้น ไปยืนที่ปลอดภัยของลูกแรกไว้เลย แล้วจำแค่ลูก 2–3\n\n"
     "หมุนกล้องทุกครั้ง: ฟันแต่ละครั้งบอสจะหันไปทางตรงข้ามกับที่ปลอดภัย แล้วลูก 2–3 ยึดทิศนั้น\n"
     "ไปถึงที่ปลอดภัยแต่ละครั้ง หมุนกล้องให้มองบอสจากที่ยืน: จะไม่สับสนตอนย้ายไปลูกต่อไป",
     "Don't try to memorise all three, you'll forget\n"
     "When the first appears, move to its safe spot straight away and only remember 2 and 3\n\n"
     "Turn your camera every time: after each slash the boss faces away from the safe spot, and 2 and 3 go by that facing\n"
     "At each safe spot, turn the camera to look at the boss from there: then moving on to the next doesn't confuse you",
     strict=False)
step(P5, "Lateral Slice", "Tank buster กายภาพ", "Physical tank buster",
     "tank buster กายภาพ: ใช้ mitigate",
     "A physical tank buster: mitigate",
     strict=False, says={"MT": "ใช้ mitigate"}, says_en={"MT": "Mitigate"})
SC = "Scarlet Auspice → Invocation of Vengeance → Fleeting Iai-giri"
step(P5, SC, "ภาพรวม", "Overview",
     "Scarlet Auspice: ใน target circle บอสโดน\n"
     "แล้ว Boundless Scarlet: ฟันรูปกากบาท และฟันแนวนอนเหนือ-ใต้ประกบ\n"
     "จากนั้น AoE ขยายออกจากรอยฟัน จนเหลือที่ปลอดภัยที่มุมใดมุมหนึ่งใน 4 มุม\n\n"
     "Invocation of Vengeance: ได้ debuff pair stack หรือ spread\n"
     "และมีสายจากบอสไปหาผู้เล่น 1 คน: ร่าย Fleeting Iai-giri เสร็จแล้วบอสฟันไอ้ (iai)",
     "Scarlet Auspice: inside the boss's target circle is hit\n"
     "Then Boundless Scarlet: an X slash, with horizontal slashes north and south either side\n"
     "Then AoEs widen out of the slash marks until the only safe spot is one of the four corners\n\n"
     "Invocation of Vengeance: a pair-stack or spread debuff\n"
     "and a tether from the boss to one player: when Fleeting Iai-giri finishes casting, the boss slashes (iai)",
     strict=False, ref="b3-scarlet")
step(P5, SC, "debuff + Fleeting Iai-giri", "Debuffs + Fleeting Iai-giri",
     "pair stack: 2 ใน 4 คน: TH 1 คน DPS 1 คน = คู่ TH กับคู่ DPS แน่นอน\n"
     "คนที่เป็นคู่กับคนล่อ iai: เข้าไปใกล้คนล่อ\n"
     "spread: ติดทั้ง 4 คน: กระจายกันรับ\n\n"
     "Fleeting Iai-giri: รอยเตือน Kasumi-giri ยังขึ้นเหนือหัวบอสเหมือนเดิม\n"
     "แต่ 270° จะยึดทิศที่คนได้สายหันหน้าอยู่ตอนสุดท้าย\n"
     "คนได้สาย: ไปที่ปลอดภัยของ Boundless Scarlet พร้อมปรับทิศ ให้ช่องปลอดภัยของ iai ออกมาฝั่งที่ปลอดภัย",
     "Pair stack: two of the four, one TH and one DPS = a TH pair and a DPS pair, always\n"
     "The partner of the iai baiter: come close to the baiter\n"
     "Spread: on all four: spread out\n\n"
     "Fleeting Iai-giri: the Kasumi-giri telegraph still shows over the boss's head\n"
     "but the 270° goes by the way the tethered player faces at the end\n"
     "Tethered player: go to Boundless Scarlet's safe spot and turn so the iai's safe slice falls on the safe side",
     strict=False, ref="b3-iai")
step(P5, SC, "① Scarlet Auspice", "① Scarlet Auspice",
     "① Scarlet Auspice: ออกนอก target circle",
     "① Scarlet Auspice: get out of the target circle",
     strict=False, pic="b3-04", scene=sc3.sa_circle)
step(P5, SC, "② Boundless Scarlet", "② Boundless Scarlet",
     "② Boundless Scarlet: หลบไปที่ที่ AoE ไม่ถึง",
     "② Boundless Scarlet: move to where it doesn't reach",
     strict=False, pic="b3-05", scene=sc3.sa_boundless)
step(P5, SC, "③ debuff", "③ Debuffs",
     "③ Invocation of Vengeance: debuff ติด\n"
     "(ภาพ: เส้นแดง = รอยฟันบนพื้น / วงแดง = spread / สองจุด = pair stack)",
     "③ Invocation of Vengeance: the debuffs land\n"
     "(Picture: red lines = the slash marks / red ring = spread / two dots = pair stack)",
     strict=False, pic="b3-06", scene=sc3.sa_debuffs)
step(P5, SC, "④ สาย + รอยขยายรอบแรก", "④ The tether + the first widening",
     "④ สายจากบอสไปหาคนที่โดน Fleeting Iai-giri\n"
     "รอยเตือนขยายรอบแรกขึ้นจากรอยฟัน (เส้นหนา)",
     "④ A tether from the boss to the Fleeting Iai-giri target\n"
     "The first widening telegraphs from the slash marks (the thick lines)",
     strict=False, pic="b3-07", scene=sc3.sa_tether)
step(P5, SC, "⑤ ไปมุมที่ปลอดภัย", "⑤ To the safe corner",
     "⑤ ภาพนี้: มุมตะวันออกเฉียงใต้ปลอดภัย\n"
     "คนล่อ iai: ไปมุมตะวันออกเฉียงใต้พร้อมปรับทิศ\n"
     "ภาพนี้หันไปทางตะวันออกเฉียงเหนือ จะไม่ทับที่ปลอดภัย",
     "⑤ In this picture: the south-east corner is safe\n"
     "Iai baiter: go to the south-east corner and turn\n"
     "Here, facing north-east keeps the safe spot clear",
     strict=False, pic="b3-08", scene=sc3.sa_corner)
step(P5, SC, "⑥ ขยายรอบแรก: pair stack", "⑥ The first widening: pair stacks",
     "⑥ AoE ลง กรณี pair stack\n"
     "คู่ของคนล่อ iai: เข้าไปใกล้คนล่อดีที่สุด",
     "⑥ The AoE goes off, pair-stack case\n"
     "The iai baiter's partner: best come close to the baiter",
     strict=True, pic="b3-09", scene=sc3.sa_pairs, says=TH_DPS[0], says_en=TH_DPS[1])
step(P5, SC, "⑦ ขยายรอบแรก: spread", "⑦ The first widening: spread",
     "⑦ กรณี spread",
     "⑦ Spread case",
     strict=False, pic="b3-10", scene=sc3.sa_spreads)
step(P5, SC, "⑧ ขยายรอบที่ 2: pair stack", "⑧ The second widening: pair stacks",
     "⑧ ต่อด้วยขยายรอบที่ 2\n"
     "ภาพนี้: มุมตะวันออกเฉียงเหนือปลอดภัย: ไปที่นั่นแล้วรับ debuff",
     "⑧ The second widening follows\n"
     "In this picture the north-east corner is safe: go there and take your debuff",
     strict=True, pic="b3-11", scene=sc3.sa2_pairs, says=TH_DPS[0], says_en=TH_DPS[1])
step(P5, SC, "⑨ ขยายรอบที่ 2: spread", "⑨ The second widening: spread",
     "⑨ กรณี spread\n"
     "จบ Mechanic",
     "⑨ Spread case\n"
     "Mechanic over",
     strict=False, pic="b3-12", scene=sc3.sa2_spreads)
ST = "Shadow-twin · Moonless Night · Near Edge / Far Edge"
step(P5, ST, "ภาพรวม (ครั้งแรก)", "Overview (the first time)",
     "Shadow-twin: เงาของบอสขึ้น 2 ตัว\n"
     "Moonless Night: มือยักษ์ 2 ข้างขึ้นตรงขอบ หันหน้าเข้าหากัน ตี AoE ครึ่งวงกลมใหญ่\n"
     "มือยักษ์ทำให้เหลือที่ปลอดภัย 2 ที่\n"
     "ในที่ปลอดภัย: รับ iai 2 ครั้งจากเงา (Double Iai-giri) และ Near Edge / Far Edge ของบอส\n\n"
     "Near Edge: bind + AoE วงเล็กใส่ 2 คนที่ใกล้บอส: คนไม่มีสายเป็นคนรับ\n"
     "Far Edge: bind + AoE วงเล็กใส่ 2 คนที่ไกลบอส: คนไม่มีสายเป็นคนรับ",
     "Shadow-twin: two shadows of the boss appear\n"
     "Moonless Night: two giant hands appear at the edge, facing each other, each hitting a huge half-circle\n"
     "The hands leave two safe areas\n"
     "In them, take the shadows' two iai (Double Iai-giri) and the boss's Near Edge / Far Edge\n\n"
     "Near Edge: a bind + small circle on the two nearest the boss: the untethered take it\n"
     "Far Edge: a bind + small circle on the two farthest from the boss: the untethered take it",
     strict=False, ref="b3-twin")
step(P5, ST, "ใครยืนตรงไหน", "Who stands where",
     "Near Edge:\n"
     "คนมีสาย: ขอบนอกของที่ปลอดภัย ไปสุดขอบ ล่อ iai ของเงา หันออกนอกสนาม\n"
     "คนไม่มีสาย: ด้านในของที่ปลอดภัย แถวช่องระหว่าง AoE มือยักษ์ รับ bind\n"
     "bind หลุดแล้ว: ไปที่ปลอดภัยของ iai ลูกที่ 2\n\n"
     "Far Edge:\n"
     "คนมีสาย: ด้านในของที่ปลอดภัย ใกล้บอส ฝั่งช่องระหว่าง AoE มือยักษ์ ล่อ iai หันเข้ากลางสนาม\n"
     "ชิดช่องเกินไปจะทับที่ปลอดภัยของลูกที่ 2: เผื่อระยะไว้\n"
     "คนไม่มีสาย: ไปสุดขอบนอกของที่ปลอดภัย รับ bind\n"
     "bind หลุดแล้ว: ไปที่ปลอดภัยของ iai ลูกที่ 2\n\n"
     "เงา: iai 2 ครั้ง คนมีสายล่อไม่ให้โดนคนไม่มีสาย\n"
     "ลูกแรกปลอดภัยด้านล่าง (ด้านหลัง) เสมอ: ดูแล้วจำลูกที่ 2 ให้ดี",
     "Near Edge:\n"
     "Tethered: the outer edge of the safe area, right to the edge, baiting the shadow's iai, facing out\n"
     "Untethered: the inner side of the safe area, near the gap between the hands' AoEs, taking the bind\n"
     "When the bind wears off: move to the second iai's safe spot\n\n"
     "Far Edge:\n"
     "Tethered: the inner side, near the boss, on the hands' gap side, baiting the iai, facing the middle\n"
     "Too close to the gap crushes the second's safe spot: leave some room\n"
     "Untethered: right to the outer edge of the safe area, taking the bind\n"
     "When the bind wears off: move to the second iai's safe spot\n\n"
     "Shadows: two iai; the tethered bait them away from the untethered\n"
     "The first is always safe below (behind): watch and remember the second",
     strict=False)
step(P5, ST, "① เงาขึ้น สายติด", "① Shadows appear, tethers land",
     "① เงาขึ้น และสายติด\n"
     "(ใครได้สายสุ่ม: ภาพไม่มีวงตำแหน่ง)",
     "① The shadows appear and the tethers land\n"
     "(Who gets a tether is random: no spot rings)",
     strict=False, pic="b3-16", scene=sc3.st_appear)
step(P5, ST, "② Moonless Night + Far Edge", "② Moonless Night + Far Edge",
     "② Moonless Night: มือยักษ์ขึ้นที่ขอบ\n"
     "ภาพนี้ตะวันออกกับตะวันตกโดน: แยกไปเหนือและใต้\n"
     "บอสร่าย Far Edge และเงาขึ้นรอยเตือน iai 2 ครั้งเหนือหัว\n"
     "Far Edge: คนมีสายด้านใน / คนไม่มีสายสุดขอบนอก\n"
     "(ภาพ: TH ฝั่งเหนือ / DPS ฝั่งใต้)",
     "② Moonless Night: the giant hands appear at the edge\n"
     "Here east and west are hit: split north and south\n"
     "The boss casts Far Edge, and the shadows show their two-iai telegraphs overhead\n"
     "Far Edge: tethered inside / untethered at the outer edge\n"
     "(Picture: TH north / DPS south)",
     strict=False, pic="b3-17", scene=sc3.st_far)
step(P5, ST, "③ กรณี Near Edge", "③ The Near Edge case",
     "③ กรณีบอสร่าย Near Edge\n"
     "Near Edge: คนมีสายไปสุดขอบนอก / คนไม่มีสายอยู่ด้านใน (ตามภาพและกฎ Near Edge ของ game8)",
     "③ If the boss casts Near Edge\n"
     "Near Edge: tethered right to the outer edge / untethered inside (as game8's picture and its Near Edge rule show)",
     strict=False, pic="b3-18", scene=sc3.st_near)
step(P5, ST, "④ มือยักษ์ + bind (ต่อจาก ②)", "④ The hands + the binds (from ②)",
     "④ ต่อจาก ②: AoE มือยักษ์ลง และ bind วงเล็กของ Far Edge ลงที่คนไม่มีสาย",
     "④ Continuing from ②: the hands' AoE goes off, and Far Edge's small bind circles land on the untethered",
     strict=False, pic="b3-19", scene=sc3.st_claws)
step(P5, ST, "⑤ iai ลูกแรก", "⑤ The first iai",
     "⑤ iai ลูกแรกใส่คนมีสายลง",
     "⑤ The first iai on the tethered goes off",
     strict=False, pic="b3-20", scene=sc3.st_iai1)
step(P5, ST, "⑥ iai ลูกที่ 2", "⑥ The second iai",
     "⑥ iai ลูกที่ 2 ลง\n"
     "คนไม่มีสาย: bind หลุดแล้ว รีบไปที่ปลอดภัย",
     "⑥ The second iai goes off\n"
     "Untethered: your bind is gone, get to the safe spot quickly",
     strict=False, pic="b3-21", scene=sc3.st_iai2)
step(P5, "Azure Auspice → Triple Kasumi-giri", "donut แล้ว Boundless Azure + Kasumi 3 ครั้ง", "Donut, then Boundless Azure + three Kasumi",
     "Azure Auspice: donut ใน target circle ของบอสปลอดภัย\n"
     "ตามด้วย Boundless Azure: ต่างจาก Boundless Scarlet ตรงที่ AoE ไม่ได้ขยาย\n"
     "แต่ AoE ขึ้นทีละลูกจากรอยฟัน จากในออกไปนอก\n\n"
     "ตอนลูกสุดท้ายขึ้น บอสตั้งท่า Triple Kasumi-giri\n"
     "หลบ AoE ของ Azure ไปพร้อมกับดูที่ปลอดภัยของ Kasumi ให้ทัน",
     "Azure Auspice: a donut, safe inside the boss's target circle\n"
     "Then Boundless Azure: unlike Boundless Scarlet the AoE doesn't widen\n"
     "instead AoEs go off one after another from the slash marks, from the inside out\n\n"
     "As the last ones appear, the boss readies Triple Kasumi-giri\n"
     "Dodge the azure AoEs without missing the Kasumi safe spot",
     strict=False, ref="b3-azure")
SD = "Soldiers of Death → Shadow-twin"
step(P5, SD, "ภาพรวม (ครั้งที่ 2)", "Overview (the second time)",
     "Soldiers of Death: เรียกทหารผี 3 ตัวที่ขอบสนาม\n"
     "Shadow-twin: เงาที่ฟัน iai 2 ครั้ง (Double Iai-giri) ขึ้น 4 ตัว ผูกสายกับผู้เล่นคนละตัว",
     "Soldiers of Death: three soldiers appear on the edge\n"
     "Shadow-twin: four shadows that slash two iai (Double Iai-giri), each tethered to a player",
     strict=False)
step(P5, SD, "สิ่งที่ต้องดู", "What to look at",
     "① ทหารผีขึ้นที่ขอบ: หาตัวสีน้ำเงินก่อน ตัวสีแดงไม่ต้องสนใจ\n"
     "② ดูจุดที่ลูกธนูของตัวน้ำเงินตกเพื่อหาที่ปลอดภัย: มี 2 ที่\n"
     "ถือแนวที่ตัวน้ำเงินยืนเป็นทิศเหนือ แล้วไปที่ปลอดภัยเป็นคู่ (TH ตะวันออก/ตะวันตก / DPS ใต้)\n"
     "③ ดูว่า iai ลูกที่ 2 ของเงาที่ผูกกับเราเป็นซ้ายหรือขวา (ลูกแรกปลอดภัยด้านล่างเสมอ)\n"
     "④ ไปที่ปลอดภัยเป็น 2 คู่ หันเงาให้ที่ปลอดภัยของลูกที่ 2 ออกมาฝั่งกลางสนาม\n"
     "คือในที่ปลอดภัย 2 คนยืนหันหลังชนกัน\n"
     "⑤ iai ลูกแรก: ปลอดภัยด้านหลังของแต่ละคน\n"
     "ลูกที่ 2: ไปฝั่งกลางสนามของที่ปลอดภัย",
     "① The soldiers appear at the edge: find the blue one first; ignore the red ones\n"
     "② Read the safe spots from where the blue soldier's arrow lands: there are two\n"
     "Take the line the blue soldier stands on as north, and go to the safe spots in pairs (TH east/west / DPS south)\n"
     "③ Check whether your shadow's second iai is left or right (the first is always safe below)\n"
     "④ Two pairs to the safe spots; turn your shadow so the second's safe spot falls on the middle side\n"
     "i.e. the two in a safe spot stand back to back\n"
     "⑤ The first iai: safe behind each of you\n"
     "The second: move to the middle side of your safe spot",
     strict=False, ref="b3-soldiers",
     says=seats("คู่ TH: ที่ปลอดภัยฝั่งตะวันออก/ตะวันตก (ถือตัวน้ำเงินเป็นเหนือ)", "คู่ DPS: ที่ปลอดภัยฝั่งใต้ (ถือตัวน้ำเงินเป็นเหนือ)", "x", "x")[0],
     says_en=seats("x", "x", "TH pair: the east/west safe spot (blue soldier = north)", "DPS pair: the south safe spot (blue soldier = north)")[1])
step(P5, SD, "ลูกธนูตกได้แค่ 2 ที่", "The arrow lands in only two places",
     "ลูกธนูของตัวน้ำเงินตกได้แค่ 2 แบบ: ไกล หรือ ใกล้ บนแนวของตัวน้ำเงิน\n"
     "(ภาพ: ลูกศรขาว = ลูกธนูตัวน้ำเงิน / วงแดง = 2 จุดที่ตกได้)",
     "The blue soldier's arrow lands only two ways: far or near, on its own line\n"
     "(Picture: white arrow = the blue soldier's arrow / red rings = the two places it can land)",
     strict=False, pic="b3-23", scene=sc3.sd_landing)
step(P5, SD, "ซ้ายขวาของจุดตกโดน: ฝั่งใต้ปลอดภัยเสมอ", "Left and right of the landing are hit: south is always safe",
     "ซ้ายและขวาของจุดที่ลูกธนูตกจะโดน\n"
     "ถือแนวตัวน้ำเงินเป็นเหนือ: ฝั่งใต้ตรงข้าม (C) ปลอดภัยแน่นอน\n"
     "(ภาพ: วงฟ้า = ที่โดนเมื่อตกไกล / ใกล้ / A B C D = ทิศเมื่อถือตัวน้ำเงินเป็นเหนือ)",
     "Left and right of where the arrow lands are hit\n"
     "Taking the blue soldier's line as north: the south opposite (C) is always safe\n"
     "(Picture: blue rings = what is hit for a far / near landing / A B C D = directions with the blue soldier as north)",
     strict=False, pic="b3-24", scene=sc3.sd_read)
step(P5, SD, "① หาตัวน้ำเงิน", "① Find the blue soldier",
     "① Soldiers of Death: หาตัวน้ำเงิน\n"
     "ภาพนี้ขึ้นที่ขอบขวาฝั่งตะวันออกเฉียงเหนือ ดูแนวลูกธนูด้วย",
     "① Soldiers of Death: find the blue soldier\n"
     "Here it is on the right edge, north-east; check the arrow's path too",
     strict=False, pic="b3-25", scene=sc3.sd_soldiers)
step(P5, SD, "② เงา 4 ตัว ผูกสาย", "② Four shadows, tethers",
     "② เงาขึ้น 4 ตัว ผูกสายกับผู้เล่นทั้ง 4\n"
     "ดูเงาที่ผูกกับเรา แล้วไปที่ปลอดภัยเป็นคู่",
     "② Four shadows appear and tether all four players\n"
     "Check the shadow tied to you, and go to the safe spot as a pair",
     strict=False, pic="b3-26", scene=sc3.sd_twins)
SD_SAYS = seats("คู่ TH: ที่ปลอดภัยฝั่งตะวันออก (ในภาพนี้)", "คู่ DPS: ที่ปลอดภัยฝั่งใต้", "x", "x")[0]
SD_SAYS_EN = seats("x", "x", "TH pair: the east safe spot (in this picture)", "DPS pair: the south safe spot")[1]
step(P5, SD, "③ ดูลูกที่ 2: ซ้ายหรือขวา", "③ Check the second: left or right",
     "③ รอยเตือน iai 2 ครั้งของเงาขึ้น\n"
     "ดูให้ดีว่าลูกที่ 2 เป็นซ้ายหรือขวา",
     "③ The shadows' two-iai telegraphs appear\n"
     "Check carefully whether the second is left or right",
     strict=True, pic="b3-27", scene=sc3.sd_pairs, says=SD_SAYS, says_en=SD_SAYS_EN)
step(P5, SD, "④ หันหลังชนกัน", "④ Back to back",
     "④ กระจายให้ลูกที่ 2 ของเงาชี้เข้ากลางสนาม\n"
     "คู่เดียวกันยืนหันหลังชนกันในที่ปลอดภัย",
     "④ Spread so each shadow's second points to the middle\n"
     "Partners stand back to back in the safe spot",
     strict=True, pic="b3-28", scene=sc3.sd_turn, says=SD_SAYS, says_en=SD_SAYS_EN)
step(P5, SD, "⑤ iai ลูกแรก: ถอยไปด้านหลัง", "⑤ The first iai: step behind",
     "⑤ AoE ลง\n"
     "iai ลูกแรก: หลบไปด้านหลัง",
     "⑤ The AoEs go off\n"
     "The first iai: step behind",
     strict=True, pic="b3-29", scene=sc3.sd_iai1, says=SD_SAYS, says_en=SD_SAYS_EN)
step(P5, SD, "⑥ iai ลูกที่ 2: เข้าฝั่งกลางสนาม", "⑥ The second iai: to the middle side",
     "⑥ iai ลูกที่ 2: ขยับเข้าที่ปลอดภัยฝั่งกลางสนาม\n"
     "จบ Mechanic",
     "⑥ The second iai: move to the safe spot's middle side\n"
     "Mechanic over",
     strict=True, pic="b3-30", scene=sc3.sd_iai2, says=SD_SAYS, says_en=SD_SAYS_EN)

# ------------------------------------------------------------------ guide
NOTE = ("แผนตาม game8: game8 ไม่มีหน้าแยกของ Savage\n"
        "game8 บอกว่า Mechanic ของบอสใน Savage เหมือน Another Mount Rokkon แบบปกติ\n"
        "ต่างที่ลูกน้องตีแรงผิดปกติ และ wipe แล้วต้องเริ่มใหม่จากต้นดันเจี้ยน\n"
        "จึงใช้หน้าบอสของแบบปกติ\n\n"
        "ปาร์ตี้ 4 คน: MT / H1 / D1 (Melee) / D2 (Range)\n"
        "game8 เขียน T / H / D1 / D2 (บางภาพเขียน D ตัวเดียว = DPS ทั้งคู่ยืนด้วยกัน)\n\n"
        "pair stack ปกติ: คู่ TH (MT·H1) / คู่ DPS (D1·D2)\n"
        "ถ้า debuff ลงเอียง: MT·D1 / H1·D2\n\n"
        "Marker: game8 วาดเฉพาะบอส 2 (ดูขั้นแรก)\n\n"
        "ลำดับ: ลูกน้อง → Shishio → ลูกน้อง → Gorai the Uncaged → Moko the Restless\n"
        "game8 ไม่มีลูกน้องก่อนบอส 3\n\n"
        "บอส 2: ลูกเต๋าแบบ Spell / Malformed Reincarnation แบบ Posiume")
NOTE_EN = ("Plan follows game8: game8 has no page of its own for the Savage\n"
           "game8 says the bosses' Mechanics in Savage are the same as normal Another Mount Rokkon\n"
           "the difference is the trash hits abnormally hard, and a wipe sends you back to the start\n"
           "so this uses the normal version's boss pages\n\n"
           "Party of four: MT / H1 / D1 (Melee) / D2 (Range)\n"
           "game8 writes T / H / D1 / D2 (some pictures show a single D = both DPS together)\n\n"
           "Pair stacks, usually: TH pair (MT·H1) / DPS pair (D1·D2)\n"
           "If the debuffs are lopsided: MT·D1 / H1·D2\n\n"
           "Waymarks: game8 draws them only for boss 2 (see the first step)\n\n"
           "Order: trash → Shishio → trash → Gorai the Uncaged → Moko the Restless\n"
           "game8 has no trash before boss 3\n\n"
           "Boss 2: Spell's dice / Posiume's Malformed Reincarnation")

TRIS = {"map": {"map": "k5t1/00", "size": 200, "x": 11.9, "y": 13.3, "label": "Trisassant"},
        "say": "จุดแลก: Trisassant ที่ Old Sharlayan (X: 11.9 Y: 13.3)",
        "say_en": "Where to exchange: Trisassant in Old Sharlayan (X: 11.9 Y: 13.3)"}
rewards = [
    {"kind": "token", "name": "Shishu Coin", "icon_src": ICON("ui/icon/065000/065102_hr1.tex"),
     "say": "game8: ได้จาก Another Mount Rokkon\n"
            "แลกที่ Trisassant ทางตะวันออกเฉียงใต้ของ Old Sharlayan (X: 11.9 Y: 13.3)\n\n"
            "Shishioji Flute (mount): 100 เหรียญ\n"
            "Mount Rokkon Framer's Kit: 8 เหรียญ\n"
            "Crimson Rise Orchestrion Roll: 8 เหรียญ\n"
            "Materia IX สายต่อสู้: 2 เหรียญ\n"
            "Materia X สายต่อสู้: 4 เหรียญ",
     "say_en": "game8: earned in Another Mount Rokkon\n"
               "Exchange them with Trisassant in the south-east of Old Sharlayan (X: 11.9 Y: 13.3)\n\n"
               "Shishioji Flute (mount): 100 coins\n"
               "Mount Rokkon Framer's Kit: 8 coins\n"
               "Crimson Rise Orchestrion Roll: 8 coins\n"
               "Combat Materia IX: 2 coins\n"
               "Combat Materia X: 4 coins",
     "pics": [TRIS]},
    {"kind": "mount", "name": "Shishioji", "icon_src": ICON("ui/icon/004000/004260_hr1.tex"),
     "say": "ได้จากไอเทม Shishioji Flute: แลกด้วย Shishu Coin 100 เหรียญ\n"
            "game8: ดูเหมือนจะดรอปจากหีบใน Another และ Another (Savage) ได้ด้วย",
     "say_en": "From the Shishioji Flute: 100 Shishu Coins\n"
               "game8: it seems it can also drop from the chests in Another and Another (Savage)",
     "pics": [{"src": ICON("ui/icon/068000/068260_hr1.tex"), "say": "หน้าตา Shishioji (ภาพจาก Mount Guide ในเกม)",
               "say_en": "Shishioji, as the in-game Mount Guide shows it"}]},
    {"kind": "orchestrion", "name": "Crimson Rise Orchestrion Roll", "icon_src": ICON("ui/icon/025000/025945_hr1.tex"),
     "say": "แลกด้วย Shishu Coin 8 เหรียญ", "say_en": "8 Shishu Coins"},
    {"kind": "other", "name": "Mount Rokkon Framer's Kit", "icon_src": ICON("ui/icon/026000/026625_hr1.tex"),
     "say": "ชุดตกแต่ง portrait: แลกด้วย Shishu Coin 8 เหรียญ", "say_en": "A portrait framer's kit: 8 Shishu Coins"},
    {"kind": "other", "name": "Combat Materia IX / X", "icon_src": ICON("ui/icon/020000/020289_hr1.tex"),
     "say": "Materia สายต่อสู้ (Savage Aim, Savage Might, Heavens' Eye, Quickarm, Quicktongue, Battledance, Piety)\n"
            "IX: 2 เหรียญ / X: 4 เหรียญ",
     "say_en": "Combat materia (Savage Aim, Savage Might, Heavens' Eye, Quickarm, Quicktongue, Battledance, Piety)\n"
               "IX: 2 coins / X: 4 coins"},
    {"kind": "other", "name": "Title: Ascendant Ascetic", "icon_src": ICON("ui/icon/000000/000317_hr1.tex"),
     "say": "game8 บอกว่าเคลียร์แล้วได้ title ไว้อวด\n"
            "ในเกม: achievement Moving a Savage Mountain (เคลียร์ Another Mount Rokkon (Savage)) ให้ title Ascendant Ascetic",
     "say_en": "game8 says a clear earns a title to show off\n"
               "In the game: the achievement Moving a Savage Mountain (clear Another Mount Rokkon (Savage)) gives the title Ascendant Ascetic"},
]

guide = {
    "slug": "rokkon-savage", "short": "Rokkon (S)", "sort": 2,
    "name": "Another Mount Rokkon (Savage)",
    "category": "savage", "expansion": "Endwalker", "patch": "6.45",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/520812",
    "content_key": "cri:Another Mount Rokkon (Savage)",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 90, "ilvl": None, "party": 4, "minutes": 120,
            "unlock": "เคลียร์ Main Quest ของ Endwalker ถึงเควสต์ Endwalker แล้วคุยกับ Osmon ที่ Old Sharlayan (X: 11.9 Y: 13.3) หนึ่งครั้ง\n"
                      "รับเควสต์ Mononoke Aware จาก Shallow Moor ที่ Old Sharlayan (X: 12.0 Y: 13.3) เลเวล 90: ปลดล็อก Mount Rokkon (Variant)\n"
                      "เคลียร์ Mount Rokkon (Variant) แล้วคุยกับ Osmon (X: 11.9 Y: 13.3): ปลดล็อก Another Mount Rokkon\n"
                      "Savage คือระดับที่ 3 ของ Another (game8: ปกติ / Another / Another Savage) game8 ไม่ได้เขียนขั้นแยกของ Savage\n"
                      "ไอเทมเลเวล: เกมไม่กำหนดขั้นต่ำ ในดันเจี้ยนถูกปรับเป็น 665",
            "unlock_en": "Finish the Endwalker main scenario up to the quest Endwalker, then talk once to Osmon in Old Sharlayan (X: 11.9 Y: 13.3)\n"
                         "Take Mononoke Aware from Shallow Moor in Old Sharlayan (X: 12.0 Y: 13.3), level 90: unlocks Mount Rokkon (Variant)\n"
                         "Clear Mount Rokkon (Variant), then talk to Osmon (X: 11.9 Y: 13.3): unlocks Another Mount Rokkon\n"
                         "Savage is Another's third difficulty (game8: normal / Another / Another Savage); game8 writes no separate step for it\n"
                         "Item level: the game sets no minimum; inside it is synced to 665",
            "unlock_pics": [{"map": {"map": "k5t1/00", "size": 200, "x": 12.0, "y": 13.3, "label": "Shallow Moor · Osmon"},
                             "say": "Old Sharlayan (X: 12.0 Y: 13.3) — Shallow Moor / Osmon อยู่ข้างกัน (X: 11.9)",
                             "say_en": "Old Sharlayan (X: 12.0 Y: 13.3) — Shallow Moor, with Osmon beside (X: 11.9)"}]},
    "macro_en": "", "macro_ja": "",
}

defaults = {"frame": [1, 1], "bg": sc.BG, "arena": None, "waymarks": {}, "iconSize": 6.2, "markSize": 6, "bossSize": 12, "ring": 5.5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
