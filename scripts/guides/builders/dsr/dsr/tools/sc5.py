"""P5 Alternate Timeline Thordan: Wrath of the Heavens (white dragon = north) and Death of the Heavens
(Ser Guerrique = north), redrawn from Tuufless's 05/ pictures. Both are turned boards: no waymarks."""
from base import *
import sc2

STONE = "#3a3f44"


def arena(sh, **kw):
    return sc2.arena(sh, wm=False, fill=STONE, **kw)


def dragon(c):
    return [dot(c, 2.6, "#f4f4f4"), ring(c, 2.6, "#8a8a8a", 0.3)] + star(c, 2.2, "#555555")


def kstar(c):
    return [dot(c, 2.2, "#d8d08a"), ring(c, 2.2, "#6a6430", 0.3)] + star(c, 1.9, "#6a6430")


def blue_mark(c):
    return [dot((c[0], c[1] - 4.2), 1.5, "#2a6ee0"), ring((c[0], c[1] - 4.2), 1.5, "#bcd8ff", 0.3)]


def vuln(c):
    return tag((c[0] + 3.4, c[1] - 3.2), "x", 2.0, "#ff6060", "#5a1010")


def thunder(c):
    """Thunderstruck: a pink diamond by the player."""
    p = (c[0] + 3.2, c[1] - 3.2)
    return [rect(p, 2.6, 2.6, 45, "#e0409a", 0.95, 0.12), rect(p, 1.2, 1.2, 45, "#ffd0ea", 0.95, 0.05)]


def dive_mark(c):
    return [dot((c[0], c[1] - 4.0), 1.6, "#2ec4a0"), ring((c[0], c[1] - 4.0), 1.6, "#bfffee", 0.3)]


def twister(c):
    return [ring(c, 1.8, "#2ec4b0", 0.4, 0.9), ring(c, 0.9, "#2ec4b0", 0.3, 0.9)]


GRIN, CHAR = (49.5, 30), (49.5, 70)
EAST5 = [(88, 33), (90, 42), (92, 50), (90, 60), (87, 69)]


def wrath(n):
    sh = []
    if n in (1, 2, 3):
        if n == 3:
            sh += [circle((11, 30), 38, "#8ac8ff", 0.35)]
            sh += [beam((26, 12), (76, 100), 22, "#f0e070", 0.3), beam((73, 12), (23, 100), 22, "#f0e070", 0.3),
                   rect((50, 52), 20, 96, 0, "#ff8a4a", 0.3)]
        else:
            sh += [line((26, 12), (73, 90), YEL, 0.5), line((73, 12), (26, 90), YEL, 0.5)]
        sh += dragon((49.5, 5)) + kstar((26, 12)) + kstar((73, 12))
        if n == 1:
            for a, b, t in (((14, 17), (4, 27), (6, 18)), ((86, 17), (96, 27), (94, 18)), ((14, 85), (24, 96), (16, 96)), ((86, 83), (76, 96), (84, 96)), ((90, 84), (96, 74), (96, 86))):
                sh += curve([a, ((a[0] + b[0]) / 2 + (2 if a[0] < 50 else -2), (a[1] + b[1]) / 2), b], "#ffffff", 0.35)
                sh.append(text(t, "4", 3.0, "#ffffff"))
        if n >= 2:
            sh += knight(GRIN, "WAR", "#e6e6e6", 3.0) + knight(CHAR, "BLM", "#e6e6e6", 3.0)
        sh += anon((11, 32)) + (vuln((11, 32)) if n == 3 else blue_mark((11, 32)))
        for c in ((26, 90), (73, 90)):
            sh += anon(c) + (vuln(c) if n == 3 else [])
        for i, c in enumerate(EAST5):
            sh += anon(c)
            if n >= 2 and i in (1, 4):
                sh += thunder(c)
            if n == 3 and i == 2:
                sh += dive_mark(c)
        return arena(sh)
    P = {"x1": (28, 15), "x2": (9, 52), "x3": (24, 78), "dv": (49.5, 93), "e1": (72, 15), "t1": (82, 34), "e2": (83, 55), "t2": (74, 72)}
    if n in (4, 5):
        if n == 5:
            for k, c in P.items():
                sh.append(cone((50, 50), ang((50, 50), c), 24, 46.5, PINK, 0.38))
        for c in ((16, 27), (90, 30), (86, 69), (29, 89)):
            sh += twister(c)
        sh += knight(GRIN, "WAR", "#e6e6e6", 3.0) + knight(CHAR, "BLM", "#e6e6e6", 3.0)
        if n == 4:
            sh += curve([(16, 24), (19, 18), (25, 16)]) + curve([(18, 92), (10, 75), (10, 57)]) + curve([(68, 93), (45, 88), (28, 80)])
            sh += curve([(92, 45), (66, 60), (52, 88)]) + curve([(68, 96), (60, 92), (52, 92)])
        for k, c in P.items():
            sh += anon(c)
            if k.startswith("x"):
                sh += vuln(c)
            if k.startswith("t"):
                sh += thunder(c)
            if k == "dv":
                sh += dive_mark(c)
        return arena(sh)
    if n == 6:
        for c in ((12, 50), (17, 56), (22, 50), (26, 55)):
            sh.append(circle(c, 17, PINK, 0.28))
        for c in ((72, 46), (78, 56), (85, 60), (76, 63), (88, 52)):
            sh.append(circle(c, 15, "#ffb0b0", 0.28))
        sh += knight(GRIN, "WAR", "#e6e6e6", 3.0) + knight(CHAR, "BLM", "#e6e6e6", 3.0)
        for c in ((41, 22), (57, 22)):
            sh += anon(c) + thunder(c)
        for i in range(6):
            sh += anon((48.5 + (i % 3) * 0.8, 37 + (i // 3) * 1.2))
        return arena(sh)
    # 7: Empty Dimension + Thunderstruck + the divebombs
    sh += [donut(GRIN, 80, 15, "#c84040", 0.3)]
    sh += [beam((30, 100), (70, 40), 22, "#e8c8a0", 0.3), beam((69, 100), (29, 40), 22, "#e8c8a0", 0.3)]
    for c in ((12, 50), (17, 56), (22, 50), (26, 55)):
        sh.append(circle(c, 17, PINK, 0.28))
    for c in ((72, 46), (78, 56), (85, 60), (76, 63), (88, 52)):
        sh.append(circle(c, 15, "#ffb0b0", 0.28))
    sh += [circle((41, 22), 9, "#c070e0", 0.45), circle((57, 22), 9, "#c070e0", 0.45)]
    sh += sc2.clip()
    sh += knight(GRIN, "WAR", "#e6e6e6", 3.0) + knight(CHAR, "BLM", "#e6e6e6", 3.0)
    for c in ((41, 22), (57, 22)):
        sh += anon(c) + thunder(c)
    for i in range(6):
        sh += anon((48.5 + (i % 3) * 0.8, 37 + (i // 3) * 1.2))
    return arena(sh)


GUER = (49.5, 34)


def corner(gaze):
    out = knight((9, 10), "Thordan", "#ffe08a", 3.4)
    if gaze:
        out += [dot((9, 16), 3.0, "#5a0f1a"), circle((9, 16), 2.2, "#e02424", 0.9), dot((9, 16), 0.9, "#ffffff")]
        out += [dot((90, 90), 5.0, "#5a0f1a"), circle((90, 90), 3.8, "#e02424", 0.9), dot((90, 90), 1.5, "#ffffff")]
    else:
        out += [dot((90, 90), 5.0, "#5a0f1a"), circle((90, 90), 3.8, "#b0204a", 0.7)]
    return out


def doom(c, n):
    return num(c, n, 2.5, "#ffffff", "#d62828") + [dot((c[0] + 2.4, c[1] - 2.6), 1.1, "#3a2a6a")]


def nod(c, n):
    return num(c, n, 2.5, "#ffffff", "#3a7ad8")


def death(n):
    sh = []
    if n == 1:
        sh += corner(False) + knight(GUER, "WAR", "#e6e6e6", 3.0)
        xs = [28, 34, 40, 46, 52, 58.5, 65, 71]
        rl = {k: (x, 50) for k, x in zip(["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"], xs)}
        return arena(sh, roles=roles(**rl), iconSize=5.2)
    if n == 2:
        sh += corner(False) + knight(GUER, "WAR", "#e6e6e6", 3.0)
        for i, x in enumerate((31, 39, 66, 74)):
            sh += doom((x, 41), i + 1) + [arrow((x, 50), (x, 45), "#ffffff", 0.35)]
        for i, x in enumerate((23, 46, 53, 60)):
            sh += nod((x, 59), i + 1) + [arrow((x, 50), (x, 55), "#ffffff", 0.35)]
        return arena(sh)
    if n == 3:
        sh += corner(False) + knight(GUER, "WAR", "#e6e6e6", 3.0)
        D = {1: (20, 49), 2: (22, 15), 3: (77, 15), 4: (79, 49)}
        Nn = {1: (6, 49), 2: (22, 84), 3: (77, 84), 4: (93, 49)}
        for k, c in D.items():
            sh += doom(c, k)
        for k, c in Nn.items():
            sh += nod(c, k)
        for c, t in (((16, 12), (12, 6)), ((84, 12), (88, 6)), ((16, 88), (12, 95)), ((84, 88), (88, 95))):
            sh += [text(t, "2", 3.0, "#ffffff")]
        return arena(sh)
    if n == 4:
        sh += [beam((0, 20), (100, 80), 26, PINK, 0.28), beam((100, 20), (0, 80), 26, PINK, 0.28), rect((49.5, 60), 46, 78, 0, PINK, 0.2)]
        for r, lab in ((11, "1"), (24, "2"), (37, "3"), (50, "4")):
            sh.append(ring(GUER, r, "#ffffff", 0.3, 0.9))
        for c, s in (((49.5, 24), "1"), ((49.5, 45), "1"), ((49.5, 58), "2"), ((49.5, 71), "3"), ((49.5, 84), "4"), ((49.5, 97), "5"),
                     ((24, 34), "2"), ((75, 34), "2"), ((11, 34), "3"), ((88, 34), "3"), ((49.5, 4), "2")):
            sh.append(text(c, s, 2.6, "#ffffff"))
        D = {1: (20, 49), 2: (22, 15), 3: (77, 15), 4: (79, 49)}
        Nn = {1: (6, 49), 2: (22, 84), 3: (77, 84), 4: (93, 49)}
        sh += sc2.clip()
        for c in list(D.values()) + list(Nn.values()):
            sh.append(circle(c, 9.5, "#d070e0", 0.35))
        sh += corner(False) + knight(GUER, "WAR", "#e6e6e6", 3.0)
        for k, c in D.items():
            sh += doom(c, k)
        for k, c in Nn.items():
            sh += nod(c, k)
        sh += curve([(25, 18), (30, 26), (34, 32)]) + curve([(74, 18), (69, 26), (65, 32)])
        sh += curve([(20, 54), (22, 60), (28, 66)]) + curve([(79, 54), (77, 60), (71, 66)])
        sh += curve([(8, 55), (10, 62), (13, 68)]) + curve([(91, 55), (89, 62), (86, 68)])
        sh += curve([(26, 82), (31, 78), (36, 75)]) + curve([(73, 82), (68, 78), (63, 75)])
        return arena(sh)
    PUD = [(6, 50), (93, 50), (22, 80), (77, 80)]
    if n in (5, 6):
        for c in PUD:
            sh += puddle(c, 5.5, "#d8d8d8", 0.6)
        sh += corner(False)
        Nn = {1: (37, 40), 2: (46, 40), 3: (54, 40), 4: (63, 40)}
        D = {1: (31, 50), 2: (42, 55), 3: (55, 55), 4: (66, 50)}
        for k, c in Nn.items():
            sh += nod(c, k)
        for k, c in D.items():
            sh += doom(c, k)
        if n == 6:
            sh += ps_sym((37, 34), "x") + ps_sym((46, 34), "x") + ps_sym((54, 34), "s") + ps_sym((63, 34), "t")
            sh += ps_sym((24, 50), "o", 2.2) + ps_sym((73, 50), "o", 2.2) + ps_sym((39, 61), "s") + ps_sym((59, 61), "t")
        return arena(sh)
    if n == 7:
        for c in PUD:
            sh += puddle(c, 5.5, "#d8d8d8", 0.6)
        sh += corner(True)
        Nn = {1: (50.2, 43.5), 3: (55.9, 44.8), 4: (44.1, 44.4), 2: (50.2, 57.1)}
        D = {1: (42.5, 50.2), 4: (56.5, 50.2), 2: (45.1, 55.6), 3: (55.9, 55.6)}
        for k, c in Nn.items():
            sh += nod(c, k)
        for k, c in D.items():
            sh += doom(c, k)
        sh += ps_sym((50.2, 36.2), "x") + ps_sym((35.2, 49.8), "o", 2.2) + ps_sym((65.1, 49.8), "o", 2.2) + ps_sym((40.3, 39.4), "t")
        sh += ps_sym((60, 40.3), "s") + ps_sym((40.3, 59.7), "s") + ps_sym((59.7, 59.4), "t") + ps_sym((50.2, 64.4), "x")
        return arena(sh)
    # 8: gazes, knockback, Heavensflame; the Dooms step into the white puddles
    OUT = {("n", 1): (49.5, 9), ("n", 3): (19, 20), ("n", 4): (78, 20), ("n", 2): (49.5, 91),
           ("d", 1): (9, 50), ("d", 4): (90, 50), ("d", 2): (22, 79), ("d", 3): (77, 79)}
    for c in OUT.values():
        sh.append(circle(c, 22, PINK, 0.25))
    for c in PUD:
        sh += puddle(c, 5.5, "#d8d8d8", 0.6)
    sh += corner(True)
    for (k, i), c in OUT.items():
        a = ang((49.5, 50), c)
        sh.append(arrow(off((49.5, 50), a, 9), off(c, a + 180, 4), "#ffffff", 0.4))
        sh += (doom(c, i) if k == "d" else nod(c, i))
    return arena(sh)
