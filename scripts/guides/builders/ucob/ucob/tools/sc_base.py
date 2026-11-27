"""Scene pieces for the UCoB guide, redrawn from Tuufless's 500x500 round-arena diagrams.

Every coordinate here is in the source picture's pixels (0-500, read off a 25 px grid
sheet and the template-matched role labels in dl/roles.json); p() turns them into the
renderer's percent of a square frame. Sizes (radii, widths, lengths) are pixels too.
"""
import math

R = lambda v: round(v, 2)


def p(x, y):
    return [R(x / 5), R(y / 5)]


def s(v):
    return R(v / 5)


# the floor of each phase, as the source's textures read (dark, round, white outside)
FLOOR = {"TW": "#2e2724", "NA": "#282624", "BA": "#16211f", "AD": "#2e2119", "GB": "#2a1a17"}
EDGE = {"TW": "#14110f", "NA": "#141312", "BA": "#0c1416", "AD": "#160f0a", "GB": "#5a2a20"}
SALMON = "#f08a7e"
NL_C = "#8f6fe0"
NEURO = {"L": (162, 200), "R": (337, 200), "S": (250, 348)}


def scene(ph, roles=None, shapes=None, boss=None, bossSize=11, iconSize=6.4, **kw):
    sc = {"frame": [1, 1], "bg": "#f2f2f2",
          "arena": {"shape": "circle", "at": [50, 50], "r": 49.6, "fill": FLOOR[ph], "lines": False, "edge": EDGE[ph]},
          "waymarks": None, "iconSize": iconSize, "bossSize": bossSize}
    if boss:
        sc["boss"] = [p(*b) for b in boss] if isinstance(boss[0], (list, tuple)) else p(*boss)
    sc["roles"] = {}
    for k, v in (roles or {}).items():
        if isinstance(v[0], (list, tuple)):
            sc["roles"][k] = [p(*q) for q in v]
        else:
            sc["roles"][k] = p(*v)
    sc["shapes"] = shapes or []
    sc.update(kw)
    return sc


# ---------------------------------------------------------------- primitives (pixels in)
def circle(at, r, c=SALMON, o=0.45, wd=0.25):
    return {"t": "circle", "at": p(*at), "r": s(r), "c": c, "o": o, "wd": wd}


def ring(at, r, c="#ffffff", wd=0.5, o=0.95):
    return {"t": "ring", "at": p(*at), "r": s(r), "c": c, "wd": wd, "o": o}


def dot(at, r, c, o=1.0):
    return {"t": "dot", "at": p(*at), "r": s(r), "c": c, "o": o}


def donut(at, r, r2, c=SALMON, o=0.42):
    return {"t": "donut", "at": p(*at), "r": s(r), "r2": s(r2), "c": c, "o": o, "wd": 0.2}


def cone(at, d, spread, ln, c=SALMON, o=0.45):
    return {"t": "cone", "at": p(*at), "dir": R(d % 360), "spread": R(spread), "len": s(ln), "c": c, "o": o, "wd": 0.2}


def rect(at, w, h, rot=0, c=SALMON, o=0.42, wd=0.2):
    return {"t": "rect", "at": p(*at), "w": s(w), "h": s(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def line(a, b, c="#ffffff", wd=0.5, o=0.95, dash=False):
    d = {"t": "line", "from": p(*a), "to": p(*b), "c": c, "wd": wd, "o": o}
    if dash:
        d["dash"] = True
    return d


def arrow(a, b, c="#ffffff", wd=0.6, o=0.95):
    return {"t": "arrow", "from": p(*a), "to": p(*b), "c": c, "wd": wd, "o": o}


def text(at, t, size=2.6, c="#ffffff"):
    return {"t": "text", "at": p(*at), "s": t, "size": size, "c": c}


def path(pts, c="#ffffff", wd=0.6, o=0.95):
    """A bent arrow through several points (the source's hand-drawn curves)."""
    out = [line(pts[i], pts[i + 1], c, wd, o) for i in range(len(pts) - 2)]
    out.append(arrow(pts[-2], pts[-1], c, wd, o))
    return out


def arc_arrow(c, r, a0, a1, col="#ffffff", wd=0.6, n=10):
    """An arrow along a circle around c (px), from angle a0 to a1 (deg, 0 = up, clockwise)."""
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((c[0] + math.sin(a) * r, c[1] - math.cos(a) * r))
    return path(pts, col, wd)


def off(c, a, r):
    t = math.radians(a)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r)


# ---------------------------------------------------------------- the fight's pieces
def neuro(*which):
    """Neurolinks: purple floor circles (waymarks 1 / 2 / 3 sit on them)."""
    return [circle(NEURO[w], 22, NL_C, 0.75, 0.01) for w in which]


def label(at, t, size=2.3, c="#ffe9a8"):
    return text(at, t, size, c)


def twister(at):
    """A Twister swirl on the floor."""
    return [ring(at, 9, "#3fd0b4", 0.45, 0.95), ring(at, 5, "#3fd0b4", 0.4, 0.9), dot(at, 1.6, "#3fd0b4")]


def hatch(at, rot=0):
    """The Hatch (Generate) mark: three purple beads around the player."""
    out = []
    pts = [off(at, rot + a, 23) for a in (-60, 60, 180)]
    for i in range(3):
        out.append(line(pts[i], pts[(i + 1) % 3], "#c35ad8", 0.5, 0.95))
    for q in pts:
        out.append(dot(q, 4.2, "#5d1a78"))
    return out


def orb_aoe(at, r=88):
    """The black orb's explosion around the Neurolink."""
    return [circle(at, r, "#b45fd6", 0.38, 0.15)]


def stack(at, r=34, tri=True):
    """A Fireball / stack marker: the red down-triangle over the target and arrows in."""
    out = [circle(at, r, SALMON, 0.4, 0.2)]
    if tri:
        t = (at[0], at[1] - r - 2)
        out += [dot(t, 7, "#d42a1e"), dot(t, 3.5, "#ffd24a")]
    for a in (25, 70, 115, 160, 205, 250, 295, 340):
        out.append(arrow(off(at, a, r + 32), off(at, a, r + 6), "#ffffff", 0.45, 0.9))
    return out


def buster(at, c="#e0322a"):
    """A tankbuster on this player: red slashes beside them."""
    x, y = at
    return [line((x - 20, y - 4), (x - 30, y + 18), c, 0.7), line((x - 13, y - 6), (x - 23, y + 16), c, 0.7),
            line((x + 20, y - 18), (x + 26, y - 4), c, 0.7)]


def badge(at, t, c):
    """A debuff over a player: a small coloured tag with its name."""
    return [dot(at, 6.5, c, 0.95), text((at[0], at[1] + 0.4), t, 1.5, "#ffffff")]


def player(at):
    """Any player (the source's grey figure): a pale tile with a body."""
    x, y = at
    return [rect(at, 30, 30, 0, "#d9cfb6", 0.95, 0.3), dot((x, y - 5), 4.2, "#5a5248"), rect((x, y + 7), 15, 9, 0, "#5a5248", 0.95, 0.01)]


def dragon(at):
    """One of Nael's or Bahamut's dragons at the arena's edge."""
    return [dot(at, 21, "#c9ccd1", 0.95), ring(at, 21, "#55595f", 0.5, 0.95), text(at, "Dragon", 2.0, "#2b2d31")]


def boss_tag(at, t, size=2.2):
    return text(at, t, size, "#ffe9a8")


def tower(at, r=24):
    """A Megaflare / Heavensfall tower: a gold ring with a cross."""
    x, y = at
    return [circle(at, r, "#c9b03a", 0.35, 0.01), ring(at, r, "#f2d64b", 0.5, 0.95),
            line((x - r * 0.7, y - r * 0.7), (x + r * 0.7, y + r * 0.7), "#f2d64b", 0.4),
            line((x - r * 0.7, y + r * 0.7), (x + r * 0.7, y - r * 0.7), "#f2d64b", 0.4)]


def mf_mark(at):
    """The white Megaflare ring around a player."""
    return [ring(at, 22, "#ffffff", 0.45, 0.9)]


def es_mark(at):
    """The Earthshaker marker over a player."""
    x, y = at
    return [dot((x, y - 21), 5, "#ffe9a0", 0.95)]


def tether(a, b, c="#3fbf4a", wd=0.45):
    return line(a, b, c, wd, 0.95)


def pile(roles, at, step=None):
    """Several roles together on one spot (the source piles their labels): a tight ring of badges, so each seat stays readable."""
    n = len(roles)
    if n == 1:
        return {roles[0]: at}
    r = 9 + 2.6 * n
    return {k: (at[0] + math.sin(math.radians(i * 360 / n)) * r, at[1] - math.cos(math.radians(i * 360 / n)) * r) for i, k in enumerate(roles)}
