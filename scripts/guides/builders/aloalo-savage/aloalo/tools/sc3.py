"""Boss 3 (Statice): game8's 440x440 boards, a round arena (waymarks only in the Present Box boards)."""
from lib import *

ARENA = {"shape": "circle", "at": [50, 50], "r": 45, "fill": "#5c432a", "edge": "#2e2116", "lines": False}
C0 = (50, 50)
WM = {"A": [50, 6], "1": [87, 22], "B": [95, 51], "2": [85, 80], "C": [50, 94.5], "3": [17, 80], "D": [5, 51], "4": [17, 20]}
Y_, B_, R_ = "#f2e21c", "#1f6fbf", "#e0262b"
FIRE = "#e8901e"


def S(shapes, roles=None, boss=None, wm=False, arena=ARENA, **kw):
    return scene(arena, WM if wm else None, shapes, roles, boss, **kw)


def bomb(c, lit):
    col = "#f0893a" if lit else "#151515"
    return [dot(c, 3.5, col), line((c[0] + 1.6, c[1] - 2.8), (c[0] + 2.4, c[1] - 4.4), "#c0a080", 0.3)]


def tether(a, b):
    return line(a, b, "#f06aa0", 0.4, 0.9)


# the six bomb spots and the two sets of three
BN, BW, BE, BC, BSW, BSE = (50.5, 13.5), (15.5, 35), (86, 35), (50.5, 51.5), (24.5, 79.5), (76.5, 79.5)


def bombs(lit, dark, tri_lit, tri_dark, blast=True, r=22.5):
    out = []
    if blast:
        for c in lit:
            out += [circle(c, r, ORANGE, 0.45, 0.01), ring(c, r, ORIM, 0.35, 0.85)]
    for a, b in tri_lit + tri_dark:
        out.append(tether(a, b))
    for c in lit:
        out += bomb(c, True)
    for c in dark:
        out += bomb(c, False)
    return out


def tri(a, b, c):
    return [(a, b), (b, c), (c, a)]


P1 = dict(lit=[BN, BW, BE], dark=[BC, BSW, BSE], tri_lit=tri(BN, BW, BE), tri_dark=tri(BC, BSW, BSE))
P2 = dict(lit=[BC, BSW, BSE], dark=[BN, BW, BE], tri_lit=tri(BC, BSW, BSE), tri_dark=tri(BN, BW, BE))
P3 = dict(lit=[BW, BE, BC], dark=[BN, BSW, BSE], tri_lit=tri(BW, BE, BC), tri_dark=tri(BN, BSW, BSE))
P4 = dict(lit=[BN, BSW, BSE], dark=[BW, BE, BC], tri_lit=tri(BN, BSW, BSE), tri_dark=tri(BW, BE, BC))


# ---------------------------------------------------------------- Trick Reload / Trigger Happy
SPREAD4 = {"MT": (32, 38), "D2": (58, 40), "H1": (34, 62.5), "D1": (56, 59.5)}


def spread_circles(cs, r=14):
    out = []
    for c in cs:
        out += [circle(c, r, ORANGE, 0.42, 0.01), ring(c, r, ORIM, 0.35, 0.9)]
    return out


def tr_spread():
    return S(spread_circles([(34, 36), (59, 36), (37, 61), (61, 60)]), SPREAD4, [50, 50])


def tr_stack():
    return S(stackmark((50, 51), 4.6), {"MT": (47, 50), "D2": (51.5, 48.5), "D1": (49, 53), "H1": (53, 51.5)}, [50, 49])


DICE = {1: (50, 22), 2: (79, 37), 3: (81, 68), 4: (50, 83), 5: (23, 65), 6: (24, 36)}


def die(n, c):
    col = "#e07aa0" if n % 2 == 0 else "#4a8ad8"
    return [dot(c, 2.6, "#f6f8ff"), ring(c, 2.6, col, 0.4), text((c[0], c[1] + 0.2), str(n), 2.7, col)]


def sectors(safe=None, c=C0, r=45):
    out = []
    for k in range(6):
        if k + 1 == safe:
            continue
        out.append(cone(c, 60 * k, 60, r, FIRE, 0.82, 0.01))
    for k in range(6):
        out.append(line(c, off(c, 30 + 60 * k, r), "#f3e04a", 0.5, 0.95))
    out.append(ring(c, r, "#f3e04a", 0.5))
    for n, p in DICE.items():
        out += die(n, p)
    return out


def th_dice():
    return S(sectors())


def th_safe6():
    return S(sectors(6))


# ---------------------------------------------------------------- Ring a Ring o' Explosions
def rr(p):
    return S(bombs(**p))


def rr_spread():
    sh = bombs(**P1) + spread_circles([(40.5, 58), (59, 57), (39.5, 82), (62, 83.5)], 11)
    return S(sh, {"MT": (40.5, 58), "D2": (59, 57), "H1": (39.5, 82), "D1": (62, 83.5)}, [50.5, 46])


def rr_stack():
    sh = bombs(**P1) + stackmark((50.5, 58), 4.6)
    return S(sh, {"MT": (48, 56.5), "D2": (53, 56.5), "H1": (48, 60), "D1": (53, 60)}, [50.5, 46])


# ---------------------------------------------------------------- the dartboard
def board(c=(50, 51.5), r=44, ri=29):
    out = []
    for k in range(12):
        out.append(cone(c, 15 + 30 * k, 30, r, [Y_, B_, R_][k % 3], 1.0, 0.01))
    for k in range(12):
        out.append(cone(c, 15 + 30 * k, 30, ri, [B_, R_, Y_][k % 3], 1.0, 0.01))
    for k in range(12):
        out.append(line(c, off(c, 30 * k, r), "#c9cbd3", 0.45))
    out += [ring(c, ri, "#c9cbd3", 0.5), ring(c, 15, "#c9cbd3", 0.25, 0.6), ring(c, r, "#c9cbd3", 0.8)]
    return out


DART_ARENA = None  # the board is the arena


def dart_ring(c):
    """A player holding a dart (game8: a dark ring around the role)."""
    return [ring(c, 3.9, "#2a3a48", 0.8)]


def darts1():
    sh = board()
    sh += [circle((50, 51.5), 16, ORANGE, 0.5, 0.01)] + [circle(c, 22.5, ORANGE, 0.4, 0.01) for c in ((15, 37), (86, 37))]
    sh += [circle(c, 20, "#b0a0a0", 0.25, 0.01) for c in ((28, 30), (73, 30))]
    sh += [tether((48, 10), (16, 39)), tether((48, 10), (25, 82)), tether((25, 82), (76, 82)), tether((76, 82), (86, 39)), tether((86, 39), (50, 51.5))]
    sh += bomb((50, 51.5), True) + bomb((17, 39), True) + bomb((86, 39), True) + bomb((48, 10), False) + bomb((25, 82), False) + bomb((76, 82), False)
    return S(sh, arena=None)


def darts2():
    sh = board()
    sh += [arrow((80, 7), (90, 16), "#e8402a", 1.4), arrow((15, 86), (8, 76), "#e8402a", 1.4)]
    sh += [tether((50, 51.5), (88, 36)), tether((50, 51.5), (34, 88)), tether((88, 36), (34, 88)),
           tether((44, 13), (11, 46)), tether((11, 46), (75, 74)), tether((75, 74), (44, 13))]
    sh += bomb((50, 51.5), True) + bomb((88, 36), True) + bomb((34, 88), True) + bomb((44, 13), False) + bomb((11, 46), False) + bomb((75, 74), False)
    return S(sh, arena=None)


def darts3():
    sh = board()
    sh += [circle(c, 22.5, ORANGE, 0.45, 0.01) for c in ((50, 51.5), (82, 36), (33, 87))]
    sh += [circle(c, 20, "#a99", 0.3, 0.01) for c in ((25, 72), (72, 34))]
    sh += [tether((50, 51.5), (82, 36)), tether((50, 51.5), (33, 87)), tether((82, 36), (33, 87)),
           tether((47, 12), (11, 46)), tether((11, 46), (75, 74)), tether((75, 74), (47, 12))]
    sh += bomb((50, 51.5), True) + bomb((82, 36), True) + bomb((33, 87), True) + bomb((47, 12), False) + bomb((11, 46), False) + bomb((75, 74), False)
    sh += dart_ring((27, 31.5)) + dart_ring((20, 40)) + dart_ring((24.5, 33.5))
    return S(sh, {"D1": (29.5, 29.5), "MT": (25, 33.5), "D2": (16, 36), "H1": (21, 40.5)}, arena=None)


def darts4():
    sh = board() + stackmark((25, 38), 5)
    sh += dart_ring((26, 34)) + dart_ring((21, 41)) + dart_ring((32, 39))
    return S(sh, {"MT": (26, 34), "D1": (23.5, 37.5), "H1": (21, 41), "D2": (32, 39)}, arena=None)


def darts5():
    sh = board()
    sh += [circle(c, 22.5, ORANGE, 0.45, 0.01) for c in ((50, 51.5), (82, 36), (33, 87))]
    sh += spread_circles([(43, 31), (29, 18), (18, 41), (24, 59)], 11)
    sh += bomb((50, 51.5), True) + bomb((82, 36), True) + bomb((33, 87), True) + bomb((47, 12), False) + bomb((11, 46), False) + bomb((75, 74), False)
    sh += dart_ring((32, 26)) + dart_ring((14, 37))
    return S(sh, {"D1": (47, 20), "MT": (32, 26), "H1": (14, 37), "D2": (24, 59)}, arena=None)


# ---------------------------------------------------------------- Surprise Balloon -> Beguiling Glitter -> Trigger Happy -> Trapshooting
def balloon(c):
    return [circle(c, 13.5, "#4a3f78", 0.9, 0.3), ring(c, 13.5, "#cfc6ee", 0.4), dot(c, 3.0, "#2a3f8a")]


def chevs(c, a, n=3):
    out = []
    for k in range(n):
        out += chevron(off(c, a, (k - (n - 1) / 2) * 2.6), a, 5.6, 2.6, "#ffffff", 1.0)
    return out


def push(c, src, n=3):
    """game8's knockback chevrons: pointing away from what knocks back."""
    return chevs(c, ang(src, c), n)


TH_ROLES = {"MT": (46, 61.5), "D2": (53, 61.5), "H1": (46, 68), "D1": (53, 68)}


def bal1():
    sh = sectors() + balloon((24, 49)) + balloon((78, 49)) + [ring((50, 48), 4.5, "#2d5fb8", 0.5), text((50, 48.3), "4", 4.5, "#2d5fb8")]
    return S(sh, TH_ROLES)


def bal2():
    sh = sectors(4) + balloon((24, 49)) + balloon((78, 49))
    sh += push((40, 29), (24, 49)) + push((46, 50), (24, 49)) + push((40, 71), (24, 49))
    return S(sh, TH_ROLES)


def bal3():
    sh = balloon((78, 49)) + push((59, 29), (78, 49)) + push((46, 50), (78, 49)) + push((59, 71), (78, 49))
    return S(sh, TH_ROLES, [48, 48])


def march(c):
    """The Forced March debuff icon."""
    return [rect(c, 3.4, 3.4, 0, "#b8383f", 0.97, 0.3), dot(c, 0.8, "#ffffff")]


def bal4():
    sh = stackmark((50, 51), 5) + march((34, 28)) + march((21, 48)) + march((78, 46)) + march((50, 75))
    sh += [arrow((37, 34), (46, 46)), arrow((32, 51), (45, 51)), arrow((72, 51), (55, 51)), arrow((50, 71), (50, 57))]
    return S(sh, {"MT": (30, 23), "H1": (21, 53.5), "D2": (78, 52), "D1": (50, 81)}, [50, 49])


def bal5():
    sh = spread_circles([(28, 26), (74, 26), (26, 72), (72, 72)], 15)
    sh += [arrow((44, 40), (34, 31), "#f6c890", 1.0), arrow((57, 40), (67, 31), "#f6c890", 1.0), arrow((42, 60), (32, 68), "#f6c890", 1.0),
           arrow((57, 60), (67, 68), "#f6c890", 1.0)]
    sh += march((44, 39.5)) + march((55, 39.5)) + march((40, 51.5)) + march((60, 51.5))
    return S(sh, {"MT": (44, 45), "D2": (55, 45), "H1": (41, 57), "D1": (56, 57)}, [50, 50])


# ---------------------------------------------------------------- Ring a Ring 3 -> Present Box
def boxes_blue(cs, r=22):
    return [circle(c, r, "#7fb9e0", 0.35, 0.3) for c in cs]


FLOWER = [(50, 50), (32, 37), (68, 37), (32, 63), (68, 63), (50, 30), (50, 70), (30, 50), (70, 50)]


def claw_ring(c):
    return [circle(c, 6.5, "#2a3a50", 0.55, 0.3), ring(c, 6.5, "#9fb3c8", 0.4)]


def present_star():
    sh = [circle(c, 22.5, ORANGE, 0.4, 0.01) for c in ((12, 50), (50, 50), (73, 75))]
    sh += boxes_blue(FLOWER)
    sh += [tether((12, 50), (50, 50)), tether((50, 50), (73, 75)), tether((73, 75), (12, 50)),
           tether((32.5, 17), (79, 33)), tether((79, 33), (32, 80)), tether((32, 80), (32.5, 17))]
    sh += bomb((12, 50), True) + bomb((50, 50), True) + bomb((73, 75), True) + bomb((32.5, 17), False) + bomb((79, 33), False) + bomb((32, 80), False)
    sh += claw_ring((24, 14))
    return S(sh, {"MT": (26, 11.5), "D2": (22, 15.5), "D1": (77, 24), "H1": (27, 90.5)}, wm=True)


def present_tri():
    sh = [circle(c, 22.5, ORANGE, 0.4, 0.01) for c in ((50, 13), (77, 33), (50, 48))]
    sh += boxes_blue(FLOWER)
    sh += [tether((50, 13), (77, 33)), tether((77, 33), (50, 48)), tether((50, 48), (50, 13)),
           tether((14, 38), (26, 75)), tether((26, 75), (66, 75)), tether((66, 75), (14, 38))]
    sh += bomb((50, 13), True) + bomb((77, 33), True) + bomb((50, 48), True) + bomb((14, 38), False) + bomb((26, 75), False) + bomb((66, 75), False)
    sh += claw_ring((17, 80))
    return S(sh, {"H1": (12, 24), "D2": (85, 76), "MT": (18, 78), "D1": (21, 83)}, wm=True)


# ---------------------------------------------------------------- Pinwheeling Dartboard (spell's way)
def pill(a, b, col="#f08a20", o=0.6):
    """The fire telegraph: a capsule from a to b."""
    c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    return [rect(c, 7, dist(a, b) + 7, ang(a, b), col, o, 0.3)]


def wheel_center(c=(49.5, 51.5)):
    out = [dot(c, 5.5, "#e0783a"), ring(c, 5.5, "#f6c890", 0.4)]
    for a in range(0, 360, 45):
        out += chevron(off(c, a, 8), a + 180, 2.4, 1.0, "#9fc8f0", 0.5)
    return out


BOARD2 = dict(c=(49.5, 51.5))


def pw_base(pills):
    sh = board(**BOARD2)
    for a, b in pills:
        sh += pill(a, b)
    return sh


PILLS1 = [((47, 13), (47, 32)), ((16, 71), (27, 62)), ((73, 63), (86, 72))]
PILLS2 = [((16, 25), (30, 37)), ((71, 42), (86, 34)), ((48, 74), (48, 92))]


def pw_legend():
    sh = pw_base(PILLS1) + wheel_center() + chevs((48, 69), 180, 2)
    sh += [ring(c, 7, "#e8202a", 0.6) for c in ((47, 16), (17, 70), (84, 70), (48, 69))]
    sh += dart_ring((32, 56)) + dart_ring((38, 56))
    return S(sh, {"D2": (32, 56), "MT": (38, 56), "D1": (59, 56), "H1": (65, 56)}, arena=None)


def pw1():
    sh = pw_base(PILLS1) + wheel_center() + chevs((48, 69), 180, 2)
    sh += dart_ring((31.5, 56)) + dart_ring((37.5, 56))
    return S(sh, {"D2": (31.5, 56), "MT": (37.5, 56), "D1": (59, 56), "H1": (65, 56)}, arena=None)


def pw2():
    sh = pw_base(PILLS2) + wheel_center() + chevs((48, 69), 180, 2)
    sh += dart_ring((44, 21)) + dart_ring((51, 21))
    return S(sh, {"D2": (44, 21), "MT": (51, 21), "D1": (46.5, 51), "H1": (51.5, 51)}, arena=None)


def pw_final(top, left, right, rings):
    sh = pw_base(PILLS2) + wheel_center() + chevs((48, 69), 180, 2)
    sh += [line(left[1], right[1], "#e8357a", 0.6)]
    sh += [arrow((44, 55), top[0][1], "#ffffff", 0.6), arrow((52, 55), top[1][1], "#ffffff", 0.6),
           arrow((40, 54), left[1], "#ffffff", 0.6), arrow((62, 54), right[1], "#ffffff", 0.6)]
    roles = {top[0][0]: top[0][1], top[1][0]: top[1][1], left[0]: left[1], right[0]: right[1]}
    for k in rings:
        sh += dart_ring(roles[k])
    return S(sh, roles, arena=None)


def pw3():
    return pw_final([("D2", (43, 8)), ("MT", (50, 8))], ("D1", (6, 49)), ("H1", (91, 48)), ["D2", "MT"])


def pw4():
    return pw_final([("MT", (46, 8)), ("D2", (54, 8))], ("D1", (6, 49)), ("H1", (91, 48)), ["MT", "D1"])


def pw5():
    return pw_final([("D2", (45, 8)), ("H1", (52, 8))], ("D1", (6, 49)), ("MT", (91, 48)), ["D1", "MT"])


# ---------------------------------------------------------------- Beguiling Glitter -> Ring a Ring 4 -> Trapshooting
def fin1():
    sh = spread_circles([(34, 36), (59, 36), (37, 61), (61, 60)], 13.5)
    return S(sh, {"MT": (40, 39), "D2": (60, 41), "H1": (40, 62.5), "D1": (59, 60.5)}, [50, 50])


def fin_bombs(blast):
    sh = [tether((44, 10), (39, 83)), tether((39, 83), (50, 51)), tether((50, 51), (44, 10)),
          tether((83, 26), (22, 48)), tether((22, 48), (82, 72)), tether((82, 72), (83, 26))]
    if blast:
        sh = [circle(c, 22.5, ORANGE, 0.4, 0.01) for c in ((44, 10), (39, 83), (50, 51))] + sh
    sh += bomb((44, 10), True) + bomb((39, 83), True) + bomb((50, 51), True) + bomb((83, 26), False) + bomb((22, 48), False) + bomb((82, 72), False)
    return sh


def fin2():
    sh = sectors() + boxes_blue([(40, 30), (62, 30), (30, 55), (70, 55), (50, 72)], 20) + fin_bombs(False)
    sh += march((48, 46)) + march((52, 46))
    return S(sh, {"D2": (23, 40), "H1": (28, 40), "D1": (46, 53), "MT": (50, 56)})


def fin3():
    sh = sectors(6) + boxes_blue([(40, 30), (62, 30), (30, 55), (70, 55), (50, 72)], 20) + fin_bombs(False)
    sh += march((25, 32)) + march((30, 32))
    return S(sh, {"D2": (21, 39), "MT": (27, 39), "D1": (22, 43), "H1": (27, 43)})


def fin4():
    sh = fin_bombs(True) + march((48, 46.5)) + march((52.5, 46.5))
    return S(sh, {"H1": (47, 52), "D2": (52.5, 52), "D1": (88.5, 49), "MT": (90.5, 54.5)})


def fin5():
    sh = fin_bombs(True) + stackmark((84, 51), 5) + march((82, 44)) + march((86.5, 44))
    return S(sh, {"H1": (81, 49), "D2": (86, 49), "D1": (81, 54.5), "MT": (86, 54.5)})
