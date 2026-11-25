"""Every scene of the Another Mount Rokkon (Savage) guide, redrawn from game8's pictures (mostly 440x440 squares).
x, y and sizes in % of the frame's width (square frames unless said). Measured on 5 % grid sheets, the blob detectors
(tools/detect.cjs, tools/blobs.cjs) and colour runs (tools/edges.cjs); checked on build.mjs --compare sheets.

Seats: game8's T = MT, H = H1; its D1 = D1 (Melee), D2 = D2 (Range). Where game8 draws one "D" for both DPS, D1 and
D2 stand on that spot together.
"""
import math

R = lambda v: round(v, 2)
ORANGE = "#ff9b3d"
PURPLE = "#8a5aa8"
PINK = "#e0567e"
GOLD = "#ffd23f"
BG = "#5c5e63"
SQ = [1, 1]


def off(c, ang, r):
    t = math.radians(ang)
    return (R(c[0] + math.sin(t) * r), R(c[1] - math.cos(t) * r))


def hp(p, ang, o=0.4, c=ORANGE):
    """Half-plane on the side `ang` (degrees from north, clockwise) of the line through p, as a big rotated rect."""
    cx, cy = off(p, ang, 150)
    return {"t": "rect", "at": [cx, cy], "w": 400, "h": 300, "rot": ang, "c": c, "o": o}


def band(at, rot, w, ln=110, o=0.42, c=ORANGE):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": w, "h": ln, "rot": rot, "c": c, "o": o}


def circ(at, r, o=0.42, c=ORANGE):
    return {"t": "circle", "at": [R(at[0]), R(at[1])], "r": r, "c": c, "o": o}


def ring(at, r, c=GOLD, wd=0.6, o=0.95):
    return {"t": "ring", "at": [R(at[0]), R(at[1])], "r": r, "c": c, "wd": wd, "o": o}


def donut(at, r, r2, o=0.42, c=ORANGE):
    return {"t": "donut", "at": [R(at[0]), R(at[1])], "r": r, "r2": r2, "c": c, "o": o}


def cone(at, d, spread, ln=90, o=0.42, c=ORANGE):
    return {"t": "cone", "at": [R(at[0]), R(at[1])], "dir": d, "spread": spread, "len": ln, "c": c, "o": o}


def line(a, b, c="white", wd=0.5, o=0.95, dash=False):
    s = {"t": "line", "from": [R(a[0]), R(a[1])], "to": [R(b[0]), R(b[1])], "c": c, "wd": wd, "o": o}
    if dash:
        s["dash"] = True
    return s


def arrow(a, b, c="white", wd=0.8, o=0.95):
    return {"t": "arrow", "from": [R(a[0]), R(a[1])], "to": [R(b[0]), R(b[1])], "c": c, "wd": wd, "o": o}


def dot(at, r=1.6, c="white", o=1):
    return {"t": "dot", "at": [R(at[0]), R(at[1])], "r": r, "c": c, "o": o}


def text(at, s, size=3.2, c="white"):
    return {"t": "text", "at": [R(at[0]), R(at[1])], "s": s, "size": size, "c": c}


def rect(at, w, h, c, o=1, rot=0):
    return {"t": "rect", "at": [R(at[0]), R(at[1])], "w": w, "h": h, "c": c, "o": o, "rot": rot}


def both(p, dx=2.2, dy=2.6):
    """game8's single D: D1 and D2 on that spot together."""
    return {"D1": [R(p[0] - dx / 2), R(p[1] - dy / 2)], "D2": [R(p[0] + dx / 2), R(p[1] + dy / 2)]}


def party(T=None, H=None, D=None, D1=None, D2=None):
    r = {}
    if T: r["MT"] = [R(T[0]), R(T[1])]
    if H: r["H1"] = [R(H[0]), R(H[1])]
    if D: r.update(both(D))
    if D1: r["D1"] = [R(D1[0]), R(D1[1])]
    if D2: r["D2"] = [R(D2[0]), R(D2[1])]
    return r


def scene(arena, shapes, roles=None, boss=None, bossSize=None, waymarks=None, frame=None, bg=BG, **kw):
    s = {"frame": frame or SQ, "bg": bg, "arena": arena, "waymarks": waymarks, "shapes": shapes}
    if roles: s["roles"] = roles
    if boss: s["boss"] = boss
    if bossSize: s["bossSize"] = bossSize
    s.update(kw)
    return s


# ============================================================ trash before boss 1
def yuki_route1():
    """b1-03: the Shishu yuki's first walk: from the north, round the whole field (351x440 picture)."""
    C = "#e8442e"
    sh = [line((3.5, 7.5), (97.5, 7.5), C, 1.2), line((97.5, 7.5), (97.5, 97.5), C, 1.2), line((97.5, 97.5), (3.5, 97.5), C, 1.2),
          line((3.5, 97.5), (3.5, 7.5), C, 1.2), line((50, 7.5), (50, 97.5), C, 1.2),
          arrow((66, 96.9), (52.5, 96.9), C, 2.0), line((50, 7.5), (50, 4.6), C, 0.5), text((50, 2.6), "START", 3.6, C)]
    return scene(None, sh, frame=[351, 440], bg="#f4f4f6")


def yuki_route2():
    """b1-04: after the first lap it turns back at the half: two loops, back up the middle."""
    C = "#e8442e"
    sh = []
    for x0, x1 in ((4, 49), (53, 97)):
        sh += [line((x0, 2.5), (x1, 2.5), C, 1.2), line((x1, 2.5), (x1, 98), C, 1.2), line((x1, 98), (x0, 98), C, 1.2), line((x0, 98), (x0, 2.5), C, 1.2)]
    sh += [line((46.5, 98), (46.5, 9), C, 1.2), arrow((46.5, 20), (46.5, 7), C, 1.6), arrow((55.5, 20), (55.5, 7), C, 1.6)]
    return scene(None, sh, frame=[350, 440], bg="#f4f4f6")


# ============================================================ boss 1: Shishio
ARC = lambda fill: {"shape": "circle", "at": [50, 50], "r": 41.5, "fill": fill, "lines": False, "edge": "#151517"}
GREY, DARK = "#5d5e61", "#2c2d30"


def spokes():
    out = []
    for a in (0, 45, 90, 135):
        out.append(line(off((50, 50), a, 41.5), off((50, 50), a + 180, 41.5), "#1d1d20", 0.25, 0.9))
    return out


def cloud(p, o=0.95):
    return {"t": "circle", "at": [R(p[0]), R(p[1])], "r": 3.8, "c": PURPLE, "o": o}


def boom(p, r=16, o=0.4):
    return circ(p, r, o)


def bands(*rots, w=32.5):
    return [band((50, 50), r, w, 86 if r == 0 else 89, 0.42) for r in rots]


def inband(p, rot, w=32.5):
    u = (math.sin(math.radians(rot)), -math.cos(math.radians(rot)))
    v = (p[0] - 50, p[1] - 50)
    return abs(v[0] * u[1] - v[1] * u[0]) < w / 2


# clouds as the detector found them on each picture
C05 = [(43.4, 15.0), (58.3, 15.2), (71.0, 22.0), (23.6, 25.8), (36.6, 25.8), (14.2, 41.8), (44.6, 41.8), (84.4, 58.0),
       (53.0, 59.6), (62.8, 73.1), (75.0, 75.5), (23.7, 76.8), (41.9, 85.0), (55.5, 85.0)]
C08 = [(39.6, 15.1), (56.3, 15.5), (70.9, 21.3), (24.5, 24.9), (39.6, 30.0), (16.2, 39.0), (84.2, 43.0), (13.9, 57.5),
       (53.7, 59.3), (81.0, 60.3), (56.5, 73.0), (70.8, 76.5), (36.5, 83.5), (55.1, 85.3)]
C11 = [(38.9, 15.9), (73.9, 22.2), (86.2, 40.7), (13.4, 43.6), (85.4, 55.1), (25.0, 76.8), (40.0, 82.9), (61.1, 83.4)]
C14 = [(24.6, 22.2), (87.9, 49.9), (60.9, 83.4)]


def smoke_tell(clouds, rots):
    return scene(ARC(GREY), spokes() + [cloud(c) for c in clouds] + bands(*rots))


def se1_tell():          # b1-05
    return smoke_tell(C05, (60,))


def se1_start():         # b1-06
    hit = [c for c in C05 if inband(c, 60)]
    sh = [cloud(c, 0.5 if c in hit else 0.95) for c in C05] + bands(60) + [boom(c) for c in hit]
    return scene(ARC(DARK), sh, party(T=(14.2, 44.1), H=(86.5, 55.0), D=(81.3, 56.2)))


def se1_end():           # b1-07
    gone = [c for c in C05 if inband(c, 60)]
    wave2 = [(36.6, 25.8), (58.3, 15.2), (62.8, 73.1)]
    sh = [cloud(c, 0.5) for c in C05 if c not in gone]
    sh += [boom(c) for c in wave2]
    return scene(ARC(DARK), sh, party(T=(44.6, 52.1), H=(51.4, 53.0), D=(54.7, 49.5)))


def se1b_tell():         # b1-08
    return smoke_tell(C08, (60,))


def se1b_start():        # b1-09
    hit = [c for c in C08 if inband(c, 60)]
    sh = [cloud(c, 0.5 if c in hit else 0.95) for c in C08] + bands(60) + [boom(c) for c in hit]
    return scene(ARC(DARK), sh, party(T=(40.0, 30.9), H=(37.5, 79.5), D=(32.5, 82.8)))


def se1b_end():          # b1-10
    left = [c for c in C08 if not inband(c, 60)]
    return scene(ARC(GREY), spokes() + [cloud(c) for c in left], party(T=(51.8, 43.9), H=(48.9, 52.4), D=(43.5, 52.8)))


def se2_tell():          # b1-11
    return smoke_tell(C11, (0, 120))


def se2_first():         # b1-12
    hit = [(38.9, 15.9), (40.0, 82.9), (61.1, 83.4)]
    sh = [cloud(c, 0.5 if c in hit else 0.95) for c in C11] + bands(0, 120) + [boom((38, 14), 19.5), boom((37, 81), 19.5), boom((58, 85), 19.5)]
    return scene(ARC(DARK), sh, party(T=(70.8, 24.2), H=(75.8, 21.1), D=(70.8, 18.1)))


def se2_second():        # b1-13
    hit = [(13.4, 43.6), (25.0, 76.8), (85.4, 55.1), (86.2, 40.7)]
    sh = [cloud(c, 0.5 if c in hit else 0.95) for c in C11 if c not in [(38.9, 15.9), (40.0, 82.9), (61.1, 83.4)]]
    sh += bands(120) + [boom((14, 44), 18.5), boom((25, 78), 20), boom((86, 48), 20)]
    return scene(ARC(DARK), sh, party(T=(34.0, 19.0), H=(39.1, 16.0), D=(34.0, 12.9)))


def se3_tell():          # b1-14
    return smoke_tell(C14, (0, 60, 120))


def se3_start():         # b1-15
    sh = [cloud(c, 0.5 if c == (60.9, 83.4) else 0.95) for c in C14] + bands(0, 60, 120) + [boom((56, 68), 42)]
    return scene(ARC(DARK), sh, party(T=(9.1, 47.9), H=(13.1, 50.7), D=(10.0, 54.9)))


def se3_second():        # b1-16
    sh = [cloud((24.6, 22.2)), cloud((87.9, 49.9), 0.5)] + bands(120) + [boom((77, 46), 39)]
    return scene(ARC(DARK), sh, party(T=(41.2, 81.3), H=(45.1, 84.1), D=(42.0, 88.2)))


def se3_end():           # b1-17
    sh = [cloud((24.6, 22.2), 0.5)] + bands(120) + [boom((22, 24), 37)]
    return scene(ARC(DARK), sh, party(T=(44.7, 72.4), H=(48.6, 75.2), D=(45.5, 79.3)))


# --- Haunting Cry and the thunder vortex: a square floor
SQ1 = {"shape": "square", "at": [50, 50], "w": 79, "h": 79, "fill": "#2a2b2e", "lines": False, "edge": "#111"}
YUKI = "#f3d27a"


def yuki(p, face=None, dim=False):
    o = 0.45 if dim else 1
    sh = [ring(p, 3.1, PINK, 0.7, o), dot(p, 2.3, YUKI, o)]
    if face is not None:
        sh.append(arrow(off(p, face, 2.4), off(p, face, 6.2), PINK, 0.8, 0.9 if not dim else 0.45))
    return sh


def hc_find():           # b1-21
    sh = []
    for p in ((31, 33), (67, 33)):
        sh += yuki(p, 135 if p[0] < 50 else 225) + [ring(p, 5.2, GOLD, 0.6)]
    for p in ((31, 67), (67, 67)):
        sh += yuki(p)
    # the two facing the middle point the way across it; the far side between the other two is safe
    sh += [line((33, 37), (72, 90), "#e8442e", 0.45, 0.85), line((65, 37), (28, 90), "#e8442e", 0.45, 0.85),
           line((10, 52), (38, 90), "#e8442e", 0.45, 0.85), line((90, 52), (62, 90), "#e8442e", 0.45, 0.85),
           ring((50, 78), 6, "#7cd67c", 0.6)]
    return scene(SQ1, sh, boss=[49.5, 51], bossSize=10)


def hc_both():           # b1-22
    sh = []
    for p in ((31, 33), (67, 33), (31, 67), (67, 67)):
        sh += yuki(p)
    for p in ((49, 33), (31, 50), (67, 50), (49, 67)):
        sh += yuki(p, dim=True)
    return scene(SQ1, sh, boss=[50, 51], bossSize=10)


def hc_first():          # b1-23: four half-arena cleaves leave a diamond below the middle
    sh = [hp((50, 50), 315, 0.38), hp((50, 50), 45, 0.38), hp((33, 67), 225, 0.38), hp((67, 67), 135, 0.38)]
    for p in ((31, 33), (67, 33), (49, 33), (31, 47), (67, 47)):
        sh += yuki(p, dim=p in ((49, 33), (31, 47), (67, 47)))
    sh += [circ(p, 8.6, 0.5, "#6a5aa8") for p in ((49.2, 54.3), (36.0, 65.3), (62.3, 66.3), (49.6, 79.7))]
    return scene(SQ1, sh, party(T=(49.2, 54.3), H=(36.0, 65.3), D1=(62.3, 66.3), D2=(49.6, 79.7)))


def hc_second():         # b1-24: the second four leave a square north-west of the boss
    sh = [hp((27.5, 50), 270, 0.36), hp((50, 50), 90, 0.36), hp((50, 28), 0, 0.36), hp((50, 51), 180, 0.36)]
    for p in ((49, 29), (31, 48), (67, 50), (49, 75)):
        sh += yuki(p)
    return scene(SQ1, sh, party(T=(43.1, 29.3), H=(46.4, 30.2), D1=(30.1, 48.8), D2=(31.8, 44.5)), boss=[49, 52], bossSize=10)


# thunder vortex: donut (inside the boss's ring safe) or circle (outside safe)
def vx_donut_pairs():    # b1-25
    sh = [donut((50, 50), 72, 13.5, 0.42)]
    return scene(SQ1, sh, party(T=(38.2, 48.9), H=(41.4, 43.6), D1=(59.5, 46.7), D2=(59.0, 53.5)), boss=[50, 51], bossSize=16)


def spread_rings(*ps, r=7.2):
    return [circ(p, r, 0.45, "#6a5aa8") for p in ps]


def vx_circle_spread():  # b1-26
    T, H, D1, D2 = (47.1, 25.0), (24.8, 46.9), (73.6, 51.0), (49.0, 73.1)
    sh = [circ((50, 50), 18.5, 0.45)] + spread_rings(T, H, D1, D2)
    return scene(SQ1, sh, party(T=T, H=H, D1=D1, D2=D2), boss=[50, 51], bossSize=16)


def vx_circle_pairs():   # b1-27
    sh = [circ((50, 50), 18.5, 0.45)]
    return scene(SQ1, sh, party(T=(38.2, 28.0), H=(32.5, 31.4), D1=(71.5, 63.6), D2=(67.0, 68.1)), boss=[50, 51], bossSize=16)


def vx_donut_spread():   # b1-28
    T, H, D1, D2 = (49.1, 37.1), (38.6, 49.6), (59.8, 48.1), (49.8, 59.4)
    sh = [donut((50, 50), 72, 13.5, 0.42)] + spread_rings(T, H, D1, D2)
    return scene(SQ1, sh, party(T=T, H=H, D1=D1, D2=D2), boss=[50, 51], bossSize=16)
