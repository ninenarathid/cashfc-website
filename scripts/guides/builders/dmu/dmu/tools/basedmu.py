"""Drawing helpers for the DMU guide: kanatan.info's boards redrawn in our style.

Every scene is drawn on the frame of the kanatan picture it redraws ([w, h] of that picture), so a
position read off a 5 % grid of the picture (dl/grid) is the position here: x in % of the width,
y in % of the height, sizes in % of the width.
"""
import math

R = lambda v: round(v, 2)

ORANGE = "#ff9b3d"
FLOOR = "#3c4252"      # kanatan's dark arena floor
EDGE = "#9db4e0"
BG = "#f4f4f4"
BLUE = "#4f7fd6"       # Blizzaga / the cones kanatan draws in blue
RED = "#e0484a"
PURPLE = "#b25ce0"
TETHER = "#ff9a1f"
BH = "#1d3f8a"


class F:
    k = 1.0  # height / width of the frame being drawn


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / F.k)


def ang(p0, p1):
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


def band(p0, p1, w, c=ORANGE, o=0.42):
    """A straight AoE from p0 to p1, w wide (a rect turned along the line)."""
    mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
    return rect(mid, w, dist(p0, p1), ang(p0, p1), c, o)


def aoe(c, r, o=0.42, col=ORANGE, rim="#ffc070"):
    return [circle(c, r, col, o, 0.01), ring(c, r, rim, 0.4, 0.95)]


def chevron(c, a, w=3.2, h=1.5, col="#ffb52e", wd=0.8, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    p = off(back, a + 90, w / 2)
    q = off(back, a - 90, w / 2)
    return [line(p, tip, col, wd, o), line(q, tip, col, wd, o)]


def chev2(c, a, w=3.6, h=1.7, edge="#c98a2a", core="#ffe9b8"):
    out = []
    for d in (0, 1.6 * w / 3.6):
        p = off(c, a + 180, d)
        out += chevron(p, a, w, h, edge, 1.5 * w / 3.6, 0.9)
        out += chevron(p, a, w, h, core, 0.6 * w / 3.6, 0.98)
    return out


def stack(c, d=6.0, w=3.6, h=1.7):
    """A stack marker: double chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        out += chev2(off(c, a, d), a + 180, w, h)
    return out


def roles(**kw):
    out = {}
    for k, v in kw.items():
        if isinstance(v[0], (list, tuple)):
            out[k] = [[R(p[0]), R(p[1])] for p in v]
        else:
            out[k] = [R(v[0]), R(v[1])]
    return out


def label(c, s, size=3.0, col="#ffffff", bg="#15161a", o=0.85):
    """A small English tag on a dark box."""
    w = 0.6 * size * len(s) + 1.4
    return [rect(c, w, size * 1.45, 0, bg, o, 0.12), text(c, s, size, col)]


def board(w, h, at=(50, 50), r=48, wm=None, bg=BG, floor=FLOOR, **kw):
    """A kanatan board: the picture's own frame, the dark round arena, its waymarks (or none)."""
    F.k = h / w
    s = {"frame": [w, h], "bg": bg, "arena": {"shape": "circle", "at": [R(at[0]), R(at[1])], "r": R(r), "fill": floor,
                                              "lines": False, "edge": EDGE},
         "waymarks": dict(wm) if wm else None, "markSize": 7.4, "iconSize": 7.8, "bossSize": 10}
    shapes = kw.pop("shapes", [])
    s.update(kw)
    s["shapes"] = shapes
    return s


def wm_std(at, rc, rn, k=None):
    """Standard 8 waymarks around an arena centre: cardinals at rc, numbers at rn (both % of width)."""
    kk = k if k is not None else F.k
    o = lambda a, r: (at[0] + math.sin(math.radians(a)) * r, at[1] - math.cos(math.radians(a)) * r / kk)
    p = {"A": o(0, rc), "B": o(90, rc), "C": o(180, rc), "D": o(270, rc), "1": o(315, rn), "2": o(45, rn), "3": o(135, rn), "4": o(225, rn)}
    return {key: [R(v[0]), R(v[1])] for key, v in p.items()}


def tower(c, r, col="#7ec8ff", o=0.25):
    return [circle(c, r, col, o, 0.01), ring(c, r, col, 0.7, 0.95)]


def blackhole(c, r=3.4):
    return [dot(c, r, "#0b1636"), ring(c, r, "#2f7cff", 0.9, 0.95), ring(c, r * 0.5, "#2f7cff", 0.5, 0.8)]


def tether(p0, p1):
    return line(p0, p1, TETHER, 1.0, 0.95)


WM_COL = {"A": "#e0506a", "1": "#e0506a", "B": "#d8b020", "2": "#d8b020", "C": "#3d8fe0", "3": "#3d8fe0", "D": "#9a62d8", "4": "#9a62d8"}


def wmtok(c, k, size=2.6):
    """A waymark drawn as a shape (for a second panel, where the icons are already used)."""
    out = [dot(c, size * 0.75, "#15161a", 0.9), ring(c, size * 0.75, WM_COL[k], 0.35, 0.95)]
    return out + [text((c[0], c[1] + 0.1), k, size, WM_COL[k])]


def panels(w, h, arenas, wms, bg=BG, floor=FLOOR, **kw):
    """A picture of several arenas side by side: the first panel's waymarks are the icons, the rest drawn."""
    F.k = h / w
    sh = []
    for (at, r) in arenas:
        sh += [circle(at, r, floor, 1.0, 0.01), ring(at, r, EDGE, 0.6, 0.95)]
    for wm in wms[1:]:
        for k, p in wm.items():
            sh += wmtok(p, k)
    s = {"frame": [w, h], "bg": bg, "arena": None, "waymarks": dict(wms[0]) if wms and wms[0] else None,
         "markSize": 5.0, "iconSize": 5.2, "bossSize": 7}
    shapes = kw.pop("shapes", [])
    s.update(kw)
    s["shapes"] = sh + shapes
    return s


def wm_ring(at, rc, rn, kk):
    o = lambda a, r: (at[0] + math.sin(math.radians(a)) * r, at[1] - math.cos(math.radians(a)) * r / kk)
    p = {"A": o(0, rc), "B": o(90, rc), "C": o(180, rc), "D": o(270, rc), "1": o(315, rn), "2": o(45, rn), "3": o(135, rn), "4": o(225, rn)}
    return {key: [R(v[0]), R(v[1])] for key, v in p.items()}


def crystal(c, kind, s=7):
    if kind == "wind":
        return [rect(c, s * 0.75, s * 0.75, 45, "#2ee04a", 0.95, 0.2)]
    if kind == "water":
        return [rect(c, s * 0.9, s * 0.9, 0, "#22e0ee", 0.95, 0.2)]
    return [cone((c[0], c[1] - s * 0.6 / F.k), 180, 60, s * 1.2, "#ff2020", 0.95, 0.2)]


def namebox(c, s, size=2.4):
    return label(c, s, size, "#111111", "#ffffff", 0.92)


def deb(c, kind):
    col = {"fire": "#b03ad8", "water": "#3a8ae0", "wind": "#30b050"}[kind]
    return [rect(c, 2.0, 2.0, 0, col, 0.95, 0.2)]


def tagm(c, s):
    """A head marker: A1-A3 attack (gold), B1-B3 bind (lilac), S1-S2 stop (pink)."""
    col = {"A": "#ffcf5a", "B": "#d9b0ff", "S": "#ff9a9a"}[s[0]]
    return label(c, s, 2.0, col, "#15161a", 0.9)


def beam(p0, p1, w=7, o=0.45):
    return band(p0, p1, w, "#cfe3ee", o)
