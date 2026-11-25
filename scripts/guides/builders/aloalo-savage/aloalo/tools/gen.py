"""Builds scripts/guides/data/aloalo-savage.json (Another Aloalo Island (Savage): game8's plan, Hamukatsu's videos)."""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core
import st1
try:
    import st2
except ImportError:
    st2 = None
try:
    import st3
except ImportError:
    st3 = None

OUT = r"scripts/guides/data/aloalo-savage.json"
ICON = lambda p: f"https://v2.xivapi.com/api/asset?path={p}&format=png"
OLD_SHARLAYAN = {"map": "k5t1/00", "size": 200}

st1.build()
st1.trash1()
st1.boss1()
if st2:
    st2.build()
if st3:
    st3.build()

note = ("แผนตาม game8 (หน้า Another Aloalo Island ของทั้ง 3 บอส)\n"
        "Savage: game8 บอกว่า Mechanic ของบอสเหมือน Another แต่ศัตรูทางเดินตีแรงขึ้นมาก และถ้าล้มทั้งปาร์ตี้ต้องเริ่มใหม่ตั้งแต่ต้น\n\n"
        "ปาร์ตี้ 4 คน: MT / H1 / D1 / D2\nD1 = Melee / D2 = Range (ตามภาพของ game8)\n\n"
        "Marker: A เหนือ / B ตะวันออก / C ใต้ / D ตะวันตก (ดูขั้นแรก)\n\n"
        "คู่ของบอส 1: MT·D2 / H1·D1\n"
        "ลำดับของบอส 1 (จากเหนือ): MT > D1 > D2 > H1\n"
        "dart ของบอส 3: Tank ฟ้า / Healer เหลือง / DPS แดง (D1 ปรับ)")
note_en = ("Plan follows game8 (its Another Aloalo Island pages for all three bosses)\n"
           "Savage: game8 says the bosses' Mechanics are the same as in Another, but the trash hits far harder, and a wipe sends the party back to the start\n\n"
           "Party of four: MT / H1 / D1 / D2\nD1 = melee / D2 = ranged (as game8's pictures use them)\n\n"
           "Waymarks: A north / B east / C south / D west (see the first step)\n\n"
           "Boss 1 pairs: MT·D2 / H1·D1\n"
           "Boss 1 priority (from the north): MT > D1 > D2 > H1\n"
           "Boss 3 darts: tank blue / healer yellow / DPS red (D1 adjusts)")

guide = {
    "slug": "aloalo-savage", "short": "Aloalo (S)", "sort": 3,
    "name": "Another Aloalo Island (Savage)",
    "category": "savage", "expansion": "Endwalker", "patch": "6.51",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/543317",
    "content_key": "cri:Another Aloalo Island (Savage)",
    "note": note, "en": {"note": note_en},
    "req": {
        "level": 90, "party": 4, "minutes": 120,
        "unlock": ("ทำ Main Quest A Satrap's Duty ให้จบ แล้วคุยกับ Osmon ที่ Old Sharlayan (X: 11.9 Y: 13.3) 1 ครั้ง\n"
                   "รับเควสต์ Stranger from Paradise จาก Shallow Moor ที่ Old Sharlayan (X: 12.0 Y: 13.3) (Lv90): ปลดล็อก Aloalo Island\n"
                   "เคลียร์ Aloalo Island (ปกติ) แล้วคุยกับ Osmon (X: 11.9 Y: 13.3): ปลดล็อก Another Aloalo Island\n"
                   "Savage ไม่มี IL ขั้นต่ำ ในดันเจี้ยน IL ถูกปรับลงเป็น 665"),
        "unlock_en": ("Finish the main scenario quest A Satrap's Duty, then talk once to Osmon in Old Sharlayan (X: 11.9 Y: 13.3)\n"
                      "Take Stranger from Paradise from Shallow Moor in Old Sharlayan (X: 12.0 Y: 13.3) (Lv 90): it unlocks Aloalo Island\n"
                      "Clear Aloalo Island (normal), then talk to Osmon (X: 11.9 Y: 13.3): it unlocks Another Aloalo Island\n"
                      "The Savage version has no minimum item level; inside, item level is synced down to 665"),
        "unlock_pics": [
            {"map": {**OLD_SHARLAYAN, "x": 12.0, "y": 13.3, "label": "Shallow Moor"},
             "say": "Old Sharlayan (X: 12.0 Y: 13.3): Shallow Moor (เควสต์ Stranger from Paradise)",
             "say_en": "Old Sharlayan (X: 12.0 Y: 13.3): Shallow Moor (Stranger from Paradise)"},
            {"map": {**OLD_SHARLAYAN, "x": 11.9, "y": 13.3, "label": "Osmon"},
             "say": "Old Sharlayan (X: 11.9 Y: 13.3): Osmon (ปลดล็อก Another)",
             "say_en": "Old Sharlayan (X: 11.9 Y: 13.3): Osmon (unlocks Another)"},
        ],
    },
}

TRIS = {"map": {**OLD_SHARLAYAN, "x": 11.9, "y": 13.3, "label": "Trisassant"},
        "say": "จุดแลก: Trisassant ที่ Old Sharlayan (X: 11.9 Y: 13.3)", "say_en": "Where to exchange: Trisassant in Old Sharlayan (X: 11.9 Y: 13.3)"}
rewards = [
    {"kind": "token", "name": "Aloalo Manuscript", "icon_src": ICON("ui/icon/026000/026456_hr1.tex"),
     "say": "ได้จากการเคลียร์ Savage\nแลก 1 เล่ม = Elevated Ester 1 ขวด (อัปอาวุธจาก Allagan Tomestone of Comedy เป็น IL665)\nแลกที่ Trisassant ใน Old Sharlayan (X: 11.9 Y: 13.3)",
     "say_en": "From a Savage clear\n1 buys 1 Elevated Ester (raises an Allagan Tomestone of Comedy weapon to IL665)\nExchange with Trisassant in Old Sharlayan (X: 11.9 Y: 13.3)",
     "pics": [TRIS]},
    {"kind": "other", "name": "Elevated Ester", "icon_src": ICON("ui/icon/027000/027606_hr1.tex"),
     "say": "แลกด้วย Aloalo Manuscript 1 เล่ม\nใช้อัป IL อาวุธจาก Allagan Tomestone of Comedy เป็น 665",
     "say_en": "1 Aloalo Manuscript\nRaises an Allagan Tomestone of Comedy weapon to IL665"},
    {"kind": "token", "name": "Aloalo Coin", "icon_src": ICON("ui/icon/065000/065105_hr1.tex"),
     "say": ("เหรียญของ Another Aloalo Island แลกที่ Trisassant (X: 11.9 Y: 13.3):\n"
             "Quaqua Horn (mount): 100\nAloalo Island Framer's Kit: 8\nO Hunter, Rejoice Orchestrion Roll: 8\n"
             "materia IX สายต่อสู้: 2\nmateria X สายต่อสู้: 4"),
     "say_en": ("Another Aloalo Island's coin, exchanged with Trisassant (X: 11.9 Y: 13.3):\n"
                "Quaqua Horn (mount): 100\nAloalo Island Framer's Kit: 8\nO Hunter, Rejoice Orchestrion Roll: 8\n"
                "Combat materia IX: 2\nCombat materia X: 4"),
     "pics": [TRIS]},
    {"kind": "mount", "name": "Quaqua", "icon_src": ICON("ui/icon/004000/004278_hr1.tex"),
     "say": "แลกด้วย Aloalo Coin 100 เหรียญ (ไอเทม Quaqua Horn)\ngame8: ดรอปจากหีบของ Another และ Savage ได้ด้วย",
     "say_en": "100 Aloalo Coins (the Quaqua Horn item)\ngame8: it can also drop from Another's and Savage's chests",
     "pics": [{"src": ICON("ui/icon/068000/068278_hr1.tex"), "say": "หน้าตา Quaqua (ภาพจาก Mount Guide ในเกม)", "say_en": "The Quaqua, as the in-game Mount Guide shows it"}]},
    {"kind": "token", "name": "Aloalo Potsherd", "icon_src": ICON("ui/icon/026000/026648_hr1.tex"),
     "say": ("แลกที่ Trisassant (X: 11.9 Y: 13.3):\n"
             "ชุด Free Spirit's: หมวก 15 / เสื้อ 27 / ถุงมือ 9 / กางเกง 12 / รองเท้า 9\n"
             "Statice's Wings: 3\nBallroom Etiquette - Humble Triumph (emote): 9\n"
             "Modern Aesthetics - The Bold and the Braid (ทรงผม): 6\nO Speaker, Slumber Orchestrion Roll: 9"),
     "say_en": ("Exchanged with Trisassant (X: 11.9 Y: 13.3):\n"
                "Free Spirit's set: hat 15 / jacket 27 / ringbands 9 / cropped slops 12 / backless loafers 9\n"
                "Statice's Wings: 3\nBallroom Etiquette - Humble Triumph (emote): 9\n"
                "Modern Aesthetics - The Bold and the Braid (hairstyle): 6\nO Speaker, Slumber Orchestrion Roll: 9"),
     "pieces": [
         {"name": "Free Spirit's Hat", "icon_src": ICON("ui/icon/056000/056637_hr1.tex")},
         {"name": "Free Spirit's Jacket", "icon_src": ICON("ui/icon/057000/057022_hr1.tex")},
         {"name": "Free Spirit's Ringbands", "icon_src": ICON("ui/icon/056000/056147_hr1.tex")},
         {"name": "Free Spirit's Cropped Slops", "icon_src": ICON("ui/icon/057000/057550_hr1.tex")},
         {"name": "Free Spirit's Backless Loafers", "icon_src": ICON("ui/icon/049000/049643_hr1.tex")},
         {"name": "Statice's Wings", "icon_src": ICON("ui/icon/058000/058034_hr1.tex")},
         {"name": "Ballroom Etiquette - Humble Triumph", "icon_src": ICON("ui/icon/026000/026435_hr1.tex")},
         {"name": "Modern Aesthetics - The Bold and the Braid", "icon_src": ICON("ui/icon/026000/026178_hr1.tex")},
         {"name": "O Speaker, Slumber Orchestrion Roll", "icon_src": ICON("ui/icon/025000/025945_hr1.tex")}]},
]

data = {"guide": guide,
        "defaults": {"frame": [1, 1], "bg": "#f2f2f2", "arena": None, "waymarks": {}, "iconSize": 6.6, "markSize": 7.5, "bossSize": 10, "ring": 5.5},
        "steps": core.steps, "rewards": rewards}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(core.steps), "steps,", sum(1 for s in core.steps if s["scene"]), "pictures,", sum(len(s.get("refs", [])) for s in core.steps), "refs")
