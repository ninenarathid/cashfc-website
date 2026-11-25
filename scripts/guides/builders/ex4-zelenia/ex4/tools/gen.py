"""Builds scripts/guides/data/ex4-zelenia.json (EX4 Zelenia, game8's plan: Nukemaru, Kurapon's 3rd Bloom, Ponikone's 6th Bloom)."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex4"
sys.path.insert(0, HERE + "/tools")
import scenes
from scenes import G8
from cheat import cheatsheet

OUT = r"scripts/guides/data/ex4-zelenia.json"
macros = json.load(open(HERE + "/macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"

IMG = {
    "shock1": (11195275, "ff30f7c196293b5be0585bec7751a786.png"), "shock2": (11195276, "1b9e03a070150f4ea96b683fa9083b74.png"),
    "ef1": (11194523, "9115e62ea8fa3e16b9367d9070294b8f.png"), "ef2": (11194521, "68f61efa09fe5f906b47751af432fe22.png"),
    "ef3": (11194524, "f545d1d231cb2ea2046973beb39e8648.png"), "ef4": (11194522, "5a1aa69a5867c6bce0361cb8f0dc1603.png"),
    "bb1": (11194595, "98f20e304aa104b6f85416cf88dcc084.png"), "bb2": (11194596, "1f788eee544a02c49e4d185490e7ed51.png"),
    "bb3": (11194655, "5fca94dc95abb088b0fc4e3580fac26e.png"),
    "rb_cw": (11198010, "e6d724540be4321d4d02410fa2450d8f.png"), "rb_ccw": (11198009, "a3cfe83a6eb15780a2e0280a26e47020.png"),
    "b2c1": (11198057, "d25791922f303fb85b24b85ae4b6e5e0.png"), "b2c2": (11198058, "681415f6739fcdca109a6850318eec5b.png"),
    "b2c3": (11198059, "33d57f2b6d03131d95a4b7510d3a49f7.png"), "b2d1": (11198032, "460bd3ec6af4e9da3a028f6a46c330d9.png"),
    "b2d2": (11198062, "690d87d51175f02fafd74c2f591ce48a.png"), "b2d3": (11198035, "af3a7291724f7eb8f6800e135f8d8b24.png"),
    "b3_dps_marks": (11194716, "1a16031149b3574daf11d370edadf308.png"), "b3_dps_towers": (11194765, "4c24c311f5fa576d1d930ce487b7b0ad.png"),
    "b3_th_marks": (11194717, "2252ad88f60ac4394e35060931731947.png"), "b3_th_towers": (11194766, "c3dffc6269719aaafcd8e9106d827893.png"),
    "e2a": (11194837, "ac8eab628cfe8ae9c5fd275cf708e80c.png"), "e2b": (11194834, "b7284057482f4243c3e6ed54275630ef.png"),
    "e2c": (11194835, "336cc5545bc678158b5bf26b6d7a88d6.png"), "e2d": (11194836, "f38a298f83d145c06eddc54dc3e98765.png"),
    "e2e": (11194838, "20894dffbc2759ff2e57fa23e3dd930f.png"),
    "b4a": (11197848, "482f1ebc477197baa10cda2d3cacd400.png"), "b4b": (11197851, "9928a7310338557e8470eee63f3a6262.png"),
    "b4c": (11195447, "b7454d6c5b18fd9c4b27104484a325e7.png"), "b4d": (11195448, "24f50b0bc5c9159feb0e7c52697b8741.png"),
    "e3a": (11195103, "d1929b5e13a9695fc8ebb8fc7b51012b.png"), "e3b": (11195099, "80de6a08b7932e930e76f72fb72c0992.png"),
    "e3c": (11195097, "d32890e937bf1eb35a6f69f11788f87e.png"), "e3d": (11195100, "bdc33b3a47ff4076e46b28a428234a5d.png"),
    "e3e": (11195098, "8cbe63cfb886ff31df0b85ed9cf57518.png"), "e3f": (11195102, "e834738ac6c27a0b69944296319d3dc5.png"),
    "e3g": (11195101, "88c8d17cf2e4c2acf8438c4492adc36b.png"),
    "b5a": (11198205, "b6188cd66d40a6551a2788c956030206.png"), "b5b": (11198208, "948d76d5916487099d067f336eb52efc.png"),
    "b5c": (11198211, "505dd167475fd0e5b42a3762b3944ed9.png"), "b5d": (11198220, "519b2eacb4d330c04d6338dda1f5a1ed.png"),
    "b6a": (11195247, "53144955e842d3a80a50faa2438fa639.png"), "b6b": (11195246, "d37e8ebd3b8fb987e84655f3ae9a45f1.png"),
    "b6c": (11195245, "b535b817a6dacca3557d8aeb0d9aea37.png"), "b6d": (11195244, "6a59775189aa390e694305e957040b98.png"),
}

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, says=None, says_en=None, refs=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        n, h = IMG[pic]
        s["game8"] = [G8(n, h)]
    if refs:
        s["refs"] = [{"src": r[0], "say": r[1]} for r in refs]
    if pic:
        s["ring"] = 6.2
        s["scene"] = getattr(scenes, pic)()
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


def seats(groups):
    out = {}
    for text, ss in groups.items():
        for k in ss:
            out[k] = text
    return out


TH, DPS = ("MT", "ST", "H1", "H2"), ("D1", "D2", "D3", "D4")
P0 = ("เตรียมตัว", "Setup")
P1 = ("ช่วงแรก", "First part")
P2 = ("ช่วง Add: Blessed Barricade", "Adds: Blessed Barricade")
P3 = ("ช่วงกลาง: Roseblood", "Middle: Roseblood")
P4 = ("ช่วงท้าย", "Last part")
G8REF = "ภาพจาก game8"

# ======================================================================= setup
step(P0, "Waymarks", "Marker 8 ทิศ (ใช้ดูทิศ)", "8-direction waymarks (for orientation)",
     "game8 ไม่มีหัวข้อ Marker ชุดนี้มาจาก xivjpraids.com และใช้ดูทิศเท่านั้น\n\n"
     "ตัวอักษร:\n"
     "A เหนือ\n"
     "B ตะวันออก\n"
     "C ใต้\n"
     "D ตะวันตก\n\n"
     "ตัวเลข:\n"
     "1 ตะวันออกเฉียงเหนือ\n"
     "2 ตะวันออกเฉียงใต้\n"
     "3 ตะวันตกเฉียงใต้\n"
     "4 ตะวันตกเฉียงเหนือ\n\n"
     "ทุกตัววางบนวงห่างกลางสนาม 10 หลา (ราวครึ่งทางไปขอบ)\n"
     "ภาพของ game8 วาด A B C D ไว้ที่ขอบสนาม แค่บอกทิศ",
     "game8 has no waymark section; this set is from xivjpraids.com and is only for orientation\n\n"
     "Letters:\n"
     "A north\n"
     "B east\n"
     "C south\n"
     "D west\n\n"
     "Numbers:\n"
     "1 north-east\n"
     "2 south-east\n"
     "3 south-west\n"
     "4 north-west\n\n"
     "All on a ring 10 yalms from the centre (about halfway to the edge)\n"
     "game8's pictures draw A B C D on the rim, only to show the directions",
     refs=[("https://xivjpraids.com/images/7.0_dawntrail/zelenia/markers.jpg",
            "Marker ในเกม มองจากทางใต้ (ภาพจาก xivjpraids.com)",
            "The waymarks in game, seen from the south (picture from xivjpraids.com)")])

# ======================================================================= first part
step(P1, "Thorned Catharsis", "raid-wide", "Raid-wide",
     "AoE เวททั้งปาร์ตี้ (raid-wide)\n"
     "ใช้ mitigate กันเวท เช่น Addle, Dark Missionary\n\n"
     "ตาม timeline ของ game8 ท่านี้มา 5 ครั้งตลอดไฟต์ เตรียม mitigate ไว้ทุกครั้ง",
     "A magic raid-wide\n"
     "Mitigate it with magic mitigation such as Addle and Dark Missionary\n\n"
     "By game8's timeline it comes 5 times in the fight; have mitigation ready each time",
     says=seats({"ใช้ Addle": ("D3", "D4"), "Tank: mitigate ทั้งปาร์ตี้ เช่น Dark Missionary": ("MT", "ST")}),
     says_en=seats({"Addle": ("D3", "D4"), "Use tank party mitigation such as Dark Missionary": ("MT", "ST")}))

SHK = "Shock + Alexandrian Holy"
step(P1, SHK, "แบบที่ 1: Tank/Healer รับ tower", "Pattern 1: tanks and healers take the towers",
     "Shock: AoE ที่ระเบิดต่อเนื่องหลังตกลงพื้น มาที่ Tank/Healer 4 คน กับ DPS 4 คน\n"
     "กลุ่มหนึ่งได้ donut อีกกลุ่มได้ AoE วงกลม\n\n"
     "คนที่ได้ AoE วงกลม: พอระเบิดแล้วเดินออกจากวง\n"
     "คนที่ได้ donut: พอระเบิดแล้วอยู่ที่เดิม และเข้า tower (Alexandrian Holy) ไปด้วย\n\n"
     "คู่ใช้จุดเดียวกัน: MT·D3 ตะวันตกเฉียงเหนือ / ST·D4 ตะวันออกเฉียงเหนือ / H1·D1 ตะวันตกเฉียงใต้ / H2·D2 ตะวันออกเฉียงใต้\n\n"
     "ภาพนี้: Tank/Healer ได้ donut ยืนใน tower\n"
     "DPS ได้ AoE วงกลม: D3 D4 ชิดขอบเหนือ / D1 D2 ใต้กลางสนาม\n"
     "Range เปิดแนวกลางสนามให้กว้าง Melee จะตีบอสได้สบาย",
     "Shock: AoEs that go off again and again after they land, on the 4 tanks/healers and the 4 DPS\n"
     "One group gets donuts, the other circle AoEs\n\n"
     "Circle AoE: once it goes off, walk out of it\n"
     "Donut: once it goes off, stay put, and take a tower (Alexandrian Holy) as well\n\n"
     "Pairs share a spot: MT·D3 north-west / ST·D4 north-east / H1·D1 south-west / H2·D2 south-east\n\n"
     "In this picture the tanks/healers have the donuts and stand in the towers\n"
     "DPS have circles: D3 D4 at the north edge / D1 D2 south of the middle\n"
     "Ranges keep the middle line wide so the Melees can hit the boss comfortably",
     True, "shock1",
     says={"MT": "donut: tower ตะวันตกเฉียงเหนือ", "ST": "donut: tower ตะวันออกเฉียงเหนือ",
           "H1": "donut: tower ตะวันตกเฉียงใต้", "H2": "donut: tower ตะวันออกเฉียงใต้",
           "D3": "AoE วงกลม: ชิดขอบเหนือ ฝั่งตะวันตก", "D4": "AoE วงกลม: ชิดขอบเหนือ ฝั่งตะวันออก",
           "D1": "AoE วงกลม: ใต้กลางสนามเล็กน้อย", "D2": "AoE วงกลม: ใต้ D1 ลงไป"},
     says_en={"MT": "Donut: the north-west tower", "ST": "Donut: the north-east tower",
              "H1": "Donut: the south-west tower", "H2": "Donut: the south-east tower",
              "D3": "Circle: at the north edge, west side", "D4": "Circle: at the north edge, east side",
              "D1": "Circle: just south of the middle", "D2": "Circle: further south, below D1"})

step(P1, SHK, "แบบที่ 2: DPS รับ tower", "Pattern 2: the DPS take the towers",
     "DPS ได้ donut ยืนใน tower ตามคู่: D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / D1 ตะวันตกเฉียงใต้ / D2 ตะวันออกเฉียงใต้\n"
     "Tank/Healer ได้ AoE วงกลม: MT ST ด้านเหนือใกล้กลางสนาม / H1 H2 ชิดขอบใต้",
     "The DPS have the donuts and stand in the towers by pair: D3 north-west / D4 north-east / D1 south-west / D2 south-east\n"
     "Tanks/healers have circles: MT ST north, near the middle / H1 H2 at the south edge",
     True, "shock2",
     says={"D3": "donut: tower ตะวันตกเฉียงเหนือ", "D4": "donut: tower ตะวันออกเฉียงเหนือ",
           "D1": "donut: tower ตะวันตกเฉียงใต้", "D2": "donut: tower ตะวันออกเฉียงใต้",
           "MT": "AoE วงกลม: เหนือกลางสนาม ฝั่งตะวันตก", "ST": "AoE วงกลม: เหนือกลางสนาม ข้าง MT",
           "H1": "AoE วงกลม: ชิดขอบใต้ ฝั่งตะวันตก", "H2": "AoE วงกลม: ชิดขอบใต้ ฝั่งตะวันออก"},
     says_en={"D3": "Donut: the north-west tower", "D4": "Donut: the north-east tower",
              "D1": "Donut: the south-west tower", "D2": "Donut: the south-east tower",
              "MT": "Circle: north of the middle, west side", "ST": "Circle: north of the middle, beside MT",
              "H1": "Circle: at the south edge, west side", "H2": "Circle: at the south edge, east side"})

step(P1, "Specter of the Lost", "tankbuster ทางสาย", "Tankbuster on tethers",
     "บอสโยงสาย (tether) แล้วฟัน cone แรงๆ ใส่คนที่ถือสาย\n"
     "Tank ใช้ mitigate แล้วรับสายมาไว้ที่ตัวเอง\n\n"
     "ตาม timeline ของ game8 มา 4 ครั้ง",
     "The boss tethers players and hits whoever holds a tether with a strong cone\n"
     "Tanks pop mitigation and take the tethers onto themselves\n\n"
     "By game8's timeline it comes 4 times",
     says=seats({"ใช้ mitigate แล้วรับสาย": ("MT", "ST")}),
     says_en=seats({"Mitigate, then take a tether": ("MT", "ST")}))

EF = "Escelons' Fall"
TELLS = [("https://img.game8.jp/11193883/a6d8a23d79e5914a1303ac4aabcb326e.png/show",
          "ข้าวหลามตัดสีชมพู 3 อันซ้อน = 4 คนที่ใกล้บอสที่สุดโดน (ภาพจาก game8)",
          "Pink diamonds, three overlapping = the 4 nearest are hit (picture from game8)"),
         ("https://img.game8.jp/11193882/a1b97daf2315aec6e6ac4be597816cf4.png/show",
          "ข้าวหลามตัดสีม่วงเข้ม มีเส้นต่อ = 4 คนที่ไกลบอสที่สุดโดน (ภาพจาก game8)",
          "Dark purple diamond on a line = the 4 farthest are hit (picture from game8)")]
EF_SAYS = {"MT": "ตรงหน้าบอส ฝั่งตะวันตก", "ST": "ตรงหน้าบอส ฝั่งตะวันออก", "H1": "ข้างบอส ตะวันตก", "H2": "ข้างบอส ตะวันออก",
           "D3": "หลังบอส ตะวันตก", "D4": "หลังบอส ตะวันออก", "D1": "หลังบอส ตะวันตกด้านใน", "D2": "หลังบอส ตะวันออกด้านใน"}
EF_SAYS_EN = {"MT": "In front of the boss, west", "ST": "In front of the boss, east", "H1": "Beside the boss, west", "H2": "Beside the boss, east",
              "D3": "Behind the boss, west", "D4": "Behind the boss, east", "D1": "Behind the boss, inner west", "D2": "Behind the boss, inner east"}

step(P1, EF, "ภาพรวม: ดูข้าวหลามตัดของบอส", "Overview: read the boss's diamonds",
     "บอสฟัน cone 4 ครั้ง ใส่ 4 คนที่ใกล้ที่สุด หรือ 4 คนที่ไกลที่สุด\n"
     "สลับกันรับ อย่าให้ใครโดน 2 ครั้งติด\n\n"
     "ดูจากข้าวหลามตัดที่ออกจากบอส:\n"
     "สีชมพู = 4 คนที่ใกล้ที่สุด\n"
     "สีม่วง = 4 คนที่ไกลที่สุด\n\n"
     "เริ่ม: Tank/Healer ยืนในวงเป้าของบอส / DPS ยืนนอกวง\n"
     "จุดยืน: MT ST หน้าบอส / H1 H2 ข้างบอส / D3 D4 หลังบอสด้านข้าง / D1 D2 หลังบอส\n\n"
     "game8 แยกเป็น 2 กรณี: สัญญาณครั้งที่ 1 กับ 2 ต่างกัน หรือเหมือนกัน (ดูขั้นถัดไป)",
     "The boss cleaves 4 times, each time the 4 nearest or the 4 farthest\n"
     "Take them in turns; nobody takes two in a row\n\n"
     "Read the diamonds that come out of the boss:\n"
     "pink = the 4 nearest\n"
     "purple = the 4 farthest\n\n"
     "Start: tanks/healers inside the boss's target circle / DPS outside\n"
     "Spots: MT ST in front of the boss / H1 H2 beside it / D3 D4 behind, to the sides / D1 D2 behind\n\n"
     "game8 splits it into 2 cases: the 1st and 2nd tells differ, or they are the same (next steps)",
     refs=TELLS)

step(P1, EF, "กรณีสัญญาณ 1–2 ต่างกัน ①: Tank/Healer รับ", "Tells 1 and 2 differ ①: tanks/healers take it",
     "① Tank/Healer ยืนในวงเป้าของบอส / DPS ยืนนอกวง\n"
     "ภาพนี้สีชมพู (ใกล้): Tank/Healer ที่อยู่ใกล้รับ cone",
     "① Tanks/healers inside the target circle / DPS outside\n"
     "Pink here (nearest): the tanks/healers, who are close, take the cones",
     True, "ef1", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "② อยู่ที่เดิม DPS รับ", "② Stay put; the DPS take it",
     "② ไม่ต้องสลับที่ ยืนที่เดิม\n"
     "ภาพนี้สีม่วง (ไกล): DPS ที่อยู่นอกวงรับ cone",
     "② No swap; stay where you are\n"
     "Purple here (farthest): the DPS, outside the circle, take the cones",
     True, "ef2", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "③ สลับที่ Tank/Healer รับ", "③ Swap; tanks/healers take it",
     "③ จังหวะสลับ: Tank/Healer ออกไปนอกวง / DPS เข้ามาในวง\n"
     "ภาพนี้สีม่วง (ไกล): Tank/Healer ที่อยู่ไกลรับ cone",
     "③ The swap: tanks/healers go out / DPS come in\n"
     "Purple here (farthest): the tanks/healers, now far, take the cones",
     True, "ef3", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "④ อยู่ที่เดิม DPS รับ", "④ Stay put; the DPS take it",
     "④ ไม่ต้องสลับที่ ยืนที่เดิม\n"
     "ภาพนี้สีชมพู (ใกล้): DPS ที่อยู่ในวงรับ cone",
     "④ No swap; stay where you are\n"
     "Pink here (nearest): the DPS, inside the circle, take the cones",
     True, "ef4", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "กรณีสัญญาณ 1–2 เหมือนกัน ①: Tank/Healer รับ", "Tells 1 and 2 the same ①: tanks/healers take it",
     "① เริ่มเหมือนเดิม: Tank/Healer ในวงเป้า / DPS นอกวง\n"
     "สีชมพู (ใกล้): Tank/Healer รับ cone",
     "① Same start: tanks/healers inside the target circle / DPS outside\n"
     "Pink (nearest): the tanks/healers take the cones",
     True, "ef1", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "② สลับที่ DPS รับ", "② Swap; the DPS take it",
     "② จังหวะสลับ: DPS เข้ามาในวง / Tank/Healer ออกไปนอกวง\n"
     "สีชมพูอีกครั้ง (ใกล้): DPS ที่อยู่ในวงรับ cone",
     "② The swap: DPS come in / tanks/healers go out\n"
     "Pink again (nearest): the DPS, now inside, take the cones",
     True, "ef4", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "③ อยู่ที่เดิม Tank/Healer รับ", "③ Stay put; tanks/healers take it",
     "③ ไม่ต้องสลับที่\n"
     "สีม่วง (ไกล): Tank/Healer ที่อยู่นอกวงรับ cone",
     "③ No swap\n"
     "Purple (farthest): the tanks/healers, outside, take the cones",
     True, "ef3", EF_SAYS, EF_SAYS_EN)
step(P1, EF, "④ สลับที่ DPS รับ", "④ Swap; the DPS take it",
     "④ จังหวะสลับ: Tank/Healer กลับเข้าวง / DPS ออกไปนอกวง\n"
     "สีม่วงอีกครั้ง (ไกล): DPS ที่อยู่นอกวงรับ cone",
     "④ The swap: tanks/healers back in / DPS out\n"
     "Purple again (farthest): the DPS, outside, take the cones",
     True, "ef2", EF_SAYS, EF_SAYS_EN)

step(P1, "Stock Break", "stack หลายครั้งติดกัน", "A stack that hits several times",
     "stack ดาเมจเวทที่ตกลงมาติดกันหลายครั้ง\n"
     "ทุกคนรวมกันรับจนจบ\n"
     "ใช้ mitigate และ heal ไประหว่างนั้น",
     "A magic stack that lands several times in a row\n"
     "Everyone stays together until the last hit\n"
     "Mitigate and heal through it")

# ======================================================================= adds
BB = "Blessed Barricade"
BB_SAYS = seats({"ฝั่งตะวันตก: เข้า tower หรือถือสายร่างแยกตะวันตก": TH, "ฝั่งตะวันออก: เข้า tower หรือถือสายร่างแยกตะวันออก": DPS})
BB_SAYS_EN = seats({"West side: a tower, or the west phantom's tether": TH, "East side: a tower, or the east phantom's tether": DPS})
step(P2, BB, "① tower 3 คน + ล่อฟันครึ่งสนาม", "① Towers of 3 + baiting the half-room cleaves",
     "ช่วง Add ที่ต้องทำกลไกไปด้วย\n"
     "ร่างแยกของบอส 2 ตัวที่ขอบตะวันตกและตะวันออก โยงสายไปที่คนละ 1 คน แล้วฟันครึ่งสนาม\n\n"
     "Rule 1: ร่างแยกตะวันออกโยงสายไปที่ DPS / ร่างแยกตะวันตกโยงสายไปที่ Tank/Healer\n"
     "Rule 2: แต่ละกลุ่มเข้า tower ฝั่งร่างแยกของตัวเอง: Tank/Healer ฝั่งตะวันตก / DPS ฝั่งตะวันออก\n"
     "Rule 3: tower โผล่ที่เดิมทุกรอบ ฝั่ง Tank/Healer เริ่มจากใต้แล้วสลับ / ฝั่ง DPS เริ่มจากเหนือแล้วสลับ\n\n"
     "① คนที่ไม่ได้สาย 3 คนต่อกลุ่มเข้า tower\n"
     "คนที่ได้สายล่อฟันครึ่งสนาม: หันดาบของร่างแยกออกไปทางนอกสนาม",
     "An adds phase with mechanics on top\n"
     "Two of the boss's phantoms at the west and east edges tether one player each, then cleave half the room\n\n"
     "Rule 1: the east phantom tethers a DPS / the west phantom tethers a tank or healer\n"
     "Rule 2: each group takes the towers on its phantom's side: tanks/healers west / DPS east\n"
     "Rule 3: the towers come at fixed spots; tank/healer side starts south then alternates / DPS side starts north then alternates\n\n"
     "① The 3 untethered players of each group take the tower\n"
     "The tethered player baits the half-room cleave: turn the phantom's sword to point outside the arena",
     False, "bb1", BB_SAYS, BB_SAYS_EN)
step(P2, BB, "② ตีลูกแก้วไปด้วย", "② Hit the orbs as well",
     "② ทำเหมือนข้อ ① แต่ตีลูกแก้วกุหลาบ (Add) ไประหว่างนั้น\n"
     "tower ย้ายไปอีกฝั่ง: Tank/Healer ตะวันตกเฉียงเหนือ / DPS ตะวันออกเฉียงใต้",
     "② As ①, while hitting the rose orbs (the adds)\n"
     "The towers move: tanks/healers north-west / DPS south-east",
     False, "bb2", BB_SAYS, BB_SAYS_EN)
step(P2, BB, "③ tower ย้ายอีกครั้ง", "③ The towers move again",
     "③ tower ย้ายที่อีกครั้ง (กลับไปที่เดียวกับข้อ ①) แต่ละคนทำที่จุดของตัวเอง\n"
     "Tank/Healer ตะวันตกเฉียงใต้ / DPS ตะวันออกเฉียงเหนือ",
     "③ The towers move again (back to the spots of ①); everyone handles their own spot\n"
     "Tanks/healers south-west / DPS north-east",
     False, "bb1", BB_SAYS, BB_SAYS_EN)
step(P2, BB, "④ ไม่มี tower: ล่อฟันอย่างเดียว", "④ No towers: only the cleaves",
     "④ รอบที่ 4 ไม่มี tower ล่อฟันครึ่งสนามอย่างเดียว\n"
     "ที่เหลือตีลูกแก้วกุหลาบที่ยังมี HP",
     "④ The 4th time has no towers: only bait the half-room cleaves\n"
     "Everyone else hits whichever orbs still have HP",
     False, "bb3")

step(P2, "Perfumed Quietus", "ท่าใหญ่หลังช่วง Add", "The big hit after the adds",
     "ท่าใหญ่ของ Zelenia หลังช่วง Add\n"
     "ถ้าเกจ Aether ของ Zelenia จากช่วง Blessed Barricade อยู่ที่ 100 = wipe\n"
     "แม้ต่ำกว่า 100 ก็ยังเป็น raid-wide ที่แรงมาก ใช้ mitigate ให้เต็มที่",
     "Zelenia's big attack after the adds\n"
     "If her Aether gauge from Blessed Barricade is at 100, it wipes the party\n"
     "Even below 100 it is a very heavy raid-wide; mitigate fully")

# ======================================================================= Roseblood
RB = "Roseblood Bloom"
step(P3, RB, "หมุนตามเข็ม: รอเยื้องตามเข็มจาก B", "Clockwise: wait just clockwise of B",
     "ช่องแดงบนพื้นคือวงเวท ถ้า cone ของบอสโดนวงเวท วงเวทจะทำงานและทำดาเมจ\n"
     "จึงหลบ cone ที่หมุนรอบบอส ในที่ที่ไม่มีวงเวทและกว้าง\n"
     "(ตาม timeline ของ game8: Roseblood Bloom แล้ว Alexandrian Thunder II)\n\n"
     "มีแค่ 2 แบบ\n"
     "แบบนี้: cone หมุนตามเข็มนาฬิกา รอที่ด้านตามเข็มของ B (เยื้องลงใต้จาก B)\n\n"
     "ทิศหมุนกำหนดจากลายวงเวทบนพื้น ดูพื้นอย่างเดียวก็รู้",
     "The red tiles are magic circles; if a boss cone touches one it activates and deals damage\n"
     "So dodge the cones turning around the boss in a wide space without circles\n"
     "(by game8's timeline: Roseblood Bloom, then Alexandrian Thunder II)\n\n"
     "There are only 2 patterns\n"
     "This one: the cones turn clockwise; wait on the clockwise side of B (just south of B)\n\n"
     "The turn is set by the floor's pattern, so the floor alone tells you",
     False, "rb_cw")
step(P3, RB, "หมุนทวนเข็ม: รอเยื้องทวนเข็มจาก A", "Counter-clockwise: wait just counter-clockwise of A",
     "แบบที่ 2: cone หมุนทวนเข็มนาฬิกา\n"
     "รอที่ด้านทวนเข็มของ A (เยื้องไปทางตะวันตกจาก A)",
     "Pattern 2: the cones turn counter-clockwise\n"
     "Wait on the counter-clockwise side of A (just west of A)",
     False, "rb_ccw")
step(P3, RB, "Alexandrian Thunder III: spread บนช่องที่ไม่มีวงเวท", "Alexandrian Thunder III: spread on tiles without circles",
     "บอสร่าย Alexandrian Thunder III: ทุกคนได้ AoE วงกลม\n"
     "spread ออกไปยืนบนช่องที่ไม่มีวงเวท (ไม่ใช่ช่องแดง)",
     "The boss casts Alexandrian Thunder III: everyone gets a circle AoE\n"
     "Spread out onto tiles without magic circles (not the red ones)")

B2 = "Roseblood: 2nd Bloom"
step(P3, B2, "ภาพรวม: หลบบนช่องที่ไม่มีวงเวท", "Overview: dodge on tiles without circles",
     "หลบท่าของบอสบนช่องที่ไม่มีวงเวท\n"
     "บอสใช้ cone, AoE วงกลม และ donut\n"
     "AoE วงกลมกับ donut ทำให้วงเวทบนพื้นทำงาน ต้องหลบบนช่องที่ไม่มีวงเวทเสมอ\n"
     "(ตาม timeline ของ game8 มี Thunder Slash ตามมา)\n\n"
     "ขั้นต่อไปเป็นตัวอย่างวิธีหลบ 2 แบบของ game8: เริ่มด้วยวงกลม / เริ่มด้วย donut",
     "Dodge the boss's attacks on tiles without magic circles\n"
     "The boss uses cones, a circle AoE and a donut\n"
     "The circle and the donut set the floor's circles off, so always dodge on tiles without circles\n"
     "(by game8's timeline, Thunder Slash follows)\n\n"
     "The next steps are game8's two example ways to dodge: circle first / donut first")
step(P3, B2, "เริ่มด้วยวงกลม ①: ช่องว่างวงนอกที่มีช่องเดียว", "Circle first ①: the outer gap that is one tile",
     "① AoE วงกลมกินวงใน\n"
     "ไปยืนวงนอกตรงช่องที่ปลอดภัยมีแค่ช่องเดียว",
     "① The circle covers the inner ring\n"
     "Stand in the outer ring on the safe gap that is a single tile",
     False, "b2c1")
step(P3, B2, "② วงกลมจบ: เข้าช่องเฉียงซ้ายหน้า", "② Circle done: the tile diagonally front-left",
     "② พอวงกลมระเบิดแล้ว ขยับเข้าไปช่องเฉียงซ้ายด้านหน้า (หันหน้าเข้าหาบอส) ตามลูกศร\n"
     "ตอนนี้ donut กินวงนอก และ cone จากบอสกำลังจะมา",
     "② Once the circle goes off, step into the tile diagonally front-left (facing the boss), as the arrow shows\n"
     "Now the donut covers the outer ring, and the boss's cones are coming",
     False, "b2c2")
step(P3, B2, "③ หลบ cone: ขยับไปช่องขวา", "③ Dodge the cones: move to the tile on the right",
     "③ ขยับไปช่องทางขวาเพื่อหลบ cone ตามลูกศร\n"
     "จบกลไก",
     "③ Move to the tile on the right to dodge the cones, as the arrow shows\n"
     "That is the end of it",
     False, "b2c3")
step(P3, B2, "เริ่มด้วย donut ①: ช่องว่างวงในที่มีช่องเดียว", "Donut first ①: the inner gap that is one tile",
     "① donut กินวงนอก\n"
     "ไปยืนวงในตรงช่องที่ปลอดภัยมีแค่ช่องเดียว",
     "① The donut covers the outer ring\n"
     "Stand in the inner ring on the safe gap that is a single tile",
     False, "b2d1")
step(P3, B2, "② donut จบ: ออกไปวงนอก", "② Donut done: go out",
     "② พอ donut ระเบิดแล้ว ออกไปวงนอกตามลูกศร\n"
     "ตอนนี้ AoE วงกลมกินวงใน และ cone กำลังจะมา",
     "② Once the donut goes off, go out to the outer ring, as the arrow shows\n"
     "Now the circle covers the inner ring, and the cones are coming",
     False, "b2d2")
step(P3, B2, "③ หลบ cone: จากช่องซ้ายไปช่องขวา", "③ Dodge the cones: from the left tile to the right",
     "③ ขยับจากช่องซ้ายไปช่องขวาเพื่อหลบ cone ตามลูกศร\n"
     "จบกลไก",
     "③ Move from the left tile to the right one to dodge the cones, as the arrow shows\n"
     "That is the end of it",
     False, "b2d3")

B3 = "Roseblood: 3rd Bloom"
B3_NOTE = ("แผนของ Kurapon\n"
           "ใครได้มาร์กกุหลาบ ไปทิ้งที่จุดของตัวเอง ใครไม่ได้ เข้า tower\n"
           "มาร์กมาที่กลุ่ม Tank/Healer หรือกลุ่ม DPS ทั้งกลุ่ม\n\n"
           "ให้ช่องแดงคู่ในวงใน (ตรงที่ D3 ยืนในภาพ) เป็นทิศเหนือ\n"
           "คู่ใช้ทิศเดียวกัน: MT·D3 เหนือ / H1·D1 ตะวันตก / ST·D2 ใต้ / H2·D4 ตะวันออก\n"
           "ทิ้งมาร์ก: เหนือ / ตะวันตกเฉียงใต้ / ใต้ / ตะวันออกเฉียงใต้ ของวงใน\n"
           "tower: ช่องแดงวงนอก เหนือ / ตะวันตก / ใต้ / ตะวันออก\n\n"
           "คนทิ้งมาร์ก ถ้ายืนอยู่ที่เดิมจะนับว่าเข้า tower ด้วย ทิ้งแล้วต้องออกไปยืนบนช่องที่ไม่มีวงเวททุกครั้ง")
B3_NOTE_EN = ("Kurapon's strat\n"
              "Whoever has a rose marker drops it at their spot; whoever doesn't takes a tower\n"
              "The markers go to the whole tank/healer group or the whole DPS group\n\n"
              "Treat the two red tiles together in the inner ring (where D3 stands in the picture) as north\n"
              "Pairs share a direction: MT·D3 north / H1·D1 west / ST·D2 south / H2·D4 east\n"
              "Drops: the inner ring's north / south-west / south / south-east\n"
              "Towers: the outer red tiles north / west / south / east\n\n"
              "A marker player who stays where they dropped counts as taking the tower too, so always step off onto a tile without circles after dropping")
step(P3, B3, "Tank/Healer เข้า tower ①: DPS ทิ้งมาร์ก", "Tanks/healers take towers ①: the DPS drop markers",
     B3_NOTE + "\n\n① DPS ทิ้งมาร์กกุหลาบที่จุดของตัวเอง",
     B3_NOTE_EN + "\n\n① The DPS drop their rose markers at their spots",
     True, "b3_dps_marks",
     {"D3": "ทิ้งมาร์ก: วงในทิศเหนือ", "D1": "ทิ้งมาร์ก: วงในตะวันตกเฉียงใต้", "D2": "ทิ้งมาร์ก: วงในทิศใต้", "D4": "ทิ้งมาร์ก: วงในตะวันออกเฉียงใต้",
      "MT": "tower เหนือ", "H1": "tower ตะวันตก", "ST": "tower ใต้", "H2": "tower ตะวันออก"},
     {"D3": "Drop: inner ring, north", "D1": "Drop: inner ring, south-west", "D2": "Drop: inner ring, south", "D4": "Drop: inner ring, south-east",
      "MT": "North tower", "H1": "West tower", "ST": "South tower", "H2": "East tower"})
step(P3, B3, "② DPS ออกจากวงเวท Tank/Healer เข้า tower", "② DPS leave the circles; tanks/healers take the towers",
     "② DPS ออกจากช่องวงเวท ไปยืนช่องมืดวงใน: D1 D2 ตะวันตก / D3 D4 ตะวันออก\n"
     "Tank/Healer เข้า tower",
     "② The DPS step off the circles onto the dark inner tiles: D1 D2 west / D3 D4 east\n"
     "Tanks/healers take the towers",
     True, "b3_dps_towers",
     {"D1": "ช่องมืดวงในตะวันตก", "D2": "ช่องมืดวงในตะวันตก", "D3": "ช่องมืดวงในตะวันออก", "D4": "ช่องมืดวงในตะวันออก",
      "MT": "tower เหนือ", "H1": "tower ตะวันตก", "ST": "tower ใต้", "H2": "tower ตะวันออก"},
     {"D1": "Dark inner tile, west", "D2": "Dark inner tile, west", "D3": "Dark inner tile, east", "D4": "Dark inner tile, east",
      "MT": "North tower", "H1": "West tower", "ST": "South tower", "H2": "East tower"})
step(P3, B3, "DPS เข้า tower ①: Tank/Healer ทิ้งมาร์ก", "DPS take towers ①: tanks/healers drop markers",
     "แบบกลับกัน: มาร์กมาที่ Tank/Healer\n"
     "① ให้ช่องแดงคู่ในวงในเป็นทิศเหนือเหมือนเดิม Tank/Healer ทิ้งมาร์กที่จุดของตัวเอง",
     "The other way round: the markers are on the tanks/healers\n"
     "① With the inner red pair as north again, the tanks/healers drop their markers at their spots",
     True, "b3_th_marks",
     {"MT": "ทิ้งมาร์ก: วงในทิศเหนือ", "H1": "ทิ้งมาร์ก: วงในตะวันตกเฉียงใต้", "ST": "ทิ้งมาร์ก: วงในทิศใต้", "H2": "ทิ้งมาร์ก: วงในตะวันออกเฉียงใต้",
      "D3": "tower เหนือ", "D1": "tower ตะวันตก", "D2": "tower ใต้", "D4": "tower ตะวันออก"},
     {"MT": "Drop: inner ring, north", "H1": "Drop: inner ring, south-west", "ST": "Drop: inner ring, south", "H2": "Drop: inner ring, south-east",
      "D3": "North tower", "D1": "West tower", "D2": "South tower", "D4": "East tower"})
step(P3, B3, "② Tank/Healer ออกจากวงเวท DPS เข้า tower", "② Tanks/healers leave the circles; the DPS take the towers",
     "② Tank/Healer ออกจากช่องวงเวท ไปยืนช่องมืดวงใน: H1 ST ตะวันตก / MT H2 ตะวันออก\n"
     "DPS เข้า tower",
     "② The tanks/healers step off the circles onto the dark inner tiles: H1 ST west / MT H2 east\n"
     "The DPS take the towers",
     True, "b3_th_towers",
     {"H1": "ช่องมืดวงในตะวันตก", "ST": "ช่องมืดวงในตะวันตก", "MT": "ช่องมืดวงในตะวันออก", "H2": "ช่องมืดวงในตะวันออก",
      "D3": "tower เหนือ", "D1": "tower ตะวันตก", "D2": "tower ใต้", "D4": "tower ตะวันออก"},
     {"H1": "Dark inner tile, west", "ST": "Dark inner tile, west", "MT": "Dark inner tile, east", "H2": "Dark inner tile, east",
      "D3": "North tower", "D1": "West tower", "D2": "South tower", "D4": "East tower"})

E2 = "Bud of Valor + Escelons' Fall"
step(P3, E2, "ครั้งที่ 2 ①: stack + donut", "2nd time ①: stacks + a donut",
     "Escelons' Fall ครั้งที่ 2 มาพร้อม donut ที่ระเบิดต่อเนื่อง\n"
     "donut มาที่กลุ่ม Tank/Healer หรือกลุ่ม DPS\n"
     "กลุ่มที่ได้ donut ไม่มีเวลาขยับ จึงให้อีกกลุ่มล่อ cone ครั้งแรก\n"
     "ครั้งนี้กลุ่มที่เริ่มในวงเป้าขึ้นกับว่าใครได้ donut (ไม่ใช่ Tank/Healer เสมอ)\n\n"
     "① Tank/Healer รวมกันฝั่งเหนือ / DPS รวมกันฝั่งใต้ รับ stack และ donut\n"
     "ภาพนี้ donut อยู่ที่กลุ่ม DPS",
     "Escelons' Fall the 2nd time comes with a donut that goes off again and again\n"
     "The donut goes to the tank/healer group or the DPS group\n"
     "The donut group has no time to move, so the other group baits the first cone\n"
     "This time, who starts inside the target circle depends on the donut (not always the tanks/healers)\n\n"
     "① Tanks/healers together on the north side / DPS together on the south side, for the stacks and the donut\n"
     "Here the donut is on the DPS",
     False, "e2a")
step(P3, E2, "② กลุ่มที่ไม่ได้ donut ล่อครั้งแรก", "② The group without the donut baits first",
     "② กลุ่มที่ไม่ได้ donut ล่อ cone ครั้งแรก\n"
     "ภาพนี้: Tank/Healer อยู่ใกล้บอส สัญญาณสีชมพู (ใกล้)",
     "② The group without the donut baits the first cones\n"
     "Here: the tanks/healers are close and the tell is pink (nearest)",
     True, "e2b", dict(EF_SAYS, **seats({"ยังรวมกันฝั่งใต้ (donut)": DPS})), dict(EF_SAYS_EN, **seats({"Still together on the south side (donut)": DPS})))
step(P3, E2, "③ กลุ่มที่ได้ donut ล่อ", "③ The donut group baits",
     "③ กลุ่มที่ได้ donut ล่อ cone\n"
     "ภาพนี้: DPS อยู่นอกวง สัญญาณสีม่วง (ไกล)",
     "③ The group that had the donut baits\n"
     "Here: the DPS are outside and the tell is purple (farthest)",
     True, "e2c", EF_SAYS, EF_SAYS_EN)
step(P3, E2, "④ กลุ่มที่ล่อครั้งแรกล่ออีกครั้ง", "④ The first baiters bait again",
     "④ กลุ่มที่ล่อครั้งแรกล่ออีกครั้ง\n"
     "ภาพนี้: Tank/Healer ออกไปนอกวง สัญญาณสีม่วง (ไกล)",
     "④ The group that baited first baits again\n"
     "Here: the tanks/healers are out and the tell is purple (farthest)",
     True, "e2d", EF_SAYS, EF_SAYS_EN)
step(P3, E2, "⑤ กลุ่มที่ได้ donut ล่อ", "⑤ The donut group baits",
     "⑤ กลุ่มที่ได้ donut ล่อ\n"
     "ภาพนี้: DPS อยู่ในวง สัญญาณสีชมพู (ใกล้)\n"
     "จบกลไก",
     "⑤ The group that had the donut baits\n"
     "Here: the DPS are inside and the tell is pink (nearest)\n"
     "That is the end of it",
     True, "e2e", EF_SAYS, EF_SAYS_EN)

B4 = "Roseblood: 4th Bloom"
B4_DROP = ("กลุ่มหนึ่งได้มาร์กกุหลาบ (เพิ่มวงเวทบนพื้น) อีกกลุ่มได้มาร์ก AoE (ทำให้วงเวททำงาน)\n"
           "มาร์กกุหลาบ: ทิ้งฝั่งตรงข้ามกับกุหลาบบนพื้น\n"
           "มาร์ก AoE: ทิ้งฝั่งเดียวกับกุหลาบบนพื้น และอย่าให้ AoE โดนวงเวทอีกฝั่ง\n"
           "ทิ้งมาร์กกุหลาบเป็นตาราง 2×2 (กลางสนามอยู่ด้านบน):\n"
           "แถวใน: D1·MT ซ้าย / D2·ST ขวา\n"
           "แถวนอก: D3·H1 ซ้าย / D4·H2 ขวา\n\n")
B4_DROP_EN = ("One group gets rose markers (they add circles to the floor), the other AoE markers (they set circles off)\n"
              "Rose markers: drop them on the side away from the floor's roses\n"
              "AoE markers: drop them on the roses' side, and keep the AoEs off the circles on the other side\n"
              "Rose drops in a 2×2 (the middle above):\n"
              "inner row: D1·MT left / D2·ST right\n"
              "outer row: D3·H1 left / D4·H2 right\n\n")
step(P3, B4, "① Tank/Healer ทิ้ง AoE / DPS ทำช่องแดง", "① Tanks/healers drop AoEs / the DPS make red tiles",
     B4_DROP + "① แบบ Tank/Healer ทิ้ง AoE และ DPS ทำช่องแดง\n"
     "Tank/Healer อย่าให้ AoE โดนช่องแดงฝั่ง DPS",
     B4_DROP_EN + "① Tanks/healers drop the AoEs and the DPS make the red tiles\n"
     "Tanks/healers: keep your AoEs off the DPS side's red tiles",
     True, "b4a",
     {"ST": "AoE: บนสุด (วงนอกเหนือ)", "MT": "AoE: วงในเหนือ", "H1": "AoE: ตะวันตก", "H2": "AoE: ตะวันออก",
      "D1": "กุหลาบ: แถวใน ซ้าย", "D2": "กุหลาบ: แถวใน ขวา", "D3": "กุหลาบ: แถวนอก ซ้าย", "D4": "กุหลาบ: แถวนอก ขวา"},
     {"ST": "AoE: top (outer north)", "MT": "AoE: inner north", "H1": "AoE: west", "H2": "AoE: east",
      "D1": "Rose: inner row, left", "D2": "Rose: inner row, right", "D3": "Rose: outer row, left", "D4": "Rose: outer row, right"})
step(P3, B4, "② DPS ทิ้ง AoE / Tank/Healer ทำช่องแดง", "② The DPS drop AoEs / tanks/healers make red tiles",
     "② แบบกลับกัน: DPS ทิ้ง AoE และ Tank/Healer ทำช่องแดง\n"
     "DPS อย่าให้ AoE โดนช่องแดงฝั่ง Tank/Healer",
     "② The other way round: the DPS drop the AoEs and the tanks/healers make the red tiles\n"
     "DPS: keep your AoEs off the tank/healer side's red tiles",
     True, "b4b",
     {"D1": "AoE: บนสุด (วงนอกเหนือ)", "D2": "AoE: วงในเหนือ", "D3": "AoE: ตะวันตก", "D4": "AoE: ตะวันออก",
      "MT": "กุหลาบ: แถวใน ซ้าย", "ST": "กุหลาบ: แถวใน ขวา", "H1": "กุหลาบ: แถวนอก ซ้าย", "H2": "กุหลาบ: แถวนอก ขวา"},
     {"D1": "AoE: top (outer north)", "D2": "AoE: inner north", "D3": "AoE: west", "D4": "AoE: east",
      "MT": "Rose: inner row, left", "ST": "Rose: inner row, right", "H1": "Rose: outer row, left", "H2": "Rose: outer row, right"})
step(P3, B4, "③ รวมกันหลังบอส (ใต้)", "③ Gather behind the boss (south)",
     "③ หลังมาร์กจบ ทุกคนโดนสายหนาม (ตาม timeline ของ game8: Encircling Thorns)\n"
     "บอสหันไปทางเหนือ ทุกคนรวมกันที่หลังบอส = ทิศใต้ (ฝั่ง C)\n"
     "ช่องตรงนั้นเป็นสีแดงก็ไม่เป็นไร",
     "③ After the markers, everyone gets a thorn tether (by game8's timeline: Encircling Thorns)\n"
     "The boss faces north, so gather behind it = south (the C side)\n"
     "It is fine if those tiles are red",
     False, "b4c")
step(P3, B4, "④ ดึงสายขาด: Tank/Healer ตะวันตก / DPS ตะวันออก", "④ Break the tethers: tanks/healers west / DPS east",
     "④ หันหน้าเข้าหาบอส แล้วดึงสายจนขาด: Tank/Healer ไปตะวันตก / DPS ไปตะวันออก\n"
     "แล้วรับ stack (ตาม timeline ของ game8: Alexandrian Banish III)\n"
     "ใช้ช่องวงเวทช่วย ทำให้ stack นี้รับได้ครบ 8 คน: ตอน stack ให้ยืนบนช่องกุหลาบ",
     "④ Face the boss and stretch the tethers until they break: tanks/healers west / DPS east\n"
     "Then take the stack (by game8's timeline: Alexandrian Banish III)\n"
     "The circles let all 8 share this stack: stand on the rose tiles for it",
     False, "b4d",
     seats({"ดึงสายไปตะวันตก แล้วรับ stack": TH, "ดึงสายไปตะวันออก แล้วรับ stack": DPS}),
     seats({"Stretch the tether west, then take the stack": TH, "Stretch the tether east, then take the stack": DPS}))

E3 = "Bud of Valor + Escelons' Fall"
E3_SAYS = EF_SAYS
step(P3, E3, "ครั้งที่ 3 ①: ร่างแยกโผล่", "3rd time ①: the phantoms appear",
     "ฟันครึ่งสนามของร่างแยก ผสมกับ cone ของ Escelons' Fall\n"
     "ครั้งนี้เหมือนครั้งแรก: Tank/Healer เริ่มในวงเป้าของบอส\n"
     "ลำดับ: หลบครึ่งสนามครั้งแรก > ล่อ cone ที่จุดของ Escelons' Fall > หลบครึ่งสนามครั้งที่ 2\n"
     "game8 ระบุว่าครึ่งสนามมาจากร่างแยกฝั่งเหนือเสมอ\n\n"
     "① บอสขึ้นสัญญาณใกล้/ไกลของ Escelons' Fall และร่างแยกโผล่ที่ขอบสนาม",
     "The phantoms' half-room cleaves mixed with Escelons' Fall\n"
     "As the 1st time: tanks/healers start inside the target circle\n"
     "Order: dodge the first half-room > bait the cones at the Escelons' Fall spots > dodge the second half-room\n"
     "game8 says the half-room always comes from the north phantom\n\n"
     "① The boss shows the near/far tell and the phantoms appear at the edge",
     False, "e3a")
step(P3, E3, "② หลบครึ่งสนาม", "② Dodge the half-room",
     "② พอสัญญาณที่ 2 ขึ้น ร่างแยกง้างฟันครึ่งสนาม\n"
     "หลบไปครึ่งที่ไม่โดน",
     "② When the second tell shows, the phantoms ready a half-room cleave\n"
     "Move to the half that is not hit",
     False, "e3b")
step(P3, E3, "③ เข้าจุด: Tank/Healer ในวง / DPS นอกวง", "③ Into place: tanks/healers in / DPS out",
     "③ รีบเข้าจุดทันที: Tank/Healer ในวงเป้า / DPS นอกวง\n"
     "ภาพนี้สีชมพู (ใกล้): Tank/Healer รับ cone",
     "③ Get into place at once: tanks/healers inside the target circle / DPS outside\n"
     "Pink here (nearest): the tanks/healers take the cones",
     True, "e3c", E3_SAYS, EF_SAYS_EN)
step(P3, E3, "④ ไม่ให้ใครโดน 2 ครั้งติด", "④ Nobody takes two in a row",
     "④ ล่อให้ Tank/Healer หรือ DPS ไม่โดน 2 ครั้งติด\n"
     "ภาพนี้: DPS เข้ามาใกล้ (สีชมพู) DPS รับ cone",
     "④ Bait so that neither tanks/healers nor DPS are hit twice in a row\n"
     "Here: the DPS come close (pink) and take the cones",
     True, "e3d", E3_SAYS, EF_SAYS_EN)
step(P3, E3, "⑤ คนที่รับครั้งที่ 1 รับ", "⑤ The 1st takers take it",
     "⑤ Tank/Healer ที่รับครั้งที่ 1 รับ cone นี้\n"
     "ภาพนี้: Tank/Healer อยู่นอกวง สีม่วง (ไกล)",
     "⑤ The tanks/healers who took the 1st take this one\n"
     "Here: the tanks/healers are outside, purple (farthest)",
     True, "e3e", E3_SAYS, EF_SAYS_EN)
step(P3, E3, "⑥ คนที่รับครั้งที่ 2 รับ", "⑥ The 2nd takers take it",
     "⑥ DPS ที่รับครั้งที่ 2 รับ cone นี้\n"
     "ภาพนี้: DPS อยู่นอกวง สีม่วง (ไกล)",
     "⑥ The DPS who took the 2nd take this one\n"
     "Here: the DPS are outside, purple (farthest)",
     True, "e3f", E3_SAYS, EF_SAYS_EN)
step(P3, E3, "⑦ หลบครึ่งสนามอีกครั้ง", "⑦ Dodge the half-room again",
     "⑦ รับ cone ครั้งที่ 4 แล้ว ร่างแยกฝั่งใต้ง้างฟันครึ่งสนาม\n"
     "หลบไปครึ่งที่ไม่โดน\n"
     "จบกลไก",
     "⑦ After the 4th cone, the south phantom readies a half-room cleave\n"
     "Move to the half that is not hit\n"
     "That is the end of it",
     False, "e3g")

B5 = "Roseblood: 5th Bloom"
step(P3, B5, "① ยืนบนช่องธรรมดาที่ไม่โดน AoE แนวเส้น", "① Stand on a plain tile clear of the line AoE",
     "หลายอย่างซ้อนกัน แต่หลักคือรอที่จุดแล้ววิ่งไปฝั่งทแยง\n"
     "ขอบสนามมีเอฟเฟกต์ปล่อย AoE แนวเส้น 2 ครั้ง ห่างกันเล็กน้อย\n"
     "(ตาม timeline ของ game8: Valorous Ascension แล้ว Thunder Slash)\n\n"
     "รอบนช่องธรรมดา (ไม่ใช่ช่องแดง) ที่ AoE แนวเส้นครั้งแรกไม่โดน\n"
     "และไม่โดน AoE วงกลมหรือ donut ครั้งแรกจากกลางสนาม\n"
     "พอ Thunder Slash ออก วิ่งตามเข็มนาฬิกาไปฝั่งทแยง\n\n"
     "① ไปยืนที่ไม่มี AoE แนวเส้นและไม่มีวงเวท",
     "A lot at once, but at heart you wait at a spot, then dash to the diagonal\n"
     "The edge sets off line AoEs twice, a moment apart\n"
     "(by game8's timeline: Valorous Ascension, then Thunder Slash)\n\n"
     "Wait on a plain tile (not red) that the first line AoE does not hit\n"
     "and that the first circle or donut from the middle does not hit\n"
     "When Thunder Slash goes off, run clockwise to the diagonal\n\n"
     "① Stand where there is no line AoE and no magic circle",
     False, "b5a")
step(P3, B5, "② หลบ cone และวงกลม/donut", "② Dodge the cones and the circle or donut",
     "② จากจุดข้อ ① ขยับไปที่ที่หลบทั้ง cone ของบอส และ AoE วงกลมหรือ donut\n"
     "ภาพนี้ donut มาก่อน: ยืนวงใน",
     "② From ①, move to where you dodge both the boss's cones and the circle or donut\n"
     "Here the donut comes first: stand in the inner ring",
     False, "b5b")
step(P3, B5, "③ วิ่งไปฝั่งทแยง", "③ Run to the diagonal",
     "③ พอวงกลมหรือ donut ตกแล้ว ไปฝั่งทแยงที่หลบ AoE ที่ยังไม่มา และ cone ได้\n"
     "ดู AoE แนวเส้นครั้งแรกกับวงกลม/donut ของบอสให้ดี cone ไม่ค่อยต้องห่วง",
     "③ Once the circle or donut lands, go to the diagonal that dodges the AoE still to come and the cones\n"
     "Watch the first line AoE and the boss's circle/donut; the cones mostly take care of themselves",
     False, "b5c")
step(P3, B5, "จุดยืนเมื่อบอสใช้ AoE วงกลม", "Where to stand when the boss uses the circle",
     "ถ้าบอสใช้ AoE วงกลมก่อน ยืนตามภาพ: วงนอก ตะวันออก",
     "If the boss uses the circle first, stand as pictured: outer ring, east",
     False, "b5d")

B6 = "Roseblood: 6th Bloom"
B6_SAYS = {"MT": "คู่ MT·D3: ตะวันตกเฉียงเหนือ", "D3": "คู่ MT·D3: ตะวันตกเฉียงเหนือ", "ST": "คู่ ST·D4: ตะวันออกเฉียงเหนือ", "D4": "คู่ ST·D4: ตะวันออกเฉียงเหนือ",
           "H1": "คู่ H1·D1: ตะวันตกเฉียงใต้", "D1": "คู่ H1·D1: ตะวันตกเฉียงใต้", "H2": "คู่ H2·D2: ตะวันออกเฉียงใต้", "D2": "คู่ H2·D2: ตะวันออกเฉียงใต้"}
B6_SAYS_EN = {"MT": "MT·D3: north-west", "D3": "MT·D3: north-west", "ST": "ST·D4: north-east", "D4": "ST·D4: north-east",
              "H1": "H1·D1: south-west", "D1": "H1·D1: south-west", "H2": "H2·D2: south-east", "D2": "H2·D2: south-east"}
step(P3, B6, "① ไปจุด spread", "① To the spread spots",
     "แผนของ Ponikone: ยอมโดน cone 1 ครั้ง\n"
     "วิธีหลบครบทุกอย่างยากมาก จึงแนะนำให้ใช้ mitigate หนาขึ้นเล็กน้อย แล้วรับ cone 1 ครั้ง\n"
     "จะใส่ Tank LB เพิ่มให้ปลอดภัยกว่าก็ได้\n"
     "โดน cone แล้วติด debuff รับดาเมจเพิ่ม แต่หลังจากนั้นโดนน้อย และ debuff หมดก่อน stack แรงๆ 2 ครั้งก่อนหมดเวลา\n\n"
     "คู่: MT·D3 / ST·D4 / H1·D1 / H2·D2\n\n"
     "① วงเวทขึ้นแล้ว ไปที่จุด spread พื้นฐาน",
     "Ponikone's way: take one cone on purpose\n"
     "Dodging everything is very hard, so game8 suggests somewhat heavier mitigation and taking one cone\n"
     "Adding a tank LB on top for safety is fine too\n"
     "The cone leaves a damage-taken-up debuff, but little hits you after that, and it wears off before the two heavy stacks before time runs out\n\n"
     "Pairs: MT·D3 / ST·D4 / H1·D1 / H2·D2\n\n"
     "① Once the circles appear, go to the basic spread spots",
     True, "b6a", B6_SAYS, B6_SAYS_EN)
step(P3, B6, "② ทิ้งมาร์กไม่ให้วงเวทติดกัน", "② Drop markers so no circles touch",
     "② คนที่ได้มาร์กกุหลาบ ทิ้งให้วงเวทไม่ติดกัน (สลับกับช่องแดง)\n"
     "คนเข้า tower ไปยืนที่จุดตอนนี้เลย\n"
     "ภาพนี้: มาร์กอยู่ที่ Tank/Healer / DPS เข้า tower",
     "② Rose marker players drop them so no circles touch (alternate with the red tiles)\n"
     "Tower players go to their spots now as well\n"
     "Here: the markers are on the tanks/healers / the DPS take the towers",
     True, "b6b", B6_SAYS, B6_SAYS_EN)
step(P3, B6, "③ ไปจุดที่หลบได้ 1 cone", "③ Where one cone misses you",
     "③ ทิ้งมาร์กแล้ว ไปจุดที่หลบ cone ของบอสได้ 1 ลูก\n"
     "วิธีนี้ตั้งใจรับ cone 1 ลูก ใช้ Tank LB หรือ mitigate เยอะๆ\n"
     "(ตาม timeline ของ game8: Holy Hazard)",
     "③ After dropping, go where one of the boss's cones misses you\n"
     "This way takes one cone on purpose; use a tank LB or plenty of mitigation\n"
     "(by game8's timeline: Holy Hazard)",
     True, "b6c", B6_SAYS, B6_SAYS_EN)
step(P3, B6, "④ อยู่นิ่งได้เลย", "④ Stay put",
     "④ เข้าที่แล้วไม่ต้องขยับ\n"
     "cone ให้ debuff รับดาเมจเพิ่ม แต่หมดก่อน stack ครั้งถัดไป",
     "④ Once in place, you need not move\n"
     "The cone gives a damage-taken-up debuff, but it is gone before the next stack",
     True, "b6d", B6_SAYS, B6_SAYS_EN)

# ======================================================================= the end
step(P4, RB, "ครั้งที่ 2: เหมือนครั้งแรก", "2nd time: as the first",
     "ตาม timeline ของ game8: Roseblood Bloom มาอีกครั้ง พร้อม Alexandrian Thunder II และ Alexandrian Thunder III\n"
     "ทำเหมือนครั้งแรก (ดู Roseblood Bloom ต้นช่วงกลาง): หลบ cone ที่หมุน แล้ว spread บนช่องที่ไม่มีวงเวท\n\n"
     "ตามด้วย Thorned Catharsis (raid-wide) และ Specter of the Lost (tankbuster ทางสาย)",
     "By game8's timeline: Roseblood Bloom comes again, with Alexandrian Thunder II and Alexandrian Thunder III\n"
     "Do it as the first time (see Roseblood Bloom at the start of the middle part): dodge the turning cones, then spread on tiles without circles\n\n"
     "Then Thorned Catharsis (raid-wide) and Specter of the Lost (tankbuster on tethers)")
step(P4, "Stock Break + Roseblood Withering + Rose Red", "stack 3 ครั้ง แล้วหมดเวลา (enrage)", "Three stacks, then time is up (enrage)",
     "ตาม timeline ของ game8: Stock Break 3 ครั้งติดกัน (stack ที่ตกหลายครั้ง ดูช่วงแรก)\n"
     "แล้ว Roseblood Withering และ Rose Red ซึ่งเป็นท่าหมดเวลา (enrage)\n"
     "ใช้ mitigate ให้ครบทุก stack และตีบอสให้ตายก่อนร่ายจบ",
     "By game8's timeline: Stock Break 3 times in a row (the multi-hit stack, see the first part)\n"
     "then Roseblood Withering and Rose Red, the time-up cast (enrage)\n"
     "Mitigate every stack and kill the boss before it finishes")

# ======================================================================= the guide
WEAPONS = [("Queensknight Falchion", "PLD", "030000/030691"), ("Queensknight Baghnakhs", "MNK", "030000/030855"),
           ("Queensknight Bardiche", "WAR", "031000/031265"), ("Queensknight Spear", "DRG", "031000/031667"),
           ("Queensknight Compound Bow", "BRD", "032000/032055"), ("Queensknight Cane", "WHM", "032000/032486"),
           ("Queensknight Scepter", "BLM", "032000/032901"), ("Book of Chivalry", "SMN", "037000/037833"),
           ("Word of the Knighthood", "SCH", "037000/037832"), ("Queensknight Knives", "NIN", "033000/033641"),
           ("Queensknight Faussar", "DRK", "034000/034020"), ("Queensknight Pistol", "MCH", "034000/034514"),
           ("Queensknight Astrometer", "AST", "034000/034713"), ("Queensknight Blade", "SAM", "036000/036569"),
           ("Queensknight Foil", "RDM", "036000/036868"), ("Queensknight Gunblade", "GNB", "036000/036111"),
           ("Queensknight War Quoits", "DNC", "036000/036310"), ("Queensknight Scythe", "RPR", "037000/037281"),
           ("Queensknight Syrinxi", "SGE", "037000/037077"), ("Queensknight Twinfangs", "VPR", "037000/037444"),
           ("Queensknight Flat Brush", "PCT", "037000/037654"), ("Queensknight Shield", "PLD", "030000/030280")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]

NOTE = ("แผนตาม game8 (แผนของ Nukemaru) ใช้แผนของ Kurapon ใน Roseblood: 3rd Bloom และวิธียอมโดน cone 1 ครั้งของ Ponikone ใน Roseblood: 6th Bloom\n"
        "Marker 8 ทิศ ใช้ดูทิศเท่านั้น (ดูขั้นแรก)\n\n"
        "กลุ่ม Tank/Healer: MT ST H1 H2\n"
        "กลุ่ม DPS: D1 D2 D3 D4\n\n"
        "Shock tower (คู่ใช้จุดเดียวกัน): MT·D3 ตะวันตกเฉียงเหนือ / ST·D4 ตะวันออกเฉียงเหนือ / H1·D1 ตะวันตกเฉียงใต้ / H2·D2 ตะวันออกเฉียงใต้\n\n"
        "Escelons' Fall: Tank/Healer เริ่มในวงเป้าของบอส DPS นอกวง (ครั้งที่ 2 ดูว่าใครได้ donut)\n"
        "จุดยืน: MT ST หน้าบอส / H1 H2 ข้าง / D3 D4 หลังด้านข้าง / D1 D2 หลัง\n\n"
        "Blessed Barricade: Tank/Healer ฝั่งตะวันตก / DPS ฝั่งตะวันออก\n\n"
        "Roseblood: 3rd Bloom คู่: MT·D3 / H1·D1 / ST·D2 / H2·D4\n"
        "Roseblood: 4th Bloom วางกุหลาบ: D1·MT / D2·ST / D3·H1 / D4·H2 สายหนาม: รวมที่ใต้ แล้ว Tank/Healer ไปตะวันตก DPS ไปตะวันออก\n"
        "Roseblood: 6th Bloom คู่: MT·D3 / ST·D4 / H1·D1 / H2·D2")
NOTE_EN = ("Plan follows game8 (Nukemaru's strat), with Kurapon's Roseblood: 3rd Bloom and Ponikone's take-one-cone Roseblood: 6th Bloom\n"
           "8-direction waymarks, for orientation only (see the first step)\n\n"
           "Tank/healer group: MT ST H1 H2\n"
           "DPS group: D1 D2 D3 D4\n\n"
           "Shock towers (a pair shares a spot): MT·D3 north-west / ST·D4 north-east / H1·D1 south-west / H2·D2 south-east\n\n"
           "Escelons' Fall: tanks/healers start inside the boss's target circle, DPS outside (the 2nd time, see who has the donut)\n"
           "Spots: MT ST in front / H1 H2 beside / D3 D4 behind to the sides / D1 D2 behind\n\n"
           "Blessed Barricade: tanks/healers west / DPS east\n\n"
           "Roseblood: 3rd Bloom pairs: MT·D3 / H1·D1 / ST·D2 / H2·D4\n"
           "Roseblood: 4th Bloom roses: D1·MT / D2·ST / D3·H1 / D4·H2; thorns: gather south, then tanks/healers west, DPS east\n"
           "Roseblood: 6th Bloom pairs: MT·D3 / ST·D4 / H1·D1 / H2·D2")

fight = {
    "guide": {
        "slug": "ex4-zelenia", "short": "EX4",
        "name": "Zelenia · Recollection (Extreme)",
        "category": "extreme", "expansion": "Dawntrail", "patch": "7.2",
        "source_name": "game8", "source_url": "https://game8.jp/ff14/678687",
        "content_key": "ex:Zelenia",
        "note": NOTE, "en": {"note": NOTE_EN},
        "req": {
            "level": 100, "ilvl": 730, "party": 8, "minutes": 60,
            "unlock": ("เคลียร์ Main Quest ล่าสุดของ Dawntrail ก่อน\n"
                       "แล้วคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                       "Extreme ของ Dawntrail ปลดล็อกที่ NPC คนนี้ทั้งหมด"),
            "unlock_en": ("Finish Dawntrail's latest main scenario quest first\n"
                          "then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                          "Every Dawntrail Extreme is unlocked from this NPC"),
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}],
        },
        "macro_en": macros["en"].rstrip("\n"), "macro_ja": macros["ja"].rstrip("\n"),
        "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/extreme_trials/zelenia/",
    },
    "defaults": {
        "frame": [1, 1], "bg": "#5f6166", "waymarks": {},
        "iconSize": 6.4, "markSize": 11, "bossSize": 8.0, "ring": 6.2,
    },
    "steps": steps,
    "cheatsheet": cheatsheet(),
    "rewards": [
        {"kind": "token", "name": "Knight Totem", "icon_src": ICON("ui/icon/026000/026680_hr1.tex"),
         "say": ("ได้ 1 ชิ้นทุกครั้งที่เคลียร์ (การันตี)\n\n"
                 "แลกที่ Uah'shepya ใน Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                 "อาวุธ IL745: 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "Wings of the Knighthood: 99 ชิ้น"),
         "say_en": ("Every clear gives 1 (guaranteed).\n\n"
                    "Exchange them with Uah'shepya in Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)\n"
                    "IL745 weapon: 10 per weapon\n"
                    "Wings of the Knighthood: 99"),
         "pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
                   "say": "จุดแลก: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)",
                   "say_en": "Where to exchange: Uah'shepya, Solution Nine — Nexus Arcade (X: 8.7 Y: 13.5)"}]},
        {"kind": "weapon", "name": "Queensknight weapons", "ilvl": 745, "icon_src": ICON("ui/icon/030000/030691_hr1.tex"),
         "say": ("แลกด้วย Knight Totem 10 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
                 "PLD ได้ Queensknight Falchion กับ Queensknight Shield คู่กันในการแลกครั้งเดียว\n"
                 "มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ"),
         "say_en": ("10 Knight Totems per weapon\n"
                    "PLD gets the Queensknight Falchion and the Queensknight Shield together in one exchange\n"
                    "One for every job; tap an icon for the weapon's name"),
         "pieces": pieces},
        {"kind": "mount", "name": "Wings of the Knighthood", "icon_src": ICON("ui/icon/004000/004314_hr1.tex"),
         "say": "ของ rare ดรอปจากหีบ อัตราดรอปต่ำมาก\nหรือแลกด้วย Knight Totem 99 ชิ้น",
         "say_en": "A rare drop from the chest, with a very low drop rate\nor 99 Knight Totems",
         "pics": [{"src": ICON("ui/icon/068000/068314_hr1.tex"),
                   "say": "หน้าตา Wings of the Knighthood (ภาพจาก Mount Guide ในเกม)",
                   "say_en": "Wings of the Knighthood, as the in-game Mount Guide shows it"}]},
    ],
}

json.dump(fight, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(steps), "steps,", sum(1 for s in steps if s.get("scene")), "pictures,", sum(len(s.get("refs", [])) for s in steps), "refs,",
      len({s["mech"] for s in steps}), "mechs,", len(dict.fromkeys(s["phase"] for s in steps)), "phases,",
      len(fight["cheatsheet"]["panels"]), "panels")
