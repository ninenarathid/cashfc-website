"""pairs10.py out.json [k ...]: game8 picture k beside our scene, for cmp10.mjs."""
import sys, json, glob
sys.path.insert(0, r"scripts/guides/.work/m10s/tools")
import scenes10 as S
IMG = r"scripts/guides/.work/m10s/dl/img"
DEF = {"frame": [4, 3], "bg": "#5f6166", "arena": {"shape": "square", "at": [50, 50], "w": 68, "h": 68, "fill": "#b9babe", "lines": False, "edge": "#3a3b40"},
       "waymarks": {}, "iconSize": 5.8, "markSize": 4.8, "bossSize": 8.5, "ring": 5.5}
M = {2: S.waymarks, 3: S.ff1, 4: S.ff2, 5: S.ff3, 6: S.ff4, 7: S.ff5, 8: S.ff6, 9: S.cut1, 10: S.cut2, 11: S.cut3, 12: S.cut4,
     13: S.cut5, 14: S.cut6, 15: S.sw1, 16: S.sw2, 17: S.sw3, 18: S.sw4, 19: S.sw5, 22: S.ao1, 23: S.ao_rev, 25: S.ao_double,
     27: S.ia_up, 29: S.ia_side, 31: S.ia_down, 32: S.ia_path, 33: S.snaking, 36: S.blue1, 37: S.blue2, 38: S.blue3, 39: S.blue3b,
     40: S.blue4, 41: S.blue5, 42: S.wave, 43: S.cutback2, 44: S.red1, 45: S.blue2, 46: S.red3, 47: S.red4, 48: S.red5, 49: S.red6,
     50: S.red7, 51: S.red8, 52: S.red9, 53: S.wave, 54: S.cutback2, 55: S.grave, 56: S.split1, 57: S.split2, 58: S.split3,
     59: S.split4, 60: S.split5, 61: S.split6, 62: S.split7, 63: S.split8, 69: S.end1, 70: S.end2, 71: S.end3, 72: S.end4, 73: S.end5}
if __name__ == "__main__":
    only = [int(a) for a in sys.argv[2:]] or sorted(M)
    pairs = [{"label": f"{k:02d}", "img": glob.glob(f"{IMG}/{k:02d}.png")[0], "scene": M[k]()} for k in only]
    json.dump({"defaults": DEF, "pairs": pairs}, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False)
    print(len(pairs))
