"""The guide header, requirements and rewards for UCoB (game8 300909's UCoB section + XIVAPI v2 for English names/icons)."""
import json

macros = json.load(open("scripts/guides/.work/ucob/macros.json", encoding="utf-8"))
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path=ui/icon/{p}_hr1.tex&format=png"

NOTE = ("แผน PF ของ Elemental DC ตาม Tuufless's Notes (ส่วนใหญ่ตามแผนของ Clees แต่ต่าง 4 จุด: Neurolink สามเหลี่ยมคว่ำ / tower ของ Blackfire Tank กับ Healer สลับกัน / จุดกระจาย Heavensfall Trio / Tenstrike ใช้จุดปลอดภัยเดียว)\n"
        "Marker: 1 2 3 = Neurolink / 4 = กลาง / A B C D = ขอบเหนือ (ดูขั้นแรก)\n\n"
        "P1: Fireball ชุดแรก MT ST D3 ไม่เข้า (stack 5 คน)\n"
        "ล่อ Liquid Hell: D3 > H2\n\n"
        "P2: Thunder ซ้าย–ขวา: MT > ST > H1 > H2 > D1 > D2 > D3 > D4\n"
        "Fire: รับ > หลบ > รับ (ยกเว้นคน Fire รอบ 2) > รับ\n"
        "กระจายประโยคที่ 3: MT ST หน้า Nael / D1 D2 หลัง / Range กระจายเอง\n\n"
        "P3: Quickmarch กลุ่ม MT ตะวันตก / กลุ่ม ST ตะวันออก\n"
        "Blackfire tower: Tank / Healer / D1 > D2 > D3 > D4\n"
        "Heavensfall: MT ST ทาง Nael / H1 D1 ซ้าย / H2 D2 ขวา / D3 D4 ตรงข้าม Nael\n"
        "Tenstrike แถว: D3 > H1 > D1 > MT > ST > D2 > H2 > D4\n\n"
        "P4: MT รับ Twintania / ST รับ Nael / D3 ล่อ Liquid Hell / Neurolink: D1 D2 D3 (D4 สำรอง)\n\n"
        "P5: แผน mitigate Morn Afah และ Akh Morn (ดูขั้นของ P5)")
NOTE_EN = ("Elemental DC PF plan from Tuufless's Notes (mostly Clees' plan, with four differences: Neurolinks in an inverted triangle / Blackfire tank and healer towers flipped / Heavensfall Trio spread spots / Tenstrike with one safe spot)\n"
           "Waymarks: 1 2 3 = Neurolinks / 4 = centre / A B C D = north edge (see the first step)\n\n"
           "P1: first Fireball, MT ST D3 stay out (a five-man stack)\n"
           "Liquid Hell baits: D3 > H2\n\n"
           "P2: Thunder left–right: MT > ST > H1 > H2 > D1 > D2 > D3 > D4\n"
           "Fire: in > out > in (except the second Fire) > in\n"
           "Line 3 spread: MT ST in front of Nael / D1 D2 behind / ranged spread as fits\n\n"
           "P3: Quickmarch MT group west / ST group east\n"
           "Blackfire towers: tank / healer / D1 > D2 > D3 > D4\n"
           "Heavensfall: MT ST toward Nael / H1 D1 left / H2 D2 right / D3 D4 opposite Nael\n"
           "Tenstrike line: D3 > H1 > D1 > MT > ST > D2 > H2 > D4\n\n"
           "P4: MT Twintania / ST Nael / D3 baits Liquid Hell / Neurolinks: D1 D2 D3 (D4 flex)\n\n"
           "P5: Morn Afah and Akh Morn mitigation plan (see the P5 steps)")

GUIDE = {
    "slug": "ucob", "short": "UCOB", "sort": 1,
    "name": "The Unending Coil of Bahamut (Ultimate)",
    "category": "ultimate", "expansion": "Stormblood", "patch": "4.11",
    "source_name": "Tuufless's Notes (Elemental PF)", "source_url": "https://ffxiv.tuufless.com/elemental/ucob/",
    "content_key": "ult:The Unending Coil of Bahamut",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 70, "ilvl": 345, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ Deltascape V4.0 (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Kugane (X: 11.6 Y: 12.6) เพื่อปลดล็อก\n"
                      "รับได้ตั้งแต่ Lv70 (คลาสต่อสู้)\n"
                      "ในดันเจี้ยน: เลเวล sync เป็น 70 และไอเทมเลเวล sync เป็น IL345 / เข้าได้เฉพาะปาร์ตี้ 8 คนที่จัดเอง",
            "unlock_en": "Complete Deltascape V4.0 (Savage) first\n"
                         "then talk to the Wandering Minstrel in Kugane (X: 11.6 Y: 12.6) to unlock it\n"
                         "Available from level 70 (combat jobs)\n"
                         "Inside, your level syncs to 70 and item level to IL345 / pre-made parties of 8 only",
            "unlock_pics": [{"map": {"map": "e3t1/00", "size": 200, "x": 11.6, "y": 12.6, "label": "Wandering Minstrel"},
                             "say": "Kugane (X: 11.6 Y: 12.6) — Wandering Minstrel", "say_en": "Kugane (X: 11.6 Y: 12.6) — the Wandering Minstrel"}]},
    "macro_en": macros["macro_en"], "macro_ja": macros["macro_ja"],
    "xref_name": "Tuufless's Notes (Elemental PF)", "xref_url": "https://ffxiv.tuufless.com/elemental/ucob/",
}

WEAPONS = [("Ultimate Dreadwyrm Blade", "PLD", "030000/030580"), ("Ultimate Dreadwyrm Shield", "PLD", "030000/030173"),
           ("Ultimate Dreadwyrm Bardiche", "WAR", "031000/031554"), ("Ultimate Dreadwyrm Claymore", "DRK", "034000/034308"),
           ("Ultimate Dreadwyrm Cane", "WHM", "032000/032729"), ("Ultimate Dreadwyrm Codex", "SCH", "033000/033246"),
           ("Ultimate Dreadwyrm Torquetum", "AST", "034000/034905"), ("Ultimate Dreadwyrm Claws", "MNK", "031000/031146"),
           ("Ultimate Dreadwyrm Spear", "DRG", "031000/031954"), ("Ultimate Dreadwyrm Daggers", "NIN", "033000/033932"),
           ("Ultimate Dreadwyrm Katana", "SAM", "036000/036462"), ("Ultimate Dreadwyrm Longbow", "BRD", "032000/032345"),
           ("Ultimate Dreadwyrm Handgonne", "MCH", "034000/034431"), ("Ultimate Dreadwyrm Staff", "BLM", "033000/033097"),
           ("Ultimate Dreadwyrm Grimoire", "SMN", "033000/033245"), ("Ultimate Dreadwyrm Rapier", "RDM", "036000/036763")]

ESCHINA = {"map": {"map": "g3t1/00", "size": 200, "x": 13.8, "y": 11.7, "label": "Eschina"},
           "say": "จุดแลก: Eschina ใน Rhalgr's Reach (X: 13.8 Y: 11.7)",
           "say_en": "Where to exchange: Eschina in Rhalgr's Reach (X: 13.8 Y: 11.7)"}

REWARDS = [
    {"kind": "token", "name": "Dreadwyrm Totem", "icon_src": ICON("026000/026526"),
     "say": "เคลียร์แล้วได้ทุกคนในปาร์ตี้ คนละ 1 ชิ้น\n\nแลกที่ Eschina ใน Rhalgr's Reach (X: 13.8 Y: 11.7) เมนู Totem Gear (Bahamut)\n"
            "1 ชิ้น แลกอาวุธ IL345 ได้ 1 ชิ้น (Paladin ได้ดาบ + โล่)",
     "say_en": "Every member of the party gets one on a clear\n\nExchange it with Eschina in Rhalgr's Reach (X: 13.8 Y: 11.7), under Totem Gear (Bahamut)\n"
               "One buys one IL345 weapon (a Paladin gets sword + shield)",
     "pics": [ESCHINA]},
    {"kind": "weapon", "name": "Ultimate Dreadwyrm weapons", "ilvl": 345, "icon_src": ICON("030000/030580"),
     "say": "อาวุธ IL345 แลกด้วย Dreadwyrm Totem 1 ชิ้น ต่ออาวุธ 1 ชิ้น\nมีครบทุกอาชีพในยุค Stormblood แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "IL345 weapons, one Dreadwyrm Totem each\nOne for every Stormblood-era job; tap an icon for the weapon's name",
     "pieces": [{"name": n, "job": j, "icon_src": ICON(p)} for n, j, p in WEAPONS]},
    {"kind": "other", "name": "The Legend", "icon_src": ICON("000000/000317"),
     "say": "ฉายาพิเศษจากการเคลียร์ (จาก achievement Resistance Is Futile)",
     "say_en": "A special title for the clear (from the achievement Resistance Is Futile)"},
]
