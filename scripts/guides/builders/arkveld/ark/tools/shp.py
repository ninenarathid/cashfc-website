"""Shape helpers for the Arkveld EX scenes (percent of a 1:1 frame, as game8's 440x440 pictures).

game8's Arkveld floor: a dark disc (centre 50.5,52, radius 41.5) with four waymarks, A north,
B east, C south, D west. render.mjs has no polygons or arcs: arcs are short lines, a half-room
cleave is a large rotated rect whose edge is the cleave's line.
"""
import math

R = lambda v: round(v, 2)

FLOOR = "#3d3e43"
EDGE = "#1d1e21"
ARENA = {"shape": "circle", "at": [50.5, 52], "r": 41.5, "fill": FLOOR, "lines": False, "edge": EDGE}
C = (50.5, 52)

ORANGE = "#ff9b3d"
RED = "#e04a50"
BOSSRING = "#c8283c"
YELLOW = "#ffd84d"
WHITE = "#ffffff"
STRIP = "#d8d2c4"
PINK_T = "#d0607e"
CRYSTAL = "#e9dff0"
BEAM = "#f07d96"
BLUE_N = "#4da3ff"
RED_N = "#ff4d5a"


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


def arrow(p0, p1, c=WHITE, wd=1.0, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


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


def text(x, y, s, size=3.4, c="#ffffff"):
    return {"t": "text", "at": [R(x), R(y)], "s": s, "size": size, "c": c}


def arc(c, r, a0, a1, col, wd=0.8, o=0.95, n=None):
    """Clockwise from a0 to a1 (degrees, 0 = up)."""
    span = (a1 - a0) % 360 or 360
    n = n or max(4, int(span / 4))
    pts = [pt(c, a0 + span * k / n, r) for k in range(n + 1)]
    return [line(p, q, col, wd, o) for p, q in zip(pts, pts[1:])]


def curved_arrow(c, r, a0, a1, col=WHITE, wd=1.3, o=0.98, cw=True):
    """An arc from a0 to a1 with an arrowhead at a1; cw False runs anticlockwise."""
    if cw:
        out = arc(c, r, a0, a1 - 3, col, wd, o)
        tail = pt(c, a1 - 6, r)
    else:
        out = arc(c, r, a1 + 3, a0, col, wd, o)
        tail = pt(c, a1 + 6, r)
    out.append(arrow(tail, pt(c, a1, r), col, wd, o))
    return out


def half_plane(p0, p1, side, col, o=0.5, depth=160, wd=0.3):
    """Everything on `side`'s side of the line through p0 and p1, as one large rect."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
    if (side[0] - mx) * nx + (side[1] - my) * ny < 0:
        nx, ny = -nx, -ny
    cx, cy = mx + nx * depth / 2, my + ny * depth / 2
    ang = math.degrees(math.atan2(uy, ux))
    return [rectc(cx, cy, 400, depth, col, o, wd, ang)]


def band(p0, p1, w, col=BEAM, o=0.55, wd=0.3):
    """A straight beam of width w from p0 to p1."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy)
    return [rectc((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, L, w, col, o, wd, math.degrees(math.atan2(dy, dx)))]


# ------------------------------------------------------------------ marks
def boss_ring(c, r=8.6, r2=7.0):
    return [ringl(c, r, BOSSRING, 0.75, 0.9), ringl(c, r2, BOSSRING, 0.55, 0.8)]


def target_arcs(c=(50.5, 51.5), r=15.0):
    """The boss's target circle as game8 draws it in the middle: red arcs open at the south."""
    return arc(c, r, 220, 140, BOSSRING, 0.8, 0.9) + arc(c, r - 2.2, 225, 135, BOSSRING, 0.45, 0.7)


def chevron(cx, cy, a, w=5.4, h=2.6, c=YELLOW, wd=1.4, o=0.95):
    """A chevron pointing in direction a (0 = up)."""
    ux, uy = unit(a)
    vx, vy = math.cos(math.radians(a)), math.sin(math.radians(a))
    tip = (cx + ux * h / 2, cy + uy * h / 2)
    w1 = (cx - ux * h / 2 + vx * w / 2, cy - uy * h / 2 + vy * w / 2)
    w2 = (cx - ux * h / 2 - vx * w / 2, cy - uy * h / 2 - vy * w / 2)
    return [line(w1, tip, c, wd, o), line(w2, tip, c, wd, o)]


def stack(cx, cy, dx=9.5, dy=9.5, n=2, w=5.4):
    """game8's stack marker: yellow chevrons on four sides, pointing in."""
    out = []
    for k in range(n):
        g = k * 1.6
        out += chevron(cx - dx - g, cy, 90, w)      # west side, pointing east
        out += chevron(cx + dx + g, cy, 270, w)     # east side, pointing west
        out += chevron(cx, cy - dy - g, 180, w)     # north side, pointing south
        out += chevron(cx, cy + dy + g, 0, w)       # south side, pointing north
    return out


def strip(x0, x1, col=STRIP, o=0.42, edge="#f0e27a"):
    """The white dash's line AoE down the middle (game8: a pale strip with yellow edges)."""
    return [rect(x0, -1, x1, 101, col, o, 0.01), line((x0, -1), (x0, 101), edge, 0.35, 0.9), line((x1, -1), (x1, 101), edge, 0.35, 0.9)]


def tower_t(c, r=6.0):
    """A tank (big) tower: pink with a bright centre."""
    return [circle(c, r, PINK_T, 0.35), ringl(c, r, "#ff9ab8", 0.55, 0.9), circle(c, r * 0.45, "#f3b6c6", 0.8), dot(c, r * 0.2, "#fff0f4", 0.95)]


def tower_n(c, r=5.6):
    """A normal tower: orange."""
    return [circle(c, r, "#e2783a", 0.7), ringl(c, r, "#f2a46a", 0.45, 0.9), ringl(c, r * 0.55, "#f2a46a", 0.3, 0.6)]


def aoe(c, r=12.0, o=0.5, col=ORANGE):
    return [circle(c, r, col, o), ringl(c, r, "#ffc07a", 0.3, 0.9)]


def big_aoe(c, r=12.0):
    """The ranged drops at the outer edge in game8's picture: paler orange."""
    return [circle(c, r, "#f7b464", 0.55), ringl(c, r, "#ffe0b0", 0.35, 0.9)]


def crystal(c, r):
    return [circle(c, r, CRYSTAL, 0.92), ringl(c, r, "#b9a0cc", 0.3, 0.9)]


def burst(c, r):
    """A crystal going off: orange with a yellow rim and the crystal's paler centre."""
    return [circle(c, r, "#e8662a", 0.55), ringl(c, r, "#f5d65a", 0.45, 0.95), circle(c, r * 0.35, "#f6a070", 0.6)]


def num(c, n, r=3.7):
    """A Clamorous Chase number as game8 draws it: odd blue, even red, a ring with the number."""
    col = BLUE_N if n % 2 else RED_N
    return [circle(c, r, "#1c1d22", 0.85), ringl(c, r, col, 0.7, 1), text(c[0], c[1] + 0.2, str(n), 5.0, col)]


def glove(c, up):
    """Clamorous Chase: a hand above the boss, an arrow up (raised, blue) or down (orange)."""
    col = "#3aa0ff" if up else "#ff8a2a"
    x, y = c
    a = arrow((x, y + 2.8), (x, y - 2.8), col, 1.3) if up else arrow((x, y - 2.8), (x, y + 2.8), col, 1.3)
    return [dot(c, 4.4, "#55575e", 1), ringl(c, 4.4, "#c8c8cc", 0.35, 0.9), a]


def head_mark(x, y, s=2.6, col="#e0508a"):
    """The beam target's marker over a head: a pink four-way arrow."""
    return [arrow((x, y), (x, y - s), col, 0.7), arrow((x, y), (x, y + s), col, 0.7),
            arrow((x, y), (x - s, y), col, 0.7), arrow((x, y), (x + s, y), col, 0.7)]


def badge(c, letter, s=6.0):
    """game8's generic role badge (T / H / D: anyone of that role)."""
    col = {"T": "#2f4fa8", "H": "#2c6a34", "D": "#6a2a2e"}[letter]
    return [rectc(c[0], c[1], s, s, col, 1, 0.25), text(c[0], c[1] + 0.2, letter, s * 0.62, "#ffffff")]


def arc3(p0, pm, p1, col=WHITE, wd=1.4, o=0.98, n=14):
    """A curved arrow from p0 through pm to p1 (the circle through the three points)."""
    (ax, ay), (bx, by), (cx, cy) = p0, pm, p1
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
    r = math.hypot(ax - ux, ay - uy)
    a0 = math.atan2(ay - uy, ax - ux)
    am = math.atan2(by - uy, bx - ux)
    a1 = math.atan2(cy - uy, cx - ux)
    # go from a0 to a1 the way that passes am
    def norm(a):
        return a % (2 * math.pi)
    span = norm(a1 - a0)
    if norm(am - a0) > span:
        span = span - 2 * math.pi
    pts = [(ux + r * math.cos(a0 + span * k / n), uy + r * math.sin(a0 + span * k / n)) for k in range(n + 1)]
    out = [line(p, q, col, wd, o) for p, q in zip(pts[:-2], pts[1:-1])]
    out.append(arrow(pts[-2], pts[-1], col, wd, o))
    return out


WM = {"A": ((51.5, 14), "#ff6f9a"), "B": ((89, 52), "#f2d65a"), "C": ((51.5, 89.5), "#6ab4ff"), "D": ((12.5, 51.5), "#c98ae8")}


def wm_rings(which="ABCD"):
    """game8 rings each waymark in its colour."""
    return [ringl(WM[k][0], 3.4, WM[k][1], 0.45, 0.9) for k in which]
