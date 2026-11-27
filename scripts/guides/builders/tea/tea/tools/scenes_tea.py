"""Every scene of the TEA guide, redrawn from Tuufless's Notes (Elemental DC PF) diagrams.

The source diagrams are square (500x500), so every scene is frame [1, 1]: x and y are both
percent of the side. Positions were read off 5 % grid sheets (.work/tea/grid) and checked on
compare sheets.
"""
import math

R = lambda v: round(v, 2)

# colours, close to the source's
TELE = "#9be08f"      # telegraphed cone (green)
UNTELE = "#cfeaf5"    # untelegraphed cone (pale blue)
YEL = "#f2cf2a"       # baited AoE (yellow)
PINK = "#f08a8a"      # AoE in red/pink
WATER = "#7fb6d9"     # water stack / ice
NAVY = "#1d2257"      # void puddle
GREEN_ORB = "#2f8f3a"
ODD = "#3d74e0"
EVEN = "#e03a3a"

P1_FLOOR = {"shape": "circle", "at": [50, 51], "r": 49, "fill": "#7a5a3e", "lines": False, "edge": "#3a2a1c"}
LC_FLOOR = {"shape": "circle", "at": [50, 50], "r": 49.5, "fill": "#73563d", "lines": False, "edge": "#3a2a1c"}
BJ_FLOOR = {"shape": "circle", "at": [50, 50], "r": 49, "fill": "#8a7a55", "lines": False, "edge": "#3d3522"}
P3_FLOOR = {"shape": "circle", "at": [50, 50], "r": 49, "fill": "#5e5639", "lines": False, "edge": "#2b2718"}
P4_FLOOR = {"shape": "circle", "at": [50, 50], "r": 49, "fill": "#7b6a3d", "lines": False, "edge": "#3a311a"}


def ang(p0, p1):
    return math.degrees(math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]))) % 360


def dist(p0, p1):
    return math.hypot(p1[0] - p0[0], p1[1] - p0[1])


def off(c, a, r):
    t = math.radians(a)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r)


def P(p):
    return [R(p[0]), R(p[1])]


def circle(at, r, c=PINK, o=0.45, wd=0.2):
    return {"t": "circle", "at": P(at), "r": R(r), "c": c, "o": o, "wd": wd}


def ring(at, r, c, wd=0.5, o=0.95):
    return {"t": "ring", "at": P(at), "r": R(r), "c": c, "wd": wd, "o": o}


def cone(at, d, spread, ln, c=PINK, o=0.45, wd=0.05):
    return {"t": "cone", "at": P(at), "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=PINK, o=0.45, wd=0.05):
    return {"t": "rect", "at": P(at), "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def band(p0, p1, w, c=PINK, o=0.45):
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    return rect(mid, w, dist(p0, p1), ang(p0, p1), c, o)


def donut(at, r, r2, c=PINK, o=0.45):
    return {"t": "donut", "at": P(at), "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.05}


def line(p0, p1, c="#ffffff", wd=0.5, o=0.95, dash=False):
    s = {"t": "line", "from": P(p0), "to": P(p1), "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c="#ffffff", wd=0.6, o=0.95):
    return {"t": "arrow", "from": P(p0), "to": P(p1), "c": c, "wd": wd, "o": o}


def curve(pts, c="#ffffff", wd=0.55, o=0.95):
    """A bent arrow through points: lines, an arrowhead on the last piece."""
    out = [line(pts[i], pts[i + 1], c, wd, o) for i in range(len(pts) - 2)]
    out.append(arrow(pts[-2], pts[-1], c, wd, o))
    return out


def dot(at, r, c, o=1.0):
    return {"t": "dot", "at": P(at), "r": R(r), "c": c, "o": o}


def text(at, s, size=3.0, c="#ffffff"):
    return {"t": "text", "at": P(at), "s": s, "size": size, "c": c}


def num(n, at, r=2.7):
    """A Limit Cut number: white disc, blue ring for odd, red for even."""
    col = ODD if n % 2 else EVEN
    return [dot(at, r, "#ffffff"), ring(at, r, col, 0.45), text((at[0], at[1] + 0.15), str(n), r * 1.15, col)]


def nums(d):
    out = []
    for n, at in d.items():
        out += num(int(n), at)
    return out


def tag(at, s, size=2.6, c="#ffffff"):
    return text(at, s, size, c)


def roles(**kw):
    return {k: P(v) for k, v in kw.items()}


def sc(arena, shapes, rl=None, boss=None, **kw):
    s = {"frame": [1, 1], "arena": arena, "shapes": shapes}
    if rl:
        s["roles"] = rl
    if boss is not None:
        s["boss"] = boss
    s.update(kw)
    return s


# ============================================================ waymarks
# WaymarkPresetPlugin positions around (100, 100), about 2.5 % of the side per yalm
WM = {"A": (50, 20), "B": (85, 50), "C": (50, 90), "D": (10, 50),
      "1": (30.5, 69.5), "2": (50, 69.5), "3": (69.5, 69.5), "4": (69.5, 50)}


def waymarks():
    """Tuufless's marker layout (WaymarkPresetPlugin positions, arena about 23 yalms across the radius)."""
    sh = [circle((50, 50), 30, "#a08860", 0.35, 0.05), ring((50, 50), 46.5, "#d9c9ff", 0.6, 0.8)]
    sh += [text((50, 7.5), "N", 3.2, "#ffd84d")]
    return sc(P4_FLOOR, sh, waymarks={k: P(v) for k, v in WM.items()}, markSize=7, boss=[50, 14], bossSize=8)


# ============================================================ P1 Living Liquid
PUDDLES = [((50, 20.5), 15), ((16, 53), 15), ((84, 53), 15)]


def p1_base():
    sh = [circle((50, 52), 27, "#a3896a", 0.45, 0.05), ring((50, 51), 46.8, "#efe9e0", 0.55, 0.85)]
    for c, r in PUDDLES:
        sh.append(circle(c, r, "#bcd6df", 0.82, 0.25))
    return sh


def liquid(at, face=0, r=7.5):
    """Living Liquid's target circle (red) with a facing tick."""
    tip = off(at, face, r + 1.6)
    return [ring(at, r, "#e02020", 0.7, 0.95), arrow(off(at, face, r - 0.8), tip, "#e02020", 0.7, 0.95)]


def hand(at, r=3.6, label=True):
    out = [ring(at, r, "#ff5a5a", 0.45, 0.95)]
    if label:
        out.append(tag((at[0], at[1] + r + 2.2), "Hand", 2.4, "#ffd0d0"))
    return out


def doll(at, owner=None):
    out = [ring(at, 1.8, "#ff4040", 0.4, 0.95), dot(at, 0.7, "#ff4040")]
    if owner:
        out.insert(0, line(at, owner, "#f2d33a", 0.25, 0.9))
    return out


def ll_cone(d, c=UNTELE, o=0.55, at=(50, 52), spread=18, ln=56):
    return cone(at, d, spread, ln, c, o, 0.1)


def p1_01():
    sh = p1_base() + liquid((67, 30), 10) + hand((40, 71)) + [tag((67, 30), "LL", 3, "#ffffff")]
    return sc(P1_FLOOR, sh, roles(MT=(68, 18), D1=(60, 40), H1=(11, 36), D2=(44, 66), ST=(35, 79), D3=(25, 80), D4=(79, 77), H2=(88, 71)))


def p1_02():
    sh = p1_base()
    sh += [cone((50, 20.5), 78, 22, 45, TELE, 0.6), cone((16, 53), 345, 18, 34, TELE, 0.6), cone((84, 53), 160, 18, 34, TELE, 0.6)]
    sh += liquid((67, 30), 10) + [tag((67, 30), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(70, 18), ST=(70, 36), D1=(61, 41), D2=(38, 41), H1=(11, 36), D3=(28, 76), D4=(72, 76), H2=(89, 71)))


def p1_03():
    sh = p1_base()
    sh += [cone((50, 20.5), 72, 20, 48, UNTELE, 0.6), cone((16, 53), 340, 16, 40, UNTELE, 0.6), cone((84, 53), 160, 16, 42, UNTELE, 0.6)]
    sh += [cone((68, 22), 0, 80, 18, PINK, 0.5)]
    sh += liquid((68, 22), 0) + hand((68, 22), 5.2, False) + [tag((68, 22), "LL", 3)]
    sh += doll((44, 33)) + doll((64, 41)) + doll((35, 56), (25, 74)) + doll((55, 63), (64, 85))
    return sc(P1_FLOOR, sh, roles(MT=(66, 8), ST=(70, 32), D1=(65, 44), D2=(44, 36), H1=(18, 32), H2=(82, 69), D3=(25, 74), D4=(64, 85)))


def p1_04():
    sh = p1_base()
    for c in ((44, 37), (64, 45), (36, 57), (56, 64)):
        sh.append(circle(c, 17, PINK, 0.38, 0.15))
    sh += [cone((16, 53), 340, 16, 40, UNTELE, 0.55), cone((84, 53), 165, 16, 46, UNTELE, 0.55), cone((50, 20.5), 60, 18, 40, UNTELE, 0.5)]
    sh += liquid((68, 22), 0) + hand((68, 22), 5.2, False) + [tag((68, 22), "LL", 3)]
    sh += doll((44, 37)) + doll((64, 45)) + doll((36, 57), (25, 74)) + doll((56, 64), (65, 85))
    return sc(P1_FLOOR, sh, roles(MT=(67, 8), ST=(70, 32), D2=(44, 36), D1=(64, 44), H1=(19, 32), H2=(82, 70), D3=(25, 74), D4=(65, 85)))


def p1_05():
    sh = p1_base()
    sh += [arrow((18, 53), (68, 15), "#2aa7a0", 0.6), arrow((82, 53), (69, 16), "#2aa7a0", 0.6),
           dot((42, 35), 2.4, "#8fd3ff"), dot((76, 35), 2.4, "#8fd3ff")]
    sh += liquid((50, 52), 0) + hand((50, 52), 5.2, False) + [tag((50, 52), "LL", 3)]
    sh += doll((25, 71), (31, 69)) + doll((73, 77), (67, 72))
    return sc(P1_FLOOR, sh, roles(MT=(43, 61), D1=(51, 60), H1=(53, 62), H2=(52, 61.5), D2=(53, 60.5), D3=(31, 69), D4=(67, 72)))


def p1_06():
    sh = p1_base() + [circle((25, 70), 17, PINK, 0.4, 0.15), circle((73, 74), 17, PINK, 0.4, 0.15)]
    sh += liquid((50, 52), 0) + hand((50, 52), 5.2, False) + [tag((50, 52), "LL", 3)]
    sh += doll((25, 70), (32, 69)) + doll((73, 76), (67, 73))
    return sc(P1_FLOOR, sh, roles(MT=(42, 46), ST=(57, 46), D1=(51, 60), H1=(53, 62), H2=(52, 61.5), D2=(53, 60.5), D3=(32, 69), D4=(67, 73)))


def p1_07():
    sh = p1_base() + [cone((50, 52), 0, 160, 21, PINK, 0.5)]
    sh += liquid((50, 52), 0) + hand((50, 52), 5.2, False) + [tag((50, 52), "LL", 3)]
    sh += doll((25, 70), (32, 66)) + doll((73, 75), (67, 70))
    return sc(P1_FLOOR, sh, roles(MT=(41, 43), ST=(56, 43), D1=(51, 58), H1=(53, 60), H2=(52, 59.5), D2=(53, 58.5), D3=(32, 66), D4=(67, 70)))


def p1_08():
    sh = p1_base() + [ll_cone(0, TELE, 0.6), ll_cone(180, TELE, 0.6)] + liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    g = (50, 60)
    return sc(P1_FLOOR, sh, roles(MT=(50, 37), H1=g, ST=(50.6, 60.6), H2=(51.2, 61.2), D1=(51.8, 61.8), D2=(52.4, 62.4), D3=(53, 63), D4=(53.6, 63.6)))


def p1_09():
    sh = p1_base() + [ll_cone(a) for a in (0, 315, 45, 270, 90)]
    for c in ((26, 69), (75, 69), (40, 80), (60, 80)):
        sh.append(circle(c, 12.5, YEL, 0.5, 0.1))
    sh += liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(41, 43), ST=(58, 43), D1=(38, 52), D2=(61, 52), D3=(26, 69), D4=(75, 69), H1=(40, 80), H2=(60, 80)))


def p1_10():
    sh = p1_base() + [ll_cone(a) for a in (0, 241, 198, 156, 117)]
    sh += liquid((50, 52), 0) + [tag((50, 52), "LL", 3)] + hand((60, 43))
    return sc(P1_FLOOR, sh, roles(MT=(40, 37), D1=(38, 41), ST=(62, 37), D2=(64, 41), D3=(39, 58), H1=(47, 61), H2=(54, 61), D4=(62, 58)))


def p1_11():
    sh = p1_base() + [circle((40, 41), 14, PINK, 0.42, 0.1), circle((59, 41), 14, PINK, 0.42, 0.1),
                      line((40, 41), (18, 52), "#4fd2e6", 0.5), line((59, 41), (49, 23), "#4fd2e6", 0.5)]
    sh += liquid((50, 52), 315) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(40, 41), ST=(59, 41), H1=(47, 61), H2=(48.5, 62), D1=(50, 60), D2=(51.5, 61), D3=(49, 62), D4=(52, 62.5)))


def p1_12():
    sh = p1_base() + liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(D3=(47, 31), D4=(53, 31), MT=(47, 37), ST=(53, 37), D1=(47, 59), D2=(53, 59), H1=(47, 66), H2=(53, 66)))


def p1_13():
    sh = p1_base() + [ll_cone(0, TELE, 0.6), ll_cone(180, TELE, 0.6)] + liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(D3=(47, 32), D4=(53, 32), MT=(47, 38), ST=(53, 38), D1=(47, 58), D2=(53, 58), H1=(47, 66), H2=(53, 66)))


def p1_14():
    sh = p1_base() + [ll_cone(a) for a in (0, 330, 270, 90, 180)]
    for c in ((68, 20), (78, 32), (23, 67), (78, 67)):
        sh.append(circle(c, 12.5, YEL, 0.5, 0.1))
    sh += liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(45, 40), ST=(39, 50), D2=(59, 51), D1=(50, 58), D3=(68, 20), D4=(78, 32), H1=(23, 67), H2=(78, 67)))


def p1_15():
    sh = p1_base() + [cone((50, 20.5), 96, 20, 50, TELE, 0.6), cone((16, 53), 168, 18, 48, TELE, 0.6), cone((84, 53), 192, 18, 48, TELE, 0.6)]
    for c in ((68, 20), (78, 32), (22, 68), (78, 68)):
        sh.append(circle(c, 12.5, YEL, 0.5, 0.1))
    sh += liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(42, 36), ST=(38, 36), D1=(37, 50), D2=(63, 52), D3=(68, 20), D4=(78, 32), H1=(22, 68), H2=(78, 68)))


def p1_16():
    sh = p1_base() + [cone((16, 53), 168, 18, 48, UNTELE, 0.45), cone((84, 53), 192, 18, 48, UNTELE, 0.45)]
    sh += [ll_cone(a) for a in (0, 30, 65, 200, 160)]
    sh += liquid((50, 52), 0) + [tag((50, 52), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(MT=(42, 37), ST=(38, 37), D3=(55, 41), D4=(59, 46), H1=(47, 58), H2=(53, 58), D1=(37, 50), D2=(64, 53)))


def p1_17():
    sh = p1_base() + [cone((50, 20.5), 288, 16, 38, UNTELE, 0.6), cone((16, 53), 172, 16, 50, UNTELE, 0.55), cone((84, 53), 188, 16, 50, UNTELE, 0.55)]
    sh += liquid((31, 25), 0) + [tag((31, 25), "LL", 3)] + hand((78, 30))
    return sc(P1_FLOOR, sh, roles(MT=(31, 14), ST=(84, 27), D3=(55, 42), D4=(59, 49), H1=(46, 61), H2=(53, 61), D1=(22, 82), D2=(78, 82)))


def p1_18():
    sh = p1_base() + [arrow((83, 53), (31, 10), "#2aa7a0", 0.6), arrow((50, 21), (93, 40), "#2aa7a0", 0.6),
                      dot((56, 35), 2.4, "#8fd3ff"), dot((71, 27), 2.4, "#8fd3ff")]
    sh += liquid((50, 53), 0) + hand((50, 53), 5.2, False) + [tag((50, 53), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(D1=(42, 47), D2=(48, 44), D3=(55, 42), D4=(59, 49), ST=(42, 59), H1=(47, 61), H2=(53, 61), MT=(59, 59)))


def p1_19():
    sh = p1_base() + [cone((50, 55), 135, 90, 18, PINK, 0.5)] + liquid((50, 55), 135) + [tag((50, 55), "LL", 3)]
    return sc(P1_FLOOR, sh, roles(H2=(44, 39), D3=(56, 39), D1=(43, 44), D2=(44.5, 43), H1=(47, 46), D4=(54, 45), ST=(42, 56), MT=(60, 56)))


# ============================================================ P2 Limit Cut
LC_D, LC_R = 34, 24


def lc_base():
    return [circle((50, 50), 31, "#8f7256", 0.35, 0.05), ring((50, 50), 46.5, "#e8d7c4", 0.4, 0.7)]


def boom(a, n, r=LC_R, d=LC_D):
    """A Hawk Blaster explosion: angle a (None = the middle), its number written big."""
    c = (50, 50) if a is None else off((50, 50), a, d)
    return [circle(c, r if a is not None else 24, YEL, 0.42, 0.15), text(c, str(n), 9, "#fff3c0")]


def pair(a, n):
    return boom(a, n) + boom(a + 180, n)


def lc(shapes, numbers, extra=None):
    sh = lc_base() + shapes + (extra or []) + nums(numbers)
    return sc(LC_FLOOR, sh)


def half_tint(p0, p1):
    """The north (west) half tinted blue: a half disc on the arena, cut along the line p0-p1."""
    a = ang(p0, p1)
    return [cone((50, 50), a - 135, 90, 49.3, "#3a4a9a", 0.42, 0.01), cone((50, 50), a - 45, 90, 49.3, "#3a4a9a", 0.42, 0.01),
            line(p0, p1, "#d0d0d0", 0.5, 0.9)]


def cleave(at, d, spread=55, ln=26):
    return cone(at, d, spread, ln, PINK, 0.42)


def lc_overview_1211():
    sh = half_tint((3, 72), (97, 34)) + [circle((50, 20), 24, YEL, 0.38, 0.1), circle((50, 82), 24, YEL, 0.38, 0.1)]
    sh += curve([(50, 12), (64, 14), (76, 23)]) + [text((63, 19), "1", 4)]
    sh += curve([(79, 30), (85, 48), (78, 76)]) + [text((83, 50), "2", 4)]
    sh += curve([(76, 80), (64, 89), (50, 91)]) + [text((63, 84), "1", 4)]
    sh += curve([(50, 91), (36, 89), (22, 80)]) + [text((37, 84), "1", 4)]
    return sc(LC_FLOOR, lc_base() + sh)


def lc_1211(k):
    S = {
        1: (pair(0, 1), {7: (49, 46), 5: (52, 53), 3: (47, 52), 1: (51, 45), 8: (48, 53), 6: (53, 52), 2: (49, 49), 4: (54, 49)}, None),
        2: (pair(45, 2), {7: (37, 13), 5: (44, 20), 3: (39, 18), 1: (40, 12), 8: (37, 19), 6: (45, 15), 2: (41, 15), 4: (46, 15)}, None),
        3: (pair(90, 3), {2: (75, 13), 1: (84, 22), 8: (63, 24), 6: (65, 21), 4: (66, 23), 7: (67, 21), 5: (66, 25), 3: (68, 24)}, None),
        4: (pair(135, 4), {2: (77, 13), 1: (86, 22), 8: (78, 46), 6: (80, 44), 4: (81, 45), 7: (81, 44), 5: (82, 46), 3: (84, 45)},
            [cleave((78, 28), 50), band((78, 28), (74, 0), 7)]),
        5: (boom(None, 5), {8: (77, 70), 6: (78, 69), 2: (79, 71), 7: (80, 70), 5: (79, 72), 1: (79, 70), 4: (87, 78), 3: (78, 87)}, None),
        6: (pair(0, 6), {8: (74, 70), 6: (75, 69), 2: (76, 71), 7: (77, 70), 5: (76, 72), 1: (75, 70), 4: (86, 78), 3: (77, 87)},
            [cleave((72, 80), 150), band((72, 80), (100, 75), 7)]),
        7: (pair(45, 7), {8: (53, 79), 2: (55, 80), 3: (54, 78), 4: (56, 79), 7: (54, 80), 1: (55, 78), 5: (44, 95), 6: (56, 95)}, None),
        8: (pair(90, 8), {8: (22, 87), 7: (13, 78), 1: (28, 77), 2: (29, 79), 3: (27, 78), 4: (30, 78), 5: (43, 96), 6: (56, 96)},
            [cleave((48, 86), 195), band((48, 86), (60, 100), 7)]),
        9: (pair(135, 9), {8: (22, 87), 7: (13, 78), 2: (20, 57), 3: (21, 55), 4: (22, 57), 5: (21, 56), 6: (23, 56), 1: (22, 56)}, None),
        10: (boom(None, 10), {8: (22, 87), 7: (13, 78), 2: (20, 57), 3: (21, 55), 4: (22, 57), 5: (21, 56), 6: (23, 56), 1: (22, 56)},
             [cleave((20, 72), 215), band((20, 72), (10, 100), 7)]),
    }
    shapes, numbers, extra = S[k]
    return lc(shapes, numbers, extra)


def lc_overview_1256():
    sh = half_tint((0, 69), (96, 32))
    return lc(sh, {1: (36, 25), 2: (43, 25), 5: (40, 31), 6: (47, 31), 3: (54, 68), 4: (61, 68), 7: (57, 74), 8: (64, 74)})


def lc_1256(k):
    S = {
        1: (pair(0, 1), {7: (49, 46), 5: (52, 53), 3: (47, 52), 1: (51, 45), 8: (48, 53), 6: (53, 52), 2: (49, 49), 4: (54, 49)}, None),
        2: (pair(45, 2), {6: (40, 6), 5: (44, 6), 2: (40, 17), 1: (46, 16), 3: (54, 85), 4: (61, 83), 7: (58, 94), 8: (62, 93)}, None),
        3: (pair(90, 3), {6: (72, 12), 5: (76, 15), 2: (66, 23), 1: (72, 26), 3: (27, 77), 4: (31, 81), 7: (21, 85), 8: (26, 88)}, None),
        4: (pair(135, 4), {2: (81, 34), 6: (93, 40), 5: (95, 44), 1: (85, 46), 3: (16, 54), 8: (6, 62), 7: (5, 59), 4: (21, 70)},
            [cleave((99, 46), 222, 38, 75), band((84, 40), (66, 0), 9)]),
        5: (boom(None, 5), {8: (10, 28), 7: (12, 25), 3: (22, 29), 4: (15, 43), 6: (80, 69), 5: (77, 72), 2: (88, 76), 1: (85, 78)}, None),
        6: (pair(0, 6), {8: (10, 28), 7: (12, 25), 3: (22, 29), 4: (17, 41), 6: (79, 67), 5: (75, 70), 2: (88, 74), 1: (86, 78)},
            [cleave((22, 33), 75, 60, 60), band((22, 35), (8, 100), 9)]),
        7: (pair(45, 7), {4: (43, 5), 3: (47, 5), 8: (43, 14), 7: (47, 14), 5: (52, 88), 6: (56, 87), 1: (54, 98), 2: (58, 97)}, None),
        8: (pair(90, 8), {4: (74, 12), 3: (78, 15), 8: (59, 17), 7: (72, 23), 5: (28, 77), 6: (40, 84), 1: (23, 87), 2: (26, 89)},
            [cleave((26, 82), 0, 40, 70), band((30, 80), (100, 96), 9)]),
        9: (pair(135, 9), {8: (79, 29), 4: (92, 35), 3: (93, 38), 7: (84, 46), 5: (11, 56), 6: (12, 58), 1: (14, 52), 2: (13, 57)}, None),
        10: (boom(None, 10), {8: (82, 34), 4: (94, 40), 3: (95, 42), 7: (84, 46), 5: (11, 56), 6: (12, 58), 1: (13, 54), 2: (12, 57)},
             [cleave((99, 47), 222, 38, 75), band((86, 46), (66, 0), 9)]),
    }
    shapes, numbers, extra = S[k]
    return lc(shapes, numbers, extra)


def lc_breakdown():
    """Cruise Chaser behind 1 (facing out): cleave knocks 1 forward, then a dash at 2."""
    sh = lc_base() + [cone((52, 58), 330, 55, 28, PINK, 0.45), band((52, 58), (26, 70), 8), arrow((44, 44), (36, 30), "#ffd84d", 0.7)]
    sh += [text((58, 63), "CC", 3.4, "#ffd0d0"), dot((52, 58), 2.2, "#c0392b")]
    sh += nums({1: (46, 46), 2: (24, 71)})
    return sc(LC_FLOOR, sh)


# ============================================================ P2 Brute Justice + Cruise Chaser
def bj_base():
    return [circle((50, 50), 22, "#a39066", 0.5, 0.05), ring((50, 50), 46.5, "#e8e2d4", 0.55, 0.85)]


def bjcc(bj, cc):
    """BJ (green) and CC (red) as boss icons with their names."""
    return [bj, cc]


def labels(bj, cc):
    out = []
    if bj:
        out.append(tag((bj[0], bj[1] + 6.2), "BJ", 2.8, "#c8f5c0"))
    if cc:
        out.append(tag((cc[0], cc[1] + 6.2), "CC", 2.8, "#ffc8c8"))
    return out


def drop(at, n=None, c="#cfe9ff"):
    out = [circle(at, 4.6, c, 0.85, 0.2)]
    if n:
        out.append(text((at[0] + 4.5, at[1] + 1.5), str(n), 5, "#bff0ff"))
    return out


def sector(len_, c="#4fd35a"):
    """The green dotted sector south of the bosses that the DPS stay in."""
    a0, a1 = 135, 225
    p0, p1 = off((50, 50), a0, len_), off((50, 50), a1, len_)
    out = [line((50, 50), p0, c, 0.35, 0.9, True), line((50, 50), p1, c, 0.35, 0.9, True)]
    for k in range(6):
        q0 = off((50, 50), a0 + 15 * k, len_)
        q1 = off((50, 50), a0 + 15 * (k + 1), len_)
        out.append(line(q0, q1, c, 0.35, 0.9, True))
    return out


def bj_scene(shapes, rl, bj, cc, both_mid=False):
    if both_mid:
        boss = [[47, 49], [53, 49]]
        lab = [tag((50, 56), "BJ + CC", 2.6, "#ffe6c0")]
    else:
        boss = [P(b) for b in (bj, cc) if b]
        lab = labels(bj, cc)
    return sc(BJ_FLOOR, bj_base() + shapes + lab, rl, boss, bossSize=8)


def bj_overview():
    sh = drop((48, 15), 1) + drop((48, 88), 2) + drop((74, 69), 3)
    sh += [arrow((50, 22), (50, 80), "#e82020", 1.2), arrow((70, 61), (32, 24), "#e82020", 1.2), arrow((21, 50), (70, 64), "#e82020", 1.2)]
    sh += curve([(42, 86), (24, 80), (14, 70), (11, 58)], "#e82020", 1.2)
    sh += [text((32, 18), "Gavel", 3.0), text((13, 48), "Plasma", 3.0), text((13, 52.5), "Shield", 3.0)]
    return bj_scene(sh, None, None, None, True)


def bj_01():
    return bj_scene([], roles(D3=(45, 37), D4=(54, 37), H1=(38, 44), H2=(63, 44), ST=(37, 53), MT=(62, 53), D1=(45, 61), D2=(54, 61)), (31, 47), (69, 47))


def bj_02():
    sh = [band((6, 8), (94, 92), 16, PINK, 0.45)]
    return bj_scene(sh, roles(D3=(60, 6), D4=(75, 14), H2=(85, 25), MT=(91, 40), H1=(11, 53), ST=(14, 74), D1=(28, 88), D2=(44, 95)), (25, 64), (76, 42))


def bj_03():
    sh = [circle(c, 20, YEL, 0.32, 0.1) for c in ((60, 6), (75, 14), (85, 25), (91, 40), (11, 53), (14, 74), (28, 88), (44, 95))]
    sh += [arrow((37, 60), (46, 48))]
    return bj_scene(sh, roles(D3=(46, 37), D4=(55, 37), H1=(38, 44), ST=(49, 45), H2=(63, 44), MT=(62, 53), D1=(46, 61), D2=(55, 61)), (38, 53), (80, 45))


def bj_04():
    sh = [arrow((62, 54), (40, 54))]
    return bj_scene(sh, roles(D3=(45, 37), D4=(54, 37), H1=(37, 44), ST=(50, 45), H2=(62, 44), MT=(37, 52), D1=(45, 61), D2=(54, 61)), (32, 55), (80, 45))


def bj_05():
    return bj_scene([], roles(H1=(39, 34), D3=(41, 31), D4=(56, 31), H2=(60, 34), MT=(35, 50), ST=(65, 50), D2=(67, 53), D1=(50, 65)), None, None, True)


def bj_06():
    sh = [cone((50, 50), 255, 80, 26, PINK, 0.5)] + curve([(33, 52), (36, 60), (44, 64)])
    return bj_scene(sh, roles(D3=(38, 28), H1=(49, 26), D4=(61, 28), D2=(50, 36), ST=(61, 50), MT=(46, 66), D1=(50, 62), H2=(91, 50)), None, None, True)


def bj_07():
    sh = [circle((50, 22), 17, WATER, 0.5, 0.15), circle((70, 59), 17, YEL, 0.45, 0.15)]
    return bj_scene(sh, roles(D3=(39, 25), H1=(50, 22), D4=(61, 24), D2=(50, 33), MT=(33, 50), ST=(64, 50), D1=(69, 58), H2=(92, 50)), None, None, True)


def bj_08():
    sh = drop((49, 20)) + sector(28)
    sh += curve([(37, 24), (31, 46), (39, 70)]) + curve([(48, 28), (50, 46), (54, 62)]) + curve([(62, 24), (69, 46), (60, 70)])
    return bj_scene(sh, roles(H1=(8, 50), MT=(33, 50), ST=(67, 50), H2=(92, 50), D1=(41, 65), D2=(58, 65), D3=(45, 72), D4=(55, 72)), None, None, True)


def bj_09():
    sh = drop((49, 20)) + sector(45)
    sh += [circle((61, 37), 15, WATER, 0.5, 0.15), circle((3, 50), 7, "#d0582a", 0.85), circle((97, 50), 7, "#d0582a", 0.85),
           circle((21, 52), 11, "#8fd0c0", 0.45, 0.1), circle((79, 52), 11, "#8fd0c0", 0.45, 0.1),
           ring((41, 66), 11, "#f5e642", 0.6), ring((59, 66), 11, "#f5e642", 0.6)]
    sh += curve([(6, 51), (20, 51), (33, 67)]) + curve([(94, 51), (80, 51), (67, 67)])
    return bj_scene(sh, roles(ST=(61, 37), MT=(36, 50), D1=(42, 65), D2=(58, 65), H1=(37, 72), D3=(45, 72), D4=(55, 72), H2=(63, 72)), None, None, True)


def bj_10():
    sh = drop((49, 20)) + sector(45)
    sh += [circle((61, 37), 15, WATER, 0.5, 0.15), circle((25, 50), 20, YEL, 0.4, 0.1), circle((75, 50), 20, YEL, 0.4, 0.1),
           ring((41, 66), 11, "#f5e642", 0.6), ring((59, 66), 11, "#f5e642", 0.6)]
    return bj_scene(sh, roles(MT=(28, 50), ST=(71, 50), D1=(41, 65), D2=(58, 65), H1=(37, 72), D3=(45, 72), D4=(55, 72), H2=(63, 72)), None, None, True)


def bj_11():
    sh = drop((49, 20), None, "#eef6ff") + [circle((67, 33), 21, WATER, 0.5, 0.15)]
    return bj_scene(sh, roles(MT=(42, 59), ST=(57, 59), D1=(45, 63), D2=(60, 63), H1=(41, 72), D3=(46, 70), D4=(55, 70), H2=(60, 72)), None, None, True)


def bj_12():
    sh = drop((49, 20), None, "#ffffff") + [circle((50, 45), 17, YEL, 0.45, 0.15), circle((50, 77), 17, WATER, 0.5, 0.15)]
    sh += curve([(30, 70), (22, 55), (20, 40), (24, 30)])
    return bj_scene(sh, roles(MT=(45, 45), ST=(55, 45), D1=(45, 77), D2=(54, 77), D3=(45, 85), D4=(54, 85), H1=(25, 27), H2=(80, 65)), None, None, True)


def bj_13():
    sh = drop((49, 20), None, "#ffffff") + [cone((50, 50), 180, 90, 46, PINK, 0.42)] + drop((50, 82))
    sh += curve([(40, 82), (25, 75), (19, 58)])
    return bj_scene(sh, roles(H1=(49, 28), D3=(11, 45), D1=(19, 45), D4=(11, 54), D2=(19, 54), MT=(34, 50), ST=(50, 63), H2=(74, 64)), None, None, True)


def bj_14():
    sh = drop((49, 20), None, "#ffffff")
    sh += [arrow((18, 40), (44, 32)), arrow((18, 61), (44, 76))] + curve([(60, 32), (69, 46), (70, 66)]) + curve([(77, 32), (80, 48), (78, 64)])
    sh += [arrow((55, 66), (66, 72)), arrow((55, 79), (66, 79))]
    return bj_scene(sh, roles(H1=(50, 31), MT=(50, 40), ST=(50, 64), H2=(50, 76)), None, None, True)


def bj_15():
    sh = drop((49, 20), None, "#ffffff") + [circle((59, 32), 17, YEL, 0.45, 0.15), circle((67, 73), 17, WATER, 0.5, 0.15)]
    return bj_scene(sh, roles(H1=(50, 32), MT=(59, 27), ST=(37, 45), D2=(32, 62), D3=(68, 63), H2=(52, 70), D1=(61, 70), D4=(68, 70)), None, None, True)


def bj_16():
    sh = drop((49, 20), None, "#ffffff") + drop((70, 70))
    sh += [arrow((59, 32), (62, 14))] + curve([(58, 74), (25, 76), (12, 60), (16, 29)]) + curve([(40, 45), (30, 40), (24, 30)])
    return bj_scene(sh, roles(H2=(19, 21), ST=(26, 21), H1=(34, 21), D1=(42, 21), MT=(61, 9)), (28, 35), (65, 25))


def bj_17():
    sh = [circle((50, 50), 48.5, PINK, 0.38, 0.05), cone((49, 20), 260, 42, 52, BJ_FLOOR["fill"], 0.85, 0.05)]
    sh += drop((49, 20), None, "#ffffff") + drop((70, 70)) + curve([(62, 11), (55, 9), (51, 13)])
    return bj_scene(sh, roles(H2=(19, 21), ST=(26, 21), H1=(34, 21), MT=(42, 21)), None, (63, 22))


def bj_18():
    sh = [circle((66, 13), 10, PINK, 0.45, 0.1)] + curve([(36, 20), (49, 45), (51, 80)])
    return bj_scene(sh, roles(H1=(32, 17), D2=(38, 16), D4=(37, 13), MT=(63, 17), ST=(66, 15), D3=(50, 85)), (49, 26), (58, 23))


def bj_19():
    sh = [circle((50, 92), 22, YEL, 0.4, 0.1), cone((50, 78), 0, 110, 46, "#e0502a", 0.5)]
    return bj_scene(sh, roles(H1=(32, 15), D2=(38, 14), D4=(37, 11), MT=(65, 13), ST=(67, 15), D3=(51, 92)), (50, 84), (60, 22))


# ============================================================ P3 Alexander Prime
def p3_base():
    sh = [circle((50, 50), 20, "#7a7050", 0.5, 0.05), ring((50, 50), 46.5, "#a08a4a", 0.6, 0.8)]
    for k in range(8):
        sh.append(dot(off((50, 50), 45 * k, 45.5), 1.6, "#c0392b"))
    return sh


def p3(shapes, rl=None, boss=None, names=None, **kw):
    lab = []
    for (x, y), s in (names or []):
        lab.append(tag((x, y + 6), s, 2.6, "#ffe6c0"))
    return sc(P3_FLOOR, p3_base() + shapes + lab, rl, boss, bossSize=8, **kw)


TH, DPS = "#3a62c2", "#c2453c"


def who(at, c, label=None, below=True):
    out = [dot(at, 2.3, c)]
    if label:
        out.append(tag((at[0], at[1] + (4.4 if below else -4.4)), label, 2.3, "#ffffff"))
    return out


def stasis(flip):
    """Temporal Stasis: 01 has CC west, BJ east; 02 is the mirror (BJ west, CC east)."""
    sh = [line((9, 50), (94, 50), "#3b4cff", 0.7)]
    if not flip:
        sh += who((10, 50), TH, "T/H blue") + who((32, 45), TH, "T/H red/green", False) + who((32, 57), DPS, "DPS red/green")
        sh += who((69, 45), TH, "T/H none", False) + who((69, 57), DPS, "DPS none") + who((93, 52), DPS, "DPS blue") + who((88, 47), DPS, "Aggravated", False)
        boss, names = [[27, 51], [74, 51]], [((27, 51), "CC"), ((74, 51), "BJ")]
    else:
        sh += who((12, 52), TH, "T/H blue") + who((12, 47), DPS, "Aggravated", False) + who((32, 45), TH, "T/H red/green", False) + who((32, 57), DPS, "DPS red/green")
        sh += who((69, 45), TH, "T/H none", False) + who((69, 57), DPS, "DPS none") + who((93, 50), DPS, "DPS blue")
        boss, names = [[27, 51], [74, 51]], [((27, 51), "BJ"), ((74, 51), "CC")]
    sh += [line((32, 45), (32, 57), "#e04040", 0.5), line((32.6, 45), (32.6, 57), "#40c040", 0.5)]
    return p3(sh, None, boss, names)


PERSON = "#e8e0d0"


def inception_01():
    sh = [circle(c, 12, PINK, 0.45, 0.1) for c in ((37, 70), (63, 70), (37, 93), (63, 93))]
    orbs = [(18, 30), (10, 50), (89, 52), (84, 70)]
    teth = [((22, 20), (84, 70)), ((27, 15), (89, 52)), ((70, 15), (10, 50)), ((76, 20), (18, 30))]
    for a, b in teth:
        sh.append(line(a, b, "#8fe08a", 0.45))
    sh += [circle(c, 7, GREEN_ORB, 0.9, 0.2) for c in orbs]
    for p in [(22, 20), (27, 15), (70, 15), (76, 20), (37, 70), (63, 70), (37, 93), (63, 93)]:
        sh += who(p, PERSON)
    return p3(sh, None, [[50, 6], [3, 45], [96, 45]], [((50, 6), "Alex"), ((3, 45), "CC"), ((96, 45), "BJ")])


def inception_02():
    sh = [circle(c, 12, PINK, 0.45, 0.1) for c in ((37, 70), (63, 70), (37, 93), (63, 93))]
    sh += [circle(c, 18, GREEN_ORB, 0.4, 0.1) for c in ((20, 18), (80, 18), (5, 50), (95, 50))]
    sh += curve([(17, 22), (11, 32), (7, 42)]) + curve([(83, 22), (89, 32), (93, 42)])
    sh += [text((15, 7), "1", 3.6), text((85, 7), "1", 3.6)]
    for p in [(25, 13), (75, 13), (5, 50), (96, 50), (37, 70), (63, 70), (37, 93), (63, 93)]:
        sh += who(p, PERSON)
    return p3(sh, None, [[50, 4]], [((50, 4), "Alex")])


def heart(at):
    return [dot(at, 2.0, "#f5e05a"), text((at[0], at[1] + 0.2), "♥", 3.0, "#8a6d00")]


def inception_03():
    sh = [circle(c, 18, GREEN_ORB, 0.38, 0.1) for c in ((20, 13), (79, 13), (7, 50), (93, 50))]
    sh += curve([(5, 47), (12, 25), (35, 10), (66, 13)]) + curve([(50, 78), (52, 45), (62, 20)])
    sh += curve([(90, 30), (86, 46)]) + curve([(95, 30), (95, 52)])
    sh += heart((50, 69))
    return p3(sh, roles(D3=(76, 16), H1=(80, 20), ST=(85, 49), MT=(93, 58)), [[48, 8], [96, 44]], [((48, 8), "Alex"), ((96, 44), "BJ")])


def inception_04():
    bj = (96, 47)
    sh = [cone(bj, 232, 42, 78, PINK, 0.32), cone(bj, 270, 42, 78, PINK, 0.32), cone(bj, 306, 42, 78, PINK, 0.32)]
    sh += [text((88, 72), "1", 4.4, "#ffe0e0"), text((72, 50), "2", 4.4, "#ffe0e0"), text((88, 30), "3", 4.4, "#ffe0e0")]
    sh += heart((50, 69))
    return p3(sh, roles(D3=(75, 16), H1=(80, 20), D1=(77, 18), ST=(86, 50), MT=(93, 58)), [list(bj), [6, 50]], [(bj, "BJ"), ((6, 50), "CC")])


def sacrament(at, d, w=24, c="#f4f0e0", o=0.32):
    """Alexander's Sacrament: a cross of two beams through him."""
    return [band(off(at, d, -120), off(at, d, 120), w, c, o), band(off(at, d + 90, -120), off(at, d + 90, 120), w, c, o)]


def inception_05():
    alex = (32, 12)
    sh = sacrament(alex, ang(alex, (50, 70)))
    sh += [circle((10, 72), 10, PINK, 0.42, 0.1), line((14, 71), (87, 40), "#3b4cff", 0.6), arrow((50, 70), (33, 17), "#e02020", 0.4)]
    sh += heart((50, 70))
    sh += who((13, 75), DPS, "Shared") + who((85, 40), DPS, "blue", False) + who((84, 31), DPS)
    return p3(sh, roles(ST=(7, 71), MT=(8, 77), H1=(89, 49), H2=(88, 44)), [list(alex)], [(alex, "Alex")])


def inception_06():
    sh = who((40, 50), DPS, "blue")
    return p3(sh, roles(H1=(51, 41), H2=(51, 58), MT=(75, 50), ST=(93, 50)), [[7, 50], [50, 50]], [((7, 50), "BJ"), ((56, 46), "CC")])


def inception_07():
    sh = [cone((50, 50), 0, 90, 70, PINK, 0.4), cone((50, 50), 270, 90, 70, PINK, 0.4), cone((50, 50), 180, 90, 70, PINK, 0.4)]
    sh += who((39, 50), DPS, "blue")
    return p3(sh, roles(H1=(50, 41), H2=(50, 58), MT=(75, 50), ST=(93, 50)), [[7, 50], [50, 50]], [((7, 50), "BJ"), ((56, 46), "CC")])


def inception_08():
    sh = [circle((95, 47), 25, YEL, 0.4, 0.1), arrow((6, 50), (87, 50), "#e02020", 0.4)] + curve([(73, 55), (66, 66), (56, 69)])
    sh += who((40, 50), DPS, "blue")
    return p3(sh, roles(H1=(50, 41), H2=(50, 58), MT=(50, 70), ST=(93, 50)), [[50, 50], [92, 45]], [((56, 46), "CC"), ((92, 45), "BJ")])


def void(at, r=17):
    return circle(at, r, NAVY, 0.82, 0.1)


def wh(shapes, numbers, boss=None, names=None, rl=None):
    return p3(shapes + nums(numbers), rl, boss, names)


W_BOSS = [[50, 80]]
W_NAMES = [((50, 80), "Alex")]


def wormhole(k):
    if k == 1:
        n = {k_: (48 + (k_ % 3), 49 + (k_ % 2) * 2) for k_ in range(1, 9)}
        n[1] = (50, 49)
        return wh([], n, [[25, 15], [73, 20], [50, 80]], [((25, 15), "CC"), ((73, 20), "BJ"), ((50, 80), "Alex")])
    if k == 2:
        return wh([void((25, 42)), void((77, 57))], {1: (20, 20), 5: (13, 33), 7: (10, 37), 3: (22, 78), 2: (79, 20), 6: (89, 32), 8: (91, 36), 4: (82, 82)},
                  [[76, 16], [45, 80]], [((76, 16), "BJ"), ((45, 80), "Alex")])
    if k == 3:
        sh = [void((27, 42)), void((73, 53)), rect((50, 50), 11, 100, 0, PINK, 0.38), rect((50, 50), 11, 100, 90, PINK, 0.38),
              cone((32, 30), 315, 70, 30, PINK, 0.4), circle((20, 78), 20, YEL, 0.4, 0.1), arrow((76, 24), (25, 73), "#e02020", 0.4)]
        return wh(sh, {1: (21, 22), 5: (13, 32), 7: (11, 36), 2: (77, 22), 6: (87, 32), 8: (89, 36), 3: (21, 76), 4: (81, 80)},
                  [[33, 28], [50, 78]], [((33, 28), "CC"), ((50, 78), "Alex")])
    if k == 4:
        sh = [void((27, 42)), void((73, 55)), band((20, 20), (100, 14), 22, PINK, 0.38), cone((25, 68), 40, 50, 85, PINK, 0.35),
              line((33, 60), (78, 21), "#e02020", 0.35, 0.95, True)]
        return wh(sh, {1: (20, 20), 2: (79, 20), 5: (11, 42), 7: (6, 53), 8: (94, 47), 6: (90, 55), 3: (20, 80), 4: (84, 83)},
                  [[25, 68], [50, 82]], [((25, 68), "BJ"), ((50, 82), "Alex")])
    if k == 5:
        sh = [void((27, 45)), void((73, 55)), cone((25, 68), 40, 50, 85, PINK, 0.32), cone((22, 74), 210, 70, 26, PINK, 0.4)]
        sh += curve([(17, 23), (9, 28), (8, 34)]) + curve([(10, 40), (17, 35), (19, 24)]) + curve([(82, 23), (90, 28), (91, 39)]) + curve([(89, 44), (91, 34), (83, 23)])
        return wh(sh, {5: (19, 20), 1: (8, 37), 7: (12, 53), 3: (19, 80), 6: (80, 20), 2: (91, 42), 8: (88, 54), 4: (83, 83)},
                  [[22, 70], [50, 82]], [((22, 70), "CC"), ((50, 82), "Alex")])
    if k == 6:
        sh = [void((27, 45)), void((73, 55)), cone((25, 68), 40, 50, 85, PINK, 0.3), band((20, 74), (100, 92), 20, PINK, 0.38)]
        return wh(sh, {5: (19, 20), 1: (6, 50), 7: (13, 53), 3: (19, 80), 6: (80, 20), 2: (96, 50), 8: (88, 54), 4: (83, 84)},
                  [[22, 70], [50, 82]], [((22, 70), "CC"), ((50, 82), "Alex")])
    if k == 7:
        sh = [void((25, 47), 15), void((74, 55), 15), rect((50, 50), 40, 100, 0, "#f4f0e0", 0.3), rect((50, 88), 100, 20, 0, "#f4f0e0", 0.3),
              cone((25, 22), 315, 70, 26, PINK, 0.4)]
        sh += curve([(16, 80), (12, 77), (12, 75)]) + curve([(82, 80), (88, 77), (89, 74)])
        return wh(sh, {5: (19, 19), 1: (8, 36), 7: (12, 53), 3: (12, 72), 6: (80, 19), 2: (91, 41), 8: (88, 54), 4: (89, 71)},
                  [[25, 22], [50, 88]], [((25, 22), "CC"), ((50, 88), "Alex")])
    if k == 8:
        sh = [void((23, 43), 6), void((76, 55), 6), band((25, 18), (100, 10), 20, PINK, 0.38)]
        sh += curve([(6, 56), (8, 68), (15, 79)]) + curve([(15, 76), (13, 64), (8, 55)]) + curve([(78, 79), (82, 66), (90, 56)]) + curve([(92, 55), (87, 70), (81, 79)])
        return wh(sh, {5: (19, 19), 1: (23, 44), 3: (7, 52), 7: (18, 80), 6: (80, 19), 2: (76, 52), 4: (93, 50), 8: (80, 82)},
                  [[22, 18], [50, 82]], [((22, 18), "CC"), ((50, 82), "Alex")])
    if k == 9:
        sh = [void((22, 45), 6), void((76, 55), 6), cone((22, 76), 210, 70, 26, PINK, 0.4)]
        sh += curve([(20, 22), (31, 32), (41, 40)]) + curve([(78, 22), (70, 32), (60, 40)])
        return wh(sh, {1: (23, 48), 2: (76, 55), 3: (41, 43), 5: (47, 44), 6: (53, 45), 4: (61, 43), 7: (18, 82), 8: (80, 82)},
                  [[22, 72], [50, 82]], [((22, 72), "CC"), ((50, 82), "Alex")])
    if k == 10:
        sh = [band((25, 76), (100, 90), 20, PINK, 0.38), arrow((27, 72), (48, 51), "#e02020", 0.45),
              line((31, 64), (36, 69), "#e02020", 0.6), line((36, 64), (31, 69), "#e02020", 0.6)]
        sh += curve([(18, 73), (22, 60), (34, 52), (43, 50)])
        return wh(sh, {1: (23, 47), 3: (41, 43), 5: (48, 44), 6: (54, 45), 4: (61, 43), 2: (76, 55), 7: (19, 80), 8: (80, 81)},
                  [[25, 76], [50, 84]], [((25, 76), "CC"), ((50, 84), "Alex")])
    raise KeyError(k)


def wormhole_11():
    sh = [circle((50, 50), 11, PINK, 0.42, 0.1)]
    return p3(sh, roles(D1=(44, 47), MT=(50, 47), D2=(56, 47), D3=(44, 53), D4=(56, 53), ST=(50, 52), H1=(50, 53.5), H2=(50, 55)),
              [[20, 73], [50, 80]], [((20, 73), "BJ"), ((50, 80), "Alex")])


def wormhole_12():
    sh = [ring((40, 47), 12, "#f5e642", 0.6), ring((64, 52), 12, "#f5e642", 0.6)]
    sh += curve([(45, 42), (51, 41), (56, 44)]) + curve([(56, 56), (50, 57), (46, 53)])
    return p3(sh, roles(MT=(50, 30), ST=(50, 65), H1=(32, 47), D1=(40, 47), D3=(38, 55), D2=(59, 47), H2=(67, 47), D4=(64, 55)), [[50, 80]], W_NAMES)


def wormhole_12b():
    sh = [ring((48, 37), 12, "#f5e642", 0.6), ring((51, 63), 12, "#f5e642", 0.6)]
    return p3(sh, roles(MT=(48, 33), ST=(54, 36), D1=(49, 39), H1=(47, 62), H2=(53, 61), D4=(52, 64), D2=(33, 50), D3=(66, 48)), [[50, 80]], W_NAMES)


def wormhole_faq():
    sh = [void((27, 42)), void((73, 55)), cone((25, 70), 30, 55, 85, PINK, 0.38), line((33, 62), (88, 31), "#e02020", 0.35, 0.95, True),
          arrow((82, 21), (86, 27), "#ffffff", 0.5), line((81, 80), (89, 88), "#ff2020", 0.9), line((89, 80), (81, 88), "#ff2020", 0.9)]
    return wh(sh, {1: (20, 20), 5: (11, 42), 7: (5, 53), 3: (20, 80), 2: (88, 31), 8: (94, 47), 6: (90, 55)},
              [[25, 70], [50, 82]], [((25, 70), "BJ"), ((50, 82), "Alex")])


# ============================================================ P4 Perfect Alexander
LIGHT, DARK = "#f2b33a", "#9a55d6"


def p4_base():
    return [circle((50, 50), 18, "#a08a50", 0.45, 0.05), ring((50, 50), 46.5, "#c9b27a", 0.4, 0.6)]


def p4(shapes, rl=None, boss=None, names=None, **kw):
    lab = [tag((x, y + 6), s, 2.6, "#ffe6c0") for (x, y), s in (names or [])]
    return sc(P4_FLOOR, p4_base() + shapes + lab, rl, boss, bossSize=8, **kw)


def lp(at, label=None, below=True):
    return who(at, LIGHT, label, below)


def dp(at, label=None, below=True):
    return who(at, DARK, label, below)


def forced_march_01():
    sh = lp((14, 50), "Light Beacon") + dp((82, 50), "Dark Beacon") + [dot((73, 46), 2.3, PERSON), dot((71, 50), 2.3, PERSON), dot((75, 43), 2.3, PERSON),
                                                                     dot((76, 48), 2.3, PERSON), dot((68, 47), 2.3, PERSON), dot((74, 51), 2.3, PERSON)]
    sh += [arrow((80, 40), (60, 40), "#ffffff", 0.5), text((70, 36), "E → W", 2.8)]
    return p4(sh, None, [[50, 47]], [((50, 47), "PA")])


def forced_march_02():
    sh = [circle((31, 50), 12, PINK, 0.42, 0.1), circle((69, 50), 12, PINK, 0.42, 0.1)]
    return p4(sh, roles(H1=(26, 50), MT=(33, 50), D1=(36, 43), D3=(36, 57), ST=(64, 50), D2=(71, 50), H2=(76, 43), D4=(76, 57)), [[50, 47]], [((50, 47), "PA")])


def fca():
    clones = [(30, 5), (70, 5), (5, 30), (95, 30)]
    sh = []
    for c in ((30, 5), (5, 30), (95, 30)):
        sh += sacrament(c, ang(c, (50, 50)), 20, "#e0a0f0", 0.28)
    sh += [circle((23, 88), 9, PINK, 0.45, 0.1)]
    sh += who((67, 10), PERSON, "Defamation", True)
    sh += [dot((21, 87), 2.3, PERSON), dot((24, 89), 2.3, PERSON), dot((22, 90), 2.3, PERSON), dot((25, 86), 2.3, PERSON)]
    sh += [dot((40, 94), 2.3, PERSON), dot((43, 96), 2.3, PERSON), dot((42, 93), 2.3, PERSON)]
    sh += [tag((17, 81), "Shared + none", 2.3), tag((48, 90), "Aggravated", 2.3)]
    return p4(sh, None, [list(c) for c in clones], [((30, 5), "PA"), ((70, 5), "PA"), ((5, 30), "PA"), ((95, 30), "PA")])


def fcb_01():
    sh = lp((37, 9), "Light Beacon") + dp((87, 50), "Dark Beacon")
    sh += dp((80, 43), None) + dp((76, 50), None) + dp((79, 57), None)
    sh += [tag((71, 41), "red/green", 2.3), tag((68, 50), "none", 2.3), tag((79, 62), "blue", 2.3)]
    sh += [dot((86, 40), 2.0, LIGHT), dot((89, 42), 2.0, LIGHT), dot((88, 38), 2.0, LIGHT)]
    return p4(sh)


def fcb_positioning():
    """The source's close-up beside the Dark Beacon (north up)."""
    db = (60, 55)
    sh = dp(db, "Dark Beacon") + dp((47, 42), "red/green", False) + dp((44, 55), "none") + dp((47, 68), "blue")
    sh += [arrow((56, 52), (49, 45), "#ff3030", 0.5), arrow((56, 55), (47, 55), "#ff3030", 0.5), arrow((56, 58), (49, 65), "#ff3030", 0.5)]
    sh += [dot((52, 34), 2.0, LIGHT), dot((55, 36), 2.0, LIGHT), dot((53, 38), 2.0, LIGHT), tag((54, 30), "other Light", 2.3)]
    sh += [arrow((30, 20), (12, 6), "#ff3030", 0.5), tag((26, 25), "Light Beacon", 2.3)]
    sh += [arrow((90, 30), (90, 14), "#ff3030", 0.7), text((90, 10), "N", 4, "#ff3030")]
    return p4(sh)


def fcb(k):
    clones4 = [[30, 4], [65, 4], [5, 25], [95, 25]]
    if k == 2:
        sh = [line((36, 10), (36, 90), "#3b4cff", 0.6), arrow((82, 50), (24, 50)), arrow((82, 48), (43, 16)), arrow((82, 52), (43, 84))]
        for p in ((30, 9), (34, 7), (38, 11), (42, 8), (45, 10), (36, 12)):
            sh.append(dot(p, 2.0, LIGHT))
        sh += dp((48, 8), "red/green", True) + dp((14, 45), "none") + dp((36, 92), "blue", False) + dp((85, 50), "Dark Beacon")
        return p4(sh, None, clones4)
    if k == 3:
        sh = [circle((40, 10), 11, PINK, 0.45, 0.1), circle((5, 47), 22, YEL, 0.38, 0.1), circle((95, 47), 22, YEL, 0.38, 0.1), circle((48, 92), 22, YEL, 0.38, 0.1)]
        for p in ((33, 9), (37, 7), (41, 12), (44, 9), (46, 6), (38, 13)):
            sh.append(dot(p, 2.0, LIGHT))
        sh += dp((4, 48), "none") + dp((93, 50), "Dark Beacon") + dp((48, 93))
        return p4(sh, None, [[12, 45], [85, 45], [48, 85], [65, 4]])
    if k == 4:
        sh = [circle((48, 37), 11, PINK, 0.45, 0.1), circle((48, 68), 11, PINK, 0.45, 0.1)]
        for p in ((43, 37), (47, 34), (51, 37), (54, 35), (47, 40)):
            sh.append(dot(p, 2.0, LIGHT))
        for p in ((43, 68), (47, 65), (51, 68), (54, 66), (47, 71)):
            sh.append(dot(p, 2.0, DARK))
        sh += [tag((48, 26), "Light", 2.6), tag((48, 80), "Dark", 2.6)]
        return p4(sh, None, [[8, 48], [90, 45], [50, 86], [65, 4]])
    if k == 5:
        sh = [circle((50, 50), 48.5, "#f4f0e0", 0.45, 0.05), circle((50, 95), 20, P4_FLOOR["fill"], 0.95, 0.05)]
        for p in ((44, 88), (49, 87), (53, 89), (46, 92), (51, 93), (48, 90)):
            sh.append(dot(p, 2.0, PERSON))
        return p4(sh, None, [[50, 82], [8, 48], [90, 45], [65, 4]])
    raise KeyError(k)


def exatrine(red, light):
    sh = [circle(c, 16, "#f0c8c8", 0.4, 0.1) for c in light]
    sh += [circle(c, 16, "#f05050", 0.55, 0.15) for c in red]
    return p4(sh, None, [[50, 45]], [((50, 45), "PA")], waymarks={k: P(WM[k]) for k in ("1", "2", "3", "4")})


def exatrines():
    a = exatrine([WM["4"], WM["1"]], [(22, 6), (80, 5), (68, 27), (33, 47), (52, 52), (8, 88), (92, 88)])
    b = exatrine([WM["2"]], [(50, 8), (20, 30), (36, 30), (88, 50), (12, 50), (30, 85), (70, 85), (88, 85)])
    c = exatrine([WM["3"]], [(30, 10), (70, 10), (50, 28), (85, 30), (12, 50), (30, 90), (88, 72)])
    return a, b, c


def p4_spread():
    """The macro's spread layout (D3 MT D4 / H1 H2 / D1 ST D2) around Perfect Alexander."""
    sh = [text((50, 8), "N", 3.2, "#ffd84d")]
    return p4(sh, roles(D3=(28, 24), MT=(50, 20), D4=(72, 24), H1=(20, 50), H2=(80, 50), D1=(28, 76), ST=(50, 80), D2=(72, 76)),
              [[50, 48]], [((50, 48), "PA")])
