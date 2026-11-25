"""Shape helpers for the EX1 Valigarmanda scenes (percent of a 1:1 frame)."""
import math

R = lambda v: round(v, 2)

CHEV = "#ffd23f"
GRID = "#141516"
GREEN = "#1aa565"
EDGE = "#f4e2a0"
PURPLE = "#a2479a"
TAN = "#f2d68a"

# Arena (game8: 4 x 3 tiles)
AX0, AX1, AY0, AY1 = 4.0, 96.4, 16.5, 85.6
VX = [27.0, 50.0, 73.1]
HY = [39.5, 62.5]
COLS = [(AX0, VX[0]), (VX[0], VX[1]), (VX[1], VX[2]), (VX[2], AX1)]
ROWS = [(AY0, HY[0]), (HY[0], HY[1]), (HY[1], AY1)]


def unit(a):
    t = math.radians(a)
    return math.sin(t), -math.cos(t)


def ang(p, q):
    """Compass angle from p to q (0 = up, clockwise)."""
    return math.degrees(math.atan2(q[0] - p[0], -(q[1] - p[1]))) % 360


def grid(c=GRID, wd=0.35, o=0.9):
    out = []
    for x in VX:
        out.append({"t": "line", "from": [x, AY0], "to": [x, AY1], "c": c, "wd": wd, "o": o})
    for y in HY:
        out.append({"t": "line", "from": [AX0, y], "to": [AX1, y], "c": c, "wd": wd, "o": o})
    return out


def tile(r, c, color=GREEN, o=1):
    (x0, x1), (y0, y1) = COLS[c], ROWS[r]
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(x1 - x0), "h": R(y1 - y0), "c": color, "o": o}


def green_tiles():
    """Lightning phase: the levitation tiles, a checkerboard."""
    return [tile(r, c) for r, c in [(0, 0), (0, 3), (1, 1), (1, 2), (2, 0), (2, 3)]]


def chevron(cx, cy, a, d, w=4.6, h=2.2, c=CHEV, wd=0.95, double=True, gap=1.7):
    """A chevron at distance d from (cx,cy) in direction a, pointing at the centre."""
    ux, uy = unit(a)
    vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
    out = []
    for k in ([0, gap] if double else [0]):
        dd = d + k
        tip = (cx + ux * (dd - h / 2), cy + uy * (dd - h / 2))
        w1 = (cx + ux * (dd + h / 2) + vx * w / 2, cy + uy * (dd + h / 2) + vy * w / 2)
        w2 = (cx + ux * (dd + h / 2) - vx * w / 2, cy + uy * (dd + h / 2) - vy * w / 2)
        for wpt in (w1, w2):
            out.append({"t": "line", "from": [R(wpt[0]), R(wpt[1])], "to": [R(tip[0]), R(tip[1])], "c": c, "wd": wd, "o": 0.95})
    return out


def stack(cx, cy, d=6.2, dirs=(0, 90, 180, 270), **kw):
    out = []
    for a in dirs:
        out += chevron(cx, cy, a, d, **kw)
    return out


def line_stack(p0, p1, fracs=(0.12, 0.5, 0.88), off=4.6, **kw):
    """Chevrons on both sides of the line p0-p1, pointing at it."""
    out = []
    a = ang(p0, p1)
    for f in fracs:
        cx = p0[0] + (p1[0] - p0[0]) * f
        cy = p0[1] + (p1[1] - p0[1]) * f
        for side in (a + 90, a - 90):
            out += chevron(cx, cy, side % 360, off, **kw)
    return out


def arc(cx, cy, r, a0, a1, c, wd=0.6, o=0.95, n=None):
    n = n or max(3, int(abs(a1 - a0) / 6))
    pts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        ux, uy = unit(a)
        pts.append((cx + ux * r, cy + uy * r))
    return [{"t": "line", "from": [R(p[0]), R(p[1])], "to": [R(q[0]), R(q[1])], "c": c, "wd": wd, "o": o} for p, q in zip(pts, pts[1:])]


def path(points, c="#e8452a", wd=1.0, o=0.95):
    out = []
    for p, q in zip(points, points[1:]):
        out.append({"t": "line", "from": [R(p[0]), R(p[1])], "to": [R(q[0]), R(q[1])], "c": c, "wd": wd, "o": o})
    out[-1]["t"] = "arrow"
    return out


def fire_mark(x, y):
    return [{"t": "dot", "at": [R(x), R(y)], "r": 2.9, "c": "#d9541e"},
            {"t": "ring", "at": [R(x), R(y)], "r": 2.9, "c": "#ffc46b", "wd": 0.5},
            {"t": "dot", "at": [R(x), R(y)], "r": 1.1, "c": "#ffe3a3"}]


def thunder_mark(x, y):
    return [{"t": "dot", "at": [R(x), R(y)], "r": 2.7, "c": "#5b2a9e"},
            {"t": "ring", "at": [R(x), R(y)], "r": 2.7, "c": "#c9a2ff", "wd": 0.5},
            {"t": "dot", "at": [R(x), R(y)], "r": 0.9, "c": "#f0e2ff"}]


def ice_mark(x, y):
    return [{"t": "dot", "at": [R(x), R(y)], "r": 2.7, "c": "#cfeeff"},
            {"t": "ring", "at": [R(x), R(y)], "r": 2.7, "c": "#3d8fe0", "wd": 0.55},
            {"t": "dot", "at": [R(x), R(y)], "r": 0.9, "c": "#ffffff"}]


def thunder_aoe(x, y, r=11.2):
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": PURPLE, "o": 0.5},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": TAN, "wd": 0.4, "o": 0.9}]


def puddle(x, y, r=11.1):
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#e8902a", "o": 0.5},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": TAN, "wd": 0.4, "o": 0.9}]


def drop(x, y, r=8.0):
    """Lightning phase: the delayed circle under each player."""
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#f2e27a", "o": 0.2},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#f2e27a", "wd": 0.3, "o": 0.7}]


def falloff(x, y, n, lx=None, ly=None):
    """Hail of Feathers: a distance-falloff marker and its order number."""
    out = [{"t": "dot", "at": [R(x), R(y)], "r": 4.3, "c": "#f6b02a", "o": 1}]
    for a0 in (10, 100, 190, 280):
        out += arc(x, y, 6.0, a0, a0 + 70, "#e9853a", wd=0.7, n=8)
    lx = x if lx is None else lx
    ly = y - 9.2 if ly is None else ly
    out += [{"t": "dot", "at": [R(lx), R(ly)], "r": 3.6, "c": "#ffffff", "o": 1},
            {"t": "ring", "at": [R(lx), R(ly)], "r": 3.6, "c": "#111111", "wd": 0.4},
            {"t": "text", "at": [R(lx), R(ly + 0.25)], "s": str(n), "size": 4.6, "c": "#111111"}]
    return out


def beacon(x, y, c):
    """Ruin Foretold: a beacon (fire / ice / thunder) with the game's three spikes."""
    out = [{"t": "dot", "at": [R(x), R(y)], "r": 2.6, "c": c, "o": 1},
           {"t": "ring", "at": [R(x), R(y)], "r": 2.6, "c": "#ffffff", "wd": 0.3, "o": 0.7}]
    for a in (0, 120, 240):
        ux, uy = unit(a)
        tip = (x + ux * 6.2, y + uy * 6.2)
        out.append({"t": "cone", "at": [R(tip[0]), R(tip[1])], "dir": (a + 180) % 360, "spread": 46, "len": 2.8, "c": "#e8507a", "o": 0.9})
    return out


def tower(x, y, r=5.7):
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#e0505f", "o": 0.25},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#e0505f", "wd": 0.8}]


def facing(boss, target, dist=7.0, ln=5.0):
    """The boss's pink facing triangle, its point towards the target."""
    a = ang(boss, target)
    ux, uy = unit(a)
    tip = (boss[0] + ux * (dist + ln), boss[1] + uy * (dist + ln))
    return [{"t": "cone", "at": [R(tip[0]), R(tip[1])], "dir": R((a + 180) % 360), "spread": 46, "len": ln, "c": "#e8507a", "o": 0.9}]


def wedge_edges(at, d, spread, ln=95, c=EDGE, wd=0.45):
    out = []
    for a in (d - spread / 2, d + spread / 2):
        ux, uy = unit(a)
        out.append({"t": "line", "from": [R(at[0]), R(at[1])], "to": [R(at[0] + ux * ln), R(at[1] + uy * ln)], "c": c, "wd": wd, "o": 0.9})
    return out


def along(at, d, t, s):
    """A point t along direction d from at, s to the side."""
    ux, uy = unit(d)
    vx, vy = math.cos(math.radians(d)), math.sin(math.radians(d))
    return [R(at[0] + ux * t + vx * s), R(at[1] + uy * t + vy * s)]


def orb(x, y):
    return [{"t": "dot", "at": [R(x), R(y)], "r": 6.3, "c": "#6d5a7e", "o": 1},
            {"t": "ring", "at": [R(x), R(y)], "r": 6.3, "c": "#14535c", "wd": 0.55},
            {"t": "dot", "at": [R(x), R(y)], "r": 3.4, "c": "#a99bb6", "o": 0.9},
            {"t": "dot", "at": [R(x), R(y)], "r": 1.3, "c": "#9fe3ef", "o": 1}]


def star(x, y, w=12.5):
    out = [{"t": "rect", "at": [R(x), R(y)], "w": w, "h": 300, "rot": rot, "c": "orange", "o": 0.36, "wd": 0.01} for rot in (0, 45, 90, 135)]
    for rot in (0, 45, 90, 135):
        ux, uy = unit(rot)
        vx, vy = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        for side in (-w / 2, w / 2):
            px, py = x + vx * side, y + vy * side
            out.append({"t": "line", "from": [R(px - ux * 150), R(py - uy * 150)], "to": [R(px + ux * 150), R(py + uy * 150)], "c": "#fbe7a6", "wd": 0.3, "o": 0.85})
    return out
