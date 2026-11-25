"""Every scene of the EX2 guide, redrawn from game8's pictures (measured in percent of a 1:1 frame)."""
import sys
sys.path.insert(0, r"scripts/guides/.work/ex2/tools")
from shapes import *  # noqa

G8 = lambda n, h: f"https://img.game8.jp/{n}/{h}/show"
EVERY = ("MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4")


def sc(shapes, roles=None, boss=None, **kw):
    out = {"shapes": shapes}
    if boss is not None:
        out["boss"] = boss
    if roles:
        out["roles"] = roles
    out.update(kw)
    return out


def cluster(x, y, gap=2.9, cols=4, order=EVERY):
    return party_cluster(x, y, gap=gap, cols=cols, order=order)


# ============================================================ the big floor
BIG = Dia(50.2, 49.3, 45.2)

# Multidirectional Divide: the X through the boss and its cuts (game8 ①).
ARM1_T, ARM2_S = 0.5, 99.5          # arm 1 runs NW-SE (t const), arm 2 NE-SW (s const)
CUTS1_S = (66, 85, 115, 139.5)       # cuts on arm 1, at these s
CUTS2_T = (-30, -11, 22, 42)         # cuts on arm 2, at these t
ARM_W, CUT_W, CUT_L = 2.5, 2.7, 9.8


def x_shape():
    out = []
    out += bar(xy(BIG.s0, ARM1_T), xy(BIG.s1, ARM1_T), ARM_W)
    out += bar(xy(ARM2_S, BIG.t0), xy(ARM2_S, BIG.t1), ARM_W)
    for s in CUTS1_S:
        c = xy(s, ARM1_T)
        out += bar([c[0] - CUT_L / 2 / SQ2 * 1, c[1] + CUT_L / 2 / SQ2], [c[0] + CUT_L / 2 / SQ2, c[1] - CUT_L / 2 / SQ2], CUT_W)
    for t in CUTS2_T:
        c = xy(ARM2_S, t)
        out += bar([c[0] - CUT_L / 2 / SQ2, c[1] - CUT_L / 2 / SQ2], [c[0] + CUT_L / 2 / SQ2, c[1] + CUT_L / 2 / SQ2], CUT_W)
    return out


# The lines that come out of the cuts, across the whole floor (game8 ③ ④ and Regicidal Rage ②).
LAT_S = [(63, 70), (83, 92), (92, 101), (101, 110), (120, 128), (134, 140)]
LAT_T = [(40, 45), (20, 26), (5, 14), (-5, 5), (-14, -5), (-32, -26)]


def lattice(o=0.42):
    out = []
    for a, b in LAT_S:
        out += BIG.sband(a, b, o=o)
    for a, b in LAT_T:
        out += BIG.tband(a, b, o=o)
    return out


BOSS_C = [50, 50.3]


def zoraal(at=BOSS_C, face=0, glow=None, tc=False):
    out = []
    if tc:
        out += target_circle([at[0], at[1] - 0.8])
    out += facing(at, face)
    if glow:
        out += glow_sword(glow)
    return out


def md1():
    return sc(BIG.base() + x_shape())


def md2():
    return sc(BIG.base() + x_shape() + zoraal(glow=(56, 49.5), tc=True), roles=cluster(45.6, 68, gap=2.6), boss=BOSS_C, iconSize=3.6)


def md_back():
    s = BIG.base() + lattice() + target_circle([50, 49.5])
    s += half(50.2, 0, 100, 100) + half(0, 0, 100, 64.5)
    s += edge_line([50.2, 0], [50.2, 100]) + edge_line([0, 64.5], [100, 64.5])
    s += zoraal(glow=(56, 49.5))
    return sc(s, roles=cluster(45.6, 68, gap=2.6), boss=BOSS_C, iconSize=3.6)


def md_fwd():
    s = BIG.base() + lattice() + target_circle([50, 49.5])
    s += half(0, 0, 50.2, 100) + half(0, 36, 100, 100)
    s += edge_line([50.2, 0], [50.2, 100]) + edge_line([0, 36], [100, 36])
    s += zoraal(glow=(56, 49.5))
    return sc(s, roles=cluster(54.6, 22.5, gap=2.6), boss=BOSS_C, iconSize=3.6)


def regi1():
    s = BIG.base() + x_shape() + zoraal()
    roles = {"MT": [47.5, 58.3], "ST": [52.5, 58.3]}
    s += tether(BOSS_C, roles["MT"], c="#f07ab0", wd=0.8) + tether(BOSS_C, roles["ST"], c="#f07ab0", wd=0.8)
    roles.update(cluster(49.7, 70.5, order=("H1", "H2", "D1", "D2", "D3", "D4"), cols=3))
    return sc(s, roles=roles, boss=BOSS_C, iconSize=4.4)


def regi2():
    s = BIG.base() + lattice()
    roles = {"MT": [49.5, 31.5], "ST": [65.5, 48.3]}
    s += aoe_circle(49.2, 31.6, 13.5, c="#e2501e", o=0.62) + aoe_circle(65.2, 48.4, 13.5, c="#e2501e", o=0.62)
    s += zoraal()
    s += tether(BOSS_C, roles["MT"], c="#f07ab0", wd=0.8) + tether(BOSS_C, roles["ST"], c="#f07ab0", wd=0.8)
    roles.update(cluster(48.5, 66.5, order=("H1", "H2", "D1", "D2", "D3", "D4"), cols=3))
    return sc(s, roles=roles, boss=BOSS_C, iconSize=4.4)


# ============================================================ five floors (Dawn of an Age 1 and 3)
MID = Dia(50, 50.4, 23)
NW, NE = Dia(24, 24.6, 23), Dia(75.8, 24.6, 23)
SW, SE = Dia(24.2, 76.2, 23), Dia(75.6, 76.2, 23)
FIVE = (MID, NW, NE, SW, SE)
SW_NW = [(1, 0), (0, 2), (3, 1), (2, 3)]
SW_NE = [(0, 1), (2, 0), (1, 3), (3, 2)]
SW_SW = [(1, 0), (0, 2), (2, 3), (3, 2)]
SW_SE = [(0, 1), (2, 0), (1, 3), (3, 2)]
BOSS5 = [50, 50.6]
SYNC_BLUE = "#2f8fe8"


def five_base():
    out = []
    for p in FIVE:
        out += p.base()
    return out


def swords_on(p, cells, size=6.0):
    out = []
    for a, b in cells:
        x, y = p.cell(a, b)
        out += sword(x, y, size=size, rot=-12)
    return out


def tiles_on(p, cells, o=0.58):
    out = []
    for a, b in cells:
        out += p.tile(a, b, o=o)
    return out


def five_party():
    """game8's T above the boss, D and H behind: the tanks hold it, the rest stand behind."""
    return {"MT": [48.4, 43.6], "ST": [51.6, 43.6], "D1": [42.0, 57.2], "D2": [45.0, 57.2], "D3": [42.0, 60.0], "D4": [45.0, 60.0],
            "H1": [54.0, 58.6], "H2": [57.0, 58.6]}


def vollok1():
    return sc(five_base() + facing(BOSS5, 0), roles=five_party(), boss=BOSS5, iconSize=4.4)


def vollok_swords(sync_tiles=True):
    s = []
    s += tiles_on(NW, SW_NW) if sync_tiles else []
    s += tiles_on(NE, SW_NE) if sync_tiles else []
    s += swords_on(NW, SW_NW) + swords_on(NE, SW_NE) + swords_on(SW, SW_SW) + swords_on(SE, SW_SE)
    return s


def vollok2():
    s = five_base() + vollok_swords()
    for p in (NW, NE, MID):
        s += p.outline(c=SYNC_BLUE, wd=0.9)
    s += facing(BOSS5, 0)
    return sc(s, roles=five_party(), boss=BOSS5, iconSize=4.4)


def vollok3():
    s = five_base() + vollok_swords() + facing(BOSS5, 0) + glow_sword((55.5, 50.5))
    return sc(s, roles=five_party(), boss=BOSS5, iconSize=4.4)


MID_SYNC = SW_NW + SW_NE


def vollok_party45():
    return {"MT": [46.2, 43.6], "ST": [48.7, 43.6], "D1": [46.4, 64.4], "D2": [48.8, 64.4], "D3": [46.4, 66.8], "D4": [48.8, 66.8],
            "H1": [47.0, 69.2], "H2": [49.2, 69.2]}


def vollok4():
    s = five_base() + vollok_swords() + tiles_on(MID, MID_SYNC) + facing(BOSS5, 0) + glow_sword((55.5, 50.5))
    return sc(s, roles=vollok_party45(), boss=BOSS5, iconSize=3.4)


def vollok5():
    s = five_base() + vollok_swords() + tiles_on(MID, MID_SYNC)
    s += half(49.6, 0, 100, 100) + edge_line([49.6, 0], [49.6, 100])
    s += facing(BOSS5, 0) + glow_sword((55.5, 50.5))
    return sc(s, roles=vollok_party45(), boss=BOSS5, iconSize=3.4)


# ---------------------------------------------------------------- Sync: the four patterns of the middle floor
SYNC_PATTERNS = {
    1: [(0, 1), (0, 2), (1, 0), (1, 3), (2, 0), (2, 3), (3, 1), (3, 2)],
    2: [(0, 0), (0, 1), (1, 2), (1, 3), (2, 0), (2, 1), (3, 2), (3, 3)],
    3: [(0, 0), (0, 3), (1, 1), (1, 2), (2, 1), (2, 2), (3, 0), (3, 3)],
    4: [(0, 1), (0, 3), (1, 1), (1, 3), (2, 0), (2, 2), (3, 0), (3, 2)],
}


def sync_pattern(n):
    return lambda: sc(five_base() + tiles_on(MID, SYNC_PATTERNS[n]))


sync1, sync2, sync3, sync4 = (sync_pattern(k) for k in (1, 2, 3, 4))


def ring_mark(at, c, r=3.6, wd=0.75):
    return [{"t": "ring", "at": [R(at[0]), R(at[1])], "r": r, "c": c, "wd": wd, "o": 0.95}]


def sync_safe():
    """game8's "how to read the safe tile": the south corner of each linked floor, and of the middle."""
    s = five_base() + vollok_swords()
    for p in (NW, NE):
        s += p.outline(c=SYNC_BLUE, wd=0.9)
    red, green = "#ff3b30", "#36e05a"
    s += ring_mark(NW.cell(3, 3), red) + ring_mark(NE.cell(3, 3), red)
    s += ring_mark(MID.cell(2, 2), red) + ring_mark(MID.cell(3, 3), red)
    s += ring_mark(MID.cell(2, 3), green, r=3.0) + ring_mark(MID.cell(3, 2), green, r=3.0)
    s += arrow([46, 78], [26.2, 46.6], c=red, wd=0.75) + arrow([54, 78], [73.8, 46.6], c=red, wd=0.75)
    s += arrow([50, 33.5], [50, 51.6], c=red, wd=0.75)
    s += facing(BOSS5, 0)
    roles = {"MT": [48.6, 43.2], "ST": [51.4, 43.2], "D1": [42.6, 58.4], "D2": [45.0, 58.4], "D3": [42.6, 60.8], "D4": [45.0, 60.8],
             "H1": [55.0, 59.4], "H2": [57.4, 59.4]}
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.6, waymarks={"A": [50, 26.4], "C": [50, 76.4]})


# ---------------------------------------------------------------- Greater Gateway
RED_T, GRN_T, BLU_T = "#e8562a", "#19a85f", "#5aaee6"
GATE_TETHERS = [
    ((26.3, 44.4), (35.3, 42.0), RED_T), ((32.5, 38.9), (40.9, 36.1), RED_T),
    ((35.3, 42.6), (37.8, 33.9), GRN_T), ((41.2, 36.7), (43.8, 27.8), GRN_T),
    ((55.4, 27.0), (58.4, 35.8), RED_T), ((60.7, 33.0), (64.1, 42.0), RED_T),
    ((58.4, 36.1), (67.3, 38.9), GRN_T), ((64.1, 42.0), (73.2, 45.1), GRN_T),
    ((29.7, 53.1), (33.0, 62.4), BLU_T), ((26.5, 55.6), (41.8, 64.9), BLU_T),
    ((35.0, 58.7), (44.0, 73.5), BLU_T), ((38.4, 67.0), (47.4, 70.7), BLU_T),
    ((70.4, 53.4), (66.7, 62.1), BLU_T), ((73.2, 56.5), (58.0, 65.5), BLU_T),
    ((64.6, 59.0), (55.3, 73.8), BLU_T), ((62.1, 67.5), (52.8, 70.7), BLU_T),
]
RED_STRIP, GRN_STRIP, BRN = "#b83a2c", "#2e8f5a", AOE


def gate_tethers():
    out = []
    for p, q, c in GATE_TETHERS:
        out += tether(p, q, c=c, wd=1.35 if c == BLU_T else 1.1)
    return out


def blade(at, a, size=8.5):
    """A summoned blade lying on the floor, pointing along its strip."""
    ux, uy = unit(a)
    glow = bar([at[0] - ux * size * 0.5, at[1] - uy * size * 0.5], [at[0] + ux * size * 0.5, at[1] + uy * size * 0.5], 2.6, c="#fff4e0", o=0.25, edge=None)
    return glow + sword(at[0], at[1], size=size, rot=a, c="#f6efe2")


def gate_swords(kind="red"):
    if kind == "red":
        return blade(NE.cell(0, 0), 225) + blade(SE.cell(3, 2), 315) + blade(SE.cell(3, 3), 315)
    return blade(NE.cell(2, 0), 225) + blade([SE.cell(3, 0)[0] - 1.5, SE.cell(3, 0)[1]], 315) + blade([SE.cell(3, 1)[0] - 1.5, SE.cell(3, 1)[1]], 315)


def gate1():
    return sc(five_base() + gate_tethers() + facing(BOSS5, 0), boss=BOSS5)


def gate2():
    return sc(five_base() + gate_tethers() + gate_swords("red") + facing(BOSS5, 0), boss=BOSS5)


def gate3():
    s = five_base()
    s += NE.srow(0, c=RED_STRIP, o=0.72) + SE.trow(2, o=0.55) + SE.trow(3, o=0.55)
    s += MID.trow(1, o=0.55) + MID.trow(3, o=0.55)
    for a in (0, 1, 2):
        s += MID.srow(a, c=RED_STRIP, o=0.62)
    s += gate_tethers() + gate_swords("red")
    roles = {"MT": [48.6, 61.6], "ST": [51.0, 61.6], "H1": [53.0, 59.6], "H2": [55.4, 59.6],
             "D1": [50.0, 64.0], "D2": [52.4, 64.0], "D3": [54.8, 64.0], "D4": [52.4, 66.4]}
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.2)


SPREAD_TILES = {"MT": (0, 1), "ST": (1, 0), "D1": (1, 2), "D2": (2, 1), "D3": (1, 3), "H1": (2, 2), "H2": (3, 2), "D4": (3, 3)}


def gate4():
    s = five_base() + gate_tethers()
    roles = {}
    for seat, (a, b) in SPREAD_TILES.items():
        s += MID.tile(a, b, o=0.6)
    s += facing(BOSS5, 0)
    for seat, (a, b) in SPREAD_TILES.items():
        x, y = MID.cell(a, b)
        roles[seat] = [x, R(y + 1.4)]
        s += yellow_mark(x, y - 2.6, size=4.0)
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.6)


def gate_green_base():
    s = five_base()
    s += MID.trow(0, o=0.55) + MID.trow(2, o=0.55) + MID.srow(1, c=GRN_STRIP, o=0.7)
    return s


def gate5():
    s = gate_green_base()
    s += NE.srow(2, c=GRN_STRIP, o=0.72) + SE.trow(0, o=0.55) + SE.trow(1, o=0.55)
    s += gate_tethers() + gate_swords("green")
    roles = {"MT": [52.4, 50.6], "ST": [54.8, 49.2], "H1": [55.6, 46.6], "H2": [58.0, 46.6],
             "D1": [42.2, 59.6], "D2": [44.6, 59.6], "D3": [42.2, 62.0], "D4": [44.6, 62.0]}
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.2)


def gate6():
    s = gate_green_base()
    for (a, b) in [(0, 0), (0, 1), (0, 2), (0, 3)]:
        x, y = MID.cell(a, b)
        s += knock_chevrons([x + 0.6, y + 0.6], 315, n=2, size=2.6)
    for (a, b) in [(2, 0), (2, 1), (2, 2), (2, 3)]:
        x, y = MID.cell(a, b)
        s += knock_chevrons([x - 0.6, y - 0.6], 135, n=2, size=2.6)
    s += gate_tethers()
    s += arrow([55.0, 50.2], [60.8, 55.6]) + arrow([43.4, 61.0], [49.2, 66.2])
    roles = {"MT": [59.6, 58.2], "ST": [62.0, 58.2], "H1": [62.4, 55.6], "H2": [64.8, 55.6],
             "D1": [49.2, 67.0], "D2": [51.6, 67.0], "D3": [49.2, 69.4], "D4": [51.6, 69.4]}
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.2)


# ============================================================ Projection of Triumph (the big floor, 16 swords)
PFLOOR = "#25302f"


def proj_base():
    out = BIG.floor(fill=PFLOOR) + BIG.grid() + BIG.outline()
    for a in range(4):
        for b in range(4):
            x, y = BIG.cell(a, b)
            out += [{"t": "ring", "at": [x, y], "r": 2.7, "c": CYAN, "wd": 0.3, "o": 0.8}]
            out += sword(x + 0.6, y - 0.6, size=4.2, rot=55)
    return out


COLS_S = [BIG.s0 + (k + 0.5) * BIG.step for k in range(4)]


def edge_orbs(side):
    """The two lines before they move: orbs on the north-east edge (small circles) and the south-west edge (donuts)."""
    t = BIG.t1 if side == "ne" else BIG.t0
    pts = [xy(s, t) for s in COLS_S]
    out = edge_line(xy(BIG.s0, t), xy(BIG.s1, t), c="#d8c38a", wd=0.7, o=0.9)
    for x, y in pts:
        out += circle_orb(x, y) if side == "ne" else donut_orb(x, y)
    return out


def orb_row(b, kind, aoe=None, r=None, o=0.48, faint=False, gold=False):
    """A line of four orbs on row b of the swords; kind 'c' (small circle) or 'd' (donut). aoe draws what goes off."""
    pts = [BIG.cell(a, b) for a in range(4)]
    out = []
    if aoe:
        for x, y in pts:
            if kind == "c":
                out += aoe_circle(x, y, r or 6.1, o=o * (0.55 if faint else 1))
            else:
                out += aoe_donut(x, y, r or 12, 3.7, o=o * (0.55 if faint else 1))
    out += edge_line(pts[0], pts[-1], c="#d8c38a", wd=0.55, o=0.8)
    for x, y in pts:
        if kind == "c":
            out += circle_orb(x, y, r=1.9) if not gold else [{"t": "dot", "at": [x, y], "r": 1.9, "c": "#e6a020", "o": 1},
                                                            {"t": "ring", "at": [x, y], "r": 1.6, "c": "#ffd36a", "wd": 0.4, "o": 1}]
        else:
            out += donut_orb(x, y, r=1.9)
    return out


def pt_party_split(t_at, rest_at):
    """game8's T on one sword, D and H on another."""
    roles = {"MT": [R(t_at[0] - 1.3), t_at[1]], "ST": [R(t_at[0] + 1.3), t_at[1]]}
    roles.update(cluster(rest_at[0], rest_at[1], gap=2.4, cols=3, order=("H1", "H2", "D1", "D2", "D3", "D4")))
    return roles


PT_T, PT_DH = BIG.cell(1, 2), BIG.cell(2, 2)


def proj1():
    s = proj_base() + edge_orbs("ne") + edge_orbs("sw") + facing(BOSS_C, 0)
    return sc(s, roles=pt_party_split(PT_T, PT_DH), boss=BOSS_C, iconSize=3.4)


def proj2():
    s = proj_base() + edge_orbs("ne") + edge_orbs("sw") + facing(BOSS_C, 0)
    s += arrow([52.6, 4.6], [35.6, 21.6], wd=0.9) + arrow([4.6, 52.0], [21.8, 35.0], wd=0.9)
    s += arrow([95.4, 46.6], [78.2, 63.6], wd=0.9) + arrow([48.0, 94.2], [65.4, 76.8], wd=0.9)
    return sc(s, roles=pt_party_split(PT_T, PT_DH), boss=BOSS_C, iconSize=3.4)


def proj3():
    s = proj_base() + orb_row(0, "c", aoe=True, r=8.7) + orb_row(3, "d", aoe=True) + facing(BOSS_C, 90)
    return sc(s, roles=pt_party_split(PT_T, PT_DH), boss=BOSS_C, iconSize=3.4)


def proj4():
    s = proj_base() + orb_row(1, "c", aoe=True) + orb_row(2, "d", aoe=True) + facing(BOSS_C, 90)
    return sc(s, roles=pt_party_split(PT_T, PT_DH), boss=BOSS_C, iconSize=3.4)


def proj5():
    s = proj_base() + BIG.tband(BIG.t0, 26, o=0.42, edge=None)
    s += orb_row(1, "d", aoe=True) + orb_row(3, "d", aoe=True) + orb_row(2, "c", aoe=True) + orb_row(0, "c", aoe=True, gold=True)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=pt_party_split(BIG.cell(1, 1), BIG.cell(2, 1)), boss=BOSS_C, iconSize=3.4)


def proj6():
    s = proj_base() + BIG.tband(-26, BIG.t1, o=0.42, edge=None)
    s += orb_row(0, "d", aoe=True) + orb_row(2, "d", aoe=True) + orb_row(1, "c", aoe=True) + orb_row(3, "c", aoe=True)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(61.5, 26.6, gap=2.4), boss=BOSS_C, iconSize=3.4)


def proj7():
    s = proj_base() + target_circle([50, 49.5])
    s += half(0, 0, 49.8, 100) + half(0, 36, 100, 100)
    s += edge_line([49.8, 0], [49.8, 100]) + edge_line([0, 36], [100, 36])
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(60.6, 26.6, gap=2.4), boss=BOSS_C, iconSize=3.4)


def proj8():
    s = proj_base() + target_circle([50, 49.5])
    s += half(50, 0, 100, 100) + half(0, 0, 100, 64.5)
    s += edge_line([50, 0], [50, 100]) + edge_line([0, 64.5], [100, 64.5])
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(41.6, 69.4, gap=2.4), boss=BOSS_C, iconSize=3.4)


# ---------------------------------------------------------------- the second time: Half Circuit
def blue_blade(x, y, a=60, size=13):
    """Half Circuit: the boss's two blue blades (game8 draws them far out when outside is hit, close in when inside is hit)."""
    ux, uy = unit(a)
    glow = bar([x - ux * size * 0.55, y - uy * size * 0.55], [x + ux * size * 0.55, y + uy * size * 0.55], 4.2, c="#5fb8ff", o=0.45, edge=None)
    return glow + sword(x, y, size=size, rot=a, c="#d6f0ff")


def proj2_base(faint=False, aoe=True):
    o = 0.3 if faint else 0.5
    return (proj_base() + orb_row(0, "d", aoe=aoe, o=o) + orb_row(1, "d", aoe=aoe, o=o)
            + orb_row(2, "c", aoe=aoe, o=o) + orb_row(3, "c", aoe=aoe, o=o))


def circ5():
    s = proj2_base(faint=True) + target_circle([50, 49.5]) + blue_blade(72.2, 37.8) + blue_blade(28.0, 58.2)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(61.5, 48.4, gap=2.4), boss=BOSS_C, iconSize=3.4)


def circ6():
    s = proj2_base(aoe=False) + aoe_donut(50, 49.5, 50, 13.5, c=HALF, o=0.42, edge=None)
    s += half(50, 0, 100, 100) + edge_line([50, 0], [50, 100])
    s += target_circle([50, 49.5]) + blue_blade(72.2, 37.8) + blue_blade(28.0, 58.2)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(45.6, 39.4, gap=2.3), boss=BOSS_C, iconSize=3.2)


def circ5b():
    s = proj2_base() + target_circle([50, 49.5]) + blue_blade(35.2, 56.4) + blue_blade(59.4, 42.2)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(50.2, 37.6, gap=2.4), boss=BOSS_C, iconSize=3.4)


def circ6b():
    s = proj2_base(aoe=False) + aoe_circle(50, 49.5, 13.5, c=HALF, o=0.6)
    s += half(49.8, 0, 100, 100) + edge_line([49.8, 0], [49.8, 100])
    s += target_circle([50, 49.5]) + blue_blade(63.0, 40.2) + blue_blade(35.2, 56.4)
    s += facing(BOSS_C, 0) + glow_sword((55.5, 49.5))
    return sc(s, roles=cluster(45.2, 33.6, gap=2.3), boss=BOSS_C, iconSize=3.2)


# ============================================================ two floors (Dawn of an Age 2)
TWO_SW, TWO_NE = Dia(33.5, 66.4, 30.5), Dia(68, 32.6, 30.4)
BOSS2_EDGE = [31.6, 64.6]          # Drum of Vollok 1 and 2: the boss on the TH floor
BOSS2_GAP = [49.6, 48.6]           # later: the boss between the floors


def two_base():
    return TWO_SW.base() + TWO_NE.base()


def block(p, a0, b0, c=AOE, o=0.55, edge=TAN):
    """A 2 x 2 block of tiles (Vollok's big sword)."""
    cells = [p.cell(a0 + i, b0 + j) for i in (0, 1) for j in (0, 1)]
    at = [R(sum(c_[0] for c_ in cells) / 4), R(sum(c_[1] for c_ in cells) / 4)]
    side = 2 * p.step / SQ2
    out = [{"t": "rect", "at": at, "w": R(side), "h": R(side), "rot": 45, "c": c, "o": o, "wd": 0.01}]
    if edge:
        out += diamond_edge(at, p.step, edge)
    return out, at


def big_sword(at):
    return [{"t": "ring", "at": [R(at[0]), R(at[1])], "r": 3.6, "c": CYAN, "wd": 0.35, "o": 0.8}] + sword(at[0] + 0.6, at[1] - 0.8, size=6.0, rot=55)


# Drum of Vollok: the pairs, west to east with the boss to the north: H1/D3 > MT/D1 > ST/D2 > H2/D4
DRUM_RINGS = {"H2": (32.0, 43.0), "ST": (38.6, 51.0), "MT": (46.6, 60.3), "H1": (55.4, 68.5)}
DRUM_TH = {"H2": [30.5, 44.4], "ST": [37.0, 52.8], "MT": [45.4, 61.0], "H1": [53.0, 69.4]}
DRUM_DPS = {"D4": [34.6, 41.6], "D2": [40.6, 49.6], "D1": [48.6, 57.8], "D3": [56.6, 65.8]}


def drum1():
    s = two_base()
    for at in DRUM_RINGS.values():
        s += pair_ring(*at)
    s += facing(BOSS2_EDGE, 45, dist=4.6)
    return sc(s, roles={**DRUM_TH, **DRUM_DPS}, boss=BOSS2_EDGE, iconSize=4.4)


def drum2():
    s = two_base()
    for at in DRUM_RINGS.values():
        s += pair_ring(*at)
    for p, q in [((35.0, 40.6), (56.0, 27.0)), ((41.6, 49.4), (62.6, 28.6)), ((49.6, 57.0), (70.6, 36.6)), ((58.6, 64.6), (78.0, 37.6))]:
        s += arrow(p, q, wd=1.0)
    s += facing(BOSS2_EDGE, 45, dist=4.6)
    roles = dict(DRUM_TH)
    roles.update({"D4": [61.0, 22.6], "D2": [66.0, 25.4], "D1": [73.0, 32.2], "D3": [79.6, 34.2]})
    return sc(s, roles=roles, boss=BOSS2_EDGE, iconSize=4.4)


def drum3():
    s = two_base()
    b1, at1 = block(TWO_SW, 0, 2, o=0.3)
    b2, at2 = block(TWO_NE, 2, 0, o=0.3)
    s += b1 + b2 + big_sword(at1) + big_sword(at2)
    s += facing(BOSS2_GAP, 45, dist=4.6)
    roles = {"ST": [39.6, 46.0], "H1": [25.4, 51.4], "MT": [45.4, 54.4], "H2": [51.0, 66.4],
             "D4": [52.6, 30.0], "D2": [54.6, 40.4], "D1": [61.0, 44.4], "D3": [73.0, 41.4]}
    return sc(s, roles=roles, boss=BOSS2_GAP, iconSize=4.4)


# Vollok + Aero III spread (the macro): facing the boss, MT/D1 front-left, ST/D2 front-right, H1/D3 back-left, H2/D4 back-right
SPREAD2 = {"MT": TWO_SW.cell(0, 0), "ST": TWO_SW.cell(1, 0), "H1": TWO_SW.cell(0, 1), "H2": TWO_SW.cell(1, 1),
           "D4": TWO_NE.cell(2, 2), "D2": TWO_NE.cell(2, 3), "D3": TWO_NE.cell(3, 2), "D1": TWO_NE.cell(3, 3)}


def drum4():
    s = two_base()
    b1, at1 = block(TWO_SW, 0, 2)
    b2, _ = block(TWO_SW, 2, 0)
    b3, at3 = block(TWO_NE, 2, 0)
    b4, _ = block(TWO_NE, 0, 2)
    s += b1 + b2 + b3 + b4 + big_sword(at1) + big_sword(at3)
    s += facing(BOSS2_GAP, 45, dist=4.6)
    roles = {}
    for seat, (x, y) in SPREAD2.items():
        roles[seat] = [x, R(y + 2.0)]
        s += yellow_mark(x, y - 2.8, size=4.6)
    return sc(s, roles=roles, boss=BOSS2_GAP, iconSize=4.2)


# Aero III, Forward/Backward Half, Duty's Edge, Burning Chains
TORN_NE, TORN_SW = (60.0, 25.0), (41.0, 73.0)


def chains_base():
    return two_base() + tornado(*TORN_NE) + tornado(*TORN_SW)


def chains1():
    s = chains_base() + facing(BOSS2_GAP, 225, dist=4.6)
    roles = {"MT": [33.4, 43.0], "H1": [25.4, 51.0], "ST": [41.4, 50.0], "H2": [32.6, 58.6],
             "D4": [68.0, 40.0], "D2": [60.4, 47.4], "D3": [75.0, 48.0], "D1": [68.0, 55.0]}
    return sc(s, roles=roles, boss=BOSS2_GAP, iconSize=4.4)


def halfplane(line, value, side, c=HALF, o=0.42, W=160):
    """A half of the frame cut by a 45-degree line: line 's' (x + y = value) or 't' (x - y = value)."""
    if line == "s":
        p0 = (value / 2, value / 2)
        n = (1 / SQ2, 1 / SQ2) if side == ">" else (-1 / SQ2, -1 / SQ2)
        rot = 45
    else:
        p0 = ((100 + value) / 2, (100 - value) / 2)
        n = (1 / SQ2, -1 / SQ2) if side == ">" else (-1 / SQ2, 1 / SQ2)
        rot = 135
    at = [R(p0[0] + n[0] * W / 2), R(p0[1] + n[1] * W / 2)]
    out = [{"t": "rect", "at": at, "w": W, "h": 300, "rot": rot, "c": c, "o": o, "wd": 0.01}]
    a, b = (xy(value, -150), xy(value, 150)) if line == "s" else (xy(-50, value), xy(250, value))
    out += edge_line(a, b)
    return out


def chains_glow():
    return glow_sword((56.2, 52.6))


def chains2():
    s = chains_base() + facing(BOSS2_GAP, 225, dist=4.6) + chains_glow()
    s += arrow([53.0, 33.0], [37.6, 52.4], wd=1.1)
    roles = cluster(56.8, 28.8, gap=2.4, cols=2, order=("D1", "D2", "D3", "D4"))
    roles.update(cluster(41.0, 63.0, gap=2.4, cols=2, order=("MT", "ST", "H1", "H2")))
    return sc(s, roles=roles, boss=BOSS2_GAP, iconSize=3.4)


def chains3():
    s = chains_base() + halfplane("t", -17.5, ">") + halfplane("s", 101, "<")
    s += facing(BOSS2_GAP, 225, dist=4.6) + chains_glow()
    return sc(s, roles=cluster(40.6, 64.0, gap=2.4), boss=BOSS2_GAP, iconSize=3.4)


def chains4():
    s = chains_base() + halfplane("t", 22, "<") + halfplane("s", 101, ">")
    s += facing(BOSS2_GAP, 225, dist=4.6) + chains_glow()
    return sc(s, roles=cluster(60.4, 36.6, gap=2.4), boss=BOSS2_GAP, iconSize=3.4)


def chains5():
    s = chains_base() + line_stack([48.0, 49.6], [34.6, 64.0], fracs=(0.12, 0.5, 0.88), off=5.6, w=5.2, h=1.8, wd=1.15, gap=1.5)
    s += facing(BOSS2_GAP, 225, dist=4.6)
    return sc(s, roles=cluster(43.4, 55.6, gap=2.3, cols=3, order=("H1", "MT", "ST", "H2", "D1", "D2", "D3", "D4")),
              boss=BOSS2_GAP, iconSize=3.2)


CHAIN = "#e8562a"


def chain_pairs(th, dps):
    """Burning Chains: each tank/healer spot chained to a DPS spot (game8 draws two of them)."""
    out = []
    for (p, q) in zip(th, dps):
        out += tether(p, q, c=CHAIN, wd=0.8)
    return out


def chain_roles(T, H, DL, DR):
    return {"MT": [T[0] - 1.2, T[1]], "ST": [T[0] + 1.2, T[1]], "H1": [H[0] - 1.2, H[1]], "H2": [H[0] + 1.2, H[1]],
            "D3": [DL[0] - 1.2, DL[1]], "D4": [DL[0] + 1.2, DL[1]], "D1": [DR[0] - 1.2, DR[1]], "D2": [DR[0] + 1.2, DR[1]]}


def chains6():
    T, H, DL, DR = (41.6, 53.6), (37.0, 53.6), (35.6, 59.4), (41.6, 59.0)
    s = chains_base() + chain_pairs([H, T], [DL, DR]) + facing(BOSS2_GAP, 225, dist=4.6)
    return sc(s, roles=chain_roles(T, H, DL, DR), boss=BOSS2_GAP, iconSize=3.4)


def chains7():
    T, H, DL, DR = (45.0, 68.6), (39.4, 68.6), (35.6, 59.6), (41.6, 59.2)
    s = chains_base() + chain_pairs([H, T], [DL, DR]) + arrow([47.0, 62.4], [64.8, 45.0], wd=1.1)
    s += facing(BOSS2_GAP, 225, dist=4.6)
    return sc(s, roles=chain_roles(T, H, DL, DR), boss=BOSS2_GAP, iconSize=3.4)


def chains8():
    T, H, DL, DR = (73.0, 32.4), (79.6, 35.6), (35.0, 60.0), (41.0, 59.6)
    s = chains_base() + chain_pairs([T, H], [DR, DL])
    s += arrow([49.6, 65.0], [70.0, 44.6], c="#ffffff", wd=1.3) + arrow([49.6, 65.0], [70.0, 44.6], c="#e8452a", wd=0.45)
    s += facing(BOSS2_GAP, 225, dist=4.6)
    return sc(s, roles=chain_roles(T, H, DL, DR), boss=BOSS2_GAP, iconSize=3.4)


# ============================================================ Vollok the second time (five floors again)
def vollokb3():
    s = five_base() + vollok_swords() + tiles_on(MID, MID_SYNC) + facing(BOSS5, 0)
    roles = cluster(50.0, 56.2, gap=2.3, cols=3, order=("MT", "ST", "D1", "D2", "D3", "D4"))
    roles.update({"H1": [48.8, 68.6], "H2": [51.2, 68.6]})
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.4)


def vollokb4():
    s = five_base()
    roles = {}
    for seat, (a, b) in SPREAD_TILES.items():
        s += MID.tile(a, b, o=0.6)
    s += facing(BOSS5, 0)
    for seat, (a, b) in SPREAD_TILES.items():
        x, y = MID.cell(a, b)
        roles[seat] = [x, R(y + 1.4)]
        s += yellow_mark(x, y - 2.6, size=4.0)
    return sc(s, roles=roles, boss=BOSS5, iconSize=3.6)


def vollokb5():
    s = five_base() + line_stack([50, 50.5], [50, 68], fracs=(0.2, 0.55, 0.9), off=6.2, w=5.0, h=1.8, wd=1.1, gap=1.5) + facing(BOSS5, 0)
    return sc(s, roles=cluster(49.6, 57.0, gap=2.2, cols=3, order=("MT", "H1", "H2", "ST", "D1", "D2", "D3", "D4")), boss=BOSS5, iconSize=3.0)
