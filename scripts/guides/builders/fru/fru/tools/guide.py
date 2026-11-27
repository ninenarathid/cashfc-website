"""The guide's header, requirements, macros and rewards (game8 ff14/300909 + XIVAPI v2)."""
import json

DL = "scripts/guides/.work/fru/dl"
IDX = json.load(open(DL + "/index-macros.json", encoding="utf-8"))
P3M = json.load(open(DL + "/p3-macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path=ui/icon/{p}_hr1.tex&format=png"

# The page's macros: the two everyone carries (index page), then one per Ultimate Relativity debuff (P3 page).
# The two /echo tables on the P3 page draw their rules with full-width Japanese characters and are left out.
MACRO_EN = "\n\n".join([IDX[2], IDX[3]] + P3M[4:10])
MACRO_JA = IDX[0]   # the Japanese PF line the page summarises the strat with

NOTE = ("แผน Mana DC PF ตามที่ Tuufless เขียนไว้ (Tuufless ไม่มีหน้าแยกของ Elemental สำหรับ FRU)\n"
        "P1–P3: แผน Lily Doll / P4–P5: แผน Nukemaru\n\n"
        "ตัวย่อของแผน (บรรทัดภาษาญี่ปุ่นในช่อง macro):\n"
        "Apocalypse: ยึดแสงคู่แรกของ Apocalypse (ไม่ใช่จุดปลอดภัย)\n"
        "Darklit Dragonsong: stack น้ำปรับก่อนกรวยของ Usurper of Frost\n"
        "Crystallize Time: Blizzard แดงวิ่งขึ้นเหนือหลังชนหัวมังกร\n"
        "Crystallize Time: บันทึกตำแหน่งรูป Y + Arm's Length\n"
        "Akh Morn: 7:1 (Tank รับคนเดียว)\n\n"
        "Marker 8 ทิศ (ดูขั้นแรก)\n"
        "มาร์กเหนือหัวด้วย macro: Attack (ทุกคน) / Bind (Tank, Healer)\n\n"
        "ลำดับหลัก (ตะวันตก/เหนือ ก่อน): H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
        "กลุ่ม 4:4: MT H1 D1 D3 / ST H2 D2 D4\n"
        "invuln: Powder Mark Trail ครั้งที่ 2 และ Darkest Dance: PLD > ST / Somber Dance: MT (MT เป็น PLD ให้ ST)")
NOTE_EN = ("The Mana DC PF strat as Tuufless writes it (Tuufless has no separate Elemental page for FRU)\n"
           "P1–P3: Lily Doll / P4–P5: Nukemaru\n\n"
           "The strat's shorthand (the Japanese line in the macro box):\n"
           "Apocalypse: relative to the first pair of Apocalypse lights (not the safe spots)\n"
           "Darklit Dragonsong: the water stacks adjust before the Usurper of Frost's fan\n"
           "Crystallize Time: the red Blizzards rush north after popping their dragon heads\n"
           "Crystallize Time: the Y-shape record + Arm's Length\n"
           "Akh Morn: 7:1 (a tank takes it alone)\n\n"
           "8 waymarks (see the first step)\n"
           "Overhead markers by macro: Attack (everyone) / Bind (tanks, healers)\n\n"
           "Main priority (west/north first): H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
           "4:4 groups: MT H1 D1 D3 / ST H2 D2 D4\n"
           "Invulns: second Powder Mark Trail and Darkest Dance: PLD > ST / Somber Dance: MT (ST if the MT is a PLD)")

WEAPONS = [("Ultimate Edenmorn Bastard Sword", "PLD", "030000/030687"), ("Ultimate Edenmorn Scutum", "PLD", "030000/030277"),
           ("Ultimate Edenmorn Battleaxe", "WAR", "031000/031261"), ("Ultimate Edenmorn Zweihander", "DRK", "034000/034016"),
           ("Ultimate Edenmorn Gunblade", "GNB", "036000/036107"), ("Ultimate Edenmorn Cane", "WHM", "032000/032481"),
           ("Ultimate Edenmorn Codex", "SCH", "037000/037824"), ("Ultimate Edenmorn Torquetum", "AST", "034000/034709"),
           ("Ultimate Edenmorn Pendulums", "SGE", "037000/037073"), ("Ultimate Edenmorn Sainti", "MNK", "030000/030851"),
           ("Ultimate Edenmorn Halberd", "DRG", "031000/031663"), ("Ultimate Edenmorn Main Gauches", "NIN", "033000/033637"),
           ("Ultimate Edenmorn Samurai Blade", "SAM", "036000/036565"), ("Ultimate Edenmorn Sickle", "RPR", "037000/037276"),
           ("Ultimate Edenmorn Twinfangs", "VPR", "037000/037440"), ("Ultimate Edenmorn Cavalry Bow", "BRD", "032000/032051"),
           ("Ultimate Edenmorn Pistol", "MCH", "034000/034510"), ("Ultimate Edenmorn Chakrams", "DNC", "036000/036306"),
           ("Ultimate Edenmorn Rod", "BLM", "032000/032896"), ("Ultimate Edenmorn Index", "SMN", "037000/037825"),
           ("Ultimate Edenmorn Rapier", "RDM", "036000/036864"), ("Ultimate Edenmorn Round Brush", "PCT", "037000/037650")]
pieces = [{"name": n, "job": j, "icon_src": ICON(p)} for n, j, p in WEAPONS]
UAH = {"map": {"map": "x6t1/00", "size": 180, "x": 8.7, "y": 13.5, "label": "Uah'shepya"},
       "say": "จุดแลก: Uah'shepya ใน Solution Nine (X: 8.7 Y: 13.5)",
       "say_en": "Where to exchange: Uah'shepya in Solution Nine (X: 8.7 Y: 13.5)"}

rewards = [
    {"kind": "token", "name": "Oracle Totem", "icon_src": ICON("026000/026670"),
     "say": "ของรางวัลจากการเคลียร์ ใช้แลกอาวุธ\n\nแลกที่ Uah'shepya ใน Solution Nine (X: 8.7 Y: 13.5)\n"
            "1 ชิ้น ต่ออาวุธ 1 ชิ้น (Paladin ได้ดาบ + โล่)",
     "say_en": "A clear reward, traded for weapons\n\nExchange it with Uah'shepya in Solution Nine (X: 8.7 Y: 13.5)\n"
               "1 per weapon (a Paladin gets sword + shield)",
     "pics": [UAH]},
    {"kind": "weapon", "name": "Ultimate Edenmorn Weapons", "ilvl": 735, "icon_src": ICON("030000/030687"),
     "say": "อาวุธ IL735 ครบทุกอาชีพ แลกด้วย Oracle Totem 1 ชิ้นต่ออาวุธ 1 ชิ้น\nแตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "IL735 weapons for every job, 1 Oracle Totem each\nTap an icon for the weapon's name",
     "pieces": pieces},
]

guide = {
    "slug": "fru", "short": "FRU",
    "name": "Futures Rewritten (Ultimate)",
    "category": "ultimate", "expansion": "Dawntrail", "patch": "7.11",
    "source_name": "Tuufless's Notes (Mana PF)", "source_url": "https://ffxiv.tuufless.com/mana/fru/",
    "content_key": "ult:Futures Rewritten",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 100, "ilvl": 735, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ AAC Light-heavyweight M4 (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Tuliyollal (X: 11.1 Y: 14.6) เพื่อปลดล็อก\n"
                      "ต้องเป็นอาชีพสายต่อสู้หรือเวท Lv100\n"
                      "ในดันเจี้ยน level sync 100 และ item level sync 735",
            "unlock_en": "Clear AAC Light-heavyweight M4 (Savage) first\n"
                         "then talk to the Wandering Minstrel in Tuliyollal (X: 11.1 Y: 14.6) to unlock it\n"
                         "A level 100 Disciple of War or Magic\n"
                         "Inside, level is synced to 100 and item level to 735",
            "unlock_pics": [{"map": {"map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel"},
                             "say": "Tuliyollal (X: 11.1 Y: 14.6) — Wandering Minstrel",
                             "say_en": "Tuliyollal (X: 11.1 Y: 14.6) — the Wandering Minstrel"}]},
    "macro_en": MACRO_EN, "macro_ja": MACRO_JA,
    "xref_name": "Tuufless's Notes (Mana PF)", "xref_url": "https://ffxiv.tuufless.com/mana/fru/",
}

defaults = {"frame": [1, 1], "bg": "#f3f3f3", "waymarks": {}, "iconSize": 6, "markSize": 6.5, "bossSize": 10, "ring": 5.2}
