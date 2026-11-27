"""P7 Dragon-king Thordan: the round arena with the boss in the middle facing north, redrawn from Tuufless's 07/ pictures."""
from base import *
import sc2

FLOOR7 = "#4a5f7a"
TC = (50, 48)


def arena(sh, fill=FLOOR7, **kw):
    return sc2.arena(sh, wm=False, fill=fill, **kw)


def thordan(c=TC, r=18):
    pts = arc_pts(c, r, -140, 140, 20)
    out = [line(pts[i], pts[i + 1], "#d62b2b", 1.0, 0.95) for i in range(20)]
    pts2 = arc_pts(c, r - 2, -140, 140, 20)
    out += [line(pts2[i], pts2[i + 1], "#d62b2b", 0.35, 0.9) for i in range(20)]
    out += [cone(off(c, 0, r + 2.2), 180, 50, 3.0, "#d62b2b", 0.95, 0.1)]
    return out


def fire():
    sh = [circle(TC, 18, "#e02424", 0.42)] + thordan()
    rl = {k: (50 + (i % 4) * 0.7 - 1, 72 + (i // 4) * 0.8) for i, k in enumerate(["D1", "D2", "D3", "D4", "H1", "H2", "ST", "MT"])}
    return arena(sh, roles=roles(**rl))


def ice():
    sh = [donut(TC, 60, 18, "#e02424", 0.42)] + sc2.clip() + thordan()
    rl = {k: (50 + (i % 4) * 0.7 - 1, 62 + (i // 4) * 0.8) for i, k in enumerate(["D1", "D2", "D3", "D4", "H1", "H2", "ST", "MT"])}
    return arena(sh, roles=roles(**rl))


def trinity():
    sh = [circle((49, 26), 6, "#a040c0", 0.4), circle((68, 37), 6, "#ffffff", 0.35), circle((49, 49), 6, "#ffb0b0", 0.45)] + thordan()
    rl = dict(MT=(49, 26), ST=(68, 37), D1=(49, 49), H1=(46, 70), H2=(49, 68), D2=(52, 69), D4=(50, 72))
    return arena(sh, roles=roles(**rl))


def akh_morn():
    sh = tower((34, 42), 6.5, "#e8c44a") + tower((66, 42), 6.5, "#e8c44a") + tower((50, 70), 6.5, "#9ad8ff") + thordan()
    rl = dict(D1=(31, 38), D3=(37, 38), H1=(34, 45), D2=(63, 38), D4=(69, 38), H2=(66, 45), MT=(47, 69), ST=(53, 69))
    return arena(sh, roles=roles(**rl))


def akh_116():
    sh = tower((34, 42), 6.5, "#e8c44a") + tower((66, 42), 6.5, "#e8c44a") + tower((50, 70), 6.5, "#9ad8ff") + thordan()
    rl = dict(MT=(66, 42), D1=(32, 38), D2=(36, 38), D3=(31, 42), D4=(37, 42), H1=(32, 46), H2=(36, 46), ST=(50, 70))
    return arena(sh, roles=roles(**rl))


def exa(c, lane=None, r=10):
    """An Exaflare telegraph (circle + its bright centre dot); `lane` = the way it travels (a faint band to the edge)."""
    out = []
    if lane is not None:
        end = off(c, lane, 70)
        out.append(beam(c, end, r * 2, PINK, 0.16))
        out.append(line(c, off(c, lane, 60), "#ff6a6a", 0.3, 0.8, True))
    out += [circle(c, r, "#f0b0a0", 0.35), ring(c, r, "#ffffff", 0.3, 0.7), dot(c, 0.9, "#ffffff")]
    return out


def gx(c, n, dx=2.6):
    return xmark(c, 1.6, "#3ee05a", 0.5) + [text((c[0] + dx, c[1] + 2.4), str(n), 3.6, "#3ee05a")]


NW_, NE_, S_ = (31, 40), (62, 40), (47, 69)


def exaflare(n):
    T = exa(NW_) + exa(NE_) + exa(S_)
    if n == 1:
        return arena(thordan() + T)
    if n == 3:
        sh = [circle(c, 12, PINK, 0.45) for c in ((22, 45), (40, 27), (48, 42), (58, 55), (68, 37), (80, 35), (46, 55), (56, 75))]
        return arena(thordan() + sh + sc2.clip() + gx((49, 67), 1, -3))
    sh = [circle(c, 12, PINK, 0.45) for c in ((48, 13), (32, 40), (62, 45), (52, 62), (60, 68), (10, 63), (97, 40), (70, 90))]
    sh += sc2.clip()
    return arena(thordan() + sh + [arrow((49, 69), (49, 79), "#ffffff", 0.4)] + gx((50, 81), 2, -3))


def uptime(case):
    """Straight Exaflares run south; a diagonal NW one runs south-east, a diagonal NE one south-west."""
    lanes = {1: (180, 180, 180), 2: (135, 180, 180), 3: (180, 225, 180), 4: (135, 225, 180), 5: (45, 45, 45)}[case]
    NW, NE, S = (30, 40), (63, 40), (48, 69)
    sh = exa(NW, lanes[0]) + exa(NE, lanes[1]) + exa(S, lanes[2]) + sc2.clip() + thordan()
    if case == 1:
        sh += gx(S, 1)
    elif case == 2:
        sh += gx(S, 1) + gx((35, 65), 2, -3.4)
    elif case == 3:
        sh += gx(S, 1) + gx((67, 66), 2)
    elif case == 4:
        sh += gx(S, 1) + gx((48, 82), 2)
    else:
        sh += gx(NW, 1, -3) + gx(NE, 1) + gx((58, 32), 2)
    return arena(sh, fill="#22303c")


def gigaflare():
    sh = [circle((50, 82), 44, PINK, 0.38)] + sc2.clip() + thordan()
    for c, s in (((50, 82), "1"), ((22, 34), "2"), ((77, 34), "3")):
        sh += [ring(c, 4.2, "#ff8a3a", 0.7, 0.95), text(c, s, 4.0, "#ffffff")]
    sh += [line((54, 28), (70, 62), "#ffffff", 0.4), arrow((68, 65), (29, 66), "#ffffff", 0.4)]
    return arena(sh, roles=roles(MT=(48, 25)))
