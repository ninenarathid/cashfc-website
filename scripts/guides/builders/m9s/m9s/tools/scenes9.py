"""Every scene of the M9S (Vamp Fatale) guide, redrawn from game8's strategy-board pictures.

Frames: 4:3 (game8's 440x330) unless said; x in % of the width, y in % of the height, sizes in %
of the width (a span of dy % of the height is dy * K of the width). Measured on 2.5 % grid sheets
(dl/grid) and checked with build.mjs --compare.

Waymarks: game8's own waymark picture (the first step) uses the layout xivjpraids calls "Red is
North" (A and 1 north, B and 2 east, C and 3 south, D and 4 west). game8 says some of its pictures
place the waymarks differently and asks readers to read them in the first picture's order; the
Vamp Stomp boards use Nukemaru's numbering, so here only their numbers are put back in that order
(A, B, C, D and all eight spots stay where game8 drew them).
"""
import math

R = lambda v: round(v, 2)
K = 0.75

ORANGE = "#ff9b3d"
ORANGE_RIM = "#ffc070"
TOWER = "#8a3a1a"
RED = "#ff4d4d"
CYAN_HI = "#9fe8ef"

# ------------------------------------------------------------------ waymark layouts
# The square board (Vamp Stomp), 4:3.
WM_SQ = {"A": [30.9, 5.6], "1": [68.7, 5.2], "4": [15.9, 25.2], "B": [83.5, 24.8],
         "D": [16.7, 75.7], "2": [84.0, 74.8], "3": [36.0, 94.2], "C": [68.5, 93.9]}
# The round board (Aetherletting, Hell in a Cell), 4:3.
WM_RD = {"A": [33.9, 5.3], "1": [68.2, 6.2], "4": [16.2, 28.6], "B": [83.9, 29.5],
         "D": [16.4, 71.4], "2": [84.0, 71.9], "3": [31.3, 92.4], "C": [68.5, 93.6]}
WM_AE = {"A": [33.9, 4.6], "1": [68.2, 5.6], "4": [15.9, 28.5], "B": [84.1, 29.3],
         "D": [16.8, 71.2], "2": [84.1, 72.0], "3": [31.3, 91.8], "C": [68.5, 94.0]}


def off(c, ang, r):
    """A point r (in % of the width) from c towards ang (0 = up, clockwise), in a 4:3 frame."""
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / K)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.0, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def rect(cx, cy, w, h, col, o=1.0, wd=0.01):
    return {"t": "rect", "at": [R(cx), R(cy)], "w": R(w), "h": R(h), "c": col, "o": o, "wd": wd, "rot": 0}


def cone(at, a0, a1, ln, col=ORANGE, o=0.45):
    """A cone from bearing a0 clockwise to a1."""
    spread = (a1 - a0) % 360
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R((a0 + spread / 2) % 360), "spread": R(spread),
            "len": R(ln), "c": col, "o": o, "wd": 0.01}


def aoe(c, r, o=0.42):
    """An orange circle AoE as the board draws it: soft fill, bright rim."""
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, ORANGE_RIM, 0.45, 0.95)]


def chevron(c, ang, w=3.4, h=1.5, col="#ffb52e", wd=0.85, o=0.98):
    """A ^ pointing towards ang, centred on c."""
    tip = off(c, ang, h / 2)
    back = off(c, ang + 180, h / 2)
    l = off(back, ang - 90, w / 2)
    r = off(back, ang + 90, w / 2)
    return [line(l, tip, col, wd, o), line(r, tip, col, wd, o)]


def stack_marker(c):
    """The board's stack marker: three chevrons on each of four arms, pointing in."""
    out = [circle(c, 8.5, "#ff9b3d", 0.22, 0.01)]
    for a in (0, 90, 180, 270):
        for k in range(3):
            p = off(c, a, 7.2 - k * 2.2)
            out += chevron(p, a + 180, 3.6, 1.6, "#ff7a1a", 1.4, 0.95)
            out += chevron(p, a + 180, 3.6, 1.6, "#ffe066", 0.6, 1)
    return out


# ------------------------------------------------------------------ the square board (Vamp Stomp)
SQ_ARENA = {"shape": "square", "at": [50, 50], "w": 68, "h": 68, "fill": "#a7a9ae", "lines": False, "edge": "#e4e4e8"}


def sq_floor(inner=True):
    """The floor's 4 x 4 tiles, and the inner four tiles lit as the board lights them."""
    out = []
    x0, x1 = 16, 84
    y0, y1 = 50 - 34 / K, 50 + 34 / K
    for k in (1, 2, 3):
        x = x0 + 17 * k
        y = y0 + (y1 - y0) / 4 * k
        out.append(line((x, y0), (x, y1), "#ffffff", 0.22, 0.35))
        out.append(line((x0, y), (x1, y), "#ffffff", 0.22, 0.35))
    if inner:
        out.append(rect(50, 50.3, 30, 30, CYAN_HI, 0.35))
    return out


def bat(c):
    return [dot(c, 1.9, "#b3262e"), ring(c, 1.9, "#ffffff", 0.25, 0.9)]


def vs_base(roles, shapes, boss=(50, 49.5), inner=True):
    s = {"arena": SQ_ARENA, "waymarks": WM_SQ, "bossSize": 8, "iconSize": 5.6, "markSize": 7.6,
         "roles": {k: [R(v[0]), R(v[1])] for k, v in roles.items()}, "shapes": sq_floor(inner) + shapes}
    if boss:
        s["boss"] = [boss[0], boss[1]]
    return s


# Where everyone waits (game8's pictures, measured one by one).
VS_ROLES = {
    5: {"MT": (50, 24.6), "ST": (49.8, 78), "D1": (28.8, 50.5), "D2": (70.7, 52), "D3": (23.3, 13.4), "D4": (79.5, 11.2), "H1": (20.8, 88.2), "H2": (77.3, 87.9)},
    6: {"MT": (50, 25), "ST": (50, 77.8), "D1": (25.7, 50.1), "D2": (73.9, 50.8), "D3": (23.2, 13.2), "D4": (79.8, 11), "H1": (20.8, 88.4), "H2": (77.6, 87.7)},
    7: {"MT": (50, 25.2), "ST": (49.7, 78), "D1": (28.8, 50.3), "D2": (70.5, 52.1), "D3": (23.3, 13.7), "D4": (79.5, 11.4), "H1": (20.8, 88.4), "H2": (77.3, 88)},
    8: {"MT": (50, 25.3), "ST": (49.7, 77.6), "D1": (28.8, 50.3), "D2": (70.7, 52.1), "D3": (23.3, 12.4), "D4": (79.5, 10.9), "H1": (20.8, 88.2), "H2": (77.3, 87.9)},
}
VS_BATS = {5: [(50, 41.5), (50, 61.5)], 6: [(40.9, 49.6), (59.1, 49.6)], 7: [(56.8, 39.6), (43, 58.2)], 8: [(43, 40.5), (56.8, 57.9)]}
VS_R = {5: 11.7, 6: 12, 7: 11.5, 8: 11.5}


def vs_pattern(n):
    shapes = []
    for b in VS_BATS[n]:
        shapes += aoe(b, VS_R[n])
    for b in VS_BATS[n]:
        shapes += bat(b)
    return vs_base(VS_ROLES[n], shapes)


def vs1():
    """① game8's own board of the opening: the ring from the boss, everyone in place."""
    roles = {"MT": (50, 30.1), "ST": (49.7, 70.6), "D1": (35.2, 50.5), "D2": (64.2, 50), "D3": (23.3, 13.3),
             "D4": (79.5, 10.7), "H1": (20.8, 88.7), "H2": (77.3, 87.9)}
    shapes = [circle((50, 50.5), 16.8, "#ffb04d", 0.22, 0.01), ring((50, 50.5), 16.8, "#ffb04d", 0.7, 0.95),
              circle((50, 50.3), 2.6, "#ffcf33", 1, 0.01), ring((50, 50.3), 3.4, "#ff8a1a", 0.5, 0.9)]
    s = vs_base(roles, shapes, boss=(50, 50), inner=False)
    s["bossSize"] = 9
    return s


def vs2():
    """② the ring reaches the inner tiles: the four in the middle go off."""
    roles = {"MT": (50, 29.6), "ST": (50, 71.8), "D1": (35.2, 51), "D2": (65.9, 51), "D3": (23.3, 12.7),
             "D4": (79.5, 10.3), "H1": (20.8, 89.5), "H2": (77.3, 88.6)}
    shapes = []
    for c in ((50, 30.8), (35.6, 50.8), (66.3, 50.8), (50, 72.2)):
        shapes += aoe(c, 15.3, 0.4)
    shapes.append(circle((50, 50.6), 1.8, "#ffcf33", 1, 0.01))
    return vs_base(roles, shapes, boss=None)


def vs3():
    """③ the ring at the edge: the four in the corners go off, the rest under the boss."""
    roles = {"MT": (50, 30), "ST": (48.3, 51.7), "D1": (41.5, 42.9), "D2": (57.4, 45.6), "D3": (25.9, 18.1),
             "D4": (75.6, 16.3), "H1": (24.8, 82.4), "H2": (74.4, 80.5)}
    shapes = [circle((50, 50.5), 37.8, "#ffd9a0", 0.2, 0.01), ring((50, 50.5), 37.8, "#ffc070", 0.35, 0.7),
              circle((50, 52), 8, "#ffe48a", 0.3, 0.01), ring((50, 52), 8, "#ffd04d", 0.35, 0.8)]
    for c in ((26.1, 20.6), (75.2, 20.2), (25, 81), (74.5, 80.9)):
        shapes += aoe(c, 15.9, 0.42)
    return vs_base(roles, shapes, boss=(50, 38.4), inner=False)


def vs4():
    """④ Brutal Rain: everyone into the stack on a healer."""
    c = (50, 58.2)
    s = vs_base({}, stack_marker(c), boss=(50, 38.6), inner=False)
    del s["roles"]
    return s


# ------------------------------------------------------------------ the round board
RD_ARENA = {"shape": "circle", "at": [50.1, 50.3], "r": 34.6, "fill": "#b8babe", "lines": False, "edge": "#ececef"}


def rd_ticks():
    """The small marks on the board's rim, every 45 degrees."""
    out = []
    for a in range(0, 360, 45):
        p0 = off((50.1, 50.3), a, 33.4)
        p1 = off((50.1, 50.3), a, 34.6)
        out.append(line(p0, p1, "#3a3a40", 0.45, 0.9))
    return out


def rd_base(roles, shapes, boss=(50, 49.5), wm=WM_RD, arena=None):
    s = {"arena": arena or RD_ARENA, "waymarks": wm, "boss": [boss[0], boss[1]], "bossSize": 7.5, "iconSize": 5.4,
         "markSize": 7.4, "shapes": rd_ticks() + shapes}
    if roles:
        s["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    return s


# Aetherletting: the drop spots where the cones' gaps meet the edge.
AE_BOSS = (50, 47.6)
AE_DOTS = {"A": (35.8, 7.6), "1": (65.6, 8.2), "4": (18.75, 30.8), "B": (82.8, 33.5), "D": (17, 65.5),
           "2": (81.6, 68.4), "3": (34.9, 92.5), "C": (65, 91)}
AE_ROLES = {"MT": (34.1, 12.5), "D4": (65.3, 12.9), "D3": (21.6, 33.5), "H2": (79, 34.1), "H1": (20.5, 69.7),
            "D2": (79.5, 68.6), "D1": (34.1, 86.9), "ST": (65.7, 87.5)}


def aetherletting():
    shapes = [circle((50.1, 50.3), 34.6, "#ff9b3d", 0.38, 0.01)]
    for p in AE_DOTS.values():
        shapes.append(line(AE_BOSS, p, "#ff7f11", 1.0, 0.95))
    for p in AE_DOTS.values():
        shapes.append(dot(p, 1.1, "#7fdcff"))
    return rd_base(AE_ROLES, shapes, boss=AE_BOSS, wm=WM_AE)


def tower(c, r=5.9):
    return [circle(c, r, "#5a2a16", 0.35, 0.01), ring(c, r, TOWER, 1.3, 0.95)]


HC_MT_TOWERS = {"MT": (49.7, 21.8), "D1": (69.3, 50.3), "D3": (61, 66.2), "H1": (37.3, 66.2)}
HC_ST_TOWERS = {"H2": (37.5, 24.7), "ST": (62.8, 24.7), "D4": (31, 49.8), "D2": (50, 75.8)}


def hc_order():
    """game8's tower-order board: the ST group's set drawn, the order written on it."""
    B = (50, 50)
    towers = {"ST": (63.1, 24.8), "H2": (36.4, 24.8), "D4": (31.6, 50), "D2": (50, 75.5)}
    others = {"H1": (50, 32.7), "MT": (63.1, 53), "D1": (40.3, 63.3), "D3": (35.5, 70.6)}
    shapes = [cone(B, 347.2, 17.6, 41), cone(B, 67, 148.2, 43), cone(B, 204.5, 241.5, 40)]
    for c in towers.values():
        shapes += tower(c, 5.4)
    shapes += [line(B, (50, 5.5), RED, 0.55, 0.95), line(B, (35.2, 7.5), RED, 0.55, 0.95)]
    for a, b in (((68.2, 35.4), (73.9, 51.5)), ((68.2, 63), (59.1, 73.7)), ((43.2, 75.5), (30.5, 62.2)),
                 ((30.7, 43.1), (37.5, 30.9))):
        shapes.append(arrow(a, b, RED, 1.0, 0.95))
    shapes += [text((50, 3.4), "12 o'clock", 2.9, RED),
               text((84.5, 8.4), "Clockwise from 12", 2.8, RED),
               text((84.5, 14.2), "T > Melee > Range > H", 2.6, RED),
               text((15.5, 13.6), "Healer: 1st tower", 2.7, RED),
               text((15.5, 18.6), "CCW from 11 o'clock", 2.7, RED),
               text((68.6, 21.2), "T", 3.4, RED), text((33.6, 20.8), "H", 3.4, RED),
               text((30.6, 45.6), "Range", 3.0, RED), text((50.6, 68.4), "Melee", 3.0, RED)]
    roles = {**towers, **others}
    return rd_base(roles, shapes, boss=B)


def hc1():
    """① MT group in the towers, Ultrasonic Spread."""
    B = (50, 49.5)
    shapes = [cone(B, 250.1, 340.6, 48), cone(B, 17.1, 61.6, 48), cone(B, 160.8, 201.6, 48)]
    for c in HC_MT_TOWERS.values():
        shapes += tower(c)
    roles = {**HC_MT_TOWERS, "ST": (41.5, 45), "D2": (56.3, 39.7), "D4": (60.8, 34.4), "H2": (49.8, 60.9)}
    return rd_base(roles, shapes, boss=B)


def hc2():
    """② MT group in the towers, Ultrasonic Amp: the ST group stacks in the widest gap."""
    B = (50, 49.5)
    shapes = [cone(B, 250.1, 339.9, 48)]
    for c in HC_MT_TOWERS.values():
        shapes += tower(c)
    roles = {**HC_MT_TOWERS, "D2": (36.1, 37.4), "D4": (41.1, 37.4), "H2": (36.1, 45.3), "ST": (41.8, 45.3)}
    return rd_base(roles, shapes, boss=B)


def hc3():
    """③ ST group in the towers, Ultrasonic Spread."""
    B = (50, 49.4)
    shapes = [cone(B, 346.5, 17.9, 41), cone(B, 66, 150, 43), cone(B, 207.1, 241.4, 40)]
    for c in HC_ST_TOWERS.values():
        shapes += tower(c)
    roles = {**HC_ST_TOWERS, "H1": (50, 33.1), "MT": (63.3, 54.4), "D1": (40.3, 63.1), "D3": (35.5, 70)}
    return rd_base(roles, shapes, boss=B)


def hc4():
    """④ ST group in the towers, Ultrasonic Amp: the MT group stacks in the widest gap."""
    B = (50, 49.4)
    shapes = [cone(B, 61.5, 148.9, 43)]
    for c in HC_ST_TOWERS.values():
        shapes += tower(c)
    roles = {**HC_ST_TOWERS, "MT": (62.3, 53.9), "D1": (68, 52.4), "H1": (68.2, 56.2), "D3": (67.3, 60.7)}
    return rd_base(roles, shapes, boss=B)


# ------------------------------------------------------------------ square frames (1:1)
def waymarks():
    """game8's waymark picture: the real floor, 4 x 4 tiles."""
    x0, x1, y0, y1 = 5.25, 94.75, 5.55, 95.05
    shapes = []
    for k in (1, 2, 3):
        x = x0 + (x1 - x0) / 4 * k
        y = y0 + (y1 - y0) / 4 * k
        shapes.append(line((x, y0), (x, y1), "#b98ee6", 0.45, 0.75))
        shapes.append(line((x0, y), (x1, y), "#b98ee6", 0.45, 0.75))
    wm = {"A": [33.9, 12.2], "1": [66.6, 12.2], "4": [12.3, 35.1], "B": [89.5, 35],
          "D": [12.3, 65.6], "2": [89.3, 66.1], "3": [33.5, 88], "C": [66.4, 88]}
    col = {"A": "#ff5f7a", "1": "#ff5f7a", "B": "#f4e66a", "2": "#f4e66a", "C": "#7ab8ff", "3": "#7ab8ff",
           "D": "#d58ae8", "4": "#d58ae8"}
    for k, p in wm.items():
        shapes.append(ring(p, 3.6, col[k], 0.5, 0.9))
    return {"frame": [1, 1], "arena": {"shape": "square", "at": [50, 50.3], "w": 89.5, "h": 89.5, "fill": "#3b3442",
            "lines": False, "edge": "#2a2530"}, "waymarks": wm, "markSize": 6.4, "shapes": shapes}


def screech2():
    """The second Sadistic Screech: the long arena split in two, and who breaks what."""
    x0, x1, y0, y1 = 26.3, 75.0, 2.0, 98.2
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    shapes = [line((cx, y0), (cx, y1), "#b98ee6", 0.4, 0.7)]
    for y in (26.0, cy, 74.1):
        shapes.append(line((x0, y), (x1, y), "#b98ee6", 0.4, 0.7))
    G, B = "#2ee04a", "#3d8bff"
    for (a, b, c) in (((x0, y0), (x1, y0), G), ((x1, y0), (x1, cy), G), ((x1, cy), (x0, cy), G), ((x0, cy), (x0, y0), G),
                      ((x0, cy + 0.6), (x1, cy + 0.6), B), ((x1, cy + 0.6), (x1, y1), B), ((x1, y1), (x0, y1), B),
                      ((x0, y1), (x0, cy + 0.6), B)):
        shapes.append(line(a, b, c, 1.0, 1))
    shapes += [rect(cx, 49.7, 40, 18.5, "#141218", 0.72),
               text((cx, 11.5), "North: MT group", 4.4, G), text((cx, 91.5), "South: ST group", 4.4, "#4da3ff"),
               text((cx, 43.6), "Tower: Tank", 3.4, "#ff8cc6"), text((cx, 49.7), "Fatal Flail: Melee", 3.4, "#ff8cc6"),
               text((cx, 55.8), "Deadly Doornail: Range", 3.4, "#ff8cc6")]
    roles = {"MT": (34.2, 33.5), "H1": (44.8, 33.5), "D1": (55.4, 33.5), "D3": (66, 33.5),
             "ST": (34.2, 66.5), "H2": (44.8, 66.5), "D2": (55.4, 66.5), "D4": (66, 66.5)}
    return {"frame": [1, 1], "arena": {"shape": "square", "at": [R(cx), R(cy)], "w": R(x1 - x0), "h": R(y1 - y0),
            "fill": "#3b3442", "lines": False, "edge": "#2a2530"}, "waymarks": None, "iconSize": 7,
            "roles": {k: [R(v[0]), R(v[1])] for k, v in roles.items()}, "shapes": shapes}
