"""P1 Twintania and the Heavensfall transition (Tuufless 01_twintania)."""
from sc_base import *

TW = "TW"
T = lambda: None


def tw11():
    b = (152, 190)
    return scene(TW, boss=b, roles=dict(MT=(196, 156), ST=(114, 156), D1=(116, 236), D2=(192, 236), H1=(88, 312),
                                       D4=(244, 306), H2=(176, 358), D3=(94, 382)),
                 shapes=[cone(b, 42, 122, 150)])


def tw12():
    b = (152, 205)
    st = (153, 266)
    sh = []
    for q in ((215, 148), (85, 200), (275, 318), (105, 388)):
        sh += twister(q)
    sh += stack(st, 34)
    sh += path([(92, 380), (68, 360), (62, 342)])
    return scene(TW, boss=b, roles=dict(MT=(164, 154), D3=(48, 326), **pile(["H1", "H2", "D2", "D4", "D1"], st, (2, 2))),
                 shapes=sh)


def tw13():
    b = (152, 205)
    return scene(TW, boss=b, roles=dict(ST=(138, 164), MT=(204, 164), D3=(48, 326),
                                       **pile(["H1", "H2", "D2", "D4", "D1"], (154, 268), (2, 2))),
                 shapes=buster((204, 164)))


TW2 = dict(D1=(304, 130), MT=(348, 144), ST=(382, 190), D2=(312, 216), H1=(244, 274), H2=(336, 302))


def tw21():
    return scene(TW, boss=(330, 200), roles=dict(TW2, D3=(174, 460)), shapes=neuro("L"))


LH_SW = [(52, 288), (62, 329), (84, 367), (117, 400), (147, 433)]


def tw22():
    sh = neuro("L") + [circle(c, 50, SALMON, 0.5, 0.01) for c in LH_SW]
    sh += path([(152, 446), (110, 405), (70, 350), (42, 300), (30, 250)])
    return scene(TW, boss=(330, 200), roles=dict(TW2, D3=(38, 218), D4=(290, 296)), shapes=sh)


def tw23():
    sh = neuro("L") + [circle(c, 50, SALMON, 0.5, 0.01) for c in LH_SW] + hatch((290, 148))
    return scene(TW, boss=(330, 200), roles=dict(TW2, D1=(290, 148), D2=(312, 244), H2=(342, 302), D3=(38, 218), D4=(290, 296)),
                 shapes=sh)


def tw24():
    lh = [(50, 317), (46, 267), (46, 217), (62, 167), (92, 125), (117, 79)]
    sh = neuro("L") + [circle(c, 50, SALMON, 0.5, 0.01) for c in lh] + orb_aoe((162, 198), 88) + hatch((162, 198))
    sh += path([(30, 235), (60, 130), (100, 75), (158, 42)])
    sh += [arrow((308, 197), (196, 200), "#e070f0", 0.55)]
    return scene(TW, boss=(330, 200), roles=dict(MT=(348, 144), ST=(382, 190), D1=(162, 198), D2=(312, 244), H1=(244, 274),
                                                 H2=(342, 302), D4=(290, 296), D3=(184, 38)),
                 shapes=sh)


def tw25():
    return scene(TW, boss=(330, 200), roles=dict(D3=(184, 38), D1=(280, 140), MT=(348, 144), ST=(382, 190), D2=(312, 244),
                                                 D4=(272, 290), H2=(342, 302), H1=(184, 338)),
                 shapes=neuro("L") + buster((382, 190)))


def tw26():
    return scene(TW, boss=(330, 200), roles=dict(D3=(232, 42), D1=(280, 140), ST=(378, 154), MT=(382, 238), D2=(312, 244),
                                                 H2=(342, 302), H1=(184, 338), D4=(174, 256)),
                 shapes=neuro("L") + hatch((174, 256)))


def tw27():
    sh = neuro("L") + orb_aoe((155, 197), 88) + hatch((155, 197))
    for q in ((378, 132), (310, 250), (205, 272), (213, 350)):
        sh += twister(q)
    sh += [arrow((330, 215), (175, 218), "#e070f0", 0.55)]
    sh += path([(196, 236), (178, 222), (170, 212)])
    return scene(TW, boss=(330, 200), roles=dict(D3=(146, 64), D1=(284, 190), MT=(384, 184), D4=(155, 197), H1=(162, 382),
                                                 H2=(346, 364)),
                 shapes=sh)


def tw28():
    b = (342, 190)
    return scene(TW, boss=b, roles=dict(D3=(146, 64), ST=(330, 138), D1=(284, 190), MT=(384, 192), D4=(238, 260),
                                       H1=(162, 382), H2=(346, 364)),
                 shapes=neuro("L") + [cone(b, 88, 126, 152)])


TW3 = dict(D3=(76, 110), D4=(108, 260), D2=(204, 320), D1=(298, 320), H1=(430, 308), H2=(116, 366), MT=(220, 386), ST=(286, 384))


def tw31():
    return scene(TW, boss=(250, 345), roles=TW3, shapes=neuro("L", "R"))


LH_NW = [(42, 160), (70, 115), (110, 80), (155, 48), (205, 28)]


def tw32():
    sh = neuro("L", "R") + [circle(c, 50, SALMON, 0.5, 0.01) for c in LH_NW]
    sh += path([(60, 135), (110, 85), (175, 40), (250, 20)])
    return scene(TW, boss=(250, 345), roles=dict(TW3, D3=(304, 44)), shapes=sh)


def tw33():
    sh = neuro("L", "R") + [circle(c, 50, SALMON, 0.5, 0.01) for c in LH_NW] + hatch((108, 260)) + hatch((204, 320))
    return scene(TW, boss=(250, 345), roles=dict(TW3, D3=(304, 44)), shapes=sh)


def tw34():
    sh = neuro("L", "R") + orb_aoe((162, 200), 85) + orb_aoe((337, 200), 85) + hatch((162, 200)) + hatch((337, 200))
    sh += [arrow((245, 320), (178, 220), "#e070f0", 0.55), arrow((262, 320), (318, 220), "#e070f0", 0.55)]
    sh += [dot((294, 304), 10, "#d42a1e"), dot((294, 304), 5, "#ffd24a")]
    return scene(TW, boss=(250, 345), roles=dict(D3=(398, 104), D4=(162, 200), D2=(337, 200), D1=(296, 344), H1=(356, 362),
                                                 H2=(140, 370), ST=(208, 384), MT=(252, 396)),
                 shapes=sh)


def tw35():
    lh = [(55, 270), (95, 280), (50, 322), (82, 350), (125, 368)]
    sh = neuro("L", "R") + [circle(c, 50, SALMON, 0.5, 0.01) for c in lh] + stack((258, 300), 34)
    return scene(TW, boss=(258, 360), roles=dict(H2=(182, 268), **pile(["ST", "H1", "D1", "D2", "D3", "D4", "MT"], (258, 300), (2, 2))),
                 shapes=sh)


def tw36():
    sh = neuro("L", "R") + [circle(c, 60, SALMON, 0.5, 0.01) for c in ((60, 300), (100, 290))] + buster((226, 386))
    return scene(TW, boss=(258, 345), roles=dict(H2=(182, 268), MT=(226, 386), ST=(276, 386),
                                                 **pile(["H1", "D2", "D3", "D4", "D1"], (254, 306), (2, 2))),
                 shapes=sh)


def tw37():
    b = (252, 345)
    return scene(TW, boss=b, roles=dict(H2=(182, 268), MT=(210, 322), ST=(276, 386),
                                       **pile(["H1", "D2", "D3", "D4", "D1"], (254, 306), (2, 2))),
                 shapes=neuro("L", "R") + [cone(b, 155, 68, 160)])


TW38 = dict(D3=(422, 112), D4=(70, 270), H2=(122, 348), H1=(392, 350), MT=(212, 388), ST=(296, 386))


def tw38():
    sh = neuro("L", "R") + hatch((180, 314)) + hatch((314, 318))
    return scene(TW, boss=(258, 345), roles=dict(TW38, D2=(180, 314), D1=(314, 318)), shapes=sh)


def tw39():
    sh = neuro("L", "R") + orb_aoe((162, 200), 85) + orb_aoe((337, 200), 85) + hatch((162, 200)) + hatch((337, 200))
    for q in ((260, 200), (128, 340), (192, 372), (382, 336)):
        sh += twister(q)
    sh += [line((245, 320), (220, 210), "#e070f0", 0.5), line((262, 320), (275, 210), "#e070f0", 0.5)]
    sh += [arrow((215, 195), (182, 200), "#ffffff", 0.5), arrow((288, 195), (318, 200), "#ffffff", 0.5)]
    return scene(TW, boss=(258, 345), roles=dict(D3=(422, 112), D4=(32, 250), H2=(56, 348), H1=(446, 348), MT=(248, 388),
                                                 D2=(162, 200), D1=(337, 200)),
                 shapes=sh)


def tw310():
    b = (250, 350)
    return scene(TW, boss=b, roles=dict(D3=(422, 112), D4=(32, 250), H2=(56, 348), H1=(446, 348), D2=(208, 292),
                                       MT=(232, 308), D1=(304, 312), ST=(248, 396)),
                 shapes=neuro("L", "R") + [cone(b, 180, 70, 150)])


ALL8 = ["MT", "ST", "H1", "H2", "D2", "D3", "D4", "D1"]


def tr1():
    return scene(TW, roles=pile(ALL8, (244, 346), (1.5, 1.5)), shapes=neuro("L", "R", "S"))


def tr2():
    sh = neuro("L", "R", "S") + [rect((249, 249), 110, 68, 0, SALMON, 0.45)]
    sh += path([(258, 295), (252, 360), (246, 430)], "#ffc8c0")
    return scene(TW, roles=pile(ALL8, (244, 462), (1.5, 1.5)), shapes=sh)


def slices(first, c="#c8b414", o=0.78):
    return [cone((250, 250), first + k * 45, 22.5, 246, c, o) for k in range(8)]


def heavens_core():
    return [rect((249, 249), 110, 68, 0, "#2fc9b9", 0.8)]


def tr3():
    sh = slices(0) + neuro("L", "R", "S") + heavens_core()
    sh += [circle(c, 48, "#f0a37e", 0.5, 0.2) for c in ((153, 290), (55, 335), (355, 290), (170, 448))]
    return scene(TW, roles=dict(ST=(290, 154), MT=(146, 208), D1=(152, 294), D2=(356, 290), D3=(54, 334), D4=(452, 340),
                                H1=(170, 450), H2=(328, 444)),
                 shapes=sh)


def tr4():
    sh = slices(0) + neuro("L", "R", "S") + heavens_core()
    sh += [circle(c, 50, "#f0a37e", 0.5, 0.2) for c in ((250, 148), (168, 178), (468, 250), (408, 398))]
    return scene(TW, roles=dict(ST=(250, 150), MT=(168, 176), D1=(128, 252), D2=(376, 250), D3=(28, 254), D4=(468, 252),
                                H1=(100, 406), H2=(408, 398)),
                 shapes=sh)


def tr5():
    sh = neuro("L", "R", "S") + [circle((250, 148), 63, SALMON, 0.5)] + buster((250, 148))
    return scene(TW, boss=(250, 78), roles=dict(ST=(250, 148), MT=(182, 222), D3=(162, 236), D1=(182, 246), H1=(192, 262),
                                                D2=(310, 242), D4=(330, 256), H2=(294, 280)),
                 shapes=sh)


def waymarks():
    """Tuufless's WaymarkPresetPlugin set, placed by its game coordinates (arena radius ~21.8 yalms)."""
    pre = {"A": (-11.472, -16.383), "B": (11.4715, -16.383), "C": (19.3185, 5.1764), "D": (-19.319, 5.176),
           "1": (-7.57, -4.38), "2": (7.57, -4.38), "3": (0.0, 8.75), "4": (0.0, 0.0)}
    k = 49.6 / 21.8
    wm = {m: [round(50 + x * k, 2), round(50 + z * k, 2)] for m, (x, z) in pre.items()}
    sc = scene(TW, shapes=neuro("L", "R", "S"))
    sc["waymarks"] = wm
    sc["markSize"] = 7.2
    sc["shapes"] += [label((250, 30), "N", 3.2, "#ffffff")]
    return sc
