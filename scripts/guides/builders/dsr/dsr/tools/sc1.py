"""P1 The Holy See: the square arena (40 x 40 yalms = the whole frame), redrawn from Tuufless's 01/ pictures."""
from base import *

# P1 waymarks from the source's preset (centre 100,100; 1 yalm = 2.5 %)
P1_WM = {k: [R(50 + (x - 100) * 2.5), R(50 + (z - 100) * 2.5)] for k, (x, z) in {
    "A": (95, 91.5), "B": (108.5, 95), "C": (105, 108.5), "D": (91.5, 105),
    "1": (105, 91.5), "2": (108.5, 105), "3": (95, 108.5), "4": (91.5, 95)}.items()}

FLOOR = "#2c3a36"


def board(shapes=(), wm=True, **kw):
    """The Holy See: square floor with the carpet strip down the middle."""
    sh = [rect((50, 50), 20, 100, 0, "#7a5e4c", 0.45, 0.05)]
    for y in range(5, 100, 15):
        sh.append(rect((50, y), 9, 9, 45, "#a88a5a", 0.18, 0.05))
    s = {"frame": [1, 1], "bg": "#1c2422", "arena": {"shape": "square", "at": [50, 50], "w": 100, "h": 100, "fill": FLOOR, "lines": False, "edge": "#10161a"},
         "waymarks": dict(P1_WM) if wm else None, "markSize": 6.2, "iconSize": 6.2, "bossSize": 7.5}
    s["shapes"] = sh + list(shapes)
    s.update(kw)
    return s


def waymarks():
    sh = []
    for k, p in P1_WM.items():
        sh.append(ring(p, 4.2, "#ffffff", 0.3, 0.6))
    return board(sh, markSize=7.5)


def pile(c, n=3, step=1.2):
    out = []
    for i in range(n):
        out += anon((c[0] + (i - (n - 1) / 2) * step, c[1] + 2.4 + i * 0.4), 2.0)
    return out


def opener():
    sh = [donut((49.5, 53), 80, 14, PINK, 0.3), ring((49.5, 53), 14, "#ffb0b0", 0.35, 0.8)]
    sh += [circle((49.5, 63), 9, PINK, 0.4)]
    sh += bossring((49.5, 47.5), 6, "#d62b2b", 0.9) + bossring((49.5, 52.5), 6, "#b51f1f", 0.9)
    sh += [line((49.5, 43.5), (49.5, 47.5), YEL, 0.5)]
    sh += pile((49.5, 63), 4, 1.4)
    sh += tag((30, 47.5), "Adelphel", 2.3) + tag((69, 52.5), "Grinnaux", 2.3)
    sh += tag((49.5, 37), "tether", 2.1, YEL)
    return board(sh, wm=False, boss=[[49.5, 47.5], [49.5, 52.5]], bossSize=5, roles=roles(MT=(49.5, 43.5), ST=(49.5, 63)))


VOID_S = [(5, 77), (24, 94), (75, 94), (95, 77)]
VOID_N = [(24, 5), (75, 5), (4, 24), (96, 24)]


def voids(pts):
    out = []
    for c in pts:
        out += [dot(c, 4.0, "#24123a", 0.95)]
    return out


def hyper(n):
    """Hyperdimensional Slash: 1 = marks south / stack north, 2 = marks north / stack south."""
    c = (50, 50)
    marked = [P1_WM[k] for k in ("D", "3", "C", "2")] if n == 1 else [P1_WM[k] for k in ("4", "A", "1", "B")]
    stack = (49.5, 38) if n == 1 else (49.5, 62)
    sh = [cone(c, 0 if n == 1 else 180, 90, 75, PINK, 0.3)]
    for p in marked:
        sh.append(beam(c, off(c, ang(c, p), 75), 9, YEL, 0.28))
    sh += voids(VOID_S if n == 1 else VOID_S + VOID_N)
    sh += bossring(c, 7)
    for p in marked:
        sh += anon(p, 2.1) + down_tri((p[0], p[1] - 4.2), 1.6)
    for i, dx in enumerate((-1.6, 0, 1.6, 0.8)):
        sh += anon((stack[0] + dx, stack[1] + (i % 2) * 1.2 - 0.6), 2.1)
    return board(sh)


def hyper3():
    sh = voids(VOID_S + VOID_N)
    sh += [line((50, 0), (0, 50), YEL, 0.5), arrow((6, 44), (0.6, 49.4), YEL, 0.5), line((24, 23), (27, 27), YEL, 0.5)]
    sh += bossring((50, 50), 7) + bossring((-1, 52), 7)
    sh += tag((11, 44), "Adelphel", 2.2) + tag((50, 40), "Grinnaux", 2.2)
    sh += curve([(46, 66), (36, 69), (24, 71.5)], "#ffffff", 0.5) + xmark((21, 72), 1.5)
    return board(sh, roles=roles(MT=(49, 66)))


def hyper4():
    sh = voids(VOID_S + VOID_N)
    for c in ((50, 8), (24, 25), (50, 30), (35, 47), (64, 47), (8, 50), (91, 50), (50, 62), (75, 75), (50, 90), (64, 62)):
        sh.append(circle(c, 19, PINK, 0.32, 0.1))
    sh += [arrow((50, 0), (0.5, 49.5), YEL, 0.45), arrow((0, 50), (99.5, 50), YEL, 0.45), arrow((100, 50), (50.5, 99.5), YEL, 0.45),
           line((50, 0), (50, 100), YEL, 0.45)]
    for a, b in (((23, 27), (27, 23)), ((33, 48), (33, 52)), ((67, 48), (67, 52)), ((48, 33), (52, 33)), ((48, 67), (52, 67)), ((73, 77), (77, 73))):
        sh.append(line(a, b, YEL, 0.45))
    sh += bossring((35, 63), 7)
    return board(sh, roles=roles(MT=(19, 75)))


def hyper5():
    sh = voids(VOID_S + VOID_N)
    sh += [circle((17, 51), 15, PINK, 0.35)]
    sh += bossring((17, 51), 7) + bossring((40, 62), 7)
    sh += [arrow((19, 70), (17.5, 56), "#ffffff", 0.5)]
    sh += tag((17, 40), "Adelphel", 2.2) + tag((40, 73), "Grinnaux", 2.2)
    return board(sh, roles=roles(MT=(19, 73), ST=(17, 51)))


PS_POS = {"D1": (37, 38), "D2": (37, 50), "D3": (37, 62), "T1": (50, 38), "H1": (50, 62), "T2": (63, 38), "D4": (63, 50), "H2": (63, 62)}
PS_SYM = {"D1": "t", "D2": "o", "D3": "s", "T1": "x", "H1": "x", "T2": "s", "D4": "o", "H2": "t"}


def ps1():
    sh = bossring((50, 50), 7)
    for k, p in PS_POS.items():
        sh += gen(p, k[0], 4.4) + ps_sym((p[0], p[1] - 5.2), PS_SYM[k], 1.4)
    sh += tag((50, 76), "West  D1 > D2 > D3 > D4  East", 2.4)
    return board(sh)


def ps2():
    c = (50, 50)
    sh = []
    out = {"D1": 315, "T1": 0, "T2": 45, "D2": 270, "D4": 90, "D3": 225, "H1": 180, "H2": 135}
    for k, a in out.items():
        p = off(c, a, 42 if a % 90 == 0 else 44)
        sh.append(circle(p, 21, PINK, 0.28, 0.1))
    for k, a in out.items():
        p = off(c, a, 42 if a % 90 == 0 else 44)
        sh.append(arrow(off(c, a, 8), off(c, a, 36), "#ffffff", 0.45))
        sh += gen(p, k[0], 4.4)
    sh += bossring(c, 7)
    return board(sh)


# Pure of Heart: Charibert west, the party in the lit ring
RING_C, RING_R = (21.5, 47), 21
BOSS_C = (22, 62)


def poh_board(sh, roles_, strict_roles=None):
    base = [rect((50, 50), 100, 100, 0, "#1c1828", 0.75, 0.01), circle(RING_C, RING_R, "#355a50", 0.95, 0.1),
            ring(RING_C, RING_R, "#9ad0c0", 0.4, 0.7)]
    base += bossring(BOSS_C, 10, "#d62b2b", 1.0)
    base += tag((22, 77.5), "Charibert", 2.2)
    return board(base + sh, wm=False, roles=roles_, iconSize=5.4)


def bright(p):
    a = 228 if p[0] < BOSS_C[0] else 132
    return [cone(BOSS_C, a, 30, 42, PINK, 0.42)]


def stackpos(c, seats):
    offs = [(-1.6, -1.2), (1.6, -1.2), (0, 0.4), (-1.6, 1.8), (1.6, 1.8), (0, 3.2)]
    return {s: (c[0] + offs[i][0], c[1] + offs[i][1]) for i, s in enumerate(seats)}


def poh(n):
    S = (22, 49.5)
    if n == 1:
        bait = {"H2": (17, 69.5), "H1": (27.5, 69.5)}
        st = stackpos(S, ["ST", "D1", "D2", "D3", "D4", "MT"])
        sh = []
        extra = {}
    elif n == 2:
        bait = {"D2": (17, 69.5), "D1": (27.5, 69.5)}
        st = stackpos(S, ["ST", "D3", "D4", "MT"])
        extra = {"H1": (37, 57.5), "H2": (38.5, 60)}
        sh = [arrow((22, 53), (17.5, 65), "#ffffff", 0.4), arrow((22, 53), (26.5, 65), "#ffffff", 0.4), arrow((25, 53), (35, 57), "#ffffff", 0.4)]
    elif n == 3:
        bait = {"D4": (17, 70.5), "D3": (27.5, 70.5)}
        st = stackpos(S, ["ST", "H2", "H1", "MT"])
        extra = {"D1": (11, 59), "D2": (12, 61)}
        sh = puddle((40, 56), 4.5) + [arrow((36.5, 55), (26, 50.5), "#ffffff", 0.4), arrow((19, 54), (13, 58), "#ffffff", 0.4)]
    elif n == 4:
        bait = {"ST": (17, 70.5), "MT": (27.5, 70.5)}
        st = stackpos(S, ["D2", "H2", "D1", "H1"])
        extra = {"D3": (37, 56), "D4": (38, 58)}
        sh = puddle((6, 60), 4.5) + [arrow((9, 57), (18, 51), "#ffffff", 0.4), arrow((25, 53), (35, 55.5), "#ffffff", 0.4)]
    elif n == 5:
        bait = {}
        st = stackpos(S, ["D2", "H2", "D1", "D4", "D3", "H1"])
        extra = {"MT": (10, 63), "ST": (11, 65)}
        sh = puddle((40, 57), 4.5) + [arrow((36.5, 55.5), (26, 51), "#ffffff", 0.4), arrow((21, 67), (13.5, 65), "#ffffff", 0.4)]
    else:
        bait = {}
        st = stackpos(S, ["D2", "H2", "D1", "D4", "D3", "H1", "ST", "MT"][:6])
        st.update({"ST": (20.4, 52.5), "MT": (23.6, 52.5)})
        extra = {}
        sh = puddle((10, 62), 4.5) + [arrow((12.5, 59), (19, 53.5), "#ffffff", 0.4)]
    cones = []
    for p in bait.values():
        cones += bright(p)
    marks = []
    for p in bait.values():
        marks += [dot((p[0] + 2.4, p[1] - 2.6), 1.0, "#ffd23f")]
    rl = {**st, **bait, **extra}
    return poh_board(cones + sh + marks, roles(**rl))
