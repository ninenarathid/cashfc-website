"""P3 (Exdeath and Chaos) scenes, each redrawn from kanatan.info's P3 picture named in its function (dl/img/p3-NN)."""
from basedmu import *


def two_bosses(chaos, exdeath, rc=11, re=8):
    out = [ring(chaos, rc, "#d02020", 0.6, 0.9), ring(exdeath, re, "#d02020", 0.6, 0.9)]
    out += namebox((chaos[0], chaos[1]), "Chaos") + namebox((exdeath[0], exdeath[1]), "Exdeath")
    return out


CRY = {"wind": (26, 28.5), "water": (72, 28.5), "fire": (26, 76)}


def crystals(pos=CRY):
    out = []
    for k, c in pos.items():
        out += crystal(c, k)
    return out


def p3_08():
    """Tank LB way: where everybody stands once the crystals are out (wind NW, water NE, fire SW in this example)."""
    s = board(706, 730, at=(49, 51), r=48.5, wm=wm_ring((49, 51), 36, 33, 730 / 706))
    for k in "1234":
        s["waymarks"].pop(k)
    sh = crystals() + two_bosses((24, 29), (73, 77))
    sh += deb((18, 15), "fire") + deb((88, 83), "fire") + deb((33, 33), "water") + deb((88, 31), "water")
    s["shapes"] = sh
    s["roles"] = roles(D1=(20, 18), D2=(14, 23), MT=(34, 37), H2=(38, 36), H1=(35, 41), D4=(67, 15), D3=(89, 35), ST=(82, 85))
    return s


def p3_09():
    s = p3_08()
    s["shapes"] = [circle((73, 77), 40, "#3a6ad8", 0.6, 0.01)] + s["shapes"]
    s["roles"]["ST"] = [39, 43]
    return s


def p3_10():
    s = p3_09()
    s["shapes"] += [circle((18, 19), 9, RED, 0.5, 0.01), circle((37, 42), 9, RED, 0.5, 0.01)]
    return s


def p3_11():
    s = board(709, 721, at=(49, 51), r=48.5, wm=wm_ring((49, 51), 36, 33, 721 / 709))
    for k in "1234":
        s["waymarks"].pop(k)
    sh = [donut((37, 43), 24, 9, RED, 0.6)] + crystals() + two_bosses((24, 29), (73, 77))
    s["shapes"] = sh
    s["roles"] = roles(D1=(20, 18), D2=(14, 23), MT=(34, 38), H2=(38, 36), H1=(35, 42), ST=(40, 43), D4=(67, 15), D3=(89, 35))
    return s


def p3_12():
    """Implosion: the bosses stacked; the first pair of cones, then the other pair (party moves round)."""
    w, h = 1610, 733
    kk = h / w
    L, Rr = (24.5, 55), (74.5, 55)
    s = panels(w, h, [(L, 19.5), (Rr, 19.5)], [wm_ring(L, 15, 13, kk), wm_ring(Rr, 15, 13, kk)])
    bl, br = (17, 37), (67, 37)
    sh = [cone(bl, 135, 90, 40, "#3a6ad8", 0.55), cone(bl, 315, 90, 40, "#3a6ad8", 0.55),
          cone(br, 45, 90, 40, "#3a6ad8", 0.55), cone(br, 225, 90, 40, "#3a6ad8", 0.55)]
    sh += crystal((17, 37), "wind", 3) + crystal((40.5, 37), "water", 3) + crystal((17, 77), "fire", 3)
    sh += crystal((67, 37), "wind", 3) + crystal((90.5, 37), "water", 3) + crystal((67, 77), "fire", 3)
    sh += namebox((16, 40), "Chaos + Exdeath", 1.6) + namebox((66, 40), "Chaos + Exdeath", 1.6)
    sh += [arrow((47, 55), (51.5, 55), "#111111", 1.2)]
    s["shapes"] += sh
    s["roles"] = roles(ST=[(14, 24), (71, 43)], D1=[(17, 27), (64, 23)], D2=[(15, 30), (61, 30)], MT=[(22, 29), (69, 43)],
                       H1=[(25, 32), (73, 46)], H2=[(20, 33), (67, 47)], D4=[(27, 27), (83, 33)], D3=[(30, 32), (91, 39)])
    return s


def p3_13():
    """The later fire / water go off, then the water crystal hits the two nearest (D3 and D4 here)."""
    w, h = 1419, 709
    kk = h / w
    L, Rr = (24, 55), (74, 55)
    s = panels(w, h, [(L, 22.5), (Rr, 22.5)], [wm_ring(L, 17, 15, kk), wm_ring(Rr, 17, 15, kk)])
    sh = [donut((19, 45), 12, 4.5, "#3a6ad8", 0.65), donut((44, 41), 10, 3.5, "#3a6ad8", 0.65),
          circle((84, 15), 6.5, "#3a6ad8", 0.65, 0.01), circle((92, 41), 6.5, "#3a6ad8", 0.65, 0.01)]
    sh += crystal((13, 30), "wind", 3) + crystal((37, 31), "water", 3) + crystal((13, 77), "fire", 3)
    sh += crystal((64, 30), "wind", 3) + crystal((87, 31), "water", 3) + crystal((63, 77), "fire", 3)
    sh += namebox((13, 33), "Chaos + Exdeath", 1.5) + namebox((63, 33), "Chaos + Exdeath", 1.5)
    sh += [arrow((47.5, 50), (51.5, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["roles"] = roles(D1=[(9, 22), (60, 22)], D2=[(12, 25), (63, 25)], ST=[(17, 43), (68, 43)], H1=[(20, 44), (71, 44)],
                       H2=[(18, 40), (69, 40)], MT=[(22, 41), (73, 41)], D4=[(34, 22), (84, 15)], D3=[(44, 41), (92, 41)])
    return s


def p3_14():
    """D3 stands opposite the bosses to bait Umbra Smash; D4 joins the bosses."""
    s = board(704, 723, at=(49, 51), r=48.5, wm=wm_ring((49, 51), 36, 33, 723 / 704))
    for k in "1234":
        s["waymarks"].pop(k)
    sh = crystal((26, 28), "wind") + crystal((72, 28), "water") + crystal((26, 76), "fire")
    sh += [ring((25, 28), 11, "#d02020", 0.6, 0.9)] + namebox((25, 28), "Chaos + Exdeath")
    s["shapes"] = sh
    s["roles"] = roles(D1=(18, 18), D2=(15, 22), MT=(36, 37), H1=(32, 38), ST=(37, 39), H2=(34, 40), D4=(43, 35), D3=(79, 86))
    return s


def p3_15():
    """After Vacuum Wave: pairs in the wind crystal's stacks (tank LB); Chaos has jumped to D3's spot."""
    s = board(704, 711, at=(49, 51), r=48.5, wm=wm_ring((49, 51), 36, 33, 711 / 704))
    for k in "1234":
        s["waymarks"].pop(k)
    sh = crystal((26, 31), "wind") + crystal((72, 28), "water") + crystal((26, 76), "fire")
    sh += [circle(c, 10, "#3fd04a", 0.55, 0.01) for c in ((35, 24), (48, 45), (33, 53), (14, 57))]
    sh += [ring((26, 33), 7, "#d02020", 0.6, 0.9), ring((82, 73), 11, "#d02020", 0.6, 0.9)]
    sh += namebox((26, 35), "Exdeath") + namebox((82, 73), "Chaos")
    s["shapes"] = sh
    s["roles"] = roles(D2=(32, 24), D1=(37, 26), D4=(47, 42), D3=(49, 47), ST=(31, 53), MT=(35, 53), H2=(11, 57), H1=(16, 57))
    return s


def p3_18():
    """Ultima Blaster: Kefka dashes across from the edge (here D to B), then turns round the arena for 8 dashes."""
    w, h = 1168, 558
    kk = h / w
    L, Rr = (23, 50), (73, 50)
    s = panels(w, h, [(L, 21.5), (Rr, 21.5)], [wm_ring(L, 16, 14, kk), wm_ring(Rr, 16, 14, kk)])
    sh = [band((0, 51), (46, 51), 8.5, "#c060f0", 0.55), band((48, 92), (96, 12), 8.5, "#c060f0", 0.55)]
    sh += [arrow((44, 51), (50, 51), "#111111", 1.2)]
    sh += [ring((11, 23), 4.5, "#d02020", 0.6, 0.9), ring((31, 78), 6, "#d02020", 0.6, 0.9),
           ring((61, 23), 4.5, "#d02020", 0.6, 0.9), ring((81, 78), 6, "#d02020", 0.6, 0.9)]
    sh += namebox((11, 23), "Exdeath", 1.6) + namebox((31, 78), "Chaos", 1.6) + namebox((61, 23), "Exdeath", 1.6) + namebox((81, 78), "Chaos", 1.6)
    s["shapes"] += sh
    s["boss"] = [[5, 51], [55, 85]]
    return s


def p3_20():
    """Ultima Blaster dice: 1-8 between the waymarks, from B (the first dash's end) clockwise (against Kefka's turn)."""
    s = board(800, 800, at=(46, 50), r=45, wm=wm_ring((46, 50), 29, 27, 1.0))
    sh = []
    pos = [(88, 63), (60, 92), (28, 90), (8, 65), (8, 35), (28, 10), (62, 10), (88, 35)]
    starts = [(4, 50), (12, 12), (46, 3), (85, 12), (93, 50), (85, 88), (46, 97), (10, 88)]
    for n, (c, st) in enumerate(zip(pos, starts), 1):
        sh += [band(st, c, 6, "#c060f0" if n % 2 == 0 else "#ff9b3d", 0.35)]
    for n, c in enumerate(pos, 1):
        sh += [dot(c, 3.4, "#15161a", 0.92), ring(c, 3.4, "#ffffff", 0.4, 0.95), text(c, str(n), 3.6, "#ffffff")]
    sh += [arrow((83, 70), (68, 85), "#ffd23f", 1.0)]
    s["shapes"] = sh
    s["boss"] = [[4, 50]]
    return s


BH_A = [(40, 20), (53, 31), (83, 41), (10, 50), (38, 52), (67, 52), (94, 57), (23, 64), (53, 66), (65, 83), (51, 95)]
BH_B = [(51, 8), (63, 20), (63, 33), (19, 39), (33, 39), (8, 50), (68, 63), (82, 63), (41, 70), (41, 82), (51, 95)]


def bhs(ps, r=3.6):
    out = []
    for c in ps:
        out += blackhole(c, r)
    return out


def p3_23():
    s = board(532, 556, at=(49, 52), r=48, wm=wm_ring((49, 52), 37, 34, 556 / 532))
    s["shapes"] = bhs(BH_A)
    s["boss"] = [[50, 3]]
    return s


def p3_24():
    s = board(542, 552, at=(49, 51), r=48, wm=wm_ring((49, 51), 37, 34, 552 / 542))
    s["shapes"] = bhs(BH_B)
    s["boss"] = [[15, 7]]
    return s


def p3_30():
    """Slap Happy: three circles one after another from Kefka's side (the raised hand's half)."""
    s = board(553, 552, at=(55, 52), r=46, wm=wm_ring((55, 52), 37, 33, 1.0))
    sh = [circle((25, 38), 22, ORANGE, 0.55, 0.01), circle((45, 60), 22, ORANGE, 0.55, 0.01), circle((65, 85), 22, ORANGE, 0.55, 0.01)]
    sh += [text((25, 38), "1", 6, "#111111"), text((45, 63), "2", 6, "#111111"), text((65, 85), "3", 6, "#111111")]
    s["shapes"] = sh
    s["boss"] = [[16, 6]]
    return s


def p3_31():
    """Slap Happy, Kefka at A: role spread (Tank 10:30, Healer 9, DPS 7:30) or everybody's stack at 3 o'clock."""
    s = board(546, 559, at=(49, 52), r=48, wm=wm_ring((49, 52), 36, 33, 559 / 546))
    c = (49, 52)
    sh = [cone(c, 315, 30, 45, ORANGE, 0.55), cone(c, 270, 30, 45, ORANGE, 0.55), cone(c, 225, 30, 45, ORANGE, 0.55),
          cone(c, 90, 40, 48, ORANGE, 0.55), ring(c, 12, "#d02020", 0.6, 0.9)]
    sh += namebox((72, 50), "Stack: all", 2.4)
    s["shapes"] = sh
    s["boss"] = [[49, 3]]
    s["roles"] = roles(ST=(32, 31), MT=(37, 36), H2=(25, 49), H1=(32, 49), D2=(36, 59), D1=(41, 61), D3=(34, 69), D4=(39, 72))
    return s


def bhboard(w, h, at, r, bh, **kw):
    s = board(w, h, at=at, r=r, wm=kw.pop("wm", None) or wm_ring(at, 0.76 * r, 0.7 * r, h / w))
    sh = kw.pop("pre", []) + bhs(bh) + [ring(at, 11, "#d02020", 0.6, 0.9)] + kw.pop("post", [])
    s["shapes"] = sh
    s.update(kw)
    return s


def p3_32():
    """Black hole set 1, first beam: Attack 1 (H2 here) takes the tether; Attack 2 waits opposite."""
    bh = [(40, 18), (51, 30), (82, 40), (10, 49), (36, 52), (66, 52), (93, 57), (20, 63), (51, 66), (64, 81), (50, 95)]
    s = bhboard(534, 549, (50, 52), 48, bh, pre=[beam((93, 57), (4, 90), 9)],
                post=[tether((93, 57), (63, 67))] + tagm((67, 63), "A1") + tagm((31, 40), "A2") + namebox((56, 52), "Chaos"))
    s["boss"] = [[50, 3]]
    s["roles"] = roles(H2=(63, 67), D3=(28, 44))
    return s


def p3_33():
    bh = [(37, 18), (51, 30), (80, 37), (10, 49), (37, 49), (66, 49), (19, 61), (51, 62), (63, 78), (46, 92)]
    s = bhboard(559, 552, (50, 52), 48, bh, pre=[beam((10, 49), (100, 4), 9), beam((46, 92), (0, 24), 9)],
                post=[tether((10, 49), (36, 29)), tether((46, 92), (29, 68))] + tagm((40, 26), "A2") + tagm((33, 65), "A1")
                + namebox((56, 50), "Chaos"))
    s["boss"] = [[50, 3]]
    s["roles"] = roles(D3=(36, 29), H2=(29, 68))
    return s


def p3_36():
    """Damning Edict (Chaos, the half towards one player) then Slap Happy again: dodge, then spread / stack."""
    w, h = 1121, 548
    kk = h / w
    L, Rr = (21, 50), (58, 50)
    s = panels(w, h, [(L, 18.5), (Rr, 18.5)], [wm_ring(L, 14, 12.5, kk), wm_ring(Rr, 14, 12.5, kk)])
    sh = [cone(L, 300, 180, 26, ORANGE, 0.55), ring(L, 5, "#d02020", 0.6, 0.9)] + namebox(L, "Chaos", 1.8)
    sh += [circle((50, 22), 9, ORANGE, 0.5, 0.01), circle((60, 34), 9, ORANGE, 0.5, 0.01), cone(Rr, 90, 40, 20, ORANGE, 0.5),
           cone(Rr, 135, 40, 20, ORANGE, 0.5), cone(Rr, 180, 40, 20, ORANGE, 0.5), cone(Rr, 225, 40, 20, ORANGE, 0.5),
           ring(Rr, 5, "#d02020", 0.6, 0.9)] + namebox(Rr, "Chaos", 1.8)
    sh += [arrow((38, 50), (41.5, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["boss"] = [[4, 9], [41, 9]]
    s["roles"] = roles(D1=[(14, 70), (59, 72)], D2=[(17, 68), (61, 72)], MT=[(19, 72), (47, 66)], ST=[(21, 76), (50, 66)],
                       D4=[(20, 70), (59, 68)], D3=[(18, 77), (60, 76)], H2=[(14, 81), (50, 77)], H1=[(18, 81), (51, 73)])
    return s


def p3_37():
    """Set 2: Attack 1-3 take the three outer tethers clockwise from Kefka; Bind 1 comes to take over from Attack 1."""
    bh = [(51, 8), (63, 20), (63, 33), (19, 39), (33, 39), (8, 50), (68, 63), (82, 63), (41, 70), (41, 82), (51, 95)]
    pre = [beam((51, 8), (88, 82), 9), beam((8, 50), (80, 12), 9), beam((51, 95), (2, 25), 9)]
    post = [tether((51, 8), (74, 52)), tether((8, 50), (41, 31)), tether((51, 95), (28, 55))]
    post += tagm((77, 47), "A1") + tagm((32, 52), "A2") + tagm((45, 27), "A3") + tagm((53, 44), "B1")
    post += [arrow((53, 49), (70, 53), "#ff3030", 0.6)]
    s = bhboard(542, 555, (50, 52), 48, bh, pre=pre, post=post)
    s["boss"] = [[8, 8]]
    s["roles"] = roles(H2=(74, 54), D3=(28, 57), D4=(41, 32), MT=(50, 49))
    return s


def p3_38():
    bh = [(51, 8), (63, 20), (63, 33), (8, 50), (68, 63), (82, 63), (41, 70), (41, 82), (51, 95)]
    post = [tether((51, 8), (68, 52)), tether((8, 50), (41, 31)), tether((51, 95), (29, 56))]
    post += tagm((72, 47), "B1") + tagm((33, 52), "A2") + tagm((45, 27), "A3")
    s = bhboard(542, 552, (50, 52), 48, bh, post=post)
    s["boss"] = [[8, 8]]
    s["roles"] = roles(MT=(68, 52), D3=(29, 57), D4=(41, 32))
    return s


def p3_39():
    """Then Bind 2 takes over from Attack 2 (H1 from D3 here)."""
    w, h = 1165, 558
    kk = h / w
    L, Rr = (23, 50), (74, 50)
    s = panels(w, h, [(L, 21.5), (Rr, 21.5)], [wm_ring(L, 16, 14.5, kk), wm_ring(Rr, 16, 14.5, kk)])
    bl = [(24, 7), (29, 16), (29, 27), (9, 33), (15, 33), (4, 50), (31, 63), (38, 63), (18, 71), (18, 83), (23, 95)]
    br = [(x + 51, y) for x, y in bl]
    sh = [beam((24, 7), (40, 85), 4.5), beam((4, 50), (40, 12), 4.5), beam((23, 95), (2, 25), 4.5),
          beam((75, 7), (91, 85), 4.5), beam((55, 50), (91, 12), 4.5), beam((74, 95), (53, 25), 4.5)]
    sh += bhs(bl, 1.8) + bhs(br, 1.8)
    sh += [tether((24, 7), (31, 49)), tether((4, 50), (19, 31)), tether((23, 95), (13, 55)),
           tether((75, 7), (82, 49)), tether((55, 50), (70, 31)), tether((74, 95), (60, 55))]
    sh += [ring(L, 5, "#d02020", 0.6, 0.9), ring(Rr, 5, "#d02020", 0.6, 0.9), arrow((22, 51), (15, 55), "#ff3030", 0.5),
           arrow((47, 50), (51, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["boss"] = [[4, 7], [55, 7]]
    s["roles"] = roles(MT=[(31, 49), (82, 49)], D4=[(19, 31), (70, 31)], D3=[(13, 55)], H1=[(23, 51), (60, 55)])
    return s


def p3_40():
    """Kefka has moved (south-east here) before the third beam: Bind 1 / Attack 3 / Bind 2 hold the tethers."""
    bh = [(51, 8), (63, 20), (63, 33), (19, 39), (33, 39), (8, 50), (68, 63), (82, 63), (41, 70), (41, 82), (51, 95)]
    pre = [beam((51, 8), (88, 82), 9), beam((8, 50), (80, 12), 9), beam((51, 95), (2, 25), 9)]
    post = [tether((51, 8), (68, 51)), tether((8, 50), (41, 30)), tether((51, 95), (27, 55))]
    post += tagm((72, 46), "B1") + tagm((45, 26), "A3") + tagm((31, 50), "B2")
    s = bhboard(552, 553, (50, 52), 48, bh, pre=pre, post=post)
    s["boss"] = [[90, 90]]
    s["roles"] = roles(MT=(68, 51), D4=(41, 30), H1=(27, 55))
    return s


def p3_41():
    """Damning Edict, then Look upon Me and Despair (a line from Kefka): get out of both, in that order."""
    w, h = 1161, 555
    kk = h / w
    L, Rr = (20, 50), (68, 50)
    s = panels(w, h, [(L, 19), (Rr, 19)], [wm_ring(L, 14.5, 13, kk), wm_ring(Rr, 14.5, 13, kk)])
    sh = [cone((24, 40), 270, 180, 30, ORANGE, 0.55), band((90, 94), (52, 10), 15, "#c060f0", 0.6)]
    sh += [ring((24, 40), 6, "#d02020", 0.6, 0.9), ring((63, 40), 6, "#d02020", 0.6, 0.9)] + namebox((24, 40), "Chaos", 1.8) + namebox((63, 40), "Chaos", 1.8)
    sh += [arrow((37, 50), (40, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["boss"] = [[40, 90], [88, 88]]
    s["roles"] = roles(MT=[(37, 38), (84, 38)], ST=[(39, 41), (86, 41)], H1=[(36, 43), (83, 43)], H2=[(38, 45), (85, 45)],
                       D1=[(40, 37), (87, 37)], D2=[(35, 40), (82, 40)], D3=[(40, 44), (87, 44)], D4=[(37, 47), (84, 47)])
    s["iconSize"] = 3.6
    return s


SET3 = [(25, 10), (20, 20), (26, 31), (10, 50), (20, 51), (32, 52), (36, 66), (28, 70), (17, 64), (26, 82), (34, 87)]


def p3_43():
    """Set 3: Bind 1-3 take the tethers clockwise from Kefka; Stop 1 takes over from Bind 1."""
    w, h = 1125, 557
    kk = h / w
    L, Rr = (24, 50), (75, 50)
    s = panels(w, h, [(L, 22), (Rr, 22)], [wm_ring(L, 16.5, 15, kk), wm_ring(Rr, 16.5, 15, kk)])
    bl = [(24, 7), (18, 18), (24, 30), (5, 50), (17, 52), (31, 52), (30, 75), (37, 63), (11, 64), (21, 82), (31, 90)]
    br = [(x + 51, y) for x, y in bl]
    sh = [beam((24, 7), (36, 90), 4.5), beam((5, 50), (40, 6), 4.5), beam((37, 63), (2, 80), 4.5)]
    sh += bhs(bl, 1.8) + bhs(br, 1.8)
    sh += [tether((24, 7), (33, 42)), tether((5, 50), (17, 32)), tether((37, 63), (26, 69)),
           tether((75, 7), (84, 42)), tether((56, 50), (68, 30)), tether((88, 63), (77, 69))]
    sh += [ring((24, 50), 6, "#d02020", 0.6, 0.9), ring((75, 50), 6, "#d02020", 0.6, 0.9),
           arrow((22, 49), (17, 35), "#ff3030", 0.5), arrow((48, 50), (51, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["boss"] = [[44, 90], [95, 90]]
    s["roles"] = roles(H1=[(33, 42), (84, 42)], MT=[(17, 32)], D1=[(26, 69), (77, 69)], ST=[(22, 50), (68, 30)])
    return s


def p3_44():
    """Then Stop 2 takes over from Bind 2 (D2 from H1 here)."""
    w, h = 1138, 560
    kk = h / w
    L, Rr = (24, 50), (75, 50)
    s = panels(w, h, [(L, 22), (Rr, 22)], [wm_ring(L, 16.5, 15, kk), wm_ring(Rr, 16.5, 15, kk)])
    bl = [(24, 7), (18, 18), (24, 30), (5, 50), (17, 52), (31, 52), (25, 66), (37, 63), (11, 64), (30, 81)]
    br = [(x + 51, y) for x, y in bl]
    sh = [beam((24, 7), (36, 90), 4.5), beam((5, 50), (40, 6), 4.5), beam((37, 63), (2, 80), 4.5)]
    sh += bhs(bl, 1.8) + bhs(br, 1.8)
    sh += [tether((24, 7), (33, 42)), tether((5, 50), (17, 32)), tether((37, 63), (26, 66)),
           tether((75, 7), (84, 42)), tether((56, 50), (68, 30)), tether((88, 63), (77, 66))]
    sh += [ring((24, 50), 6, "#d02020", 0.6, 0.9), ring((75, 50), 6, "#d02020", 0.6, 0.9),
           arrow((24, 50), (31, 44), "#ff3030", 0.5), arrow((48, 50), (51, 50), "#111111", 1.2)]
    s["shapes"] += sh
    s["boss"] = [[34, 92], [85, 92]]
    s["roles"] = roles(H1=[(33, 42)], ST=[(17, 32), (68, 30)], D1=[(26, 66), (77, 66)], D2=[(24, 52), (84, 42)])
    return s


def p3_45():
    """Third beam of set 3: Stop 1 / Stop 2 / Bind 3 hold the tethers; Kefka has moved (west here)."""
    s = board(648, 561, at=(58, 52), r=40, wm=wm_ring((58, 52), 31, 28, 561 / 648))
    bh = [(58, 11), (50, 26), (58, 40), (24, 64), (46, 63), (70, 63), (41, 83), (94, 73), (57, 85), (82, 50), (69, 101)]
    sh = [beam((24, 64), (100, 2), 9), beam((58, 11), (96, 108), 9), beam((94, 73), (18, 104), 9)]
    sh += bhs(bh, 3.4) + [tether((24, 64), (46, 40)), tether((58, 11), (74, 55)), tether((94, 73), (68, 82)), ring((58, 52), 11, "#d02020", 0.6, 0.9)]
    sh += tagm((49, 35), "S1") + tagm((78, 51), "S2") + tagm((71, 78), "B3") + namebox((58, 52), "Chaos")
    s["shapes"] = sh
    s["boss"] = [[7, 60]]
    s["roles"] = roles(ST=(46, 40), D2=(74, 55), D1=(68, 82))
    return s


def p3_46():
    """White Hole + Implosion + Slap Happy: get HP full; dodge the first cones, then the second, then spread / stack."""
    w, h = 1600, 473
    kk = h / w
    cs = [(20, 52), (54, 52), (88, 52)]
    s = panels(w, h, [(c, 13.5) for c in cs], [wm_ring(c, 10.5, 9.5, kk) for c in cs])
    sh = [rect((13.5, 52), 13.5, 13.5 * 2 * 0.5, 0, "#3a6ad8", 0.55), rect((26.5, 52), 13.5, 13.5 * 2 * 0.5, 0, "#3a6ad8", 0.0)]
    sh = [cone(cs[0], 270, 90, 20, "#3a6ad8", 0.55), cone(cs[0], 90, 90, 20, "#3a6ad8", 0.55),
          cone(cs[1], 0, 90, 20, "#3a6ad8", 0.55), cone(cs[1], 180, 90, 20, "#3a6ad8", 0.55),
          circle((48, 22), 9, ORANGE, 0.5, 0.01), circle((54, 44), 6, ORANGE, 0.3, 0.01)]
    for a in (240, 200, 160, 120):
        sh += [cone(cs[2], a, 30, 15, ORANGE, 0.55)]
    sh += [circle((80, 20), 8, ORANGE, 0.5, 0.01), circle((88, 18), 8, ORANGE, 0.5, 0.01), circle((96, 20), 8, ORANGE, 0.5, 0.01)]
    for c in cs:
        sh += [ring(c, 4.5, "#d02020", 0.6, 0.9)] + namebox(c, "Chaos", 1.5)
    sh += [arrow((34, 52), (36.5, 52), "#111111", 1.0), arrow((68, 52), (70.5, 52), "#111111", 1.0)]
    s["shapes"] += sh
    s["boss"] = [[4, 46], [38, 46], [71, 46]]
    s["iconSize"] = 2.8
    s["roles"] = roles(MT=[(21, 61), (47, 70), (82, 74)], ST=[(23, 63), (48, 72), (83, 76)], H1=[(21, 66), (53, 70), (88, 73)],
                       H2=[(23, 70), (53, 76), (88, 80)], D4=[(20, 70), (54, 73), (94, 73)], D1=[(19, 74), (52, 79), (94, 76)],
                       D2=[(21, 73), (54, 79), (95, 73)], D3=[(20, 78), (54, 81), (96, 79)])
    return s


def p3_48():
    """Set 4: Stop 1 / Stop 2 take the two tethers clockwise from Kefka; the third black hole is Stop 2's next."""
    bh = [(62, 18), (52, 31), (33, 36), (16, 37), (8, 50), (93, 47), (69, 61), (82, 61), (40, 68), (39, 81), (51, 93)]
    pre = [beam((51, 93), (6, 12), 9), beam((93, 47), (8, 90), 9)]
    post = [tether((51, 93), (27, 51)), tether((93, 47), (51, 68)), ring((50, 50), 11, "#d02020", 0.6, 0.9)]
    post += tagm((31, 46), "S2") + tagm((55, 64), "S1") + namebox((50, 50), "Chaos")
    s = bhboard(583, 581, (50, 52), 48, bh, pre=pre, post=post)
    s["shapes"] = [x for x in s["shapes"] if not (x.get("t") == "ring" and x.get("r") == 11 and x["at"] == [50, 52])]
    s["boss"] = [[1, 40]]
    s["roles"] = roles(D2=(27, 51), ST=(51, 68))
    return s


def p3_49():
    """Last beam (Stop 2) and Look upon Me and Despair from Kefka in the north."""
    s = board(591, 603, at=(50, 52), r=48, wm=wm_ring((50, 52), 37, 33, 603 / 591))
    bh = [(54, 31), (22, 39), (30, 38), (6, 48), (93, 54), (64, 62), (32, 66), (40, 82)]
    sh = [beam((6, 48), (30, 5), 8), rect((47.5, 52), 47, 100 * 603 / 591 / (591 / 591) * 0.98, 0, "#c060f0", 0.5)]
    sh += bhs(bh, 3.6) + [tether((6, 48), (16, 20))] + tagm((20, 16), "S2")
    s["shapes"] = sh
    s["boss"] = [[50, 20]]
    s["roles"] = roles(D2=(16, 21))
    return s


WM50 = {"A": [50, 24], "D": [13, 59], "B": [87, 59], "C": [50, 95], "1": [27, 36], "2": [73, 36], "4": [27, 80], "3": [73, 80]}


def p3_50():
    """Stomp-a-Mole: Kefka's heel side = 12 o'clock; pairs go to the four number marks to drop the Blizzard puddles."""
    s = board(514, 565, at=(50, 58), r=48.5, wm=WM50)
    s["shapes"] = [circle((50, 58), 14, ORANGE, 0.6, 0.01), ring((50, 58), 14, "#e02020", 0.6, 0.9)] + namebox((50, 58), "Chaos")
    s["boss"] = [[50, 8]]
    s["roles"] = roles(MT=(27, 38), H1=(29, 41), ST=(72, 38), H2=(74, 41), D1=(26, 80), D3=(29, 83), D2=(72, 80), D4=(75, 83))
    return s


WM52 = {"A": [50, 15], "D": [13, 53], "B": [87, 53], "C": [50, 90], "1": [27, 30], "2": [73, 30], "4": [27, 75], "3": [73, 75]}


def stomp(w, h, towers, roles_, arrows=(), stack_at=None):
    s = board(w, h, at=(50, 52), r=48, wm=WM52)
    sh = [circle(c, 15, ORANGE, 0.55, 0.01) for c in ((30, 32), (70, 30), (30, 74), (72, 73))]
    for c in towers:
        sh += [circle(c, 7.5, "#3a6ad8", 0.75, 0.01), ring(c, 7.5, "#ff6060", 0.9, 0.95)]
    if stack_at:
        sh += stack(stack_at, 7, 4, 2)
    for a, b in arrows:
        sh += [arrow(a, b, "#ff3030", 0.6)]
    s["shapes"] = sh
    s["boss"] = [[50, 3]]
    s["roles"] = roles(**roles_)
    return s


def p3_52():
    return stomp(513, 519, [(29, 52), (72, 50)], dict(MT=(29, 29), H1=(31, 32), ST=(70, 26), H2=(76, 31), D3=(24, 71), D1=(29, 74),
                                                         D4=(71, 69), D2=(74, 73)),
                 [((33, 33), (47, 50)), ((67, 33), (53, 49)), ((24, 69), (28, 56)), ((72, 67), (72, 55))], stack_at=(70, 28))


def p3_53():
    return stomp(526, 540, [(32, 52), (72, 50)], dict(D3=(30, 50), D1=(34, 53), D2=(70, 50), D4=(74, 50), MT=(48, 53), ST=(52, 49),
                                                         H1=(46, 50), H2=(54, 52)), stack_at=(50, 51))


def p3_54():
    return stomp(534, 555, [(30, 52), (73, 52)], dict(MT=(28, 49), H1=(30, 54), ST=(72, 49), H2=(75, 53), D4=(48, 47), D3=(50, 51),
                                                         D2=(48, 55), D1=(53, 55)), stack_at=(50, 51))
