import sys, json, glob
sys.path.insert(0, r"scripts/guides/.work/ex6/tools")
import scenes6 as S
IMG = r"scripts/guides/.work/ex6/dl/img"
DEF = {"frame": [4, 3], "bg": "#5f6166", "waymarks": {}, "iconSize": 6.8, "markSize": 6, "bossSize": 9, "ring": 5.5}
UP = ["↑", "↓", "↑", "↓"]
M = {4: S.ob_spread, 5: S.ob_pairs, 6: lambda: S.ex1(UP), 7: lambda: S.ex2(UP), 8: lambda: S.ex3(UP, deep=(1, 3)),
     9: S.wp1, 10: S.wp2, 11: S.wp3, 12: S.wp4, 14: S.tc1, 15: S.tc2, 16: S.tc3, 17: S.tc4, 18: S.tc5, 19: S.tc6,
     20: S.tc7, 21: S.tc8, 22: S.tc9, 23: S.tc10, 24: S.tc11, 25: S.tc12, 27: S.rt_spread, 28: S.rt_stack,
     29: S.ar1, 30: S.ar2, 31: S.ar3, 32: S.ar4, 33: S.ar8, 38: S.ps1, 39: S.ps2, 40: S.ps3, 41: S.ps4, 42: S.ps5,
     43: S.ps6, 44: S.ps7, 45: S.ps8, 46: S.t2a, 47: S.t2b, 48: S.t2c, 49: S.t2d, 50: S.t2e, 51: S.t2f, 52: S.t2g,
     53: S.t2h, 54: S.t2i, 55: S.busters2, 56: S.oa1, 57: S.oa2, 58: S.oa3, 59: S.oa4, 60: S.oa5, 61: S.oa6,
     62: S.busters2, 63: S.oa8, 64: S.oa9}
only = [int(a) for a in sys.argv[2:]] or sorted(M)
pairs = [{"label": f"{k:02d}", "img": glob.glob(f"{IMG}/{k:02d}_*")[0], "scene": M[k]()} for k in only]
json.dump({"defaults": DEF, "pairs": pairs}, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False)
print(len(pairs))
