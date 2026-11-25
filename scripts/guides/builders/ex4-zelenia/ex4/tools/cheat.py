"""The EX4 cheatsheet: Kanabin's sheet on xivjpraids.com, redrawn panel by panel as square scenes.
Positions measured on the source (3600x2025) where it differs from game8's pictures."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex4/tools")
from shapes import *  # noqa
import scenes as S

GOLD_HI = "#ffd24d"
PANEL = {"iconSize": 7.6, "markSize": 11, "bossSize": 9.0}


def px(cx, cy, Rp, x, y, c=(50, 50), Rr=46):
    """A point on the source picture (pixels, circle centre cx,cy radius Rp) to our percent."""
    return (R(c[0] + (x - cx) / Rp * Rr), R(c[1] + (y - cy) / Rp * Rr))


def badge(x, y, s, r=3.4):
    return [dot((x, y), r, GOLD_HI, 1), text(x, y + 0.2, s, 4.2, "#1a1a1a")]


def white_heads(p0, p1, n=3, wd=2.2):
    """White arrowheads along a straight arrow, as EX7's Gaze of the Void has them."""
    out = []
    for k in range(1, n + 1):
        f = k / (n + 1)
        a = (p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f)
        b = (p0[0] + (p1[0] - p0[0]) * (f + 0.04), p0[1] + (p1[1] - p0[1]) * (f + 0.04))
        out.append(arrow(a, b, "#ffffff", wd, 1))
    return out


def with_panel(scene, boss=None, extra=(), **kw):
    s = dict(scene)
    s["shapes"] = list(scene["shapes"]) + list(extra)
    if boss is not None:
        s["boss"] = boss
    s.update(PANEL)
    s.update(kw)
    return s


# ------------------------------------------------------------------ 1-2 Shock
def p_shock(which):
    sc = S.shock1() if which == 1 else S.shock2()
    return with_panel(sc, [51.4, 51.0], target((51.4, 51.0), 11.0, "#e8342a", 0.7), iconSize=8.2)


# ------------------------------------------------------------------ 3 Escelons' Fall: the start
def p_ef_start():
    c = S.EF_C
    s = S.beige(c, S.EF_R, S.EF_RIN, angles=(0, 45, 90, 136, 180, 225, 270, 316.3))
    s += [ringl((50.45, 49.4), 14.6, GOLD_HI, 1.1, 0.95)] + target((50.45, 49.4), 13.1, "#e8342a", 0.9)
    s += near_tell((50.45, 49.6), 5.6)
    return {"shapes": s, "arena": S.disc(c, S.EF_R), "waymarks": None, "boss": [50.45, 49.6],
            "roles": {k: [R(v[0]), R(v[1])] for k, v in {"MT": (43.6, 36.0), "ST": (57.2, 36.0), "H1": (35.4, 45.0), "H2": (65.4, 45.0),
                                                       "D3": (30.4, 58.0), "D4": (70.6, 58.0), "D1": (42.4, 67.6), "D2": (58.6, 67.6)}.items()},
            **dict(PANEL, iconSize=7.2)}


# ------------------------------------------------------------------ 4 Escelons' Fall 2: the donut group waits
def p_ef2():
    c = S.E2_C
    s = [ringl(c, S.E2_RIN, LINE, 0.45)] + spokes(c, S.E2_R, 23.5, S.E2_RIN, LINE, 0.45) + target((50.45, 49.4), 14.0, "#e8342a", 0.9)
    s += [donut((50.3, 31.0), 11.0, 3.0, BLUE_AOE, 0.8), ringl((50.3, 31.0), 11.0, "#9fd4ee", 0.4, 0.9)]
    s += stack_mark(50.3, 31.0, 8.2, 5.4, 2.2) + stack_mark(50.3, 73.0, 8.2, 5.4, 2.2, "#ff6a8a")
    roles = {"MT": (46.2, 27.6), "ST": (54.4, 27.6), "H1": (46.2, 34.6), "H2": (54.4, 34.6),
             "D1": (46.2, 69.6), "D2": (54.4, 69.6), "D3": (46.2, 76.6), "D4": (54.4, 76.6)}
    return {"shapes": s, "arena": S.disc(c, S.E2_R), "waymarks": None, "boss": [50.45, 50.0],
            "roles": {k: [R(v[0]), R(v[1])] for k, v in roles.items()}, **dict(PANEL, iconSize=6.6)}


# ------------------------------------------------------------------ 5 Blessed Barricade: whose side
def p_bb():
    return with_panel(S.bb1(), None, (), bossSize=7.4)


# ------------------------------------------------------------------ 6 Blessed Barricade: the cleave follows the sword
def p_cleave():
    s = [rect(50, 6, 95, 94, "#b8a43c", 0.6), line((50, 6), (50, 94), "#f0e090", 0.5, 0.9)]
    # the sword, held low and pointing to the right half
    s += [line((33, 58), (63, 86), "#9fd0ec", 3.2, 0.95), line((33, 58), (63, 86), "#ffffff", 1.6, 1)]
    s += [ringl((33, 58), 6.0, GOLD_HI, 1.1, 0.95)]
    s += white_heads((40, 50), (82, 50), 3, 2.6)
    s += [arrow((40, 50), (84, 50), "#ffffff", 1.0, 0.9)]
    return {"shapes": s, "arena": None, "waymarks": None, "boss": [26, 46], "bg": "#2b2f36", **dict(PANEL, bossSize=26)}


# ------------------------------------------------------------------ 7 Roseblood: 3rd Bloom (Kurapon's)
def p_b3():
    c, Rr, rin = (50, 50), 46.0, 23.0
    s = floorx(c, Rr, rin, {1, 7}, {0, 2, 4, 6}, -22.5)
    # north is where the two inner red tiles are: a gold arc over them and an arrow up
    s += arc(c, rin - 2.2, 300, 60, GOLD_HI, 1.2, 0.95)
    s += [arrow((50, 46), (50, 30), GOLD_HI, 1.3, 1)]
    for (x, y) in ((50, 11.5), (11.5, 50), (88.5, 50), (50, 88.5)):
        s += crystal(x, y, 9.0, 3.4)
    P = lambda x, y: px(240, 285, 190, x, y)
    for (x, y) in ((240, 225), (193, 320), (240, 337), (287, 320)):
        p = P(x, y)
        s += rose_mark(p[0], p[1] + 2.6, 4.6)
    roles = {"MT": P(220, 186), "D3": P(260, 186), "D1": P(140, 300), "H1": P(156, 326),
             "D2": P(220, 374), "ST": P(260, 374), "D4": P(340, 300), "H2": P(324, 326)}
    return {"shapes": s, "arena": S.disc(c, Rr, DARK), "waymarks": None,
            "roles": {k: [R(v[0]), R(v[1])] for k, v in roles.items()}, **dict(PANEL, iconSize=8.0)}


# ------------------------------------------------------------------ 8 Roseblood: 4th Bloom: the drops
def p_b4():
    return with_panel(S.b4a(), None, (), iconSize=8.0)


# ------------------------------------------------------------------ 9 Roseblood: 4th Bloom: the thorns
def p_b4t():
    c = S.T_C
    s = floorx(c, S.T_R, S.T_RIN, S.B4_IN2, S.B4_OUT2, 0)
    g = (51.3, 63.0)
    s += [arrow((47.5, 63.0), (13.0, 50.0), "#ffffff", 1.2, 0.95), arrow((55.1, 63.0), (89.6, 50.0), "#ffffff", 1.2, 0.95)]
    s += white_heads((47.5, 63.0), (13.0, 50.0), 2) + white_heads((55.1, 63.0), (89.6, 50.0), 2)
    s += [ringl(g, 7.4, GOLD_HI, 1.1, 0.95)]
    s += badge(51.3, 74.0, "1") + badge(26.0, 50.6, "2") + badge(76.6, 50.6, "2")
    s += tokens(("T", 47.6, 60.6), ("H", 54.6, 60.6), ("D", 51.1, 66.0), s=6.2)
    s += tokens(("T", 9.0, 46.0), ("H", 9.0, 53.6), ("D", 93.0, 50.0), s=5.6)
    s += [arrow((51.3, 46.0), (51.3, 33.0), "#ffffff", 1.0, 0.9)]
    return {"shapes": s, "arena": S.disc(c, S.T_R, DARK), "waymarks": None, "boss": [51.3, 49.0], **PANEL}


# ------------------------------------------------------------------ 10-11 Roseblood: 6th Bloom, the two floors
def p_b6(which):
    c, Rr, rin = (50, 50), 46.0, 23.0
    if which == 1:
        red_in, red_out, cx = {1, 5}, {2, 6}, 295
        roses = ((347, 152), (265, 224), (318, 336), (245, 410))
        towers = ((165, 225), (352, 258), (233, 302), (420, 335))
        seats = {"D3": (210, 195), "MT": (232, 215), "ST": (350, 222), "D4": (373, 205),
                 "D1": (245, 335), "H1": (220, 360), "D2": (350, 332), "H2": (375, 352)}
    else:
        red_in, red_out, cx = {2, 6}, {1, 5}, 715
        roses = ((668, 155), (740, 222), (688, 332), (768, 405))
        towers = ((845, 225), (648, 252), (770, 305), (585, 340))
        seats = {"D3": (632, 200), "MT": (655, 220), "ST": (768, 222), "D4": (790, 205),
                 "D1": (655, 342), "H1": (633, 360), "D2": (778, 340), "H2": (803, 360)}
    P = lambda x, y: px(cx, 282, 188, x, y)
    s = floorx(c, Rr, rin, red_in, red_out, 0)
    s += [line((0, 50), (100, 50), "#ffb020", 1.1, 0.95, dash=True)]
    for x, y in towers:
        p = P(x, y)
        s += crystal(p[0], p[1], 8.4, 3.2)
    for x, y in roses:
        p = P(x, y)
        s += rose_mark(p[0], p[1] + 2.4, 4.6)
    roles = {k: P(*v) for k, v in seats.items()}
    return {"shapes": s, "arena": S.disc(c, Rr, DARK), "waymarks": None,
            "roles": {k: [R(v[0]), R(v[1])] for k, v in roles.items()}, **dict(PANEL, iconSize=7.0)}


FIT = {1: (0.9, -4.0), 2: (0.84, -6.5), 3: (0.78, -9.0)}


def fit(scene, n):
    """Shrink a panel's scene towards the top so the sheet's caption lines at the foot do not cover it."""
    if not n:
        return scene
    k, dy = FIT[min(3, n)]
    T = lambda p: [R(50 + (p[0] - 50) * k), R(50 + (p[1] - 50) * k + dy)]
    out = dict(scene)
    shapes = []
    for sh in scene["shapes"]:
        sh = dict(sh)
        for key in ("at", "from", "to"):
            if key in sh:
                sh[key] = T(sh[key])
        for key in ("r", "r2", "w", "h", "len", "wd", "size"):
            if key in sh:
                sh[key] = R(sh[key] * k)
        shapes.append(sh)
    out["shapes"] = shapes
    if scene.get("roles"):
        out["roles"] = {kk: T(v) for kk, v in scene["roles"].items()}
    b = scene.get("boss")
    if b is not None:
        out["boss"] = [T(q) for q in b] if isinstance(b[0], list) else T(b)
    if scene.get("arena"):
        a = dict(scene["arena"]); a["at"] = T(a["at"]); a["r"] = R(a["r"] * k); out["arena"] = a
    if scene.get("waymarks"):
        out["waymarks"] = {kk: T(v) for kk, v in scene["waymarks"].items()}
    return out


def cheatsheet():
    panels = [
        {"title": "Shock: tower ของ Tank/Healer", "title_en": "Shock: tank/healer towers", "strict": True, "scene": p_shock(1),
         "lines": ["Tank/Healer: donut + tower", "DPS: AoE วงกลม ยืนนอก tower"],
         "lines_en": ["Tanks/healers: donut + tower", "DPS: circle AoE, out of the towers"]},
        {"title": "Shock: tower ของ DPS", "title_en": "Shock: DPS towers", "strict": True, "scene": p_shock(2),
         "lines": ["DPS: donut + tower", "Tank/Healer: AoE วงกลม ยืนนอก tower"],
         "lines_en": ["DPS: donut + tower", "Tanks/healers: circles, out of towers"]},
        {"title": "Escelons' Fall ครั้งที่ 1 และ 3: จุดเริ่ม", "title_en": "Escelons' Fall 1 and 3: the start", "strict": True,
         "scene": p_ef_start(),
         "lines": ["เริ่ม: Tank/Healer ในวง · DPS นอกวง", "ชมพู = ใกล้ · ม่วง = ไกล · สลับกันรับ"],
         "lines_en": ["Start: tanks/healers in · DPS out", "Pink = near · purple = far · alternate"]},
        {"title": "Escelons' Fall ครั้งที่ 2", "title_en": "Escelons' Fall 2", "strict": False, "scene": p_ef2(),
         "lines": ["กลุ่มที่ไม่ได้ donut ล่อ cone ก่อน"],
         "lines_en": ["The group without the donut baits first"]},
        {"title": "Blessed Barricade: ฝั่งของกลุ่ม", "title_en": "Blessed Barricade: sides", "strict": False, "scene": p_bb(),
         "lines": ["Tank/Healer ตะวันตก · DPS ตะวันออก", "tower ละ 3 คน · คนโดนสายล่อฟัน"],
         "lines_en": ["Tanks/healers west · DPS east", "3 per tower · tethered bait cleaves"]},
        {"title": "Blessed Barricade: ฟันฝั่งที่ถือดาบ", "title_en": "Blessed Barricade: the sword side", "strict": False,
         "scene": p_cleave(),
         "lines": ["ร่างแยกฟันครึ่งที่ดาบชี้", "คนโดนสายหันดาบออกนอกสนาม"],
         "lines_en": ["Cleaves the half its sword is on", "Tethered: turn the sword outside"]},
        {"title": "Roseblood: 3rd Bloom (Kurapon)", "title_en": "Roseblood: 3rd Bloom (Kurapon)", "strict": True, "scene": p_b3(),
         "lines": ["ช่องแดงคู่ในวงใน = ทิศเหนือ", "มีกุหลาบ: ทิ้งที่จุดชมพู แล้วออก", "ไม่มีกุหลาบ: เข้า tower"],
         "lines_en": ["The inner red pair = north", "Rose: drop on the pink spot, then leave", "No rose: take a tower"]},
        {"title": "Roseblood: 4th Bloom: วางกุหลาบ", "title_en": "Roseblood: 4th Bloom: roses", "strict": True, "scene": p_b4(),
         "lines": ["แถวใน D1·MT / D2·ST", "แถวนอก D3·H1 / D4·H2", "AoE อย่าโดนช่องแดงอีกฝั่ง"],
         "lines_en": ["Inner row D1·MT / D2·ST", "Outer row D3·H1 / D4·H2", "Keep AoEs off the other side's red"]},
        {"title": "Roseblood: 4th Bloom: สายหนาม", "title_en": "Roseblood: 4th Bloom: thorns", "strict": False, "scene": p_b4t(),
         "lines": ["1 รวมที่ใต้จริง (หลังบอส)", "2 Tank/Healer ตะวันตก · DPS ตะวันออก", "stack: ยืนบนช่องกุหลาบ"],
         "lines_en": ["1 Gather true south (behind the boss)", "2 Tanks/healers west · DPS east", "Stack: stand on the rose tiles"]},
        {"title": "Roseblood: 6th Bloom แบบที่ 1", "title_en": "Roseblood: 6th Bloom, floor 1", "strict": True, "scene": p_b6(1),
         "lines": ["MT·D3 / ST·D4 / H1·D1 / H2·D2", "ทิ้งกุหลาบสลับกับช่องแดง"],
         "lines_en": ["MT·D3 / ST·D4 / H1·D1 / H2·D2", "Drop roses between the red tiles"]},
        {"title": "Roseblood: 6th Bloom แบบที่ 2", "title_en": "Roseblood: 6th Bloom, floor 2", "strict": True, "scene": p_b6(2),
         "lines": ["mitigate 3–4 อย่าง หรือ Tank LB3", "ตอนเริ่มร่าย Holy Hazard", "ยอมโดน cone 1 ครั้ง"],
         "lines_en": ["3–4 mitigations or a tank LB3", "as Holy Hazard starts", "Take one cone on purpose"]},
    ]
    for p in panels:
        if p.get("scene"):
            p["scene"] = fit(p["scene"], max(len(p.get("lines") or []), len(p.get("lines_en") or [])))
    return {
        "title": "Zelenia (Extreme) — Cheatsheet",
        "title_en": "Zelenia (Extreme) — Cheatsheet",
        "columns": 3,
        "panels": panels,
        "footer": "คู่ประจำ: MT·D3 / ST·D4 / H1·D1 / H2·D2",
        "footer_en": "Pairs: MT·D3 / ST·D4 / H1·D1 / H2·D2",
        "credit": "อ้างอิง cheatsheet จาก xivjpraids.com (ภาพโดย Kanabin) · แปลและวาดใหม่โดย Cafe And SHabu",
        "credit_en": "Cheatsheet after xivjpraids.com (picture by Kanabin) · translated and redrawn by Cafe And SHabu",
    }
