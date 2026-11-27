"""Builds scripts/guides/data/top.json: The Omega Protocol (Ultimate), Elemental DC PF's plan from Tuufless's Notes.
Run from the repo root: python3 scripts/guides/builders/top/top/tools/gen_top.py [norefs] [allowmissing]"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core
from core import steps
import ph1, ph2, ph3, ph4, ph5, ph6  # noqa: F401  (each adds its steps in the source's order)

OUT = "scripts/guides/data/top.json"
WORK = "scripts/guides/.work/top/dl"
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"


def macro(f):
    t = open(os.path.join(WORK, f), encoding="utf-8").read().strip()
    if t.startswith("```"):
        t = t[3:]
    if t.endswith("```"):
        t = t[:-3]
    return t.strip("\n")


NOTE = ("แผน PF ของ Elemental DC ตาม Tuufless's Notes (ดูขั้น 'แผนของ Elemental PF ทีละเฟส')\n"
        "Marker: A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก / 1 ตอ.เฉียงเหนือ / 2 ตอ.เฉียงใต้ / 3 ตก.เฉียงใต้ / 4 ตก.เฉียงเหนือ (ดูขั้นแรก)\n\n"
        "ลำดับหลัก (ใช้ทั้งไฟต์): H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n"
        "P1 tower / สาย: เริ่ม ตก.เฉียงเหนือ วนตามเข็ม / Pantokrator: ตก.เฉียงเหนือ ก่อน ตอ.เฉียงใต้\n"
        "P2 Party Synergy: กลุ่ม 4:4 จากเหนือลงใต้ Healer > Tank > Melee > Range / สัญลักษณ์ วงกลม > กากบาท > สามเหลี่ยม > สี่เหลี่ยม\n"
        "P3 Transition: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 / Oversampled Wave Cannon: H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
        "P4: จากเหนือลงใต้ Tank > Range > Healer > Melee\n"
        "P5 Sigma Hello, World: ไปหา Omega-F ตามลำดับ H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n\n"
        "LB3: P4 Melee NIN > DRG > MNK > VPR > RPR > SAM / P6 Tank WAR > PLD > DRK > GNB\n"
        "P6 Magic Number: Tank DRK > MT > ST / Healer H1 > H2")
NOTE_EN = ("Elemental DC's PF plan as Tuufless's Notes lays it out (see 'Elemental PF's plan, phase by phase')\n"
           "Waymarks: A north / B east / C south / D west / 1 NE / 2 SE / 3 SW / 4 NW (see the first step)\n\n"
           "The main priority (all fight): H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n"
           "P1 towers / tethers: from north-west, clockwise / Pantokrator: north-west before south-east\n"
           "P2 Party Synergy: 4:4, north to south Healer > Tank > Melee > Range / symbols circle > cross > triangle > square\n"
           "P3 transition: H1 > MT > ST > D1 > D2 > D3 > D4 > H2 / Oversampled Wave Cannon: H1 > H2 > MT > ST > D1 > D2 > D3 > D4\n"
           "P4: north to south Tank > Range > Healer > Melee\n"
           "P5 Sigma Hello, World: to Omega-F by H1 > MT > ST > D1 > D2 > D3 > D4 > H2\n\n"
           "LB3: P4 melee NIN > DRG > MNK > VPR > RPR > SAM / P6 tank WAR > PLD > DRK > GNB\n"
           "P6 Magic Number: tanks DRK > MT > ST / healers H1 > H2")

WEAPONS = [("Ultimate Omega Sword", "PLD", "030000/030663"), ("Ultimate Omega Shield", "PLD", "030000/030253"),
           ("Ultimate Omega Battleaxe", "WAR", "031000/031237"), ("Ultimate Omega Claymore", "DRK", "034000/034391"),
           ("Ultimate Omega Bayonet", "GNB", "036000/036084"), ("Ultimate Omega Cane", "WHM", "032000/032457"),
           ("Ultimate Omega Codex", "SCH", "033000/033379"), ("Ultimate Omega Torquetum", "AST", "034000/034985"),
           ("Ultimate Omega Wings", "SGE", "037000/037049"), ("Ultimate Omega Knuckles", "MNK", "030000/030828"),
           ("Ultimate Omega Trident", "DRG", "031000/031639"), ("Ultimate Omega Sickles", "NIN", "033000/033614"),
           ("Ultimate Omega Samurai Blade", "SAM", "036000/036542"), ("Ultimate Omega Zaghnal", "RPR", "037000/037251"),
           ("Ultimate Omega Twinfangs", "VPR", "037000/037412"), ("Ultimate Omega Bow", "BRD", "032000/032028"),
           ("Ultimate Omegafire", "MCH", "034000/034487"), ("Ultimate Omega Chakrams", "DNC", "036000/036283"),
           ("Ultimate Omega Rod", "BLM", "032000/032872"), ("Ultimate Omega Grimoire", "SMN", "033000/033380"),
           ("Ultimate Omega Smallsword", "RDM", "036000/036841"), ("Ultimate Omega Round Brush", "PCT", "037000/037615")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]
NESVAAZ = {"map": {"map": "m5t1/00", "size": 200, "x": 10.6, "y": 10.0, "label": "Nesvaaz"},
           "say": "จุดแลก: Nesvaaz ใน Radz-at-Han (X: 10.6 Y: 10.0)",
           "say_en": "Where to exchange: Nesvaaz in Radz-at-Han (X: 10.6 Y: 10.0)"}

rewards = [
    {"kind": "token", "name": "Omega Totem", "icon_src": ICON("ui/icon/026000/026639_hr1.tex"),
     "say": "โทเค็นของไฟต์นี้ ใช้แลกอาวุธ\n\n"
            "แลกที่ Nesvaaz ใน Radz-at-Han (X: 10.6 Y: 10.0)\n"
            "อาวุธ IL635: 1 ชิ้น ต่ออาวุธ 1 ชิ้น (Paladin ได้ดาบ + โล่)",
     "say_en": "This fight's token, traded for the weapons\n\n"
               "Exchange it with Nesvaaz in Radz-at-Han (X: 10.6 Y: 10.0)\n"
               "IL635 weapon: 1 per weapon (a Paladin gets sword + shield)",
     "pics": [NESVAAZ]},
    {"kind": "weapon", "name": "Ultimate Omega Weapons", "ilvl": 635, "icon_src": ICON("ui/icon/030000/030663_hr1.tex"),
     "say": "อาวุธ IL635 แลกด้วย Omega Totem 1 ชิ้น ต่ออาวุธ 1 ชิ้น\n"
            "ชักอาวุธออกมาสักพัก เอฟเฟกต์จะเปลี่ยนจากสีขาวเป็นสีม่วงอยู่ไม่กี่วินาที\n"
            "มีครบทุกอาชีพ แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "IL635 weapons, 1 Omega Totem each\n"
               "Draw it for a while and its glow turns from white to purple for a few seconds\n"
               "One for every job; tap an icon for the weapon's name",
     "pieces": pieces},
]

guide = {
    "slug": "top", "short": "TOP", "sort": 0,
    "name": "The Omega Protocol (Ultimate)",
    "category": "ultimate", "expansion": "Endwalker", "patch": "6.31",
    "source_name": "Tuufless's Notes (Elemental PF)", "source_url": "https://ffxiv.tuufless.com/elemental/top/",
    "content_key": "ult:The Omega Protocol",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 90, "ilvl": 635, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ Abyssos: The Eighth Circle (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Old Sharlayan (X: 12.7 Y: 14.2) เพื่อปลดล็อก\n"
                      "รับได้ที่ Lv 90 / เข้า duty ถูกปรับเป็น Lv 90 และ IL635",
            "unlock_en": "Clear Abyssos: The Eighth Circle (Savage) first\n"
                         "then talk to the Wandering Minstrel in Old Sharlayan (X: 12.7 Y: 14.2) to unlock it\n"
                         "Available at Lv 90 / the duty syncs you to Lv 90 and IL635",
            "unlock_pics": [{"map": {"map": "k5t1/00", "size": 200, "x": 12.7, "y": 14.2, "label": "Wandering Minstrel"},
                             "say": "Old Sharlayan (X: 12.7 Y: 14.2) — Wandering Minstrel",
                             "say_en": "Old Sharlayan (X: 12.7 Y: 14.2) — the Wandering Minstrel"}]},
    "macro_en": macro("top.en.md"), "macro_ja": macro("top.jp.md"),
    "xref_name": "Tuufless's Notes (Elemental PF)", "xref_url": "https://ffxiv.tuufless.com/elemental/top/",
}

defaults = {"frame": [1, 1], "bg": "#eef0f3", "arena": {"shape": "circle", "at": [50, 50], "r": 47.5, "fill": "#22324a", "lines": False},
            "waymarks": {}, "iconSize": 6, "markSize": 5.2, "bossSize": 9, "ring": 5.5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
