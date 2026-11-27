"""P3 Oracle of Darkness scenes (fru_mana/03/*): the dark arena."""
from base import *

NAVY = "#25296e"


def dark(**kw):
    sh = [ring(C, 41, "#8f86e0", 0.25, 0.4), ring(C, 21, "#8f86e0", 0.25, 0.4)]
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 48.4), pol(a, 50.5), "#555555", 0.7, 0.9))
    s = {"frame": [1, 1], "bg": "#f3f3f3",
         "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": NAVY, "lines": False, "edge": "#10123a"},
         "waymarks": None, "markSize": 6, "iconSize": 6.6, "bossSize": 8}
    s["shapes"] = sh + kw.pop("shapes", [])
    s.update(kw)
    return s


def boss_ring(c=C, face=0, r=15):
    out = arc(c, r, face + 40, face + 320, "#e0202a", 1.0, 0.9, head=False, n=24)
    out.append(arrow(pol(face, r - 1.5, c), pol(face, r + 1.8, c), "#e0202a", 0.8))
    return out


# ---------------------------------------------------------------- Ultimate Relativity
HG = {a: pol(a, 21) for a in range(0, 360, 45)}


def chip(c, lab, th, ice=False):
    col = "#2f8a52" if th else "#c2453c"
    out = [dot(c, 3.1, col), ring(c, 3.1, "#ffffff", 0.3, 0.9)]
    if ice:
        out.append(ring(c, 4.0, "#7ee8f0", 0.55, 0.95))
    out.append(text(c, lab, 2.7))
    return out


def hourglasses(which=None):
    out = []
    for a, p in HG.items():
        if which is None or a in which:
            out.append(dot(p, 2.1, "#2fd34a"))
    return out


def beam(p0, p1, w=5):
    return band(p0, p1, w, "#fff36a", 0.4)


def ur01():
    sh = boss_ring() + hourglasses()
    sh += tether(C, HG[0], YELLOW) + tether(C, HG[225], YELLOW) + tether(C, HG[135], YELLOW) + tether(HG[270], HG[90], "#d24cff")
    for p, lab, th, ice in (((50, 21.5), "30", False, True), ((29, 29), "10", False, False), ((70.5, 29), "10", False, False),
                            ((21, 52), "20", True, False), ((79, 51), "20", False, False), ((31, 71), "30", True, False),
                            ((70, 71), "30", True, False), ((50, 77), "10", True, True)):
        sh += chip(p, lab, th, ice)
    sh += [text((50, 8), "Bind 3", 2.8, "#ffb0f0"), text((20, 20), "Attack", 2.8, "#ffe08a"), text((80, 20), "Attack", 2.8, "#ffe08a"),
           text((9, 50), "Ignore 1", 2.6, "#ff9a9a"), text((91, 50), "Ignore 2", 2.6, "#ff9a9a"), text((19, 82), "Bind", 2.8, "#ffb0f0"),
           text((81, 82), "Bind", 2.8, "#ffb0f0"), text((50, 93), "Attack 3", 2.8, "#ffe08a")]
    return dark(shapes=sh)


def center_pile(labels, c=C, d=3.2):
    out = []
    n = len(labels)
    for k, (lab, th, ice) in enumerate(labels):
        p = pol(k * 360 / n, d, c) if n > 1 else c
        out += chip(p, lab, th, ice)
    return out


def red_aoe(c, r=19):
    return [circle(c, r, PINK, 0.32, 0.01), ring(c, r, "#ff9aa6", 0.3, 0.7)]


def ystack(c=C, r=14):
    return [circle(c, r, "#e8e070", 0.35, 0.01), ring(c, r, "#fff3a0", 0.35, 0.85)]


def ur02():
    sh = boss_ring() + hourglasses()
    for p in ((27, 27), (73, 26), (50, 81)):
        sh += red_aoe(p)
    sh += ystack()
    sh += chip((27, 27), "10", False) + chip((73, 26), "10", False) + chip((50, 81), "10", True)
    sh += center_pile([("20", True, False), ("20", False, False), ("30", True, False), ("30", True, False), ("30", False, True)])
    return dark(shapes=sh)


def ur03():
    sh = boss_ring() + hourglasses()
    sh += [beam(HG[0], (92, 0)), beam(HG[225], (68, 100)), beam(HG[135], (32, 100))]
    sh += chip((34, 37), "10", False) + chip((64, 37), "10", False) + chip((50, 74), "10", True, True)
    sh += center_pile([("20", True, False), ("20", False, False)], (50, 50))
    sh += chip((54, 22), "30", False, True) + chip((38, 72), "30", True) + chip((62, 72), "30", True)
    return dark(shapes=sh)


def ur04():
    sh = boss_ring() + hourglasses()
    sh += [donut(C, 24, 10, "#7ee8f0", 0.35)] + ystack(C, 10)
    sh += red_aoe((16, 50)) + red_aoe((84, 50))
    sh += chip((16, 50), "20", True) + chip((84, 50), "20", False)
    sh += center_pile([("30", True, False), ("30", True, False), ("30", False, False), ("10", False, False), ("10", False, False), ("10", True, True)])
    return dark(shapes=sh)


def ur05():
    sh = boss_ring() + hourglasses()
    sh += [beam(HG[315], (2, 78)), beam(HG[45], (90, 80)), beam(HG[180], (0, 80))]
    sh += chip((31, 36), "10", False) + chip((68, 36), "10", False) + chip((46, 73), "10", True, True)
    sh += center_pile([("20", True, False), ("20", False, False), ("30", True, False), ("30", True, False), ("30", False, False)], (50, 47))
    return dark(shapes=sh)


def ur06():
    sh = boss_ring() + hourglasses()
    sh += red_aoe((50, 13)) + red_aoe((24, 73)) + red_aoe((77, 73)) + ystack()
    sh += chip((50, 13), "30", False) + chip((24, 73), "30", True) + chip((77, 73), "30", True)
    sh += center_pile([("10", False, False), ("10", False, False), ("10", True, True), ("20", True, False), ("20", False, False)])
    return dark(shapes=sh)


def ur07(face=False):
    sh = boss_ring() + hourglasses()
    sh += [beam(HG[270], (2, 98)), beam(HG[90], (98, 98))]
    sh += chip((22, 57), "20", True) + chip((78, 57), "20", False)
    pile = [("10", False, False), ("10", False, False), ("10", True, True), ("30", True, False), ("30", True, False), ("30", False, False)]
    sh += center_pile(pile, (50, 48))
    if face:
        sh += curve((24, 62), (34, 63), 0.3) + curve((76, 62), (66, 63), -0.3)
    return dark(shapes=sh)


def ur09():
    sh = boss_ring() + hourglasses((0, 90, 135, 225, 270))
    for p in ((36, 36), (64, 36), (28, 50), (50, 70)):
        sh += [circle(p, 14, PINK, 0.32, 0.01)]
    sh += [circle(C, 14, "#3d8bff", 0.35, 0.01), ring(C, 14, "#8fc0ff", 0.35, 0.85)]
    sh += chip((36, 36), "10", False) + chip((64, 36), "10", False) + chip((28, 50), "20", True) + chip((50, 70), "10", True)
    sh += center_pile([("20", False, False), ("30", True, False), ("30", True, False), ("30", False, False)], (50, 50))
    return dark(shapes=sh)


# ---------------------------------------------------------------- Apocalypse
def light(c, tail=None):
    out = [dot(c, 2.6, "#ffffff"), circle(c, 4.2, "#ffffff", 0.25, 0.01)]
    if tail:
        a, b = (c[0] + (tail[0] - c[0]) * 0.35, c[1] + (tail[1] - c[1]) * 0.35), tail
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        out += [line(a, m, "#ffffff", 1.5, 0.9), line(m, b, "#ffffff", 0.8, 0.8)]
    return out


def water(c, r=14):
    return [circle(c, r, "#3d8bff", 0.35, 0.01), ring(c, r, "#8fc0ff", 0.35, 0.85)]


def wtag(c, s):
    return [text(c, s, 3.0, "#cfe6ff")]


AP00 = {"H2": (35, 22), "H1": (43, 19.5), "ST": (37, 30), "MT": (45, 27.5), "D1": (53, 67), "D2": (61, 64), "D3": (57, 75), "D4": (65, 71.5)}


def ap00():
    sh = boss_ring() + [arrow((44, 23), (53, 63)), arrow((53, 63), (44, 23))]
    sh += wtag((43, 15), "10") + wtag((35, 17.5), "10") + wtag((37, 25.5), "29") + wtag((45, 23), "38")
    sh += wtag((57, 70.5), "29") + wtag((65, 67), "38")
    return dark(roles=AP00, shapes=sh)


AP01 = {"H2": (24, 24), "ST": (35, 18), "MT": (33, 33), "D1": (43, 30), "D2": (53, 66), "D3": (63, 58), "H1": (60, 75), "D4": (69, 71)}


def zlines(r, order):
    return [line(r[a], r[b], YELLOW, 0.55, 0.95) for a, b in zip(order, order[1:])]


def ap01():
    sh = boss_ring() + zlines(AP01, ["D1", "MT", "ST", "H2"]) + zlines(AP01, ["D2", "D3", "H1", "D4"])
    sh += wtag((24, 19.5), "10") + wtag((35, 13.5), "29") + wtag((33, 28.5), "38") + wtag((63, 53.5), "29") + wtag((60, 70.5), "10") + wtag((69, 66.5), "38")
    return dark(roles=AP01, shapes=sh)


AP02 = {"H2": (32, 25), "ST": (37, 21), "MT": (34, 30), "D1": (39, 27), "D2": (57, 71), "D3": (62, 67), "H1": (59, 76), "D4": (64, 73)}


def ap_lights_we(center=True):
    sh = light((16, 50), (20, 38)) + light((84, 50), (80, 62))
    if center:
        sh += light(C) + [line((36, 50), (64, 50), "#ffffff", 1.0, 0.7)]
    return sh


def ap02():
    sh = boss_ring() + water((35, 24)) + water((61, 72)) + ap_lights_we()
    return dark(roles=AP02, shapes=sh)


def ap02b():
    sh = [cone(C, 337.4, 180, 48, "#1c3aa0", 0.45), cone(C, 157.4, 180, 48, "#a01c2a", 0.4)]
    sh += ap_lights_we() + [line((2, 70), (98, 30), RED, 0.8, 0.95, dash=True)]
    sh += [text((30, 40), "T/H", 4, "#cfe0ff"), text((70, 62), "DPS", 4, "#ffd0d0")]
    return dark(shapes=sh)


def ap02c():
    sh = ap_lights_we()
    sh += arc(C, 36, 268, 222, "#3fa9ff", 0.9) + arc(C, 36, 88, 42, "#ff6a2a", 0.9)
    sw, ne = pol(225, 33), pol(45, 33)
    for base, n1, n2, f1, f2 in ((sw, pol(225, 24), pol(180, 24), pol(237, 47), pol(213, 47)), (ne, pol(45, 24), pol(0, 24), pol(57, 47), pol(33, 47))):
        for tgt, lab in ((n1, "1"), (n2, "2"), (f1, "3"), (f2, "3")):
            sh += [arrow(base, tgt, YELLOW, 0.55), text(pol(ang(base, tgt), dist(base, tgt) + 3, base), lab, 3.4, YELLOW)]
    return dark(shapes=sh)


AP03 = {"ST": (43, 10), "H2": (23, 22), "D1": (55, 31), "MT": (36, 43), "D3": (70, 58), "D2": (50, 69), "D4": (82, 76), "H1": (61, 87)}


def ap03():
    sh = ap_lights_we() + light((27, 30)) + light((73, 70))
    for s in ("ST", "H2", "D1", "MT"):
        sh.append(arrow((32, 28), AP03[s], "#ffffff", 0.45))
    for s in ("D3", "D2", "D4", "H1"):
        sh.append(arrow((67, 73), AP03[s], "#ffffff", 0.45))
    return dark(boss=C, roles=AP03, shapes=sh)


def ap04():
    sh = ap_lights_we() + light((26, 26), (17, 36)) + light((74, 74), (83, 64)) + red_aoe((50, 69), 14)
    return dark(roles=AP03, shapes=sh + boss_ring((50, 69), 0, 10))


AP05 = {"D4": (75, 9), "H1": (89, 25), "D3": (50, 24), "D2": (67, 31), "ST": (9, 74), "H2": (25, 88), "D1": (32, 67), "MT": (50, 74)}


def six_lights():
    out = []
    for a in (45, 90, 135, 225, 270, 315):
        out += light(pol(a, 34))
    return out


def spread14():
    out = []
    for p in AP05.values():
        out += [circle(p, 14, "#e070f0", 0.3, 0.01)]
    return out


def ap05():
    return dark(boss=C, roles=AP05, shapes=spread14() + six_lights() + [ring(C, 21, "#ffffff", 0.5, 0.8)])


def pale(c, r=18, o=0.42):
    return [circle(c, r, "#c8e8f0", o, 0.01)]


def ap06():
    sh = []
    for c in ((16, 50), C, (84, 50)):
        sh += pale(c)
    return dark(roles=AP05, shapes=spread14() + sh)


def ap07():
    sh = []
    for c in ((16, 50), C, (84, 50)):
        sh += pale(c, 18, 0.18)
    for a in (315, 135):
        sh += pale(pol(a, 34))
    sh += pale(pol(270, 34), 18, 0.25) + pale(pol(90, 34), 18, 0.25)
    sh += [circle(p, 14, RED, 0.25, 0.01) for p in AP05.values()]
    return dark(roles=AP05, shapes=sh + boss_ring())


GRP_D = (56, 44)
GRP_T = (44, 56)


def collapse(rT=None, rD=None):
    r = {}
    for k, s in enumerate(["D2", "D3", "D4", "H1"]):
        r[s] = (GRP_D[0] + (k % 2) * 2.2 - 1.1, GRP_D[1] + (k // 2) * 2.2 - 1.1)
    for k, s in enumerate(["MT", "ST", "H2", "D1"]):
        r[s] = (GRP_T[0] + (k % 2) * 2.2 - 1.1, GRP_T[1] + (k // 2) * 2.2 - 1.1)
    return r


def ap08():
    sh = []
    for a in (0, 90, 135, 180, 270, 315):
        sh += pale(pol(a, 33), 18)
    sh += [arrow((80, 18), (58, 41)), arrow((22, 80), (42, 58))]
    return dark(roles=collapse(), shapes=sh + boss_ring())


def ap09():
    sh = []
    for a in (0, 45, 135, 180, 225, 315):
        sh += pale(pol(a, 33), 18)
    sh += [ring(C, 14, "#ffffff", 0.5, 0.9)]
    return dark(roles=collapse(), shapes=sh + boss_ring())


def ap10():
    sh = []
    for a in (0, 45, 90, 180, 225, 270):
        sh += pale(pol(a, 33), 18)
    sh += water(GRP_D) + water(GRP_T) + [arrow((46, 60), (50, 90))]
    return dark(roles=collapse(), shapes=sh + boss_ring())


def ap11():
    r = collapse()
    r["ST"] = (50, 92)
    sh = []
    for a in (0, 45, 90, 135, 225, 270, 315):
        sh += pale(pol(a, 33), 18, 0.35)
    sh += red_aoe((50, 92), 18) + boss_ring((50, 74), 180, 12)
    return dark(roles=r, shapes=sh)


AP12 = {"D2": (38, 65), "D3": (41, 67), "D4": (39, 68.5), "H1": (42, 64), "MT": (56, 68), "ST": (59, 66), "H2": (60, 69), "D1": (57, 71)}


def ap12():
    r = dict(AP12)
    r["ST"] = (50, 90)
    sh = boss_ring((50, 72), 180, 12) + [arrow((50, 88), (56, 73))]
    return dark(roles=r, shapes=sh)


AP13 = {"D2": (27, 23), "D3": (37, 28), "D4": (30, 29), "H1": (33, 24), "MT": (63, 27), "ST": (65, 22), "H2": (69, 25), "D1": (71, 29)}


def ap13():
    sh = boss_ring((50, 72), 180, 12) + [arrow((48, 70), (35, 32), "#e0202a", 0.6), arrow((52, 70), (65, 32), "#e0202a", 0.6)]
    return dark(roles=AP13, shapes=sh)


AP14 = {"H1": (35, 51), "D4": (35, 54), "D2": (32, 53), "D3": (33, 49.5), "ST": (57, 55), "MT": (63, 54), "H2": (62, 51), "D1": (65, 57)}


def ap14():
    sh = water((35, 52)) + water((62, 55)) + boss_ring((50, 72), 180, 12)
    return dark(roles=AP14, shapes=sh)


# the eight configurations
WMX = {"A": (50, 26), "B": (74, 50), "C": (50, 74), "D": (26, 50), "1": (67, 33), "2": (67, 67), "3": (33, 67), "4": (33, 33)}


def ex(lights_at, clockwise, roles):
    a0 = lights_at
    sh = []
    for a in (a0, a0 + 180):
        p = pol(a, 34)
        tail = pol(a + (-22 if not clockwise else 22), 32)
        sh += light(p, tail)
    sh += light(C) + [line(pol(a0, 14), pol(a0 + 180, 14), "#ffffff", 1.0, 0.7)]
    sh += [line((2, 70), (98, 30), RED, 0.8, 0.95, dash=True)]
    taken = {tuple(round(v) for v in p) for p in roles.values()}
    wm = {k: list(v) for k, v in WMX.items() if not any(abs(v[0] - p[0]) < 4 and abs(v[1] - p[1]) < 4 for p in roles.values())}
    return dark(roles=roles, shapes=sh, waymarks=wm)


EX = {
    "ex1a": (0, False, {"ST": (67, 33), "MT": (74, 50), "H2": (75, 10), "H1": (88, 24), "D2": (33, 67), "D1": (26, 50), "D4": (25, 88), "D3": (11, 74)}),
    "ex1b": (0, True, {"MT": (33, 33), "ST": (26, 50), "H1": (25, 10), "H2": (11, 24), "D1": (67, 67), "D2": (74, 50), "D4": (88, 75), "D3": (75, 88)}),
    "ex2a": (45, False, {"ST": (74, 50), "MT": (67, 67), "H2": (94, 40), "H1": (94, 60), "D2": (26, 50), "D1": (33, 33), "D3": (6, 40), "D4": (6, 60)}),
    "ex2b": (45, True, {"MT": (50, 26), "ST": (33, 33), "H2": (40, 5), "H1": (60, 5), "D1": (50, 74), "D2": (67, 67), "D3": (40, 95), "D4": (60, 95)}),
    "ex3a": (270, False, {"ST": (33, 33), "MT": (50, 26), "H2": (11, 24), "H1": (25, 10), "D2": (67, 67), "D1": (50, 74), "D4": (89, 75), "D3": (75, 88)}),
    "ex3b": (270, True, {"MT": (33, 67), "ST": (50, 74), "H1": (11, 75), "H2": (25, 89), "D1": (67, 33), "D2": (50, 26), "D3": (88, 25), "D4": (75, 10)}),
    "ex4a": (315, False, {"ST": (50, 26), "MT": (67, 33), "H2": (40, 5), "H1": (60, 5), "D2": (50, 74), "D1": (33, 67), "D3": (40, 95), "D4": (60, 95)}),
    "ex4b": (315, True, {"MT": (26, 50), "ST": (33, 67), "H1": (6, 40), "H2": (6, 60), "D1": (74, 50), "D2": (67, 33), "D4": (94, 40), "D3": (94, 60)}),
}


def exscene(k):
    a, cw, r = EX[k]
    return ex(a, cw, r)
