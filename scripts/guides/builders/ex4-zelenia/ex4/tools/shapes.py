"""Shape helpers for the EX4 Zelenia scenes (percent of a 1:1 frame, as game8's 440x440 pictures).

render.mjs has circles, rings, cones, rects, lines, arrows, dots and text but no polygons.
Zelenia's floor is 16 tiles (8 in an inner circle, 8 in the ring around it, cut by spokes every 45
degrees); a tile is a cone from the centre, the inner ones drawn over the outer ones.
"""
import math

R = lambda v: round(v, 2)

BEIGE = "#c9bc9c"
DARK = "#393636"
RED = "#6e151d"
LINE = "#0d0d0d"
CREAM = "#fde2a8"
PURPLE = "#7a2a8a"
CONE_P = "#b25ea6"      # Escelons' Fall cones
CONE_EDGE = "#9fd0ec"
BLUE_AOE = "#7b98b4"
GOLD = "#d8c48c"
PINK = "#e0569a"


def unit(a):
    t = math.radians(a)
    return math.sin(t), -math.cos(t)


def ang(p, q):
    return math.degrees(math.atan2(q[0] - p[0], -(q[1] - p[1]))) % 360


def pt(c, a, r):
    ux, uy = unit(a)
    return (c[0] + ux * r, c[1] + uy * r)


def line(p0, p1, c=LINE, wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def rect(x0, y0, x1, y1, c, o=1, wd=0.01, rot=0):
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(x1 - x0), "h": R(y1 - y0), "c": c, "o": o, "wd": wd, "rot": rot}


def ringl(c, r, col=LINE, wd=0.45, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def circle(c, r, col, o=0.5, wd=0.01):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def dot(c, r, col, o=1):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def cone(at, d, spread, ln, c=CREAM, o=0.5, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def donut(c, r, r2, col, o=0.5, wd=0.01):
    return {"t": "donut", "at": [R(c[0]), R(c[1])], "r": R(r), "r2": R(r2), "c": col, "o": o, "wd": wd}


def text(x, y, s, size=3.4, c="#ffffff"):
    return {"t": "text", "at": [R(x), R(y)], "s": s, "size": size, "c": c}


def arrow(p0, p1, c="#ffffff", wd=1.0, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def big_arrow(p0, p1, wd=1.3):
    """game8's move arrow: white with a dark red rim."""
    return [arrow(p0, p1, "#b0303a", wd * 1.32, 0.95), arrow(p0, p1, "#ffffff", wd, 1)]


# ------------------------------------------------------------------ floors
def spokes(c, Rr, off=0, r0=0, col=LINE, wd=0.45, n=8):
    return [line(pt(c, off + k * 360 / n, r0), pt(c, off + k * 360 / n, Rr), col, wd) for k in range(n)]


def beige(c, Rr, rin, off=0, wd=0.45, angles=None):
    """The plain floor game8 draws for most mechanics: a sandy disc, the inner circle and 8 spokes."""
    if angles:
        return [ringl(c, rin, LINE, wd)] + [line(c, pt(c, a, Rr), LINE, wd) for a in angles]
    return [ringl(c, rin, LINE, wd)] + spokes(c, Rr, off, 0, LINE, wd)


def tiles(c, Rr, rin, red_in=(), red_out=(), off=0, wd=0.45, col_in=None, col_out=None, lines=True):
    """The 16-tile floor: index k is the tile from off + 45k to off + 45(k+1) degrees (0 = N, clockwise).
    The arena disc underneath is DARK; red tiles (and any other colour given per tile) are cones over it."""
    out = []
    col_out = col_out or {}
    col_in = col_in or {}
    for k in range(8):
        cc = col_out.get(k, RED if k in red_out else None)
        if cc:
            out.append(cone(c, off + 45 * k + 22.5, 45, Rr, cc, 1))
    for k in range(8):
        cc = col_in.get(k, RED if k in red_in else DARK)
        out.append(cone(c, off + 45 * k + 22.5, 45, rin, cc, 1))
    if lines:
        out.append(ringl(c, rin, "#000000", wd))
        out += spokes(c, Rr, off, 0, "#000000", wd)
    return out


# ------------------------------------------------------------------ marks
ROLE_COL = {"T": "#22407a", "H": "#2c5a2a", "D": "#5a2a2a"}


def token(x, y, k, s=6.0):
    """game8's generic role badge (T, H or D) for 'whoever has it'."""
    return [rect(x - s / 2, y - s / 2, x + s / 2, y + s / 2, "#a08a5a", 1),
            rect(x - s * 0.42, y - s * 0.42, x + s * 0.42, y + s * 0.42, ROLE_COL[k], 1),
            text(x, y + 0.15, k, R(s * 0.55))]


def tokens(*items, s=6.0):
    out = []
    for k, x, y in items:
        out += token(x, y, k, s)
    return out


def target(c, r=13.1, col="#e8342a", wd=0.6):
    """The boss's red target circle."""
    return [ringl(c, r, col, wd, 0.95)]


def diamond(x, y, s, c, o=1, edge=None, wd=0.3):
    d = {"t": "rect", "at": [R(x), R(y)], "w": R(s), "h": R(s), "rot": 45, "c": c, "o": o, "wd": wd}
    return [d]


def near_tell(c, s=6.0):
    """Escelons' Fall 'near' tell: pink diamonds in a row (three overlapping)."""
    x, y = c
    out = []
    for dx, k in ((-s * 0.9, 0.62), (s * 0.9, 0.62), (0, 1.0)):
        out += diamond(x + dx, y, s * k, "#d070d0", 0.95, wd=0.35)
        out += diamond(x + dx, y, s * k * 0.55, "#f6d2f2", 0.95, wd=0.2)
    return out


def far_tell(c, s=6.0):
    """Escelons' Fall 'far' tell: a dark diamond with two small ones on a line."""
    x, y = c
    out = [line((x - s * 1.5, y), (x + s * 1.5, y), "#c9c4ff", 0.35, 0.9)]
    for dx, k in ((-s * 1.45, 0.4), (s * 1.45, 0.4), (0, 0.85)):
        out += diamond(x + dx, y, s * k, "#1b1846", 1, wd=0.35)
        out += [dot((x + dx, y), s * k * 0.12, "#e8e6ff")]
    return out


def rose_orb(x, y, r=5.0):
    """The barricade's rose orbs (the adds to hit): a pink-red ball."""
    return [circle((x, y), r, "#b8304a", 1, 0.01), circle((x - r * 0.15, y - r * 0.15), r * 0.65, "#e0607a", 0.9, 0.01),
            circle((x + r * 0.25, y + r * 0.1), r * 0.3, "#ffd6e0", 0.95, 0.01), ringl((x, y), r, "#7a1428", 0.3, 0.9)]


def tower(c, r=7.0):
    """A tower: a blue disc with a pale rim (game8's Barricade towers)."""
    return [circle(c, r, "#4a8fd0", 0.75, 0.01), ringl(c, r, "#1b3f7a", 0.5, 0.95)]


def crystal(x, y, h=10.5, w=3.8):
    """A tower's crystal pillar (game8 draws a pale-blue crystal where a tower stands)."""
    return [rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, "#bfe3f2", 1, 0.25),
            rect(x - w * 0.14, y - h * 0.38, x + w * 0.14, y + h * 0.38, "#ffffff", 0.55),
            {"t": "rect", "at": [R(x), R(y - h / 2)], "w": R(w * 0.7), "h": R(w * 0.7), "rot": 45, "c": "#bfe3f2", "o": 1, "wd": 0.25}]


def rose_mark(x, y, s=4.4):
    """The rose marker over a head: a pink triangle pointing up."""
    return [cone((x, y - s * 0.55), 180, 64, s, "#e0569a", 1, 0.01)]


def tether(p0, p1, c="#ff6a1f", wd=0.6, o=0.95):
    return [line(p0, p1, c, wd, o)]


def chevron(cx, cy, a, w=3.0, h=1.4, c="#f0a030", wd=0.8, o=0.95):
    """One chevron centred at (cx, cy) pointing in compass direction a."""
    ux, uy = unit(a)
    vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
    tip = (cx + ux * h / 2, cy + uy * h / 2)
    w1 = (cx - ux * h / 2 + vx * w / 2, cy - uy * h / 2 + vy * w / 2)
    w2 = (cx - ux * h / 2 - vx * w / 2, cy - uy * h / 2 - vy * w / 2)
    return [line(w1, tip, c, wd, o), line(w2, tip, c, wd, o)]


def spin(c, r, cw=True, n=10, col="#f0a030", start=0):
    """Chevrons around the boss showing which way the cones turn."""
    out = []
    for k in range(n):
        a = start + k * 360 / n
        p = pt(c, a, r)
        out += chevron(p[0], p[1], (a + (90 if cw else -90)) % 360, 3.2, 1.5, col, 0.9, 0.95)
    return out


def label(x, y, s, size=3.4, c="#ffffff"):
    return [text(x, y, s, size, c)]


# ------------------------------------------------------------------ the floor with what lies on it, in flat colours
# game8 shows each overlap as its own flat colour (a cone over a red tile, the donut over a dark one ...).
# Everything radial from the centre (tiles, cones from the boss, the inner circle AoE, the outer donut)
# is cut at every edge and drawn as cones in the colour game8 gives that overlap.
PAL = {
    ("in", "D", ""): "#393636", ("in", "R", ""): "#6e151d", ("out", "D", ""): "#393636", ("out", "R", ""): "#6e151d",
    ("in", "D", "c"): "#968669", ("in", "R", "c"): "#a04f24", ("out", "D", "c"): "#968669", ("out", "R", "c"): "#a04f24",
    ("in", "D", "p"): "#735a80", ("in", "R", "p"): "#6d1c51", ("out", "D", "p"): "#6f3c87", ("out", "R", "p"): "#661c72",
    ("in", "D", "pc"): "#a67f7c", ("in", "R", "pc"): "#a1544f", ("out", "D", "pc"): "#a36b7c", ("out", "R", "pc"): "#9f5769",
    ("in", "D", "b"): "#6d767f", ("in", "R", "b"): "#744744", ("out", "D", "b"): "#6d767f", ("out", "R", "b"): "#744744",
}


def _in_arc(a, d, sp):
    return ((a - (d - sp / 2)) % 360) < sp


def floorx(c, Rr, rin, red_in=(), red_out=(), off=0, cones=(), cone_kind="c", inner_aoe=False, outer_aoe=False,
           lines=True, line_o=0.95, rims=False, outside=True, cone_out="#fde2a8", cone_out_o=0.75, wd=0.45, cones_outer=()):
    """cones_outer: cones that game8 shows on the outer ring (and beyond) only."""
    out = []
    # the cones' parts beyond the floor, under it
    if outside:
        for d, sp in tuple(cones) + tuple(cones_outer):
            out.append(cone(c, d, sp, 90, cone_out, cone_out_o))
    cuts = {round((off + 45 * k) % 360, 3) for k in range(8)}
    for d, sp in tuple(cones) + tuple(cones_outer):
        cuts.add(round((d - sp / 2) % 360, 3)); cuts.add(round((d + sp / 2) % 360, 3))
    cuts = sorted(cuts)
    for ring, rr, reds, aoe in (("out", Rr, red_out, outer_aoe), ("in", rin, red_in, inner_aoe)):
        for i, a0 in enumerate(cuts):
            a1 = cuts[(i + 1) % len(cuts)]
            span = (a1 - a0) % 360 or 360
            mid = (a0 + span / 2) % 360
            k = int(((mid - off) % 360) // 45)
            tile = "R" if k in reds else "D"
            hit = any(_in_arc(mid, d, sp) for d, sp in tuple(cones) + (tuple(cones_outer) if ring == "out" else ()))
            key = ("p" if aoe else "") + (cone_kind if hit else "")
            out.append(cone(c, a0 + span / 2, span + 0.15, rr, PAL[(ring, tile, key)], 1))
    if lines:
        out.append(ringl(c, rin, "#000000", wd, line_o))
        out += spokes(c, Rr, off, 0, "#000000", wd)
        for s in out[-8:]:
            s["o"] = line_o
    if rims:
        if inner_aoe or outer_aoe:
            out.append(ringl(c, rin, "#e6d38a", 0.55, 0.95))
        if outer_aoe:
            out.append(ringl(c, Rr, "#e6d38a", 0.55, 0.95))
    return out


def arc(c, r, a0, a1, col, wd=0.8, o=0.95, n=None):
    """An arc from compass angle a0 to a1 (clockwise), drawn as short lines."""
    span = (a1 - a0) % 360
    n = n or max(4, int(span / 6))
    pts = [pt(c, a0 + span * k / n, r) for k in range(n + 1)]
    return [line(p, q, col, wd, o) for p, q in zip(pts, pts[1:])]


def crescent(x, y, facing, r=4.2):
    """The blade marks at the edge in Roseblood: 5th Bloom: a gold crescent, its hollow facing `facing`."""
    c = (x, y)
    a0 = (facing + 180 - 70) % 360
    return (arc(c, r, a0, a0 + 140, "#fff1d0", 1.3, 0.95) + arc(c, r * 0.86, a0 + 8, a0 + 132, "#b8671c", 0.8, 0.95))


def stack_mark(cx, cy, d=6.0, w=5.0, h=2.2, col="#ffe23a"):
    """game8's stack marker: yellow chevrons on four sides pointing in, two deep."""
    out = []
    for a in (0, 90, 180, 270):
        for j, o in ((2.0, 0.5), (0, 0.95)):
            ux, uy = unit(a)
            px, py = cx + ux * (d + j), cy + uy * (d + j)
            out += chevron(px, py, (a + 180) % 360, w, h, col, 1.1, o)
    return out
