"""Every scene of the EX6 Doomtrain guide, redrawn from game8's 440x330 strategy-board pictures.

A 4:3 frame: x in % of the width, y in % of the height, sizes in % of the width (so a span of
dy % of the height is dy * 0.75 of the width). The train car is the strip x 25..75, the boss at its
front (north, the top). Measured by eye on 5 % grid sheets (dl/grid) and checked with compare sheets.
"""
import math

R = lambda v: round(v, 2)
K = 0.75  # height / width of the frame

CAR = "#c9c9cc"
PURPLE = "#7f7ff5"
ORANGE = "#ff9b3d"
PINK = "#e48ae6"
CYAN = "#8fe0ff"
BLUE_EDGE = "#1e88ff"

ARENA = {"shape": "square", "at": [50, 50], "w": 50, "h": 75, "fill": CAR, "lines": False, "edge": "#8e8e92"}
BOSS = [50, 5]


def off(c, ang, r):
    """A point r (in % of the width) from c towards ang (0 = up, clockwise)."""
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / K)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def box(x0, y0, x1, y1, c, o=1.0, wd=0.01):
    """A rectangle from corner to corner, corners in frame %."""
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(abs(x1 - x0)), "h": R(abs(y1 - y0) * K),
            "c": c, "o": o, "wd": wd, "rot": 0}


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def cone(at, d, spread, ln, c=ORANGE, o=0.5, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def outline(x0, y0, x1, y1, c=BLUE_EDGE, wd=0.8):
    return [line((x0, y0), (x1, y0), c, wd, 1), line((x1, y0), (x1, y1), c, wd, 1),
            line((x1, y1), (x0, y1), c, wd, 1), line((x0, y1), (x0, y0), c, wd, 1)]


# ------------------------------------------------------------------ marks
def aoe(c, r=11, o=0.38):
    """An orange circle AoE, as game8 draws it (soft fill, bright rim)."""
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, "#ffc070", 0.45, 0.95)]


def chevron(c, ang, w=3.4, h=1.6, col="#ffb52e", wd=0.85, o=0.98):
    """A ^ pointing towards ang, centred on c (w, h in % of the width)."""
    tip = off(c, ang, h / 2)
    back = off(c, ang + 180, h / 2)
    a = off(back, ang + 90, w / 2)
    b = off(back, ang - 90, w / 2)
    return [line(a, tip, col, wd, o), line(b, tip, col, wd, o)]


def stack(c, d=6.4):
    """game8's stack marker: orange chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        p = off(c, a, d)
        out += chevron(p, a + 180, 5.0, 2.3, "#ff8a1a", 1.6)
        out += chevron(off(p, a, 1.8), a + 180, 5.0, 2.3, "#ffd36a", 1.0)
    return out


def buster(c, r=4.4):
    """The tankbuster marker game8 draws round a tank: a thick dark-red ring with a bright edge."""
    return [ring(c, r, "#c01818", 1.3, 0.95), ring(c, r + 0.9, "#ff6a5a", 0.3, 0.9)]


def flow(rows, cols, up, col="#fff6d8"):
    """Rows of chevrons: knockback (down) or a pull (up)."""
    out = []
    for y in rows:
        for x in cols:
            a = 0 if up else 180
            out += chevron((x, y), a, 7.2, 3.0, "#ffb347", 2.4, 0.35)
            out += chevron((x, y), a, 7.2, 3.0, col, 1.0, 0.95)
    return out


def express_ring(x, y, kind=None, label_y=None):
    """A Dead Man's Express ring at the front: kind '↑' (fires on the high level) or '↓' (low)."""
    out = [circle((x, y), 4.4, "#2a5f8a", 0.25, 0.01), ring((x, y), 4.4, CYAN, 0.75), ring((x, y), 2.9, CYAN, 0.55), ring((x, y), 1.4, CYAN, 0.5)]
    if kind:
        out.append(text((x, label_y if label_y is not None else y + 7.5), kind, 4.6, "#ffffff"))
    return out


def teleporter(c):
    return [circle(c, 3.3, "#d8f4ff", 0.35, 0.01), ring(c, 3.3, "#5cc8f0", 0.55), ring(c, 2.2, "#5cc8f0", 0.45), ring(c, 1.1, "#5cc8f0", 0.4)]


def generic(c, k):
    """A role without a seat (game8's plain T / H / D badge): EX4's glyph."""
    inner = {"T": "#22407a", "H": "#2c5a2a", "D": "#5a2a2a"}[k]
    return [{"t": "rect", "at": [R(c[0]), R(c[1])], "w": 5.4, "h": 5.4, "c": "#a08a5a", "o": 1, "wd": 0.01, "rot": 0},
            {"t": "rect", "at": [R(c[0]), R(c[1])], "w": 4.5, "h": 4.5, "c": inner, "o": 1, "wd": 0.01, "rot": 0},
            text((c[0], c[1] + 0.15), k, 3.0)]


def generics(*items):
    out = []
    for k, x, y in items:
        out += generic((x, y), k)
    return out


def double_arrow(p0, p1):
    m = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    return [arrow(m, p0, "#ffffff", 0.9), arrow(m, p1, "#ffffff", 0.9)]


def arms_length(c):
    """game8's small blue badge for Arm's Length / Surecast."""
    return [dot(c, 1.5, "#2c86c8"), ring(c, 1.5, "#d0ecff", 0.25, 0.9)]


# ------------------------------------------------------------------ the cars
def car1_blocks():
    """First car: two purple blocks (cover)."""
    return [box(50, 32.5, 62, 50.5, PURPLE), box(37.5, 67, 49.5, 85, PURPLE)]


def car2_blocks(right_box=True, left_box=True):
    """Turret car: two purple blocks and two grey 'blocks' outlined in blue."""
    out = [box(37.5, 33.5, 49.5, 50.5, PURPLE), box(50.5, 67.5, 62, 84.5, PURPLE)]
    if right_box:
        out += [box(62.5, 33.5, 75, 50.5, "#b4b4b8")] + outline(62.5, 33.5, 75, 50.5)
    if left_box:
        out += [box(25, 67.5, 37.5, 84.5, "#b4b4b8")] + outline(25, 67.5, 37.5, 84.5)
    return out


TURRET_Y = [8, 25, 42, 59, 76, 93]


def turret(c, kind):
    """kind: off (red), lit (pink target), high (blue: fires on the high level), litblue."""
    if kind == "lit" or kind == "litblue":
        out = [circle(c, 4.0, "#f2a0d0", 0.45, 0.01), ring(c, 4.0, "#ffd6ef", 0.4), dot(c, 1.6, "#ff4a6a")]
        if kind == "litblue":
            out.append(ring(c, 2.6, "#6aa0ff", 0.45))
        return out
    col = {"off": "#b8262e", "high": "#2f6fd0"}[kind]
    edge = {"off": "#ff9a9a", "high": "#bcd8ff"}[kind]
    return [dot(c, 2.5, col), ring(c, 2.5, edge, 0.35, 0.95), dot(c, 0.8, "#ffffff", 0.85)]


def turrets(left, right, xl=18, xr=81.5):
    """left/right: one kind for all six, or a list of six kinds."""
    out = []
    for side, x in ((left, xl), (right, xr)):
        kinds = side if isinstance(side, list) else [side] * 6
        for y, k in zip(TURRET_Y, kinds):
            out += turret((x, y), k)
    return out


def car3():
    """The Arcane Revelation car: a low purple block west, a high one east, an orange ledge between, two teleporters."""
    return [box(25, 50, 37.5, 100, PURPLE), box(62.5, 33.5, 75, 67, PURPLE), box(37.5, 48, 62.5, 52, "#ff8a10")] + \
        teleporter((56, 42)) + teleporter((43.5, 58.5))


def tiles(present):
    """The Psychokinesis car: a grid of 4 x 5 tiles; present = set of (row, col) still there, 1-based."""
    xs = [25, 37.5, 50, 62.5, 75]
    ys = [17, 34, 51, 68, 85, 102]
    out = []
    for r in range(5):
        for c in range(4):
            if (r + 1, c + 1) in present:
                out.append(box(xs[c], ys[r], xs[c + 1], ys[r + 1], "#fbf4e8"))
                out.append(box(xs[c] + 1.0, ys[r] + 1.4, xs[c + 1] - 1.0, ys[r + 1] - 1.4, PURPLE))
    return out


ALL_TILES = {(r, c) for r in range(1, 6) for c in range(1, 5)}
PS_START = ALL_TILES - {(1, 3), (2, 4)}
PS_MID = ALL_TILES - {(1, 3), (2, 1), (2, 3), (2, 4), (3, 2)}
PS_LATE = {(1, 4), (2, 2), (3, 3), (3, 4), (4, 1), (4, 3), (4, 4)}
PS_END = PS_LATE - {(3, 4)}


def car4(right_top=True):
    """The last car: a high purple wall west, (a purple wall north-east), a yellow box, a teleporter."""
    out = [box(25, 34, 37.5, 100, PURPLE)]
    if right_top:
        out.append(box(62.5, 0, 75, 34, PURPLE))
    out += [box(50, 50, 62.5, 67, "#fbf4e8"), box(51.2, 51.6, 61.3, 65.4, "#ffd76a")] + teleporter((44, 50))
    return out


def sc(shapes, roles=None, boss=BOSS, arena=ARENA, **kw):
    out = {"arena": arena, "waymarks": None, "shapes": shapes}
    if boss is not None:
        out["boss"] = boss
    if roles:
        out["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    out.update(kw)
    return out


def aoes(roles, r=11):
    out = []
    for v in roles.values():
        out += aoe(v, r)
    return out


# ============================================================ car 1: Overdraught, Express, Windpipe
OB_SPREAD = {"MT": (30.5, 10), "ST": (68.5, 10), "D1": (37.5, 37), "D2": (67.5, 40),
             "H1": (33, 64), "H2": (64, 66), "D3": (37.5, 95), "D4": (64, 95)}


def ob_spread():
    return sc(car1_blocks() + aoes(OB_SPREAD), OB_SPREAD)


def ob_pairs():
    roles = {"MT": (35, 25), "D1": (31.5, 29), "ST": (64.5, 28), "D2": (61, 28.5),
             "H1": (31, 86.5), "D3": (35.5, 90.5), "H2": (60.5, 86), "D4": (64, 90.5)}
    return sc(car1_blocks() + stack((33, 27)) + stack((62.5, 28)) + stack((33, 88)) + stack((62, 88)), roles)


EX_ROLES = {"MT": (31.5, 30), "D1": (31.5, 36.5), "ST": (55, 24), "D2": (60, 24.5),
            "H1": (32, 54), "D3": (32, 64.5), "H2": (55, 58), "D4": (58.5, 65.5)}
EX_LANES = [31.25, 43.75, 56.25, 68.75]


def ex_rings(kinds, y=7.5, label_y=15.5):
    out = []
    for x, k in zip(EX_LANES, kinds):
        out += express_ring(x, y, k, label_y)
    return out


def ex1(kinds):
    return sc(car1_blocks() + ex_rings(kinds), EX_ROLES)


def ex2(kinds):
    return sc(car1_blocks() + ex_rings(kinds) + flow([17, 27, 37, 47, 71, 81, 91], [37, 50, 62.5], up=False), EX_ROLES)


def ex3(kinds, deep=None):
    """The lines from the rings. deep: lanes whose line hits the ground (game8 draws all four alike)."""
    roles = {"MT": (31, 70), "D1": (31, 63.5), "ST": (55.5, 30), "D2": (55.5, 23.5),
             "H1": (31, 87), "D3": (31, 93.5), "H2": (55.5, 86.5), "D4": (56.5, 93)}
    lanes = [(25, 37.6), (37.9, 49.8), (50.2, 62.1), (62.4, 75)]
    shp = car1_blocks()
    for i, (a, b) in enumerate(lanes):
        o = 0.78 if (deep is None or i in deep) else 0.3
        shp.append(box(a, 9, b, 100, ORANGE, o))
    shp += ex_rings(kinds)
    return sc(shp, roles)


WP_ROLES = {"MT": (52.5, 57), "D2": (58, 60.5), "ST": (52.5, 67.5), "D1": (58, 70),
            "H2": (54.5, 81.5), "D4": (60, 82), "H1": (38, 94), "D3": (44, 94)}


def wp1():
    return sc(car1_blocks(), WP_ROLES)


def wp2():
    return sc(car1_blocks() + flow([8, 18, 28, 38, 68, 78, 88], [37.5, 50, 62.5], up=True), WP_ROLES)


def wp3():
    roles = {"D1": (39.5, 38), "MT": (47.5, 38), "D2": (53, 61), "ST": (59.5, 60.5),
             "H2": (53.5, 70.5), "D4": (60, 71), "H1": (39.5, 91.5), "D3": (46.5, 91.5)}
    return sc([box(25, 0, 75, 25, ORANGE, 0.8)] + car1_blocks() + arms_length((37.3, 32.5)) + arms_length((45.3, 32.5)), roles)


def wp4():
    roles = {"MT": (35.5, 25), "D1": (31, 28), "ST": (64.5, 27), "D2": (59.5, 28.5),
             "H1": (31, 86), "D3": (35.5, 90), "H2": (61, 85), "D4": (64, 90)}
    return sc(car1_blocks() + stack((33.5, 26.5)) + stack((62.5, 27.5)) + stack((33.5, 88)) + stack((62.5, 87.5)), roles)


# ============================================================ car 2: Turret Crossing
TC_GROUPS = {"MT": (37, 41), "D1": (31, 41), "H1": (31, 48), "D3": (36.5, 50),
             "ST": (55.5, 38.5), "D2": (51.5, 45), "D4": (53.5, 47.5), "H2": (57, 47)}


def tc1():
    return sc(car2_blocks() + turrets("off", "lit"), TC_GROUPS)


def pink_rows(rows):
    return [box(25, a, 75, b, PINK, 0.72) for a, b in rows]


def tc2():
    shp = pink_rows([(0, 16), (17, 33), (51, 67), (84.5, 100)]) + car2_blocks() + turrets("off", "lit")
    return sc(shp, TC_GROUPS)


TC_EX = {"D1": (28.5, 31), "MT": (34, 32), "ST": (45, 30), "D2": (49.5, 32),
         "H1": (29, 60), "D3": (36, 61), "D4": (42.5, 58), "H2": (47.5, 66)}


def tc3():
    shp = car2_blocks() + outline(25, 0, 75, 100, "#6fd0ff", 0.5) + flow([12, 26, 40, 66, 79, 92], [37.5, 50, 62.5], up=False, col="#fff2b0")
    shp += ex_rings(["↑", "↑", "↓", "↓"], y=7.5, label_y=3.2)
    return sc(shp + turrets("off", "off"), TC_EX)


def tc4():
    roles = {"D1": (27.5, 29), "MT": (33.5, 29), "ST": (43, 28), "D2": (48, 30),
             "H1": (28, 62), "D3": (35.5, 62), "D4": (42, 58), "H2": (47.5, 65)}
    shp = car2_blocks() + [box(25, 9, 75, 100, "#7fd6f0", 0.55)] + ex_rings(["↑", "↑", "↓", "↓"], y=7.5, label_y=3.2)
    return sc(shp + turrets("off", "off"), roles)


def tc5():
    roles = {"MT": (35.5, 17.5), "D1": (30.5, 17.5), "ST": (62, 18), "D2": (67.5, 18),
             "H1": (30.5, 61), "D3": (36, 61.5), "D4": (60.5, 61), "H2": (66, 61)}
    shp = car2_blocks() + turrets("off", "off") + stack((33, 17.5)) + stack((65, 17.5)) + stack((33, 61)) + stack((63, 61))
    return sc(shp, roles)


def tc6():
    roles = {"MT": (30, 8.5), "ST": (69.5, 9), "D1": (31.5, 32), "D2": (58, 32),
             "H1": (38, 59), "H2": (64.5, 60), "D3": (39, 92), "D4": (69, 91)}
    return sc(car2_blocks() + turrets("off", "off") + aoes(roles), roles)


TC_LOW = {"MT": (40.5, 72), "D1": (46, 75.5), "H1": (41, 80.5), "D3": (46, 83),
          "ST": (62.5, 72), "H2": (70.5, 75), "D2": (64, 82), "D4": (70, 82)}


def tc7():
    return sc(car2_blocks() + turrets("lit", "off") + buster(TC_LOW["MT"]) + buster(TC_LOW["ST"]), TC_LOW)


def tc8():
    shp = pink_rows([(0, 17), (17.5, 34), (34.5, 51), (51.5, 67.5), (85, 100)]) + car2_blocks() + turrets("lit", "off")
    return sc(shp + buster(TC_LOW["MT"]) + buster(TC_LOW["ST"]), TC_LOW)


def tc9():
    roles = dict(TC_LOW, MT=(33, 26.5), ST=(67, 25))
    shp = car2_blocks() + turrets("off", "off") + aoe((33, 25), 11.2) + aoe((67, 24.5), 11.2) + buster(roles["MT"]) + buster(roles["ST"])
    return sc(shp, roles)


TC_ROW5 = {"MT": (40, 72), "D1": (45.5, 72), "H1": (40, 81), "D3": (45, 81),
           "ST": (62, 71), "D2": (68, 72), "H2": (62.5, 81), "D4": (68, 81)}


def tc10():
    shp = pink_rows([(0, 17), (17.5, 34), (34.5, 51), (51.5, 68), (85, 100)]) + car2_blocks() + turrets("lit", "off")
    return sc(shp, TC_ROW5)


def tc11():
    roles = {"MT": (40, 57), "D1": (45.5, 57), "H1": (40, 66), "D3": (45.5, 67),
             "ST": (65.5, 57), "D2": (71, 57), "H2": (65.5, 66), "D4": (71, 66)}
    shp = car2_blocks() + outline(25, 0, 75, 100, "#6fd0ff", 0.5) + flow([10, 24, 38, 52, 66, 80, 94], [37.5, 50, 62.5], up=True, col="#fff2b0")
    return sc(shp + turrets("lit", "off"), roles)


def tc12():
    roles = {"MT": (40.5, 55), "H1": (36, 60), "D1": (45, 61), "D3": (41, 71),
             "ST": (65, 55), "D2": (60.5, 60), "H2": (69.5, 61), "D4": (66, 71)}
    return sc([box(25, 0, 75, 25, ORANGE, 0.8)] + car2_blocks() + turrets("off", "off"), roles)


# ============================================================ Runaway Train (the round arena)
RT_ARENA = {"shape": "circle", "at": [50, 50], "r": 34, "fill": "#a7a7aa", "lines": False, "edge": "#d8d0c0"}
RT_BOSS = [[50, 3.5], [50, 50]]


def rt_cones():
    return [cone((50, 3.5), 240, 36, 64, ORANGE, 0.55), cone((50, 3.5), 120, 36, 64, ORANGE, 0.55), cone((50, 3.5), 180, 58, 68, "#ffffff", 0.16)]


def rt_spread():
    roles = {"H1": (50, 18.5), "MT": (31, 23), "ST": (69, 23), "D1": (37, 49), "D2": (63, 49),
             "H2": (50, 70), "D3": (35.5, 85), "D4": (65.5, 85)}
    return sc(rt_cones() + buster(roles["MT"]) + buster(roles["ST"]), roles, RT_BOSS, RT_ARENA)


def rt_stack():
    roles = {"MT": (27.5, 23), "ST": (71.5, 23), "D1": (40.5, 40), "H1": (50, 40), "D2": (59.5, 40),
             "D3": (40.5, 74), "H2": (50, 74), "D4": (60, 74)}
    shp = rt_cones() + buster(roles["MT"]) + buster(roles["ST"]) + stack((50, 40), 5.2) + stack((50, 74), 5.2)
    return sc(shp, roles, RT_BOSS, RT_ARENA)


# ============================================================ Third Rail + Arcane Revelation
def ar1():
    return sc(car3() + generics(("T", 46, 19), ("H", 51.5, 19), ("D", 50.5, 26)))


def ar2():
    return sc(car3() + aoe((50, 21), 11.2, 0.6) + generics(("T", 64.5, 14), ("H", 70, 14), ("D", 67.5, 21)))


def ar3():
    shp = car3() + generics(("D", 50.5, 35), ("H", 50.5, 40), ("T", 50.5, 45), ("D", 71.5, 35), ("H", 71.5, 40), ("T", 71.5, 45))
    return sc(shp + double_arrow((58.5, 42), (68.5, 42)))


ARC_ROLES = {"MT": (27.5, 3.5), "ST": (33.5, 3.5), "H1": (60, 3.5), "H2": (66, 3.5), "D1": (71.5, 3.5),
             "D2": (60, 11.5), "D3": (66, 11.5), "D4": (71.5, 11.5)}


def ar4():
    return sc(car3() + [circle((50, 3), 46, ORANGE, 0.32, 0.01), ring((50, 3), 46, "#ffc070", 0.5)] + stack((30.5, 5)) + stack((66, 7.5), 6), ARC_ROLES)


def ar8():
    roles = {"MT": (50, 12), "ST": (50, 27.5)}
    return sc(car3() + stack((50, 12), 5) + generics(("D", 55.5, 27), ("H", 61.5, 27)), roles)


# ============================================================ Psychokinesis
def ps1():
    shp = tiles(PS_START) + aoe((30.5, 8), 19) + aoe((69, 8), 19)
    return sc(shp + generics(("T", 28, 5), ("D", 33.5, 5), ("H", 28, 12), ("T", 66, 5), ("D", 71.5, 5), ("H", 66, 12)))


def ps2():
    shp = tiles(PS_START) + aoe((30.5, 8.5), 10.5) + aoe((69.5, 8.5), 10.5) + [arrow((37, 10), (44, 10)), arrow((63, 10), (56, 10))]
    return sc(shp + generics(("H", 47.5, 12.5), ("T", 53.5, 12.5), ("D", 50.5, 18.5)))


def ps3():
    shp = tiles(PS_MID) + aoe((27.5, 8), 19) + aoe((72, 8), 18.5) + aoe((47, 44), 18)
    return sc(shp + generics(("T", 42.5, 4), ("D", 27.5, 8), ("H", 47.5, 9.5), ("D", 52, 9.5), ("T", 73, 9.5), ("H", 53.5, 44)))


def ps4():
    roles = {"MT": (31.5, 8.5), "ST": (68.5, 8.5)}
    return sc(tiles(PS_LATE) + buster(roles["MT"]) + buster(roles["ST"]) + generics(("D", 45, 20.5), ("H", 50, 28)), roles)


def ps5():
    cs = [(24.5, 8), (49.5, 8), (74.5, 8), (30.5, 50), (68.5, 59)]
    shp = tiles(PS_LATE)
    for c in cs:
        shp += aoe(c, 19.5)
    return sc(shp + generics(("T", 25, 8), ("D", 50, 8), ("D", 74.5, 8), ("H", 31, 50), ("H", 69, 59)))


def ps6():
    cs = [(24.5, 8), (50, 8), (75.5, 8), (31, 50), (69, 58)]
    shp = tiles(PS_LATE)
    for c in cs:
        shp += aoe(c, 9)
    return sc(shp + generics(("T", 44, 25), ("D", 50, 25), ("H", 56.5, 25)))


def ps7():
    roles = {"ST": (50, 9), "MT": (37, 22)}
    return sc(tiles(PS_END) + stack((50, 9), 5.6) + generics(("H", 31, 17), ("D", 31, 28)), roles)


def ps8():
    shp = tiles(PS_END) + teleporter((50, 92)) + [arrow((37, 21), (33, 28), wd=1.2), arrow((31, 39), (31, 47), wd=1.2), arrow((33, 55), (37, 61), wd=1.2), arrow((43.5, 72), (43.5, 79), wd=1.2)]
    shp += [line((66, 55.3), (70, 60.7), "#2a7fd0", 1.0, 1), line((70, 55.3), (66, 60.7), "#2a7fd0", 1.0, 1)]
    return sc(shp + generics(("H", 41, 9), ("T", 44.5, 16), ("D", 50.5, 16)))


# ============================================================ Turret Crossing (second)
LEFT_RB = ["off", "off", "off", "high", "high", "high"]


def t2a():
    return sc(car4() + [text((50, 14), "Pairs / Spread ?", 3.0, "#ffffff")])


def t2b():
    shp = [box(37.5, 34, 75, 100, ORANGE, 0.75)] + car4() + turrets(LEFT_RB, "lit")
    return sc(shp + generics(("D", 50, 16), ("D", 44.5, 25), ("H", 50, 25), ("T", 56, 25)))


def t2c():
    shp = car4() + turrets(LEFT_RB, "off") + double_arrow((27.5, 50), (39.5, 50))
    return sc(shp + generics(("D", 31, 60), ("H", 31, 68.5), ("T", 31, 77)))


def t2d():
    shp = [box(25, 0, 75, 34, ORANGE, 0.75), box(37.5, 34, 75, 100, ORANGE, 0.75)] + car4(right_top=False) + turrets(LEFT_RB, "lit")
    return sc(shp + generics(("T", 31, 41.5), ("D", 31, 50), ("H", 31, 58.5)))


def t2e():
    shp = car4(right_top=False) + turrets(LEFT_RB, "off") + aoe((31, 8), 18.5) + aoe((56.5, 8), 18.5) + aoe((31, 90), 18) + aoe((62.5, 87), 18)
    return sc(shp + generics(("T", 31, 8), ("D", 56.5, 8), ("D", 62.5, 34), ("T", 69, 34), ("D", 69, 42), ("H", 31, 59), ("H", 31, 92), ("D", 62.5, 85)))


def t2f():
    shp = car4(right_top=False) + turrets(LEFT_RB, "off")
    for c in [(31, 8), (56, 8), (63, 33), (69, 32), (69, 41), (31, 58), (31, 92), (62.5, 85)]:
        shp += aoe(c, 9.5)
    return sc(shp + generics(("D", 44.5, 23), ("T", 44.5, 33), ("H", 44.5, 59)))


T2_LANES = [31.25, 43.75, 56.25, 68.75]


def t2_rings(kinds, y=3):
    out = []
    for x, k in zip(T2_LANES, kinds):
        out += express_ring(x, y, k, y + 7.2)
    return out


def t2g():
    shp = [box(25, 0, 75, 17, ORANGE, 0.85), box(25, 17, 75, 34, ORANGE, 0.65)] + car4(right_top=False) + [box(25, 34, 37.5, 100, "#ff8040", 0.7)]
    shp += t2_rings(["↑", "↑", "↓", "↓"]) + turrets(["lit", "lit", "lit", "litblue", "litblue", "litblue"], "off")
    return sc(shp + generics(("T", 44, 41), ("D", 50, 41), ("H", 44, 58)))


def t2h():
    shp = car4(right_top=False) + [box(25, 0, 37.5, 34, ORANGE, 0.3), box(25, 34, 37.5, 100, "#e07ac0", 0.45), box(37.5, 0, 50, 100, ORANGE, 0.3), box(50, 0, 75, 100, ORANGE, 0.72)]
    shp += t2_rings(["↑", "↑", "↓", "↓"]) + flow([30, 44, 58, 72], [37.5, 50, 63.5], up=False) + turrets(LEFT_RB, "off")
    return sc(shp + generics(("T", 44, 41), ("H", 44, 59), ("D", 44, 67)))


def t2i():
    roles = {"MT": (40.5, 30), "D1": (37.5, 36), "ST": (59, 30), "D2": (55, 36),
             "H1": (40.5, 72), "D3": (37.5, 78), "H2": (59, 72), "D4": (55, 78)}
    return sc(car4(right_top=False) + stack((39, 33)) + stack((57, 33)) + stack((39, 75)) + stack((57, 75)), roles)


def busters2():
    roles = {"MT": (31, 8.5), "ST": (69, 8.5)}
    return sc(car4(right_top=False) + buster(roles["MT"]) + buster(roles["ST"]), roles)


# ============================================================ Overdraught + Arcane Revelation (last)
def oa1():
    return sc(car4(right_top=False) + [text((50, 14), "Pairs / Spread ?", 3.0, "#ffffff")])


OA_ROLES = {"MT": (25, 8.5), "ST": (31, 8.5), "H1": (62, 8.5), "H2": (68, 8.5), "D1": (74, 8.5),
            "D2": (62, 16.5), "D3": (68, 16.5), "D4": (74, 16.5)}


def oa2():
    shp = car4(right_top=False) + [circle((51, 16), 40.5, ORANGE, 0.34, 0.01), ring((51, 16), 40.5, "#ffc070", 0.5)] + stack((28, 10.5)) + stack((68, 12.5), 6)
    return sc(shp, OA_ROLES)


def oa3():
    shp = car4(right_top=False)
    for c in [(27, 7), (33.5, 7), (64, 4), (70, 5), (60.5, 15), (66.5, 16), (72, 14)]:
        shp += aoe(c, 11.5)
    return sc(shp + generics(("T", 43.5, 25), ("D", 50, 25), ("H", 56.5, 33)))


def oa4():
    shp = car4(right_top=False) + [box(50, 50, 62.5, 67, "#ffcf40", 0.6)] + flow([28, 42, 57, 72], [36.5, 50, 63.5], up=True)
    return sc(shp + generics(("H", 56.5, 67), ("T", 52.5, 72.5), ("D", 56.5, 77)))


def oa5():
    roles = {"MT": (36, 10), "ST": (64, 11), "D1": (39.5, 27), "D2": (59.5, 28),
             "H1": (43.5, 60), "H2": (69.5, 57), "D3": (43.5, 85), "D4": (67, 86)}
    return sc(car4(right_top=False) + aoes(roles), roles)


def oa6():
    shp = car4(right_top=False) + double_arrow((27.5, 50), (39.5, 50))
    return sc(shp + generics(("T", 35, 36), ("D", 31, 42), ("H", 27, 47.5)))


def oa8():
    shp = car4(right_top=False)
    for c in [(29.5, 7), (33, 23), (63.5, 18), (69, 7), (69.5, 42), (69.5, 59), (45.5, 85), (69.5, 82)]:
        shp += aoe(c, 8)
    return sc(shp + generics(("T", 47, 23), ("D", 42, 34), ("H", 46, 64)))


def oa9():
    return sc(car4(right_top=False) + stack((50, 11.5), 6.6) + generics(("T", 46.5, 10), ("H", 53.5, 10), ("D", 50, 15.5)))
