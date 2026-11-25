"""Scene helpers for the Aloalo guide. Frames are square (1:1): x, y and sizes all in % of the side."""
import math

R = lambda v: round(v, 2)
ORANGE = "#ff9b3d"
ORIM = "#ffd27a"


def off(c, a, r):
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


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def curve(pts, c="#ffffff", wd=0.9):
    """A bent arrow through several points (the last segment carries the head)."""
    out = [line(pts[i], pts[i + 1], c, wd) for i in range(len(pts) - 2)]
    out.append(arrow(pts[-2], pts[-1], c, wd))
    return out


def arc_arrow(c, r, a0, a1, col="#ffffff", wd=0.9, n=8):
    pts = [off(c, a0 + (a1 - a0) * i / n, r) for i in range(n + 1)]
    return curve(pts, col, wd)


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def rect(at, w, h, rot=0, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def box(x0, y0, x1, y1, c=ORANGE, o=0.45, wd=0.01):
    return rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, y1 - y0, 0, c, o, wd)


def cone(at, d, spread, ln, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=ORANGE, o=0.42):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.01}


def aoe(c, r, o=0.45):
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, ORIM, 0.4, 0.95)]


def chevron(c, a, w=3.0, h=1.4, col="#ffb52e", wd=0.8, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    p = off(back, a + 90, w / 2)
    q = off(back, a - 90, w / 2)
    return [line(p, tip, col, wd, o), line(q, tip, col, wd, o)]


def stackmark(c, d=4.6, w=3.0, h=1.4):
    """game8's stack marker: double chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        p = off(c, a, d)
        for k in (0, 1.3):
            q = off(p, a, k)
            out += chevron(q, a + 180, w, h, "#e8a400", 1.2, 0.85)
            out += chevron(q, a + 180, w, h, "#fff3b0", 0.45, 0.98)
    return out


def spread_icon(c):
    """The spread debuff as game8 draws it: a white disc on a blue badge."""
    return [dot(c, 1.9, "#2d5fb8"), dot(c, 1.05, "#eef6ff")]


def stack_icon(c):
    """The stack debuff: an X of white chevrons on a blue badge."""
    return [dot(c, 1.9, "#2d5fb8"), line(off(c, 315, 1.2), off(c, 135, 1.2), "#ffffff", 0.45), line(off(c, 45, 1.2), off(c, 225, 1.2), "#ffffff", 0.45)]


WM_COL = {"A": "#e0457b", "B": "#e8c440", "C": "#4da3ff", "D": "#b46cff", "1": "#e0457b", "2": "#e8c440", "3": "#4da3ff", "4": "#b46cff"}


def wm_discs(wm, r=3.9):
    """A dark disc under each waymark, as game8 draws them, so the game's glyph reads on any floor."""
    out = []
    for k, p in (wm or {}).items():
        out += [dot(p, r, "#24202a", 0.92), ring(p, r, WM_COL[k], 0.45, 0.9)]
    return out


def scene(arena, waymarks, shapes, roles=None, boss=None, **kw):
    s = {"frame": [1, 1], "arena": arena, "waymarks": waymarks, "shapes": shapes + wm_discs(waymarks)}
    if roles:
        s["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    if boss:
        s["boss"] = boss
    s.update(kw)
    return s
