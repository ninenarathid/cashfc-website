"""P4 Twintania and Nael (Tuufless 04_adds) and P5 Golden Bahamut (05_golden_bahamut)."""
from sc_base import *

AD = "AD"
GB = "GB"
PARTY6 = ["H1", "H2", "D2", "D4", "D1"]


def n3():
    return neuro("L", "R", "S")


def tags():
    return [boss_tag((205, 160), "Twintania", 2.3), boss_tag((292, 55), "Nael", 2.3)]


ADDS_B = [(248, 138), (292, 92)]
LH_SE = [(450, 365), (420, 400), (380, 430), (330, 455), (285, 470)]


def lh():
    return [circle(c, 60, SALMON, 0.5, 0.01) for c in LH_SE]


def ad1():
    sh = n3() + [cone((250, 145), 320, 70, 175, SALMON, 0.42)] + tags()
    return scene(AD, boss=ADDS_B, roles=dict(MT=(200, 108), ST=(304, 128), D3=(397, 330), **pile(PARTY6, (245, 192), (3, 3))),
                 shapes=sh)


def ad2():
    sh = n3() + lh() + tags()
    return scene(AD, boss=ADDS_B, roles=dict(MT=(215, 88), ST=(285, 95), D3=(195, 455), **pile(PARTY6, (245, 192), (3, 3))), shapes=sh)


def ad3():
    sh = n3() + lh() + hatch((195, 178)) + hatch((245, 250)) + hatch((195, 455)) + tags()
    return scene(AD, boss=ADDS_B, roles=dict(MT=(215, 88), ST=(285, 95), H1=(62, 128), H2=(432, 125), D1=(195, 178), D2=(300, 180),
                                             D4=(245, 250), D3=(195, 455)), shapes=sh)


def ad4():
    sh = n3() + lh() + orb_aoe((162, 200), 88) + orb_aoe((337, 200), 88) + hatch((162, 200)) + hatch((337, 200)) + hatch((175, 340))
    return scene(AD, boss=[(255, 70)], roles=dict(MT=(210, 62), ST=(288, 62), D2=(330, 62), H1=(62, 128), H2=(432, 125), D1=(162, 200),
                                                  D4=(337, 200), D3=(175, 340)), shapes=sh)


def ad5():
    sh = n3() + lh() + orb_aoe((250, 348), 88) + hatch((250, 348))
    for q in ((162, 200), (270, 75), (440, 130), (180, 335)):
        sh += twister(q)
    return scene(AD, boss=[(255, 40)], roles=dict(MT=(205, 25), ST=(288, 25), D2=(330, 35), H1=(110, 72), H2=(392, 72), D1=(162, 138),
                                                  D4=(325, 138), D3=(250, 348)), shapes=sh)


OUTR = dict(H1=(72, 290), H2=(425, 322), D3=(180, 355), D4=(300, 365))


def ad6a():
    sh = n3() + [donut((250, 75), 248, 82, SALMON, 0.42)]
    return scene(AD, boss=[(250, 70)], roles=dict(OUTR, MT=(240, 30), ST=(305, 45), D1=(215, 100), D2=(295, 115)), shapes=sh)


def ad6b():
    sh = n3() + [circle((258, 75), 112, SALMON, 0.42)]
    return scene(AD, boss=[(250, 70)], roles=dict(OUTR, MT=(195, 232), ST=(285, 212), D1=(232, 238), D2=(265, 238)), shapes=sh)


def ad6c():
    sh = n3() + [circle((155, 288), 50, SALMON, 0.45)]
    return scene(AD, boss=[(250, 70), (180, 230)], roles=dict(MT=(205, 155), ST=(282, 155), D1=(155, 208), D2=(340, 210), H1=(155, 288),
                                                             H2=(340, 288), D3=(210, 340), D4=(290, 340)), shapes=sh)


def ad6d():
    sh = n3() + [circle((242, 248), 50, "#c0302a", 0.5)]
    return scene(AD, boss=[(250, 80)], roles=pile(["ST", "H1", "H2", "D1", "D3", "D4", "D2", "MT"], (240, 245), (2, 2)), shapes=sh)


def ad7():
    sh = n3()
    for q in ((290, 160), (340, 200), (232, 232), (155, 295)):
        sh += twister(q)
    for t in ((180, 85), (318, 85), (85, 180), (412, 180), (88, 318), (412, 318), (180, 412), (318, 412)):
        sh.append(arrow((250 + (t[0] - 250) * 0.2, 250 + (t[1] - 250) * 0.2), (250 + (t[0] - 250) * 0.8, 250 + (t[1] - 250) * 0.8)))
    return scene(AD, boss=[(255, 60), (170, 240)], roles=dict(MT=(180, 85), ST=(318, 85), D1=(85, 180), D2=(412, 180), H1=(88, 318),
                                                           H2=(412, 318), D3=(180, 412), D4=(318, 412)), shapes=sh)


def ad8():
    sh = n3() + buster((215, 95)) + buster((285, 95)) + tags()
    return scene(AD, boss=ADDS_B, roles=dict(MT=(215, 95), ST=(285, 95), **pile(PARTY6 + ["D3"], (245, 192), (3, 3))), shapes=sh)


# ---------------------------------------------------------------- Golden Bahamut
def exa(at):
    """An Exaflare: a circle with chevrons showing which way it travels (down the picture)."""
    x, y = at
    out = [circle(at, 55, "#f0a37e", 0.4, 0.15)]
    for k, c in enumerate(("#a0382a", "#e08a2a", "#f2d88a")):
        yy = y - 18 + k * 12
        out += [line((x - 30, yy - 18), (x, yy + 8), c, 0.9), line((x + 30, yy - 18), (x, yy + 8), c, 0.9)]
    return out


ALL = ["ST", "H1", "H2", "D1", "D2", "D3", "D4", "MT"]


def gb1():
    return scene(GB, boss=(255, 210), roles=pile(ALL, (248, 230), (2, 2)), shapes=[circle((255, 230), 55, "#d8241c", 0.45)])


def gb2():
    sh = [circle((252, 335), 55, SALMON, 0.5)] + buster((252, 335))
    return scene(GB, boss=(278, 290), roles=dict(MT=(240, 335), ST=(264, 335), **pile(["H1", "H2", "D1", "D3", "D4", "D2"], (250, 240), (3, 2))),
                 shapes=sh)


def gb3():
    sh = exa((200, 45)) + exa((290, 45))
    return scene(GB, boss=(278, 290), roles=dict(MT=(240, 340), ST=(264, 340), **pile(["H1", "H2", "D1", "D3", "D4", "D2"], (250, 240), (3, 2))),
                 shapes=sh)


def gb4():
    sh = exa((135, 40)) + exa((430, 40)) + exa((200, 205)) + exa((290, 205))
    return scene(GB, boss=(330, 110), roles=pile(ALL, (355, 75), (3, 2)), shapes=sh)


def gb5():
    sh = exa((55, 35)) + exa((345, 35)) + exa((135, 205)) + exa((440, 205)) + exa((200, 375)) + exa((290, 375))
    return scene(GB, boss=(290, 110), roles=pile(ALL, (262, 45), (3, 2)), shapes=sh)


def gb6():
    sh = [circle((262, 165), 55, SALMON, 0.5)] + buster((262, 165))
    return scene(GB, boss=(300, 100), roles=dict(MT=(262, 165), **pile(["ST", "H1", "H2", "D2", "D3", "D4", "D1"], (262, 45), (3, 2))),
                 shapes=sh)


def gb7():
    sh = [circle((262, 45), 55, "#d8241c", 0.45)]
    return scene(GB, boss=(300, 120), roles=pile(ALL, (262, 45), (3, 2)), shapes=sh)
