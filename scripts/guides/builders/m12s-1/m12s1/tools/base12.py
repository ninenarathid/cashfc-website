"""Shared scene helpers (from the M11S builder). Every scene of the M11S guide, redrawn from game8's strategy-board pictures (440x330, and 440x440 for
the waymarks and the split-arena Majestic Meteor boards).

x in % of the width, y in % of the height, sizes in % of the width. Measured by eye on 5 % grid sheets
(dl/grid) and checked on compare sheets.
"""
import math

R = lambda v: round(v, 2)

ORANGE = "#ff9b3d"
FLOOR = "#a7a8ac"
TAN = "#b89c74"
VOID = "#5b4a36"
PINK = "#e0457b"
BLUE_SQ = "#2340f0"
WEAPON_RED = "#e02020"

# the 4:3 boards: the square arena, 68.4 % of the width across
BOARD = {"shape": "square", "at": [50, 50], "w": 68.4, "h": 68.4, "fill": FLOOR, "lines": False, "edge": "#e2e2e2"}


class F:
    k = 0.75  # height / width of the frame being drawn


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / F.k)


def ang(p0, p1):
    """Direction from p0 to p1 (0 = up, clockwise), in frame % points."""
    dx = p1[0] - p0[0]
    dy = (p1[1] - p0[1]) * F.k
    return math.degrees(math.atan2(dx, -dy)) % 360


def dist(p0, p1):
    return math.hypot(p1[0] - p0[0], (p1[1] - p0[1]) * F.k)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def cone(at, d, spread, ln, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=ORANGE, o=0.42):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.01}


def aoe(c, r, o=0.42):
    """An orange circle AoE, as game8 draws it (soft fill, bright rim)."""
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, "#ffc070", 0.4, 0.95)]


def chevron(c, a, w=3.2, h=1.5, col="#ffb52e", wd=0.8, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    p = off(back, a + 90, w / 2)
    q = off(back, a - 90, w / 2)
    return [line(p, tip, col, wd, o), line(q, tip, col, wd, o)]


def chev2(c, a, w=3.6, h=1.7):
    """game8's double chevron (orange edge, light core) pointing towards a."""
    out = []
    for d in (0, 1.6):
        p = off(c, a + 180, d)
        out += chevron(p, a, w, h, "#ff7a10", 1.5, 0.9)
        out += chevron(p, a, w, h, "#fff2d0", 0.6, 0.98)
    return out


def stack(c, d=6.0):
    """game8's stack marker: double chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        out += chev2(off(c, a, d), a + 180)
    return out


def linestack(p0, p1, n=4, side=4.2):
    """A line stack from p0 through p1: double chevrons on both sides pointing at the line."""
    a = ang(p0, p1)
    L = dist(p0, p1)
    out = []
    for i in range(n):
        t = 0.35 + i * (0.75 / max(1, n - 1))
        m = off(p0, a, L * t)
        out += chev2(off(m, a + 90, side), a - 90)
        out += chev2(off(m, a - 90, side), a + 90)
    return out


def weapon(c, s):
    return text(c, s, 2.9, WEAPON_RED)


def tornado(c, r=7.3):
    return [circle(c, r, ORANGE, 0.32, 0.01), ring(c, r, "#ffc070", 0.4, 0.95)]


def hexmark(c, n):
    return [dot(c, 2.6, "#5a4a2a", 0.55), ring(c, 2.6, "#f5e3a0", 0.45), text(c, str(n), 2.8, "#fff4d0")]



def clump(c, seats, dx=4.6, dy=6.0, cols=3):
    """Seats packed together around c (game8 piles a stack's icons on one spot)."""
    dx, dy = dx * 0.7, dy * 0.7
    out = {}
    n = len(seats)
    if n >= 7 and cols == 4:
        cols = 3
    rows = (n + cols - 1) // cols
    for i, s in enumerate(seats):
        r_, k = divmod(i, cols)
        inrow = min(cols, n - r_ * cols)
        out[s] = [R(c[0] + (k - (inrow - 1) / 2) * dx), R(c[1] + (r_ - (rows - 1) / 2) * dy)]
    return out


ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]


def roles(**kw):
    return {k: [R(v[0]), R(v[1])] for k, v in kw.items()}

