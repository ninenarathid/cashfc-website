"""Builds scripts/guides/data/tea.json: The Epic of Alexander (Ultimate), Tuufless's Notes (Elemental DC PF).
Run from the repo root: python3 scripts/guides/builders/tea/tea/tools/gen_tea.py [allowmissing] [norefs]"""
import sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scenes_tea as S
from steps_p1 import p1
from steps_p2 import p2
from steps_p3 import p3
from steps_p4 import p4

WT = "."
OUT = WT + "/scripts/guides/data/tea.json"
DL = WT + "/scripts/guides/.work/tea/dl"
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"

steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, mech_en=None, plan=None, plan_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if plan:
        s["plan"] = plan
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [pic]
    if refs:
        refs = [r for r in refs if r]
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        missing = [r[0] for r in refs if not os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        if missing and "allowmissing" not in sys.argv:
            raise SystemExit(f"missing frames: {missing}")
        refs = [r for r in refs if os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        s["refs"] = [{"src": r[0], "say": r[1], "by": r[3], "url": r[4]} for r in refs]
        if not s["refs"]:
            del s["refs"]
            refs = None
    if scene is not None:
        s["ring"] = 5
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if plan:
        en["plan"] = plan_en
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)


for part in (p1, p2, p3, p4):
    part(step)

# ------------------------------------------------------------------ guide
NOTE = ("แผนตาม Tuufless's Notes: แผน PF ของ Elemental DC\n"
        "P1 Living Liquid: Separations แบบดัดแปลง (แผน JP)\n"
        "P2 Limit Cut: 1211 (มีแท็บแผน 1256 ด้วย)\n"
        "P2 Brute Justice + Cruise Chaser: Tollgate\n"
        "P3 Alexander Prime: Wormhole แบบ 09STOP (แผน Korean sim หรือ Onyxia)\n"
        "P4 Perfect Alexander\n\n"
        "ตกลงกันก่อนเริ่ม: ลำดับ Esuna ตอน Throttle (Esuna ตัวเองก่อนหรือไม่) และแผน Limit Cut (1211 หรือ 1256)\n\n"
        "Marker ตาม Tuufless (ดูขั้นแรก): ABCD ไว้บอกทิศ / 1234 อยู่ฝั่งใต้และตะวันออก\n\n"
        "ฝั่ง Enumeration (P2 และ P3)\n"
        "ตะวันตก: H1 D3 D1\n"
        "ตะวันออก: H2 D4 D2\n"
        "D1·D2 สลับฝั่งเมื่อจำเป็น\n\n"
        "คู่ Nisi: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
        "stack P4 ตะวันตก: H1 > D3 > D1 > MT / ตะวันออก: H2 > D4 > D2 > ST\n"
        "Temporal Prison: H2 > H1 > ST > MT > D3 > D4 > D2 > D1\n\n"
        "ของ: ilvl 595 ขึ้นไป substat ตันแล้ว / อาวุธ relic ตันที่ 184 / ยา HQ Grade 6 Tincture ก็ได้ผลเต็ม")
NOTE_EN = ("Plan follows Tuufless's Notes: Elemental DC's PF strat\n"
           "P1 Living Liquid: modified Separations (the JP strat)\n"
           "P2 Limit Cut: 1211 (1256 as a second tab)\n"
           "P2 Brute Justice + Cruise Chaser: Tollgate\n"
           "P3 Alexander Prime: 09STOP Wormhole (the Korean sim strat, also called Onyxia)\n"
           "P4 Perfect Alexander\n\n"
           "Agree before starting: the Throttle Esuna priority (Esuna yourself first or not) and the Limit Cut strat (1211 or 1256)\n\n"
           "Tuufless's waymarks (see the first step): ABCD for orientation / 1234 on the south and east side\n\n"
           "Enumeration sides (P2 and P3)\n"
           "West: H1 D3 D1\n"
           "East: H2 D4 D2\n"
           "D1·D2 swap sides when needed\n\n"
           "Nisi pairs: MT·D1 / ST·D2 / H1·D3 / H2·D4\n"
           "P4 stacks west: H1 > D3 > D1 > MT / east: H2 > D4 > D2 > ST\n"
           "Temporal Prison: H2 > H1 > ST > MT > D3 > D4 > D2 > D1\n\n"
           "Gear: i595 and up has capped substats / relic weapons cap at 184 / HQ Grade 6 Tinctures already give the full benefit")

WEAPONS = [("Ultimate Almace", "PLD", "030000/030618"), ("Ultimate Ancile", "PLD", "030000/030207"),
           ("Ultimate Ukonvasara", "WAR", "031000/031591"), ("Ultimate Nothung", "DRK", "034000/034347"),
           ("Ultimate Anarchy", "GNB", "036000/036039"), ("Ultimate Majestas", "WHM", "032000/032765"),
           ("Ultimate Tetrabiblos", "SCH", "033000/033317"), ("Ultimate Deneb", "AST", "034000/034941"),
           ("Ultimate Verethragna", "MNK", "031000/031182"), ("Ultimate Rhongomiant", "DRG", "031000/031993"),
           ("Ultimate Kannagi", "NIN", "033000/033968"), ("Ultimate Honebami", "SAM", "036000/036500"),
           ("Ultimate Gandiva", "BRD", "032000/032381"), ("Ultimate Armageddon", "MCH", "034000/034467"),
           ("Ultimate Twashtar", "DNC", "036000/036238"), ("Ultimate Hvergelmir", "BLM", "033000/033135"),
           ("Ultimate Draconomicon", "SMN", "033000/033318"), ("Ultimate Vorpal Sword", "RDM", "036000/036799")]
pieces = [{"name": n, "job": j, "icon_src": ICON(f"ui/icon/{p}_hr1.tex")} for n, j, p in WEAPONS]
BERTANA = {"map": {"map": "d2t1/00", "size": 400, "x": 5.8, "y": 5.2, "label": "Bertana"},
           "say": "จุดแลก: Bertana ที่ Idyllshire (X: 5.8 Y: 5.2)",
           "say_en": "Where to exchange: Bertana in Idyllshire (X: 5.8 Y: 5.2)"}

rewards = [
    {"kind": "token", "name": "Colossus Totem", "icon_src": ICON("ui/icon/026000/026588_hr1.tex"),
     "say": "token ที่ได้จากการเคลียร์ไฟต์นี้\n\nแลกที่ Bertana ใน Idyllshire (X: 5.8 Y: 5.2)\n"
            "อาวุธ IL475: 1 ชิ้น ต่ออาวุธ 1 ชิ้น (Paladin ได้ดาบ + โล่)",
     "say_en": "The token this fight's clear gives\n\nExchange it with Bertana in Idyllshire (X: 5.8 Y: 5.2)\n"
               "IL475 weapon: 1 per weapon (a Paladin gets sword + shield)",
     "pics": [BERTANA]},
    {"kind": "weapon", "name": "Ultimate Weapons (The Epic of Alexander)", "ilvl": 475, "icon_src": ICON("ui/icon/030000/030618_hr1.tex"),
     "say": "อาวุธ IL475 ของ Ultimate นี้: แลกด้วย Colossus Totem 1 ชิ้น\nมี 17 อาชีพของยุค Shadowbringers (+ โล่ Paladin) แตะไอคอนเพื่อดูชื่ออาวุธ",
     "say_en": "This Ultimate's IL475 weapons: one Colossus Totem each\nFor the 17 Shadowbringers jobs (+ the Paladin shield); tap an icon for the weapon's name",
     "pieces": pieces},
]

guide = {
    "slug": "tea", "short": "TEA", "sort": 3,
    "name": "The Epic of Alexander (Ultimate)",
    "category": "ultimate", "expansion": "Shadowbringers", "patch": "5.11",
    "source_name": "Tuufless's Notes (Elemental PF)", "source_url": "https://ffxiv.tuufless.com/elemental/tea/",
    "content_key": "ult:The Epic of Alexander",
    "note": NOTE, "en": {"note": NOTE_EN},
    "req": {"level": 80, "ilvl": 475, "party": 8, "minutes": 120,
            "unlock": "เคลียร์ Eden's Gate: Sepulture (Savage) ให้ได้ก่อน\n"
                      "แล้วคุยกับ Wandering Minstrel ที่ Kugane (X: 11.6 Y: 12.6) เพื่อปลดล็อก\n"
                      "Lv80 (ซิงก์เป็น 80) / ilvl ซิงก์ลงเป็น 475 / 8 คน",
            "unlock_en": "Clear Eden's Gate: Sepulture (Savage) first\n"
                         "then talk to the Wandering Minstrel in Kugane (X: 11.6 Y: 12.6) to unlock it\n"
                         "Lv80 (synced to 80) / item level synced down to 475 / 8 players",
            "unlock_pics": [{"map": {"map": "e3t1/00", "size": 200, "x": 11.6, "y": 12.6, "label": "Wandering Minstrel"},
                             "say": "Kugane (X: 11.6 Y: 12.6) — Wandering Minstrel",
                             "say_en": "Kugane (X: 11.6 Y: 12.6) — the Wandering Minstrel"}]},
    "macro_en": open(DL + "/macro_en.txt", encoding="utf-8").read(),
    "macro_ja": open(DL + "/macro_ja.txt", encoding="utf-8").read(),
    "xref_name": "Tuufless's Notes (Elemental PF)", "xref_url": "https://ffxiv.tuufless.com/elemental/tea/",
}

defaults = {"frame": [1, 1], "bg": "#5b5c60", "arena": dict(S.P1_FLOOR), "waymarks": {}, "iconSize": 6, "markSize": 6, "bossSize": 9, "ring": 5}

data = {"guide": guide, "defaults": defaults, "steps": steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps))
