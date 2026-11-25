"""Boss 1 (Ketuduke): game8's 440x440 boards, a 4x4 square arena, waymarks A-D on the edges."""
from lib import *

ARENA = {"shape": "square", "at": [50.5, 50.5], "w": 88, "h": 88, "fill": "#7d6f55", "edge": "#4a3f2c", "lines": False}
WM = {"A": [50.5, 5.5], "B": [95, 52], "C": [50.5, 96.5], "D": [5, 52]}
X = [17.5, 39.5, 61.5, 83.5]  # tile centres (same for y)
E0, E1 = 6.5, 94.5
G = [28.5, 50.5, 72.5]
BOSS = [50, 49]
QUAD = {"NW": (E0, E0, 50.5, 50.5), "NE": (50.5, E0, E1, 50.5), "SW": (E0, 50.5, 50.5, E1), "SE": (50.5, 50.5, E1, E1)}
RED, GREY = ("#a8452e", 0.5), ("#9aa0a8", 0.38)


def grid():
    out = []
    for g in G:
        out.append(line((g, E0), (g, E1), "#e0bb62", 0.45, 0.85))
        out.append(line((E0, g), (E1, g), "#e0bb62", 0.45, 0.85))
    return out


def base(quads=None, under=()):
    sh = []
    for q, k in (quads or {}).items():
        c, o = RED if k == "r" else GREY
        sh.append(box(*QUAD[q], c=c, o=o))
    sh += list(under)
    sh += grid()
    return sh


def crystal(c, v):
    w, h = (6.6, 12) if v else (12, 6.6)
    return [rect(c, w, h, 0, "#c6f0ff", 0.97, 0.3), rect(c, w * 0.55, h * 0.55, 0, "#ffffff", 0.55, 0.01)]


def crystals(lst):
    out = []
    for (x, y, v) in lst:
        out += crystal((x, y), v)
    return out


def bubble(c, r=5.2):
    return circle(c, r, "#7fc4ec", 0.5, 0.3)


def bubble_p(c):
    """A player with the bubble debuff (Bubble Weave)."""
    return [circle(c, 3.0, "#3f93e6", 0.95, 0.3), ring(c, 3.5, "#d6f1ff", 0.45), dot(c, 0.9, "#ffffff")]


def bind_p(c):
    """A player with the bind debuff (Foamy Fetters)."""
    return [dot(c, 2.6, "#f4c51c"), ring(c, 2.6, "#5a4300", 0.45)]


def dice1(c):
    return [dot(c, 1.8, "#f4f8ff"), ring(c, 1.8, "#7aa9d8", 0.35)]


def dice2(c):
    return [dot((c[0] - 2.9, c[1]), 1.8, "#ffd3e0"), dot((c[0] + 2.9, c[1]), 1.8, "#ffd3e0"),
            ring((c[0] - 2.9, c[1]), 1.8, "#e07a9a", 0.35), ring((c[0] + 2.9, c[1]), 1.8, "#e07a9a", 0.35)]


def flow_edge(side, at, r=10.5):
    c, d = {"N": ((at, E0), 0), "S": ((at, E1), 180), "W": ((E0, at), 270), "E": ((E1, at), 90)}[side]
    return [cone(c, d, 180, r, "#7cc1e8", 0.75, 0.3)]


def S(shapes, roles=None, boss=None, quads=None, under=(), wm=True, **kw):
    return scene(ARENA, WM if wm else None, base(quads, under) + shapes, roles, boss, **kw)


# ---------------------------------------------------------------- Spring Crystals: Soryu's placements
CA = [(83.5, 20, 1), (38.5, 41, 0), (84, 63.5, 0), (38.5, 84.5, 1)]
CB = [(83.5, 16.5, 0), (38.5, 41, 1), (16.5, 61.5, 0), (61, 84.5, 1)]


def soryu_start():
    return S(crystals([(83.5, 20, 1), (38.5, 41, 0), (85, 63.5, 0), (38.5, 84.5, 1)]),
             {"D2": (44.5, 38.5), "MT": (59.5, 40.5), "D1": (43, 62.5), "H1": (59.5, 62.5)}, BOSS)


def pattern_a():
    return S(crystals(CA), boss=BOSS)


def pattern_b():
    return S(crystals(CB), boss=BOSS)


QA = {"NW": "g", "NE": "r", "SW": "r", "SE": "g"}
QB = {"NW": "r", "NE": "g", "SW": "g", "SE": "r"}


def dice_a():
    return dice1((28.5, 28.5)) + dice2((72.5, 28.5)) + dice2((28.5, 72.5)) + dice1((72.5, 72.5))


def dice_b():
    return dice2((28.5, 28.5)) + dice1((72.5, 28.5)) + dice1((28.5, 72.5)) + dice2((72.5, 72.5))


def a_stack():
    sh = crystals(CA) + dice_a()
    sh += bind_p((13.5, 18)) + bubble_p((13.5, 41)) + stack_icon((13.5, 34))
    sh += bubble_p((61, 59)) + stack_icon((61, 52)) + bind_p((61, 82.5))
    return S(sh, quads=QA)


def a_spread():
    sh = crystals(CA) + dice_a()
    sh += bind_p((61, 19.5)) + spread_icon((61, 12.5)) + bubble_p((11, 41.5)) + spread_icon((11, 34.5))
    sh += bubble_p((61, 62.5)) + spread_icon((61, 55.5)) + bind_p((11, 85.5)) + spread_icon((11, 78.5))
    return S(sh, quads=QA, boss=BOSS)


def b_stack():
    sh = crystals(CB) + dice_b()
    sh += bubble_p((61, 20.5)) + stack_icon((61, 13.5)) + bind_p((82.5, 18.5))
    sh += bind_p((16.5, 61.5)) + bubble_p((39, 64.5)) + stack_icon((39, 57.5))
    return S(sh, quads=QB)


def b_spread():
    sh = crystals(CB) + dice_b()
    sh += bind_p((17, 19.5)) + spread_icon((17, 12.5)) + bubble_p((61, 20.5)) + spread_icon((61, 13.5))
    sh += bubble_p((39, 64.5)) + spread_icon((39, 57.5)) + bind_p((83, 63.5)) + spread_icon((83, 56.5))
    return S(sh, quads=QB)


# ---------------------------------------------------------------- Blowing Bubbles
def bubbles(lst):
    return [bubble(c) for c in lst]


BUB1 = [(12, 13.5), (20, 13.5), (57, 13.5), (65.5, 13.5), (88.5, 12), (88.5, 22.5), (12, 33), (12, 43.5), (89.5, 57), (89.5, 67.5),
        (11, 79), (11, 89.5), (34, 89.5), (44.5, 89.5), (78, 89.5), (88.5, 89.5)]


def bb_stack1():
    sh = bubbles(BUB1) + stack_icon((59.5, 38.5)) + stack_icon((41.5, 55.5))
    return S(sh, {"MT": (54, 43.5), "D2": (59.5, 45.5), "D1": (41.5, 62.5), "H1": (47, 63)})


def bb_stack2():
    sh = bubbles([(11.5, 15.5), (22, 15.5), (56.5, 15.5), (67, 15.5), (83, 12), (83, 23), (17.5, 33), (17.5, 43.5), (84.5, 57), (84.5, 67.5),
                  (17.5, 80), (17.5, 90), (33.5, 88.5), (44, 88.5), (78.5, 87), (88.5, 87)])
    sh += aoe((55.5, 39.5), 10.5) + aoe((59.5, 43.5), 10.5) + aoe((42.5, 59), 10.5) + aoe((47.5, 63.5), 10.5)
    sh += stack_icon((59.5, 38.5)) + stack_icon((41.5, 55))
    return S(sh, {"MT": (55, 44.5), "D2": (60, 45), "D1": (41.5, 61.5), "H1": (46.5, 64)})


def bb_stack3():
    sh = bubbles([(55, 12.5), (55, 23.5), (12, 40), (20.5, 40), (36, 35), (36, 45), (49, 40), (54, 57), (54, 67.5), (81, 63.5), (89.5, 63.5),
                  (39, 78), (39, 88.5), (91, 12)])
    sh += aoe((66.5, 42), 10.5) + aoe((70.5, 45), 10.5) + aoe((31, 59), 10.5) + aoe((35, 62.5), 10.5)
    sh += [arrow((58.5, 41), (75.5, 41), "#cfe8ff", 1.0), arrow((45, 62), (28, 62), "#cfe8ff", 1.0)]
    sh += stackmark((83.5, 37.5), 5) + stackmark((20, 67), 5)
    return S(sh, {"MT": (80, 34), "D2": (86.5, 40), "D1": (17.5, 69), "H1": (22.5, 70)})


def bb_stack4():
    sh = [circle((40, 22), 26, ORANGE, 0.5, 0.01), circle((66, 33), 26, ORANGE, 0.5, 0.01), circle((22, 61), 26, ORANGE, 0.5, 0.01),
          circle((48, 86), 26, ORANGE, 0.5, 0.01)]
    sh += bubbles([(26.5, 13.5), (26.5, 23.5), (31.5, 33), (42, 33), (76, 29), (86, 29), (74, 38), (74, 47), (26, 57), (21.5, 67),
                   (11, 72.5), (21, 72.5), (56.5, 70.5), (66, 70.5), (72.5, 79), (72.5, 89)])
    sh += arc_arrow((76, 30), 9, 90, -40) + arc_arrow((28, 82), 8, 230, 110)
    sh += spread_icon((53.5, 6.5)) + spread_icon((69, 41.5)) + spread_icon((33, 51.5)) + spread_icon((47, 86.5))
    return S(sh, {"D2": (53.5, 12.5), "MT": (69, 47.5), "D1": (33, 57.5), "H1": (47, 93)})


def bb_spread1():
    sh = bubbles(BUB1)
    return S(sh, {"MT": (43, 43.5), "D2": (59, 43.5), "H1": (43, 64), "D1": (59, 64)})


def bb_spread2():
    sh = bubbles([(11.5, 15.5), (22, 15.5), (56.5, 15.5), (67, 15.5), (88.5, 12), (88.5, 22.5), (18.5, 33.5), (18.5, 44), (84.5, 57),
                  (84.5, 67.5), (18.5, 80), (18.5, 90), (33.5, 88), (44, 88), (78.5, 87), (88.5, 87)])
    sh += aoe((40, 43.5), 10) + aoe((60, 43.5), 10) + aoe((40, 64), 10) + aoe((60, 64), 10)
    sh += arc_arrow((28, 28), 13, 40, -80) + arc_arrow((77, 27), 12, 210, 330) + arc_arrow((27, 74), 12, 330, 190) + arc_arrow((76, 77), 12, 220, 70)
    sh += spread_icon((38, 24)) + spread_icon((74, 40.5)) + spread_icon((28.5, 57)) + spread_icon((61, 72))
    return S(sh, {"MT": (38, 30), "D2": (74, 47), "H1": (28.5, 63), "D1": (61, 78.5)})


def bb_spread3():
    sh = [circle((16, 17), 28, ORANGE, 0.5, 0.01), circle((70, 22), 28, ORANGE, 0.5, 0.01), circle((14, 85), 28, ORANGE, 0.5, 0.01),
          circle((86, 74), 28, ORANGE, 0.5, 0.01)]
    sh += bubbles([(61.5, 12), (61.5, 22.5), (12, 40.5), (22.5, 40.5), (38.5, 35), (38.5, 45.5), (56.5, 40.5), (66.5, 40.5), (34, 61.5),
                   (44, 61.5), (62.5, 57.5), (62.5, 68), (77.5, 61.5), (88, 61.5), (39.5, 79), (39.5, 89.5)])
    sh += arc_arrow((28, 22), 10, 300, 60) + arc_arrow((78, 22), 12, 220, 330) + arc_arrow((24, 76), 9, 330, 190) + arc_arrow((79, 82), 9, 210, 330)
    sh += spread_icon((16.5, 26.5)) + spread_icon((70.5, 20)) + spread_icon((31, 78)) + spread_icon((84, 70))
    return S(sh, {"MT": (16.5, 33), "D2": (70.5, 26.5), "H1": (31, 84.5), "D1": (84, 76)})


def bb_spread4():
    sh = bubbles([(28, 13), (28, 23.5), (21, 33.5), (31, 33.5), (59.5, 32), (59.5, 42.5), (79, 33), (89, 33), (24, 60), (21, 70),
                  (24, 70), (62.5, 69.5), (72.5, 69.5), (89, 71), (89, 81), (51, 82), (51, 92)])
    sh += aoe((50.5, 39), 7.5) + aoe((50.5, 62), 7.5)
    sh += stackmark((50.5, 39), 4.6) + stackmark((50.5, 62), 4.6)
    sh += stack_icon((50.5, 32.5)) + stack_icon((48.5, 56))
    return S(sh, {"MT": (49, 41), "D2": (53, 38.5), "D1": (48.5, 61.5), "H1": (52.5, 63.5)})


# ---------------------------------------------------------------- Hydrofall + Strewn Bubbles -> Twintides
def flows(cols, rows_top):
    """Blue columns of water: (col index, True = rows 1-2 from the north, False = rows 3-4 from the south)."""
    out = []
    for ci, top in cols:
        x0 = E0 + 22 * ci
        y0, y1 = (E0, 50.5) if top else (50.5, E1)
        out.append(box(x0, y0, x0 + 22, y1, "#3f86c4", 0.55, 0.3))
    return out


def tide_round(c=(50.5, 50.5)):
    return [circle(c, 28, "#b7b7b7", 0.45, 0.3)]


def tw_start():
    sh = flow_edge("N", 39.5) + flow_edge("N", 83.5) + flow_edge("S", 17.5) + flow_edge("S", 61.5)
    return S(sh, {"MT": (55, 42.5), "D2": (60, 45), "D1": (43, 55.5), "H1": (47.5, 57.5)})


def tw_round1():
    under = [box(28.5, 28.5, 72.5, 72.5, ORANGE, 0.5)]
    sh = flows([(1, True), (3, True), (0, False), (2, False)], True) + tide_round()
    sh += flow_edge("N", 39.5) + flow_edge("N", 83.5) + flow_edge("S", 17.5) + flow_edge("S", 61.5)
    sh += stack_icon((61, 18)) + stack_icon((37, 75.5))
    return S(sh, {"MT": (55.5, 24), "D2": (61, 25), "H1": (32, 82), "D1": (37, 82)}, BOSS, under=under)


def tw_ring1():
    sh = [box(0, 0, 100, 100, ORANGE, 0.42)]
    sh += flows([(0, True), (2, True), (1, False), (3, False)], True)
    sh += [circle((50.5, 50.5), 15, "#3f86c4", 0.55, 0.3)]
    sh += flow_edge("N", 17.5) + flow_edge("N", 61.5) + flow_edge("S", 39.5) + flow_edge("S", 83.5)
    sh += stackmark((43.5, 43), 4.6) + stackmark((57.5, 59.5), 4.6) + stack_icon((43, 37)) + stack_icon((57, 53.5))
    return S(sh, {"MT": (41.5, 43), "D2": (45.5, 43), "H1": (55, 59.5), "D1": (59.5, 59.5)}, BOSS)


def tw_ring2():
    sh = [box(0, 0, 100, 100, ORANGE, 0.42)]
    sh += flows([(1, True), (3, True), (0, False), (2, False)], True)
    sh += [circle((50.5, 50.5), 15, "#3f86c4", 0.55, 0.3)]
    sh += flow_edge("N", 39.5) + flow_edge("N", 83.5) + flow_edge("S", 17.5) + flow_edge("S", 61.5)
    sh += stack_icon((58, 38.5)) + stack_icon((47, 54.5))
    return S(sh, {"MT": (54.5, 44), "D2": (59, 44.5), "H1": (45, 59), "D1": (49.5, 59.5)}, BOSS)


def tw_round2():
    under = [box(28.5, 28.5, 72.5, 72.5, ORANGE, 0.5)]
    sh = flows([(0, True), (2, True), (1, False), (3, False)], True) + tide_round()
    sh += flow_edge("N", 17.5) + flow_edge("N", 61.5) + flow_edge("S", 39.5) + flow_edge("S", 83.5)
    sh += stackmark((40, 19), 5) + stackmark((61.5, 81.5), 5)
    return S(sh, {"MT": (38, 21.5), "D2": (42, 17.5), "H1": (59.5, 83.5), "D1": (63.5, 80)}, BOSS, under=under)


def tw_side():
    sh = flow_edge("W", 17.5) + flow_edge("W", 61.5) + flow_edge("E", 39.5) + flow_edge("E", 83.5)
    sh += curve([(50.5, 40), (47.5, 40.5), (44.5, 43.5)]) + curve([(47.5, 61.5), (51, 60.5), (54, 58)])
    return S(sh, {"MT": (37.5, 49.5), "D2": (43, 52), "D1": (59, 52), "H1": (63.5, 53.5)})


# ---------------------------------------------------------------- Hydrobullet -> Roar -> Spring Crystals
ADDS = [(50.5, 28), (29, 51.5), (72.5, 51.5), (50.5, 74)]


def add(c):
    """One of the adds Roar calls (game8: a small gold figure with pink markers on its four sides)."""
    out = [dot(c, 2.0, "#ffd36b"), ring(c, 2.0, "#a8771c", 0.35)]
    for a in (0, 90, 180, 270):
        out.append(dot(off(c, a, 3.0), 0.8, "#e0457b"))
    return out


def adds(bubbled=False):
    out = []
    for i, c in enumerate(ADDS):
        if bubbled and i in (0, 3):
            out.append(circle(c, 5.8, "#cfe8f2", 0.45, 0.35))
        out += add(c)
    return out


CR = [(61, 16, 0), (14.5, 40.5, 1), (83.5, 62, 1), (38.5, 84.5, 0)]


def roar_safe_vert():
    under = [box(E0, E0, 28.5, E1, ORANGE, 0.5), box(72.5, E0, E1, E1, ORANGE, 0.5), box(28.5, 28.5, 72.5, 72.5, ORANGE, 0.5)]
    return S(crystals([(83, 16.5, 0), (14, 40, 1), (83.5, 61.5, 1), (16.5, 84.5, 0)]), under=under)


def roar_safe_horiz():
    under = [box(E0, E0, E1, 28.5, ORANGE, 0.5), box(28.5, 28.5, 72.5, 72.5, ORANGE, 0.5), box(E0, 72.5, E1, E1, ORANGE, 0.5)]
    return S(crystals([(15.5, 16.5, 1), (61.5, 16, 0), (38.5, 84, 0), (83, 84.5, 1)]), under=under)


def roar_safe_corner():
    under = [box(28.5, E0, 72.5, E1, ORANGE, 0.5), box(E0, 28.5, 28.5, 72.5, ORANGE, 0.5), box(72.5, 28.5, E1, 72.5, ORANGE, 0.5)]
    return S(crystals(CR), under=under)


ROAR_ROLES = {"MT": (50.5, 42), "D2": (42.5, 51.5), "D1": (58.5, 51.5), "H1": (50.5, 60.5)}


def roar_icons():
    return spread_icon((50.5, 36)) + spread_icon((42.5, 45.5)) + spread_icon((58.5, 45.5)) + spread_icon((50.5, 54.5))


def roar1():
    return S(roar_icons(), ROAR_ROLES)


def roar2():
    return S(roar_icons() + adds(), ROAR_ROLES)


def roar3():
    return S(crystals(CR) + roar_icons() + adds(), ROAR_ROLES)


def roar4():
    sh = crystals(CR) + adds(True)
    sh += bind_p((47.5, 36.5)) + spread_icon((52, 36.5)) + bind_p((38, 46.5)) + spread_icon((42.5, 46.5))
    sh += bubble_p((59.5, 46.5)) + spread_icon((64, 46.5)) + bubble_p((47.5, 55)) + spread_icon((52, 55))
    return S(sh, {"MT": (50, 41.5), "D2": (40.5, 51.5), "D1": (63.5, 51.5), "H1": (50, 60)})


def roar5():
    sh = [box(0, 0, 100, 100, ORANGE, 0.4), box(E0, E0, 28.5, 28.5, "#7d6f55", 0.55), box(72.5, E0, E1, 28.5, "#7d6f55", 0.55),
          box(E0, 72.5, 28.5, E1, "#7d6f55", 0.55), box(72.5, 72.5, E1, E1, "#7d6f55", 0.55),
          rect((50.5, 51), 31.5, 31.5, 45, "#2aa3b6", 0.85, 0.3)]
    sh += crystals(CR) + adds(True)
    sh += bubble_p((15, 17.5)) + spread_icon((19.5, 17.5)) + bind_p((78.5, 17.5)) + spread_icon((83, 17.5))
    sh += bind_p((15, 82.5)) + spread_icon((19.5, 82.5)) + bubble_p((78.5, 82.5)) + spread_icon((83, 82.5))
    return S(sh, {"H1": (17.5, 22.5), "MT": (81, 22.5), "D2": (17.5, 87.5), "D1": (81, 87.5)})


def roar6():
    sh = adds(True)
    sh += bind_p((50.5, 15)) + bubble_p((23, 45)) + bubble_p((79, 48)) + bind_p((49.5, 80))
    sh += [arrow((76, 20.5), (58.5, 24)), arrow((19.5, 24), (19.5, 40)), arrow((82, 72), (78.5, 58)), arrow((25, 81), (42, 79.5))]
    return S(sh, {"MT": (50.5, 22), "H1": (23, 51), "D1": (79.5, 54), "D2": (49.5, 86.5)})


def roar7():
    sh = [box(0, 0, 100, 100, ORANGE, 0.45), box(28.5, 28.5, 72.5, 72.5, "#7d6f55", 0.75)]
    sh += adds(True)
    sh += bind_p((50.5, 15)) + bubble_p((23, 45.5)) + bubble_p((82, 48)) + bind_p((50.5, 79.5))
    return S(sh, {"MT": (50.5, 22), "H1": (23, 51.5), "D1": (82, 54), "D2": (50.5, 86)})


# ---------------------------------------------------------------- Angry Seas, Fluke Typhoon towers
def seas_strip(c="#d9434e"):
    return [box(39.5, E0, 61.5, E1, c, 0.5)]


def seas_arrows():
    out = []
    for y in (17.5, 39.5, 61.5, 83.5):
        out += [arrow((36, y), (22, y), "#ee4a2a", 2.0), arrow((65, y), (79, y), "#ee4a2a", 2.0)]
    return out


def ty1():
    return S(seas_arrows(), {"MT": (32.5, 47.5), "D2": (32.5, 55), "D1": (66.5, 47), "H1": (66.5, 54.5)}, under=seas_strip())


def ty2():
    sh = seas_arrows() + stack_icon((26, 52.5)) + stack_icon((75, 52.5))
    sh += chevron((36.5, 52), 270, 3.4, 1.6, "#f2c419", 1.2) + chevron((63.5, 52), 90, 3.4, 1.6, "#f2c419", 1.2)
    return S(sh, {"MT": (32, 49.5), "D2": (32, 56), "D1": (66.5, 49), "H1": (66.5, 55.5)}, under=seas_strip())


def ty3():
    sh = [circle(c, 31, ORANGE, 0.42, 0.01) for c in ((29.5, 30.5), (73, 30.5), (29.5, 73), (73, 73))]
    sh += [ring(c, 31, ORIM, 0.3, 0.8) for c in ((29.5, 30.5), (73, 30.5), (29.5, 73), (73, 73))]
    sh += spread_icon((29.5, 24)) + spread_icon((73, 24)) + spread_icon((29.5, 66.5)) + spread_icon((73, 66.5))
    return S(sh, {"D2": (29.5, 30.5), "D1": (73, 30.5), "MT": (29.5, 73), "H1": (73, 73)})


def orb(c):
    return [circle(c, 3.6, "#cfe6fb", 0.95, 0.3), dot(c, 1.3, "#ffffff")]


ORBS = [(28.5, 17.5), (16.5, 39.5), (28.5, 51.5), (16.5, 83.5)]
BUBW = [(14.5, 27.5), (28.5, 39.5), (17, 61.5), (28.5, 83.5)]
BUBE = [(72.5, 28.5), (83, 39.5), (72.5, 51.5), (83, 83.5)]


def ty_bub(c):
    return [circle(c, 6.4, "#7fc4ec", 0.42, 0.01), ring(c, 6.4, "#f2d36b", 0.35)]


def ty_strip():
    return [box(39.5, E0, 61.5, E1, "#5fa8d8", 0.55, 0.3)]


def ty4():
    sh = []
    for c in ORBS:
        sh += orb(c)
    return S(sh, {"D1": (72.5, 28.5), "MT": (17.5, 63), "D2": (13.5, 72), "H1": (73.5, 71.5)}, under=ty_strip())


def ty_mid(arrows=False, towers=False, d2=(13, 72), t=(19.5, 69.5)):
    sh = []
    for c in [ORBS[0], ORBS[2]] + BUBW + BUBE:
        sh += ty_bub(c)
    for c in ORBS:
        sh += orb(c)
    if arrows:
        sh += [arrow((2.5, y), (9.5, y), "#ffffff", 1.1) for y in (17.5, 39.5, 61.5, 83.5)]
    if towers:
        for c in ((72.5, 17.5), (17, 51.5), (85, 51.5), (72.5, 83.5)):
            sh += [circle(c, 6, "#e85a5a", 0.25, 0.01), ring(c, 6, "#e04646", 0.8), dot(c, 1.6, "#ffb0a0")]
    return sh


def ty5():
    return S(ty_mid(), {"D1": (89.5, 29.5), "MT": (19.5, 69.5), "D2": (13, 72), "H1": (79.5, 71.5)}, under=ty_strip())


def ty6():
    return S(ty_mid(True), {"D1": (89.5, 29.5), "MT": (12, 64.5), "D2": (13, 72), "H1": (79.5, 71.5)}, under=ty_strip())


def ty7():
    return S(ty_mid(True, True), {"D1": (92.5, 28), "MT": (9, 62.5), "D2": (28.5, 82.5), "H1": (92.5, 67)}, under=ty_strip())


def ty8():
    sh = []
    for c in ((17, 51.5), (85, 51.5)):
        sh += [circle(c, 6, "#e85a5a", 0.25, 0.01), ring(c, 6, "#e04646", 0.8)]
    for c in ((72.5, 17.5), (16.5, 39.5), (72.5, 51.5), (16.5, 83.5)):
        sh += [circle(c, 13, ORANGE, 0.55, 0.01), ring(c, 13, ORIM, 0.45), ring(c, 6.4, ORIM, 0.4)] + orb(c)
    sh += ty_bub((72.5, 83.5))
    sh += [arrow((2.5, y), (9.5, y), "#ffffff", 1.1) for y in (17.5, 39.5, 61.5, 83.5)]
    return S(sh, {"D1": (91, 28.5), "MT": (16.5, 62.5), "D2": (72.5, 83.5), "H1": (91, 66.5)}, under=ty_strip())


def ty9():
    sh = []
    for c in ((72, 18), (17, 52.5), (85, 52.5)):
        sh += [circle(c, 6, "#e85a5a", 0.25, 0.01), ring(c, 6, "#e04646", 0.8)]
    sh += ty_bub((72.5, 83.5))
    return S(sh, {"D1": (73.5, 19), "MT": (17, 53.5), "H1": (85.5, 53.5), "D2": (72.5, 84)}, under=ty_strip())
