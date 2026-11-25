"""Builds scripts/guides/data/m9s.json (M9S Vamp Fatale, game8's plan: Nukemaru's strat, Hell in a Cell towers from north clockwise)."""
import sys, json, re, html
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/m9s"
sys.path.insert(0, HERE + "/tools")
import scenes9 as S

OUT = r"scripts/guides/data/m9s.json"
URLS = [l.strip() for l in open(HERE + "/imgs.txt", encoding="utf-8") if l.strip()]
G8 = lambda k: URLS[k - 1]          # game8 picture k = dl/img/kk_*
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
ITEMS = json.load(open(HERE + "/api/items.json", encoding="utf-8"))
VID = "m4_8a0N8GcM"


def FR(name, t, say, say_en):
    return (f"frames/m9s/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VID}?t={t}")


# The macro blocks exactly as xivjpraids has them (the last line break dropped, as the other guides keep them).
xj = open(HERE + "/dl/xj.html", encoding="utf-8").read()
pres = [html.unescape(re.sub(r"<[^>]+>", "", b)) for b in re.findall(r"<pre[^>]*>(.*?)</pre>", xj, re.S)]
MACRO_EN = pres[0][:-1] if pres[0].endswith("\n") else pres[0]
MACRO_JA = pres[1][:-1] if pres[1].endswith("\n") else pres[1]
assert MACRO_EN.startswith("■ Vamp Stomp") and MACRO_JA.startswith("【ヴァンプストンプ】")

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = 5.2
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


P0 = ("เตรียมตัว", "Setup")
P1 = ("ท่าที่มาตลอดไฟต์", "Throughout the fight")
P2 = ("ช่วงแรก", "First part")
P3 = ("ช่วงกลาง", "Middle part")
P4 = ("ช่วงหลัง", "Last part")

# ------------------------------------------------------------------ setup
step(P0, "Waymarks", "Marker ตามภาพของ game8", "Waymarks as game8 draws them",
     "Marker เป็นจุดทิ้ง AoE ของ Aetherletting: แต่ละจุดอยู่ตรงที่รอยต่อระหว่างกรวย (cone) ของบอสชนขอบสนาม\n\n"
     "A และ 1 (สีแดง) ทิศเหนือ: A ซ้าย / 1 ขวา\n"
     "B และ 2 (สีเหลือง) ทิศตะวันออก: B บน / 2 ล่าง\n"
     "C และ 3 (สีฟ้า) ทิศใต้: 3 ซ้าย / C ขวา\n"
     "D และ 4 (สีม่วง) ทิศตะวันตก: 4 บน / D ล่าง\n\n"
     "game8 บอกว่าภาพบางภาพในหน้าของ game8 วาง Marker ต่างจากภาพนี้ และให้อ่านตามลำดับในภาพนี้\n"
     "ภาพทุกภาพในคู่มือนี้วาง Marker ตามภาพนี้แล้ว",
     "The waymarks are where the Aetherletting AoEs are dropped: each one sits where a gap between the boss's cones meets the arena's edge\n\n"
     "A and 1 (red) on the north edge: A left / 1 right\n"
     "B and 2 (yellow) on the east edge: B upper / 2 lower\n"
     "C and 3 (blue) on the south edge: 3 left / C right\n"
     "D and 4 (purple) on the west edge: 4 upper / D lower\n\n"
     "game8 says some of its pictures place the waymarks differently, and asks you to read them in this picture's order\n"
     "Every picture in this guide already uses this layout",
     strict=False, pic=1, scene=S.waymarks())

# ------------------------------------------------------------------ throughout the fight
step(P1, "Raid-wides", "raid-wide มาบ่อย", "Frequent raid-wides",
     "ไฟต์นี้มี raid-wide บ่อยมาก แรงระดับ Savage ชั้นแรก แต่อย่ารับโดยไม่ใช้ mitigate\n"
     "บอสใช้ raid-wide ธรรมดาคือ Killer Voice และชอบใช้ raid-wide ตอนเริ่มและตอนจบแต่ละ Mechanic\n\n"
     "ชื่อท่า raid-wide:\n"
     "Killer Voice\n"
     "Sadistic Screech\n"
     "Crowd Kill (buff ของบอสเพิ่ม stack)\n"
     "Finale Fatale\n"
     "Insatiable Thirst",
     "This fight has a lot of raid-wides. They hit as hard as a first Savage floor's, but don't take them without mitigate\n"
     "The plain raid-wide is Killer Voice, and the boss likes to open and close each mechanic with a raid-wide\n\n"
     "Raid-wide names:\n"
     "Killer Voice\n"
     "Sadistic Screech\n"
     "Crowd Kill (the boss's buff gains stacks)\n"
     "Finale Fatale\n"
     "Insatiable Thirst",
     strict=False,
     refs=[FR("killer-voice", 42, "Killer Voice: raid-wide ธรรมดาของบอส ใช้ mitigate ทุกครั้ง",
              "Killer Voice: the boss's plain raid-wide; mitigate it every time")])
step(P1, "Raid-wides", "AoE วงกลมสีดำบนพื้น", "Black circle AoEs on the floor",
     "หลัง Finale Fatale และจังหวะอื่นๆ จะมีวงสีดำ (AoE) ขึ้นบนพื้น\n"
     "หลบตามที่เห็นได้เลย ขั้นต่อๆ ไปจะไม่พูดถึงอีก",
     "After Finale Fatale and at other times, black circle telegraphs appear on the floor\n"
     "Just dodge them as you see them; later steps don't mention them again",
     strict=False,
     refs=[FR("black-aoe", 300, "วง AoE สีดำบนพื้น: หลบตามที่เห็น", "Black circle AoEs on the floor: dodge them as you see them")])
step(P1, "Hardcore", "tankbuster AoE ขนาดตาม buff ของบอส", "Tankbuster AoEs sized by the boss's buff",
     "tankbuster AoE ที่ Tank 2 คน ขนาดขึ้นกับจำนวน stack ของ buff บนตัวบอส\n"
     "buff 0–4: AoE เล็ก ขนาด 1 ช่อง\n"
     "buff 8 ขึ้นไป: AoE ใหญ่มาก ขนาด 4 ช่อง\n\n"
     "Hardcore มาทันทีหลัง raid-wide แรกของไฟต์ ST ต้องถือ hate อันดับ 2 ไว้ตั้งแต่ต้น\n"
     "Hardcore ช่วงต้นไฟต์เป็นวงเล็กแน่นอน ไม่ต้องแยกห่างมาก\n"
     "เมื่อ buff ของบอสถึง 8 ขึ้นไป วงจะใหญ่มาก แยกให้ห่างกัน อย่าให้ AoE ซ้อนกัน",
     "A tankbuster AoE on both tanks; its size depends on how many stacks of the buff the boss has\n"
     "Buff 0–4: a small AoE, 1 tile\n"
     "Buff 8 or more: a huge AoE, 4 tiles\n\n"
     "Hardcore comes right after the fight's first raid-wide, so ST must hold 2nd enmity from the start\n"
     "Early in the fight Hardcore is always small, so you needn't stand far apart\n"
     "Once the boss's buff reaches 8, it is huge: stand well apart so the AoEs don't overlap",
     strict=False,
     says={"MT": "hate อันดับ 1 รับ AoE วงหนึ่ง\nbuff ของบอส 8 ขึ้นไป: แยกห่างจาก ST",
           "ST": "ถือ hate อันดับ 2 ตั้งแต่ต้นไฟต์ รับ AoE อีกวง\nbuff ของบอส 8 ขึ้นไป: แยกห่างจาก MT"},
     says_en={"MT": "1st enmity: take one AoE\nBoss buff at 8+: stand well away from ST",
              "ST": "Hold 2nd enmity from the pull and take the other AoE\nBoss buff at 8+: stand well away from MT"},
     refs=[FR("hardcore", 294, "Hardcore: tankbuster AoE ที่ Tank 2 คน (วงลายแดงดำ) ขนาดโตตาม buff ของบอส",
              "Hardcore: tankbuster AoEs on both tanks (the red-and-black rings), growing with the boss's buff")])

# ------------------------------------------------------------------ first part: Vamp Stomp
VS = "Vamp Stomp + Brutal Rain"
PAT = ("มีค้างคาว (Vampette Fatale) หลายตัวในสนาม ตำแหน่งค้างคาวชุดแรกที่ระเบิดมี 4 แบบ\n"
       "วงสีส้ม = AoE วงกลมที่ค้างคาวระเบิด\n\n")
PAT_EN = ("There are many bats (Vampette Fatale) on the field; the first bats to go off come in 4 patterns\n"
          "Orange circle = the circle AoE a bat sets off\n\n")
step(P2, VS, "ค้างคาวชุดแรก แบบ 1: แนวตั้ง", "First bats, pattern 1: vertical",
     PAT + "แบบ 1: แนวตั้ง ค้างคาว 2 ตัวทางเหนือและใต้ของบอส (ภาพนี้)",
     PAT_EN + "Pattern 1: vertical, two bats north and south of the boss (this picture)",
     strict=False, pic=5, scene=S.vs_pattern(5),
     refs=[FR("vamp-bats", 108, "Vamp Stomp: ค้างคาวขึ้นหลายตัวในสนาม ดูตำแหน่งค้างคาวชุดแรก",
              "Vamp Stomp: bats all over the field; look where the first ones are")])
step(P2, VS, "ค้างคาวชุดแรก แบบ 2: แนวนอน", "First bats, pattern 2: horizontal",
     "แบบ 2: แนวนอน ค้างคาว 2 ตัวทางตะวันตกและตะวันออกของบอส",
     "Pattern 2: horizontal, two bats west and east of the boss",
     strict=False, pic=6, scene=S.vs_pattern(6))
step(P2, VS, "ค้างคาวชุดแรก แบบ 3: แนวทแยง", "First bats, pattern 3: diagonal",
     "แบบ 3: แนวทแยง ค้างคาวตัวหนึ่งทางตะวันออกเฉียงเหนือ อีกตัวทางตะวันตกเฉียงใต้ของบอส",
     "Pattern 3: diagonal, one bat north-east and one south-west of the boss",
     strict=False, pic=7, scene=S.vs_pattern(7))
step(P2, VS, "ค้างคาวชุดแรก แบบ 4: แนวทแยงอีกด้าน", "First bats, pattern 4: the other diagonal",
     "แบบ 4: แนวทแยง ค้างคาวตัวหนึ่งทางตะวันตกเฉียงเหนือ อีกตัวทางตะวันออกเฉียงใต้ของบอส",
     "Pattern 4: diagonal, one bat north-west and one south-east of the boss",
     strict=False, pic=8, scene=S.vs_pattern(8))

VS1_SAYS = {"MT": "4 ช่องใน: ฝั่งเหนือ", "D1": "4 ช่องใน: ฝั่งตะวันตก", "D2": "4 ช่องใน: ฝั่งตะวันออก",
            "ST": "4 ช่องใน: ฝั่งใต้", "D3": "มุมตะวันตกเฉียงเหนือ", "D4": "มุมตะวันออกเฉียงเหนือ",
            "H1": "มุมตะวันตกเฉียงใต้", "H2": "มุมตะวันออกเฉียงใต้"}
VS1_SAYS_EN = {"MT": "Inner four tiles: north side", "D1": "Inner four tiles: west side", "D2": "Inner four tiles: east side",
               "ST": "Inner four tiles: south side", "D3": "North-west corner", "D4": "North-east corner",
               "H1": "South-west corner", "H2": "South-east corner"}
step(P2, VS, "① วงขาวจากบอส + จุดยืน", "① The white ring from the boss + where to wait",
     "① วงสีขาวขยายออกจากตัวบอส ถ้าวงโดนค้างคาว ค้างคาวตัวนั้นระเบิด AoE วงกลม\n\n"
     "Tank + Melee: กระจายเป็นกากบาทใน 4 ช่องกลางสนาม\n"
     "MT เหนือ / D1 ตะวันตก / D2 ตะวันออก / ST ใต้\n"
     "Range + Healer: รอที่ 4 มุมสนาม\n"
     "D3 ตะวันตกเฉียงเหนือ / D4 ตะวันออกเฉียงเหนือ / H1 ตะวันตกเฉียงใต้ / H2 ตะวันออกเฉียงใต้\n\n"
     "ถ้าวงจากบอสโดนผู้เล่น ผู้เล่นคนนั้นจะปล่อย Blast Beat (AoE วงกลม) ถ้าทับกับคนอื่น ตายทันที",
     "① A white ring spreads out from the boss; when it reaches a bat, that bat sets off a circle AoE\n\n"
     "Tank + Melee: spread in a cross on the four middle tiles\n"
     "MT north / D1 west / D2 east / ST south\n"
     "Range + Healer: wait in the four corners\n"
     "D3 north-west / D4 north-east / H1 south-west / H2 south-east\n\n"
     "When the boss's ring reaches a player, that player sets off Blast Beat (a circle AoE); if it overlaps anyone else, it kills",
     strict=True, pic=26, scene=S.vs1(), says=VS1_SAYS, says_en=VS1_SAYS_EN,
     refs=[FR("vamp-ring", 90, "Vamp Stomp: วงขาวขยายจากบอส วงโดนค้างคาวเมื่อไหร่ ค้างคาวระเบิด AoE วงกลม",
              "Vamp Stomp: the white ring spreads from the boss; each bat it reaches sets off a circle AoE")])
step(P2, VS, "② Tank + Melee โดนวงที่ 4 ช่องใน แล้วเข้ากลาง", "② Tank + Melee take the ring at the inner tiles, then go in",
     "② พอวงสีขาวมาแตะขอบของ 4 ช่องกลาง Tank + Melee ให้โดนวง AoE ของตัวเองจะระเบิด\n"
     "พอระเบิดแล้ว ขยับเข้ากลางสนาม ไม่ให้โดน AoE ของ Range/Healer และของค้างคาว",
     "② When the white ring touches the edge of the four middle tiles, Tank + Melee let it hit them and their AoEs go off\n"
     "Once they have gone off, move into the middle so the Range/Healer and bat AoEs can't reach you",
     strict=True, pic=9, scene=S.vs2(),
     says={"MT": "โดนวงตอนวงแตะขอบ 4 ช่องใน แล้วเข้ากลาง", "D1": "โดนวงตอนวงแตะขอบ 4 ช่องใน แล้วเข้ากลาง",
           "D2": "โดนวงตอนวงแตะขอบ 4 ช่องใน แล้วเข้ากลาง", "ST": "โดนวงตอนวงแตะขอบ 4 ช่องใน แล้วเข้ากลาง",
           "D3": "รอที่มุม", "D4": "รอที่มุม", "H1": "รอที่มุม", "H2": "รอที่มุม"},
     says_en={"MT": "Take the ring as it touches the inner tiles, then move in", "D1": "Take the ring as it touches the inner tiles, then move in",
              "D2": "Take the ring as it touches the inner tiles, then move in", "ST": "Take the ring as it touches the inner tiles, then move in",
              "D3": "Wait in your corner", "D4": "Wait in your corner", "H1": "Wait in your corner", "H2": "Wait in your corner"},
     refs=[FR("vamp-melee", 312, "Vamp Stomp ②: วงขาวมาถึงขอบ 4 ช่องใน Tank + Melee โดนวงตรงนี้ แล้วรีบเข้ากลาง",
              "Vamp Stomp ②: the ring reaches the inner tiles; Tank + Melee take it here, then hurry into the middle")])
step(P2, VS, "③ Range + Healer โดนวงที่มุม", "③ Range + Healer take the ring in the corners",
     "③ Range + Healer หลบ AoE ของค้างคาว แล้วไปโดนวงสีขาวให้ AoE ของตัวเองระเบิดที่มุม\n"
     "Tank + Melee อยู่กลางสนามใต้ตัวบอส",
     "③ Range + Healer dodge the bat AoEs, then let the white ring hit them so their AoEs go off in the corners\n"
     "Tank + Melee stay in the middle, under the boss",
     strict=True, pic=10, scene=S.vs3(),
     says={"D3": "หลบ AoE ค้างคาว แล้วโดนวงที่มุมตะวันตกเฉียงเหนือ", "D4": "หลบ AoE ค้างคาว แล้วโดนวงที่มุมตะวันออกเฉียงเหนือ",
           "H1": "หลบ AoE ค้างคาว แล้วโดนวงที่มุมตะวันตกเฉียงใต้", "H2": "หลบ AoE ค้างคาว แล้วโดนวงที่มุมตะวันออกเฉียงใต้",
           "MT": "อยู่กลางสนามใต้บอส", "ST": "อยู่กลางสนามใต้บอส", "D1": "อยู่กลางสนามใต้บอส", "D2": "อยู่กลางสนามใต้บอส"},
     says_en={"D3": "Dodge the bat AoEs, then take the ring in the north-west corner", "D4": "Dodge the bat AoEs, then take the ring in the north-east corner",
              "H1": "Dodge the bat AoEs, then take the ring in the south-west corner", "H2": "Dodge the bat AoEs, then take the ring in the south-east corner",
              "MT": "Stay in the middle under the boss", "ST": "Stay in the middle under the boss",
              "D1": "Stay in the middle under the boss", "D2": "Stay in the middle under the boss"},
     refs=[FR("vamp-ranged", 318, "Vamp Stomp ③: วงขาวขยายไปถึงมุมสนาม Range + Healer โดนวงที่มุม หลบ AoE ค้างคาว",
              "Vamp Stomp ③: the ring reaches the corners; Range + Healer take it there and dodge the bat AoEs")])
step(P2, VS, "④ Brutal Rain: stack ที่ Healer", "④ Brutal Rain: stack on a healer",
     "④ ปิดท้ายด้วย Brutal Rain: stack หลายครั้งติดกันที่ Healer ทุกคนรวมกันรับ\n\n"
     "จำนวนครั้งของ Brutal Rain เพิ่มขึ้นตามระดับความแรงของบอสในครั้งต่อๆ ไป\n"
     "ครั้งแรกมีแค่ 3 ครั้ง ไม่ต้องใช้ mitigate หนักมาก",
     "④ Last comes Brutal Rain: several stacks in a row on a healer; everyone takes them together\n\n"
     "Later Brutal Rains hit more times as the boss grows stronger\n"
     "The first one is only 3 hits, so it doesn't need heavy mitigate",
     strict=False, pic=11, scene=S.vs4(),
     refs=[FR("brutal-rain", 330, "Brutal Rain: ทุกคนรวมกลุ่มใต้บอส รับ stack ด้วยกัน (ภาพจากครั้งที่ 2)",
              "Brutal Rain: everyone gathers under the boss and takes the stacks together (picture from the second one)")])

# ------------------------------------------------------------------ first part: Sadistic Screech
SS = "Sadistic Screech"
step(P2, SS, "① Coffinmaker: Coffinfiller แล้ว Dead Wake", "① The Coffinmaker: Coffinfiller, then Dead Wake",
     "Coffinmaker (ล้อ 4 อันด้านหน้าสนาม):\n"
     "Coffinfiller: ล้อ 2 ใน 4 อันเรืองแสงก่อน สักพักอีก 2 อันเรืองแสงตาม\n"
     "ร่ายจบ: ล้อ 2 อันที่เรืองแสงก่อนยิง AoE แนวตรง แล้วอีก 2 อันยิงตามทันที\n"
     "หลังยิงเสร็จ Dead Wake: Coffinmaker เดินหน้า ไฟคลุมพื้นที่ด้านหน้า สนามแคบลง โดน = KO",
     "The Coffinmaker (four wheels at the front of the arena):\n"
     "Coffinfiller: 2 of the 4 wheels light up, and a moment later the other 2\n"
     "When the cast ends, the first 2 to light fire line AoEs, and the other 2 fire straight after\n"
     "After that, Dead Wake: the Coffinmaker moves forward and covers the ground in front of it, so the arena shrinks; getting hit = KO",
     strict=False,
     refs=[FR("coffinmaker", 168, "Coffinfiller: ล้อ 2 อันที่เรืองแสงก่อน ยิง AoE แนวตรงก่อน แล้วอีก 2 อันยิงตามทันที",
              "Coffinfiller: the 2 wheels that light first fire their line AoEs first; the other 2 follow at once"),
           FR("dead-wake", 205, "Dead Wake: Coffinmaker เดินหน้า ไฟคลุมพื้นที่ด้านหน้า อยู่ในไฟ = KO",
              "Dead Wake: the Coffinmaker moves forward and covers the ground in front; standing in it = KO")])
step(P2, SS, "② Half Moon จากบอสนอกสนาม", "② Half Moon from the boss outside the arena",
     "ระหว่างร่าย Coffinfiller บอสที่อยู่นอกสนามเตรียม Half Moon (โจมตีครึ่งสนาม)\n"
     "Coffinfiller ร่ายจบ Half Moon ออกพร้อมกัน แล้ว Half Moon ออกอีกครั้งพร้อมล้อชุดที่ 2\n\n"
     "ตำแหน่งบอส (มองล้อเป็นทิศเหนือ):\n"
     "ชุดที่ 1: ฝั่งตะวันออก\n"
     "ชุดที่ 2: ฝั่งตะวันตก\n"
     "ชุดที่ 3: ด้านหลังสนาม",
     "While Coffinfiller is cast, the boss outside the arena readies Half Moon (a half-arena attack)\n"
     "When Coffinfiller ends, Half Moon goes off with it, and a second Half Moon follows with the second pair of wheels\n\n"
     "Where the boss is (with the wheels as north):\n"
     "Set 1: east side\n"
     "Set 2: west side\n"
     "Set 3: behind the arena",
     strict=False,
     refs=[FR("half-moon-side", 163, "Half Moon: บอสอยู่นอกสนาม ชุดแรกฝั่งตะวันออก ฟันครึ่งสนามพร้อม Coffinfiller",
              "Half Moon: the boss outside the arena, on the east for the first set, cleaving half the arena with Coffinfiller")])
step(P2, SS, "③ ทำลาย Coffinmaker ให้ทันใน 3 ชุด", "③ Destroy the Coffinmaker within 3 sets",
     "Coffinfiller > Dead Wake มาทั้งหมด 3 ชุด\n"
     "ต้องทำลาย Coffinmaker ให้ได้ก่อน Dead Wake ของชุดที่ 3 ออก ไม่ทันในชุดที่ 3 = wipe\n\n"
     "โดน AoE ตอน Coffinmaker เดินหน้า = KO แน่นอน\n"
     "Melee อย่าฝืนตีนานเกิน ให้รู้ว่าตีได้ถึงเมื่อไหร่ก่อนจะตาย\n"
     "ทำลายล้อได้เร็วในชุดที่ 3 Half Moon ของบอสก็ยังออกตามปกติ อย่าลืมหลบ",
     "Coffinfiller > Dead Wake comes 3 times\n"
     "Destroy the Coffinmaker before the third Dead Wake goes off; if it survives the third set = wipe\n\n"
     "Getting hit as the Coffinmaker moves forward = KO, every time\n"
     "Melee: don't push your luck; know the last moment you can keep hitting before it kills you\n"
     "Even if you destroy the wheels early in the third set, the boss's Half Moon still goes off: don't forget to dodge it",
     strict=False)
step(P2, "Half Moon", "Half Moon ขยายเมื่อโดน AoE ที่หลบได้", "Half Moon grows when people get hit",
     "ถ้าโดน AoE ที่หลบได้ของบอสหรือของ Coffinmaker ครบจำนวนหนึ่ง Half Moon ของบอสจะขยาย ที่ปลอดภัยแคบมาก\n"
     "(เหมือนตอนบอสได้พลังจากลูกแก้วในโหมด Normal)\n"
     "มักเกิดช่วงแรกๆ ที่ยังฝึก พยายามอย่าโดน",
     "Get hit by enough of the boss's or the Coffinmaker's avoidable AoEs and the boss's Half Moon grows, leaving a very narrow safe area\n"
     "(as when the boss is powered up by the orbs in Normal)\n"
     "It happens mostly early in progression: try not to get hit",
     strict=False,
     refs=[FR("half-moon-big", 702, "Half Moon ที่ขยายแล้ว: กินพื้นที่เกือบทั้งสนาม ที่ปลอดภัยแคบมาก",
              "An enlarged Half Moon: it covers almost the whole arena, leaving a very narrow safe area")])

# ------------------------------------------------------------------ middle part
AE_SAYS = {"MT": "ทิ้งที่ A แล้วกลับกลางสนาม", "D4": "ทิ้งที่ 1 แล้วกลับกลางสนาม", "D3": "ทิ้งที่ 4 แล้วกลับกลางสนาม",
           "H2": "ทิ้งที่ B แล้วกลับกลางสนาม", "H1": "ทิ้งที่ D แล้วกลับกลางสนาม", "D2": "ทิ้งที่ 2 แล้วกลับกลางสนาม",
           "D1": "ทิ้งที่ 3 แล้วกลับกลางสนาม", "ST": "ทิ้งที่ C แล้วกลับกลางสนาม"}
AE_SAYS_EN = {k: v.replace("ทิ้งที่ ", "Drop at ").replace(" แล้วกลับกลางสนาม", ", then back to the middle") for k, v in AE_SAYS.items()}
step(P3, "Aetherletting", "① ทิ้ง AoE ที่ Marker ของตัวเอง", "① Drop your AoE at your waymark",
     "บอสปล่อยกรวย (cone) ขึ้นทีละชุด และผู้เล่นแต่ละคนได้มาร์ก\n"
     "พอมาร์กหาย ตรงที่ยืนจะมี AoE แนวตรง 8 ทิศวางไว้ ระเบิดตามมาทีหลัง\n\n"
     "ได้มาร์กแล้ว หลบกรวยไปที่ Marker ของตัวเอง (จุดที่รอยต่อระหว่างกรวยชนขอบสนาม) ทิ้งมาร์ก แล้วทุกคนไปรอกลางสนาม\n"
     "ทุกคนทิ้งตรงจุดของตัวเองแบบนี้ AoE 8 ทิศจะไม่โดนกลางสนาม กลางปลอดภัยเสมอ\n\n"
     "จุดทิ้ง (ตามภาพ):\n"
     "MT: A / D4: 1\n"
     "D3: 4 / H2: B\n"
     "H1: D / D2: 2\n"
     "D1: 3 / ST: C",
     "The boss puts down cone telegraphs one after another, and every player gets a marker\n"
     "When your marker disappears, an 8-direction line AoE is left where you stand and goes off a little later\n\n"
     "Once marked, dodge the cones to your own waymark (where a gap between cones meets the edge), drop the marker there, then everyone waits in the middle\n"
     "With everyone dropping at their own spot, the 8-direction AoEs never reach the middle: it is always safe\n\n"
     "Drop spots (as in the picture):\n"
     "MT: A / D4: 1\n"
     "D3: 4 / H2: B\n"
     "H1: D / D2: 2\n"
     "D1: 3 / ST: C",
     strict=True, pic=13, scene=S.aetherletting(), says=AE_SAYS, says_en=AE_SAYS_EN,
     refs=[FR("aether-cones", 265, "Aetherletting: กรวยจากบอสขึ้นทีละชุด หลบกรวยไปทิ้งมาร์กที่ Marker ของตัวเองบนขอบสนาม",
              "Aetherletting: cones from the boss appear in turn; dodge them to drop your marker at your waymark on the edge")])
step(P3, "Aetherletting", "② ทิ้งแล้วรวมกลางสนาม", "② Drop, then gather in the middle",
     "game8 มีวิดีโอให้ดู: ไปที่จุดของตัวเอง ทิ้งมาร์ก แล้วรวมกันกลางสนาม\n"
     "เมื่อทุกคนทิ้งตรงจุด กลางสนามปลอดภัยเสมอ",
     "game8 shows a video of it: go to your spot, drop the marker, then gather in the middle\n"
     "With everyone dropping on their spot, the middle is always safe",
     strict=False,
     refs=[FR("aether-center", 285, "Aetherletting: ทิ้งมาร์กครบแล้วทุกคนรวมกลางสนาม กลางปลอดภัย",
              "Aetherletting: with every marker dropped, everyone gathers in the middle, which is safe")])

S2_SAYS = {"MT": "ฝั่งเหนือ: เหยียบ tower", "ST": "ฝั่งใต้: เหยียบ tower",
           "D1": "ฝั่งเหนือ: ทำลาย Fatal Flail (ลูกตุ้มหนาม)", "D2": "ฝั่งใต้: ทำลาย Fatal Flail (ลูกตุ้มหนาม)",
           "D3": "ฝั่งเหนือ: ทำลาย Deadly Doornail (เสาเหล็ก)", "D4": "ฝั่งใต้: ทำลาย Deadly Doornail (เสาเหล็ก)",
           "H1": "ฝั่งเหนือ: หลบใบเลื่อย เตรียม mitigate + heal รับ raid-wide",
           "H2": "ฝั่งใต้: หลบใบเลื่อย เตรียม mitigate + heal รับ raid-wide"}
S2_SAYS_EN = {"MT": "North half: take the towers", "ST": "South half: take the towers",
              "D1": "North half: break the Fatal Flail (spiked ball)", "D2": "South half: break the Fatal Flail (spiked ball)",
              "D3": "North half: break the Deadly Doornail (iron rod)", "D4": "South half: break the Deadly Doornail (iron rod)",
              "H1": "North half: dodge the saws; have mitigate + heals ready for the raid-wide",
              "H2": "South half: dodge the saws; have mitigate + heals ready for the raid-wide"}
step(P3, SS, "ครั้งที่ 2: เหนือกลุ่ม MT / ใต้กลุ่ม ST", "Second time: north MT group / south ST group",
     "แบ่งสนามเป็น 2 ฝั่ง:\n"
     "เหนือ = กลุ่ม MT (MT H1 D1 D3)\n"
     "ใต้ = กลุ่ม ST (ST H2 D2 D4)\n\n"
     "ในฝั่งของตัวเอง:\n"
     "Tank: เหยียบ tower\n"
     "Melee: ทำลาย Fatal Flail (ลูกตุ้มหนาม)\n"
     "Range: ทำลาย Deadly Doornail (เสาเหล็ก)\n\n"
     "ระวังใบเลื่อยในสนาม: ชนแล้วติดบาดแผล ถ้ารวมกับ raid-wide มักตาย\n"
     "Healer: หลบใบเลื่อย และจำไว้ว่าพอของที่ต้องทำลายขึ้นมา บอสจะใช้ raid-wide ตามมา เตรียม mitigate และ heal\n"
     "ถ้าไม่ถนัด ใช้ท่า heal แรงที่อยู่นาน เช่น Seraphism ของ SCH ก็ช่วยได้",
     "The arena is split in two:\n"
     "North = MT group (MT H1 D1 D3)\n"
     "South = ST group (ST H2 D2 D4)\n\n"
     "In your own half:\n"
     "Tank: take the towers\n"
     "Melee: break the Fatal Flail (spiked ball)\n"
     "Range: break the Deadly Doornail (iron rod)\n\n"
     "Watch the saws on the field: touching one leaves a wound, and a wound plus a raid-wide often kills\n"
     "Healer: dodge the saws, and remember that once the things to break appear, a raid-wide follows from the boss: have mitigate and heals ready\n"
     "If it gives you trouble, a long, strong heal such as SCH's Seraphism helps",
     strict=True, pic=14, scene=S.screech2(), says=S2_SAYS, says_en=S2_SAYS_EN,
     refs=[FR("screech2-towers", 372, "Sadistic Screech ครั้งที่ 2: tower (ลูกศรแดงชี้ลง) Tank เหยียบ tower ฝั่งกลุ่มตัวเอง",
              "Second Sadistic Screech: a tower (red arrow pointing down); the tank takes the towers in their own half"),
           FR("screech2-flail", 396, "Fatal Flail (ลูกตุ้มหนาม): Melee ทำลายลูกในฝั่งกลุ่มตัวเอง",
              "Fatal Flail (the spiked ball): melee break the one in their own half"),
           FR("screech2-doornail", 420, "Deadly Doornail (เสาเหล็ก): Range ทำลายเสาในฝั่งกลุ่มตัวเอง",
              "Deadly Doornail (the iron rod): range break the one in their own half")])

# ------------------------------------------------------------------ last part: Hell in a Cell
HC = "Hell in a Cell"
step(P4, HC, "ลำดับเข้า tower: จาก 12 นาฬิกาตามเข็ม", "Tower order: from 12 o'clock, clockwise",
     "tower ขึ้น 4 จุด อีก 4 คนที่เหลือโดน AoE จากบอส (แยกตาม role หรือ stack) มาทั้งหมด 2 ชุด\n"
     "กลุ่ม MT เข้า tower ชุดแรก กลุ่ม ST เข้าชุดหลัง\n\n"
     "ลำดับเข้า tower: จาก 12 นาฬิกาวนตามเข็ม Tank > Melee > Range > Healer\n"
     "Healer: จำง่ายๆ ว่าเป็น tower แรกเมื่อนับทวนเข็มจาก 11 นาฬิกา\n\n"
     "ภาพนี้: ตัวอย่างตอนกลุ่ม ST อยู่ใน tower",
     "4 towers appear and the other 4 players get AoEs from the boss (spread by role, or a stack); this comes twice\n"
     "The MT group takes the towers first, the ST group second\n\n"
     "Tower order: from 12 o'clock, clockwise, Tank > Melee > Range > Healer\n"
     "Healer: an easy way to remember it is the first tower counter-clockwise from 11 o'clock\n\n"
     "This picture: an example with the ST group in the towers",
     strict=["ST", "H2", "D2", "D4"], pic=15, scene=S.hc_order(),
     says={"MT": "Tank: tower แรกจาก 12 นาฬิกาตามเข็ม", "ST": "Tank: tower แรกจาก 12 นาฬิกาตามเข็ม",
           "D1": "Melee: tower ที่ 2 ตามเข็ม", "D2": "Melee: tower ที่ 2 ตามเข็ม",
           "D3": "Range: tower ที่ 3 ตามเข็ม", "D4": "Range: tower ที่ 3 ตามเข็ม",
           "H1": "Healer: tower ที่ 4 = tower แรกนับทวนเข็มจาก 11 นาฬิกา", "H2": "Healer: tower ที่ 4 = tower แรกนับทวนเข็มจาก 11 นาฬิกา"},
     says_en={"MT": "Tank: first tower clockwise from 12 o'clock", "ST": "Tank: first tower clockwise from 12 o'clock",
              "D1": "Melee: second tower clockwise", "D2": "Melee: second tower clockwise",
              "D3": "Range: third tower clockwise", "D4": "Range: third tower clockwise",
              "H1": "Healer: fourth tower = first counter-clockwise from 11 o'clock",
              "H2": "Healer: fourth tower = first counter-clockwise from 11 o'clock"},
     refs=[FR("cell-towers", 480, "Hell in a Cell: tower 4 จุดตกลงมา กลุ่ม MT เข้าก่อน กลุ่ม ST เข้าชุดหลัง",
              "Hell in a Cell: 4 towers come down; the MT group takes them first, the ST group second")])

TOWER_MT = {"MT": "tower แรก (จาก 12 นาฬิกาตามเข็ม)", "D1": "tower ที่ 2", "D3": "tower ที่ 3", "H1": "tower ที่ 4"}
TOWER_MT_EN = {"MT": "First tower (clockwise from 12 o'clock)", "D1": "Second tower", "D3": "Third tower", "H1": "Fourth tower"}
TOWER_ST = {"ST": "tower แรก (จาก 12 นาฬิกาตามเข็ม)", "D2": "tower ที่ 2", "D4": "tower ที่ 3", "H2": "tower ที่ 4"}
TOWER_ST_EN = {"ST": "First tower (clockwise from 12 o'clock)", "D2": "Second tower", "D4": "Third tower", "H2": "Fourth tower"}
step(P4, HC, "① กลุ่ม MT เข้า tower + Ultrasonic Spread", "① MT group in the towers + Ultrasonic Spread",
     "คนที่ไม่ได้อยู่ใน tower รับกรวย (cone) จากบอส ทิ้งกรวยให้ไม่โดนคนใน tower\n"
     "กรวยมี 2 แบบ:\n"
     "Ultrasonic Spread: แยกรับตาม role\n"
     "Ultrasonic Amp: stack รวมกัน\n\n"
     "กรวยที่ Tank ใหญ่กว่ากรวยอื่น ช่องว่างระหว่าง tower ที่กว้างที่สุดจึงเป็นของ Tank\n"
     "ทิ้งกรวย: เริ่มจากช่องที่กว้างที่สุด วนตามเข็ม Tank > DPS > Healer\n\n"
     "ภาพ: Ultrasonic Spread ขณะกลุ่ม MT อยู่ใน tower",
     "Whoever isn't in a tower takes the boss's cones, placed so they miss the tower players\n"
     "Two kinds of cone:\n"
     "Ultrasonic Spread: spread by role\n"
     "Ultrasonic Amp: one stack\n\n"
     "The cone on the tank is bigger than the others, so the widest gap between towers is the tank's\n"
     "Cones: from the widest gap, clockwise, Tank > DPS > Healer\n\n"
     "Picture: Ultrasonic Spread with the MT group in the towers",
     strict=True, pic=16, scene=S.hc1(),
     says={**TOWER_MT, "ST": "ทิ้งกรวยที่ช่องกว้างที่สุด", "D2": "ทิ้งกรวยช่องถัดไปตามเข็ม (DPS)",
           "D4": "ทิ้งกรวยช่องถัดไปตามเข็ม (DPS)", "H2": "ทิ้งกรวยช่องถัดจาก DPS ตามเข็ม (Healer)"},
     says_en={**TOWER_MT_EN, "ST": "Take your cone in the widest gap", "D2": "Cone in the next gap clockwise (DPS)",
              "D4": "Cone in the next gap clockwise (DPS)", "H2": "Cone in the gap after the DPS, clockwise (Healer)"},
     refs=[FR("cell-cones", 552, "Hell in a Cell: tower (วงหนาม) 4 จุด อีก 4 คนรับกรวยจากบอส (ภาพ: Ultrasonic Spread)",
              "Hell in a Cell: 4 towers (thorn rings), the other 4 take the boss's cones (picture: Ultrasonic Spread)")])
step(P4, HC, "② กลุ่ม MT เข้า tower + Ultrasonic Amp", "② MT group in the towers + Ultrasonic Amp",
     "Ultrasonic Amp: กลุ่ม ST stack รวมกันที่ช่องกว้างที่สุด รับกรวยด้วยกัน",
     "Ultrasonic Amp: the ST group stacks in the widest gap and takes the cone together",
     strict=True, pic=17, scene=S.hc2(),
     says={**TOWER_MT, "ST": "stack รวมกันที่ช่องกว้างที่สุด", "D2": "stack รวมกันที่ช่องกว้างที่สุด",
           "D4": "stack รวมกันที่ช่องกว้างที่สุด", "H2": "stack รวมกันที่ช่องกว้างที่สุด"},
     says_en={**TOWER_MT_EN, "ST": "Stack in the widest gap", "D2": "Stack in the widest gap",
              "D4": "Stack in the widest gap", "H2": "Stack in the widest gap"})
step(P4, HC, "③ กลุ่ม ST เข้า tower + Ultrasonic Spread", "③ ST group in the towers + Ultrasonic Spread",
     "ชุดที่ 2: กลุ่ม ST เข้า tower ตามลำดับเดิม (จาก 12 นาฬิกาตามเข็ม Tank > Melee > Range > Healer)\n"
     "กลุ่ม MT รับกรวย: เริ่มจากช่องที่กว้างที่สุด วนตามเข็ม Tank > DPS > Healer",
     "Second set: the ST group takes the towers in the same order (clockwise from 12 o'clock, Tank > Melee > Range > Healer)\n"
     "The MT group takes the cones: from the widest gap, clockwise, Tank > DPS > Healer",
     strict=True, pic=18, scene=S.hc3(),
     says={**TOWER_ST, "MT": "ทิ้งกรวยที่ช่องกว้างที่สุด", "D1": "ทิ้งกรวยช่องถัดไปตามเข็ม (DPS)",
           "D3": "ทิ้งกรวยช่องถัดไปตามเข็ม (DPS)", "H1": "ทิ้งกรวยช่องถัดจาก DPS ตามเข็ม (Healer)"},
     says_en={**TOWER_ST_EN, "MT": "Take your cone in the widest gap", "D1": "Cone in the next gap clockwise (DPS)",
              "D3": "Cone in the next gap clockwise (DPS)", "H1": "Cone in the gap after the DPS, clockwise (Healer)"})
step(P4, HC, "④ กลุ่ม ST เข้า tower + Ultrasonic Amp", "④ ST group in the towers + Ultrasonic Amp",
     "Ultrasonic Amp: กลุ่ม MT stack รวมกันที่ช่องกว้างที่สุด รับกรวยด้วยกัน\n\n"
     "กรวยที่ Tank เจ็บมาก Tank ใช้ mitigate ของตัวเองให้ดี\n"
     "คนที่เหยียบ tower เสร็จแล้ว โดนกรวยของบอสก็ไม่ KO",
     "Ultrasonic Amp: the MT group stacks in the widest gap and takes the cone together\n\n"
     "The tank's cone hurts a lot: tanks, use your own mitigate well\n"
     "Players who have finished their tower are not KO'd by the boss's cones",
     strict=True, pic=19, scene=S.hc4(),
     says={**TOWER_ST, "MT": "stack รวมกันที่ช่องกว้างที่สุด", "D1": "stack รวมกันที่ช่องกว้างที่สุด",
           "D3": "stack รวมกันที่ช่องกว้างที่สุด", "H1": "stack รวมกันที่ช่องกว้างที่สุด"},
     says_en={**TOWER_ST_EN, "MT": "Stack in the widest gap", "D1": "Stack in the widest gap",
              "D3": "Stack in the widest gap", "H1": "Stack in the widest gap"})

# ------------------------------------------------------------------ last part: Undead Deathmatch
UD = "Undead Deathmatch"
UD_MT, UD_ST = "เหยียบ tower ทางเหนือหรือตะวันตก (กลุ่ม MT)", "เหยียบ tower ทางใต้หรือตะวันออก (กลุ่ม ST)"
UD_MT_EN, UD_ST_EN = "Take the north or west tower (MT group)", "Take the south or east tower (ST group)"
step(P4, UD, "① tower: กลุ่ม MT เหนือ/ตะวันตก / กลุ่ม ST ใต้/ตะวันออก", "① Towers: MT group north/west / ST group south/east",
     "กลุ่ม MT (MT H1 D1 D3) เหยียบ tower ทางเหนือหรือตะวันตก\n"
     "กลุ่ม ST (ST H2 D2 D4) เหยียบ tower ทางใต้หรือตะวันออก\n\n"
     "จากนั้นตามค้างคาวไป อย่าให้สายยืดห่างเกิน พร้อมหลบกรวยของบอส\n"
     "Caster ก็ทำใกล้ๆ วงเป้าของบอส (target circle) ได้ อยู่ไกลต้องเดินมากขึ้น ตามค้างคาวยากขึ้น",
     "MT group (MT H1 D1 D3) takes the north or west tower\n"
     "ST group (ST H2 D2 D4) takes the south or east tower\n\n"
     "Then follow your bat without letting the tether stretch too far, while dodging the boss's cones\n"
     "Casters should stay near the boss's target circle too: from far away you have further to move and the bat is harder to follow",
     strict=False,
     says={"MT": UD_MT, "H1": UD_MT, "D1": UD_MT, "D3": UD_MT, "ST": UD_ST, "H2": UD_ST, "D2": UD_ST, "D4": UD_ST},
     says_en={"MT": UD_MT_EN, "H1": UD_MT_EN, "D1": UD_MT_EN, "D3": UD_MT_EN, "ST": UD_ST_EN, "H2": UD_ST_EN, "D2": UD_ST_EN, "D4": UD_ST_EN},
     refs=[FR("deathmatch-towers", 596, "Undead Deathmatch: tower stack 2 จุด กลุ่ม MT เหนือ/ตะวันตก กลุ่ม ST ใต้/ตะวันออก",
              "Undead Deathmatch: two stack towers; MT group north/west, ST group south/east")])
step(P4, UD, "② หลบกรวย: กลางกรวยที่เพิ่งออก = ที่ปลอดภัยถัดไป", "② The cones: the middle of the last one is the next safe spot",
     "ที่ปลอดภัยของกรวยลูกถัดไป คือตรงกลางของกรวยที่เพิ่งออก\n"
     "ลูกแรก: ยืนตรงที่ไม่มีกรวย พอกรวยออก ย้ายเข้าไปในที่ที่กรวยเพิ่งออก เพื่อหลบลูกถัดไป\n"
     "ชุดละ 5 ครั้ง\n\n"
     "เดินแบบ \"ช่องข้างๆ > ข้ามไป 2 ช่อง\" 2 รอบ จะทำได้ง่าย",
     "The next cone's safe spot is the middle of the cone that just went off\n"
     "First cone: stand where there is no cone; when it goes off, step into where it went off to dodge the next one\n"
     "5 cones a set\n\n"
     "Moving \"next gap > two gaps over\" twice makes it easy",
     strict=False,
     refs=[FR("deathmatch-cones", 612, "Undead Deathmatch: กรวยรอบตัวบอส ชุดละ 5 ครั้ง ตามค้างคาวไปโดยไม่ให้สายยืดเกิน",
              "Undead Deathmatch: cones all round the boss, 5 a set; follow your bat without overstretching the tether")])
step(P4, UD, "③ AoE จากค้างคาว: วงกลม หรือ donut", "③ The bat's AoE: circle or donut",
     "ตอนบอสปล่อยกรวยลูกที่ 4 ค้างคาวจะมีมาร์กขึ้น: วงกลม หรือ donut\n"
     "หลังกรวยลูกที่ 5 ออก ค้างคาวระเบิด AoE ตามมาร์ก\n\n"
     "วงกลม: ขยับเข้าหาบอสเพื่อหลบ\n"
     "donut: เข้าไปใต้ค้างคาว",
     "As the boss shows the 4th cone, the bats get a marker: a circle or a donut\n"
     "After the 5th cone goes off, each bat sets off the AoE its marker shows\n\n"
     "Circle: move in towards the boss to dodge it\n"
     "Donut: get under the bat",
     strict=False,
     refs=[FR("deathmatch-marker", 642, "Undead Deathmatch: มาร์กบนค้างคาว (วงกลม หรือ donut) ขึ้นตอนกรวยลูกที่ 4 ระเบิดหลังลูกที่ 5",
              "Undead Deathmatch: the marker on a bat (circle or donut) appears with the 4th cone and goes off after the 5th")])
step(P4, UD, "④ สายค้างคาวยืดได้แค่ไหน", "④ How far the bat's tether stretches",
     "สายจากค้างคาวยืดได้ถึงระยะหนึ่ง (game8 มีภาพระยะสุดท้าย)\n"
     "ยืดถึงระยะนั้นจะโดน damage และติด damage down (ดาเมจที่ทำได้ลดลง)",
     "The bat's tether only stretches so far (game8 shows the limit in a picture)\n"
     "Stretch it that far and you take damage and get damage down (you deal less damage)",
     strict=False)

# ------------------------------------------------------------------ last part: the end
step(P4, "Sanguine Scratch", "หลบกรวยสลับไปมา ไม่มีสาย", "Dodge the cones back and forth, no tethers",
     "เหมือนกรวยใน Undead Deathmatch แต่ไม่มีสายจากค้างคาวมาจำกัดการเดิน\n"
     "แค่ขยับสลับไปมาหลบกรวยอย่างเดียว",
     "Like the cones in Undead Deathmatch, but with no bat tethers to limit where you go\n"
     "Just move back and forth to dodge them",
     strict=False,
     refs=[FR("sanguine", 720, "Sanguine Scratch: กรวยรอบตัวบอส ไม่มีสาย หลบสลับไปมาอย่างเดียว",
              "Sanguine Scratch: cones all round the boss with no tethers; just dodge back and forth")])
step(P4, "Enrage", "หมดเวลา", "Time's up",
     "หลัง Sanguine Scratch บอสใช้ raid-wide อีก 2 ครั้ง แล้วหมดเวลา (enrage)\n"
     "ไฟต์นี้ DPS check ไม่เข้มงวด ฝึกซ้ำๆ ลดการตายและการติด damage down ที่ทำให้ดาเมจหาย",
     "After Sanguine Scratch the boss uses 2 more raid-wides, then time is up (enrage)\n"
     "The DPS check is lenient: keep practising to cut the deaths and damage downs that lose you damage",
     strict=False,
     refs=[FR("enrage", 768, "หมดเวลา (enrage): บอสร่าย Finale Fatale หลัง Sanguine Scratch และ raid-wide 2 ครั้ง",
              "Time's up (enrage): the boss casts Finale Fatale after Sanguine Scratch and 2 raid-wides")])

# ------------------------------------------------------------------ rewards
book = ITEMS["AAC Illustrated: HW Edition I"]
coffers = [("Grand Champion's Earring Coffer (IL 790)", "Earring"), ("Grand Champion's Necklace Coffer (IL 790)", "Necklace"),
           ("Grand Champion's Bracelet Coffer (IL 790)", "Bracelet"), ("Grand Champion's Ring Coffer (IL 790)", "Ring")]
acc = []
for kind in ("Fending", "Slaying", "Aiming", "Healing", "Casting"):
    for slot in ("Ear Cuff", "Neckband", "Bracelets", "Ring"):
        n = f"Grand Champion's {slot} of {kind}"
        acc.append({"name": n, "job": kind, "icon_src": ICON(ITEMS[n]["icon"])})
HHIHWI = {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.4, "label": "Hhihwi"}
rewards = [
    {"kind": "token", "name": "AAC Illustrated: HW Edition I", "icon_src": ICON(book["icon"]),
     "say": "ได้ 1 เล่มเมื่อเคลียร์ (การันตี)\n\n"
            "แลกที่ Hhihwi (Arcadion Relic Exchange) ใน Solution Nine (X: 8.7 Y: 13.4)\n"
            "เครื่องประดับ Grand Champion's IL790: 3 เล่ม ต่อ 1 ชิ้น\n"
            "AAC Illustrated: HW Edition IV 1 เล่ม แลกเป็นเล่มนี้ได้ 1 เล่ม",
     "say_en": "Every clear gives 1 (guaranteed)\n\n"
               "Exchange them with Hhihwi (Arcadion Relic Exchange) in Solution Nine (X: 8.7 Y: 13.4)\n"
               "Grand Champion's IL790 accessory: 3 per piece\n"
               "One AAC Illustrated: HW Edition IV can be traded for one of these",
     "pics": [{"map": HHIHWI, "say": "จุดแลก: Hhihwi ใน Solution Nine (X: 8.7 Y: 13.4)",
               "say_en": "Where to exchange: Hhihwi in Solution Nine (X: 8.7 Y: 13.4)"}]},
    {"kind": "accessory", "name": "Grand Champion's accessory coffers", "ilvl": 790,
     "icon_src": ICON(ITEMS[coffers[0][0]]["icon"]),
     "say": "หีบสมบัติหลังเคลียร์มี Coffer อย่างละ 1 ใบ: Earring / Necklace / Bracelet / Ring\n"
            "เปิดแล้วได้เครื่องประดับ IL790 ตามอาชีพที่ใส่อยู่ตอนเปิด (เปิดในดันเจี้ยนไม่ได้)",
     "say_en": "The treasure coffer holds one of each: Earring / Necklace / Bracelet / Ring coffer\n"
               "Opening one gives the IL790 accessory for the job you are on at the time (they can't be opened inside duties)",
     "pieces": [{"name": n, "job": j, "icon_src": ICON(ITEMS[n]["icon"])} for n, j in coffers]},
    {"kind": "accessory", "name": "Grand Champion's accessories", "ilvl": 790,
     "icon_src": ICON(ITEMS["Grand Champion's Ring of Fending"]["icon"]),
     "say": "แลกด้วย AAC Illustrated: HW Edition I 3 เล่ม ต่อ 1 ชิ้น หรือได้จาก Coffer ด้านบน\n"
            "Fending: PLD WAR DRK GNB\n"
            "Slaying: MNK DRG SAM RPR BST\n"
            "Aiming: BRD NIN MCH DNC VPR\n"
            "Healing: WHM SCH AST SGE\n"
            "Casting: BLM SMN RDM PCT\n"
            "แตะไอคอนเพื่อดูชื่อ",
     "say_en": "3 AAC Illustrated: HW Edition I per piece, or from the coffers above\n"
               "Fending: PLD WAR DRK GNB\n"
               "Slaying: MNK DRG SAM RPR BST\n"
               "Aiming: BRD NIN MCH DNC VPR\n"
               "Healing: WHM SCH AST SGE\n"
               "Casting: BLM SMN RDM PCT\n"
               "Tap an icon for its name",
     "pieces": acc},
]

# ------------------------------------------------------------------ the guide
guide = {
    "slug": "m9s", "short": "M9S", "sort": 1,
    "name": "Vamp Fatale · AAC Heavyweight M1 (Savage)",
    "category": "savage", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/754895",
    "content_key": "sav:M9S",
    "note": "แผนตาม game8 (แผนของ Nukemaru)\n"
            "Hell in a Cell: นับ tower จากทิศเหนือ วนตามเข็ม\n"
            "Marker ตามภาพของ game8 (ดูขั้นแรก)\n\n"
            "กลุ่ม 4:4\n"
            "กลุ่ม MT: MT H1 D1 D3\n"
            "กลุ่ม ST: ST H2 D2 D4\n\n"
            "Hell in a Cell: กลุ่ม MT เข้า tower ก่อน / กลุ่ม ST ทีหลัง\n"
            "ลำดับ tower (จาก 12 นาฬิกาตามเข็ม): Tank > Melee > Range > Healer\n"
            "Undead Deathmatch: กลุ่ม MT tower เหนือ/ตะวันตก / กลุ่ม ST tower ใต้/ตะวันออก",
    "en": {"note": "Plan follows game8 (Nukemaru's strat)\n"
                   "Hell in a Cell: towers counted from north, clockwise\n"
                   "Waymarks as game8 draws them (see the first step)\n\n"
                   "4:4 groups\n"
                   "MT group: MT H1 D1 D3\n"
                   "ST group: ST H2 D2 D4\n\n"
                   "Hell in a Cell: MT group takes the towers first / ST group second\n"
                   "Tower order (from 12 o'clock, clockwise): Tank > Melee > Range > Healer\n"
                   "Undead Deathmatch: MT group north/west tower / ST group south/east tower"},
    "req": {"level": 100, "ilvl": 760, "party": 8, "minutes": 90,
            "unlock": "รับเควสต์ปลดล็อก Savage ได้จาก NPC Gabbro ใน Solution Nine (X: 22.3 Y: 17.1)\n"
                      "Savage ของ Arcadion ทุกรุ่น (Light-heavyweight / Cruiserweight / Heavyweight) รับจาก NPC คนนี้",
            "unlock_en": "Accept the Savage unlock from Gabbro in Solution Nine (X: 22.3 Y: 17.1)\n"
                         "Every Arcadion Savage tier (Light-heavyweight / Cruiserweight / Heavyweight) is unlocked from this NPC",
            "unlock_pics": [{"map": {"map": "x6t1/00", "size": 180, "x": 22.3, "y": 17.1, "label": "Gabbro"},
                             "say": "Solution Nine (X: 22.3 Y: 17.1) — Gabbro",
                             "say_en": "Solution Nine (X: 22.3 Y: 17.1) — Gabbro"}]},
    "macro_en": MACRO_EN, "macro_ja": MACRO_JA,
    "xref_name": "xivjpraids.com", "xref_url": "https://xivjpraids.com/7.0_dawntrail/savage_raids/m9s/",
}
defaults = {"frame": [4, 3], "bg": "#5f6166", "arena": {"shape": "circle", "at": [50, 50], "r": 34.6, "fill": "#b8babe", "lines": False},
            "waymarks": {}, "iconSize": 5.6, "markSize": 4.6, "bossSize": 8, "ring": 5.2}
data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "pictures", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
