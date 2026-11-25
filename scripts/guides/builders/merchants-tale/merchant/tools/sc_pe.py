"""Pari of Plenty: every scene, redrawn from game8's square pictures (440x440, the whole floor, 4 x 4 big tiles).
The numbers 1 / 2 / 3 in game8's pictures are labels (the charge order, the spots of Pari's Curse), drawn as numbers here."""
from scm import *

FLOOR = "#8d8e92"
SQA = {"shape": "square", "at": [50, 50], "w": 99, "h": 99, "fill": FLOOR, "lines": False, "edge": "#d8dadf"}
LBL = {"1": "#ff6d8a", "2": "#ffe066", "3": "#7fc8ff"}
PHANTOM = "#8e1b1b"
LIGHT = "#f4a46a"


def checker():
    out = []
    for i in range(8):
        for j in range(8):
            if (i + j) % 2 == 0:
                out.append(rect((6.25 + i * 12.5, 6.25 + j * 12.5), 12.5, 12.5, 0, "#ffffff", 0.07, 0.01))
    return out


def board(shapes, rl=None, boss=None, **kw):
    s = {"frame": [1, 1], "arena": dict(SQA), "waymarks": None, "shapes": checker() + shapes, "boss": boss, "roles": rl or {},
         "iconSize": 6, "bossSize": 7}
    s.update(kw)
    return s


def label(p, n, size=8):
    return text(p, str(n), size, LBL[str(n)])


def path_lines(second_right=True):
    """The three charges' paths (1 down the middle, 2 a diagonal, 3 across) as game8 draws them."""
    out = [rect((75, 2.5), 50, 5, 0, LIGHT, 0.85, 0.01), line((50, 1), (50, 99), DEEP, 0.7)]
    if second_right:
        out += [line((50, 99), (99, 52), DEEP, 0.7), line((99, 52), (1, 52), DEEP, 0.7), label((50, 25), 1), label((70, 78), 2), label((38, 50), 3)]
    else:
        out += [line((50, 99), (1, 52), DEEP, 0.7), line((1, 52), (99, 52), DEEP, 0.7), label((50, 25), 1), label((27, 76), 2), label((65, 50), 3)]
    return out


def half(c, d, col, o=0.6):
    return cone(c, d, 180, 150, col, o, 0.15)


RED, YEL, BLU = "#e8261e", "#f2d27a", "#8fb3ee"


def pe02():
    return board(path_lines(True), boss=[50, 2])


def you(p):
    """game8's lone example player (a plain icon, no seat)."""
    return [dot(p, 2.6, "#f5f5f5"), ring(p, 2.6, "#333333", 0.4, 0.9), dot(p, 0.9, "#333333")]


def pe03():
    return board([rect((75, 50), 50, 99, 0, RED, 0.85, 0.01), label((50, 37), 1)] + you((8, 57)), boss=[50, 2])


def _diag2(c0, c1, side):
    """The second charge's half from the diagonal path c0 → c1, on side ±90."""
    import math
    a = math.degrees(math.atan2(c1[0] - c0[0], -(c1[1] - c0[1])))
    m = ((c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2)
    ln = math.hypot(c1[0] - c0[0], c1[1] - c0[1])
    return rect(off(m, a + side, 70), ln, 140, a - 90, YEL, 0.75, 0.01)


def pe04():
    return board([_diag2((50, 99), (99, 52), -90), line((50, 99), (99, 52), DEEP, 0.7), label((72, 78), 2)] + you((5, 60)), boss=[50, 99])


def pe05():
    return board([rect((50, 76), 99, 48, 0, BLU, 0.8, 0.01), line((1, 52), (99, 52), DEEP, 0.7), label((50, 50), 3)] + you((5, 45)), boss=[99, 52])


def pe06():
    sh = [donut((1, 53), 160, 11, DEEP, 0.85)] + stack((7.5, 53), 6)
    return board(sh, roles(MT=(7, 49.5), D2=(11.5, 49.5), D1=(6.5, 56.5), H1=(11.5, 56)), boss=[1, 52])


def pe07():
    sh = [donut((1, 52), 160, 14, DEEP, 0.85)]
    return board(sh, roles(D1=(5, 39), D2=(11, 45), H1=(11, 55), MT=(2.5, 63)), boss=[1, 52])


def pe08():
    return board(path_lines(True), boss=[50, 2])


def pe09():
    return board(path_lines(False), boss=[50, 2])


def pe10():
    return board([rect((75, 50), 50, 99, 0, RED, 0.85, 0.01), label((50, 40), 1)] + you((8, 57)), boss=[50, 2])


def pe11():
    return board([_diag2((50, 99), (99, 52), -90), line((50, 99), (99, 52), DEEP, 0.7), label((72, 78), 2)] + you((5, 60)), boss=[50, 99])


def pe12():
    return board([rect((50, 76), 99, 48, 0, BLU, 0.8, 0.01), line((1, 52), (99, 52), DEEP, 0.7), label((50, 50), 3)] + you((5, 43)), boss=[99, 52])


def pe13():
    return board([rect((75, 50), 50, 99, 0, RED, 0.85, 0.01), label((50, 40), 1)] + you((40, 54)), boss=[50, 2])


def pe14():
    return board([_diag2((50, 99), (1, 52), -90), line((50, 99), (1, 52), DEEP, 0.7), label((24, 74), 2)] + you((40, 58)), boss=[50, 99])


def pe15():
    return board([rect((50, 26), 99, 52, 0, BLU, 0.8, 0.01), line((1, 52), (99, 52), DEEP, 0.7), label((50, 50), 3)] + you((87, 55)), boss=[1, 52])


def pe16():
    return board([donut((1, 52), 160, 14, DEEP, 0.85)], roles(D1=(5, 39), D2=(11, 45), H1=(11, 55), MT=(2.5, 63)), boss=[1, 52])


def pe17():
    return board([donut((99, 52), 160, 14, DEEP, 0.85)], roles(MT=(95, 39), H1=(89, 45), D2=(89, 57), D1=(95, 63)), boss=[99, 52])


def phantom(p, col=PHANTOM):
    return [dot(p, 3.2, col), ring(p, 3.2, "#ffb0a0", 0.35, 0.9)]


PH4 = [(25, 25), (75, 25), (25, 75), (75, 75)]


def spin(p, cw):
    return [ring(p, 6, "#4fd8ec" if cw else "#ff9b3d", 0.45, 0.9), text((p[0], p[1] + 4), ">>>" if cw else "<<<", 3.2, "#7fe4ff" if cw else "#ffa94d")]


STRIPS = [((12, 25), 24, 8), ((75, 11), 10, 22), ((24.5, 89), 9, 22), ((90, 75.5), 20, 9)]


def pe18():
    sh = [rect(c, w, h, 0, LIGHT, 0.75, 0.01) for c, w, h in STRIPS]
    for p, cw in zip(PH4, (False, False, True, True)):
        sh += spin(p, cw) + phantom(p)
    return board(sh)


def _burn_but_sw():
    return [rect((50, 37.5), 99, 75, 0, DEEP, 0.88, 0.01), rect((62.5, 87.5), 75, 25, 0, DEEP, 0.88, 0.01)]


def pe19():
    sh = _burn_but_sw() + [rect(c, w, h, 0, "#ffc08a", 0.6, 0.01) for c, w, h in STRIPS]
    for p, cw in zip(PH4, (False, False, True, True)):
        sh += spin(p, cw) + phantom(p)
    return board(sh)


PH20 = [(24.5, 26), (74.5, 26), (25, 74), (73.5, 76)]


def pe20():
    sh = _burn_but_sw()
    for p in PH20:
        sh += phantom(p)
    return board(sh, roles(D1=(2.5, 79), MT=(22.5, 79), H1=(2.5, 97.5), D2=(22.5, 97.5)))


def pe21():
    sh = _burn_but_sw()
    for p in PH20:
        sh += phantom(p)
    sh += stack((20, 81), 5) + stack((5, 96), 5)
    return board(sh, roles(MT=(22, 79), D1=(18, 82.5), D2=(7.5, 94), H1=(2.5, 98)))


PH24 = [(26, 24), (74, 24), (26, 74), (74, 76)]


def pe24():
    sh = []
    for p in PH24:
        sh += phantom(p)
    rl = {"MT": [[22.5, 22], [78, 22], [22.5, 77], [78, 77]], "H1": [[2.5, 2.5], [97.5, 2.5], [2.5, 97.5], [97.5, 97.5]],
          "D1": [[22.5, 4], [97.5, 22], [2.5, 77], [78, 97]], "D2": [[2.5, 22], [78, 4], [22.5, 97], [97.5, 77]]}
    return board(sh, rl)


def pe25():
    sh = []
    for p in PH24:
        sh += phantom(p)
    rl = {"MT": [[15, 22], [78, 22], [16, 79], [78, 79]], "D1": [[10, 22], [83, 22], [10.5, 79], [83, 79]],
          "H1": [[2.5, 2.5], [97.5, 2.5], [2.5, 97.5], [97.5, 97.5]], "D2": [[7.5, 3.5], [92.5, 3.5], [7.5, 97.5], [92.5, 97.5]]}
    return board(sh, rl)


def tiles(lit, extra=()):
    """Pari's Curse: every big tile orange except the ones in lit (grey); extra = (tile, colour) overrides."""
    out = []
    ex = dict(extra)
    for c in range(4):
        for r in range(4):
            if (c, r) in ex:
                out.append(rect((12.5 + c * 25, 12.5 + r * 25), 25, 25, 0, ex[(c, r)], 0.82, 0.01))
            elif (c, r) not in lit:
                out.append(rect((12.5 + c * 25, 12.5 + r * 25), 25, 25, 0, "#ff9a4a", 0.78, 0.01))
    return out


def gem(c, col="#e8180e"):
    return [rect(c, 6.5, 6.5, 0, col, 1.0, 0.3), rect(c, 7.5, 7.5, 0, "#ffffff", 0.05, 0.25)]


DIAG = [line((0, 100), (100, 0), DEEP, 0.9)]


def pe30():
    sh = tiles({(1, 0), (3, 0), (1, 2), (3, 2)}, [((1, 0), "#9a7a5a")]) + DIAG + gem((62, 38)) + gem((12, 88))
    sh += [label((87.5, 14), 1), label((87.5, 62), 2), label((37.5, 62), 3)]
    return board(sh, boss=[99, 1])


def pe31():
    sh = tiles({(0, 1), (2, 1), (0, 3), (2, 3)}, [((0, 1), "#9a7a5a")]) + DIAG + gem((87.5, 14)) + gem((37.5, 62))
    sh += [label((62.5, 38), 1), label((62.5, 88), 2), label((12.5, 88), 3)]
    return board(sh, boss=[99, 1])


def pe32():
    sh = tiles({(0, 1), (2, 1), (0, 3), (2, 3)}, [((0, 1), "#9a7a5a"), ((0, 3), "#8fb3ee"), ((2, 3), "#8fb3ee")]) + DIAG
    sh += gem((87.5, 14)) + gem((37.5, 62)) + gem((37.5, 88), "#9cc8ff")
    sh += [label((62.5, 38), 1), label((62.5, 88), 2), label((12.5, 88), 3)]
    return board(sh, boss=[99, 1])


def pe37():
    sh = []
    for p in ((50, 0), (0, 50), (100, 50), (50, 100)):
        sh += aoe(p, 25, 0.45)
    sh += [line((4, 4), (96, 96), DEEP, 0.6), line((96, 4), (4, 96), DEEP, 0.6)]
    return board(sh, roles(MT=(4, 4), H1=(96, 4), D1=(4, 96), D2=(96, 96)))


def ls():
    """The two orange L-shaped strips along the edge that Fableflight leaves (game8's picture)."""
    return [rect((25, 4.5), 50, 9, 0, LIGHT, 0.8, 0.01), rect((4.5, 29.5), 9, 41, 0, LIGHT, 0.8, 0.01),
            rect((75, 95.5), 50, 9, 0, LIGHT, 0.8, 0.01), rect((95.5, 70.5), 9, 41, 0, LIGHT, 0.8, 0.01)]


PH_NWES = [(50, 2.5), (1.5, 50), (98.5, 50), (50, 97.5)]


def phantoms(pts=PH_NWES):
    out = []
    for p in pts:
        out += [dot(p, 2.8, "#2a4fa8"), ring(p, 2.8, "#9cc3ff", 0.35, 0.9)]
    return out


R38 = roles(MT=(50, 25), H1=(29.5, 51), D1=(75, 51), D2=(50, 69))


def pe38():
    sh = ls() + phantoms() + [line((50, 2.5), (50, 25), DEEP, 0.5), line((1.5, 50), (29.5, 51), DEEP, 0.5),
                              line((98.5, 50), (75, 51), DEEP, 0.5), line((50, 97.5), (50, 69), DEEP, 0.5)]
    return board(sh, R38)


def tower(p):
    return [circle(p, 7, "#5a2410", 0.25, 0.01), ring(p, 7, "#8a3a18", 0.9, 0.9), dot(p, 1.4, "#fff2a0")]


def bluesq(p):
    return [rect(p, 4, 4, 0, "#1530e8", 1, 0.3)]


T39 = [(61, 12), (10, 38), (10, 62), (89, 63)]


def pe39():
    sh = ls() + phantoms() + [line((50, 2.5), (50, 25), DEEP, 0.5), line((1.5, 50), (29.5, 51), DEEP, 0.5),
                              line((98.5, 50), (75, 51), DEEP, 0.5), line((50, 97.5), (50, 69), DEEP, 0.5)]
    for p in T39:
        sh += tower(p)
    sh += bluesq((30, 44.5)) + bluesq((75.5, 44))
    return board(sh, R38)


R40 = roles(D2=(65, 16), H1=(15, 39), MT=(16, 63), D1=(89, 63))


def pe40():
    sh = ls() + phantoms() + [line((50, 2.5), (16, 63), DEEP, 0.5), line((50, 97.5), (65, 16), DEEP, 0.5),
                              line((1.5, 50), (15, 39), DEEP, 0.5), line((98.5, 50), (89, 63), DEEP, 0.5)]
    for p in T39:
        sh += tower(p)
    sh += bluesq((19.5, 32)) + bluesq((91.5, 57))
    return board(sh, R40)


def halfplane(p, q, col=LIGHT, o=0.85):
    """Everything beyond the line p-q, on the side away from the middle of the floor."""
    import math
    a = math.degrees(math.atan2(q[0] - p[0], -(q[1] - p[1])))
    m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    n = off(m, a + 90, 1)
    side = 90 if math.hypot(n[0] - 50, n[1] - 50) > math.hypot(m[0] - 50, m[1] - 50) else -90
    return rect(off(m, a + side, 60), 200, 120, a - 90, col, o, 0.01)


def _poly_nw(y0=50, x0=50):
    """game8's half-plane telegraph cutting the north-west corner (from (0, y0) to (x0, 0))."""
    import math
    a = math.degrees(math.atan2(x0, y0))
    m = (x0 / 2, y0 / 2)
    return rect(off(m, a - 90 - 180, 40), 160, 80, 90 - a, LIGHT, 0.85, 0.01)


def pe41():
    sh = [rect((4.5, 29.5), 9, 41, 0, LIGHT, 0.8, 0.01), halfplane((0, 51), (54, 0)), halfplane((60, 100), (100, 55))] + phantoms([(50, 2.5), (1.5, 50), (98.5, 52), (50, 97.5)])
    sh += [line((50, 2.5), (16, 63), DEEP, 0.5), line((50, 97.5), (65, 16), DEEP, 0.5)]
    for p in T39:
        sh += tower(p)
    sh += bluesq((19.5, 34)) + bluesq((91.5, 57))
    return board(sh, R40)


T42 = [(37, 15), (83, 38), (37, 88), (63, 88)]
R42 = roles(MT=(35, 15), D1=(84, 38), H1=(36, 88), D2=(62, 88))


def pe42():
    sh = [rect((25, 3.5), 50, 7, 0, LIGHT, 0.8, 0.01), rect((75, 96.5), 50, 7, 0, LIGHT, 0.8, 0.01)] + phantoms([(50, 3.5), (50, 97.5)])
    for p in T42:
        sh += tower(p)
    sh += bluesq((39, 9)) + bluesq((65.5, 81))
    return board(sh, R42)


def pe43():
    sh = [halfplane((0, 30), (54, 0)), halfplane((52, 100), (100, 52))] + phantoms([(52, 4), (50, 97)])
    for p in T42:
        sh += tower(p)
    sh += bluesq((38, 8)) + bluesq((67, 80.5))
    return board(sh, R42)


def pe44():
    sh = ls() + phantoms() + [line((50, 2.5), (50, 25), DEEP, 0.5), line((1.5, 50), (29.5, 51), DEEP, 0.5),
                              line((98.5, 50), (75, 51), DEEP, 0.5), line((50, 97.5), (50, 69), DEEP, 0.5)]
    sh += [arrow((44, 13), (37, 7), "#ffffff", 1.1), arrow((55, 87), (61, 93), "#ffffff", 1.1)]
    return board(sh, roles(MT=(50, 28), H1=(29.5, 51), D1=(75, 51), D2=(50, 71)))


def pe45():
    sh = tiles({(1, 1), (1, 3)}) + gem((12.5, 12.5)) + gem((88, 12.5)) + gem((62.5, 62.5)) + stack((27, 30), 5) + stack((45.5, 46), 5)
    return board(sh, roles(D2=(24, 31), H1=(30, 28), D1=(47, 43), MT=(44, 48)), boss=[51.5, 52])


def pe46():
    sh = tiles({(1, 1), (1, 3)}) + gem((12.5, 12.5)) + gem((88, 12.5)) + gem((62.5, 62.5)) + stack((27, 30), 5) + stack((47, 47), 5)
    return board(sh, roles(D2=(25, 31), D1=(31, 28), H1=(49, 44), MT=(45, 48)), boss=[51.5, 52])


SCENES = {k: v for k, v in globals().items() if k.startswith("pe") and k[2:].isdigit()}
