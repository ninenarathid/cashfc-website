"""Every scene of the UWU guide, redrawn from Tuufless's diagrams (ffxiv.tuufless.com/images/ultimates/uwu/).

Tuufless's boards are 500x500 top-down circles, north up. Here: frame 1:1, x/y in % of the frame,
sizes in % of the width. Measured on 5 % grid sheets (.work/uwu/grid) and checked on compare sheets.
Colours follow the source: red/pink = AoE, green = Garuda's wind (tornado, Wicked Wheel, bubble),
yellow bands = Titan's Landslide, yellow-orange big circle = Searing Wind, orange circle with a dark
dot = a boulder / Weight of the Land, teal = Ultima's AoE.
"""
import math

R = lambda v: round(v, 2)

FLOOR = {"garuda": "#56663f", "ifrit": "#4b3b2d", "titan": "#3f3a2b", "ultima": "#4b4547"}
RED = "#ff5a5a"
PINK = "#ff8a8a"
WIND = "#3fcf5a"
SEAR = "#e8b860"
SLIDE = "#e8cf7a"
BOULDER = "#ff9b3d"
TEAL = "#7fd6d0"
TETHER = "#ffe066"
MESO = "#36d14a"


def arena(kind, at=(50, 50), r=49.5):
    return {"shape": "circle", "at": [R(at[0]), R(at[1])], "r": R(r), "fill": FLOOR[kind], "lines": False}


def circle(c, r, col=RED, o=0.42, wd=0.25):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.0, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def line(a, b, c="#ffffff", wd=0.5, o=0.95, dash=False):
    s = {"t": "line", "from": [R(a[0]), R(a[1])], "to": [R(b[0]), R(b[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(*pts, c="#ffffff", wd=0.6, o=0.95):
    """A path of points; the last segment carries the head."""
    out = [line(pts[i], pts[i + 1], c, wd, o) for i in range(len(pts) - 2)]
    a, b = pts[-2], pts[-1]
    out.append({"t": "arrow", "from": [R(a[0]), R(a[1])], "to": [R(b[0]), R(b[1])], "c": c, "wd": wd, "o": o})
    return out


def cone(at, d, spread, ln, col=RED, o=0.4):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": col, "o": o, "wd": 0.2}


def donut(at, r, r2, col=RED, o=0.4):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": col, "o": o, "wd": 0.2}


def rect(at, w, h, rot=0, col=RED, o=0.4):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": col, "o": o, "wd": 0.15}


def band(start, heading, width, length=140, col=SLIDE, o=0.42):
    """A straight-line AoE (Landslide, a dash) from `start` along a compass heading."""
    t = math.radians(heading)
    c = (start[0] + math.sin(t) * length / 2, start[1] - math.cos(t) * length / 2)
    return rect(c, width, length, heading, col, o)


def through(center, heading, width, length=150, col=RED, o=0.38):
    """A band through `center` (both ways)."""
    return rect(center, width, length, heading, col, o)


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r)


def boss(sc, at, label, size=2.6, dy=6.2):
    sc.setdefault("boss", []).append([R(at[0]), R(at[1])])
    sc.setdefault("_labels", []).append(text((at[0], at[1] + dy), label, size, "#ffe9a8"))


BG = "#2c2d31"


def finish(sc):
    """Clip every shape to the arena (a frame-coloured mask outside it, then the rim again), as the
    source's boards are clipped; labels go last so they sit on top."""
    a = sc.get("arena") or {}
    mask = []
    if a.get("shape") == "circle":
        mask = [{"t": "donut", "at": a["at"], "r": 100, "r2": a["r"], "c": BG, "o": 1, "wd": 0.01},
                {"t": "ring", "at": a["at"], "r": a["r"], "c": "#1d1e22", "wd": 0.8, "o": 1}]
    sc["shapes"] = sc.get("shapes", []) + mask + sc.pop("_labels", [])
    if len(sc.get("boss", [])) == 1:
        sc["boss"] = sc["boss"][0]
    return sc


def scene(kind, at=(50, 50), r=49.5, **kw):
    sc = {"frame": [1, 1], "arena": arena(kind, at, r), "waymarks": None, "shapes": []}
    sc.update(kw)
    return sc


def cluster(center, seats, step=2.4):
    """Seats piled on one spot, fanned a little so each badge shows (as the source piles them)."""
    offs = [(0, 0), (step, -step * 0.6), (-step, -step * 0.6), (step, step * 0.6), (-step, step * 0.6),
            (0, -step * 1.2), (0, step * 1.2), (2 * step, 0)]
    return {s: [R(center[0] + offs[i][0]), R(center[1] + offs[i][1])] for i, s in enumerate(seats)}


ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]


def without(*seats):
    return [s for s in ALL if s not in seats]


# markers drawn as shapes
def green_mark(at):
    """The green arrow-head marker over a player (Mistral Song target)."""
    return [cone((at[0], at[1] - 3.2), 0, 60, 3.4, "#36d14a", 0.95)]


def stack_mark(at):
    """The red stack marker (Flaming Crush) over a player."""
    return [cone((at[0], at[1] - 3.0), 0, 64, 3.8, "#e02020", 0.95), dot((at[0], at[1] - 5.6), 0.9, "#ffd23f")]


def healer(at, flame=False):
    """A healer the source draws without a seat (H with a star): the random healer."""
    out = [dot(at, 2.7, "#2f7d3b"), text((at[0], at[1] + 0.2), "H", 2.8, "#ffffff")]
    if flame:
        out.append(dot((at[0] + 2.2, at[1] - 2.2), 1.1, "#ff7a1a"))
    return out


def anyone(at, col="#9a9a9a"):
    """A player the source draws without a seat (grey)."""
    return [dot(at, 2.5, col), dot((at[0], at[1] - 0.6), 0.9, "#ffffff", 0.9)]


def gaol(at):
    return [ring(at, 3.6, "#ffb347", 0.6), dot(at, 2.5, "#8a6a4a")]


def boulder(at, r=15, o=0.3):
    return [circle(at, r, BOULDER, o, 0.2), dot(at, 1.6, "#8a4b16")]


def nail(at):
    return dot(at, 2.3, "#d01818")


def searing(at, r=34):
    return circle(at, r, SEAR, 0.32, 0.25)


def frain(at, r=7.5):
    return circle(at, r, RED, 0.55, 0.2)


def plume(at):
    return dot(at, 1.5, "#ffb0d0")


def spiny(at):
    return dot(at, 1.9, "#7ff0e0")


def feather(at):
    return dot(at, 1.5, "#7ff0e0")


def orb_pair(a, b):
    return [line(a, b, "#c050c0", 0.6), dot(a, 2.6, "#8a1a8a"), dot(b, 2.6, "#8a1a8a")]


def num(at, s, col="#e03030", size=6):
    return text(at, s, size, col)


def xmark(at, s=2.6):
    return [line((at[0] - s, at[1] - s), (at[0] + s, at[1] + s), "#30e030", 0.5), line((at[0] - s, at[1] + s), (at[0] + s, at[1] - s), "#30e030", 0.5)]


# ============================================================ setup
def waymarks():
    """Tuufless's waymarks (centre 100,100; arena radius 20 y). The preset file's positions, but with 2 / 3 / 4
    as the source's in-game screenshot and its uses show them: 3 at the north-west edge (the Crimson Charge
    dodges to the NW), 4 south-east (the Midruda stack), 2 at the north edge. The preset's keys for those
    three are rotated against the screenshot."""
    k = 49.5 / 20
    P = lambda x, z: [R(50 + (x - 100) * k), R(50 + (z - 100) * k)]
    sc = scene("ultima")
    sc["waymarks"] = {"A": P(100, 93.3), "B": P(106.7, 100), "C": P(100, 106.7), "D": P(93.3, 100),
                      "1": P(100, 100), "2": P(100, 81.0), "3": P(87, 87), "4": P(107.3, 107.3)}
    sc["markSize"] = 6
    return finish(sc)


# ============================================================ P1 Garuda
def g01():
    sc = scene("garuda")
    boss(sc, (48, 50), "Garuda")
    sc["roles"] = {"MT": [50, 38], "ST": [68, 49], "H2": [85, 48], "H1": [88, 51], **cluster((49, 63), ["D1", "D2", "D3", "D4"])}
    sc["shapes"] += green_mark((85, 48))
    return finish(sc)


def g02():
    sc = scene("garuda")
    boss(sc, (50, 50), "Garuda")
    sc["shapes"] += [cone((50, 50), 91, 154, 49, RED, 0.3), cone((50, 50), -2, 90, 22, RED, 0.4)]
    sc["shapes"] += arrow((56, 50), (80, 49), c="#36d14a", wd=0.7)
    sc["shapes"] += green_mark((85, 48))
    sc["roles"] = {"MT": [41, 57], "ST": [68, 50], "H2": [85, 48], "H1": [88, 51], **cluster((46, 64), ["D1", "D2", "D3", "D4"])}
    return finish(sc)


def g03():
    sc = scene("garuda")
    sc["shapes"] += [circle((69, 50), 25, WIND, 0.55)]
    sc["shapes"] += arrow((50, 49), (34, 48))
    boss(sc, (31, 46), "Garuda", dy=-6)
    sc["roles"] = {"MT": [29, 36], "ST": [22, 47], **cluster((32, 59), ["H1", "H2", "D1", "D2", "D3", "D4"])}
    return finish(sc)


def g04():
    sc = scene("garuda")
    st = (31, 58)
    for p in [(58, 7), (95, 49), (88, 74), (21, 84)]:
        sc["shapes"] += [line(st, p, TETHER, 0.25, 0.8), plume(p)]
    sc["shapes"] += [spiny((24, 46))]
    boss(sc, (33, 47), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [28, 37], "ST": [21, 51], **cluster(st, ["H1", "H2", "D1", "D2", "D3", "D4"])}
    sc["shapes"] += [text((24, 42), "Spiny", 2.2, "#7ff0e0")]
    return finish(sc)


def g05():
    sc = scene("garuda")
    st = (31, 58)
    for p in [(58, 7), (95, 49), (88, 74), (21, 84)]:
        sc["shapes"] += [line(st, p, TETHER, 0.25, 0.8), plume(p)]
    sc["shapes"] += [cone((36, 49), -20, 90, 24, RED, 0.4), spiny((24, 47))]
    sc["shapes"] += arrow((37, 37), (30, 49))
    boss(sc, (34, 47), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [28, 53], "ST": [22, 51], **cluster(st, ["H1", "H2", "D1", "D2", "D3", "D4"])}
    return finish(sc)


def g06():
    sc = scene("garuda")
    sc["shapes"] += [cone((31, 49), -2, 110, 28, RED, 0.4), spiny((25, 49))]
    for p in [(33, 54), (35, 57), (31, 60), (36, 61)]:
        sc["shapes"] += [plume(p)]
    boss(sc, (31, 49), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [30, 39], "ST": [28, 55], **cluster((30, 59), ["H1", "H2", "D1", "D2", "D3", "D4"])}
    return finish(sc)


def g07():
    sc = scene("garuda")
    sc["shapes"] += [circle((25, 42), 7.5, RED, 0.4), spiny((25, 43)), line((25, 43), (40, 36), TETHER, 0.3),
                     frain((32, 55), 8), frain((33, 60), 7)]
    sc["shapes"] += arrow((33, 53), (45, 49))
    sc["roles"] = {"ST": [40, 36], "MT": [51, 45], **cluster((50, 55), ["H1", "H2", "D1", "D2", "D3", "D4"])}
    return finish(sc)


def g08():
    sc = scene("garuda")
    sc["shapes"] += [circle((27, 45), 15, RED, 0.45)]
    boss(sc, (50, 50), "Garuda")
    sc["roles"] = {"ST": [43, 34], "MT": [49, 39], **cluster((51, 56), ["H1", "H2", "D1", "D2", "D3", "D4"])}
    return finish(sc)


BUB = (27, 44)


def bubble():
    return circle(BUB, 15, WIND, 0.35)


def g09():
    sc = scene("garuda")
    sc["shapes"] += [bubble()]
    sc["shapes"] += arrow((39, 55), (33, 53))
    boss(sc, (54, 48), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [29, 53], "ST": [32, 50], **cluster((30, 56), ["H1", "H2", "D3", "D4"], 2.0), "D1": [42, 57], "D2": [47, 60]}
    return finish(sc)


def g10():
    sc = scene("garuda")
    sc["shapes"] += [bubble(), circle((38, 57), 8, PINK, 0.4)]
    sc["shapes"] += arrow((32, 56), (37, 60))
    boss(sc, (53, 50), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [30, 54], **cluster((33, 51), ["H1", "H2", "D3", "D4"], 2.0), "ST": [40, 61], "D1": [37, 58], "D2": [43, 59]}
    return finish(sc)


def g11():
    sc = scene("garuda")
    sc["shapes"] += [bubble(), circle((44, 59), 8, PINK, 0.4)]
    sc["shapes"] += arrow((34, 55), (41, 57))
    boss(sc, (52, 49), "Garuda", dy=-6.5)
    sc["roles"] = cluster((44, 59), ALL, 2.0)
    return finish(sc)


def g12():
    sc = scene("garuda")
    sc["shapes"] += [bubble()]
    sc["shapes"] += arrow((40, 60), (34, 53))
    boss(sc, (52, 48), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [47, 38], "D1": [33, 50], **cluster((44, 60), ["ST", "H1", "H2", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def g13():
    sc = scene("garuda")
    sc["shapes"] += [bubble()]
    sc["shapes"] += arrow((40, 59), (33, 54))
    boss(sc, (53, 48), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [45, 38], "D2": [31, 51], **cluster((44, 60), ["D1", "ST", "H1", "H2", "D3", "D4"], 2.0)}
    return finish(sc)


def g14():
    sc = scene("garuda")
    sc["shapes"] += [frain((42, 39), 7), frain((40, 50), 8), frain((41, 53), 7)]
    sc["shapes"] += arrow((44, 50), (59, 49))
    sc["roles"] = {"MT": [65, 39], **cluster((65, 50), ["D2", "ST", "H1", "H2", "D1", "D3", "D4"], 2.0)}
    return finish(sc)


def g15():
    sc = scene("garuda")
    boss(sc, (50, 49), "Garuda", dy=-6.5)
    boss(sc, (31, 49), "Sister", dy=-6.5)
    boss(sc, (69, 49), "Sister", dy=-6.5)
    sc["roles"] = {"MT": [50, 35], **cluster((50, 59), ["D2", "ST", "H1", "H2", "D1", "D3", "D4"], 2.0)}
    return finish(sc)


def g16():
    sc = scene("garuda")
    sc["shapes"] += [frain((49, 39), 7.5), frain((49, 58), 8.5)]
    sc["shapes"] += arrow((48, 44), (40, 49)) + arrow((52, 55), (59, 50)) + arrow((51, 61), (62, 66))
    boss(sc, (49, 49), "Garuda", dy=-7)
    sc["roles"] = {"MT": [37, 50], "ST": [62, 50], **cluster((66, 68), ["H2", "H1", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def g17():
    sc = scene("garuda")
    sc["shapes"] += [circle((50, 50), 20, RED, 0.45), donut((50, 50), 49.5, 31, RED, 0.45)]
    # the tanks' search paths: MT from N anticlockwise, ST from E clockwise
    pts_mt = [off((50, 50), a, 39) for a in range(355, 190, -15)]
    pts_st = [off((50, 50), a, 35) for a in range(95, 265, 15)]
    sc["shapes"] += arrow(*pts_mt, c="#4de1ff", wd=0.6) + arrow(*pts_st, c="#1aa0c0", wd=0.6)
    sc["shapes"] += [line((50, 4), (66, 63), "#36d14a", 0.6), line((96, 47), (69, 64), "#36d14a", 0.6)]
    sc["shapes"] += green_mark((66, 66))
    boss(sc, (50, 50), "Garuda", dy=-6.5)
    boss(sc, (50, 4), "Sister", dy=6)
    boss(sc, (96, 47), "Sister", dy=6)
    sc["roles"] = {"MT": [51, 27], "ST": [73, 50], **cluster((66, 67), ["H1", "H2", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def g18():
    sc = scene("garuda")
    sc["shapes"] += [circle((49, 25), 23, WIND, 0.5), circle((77, 73), 23, WIND, 0.5),
                     frain((50, 35)), frain((66, 50)), frain((68, 67), 8)]
    boss(sc, (50, 50), "Garuda", dy=-7)
    sc["roles"] = cluster((49, 55), ALL, 2.0)
    return finish(sc)


def _plumes_19(sc, st):
    for p in [(25, 12), (9, 27), (79, 84), (50, 94)]:
        sc["shapes"] += [line(st, p, TETHER, 0.25, 0.8), plume(p)]


def g19():
    sc = scene("garuda")
    st = (50, 56)
    _plumes_19(sc, st)
    sc["shapes"] += [cone((52, 42), 2, 90, 22, RED, 0.4), line((12, 49), (30, 49), MESO, 0.6), line((70, 49), (88, 49), MESO, 0.6)]
    sc["shapes"] += arrow((48, 36), (45, 50))
    boss(sc, (52, 41), "Garuda", dy=-6.5)
    boss(sc, (12, 49), "Sister", dy=6)
    boss(sc, (88, 49), "Sister", dy=6)
    sc["roles"] = {"ST": [30, 49], "D4": [70, 49], "MT": [44, 53], **cluster((51, 57), ["H1", "H2", "D1", "D2", "D3"], 2.0)}
    return finish(sc)


def g20():
    sc = scene("garuda")
    sc["shapes"] += [cone((50, 47), 0, 180, 25, RED, 0.4), circle((30, 49), 7.5, PINK, 0.45), circle((70, 49), 7.5, PINK, 0.45),
                     line((12, 49), (30, 49), MESO, 0.6), line((70, 49), (88, 49), MESO, 0.6)]
    for p in [(46, 52), (49, 50), (52, 51), (55, 50)]:
        sc["shapes"] += [plume(p)]
    boss(sc, (50, 47), "Garuda", dy=-6.5)
    boss(sc, (12, 49), "Sister", dy=6)
    boss(sc, (88, 49), "Sister", dy=6)
    sc["roles"] = {"MT": [50, 35], "ST": [30, 49], "D4": [70, 49], **cluster((50, 57), ["H1", "H2", "D1", "D2", "D3"], 2.0)}
    return finish(sc)


def g21():
    sc = scene("garuda")
    sc["shapes"] += [frain((50, 30)), frain((29, 45)), frain((51, 46), 8.5), frain((71, 45))]
    sc["shapes"] += arrow((52, 33), (60, 34)) + arrow((29, 49), (31, 56)) + arrow((50, 50), (50, 57)) + arrow((71, 49), (70, 56))
    sc["roles"] = {"MT": [64, 35], "ST": [32, 60], "D4": [70, 60], **cluster((50, 61), ["H1", "H2", "D1", "D2", "D3"], 2.0)}
    return finish(sc)


def g22():
    sc = scene("garuda")
    sc["shapes"] += [cone((55, 43), 38, 80, 26, RED, 0.4)]
    sc["shapes"] += arrow((56, 37), (48, 39))
    boss(sc, (55, 44), "Garuda", dy=-7)
    sc["roles"] = {"MT": [47, 41], **cluster((56, 53), ["ST", "D4", "H1", "H2", "D1", "D2", "D3"], 2.0)}
    return finish(sc)


def g23():
    sc = scene("garuda")
    sc["shapes"] += [donut((58, 41), 60, 20, RED, 0.3), circle((58, 41), 20, RED, 0.45),
                     text((60, 38), "1", 9, "#ffd0d0"), text((32, 62), "2", 12, "#ffd0d0")]
    sc["shapes"] += arrow((68, 25), (62, 35)) + arrow((49, 63), (53, 52))
    boss(sc, (58, 41), "Garuda", dy=-6.5)
    sc["roles"] = {"MT": [68, 19], **cluster((48, 66), ["ST", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def g24():
    sc = scene("garuda")
    sc["shapes"] += [cone((58, 41), 202, 180, 26, RED, 0.4)]
    boss(sc, (58, 41), "Garuda", dy=-6.5)
    sc["roles"] = cluster((53, 53), ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def g25():
    sc = scene("garuda")
    sc["shapes"] += [cone((55, 41), 32, 85, 25, RED, 0.4)]
    boss(sc, (55, 42), "Garuda", dy=-7)
    sc["roles"] = {"MT": [62, 54], **cluster((50, 56), ["ST", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def g26():
    sc = scene("garuda")
    for c in [(50, 26), (33, 42), (67, 42), (50, 59), (33, 77), (67, 77), (50, 92), (18, 24), (82, 24), (94, 52), (19, 86), (83, 86)]:
        sc["shapes"] += [circle(c, 17, RED, 0.32, 0.15)]
    sc["shapes"] += [rect((50, 50), 48, 100, 0, RED, 0.25)]
    sc["shapes"] += arrow((45, 50), (12, 50))
    boss(sc, (50, 5), "Ifrit", dy=6)
    sc["roles"] = cluster((6, 50), ALL, 1.8)
    return finish(sc)


# ============================================================ P2 Ifrit
def i01():
    sc = scene("ifrit")
    sc["shapes"] += [cone((50, 50), 180, 70, 27, RED, 0.4)]
    boss(sc, (50, 50), "Ifrit", dy=-6.5)
    sc["roles"] = {"ST": [49, 63], **cluster((51, 36), without("ST"), 2.0)}
    return finish(sc)


NAILS = {"TL": (41, 31), "TR": (57, 31), "BL": (31, 58), "BR": (68, 58)}


def i02():
    sc = scene("ifrit")
    sc["shapes"] += [nail(p) for p in NAILS.values()] + healer((49, 94), True)
    boss(sc, (50, 41), "Ifrit", dy=-7)
    sc["roles"] = {"MT": [50, 31], "D3": [27, 73], "D4": [72, 73], **cluster((50, 53), ["ST", "D2", "D1", "H1", "H2"], 2.0)}
    return finish(sc)


def i03():
    sc = scene("ifrit")
    sc["shapes"] += [searing((50, 92))]
    for c in [(31, 78), (19, 60), (22, 38), (36, 22), (69, 78), (81, 60), (78, 38), (64, 22)]:
        sc["shapes"] += [circle(c, 14, RED, 0.35, 0.15)]
    sc["shapes"] += [circle((50, 14), 20, RED, 0.4, 0.15)]
    sc["shapes"] += [nail(p) for p in NAILS.values()] + healer((49, 94), True)
    sc["shapes"] += arrow((27, 82), (25, 55), (37, 34), (48, 20)) + arrow((73, 82), (75, 55), (63, 34), (52, 20)) + arrow((50, 44), (50, 22))
    boss(sc, (50, 41), "Ifrit", dy=-7)
    sc["roles"] = {"MT": [50, 31], **cluster((50, 53), ["ST", "D2", "D1", "H1", "H2", "D3", "D4"], 2.0)}
    return finish(sc)


def i04():
    sc = scene("ifrit")
    sc["shapes"] += [searing((50, 98)), *[nail(p) for p in NAILS.values()], *healer((49, 94), True)]
    sc["shapes"] += arrow((66, 58), (33, 58), c="#ffc0c0", wd=0.7) + arrow((33, 57), (56, 32), c="#ffc0c0", wd=0.7) + arrow((56, 31), (43, 31), c="#ffc0c0", wd=0.7)
    sc["shapes"] += [num((75, 64), "1"), num((24, 64), "2"), num((64, 24), "3"), num((35, 24), "4")]
    boss(sc, (50, 41), "Ifrit", dy=-7)
    sc["roles"] = {"MT": [50, 31], **cluster((50, 53), ["ST", "D2", "D1", "H1", "H2", "D3", "D4"], 2.0)}
    return finish(sc)


def i05():
    sc = scene("ifrit")
    sc["shapes"] += [searing((50, 96)), *healer((49, 94), True)]
    boss(sc, (37, 28), "Ifrit", dy=7)
    sc["roles"] = {**cluster((24, 16), ["MT", "ST", "H1", "H2", "D1", "D2"], 2.0), "D3": [91, 48], "D4": [91, 53]}
    return finish(sc)


def i06():
    sc = scene("ifrit")
    sc["shapes"] += [searing((82, 84))]
    for c in [(88, 56), (83, 40), (73, 27), (60, 15), (47, 9)]:
        sc["shapes"] += [circle(c, 12, RED, 0.45, 0.15)]
    sc["shapes"] += arrow((90, 54), (86, 34), (74, 19), (56, 9), (34, 14))
    sc["shapes"] += arrow((56, 90), (75, 82)) + healer((81, 80), True)
    boss(sc, (37, 28), "Ifrit", dy=7)
    sc["roles"] = {**cluster((24, 16), ["MT", "ST", "H1", "H2", "D1", "D2"], 2.0), "D3": [21, 17], "D4": [24, 21]}
    return finish(sc)


def i07():
    sc = scene("ifrit")
    sc["shapes"] += [rect((50, 50), 100, 48, 0, RED, 0.35), rect((50, 50), 48, 100, 0, RED, 0.35), searing((85, 84)), *healer((84, 80), True)]
    boss(sc, (37, 28), "Ifrit", dy=7)
    sc["roles"] = cluster((22, 17), ["D3", "MT", "ST", "H1", "H2", "D1", "D2", "D4"], 2.0)
    return finish(sc)


def i08():
    sc = scene("ifrit")
    sc["shapes"] += [searing((26, 88)), searing((93, 46)), circle((23, 18), 7, RED, 0.45)]
    sc["shapes"] += stack_mark((23, 16)) + healer((27, 85), True) + healer((93, 45), True)
    sc["shapes"] += arrow((33, 17), (60, 25), (85, 37))
    boss(sc, (37, 28), "Ifrit", dy=7)
    sc["roles"] = cluster((23, 19), ["D3", "MT", "ST", "D4", "D1", "D2"], 2.0)
    return finish(sc)


IF4 = {"4": (35, 7), "3": (65, 7), "2": (10, 70), "1": (90, 70)}


def _ifrits(sc, real="4", labels=True):
    for k, p in IF4.items():
        boss(sc, p, "Ifrit (blue)" if k == real else "Ifrit", size=2.4, dy=-5.5 if p[1] < 20 else 6)
    if labels:
        sc["shapes"] += [num((40, 22), "4"), num((60, 22), "3"), num((27, 58), "2"), num((74, 58), "1")]


def i09():
    sc = scene("ifrit", (50, 53), 46)
    sc["shapes"] += [searing((65, 92), 33), *healer((65, 90), True)]
    _ifrits(sc)
    sc["roles"] = cluster((35, 11), ["MT", "D3", "D4", "ST", "D1", "D2", "H2"], 2.0)
    return finish(sc)


def i10():
    sc = scene("ifrit", (50, 53), 46)
    sc["shapes"] += [searing((68, 94), 33), through((50, 52), -66, 38, 160, RED, 0.35)]
    sc["shapes"] += arrow((32, 13), (20, 30)) + arrow((70, 86), (85, 64)) + healer((68, 90), True)
    _ifrits(sc)
    sc["roles"] = cluster((33, 9), ["MT", "D3", "D4", "ST", "D1", "D2", "H2"], 2.0)
    return finish(sc)


def i11():
    sc = scene("ifrit")
    sc["shapes"] += [searing((82, 66), 27), through((50, 50), 68, 34, 160, RED, 0.35)]
    sc["shapes"] += arrow((8, 40), (10, 60)) + arrow((88, 62), (88, 42)) + healer((90, 70), True)
    sc["shapes"] += [num((40, 22), "4"), num((60, 22), "3"), num((25, 57), "2")]
    boss(sc, (30, 6), "Ifrit (blue)", size=2.4, dy=6)
    boss(sc, (60, 6), "Ifrit", size=2.4, dy=6)
    sc["roles"] = cluster((8, 32), ["MT", "D3", "H1", "ST", "D1", "D2", "D4"], 2.0)
    return finish(sc)


def i12():
    sc = scene("ifrit")
    sc["shapes"] += [searing((85, 32), 28), through((50, 50), 200, 34, 160, RED, 0.35)]
    sc["shapes"] += healer((88, 31), True) + [num((40, 22), "4"), num((60, 22), "3")]
    boss(sc, (30, 6), "Ifrit (blue)", size=2.4, dy=6)
    boss(sc, (65, 6), "Ifrit", size=2.4, dy=6)
    sc["roles"] = cluster((7, 60), ["MT", "D3", "H1", "ST", "D1", "D2", "D4"], 2.0)
    return finish(sc)


def i13():
    sc = scene("ifrit")
    sc["shapes"] += [searing((85, 30), 28), through((50, 50), 157, 34, 160, RED, 0.35)]
    sc["shapes"] += healer((88, 27), True) + [num((40, 22), "4")]
    sc["roles"] = cluster((11, 62), ["MT", "D3", "H1", "ST", "D1", "D2", "D4"], 2.0)
    return finish(sc)


def i14():
    sc = scene("ifrit")
    sc["shapes"] += [searing((80, 32), 26), through((38, 57), 112, 30, 160, RED, 0.35), through((38, 57), 202, 30, 160, RED, 0.35)]
    sc["shapes"] += healer((87, 30), True)
    sc["roles"] = cluster((10, 65), ["MT", "D3", "H1", "ST", "D1", "D2", "D4"], 2.0)
    return finish(sc)


def i15():
    sc = scene("ifrit")
    sc["shapes"] += [searing((90, 37), 30), *healer((88, 36), True)]
    sc["shapes"] += arrow((23, 73), (55, 90))
    boss(sc, (24, 40), "Ifrit", dy=7)
    sc["roles"] = {"MT": [11, 30], **cluster((13, 66), ["ST", "D1", "D2", "H1", "H2"], 2.0), "D3": [66, 91], "D4": [70, 90]}
    return finish(sc)


def i16():
    sc = scene("ifrit")
    sc["shapes"] += [cone((22, 38), -62, 60, 25, RED, 0.4)]
    boss(sc, (24, 40), "Ifrit", dy=7)
    sc["roles"] = {"MT": [11, 30], **cluster((14, 67), ["D2", "H2", "H1", "ST", "D1"], 2.0), "D3": [69, 88], "D4": [74, 87]}
    return finish(sc)


def i17():
    sc = scene("ifrit")
    for c in [(15, 68), (28, 82), (50, 88), (72, 82)]:
        sc["shapes"] += [circle(c, 15, RED, 0.45, 0.15)]
    sc["shapes"] += [circle((10, 32), 7, RED, 0.45)] + stack_mark((10, 30))
    sc["shapes"] += arrow((77, 88), (52, 92), (25, 85), (10, 62), (10, 42))
    boss(sc, (20, 40), "Ifrit", dy=7)
    sc["roles"] = cluster((10, 33), ALL, 1.8)
    return finish(sc)


def i18():
    sc = scene("titan")
    sc["shapes"] += [circle((50, 50), 40, RED, 0.38)]
    boss(sc, (50, 50), "Titan", dy=7)
    sc["roles"] = {"H1": [14, 22], "MT": [10, 28], "D4": [7, 33], "H2": [6, 38], **cluster((10, 30), ["ST", "D1", "D2", "D3"], 1.6)}
    return finish(sc)


# ============================================================ P3 Titan
def t01():
    sc = scene("titan")
    sc["shapes"] += [cone((50, 50), 180, 70, 25, RED, 0.4)]
    boss(sc, (50, 50), "Titan", dy=-6.5)
    sc["roles"] = {"MT": [49, 65], **cluster((50, 34), without("MT"), 2.0)}
    return finish(sc)


def t02():
    sc = scene("titan")
    sc["shapes"] += [circle((50, 35), 15, RED, 0.38), circle((50, 65), 16, RED, 0.5)]
    sc["shapes"] += arrow((47, 62), (36, 52)) + arrow((53, 62), (63, 52)) + arrow((47, 38), (36, 46)) + arrow((53, 38), (63, 46))
    boss(sc, (50, 50), "Titan", dy=0.1)
    sc["roles"] = {**cluster((33, 49), ["MT", "H1", "D1", "D3"], 2.0), **cluster((66, 48), ["ST", "H2", "D2", "D4"], 2.0)}
    return finish(sc)


def t03():
    sc = scene("titan")
    sc["shapes"] += [circle((50, 50), 49.5, RED, 0.45, 0.1), circle((50, 57), 40, FLOOR["titan"], 1, 0.1),
                     ring((50, 57), 40, "#ff9a9a", 0.3), circle((50, 12), 40, PINK, 0.3)]
    boss(sc, (50, 10), "Titan", dy=-6)
    sc["roles"] = cluster((50, 85), ALL, 2.0)
    return finish(sc)


BOULDERS = [(39, 61), (61, 61), (23, 77), (61, 80), (77, 77)]


def t04():
    sc = scene("titan", (50, 50), 40)
    for b in BOULDERS:
        sc["shapes"] += boulder(b)
    boss(sc, (50, 5), "Titan", dy=6)
    sc["roles"] = cluster((48, 28), ALL, 1.8)
    return finish(sc)


def t05():
    sc = scene("titan", (50, 50), 40)
    for b in BOULDERS:
        sc["shapes"] += boulder(b)
    sc["shapes"] += arrow((50, 28), (41, 76))
    boss(sc, (50, 5), "Titan", dy=6)
    sc["roles"] = cluster((40, 82), ALL, 1.8)
    return finish(sc)


def t06():
    sc = scene("titan", (50, 50), 40)
    for h in (113, 151, 189, 227, 265):
        sc["shapes"] += [band((50, 6), h, 8, 130, SLIDE, 0.4)]
    sc["shapes"] += boulder((39, 80))
    for g in [(36, 32), (33, 43), (30, 55)]:
        sc["shapes"] += gaol(g) + arrow((g[0] + 3, g[1]), (g[0] + 11, g[1] + 1))
    boss(sc, (50, 6), "Titan", dy=6)
    sc["roles"] = {"MT": [21, 48]}
    return finish(sc)


def t07():
    sc = scene("titan", (50, 50), 40)
    for h in (100, 182, 225, 255, 285):
        sc["shapes"] += [band((50, 6), h, 8, 130, SLIDE, 0.4)]
    for c in [(47, 36), (45, 50), (43, 65), (39, 80)]:
        sc["shapes"] += [circle(c, 15, PINK, 0.3, 0.15)]
    for g in [(47, 36), (45, 50), (43, 65)]:
        sc["shapes"] += gaol(g)
    sc["shapes"] += [dot((39, 80), 1.6, "#8a4b16")]
    boss(sc, (50, 6), "Titan", dy=6)
    sc["roles"] = {"MT": [24, 27]}
    return finish(sc)


def t08():
    sc = scene("titan", (50, 50), 40)
    sc["shapes"] += [circle((45, 35), 15, "#e07020", 0.55), circle((43, 50), 15, "#e07020", 0.55), circle((42, 65), 15, "#e07020", 0.55)]
    boss(sc, (50, 6), "Titan", dy=6)
    sc["roles"] = cluster((24, 19), ["ST", "MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t09():
    sc = scene("titan", (50, 50), 40)
    sc["shapes"] += [circle((47, 39), 14, "#e07020", 0.55), circle((36, 17), 16, RED, 0.5), circle((38, 20), 15, RED, 0.4)]
    sc["shapes"] += arrow((38, 19), (58, 20))
    boss(sc, (50, 6), "Titan", dy=6)
    sc["roles"] = cluster((64, 20), ["ST", "MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t10():
    sc = scene("titan", (50, 50), 40)
    sc["shapes"] += [circle((64, 16), 15, RED, 0.5), circle((66, 18), 15, RED, 0.4)]
    sc["shapes"] += arrow((63, 20), (68, 37))
    boss(sc, (50, 6), "Titan", dy=6)
    sc["roles"] = cluster((68, 42), ["ST", "MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t11():
    sc = scene("titan", (50, 50), 40)
    for h in (0, 90, 135, 180, 270):
        sc["shapes"] += [band((50, 26), h, 10, 130, SLIDE, 0.4)]
    sc["shapes"] += arrow((57, 61), (49, 65)) + arrow((64, 58), (71, 51))
    boss(sc, (50, 22), "Titan", dy=-6)
    sc["roles"] = cluster((61, 59), ["ST", "MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t12():
    sc = scene("titan", (50, 50), 40)
    for h in (40, 112, 158, 222, 315):
        sc["shapes"] += [band((50, 22), h, 10, 130, SLIDE, 0.4)]
    boss(sc, (50, 22), "Titan", dy=-6)
    sc["roles"] = {**cluster((48, 59), ["ST", "D1", "D3", "H1"], 2.0), **cluster((74, 53), ["MT", "H2", "D2", "D4"], 2.0)}
    return finish(sc)


def t13():
    sc = scene("titan", (50, 50), 40)
    sc["shapes"] += [circle((50, 50), 40, RED, 0.45, 0.1), circle((50, 57), 30, FLOOR["titan"], 1, 0.1),
                     ring((50, 57), 30, "#ff9a9a", 0.3), circle((50, 30), 40, PINK, 0.3)]
    boss(sc, (50, 30), "Titan", dy=-6)
    sc["roles"] = cluster((50, 77), ["ST", "MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t14():
    sc = scene("titan", (50, 50), 30)
    sc["shapes"] += gaol((49, 51)) + healer((49, 51))
    boss(sc, (50, 22), "Titan", dy=-6)
    sc["roles"] = {"ST": [49, 40], **cluster((48, 65), ["MT", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def t15():
    sc = scene("titan", (50, 50), 30)
    for h in (45, 135, 180, 225, 315):
        sc["shapes"] += [band((50, 22), h, 10, 130, SLIDE, 0.4)]
    sc["shapes"] += arrow((36, 66), (28, 59)) + arrow((40, 70), (48, 73)) + arrow((64, 66), (72, 58)) + arrow((60, 70), (52, 73))
    boss(sc, (50, 22), "Titan", dy=-6)
    sc["roles"] = {**cluster((38, 68), ["H2", "H1", "D3", "D4"], 2.0), **cluster((63, 67), ["ST", "MT", "D1", "D2"], 2.0)}
    return finish(sc)


def t16():
    sc = scene("titan", (50, 50), 30)
    for h in (0, 90, 160, 200, 270):
        sc["shapes"] += [band((50, 22), h, 10, 130, SLIDE, 0.4)]
    boss(sc, (50, 22), "Titan", dy=-6)
    sc["roles"] = {**cluster((28, 60), ["H2", "MT"], 2.0), "ST": [73, 58], **cluster((51, 73), ["H1", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def t17():
    sc = scene("titan", (50, 50), 30)
    sc["shapes"] += [cone((48, 40), 0, 70, 25, RED, 0.35)]
    boss(sc, (48, 40), "Titan", dy=0.1)
    sc["roles"] = {"ST": [49, 25], **cluster((50, 48), ["MT", "H2", "H1", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


ROCKS = [(42, 42), (58, 42), (42, 57), (58, 57)]


def rocks(sc):
    for b in ROCKS:
        sc["shapes"] += boulder(b, 15, 0.25)


def t18():
    sc = scene("titan", (50, 50), 30)
    rocks(sc)
    sc["shapes"] += [circle((50, 25), 16, RED, 0.5), circle((51, 23), 15, RED, 0.35)]
    boss(sc, (50, 35), "Titan", dy=0.1)
    sc["roles"] = cluster((51, 24), ["MT", "H1", "H2", "ST", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t19():
    sc = scene("titan", (50, 50), 30)
    rocks(sc)
    sc["shapes"] += [circle((30, 34), 15, RED, 0.5), circle((70, 34), 15, RED, 0.5)]
    sc["shapes"] += arrow((46, 25), (34, 32)) + arrow((54, 25), (66, 32))
    boss(sc, (50, 35), "Titan", dy=0.1)
    sc["roles"] = {**cluster((29, 34), ["MT", "ST", "D1", "D2"], 2.0), **cluster((71, 33), ["H2", "H1", "D3", "D4"], 2.0)}
    return finish(sc)


def t20():
    sc = scene("titan", (50, 50), 30)
    rocks(sc)
    for h in (80, 180, 225, 260):
        sc["shapes"] += [band((48, 30), h, 9, 130, SLIDE, 0.4)]
    sc["shapes"] += [circle((21, 55), 15, RED, 0.45), circle((75, 55), 15, RED, 0.45)]
    sc["shapes"] += arrow((31, 63), (37, 73)) + arrow((74, 63), (68, 72))
    boss(sc, (48, 32), "Titan", dy=0.1)
    sc["roles"] = {**cluster((43, 77), ["MT", "ST", "D1", "D2"], 2.0), **cluster((64, 74), ["H2", "H1", "D3", "D4"], 2.0)}
    return finish(sc)


def t21():
    sc = scene("titan", (50, 50), 30)
    rocks(sc)
    for h in (45, 135, 200, 235, 315):
        sc["shapes"] += [band((48, 32), h, 9, 130, SLIDE, 0.4)]
    sc["shapes"] += arrow((40, 74), (52, 74)) + arrow((70, 64), (62, 72))
    boss(sc, (48, 32), "Titan", dy=0.1)
    sc["roles"] = cluster((57, 75), ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], 2.0)
    return finish(sc)


def t22():
    sc = scene("titan", (50, 50), 30)
    sc["shapes"] += [cone((52, 46), -60, 70, 28, RED, 0.35)]
    boss(sc, (54, 47), "Titan", dy=-6)
    sc["roles"] = {"MT": [28, 38], **cluster((52, 53), ["H2", "H1", "ST", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def t23(n=1):
    sc = scene("titan", (50, 50), 30)
    sc["shapes"] += [circle((29, 38), 15, RED, 0.45), circle((50, 48), 15, RED, 0.55)]
    sc["shapes"] += arrow((50, 55), (50, 74)) + arrow((47, 54), (31, 65)) + arrow((54, 46), (69, 37)) + arrow((52, 44), (56, 28)) + arrow((28, 42), (26, 60))
    boss(sc, (40, 35), "Titan", dy=-6)
    sc["roles"] = {"MT": [29, 38], **cluster((51, 50), ["H2", "H1", "ST", "D1", "D2", "D3", "D4"], 2.0)}
    return finish(sc)


def t24():
    sc = scene("titan", (50, 50), 30)
    sc["shapes"] += [circle((65, 25), 15, RED, 0.45), circle((72, 35), 15, RED, 0.45), circle((28, 53), 15, RED, 0.45), circle((35, 70), 14, RED, 0.45)]
    sc["shapes"] += arrow((63, 30), (57, 45)) + arrow((70, 40), (59, 47)) + arrow((32, 56), (51, 51)) + arrow((45, 67), (53, 53)) + arrow((28, 50), (30, 35))
    boss(sc, (40, 35), "Titan", dy=-6)
    sc["roles"] = {"D1": [43, 22], "H2": [48, 21], "D4": [61, 24], "H1": [70, 31], "MT": [27, 53], "D2": [30, 55], "D3": [35, 67], "ST": [45, 69]}
    return finish(sc)


# ============================================================ P5 Ultima
def u_pred1():
    sc = scene("ultima")
    sc["shapes"] += [circle((32, 23), 7, RED, 0.4)]
    boss(sc, (47, 22), "Ultima", dy=-6.5)
    sc["roles"] = {"MT": [32, 23], "ST": [66, 22], **cluster((50, 43), ["D1", "D2", "H1", "H2", "D3", "D4"], 2.0)}
    return finish(sc)


def u_pred2():
    sc = scene("ultima")
    sc["shapes"] += [circle((67, 22), 15, RED, 0.4)]
    sc["shapes"] += arrow((32, 28), (44, 40))
    boss(sc, (47, 22), "Ultima", dy=-6.5)
    sc["roles"] = {"ST": [66, 22], **cluster((50, 43), ["MT", "D1", "D2", "H1", "H2", "D3", "D4"], 2.0)}
    return finish(sc)


def u_pred3():
    sc = scene("ultima")
    sc["shapes"] += [circle((50, 42), 10, RED, 0.4)]
    sc["shapes"] += arrow((66, 28), (56, 41))
    boss(sc, (47, 22), "Ultima", dy=-6.5)
    sc["roles"] = cluster((50, 42), ["MT", "ST", "D1", "D2", "H1", "H2", "D3", "D4"], 2.0)
    return finish(sc)


def _pred_bosses(sc, g, u, t, i):
    boss(sc, g, "Garuda", dy=-6.5)
    boss(sc, u, "Ultima", dy=6.5 if u[1] < 50 else -6.5)
    boss(sc, t, "Titan", dy=6.5)
    boss(sc, i, "Ifrit", dy=6.5 if i[1] < 50 else -6.5)


def _wheel_first(sc, g):
    sc["shapes"] += [circle(g, 20, WIND, 0.42)]


def _tornado(sc, g):
    sc["shapes"] += [donut(g, 75, 20, WIND, 0.28)]


# Method 1 example: Garuda centre-west, Ultima NE, Titan W, Ifrit SE
P4A = dict(g=(46, 52), u=(85, 15), t=(8, 45), i=(85, 85))


def pred4a(n):
    sc = scene("ultima")
    g, u, t, i = P4A["g"], P4A["u"], P4A["t"], P4A["i"]
    if n == 1:
        _pred_bosses(sc, g, u, t, i)
        return finish(sc)
    if n == 2:
        _wheel_first(sc, g)
        sc["shapes"] += [through((50, 50), 315, 40, 170, RED, 0.3)]
        for h in (45, 90, 135):
            sc["shapes"] += [band(t, h, 14, 130, SLIDE, 0.4)]
        _pred_bosses(sc, g, u, t, i)
        sc["roles"] = {**cluster((54, 5), ["D4", "H1", "D1", "D2"], 2.0), **cluster((96, 55), ["MT", "ST", "H2", "D3"], 2.0)}
        return finish(sc)
    if n == 3:
        _tornado(sc, g)
        sc["shapes"] += [circle(g, 20, RED, 0.35), through((46, 50), 0, 22, 160, RED, 0.3), through((46, 50), 90, 22, 160, RED, 0.3),
                         circle((80, 25), 25, TEAL, 0.35)]
        for h in (67, 112):
            sc["shapes"] += [band(t, h, 14, 130, SLIDE, 0.4)]
        sc["shapes"] += arrow((54, 4), (47, 3))
        _pred_bosses(sc, g, u, t, i)
        sc["roles"] = {**cluster((45, 4), ["D4", "H1", "D1", "D2"], 2.0), **cluster((96, 55), ["MT", "ST", "H2", "D3"], 2.0)}
        return finish(sc)
    sc["shapes"] += [frain((47, 6), 8), frain((98, 56), 7)]
    sc["shapes"] += arrow((48, 10), (50, 21)) + arrow((92, 56), (81, 58))
    sc["roles"] = {**cluster((50, 26), ["D4", "H1", "D1", "D2"], 2.0), **cluster((76, 58), ["MT", "ST", "H2", "D3"], 2.0)}
    return finish(sc)


def pred_dodge(kind, n):
    """Method 2 examples. kind 4: Garuda c, Titan W, Ultima SW, Ifrit SE / 3 and 1: Ultima NE, Titan E, Ifrit SW."""
    sc = scene("ultima")
    if kind == 4:
        g, u, t, i = (46, 52), (17, 85), (8, 43), (85, 85)
        dash, slides1, slides2 = 315, (45, 90, 135), (67, 112)
        ult = (20, 77)
        x2 = [(66, 4), (96, 33)]
        x3 = [(33, 4), (66, 4), (96, 33), (96, 66)]
        moves = [((52, 3), (37, 4)), ((98, 55), (97, 63))]
        rains = [(33, 4), (66, 4), (98, 33), (98, 67)]
    elif kind == 3:
        g, u, t, i = (55, 55), (80, 20), (95, 57), (17, 83)
        dash, slides1, slides2 = 45, (225, 270, 315), (248, 292)
        ult = (82, 26)
        x2 = [(34, 4), (4, 33)]
        x3 = [(34, 4), (4, 33), (4, 67)]
        moves = [((3, 55), (4, 63))]
        rains = [(34, 4), (4, 33), (4, 67)]
    else:
        g, u, t, i = (44, 56), (78, 20), (95, 57), (15, 85)
        dash, slides1, slides2 = 45, (225, 270, 315), (248, 292)
        ult = (82, 26)
        x2 = [(34, 4)]
        x3 = [(34, 4)]
        moves = [((44, 2), (37, 3))]
        rains = [(34, 4)]
    if n == 1:
        if kind == 1:
            _wheel_first(sc, g)
        _pred_bosses(sc, g, u, t, i)
        return finish(sc)
    if n == 2:
        _wheel_first(sc, g)
        sc["shapes"] += [through((50, 50), dash, 40, 170, RED, 0.3)]
        for h in slides1:
            sc["shapes"] += [band(t, h, 14, 130, SLIDE, 0.4)]
        for p in x2:
            sc["shapes"] += xmark(p)
        _pred_bosses(sc, g, u, t, i)
        return finish(sc)
    if n == 3:
        _tornado(sc, g)
        sc["shapes"] += [circle(g, 20, RED, 0.35), through(g, (dash + 45) % 180, 22, 160, RED, 0.28), through(g, (dash + 135) % 180, 22, 160, RED, 0.28),
                         circle(ult, 25, TEAL, 0.35)]
        for h in slides2:
            sc["shapes"] += [band(t, h, 14, 130, SLIDE, 0.4)]
        for p in x3:
            sc["shapes"] += xmark(p)
        for a, b in moves:
            sc["shapes"] += arrow(a, b)
        _pred_bosses(sc, g, u, t, i)
        return finish(sc)
    for p in rains:
        q = (50 + (p[0] - 50) * 0.75, 50 + (p[1] - 50) * 0.75)
        sc["shapes"] += [frain(p, 8)] + arrow(p, q)
    return finish(sc)


# ---------------------------------------------------------------- Annihilation
HEX = [(42, 38), (58, 38), (34, 50), (66, 50), (42, 62), (58, 62)]


def hexrocks(sc, o=0.28):
    for b in HEX:
        sc["shapes"] += boulder(b, 16, o)


def a01():
    sc = scene("ultima")
    boss(sc, (50, 48), "Ultima", dy=7)
    boss(sc, (50, 5), "Ifrit", dy=6)
    sc["roles"] = {**cluster((51, 31), ["MT", "ST", "H1", "H2", "D1", "D2"], 2.0), "D3": [46, 93], "D4": [54, 93]}
    return finish(sc)


def a02():
    sc = scene("ultima")
    for c in [(17, 47), (16, 63), (30, 79), (50, 86), (70, 79), (84, 63), (83, 47)]:
        sc["shapes"] += [circle(c, 18, RED, 0.35, 0.15)]
    sc["shapes"] += arrow((50, 88), (22, 70), (17, 50), (34, 34), (44, 33)) + arrow((52, 88), (78, 70), (84, 50), (66, 34), (56, 33))
    boss(sc, (50, 48), "Ultima", dy=7)
    boss(sc, (50, 5), "Ifrit", dy=6)
    sc["roles"] = cluster((51, 31), ["MT", "D3", "D4", "ST", "H1", "H2", "D1", "D2"], 2.0)
    return finish(sc)


def a03():
    sc = scene("ultima")
    for a in range(0, 360, 45):
        sc["shapes"] += [circle(off((50, 50), a, 38), 18, RED, 0.35, 0.15)]
    boss(sc, (50, 48), "Ultima", dy=7)
    boss(sc, (12, 88), "Titan", dy=-6)
    sc["roles"] = cluster((51, 31), ["MT", "D3", "D4", "ST", "H1", "H2", "D1", "D2"], 2.0)
    return finish(sc)


def a04():
    sc = scene("ultima")
    hexrocks(sc)
    for h in (330, 0, 30):
        sc["shapes"] += [band((50, 30), h, 10, 60, RED, 0.35)]
    for h in (5, 25, 45, 75):
        sc["shapes"] += [band((10, 92), h, 10, 140, SLIDE, 0.4)]
    sc["shapes"] += arrow((50, 22), (51, 5), (43, 4))
    boss(sc, (50, 30), "Ultima", dy=-6)
    boss(sc, (10, 92), "Titan", dy=-6)
    sc["roles"] = cluster((38, 5), ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], 1.8)
    return finish(sc)


def a05():
    sc = scene("ultima")
    hexrocks(sc)
    for h in (15, 35, 60):
        sc["shapes"] += [band((10, 92), h, 10, 140, SLIDE, 0.4)]
    sc["shapes"] += arrow((43, 6), (57, 7))
    boss(sc, (50, 27), "Ultima", dy=-6)
    boss(sc, (10, 92), "Titan", dy=-6)
    sc["roles"] = cluster((63, 10), ["D3", "D4", "MT", "ST", "H1", "H2", "D1", "D2"], 1.8)
    return finish(sc)


def a06():
    sc = scene("ultima")
    hexrocks(sc)
    sc["shapes"] += [circle((8, 50), 25, WIND, 0.4), circle((92, 50), 25, WIND, 0.4), circle((68, 11), 7, RED, 0.4)]
    boss(sc, (50, 27), "Ultima", dy=-6)
    boss(sc, (50, 50), "Garuda", dy=7)
    boss(sc, (10, 50), "Sister", dy=6)
    boss(sc, (90, 50), "Sister", dy=6)
    boss(sc, (10, 92), "Titan", dy=-6)
    sc["roles"] = {"MT": [68, 11], **cluster((45, 10), ["D3", "ST", "D4", "H1", "H2", "D1", "D2"], 1.8)}
    return finish(sc)


def a07():
    sc = scene("ultima")
    hexrocks(sc)
    sc["shapes"] += [frain((43, 11), 8), frain((66, 12), 7)]
    sc["shapes"] += arrow((40, 13), (31, 17)) + arrow((67, 18), (71, 23))
    boss(sc, (50, 27), "Ultima", dy=-6)
    boss(sc, (50, 50), "Garuda", dy=7)
    boss(sc, (10, 92), "Titan", dy=-6)
    sc["roles"] = {"MT": [73, 25], **cluster((27, 19), ["D3", "ST", "D4", "H1", "H2", "D1", "D2"], 1.8)}
    return finish(sc)


def a08():
    sc = scene("ultima")
    sc["shapes"] += [frain((35, 25), 8), circle((70, 12), 10, RED, 0.3), frain((72, 26), 7)]
    sc["shapes"] += arrow((36, 29), (38, 36)) + arrow((72, 24), (71, 17))
    boss(sc, (50, 27), "Ultima", dy=-6)
    boss(sc, (10, 92), "Titan", dy=-6)
    sc["roles"] = {"MT": [69, 14], **cluster((39, 41), ["H2", "D3", "D4", "ST", "H1", "D1", "D2"], 1.8)}
    return finish(sc)


def a09():
    sc = scene("ultima")
    sc["shapes"] += [circle((38, 38), 15, RED, 0.4)] + stack_mark((38, 36))
    boss(sc, (51, 15), "Ultima", dy=-6)
    boss(sc, (88, 80), "Ifrit", dy=7)
    sc["roles"] = cluster((38, 39), ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], 1.8)
    return finish(sc)


def a10():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 30, RED, 0.38), circle((61, 40), 15, RED, 0.4), line((50, 93), (60, 42), MESO, 0.6)]
    sc["shapes"] += stack_mark((61, 38))
    boss(sc, (48, 15), "Ultima", dy=-6)
    boss(sc, (88, 80), "Ifrit", dy=7)
    boss(sc, (50, 93), "Garuda", dy=-6)
    sc["roles"] = cluster((60, 40), ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], 1.8)
    return finish(sc)


def a11():
    sc = scene("ultima")
    sc["shapes"] += [circle((68, 30), 18, WIND, 0.42), circle((42, 40), 15, RED, 0.4), circle((44, 63), 7, RED, 0.35), line((44, 63), (50, 93), MESO, 0.6)]
    sc["shapes"] += arrow((43, 37), (36, 22)) + arrow((40, 40), (24, 38)) + arrow((46, 38), (62, 28)) + arrow((43, 44), (44, 58))
    boss(sc, (48, 15), "Ultima", dy=-6)
    boss(sc, (88, 80), "Ifrit", dy=7)
    boss(sc, (50, 93), "Garuda", dy=-6)
    sc["roles"] = {**cluster((66, 22), ["MT", "ST"], 2.0), **cluster((18, 38), ["H1", "H2"], 2.0),
                   **cluster((35, 18), ["D1", "D2", "D4"], 2.0), "D3": [44, 63]}
    return finish(sc)


def a12():
    sc = scene("ultima")
    sc["shapes"] += [circle((60, 40), 18, WIND, 0.42), frain((34, 22), 7), frain((13, 40), 7), frain((45, 62), 7), frain((67, 22), 7)]
    sc["shapes"] += arrow((35, 18), (40, 9)) + arrow((13, 36), (13, 27)) + arrow((13, 44), (13, 53)) + arrow((47, 63), (58, 57)) + arrow((66, 27), (58, 20))
    sc["shapes"] += healer((13, 25)) + healer((13, 58), True)
    boss(sc, (48, 15), "Ultima", dy=-6)
    boss(sc, (88, 80), "Ifrit", dy=7)
    sc["roles"] = {**cluster((53, 9), ["MT", "ST"], 2.0), **cluster((42, 6), ["D1", "D2", "D4"], 2.0), "D3": [60, 55]}
    return finish(sc)


def a13():
    sc = scene("ultima")
    sc["shapes"] += [through((50, 50), 315, 70, 180, RED, 0.28)]
    for h in (0, 45, 90):
        sc["shapes"] += [band((12, 90), h, 13, 140, SLIDE, 0.4)]
    sc["shapes"] += healer((49, 95), True)
    boss(sc, (48, 22), "Ultima", dy=-6)
    boss(sc, (12, 90), "Titan", dy=-6)
    boss(sc, (82, 80), "Ifrit", dy=7)
    sc["roles"] = {"MT": [64, 7], **cluster((42, 7), ["H1", "ST", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def a14():
    sc = scene("ultima")
    sc["shapes"] += [through((42, 46), 0, 22, 160, RED, 0.3), through((42, 46), 90, 20, 160, RED, 0.3)]
    for h in (22, 67):
        sc["shapes"] += [band((12, 90), h, 13, 140, SLIDE, 0.4)]
    sc["shapes"] += [line((24, 15), (50, 93), MESO, 0.6)] + healer((80, 80), True) + arrow((65, 92), (76, 86))
    sc["shapes"] += arrow((44, 6), (29, 10)) + arrow((56, 6), (72, 11))
    boss(sc, (48, 22), "Ultima", dy=-6)
    boss(sc, (12, 90), "Titan", dy=-6)
    boss(sc, (50, 93), "Garuda", dy=-6)
    sc["roles"] = {"MT": [77, 13], **cluster((24, 15), ["H1", "ST", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def a15():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 28, RED, 0.4), searing((45, 75), 35), circle((60, 30), 17, WIND, 0.42),
                     circle((45, 73), 5, RED, 0.35), line((45, 73), (50, 93), MESO, 0.6)]
    sc["shapes"] += healer((45, 73), True) + arrow((80, 82), (50, 75)) + arrow((75, 16), (63, 26)) + arrow((21, 16), (31, 28))
    boss(sc, (48, 18), "Ultima", dy=-6)
    boss(sc, (12, 90), "Titan", dy=-6)
    boss(sc, (50, 93), "Garuda", dy=-6)
    sc["roles"] = {"MT": [60, 30], **cluster((34, 32), ["H1", "ST", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def a16():
    sc = scene("ultima")
    sc["shapes"] += [searing((50, 73), 35), circle((57, 32), 17, WIND, 0.42), frain((34, 32), 8), frain((71, 27), 7), frain((36, 71), 7)]
    sc["shapes"] += healer((55, 71), True) + arrow((42, 71), (51, 71)) + arrow((70, 28), (62, 30)) + arrow((31, 30), (31, 23))
    boss(sc, (48, 18), "Ultima", dy=-6)
    boss(sc, (12, 90), "Titan", dy=-6)
    sc["roles"] = {"MT": [59, 30], **cluster((31, 18), ["H1", "ST", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


# ---------------------------------------------------------------- Suppression
def s_eye(sw=True, inner=(50, 47), r2=30):
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, r2, RED, 0.4)]
    if sw:
        sc["shapes"] += [searing((50, 82), 35)] + healer((50, 77), True)
    boss(sc, (50, 47), "Ultima", dy=7)
    return sc


def s01():
    sc = s_eye(True)
    sc["roles"] = {"MT": [50, 24], "ST": [64, 33], **cluster((34, 32), ["H1", "H2", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s02():
    sc = scene("ultima")
    sc["shapes"] += [circle((66, 40), 15, RED, 0.4)]
    boss(sc, (50, 45), "Ultima", dy=7)
    sc["roles"] = {"MT": [50, 24], "ST": [65, 40], **cluster((35, 32), ["H2", "H1", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s03():
    sc = s_eye(False)
    sc["roles"] = {"MT": [50, 24], "ST": [64, 40], **cluster((33, 33), ["H2", "H1", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s04():
    sc = scene("ultima")
    for c in [(50, 30), (32, 52), (68, 52), (50, 72)]:
        sc["shapes"] += [circle(c, 20, RED, 0.38, 0.15)]
    boss(sc, (50, 45), "Ultima", dy=0.1)
    sc["roles"] = {"MT": [50, 7], "ST": [76, 25], **cluster((25, 22), ["H2", "H1", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s05():
    sc = scene("ultima")
    sc["shapes"] += [cone((50, 40), 0, 90, 30, RED, 0.38)]
    boss(sc, (50, 47), "Ultima", dy=7)
    sc["roles"] = {"MT": [49, 24], "ST": [64, 42], **cluster((31, 35), ["H2", "H1", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s06():
    return s03()


def s07():
    sc = scene("ultima")
    sc["shapes"] += [circle((66, 40), 15, RED, 0.4)] + healer((50, 77))
    boss(sc, (50, 45), "Ultima", dy=7)
    sc["roles"] = {"MT": [50, 24], "ST": [65, 40], **cluster((35, 32), ["H1", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


SUP_BOSSES = dict(g=(14, 12), u=(86, 14), t=(14, 88), i=(86, 88))


def _sup_bosses(sc, sisters=True):
    boss(sc, SUP_BOSSES["g"], "Garuda", dy=7)
    boss(sc, SUP_BOSSES["u"], "Ultima", dy=7)
    boss(sc, SUP_BOSSES["t"], "Titan", dy=-6.5)
    boss(sc, SUP_BOSSES["i"], "Ifrit", dy=-6.5)
    if sisters:
        boss(sc, (36, 37), "Sister", dy=6)
        boss(sc, (63, 63), "Sister", dy=6)


FAN = {"D1": [4, 54], "H1": [5, 38], "D3": [12, 23], "D2": [23, 12], "H2": [38, 5], "D4": [54, 4]}


def s09():
    sc = scene("ultima")
    _sup_bosses(sc)
    sc["shapes"] += [text((8, 66), "West", 2.4, "#ffe9a8"), text((67, 9), "North", 2.4, "#ffe9a8")]
    sc["roles"] = {**FAN, "MT": [27, 70], "ST": [35, 77]}
    return finish(sc)


def s10():
    sc = scene("ultima")
    sc["shapes"] += [circle((12, 38), 22, RED, 0.38), circle((48, 10), 18, RED, 0.38)]
    for p in FAN.values():
        sc["shapes"] += anyone(p)
    sc["shapes"] += green_mark((12, 23)) + green_mark((4, 54))
    _sup_bosses(sc)
    sc["roles"] = {"MT": [27, 70], "ST": [35, 77]}
    return finish(sc)


def s11():
    sc = scene("ultima")
    for c in [(30, 40), (38, 28), (52, 30), (55, 48), (70, 65)]:
        sc["shapes"] += [circle(c, 18, RED, 0.35, 0.15)]
    sc["shapes"] += arrow((6, 38), (48, 50)) + arrow((24, 12), (47, 48)) + arrow((54, 5), (51, 46))
    sc["shapes"] += arrow((74, 62), (80, 46))
    sc["shapes"] += anyone((79, 42)) + anyone((82, 44)) + gaol((70, 65)) + anyone((28, 77)) + green_mark((28, 77)) + anyone((25, 79))
    _sup_bosses(sc)
    sc["roles"] = {"MT": [27, 70], "ST": [35, 77]}
    return finish(sc)


def s12():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 43, WIND, 0.45), cone((14, 12), 135, 90, 62, WIND, 0.32), circle((70, 65), 18, RED, 0.38),
                     line((36, 37), (28, 70), MESO, 0.6), line((63, 63), (35, 77), MESO, 0.6)]
    sc["shapes"] += [feather((15, 77)), feather((82, 14)), feather((82, 80)), feather((15, 25))]
    sc["shapes"] += anyone((79, 42)) + anyone((82, 44)) + gaol((70, 65)) + anyone((28, 77)) + green_mark((28, 77)) + anyone((25, 79))
    _sup_bosses(sc)
    sc["roles"] = {"MT": [27, 70], "ST": [35, 77]}
    return finish(sc)


def s13():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 43, WIND, 0.45), circle((20, 80), 25, WIND, 0.42), circle((35, 85), 20, WIND, 0.35),
                     frain((24, 73), 7), frain((30, 78), 7), frain((79, 45), 9)]
    sc["shapes"] += [feather((15, 15)), feather((82, 20)), feather((82, 80)), feather((15, 85))]
    sc["shapes"] += arrow((22, 78), (14, 60), (15, 45)) + arrow((29, 80), (48, 82)) + arrow((78, 41), (61, 33))
    sc["shapes"] += anyone((15, 40)) + anyone((58, 32)) + gaol((70, 68))
    _sup_bosses(sc, sisters=False)
    sc["roles"] = cluster((53, 82), ["MT", "ST"], 2.0)
    return finish(sc)


def _sup_bands(sc):
    sc["shapes"] += [through((50, 50), 45, 24, 150, SLIDE, 0.3), rect((82, 50), 14, 100, 0, SLIDE, 0.22), rect((50, 21), 100, 10, 0, SLIDE, 0.22)]


def s14():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 43, WIND, 0.45), circle((20, 80), 25, WIND, 0.42)]
    _sup_bands(sc)
    sc["shapes"] += [frain((13, 40), 7), frain((63, 35), 8), frain((49, 80), 8)]
    sc["shapes"] += arrow((16, 38), (25, 33)) + arrow((63, 39), (64, 58)) + arrow((52, 80), (60, 78))
    sc["shapes"] += anyone((36, 30)) + anyone((64, 63)) + gaol((70, 70)) + anyone((64, 79))
    _sup_bosses(sc, sisters=False)
    sc["roles"] = cluster((63, 75), ["MT", "ST"], 2.0)
    return finish(sc)


def s15():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 43, WIND, 0.45)]
    _sup_bands(sc)
    for c in [(15, 57), (16, 49), (20, 42), (27, 36), (35, 34), (43, 36)]:
        sc["shapes"] += [circle(c, 7, "#e0e0e0", 0.35, 0.15)]
    sc["shapes"] += arrow((47, 42), (62, 50)) + arrow((62, 75), (66, 57))
    _sup_bosses(sc, sisters=False)
    sc["roles"] = cluster((68, 52), ALL, 1.8)
    return finish(sc)


def s16():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 44, WIND, 0.45)]
    for h in (12, 45, 68, 80):
        sc["shapes"] += [band((14, 88), h, 9, 140, SLIDE, 0.4)]
    sc["shapes"] += [line((16, 14), (69, 64), MESO, 0.6)] + stack_mark((69, 60)) + arrow((60, 50), (47, 38))
    _sup_bosses(sc, sisters=False)
    sc["roles"] = {"MT": [42, 34], **cluster((70, 65), ["ST", "H1", "H2", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s17():
    sc = scene("ultima")
    sc["shapes"] += [donut((50, 50), 49.5, 44, WIND, 0.45)]
    for h in (30, 80):
        sc["shapes"] += [band((14, 88), h, 11, 140, SLIDE, 0.4)]
    sc["shapes"] += [circle((29, 32), 7, RED, 0.35), circle((68, 52), 7, RED, 0.35), line((16, 14), (29, 32), MESO, 0.6)]
    sc["shapes"] += stack_mark((68, 48)) + arrow((40, 30), (33, 32)) + arrow((68, 63), (68, 57))
    _sup_bosses(sc, sisters=False)
    sc["roles"] = {"MT": [29, 32], **cluster((68, 53), ["ST", "H1", "H2", "D1", "D2", "D3", "D4"], 1.8)}
    return finish(sc)


def s18():
    sc = scene("ultima")
    for c in [(10, 10), (80, 10), (18, 85), (90, 78)]:
        sc["shapes"] += [circle(c, 18, WIND, 0.4)]
    sc["shapes"] += [frain((29, 32), 7), frain((68, 51), 8)]
    sc["shapes"] += arrow((30, 35), (41, 46)) + arrow((64, 52), (52, 52))
    sc["roles"] = cluster((46, 50), ALL, 1.8)
    return finish(sc)


# ---------------------------------------------------------------- Aetheric Boom / Roulette
PAIRS = {"NW": ((34, 32), (27, 36)), "NE": ((66, 31), (72, 36)), "SW": ((28, 67), (33, 71)), "SE": ((70, 67), (67, 71))}


def ab(n):
    sc = scene("ultima")
    if n == 1:
        boss(sc, (50, 45), "Ultima", dy=7)
        sc["roles"] = {**cluster((36, 62), ["MT", "ST"], 2.0), **cluster((64, 62), without("MT", "ST"), 1.8)}
        return finish(sc)
    if n in (2, 3):
        for p in PAIRS.values():
            sc["shapes"] += orb_pair(*p)
        if n == 3:
            sc["shapes"] = [circle((30, 70), 20, RED, 0.38), circle((70, 70), 20, RED, 0.38)] + sc["shapes"]
        boss(sc, (50, 45), "Ultima", dy=7)
        sp = (24, 73) if n == 2 else (29, 68)
        pp = (72, 73) if n == 2 else (69, 68)
        sc["roles"] = {**cluster(sp, ["MT", "ST"], 2.0), **cluster(pp, without("MT", "ST"), 1.8)}
        return finish(sc)
    if n == 4:
        sc["shapes"] += [circle((30, 30), 20, RED, 0.38), circle((70, 30), 20, RED, 0.38)]
        boss(sc, (50, 52), "Ultima", dy=7)
        sc["roles"] = {**cluster((29, 30), ["MT", "ST"], 2.0), **cluster((69, 30), without("MT", "ST"), 1.8)}
        return finish(sc)
    boss(sc, (50, 25), "Ultima", dy=7)
    sc["roles"] = cluster((50, 7), ALL, 1.8)
    return finish(sc)


def rg(n):
    sc = scene("ultima")
    boss(sc, (50, 22), "Ultima", dy=-6)
    if n == 1:
        sc["shapes"] += [circle((50, 50), 20, WIND, 0.42)]
        boss(sc, (50, 50), "Garuda", dy=7)
        sc["roles"] = cluster((49, 25), ALL, 1.8)
    elif n == 2:
        sc["shapes"] += [donut((50, 50), 49.5, 20, WIND, 0.4), circle((49, 38), 10, RED, 0.35)]
        sc["shapes"] += arrow((49, 26), (49, 34))
        boss(sc, (50, 52), "Garuda", dy=7)
        sc["roles"] = cluster((49, 38), ALL, 1.8)
    else:
        sc["shapes"] += [frain((50, 40), 9)] + arrow((50, 40), (50, 12))
        sc["roles"] = cluster((50, 7), ALL, 1.8)
    return finish(sc)


def ri(n):
    sc = scene("ultima")
    boss(sc, (50, 25), "Ultima", dy=7)
    if n == 1:
        sc["shapes"] += [circle((50, 10), 22, RED, 0.4)]
    if n in (1, 2):
        boss(sc, (50, 52), "Ifrit", dy=7)
        boss(sc, (96, 52), "Ifrit", dy=7)
        boss(sc, (50, 95), "Ifrit", dy=-6)
    if n == 1:
        sc["roles"] = cluster((50, 7), ALL, 1.8)
    elif n == 2:
        sc["shapes"] += [rect((50, 50), 48, 100, 0, RED, 0.3), rect((50, 50), 100, 48, 0, RED, 0.3), circle((50, 10), 20, RED, 0.35), circle((20, 17), 10, RED, 0.3)]
        sc["shapes"] += arrow((46, 7), (27, 14))
        sc["roles"] = cluster((20, 17), ALL, 1.8)
    else:
        sc["shapes"] += arrow((22, 18), (45, 8))
        sc["roles"] = cluster((50, 7), ALL, 1.8)
    return finish(sc)


def rt(n):
    sc = scene("ultima")
    boss(sc, (50, 25), "Ultima", dy=7)
    if n == 1:
        sc["shapes"] += [circle((50, 10), 16, RED, 0.42)] + arrow((48, 8), (31, 14))
        sc["roles"] = cluster((28, 15), ALL, 1.8)
    elif n == 2:
        sc["shapes"] += [circle((28, 18), 17, RED, 0.42), circle((49, 7), 10, RED, 0.3)] + arrow((32, 14), (45, 8))
        sc["roles"] = cluster((49, 7), ALL, 1.8)
    elif n == 3:
        sc["shapes"] += [circle((50, 10), 16, RED, 0.42)] + arrow((48, 8), (30, 14))
        boss(sc, (50, 52), "Titan", dy=7)
        sc["roles"] = cluster((27, 15), ALL, 1.8)
    else:
        sc["shapes"] += arrow((30, 14), (46, 8))
        sc["roles"] = cluster((50, 7), ALL, 1.8)
    return finish(sc)
