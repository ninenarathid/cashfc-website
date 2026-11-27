"""Scene pieces for the FRU guide, redrawn from Tuufless's Mana PF diagrams (525x525, square).

Everything in % of the frame (square, so x and y share a scale). The arena is the circle
at (50, 50), r 48 (its 20-yalm edge), so 1 yalm = 2.4 %. Angles: 0 = north, clockwise.
"""
import math

R = lambda v: round(v, 2)
C = (50.0, 50.0)
YALM = 2.4

PINK = "#ff7d8c"       # boss cleaves (Cyclonic Break, Utopian Sky lines)
PURPLE = "#c23cdc"     # spread AoEs
RED = "#e8373d"        # stacks
ORANGE = "#ff9b3d"
BLUE = "#3d8bff"
YELLOW = "#ffd84d"
GREEN = "#38d36b"
WHITE = "#ffffff"
LIGHT = "#fff6b0"      # light-aspected
DARK = "#7b3df0"       # dark-aspected


def pol(a, r, c=C):
    t = math.radians(a)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r)


def ang(p0, p1):
    return math.degrees(math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]))) % 360


def dist(p0, p1):
    return math.hypot(p1[0] - p0[0], p1[1] - p0[1])


def line(p0, p1, c="#ffffff", wd=0.5, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c="#ffffff", wd=0.7, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.4, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def cone(at, d, spread, ln, c=ORANGE, o=0.4, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=ORANGE, o=0.4, wd=0.01):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot % 360), "c": c, "o": o, "wd": wd}


def band(p0, p1, w, c=ORANGE, o=0.4, wd=0.01):
    """A line AoE of width w from p0 to p1."""
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    return rect(mid, w, dist(p0, p1), ang(p0, p1), c, o, wd)


def donut(at, r, r2, c=ORANGE, o=0.4):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.01}


def aoe(c, r, col=ORANGE, o=0.4, rim=None):
    out = [circle(c, r, col, o, 0.01)]
    out.append(ring(c, r, rim or col, 0.35, 0.9))
    return out


def arc(c, r, a0, a1, col="#ffffff", wd=0.6, o=0.95, head=True, n=None):
    """An arrow bending along a circle around c from angle a0 to a1 (degrees, clockwise if a1 > a0)."""
    n = n or max(3, int(abs(a1 - a0) / 6))
    pts = [pol(a0 + (a1 - a0) * k / n, r, c) for k in range(n + 1)]
    out = [line(pts[k], pts[k + 1], col, wd, o) for k in range(n - 1)]
    out.append(arrow(pts[n - 1], pts[n], col, wd, o) if head else line(pts[n - 1], pts[n], col, wd, o))
    return out


def curve(p0, p1, bend=0.25, col="#ffffff", wd=0.6, o=0.95, n=8):
    """A gently curved arrow from p0 to p1; bend > 0 bows to the left of the travel direction."""
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    cx, cy = mx + dy * bend, my - dx * bend
    pts = []
    for k in range(n + 1):
        t = k / n
        pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * cx + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * cy + t * t * p1[1]))
    out = [line(pts[k], pts[k + 1], col, wd, o) for k in range(n - 1)]
    out.append(arrow(pts[n - 1], pts[n], col, wd, o))
    return out


def tether(p0, p1, col=YELLOW, wd=0.55, o=0.95, dash=False):
    return [line(p0, p1, "#000000", wd + 0.45, 0.45), line(p0, p1, col, wd, o, dash)]


def tower(c, r=4.2, col="#55c8ff", o=0.3):
    return [circle(c, r, col, o, 0.01), ring(c, r, col, 0.55, 0.95)]


def stack_mark(c, d=4.2, col="#ffd84d"):
    """Four small arrowheads pointing in: a stack marker over someone."""
    out = []
    for a in (0, 90, 180, 270):
        tip = pol(a, d - 1.6, c)
        base = pol(a, d, c)
        out.append(arrow(base, tip, col, 0.55, 0.98))
    return out


def label(c, s, size=3.0, col="#ffffff"):
    return text(c, s, size, col)


# ---------------------------------------------------------------- the board
FLOOR = "#8b8275"
RIM = "#28231f"
INNER = "#56585d"


def deco(inner=True):
    sh = [donut(C, 48, 44.2, RIM, 0.92)]
    sh.append(ring(C, 34.5, "#ffffff", 0.18, 0.18))
    if inner:
        sh.append(circle(C, 23.5, INNER, 0.85, 0.01))
        sh.append(ring(C, 23.5, "#2e2f33", 0.35, 0.8))
        for a in range(0, 360, 45):
            sh.append(line(pol(a, 3, C), pol(a, 21, C), "#ffffff", 0.22, 0.16))
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 48.4), pol(a, 50.5), "#555555", 0.7, 0.9))
    return sh


def board(inner=True, **kw):
    s = {"frame": [1, 1], "bg": "#f3f3f3",
         "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": FLOOR, "lines": False, "edge": "#15120f"},
         "waymarks": None, "markSize": 6.5, "iconSize": 6.6, "bossSize": 8}
    shapes = deco(inner) + kw.pop("shapes", [])
    s.update(kw)
    s["shapes"] = shapes
    if "roles" in s:
        s["roles"] = {k: ([R(v[0][0]), R(v[0][1])] if False else ([[R(p[0]), R(p[1])] for p in v] if isinstance(v[0], (list, tuple)) else [R(v[0]), R(v[1])])) for k, v in s["roles"].items()}
    return s
