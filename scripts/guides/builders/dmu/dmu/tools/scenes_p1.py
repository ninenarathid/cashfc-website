"""P1 (Kefka) scenes, each redrawn from kanatan.info's P1 picture named in its function (dl/img/p1-NN)."""
from basedmu import *

ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]


def statue(c):
    """The Statue of the gods at the north edge (kanatan draws it as a small teal figure)."""
    return [rect(c, 7, 3.4, 0, "#5fb7b0", 0.95, 0.2), dot((c[0], c[1] - 2.2), 1.6, "#5fb7b0")]


def trapmark(c):
    """The purple trap debuff kanatan draws over its holder."""
    return [rect(c, 3.4, 3.4, 45, "#8e3fd0", 0.95, 0.2), dot(c, 0.9, "#f3d8ff")]


def arrowtile(c, d, s=5.2, col="#e9a347"):
    """An arrow floor (the arrow drawn on the ground): d = up / down / left / right."""
    a = {"up": 0, "right": 90, "down": 180, "left": 270}[d]
    tip = off(c, a, s * 0.5)
    tail = off(c, a + 180, s * 0.5)
    neck = off(c, a, s * 0.02)
    return [band(tail, neck, s * 0.36, col, 0.9), cone(tip, a + 180, 80, s * 0.55, col, 0.95)]


def kbring(at, r):
    return [ring(at, r, "#ff8c3a", 0.9, 0.9)]


# ---------------------------------------------------------------- Statue 1 + Riddle Magic
def p1_05():
    """Firaga as stacks: TH west, DPS east, inside the safe quadrant of their half (both cases drawn)."""
    s = board(704, 728, at=(49.5, 50.5), r=49, boss=[49, 50])
    sh = [cone((49.5, 50.5), 45, 90, 49, ORANGE, 0.42), cone((49.5, 50.5), 225, 90, 49, ORANGE, 0.42)]
    for c in ((37, 41), (36, 61), (62, 40), (62, 61)):
        sh += [ring(c, 10, "#e0a040", 0.35, 0.7)] + stack(c, 9.0, 4.6, 2.2)
    s["shapes"] = sh
    s["roles"] = roles(ST=[(40, 35), (40, 59)], MT=[(35, 40), (36, 57.5)], H2=[(43, 42), (37, 64)], H1=[(37, 46), (31, 62)],
                       D1=[(56, 39), (58, 57)], D3=[(64.5, 37), (62, 66)], D2=[(60, 44), (55, 63)], D4=[(67, 43), (65, 57)])
    return s


def p1_06():
    """Firaga as spreads: each role has a spot in the safe quadrant of its half (north or south case)."""
    s = board(701, 694, at=(49, 50), r=49, boss=[47, 50])
    sh = [cone((49, 50), 45, 90, 49, BLUE, 0.55), cone((49, 50), 225, 90, 49, BLUE, 0.55)]
    pos = dict(H1=[(36, 13), (35, 86)], D3=[(70, 10), (61.5, 86)], MT=[(46, 32), (46.5, 64)], D1=[(52, 32), (52, 64)],
               H2=[(15, 37), (15, 61)], D4=[(91, 33), (83, 74)], ST=[(35.5, 47.5), (35.5, 52.5)], D2=[(66, 47.5), (66, 52.5)])
    for k, ps in pos.items():
        for p in ps:
            sh += [circle(p, 8.2, RED, 0.55, 0.01)]
    s["shapes"] = sh
    s["roles"] = roles(**pos)
    return s


def p1_08():
    """Wave Cannon: everybody in one west-east line; four line AoEs from the Statue (example targets)."""
    s = board(731, 716, at=(49, 52), r=47.5, boss=[49, 50])
    st = (48, 3)
    sh = [band(st, (1, 54), 4.6, ORANGE, 0.6), band(st, (15, 58), 4.6, ORANGE, 0.6), band(st, (66, 57), 4.6, ORANGE, 0.6),
          band(st, (97, 52), 4.6, ORANGE, 0.6)] + statue(st)
    s["shapes"] = sh
    s["roles"] = roles(H2=(4, 51), H1=(16.5, 51), ST=(29.5, 51), MT=(42, 51), D1=(55, 51), D2=(66.5, 51), D3=(78.5, 50), D4=(90.5, 50))
    return s


def p1_09():
    """Towers at the Wave Cannon targets' feet; the four others step in (an example: ST MT D1 D3 targeted)."""
    s = board(752, 721, at=(49, 51), r=47, boss=[49, 50])
    sh = statue((49, 3))
    for c in ((5, 50), (18, 50), (65, 50), (89, 49)):
        sh += [ring(c, 4.6, "#ff6f6f", 0.8, 0.95)]
    sh += trapmark((8, 45.5)) + trapmark((68, 45.5))
    s["shapes"] = sh
    s["roles"] = roles(ST=(4, 50), MT=(17, 50), D1=(64, 50), D3=(88, 49), H2=(3, 65), H1=(16, 65), D2=(64, 65), D4=(88, 64))
    return s


def p1_11():
    """Trap: TH stack west, DPS stack east; the trap holder stands outside, the rest are knocked inward."""
    s = board(708, 728, at=(49, 51), r=48.5, boss=[48, 52])
    sh = []
    for c in ((23, 53), (83, 53)):
        sh += [ring(c, 13, "#e0a040", 0.35, 0.7)] + stack(c, 11, 5.0, 2.4)
    sh += [arrow((32, 50), (66, 50), "#ff3030", 0.8), arrow((67, 55.5), (36, 55.5), "#ff3030", 0.8)]
    sh += trapmark((20.5, 48.5)) + trapmark((85.5, 47.5))
    s["shapes"] = sh
    s["roles"] = roles(ST=(18, 53.5), MT=(28.5, 49.5), H2=(26.5, 54), H1=(28, 58.5), D1=(83, 53), D3=(71, 49.5), D2=(76.5, 54), D4=(71, 57))
    return s


# ---------------------------------------------------------------- Statue 2: Gravity + Rock
WM15 = {"A": [50, 15.5], "B": [84, 52], "C": [50, 89.5], "D": [15.5, 52], "1": [27, 30], "2": [77, 30], "3": [77, 78.5], "4": [27, 78.5]}


def p1_15():
    s = board(707, 714, at=(50, 51.5), r=47.5, wm=WM15, boss=[49, 49])
    c = (50, 73)
    sh = [circle(c, 11, PURPLE, 0.7, 0.01)] + stack(c, 11, 5.2, 2.4)
    s["shapes"] = sh
    s["roles"] = roles(MT=(45, 71), ST=(49, 70), H1=(53, 70), H2=(56, 72), D1=(45, 76), D2=(49, 76), D3=(53, 75), D4=(51, 73))
    return s


def p1_16():
    wm = {"A": [49, 16], "B": [85, 53], "C": [49, 89], "D": [14, 53], "1": [26, 31], "2": [74.5, 31], "3": [74.5, 77.5], "4": [26, 77.5]}
    s = board(707, 714, at=(49.5, 52), r=48.5, wm=wm)
    pz = (49, 70)
    sh = [circle(pz, 11, "#6a2bb0", 0.85, 0.01)] + statue((49, 3))
    spots = {"D1": (24, 52), "D2": (71, 52), "D3": (19, 85), "D4": (80, 85)}
    for p in spots.values():
        sh += [circle(p, 8.3, ORANGE, 0.6, 0.01), arrow(pz, (pz[0] + (p[0] - pz[0]) * 0.86, pz[1] + (p[1] - pz[1]) * 0.86), "#ff3030", 0.55)]
    sh += [arrow(pz, (49, 38), "#ff3030", 0.55)]
    s["shapes"] = sh
    s["roles"] = roles(**spots, MT=(45, 32), ST=(53, 32), H1=(45, 36), H2=(53, 36))
    return s


def p1_17():
    wm = {"A": [44, 10], "1": [23, 24], "2": [70, 24], "B": [79, 45], "3": [70, 70], "C": [44, 82], "4": [23, 70], "D": [12, 45]}
    s = board(761, 678, at=(44.5, 47.5), r=42.5, wm=wm, boss=[44, 48])
    sh = [cone((47, 47), 0, 90, 60, BLUE, 0.6)] + statue((44, 9))
    s["shapes"] = sh
    s["roles"] = roles(ST=(42, 32), MT=(59, 43), H1=(62, 42), H2=(65, 43), D1=(59, 47), D2=(62, 47), D3=(65, 47), D4=(62, 45))
    return s


def p1_19():
    wm = {"A": [49, 15], "1": [26, 28], "2": [74, 28], "D": [14, 48], "B": [85, 48], "4": [26, 70], "3": [74, 70], "C": [49, 86]}
    s = board(706, 721, at=(49.5, 51), r=48, wm=wm)
    pn, ps = (49, 34), (49, 72)
    sh = [circle(pn, 11, "#6a2bb0", 0.85, 0.01), circle(ps, 11, "#6a2bb0", 0.85, 0.01)] + statue((49, 3))
    spots = {"H1": (25, 17), "H2": (73, 17), "MT": (21, 51), "ST": (78, 53)}
    for p in spots.values():
        sh += [circle(p, 8.3, ORANGE, 0.6, 0.01), arrow(pn, (pn[0] + (p[0] - pn[0]) * 0.8, pn[1] + (p[1] - pn[1]) * 0.8), "#ff3030", 0.55)]
    sh += [arrow(pn, (49, 52), "#ff3030", 0.55)]
    s["shapes"] = sh
    s["roles"] = roles(**spots, D1=(45, 54), D2=(53, 54), D3=(45, 58), D4=(53, 58))
    return s


def p1_20():
    wm = {"A": [49, 15], "1": [26, 28], "2": [74, 28], "D": [14, 49], "B": [85, 49], "4": [26, 70], "3": [74, 70], "C": [49, 86]}
    s = board(713, 719, at=(50, 51), r=48, wm=wm)
    sh = [circle((49, 30), 11, "#6a2bb0", 0.85, 0.01), circle((49, 66), 11, "#6a2bb0", 0.85, 0.01)] + statue((49, 3))
    sh += [arrow((61, 48), (33, 48), "#ff3030", 0.6), arrow((33, 50), (61, 50), "#ff3030", 0.6)]
    sh += trapmark((17.5, 44)) + trapmark((70.5, 44))
    s["shapes"] = sh
    s["roles"] = roles(ST=(21, 48.5), MT=(27, 46), H1=(27, 50.5), H2=(24, 52), D1=(67, 48.5), D2=(63, 47), D3=(63, 51), D4=(66, 52))
    return s


def p1_21():
    wm = {"A": [49, 16], "1": [24, 30], "2": [74, 30], "D": [14, 49], "B": [84, 49], "4": [24, 71], "3": [74, 71], "C": [49, 85]}
    s = board(702, 712, at=(49, 51), r=48, wm=wm)
    pn, ps = (49, 33), (49, 70)
    sh = [circle(pn, 11, "#6a2bb0", 0.85, 0.01), circle(ps, 11, "#6a2bb0", 0.85, 0.01)] + stack(pn, 9.5, 4.4, 2) + stack(ps, 9.5, 4.4, 2)
    sh += statue((49, 3))
    sh += [arrow((70, 45), (55, 35.5), "#ff3030", 0.6), arrow((25, 50), (42, 37), "#ff3030", 0.6),
           arrow((30, 54), (46, 68), "#ff3030", 0.6), arrow((67, 54), (52, 68), "#ff3030", 0.6)]
    s["shapes"] = sh
    s["roles"] = roles(ST=(45, 33), MT=(53, 33), H1=(45, 68), H2=(53, 68), D1=(46, 72.5), D2=(52, 72.5), D3=(49, 70), D4=(49, 74.5))
    return s


# ---------------------------------------------------------------- Statue 3 + Zubizuba Teleport
def p1_arrows(w, h, at, r, wm, tiles, rects=True, boss=None):
    s = board(w, h, at=at, r=r, wm=wm, floor="#10172a", boss=boss)
    s["arena"]["edge"] = "#d9dde6"
    sh = [ring(at, 8, "#ff7a1a", 1.1, 0.95)]
    if rects:
        for (x0, y0, x1, y1, col) in rects:
            sh += [rect(((x0 + x1) / 2, (y0 + y1) / 2), x1 - x0, (y1 - y0) * h / w, 0, col, 0.18, 0.3)]
    for (c, d) in tiles:
        sh += arrowtile(c, d)
    s["shapes"] = sh
    return s


T25 = [((26, 28), "down"), ((26, 40), "down"), ((39, 28), "left"), ((39, 40), "up"),
       ((63, 27), "left"), ((76, 27), "left"), ((63, 41), "right"), ((76, 41), "up"),
       ((26, 64), "down"), ((37, 64), "left"), ((26, 77), "right"), ((37, 77), "right"),
       ((63, 65), "down"), ((63, 79), "right"), ((76, 65), "up"), ((76, 79), "up")]
R25 = [(21, 21.5, 31, 46.5, "#e0443a"), (34, 21, 44, 46, "#e0443a"), (57, 22, 82, 32.5, "#e8d030"), (57, 35.5, 82, 45, "#e8d030"),
       (20, 59, 45, 69.5, "#a04ae0"), (20, 71.5, 45, 81, "#a04ae0"), (58, 59, 68, 85.5, "#2f5ee0"), (71, 59, 81, 85.5, "#2f5ee0")]
WM25 = {"A": [51, 28], "D": [27, 53], "B": [75, 53], "C": [51, 78], "1": [32, 36], "2": [70, 35.5], "3": [69, 72], "4": [32, 72]}


def p1_25():
    return p1_arrows(644, 637, (51.5, 54.5), 43.5, WM25, T25, R25)


def p1_26():
    wm = {"A": [47, 25.5], "1": [29, 31], "2": [65, 31], "D": [24, 49], "B": [71, 49], "4": [29, 67], "3": [65, 67], "C": [47, 72]}
    t = [((23, 24), "down"), ((36, 24), "left"), ((23, 38), "down"), ((36, 36.5), "up"),
         ((59, 24), "left"), ((72, 24), "left"), ((59, 37), "right"), ((72, 37), "up"),
         ((22.5, 61), "down"), ((36, 61), "left"), ((23, 75), "right"), ((36, 74), "right"),
         ((59, 61), "down"), ((72, 61), "up"), ((59, 75), "right"), ((72, 75), "up")]
    s = p1_arrows(681, 650, (47.5, 50), 42.5, wm, t, None)
    s["shapes"] += trapmark((35.5, 45.5)) + trapmark((56.5, 45.5))
    s["roles"] = roles(MT=(32, 49.5), ST=(38, 49.5), H1=(33.5, 52.5), H2=(36, 52.5), D1=(54, 49.5), D2=(60, 49.5), D3=(57, 49.5), D4=(56, 52.5))
    s["iconSize"] = 4.8
    return s


def sleep_mark(c):
    return [rect(c, 3.4, 3.4, 0, "#c0303a", 0.95, 0.2), text(c, "z", 2.6, "#ffffff")]


def p1_28():
    s = p1_arrows(644, 637, (49.5, 52), 42.5, {"A": [49, 25], "D": [26, 49], "B": [72, 49], "C": [49, 73]},
                  [((25, 25), "down"), ((25, 37), "down"), ((37, 25), "left"), ((37, 37), "up"),
                   ((62, 25), "left"), ((74, 25), "left"), ((62, 37), "right"), ((74, 37), "up"),
                   ((25, 59), "down"), ((37, 59), "left"), ((25, 72), "right"), ((37, 72), "right"),
                   ((62, 61), "down"), ((62, 74), "right"), ((75, 61), "up"), ((75, 74), "up")],
                  [(20, 15.5, 30, 41, "#e0443a"), (32, 15, 42, 41, "#e0443a"), (55, 16.5, 80, 26, "#e8d030"), (55, 29, 80, 39, "#e8d030"),
                   (19, 53.5, 44, 63.5, "#a04ae0"), (19, 66.5, 44, 76.5, "#a04ae0"), (56.5, 53, 66.5, 78.5, "#2f5ee0"), (69, 53, 79, 78.5, "#2f5ee0")])
    for c in ((44, 37.5), (59.5, 37.5), (44, 50), (59.5, 50)):
        s["shapes"] += sleep_mark(c)
    s["roles"] = roles(MT=(31, 30.5), ST=(68, 30.5), H1=(31, 66), H2=(68, 66), D3=(42, 43), D4=(57, 43), D1=(41, 55.5), D2=(58, 55.5))
    return s
