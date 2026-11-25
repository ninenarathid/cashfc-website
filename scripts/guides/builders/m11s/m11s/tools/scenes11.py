"""Every scene of the M11S guide, redrawn from game8's strategy-board pictures (440x330, and 440x440 for
the waymarks and the split-arena Majestic Meteor boards).

x in % of the width, y in % of the height, sizes in % of the width. Measured by eye on 5 % grid sheets
(dl/grid) and checked on compare sheets.
"""
import math

R = lambda v: round(v, 2)

ORANGE = "#ff9b3d"
FLOOR = "#a7a8ac"
TAN = "#b89c74"
VOID = "#5b4a36"
PINK = "#e0457b"
BLUE_SQ = "#2340f0"
WEAPON_RED = "#e02020"

# the 4:3 boards: the square arena, 68.4 % of the width across
BOARD = {"shape": "square", "at": [50, 50], "w": 68.4, "h": 68.4, "fill": FLOOR, "lines": False, "edge": "#e2e2e2"}


class F:
    k = 0.75  # height / width of the frame being drawn


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / F.k)


def ang(p0, p1):
    """Direction from p0 to p1 (0 = up, clockwise), in frame % points."""
    dx = p1[0] - p0[0]
    dy = (p1[1] - p0[1]) * F.k
    return math.degrees(math.atan2(dx, -dy)) % 360


def dist(p0, p1):
    return math.hypot(p1[0] - p0[0], (p1[1] - p0[1]) * F.k)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


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


def cone(at, d, spread, ln, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=ORANGE, o=0.42):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.01}


def aoe(c, r, o=0.42):
    """An orange circle AoE, as game8 draws it (soft fill, bright rim)."""
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, "#ffc070", 0.4, 0.95)]


def chevron(c, a, w=3.2, h=1.5, col="#ffb52e", wd=0.8, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    p = off(back, a + 90, w / 2)
    q = off(back, a - 90, w / 2)
    return [line(p, tip, col, wd, o), line(q, tip, col, wd, o)]


def chev2(c, a, w=3.6, h=1.7):
    """game8's double chevron (orange edge, light core) pointing towards a."""
    out = []
    for d in (0, 1.6):
        p = off(c, a + 180, d)
        out += chevron(p, a, w, h, "#ff7a10", 1.5, 0.9)
        out += chevron(p, a, w, h, "#fff2d0", 0.6, 0.98)
    return out


def stack(c, d=6.0):
    """game8's stack marker: double chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        out += chev2(off(c, a, d), a + 180)
    return out


def linestack(p0, p1, n=4, side=4.2):
    """A line stack from p0 through p1: double chevrons on both sides pointing at the line."""
    a = ang(p0, p1)
    L = dist(p0, p1)
    out = []
    for i in range(n):
        t = 0.35 + i * (0.75 / max(1, n - 1))
        m = off(p0, a, L * t)
        out += chev2(off(m, a + 90, side), a - 90)
        out += chev2(off(m, a - 90, side), a + 90)
    return out


def weapon(c, s):
    return text(c, s, 2.9, WEAPON_RED)


def tornado(c, r=7.3):
    return [circle(c, r, ORANGE, 0.32, 0.01), ring(c, r, "#ffc070", 0.4, 0.95)]


def hexmark(c, n):
    return [dot(c, 2.6, "#5a4a2a", 0.55), ring(c, 2.6, "#f5e3a0", 0.45), text(c, str(n), 2.8, "#fff4d0")]


def pin(c):
    """game8's single player pin (one person, anybody)."""
    return [circle((c[0], c[1] + 2.6), 3.2, "#8a6ad8", 0.5, 0.01), line((c[0], c[1] - 2.0), (c[0], c[1] + 2.8), "#3b2380", 0.9),
            dot((c[0], c[1] - 2.0), 2.0, "#5b3fa8"), ring((c[0], c[1] - 2.0), 2.0, "#c8b8ff", 0.3, 0.9)]


def marker(c):
    """game8's red meteor marker above a head."""
    return [dot((c[0], c[1] - 5.6), 1.35, "#c8331c"), ring((c[0], c[1] - 5.6), 1.35, "#ffb08a", 0.3), ring((c[0], c[1] + 0.6), 3.1, "#ff6a8a", 0.45, 0.85)]


def rock(c):
    """A meteor left on the field (green crystal on a green base)."""
    return [circle((c[0], c[1] + 3.0), 3.4, "#3fbf5a", 0.35, 0.01), dot(c, 2.3, "#1f6e35"), ring(c, 2.3, "#7fe08f", 0.3, 0.9)]


def square_lines(x0, y0, x1, y1, col, wd=0.9, dots=True):
    out = [line((x0, y0), (x1, y0), col, wd, 1), line((x1, y0), (x1, y1), col, wd, 1),
           line((x1, y1), (x0, y1), col, wd, 1), line((x0, y1), (x0, y0), col, wd, 1)]
    if dots:
        out += [dot(p, 0.9, "#ffffff") for p in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    return out


def clump(c, seats, dx=4.6, dy=6.0, cols=3):
    """Seats packed together around c (game8 piles a stack's icons on one spot)."""
    dx, dy = dx * 0.7, dy * 0.7
    out = {}
    n = len(seats)
    if n >= 7 and cols == 4:
        cols = 3
    rows = (n + cols - 1) // cols
    for i, s in enumerate(seats):
        r_, k = divmod(i, cols)
        inrow = min(cols, n - r_ * cols)
        out[s] = [R(c[0] + (k - (inrow - 1) / 2) * dx), R(c[1] + (r_ - (rows - 1) / 2) * dy)]
    return out


ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]


def roles(**kw):
    return {k: [R(v[0]), R(v[1])] for k, v in kw.items()}


# ================================================================== setup
def waymarks():
    F.k = 1.0
    return {"frame": [1, 1], "bg": "#5f6166",
            "arena": {"shape": "square", "at": [50, 49.5], "w": 95, "h": 93, "fill": TAN, "lines": False, "edge": "#8a7250"},
            "waymarks": {"1": [12.5, 18.5], "2": [89, 18.5], "A": [50.5, 26.5], "D": [26.5, 50], "B": [74, 50],
                         "C": [50.5, 73.5], "4": [11.5, 82.5], "3": [89, 82.5]},
            "markSize": 7.2, "shapes": []}


def board(**kw):
    F.k = 0.75
    s = {"arena": dict(BOARD)}
    s.update(kw)
    return s


# ================================================================== Raw Steel Trophy
def raw_axe():
    sh = []
    for c in ((50, 36.5), (26, 52.5), (74, 52.5), (41.5, 62.5), (57.5, 62.5), (34, 90), (66, 90)):
        sh += aoe(c, 12, 0.42)
    return board(boss=[50, 50], shapes=sh,
                 roles=roles(MT=(47, 40), ST=(53, 40), H1=(26, 52.5), H2=(74, 52.5), D1=(42, 62), D2=(57.5, 62),
                             D3=(34, 90), D4=(66, 90)))


def raw_scythe():
    sh = [cone((50, 52), 0, 192, 64, ORANGE, 0.42), cone((50, 54), 180, 34, 62, ORANGE, 0.42)]
    r = roles(MT=(43, 43), ST=(57, 43))
    r.update(clump((50.5, 66.5), ["H1", "D1", "D2", "H2", "D4", "D3"], 4.4, 5.6, 3))
    return board(boss=[50, 52], shapes=sh, roles=r)


# ================================================================== Trophy Weapons
WPN = {"scythe": (31, 38), "sword": (68.5, 31.5), "axe": (56, 77.5)}
WNAME = {"scythe": "Scythe", "sword": "Sword", "axe": "Axe"}


def weapons(*which):
    return [weapon(WPN[w], WNAME[w]) for w in which]


def south_clump(c=(49.5, 63.5)):
    return clump(c, ["H1", "D1", "D2", "H2", "ST", "D3", "D4"], 4.4, 5.6, 4)


def tw1():
    r = roles(MT=(50, 38))
    r.update(south_clump())
    return board(boss=[50, 51], shapes=weapons("scythe", "sword", "axe"), roles=r)


def tw2():
    r = roles(MT=(50, 38))
    r.update(south_clump((49.5, 63)))
    return board(boss=[50, 50], shapes=weapons("scythe", "sword", "axe") + [arrow((46, 47), (36, 41.5), "#ffffff", 0.9)], roles=r)


SCY_BOSS = (30.5, 39)
SCY_ROLES = dict(MT=(22.5, 33), D4=(28, 28), H2=(34, 30), D2=(38, 37), ST=(37.5, 45), D1=(32, 50), H1=(25.5, 50.5), D3=(22, 41))


def scythe_hit(boss, rl, r2=14.7, outer=54):
    sh = [donut(boss, outer, r2, ORANGE, 0.5)]
    for s, p in rl.items():
        sh.append(cone(boss, ang(boss, p), 30, 70, ORANGE, 0.16))
    return sh


def tw3():
    sh = scythe_hit(SCY_BOSS, SCY_ROLES) + weapons("sword", "axe")
    return board(boss=list(SCY_BOSS), shapes=sh, roles=roles(**SCY_ROLES))


def cross(c, rot, arm=10, ln=95, o=0.45):
    return [rect(c, arm, ln, rot, ORANGE, o), rect(c, ln, arm, rot, ORANGE, o)]


def tw4():
    boss = (69, 33)
    mt = dict(D3=(51.5, 19), MT=(56, 20.5), H1=(49.5, 23), D1=(54, 26.5))
    st = dict(ST=(61, 47.5), D4=(57, 51), D2=(64, 52.5), H2=(59.5, 56.5))
    sh = cross(boss, -15) + weapons("scythe", "axe")
    sh += linestack(boss, (52.5, 21.5), 3, 4.6) + linestack(boss, (60.5, 52), 3, 4.6)
    return board(boss=list(boss), shapes=sh, roles=roles(**mt, **st))


def tw5():
    boss = (56, 78)
    sh = aoe(boss, 18, 0.42) + weapons("scythe", "sword") + stack((52, 50), 7.2)
    return board(boss=list(boss), shapes=sh, roles=clump((52, 50), ALL, 4.2, 5.4, 4))


def tw_rule():
    return None


# ================================================================== Void Stardust
def vs1():
    sh = aoe((50, 71), 12.5)
    return board(boss=[50, 51], shapes=sh, roles=clump((50, 70), ALL, 4.2, 5.4, 4))


def vs2():
    sh = []
    for c, n in (((50, 71), 1), ((37, 59.5), 2), ((38, 41), 3)):
        sh += aoe(c, 12.5) + hexmark((c[0], c[1] - 1), n)
    return board(boss=[50, 51], shapes=sh, roles=clump((56.5, 37), ALL, 4.2, 5.2, 4))


SPREAD = dict(MT=(44, 41), ST=(56.5, 41), H1=(25, 53), H2=(75, 53), D1=(44, 61), D2=(56.5, 61), D3=(37, 85), D4=(62, 85))


def vs_spread():
    sh = []
    for p in SPREAD.values():
        sh += aoe(p, 9.7)
    return board(boss=[50, 51], shapes=sh, roles=roles(**SPREAD))


def vs_stack():
    return board(boss=[50, 51], shapes=stack((66.5, 60), 7.2), roles=clump((66.5, 60), ALL, 4.0, 5.2, 4))


def vs5():
    sh = []
    for c in ((19, 10.5), (48, 12.5), (39.5, 46), (21, 76)):
        sh += aoe(c, 9.7)
    r = roles(D4=(19, 11), H2=(48, 13), H1=(21, 76))
    r.update(clump((40, 46), ["MT", "ST", "D3", "D1", "D2"], 3.8, 4.6, 3))
    return board(boss=[31, 39], shapes=sh, roles=r)


def vs6():
    sh = []
    for c in ((19, 12), (29.5, 8.5), (35, 16.5), (44, 13), (54.5, 22), (59.5, 33.5), (19, 40.5), (28, 56.5),
              (39.5, 46), (21.5, 76), (33.5, 83), (44, 85)):
        sh += aoe(c, 9.7, 0.36)
    r = roles(D4=(45, 32), H2=(60, 50), H1=(47, 70))
    r.update(clump((32.5, 30), ["MT", "ST", "D3", "D1", "D2"], 3.6, 4.4, 3))
    return board(boss=[30, 40], shapes=sh, roles=r)


def vs_stack2():
    return board(boss=[31, 39], shapes=stack((41, 37), 7.2), roles=clump((41, 37), ALL, 4.0, 5.2, 4))


SPREAD2 = dict(ST=(29, 26), MT=(21, 42), H2=(44, 16), D2=(41, 38), D4=(55, 42), D1=(32, 52), H1=(17, 61), D3=(42, 68))


def vs_spread2():
    sh = []
    for p in SPREAD2.values():
        sh += aoe(p, 9.7)
    return board(boss=[31, 39], shapes=sh, roles=roles(**SPREAD2))


# ================================================================== Dance of Domination Trophy
def dom1():
    sh = []
    segs = [((24, 1), (24, 98)), ((50, 1), (50, 98)), ((76, 1), (76, 98)), ((6, 16), (94, 16)),
            ((13, 1), (88, 97)), ((86, 1), (15, 96))]
    for a, b in segs:
        sh.append(line(a, b, "#ff8a10", 1.0, 0.95))
    for a, b in segs:
        sh += [dot(a, 0.9, "#ffffff"), dot(b, 0.9, "#ffffff")]
    sh += [ring((40, 87), 9.0, PINK, 0.7), ring((63, 87), 9.0, PINK, 0.7),
           arrow((60, 55), (42.5, 73), PINK, 0.9), arrow((70, 56), (66.5, 71), PINK, 0.9)]
    r = roles(MT=(50, 39))
    r.update(clump((49, 65), ["ST", "H1", "H2", "D1", "D2", "D3", "D4"], 3.8, 5.0, 4))
    return board(boss=[50, 49], shapes=sh, roles=r)


DOM_PAIRS = dict(H1=(34, 11), D3=(39.5, 11), H2=(60, 11), D4=(65.5, 11), D1=(34, 52), MT=(39.5, 52), D2=(61, 52), ST=(66.5, 52))


def dom2():
    sh = [rect((24.5, 50), 12, 75, 0, ORANGE, 0.5), rect((50, 50), 12, 75, 0, ORANGE, 0.5), rect((75.5, 50), 12, 75, 0, ORANGE, 0.5),
          rect((50, 85), 75, 12, 0, ORANGE, 0.5), rect((50, 50), 10, 125, -46, ORANGE, 0.5), rect((50, 50), 10, 125, 46, ORANGE, 0.5)]
    for c in ((36.75, 11), (62.75, 11), (36.75, 52), (63.75, 52)):
        sh += stack(c, 6.4)
    return board(boss=[50, 51], shapes=sh, roles=roles(**DOM_PAIRS))


# ================================================================== Ultimate Trophy Weapons
def utw1():
    r = roles(MT=(50, 39))
    r.update(south_clump((49.5, 66)))
    return board(boss=[50, 52], shapes=[weapon((56, 78), "Axe")], roles=r)


def utw2():
    sh = aoe((56, 79), 15) + stack((50, 53), 7.2) + [weapon((68, 31), "Scythe")]
    return board(boss=[56, 79], shapes=sh, roles=clump((50, 53), ALL, 4.0, 5.2, 4))


UTW3 = dict(D3=(65, 20), MT=(71, 19), D4=(77, 26), H1=(61, 28), H2=(75, 37), D1=(61, 36), ST=(65, 43), D2=(71, 43))


def utw3():
    boss = (68.5, 32)
    sh = scythe_hit(boss, UTW3, 14.5) + [weapon((27, 50), "Sword")]
    return board(boss=list(boss), shapes=sh, roles=roles(**UTW3))


def utw4():
    boss = (27, 51)
    stg = dict(D4=(32, 26), H2=(37, 26), ST=(30, 32), D2=(35, 32))
    mtg = dict(D1=(42, 57), H1=(46, 58), MT=(40, 61), D3=(44, 63))
    sh = cross(boss, -23, 10, 105) + [weapon((49, 80), "Axe")]
    sh += linestack(boss, (33, 29), 3, 4.4) + linestack(boss, (43, 60), 3, 4.4)
    return board(boss=list(boss), shapes=sh, roles=roles(**stg, **mtg))


def utw5():
    sh = tornado((27, 49)) + aoe((51, 80), 15) + stack((51, 52), 7.2) + [weapon((73, 49), "Scythe")]
    return board(boss=[51, 80], shapes=sh, roles=clump((51, 52), ALL, 4.0, 5.2, 4))


UTW6 = dict(D3=(72, 40), MT=(78, 42), H1=(66, 45), D4=(82, 53), D1=(65, 53), ST=(66, 61), D2=(72, 62), H2=(78, 61))


def utw6():
    boss = (72, 52)
    sh = tornado((28, 51)) + tornado((51, 80)) + scythe_hit(boss, UTW6, 14) + [weapon((50, 21), "Sword")]
    return board(boss=list(boss), shapes=sh, roles=roles(**UTW6))


def utw7():
    boss = (48, 21)
    mtg = dict(MT=(48, 40), D1=(51.5, 41), H1=(47, 46.5), D3=(51.5, 47.5))
    stg = dict(ST=(66.5, 22), D4=(71, 18.5), H2=(73.5, 24.5), D2=(69.5, 28))
    sh = tornado((28, 50)) + tornado((72, 50)) + tornado((50, 80))
    sh += [rect((50, 24), 10, 120, -48, ORANGE, 0.45), rect((50, 24), 10, 120, 42, ORANGE, 0.45)]
    sh += linestack(boss, (49.5, 44), 3, 4.6) + linestack(boss, (70, 23), 3, 4.6)
    return board(boss=list(boss), shapes=sh, roles=roles(**mtg, **stg))


TORN = dict(D3=(43, 12), MT=(59, 11), H1=(20, 42), D1=(20, 63), D4=(79, 38), H2=(80, 64), ST=(43, 92), D2=(59, 92))


def utw8():
    tw = {"N": (50, 22), "W": (28, 52), "E": (72, 52), "S": (50, 82)}
    bait = {"N": ("D3", "MT"), "W": ("H1", "D1"), "E": ("D4", "H2"), "S": ("ST", "D2")}
    sh = []
    for k, c in tw.items():
        for s in bait[k]:
            sh.append(cone(c, ang(c, TORN[s]), 78, 50, ORANGE, 0.34))
    for c in tw.values():
        sh += tornado(c)
    return board(boss=[50, 51], shapes=sh, roles=roles(**TORN))


# ================================================================== Orbital Omen + Fire and Fury
def orb_base(cones=True, o=0.42, marks=True):
    sh = []
    if cones:
        sh += [cone((50, 50), 0, 92, 62, ORANGE, o), cone((50, 50), 180, 92, 62, ORANGE, o)]
    return sh


def orb_marks():
    return hexmark((43, 9.5), 1) + hexmark((56, 9.5), 2) + hexmark((81, 18), 1) + hexmark((81, 42), 2)


SQ = (37.5, 34.5, 62.5, 68)


def orb1():
    return board(boss=[50, 50], shapes=orb_base() + square_lines(*SQ, BLUE_SQ))


def orb2():
    return board(boss=[50, 50], shapes=orb_base() + square_lines(*SQ, BLUE_SQ) + orb_marks() + pin((57, 45.5)))


def orb3():
    sh = orb_base(o=0.32) + [rect((43.75, 50), 12.5, 67.5, 0, ORANGE, 0.5), rect((50, 17.5), 68.4, 11.25, 0, ORANGE, 0.5)]
    sh += square_lines(*SQ, BLUE_SQ) + orb_marks() + pin((57, 45.5)) + [arrow((56, 48.5), (47.5, 57), "#ffffff", 1.0)]
    return board(boss=[50, 50], shapes=sh)


def orb4():
    sh = orb_base(o=0.32) + [rect((56.25, 50), 12.5, 67.5, 0, ORANGE, 0.5), rect((50, 41.5), 68.4, 12.75, 0, ORANGE, 0.5)]
    sh += square_lines(*SQ, BLUE_SQ) + orb_marks() + pin((45, 53)) + [arrow((48.5, 53), (55, 46.5), "#ffffff", 1.0)]
    return board(boss=[50, 50], shapes=sh)


def orb5():
    return board(boss=[50, 50], shapes=square_lines(*SQ, BLUE_SQ) + orb_marks() + pin((57, 45)))


# ================================================================== Meteorain
MR_WAY = {"1": [23, 16], "2": [75, 16], "A": [50, 31], "D": [38, 51], "B": [62, 51], "C": [50, 68], "4": [24, 84], "3": [75, 84]}


def tcircle():
    return [cone((50, 51), 0, 300, 14.5, ORANGE, 0.42)]


def mr(shapes, rl, **kw):
    return board(boss=[50, 51], waymarks=MR_WAY, markSize=7.0, shapes=tcircle() + shapes, roles=rl, **kw)


SE6 = ["ST", "MT", "D2", "D1", "D3", "D4"]


def mr1():
    r = roles(H1=(43, 58), H2=(57, 48))
    r.update(clump((63, 77.5), SE6, 3.8, 5.0, 3))
    sh = marker((43, 58)) + marker((57, 48)) + linestack((50, 51), (63, 77), 3, 5.0)
    return mr(sh, r)


def mr2():
    r = roles(H1=(24, 86), H2=(60, 33))
    r.update(clump((63, 77.5), SE6, 3.8, 5.0, 3))
    sh = marker((24, 86)) + marker((60, 33)) + linestack((50, 51), (63, 77), 3, 5.0)
    return mr(sh, r)


def mr3():
    r = roles(D3=(30, 70), D4=(60, 60))
    r.update(clump((66.5, 27), ["H1", "H2", "D1", "D2"], 3.8, 5.0, 2))
    sh = rock((60, 36)) + rock((24, 86)) + marker((30, 70)) + marker((60, 60)) + linestack((50, 51), (66, 27), 3, 5.0)
    return mr(sh, r)


def mr4():
    r = roles(D1=(39, 58), D2=(57, 34))
    r.update(clump((66.5, 74), ["H1", "H2", "D3", "D4"], 3.8, 5.0, 2))
    sh = rock((59, 62)) + rock((31, 72)) + rock((24, 86)) + marker((39, 58)) + marker((57, 34)) + linestack((50, 51), (66, 74), 3, 5.0)
    return mr(sh, r)


def mr5():
    r = clump((66.5, 27), ["H1", "H2", "D1", "D2", "D3", "D4"], 3.8, 5.0, 3)
    sh = rock((60, 36)) + rock((37, 59)) + rock((31, 72)) + rock((24, 86)) + linestack((50, 51), (66, 27), 3, 5.0)
    return mr(sh, r)


def mr6():
    r = clump((20, 88), ALL, 3.2, 3.6, 4)
    sh = rock((37, 59)) + rock((31, 72)) + rock((24, 86))
    return mr(sh, r, iconSize=4.6)


def mr_tanks():
    sh = rock((60, 34)) + rock((59, 61)) + rock((37, 59)) + rock((31, 72)) + rock((23, 86))
    sh += square_lines(56, 26, 75, 68, "#2f8cff", 0.8) + square_lines(18, 43, 44, 93, "#7cf03a", 0.8)
    return mr(sh, roles(MT=(69, 45), ST=(38, 83)))


# ================================================================== Flatliner + Majestic Meteor (1:1 boards)
SPLIT_WAY = {"A": [50, 32], "D": [32, 51], "B": [68, 51], "C": [50, 68]}
SPLIT_WAY8 = {"1": [21, 26], "2": [79, 26], "A": [50, 32], "D": [32, 51], "B": [68, 51], "C": [50, 68], "4": [21, 74], "3": [79, 74]}
HOLES1 = [(30, 11), (89, 11), (3, 44), (3, 54), (97, 23), (97, 82)]
TOWERS = [(21, 32), (80, 32), (21, 72), (80, 72)]


def split(shapes, rl, way=None, holes=HOLES1, beams=(30, 89), boss_ring=True, **kw):
    F.k = 1.0
    sh = [rect((50.5, 50), 21, 72, 0, VOID, 1.0)]
    for x in beams:
        sh.append(line((x, 11), (x, 86), "#ffffff", 0.7, 0.95))
    if boss_ring:
        sh.append(ring((50, 51), 19, "#d23a3a", 0.5, 0.55))
    for h in holes:
        sh += [dot(h, 2.6, "#4a7fa8"), ring(h, 2.6, "#1f3c55", 0.5, 0.9), dot(h, 1.0, "#cfeaff", 0.8)]
    s = {"frame": [1, 1], "bg": "#f1eee8",
         "arena": {"shape": "square", "at": [50.5, 50], "w": 95, "h": 72, "fill": TAN, "lines": False, "edge": "#8a7250"},
         "waymarks": way if way is not None else SPLIT_WAY, "markSize": 4.6, "iconSize": 5.4, "bossSize": 8,
         "boss": [50, 51], "shapes": sh + shapes, "roles": rl}
    s.update(kw)
    return s


def tower(c):
    out = []
    for a in range(0, 360, 45):
        out += chevron(off(c, a, 10.2), a, 3.0, 1.4, "#f5ead6", 1.2, 0.95)
    out += [circle(c, 7.5, "#5aa0d8", 0.85, 0.01), ring(c, 7.5, "#1c3a66", 0.6), ring((c[0], c[1] - 2.6), 2.4, "#d84a4a", 0.6, 0.9),
            ring((c[0], c[1] + 2.6), 2.4, "#d84a4a", 0.6, 0.9)]
    return out


def tethers(pairs, rl):
    return [line(h, rl[s], PINK, 0.6, 0.9) for h, s in pairs]


def fl1():
    F.k = 1.0
    sh = [rect((49.5, 50), 29, 94, 0, ORANGE, 0.42)]
    for a in (0, 60, 120, 180, 240, 300):
        sh += chevron(off((50, 51), a, 7.5), a, 3.2, 1.5, "#f5ead6", 1.2, 0.95)
    sh.append(ring((50, 51), 8.8, "#d23a3a", 0.7, 0.85))
    rl = roles(H1=(38.5, 49), MT=(43, 49), D3=(38.5, 54), D1=(43, 54), ST=(58, 49), H2=(63, 49), D2=(58, 54), D4=(63, 54))
    return {"frame": [1, 1], "bg": "#f1eee8",
            "arena": {"shape": "square", "at": [50, 50], "w": 94, "h": 94, "fill": TAN, "lines": False, "edge": "#8a7250"},
            "waymarks": SPLIT_WAY, "markSize": 4.6, "iconSize": 5.2, "bossSize": 7, "boss": [50, 51], "shapes": sh, "roles": rl}


FL2 = dict(H1=(26, 48), MT=(34, 48), D3=(26, 58), D1=(34, 58), ST=(70, 49), H2=(75, 53), D2=(70, 58), D4=(81, 58))


def fl2():
    sh = []
    for t in TOWERS:
        sh += tower(t)
    sh += tethers([((3, 44), "ST"), ((3, 54), "H2"), ((97, 23), "D1"), ((97, 82), "D3")], FL2)
    return split(sh, roles(**FL2))


FL3 = dict(D3=(19, 34), MT=(24, 34), H1=(19, 69), D1=(24, 69), H2=(78, 35), D4=(83, 35), ST=(78, 68), D2=(83, 68))


def fl3():
    sh = []
    for t in TOWERS:
        sh += tower(t)
    sh += tethers([((3, 44), "ST"), ((3, 54), "H2"), ((97, 23), "D1"), ((97, 82), "D3")], FL3)
    return split(sh, roles(**FL3))


FL4 = dict(D1=(27, 45), MT=(37, 50), D3=(27, 56), H1=(37, 55.5), H2=(71, 47), D4=(64, 51), D2=(64, 56), ST=(72, 60))


def fl4():
    sh = tethers([((3, 44), "ST"), ((3, 54), "H2"), ((97, 23), "D1"), ((97, 82), "D3")], FL4)
    return split(sh, roles(**FL4), way=SPLIT_WAY8)


FL5 = dict(D1=(32, 50.5), MT=(37, 50.5), D3=(32, 56), H1=(37, 56), D4=(64, 51), H2=(69, 51), D2=(64, 56), ST=(69, 56))


def fl5():
    sh = []
    for c in ((36, 50), (37.5, 54), (36, 57.5), (39, 59)):
        sh += aoe(c, 9.5, 0.5)
    for c in ((64, 50), (65.5, 54), (64, 57.5), (67, 59)):
        sh += aoe(c, 9.5, 0.5)
    sh += [rect(c, 2.6, 2.6, 0, "#ff6a10", 0.95) for c in ((34.5, 47), (34.5, 52.5), (61, 47), (61, 52.5))]
    sh += tethers([((3, 44), "ST"), ((3, 54), "H2"), ((97, 23), "D1"), ((97, 82), "D3")], FL5)
    return split(sh, roles(**FL5), way=SPLIT_WAY8)


FL6 = dict(D3=(19, 17), MT=(19, 31), H1=(19, 72), D1=(19, 87.5), H2=(77, 17), D4=(77, 31), D2=(77, 73), ST=(77, 87))
FL6_WAY = {"1": [21, 28], "2": [79, 28], "A": [50, 34], "D": [32, 52], "B": [68, 52], "C": [50, 71], "4": [21, 76], "3": [79, 76]}
FL6_TETH = [((3, 44), "ST"), ((3, 54), "H2"), ((97, 23), "D1"), ((97, 82), "D3")]


def fl6():
    sh = []
    for c in ((38, 38), (62, 38), (38, 64), (62, 64)):
        sh += [circle(c, 9.5, ORANGE, 0.16, 0.01)]
    for c in ((38, 21), (40, 24), (62, 21), (64, 24), (38, 82), (40, 85), (62, 82), (64, 85)):
        sh += aoe(c, 9.5, 0.45)
    sh += tethers(FL6_TETH, FL6)
    return split(sh, roles(**FL6), way=FL6_WAY)


def fl7():
    sh = [rect((30, 50), 9, 75, 0, "#ffffff", 0.35), rect((89, 50), 9, 75, 0, "#ffffff", 0.35)]
    for h, s in FL6_TETH:
        p = FL6[s]
        a = ang(h, p)
        L = dist(h, p) + 14
        mid = off(h, a, L / 2)
        sh.append(rect(mid, 12, L, a, ORANGE, 0.33))
    sh.append(circle((50, 51), 6, "#e04a7a", 0.35, 0.01))
    sh += tethers(FL6_TETH, FL6)
    return split(sh, roles(**FL6), way=FL6_WAY)


FL8 = dict(MT=(21, 33.5), D3=(21, 38), H2=(80, 34), D4=(80, 38), D1=(21, 66), H1=(26, 71), ST=(80, 66), D2=(76, 71))
HOLES2 = [(12, 11), (89, 11), (2, 21), (2, 82), (98, 43), (98, 54)]


def fl8():
    sh = []
    for t in ((21, 30), (80, 30), (21, 70), (80, 70)):
        sh += tower(t)
    sh += tethers([((2, 21), "D1"), ((2, 82), "H2"), ((98, 43), "ST"), ((98, 54), "MT")], FL8)
    return split(sh, roles(**FL8), holes=HOLES2, beams=(12, 89))


def generic(c, k):
    inner = {"T": "#22407a", "H": "#2c5a2a", "D": "#5a2a2a"}[k]
    return [rect(c, 4.6, 4.6, 0, "#a08a5a", 1, 0.01), rect(c, 3.9, 3.9, 0, inner, 1, 0.01), text((c[0], c[1] + 0.15), k, 2.7)]


def fl9():
    sh = []
    for k, x, y in (("D", 29, 50), ("T", 35, 50), ("D", 29, 57), ("H", 35, 57), ("T", 63, 50), ("D", 69, 50), ("H", 63, 57), ("D", 69, 57)):
        sh += generic((x, y), k)
    for c in ((32, 53.5), (66, 53.5)):
        for a in (90, 270):
            sh += chevron(off(c, a, 5.4), a + 180, 3.4, 1.6, "#ffe04a", 1.4, 0.95)
    return split(sh, {}, way={}, holes=[], beams=())


# ================================================================== Ecliptic Stampede
PUDDLES = [(33, 8), (42, 8), (52, 8), (61, 8), (47, 18), (56, 18), (44, 82), (54, 82), (40, 94), (49, 94), (58, 94), (67, 94)]


def puddles():
    out = []
    for c in PUDDLES:
        out += [circle(c, 7, "#7a2a10", 0.18, 0.01), ring(c, 7, "#8b2c12", 1.1, 0.85), dot(c, 1.3, "#fff0b0", 0.95)]
    return out


def prox(c):
    out = [ring(c, 3.6, "#2f6fe0", 0.7), dot(c, 1.0, "#e03a3a")]
    for a in (0, 120, 240):
        out += chevron(off(c, a, 6.2), a, 3.4, 1.6, "#5a9cff", 1.2, 0.95)
    return out


ST1 = dict(MT=(46, 44), ST=(53, 44), D1=(46, 54), D2=(53, 54), H1=(46, 25), D3=(53, 25), H2=(46, 76), D4=(53, 76))


def es1():
    return board(boss=[50, 49], shapes=[], roles=roles(**ST1))


def es2():
    sh = prox((80, 12)) + prox((21, 89)) + marker((53, 25)) + marker((46, 76))
    return board(boss=[50, 49], shapes=sh, roles=roles(**ST1))


def es3():
    r = roles(D3=(33, 10), H2=(69, 92))
    r.update(clump((50, 50), ["MT", "ST", "H1", "D4", "D1", "D2"], 4.4, 6.0, 3))
    sh = prox((80, 12)) + prox((21, 89)) + aoe((50, 50), 12, 0.42) + [ring((33, 10), 7, "#8b2c12", 1.2, 0.85), ring((69, 92), 7, "#8b2c12", 1.2, 0.85)]
    sh += marker((33, 10)) + marker((69, 92))
    return board(boss=[50, 50], shapes=sh, roles=r)


def es4():
    sh = puddles()
    for c in ((40.5, 36), (57, 32), (64, 47), (57, 62), (43, 64), (37, 48)):
        sh += aoe(c, 12, 0.36)
    sh += marker((36, 25)) + marker((63, 80))
    r = roles(D3=(36, 25), H2=(63, 80))
    r.update(clump((35, 37.5), ["MT", "ST", "D1", "D4", "D2", "H1"], 3.6, 4.4, 3))
    return board(boss=[50, 50], shapes=sh, roles=r)


TW_ROLES = dict(MT=(44, 37), D1=(54, 36), D2=(60, 36), ST=(44, 54), H1=(55, 56), D4=(61, 56), D3=(36, 25), H2=(63, 80))


def es_tower(c, two):
    out = [circle(c, 5.5, "#f2a0d0", 0.35, 0.01), ring(c, 5.5, "#e070b0", 0.45)]
    if two:
        out += [ring((c[0] - 1.6, c[1]), 1.2, "#ffffff", 0.35), ring((c[0] + 1.6, c[1]), 1.2, "#ffffff", 0.35)]
    else:
        out += [ring(c, 1.2, "#ffffff", 0.35)]
    return out


def es5():
    sh = puddles()
    sh += es_tower((44.5, 44), False) + es_tower((57, 44), True) + es_tower((44.5, 61), False) + es_tower((57, 61), True)
    sh += marker((36, 25)) + marker((63, 80))
    return board(boss=[50, 50], shapes=sh, roles=roles(**TW_ROLES))


TETH = dict(MT=(21, 90), ST=(21, 14), H1=(79, 14), D2=(79, 90), D3=(47.5, 47), D1=(53, 46.5), D4=(48.5, 55), H2=(54, 55))
TETH_EDGE = [((52, 1), "MT"), ((90, 53), "ST"), ((51, 99), "H1"), ((10, 52), "D2")]


def es6():
    sh = puddles()
    for e, s in TETH_EDGE:
        sh += [line(e, TETH[s], "#f5f03a", 1.0, 0.95), dot(e, 0.9, "#ffffff")]
    return board(boss=[50, 50], shapes=sh, roles=roles(**TETH))


FOUR = dict(ST=(37, 35), D3=(44, 41), H1=(63, 35), D1=(57, 41), MT=(37, 67), D4=(44, 59), D2=(63, 67), H2=(57, 59))


def es7():
    sh = puddles() + [rect((50, 50), 10, 140, -50, ORANGE, 0.45), rect((50, 50), 10, 140, 50, ORANGE, 0.45)]
    return board(boss=[50, 50], shapes=sh, roles=roles(**FOUR))


TWO = dict(ST=(32, 47), MT=(32, 55), D3=(38.5, 51), D4=(44, 51), D1=(57.5, 51), H2=(63, 51), H1=(69, 47), D2=(69, 56))


def es8():
    sh = puddles() + [rect((50, 52), 110, 12, 0, ORANGE, 0.45)]
    return board(boss=[50, 51], shapes=sh, roles=roles(**TWO))


FOUR_T = dict(ST=(21, 13), H1=(79, 13), MT=(21, 90), D2=(79, 90), D3=(44, 42), D1=(57, 41), D4=(44, 57), H2=(57, 58))


def es_four_table():
    sh = puddles() + [rect((50, 50), 10, 140, -50, ORANGE, 0.42), rect((50, 50), 10, 140, 50, ORANGE, 0.42)]
    for e, s in TETH_EDGE:
        sh.append(line(e, FOUR_T[s], "#f5f03a", 0.7, 0.45))
    sh += [arrow((36.5, 27), (42.5, 37.5), "#ff4a3a", 0.9), arrow((63, 77), (58.5, 63), "#ff4a3a", 0.9)]
    sh += [text((10, 50), "W", 4.2, "#3a9cff"), text((90, 50), "E", 4.2, "#ff4a3a")]
    return board(boss=[50, 50], shapes=sh, roles=roles(**FOUR_T))


def es_two_table():
    sh = puddles() + [rect((50, 52), 110, 12, 0, ORANGE, 0.42)]
    for e, s in TETH_EDGE:
        sh.append(line(e, FOUR_T[s], "#f5f03a", 0.7, 0.4))
    B, Rr = "#3a9cff", "#ff4a3a"
    sh += [arrow((22, 17), (30.5, 43), B, 0.9), arrow((37, 26), (38, 46), B, 0.9), arrow((22, 86), (30.5, 59), B, 0.9),
           arrow((55, 62), (46.5, 54), B, 0.9), arrow((57.5, 41), (57.5, 47), Rr, 0.9), arrow((63, 78), (63, 56), Rr, 0.9),
           arrow((78, 17), (70.5, 43), Rr, 0.9), arrow((78, 86), (70.5, 60), Rr, 0.9)]
    sh += [text((10, 52), "W", 4.2, B), text((90, 52), "E", 4.2, Rr)]
    return board(boss=[50, 51], shapes=sh, roles=roles(**TWO))
