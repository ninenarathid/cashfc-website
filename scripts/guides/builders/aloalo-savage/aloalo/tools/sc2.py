"""Boss 2 (Lala): game8's 440x440 boards, a 5x5 square arena, waymarks A-D on the edges."""
from lib import *

ARENA = {"shape": "square", "at": [50, 50], "w": 85, "h": 85, "fill": "#465043", "edge": "#2a3128", "lines": False}
WM = {"A": [50, 7.5], "B": [93, 50.5], "C": [50, 93], "D": [7, 51.5]}
E0, E1 = 7.5, 92.5
T = [16, 33, 50, 67, 84]
B = [7.5, 24.5, 41.5, 58.5, 75.5, 92.5]
BOSS = [50, 50]


def grid():
    out = []
    for g in B[1:-1]:
        out.append(line((g, E0), (g, E1), "#8a9a7a", 0.3, 0.6))
        out.append(line((E0, g), (E1, g), "#8a9a7a", 0.3, 0.6))
    return out


def S(shapes, roles=None, boss=None, under=(), wm=True, **kw):
    return scene(ARENA, WM if wm else None, list(under) + grid() + shapes, roles, boss, **kw)


def tile(ci, ri, c="#4fa0c8", o=0.55):
    return box(B[ci], B[ri], B[ci + 1], B[ri + 1], c, o, 0.3)


def tiles(lst, c="#4fa0c8", o=0.55):
    return [tile(ci, ri, c, o) for ci, ri in lst]


def col(ci, c=ORANGE, o=0.55, out=True):
    y0, y1 = (0, 100) if out else (E0, E1)
    return box(B[ci], y0, B[ci + 1], y1, c, o)


def row(ri, c=ORANGE, o=0.55, out=True):
    x0, x1 = (0, 100) if out else (E0, E1)
    return box(x0, B[ri], x1, B[ri + 1], c, o)


def big_arrow(c, a, col="#ffffff"):
    return [arrow(off(c, a + 180, 4.5), off(c, a, 4.5), col, 1.4)]


def small_arrow(c, a, col="#f2d35a"):
    return [arrow(off(c, a + 180, 2.8), off(c, a, 2.8), col, 0.9)]


def orb(c):
    return [circle(c, 3.8, "#dfeaf2", 0.95, 0.3), dot((c[0] - 1, c[1] - 1), 1.1, "#ffffff")]


def cube(c):
    return [rect(c, 7, 7, 0, "#b9522a", 0.75, 0.4), rect(c, 4.6, 4.6, 45, "#f0a050", 0.6, 0.3)]


def mine(c, n):
    """The Subtractive Suppressor debuff icon with its count."""
    return [rect(c, 3.8, 4.2, 0, "#b3402a", 0.97, 0.3), text((c[0] + 0.4, c[1] + 0.2), str(n), 2.9, "#ffffff")]


def pair_icon(c):
    """The stack debuff icon (two figures)."""
    return [rect(c, 3.8, 4.0, 0, "#9fb3e0", 0.97, 0.3), dot((c[0] - 0.8, c[1] + 0.3), 0.75, "#ffffff"), dot((c[0] + 0.8, c[1] + 0.3), 0.75, "#ffffff")]


def scan(c):
    """The Analysis debuff icon over a player."""
    return [dot(c, 1.7, "#d0452c"), ring(c, 1.7, "#ffffff", 0.3), dot(c, 0.6, "#5fb0ff")]


def blight(c=(50.5, 38), r=6.2):
    """The Arcane Blight seal over the boss: a dark disc with an X."""
    return [circle(c, r, "#151515", 0.95, 0.3), line(off(c, 45, r * 0.8), off(c, 225, r * 0.8), "#c08040", 0.35),
            line(off(c, 135, r * 0.8), off(c, 315, r * 0.8), "#c08040", 0.35)]


def cleave(safe, at=(50, 50)):
    """Arcane Blight: everything but one 90-degree wedge, the wedge to `safe` (deg)."""
    return [cone(at, safe + 180, 270, 90, "#e8503a", 0.55, 0.01)]


def rot_arrow(cw, c=(50.5, 38), r=7.6):
    return arc_arrow(c, r, 300, 340, "#111111", 0.7) if cw else arc_arrow(c, r, 60, 20, "#111111", 0.7)


def doll(c):
    return [dot(c, 2.2, "#f6c66a"), dot((c[0] - 3, c[1] - 1.5), 1.2, "#e0457b"), dot((c[0] + 3, c[1] - 1.5), 1.2, "#e0457b"),
            dot((c[0], c[1] + 3.2), 1.0, "#e0457b")]


def plot(c):
    """The Arcane Plot marker over a player (game8: a pink trident)."""
    return [line((c[0], c[1] + 3), (c[0], c[1] - 3), "#e04a7a", 0.6)] + chevron((c[0], c[1] - 1.5), 0, 3.4, 1.6, "#e04a7a", 0.6)


# ---------------------------------------------------------------- Angular Addition -> Arcane Blight
def blight_pic(n, cw, safe):
    sh = cleave(safe) + blight() + rot_arrow(cw) + [text((56.5, 31), "V" if n == 5 else "III", 3.2, "#ffffff")]
    return S(sh, boss=BOSS)


# ---------------------------------------------------------------- Analysis
def ana_common(blue, orbs=True, arrows=True):
    sh = tiles(blue)
    if arrows:
        sh += big_arrow((16, 16), 90) + big_arrow((84, 84), 270)
        sh += small_arrow((84, 17), 180) + small_arrow((84, 33), 270) + small_arrow((16, 67), 90) + small_arrow((16, 84), 0)
    return sh


def ana1():
    sh = scan((50, 36)) + scan((42, 59)) + scan((59, 55)) + scan((50, 64.5))
    return S(sh, {"MT": (50, 41.5), "H1": (42, 64.5), "D1": (59, 60.5), "D2": (50, 70)}, BOSS)


def ana2():
    sh = ana_common([(0, 0), (4, 4)]) + orb((15, 33.5)) + orb((65, 85.5))
    sh += scan((50, 36)) + scan((42, 59)) + scan((59, 55)) + scan((50, 64.5))
    return S(sh, {"MT": (50, 41.5), "H1": (42, 64.5), "D1": (59, 60.5), "D2": (50, 70)}, BOSS)


def ana3():
    sh = ana_common([(0, 0), (1, 0), (3, 4), (4, 4)]) + orb((15, 33.5)) + orb((67, 85.5))
    sh += scan((50, 42)) + scan((46, 52)) + scan((57, 56)) + scan((50, 65))
    return S(sh, {"H1": (50, 37.5), "MT": (44, 52), "D1": (59, 57.5), "D2": (50, 70)}, BOSS)


def ana4():
    sh = cleave(90) + ana_common([(0, 0), (1, 0), (2, 0), (2, 4), (3, 4), (4, 4)]) + orb((15, 33.5))
    sh += blight() + rot_arrow(True) + [text((57, 30), "V", 3.2)]
    return S(sh, {"H1": (45, 58.5), "D1": (50, 59), "MT": (55.5, 58)}, BOSS)


def ana5():
    under = [tile(c, 0, "#9aa3a8", 0.55) for c in range(5)] + [tile(c, 1, "#9aa3a8", 0.55) for c in (2, 3, 4)]
    under += tiles([(c, 3) for c in range(5)] + [(c, 4) for c in range(5)])
    sh = cleave(180) + orb((15, 33.5)) + big_arrow((16, 16), 90) + big_arrow((84, 84), 270)
    sh += small_arrow((84, 17), 180) + small_arrow((84, 33), 270) + small_arrow((16, 67), 90) + small_arrow((16, 84), 0)
    sh += blight((50.5, 36)) + rot_arrow(True, (50.5, 36)) + [text((57, 28), "V", 3.2)]
    return S(sh, {"H1": (45, 58.5), "D1": (50, 58.5), "MT": (55, 58.5)}, BOSS, under=under)


def ana6():
    under = tiles([(c, r) for c in range(5) for r in (0, 1, 3, 4)])
    sh = big_arrow((16, 16), 90) + big_arrow((84, 84), 270) + small_arrow((84, 17), 180) + small_arrow((84, 33), 270)
    sh += small_arrow((16, 67), 90) + small_arrow((16, 84), 0) + orb((15, 33.5))
    sh += scan((38, 43)) + scan((50, 41)) + scan((58, 45)) + scan((44, 53))
    return S(sh, {"D2": (37.5, 48.5), "MT": (50, 46.5), "H1": (58, 50), "D1": (44, 58.5)}, BOSS, under=under)


def ana7():
    under = tiles([(c, r) for c in range(5) for r in (0, 1, 3, 4)])
    sh = blight((39, 41), 4.5) + blight((61.5, 41), 4.5) + [text((43, 47), "III", 2.6), text((57, 49), "V", 2.6)]
    sh += scan((40, 49)) + scan((64, 54))
    return S(sh, {"D2": (40.5, 53), "D1": (41, 58), "MT": (64.5, 52), "H1": (60, 57)}, BOSS, under=under)


# ---------------------------------------------------------------- Planar Tactics (Hamukatsu's way)
def planar(alt=False):
    under = [box(24.5, 24.5, 75.5, 58.5, ORANGE, 0.55, 0.3), box(24.5, 58.5, 58.5, 75.5, ORANGE, 0.55, 0.3)]
    sh = [arrow((78, 33.5), (36, 33.5), "#ffffff", 0.6), arrow((75, 57), (36, 57), "#ffffff", 0.6), arrow((75, 63.5), (36, 63.5), "#ffffff", 0.6),
          arrow((33, 76), (33, 36), "#ffffff", 0.6)]
    sh += stackmark((33, 33.5), 3.6, 2.4, 1.2) + stackmark((33, 60), 3.6, 2.4, 1.2)
    sh += mine((84, 33.5), 2) + mine((79, 56.5), 2) + mine((79, 63.5), 1) + mine((33, 79), 3)
    sh += pair_icon((84, 56.5))
    if alt:
        sh += pair_icon((33, 86)) + [arrow((82, 39), (81, 52), "#e0603a", 0.4)]
    else:
        sh += pair_icon((88.5, 33.5))
    return S(sh, under=under)


# ---------------------------------------------------------------- Spatial Tactics
CUBES = [(16, 33), (67, 33), (50, 67), (84, 67), (33, 84), (67, 84)]


def spatial(blue, cubes, orange=(), grey=(), orb_at=None, players=None, mines=(), red=None):
    under = tiles(blue) + list(orange) + [tile(c, r, "#a8aaa0", 0.5) for c, r in grey]
    sh = big_arrow((16, 16), 90) + big_arrow((84, 84), 270)
    sh += small_arrow((84, 17), 180) + small_arrow((84, 33), 270) + small_arrow((16, 67), 90) + small_arrow((16, 84), 0)
    for c in cubes:
        sh += cube(c)
    if orb_at:
        sh += orb(orb_at)
    for c, n in mines:
        sh += mine(c, n)
    if red:
        sh += [arrow(red[0], red[1], "#e8402a", 0.8)]
    return S(sh, players, under=under)


def sp1():
    return spatial([(0, 0), (4, 4)], CUBES, orb_at=(31, 16),
                   players={"D2": (47, 46.5), "MT": (48, 53.5), "D1": (58, 49), "H1": (61, 56.5)},
                   mines=[((41.5, 46.5), 1), ((41.5, 53.5), 2), ((64, 48.5), 4), ((66, 57), 3)])


def sp2():
    return spatial([(0, 0), (1, 0)], CUBES, orange=[col(3), row(4)], grey=[(3, 4)], orb_at=(33, 16),
                   players={"D2": (43, 46.5), "MT": (43, 53.5), "D1": (55, 49.5), "H1": (60, 57)},
                   mines=[((37, 53.5), 1), ((61, 49), 2), ((65.5, 57.5), 1)])


def sp3():
    return spatial([(0, 0), (2, 0), (3, 0)], CUBES[:5], orange=[col(1), row(4)], grey=[(1, 0), (1, 4), (2, 4), (3, 4), (4, 4)],
                   players={"D2": (43, 46.5), "MT": (43, 53.5), "D1": (56, 49.5), "H1": (59, 57)},
                   mines=[((37, 53.5), 1), ((61.5, 49), 2), ((65, 57.5), 1)], red=((41, 46.5), (34, 46.5)))


def sp4():
    blue = [(c, 0) for c in range(5)] + [(c, r) for c in range(5) for r in (3, 4)]
    return spatial(blue, CUBES[:4], orange=[row(1), col(3)], grey=[(3, 0), (3, 1), (4, 1), (3, 3), (3, 4)],
                   players={"D2": (33, 46.5), "MT": (48, 53.5), "D1": (56, 49.5), "H1": (60, 56.5)},
                   mines=[((41.5, 53.5), 1), ((61.5, 49), 1)])


def sp5():
    blue = [(c, r) for c in range(5) for r in (0, 1, 3, 4)] + [(0, 2), (4, 2)]
    return spatial(blue, [CUBES[0], CUBES[2], CUBES[3]], orange=[col(2), row(3)], grey=[(2, 0), (2, 1), (2, 4), (0, 3), (1, 3)],
                   players={"D2": (33, 46.5), "MT": (48, 53.5), "D1": (56, 49.5), "H1": (60, 56.5)},
                   mines=[((41.5, 53.5), 1), ((61.5, 49), 1)], red=((64, 49), (74, 49)))


def sp6():
    blue = [(c, r) for c in range(5) for r in (0, 1, 3, 4)]
    return spatial(blue, [CUBES[0], CUBES[3]], orange=[col(0), col(4), box(0, 24.5, 24.5, 41.5, ORANGE, 0.5), box(75.5, 58.5, 100, 75.5, ORANGE, 0.5)],
                   grey=[(1, 0), (2, 0), (3, 0), (1, 1), (2, 1), (3, 1), (1, 3), (2, 3), (3, 3)],
                   players={"D2": (33, 46.5), "MT": (48, 53.5), "D1": (84, 49.5), "H1": (60, 56.5)},
                   mines=[((89.5, 49), 1)], red=((72, 49), (79.5, 49)))


# ---------------------------------------------------------------- Symmetric Surge -> Constructive Figure -> Arcane Plot
DOLLS = [(33, 6.5), (67, 6.5), (84, 6.5)]


def surge1():
    sh = pair_icon((42.5, 47.5)) + pair_icon((57.5, 49.5))
    return S(sh, {"MT": (50, 44), "D2": (42.5, 53), "D1": (58, 54.5), "H1": (50, 58.5)}, BOSS)


def dolls(lst=DOLLS):
    out = []
    for c in lst:
        out += doll(c)
    return out


def surge2():
    sh = tiles([(4, 3), (4, 4)]) + big_arrow((84, 67), 0) + big_arrow((84, 84), 270) + small_arrow((84, 33), 270, "#e07040")
    sh += dolls() + pair_icon((42.5, 47.5)) + pair_icon((58, 49.5))
    return S(sh, {"MT": (50, 44), "D2": (42.5, 53), "D1": (58, 54.5), "H1": (46, 57.5)}, BOSS, wm=False)


SURGE_BLUE = [(c, 1) for c in range(5)] + [(c, 4) for c in range(5)] + [(4, 2), (4, 3)]
PLOT_ROLES = {"MT": (16, 48), "H1": (50, 48), "D1": (16, 69), "D2": (50, 69.5)}


def plots(roles):
    out = []
    for k, (x, y) in roles.items():
        out += plot((x, y - 7.5))
    return out


def surge3():
    under = tiles([(0, 1), (2, 1), (0, 4), (2, 4)]) + [col(1), col(3), col(4)]
    sh = dolls() + big_arrow((84, 67), 0) + big_arrow((84, 84), 270) + plots(PLOT_ROLES)
    sh += pair_icon((21, 69)) + pair_icon((55, 70))
    return S(sh, PLOT_ROLES, [33, 56], under=under, wm=False)


def surge4():
    under = tiles(SURGE_BLUE)
    sh = dolls() + big_arrow((84, 67), 0) + big_arrow((84, 84), 270) + plots(PLOT_ROLES)
    sh += pair_icon((21, 69)) + pair_icon((55, 69.5)) + [arrow((26, 68.5), (40, 68.5), "#d8f27a", 0.5), arrow((40, 68.5), (26, 68.5), "#d8f27a", 0.5)]
    return S(sh, PLOT_ROLES, [25, 55], under=under, wm=False)


def surge5():
    under = tiles(SURGE_BLUE)
    sh = dolls() + big_arrow((84, 67), 0) + big_arrow((84, 84), 270)
    sh += aoe((25, 44), 17) + aoe((70, 44), 17) + aoe((24, 70), 17) + aoe((70, 71), 17)
    sh += pair_icon((29, 69)) + pair_icon((75, 70))
    return S(sh, {"MT": (25, 46.5), "H1": (70, 46.5), "D1": (24.5, 68.5), "D2": (70, 70)}, under=under, wm=False)


def surge6():
    under = tiles(SURGE_BLUE) + [box(24.5, 41.5, 41.5, 75.5, ORANGE, 0.5), box(58.5, 41.5, 75.5, 75.5, ORANGE, 0.5)]
    sh = dolls() + [circle(c, 17, "#b9b9b9", 0.35, 0.3) for c in ((25, 44), (70, 44), (24, 70), (70, 71))]
    sh += stackmark((33, 58), 4.2) + stackmark((67, 58), 4.2)
    return S(sh, {"MT": (32, 56), "D1": (34, 60), "H1": (66, 56), "D2": (68, 60)}, under=under, wm=False)


def surge7():
    under = [col(0), col(2), col(4)] + tiles([(1, 1), (3, 1), (1, 4), (3, 4)])
    roles = {"MT": (33, 47), "H1": (67, 47), "D1": (33, 68), "D2": (67, 68)}
    sh = [d for c in ((16, 4.5), (84, 4.5)) for d in doll(c)] + plots(roles)
    sh += [arrow((27, 47.5), (17, 47.5), "#e8402a", 1.0), arrow((61, 47.5), (51, 47.5), "#e8402a", 1.0),
           arrow((27, 68.5), (17, 68.5), "#e8402a", 1.0), arrow((61, 68.5), (51, 68.5), "#e8402a", 1.0)]
    sh += small_arrow((84, 33), 270) + big_arrow((84, 67), 0) + big_arrow((84, 84), 270)
    sh += pair_icon((38.5, 68)) + pair_icon((72.5, 68))
    return S(sh, roles, under=under)


def surge8():
    under = tiles([(c, r) for c in range(5) for r in (1, 2, 3, 4) if not (c in (0, 2) and r in (2, 3))])
    roles = {"MT": (13, 46), "H1": (52, 46), "D1": (13, 69.5), "D2": (52, 70)}
    sh = [d for c in ((16, 4), (84, 4)) for d in doll(c)] + plots(roles)
    sh += small_arrow((84, 33), 270) + big_arrow((84, 67), 0) + big_arrow((84, 84), 270)
    sh += pair_icon((18, 69)) + pair_icon((57, 70))
    return S(sh, roles, under=under, wm=True)
