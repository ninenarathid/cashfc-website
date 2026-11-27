"""P4 (Kefka Says) and P5 (Ultima Kefka) scenes, each redrawn from kanatan.info's picture named in its function."""
from basedmu import *

WM = {"A": [50, 13], "1": [27, 29], "2": [73, 29], "D": [13, 50], "B": [87, 50], "4": [27, 74], "3": [73, 74], "C": [50, 88]}


def kboard(w, h, wm=WM, hit=True, **kw):
    s = board(w, h, at=(50, 50.5), r=48.5, wm=wm, boss=[50, 50])
    if hit:
        s["shapes"] = [ring((50, 50.5), 15, "#ff4a4a", 0.9, 0.9)]
    s.update(kw)
    return s


def spread_c(c, r=11, col=ORANGE, o=0.55):
    return [circle(c, r, col, o, 0.01)]


# ================================================================== P4
def p4_07():
    """Flood of Naught: Neo Exdeath's two beams, one colour each side; its front (the line between) kills."""
    s = board(508, 490, at=(50, 51), r=40, wm=None)
    c = (50, 51)
    sh = [cone(c, 315, 180, 41, "#2a3ad8", 0.75), cone(c, 135, 180, 41, "#8a2ad0", 0.75), band((76, 26), (22, 79), 8, "#ff3030", 0.55)]
    sh += [dot((48, 13), 4.5, "#bfe8ff", 0.95), dot((95, 55), 4.5, "#e0a8ff", 0.95)]
    sh += label((36, 45), "Blue beam", 3.0) + label((66, 62), "Purple beam", 3.0) + label((48, 56), "Front: death", 2.6, "#ffffff", "#801818")
    s["shapes"] = sh
    s["boss"] = [[83, 30]]
    return s


def p4_09():
    """Set 1, Neo Exdeath at marker 2 = 12 o'clock: Tank/Healer stack 12, DPS stack 6, spreads 10/2 (T/H) and 4/8 (DPS)."""
    s = kboard(503, 513)
    sh = spread_c((88, 58), 19) + spread_c((64, 92), 19) + stack((60, 41), 8, 4, 2) + stack((40, 72), 8, 4, 2)
    s["shapes"] += sh
    s["roles"] = roles(MT=(57, 40), ST=(63, 37), H2=(61, 44), D2=(37, 70), D1=(43, 70), D3=(42, 75), H1=(84, 63), D4=(65, 88))
    return s


def p4_10():
    """True Thundaga (lines): gaze holders in the middle; everyone else looks out (true gaze), in the safe lane."""
    s = kboard(500, 520)
    sh = [band((22, 6), (100, 84), 22, "#b040e0", 0.55), band((0, 50), (52, 102), 22, "#b040e0", 0.55)]
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(MT=(30, 38), H1=(33, 45), H2=(31, 51), D1=(31, 58), D4=(33, 71), D3=(44, 75), D2=(45, 56), ST=(52, 56))
    return s


def p4_11():
    """Fire: everybody under Kefka; when the debuff ends, step out of the circle towards the next spot."""
    w, h = 926, 491
    kk = h / w
    L, Rr = (24, 50), (74, 50)
    s = panels(w, h, [(L, 22), (Rr, 22)], [wm_ring(L, 17, 15.5, kk), wm_ring(Rr, 17, 15.5, kk)])
    sh = [circle(Rr, 10, "#ff7a1a", 0.8, 0.01), ring(L, 7, "#ff4a4a", 0.7, 0.9), arrow((45, 50), (49, 50), "#111111", 1.0)]
    s["shapes"] += sh
    s["boss"] = [[24, 48]]
    s["roles"] = roles(MT=[(22, 48), (65, 50)], ST=[(24, 46), (72, 32)], H1=[(26, 48), (75, 29)], H2=[(23, 52), (78, 34)],
                       D1=[(25, 51), (84, 50)], D2=[(21, 51), (70, 64)], D3=[(27, 52), (78, 66)], D4=[(24, 53), (74, 67)])
    return s


def p4_12():
    """Set 2 with Blizzard (true here: NW and SE quadrants hit): T/H stack north, its spread west; DPS stack south, spread east."""
    s = kboard(499, 501)
    sh = [cone((50, 50.5), 315, 90, 49, "#3a6ad8", 0.6), cone((50, 50.5), 135, 90, 49, "#3a6ad8", 0.6)]
    sh += spread_c((13, 56), 17) + spread_c((80, 47), 17) + stack((56, 34), 8, 4, 2) + stack((45, 74), 8, 4, 2)
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(ST=(53, 32), H1=(60, 32), H2=(57, 37), D4=(41, 71), D3=(48, 71), D2=(45, 77), MT=(14, 53), D1=(81, 49))
    return s


def p4_13():
    """Second gaze: the two gaze holders in the middle; the rest around them."""
    s = kboard(500, 499)
    s["roles"] = roles(ST=(49, 32), H1=(60, 32), MT=(30, 50), D1=(70, 50), H2=(53, 49), D4=(47, 53), D2=(42, 72), D3=(49, 71))
    return s


def p4_14():
    """Water puddles + Mana Release (here: both charges true, both releases false = stand in both)."""
    s = kboard(510, 522)
    sh = [cone((50, 50.5), 45, 90, 49, ORANGE, 0.5), cone((50, 50.5), 225, 90, 49, ORANGE, 0.5),
          cone((50, 50.5), 315, 90, 49, ORANGE, 0.35), cone((50, 50.5), 135, 90, 49, ORANGE, 0.35),
          band((22, 6), (100, 84), 22, "#e0303a", 0.45), band((0, 50), (52, 102), 22, "#e0303a", 0.45),
          circle((50, 50.5), 12, "#3a6ad8", 0.75, 0.01)]
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(MT=(46, 46), ST=(50, 45), H1=(54, 46), H2=(46, 50), D1=(54, 50), D2=(46, 54), D3=(50, 55), D4=(54, 54))
    s["iconSize"] = 5.2
    return s


# ================================================================== P5
def flood_panel(c, r, axis, offs):
    out = []
    for o in offs:
        m = off(c, axis, o * r)
        p0 = off(m, axis + 90, r * 1.15)
        p1 = off(m, axis - 90, r * 1.15)
        out += [band(p0, p1, r * 0.5, "#3a6ad8", 0.6)]
    return out


def p5_03():
    """Flood: the four telegraphs, in order ① ② ③ ④ (two lanes each, one lane apart)."""
    w, h = 559, 563
    kk = h / w
    cs = [(27, 25), (77, 25), (27, 75), (77, 75)]
    s = panels(w, h, [(c, 22) for c in cs], [wm_ring(c, 17, 15, kk) for c in cs])
    sh = flood_panel(cs[0], 22, 45, (-0.6, 0.4)) + flood_panel(cs[1], 22, 315, (0.6, -0.4))
    sh += flood_panel(cs[2], 22, 45, (0.5, -0.5)) + flood_panel(cs[3], 22, 315, (-0.6, 0.4))
    for n, c in zip("1234", ((7, 6), (57, 6), (7, 56), (57, 56))):
        sh += [dot(c, 3, "#ffffff", 0.95), ring(c, 3, "#111111", 0.4, 0.9), text(c, n, 3.6, "#111111")]
    s["shapes"] += sh
    s["boss"] = [[27, 25], [77, 25], [27, 75], [77, 75]]
    s["bossSize"] = 5
    return s


def p5_04():
    """How to dodge (D2 as the example): wait beside lanes ① and ②, step into ① once it has gone off, then into ②."""
    w, h = 1253, 1174
    kk = h / w
    cs = [(21, 23), (76, 23), (22, 75), (76, 75)]
    s = panels(w, h, [(c, 20.5) for c in cs], [wm_ring(c, 15.5, 14, kk) for c in cs])
    sh = flood_panel(cs[0], 20.5, 45, (-0.6, 0.4)) + flood_panel(cs[1], 20.5, 315, (0.6, -0.4))
    sh += flood_panel(cs[2], 20.5, 45, (0.5, -0.5)) + flood_panel(cs[3], 20.5, 315, (-0.6, 0.4))
    sh += stack((76, 19), 3, 2.2, 1.1) + stack((26, 74), 3, 2.2, 1.1) + stack((80, 72), 3, 2.2, 1.1)
    sh += [arrow((44, 26), (53, 26), "#111111", 1.6), arrow((44, 78), (53, 78), "#111111", 1.6), arrow((53, 44), (44, 50), "#111111", 0.8)]
    s["shapes"] += sh
    s["boss"] = [[21, 23], [76, 23], [22, 75], [76, 75]]
    s["bossSize"] = 4.5
    s["iconSize"] = 4.2
    s["roles"] = roles(D2=[(16, 19), (76, 17), (26, 72), (80, 70)])
    return s


ORCH = dict(MT=(37, 26), ST=(62, 25), D3=(29, 42), D4=(69, 42), D1=(31, 59), D2=(71, 64), H1=(41, 76), H2=(60, 76))


def p5_05():
    s = kboard(523, 537)
    s["roles"] = roles(**ORCH)
    return s


def p5_06():
    s = kboard(511, 514)
    sh = [circle(c, 11, "#e04040", 0.55, 0.01) for c in ((38, 22), (62, 22))]
    sh += [circle(c, 11, "#3a6ad8", 0.55, 0.01) for c in ((73, 40), (73, 62), (60, 74))]
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(MT=(38, 22), ST=(62, 22), D3=(31, 41), D4=(73, 40), D1=(31, 59), D2=(73, 62), H1=(45, 74), H2=(60, 74))
    return s


def p5_08():
    s = kboard(517, 546)
    sh = [circle((49, 33), 11, "#e04040", 0.65, 0.01)] + stack((49, 33), 6, 3.4, 1.6)
    sh += [circle(c, 11, "#3a6ad8", 0.5, 0.01) for c in ((28, 50), (37, 63), (61, 63))]
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(ST=(46, 33), MT=(53, 33), D1=(28, 50), D2=(37, 63), H1=(61, 63), D4=(84, 57), D3=(90, 64), H2=(49, 85))
    return s


def p5_09():
    s = kboard(531, 541)
    sh = [circle((49, 30), 11, "#3a6ad8", 0.55, 0.01), cone((50, 2), 180, 50, 8, "#e8f0ff", 0.9)]
    s["shapes"] = sh + s["shapes"]
    s["roles"] = roles(MT=(50, 6), ST=(49, 31), H2=(28, 82), H1=(33, 79), D3=(54, 84), D1=(59, 86), D2=(60, 80), D4=(66, 78))
    return s


TW = {"i1": (43, 30), "i2": (34, 42), "i3": (33, 56), "t1": (57, 30), "t2": (66, 42), "t3": (67, 57),
      "f1": (37, 70), "f2": (50, 75), "f3": (63, 70)}
TCOL = {"i": "#9ab6c8", "t": "#e0c020", "f": "#e08a8a"}
TLIT = {"i": "#22e0ee", "t": "#ffee00", "f": "#ff1a1a"}


def towers9(lit=(), o=0.75):
    out = []
    for k, c in TW.items():
        if k in lit:
            out += [circle(c, 7, TLIT[k[0]], 0.95, 0.01)]
        else:
            out += [circle(c, 7, TCOL[k[0]], o, 0.01)]
    return out


def resmark(c, el):
    col = {"i": "#7ad0ff", "t": "#ffe060", "f": "#ff7a4a", "n": "#c8c8c8"}[el]
    s = {"i": "I", "t": "T", "f": "F", "n": "-"}[el]
    return [rect(c, 4.2, 4.6, 0, "#2a2024", 0.95, 0.2), ring(c, 2.3, col, 0.5, 0.95), text(c, s, 2.8, col)]


def p5_11():
    s = kboard(519, 534)
    s["shapes"] = towers9() + s["shapes"]
    return s


def p5_12():
    """Round 1 (ice lit twice here): resistance-down = the next element clockwise; no debuff = the CCW one of the double."""
    s = kboard(523, 538)
    s["shapes"] = towers9(("i2", "i3", "t1", "f3")) + s["shapes"]
    s["shapes"] += resmark((34, 42), "n") + resmark((33, 56), "f") + resmark((57, 30), "i") + resmark((63, 70), "t")
    return s


def p5_15():
    s = kboard(537, 536)
    s["arena"]["fill"] = "#4a7a48"
    s["shapes"] = [circle((50, 50.5), 48.5, "#6aaa5a", 0.5, 0.01)] + towers9(("i2", "i3", "t1", "f3"))
    s["shapes"] += [circle((50, 50.5), 16, "#2a3040", 0.9, 0.01), ring((50, 50.5), 15, "#ff4a4a", 0.9, 0.9)]
    s["shapes"] += resmark((31, 42), "n") + resmark((31, 56), "f") + resmark((57, 32), "i") + resmark((65, 68), "t")
    return s


def tw2(c0, k, lit):
    out = []
    for key, c in TW.items():
        cc = (c0[0] + (c[0] - 50) * k, c0[1] + (c[1] - 50) * 1.0 * k)
        col = TLIT[key[0]] if key in lit else TCOL[key[0]]
        out += [circle(cc, 7 * k, col, 0.95 if key in lit else 0.7, 0.01)]
    return out


def twp(c0, k, key):
    c = TW[key]
    return (c0[0] + (c[0] - 50) * k, c0[1] + (c[1] - 50) * k)


def p5_16():
    """Round 2 (thunder lit twice here): everybody moves one element clockwise from their first tower."""
    w, h = 1085, 531
    kk = h / w
    L, Rr = (24, 50), (77, 50)
    s = panels(w, h, [(L, 23), (Rr, 23)], [wm_ring(L, 18, 16, kk), wm_ring(Rr, 18, 16, kk)])
    k = 0.47
    sh = tw2(L, k, ("i1", "t3", "f1", "f2")) + tw2(Rr, k, ("i1", "t3", "f1", "f2"))
    sh += [arrow(twp(L, k, "i2"), twp(L, k, "f1"), "#3a6ad8", 0.5), arrow(twp(L, k, "i3"), twp(L, k, "t3"), "#3a6ad8", 0.5),
           arrow(twp(L, k, "t1"), twp(L, k, "f2"), "#3a6ad8", 0.5), arrow(twp(L, k, "f3"), twp(L, k, "i1"), "#3a6ad8", 0.5),
           arrow((48, 52), (51, 52), "#111111", 1.0)]
    s["shapes"] += sh
    s["boss"] = [[24, 50], [77, 50]]
    return s


def p5_17():
    """Round 3 (fire lit twice here) + Catastrophic Choice again (brown = circle: stand on the outer side)."""
    w, h = 1112, 543
    kk = h / w
    L, Rr = (24, 50), (76, 50)
    s = panels(w, h, [(L, 23), (Rr, 23)], [wm_ring(L, 18, 16, kk), wm_ring(Rr, 18, 16, kk)])
    k = 0.47
    sh = tw2(L, k, ("i2", "t1", "t2", "f3")) + tw2(Rr, k, ("i2", "t1", "t2", "f3"))
    sh += [circle(Rr, 12, "#ff8a1a", 0.6, 0.01)]
    sh += [arrow(twp(L, k, "i1"), twp(L, k, "t1"), "#3a6ad8", 0.5), arrow(twp(L, k, "t3"), twp(L, k, "f3"), "#3a6ad8", 0.5),
           arrow(twp(L, k, "f1"), twp(L, k, "i2"), "#3a6ad8", 0.5), arrow(twp(L, k, "f2"), twp(L, k, "t2"), "#3a6ad8", 0.5),
           arrow((48, 52), (51, 52), "#111111", 1.0)]
    s["shapes"] += sh
    s["boss"] = [[24, 50], [76, 50]]
    return s


def exa(c, r=9):
    return [circle(c, r, "#ff9b3d", 0.45, 0.01), ring(c, r, "#ffb347", 0.4, 0.95)] + chevron(c, 225, 5, 2.4, "#fff0b0", 1.0, 0.95)


def p5_19():
    """Stray Apocalypse: the first exaflare lanes from the north-west, rushing south-east."""
    s = board(549, 546, at=(47, 50), r=46, wm=wm_ring((47, 50), 37, 33, 1.0), boss=[47, 50])
    sh = []
    for c in ((27, 10), (33, 20), (42, 31), (51, 42), (62, 53), (72, 64), (82, 74)):
        sh += exa(c)
    for c in ((4, 37), (11, 47), (20, 58), (29, 70), (38, 81), (46, 91), (55, 99)):
        sh += exa(c)
    s["shapes"] = sh
    return s


def p5_20():
    """Then the next pair from the north-east, rushing south-west, and so on (north-west and north-east in turn)."""
    s = board(610, 545, at=(57, 50), r=42, wm=wm_ring((57, 50), 33, 29, 545 / 610), boss=[57, 50])
    sh = []
    for c in ((62, 3), (52, 13), (40, 25), (30, 35), (20, 46), (11, 57)):
        sh += exa(c)
    for c in ((86, 27), (77, 38), (67, 50), (58, 61), (47, 74), (37, 85)):
        sh += exa(c)
    s["shapes"] = sh
    return s
