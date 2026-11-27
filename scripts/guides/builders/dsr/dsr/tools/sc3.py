"""P3 Nidhogg: close-up boards (about 2 % of the frame per yalm, Nidhogg in the middle), redrawn from Tuufless's 03/ pictures."""
from base import *

TILE = "#24282b"
BOSS = (49, 49)
# the inner waymarks at this zoom: the 4x towers sit on 1-4
Z = 2.0
P3_WM = {"A": [49, 49 - 13 * Z], "B": [49 + 13 * Z, 49], "C": [49, 49 + 13 * Z], "D": [49 - 13 * Z, 49],
         "1": [49 + 9.19 * Z, 49 - 9.19 * Z], "2": [49 + 9.19 * Z, 49 + 9.19 * Z], "3": [49 - 9.19 * Z, 49 + 9.19 * Z], "4": [49 - 9.19 * Z, 49 - 9.19 * Z]}


def board(sh, wm=False, rl=None, **kw):
    base = []
    for x in range(0, 101, 4):
        base.append(line((x, 0), (x, 100), "#3a4044", 0.12, 0.6))
        base.append(line((0, x), (100, x), "#3a4044", 0.12, 0.6))
    s = {"frame": [1, 1], "bg": TILE, "arena": None, "waymarks": dict(P3_WM) if wm else None, "markSize": 5.0,
         "iconSize": 5.6, "bossSize": 6.5}
    s["shapes"] = base + list(sh)
    if rl:
        s["roles"] = roles(**rl)
    s.update(kw)
    return s


def nring(c=BOSS, r=17, full=False):
    """Nidhogg's target ring (open at the back) with the facing arrow north."""
    out = []
    if full:
        out.append(ring(c, r, "#d62b2b", 0.9, 0.9))
    else:
        pts = arc_pts(c, r, -150, 150, 20)
        out += [line(pts[i], pts[i + 1], "#d62b2b", 0.9, 0.9) for i in range(20)]
    out += [cone(off(c, 0, r + 1.8), 180, 50, 2.6, "#d62b2b", 0.95, 0.1)]
    return out


ARROW = {"u": "↑", "d": "↓", "x": ""}


def p(c, n, a="x"):
    """A player by debuff: n = 1/2/3 in line, a = up (Spineshatter) / down (Elusive) / x (High Jump)."""
    col = {1: "#5aa8ff", 2: "#ff6ad5", 3: "#5aa8ff"}[n]
    lab = f"{n}{ARROW[a]}"
    return anon(c, 2.6) + tag((c[0] + 5.6, c[1] - 0.2), lab, 3.0, col)


def pile(c, labels):
    out = []
    for i, (n, a) in enumerate(labels):
        out += anon((c[0] - 1.2 + i * 0.8, c[1] - 1.2 + i * 0.8), 2.6)
    s = " ".join(f"{n}{ARROW[a]}" for n, a in labels)
    out += tag((c[0] + 4 + 0.6 * 2.7 * len(s) / 2, c[1]), s, 2.7)
    return out


def dive(c, r=11):
    return [circle(c, r, PINK, 0.35)]


def ntower(c, r=11):
    return tower(c, r, "#e8c44a", 0.25)


def clone(c, d):
    """A Nidhogg clone (the source's white crescent), opening the way d."""
    pts = arc_pts(c, 3.4, d + 40, d + 320, 10)
    return [line(pts[i], pts[i + 1], "#e8e8e8", 0.7, 0.95) for i in range(10)]


def geir(c, d, w=15, ln=60):
    return [beam(c, off(c, d, ln), w, PINK, 0.32)]


def inout(out_first):
    """Gnash (out) / Lash (in) with the boss as centre."""
    if out_first:
        return [circle(BOSS, 17, "#e02424", 0.35)]
    return [rect((50, 50), 100, 100, 0, "#a01a1a", 0.32, 0.01), circle(BOSS, 17, TILE, 0.85, 0.01)]


TW, TE, TS = (31, 50), (66, 50), (48, 66)


def nid(n):
    sh = []
    if n in (1, 2):
        arr = n == 2
        sh += nring()
        sh += p((37, 32), 2, "u" if arr else "x") + p((62, 32), 2, "d" if arr else "x")
        sh += p((33, 49), 1, "u" if arr else "x") + p((33, 56), 3, "u" if arr else "x")
        sh += p((66, 49), 1, "d" if arr else "x") + p((66, 56), 3, "d" if arr else "x")
        sh += p((49, 65), 1, "x") + p((49, 72), 3, "x")
        return board(sh)
    if n == 3:
        sh += dive((49, 34), 11) + dive((33, 51)) + dive((66, 51)) + dive((49, 66))
        sh += nring()
        sh += pile((49, 34), [(2, "u"), (2, "d"), (3, "u"), (3, "d")])
        sh += p((33, 51), 1, "u") + p((66, 51), 1, "d") + p((49, 66), 1, "x")
        return board(sh)
    if n == 4:
        sh += inout(True) + ntower(TW) + ntower(TE) + ntower(TS)
        sh += nring()
        sh += curve([(31, 44), (34, 34), (42, 29)]) + curve([(68, 44), (64, 34), (56, 29)]) + [arrow((49, 40), (49, 60)), arrow((49, 60), (49, 40))]
        sh += pile((49, 27), [(2, "u"), (2, "d"), (1, "u"), (1, "d"), (1, "x")])
        sh += p((26, 51), 3, "u") + p((72, 50), 3, "d") + p((48, 72), 3, "x")
        return board(sh)
    if n == 5:
        sh += inout(False) + ntower((33, 50)) + ntower((65, 50)) + ntower((49, 66))
        sh += nring()
        sh += pile((49, 37), [(2, "u"), (2, "d"), (1, "u"), (1, "d"), (1, "x")])
        sh += p((39, 51), 3, "u") + p((61, 51), 3, "d") + p((49, 66), 3, "x")
        return board(sh)
    if n == 6:
        sh += dive((34, 28)) + dive((64, 28))
        sh += nring()
        sh += clone((33, 51), 270) + clone((66, 51), 90) + clone((49, 68), 180)
        sh += pile((49, 33), [(1, "u"), (1, "d"), (1, "x")])
        sh += p((34, 29), 2, "u") + p((64, 29), 2, "d")
        sh += p((26, 51), 3, "u") + p((73, 49), 3, "d") + p((50, 75), 3, "x")
        return board(sh)
    if n == 7:
        sh += ntower((34, 28)) + ntower((64, 28))
        sh += geir((31, 51), 270, 15) + geir((66, 51), 90, 15) + geir((49, 66), 180, 15)
        sh += nring()
        sh += clone((31, 51), 270) + clone((66, 51), 90) + clone((49, 66), 180)
        sh += [arrow((38, 33), (45, 35)), arrow((60, 33), (53, 35)), arrow((45, 35), (38, 33)), arrow((53, 35), (60, 33))]
        sh += pile((49, 35), [(2, "u"), (2, "d"), (1, "x")])
        sh += p((32, 29), 1, "u") + p((64, 29), 1, "d")
        sh += p((39, 51), 3, "u") + p((61, 51), 3, "d") + p((49, 58), 3, "x")
        return board(sh)
    if n == 8:
        sh += nring()
        sh += clone((37, 33), 315) + clone((63, 33), 45)
        sh += pile((49, 34), [(2, "u"), (2, "d"), (1, "x")])
        sh += p((31, 26), 1, "u") + p((68, 26), 1, "d")
        sh += p((36, 50), 3, "u") + p((64, 50), 3, "d") + p((49, 67), 3, "x")
        return board(sh)
    if n == 9:
        sh += geir((37, 33), 315, 15) + geir((63, 33), 45, 15)
        sh += dive((49, 35), 14) + dive((33, 52)) + dive((66, 52)) + dive((49, 68))
        sh += nring()
        sh += clone((37, 33), 315) + clone((63, 33), 45)
        sh += curve([(31, 30), (36, 27), (44, 32)]) + curve([(68, 30), (63, 27), (55, 32)])
        sh += pile((49, 35), [(2, "u"), (2, "d"), (1, "u"), (1, "d"), (1, "x")])
        sh += p((33, 52), 3, "u") + p((66, 52), 3, "d") + p((49, 68), 3, "x")
        return board(sh)
    if n == 10:
        sh += inout(False) + ntower((32, 50)) + ntower((64, 50)) + ntower((49, 67))
        sh += nring()
        sh += [arrow((37, 46), (44, 40)), arrow((61, 46), (54, 40)), arrow((49, 42), (49, 60)), arrow((49, 60), (49, 42))]
        sh += pile((49, 38), [(1, "u"), (1, "d"), (3, "u"), (3, "d"), (3, "x")])
        sh += p((36, 51), 2, "u") + p((62, 51), 2, "d") + p((49, 67), 1, "x")
        return board(sh)
    if n == 11:
        sh += inout(True) + ntower((32, 50)) + ntower((66, 50)) + ntower((49, 67))
        sh += nring()
        sh += pile((49, 31), [(1, "u"), (1, "d"), (3, "u"), (3, "d"), (3, "x")])
        sh += p((27, 51), 2, "u") + p((72, 51), 2, "d") + p((49, 71), 1, "x")
        return board(sh)
    if n == 12:
        sh += nring()
        sh += clone((33, 51), 270) + clone((66, 51), 90) + clone((49, 67), 180)
        sh += pile((49, 31), [(1, "u"), (1, "d"), (3, "u"), (3, "d"), (3, "x")])
        sh += p((25, 50), 2, "u") + p((74, 50), 2, "d") + p((49, 77), 1, "x")
        return board(sh)
    if n == 13:
        sh += geir((33, 51), 270, 15) + geir((66, 51), 90, 15) + geir((49, 67), 180, 15)
        sh += [beam((4, 3), (52, 55), 9, PINK, 0.32)]
        sh += nring()
        sh += clone((33, 51), 270) + clone((66, 51), 90) + clone((49, 67), 180)
        sh += pile((51, 33), [(1, "u"), (1, "d"), (3, "u"), (3, "d"), (3, "x")])
        sh += p((64, 37), 2, "d") + p((33, 67), 2, "u") + p((64, 67), 1, "x")
        return board(sh, rl=dict(MT=(33, 31)))
    # 14: Drachenlance at a random player
    sh += [cone(BOSS, 40, 55, 30, PINK, 0.4)] + nring()
    return board(sh, rl=dict(D3=(28, 24), MT=(33, 31), D4=(73, 23), ST=(74, 49), D1=(35, 63), D2=(63, 63), H1=(28, 72), H2=(72, 72)))


T4 = {"NW": (31, 29), "NE": (67, 29), "SW": (31, 69), "SE": (67, 69)}


def towers4(pips=None, rl=None, arrows=()):
    sh = []
    for k, c in T4.items():
        sh += tower(c, 11, "#e8c44a", 0.25)
    if pips:
        for k, n in pips.items():
            c = T4[k]
            dx = -11 if k[1] == "W" else 11
            dy = -11 if k[0] == "N" else 11
            sh.append(text((c[0] + dx, c[1] + dy), str(n), 6, "#ffffff"))
    for a, b in arrows:
        sh.append(arrow(a, b, "#ffd0d0", 0.7))
    return board(sh, wm=True, rl=rl, iconSize=5.6)


START4 = dict(D3=(28, 26), MT=(36, 35), D4=(70, 26), ST=(62, 35), D1=(36, 63), H1=(28, 72), D2=(62, 63), H2=(70, 72))


def t4(n):
    if n == 0:
        return towers4(None, START4)
    if n == 1:
        rl = dict(D3=(31, 29), MT=(62, 27), D4=(71, 27), ST=(62, 35), D1=(36, 63), H1=(28, 72), D2=(36, 72), H2=(70, 72))
        return towers4({"NW": 1, "NE": 3, "SW": 3, "SE": 1}, rl, [((44, 29), (54, 29)), ((54, 69), (44, 69))])
    if n == 2:
        rl = dict(D3=(31, 29), MT=(62, 27), D4=(71, 27), ST=(62, 35), D2=(71, 35), D1=(36, 63), H1=(28, 72), H2=(70, 72))
        return towers4({"NW": 1, "NE": 4, "SW": 2, "SE": 1}, rl, [((44, 29), (54, 29)), ((67, 56), (67, 44))])
    rl = dict(D3=(27, 26), D2=(35, 26), MT=(35, 35), D4=(70, 26), ST=(62, 35), D1=(36, 63), H1=(28, 72), H2=(70, 72))
    return towers4({"NW": 3, "NE": 2, "SW": 2, "SE": 1}, rl, [((59, 57), (40, 40))])


def soul(n):
    sh = []
    CL = {"NW": (31, 35), "NE": (68, 35), "SW": (31, 71), "SE": (68, 71)}
    if n == 1:
        sh += nring((49, 53), 18, True)
        for k, c in CL.items():
            sh += clone(c, {"NW": 315, "NE": 45, "SW": 225, "SE": 135}[k])
        sh += [line((33, 31), (72, 25), YEL, 0.4), line((50, 57), (49, 73), YEL, 0.4)]
        return board(sh, rl=dict(D3=(27, 25), D4=(72, 25), MT=(37, 37), ST=(62, 37), H1=(27, 77), D2=(49, 73), H2=(72, 77)))
    sh += geir(CL["NE"], 45, 15, 70) + geir(CL["SW"], 225, 15, 70) + geir(CL["SE"], 135, 15, 70)
    sh += [circle((49, 44), 11, PINK, 0.45)]
    sh += nring((49, 53), 18, True)
    for k, c in CL.items():
        sh += clone(c, {"NW": 315, "NE": 45, "SW": 225, "SE": 135}[k])
    sh += [line((33, 33), (48, 43), YEL, 0.4), line((49, 44), (49, 53), YEL, 0.4)]
    return board(sh, rl=dict(ST=(48, 42), MT=(50, 45), D3=(27, 50), D4=(73, 50), H1=(47.5, 72), D1=(48.5, 73), D2=(49.5, 74), H2=(50.5, 75)))
