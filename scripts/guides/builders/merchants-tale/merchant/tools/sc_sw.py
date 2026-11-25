"""Lone Swordmaster: every scene, redrawn from game8's pictures.
sw-02..12: the stone strategy board, 440x330 (frame 4:3). sw-13..35: game8's own schematic of the arena, square.
In the schematic, players are drawn as game8 draws them: a disc in four quarters, red where game8 colours it."""
from scm import *

KY = 4 / 3
STONE = "#a9aaad"
BOARD = {"shape": "square", "at": [49.75, 52.5], "w": 62.5, "h": 61.5, "fill": STONE, "lines": False, "edge": "#ececec"}
WM = {"1": [23.5, 19], "2": [75, 18], "4": [23.5, 87], "3": [74.5, 87], "A": [49, 43], "D": [43.5, 52], "B": [49.4, 52], "C": [49, 61]}
BOSS = [49.5, 48]
FLOOR = "#ab8a6c"
SHELF = "#e39a35"
SHELF_RED = "#cd6a49"
PALE = "#ffe08a"
GA = "#1f9d55"
PINK = "#e0458f"
SQ = {"shape": "square", "at": [50, 50], "w": 79, "h": 79, "fill": FLOOR, "lines": False, "edge": "#3a2a1c"}


def board(shapes, rl, wm=WM, boss=BOSS, **kw):
    s = {"frame": [4, 3], "iconSize": 6.6, "markSize": 5.6, "bossSize": 10.5, "arena": dict(BOARD), "waymarks": dict(wm),
         "shapes": shapes, "boss": (list(boss) if boss else None), "roles": rl}
    s.update(kw)
    return s


def omen_ring(p):
    return ring(p, 4.2, "#f0a050", 0.35, 0.8)


# ---------------------------------------------------------------- sw-02: Near to Heaven / Far from Heaven (two small boards)
def _mini(cx, top, swords, dice, nothing_at):
    """One small board of game8's picture: cx = its centre x, A/B/C/D up the middle, the boss to the NE."""
    w, h = 45, 45
    cy = top + h * KY / 2
    sh = [rect((cx, cy), w, h, 0, STONE, 1, 0.01)] + frame_box(cx - w / 2, top, cx + w / 2, top + h * KY, "#ececec", 0.5)
    wm = {"A": (cx - 1.5, cy - 7), "B": (cx - 1, cy + 2.5), "D": (cx - 7.5, cy + 3), "C": (cx - 1, cy + 13)}
    marks = [text((cx - 20.5, top + 5), "1", 3.6, "#ff6d8a"), text((cx + 20.5, top + 5), "2", 3.6, "#ffe066"),
             text((cx - 20.5, top + 55), "4", 3.6, "#ffffff"), text((cx + 20.5, top + 55), "3", 3.6, "#7fc8ff")]
    for k, p in wm.items():
        col = {"A": "#ff6d8a", "B": "#ffe066", "C": "#7fc8ff", "D": "#ffffff"}[k]
        marks.append(text(p, k, 3.0, col))
    a, b = dice
    marks += hexnum((wm["A"][0] + 1.5, wm["A"][1] - 1), a, 2.2) + hexnum((wm["B"][0] + 0.5, wm["B"][1] - 3), b, 2.2)
    # the marked player (game8's red target marker) on C, and the "nothing" player
    marks += [dot((wm["C"][0], wm["C"][1] - 2.5), 1.8, "#b3241c"), ring((wm["C"][0], wm["C"][1] - 2.5), 1.8, "#ffb0a0", 0.3)]
    nx, ny = wm[nothing_at]
    marks += [ring((nx - 3, ny + (2 if nothing_at == "C" else 0)), 1.6, "#ffffff", 0.35)]
    for i in range(swords):
        sx = cx + 10 + i * 4.2 - (swords - 1) * 2.1
        marks += [rect((sx, cy - 3), 3.4, 3.4, 0, "#5a2a22", 1, 0.2), line((sx - 1.2, cy - 1.4), (sx + 1.2, cy - 4.6), "#f3d9b0", 0.4)]
    marks += [cone((cx + 10, cy + 1), 180, 90, 3.5, "#ff9b3d", 0.6, 0.2)]
    return sh + marks


def sw02():
    sh = _mini(25.5, 17, 1, (1, 2), "D") + _mini(75, 17, 2, (2, 1), "C")
    # the legend: one sword = nothing goes to D, two swords = nothing goes to C
    for k, n in ((0, 1), (1, 2)):
        y = 86 + k * 9
        for i in range(n):
            sx = 19 - i * 4.5
            sh += [rect((sx, y), 3.6, 3.6, 0, "#5a2a22", 1, 0.2), line((sx - 1.2, y + 1.8), (sx + 1.2, y - 1.8), "#f3d9b0", 0.4)]
        sh += [arrow((24, y), (31, y), "#ffffff", 0.45), text((34.5, y), "D" if n == 1 else "C", 3.2, "#ffffff" if n == 1 else "#7fc8ff")]
    return {"frame": [4, 3], "arena": None, "waymarks": None, "bossSize": 5, "boss": [[36, 37.5], [86, 37.5]], "roles": {}, "shapes": sh, "iconSize": 4}


def sw03():
    rl = roles(H1=(44, 69), MT=(56.5, 71), D1=(36, 81.5), D2=(60.5, 89.5))
    sh = [cone(BOSS, 270, 76, 43, ORANGE, 0.4), cone(BOSS, 90, 76, 43, ORANGE, 0.4)] + [omen_ring(p) for p in rl.values()]
    return board(sh, rl, wm={})


def _slash(x0, y0, x1, y1):
    return rect(((x0 + x1) / 2, (y0 + y1) / 2), abs(x1 - x0) or 3.2, (abs(y1 - y0) or 4.3) * 0.75, 0, DEEP, 0.6, 0.01)


def sw04():
    rl = roles(MT=(56.5, 29), H1=(42.5, 34), D1=(43.5, 70), D2=(56.5, 62.5))
    sh = [_slash(55, 50, 81, 54.5), _slash(54.5, 44, 57.5, 80), _slash(18.5, 76, 57.5, 80.5)]
    sh += [line((49.5, 47), (55.5, 34), "#ff8a1f", 0.6), line((49.5, 49), (56, 58), "#ff8a1f", 0.6)]
    sh += [cone((55.5, 37.5), 180, 70, 1.8, "#2fd3a0", 0.9, 0.2), cone((56, 56.5), 180, 70, 1.8, "#2fd3a0", 0.9, 0.2)]
    sh += [omen_ring(p) for p in rl.values()]
    return board(sh, rl, wm={})


def sw05():
    rl = roles(H1=(49.5, 33), MT=(60.5, 40), D1=(52.5, 72), D2=(57, 92))
    sh = [_slash(58, 44, 61, 55), _slash(58, 50, 81, 55), _slash(18.5, 78, 58, 82.5)]
    sh += [line((49.5, 45), (50, 37), "#ff8a1f", 0.6), line((50, 51), (52, 66), "#ff8a1f", 0.6)]
    sh += [cone((50, 37.5), 180, 70, 1.8, "#2fd3a0", 0.9, 0.2), cone((51.5, 64.5), 180, 70, 1.8, "#2fd3a0", 0.9, 0.2)]
    sh += [omen_ring(p) for p in rl.values()]
    return board(sh, rl, wm={})


def sw06():
    return board(aoe((49, 61), 6.5, 0.85), {}, boss=None)


def sw07():
    return board([donut((49, 61), 50, 6.5, ORANGE, 0.85)], {}, boss=None)


def sw08():
    sh = []
    for a in (0, 45, 90, 135):
        sh.append(rect((49, 61), 6.5, 84, a, DEEP, 0.78, 0.01))
    return board(sh, {}, boss=None)


def sw09():
    sh = []
    xs, ys = (27.5, 49.5, 72), (23, 52.5, 83)
    for x in xs:
        for y in ys:
            sh += aoe((x, y), 12.5, 0.4)
    for x, n in zip(xs, (2, 1, 3)):
        for y in ys:
            sh += hexnum((x + 2, y - 1), n, 2.0)
    return board(sh, roles(MT=(68.5, 47), H1=(68.5, 54), D1=(70.5, 51), D2=(66.5, 51)), boss=(49.5, 52.5))


def sw10():
    rl = roles(MT=(24, 20), D1=(73, 20), H1=(24, 82), D2=(73, 82))
    sh = []
    for p in rl.values():
        sh += aoe(p, 13.5, 0.45)
    return board(sh, rl, boss=None)


def sw11():
    sh = []
    for p in ((24, 20), (73, 20), (24, 82), (73, 82)):
        sh += [rect(p, 6.5, 120, 0, DEEP, 0.75, 0.01), rect(p, 75, 6.5 , 0, DEEP, 0.75, 0.01)]
    sh += [rect((49, 51), 6.5, 120, 53, DEEP, 0.75, 0.01), rect((49, 51), 6.5, 120, -53, DEEP, 0.75, 0.01)]
    return board(sh, roles(MT=(35, 49.5), H1=(35, 54), D1=(62, 51.5), D2=(63.5, 55)), boss=None)


def sw12():
    sh = [cone((50, 51), 135, 180, 50, ORANGE, 0.42)]
    return board(sh, roles(D1=(42, 34), D2=(40.5, 41), MT=(35.5, 48), H1=(35.5, 53)), boss=(51, 51))


# ---------------------------------------------------------------- the square schematic
def disc(c, red, r=4.0, o=1.0):
    out = []
    for k, a in (("N", 0), ("E", 90), ("S", 180), ("W", 270)):
        out.append(cone(c, a, 90, r, "#d9481f" if k in red else "#f3e7da", o, 0.01))
    out += [ring(c, r, "#4a3a30", 0.3, 0.9 * o), line(off(c, 45, r), off(c, 225, r), "#1b1b1b", 0.35, o), line(off(c, 135, r), off(c, 315, r), "#1b1b1b", 0.35, o)]
    return out


def pinwheel(col=SHELF, o=0.95):
    out = [rect((19, 30), 17, 39, 0, col, o, 0.15), rect((69.5, 18.5), 40, 16, 0, col, o, 0.15),
           rect((81, 69.5), 17, 40, 0, col, o, 0.15), rect((30, 81), 39, 17, 0, col, o, 0.15)]
    out += [line((49.5, 10.5), (49.5, 89.5), "#3a2a1c", 0.3, 0.8), line((10.5, 49.5), (89.5, 49.5), "#3a2a1c", 0.3, 0.8)]
    return out


def emitters(big=True):
    out = []
    for p, d in (((36, 1.5), 180), ((98.5, 37), 270), ((63.5, 98.5), 0), ((1.5, 62.5), 90)) if big else ():
        out.append(cone(p, d, 150, 5.5, PINK, 0.85, 0.2))
    return out


def sq(shapes, wm_a=True, boss=(49.5, 50), **kw):
    s = {"frame": [1, 1], "bg": "#2a2a2e", "arena": dict(SQ), "waymarks": ({"A": [50, 2.5]} if wm_a else None), "shapes": shapes,
         "boss": list(boss) if boss else None, "roles": {}, "markSize": 5, "bossSize": 9}
    s.update(kw)
    return s


def tube(p0, p1, w=5):
    cx, cy = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    if abs(p1[0] - p0[0]) > abs(p1[1] - p0[1]):
        return rect((cx, cy), abs(p1[0] - p0[0]), w, 0, "#ece7de", 0.62, 0.15)
    return rect((cx, cy), w, abs(p1[1] - p0[1]), 0, "#ece7de", 0.62, 0.15)


D13 = [((49.5, 36), "EW"), ((38, 58), "NS"), ((49.5, 62), "NS"), ((59, 58), "EW")]
D14 = [((49.5, 36), "EW"), ((40, 63), "NS"), ((49.5, 60.5), "NS"), ((59.5, 64), "EW")]


def _discs(lst, r=4.0):
    out = []
    for p, red in lst:
        out += disc(p, red, r)
    return out


def sw13():
    return sq(pinwheel() + _discs(D13))


def sw14():
    return sq(pinwheel() + [cone((49.5, 50), 270, 90, 75, PALE, 0.55), cone((49.5, 50), 90, 90, 75, PALE, 0.55)] + _discs(D14))


def sw15():
    sh = pinwheel() + [cone((49.5, 50), a, 90, 75, PALE, 0.55) for a in (0, 90, 180, 270)]
    return sq(sh + _discs(D14))


def sw16():
    sh = pinwheel() + emitters()
    sh += [tube((52.5, 5), (52.5, 38)), tube((4, 43.5), (46, 43.5)), tube((49, 57), (95, 57)), tube((43, 62), (43, 96))]
    sh += _discs([((51, 40), "EW"), ((37.5, 51), "NS"), ((59.5, 51), "NS"), ((49, 63), "EW")])
    for a, b in (((55, 40), (49, 40)), ((37.5, 56), (37.5, 51)), ((45, 52), (54, 52)), ((49.5, 46), (49.5, 54)), ((49.5, 55), (49.5, 61))):
        sh.append(arrow(a, b, GA, 0.6))
    return sq(sh)


def sw17():
    sh = pinwheel() + emitters()
    sh += [tube((55, 6), (55, 63)), tube((4, 44), (52, 44)), tube((47, 58), (94, 58)), tube((45, 37), (45, 96))]
    sh += _discs([((44, 18), "EW"), ((82, 43), "NS"), ((21, 61), "NS"), ((63, 82), "EW")])
    for a, b in (((44, 47), (44, 26)), ((52, 44), (76, 44)), ((50, 60), (28, 60)), ((60, 64), (60, 77))):
        sh.append(arrow(a, b, GA, 0.6))
    return sq(sh)


def sw18():
    sh = pinwheel(SHELF_RED) + emitters()
    sh += [tube((55, 6), (55, 63)), tube((4, 44), (52, 44)), tube((47, 58), (94, 58)), tube((45, 37), (45, 96))]
    for p in ((44, 18), (82, 43), (21, 61), (63, 82)):
        sh += aoe(p, 10.5, 0.75)
    sh += _discs([((44, 18), "EW"), ((82, 43), "NS"), ((21, 61), "NS"), ((63, 82), "EW")])
    for a, b in (((44, 47), (44, 26)), ((52, 44), (76, 44)), ((50, 60), (28, 60)), ((60, 64), (60, 77))):
        sh.append(arrow(a, b, GA, 0.6))
    return sq(sh)


LEFT4 = [(33, 17), (88, 41), (16.5, 59), (59, 83)]


def sw19():
    sh = pinwheel(SHELF_RED)
    for p in LEFT4:
        sh += aoe(p, 13.5, 0.8)
    s = sq(sh, wm_a=False, boss=(35, 56))
    s["waymarks"] = {"D": [36, 49]}
    s["roles"] = roles(H1=(50, 36), MT=(50, 49), D1=(48.5, 61.5), D2=(51.5, 62.5))
    s["iconSize"] = 5
    return s


def sw20():
    sh = []
    # three small examples of the rule, as game8 draws them (no arena)
    for (bx, by), tubes_, arrow_, active in (
            ((50, 20), [((24, 14), (50, 14)), ((50, 14), (50, 33))], ((50, 17), (50, 30)), (50, 35)),
            ((25, 64), [((5, 56), (20, 56)), ((19, 56), (19, 69))], ((19, 59), (19, 67)), (25, 77)),
            ((75, 64), [((70, 66), (84, 66)), ((84, 47), (84, 66))], ((78, 66), (66, 66)), (75, 77))):
        for dx, dy in ((0, -9), (-9, 0), (9, 0)):
            sh += disc((bx + dx, by + dy), "", 3.6, 0.35)
        sh += disc(active, "S", 4.0)
        for a, b in tubes_:
            sh.append(tube(a, b, 4.5))
        sh.append(arrow(arrow_[0], arrow_[1], GA, 0.6))
    s = {"frame": [1, 1], "bg": "#2a2a2e", "arena": None, "waymarks": None, "shapes": sh,
         "boss": [[50, 21], [25, 65], [75, 65]], "roles": {}, "bossSize": 8}
    return s


D21 = [((36, 43), "NW"), ((38, 53), "SW"), ((60, 47), "NE"), ((63, 56), "SE")]


def _x4():
    return [line((10.5, 10.5), (89.5, 89.5), "#ffe066", 0.25, 0.8), line((89.5, 10.5), (10.5, 89.5), "#ffe066", 0.25, 0.8)]


def sw21():
    sh = pinwheel(SHELF_RED) + [cone((49.5, 50), a, 90, 75, PALE, 0.5) for a in (0, 180)] + _x4()
    for p in [(33, 17), (85, 41), (16.5, 59), (59, 83)]:
        sh += aoe(p, 13.5, 0.75)
    return sq(sh + _discs(D21), wm_a=False)


def sw22():
    sh = pinwheel(SHELF_RED) + [cone((49.5, 50), a, 90, 75, PALE, 0.5) for a in (0, 90, 180, 270)] + _x4()
    for p in [(33, 17), (85, 41), (16.5, 59), (59, 83)]:
        sh += aoe(p, 13.5, 0.75)
    return sq(sh + _discs([((37, 43), "NW"), ((39, 52), "SW"), ((60, 47), "NE"), ((64, 56), "SE")]), wm_a=False)


def sw23():
    sh = pinwheel(SHELF_RED) + [cone((49.5, 50), a, 90, 75, PALE, 0.5) for a in (270, 90)] + _x4()
    for p in [(33, 17), (85, 41), (16.5, 59), (59, 83)]:
        sh += aoe(p, 13.5, 0.75)
    return sq(sh + _discs([((44, 57), "NW"), ((52, 55), "NE"), ((46, 66), "SW"), ((54, 63), "SE")]), wm_a=False, boss=(49.5, 48))


def sw24():
    sh = pinwheel(SHELF_RED) + [rect((70, 50), 39.5, 79, 0, PALE, 0.5, 0.01)]
    for p in [(33, 17), (85, 41), (16.5, 59), (59, 83)]:
        sh += aoe(p, 13.5, 0.75)
    return sq(sh + _discs([((36, 46), "NW"), ((44, 45), "NE"), ((38, 56), "SW"), ((46, 54), "SE")]), wm_a=False, boss=(53, 49.5))


def _fading():
    out = []
    for p in [(33, 17), (85, 41), (16.5, 59), (59, 83)]:
        out += [circle(p, 13.5, "#ffd08a", 0.45, 0.01), ring(p, 13.5, "#ffe6b0", 0.3, 0.7)]
    return out


def _out_arrows(pts):
    out = []
    for (x, y) in pts:
        sx = -1 if x < 50 else 1
        sy = -1 if y < 50 else 1
        out += [arrow((x + sx * 5, y), (x + sx * 11, y), GA, 0.5, 0.8), arrow((x, y + sy * 5), (x, y + sy * 11), GA, 0.5, 0.8)]
    return out


def sw25():
    pts = [(42, 39), (58, 40), (41, 59), (58, 59)]
    sh = pinwheel(SHELF_RED) + _fading() + _out_arrows(pts)
    return sq(sh + _discs([(pts[0], "NE"), (pts[1], "NW"), (pts[2], "NE"), (pts[3], "NW")]), wm_a=False, boss=None)


def sw26():
    pts = [(42, 39), (58, 40), (41, 59), (58, 59)]
    sh = pinwheel(SHELF_RED) + _fading() + _out_arrows(pts)
    for p in pts:
        sh.append(line((49.5, 50), p, "#ff6fb3", 0.4))
    sh += _discs([(pts[0], "NE"), (pts[1], "NW"), (pts[2], "NE"), (pts[3], "NW")])
    for p, a in zip(pts, (135, 225, 45, 315)):
        sh.append(cone(p, a, 90, 4.0, "#8bc34a", 1.0, 0.01))
    return sq(sh, wm_a=False, boss=None)


def sw27():
    sh = [rect((50, 50), 79, 79, 0, SHELF_RED, 0.9, 0.01), rect((50, 50), 45, 79, 0, "#e9a640", 0.9, 0.01), rect((50, 50), 79, 45, 0, "#e9a640", 0.9, 0.01)]
    for v in (27.5, 50, 72.5):
        sh += [line((v, 10.5), (v, 89.5), "#f6d27a", 0.25, 0.9), line((10.5, v), (89.5, v), "#f6d27a", 0.25, 0.9)]
    sh += [cone((37, 1.5), 180, 150, 5.5, PINK, 0.85, 0.2), cone((98.5, 41), 270, 150, 5.5, PINK, 0.85, 0.2),
           cone((1.5, 62.5), 90, 150, 5.5, PINK, 0.85, 0.2), cone((63, 98.5), 0, 150, 5.5, PINK, 0.85, 0.2)]
    for a, b in (((62, 81), (62, 15)), ((79, 39), (12, 39)), ((37, 18), (37, 86)), ((20, 63), (88, 63))):
        sh.append(arrow(a, b, GA, 0.55))
    sh += _discs([((37, 14), "SW"), ((83, 39), "NW"), ((16, 64), "NE"), ((62, 86), "SE")])
    return sq(sh, wm_a=False, boss=None)


def sw28():
    sh = [rect((50, 50), 100, 100, 0, PALE, 0.55, 0.01)] + pinwheel(SHELF_RED) + _x4()
    sh += _out_arrows([(37, 37), (63, 37), (37, 63), (63, 63)])
    sh += _discs([((49.5, 38), "NEW"), ((37, 50), "NSW"), ((62, 50), "NSE"), ((49.5, 63), "SEW")])
    return sq(sh, wm_a=False, boss=None)


GRID4 = [line((50, 10.5), (50, 89.5), "#1b1b1b", 0.35), line((10.5, 50), (89.5, 50), "#1b1b1b", 0.35)]
ROCKS = [(63, 37), (35.5, 64)]


def rocks():
    out = []
    for p in ROCKS:
        out += [circle(p, 5, "#d38a5a", 0.45, 0.01), ring(p, 5, "#c0603a", 0.3, 0.8), rect(p, 6, 6, 0, "#d6a14a", 1, 0.25)]
    return out


def rq(shapes, rl=None, **kw):
    s = {"frame": [1, 1], "bg": "#2a2a2e", "arena": dict(SQ, fill="#9a8070"), "waymarks": None, "shapes": GRID4 + shapes,
         "boss": None, "roles": rl or {}, "iconSize": 4.6}
    s.update(kw)
    return s


def sw29():
    sh = []
    for p, r in (((10, 30), 19), ((37, 48), 8.5), ((65, 33), 8.5), ((80, 52), 8.5), ((40, 86), 18.5), ((80, 81), 18.5)):
        sh += aoe(p, r, 0.8)
    sh += [circle((19, 81), 3, "#ffb03a", 0.9, 0.01), ring((19, 81), 4.6, "#ff8a50", 0.5, 0.6)]
    return rq(sh, roles(MT=(79, 16), D1=(83.5, 16), H1=(79, 20.5), D2=(83.5, 21)))


def sw30():
    return rq(rocks(), roles(D1=(49.5, 43.5), MT=(43.5, 52), D2=(59.5, 52), H1=(54, 58)))


def sw31():
    sh = rocks() + [line((16, 21), (80, 87), "#6a1fa0", 0.55), line((19, 17), (84, 83), "#6a1fa0", 0.55)]
    return rq(sh, roles(D1=(19, 14), MT=(15, 19), D2=(84, 83), H1=(80, 87)))


def sw32():
    sh = rocks()
    for p, w, h in (((50, 14.5), 81, 14), ((50, 85.5), 81, 14), ((14.5, 50), 14, 81), ((85.5, 50), 14, 85)):
        sh.append(rect(p, w, h, 0, "#ffb347", 0.55, 0.12))
    sh.append(rect((52, 50), 14, 120, -45, "#ffb347", 0.55, 0.12))
    return rq(sh, roles(D1=(46, 26), MT=(49, 29), D2=(70, 50.5), H1=(73, 57)))


def sw33():
    sh = rocks() + [cone((50, 50), 0, 90, 75, "#ffc35a", 0.65), cone((50, 50), 180, 90, 75, "#ffc35a", 0.65)]
    sh += _discs([((62, 51), "NSW"), ((70, 51), "NSE"), ((61, 57.5), "SEW"), ((69, 58), "NEW")], 4.6)
    return rq(sh)


def sw34():
    sh = rocks() + [cone((25, 1.5), 180, 150, 5.5, PINK, 0.85, 0.2), cone((1.5, 33), 90, 150, 5.5, PINK, 0.85, 0.2),
                    cone((98.5, 68), 270, 150, 5.5, PINK, 0.85, 0.2), cone((70, 98.5), 0, 150, 5.5, PINK, 0.85, 0.2)]
    sh += _discs([((61, 51), "NSW"), ((68.5, 50.5), "NSE"), ((61.5, 57.5), "SEW"), ((69, 58), "NEW")], 4.6)
    return rq(sh)


def sw35():
    sh = rocks() + [cone((25, 1.5), 180, 150, 5.5, PINK, 0.85, 0.2), cone((1.5, 33), 90, 150, 5.5, PINK, 0.85, 0.2),
                    cone((98.5, 68), 270, 150, 5.5, PINK, 0.85, 0.2), cone((70, 98.5), 0, 150, 5.5, PINK, 0.85, 0.2)]
    for a, b in (((18, 31), (80, 31)), ((67, 21), (67, 81)), ((81, 70), (19, 70)), ((28, 20), (28, 82))):
        sh.append(arrow(a, b, GA, 0.5))
    sh += _discs([((63, 26), "NSE"), ((71, 37), "NEW"), ((24.5, 64.5), "NEW"), ((37, 76), "NSW")], 4.6)
    return rq(sh, arena=dict(SQ, fill="#b78a5c"))


SCENES = {k: v for k, v in globals().items() if k.startswith("sw") and k[2:].isdigit()}


def setup():
    """game8's waymarks, as its Swordmaster pictures have them."""
    return board([], {}, boss=None)


SCENES = {k: v for k, v in globals().items() if k.startswith("sw") and k[2:].isdigit()}
