"""Every scene of the EX4 Zelenia guide, redrawn from game8's pictures (percent of a 1:1 frame).
Measured on game8's 440x440 pictures: role badges with detect.py, floors with tiles.py, cones with polar.py."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex4/tools")
from shapes import *  # noqa

G8 = lambda n, h: f"https://img.game8.jp/{n}/{h}/show"


def sc(shapes, roles=None, boss=None, arena=None, waymarks=None, **kw):
    out = {"shapes": shapes}
    out["arena"] = arena
    out["waymarks"] = waymarks
    if boss is not None:
        out["boss"] = boss
    if roles:
        out["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    out.update(kw)
    return out


def disc(c, Rr, fill=BEIGE):
    return {"shape": "circle", "at": [R(c[0]), R(c[1])], "r": R(Rr), "fill": fill, "lines": False, "edge": "#000000"}


def wm(c, Rr, d=0.6):
    """Waymarks A/B/C/D on the rim, as game8 draws them in some pictures."""
    return {"A": [R(c[0]), R(c[1] - Rr - d)], "B": [R(c[0] + Rr + d), R(c[1])],
            "C": [R(c[0]), R(c[1] + Rr + d)], "D": [R(c[0] - Rr - d), R(c[1])]}


# ============================================================ Shock + Alexandrian Holy
SH_C, SH_R, SH_RIN = (51.4, 50.95), 47.0, 24.0


def shock(big, small, roles):
    s = beige(SH_C, SH_R, SH_RIN)
    for k in big:
        x, y = roles[k]
        s += [donut((x, y), 15.5, 3.4, BLUE_AOE, 0.8), ringl((x, y), 15.5, "#9fd4ee", 0.35, 0.9)]
    for k in small:
        x, y = roles[k]
        s += [circle((x, y), 7.0, BLUE_AOE, 0.8), ringl((x, y), 7.0, "#9fd4ee", 0.35, 0.9)]
    return sc(s, roles, arena=disc(SH_C, SH_R))


def shock1():
    roles = {"MT": (35.3, 33.9), "ST": (69.2, 33.6), "H1": (26.6, 64.5), "H2": (78.2, 64.8),
             "D3": (40.8, 9.8), "D4": (65.9, 10.1), "D1": (47.0, 59.7), "D2": (55.2, 71.4)}
    return shock(("MT", "ST", "H1", "H2"), ("D1", "D2", "D3", "D4"), roles)


def shock2():
    roles = {"D3": (25.2, 33.0), "D4": (74.1, 33.8), "D1": (34.3, 63.3), "D2": (68.2, 66.7),
             "MT": (41.8, 24.7), "ST": (53.4, 30.2), "H1": (38.6, 89.4), "H2": (62.2, 90.0)}
    return shock(("D1", "D2", "D3", "D4"), ("MT", "ST", "H1", "H2"), roles)


# ============================================================ Escelons' Fall
EF_C, EF_R, EF_RIN = (50.45, 50.0), 46.6, 20.3
EF_BOSS = (50.45, 49.6)
NORTH = ((22.75, 33.5), (70.0, 31.0), (292.5, 34.0), (336.25, 32.5))
SOUTH = ((111.5, 33.0), (157.25, 32.5), (202.0, 34.0), (250.25, 31.5))


def ef_cones(which, at=EF_BOSS):
    out = []
    for d, sp in which:
        out.append(cone(at, d, sp, 80, "#90248d", 0.6))
        for e in (d - sp / 2, d + sp / 2):
            out.append(line(at, pt(at, e, 80), CONE_EDGE, 0.3, 0.9))
    return out


def ef_floor():
    return beige(EF_C, EF_R, EF_RIN, angles=(0, 45, 90, 136, 180, 225, 270, 316.3)) + target((50.45, 49.4), 13.1)


EF_IN = {"MT": (44.5, 36.8), "ST": (55.7, 37.4), "H1": (38.0, 43.9), "H2": (63.0, 44.7),
         "D3": (33.2, 54.9), "D4": (65.9, 55.5), "D1": (43.2, 64.1), "D2": (57.0, 63.9)}
EF_OUT = {"MT": (43.2, 31.8), "ST": (59.3, 32.0), "H1": (32.2, 40.9), "H2": (68.2, 43.4),
          "D3": (39.7, 54.0), "D4": (61.1, 53.0), "D1": (46.5, 57.8), "D2": (55.0, 57.7)}
EF_OUT2 = {"MT": (43.4, 30.5), "ST": (58.4, 31.6), "H1": (33.3, 42.8), "H2": (68.9, 43.1),
           "D3": (39.4, 53.0), "D4": (60.7, 52.3), "D1": (46.2, 57.8), "D2": (55.0, 57.4)}


def ef1():   # TH in, DPS out, near tell: the TH take the cones (north)
    return sc(ef_floor() + ef_cones(NORTH) + near_tell(EF_BOSS, 7.5), EF_IN, EF_BOSS, disc(EF_C, EF_R))


def ef2():   # same places, far tell: the DPS take them (south)
    return sc(ef_floor() + ef_cones(SOUTH) + far_tell(EF_BOSS), EF_IN, EF_BOSS, disc(EF_C, EF_R))


def ef3():   # TH out, DPS in, far tell: the TH take them (north)
    return sc(ef_floor() + ef_cones(NORTH) + far_tell(EF_BOSS), EF_OUT, EF_BOSS, disc(EF_C, EF_R))


def ef4():   # TH out, DPS in, near tell: the DPS take them (south)
    return sc(ef_floor() + ef_cones(SOUTH) + near_tell(EF_BOSS, 7.5), EF_OUT2, EF_BOSS, disc(EF_C, EF_R))


# ============================================================ Blessed Barricade
BB_C, BB_R, BB_RIN = (50.5, 50.0), 46.6, 20.0
ORBS = ((25.3, 23.6), (75.6, 23.6), (25.4, 76.6), (75.6, 76.6))


def bb_floor(off=0, c=BB_C, Rr=BB_R, rin=BB_RIN):
    s = [rect(0, 0, 14.5, 100, "#f2a33a", 0.5), rect(89.4, 0, 100, 100, "#f2a33a", 0.5)]
    s += beige(c, Rr, rin, off, angles=None if off else (0, 45, 90, 136, 180, 225, 270, 316.3))
    for x, y in ORBS:
        s += rose_orb(x, y, 5.2)
    return s


def bb1():
    s = bb_floor() + tower((31.3, 61.4), 7.2) + tower((68.6, 36.2), 7.2)
    s += tether((13.3, 50.0), (12.7, 37.0)) + tether((88.8, 50.0), (90.2, 59.2))
    s += tokens(("T", 12.7, 36.9), ("T", 28.0, 59.4), ("H", 34.8, 59.3), ("H", 31.1, 64.3),
                ("D", 72.5, 32.8), ("D", 64.3, 34.1), ("D", 69.3, 40.1), ("D", 90.2, 59.2))
    return sc(s, None, [[13.3, 50.0], [88.8, 50.0]], disc(BB_C, BB_R), wm(BB_C, BB_R, 0.9), bossSize=6.2)


def bb2():
    s = bb_floor() + tower((31.7, 37.6), 7.2) + tower((71.0, 60.6), 7.2)
    s += tether((13.3, 50.0), (13.1, 59.4)) + tether((88.8, 50.0), (89.5, 37.2))
    s += tokens(("T", 28.4, 34.9), ("H", 35.2, 34.8), ("T", 31.6, 41.7), ("H", 13.1, 59.4),
                ("D", 89.5, 37.2), ("D", 74.8, 57.6), ("D", 66.6, 58.9), ("D", 71.6, 64.8))
    return sc(s, None, [[13.3, 50.0], [88.8, 50.0]], disc(BB_C, BB_R), wm(BB_C, BB_R, 0.9), bossSize=6.2)


def bb3():   # the 4th wave: no towers, only the half-room baits; the floor drawn turned (as game8 has it)
    c = (50.3, 50.35)
    s = bb_floor(23.5, c, 45.6, 24.0)
    s += tether((13.5, 48.0), (13.1, 59.5)) + tether((89.0, 51.5), (89.5, 37.3))
    s += tokens(("D", 39.3, 26.8), ("T", 28.4, 35.0), ("D", 39.3, 34.8), ("T", 33.9, 40.6), ("H", 33.6, 56.1),
                ("H", 13.1, 59.5), ("D", 89.5, 37.3), ("D", 64.8, 60.8))
    return sc(s, None, [[13.5, 48.0], [89.0, 51.5]], disc(c, 45.6), None, bossSize=6.2)


# ============================================================ Roseblood Bloom (the floor and a turning cone)
T_C, T_R, T_RIN = (51.35, 50.95), 47.0, 24.0


def rb_cw():
    s = floorx(T_C, T_R, T_RIN, {0, 1, 5, 6}, {0, 3, 5}, 0, ((22.5, 44), (142.5, 43), (259.5, 43)))
    s += spin(T_C, 8.5, True, 10, "#f39a2c")
    s += tokens(("D", 67.8, 54.2), ("H", 73.2, 56.0), ("T", 69.8, 60.0), s=4.6)
    return sc(s, None, [51.0, 50.6], disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6), bossSize=7.0)


def rb_ccw():
    s = floorx(T_C, T_R, T_RIN, {1, 2, 4, 5}, {1, 4, 7}, 0, ((67.5, 43), (189.0, 42.5), (307.0, 42)))
    s += spin(T_C, 8.5, False, 10, "#7cc4ea")
    s += tokens(("D", 45.2, 30.6), ("T", 49.8, 31.8), ("H", 46.8, 35.6), s=4.6)
    return sc(s, None, [51.0, 50.6], disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6), bossSize=7.0)


# ============================================================ Roseblood: 2nd Bloom
B2_IN, B2_OUT = {0, 1, 3, 4, 7}, {0, 3, 4, 6, 7}
WIDE = ((91.0, 124.0), (272.0, 124.0))
NARROW = ((122.5, 61.0), (302.5, 61.0))


def b2(cones=(), inner=False, outer=False, toks=(), arrows=(), marks=True, ts=5.0):
    s = floorx(T_C, T_R, T_RIN, B2_IN, B2_OUT, 0, cones, "c", inner, outer, True, 0.35 if (inner or outer or cones) else 0.95, True)
    for a, b in arrows:
        s += big_arrow(a, b, 1.6)
    s += tokens(*toks, s=ts)
    return sc(s, None, None, disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6) if marks else None)


def b2c1():
    return b2((), True, False, (("D", 17.3, 56.6), ("H", 23.6, 56.5), ("T", 20.7, 61.8)), marks=False, ts=5.9)


def b2c2():
    return b2(WIDE, False, True, (("D", 33.0, 43.4), ("H", 39.3, 44.3), ("T", 35.0, 47.7)), (((19.3, 63.9), (33.0, 49.6)),), ts=4.6)


def b2c3():
    return b2(NARROW, False, True, (("D", 31.0, 55.7), ("H", 38.4, 57.4), ("T", 33.2, 60.8)), (((35.2, 43.0), (35.2, 56.4)),), ts=4.7)


def b2d1():
    return b2((), False, True, (("D", 63.5, 54.5), ("H", 69.8, 54.5), ("T", 66.8, 59.7)), marks=False, ts=5.9)


def b2d2():
    return b2(WIDE, True, False, (("D", 84.2, 67.0), ("H", 87.3, 63.5), ("T", 86.0, 71.4)), (((66.0, 56.0), (79.5, 66.0)),), ts=4.4)


def b2d3():
    return b2(NARROW, True, False, (("D", 82.5, 38.2), ("H", 89.5, 42.3), ("T", 82.6, 45.2)), (((80.2, 64.8), (86.0, 48.8)),), ts=6.2)


# ============================================================ Roseblood: 3rd Bloom (Kurapon's)
B3_C, B3_R, B3_RIN = (50.65, 50.45), 46.05, 23.5


def b3_floor(red_in):
    return floorx(B3_C, B3_R, B3_RIN, red_in, {0, 2, 4, 6}, -22.5)


CRYS_A = ((50.6, 12.6), (16.2, 49.6), (85.8, 51.4), (49.6, 87.4))     # by MT, H1, H2, ST
CRYS_B = ((50.8, 14.6), (16.6, 49.4), (86.0, 52.2), (50.4, 85.6))     # by D3, D1, D4, D2


def b3_dps_marks():
    roles = {"MT": (51.1, 19.1), "D3": (50.5, 35.8), "H1": (21.8, 50.1), "H2": (79.9, 51.1),
             "D1": (38.6, 60.7), "D2": (49.8, 63.6), "D4": (60.7, 62.5), "ST": (48.9, 79.1)}
    s = b3_floor({1, 7})
    for x, y in CRYS_A:
        s += crystal(x, y)
    for k in ("D3", "D1", "D2", "D4"):
        x, y = roles[k]
        s += rose_mark(x, y - 6.4)
    return sc(s, roles, None, disc(B3_C, B3_R, DARK))


def b3_dps_towers():
    roles = {"MT": (51.1, 19.0), "D1": (32.0, 47.0), "D2": (38.5, 49.5), "H1": (21.8, 50.1), "H2": (79.9, 51.1),
             "D3": (64.0, 48.5), "D4": (70.5, 55.0), "ST": (48.9, 79.0)}
    s = b3_floor({0, 1, 3, 4, 5, 7})
    for x, y in CRYS_A:
        s += crystal(x, y)
    return sc(s, roles, None, disc(B3_C, B3_R, DARK))


def b3_th_marks():
    roles = {"D3": (51.0, 21.5), "MT": (50.7, 36.6), "D1": (21.0, 50.8), "D4": (79.0, 52.0),
             "H1": (39.5, 62.0), "ST": (50.0, 64.5), "H2": (61.7, 62.7), "D2": (50.8, 78.5)}
    s = b3_floor({1, 7})
    for x, y in CRYS_B:
        s += crystal(x, y)
    for k in ("MT", "H1", "ST", "H2"):
        x, y = roles[k]
        s += rose_mark(x, y - 6.4)
    return sc(s, roles, None, disc(B3_C, B3_R, DARK))


def b3_th_towers():
    roles = {"D3": (50.5, 20.3), "D1": (22.3, 50.2), "H1": (31.8, 48.6), "ST": (37.0, 49.3), "MT": (63.6, 49.1),
             "H2": (71.6, 48.5), "D4": (79.5, 51.8), "D2": (50.0, 79.3)}
    s = b3_floor({0, 1, 3, 4, 5, 7})
    for x, y in CRYS_B:
        s += crystal(x, y)
    return sc(s, roles, None, disc(B3_C, B3_R, DARK))


# ============================================================ Bud of Valor + Escelons' Fall (2nd time, with Shock)
E2_C, E2_R, E2_RIN = (50.45, 50.35), 46.0, 24.0
E2_BOSS = (50.45, 48.6)


def e2_floor():
    return [ringl(E2_C, E2_RIN, LINE, 0.45)] + spokes(E2_C, E2_R, 23.5, E2_RIN, LINE, 0.45) + target((50.45, 49.4), 13.1)


E2_TH = {"MT": (46.4, 39.9), "ST": (55.9, 39.8), "H1": (39.3, 43.9), "H2": (62.4, 44.8)}


def e2a():
    roles = {"MT": (46.4, 31.9), "ST": (53.2, 32.0), "H1": (46.4, 37.6), "H2": (53.2, 37.6)}
    s = e2_floor() + [donut((50.0, 63.2), 15.5, 3.4, BLUE_AOE, 0.8), ringl((50.0, 63.2), 15.5, "#9fd4ee", 0.35, 0.9)]
    s += near_tell(E2_BOSS, 7.5)
    s += stack_mark(49.8, 34.8, 7.0) + stack_mark(50.0, 63.2, 6.0)
    s += token(50.0, 63.2, "D")
    return sc(s, roles, E2_BOSS, disc(E2_C, E2_R))


def e2b():
    s = e2_floor() + ef_cones(NORTH, (50.45, 49.6)) + near_tell(E2_BOSS, 7.5) + token(50.1, 63.0, "D")
    return sc(s, E2_TH, E2_BOSS, disc(E2_C, E2_R))


def e2c():
    roles = dict(E2_TH, D3=(31.7, 56.0), D4=(68.8, 55.1), D1=(44.3, 65.7), D2=(58.6, 65.0))
    s = e2_floor() + ef_cones(SOUTH, (50.45, 49.6)) + far_tell(E2_BOSS)
    return sc(s, roles, E2_BOSS, disc(E2_C, E2_R))


def e2d():
    roles = {"MT": (42.7, 33.1), "ST": (57.0, 33.5), "H1": (31.4, 41.4), "H2": (66.8, 43.0),
             "D3": (40.5, 53.1), "D4": (62.2, 52.8), "D1": (47.7, 56.0), "D2": (55.9, 56.1)}
    s = e2_floor() + ef_cones(NORTH, (50.45, 49.6)) + far_tell(E2_BOSS)
    return sc(s, roles, E2_BOSS, disc(E2_C, E2_R))


def e2e():
    roles = {"MT": (42.7, 33.1), "ST": (57.0, 33.4), "H1": (33.2, 41.6), "H2": (66.8, 43.0),
             "D3": (40.7, 52.5), "D4": (62.2, 52.7), "D1": (47.8, 56.2), "D2": (55.7, 55.8)}
    s = e2_floor() + ef_cones(SOUTH, (50.45, 49.6)) + near_tell(E2_BOSS, 7.5)
    return sc(s, roles, E2_BOSS, disc(E2_C, E2_R))


# ============================================================ Roseblood: 4th Bloom
B4_IN, B4_OUT = {1, 6}, {0, 2, 5}
B4_AOE = ((20.8, 41.5), (35.8, 39.4), (44.3, 24.0), (51.5, 39.2), (67.0, 39.4), (84.4, 41.8))


def b4_drop(top, bottom):
    s = floorx(T_C, T_R, T_RIN, B4_IN, B4_OUT, 0)
    for c in B4_AOE:
        s += [circle(c, 8.8, "#e8b860", 0.55), ringl(c, 8.8, "#f0dc8c", 0.5, 0.95)]
    roles = {}
    for k, xy in zip(top, ((44.3, 24.0), (51.5, 38.3), (20.8, 40.2), (84.4, 41.6))):
        roles[k] = xy
    for k, xy in zip(bottom, ((44.1, 65.0), (58.9, 66.1), (35.5, 83.9), (65.5, 84.0))):
        roles[k] = xy
        s += rose_mark(xy[0], xy[1] - 6.4)
    return sc(s, roles, None, disc(T_C, T_R, DARK))


def b4a():
    return b4_drop(("ST", "MT", "H1", "H2"), ("D1", "D2", "D3", "D4"))


def b4b():
    return b4_drop(("D1", "D2", "D3", "D4"), ("MT", "ST", "H1", "H2"))


B4_IN2, B4_OUT2 = {0, 2, 5, 7}, {0, 1, 4, 6, 7}


def b4c():
    s = floorx(T_C, T_R, T_RIN, B4_IN2, B4_OUT2, 0)
    s += tokens(("T", 47.6, 58.3), ("H", 53.4, 58.0), ("D", 50.3, 61.6), s=5.8)
    return sc(s, None, [51.3, 48.8], disc(T_C, T_R, DARK), bossSize=7.0)


def b4d():
    s = floorx(T_C, T_R, T_RIN, B4_IN2, B4_OUT2, 0)
    s += [circle((11.4, 47.4), 8.4, "#9a7cc8", 0.6), ringl((11.4, 47.4), 8.4, "#e8d8a0", 0.45, 0.9)]
    s += stack_mark(11.4, 47.4, 7.4, 4.6, 2.0)
    s += tether((10.2, 40.9), (96.6, 50.6), "#c8a870", 0.55) + tether((8.4, 47.7), (96.6, 45.8), "#c8a870", 0.55)
    s += tokens(("T", 10.2, 40.9), ("H", 8.4, 47.7), ("D", 96.6, 45.8), ("D", 96.6, 50.6), s=5.6)
    return sc(s, None, [51.3, 48.8], disc(T_C, T_R, DARK), bossSize=7.0)


# ============================================================ Bud of Valor + Escelons' Fall (3rd time)
E3_C, E3_R, E3_RIN = (51.4, 50.8), 47.0, 24.0
E3_BOSS = (51.4, 50.4)
SHADES = [[51.4, 4.0], [51.4, 97.0]]
N3A = ((21.25, 32.5), (67.0, 34.0), (294.25, 32.5), (335.75, 31.5))
N3B = ((21.25, 33.5), (68.5, 32.0), (294.25, 32.5), (335.75, 31.5))
S3 = ((111.0, 34.0), (158.0, 33.0), (203.75, 34.5), (251.5, 31.0))


def e3_floor(half=None):
    s = []
    if half == "E":
        s.append(rect(51.4, 0, 100, 100, "#f2a33a", 0.55))
    if half == "W":
        s.append(rect(0, 0, 51.4, 100, "#f2a33a", 0.55))
    return s + beige(E3_C, E3_R, E3_RIN) + target((50.0, 48.8), 13.5)


def e3(roles, cones=(), tell=None, half=None):
    s = e3_floor(half)
    if cones:
        s += ef_cones(cones, E3_BOSS)
    if tell == "near":
        s += near_tell(E3_BOSS, 7.5)
    elif tell == "far":
        s += far_tell(E3_BOSS)
    return sc(s, roles, [list(E3_BOSS)] + SHADES, disc(E3_C, E3_R), bossSize=7.0)


def e3a():
    return e3({"H1": (49.5, 27.0), "MT": (42.3, 33.5), "ST": (58.4, 31.7), "H2": (50.5, 37.3),
               "D3": (40.7, 51.7), "D4": (59.8, 53.1), "D2": (54.1, 57.7), "D1": (46.1, 58.1)}, tell="near")


def e3b():
    return e3({"H1": (49.5, 27.0), "MT": (42.2, 33.6), "ST": (48.4, 32.3), "H2": (50.5, 37.2),
               "D3": (40.7, 51.8), "D4": (40.8, 56.9), "D1": (46.9, 58.0), "D2": (47.6, 62.7)}, tell="far", half="E")


def e3c():
    return e3({"MT": (46.1, 38.8), "ST": (55.2, 38.3), "H1": (38.8, 44.1), "H2": (60.5, 44.3),
               "D3": (34.3, 57.2), "D4": (67.3, 55.6), "D1": (45.0, 65.1), "D2": (57.3, 64.0)}, N3A, "near")


def e3d():
    return e3({"MT": (43.2, 32.8), "ST": (58.9, 33.4), "H1": (33.6, 42.2), "H2": (68.4, 42.5),
               "D3": (39.3, 53.1), "D4": (60.3, 52.6), "D2": (54.5, 57.2), "D1": (47.8, 58.3)}, S3, "near")


def e3e():
    return e3({"MT": (43.2, 33.0), "ST": (58.9, 33.5), "H1": (33.6, 42.2), "H2": (68.4, 42.5),
               "D3": (39.1, 53.2), "D4": (60.5, 52.7), "D1": (47.8, 58.3), "D2": (54.5, 57.2)}, N3B, "far")


def e3f():
    return e3({"MT": (45.7, 38.8), "ST": (55.2, 38.2), "H1": (38.9, 43.3), "H2": (60.0, 44.0),
               "D3": (34.5, 54.3), "D4": (67.6, 54.7), "D1": (44.5, 63.5), "D2": (56.5, 63.3)}, S3, "far")


def e3g():
    return e3({"ST": (55.2, 38.2), "H1": (63.2, 36.4), "H2": (60.0, 44.1), "MT": (69.8, 45.5),
               "D3": (57.8, 57.3), "D4": (67.8, 55.1), "D2": (56.5, 63.6), "D1": (64.1, 66.0)}, half="W")


# ============================================================ Roseblood: 5th Bloom
B5_IN, B5_OUT = {2, 3, 6, 7}, {2, 3, 6, 7}


def b5_marks(edge=True, top=True):
    s = []
    if edge:
        s += crescent(95.2, 64.0, 270) + crescent(95.2, 86.0, 270)
    if top:
        s += crescent(63.5, 4.5, 180) + crescent(88.0, 4.5, 180)
    return s


def b5a():
    s = floorx(T_C, T_R, T_RIN, B5_IN, B5_OUT, 0)
    s += [rect(0, 51.0, 97.5, 100, "#fbe6c0", 0.42), rect(0, 74.2, 97.5, 76.4, "#fff0c8", 0.55)]
    s += b5_marks(True, False)
    s += tokens(("T", 65.0, 34.9), ("H", 59.0, 44.1), ("D", 69.9, 42.2), s=5.6)
    return sc(s, None, None, disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6))


def b5_ring():
    return [donut(T_C, T_R, T_RIN, "#6c3482", 0.93), ringl(T_C, T_RIN, "#e6d38a", 0.55, 0.95), ringl(T_C, T_R, "#e6d38a", 0.55, 0.95)]


def b5b():
    s = [rect(0, 51.0, 97.5, 100, "#fbe6c0", 0.45), rect(51.4, 0, 97.5, 51.0, "#fbe6c0", 0.4)]
    s += floorx(T_C, T_R, T_RIN, B5_IN, B5_OUT, 0, ((0.5, 58.0), (181.0, 62.0)), "c", False, False, True, 0.3, False)
    s += [rect(0, 51.0, 97.5, 100, "#fbe6c0", 0.22), rect(51.4, 0, 97.5, 51.0, "#fbe6c0", 0.22)]
    s += b5_ring() + b5_marks(True, True)
    s += tokens(("T", 66.1, 41.6), ("H", 62.0, 46.6), ("D", 69.7, 46.5), s=5.6)
    return sc(s, None, None, disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6))


def b5c():
    s = floorx(T_C, T_R, T_RIN, B5_IN, B5_OUT, 0, ((273.0, 120.0), (93.0, 120.0)), "c", True, False, True, 0.3, True,
               cones_outer=((166.5, 27.0),))
    s += [rect(51.4, 0, 100, 100, "#fbe6c0", 0.28), rect(74.5, 0, 100, 100, "#f5a623", 0.45)]
    s += b5_marks(False, True)
    s += big_arrow((65.0, 46.0), (41.5, 78.5), 1.6)
    s += tokens(("T", 37.5, 75.9), ("H", 36.4, 81.4), ("D", 42.7, 81.2), s=5.6)
    return sc(s, None, None, disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6))


def b5d():
    s = floorx(T_C, T_R, T_RIN, B5_IN, B5_OUT, 0, ((0.5, 58.0), (181.0, 62.0)), "c", True, False, True, 0.3, True)
    s += [rect(0, 51.0, 97.5, 100, "#fbe6c0", 0.3), rect(51.4, 0, 97.5, 51.0, "#fbe6c0", 0.25),
          rect(0, 74.2, 97.5, 76.4, "#fff0c8", 0.45), rect(74.6, 0, 76.6, 100, "#fff0c8", 0.45)]
    s += b5_marks(True, True)
    s += tokens(("T", 81.1, 40.8), ("H", 79.1, 47.0), ("D", 85.9, 45.8), s=5.6)
    return sc(s, None, None, disc(T_C, T_R, DARK), wm(T_C, T_R, 0.6))


# ============================================================ Roseblood: 6th Bloom
B6_IN, B6_OUT = {2, 6}, {1, 5}
B6_IN2, B6_OUT2 = {0, 2, 4, 6}, {1, 3, 5, 7}


def b6a():
    roles = {"MT": (37.0, 28.6), "D3": (42.8, 24.5), "ST": (56.6, 34.9), "D4": (65.2, 33.9),
             "D1": (39.1, 65.9), "H1": (45.2, 67.0), "H2": (58.9, 75.0), "D2": (67.4, 73.2)}
    return sc(floorx(T_C, T_R, T_RIN, B6_IN, B6_OUT, 0), roles, None, disc(T_C, T_R, DARK))


B6_ROLES = {"MT": (35.7, 25.7), "D3": (32.6, 40.7), "ST": (59.8, 36.4), "D4": (78.9, 33.6),
            "D1": (24.2, 64.7), "H1": (42.2, 67.5), "H2": (58.8, 78.2), "D2": (69.7, 59.4)}
B6_CRYS = ((36.6, 40.0), (85.6, 33.6), (17.4, 57.4), (65.0, 51.4))


def b6b():
    roles = dict(B6_ROLES, ST=(56.6, 35.0), H1=(45.2, 67.0))
    s = floorx(T_C, T_R, T_RIN, B6_IN, B6_OUT, 0)
    for x, y in B6_CRYS:
        s += crystal(x, y)
    for k in ("MT", "ST", "H1", "H2"):
        x, y = roles[k]
        s += rose_mark(x, y - 6.4)
    return sc(s, roles, None, disc(T_C, T_R, DARK))


def b6c():
    s = floorx(T_C, T_R, T_RIN, B6_IN2, B6_OUT2, 0, ((324.25, 107.5), (144.75, 107.5)), "b", outside=True,
               cone_out="#bfe2f4", cone_out_o=0.8)
    for x, y in B6_CRYS:
        s += crystal(x, y)
    for k in ("MT", "ST", "H1", "H2"):
        x, y = B6_ROLES[k]
        s += rose_mark(x, y - 6.4)
    return sc(s, B6_ROLES, None, disc(T_C, T_R, DARK))


def b6d():
    s = floorx(T_C, T_R, T_RIN, B6_IN2, B6_OUT2, 0, ((35.0, 108.0), (215.5, 107.5)), "b", outside=True,
               cone_out="#bfe2f4", cone_out_o=0.8)
    for x, y in B6_CRYS:
        s += crystal(x, y)
    roles = dict(B6_ROLES, H2=(67.0, 76.8))
    return sc(s, roles, None, disc(T_C, T_R, DARK))
