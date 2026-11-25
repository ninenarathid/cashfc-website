"""Every scene of the M12S part 1 guide, redrawn from game8's strategy-board pictures (440x330; the waymark
picture 440x440). x in % of the width, y in % of the height, sizes in % of the width. Measured on 5 % grid
sheets (dl/grid) and checked on compare sheets; the big AoE circles found with tools/hough.py."""
import math
import base12 as B
from base12 import R, F, off, ang, dist, line, circle, ring, dot, text, arrow, cone, rect, aoe, chevron, chev2, stack, clump, roles, ALL

ORANGE = B.ORANGE
FLOOR = "#a9aaae"          # game8's grey checker floor
TAN = "#cdc29f"            # game8's tan floor (zoomed boards)
VOID = "#5f6063"           # floor that has fallen away
GREY_FLOOR = "#9c9da1"     # the zoomed grey floor of Act 3's first picture
BG = "#5c5d61"

# the 4:3 board: the north part of the 40x30 arena; its top edge at 32 % of the height
BOARD = {"shape": "square", "at": [50, 77.5], "w": 91, "h": 68.25, "fill": FLOOR, "lines": False, "edge": "#dedede"}
BOSS = [50, 21]


def board(**kw):
    F.k = 0.75
    s = {"arena": dict(BOARD), "boss": list(BOSS), "bossSize": 22.5}
    s.update(kw)
    return s


def arc(c, r, a0, a1, col=ORANGE, wd=1.3, n=28, o=0.95):
    """An arc of a circle from angle a0 to a1 (0 = up, clockwise), as short lines."""
    out = []
    pts = [off(c, a0 + (a1 - a0) * i / n, r) for i in range(n + 1)]
    for p, q in zip(pts, pts[1:]):
        out.append(line(p, q, col, wd, o))
    return out


def target_arc():
    """The boss's target circle, as game8 draws it: the half inside the arena."""
    return arc((50, 31.5), 29.5, 90, 270, "#f29a2e", 1.2)


def midline():
    return [line((50, 0), (50, 100), "#f29a2e", 1.0, 0.95)]


def orb(c, col):
    base, rim = {"g": ("#2e8f46", "#8fe8a0"), "p": ("#6b2a9e", "#d29aff")}[col]
    return [ring((c[0], c[1] + 3.2), 3.0, rim, 0.35, 0.6), dot(c, 2.1, base), ring(c, 2.1, rim, 0.3, 0.9)]


def num(c, n):
    """game8's hexagon number beside an orb or an AoE."""
    return [dot(c, 2.1, "#3a3426", 0.75), ring(c, 2.1, "#f5e3a0", 0.4), text(c, str(n), 2.5, "#fff4d0")]


def badge(c, s, inner, size=5.6):
    out = [rect(c, size, size, 0, "#a08a5a", 1, 0.01), rect(c, size * 0.85, size * 0.85, 0, inner, 1, 0.01)]
    out.append(text((c[0], c[1] + 0.15), s, size * 0.55 if len(s) < 2 else size * 0.45, "#ffffff"))
    return out


D_IN, T_IN, H_IN, TH_IN = "#5a2a2a", "#22407a", "#2c5a2a", "#22407a"


def gD(c):
    return badge(c, "D", D_IN)


def gTH(c):
    return badge(c, "TH", TH_IN)


def gT(c):
    return badge(c, "T", T_IN)


def gH(c):
    return badge(c, "H", H_IN)


def warrow(p, q):
    return [arrow(p, q, "#ffffff", 1.0, 0.98)]


def arm(c):
    """The red arm / dragon-head icon game8 puts on the field."""
    return [dot(c, 2.6, "#b3202c"), ring(c, 2.6, "#ff9a9a", 0.35, 0.95), dot(c, 0.8, "#ffd0d0")]


def burst(c, r=5.6):
    """Bursting Grotesquerie: a circle around the player (game8's dark red ring)."""
    return [circle(c, r, "#8a3a1a", 0.22, 0.01), ring(c, r, "#9a3412", 0.7, 0.85)]


def pcone(c, d, ln=24, sp=26, o=0.38):
    """Directed Grotesquerie: a cone from the player's cell."""
    return [cone(c, d, sp, ln, ORANGE, o)]


def bigaoe(c, r, o=0.34, rim=0.4):
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, "#ffe9b8", rim, 0.95)]


def cellmark(c, r=2.9):
    """A cell on the floor: game8's brown ring with a glowing centre."""
    return [dot(c, r, "#7a4a24", 0.85), ring(c, r, "#5a2e10", 0.5, 0.9), dot(c, r * 0.32, "#fff6d0")]


def redcell(c):
    """Act 2: where an AoE landed and a tower will come (game8's red mark on a pink base)."""
    return [ring((c[0], c[1] + 2.2), 3.0, "#ff8ab0", 0.45, 0.75), dot(c, 1.8, "#a8232a"), ring(c, 1.8, "#ff9070", 0.3, 0.9)]


def tower(c, r=4.6):
    return [circle(c, r, "#ff9ad0", 0.18, 0.01), ring(c, r, "#ffb0e0", 0.45, 0.95)]


def lbl(c, s, col):
    return text(c, s, 2.9, col)


A_COL, B_COL = "#ff5a4a", "#d8e86a"


# ================================================================== waymarks
def waymarks():
    F.k = 1.0
    return {"frame": [1, 1], "bg": "#5f6166",
            "arena": {"shape": "square", "at": [50, 49.5], "w": 97, "h": 72, "fill": "#8f7a64", "lines": False, "edge": "#5a4634"},
            "waymarks": {"A": [50, 28], "1": [24.3, 36.8], "2": [75.7, 36.8], "D": [28.5, 49.5], "B": [71.5, 49.5],
                         "4": [24.3, 62.2], "3": [75.7, 62.2], "C": [50, 71.5]},
            "markSize": 10, "shapes": []}


# ================================================================== Mortal Slayer
LEFT_ORBS = [((24.5, 5), "g", (17.5, 4.5), 1), ((24.5, 15.5), "g", (17.5, 15.5), 1), ((24.5, 26), "g", (17.5, 26.5), 2), ((24.5, 37), "g", (18, 38), 4)]
RIGHT_ORBS = [((73, 6), "p", (80.5, 4.5), 2), ((73, 16), "g", (80.5, 15.5), 3), ((73, 26.5), "g", (80.5, 26.5), 3), ((73, 36.5), "p", (81, 37.5), 4)]


def orbs(items):
    out = []
    for c, col, nc, n in items:
        out += orb(c, col) + num(nc, n)
    return out


def ms(rl, extra=(), orbs_=()):
    sh = midline() + target_arc() + list(extra) + orbs(orbs_)
    return board(shapes=sh, roles=roles(**rl))


def ms1():
    return ms(dict(MT=(25.5, 67.5), D1=(31, 68.5), D3=(37, 73.5), H1=(30.5, 80), H2=(68, 67), D4=(74, 70.5), ST=(64.5, 73.5), D2=(71, 77.5)))


def ms2():
    return ms(dict(MT=(25.5, 69), D1=(31.5, 70), D3=(37, 75), H1=(30.5, 81), H2=(68, 67.5), D4=(74.5, 71), ST=(64.5, 75), D2=(71, 79)),
              orbs_=LEFT_ORBS + RIGHT_ORBS)


def ms3():
    return ms(dict(D1=(31.5, 69), D3=(37.5, 74.5), H1=(30.5, 80), D4=(45.5, 82.5), MT=(54.5, 82.5), H2=(68, 67), ST=(64.5, 74.5), D2=(71.5, 77.5)),
              orbs_=LEFT_ORBS + RIGHT_ORBS)


def ms4():
    ex = aoe((29, 43), 10) + aoe((42, 50), 10)
    o = [((28.5, 34), "g", (31, 28), 1), ((41.5, 42.5), "g", (42, 34.5), 1), ((24.5, 26), "g", (17.5, 25), 2), ((24.5, 37.5), "g", (18.5, 38.5), 4)] + RIGHT_ORBS
    return ms(dict(H1=(28.5, 42), D1=(41.5, 51), D3=(37, 75), D4=(43.5, 83), MT=(55.5, 82), ST=(64.5, 74.5), H2=(68, 67.5), D2=(71, 79)), ex, o)


def ms5():
    ex = aoe((37, 43), 10) + aoe((65, 43), 10)
    o = [((37, 33.5), "g", (37, 25.5), 2), ((64.5, 33.5), "p", (66.5, 21.5), 2), ((25, 37.5), "g", (19, 37.5), 4),
         ((73, 16.5), "g", (81, 15.5), 3), ((73, 27), "g", (81, 26.5), 3), ((73, 37), "p", (81, 37), 4)]
    return ms(dict(D3=(37.5, 42), ST=(64.5, 42), H1=(12.5, 49), D1=(16, 57), H2=(69, 68.5), D2=(71.5, 77.5), D4=(44.5, 82.5), MT=(55.5, 82.5)), ex, o)


def ms6():
    ex = aoe((54.5, 40), 10) + aoe((67.5, 52.5), 10)
    o = [((54.5, 33.5), "g", (56.5, 27), 3), ((67.5, 46.5), "g", (68.5, 40), 3), ((25, 36.5), "g", (26.5, 30.5), 4), ((73, 36), "p", (75, 27.5), 4)]
    return ms(dict(H2=(54.5, 41.5), D2=(67.5, 53.5), ST=(84.5, 48.5), H1=(13, 46.5), D3=(20, 50.5), D1=(16.5, 56.5), D4=(43.5, 81), MT=(55.5, 81)), ex, o)


def ms7():
    ex = aoe((37, 37), 10) + aoe((67, 37), 10)
    o = [((37, 31), "g", (37, 22.5), 4), ((67, 31), "p", (68, 19.5), 4)]
    return ms(dict(D4=(37.5, 38.5), MT=(67, 37.5), H1=(13, 46.5), D3=(20, 50.5), D1=(16.5, 56.5), D2=(83, 49.5), ST=(81.5, 59), H2=(75.5, 62)), ex, o)


# ================================================================== Grotesquerie: Act 1
def a1_spread():
    return board(shapes=target_arc(), roles=roles(D4=(11.5, 41.5), H2=(17.5, 50.5), H1=(11, 55.5), D3=(21.5, 61), MT=(31.5, 39.5),
                                                  D1=(29, 51), ST=(40.5, 44.5), D2=(40.5, 55)))


def a1_first():
    return board(shapes=target_arc() + aoe((19, 39), 9.5), roles=clump((20.5, 40), ALL, 3.6, 4.6, 4))


def a1_drops():
    sh = target_arc()
    for c in ((19.5, 36.5), (24.5, 50.5), (35.5, 63.5), (50, 70)):
        sh += aoe(c, 9.5, 0.36)
    sh += arm((74.5, 72))
    return board(shapes=sh, roles=clump((50, 70), ALL, 3.6, 4.6, 4))


def a1_cones(east, th_stack):
    """④: the big cone from the arm, the stack in the corner, the spread down the side; cones face out."""
    sh = []
    if east:
        sh += [cone((76.5, 69), 263, 94, 79, ORANGE, 0.55)]
        armc, top, chev = (73, 69), [(79, 37.5), (85, 37.5), (91, 37.5)], (85.5, 38)
        low = (91, 46.5)
        line_ = [(55.5, 37.5), (68.5, 57), (69, 79), (64.5, 97)]
        cdir = [0, 270, 90, 90]
        low_dir = 90
    else:
        sh += [cone((23.5, 69), 97, 94, 79, ORANGE, 0.55)]
        armc, top, chev = (24, 69), [(12, 37.5), (18.5, 37.5), (25, 37.5)], (18.5, 38)
        low = (12, 46)
        line_ = [(44, 37.5), (28, 58), (26, 80.5), (33, 95)]
        cdir = [0, 90, 90, 90]
        low_dir = 270
    sh += arm(armc)
    if th_stack:
        stackers = (["MT", "ST", "H1"] if east else ["H1", "ST", "MT"]) + ["H2"]
        spreaders = ["D1", "D2", "D3", "D4"]
    else:
        stackers = (["D1", "D2", "D3"] if east else ["D3", "D2", "D1"]) + ["D4"]
        spreaders = ["MT", "ST", "H1", "H2"]
    rl = {}
    for s, p in zip(stackers, top + [low]):
        rl[s] = p
    for c in top:
        sh += pcone(c, 0, 25, 24, 0.3)
    sh += pcone(low, low_dir, 14, 24, 0.3)
    sh += stack(chev, 8.2)
    for s, p, d in zip(spreaders, line_, cdir):
        rl[s] = p
        sh += burst(p) + pcone(p, d, 24, 26, 0.36)
    return board(shapes=sh, roles=roles(**rl))


def a1_east():
    return a1_cones(True, True)


def a1_west():
    return a1_cones(False, True)


def a1_dps_stack():
    return a1_cones(True, False)


def a1_last():
    sh = target_arc()
    for c, r in (((39.1, 43), 23.6), ((74.5, 40.3), 23.6), ((17, 78), 22), ((47.3, 83.9), 23.6), ((75.2, 98.5), 23.6)):
        sh += bigaoe(c, r, 0.5)
    sh += [circle((12, 40.5), 6.8, "#d01818", 0.12, 0.01), ring((12, 40.5), 6.8, "#e02020", 1.4, 0.95)]
    sh += stack((91.5, 70), 7.6)
    rl = roles(MT=(9.5, 40.5), ST=(14.5, 40.5))
    rl.update(clump((91.5, 70.5), ["D3", "D4", "H2", "D1", "H1", "D2"], 3.2, 4.4, 3))
    return board(shapes=sh, roles=rl)


# ================================================================== Grotesquerie: Act 2
DROPS = {1: (40.5, 81.5), 2: (58, 57), 3: (84.5, 87.5), 4: (14.5, 46)}
CELLS = {1: (40, 80), 2: (59.5, 58.5), 3: (85, 86), 4: (15.5, 44)}
MID = (50, 69.5)
COIL_R = 21.5


def coil(exit_dir):
    """The boss's body around the middle, open on one side (game8's orange ring with a gap)."""
    gap = 32
    return arc(MID, COIL_R, exit_dir + gap, exit_dir + 360 - gap, "#f29a2e", 1.2, 44)


def a2_board(shapes, rl, boss=MID):
    s = board(shapes=shapes, roles=roles(**rl))
    s["boss"] = list(boss)
    return s


def a2_drops():
    sh = target_arc()
    for n, c in DROPS.items():
        sh += aoe(c, 9.5, 0.38) + num(c, n)
    s = board(shapes=sh, roles=clump((49, 69), ALL, 3.2, 4.2, 4))
    return s


def cells(*ns):
    out = []
    for n in ns:
        out += redcell(CELLS[n])
    return out


def a2_pull():
    return a2_board(cells(1, 2, 3, 4) + coil(90), clump(MID, ALL, 3.0, 4.0, 4))


def a2_turn():
    return a2_board(cells(1, 2, 3, 4) + coil(0), clump(MID, ALL, 3.0, 4.0, 4))


def tether(p, q):
    return [line(p, q, "#e81e1e", 0.9, 0.95)]


def a2_t1():
    sh = cells(1, 2, 3, 4) + coil(270) + tether((17.5, 70), (68, 70))
    sh += [lbl((17.5, 63), "α1", A_COL), lbl((68, 63), "β1", B_COL)]
    rl = dict(H1=(17.5, 70), D3=(68, 70))
    rl.update(clump(MID, ["ST", "MT", "D1", "H2", "D2", "D4"], 3.0, 4.0, 3))
    return a2_board(sh, rl)


def a2_t2():
    sh = cells(2, 3, 4) + coil(180) + tether((50, 95.5), (50, 44))
    sh += tower((40.5, 81.5)) + tower((68, 69.5))
    sh += [lbl((50, 38.5), "β2", B_COL), lbl((50, 89.5), "α2", A_COL), lbl((40.5, 74), "α3", A_COL), lbl((68, 62), "β3", B_COL), lbl((89, 85), "α1", A_COL)]
    rl = dict(ST=(50, 95.5), D1=(50, 44.5), MT=(40.5, 81.5), D2=(68, 69.5), H1=(89, 92.5))
    rl.update(clump((50, 69.5), ["H2", "D3", "D4"], 3.0, 4.0, 3))
    return a2_board(sh, rl)


def a2_t3():
    sh = cells(3, 4) + coil(90) + tether((32.5, 70), (74.5, 70))
    sh += tower((58.5, 61.5)) + tower((50, 44))
    sh += [lbl((21.5, 41.5), "α2", A_COL), lbl((50, 38), "β4", B_COL), lbl((59, 55.5), "α4", A_COL), lbl((32.5, 63), "β3", B_COL),
           lbl((74.5, 63), "α3", A_COL), lbl((88.5, 84.5), "α1", A_COL)]
    rl = dict(ST=(21.5, 48), D4=(50, 44), H2=(58.5, 61.5), D2=(32.5, 70), MT=(74.5, 70), H1=(89, 92.5))
    rl.update(clump((50, 68.5), ["D1", "D3"], 3.0, 4.0, 2))
    return a2_board(sh, rl)


def a2_t4():
    sh = cells(4) + coil(0) + tether((50, 41.5), (50, 96))
    sh += tower((84.5, 88.5)) + tower((33.5, 69.5))
    sh += [lbl((21, 41.5), "α2", A_COL), lbl((50, 35.5), "α4", A_COL), lbl((71.5, 36.5), "α3", A_COL), lbl((33.5, 62.5), "β1", B_COL),
           lbl((50, 89.5), "β4", B_COL), lbl((84.5, 82.5), "α1", A_COL)]
    rl = dict(ST=(21.5, 48), H2=(50, 41.5), MT=(71.5, 42), D3=(33.5, 69.5), D4=(50, 96), H1=(84.5, 88.5))
    rl.update(clump((49, 68.5), ["D1", "D2"], 3.0, 4.0, 2))
    return a2_board(sh, rl)


def a2_t5():
    sh = coil(270) + tower((15.5, 46.5)) + tower((50, 93))
    sh += [lbl((15.5, 39.5), "α2", A_COL), lbl((37.5, 32), "α4", A_COL), lbl((71.5, 36.5), "α3", A_COL), lbl((50, 86), "β2", B_COL),
           lbl((84, 82.5), "α1", A_COL)]
    rl = dict(ST=(15.5, 46.5), H2=(37.5, 38.5), MT=(71.5, 42), D1=(50, 93), H1=(84, 90.5))
    rl.update(clump((49.5, 69), ["D3", "D2", "D4"], 3.0, 4.0, 2))
    return a2_board(sh, rl)


def a2_out():
    sh = coil(180)
    sh += [lbl((16.5, 40), "α2", A_COL), lbl((31.5, 32), "α4", A_COL), lbl((71.5, 36.5), "α3", A_COL), lbl((84, 82.5), "α1", A_COL),
           lbl((50, 82), "β1–4", B_COL)]
    rl = dict(ST=(16.5, 46.5), H2=(31.5, 38.5), MT=(71.5, 42), H1=(84, 90.5))
    rl.update(clump((50, 92), ["D1", "D2", "D3", "D4"], 3.2, 4.2, 2))
    return a2_board(sh, rl)


def a2_rule():
    """game8's tower rule picture, its Japanese words left out: the line, and odd / even halves."""
    sh = target_arc()
    for n, c in DROPS.items():
        sh += aoe(c, 9.5, 0.38) + num(c, n)
    sh += [line((6, 70.5), (94, 70.5), "#e8341c", 0.9, 0.95)]
    sh += [arrow((45, 22), (45, 66), "#e8341c", 0.8), arrow((49, 25), (55.5, 46), "#e8341c", 0.8)]
    sh += [text((30, 55), "2 · 4", 3.6, "#ffe14a"), text((62, 84), "1 · 3", 3.6, "#ffe14a")]
    return board(shapes=sh, roles=clump((49, 69), ALL, 3.2, 4.2, 4))


# ================================================================== Grotesquerie: Act 3
def full(bg, **kw):
    F.k = 0.75
    s = {"arena": None, "bg": bg, "waymarks": None}
    s.update(kw)
    return s


RING8 = [("N", (44.5, 28), (52, 28)), ("W", (31, 45), (31, 54)), ("E", (67.5, 46), (67.5, 55)), ("S", (44.5, 72), (52, 72))]


def ring_spots():
    sh = []
    for side, d, t in RING8:
        sh += gD(d) + gTH(t)
        for p in (d, t):
            if side == "N":
                sh += warrow((p[0], p[1] + 4.5), (p[0], p[1] + 12.5))
            elif side == "S":
                sh += warrow((p[0], p[1] - 4.5), (p[0], p[1] - 12.5))
            elif side == "W":
                sh += warrow((p[0] + 3.4, p[1]), (p[0] + 9.6, p[1]))
            else:
                sh += warrow((p[0] - 3.4, p[1]), (p[0] - 9.6, p[1]))
    return sh


def a3_x1():
    sh = bigaoe((30, 9.5), 7, 0.4) + bigaoe((6.5, 32), 6.5, 0.4) + ring_spots()
    return full(GREY_FLOOR, shapes=sh)


def a3_c1():
    sh = bigaoe((10, 12.5), 8.5, 0.4) + warrow((21, 12.5), (14.5, 12.5)) + ring_spots()
    return full(GREY_FLOOR, shapes=sh)


def island(x0, y0, x1, y1):
    F.k = 0.75
    return [rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, (y1 - y0) * 0.75, 0, "#b0b1b5", 1, 0.01),
            rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, (y1 - y0) * 0.75, 0, "#7c7d80", 0.0, 0.35)]


def towered(c, who):
    return tower(c, 4.6) + (gD(c) if who == "D" else gTH(c))


def a3_x2():
    sh = island(-1, -1, 31, 42) + island(69, -1, 101, 42) + island(-1, 59, 31, 101) + island(69, 59, 101, 101)
    sh += towered((27, 5), "D") + warrow((31, 5), (39, 5)) + towered((4, 37.5), "TH") + warrow((7.5, 37.5), (15, 37.5))
    sh += towered((96.5, 5), "D") + warrow((96.5, 9.5), (96.5, 18)) + towered((73, 36.5), "TH") + warrow((73, 41), (73, 50))
    sh += towered((27, 63.5), "D") + warrow((27, 59), (27, 51)) + towered((4, 94), "TH") + warrow((4, 89.5), (4, 81))
    sh += towered((96.5, 64), "D") + warrow((93, 64), (85, 64)) + towered((73, 94), "TH") + warrow((69.5, 94), (61, 94))
    return full(VOID, shapes=sh, waymarks={"A": [50, 4], "D": [15.5, 50], "B": [85.5, 50], "C": [50, 96.5]}, markSize=7)


def a3_c2():
    sh = island(34, -1, 66, 43) + island(-1, 29, 31, 71) + island(69, 29, 101, 71) + island(34, 59, 66, 101)
    sh += towered((37.5, 5), "D") + warrow((37.5, 9.5), (37.5, 18)) + towered((62, 38), "TH") + warrow((62, 42.5), (62, 52))
    sh += towered((27, 34.5), "D") + warrow((30.5, 34.5), (38, 34.5)) + towered((4, 66), "TH") + warrow((7.5, 66), (15, 66))
    sh += towered((96.5, 34), "D") + warrow((93, 34), (85, 34)) + towered((72, 65.5), "TH") + warrow((68.5, 65.5), (61, 65.5))
    sh += towered((38, 64.5), "D") + warrow((38, 60), (38, 51)) + towered((62, 96), "TH") + warrow((62, 91.5), (62, 82))
    return full(VOID, shapes=sh)


def voids(*boxes, col=VOID):
    out = []
    for x0, y0, x1, y1 in boxes:
        out.append(rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, (y1 - y0) * 0.75, 0, col, 1, 0.01))
    return out


X_VOIDS = [(37, -1, 62, 33), (-1, 33, 28, 66), (72, 33, 101, 66), (37, 67, 62, 101)]
C_VOIDS = [(-1, -1, 25, 27), (75, -1, 101, 27), (-1, 73, 25, 101), (75, 73, 101, 101)]


def line_aoe(p, q, wd=12):
    a = ang(p, q)
    L = dist(p, q)
    m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    return [rect(m, wd, L, a, ORANGE, 0.55, 0.01)]


def faded(c, seat):
    return [rect(c, 4.6, 4.6, 0, "#e8d0b0", 0.55, 0.01), text(c, seat, 2.2, "#7a5a3a")]


def a3_x3():
    sh = voids(*X_VOIDS)
    sh += line_aoe((19, 49), (24, -2)) + line_aoe((81, 46), (76, -2))
    sh += arm((19, 49)) + arm((81, 46))
    sh += faded((19.5, 28), "MT") + faded((81, 28), "ST")
    rl = roles(H1=(45, 40.5), H2=(51, 40.5), D1=(39, 47.5), D3=(45, 53.5), D4=(51.5, 53.5), D2=(60, 47.5))
    return full(TAN, shapes=sh, roles=rl)


def a3_x4():
    sh = voids(*X_VOIDS) + arm((19, 47)) + arm((81, 46))
    spots = dict(MT=(34, 5), ST=(66, 5), D1=(34, 38.5), D2=(68, 37.5), D3=(33, 69.5), D4=(68, 69.5))
    for p in spots.values():
        sh += bigaoe(p, 10, 0.42)
    rl = roles(H1=(48.5, 46), H2=(54, 46), **spots)
    return full(TAN, shapes=sh, roles=rl)


def a3_c3():
    sh = voids(*C_VOIDS)
    sh += line_aoe((19, 19), (52, -12), 13) + line_aoe((81, 19), (48, -12), 13)
    sh += arm((19, 19)) + arm((81, 19))
    sh += faded((30, 8), "MT") + faded((70, 8), "ST")
    rl = roles(H1=(47, 49), H2=(54, 49), D1=(40, 56), D3=(49.5, 59), D4=(59, 59), D2=(62, 49))
    return full(TAN, shapes=sh, roles=rl)


def a3_c4():
    sh = voids(*C_VOIDS) + arm((20, 18)) + arm((80, 18))
    spots = dict(MT=(31, 7), ST=(69, 7.5), D1=(29, 33), D2=(71, 33), D3=(29, 69), D4=(70.5, 69.5))
    for p in spots.values():
        sh += bigaoe(p, 9.5, 0.42)
    rl = roles(H1=(47, 49), H2=(53.5, 50), **spots)
    return full(TAN, shapes=sh, roles=rl)


# ================================================================== Curtain Call
CC_C_VOIDS = [(-1, -1, 24, 33), (74, -1, 101, 33), (-1, 67, 24, 101), (74, 67, 101, 101)]
CC_X_VOIDS = [(37, -1, 62, 33), (-1, 35, 25, 68), (75, 35, 101, 68), (37, 69, 62, 101)]
LIGHT_VOID = "#a9a9ab"


def clump4(c):
    return gT((c[0] - 2.8, c[1] - 3.6)) + gH((c[0] + 2.8, c[1] - 3.6)) + gD((c[0] - 2.8, c[1] + 3.6)) + gD((c[0] + 2.8, c[1] + 3.6))


def cc_c1():
    sh = voids(*CC_C_VOIDS)
    for c, r in (((17.5, 7.5), 12), ((28.9, 8.5), 11.4), ((44.5, 8.5), 12.3), ((69.1, 19.4), 11.8), ((54.1, 33), 12.3)):
        sh += bigaoe(c, r, 0.42)
    sh += clump4((49.5, 54))
    return full(TAN, shapes=sh)


def cc_x1():
    sh = voids(*CC_X_VOIDS, col=LIGHT_VOID)
    for c, r in (((3, 11), 12.3), ((17.3, 5.8), 12.3), ((31.6, 5.8), 12.3), ((33, 25), 12.3), ((45.9, 39.6), 12.7)):
        sh += bigaoe(c, r, 0.42)
    sh += clump4((54.5, 58))
    return full(TAN, shapes=sh)


def purple_sq(c):
    return [rect((c[0] + 3.2, c[1] - 3.6), 3.2, 3.2, 0, "#a98cff", 0.95, 0.01)]


def cc_reach(dps_hit, xpat):
    """②: the arm reaches across the west; the purple debuffs stand in its cone, the yellow ones spread on the far side."""
    sh = voids(*(CC_X_VOIDS if xpat else CC_C_VOIDS), col=LIGHT_VOID if xpat else VOID)
    sh += [cone((57, 50), 270, 108, 72, ORANGE, 0.45)]
    sh += arm((68, 52))
    hit = ["D1", "D2", "D3", "D4"] if dps_hit else ["MT", "ST", "H1", "H2"]
    safe = ["MT", "ST", "H1", "H2"] if dps_hit else ["D1", "D2", "D3", "D4"]
    lx = [(27, 4.5), (27, 33), (26.5, 67), (26.5, 96)] if dps_hit else [(26, 4.5), (26, 35), (26, 71), (25.5, 96.5)]
    rx = [(71, 4), (71, 34), (71, 68), (71, 97.5)] if dps_hit else [(75, 4.5), (72.5, 35.5), (72, 70), (75, 96.5)]
    rc = [(68, 5), (68, 34), (68, 68), (68, 97)] if dps_hit else [(70, 5), (70, 34), (69.5, 69), (73, 96)]
    rl = {}
    for s, p in zip(hit, lx):
        rl[s] = p
        sh += purple_sq(p)
    for s, p, c in zip(safe, rx, rc):
        rl[s] = p
        sh += bigaoe(c, 15, 0.4)
    return full(TAN, shapes=sh, roles=roles(**rl))


def cc_c2():
    return cc_reach(True, False)


def cc_x2():
    return cc_reach(False, True)


def cc_gather():
    sh = []
    for c in ((21.5, 7), (11.5, 46), (88, 47.5), (73.5, 94)):
        sh += cellmark(c, 5.2)
    sh += clump4((49.5, 50))
    return full(TAN, shapes=sh)


def cc_tethers():
    sh = []
    for c in ((21.5, 7), (11.5, 46.5), (48, 47.5), (87.5, 48), (73, 94.5)):
        sh += cellmark(c, 5.4)
    seats = dict(MT=(4, 4.5), ST=(4, 36), H1=(3, 66.5), H2=(3, 97.5), D1=(96, 4.5), D2=(96, 36.5), D3=(96, 67), D4=(96, 97.5))
    for p in seats.values():
        sh += [circle(p, 6.8, ORANGE, 0.3, 0.01), ring(p, 6.8, "#ffe2a0", 0.35, 0.9)]
    for a, b in (("MT", "D3"), ("ST", "D1"), ("H1", "D2"), ("H2", "D4")):
        sh += [line(seats[a], seats[b], "#ff22e0", 1.0, 0.95)]
    return full(TAN, shapes=sh, roles=roles(**seats))


def cc_safe(cells_):
    sh = []
    for c, r in cells_:
        sh += bigaoe(c, r, 0.3, 0.7)
    for c, r in cells_:
        sh += cellmark(c, 5.2)
    return full(TAN, shapes=sh)


def cc_safe_a():
    return cc_safe([((21.4, 5.8), 31.4), ((11.8, 46), 31.4), ((48.6, 47.9), 31.4), ((90.9, 52.4), 31.4), ((73.2, 93.6), 31.4)])


def cc_safe_b():
    return cc_safe([((80, 8), 31), ((9.8, 53.2), 31), ((49.3, 47.7), 31), ((90.2, 52.3), 31), ((20, 94.2), 31)])


# ================================================================== Slaughtershed
def sl_gather():
    sh = []
    for c in ((27.5, 35), (56.5, 22), (22.5, 77), (57, 79), (88, 69)):
        sh += cellmark(c, 5.4)
    sh += stack((51, 21.5), 7.2)
    for c in ((48.5, 43), (53.5, 43), (48.5, 50), (53.5, 50)):
        sh += [circle(c, 9.2, ORANGE, 0.2, 0.01), ring(c, 9.2, "#ffe2a0", 0.3, 0.8)]
    rl = roles(MT=(48.5, 18), ST=(53.5, 18), H1=(48.5, 25.5), H2=(53.5, 25.5), D1=(48.5, 43), D2=(53.5, 43), D3=(48.5, 50), D4=(53.5, 50))
    return full(TAN, shapes=sh, roles=rl)


def sl_resolve():
    sh = []
    cl = [((55.5, 22), 29.1), ((24.8, 36.8), 29.1), ((22, 76.9), 29.1), ((57.5, 78.7), 29.1), ((86.8, 66), 29.1)]
    for c, r in cl:
        sh += bigaoe(c, r, 0.3, 0.7)
    for c, r in cl:
        sh += cellmark(c, 5.4)
    sh += stack((5, 6.5), 6.2)
    for c in ((84.5, 3), (97, 4.5), (86.5, 24), (97.5, 25)):
        sh += [circle(c, 8, ORANGE, 0.22, 0.01), ring(c, 8, "#ffe2a0", 0.3, 0.85)]
    rl = roles(MT=(2, 2.5), ST=(7.5, 2.5), H1=(2, 10), H2=(7.5, 10), D1=(84.5, 3), D3=(97, 4.5), D2=(86.5, 24), D4=(97.5, 25))
    return full(TAN, shapes=sh, roles=rl)


def three(c):
    return gT(c[0]) + gD(c[1]) + gH(c[2])


def sl_half(side):
    sh = [rect((26, 50), 52, 75.5, 0, "#ea9440", 1, 0.01)] if side == "west" else [rect((76, 50), 48, 75.5, 0, "#ea9440", 1, 0.01)]
    sh += three([(55.5, 20), (61.5, 25), (55.5, 31)] if side == "west" else [(41.5, 19), (48.5, 26), (41, 32)])
    s = full(TAN, shapes=sh)
    s["boss"] = [52, 1.5]
    s["bossSize"] = 10.5
    return s


def kb(c):
    out = []
    out.append(circle(c, 18, ORANGE, 0.22, 0.01))
    for k in range(12):
        a = k * 30
        for d, w in ((6.0, 3.4), (11.0, 4.4), (16.0, 5.4)):
            out += chevron(off(c, a, d), a, w, w * 0.5, "#ff7a10", 2.2, 0.95)
            out += chevron(off(c, a, d), a, w, w * 0.5, "#fff2d0", 0.8, 0.98)
    return out


def sl_kb(side):
    if side == "east":
        sh = kb((90, 17)) + three([(75, 17), (81.5, 17), (80.5, 26)])
    else:
        sh = kb((5, 17)) + three([(21, 17), (29, 17), (25.5, 28)])
    s = full(TAN, shapes=sh)
    s["boss"] = [52, 1.5]
    s["bossSize"] = 10.5
    return s
