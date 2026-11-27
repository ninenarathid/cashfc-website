"""P2 scenes, each redrawn from kanatan.info's P2 picture named in its function (dl/img/p2-NN)."""
from basedmu import *

WM08 = {"A": [50, 13], "1": [27, 28], "2": [73, 28], "D": [13, 52], "B": [87, 52], "4": [27, 75], "3": [73, 75], "C": [50, 90]}
LINEUP = dict(H1=(40, 53.5), MT=(40, 63), ST=(40, 72.5), H2=(40, 82), D1=(59, 53.5), D2=(59, 63), D3=(59, 72.5), D4=(59, 82))


def m_cone(c):
    """Spell hazard over a head: a cone."""
    return [cone(off(c, 180, 1.6), 0, 70, 4.2, "#c04ad8", 0.95, 0.2)]


def m_stack(c):
    return stack(c, 2.3, 1.6, 0.8)


def m_circle(c):
    return [ring(c, 2.0, "#ff5a3a", 0.8, 0.95), dot(c, 0.8, "#ff5a3a")]


def p2_08():
    s = board(576, 556, at=(49.5, 51), r=48.5, wm=WM08)
    s["roles"] = roles(**LINEUP)
    return s


def p2_09():
    s = board(572, 571, at=(49.5, 51), r=48.5, wm=WM08)
    s["roles"] = roles(**LINEUP)
    sh = m_stack((32, 49)) + m_cone((32, 60)) + m_cone((32, 69.5)) + m_cone((32, 79))
    sh += m_stack((66, 49)) + m_circle((66, 59)) + m_circle((66, 69)) + m_circle((66, 78.5))
    s["shapes"] = sh
    return s


def legend(items, x, y0, dy=7.5, size=2.6):
    out = []
    for i, (col, s) in enumerate(items):
        y = y0 + i * dy
        out += [dot((x, y), 1.4, col), text((x + 2.2 + 0.32 * size * len(s), y), s, size, "#222222")]
    return out


ODD_T = [(24, 64.5), (43, 64.5)]


def p2_tw(dots, items):
    s = board(863, 607, at=(34, 52), r=33, wm={"A": [34, 15], "1": [18, 30], "2": [49, 30], "D": [6, 52], "B": [63, 52], "4": [18, 75],
                                                 "3": [49, 75], "C": [34, 90]})
    s["markSize"] = 5.2
    sh = []
    for c in ODD_T:
        sh += [circle(c, 6.2, "#3a6ad8", 0.7, 0.01), ring(c, 6.2, "#e06060", 0.7, 0.95)]
    for (c, col) in dots:
        sh += [dot(c, 1.25, col)]
    sh += legend(items, 70, 8)
    s["shapes"] = sh
    return s


def p2_10():
    """Odd rounds: left tower = cone holders, right tower = circle holders; dots by role and priority."""
    r, o, g, p = "#e8302a", "#ff8a1c", "#22c84a", "#b04ac8"
    return p2_tw([((28, 60), r), ((29.5, 57.5), o), ((22, 61), g), ((18, 59), p),
                  ((39.5, 59.5), r), ((38, 58), o), ((39.8, 57), g), ((46, 70), p)],
                 [(r, "Stack"), (o, "Priority 1"), (g, "Priority 2"), (p, "Priority 3")])


def p2_11():
    """Even rounds: cone out / circle out in the towers, cone takers outside, two DPS bait Kefka's Future / Past."""
    r, g, y, b = "#e8302a", "#22c84a", "#f0d020", "#6fd8f0"
    return p2_tw([((27, 58), r), ((18, 60.5), y), ((20, 69), g), ((39, 58), r), ((49, 61), y), ((45, 70), g),
                  ((27, 43), b), ((40, 42), b)],
                 [(r, "Cone out"), (g, "Circle out"), (y, "Takes the cone"), (b, "Baits Future/Past")])


def p2_12():
    """After an even round: everybody between the two new towers (or opposite), outside Kefka's target circle."""
    wm = {"A": [46, 16], "1": [25, 30], "2": [70, 30], "D": [12, 52], "B": [82, 52], "4": [25, 74], "3": [70, 74], "C": [46, 87]}
    s = board(616, 602, at=(46, 50.5), r=45.5, wm=wm, boss=[46, 50])
    sh = []
    for c in ((29, 52), (47, 72)):
        sh += [circle(c, 8.3, "#3a6ad8", 0.7, 0.01), ring(c, 8.3, "#e06060", 0.8, 0.95)]
    s["shapes"] = sh
    s["roles"] = roles(MT=(30.5, 64), ST=(33.5, 64), H1=(36.5, 64.5), H2=(31.5, 67), D1=(34.5, 67), D2=(30, 68.5), D3=(33, 69), D4=(36, 68))
    s["iconSize"] = 4.8
    return s
