"""Darya the Sea-maid: every scene, redrawn from game8's 440x330 strategy-board pictures (frame 4:3).
Seats: game8 T = MT, H = H1, D1 = D1 (Melee), D2 = D2 (Range)."""
from scm import *

KY = 4 / 3                    # a width-% distance in height-% on a 4:3 frame
FLOOR = "#a3a4a7"
STONE = "#a9aaad"
# the flat board: a 5 x 5 grid
FX0, FY0, CW, CH = 18.5, 7.6, 12.56, 16.96
ARENA = {"shape": "square", "at": [49.9, 50], "w": 62.8, "h": 63.6, "fill": FLOOR, "lines": False, "edge": "#8b8c8f"}
# the stone board (Swimming in the Air, Sunken Treasure)
STONE_A = {"shape": "square", "at": [49.8, 51.2], "w": 68.5, "h": 67.2, "fill": STONE, "lines": False, "edge": "#ececec"}
WM = {"1": [24.8, 16], "A": [49.9, 16], "2": [75, 16.5], "D": [24.8, 50], "B": [73, 50], "4": [24.8, 85], "C": [49.9, 85.5], "3": [75, 84.5]}
WM_STONE = {"1": [20.5, 14], "A": [49.8, 13.5], "2": [79, 13], "D": [19.5, 51], "B": [79.5, 51], "4": [21, 88], "C": [49.6, 89.5], "3": [79.5, 89]}
BOSS = [49.9, 50]


def cell(c, r):
    return (FX0 + (c + 0.5) * CW, FY0 + (r + 0.5) * CH)


def colband(c, col=DEEP, o=0.92):
    return rect((FX0 + (c + 0.5) * CW, 50), CW, 63.6, 0, col, o, 0.01)


def rowband(r, col=DEEP, o=0.92):
    return rect((49.9, FY0 + (r + 0.5) * CH), 62.8, CH * 0.75, 0, col, o, 0.01)


def cellrect(c, r, col=WATER, o=0.85):
    return rect(cell(c, r), CW, CH * 0.75, 0, col, o, 0.01)


def creature(p, n):
    return [dot(p, 1.7, "#d9c8f3"), text((p[0] + 2.3, p[1] - 2.6), str(n), 2.6, "#efe6ff")]


def puffer(p):
    return [dot(p, 3, "#b3241c"), ring(p, 3, "#ff8f80", 0.3, 0.9)]


def chocobo(p):
    return [dot(p, 2.8, "#2a62d6"), ring(p, 2.8, "#9cc3ff", 0.3, 0.9)]


def family():
    """The sea creatures round the edge as game8 draws them (1 = first line, 2 = second)."""
    out = []
    for x, n in ((24.8, 1), (37.3, 2), (62.5, 2), (75, 1)):
        out += creature((x, 4.5), n)
    for y, n in ((16, 1), (67, 1)):
        out += creature((12, y), n)
    for y, n in ((33, 2), (84, 2)):
        out += creature((86, y), n)
    out += puffer((12, 50)) + puffer((87, 50)) + chocobo((49.9, 4)) + chocobo((49.9, 96))
    return out


def stk(c):
    return stack(c, 3.6, KY)


def flat(shapes, rl, wm=WM, boss=BOSS, **kw):
    s = {"frame": [4, 3], "iconSize": 7, "markSize": 6.6, "bossSize": 11.5, "arena": dict(ARENA), "waymarks": dict(wm), "shapes": shapes, "boss": list(boss), "roles": rl}
    s.update(kw)
    return s


def stone(shapes, rl, wm=WM_STONE, boss=(49.8, 51), **kw):
    s = {"frame": [4, 3], "iconSize": 7, "markSize": 6.6, "bossSize": 11.5, "arena": dict(STONE_A), "waymarks": dict(wm), "shapes": shapes, "boss": list(boss), "roles": rl}
    s.update(kw)
    return s


R4 = roles(MT=(29, 21), D1=(71, 19), D2=(25.5, 81), H1=(69.5, 80))


def da02():
    z = [rect((31.06, 24.56), 25.12, 25.44, 0, "#74aef0", 0.8, 0.01), rect((68.74, 24.56), 25.12, 25.44, 0, "#ebbd9f", 0.8, 0.01),
         rect((31.06, 75.44), 25.12, 25.44, 0, "#ebbd9f", 0.8, 0.01), rect((68.74, 75.44), 25.12, 25.44, 0, "#93df93", 0.8, 0.01)]
    return flat(z + family(), R4)


def da03():
    song = [text((39.5, 36.5), "♪", 3, "#ffffff")] + puffer((43.5, 37.5)) + creature((48, 37.5), 1) + chocobo((53, 37.5)) + creature((57.5, 37.5), 2)
    return flat(family() + song, R4)


def da04():
    rl = roles(MT=(33, 12), D1=(66, 12), D2=(33, 89), H1=(66, 89))
    sh = family() + aoe((12, 50), 37.5, 0.4) + aoe((87, 50), 37.5, 0.4)
    for p in ((33, 12), (66, 12), (33, 89), (66, 89)):
        sh += aoe(p, 17.5, 0.45)
    return flat(sh, rl)


def da05():
    sh = [colband(0), colband(4), rowband(0), rowband(3)] + family()
    return flat(sh, roles(MT=(33.5, 29.5), D1=(66.5, 30), D2=(38.5, 84), H1=(65.5, 83)))


def da06():
    rl = roles(MT=(21, 31), D1=(79, 31), D2=(21, 74), H1=(79, 74))
    sh = family() + [cone((49.9, 4), 180, 72, 76, ORANGE, 0.4), cone((49.9, 96), 0, 72, 76, ORANGE, 0.4)]
    for p in ((21, 31), (79, 31), (21, 74), (79, 74)):
        sh += aoe(p, 19, 0.42)
    return flat(sh, rl)


def da07():
    sh = [colband(1), colband(3), rowband(1), rowband(4)] + family()
    sh += [cone(BOSS, 315, 90, 19, "#ffb35c", 0.75, 0.3), cone(BOSS, 135, 90, 19, "#ffb35c", 0.75, 0.3)]
    return flat(sh, roles(MT=(25, 19), D1=(75, 19), D2=(25, 69), H1=(75, 69)))


def _no12():
    return {k: v for k, v in WM.items() if k not in ("1", "2")}


def da08():
    sh = [cone(BOSS, 315, 90, 44, ORANGE, 0.42), cone(BOSS, 135, 90, 44, ORANGE, 0.42),
          cone(BOSS, 45, 90, 19, ORANGE, 0.5), cone(BOSS, 225, 90, 19, ORANGE, 0.5)]
    sh += hexnum((33, 21), 1) + hexnum((70, 74), 1) + hexnum((56, 37), 2) + hexnum((43, 56), 2)
    return flat(sh, roles(MT=(27, 55), D2=(37, 62), D1=(66, 29), H1=(71, 40)), wm=_no12())


def da09():
    sh = [cone(BOSS, 45, 90, 44, ORANGE, 0.42), cone(BOSS, 225, 90, 44, ORANGE, 0.42)]
    sh += hexnum((71, 22), 2) + hexnum((33, 71), 2)
    return flat(sh, roles(MT=(36, 37), D2=(42, 37), H1=(60, 57), D1=(60, 64)), wm=_no12())


MARKS11 = [(24.5, 17.5), (49.6, 17.5), (24.5, 50.5), (74.5, 50.5), (49.6, 51), (24.5, 84), (49.6, 84)]


def _marks():
    out = []
    for p in MARKS11:
        out += burst(p, 2.3)
    return out


def da11():
    sh = _marks()
    for a, b in (((34, 17.5), (42, 17.5)), ((58, 17.5), (66, 17.5)), ((24.5, 36), (24.5, 27)), ((24.5, 71), (24.5, 62)),
                 ((38, 82), (31, 82)), ((63.5, 69), (58.5, 76)), ((60.5, 51), (68.5, 51))):
        sh.append(arrow(a, b, "#ffffff", 1.1))
    sh += hexnum((75, 18), 2) + hexnum((75, 84), 1)
    sh += stk((43.5, 38.5)) + stk((53, 38.5))
    return stone(sh, roles(MT=(43.5, 38.5), H1=(53, 38.5), D2=(41, 62), D1=(59, 58)))


def da12():
    sh = _marks() + hexnum((75, 18), 2) + hexnum((75, 84), 1) + stk((49.5, 38.5)) + stk((50.5, 67))
    return stone(sh, roles(H1=(49.5, 38.5), D2=(53, 44), MT=(50.5, 67), D1=(48.5, 71)))


def da13():
    sh = []
    for p in MARKS11:
        sh += aoe(p, 18.5, 0.42)
    sh += _marks() + stk((75, 16)) + stk((75, 85))
    return stone(sh, roles(H1=(73.5, 14), D2=(76.5, 17), MT=(73.5, 84), D1=(76.5, 86.5)))


def _diag(rl):
    out = []
    for p in rl.values():
        out += burst((p[0], p[1] - 7), 2.5)
    return out


def da14():
    rl = roles(H1=(33, 27.5), MT=(40, 38.5), D1=(60, 62), D2=(71.5, 80.5))
    return flat([colband(0, DEEP, 0.55), rowband(0, DEEP, 0.55)] + _diag(rl), rl)


def da15():
    rl = roles(H1=(24, 17), MT=(48, 44), D1=(59.5, 62), D2=(71, 80.5))
    return flat([colband(1, DEEP, 0.85), rowband(1, DEEP, 0.85)] + _diag(rl), rl)


def da16():
    rl = roles(H1=(29, 20), MT=(39.5, 32), D1=(59, 63), D2=(71, 82))
    sh = [colband(2, DEEP, 0.85), rowband(2, DEEP, 0.55), cone(BOSS, 270, 90, 44, ORANGE, 0.4), cone(BOSS, 90, 90, 44, ORANGE, 0.4)]
    for c, r in ((0, 0), (1, 1), (3, 3), (4, 4)):
        sh += [colband(c, "#a9ecf6", 0.42), rowband(r, "#a9ecf6", 0.42)]
    return flat(sh, rl)


def da17():
    sh = [cone(BOSS, 0, 90, 46, ORANGE, 0.4), cone(BOSS, 180, 90, 46, ORANGE, 0.4), colband(3, DEEP, 0.85), rowband(3, DEEP, 0.85)]
    return flat(sh, roles(H1=(21, 20), MT=(36, 39), D1=(54, 55), D2=(75, 81)))


def da18():
    return flat([colband(4, DEEP, 0.9), rowband(4, DEEP, 0.9)], roles(H1=(35, 26), MT=(43, 41), D1=(51, 56), D2=(63, 67)))


CORN = [(24.5, 18), (75, 18), (24.5, 84), (75, 84)]
BALLS = [(24.5, 50.5), (75, 50.5)]


def _objects(frozen=()):
    out = []
    for i, p in enumerate(CORN):
        out.append(donut(p, 7, 3.3, ORANGE, 0.75))
    for p in BALLS:
        out += aoe(p, 6, 0.6)
    for p in frozen:
        out += xmark(p, 2.2, KY)
    return out


def da19():
    return stone(_objects(), roles(D1=(45, 38), MT=(50, 36), H1=(55, 37), D2=(60, 40)), wm={})


FROZ = CORN + [BALLS[1]]


def da20():
    sh = _objects(FROZ) + stk((41, 43)) + stk((41, 54))
    return stone(sh, roles(MT=(41, 43), H1=(41, 54), D1=(48, 37), D2=(55, 40)), wm={})


def da21():
    sh = _objects(FROZ) + [cone((49.8, 51), 270, 64, 21, ORANGE, 0.45), cone((49.8, 51), 90, 64, 21, ORANGE, 0.45)]
    sh += stk((26, 15.5)) + stk((26, 84))
    return stone(sh, roles(H1=(25, 14), D2=(28, 17), MT=(25, 83), D1=(28, 86)), wm={})


def da22():
    sh = []
    for p in CORN:
        sh.append(donut(p, 34, 5.5, ORANGE, 0.4))
    sh += aoe(BALLS[1], 27, 0.42)
    sh += [cone((49.8, 51), 270, 64, 46, ORANGE, 0.35), cone((49.8, 51), 90, 64, 46, ORANGE, 0.35)]
    sh += xmark(CORN[1], 2.2, KY) + xmark(CORN[3], 2.2, KY) + stk((26, 14)) + stk((26, 85))
    return stone(sh, roles(H1=(25, 12.5), D2=(28, 16.5), D1=(24.5, 86), MT=(28, 84)), wm={})


def da23():
    sh = [cone((49.8, 52), 0, 90, 46, ORANGE, 0.4), cone((49.8, 52), 180, 90, 46, ORANGE, 0.4)] + aoe((26, 47), 6.5, 0.6) + xmark((26, 47), 2.2, KY)
    return stone(sh, roles(D2=(33, 32), MT=(41, 42), D1=(41, 55), H1=(30, 72)), wm={}, boss=(49.8, 52))


def da24():
    sh = aoe((28, 52), 33, 0.45)
    return stone(sh, roles(D2=(68, 27), MT=(68, 51), D1=(67, 63), H1=(65, 79)), wm={}, boss=(61, 51))


CHECK = [(0, 0), (4, 0), (1, 1), (3, 1), (2, 2), (1, 3), (3, 3), (0, 4), (4, 4)]
WM_ABCD = {k: WM[k] for k in ("A", "B", "C", "D")}


def _checker():
    return [cellrect(c, r) for c, r in CHECK]


def crossmark(c):
    """The green cross marker game8 draws over a player (a cross AoE comes out of them)."""
    return [circle(c, 1.9, "#1f7a2e", 0.85, 0.01), ring(c, 1.9, "#7dff8c", 0.35, 0.95),
            line((c[0] - 1.2, c[1]), (c[0] + 1.2, c[1]), "#e9ffe9", 0.45), line((c[0], c[1] - 1.6), (c[0], c[1] + 1.6), "#e9ffe9", 0.45)]


def _puddle(c, r):
    x, y = cell(c, r)
    hw, hh = CW / 2 - 0.5, CH / 2 - 0.7
    out = [rect((x, y), CW - 1, CH * 0.75 - 1, 0, "#9a9a9a", 0.9, 0.01)] + frame_box(x - hw, y - hh, x + hw, y + hh, "#fff7e0", 0.7)
    for k in (0.62, 0.36):
        out += frame_box(x - hw * k, y - hh * k, x + hw * k, y + hh * k, "#bfe9ff", 0.45)
    return out


PUD = [(3, 0), (0, 1), (4, 1), (3, 4)]


def da25():
    rl = roles(MT=(62.5, 18), H1=(25, 34), D1=(75, 34), D2=(62.5, 86))
    sh = _checker()
    for p in rl.values():
        sh += burst((p[0], p[1] - 7), 2.5)
    return flat(sh, rl, wm=WM_ABCD)


def da26():
    sh = _checker()
    for c, r in PUD:
        sh += _puddle(c, r)
    for p in ((37, 15), (44.5, 13), (48.5, 19), (24.5, 52), (31, 50), (37, 50), (75.5, 50), (76, 58), (76, 66), (48.5, 67), (48, 76), (47, 85)):
        sh += aoe(p, 6, 0.55)
    rl = roles(MT=(50, 34), D1=(62.5, 51), H1=(25, 68), D2=(37.3, 84))
    for p in rl.values():
        sh += crossmark((p[0], p[1] - 5.5))
    return flat(sh, rl, wm=WM_ABCD)


def da27():
    sh = _checker()
    for c, r in PUD:
        sh += _puddle(c, r)
    G, Rd = "#3ccf4e", "#e8442e"
    for a, b, c in (((48, 13), (38, 13), G), ((40, 17), (48, 37), G), ((52, 30), (52, 13), G),
                    ((37, 47), (24, 47), G), ((21, 52), (22, 69), G), ((25, 70), (37, 55), G),
                    ((65, 47), (78, 47), Rd), ((77, 55), (77, 65), Rd), ((75, 65), (65, 55), Rd),
                    ((48, 64), (37, 80), Rd), ((52, 65), (53, 82), Rd), ((48, 84), (37, 84), Rd)):
        sh.append(arrow(a, b, c, 0.8))
    return flat(sh, roles(MT=(50, 25), H1=(30, 52), D1=(72, 52), D2=(49.5, 76)), wm=WM_ABCD)


CORN2 = [(24.8, 16), (75, 16), (24.8, 84), (75, 84)]
BALL2 = [(37.3, 33), (62.5, 33), (37.3, 67), (62.5, 67)]
WM_ABC = {k: WM[k] for k in ("A", "B", "C")}


def _obj2(frozen=(), skip=()):
    out = []
    for p in CORN2:
        if p in skip:
            continue
        out.append(donut(p, 5.2, 2.6, ORANGE, 0.75))
    for p in BALL2:
        out += aoe(p, 6, 0.55)
    for p in frozen:
        out += xmark(p, 2.2, KY)
    return out


def da28():
    sh = _obj2() + [line((46.5, 38), (54, 36), GREEN, 0.8), line((46, 60), (55, 61.5), GREEN, 0.8)]
    sh += burst((45, 33), 1.9) + burst((56.5, 56), 1.9)
    return flat(sh, roles(H1=(46.5, 38.5), MT=(54, 36.5), D1=(46, 60), D2=(55, 61.5)), wm=WM_ABC)


FZ2 = [CORN2[0], CORN2[2], BALL2[0], BALL2[2]]


def da29():
    sh = _obj2(FZ2)
    for x in (57, 61, 65):
        sh += aoe((x, 16), 5, 0.5) + aoe((x + 1, 84), 5, 0.5)
    sh += burst((78, 12.5), 1.9) + burst((77, 82), 1.9)
    return flat(sh, roles(D1=(73.5, 16), D2=(77.5, 17), H1=(74, 85), MT=(77.5, 86)), wm=WM_ABC)


def da30():
    sh = []
    for p in CORN2:
        sh.append(donut(p, 34, 6.5, ORANGE, 0.38))
    for p in (BALL2[0], BALL2[2]):
        sh += aoe(p, 27, 0.4)
    sh += xmark(BALL2[1], 1.8, KY) + xmark(BALL2[3], 1.8, KY)
    sh += [line((72, 18), (76.5, 18), GREEN, 0.8), line((72, 84), (77, 84), GREEN, 0.8)]
    return flat(sh, roles(D1=(72, 18), D2=(76.5, 18), H1=(72, 84), MT=(77, 84)), wm={})


def da31():
    sh = aoe(BALL2[1], 27, 0.42) + aoe(BALL2[3], 27, 0.42)
    sh += [line((25, 23), (31.5, 21), GREEN, 0.8), line((27, 79), (33, 81), GREEN, 0.8)]
    return flat(sh, roles(D1=(25, 23), D2=(31.5, 21), MT=(27, 79), H1=(33, 81)), wm=WM_ABC)


def da32():
    froz = [CORN2[0], CORN2[1], BALL2[0], BALL2[3], CORN2[2], CORN2[3]]
    sh = _obj2(froz) + [line((75, 16), (25, 75), TBLUE, 1.1), line((23.5, 80), (28, 80), GREEN, 0.8)]
    sh += burst((79, 11), 1.9) + burst((29.5, 77), 1.9)
    return flat(sh, roles(D2=(75, 16.5), H1=(24.5, 75), MT=(23.5, 80.5), D1=(28, 80.5)), wm=WM_ABC)


def da33():
    sh = _obj2(FZ2, skip=(CORN2[1], CORN2[3])) + [line((72.5, 17), (76.5, 85), TBLUE, 1.0), line((76.5, 17), (72.5, 85), TBLUE, 1.0)]
    sh += burst((72.5, 13.5), 1.9) + burst((72.5, 81.5), 1.9)
    return flat(sh, roles(D1=(72.5, 17), D2=(76.5, 17), H1=(72.5, 85), MT=(76.5, 85)), wm=WM_ABC)


def setup():
    """game8's waymarks, as its Darya pictures have them."""
    return flat([], {}, boss=BOSS)


SCENES = {k: v for k, v in globals().items() if k.startswith("da") and k[2:].isdigit()}
