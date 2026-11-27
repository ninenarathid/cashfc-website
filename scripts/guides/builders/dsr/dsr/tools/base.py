"""Drawing pieces for the DSR guide's scenes (redrawn from Tuufless's Elemental PF diagrams).

Every source diagram is square (500/525 px): x and y in % of the frame, sizes in % of the width.
Measured on 5 % grid sheets (.work/dsr/grid) and checked on compare sheets.
"""
import math

R = lambda v: round(v, 2)
K = 1.0  # height / width: every DSR board is square


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / K)


def ang(p0, p1):
    return math.degrees(math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]) * K)) % 360


def dist(p0, p1):
    return math.hypot(p1[0] - p0[0], (p1[1] - p0[1]) * K)


# ---------------------------------------------------------------- primitives
def line(p0, p1, c="#ffffff", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c="#ffffff", wd=0.6, o=0.95):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def circle(c, r, col="#ff7676", o=0.35, wd=0.25):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col="#ffffff", wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.0, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def cone(at, d, spread, ln, col="#ff7676", o=0.35, wd=0.2):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": col, "o": o, "wd": wd}


def rect(at, w, h, rot=0, col="#ff7676", o=0.35, wd=0.15):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot % 360), "c": col, "o": o, "wd": wd}


def donut(at, r, r2, col="#ff7676", o=0.35):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": col, "o": o, "wd": 0.1}


def beam(p0, p1, w, col="#ff7676", o=0.32):
    """A line AoE from p0 to p1, w wide."""
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    return rect(mid, w, dist(p0, p1), ang(p0, p1), col, o)


def curve(pts, col="#ffffff", wd=0.5, o=0.95, head=True):
    """A polyline through pts; an arrowhead on the last piece."""
    out = [line(pts[i], pts[i + 1], col, wd, o) for i in range(len(pts) - 2)]
    out.append((arrow if head else line)(pts[-2], pts[-1], col, wd, o))
    return out


def arc_pts(c, r, a0, a1, n=12):
    return [off(c, a0 + (a1 - a0) * i / n, r) for i in range(n + 1)]


def roles(**kw):
    return {k: [R(v[0]), R(v[1])] if not isinstance(v[0], (list, tuple)) else [[R(p[0]), R(p[1])] for p in v] for k, v in kw.items()}


# ---------------------------------------------------------------- pieces
PINK = "#ff7676"
YEL = "#f5e27a"
GEN_COL = {"T": "#3a62c2", "H": "#2f7d3b", "D": "#b0453c"}


def gen(c, k, s=4.4):
    """A player shown only by role (T / H / D), as the source's role-only icons."""
    return [rect(c, s, s, 0, GEN_COL[k], 0.95, 0.15), text((c[0], c[1] + 0.15), k, s * 0.6, "#ffffff")]


def anon(c, r=2.1, col="#d8d8d8"):
    """A player whose role does not matter (the source's grey figure)."""
    return [dot(c, r, col), dot((c[0], c[1] - r * 0.28), r * 0.38, "#7a7a7a"), ring((c[0], c[1] + r * 0.42), r * 0.42, "#7a7a7a", 0.35, 0.9)]


def bossring(c, r=7, col="#d62b2b", wd=1.0, face=None):
    out = [ring(c, r, col, wd, 0.9)]
    if face is not None:
        tip = off(c, face, r + 1.6)
        out += [cone(tip, face + 180, 50, 2.4, col, 0.95, 0.1)]
    return out


def tag(c, s, size=2.4, col="#ffffff", bg="#15161a", o=0.85):
    w = 0.6 * size * len(s) + 1.2
    return [rect(c, w, size * 1.4, 0, bg, o, 0.1), text(c, s, size, col)]


def num(c, n, r=2.2, col="#ffffff", ink="#c62828"):
    """A numbered disc (the source's 1-2-3 circles)."""
    return [dot(c, r, col), ring(c, r, ink, 0.35, 0.95), text((c[0], c[1] + 0.1), str(n), r * 1.15, ink)]


def xmark(c, s=1.6, col="#3ee05a", wd=0.45):
    return [line((c[0] - s, c[1] - s), (c[0] + s, c[1] + s), col, wd), line((c[0] - s, c[1] + s), (c[0] + s, c[1] - s), col, wd)]


def down_tri(c, s=2.0, col="#e02020"):
    """A ▼ head marker."""
    return [cone((c[0], c[1] + s * 0.6), 0, 64, s * 1.3, col, 0.95, 0.05)]


def ps_sym(c, k, s=1.7):
    """Playstation marks: circle (red), cross (cyan), square (purple), triangle (green)."""
    x, y = c
    if k == "o":
        return [ring(c, s, "#e83030", 0.45)]
    if k == "x":
        return xmark(c, s, "#3fc3ef", 0.5)
    if k == "s":
        p = [(x - s, y - s), (x + s, y - s), (x + s, y + s), (x - s, y + s)]
        return [line(p[i], p[(i + 1) % 4], "#b04de0", 0.45) for i in range(4)]
    p = [(x - s, y - s * 0.8), (x + s, y - s * 0.8), (x, y + s * 0.9)]
    return [line(p[i], p[(i + 1) % 3], "#3ee05a", 0.45) for i in range(3)]


def tower(c, r=5.0, col="#e8c44a", o=0.3):
    """A tower: a soft disc with a bright rim and four spikes."""
    out = [circle(c, r, col, o, 0.05), ring(c, r, col, 0.55, 0.95)]
    for a in (45, 135, 225, 315):
        out.append(line(off(c, a, r * 0.55), off(c, a, r * 1.35), col, 0.35, 0.8))
    return out


def puddle(c, r, col="#e8eef0", o=0.55):
    return [circle(c, r, col, o, 0.05), ring(c, r, "#ffffff", 0.3, 0.9)]


def knight(c, label, col="#c9ccd6", s=2.6):
    """A knight or other NPC: a dark disc with a short English label."""
    return [dot(c, s, "#2a2c33"), ring(c, s, col, 0.45, 0.95), text((c[0], c[1] + 0.1), label, s * 0.72, col)]


def star(c, s=1.6, col="#ffffff"):
    out = []
    for a in (0, 72, 144, 216, 288):
        out.append(line(c, off(c, a, s), col, 0.4, 0.95))
    return out
