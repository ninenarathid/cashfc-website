# ---------------------------------------------------------------- boss 2: Gladiator of Sil'dih
import json as _json
CELLS = _json.load(open(r"scripts/guides/.work/sildihn/cells.json", encoding="utf-8"))
PINK = "#c86fc0"
MARK = "#d8c24a"


def halfplane(p, d, c=ORANGE, o=0.42):
    """Everything on the d side of the line through p (d = the direction into the covered side)."""
    return rect(off(p, d, 100), 300, 200, d, c, o, 0.12)


L1 = ((25, 29), (71, 72))     # the north-west mirage's charge, to the south-east
L2 = ((74, 29), (29, 72))     # the north-east mirage's charge, to the south-west


def charge_lines():
    out = []
    for (a, b), d in ((L1, 135), (L2, 225)):
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        ln = math.hypot(b[0] - a[0], b[1] - a[1])
        out.append(rect(mid, 4.6, ln, d, PINK, 0.55, 0.3))
        for t in (0.12, 0.3, 0.48, 0.66, 0.84):
            c = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            out += chevron(c, d, 3.0, 1.4, "#f0a0e8", 0.5, 0.9)
    for c, d in (((50, 51), 135), ((50, 51), 225), ((60, 62), 135), ((40, 62), 225), ((68, 70.5), 135), ((32, 70.5), 225)):
        out.append(rect(c, 7.5, 2.0, d, MARK, 0.85, 0.2))
    return out


def rush(mir, hits, **rl):
    sh = [halfplane(p, d) for p, d in hits] + charge_lines()
    return board(grid=False, boss=[[R(m[0]), R(m[1])] for m in mir], bossSize=7.5, shapes=sh, roles=roles(**rl))


def b2_02():
    return rush([(20, 22), (80, 20)], [])


def b2_03():
    return rush([(50, 51), (59, 62)], [((50, 51), 225), ((59, 62), 135)], H1=(62.3, 48.1), D1=(58.7, 52.8), MT=(63.6, 53.2), D2=(61, 55.5))


def b2_04():
    return rush([(50, 51), (59, 62)], [((50, 51), 45), ((59, 62), 315)], MT=(54.5, 70.4), H1=(59.1, 67.4), D1=(59.9, 72.3), D2=(57, 73))


def b2_05():
    return rush([(50, 51), (68, 71)], [((50, 51), 225), ((68, 71), 135)], MT=(70.8, 63.4), H1=(73.9, 58.3), D1=(67.7, 59.8), D2=(71, 61))


def b2_06():
    return rush([(50, 51), (68, 71)], [((50, 51), 45), ((68, 71), 315)], MT=(70.4, 81.1), H1=(69.8, 76.3), D1=(65.3, 81), D2=(67.5, 79))


def b2_07():
    return rush([(41, 62), (68.5, 71)], [((41, 62), 225), ((68.5, 71), 135)], MT=(58.3, 67.8), H1=(60.5, 70.8), D1=(60.5, 75.1), D2=(58, 73))


def b2_08():
    return rush([(41, 62), (68.5, 71)], [((41, 62), 45), ((68.5, 71), 315)], MT=(56.2, 86.4), H1=(60.5, 81.7), D1=(63.8, 85.7), D2=(60, 87.5))


def b2_09():
    sh = []
    for y in (57, 63.5, 70):
        sh += chev2((44, y), 90) + chev2((57, y), 270)
    return board(grid=False, boss=[50, 47], bossSize=10, shapes=sh, roles=roles(MT=(50.9, 56), H1=(49.9, 63.1), D1=(51.5, 68.5), D2=(49, 71)))


# Curse of the Fallen + Ring of Might: the three debuffs drawn as small marks above a head
DEB = {"E": "#8f9cff", "T": "#c76cff", "L": "#ff6a7a"}


def deb(p, kinds):
    out = []
    n = len(kinds)
    for i, k in enumerate(kinds):
        c = (p[0] + (i - (n - 1) / 2) * 2.6, p[1] - 5.2)
        out += [dot(c, 1.2, DEB[k]), ring(c, 1.2, "#ffffff", 0.18, 0.8)]
    return out


def rings(n=None):
    out = [ring((50, 50), 10, "#e8d07a", 0.45, 0.9), ring((50, 50), 21.5, "#e08a2a", 0.55, 0.95), ring((50, 50), 35.5, "#d0457b", 0.55, 0.95)]
    if n:
        out.append(text((50, 42.5), str(n), 4.2, "#9fb8d8"))
    return out


def fallen(n=None, aoes=(), puddle=None, debs=None, extra=(), **rl):
    sh = list(aoes) + (rings(n) if n is not None else [])
    if puddle:
        sh += [dot(puddle, 3.4, "#4d8fd0", 0.9), ring(puddle, 3.4, "#1d3f6e", 0.5)]
    for seat, kinds in (debs or {}).items():
        sh += deb(rl[seat], kinds)
    sh += list(extra)
    return board(grid=False, boss=[50, 50], bossSize=10, shapes=sh, roles=roles(**rl))


D13 = {"MT": "E", "D1": "E", "D2": "EL", "H1": "ET"}


def b2_13():
    return fallen(None, debs=D13, MT=(50.7, 37.5), D1=(38.9, 49.6), D2=(61.3, 51.4), H1=(49.9, 60))


D14 = {"H1": "ET", "D1": "E", "D2": "EL", "MT": "E"}


def b2_14():
    return fallen(1, debs=D14, H1=(50.7, 34.2), D1=(35.3, 50.6), D2=(65.9, 53), MT=(49.9, 67.1))


def b2_15():
    sh = aoe((50, 50), 10, 0.45)
    for p in ((40.6, 35.2), (34.8, 48.8), (39.4, 60.7), (65.5, 49.5)):
        sh += aoe(p, 5.5, 0.35)
    return fallen(1, sh, debs={"MT": "E", "D1": "EL", "D2": "E", "H1": "ET"}, MT=(40.6, 35.2), D1=(34.8, 48.8), D2=(39.4, 60.7), H1=(65.5, 49.5))


def b2_16():
    return fallen(1, [donut((50, 50), 95, 10.5)], debs={"MT": "E", "D1": "E", "D2": "EL", "H1": "ET"},
                  MT=(45.6, 50.9), D1=(43.9, 46.5), D2=(40, 49.2), H1=(56.5, 49.8))


def b2_17():
    ex = stack((43, 49.5), 6.5) + [arrow((54.5, 47.5), (58.5, 43.5))]
    return fallen(1, [donut((50, 50), 95, 10.5)], puddle=(59.6, 49), extra=ex,
                  H1=(50.2, 40.6), D1=(43.5, 48.1), D2=(41.5, 51.5), MT=(45.1, 51.7))


def b2_18():
    return fallen(2, aoes=[circle((50, 50), 21.5, ORANGE, 0.32)], debs={"MT": "ET", "D1": "E", "D2": "E", "H1": "EL"},
                  MT=(21.5, 46.5), D1=(23.3, 50.5), D2=(18.7, 51.5), H1=(77.2, 51.6))


def b2_19():
    return fallen(2, aoes=[circle((50, 50), 21.5, ORANGE, 0.32)], puddle=(80, 49), extra=stack((21, 49.5), 6.5),
                  MT=(21.5, 46.5), D1=(23.3, 50.5), D2=(18.7, 51.5), H1=(77.4, 51.3))


def b2_20():
    sh = [donut((50, 50), 95, 24)]
    for p in ((49.9, 32.8), (34.1, 48.3), (62.3, 50.5), (53.2, 66.3)):
        sh += aoe(p, 5.2, 0.3)
    return fallen(2, sh, puddle=(77.6, 50.3), MT=(49.9, 32.8), D2=(34.1, 48.3), D1=(62.3, 50.5), H1=(53.2, 66.3))


# Hateful Visage / Accursed Visage: the floor in tiles, gold and silver statues as half discs
GOLD, SILVER = "#e8c21e", "#d8dde2"
DARKS = ("#2e302e", "#303330", "#303030", "#2e302f", "#2e2e2e", "#2f3134", "#2b2f2a", "#2e2f2e")


def cells(tag, o=1.0):
    c = CELLS[tag]
    n, (x0, x1, y0, y1) = c["n"], c["box"]
    w, h = (x1 - x0) / n, (y1 - y0) / n
    out = []
    for r, row in enumerate(c["m"]):
        for k, col in enumerate(row):
            if col.lower() in DARKS:
                continue
            out.append(rect((x0 + (k + 0.5) * w, y0 + (r + 0.5) * h), w + 0.05, h + 0.05, 0, col, o, 0.01))
    for i in range(1, n):
        out.append(line((x0 + i * w, y0), (x0 + i * w, y1), "#000000", 0.25, 0.35))
        out.append(line((x0, y0 + i * h), (x1, y0 + i * h), "#000000", 0.25, 0.35))
    return out


def statue(c, d, col, r=4.2, o=1.0):
    return [cone(c, d, 180, r, col, 0.9 * o, 0.25)]


S21 = [((50, 22), 270, 90), ((50, 42), 270, 90), ((20.5, 52), 0, 180), ((40, 52), 0, 180), ((59.5, 52.5), 0, 180),
       ((79.5, 52), 0, 180), ((50, 62), 90, 270), ((50, 81.5), 90, 270)]


def visage_pairs(o=1.0):
    out = []
    for c, g, s in S21:
        out += statue(c, g, GOLD, o=o) + statue(c, s, SILVER, o=o)
    return out


def b2_21():
    return board(grid=False, shapes=cells("b2-21") + visage_pairs())


def b2_22():
    return board(grid=False, shapes=cells("b2-22") + visage_pairs(0.45), roles=roles(H1=(14.9, 14.4), MT=(74.3, 34.8), D1=(34.9, 55.1), D2=(53.6, 74)))


def b2_23():
    sh = cells("b2-23") + visage_pairs(0.35)
    for p in ((25.1, 24.8), (84.8, 24.1), (44.5, 63.5), (65.6, 83.4)):
        sh.append(ring(p, 5.6, "#ffd27a", 0.4, 0.9))
    return board(grid=False, shapes=sh, roles=roles(H1=(25.1, 24.8), MT=(84.8, 24.1), D1=(44.5, 63.5), D2=(65.6, 83.4)))


S27 = [((49, 23), 270, SILVER), ((49.5, 42.5), 90, SILVER), ((20.5, 50), 0, GOLD), ((40, 52), 180, GOLD),
       ((59.5, 52), 180, SILVER), ((79, 50), 0, SILVER), ((50, 62), 90, GOLD), ((50, 81.5), 270, GOLD)]


def fate(p, g=0, s=0):
    """The curse marks above a head: gold and silver, with how many."""
    out = []
    marks = ([("g", g)] if g else []) + ([("s", s)] if s else [])
    for i, (k, n) in enumerate(marks):
        c = (p[0] + (i - (len(marks) - 1) / 2) * 3.4, p[1] - 5.4)
        out += [dot(c, 1.5, GOLD if k == "g" else "#a9c4d6"), text((c[0] + 1.8, c[1] - 1.4), str(n), 2.2, "#ffffff")]
    return out


F27 = {"MT": (1, 1), "H1": (2, 0), "D1": (1, 1), "D2": (0, 2)}


def visage(tag, statues, o=1.0, pos=None, fates=True, circles=False):
    sh = cells(tag)
    for c, d, col in statues:
        sh += statue(c, d, col, o=o)
    if circles:
        for p in pos.values():
            sh.append(ring(p, 5.6, "#ffd27a", 0.4, 0.9))
    if fates:
        for seat, (g, s) in F27.items():
            sh += fate(pos[seat], g, s)
    return board(grid=False, shapes=sh, roles=roles(**pos))


def b2_27():
    return visage("b2-27", S27, pos=dict(MT=(19.4, 22.6), H1=(79.1, 41.4), D1=(61.7, 65.3), D2=(39.8, 80.8)))


def b2_28():
    return visage("b2-28", S27, 0.4, pos=dict(MT=(25.3, 24.2), H1=(84.2, 42.4), D1=(64.3, 64.2), D2=(44.3, 84.4)))


def b2_29():
    return visage("b2-29", [], pos=dict(MT=(15.5, 15), H1=(74.3, 34.2), D1=(54.9, 54.6), D2=(35.4, 74.7)), fates=False, circles=True)


# the four other layouts: where each curse is cleansed (G = gold, S = silver)
def spots(tag, statues, marks):
    sh = cells(tag)
    for c, d, col in statues:
        sh += statue(c, d, col, r=4.6)
    for c, lab, lc in marks:
        sh += [ring(c, 5.6, "#e8331c", 0.7), text(lc, lab, 5.2, "#ff5a4a")]
    return {"arena": {"shape": "square", "at": [50, 50], "w": 100, "h": 100, "fill": FLOOR, "lines": False, "edge": "#2a2a2a"}, "shapes": sh}


def b2_30():
    st = [((50, 13), 270, SILVER), ((50, 40), 90, GOLD), ((40, 52), 0, GOLD), ((62, 52), 0, GOLD), ((11.5, 56), 180, SILVER),
          ((88, 57), 180, SILVER), ((50, 65), 90, GOLD), ((50, 90), 270, SILVER)]
    mk = [((63, 15), "G1+S1", (70, 27)), ((38, 42), "S2", (25, 27)), ((87, 66), "G1+S1", (73, 75)), ((13, 87), "G2", (25, 75))]
    return spots("b2-30", st, mk)


def b2_31():
    st = [((44.5, 14), 90, SILVER), ((50, 39.5), 270, SILVER), ((13, 50), 0, GOLD), ((40, 51), 180, GOLD), ((63, 51), 180, SILVER),
          ((88, 50), 0, SILVER), ((50, 67), 270, GOLD), ((50, 87), 90, GOLD)]
    mk = [((12, 13), "G1+S1", (25, 25)), ((88, 38), "G2", (75, 25)), ((62, 66), "G1+S1", (75, 75)), ((38, 87), "S2", (25, 75))]
    return spots("b2-31", st, mk)


def b2_32():
    st = [((50, 13), 270, GOLD), ((50, 38), 90, SILVER), ((13, 50), 0, GOLD), ((37, 52), 180, SILVER), ((60.5, 51), 0, GOLD),
          ((87, 52), 180, SILVER), ((50, 62), 270, GOLD), ((50, 87), 270, GOLD)]
    mk = [((62, 13), "S2", (75, 25)), ((13, 37), "G1+S1", (25, 25)), ((37, 63), "G2", (25, 75)), ((87, 87), "G1+S1", (75, 75))]
    return spots("b2-32", st, mk)


def b2_33():
    st = [((50, 13), 270, GOLD), ((50, 38), 90, GOLD), ((13, 50), 0, GOLD), ((37, 52), 180, GOLD), ((62, 51), 180, SILVER),
          ((87, 50), 0, SILVER), ((50, 62), 270, SILVER), ((50, 87), 270, SILVER)]
    mk = [((13, 13), "S2", (25, 25)), ((87, 37), "G1+S1", (75, 25)), ((37, 62), "G1+S1", (25, 75)), ((63, 87), "G2", (75, 75))]
    return spots("b2-33", st, mk)


# Curse of the Monument
C9 = [((22, 22), 0.25), ((50, 20), 0.25), ((78, 22), 0.12), ((17, 50), 0.38), ((50, 50), 0.38), ((82, 50), 0.38),
      ((22, 78), 0.12), ((48, 80), 0.25), ((78, 78), 0.38)]


def monument(order=C9):
    sh = []
    for c, o in order:
        sh += [circle(c, 17.5, ORANGE, o, 0.01), ring(c, 17.5, RIM, 0.3, 0.6)]
    return sh


def num(p, s):
    return [text((p[0] + 0.5, p[1] - 5.6), s, 2.6, "#ffffff"), dot((p[0] - 2.6, p[1] - 5.2), 1.3, "#7a4bd0")]


def b2_38():
    return board(grid=False, boss=[50, 50], bossSize=10, roles=roles(MT=(52.4, 45), H1=(44.7, 44.4), D1=(53.3, 52.5), D2=(46.5, 55.5)))


def b2_39():
    sh = monument() + [line((18.6, 45.5), (83.8, 47.2), "#6a2bb0", 0.6), line((18.7, 51.8), (82.2, 52.8), "#6a2bb0", 0.6)]
    return board(grid=False, boss=[50, 51], bossSize=10, shapes=sh, roles=roles(H1=(18.6, 45.5), D2=(18.7, 51.8), MT=(83.8, 47.2), D1=(82.2, 52.8)))


def b2_40():
    sh = monument() + [arrow((17, 57), (17, 71.5)), arrow((78, 47.5), (78, 34))]
    return board(grid=False, boss=[50, 51], bossSize=10, shapes=sh, roles=roles(H1=(13.1, 73.3), D2=(20.3, 75.3), MT=(75.4, 25.9), D1=(80.9, 26)))


C9B = [((22, 22), 0.2), ((50, 22), 0.12), ((78, 22), 0.2), ((17, 78), 0.12), ((50, 78), 0.25), ((78, 78), 0.25)]


def b2_41():
    sh = monument(C9B) + [arrow((15, 72), (15, 57)), arrow((59, 33), (59, 46))]
    return board(grid=False, boss=[50, 51], bossSize=10, shapes=sh, roles=roles(H1=(25.3, 49), D2=(32.2, 54.2), MT=(78, 48.5), D1=(73.2, 44.5)))


def b2_42():
    sh = [circle((18, 50), 21, ORANGE, 0.42, 0.01), ring((18, 50), 21, RIM, 0.35), circle((82, 50), 21, ORANGE, 0.42, 0.01), ring((82, 50), 21, RIM, 0.35),
          ring((49.6, 39), 5.6, "#e0553a", 0.7), ring((49.4, 65.8), 5.6, "#e0553a", 0.7)]
    sh += num((49.6, 38.8), "II") + num((49.4, 65.8), "II") + num((20.6, 49.6), "I") + num((81.4, 50.6), "I")
    return board(grid=False, boss=[50, 52], bossSize=10, shapes=sh, roles=roles(MT=(49.6, 38.8), H1=(49.4, 65.8), D2=(20.6, 49.6), D1=(81.4, 50.6)))


def b2_43():
    sh = [circle((50, 21), 21, ORANGE, 0.42, 0.01), ring((50, 21), 21, RIM, 0.35), circle((50, 79), 21, ORANGE, 0.42, 0.01), ring((50, 79), 21, RIM, 0.35),
          ring((35.3, 51.7), 5.6, "#e0553a", 0.7), ring((65.6, 51.9), 5.6, "#e0553a", 0.7)]
    sh += num((49.6, 21.6), "II") + num((49.3, 81.4), "II")
    return board(grid=False, boss=[50, 52], bossSize=10, shapes=sh, roles=roles(MT=(49.6, 21.6), H1=(49.3, 81.4), D2=(35.3, 51.7), D1=(65.6, 51.9)))
