import sys, json, glob
sys.path.insert(0, r"scripts/guides/.work/ex5/tools")
import scenes as S
IMG = r"scripts/guides/.work/ex5/dl/img"
DEF = {"frame": [1, 1], "bg": "#5f6166", "waymarks": {}, "iconSize": 6.2, "markSize": 6.8, "bossSize": 9, "ring": 6}
M = {2: S.fod_spread, 3: S.fod_vert, 4: S.fod_horz, 5: S.mm1, 6: S.mm2, 7: S.mm3, 8: S.sr_icon, 9: S.sr_centre44, 10: S.sr_centrepr,
     11: S.sr_sides44, 12: S.sr_sidespr, 13: S.fe_spread, 14: S.fe_drop, 15: S.fe_dodge, 16: S.gc_basic, 17: S.gc_x, 18: S.gc_plus,
     19: S.sp_tether, 20: S.sp_drop, 21: S.sp_bait, 22: S.rr_souls, 23: S.rr_rotate, 24: S.rr_step1, 25: S.rr_step2, 26: S.rr_step3,
     27: lambda: S.sr_centre44(False), 28: S.st44_circle, 29: S.st44_donut, 31: lambda: S.sr_sides44(False), 32: S.stpr_circle,
     33: S.stpr_donut, 34: lambda: S.sr_centrepr(False), 35: lambda: S.sr_sidespr(False), 37: S.col1,
     38: lambda: S.col_pop("SE", ("NW", "NE", "C", "SW")), 39: lambda: S.col_pop("NE", ("NW", "C", "SW")), 40: S.col_hand,
     41: lambda: S.col_pop("C", ("NW", "SW"), hand=False, soul=True, who=(51, 50)), 42: lambda: S.col_pop("SW", ("NW",), hand=False, soul=True),
     43: lambda: S.col_pop("NW", (), hand=False, soul=True), 44: S.mac1, 45: S.mac2, 46: S.mac3, 47: S.mac4, 48: S.mac5, 49: S.mac6}
only = [int(a) for a in sys.argv[2:]] or sorted(M)
pairs = [{"label": f"{k:02d}", "img": glob.glob(f"{IMG}/{k:02d}_*.webp")[0], "scene": M[k]()} for k in only]
json.dump({"defaults": DEF, "pairs": pairs}, open(sys.argv[1], "w", encoding="utf-8"))
print(len(pairs))
