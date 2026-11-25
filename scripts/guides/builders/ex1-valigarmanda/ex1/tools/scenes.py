"""Every scene of the EX1 guide, redrawn from game8's pictures (measured in percent)."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex1/tools")
from shapes import *  # noqa

G8 = lambda n, h: f"https://img.game8.jp/{n}/{h}/show"

ICE_FLOOR = "#5aa8e0"

# ---------------------------------------------------------------- setup
WM_RING = {"A": ((32.4, 33.9), "#ff5f7a"), "1": ((38.6, 39.0), "#ff5f7a"), "B": ((67.7, 34.3), "#f4c85a"), "2": ((61.5, 39.8), "#f4c85a"),
           "D": ((4.0, 51.7), "#d58ae8"), "4": ((38.6, 62.3), "#d58ae8"), "C": ((96.4, 51.4), "#7ab8ff"), "3": ((61.7, 62.3), "#7ab8ff")}

def waymarks():
    s = grid()
    for (x, y), c in WM_RING.values():
        s.append({"t": "ring", "at": [x, y], "r": 3.6, "c": c, "wd": 0.5, "o": 0.9})
    return {"shapes": s}

# ---------------------------------------------------------------- boss motion AoEs
COIL_AT, COIL_R = (50, 51.7), 18.2

def coil_fire():
    s = grid()
    s.append({"t": "donut", "at": list(COIL_AT), "r": 63, "r2": COIL_R, "c": "orange", "o": 0.6})
    s.append({"t": "ring", "at": list(COIL_AT), "r": COIL_R, "c": TAN, "wd": 0.45})
    for c in [(41.3, 40.2), (61.4, 43.3), (40.8, 63.0), (60.2, 59.5)]:
        s += stack(*c, d=7.0)
    return {"shapes": s, "roles": {"MT": [39.2, 40.1], "D1": [43.4, 40.3], "ST": [58.8, 43.2], "D2": [64.0, 43.4],
                                     "H1": [38.2, 63.3], "D3": [43.4, 62.8], "H2": [60.2, 56.8], "D4": [60.2, 62.3]}}

def strike_shapes():
    return [{"t": "circle", "at": [50, 14.2], "r": 55.3, "c": "orange", "o": 0.55}]

def strike_fire():
    s = grid() + strike_shapes()
    s += arc(50, 16.5, 46.6, 90, 270, "#e8306f", wd=0.95, n=40)
    s.append({"t": "line", "from": [3.4, 16.5], "to": [96.6, 16.5], "c": "#e8306f", "wd": 0.95, "o": 0.95})
    for c in [(16.2, 70.3), (37.5, 70.3), (61.0, 70.8), (84.7, 70.7)]:
        s += stack(*c, d=7.0)
    return {"shapes": s, "roles": {"H1": [13.4, 70.5], "D3": [18.9, 70.1], "MT": [35.2, 70.1], "D1": [39.8, 70.5],
                                     "ST": [58.4, 70.7], "D2": [63.6, 71.0], "H2": [84.7, 68.0], "D4": [84.7, 73.5]}}

BREATH = {"at": [50, 7.7], "dir": 180, "spread": 118}

def breath_shapes():
    return [{"t": "cone", **BREATH, "len": 150, "c": "orange", "o": 0.55}] + wedge_edges(BREATH["at"], 180, 118, ln=110)

def breath_fire():
    s = grid() + breath_shapes()
    for c in [(23.2, 17.9), (8.7, 29.4), (79.3, 18.0), (93.4, 27.0)]:
        s += stack(*c, d=6.4)
    return {"shapes": s, "roles": {"MT": [20.8, 17.8], "D1": [25.6, 18.0], "H1": [6.0, 29.8], "D3": [11.4, 29.0],
                                     "ST": [76.7, 17.8], "D2": [81.8, 18.2], "H2": [93.4, 24.1], "D4": [93.4, 29.8]}}

# ---------------------------------------------------------------- Mountain Fire
def mountain(boss, tw, d, spread, intower):
    other = "ST" if intower == "MT" else "MT"
    s = grid()
    s.append({"t": "cone", "at": list(tw), "dir": (d + 180) % 360, "spread": 360 - spread, "len": 76, "c": "orange", "o": 0.6})
    s += wedge_edges(tw, d, spread, ln=95)
    s += tower(*tw)
    s += facing(boss, tw)
    roles = {intower: list(tw), other: along(tw, d, 13.5, 0),
             "D1": along(tw, d, 21, -2.7), "D2": along(tw, d, 21, 2.7),
             "D3": along(tw, d, 28.5, -3.3), "D4": along(tw, d, 28.5, 3.3),
             "H1": along(tw, d, 36, -3.7), "H2": along(tw, d, 36, 3.7)}
    return {"boss": list(boss), "iconSize": 4.8, "shapes": s, "roles": roles}

MF = {
    1: ((50, 6.8), (50, 28.2), 180, 27, "MT"),
    2: ((22.7, 8.0), (50.3, 28.4), 137.4, 29.5, "ST"),
    3: ((68.2, 10.2), (50.3, 27.8), 215.7, 29, "MT"),
    4: ((50, 6.8), (50, 27.8), 180, 27, "ST"),
}

# ---------------------------------------------------------------- Scourge of Fire (fire phase)
FS_W = {1: {"MT": [31.3, 61.7], "H1": [38.1, 63.6], "D1": [44.3, 62.8], "D3": [33.0, 68.0]},
        3: {"MT": [31.6, 44.3], "H1": [38.4, 46.6], "D1": [44.7, 45.8], "D3": [33.3, 50.9]},
        4: {"MT": [30.5, 26.5], "H1": [37.2, 28.6], "D1": [43.5, 27.8], "D3": [32.0, 33.2]}}
FS_E = {1: {"D2": [56.3, 61.7], "H2": [61.9, 62.8], "ST": [68.0, 61.0], "D4": [65.3, 67.8]},
        3: {"D2": [55.7, 45.7], "H2": [61.1, 46.6], "ST": [67.3, 44.7], "D4": [64.8, 51.7]},
        4: {"D2": [54.3, 27.3], "H2": [59.9, 28.8], "ST": [66.3, 26.7], "D4": [63.6, 33.8]}}
FS_MARK = {1: [(37.5, 56.8), (61.4, 56.3)], 3: [(37.5, 39.2), (60.8, 39.8)], 4: [(36.6, 21.6), (59.9, 21.6)]}
PUDDLES = [(37.7, 64.2), (61.6, 64.2), (38.3, 46.4), (62.2, 46.4), (39.2, 26.5), (63.1, 26.5)]

def fire_stack(n):
    """n = 1..5, game8's five pictures."""
    s = grid()
    pos = {1: 1, 2: 1, 3: 3, 4: 4}
    if n == 5:
        for p in PUDDLES:
            s += puddle(*p)
        for p in [(19.3, 30.1), (11.1, 50.0), (80.9, 24.4), (86.4, 46.0)]:
            s += ice_mark(*p)
        return {"shapes": s, "roles": {"D1": [20.2, 36.4], "MT": [9.7, 42.6], "H1": [16.3, 44.5], "D3": [11.4, 56.0],
                                         "D2": [81.3, 30.9], "ST": [92.0, 37.3], "H2": [85.5, 39.2], "D4": [86.7, 52.0]}}
    k = pos[n]
    for p in PUDDLES[: {1: 0, 2: 0, 3: 2, 4: 4}[n]]:
        s += puddle(*p)
    if n >= 2:
        s += stack(*FS_W[k]["H1"], d=10.0, w=5.0, h=2.4)
        s += stack(*FS_E[k]["H2"], d=10.0, w=5.0, h=2.4)
    for m in FS_MARK[k]:
        s += fire_mark(*m)
    return {"shapes": s, "roles": {**FS_W[k], **FS_E[k]}}

# ---------------------------------------------------------------- Scourge of Thunder (fire phase)
def thunder_fire():
    roles = {"D1": [16.3, 26.9], "MT": [37.5, 27.3], "ST": [60.5, 27.3], "D2": [83.5, 26.7],
             "D3": [17.8, 48.0], "H1": [36.6, 49.7], "H2": [61.0, 50.2], "D4": [83.8, 49.1]}
    s = grid()
    for p in roles.values():
        s += thunder_aoe(p[0], p[1])
    for p in roles.values():
        s += thunder_mark(p[0], p[1] - 5.6)
    return {"shapes": s, "roles": roles}

# ---------------------------------------------------------------- Ruin Foretold
RF_APEX = (50, 15.9)
RF_CONES_A = [(90.5, 104), (116, 129.5), (140.5, 153), (162, 175.5), (187, 200), (217, 229), (244.5, 257)]
RF_CONES_B = [(103, 116), (128, 140), (151.5, 164), (173, 186), (197.5, 211), (228, 240.5), (256.5, 269.5)]

def ruin(n):
    cones = RF_CONES_B if n == 3 else RF_CONES_A
    s = grid()
    for a0, a1 in cones:
        s.append({"t": "cone", "at": list(RF_APEX), "dir": round((a0 + a1) / 2, 2), "spread": round(a1 - a0, 2), "len": 130, "c": "orange", "o": 0.6})
    for a0, a1 in cones:
        s += wedge_edges(RF_APEX, (a0 + a1) / 2, a1 - a0, ln=120, wd=0.3)
    s += beacon(27.0, 30.5, "#e0202a")
    s += beacon(74.4, 30.5, "#58b4ef")
    s += beacon(50.0, 55.1, "#6a1fa0")
    if n == 3:
        roles = {"MT": [34.1, 35.6], "D1": [29.9, 39.5], "D3": [30.5, 44.7], "H1": [24.4, 49.8],
                 "ST": [66.8, 39.8], "D2": [71.8, 44.3], "D4": [76.4, 46.6], "H2": [79.0, 52.8]}
    else:
        roles = {"MT": [37.3, 37.8], "D1": [33.2, 42.0], "D3": [33.8, 47.2], "H1": [27.5, 52.3],
                 "ST": [73.1, 37.7], "D2": [77.8, 42.3], "D4": [82.6, 44.5], "H2": [84.9, 51.1]}
    if n >= 2:
        s += line_stack(roles["MT"], roles["H1"], off=5.0, w=4.4, h=2.1)
        s += line_stack(roles["ST"], roles["H2"], off=5.0, w=4.4, h=2.1)
    return {"shapes": s, "roles": roles}

# ---------------------------------------------------------------- lightning phase
def lightning_fire():
    s = green_tiles() + grid()
    s += stack(38.0, 70.3, d=10.8, w=5.0, h=2.4)
    s += stack(63.0, 70.3, d=10.8, w=5.0, h=2.4)
    s += fire_mark(37.5, 58.2) + fire_mark(61.9, 58.2)
    return {"shapes": s, "roles": {"D1": [34.7, 67.0], "MT": [41.1, 67.0], "D3": [34.7, 73.1], "H1": [41.5, 73.1],
                                     "ST": [59.3, 67.0], "D2": [66.5, 67.3], "D4": [59.7, 73.1], "H2": [66.5, 73.1]}}

FALL_E = {1: (85.0, 51.4), 2: (62.5, 75.0), 3: (38.3, 75.0), 4: (15.9, 51.4), 5: (38.3, 28.2), 6: (62.3, 28.2)}

def cluster(x0, y0, cols=2, dx=4.2, dy=4.2, order=("MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4")):
    out = {}
    for i, seat in enumerate(order):
        out[seat] = [round(x0 + (i % cols) * dx, 2), round(y0 + (i // cols) * dy, 2)]
    return out

def ellipse_path(a0, a1, c=(50.0, 50.5), rx=43.0, ry=34.0, step=5):
    import math
    pts = []
    a = a0
    while a <= a1:
        t = math.radians(a)
        pts.append((round(c[0] + rx * math.sin(t), 2), round(c[1] - ry * math.cos(t), 2)))
        a += step
    return pts

def feathers(side):
    s = green_tiles() + grid()
    if side == "east":
        fall = FALL_E
        start = cluster(6.2, 56.8, cols=4)
        end = cluster(55.4, 79.8, cols=4)
        arrow = ellipse_path(-78, 145)
    else:
        fall = {k: (round(100 - x, 2), y) for k, (x, y) in FALL_E.items()}
        start = cluster(81.2, 56.8, cols=4)
        end = cluster(32.2, 79.8, cols=4)
        arrow = [(round(100 - x, 2), y) for x, y in ellipse_path(-78, 145)]
    for k, (x, y) in fall.items():
        s += falloff(x, y, k)
    s += path(arrow, c="#e8452a", wd=1.0)
    roles = {seat: [start[seat], end[seat]] for seat in start}
    return {"iconSize": 4.0, "shapes": s, "roles": roles}

def lightning_thunder_ice():
    s = green_tiles() + grid()
    for p in [(38.4, 32.0), (61.4, 31.6), (38.1, 75.3), (62.5, 75.2)]:
        s += thunder_aoe(*p)
    for p in [(38.4, 23.6), (61.4, 24.0), (38.4, 67.8), (62.3, 68.6)]:
        s += thunder_mark(*p)
    for p in [(15.3, 23.3), (85.2, 22.7), (15.3, 70.5), (85.8, 69.9)]:
        s += ice_mark(*p)
    return {"shapes": s, "roles": {"MT": [38.4, 30.1], "ST": [61.4, 30.5], "H1": [38.4, 74.4], "H2": [62.3, 75.2],
                                     "D1": [15.3, 30.1], "D2": [85.8, 29.2], "D3": [15.3, 77.8], "D4": [86.7, 77.0]}}

def lightning_coil():
    roles = {"MT": [45.5, 45.5], "D1": [50.0, 45.5], "ST": [54.8, 45.7], "D2": [60.2, 42.6],
             "H1": [48.6, 49.7], "H2": [56.5, 49.8], "D3": [46.9, 53.2], "D4": [53.8, 53.8]}
    s = green_tiles() + grid()
    s.append({"t": "donut", "at": list(COIL_AT), "r": 63, "r2": COIL_R, "c": "orange", "o": 0.6})
    s.append({"t": "ring", "at": list(COIL_AT), "r": COIL_R, "c": TAN, "wd": 0.45})
    for p in roles.values():
        s += drop(*p, r=8.0)
    return {"iconSize": 5.0, "shapes": s, "roles": roles}

def lightning_strike():
    roles = {"MT": [35.0, 73.0], "D1": [39.4, 73.3], "H1": [31.5, 76.7], "D3": [37.5, 78.4],
             "D2": [65.3, 73.6], "H2": [71.6, 73.3], "ST": [68.2, 76.4], "D4": [76.9, 75.9]}
    s = green_tiles() + grid() + strike_shapes()
    for p in roles.values():
        s += drop(*p, r=8.0)
    return {"iconSize": 5.0, "shapes": s, "roles": roles}

def lightning_breath():
    roles = {"MT": [17.3, 19.9], "D1": [24.8, 18.4], "D3": [12.5, 23.1], "H1": [8.3, 26.9],
             "ST": [76.7, 18.2], "D4": [81.8, 21.0], "D2": [85.8, 23.1], "H2": [86.6, 27.0]}
    s = green_tiles() + grid() + breath_shapes()
    for p in roles.values():
        s += drop(*p, r=8.0)
    return {"iconSize": 5.0, "shapes": s, "roles": roles}

# ---------------------------------------------------------------- ice phase
def ice_fire_ice():
    s = grid(c="#101112", wd=0.4)
    for p in [(5.7, 18.5), (94.9, 18.2)]:
        s.append({"t": "circle", "at": list(p), "r": 38.4, "c": "#f5b860", "o": 0.6})
        s.append({"t": "ring", "at": list(p), "r": 38.4, "c": TAN, "wd": 0.45})
    s += ice_mark(4.8, 11.4) + ice_mark(94.3, 10.8)
    s += stack(38.3, 63.0, d=8.8, dirs=(90, 180, 270), w=5.0, h=2.4)
    s += stack(62.3, 63.5, d=8.8, dirs=(90, 180, 270), w=5.0, h=2.4)
    s += fire_mark(38.1, 52.8) + fire_mark(61.4, 52.8)
    return {"arena": {"fill": ICE_FLOOR}, "shapes": s,
            "roles": {"MT": [5.7, 18.5], "ST": [94.9, 18.2], "D1": [35.6, 58.8], "D3": [41.7, 59.6], "H1": [38.3, 64.5],
                      "D2": [58.3, 60.0], "D4": [65.0, 59.4], "H2": [62.3, 65.0]}}

ORBS_A = [(60.8, 21.6), (4.5, 44.9), (80.1, 56.0), (53.4, 69.0), (93.2, 80.9)]

def ice_safe(mark):
    orbs = ORBS_A if mark == "A" else [(round(100 - x, 2), y) for x, y in ORBS_A]
    safe = (32.4, 33.9) if mark == "A" else (67.7, 33.9)
    s = grid(c="#6b5a3c", wd=0.35, o=0.8)
    s.append({"t": "rect", "at": [safe[0], safe[1]], "w": 7.4, "h": 4.4, "rot": 45 if mark == "A" else -45, "c": "#4da3ff", "o": 0.95})
    for o in orbs:
        s += star(*o)
    for o in orbs:
        s += orb(*o)
    s.append({"t": "ring", "at": [safe[0], safe[1]], "r": 5.2, "c": "#4da3ff", "wd": 0.6})
    return {"arena": {"fill": "#c2ad86"}, "shapes": s}

def ice_thunder():
    s = grid(c="#101112", wd=0.4)
    for p in [(17.6, 25.9), (84.7, 25.9), (15.3, 49.7), (80.5, 52.0)]:
        s += thunder_aoe(*p)
    for p in [(17.0, 19.0), (84.0, 19.0), (14.5, 42.8), (79.5, 45.0)]:
        s += thunder_mark(*p)
    return {"arena": {"fill": ICE_FLOOR}, "shapes": s,
            "roles": {"MT": [17.4, 26.4], "ST": [84.3, 26.7], "H1": [14.5, 50.8], "H2": [80.1, 52.0],
                      "D3": [47.5, 40.7], "D1": [43.2, 44.9], "D4": [54.2, 42.3], "D2": [50.0, 46.6]}}
