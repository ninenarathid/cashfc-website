"""Every scene of the Another Sil'dihn Subterrane (Savage) guide, redrawn from game8's square strategy-board
pictures (440x440). x, y and sizes in % of the width (the frames are square). Measured on 5 % grid sheets and the
blob detector (tools/detect.cjs), checked on compare sheets (tools/cmp.mjs, build.mjs --compare).

Seats: game8's T = MT, H = H1, and its two D = D1 / D2 (see the guide's note).
"""
import math

R = lambda v: round(v, 2)
ORANGE = "#ff9b3d"
RIM = "#ffc070"
FLOOR = "#2f3135"
EDGE = "#9a9ca3"
BG = "#5c5e63"
GRID = "#ffffff"
RED = "#e8442e"
EL = {"T": "#d6c23a", "W": "#3fb06a", "I": "#69b2dc", "N": "#e2d6c2"}   # thunder, wind, ice, neutral (faded)

# boss 1 and 2: the square arena, 8 x 8 tiles
A8 = {"shape": "square", "at": [49.9, 49.9], "w": 78, "h": 78, "fill": FLOOR, "lines": False, "edge": EDGE}
X0, CELL = 10.9, 9.75
# boss 3: the long arena, 3 x 4 big tiles
A3 = {"shape": "square", "at": [49.65, 49.77], "w": 58.4, "h": 78.2, "fill": FLOOR, "lines": False, "edge": EDGE}


def off(c, ang, r):
    t = math.radians(ang)
    return (c[0] + math.sin(t) * r, c[1] - math.cos(t) * r)


def line(p0, p1, c="#ffffff", wd=0.45, o=0.95, dash=False):
    s = {"t": "line", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(p0, p1, c=RED, wd=0.9, o=0.98):
    return {"t": "arrow", "from": [R(p0[0]), R(p0[1])], "to": [R(p1[0]), R(p1[1])], "c": c, "wd": wd, "o": o}


def circle(c, r, col=ORANGE, o=0.42, wd=0.01):
    return {"t": "circle", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o, "wd": wd}


def ring(c, r, col, wd=0.5, o=0.95):
    return {"t": "ring", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "wd": wd, "o": o}


def dot(c, r, col, o=1.0):
    return {"t": "dot", "at": [R(c[0]), R(c[1])], "r": R(r), "c": col, "o": o}


def text(c, s, size=3.2, col="#ffffff"):
    return {"t": "text", "at": [R(c[0]), R(c[1])], "s": s, "size": size, "c": col}


def cone(at, d, spread, ln, c=ORANGE, o=0.4, wd=0.12):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": R(d % 360), "spread": R(spread), "len": R(ln), "c": c, "o": o, "wd": wd}


def rect(at, w, h, rot=0, c=ORANGE, o=0.4, wd=0.12):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": R(w), "h": R(h), "rot": R(rot), "c": c, "o": o, "wd": wd}


def donut(at, r, r2, c=ORANGE, o=0.4):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": R(r), "r2": R(r2), "c": c, "o": o, "wd": 0.12}


def aoe(c, r, o=0.42):
    return [circle(c, r, ORANGE, o, 0.01), ring(c, r, RIM, 0.35, 0.9)]


def tiles8():
    out = []
    for i in range(1, 8):
        v = X0 + i * CELL
        out.append(line((v, X0), (v, X0 + 8 * CELL), GRID, 0.18, 0.13))
        out.append(line((X0, v), (X0 + 8 * CELL, v), GRID, 0.18, 0.13))
    return out


def tiles3():
    x0, x1, y0, y1 = 20.45, 78.86, 10.68, 88.86
    out = []
    for i in (1, 2):
        v = x0 + i * (x1 - x0) / 3
        out.append(line((v, y0), (v, y1), GRID, 0.2, 0.16))
    for i in (1, 2, 3):
        v = y0 + i * (y1 - y0) / 4
        out.append(line((x0, v), (x1, v), GRID, 0.2, 0.16))
    return out


def chevron(c, a, w=2.8, h=1.3, col="#ffd84d", wd=0.6, o=0.98):
    tip = off(c, a, h / 2)
    back = off(c, a + 180, h / 2)
    return [line(off(back, a + 90, w / 2), tip, col, wd, o), line(off(back, a - 90, w / 2), tip, col, wd, o)]


def chev2(c, a, w=3.8, h=1.8):
    out = []
    for d in (0, 1.3):
        p = off(c, a + 180, d)
        out += chevron(p, a, w, h, "#b88a10", 1.2, 0.9)
        out += chevron(p, a, w, h, "#ffe066", 0.5, 0.98)
    return out


def stack(c, d=6.5, rot=0):
    """game8's stack marker: yellow double chevrons on four sides, pointing in."""
    out = []
    for a in (0, 90, 180, 270):
        out += chev2(off(c, a + rot, d), a + rot + 180)
    return out


def linestack(p0, p1, n=3, side=4.0):
    """Chevrons on both sides of a line, pointing at it (a line stack)."""
    a = math.degrees(math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]))) % 360
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    out = []
    for i in range(n):
        t = 0.2 + i * (0.6 / max(1, n - 1))
        m = off(p0, a, L * t)
        out += chev2(off(m, a + 90, side), a - 90)
        out += chev2(off(m, a - 90, side), a + 90)
    return out


def roles(**kw):
    return {k: ([[R(p[0]), R(p[1])] for p in v] if isinstance(v[0], (list, tuple)) else [R(v[0]), R(v[1])]) for k, v in kw.items()}


def board(arena=A8, grid=True, **kw):
    s = {"arena": dict(arena)}
    sh = kw.pop("shapes", [])
    s["shapes"] = ((tiles8() if arena is A8 else tiles3()) if grid else []) + sh
    s.update(kw)
    return s


# ---------------------------------------------------------------- boss 1: Silkie
def el_aoe(el, at, rot=0, spread=50, ln=72, w=19):
    """A puff or Silkie going off: thunder = an X of four cones, wind = a donut (safe at the middle),
    ice = a cross (+) of two bands. rot turns the X / cross (Silkie's own after she has moved)."""
    if el == "T":
        return [cone(at, rot + 45 + 90 * k, spread, ln) for k in range(4)]
    if el == "W":
        return [donut(at, 95, 9)]
    if el == "I":
        return [rect(at, w, 220, rot), rect(at, w, 220, rot + 90)]
    return []


def puff(c, el, faded=False, r=5.5):
    if faded:
        return [dot(c, r, EL["N"], 0.55), ring(c, r, "#ffffff", 0.3, 0.8)]
    return [dot(c, r, EL[el], 0.9), ring(c, r, "#e8e8e8", 0.3, 0.85)]


def silkie(c, el=None, r=5.4, faded=False):
    """Silkie's own puff behind her (its colour is her element)."""
    if not el:
        return []
    return [dot(c, r, EL[el], 0.5 if faded else 0.85), ring(c, r, "#e8e8e8", 0.3, 0.8)]


def b1(boss, el=None, puffs=(), aoes=(), extra=(), faded_boss=False, **rl):
    sh = list(aoes) + silkie(boss, el, faded=faded_boss)
    for p in puffs:
        sh += puff(p[0], p[1], len(p) > 2 and p[2])
    sh += list(extra)
    return board(boss=[R(boss[0]), R(boss[1])], bossSize=10, shapes=sh, roles=roles(**rl))


def b1_02():
    return b1((50, 50), aoes=el_aoe("T", (50, 50), spread=54, ln=72))


def b1_03():
    return b1((50, 50), aoes=el_aoe("W", (50, 50)) + [ring((50, 50), 9, RIM, 0.35)])


def b1_04():
    return b1((50, 50), aoes=el_aoe("I", (50, 50)))


def b1_05():
    return b1((50, 50), "T", extra=stack((40, 57.5), 7, 45), MT=(37.4, 54.5), D1=(43.2, 58), H1=(37, 61), D2=(40.5, 61.5))


def b1_06():
    b = (31, 72)
    sh = el_aoe("T", b, rot=45, spread=46, ln=62)
    for p in ((20, 64), (37, 63), (22, 80), (40, 82)):
        sh += aoe(p, 5.8, 0.35)
    return b1(b, aoes=sh, MT=(22, 80), H1=(37, 63), D1=[(18.3, 64), (38.3, 82)], D2=[(41.7, 82), (21.7, 64)])


def b1_07():
    return b1((50, 50), "W", extra=stack((42.5, 57.5), 7, 45), MT=(45.2, 54.7), H1=(39.1, 56.9), D1=(42.1, 60.6), D2=(46.5, 60))


def b1_08():
    b = (28, 72)
    return b1(b, aoes=[donut(b, 85, 9), ring(b, 9, RIM, 0.35)], extra=[arrow((40, 58), (33.5, 65.5), "#ff7a1a", 1.1)],
              MT=(26.6, 67.5), H1=(23.3, 70.7), D1=(28.9, 72.1), D2=(25.5, 74))


def b1_09():
    return b1((50, 50), "I", extra=stack((38, 60), 7.5, 45), MT=(34.2, 60.7), H1=(32.5, 66.4), D1=(42.1, 56.2), D2=(41.3, 62.3))


def b1_10():
    b = (30, 72)
    return b1(b, aoes=el_aoe("I", b, rot=45, w=17), MT=(32.1, 50.5), H1=(25.7, 49.6), D1=(47.7, 71.2), D2=(54.3, 73.7))


# Fresh Puff 1 (three puffs, Squeaky Clean, Slippery Soap)
P3 = [((50, 30), "N", True), ((26, 64.5), "T"), ((74.2, 64.6), "I")]


def b1_11():
    return b1((50, 52), "W", P3, aoes=[cone((50, 52), 0, 88, 60)], faded_boss=True,
              MT=(57.4, 54.6), H1=(53.4, 58), D1=(56.9, 62.7), D2=(60.5, 60))


def b1_12():
    return b1((50, 52), "W", P3, aoes=[cone((50, 52), 0, 88, 60), rect((25, 50), 50, 100, 0, ORANGE, 0.45)], faded_boss=True,
              MT=(57.4, 54.6), H1=(53.4, 58), D1=(56.9, 62.7), D2=(60.5, 60))


P3W = [((50, 30), "W"), ((25.3, 65), "W"), ((74.2, 64.6), "I")]


def b1_13():
    return b1((50, 52), "W", P3W, faded_boss=True, MT=(50.1, 68.9), H1=(45.7, 60.1), D1=(56.4, 62.1), D2=(50.5, 64))


def b1_14():
    return b1((50, 52), "I", P3W, faded_boss=True, MT=(50.1, 68.9), H1=(45.7, 60.1), D1=(56.4, 62.1), D2=(50.5, 64))


def b1_15():
    return b1((50, 52), "I", P3W, faded_boss=True, extra=linestack((47, 54), (24, 67), 3, 3.6),
              MT=(35.2, 57.7), H1=(41.6, 56), D1=(35.3, 63.7), D2=(21.6, 70.3))


def b1_16():
    return b1((50, 52), "I", [((50, 30), "W"), ((26.5, 65), "I"), ((74.2, 64.6), "I")], faded_boss=True,
              extra=linestack((47, 54), (24, 67), 3, 3.6), MT=(35.2, 57.7), H1=(41.6, 56), D1=(35.3, 63.7), D2=(21.3, 70.8))


def b1_17():
    b = (25, 72)
    return b1(b, "I", [((49, 29), "W"), ((27, 65), "N", True), ((74.2, 64.6), "I")], aoes=el_aoe("I", b, rot=45, w=17), faded_boss=True,
              MT=(21.2, 54.7), H1=(17.7, 47.3), D1=(37.4, 73.6), D2=(44.6, 76.8))


def b1_18():
    return b1((14, 75), None, [((50, 30), "W"), ((26.3, 65), "I"), ((74.2, 64.6), "I")],
              MT=(50.1, 30.7), H1=(43.2, 36.7), D2=(51.1, 37.9), D1=(31.1, 72.5))


def b1_19():
    b = (50, 32)
    sh = el_aoe("W", b) + el_aoe("I", (26, 68)) + el_aoe("I", (74, 68))
    return b1(b, "W", [((26, 68), "N", True), ((74, 68), "N", True)], aoes=sh + [ring(b, 9, RIM, 0.35)],
              D1=(43.3, 28.7), MT=(50.3, 30.6), H1=(45.3, 35.3), D2=(52.2, 36.9))


def b1_20():
    return b1((50, 52), "I", [((50, 29), "W"), ((25.3, 64.3), "T"), ((74.4, 64.7), "W")], faded_boss=True,
              extra=stack((50, 32), 7.5), D1=(49.8, 20.8), H1=(46.8, 33.8), D2=(48, 40.4), MT=(54.1, 39))


# Fresh Puff 2 (four puffs on tethers) -- wind Silkie keeps the middle open, ice Silkie gives two safe spots
def drag(frm, to, el):
    return puff(frm, el) + [arrow(frm, to)]


def fp2(boss, el, drags, faded_boss=False, **rl):
    sh = []
    for f, t, e in drags:
        sh += drag(f, t, e)
    return board(boss=[R(boss[0]), R(boss[1])], bossSize=10, shapes=silkie(boss, el, faded=faded_boss) + sh, roles=roles(**rl))


def fp2_after(boss, el, puffs, rot=0, boss_fill=True, **rl):
    sh = el_aoe(el, boss) if boss_fill else []
    for c, e in puffs:
        sh += el_aoe(e, c, rot=rot if e == "T" else 0, spread=30, ln=100)
    if el == "W":
        sh.append(ring(boss, 9, RIM, 0.35))
    for c, e in puffs:
        sh += puff(c, e, e == "I")
    if el == "I":
        sh += puff(boss, "I", True)
        return board(shapes=sh, roles=roles(**rl))
    return board(boss=[R(boss[0]), R(boss[1])], bossSize=10, shapes=sh, roles=roles(**rl))


def b1_22():
    return fp2((50, 52), "W", [((30.8, 30), (19, 30), "I"), ((69.3, 30.6), (82, 18.5), "T"), ((69.2, 69.4), (82.5, 69.8), "I"), ((30.5, 69.2), (19, 81), "T")],
               D1=(14.1, 29.9), MT=(85.9, 15), H1=(86.9, 69.9), D2=(15, 84.7))


def b1_23():
    return fp2_after((50, 52), "W", [((14, 30), "I"), ((85, 15), "T"), ((87, 70), "I"), ((15, 85), "T")], rot=25, boss_fill=False,
                     D1=(52, 44), D2=(46, 47.5), MT=(56.2, 50), H1=(51, 55))


def b1_24():
    return fp2((50, 50), "W", [((49.7, 30.9), (49.7, 19), "T"), ((30.4, 50.1), (30.4, 37), "I"), ((69.4, 49.1), (69.4, 63), "I"), ((50.1, 69.2), (50.1, 80), "T")],
               D1=(49.8, 14.3), D2=(30, 29.2), MT=(69.4, 72.1), H1=(50, 85.1))


def b1_25():
    return fp2_after((50, 50), "W", [((50, 15), "T"), ((30, 32), "I"), ((70, 68), "I"), ((50, 85), "T")],
                     D1=(50.3, 43.8), D2=(45, 51), H1=(55.4, 49), MT=(50.7, 55))


def b1_26():
    return fp2((50, 50), "W", [((50, 30.4), (65.5, 30.4), "I"), ((30.7, 49.9), (17, 49.9), "T"), ((69.3, 50), (83, 50), "T"), ((50.3, 69.5), (35, 69.5), "I")],
               MT=(71.4, 31.6), H1=(12.7, 49.7), D1=(89.1, 49.3), D2=(29.3, 69.4))


def b1_27():
    return fp2_after((50, 50), "W", [((30, 30), "I"), ((11, 50), "T"), ((89, 50), "T"), ((70, 70), "I")],
                     MT=(45.3, 52.7), H1=(48.4, 47.8), D1=(50, 45), D2=(51.6, 51))


def b1_28():
    return fp2((50, 50), "I", [((30.6, 30.1), (17, 17.5), "I"), ((69.3, 30.6), (82, 18), "T"), ((69.3, 69.3), (81.5, 81.5), "I"), ((30.5, 69.3), (18.5, 81.5), "T")],
               H1=(13.2, 14.1), D1=(85.5, 14.8), MT=(84.1, 83.4), D2=(15.5, 84.6))


def b1_29():
    return fp2_after((50, 50), "I", [((16, 16), "I"), ((84, 16), "T"), ((85, 84), "I"), ((15, 84), "T")], rot=20,
                     H1=(69.4, 28.6), D1=(75, 25.2), MT=(36.8, 66.3), D2=(32.1, 62.4))


def b1_30():
    return fp2((50, 50), "I", [((49.7, 30.6), (64.5, 30.6), "T"), ((30.4, 50), (16, 50), "I"), ((69.4, 49.1), (83.5, 49.1), "I"), ((50.1, 69.4), (35.5, 69.4), "T")],
               D1=(69.5, 31.6), H1=(11.8, 49.3), MT=(87.8, 49.5), D2=(30.7, 69.8))


def b1_31():
    return fp2_after((50, 50), "I", [((70, 30), "T"), ((12, 50), "I"), ((89, 50), "I"), ((30, 70), "T")],
                     H1=(28.6, 27.5), D1=(31.5, 32.5), MT=(69.1, 64.5), D2=(71.4, 69.7))


def b1_32():
    return fp2((50, 50), "I", [((50.1, 30.7), (50.1, 18), "I"), ((30.4, 50.1), (30.4, 36), "T"), ((69.5, 49.8), (69.5, 64), "T"), ((50.1, 69.2), (50.1, 81), "I")],
               MT=(50.2, 13.4), D1=(30.4, 31.2), D2=(69.5, 70.3), H1=(49.8, 85.4))


def b1_33():
    return fp2_after((50, 50), "I", [((50, 15), "I"), ((30, 30), "T"), ((70, 70), "T"), ((50, 85), "I")],
                     D1=(68, 31.1), D2=(75.3, 30.4), MT=(29.5, 63.2), H1=(30.7, 68.7))


# Fresh Puff 3 (eight puffs + Eastern Ewers)
P8 = [((26.7, 40.3), "T"), ((43.1, 40.2), "I"), ((59.7, 40.4), "T"), ((77.1, 40.7), "T"),
      ((26.7, 59.8), "T"), ((43.2, 60), "T"), ((59.7, 60.3), "I"), ((77.1, 60.2), "T")]


def b1_34():
    return b1((45, 52.5), None, P8)


def ewer(x):
    return [dot((x, 13), 6.2, "#5aa7dd", 0.95), ring((x, 13), 6.2, "#1d3f6e", 0.6, 0.95),
            line((x, 20), (x, 92), "#ffffff", 1.3, 0.95), arrow((x, 88), (x, 96), "#ffffff", 1.3)]


def b1_35():
    ex = ewer(26.9) + ewer(59.9) + ewer(77.8)
    return b1((47, 55), None, P8, extra=ex, MT=(37.9, 65.9), D1=(44.3, 65.1), H1=(39, 71.6), D2=(41.5, 69))


def b1_36():
    b = (40, 55)
    sh = el_aoe("T", (43, 60), spread=40, ln=75) + el_aoe("I", (43, 40))
    return b1(b, None, [((43, 40), "I", True), ((43, 60), "T")], aoes=sh,
              H1=(22.4, 59.8), MT=(28.9, 60.3), D1=(23.4, 65.8), D2=(26, 63.5))


P6 = [((27, 41), "N", True), ((52, 41), "N", True), ((71, 41), "N", True), ((27, 60.5), "N", True), ((52, 60.5), "N", True), ((71, 60.5), "N", True)]


def b1_37():
    ex = []
    for y in (46.5, 55.5):
        ex += [line((31, y), (79, y), "#ffe066", 1.2, 0.85)]
    ex += linestack((22, 51), (80, 51), 4, 4.5)
    return b1((14, 51), None, P6, extra=ex, MT=(25.2, 50.3), D1=(42.1, 53.3), D2=(48.8, 50.4), H1=(83.6, 50.9))


P6I = [((26.7, 40.1), "I"), ((56.6, 40), "I"), ((73.8, 40.4), "I"), ((26.2, 59.3), "I"), ((56.1, 60.1), "I"), ((73.8, 59.8), "I")]


def b1_38():
    return b1((39.5, 75.5), "W", P6I, MT=(39.4, 82.5), D1=(35.5, 69.2), H1=(45, 81), D2=(44.5, 70))


def b1_39():
    b = (41, 74)
    sh = el_aoe("W", b)
    for c, e in P6I:
        sh += el_aoe("I", c)
    return b1(b, "W", [(c, e, True) for c, e in P6I], aoes=sh + [ring(b, 9, RIM, 0.35)],
              MT=(39.7, 79.9), H1=(37, 76), D1=(42.5, 72), D2=(44, 77))


# Fresh Puff 4 (four ice puffs + Squeaky Clean)
COL4 = [(50, 45.7), (49.7, 58), (49.7, 68.9), (50, 79.6)]


def b1_40():
    return b1((50, 11), None, MT=(48.8, 22), H1=(55, 21.2), D1=(43.6, 19.9), D2=(46, 17))


def b1_41():
    return b1((50, 12), "W", [(c, "I") for c in COL4], MT=(48.8, 22.1), H1=(55, 21.2), D1=(43.7, 20), D2=(46, 17))


def b1_42():
    ex = []
    for c, p in zip(COL4, ((60.8, 46.4), (60.1, 58.6), (60.1, 70.3), (59.8, 79.6))):
        ex += [line(c, p, "#ff5a1f", 0.7, 0.95), text((p[0], p[1] - 6.5), "+", 4.6, "#e0457b")]
    return b1((50, 12), "W", [(c, "I") for c in COL4], extra=ex, D1=(60.8, 46.4), MT=(60.1, 58.6), D2=(60.1, 70.3), H1=(59.8, 79.6))


def b1_43():
    ex = []
    for c in COL4:
        ex += [ring((c[0] + 20, c[1]), 5.5, "#e09a3a", 0.5, 0.95)]
    return b1((50, 12), "W", [(c, "I") for c in COL4], aoes=[rect((25, 50), 50, 100, 0, ORANGE, 0.45)], extra=ex,
              D1=(59.6, 46.7), MT=(59.8, 58.9), D2=(59.8, 69.1), H1=(59.3, 79.5))


COL4B = [(69.3, 45.8), (68.8, 58.2), (68.8, 69.1), (69.2, 79.8)]


def b1_44():
    return b1((50, 12), "W", [(c, "I") for c in COL4B], MT=(44.4, 15.4), H1=(47.7, 17.7), D1=(53.4, 17.2), D2=(50.5, 19.5))


def b1_45():
    b = (50, 12)
    sh = el_aoe("W", b)
    for c in COL4B:
        sh += el_aoe("I", c)
    return b1(b, "W", [(c, "N", True) for c in COL4B], aoes=sh + [ring(b, 9, RIM, 0.35)],
              MT=(44.2, 15.9), D1=(54.3, 18.4), H1=(48, 19.5), D2=(51.5, 14.5))


import os as _os
_HERE = _os.path.dirname(_os.path.abspath(__file__))
for _f in ("sc_b2.py", "sc_b3.py"):
    if _os.path.exists(_os.path.join(_HERE, _f)):
        exec(open(_os.path.join(_HERE, _f), encoding="utf-8").read())

SCENES = {k.replace("_", "-"): v for k, v in globals().items() if k[:3] in ("b1_", "b2_", "b3_") and callable(v)}
