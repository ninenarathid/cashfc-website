"""Boss 3 (Moko the Restless) scenes, redrawn from game8's 440x440 pictures. Helpers from sc.py.
Where game8 shows a pile of overlapping AoEs, the floor is covered in orange and the safe spots are painted back in
floor colour (a wedge, a channel), so the picture says the same thing: where you can stand."""
from sc import *

FLOOR3 = "#8a7653"
SQ3 = {"shape": "square", "at": [50, 50], "w": 85, "h": 85, "fill": FLOOR3, "lines": False, "edge": "#3b2f1c"}
SLASH = "#e8532a"
BOSS3 = [50, 48]


def boards(o=0.16):
    out = []
    for k in range(1, 6):
        v = 7.5 + k * 85 / 6
        out += [line((v, 7.5), (v, 92.5), "#3b2f1c", 0.18, o), line((7.5, v), (92.5, v), "#3b2f1c", 0.18, o)]
    return out


def spread_icon(p):
    return [rect(p, 3.4, 3.4, "#8a1f1f", 1), ring(p, 1.1, "#ff6a5a", 0.45, 1)]


def pair_icon(p):
    return [rect(p, 3.4, 3.4, "#8a1f1f", 1), dot((p[0] - 0.7, p[1]), 0.6, "white", 1), dot((p[0] + 0.7, p[1]), 0.6, "white", 1)]


def iai(p, c="#3a46b8"):
    """Moko's iai tell over a head (the blue crescent): a dark-blue disc with a white point."""
    return [circ(p, 3.3, 0.95, c), ring(p, 3.3, "#b8c4ff", 0.35, 0.9), dot((p[0], p[1] - 0.6), 0.6, "white", 1)]


def num(p, n, c):
    return [ring(p, 2.9, c, 0.45, 0.95), text(p, n, 3.2, c)]


def shadow(p):
    return [ring(p, 3.1, PINK, 0.7, 1), dot(p, 2.3, YUKI, 1)]


def claws():
    return shadow((4, 49.5)) + shadow((96, 49.5))


EDGE_AT = (50, 46)


def near_edge():         # the boss's "near" tell: a bright pink diamond
    return [rect(EDGE_AT, 7, 7, "#c84fd0", 0.95, 45), rect(EDGE_AT, 3.2, 3.2, "#f3b6ff", 0.95, 45)]


def far_edge():          # the "far" tell: three small dark diamonds in a row
    y = EDGE_AT[1]
    return [rect((50, y), 4.4, 4.4, "#1d2050", 0.95, 45), rect((41, y), 2.4, 2.4, "#1d2050", 0.95, 45), rect((59, y), 2.4, 2.4, "#1d2050", 0.95, 45),
            line((43, y), (57, y), "#1d2050", 0.3, 0.9), dot((50, y), 0.7, "white", 1)]


def slashes(thick=(), only="datb"):
    """The scarlet slashes left on the floor: 'd' NW-SE diagonal, 'a' SW-NE diagonal, 't' top line, 'b' bottom line."""
    L = {"d": ((7.5, 7.5), (92.5, 92.5)), "a": ((7.5, 92.5), (92.5, 7.5)), "t": ((7.5, 29), (92.5, 29)), "b": ((7.5, 71), (92.5, 71))}
    return [line(a, b, SLASH, 3.6 if k in thick else 0.55, 0.95) for k, (a, b) in L.items() if k in only]


def cover(o=0.42):
    return [rect((50, 50), 100, 100, ORANGE, o)]


def punch(shapes):
    """Paint safe spots back in floor colour."""
    out = []
    for s in shapes:
        s = dict(s)
        s["c"], s["o"] = FLOOR3, 1
        out.append(s)
    return out


def sa_circle():         # b3-04 Scarlet Auspice: under the boss
    return scene(SQ3, boards() + [circ(BOSS3, 7.6, 0.5)], party(T=(65.1, 52.7), H=(65.8, 44.9), D1=(34.0, 46.2), D2=(33.9, 53.2)), boss=BOSS3, bossSize=16)


def sa_boundless():      # b3-05 Boundless Scarlet: an X and two bars
    sh = boards() + [band((50, 50), 45, 16, 125), band((50, 50), 135, 16, 125), band((50, 28), 90, 21.5, 87), band((50, 71.5), 90, 21, 87)]
    return scene(SQ3, sh, party(T=(69.8, 51.0), H=(72.6, 47.3), D1=(29.5, 48.0), D2=(29.0, 52.7)), boss=BOSS3, bossSize=16)


def sa_debuffs():        # b3-06
    sh = boards() + slashes() + spread_icon((33.6, 48.8)) + spread_icon((40.2, 58.0)) + pair_icon((44.6, 58.0)) + \
        spread_icon((60.0, 51.2)) + pair_icon((64.4, 51.2)) + spread_icon((73.0, 43.3))
    return scene(SQ3, sh, party(T=(62.2, 56.2), H=(72.6, 48.3), D1=(33.4, 53.9), D2=(42.7, 62.8)), boss=BOSS3, bossSize=16)


def sa_tether():         # b3-07
    sh = boards() + slashes("at") + iai((50, 37)) + [line(BOSS3, (33.3, 53.5), "#ff9ad0", 0.4)] + spread_icon((33.6, 48.8)) + \
        spread_icon((40.2, 58.0)) + pair_icon((44.6, 58.0)) + spread_icon((60.0, 51.2)) + pair_icon((64.4, 51.2)) + spread_icon((73.0, 43.3))
    return scene(SQ3, sh, party(T=(62.2, 56.2), H=(72.6, 48.3), D1=(33.3, 53.5), D2=(42.7, 62.4)), boss=BOSS3, bossSize=16)


def sa_corner():         # b3-08
    sh = boards() + slashes("at") + iai((50, 37)) + [line(BOSS3, (90.5, 90), "#ff9ad0", 0.4)] + pair_icon((63.8, 80.6)) + pair_icon((81.6, 78.2))
    sh += [arrow((92.5, 87.5), (97.5, 80.5), "#ffb0b0", 0.7)]
    return scene(SQ3, sh, party(T=(63.8, 85.0), H=(68.3, 84.2), D1=(90.5, 90.0), D2=(81.6, 82.6)), boss=BOSS3, bossSize=16)


def first_spread():      # the first widening: from the SW-NE diagonal and the top line
    return [band((50, 50), 45, 56.6, 150, 0.4), rect((50, 27.5), 110, 65, ORANGE, 0.4)]


def sa_pairs():          # b3-09
    sh = boards() + first_spread() + slashes("at") + iai((96, 77)) + pair_icon((63.8, 80.6)) + pair_icon((84.0, 77.5))
    return scene(SQ3, sh, party(T=(63.9, 84.9), H=(69.0, 84.1), D1=(86.0, 81.5), D2=(82.4, 83.0)))


def sa_spreads():        # b3-10
    T, H, D1, D2 = (83.1, 69.4), (63.3, 86.7), (84.5, 85.6), (74.0, 78.3)
    sh = boards() + first_spread() + slashes("at") + iai((96, 77)) + [x for p in (T, H, D1, D2) for x in spread_icon((p[0], p[1] - 4.6))]
    return scene(SQ3, sh, party(T=T, H=H, D1=D1, D2=D2))


def second_spread():     # the second widening: from the NW-SE diagonal and the bottom line
    return [band((50, 50), 135, 56.6, 150, 0.4), rect((50, 72.5), 110, 65, ORANGE, 0.4)]


def sa2_pairs():         # b3-11
    sh = boards() + second_spread() + slashes("db", "db") + [arrow((78, 80), (78, 39), "white", 1.1)] + pair_icon((70.3, 13.0)) + pair_icon((88.0, 28.0))
    return scene(SQ3, sh, party(T=(83.3, 32.3), H=(87.9, 34.8), D1=(64.9, 17.4), D2=(67.9, 19.9)))


def sa2_spreads():       # b3-12
    T, H, D1, D2 = (76.5, 29.6), (86.0, 38.1), (64.5, 16.1), (84.0, 18.2)
    sh = boards() + second_spread() + slashes("db", "db") + [arrow((78, 80), (78, 39), "white", 1.1)] + [x for p in (T, H, D1, D2) for x in spread_icon((p[0], p[1] - 4.6))]
    return scene(SQ3, sh, party(T=T, H=H, D1=D1, D2=D2))


# --- Shadow-twin, the first time
SH_L, SH_R = (28, 51), (71, 51)


def twins(nums=True, which=("1", "2")):
    out = shadow(SH_L) + shadow(SH_R)
    for c in (SH_L, SH_R):
        for k, n in enumerate(which):
            x = c[0] - 4.5 + 9 * k if len(which) == 2 else c[0]
            out += iai((x, c[1] - 8.5))
            if nums:
                out += num((x, c[1] - 15.5), n, "#ff6a3a" if n == "1" else "#3ab8e8")
    return out


TETH = "#ff9ad0"


def st_appear():         # b3-16
    sh = boards() + shadow((28, 52)) + shadow((70, 52)) + iai((28.5, 39)) + iai((70.7, 39.5))
    sh += [line((49.8, 36.5), (28, 52), TETH, 0.4), line((47.4, 65.8), (70, 52), TETH, 0.4)]
    return scene(SQ3, sh, party(T=(49.8, 36.5), H=(58.9, 63.4), D1=(41.8, 60.0), D2=(47.4, 65.8)), boss=BOSS3, bossSize=16)


def st_far():            # b3-17 (Far Edge): tethers inside, the others at the edge
    sh = boards() + claws() + twins() + far_edge() + [line((50, 23.1), SH_L, TETH, 0.4), line((49.6, 76.8), SH_R, TETH, 0.4),
                                                       arrow((50, 25.5), (50, 29.5), "white", 0.7), arrow((49.6, 74.5), (49.6, 70.5), "white", 0.7)]
    return scene(SQ3, sh, party(T=(50.1, 23.1), H=(50.3, 8.5), D1=(49.6, 76.8), D2=(50.0, 89.2)), boss=[50, 53.5], bossSize=11)


def st_near():           # b3-18 (Near Edge): tethers at the edge, the others inside
    sh = boards() + claws() + twins() + near_edge() + [line((49.9, 10.5), SH_L, TETH, 0.4), line((49.5, 90.5), SH_R, TETH, 0.4),
                                                        arrow((49.9, 8), (49.9, 3), "white", 0.7), arrow((49.5, 93), (49.5, 98), "white", 0.7)]
    return scene(SQ3, sh, party(T=(49.9, 10.5), H=(50.1, 23.6), D1=(49.5, 90.5), D2=(50.0, 76.3)), boss=[50, 53.5], bossSize=11)


def claw_hits(o=0.42):
    return [circ((-12, 50), 62, o), circ((112, 50), 62, o)]


def st_claws():          # b3-19: the claws and the far binds go off
    sh = boards() + claw_hits() + [circ((50, 8.5), 7.6, 0.42), circ((50, 89), 7.6, 0.42)] + twins() + far_edge() + \
        [line((49.4, 21.7), SH_L, TETH, 0.4), line((49.6, 78.3), SH_R, TETH, 0.4)]
    return scene(SQ3, sh, party(T=(49.4, 21.7), H=(49.2, 8.1), D1=(49.6, 78.3), D2=(50.9, 89.6)), boss=[50, 53.5], bossSize=11)


def st_iai1():           # b3-20: the first iai (behind is safe): a wedge north and south
    sh = boards() + cover() + [ring(p, 31, "#ffe08a", 0.3, 0.55) for p in ((30, 25), (70, 25), (30, 75), (70, 75))]
    sh += punch([cone((50, 22), 0, 78, 15.5), cone((50, 78), 180, 78, 15.5)]) + twins() + far_edge()
    return scene(SQ3, sh, party(T=(50.1, 18.3), H=(48.5, 7.1), D1=(50.1, 81.7), D2=(50.9, 89.6)), boss=[50, 53.5], bossSize=11)


def st_iai2():           # b3-21: the second iai: the safe spots move
    sh = boards() + cover() + [ring(p, 31, "#ffe08a", 0.3, 0.55) for p in ((30, 25), (70, 25), (30, 75), (70, 75))]
    sh += punch([band((63.5, 15), 52, 6.5, 26), cone((50.5, 72), 180, 70, 10)]) + twins(which=("2",)) + far_edge()
    return scene(SQ3, sh, party(T=(53.2, 21.8), H=(55.5, 20.5), D1=(48.9, 76.3), D2=(50.6, 78.0)), boss=[50, 53.5], bossSize=11)


# --- Soldiers of Death: archers on the edge, one blue
BLUE_SOL, RED_SOL = "#4da3ff", "#ff6a5a"
SOLDIERS = [((50, 2.2), 180, RED_SOL), ((76.5, 2.2), 180, RED_SOL), ((2.2, 75), 90, RED_SOL), ((22, 97.8), 0, RED_SOL), ((97.8, 24.5), 270, BLUE_SOL)]
LAND = [((24, 24), BLUE_SOL), ((76.5, 26), RED_SOL), ((50, 50), RED_SOL), ((22, 76), RED_SOL), ((76.5, 76.5), RED_SOL)]


def soldiers():
    out = []
    for p, d, c in SOLDIERS:
        out += [dot(p, 2.6, c, 1), arrow(off(p, d + 180, 1.0), off(p, d, 4.6), c, 1.2)]
    return out


def landings(o=0.9):
    out = []
    for p, c in LAND:
        out += [ring(p, 3.2, c, 0.5, o * 0.7), dot(p, 1.6, c, o)]
    return out


def arrows_of_soldiers():
    return [arrow((93, 24.5), (28, 24.5), "white", 1.1), arrow((76.5, 6), (76.5, 22), RED_SOL, 0.5), arrow((50, 6), (50, 46), RED_SOL, 0.5),
            arrow((6, 76), (72.5, 76), RED_SOL, 0.5), arrow((22, 94), (22, 80), RED_SOL, 0.5)]


def sd_landing():        # b3-23: where the arrows land
    sh = boards() + soldiers() + landings() + arrows_of_soldiers() + [ring((24, 24.5), 6.5, "#e8442e", 0.6), ring((76.5, 25.5), 6.5, "#e8442e", 0.6)]
    return scene(SQ3, sh)


def sd_read():           # b3-24: far or near on the blue line; the south (opposite the blue soldier) is always safe
    sh = boards() + soldiers() + landings() + arrows_of_soldiers() + [ring((25, 38), 27, "#4da3ff", 0.6), ring((55, 38), 27, "#4da3ff", 0.6)]
    sh += [text((51, 12), "A", 4.4, "#ff6a5a"), text((84, 50), "B", 4.4, "#ff6a5a"), text((50.5, 88), "C", 4.4, "#ff6a5a"), text((13, 50), "D", 4.4, "#ff6a5a"),
           ring((50.5, 88), 5.5, "#e8442e", 0.6)]
    return scene(SQ3, sh)


def sd_soldiers():       # b3-25
    return scene(SQ3, boards() + soldiers() + landings() + arrows_of_soldiers())


TW4 = [(50, 33), (29, 51), (71, 51), (50, 69)]


def sd_twins():          # b3-26: four shadows, a tether each
    sh = boards() + soldiers() + landings(0.6)
    for p in TW4:
        sh += shadow(p)
    sh += [line((42.2, 58.3), (50, 33), TETH, 0.4), line((59.4, 55.6), (29, 51), TETH, 0.4), line((65.9, 57.8), (50, 69), TETH, 0.4), line((62.2, 42.4), (71, 51), TETH, 0.4)]
    return scene(SQ3, sh, party(T=(42.2, 58.3), H=(62.2, 42.4), D1=(59.4, 55.6), D2=(65.9, 57.8)))


def four_twins():
    out = []
    for p in TW4:
        out += shadow(p)
        for k, n in enumerate(("1", "2")):
            x = p[0] - 4.5 + 9 * k
            out += iai((x, p[1] - 8)) + num((x, p[1] - 14.5), n, "#ff6a3a" if n == "1" else "#3ab8e8")
    return out


def sd_pairs():          # b3-27: in pairs to the safe side, back to back
    sh = boards() + soldiers() + landings(0.6) + four_twins()
    sh += [line((84.2, 47.2), (50, 33), TETH, 0.35), line((88.6, 54.8), (71, 51), TETH, 0.35), line((41.9, 88.6), (29, 51), TETH, 0.35), line((55.8, 88.6), (50, 69), TETH, 0.35)]
    return scene(SQ3, sh, party(T=(84.2, 47.2), H=(88.6, 54.8), D1=(41.9, 88.6), D2=(55.8, 88.6)))


def blue_zone(o=0.3):
    return [circ((22, 22), 40, o, "#7cc4ff")]


def iai_cover():
    """b3-29/30: the blue arrow's zone in the north-west, orange over the rest."""
    out = [circ((22, 22), 42, 0.42, "#7cc4ff")]
    out += [circ(p, r, 0.4) for p, r in (((76.5, 26), 26), ((50, 50), 24), ((22, 76), 26), ((76.5, 77), 26), ((92, 52), 16), ((50, 92), 16), ((70, 52), 14), ((50, 72), 14))]
    return out


def sd_turn():           # b3-28: arrows land; face so the second iai points to the middle
    sh = boards() + blue_zone() + [circ((76.5, 26), 22, 0.4), circ((50, 50), 21, 0.4), circ((22, 76), 21, 0.4), circ((76.5, 77), 21, 0.4)] + soldiers() + four_twins()
    sh += [arrow((92, 38), (92, 31), "white", 0.8), arrow((91, 61), (91, 68), "white", 0.8), arrow((38.5, 90), (31.5, 90), "white", 0.8), arrow((61.5, 90), (68.5, 90), "white", 0.8)]
    return scene(SQ3, sh, party(T=(91.9, 42.3), H=(91.2, 56.6), D1=(41.6, 90.2), D2=(58.3, 89.8)))


def sd_iai1():           # b3-29: the first iai: step behind
    sh = boards() + iai_cover() + [ring(p, r, "#ffe08a", 0.3, 0.6) for p, r in (((76.5, 26), 22), ((50, 50), 21), ((22, 76), 21), ((76.5, 77), 21))]
    sh += punch([cone((88, 50), 90, 76, 6.5), cone((50, 85), 180, 80, 8)]) + soldiers()
    return scene(SQ3, sh, party(T=(91.1, 52.4), H=(90.4, 47.7), D1=(47.5, 89.5), D2=(52.3, 89.5)))


def sd_iai2():           # b3-30: the second iai: into the middle side
    sh = boards() + iai_cover() + [ring(p, r, "#ffe08a", 0.3, 0.6) for p, r in (((76.5, 26), 22), ((50, 50), 21), ((22, 76), 21), ((76.5, 77), 21))]
    sh += punch([cone((70, 50), 90, 76, 11), cone((51, 70), 180, 80, 9)]) + soldiers()
    return scene(SQ3, sh, party(T=(79.9, 49.9), H=(75.1, 49.1), D1=(53.5, 73.5), D2=(48.3, 76.4)))
