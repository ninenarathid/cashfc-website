"""The Arkveld EX cheatsheet: Nukemaru's sheet on xivjpraids.com, redrawn panel by panel as square scenes.
Positions measured on the source (2301x1414), each circle mapped onto the guide's arena."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ark/tools")
from shp import *  # noqa

GOLD_HI = "#ffd24d"
PANEL = {"iconSize": 7.4, "markSize": 7.0, "bossSize": 10.0}


def mapper(cx, cy, r):
    k = 41.5 / r
    return lambda x, y: (R(50.5 + (x - cx) * k), R(52 + (y - cy) * k))


def roles_of(m, d):
    return {s: list(m(*p)) for s, p in d.items()}


def white_heads(pts_, wd=1.6):
    """White arrowheads along a path, as EX7's Gaze of the Void has them."""
    out = []
    for p, q in zip(pts_, pts_[1:]):
        a = (p[0] + (q[0] - p[0]) * 0.45, p[1] + (q[1] - p[1]) * 0.45)
        b = (p[0] + (q[0] - p[0]) * 0.55, p[1] + (q[1] - p[1]) * 0.55)
        out.append(arrow(a, b, "#ffffff", wd, 1))
    return out


def order_badge(c, s):
    return [dot(c, 2.6, GOLD_HI, 1), text(c[0], c[1] + 0.15, s, 3.4, "#1a1a1a")]


# ------------------------------------------------------------------ 1-2 dash + 4:4 stacks (after the dash)
def p_dash_red():
    m = mapper(47.5, 52, 47.5)
    s = [rect(-1, -1, m(40, 0)[0], 101, RED, 0.5, 0.01), rect(m(54, 0)[0], -1, 101, 101, RED, 0.5, 0.01),
         line((m(40, 0)[0], -1), (m(40, 0)[0], 101), "#ff2a2a", 0.9, 0.95), line((m(54, 0)[0], -1), (m(54, 0)[0], 101), "#ff2a2a", 0.9, 0.95)]
    g1, g2 = m(46.5, 27), m(46.75, 57.5)
    s += stack(g1[0], g1[1], 9.5, 9.5, 2, 5.2) + stack(g2[0], g2[1], 9.5, 9.5, 2, 5.2)
    roles = roles_of(m, {"MT": (41.5, 22.5), "H1": (51.5, 22.5), "D1": (41.5, 31.5), "D2": (51.5, 31.5),
                         "ST": (42, 53), "H2": (51.5, 53), "D3": (42, 62), "D4": (51.5, 62)})
    return {"shapes": wm_rings() + s, "arena": ARENA, "boss": list(m(47, 5)), "roles": roles, **PANEL}


def p_dash_white():
    m = mapper(49, 52, 47)
    x0, x1 = m(25, 0)[0], m(74, 0)[0]
    s = strip(x0, x1, STRIP, 0.5, "#ffffff")
    g1, g2 = m(82.5, 26.75), m(82.5, 57.5)
    s += stack(g1[0], g1[1], 9.5, 9.5, 2, 5.2) + stack(g2[0], g2[1], 9.5, 9.5, 2, 5.2)
    roles = roles_of(m, {"MT": (77.5, 22.5), "H1": (87.5, 22.5), "D1": (77.5, 31), "D2": (87.5, 31),
                         "ST": (77.5, 53), "H2": (87.5, 53), "D3": (77.5, 62), "D4": (87.5, 62)})
    return {"shapes": wm_rings() + s, "arena": ARENA, "boss": list(m(49.5, 7)), "roles": roles, **PANEL}


# ------------------------------------------------------------------ 3-4 Clamorous Chase
def p_chase(cw=True):
    m = mapper(49.5, 54, 47)
    if cw:
        d = {4: (49.5, 11), 1: (91, 51.5), 3: (6, 51.5), 2: (49.5, 95), 7: (42, 51.5), 5: (56, 51.5), 6: (49.5, 58.5), 8: (49.5, 44.5)}
        up = (63, 3)
        path = [(80, 49), (79, 60), (74, 69), (64, 75), (51, 77)]
        col = "#f07a2a"
    else:
        d = {4: (50, 11), 1: (7.5, 51.5), 3: (93, 51.5), 2: (50, 95), 5: (43, 51.5), 7: (57.5, 51.5), 6: (50, 58.5), 8: (50, 44.5)}
        up = (36, 3)
        path = [(19, 49), (20, 60), (25, 69), (35, 75), (48, 78)]
        col = "#3cb04a"
    s = []
    one = m(*d[1])
    s += [circle(one, 6.4, GOLD_HI, 0.25), ringl(one, 6.4, GOLD_HI, 1.0, 1)]   # the start, unmissable
    mp = [m(*p) for p in path]
    s += [line(p, q, col, 2.4, 0.95) for p, q in zip(mp[:-2], mp[1:-1])] + [arrow(mp[-2], mp[-1], col, 2.4, 0.95)]
    s += white_heads(mp[:-1], 0.8)
    for n, c in d.items():
        s += num(m(*c), n, 3.6)
    u = m(*up)
    s += [arrow((u[0], u[1] + 3.2), (u[0], u[1] - 3.2), "#ff3030", 1.3)]
    boss = m(50, -1.5)
    return {"shapes": s, "arena": ARENA, "waymarks": None, "boss": [boss[0], boss[1]], **PANEL}


# ------------------------------------------------------------------ 5-6 towers
def tank_coil(c, r=4.6):
    return [ringl(c, r, "#c8283c", 0.9, 0.95), ringl(c, r - 1.1, "#e04a50", 0.6, 0.9), circle(c, r - 1.6, "#2a1010", 0.35)]


def small_ring(c, r=4.2):
    return [ringl(c, r, "#f08a3a", 0.7, 0.95)]


def p_towers(which):
    if which == 1:
        m = mapper(48, 49.5, 48)
        boss = (48, 48)
        tank = {"MT": (21, 37.5), "ST": (76, 52.5)}
        small = [(42, 23), (69, 29.5), (28, 69.5), (56, 77.5)]
        roles = {"MT": (21, 39.5), "ST": (76, 54.5), "D3": (42.5, 21.5), "D4": (69, 28), "D1": (28, 68.5), "D2": (56, 76),
                 "H1": (19.5, 54), "H2": (81.5, 37)}
    else:
        m = mapper(49.5, 49.5, 48)
        boss = (49.5, 48)
        tank = {"MT": (55, 19.5), "ST": (43.5, 72)}
        small = [(32.5, 28), (80, 42), (22, 56.5), (70, 69)]
        roles = {"MT": (55, 21.5), "ST": (43.5, 74), "D3": (32.5, 26.5), "D4": (80, 40.5), "D1": (22, 55), "D2": (70, 67.5),
                 "H1": (22.5, 39), "H2": (81, 55)}
    s = [ringl(m(*boss), 20 * 41.5 / 48, "#e88aa0", 0.6, 0.85)]
    for c in tank.values():
        s += tank_coil(m(*c), 5.2)
    for c in small:
        s += small_ring(m(*c), 4.6)
    return {"shapes": wm_rings() + s, "arena": ARENA, "boss": list(m(*boss)), "roles": roles_of(m, roles), **PANEL}


# ------------------------------------------------------------------ 7-8 beams
def p_beam2():
    m = mapper(49, 56, 46)
    a, b = m(50, 18), m(92, 73)
    s = band((a[0] + 2.2, a[1] - 1.6), (b[0] + 2.2, b[1] - 1.6), 5.5, "#e05a5a", 0.3, 0.01) + [line(a, b, "#ff2a2a", 0.8, 0.95)]
    g1, g2 = m(67.25, 15.75), m(84.25, 41.5)
    s += stack(g1[0], g1[1], 9.5, 9.5, 2, 5.2) + stack(g2[0], g2[1], 9.5, 9.5, 2, 5.2)
    roles = roles_of(m, {"MT": (63, 11.5), "H1": (71.5, 11.5), "D1": (63, 20), "D2": (71.5, 20),
                         "ST": (80, 37.5), "H2": (88.5, 37.5), "D3": (80, 45.5), "D4": (88.5, 45.5)})
    return {"shapes": wm_rings() + s, "arena": ARENA, "boss": list(m(47.5, 9.5)), "roles": roles, **PANEL}


def p_beam3():
    m = mapper(52, 52, 44)
    roles = {"D1": (30.5, 20.5), "MT": (47.5, 17), "D2": (66.5, 26), "ST": (46.5, 35), "H1": (29, 39.5),
             "H2": (63.5, 44.5), "D3": (20, 59.5), "D4": (45, 58.5)}
    s = []
    for c in ((28.5, 19.5), (49, 13), (66.5, 24.5), (46.5, 35), (29, 40), (65, 44.5), (20, 59.5), (45, 58.5)):
        s += aoe(m(*c), 12.5 * 41.5 / 44, 0.5, "#f59a3a")
    return {"shapes": wm_rings() + s, "arena": ARENA, "boss": list(m(52, 9.5)), "roles": roles_of(m, roles), **PANEL}
