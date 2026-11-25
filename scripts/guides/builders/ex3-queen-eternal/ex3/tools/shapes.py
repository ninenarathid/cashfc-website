"""Shape helpers for the EX3 Queen Eternal scenes (percent of a 1:1 frame, as game8's 440x440 pictures).

render.mjs has circles, rings, cones, rects, lines, arrows, dots and text, but no
polygons, so the fight's arena states are built from rects: the square floor, the
X of the wind floor (two crossing bands and two bars), the two earth islands and
the three ice islands with their four bridges.
"""
import math

R = lambda v: round(v, 2)

NAVY = "#2a326c"        # the square circuit floor
NAVY_EDGE = "#8cc6de"
ISLE = "#2d2e31"        # the earth and ice islands (game8 draws them flat dark grey)
X_FILL = "#283069"
X_EDGE = "#62c24c"
AOE = "#e8902a"
TAN = "#f2d68a"
GOLD = "#d8c48c"
YEL = "#ffd23f"


def unit(a):
    t = math.radians(a)
    return math.sin(t), -math.cos(t)


def ang(p, q):
    """Compass angle from p to q (0 = up, clockwise)."""
    return math.degrees(math.atan2(q[0] - p[0], -(q[1] - p[1]))) % 360


def rect(x0, y0, x1, y1, c, o=1, wd=0.01, rot=0):
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(x1 - x0), "h": R(y1 - y0), "c": c, "o": o, "wd": wd, "rot": rot}


def line(p0, p1, c="#ffffff", wd=0.4, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def outline(x0, y0, x1, y1, c, wd=0.4, o=0.95):
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    return [line(p, q, c, wd, o) for p, q in zip(pts, pts[1:])]


# ------------------------------------------------------------------ the square floor
SQ = (9.0, 9.3, 91.4, 91.8)


def square(ring=True):
    x0, y0, x1, y1 = SQ
    out = [rect(x0, y0, x1, y1, NAVY)]
    out += outline(x0, y0, x1, y1, NAVY_EDGE, 0.45, 0.8)
    if ring:
        out.append({"t": "ring", "at": [50.2, 50.6], "r": 7.8, "c": "#c9a36a", "wd": 0.3, "o": 0.45})
    return out


# ------------------------------------------------------------------ the wind floor (an X with flat bars)
# Measured on game8's pictures: bars x 11-90, top bar y 13.1-27.7, bottom bar y 71.6-86.4;
# two crossing bands at about 44 degrees, 15.4 wide, crossing at (50.3, 49.7).
XC = (50.3, 49.7)
XBAND_W, XBAND_L, XBAND_ROT = 15.6, 84.5, 46.2


def _x_parts(c, grow=0.0):
    g = grow
    return [rect(11.0 - g, 13.1 - g, 90.0 + g, 27.7 + g, c),
            rect(10.8 - g, 71.6 - g, 90.2 + g, 86.4 + g, c),
            {"t": "rect", "at": [XC[0], XC[1]], "w": R(XBAND_W + 2 * g), "h": XBAND_L, "rot": -XBAND_ROT, "c": c, "o": 1, "wd": 0.01},
            {"t": "rect", "at": [XC[0], XC[1]], "w": R(XBAND_W + 2 * g), "h": XBAND_L, "rot": XBAND_ROT, "c": c, "o": 1, "wd": 0.01}]


def xfloor(fill=X_FILL, edge=X_EDGE):
    return _x_parts(edge, 0.55) + _x_parts(fill)


# ------------------------------------------------------------------ the earth floor (two islands, players float between)
EW = (25.2, 27.5, 43.2, 59.3)
EE = (58.2, 27.5, 76.1, 59.8)
GRAV = [(34.2, 43.6), (67.2, 43.8)]


def earth(devices=True, fill=ISLE):
    out = [rect(*EW, fill), rect(*EE, fill)]
    if devices:
        for x, y in GRAV:
            out.append({"t": "circle", "at": [x, y], "r": 1.9, "c": "#4a2a6e", "o": 1, "wd": 0.01})
            out.append({"t": "ring", "at": [x, y], "r": 2.0, "c": "#d8c48c", "wd": 0.45, "o": 1})
    return out


# ------------------------------------------------------------------ the ice floor (three islands, four bridges)
IW = (10.7, 10.7, 26.8, 89.3)
IM = (42.0, 42.0, 58.2, 89.3)
IE = (73.2, 10.7, 89.3, 89.3)
BRIDGES = [(26.8, 52.5, 42.0, 63.2), (26.8, 68.2, 42.0, 78.9), (58.2, 53.2, 73.2, 63.6), (58.2, 68.6, 73.2, 79.3)]


def bridge(x0, y0, x1, y1, o=1):
    """game8's bridges are a light-to-dark blue gradient, left to right."""
    cols = ["#6cc4ec", "#56ade2", "#3f8fd2", "#2b70bd", "#1d4f99"]
    n = len(cols)
    w = (x1 - x0) / n
    out = [rect(x0 + k * w, y0, x0 + (k + 1) * w + 0.05, y1, c, o) for k, c in enumerate(cols)]
    return out + outline(x0, y0, x1, y1, "#7fd0f4", 0.3, 0.8 * o)


def ice(bridges=True, isles=(IW, IM, IE), brs=None):
    out = [rect(*b, ISLE) for b in isles]
    if bridges:
        for b in (brs or BRIDGES):
            out += bridge(*b)
    return out


# ------------------------------------------------------------------ AoEs
def aoe_circle(x, y, r, c=AOE, o=0.5, edge=TAN, ewd=0.35):
    out = [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": c, "o": o, "wd": 0.01}]
    if edge:
        out.append({"t": "ring", "at": [R(x), R(y)], "r": r, "c": edge, "wd": ewd, "o": 0.85})
    return out


def cone(at, d, spread, ln, c=AOE, o=0.5):
    return [{"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": ln, "c": c, "o": o, "wd": 0.01}]


def edge_ray(at, a, ln, c=TAN, wd=0.35, o=0.9):
    ux, uy = unit(a)
    return [line(at, (at[0] + ux * ln, at[1] + uy * ln), c, wd, o)]


def bar(p0, p1, w, c=AOE, o=0.5, edge=TAN, ewd=0.3):
    """A straight strip from p0 to p1, w wide (a beam)."""
    mid = [R((p0[0] + p1[0]) / 2), R((p0[1] + p1[1]) / 2)]
    ln = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    a = ang(p0, p1)
    out = [{"t": "rect", "at": mid, "w": R(w), "h": R(ln), "rot": R(a), "c": c, "o": o, "wd": 0.01}]
    if edge:
        vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
        for s in (1, -1):
            out.append(line((p0[0] + s * vx * w / 2, p0[1] + s * vy * w / 2), (p1[0] + s * vx * w / 2, p1[1] + s * vy * w / 2), edge, ewd, 0.85))
    return out


def half(x0, y0, x1, y1, c="#f0a030", o=0.42, edge=TAN):
    out = [rect(x0, y0, x1, y1, c, o)]
    if edge:
        out += outline(x0, y0, x1, y1, edge, 0.3, 0.7)
    return out


# ------------------------------------------------------------------ markers and things on the field
def chevron(cx, cy, a, d, w=4.0, h=2.0, c=YEL, wd=0.9, o=0.95):
    """One chevron at distance d from (cx, cy) in compass direction a, its point towards the centre."""
    ux, uy = unit(a)
    vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
    tip = (cx + ux * (d - h / 2), cy + uy * (d - h / 2))
    w1 = (cx + ux * (d + h / 2) + vx * w / 2, cy + uy * (d + h / 2) + vy * w / 2)
    w2 = (cx + ux * (d + h / 2) - vx * w / 2, cy + uy * (d + h / 2) - vy * w / 2)
    return [line(w1, tip, c, wd, o), line(w2, tip, c, wd, o)]


def stack_star(cx, cy, d=6.0, w=8.6, h=3.0, n=8):
    """game8's stack marker: bold yellow chevrons on the four sides pointing in (three deep, fading outwards),
    with fainter ones on the diagonals."""
    out = []
    for k in range(n):
        a = k * 360 / n
        if k % 2:
            out += chevron(cx, cy, a, d + 2.2, w * 0.6, h * 0.8, YEL, 0.8, 0.45)
        else:
            for j, o in ((3.6, 0.3), (1.8, 0.6), (0, 1.0)):
                out += chevron(cx, cy, a, d + j, w, h, YEL, 1.5, o)
    return out


def line_stack(x, ys, side_off=4.6, w=4.0, h=2.0, wd=1.2):
    """A line stack running north-south through x: chevrons each side at the given y, pointing in."""
    out = []
    for y in ys:
        out += chevron(x, y, 270, side_off, w, h, YEL, wd, 0.95) + chevron(x, y, 270, side_off + h * 0.7, w, h, "#e6d58c", wd * 0.8, 0.5)
        out += chevron(x, y, 90, side_off, w, h, YEL, wd, 0.95) + chevron(x, y, 90, side_off + h * 0.7, w, h, "#e6d58c", wd * 0.8, 0.5)
    return out


ROLE_COL = {"T": "#2c4fa8", "H": "#2c6b34", "D": "#6a2a2a"}


def token(x, y, k, s=6.4):
    """game8's generic role badge (T, H or D) for "whoever has it": a gold-rimmed square with the letter."""
    return [rect(x - s / 2, y - s / 2, x + s / 2, y + s / 2, GOLD, 1),
            rect(x - s * 0.42, y - s * 0.42, x + s * 0.42, y + s * 0.42, ROLE_COL[k], 1),
            {"t": "text", "at": [R(x), R(y + 0.15)], "s": k, "size": R(s * 0.55), "c": "#ffffff"}]


def orb(x, y, r=6.4, lit=False):
    """The glowing orb game8 puts over the arena for each Legitimate Force hit still to come."""
    out = [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#9aa8f0" if not lit else "#d9a070", "o": 0.9, "wd": 0.01},
           {"t": "circle", "at": [R(x), R(y)], "r": r * 0.62, "c": "#dfe6ff" if not lit else "#f3d9b5", "o": 0.9, "wd": 0.01},
           {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#ffffff", "wd": 0.5, "o": 0.9}]
    return out


def kb_tag(x, y, right=True, s=6.0):
    """The knockback debuff over a head: a pale badge with three chevrons (teal = thrown east, gold = thrown west)."""
    c = "#3fb3b8" if right else "#c9952f"
    out = [rect(x - s / 2, y - s * 0.48, x + s / 2, y + s * 0.38, "#dfe6ea", 1),
           {"t": "cone", "at": [R(x), R(y + s * 0.62)], "dir": 0, "spread": 120, "len": R(s * 0.3), "c": "#dfe6ea", "o": 1, "wd": 0.01},
           rect(x - s * 0.42, y - s * 0.26, x + s * 0.42, y + s * 0.26, c, 1)]
    a = 90 if right else 270
    for k in (-1, 0, 1):
        cx = x + k * s * 0.24
        out += chevron(cx, y, (a + 180) % 360, 0, w=s * 0.36, h=s * 0.16, c="#ffffff", wd=0.45)
    return out


def flare_marker(x, y, s=6.0):
    """The flare marker: three pale triangles around the player, pointing outwards."""
    out = []
    for a in (0, 125, 235):
        ux, uy = unit(a)
        cx, cy = x + ux * s * 1.2, y + uy * s * 1.2
        out.append({"t": "cone", "at": [R(cx + ux * s * 0.5), R(cy + uy * s * 0.5)], "dir": R((a + 180) % 360), "spread": 62, "len": R(s), "c": "#dce8f6", "o": 0.95, "wd": 0.25})
        out.append({"t": "cone", "at": [R(cx + ux * s * 0.2), R(cy + uy * s * 0.2)], "dir": R((a + 180) % 360), "spread": 62, "len": R(s * 0.45), "c": "#6a7cc0", "o": 0.95, "wd": 0.01})
    return out


def red_tri(x, y, s=3.8):
    """A red triangle pointing down over a head (the debuff that must not be alone)."""
    return [{"t": "cone", "at": [R(x), R(y + s * 0.5)], "dir": 0, "spread": 62, "len": R(s), "c": "#d4141e", "o": 1, "wd": 0.01}]


def trident(x, y, s=4.2):
    """The big-circle marker over a head (a red three-pronged mark)."""
    c = "#c2365a"
    return [line((x, y - s), (x, y + s * 0.9), c, 0.7, 1),
            line((x - s * 0.55, y - s * 0.55), (x, y + s * 0.2), c, 0.6, 1),
            line((x + s * 0.55, y - s * 0.55), (x, y + s * 0.2), c, 0.6, 1),
            {"t": "cone", "at": [R(x), R(y + s * 1.1)], "dir": 0, "spread": 60, "len": R(s * 0.5), "c": c, "o": 1, "wd": 0.01}]


def rock(x, y, r=2.3):
    """A fallen meteor: a brown rock with a pale rim."""
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#6a5038", "o": 1, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#d8c48c", "wd": 0.4, "o": 0.95}]


def green_mark(x, y, r=2.6):
    """The meteor marker over a head: a green disc."""
    return [{"t": "circle", "at": [R(x), R(y)], "r": r, "c": "#3f9a5c", "o": 1, "wd": 0.01},
            {"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#163a22", "wd": 0.5, "o": 1}]


def icicle(x, y, h=8.0, w=2.6, rot=0):
    """An icicle: a pale-blue crystal, pointed at both ends."""
    body = h * 0.62
    tip = (h - body) / 2
    spread = round(2 * math.degrees(math.atan((w / 2) / tip)), 1)
    return [{"t": "rect", "at": [R(x), R(y)], "w": w, "h": R(body), "rot": rot, "c": "#7fc0ec", "o": 0.95, "wd": 0.01},
            {"t": "cone", "at": [R(x), R(y - h / 2)], "dir": 180, "spread": spread, "len": R(math.hypot(tip, w / 2)), "c": "#7fc0ec", "o": 0.95, "wd": 0.01},
            {"t": "cone", "at": [R(x), R(y + h / 2)], "dir": 0, "spread": spread, "len": R(math.hypot(tip, w / 2)), "c": "#7fc0ec", "o": 0.95, "wd": 0.01},
            {"t": "rect", "at": [R(x), R(y)], "w": R(w * 0.4), "h": R(body * 0.9), "rot": rot, "c": "#d6ecfa", "o": 0.9, "wd": 0.01}]


def pink_tether(p0, p1, n=None, c="#e8708e"):
    """The icicle tethers: a pink line with barbs pointing at the tethered player."""
    out = [line(p0, p1, c, 0.45, 0.95)]
    a = ang(p0, p1)
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    n = n or max(2, int(L / 6))
    for k in range(1, n + 1):
        f = k / (n + 1)
        cx, cy = p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f
        out += chevron(cx, cy, (a + 180) % 360, 0, w=2.2, h=1.3, c=c, wd=0.4, o=0.95)
    return out


def device(x, y, a, s=7.0):
    """Coronation's device: a yellow triangle on the edge, its point outwards (compass a)."""
    ux, uy = unit(a)
    return [{"t": "cone", "at": [R(x + ux * s * 0.55), R(y + uy * s * 0.55)], "dir": R((a + 180) % 360), "spread": 66, "len": s, "c": "#f2d23a", "o": 1, "wd": 0.2}]


def chev_disc(x, y, r=10.2):
    """Dimensional Distortion's marker: a pale ring with three white chevrons pointing south."""
    out = [{"t": "ring", "at": [R(x), R(y)], "r": r, "c": "#f2e6b0", "wd": 1.0, "o": 0.85}]
    for k, dy in enumerate((-4.4, -0.8, 2.8)):
        out += chevron(x, y + dy, 0, 0, w=r * 1.3, h=r * 0.4, c="#d8603a", wd=2.6, o=0.9)
        out += chevron(x, y + dy, 0, 0, w=r * 1.3, h=r * 0.4, c="#fff7e6", wd=1.7, o=0.98)
    return out


def kb_down(x, y, s=6.4):
    """Absolute Authority's last hit: a pale double chevron pointing south on the north edge."""
    out = []
    for k, dy in enumerate((-1.2, 0.9)):
        out += chevron(x, y + dy, 0, 0, w=s, h=s * 0.34, c="#fff3dc", wd=1.3, o=0.95)
    return out


def arrow(p0, p1, c="#e8452a", wd=1.0, o=0.95):
    return [{"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}]


def tether(p0, p1, c="#e8702a", wd=0.55, o=0.95):
    return [line(p0, p1, c, wd, o)]


def label(x, y, s, size=3.4, c="#ffffff"):
    return [{"t": "text", "at": [R(x), R(y)], "s": s, "size": size, "c": c}]


def cluster(x, y, gap=3.0, cols=4, order=("MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4")):
    """Everyone stood together: a tight block, centred on (x, y)."""
    out = {}
    rows = math.ceil(len(order) / cols)
    for k, seat in enumerate(order):
        r, c = divmod(k, cols)
        out[seat] = [R(x + (c - (cols - 1) / 2) * gap), R(y + (r - (rows - 1) / 2) * gap)]
    return out
