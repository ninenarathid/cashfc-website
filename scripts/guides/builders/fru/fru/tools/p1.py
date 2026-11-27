"""P1 Fatebreaker scenes, redrawn from Tuufless's Mana PF diagrams (fru_mana/01/*)."""
from base import *

SEATS8 = ["MT", "D4", "H2", "D2", "ST", "D1", "H1", "D3"]   # clockwise from north
ANG8 = dict(zip(SEATS8, range(0, 360, 45)))


def ring8(r=16.5, rot=0, only=None):
    return {s: pol(a + rot, r) for s, a in ANG8.items() if not only or s in only}


def dragon(col=RED):
    return arc(C, 11, -140, 140, col, 0.9, 0.9, head=False, n=24)


def wedges(offset=0, spread=20, o=0.33):
    return [cone(C, a + offset, spread, 75, PINK, o) for a in range(0, 360, 45)]


def spreads(pos, r=11.5):
    out = []
    for p in pos:
        out += [circle(p, r, PURPLE, 0.38, 0.01), ring(p, r, "#e070f0", 0.3, 0.8)]
    return out


def stacks(pos, r=11.5):
    out = []
    for p in pos:
        out += [circle(p, r, RED, 0.42, 0.01), ring(p, r, "#ff6a6a", 0.3, 0.8)]
    return out


def cb01():
    return board(boss=C, roles=ring8(16.5), shapes=dragon())


def cb02():
    return board(boss=C, roles=ring8(16.5), shapes=wedges(0) + dragon())


def cb03a():
    rr = {"MT": 20, "D4": 28.5, "H2": 29, "D2": 20, "ST": 26, "D1": 20, "H1": 30, "D3": 27.5}
    roles = {s: pol(ANG8[s] + 22.5, rr[s]) for s in SEATS8}
    sh = wedges(0) + spreads(roles.values()) + dragon()
    for s in SEATS8:
        sh += curve(pol(ANG8[s] - 3, rr[s] - 6), pol(ANG8[s] + 17, rr[s] - 1.5), 0.25)
    return board(boss=C, roles=roles, shapes=sh)


def cb03b():
    roles = {}
    for s in SEATS8:
        a = ANG8[s] + (22.5 if s[0] == "D" else -22.5)
        roles[s] = pol(a, 19.6)
    sh = wedges(0) + stacks([pol(a, 19.6) for a in (337.5, 67.5, 157.5, 247.5)]) + dragon()
    for s in SEATS8:
        a0 = ANG8[s]
        a1 = a0 + (22.5 if s[0] == "D" else -22.5)
        sh += curve(pol(a0, 17), pol(a1 - (3 if s[0] == "D" else -3), 18.5), 0.2 if s[0] == "D" else -0.2)
    # partners overlap: nudge the DPS a little so both badges show
    for s in ("D3", "D4", "D2", "D1"):
        x, y = roles[s]
        roles[s] = (x - 1.6, y - 1.4)
    return board(boss=C, roles=roles, shapes=sh)


def cb04():
    return board(boss=C, roles=ring8(17.5), shapes=wedges(22.5) + dragon())


def cb05():
    sh = wedges(0) + dragon()
    return board(boss=C, roles=ring8(17.5, 22.5), shapes=sh)


# ---------------------------------------------------------------- Utopian Sky
US_POS = {"MT": (50, 7), "ST": (80, 20), "H2": (93.3, 49.7), "D2": (80.3, 80.5), "D4": (50, 92.3),
          "D1": (19.2, 80.5), "H1": (7.3, 49.7), "D3": (11.2, 27.3)}


def clones(raised=(), only=None):
    out = []
    for a in range(0, 360, 45):
        if only is not None and a not in only:
            continue
        c = pol(a, 53.5)
        if a in raised:
            out += arc(c, 9.5, a + 95, a + 265, "#ff3b3b", 1.3, 0.9, head=False, n=14)
        else:
            out += arc(c, 9.5, a + 95, a + 265, "#c8c8c8", 1.0, 0.9, head=False, n=14)
    return out


def bust(p, r=23.5):
    return [circle(p, r, PINK, 0.3, 0.01), ring(p, r, "#ff9aa6", 0.3, 0.7)]


def us01():
    return board(roles=US_POS, shapes=clones() + [dot((53.5, 4.5), 1.4, YELLOW)])


def us02():
    sh = clones(raised=(45, 180, 270)) + bust(US_POS["MT"]) + bust(US_POS["ST"])
    sh += [line((48, 3), (51, 10), RED, 0.5), line((50, 3), (53, 10), RED, 0.5), line((78, 17), (81, 24), RED, 0.5), line((80, 17), (83, 24), RED, 0.5)]
    sh += [dot((53.5, 4.5), 1.4, YELLOW)]
    return board(roles=US_POS, shapes=sh)


def us03():
    p = dict(US_POS)
    p.update({"ST": (63, 38.5), "H1": (34, 50), "D4": (50, 65.5)})
    sh = clones(raised=(45, 180, 270))
    sh += [arrow((78, 22), (65.5, 35.5)), arrow((12, 50), (31, 50)), arrow((50, 88), (50, 69))]
    return board(roles=p, shapes=sh)


def us04():
    p = dict(US_POS)
    p.update({"ST": (63, 38.5), "H1": (34, 50), "D4": (50, 65.5), "MT": (50, 33.5), "H2": (65, 50), "D1": (37, 62)})
    sh = clones(raised=(45, 180, 270))
    sh += [arrow((50, 12), (50, 30)), arrow((88, 50), (68.5, 50)), arrow((22, 77), (34.5, 64.5))]
    return board(roles=p, shapes=sh)


def us05():
    p = {"D1": (27, 9.5), "MT": (18.5, 17), "D3": (11, 27), "H1": (27, 27.5),
         "H2": (72.5, 73), "D4": (90, 73), "ST": (82, 82), "D2": (73, 89.5)}
    sh = clones(raised=(45, 180, 270))
    sh += [cone(C, 45, 135, 75, PINK, 0.34), cone(C, 225, 135, 75, PINK, 0.34)]
    sh += spreads(p.values(), 8.5)
    sh += [line(pol(22.5, 52), pol(202.5, 52), RED, 0.7, 0.95, dash=True)]
    return board(roles=p, shapes=sh)


def us06():
    roles = {"MT": (49.5, 25), "D3": (31, 31), "D4": (68, 32), "H1": (26, 50), "H2": (72, 50.5),
             "D1": (34.5, 66), "D2": (67, 67.5), "ST": (50, 73.5)}
    sh = wedges(0) + [ring((50, 15), 10.5, "#e8e8e8", 0.9, 0.85), ring(C, 10.5, "#e8e8e8", 0.9, 0.85)]
    return board(boss=[C, (50, 15)], roles=roles, shapes=sh)


CIRC = {0: RED, 45: BLUE, 90: BLUE, 135: BLUE, 180: BLUE, 225: RED, 270: RED, 315: RED}


def circles8(big=None):
    out = []
    for a, col in CIRC.items():
        p = pol(a, 36.5)
        if big and col == big:
            out += [circle(p, 19, PINK, 0.28, 0.01)]
        out += [circle(p, 11.5, col, 0.35, 0.01), ring(p, 11.5, col, 0.6, 0.9)]
    return out


def prey(p):
    return [dot(p, 1.6, "#ffffff"), ring(p, 1.6, RED, 0.45), dot(p, 0.5, RED)]


def us07():
    sh = circles8() + [rect(C, 96, 48, 0, "#d070ff", 0.35)]
    roles = {"H1": (51.5, 17), "MT": (48, 20), "D1": (50, 18.5), "ST": (54, 79), "H2": (50.5, 80), "D2": (52, 82),
             "D3": (48.5, 82), "D4": (53, 81)}
    return board(roles={"H1": roles["H1"], "MT": roles["MT"], "ST": roles["ST"], "H2": roles["H2"]}, shapes=sh)


def us08():
    sh = circles8() + [rect(C, 23, 96, 0, PINK, 0.3)]
    roles = {"MT": (66, 36), "H1": (68, 38), "ST": (69, 39), "H2": (66, 39.5),
             "D2": (67, 64), "D3": (69, 66), "D1": (68, 68), "D4": (66, 66)}
    sh += prey((70.5, 34)) + prey((71, 66.5))
    sh += [arrow((76, 37), (55, 37)), arrow((76, 67), (55, 67))]
    return board(roles={k: roles[k] for k in ("MT", "H1", "D2", "D1")}, shapes=sh)


def us09():
    sh = circles8(big=RED)
    sh += [arrow((58, 32.5), (84, 32.5)), arrow((58, 68), (84, 68))]
    sh += prey((93, 29.5)) + prey((93.5, 66.5))
    return board(roles={"MT": (88, 34), "H1": (89.5, 32.5), "D2": (89, 67), "D1": (90.5, 70)}, shapes=sh)


def us10():
    sh = [circle((92, 30), 14, RED, 0.38, 0.01), ring((92, 30), 14, "#ff6a6a", 0.35), circle((91.5, 70), 14, RED, 0.38, 0.01), ring((91.5, 70), 14, "#ff6a6a", 0.35)]
    sh += prey((93, 29.5)) + prey((93.5, 66.5))
    return board(roles={"MT": (88.5, 34), "H1": (90, 32.5), "D2": (89.5, 67.5), "D1": (91, 70)}, shapes=sh)


# ---------------------------------------------------------------- Fall of Faith
LINE = ["H1", "H2", "MT", "ST", "D1", "D2", "D3", "D4"]
LX = dict(zip(LINE, (28, 34.3, 40.5, 46.6, 52.7, 58.9, 65.1, 71.3)))
NW_C, N_C, NE_C = (15, 13.5), (50, 2), (84.5, 13.5)


def line_up(skip=()):
    return {s: (LX[s], 63.5) for s in LINE if s not in skip}


def fdragon():
    return arc(C, 11, -150, 150, RED, 0.9, 0.9, head=False, n=24)


def fof01():
    return board(boss=C, roles=line_up(), shapes=fdragon(), iconSize=5.8)


def fof02():
    r = line_up()
    sh = fdragon() + tether(C, (36.5, 61), "#5a5cff") + [arrow((35.5, 58), (34.5, 51.5))] + prey((37.5, 59))
    return board(boss=C, roles=r, shapes=sh, iconSize=5.8)


def fof03():
    r = line_up(skip=("H2",))
    r["H2"] = (34.5, 50)
    sh = fdragon() + clones(raised=(315,), only=(315,)) + tether(C, (34.5, 50), "#5a5cff") + tether(NW_C, (58.5, 61), "#7a4dff")
    sh += [arrow((60, 59), (64.5, 52))] + prey((37, 48)) + prey((61, 60.5))
    return board(boss=C, roles=r, shapes=sh)


def fof04():
    r = line_up(skip=("H2", "D2"))
    r.update({"H2": (34.5, 50), "D2": (66.5, 50)})
    sh = fdragon() + clones(raised=(315, 0), only=(315, 0)) + tether(C, (34.5, 50), "#5a5cff") + tether(NW_C, (66.5, 50), "#7a4dff")
    sh += tether(N_C, (53, 61), "#ff8a1f") + [arrow((51, 60), (29.5, 51))] + prey((37, 48)) + prey((69, 48)) + prey((55.5, 61))
    return board(boss=C, roles=r, shapes=sh)


def fof05():
    r = line_up(skip=("H2", "D2", "D1"))
    r.update({"H2": (34.5, 52), "D1": (27.5, 52), "D2": (65.5, 52)})
    sh = fdragon() + clones(raised=(315, 0, 45), only=(315, 0, 45)) + tether(C, (34.5, 52), "#5a5cff") + tether(NW_C, (65.5, 52), "#7a4dff")
    sh += tether(N_C, (27.5, 52), "#ff8a1f") + tether(NE_C, (65, 62), "#ff8a1f") + [arrow((66, 60), (71.5, 50))]
    sh += prey((30, 49.5)) + prey((37, 49.5)) + prey((68, 49.5)) + prey((67.5, 60))
    return board(boss=C, roles=r, shapes=sh)


FOF6 = {"H1": (35, 42), "D1": (27.5, 50), "H2": (35, 50), "MT": (35, 57.5),
        "ST": (66.5, 42), "D2": (66.5, 50), "D3": (74.5, 50), "D4": (66.5, 57.5)}


def fof_tethers(which=("C", "NW", "N", "NE"), pos=FOF6):
    sh = []
    if "C" in which:
        sh += tether(C, pos["H2"], "#5a5cff")
    if "NW" in which:
        sh += tether(NW_C, pos["D2"], "#7a4dff")
    if "N" in which:
        sh += tether(N_C, pos["D1"], "#ff8a1f")
    if "NE" in which:
        sh += tether(NE_C, pos["D3"], "#ff8a1f")
    return sh


def fof06():
    sh = fdragon() + clones(raised=(315, 0, 45), only=(315, 0, 45)) + fof_tethers()
    for s in ("H2", "D1", "D2", "D3"):
        sh += prey((FOF6[s][0] + 2.5, FOF6[s][1] - 2.5))
    return board(boss=C, roles=FOF6, shapes=sh)


def fof07():
    p = FOF6
    sh = [cone(p["H2"], a, 112, 80, "#b04ce0", 0.38) for a in (0, 270, 180)]
    sh += fdragon() + clones(raised=(315, 0, 45), only=(315, 0, 45)) + fof_tethers()
    sh += curve((28, 56), (34, 55.5), -0.6) + curve((33.5, 55.5), (28.5, 56), -0.6)
    for s in ("H2", "D1", "D2", "D3"):
        sh += prey((p[s][0] + 2.5, p[s][1] - 2.5))
    return board(boss=C, roles=p, shapes=sh)


FOF8 = {"H1": (24.5, 47.5), "MT": (22.5, 52), "H2": (28, 52), "D1": (35, 50),
        "ST": (66.5, 42), "D2": (66.5, 50), "D3": (74.5, 50), "D4": (66.5, 57.5)}


def fof08():
    p = FOF8
    sh = [cone(p["D2"], a, 112, 80, "#b04ce0", 0.38) for a in (0, 90, 180)]
    sh += fdragon() + clones(raised=(315, 0, 45), only=(315, 0, 45)) + fof_tethers(("NW", "N", "NE"), p)
    sh += curve((66, 56), (73, 55.5), -0.6) + curve((72.5, 55.5), (67, 56), -0.6)
    for s in ("D1", "D2", "D3"):
        sh += prey((p[s][0] + 2.5, p[s][1] - 2.5))
    return board(boss=C, roles=p, shapes=sh)


FOF9 = {"H1": (24.5, 47.5), "MT": (22.5, 52), "H2": (28, 52), "D1": (35, 50),
        "ST": (66.5, 42), "D2": (66.5, 50), "D3": (74.5, 50), "D4": (66.5, 57.5)}


def fof09():
    p = FOF9
    sh = [cone(p["D1"], 270, 82, 80, RED, 0.42)]
    sh += fdragon() + clones(raised=(0, 45), only=(0, 45)) + fof_tethers(("N", "NE"), p)
    sh += curve((66, 56), (73, 55.5), -0.6) + curve((72.5, 55.5), (67, 56), -0.6)
    for s in ("D1", "D3"):
        sh += prey((p[s][0] + 2.5, p[s][1] - 2.5))
    return board(boss=C, roles=p, shapes=sh)


FOF10 = {"H1": (24.5, 47.5), "MT": (22.5, 52), "H2": (28, 52), "D1": (35, 50),
         "D2": (66.5, 50), "D3": (74, 50), "ST": (78.5, 50), "D4": (75.5, 53)}


def fof10():
    p = FOF10
    sh = [cone(p["D3"], 90, 82, 80, RED, 0.42)]
    sh += fdragon() + clones(raised=(45,), only=(45,)) + fof_tethers(("NE",), p)
    sh += prey((p["D3"][0] - 2, p["D3"][1] - 3))
    return board(boss=C, roles=p, shapes=sh)


# ---------------------------------------------------------------- Towers
TW = [(19, 27), (11.5, 50), (19, 73)]


def towers(pips=None):
    out = []
    for c in TW:
        out += [circle(c, 8.5, "#e8dc6a", 0.32, 0.01), ring(c, 8.5, "#f4e98a", 0.45, 0.9)]
        for a in (90, 270):
            out += [line(pol(a + 30, 9.5, c), pol(a, 7, c), "#f0b020", 0.5), line(pol(a - 30, 9.5, c), pol(a, 7, c), "#f0b020", 0.5)]
    if pips:
        for c, n in zip(TW, pips):
            out.append(text((c[0] + 13, c[1]), str(n), 7, "#ffffff"))
    return out


def tdragon():
    return arc(C, 11, -130, 130, RED, 0.9, 0.9, head=False, n=24)


def tw01():
    r = {"H1": (19.5, 27), "H2": (11, 50), "D4": (18, 73), "D1": (36, 27), "D2": (36, 50), "D3": (36, 72.5),
         "MT": (66, 32), "ST": (66, 65)}
    return board(boss=C, roles=r, shapes=towers() + tdragon() + [dot((68.5, 62), 1.4, YELLOW)])


def tw02():
    r = {"H1": (19.5, 27), "H2": (11, 50), "D1": (17.5, 47.5), "D2": (17.5, 53), "D4": (18, 73), "D3": (24, 71.5)}
    return board(boss=C, roles=r, shapes=towers((1, 3, 2)) + tdragon())


def tw03a():
    r = {"H1": (19, 27), "H2": (10, 50), "D1": (14.5, 47.5), "D2": (14.5, 53), "D4": (18.5, 73), "D3": (22, 71.5),
         "MT": (86.5, 32), "ST": (86.5, 65)}
    sh = towers() + [rect(C, 48, 96, 0, "#9b4fd0", 0.42), rect(C, 24, 96, 0, PINK, 0.25)] + tdragon() + [dot((89, 62), 1.4, YELLOW)]
    return board(boss=C, roles=r, shapes=sh)


def tw03b():
    r = {"H1": (32.5, 27), "H2": (29, 49.5), "D1": (32.5, 47), "D2": (32.5, 52.5), "D4": (32.5, 73), "D3": (34, 71.5),
         "MT": (66, 32), "ST": (66, 65)}
    sh = towers() + [rect(C, 24, 96, 0, PINK, 0.32)] + tdragon()
    sh += [arrow((37, 28), (46, 27.5)), arrow((37, 50), (46, 50)), arrow((37, 74), (46, 73.5)),
           arrow((61, 32), (52, 32)), arrow((61, 65), (52, 65)), dot((68.5, 62), 1.4, YELLOW)]
    return board(boss=C, roles=r, shapes=sh)


def tw04():
    r = {"H1": (19, 27), "D1": (14.5, 48.5), "H2": (9.5, 52), "D2": (13, 55), "D4": (18.5, 73), "D3": (22, 72),
         "MT": (86.5, 33), "ST": (86, 66)}
    sh = towers() + bust((86.5, 33), 20) + bust((86, 66), 20) + tdragon() + [dot((89, 63), 1.4, YELLOW)]
    return board(boss=C, roles=r, shapes=sh)
