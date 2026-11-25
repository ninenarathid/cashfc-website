"""Every scene of the M12S part 2 guide, redrawn from game8's pictures (ff14/757988).

Grey strategy boards are 440x330 (4:3); the arena-texture boards are 440x440 (square).
x in % of the width, y in % of the height, sizes in % of the width. Measured on 5 % grid sheets
(dl/grid) and checked on compare sheets.
"""
import math

R = lambda v: round(v, 2)

ORANGE = "#ff9b3d"
FLOOR = "#a7a8ac"
MAUVE = "#7a5c66"
PURPLE = "#9b4fd0"
DEF_BLUE = "#5a55d6"


class F:
    k = 0.75  # height / width of the frame being drawn


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


def aoe(c, r, o=0.42, col=ORANGE, rim="#ffc070"):
    """A circle AoE as game8 draws it (soft fill, bright rim)."""
    return [circle(c, r, col, o, 0.01), ring(c, r, rim, 0.4, 0.95)]


def chevron(c, a, w=3.2, h=1.5, col="#ffb52e", wd=0.8, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    p = off(back, a + 90, w / 2)
    q = off(back, a - 90, w / 2)
    return [line(p, tip, col, wd, o), line(q, tip, col, wd, o)]


def chev2(c, a, w=3.6, h=1.7, edge="#ff7a10", core="#fff2d0"):
    out = []
    for d in (0, 1.6 * w / 3.6):
        p = off(c, a + 180, d)
        out += chevron(p, a, w, h, edge, 1.5 * w / 3.6, 0.9)
        out += chevron(p, a, w, h, core, 0.6 * w / 3.6, 0.98)
    return out


def stack(c, d=6.0, w=3.6, h=1.7, yellow=False):
    """game8's stack marker: double chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        if yellow:
            out += chev2(off(c, a, d), a + 180, w, h, "#e6c21a", "#fff7b0")
        else:
            out += chev2(off(c, a, d), a + 180, w, h)
    return out


ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]


def roles(**kw):
    return {k: [R(v[0]), R(v[1])] for k, v in kw.items()}


def clip_line(a, b, c, r):
    """Points where the line a*x + b*y = c (frame units, square frame) crosses the circle (50,50) r."""
    # parametrise along the direction (-b, a)
    n = math.hypot(a, b)
    a, b, c = a / n, b / n, c / n
    d0 = c - (a * 50 + b * 50)
    if abs(d0) >= r:
        return None
    h = math.sqrt(r * r - d0 * d0)
    px, py = 50 + a * d0, 50 + b * d0
    return (px - b * h, py + a * h), (px + b * h, py - a * h)


def tiles(cx=50, cy=50, r=47.5):
    """Faint diagonal floor lines, as the arena's checker of diamonds (square frames)."""
    return tiles_at((cx, cy), r)


# ---------------------------------------------------------------- boards
GREY = {"shape": "circle", "at": [50, 51.5], "r": 34, "fill": FLOOR, "lines": False, "edge": "#e2e2e2"}
G_WM = {"A": [50, 18.5], "1": [33, 25], "2": [66.5, 25], "D": [26.5, 51], "B": [73.5, 51], "4": [31, 73], "3": [67, 75], "C": [50, 85.5]}
# game8 turns the board for Staging: B at the top
ST_WM = {"B": [50, 6.5], "2": [25.5, 17], "3": [75, 17], "A": [15.5, 52], "C": [84, 52], "1": [25, 87], "4": [75, 86], "D": [50, 95]}
SQ_ARENA = {"shape": "circle", "at": [50, 50], "r": 47.5, "fill": MAUVE, "lines": False, "edge": "#3a2a30"}
SQ_WM = {"A": [50, 18.5], "1": [30, 31.5], "2": [69.5, 31.5], "D": [17, 50.5], "B": [83, 50.5], "4": [30, 70.5], "3": [69.5, 70.5], "C": [50, 83.5]}
DR_ARENA = {"shape": "circle", "at": [50, 49], "r": 47, "fill": MAUVE, "lines": False, "edge": "#3a2a30"}
DR_WM = {"A": [50, 16.5], "1": [30.5, 29], "2": [70, 29], "D": [17.5, 49.5], "B": [83, 49.5], "4": [30.5, 68.5], "3": [70, 68.5], "C": [50, 82.5]}
ISL_WM = {"1": [40, 31], "D": [23, 48.5], "4": [39, 68.5], "2": [60, 31], "B": [76.5, 48.5], "3": [60.5, 68.5]}
ISL_D, ISL_B, ISL_R = (23.5, 49), (76.5, 49), 23.5
WHITE_BG = "#f2f2f2"


def grey(**kw):
    F.k = 0.75
    s = {"arena": dict(GREY), "waymarks": dict(G_WM), "markSize": 6.6}
    s.update(kw)
    return s


def staging(**kw):
    F.k = 0.75
    s = {"arena": dict(GREY), "waymarks": dict(ST_WM), "markSize": 7}
    s.update(kw)
    return s


def square(wm=SQ_WM, arena=SQ_ARENA, floor=True, **kw):
    F.k = 1.0
    s = {"frame": [1, 1], "bg": WHITE_BG, "arena": dict(arena), "waymarks": dict(wm) if wm else None, "markSize": 8,
         "iconSize": 6.6, "bossSize": 11}
    shapes = (tiles(arena["at"][0], arena["at"][1], arena["r"]) if floor else []) + kw.pop("shapes", [])
    s.update(kw)
    s["shapes"] = shapes
    return s


def islands(**kw):
    """The arena after Downfall: a west (D) island and an east (B) island."""
    F.k = 1.0
    sh = []
    for c in (ISL_D, ISL_B):
        sh += [circle(c, ISL_R, MAUVE, 0.95, 0.4), ring(c, ISL_R, "#3a2a30", 0.6, 0.9)]
        sh += [s for s in tiles_at(c, ISL_R)]
    s = {"frame": [1, 1], "bg": WHITE_BG, "arena": None, "waymarks": dict(ISL_WM), "markSize": 7.5, "iconSize": 6.6, "bossSize": 11}
    s["shapes"] = sh + kw.pop("shapes", [])
    s.update(kw)
    return s


def tiles_at(c, r, d=21.2):
    out = []
    for k in range(-3, 4):
        for (a, b) in ((1, 1), (1, -1)):
            cc = (a * 50 + b * 50) + k * d
            p = clip_line(a, b, cc, r)
            if p:
                out.append(line((p[0][0] + c[0] - 50, p[0][1] + c[1] - 50), (p[1][0] + c[0] - 50, p[1][1] + c[1] - 50), "#ffffff", 0.22, 0.10))
    return out


# ---------------------------------------------------------------- pieces
def clone(c, top=None, r=3.1):
    """A boss clone (Lindwurm's copy): dark red body; `top` marks its element."""
    out = [dot(c, r, "#5e1a22"), ring(c, r, "#ff8a7a", 0.4, 0.9)]
    if top == "dark":
        out += [dot((c[0], c[1] - r * 1.15 / F.k), r * 0.55, "#8d5cff")]
    elif top == "fire":
        out += [dot((c[0], c[1] - r * 1.15 / F.k), r * 0.55, "#ff6a2a")]
    return out


def bigclone(c, r=3.4):
    return [dot(c, r, "#3b1414"), ring(c, r, "#ff6a5a", 0.5, 0.95), dot((c[0], c[1] - r * 0.9 / F.k), r * 0.42, "#c83030")]


def pclone(c, r=2.4):
    """A player clone (the boss copies a player's look): pale flame."""
    return [dot(c, r, "#f6cf9e"), ring(c, r, "#ffffff", 0.35, 0.9)]


WM_COL = {"A": "#e0506a", "1": "#e0506a", "B": "#d8b020", "2": "#d8b020", "C": "#3d8fe0", "3": "#3d8fe0", "D": "#9a62d8", "4": "#9a62d8"}


def pl(c, s, r=2.3):
    """A player named by the waymark they stand for (game8's Staging pictures)."""
    return [dot(c, r, "#202228"), ring(c, r, WM_COL.get(s, "#ffffff"), 0.45, 1), text((c[0], c[1] + 0.15), s, 2.7, WM_COL.get(s, "#ffffff"))]


GEN_COL = {"T": "#3a62c2", "H": "#2f7d3b", "D": "#a8453c"}


def gen(c, k, tag=None, s=4.2):
    """A player shown only as Tank / Healer / DPS (T, H, D), with an optional tag beside it."""
    out = [rect(c, s, s, 0, GEN_COL[k], 0.95, 0.15), text((c[0], c[1] + 0.2), k, s * 0.62, "#ffffff")]
    if tag:
        out += tagl((c[0] + s * 0.62, c[1] - s * 0.62), tag)
    return out


def tagl(c, s, size=2.2, col="#ffffff", bg="#15161a"):
    w = 0.62 * size * len(s) + 1.0
    return [rect(c, w, size * 1.35, 0, bg, 0.85, 0.12), text(c, s, size, col)]


def mark(c, s):
    """A head marker from the Idyllic Dream macro: Atk / Bind / Ign + number."""
    col = {"A": "#ffcf5a", "B": "#9ad0ff", "I": "#ff9a9a"}[s[0]]
    return tagl(c, s, 2.1, col)


def tri(c):
    return text(c, "", 1)


def ignore_sym(c):
    return []


def bossring(c, r=11):
    return [ring(c, r, "#c8202a", 0.7, 0.85)]


def orb(c):
    return [dot(c, 3.3, "#d8dbe4"), ring(c, 3.3, "#8a90a0", 0.4, 0.9)]


def eye(c):
    return [ring(c, 4.2, "#e9c46a", 1.0, 0.95), dot(c, 1.6, "#3a2a10")]


def shape(c, k):
    """Blood Mana's shapes: blue = circle, green = donut, orange = side cones, purple = front/back cones."""
    if k == "blue":
        return [dot(c, 3.0, "#38c6f2"), ring(c, 3.0, "#bff0ff", 0.35, 0.9)]
    if k == "green":
        return [ring(c, 2.6, "#1fae80", 1.4, 0.95), dot(c, 1.2, "#c8fff0")]
    if k == "orange":
        return [cone(c, 90, 70, 4.2, "#ff8a1c", 0.95, 0.2), cone(c, 270, 70, 4.2, "#ff8a1c", 0.95, 0.2)]
    return [cone(c, 0, 70, 4.2, "#7a5cff", 0.95, 0.2), cone(c, 180, 70, 4.2, "#7a5cff", 0.95, 0.2)]


def tower(c, el):
    col = {"earth": "#6b5a3a", "wind": "#3fae6a", "dark": "#4a4fb8", "fire": "#d2401c"}[el]
    out = [dot(c, 3.6, col)]
    if el in ("wind", "dark"):
        out += [dot((c[0], c[1] - 1.6), 2.0, "#e8eef6")]  # the white (light) top
    return out


TLAB = {"earth": "Earth", "wind": "Wind", "dark": "Dark", "fire": "Fire"}


def towerring(c):
    return [ring(c, 5.4, "#1fa3e0", 0.7, 0.95)]


# ================================================================== setup
def waymarks():
    return square(wm={**SQ_WM}, markSize=9.5)


# ================================================================== Replication (grey 4:3 board)
REP_CLONES = [(50, 13), (75, 51), (50, 84), (25, 49)]
REP_ROLES = roles(MT=(37, 20), D1=(30, 31), D4=(66, 18), H2=(73, 29), D2=(74, 67), ST=(67, 78), H1=(31, 67), D3=(37, 77))


def rep1():
    sh = []
    for c in REP_CLONES:
        sh += clone(c)
    return grey(boss=[50, 50], roles=dict(REP_ROLES), shapes=sh)


def rep2():
    F.k = 0.75
    sh = []
    for c in ((50, 13), (50, 84)):
        sh += [cone(c, 270, 28, 42), cone(c, 90, 28, 42)]
    sh += aoe((30, 30.5), 7.7) + aoe((32, 71), 7.7)
    for c in REP_CLONES:
        sh += clone(c, "dark" if c == (25, 49) else ("fire" if c == (75, 51) else None))
    sh += stack((70.5, 73), 4.2, 3.0, 1.4)
    return grey(boss=[50, 50], roles=dict(REP_ROLES), shapes=sh)


def rep3_kick():
    F.k = 0.75
    sh = [cone((52, 50), 60, 180, 46, ORANGE, 0.5)]
    for c in REP_CLONES:
        sh += clone(c)
    return grey(boss=[52, 50], roles=roles(MT=(38, 42), D1=(32, 49), D4=(38, 49.5), H1=(37, 61), H2=(43, 59), D2=(47.5, 61), ST=(46, 70),
                                           D3=(44, 79)), shapes=sh)


def rep3_split():
    F.k = 0.75
    sh = []
    for c in ((43, 14), (54, 14), (44, 84), (56, 84)):
        sh += clone(c)
    for c in ((22, 49), (32, 49)):
        sh += clone(c, "dark")
    for c in ((61, 70), (70, 70)):
        sh += clone(c, "fire")
    return grey(boss=[50, 50], roles=dict(REP_ROLES), shapes=sh)


def rep4():
    F.k = 0.75
    sh = []
    for c in ((69, 25), (56, 38), (42, 59), (31, 72)):
        sh += [cone(c, 270, 24, 48, ORANGE, 0.38), cone(c, 90, 24, 48, ORANGE, 0.38)]
    for c in ((50, 17), (27.5, 48.5), (67, 42), (50, 64.5)):
        sh += aoe(c, 7.4)
    for c in ((32, 24), (60, 57)):
        sh += clone(c, "dark")
    for c in ((42, 37), (70, 69)):
        sh += clone(c, "fire")
    for c in ((69, 25), (56, 38), (42, 59), (31, 72)):
        sh += clone(c)
    sh += stack((46.5, 44.5), 4.0, 3.0, 1.4) + stack((76.5, 50.5), 4.0, 3.0, 1.4)
    return grey(boss=[50, 50], roles=roles(D4=(50, 17), H2=(27.5, 48.5), ST=(67, 42), D2=(50, 64.5), MT=(45, 43), D1=(48.5, 46.5),
                                           H1=(75, 49), D3=(78.5, 52.5)), shapes=sh)


# the fixed-position charts (arena floor, square)
def dotp(c, col):
    return [dot(c, 1.6, col), ring(c, 1.6, "#ffffff", 0.35, 0.95)]


GREEN, ORANGEP, PINK = "#3fd06a", "#ff8c2a", "#ff6ad5"


def rep_all():
    sh = []
    for c in ((50, 15), (85.5, 50), (50, 85), (15, 50)):
        sh += dotp(c, GREEN)
    for c in ((47.5, 46.5), (54, 46.5), (47.5, 53.5), (54, 53.5)):
        sh += dotp(c, ORANGEP)
    for c in ((47, 33.5), (54.5, 34), (33, 47.5), (33, 54.5), (68, 47.5), (68, 54.5), (47, 68.5), (54.5, 68.5)):
        sh += dotp(c, PINK)
    sh += tagl((50, 95.5), "Green: Range   Orange: Melee fire   Pink: Melee dark", 2.3)
    return square(wm=None, shapes=sh)


def rep_ne():
    sh = []
    sh += clone((77, 26), "dark", 2.8)
    sh += tagl((77, 31.5), "Dark clone = N", 2.4, "#ffb0ff")
    for c, col, s, p in (((50, 15), GREEN, "Range dark: H", (50, 10)), ((53, 46.5), ORANGEP, "Melee fire", (53, 41.5)),
                         ((32, 47.5), PINK, "Melee dark: DPS", (32, 53)), ((85.5, 50), GREEN, "Range dark: DPS", (85, 56)),
                         ((54.5, 68.5), PINK, "Melee dark: T", (54.5, 74)), ((50, 85), GREEN, "Range fire", (50, 91))):
        sh += dotp(c, col) + tagl(p, s, 2.5, col)
    return square(wm=None, shapes=sh)


def rep_melee():
    sh = []
    # the middle tile and its four edge spots (melee taking fire)
    sq = [(50, 39.5), (58, 47.5), (50, 55.5), (42, 47.5)]
    for i in range(4):
        sh.append(line(sq[i], sq[(i + 1) % 4], ORANGEP, 0.45, 0.95))
    for c, n in (((53.5, 43.5), "1"), ((53.5, 51.5), "2"), ((46, 51.5), "3"), ((46, 43.5), "4")):
        sh += dotp(c, ORANGEP) + [text((c[0] + (2.6 if c[0] > 50 else -2.6), c[1]), n, 2.6, ORANGEP)]
    # the crosses where the melee taking dark stand
    for cx, cy in ((50, 25), (28, 47.5), (72, 47.5), (50, 69)):
        sh += [line((cx - 8, cy - 8), (cx + 8, cy + 8), PINK, 0.4, 0.85), line((cx + 8, cy - 8), (cx - 8, cy + 8), PINK, 0.4, 0.85)]
    for c, n, dx in (((46, 28.5), "3", -2.5), ((55, 28), "2", 2.5), ((32, 43), "1", 2.5), ((31, 50.5), "2", -2.5),
                     ((68, 43), "4", 2.5), ((68, 51.5), "3", 2.5), ((46, 65.5), "4", -2.5), ((54.5, 65), "1", 2.5)):
        sh += dotp(c, PINK) + [text((c[0] + dx, c[1] - 2.2), n, 2.6, PINK)]
    for c, n in (((75, 22), "Dark clone 1"), ((78, 75), "Dark clone 2"), ((22, 75), "Dark clone 3"), ((25, 22), "Dark clone 4")):
        sh += tagl(c, n, 2.5, "#ffb0ff")
    sh += tagl((50, 59.5), "Melee fire: middle of the centre tile's edge", 2.0, ORANGEP)
    return square(wm={"A": [50, 9.5], "B": [91, 47.5], "C": [50, 85.5], "D": [8.5, 41]}, shapes=sh)


def rep_range():
    sh = [line((43, 6.5), (97, 62), PINK, 0.8, 0.9)]
    sh += clone((66, 30), "dark", 2.8) + tagl((66, 36), "Dark clone", 2.4, "#ffb0ff")
    for c, col, s, p in (((50, 14.5), GREEN, "Range dark", (50, 20)), ((85, 49.5), GREEN, "Range dark", (85, 56)),
                         ((50, 84.5), ORANGEP, "Range fire", (50, 90.5))):
        sh += dotp(c, col) + tagl(p, s, 2.5, col)
    sh += dotp((14, 50), GREEN)
    sh += tagl((50, 50), "Range: centre of the N / E / S / W tiles", 2.2, "#ffd27a")
    return square(wm=None, shapes=sh)


# ================================================================== Double Sobat (grey board)
def sob1():
    sh = [ring((58, 49.5), 4.0, "#ff3030", 0.6, 0.95)]
    return grey(boss=[50, 50], roles=roles(D3=(39, 35), D4=(62, 34), H1=(30, 45), D1=(41, 47), D2=(44, 58), ST=(50, 64), H2=(61, 66),
                                           MT=(58, 50)), shapes=sh)


def sob2():
    F.k = 0.75
    sh = [cone((51, 50), 90, 180, 34.5, ORANGE, 0.5), ring((60, 52), 4.0, "#ff3030", 0.6, 0.95)]
    return grey(boss=[51, 50], roles=roles(D3=(37, 38), D1=(42.5, 43), H1=(30, 44), H2=(36.5, 47), D4=(34, 55), D2=(41, 55), ST=(44, 62),
                                           MT=(60, 52)), shapes=sh)


def sob3():
    F.k = 0.75
    sh = [cone((49, 50), 270, 180, 34.5, ORANGE, 0.5)]
    return grey(boss=[49, 50], roles=roles(D4=(62, 33), D1=(56, 40), D3=(69, 42), MT=(58, 50), H1=(66, 52), D2=(57, 57), ST=(53, 61),
                                           H2=(60, 66)), shapes=sh)


def sob4():
    F.k = 0.75
    sh = aoe((33, 22), 22, 0.45) + aoe((34, 79), 22.5, 0.45)
    return grey(boss=[49, 50], roles=roles(ST=(33, 22), MT=(34, 79), D1=(56, 42), D4=(63, 32), H1=(69, 46), D2=(57, 57), H2=(60, 66),
                                           D3=(70, 66)), shapes=sh)


# ================================================================== Staging, the Ushiko way (grey board, B at the top)
def tether(a, b):
    return [line(a, b, "#ff9a2a", 0.7, 0.95), dot(b, 0.8, "#ffffff")]


def conetel(c, d=0):
    """A small cone telegraph above a clone's head."""
    return [cone((c[0], c[1] - 1.5), d, 70, 5.5, ORANGE, 0.6, 0.15)]


def circtel(c):
    return aoe((c[0], c[1] - 7), 4.6, 0.5)


ST_CLONES = {"NW": (32, 27), "NE": (68, 25), "W": (23, 50), "E": (77, 50), "SW": (32, 74), "SE": (68, 76)}


def st_clones(kinds):
    sh = []
    for k, c in ST_CLONES.items():
        sh += clone(c)
        if kinds[k] == "cone":
            sh += conetel((c[0], c[1] - 3))
        elif kinds[k] == "circle":
            sh += circtel(c)
        else:
            sh += stack(c, 4.0, 2.8, 1.3)
    return sh


ST_KINDS = {"NW": "cone", "NE": "circle", "W": "circle", "E": "stack", "SW": "stack", "SE": "cone"}


def st1():
    sh = st_clones(ST_KINDS)
    pos = {"2": (39, 30), "3": (62, 30), "A": (34, 50), "C": (70, 50), "1": (39, 66), "4": (62, 64), "B": (50, 43), "D": (50, 78)}
    sh += tether(ST_CLONES["NW"], pos["2"]) + tether(ST_CLONES["NE"], pos["3"]) + tether(ST_CLONES["W"], pos["A"])
    sh += tether(ST_CLONES["E"], pos["C"]) + tether(ST_CLONES["SW"], pos["1"]) + tether(ST_CLONES["SE"], pos["4"]) + tether((50, 50), pos["B"])
    for k, c in pos.items():
        sh += pl(c, k)
    return staging(boss=[50, 50], shapes=sh)


def st2():
    sh = st_clones(ST_KINDS)
    pos = {"A": (39, 30), "4": (62, 30), "1": (34, 50), "3": (70, 50), "2": (42, 67), "C": (62, 64), "B": (50, 42), "D": (50, 78)}
    sh += tether(ST_CLONES["NW"], pos["A"]) + tether(ST_CLONES["NE"], pos["4"]) + tether(ST_CLONES["W"], pos["1"])
    sh += tether(ST_CLONES["E"], pos["3"]) + tether(ST_CLONES["SW"], pos["2"]) + tether(ST_CLONES["SE"], pos["C"]) + tether((50, 50), pos["B"])
    for k, c in pos.items():
        sh += pl(c, k)
    return staging(boss=[50, 50], shapes=sh)


TOP4 = {"A": (37.5, 9.5), "2": (44, 7), "3": (56, 7), "C": (62.5, 9.5)}


def st3():
    F.k = 0.75
    sh = aoe((22.5, 53.5), 24.5, 0.4) + aoe((77.5, 53), 23.5, 0.4) + aoe((49.5, 87), 24.5, 0.4)
    for k, c in TOP4.items():
        sh += [cone((50, 22), ang((50, 22), c), 16, dist((50, 22), c) + 3, ORANGE, 0.5)]
    sh += aoe((50, 22), 6.2, 0.45)
    for k, c in TOP4.items():
        sh += pl(c, k)
    sh += pl((21, 52), "1") + pl((79, 52), "4") + pl((50, 86), "D") + pl((50, 29), "B")
    return staging(boss=[50, 22], shapes=sh)


def clump_pl(c, names, dx=3.6, dy=4.6):
    sh = []
    for i, n in enumerate(names):
        r_, k = divmod(i, 2)
        sh += pl((c[0] + (k - 0.5) * dx, c[1] + (r_ - 0.5) * dy), n, 2.0)
    return sh


def st4():
    sh = stack((41, 31), 5.0, 3.0, 1.4) + stack((60, 31), 5.0, 3.0, 1.4)
    sh += clump_pl((41, 31), ["A", "2", "1", "D"]) + clump_pl((60, 31), ["3", "C", "B", "4"])
    return staging(boss=[50, 22], shapes=sh)


def st5():
    F.k = 0.75
    sh = [cone((45, 27), 330, 26, 22, ORANGE, 0.5), cone((55, 27), 30, 26, 22, ORANGE, 0.5)]
    sh += pl((45, 27), "A") + pl((55, 27), "C")
    sh += clump_pl((38.5, 34), ["1", "2", "D"], 3.8, 4.2) + clump_pl((59.5, 34), ["B", "4", "3"], 3.8, 4.2)
    return staging(boss=[50, 22], shapes=sh)


def st6():
    F.k = 0.75
    sh = [cone((50, 23), 135, 180, 70, ORANGE, 0.5)]
    for i, n in enumerate(["1", "A", "D", "4", "B", "C"]):
        sh += pl((40 + i * 4, 8.5), n, 2.0)
    sh += pl((45, 14), "2", 2.0) + pl((53, 14), "3", 2.0)
    return staging(boss=[50, 23], shapes=sh)


def st7():
    F.k = 0.75
    sh = [cone((50, 48), 90, 46, 62, ORANGE, 0.4), cone((50, 48), 270, 46, 62, ORANGE, 0.4)]
    sh += clone((24, 50)) + clone((76, 50))
    sh += aoe((41.5, 12), 6.5, 0.45) + aoe((59, 12), 6.5, 0.45)
    sh += bossring((50, 16), 8.5)
    sh += pl((41, 8), "A") + pl((46, 13), "2") + pl((54.5, 13), "3") + pl((59.5, 8), "C")
    sh += pl((43.5, 23), "1") + pl((48, 25.5), "B") + pl((52, 25.5), "D") + pl((56.5, 23), "4")
    return staging(boss=[50, 16], shapes=sh)


def st_top(sh, by=15):
    sh += pl((39.5, 8.5), "A") + pl((46, 6.5), "2") + pl((55, 6.5), "3") + pl((60.5, 8.5), "C")
    return sh


def st8():
    F.k = 0.75
    sh = aoe((68, 72), 38, 0.4)
    sh += clone((68, 72))
    sh += stack((37, 22), 4.6, 3.0, 1.4) + clump_pl((37, 22), ["1", "B", "D", "4"])
    sh += bossring((50, 15), 8.5)
    sh = st_top(sh)
    return staging(boss=[50, 15], shapes=sh)


def st9():
    F.k = 0.75
    sh = aoe((50, 84), 35, 0.4) + clone((50, 84))
    for c in ((39.5, 8.5), (46, 6.5), (55, 6.5), (60.5, 8.5)):
        sh += [cone((50, 16), ang((50, 16), c), 18, dist((50, 16), c) + 4, ORANGE, 0.5)]
    sh += aoe((50, 16), 7.0, 0.45)
    sh += clump_pl((63.5, 27), ["4", "B", "D", "1"])
    sh = st_top(sh)
    return staging(boss=[50, 16], shapes=sh)


def st10():
    F.k = 0.75
    sh = aoe((33, 68), 35, 0.4) + clone((33, 68))
    sh += stack((64.5, 27), 4.6, 3.0, 1.4) + clump_pl((64.5, 27), ["4", "B", "D", "1"])
    sh += bossring((49, 18), 8.5)
    sh = st_top(sh)
    return staging(boss=[49, 18], shapes=sh)


def st_roles():
    F.k = 0.75
    sh = []
    for y in (9.5, 30, 57, 87):
        sh.append(line((28, y), (100, y), "#ff4a3a", 0.7, 0.95))
    sh += [line((50, 13), (50, 49), "#ff9a2a", 1.0, 0.95), dot((50, 13), 1.0, "#ffffff")]
    sh += stack((89, 21), 3.6, 2.8, 1.3)
    sh += [cone((89, 44), 180, 60, 10.5, ORANGE, 0.6, 0.2)]
    sh += aoe((89, 77), 6.5, 0.5)
    sh += tagl((14, 4.5), "B: boss tether, pull it to B", 2.3, "#ff8a7a")
    sh += tagl((12, 20), "Stack: 2 · 3", 2.5, "#ff8a7a")
    sh += tagl((12, 42), "Cone: A · C", 2.5, "#ff8a7a")
    sh += tagl((12, 72), "Big circle: 1 · 4", 2.5, "#ff8a7a")
    sh += tagl((17, 95), "D: no tether, AoE to the south", 2.3, "#ff8a7a")
    return staging(boss=[50, 49], shapes=sh)


def st_rule():
    F.k = 0.75
    sh = [line((26, 15), (50, 49), "#ff4a3a", 0.6, 0.9), arrow((50, 14), (50, 41), "#ffe14a", 1.4, 0.95)]
    # red: counter-clockwise from B (2 / A / 1); blue: clockwise from B (3 / C / 4); both run on round the arena
    R_, B_ = "#ff4a3a", "#4aa3ff"
    sh += [arrow((24, 28), (5, 47), R_, 1.0), arrow((12, 43), (28, 5), B_, 1.0)]
    sh += [arrow((8, 80), (28, 96), R_, 1.0), arrow((35, 96), (12, 74), B_, 1.0)]
    sh += [arrow((73, 4), (92, 31), B_, 1.0), arrow((96, 26), (78, 3), R_, 1.0)]
    sh += [arrow((85, 71), (66, 96), B_, 1.0), arrow((77, 96), (91, 72), R_, 1.0)]
    sh += tagl((50, 21), "B: boss tether", 2.3, "#ffe14a")
    sh += tagl((31, 36), "2 / A / 1: from B, counter-clockwise", 1.9, "#ff8a7a")
    sh += tagl((69, 43), "3 / C / 4: from B, clockwise", 1.9, "#9ad0ff")
    sh += tagl((50, 82), "D: no tether", 2.3, "#e0b0ff")
    return staging(boss=[50, 49], shapes=sh)


# ================================================================== Mutating Cells + Blood Mana (square, arena floor)
def mana(**kw):
    return square(wm=SQ_WM, **kw)


def mana1(swap=False):
    sh = bossring((50, 50))
    sh += [arrow((50, 48), (55.5, 41.5) if swap else (50, 39.5), "#ff5a2a", 1.0)]
    sh += gen((46, 60), "D", "α") + gen((52, 60), "D", "β") + gen((41, 63), "H", "β") + gen((60, 63), "H", "α")
    sh += gen((47, 68), "D", "β") + gen((54, 68), "D", "α")
    sh += tagl((53.5, 34.5), "α", 2.3) + tagl((61, 37.5), "β", 2.3)
    return mana(boss=[50, 50], roles=roles(MT=(50, 37.5), ST=(57, 40.5)), shapes=sh)


W_ORB, E_ORB = (25, 52), (74, 52)


def mana3():
    sh = bossring((50, 50)) + orb(W_ORB) + orb(E_ORB)
    for c, k in (((10, 23), "purple"), ((37, 23), "orange"), ((8, 76), "green"), ((37, 76), "blue"),
                 ((88, 23), "purple"), ((66, 37), "green"), ((82, 63), "orange"), ((62, 76), "blue")):
        sh += shape(c, k)
    return mana(boss=[50, 50], shapes=sh)


def mana4():
    sh = bossring((50, 50)) + orb(W_ORB) + orb(E_ORB)
    sh += aoe((36, 22), 7.0, 0.55, "#3a7fd8", "#bfe0ff") + aoe((10, 75), 7.5, 0.55, "#3a7fd8", "#bfe0ff")
    for c, k in (((10, 23), "purple"), ((37, 23), "orange"), ((8, 76), "green"), ((37, 76), "blue"),
                 ((88, 23), "purple"), ((66, 37), "green"), ((82, 63), "orange"), ((62, 76), "blue")):
        sh += shape(c, k)
    sh += gen((37, 22), "T", "β") + gen((8, 73), "H", "β") + gen((12, 76), "D", "β") + gen((10, 79.5), "D", "β")
    sh += gen((50, 40), "T", "α") + gen((51, 54), "D", "α") + gen((47, 58), "D", "α") + gen((53, 59), "H", "α")
    return mana(boss=[50, 50], shapes=sh)


def mana5():
    sh = bossring((50, 50)) + orb(W_ORB) + orb(E_ORB)
    for c, k in (((19, 40), "purple"), ((30, 31), "orange"), ((29, 59), "blue"), ((13, 64), "green"),
                 ((80, 38), "purple"), ((70, 47.5), "green"), ((74, 55), "orange"), ((68, 62), "blue")):
        sh += shape(c, k)
    return mana(boss=[50, 50], shapes=sh)


def mana6():
    sh = eye((25, 51)) + eye((74, 51))
    for c, k in (((61, 47), "T"), ((67, 56), "T"), ((52, 57), "D"), ((59, 55), "D"), ((61, 61), "H"), ((54, 64), "D"), ((59, 67), "H"),
                 ((68, 63), "D")):
        sh += gen(c, k)
    return mana(shapes=sh)


def mana7(east=True):
    sh = []
    don, cir = ((74, 51), (25, 51)) if east else ((25, 51), (74, 51))
    sh += [circle(cir, 23, "#38c6f2", 0.32, 0.2)]
    sh += [cone(cir, 0, 40, 52, "#7a5cff", 0.35), cone(cir, 180, 40, 52, "#7a5cff", 0.35)]
    sh += [donut(don, 45, 13, "#1fae80", 0.38)]
    sh += [cone(don, 90, 40, 52, "#ff8a1c", 0.38), cone(don, 270, 40, 52, "#ff8a1c", 0.38)]
    sh += eye((25, 51)) + eye((74, 51))
    if east:
        sh += gen((71, 58), "T") + gen((74, 56), "D") + gen((74.5, 61), "H")
    else:
        sh += gen((22, 57), "T") + gen((26, 54), "D") + gen((26.5, 59), "H")
    return mana(shapes=sh, floor=False)


def mana9(far=True):
    boss = (45, 51)
    sh = bossring(boss)
    if far:
        sh += aoe((29, 61), 9.5, 0.55, "#7a2bd0", "#d0a0ff")
        a, b = boss, (29, 61)
    else:
        sh += aoe(boss, 9.5, 0.55, "#7a2bd0", "#d0a0ff")
        a, b = (26, 59), boss
    for i, (dx, dy, k) in enumerate(((-2.5, -2.5, "T"), (2.5, -2.5, "D"), (-2.5, 2.5, "H"), (2.5, 2.5, "D"))):
        sh += gen((a[0] + dx * 1.3, a[1] + dy * 1.3), k, "α")
    for i, (dx, dy, k) in enumerate(((-2.5, -2.5, "T"), (2.5, -2.5, "D"), (-2.5, 2.5, "H"), (2.5, 2.5, "D"))):
        sh += gen((b[0] + dx * 1.3, b[1] + dy * 1.3), k, "β")
    return mana(boss=[boss[0], boss[1] - 1.5], shapes=sh)


# ================================================================== Idyllic Dream
X_CL = {"1": (25, 25), "2": (75, 25), "4": (24.5, 70), "3": (75.5, 70)}
P_CL = {"A": (50, 6.5), "B": (90, 46), "C": (50, 91), "D": (11, 46)}


def dream(**kw):
    return square(wm=DR_WM, arena=DR_ARENA, **kw)


def pclones(which="X+"):
    sh = []
    for c in X_CL.values():
        sh += pclone(c)
    if "+" in which:
        for c in P_CL.values():
            sh += pclone(c)
    return sh


def dr1():
    return dream(shapes=pclones("X"))


def dr2():
    return dream(shapes=pclones())


DR_POS = {"A": (50, 30.5), "2": (62, 38.5), "B": (68, 49), "3": (63, 60), "C": (50, 65.5), "4": (36.5, 62), "D": (31, 49), "1": (37.5, 35.5)}
DR_GEN = {"A": "H", "2": "H", "B": "D", "3": "T", "C": "T", "4": "D", "D": "D", "1": "D"}


def dr3():
    sh = bossring((50, 49)) + pclones()
    allc = {**X_CL, **P_CL}
    for k, c in DR_POS.items():
        sh += [line(allc[k], c, "#ffb02a", 0.5, 0.95)]
    for k, c in DR_POS.items():
        sh += gen(c, DR_GEN[k])
    return dream(boss=[50, 49], shapes=sh)


def dr4():
    sh = bossring((50, 49)) + pclones()
    allc = {**X_CL, **P_CL}
    pos = {"A": (50, 30.5), "2": (62, 37.5), "1": (68, 49), "B": (37.5, 38), "3": (63, 60), "C": (33, 60), "4": (52, 63), "D": (31, 49)}
    kinds = {"A": "H", "2": "H", "1": "D", "B": "D", "3": "T", "C": "T", "4": "D", "D": "D"}
    for k, c in pos.items():
        sh += [line(allc[k], c, "#ffb02a", 0.5, 0.95)]
    sh += [arrow((45, 41), (56, 46.5), "#ffffff", 1.0), arrow((55, 44.5), (44, 39), "#ffffff", 1.0)]
    sh += [arrow((37.5, 62.5), (48.5, 62.5), "#ffffff", 1.0), arrow((48.5, 66), (37.5, 66), "#ffffff", 1.0)]
    for k, c in pos.items():
        sh += gen(c, kinds[k])
    return dream(boss=[50, 49], shapes=sh)


MARKED = [((50, 31), "H", "Atk4"), ((62, 37.5), "H", "Atk1"), ((68, 50), "D", "Atk3"), ((63, 61), "T", "Atk2"),
          ((51, 66.5), "D", "Bind1"), ((38, 61), "T", "Ign1"), ((34, 50), "D", "Bind2"), ((38, 35.5), "D", "Ign2")]


def marked(lst=MARKED):
    sh = []
    for c, k, m in lst:
        sh += gen(c, k) + mark((c[0] + 3.6, c[1] - 3.8), m)
    return sh


def dr5():
    return dream(boss=[50, 49], shapes=bossring((50, 49)) + pclones() + marked())


def three_clones(n=(50, 14), m=(50, 54), s=(50, 78), circ=(50, 57), safe34=True, o=0.42):
    sh = [circle(circ, 26, ORANGE, o, 0.2)]
    if safe34:  # north clone: side cones; south clone: front/back cones
        sh += [cone(n, 270, 90, 75, ORANGE, o), cone(n, 90, 90, 75, ORANGE, o), cone(s, 0, 90, 75, ORANGE, o), cone(s, 180, 90, 40, ORANGE, o)]
    sh += bigclone(n) + bigclone(m) + bigclone(s)
    return sh


def dr6():
    return dream(shapes=three_clones(o=0.55))


STACKCL = lambda c: clone(c, None, 2.8) + stack(c, 3.2, 2.0, 1.0, True)
CIRCCL = lambda c: clone(c, None, 2.8) + [ring(c, 3.8, "#ff3030", 0.7, 0.95)]


def dr7a():
    sh = bossring((50, 49))
    for c in ((50, 16), (18, 51), (82, 51), (50, 84)):
        sh += STACKCL(c)
    for c in ((28, 30), (71, 30), (28, 70), (71, 70)):
        sh += CIRCCL(c)
    return dream(boss=[50, 49], shapes=sh + marked())


def dr7b():
    sh = bossring((50, 49))
    for c in ((50, 18), (22, 51), (82, 51), (51, 80)):
        sh += CIRCCL(c)
    for c in ((30, 32), (70, 32), (29, 73), (69, 73)):
        sh += STACKCL(c)
    lst = [((50, 31), "H", "Atk1"), ((63, 40), "H", "Atk4"), ((37, 37), "D", "Bind2"), ((34, 51), "D", "Ign2"),
           ((68, 52), "T", "Atk2"), ((65, 64.5), "D", "Atk3"), ((40, 62), "D", "Bind1"), ((51, 67.5), "T", "Ign1")]
    sh += [arrow((53, 33.5), (60, 38), "#ffffff", 0.8), arrow((60, 41), (53, 36.5), "#ffffff", 0.8),
           arrow((35, 40.5), (33.5, 47), "#ffffff", 0.8), arrow((37, 47), (38.5, 40.5), "#ffffff", 0.8),
           arrow((68.5, 55), (66.5, 61), "#ffffff", 0.8), arrow((64, 61), (66, 55), "#ffffff", 0.8),
           arrow((42.5, 63.5), (48, 66), "#ffffff", 0.8), arrow((48.5, 64), (43, 61.5), "#ffffff", 0.8)]
    return dream(boss=[50, 49], shapes=sh + marked(lst))


def dr9():
    sh = three_clones((50, 17), (50, 57), (50, 77), (50, 57), True, 0.5)
    return dream(shapes=sh, roles=roles(MT=(15, 60), H1=(21, 60), D3=(15, 66.5), D1=(21, 66.5),
                                        ST=(80, 59), H2=(86, 59), D2=(80, 66), D4=(86, 66)), iconSize=5.6)


ISLAND_ROLES = roles(H1=(15, 42), MT=(33, 41), D3=(15, 60), D1=(33, 60), D2=(65, 41), D4=(86, 42), ST=(66, 60), H2=(86, 61))
TOWERS = {(15, 33): "earth", (33, 33): "wind", (15, 51.5): "dark", (33, 51.5): "fire",
          (65, 33): "earth", (85, 33): "wind", (66, 51.5): "dark", (85, 51.5): "fire"}


def isl_base(towers=True):
    sh = [ring((50, 49), 11, "#c8202a", 0.7, 0.8)]
    for c in ((15, 42), (33, 41), (15, 60), (33, 60), (65, 41), (86, 42), (66, 60), (86, 61)):
        sh += towerring(c)
    if towers:
        for c, el in TOWERS.items():
            sh += tower(c, el) + tagl((c[0], c[1] - 4.6), TLAB[el], 1.9)
    return sh


def dr10():
    return islands(shapes=isl_base(False), roles=dict(ISLAND_ROLES))


def dr11():
    return islands(shapes=isl_base(), roles=dict(ISLAND_ROLES))


def dr12():
    sh = isl_base()
    for c in ((15, 42), (33, 41), (66, 60), (86, 61)):
        sh += [circle(c, 9, "#e8e8f0", 0.5, 0.3)]
    return islands(shapes=sh, roles=dict(ISLAND_ROLES))


SWAPPED = roles(H1=(15, 42), D1=(33, 41), D3=(15, 60), MT=(33, 60), ST=(65, 41), D4=(86, 42), D2=(66, 60), H2=(86, 61))


def dr15():
    sh = isl_base()
    sh += [arrow((31.5, 45), (31.5, 55.5), "#ffffff", 0.8), arrow((34.5, 55.5), (34.5, 45), "#ffffff", 0.8)]
    sh += [arrow((64.5, 45), (64.5, 55.5), "#ffffff", 0.8), arrow((67.5, 55.5), (67.5, 45), "#ffffff", 0.8)]
    return islands(shapes=sh, roles=dict(SWAPPED))


WEST_GRP = [((30.5, 54.5), "D", "Bind2"), ((38.5, 54.5), "T", "Ign1"), ((30.5, 63), "D", "Bind1"), ((38.5, 63), "D", "Ign2")]
EAST_GRP = [((59.5, 54.5), "D", "Atk3"), ((67.5, 54.5), "H", "Atk1"), ((59.5, 63), "H", "Atk4"), ((67.5, 63), "T", "Atk2")]


def dr16(stacks=False):
    sh = bossring((50, 49))
    if stacks:
        sh += stack((35, 59), 9.0, 4.0, 2.0, True) + stack((64, 59), 9.0, 4.0, 2.0, True)
    sh += marked(WEST_GRP + EAST_GRP)
    return dream(boss=[50, 49], shapes=sh)


def dr18():
    sh = [circle((19, 17), 51, DEF_BLUE, 0.3, 0.3), circle((81, 16), 52, DEF_BLUE, 0.3, 0.3)]
    sh += marked([((19, 17), "T", "Ign1"), ((81, 16), "H", "Atk1"),
                  ((46, 62), "D", "Bind2"), ((44, 68), "D", "Bind1"), ((49.5, 67), "D", "Ign2"),
                  ((57, 63), "D", "Atk3"), ((59.5, 69), "H", "Atk4"), ((65.5, 67), "T", "Atk2")])
    return dream(shapes=sh)


def dr19():
    sh = isl_base()
    sh += [rect((15, 82), 9.5, 36, 0, "#a070d8", 0.55, 0.2), rect((66, 82), 9.5, 36, 0, "#a070d8", 0.55, 0.2)]
    sh += [line((37, 39), (57, 16), "#ff5a3a", 0.9), arrow((57, 16), (72.5, 44), "#ff5a3a", 0.9)]
    sh += [line((80, 38), (53, 24), "#ff5a3a", 0.9), arrow((53, 24), (27.5, 47), "#ff5a3a", 0.9)]
    return islands(shapes=sh, roles=roles(H1=(15, 42), D1=(36.5, 42), D3=(15, 64), MT=(33, 60), ST=(65, 41), D4=(81.5, 41),
                                          D2=(66, 64.5), H2=(86, 61)))


def dr20():
    sh = [ring((50, 49), 11, "#c8202a", 0.7, 0.8)]
    sh += tagl((37.5, 35.5), "Far", 2.2, "#9ad0ff") + tagl((82, 34), "Far", 2.2, "#9ad0ff")
    sh += tagl((15, 56), "Near + Doom", 2.2, "#ffb07a") + tagl((66, 57.5), "Near + Doom", 2.2, "#ffb07a")
    sh += tagl((33, 53.5), "Fire: stay", 2.2, "#ff7a5a") + tagl((86, 53.5), "Fire: stay", 2.2, "#ff7a5a")
    return islands(shapes=sh, roles=roles(H1=(15, 41), D4=(37, 42), MT=(33, 61), D3=(15, 64), ST=(65, 41), D1=(82, 40),
                                          H2=(86, 61), D2=(66, 65)))


def dr21():
    sh = [cone((42, 55), 312, 36, 52, PURPLE, 0.45), cone((57, 55), 48, 36, 52, PURPLE, 0.45),
          cone((30, 63), 180, 26, 40, PURPLE, 0.45), cone((68, 64.5), 180, 26, 40, PURPLE, 0.45)]
    sh += tagl((40, 50.5), "Far", 2.2, "#9ad0ff") + tagl((58, 50.5), "Far", 2.2, "#9ad0ff")
    sh += tagl((24, 60), "Near", 2.2, "#ffb07a") + tagl((74, 61), "Near", 2.2, "#ffb07a")
    return islands(shapes=sh, roles=roles(H1=(21, 27), H2=(78, 28.5), D4=(40, 58), D3=(30, 64), MT=(30, 70.5), D1=(57, 59),
                                          D2=(68, 65), ST=(68, 71.5)))


def dr22():
    sh = [dot((92, 50), 8.5, "#18181c", 0.95), ring((92, 50), 8.5, "#d0d0d8", 0.7, 0.9)]
    sh += bigclone((49, 18)) + bigclone((49, 57)) + bigclone((49, 77))
    sh += [arrow((52, 21), (86, 45), "#ff5a3a", 1.2)]
    return islands(shapes=sh)


def dr23():
    sh = [ring(ISL_D, 27, "#ffb060", 1.2, 0.6), circle(ISL_D, 27, "#ffd0a0", 0.18, 0.1)]
    sh += [cone((72, 50), 0, 90, 40, ORANGE, 0.18), cone((72, 50), 180, 90, 40, ORANGE, 0.18)]
    sh += [dot((49, 58), 3.0, "#c8c0c0", 0.5), dot((48, 75), 3.0, "#c8c0c0", 0.5)]
    sh += bigclone((24, 50)) + bigclone((72, 50))
    sh += [arrow((47, 61), (28, 51.5), "#ff5a3a", 1.2), arrow((47, 72), (69, 54.5), "#ff5a3a", 1.2)]
    return islands(shapes=sh)


def dr24():
    sh = [circle((75, 24), 48, DEF_BLUE, 0.3, 0.3), circle((76, 71), 48, DEF_BLUE, 0.3, 0.3)]
    sh += stack((22.5, 30.5), 8.5, 4.6, 2.2, True) + stack((23, 70.5), 8.5, 4.6, 2.2, True)
    return dream(shapes=sh, roles=roles(MT=(20, 28), D1=(25, 28), H1=(20, 33.5), D3=(25, 33.5), ST=(20.5, 68), D2=(25.5, 68),
                                        H2=(20.5, 73), D4=(25.5, 73)), iconSize=5.0)


def dr25():
    sh = [circle(ISL_D, 27, ORANGE, 0.5, 0.2)]
    sh += [cone(ISL_B, 0, 90, 55, ORANGE, 0.45), cone(ISL_B, 180, 90, 55, ORANGE, 0.45)]
    sh += bigclone(ISL_D) + bigclone(ISL_B)
    sh += gen((56, 45), "D") + gen((67, 45), "H") + gen((62, 54), "T")
    return islands(shapes=sh)


def dr26():
    sh = [circle((90, 46), 47, DEF_BLUE, 0.3, 0.3), circle((50, 92), 52, DEF_BLUE, 0.3, 0.3)]
    sh += stack((42.5, 10.5), 8.0, 4.6, 2.2, True) + stack((12.5, 47.5), 8.0, 4.6, 2.2, True)
    return dream(shapes=sh, roles=roles(MT=(40, 8), D1=(45, 8), H1=(40, 13.5), D3=(45, 13.5), ST=(10, 45), D2=(15, 45),
                                        H2=(10, 50.5), D4=(15, 50.5)), iconSize=5.0)


def dr27():
    sh = [cone((50, 9), 270, 90, 80, ORANGE, 0.5), cone((50, 9), 90, 90, 80, ORANGE, 0.5)]
    sh += bigclone((50, 9))
    sh += gen((34, 40), "D") + gen((43, 40), "T") + gen((39, 47), "H")
    return dream(shapes=sh)


# ---------------------------------------------------------------- Temporal Curtain: inside or outside the target circle
def tc(outside=True):
    F.k = 0.75
    sh = []
    L, Rr = (22, 50), (75, 50)
    for c in (L, Rr):
        sh += [circle(c, 18.3, FLOOR, 0.95, 0.3), ring(c, 18.3, "#e2e2e2", 0.5, 0.9)]
    if outside:
        sh += [cone(L, 270, 90, 25, ORANGE, 0.5), cone(L, 90, 90, 25, ORANGE, 0.5)] + clone(L)
        top = (75, 33)
        sh += [cone(top, 0, 90, 25, ORANGE, 0.5), cone(top, 180, 90, 25, ORANGE, 0.5)] + clone(top)
        you = [(27, 66), (66, 40)]
        sh += tagl((50, 91), "Safe: outside the boss's target circle", 2.6, "#ffe9a8")
    else:
        sh += [cone(L, 0, 90, 25, ORANGE, 0.5), cone(L, 180, 90, 25, ORANGE, 0.5)] + clone(L)
        top = (75, 36)
        sh += [cone(top, 270, 90, 25, ORANGE, 0.5), cone(top, 90, 90, 25, ORANGE, 0.5)] + clone(top)
        you = [(34, 50), (75, 56.5)]
        sh += tagl((50, 91), "Safe: inside the boss's target circle", 2.6, "#ffe9a8")
    sh += tagl((22, 18), "1st: on the island", 2.3) + tagl((75, 18), "2nd: the last clone", 2.3)
    boss = [[44.5, 49], [75, 48]] if outside else [[45, 49], [75, 50]]
    for c in you:
        sh += gen(c, "T", None, 3.8)
    return {"arena": None, "waymarks": None, "boss": boss, "bossSize": 6, "shapes": sh}
