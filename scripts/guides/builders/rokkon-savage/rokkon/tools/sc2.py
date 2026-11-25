"""Boss 2 (Gorai the Uncaged) scenes, redrawn from game8's 440x440 pictures. Helpers from sc.py."""
from sc import *

SQ2 = {"shape": "square", "at": [50, 50], "w": 87, "h": 87, "fill": "#6b3820", "lines": False, "edge": "#2a1408"}
T0, CELL = 6.5, 87 / 8
REDT, BLUT = "#e8742c", "#3f82c4"
REDC, BLUC, TEAL = "#d4552e", "#3d86c6", "#2a9d8f"


def tiles(o=0.18):
    out = []
    for k in range(1, 8):
        v = T0 + k * CELL
        out += [line((v, T0), (v, 100 - T0), "#2a1408", 0.2, o), line((T0, v), (100 - T0, v), "#2a1408", 0.2, o)]
    return out


def bossdisc(c):
    return [circ((49.5, 50.5), 7.2, 0.85, c), ring((49.5, 50.5), 7.2, "#1d2a5a", 0.5)]


def rock(p, r=10):
    return circ(p, r, 0.42)


ROCKS_SPLIT = [(27, 17), (49.5, 29.5), (82, 40.5), (17, 60.5), (49.5, 71), (71, 82)]
ROCKS_GROW = [(39, 15), (82.5, 29.5), (29, 50), (71, 50.5), (17, 72), (60.5, 82.5)]


def fire(xs, ys, w=10.5, o=0.42):
    return [band((x, 50), 0, w, 87, o) for x in xs] + [band((50, y), 90, w, 87, o) for y in ys]


def bb_split_tell():     # b2-06
    sh = tiles() + fire((39.3, 60.7), (40.3, 61.7)) + [rock(p) for p in ROCKS_SPLIT] + bossdisc(BLUT)
    return scene(SQ2, sh, party(T=(80.5, 38.4), H=(85.0, 41.3), D1=(16.4, 58.5), D2=(18.6, 63.2)), boss=[49.5, 50.5], bossSize=11)


def bb_split_go():       # b2-07: rocks turn into donuts, each fire line splits one lane either way
    sh = tiles() + fire((28.8, 49.8, 50.2, 71.2), (29.8, 50.8, 51.2, 72.2)) + [donut(p, 33, 10, 0.38) for p in ROCKS_SPLIT]
    sh += [ring(p, 10, "#ffe08a", 0.35, 0.8) for p in ROCKS_SPLIT] + bossdisc(BLUT)
    return scene(SQ2, sh, party(T=(85.5, 39.5), H=(83.5, 36.0), D1=(11.5, 64.5), D2=(13.0, 67.5)), boss=[49.5, 50.5], bossSize=11)


def bb_grow_tell():      # b2-08
    sh = tiles() + fire((39.3, 60.7), (40.3, 61.7)) + [rock(p) for p in ROCKS_GROW] + bossdisc("#e0559a")
    return scene(SQ2, sh, party(T=(13.5, 16.9), H=(85.3, 82.8), D1=(17.0, 22.0), D2=(87.0, 85.5)), boss=[49.5, 50.5], bossSize=11)


def bb_grow_go():        # b2-09: rocks grow, fire lines widen
    sh = tiles() + fire((39.0, 60.8), (39.6, 61.2), w=21.6) + [rock(p, 21.5) for p in ROCKS_GROW] + bossdisc("#e0559a")
    return scene(SQ2, sh, party(T=(16.3, 15.9), H=(85.9, 80.1), D1=(13.5, 20.5), D2=(88.0, 84.5)), boss=[49.5, 50.5], bossSize=11)


def hammer_orbs():       # b2-10 (a screenshot): six levin orbs; the inner four in a gentle curve, the hammer on the far corner's orb
    orbs = [(16, 16), (35, 38), (45, 47), (55, 53), (65, 62), (84, 84)]
    sh = tiles() + [circ(p, 5.5, 0.85, "#5aa8ff") for p in orbs] + [ring(p, 5.5, "#cfe6ff", 0.4) for p in orbs]
    sh += [ring((84, 84), 8.5, GOLD, 0.7), arrow((70, 70), (79, 79), GOLD, 0.8)]
    return scene(SQ2, sh, boss=[50, 50], bossSize=11)


# --- Rousing Reincarnation: players drawn as their debuff strips (number + colour)
def strip(at, cells, cw=3.0, ch=3.6):
    """cells: [(colour, label)], drawn side by side, centred on `at`; label 'P' = the Malformed Prayer cell."""
    n = len(cells)
    x0 = at[0] - cw * n / 2 + cw / 2
    out = []
    for k, (c, lab) in enumerate(cells):
        x = x0 + k * cw
        out.append(rect((x, at[1]), cw - 0.25, ch, c, 1))
        if lab == "P":
            out.append(ring((x, at[1]), ch * 0.26, "white", 0.4, 0.95))
        else:
            out.append(text((x, at[1] + 0.15), lab, ch * 0.62, "white"))
    return out


def rr(at, a, b, ca, cb):
    col = {"r": REDC, "b": BLUC}
    return strip(at, [(col[ca], a), (col[cb], b)], 5.4, 5.6)


def tower(p, c, r=7, num=None):
    out = [circ(p, r, 0.85, REDT if c == "r" else BLUT), ring(p, r, "#8a2a10" if c == "r" else "#1d3a78", 0.5)]
    if num:
        out += [ring(p, 3.2, "#fff3a0", 0.35, 0.95), text(p, num, 3.0, "#fff3a0")]
    return out


TETHER = "#ff5a1f"
BOSS2 = [50, 51.5]


def rr_gather():         # b2-12
    sh = tiles() + rr((47.5, 57), "II", "IV", "r", "b") + rr((51.5, 62.5), "II", "IV", "b", "r") + \
        rr((46, 72.5), "I", "III", "r", "b") + rr((51.5, 79), "I", "III", "b", "r")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


def rr_1():              # b2-13
    sh = tiles() + tower((32, 35), "r") + tower((71, 50.5), "b") + [line(BOSS2, (31, 53), TETHER, 0.6), line(BOSS2, (66, 63.5), TETHER, 0.6)]
    sh += rr((32, 35.5), "I", "III", "r", "b") + rr((71.5, 51), "I", "III", "b", "r") + rr((30, 53), "II", "IV", "r", "b") + rr((66, 63.5), "II", "IV", "b", "r")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


def rr_2():              # b2-14
    sh = tiles() + [cone(BOSS2, 266, 37), cone(BOSS2, 131, 39)]
    sh += tower((32.5, 34.5), "r") + tower((71.5, 50.5), "b") + tower((27.5, 51), "b") + tower((60.5, 64.5), "r")
    sh += [line(BOSS2, (31, 53), TETHER, 0.6), line(BOSS2, (64.5, 64.5), TETHER, 0.6)]
    sh += rr((32, 35.5), "I", "III", "r", "b") + rr((71.5, 51), "I", "III", "b", "r") + rr((30, 53), "II", "IV", "r", "b") + rr((65, 64.5), "II", "IV", "b", "r")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


def rr_3():              # b2-15
    sh = tiles() + [cone(BOSS2, 60, 37), cone(BOSS2, 218, 43)]
    sh += tower((46, 33.5), "b") + tower((62, 38.5), "r") + tower((28, 51), "b") + tower((60.5, 64.5), "r")
    sh += [line(BOSS2, (61.5, 45), TETHER, 0.6), line(BOSS2, (41, 65), TETHER, 0.6)]
    sh += rr((63, 45), "I", "III", "b", "r") + rr((41.5, 65), "I", "III", "r", "b") + rr((28, 51.5), "II", "IV", "b", "r") + rr((60.5, 65), "II", "IV", "r", "b")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


def rr_4():              # b2-16
    sh = tiles() + [cone(BOSS2, 291, 39), cone(BOSS2, 93, 38)]
    sh += tower((45, 33), "b") + tower((61.5, 37.5), "r") + tower((35, 61), "r") + tower((52, 65), "b")
    sh += [line(BOSS2, (30, 43.5), TETHER, 0.6), line(BOSS2, (65, 52.5), TETHER, 0.6)]
    sh += rr((45, 33.5), "I", "III", "r", "b") + rr((61.5, 38), "I", "III", "b", "r") + rr((29, 43.5), "II", "IV", "b", "r") + rr((66, 53), "II", "IV", "r", "b")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


def rr_5():              # b2-17
    sh = tiles() + [cone(BOSS2, 291, 39), cone(BOSS2, 93, 38)]
    sh += tower((35, 61), "r") + tower((52, 65), "b")
    sh += [line(BOSS2, (30, 43.5), TETHER, 0.6), line(BOSS2, (65, 52.5), TETHER, 0.6)]
    sh += rr((29, 43.5), "I", "III", "r", "b") + rr((66, 53), "I", "III", "b", "r") + rr((35, 61.5), "II", "IV", "b", "r") + rr((52, 65.5), "II", "IV", "r", "b")
    return scene(SQ2, sh, boss=BOSS2, bossSize=12)


# --- Seal of Scurrying Sparks 2 + Cloud to Ground (exaflares)
MAG = "#b5307f"


def chev(p, d, n=3, c="white", sz=4.2, wd=1.3):
    out = []
    for k in range(n):
        q = off(p, d, (k - (n - 1) / 2) * 2.4)
        a, b = off(q, d + 135, sz), off(q, d - 135, sz)
        out += [line(a, q, c, wd, 0.95), line(q, b, c, wd, 0.95)]
    return out


EXA = [((18, 7), 180), ((60, 7), 180), ((40, 95), 0), ((82, 95), 0), ((50, 39.5), 0), ((39.5, 50), 270), ((60.5, 50), 90), ((50, 60.5), 180)]


def exa_start():
    sh = []
    for p, d in EXA:
        sh += [circ(p, 11.5, 0.5)] + chev(p, d)
    return sh


def chevs_only():
    sh = []
    for p, d in EXA:
        sh += chev(p, d)
    return sh


def ex_tell():           # b2-20
    return scene(SQ2, tiles() + exa_start())


def ex_spread_wait():    # b2-21
    return scene(SQ2, tiles() + exa_start(), party(T=(34.3, 34.2), H=(64.4, 88.4), D1=(34.0, 12.2), D2=(64.7, 67.8)))


def mags(ps, o=0.55):
    return [circ(p, 11.5, o, MAG) for p in ps]


def ex_spread_hit():     # b2-22
    trail = [(13, 33), (10, 52), (28, 62), (40, 72), (52, 84), (62, 37), (75, 32), (89, 50), (86, 64), (56, 13), (42, 26)]
    sh = tiles() + mags(trail, 0.45) + [circ(p, 15.5, 0.45) for p in ((34.0, 12.2), (34.3, 34.2), (64.7, 67.8), (66.3, 89.6))] + chevs_only()
    return scene(SQ2, sh, party(T=(34.3, 34.2), H=(66.3, 89.6), D1=(34.0, 12.2), D2=(64.7, 67.8)), boss=[50, 50], bossSize=10)


def ex_spread_pairs():   # b2-23
    sh = tiles() + mags([(40, 50), (82, 50), (18, 50), (61, 50), (40, 27), (82, 27), (18, 73), (61, 73)], 0.15) + mags([(40, 38), (82, 38), (18, 62), (61, 62)])
    return scene(SQ2, sh, party(T=(16.4, 32.8), H=(82.8, 75.7), D1=(14.0, 29.5), D2=(80.5, 74.0)), boss=[50, 50], bossSize=10)


def ex_stack_wait():     # b2-24
    return scene(SQ2, tiles() + exa_start(), party(T=(34.0, 29.5), H=(64.6, 71.6), D1=(33.9, 34.9), D2=(64.7, 67.5)))


def ex_stack_hit():      # b2-25
    trail = [(18, 33), (13, 51), (27, 62), (40, 67), (51, 86), (62, 36), (76, 31), (89, 50), (83, 66), (45, 10), (56, 12)]
    sh = tiles() + mags(trail, 0.45) + chevs_only()
    return scene(SQ2, sh, party(T=(34.3, 34.4), H=(66.5, 69.4), D1=(32.5, 31.5), D2=(64.0, 67.0)), boss=[50, 50], bossSize=10)


def ex_stack_spread():   # b2-26
    pl = {"T": (21.8, 39.9), "H": (85.6, 89.0), "D1": (17.9, 11.4), "D2": (78.6, 62.1)}
    sh = tiles() + mags([(40, 38), (82, 38), (18, 62), (61, 62)]) + [circ(p, 16, 0.45) for p in pl.values()]
    return scene(SQ2, sh, party(T=pl["T"], H=pl["H"], D1=pl["D1"], D2=pl["D2"]), boss=[50, 50], bossSize=10)


# --- Fighting Spirits (dice), Spell's line: D west, B east, 4 2 1 3 along the south
WM2 = {"D": [18, 51], "B": [82, 51], "4": [7, 76.5], "2": [32, 76.5], "1": [67.5, 76.5], "3": [93, 76.5]}
WMC = {"A": "#ff5f7a", "B": "#f4e66a", "C": "#7ab8ff", "D": "#d58ae8", "1": "#ff5f7a", "2": "#f4e66a", "3": "#7ab8ff", "4": "#d58ae8"}


def wm_rings(wm=None, r=3.3):
    out = []
    for k, p in (wm or WM2).items():
        out += [circ(p, r, 0.85, "#1b1c20"), ring(p, r, WMC[k], 0.5, 0.95)]
    return out
PD, BD = "#f2b8d0", "#c8dcf5"


def die(p, n, c):
    """The dice number over a player's head: n small dots."""
    pos = {1: [(0, 0)], 2: [(-1, 0), (1, 0)], 3: [(0, -1), (-1, 0.8), (1, 0.8)], 4: [(-1, -0.9), (1, -0.9), (-1, 0.9), (1, 0.9)]}[n]
    return [dot((p[0] + dx * 1.55, p[1] + dy * 1.55), 1.25, c, 0.95) for dx, dy in pos]


def cross(p, w=43):
    return [band((p[0], 50), 0, w, 87, 0.4), band((50, p[1]), 90, w, 87, 0.4)]


def dice_get():          # b2-27
    sh = tiles() + wm_rings() + die((34, 50), 3, BD) + die((35.5, 62), 2, PD) + die((48, 60.5), 1, BD) + die((55, 49.5), 4, PD)
    return scene(SQ2, sh, party(T=(48.1, 64.2), H=(58.6, 61.5), D1=(34.0, 55.0), D2=(36.0, 66.5)), waymarks=WM2, markSize=6)


def dice_1wait():        # b2-28
    sh = tiles() + wm_rings() + die((67.5, 47), 1, BD) + die((8.5, 72), 4, PD) + die((32.5, 72.5), 2, PD) + die((92, 72), 3, BD)
    return scene(SQ2, sh, party(T=(67.5, 51), H=(9.5, 77.5), D1=(92.5, 77.5), D2=(32.5, 77.5)), waymarks=WM2, markSize=6)


def dice_1hit():         # b2-29
    sh = tiles() + wm_rings() + cross((67.5, 51)) + die((67.5, 47), 1, BD) + die((8.5, 72), 4, PD) + die((32.5, 72.5), 2, PD) + die((92, 72), 3, BD)
    return scene(SQ2, sh, party(T=(67.5, 51), H=(9.5, 77.5), D1=(92.5, 77.5), D2=(32.5, 77.5)), waymarks=WM2, markSize=6)


def dice_2():            # b2-30
    sh = tiles() + wm_rings() + cross((32, 51.5), 45) + die((32, 47.5), 2, PD) + die((8.5, 72), 4, PD) + die((67.5, 73), 1, BD) + die((92, 72), 3, BD)
    return scene(SQ2, sh, party(T=(67.5, 77), H=(7.5, 77.5), D1=(92.5, 77.5), D2=(32, 51.5)), waymarks=WM2, markSize=6)


def dice_3():            # b2-31
    sh = tiles() + wm_rings() + cross((92.5, 50), 45) + die((92.5, 46), 3, BD) + die((8.5, 72), 4, PD) + die((32.5, 72.5), 2, PD) + die((67.5, 73), 1, BD)
    return scene(SQ2, sh, party(T=(67.5, 77), H=(7.5, 77.5), D1=(92.5, 50.5), D2=(32.5, 77.5)), waymarks=WM2, markSize=6)


def dice_4():            # b2-32
    sh = tiles() + wm_rings() + cross((9, 50), 45) + die((9, 46), 4, PD) + die((32.5, 72.5), 2, PD) + die((67.5, 73), 1, BD) + die((92.5, 72), 3, BD)
    return scene(SQ2, sh, party(T=(67.5, 77), H=(9, 50.5), D1=(92.5, 77.5), D2=(32.5, 77.5)), waymarks=WM2, markSize=6)


def dice_last():         # b2-33
    sh = tiles() + wm_rings() + cross((50, 50), 43) + [arrow((32, 77), (26, 77), "white", 0.9), arrow((69, 77), (75, 77), "white", 0.9)]
    sh += die((8.5, 72), 4, PD) + die((26, 73), 2, PD) + die((76, 73), 1, BD) + die((93, 72), 3, BD)
    return scene(SQ2, sh, party(T=(76, 77), H=(7.5, 77), D1=(93.5, 77), D2=(26, 77)), boss=[48, 46], bossSize=13, waymarks=WM2, markSize=6)


def waymarks():          # the setup step: Spell's markers as game8 draws them for the dice
    return scene(SQ2, tiles() + wm_rings(r=3.8), waymarks=WM2, markSize=7)


# --- Malformed Reincarnation (Posiume's way): a player = Malformed Prayer colour + the colours of I, II, III
def mr(at, prayer, cols):
    col = {"r": REDC, "b": BLUC}
    cells = [(REDC if prayer == "r" else TEAL, "P")] + [(col[c], n) for c, n in zip(cols, ("I", "II", "III"))]
    return strip(at, cells, 4.1, 4.6)


def mtowers(*ts):
    out = []
    for p, c, n in ts:
        out += tower(p, c, 8, n)
    return out


T1 = [((39, 40.5), "r", "1"), ((60.5, 40.5), "r", "1"), ((39, 61.5), "b", "1"), ((60.5, 61.5), "b", "1")]
T2 = [((17.5, 17.5), "r", "2"), ((82.5, 17.5), "r", "2"), ((17.5, 82.5), "b", "2"), ((82.5, 82.5), "b", "2")]
T3 = [((39, 20.5), "b", "3"), ((60.5, 20.5), "r", "3"), ((38.5, 80.5), "r", "3"), ((60.5, 80.5), "b", "3")]


def mr_rule():           # b2-38 (the same-colour pattern, the whole route)
    sh = tiles() + mtowers(((17.5, 17.5), "r", None), ((82.5, 17.5), "r", None), ((39, 40.5), "r", None), ((60.5, 40.5), "r", None),
                           ((39, 61.5), "b", None), ((60.5, 61.5), "b", None), ((17.5, 82.5), "b", None), ((82.5, 82.5), "b", None))
    sh += [ring((39, 21), 7, "#4da3ff", 0.6), ring((60.5, 21), 7, "#ff4d4d", 0.6), ring((39, 80), 7, "#ff4d4d", 0.6), ring((60.5, 80), 7, "#4da3ff", 0.6)]
    sh += [text((39, 21.5), "B", 3.6, "#4da3ff"), text((60.5, 21.5), "R", 3.6, "#ff4d4d"), text((39, 80.5), "R", 3.6, "#ff4d4d"), text((60.5, 80.5), "B", 3.6, "#4da3ff")]
    sh += [arrow((39, 27), (39, 58), "#4da3ff", 0.9), arrow((60.5, 27), (60.5, 58), "#4da3ff", 0.9), arrow((41, 73), (41, 45), "#ff4d4d", 0.9), arrow((58.5, 73), (58.5, 45), "#ff4d4d", 0.9),
           arrow((35, 36), (21, 22), "#ff4d4d", 0.9), arrow((64.5, 36), (78.5, 22), "#ff4d4d", 0.9), arrow((35, 66), (21, 78), "#4da3ff", 0.9), arrow((64.5, 66), (78.5, 78), "#4da3ff", 0.9),
           arrow((25, 18), (32, 20), "#ff4d4d", 0.9), arrow((75, 18), (67.5, 20), "#ff4d4d", 0.9), arrow((25, 82), (32, 80.5), "#4da3ff", 0.9), arrow((75, 82), (67.5, 80.5), "#4da3ff", 0.9)]
    sh += mr((39, 14), "b", "bbr") + mr((60.5, 14), "r", "bbb") + mr((39, 73.5), "r", "rrb") + mr((60.5, 73.5), "b", "rrr")
    return scene(SQ2, sh)


def mr_1():              # b2-39
    sh = tiles() + mtowers(*T1) + mr((50, 45.5), "r", "bbb") + mr((32, 51.5), "b", "rrr") + mr((55, 56.5), "r", "rrb") + mr((42, 72.5), "b", "bbr")
    return scene(SQ2, sh)


def mr_2():              # b2-40
    sh = tiles() + mtowers(*T1, *T2) + mr((32, 21.5), "b", "bbr") + mr((53.5, 21.5), "r", "bbb") + mr((32, 79), "r", "rrb") + mr((53.5, 79), "b", "rrr")
    return scene(SQ2, sh)


def mr_3():              # b2-41
    sh = tiles() + mtowers(*T1, *T2, *T3) + mr((39, 26.5), "b", "bbr") + mr((60, 26.5), "r", "bbb") + mr((39, 74.5), "r", "rrb") + mr((60, 74.5), "b", "rrr")
    return scene(SQ2, sh)


def mr_4():              # b2-42
    sh = tiles() + mtowers(*T1, *T2, *T3)
    sh += [arrow((36, 75), (36, 42), "white", 0.8), arrow((63, 75), (63, 42), "white", 0.8), arrow((41, 27), (41, 60), "#ff4d4d", 0.8), arrow((57, 27), (57, 60), "#ff4d4d", 0.8)]
    sh += mr((37, 37), "r", "rrb") + mr((59, 36), "b", "rrr") + mr((37, 66), "b", "bbr") + mr((60, 66.5), "r", "bbb")
    return scene(SQ2, sh)


def mesh(kind, o=0.38):
    """The criss-cross AoE on the 8 x 8 tiles: 'a' = the 2nd, 4th.. rows and columns lit, 'b' = the 1st, 3rd..; 'full' = everything."""
    if kind == "full":
        return [rect((50, 50), 87, 87, ORANGE, o)] + tiles(0.5)
    out = []
    for k in ((1, 3, 5, 7) if kind == "a" else (0, 2, 4, 6)):
        c = T0 + (k + 0.5) * CELL
        out += [rect((c, 50), CELL, 87, ORANGE, o), rect((50, c), 87, CELL, ORANGE, o)]
    return out + tiles(0.4)


def mr_5():              # b2-43
    sh = tiles() + mesh("b") + mtowers(*T2, *T3)
    sh += [arrow((29, 34), (22, 26), "white", 0.8), arrow((70.5, 34), (77.5, 26), "white", 0.8), arrow((29, 66), (22, 74), "#ff4d4d", 0.8), arrow((70.5, 66), (77.5, 74), "#ff4d4d", 0.8)]
    sh += mr((18, 21.5), "r", "rrb") + mr((82, 21.5), "b", "rrr") + mr((18, 78), "b", "bbr") + mr((82, 78), "r", "bbb")
    return scene(SQ2, sh)


def mr_6():              # b2-44
    sh = tiles() + mesh("full") + mtowers(*T3)
    sh += [arrow((21, 19), (32, 22), "white", 0.8), arrow((78, 23), (69, 23), "white", 0.8), arrow((19, 86), (31, 86), "#ff4d4d", 0.8), arrow((78, 86), (69, 86), "#ff4d4d", 0.8)]
    sh += mr((40, 23.5), "r", "rrb") + mr((61, 23.5), "b", "rrr") + mr((39.5, 86.5), "b", "bbr") + mr((61, 87), "r", "bbb")
    return scene(SQ2, sh)


def mr_7():              # b2-45
    sh = tiles() + mesh("a") + mtowers(((39, 20.5), "b", None), ((60.5, 20.5), "r", None), ((38.5, 80.5), "r", "3"), ((60.5, 80.5), "b", "3"))
    sh += mr((40, 24), "r", "rrb") + mr((61, 24), "b", "rrr") + mr((39.5, 85.5), "b", "bbr") + mr((61, 85.5), "r", "bbb")
    return scene(SQ2, sh)


def mr_8():              # b2-46
    sh = tiles() + mesh("a") + mr((32, 34), "r", "rrb") + mr((56, 34), "b", "rrr") + mr((32, 79.5), "b", "bbr") + mr((57, 80), "r", "bbb")
    return scene(SQ2, sh)
