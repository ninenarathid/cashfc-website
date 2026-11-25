"""Every scene of the M10S guide, redrawn from game8's strategy-board pictures (440x330, 4:3).

x in % of the width, y in % of the height, sizes in % of the width (a span of dy % of the height is
dy * 0.75 of the width). Measured by eye on 5 % grid sheets (dl/grid) and checked with compare sheets.
Two bosses: a red disc behind the boss icon = Red Hot, a blue disc = Deep Blue.
"""
import math

R = lambda v: round(v, 2)
K = 0.75

ORANGE = "#ff9b3d"
REDHOT = "#e8392f"
DEEPBLUE = "#2f7fe8"
PUDDLE = "#8c2c0e"
CYANB = "#4de1ff"


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r / K)


def line(p0, p1, c="#000000", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def box(x0, y0, x1, y1, c=ORANGE, o=0.55, wd=0.01, rot=0):
    return {"t": "rect", "at": [R((x0 + x1) / 2), R((y0 + y1) / 2)], "w": R(abs(x1 - x0)), "h": R(abs(y1 - y0) * K),
            "c": c, "o": o, "wd": wd, "rot": rot}


def band(p0, p1, wdt, c=ORANGE, o=0.55):
    """A straight line AoE from p0 to p1, wdt wide (in % of the width)."""
    dx, dy = p1[0] - p0[0], (p1[1] - p0[1]) * K
    ln = math.hypot(dx, dy)
    ang = math.degrees(math.atan2(dy, dx))
    return {"t": "rect", "at": [R((p0[0] + p1[0]) / 2), R((p0[1] + p1[1]) / 2)], "w": R(ln), "h": R(wdt),
            "c": c, "o": o, "wd": 0.01, "rot": R(ang)}


def circle(c, r, col=ORANGE, o=0.4, wd=0.3):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=2.6, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def arrow(p0, p1, c="#ffffff", wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def cone(at, d, spread, ln, c=ORANGE, o=0.45, wd=0.01):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def chevron(c, ang, w=3.4, h=1.6, col="#ffb52e", wd=0.85, o=0.98):
    tip = off(c, ang, h / 2)
    back = off(c, ang + 180, h / 2)
    a = off(back, ang + 90, w / 2)
    b = off(back, ang - 90, w / 2)
    return [line(a, tip, col, wd, o), line(b, tip, col, wd, o)]


def stack(c, d=9.0, s=1.0):
    """game8's stack marker: orange chevrons on four sides pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        p = off(c, a, d)
        out += chevron(p, a + 180, 4.6 * s, 2.0 * s, "#ff8a1a", 1.4 * s)
        out += chevron(off(p, a, 1.6 * s), a + 180, 4.6 * s, 2.0 * s, "#ffd36a", 0.9 * s)
    return out


def buster(c, r=4.2):
    return [ring(c, r, "#c01818", 1.3, 0.95), ring(c, r + 0.9, "#ff6a5a", 0.3, 0.9)]


def flow(rows, cols, ang, col="#fff6d8"):
    """Rows of chevrons pointing towards ang: a knockback or a wave."""
    out = []
    for y in rows:
        for x in cols:
            out += chevron((x, y), ang, 7.0, 2.8, "#ffb347", 2.2, 0.35)
            out += chevron((x, y), ang, 7.0, 2.8, col, 0.9, 0.9)
    return out


def aoe(c, r=5.5, o=0.38):
    """An orange circle AoE marker on a player (soft fill, bright rim)."""
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, "#ffc070", 0.4, 0.95)]


def puddle(c, r=5.5):
    """A fire puddle left on the floor: dark red ring, glowing middle."""
    return [circle(c, r, PUDDLE, 0.22, 0.01), ring(c, r, PUDDLE, 1.0, 0.85), dot(c, 1.1, "#ffe9a0")]


def num(c, n):
    """game8's number badge over a player's head."""
    return [dot(c, 1.7, "#2a2418"), ring(c, 1.7, "#ffd84d", 0.3), text((c[0], c[1] + 0.15), str(n), 2.3, "#ffd84d")]


def tether(a, b, c="#e43a3a", wd=0.45):
    return line(a, b, c, wd, 0.95)


def board(c):
    """Insane Air's water board marker."""
    return [circle(c, 2.6, "#1a5a7a", 0.5, 0.01), ring(c, 2.6, CYANB, 0.6), ring(c, 3.6, CYANB, 0.25, 0.7), dot(c, 1.0, "#e8fbff")]


def fboard(c):
    """Insane Air's fire board marker."""
    return [ring((c[0], c[1] + 1.6), 2.6, "#ff7aa8", 0.35, 0.8), dot(c, 1.9, "#c8401e"), ring(c, 1.9, "#ffb08a", 0.3)]


def orb(c, r=1.4):
    return [dot(c, r, "#9eefff"), ring(c, r + 0.6, "#2ab8e8", 0.35)]


def wedge_cones(at, dirs, spread, ln, o=0.42):
    return [cone(at, d, spread, ln, ORANGE, o) for d in dirs]


def towards(a, b):
    """Direction (deg, 0 = up, clockwise) from a to b."""
    return math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]) * K)) % 360


# ------------------------------------------------------------------ bosses
class Scene:
    def __init__(self, **kw):
        self.s = {"shapes": [], **kw}
        self.halos = []
        self.bosses = []

    def add(self, *items):
        for it in items:
            if isinstance(it, list):
                self.s["shapes"].extend(it)
            else:
                self.s["shapes"].append(it)
        return self

    def red(self, at):
        self.halos.append(circle(at, 4.9, REDHOT, 0.95, 0.01))
        self.bosses.append([R(at[0]), R(at[1])])
        return self

    def blue(self, at):
        self.halos.append(circle(at, 4.9, DEEPBLUE, 0.95, 0.01))
        self.bosses.append([R(at[0]), R(at[1])])
        return self

    def roles(self, **kw):
        self.s["roles"] = {k: ([R(v[0]), R(v[1])] if not isinstance(v[0], (list, tuple)) else [[R(p[0]), R(p[1])] for p in v])
                           for k, v in kw.items()}
        return self

    def done(self):
        self.s["shapes"] += self.halos
        if self.bosses:
            self.s["boss"] = self.bosses if len(self.bosses) > 1 else self.bosses[0]
        return self.s


NOW = {"waymarks": None}

# The waymarks as game8 draws them from the snaking part on (36-54), and in the split arena (57-73).
W1 = {"A": [50, 18], "B": [73.5, 51], "C": [49, 86], "D": [24, 50.5], "1": [40, 41], "2": [59, 41.5], "3": [59, 60], "4": [40.5, 58.5]}
W2 = {"A": [49.5, 17], "B": [69, 49.5], "C": [49.5, 83], "D": [31, 50], "1": [42.5, 41], "2": [57.5, 41], "3": [57.5, 59], "4": [42.5, 59]}


# ------------------------------------------------------------------ setup
def waymarks():
    return {"frame": [1, 1], "arena": {"shape": "square", "at": [50, 50], "w": 94, "h": 94},
            "waymarks": {"A": [50, 19], "B": [78, 50.5], "C": [50, 80.5], "D": [21.5, 50],
                         "1": [34, 41.5], "2": [65, 42], "3": [65, 59], "4": [34, 59]},
            "markSize": 7.5, "shapes": []}


# ------------------------------------------------------------------ first part: Red Hot
TOP1 = [box(15, 5, 84, 15)]
TOP2 = [box(15, 5, 84, 15), box(15, 15, 84, 25, ORANGE, 0.45)]


def ff1():
    s = Scene(**NOW).red((13.5, 50))
    s.roles(MT=(47, 40), H1=(42.5, 48), ST=(49, 50), H2=(55, 48), D1=(43, 57.5), D2=(49, 59), D3=(56, 58), D4=(52, 65.5))
    return s.done()


def ff2():
    s = Scene(**NOW).add(box(49, 7, 84, 15))
    s.add(tether((81, 8), (46, 19)), tether((46, 19), (68, 40)), tether((68, 40), (49, 40)))
    s.add(num((84.5, 3.5), 1), num((48, 13), 2), num((71, 33.5), 3), num((52, 33.5), 4))
    s.red((49, 5))
    s.roles(D1=(81, 8), ST=(45.5, 19.5), D3=(68, 40), H1=(49, 40), MT=(54, 21), D2=(59.5, 21), H2=(40.5, 43.5), D4=(69, 52))
    return s.done()


def ff3():
    s = Scene(**NOW).add(box(15, 5, 84, 15))
    s.add(tether((46, 11), (75, 28)), tether((75, 28), (49, 31)))
    s.add(num((48.5, 4), 2), num((85, 15.5), 1), num((78.5, 22), 3), num((52, 25), 4))
    s.red((83, 6))
    s.roles(ST=(46, 11), D1=(82, 21), D3=(75, 28), H1=(49, 31), MT=(73, 18.5), D2=(77.5, 17), H2=(40, 41), D4=(66, 39))
    return s.done()


def ff4():
    s = Scene(**NOW).add(box(15, 5, 84, 15), band((45, 8), (85, 22), 7))
    s.add(tether((82, 20), (49, 31)))
    s.add(num((46, 13), 2), num((58, 16), 1), num((85, 14), 3), num((52, 25.5), 4))
    s.red((45, 8))
    s.roles(ST=(43, 20), D2=(50, 19), D1=(55, 22), MT=(48, 24.5), H1=(49, 31), D3=(82, 20), H2=(40.5, 42), D4=(65, 40))
    return s.done()


def ff5():
    s = Scene(**NOW).add(TOP2)
    s.add(tether((52, 20), (80, 18)))
    s.add(num((52, 13), 4), num((81, 21.5), 1), num((88, 21.5), 2), num((68.5, 27), 3))
    s.red((82, 17))
    s.roles(H1=(49, 20.5), D1=(78, 27), ST=(85, 27.5), D3=(66, 33), MT=(74.5, 31), D2=(82, 32.5), H2=(43, 32), D4=(52, 35))
    return s.done()


FF6_SPOTS = {"D3": (17.5, 28), "D1": (30, 28), "MT": (42.5, 28), "D2": (55, 28), "ST": (67.5, 28), "D4": (80, 28.5),
             "H2": (17.5, 45.5), "H1": (17, 62.5)}


def ff6():
    s = Scene(**NOW).add(TOP2)
    for p in FF6_SPOTS.values():
        s.add(aoe(p, 9.5))
    s.red((48, 44))
    s.roles(**FF6_SPOTS)
    return s.done()


def leftovers():
    out = list(TOP2)
    for p in FF6_SPOTS.values():
        out += aoe(p, 9.5, 0.32)
    return out


SAFE = 120  # Cutback Blaze's safe slice points this way from the boss


def cb(origin):
    return cone(origin, SAFE + 180, 323, 110, ORANGE, 0.28)


def cut1():
    s = Scene(**NOW).add(leftovers())
    s.add(ring((34, 47), 6.5, "#ff3d8a", 0.6), ring((64, 69), 19.5, "#ff3d8a", 0.6))
    s.add(arrow((46, 22), (39.5, 33), "#ff3d8a", 0.7), arrow((59, 22), (60, 41), "#ff3d8a", 0.7))
    s.add(text((64, 69), "ที่ปลอดภัยกว้าง", 2.6), text((34, 37.5), "จุดล่อ", 2.4))
    s.red((40, 54))
    s.roles(D3=(32, 42), D1=(37, 46), ST=(41.5, 43), D2=(45, 47), D4=(53, 44), H1=(32.5, 49), H2=(31, 53.5), MT=(37, 63))
    return s.done()


def cut2():
    s = Scene(**NOW).add(leftovers(), cb((40, 54)))
    s.red((40, 54))
    s.roles(D3=(28, 42.5), D4=(32.5, 42), D1=(28.5, 47), D2=(33, 47), ST=(27.5, 54), H1=(31, 53), H2=(34.5, 53.5), MT=(36, 50))
    return s.done()


def clump(c):
    x, y = c
    return dict(MT=(x - 2.5, y - 3), ST=(x + 2.5, y - 3), D1=(x - 1.5, y), D2=(x + 1.5, y), H1=(x - 2.5, y + 3),
                H2=(x + 2.5, y + 3), D3=(x, y - 2), D4=(x, y + 2))


def cut3():
    s = Scene(**NOW).add(leftovers(), cb((40, 54)), stack((42.5, 58), 10))
    s.red((38, 53))
    s.roles(**clump((42.5, 58.5)))
    return s.done()


def cut4():
    s = Scene(**NOW).add(leftovers(), cb((45, 57)), aoe((40, 52), 10), stack((50, 63), 10))
    s.red((45, 57))
    s.roles(**clump((50, 64)))
    return s.done()


def cut5():
    s = Scene(**NOW).add(leftovers(), cb((53, 62)), aoe((40, 52), 10), aoe((49.5, 61), 10), stack((60, 77), 10))
    s.red((54, 70))
    s.roles(**clump((60, 77.5)))
    return s.done()


def cut6():
    s = Scene(**NOW).add(leftovers(), cb((60, 64)), aoe((40, 52), 10), aoe((49.5, 61), 10), aoe((59, 75), 10))
    s.red((70, 80))
    s.roles(**clump((75, 85)))
    return s.done()


# ------------------------------------------------------------------ Deep Blue part
def sw1():
    s = Scene(**NOW).add(line((51, 31), (100, 51), "#2040ff", 0.55))
    s.blue((49, 30))
    s.roles(MT=(49, 23.5), D1=(47, 38), D2=(53, 38), ST=(49.5, 42), H1=(44, 45), D4=(56.5, 45.5), D3=(49, 51.5), H2=(51.5, 50))
    return s.done()


SPREAD_N = {"D3": (21, 13), "MT": (35, 13), "H1": (21, 33), "D1": (35, 33), "ST": (65.5, 13), "D4": (79, 13),
            "D2": (65.5, 33), "H2": (79, 33)}


def sw2():
    s = Scene(**NOW).add(box(39, 6, 61.5, 96))
    for p in SPREAD_N.values():
        s.add(aoe(p, 10.5))
    s.blue((49, 2))
    s.roles(**SPREAD_N)
    return s.done()


def quad(c, a, b, cc, d, dx=3.6, dy=7.5):
    """Four seats in a 2x2 block around c: a top-left, b top-right, cc bottom-left, d bottom-right."""
    x, y = c
    return {a: (x - dx / 2, y - dy / 2), b: (x + dx / 2, y - dy / 2), cc: (x - dx / 2, y + dy / 2), d: (x + dx / 2, y + dy / 2)}


def sw3():
    s = Scene(**NOW).add(box(38.5, 6, 61.5, 96), stack((26.5, 24), 10.5), stack((71, 23), 10.5))
    s.blue((49, 2))
    s.roles(**quad((26.5, 24), "D3", "MT", "H1", "D1"), **quad((71, 23), "ST", "D4", "D2", "H2"))
    return s.done()


def sw4():
    s = Scene(**NOW).add(box(15, 6, 39, 96), stack((49.5, 23.5), 10.5), stack((70.5, 23.5), 10.5))
    s.blue((27, 2))
    s.roles(**quad((49.5, 23.5), "MT", "D3", "H1", "D1", 5), **quad((70.5, 23.5), "ST", "D4", "D2", "H2", 5))
    return s.done()


SPREAD_W = {"D3": (21, 13), "MT": (35, 13), "ST": (49, 13), "D4": (62.5, 13), "H1": (21, 33), "D1": (35, 33),
            "D2": (49, 33), "H2": (62.5, 33)}


def sw5():
    s = Scene(**NOW).add(box(62, 6, 85, 96))
    for p in SPREAD_W.values():
        s.add(aoe(p, 10.5))
    s.blue((74, 2))
    s.roles(**SPREAD_W)
    return s.done()


def annulus_cones(at, dirs, spread, ln):
    out = wedge_cones(at, dirs, spread, ln, 0.5)
    out.append(circle(at, 11.5, "#b9babe", 1.0, 0.01))   # game8's cones start a little away from the boss
    return out


EIGHT = {"MT": (50, 38.5), "D4": (57.5, 42), "H2": (59, 52.5), "D2": (57.5, 63), "ST": (50.5, 66), "D1": (42, 63),
         "H1": (40.5, 52.5), "D3": (42, 42)}


def ao1():
    s = Scene(**NOW).add(annulus_cones((49.5, 50), range(0, 360, 45), 33, 31))
    s.blue((49.5, 50))
    s.roles(**EIGHT)
    return s.done()


def ao_rev():
    s = Scene(**NOW).add(annulus_cones((49.5, 50), [22.5 + 45 * k for k in range(8)], 36, 33))
    s.blue((49.5, 50))
    s.roles(**EIGHT)
    return s.done()


def ao_double():
    s = Scene(**NOW).add(annulus_cones((49.5, 50), range(0, 360, 45), 33, 31))
    s.blue((49.5, 50))
    s.roles(D3=(46, 39), MT=(54, 38.5), D4=(59, 46), H2=(59, 58), D2=(53.5, 64.5), ST=(46, 64.5), D1=(40.5, 58), H1=(40.5, 46))
    return s.done()


# ------------------------------------------------------------------ Insane Air (game8's sketches: no arena)
SKETCH = {"arena": None, "waymarks": None, "bg": "#66686c"}
BOARD = (48, 37)


def sketch_base(arrow_to):
    out = [tether((71.5, 31), (63, 42.5), "#ff9b3d", 0.4), tether((63, 42.5), (56.5, 28.5), "#ff9b3d", 0.4),
           dot((63, 42.5), 0.8, "#e8fbff"), dot((56.5, 28.5), 0.8, "#e8fbff")]
    out += board(BOARD)
    out.append(arrow((BOARD[0] - 3, 28.5), arrow_to, "#ffffff", 1.1))
    return out


def ia_up():
    s = Scene(**SKETCH).add(sketch_base((38.5, 19.5)), buster((49, 52.5), 4.6))
    s.blue((72, 30))
    s.roles(MT=(49, 52.5), H1=(26, 17), D3=(21, 30), D1=(30, 29))
    return s.done()


def ia_side():
    s = Scene(**SKETCH).add(sketch_base((37, 28.5)), cone((48, 41), 180, 30, 33, ORANGE, 0.6), text((49, 90), "ขอบนอก", 2.8))
    s.blue((72, 30))
    s.roles(H1=(48, 47.5), MT=(47.5, 51), D1=(48.5, 55), D3=(49, 58.5))
    return s.done()


def ia_down():
    s = Scene(**SKETCH).add(sketch_base((40, 35.5)))
    for d in (222, 191, 165, 134):
        s.add(cone((48, 40), d, 19, 31, ORANGE, 0.6))
    s.add(text((49, 83), "ขอบนอก", 2.8))
    s.blue((72, 30))
    s.roles(D3=(39, 46), H1=(45, 49.5), MT=(52, 50.5), D1=(57, 46))
    return s.done()


def ia_path():
    s = Scene(waymarks={"1": [41, 36]}, markSize=4.2)
    for c, n in (((49, 24), "1"), ((68, 25), "2"), ((68, 51), "3")):
        s.add(board(c), text((c[0], c[1] - 7), n, 3.2, "#7fd8ff"))
    s.add(board((68, 79)), board((52.5, 48)))
    for c, n in (((49, 80), "1"), ((29, 80), "2"), ((29, 52), "3")):
        s.add(fboard(c), text((c[0], c[1] + 8), n, 3.2, "#ff8a7a"))
    s.add(fboard((29, 24)), fboard((46.5, 47.5)))
    s.add(text((50, 62), "ครั้งที่ 4: สีหนึ่งออกกลาง อีกสีออกทแยง", 2.5))
    s.blue((18, 13)).red((77, 88))
    return s.done()


def snaking():
    s = Scene(**NOW).add(box(38, 34, 42, 40, "#3a8fd8", 0.95, 0.2), box(61, 34, 65, 40, "#d83a3a", 0.95, 0.2))
    s.add(text((50, 28), "ได้ดีบัฟสีใดสีหนึ่ง", 2.6), text((37.5, 77), "กลุ่ม MT", 2.6), text((61, 77), "กลุ่ม ST", 2.6))
    s.blue((40, 49)).red((63, 49))
    s.roles(MT=(37, 59), H1=(32, 62), D1=(40, 67), D3=(36, 69.5), ST=(59, 63), H2=(63, 60), D4=(68, 63), D2=(64, 68))
    return s.done()


# ------------------------------------------------------------------ snaking: both groups on one board
EAST4 = [(80.5, 34), (80.5, 44), (80.5, 54.5), (80.5, 65)]
SOUTH4 = [(56, 93), (64, 93), (72, 93), (81, 93)]


def puddles(spots, r=5.5):
    out = []
    for p in spots:
        out += puddle(p, r)
    return out


def blue_alleyoop(red_spots, label):
    s = Scene(waymarks=W1)
    nb, sb = (14, 25), (14, 73)
    s.add(wedge_cones(nb, (18, 42, 68), 18, 21, 0.5), cone(nb, 174, 30, 28, ORANGE, 0.5))
    s.add(wedge_cones(sb, (166, 141, 116), 18, 21, 0.5), cone(sb, 6, 30, 28, ORANGE, 0.5))
    for p in red_spots.values():
        s.add(aoe(p, 5.5))
    s.add(text((44, 10.5), "ฝั่งแคบ: Tank Melee Range", 2.2), text((42, 90.5), "ฝั่งแคบ: Tank Melee Range", 2.2),
          text((36, 47), "กรวยที่ 2: หลบเข้ากลาง", 2.2))
    if label:
        s.add(text((70, 87), label, 2.4))
    s.blue(nb).blue(sb).red((65, 52))
    s.roles(MT=[(27, 19), (25, 86)], D1=[(24, 10), (21, 90.5)], D3=[(17.5, 9), (17, 90.5)], H1=[(16, 38), (17, 64)],
            **red_spots)
    return s.done()


def blue1():
    return blue_alleyoop({"D4": (80.5, 32), "ST": (80.5, 42), "D2": (80.5, 52.5), "H2": (80.5, 63)}, None)


def red1():
    return blue_alleyoop({"D4": (80.5, 33), "ST": (80.5, 43), "D2": (80.5, 53), "H2": (80.5, 64)}, "spread รอบ B")


def blue2():
    s = Scene(waymarks=W1).add(puddles(EAST4), buster((50, 53), 4.4))
    s.blue((39, 51)).red((59, 48))
    s.roles(MT=(49, 53), ST=(51, 54.5), D3=(34, 37), H1=(29, 48), D1=(34, 62), D4=(65, 42), D2=(67, 50.5), H2=(66, 67))
    return s.done()


VARIAL = (49, 95.5)


def varial_cone():
    return cone(VARIAL, 0, 122, 82, ORANGE, 0.42)


def blue3():
    s = Scene(waymarks={k: v for k, v in W1.items() if k not in ("B", "C")}).add(varial_cone(), puddles(EAST4))
    s.add(arrow((49, 56), (49, 63.5)), arrow((49, 68), (49, 77)), board((49, 87.5)))
    for p in ((61, 94), (68, 94), (75, 93.5), (81, 93.5)):
        s.add(aoe(p, 4.6))
    s.add(stack((31.5, 91.5), 6.5, 0.7), text((35, 79), "ดูจำนวนลูกน้ำบนคลื่น", 2.4))
    s.blue((49, 47)).blue(VARIAL)
    s.roles(D3=(30, 89.5), H1=(28, 93.5), D1=(32.5, 94), MT=(36.5, 93), ST=(61, 94), D2=(68, 94), H2=(75, 93.5), D4=(81, 93.5))
    return s.done()


def blue3b():
    s = Scene(waymarks={k: v for k, v in W1.items() if k not in ("B", "C")}).add(varial_cone(), puddles(EAST4))
    s.add(arrow((49, 52), (49, 60)), arrow((49, 66), (49, 75)))
    for p in ((43, 86), (47, 83.5), (52, 83.5), (56, 86)):
        s.add(orb(p))
    for p in ((61, 94), (68, 94.5), (75, 94), (81, 94)):
        s.add(aoe(p, 4.6))
    s.add(text((17, 80), "ลูกน้ำ 1 = stack", 2.3), text((17, 85), "ลูกน้ำ 4 = spread", 2.3))
    s.blue((49, 44)).blue((49, 92))
    s.roles(H1=(24, 92), D3=(28, 94), MT=(35, 92), D1=(38.5, 94), ST=(61, 94), D2=(68, 94.5), H2=(75, 94), D4=(81, 94))
    return s.done()


def blue4():
    s = Scene(waymarks={k: v for k, v in W1.items() if k not in ("B",)}).add(puddles(EAST4))
    spots = {"D3": (25, 77), "MT": (37, 75), "H1": (23, 91), "D1": (35, 91)}
    for p in spots.values():
        s.add(aoe(p, 7.5))
    for p in ((43, 87), (47, 84.5), (52, 84.5), (56, 87)):
        s.add(orb(p))
    for p in ((61, 94), (68, 94.5), (75, 94), (81.5, 94)):
        s.add(aoe(p, 4.6))
    s.add(text((17, 62), "ลูกน้ำ 1 = stack", 2.3), text((17, 67), "ลูกน้ำ 4 = spread", 2.3))
    s.blue((49, 95))
    s.roles(**spots, ST=(61, 94), D2=(68, 94.5), H2=(75, 94), D4=(81.5, 94))
    return s.done()


WEST4 = {"D3": (27, 47), "D1": (35, 47), "H1": (27, 57), "MT": (35, 57)}


def aerial_base():
    return puddles([(81, 38), (81, 48), (81, 58), (81, 68)]) + puddles(SOUTH4)


def blue5():
    s = Scene(waymarks={k: v for k, v in W1.items() if k != "1"}).add(aerial_base(), board((42, 43)))
    for p, n in (((67, 12), 3), ((79, 12), 1), ((59, 75), 4), ((70, 75), 2)):
        s.add(aoe(p, 5.5), num((p[0] + 3.5, p[1] - 5.5), n))
    s.blue((42, 52)).red((61, 50))
    s.roles(**WEST4, D4=(67, 12), ST=(79, 12), D2=(59, 75), H2=(70, 75))
    return s.done()


WAVE_PUDDLES = [(70, 13), (80, 13), (81, 37), (81, 47), (81, 58), (81, 68), (66, 82), (77, 82)] + SOUTH4


def wave():
    s = Scene(waymarks=W1).add(puddles(WAVE_PUDDLES), box(44, 6, 56, 99), flow((16, 37, 80), (29, 50, 71), 180))
    s.add(board((50, 7)), stack((33, 59), 7, 0.75))
    s.blue((50, 3)).red((68, 51.5))
    s.roles(H1=(29.5, 57), D1=(33, 55), D3=(36.5, 59.5), MT=(31.5, 62), ST=(72.5, 46.5), D2=(68, 56.5), H2=(72.5, 59), D4=(74.5, 52))
    return s.done()


CUT_PUDDLES = [(66, 8), (78, 8), (81, 36), (81, 47), (81, 58), (81, 68), (63, 77), (73, 74), (55, 92), (62.5, 92), (70, 92), (80, 92)]


def cutback2():
    s = Scene(waymarks=W1).add(puddles(CUT_PUDDLES), cone((60, 52), 90, 334, 110, ORANGE, 0.3), buster((18, 52), 4.6))
    s.blue((47, 40)).red((60, 52))
    s.roles(MT=(18, 52), H1=(38, 53), D3=(43, 51), D1=(47, 51.5), D4=(64.5, 50), H2=(67.5, 48.5), D2=(65, 56), ST=(71, 53))
    return s.done()


def red3():
    s = Scene(waymarks={k: v for k, v in W1.items() if k not in ("B", "C")}).add(varial_cone(), puddles([(81, 30), (81, 42), (81, 54), (81, 66)]))
    for p in ((61, 93), (68, 93), (75, 92.5), (81, 92.5)):
        s.add(aoe(p, 5.2))
    s.blue((49, 95.5)).red((59, 72))
    s.roles(H1=(20, 82), D3=(21, 90), D1=(27, 90), MT=(33, 92), ST=(61, 93), D2=(68, 93), H2=(75, 92.5), D4=(81, 92.5))
    return s.done()


def red4():
    s = Scene(waymarks={k: v for k, v in W1.items() if k != "2"}).add(aerial_base())
    for p, n in (((67, 12), 3), ((79, 12), 1), ((59, 75), 4), ((70, 75), 2)):
        s.add(aoe(p, 5.5), num((p[0] + 3.5, p[1] - 5.5), n))
    s.add(arrow((66.5, 27), (61, 34)), arrow((65.5, 64), (61, 56.5)))
    s.add(text((72, 20), "Tank / Range: ฝั่งเหนือ", 2.3), text((63, 83.5), "Healer / Melee: ฝั่งใต้", 2.3))
    s.blue((49, 2)).red((55, 45))
    s.roles(**WEST4, D4=(67, 12), ST=(79, 12), D2=(59, 75), H2=(70, 75))
    return s.done()


def red5():
    s = Scene(waymarks=W1).add(aerial_base(), aoe((79, 12), 5.5), num((82.5, 6.5), 1), text((63, 8.5), "ล่อจากฝั่งเหนือ", 2.3))
    s.blue((49, 2)).red((56, 47))
    s.roles(**WEST4, ST=(79, 12), D4=(59.5, 39), D2=(53, 52.5), H2=(65, 60))
    return s.done()


def red6():
    s = Scene(waymarks=W1).add(aerial_base(), puddle((78, 12), 6), num((81.5, 6), 1), num((80.5, 77.5), 2))
    s.blue((48, 48)).red((74, 18))
    s.roles(**WEST4, ST=(78.5, 13.5), D4=(60, 30), H2=(77, 80.5), D2=(55, 52))
    return s.done()


def red7():
    s = Scene(waymarks=W1).add(aerial_base(), puddle((78, 12), 6), num((81.5, 6), 1), puddle((71, 73), 6), num((74.5, 67.5), 2))
    s.blue((48, 48)).red((72, 67))
    s.roles(**WEST4, H2=(71, 74.5), D4=(65, 25), ST=(63, 42.5), D2=(55, 53.5))
    return s.done()


def red8():
    s = Scene(waymarks=W1).add(aerial_base(), puddle((78, 12), 6), num((81.5, 6), 1), puddle((71, 73), 6), num((74.5, 67.5), 2),
                                puddle((66, 12), 6), num((69.5, 6), 3))
    s.blue((48, 48)).red((66, 13))
    s.roles(**WEST4, D4=(67, 13.5), D2=(55, 72), ST=(61, 45), H2=(60, 53))
    return s.done()


def red9():
    s = Scene(waymarks=W1).add(aerial_base(), puddle((78, 12), 6), num((81.5, 6), 1), puddle((71, 73), 6), num((74.5, 67.5), 2),
                                puddle((66, 12), 6), num((69.5, 6), 3), puddle((61, 73), 6))
    s.blue((48, 48)).red((61, 71))
    s.roles(**WEST4, D2=(61, 74.5), ST=(61, 44), D4=(65, 47), H2=(61, 52))
    return s.done()


# ------------------------------------------------------------------ Watery Grave
def grave():
    s = Scene(arena={"shape": "circle", "at": [50, 50], "r": 35, "fill": "#b9babe", "lines": False},
              waymarks={"A": [49, 17], "B": [72, 47], "D": [28, 46], "1": [38, 35], "2": [60, 35], "3": [61, 61], "4": [38, 62]})
    s.add(circle((50, 47), 9.5, "#ff6ad5", 0.18, 0.01), ring((50, 47), 9.5, "#ff6ad5", 0.5), ring((50, 47), 7.5, "#ff6ad5", 0.3))
    s.add(arrow((32.5, 50), (32.5, 14), "#3a7be8", 1.3), arrow((32.5, 50), (32.5, 90), "#3a7be8", 1.3))
    s.add(arrow((46, 50), (46, 5), "#ff5a5a", 1.1), arrow((46, 50), (46, 96), "#ff5a5a", 1.1))
    s.add(arrow((70, 14), (48.5, 89), "#ff5a5a", 0.9))
    s.add(text((14, 14), "เส้นน้ำ: ยืดตรง", 2.3, "#8fc4ff"), text((14, 19), "ไปกลับ เหนือ ↔ ใต้", 2.3, "#8fc4ff"),
          text((14, 24), "ห้ามโดน Watery Grave", 2.3, "#8fc4ff"))
    s.add(text((86, 14), "เส้นไฟ: ไปกลับ", 2.3, "#ff9a9a"), text((86, 19), "A ↔ C", 2.3, "#ff9a9a"),
          text((86, 24), "ต้องโดน Watery Grave", 2.3, "#ff9a9a"))
    s.blue((30, 7)).red((70, 7))
    s.roles(H1=(47, 47), H2=(53, 47))
    return s.done()


# ------------------------------------------------------------------ split arena
CENTRE = box(44, 6, 56, 96)
SPLIT8 = {"D3": (19, 10), "MT": (19, 27), "D1": (19, 73), "H1": (18.5, 90), "D4": (81, 10), "ST": (81, 27), "D2": (81, 73), "H2": (81, 90)}


def split1():
    s = Scene(waymarks={"A": [49, 4], "C": [49, 98]}).add(box(44, 7, 56, 95))
    s.red((49, 12))
    s.roles(**quad((37, 50), "D3", "MT", "H1", "D1", 6, 8), **quad((63, 50), "ST", "D4", "D2", "H2", 6, 8))
    return s.done()


def split2():
    s = Scene(waymarks={k: v for k, v in W2.items() if k != "D"}).add(CENTRE)
    for p in SPLIT8.values():
        s.add(aoe(p, 9))
    s.blue((31, 50)).red((49, 9))
    s.roles(**SPLIT8)
    return s.done()


def split_puddles(r=9):
    out = []
    for p in SPLIT8.values():
        out += aoe(p, r, 0.42)
    return out


DB = (31, 50)
NEAR = {"MT": (24, 45), "D1": (24, 56), "D3": (30, 33), "H1": (30, 66)}
FAR = {"ST": (57, 40), "D2": (57, 58), "D4": (58, 9), "H2": (58, 93)}
FIRST = sorted(towards(DB, p) for p in list(NEAR.values()) + list(FAR.values()))


def split3():
    s = Scene(waymarks={k: v for k, v in W2.items() if k not in ("D", "2", "3")}).add(CENTRE, split_puddles(), wedge_cones(DB, FIRST, 20, 80, 0.38))
    s.blue(DB)
    s.roles(**NEAR, **FAR)
    return s.done()


REV = [20, 62, 118, 160, 205, 268, 320, 340]


def split4():
    s = Scene(waymarks={k: v for k, v in W2.items() if k not in ("D", "B")}).add(CENTRE, split_puddles(), wedge_cones(DB, REV, 20, 80, 0.38))
    s.blue(DB)
    s.roles(MT=(24, 45), D1=(24, 56), D3=(30, 33), H1=(29, 66), ST=(63, 49), D2=(66.5, 49), D4=(58, 9), H2=(58, 93))
    return s.done()


def split5():
    s = Scene(waymarks={k: v for k, v in W2.items() if k != "D"}).add(CENTRE, split_puddles(), wedge_cones(DB, FIRST, 20, 80, 0.38))
    s.blue(DB)
    s.roles(D3=(36, 29), MT=(26, 38), D1=(26, 60), H1=(34, 64), ST=(60, 27), D4=(64, 23), H2=(60, 76), D2=(64, 79))
    return s.done()


CORNERS = [(18, 10), (17, 25), (17, 74), (17, 90), (83, 10), (83, 25), (83, 74), (83, 90)]


def split6():
    s = Scene(waymarks={"A": W2["A"], "B": W2["B"], "C": W2["C"]}).add(CENTRE)
    for p in CORNERS:
        s.add(aoe(p, 11, 0.32), ring(p, 9.5, "#ffc070", 0.3))
    for p in ((50, 14), (50, 47), (50, 51), (50, 83)):
        s.add(aoe(p, 12, 0.3))
    for c in ((34, 11.5), (66, 12.5), (34, 87.5), (65, 87.5)):
        s.add(stack(c, 6, 0.6))
    s.blue(DB).red((50, 49))
    s.roles(MT=(34, 8), D3=(34, 15), D4=(64, 9.5), ST=(68, 15), H1=(34, 84), D1=(34, 91), H2=(65, 84), D2=(65, 91))
    return s.done()


SPLIT12 = [(19, 10), (35, 10), (19, 27), (64, 10), (81, 10), (81, 27), (19, 73), (19, 90), (35, 90), (64, 90), (81, 73), (81, 90)]


def split7():
    s = Scene(waymarks={k: v for k, v in W2.items() if k not in ("D", "B")}).add(CENTRE)
    for p in SPLIT12:
        s.add(aoe(p, 9, 0.38))
    s.add(box(0, 10, 100, 36, ORANGE, 0.35), flow((25, 50, 75), (30, 43, 58, 72), 90))
    s.add(ring((2.5, 17), 2.2, CYANB, 0.5), ring((2.5, 17), 1.2, CYANB, 0.35), ring((9.5, 17), 2.2, CYANB, 0.5), ring((9.5, 17), 1.2, CYANB, 0.35))
    s.blue((6, 24)).red((49.5, 48))
    s.roles(**quad((33, 45.5), "D1", "D3", "H1", "MT", 6, 7), **quad((68, 49.5), "ST", "D2", "D4", "H2", 6, 7))
    return s.done()


BIG = [(17, 12), (30, 8), (17, 28), (50, 10), (70, 8), (83, 12), (83, 28), (17, 72), (17, 88), (32, 92), (50, 88), (68, 92), (83, 72), (83, 88)]


def split8():
    s = Scene(waymarks={"A": W2["A"], "C": W2["C"]}).add(CENTRE)
    for p in BIG:
        s.add(aoe(p, 11, 0.3))
    s.add(aoe((50, 48), 12.5, 0.3), stack((33.5, 47), 8, 0.8), stack((67, 47), 8, 0.8))
    s.red((50, 48))
    s.roles(**quad((33.5, 47), "D1", "D3", "H1", "MT", 5, 7), **quad((67, 47), "ST", "D2", "D4", "H2", 5, 7))
    return s.done()


# ------------------------------------------------------------------ last part
BASIC = {"MT": (49, 11), "D4": (77, 20), "H2": (80, 51), "D2": (77, 87), "ST": (49, 89), "D1": (23, 86), "H1": (20, 50), "D3": (24, 22)}
DBC = (49, 50)


def end1():
    s = Scene(waymarks=W2).add(wedge_cones(DBC, range(0, 360, 45), 30, 62, 0.32))
    for p in BASIC.values():
        s.add(aoe(p, 9))
    s.blue(DBC)
    s.roles(**BASIC)
    return s.done()


def end2():
    s = Scene(waymarks=W2).add(wedge_cones(DBC, range(0, 360, 45), 30, 62, 0.32))
    rot = {"D3": (37, 16), "MT": (61, 19), "D4": (78, 38), "H2": (77, 68), "D2": (61, 87), "ST": (39, 84), "D1": (24, 65), "H1": (24, 38)}
    for p in rot.values():
        s.add(aoe(p, 9))
    s.add(arrow((54, 40), (42, 40), "#ff9b3d", 1.2))
    s.blue(DBC)
    s.roles(**rot)
    return s.done()


RED8 = [(24, 22), (49, 11), (77, 19), (20, 50), (80, 50), (24, 84), (49, 86), (77, 84)]


def red8_circles():
    out = []
    for p in RED8:
        out += aoe(p, 11, 0.32)
        out.append(ring(p, 9.2, "#ffc070", 0.3))
    return out


def end3():
    s = Scene(waymarks=W2).add(red8_circles())
    s.blue((50, 28)).red((45, 63))
    s.roles(D3=(46, 32), MT=(55, 31), H1=(40, 36), D4=(52, 39.5), ST=(47, 40.5), H2=(61, 35), D1=(40, 45), D2=(56, 50))
    return s.done()


def end4():
    s = Scene(waymarks=W2).add(red8_circles(), stack((50, 30), 8.5, 0.85), buster((38.5, 60), 4.4))
    s.blue((50, 29.5)).red((51, 63))
    s.roles(H1=(46, 27), ST=(55, 29), D1=(49, 35), D2=(51.5, 35), D3=(45, 32), D4=(54.5, 33), H2=(53, 26), MT=(38.5, 60))
    return s.done()


def end5():
    s = Scene(waymarks=W2).add(red8_circles(), aoe((50, 27), 9, 0.32), aoe((50, 37), 9, 0.32), stack((49.5, 56), 8.5, 0.85))
    s.add(arrow((56, 30), (56, 46), "#ffffff", 0.8))
    s.blue((39, 62)).red((44, 61))
    s.roles(D1=(49.5, 52), H1=(47, 57), MT=(52.5, 57), D2=(46, 54), D3=(53, 54), ST=(50, 59.5), H2=(47.5, 60), D4=(52, 60.5))
    return s.done()
