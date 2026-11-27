"""P2 Nael deus Darnus (Tuufless 02_nael). Random targets are drawn as a plain player tile."""
from sc_base import *

NA = "NA"
DRAGONS = [(238, 22), (62, 78), (470, 213), (85, 388), (430, 388)]
ALL = ["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"]
PARTY = ["H1", "H2", "D2", "D3", "D4", "D1"]
NAEL = (250, 212)
FIRE_C = "#ff7a1a"
THUNDER = "#d58ad8"
WHITE = "#e8e8e8"


def base(drag=True, which=None):
    sh = neuro("L", "R", "S")
    if drag:
        for i, d in enumerate(DRAGONS):
            if which is None or i in which:
                sh += dragon(d)
    return sh


def fire_tether(a, b=(468, 222)):
    return [line(a, b, FIRE_C, 0.6, 0.95)]


def thunder(at, r=55):
    return [circle(at, r, THUNDER, 0.35, 0.2)] + player(at) + badge((at[0] + 18, at[1] - 18), "Thunder", "#b0349a")


def doomed(at, ring_=False):
    out = [ring(at, 22, "#ffffff", 0.5)] if ring_ else []
    return out + player(at) + badge((at[0] + 17, at[1] - 17), "Doom", "#4a1d6a")


def wings(at, r=50):
    return [circle(at, r, WHITE, 0.6, 0.1)]


def beam(at, r=38):
    return [circle(at, r, "#c0302a", 0.55, 0.2)]


def na11():
    return scene(NA, boss=NAEL, roles=dict(MT=(252, 166), **pile(PARTY + ["ST"], (252, 264), (1.5, 1.5))), shapes=base(False))


def na12():
    return scene(NA, boss=NAEL, roles=dict(MT=(252, 166), **pile(PARTY + ["ST"], (252, 264), (1.5, 1.5))), shapes=base())


def na13():
    sh = base() + [donut((250, 218), 232, 78, SALMON, 0.4)]
    sh += thunder((196, 188), 54) + thunder((302, 188), 54)
    sh += [arrow((240, 262), (205, 200)), arrow((262, 262), (295, 200))]
    return scene(NA, boss=NAEL, roles=pile(ALL, (250, 276), (1.5, 1.5)), shapes=sh)


def na14a():
    sh = base() + beam((250, 274)) + fire_tether((262, 274))
    return scene(NA, boss=NAEL, roles=pile(ALL, (250, 276), (1.5, 1.5)), shapes=sh)


def na14b():
    sh = base() + [circle((250, 220), 112, SALMON, 0.42)] + fire_tether((262, 360), (468, 228))
    sh += [arrow((250, 255), (250, 335))]
    return scene(NA, boss=NAEL, roles=pile(ALL, (250, 368), (1.5, 1.5)), shapes=sh)


def na15():
    sh = base() + [circle((250, 283), 50, SALMON, 0.45)] + wings((250, 357)) + fire_tether((262, 284), (468, 225))
    sh += [arrow((250, 345), (250, 305))]
    return scene(NA, boss=NAEL, roles=pile(ALL, (252, 286), (1.5, 1.5)), shapes=sh)


def na16():
    sh = base() + wings((252, 283)) + doomed((245, 357))
    sh += path([(252, 290), (225, 240), (205, 210)])
    return scene(NA, boss=NAEL, roles=pile(ALL, (194, 184), (1.5, 1.5)), shapes=sh)


def na17():
    sh = base() + [ring((250, 280), 22, "#ffffff", 0.5)] + doomed((250, 280))
    sh += path([(205, 205), (222, 245), (240, 265)])
    return scene(NA, boss=NAEL, roles=pile(ALL, (194, 184), (1.5, 1.5)), shapes=sh)


def na18():
    sh = base() + buster((252, 164))
    return scene(NA, boss=NAEL, roles=dict(MT=(252, 164), **pile(PARTY + ["ST"], (248, 256), (1.5, 1.5))), shapes=sh)


def na19():
    sh = base() + [circle((352, 258), 50, SALMON, 0.45)] + player((352, 258)) + badge((370, 240), "Fire", "#d2501e")
    sh += fire_tether((362, 258), (470, 225))
    return scene(NA, boss=NAEL, roles=dict(MT=(252, 164), **pile(PARTY + ["ST"], (248, 256), (1.5, 1.5))), shapes=sh)


def na21():
    sh = base() + thunder((140, 295), 58) + thunder((310, 355), 58)
    sh += [arrow((235, 268), (160, 293)), arrow((262, 270), (300, 335))]
    return scene(NA, boss=NAEL, roles=dict(MT=(252, 164), **pile(PARTY + ["ST"], (248, 256), (1.5, 1.5))), shapes=sh)


def na22():
    return scene(NA, boss=NAEL, roles=pile(ALL, (252, 256), (1.5, 1.5)), shapes=base() + beam((250, 250)))


def na23a():
    return scene(NA, boss=NAEL, roles=pile(ALL, (250, 276), (1.5, 1.5)), shapes=base() + [donut((250, 218), 232, 82, SALMON, 0.4)])


def na23b():
    sh = base() + [circle((250, 205), 80, SALMON, 0.42)]
    return scene(NA, boss=NAEL, roles=pile(ALL, (250, 368), (1.5, 1.5)), shapes=sh)


def na24():
    sh = base() + wings((252, 283)) + path([(252, 290), (225, 240), (205, 210)])
    sh += badge((212, 160), "Doom", "#4a1d6a")
    return scene(NA, boss=NAEL, roles=pile(ALL, (194, 184), (1.5, 1.5)), shapes=sh)


def na25():
    sh = base() + wings((182, 183)) + doomed((250, 276))
    sh += [arrow((215, 186), (292, 186)), arrow((215, 200), (243, 255))]
    return scene(NA, boss=NAEL, roles=pile(ALL, (310, 184), (1.5, 1.5)), shapes=sh)


def na26():
    sh = base() + wings((298, 190)) + thunder((295, 88), 62) + thunder((392, 198), 62)
    sh += [ring((188, 186), 22, "#ffffff", 0.5)] + doomed((188, 186))
    sh += [arrow((298, 190), (298, 125)), arrow((298, 190), (365, 198)), arrow((298, 190), (215, 186))]
    sh += fire_tether((268, 268), (470, 222))
    return scene(NA, boss=NAEL, roles=pile(ALL, (258, 268), (1.5, 1.5)), shapes=sh)


def na27():
    sh = base() + [ring((305, 186), 22, "#ffffff", 0.5)] + doomed((305, 186)) + fire_tether((268, 268), (470, 222))
    sh += [arrow((268, 252), (298, 210))]
    return scene(NA, boss=NAEL, roles=pile(ALL, (258, 268), (1.5, 1.5)), shapes=sh)


def na28():
    sh = base() + [circle((255, 260), 50, SALMON, 0.45)] + player((200, 167)) + badge((218, 149), "Fire", "#d2501e")
    sh += fire_tether((268, 268), (470, 222))
    return scene(NA, boss=NAEL, roles=pile(ALL, (258, 268), (1.5, 1.5)), shapes=sh)


SPREAD = dict(MT=(224, 170), ST=(286, 170), H1=(116, 222), H2=(382, 224), D1=(204, 248), D2=(304, 254), D3=(172, 316), D4=(334, 326))


def na29():
    return scene(NA, boss=NAEL, roles=SPREAD, shapes=base() + buster((224, 170)))


def na31():
    sh = base() + [circle((334, 326), 50, SALMON, 0.45)] + fire_tether((116, 222), (470, 222))
    return scene(NA, boss=(320, 300), roles=SPREAD, shapes=sh)


def na32a():
    sh = base() + [donut((290, 258), 215, 75, SALMON, 0.4)] + fire_tether((300, 244), (470, 222))
    sh += badge((318, 230), "Thunder", "#b0349a") + badge((340, 222), "Thunder", "#b0349a")
    return scene(NA, boss=(300, 265), roles=dict(D4=(334, 326), **pile(["MT", "ST", "H1", "H2", "D1", "D3", "D2"], (285, 248), (1.5, 1.5))),
                 shapes=sh)


def na32b():
    sh = base() + [circle((322, 300), 125, SALMON, 0.42)] + fire_tether((175, 250), (470, 222))
    sh += badge((338, 132), "Thunder", "#b0349a") + badge((434, 182), "Thunder", "#b0349a")
    return scene(NA, boss=(322, 300), roles=dict(MT=(224, 170), ST=(280, 156), D2=(320, 150), H2=(416, 200), D1=(182, 234),
                                                 H1=(175, 252), D3=(172, 316), D4=(384, 406)),
                 shapes=sh)


def na33():
    sh = base() + [circle((252, 236), 50, SALMON, 0.45)] + fire_tether((268, 236), (470, 222))
    return scene(NA, boss=(312, 300), roles=pile(ALL, (256, 236), (1.5, 1.5)), shapes=sh)


def na34():
    sh = base() + wings((250, 228)) + thunder((320, 124), 62) + thunder((108, 272), 62)
    sh += [arrow((250, 245), (312, 148)), arrow((250, 245), (132, 268))]
    return scene(NA, boss=(312, 300), roles=pile(ALL, (314, 292), (1.5, 1.5)), shapes=sh)


def na35():
    sh = base() + wings((157, 318)) + [ring((250, 240), 22, "#ffffff", 0.5)] + doomed((250, 240))
    sh += [arrow((300, 280), (262, 250))]
    return scene(NA, boss=(312, 300), roles=pile(ALL, (314, 292), (1.5, 1.5)), shapes=sh)


def na36():
    sh = base() + wings((322, 307)) + [ring((165, 322), 22, "#ffffff", 0.5)] + doomed((165, 322))
    sh += [arrow((228, 300), (182, 316))]
    return scene(NA, boss=(312, 290), roles=pile(ALL, (242, 298), (1.5, 1.5)), shapes=sh)


def na37():
    sh = base() + [ring((330, 290), 22, "#ffffff", 0.5)] + doomed((330, 290)) + [arrow((262, 300), (310, 292))]
    return scene(NA, boss=NAEL, roles=dict(MT=(248, 184), **pile(PARTY + ["ST"], (238, 302), (1.5, 1.5))), shapes=sh)


def na38():
    return scene(NA, boss=NAEL, roles=dict(MT=(248, 184), **pile(PARTY + ["ST"], (238, 302), (1.5, 1.5))), shapes=base() + buster((248, 184)))


DIVE_MK = "#3fd0a0"


def marked(at):
    return player(at) + [dot((at[0], at[1] - 26), 8, DIVE_MK, 0.95), ring((at[0], at[1] - 26), 8, "#0b6b4f", 0.35)]


NAEL4 = (250, 232)


def na41():
    sh = base() + marked((385, 82)) + [arrow((252, 290), (365, 110))]
    return scene(NA, boss=NAEL4, roles=dict(ST=(250, 200), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 300), (1.5, 1.5))),
                 shapes=sh)


HN_NE = [(375, 75), (418, 110)]
HN_S = [(217, 465), (268, 465)]


def hyper(cs, r=62):
    return [circle(c, r, "#8a2bb8", 0.55, 0.01) for c in cs]


def na42():
    sh = base() + hyper(HN_NE) + marked((250, 478)) + [arrow((385, 60), (270, 270)), arrow((250, 330), (250, 420))]
    return scene(NA, boss=NAEL4, roles=dict(ST=(250, 200), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 302), (1.5, 1.5))),
                 shapes=sh)


def na43():
    sh = base() + hyper(HN_NE) + hyper(HN_S) + marked((25, 240)) + [arrow((235, 478), (240, 335)), arrow((215, 295), (55, 242))]
    return scene(NA, boss=NAEL4, roles=dict(ST=(250, 200), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 298), (1.5, 1.5))),
                 shapes=sh)


def dive_ne():
    return [rect((362, 52), 220, 80, 14, SALMON, 0.5), rect((428, 122), 80, 230, -28, SALMON, 0.5)]


def na44():
    sh = base(which=[1, 3, 4]) + hyper(HN_NE) + hyper(HN_S) + dive_ne() + marked((25, 240))
    return scene(NA, roles=dict(ST=(292, 174), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 222), (1.5, 1.5))), shapes=sh)


def dive_s():
    return [rect((220, 420), 85, 480, 76, SALMON, 0.45)]


def na45a():
    sh = base(which=[1, 3]) + dive_s() + [circle((290, 174), 62, SALMON, 0.5)] + buster((290, 174))
    sh += [arrow((20, 250), (205, 265))]
    return scene(NA, boss=(290, 95), roles=dict(ST=(290, 174), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (240, 252), (1.5, 1.5))),
                 shapes=sh)


def na45b():
    sh = base(which=[1, 3]) + dive_s() + [circle(c, 50, SALMON, 0.45) for c in ((238, 162), (185, 236), (268, 260), (350, 310))]
    return scene(NA, roles=dict(D2=(238, 162), D4=(185, 236), H1=(268, 260), D3=(350, 310), D1=(185, 302), H2=(268, 328),
                                ST=(312, 158), MT=(390, 228)),
                 shapes=sh)


def dive_w():
    return [rect((42, 245), 80, 370, 9.5, SALMON, 0.45), rect((55, 320), 80, 330, -13, SALMON, 0.45)]


def na46a():
    sh = base(False) + dive_w() + beam((250, 248), 50)
    return scene(NA, boss=(285, 140), roles=pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT", "ST"], (245, 240), (1.5, 1.5)), shapes=sh)


def na46b():
    sh = base(False) + dive_w() + [circle((290, 174), 62, SALMON, 0.5)] + buster((290, 174))
    return scene(NA, boss=(285, 135), roles=dict(ST=(290, 174), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 248), (1.5, 1.5))),
                 shapes=sh)


def na47():
    sh = base(False) + buster((300, 160))
    return scene(NA, boss=(265, 185), roles=dict(ST=(300, 160), **pile(["H1", "H2", "D1", "D2", "D3", "D4", "MT"], (248, 248), (1.5, 1.5))),
                 shapes=sh)
