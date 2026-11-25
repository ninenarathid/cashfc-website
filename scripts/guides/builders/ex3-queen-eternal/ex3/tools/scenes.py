"""Every scene of the EX3 guide, redrawn from game8's pictures (measured in percent of a 1:1 frame)."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex3/tools")
from shapes import *  # noqa

G8 = lambda n, h: f"https://img.game8.jp/{n}/{h}/show"
EVERY = ("MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4")
BOSS = [50, 4.6]


def sc(shapes, roles=None, boss=None, **kw):
    out = {"shapes": shapes}
    if boss is not None:
        out["boss"] = boss
    if roles:
        out["roles"] = roles
    out.update(kw)
    return out


def tokens(*items, s=6.4):
    out = []
    for k, x, y in items:
        out += token(x, y, k, s)
    return out


# ============================================================ Aethertithe + Retribute
APEX = (50.1, 9.5)


def ae_cone(side):
    """The cone from the boss: 'W' (game8 1: east is safe), 'E' (2: west safe), 'M' (3: the middle is hit)."""
    if side == "W":
        return cone(APEX, 287.5, 145, 130) + edge_ray(APEX, 215.1, 110)
    if side == "E":
        return cone(APEX, 72.5, 145, 130) + edge_ray(APEX, 144.9, 110)
    return cone(APEX, 180, 90, 130) + edge_ray(APEX, 135, 80) + edge_ray(APEX, 225, 80)


def group4(mt, st, dx=8.9, dy=7.5, a=("MT", "H1", "D1", "D3"), b=("ST", "H2", "D2", "D4")):
    roles = {}
    for (x, y), names in ((mt, a), (st, b)):
        roles[names[0]] = [R(x), R(y)]
        roles[names[1]] = [R(x + dx), R(y)]
        roles[names[2]] = [R(x), R(y + dy)]
        roles[names[3]] = [R(x + dx), R(y + dy)]
    return roles


def ae1():
    s = square() + ae_cone("W") + stack_star(48.4, 47.0) + stack_star(71.3, 36.9)
    return sc(s, group4((43.9, 43.2), (67.0, 33.1)), BOSS)


def ae2():
    s = square() + ae_cone("E") + stack_star(22.1, 33.0) + stack_star(49.6, 54.2)
    return sc(s, group4((17.6, 29.3), (45.3, 50.1), dx=9.0), BOSS)


def ae3():
    s = square() + ae_cone("M") + stack_star(21.2, 31.8) + stack_star(80.0, 26.0)
    return sc(s, group4((16.7, 27.9), (75.7, 21.7), dx=8.8), BOSS)


# ============================================================ Virtual Shift 1 (wind)
GREENS = [(31.5, 39.6, 12.4), (70.0, 59.2, 12.6)]


def greens():
    out = []
    for x, y, r in GREENS:
        out += [{"t": "circle", "at": [x, y], "r": r, "c": "#c4e88a", "o": 0.52, "wd": 0.01},
                {"t": "ring", "at": [x, y], "r": r, "c": "#e6dc96", "wd": 0.4, "o": 0.9}]
    return out


ORB_L, ORB_R = (29.6, 5.6), (70.5, 5.6)


def party(x, y, size=4.6, gap=4.5):
    """The whole party in one tight block (game8 draws it as one T, H and D)."""
    return cluster(x, y, gap=gap, cols=4)


def vs1_1():
    s = xfloor() + stack_star(33.9, 37.8) + stack_star(68.2, 61.6)
    roles = group4((29.6, 34.1), (64.0, 57.7), dx=8.6, dy=7.3)
    return sc(s, roles, BOSS)


def vs1_2():
    return sc(xfloor() + greens(), party(51.0, 48.8), BOSS, iconSize=4.4)


def vs1_3():
    return sc(xfloor() + greens() + orb(*ORB_R), party(51.0, 48.8), BOSS, iconSize=4.4)


CH = "#9b1f9b"


def vs1_4():
    s = xfloor() + greens() + orb(*ORB_L) + orb(*ORB_R)
    s += tether((17.0, 77.5), (79.5, 18.5), CH, 0.75) + tether((25.5, 80.0), (83.5, 22.8), CH, 0.75)
    s += tokens(("T", 14.6, 79.2), ("H", 22.6, 81.6), ("D", 81.6, 16.2), ("D", 85.8, 20.4))
    return sc(s, None, BOSS)


def vs1_5():
    s = xfloor() + greens() + half(50.0, 13.1, 90.2, 86.4, o=0.45) + orb(*ORB_L) + orb(*ORB_R)
    s += tokens(("D", 44.5, 20.6), ("D", 41.4, 18.6), ("T", 37.6, 77.6), ("H", 40.8, 81.8))
    return sc(s, None, BOSS)


def vs1_6():
    s = xfloor() + greens() + half(10.8, 13.1, 50.0, 86.4, o=0.45) + orb(*ORB_L)
    s += tokens(("D", 54.6, 15.4), ("D", 55.7, 23.0), ("T", 56.1, 75.4), ("H", 55.6, 82.4))
    return sc(s, None, BOSS)


def vs1_7():
    s = xfloor() + greens()
    s += tokens(("D", 14.9, 14.6), ("D", 30.1, 16.9), ("D", 22.0, 23.5), ("D", 84.9, 16.4),
                ("T", 14.8, 77.4), ("H", 23.5, 81.6), ("T", 85.6, 77.0), ("H", 81.4, 83.3))
    for x, y in ((14.5, 7.4), (29.5, 9.4), (22.3, 16.6), (14.6, 70.0), (23.3, 74.4)):
        s += kb_tag(x, y, True)
    for x, y in ((85.0, 8.8), (85.7, 68.6), (81.0, 75.6)):
        s += kb_tag(x, y, False)
    return sc(s, None, BOSS)


# ============================================================ Virtual Shift 2 (earth)
def tower(x, y, r=3.4):
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#e05a4a", "o": 0.22, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#e2574a", "wd": 0.75, "o": 0.9}]


def es1():
    return sc(earth(), cluster(49.0, 47.6, gap=3.0, cols=4), BOSS, iconSize=3.2)


def es2():
    s = earth() + half(50.0, 0, 100, 100, o=0.45, edge=None)
    s += orb(29.6, 4.6) + orb(67.5, 4.6)
    s[-6:-3] = [dict(x, o=0.35) for x in s[-6:-3]]
    return sc(s, cluster(47.4, 49.0, gap=3.0, cols=2), BOSS, iconSize=3.2)


ES3 = {"D1": [29.0, 31.4], "MT": [38.5, 31.4], "D3": [29.2, 55.8], "H1": [38.6, 55.8],
       "ST": [62.6, 32.0], "D2": [71.6, 32.0], "H2": [62.4, 55.8], "D4": [71.7, 55.8]}


def es3():
    s = earth()
    for x, y in ES3.values():
        s += tower(x, y)
    return sc(s, ES3, BOSS, iconSize=5.0)


GE_BOSS = [48.3, 11.4]


def ge_base():
    s = earth()
    for x, y in ((34.0, 31.2), (34.0, 56.5), (67.0, 31.2), (67.0, 56.4)):
        s += tower(x, y)
    s += tether(GE_BOSS, (29.2, 8.2), "#e8702a", 0.5) + tether(GE_BOSS, (66.7, 8.2), "#e8702a", 0.5)
    return s


GE_TOK = (("D", 29.2, 8.2), ("H", 66.7, 8.2), ("D", 34.0, 30.7), ("H", 33.9, 57.1), ("D", 66.9, 30.6), ("T", 66.9, 56.3), ("T", 9.6, 42.4), ("D", 78.0, 81.6))


def ge1():
    s = ge_base() + trident(9.3, 36.6) + trident(77.8, 75.8)
    s += tokens(*GE_TOK, s=5.4)
    return sc(s, None, GE_BOSS, bossSize=6.4)


def ge2():
    s = ge_base()
    s += cone(GE_BOSS, 276.3, 38.9, 70) + edge_ray(GE_BOSS, 256.8, 60) + edge_ray(GE_BOSS, 295.7, 30)
    s += cone(GE_BOSS, 85.4, 36.9, 70) + edge_ray(GE_BOSS, 103.8, 60) + edge_ray(GE_BOSS, 66.9, 30)
    s += aoe_circle(9.6, 41.95, 18.95) + aoe_circle(78.05, 80.9, 18.95)
    s += tokens(*GE_TOK, s=5.4)
    return sc(s, None, GE_BOSS, bossSize=6.4)


MT1 = {"D1": [27.5, 30.6], "MT": [27.5, 44.6], "H1": [49.0, 34.0], "H2": [49.9, 49.7],
       "D3": [14.6, 48.2], "ST": [60.8, 45.0], "D2": [61.4, 30.8], "D4": [66.9, 68.8]}


def mt1():
    s = earth()
    for x, y in MT1.values():
        s += green_mark(x, y - 5.1)
    return sc(s, MT1, BOSS, iconSize=5.0)


METEOR_R = 6.1


def meteor_aoe(x, y):
    return aoe_circle(x, y, METEOR_R, c="#7fd48f", o=0.6, edge="#e8e49a")


def mt2():
    s = earth()
    for x, y in MT1.values():
        s += meteor_aoe(x, y)
    return sc(s, MT1, BOSS, iconSize=5.0)


ROCKS1 = [(27.8, 29.9), (27.6, 44.9), (60.8, 29.9), (60.6, 45.7)]
MT3 = dict(MT1, D1=[40.0, 30.6], MT=[40.8, 45.2], D2=[73.2, 31.0], ST=[73.3, 45.4])


def mt3():
    s = earth()
    for x, y in ROCKS1:
        s += rock(x, y)
    for x, y in MT3.values():
        s += meteor_aoe(x, y)
    return sc(s, MT3, BOSS, iconSize=5.0)


ROCKS2 = ROCKS1 + [(41.0, 30.0), (40.8, 45.0), (73.4, 31.0), (72.5, 45.7)]


def mt4():
    s = earth()
    for x, y in ROCKS2:
        s += rock(x, y)
    s += arrow((32.4, 35.7), (38.4, 35.7), wd=0.9) + arrow((40.8, 35.2), (40.8, 49.6), wd=0.9) + arrow((38.4, 50.0), (27.2, 50.0), wd=0.9)
    s += arrow((65.0, 35.4), (71.4, 35.4), wd=0.9) + arrow((72.7, 34.6), (72.7, 49.0), wd=0.9) + arrow((70.6, 49.5), (59.2, 49.5), wd=0.9)
    s += tokens(("D", 26.7, 34.3, ), ("T", 29.0, 34.3), ("H", 27.6, 37.7), s=3.4)
    s += tokens(("D", 59.4, 34.3), ("T", 61.7, 34.3), ("H", 60.4, 37.7), s=3.4)
    return sc(s, None, BOSS)


# ============================================================ Divide and Conquer
DC_O = (49.8, 9.5)
DC_FAR = {"MT": (1, 21.6), "D1": (1, 56.6), "D3": (1.0, 96.5), "H1": (22.4, 99), "ST": (99, 18.0), "D2": (99, 50.5), "D4": (99, 78.6), "H2": (87.7, 99)}
DC_ROLES = {"MT": [33.5, 14.4], "ST": [68.6, 13.7], "D1": [31.5, 27.2], "D2": [68.6, 27.1],
            "D3": [30.7, 43.9], "D4": [71.2, 41.1], "H1": [35.6, 61.6], "H2": [71.0, 60.4]}


def dc_beams():
    out = []
    for seat, far in DC_FAR.items():
        a = ang(DC_O, far)
        ux, uy = unit(a)
        out += bar(DC_O, (DC_O[0] + ux * 115, DC_O[1] + uy * 115), 9.6, o=0.42)
    return out


def dc1():
    return sc(square(ring=False) + dc_beams(), DC_ROLES)


def dc2():
    return sc(square() + dc_beams(), cluster(50.8, 51.6, gap=4.4, cols=4), iconSize=4.6)


# ============================================================ Coronation
def cor():
    s = square(ring=False)
    x0, y0, x1, y1 = SQ
    for a, b in ((15.0, 46.3), (54.5, 85.8)):
        s += [rect(a, y0, b, y1, AOE, 0.42)] + outline(a, y0, b, y1, TAN, 0.3, 0.7)
        s += [rect(x0, a, x1, b, AOE, 0.42)] + outline(x0, a, x1, b, TAN, 0.3, 0.7)
    s += device(70.0, 6.0, 0) + device(3.4, 32.0, 270) + device(96.6, 72.0, 90) + device(30.0, 95.0, 180)
    for p, q in (((64.5, 7.0), (50.7, 11.0)), ((75.5, 7.0), (89.7, 11.3)), ((6.0, 26.5), (10.6, 10.3)), ((6.0, 37.5), (10.3, 50.8)),
                 ((94.2, 66.5), (90.2, 51.2)), ((94.2, 77.5), (89.7, 90.4)), ((24.5, 94.0), (10.1, 90.6)), ((35.5, 94.0), (50.2, 90.8))):
        s += tether(p, q, "#f0a030", 0.7)
    s += tokens(("H", 10.6, 10.3), ("D", 50.7, 11.0), ("D", 89.7, 11.3), ("T", 10.3, 50.8),
                ("H", 90.2, 51.2), ("T", 10.1, 90.6), ("D", 50.2, 90.8), ("D", 89.7, 90.4), s=6.4)
    return sc(s, None)


# ============================================================ Absolute Authority
def puddle(x, y, o=0.75, r=16.6):
    return aoe_circle(x, y, r, c="#f2a12a", o=o, edge="#f6d68e", ewd=0.5)


def aa1():
    return sc(square(ring=True) + puddle(89.2, 11.0, 0.85), cluster(88.0, 12.8, gap=3.3, cols=4), iconSize=3.4)


def aa2():
    s = square() + puddle(89.2, 11.0, 0.45) + puddle(70.0, 12.6, 0.62)
    s += arrow((81.5, 32.3), (56.5, 32.3), wd=1.4)
    return sc(s, cluster(66.8, 14.6, gap=3.3, cols=4), iconSize=3.4)


def aa3():
    s = square() + puddle(89.2, 11.0, 0.4) + puddle(70.0, 12.6, 0.4) + puddle(49.0, 15.0, 0.45) + puddle(49.5, 36.6, 0.55)
    return sc(s, cluster(48.9, 35.6, gap=3.3, cols=4), iconSize=3.4)


FLARE_TH = {"MT": [11.2, 13.4], "ST": [86.7, 13.8], "H1": [11.2, 50.4], "H2": [88.3, 51.5]}
FLARE_D = {"D1": [10.8, 13.4], "D2": [86.6, 13.3], "D3": [8.1, 51.5], "D4": [87.8, 53.0]}


def aa4():
    s = square()
    for x, y in FLARE_TH.values():
        s += flare_marker(x, y)
    s += stack_star(50.2, 51.8)
    roles = dict(FLARE_TH, D1=[46.5, 48.2], D2=[54.0, 48.2], D3=[46.5, 55.2], D4=[54.0, 55.6])
    return sc(s, roles, iconSize=5.6)


def aa5():
    s = square()
    for x, y in FLARE_D.values():
        s += flare_marker(x, y)
    s += stack_star(49.6, 51.0)
    roles = dict(FLARE_D, MT=[45.8, 47.7], ST=[53.3, 47.7], H1=[45.8, 54.3], H2=[53.3, 54.6])
    return sc(s, roles, iconSize=5.6)


AA6 = {"D1": [16.4, 30.5], "D3": [22.5, 36.9], "D2": [87.8, 32.2], "D4": [81.6, 37.2],
       "MT": [45.8, 47.2], "ST": [53.3, 47.2], "H1": [45.8, 54.3], "H2": [53.3, 54.6]}


def aa6():
    s = square()
    for seat, (x, y) in AA6.items():
        s += red_tri(x, y - (3.9 if seat in ("H1", "H2") else 6.1))
    return sc(s, AA6, iconSize=5.6)


def aa7():
    s = square()
    for x in (16.2, 33.4, 50.0, 69.2, 85.2):
        s += kb_down(x, 8.6)
    return sc(s, cluster(55.6, 43.0, gap=6.4, cols=4), iconSize=5.4)


# ============================================================ Virtual Shift 3 (ice)
ICIS = [(26.6, 95.0), (42.4, 95.0), (57.2, 95.0), (72.4, 95.0)]        # south icicles 1-4, west to east
ICI_W = [(5.5, 55.7), (5.5, 72.6)]                                     # west icicles, north then south
ICI_E = [(94.3, 58.4), (94.3, 74.4)]                                   # east icicles, north then south
TOP = lambda p: (p[0], p[1] - 4.6)                                     # where a south icicle's tether leaves
SIDE_W = lambda p: (p[0] + 1.4, p[1])
SIDE_E = lambda p: (p[0] - 1.4, p[1])


def icicles(south=True, sides=False):
    out = []
    if south:
        for x, y in ICIS:
            out += icicle(x, y, h=10.0, w=3.0)
    if sides:
        for x, y in ICI_W + ICI_E:
            out += icicle(x, y, h=10.5, w=3.0)
    return out


TS = 5.2
D_TOP = [("D", 13.4, 12.9), ("D", 24.0, 13.2), ("D", 75.2, 13.1), ("D", 87.1, 13.0)]


def ice1():
    s = ice() + icicles()
    ds = [(46.2, 72.0), (46.1, 80.2), (53.9, 81.6), (53.9, 73.6)]     # tethered to icicles 1, 2, 3, 4
    for k in range(4):
        s += pink_tether(TOP(ICIS[k]), ds[k])
    s += tokens(("T", 46.2, 56.4), ("T", 54.0, 57.0), ("H", 45.8, 64.0), ("H", 54.9, 64.0), *[("D", x, y) for x, y in ds], s=TS)
    return sc(s, None)


def ice2():
    s = ice() + icicles()
    ds = [(63.3, 56.3), (66.3, 74.6), (34.3, 72.1), (34.3, 58.6)]
    for k in range(4):
        s += pink_tether(TOP(ICIS[k]), ds[k])
    s += tokens(("T", 46.2, 56.4), ("T", 54.0, 57.0), ("H", 45.8, 64.0), ("H", 54.9, 64.0), *[("D", x, y) for x, y in ds], s=TS)
    return sc(s, None)


def ice3():
    s = ice() + icicles()
    ends = [(75.2, 13.1), (87.1, 13.0), (13.4, 12.9), (24.0, 13.2)]
    for k in range(4):
        s += pink_tether(TOP(ICIS[k]), ends[k])
    s += tokens(*D_TOP, ("H", 45.6, 58.5), ("T", 54.0, 57.0), ("H", 54.1, 66.5), ("T", 45.4, 71.0), s=TS)
    return sc(s, None)


def ice4():
    s = ice() + icicles(sides=True)
    s += pink_tether(SIDE_W(ICI_W[0]), (45.4, 71.0)) + pink_tether(SIDE_W(ICI_W[1]), (45.6, 58.5))
    s += pink_tether(SIDE_E(ICI_E[0]), (54.1, 66.5)) + pink_tether(SIDE_E(ICI_E[1]), (54.0, 57.0))
    s += tokens(*D_TOP, ("H", 45.6, 58.5), ("T", 54.0, 57.0), ("H", 54.1, 66.5), ("T", 45.4, 71.0), s=TS)
    return sc(s, None)


def ice5():
    s = ice() + icicles(sides=True)
    s += pink_tether(SIDE_W(ICI_W[0]), (65.3, 74.3)) + pink_tether(SIDE_W(ICI_W[1]), (66.2, 57.6))
    s += pink_tether(SIDE_E(ICI_E[0]), (35.1, 73.1)) + pink_tether(SIDE_E(ICI_E[1]), (33.5, 57.4))
    s += tokens(*D_TOP, ("T", 33.5, 57.4), ("H", 35.1, 73.1), ("H", 66.2, 57.6), ("T", 65.3, 74.3), s=TS)
    return sc(s, None)


def ice6():
    s = ice() + icicles(sides=True)
    s += pink_tether(SIDE_W(ICI_W[0]), (86.2, 86.8)) + pink_tether(SIDE_W(ICI_W[1]), (89.0, 42.8))
    s += pink_tether(SIDE_E(ICI_E[0]), (13.1, 85.6)) + pink_tether(SIDE_E(ICI_E[1]), (13.5, 43.0))
    s += tokens(*D_TOP, ("T", 13.5, 43.0), ("H", 89.0, 42.8), ("H", 13.1, 85.6), ("T", 86.2, 86.8), s=TS)
    return sc(s, None)


def ice7():
    s = ice() + orb(66.6, 6.2, r=6.6)
    s += tokens(("D", 21.7, 40.2), ("D", 13.2, 46.6), ("D", 84.3, 36.4), ("D", 74.8, 40.9),
                ("T", 32.4, 57.8), ("H", 34.4, 74.5), ("H", 63.7, 58.2), ("T", 63.5, 74.3), s=TS)
    return sc(s, None, [49.4, 5.2])


def ice8():
    s = ice() + half(51.0, 0, 100, 100, o=0.45, edge=None) + orb(66.6, 6.2, r=6.6, lit=True)
    return sc(s, cluster(46.0, 62.6, gap=5.0, cols=2), [49.4, 5.2], iconSize=4.4)


# The icicle table: game8's own drawing of where each tether goes (a 440 x 399 picture).
TB_F = [440, 399]
TB_W, TB_M, TB_E = (10.9, 1.3, 26.8, 87.2), (41.8, 35.3, 58.0, 87.2), (72.5, 1.3, 88.6, 87.2)
TB_BR = [(26.8, 47.0, 41.8, 58.5), (26.8, 64.2, 41.8, 75.6), (58.0, 47.5, 72.5, 59.0), (58.0, 64.6, 72.5, 76.0)]
TB_COL = {1: "#e8402a", 2: "#f08a2a", 3: "#f2e23a", 4: "#4fd04a", 5: "#3f8ef0", 6: "#f08ad0", 7: "#a64ff0", 8: "#5a3ff0"}
TB_PATH = {
    1: [(53.6, 53.4), (66.0, 53.2), (73.0, 52.0), (76.0, 46.0), (76.6, 30.0), (76.6, 10.5)],
    2: [(53.6, 69.4), (66.0, 69.6), (79.0, 67.5), (83.5, 60.0), (85.0, 40.0), (85.6, 10.5)],
    3: [(46.4, 70.6), (34.0, 70.0), (22.0, 68.0), (17.0, 57.0), (15.0, 35.0), (13.6, 10.5)],
    4: [(46.4, 53.0), (34.0, 52.6), (26.0, 50.0), (23.5, 42.0), (23.2, 10.5)],
    5: [(53.6, 72.6), (66.0, 72.6), (77.5, 74.0), (83.6, 78.4)],
    6: [(46.4, 73.6), (34.0, 72.5), (22.0, 73.5), (16.2, 79.8)],
    7: [(53.6, 57.6), (66.0, 56.8), (80.0, 55.0), (85.0, 47.2)],
    8: [(46.4, 56.4), (34.0, 55.2), (22.0, 53.2), (15.8, 47.8)],
}
TB_NUM = {1: (76.6, 5.0), 2: (86.0, 5.0), 3: (13.6, 5.0), 4: (23.0, 5.0), 5: (87.6, 82.0), 6: (13.6, 83.0), 7: (85.4, 42.0), 8: (14.6, 43.0)}
TB_ICE = {1: (26.0, 93.6), 2: (42.4, 93.6), 3: (57.0, 93.6), 4: (72.2, 93.6), 5: (5.6, 51.2), 7: (5.6, 70.2), 6: (92.6, 53.0), 8: (92.6, 71.4)}
TB_ICE_NUM = {1: (26.2, 84.0), 2: (42.6, 83.4), 3: (56.8, 83.8), 4: (71.6, 83.2), 5: (5.6, 41.6), 7: (5.6, 61.4), 6: (92.6, 43.2), 8: (92.6, 63.4)}


def num_badge(x, y, n, size=4.2):
    c = TB_COL[n]
    return [{"t": "circle", "at": [R(x), R(y)], "r": size / 2, "c": "#111111", "o": 1, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": size / 2, "c": "#ffffff", "wd": 0.35, "o": 1},
            {"t": "text", "at": [R(x), R(y + 0.2)], "s": str(n), "size": R(size * 0.78), "c": c}]


def table():
    s = ice(isles=(TB_W, TB_M, TB_E), brs=TB_BR)
    for n, (x, y) in TB_ICE.items():
        s += icicle(x, y, h=10.5, w=2.6)
        s += outline(x - 2.9, y - 7.0, x + 2.9, y + 7.0, TB_COL[n], 0.55, 1)
    for n, pts in TB_PATH.items():
        c = TB_COL[n]
        for p, q in zip(pts[:-2], pts[1:-1]):
            s.append(line(p, q, c, 0.75, 1))
        s += arrow(pts[-2], pts[-1], c=c, wd=0.75, o=1)
    for n, (x, y) in TB_NUM.items():
        s += num_badge(x, y, n)
    for n, (x, y) in TB_ICE_NUM.items():
        s += num_badge(x, y, n)
    k = TB_F[1] / TB_F[0]            # a rect's h is in percent of the width; these were measured in percent of the height
    for x in s:
        if x["t"] == "rect":
            x["h"] = R(x["h"] * k)
    return sc(s, None, frame=TB_F)


# ============================================================ Laws of Ice + stack + Ice Dart
DART_O = (49.5, 7.6)
LS_YS = (65.6, 71.6, 77.6)


def il1():
    s = ice() + tether(DART_O, (47.7, 52.4), "#d06a2a", 0.7) + tether(DART_O, (54.3, 53.0), "#d06a2a", 0.7)
    s += tokens(("H", 47.5, 71.0), ("D", 53.4, 77.6), s=TS)
    return sc(s, {"D1": [47.7, 52.4], "D2": [54.3, 53.0], "MT": [47.3, 63.5], "ST": [55.2, 63.5]}, iconSize=5.4)


def dart(x, y):
    return aoe_circle(x, y, 47.2, c="#5aaee0", o=0.55, edge="#1d2f5a", ewd=0.4)


def il2():
    s = ice() + dart(12.6, 12.9) + dart(86.7, 13.4)
    s += tether(DART_O, (12.6, 12.9), "#d06a2a", 0.6) + tether(DART_O, (86.7, 13.4), "#d06a2a", 0.6)
    s += line_stack(50.2, LS_YS, side_off=4.4, w=5.0, h=2.8, wd=1.3)
    s += tokens(("H", 47.7, 71.0), ("D", 52.3, 77.4), s=TS)
    return sc(s, {"D1": [12.6, 12.9], "D2": [86.7, 13.4], "MT": [47.3, 63.5], "ST": [55.2, 63.5]}, iconSize=5.4)


def il3():
    s = ice() + tether(DART_O, (21.0, 55.6), "#d06a2a", 0.7) + tether(DART_O, (79.2, 55.7), "#d06a2a", 0.7)
    s += line_stack(50.2, LS_YS, side_off=4.4, w=5.0, h=2.8, wd=1.3)
    s += tokens(("H", 47.7, 71.0), ("D", 52.2, 77.4), s=TS)
    return sc(s, {"MT": [21.0, 55.6], "ST": [79.2, 55.7], "D1": [16.2, 61.1], "D2": [82.5, 62.9]}, iconSize=5.4)


def il4():
    s = ice() + dart(13.6, 13.6) + dart(85.8, 14.4)
    s += tether(DART_O, (13.6, 13.6), "#d06a2a", 0.6) + tether(DART_O, (85.8, 14.4), "#d06a2a", 0.6)
    s += line_stack(50.2, LS_YS, side_off=4.4, w=5.0, h=2.8, wd=1.3)
    s += tokens(("H", 49.8, 72.8), ("D", 52.3, 77.6), s=TS)
    return sc(s, {"MT": [13.6, 13.6], "ST": [85.8, 14.4], "D1": [48.3, 62.1], "D2": [51.1, 66.0]}, iconSize=5.4)


# ============================================================ Radical Shift
RS_R = 10.3


def rs_spread(floor, roles):
    s = list(floor)
    for x, y in roles.values():
        s += aoe_circle(x, y, RS_R, c="#f0a030", o=0.5)
    return s


RS_G = {"MT": [28.3, 19.6], "ST": [65.1, 22.1], "D1": [28.3, 36.6], "D2": [73.8, 34.8],
        "H1": [37.2, 57.0], "H2": [63.1, 55.5], "D3": [20.5, 72.7], "D4": [76.6, 71.5]}
RS_B = {"MT": [12.8, 14.6], "ST": [83.8, 15.1], "D1": [15.8, 35.4], "D2": [85.0, 36.3],
        "D3": [13.8, 57.4], "D4": [84.4, 59.5], "H1": [22.4, 68.5], "H2": [75.6, 73.7]}
RS_Y = {"MT": [41.5, 30.4], "ST": [61.3, 30.2], "D1": [28.1, 36.3], "D2": [73.9, 34.9],
        "H1": [41.4, 49.6], "H2": [60.2, 46.4], "D3": [28.3, 55.4], "D4": [73.8, 55.2]}


def rs_g():
    return sc(rs_spread(xfloor(), RS_G), RS_G, iconSize=5.6)


def rs_b():
    return sc(rs_spread(ice(), RS_B), RS_B, iconSize=5.6)


def rs_y():
    return sc(rs_spread(earth(devices=False), RS_Y), RS_Y, iconSize=5.6)


# ============================================================ Dimensional Distortion + Tyranny's Grasp
DD_PARTY = (49.6, 16.2)


def dd1():
    s = square() + chev_disc(29.6, 13.0) + chev_disc(69.6, 13.0)
    return sc(s, cluster(*DD_PARTY, gap=3.6, cols=4), iconSize=3.8)


def dd2():
    s = square()
    for x in (10.4, 30.0, 49.6, 69.4, 88.6):
        s += chev_disc(x, 13.2)
    return sc(s, cluster(*DD_PARTY, gap=3.6, cols=4), iconSize=3.8)


def dd3():
    s = square() + aoe_circle(30.4, 29.6, 10.0, o=0.55) + aoe_circle(69.6, 29.6, 10.0, o=0.55)
    for x in (10.4, 49.6, 88.6):
        s += chev_disc(x, 13.6)
    s += tokens(("D", 26.4, 14.6), ("H", 33.0, 14.4), ("T", 68.0, 14.5), s=6.4)
    return sc(s, None)


def dd_north():
    x0, y0, x1, y1 = SQ
    return [rect(x0, y0, x1, 49.3, "#e8902a", 0.55)] + outline(x0, y0, x1, 49.3, TAN, 0.4, 0.85)


def dd4():
    s = square() + dd_north()
    s += [{"t": "ring", "at": [20.4, 55.0], "r": 7.2, "c": "#e2574a", "wd": 0.8, "o": 0.9},
          {"t": "ring", "at": [77.8, 55.4], "r": 7.2, "c": "#e2574a", "wd": 0.8, "o": 0.9}]
    s += tokens(("D", 40.7, 56.6), ("H", 55.0, 54.0), s=6.4)
    return sc(s, {"MT": [19.7, 53.6], "ST": [78.2, 55.2]})


def dd5():
    s = square() + dd_north()
    s += line_stack(50.0, (53.0, 68.4, 84.2), side_off=5.6, w=12.5, h=3.8, wd=1.9)
    return sc(s, cluster(48.6, 58.6, gap=4.6, cols=2), iconSize=4.6)
