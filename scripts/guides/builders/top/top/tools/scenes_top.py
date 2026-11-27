"""Scene pieces for the TOP guide, redrawn from Tuufless's Notes (Elemental DC PF) diagrams.

Every source diagram is a 525 px square: the arena a circle centred on the picture, radius 47.5 % of the
width (20 yalms), the waymarks at 13 yalms (A north, B east, C south, D west, 1 NE, 2 SE, 3 SW, 4 NW).
x/y in % of the frame, sizes in % of the width; angles 0 = north, clockwise.
"""
import math

R = lambda v: round(v, 2)
CX, CY, AR = 50.0, 50.0, 47.5
YL = AR / 20.0          # % of the frame per yalm

BG = "#eef0f3"
FLOOR = "#22324a"
EDGE = "#0b1421"
PINK = "#ff8f8f"        # the source's AoE pink
RED = "#e23b3b"
TOWER = "#efe7a0"
TETHER = "#ff8a2a"
WHITE = "#ffffff"
BLUE_T = "#5fb4ff"      # blue tether
GREEN_T = "#57d16a"     # red/green tether (drawn green with a red core)


def P(a, d):
    """The point at angle a (0 = north, clockwise) and d yalms from the centre."""
    t = math.radians(a)
    return (R(CX + math.sin(t) * d * YL), R(CY - math.cos(t) * d * YL))


def Q(x, y):
    """A point given in yalms east (x) / south (y) of the centre."""
    return (R(CX + x * YL), R(CY + y * YL))


def ang(p0, p1):
    return math.degrees(math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]))) % 360


def towards(p0, p1, k):
    return (R(p0[0] + (p1[0] - p0[0]) * k), R(p0[1] + (p1[1] - p0[1]) * k))


WM = {"A": P(0, 13.2), "B": P(90, 13.2), "C": P(180, 13.2), "D": P(270, 13.2),
      "1": P(45, 13.2), "2": P(135, 13.2), "3": P(225, 13.2), "4": P(315, 13.2)}


# ---------------------------------------------------------------- shapes
def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def circle(c, r, col=PINK, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def arrow(p0, p1, c="#ffffff", wd=0.6, o=0.95):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def cone(at, d, spread, ln, c=PINK, o=0.42, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=PINK, o=0.4, wd=0.01):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=PINK, o=0.4):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.01}


def aoe(c, r, col=PINK, o=0.38):
    return [circle(c, r, col, o, 0.01), ring(c, r, col, 0.3, 0.8)]


def beam(p0, p1, w, col=PINK, o=0.4):
    """A straight line AoE of width w from p0 to p1."""
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    ln = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    return rect(mid, w, ln, ang(p0, p1), col, o)


def tower(c, r=7.2, live=True):
    if live:
        return [circle(c, r, TOWER, 0.82, 0.01), ring(c, r, WHITE, 0.55, 0.95)]
    return [circle(c, r, "#7f8c94", 0.45, 0.01), ring(c, r, WHITE, 0.55, 0.9)]


def tether(p0, p1, col=TETHER, wd=0.45):
    return line(p0, p1, col, wd, 0.95)


def rg_tether(p0, p1):
    """The red/green tether (Local Regression): green, with a red line beside it."""
    return [line(p0, p1, GREEN_T, 0.7, 0.9), line(p0, p1, "#ff5a5a", 0.25, 0.95)]


def blue_tether(p0, p1):
    return [line(p0, p1, BLUE_T, 0.6, 0.95)]


def target_ring(c=(CX, CY), r=24.5, face=0, gap=70, col=RED):
    """The boss's targeting circle as the source draws it: a red ring open at the back, a red tip at the front."""
    out = []
    n = 28
    a0, a1 = face + 180 + gap / 2, face + 180 + 360 - gap / 2
    pts = [P_around(c, a0 + (a1 - a0) * i / n, r) for i in range(n + 1)]
    for p, q in zip(pts, pts[1:]):
        out.append(line(p, q, col, 0.9, 0.85))
    tip = P_around(c, face, r + 2.6)
    l, rr = P_around(c, face - 5, r - 0.2), P_around(c, face + 5, r - 0.2)
    out += [line(l, tip, col, 0.9, 0.9), line(rr, tip, col, 0.9, 0.9)]
    return out


def P_around(c, a, r):
    t = math.radians(a)
    return (R(c[0] + math.sin(t) * r), R(c[1] - math.cos(t) * r))


def ticks(step=15, big=45):
    """Tick marks outside the arena edge, a longer one every `big` degrees."""
    out = []
    for a in range(0, 360, step):
        l = 2.0 if a % big == 0 else 1.1
        out.append(line(P_around((CX, CY), a, AR + 0.4), P_around((CX, CY), a, AR + 0.4 + l), "#6b7280", 0.22 if a % big else 0.35, 0.9))
    return out


def notch_marks(a0, a1, r=AR, step=5, col="#ffd23f"):
    """Highlight the 5-degree notches from a0 to a1 (for 'three notches' rules)."""
    out = []
    a = a0
    while (a1 - a) * (1 if a1 >= a0 else -1) >= 0:
        out.append(line(P_around((CX, CY), a, r - 1.2), P_around((CX, CY), a, r + 1.6), col, 0.35, 0.95))
        a += step if a1 >= a0 else -step
    return out


def pl(c, s="", col="#cdb68a", r=2.4, tc="#1d1d1d", size=2.6):
    """A player who is drawn by number or symbol, not by role (the source's generic icon)."""
    out = [dot(c, r, col), ring(c, r, "#5a4a2a", 0.25, 0.9)]
    if s:
        out.append(text(c, s, size, tc))
    return out


def mf(c, kind="M", col=None, r=2.9, size=3.0):
    """An Omega-M or Omega-F (clone or real), as a round token with its letter."""
    col = col or ("#a9b6c8" if kind == "M" else "#f0bfd8")
    return [dot(c, r, col), ring(c, r, "#2a2a2a", 0.3, 0.9), text(c, kind, size, "#1d1d1d")]


def label(c, s, size=2.6, col="#ffffff"):
    return text(c, s, size, col)


def sym(c, s, size=3.4):
    """A PlayStation symbol, drawn with shapes (no font glyphs): o x tri sq."""
    x, y = c
    k = size / 3.4
    if s == "o":
        return [ring(c, 1.3 * k, "#ff4d4d", 0.45)]
    if s == "x":
        return [line((x - 1.2 * k, y - 1.2 * k), (x + 1.2 * k, y + 1.2 * k), "#4de1ff", 0.45), line((x - 1.2 * k, y + 1.2 * k), (x + 1.2 * k, y - 1.2 * k), "#4de1ff", 0.45)]
    if s == "t":
        a, b, d = (x, y + 1.3 * k), (x - 1.4 * k, y - 1.0 * k), (x + 1.4 * k, y - 1.0 * k)
        return [line(a, b, "#5fd36b", 0.4), line(b, d, "#5fd36b", 0.4), line(d, a, "#5fd36b", 0.4)]
    if s == "s":
        a, b, cc, d = (x - 1.1 * k, y - 1.1 * k), (x + 1.1 * k, y - 1.1 * k), (x + 1.1 * k, y + 1.1 * k), (x - 1.1 * k, y + 1.1 * k)
        return [line(a, b, "#b46cff", 0.4), line(b, cc, "#b46cff", 0.4), line(cc, d, "#b46cff", 0.4), line(d, a, "#b46cff", 0.4)]
    raise ValueError(s)


def stackmark(c, d=3.6, col="#ffd23f"):
    """A stack marker: four chevrons pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        tip = P_around(c, a, d - 1.0)
        b1, b2 = P_around(c, a - 22, d + 0.6), P_around(c, a + 22, d + 0.6)
        out += [line(b1, tip, col, 0.45, 0.95), line(b2, tip, col, 0.45, 0.95)]
    return out


def flare(c, d=4.8, col="#ffffff"):
    """A flare/target marker: corner brackets."""
    out = []
    for a in (45, 135, 225, 315):
        corner = P_around(c, a, d)
        out += [line(corner, P_around(corner, a + 135, 1.4), col, 0.35), line(corner, P_around(corner, a - 135, 1.4), col, 0.35)]
    return out


def redmark(c):
    """A small red marker above a player (a targeted Wave Cannon)."""
    x, y = c
    return [line((x - 0.9, y - 4.8), (x, y - 3.4), "#ff3030", 0.55), line((x + 0.9, y - 4.8), (x, y - 3.4), "#ff3030", 0.55),
            line((x - 0.9, y - 4.8), (x + 0.9, y - 4.8), "#ff3030", 0.55)]


def roles(**kw):
    return {k: [R(v[0]), R(v[1])] if not isinstance(v[0], (list, tuple)) else [[R(p[0]), R(p[1])] for p in v] for k, v in kw.items()}


# ---------------------------------------------------------------- the board
def board(shapes=(), wm=True, tick=15, ticks_big=45, arena_fill=FLOOR, **kw):
    s = {"frame": [1, 1], "bg": BG,
         "arena": {"shape": "circle", "at": [CX, CY], "r": AR, "fill": arena_fill, "lines": False, "edge": EDGE},
         "waymarks": ({k: [v[0], v[1]] for k, v in WM.items()} if wm is True else (wm or None)),
         "markSize": 5.2, "iconSize": 6, "bossSize": 9}
    sh = (ticks(tick, ticks_big) if tick else [])
    sh += list(shapes)
    s.update(kw)
    s["shapes"] = sh + s.pop("shapes", [])
    return s
