"""P4 Eyes: close-up boards, the blue eye west and the red eye east, redrawn from Tuufless's 04/ pictures."""
from base import *
from sc3 import board

BLUE_E, RED_E = (28, 50), (71, 50)
BT, RT = "#38a8f0", "#e02424"


def eyes(blue=True, red=True):
    out = []
    if blue:
        out += [dot(BLUE_E, 7.2, "#2a6a70"), circle(BLUE_E, 7.2, "#7adbe0", 0.35, 0.1), ring(BLUE_E, 7.2, "#a8f0f0", 0.3, 0.7)]
    if red:
        out += [dot(RED_E, 7.2, "#8a1040"), circle(RED_E, 7.2, "#ff3a8a", 0.35, 0.1), ring(RED_E, 7.2, "#ffb0d0", 0.3, 0.7)]
    return out


def orb(c, col):
    return [dot(c, 1.9, col), ring(c, 1.9, "#ffffff", 0.25, 0.8)]


def teth(a, b, col):
    return line(a, b, col, 0.45, 0.95)


def lab(c, s):
    return [text(c, s, 2.4, "#ffffff")]


SPREAD = dict(D1=(40, 38), MT=(40, 46), H1=(40, 55), D2=(40, 63), D4=(60, 38), ST=(60, 46), H2=(60, 55), D3=(60, 63))
YORB = [(15, 50), (85, 50)]
BORB = [(29, 38), (29, 63), (71, 38), (71, 63)]


def eye(n):
    sh = []
    if n == 1:
        sh += eyes() + [circle((50, 67), 13, "#d8d0f0", 0.55, 0.1)]
        sh += star((43, 51), 2.2, "#c8a0ff") + star((56, 51), 2.2, "#a0f0ff")
        sh += [line((43, 51), (48, 66), "#ffffff", 0.3), line((56, 51), (52, 66), "#ffffff", 0.3)]
        sh += tag((43, 46), "Haurchefant", 2.0) + tag((57, 46), "Ysayle", 2.0) + tag((50, 82), "Alphinaud", 2.0)
        rl = {k: (49 + (i % 4) * 0.7, 66 + (i // 4) * 0.8) for i, k in enumerate(["D1", "D2", "D3", "D4", "H1", "H2", "ST", "MT"])}
        return board(sh, rl=rl)
    if n == 2:
        return board(eyes(), rl=SPREAD)
    if n == 3:
        sh += eyes()
        for k in ("MT", "H1"):
            sh.append(teth(SPREAD[k], RED_E, RT))
        for k in ("ST", "H2"):
            sh.append(teth(SPREAD[k], RED_E, RT))
        for k in ("D1", "D2", "D3", "D4"):
            sh.append(teth(SPREAD[k], BLUE_E, BT))
        for c in YORB:
            sh += orb(c, "#d8d020")
        for c in BORB:
            sh += orb(c, "#1a3aa0")
        return board(sh, rl=SPREAD)
    if n == 4:
        rl = dict(MT=(14, 46), H1=(14, 54), ST=(85, 46), H2=(85, 54), D1=(40, 38), D2=(40, 63), D4=(60, 38), D3=(60, 63))
        sh += [circle(YORB[0], 12, PINK, 0.4), circle(YORB[1], 12, PINK, 0.4)] + eyes()
        for k in ("MT", "H1", "ST", "H2"):
            sh.append(teth(rl[k], RED_E, RT))
        for k in ("D1", "D2", "D3", "D4"):
            sh.append(teth(rl[k], BLUE_E, BT))
        for c in BORB:
            sh += orb(c, "#1a3aa0")
        return board(sh, rl=rl)
    if n == 5:
        rl = dict(MT=(14, 46), H1=(14, 54), ST=(85, 46), H2=(85, 54), D1=(20, 38), D2=(20, 63), D4=(80, 38), D3=(80, 63))
        sh += eyes()
        for k in ("D1", "D2", "D3", "D4"):
            sh.append(teth(rl[k], RED_E, RT))
        for k in ("MT", "H1", "ST", "H2"):
            sh.append(teth(rl[k], BLUE_E, BT))
        for c in BORB:
            sh += orb(c, "#1a3aa0")
        sh += curve([(40, 38), (28, 33), (22, 37)]) + curve([(40, 63), (28, 68), (22, 64)]) + curve([(60, 38), (72, 33), (78, 37)]) + curve([(60, 63), (72, 68), (78, 64)])
        return board(sh, rl=rl)
    if n == 6:
        rl = dict(MT=(14, 46), H1=(14, 54), ST=(85, 46), H2=(85, 54), D1=(29, 38), D2=(29, 63), D4=(71, 38), D3=(71, 63))
        for c in BORB:
            sh.append(circle(c, 10, PINK, 0.4))
        sh += eyes()
        for k in ("D1", "D2", "D3", "D4"):
            sh.append(teth(rl[k], RED_E, RT))
        for k in ("MT", "H1", "ST", "H2"):
            sh.append(teth(rl[k], BLUE_E, BT))
        return board(sh, rl=rl)
    # 7-11: Mirage Dives round the west (blue) eye
    NW, NE, SW, SE = (15, 38), (39, 38), (15, 63), (39, 63)
    spots = {7: dict(D1=NW, D4=NE, D2=SW, D3=SE), 8: dict(D1=NW, D4=NE, D2=SW, D3=SE), 9: dict(H1=NW, D4=NE, D2=SW, H2=SE),
             10: dict(MT=NW, D4=NE, ST=SW, H2=SE), 11: dict(MT=NW, D3=NE, ST=SW, D1=SE)}[n]
    stack = {7: ["H2", "ST", "H1", "MT"], 8: ["H2", "ST", "H1", "MT"], 9: ["D1", "D3", "ST", "MT"],
             10: ["D1", "D3", "D2", "H1"], 11: ["D4", "D2", "H1", "H2"]}[n]
    hits = {8: [NW, SE], 9: [NW, SW], 10: [NE, SE], 11: [NE, SW]}.get(n, [])
    for c in hits:
        sh.append(circle(c, 10, PINK, 0.4))
    sh += eyes()
    for k, c in spots.items():
        sh.append(teth(c, RED_E, RT))
    rl = dict(spots)
    for i, k in enumerate(stack):
        rl[k] = (BLUE_E[0] - 1.2 + i * 0.8, BLUE_E[1] - 1.2 + i * 0.8)
    if n in (8, 9, 10):
        for c in hits:
            a = ang(BLUE_E, c)
            sh += [arrow(off(BLUE_E, a, 4), off(c, a + 180, 4.5), "#ffffff", 0.45), arrow(off(c, a + 180, 4.5), off(BLUE_E, a, 4), "#ffffff", 0.45)]
        sh += curve(arc_pts(BLUE_E, 18, 172, 298, 10), "#e8e8e8", 0.5) + curve(arc_pts(BLUE_E, 18, 188, 62, 10), "#e8e8e8", 0.5)
        names = {8: ("H1", "H2"), 9: ("MT", "ST"), 10: ("D1", "D4")}[n]
        sh += lab((7, 44), names[0] + " priority") + lab((49, 44), names[1] + " priority")
    return board(sh, rl=rl)
