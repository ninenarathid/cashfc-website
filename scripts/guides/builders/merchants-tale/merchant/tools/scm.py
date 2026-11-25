"""Shared drawing helpers for the Another Merchant's Tale scenes (render.mjs shapes).
x, y in % of the frame (y of its height); sizes in % of the width."""
import math

R = lambda v: round(v, 2)
ORANGE = "#ff9b3d"
RIM = "#ffc070"
DEEP = "#ff8a1f"      # game8's solid orange bands
CYAN = "#4fd8ec"
WATER = "#00e3f0"
BG = "#5c5e63"
GREEN = "#3fdc4a"
TBLUE = "#1f35e0"     # a far tether
RED = "#e8442e"


def off(c, ang, r, ky=1.0):
    """Point r away from c at angle ang (0 = up, clockwise). ky converts a width-% distance to height-% (4:3 → 4/3)."""
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r * ky)


def line(p0, p1, c="#ffffff", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def circle(c, r, col=ORANGE, o=0.42, wd=0.01):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def cone(at, d, spread, ln, c=ORANGE, o=0.42, wd=0.12):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=ORANGE, o=0.42, wd=0.12):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=ORANGE, o=0.42):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.12}


def aoe(c, r, o=0.42):
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, RIM, 0.35, 0.9)]


def chevron(c, a, w=2.8, h=1.3, col="#ffd84d", wd=0.6, o=0.98, ky=1.0):
    tip = off(c, a, h / 2, ky)
    back = off(c, a + 180, h / 2, ky)
    return [line(off(back, a + 90, w / 2, ky), tip, col, wd, o), line(off(back, a - 90, w / 2, ky), tip, col, wd, o)]


def chev2(c, a, w=3.2, h=1.5, ky=1.0):
    out = []
    for d in (0, 1.2):
        p = off(c, a + 180, d, ky)
        out += chevron(p, a, w, h, "#c2560c", 1.1, 0.9, ky)
        out += chevron(p, a, w, h, "#ffb347", 0.45, 0.98, ky)
    return out


def stack(c, d=4.6, ky=1.0):
    """game8's stack marker: orange double chevrons on four sides, pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        out += chev2(off(c, a, d, ky), a + 180, ky=ky)
    return out


def burst(c, r=2.1):
    """The blue sun marker (a circle AoE / cross AoE marker on a player or the floor)."""
    out = [circle(c, r, "#0d4f6e", 0.55, 0.01), ring(c, r, CYAN, 0.45, 0.95)]
    for a in range(0, 360, 45):
        out.append(line(off(c, a, r * 1.05), off(c, a, r * 1.45), CYAN, 0.35, 0.9))
    out.append(dot(c, r * 0.4, "#dff8ff"))
    return out


def xmark(c, s=2.0, ky=1.0):
    """A blue X: a frozen water object."""
    p = [off(c, a, s, ky) for a in (45, 135, 225, 315)]
    return [line(p[0], p[2], "#e9f6ff", 1.15, 0.95), line(p[1], p[3], "#e9f6ff", 1.15, 0.95),
            line(p[0], p[2], "#1565c0", 0.7, 0.98), line(p[1], p[3], "#1565c0", 0.7, 0.98)]


def hexnum(c, n, r=2.3):
    """game8's numbered hex pin (1st / 2nd)."""
    return [circle(c, r, "#2b2b2b", 0.35, 0.01), ring(c, r, "#ffe9a8", 0.45, 0.95), text(c, str(n), 2.6, "#ffe9a8")]


def frame_box(x0, y0, x1, y1, col="#ffffff", wd=0.35, o=0.9):
    return [line((x0, y0), (x1, y0), col, wd, o), line((x1, y0), (x1, y1), col, wd, o),
            line((x1, y1), (x0, y1), col, wd, o), line((x0, y1), (x0, y0), col, wd, o)]


def roles(**kw):
    return {k: ([[R(p[0]), R(p[1])] for p in v] if isinstance(v[0], (list, tuple)) else [R(v[0]), R(v[1])]) for k, v in kw.items()}
