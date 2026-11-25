"""Every scene of the Arkveld EX guide, redrawn from game8's pictures (percent of a 1:1 frame).
Measured on game8's 440x440 pictures with a 1% grid."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ark/tools")
from shp import *  # noqa

BOSS_N = (50.5, 9.0)
MID = (50.5, 51.5)


def sc(shapes, roles=None, boss=None, **kw):
    out = {"shapes": wm_rings() + shapes}
    if boss is not None:
        out["boss"] = [R(boss[0]), R(boss[1])]
    if roles:
        out["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    out.update(kw)
    return out


def quad(x0, y0, x1, y1, top=("MT", "H1"), bot=("D1", "D2")):
    """A 2x2 block of seats: top row then bottom row, west to east."""
    return {top[0]: (x0, y0), top[1]: (x1, y0), bot[0]: (x0, y1), bot[1]: (x1, y1)}


# ============================================================ waymarks
def waymarks():
    return sc([])


# ============================================================ Siegeflight
def dash_white():
    roles = {**quad(77.5, 23.5, 86, 31), **quad(77.5, 52, 86, 59.5, ("ST", "H2"), ("D4", "D3"))}
    return sc(strip(34.5, 69) + boss_ring(BOSS_N) + stack(81.75, 27.25) + stack(81.75, 55.75), roles, BOSS_N)


def dash_red():
    s = [rect(-1, -1, 45.5, 101, RED, 0.5, 0.01), rect(56, -1, 101, 101, RED, 0.5, 0.01),
         line((45.5, -1), (45.5, 101), WHITE, 0.4, 0.9), line((56, -1), (56, 101), WHITE, 0.4, 0.9)]
    roles = {**quad(47.5, 23.5, 55, 31), **quad(47.5, 52, 55, 60, ("ST", "H2"), ("D4", "D3"))}
    return sc(s + boss_ring((51.5, 7.0)) + stack(51.25, 27.25) + stack(51.25, 56), roles, (51.5, 7.0))


def dash_ex1():
    boss = (50.5, 92.0)
    s = [rect(50.6, 11, 52.4, 90, WHITE, 0.9, 0.01)] + boss_ring(boss)
    roles = {**quad(66, 45, 73.5, 52.5, ("ST", "H2"), ("D4", "D3")), **quad(66, 74.5, 73.5, 82)}
    return sc(s + stack(69.75, 48.75) + stack(69.75, 78.25), roles, boss)


def dash_ex2():
    s = strip(34.5, 69) + boss_ring(BOSS_N) + [arrow((51.5, 58), (51.5, 34), "#ff4d2e", 1.4)]
    roles = {**quad(70.5, 24.5, 78, 32), **quad(70.5, 51.5, 78, 59, ("ST", "H2"), ("D4", "D3"))}
    return sc(s + stack(74.25, 28.25) + stack(74.25, 55.25), roles, BOSS_N)


# ============================================================ Aetheric Resonance (towers)
T1 = {"t": [(28, 42.5), (73, 60)], "n": [(44.5, 28.5), (69, 38), (34, 65.5), (58.5, 74.5)]}
T2 = {"t": [(58.5, 29.5), (44, 74.5)], "n": [(33.5, 36), (73, 50), (29.5, 60.5), (66.5, 69)]}
T2b = {"t": [(56.5, 30), (43.5, 73)], "n": [(33.5, 36.5), (72, 44.5), (29.5, 61), (66, 68.5)]}


def towers(t):
    out = []
    for c in t["t"]:
        out += tower_t(c)
    for c in t["n"]:
        out += tower_n(c)
    return out


def tw_pattern(t):
    return sc(towers(t) + target_arcs(), None, MID)


def tw_melee1():
    roles = {"MT": (47, 47.5), "ST": (53.5, 47.5), "D2": (46.5, 55), "D1": (53.5, 55.5)}
    s = towers(T2b) + target_arcs()
    for c in roles.values():
        s += aoe(c, 13)
    return sc(s, roles)


def tw_melee2():
    roles = {"MT": (31, 35.5), "ST": (70, 37), "D2": (32.5, 62), "D1": (67.5, 65.5)}
    s = towers(T2b) + target_arcs()
    for c in ((34, 36), (71, 39), (35, 61), (69, 64)):
        s += aoe(c, 12)
    return sc(s, roles, MID)


def tw_final():
    s = towers(T2b) + target_arcs()
    for c in ((20, 28), (81, 28), (23.5, 76.5), (79, 73)):
        s += big_aoe(c, 12)
    for c in ((47, 48.5), (54, 48.5), (47, 55.5), (54, 55.5)):
        s += aoe(c, 12)
    roles = {"MT": (56.5, 29.5), "ST": (43.5, 72.5), "D3": (33.5, 36.5), "D4": (72, 44.5),
             "H1": (21.5, 49.5), "H2": (75.5, 57.5), "D1": (29.5, 61.5), "D2": (66, 68.5)}
    return sc(s, roles)


def tw_ranged1():
    roles = {"D3": (48, 49.5), "D4": (54, 49.5), "H1": (48, 55), "H2": (54, 55)}
    s = towers(T2b) + target_arcs()
    for c in roles.values():
        s += aoe(c, 12.5)
    return sc(s, roles)


def tw_ranged2():
    roles = {"D3": (30.5, 43), "D4": (71.5, 38.5), "H1": (30, 69.5), "H2": (70.5, 62.5)}
    s = towers(T2b) + target_arcs()
    for c in ((30, 42.5), (72, 38.5), (31, 69), (71, 61.5)):
        s += aoe(c, 11.5)
    return sc(s, roles, MID)


def tw_ranged3():
    roles = {"D3": (20, 28.5), "D4": (80.5, 29), "H1": (23.5, 78), "H2": (82, 73.5)}
    s = towers(T2b) + target_arcs()
    for c in ((20, 28.5), (81, 28.5), (22, 77), (81, 72.5)):
        s += big_aoe(c, 12)
    return sc(s, roles, MID)


# ============================================================ Clamorous Chase
CENTRE = {5: (45.5, 45), 6: (55.5, 45), 7: (45.5, 53.5), 8: (55.5, 53.5)}


def nums(d):
    out = []
    for n, c in d.items():
        out += num(c, n)
    return out


def cc_start(cw=True):
    boss = (50.5, 6.5)
    if cw:   # left hand drawn back: the east hand up, clockwise, 1 at B
        s = glove((41.5, 13), False) + glove((58.5, 6), True)
        d = {4: (51, 16), 1: (88, 47.5), 2: (51, 85), 3: (13.5, 47.5), **CENTRE}
        arr = [arrow((19.5, 39.5), (36.5, 22)), arrow((64, 21), (81.5, 38.5)), arrow((82, 65), (64.5, 82.5)), arrow((37.5, 83.5), (20, 66))]
    else:
        s = glove((40, 6), True) + glove((61, 18), False)
        d = {4: (51, 16.5), 1: (13.5, 48.5), 2: (51, 85), 3: (88.5, 48), **CENTRE}
        arr = [arrow((39.5, 22), (22, 39.5)), arrow((20, 63), (38, 80.5)), arrow((65.5, 80.5), (83, 63.5)), arrow((81.5, 39), (63.5, 21.5))]
    return sc(boss_ring(boss, 9.5, 8.0) + s + arr + nums(d), None, boss)


def cc_step(k):
    """game8's ① to ⑤ (clockwise example)."""
    if k == 1:
        boss = (81, 47)
        s = half_plane((53, 0), (100, 69), (100, 0), "#f7b464", 0.6) + boss_ring(boss) + [arrow((57.5, 19), (75, 36))]
        d = {4: (51, 16), 1: (71, 48.5), 2: (51, 85), 3: (13.5, 47.5), 5: (45.5, 45), 6: (55, 45), 7: (45.5, 53.5), 8: (55, 53.5)}
    elif k == 2:
        boss = (51, 84)
        s = half_plane((100, 52), (32, 100), (100, 100), "#f7b464", 0.6) + boss_ring(boss) + [arrow((82.5, 63.5), (64.5, 79))]
        d = {4: (51, 16), 1: (59, 45), 6: (40.5, 45), 7: (40.5, 54), 8: (49, 54), 3: (13.5, 47.5), 5: (89, 48.5), 2: (51, 86)}
    elif k == 3:
        boss = (15, 49)
        s = half_plane((0, 33), (45, 100), (0, 100), "#f7b464", 0.6) + boss_ring(boss) + [arrow((33, 77), (17.5, 60.5))]
        d = {3: (26.5, 50.5), 7: (39.5, 54), 8: (49, 54), 2: (57.5, 54), 1: (58.5, 45), 5: (88.5, 48.5), 4: (51, 16), 6: (51, 85)}
    elif k == 4:
        boss = (50, 17)
        s = half_plane((0, 61), (70, 0), (0, 0), "#f7b464", 0.6) + boss_ring(boss) + [arrow((22, 39), (41, 24.5))]
        d = {4: (50, 28), 7: (13.5, 52.5), 1: (58.5, 45), 8: (49, 54), 2: (58, 54), 3: (67, 55), 5: (89, 48.5), 6: (51, 85)}
    else:
        boss = (82, 50)
        s = half_plane((34, 0), (100, 62), (100, 0), "#f7b464", 0.6) + boss_ring(boss)
        s += [arrow((22, 40), (38, 25)), arrow((59, 22.5), (75, 38.5)), arrow((76.5, 67.5), (58.5, 80.5)), arrow((38, 80), (22.5, 65))]
        d = {8: (51, 18.5), 7: (15.5, 53), 5: (82, 52), 6: (51, 86), 1: (47.5, 47.5), 4: (56, 48), 2: (47.5, 57.5), 3: (56, 57.5)}
    return sc(s + nums(d), None, boss)


# ============================================================ Aetheric Resonance + Wyvern's Weal (beams)
CRYS = [((57.5, 30), 7.5), ((44, 73), 7.5), ((34.5, 37), 4.0), ((72, 44), 4.0), ((30, 60.5), 4.0), ((65.5, 68.5), 4.0)]
BOSS_B = (51, 9)


def crystals():
    out = []
    for c, r in CRYS:
        out += crystal(c, r)
    return out


def beam1():
    s = crystals() + boss_ring(BOSS_B) + badge((31, 16.5), "T") + badge((28.5, 22.5), "H") + badge((35, 20.5), "D")
    s += badge((71.5, 17.5), "D") + head_mark(71.5, 9.5)
    return sc(s, None, BOSS_B)


def beam2():
    s = crystals() + band((50, 16.5), (102, 29), 8.5) + boss_ring(BOSS_B)
    s += badge((30.5, 17), "T") + badge((28.5, 23), "H") + badge((35, 21), "D") + badge((40, 30.5), "D")
    return sc(s, None, BOSS_B)


def beam3():
    s = band((50, 12), (-2, 84), 9)
    for c, r in (((57.5, 30), 21), ((44, 73), 21.5), ((34, 37), 12), ((72.5, 44), 12), ((30, 60.5), 12), ((65.5, 68), 12)):
        s += burst(c, r)
    s += arc3((85.5, 33.5), (76, 51), (43.5, 58))
    s += boss_ring(BOSS_B) + badge((25, 19), "T") + badge((30.5, 21), "D") + badge((21, 25), "D") + badge((32, 15), "H") + head_mark(32, 8.5)
    return sc(s, None, BOSS_B)


def beam4():
    s = band((50, 12), (-2, 37), 9) + boss_ring(BOSS_B) + head_mark(51.5, 22.5)
    roles = {"MT": (44, 29.5), "D2": (51.5, 30), "D1": (44, 37), "H1": (51.5, 37),
             "ST": (38.5, 46.5), "H2": (46, 46.5), "D4": (39, 54), "D3": (46, 54.5)}
    return sc(s + stack(47.75, 33.5) + stack(42.25, 50.5), roles, BOSS_B)


def beam5():
    s = band((48, 12), (98, 96), 9) + arc3((22.5, 42.5), (33, 57.5), (64, 62.5))
    s += boss_ring(BOSS_B) + head_mark(74.5, 12.5)
    roles = {"MT": (68.5, 19), "D2": (76, 19.5), "D1": (68.5, 27), "H1": (76, 27),
             "ST": (81.5, 37.5), "H2": (89, 38), "D4": (81.5, 45), "D3": (89, 45.5)}
    return sc(s + stack(72.25, 23.25) + stack(85.25, 41.5), roles, BOSS_B)


def beam6():
    s = band((55, 12), (-2, 76), 9)
    for c in ((22, 22), (22, 30), (35, 18)):
        s += aoe(c, 12.5, 0.45, "#e8662a")
    s += arc3((75.5, 38.5), (66, 54), (35, 59.5))
    s += boss_ring((52, 9)) + badge((22.5, 21.5), "T") + badge((22.5, 29.5), "H") + badge((33.5, 17.5), "D")
    return sc(s, None, (52, 9))


def beam7():
    roles = {"MT": (50.5, 14.5), "D1": (33, 25.5), "D2": (68.5, 25.5), "ST": (50.5, 35),
             "H1": (33.5, 45), "H2": (73.5, 50.5), "D4": (15.5, 53), "D3": (55.5, 67.5)}
    s = boss_ring((51, 3))
    for c in ((51, 13), (33.5, 24.5), (68.5, 25.5), (51, 35), (34, 47), (73.5, 50.5), (15, 52), (56, 67.5)):
        s += aoe(c, 13, 0.55, "#ec7a34")
    return sc(s, roles, (51, 3))
