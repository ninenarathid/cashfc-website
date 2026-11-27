"""yan-flash.com's DMU boards redrawn in our style, each named after the picture it redraws (.work/dmu/yan/img/NNN.webp,
the NNN-th picture on https://yan-flash.com/ultimate/yosei-ranbu, see yan/map.txt). Positions read off a 5 % grid of the picture."""
from basedmu import *
from scenes_p1 import arrowtile, trapmark

# the standard 8 waymarks as yan-flash's square boards place them
YWM = {"A": [49, 16], "1": [26, 30], "2": [72, 30], "D": [13, 52], "B": [85, 52], "4": [26, 74], "3": [72, 74], "C": [49, 87]}
P5WM = {"A": [49, 17], "1": [27, 30], "2": [73, 30], "D": [14, 53], "B": [86, 53], "4": [27, 76], "3": [73, 76], "C": [49, 89]}
ALL = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]
PUD = "#3a6ad8"          # yan-flash draws the Gravitas puddles / towers blue
PURPLE_HOLE = "#5a2a7a"
CYAN = "#5fd0f0"


def yboard(wm=YWM, boss=(49.5, 51), **kw):
    s = board(2000, 2000, at=(49.5, 51), r=47.5, wm=wm, **kw)
    if boss:
        s["boss"] = [boss[0], boss[1]]
    return s


def cluster(c, names, d=2.6):
    """Several roles stacked on one spot, spread a little so each icon shows."""
    offs = [(0, 0), (d, 0), (-d, 0), (0, d), (0, -d), (d, d), (-d, d), (d, -d)]
    return {n: [R(c[0] + offs[i][0]), R(c[1] + offs[i][1])] for i, n in enumerate(names)}


def tri(pts, num, col="#f2c73a"):
    """A Trine triangle: outline, a light fill, its drop number."""
    a, b, c = pts
    mid = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
    spread = abs((ang(a, b) - ang(a, c) + 180) % 360 - 180)
    sh = [cone(a, ang(a, mid), spread, dist(a, mid) * 1.02, col, 0.35)]
    sh += [line(a, b, col, 0.5, 0.95), line(b, c, col, 0.5, 0.95), line(c, a, col, 0.5, 0.95)]
    cen = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    return sh + [text(cen, str(num), 5.5, "#1b1b1b")]


TRI = {"top": [(71, 14), (50, 3), (50, 26)], "nw": [(29, 39), (24, 13), (6, 31)], "e": [(71, 38), (93, 26), (93, 51)],
       "cen": [(35, 51), (57, 39), (57, 63)], "w": [(29, 64), (7, 52), (7, 77)], "se": [(92, 76), (71, 64), (71, 89)],
       "s": [(44, 76), (26, 93), (50, 98)]}


# ============================================================================ P1
def y014():
    """Trap ②: tanks/healers west, DPS east; the holders (H1, D3) just outside, the others knocked into the puddles."""
    s = yboard()
    sh = aoe((49, 27), 12, 0.6, PUD, "#8fb0ff") + aoe((49, 75), 12, 0.6, PUD, "#8fb0ff")
    sh += trapmark((34.5, 47.5)) + trapmark((62.5, 47.5))
    sh += [arrow((42, 41), (47, 31), "#ffffff", 0.7), arrow((57, 63), (51, 71), "#ffffff", 0.7)]
    s["shapes"] = sh
    s["roles"] = roles(H1=(36.5, 51), MT=(39, 43.5), ST=(42, 42.5), H2=(41.5, 46), D3=(60, 51), D2=(55.5, 58), D4=(58.5, 59.5), D1=(56.5, 61.5))
    return s


def y015():
    """After the knockback: tanks/healers in the north puddle, DPS in the south one; the new holders follow in."""
    s = yboard()
    sh = aoe((49, 27), 12, 0.6, PUD, "#8fb0ff") + aoe((49, 75), 12, 0.6, PUD, "#8fb0ff")
    sh += trapmark((49.5, 26.5)) + trapmark((53, 67.5))
    s["shapes"] = sh
    s["roles"] = roles(H2=(47, 29.5), H1=(49.5, 32), MT=(47.5, 34.5), ST=(50.5, 35), D2=(47, 72), D1=(49, 74.5), D4=(51, 70), D3=(52, 73))
    return s


def y019():
    """Sleep / Confused: melee on the inner spots, ranged on the outer spots, whatever the tether."""
    s = yboard(boss=(49.5, 51))
    tiles = [((18, 15), "down"), ((18, 33), "down"), ((35, 15), "left"), ((35, 33), "up"),
             ((60, 15), "left"), ((80, 15), "left"), ((60, 33), "right"), ((80, 33), "up"),
             ((18, 64), "down"), ((35, 64), "left"), ((18, 83), "right"), ((35, 83), "right"),
             ((60, 64), "down"), ((60, 83), "right"), ((80, 64), "up"), ((80, 83), "up")]
    sh = []
    for c, d in tiles:
        sh += [circle(c, 4.6, "#c0603a", 0.85, 0.01), ring(c, 4.6, "#ffb07a", 0.4, 0.9)] + arrowtile(c, d, 5.0, "#f3e2d0")
    # yan-flash's boxes: red = one player's two same arrows / blue = two different ones
    boxes = [((18, 15), (18, 33), "#e03030"), ((35, 15), (35, 33), "#3050e0"), ((60, 15), (80, 15), "#e03030"), ((60, 33), (80, 33), "#3050e0"),
             ((18, 83), (35, 83), "#e03030"), ((18, 64), (35, 64), "#3050e0"), ((80, 64), (80, 83), "#e03030"), ((60, 64), (60, 83), "#3050e0")]
    for p0, p1, col in boxes:
        x0, x1, y0, y1 = min(p0[0], p1[0]) - 6, max(p0[0], p1[0]) + 6, min(p0[1], p1[1]) - 6, max(p0[1], p1[1]) + 6
        sh += [line((x0, y0), (x1, y0), col, 0.5), line((x1, y0), (x1, y1), col, 0.5), line((x1, y1), (x0, y1), col, 0.5), line((x0, y1), (x0, y0), col, 0.5)]
    s["shapes"] = sh
    s["roles"] = roles(D3=(25, 29), MT=(40, 40), D4=(72, 27), ST=(59, 41), D1=(40, 61), H1=(27, 74), D2=(59, 61), H2=(72, 74))
    return s


def diag_back(d, w=24, c=RED, o=0.5):
    """A '\\' line AoE along y - x = d."""
    return band((-20, -20 + d), (120, 120 + d), w, c, o)


def diag_fwd(cc, w=24, c=RED, o=0.5):
    """A '/' line AoE along x + y = cc."""
    return band((-20, cc + 20), (cc + 20, -20), w, c, o)


def y021():
    """The last riddle as spreads: melee at the number markers, ranged at the edge (two spots each, by the lines)."""
    s = yboard()
    s["shapes"] = [diag_back(-22, 25), diag_back(50, 25), ring((49.5, 51), 15, "#ff8a3a", 0.6, 0.9)]
    s["roles"] = roles(D1=(30, 34), D2=(67, 34), MT=(31, 70), ST=(67, 70), D4=[(37, 6), (60, 6)], D3=[(3, 41), (3, 62)],
                       H2=[(96, 41), (96, 63)], H1=[(37, 96), (60, 96)])
    return s


def y022():
    """The last riddle as stacks: tanks/healers at 3, DPS at 1."""
    s = yboard()
    s["shapes"] = [diag_fwd(80), diag_fwd(150), ring((49.5, 51), 15, "#ff8a3a", 0.6, 0.9)]
    s["roles"] = roles(D1=(32, 32), D2=(29, 30), D3=(28, 34.5), D4=(31.5, 35), MT=(62, 64), ST=(64.5, 66.5), H1=(61, 69), H2=(66, 64))
    return s


# ============================================================================ P2 Forsaken
# panel-local spots (% of one panel) of the eight rounds, read off the 4 x 2 picture
ROUNDS = [
    (dict(MT=(35.6, 62.2), ST=(44, 56.9), D1=(54.8, 57.6), D3=(57.6, 59.5), D2=(61.5, 56.5), D4=(35.7, 72.4), H2=(35.7, 78.5), H1=(64.3, 74)),
     ["Stack→Cone", "Stack→Cone", "Cone→Circle", "Circle→Circle"], {}),
    (dict(ST=(39.1, 39.1), D1=(60.9, 38.7), MT=(35.6, 54.9), D2=(64.4, 54.9), H2=(23.6, 64.4), D3=(76, 64.7), H1=(35.6, 74.2), D4=(64.4, 74.2)),
     ["Cone→Stack", "Cone→Cone", "Circle→Stack", "Circle→Circle"], {}),
    (dict(H1=(35.6, 62), ST=(44, 57), D1=(54.8, 57), D3=(57.6, 59), MT=(61.5, 56.5), D2=(35.6, 72.2), H2=(35.6, 78.5), D4=(64.3, 73.8)),
     ["Stack→Circle", "Stack→Cone", "Cone→Circle", "Circle→Cone"], {}),
    (dict(MT=(38.7, 39.1), D2=(60.9, 38.7), D1=(35.6, 54.9), D3=(64.4, 54.9), H1=(23.4, 64.4), D4=(76, 64.4), H2=(35.6, 74.2), ST=(64.4, 74.2)),
     ["Cone→Stack", "Cone→Cone", "Circle→Stack", "Circle→Circle"], dict(MT="B1", D4="B2", D2="S1", H1="S2")),
    (dict(H2=(35.6, 61.8), MT=(43.7, 56.9), D2=(54.8, 57), D4=(57.6, 59), D1=(61.5, 56.5), D3=(35.6, 72.4), H1=(35.6, 78.5), ST=(64.3, 73.6)),
     ["Stack→Cone", "Stack→Circle", "Cone→Circle", "Circle→Cone"], dict(MT="B1", D4="B2", D2="S1", H1="S2")),
    (dict(MT=(38.7, 39.1), D2=(60.9, 38.7), H2=(35.6, 54.9), ST=(64.4, 54.9), H1=(23.4, 64.4), D4=(76, 64.4), D1=(35.6, 74.2), D3=(64.4, 74.2)),
     ["Cone→Stack", "Cone→Cone", "Circle→Circle", "Circle→Stack"], dict(MT="B1", D4="B2", D2="S1", H1="S2")),
    (dict(H2=(35.6, 61.8), MT=(43.7, 56.9), D4=(54.8, 57), D2=(57.6, 59), D3=(61.5, 56.5), ST=(35.6, 72.2), H1=(35.6, 78.5), D1=(64.3, 73.6)),
     ["Stack", "Stack", "Cone", "Circle"], dict(MT="B1", D4="B2", D2="S1", H1="S2")),
    (dict(ST=(39.1, 39.1), D1=(60.9, 38.7), MT=(35.6, 54.9), D4=(64.4, 54.9), H2=(23.4, 64.4), D3=(76, 64.7), D2=(35.6, 74.2), H1=(64.4, 74.2)),
     ["Cone", "Cone", "Circle", "Circle"], dict(MT="B1", D4="B2", D2="S1", H1="S2")),
]
BAIT = ["Future/Past", "All Things Ending", "Future/Past", "All Things Ending", "Future/Past", "All Things Ending", "Future/Past"]


def y023():
    """Forsaken, all eight rounds (an example where MT·H1 and D2·D4 have the stacks): who is where, and each spot's sign → its next."""
    F.k = 0.5
    sh = []
    pos = {r: [] for r in ALL}
    boss = []
    for i, (spots, labels, tags) in enumerate(ROUNDS):
        x0, y0 = (i % 4) * 25, (i // 4) * 50
        P = lambda p: (x0 + p[0] * 0.25, y0 + p[1] * 0.5)
        S = lambda r: r * 0.25
        sh += [rect((x0 + 12.5, y0 + 25), 24.6, 24.6, 0, FLOOR, 1.0, 0.01)]
        for c in ((35.6, 64.4), (64.4, 64.4)):
            sh += [circle(P(c), S(10.2), PUD, 0.6, 0.01), ring(P(c), S(10.2), "#8fb0ff", 0.25, 0.95)]
        sh += [ring(P((49.8, 49)), S(14.7), "#ff8a3a", 0.3, 0.9)]
        col = "#ff5a4a" if i in (0, 1, 2, 7) else "#5aa0ff"
        for (lx, ly), lab in zip(((19, 46), (81, 46), (19, 88), (81, 88)), labels):
            sh += label(P((lx, ly)), lab, 1.05, col, "#15161a", 0.85)
        sh += [text(P((50, 94)), f"Round {i + 1}", 1.5, "#ffffff")]
        for r in ALL:
            pos[r].append(list(P(spots[r])))
        for r, t in tags.items():
            q = P((spots[r][0] + 4.5, spots[r][1] - 6))
            sh += label(q, t, 0.8, {"B": "#d9b0ff", "S": "#ff9a9a"}[t[0]], "#15161a", 0.9)
        boss.append(list(P((49.8, 46))))
    for i, b in enumerate(BAIT):
        x = ((i + 1) % 4) * 25 if (i + 1) % 4 else None
        if x is None:
            continue
        y0 = ((i + 1) // 4) * 50
        sh += label((x, y0 + 4), b, 0.95, "#ffd27a", "#15161a", 0.9)
    sh += label((12.5, 54), "All Things Ending ←", 0.95, "#ffd27a", "#15161a", 0.9)
    s = {"frame": [3000, 1500], "bg": "#202228", "arena": None, "waymarks": None, "markSize": 3, "iconSize": 1.9, "bossSize": 2.4,
         "boss": [[R(b[0]), R(b[1])] for b in boss], "shapes": sh,
         "roles": {r: [[R(p[0]), R(p[1])] for p in v] for r, v in pos.items()}}
    return s


def y024():
    """Odd rounds in detail: the two towers south of Kefka; red = the four in the towers, cyan = the others."""
    s = board(2000, 2000, at=(50, 50), r=49, wm=None, boss=[50, 51])
    sh = [rect((50, 28), 100, 56, 0, "#4a64c8", 0.3)]
    sh += [cone((35, 74), 195, 80, 32, ORANGE, 0.35)]
    sh += [circle((35, 65), 14, "#e8b020", 0.45, 0.01), circle((61, 56), 13, "#e8b020", 0.4, 0.01), circle((64, 76), 14, "#e8602a", 0.5, 0.01)]
    for c in ((35, 66), (64, 66)):
        sh += [circle(c, 10, PUD, 0.55, 0.01), ring(c, 10, "#8fb0ff", 0.4, 0.95)]
    sh += [ring((50, 51), 15, "#ff8a3a", 0.6, 0.9)]
    for c in ((35, 64), (35, 74), (61, 59), (64, 76)):
        sh += [dot(c, 1.3, "#e0303a"), ring(c, 1.3, CYAN, 0.35, 0.95)]
    for c in ((44, 59), (56, 59), (35, 80)):
        sh += [dot(c, 1.3, CYAN)]
    s["shapes"] = sh
    return s


def y025():
    """Even rounds in detail: red = the four in the towers (top: cone out / bottom: circle out), cyan = the others."""
    s = board(2000, 2000, at=(50, 50), r=49, wm=None, boss=[50, 51])
    sh = [rect((50, 78), 100, 44, 0, "#b8743a", 0.3)]
    for c in ((39, 40), (61, 40), (34, 54), (66, 54)):
        sh += [circle(c, 12, "#e0306a", 0.4, 0.01)]
    for c in ((35, 77), (64, 77)):
        sh += [circle(c, 14, "#e8602a", 0.45, 0.01)]
    for c in ((35, 66), (64, 66)):
        sh += [circle(c, 10, PUD, 0.55, 0.01), ring(c, 10, "#8fb0ff", 0.4, 0.95)]
    sh += [ring((50, 51), 15, "#ff8a3a", 0.6, 0.9)]
    for c in ((35, 57), (64, 57), (35, 76), (64, 76)):
        sh += [dot(c, 1.3, "#e0303a"), ring(c, 1.3, CYAN, 0.35, 0.95)]
    for c in ((39, 41), (60, 41), (24, 66), (76, 66)):
        sh += [dot(c, 1.3, CYAN)]
    s["shapes"] = sh
    return s


# ============================================================================ P2 Trine
def trine(nums, tanks, party):
    s = yboard(boss=None)
    sh = []
    for k, n in nums.items():
        sh += tri(TRI[k], n)
    for c in tanks.values():
        sh += [circle(c, 18, "#9a4ae0", 0.35, 0.01), ring(c, 18, "#b87af0", 0.4, 0.9)]
    s["shapes"] = sh
    s["roles"] = roles(**tanks, **cluster(party, ["H1", "H2", "D1", "D2", "D3", "D4"], 2.2))
    return s


def y034():
    return trine({"top": 3, "nw": 1, "e": 2, "cen": 3, "w": 3, "se": 1, "s": 1}, dict(ST=(18, 15), MT=(33, 32)), (79, 79))


def y035():
    return trine({"top": 1, "nw": 1, "e": 1, "cen": 3, "w": 3, "se": 3, "s": 2}, dict(ST=(28, 10), MT=(39, 34)), (78, 25))


def y036():
    return trine({"top": 3, "nw": 3, "e": 1, "cen": 3, "w": 2, "se": 1, "s": 1}, dict(MT=(46, 73), ST=(42, 96)), (88, 47))


# ============================================================================ P3 TLB3
def tlb(pop="123"):
    wm = dict(YWM)
    for k in pop:
        wm.pop(k)
    s = yboard(wm=wm, boss=None)
    return s


def bosses(s, chaos, exdeath):
    s["boss"] = [[chaos[0], chaos[1]], [exdeath[0], exdeath[1]]]
    return [ring(chaos, 15, "#ff8a3a", 0.7, 0.95), ring(exdeath, 15, "#9a5cf0", 0.7, 0.95),
            *namebox((chaos[0], chaos[1] + 6), "Chaos"), *namebox((exdeath[0], exdeath[1] + 6), "Exdeath")]


def y037():
    """TLB3, fire first: water NW / wind NE / fire SE; Chaos on the wind crystal, Exdeath at 4."""
    s = tlb()
    sh = [circle((20, 78), 48, "#7a3ae0", 0.45, 0.01), circle((62, 40), 26, "#e8402a", 0.35, 0.01)]
    for c, r in (((34, 12), 10), ((5, 31), 9), ((82, 18), 10), ((61, 40), 10)):
        sh += [circle(c, r, "#e8402a", 0.4, 0.01), ring(c, r, "#ffb07a", 0.3, 0.9)]
    sh += crystal((26, 29), "water") + crystal((72, 29), "wind") + crystal((72, 75), "fire")
    sh += bosses(s, (72, 31), (29, 73))
    s["shapes"] = sh
    s["roles"] = roles(D4=(34, 12), D3=(5, 31), D1=(82, 18), MT=(60, 41), H2=(57.5, 39), H1=(62.5, 43))
    return s


def y038():
    """Chaos as far out as it goes, turned exactly 45°, for the Implosion."""
    s = tlb()
    sh = [cone((69, 32), 315, 90, 90, ORANGE, 0.3), cone((69, 32), 135, 90, 90, ORANGE, 0.3)]
    sh += crystal((26, 29), "water") + crystal((72, 29), "wind") + crystal((72, 75), "fire")
    sh += bosses(s, (69, 32), (49, 45))
    s["shapes"] = sh
    s["roles"] = roles(D3=(6, 32), D4=(30, 34), D2=(88, 26), D1=(91, 29), MT=(56, 31), H2=(58.5, 33.5))
    return s


def y039():
    """The water set the same way; Exdeath now on Chaos at the wind crystal."""
    s = tlb()
    sh = [circle((62, 45), 25, CYAN, 0.3, 0.01), circle((26, 26), 22, CYAN, 0.3, 0.01)]
    for c, r in (((34, 13), 10), ((5, 31), 9), ((84, 19), 9), ((61, 42), 10)):
        sh += [circle(c, r, CYAN, 0.4, 0.01), ring(c, r, "#bff0ff", 0.3, 0.9)]
    sh += crystal((26, 29), "water") + crystal((72, 29), "wind") + crystal((72, 75), "fire")
    sh += bosses(s, (70, 31), (74, 29))
    s["shapes"] = sh
    s["roles"] = roles(D4=(34, 13), D3=(5, 31), D2=(83, 19), D1=(85.5, 20.5), ST=(62, 42))
    return s


def y040():
    """MT takes Exdeath to the wind crystal; D3 baits Chaos's Umbra Smash; tank LB3 at about 70 % of the cast."""
    s = tlb("2")
    sh = [circle((19, 82), 45, "#e8c040", 0.3, 0.01)]
    sh += crystal((72, 29), "wind")
    sh += bosses(s, (19, 82), (72, 31))
    sh += label((52, 19), "Tank LB3 at ~70% of the cast", 2.4, "#ffffff", "#15161a", 0.85)
    s["shapes"] = sh
    s["roles"] = roles(D3=(26, 86))
    return s


def y041():
    """Vacuum Wave under the tank LB3: all eight together."""
    s = tlb("2")
    sh = [circle((50, 47), 18, "#4ee03a", 0.6, 0.01)]
    sh += crystal((72, 29), "wind")
    sh += bosses(s, (34, 70), (72, 31))
    s["shapes"] = sh
    s["roles"] = roles(**cluster((50, 45), ALL, 2.3))
    return s


# ============================================================================ P5 Maddening Orchestra
def orch(boss=(49, 52)):
    s = board(2000, 2000, at=(49.5, 52), r=48, wm=P5WM, boss=[boss[0], boss[1]])
    return s


def bluec(c):
    return [circle(c, 12, "#9fd8f0", 0.55, 0.01), ring(c, 12, "#d8f4ff", 0.3, 0.9)]


def redc(c, r=12):
    return [circle(c, r, "#e8402a", 0.5, 0.01), ring(c, r, "#ff9a7a", 0.3, 0.9)]


SPREAD = dict(MT=(41, 30), ST=(59, 30), D3=(27, 44), D4=(72, 43), H1=(27, 62), H2=(73, 62), D1=(40, 76), D2=(59, 76))
SOUTH = dict(H1=(49, 78), D3=(45, 82), D1=(49, 85), D4=(53, 80), D2=(57, 82.5), H2=(53, 86.5))


def y125():
    s = orch()
    sh = [ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)] + redc((41, 30)) + redc((59, 30))
    sh += bluec((25, 44)) + bluec((71, 58)) + bluec((57, 77))
    s["shapes"] = sh
    s["roles"] = roles(**SPREAD)
    return s


def y126():
    s = orch()
    sh = [ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)] + redc((50, 30)) + stack((50, 30), 5.5, 3.2, 1.5)
    sh += bluec((29, 57)) + bluec((70, 46)) + bluec((42, 72))
    s["shapes"] = sh
    s["roles"] = roles(MT=(48.5, 30.5), ST=(51.5, 29.5), D3=(9, 58), H1=(29, 57), D4=(70, 48), D1=(42, 72), D2=(61, 81), H2=(78, 82))
    return s


def flare(edge, holy):
    s = orch()
    sh = [circle((50, 2), 68, "#e8402a", 0.4, 0.01), ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)] + bluec((50, 30))
    s["shapes"] = sh
    s["roles"] = roles(**{edge: (50, 3), holy: (50, 30)}, **SOUTH)
    return s


def y127():
    return flare("ST", "MT")


def autos():
    s = orch()
    sh = [ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)]
    for c in ((50, 30), (35, 63), (64, 63)):
        sh += [circle(c, 16, "#b04ae0", 0.45, 0.01), ring(c, 16, "#d79af0", 0.3, 0.9)]
    s["shapes"] = sh
    s["roles"] = roles(MT=(48.5, 30), ST=(51.5, 30), H1=(33.5, 63), H2=(36.5, 63), D1=(62.5, 61.5), D2=(65.5, 61.5), D3=(62.5, 64.5), D4=(65.5, 64.5))
    return s


def y128():
    return autos()


def y135():
    s = orch()
    sh = [ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)] + redc((41, 30)) + redc((59, 30))
    sh += bluec((71, 42)) + bluec((41, 77)) + bluec((58, 77))
    s["shapes"] = sh
    s["roles"] = roles(**SPREAD)
    return s


def y136():
    s = orch()
    sh = [ring((49, 53), 19, "#ff4a6a", 0.5, 0.9)] + redc((50, 30)) + stack((50, 30), 5.5, 3.2, 1.5)
    sh += bluec((31, 45)) + bluec((32, 62)) + bluec((68, 60))
    s["shapes"] = sh
    s["roles"] = roles(MT=(48.5, 30.5), ST=(51.5, 29.5), D3=(31, 45), H1=(33, 61), H2=(69, 61), D4=(91, 54), D1=(46, 82), D2=(51, 80))
    return s


def y137():
    return flare("MT", "ST")


def y138():
    return autos()


# ============================================================================ P5 Forsaken Null
def null(holes, orange, party, frm, to):
    s = orch(boss=(49, 51))
    s["waymarks"] = {"A": [49, 17], "1": [27, 30], "2": [73, 30], "D": [14, 52], "B": [85, 52], "4": [26, 75], "3": [72, 75], "C": [49, 88]}
    sh = [circle((49, 51), 16, PURPLE_HOLE, 0.6, 0.01)]
    for c in holes:
        sh += [circle(c, 17, PURPLE_HOLE, 0.55, 0.01)]
    sh += [ring((49, 51), 19, "#ff4a6a", 0.6, 0.9)]
    sh += [circle(orange, 16, "#ff7a2a", 0.55, 0.01), ring(orange, 16, "#ffb07a", 0.3, 0.9)]
    sh += stack(party, 5.5, 3.4, 1.6)
    sh += [arrow(frm, to, "#ffffff", 0.9, 0.9)]
    s["shapes"] = sh
    s["roles"] = roles(**cluster(party, ALL, 1.8))
    return s


def y139():
    return null([(79, 82)], (67, 36), (69, 73), (76, 40), (77, 64))


def y140():
    return null([(16, 15), (82, 15), (81, 82)], (68, 63), (30, 74), (66, 81), (38, 80))


def y141():
    return null([(16, 14), (81, 14), (6, 50), (80, 83), (49, 92)], (33, 69), (31, 32), (22, 66), (24, 40))


def y142():
    return null([(16, 14), (82, 14), (6, 50), (93, 50), (16, 85), (49, 92), (81, 84)], (32, 37), (64, 30), (34, 23), (58, 23))
