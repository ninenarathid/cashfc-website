"""P5 Pandora scenes (fru_mana/05/*)."""
from base import *
from p3 import boss_ring


def pan(**kw):
    sh = [ring(C, 41, "#c89070", 0.25, 0.35), ring(C, 21, "#c89070", 0.25, 0.35)]
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 48.4), pol(a, 50.5), "#555555", 0.7, 0.9))
    s = {"frame": [1, 1], "bg": "#f3f3f3",
         "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": "#4a3632", "lines": False, "edge": "#1d1210"},
         "waymarks": None, "markSize": 5.6, "iconSize": 6.6, "bossSize": 8}
    s["shapes"] = sh + kw.pop("shapes", [])
    s.update(kw)
    return s


# the six lines of the crown (as Tuufless draws them)
L_H = ((7, 26), (57, 26))
L_V1 = ((57, 2), (57, 98))
L_V2 = ((8, 26), (8, 62))
L_D1 = ((51, 2), (3, 50))      # "/" through the crown's top
L_D2 = ((29, 2), (92, 65))     # "\" through the crown's top
L_D3 = ((3, 57), (44, 98))     # "\" lower left


def crown_lines():
    return [line(a, b, "#ffffff", 0.35, 0.85) for a, b in (L_H, L_V1, L_V2, L_D1, L_D2, L_D3)]


def crown_tris():
    out = []
    for tri in (((33, 22), (40, 14), (47, 22)), ((10, 27), (22, 27), (10, 39)), ((45, 27), (56, 27), (56, 38)), ((3, 48), (9, 41), (9, 60))):
        for k in range(3):
            out.append(line(tri[k], tri[(k + 1) % 3], "#38d36b", 0.6, 0.95))
    return out


def diamond(cx, cy, w=6, h=13, col="#38d36b"):
    pts = [(cx - w, cy - h), (cx, cy - h + w), (cx, cy + h), (cx - w, cy + h - w)]
    pts = [(cx - w / 2, cy - h), (cx + w / 2, cy - h + w), (cx + w / 2, cy + h), (cx - w / 2, cy + h - w)]
    return [line(pts[k], pts[(k + 1) % 4], col, 0.6, 0.95) for k in range(4)]


def fb01():
    return pan(roles={"MT": (30, 46)}, shapes=crown_lines() + boss_ring(C, 270, 16))


def fb02():
    return pan(roles={"MT": (30, 46)}, shapes=crown_lines() + crown_tris() + boss_ring(C, 270, 16))


def fb03():
    sh = [band((51, 0), (51, 100), 12, "#f0a0d0", 0.35), band(L_D2[0], L_D2[1], 12, "#f0a0d0", 0.35)]
    return pan(roles={"MT": (30, 46)}, shapes=crown_lines() + sh + boss_ring(C, 270, 16))


def bands(spec):
    out = []
    for (p0, p1, w, col) in spec:
        out.append(band(p0, p1, w, col, 0.42))
    return out


MAG, YEL = "#e040c0", "#f0c040"


def fb04():
    sh = bands([((51, 0), (51, 100), 12, MAG), ((63, 0), (63, 100), 12, YEL), ((18, 0), (98, 80), 12, MAG), ((6, 0), (96, 90), 12, YEL)])
    sh += diamond(51, 43, 12, 13) + boss_ring(C, 270, 16)
    return pan(roles={"MT": (27, 55)}, shapes=sh)


def fb05():
    sh = bands([((39, 0), (39, 100), 12, MAG), ((79, 0), (79, 100), 12, YEL), ((0, 2), (60, 62), 12, YEL), ((0, 12), (98, 2), 10, "#f0a0d0")])
    sh += diamond(39, 42, 12, 14) + boss_ring(C, 270, 16) + [arrow((28, 50), (37, 47))]
    return pan(roles={"MT": (25, 53)}, shapes=sh)


def sd05():
    sh = bands([((39, 0), (39, 100), 12, MAG), ((79, 0), (79, 100), 12, YEL), ((0, 2), (60, 62), 12, YEL)])
    sh += [line((33, 50), (45, 50), "#38d36b", 0.6), line((45, 50), (45, 60), "#38d36b", 0.6), line((45, 60), (33, 50), "#38d36b", 0.6)]
    sh += boss_ring(C, 270, 16) + [arrow((28, 52), (40, 53))]
    return pan(roles={"MT": (25, 53)}, shapes=sh)


def fb06():
    sh = bands([((28, 0), (28, 100), 12, MAG), ((10, 25), (98, 25), 12, YEL), ((0, 10), (60, 70), 12, YEL), ((0, 70), (60, 10), 12, MAG)])
    sh += boss_ring(C, 270, 16) + [arrow((33, 52), (40, 56))]
    return pan(roles={"MT": (35, 52)}, shapes=sh)


def fb07():
    sh = bands([((10, 0), (10, 100), 12, MAG), ((0, 39), (98, 39), 12, YEL), ((60, 0), (0, 60), 12, MAG), ((0, 70), (60, 120), 12, "#f0c8b0")])
    sh += [line((19, 50), (33, 38), "#38d36b", 0.6), line((33, 38), (43, 38), "#38d36b", 0.6), line((43, 38), (29, 50), "#38d36b", 0.6), line((29, 50), (19, 50), "#38d36b", 0.6)]
    sh += boss_ring(C, 270, 16) + [arrow((38, 52), (32, 42))]
    return pan(roles={"MT": (40, 55)}, shapes=sh)


def sd07():
    sh = bands([((10, 0), (10, 100), 12, MAG), ((0, 39), (98, 39), 12, YEL), ((60, 0), (0, 60), 12, MAG)])
    sh += [line((25, 39), (35, 39), "#38d36b", 0.6), line((35, 39), (25, 50), "#38d36b", 0.6), line((25, 50), (25, 39), "#38d36b", 0.6)]
    sh += boss_ring(C, 270, 16) + [arrow((32, 53), (29, 43))]
    return pan(roles={"D1": (34, 56)}, shapes=sh)


def fb08():
    sh = bands([((5, 0), (5, 100), 10, YEL), ((0, 52), (98, 52), 12, YEL), ((0, 98), (90, 8), 12, MAG), ((0, 50), (60, 110), 12, MAG)])
    sh += boss_ring(C, 270, 16) + [arrow((34, 45), (40, 41))]
    return pan(roles={"MT": (30, 46)}, shapes=sh)


def fb09():
    sh = bands([((28, 0), (28, 100), 12, YEL), ((0, 67), (98, 67), 12, YEL), ((0, 15), (85, 100), 12, MAG), ((0, 95), (95, 0), 12, MAG)])
    sh += [line((22, 40), (34, 50), "#38d36b", 0.6), line((34, 50), (34, 66), "#38d36b", 0.6), line((34, 66), (22, 55), "#38d36b", 0.6), line((22, 55), (22, 40), "#38d36b", 0.6)]
    sh += boss_ring(C, 270, 16) + [arrow((38, 46), (30, 52))]
    return pan(roles={"MT": (43, 43)}, shapes=sh)


def fb10():
    sh = bands([((40, 0), (40, 100), 12, YEL), ((0, 79), (98, 79), 12, YEL), ((0, 10), (95, 100), 12, MAG), ((5, 100), (98, 7), 12, MAG)])
    return pan(roles={"MT": (27, 50)}, shapes=sh + boss_ring(C, 270, 16))


def fb11():
    sh = bands([((51, 0), (51, 100), 12, YEL), ((0, 92), (98, 92), 12, YEL), ((15, 0), (98, 70), 12, MAG), ((5, 100), (98, 38), 12, MAG)])
    r = {"MT": (27, 37), "H1": (30, 39), "D1": (27, 41), "D3": (30, 35), "ST": (27, 57), "H2": (30, 59), "D2": (27, 61), "D4": (30, 55)}
    return pan(roles=r, shapes=sh + boss_ring(C, 270, 16))


def fb12():
    sh = bands([((62, 0), (62, 100), 12, YEL), ((20, 0), (98, 80), 12, MAG), ((15, 100), (98, 25), 12, MAG)])
    sh += [circle((35, 37), 9, YEL, 0.4, 0.01), circle((32, 57), 9, MAG, 0.4, 0.01)]
    r = {"MT": (33, 36), "H1": (37, 38), "ST": (30, 56), "H2": (34, 58)}
    return pan(roles=r, shapes=sh + boss_ring(C, 270, 16))


def faq():
    sh = bands([((10, 0), (10, 100), 12, MAG), ((0, 39), (98, 39), 12, YEL), ((60, 0), (0, 60), 12, MAG)])
    sh += [line((16, 50), (30, 38), "#38d36b", 0.6), line((30, 38), (40, 38), "#38d36b", 0.6), line((40, 38), (26, 50), "#38d36b", 0.6), line((26, 50), (16, 50), "#38d36b", 0.6)]
    sh += [line((40, 38), (35, 42), RED, 0.8), line((35, 42), (40, 43), RED, 0.8), line((40, 43), (40, 38), RED, 0.8)]
    sh += boss_ring(C, 300, 16) + [arrow((25, 52), (27, 46))]
    return pan(roles={"MT": (37, 54)}, shapes=sh)


# ---------------------------------------------------------------- Paradise Regained
def ptower(c, n=None):
    out = [circle(c, 7.5, "#e8dc6a", 0.3, 0.01), ring(c, 7.5, "#f4e98a", 0.45, 0.9)]
    for a in (45, 135, 225, 315):
        out.append(line(pol(a, 5.5, c), pol(a, 10, c), "#f0b020", 0.5))
    return out


def tnum(c, n):
    return [text(c, str(n), 7, "#ffffff")]


def wing(side, col):
    a0, a1 = (190, 340) if side == "W" else (20, 170)
    return arc(C, 13.5, a0, a1, col, 1.5, 0.95, head=False) + arc(C, 16.5, a0 + 10, a1 - 10, col, 1.0, 0.9, head=False)


T1, T2, T3 = (50, 67), (31, 37), (66, 37)


def pr01():
    r = {"MT": (50, 35), "ST": (39, 54), "D4": (45, 55), "D3": (51, 53), "D2": (57, 55), "D1": (34, 56), "H1": (47, 68), "H2": (53, 68)}
    sh = ptower(T1) + tnum((50, 80), 1) + boss_ring(C, 0, 16)
    return pan(roles=r, shapes=sh)


def pr02(light):
    if light:
        r = {"MT": (50, 33), "H1": (51, 67), "D1": (67, 48), "D2": (69, 49), "ST": (68, 59)}
        sh = wing("W", "#ffe060") + [line(C, (68, 59), "#f0f0c0", 0.5)]
    else:
        r = {"MT": (50, 33), "H1": (47, 70), "D1": (27, 49), "D2": (29, 51), "ST": (45, 52)}
        sh = wing("E", "#9020a0")
    sh = ptower(T1) + ptower(T2) + tnum((50, 80), 1) + tnum((22, 30), 2) + boss_ring(C, 0, 16) + sh
    return pan(roles=r, shapes=sh)


def pr03(light):
    if light:
        r = {"MT": (50, 33), "H1": (51, 67), "D1": (67, 48), "D2": (69, 49), "ST": (84, 69)}
        sh = wing("W", "#ffe060") + [line(C, (84, 69), "#f0f0c0", 0.5), arrow((72, 66), (82, 66))]
    else:
        r = {"MT": (50, 33), "H1": (47, 70), "D1": (27, 46), "D2": (29, 48), "ST": (45, 49)}
        sh = wing("W", "#ffe060") + wing("E", "#9020a0")
    sh = ptower(T1) + ptower(T2) + ptower(T3) + tnum((50, 80), 1) + tnum((22, 30), 2) + tnum((78, 30), 3) + boss_ring(C, 0, 16) + sh
    return pan(roles=r, shapes=sh)


def pr04(light):
    if light:
        sh = [cone(C, 292.5, 225, 70, "#e0a040", 0.42)]
        r = {"MT": (50, 33), "H1": (53, 66), "D1": (67, 42), "D2": (69, 44), "ST": (83, 66)}
        extra = [circle((83, 66), 12, "#fff0c0", 0.4, 0.01)] + [arrow((52, 37), (51, 45)), arrow((48, 30), (37, 32))]
    else:
        sh = [cone(C, 67.5, 225, 70, "#c040b0", 0.42)]
        r = {"MT": (50, 33), "H1": (47, 70), "D1": (27, 42), "D2": (29, 44), "ST": (45, 52)}
        extra = [circle((45, 52), 10, "#c040b0", 0.4, 0.01), arrow((50, 29), (50, 8)), arrow((53, 33), (63, 37))]
    sh += ptower(T1) + ptower(T2) + ptower(T3) + tnum((50, 80), 1) + tnum((22, 30), 2) + tnum((78, 30), 3) + boss_ring(C, 0, 16) + extra
    return pan(roles=r, shapes=sh)


def pr05(light):
    if light:
        sh = [cone(C, 185, 225, 70, "#c040b0", 0.42)]
        r = {"MT": (50, 45), "H1": (55, 28), "H2": (52, 30), "D1": (34, 36), "D2": (37, 37), "D3": (65, 37), "D4": (68, 40), "ST": (70, 62)}
        extra = [circle((50, 45), 9, "#c040b0", 0.35, 0.01)]
    else:
        sh = [cone(C, 162, 210, 70, "#e0a040", 0.42)]
        r = {"MT": (50, 9), "H1": (47, 32), "H2": (44, 33), "D3": (32, 38), "D4": (38, 40), "D1": (61, 40), "D2": (64, 38), "ST": (45, 52)}
        extra = [circle((50, 9), 12, "#fff0c0", 0.4, 0.01), line(C, (50, 9), "#f0f0c0", 0.5)]
    sh += ptower(T2) + ptower(T3) + tnum((22, 30), 2) + tnum((78, 30), 3) + boss_ring(C, 0, 16) + extra
    return pan(roles=r, shapes=sh)


def pr06():
    r = {"MT": (50, 29), "H1": (47, 33), "H2": (44, 33), "D3": (32, 37), "D4": (38, 39), "D1": (61, 38), "D2": (65, 36), "ST": (46, 52)}
    sh = ptower(T3) + tnum((78, 30), 3) + boss_ring(C, 0, 16)
    return pan(roles=r, shapes=sh)


# ---------------------------------------------------------------- Polarizing Strikes
def ps(front, back, light_col="#f0e8e8", dark_col="#f090d0"):
    sh = [band(C, pol(225, 60), 13, light_col, 0.38), band(C, pol(135, 60), 13, dark_col, 0.38)] + boss_ring(C, 180, 16)
    return sh


def ps01():
    r = {"MT": (38, 63), "D1": (35, 66), "H1": (31, 69), "D3": (33, 70),
         "ST": (62, 64), "D2": (65, 67), "D4": (68, 69), "H2": (66, 71)}
    sh = ps(None, None) + [dot((41, 60), 1.3, "#fff3c0"), dot((64.5, 60.5), 1.3, "#7a6cff"), arrow((46, 70), (42, 66)), arrow((54, 70), (58, 66))]
    return pan(roles=r, shapes=sh)


def ps02():
    r = {"MT": (48, 68), "ST": (52, 69), "D1": (46, 72), "D2": (54, 72)}
    sh = [band(C, pol(225, 60), 13, "#f0c040", 0.42), band(C, pol(135, 60), 13, MAG, 0.42)] + boss_ring(C, 180, 16)
    sh += [arrow((47, 66), (38, 63)), arrow((53, 66), (61, 63))]
    return pan(roles=r, shapes=sh)


def ps03():
    r = {"D1": (40, 60), "ST": (33, 70), "H1": (36, 67), "D3": (31, 66),
         "D2": (59, 61), "MT": (66, 70), "D4": (63, 64), "H2": (64, 67)}
    sh = ps(None, None) + [arrow((46, 70), (42, 66)), arrow((54, 70), (58, 66))]
    return pan(roles=r, shapes=sh)
