# ---------------------------------------------------------------- boss 3: Shadowcaster Zeless Gah
AX0, AX1, AY0, AY1 = 20.45, 78.86, 10.68, 88.86
FINE_W, FINE_H = (AX1 - AX0) / 6, (AY1 - AY0) / 8


def tiles3():
    out = []
    for i in range(1, 6):
        v = AX0 + i * FINE_W
        out.append(line((v, AY0), (v, AY1), GRID, 0.16, 0.24 if i % 2 == 0 else 0.1))
    for i in range(1, 8):
        v = AY0 + i * FINE_H
        out.append(line((AX0, v), (AX1, v), GRID, 0.16, 0.24 if i % 2 == 0 else 0.1))
    return out


def b3(boss=(49.6, 52), shapes=(), bs=10, **rl):
    s = {"arena": dict(A3), "shapes": tiles3() + list(shapes)}
    if boss:
        s["boss"] = [R(boss[0]), R(boss[1])]
        s["bossSize"] = bs
    if rl:
        s["roles"] = roles(**rl)
    return s


ORB = "#e2a6dc"


def orb(c, fire=False, o=1.0, r=3.8):
    out = [dot(c, r, ORB, 0.95 * o), ring(c, r, "#ffffff", 0.35, 0.9 * o)]
    if fire:
        out += [ring(c, r * 0.62, "#e0553a", 0.55, o), dot(c, r * 0.32, "#f08a2a", o)]
    return out


def bar(a, b, o=0.5, w=2.8):
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    ln = math.hypot(b[0] - a[0], b[1] - a[1])
    d = math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1])))
    return [rect(mid, w, ln, d, ORB, o, 0.01)]


def spin(c, col, r=9.5, a0=0, a1=360, n=9, cw=True):
    """A ring of chevrons that turn (game8's rotation marker), orange or blue."""
    out = []
    n = int(n * 1.6)
    for k in range(n):
        a = a0 + (a1 - a0) * (k + 0.5) / n
        p = off(c, a, r)
        out += chevron(p, a + (90 if cw else -90), 2.8, 1.3, col, 0.75, 0.95)
        out += chevron(off(p, a, 1.2), a + (90 if cw else -90), 2.4, 1.1, col, 0.55, 0.7)
    return out


SPIN_O, SPIN_B = "#ec6a2a", "#6fb4dc"


def pair(a, b, fa=False, fb=False, o=1.0):
    return bar(a, b, 0.45 * o) + orb(a, fa, o) + orb(b, fb, o)


def xmark(p):
    return [text((p[0], p[1] - 5.4), "X", 2.8, "#e0457b")]


def strike(c, o=0.32):
    return [circle(c, 20, "#f2e6d0", o, 0.01), ring(c, 20, "#e8d8a8", 0.35, 0.8)]


# Infern Brand 1
def brand1_orbs(o=1.0):
    return (pair((50, 20), (50, 40), True, False, o) + pair((39, 30), (61, 30), True, False, o)
            + pair((50, 61), (50, 81), False, True, o) + pair((39, 71), (61, 71), False, True, o))


def b3_03():
    sh = brand1_orbs() + spin((47, 27), SPIN_O, 11, 190, 400, 11, False) + spin((53, 74), SPIN_B, 11, 10, 220, 11, True)
    return b3(None, sh)


ROT1 = pair((28, 20), (49, 20), True) + pair((39, 30), (39, 50), False, True) + pair((28, 81), (49, 81), True) + pair((59, 70), (59, 90), False, True)


def b3_04():
    return b3(None, ROT1)


def b3_05():
    sh = []
    for c in ((28, 20), (39, 50), (28, 81), (55, 88)):
        sh += [circle(c, 24, ORANGE, 0.42, 0.01), ring(c, 24, RIM, 0.35)]
    sh += strike((65, 61.5), 0.4) + strike((76.5, 15), 0.14) + strike((77, 40), 0.14) + strike((58, 30), 0.14)
    sh += pair((28, 20), (49, 20), True, o=0.5) + pair((39, 30), (39, 50), False, True, 0.5) + pair((28, 81), (49, 81), True, o=0.5) + pair((59, 70), (59, 90), False, True, 0.5)
    return b3(None, sh, H1=(76.7, 13), D1=(56.7, 28), D2=(76.6, 41.3), MT=(65.1, 61.6))


def b3_06():
    sh = strike((50, 30), 0.4) + xmark((65.1, 62.2))
    return b3((50, 29), sh, H1=(76.6, 12.7), D1=(50.5, 30.5), D2=(76.7, 40.9), MT=(65.1, 62.2))


def b3_07():
    sh = [rect((70, 32.5), 6, 36, 97, ORANGE, 0.5)] + xmark((71.3, 31.2)) + xmark((56.7, 45.2))
    return b3((50, 28), sh, H1=(65.6, 29.8), D2=(71.3, 31.2), D1=(56.8, 35.7), MT=(56.7, 45.2))


def b3_08():
    sh = [rect((55.5, 44), 6, 32, 0, ORANGE, 0.5)] + xmark((65.6, 30.5)) + xmark((71.3, 31.2)) + xmark((56.7, 45.2))
    return b3((50, 28), sh, H1=(65.6, 30.5), D2=(71.3, 31.2), D1=(56.7, 35.7), MT=(56.7, 45.2))


def cluster(top, left, right, bottom, spins):
    sh = bar((50, 61.5), (50, 82)) + bar((39, 72), (61, 72))
    for c, f in (((50, 61.5), top), ((39, 72), left), ((61, 72), right), ((50, 82), bottom)):
        sh += orb(c, f)
    for args in spins:
        sh += spin(*args)
    return sh


def b3_09():
    return b3(None, cluster(True, False, True, False, [((50, 74), SPIN_B, 11, 200, 420, 12, True)]), D1=(55.2, 76), H1=(76.9, 86.8))


def b3_10():
    return b3(None, cluster(True, True, False, False, [((52, 75), SPIN_B, 11, 60, 250, 10, True)]), D1=(59.8, 60.3), H1=(77.2, 42.2))


def b3_11():
    return b3(None, cluster(True, False, True, False, [((47, 75), SPIN_O, 11, 110, 300, 10, False)]), D1=(39.2, 60.1), H1=(21.2, 41.8))


def b3_12():
    return b3(None, cluster(True, True, False, False, [((52, 75), SPIN_O, 11, 20, 200, 10, False)]), D1=(42.6, 75.7), H1=(22.2, 86.4))


def b3_13():
    return b3(None, cluster(True, False, True, False, [((45, 72), SPIN_B, 10, 250, 330, 5, True), ((55, 78), SPIN_O, 10, 110, 200, 5, False)]), D1=(42, 76.2), H1=(22.2, 86.9))


def b3_14():
    return b3(None, cluster(True, True, False, False, [((56, 70), SPIN_O, 10, 20, 120, 5, False), ((47, 78), SPIN_B, 10, 200, 280, 5, True)]), D1=(55.9, 78.1), H1=(77.8, 86.2))


# Infern Brand 2: red lines (north-south) and blue lines (east-west), numbers I-IV, fire doors outside
RED_X = [42.5, 46.8, 51, 55.2]
BLUE_Y = [44, 47.5, 51, 54.5]
DOORS_R = [(81.5, 39.5), (81.5, 58.5), (81.5, 78.5)]
DOORS_T = [(49, 8.5), (69.5, 8.5)]


def lines2(red=RED_X, blue=BLUE_Y):
    out = []
    for x in red:
        out.append(line((x, AY0), (x, AY1), "#e0582a", 0.4, 0.95))
    for y in blue:
        out.append(line((AX0, y), (AX1, y), "#3d8fd0", 0.4, 0.95))
    # the small number marks along each line
    for x in red:
        for y in (28, 33, 67, 72):
            out.append(dot((x + 1.2, y), 0.75, "#5a4a46", 0.9))
    for y in blue:
        for x in (27, 33, 66, 72):
            out.append(dot((x, y - 1.2), 0.75, "#5a4a46", 0.9))
    return out


def doors(right=True, top=True, hot=()):
    out = []
    if right:
        for c in DOORS_R:
            out.append(rect(c, 3.4, 10.5, 0, "#f58a2a" if c in hot else "#f2a07a", 0.85, 0.2))
    if top:
        for c in DOORS_T:
            out.append(rect(c, 12, 3.4, 0, "#f58a2a" if c in hot else "#f2a07a", 0.85, 0.2))
    return out


def numerals(pos):
    out = []
    for seat, n in (("D1", "I"), ("D2", "II"), ("MT", "III"), ("H1", "IV")):
        p = pos[seat]
        out.append(text((p[0], p[1] - 5.3), n, 2.4, "#ffffff"))
    return out


def brand2(pos, red=RED_X, blue=BLUE_Y, right=True, top=True, aoes=(), hot=()):
    sh = list(aoes) + lines2(red, blue) + doors(right, top, hot) + numerals(pos)
    return b3((49.6, 52), sh, **pos)


def b3_16():
    return brand2(dict(MT=(35.8, 36.8), D2=(33.2, 65.5), D1=(65.6, 65.9), H1=(61.7, 76.9)), right=False, top=False)


def b3_17():
    return brand2(dict(D1=(26.8, 64.1), D2=(33.1, 65.4), MT=(38.9, 66.8), H1=(65.1, 36.7)), top=False)


def b3_18():
    return brand2(dict(D1=(23, 57.3), D2=(33.1, 65.4), MT=(38.9, 67), H1=(65.1, 36.7)), blue=BLUE_Y[:3])


def b3_19():
    return brand2(dict(D1=(23, 57.3), D2=(39.4, 52.9), MT=(38.9, 67), H1=(65.1, 36.7)), blue=BLUE_Y[:2])


def b3_20():
    return brand2(dict(D1=(23, 57.3), D2=(39.4, 52.9), MT=(25.4, 49.3), H1=(65.1, 36.7)), blue=BLUE_Y[:1])


def b3_21():
    return brand2(dict(D1=(23, 57.3), D2=(39.4, 52.9), MT=(25.4, 49.3), H1=(60.5, 44.2)), blue=[])


def shadow(c, a0, spread=24, n=8, ln=75):
    return [cone(c, a0 + k * 360 / n, spread, ln, ORANGE, 0.42) for k in range(n)]


def b3_22():
    aoes = [rect((49.65, 49.9), 58.4, 39.1, 0, ORANGE, 0.42)] + shadow((49.6, 52), 0)
    return brand2(dict(MT=(25.5, 17.1), D2=(30.7, 22.6), D1=(35.4, 26.4), H1=(62.5, 21.6)), blue=[], aoes=aoes, hot=((81.5, 58.5), (49, 8.5)))


def b3_23():
    return brand2(dict(MT=(22.8, 29.8), D2=(28.5, 35), D1=(33.4, 39.3), H1=(67.9, 26.4)), blue=[], aoes=shadow((49.6, 52), 22.5), hot=((81.5, 39.5), (81.5, 78.5), (69.5, 8.5)))


def b3_24():
    return brand2(dict(D1=(42.4, 22.1), MT=(22.8, 29.8), D2=(28.5, 35), H1=(68, 26.3)), red=RED_X[1:], blue=[])


def b3_25():
    return brand2(dict(D1=(42.4, 22.1), D2=(46.9, 37.1), MT=(22.8, 29.8), H1=(68, 26.3)), red=RED_X[2:], blue=[])


def b3_26():
    return brand2(dict(MT=(51.7, 21.1), D1=(42.4, 22.1), D2=(46.9, 37.2), H1=(68, 26.3)), red=RED_X[3:], blue=[])


def b3_27():
    return brand2(dict(MT=(51.7, 21.1), D1=(42.4, 22.1), D2=(46.9, 37.2), H1=(56.2, 39.5)), red=[], blue=[])


def b3_28():
    aoes = [rect((59.75, 49.77), 38.9, 78.2, 0, ORANGE, 0.45), line((59.7, AY0), (59.7, AY1), RIM, 0.3, 0.8)]
    return brand2(dict(D1=(23.2, 22.6), MT=(32.5, 21.7), D2=(27.7, 37.8), H1=(37, 40)), red=[], blue=[], aoes=aoes, right=False)


# Infern Brand 3 (eis): fire-cone staffs, teleporting staffs, red beams from the west edge
def beams(full=False, ys=(30, 47.5, 52.5, 69.5)):
    out = []
    for y in ys:
        out.append(cone((17.8, y), 270, 70, 3.6, "#a07a50", 0.95, 0.15))
        out.append(line((18, y), (AX1 if full else 28, y), "#e0457b", 0.35, 0.85))
    return out


WANDS3 = [(49.5, 20), (49.5, 39.5), (49.5, 60), (49.5, 81)]


def wand(c, o=0.7, lit=False):
    return [dot(c, 3.0, "#7a7466", 0.55 * o), ring(c, 3.0, "#f2e2a0" if lit else "#c8b88a", 0.45 if lit else 0.3, 0.9 * o)]


def b3_34():
    sh = beams()
    for c in WANDS3:
        sh += wand(c)
    sh += pair((24, 20), (44, 20)) + pair((55, 20), (74, 20)) + pair((24, 81), (44, 81)) + pair((55, 81), (74, 81))
    return b3((49.6, 52), sh)


def mark(p, col):
    return spin(p, col, 4.6, 0, 360, 8, col == SPIN_B)


def b3_35():
    sh = beams()
    for c in WANDS3[1:3]:
        sh += wand(c)
    sh += pair((24, 20), (44, 20)) + pair((55, 20), (74, 20)) + pair((24, 81), (44, 81)) + pair((55, 81), (74, 81))
    sh += spin((44, 20), SPIN_O, 6, 0, 360, 10) + spin((74, 20), SPIN_B, 6, 0, 360, 10, False)
    sh += spin((24, 81), SPIN_O, 6, 0, 360, 10) + spin((55, 81), SPIN_B, 6, 0, 360, 10, False)
    sh += bar((38.9, 36.9), (18, 41)) + orb((18, 41)) + bar((53.6, 39.9), (74, 43)) + orb((74, 43))
    sh += bar((55.1, 59.7), (74, 62)) + orb((74, 62)) + bar((40.4, 66.2), (18, 70)) + orb((18, 70))
    sh += mark((38.9, 36.9), SPIN_O) + mark((53.6, 39.9), SPIN_O) + mark((55.1, 59.7), SPIN_B) + mark((40.4, 66.2), SPIN_B)
    return b3((49.6, 52), sh, D1=(38.9, 36.9), D2=(53.6, 39.9), MT=(55.1, 59.7), H1=(40.4, 66.2))


def b3_36():
    sh = beams()
    for c in WANDS3[1:3]:
        sh += wand(c)
    sh += pair((24, 20), (44, 20)) + pair((55, 20), (74, 20)) + pair((24, 81), (44, 81)) + pair((55, 81), (74, 81))
    sh += spin((40, 20), SPIN_O, 6, 0, 360, 10) + spin((24, 81), SPIN_O, 6, 0, 360, 10)
    sh += bar((74.8, 39.8), (93, 40)) + orb((93, 40)) + bar((55.1, 59.7), (74, 60)) + orb((74, 60))
    sh += mark((75.9, 19.9), SPIN_O) + mark((75.9, 19.9), SPIN_B) + mark((74.8, 39.8), SPIN_O) + mark((55.1, 59.7), SPIN_B) + mark((54.9, 79.4), SPIN_B)
    return b3((49.6, 52), sh, D1=(75.9, 19.9), D2=(74.8, 39.8), MT=(55.1, 59.7), H1=(54.9, 79.4))


def b3_37():
    sh = beams()
    sh += pair((50, 2), (50, 20)) + pair((75.8, 20.3), (97, 20)) + pair((55, 40), (75.8, 40.3)) + pair((40, 59.5), (55.1, 59.5))
    sh += pair((55.1, 59.5), (55.1, 79.9)) + pair((55.1, 79.9), (74, 79.9)) + pair((24, 81), (24, 99))
    for c in ((49.5, 39.5), (49.5, 60)):
        sh += wand(c)
    sh += spin((50, 20), SPIN_O, 6, 0, 360, 10) + spin((24, 81), SPIN_O, 6, 0, 360, 10)
    sh += mark((75.8, 20.3), SPIN_O) + mark((75.8, 40.3), SPIN_O) + mark((55.1, 59.5), SPIN_B) + mark((55.1, 79.9), SPIN_B)
    sh += [arrow((64, 22), (64, 35)), arrow((84, 47), (84, 35.5)), arrow((44, 64), (44, 76.5)), arrow((61, 76.5), (61, 64.5))]
    return b3((49.6, 52), sh, D1=(75.8, 20.3), D2=(75.8, 40.3), H1=(55.1, 59.5), MT=(55.1, 79.9))


def b3_38():
    sh = [cone((50, 40), 42, 184, 95, ORANGE, 0.4), cone((50, 61), 222, 184, 95, ORANGE, 0.4),
          cone((50, 61), 33, 9, 95, ORANGE, 0.5), cone((50, 40), 213, 9, 95, ORANGE, 0.5)]
    sh += beams(True) + wand((50, 40), 1, True) + wand((50, 61), 1, True)
    sh += pair((50, 16), (71, 16), o=0.45) + pair((43, 37), (65, 37), o=0.45) + pair((14, 65), (34, 65), o=0.45) + pair((50, 87), (71, 87), o=0.45)
    sh += [text((50, 16), "A", 2.8, "#ffd2d2"), text((65, 37), "D", 2.8, "#ffd2a0"), text((50, 87), "C", 2.8, "#d2e0ff")]
    return b3((49.6, 52), sh)


def b3_39():
    sh = beams(True) + wand((50, 79), 0.7) + wand((49.5, 30), 0.7)
    sh += pair((50.8, 15.8), (71, 15.8)) + pair((44, 39.8), (65.8, 39.8)) + pair((14, 61.4), (35.1, 61.4)) + pair((50.2, 86.3), (71, 86.3))
    sh += mark((50.8, 15.8), SPIN_O) + mark((65.8, 39.8), SPIN_O) + mark((35.1, 61.4), SPIN_B) + mark((50.2, 86.3), SPIN_B)
    sh += [arrow((43, 30), (43, 42.5)), arrow((73, 37), (73, 26)), arrow((30, 70), (30, 83)), arrow((60, 80), (60, 69))]
    return b3((49.6, 52), sh, D1=(50.8, 15.8), D2=(65.8, 39.8), H1=(35.1, 61.4), MT=(50.2, 86.3))


def b3_40():
    sh = [cone((49.5, 20.5), 270, 170, 95, ORANGE, 0.4), cone((49.5, 20.5), 85, 160, 95, ORANGE, 0.4),
          cone((49.5, 81), 90, 170, 95, ORANGE, 0.4), cone((49.5, 81), 265, 160, 95, ORANGE, 0.4)]
    sh += beams(True) + wand((49.5, 20.5), 1, True) + wand((49.5, 81), 1, True)
    for p in ((49.5, 13.5), (68, 36), (34, 64), (49.5, 87.5)):
        sh += [dot(p, 3.4, "#e8a0a0", 0.3)]
    return b3((49.6, 52), sh, D1=(49.5, 13.5), D2=(68, 36), MT=(34, 64), H1=(49.5, 87.5))


# Infern Brand 4 (Omochi's): three teleporting magic circles
def circle4(c, to, col=None, o=1.0):
    sh = bar(c, to, 0.45 * o) + orb(to, False, o) + [rect(c, 6.5, 2.8, 0, "#f08a5a", 0.9 * o, 0.2), dot(c, 3.6, "#f08a7a", 0.85 * o)]
    if col:
        sh += spin(c, col, 6.2, 0, 360, 11, col == SPIN_B)
    return sh


def b3_41():
    sh = circle4((49.5, 50), (49.5, 30)) + circle4((20.5, 60), (40, 60), SPIN_O) + circle4((78.9, 40), (59.5, 40), SPIN_B)
    return b3(None, sh, MT=(69, 37.9), D1=[(67.3, 44.7), (30.4, 63.3)], H1=(29.9, 57.9), D2=[(33.8, 63.3), (70.7, 44.7)])


def b3_42():
    sh = circle4((49.5, 50), (49.5, 30), SPIN_B) + circle4((20.5, 60), (40, 60), SPIN_O) + circle4((78.9, 40), (59.5, 40), SPIN_B)
    return b3(None, sh, MT=(66, 25.8), D1=[(72.1, 22.6), (33.4, 45.5)], H1=(28.1, 46.8), D2=[(36.8, 45.5), (75.5, 22.6)])


def b3_43():
    sh = circle4((49.5, 50), (30, 50), SPIN_B) + circle4((20.5, 60), (20.5, 80), SPIN_O) + circle4((78.9, 40), (78.9, 60), SPIN_B)
    return b3(None, sh, MT=(44, 25.4), H1=(44, 43.9), D1=(73.8, 25.1), D2=(74.2, 43.9))


def b3_44():
    sh = [rect((30.2, 30.2), 19.5, 39.1, 0, ORANGE, 0.45), rect((49.65, 69.3), 58.4, 39.1, 0, ORANGE, 0.45)]
    sh += strike((44, 15.4), 0.18) + strike((44, 44), 0.4) + strike((75, 15.3), 0.14) + strike((74, 44), 0.14)
    sh += [rect((26, 50), 6.5, 2.8, 0, "#f08a5a", 0.8), rect((78.6, 60), 2.8, 6.5, 0, "#f08a5a", 0.8), rect((20.5, 80), 2.8, 6.5, 0, "#f08a5a", 0.8)]
    return b3(None, sh, MT=(44, 15.4), H1=(44, 44.1), D1=(75.3, 15.3), D2=(74.2, 44.2))


def b3_45():
    sh = strike((75, 15.5), 0.45) + xmark((44, 43.7))
    return b3((75.4, 15.4), sh, bs=8, MT=(44, 15.4), H1=(44, 43.7), D1=(75.4, 16), D2=(74.2, 44.2))


def b3_46():
    sh = [rect((37.5, 16.3), 6, 75, 90, ORANGE, 0.5), rect((75.5, 58), 6, 84, 0, ORANGE, 0.5)] + xmark((57, 15.4)) + xmark((75.4, 40.5)) + xmark((75.3, 27.2))
    return b3((76, 16), sh, bs=8, MT=(66, 15.9), D1=(57, 15.4), D2=(75.3, 27.2), H1=(75.4, 40.5))


def b3_47():
    sh = [rect((37.5, 16.3), 6, 75, 90, ORANGE, 0.5)] + xmark((57, 15.2)) + xmark((75.4, 40.5)) + xmark((75.3, 27.4))
    return b3((76, 16), sh, bs=8, MT=(66, 15.9), D1=(57, 15.2), D2=(75.3, 27.4), H1=(75.4, 40.5))


# Infern Brand 5: red and blue lines again, four fire-cone staffs
R5 = [40.5, 45.3, 54.9, 59.4]
B5 = [39.5, 43.5, 57.8, 61.8]
W5 = {"N": (49.6, 38), "S": (49.6, 66.5), "W": (31.5, 50), "E": (66.5, 50)}


def lines5(red, blue):
    out = []
    for x in red:
        out.append(line((x, AY0), (x, AY1), "#e0582a", 0.4, 0.95))
    for y in blue:
        out.append(line((AX0, y), (AX1, y), "#3d8fd0", 0.4, 0.95))
    for x in red:
        for y in (29, 70):
            out.append(dot((x + 1.3, y), 0.75, "#5a4a46", 0.9))
    for y in blue:
        for x in (28, 70):
            out.append(dot((x, y - 1.3), 0.75, "#5a4a46", 0.9))
    return out


def brand5(pos, red=R5, blue=B5, lit=None, aoes=(), extra=()):
    sh = list(aoes) + lines5(red, blue)
    for k, c in W5.items():
        sh += wand(c, 1 if k == lit else 0.5, k == lit)
    sh += list(extra)
    for seat, n in (("D1", "I"), ("D2", "II"), ("H1", "III"), ("MT", "IV")):
        p = pos[seat]
        sh.append(text((p[0], p[1] - 5.3), n, 2.4, "#ffffff"))
    s = b3((49.6, 52), sh, **pos)
    return s


def bowtie(c, d, spread=100, ln=80):
    return [cone(c, d, spread, ln, ORANGE, 0.42), cone(c, d + 180, spread, ln, ORANGE, 0.42)]


def b3_48():
    return brand5(dict(H1=(47.4, 34.2), MT=(53.6, 34.6), D1=(48.2, 47.3), D2=(51.8, 53.3)))


def b3_49():
    return brand5(dict(H1=(46.7, 35.6), MT=(53.6, 34.7), D1=(48.2, 44.7), D2=(51.8, 53.2)), lit="N", aoes=[cone((49.6, 37.5), 100, 78, 80, ORANGE, 0.42), cone((49.6, 37.5), 260, 80, 80, ORANGE, 0.42)])


def b3_50():
    return brand5(dict(H1=(46.7, 35.1), MT=(54.9, 34.6), D2=(52, 38.9), D1=(48.2, 44.7)), blue=B5[2:])


def b3_51():
    return brand5(dict(D1=(46.5, 43.2), D2=(51.5, 43.2), MT=(52.7, 51.3), H1=(49.1, 57.1)), blue=B5[3:], lit="S")


def b3_52():
    return brand5(dict(D1=(46.5, 45.5), D2=(51.5, 45.5), H1=(48.9, 57.4), MT=(52.6, 62.9)), blue=[], lit="S")


def b3_53():
    return brand5(dict(H1=(48.8, 28.5), MT=(53.2, 28.4), D1=(46.8, 65.2), D2=(53.3, 65.8)), blue=[], lit="S", aoes=bowtie((49.6, 66.5), 90, 92))


def b3_54():
    aoes = []
    for c in ((47.5, 29), (52.5, 29), (46.8, 65.8), (53.3, 66.3)):
        aoes += [circle(c, 14, ORANGE, 0.4, 0.01), ring(c, 14, RIM, 0.35)]
    return brand5(dict(H1=(48.8, 29.2), MT=(53.2, 28.4), D1=(46.8, 65.3), D2=(53.4, 65.8)), blue=[], aoes=aoes)


def b3_55():
    return brand5(dict(H1=(48.8, 28.3), MT=(53.2, 28.4), D1=(45, 56.2), D2=(52.6, 61.9)), red=R5[2:], blue=[], lit="W")


def b3_56():
    return brand5(dict(H1=(42.9, 37.6), MT=(47.9, 42.8), D1=(45.2, 55.9), D2=(39.7, 58)), red=R5[2:], blue=[], lit="W")


def b3_57():
    return brand5(dict(MT=(32.5, 45.6), H1=(32.1, 56.4), D1=(45.2, 55.9), D2=(39.9, 58.3)), red=R5[2:], blue=[], lit="W", aoes=bowtie((31.5, 50), 0, 92))


def b3_58():
    return brand5(dict(H1=(37.8, 35.3), MT=(42.6, 40.8), D1=(46.1, 61.7), D2=(40.7, 67.3)), red=R5[2:], blue=[], aoes=shadow((49.6, 52), 0, 22, 8, 80))


def b3_59():
    return brand5(dict(MT=(47.2, 32.3), H1=(47.5, 40.1), D1=(51.2, 62.8), D2=(50, 70.9)), red=R5[2:], blue=[], aoes=shadow((49.6, 52), 22.5, 22, 8, 80))


def b3_60():
    return brand5(dict(MT=(47.3, 32.6), H1=(54.8, 42.6), D1=(51.2, 62.9), D2=(50, 70.9)), red=R5[3:], blue=[], lit="E")


def b3_61():
    return brand5(dict(MT=(59.3, 40.3), H1=(52.4, 46.7), D1=(66.5, 46.4), D2=(66.5, 55.9)), red=[], blue=[], lit="E")


def b3_62():
    return brand5(dict(MT=(46.3, 43.2), H1=(52.4, 46.9), D1=(66.5, 46.3), D2=(66.5, 55.9)), red=[], blue=[], lit="E", aoes=bowtie((66.5, 50), 0, 92))


# the waymarks game8 draws for Infern Brand 3
def b3_02():
    return {"arena": dict(A3), "shapes": tiles3(), "waymarks": {"A": [49.6, 14], "B": [64.5, 33.5], "D": [34.5, 63.5], "C": [49.6, 88.5]}, "markSize": 13}
