"""Builds scripts/guides/data/dsr.json: Dragonsong's Reprise (Ultimate), Tuufless's Notes (Elemental DC PF).
Run from the repo root: python3 scripts/guides/builders/dsr/dsr/tools/gen.py [allowmissing] [norefs]"""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import core

core.VIDS.update({
    "II-N13_CG_g": "Hamukatsu", "biN5YkjijIs": "Hamukatsu", "GK96pk2c1Nc": "Hamukatsu", "JQr73hyralc": "Hamukatsu",
    "dbN5wpqMuLQ": "Hamukatsu", "jwEHtHYDgp0": "Hamukatsu", "obcSv6lApD4": "Hamukatsu", "gSS91H4wYiE": "Hamukatsu",
    "wl89c94CE0Y": "Hamukatsu", "pRkdxw9YOLo": "Hamukatsu", "ELUNLCyfC1g": "Hamukatsu",
    "JN7sg1lOgtE": "Nukemaru", "3M8dUee9b8Q": "Nukemaru", "1fsbzkZsWUE": "Nukemaru", "3yJpWHmKjpg": "Nukemaru",
    "Fbb3L-aPJ3A": "Nukemaru", "GU918hNeju8": "Hamukatsu",
})

import g1  # noqa: E402,F401
for m in ("g2", "g3", "g4", "g5", "g6", "g7"):
    if os.path.exists(os.path.join(HERE, m + ".py")):
        __import__(m)

ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
MAC = os.path.join(core.WT, "scripts/guides/.work/dsr/repo/_elemental/dsr/macros")


def macro(name):
    t = open(os.path.join(MAC, name), encoding="utf-8").read()
    t = t.strip()
    assert t.startswith("```") and t.endswith("```"), name
    return t[3:-3].strip("\n")


MACRO_EN = macro("dsr_1.en.md") + "\n\n" + macro("dsr_2.en.md")
MACRO_JA = macro("dsr_1.jp.md") + "\n\n" + macro("dsr_2.jp.md")

NOTE = ("แผนตาม Tuufless's Notes (Elemental DC PF)\n"
        "P1: HMRT / P2: DRK-relative + role adjust / P3: Easthogg / P4: T·H สายแดง DPS สายน้ำเงิน / "
        "P5: 2-2 Dooms North + Anchored Dooms / P6: WB1 สามเหลี่ยม, Mortal Vow แบบ DTTMR, WB2 แบบ 5-1 / P7: 3-3-2 ทุกครั้ง\n\n"
        "Marker 2 ชุด: ชุดที่ 1 เฉพาะ P1 / ชุดที่ 2 (inner markers) ตั้งแต่ P2 (ดูขั้นแรกของ P1 และ P2)\n"
        "macro 2 อัน: P1 / P2–P7 (ดูช่อง macro)\n\n"
        "กลุ่ม 4:4\n"
        "กลุ่ม 1: MT H1 D1 D3\n"
        "กลุ่ม 2: ST H2 D2 D4\n\n"
        "คู่ (Meteors / 4x Towers): MT·D3 / H1·D1 / H2·D2 / ST·D4\n"
        "Mortal Vow (DTTMR): DPS > MT > ST > D1 (หรือ D2) > D3\n"
        "Akh Morn's Edge 3-3-2: H1 D1 D3 / H2 D2 D4 / MT ST\n\n"
        "PF ใช้ automarker มาร์กคนโดนสายฟ้าใน Wrath of the Heavens และ Wroth Flames เป็นเรื่องปกติ (ใช้ด้วยความเสี่ยงของตัวเอง)\n"
        "Damage Down ในไฟต์นี้: ดาเมจที่ทำได้เหลือครึ่งเดียว (−50%)\n"
        "gear iLv 730 ขึ้นไป substat ตันหมด / อาวุธ relic substat ตันที่ 269 / ใช้อาหารและ potion ระดับสูงสุด")
NOTE_EN = ("Plan follows Tuufless's Notes (Elemental DC PF)\n"
           "P1: HMRT / P2: DRK-relative, role adjust / P3: Easthogg / P4: T/H red, DPS blue / "
           "P5: 2-2 Dooms North, Anchored Dooms / P6: triangle WB1, DTTMR Mortal Vow, 5-1 WB2 / P7: all 3-3-2\n\n"
           "Two waymark sets: set 1 for P1 only / set 2 (inner markers) from P2 on (see the first steps of P1 and P2)\n"
           "Two macros: P1 / P2–P7 (see the macro box)\n\n"
           "4:4 groups\n"
           "Group 1: MT H1 D1 D3\n"
           "Group 2: ST H2 D2 D4\n\n"
           "Pairs (Meteors / 4x Towers): MT·D3 / H1·D1 / H2·D2 / ST·D4\n"
           "Mortal Vow (DTTMR): DPS > MT > ST > D1 (or D2) > D3\n"
           "Akh Morn's Edge 3-3-2: H1 D1 D3 / H2 D2 D4 / MT ST\n\n"
           "Automarkers for the Thunder players in Wrath of the Heavens and especially Wroth Flames are the norm in PF (use at your own risk)\n"
           "This fight's Damage Down cuts damage dealt by 50%\n"
           "Gear at or above i730 has its substats capped / relic weapons cap at 269 / use the best food and potions")

WEAPONS = [("Ultimate Sword of the Heavens", "PLD", "030000/030653"), ("Ultimate Shield of the Heavens", "PLD", "030000/030242"),
           ("Ultimate Axe of the Heavens", "WAR", "031000/031227"), ("Ultimate Claymore of the Heavens", "DRK", "034000/034381"),
           ("Ultimate Gunblade of the Heavens", "GNB", "036000/036074"), ("Ultimate Cane of the Heavens", "WHM", "032000/032447"),
           ("Ultimate Codex of the Heavens", "SCH", "033000/033359"), ("Ultimate Heavensmeter", "AST", "034000/034975"),
           ("Ultimate Milpreves of the Heavens", "SGE", "037000/037039"), ("Ultimate Knuckles of the Heavens", "MNK", "030000/030818"),
           ("Ultimate Halberd of the Heavens", "DRG", "031000/031629"), ("Ultimate Daggers of the Heavens", "NIN", "033000/033604"),
           ("Ultimate Katana of the Heavens", "SAM", "036000/036532"), ("Ultimate Sickle of the Heavens", "RPR", "037000/037241"),
           ("Ultimate Bow of the Heavens", "BRD", "032000/032018"), ("Ultimate Heavensfire", "MCH", "034000/034477"),
           ("Ultimate War Quoits of the Heavens", "DNC", "036000/036273"), ("Ultimate Staff of the Heavens", "BLM", "033000/033171"),
           ("Ultimate Grimoire of the Heavens", "SMN", "033000/033360"), ("Ultimate Rapier of the Heavens", "RDM", "036000/036831")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]
NESVAAZ = {"map": {"map": "m5t1/00", "size": 200, "x": 10.6, "y": 10.0, "label": "Nesvaaz"},
           "say": "จุดแลก: Nesvaaz ใน Radz-at-Han (X: 10.6 Y: 10.0)", "say_en": "Where to exchange: Nesvaaz in Radz-at-Han (X: 10.6 Y: 10.0)"}

rewards = [
    {"kind": "token", "name": "Dragonsong Totem", "icon_src": ICON("ui/icon/026000/026627_hr1.tex"),
     "say": "ไอเทมจากการเคลียร์ ใช้แลกอาวุธของไฟต์นี้\n\nแลกที่ Nesvaaz ใน Radz-at-Han (X: 10.6 Y: 10.0)\nอาวุธ IL605: 1 ชิ้น ต่ออาวุธ 1 ชิ้น (Paladin ได้ดาบ + โล่)",
     "say_en": "The clear's token, traded for this fight's weapons\n\nExchange it with Nesvaaz in Radz-at-Han (X: 10.6 Y: 10.0)\nIL605 weapon: 1 per weapon (a Paladin gets sword + shield)",
     "pics": [NESVAAZ]},
    {"kind": "weapon", "name": "Weapons of the Heavens (Ultimate)", "ilvl": 605, "icon_src": ICON("ui/icon/030000/030653_hr1.tex"),
     "say": "แลกด้วย Dragonsong Totem 1 ชิ้น ต่ออาวุธ 1 ชิ้น\nมีครบทุกอาชีพที่มีตอนไฟต์ออก (Paladin ได้ดาบ + โล่) แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "1 Dragonsong Totem per weapon\nOne for every job of the fight's patch (a Paladin gets sword + shield); tap an icon for the weapon's name",
     "pieces": pieces},
]

guide = {
    "slug": "dsr", "short": "DSR", "name": "Dragonsong's Reprise (Ultimate)",
    "category": "ultimate", "expansion": "Endwalker", "patch": "6.11",
    "source_name": "Tuufless's Notes (Elemental PF)", "source_url": "https://ffxiv.tuufless.com/elemental/dsr/",
    "content_key": "ult:Dragonsong's Reprise",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 90, "ilvl": 605, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ Asphodelos: The Fourth Circle (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Old Sharlayan (X: 12.7 Y: 14.2) เพื่อปลดล็อก\n"
                      "ต้องเป็นอาชีพเลเวล 90 / ในไฟต์ปรับเลเวลเป็น 90 และ item level เป็น 605",
            "unlock_en": "Clear Asphodelos: The Fourth Circle (Savage) first\n"
                         "then talk to the Wandering Minstrel in Old Sharlayan (X: 12.7 Y: 14.2) to unlock it\n"
                         "Level 90 job / the duty syncs you to level 90 and item level 605",
            "unlock_pics": [{"map": {"map": "k5t1/00", "size": 200, "x": 12.7, "y": 14.2, "label": "Wandering Minstrel"},
                             "say": "Old Sharlayan (X: 12.7 Y: 14.2) — Wandering Minstrel",
                             "say_en": "Old Sharlayan (X: 12.7 Y: 14.2) — the Wandering Minstrel"}]},
    "macro_en": MACRO_EN, "macro_ja": MACRO_JA,
    "xref_name": "Tuufless's Notes (Elemental PF)", "xref_url": "https://ffxiv.tuufless.com/elemental/dsr/",
}

defaults = {"frame": [1, 1], "bg": "#1c1e22", "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": "#3a3d44", "lines": False},
            "waymarks": {}, "iconSize": 5.6, "markSize": 5.2, "bossSize": 7.5, "ring": 4.6}

data = {"guide": guide, "defaults": defaults, "steps": core.steps, "rewards": rewards}
OUT = os.path.join(core.WT, "scripts/guides/data/dsr.json")
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
st = core.steps
print("left out (no usable frame):", len(core.NOFRAME), core.NOFRAME)
print("steps", len(st), "scenes", sum(1 for s in st if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in st))
