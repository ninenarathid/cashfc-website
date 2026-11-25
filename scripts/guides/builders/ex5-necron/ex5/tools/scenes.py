"""Every scene of the EX5 Necron guide, redrawn from game8's pictures (percent of a 1:1 frame).
Measured on game8's 440x440 pictures: badges with detect2.py, puddles/orbs/markers with blobs.py, the rest by grid."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex5/tools")
from shp import *  # noqa

G8 = lambda n, h: f"https://img.game8.jp/{n}/{h}/show"
BOSS = [50, 4.5]


def sc(shapes, roles=None, boss=None, arena=ARENA, waymarks=None, **kw):
    out = {"arena": arena, "waymarks": waymarks, "shapes": shapes}
    if boss is not None:
        out["boss"] = boss
    if roles:
        out["roles"] = {k: [R(v[0]), R(v[1])] for k, v in roles.items()}
    out.update(kw)
    return out


# ============================================================ Fear of Death
VERT = [(34.0, 19.8), (73.6, 19.9), (24.0, 37.2), (63.0, 37.7), (33.3, 62.4), (72.8, 61.1), (22.2, 77.5), (60.1, 76.8)]
HORZ = [(21.4, 24.8), (61.3, 26.6), (36.0, 35.9), (78.4, 36.7), (21.6, 63.1), (60.9, 65.3), (37.0, 75.0), (78.4, 76.0)]
# which puddle each seat baits, and the way its line goes
VERT_BAIT = {"D1": (0, "N"), "ST": (1, "E"), "MT": (2, "W"), "D2": (3, "N"), "D3": (4, "S"), "H2": (5, "E"), "H1": (6, "W"), "D4": (7, "S")}
HORZ_BAIT = {"MT": (0, "W"), "D2": (1, "N"), "D1": (2, "N"), "ST": (3, "E"), "H1": (4, "W"), "D4": (5, "S"), "D3": (6, "S"), "H2": (7, "E")}


def puddles(ps):
    out = []
    for p in ps:
        out += puddle(p)
    return out


def beams(ps, bait):
    out = []
    for seat, (i, d) in bait.items():
        out += beam(ps[i], d)
    return out


def fod_spread():
    roles = {"D1": (48.0, 26.9), "MT": (34.8, 34.4), "D2": (52.8, 36.8), "ST": (72.4, 35.7),
             "H1": (31.7, 50.6), "H2": (67.6, 51.6), "D3": (44.9, 58.2), "D4": (57.2, 62.3)}
    return sc(floor() + puddles(VERT), roles, BOSS)


def fod_vert():
    roles = {"D1": (33.9, 12.3), "ST": (82.2, 20.5), "D2": (62.5, 29.5), "MT": (14.8, 36.9),
             "H2": (82.3, 61.4), "H1": (14.3, 77.2), "D3": (32.8, 71.5), "D4": (60.2, 85.5)}
    return sc(floor() + puddles(VERT) + beams(VERT, VERT_BAIT), roles, BOSS)


def fod_horz():
    roles = {"MT": (11.5, 25.1), "D1": (35.9, 27.4), "D2": (62.3, 17.8), "ST": (87.5, 36.9),
             "H1": (11.4, 62.5), "D4": (60.1, 74.9), "H2": (89.2, 76.7), "D3": (37.2, 83.2)}
    return sc(floor() + puddles(HORZ) + beams(HORZ, HORZ_BAIT), roles, BOSS)


# ============================================================ Memento Mori + Smite of Gloom
MM_HANDS = [(56.6, 17.7), (55.9, 35.0), (44.3, 51.1), (55.8, 66.6), (55.9, 83.5)]
MM_ROLES = {"D1": (10.7, 11.2), "D2": (33.4, 10.5), "H1": (10.7, 35.0), "H2": (32.8, 37.0),
            "MT": (66.1, 47.0), "ST": (88.8, 45.6), "D3": (10.9, 89.0), "D4": (33.2, 90.6)}


def mm_strip():
    return [rect(36, TOP, 63.5, BOT, "#5a2e8e", 0.75, 0.01), line((36, TOP), (36, BOT), "#c0a0e0", 0.3, 0.8), line((63.5, TOP), (63.5, BOT), "#c0a0e0", 0.3, 0.8)]


def mm_beams():
    o = []
    for y0, y1 in ((TOP, 25.5), (25.5, 43.0), (58.0, 75.0), (75.0, BOT)):
        x0 = 54 if y0 < 50 else 52
        o.append(rect(x0, y0, 101, y1, ORANGE, 0.5, 0.3))
    o.append(rect(-1, 41.5, 45.5, 59.0, ORANGE, 0.5, 0.3))
    return o


def mm_hands():
    out = []
    for p in MM_HANDS:
        out += puddle(p)
    return out


def mm1():
    roles = {"D1": (9.7, 24.0), "D2": (30.6, 28.0), "MT": (67.6, 42.6), "ST": (85.7, 40.6),
             "H1": (11.8, 50.5), "H2": (32.8, 51.0), "D3": (13.6, 77.3), "D4": (31.8, 79.1)}
    return sc(floor() + [rect(36, TOP, 63.5, 101, ORANGE, 0.55, 0.3)] + white_black_hands(), roles, BOSS)


def mm2():
    return sc(floor() + mm_strip() + mm_hands() + mm_beams() + white_black_hands(), MM_ROLES, BOSS)


def mm3():
    roles = dict(MM_ROLES, H1=(10.8, 37.5), H2=(33.2, 37.3))
    pinks = [circle(p, 20, PINK, 0.22, 0.3) for p in roles.values()]
    return sc(floor() + mm_strip() + mm_hands() + mm_beams() + pinks + white_black_hands(), roles, BOSS)


# ============================================================ Soul Reaping + Twofold / Fourfold Blight
def small_soul():
    return [ringl((50, 3.6), 2.6, "#d8d8e0", 0.4), rectc(50, 3.6, 1.7, 1.7, "#3a8ad8", 1, 0.1, 45)]


def blue_centre(bottom=101):
    return [rect(36, TOP, 63.5, bottom, BLUE, 0.55, 0.3)]


def blue_sides():
    return [rect(LEFT, TOP, 31.5, BOT, BLUE, 0.55, 0.3), rect(68.5, TOP, RIGHT, BOT, BLUE, 0.55, 0.3)]


def stacks(*cs, d=6.5):
    out = []
    for c in cs:
        out += stack_mark(c[0], c[1], d)
    return out


R_CL44 = {"MT": (26.5, 35.5), "D1": (24.5, 42.5), "D3": (32.5, 41.5), "H1": (31.0, 47.5),
          "ST": (74.5, 39.8), "D4": (68.5, 41.8), "H2": (71.5, 47.5), "D2": (78.0, 46.5)}
R_CLPR = {"MT": (21.0, 31.1), "D1": (18.5, 37.7), "D3": (32.8, 41.1), "H1": (31.1, 46.2),
          "ST": (81.7, 31.2), "D2": (83.5, 37.0), "D4": (68.0, 41.8), "H2": (71.4, 46.4)}
R_SD44 = {"MT": (33.5, 13.5), "H1": (40.3, 13.4), "D1": (33.8, 20.6), "D3": (40.5, 21.5),
          "H2": (57.6, 13.4), "ST": (64.2, 13.5), "D2": (57.2, 20.7), "D4": (64.2, 21.3)}
R_SDPR = {"MT": (35.6, 11.6), "D1": (32.5, 17.4), "H1": (43.6, 20.2), "D3": (42.0, 26.4),
          "H2": (56.5, 19.0), "D4": (58.6, 25.5), "ST": (64.3, 11.6), "D2": (68.1, 18.0)}


def sr_icon():
    return sc(floor() + soul_icon((50, 6.6), 6.4, "line"), waymarks=G8WM)


def sr_centre44(icon=True):
    s = floor() + blue_centre() + stacks((28.6, 42.0), (73.2, 43.6), d=7.4) + (small_soul() if icon else [])
    return sc(s, R_CL44, waymarks=G8WM)


def sr_centrepr(icon=True):
    s = floor() + blue_centre() + stacks((19.8, 34.4), (32.0, 43.7), (82.6, 34.1), (69.7, 44.1), d=5.6) + (small_soul() if icon else [])
    return sc(s, R_CLPR, waymarks=G8WM)


def sr_sides44(icon=True):
    s = floor() + blue_sides() + stacks((37.0, 17.3), (61.0, 17.3), d=7.0) + (small_soul() if icon else [])
    return sc(s, R_SD44, waymarks=G8WM)


def sr_sidespr(icon=True):
    s = floor() + blue_sides() + stacks((34.0, 14.5), (42.8, 23.3), (57.5, 22.2), (66.2, 14.8), d=5.4) + (small_soul() if icon else [])
    return sc(s, R_SDPR, waymarks=G8WM)


# ============================================================ Fear of Death + The End's Embrace
def fe_spread():
    roles = {"D1": (48.0, 26.8), "MT": (24.8, 39.0), "D2": (52.8, 36.7), "ST": (68.3, 38.0),
             "H1": (31.6, 50.6), "H2": (67.8, 51.7), "D3": (44.9, 58.1), "D4": (56.9, 56.5)}
    return sc(floor(arcs=False) + puddles(HORZ), roles)


def fe_drop():
    roles = {"MT": (20.8, 25.1), "D2": (61.3, 26.5), "D1": (36.2, 35.9), "ST": (78.5, 36.9),
             "H1": (21.9, 61.9), "D4": (60.1, 65.5), "D3": (37.0, 74.9), "H2": (78.5, 77.0)}
    s = floor() + puddles(HORZ)
    for p in roles.values():
        s += gold_aoe(p, 6.3)
    for p in roles.values():
        s += wing_mark(p[0], p[1] - 7.0)
    return sc(s, roles)


def fe_dodge():
    roles = {"MT": (14.2, 16.6), "ST": (87.7, 24.9), "D2": (57.3, 38.9), "D1": (40.8, 49.4),
             "H1": (29.9, 54.2), "D4": (59.0, 54.4), "D3": (40.3, 65.2), "H2": (74.8, 65.0)}
    return sc(floor() + puddles(HORZ) + beams(HORZ, HORZ_BAIT), roles)


# ============================================================ Grand Cross
GC_ARENA = {"shape": "circle", "at": [50, 50], "r": 41.5, "fill": "#7b6760", "lines": False, "edge": "#141414"}
GC_WM = {"A": [50, 9.0], "B": [91.8, 51.0], "C": [49.6, 91.6], "D": [8.4, 50.6]}


def gc_lines(a1, a2):
    return [cross_line((50, 50), a1), cross_line((50, 50), a2)]


def gc_basic():
    roles = {"D1": (31.5, 24.5), "MT": (23.3, 36.4), "D2": (68.0, 27.0), "ST": (77.4, 37.1),
             "H1": (21.7, 64.5), "D3": (30.0, 76.0), "H2": (76.0, 66.0), "D4": (66.0, 78.0)}
    return sc(gc_lines(12.1, 101.7), roles, arena=GC_ARENA, waymarks=GC_WM)


def gc_x():
    marks = {"MT": (49.1, 17.2), "ST": (83.9, 50.9), "H1": (14.9, 50.9), "H2": (51.3, 84.2)}
    towers = {"D1": (24.0, 28.2), "D2": (77.3, 29.3), "D3": (24.0, 72.7), "D4": (78.7, 74.1)}
    s = gc_lines(13.7, 107.5)
    for p in towers.values():
        s += gc_tower(p)
    for p in marks.values():
        s += gc_marker(p)
    for p in marks.values():
        s += wing_mark(p[0], p[1] - 6.0, 2.2)
    for (x, y), a, b in (((39.5, 31.0), "MT/D1", "(N/NW)"), ((64.0, 41.5), "ST/D2", "(NE/E)"), ((34.5, 53.0), "H1/D3", "(SW/W)"), ((61.5, 64.0), "H2/D4", "(SE/S)")):
        s += [text(x, y, a, 4.0, "#ff5a4a"), text(x, y + 4.6, b, 3.4, "#ff5a4a")]
    return sc(s, {**marks, **towers}, arena=GC_ARENA, waymarks=GC_WM)


def gc_plus():
    towers = {"MT": (49.0, 17.6), "ST": (84.3, 51.7), "H1": (13.0, 52.0), "H2": (52.0, 85.0)}
    marks = {"D1": (24.5, 28.2), "D2": (74.8, 28.0), "D3": (24.1, 73.3), "D4": (73.3, 73.4)}
    s = gc_lines(14.1, 103.6)
    for p in towers.values():
        s += gc_tower(p)
    for p in marks.values():
        s += gc_marker(p)
    for p in marks.values():
        s += wing_mark(p[0], p[1] - 6.0, 2.2)
    return sc(s, {**marks, **towers}, arena=GC_ARENA, waymarks=GC_WM)


# ============================================================ Specter of Death + The End's Embrace
HAND_W, HAND_E = (4.6, 81.0), (95.4, 19.0)


def tethers():
    return [line((50, 1.5), (HAND_W[0] + 2, HAND_W[1] - 2), "#6a1fb0", 1.3, 0.95), line((50, 1.5), (HAND_E[0] - 2, HAND_E[1]), "#6a1fb0", 1.3, 0.95)]


def sp_tether():
    return sc(floor() + tethers() + giant_hand(HAND_W, "E") + giant_hand(HAND_E, "W"), boss=BOSS)


def sp_drop():
    roles = {"MT": (20.6, 43.3), "D1": (32.7, 43.0), "H1": (20.7, 56.6), "D3": (32.8, 57.3),
             "D2": (67.7, 42.3), "ST": (80.3, 43.4), "D4": (67.7, 56.0), "H2": (80.3, 55.7)}
    s = floor() + [rect(LEFT, TOP, RIGHT, 35.5, ORANGE, 0.6, 0.3), rect(LEFT, 64.5, RIGHT, BOT, ORANGE, 0.6, 0.3)]
    for p in roles.values():
        s += [circle(p, 8.3, GOLD, 0.25), ringl(p, 8.3, "#f5d65a", 0.4, 0.9)]
    s += giant_hand(HAND_W, "E") + giant_hand(HAND_E, "W")
    return sc(s, roles, BOSS)


def sp_bait():
    s = floor()
    src = [(20.6, 43.3), (32.7, 43.0), (20.7, 56.6), (32.8, 57.3), (67.7, 42.3), (80.3, 43.4), (67.7, 56.0), (80.3, 55.7)]
    for p in src:
        s += [circle(p, 5.4, GREEN, 0.7), ringl(p, 8.3, "#f5d65a", 0.35, 0.6)]
    for (x, y), ang in zip(src, (11.5, 23.5, -11.5, -23.5, -23.5, -11.5, 23.5, 11.5)):
        s.append(rectc(51, 50 + (y - 50) * 0.12, 112, 9.6, ORANGE, 0.42, 0.3, ang))
    s += [arrow((51, 41), (51, 26.5), "#ffffff", 1.6), arrow((51, 59), (51, 73.5), "#ffffff", 1.6)]
    s += tdh((51, 50))
    return sc(s, boss=BOSS)


# ============================================================ Relentless Reaping + Crop Rotation + The Second / Fourth Season
def rr_souls():
    s = floor()
    s += soul_icon((49.8, 8.9), 5.8, "circle") + soul_icon((37.4, 18.1), 5.3, "donut")
    s += soul_icon((62.6, 18.5), 5.8, "sides") + soul_icon((50.5, 28.6), 5.6, "line")
    s += [text(49.7, 3.0, "3", 7.4, "#2ea05a"), text(37.2, 12.6, "2", 7.4, "#3aa0ff"),
          text(62.2, 13.4, "4", 7.4, "#ffe040"), text(50.3, 21.7, "1", 7.4, "#ff3030")]
    return sc(s)


def rr_rotate():
    s = floor()
    for c, n in (((50, 4.0), 2), ((42.5, 11.0), 3), ((56.5, 11.0), 1), ((50, 18.0), 4)):
        s += [circle(c, 3.6, "#2a2a44", 0.5), ringl(c, 3.6, "#d0d0d8", 0.35, 0.9)] + diamonds(c, n, 1.9)
    return sc(s)


R_IN44 = {"MT": (35.7, 20.6), "D1": (41.4, 20.6), "H1": (35.6, 26.5), "D3": (41.6, 26.3),
          "ST": (58.5, 20.4), "D2": (64.4, 20.2), "D4": (58.3, 26.0), "H2": (64.5, 26.2)}
R_OUT44 = {"MT": (24.0, 42.6), "D1": (29.8, 42.7), "H1": (24.0, 48.9), "D3": (29.7, 48.9),
           "ST": (70.8, 43.5), "D2": (76.9, 43.8), "D4": (71.0, 50.0), "H2": (77.0, 49.6)}


def rr_icons(nd, kind, ring_at=(55, 6.8)):
    return [circle((42.3, 7.4), 3.0, "#2a2a44", 0.4), ringl((42.3, 7.4), 3.0, "#d0d0d8", 0.3, 0.9)] + diamonds((42.3, 7.4), nd, 1.6) + soul_icon(ring_at, 5.6, kind)


def rr_step1():
    return sc(floor() + blue_sides() + rr_icons(4, "sides"), R_IN44, waymarks=G8WM, iconSize=4.6)


def rr_step2():
    return sc(floor() + [circle((50, -4.3), 47.8, "#6aaee0", 0.28, 0.01)] + rr_icons(3, "circle", (52, 6.6)), R_OUT44, waymarks=G8WM, iconSize=4.6)


HOLE_C, HOLE_R = (50, -4.3), 33.8


def blue_donut():
    return [donut(HOLE_C, 160, HOLE_R, BLUE, 0.5, 0.3)]


def blue_circle():
    return [circle(HOLE_C, 47.8, BLUE, 0.5, 0.3)]


def rr_step3():
    return sc(floor() + blue_donut() + rr_icons(2, "donut"), R_IN44, waymarks=G8WM, iconSize=4.6)


R_CIR44 = {"MT": (21.0, 41.5), "D3": (27.8, 42.9), "D1": (19.2, 46.4), "H1": (25.0, 48.6),
           "H2": (70.5, 44.1), "ST": (76.7, 41.5), "D4": (73.8, 48.8), "D2": (79.2, 47.0)}
R_DON44 = {"MT": (35.7, 17.0), "D1": (41.4, 17.0), "H1": (35.7, 23.5), "D3": (41.4, 23.4),
           "ST": (59.4, 17.0), "D2": (65.3, 17.2), "D4": (59.7, 22.9), "H2": (65.5, 23.2)}
R_CIRPR = {"MT": (17.3, 37.6), "D1": (15.2, 42.8), "D3": (33.0, 44.4), "H1": (28.6, 49.5),
           "ST": (78.1, 40.5), "D2": (80.9, 43.9), "H2": (69.4, 45.5), "D4": (71.2, 50.0)}
R_DONPR = {"MT": (33.0, 11.0), "D1": (34.5, 16.2), "D3": (43.6, 20.9), "H1": (41.7, 25.0),
           "ST": (63.3, 13.1), "D2": (68.2, 15.8), "H2": (59.0, 21.5), "D4": (60.7, 25.2)}


def st44_circle():
    return sc(floor() + blue_circle() + stacks((23.2, 45.0), (75.0, 45.4), d=6.4), R_CIR44, waymarks=G8WM, iconSize=4.6)


def st44_donut():
    return sc(floor() + blue_donut() + stacks((38.5, 20.2), (62.5, 20.1), d=6.0), R_DON44, waymarks=G8WM, iconSize=4.6)


def stpr_circle():
    return sc(floor() + blue_circle() + stacks((16.2, 40.2), (30.8, 47.0), (79.5, 42.2), (70.3, 47.8), d=4.8), R_CIRPR, waymarks=G8WM, iconSize=4.6)


def stpr_donut():
    return sc(floor() + blue_donut() + stacks((33.8, 13.6), (42.6, 23.0), (65.7, 14.4), (59.8, 23.4), d=4.8), R_DONPR, waymarks=G8WM, iconSize=4.6)


# ============================================================ Circle of Lives
ORBS = {"NW": (20.6, 21.0), "NE": (76.6, 20.8), "C": (49.5, 50.0), "SW": (20.7, 76.5), "SE": (76.8, 76.5)}
HAND_EAST = (95.6, 50.0)


def orbs(*keys):
    out = []
    for k in keys:
        out += orb(ORBS[k])
    return out


def big_donut(hole):
    return [donut(hole, 200, 6.6, "#5aa8e0", 0.45, 0.01), circle(hole, 6.6, "#2c2238", 0.85), ringl(hole, 6.6, "#14306a", 0.4, 0.9)]


def col1():
    return sc(floor() + orbs("NW", "NE", "C", "SW", "SE"), waymarks=G8WM)


def col_pop(hole, left, hand=True, soul=False, who=None):
    s = floor() + orbs(*left) + big_donut(ORBS[hole])
    if hand:
        s += giant_hand(HAND_EAST, "W")
    if soul:
        s += soul_icon((49.5, 7.0), 7.6, "donut")
    s += tdh(who or ORBS[hole])
    return sc(s, waymarks=G8WM)


def col_hand():
    s = floor() + orbs("NW", "C", "SW") + [rect(-1, 37.5, RIGHT, 62.5, ORANGE, 0.55, 0.3)] + giant_hand(HAND_EAST, "W") + tdh((50.5, 33.0))
    return sc(s, waymarks=G8WM)


# ============================================================ Mass Macabre
MMT = {9: ((27.8, 16.4), 3), 7: ((74.4, 16.4), 3), 3: ((15.7, 43.6), 2), 1: ((51.1, 34.5), 4), 4: ((86.3, 43.8), 2),
       5: ((15.7, 57.2), 2), 2: ((51.2, 66.4), 4), 6: ((86.2, 57.6), 2), 8: ((27.6, 85.6), 3), 10: ((74.3, 85.6), 3)}


def towers(*ns):
    out = []
    for n in ns:
        c, k = MMT[n]
        out += tower_mm(c, k)
    return out


def mac1():
    return sc(floor() + towers(*range(1, 11)), waymarks=G8WM)


def mac2():
    roles = {"MT": (46.8, 30.5), "ST": (53.0, 30.5), "D1": (47.4, 36.6), "D2": (53.3, 36.6),
             "D3": (47.2, 63.4), "D4": (52.6, 63.2), "H1": (47.2, 69.4), "H2": (52.8, 69.4)}
    return sc(floor() + towers(*range(1, 11)), roles, waymarks=G8WM, iconSize=5.0)


def mac3():
    roles = {"D3": (11.8, 43.0), "D4": (18.0, 42.7), "MT": (11.0, 57.5), "H1": (18.0, 57.5),
             "D1": (82.4, 41.9), "D2": (88.1, 41.9), "ST": (82.7, 57.4), "H2": (88.2, 57.4)}
    return sc(floor() + towers(3, 4, 5, 6, 7, 8, 9, 10) + [rect(33.8, TOP, 66.4, 101, ORANGE, 0.55, 0.3)], roles, waymarks=G8WM, iconSize=5.0)


def mac4():
    roles = {"MT": (14.3, 30.3), "D3": (18.5, 63.8), "H1": (25.0, 63.8), "D4": (18.4, 70.2),
             "D1": (82.4, 46.2), "D2": (88.2, 47.2), "ST": (83.1, 53.6), "H2": (88.8, 53.6)}
    return sc(floor() + towers(7, 8, 9, 10) + mm_strip() + mm_hands() + mm_beams(), roles, waymarks=G8WM, iconSize=5.0)


def mac5():
    roles = {"MT": (8.4, 10.2), "ST": (91.6, 10.5), "D1": (70.3, 13.8), "D2": (77.8, 14.2), "H2": (73.5, 19.0),
             "H1": (31.6, 81.0), "D3": (31.0, 86.0), "D4": (28.6, 89.6)}
    s = floor() + towers(7, 8, 9, 10) + mm_strip() + mm_hands() + [cone((50, -3), 255, 122, 170, "#e0303f", 0.55, 0.3)]
    return sc(s, roles, waymarks=G8WM, iconSize=5.0)


def mac6():
    roles = {"MT": (8.4, 10.2), "ST": (91.6, 10.2), "D1": (24.0, 13.1), "D2": (32.0, 13.6), "H2": (28.4, 19.0),
             "H1": (66.6, 82.6), "D3": (67.0, 86.6), "D4": (69.6, 90.0)}
    s = floor() + towers(9, 10) + [cone((50, -3), 105, 122, 170, "#6aaee0", 0.5, 0.3)]
    return sc(s, roles, waymarks=G8WM, iconSize=5.0)
