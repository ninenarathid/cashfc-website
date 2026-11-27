"""P4 scenes (fru_mana/04/*): two bosses, the Fragment of Fate north."""
from base import *
from p3 import boss_ring, red_aoe, water

FRAG = (50, 11)
WM = {"A": (50, 26), "B": (74, 50), "C": (50, 74), "D": (26, 50), "1": (67, 33), "2": (67, 67), "3": (33, 67), "4": (33, 33)}


def gaia(wm=False, frag=True, **kw):
    sh = [ring(C, 41, "#8f86e0", 0.25, 0.4), ring(C, 21, "#8f86e0", 0.25, 0.4)]
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 48.4), pol(a, 50.5), "#555555", 0.7, 0.9))
    if frag:
        sh += [ring(FRAG, 7.5, "#d8d8e0", 1.0, 0.9)]
    s = {"frame": [1, 1], "bg": "#f3f3f3",
         "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": "#262a78", "lines": False, "edge": "#10123a"},
         "waymarks": ({k: list(v) for k, v in WM.items()} if wm else None), "markSize": 5.6, "iconSize": 6.6, "bossSize": 8}
    s["shapes"] = sh + kw.pop("shapes", [])
    s.update(kw)
    return s


def danger():
    return [circle(FRAG, 22, "#a0102a", 0.45, 0.01)]


def two_bosses(y=50, dx=0, gap=9):
    return boss_ring((50 - dx, y), 0, 14) + boss_ring((50 + dx, y + gap), 180, 14)


def chain(pairs, pos, col="#f0f0d0"):
    return [line(pos[a], pos[b], col, 0.4, 0.95) for a, b in pairs]


def ytower(c, r=8.5):
    out = [circle(c, r, "#e8dc6a", 0.3, 0.01), ring(c, r, "#f4e98a", 0.45, 0.9)]
    for a in (45, 135, 225, 315):
        out.append(line(pol(a, r - 2, c), pol(a, r + 2.5, c), "#f0b020", 0.5))
    return out


def ar00():
    sh = [ring(FRAG, 9, "#e02c2c", 0.8, 0.8)] + [circle((33, 33), 6, "#ffffff", 0.2, 0.01), circle((67, 33), 6, "#ffffff", 0.2, 0.01)]
    return gaia(wm=True, roles={"MT": (31, 31), "ST": (69, 31)}, shapes=sh)


def ar01():
    sh = [circle((36, 30), 11.5, PINK, 0.35, 0.01), circle((64, 30), 13, "#ff6070", 0.5, 0.01)] + boss_ring(C, 180, 14)
    sh += [arrow((33, 33), (45, 47)), arrow((67, 33), (53, 47))]
    return gaia(roles={"ST": (47.5, 49), "H1": (52, 49), "MT": (50, 70)}, shapes=sh)


DL0 = {"H1": (33, 51), "H2": (45, 46), "MT": (55, 46), "ST": (67, 51), "D1": (33, 71), "D2": (45, 79), "D3": (55, 79), "D4": (67, 71)}


def dl01():
    sh = two_bosses() + chain([("H1", "D1"), ("H1", "D2"), ("ST", "D1"), ("ST", "D2")], DL0) + chains_mark(DL0, ["H1", "ST", "D1", "D2"])
    sh += [dot((30, 47), 1.3, "#7ec8ff"), dot((47.5, 42.5), 1.3, "#7ec8ff")]
    return gaia(roles=DL0, shapes=sh)


def chains_mark(pos, seats):
    out = []
    for s in seats:
        out += [dot((pos[s][0] + 2.6, pos[s][1] - 2.6), 1.3, "#ffd84d")]
    return out


def dl02(kind):
    pos = dict(DL0)
    if kind == "a":
        pairs = [("H1", "D1"), ("H1", "D2"), ("ST", "D1"), ("ST", "D2")]
        extra = []
    elif kind == "b":
        pairs = [("H1", "ST"), ("H1", "D1"), ("D1", "D2"), ("D2", "ST")]
        extra = curve((46, 76), (62, 56), -0.25, RED, 0.6) + curve((66, 56), (50, 76), -0.25, RED, 0.6)
    else:
        pairs = [("H1", "ST"), ("H1", "D2"), ("D1", "ST"), ("D1", "D2")]
        extra = curve((36, 70), (62, 56), 0.25, RED, 0.6) + curve((65, 56), (39, 71), 0.25, RED, 0.6)
    dim = {s: pos[s] for s in ("H1", "ST", "D1", "D2")}
    sh = two_bosses() + chain(pairs, pos) + chains_mark(pos, ["H1", "ST", "D1", "D2"]) + [dot((30, 47), 1.3, "#7ec8ff"), dot((47.5, 42.5), 1.3, "#7ec8ff")] + extra
    return gaia(roles=dim, shapes=sh)


DL3 = {"H1": (46, 26), "ST": (54, 26), "H2": (41, 44), "MT": (58, 44), "D3": (41, 54), "D4": (58, 54), "D1": (47, 74), "D2": (53, 74)}


def dl03(swap=False):
    sh = ytower((50, 26), 9) + ytower((50, 73), 9) + two_bosses(50, 0, 10)
    sh += chain([("H1", "D1"), ("H1", "D2"), ("ST", "D1"), ("ST", "D2")], DL3)
    sh += [dot((48, 22), 1.3, "#7ec8ff"), dot((43.5, 40.5), 1.3, "#7ec8ff")]
    if swap:
        sh += curve((37, 46), (37, 53), 0.9) + curve((37, 52), (37, 45), 0.9)
    return gaia(roles=DL3, shapes=sh)


DL4 = {"H1": (46, 26), "ST": (54, 26), "D3": (38, 48), "MT": (59, 48), "H2": (38, 58), "D4": (59, 55), "D1": (45, 73), "D2": (55, 73)}


def dl04():
    sh = [cone(C, ang(C, DL4[s]), 50, 70, "#f0c8a0", 0.28) for s in ("D3", "MT", "H2", "D4")]
    sh += ytower((50, 26), 9) + ytower((50, 73), 9) + two_bosses(50, 0, 10)
    sh += chain([("H1", "D1"), ("H1", "D2"), ("ST", "D1"), ("ST", "D2")], DL4)
    return gaia(roles=DL4, shapes=sh)


DL5 = {"H2": (41, 36), "D2": (58, 36), "D3": (30, 50), "MT": (68, 50), "H1": (30, 66), "D4": (68, 66), "ST": (41, 80), "D1": (57, 80)}


def dl05(spirit=False):
    sh = danger() + two_bosses(50, 0, 10)
    sh += chain([("H2", "ST"), ("H2", "D1"), ("D2", "ST"), ("D2", "D1")], DL5)
    sh += [dot((44, 32.5), 1.3, "#7ec8ff"), dot((33, 62.5), 1.3, "#7ec8ff")]
    if spirit:
        sh = [circle((41, 36), 12, PINK, 0.38, 0.01)] + sh
    return gaia(wm=True, roles=DL5, shapes=sh)


def dl07():
    sh = [rect((74, 50), 48, 96, 0, "#7ec8ff", 0.35)] + danger() + water((30, 33), 14) + water((30, 67), 14) + two_bosses(50, 0, 10)
    r = {"H1": (29, 32), "D3": (31.5, 34), "H2": (29, 66), "D1": (31.5, 68)}
    return gaia(wm=True, roles=r, shapes=sh)


def dl08():
    sh = [circle((8, 52), 19, PINK, 0.35, 0.01)] + boss_ring(C, 270, 14) + [arrow((37, 37), (12, 49))]
    return gaia(roles={"MT": (8, 52), "H1": (40, 37), "H2": (43, 64)}, shapes=sh)


def am01():
    sh = boss_ring((40, 50), 270, 14) + boss_ring((60, 50), 90, 14) + red_aoe((25, 50), 9) + red_aoe((50, 49), 9)
    r = {"MT": (25, 50), "ST": (50, 49)}
    return gaia(roles=r, shapes=sh)


def am02():
    sh = boss_ring((40, 50), 270, 14) + boss_ring((60, 50), 90, 14) + red_aoe((48, 49), 9) + red_aoe((75, 50), 9)
    return gaia(roles={"MT": (48, 49), "ST": (75, 50)}, shapes=sh)


def morn():
    sh = boss_ring((40, 50), 270, 14) + boss_ring((60, 50), 90, 14) + red_aoe((50, 50), 7)
    return gaia(roles={"MT": (50, 50)}, shapes=sh)


# ---------------------------------------------------------------- Crystallize Time
HGC = {"N": (50, 24), "S": (50, 76), "NW": (27, 37), "NE": (73, 37), "SW": (27, 63), "SE": (73, 63)}


def hgs(which=None):
    out = []
    for k, p in HGC.items():
        if which is None or k in which:
            out.append(dot(p, 2.4, "#2fd34a"))
    return out


def tag(c, s, col="#c2453c"):
    return [dot(c, 2.9, col), ring(c, 2.9, "#ffffff", 0.3, 0.9), text((c[0], c[1] + 5.2), s, 2.6, "#ffffff")]


RED_C = "#c2453c"
BLUE_C = "#3a62c2"


def ct01a():
    sh = hgs() + [line(HGC["N"], HGC["S"], YELLOW, 0.6), line(HGC["NW"], HGC["SE"], "#d24cff", 0.6)]
    sh += tag((21, 50), "Ice") + tag((77, 46), "Ice") + tag((16, 83), "Aero") + tag((83, 82), "Aero")
    return gaia(shapes=sh)


def ct01b():
    sh = hgs() + [line(HGC["N"], HGC["S"], YELLOW, 0.6), line(HGC["NW"], HGC["SE"], "#d24cff", 0.6)]
    sh += [{"t": "line", "from": [18, 14], "to": [25, 11], "c": "#38d36b", "wd": 0.6, "o": 0.95}]
    sh += [circle((22, 14), 3.2, "#38d36b", 0.5, 0.01)]
    sh += tag((12, 8), "Eruption", BLUE_C) + tag((80, 80), "Water", BLUE_C) + tag((85, 76), "Holy", BLUE_C) + tag((76, 84), "Ice", BLUE_C)
    sh += tag((16, 83), "Aero") + tag((21, 50), "Ice") + tag((77, 46), "Ice")
    return gaia(shapes=sh)


def ct02():
    sh = [circle((50, 25), 28, PINK, 0.3, 0.01), circle((50, 75), 28, PINK, 0.3, 0.01)] + hgs()
    sh += [circle((81, 82), 12, "#7ec8ff", 0.35, 0.01)]
    sh += tag((12, 8), "Eruption", BLUE_C) + tag((21, 50), "Ice") + tag((77, 46), "Ice") + tag((17, 82), "Aero")
    sh += tag((80, 80), "Blue x3", BLUE_C) + tag((86, 85), "Aero")
    sh += [arrow((19, 86), (27, 91)), arrow((79, 86), (72, 91))]
    return gaia(shapes=sh)


def ct03():
    sh = [circle((27, 90), 20, "#38d36b", 0.3, 0.01), circle((73, 88), 20, "#38d36b", 0.3, 0.01)]
    sh += [circle((23, 51), 7, "#7ee8f0", 0.3, 0.01), circle((77, 47), 7, "#7ee8f0", 0.3, 0.01)] + hgs()
    sh += tag((21, 12), "Eruption", BLUE_C) + tag((23, 51), "Ice") + tag((77, 47), "Ice") + tag((27, 91), "Aero") + tag((70, 89), "Aero")
    sh += [arrow((22, 16), (25, 22)), arrow((24, 44), (27, 26)), arrow((76, 41), (52, 16)), arrow((72, 82), (34, 22), RED, 0.5)]
    return gaia(shapes=sh)


def ct04():
    sh = [circle((27, 27), 14, "#f0d040", 0.6, 0.01), ring((27, 27), 14, "#fff0a0", 0.5, 0.9), line((10, 10), (50, 50), "#ffffff", 0.4, 0.8, True)] + hgs()
    sh += tag((25, 27), "Blue x4", BLUE_C) + tag((50, 12), "Ice") + tag((25, 92), "Aero") + tag((43, 92), "Aero")
    sh += [arrow((31, 22), (44, 12)), arrow((26, 88), (30, 72)), arrow((44, 88), (48, 72))]
    return gaia(shapes=sh)


def chevrons_x(x, y0, y1, d=-1):
    out = [rect((x, (y0 + y1) / 2), 22, y1 - y0, 0, PINK, 0.28)]
    for y in range(int(y0) + 6, int(y1), 12):
        out += [line((x + 3 * -d, y - 3), (x - 3 * -d, y), "#ffb070", 0.7), line((x - 3 * -d, y), (x + 3 * -d, y + 3), "#ffb070", 0.7)]
    return out


def chevrons_y(y, x0, x1, d=1):
    out = [rect(((x0 + x1) / 2, y), x1 - x0, 22, 0, PINK, 0.28)]
    for x in range(int(x0) + 6, int(x1), 12):
        out += [line((x - 3, y - 3 * d), (x, y + 3 * d), "#ffb070", 0.7), line((x, y + 3 * d), (x + 3, y - 3 * d), "#ffb070", 0.7)]
    return out


def ct05():
    sh = chevrons_x(85, 6, 94) + hgs()
    sh += tag((50, 9), "All", BLUE_C) + tag((30, 68), "Aero") + tag((70, 68), "Aero")
    sh += [arrow((32, 72), (46, 92)), arrow((68, 72), (54, 92))]
    return gaia(shapes=sh)


def ct06():
    sh = [rect((85, 52), 24, 96, 0, PINK, 0.3), circle((20, 40), 22, PINK, 0.28, 0.01), circle((78, 62), 22, PINK, 0.28, 0.01)] + hgs()
    sh += tag((48, 8), "All", BLUE_C) + tag((42, 82), "Aero") + tag((40, 93), "Aero")
    return gaia(shapes=sh)


PUD = {1: (78, 50), 2: (71, 68), 3: (29, 68), 4: (22, 50)}


def puddles():
    out = []
    for n, p in PUD.items():
        out += [circle(p, 3.6, "#fff3c0", 0.85, 0.01), text(p, str(n), 3.6, "#5a4000")]
    return out


def ct07():
    sh = [rect((62, 50), 24, 96, 0, PINK, 0.3)] + hgs() + puddles()
    sh += tag((46, 15), "Ice") + tag((37, 36), "Blue", BLUE_C) + tag((45, 50), "Blue", BLUE_C) + tag((46, 65), "Aero")
    sh += [arrow((47, 20), (39, 31)), arrow((48, 20), (45, 45))]
    return gaia(shapes=sh)


def ct08():
    sh = chevrons_y(13, 2, 98) + [rect((38, 50), 24, 96, 0, PINK, 0.3)] + hgs()
    pts = [(55, 31), (20, 48), (62, 49), (55, 58), (21, 68), (70, 68)]
    for p in pts:
        sh += [dot(p, 2.6, "#c8c8d0")]
    sh += [arrow((58, 22), (56, 27))]
    return gaia(shapes=sh)


def ct09():
    sh = [rect((50, 38), 96, 24, 0, PINK, 0.3), rect((14, 50), 24, 96, 0, PINK, 0.3)] + hgs()
    for x in (30, 41, 48, 57, 69, 72):
        sh += [dot((x, 54), 2.6, "#c8c8d0")]
    return gaia(shapes=sh)


CT10 = {"MT": (35, 27), "ST": (66, 27), "D1": (50, 40), "D2": (51, 41)}


def ct10():
    sh = [rect((50, 62), 96, 24, 0, PINK, 0.3)] + hgs()
    return gaia(roles={"MT": (35, 27), "ST": (66, 27), "D1": (50, 40)}, shapes=sh)


def ct12():
    sh = [circle((50, 100), 55, PINK, 0.28, 0.01), rect((50, 86), 96, 24, 0, PINK, 0.3)] + hgs()
    return gaia(roles={"MT": (24, 17), "ST": (77, 17), "D1": (50, 40)}, shapes=sh)


CT13 = {"MT": (22, 17), "ST": (77, 17), "D3": (33, 32), "D4": (67, 32), "H1": (25, 50), "H2": (74, 50), "D1": (33, 68), "D2": (67, 68)}


def ct13(spirit=False):
    sh = danger() + hgs() + [ring(C, 17, "#9a9ab0", 0.9, 0.6)]
    if spirit:
        sh += [circle((74, 50), 14, PINK, 0.38, 0.01)]
    else:
        for s in ("D3", "D4", "H1", "H2", "D1", "D2"):
            sh.append(arrow(pol(ang(C, CT13[s]), 5), pol(ang(C, CT13[s]), dist(C, CT13[s]) - 6)))
    return gaia(roles=CT13, shapes=sh)


def ct15():
    sh = hgs() + [dot((27, 13), 1.4, "#ffffff"), dot((79, 12), 1.4, "#ffffff"), dot((53, 37), 1.4, "#ffffff")]
    return gaia(roles={"MT": (24, 17), "ST": (76, 16), "D1": (50, 40)}, shapes=sh)


def ct16():
    sh = hgs() + [arrow((50, 14), (50, 62), RED, 0.6)]
    return gaia(roles={"MT": (24, 63), "ST": (76, 63), "D1": (50, 92)}, shapes=sh)
