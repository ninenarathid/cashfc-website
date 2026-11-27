"""P3 Bahamut Prime (Tuufless 03_bahamut): the Trios."""
from sc_base import *
import math

BA = "BA"
ORG = "#f5a142"
GREEN = "#4fc95a"
MF = "#ffffff"
HYPER = "#8a2bb8"
YEL = "#c8b414"


def n3():
    return neuro("L", "R", "S")


def tag(at, t):
    return [boss_tag(at, t, 2.4)]


def mfring(*pts):
    out = []
    for q in pts:
        out += [ring(q, 21, MF, 0.5, 0.95), dot((q[0], q[1] - 24), 3, MF), dot((q[0], q[1] + 24), 3, MF)]
    return out


def esm(*pts):
    """Earthshaker marker: a pale down-triangle over the head."""
    out = []
    for q in pts:
        out += [line((q[0] - 7, q[1] - 34), (q[0] + 7, q[1] - 34), "#fff4c0", 0.6), line((q[0] - 7, q[1] - 34), (q[0], q[1] - 22), "#fff4c0", 0.6),
                line((q[0] + 7, q[1] - 34), (q[0], q[1] - 22), "#fff4c0", 0.6)]
    return out


def lh_col(ys=(60, 110, 160, 215)):
    return [circle((245, y), 60, SALMON, 0.42, 0.01) for y in ys]


def hyper(*cs, r=62):
    return [circle(c, r, HYPER, 0.55, 0.01) for c in cs]


QM = dict(MT=(80, 112), ST=(420, 112), H1=(55, 222), H2=(460, 222), D1=(55, 265), D2=(460, 265), D3=(90, 392), D4=(420, 392))
TRIO = [(140, 30), (245, 22), (350, 30)]


def qm1():
    sh = []
    for a, b in (((225, 230), (105, 135)), ((215, 248), (75, 245)), ((225, 265), (110, 345)), ((275, 230), (395, 135)),
                 ((285, 248), (425, 245)), ((275, 265), (390, 345))):
        sh.append(arrow(a, b))
    return scene(BA, boss=TRIO, roles=QM, shapes=sh, bossSize=9)


def qm2():
    sh = [rect((250, 255), 255, 470, 0, SALMON, 0.42)]
    for a, b in (((95, 85), (135, 55)), ((55, 195), (55, 150)), ((40, 300), (55, 345)), ((105, 420), (140, 450)),
                 ((405, 85), (365, 55)), ((455, 195), (455, 150)), ((460, 300), (445, 345)), ((395, 420), (360, 450))):
        sh.append(arrow(a, b))
    return scene(BA, roles=QM, shapes=sh)


QM3 = dict(MT=(145, 62), ST=(360, 62), H1=(50, 148), H2=(450, 158), D1=(45, 318), D2=(445, 335), D3=(140, 438), D4=(365, 440))


def qm3():
    sh = [circle(c, r, SALMON, 0.42) for c, r in (((360, 50), 75), ((50, 148), 50), ((450, 158), 50), ((30, 318), 62),
                                                           ((445, 320), 62), ((140, 438), 75), ((365, 440), 50))]
    for q in ((95, 88), (30, 222), (35, 290), (410, 402)):
        sh += twister(q)
    for a, b in (((150, 95), (175, 140)), ((360, 95), (325, 140)), ((80, 160), (140, 185)), ((420, 175), (345, 200)),
                 ((85, 320), (145, 300)), ((410, 335), (370, 295)), ((150, 405), (195, 370)), ((355, 410), (310, 350))):
        sh.append(arrow(a, b))
    return scene(BA, roles=QM3, shapes=sh)


QM4 = dict(MT=(165, 140), ST=(315, 145), H1=(118, 212), H2=(382, 218), D1=(148, 307), D2=(348, 320), D3=(200, 365), D4=(365, 446))


def qm4():
    sh = [circle(c, r, SALMON, 0.45, 0.01) for c, r in (((355, 50), 75), ((30, 320), 62), ((140, 440), 75), ((440, 335), 75))]
    sh += [tether((148, 307), (245, 248), GREEN), tether((245, 248), (382, 218), GREEN)]
    sh += mfring((148, 307), (348, 320), (365, 446))
    sh += [arrow((245, 320), (245, 148), "#ffc8c0"), arrow((180, 318), (240, 332)), arrow((325, 325), (265, 335)),
           arrow((345, 420), (262, 352))]
    return scene(BA, boss=(240, 230), roles=QM4, shapes=sh)


QM5 = dict(MT=(165, 250), ST=(325, 240), H1=(65, 252), H2=(428, 252), D3=(248, 152), **pile(["D1", "D4", "D2"], (258, 348), (-6, 6)))


def qm5():
    sh = [circle((255, 352), 50, SALMON, 0.45)] + mfring((236, 340), (258, 348), (276, 356))
    sh += [tether((165, 250), (250, 250), GREEN), tether((250, 250), (325, 240), GREEN)] + esm((65, 252), (428, 252), (248, 152))
    return scene(BA, boss=(245, 235), roles=QM5, shapes=sh)


def qm6():
    sh = [cone((250, 250), d, 90, 246, SALMON, 0.4) for d in (0, 270, 90)]
    sh += [circle(c, 55, ORG, 0.5, 0.01) for c in ((250, 150), (65, 252), (428, 252))]
    sh += [tether((165, 250), (250, 250), GREEN), tether((250, 250), (325, 240), GREEN)]
    return scene(BA, roles=QM5, shapes=sh)


def qm7():
    sh = [circle(c, 55, ORG, 0.5, 0.01) for c in ((250, 150), (65, 252), (430, 252))]
    sh += [circle((165, 250), 58, GREEN, 0.45, 0.01), circle((325, 240), 58, GREEN, 0.45, 0.01)]
    sh += [tether((165, 250), (250, 250), GREEN), tether((250, 250), (325, 240), GREEN)]
    sh += [arrow((268, 140), (318, 148)), arrow((62, 268), (95, 310)), arrow((420, 268), (385, 320))]
    return scene(BA, roles=dict(QM5, H1=(105, 322), H2=(370, 332), D3=(338, 148)), shapes=sh)


# ---------------------------------------------------------------- Blackfire Trio
BF_BOSS = [(250, 35), (450, 270), (80, 450)]


def bf_tags():
    return tag((250, 80), "Nael") + tag((405, 318), "Twintania") + tag((120, 405), "Bahamut")


def bf1():
    sh = bf_tags() + [dot((243, 200), 16, "#d8241c")]
    return scene(BA, boss=BF_BOSS, roles=pile(["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"], (243, 238), (1.5, 1.5)), shapes=sh)


def bf2():
    sh = [circle((245, 108), 50, "#c0302a", 0.5, 0.01)] + lh_col((160, 215)) + bf_tags()
    return scene(BA, boss=BF_BOSS, roles=pile(["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"], (243, 112), (1.5, 1.5)), shapes=sh)


def bf3():
    sh = lh_col((80, 130, 180, 235)) + [rect((250, 245), 100, 560, 56.6, SALMON, 0.4)] + tag((405, 318), "Twintania")
    return scene(BA, boss=BF_BOSS[:2], roles=pile(["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"], (243, 38), (1.5, 1.5)), shapes=sh)


TOW = [(150, 140), (355, 140), (150, 350), (355, 350)]


def bf4():
    sh = lh_col((60, 110, 160, 215)) + sum((tower(t, 28) for t in TOW), [])
    sh += mfring((232, 330), (232, 358), (265, 322), (268, 355))
    sh += path([(140, 55), (85, 100), (70, 125)]) + path([(60, 185), (55, 240), (60, 285)])
    sh += path([(360, 55), (415, 100), (430, 125)]) + path([(435, 185), (440, 240), (435, 285)])
    sh += path([(185, 70), (165, 200), (190, 315)]) + path([(318, 70), (338, 200), (305, 315)])
    sh += tag((250, 12), "Nael")
    return scene(BA, boss=(250, 0), roles=dict(MT=(60, 152), H1=(65, 318), D1=(435, 148), D4=(432, 318),
                                               ST=(232, 330), H2=(232, 358), D3=(265, 322), D2=(268, 355)), shapes=sh)


def bf5():
    sh = lh_col((60, 110, 160, 215)) + sum((tower(t, 28) for t in TOW), []) + hyper((430, 155), (270, 345))
    sh += mfring((230, 435), (230, 458), (265, 432), (268, 460)) + [circle((248, 448), 45, SALMON, 0.4, 0.01)]
    for a, b in (((85, 150), (118, 138)), ((395, 150), (380, 138)), ((90, 340), (122, 352)), ((400, 335), (385, 352)), ((260, 360), (255, 415))):
        sh.append(arrow(a, b))
    return scene(BA, roles=dict(MT=(135, 135), D1=(360, 132), H1=(130, 360), D4=(362, 360),
                                ST=(230, 435), H2=(230, 458), D3=(265, 432), D2=(268, 460)), shapes=sh)


def bf6():
    sh = lh_col((60, 110)) + hyper((165, 155), (450, 155), (135, 350), (270, 350))
    return scene(BA, boss=(260, 210), roles=dict(ST=(310, 242), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (210, 262), (2, 2))),
                 shapes=sh)


# ---------------------------------------------------------------- Fellruin Trio
FR_BOSS = [(162, 182), (337, 182), (258, 315)]


def fr_tags():
    return tag((162, 140), "Twintania") + tag((337, 140), "Bahamut") + tag((318, 372), "Nael")


FR_SPREAD = dict(ST=(188, 262), H2=(250, 265), MT=(322, 262), D1=(182, 330), H1=(250, 345), D2=(325, 330), D3=(210, 400), D4=(290, 402))


def fr1a():
    return scene(BA, boss=FR_BOSS, roles=dict(ST=(218, 312), MT=(285, 312), **pile(["H2", "D1", "D2", "D3", "D4", "H1"], (250, 352), (2, 2))),
                 shapes=n3() + fr_tags())


def fr1b():
    return scene(BA, boss=FR_BOSS, roles=FR_SPREAD, shapes=n3() + fr_tags())


def fr2a():
    sh = n3() + [donut((245, 330), 300, 82, SALMON, 0.4)] + [tether((337, 192), (232, 300), GREEN), tether((337, 192), (295, 290), GREEN)]
    return scene(BA, boss=FR_BOSS, roles=dict(ST=(218, 312), MT=(285, 312), **pile(["H2", "D1", "D2", "D3", "D4", "H1"], (250, 352), (2, 2))),
                 shapes=sh + fr_tags())


def fr2b():
    sh = n3() + [circle((290, 402), 50, SALMON, 0.45)] + [tether((337, 192), (262, 255), GREEN), tether((337, 192), (325, 315), GREEN)]
    return scene(BA, boss=FR_BOSS, roles=FR_SPREAD, shapes=sh + fr_tags())


def fr3a():
    sh = n3() + [circle((290, 402), 50, SALMON, 0.45)] + [tether((337, 192), (200, 262), GREEN), tether((337, 192), (318, 250), GREEN)]
    return scene(BA, boss=FR_BOSS, roles=dict(FR_SPREAD, ST=(195, 265), MT=(318, 265)), shapes=sh + fr_tags())


def fr3b():
    sh = n3() + [donut((290, 410), 300, 92, SALMON, 0.4)] + [tether((337, 192), (285, 305), GREEN), tether((337, 192), (325, 305), GREEN)]
    return scene(BA, boss=FR_BOSS, roles=dict(ST=(258, 355), MT=(310, 345), **pile(["H2", "D2", "D3", "D4", "H1", "D1"], (290, 392), (2, 2))),
                 shapes=sh + fr_tags())


def fr4():
    sh = n3() + [circle((162, 200), 58, GREEN, 0.4, 0.01), circle((337, 200), 58, GREEN, 0.4, 0.01), tether((162, 200), (337, 200), GREEN)]
    return scene(BA, boss=FR_BOSS, roles=dict(ST=(162, 200), MT=(337, 200), **pile(["H2", "D1", "D2", "D3", "D4", "H1"], (250, 350), (2, 2))),
                 shapes=sh + fr_tags())


def fr5():
    sh = n3() + [circle(c, 50, SALMON, 0.45) for c in ((162, 200), (250, 262), (345, 295), (345, 388))]
    return scene(BA, boss=FR_BOSS, roles=dict(ST=(162, 200), MT=(337, 200), H2=(250, 262), D1=(168, 295), D2=(345, 295), H1=(250, 350),
                                              D3=(168, 390), D4=(345, 388)), shapes=sh + fr_tags())


# ---------------------------------------------------------------- Heavensfall Trio
def hf1():
    sh = n3() + [dot((240, 205), 15, GREEN, 0.95), dot((258, 202), 15, "#d8241c", 0.95)]
    return scene(BA, boss=[(60, 45), (250, 30), (440, 45)], roles=pile(["ST", "H1", "H2", "D1", "D3", "D4", "D2", "MT"], (243, 238), (1.5, 1.5)),
                 shapes=sh)


HF_SIDES = dict(H1=(30, 222), D1=(30, 262), H2=(465, 222), D2=(465, 262))
VBAND = lambda: rect((250, 250), 165, 520, 0, SALMON, 0.4)
DIAG_NE = lambda: rect((250, 250), 165, 640, 45, SALMON, 0.4)
DIAG_NW = lambda: rect((250, 250), 165, 640, -45, SALMON, 0.4)


def hf_arrows(*targets):
    return [arrow((250 + (t[0] - 250) * 0.12, 250 + (t[1] - 250) * 0.12), (250 + (t[0] - 250) * 0.78, 250 + (t[1] - 250) * 0.78)) for t in targets]


def hf2a():
    sh = n3() + [VBAND(), DIAG_NE()] + hf_arrows((80, 112), (30, 245), (465, 245), (420, 400))
    return scene(BA, boss=[(80, 40), (250, 15), (450, 45)], roles=dict(HF_SIDES, MT=(80, 112), ST=(112, 75), D4=(428, 383), D3=(395, 418)),
                 shapes=sh + tag((80, 88), "Nael"))


def hf2b():
    sh = n3() + [DIAG_NE(), DIAG_NW()] + hf_arrows((250, 50), (30, 245), (465, 245), (250, 450))
    return scene(BA, boss=[(60, 40), (250, 15), (440, 40)], roles=dict(HF_SIDES, MT=(232, 35), ST=(272, 35), D3=(232, 465), D4=(272, 465)),
                 shapes=sh + tag((250, 62), "Nael"))


def hf2c():
    sh = n3() + [VBAND(), DIAG_NW()] + hf_arrows((382, 95), (30, 245), (465, 245), (100, 400))
    return scene(BA, boss=[(60, 40), (250, 15), (430, 40)], roles=dict(HF_SIDES, MT=(382, 78), ST=(425, 110), D3=(80, 385), D4=(115, 420)),
                 shapes=sh + tag((430, 85), "Nael"))


TOWERS8 = [(155, 35), (250, 15), (340, 28), (8, 245), (488, 245), (30, 340), (468, 340), (338, 465)]


def hf3():
    sh = [DIAG_NE(), DIAG_NW()] + n3() + [circle(c, r, SALMON, 0.42) for c, r in (((360, 55), 75), ((440, 330), 72), ((160, 440), 72), ((355, 440), 72))]
    for a, b in (((150, 55), (195, 38)), ((350, 55), (305, 38)), ((52, 180), (52, 135)), ((448, 180), (448, 135)), ((52, 300), (52, 340)),
                 ((448, 300), (448, 340)), ((150, 455), (195, 465)), ((350, 455), (305, 465))):
        sh.append(arrow(a, b))
    return scene(BA, roles=dict(MT=(160, 52), ST=(355, 52), H1=(55, 148), H2=(445, 148), D1=(55, 335), D2=(445, 335), D3=(160, 438), D4=(355, 438)),
                 shapes=sh)


HF4 = dict(MT=(212, 148), ST=(250, 140), H2=(305, 152), H1=(155, 232), D2=(355, 248), D1=(162, 292), D4=(340, 295), D3=(295, 338))


def hf4():
    sh = n3() + sum((tower(t, 30) for t in TOWERS8), []) + [circle(c, 75, SALMON, 0.4) for c in ((360, 55), (160, 435), (355, 440), (440, 330))]
    return scene(BA, boss=(250, 15), roles=HF4, shapes=sh + tag((250, 60), "Nael"))


HF5 = dict(MT=(155, 35), ST=(250, 15), H2=(340, 28), H1=(8, 245), D2=(488, 245), D1=(30, 340), D4=(468, 340), D3=(338, 465))


def hf5():
    sh = n3() + sum((tower(t, 30) for t in TOWERS8), []) + [rect((249, 249), 110, 68, 0, SALMON, 0.45)]
    sh += [arrow(off((250, 250), a, 70), off((250, 250), a, 205), "#ffc8c0") for a in (-22, 0, 22, -90, 90, -112, 112, 160)]
    return scene(BA, roles=HF5, shapes=sh)


def hf_core():
    return [rect((249, 249), 110, 68, 0, "#2fc9b9", 0.8)]


def hf6():
    sh = [cone((250, 250), d, 22, 246, YEL, 0.8) for d in (35, 215)] + n3() + hf_core()
    return scene(BA, roles=HF5, shapes=sh)


def hf7():
    sh = [cone((250, 250), d, 22, 246, "#d06a70", 0.6) for d in (57, 237)] + [cone((250, 250), d, 22, 246, YEL, 0.8) for d in (17, 197)]
    sh += n3() + hf_core() + hyper((0, 245))
    sh += arc_arrow((250, 250), 215, 60, 22, "#fff0c0", 0.8) + arc_arrow((250, 250), 215, 240, 202, "#fff0c0", 0.8)
    return scene(BA, roles=HF5, shapes=sh)


def hf8():
    sh = [cone((250, 250), d, 22.5, 246, YEL, 0.8) for d in (22.5, 67.5, 90, 112.5, 135, 157.5, 202.5, 247.5, 270, 292.5, 315, 337.5)]
    sh += [cone((250, 250), d, 22.5, 246, "#d06a70", 0.6) for d in (0, 180)]
    sh += n3() + hf_core() + hyper((140, 140), (25, 245), (410, 245), (345, 385))
    sh += arc_arrow((250, 250), 215, 330, 215, "#fff0c0", 0.8) + arc_arrow((250, 250), 215, 150, 35, "#fff0c0", 0.8)
    return scene(BA, roles=dict(H2=(380, 68), D3=(338, 128), D2=(362, 135), D4=(345, 152), ST=(162, 340), MT=(128, 352), D1=(148, 368),
                                H1=(125, 330)),
                 shapes=sh)


def hf9():
    sh = [cone((250, 250), d, 22.5, 246, "#d06a70", 0.6) for d in (75, 255)] + n3() + hf_core() + hyper((140, 140), (25, 245), (410, 245), (345, 385))
    sh += arc_arrow((250, 250), 210, 245, 205, "#fff0c0", 0.8) + arc_arrow((250, 250), 210, 65, 25, "#fff0c0", 0.8)
    sh += [dot((305, 140), 13, "#d42a1e"), dot((305, 140), 6, "#ffd24a")]
    return scene(BA, roles=dict(D4=(222, 180), H2=(248, 165), D3=(275, 180), D2=(305, 180), H1=(200, 318), ST=(228, 318), MT=(265, 312),
                                D1=(295, 320)), shapes=sh)


def hf10():
    sh = n3() + hyper((140, 140), (410, 230)) + stack((258, 240), 45)
    return scene(BA, boss=(250, 190), roles=pile(["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"], (258, 242), (1.5, 1.5)), shapes=sh)


def hffaq():
    sh = n3() + [VBAND(), DIAG_NW()] + [ring((158, 28), 22, "#ff3030", 0.7), ring((340, 470), 22, "#ff3030", 0.7)]
    return scene(BA, boss=[(60, 40), (250, 15), (430, 40)], roles=dict(HF_SIDES, MT=(382, 78), ST=(425, 110), D3=(80, 385), D4=(115, 420)),
                 shapes=sh + tag((430, 85), "Nael"))


# ---------------------------------------------------------------- Tenstrike Trio
LINE = dict(D3=(118, 248), H1=(155, 248), D1=(192, 248), MT=(230, 248), ST=(267, 248), D2=(304, 248), H2=(342, 248), D4=(380, 248))


def ts1():
    return scene(BA, roles=LINE, shapes=n3())


def ts2():
    sh = n3() + hatch((155, 248)) + hatch((192, 248)) + hatch((304, 248))
    return scene(BA, boss=(255, 210), roles=LINE, shapes=sh + tag((255, 165), "Twintania"))


TS3 = dict(H1=(162, 198), D2=(337, 198), D1=(250, 348), D3=(45, 235), D4=(432, 112), MT=(110, 378), H2=(445, 368), ST=(375, 445))


def ts3():
    sh = n3() + hatch((162, 198)) + hatch((337, 198)) + hatch((250, 348))
    return scene(BA, boss=(250, 250), roles=TS3, shapes=sh + tag((250, 295), "Twintania"))


def ts4():
    sh = n3() + [orb_aoe(c, 85)[0] for c in ((162, 198), (337, 198), (250, 348))]
    sh += [circle(c, 50, SALMON, 0.45) for c in ((45, 235), (442, 268), (337, 198), (250, 348))]
    sh += hatch((162, 198)) + hatch((337, 198)) + hatch((250, 348))
    return scene(BA, boss=(250, 250), roles=dict(TS3, D4=(442, 268)), shapes=sh)


TS5 = dict(H1=(60, 130), D2=(440, 130), D1=(250, 460), D3=(162, 200), D4=(337, 200), MT=(250, 348), H2=(445, 368), ST=(375, 445))


def ts5():
    sh = n3() + [orb_aoe(c, 85)[0] for c in ((162, 200), (337, 200), (250, 348))]
    sh += [circle(c, 50, SALMON, 0.45) for c in ((60, 130), (445, 368), (375, 445), (250, 348))]
    sh += hatch((60, 130)) + hatch((440, 130)) + hatch((250, 460))
    for a, b in (((70, 240), (138, 212)), ((430, 265), (360, 220)), ((195, 372), (232, 356)), ((150, 178), (85, 140)),
                 ((350, 178), (418, 140)), ((250, 380), (250, 435))):
        sh.append(arrow(a, b))
    return scene(BA, boss=(250, 250), roles=TS5, shapes=sh)


def ts6():
    sh = n3() + esm((337, 200), (250, 348), (445, 368), (375, 445))
    return scene(BA, roles=TS5, shapes=sh)


TS7 = dict(MT=(95, 62), D4=(380, 62), ST=(30, 305), H2=(470, 300), H1=(235, 338), D2=(268, 338), D1=(235, 368), D3=(268, 368))


def ts7():
    sh = n3() + [rect((251, 353), 62, 62, 0, "#7a8cff", 0.25, 0.3)] + esm((95, 62), (380, 62), (30, 305), (470, 300))
    return scene(BA, roles=TS7, shapes=sh)


def es_cones(pts):
    out = []
    for q in pts:
        d = math.degrees(math.atan2(q[0] - 250, -(q[1] - 250))) % 360
        out.append(cone((250, 250), d, 45, 246, SALMON, 0.38))
    return out


def ts8():
    sh = es_cones([(95, 62), (380, 62), (30, 305), (470, 300)]) + n3() + [circle(c, 55, ORG, 0.5, 0.01) for c in ((115, 60), (385, 60), (30, 310), (470, 310))]
    sh += esm((235, 338), (268, 338), (235, 368), (268, 368))
    return scene(BA, roles=TS7, shapes=sh)


TS9 = dict(H1=(162, 125), D2=(337, 125), D1=(100, 290), D3=(398, 290), **pile(["ST", "H2", "D4", "MT"], (255, 345), (-5, 4)))


def ts9():
    sh = n3() + [circle(c, 55, ORG, 0.5, 0.01) for c in ((115, 60), (385, 60), (30, 310), (470, 310))]
    sh += esm((162, 125), (337, 125), (100, 290), (398, 290))
    for t in ((175, 150), (325, 150), (125, 295), (375, 295)):
        sh.append(arrow((250, 330), t))
    return scene(BA, roles=TS9, shapes=sh)


def ts10():
    sh = es_cones([(162, 125), (337, 125), (100, 290), (398, 290)]) + n3()
    sh += [circle(c, 55, ORG, 0.5, 0.01) for c in ((162, 125), (337, 125), (100, 290), (398, 290), (115, 60), (385, 60), (30, 310), (470, 310))]
    return scene(BA, roles=TS9, shapes=sh)


# ---------------------------------------------------------------- Grand Octet
DR5 = [(250, 15), (15, 240), (485, 240), (85, 420), (430, 420)]


def drag5(skip=()):
    out = []
    for i, d in enumerate(DR5):
        if i not in skip:
            out += dragon(d)
    return out


GO_B = [(60, 50), (440, 62), (250, 465)]


def go_tags():
    return tag((70, 95), "Bahamut") + tag((440, 105), "Twintania") + tag((250, 425), "Nael")


ALL = ["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"]


def go1():
    return scene(BA, roles=pile(ALL, (245, 240), (1.5, 1.5)), shapes=n3() + drag5())


def go2():
    sh = n3() + drag5() + go_tags() + [dot((243, 205), 12, "#e6d23a", 0.95), dot((243, 205), 6, GREEN, 0.95)]
    return scene(BA, boss=GO_B, roles=pile(ALL, (245, 240), (1.5, 1.5)), shapes=sh)


def go3a():
    sh = n3() + drag5() + go_tags() + [dot((400, 350), 12, "#e6d23a", 0.95), dot((400, 350), 6, GREEN, 0.95)]
    sh += path([(255, 250), (330, 310), (380, 380)])
    return scene(BA, boss=GO_B, roles=pile(ALL, (395, 410), (1.5, 1.5)), shapes=sh)


def go3b():
    sh = n3() + drag5(skip=(4,)) + dragon((250, 482)) + tag((70, 95), "Bahamut") + tag((395, 112), "Twintania") + tag((440, 370), "Nael")
    sh += [dot((250, 420), 12, "#e6d23a", 0.95), dot((250, 420), 6, GREEN, 0.95)] + [arrow((250, 250), (255, 405))]
    return scene(BA, boss=[(60, 50), (400, 70), (440, 415)], roles=pile(ALL, (250, 455), (1.5, 1.5)), shapes=sh)


def go4():
    sh = [VBAND()] + n3() + drag5() + tag((70, 95), "Bahamut") + tag((395, 112), "Twintania")
    sh += path([(390, 410), (310, 440), (200, 450)])
    return scene(BA, boss=GO_B[:2], roles=pile(ALL, (400, 385), (1.5, 1.5)), shapes=sh)


def go5():
    sh = [rect((220, 350), 440, 85, 0, SALMON, 0.4), rect((330, 380), 95, 420, 40, SALMON, 0.4)] + n3() + drag5(skip=(3, 4))
    sh += tag((70, 95), "Bahamut") + tag((395, 112), "Twintania") + path([(75, 180), (110, 110), (215, 50)])
    return scene(BA, boss=GO_B[:2], roles=pile(ALL, (55, 235), (1.5, 1.5)), shapes=sh)


def go6():
    sh = [rect((80, 230), 95, 470, -12, SALMON, 0.4)] + n3() + drag5(skip=(1, 3, 4)) + tag((70, 95), "Bahamut") + tag((395, 112), "Twintania")
    sh += [dot((200, 12), 13, "#d8241c", 0.95), arrow((205, 85), (248, 240))]
    return scene(BA, boss=GO_B[:2], roles=pile(ALL, (200, 45), (1.5, 1.5)), shapes=sh)


def go7():
    sh = [rect((200, 130), 110, 560, 62, SALMON, 0.4)] + n3() + tag((395, 112), "Twintania") + [dot((250, 205), 14, "#d8241c", 0.95)]
    return scene(BA, boss=(400, 70), roles=pile(ALL, (245, 225), (1.5, 1.5)), shapes=sh)


GO_TOW = [(243, 128), (125, 252), (378, 240), (158, 340)]
GO8 = dict(D1=(312, 45), D4=(243, 135), H1=(250, 215), D3=(118, 258), ST=(385, 232), D2=(280, 298), MT=(172, 345), H2=(325, 385))


def go8():
    sh = n3() + sum((tower(t, 30) for t in GO_TOW), []) + mfring((118, 258), (385, 232), (280, 298), (325, 385)) + tag((420, 120), "Twintania")
    return scene(BA, boss=(420, 75), roles=GO8, shapes=sh)


def go9():
    sh = n3() + sum((tower(t, 30) for t in GO_TOW), []) + mfring((118, 258), (385, 232), (280, 298), (325, 385)) + tag((420, 120), "Twintania")
    sh += [dot((312, 12), 15, GREEN, 0.95)] + path([(340, 70), (390, 105), (440, 148)])
    return scene(BA, boss=(420, 75), roles=GO8, shapes=sh)


def go10():
    sh = [rect((275, 60), 100, 330, 62, SALMON, 0.4)] + n3() + sum((tower(t, 30) for t in GO_TOW), [])
    sh += mfring((130, 228), (360, 250), (340, 348), (268, 422)) + [circle((268, 422), 50, SALMON, 0.45), dot((458, 148), 15, GREEN, 0.95)]
    for q in ((240, 165), (240, 228), (145, 345), (350, 395)):
        sh += twister(q)
    return scene(BA, roles=dict(D4=(258, 105), H1=(205, 188), D3=(130, 228), ST=(360, 250), MT=(165, 315), D2=(340, 348), H2=(268, 422),
                                D1=(455, 180)), shapes=sh)


def go9a():
    sh = n3() + sum((tower(t, 30) for t in GO_TOW), []) + mfring((440, 160), (412, 168), (420, 198), (452, 200)) + tag((420, 120), "Twintania")
    sh += [dot((310, 12), 15, GREEN, 0.95)] + path([(295, 70), (270, 95), (250, 115)])
    return scene(BA, boss=(420, 75), roles=dict(D1=(310, 45), MT=(135, 235), H1=(360, 245), D4=(155, 355), ST=(440, 160), D2=(412, 168),
                                                 D3=(420, 198), H2=(452, 200)), shapes=sh)


def go9b():
    sh = n3() + sum((tower(t, 30) for t in GO_TOW), []) + mfring((310, 45), (452, 155), (420, 198), (460, 200)) + tag((420, 120), "Twintania")
    sh += [dot((310, 12), 15, GREEN, 0.95)] + path([(335, 75), (380, 120), (410, 158)])
    return scene(BA, boss=(420, 75), roles=dict(D1=(310, 45), ST=(248, 125), MT=(135, 235), H1=(360, 245), D4=(155, 355), D2=(452, 155),
                                                 D3=(420, 198), H2=(460, 200)), shapes=sh)


def qmfaq():
    """The source's FAQ picture: what dodging toward the middle does (Megaflares pile on the centre)."""
    sh = [circle(c, r, SALMON, 0.4) for c, r in (((180, 175), 55), ((300, 130), 75), ((335, 198), 50), ((175, 270), 72),
                                                          ((190, 320), 72), ((352, 300), 72), ((310, 345), 55))]
    for q in ((95, 88), (30, 222), (35, 290), (410, 402)):
        sh += twister(q)
    for a, b in (((150, 60), (175, 105)), ((360, 60), (330, 115)), ((60, 145), (120, 175)), ((420, 160), (355, 195)),
                 ((90, 300), (150, 280)), ((400, 300), (370, 305)), ((140, 380), (175, 345)), ((395, 395), (330, 355))):
        sh.append(arrow(a, b))
    return scene(BA, roles=dict(MT=(178, 128), ST=(300, 130), H1=(145, 182), H2=(335, 198), D1=(175, 270), D3=(190, 315), D2=(352, 305),
                                D4=(310, 345)), shapes=sh)
