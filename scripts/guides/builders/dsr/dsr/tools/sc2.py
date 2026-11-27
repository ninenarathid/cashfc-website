"""P2 King Thordan: the round arena (radius 22 yalms = 47 % of the frame), redrawn from Tuufless's 02/ pictures."""
from base import *

C = (50, 50)
AR = 47
YALM = AR / 22
# the PF's "inner" waymarks (13 yalms out)
P2_WM = {k: [R(50 + (x - 100) * YALM), R(50 + (z - 100) * YALM)] for k, (x, z) in {
    "A": (100, 87), "B": (113, 100), "C": (100, 113), "D": (87, 100),
    "1": (109.192, 90.807), "2": (109.192, 109.192), "3": (90.807, 109.192), "4": (90.807, 90.807)}.items()}

FLOOR2 = "#33414b"
ICE = "#58d6d0"
TOWER = "#f0c24a"


def rim(ticks=True):
    """The 90 notches round the edge and the 8 'shuriken' marks outside it."""
    out = []
    if ticks:
        for i in range(90):
            a = i * 4
            out.append(line(off(C, a, AR + 0.3), off(C, a, AR + (1.9 if i % 5 == 0 else 1.2)), "#9aa3ad", 0.16, 0.8))
    for a in range(0, 360, 45):
        out.append(cone(off(C, a, AR + 3.6), a + 180, 60, 1.9, "#c9ced6", 0.95, 0.05))
    return out


def clip(bg="#14171b"):
    """Hide whatever spilled outside the arena (the source clips its AoEs to the floor), then the rim again."""
    return [donut(C, 160, AR + 0.4, bg, 1.0)] + rim()


def arena(shapes=(), wm=True, ticks=True, fill=FLOOR2, **kw):
    sh = rim(ticks) + [ring(C, AR * 0.36, "#c9a74a", 0.3, 0.35), ring(C, AR * 0.22, "#c9a74a", 0.3, 0.35)]
    s = {"frame": [1, 1], "bg": "#14171b", "arena": {"shape": "circle", "at": [50, 50], "r": AR, "fill": fill, "lines": False, "edge": "#0c0e10"},
         "waymarks": dict(P2_WM) if wm else None, "markSize": 4.6, "iconSize": 5.6, "bossSize": 6.5}
    s["shapes"] = sh + list(shapes)
    s.update(kw)
    return s


def waymarks():
    sh = []
    for k, p in P2_WM.items():
        sh.append(ring(p, 3.4, "#ffffff", 0.3, 0.6))
    s = arena(sh, markSize=6.4)
    return s


def redstar(c, s=2.4):
    return [dot(c, s * 0.75, "#e02424"), ring(c, s * 0.75, "#3a0000", 0.25, 0.9)] + star(c, s, "#ffd0d0")


# ---------------------------------------------------------------- Strength of the Ward, part 1
GUER = (50, 36)
SW1_ROLES = roles(D3=(37, 8), MT=(50, 7), D1=(62, 8), H1=(50, 20), H2=(50, 79), D2=(37, 92), ST=(50, 93), D4=(62, 92))


def guer(c=GUER):
    return knight(c, "WAR", "#e6e6e6", 2.8)


def sw1(n):
    sh = []
    if n == 1:
        sh += [line((0, 72), (100, 32), "#e02424", 0.55, 0.9, True)]
        for p in ((16, 20), (96, 52), (16, 85)):
            sh += redstar(p)
        sh += guer()
        return arena(sh, roles=dict(SW1_ROLES))
    if n == 2:
        for a, b in (((16, 20), (84, 80)), ((16, 85), (84, 20)), ((100, 52), (0, 52))):
            sh.append(beam(a, off(a, ang(a, b), 120), 32, PINK, 0.3))
        sh.append(circle(GUER, 13, PINK, 0.35))
        for p in SW1_ROLES.values():
            sh.append(circle(p, 9.5, "#c070e0", 0.28, 0.1))
        sh += clip() + guer()
        return arena(sh, roles=dict(SW1_ROLES))
    if n == 3:
        sh += [donut(GUER, 27, 13, PINK, 0.32)] + guer()
        sh += redstar((31, 62)) + redstar((69, 62))
        sh += curve([(36, 8), (42, 6.5), (46, 6.5)]) + curve([(64, 8), (58, 6.5), (54, 6.5)]) + [arrow((50, 13), (50, 17), "#ffffff", 0.45)]
        for x0 in (36, 43, 57, 64):
            sh += curve([(x0, 93), ((x0 + 50) / 2, 82), (50, 72)])
        return arena(sh, roles=roles(MT=(50, 6), H1=(50, 21), ST=(50, 65)))
    if n == 4:
        sh += [donut(GUER, 40, 27, PINK, 0.32)] + guer()
        sh += redstar((31, 62)) + redstar((69, 62))
        sh += [arrow((50, 9), (50, 38), "#ffffff", 0.45), arrow((50, 80), (50, 59), "#ffffff", 0.45)]
        return arena(sh, roles=roles(MT=(50, 43), ST=(50, 54)))
    # n == 5: the 4th ring + Ascalon's Mercy Concealed
    sh += [donut(GUER, 55, 40, PINK, 0.3), cone(C, 0, 26, 52, PINK, 0.4), cone(C, 180, 26, 52, PINK, 0.4)]
    sh += redstar((31, 62)) + redstar((69, 62))
    sh += curve([(46, 40), (50, 38), (54, 40)]) + curve([(54, 40), (50, 38), (46, 40)])
    sh += curve([(46, 61), (50, 63), (54, 61)]) + curve([(54, 61), (50, 63), (46, 61)])
    return arena(sh, roles=roles(D1=(40, 42), MT=(60, 44), H2=(40, 57), ST=(60, 59)))


def sw_hi():
    sh = [line((50, 3), (50, 97), "#ffffff", 0.2, 0.6, True), line((3, 50), (97, 50), "#ffffff", 0.2, 0.6, True),
          line(off(C, 315, 47), off(C, 135, 47), "#ffffff", 0.2, 0.6, True), line(off(C, 45, 47), off(C, 225, 47), "#ffffff", 0.2, 0.6, True)]
    for r, lab in ((13, "1"), (27, "2"), (40, "3"), (53, "4")):
        sh.append(ring(GUER, r, "#ffffff", 0.35, 0.9))
    for p, s in (((50, 22), "1"), ((50, 46), "1"), ((50, 10), "2"), ((50, 62), "2"), ((25, 36), "2"), ((75, 36), "2"),
                 ((12, 36), "3"), ((88, 36), "3"), ((50, 75), "3"), ((50, 88), "4"), ((50, 97), "5")):
        sh.append(text(p, s, 3.2, "#ffffff"))
    sh += guer()
    return arena(sh, wm=False)


# ---------------------------------------------------------------- Strength of the Ward, part 2 (Thordan = north)
SW2_TOWERS = [(50, 21), (30, 28), (70, 28), (21, 51), (79, 51), (50, 80)]
SW2_MARKED = [(6, 52), (94, 52), (50, 96)]


def thordan(c):
    return knight(c, "Thordan", "#ffe08a", 3.6)


def blue_mark(c):
    return [dot((c[0], c[1] - 4.4), 1.5, "#2a6ee0"), ring((c[0], c[1] - 4.4), 1.5, "#bcd8ff", 0.3, 0.95)]


def sw2(n):
    sh = []
    if n == 1:
        for p in SW2_MARKED:
            sh.append(circle(p, 30, "#5a1212", 0.45, 0.05))
        for t in SW2_TOWERS:
            sh += tower(t, 6)
        sh += redstar((31, 61)) + redstar((69, 61))
        sh += [line((37, 25), (31, 61), YEL, 0.5), line((61, 25), (69, 61), YEL, 0.5)]
        sh += curve([(47, 54), (40, 68), (25, 70), (13, 59)]) + curve([(53, 54), (60, 68), (75, 70), (87, 59)]) + [arrow((50, 54), (50, 90), "#ffffff", 0.45)]
        sh += [arrow((11, 46), (11, 53), "#3ee05a", 0.6), arrow((89, 46), (89, 53), "#3ee05a", 0.6)]
        for p in ((40, 6), (50, 5), (60, 6)):
            sh += anon(p, 2.1)
        for p in SW2_MARKED:
            sh += anon(p, 2.1) + blue_mark(p)
        return arena(sh, wm=False, roles=roles(MT=(37, 24), ST=(61, 24)))
    if n == 2:
        for p in SW2_MARKED:
            sh.append(circle(p, 46, "#9ad8ff", 0.22, 0.05))
        for t in SW2_TOWERS:
            sh += tower(t, 6)
        sh += [circle((50, 3), 13, PINK, 0.5)]
        sh += redstar((31, 61)) + redstar((69, 61))
        sh += [line((40, 7), (69, 61), YEL, 0.55), line((60, 7), (31, 61), YEL, 0.55)]
        for p in ((50, 6),):
            sh += anon(p, 2.1)
        for p in SW2_MARKED:
            sh += anon(p, 2.1) + blue_mark(p)
        sh += tag((50, 13), "The Dragon's Rage", 2.0)
        return arena(sh, wm=False, roles=roles(ST=(40, 7), MT=(60, 7)))
    # n == 3: the tanks stunned, everyone else in a tower
    for t in SW2_TOWERS:
        sh += tower(t, 6) + anon(t, 2.1)
    for a, b in (((50, 3), (50, 15)), ((30, 9), (29, 22)), ((70, 9), (71, 22)), ((5, 51), (16, 51)), ((95, 51), (84, 51)), ((50, 97), (50, 86))):
        sh.append(arrow(a, b, "#ffffff", 0.4))
    sh += tag((50, 14), "stun", 2.0, "#ff8080")
    return arena(sh, wm=False, roles=roles(ST=(39, 7), MT=(61, 7)))


# ---------------------------------------------------------------- Sanctity of the Ward: Sacred Sever
def eye(c, s=4.0):
    return [dot(c, s, "#5a0f1a"), circle(c, s * 0.75, "#e02424", 0.85, 0.1), dot(c, s * 0.3, "#ffffff")]


def group(c, n):
    return num(c, n, 2.5, "#ffffff", "#2a6ee0" if n == 1 else "#c62828")


def knight_face(c, cw, left):
    """The two inner knights: a red triangle pointing the way they will dash."""
    d = (0 if left else 180) if cw else (180 if left else 0)
    return [cone(off(c, d, 2.2), d + 180, 50, 4.4, "#e02424", 0.95, 0.1)]


def sac_paths(cw):
    if cw:
        L = [(40, 50), (50, 2), (93, 68), (16, 84)]
        Rr = [(60, 50), (50, 98), (6, 32), (84, 16)]
    else:
        L = [(40, 50), (50, 98), (94, 32), (16, 16)]
        Rr = [(60, 50), (50, 2), (7, 68), (84, 84)]
    return L, Rr


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def sac(cw, n):
    sh = []
    L, Rr = sac_paths(cw)
    g1 = {1: (26, 15), 2: (26, 15), 3: (40, 6), 4: (40, 6)} if cw else {1: (13, 27), 2: (13, 26), 3: (13, 26), 4: (7, 41)}
    g2 = {1: (73, 91), 2: (74, 88), 3: (59, 95), 4: (59, 95)} if cw else {1: (87, 75), 2: (87, 75), 3: (87, 74), 4: (93, 59)}
    if n >= 2:
        seg = n - 1  # which leg of each path is going off
        for P in (L, Rr):
            a, b = P[seg - 1], P[seg]
            for t in ((0.15, 0.55, 0.95) if seg == 1 else (0.25, 0.75)):
                sh.append(circle(lerp(a, b, t), 18, PINK, 0.3, 0.1))
        for P in (L, Rr):
            for i in range(3):
                sh.append((arrow if i == 2 else line)(P[i], P[i + 1], YEL, 0.4))
                for t in (0.33, 0.66):
                    m = lerp(P[i], P[i + 1], t)
                    a = ang(P[i], P[i + 1]) + 90
                    sh.append(line(off(m, a, 1.2), off(m, a + 180, 1.2), YEL, 0.35))
    if n in (2, 4):
        sh += [circle(g1[n], 9, "#b01818", 0.5), circle(g2[n], 9, "#b01818", 0.5)]
    if n == 1:
        sh += [line((14, 17), (86, 85), "#ffffff", 0.3, 0.8, True)]
        sh += knight((70, 72), "DRK", "#e6e6e6", 2.8)
        sh += thordan((10, 11)) + eye((11, 18), 3.0) + eye((89, 11), 4.2)
        sh += knight_face((40, 50), cw, True) + knight_face((60, 50), cw, False)
        if cw:
            sh += curve([(16, 18), (18, 12), (22, 8)]) + [text((24, 5), "3-4", 3.0, "#ffffff")]
            sh += curve([(84, 82), (86, 89), (80, 93)]) + [text((90, 96), "3-4", 3.0, "#ffffff")]
        else:
            sh += curve([(13, 17), (9, 20), (7, 25)]) + [text((5, 30), "3-4", 3.0, "#ffffff")]
            sh += curve([(86, 86), (90, 82), (93, 78)]) + [text((92, 90), "3-4", 3.0, "#ffffff")]
    if n == 2:
        sh += knight_face((40, 50), cw, True) + knight_face((60, 50), cw, False)
    if n == 3:
        if cw:
            sh += curve([(27, 12), (33, 8), (37, 7)]) + curve([(72, 88), (66, 93), (62, 94)])
        else:
            sh += curve([(13, 22), (13, 24.5)]) + curve([(87, 78), (87, 76)])
    if n == 4 and not cw:
        sh += curve([(10, 33), (8, 36), (7.5, 38)]) + curve([(91, 66), (92, 63), (92.5, 61.5)])
    sh += group(g1[n], 1) + group(g2[n], 2)
    return arena(sh)


# ---------------------------------------------------------------- Sanctity of the Ward: Meteors
OUTER = 42


def otower(a):
    return off(C, a, OUTER)


def itower(a):
    return off(C, a, 14)


def flower(ice):
    out = []
    for a in (45, 135, 225, 315):
        out.append(circle(off(C, a, 25), 18.5, PINK, 0.3, 0.05))
    if ice:
        for a in (0, 90, 180, 270):
            out.append(circle(off(C, a, 25), 19, ICE, 0.32, 0.05))
    return out


def met_board(towers, ice, sh2, rl, marks=(), arrows=()):
    sh = flower(ice)
    for t in towers:
        sh += tower(t, 5.2)
    sh += list(sh2)
    for m in marks:
        sh += down_tri((m[0], m[1] - 4.6), 1.6)
    for a in arrows:
        sh += a
    return arena(sh, roles=roles(**rl))


PAIRS = dict(MT=(50, 20), D3=(50, 27), H1=(21, 51), D1=(27, 51), H2=(73, 51), D2=(79, 51), ST=(50, 73), D4=(50, 79))
SET2 = [off(C, a, 41) for a in range(0, 360, 45)]


def cw_runs():
    return [curve([(26, 88), (10, 66), (8, 40), (20, 18), (37, 7)]), curve([(62, 7), (80, 18), (91, 40), (90, 66), (77, 88), (60, 94)])]


def met(ex, n):
    if ex == 1:
        T1 = [otower(330), otower(300), otower(240), otower(120), otower(150), otower(180), itower(315), itower(45)]
        if n == 1:
            return met_board(T1, False, [], PAIRS, marks=[PAIRS["H1"], PAIRS["ST"]])
        if n == 2:
            rl = dict(H1=(36, 13), D1=(12, 31), MT=(12, 72), D2=(43, 45), D3=(57, 45), H2=(88, 72), D4=(68, 89), ST=(50, 95))
            return met_board(T1, True, [line((50, 2), (50, 98), "#3ee05a", 0.3, 0.8, True)], rl, marks=[rl["H1"], rl["ST"]])
        if n == 3:
            rl = dict(ST=(40, 5), D1=(16, 20), MT=(5, 50), D4=(17, 82), H1=(55, 96), H2=(94, 50), D3=(55, 43), D2=(55, 50))
            return met_board(SET2, True, [], rl, arrows=cw_runs())
        rl = dict(ST=(50, 9), D1=(21, 21), D3=(79, 21), MT=(9, 50), H2=(91, 50), D4=(21, 79), D2=(79, 79), H1=(50, 91))
        return arena(sum([tower(t, 5.2) for t in SET2], []) + [arrow((53, 47), (75, 25)), arrow((53, 53), (75, 75))], roles=roles(**rl))
    if ex == 2:
        T1 = [otower(0), otower(30), otower(270), itower(45), itower(225), itower(135), otower(120), otower(210)]
        if n == 1:
            return met_board(T1, False, [], PAIRS, marks=[PAIRS["D1"], PAIRS["D2"]])
        if n == 2:
            rl = dict(D1=(50, 22), MT=(51.5, 24), D3=(19, 51), H1=(20.5, 53), D4=(79, 51), H2=(80.5, 53), D2=(50, 78), ST=(51.5, 80))
            return met_board(T1, True, [], rl, marks=[rl["D1"], rl["D2"]])
        if n == 3:
            rl = dict(D1=(50, 6), MT=(70, 13), D3=(5, 52), H1=(57, 39), ST=(43, 58), H2=(57, 58), D4=(90, 73), D2=(34, 90))
            return met_board(T1, True, [], rl, marks=[rl["D1"], rl["D2"]])
        if n == 4:
            rl = dict(D2=(50, 5), MT=(73, 18), D3=(5, 50), D4=(94, 50), H1=(43, 44), ST=(43, 56), H2=(56, 57), D1=(50, 95))
            return met_board(SET2, True, [], rl, arrows=cw_runs())
        rl = dict(D2=(50, 9), H1=(21, 21), MT=(79, 21), D3=(9, 50), D4=(91, 50), ST=(21, 79), H2=(79, 79), D1=(50, 91))
        return arena(sum([tower(t, 5.2) for t in SET2], []) + [arrow((47, 47), (25, 25)), arrow((47, 53), (25, 75)), arrow((53, 53), (75, 75))], roles=roles(**rl))
    T1 = [otower(330), otower(30), otower(300), otower(60), itower(45), itower(135), otower(120), otower(210)]
    if n == 1:
        return met_board(T1, False, [], PAIRS, marks=[PAIRS["D3"], PAIRS["D1"]])
    if n == 2:
        rl = dict(D3=(50, 22), MT=(51.5, 24), D4=(19, 51), H1=(20.5, 53), D2=(79, 51), H2=(80.5, 53), D1=(50, 78), ST=(51.5, 80))
        return met_board(T1, True, [], rl, marks=[rl["D3"], rl["D1"]])
    if n == 3:
        rl = dict(MT=(33, 13), D3=(66, 12), D4=(12, 28), D2=(88, 28), H1=(58, 38), ST=(58, 57), H2=(88, 71), D1=(34, 89))
        return met_board(T1, True, [], rl, marks=[rl["D3"], rl["D1"]])
    if n == 4:
        rl = dict(D1=(50, 5), MT=(74, 18), D4=(5, 50), D2=(94, 50), H1=(43, 44), ST=(43, 56), H2=(79, 78), D3=(50, 95))
        return met_board(SET2, True, [], rl, arrows=cw_runs())
    rl = dict(D1=(50, 9), H1=(21, 21), MT=(79, 21), D4=(9, 50), D2=(91, 50), ST=(21, 79), H2=(79, 79), D3=(50, 91))
    return arena(sum([tower(t, 5.2) for t in SET2], []) + [arrow((47, 47), (25, 25)), arrow((47, 53), (25, 75))], roles=roles(**rl))
