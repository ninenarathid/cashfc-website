"""P2 Usurper of Frost scenes (fru_mana/02/*): the ice arena."""
from base import *

ICE = "#3c5fb4"


def ice(**kw):
    sh = [ring(C, 37.5, "#16245a", 0.4, 0.8), ring(C, 20, "#16245a", 0.4, 0.8)]
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 2), pol(a, 30), "#9fc0ff", 0.35, 0.35))
    for a in range(0, 360, 45):
        sh.append(line(pol(a, 48.4), pol(a, 50.5), "#555555", 0.7, 0.9))
    s = {"frame": [1, 1], "bg": "#f3f3f3",
         "arena": {"shape": "circle", "at": [50, 50], "r": 48, "fill": ICE, "lines": False, "edge": "#1b2a63"},
         "waymarks": None, "markSize": 6.5, "iconSize": 6.6, "bossSize": 8}
    s["shapes"] = sh + kw.pop("shapes", [])
    s.update(kw)
    return s


def orbit(c, r=13, a0=-140, a1=140, col="#ffffff", wd=1.1):
    """The boss's target ring: an arc with its gap behind."""
    return arc(c, r, a0, a1, col, wd, 0.9, head=False, n=24)


def facing(c, d, r=12, col="#ffffff"):
    """A 'C' ring around c open on the side away from d (the Oracle's Reflection facing d)."""
    return arc(c, r, d + 215, d + 505, col, 1.1, 0.9, head=False, n=24) + [arrow(pol(d, r - 2.6, c), pol(d, r - 0.4, c), col, 0.8)]


def wcirc(c, r=24, lab=None, fill=False):
    out = [ring(c, r, "#e8eeff", 0.4, 0.85)]
    if fill:
        out = [circle(c, r, PINK, 0.42, 0.01)] + out
    if lab:
        out.append(text(lab[0], lab[1], 6.5))
    return out


def puddle(c, r=11.5, col="#f0b84a", o=0.4):
    return [circle(c, r, col, o, 0.01), ring(c, r, "#ffd27a", 0.3, 0.8)]


def star(c, sz=4.5):
    out = [dot(c, sz * 0.55, "#f0a820")]
    for a in (0, 45):
        out.append(rect(c, sz, sz, a, "#f6c440", 0.85))
    out.append(dot(c, sz * 0.35, "#ffe38a"))
    return out


def needle(c, w=5.5, ln=60):
    return [rect(c, w, ln, a, "#57e0e0", 0.28) for a in (0, 45, 90, 135)]


DD0 = {"MT": (50, 30.5), "ST": (50, 72), "H1": (30, 50), "H2": (71.5, 50), "D3": (35, 36.5), "D4": (64, 36.5),
       "D1": (36, 64.5), "D2": (63.5, 64.5)}
NS1 = wcirc((50, 4), 24) + [text((50, 10), "1", 7)] + wcirc((50, 96), 24) + [text((50, 90), "1", 7)]
DIAG1 = wcirc((16, 16), 24) + [text((22, 22), "1", 7)] + wcirc((84, 84), 24) + [text((77, 78), "1", 7)]


def dd00():
    return ice(roles=DD0, shapes=NS1 + orbit(C))


def ddaxe():
    return ice(shapes=[circle(C, 38.5, PINK, 0.42, 0.01), ring(C, 38.5, "#ff9aa6", 0.3, 0.7)])


def ddscythe():
    return ice(shapes=[donut(C, 48, 9.5, PINK, 0.42), ring(C, 9.5, "#ff9aa6", 0.3, 0.7)])


def dd01a():
    r = {"MT": pol(45, 22), "H2": pol(135, 22), "ST": pol(225, 22), "H1": pol(315, 22),
         "D3": pol(0, 19.5), "D4": pol(90, 20), "D2": pol(180, 22), "D1": pol(270, 23.5)}
    sh = NS1 + orbit(C)
    for s in ("MT", "H2", "ST", "H1"):
        sh += puddle(r[s])
    for a in (0, 90, 180, 270):
        sh += arc(C, 26, a - 30, a + 30, "#ffffff", 0.5, 0.85)
    return ice(roles=r, shapes=sh)


def dd01b():
    sh = NS1 + orbit(C)
    for s in ("D3", "D4", "D1", "D2"):
        sh += puddle(DD0[s])
    return ice(roles=DD0, shapes=sh)


def dd01c():
    sh = DIAG1 + orbit(C)
    for s in ("MT", "H1", "H2", "ST"):
        sh += puddle(DD0[s])
    return ice(roles=DD0, shapes=sh)


def dd01d():
    r = {"D3": pol(0, 19.5), "D4": pol(90, 19.5), "D2": pol(180, 22), "D1": pol(270, 20.5),
         "MT": pol(45, 20.5), "H2": pol(135, 21.5), "ST": pol(225, 21.5), "H1": pol(315, 22)}
    sh = DIAG1 + orbit(C)
    for s in ("D3", "D4", "D2", "D1"):
        sh += puddle(r[s])
    for a in (45, 135, 225, 315):
        sh += arc(C, 26, a - 30, a + 30, "#ffffff", 0.5, 0.85)
    return ice(roles=r, shapes=sh)


def dd02a():
    r = {"MT": (50, 8.5), "H1": (8.5, 50), "H2": (92, 50), "ST": (50, 92),
         "D3": (15, 17.5), "D4": (85, 17.5), "D1": (15, 82.5), "D2": (82.5, 83)}
    sh = NS1 + orbit(C)
    for s in ("D3", "D4", "D1", "D2"):
        sh += puddle(r[s])
    return ice(roles=r, shapes=sh)


def dd02b():
    r = {"MT": (50, 46.5), "ST": (50, 53), "H1": (46, 50), "H2": (54, 50),
         "D3": (44.5, 45), "D4": (56, 45), "D1": (44.5, 55), "D2": (56, 55)}
    sh = NS1 + orbit(C)
    for s in ("D3", "D4", "D1", "D2"):
        sh += puddle(r[s], 11.5, "#f0b84a", 0.3)
    return ice(roles=r, shapes=sh)


def kick_cones(r=60):
    return [cone(C, a, 26, r, PINK, 0.3) for a in (0, 90, 180, 270)]


def dd03a():
    r = {"MT": (50, 8.5), "H1": (8.5, 50), "H2": (92, 50), "ST": (50, 92),
         "D3": (17.5, 17.5), "D4": (82.5, 17.5), "D1": (17, 82.5), "D2": (82.5, 83)}
    sh = [circle(C, 38.5, PINK, 0.38, 0.01)] + kick_cones() + NS1 + orbit(C)
    for s, lab in (("D3", (22, 22)), ("D4", (78, 22)), ("D1", (22, 78)), ("D2", (78, 78))):
        sh += puddle(r[s]) + [text(lab, "2", 7)]
    sh += [arrow((50, 14), (50, 36)), arrow((50, 86), (50, 64)), arrow((14, 50), (36, 50)), arrow((86, 50), (64, 50))]
    return ice(roles=r, shapes=sh)


def dd03b():
    r = {"MT": (50, 46.5), "ST": (50, 53), "H1": (46, 50), "H2": (54, 50),
         "D3": (44.5, 45), "D4": (56, 45), "D1": (44.5, 55), "D2": (56, 55)}
    sh = [donut(C, 48, 9.5, PINK, 0.38)] + kick_cones() + NS1 + orbit(C)
    for s in ("D3", "D4", "D1", "D2"):
        sh += puddle(r[s], 11.5, "#f0b84a", 0.3)
    for a in (45, 135, 225, 315):
        sh += [arrow(pol(a, 9), pol(a, 16)), text(pol(a, 38), "2", 7)]
    return ice(roles=r, shapes=sh)


G_MT = ["MT", "H1", "D1", "D3"]
G_ST = ["ST", "H2", "D2", "D4"]


def grp(c, seats, d=2.6):
    out = {}
    for k, s in enumerate(seats):
        out[s] = (c[0] + (k % 2) * d - d / 2, c[1] + (k // 2) * d - d / 2)
    return out


def three_lbl():
    return wcirc((14, 50), 24) + wcirc((86, 50), 24) + [text((9, 50), "3", 7), text((91, 50), "3", 7)]


def dd04(outer):
    stars = [pol(a, 40 if outer else 19.5) for a in (45, 135, 225, 315)]
    r = {}
    r.update(grp((50, 42), G_MT))
    r.update(grp((50, 56.5), G_ST))
    sh = [circle((50, 4), 24, PINK, 0.42, 0.01), circle((50, 96), 24, PINK, 0.42, 0.01)] + NS1 + three_lbl()
    for p in stars:
        sh += star(p)
    for a in (45, 135, 225, 315):
        sh.append(text(pol(a, 38 if not outer else 33), "2", 7))
    sh += facing((75, 50), 270)
    if outer:
        sh += [arrow(pol(a, 32), pol(a, 12)) for a in (45, 135, 225, 315)]
    return ice(roles=r, shapes=sh)


def dd05(outer):
    stars = [pol(a, 40 if outer else 19.5) for a in (45, 135, 225, 315)]
    r = {}
    r.update(grp((50, 7.5), G_MT))
    r.update(grp((50, 92.5), G_ST))
    sh = [circle(pol(a, 44), 24, PINK, 0.42, 0.01) for a in (45, 135, 225, 315)] + three_lbl()
    for p in stars:
        sh += star(p)
    for a in (45, 135, 225, 315):
        sh.append(text(pol(a, 38 if not outer else 33), "2", 7))
    sh += facing((75, 50), 270)
    sh += [arrow((50, 44), (50, 13)), arrow((50, 56), (50, 87)), line((2, 70), (98, 30), RED, 0.7, 0.95, dash=True)]
    return ice(roles=r, shapes=sh)


def dd06(outer):
    stars = [pol(a, 40 if outer else 19.5) for a in (45, 135, 225, 315)]
    r = {}
    r.update(grp((50, 7.5), G_MT))
    r.update(grp((50, 92.5), G_ST))
    sh = [circle((14, 50), 24, PINK, 0.42, 0.01), circle((86, 50), 24, PINK, 0.42, 0.01)] + [text((9, 50), "3", 7), text((91, 50), "3", 7)]
    for p in stars:
        sh += needle(p, 5.5, 75)
    sh += facing((75, 50), 270)
    return ice(roles=r, shapes=sh)


def trail(pts, first):
    out = [circle(first, 14, "#d8d060", 0.42, 0.01)]
    for p in pts:
        out += [circle(p, 14, PINK, 0.3, 0.01)]
    return out


def dd07d():
    r = {}
    r.update(grp((77, 79), G_MT))
    r.update(grp((28, 18), G_ST))
    sh = trail([pol(a, 36) for a in (35, 60, 90, 112)], (50, 11)) + trail([pol(a, 36) for a in (215, 240, 270, 292)], (50, 89))
    sh += arc(C, 38, 2, 130, "#ffffff", 0.6) + arc(C, 38, 182, 312, "#ffffff", 0.6) + facing((50, 26), 180)
    sh += [arrow((52, 48), (46, 12), "#3ae0f0", 0.6), arrow((52, 48), (65, 78), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


def dd07a():
    r = {}
    r.update(grp((88, 50), G_MT))
    r.update(grp((8, 50), G_ST))
    sh = trail([pol(a, 36) for a in (25, 40, 55, 70)], (45, 9)) + trail([pol(a, 36) for a in (205, 220, 235, 250)], (55, 91))
    sh += arc(C, 38, 5, 80, "#ffffff", 0.6) + arc(C, 38, 185, 262, "#ffffff", 0.6) + facing((71, 50), 270)
    sh += [arrow(C, (84, 50), "#3ae0f0", 0.6), arrow(C, (13, 50), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


def dd07b():
    r = {}
    r.update(grp((77, 80), G_MT))
    r.update(grp((21, 21), G_ST))
    sh = trail([pol(a, 36) for a in (40, 65, 90, 115)], (55, 9)) + trail([pol(a, 36) for a in (220, 245, 270, 295)], (45, 91))
    sh += arc(C, 38, 5, 128, "#ffffff", 0.6) + arc(C, 38, 185, 308, "#ffffff", 0.6) + facing((42, 38), 135)
    sh += [arrow(C, (75, 74), "#3ae0f0", 0.6), arrow(C, (26, 25), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


def dd07c():
    r = {}
    r.update(grp((9, 48), G_MT + G_ST, 1.6))
    sh = trail([pol(a, 36) for a in (338, 318, 298, 280)], (50, 9)) + trail([pol(a, 36) for a in (202, 222, 242, 260)], (50, 91))
    sh += arc(C, 38, -5, -78, "#ffffff", 0.6) + arc(C, 38, 185, 258, "#ffffff", 0.6) + facing((67, 36), 225)
    sh += [arrow((12, 48), (79, 26), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


def eye(c):
    return [dot(c, 3.2, "#8a0d12"), dot(c, 1.8, "#ffffff"), ring(c, 8, "#ff5050", 0.8, 0.8)]


def dd07():
    r = grp((9, 50), G_MT + G_ST, 1.6)
    return ice(roles=r, shapes=eye((17, 17)) + facing((75, 50), 270))


def dd08a():
    r = grp((10, 50), G_MT + G_ST, 1.6)
    sh = [cone((73, 50), 90, 90, 40, PINK, 0.45)] + facing((75, 50), 270) + [arrow((75, 50), (13, 50), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


def dd08b():
    r = grp((90, 50), G_MT + G_ST, 1.6)
    sh = [cone((73, 50), 270, 270, 90, PINK, 0.45)] + facing((75, 50), 270) + [arrow((10, 50), (87, 50), "#3ae0f0", 0.6)]
    return ice(roles=r, shapes=sh)


# ---------------------------------------------------------------- Mirror, Mirror
def mirror(c, blue=False):
    col = "#9fd8ff" if blue else "#f08aa0"
    return [rect(c, 7, 11, 0, col, 0.95), ring(c, 5.5, "#7a2030" if not blue else "#2a5a8a", 0.8, 0.9)]


def mm01():
    r = {"MT": (68, 44), "D1": (73, 47), "ST": (68, 56), "D2": (73, 53.5),
         "H1": (5, 41), "D3": (8, 44.5), "D4": (8, 56), "H2": (4, 59.5)}
    sh = mirror((2, 50), True) + mirror((16, 82)) + mirror((84, 82)) + orbit((73, 50), 13, -150, 150, "#e02c2c")
    return ice(roles=r, shapes=sh)


def mm02():
    r = {"MT": (68, 44.5), "D1": (73.5, 47.5), "ST": (68, 56), "D2": (73.5, 54),
         "H1": (5, 41), "D3": (8, 44.5), "D4": (8, 56), "H2": (4, 59.5)}
    sh = [donut((73, 50), 80, 9.5, PINK, 0.35)] + [cone((73, 50), ang((73, 50), r[s]), 20, 70, PINK, 0.25) for s in ("MT", "D1", "ST", "D2")]
    sh += [cone((2, 50), a, 20, 70, PINK, 0.22) for a in (60, 75, 105, 120)]
    sh += mirror((2, 50), True) + mirror((16, 82)) + mirror((84, 82)) + orbit((73, 50), 13, -150, 150, "#e02c2c")
    return ice(roles=r, shapes=sh)


def mm03():
    r = {"D1": (80.5, 74.5), "MT": (88, 75.5), "D2": (78, 77.5), "ST": (77.5, 87),
         "H1": (11.5, 75.5), "D3": (17, 75.5), "D4": (22, 78.5), "H2": (21, 87)}
    b = (75, 62)
    sh = [cone(b, ang(b, r[s]), 22, 70, PINK, 0.28) for s in ("MT", "D1", "ST", "D2")]
    sh += [cone((16, 82), a, 22, 70, PINK, 0.22) for a in (20, 45, 70, 95)]
    sh += [donut((84, 82), 60, 9.5, PINK, 0.2)]
    sh += mirror((16, 84)) + mirror((84, 84)) + orbit(b, 13, -150, 150, "#e02c2c")
    return ice(roles=r, shapes=sh)


def wstack(c, r=14):
    return [circle(c, r, "#ffffff", 0.32, 0.01), ring(c, r, "#ffffff", 0.3, 0.7)]


def mm04b():
    r = {"H1": (38, 58), "D3": (36.5, 57), "H2": (39, 82), "D4": (37.5, 81), "MT": (87.5, 58), "D1": (86, 57),
         "ST": (72.5, 80), "D2": (71, 79)}
    sh = []
    for c in ((37.5, 58), (38.5, 82), (87, 58), (72, 80)):
        sh += wstack(c)
    sh += mirror((16, 85)) + mirror((84, 85)) + orbit((73, 60), 13, -150, 150, "#e02c2c")
    return ice(roles=r, shapes=sh)


def mm04a():
    r = {"D3": (12.5, 59), "H1": (37.5, 59), "D1": (71, 52.5), "MT": (88, 65), "D2": (59, 71), "D4": (21, 81),
         "H2": (39, 81.5), "ST": (75.5, 84.5)}
    sh = []
    for c in r.values():
        sh += wstack(c)
    sh += mirror((16, 85)) + mirror((84, 85)) + orbit((73, 60), 13, -150, 150, "#e02c2c")
    return ice(roles=r, shapes=sh)


# ---------------------------------------------------------------- Light Rampant
LR0 = {"H2": (41, 31.5), "MT": (57, 32), "ST": (67, 42), "D4": (67, 57.5), "D3": (57.5, 67.5), "D2": (42, 67.5),
       "D1": (32, 57.5), "H1": (32, 42)}
TOWERS6 = {"N": pol(0, 40), "NE": pol(60, 40), "SE": pol(120, 40), "S": pol(180, 40), "SW": pol(240, 40), "NW": pol(300, 40)}


def ytower(c, r=8.5, o=0.32):
    out = [circle(c, r, "#e8dc6a", o, 0.01), ring(c, r, "#f4e98a", 0.45, 0.9)]
    for a in (0, 90, 180, 270):
        out += [line(pol(a + 30, r + 1, c), pol(a, r - 1.5, c), "#f0b020", 0.45), line(pol(a - 30, r + 1, c), pol(a, r - 1.5, c), "#f0b020", 0.45)]
    return out


def towers6(o=0.32):
    out = []
    for c in TOWERS6.values():
        out += ytower(c, 8.8, o)
    return out


def mag(c, r=11.5):
    return [circle(c, r, "#e040c0", 0.45, 0.01), ring(c, r, "#ff70e0", 0.35, 0.85)]


def orbmark(c):
    return [dot(c, 1.5, "#ffffff"), ring(c, 1.9, "#ffd27a", 0.4)]


def chain(seq, pos, col="#fff3c0"):
    out = []
    for a, b in zip(seq, seq[1:] + seq[:1]):
        out.append(line(pos[a], pos[b], col, 0.35, 0.9))
    return out


def dim():
    return [circle(C, 48, "#0a0f20", 0.62, 0.01)]


def lr01():
    return ice(boss=C, roles=LR0, shapes=orbit(C, 15, -130, 130, "#e02c2c"))


RING6 = ["H2", "ST", "D4", "D3", "D2", "D1"]


def lr02():
    sh = towers6() + mag(LR0["MT"]) + mag(LR0["H1"]) + chain(RING6, LR0) + orbmark((45, 64)) + orbmark((60, 63))
    return ice(roles=LR0, shapes=sh)


def lr03():
    r = dict(LR0)
    r.update({"MT": (56, 43.5), "H1": (43, 55)})
    sh = towers6(0.15) + dim() + mag(r["MT"]) + mag(r["H1"])
    return ice(roles=r, shapes=sh)


def lr04():
    r = {k: v for k, v in LR0.items() if k in RING6}
    sh = towers6(0.12) + dim() + arc(C, 35, 268, 268 + 350, RED, 0.7, 0.95) + [line((2, 50), (50, 50), "#ffffff", 0.5, 0.9, dash=True)]
    sh += chain(RING6, r) + orbmark((45, 64)) + orbmark((60, 63))
    for s, lab in zip(RING6, ((41, 25), (67, 35.5), (75, 57.5), (57.5, 75), (42, 75), (25, 57.5))):
        sh.append(text(lab, str(RING6.index(s) + 1), 6, "#3cff6a"))
    return ice(roles=r, shapes=sh)


LR5 = {"H2": (13, 25), "ST": (50, 95.5), "D4": (88, 25), "D3": (13, 74), "D2": (50, 4.5), "D1": (88, 74)}


def lr05():
    sh = dim() + towers6(0.3)
    order = ["NW", "S", "NE", "SW", "N", "SE"]
    for k, (s, t) in enumerate(zip(RING6, order)):
        sh.append(text(pol(ang(TOWERS6[t], C), 3, TOWERS6[t]), str(k + 1), 6, "#3cff6a"))
    sh += chain(["H2", "ST", "D4", "D3", "D2", "D1"], LR5)
    return ice(roles=LR5, shapes=sh)


YEL = [(43, 60), (30, 68.5), (18.5, 57), (22, 37), (35, 27)]
ORA = [(57, 43), (68.5, 31), (75, 44), (75, 62.5), (65, 75)]


def numbered(pts, col, start=1):
    out = []
    for k, p in enumerate(pts):
        out += [circle(p, 11.5, col, 0.4, 0.01), text(p, str(k + start), 6.5, "#fff6c8")]
    return out


def lr06():
    r = {"H1": (60, 7), "D2": (62, 10), "H2": (64, 9), "D4": (65, 11),
         "ST": (36, 89), "D3": (38, 91.5), "D1": (41, 92), "MT": (39, 89)}
    sh = numbered(YEL, "#e8e070") + numbered(ORA, "#f0a040") + [line(r["D2"], r["D3"], "#fff3c0", 0.3), line(r["H2"], r["D1"], "#fff3c0", 0.3),
                                                               line(r["D4"], r["ST"], "#fff3c0", 0.3)]
    sh += orbmark((65, 8)) + orbmark((43, 89))
    return ice(roles=r, shapes=sh)


ORB1 = [(50, 9.5), (16, 68), (83, 68)]
ORB2 = [(16, 30), (83, 30), (50, 88)]


def lr07():
    r = {"D2": (80, 19.5), "H1": (79, 18), "H2": (81, 21), "D4": (82, 19),
         "ST": (40, 89), "D3": (42, 90.5), "D1": (41, 92), "MT": (39, 91)}
    sh = numbered(YEL, "#e8e070") + numbered(ORA, "#f0a040")
    for c in ORB1:
        sh += [circle(c, 24, "#ffb080", 0.3, 0.01), dot(c, 2.8, "#ffffff")]
    sh += [circle((81, 19.5), 8, RED, 0.3, 0.01), circle((41, 90.5), 8, RED, 0.3, 0.01)]
    sh += [line((80, 19.5), (41, 90.5), "#fff3c0", 0.3)] + orbmark((83, 17)) + orbmark((43, 88))
    return ice(roles=r, shapes=sh)


def lr08():
    r = {"H1": (79, 18), "H2": (81, 20.5), "MT": (38, 88), "ST": (38, 91.5)}
    sh = numbered(YEL, "#e8e070") + numbered(ORA, "#f0a040")
    for c in ORB1:
        sh += [circle(c, 24, PINK, 0.4, 0.01)]
    for c in ORB2:
        sh += [circle(c, 24, "#ffb080", 0.3, 0.01), dot(c, 2.8, "#ffffff")]
    sh += ytower(C, 8.5) + curve((63, 10), (72, 16), -0.3) + curve((22, 83), (30, 88), 0.3)
    return ice(roles=r, shapes=sh)


def lr09():
    r = {"H2": (56, 8), "MT": (19, 75)}
    sh = numbered(YEL[3:], "#e8e070", 4) + numbered(ORA[3:], "#f0a040", 4)
    for c in ORB2:
        sh += [circle(c, 24, PINK, 0.42, 0.01)]
    sh += ytower(C, 8.5)
    return ice(roles=r, shapes=sh)


CLOCK = {"MT": (50, 31), "D3": (36, 36), "D4": (64, 37.5), "H1": (32, 50)}


def lr10():
    r = dict(CLOCK)
    r.update({"D1": (48, 52), "D2": (48, 48.5), "ST": (46.5, 52), "H2": (52.5, 48.5)})
    return ice(roles=r, shapes=ytower(C, 8.5))


def lr11():
    r = {"MT": (31, 31.5), "D3": (32.5, 33), "H2": (65.5, 33.5), "D4": (67, 33), "H1": (34, 66.5), "D1": (32.5, 66),
         "ST": (64.5, 69.5), "D2": (66, 68)}
    sh = []
    for c in ((31.5, 32.5), (66, 33.5), (33, 66.5), (65, 69)):
        sh += [circle(c, 14, "#ff9aa6", 0.32, 0.01)]
    sh += orbit(C, 15, -130, 130, "#e02c2c")
    return ice(boss=C, roles=r, shapes=sh)


LR12 = {"MT": (48, 29.5), "D4": (63, 36.5), "H2": (68, 49), "D2": (63, 63), "ST": (50, 67), "D1": (37, 62),
        "H1": (32, 50), "D3": (36, 35)}


def lr12():
    sh = [cone(C, ang(C, p), 18, 75, PINK, 0.3) for p in LR12.values()] + orbit(C, 15, -130, 130, "#e02c2c")
    return ice(boss=C, roles=LR12, shapes=sh)


def lrfaq():
    r = dict(LR0)
    sh = towers6() + mag(r["MT"]) + mag(r["ST"])
    for a, b in (("H1", "H2"), ("H2", "D1"), ("D1", "D2"), ("D2", "D3"), ("D3", "D4"), ("D4", "H1")):
        sh.append(line(r[a], r[b], "#fff3c0", 0.35, 0.9))
    sh += curve((30, 38), (39, 28), 0.5) + curve((38, 29), (31, 39), 0.5)
    return ice(roles=r, shapes=sh)


# ---------------------------------------------------------------- crystals
LIGHT = [(50, 16), (83.5, 50), (50, 83.5), (16.5, 50)]
DARKC = [(36, 36), (64, 36), (36, 64), (64, 64)]


def crystals():
    out = []
    for c in LIGHT:
        out += [dot(c, 2.4, "#f2f6ff"), ring(c, 4.2, "#e8202a", 0.7, 0.95)]
    for c in DARKC:
        out += [dot(c, 2.4, "#151525"), ring(c, 4.2, "#e8202a", 0.7, 0.95)]
    return out


def cr01():
    r = {"MT": (50, 36.5), "H2": (61, 40), "D2": (64, 50), "D4": (60.5, 59), "ST": (50, 64), "H1": (40, 59.5),
         "D1": (36.5, 50), "D3": (40, 40)}
    return ice(boss=C, roles=r, shapes=orbit(C, 14, -130, 130, "#e02c2c"))


CR2 = {"MT": (50, 26), "ST": (50, 74), "D1": (26, 50), "D2": (73.5, 50), "D3": (29.5, 29.5), "H2": (71, 29),
       "H1": (29.5, 70.5), "D4": (71, 70.5)}
CR3 = {"MT": (58.5, 9.5), "D3": (32, 27), "H2": (73.5, 32), "D1": (9, 41), "D2": (91, 58), "H1": (25.5, 67.5),
       "D4": (68, 72), "ST": (41, 92)}
CR4 = {"MT": (41, 8.5), "H2": (66, 30), "D2": (91.5, 42), "D4": (71.5, 68), "ST": (57, 92), "H1": (34, 73),
       "D1": (7.5, 57.5), "D3": (25.5, 35.5)}


def baits(r, light_on=True):
    out = []
    if light_on:
        for s in ("MT", "D2", "ST", "D1"):
            out += [circle(r[s], 14, PINK, 0.32, 0.01)]
    for c, s in zip(DARKC, ("D3", "H2", "H1", "D4")):
        out.append(cone(c, ang(c, r[s]), 22, 70, PINK, 0.28))
    return out


def cr02():
    return ice(roles=CR2, shapes=crystals())


def cr03():
    sh = baits(CR3) + crystals()
    sh += [arrow((56, 9), (45, 10)), arrow((91, 50), (91, 40)), arrow((43, 92), (55, 92)), arrow((9, 46), (9, 57)),
           arrow((32, 32), (30, 36)), arrow((70, 28), (73, 25)), arrow((26, 72), (31, 72)), arrow((70, 67), (72, 64))]
    return ice(roles=CR3, shapes=sh)


def cr04():
    sh = baits(CR4) + crystals()
    sh += [arrow((45, 8), (57, 9)), arrow((91, 46), (91, 58)), arrow((54, 92), (42, 92)), arrow((8, 54), (8, 42)),
           arrow((25, 31), (28, 27)), arrow((70, 30), (73, 34)), arrow((30, 75), (27, 69)), arrow((70, 72), (66, 74))]
    return ice(roles=CR4, shapes=sh)


def cr05():
    sh = baits(CR3) + crystals()
    for c, s in zip(LIGHT, ("MT", "D2", "ST", "D1")):
        sh += tether(c, CR3[s], YELLOW, 0.4)
    return ice(roles=CR3, shapes=sh)


def cyan(c, r=8):
    return [circle(c, r, "#7ee8f0", 0.35, 0.01), ring(c, r, "#c8f8ff", 0.3, 0.8)]


def cr06():
    sh = baits(CR4) + crystals()
    for s in ("MT", "D2", "ST", "D1"):
        sh += cyan(CR4[s])
    sh += [arrow((45, 8), (57, 9)), arrow((91, 46), (91, 58)), arrow((54, 92), (42, 92)), arrow((8, 54), (8, 42))]
    return ice(roles=CR4, shapes=sh)


def cr07():
    r = {"MT": (42, 22), "D3": (30, 28), "H2": (71, 29.5), "D2": (75, 44.5), "D1": (21, 59), "H1": (26, 67.5),
         "D4": (68, 69), "ST": (57, 75)}
    sh = baits(r, False) + crystals()
    for c in LIGHT:
        for a in (45, 135, 225, 315):
            sh += cyan(pol(a, 8.5, c))
    sh += arc((50, 16), 9, 60, 300, "#ffffff", 0.5) + arc((83.5, 50), 9, 150, 390, "#ffffff", 0.5)
    sh += arc((50, 83.5), 9, 240, 480, "#ffffff", 0.5) + arc((16.5, 50), 9, -30, 210, "#ffffff", 0.5)
    return ice(roles=r, shapes=sh)
