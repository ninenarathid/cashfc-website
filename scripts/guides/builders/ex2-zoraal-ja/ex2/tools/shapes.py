"""Shape helpers for the EX2 Zoraal Ja scenes (percent of a 1:1 frame).

game8 draws Zoraal Ja's floors as diamonds (squares turned 45 degrees). On a
1:1 frame a diamond is easiest in diagonal coordinates: s = x + y runs from
the top-left edge to the bottom-right edge, t = x - y from the bottom-left
edge to the top-right edge. A band of the floor between two values of s (or
of t) is a straight strip parallel to two of the diamond's sides.
"""
import math

R = lambda v: round(v, 2)
SQ2 = math.sqrt(2)

FLOOR = "#2f3033"
GRID = "#141516"
EDGE = "#121314"
TAN = "#f2d68a"
AOE = "#e8902a"        # game8's orange on a dark floor
HALF = "#f0a030"       # the big half-arena overlays
PINK = "#e8507a"
SWORD = "#c9ced6"
CYAN = "#4fd3e0"


def unit(a):
    t = math.radians(a)
    return math.sin(t), -math.cos(t)


def ang(p, q):
    """Compass angle from p to q (0 = up, clockwise)."""
    return math.degrees(math.atan2(q[0] - p[0], -(q[1] - p[1]))) % 360


def xy(s, t):
    return [R((s + t) / 2), R((s - t) / 2)]


class Dia:
    """A diamond floor centred at (cx, cy), half-diagonal d, n x n tiles."""

    def __init__(self, cx, cy, d, n=4):
        self.cx, self.cy, self.d, self.n = cx, cy, d, n
        self.s0, self.s1 = cx + cy - d, cx + cy + d
        self.t0, self.t1 = cx - cy - d, cx - cy + d
        self.step = 2 * d / n

    def floor(self, fill=FLOOR):
        side = self.d * SQ2
        return [{"t": "rect", "at": [R(self.cx), R(self.cy)], "w": R(side), "h": R(side), "rot": 45, "c": fill, "o": 1, "wd": 0.01}]

    def outline(self, c=EDGE, wd=0.45, o=0.95):
        top, right = [self.cx, self.cy - self.d], [self.cx + self.d, self.cy]
        bot, left = [self.cx, self.cy + self.d], [self.cx - self.d, self.cy]
        pts = [top, right, bot, left, top]
        return [{"t": "line", "from": [R(p[0]), R(p[1])], "to": [R(q[0]), R(q[1])], "c": c, "wd": wd, "o": o} for p, q in zip(pts, pts[1:])]

    def grid(self, c=GRID, wd=0.35, o=0.9, n=None):
        n = n or self.n
        step = 2 * self.d / n
        out = []
        for k in range(1, n):
            s = self.s0 + k * step
            out.append({"t": "line", "from": xy(s, self.t0), "to": xy(s, self.t1), "c": c, "wd": wd, "o": o})
            t = self.t0 + k * step
            out.append({"t": "line", "from": xy(self.s0, t), "to": xy(self.s1, t), "c": c, "wd": wd, "o": o})
        return out

    def base(self, fine=False):
        out = self.floor() + self.grid()
        if fine:
            out += self.grid(wd=0.18, o=0.45, n=self.n * 2)
        return out + self.outline()

    # A tile: a = steps down-right from the top tile, b = steps down-left.
    def cell(self, a, b):
        s = self.s0 + (a + 0.5) * self.step
        t = self.t1 - (b + 0.5) * self.step
        return xy(s, t)

    def tile(self, a, b, c=AOE, o=0.55, edge=TAN):
        side = self.step / SQ2
        at = self.cell(a, b)
        out = [{"t": "rect", "at": at, "w": R(side), "h": R(side), "rot": 45, "c": c, "o": o, "wd": 0.01}]
        if edge:
            out += diamond_edge(at, self.step / 2, edge)
        return out

    def sband(self, a, b, c=AOE, o=0.5, edge=TAN):
        """The strip a <= x + y <= b across this floor (it runs from bottom-left to top-right)."""
        sc, tc = (a + b) / 2, self.cx - self.cy
        out = [{"t": "rect", "at": xy(sc, tc), "w": R((b - a) / SQ2), "h": R(self.d * SQ2), "rot": 45, "c": c, "o": o, "wd": 0.01}]
        if edge:
            for s in (a, b):
                out.append({"t": "line", "from": xy(s, self.t0), "to": xy(s, self.t1), "c": edge, "wd": 0.3, "o": 0.85})
        return out

    def tband(self, a, b, c=AOE, o=0.5, edge=TAN):
        """The strip a <= x - y <= b across this floor (it runs from top-left to bottom-right)."""
        tc, sc = (a + b) / 2, self.cx + self.cy
        out = [{"t": "rect", "at": xy(sc, tc), "w": R((b - a) / SQ2), "h": R(self.d * SQ2), "rot": 135, "c": c, "o": o, "wd": 0.01}]
        if edge:
            for t in (a, b):
                out.append({"t": "line", "from": xy(self.s0, t), "to": xy(self.s1, t), "c": edge, "wd": 0.3, "o": 0.85})
        return out

    def srow(self, a, c=AOE, o=0.55, edge=TAN):
        """A whole row of tiles, a steps down-right from the top (one tile wide, running bottom-left to top-right)."""
        s = self.s0 + a * self.step
        return self.sband(s, s + self.step, c, o, edge)

    def trow(self, b, c=AOE, o=0.55, edge=TAN):
        """A whole row of tiles, b steps down-left from the top (running top-left to bottom-right)."""
        t = self.t1 - (b + 1) * self.step
        return self.tband(t, t + self.step, c, o, edge)


def diamond_edge(at, h, c=TAN, wd=0.3, o=0.85):
    x, y = at
    pts = [[x, y - h], [x + h, y], [x, y + h], [x - h, y], [x, y - h]]
    return [{"t": "line", "from": [R(p[0]), R(p[1])], "to": [R(q[0]), R(q[1])], "c": c, "wd": wd, "o": o} for p, q in zip(pts, pts[1:])]


def bar(p0, p1, w, c=AOE, o=0.55, edge=TAN):
    """A straight strip from p0 to p1, w wide."""
    mid = [R((p0[0] + p1[0]) / 2), R((p0[1] + p1[1]) / 2)]
    ln = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    a = ang(p0, p1)
    out = [{"t": "rect", "at": mid, "w": R(w), "h": R(ln), "rot": R(a), "c": c, "o": o, "wd": 0.01}]
    if edge:
        ux, uy = unit(a)
        vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
        cs = [(p0[0] + vx * w / 2, p0[1] + vy * w / 2), (p1[0] + vx * w / 2, p1[1] + vy * w / 2),
              (p1[0] - vx * w / 2, p1[1] - vy * w / 2), (p0[0] - vx * w / 2, p0[1] - vy * w / 2)]
        cs.append(cs[0])
        out += [{"t": "line", "from": [R(p[0]), R(p[1])], "to": [R(q[0]), R(q[1])], "c": edge, "wd": 0.3, "o": 0.9} for p, q in zip(cs, cs[1:])]
    return out


def half(x0, y0, x1, y1, c=HALF, o=0.42):
    """An axis-aligned half-arena overlay (game8 paints the Half Full sides as big rectangles)."""
    return [{"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(x1 - x0), "h": R(y1 - y0), "c": c, "o": o, "wd": 0.01}]


def edge_line(p0, p1, c=TAN, wd=0.35, o=0.9):
    return [{"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}]


def facing(boss, a, dist=4.8, ln=3.4, c=PINK):
    """The boss's pink pointer, its tip towards compass angle a."""
    ux, uy = unit(a)
    tip = (boss[0] + ux * (dist + ln), boss[1] + uy * (dist + ln))
    return [{"t": "cone", "at": [R(tip[0]), R(tip[1])], "dir": R((a + 180) % 360), "spread": 50, "len": ln, "c": c, "o": 0.95}]


def glow_sword(at, size=5.2):
    """game8's blue triangle beside the boss: the side of the sword that glows."""
    x, y = at
    return [{"t": "cone", "at": [R(x), R(y - size * 0.55)], "dir": 180, "spread": 62, "len": size, "c": "#2a9be8", "o": 0.98, "wd": 0.25}]


def target_circle(at, r=13.5):
    return [{"t": "ring", "at": [R(at[0]), R(at[1])], "r": r, "c": "#b3302a", "wd": 0.55, "o": 0.9}]


def sword(x, y, size=3.4, rot=-20, c=SWORD):
    """A sword: a tapered blade, a guard and a grip. rot is the way the hilt points (0 = up)."""
    ux, uy = unit(rot)
    vx, vy = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    tip = (x - ux * size * 0.55, y - uy * size * 0.55)
    guard = (x + ux * size * 0.22, y + uy * size * 0.22)
    hilt = (x + ux * size * 0.45, y + uy * size * 0.45)
    blade_len = size * 0.77
    out = [{"t": "cone", "at": [R(tip[0]), R(tip[1])], "dir": R(rot % 360), "spread": 15, "len": R(blade_len), "c": c, "o": 0.95, "wd": 0.15},
           {"t": "line", "from": [R(guard[0] - vx * size * 0.24), R(guard[1] - vy * size * 0.24)],
            "to": [R(guard[0] + vx * size * 0.24), R(guard[1] + vy * size * 0.24)], "c": c, "wd": 0.42, "o": 0.95},
           {"t": "line", "from": [R(guard[0]), R(guard[1])], "to": [R(hilt[0]), R(hilt[1])], "c": "#8a8f98", "wd": 0.42, "o": 0.95}]
    return out


def ring_sword(x, y):
    """Projection of Triumph: a sword stood in a cyan ring."""
    return [{"t": "ring", "at": [R(x), R(y)], "r": 2.2, "c": CYAN, "wd": 0.35, "o": 0.85}] + sword(x + 0.4, y - 0.8, 3.0, rot=35)


def donut_orb(x, y, r=1.7):
    """Projection of Triumph: the orb that makes a donut (a pink ring round a teal centre)."""
    return [{"t": "dot", "at": [R(x), R(y)], "r": r, "c": "#3a2032", "o": 1},
            {"t": "ring", "at": [R(x), R(y)], "r": r * 0.78, "c": "#e2477e", "wd": 0.55, "o": 1},
            {"t": "dot", "at": [R(x), R(y)], "r": r * 0.42, "c": "#3fc6c0", "o": 1}]


def circle_orb(x, y, r=1.7):
    """Projection of Triumph: the orb that makes a small circle (a dark fiery ball)."""
    return [{"t": "dot", "at": [R(x), R(y)], "r": r, "c": "#5a2a10", "o": 1},
            {"t": "ring", "at": [R(x), R(y)], "r": r * 0.85, "c": "#e8902a", "wd": 0.45, "o": 1},
            {"t": "dot", "at": [R(x), R(y)], "r": r * 0.35, "c": "#ffcf7a", "o": 1}]


def aoe_circle(x, y, r, c=AOE, o=0.5, edge=TAN):
    out = [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": c, "o": o, "wd": 0.01}]
    if edge:
        out.append({"t": "ring", "at": [R(x), R(y)], "r": r, "c": edge, "wd": 0.35, "o": 0.85})
    return out


def aoe_donut(x, y, r, r2, c=AOE, o=0.5, edge=TAN):
    out = [{"t": "donut", "at": [R(x), R(y)], "r": r, "r2": r2, "c": c, "o": o, "wd": 0.01}]
    if edge:
        out += [{"t": "ring", "at": [R(x), R(y)], "r": rr, "c": edge, "wd": 0.35, "o": 0.85} for rr in (r, r2)]
    return out


def yellow_mark(x, y, size=3.4):
    """Chasm of Vollok's yellow marker over a head: a yellow triangle."""
    return [{"t": "cone", "at": [R(x), R(y - size * 0.62)], "dir": 180, "spread": 64, "len": size, "c": "#f2c41a", "o": 1, "wd": 0.2}]


def pair_ring(x, y, r=6.8):
    """Drum of Vollok's pair marker: a white ring with a pale blue middle."""
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#5aa8d8", "o": 0.38, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#e8eef4", "wd": 0.9, "o": 0.85}]


def tornado(x, y, r=8.3):
    """Aero III: the green wind on the floor."""
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#2e7a4c", "o": 0.95, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#d9d08a", "wd": 0.45, "o": 0.9}]


def arrow(p0, p1, c="#e8452a", wd=1.0, o=0.95):
    return [{"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}]


def tether(p0, p1, c="#e8602a", wd=0.7, o=0.95):
    return [{"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}]


CHEV = "#ffd23f"


def chevron(cx, cy, a, d, w=4.0, h=2.0, c=CHEV, wd=0.9, double=True, gap=1.6):
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


def line_stack(p0, p1, fracs=(0.15, 0.5, 0.85), off=4.4, **kw):
    """Chevrons on both sides of the line p0-p1, pointing at it (a line stack)."""
    out = []
    a = ang(p0, p1)
    for f in fracs:
        cx = p0[0] + (p1[0] - p0[0]) * f
        cy = p0[1] + (p1[1] - p0[1]) * f
        for side in (a + 90, a - 90):
            out += chevron(cx, cy, side % 360, off, **kw)
    return out


def knock_chevrons(at, a, n=2, size=3.2, c="#f6efe0"):
    """A knockback: bold pale chevrons pointing the way you are thrown (compass a)."""
    out = []
    ux, uy = unit(a)
    for k in range(n):
        cx, cy = at[0] + ux * (k - (n - 1) / 2) * 1.7, at[1] + uy * (k - (n - 1) / 2) * 1.7
        out += chevron(cx, cy, (a + 180) % 360, 0.0, w=size, h=size * 0.36, c=c, wd=0.95, double=False)
    return out


def label(x, y, s, size=3.6, c="#ffffff"):
    return [{"t": "text", "at": [R(x), R(y)], "s": s, "size": size, "c": c}]


def party_cluster(x, y, gap=2.4, order=("MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"), cols=4):
    """Everyone stood together: a tight block of eight, centred on (x, y)."""
    out = {}
    rows = math.ceil(len(order) / cols)
    for k, seat in enumerate(order):
        r, c = divmod(k, cols)
        out[seat] = [R(x + (c - (cols - 1) / 2) * gap), R(y + (r - (rows - 1) / 2) * gap)]
    return out
