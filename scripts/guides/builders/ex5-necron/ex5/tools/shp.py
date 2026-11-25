"""Shape helpers for the EX5 Necron scenes (percent of a 1:1 frame, as game8's 440x440 pictures).

game8's Necron floor: a dark violet square (8.75..91.25 both ways), the boss above its north edge,
two orange arcs centred on the boss, a round emblem in the middle. render.mjs has no polygons or arcs,
so arcs are short lines and the hands' shapes are dots and cones.
"""
import math

R = lambda v: round(v, 2)

FLOOR = "#444265"
ORANGE = "#e8873a"
ORANGE_EDGE = "#f5c860"
PURPLE = "#6a3a9a"
GREEN = "#2f5a35"
PINK = "#ff7fc8"
BLUE = "#2f6fd0"
GOLD = "#e08a10"
ARC = "#d8683c"

ARENA = {"shape": "square", "at": [50, 50], "w": 82.5, "h": 82.5, "fill": FLOOR, "lines": False, "edge": "#1c1b2c"}
TOP, BOT, LEFT, RIGHT = 8.75, 91.25, 8.75, 91.25
BOSS_C = (50, -3.5)

# game8's waymarks in its pictures (its own set, not xivjpraids'): A north of the middle, 1 2 near the north corners
G8WM = {"A": [50, 22.5], "B": [70.5, 50], "C": [50, 75], "D": [30, 50], "1": [35, 12.5], "2": [65.5, 12.5], "3": [42.5, 22.5], "4": [58, 22.5]}


def unit(a):
    t = math.radians(a)
    return math.sin(t), -math.cos(t)


def pt(c, a, r):
    ux, uy = unit(a)
    return (c[0] + ux * r, c[1] + uy * r)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def rect(x0, y0, x1, y1, c, o=1, wd=0.01, rot=0):
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(abs(x1 - x0)), "h": R(abs(y1 - y0)), "c": c, "o": o, "wd": wd, "rot": rot}


def rectc(cx, cy, w, h, c, o=1, wd=0.01, rot=0):
    return {"t": "rect", "at": [R(cx), R(cy)], "w": R(w), "h": R(h), "c": c, "o": o, "wd": wd, "rot": R(rot)}


def ringl(c, r, col="#000000", wd=0.45, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def circle(c, r, col, o=0.5, wd=0.01):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def dot(c, r, col, o=1):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def cone(at, d, spread, ln, c, o=0.5, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def donut(c, r, r2, col, o=0.5, wd=0.01):
    return {"t": "donut", "at": [R(c[0]), R(c[1])], "r": R(r), "r2": R(r2), "c": col, "o": o, "wd": wd}


def text(x, y, s, size=3.4, c="#ffffff"):
    return {"t": "text", "at": [R(x), R(y)], "s": s, "size": size, "c": c}


def arrow(p0, p1, c="#ffffff", wd=1.0, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def arc(c, r, a0, a1, col, wd=0.8, o=0.95, n=None):
    span = (a1 - a0) % 360
    n = n or max(4, int(span / 4))
    pts = [pt(c, a0 + span * k / n, r) for k in range(n + 1)]
    return [line(p, q, col, wd, o) for p, q in zip(pts, pts[1:])]


# ------------------------------------------------------------------ the floor
def floor(arcs=True, emblem=True, arc_col=ARC, arc_o=0.95):
    out = []
    if emblem:
        out += [circle((50, 49), 6.4, "#34324f", 0.95), ringl((50, 49), 6.4, "#26243a", 0.3, 0.9),
                ringl((50, 49), 3.6, "#2a2842", 0.25, 0.8), ringl((50, 49), 1.6, "#2a2842", 0.25, 0.8)]
    if arcs:
        out += arc(BOSS_C, 37.8, 108.9, 251.1, arc_col, 0.75, arc_o)
        out += arc(BOSS_C, 47.5, 119.7, 240.3, arc_col, 0.9, arc_o)
    return out


def white_black_hands():
    """Memento Mori: the boss's hands, white on the west, dark on the east (game8's picture)."""
    return [dot((35.5, 4.2), 2.8, "#f4f4f4"), dot((63.5, 4.2), 2.9, "#151515"), ringl((63.5, 4.2), 2.9, "#d0d0d0", 0.3, 0.9)]


# ------------------------------------------------------------------ marks
def puddle(c, r=6.0):
    return [circle(c, r, GREEN, 0.92), ringl(c, r, "#203a6a", 0.45, 0.8), circle(c, r * 0.55, "#3c6e40", 0.5)]


def beam(p, d, w=10.5, col=ORANGE, o=0.55):
    """An Icy Hand's line from its puddle p out to the frame's edge in direction d (N/E/S/W)."""
    x, y = p
    if d == "N":
        return [rect(x - w / 2, -1, x + w / 2, y, col, o, 0.3)]
    if d == "S":
        return [rect(x - w / 2, y, x + w / 2, 101, col, o, 0.3)]
    if d == "W":
        return [rect(-1, y - w / 2, x, y + w / 2, col, o, 0.3)]
    return [rect(x, y - w / 2, 101, y + w / 2, col, o, 0.3)]


def chevron(cx, cy, a, w=3.0, h=1.4, c="#ffe23a", wd=0.8, o=0.95):
    ux, uy = unit(a)
    vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
    tip = (cx + ux * h / 2, cy + uy * h / 2)
    w1 = (cx - ux * h / 2 + vx * w / 2, cy - uy * h / 2 + vy * w / 2)
    w2 = (cx - ux * h / 2 - vx * w / 2, cy - uy * h / 2 - vy * w / 2)
    return [line(w1, tip, c, wd, o), line(w2, tip, c, wd, o)]


def stack_mark(cx, cy, d=6.0, w=3.6, h=1.6, col="#ffe23a"):
    """game8's stack marker: yellow chevrons on four sides pointing in."""
    out = []
    for a in (45, 135, 225, 315):
        ux, uy = unit(a)
        out += chevron(cx + ux * d, cy + uy * d, (a + 180) % 360, w, h, col, 0.9, 0.95)
    return out


def wing_mark(x, y, s=3.0, col="#e0508a"):
    """The End's Embrace marker over a head: a pink four-way arrow."""
    return [arrow((x, y), (x, y - s), col, 0.7), arrow((x, y), (x, y + s), col, 0.7),
            arrow((x, y), (x - s, y), col, 0.7), arrow((x, y), (x + s, y), col, 0.7)]


def gold_aoe(c, r=6.3, o=0.6):
    return [circle(c, r, GOLD, o), ringl(c, r, "#f5d65a", 0.45, 0.95)]


def soul_icon(c, r, kind, o=0.92):
    """A Soul Reaping telegraph as game8 draws it: a ring with the prepared shape inside.
    kind: line (centre line), sides, donut, circle."""
    out = [circle(c, r, "#1d2a4a", 0.6)]
    if kind == "line":
        out += [rectc(c[0], c[1], r * 0.8, r * 1.9, "#3a8ad8", o)]
    elif kind == "sides":
        out += [circle(c, r, "#3a7ad0", 0.85), rectc(c[0], c[1], r * 0.45, r * 1.95, "#1d2a4a", 0.85)]
    elif kind == "donut":
        out += [donut(c, r * 0.92, r * 0.42, "#3a7ad0", 0.9)]
    elif kind == "circle":
        out += [circle(c, r * 0.95, "#3a8ad8", o)]
    out += [ringl(c, r, "#e4e4e8", 0.5, 0.95)]
    return out


def diamonds(c, n, s=2.3, col="#3a9ae0"):
    x, y = c
    pos = {1: [(0, 0)], 2: [(-0.55, 0), (0.55, 0)], 3: [(0, -0.5), (-0.55, 0.45), (0.55, 0.45)],
           4: [(-0.5, -0.5), (0.5, -0.5), (-0.5, 0.5), (0.5, 0.5)]}[n]
    return [rectc(x + dx * s, y + dy * s, s * 0.78, s * 0.78, col, 1, 0.15, 45) for dx, dy in pos]


def tdh(c, s=6.2):
    x, y = c
    return [rectc(x, y, s, s, "#3c3c40", 1, 0.25), rectc(x, y, s * 0.8, s * 0.8, "#4a4a50", 1, 0.25), text(x, y + 0.1, "TDH", R(s * 0.36))]


def orb(c, r=6.3, o=0.95):
    return [circle(c, r, "#4a9ad0", o), ringl(c, r, "#14306a", 0.55, 0.95)]


def giant_hand(c, facing):
    """Specter of Death: the giant hand outside the edge (a white glove), black arrowheads pointing in."""
    x, y = c
    d = 1 if facing == "E" else -1
    return [dot((x, y), 3.4, "#f2f2f2"), ringl((x, y), 3.4, "#9a9a9a", 0.25, 0.9),
            cone((x + d * 7.6, y), 270 if d == 1 else 90, 70, 4.4, "#111111", 1),
            cone((x + d * 1.5, y - 5.5), 270 if d == 1 else 90, 70, 3.0, "#111111", 1),
            cone((x + d * 1.5, y + 5.5), 270 if d == 1 else 90, 70, 3.0, "#111111", 1)]


def tower_mm(c, n, r=7.2):
    """Mass Macabre: a pink tower with n pink balls (the number of players it needs)."""
    x, y = c
    out = [circle(c, r, "#c05090", 0.55), ringl(c, r, "#ffd0ea", 0.5, 0.95)]
    b, g = 2.05, 2.3
    pos = {2: [(-1, 0), (1, 0)], 3: [(-2, 0), (0, 0), (2, 0)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)]}[n]
    for dx, dy in pos:
        out += [dot((x + dx * g, y + dy * g), b, "#ff5fae"), dot((x + dx * g - 0.4, y + dy * g - 0.4), b * 0.42, "#ffe0f0", 0.9)]
    return out


def gc_tower(c, r=6.0):
    return [circle(c, r, "#e05060", 0.3), ringl(c, r, "#f05a6a", 0.6, 0.95)]


def gc_marker(c, r=7.5):
    return [circle(c, r, "#f0a040", 0.55), ringl(c, r, "#f8d070", 0.45, 0.95)]


def cross_line(c, ang, r=41.5, col="#e03a30", wd=0.75):
    return line(pt(c, ang, r), pt(c, ang + 180, r), col, wd, 0.95)
