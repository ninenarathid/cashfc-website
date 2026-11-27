"""P6 Double Dragons: Nidhogg west (dark ring), Hraesvelgr east (pale ring), redrawn from Tuufless's 06/ pictures."""
from base import *
from sc3 import board as tiles

ARENA_OUT = "#b07a64"
NID, HRA = "#5a3a8a", "#8ac8d0"
FIRE_T, ICE_T = "#e8b040", "#58d6e0"
MAG = "#d040c0"


def dragons(nid=(-2, 50), hra=(100, 50), nr=40, hr=40, hface=270, nface=90, show_n=True, show_h=True):
    out = []
    if show_n:
        out += [ring(nid, nr, NID, 1.4, 0.75), ring(nid, nr - 2, "#a03060", 0.3, 0.6)]
        out += [cone(off(nid, nface, nr + 1), nface + 180, 50, 4, NID, 0.95, 0.1)]
    if show_h:
        out += [ring(hra, hr, HRA, 1.4, 0.75), ring(hra, hr - 2, "#e0a0b0", 0.3, 0.6)]
        out += [cone(off(hra, hface, hr - 1), hface + 180, 50, 4, HRA, 0.95, 0.1)]
    return out


def close(sh, rl=None, **kw):
    return tiles(list(sh), rl=rl, **kw)


def wide(sh, rl=None):
    """The whole arena (Wyrmsbreath): the floor circle with the outside in tan."""
    base = [donut((50, 50), 120, 46, ARENA_OUT, 0.85)]
    return tiles(base + list(sh), rl=rl)


def teth(a, b, col):
    return line(a, b, col, 0.45, 0.95)


def vow(c, r=12):
    return [circle(c, r, MAG, 0.5)]


def eyeset(c, lab, lit=False):
    out = []
    for d in ((-6, -6), (7, -1.5), (-4.5, 7)):
        p = (c[0] + d[0], c[1] + d[1])
        out += [dot(p, 5.2, "#f0b0b0" if lit else "#b01818"), ring(p, 5.2, "#ffffff" if lit else "#ff8a8a", 0.3, 0.9)]
    out.append(text((c[0] + 3, c[1] + 1.5), lab, 6, "#ffffff"))
    return out


def akh(c, r=15):
    return [circle(c, r, "#e02424", 0.42)]


def band(x0, x1, y0, y1, col=PINK, o=0.35):
    return [rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, y1 - y0, 0, col, o, 0.05)]


def spreadp(c):
    return anon(c, 2.4) + [dot((c[0] + 2.8, c[1] - 2.8), 1.2, "#b040c0")]


def stackp(c):
    return anon(c, 2.4) + [dot((c[0] + 2.8, c[1] - 2.8), 1.2, "#5080e0")]


# ---------------------------------------------------------------- Wyrmsbreath 1
WB1 = dict(MT=(27, 19), ST=(76, 18), D4=(49, 68), D3=(49, 75), D1=(34, 83), D2=(65, 83), H1=(36, 91), H2=(64, 91))


def wb1(n):
    sh = dragons(nid=(-2, 50), hra=(100, 50), nr=40, hr=40)
    if n == 1:
        return wide(sh, WB1)
    if n == 2:
        sh += [cone((0, 50), 90, 30, 105, PINK, 0.3), cone((100, 50), 270, 30, 105, "#9ad8e0", 0.3)]
        sh += xmark((49, 68), 1.8, "#3ee05a") + xmark((36, 91), 1.8, "#3ee05a") + xmark((63, 91), 1.8, "#3ee05a")
        sh += [rect((44, 75), 3, 3, 0, "#ffffff", 0.2, 0.15)]
        return wide(sh)
    if n == 3:
        for k in ("D1", "H1", "H2"):
            sh.append(teth((0, 50), WB1[k], FIRE_T))
        for k in ("D4", "D3", "D2"):
            sh.append(teth((100, 50), WB1[k], ICE_T))
        sh += [arrow((37, 81), (46, 77), "#ffffff", 0.4), arrow((46, 77), (37, 81), "#ffffff", 0.4)]
        return wide(sh, WB1)
    rl = dict(MT=(24, 19), ST=(79, 18), D4=(49, 68), D3=(50, 69.5), H1=(36, 91), D1=(37, 92.5), H2=(64, 91), D2=(65, 92.5))
    if n == 4:
        sh += [cone((0, 50), 90, 40, 100, PINK, 0.3), circle((64, 22), 30, "#f0c0e0", 0.4)]
    else:
        rl.update(MT=(48, 44), ST=(51, 42))
        sh += [circle((50, 46), 14, MAG, 0.35), circle((52, 44), 14, "#f0e0f0", 0.35)]
    for k in ("D4", "H1", "H2"):
        sh += [teth((0, 50), rl[k], FIRE_T), teth((100, 50), rl[k], ICE_T)]
    return wide(sh, rl)


def mv1():
    sh = dragons(nid=(-10, 50), hra=(105, 50), nr=48, hr=48) + vow((27, 77))
    return close(sh, dict(D3=(27, 77), D1=(32, 57), D2=(71, 57), D4=(75, 80), MT=(45, 41), H1=(49, 38), ST=(54, 59), H2=(50, 62)))


def akh_afah():
    sh = dragons(nid=(-6, 50), hra=(105, 50), nr=42, hr=46) + [circle((46, 37), 10, "#f0c8c0", 0.45), circle((51, 63), 10, "#f0c8c0", 0.45)]
    rl = dict(D3=(48, 31), D1=(43, 35), H1=(49, 36), MT=(45, 40), ST=(54, 59), H2=(50, 63), D2=(55, 64), D4=(52, 68))
    return close(sh, rl)


def hw1(n):
    sh = []
    if n == 1:
        sh += band(0, 50, 0, 100, "#c84848", 0.35) + band(50, 100, 50, 100, "#58b8b0", 0.3)
        sh += [circle((96, 12), 25, "#e0a0e8", 0.35), circle((96, 44), 25, "#e0a0e8", 0.35)]
        rl = dict(MT=(93, 13), ST=(93, 44), H1=(62, 15), H2=(59, 18), D1=(57, 17), D2=(60, 13), D3=(55, 16), D4=(58, 20))
    elif n == 2:
        sh += band(0, 50, 0, 100, "#c84848", 0.35) + band(50, 100, 50, 100, "#58b8b0", 0.3)
        sh += [circle((55, 7), 24, "#e0a0e8", 0.35), circle((55, 42), 24, "#e0a0e8", 0.35)]
        rl = dict(MT=(56, 6), ST=(56, 42), H1=(95, 39), H2=(92, 43), D1=(90, 41), D2=(93, 37), D3=(89, 44), D4=(96, 44))
    elif n == 3:
        sh += band(50, 100, 0, 100, "#c84848", 0.35) + band(0, 50, 0, 50, "#58b8b0", 0.3)
        sh += [circle((43, 55), 25, "#e0a0e8", 0.35), circle((43, 94), 25, "#e0a0e8", 0.35)]
        rl = dict(ST=(43, 55), MT=(43, 94), H1=(6, 70), H2=(5, 73), D1=(3, 71), D2=(8, 72), D3=(4, 75), D4=(7, 75))
    else:
        sh += band(50, 100, 0, 100, "#c84848", 0.35) + band(0, 50, 0, 50, "#58b8b0", 0.3)
        sh += [circle((0, 55), 25, "#e0a0e8", 0.35), circle((0, 94), 25, "#e0a0e8", 0.35)]
        rl = dict(ST=(5, 55), MT=(5, 94), H1=(46, 63), H2=(42, 61), D1=(44, 59), D2=(47, 60), D3=(40, 63), D4=(43, 64))
    sh += dragons(nid=(-6, 50), hra=(100, 50), nr=42, hr=42, show_n=False)
    return close(sh, rl)


def mv2():
    sh = dragons(nid=(-6, 50), hra=(100, 50), nr=42, hr=42) + vow((47, 50))
    rl = dict(MT=(47, 45), D3=(47, 51), ST=(69, 50), D1=(46, 74), H1=(43, 77), H2=(50, 77), D4=(52, 73), D2=(58, 73))
    return close(sh, rl)


def mv3():
    sh = dragons(nid=(-6, 50), hra=(100, 50), nr=42, hr=42) + vow((50, 50))
    rl = dict(MT=(47, 50), ST=(53, 50), D3=(49, 26), D1=(44, 28), H1=(50, 30), H2=(48, 69), D2=(55, 69), D4=(52, 73))
    return close(sh, rl)


def mv4():
    sh = dragons(nid=(-6, 50), hra=(100, 50), nr=42, hr=42) + vow((50, 49))
    rl = dict(ST=(48, 49), D1=(54, 49), MT=(28, 28), H1=(48, 28), D2=(43, 73), D3=(50, 73), D4=(57, 73), H2=(64, 73))
    return close(sh, rl)


def mv5():
    sh = [ring((50, 115), 50, NID, 1.4, 0.7), ring((50, 118), 40, HRA, 1.4, 0.75), cone((50, 70), 0, 50, 4, HRA, 0.95, 0.1)]
    sh += vow((48, 5))
    rl = dict(D1=(45, 5), D3=(51, 5), MT=(47, 20), H2=(52, 20), H1=(52, 24), ST=(46, 23), D2=(49, 23), D4=(50, 18))
    return close(sh, rl)


# ---------------------------------------------------------------- Wroth Flames
def markers(auto):
    """The marking schemes (a 5:2 strip): spreads west, the two stacks east."""
    sh = [ring((-2, 50), 60, NID, 1.2, 0.6), ring((115, 50), 62, HRA, 1.2, 0.7)]
    for c in ((4, 58), (18, 38), (32, 58), (46, 38)):
        sh.append(circle(c, 10, MAG, 0.45))
    for c in ((69, 55), (88, 55)):
        sh.append(circle(c, 9, "#e8e8e8", 0.4))
    for i, c in enumerate(((4, 58), (18, 38), (32, 58), (46, 38))):
        sh += spreadp(c)
        if auto:
            sh += tag((c[0], c[1] - 9), f"Attack {i + 1}", 2.0, "#ffd23f")
    labs = (("Bind 1", "Bind 2"), ("Ignore 1", "Ignore 2")) if auto else (("Bind 1", "Ignore 1"), ("Bind 2", "Ignore 2"))
    for (c, (a, b)) in zip(((69, 55), (88, 55)), labs):
        sh += stackp((c[0] - 1.6, c[1] + 1)) + anon((c[0] + 1.6, c[1] + 2.4), 2.4)
        sh += tag((c[0], c[1] - 14), a, 2.0, "#9ad0ff" if a.startswith("Bind") else "#ff9a9a")
        sh += tag((c[0], c[1] - 9.5), b, 2.0, "#9ad0ff" if b.startswith("Bind") else "#ff9a9a")
    return {"frame": [5, 2], "bg": "#24282b", "arena": None, "waymarks": None, "shapes": sh, "iconSize": 5}


CEN = (50, 50)


def wf(ex, n):
    """Wroth Flames examples: ex 1 = Hraesvelgr NE edge (party west), 2 = south edge middle, 3 = north-west edge (party east)."""
    hra = {1: ((75, -28), 180), 2: ((49, 128), 0), 3: ((24, -28), 180)}[ex]
    sets = {1: [(48, 51), (77, 20), (18, 82)], 2: [(48, 51), (18, 82), (78, 18)], 3: [(48, 51), (77, 82), (20, 20)]}[ex]
    sh = []
    path = {
        1: {1: [(49, 49), (6, 50)], 2: [(8, 51), (8, 72)], 3: [(6, 83)], 4: [(6, 80)], 5: [(5, 80), (22, 80)], 6: [(25, 80), (46, 76)], 7: [(51, 73), (51, 52)]},
        2: {1: [(49, 49), (6, 50)], 2: [(10, 50), (10, 23)], 3: [(6, 22)], 4: [(6, 22)], 5: [(5, 22), (22, 22)], 6: [(22, 22), (47, 26)], 7: [(50, 36), (50, 48)]},
        3: {1: [(50, 49), (93, 50)], 2: [(90, 50), (90, 22)], 3: [(93, 20)], 4: [(93, 20)], 5: [(94, 22), (77, 22)], 6: [(76, 25), (52, 25)], 7: [(48, 37), (48, 48)]},
    }[ex][n]
    cauter = {1: (50, 100), 2: (25, 75), 3: (0, 50)}[ex]
    if n == 4:
        sh += band(cauter[0], cauter[1], 0, 100, "#58b8b0", 0.32)
    # the eye explosions: each set lights its rows and columns
    if n >= 5:
        c = sets[n - 5]
        sh += band(c[0] - 21, c[0] + 21, 0, 100, PINK, 0.32) + band(0, 100, c[1] - 21, c[1] + 21, PINK, 0.32)
    # Akh Morn puddles so far
    pud = {4: 1, 5: 2, 6: 4, 7: 4}.get(n, 0)
    if pud:
        trail = {1: [(6, 80), (18, 80), (32, 80), (46, 76)], 2: [(6, 22), (19, 22), (33, 23), (46, 26)], 3: [(93, 20), (80, 22), (66, 24), (52, 25)]}[ex]
        for p in trail[:pud]:
            sh += akh(p, 14)
    shown = {1: [0], 2: [0, 1], 3: [0, 1, 2], 4: [0, 1, 2], 5: [0, 1, 2], 6: [1, 2], 7: [2]}[n]
    for i in shown:
        sh += eyeset(sets[i], str(i + 1), n >= 4)
    if n in (1, 2, 3, 7):
        sh += dragons(nid=(-14, 50), hra=hra[0] if n < 7 else (112, 50), nr=48, hr=40 if n < 7 else 50,
                      hface=hra[1] if n < 7 else 270, show_h=True)
    else:
        sh += dragons(nid=(-14, 50), nr=48, show_h=False)
    if len(path) == 2:
        sh += curve([path[0], path[1]], "#ffffff", 0.5)
    rl = dict(MT=path[1] if n >= 5 else path[0])
    return close(sh, rl)


def wf_resolve(tail):
    """⑧: Hot Wing (top + bottom hit, party on the E/W line) or Hot Tail (the middle band hit, party north)."""
    sh = dragons(nid=(-14, 50), hra=(112, 50), nr=48, hr=50)
    if tail:
        sh += band(0, 100, 28, 70, PINK, 0.35)
        S = [(17, 12), (38, 12), (6, 25), (28, 25)]
        T = [(67, 22), (89, 22)]
        sh += curve([(47, 62), (44, 45), (40, 30)]) + curve([(50, 62), (53, 40), (58, 26)])
    else:
        sh += band(0, 100, 0, 41, PINK, 0.35) + band(0, 100, 60, 100, PINK, 0.35)
        S = [(5, 57), (18, 47), (32, 57), (46, 47)]
        T = [(69, 54), (88, 54)]
        sh += curve([(49, 64), (44, 57), (36, 56)]) + curve([(50, 64), (55, 56), (61, 55)])
    for p in [(10, 80), (25, 82), (38, 80), (50, 75)]:
        sh += akh(p, 13)
    for c in S:
        sh.append(circle(c, 11, MAG, 0.4))
    for c in T:
        sh.append(circle(c, 8.5, "#e8e8e8", 0.4))
    for c in S:
        sh += spreadp(c)
    for c in T:
        sh += stackp((c[0] - 1.5, c[1])) + anon((c[0] + 1.5, c[1] + 2), 2.4)
    return close(sh)


# ---------------------------------------------------------------- second half
def hw2(tail):
    sh = []
    if not tail:
        sh += band(0, 100, 0, 42, PINK, 0.32) + band(0, 100, 58, 100, "#c84848", 0.3) + band(0, 100, 40, 50, "#58b8b0", 0.25)
        sh += [circle((4, 57), 23, "#e0a0e8", 0.35), circle((41, 57), 23, "#e0a0e8", 0.35)]
        rl = dict(MT=(4, 57), ST=(41, 57), H2=(89, 57), H1=(96, 57), D1=(86, 56), D2=(92, 58), D3=(87, 58), D4=(94, 55))
    else:
        sh += band(0, 100, 28, 66, "#c84848", 0.32) + band(0, 100, 66, 100, "#58b8b0", 0.28)
        sh += [circle((60, 21), 24, "#e0a0e8", 0.35), circle((94, 21), 24, "#e0a0e8", 0.35)]
        rl = dict(ST=(60, 21), MT=(94, 21), H2=(14, 18), H1=(21, 18), D1=(10, 17), D2=(17, 19), D3=(12, 20), D4=(19, 16))
    sh += dragons(nid=(-14, 50), hra=(112, 50), nr=48, hr=50)
    return close(sh, rl)


WB2 = dict(D1=(18, 22), D2=(32, 12), H1=(49, 8), H2=(63, 10), D4=(78, 21), D3=(60, 93))


def wb2(both):
    sh = dragons(nid=(-2, 50), hra=(100, 50), nr=40, hr=40)
    rl = dict(WB2)
    if not both:
        sh += [cone((100, 50), 270, 40, 100, "#9ad8e0", 0.25), circle((20, 77), 28, "#f0c0e0", 0.35)]
        rl.update(MT=(18, 77), ST=(80, 77))
    else:
        rl.update(MT=(49, 53), ST=(51, 55), D3=(50, 93))
        sh += [circle((50, 55), 15, MAG, 0.3), circle((52, 54), 15, "#f0e0f0", 0.35)]
    for k in ("H2", "D4", "D3"):
        sh.append(teth((0, 50), rl[k], FIRE_T))
    for k in ("D1", "D2", "H1"):
        sh.append(teth((100, 50), rl[k], ICE_T))
    return wide(sh, rl)


def wb2_pos():
    """The north edge close up (5:2): tethers must not cross the centre of the inner markers."""
    sh = [donut((50, 130), 200, 128, ARENA_OUT, 0.85)]
    P = [(12, 62), (29, 28), (50, 12), (70, 28), (87, 62)]
    for p in P[:3]:
        sh.append(line(p, (100, 140), ICE_T, 0.4))
    for p in P[3:]:
        sh.append(line(p, (-20, 140), FIRE_T, 0.4))
    sh.append(line(P[2], (-20, 140), FIRE_T, 0.4))
    sh += [rect((29, 73), 4, 9, 0, "#a050e0", 0.6, 0.1), rect((70, 73), 4, 9, 0, "#e070b0", 0.6, 0.1), circle((50, 52), 2.4, "#e070b0", 0.6)]
    for p in P:
        sh += anon(p, 2.2)
    return {"frame": [5, 2], "bg": "#24282b", "arena": None, "waymarks": None, "shapes": sh}


def cauterize():
    sh = band(0, 50, 0, 100, "#c84848", 0.35) + band(50, 100, 0, 100, "#58b8b0", 0.3)
    sh += [ring((25, -25), 36, NID, 1.4, 0.75), cone((25, 11), 0, 50, 4, NID, 0.95, 0.1),
           ring((75, -25), 36, HRA, 1.4, 0.75), cone((75, 11), 0, 50, 4, HRA, 0.95, 0.1)]
    rl = dict(MT=(32, 6), D2=(25, 20), D3=(36, 23), D4=(32, 30), ST=(63, 7), H1=(69, 16), H2=(55, 24), D1=(62, 27))
    for k in ("D2", "D3", "D4"):
        sh += tag((rl[k][0] + 3.4, rl[k][1] - 3.2), "ice", 1.8, "#9ae8ff", "#103040")
    for k in ("H1", "H2", "D1"):
        sh += tag((rl[k][0] + 3.4, rl[k][1] - 3.2), "fire", 1.8, "#ffc070", "#401808")
    return close(sh, rl)
